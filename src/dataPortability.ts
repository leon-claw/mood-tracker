import { sanitizeLogValues } from './logEntry';
import { LogEntry, LogValues } from './types';

export interface AppExportData {
  entries: LogEntry[];
  points: number;
  unlockedItems: string[];
  isPremiumUnlocked: boolean;
}

interface ExportEnvelope {
  app: 'mood-tracker';
  version: 1;
  exportedAt: string;
  data: AppExportData;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isDateString = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizePoints = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const normalizeEntries = (value: unknown): LogEntry[] => {
  if (!Array.isArray(value)) {
    throw new Error('导入文件格式不正确：缺少 entries 数组。');
  }

  return value.reduce<LogEntry[]>((result, item, index) => {
    if (!isRecord(item) || !isDateString(item.date) || !isRecord(item.values)) {
      return result;
    }

    result.push({
      id: typeof item.id === 'string' ? item.id : `imported-${item.date}-${index}`,
      date: item.date,
      values: sanitizeLogValues(item.values as Partial<LogValues>),
    });
    return result;
  }, []);
};

export const createExportJson = (data: AppExportData) => {
  const envelope: ExportEnvelope = {
    app: 'mood-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };

  return JSON.stringify(envelope, null, 2);
};

export const parseImportJson = (json: string): AppExportData => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('无法读取 JSON 文件，请检查文件内容。');
  }

  if (!isRecord(parsed) || !isRecord(parsed.data)) {
    throw new Error('导入文件格式不正确。');
  }

  return {
    entries: normalizeEntries(parsed.data.entries),
    points: normalizePoints(parsed.data.points),
    unlockedItems: normalizeStringArray(parsed.data.unlockedItems),
    isPremiumUnlocked: parsed.data.isPremiumUnlocked === true,
  };
};
