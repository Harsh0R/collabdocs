
"use client";

export interface DocumentItem {
    id: string;
    title: string;
    ownerId: string;
    role: "OWNER" | "EDITOR" | "VIEWER";
    updatedAt: string;
    collaboratorCount: number;
}

interface DocumentCardProps {
    document: DocumentItem;
    onOpen: (document: DocumentItem) => void;
    onShare: (document: DocumentItem) => void;
    onDelete: (document: DocumentItem) => void;
}

function getRoleStyle(role: DocumentItem["role"]) {
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
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Unknown";
    }

    return parsedDate.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function DocumentCard({
    document,
    onOpen,
    onShare,
    onDelete,
}: DocumentCardProps) {
    return (
        <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
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
                type="button"
                onClick={() => onOpen(document)}
                className="block w-full text-left"
            >
                <h3 className="truncate text-lg font-semibold text-slate-900">
                    {document.title}
                </h3>

                <p className="mt-2 text-xs text-slate-500">
                    Last updated {formatDate(document.updatedAt)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                    {document.collaboratorCount ?? 0} collaborator(s)
                </p>
            </button>

            <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                <button
                    type="button"
                    onClick={() => onOpen(document)}
                    className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                    Open
                </button>

                {document.role === "OWNER" && (
                    <>
                        <button
                            type="button"
                            onClick={() => onShare(document)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                        >
                            Share
                        </button>

                        <button
                            type="button"
                            onClick={() => onDelete(document)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                            title="Delete document"
                        >
                            Delete
                        </button>
                    </>
                )}
            </div>
        </article>
    );
}
