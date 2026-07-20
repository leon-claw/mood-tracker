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
] as const;

export type RecordFieldId = typeof RECORD_FIELD_IDS[number];

export const DEFAULT_REMINDER_TIME = '21:00';
export const MAX_REMINDER_TIMES = 5;

export interface ReminderPreferences {
  enabled: boolean;
  times: string[];
}

export interface AppPreferences {
  enabledRecordFieldIds: RecordFieldId[];
  reminders: ReminderPreferences;
}

export const createDefaultAppPreferences = (): AppPreferences => ({
  enabledRecordFieldIds: [...RECORD_FIELD_IDS],
  reminders: {
    enabled: false,
    times: [DEFAULT_REMINDER_TIME],
  },
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

export const normalizeAppPreferences = (value: unknown): AppPreferences => {
  if (!isRecord(value)) {
    return createDefaultAppPreferences();
  }

  const requestedIds = new Set(
    Array.isArray(value.enabledRecordFieldIds)
      ? value.enabledRecordFieldIds.filter((fieldId): fieldId is string => typeof fieldId === 'string')
      : RECORD_FIELD_IDS
  );
  const requestedFieldIds = RECORD_FIELD_IDS.filter((fieldId) => requestedIds.has(fieldId));
  const enabledRecordFieldIds = requestedFieldIds.length > 0
    ? requestedFieldIds
    : [...RECORD_FIELD_IDS];

  return {
    enabledRecordFieldIds,
    reminders: normalizeReminderPreferences(value.reminders),
  };
};

export const hasDefaultAppPreferences = (preferences: AppPreferences) =>
  preferences.enabledRecordFieldIds.length === RECORD_FIELD_IDS.length
  && RECORD_FIELD_IDS.every((fieldId, index) => preferences.enabledRecordFieldIds[index] === fieldId)
  && preferences.reminders.enabled === false
  && preferences.reminders.times.length === 1
  && preferences.reminders.times[0] === DEFAULT_REMINDER_TIME;
