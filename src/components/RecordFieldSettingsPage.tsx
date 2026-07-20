import React from 'react';
import {
  Activity,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  CloudSun,
  Moon,
  Salad,
  Smile,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { FIELD_DEFINITIONS } from '../fieldSchema';
import { FieldDefinition } from '../types';
import { RecordFieldId } from '../../shared/appPreferences';
import { SyncStatusIcon } from './SyncFeedback';

interface RecordFieldSettingsPageProps {
  enabledFieldIds: RecordFieldId[];
  isSyncing: boolean;
  onBack: () => void;
  onToggle: (fieldId: RecordFieldId) => void;
}

const fieldGroups: Array<{ type: FieldDefinition['type']; label: string; description: string }> = [
  { type: 'scale', label: '量表', description: '使用 1 到 10 分记录状态' },
  { type: 'enum', label: '选择项', description: '从固定选项中选择一个或多个' },
  { type: 'string', label: '文本', description: '自由写下当天的内容' },
];

const getFieldIcon = (fieldId: RecordFieldId) => {
  const iconClass = 'text-[#8FA88B]';
  if (fieldId === 'sleepQuality') return <Moon size={18} className="text-indigo-400" />;
  if (fieldId === 'moodLevel') return <Smile size={18} className={iconClass} />;
  if (fieldId === 'energyLevel') return <Zap size={18} className="text-amber-500" />;
  if (fieldId === 'dietHealth') return <Salad size={18} className="text-emerald-500" />;
  if (fieldId === 'workEfficiency') return <BriefcaseBusiness size={18} className="text-slate-500" />;
  if (fieldId === 'activities') return <Activity size={18} className="text-rose-400" />;
  if (fieldId === 'weather') return <CloudSun size={18} className="text-sky-500" />;
  if (fieldId === 'social') return <Users size={18} className="text-violet-500" />;
  if (fieldId === 'achievementMilestones') return <Trophy size={18} className="text-amber-600" />;
  if (fieldId === 'journal') return <BookOpen size={18} className="text-[#D48166]" />;
  if (fieldId === 'achievement') return <Award size={18} className="text-orange-500" />;
  return <Sparkles size={18} className={iconClass} />;
};

export const RecordFieldSettingsPage: React.FC<RecordFieldSettingsPageProps> = ({
  enabledFieldIds,
  isSyncing,
  onBack,
  onToggle,
}) => (
  <div id="record-field-settings-pane" className="flex flex-col gap-4 pb-12">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-xs border border-[#F2EDE9] transition-all hover:text-[#8FA88B] active:scale-95"
          aria-label="返回我的"
        >
          <ChevronLeft size={19} />
        </button>
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#4A4540]">
            <span>记录模块设置</span>
            <SyncStatusIcon isSyncing={isSyncing} />
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">选择新建和编辑记录时显示的内容</p>
        </div>
      </div>
      <span className="mt-1 shrink-0 rounded-full bg-[#E6F0E6] px-2.5 py-1 text-[10px] font-bold text-[#7D9779] font-mono">
        {enabledFieldIds.length}/{FIELD_DEFINITIONS.length}
      </span>
    </div>

    <div className="rounded-2xl border border-[#D8E7D6] bg-[#E6F0E6]/55 px-4 py-3 text-xs leading-relaxed text-[#6E876B]">
      这里只控制记录面板的显示内容，不会删除已经保存的历史数据。
    </div>

    {fieldGroups.map((group) => {
      const fields = FIELD_DEFINITIONS.filter((field) => field.type === group.type);
      return (
        <section key={group.type} className="flex flex-col gap-2">
          <div className="px-1">
            <h3 className="text-xs font-bold text-[#4A4540]">{group.label}</h3>
            <p className="mt-0.5 text-[10px] text-gray-400">{group.description}</p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-[#F2EDE9] bg-white shadow-xs">
            {fields.map((field, index) => {
              const fieldId = field.id as RecordFieldId;
              const isEnabled = enabledFieldIds.includes(fieldId);
              return (
                <div
                  key={field.id}
                  className={`flex min-h-17 items-center justify-between gap-4 px-4 py-3 ${
                    index > 0 ? 'border-t border-[#F2EDE9]' : ''
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gray-50">
                      {getFieldIcon(fieldId)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#4A4540]">{field.label}</div>
                      <div className="mt-0.5 text-[10px] text-gray-400">
                        {field.type === 'scale' ? '1-10 分' : field.type === 'enum' ? '可多选' : `最多 ${field.maxLength || 200} 字`}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggle(fieldId)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90 ${
                      isEnabled
                        ? 'border-[#8FA88B] bg-[#8FA88B] text-white shadow-sm'
                        : 'border-gray-200 bg-white text-transparent hover:border-[#A9C2A5]'
                    }`}
                    aria-label={`${isEnabled ? '隐藏' : '显示'}${field.label}`}
                    aria-pressed={isEnabled}
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      );
    })}
  </div>
);
