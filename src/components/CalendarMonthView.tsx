import React, { useEffect, useMemo, useRef } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildEntriesByDate, buildMonthGrid, getCalendarMonthSummary } from '../calendarData';
import { LogEntry } from '../types';
import { PageTransition } from './PageTransition';
import { SyncStatusIcon } from './SyncFeedback';

interface CalendarMonthViewProps {
  entries: LogEntry[];
  selectedYear: number;
  selectedMonth: number;
  todayDate: string;
  onMonthChange: (year: number, month: number) => void;
  onSelectDate: (date: string) => void;
  isSyncing?: boolean;
}

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

const shiftMonth = (year: number, month: number, delta: number) => {
  const next = new Date(year, month - 1 + delta, 1);
  return {
    year: next.getFullYear(),
    month: next.getMonth() + 1,
  };
};

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  entries,
  selectedYear,
  selectedMonth,
  todayDate,
  onMonthChange,
  onSelectDate,
  isSyncing = false,
}) => {
  const monthGrid = useMemo(
    () => buildMonthGrid(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );
  const entriesByDate = useMemo(() => buildEntriesByDate(entries), [entries]);
  const summary = useMemo(
    () => getCalendarMonthSummary(entries, selectedYear, selectedMonth),
    [entries, selectedYear, selectedMonth]
  );
  const hasRenderedMonthGrid = useRef(false);
  const disableMonthInitialAnimation = !hasRenderedMonthGrid.current;

  useEffect(() => {
    hasRenderedMonthGrid.current = true;
  }, []);

  const handleMonthShift = (delta: number) => {
    const next = shiftMonth(selectedYear, selectedMonth, delta);
    onMonthChange(next.year, next.month);
  };

  return (
    <div id="calendar-view-pane" className="flex flex-col gap-4 pb-12">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h2 className="text-2xl font-bold text-[#4A4540] flex items-center gap-2">
            <CalendarDays size={22} className="text-[#8FA88B]" />
            <span>日历</span>
            <SyncStatusIcon isSyncing={isSyncing} />
          </h2>
          <p className="text-xs text-gray-400 mt-1">按月份回看每一天的心情记录</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-[#F2EDE9] rounded-full p-1 shadow-xs">
          <button
            type="button"
            onClick={() => handleMonthShift(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-[#E6F0E6]/50 hover:text-[#8FA88B] transition-colors"
            aria-label="上个月"
          >
            <ChevronLeft size={17} />
          </button>
          <span className="text-xs font-bold text-[#4A4540] font-mono min-w-20 text-center">
            {selectedYear}.{String(selectedMonth).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => handleMonthShift(1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-[#E6F0E6]/50 hover:text-[#8FA88B] transition-colors"
            aria-label="下个月"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-[#F2EDE9] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">本月记录</span>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-[#8FA88B] font-mono leading-none">{summary.loggedDays}</span>
            <span className="text-xs text-gray-500 font-medium mb-0.5">天</span>
          </div>
        </div>
        <div className="bg-white border border-[#F2EDE9] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">平均心情</span>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-[#D48166] font-mono leading-none">
              {summary.averageMood ?? '--'}
            </span>
            <span className="text-xs text-gray-500 font-medium mb-0.5">/10</span>
          </div>
        </div>
      </div>

      <PageTransition
        key={`${selectedYear}-${selectedMonth}`}
        className="bg-white border border-[#F2EDE9] rounded-3xl p-4 shadow-xs"
        disableInitialAnimation={disableMonthInitialAnimation}
      >
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="h-7 flex items-center justify-center text-[10px] font-bold text-gray-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {monthGrid.map((cell) => {
            if (cell.kind === 'blank') {
              return <div key={cell.key} className="h-14 min-h-14 rounded-2xl bg-gray-50/40" />;
            }

            const entry = entriesByDate[cell.date];
            const isToday = cell.date === todayDate;

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => onSelectDate(cell.date)}
                className={`h-14 min-h-14 rounded-2xl border px-2 py-1.5 flex flex-col items-start justify-between transition-all active:scale-95 ${
                  entry
                    ? 'bg-[#E6F0E6]/55 border-[#C9D9C6] shadow-xs hover:bg-[#E6F0E6]'
                    : 'bg-white border-[#F2EDE9] hover:bg-gray-50'
                } ${isToday ? 'ring-1 ring-[#D48166]/70' : ''}`}
                aria-label={`${cell.date} 记录`}
              >
                <span className={`text-[11px] font-bold font-mono ${entry ? 'text-[#4A4540]' : 'text-gray-400'}`}>
                  {cell.day}
                </span>
                {entry && <span className="w-1.5 h-1.5 rounded-full bg-[#8FA88B] self-end" />}
              </button>
            );
          })}
        </div>
      </PageTransition>
    </div>
  );
};
