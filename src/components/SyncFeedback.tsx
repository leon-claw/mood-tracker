import React from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export type ToastMessage = { type: 'success' | 'error'; message: string } | null;

export const SyncStatusIcon: React.FC<{ isSyncing: boolean }> = ({ isSyncing }) => (
  <span
    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-[#8FA88B] transition-opacity duration-200 ${
      isSyncing ? 'opacity-100' : 'opacity-0'
    }`}
    role={isSyncing ? 'status' : undefined}
    aria-label={isSyncing ? '正在同步云端数据' : undefined}
    aria-hidden={!isSyncing}
  >
    <LoaderCircle size={16} strokeWidth={2.4} className={isSyncing ? 'animate-spin' : ''} />
  </span>
);

export const GlobalToast: React.FC<{ toast: ToastMessage }> = ({ toast }) => (
  <AnimatePresence mode="wait">
    {toast && (
      <motion.div
        key={`${toast.type}-${toast.message}`}
        id="global-toast"
        className="absolute left-5 right-5 top-5 z-[90] pointer-events-none"
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div
          className={`mx-auto flex w-full items-start gap-2 rounded-2xl border px-3.5 py-3 text-xs font-semibold shadow-lg backdrop-blur-md ${
            toast.type === 'success'
              ? 'border-[#D8E7D6] bg-white/95 text-[#6E876B]'
              : 'border-rose-100 bg-white/95 text-rose-600'
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
          )}
          <span className="leading-relaxed">{toast.message}</span>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
