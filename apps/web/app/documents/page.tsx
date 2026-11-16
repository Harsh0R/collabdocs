
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000";

interface DocumentItem {
    id: string;
    title: string;
    role: string;
    updatedAt: string;
}

export default function DocumentsPage() {
    const router = useRouter();

    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadDocuments() {
        const token = sessionStorage.getItem("accessToken");

        if (!token) {
            router.replace("/login");
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/documents`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Could not load documents");
            }

            const result = await response.json();

            setDocuments(result.data.documents);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    }

    async function createNewDocument() {
        const token = sessionStorage.getItem("accessToken");

        if (!token) {
            router.replace("/login");
            return;
        }

        const response = await fetch(
            `${API_URL}/api/documents`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },

                body: JSON.stringify({
                    title: "Untitled document",
                }),
            }
        );

        const result = await response.json();

        if (!response.ok) {
            setError(result.message || "Creation failed");
            return;
        }

        router.push(
            `/documents/${result.data.document.id}`
        );
    }

    useEffect(() => {
        void loadDocuments();
    }, []);

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-12 text-white md:px-12">

            <div className="mx-auto max-w-5xl">

                <header className="mb-10 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">
                            My Documents
                        </h1>

                        <p className="mt-2 text-slate-400">
                            Your collaborative workspace
                        </p>
                    </div>

                    <button
                        onClick={createNewDocument}
                        className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
                    >
                        + New document
                    </button>
                </header>

                {loading && (
                    <p className="text-slate-400">
                        Loading documents...
                    </p>
                )}

                {error && (
                    <p className="mb-5 text-red-400">
                        {error}
                    </p>
                )}

                {!loading && documents.length === 0 && (
                    <div className="rounded-xl border border-slate-800 p-10 text-center">
                        <h2 className="text-xl font-semibold">
                            No documents yet
                        </h2>

                        <p className="mt-2 text-slate-400">
                            Create your first document to get started.
                        </p>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                    {documents.map((doc) => (
                        <button
                            key={doc.id}
                            onClick={() =>
                                router.push(
                                    `/documents/${doc.id}`
                                )
                            }
                            className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-blue-500 hover:bg-slate-800"
                        >
                            <div className="mb-4 text-2xl">
                                📄
                            </div>

                            <h2 className="font-semibold">
                                {doc.title}
                            </h2>

                            <p className="mt-2 text-xs text-slate-400">
                                Role: {doc.role}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Updated:{" "}
                                {new Date(
                                    doc.updatedAt
                                ).toLocaleDateString()}
                            </p>
                        </button>
                    ))}

                </div>
            </div>
        </main>
    );
}
