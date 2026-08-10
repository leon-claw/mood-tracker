import {
  AutoData,
  AutoScreenTimeData,
  AutoStepsData,
  AutoWeatherData,
  ScreenTimeMetric,
} from './types';

const AUTO_MODULE_KEYS = ['steps', 'weather', 'screenTime'] as const;
type AutoModuleKey = (typeof AUTO_MODULE_KEYS)[number];
const SCREEN_TIME_METRICS: ScreenTimeMetric[] = ['screen-interactive', 'foreground-apps'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toFiniteNonNegativeNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const toFiniteNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toNonNegativeInteger = (value: unknown) => {
  const parsed = toFiniteNonNegativeNumber(value);
  return parsed === undefined ? undefined : Math.round(parsed);
};

const isIsoTimestamp = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.includes('T') &&
  !Number.isNaN(Date.parse(value));

const sanitizeSteps = (value: unknown): AutoStepsData | undefined => {
  if (!isRecord(value)) return undefined;
  const count = toNonNegativeInteger(value.count);
  if (
    count === undefined ||
    (value.source !== 'health-connect' && value.source !== 'step-sensor') ||
    !isIsoTimestamp(value.collectedAt) ||
    typeof value.isFinal !== 'boolean'
  ) {
    return undefined;
  }
  return {
    count,
    source: value.source,
    collectedAt: value.collectedAt,
    isFinal: value.isFinal,
  };
};

const sanitizeWeather = (value: unknown): AutoWeatherData | undefined => {
  if (!isRecord(value)) return undefined;
  const weatherCode = toNonNegativeInteger(value.weatherCode);
  if (
    weatherCode === undefined ||
    value.provider !== 'open-meteo' ||
    !isIsoTimestamp(value.collectedAt)
  ) {
    return undefined;
  }

  const optionalNumber = (key: 'humidityPercent' | 'precipitationMm') => {
    if (value[key] === undefined || value[key] === null || value[key] === '') return undefined;
    return toFiniteNonNegativeNumber(value[key]);
  };

  const optionalTemperature = (key: 'temperatureC' | 'temperatureMaxC' | 'temperatureMinC') => {
    if (value[key] === undefined || value[key] === null || value[key] === '') return undefined;
    if (typeof value[key] !== 'number' && typeof value[key] !== 'string') return undefined;
    return toFiniteNumber(value[key]);
  };

  const temperatureC = optionalTemperature('temperatureC');
  const temperatureMaxC = optionalTemperature('temperatureMaxC');
  const temperatureMinC = optionalTemperature('temperatureMinC');
  if (
    (value.temperatureC !== undefined && value.temperatureC !== null && value.temperatureC !== '' && temperatureC === undefined) ||
    (value.temperatureMaxC !== undefined && value.temperatureMaxC !== null && value.temperatureMaxC !== '' && temperatureMaxC === undefined) ||
    (value.temperatureMinC !== undefined && value.temperatureMinC !== null && value.temperatureMinC !== '' && temperatureMinC === undefined)
  ) {
    return undefined;
  }

  const humidity = optionalNumber('humidityPercent');
  const precipitationMm = optionalNumber('precipitationMm');
  if (
    (value.humidityPercent !== undefined && value.humidityPercent !== null && value.humidityPercent !== '' && humidity === undefined) ||
    (value.precipitationMm !== undefined && value.precipitationMm !== null && value.precipitationMm !== '' && precipitationMm === undefined)
  ) {
    return undefined;
  }

  return {
    weatherCode,
    ...(temperatureC === undefined ? {} : { temperatureC }),
    ...(temperatureMaxC === undefined ? {} : { temperatureMaxC }),
    ...(temperatureMinC === undefined ? {} : { temperatureMinC }),
    ...(humidity === undefined ? {} : { humidityPercent: Math.min(100, humidity) }),
    ...(precipitationMm === undefined ? {} : { precipitationMm }),
    provider: 'open-meteo',
    collectedAt: value.collectedAt,
  };
};

const sanitizeScreenTime = (value: unknown): AutoScreenTimeData | undefined => {
  if (!isRecord(value)) return undefined;
  const minutes = toNonNegativeInteger(value.minutes);
  const metric = value.metric === undefined ? 'foreground-apps' : value.metric;
  if (
    minutes === undefined ||
    !SCREEN_TIME_METRICS.includes(metric as ScreenTimeMetric) ||
    !isIsoTimestamp(value.collectedAt) ||
    typeof value.isFinal !== 'boolean'
  ) {
    return undefined;
  }
  return {
    minutes,
    metric: metric as ScreenTimeMetric,
    collectedAt: value.collectedAt,
    isFinal: value.isFinal,
  };
};

const sanitizeModule = (module: AutoModuleKey, value: unknown) => {
  if (module === 'steps') return sanitizeSteps(value);
  if (module === 'weather') return sanitizeWeather(value);
  return sanitizeScreenTime(value);
};

export const sanitizeAutoData = (value: unknown): AutoData | undefined => {
  if (!isRecord(value)) return undefined;
  const result: AutoData = {};
  for (const module of AUTO_MODULE_KEYS) {
    const sanitized = sanitizeModule(module, value[module]);
    if (sanitized) {
      result[module] = sanitized as never;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

export const isAutoData = (value: unknown): value is AutoData =>
  sanitizeAutoData(value) !== undefined;

export const mergeAutoData = (base: AutoData | undefined, incoming: Partial<AutoData> | undefined): AutoData | undefined => {
  const sanitizedBase = sanitizeAutoData(base) ?? {};
  const sanitizedIncoming = sanitizeAutoData(incoming) ?? {};
  const merged = {
    ...sanitizedBase,
    ...sanitizedIncoming,
  };
  return Object.keys(merged).length > 0 ? merged : undefined;
};

export const formatAutoDataDate = (value: Date | string | number = new Date()): string | undefined => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
