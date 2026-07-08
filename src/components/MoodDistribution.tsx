import React, { useMemo } from 'react';
import { getMoodDistributionData } from '../reportData';
import { LogEntry } from '../types';

interface MoodDistributionProps {
  entries: LogEntry[];
  selectedYear: number;
  selectedMonth: number;
}

export const MoodDistribution: React.FC<MoodDistributionProps> = ({ entries, selectedYear, selectedMonth }) => {
  const distribution = useMemo(
    () => getMoodDistributionData(entries, selectedYear, selectedMonth),
    [entries, selectedYear, selectedMonth]
  );
  const totalEntriesCount = distribution.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <div id="mood-distribution-card" className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/60">
      <h3 id="mood-distribution-title" className="text-gray-800 text-lg font-medium mb-5">心情分布</h3>

      {totalEntriesCount > 0 ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-5 gap-1 justify-items-center">
            {distribution.map((bucket) => {
              const isActive = bucket.count > 0;
              return (
                <div key={bucket.id} className="flex flex-col items-center gap-2 group cursor-default">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
                      isActive
                        ? 'scale-110 shadow-sm border'
                        : 'opacity-40 filter grayscale hover:grayscale-0 hover:opacity-80 hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: isActive ? bucket.color : '#f1f3f0',
                      borderColor: isActive ? 'rgba(255,255,255,0.8)' : 'transparent',
                    }}
                  >
                    <span className="transform group-hover:scale-110 transition-transform">{bucket.emoji}</span>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                      isActive
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-400 bg-gray-50'
                    }`}
                  >
                    {bucket.percentage}%
                  </span>

                  <span className="text-[10px] text-gray-400 font-normal">
                    {bucket.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
            {distribution.map((bucket) => {
              if (bucket.percentage === 0) return null;
              return (
                <div
                  key={bucket.id}
                  style={{
                    width: `${bucket.percentage}%`,
                    backgroundColor: bucket.color,
                  }}
                  className="h-full transition-all duration-500 hover:brightness-95 cursor-pointer relative group"
                  title={`${bucket.label}: ${bucket.percentage}%`}
                >
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {bucket.label}: {bucket.percentage}% ({bucket.count}天)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6">
          <span className="text-3xl mb-1">🎭</span>
          <p className="text-xs text-gray-400">暂无心情分布数据，开始记录今日心情吧</p>
        </div>
      )}
    </div>
  );
};
