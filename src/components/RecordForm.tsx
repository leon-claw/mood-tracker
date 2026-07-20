import React, { useEffect, useState } from 'react';
import { BookOpen, BriefcaseBusiness, Check, Moon, Salad, Smile, Zap } from 'lucide-react';
import { FIELD_DEFINITIONS } from '../fieldSchema';
import { sanitizeLogValues } from '../logEntry';
import { LogEntry, LogValues } from '../types';
import { RecordFieldId } from '../../shared/appPreferences';

interface RecordFormProps {
  date: string;
  entry?: LogEntry;
  onDateChange?: (date: string) => void;
  onChange: (entry: Omit<LogEntry, 'id'>) => void;
  showDateInput?: boolean;
  surface?: 'drawer' | 'page';
  enabledFieldIds: RecordFieldId[];
}

const getScaleIcon = (fieldId: string) => {
  if (fieldId === 'sleepQuality') return <Moon size={14} className="text-indigo-400" />;
  if (fieldId === 'energyLevel') return <Zap size={14} className="text-amber-400" />;
  if (fieldId === 'dietHealth') return <Salad size={14} className="text-emerald-500" />;
  if (fieldId === 'workEfficiency') return <BriefcaseBusiness size={14} className="text-slate-500" />;
  return <Smile size={14} className="text-[#8FA88B]" />;
};

export const getInitialValues = (entry?: LogEntry): Partial<LogValues> => entry?.values ? { ...entry.values } : {};

export const createRecordPayload = (date: string, values: Partial<LogValues>): Omit<LogEntry, 'id'> => ({
  date,
  values: sanitizeLogValues(values),
});

export const RecordForm: React.FC<RecordFormProps> = ({
  date,
  entry,
  onDateChange,
  onChange,
  showDateInput = false,
  surface = 'page',
  enabledFieldIds,
}) => {
  const [values, setValues] = useState<Partial<LogValues>>(() => getInitialValues(entry));
  const scaleCardClass = surface === 'drawer'
    ? 'flex flex-col gap-3 bg-gray-50/60 border border-gray-100/60 rounded-2xl p-4'
    : 'flex flex-col gap-3 bg-white border border-[#F2EDE9] rounded-3xl p-5 shadow-xs';
  const fieldCardClass = surface === 'drawer'
    ? 'flex flex-col gap-2'
    : 'bg-white border border-[#F2EDE9] rounded-3xl p-5 shadow-xs flex flex-col gap-3';
  const textCardClass = surface === 'drawer'
    ? 'flex flex-col gap-1.5'
    : 'bg-white border border-[#F2EDE9] rounded-3xl p-5 shadow-xs flex flex-col gap-2';

  useEffect(() => {
    setValues(getInitialValues(entry));
  }, [entry, date]);

  const applyValues = (nextValues: Partial<LogValues>) => {
    setValues(nextValues);
    onChange(createRecordPayload(date, nextValues));
  };

  const setScaleValue = (fieldId: string, value: number) => {
    const currentValue = typeof values[fieldId] === 'number' ? values[fieldId] as number : undefined;
    const nextValues = { ...values };

    if (currentValue === value) delete nextValues[fieldId];
    else nextValues[fieldId] = value;

    applyValues(nextValues);
  };

  const toggleEnumValue = (fieldId: string, optionId: string) => {
    const current = Array.isArray(values[fieldId]) ? values[fieldId] as string[] : [];
    const next = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    applyValues({ ...values, [fieldId]: next });
  };

  const setStringValue = (fieldId: string, value: string) => {
    applyValues({ ...values, [fieldId]: value });
  };

  return (
    <div className="flex flex-col gap-4">
      {showDateInput && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">选择日期</label>
          <input
            type="date"
            value={date}
            onChange={(event) => onDateChange?.(event.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-green-300 focus:bg-white transition-colors"
            required
          />
        </div>
      )}

      {FIELD_DEFINITIONS.filter((field) => enabledFieldIds.includes(field.id as RecordFieldId)).map((field) => {
        if (field.type === 'scale') {
          const selectedValue = typeof values[field.id] === 'number' ? values[field.id] as number : undefined;

          return (
            <div key={field.id} className={scaleCardClass}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  {getScaleIcon(field.id)}
                  <span>{field.label}</span>
                </span>
                <span className="text-sm font-bold text-[#8FA88B] font-mono">
                  {selectedValue ? `${selectedValue}/10` : '未选择'}
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setScaleValue(field.id, score)}
                    className={`aspect-square rounded-xl text-[11px] font-bold transition-all ${
                      selectedValue === score
                        ? 'bg-[#8FA88B] text-white shadow-sm scale-105'
                        : `${surface === 'drawer' ? 'bg-white' : 'bg-gray-50'} border border-[#F2EDE9] text-gray-400 hover:bg-[#E6F0E6]/40 hover:text-[#8FA88B]`
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        if (field.type === 'enum') {
          const selectedValues = Array.isArray(values[field.id]) ? values[field.id] as string[] : [];

          return (
            <div key={field.id} className={fieldCardClass}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{field.label}</label>
              <div className="flex flex-wrap gap-2">
                {field.options.map((option) => {
                  const isSelected = selectedValues.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleEnumValue(field.id, option.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-[#8FA88B] border-transparent text-white scale-105 shadow-xs'
                          : `${option.colorClass} border-[#F2EDE9]`
                      }`}
                    >
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        const textValue = typeof values[field.id] === 'string' ? values[field.id] as string : '';
        const maxLength = field.maxLength || 200;

        return (
          <div key={field.id} className={textCardClass}>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <BookOpen size={14} className="text-[#D48166]" />
              <span>{field.label}</span>
            </span>
            <textarea
              placeholder="记录今天的状态、想法或一个小片段..."
              value={textValue}
              onChange={(event) => setStringValue(field.id, event.target.value)}
              rows={surface === 'drawer' ? 3 : 4}
              maxLength={maxLength}
              className="w-full bg-gray-50 border border-[#F2EDE9] rounded-2xl px-4 py-3 text-xs text-gray-700 outline-none focus:border-[#8FA88B] focus:bg-white transition-colors resize-none"
            />
            <div className="text-[10px] text-gray-400 text-right font-medium">
              {textValue.length}/{maxLength} 字
            </div>
          </div>
        );
      })}

    </div>
  );
};
