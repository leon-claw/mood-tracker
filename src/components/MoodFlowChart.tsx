import React, { useMemo } from 'react';
import { LogEntry } from '../types';
import { buildMoodFlowOption } from './chartOptions';
import { EChartView } from './EChartView';

interface MoodFlowChartProps {
  entries: LogEntry[];
  selectedYear: number;
  selectedMonth: number;
}

export const MoodFlowChart: React.FC<MoodFlowChartProps> = ({ entries, selectedYear, selectedMonth }) => {
  const monthEntries = useMemo(() => {
    return entries.filter((entry) => {
      const date = new Date(entry.date);
      return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
    });
  }, [entries, selectedYear, selectedMonth]);
  const hasMoodData = monthEntries.some((entry) => typeof entry.values.moodLevel === 'number');

  const option = useMemo(
    () => buildMoodFlowOption(entries, selectedYear, selectedMonth),
    [entries, selectedYear, selectedMonth]
  );

  return (
    <div id="mood-flow-card" className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/60">
      <h3 id="mood-flow-title" className="text-gray-800 text-lg font-medium mb-4 flex items-center gap-2">
        <span>心情流</span>
      </h3>

      <div className="relative w-full">
        <EChartView option={option} />

        {!hasMoodData && (
          <div id="no-data-alert" className="absolute inset-0 flex flex-col items-center justify-center bg-white/65">
            <span className="text-3xl mb-1">🌱</span>
            <p className="text-xs text-gray-400">本月暂无心情记录，点击下方“+”记录吧</p>
          </div>
        )}
      </div>
    </div>
  );
};
