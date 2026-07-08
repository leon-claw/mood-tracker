import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { PageTransition } from './PageTransition';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = '确认删除',
  cancelLabel = '取消',
  onCancel,
  onConfirm,
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/35 backdrop-blur-xs px-6">
        <PageTransition className="w-full max-w-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="bg-white border border-[#F2EDE9] rounded-[28px] shadow-2xl p-5 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 id="confirm-dialog-title" className="text-base font-bold text-[#4A4540]">
                    {title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mt-1">
                    {description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="关闭确认弹窗"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="h-11 rounded-full bg-gray-50 border border-[#F2EDE9] text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="h-11 rounded-full bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-500/15 hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>{confirmLabel}</span>
              </button>
            </div>
          </div>
        </PageTransition>
      </div>
    )}
  </AnimatePresence>
);
