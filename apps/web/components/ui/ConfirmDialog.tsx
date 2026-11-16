
"use client";

import Modal from "./Modal";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    variant?: "danger" | "primary";
    onConfirm: () => void | Promise<void>;
    onClose: () => void;
}

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    loading = false,
    variant = "danger",
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    const confirmClasses =
        variant === "danger"
            ? "bg-red-600 hover:bg-red-700"
            : "bg-blue-600 hover:bg-blue-700";

    return (
        <Modal
            open={open}
            title={title}
            onClose={loading ? () => {} : onClose}
            size="sm"
        >
            <p className="text-sm leading-6 text-gray-300">
                {message}
            </p>

            <div className="mt-7 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10 disabled:opacity-50"
                >
                    {cancelText}
                </button>

                <button
                    type="button"
                    onClick={() => void onConfirm()}
                    disabled={loading}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmClasses}`}
                >
                    {loading ? "Please wait..." : confirmText}
                </button>
            </div>
        </Modal>
    );
}
