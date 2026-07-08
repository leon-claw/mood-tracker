import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { LogEntry } from '../types';
import { RecordForm } from './RecordForm';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<LogEntry, 'id'>) => void;
  initialDate?: string;
  entry?: LogEntry;
}

export const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, onSave, initialDate, entry }) => {
  const todayStr = initialDate || new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const selectedEntry = entry?.date === date ? entry : undefined;
  const isToday = date === new Date().toISOString().split('T')[0];
  const modalTitle = selectedEntry ? '编辑记录' : isToday ? '记录今天' : '新建记录';
  const submitLabel = selectedEntry ? '保存修改' : isToday ? '保存今日记录' : '保存记录';

  useEffect(() => {
    if (isOpen) {
      setDate(todayStr);
    }
  }, [isOpen, todayStr]);

  const handleSave = (record: Omit<LogEntry, 'id'>) => {
    onSave(record);
    onClose();
  };

  return (
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
            className="bg-white w-full max-w-md rounded-t-[32px] max-h-[92vh] overflow-y-auto shadow-2xl p-6 pb-8 flex flex-col gap-5 border-t border-gray-100"
            initial={{ y: '100%', opacity: 0.96 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.9 }}
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto -mt-2 mb-1"></div>

            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span>{modalTitle}</span>
                <span className="text-sm font-normal text-gray-400">({date})</span>
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="关闭记录弹窗"
              >
                <X size={18} />
              </button>
            </div>

            <RecordForm
              date={date}
              entry={selectedEntry}
              onDateChange={setDate}
              onSave={handleSave}
              submitLabel={submitLabel}
              mode={selectedEntry ? 'edit' : 'create'}
              showDateInput
              surface="drawer"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
