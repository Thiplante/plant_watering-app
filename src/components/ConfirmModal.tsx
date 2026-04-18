"use client";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(20,32,24,0.42)] p-4 sm:items-center">
      <div className="glass-card w-full max-w-md p-6 sm:p-7">
        <p className="eyebrow mb-3">Confirmation</p>
        <h2 className="section-title !mb-0">{title}</h2>
        <p className="subtle-text mt-3 text-sm">{description}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button onClick={onCancel} disabled={busy} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={tone === "danger" ? "btn-danger" : "btn-primary"}
          >
            {busy ? "Confirmation..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
