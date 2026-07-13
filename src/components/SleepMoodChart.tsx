import React, { useMemo } from 'react';
import { LogEntry } from '../types';
import { buildSleepMoodOption } from './chartOptions';
import { EChartView } from './EChartView';

interface SleepMoodChartProps {
  entries: LogEntry[];
  selectedYear: number;
  selectedMonth: number;
}

export const SleepMoodChart: React.FC<SleepMoodChartProps> = ({ entries, selectedYear, selectedMonth }) => {
  const option = useMemo(
    () => buildSleepMoodOption(entries, selectedYear, selectedMonth),
    [entries, selectedYear, selectedMonth]
  );

  return (
    <div id="sleep-mood-chart-card" className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/60">
      <div className="flex justify-between items-center mb-4">
        <h3 id="sleep-mood-title" className="text-gray-800 text-lg font-medium">睡眠质量与心情</h3>
      </div>

      <EChartView option={option} />

      <div id="sleep-insight-text" className="text-center mt-3 text-xs text-gray-400 font-sans leading-relaxed">
        <span>根据数据，睡眠质量越稳定，心情通常也越容易保持在较好的区间。</span>
      </div>
    </div>
  );
};
