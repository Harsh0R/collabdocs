"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";

import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Underline from "@tiptap/extension-underline";

import VersionHistoryPanel from "@/components/editor/VersionHistoryPanel";

const SYNC_URL = process.env.NEXT_PUBLIC_SYNC_URL || "ws://localhost:1234";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Props {
  documentId: string;
  accessToken: string;
  user: User;
  title: string;
  readOnly: boolean;
  showVersionHistory: boolean;
  onCloseVersionHistory: () => void;
}

interface PresenceUser {
  name: string;
  color: string;
}

interface PendingSyncRequest {
  expectedAckType: string;
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

const USER_COLORS = [
  "#2563EB",
  "#DC2626",
  "#059669",
  "#9333EA",
  "#D97706",
  "#0891B2",
];

function getUserColor(userId: string) {
  const hash = Array.from(userId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return USER_COLORS[hash % USER_COLORS.length];
}

// ===================================
// EDITOR SURFACE
// ===================================

function EditorSurface({
  provider,
  user,
  readOnly,
  isRestoring,
}: {
  provider: HocuspocusProvider;
  user: User;
  readOnly: boolean;
  isRestoring: boolean;
}) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: !readOnly && !isRestoring,

      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),

        Underline,

        Collaboration.configure({
          document: provider.document,
        }),

