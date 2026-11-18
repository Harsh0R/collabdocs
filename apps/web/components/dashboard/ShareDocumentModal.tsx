
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type Role = "EDITOR" | "VIEWER";

interface Member {
    id: string;
    role: Role;
    user: {
        id: string;
        name: string;
        email: string;
        avatar?: string | null;
    };
}

interface DocumentDetails {
    id: string;
    title: string;
    owner: {
        id: string;
        name: string;
        email: string;
    };
    members: Member[];
}

interface Props {
    documentId: string;
    documentTitle: string;
    onClose: () => void;
}

interface GetDocumentResponse {
    data: {
        document: DocumentDetails;
    };
}

interface ShareResponse {
    data: {
        member: Member;
    };
}

export default function ShareDocumentModal({
    documentId,
    documentTitle,
    onClose,
}: Props) {
    const [members, setMembers] = useState<Member[]>([]);
    const [owner, setOwner] = useState<DocumentDetails["owner"] | null>(null);

    const [email, setEmail] = useState("");
    const [role, setRole] = useState<Role>("EDITOR");

    const [loading, setLoading] = useState(true);
    const [sharing, setSharing] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadMembers = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result =
                await apiRequest<GetDocumentResponse>(
                    `/api/documents/${documentId}`
                );

            setMembers(result.data.document.members);
            setOwner(result.data.document.owner);

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load collaborators"
            );
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    useEffect(() => {
        void loadMembers();
    }, [loadMembers]);

    // ===================================
    // SHARE DOCUMENT
    // ===================================

    async function handleShare(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) return;

        setSharing(true);
        setError("");
        setSuccess("");

        try {
            const existingMember = members.find(
                (member) =>
                    member.user.email.toLowerCase() ===
                    normalizedEmail
            );

            if (existingMember) {
                throw new Error(
                    "This user already has access. Change their role below."
                );
            }

            if (
                owner?.email.toLowerCase() === normalizedEmail
            ) {
                throw new Error(
                    "The document owner already has full access."
                );
            }

            await apiRequest<ShareResponse>(
                `/api/documents/${documentId}/members`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        email: normalizedEmail,
                        role,
                    }),
                }
            );

            setEmail("");
            setRole("EDITOR");

            setSuccess("Document shared successfully.");

            await loadMembers();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to share document"
            );
        } finally {
            setSharing(false);
        }
    }

    // ===================================
    // UPDATE ROLE
    // ===================================

    async function handleRoleChange(
        memberId: string,
        newRole: Role
    ) {
        setError("");
        setSuccess("");

        try {
            await apiRequest(
                `/api/documents/${documentId}/members/${memberId}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        role: newRole,
                    }),
                }
            );

            setSuccess("Permission updated successfully.");

            await loadMembers();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to update permission"
            );
        }
    }

    // ===================================
    // REMOVE MEMBER
    // ===================================

    async function handleRemove(member: Member) {
        const confirmed = window.confirm(
            `Remove ${member.user.email} from this document?`
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");

        try {
            await apiRequest(
                `/api/documents/${documentId}/members/${member.id}`,
                {
                    method: "DELETE",
                }
            );

            setSuccess("Collaborator removed successfully.");

            await loadMembers();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to remove collaborator"
            );
        }
    }

    // ===================================
    // UI
    // ===================================

    return (
        <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">

                {/* HEADER */}

                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            Share document
                        </h2>

                        <p className="mt-1 max-w-sm truncate text-sm text-slate-500">
                            {documentTitle}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg px-3 py-1 text-2xl text-slate-400 hover:bg-slate-100"
                        aria-label="Close sharing dialog"
                    >
                        ×
                    </button>

                </div>

                <div className="space-y-6 p-6">

                    {/* INVITE FORM */}

                    <form
                        onSubmit={handleShare}
                        className="space-y-4"
                    >

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Add people by email
                            </label>

                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder="friend@example.com"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">

                            <select
                                value={role}
                                onChange={(event) =>
                                    setRole(event.target.value as Role)
                                }
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                            >
                                <option value="EDITOR">
                                    Editor — Can edit
                                </option>

                                <option value="VIEWER">
                                    Viewer — Can only view
                                </option>
                            </select>

                            <button
                                type="submit"
                                disabled={sharing || !email.trim()}
                                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {sharing ? "Sharing..." : "Share"}
                            </button>

                        </div>

                    </form>

                    {/* FEEDBACK */}

                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                            {success}
                        </div>
                    )}

                    {/* COLLABORATORS */}

                    <div>

                        <h3 className="mb-4 text-sm font-semibold text-slate-800">
                            People with access
                        </h3>

                        {loading ? (
                            <p className="text-sm text-slate-500">
                                Loading collaborators...
                            </p>
                        ) : (
                            <div className="max-h-72 space-y-3 overflow-y-auto">

                                {/* OWNER */}

                                {owner && (
                                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">

                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 font-semibold text-purple-700">
                                            {owner.name.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {owner.name}
                                            </p>

                                            <p className="truncate text-xs text-slate-500">
                                                {owner.email}
                                            </p>
                                        </div>

                                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                                            Owner
                                        </span>

                                    </div>
                                )}

                                {/* MEMBERS */}

                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3"
                                    >

                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                                            {member.user.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {member.user.name}
                                            </p>

                                            <p className="truncate text-xs text-slate-500">
                                                {member.user.email}
                                            </p>
                                        </div>

                                        <select
                                            value={member.role}
                                            onChange={(event) =>
                                                void handleRoleChange(
                                                    member.id,
                                                    event.target.value as Role
                                                )
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium"
                                        >
                                            <option value="EDITOR">
                                                Editor
                                            </option>

                                            <option value="VIEWER">
                                                Viewer
                                            </option>
                                        </select>

                                        <button
                                            onClick={() =>
                                                void handleRemove(member)
                                            }
                                            className="rounded-lg px-2 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                                        >
                                            Remove
                                        </button>

                                    </div>
                                ))}

                                {!loading && members.length === 0 && (
                                    <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                                        No collaborators yet. Invite someone to get started.
                                    </p>
                                )}

                            </div>
                        )}

                    </div>

                </div>

                {/* FOOTER */}

                <div className="border-t border-slate-200 px-6 py-4 text-right">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                    >
                        Done
                    </button>
                </div>

            </div>
        </div>
    );
}
