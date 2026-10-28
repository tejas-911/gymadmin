import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import useDialog from '../hooks/useDialog';

// Destructive-action confirmation. onConfirm may be async; a thrown error is shown in the dialog.
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const ref = useDialog(open, onCancel);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => { setError(''); onCancel(); };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark/80" onClick={cancel} />
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" tabIndex={-1}
        className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-2xl">
        <h2 id="confirm-title" className="text-lg font-space font-bold text-fg mb-2">{title}</h2>
        <p id="confirm-message" className="text-sm text-iron-text-secondary mb-6">{message}</p>
        {error && (
          <p role="alert" className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={cancel} className="px-5 py-2.5 rounded-lg border border-border text-xs font-bold tracking-widest text-fg hover:bg-fg/5">
            Cancel
          </button>
          <button onClick={confirm} disabled={busy}
            className="px-5 py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold tracking-widest hover:bg-red-700 disabled:opacity-60 flex items-center gap-2">
            {busy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
