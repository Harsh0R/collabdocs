"use client";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { apiRequest, ApiError } from "@/lib/api";
import ShareDocumentModal from "@/components/dashboard/ShareDocumentModal";

// ===================================
// TYPES
// ===================================

interface DocumentItem {
  id: string;
  title: string;
  ownerId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  updatedAt: string;
  collaboratorCount: number;
}

interface DocumentListResponse {
  status: string;
  data: {
    documents: DocumentItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface CreateResponse {
  status: string;
  data: {
    document: {
      id: string;
      title: string;
    };
  };
}

const PAGE_SIZE = 9;

// ===================================
// HELPERS
// ===================================

function getRoleStyle(role: string) {
  switch (role) {
    case "OWNER":
      return "bg-purple-100 text-purple-700";

    case "EDITOR":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ===================================
// DASHBOARD
// ===================================

export default function DocumentsPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [totalDocuments, setTotalDocuments] = useState(0);

  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(
    null,
  );

  // ===================================
  // LOAD DOCUMENTS
  // ===================================

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      if (search.trim()) {
        query.set("search", search.trim());
      }

      const result = await apiRequest<DocumentListResponse>(
        `/api/documents?${query.toString()}`,
      );

      setDocuments(result.data.documents);

      setTotalPages(Math.max(1, result.data.pagination.totalPages));

      setTotalDocuments(result.data.pagination.total);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }

      setError(err instanceof Error ? err.message : "Unable to load documents");
    } finally {
      setLoading(false);
    }
  }, [page, search, router]);

  useEffect(() => {
    if (!sessionStorage.getItem("accessToken")) {
      router.replace("/login");
      return;
    }

    const timeout = setTimeout(() => {
      void loadDocuments();
    }, 300);

    return () => clearTimeout(timeout);
  }, [loadDocuments, router]);

  // ===================================
  // CREATE DOCUMENT
  // ===================================

  async function handleCreateDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newTitle.trim();

    if (!title) {
      return;
    }

    setCreating(true);
    setError("");

    try {
      const result = await apiRequest<CreateResponse>("/api/documents", {
        method: "POST",
        body: JSON.stringify({
          title,
        }),
      });

      setShowCreateModal(false);
      setNewTitle("");

      router.push(`/documents/${result.data.document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document creation failed");
    } finally {
      setCreating(false);
    }
  }

  // ===================================
  // DELETE DOCUMENT
  // ===================================

  async function handleDeleteDocument(document: DocumentItem) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${document.title}"?`,
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/api/documents/${document.id}`, {
        method: "DELETE",
      });

      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete document",
      );
    }
  }

  // ===================================
  // OPEN SHARE MODAL
  // ===================================

  function openShareModal(document: DocumentItem) {
    setSelectedDocument(document);
    setShowShareModal(true);
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
  // UI
  // ===================================

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              CollabDocs
            </h1>

            <p className="text-xs text-slate-500">
              Your collaborative workspace
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* PAGE TITLE */}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">My workspace</h2>

            <p className="mt-2 text-sm text-slate-500">
              Manage your documents and collaborate with others.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + Create document
          </button>
        </div>

        {/* SEARCH */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              ⌕
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search documents by title..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <p className="text-sm text-slate-500">{totalDocuments} document(s)</p>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="py-20 text-center text-slate-500">
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <div className="mb-4 text-5xl">📄</div>

            <h3 className="text-xl font-semibold text-slate-800">
              {search ? "No matching documents" : "No documents yet"}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {search
                ? "Try another search term."
                : "Create your first document and start collaborating."}
            </p>

            {!search && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
              >
                Create your first document
              </button>
            )}
          </div>
        ) : (
          /* DOCUMENT GRID */

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <article
                key={document.id}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                    📄
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoleStyle(document.role)}`}
                  >
                    {document.role}
                  </span>
                </div>

                <button
                  onClick={() => router.push(`/documents/${document.id}`)}
                  className="block w-full text-left"
                >
                  <h3 className="truncate text-lg font-semibold text-slate-900">
                    {document.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500">
                    Last updated {formatDate(document.updatedAt)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {document.collaboratorCount} collaborator(s)
                  </p>
                </button>

                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => router.push(`/documents/${document.id}`)}
                    className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Open
                  </button>

                  {document.role === "OWNER" && (
                    <>
                      <button
                        onClick={() => openShareModal(document)}
                        className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Share
                      </button>

                      <button
                        onClick={() => void handleDeleteDocument(document)}
                        className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                        title="Delete document"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* PAGINATION */}

        {!loading && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* CREATE DOCUMENT MODAL */}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                Create document
              </h3>

              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Document title
                </label>

                <input
                  autoFocus
                  required
                  maxLength={200}
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Enter document title"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE MODAL WILL BE CONNECTED IN STEP 3 */}
      {showShareModal && selectedDocument && (
        <ShareDocumentModal
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          onClose={() => {
            setShowShareModal(false);
            setSelectedDocument(null);
            void loadDocuments();
          }}
        />
      )}
    </main>
  );
}
