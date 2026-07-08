import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Cloud, Database, X } from 'lucide-react';

interface DataSourceChoiceDialogProps {
  isOpen: boolean;
  email?: string;
  isBusy: boolean;
  onUseLocal: () => void;
  onUseCloud: () => void;
  onCancel: () => void;
}

export const DataSourceChoiceDialog: React.FC<DataSourceChoiceDialogProps> = ({
  isOpen,
  email,
  isBusy,
  onUseLocal,
  onUseCloud,
  onCancel,
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 backdrop-blur-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <motion.div
          className="bg-white w-full max-w-md rounded-t-[32px] shadow-2xl p-6 pb-8 flex flex-col gap-5 border-t border-gray-100"
          initial={{ y: '100%', opacity: 0.96 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.98 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.9 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto -mt-2 mb-1"></div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#4A4540]">选择数据来源</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {email ? `${email} 已登录。` : ''}
                检测到浏览器里还有本地记录，请选择保留哪一份。
              </p>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="取消数据来源选择"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={onUseLocal}
              disabled={isBusy}
              className="rounded-3xl border border-[#E6F0E6] bg-[#E6F0E6]/45 p-4 text-left flex items-start gap-3 hover:bg-[#E6F0E6]/70 disabled:opacity-60 transition-colors"
            >
              <span className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#8FA88B] shrink-0">
                <Database size={19} />
              </span>
              <span>
                <span className="block text-sm font-bold text-[#4A4540]">使用本地数据</span>
                <span className="block text-xs text-gray-500 leading-relaxed mt-1">
                  上传当前浏览器记录并覆盖云端，之后清空本地，只保留云端一处数据。
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={onUseCloud}
              disabled={isBusy}
              className="rounded-3xl border border-[#F2EDE9] bg-gray-50/70 p-4 text-left flex items-start gap-3 hover:bg-white disabled:opacity-60 transition-colors"
            >
              <span className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#8FA88B] shrink-0">
                <Cloud size={19} />
              </span>
              <span>
                <span className="block text-sm font-bold text-[#4A4540]">使用云端数据</span>
                <span className="block text-xs text-gray-500 leading-relaxed mt-1">
                  读取账号里的云端记录并清空本地，避免后续出现两份不同的数据。
                </span>
              </span>
            </button>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            取消会退出登录，并继续使用当前本地模式。
          </p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
