import React, { useMemo, useState } from 'react';
import {
  AlarmClock,
  BellRing,
  ChevronDown,
  ChevronLeft,
  Clock3,
  LoaderCircle,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_REMINDER_TIME,
  MAX_REMINDER_TIMES,
  ReminderPreferences,
} from '../../shared/appPreferences';
import type { ReminderPermissionState } from '../reminderService';
import { SyncStatusIcon } from './SyncFeedback';

interface ReminderSettingsPageProps {
  reminders: ReminderPreferences;
  permissionState: ReminderPermissionState;
  exactAlarmState: ReminderPermissionState;
  isPermissionBusy: boolean;
  isExactAlarmBusy: boolean;
  isSyncing: boolean;
  onBack: () => void;
  onToggle: (enabled: boolean) => void;
  onRequestExactAlarmPermission: () => void;
  onAddTime: (time: string) => void;
  onRemoveTime: (time: string) => void;
}

const permissionCopy: Partial<Record<ReminderPermissionState, string>> = {
  denied: '系统通知权限未开启，请在系统设置中允许通知后再启用提醒。',
  'prompt-with-rationale': '开启系统通知权限后，应用才能按时提醒你打卡。',
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0'));

export const ReminderSettingsPage: React.FC<ReminderSettingsPageProps> = ({
  reminders,
  permissionState,
  exactAlarmState,
  isPermissionBusy,
  isExactAlarmBusy,
  isSyncing,
  onBack,
  onToggle,
  onRequestExactAlarmPermission,
  onAddTime,
  onRemoveTime,
}) => {
  const [draftTime, setDraftTime] = useState(DEFAULT_REMINDER_TIME);
  const [draftHour, draftMinute] = draftTime.split(':');
  const isDuplicate = reminders.times.includes(draftTime);
  const isAtLimit = reminders.times.length >= MAX_REMINDER_TIMES;
  const canAdd = Boolean(draftTime) && !isDuplicate && !isAtLimit;
  const statusText = useMemo(() => {
    if (reminders.enabled) return `每天提醒 ${reminders.times.length} 次`;
    return '提醒已关闭';
  }, [reminders.enabled, reminders.times.length]);
  const warning = permissionCopy[permissionState];

  return (
    <div id="reminder-settings-pane" className="flex flex-col gap-4 pb-12">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#F2EDE9] bg-white text-gray-500 shadow-xs transition-all hover:text-[#8FA88B] active:scale-95"
          aria-label="返回我的"
        >
          <ChevronLeft size={19} />
        </button>
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#4A4540]">
            <span>打卡提醒</span>
            <SyncStatusIcon isSyncing={isSyncing} />
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">设置每天提醒记录的时间</p>
        </div>
      </div>

      <section className="rounded-3xl border border-[#F2EDE9] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E6F0E6] text-[#8FA88B]">
              <BellRing size={19} />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#4A4540]">每日提醒</h3>
              <p className="mt-1 text-[11px] text-gray-400">{statusText}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onToggle(!reminders.enabled)}
            disabled={isPermissionBusy}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:cursor-wait disabled:opacity-70 ${
              reminders.enabled ? 'bg-[#8FA88B]' : 'bg-gray-200'
            }`}
            aria-label={reminders.enabled ? '关闭每日提醒' : '开启每日提醒'}
            aria-pressed={reminders.enabled}
          >
            <span
              className={`absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                reminders.enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            >
              {isPermissionBusy && <LoaderCircle size={13} className="animate-spin text-[#8FA88B]" />}
            </span>
          </button>
        </div>
      </section>

      {warning && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-700">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {reminders.enabled && exactAlarmState === 'denied' && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-amber-700">
          <AlarmClock size={17} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">精确提醒权限未开启</p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-700/75">
              系统可能延迟提醒，请允许 Mood Tracker 设置精确提醒。
            </p>
          </div>
          <button
            type="button"
            onClick={onRequestExactAlarmPermission}
            disabled={isExactAlarmBusy}
            className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-amber-100 px-3 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-200 active:scale-95 disabled:cursor-wait disabled:opacity-70"
          >
            {isExactAlarmBusy && <LoaderCircle size={13} className="animate-spin" />}
            <span>去开启</span>
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-[#F2EDE9] bg-white shadow-xs">
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#4A4540]">
              <Clock3 size={16} className="text-[#8FA88B]" />
              <span>提醒时间</span>
            </h3>
            <p className="mt-1 text-[11px] text-gray-400">最多设置 {MAX_REMINDER_TIMES} 个时间</p>
          </div>
          <span className="rounded-full bg-[#E6F0E6] px-2.5 py-1 font-mono text-[10px] font-bold text-[#7D9779]">
            {reminders.times.length}/{MAX_REMINDER_TIMES}
          </span>
        </div>

        <div className="border-t border-[#F2EDE9]">
          {reminders.times.length === 0 ? (
            <div className="px-5 py-6 text-center text-xs text-gray-400">添加一个时间后即可开启提醒</div>
          ) : reminders.times.map((time) => (
            <div key={time} className="flex h-15 items-center justify-between border-b border-[#F2EDE9] px-5 last:border-b-0">
              <span className="font-mono text-lg font-semibold text-[#4A4540]">{time}</span>
              <button
                type="button"
                onClick={() => onRemoveTime(time)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-rose-50 hover:text-rose-500 active:scale-90"
                aria-label={`删除 ${time} 提醒`}
                title="删除提醒时间"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-[#F2EDE9] bg-gray-50/60 p-4">
          <div className="flex h-11 min-w-0 flex-1 items-center rounded-2xl border border-gray-100 bg-white px-2 transition-colors focus-within:border-[#8FA88B]">
            <label className="relative min-w-0 flex-1">
              <select
                value={draftHour}
                onChange={(event) => setDraftTime(`${event.target.value}:${draftMinute}`)}
                className="h-9 w-full appearance-none bg-transparent px-2 pr-7 text-center font-mono text-sm font-semibold text-[#4A4540] outline-none"
                aria-label="提醒小时（24小时制）"
              >
                {HOUR_OPTIONS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300" />
            </label>
            <span className="font-mono text-sm font-bold text-gray-300" aria-hidden="true">:</span>
            <label className="relative min-w-0 flex-1">
              <select
                value={draftMinute}
                onChange={(event) => setDraftTime(`${draftHour}:${event.target.value}`)}
                className="h-9 w-full appearance-none bg-transparent px-2 pr-7 text-center font-mono text-sm font-semibold text-[#4A4540] outline-none"
                aria-label="提醒分钟"
              >
                {MINUTE_OPTIONS.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300" />
            </label>
          </div>
          <button
            type="button"
            onClick={() => onAddTime(draftTime)}
            disabled={!canAdd}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8FA88B] text-white shadow-sm transition-all hover:bg-[#7D9779] active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
            aria-label="添加提醒时间"
            title="添加提醒时间"
          >
            <Plus size={19} strokeWidth={2.6} />
          </button>
        </div>
        {(isDuplicate || isAtLimit) && (
          <p className="px-5 pb-4 text-[10px] text-gray-400">
            {isAtLimit ? `最多可设置 ${MAX_REMINDER_TIMES} 个提醒时间。` : '这个时间已经添加过了。'}
          </p>
        )}
      </section>

      <p className="px-4 text-center text-[11px] leading-relaxed text-gray-400">
        提醒由手机系统在本地安排，关闭应用后也会生效。
      </p>
    </div>
  );
};
