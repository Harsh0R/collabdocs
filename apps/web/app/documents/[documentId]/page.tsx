
import { Suspense } from "react";
import DocumentPageClient from "./DocumentPageClient";

export default function DocumentPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-50">
                    <p className="text-sm text-slate-500">
                        Loading document...
                    </p>
                </div>
            }
        >
            <DocumentPageClient />
        </Suspense>
    );
}
