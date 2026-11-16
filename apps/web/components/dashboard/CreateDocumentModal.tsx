
"use client";

import type { FormEvent } from "react";

interface CreateDocumentModalProps {
    open: boolean;
    title: string;
    creating: boolean;
    onTitleChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onClose: () => void;
}

export default function CreateDocumentModal({
    open,
    title,
    creating,
    onTitleChange,
    onSubmit,
    onClose,
}: CreateDocumentModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !creating) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-document-title"
                className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
            >
                <div className="mb-6 flex items-center justify-between">
                    <h3
                        id="create-document-title"
                        className="text-xl font-bold text-slate-900"
                    >
                        Create document
                    </h3>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={creating}
                        aria-label="Close dialog"
                        className="text-xl text-slate-400 hover:text-slate-700 disabled:opacity-50"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="document-title"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Document title
                        </label>

                        <input
                            id="document-title"
                            autoFocus
                            required
                            maxLength={200}
                            value={title}
                            onChange={(event) =>
                                onTitleChange(event.target.value)
                            }
                            placeholder="Enter document title"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={creating}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={creating || !title.trim()}
                            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {creating ? "Creating..." : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
