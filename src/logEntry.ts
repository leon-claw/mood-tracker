import { LogEntry, LogValues } from './types';
import {
  ACHIEVEMENT_MILESTONE_OPTIONS,
  ACTIVITY_OPTIONS,
  SOCIAL_OPTIONS,
  WEATHER_OPTIONS,
} from './fieldSchema';

export const ENTRY_STORAGE_KEY = 'mood_tracker_entries_v4';
const SCALE_FIELD_IDS = ['sleepQuality', 'moodLevel', 'energyLevel', 'dietHealth', 'workEfficiency'] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isLogEntryId = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

export const createLogEntryId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
};

export const normalizeLogEntryId = (value: unknown) =>
  isLogEntryId(value) ? value : createLogEntryId();

export const normalizeScaleValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(10, Math.max(1, Math.round(parsed)));
};

export const createDefaultLogValues = (): LogValues => ({
  activities: [],
  weather: [],
  social: [],
  achievementMilestones: [],
  journal: '',
  achievement: '',
});

const filterEnumValues = (value: unknown, options: { id: string }[]) => {
  const allowed = new Set(options.map((option) => option.id));
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && allowed.has(item))
    : [];
};

export const sanitizeLogValues = (values: Partial<LogValues>): LogValues => ({
  ...SCALE_FIELD_IDS.reduce<LogValues>((result, fieldId) => {
    const normalized = normalizeScaleValue(values[fieldId]);
    if (normalized !== undefined) {
      result[fieldId] = normalized;
    }
    return result;
  }, {}),
  activities: filterEnumValues(values.activities, ACTIVITY_OPTIONS),
  weather: filterEnumValues(values.weather, WEATHER_OPTIONS),
  social: filterEnumValues(values.social, SOCIAL_OPTIONS),
  achievementMilestones: filterEnumValues(values.achievementMilestones, ACHIEVEMENT_MILESTONE_OPTIONS),
  journal: typeof values.journal === 'string' ? values.journal.trim() : '',
  achievement: typeof values.achievement === 'string' ? values.achievement.trim() : '',
});

export const createLogEntry = (date: string, values: Partial<LogValues>): LogEntry => ({
  id: createLogEntryId(),
  date,
  values: sanitizeLogValues(values),
});

const legacyDemoFingerprints = [
  '1|2026-06-01|8|7|running',
  '2|2026-06-02|6|6|fitness',
  '3|2026-06-03|4|3|other',
  '4|2026-06-04|9|8|hiking',
  '5|2026-06-05|7|8|swimming',
  '6|2026-06-06|5|5|other',
  '7|2026-06-07|8|9|hiking,fitness',
  '8|2026-06-08|6|7|running,other',
];

const getEntryFingerprint = (entry: LogEntry) => {
  const activities = Array.isArray(entry.values.activities)
    ? entry.values.activities.join(',')
    : '';
  return [
    entry.id,
    entry.date,
    entry.values.moodLevel,
    entry.values.sleepQuality,
    activities,
  ].join('|');
};

export const isLegacyDemoEntries = (entries: unknown): entries is LogEntry[] => {
  if (!Array.isArray(entries) || entries.length !== legacyDemoFingerprints.length) {
    return false;
  }

  return entries.every((entry, index) => {
    if (!entry || typeof entry !== 'object' || !('values' in entry)) {
      return false;
    }
    return getEntryFingerprint(entry as LogEntry) === legacyDemoFingerprints[index];
  });
};
