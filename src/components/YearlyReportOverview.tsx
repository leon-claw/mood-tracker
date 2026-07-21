import { useMemo } from 'react';
import type { YearlyReportData } from '../cloudDataStore';
import { buildYearlyOverviewOption } from './chartOptions';
import { EChartView } from './EChartView';

interface YearlyReportOverviewProps {
  report: YearlyReportData;
}

export const YearlyReportOverview = ({ report }: YearlyReportOverviewProps) => {
  const option = useMemo(() => buildYearlyOverviewOption(report), [report]);
  const recordedDays = report.months.reduce((total, month) => total + month.entryCount, 0);
  const activeMonths = report.months.filter((month) => month.entryCount > 0).length;

  return (
    <div id="yearly-report-overview" className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/60">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-gray-800 text-lg font-medium">年度状态</h3>
          <p className="mt-1 text-[11px] text-gray-400">按月汇总心情、睡眠质量与记录天数</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#E6F0E6] px-2.5 py-1 text-[10px] font-bold text-[#6E876B]">
          {report.year}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl bg-[#E6F0E6]/45 px-4 py-3">
          <span className="text-[10px] font-bold text-gray-400">全年记录</span>
          <div className="mt-1 font-mono text-xl font-bold text-[#8FA88B]">{recordedDays}<span className="ml-1 text-xs">天</span></div>
        </div>
        <div className="rounded-2xl bg-[#FAF0ED]/55 px-4 py-3">
          <span className="text-[10px] font-bold text-gray-400">活跃月份</span>
          <div className="mt-1 font-mono text-xl font-bold text-[#D48166]">{activeMonths}<span className="ml-1 text-xs">个月</span></div>
        </div>
      </div>

      <EChartView option={option} className="h-[210px] w-full" />
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#8FA88B]" />平均心情</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#8799C6]" />睡眠质量</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#E6D5B8]" />记录天数</span>
      </div>
    </div>
  );
};
