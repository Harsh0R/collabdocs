"use client";

import { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";

import { apiRequest } from "@/lib/api";

interface VersionCreator {
  id: string;
  name: string;
  email: string;
}

interface DocumentVersion {
  id: string;
  title: string;
  versionNumber: number;
  createdAt: string;
  createdBy: VersionCreator | null;
}

interface VersionListResponse {
  status: string;
  data: {
    versions: DocumentVersion[];
    total: number;
  };
}

interface VersionDetail {
  id: string;
  documentId: string;
  title: string;
  state: string;
  createdAt: string;
  createdBy: VersionCreator | null;
}

interface VersionDetailResponse {
  status: string;
  data: {
    version: VersionDetail;
  };
}

interface Props {
  documentId: string;
  onClose: () => void;
  onRestore: (versionId: string) => Promise<void>;
  canRestore: boolean;
}

// ===================================
// BASE64 TO YJS UPDATE
// ===================================

function decodeBase64State(state: string): Uint8Array {
  const binary = atob(state);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

// ===================================
// READ-ONLY VERSION PREVIEW
// ===================================

function VersionPreview({ state }: { state: string }) {
  const ydoc = useMemo(() => {
    const document = new Y.Doc();

    Y.applyUpdate(document, decodeBase64State(state));

    return document;
  }, [state]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: false,

      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),

        Collaboration.configure({
          document: ydoc,
        }),
      ],

      editorProps: {
        attributes: {
          class: "tiptap min-h-64 px-5 py-6 outline-none",
        },
      },
    },
    [ydoc],
  );

  useEffect(() => {
    return () => {
      ydoc.destroy();
    };
  }, [ydoc]);

  if (!editor) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Loading preview...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <span className="text-xs font-medium text-slate-500">
          READ-ONLY PREVIEW
        </span>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

// ===================================
// VERSION HISTORY PANEL
// ===================================

export default function VersionHistoryPanel({
  documentId,
  onClose,
  onRestore,
  canRestore,
}: Props) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  const [selectedVersion, setSelectedVersion] = useState<VersionDetail | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [error, setError] = useState("");
  const [restoreMessage, setRestoreMessage] = useState("");

  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(
    null,
  );

  // ===================================
  // LOAD VERSION LIST
  // ===================================

  async function loadVersions() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<VersionListResponse>(
        `/api/documents/${documentId}/versions`,
      );

      setVersions(result.data.versions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load version history.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVersions();
  }, [documentId]);

  // ===================================
  // LOAD VERSION PREVIEW
  // ===================================

  async function handlePreview(versionId: string) {
    setPreviewLoading(true);
    setError("");
    setRestoreMessage("");

    try {
      const result = await apiRequest<VersionDetailResponse>(
        `/api/documents/${documentId}/versions/${versionId}`,
      );

      setSelectedVersion(result.data.version);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load version preview.",
      );

      setSelectedVersion(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  // ===================================
  // RESTORE SELECTED VERSION
  // ===================================

  async function handleRestore() {
    if (!selectedVersion || !canRestore || restoringVersionId) {
      return;
    }

    const confirmed = window.confirm(
      "Restore this version? Your current document will first be saved as a backup version.",
    );

    if (!confirmed) {
      return;
    }

    setRestoringVersionId(selectedVersion.id);
    setError("");
    setRestoreMessage("");

    try {
      
      // await new Promise((resolve) => setTimeout(resolve, 3000));
      await onRestore(selectedVersion.id);

      setRestoreMessage(
        "Version restored successfully. The previous document was saved as a backup.",
      );

      // Refresh the list so the automatically created backup appears.
      await loadVersions();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to restore this version.";

      if (
        message.toLowerCase().includes("currently being restored") ||
        message.toLowerCase().includes("another user")
      ) {
        setError(
          "Another collaborator is currently restoring this document. Please try again shortly.",
        );
      } else {
        setError(message);
      }
    } finally {
      setRestoringVersionId(null);
    }
  }

  const selectedVersionNumber = selectedVersion
    ? versions.find((version) => version.id === selectedVersion.id)
        ?.versionNumber
    : undefined;

  const isRestoring = restoringVersionId !== null;

  // ===================================
  // UI
  // ===================================

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* BACKDROP */}

      <button
        type="button"
        aria-label="Close version history"
        onClick={onClose}
        disabled={isRestoring}
        className="absolute inset-0 bg-slate-950/40 disabled:cursor-not-allowed"
      />

      {/* PANEL */}

      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Version History
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Browse, preview, and restore previous document versions.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* BODY */}

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {restoreMessage && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
            >
              {restoreMessage}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading version history...
            </div>
          ) : versions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-medium text-slate-700">
                No saved versions yet
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Save a document version to see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  Saved versions
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  {versions.length} versions
                </span>
              </div>

              {versions.map((version) => {
                const isSelected = selectedVersion?.id === version.id;

                return (
                  <div
                    key={version.id}
                    className={`rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-blue-400 bg-blue-50/50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900">
                          Version {version.versionNumber}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {version.createdBy?.name || "Unknown user"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(version.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePreview(version.id)}
                        disabled={previewLoading || isRestoring}
                        className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {isSelected ? "Selected" : "Preview"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PREVIEW */}

          <div className="mt-8">
            {previewLoading && (
              <div className="py-8 text-center text-sm text-slate-500">
                Loading selected version...
              </div>
            )}

            {!previewLoading && selectedVersion && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Version {selectedVersionNumber ?? ""} Preview
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Saved by {selectedVersion.createdBy?.name || "Unknown user"}
                  </p>
                </div>

                <VersionPreview
                  key={selectedVersion.id}
                  state={selectedVersion.state}
                />

                {canRestore && (
                  <button
                    type="button"
                    onClick={handleRestore}
                    disabled={isRestoring || loading}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {restoringVersionId === selectedVersion.id
                      ? "Restoring version..."
                      : "Restore this version"}
                  </button>
                )}

                {!canRestore && (
                  <p className="rounded-lg bg-amber-50 p-3 text-center text-xs text-amber-800">
                    You have view-only access. Restoring versions is disabled.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}

        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Close History
          </button>
        </div>
      </aside>
    </div>
  );
}
