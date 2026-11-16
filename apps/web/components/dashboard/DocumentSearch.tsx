
"use client";

interface DocumentSearchProps {
    value: string;
    totalDocuments: number;
    onChange: (value: string) => void;
}

export default function DocumentSearch({
    value,
    totalDocuments,
    onChange,
}: DocumentSearchProps) {
    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    ⌕
                </span>

                <input
                    type="search"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="Search documents by title..."
                    aria-label="Search documents by title"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
            </div>

            <p className="text-sm text-slate-500">
                {totalDocuments} document(s)
            </p>
        </div>
    );
}
