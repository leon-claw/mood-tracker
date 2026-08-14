export const RECORD_FIELD_IDS = [
  'sleepQuality',
  'moodLevel',
  'energyLevel',
  'dietHealth',
  'workEfficiency',
  'activities',
  'weather',
  'social',
  'achievementMilestones',
  'journal',
  'achievement',
  'autoSteps',
  'autoWeather',
  'autoScreenTime',
] as const;

export const DEFAULT_ENABLED_RECORD_FIELD_IDS = RECORD_FIELD_IDS.filter(
  (fieldId) => !fieldId.startsWith('auto')
);

export type RecordFieldId = typeof RECORD_FIELD_IDS[number];

export const DEFAULT_REMINDER_TIME = '21:00';
export const MAX_REMINDER_TIMES = 5;

export interface ReminderPreferences {
  enabled: boolean;
  times: string[];
}

export interface LlmProfile {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface LlmPreferences {
  profiles: LlmProfile[];
  activeProfileId: string | null;
}

export interface AppPreferences {
  enabledRecordFieldIds: RecordFieldId[];
  reminders: ReminderPreferences;
  llm: LlmPreferences;
}

export const createDefaultLlmPreferences = (): LlmPreferences => ({
  profiles: [],
  activeProfileId: null,
});

export const createLlmProfileId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `llm-${crypto.randomUUID()}`;
  }
  return `llm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const createDefaultAppPreferences = (): AppPreferences => ({
  enabledRecordFieldIds: [...DEFAULT_ENABLED_RECORD_FIELD_IDS],
  reminders: {
    enabled: false,
    times: [DEFAULT_REMINDER_TIME],
  },
  llm: createDefaultLlmPreferences(),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isReminderTime = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

const normalizeReminderPreferences = (value: unknown): ReminderPreferences => {
  if (!isRecord(value) || !Array.isArray(value.times)) {
    return createDefaultAppPreferences().reminders;
  }

  const times = [...new Set(value.times.filter(isReminderTime))]
    .sort()
    .slice(0, MAX_REMINDER_TIMES);

  return {
    enabled: value.enabled === true && times.length > 0,
    times,
  };
};

const normalizeLlmProfile = (value: unknown, fallbackId: string, fallbackName: string): LlmProfile | null => {
  if (!isRecord(value)) return null;

  const baseUrl = typeof value.baseUrl === 'string' ? value.baseUrl.trim().replace(/\/+$/, '') : '';
  const model = typeof value.model === 'string' ? value.model.trim() : '';
  const apiKey = typeof value.apiKey === 'string' ? value.apiKey.trim() : '';
  const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : fallbackId;
  const name = typeof value.name === 'string' && value.name.trim()
    ? value.name.trim()
    : (model || fallbackName);

  return { id, name, baseUrl, model, apiKey };
};

const normalizeLlmPreferences = (value: unknown): LlmPreferences => {
  if (!isRecord(value)) return createDefaultLlmPreferences();

  const profiles: LlmProfile[] = [];
  const seenIds = new Set<string>();
  const rawProfiles = Array.isArray(value.profiles) ? value.profiles : [];

  rawProfiles.forEach((profile, index) => {
    const normalized = normalizeLlmProfile(profile, `llm-${index + 1}`, `配置 ${index + 1}`);
    if (!normalized || seenIds.has(normalized.id)) return;
    seenIds.add(normalized.id);
    profiles.push(normalized);
  });

  if (profiles.length === 0 && (
    typeof value.baseUrl === 'string' ||
    typeof value.model === 'string' ||
    typeof value.apiKey === 'string'
  )) {
    const legacy = normalizeLlmProfile(value, 'legacy-llm', '默认配置');
    if (legacy && (legacy.baseUrl || legacy.model || legacy.apiKey)) profiles.push(legacy);
  }

  const requestedActiveId = typeof value.activeProfileId === 'string' ? value.activeProfileId : null;
  const activeProfileId = requestedActiveId && profiles.some((profile) => profile.id === requestedActiveId)
    ? requestedActiveId
    : (profiles[0]?.id || null);

  return { profiles, activeProfileId };
};

export const getActiveLlmProfile = (preferences: LlmPreferences): LlmProfile | null =>
  preferences.profiles.find((profile) => profile.id === preferences.activeProfileId)
    || preferences.profiles[0]
    || null;

export const isLlmConfigured = (settings: LlmProfile | null | undefined) =>
  Boolean(settings?.baseUrl.trim() && settings.model.trim());

export const normalizeAppPreferences = (value: unknown): AppPreferences => {
  if (!isRecord(value)) {
    return createDefaultAppPreferences();
  }

  const requestedIds = new Set(
    Array.isArray(value.enabledRecordFieldIds)
      ? value.enabledRecordFieldIds.filter((fieldId): fieldId is string => typeof fieldId === 'string')
      : DEFAULT_ENABLED_RECORD_FIELD_IDS
  );
  const requestedFieldIds = RECORD_FIELD_IDS.filter((fieldId) => requestedIds.has(fieldId));
  const enabledRecordFieldIds = requestedFieldIds.length > 0
    ? requestedFieldIds
    : [...DEFAULT_ENABLED_RECORD_FIELD_IDS];

  return {
    enabledRecordFieldIds,
    reminders: normalizeReminderPreferences(value.reminders),
    llm: normalizeLlmPreferences(value.llm),
  };
};

export const hasDefaultAppPreferences = (preferences: AppPreferences) =>
  preferences.enabledRecordFieldIds.length === DEFAULT_ENABLED_RECORD_FIELD_IDS.length
  && DEFAULT_ENABLED_RECORD_FIELD_IDS.every((fieldId, index) => preferences.enabledRecordFieldIds[index] === fieldId)
  && preferences.reminders.enabled === false
  && preferences.reminders.times.length === 1
  && preferences.reminders.times[0] === DEFAULT_REMINDER_TIME
  && preferences.llm.profiles.length === 0
  && preferences.llm.activeProfileId === null;
