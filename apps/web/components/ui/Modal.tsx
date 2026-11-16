
"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
    open: boolean;
    title: string;
    description?: string;
    children: ReactNode;
    onClose: () => void;
    size?: "sm" | "md" | "lg";
}

export default function Modal({
    open,
    title,
    description,
    children,
    onClose,
    size = "md",
}: ModalProps) {
    useEffect(() => {
        if (!open) return;

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        window.addEventListener("keydown", handleEscape);

        return () => {
            window.removeEventListener("keydown", handleEscape);
        };
    }, [open, onClose]);

    if (!open) return null;

    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className={`w-full ${sizeClasses[size]} rounded-2xl border border-white/10 bg-[#151515] p-6 shadow-2xl`}
            >
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h2
                            id="modal-title"
                            className="text-xl font-semibold text-white"
                        >
                            {title}
                        </h2>

                        {description && (
                            <p className="mt-1 text-sm text-gray-400">
                                {description}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="rounded-lg px-2 py-1 text-xl text-gray-400 hover:bg-white/10 hover:text-white"
                    >
                        &times;
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}
