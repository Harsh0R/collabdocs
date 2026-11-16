
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CollaborativeEditor from "@/components/CollaborativeEditor";


const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000";

interface User {
    id: string;
    name: string;
    email: string;
}

interface DocumentData {
    id: string;
    title: string;
    role: "OWNER" | "EDITOR" | "VIEWER";
}

export default function DocumentPage() {
    const params = useParams<{ documentId: string }>();

    const router = useRouter();

    const documentId = params.documentId;

    const [token, setToken] = useState("");
    const [user, setUser] = useState<User | null>(null);

    const [document, setDocument] =
        useState<DocumentData | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadDocument() {
            const accessToken =
                sessionStorage.getItem("accessToken");

            const storedUser =
                sessionStorage.getItem("user");

            if (!accessToken || !storedUser) {
                router.replace("/login");
                return;
            }

            try {
                const currentUser = JSON.parse(storedUser);

                setToken(accessToken);
                setUser(currentUser);

                const response = await fetch(
                    `${API_URL}/api/documents/${documentId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message || "Unable to load document"
                    );
                }

                setDocument(result.data.document);

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

        void loadDocument();
    }, [documentId, router]);

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-100 p-10">
                Loading document...
            </main>
        );
    }

    if (error || !document || !user || !token) {
        return (
            <main className="min-h-screen bg-slate-100 p-10">
                <div className="rounded-xl bg-white p-8">
                    <p className="text-red-600">
                        {error || "Document unavailable"}
                    </p>

                    <button
                        onClick={() => router.push("/documents")}
                        className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-white"
                    >
                        Back to documents
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-100">

            <header className="border-b bg-white px-6 py-4">
                <div className="mx-auto flex max-w-7xl items-center justify-between">

                    <button
                        onClick={() => router.push("/documents")}
                        className="font-semibold text-slate-800"
                    >
                        ← CollabDocs
                    </button>

                    <div className="text-sm text-slate-500">
                        Logged in as {user.name}
                    </div>

                </div>
            </header>

            <div className="mx-auto max-w-6xl px-5 py-10">

                <CollaborativeEditor
                    documentId={document.id}
                    accessToken={token}
                    user={user}
                    title={document.title}
                    readOnly={document.role === "VIEWER"}
                />

            </div>

        </main>
    );
}
