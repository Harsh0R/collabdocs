// apps/web/src/components/CollaborativeEditor.tsx

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
}

interface PresenceUser {
  name: string;
  color: string;
}

interface PendingSaveRequest {
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
}: {
  provider: HocuspocusProvider;
  user: User;
  readOnly: boolean;
}) {
  const editor = useEditor(
    {
      immediatelyRender: false,

      editable: !readOnly,

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
        disabled={readOnly}
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
      {/* TOOLBAR */}

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

      {/* EDITOR CONTENT */}

      <div className="min-h-162.5 px-8 py-10 md:px-16">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

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
}: Props) {
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  const [connectionStatus, setConnectionStatus] = useState("connecting");

  const [isSynced, setIsSynced] = useState(false);

  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

  const [connectionError, setConnectionError] = useState("");

  const pendingSaveRequests = useRef(new Map<string, PendingSaveRequest>());

  const [isSavingVersion, setIsSavingVersion] = useState(false);

  const [saveMessage, setSaveMessage] = useState("");

  const [saveError, setSaveError] = useState(false);

  // Create WebSocket connection.

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

      // Receive server responses for manual version saving.
      onStateless: ({ payload }) => {
        try {
          const message = JSON.parse(payload);

          if (message.type !== "collabdocs:save-version:ack") {
            return;
          }

          const pending = pendingSaveRequests.current.get(message.requestId);

          if (!pending) {
            return;
          }

          clearTimeout(pending.timeoutId);

          pendingSaveRequests.current.delete(message.requestId);

          if (message.ok === true) {
            pending.resolve();
          } else {
            pending.reject(
              new Error(message.error || "Document persistence failed."),
            );
          }
        } catch (error) {
          console.error("Invalid save acknowledgement:", error);
        }
      },
    });

    const awareness = newProvider.awareness;

    if (!awareness) {
      setConnectionError("Awareness initialization failed");
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

    // Get initial presence immediately.
    updatePresence();

    setProvider(newProvider);

    return () => {
      awareness.off("change", updatePresence);

      pendingSaveRequests.current.forEach((pending) => {
        clearTimeout(pending.timeoutId);

        pending.reject(new Error("Editor connection closed during save."));
      });

      pendingSaveRequests.current.clear();

      newProvider.destroy();

      ydoc.destroy();
    };
  }, [documentId, accessToken, ydoc]);

  async function handleSaveVersion() {
    if (readOnly || isSavingVersion) {
      return;
    }

    if (connectionStatus !== "connected" || !isSynced) {
      setSaveError(true);
      setSaveMessage(
        "Please wait until the document is connected and synchronized.",
      );
      return;
    }

    setIsSavingVersion(true);
    setSaveMessage("");
    setSaveError(false);

    try {
      // 1. Wait until pending Yjs updates are acknowledged.
      await waitForPendingUpdates(provider!);

      if (connectionStatus !== "connected") {
        throw new Error("Connection lost. Please reconnect and try again.");
      }

      // 2. Generate a unique request ID.
      const requestId = crypto.randomUUID();

      // 3. Prepare the acknowledgement promise.
      const acknowledgement = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pendingSaveRequests.current.delete(requestId);

          reject(
            new Error("Sync server did not acknowledge the save request."),
          );
        }, 15000);

        pendingSaveRequests.current.set(requestId, {
          resolve,
          reject,
          timeoutId,
        });
      });

      // 4. Ask the sync server to persist its current Yjs document.
      try {
        provider!.sendStateless(
          JSON.stringify({
            type: "collabdocs:save-version",
            requestId,
          }),
        );
      } catch (error) {
        const pending = pendingSaveRequests.current.get(requestId);

        if (pending) {
          clearTimeout(pending.timeoutId);
          pendingSaveRequests.current.delete(requestId);
        }

        throw error;
      }

      // 5. Wait for the server's persistence acknowledgement.
      await acknowledgement;

      // 6. Create a version only after persistence succeeds.
      const result = await apiRequest<{
        status: string;
        message?: string;
        data?: {
          version?: {
            id: string;
          };
        };
      }>(`/api/documents/${documentId}/versions`, {
        method: "POST",
      });

      // 7. Show success.
      setSaveError(false);
      setSaveMessage(result.message || "Document version saved successfully.");
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

  return (
    <div className="space-y-5">
      {/* COLLABORATION HEADER */}
      {saveMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg border p-3 text-sm ${
            saveError
              ? "border-red-200 bg-red-50 text-red-700"
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
          {/* CONNECTION STATUS */}

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

          {/* SYNC STATUS */}

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
                isSavingVersion || connectionStatus !== "connected" || !isSynced
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingVersion ? "Saving Version..." : "Save Version"}
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

      <EditorSurface provider={provider} user={user} readOnly={readOnly} />
    </div>
  );
}
