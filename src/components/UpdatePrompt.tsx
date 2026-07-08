import React from 'react';
import { Download, Leaf, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { PageTransition } from './PageTransition';
import { UpdateManifest } from '../updateCheck';

interface UpdatePromptProps {
  manifest: UpdateManifest | null;
  onDismiss: () => void;
  onDownload: (apkUrl: string) => void;
}

export const UpdatePrompt: React.FC<UpdatePromptProps> = ({ manifest, onDismiss, onDownload }) => (
  <AnimatePresence>
    {manifest && (
      <div className="fixed inset-0 z-[65] flex items-center justify-center bg-zinc-900/35 backdrop-blur-xs px-6">
        <PageTransition className="w-full max-w-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-prompt-title"
            className="bg-white border border-[#F2EDE9] rounded-[28px] shadow-2xl p-5 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E6F0E6] text-[#8FA88B] flex items-center justify-center shrink-0">
                  <Leaf size={18} />
                </div>
                <div>
                  <h3 id="update-prompt-title" className="text-base font-bold text-[#4A4540]">
                    版本更新
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mt-1">
                    发现新版 {manifest.version}，可以下载新版 APK 后覆盖安装。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onDismiss}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="关闭更新提示"
              >
                <X size={16} />
              </button>
            </div>

            {manifest.notes && (
              <div className="rounded-2xl bg-[#F9F8F6] border border-[#F2EDE9] px-3 py-2 text-xs text-gray-500 leading-relaxed">
                {manifest.notes}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onDismiss}
                className="h-11 rounded-full bg-gray-50 border border-[#F2EDE9] text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                稍后再说
              </button>
              <button
                type="button"
                onClick={() => onDownload(manifest.apkUrl)}
                className="h-11 rounded-full bg-[#8FA88B] text-white text-xs font-semibold shadow-md hover:bg-[#7D9779] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                <span>下载新版</span>
              </button>
            </div>
          </div>
        </PageTransition>
      </div>
    )}
  </AnimatePresence>
);
