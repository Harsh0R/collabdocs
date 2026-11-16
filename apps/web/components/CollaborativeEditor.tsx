"use client";

import { useEffect, useMemo, useState } from "react";

import * as Y from "yjs";

import { HocuspocusProvider } from "@hocuspocus/provider";

import { EditorContent, useEditor } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";

import Collaboration from "@tiptap/extension-collaboration";

import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { error } from "console";

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
          // Collaboration has its own
          // shared undo/redo history.
          undoRedo: false,
        }),

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

      newProvider.destroy();

      ydoc.destroy();
    };
  }, [documentId, accessToken, ydoc]);

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
