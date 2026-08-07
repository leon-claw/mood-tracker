import { mergeAutoData, sanitizeAutoData } from './autoData';
import { createLogEntry } from './logEntry';
import { AutoData, AutoModuleId, LogEntry, LogValues } from './types';
import { AutoDataFieldId, PendingAutoData } from './autoDataBridge';

const FIELD_TO_MODULE: Record<AutoDataFieldId, AutoModuleId> = {
  autoSteps: 'steps',
  autoWeather: 'weather',
  autoScreenTime: 'screenTime',
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const getModulesToCollect = (enabledFieldIds: readonly string[]): AutoModuleId[] => {
  const modules: AutoModuleId[] = [];
  const seen = new Set<AutoModuleId>();
  enabledFieldIds.forEach((fieldId) => {
    const module = FIELD_TO_MODULE[fieldId as AutoDataFieldId];
    if (module && !seen.has(module)) {
      seen.add(module);
      modules.push(module);
    }
  });
  return modules;
};

const enabledModules = (enabledFieldIds: readonly string[]) =>
  new Set(getModulesToCollect(enabledFieldIds));

const filterEnabledAutoData = (autoData: unknown, enabledFieldIds: readonly string[]): AutoData | undefined => {
  const sanitized = sanitizeAutoData(autoData);
  if (!sanitized) return undefined;
  const allowed = enabledModules(enabledFieldIds);
  const filtered: AutoData = {};
  if (allowed.has('steps') && sanitized.steps) filtered.steps = sanitized.steps;
  if (allowed.has('weather') && sanitized.weather) filtered.weather = sanitized.weather;
  if (allowed.has('screenTime') && sanitized.screenTime) filtered.screenTime = sanitized.screenTime;
  return Object.keys(filtered).length > 0 ? filtered : undefined;
};

export const mergePendingAutoDataIntoEntries = (
  entries: readonly LogEntry[],
  pending: readonly PendingAutoData[],
  enabledFieldIds: readonly string[],
): LogEntry[] => {
  const nextByDate = new Map(entries.map((entry) => [entry.date, entry]));

  pending.forEach((item) => {
    if (!DATE_PATTERN.test(item.date)) return;
    const autoData = filterEnabledAutoData(item.autoData, enabledFieldIds);
    if (!autoData) return;

    const existing = nextByDate.get(item.date);
    if (existing) {
      const mergedAutoData = mergeAutoData(existing.autoData, autoData);
      nextByDate.set(item.date, {
        ...existing,
        ...(mergedAutoData ? { autoData: mergedAutoData } : {}),
      });
      return;
    }

    nextByDate.set(item.date, createLogEntry(item.date, {}, autoData));
  });

  return [...nextByDate.values()].sort((left, right) => left.date.localeCompare(right.date));
};

export const hasManualLogValues = (values: LogValues): boolean =>
  Object.values(values).some((value) => {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return value.trim().length > 0;
    return Array.isArray(value) && value.length > 0;
  });

