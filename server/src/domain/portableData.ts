import { sanitizeServerLogValues, ServerLogValues } from './logValues';

export interface ServerLogEntry {
  id: string;
  date: string;
  values: ServerLogValues;
}

export interface SyncData {
  entries: ServerLogEntry[];
  points: number;
  unlockedItems: string[];
  isPremiumUnlocked: boolean;
}

export interface ExportEnvelope {
  app: 'mood-tracker';
  version: 1;
  exportedAt: string;
  data: SyncData;
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

export const sanitizeLogValues = sanitizeServerLogValues;
export { sanitizeServerLogValues };

export const normalizeSyncData = (value: unknown): SyncData => {
  if (!isRecord(value)) {
    throw new Error('导入文件格式不正确。');
  }

  if (!Array.isArray(value.entries)) {
    throw new Error('导入文件格式不正确：缺少 entries 数组。');
  }

  const entries = value.entries.reduce<ServerLogEntry[]>((result, item, index) => {
    if (!isRecord(item) || !isDateString(item.date) || !isRecord(item.values)) {
      return result;
    }

    result.push({
      id: typeof item.id === 'string' ? item.id : `imported-${item.date}-${index}`,
      date: item.date,
      values: sanitizeServerLogValues(item.values),
    });
    return result;
  }, []);

  return {
    entries,
    points: normalizePoints(value.points),
    unlockedItems: normalizeStringArray(value.unlockedItems),
    isPremiumUnlocked: value.isPremiumUnlocked === true,
  };
};

export const createExportEnvelope = (data: SyncData, now = new Date()): ExportEnvelope => ({
  app: 'mood-tracker',
  version: 1,
  exportedAt: now.toISOString(),
  data,
});

export const parseImportEnvelope = (input: string | unknown): SyncData => {
  let parsed: unknown = input;

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error('无法读取 JSON 文件，请检查文件内容。');
    }
  }

  if (!isRecord(parsed) || parsed.app !== 'mood-tracker' || parsed.version !== 1 || !isRecord(parsed.data)) {
    throw new Error('导入文件格式不正确。');
  }

  return normalizeSyncData(parsed.data);
};
