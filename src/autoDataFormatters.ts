import {
  AutoModuleId,
  AutoScreenTimeData,
  AutoStepsData,
  AutoWeatherData,
} from './types';

const WEATHER_LABELS: Record<number, string> = {
  0: '晴',
  1: '大部晴朗',
  2: '局部多云',
  3: '阴',
  45: '雾',
  48: '雾凇',
  51: '毛毛雨',
  53: '毛毛雨',
  55: '毛毛雨',
  56: '冻毛毛雨',
  57: '冻毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '冻雨',
  67: '冻雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '阵雨',
  81: '阵雨',
  82: '强阵雨',
  85: '阵雪',
  86: '强阵雪',
  95: '雷雨',
  96: '雷雨伴冰雹',
  99: '雷雨伴冰雹',
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);

export const formatSteps = (data: AutoStepsData | undefined) =>
  data ? `${formatNumber(data.count)} 步` : '--';

export const formatWeather = (data: AutoWeatherData | undefined) => {
  if (!data) return '--';
  const label = WEATHER_LABELS[data.weatherCode] || '天气';
  const hasDailyRange = data.temperatureMaxC !== undefined || data.temperatureMinC !== undefined;
  if (!hasDailyRange) {
    const temperature = data.temperatureC === undefined ? '--' : `${formatNumber(data.temperatureC)}°C`;
    return `${label} · ${temperature}`;
  }

  const maximum = data.temperatureMaxC === undefined ? '--' : `${formatNumber(data.temperatureMaxC)}°C`;
  const minimum = data.temperatureMinC === undefined ? '--' : `${formatNumber(data.temperatureMinC)}°C`;
  return `${label} · 最高 ${maximum} / 最低 ${minimum}`;
};

export const formatScreenTime = (data: AutoScreenTimeData | undefined) => {
  if (!data) return '--';
  const hours = Math.floor(data.minutes / 60);
  const minutes = data.minutes % 60;
  if (hours === 0) return `${minutes}分钟`;
  if (minutes === 0) return `${hours}小时`;
  return `${hours}小时${minutes}分钟`;
};

export const formatAutomaticField = (
  module: AutoModuleId,
  data: AutoStepsData | AutoWeatherData | AutoScreenTimeData | undefined,
) => {
  if (module === 'steps') return formatSteps(data as AutoStepsData | undefined);
  if (module === 'weather') return formatWeather(data as AutoWeatherData | undefined);
  return formatScreenTime(data as AutoScreenTimeData | undefined);
};
