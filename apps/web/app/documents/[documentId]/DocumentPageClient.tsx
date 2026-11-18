// apps/web/src/app/documents/[documentId]/DocumentPageClient.tsx

"use client";

import { useCallback, useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import ShareDocumentModal from "@/components/dashboard/ShareDocumentModal";

import { apiRequest } from "@/lib/api";
import CollaborativeEditor from "@/components/CollaborativeEditor";
import VersionHistoryPanel from "@/components/editor/VersionHistoryPanel";

interface User {
  id: string;
  name: string;
  email: string;
}

type Role = "OWNER" | "EDITOR" | "VIEWER";

interface DocumentData {
  id: string;
  title: string;
  role: Role;
}

interface DocumentResponse {
  data: {
    document: DocumentData;
  };
}

export default function DocumentPage() {
  const params = useParams<{ documentId: string }>();

  const router = useRouter();

  const documentId = params.documentId;

  const [token, setToken] = useState("");

  const [user, setUser] = useState<User | null>(null);

  const [document, setDocument] = useState<DocumentData | null>(null);

  const [title, setTitle] = useState("");

  const [editingTitle, setEditingTitle] = useState(false);

  const [savingTitle, setSavingTitle] = useState(false);

  const [showShare, setShowShare] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showVersionHistory, setShowVersionHistory] = useState(false);
  // ===================================
  // LOAD DOCUMENT
  // ===================================

  const loadDocument = useCallback(async () => {
    const accessToken = sessionStorage.getItem("accessToken");

    const storedUser = sessionStorage.getItem("user");

    if (!accessToken || !storedUser) {
      router.replace("/login");
      return;
    }

    try {
      const currentUser: User = JSON.parse(storedUser);

      setToken(accessToken);
      setUser(currentUser);

      const result = await apiRequest<DocumentResponse>(
        `/api/documents/${documentId}`,
      );

      setDocument(result.data.document);
      setTitle(result.data.document.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load document");
    } finally {
      setLoading(false);
    }
  }, [documentId, router]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  // ===================================
  // SAVE TITLE
  // ===================================

  async function handleSaveTitle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newTitle = title.trim();

    if (!newTitle || !document) return;

    setSavingTitle(true);
    setError("");

    try {
      const result = await apiRequest<{
        data: {
          document: DocumentData;
        };
      }>(`/api/documents/${documentId}`, {
        method: "PATCH",

        body: JSON.stringify({
          title: newTitle,
        }),
      });

      setDocument((previous) =>
        previous
          ? {
              ...previous,
              title: result.data.document.title,
            }
          : previous,
      );

      setTitle(result.data.document.title);

      setEditingTitle(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update title");
    } finally {
      setSavingTitle(false);
    }
  }

  // ===================================
  // LOGOUT
  // ===================================

  function handleLogout() {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");

    router.replace("/login");
  }

  // ===================================
  // LOADING
  // ===================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading document...</p>
      </main>
    );
  }

  if (error && !document) {
    return (
      <main className="min-h-screen bg-slate-50 p-10">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8">
          <p className="text-red-600">{error}</p>

          <button
            onClick={() => router.push("/documents")}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-white"
          >
            Back to workspace
          </button>
        </div>
      </main>
    );
  }

  if (!document || !user || !token) {
    return null;
  }

  const canEditTitle = document.role !== "VIEWER";

  const isOwner = document.role === "OWNER";

  // ===================================
  // UI
  // ===================================

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          {/* LEFT */}

          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => router.push("/documents")}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              ← Workspace
            </button>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="min-w-0">
              {editingTitle && canEditTitle ? (
                <form
                  onSubmit={handleSaveTitle}
                  className="flex items-center gap-2"
                >
                  <input
                    autoFocus
                    maxLength={200}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full max-w-xs rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-100"
                  />

                  <button
                    type="submit"
                    disabled={savingTitle || !title.trim()}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {savingTitle ? "Saving..." : "Save"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTitle(document.title);
                      setEditingTitle(false);
                    }}
                    className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="max-w-sm truncate text-lg font-bold text-slate-900">
                    {document.title}
                  </h1>

                  {canEditTitle && (
                    <button
                      onClick={() => setEditingTitle(true)}
                      title="Rename document"
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      ✎
                    </button>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-500">
                {document.role} · {user.name}
              </p>
            </div>
          </div>

          {/* RIGHT */}

          <div className="flex items-center gap-3">
            {isOwner && (
              <button
                onClick={() => setShowShare(true)}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Share
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowVersionHistory(true)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Version History
            </button>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* EDITOR */}

      <div className="mx-auto max-w-6xl px-5 py-10">
        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <CollaborativeEditor
          documentId={document.id}
          accessToken={token}
          user={user}
          title={document.title}
          readOnly={document.role === "VIEWER"}
          showVersionHistory={showVersionHistory}
          onCloseVersionHistory={() => setShowVersionHistory(false)}
        />
      </div>

      {/* SHARE MODAL */}

      {showShare && isOwner && (
        <ShareDocumentModal
          documentId={document.id}
          documentTitle={document.title}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* VERSION HISTORY */}

      {/* {showVersionHistory && (
        <VersionHistoryPanel
          documentId={document.id}
          onClose={() => setShowVersionHistory(false)}
        />
      )} */}
    </main>
  );
}
