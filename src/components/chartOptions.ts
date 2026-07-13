import { getMoodFlowData, getSleepMoodData } from '../reportData';
import { LogEntry } from '../types';

const gridLineColor = '#eef1ee';
const axisLabelColor = '#99a399';
const textColor = '#4A4540';
const sage = '#8FA88B';

type TooltipParam = {
  data?: {
    date?: string;
    moodLevel?: number;
    sleepQuality?: number;
    journal?: string;
    count?: number;
    value?: number | string | Array<number | string>;
  };
};

const getMoodColor = (moodLevel: number) => {
  if (moodLevel >= 9) return '#8FA88B';
  if (moodLevel >= 7) return '#A9C2A5';
  if (moodLevel >= 5) return '#E6D5B8';
  if (moodLevel >= 3) return '#D48166';
  return '#BCAFA4';
};

export const buildMoodFlowOption = (
  entries: LogEntry[],
  selectedYear: number,
  selectedMonth: number
) => {
  const flowData = getMoodFlowData(entries, selectedYear, selectedMonth);

  return {
    animationDuration: 500,
    grid: { left: 34, right: 8, top: 16, bottom: 24 },
    tooltip: {
      trigger: 'item',
      borderWidth: 1,
      borderColor: '#f3f4f2',
      backgroundColor: 'rgba(255,255,255,0.96)',
      extraCssText: 'border-radius:12px;box-shadow:0 12px 28px rgba(74,69,64,0.12);',
      textStyle: { color: textColor, fontSize: 12, fontFamily: 'Inter, sans-serif' },
      formatter: (params: TooltipParam | TooltipParam[]) => {
        const point = Array.isArray(params) ? params[0]?.data : params.data;
        if (!point) return '';
        const journal = point.journal
          ? `<div style="color:#9ca3af;font-style:italic;margin-top:4px;max-width:170px;">"${point.journal}"</div>`
          : '';
        const sleepQuality = typeof point.sleepQuality === 'number' ? `${point.sleepQuality}/10` : '未记录';
        return `<div style="font-weight:600;margin-bottom:4px;">${point.date}</div>
          <div>心情：<b>${point.moodLevel}/10</b></div>
          <div style="color:#6b7280;margin-top:2px;">睡眠质量：<b>${sleepQuality}</b></div>
          ${journal}`;
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: flowData.map((entry) => Number(entry.date.split('-')[2]).toString()),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: axisLabelColor, fontSize: 10, interval: 1 },
      splitLine: { show: true, lineStyle: { color: gridLineColor, type: 'dashed' } },
    },
    yAxis: {
      type: 'value',
      min: 1,
      max: 10,
      interval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: axisLabelColor, fontSize: 10 },
      splitLine: { lineStyle: { color: '#f3f5f3' } },
    },
    series: [
      {
        type: 'line',
        data: flowData.map((entry) => ({
          value: entry.moodLevel,
          ...entry,
          itemStyle: { color: getMoodColor(entry.moodLevel), borderColor: '#ffffff', borderWidth: 2 },
        })),
        lineStyle: { color: sage, width: 2, opacity: 0.7 },
        symbol: 'circle',
        symbolSize: 8,
        emphasis: { scale: 1.45 },
      },
    ],
  };
};

export const buildSleepMoodOption = (
  entries: LogEntry[],
  selectedYear: number,
  selectedMonth: number
) => {
  const sleepMoodData = getSleepMoodData(entries, selectedYear, selectedMonth);

  return {
    animationDuration: 500,
    grid: { left: 34, right: 8, top: 16, bottom: 28 },
    tooltip: {
      trigger: 'item',
      borderWidth: 1,
      borderColor: '#f3f4f2',
      backgroundColor: 'rgba(255,255,255,0.96)',
      extraCssText: 'border-radius:12px;box-shadow:0 12px 28px rgba(74,69,64,0.12);',
      textStyle: { color: textColor, fontSize: 12, fontFamily: 'Inter, sans-serif' },
      formatter: (params: TooltipParam | TooltipParam[]) => {
        const point = Array.isArray(params) ? params[0]?.data : params.data;
        if (!point) return '';
        if (!point.value) {
          return `<div style="font-weight:600;">睡眠质量 ${point.sleepQuality}/10</div><div style="color:#9ca3af;">暂无记录</div>`;
        }
        return `<div style="font-weight:600;margin-bottom:4px;">睡眠质量 ${point.sleepQuality}/10</div>
          <div>平均心情：<b>${point.value}/10</b></div>
          <div style="color:#6b7280;margin-top:2px;">样本：${point.count} 天</div>`;
      },
    },
    xAxis: {
      type: 'category',
      data: sleepMoodData.map((entry) => entry.sleepQuality.toString()),
      axisLine: { lineStyle: { color: '#e0e4e0' } },
      axisTick: { show: false },
      axisLabel: { color: '#788478', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 10,
      interval: 2,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: axisLabelColor, fontSize: 10 },
      splitLine: { lineStyle: { color: '#f3f5f3', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        barWidth: 18,
        data: sleepMoodData.map((entry) => ({
          value: entry.averageMood,
          ...entry,
          itemStyle: {
            color: entry.averageMood ? getMoodColor(entry.averageMood) : '#e0e4e0',
            borderRadius: [6, 6, 6, 6],
            opacity: entry.averageMood ? 1 : 0.45,
          },
        })),
        label: {
          show: true,
          position: 'top',
          color: '#555',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: ({ data: point }: { data: { value: number } }) => (point.value ? `${point.value}` : ''),
        },
      },
    ],
    color: [sage],
  };
};
