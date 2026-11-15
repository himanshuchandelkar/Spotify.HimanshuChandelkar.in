import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useSite } from '../context/SiteContext';

export const ToastContainer: React.FC = () => {
  const { toasts } = useSite();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border border-zinc-800 bg-[#141418]/95 backdrop-blur-md text-xs sm:text-sm text-zinc-100 shadow-2xl"
        >
          {toast.tone === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : toast.tone === 'info' ? (
            <Info className="w-4 h-4 text-zinc-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#1DB954] shrink-0" />
          )}
          <span className="truncate">{toast.text}</span>
        </div>
      ))}
    </div>
  );
};