        CollaborationCaret.configure({
          provider,
          user: {
            name: user.name,
            color: getUserColor(user.id),
          },
        }),
      ],

      editorProps: {
        attributes: {
          class: "tiptap",
        },
      },
    },
    [provider, readOnly],
  );

  useEffect(() => {
    editor?.setEditable(!readOnly && !isRestoring);
  }, [editor, readOnly, isRestoring]);

  if (!editor) {
    return <div className="p-8 text-slate-400">Initializing editor...</div>;
  }

  function ToolbarButton({
    label,
    active,
    onClick,
  }: {
    label: string;
    active?: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={readOnly || isRestoring}
        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-blue-100 text-blue-700"
            : "text-slate-700 hover:bg-slate-100"
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 p-3">
        <ToolbarButton
          label="B"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />

        <ToolbarButton
          label="I"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />

        <ToolbarButton
          label="U"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />

        <div className="mx-2 h-6 w-px bg-slate-200" />

        <ToolbarButton
          label="H1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        />

        <ToolbarButton
          label="H2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />

        <div className="mx-2 h-6 w-px bg-slate-200" />

        <ToolbarButton
          label="• List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />

        <ToolbarButton
          label="1. List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />

        <div className="mx-2 h-6 w-px bg-slate-200" />

        <ToolbarButton
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        />

        <ToolbarButton
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>

      <div className="min-h-162.5 px-8 py-10 md:px-16">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ===================================
// WAIT FOR YJS SYNCHRONIZATION
// ===================================

async function waitForPendingUpdates(
  provider: HocuspocusProvider,
): Promise<void> {
  const deadline = Date.now() + 15000;

  while (provider.hasUnsyncedChanges) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for document synchronization.");
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// ===================================
// MAIN COLLABORATIVE EDITOR
// ===================================

export default function CollaborativeEditor({
  documentId,
  accessToken,
  user,
  title,
  readOnly,
  showVersionHistory,
  onCloseVersionHistory,
}: Props) {
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [isSynced, setIsSynced] = useState(false);
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [connectionError, setConnectionError] = useState("");

  const pendingRequests = useRef(new Map<string, PendingSyncRequest>());

  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState(false);

  type RestoreStatus = {
    status: "started" | "completed" | "failed";
    userName?: string;
  };

  const [remoteRestoreStatus, setRemoteRestoreStatus] =
    useState<RestoreStatus | null>(null);

  // ===================================
  // CREATE HOCUSPOCUS CONNECTION
  // ===================================

  useEffect(() => {
    const newProvider = new HocuspocusProvider({
      url: SYNC_URL,
      name: documentId,
      document: ydoc,
      token: accessToken,

      onStatus: ({ status }) => {
        setConnectionStatus(status);
      },

      onSynced: ({ state }) => {
        setIsSynced(state);
      },

      // Receive save and restore acknowledgements.
      onStateless: ({ payload }) => {
        try {
          const message = JSON.parse(payload);

          // Handle restore-status broadcasts first.
          if (message.type === "collabdocs:restore-status") {
            if (
              message.status === "started" ||
              message.status === "completed" ||
              message.status === "failed"
            ) {
              setRemoteRestoreStatus({
                status: message.status,
                userName: message.userName,
              });
            }

            return;
          }

          // Handle normal save/restore acknowledgements.
          const pending = pendingRequests.current.get(message.requestId);

          if (!pending || message.type !== pending.expectedAckType) {
            return;
          }

          clearTimeout(pending.timeoutId);
          pendingRequests.current.delete(message.requestId);

          if (message.ok === true) {
            pending.resolve();
          } else {
            pending.reject(
              new Error(message.error || "Sync server operation failed."),
            );
          }
        } catch (error) {
          console.error("Invalid sync message:", error);
        }
      },
    });

    const awareness = newProvider.awareness;

    if (!awareness) {
      setConnectionError("Awareness initialization failed.");
      newProvider.destroy();
      return;
    }

    const updatePresence = () => {
      const states = Array.from(awareness.getStates().values());

      const users = states
        .map((state: any) => state.user)
        .filter(Boolean)
        .map((presenceUser: PresenceUser) => ({
          name: presenceUser.name,
          color: presenceUser.color,
        }));

      setActiveUsers(users);
    };

    awareness.on("change", updatePresence);
    updatePresence();

    setProvider(newProvider);

    return () => {
      awareness.off("change", updatePresence);

      pendingRequests.current.forEach((pending) => {
        clearTimeout(pending.timeoutId);
        pending.reject(
          new Error("Editor connection closed during the operation."),
        );
      });

      pendingRequests.current.clear();

      newProvider.destroy();
      ydoc.destroy();
    };
  }, [documentId, accessToken, ydoc]);

  useEffect(() => {
    if (!remoteRestoreStatus || remoteRestoreStatus.status === "started") {
      return;
    }

    const timeout = setTimeout(() => {
      setRemoteRestoreStatus(null);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [remoteRestoreStatus]);

  // ===================================
  // SEND REQUEST AND WAIT FOR ACK
  // ===================================

  function sendSyncRequest(
    requestType: "collabdocs:save-version" | "collabdocs:restore-version",
    acknowledgementType:
      | "collabdocs:save-version:ack"
      | "collabdocs:restore-version:ack",
    extra: { versionId?: string } = {},
  ): Promise<void> {
    if (!provider || connectionStatus !== "connected") {
      return Promise.reject(new Error("Sync server is not connected."));
    }

    const requestId = crypto.randomUUID();

    const acknowledgement = new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingRequests.current.delete(requestId);

        reject(
          new Error("Sync server did not acknowledge the request in time."),
        );
      }, 15000);

      pendingRequests.current.set(requestId, {
        expectedAckType: acknowledgementType,
        resolve,
        reject,
        timeoutId,
      });
    });

    try {
      provider.sendStateless(
        JSON.stringify({
          type: requestType,
          requestId,
          ...extra,
        }),
      );
    } catch (error) {
      const pending = pendingRequests.current.get(requestId);

      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingRequests.current.delete(requestId);
      }

      return Promise.reject(error);
    }

    return acknowledgement;
  }

  // ===================================
  // SAVE CURRENT DOCUMENT AS A VERSION
  // ===================================

  async function createVersionSnapshot(): Promise<void> {
    if (!provider) {
      throw new Error("Editor connection is not ready.");
    }

    if (connectionStatus !== "connected" || !isSynced) {
      throw new Error(
        "Please wait until the document is connected and synchronized.",
      );
    }

    await waitForPendingUpdates(provider);

    if (connectionStatus !== "connected") {
      throw new Error("Connection lost. Please reconnect and try again.");
    }

    // Ask the sync server to persist the latest live Yjs state.
    await sendSyncRequest(
      "collabdocs:save-version",
      "collabdocs:save-version:ack",
    );

    // Create a database snapshot only after persistence succeeds.
    await apiRequest(`/api/documents/${documentId}/versions`, {
      method: "POST",
    });
  }

  // ===================================
  // MANUAL SAVE VERSION
  // ===================================

  async function handleSaveVersion() {
    if (readOnly || isSavingVersion || isRestoring) {
      return;
    }

    setIsSavingVersion(true);
    setSaveMessage("");
    setSaveError(false);

    try {
      await createVersionSnapshot();

      setSaveMessage("Document version saved successfully.");
    } catch (error) {
      console.error("Save version failed:", error);

      setSaveError(true);
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "Failed to save document version.",
      );
    } finally {
      setIsSavingVersion(false);
    }
  }

  // ===================================
  // RESTORE VERSION
  // ===================================

  async function handleRestoreVersion(versionId: string): Promise<void> {
    if (readOnly) {
      throw new Error("You do not have permission to restore this document.");
    }

    if (isRestoring || isSavingVersion) {
      throw new Error("Another version operation is already running.");
    }

    if (!provider || connectionStatus !== "connected" || !isSynced) {
      throw new Error(
        "Please wait until the document is connected and synchronized.",
      );
    }

    setIsRestoring(true);
    setSaveMessage("Creating a backup of the current document...");
    setSaveError(false);

    try {
      // STEP 1: Save the current document as a backup version.
      await createVersionSnapshot();

      // STEP 2: Ask the sync server to restore the selected version.
      setSaveMessage("Restoring the selected version...");

      await sendSyncRequest(
        "collabdocs:restore-version",
        "collabdocs:restore-version:ack",
        { versionId },
      );

      // STEP 3: The server has acknowledged persistence of restored state.
      setSaveError(false);
      setSaveMessage(
        "Version restored successfully. Your previous content was saved as a backup.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Restore failed.";

      const isLockConflict =
        message.toLowerCase().includes("currently being restored") ||
        message.toLowerCase().includes("another user");

      if (!isLockConflict) {
        console.error("[RESTORE] Failed:", error);
      }

      throw error;
    } finally {
      setIsRestoring(false);
    }
  }

  // ===================================
  // CONNECTION ERRORS
  // ===================================

  if (connectionError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        {connectionError}
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="rounded-xl border bg-white p-8 text-slate-500">
        Connecting to collaboration server...
      </div>
    );
  }

  // ===================================
  // UI
  // ===================================

  return (
    <div className="space-y-5">
      {remoteRestoreStatus?.status === "started" && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          <strong>Document temporarily locked.</strong>{" "}
          {remoteRestoreStatus.userName
            ? `${remoteRestoreStatus.userName} is restoring this document.`
            : "Another collaborator is restoring this document."}
          Editing is temporarily disabled.
        </div>
      )}

      {remoteRestoreStatus?.status === "completed" && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          Document restoration completed. You can continue editing.
        </div>
      )}

      {remoteRestoreStatus?.status === "failed" && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          Document restoration failed. Editing has been re-enabled.
        </div>
      )}
      {saveMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg border p-3 text-sm ${
            saveError
              ? "border-red-200 bg-red-50 text-red-700"
              : isRestoring || isSavingVersion
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {saveMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>

          <p className="mt-1 text-xs text-slate-500">
            Document ID: {documentId}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs shadow-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
            />

            {connectionStatus === "connected"
              ? "Connected"
              : connectionStatus === "connecting"
                ? "Connecting"
                : "Disconnected"}
          </div>

          <div className="rounded-full bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
            {isSynced ? "All changes synced" : "Synchronizing..."}
          </div>

          {readOnly && (
            <div className="rounded-full bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800">
              View only
            </div>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={handleSaveVersion}
              disabled={
                isSavingVersion ||
                isRestoring ||
                connectionStatus !== "connected" ||
                !isSynced
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingVersion
                ? "Saving Version..."
                : isRestoring
                  ? "Restoring..."
                  : "Save Version"}
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE USERS */}

      <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <span className="text-sm font-medium text-slate-700">
          Collaborators
        </span>

        <div className="flex items-center -space-x-2">
          {activeUsers.map((activeUser, index) => (
            <div
              key={`${activeUser.name}-${index}`}
              title={activeUser.name}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
              style={{
                backgroundColor: activeUser.color,
              }}
            >
              {activeUser.name?.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>

        <span className="text-xs text-slate-500">
          {activeUsers.length} online
        </span>
      </div>

      {/* EDITOR */}

      <EditorSurface
        provider={provider}
        user={user}
        readOnly={readOnly}
        isRestoring={isRestoring || remoteRestoreStatus?.status === "started"}
      />

      {/* VERSION HISTORY */}

      {showVersionHistory && (
        <VersionHistoryPanel
          documentId={documentId}
          onClose={onCloseVersionHistory}
          onRestore={handleRestoreVersion}
          canRestore={!readOnly}
        />
      )}
    </div>
  );
}
