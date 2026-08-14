import React from 'react';
import { ChevronLeft, Moon, Search, Smile, Trash2 } from 'lucide-react';
import { getActivityOption } from '../fieldSchema';
import { LogEntry } from '../types';

export interface LogHistoryPageProps {
  entries: LogEntry[];
  searchQuery: string;
  selectedMoodFilter: number | null;
  onSearchQueryChange: (query: string) => void;
  onMoodFilterChange: (mood: number | null) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const getOptionalNumber = (value: unknown) => typeof value === 'number' ? value : null;
const formatScaleValue = (value: number | null) => value === null ? '未记录' : `${value}/10`;

export const LogHistoryPage: React.FC<LogHistoryPageProps> = ({
  entries,
  searchQuery,
  selectedMoodFilter,
  onSearchQueryChange,
  onMoodFilterChange,
  onDelete,
  onBack,
}) => {
  const filteredEntries = entries
    .filter((entry) => {
      const journal = typeof entry.values.journal === 'string' ? entry.values.journal : '';
      const moodLevel = getOptionalNumber(entry.values.moodLevel);
      const matchesSearch = journal.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMood = selectedMoodFilter === null || moodLevel === selectedMoodFilter;
      return matchesSearch && matchesMood;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div id="log-history-pane" className="flex flex-col gap-4 pb-12">
      <div className="flex items-start justify-between gap-3">
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
            <h2 className="text-xl font-bold text-[#4A4540]">日志历史</h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">查看和搜索过去的记录</p>
          </div>
        </div>
        <span className="mt-1 shrink-0 rounded-full bg-[#E6F0E6] px-2.5 py-1 text-xs font-semibold text-[#8FA88B]">
          共 {entries.length} 条
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#F2EDE9] bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="搜索日志备注内容..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="w-full rounded-xl border border-gray-100/50 bg-gray-50 py-2 pl-9 pr-4 text-xs outline-none focus:border-[#8FA88B] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="shrink-0 text-[10px] font-semibold uppercase text-gray-400">心情筛选</span>
          <button
            type="button"
            onClick={() => onMoodFilterChange(null)}
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${
              selectedMoodFilter === null
                ? 'bg-[#8FA88B] text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => onMoodFilterChange(score)}
              className={`flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-medium transition-colors ${
                selectedMoodFilter === score
                  ? 'bg-[#8FA88B] font-semibold text-white shadow-xs'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span>{score}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-3">
        {filteredEntries.map((entry) => {
          const moodLevel = getOptionalNumber(entry.values.moodLevel);
          const sleepQuality = getOptionalNumber(entry.values.sleepQuality);
          const activities = Array.isArray(entry.values.activities) ? entry.values.activities as string[] : [];
          const journal = typeof entry.values.journal === 'string' ? entry.values.journal : '';

          return (
            <div
              key={entry.id}
              className="relative flex flex-col gap-3 rounded-3xl border border-gray-100/60 bg-white p-5 shadow-xs transition-shadow duration-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-gray-400">{entry.date}</span>
                  {moodLevel !== null && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E6F0E6] text-[#8FA88B] shadow-inner">
                        <Smile size={15} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">心情 {formatScaleValue(moodLevel)}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(entry.id)}
                  className="rounded-full bg-rose-50 p-1.5 text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-600"
                  title="删除记录"
                  aria-label="删除记录"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {(sleepQuality !== null || moodLevel !== null) && (
                <div
                  className={`grid ${
                    sleepQuality !== null && moodLevel !== null ? 'grid-cols-2' : 'grid-cols-1'
                  } gap-2 rounded-2xl bg-gray-50/50 p-2.5 text-xs text-gray-500`}
                >
                  {sleepQuality !== null && (
                    <div className="flex items-center gap-1">
                      <Moon size={12} className="text-indigo-400" />
                      <span>睡眠质量：<strong className="text-gray-700">{formatScaleValue(sleepQuality)}</strong></span>
                    </div>
                  )}
                  {moodLevel !== null && (
                    <div className="flex items-center gap-1">
                      <Smile size={12} className="text-[#8FA88B]" />
                      <span>心情：<strong className="text-gray-700">{formatScaleValue(moodLevel)}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {activities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {activities.map((activityId) => {
                    const activity = getActivityOption(activityId);
                    if (!activity) return null;
                    return (
                      <span
                        key={activityId}
                        className="flex items-center gap-0.5 rounded-md border border-gray-100/30 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600"
                      >
                        <span>{activity.emoji}</span>
                        <span>{activity.label}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {journal && (
                <p className="rounded-r-lg border-l-2 border-[#8FA88B] bg-[#E6F0E6]/20 py-0.5 pl-2.5 text-xs font-normal italic leading-relaxed text-gray-600">
                  &ldquo;{journal}&rdquo;
                </p>
              )}
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="mb-2 text-4xl">🌱</span>
            <h3 className="font-semibold text-gray-600">还没有任何打卡记录</h3>
            <p className="mt-1 max-w-[210px] text-xs text-gray-400">
              点击下方中间的绿色按钮，记录下你的第一篇心情吧。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
