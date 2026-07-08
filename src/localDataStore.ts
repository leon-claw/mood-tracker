import { AppExportData } from './dataPortability';
import { ENTRY_STORAGE_KEY, isLegacyDemoEntries } from './logEntry';

export const POINTS_STORAGE_KEY = 'mood_tracker_points';
export const UNLOCKED_STORAGE_KEY = 'mood_tracker_unlocked';
export const PREMIUM_STORAGE_KEY = 'mood_tracker_premium';

const readJsonArray = <Item>(key: string, fallback: Item[]): Item[] => {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const readEntries = () => {
  const saved = localStorage.getItem(ENTRY_STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    if (isLegacyDemoEntries(parsed)) {
      localStorage.removeItem(ENTRY_STORAGE_KEY);
      return [];
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const readLocalAppData = (): AppExportData => ({
  entries: readEntries(),
  points: Number.parseInt(localStorage.getItem(POINTS_STORAGE_KEY) || '0', 10) || 0,
  unlockedItems: readJsonArray<string>(UNLOCKED_STORAGE_KEY, []),
  isPremiumUnlocked: localStorage.getItem(PREMIUM_STORAGE_KEY) === 'true',
});

export const writeLocalAppData = (data: AppExportData) => {
  localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(data.entries));
  localStorage.setItem(POINTS_STORAGE_KEY, String(Math.max(0, Math.round(data.points || 0))));
  localStorage.setItem(UNLOCKED_STORAGE_KEY, JSON.stringify(data.unlockedItems || []));
  localStorage.setItem(PREMIUM_STORAGE_KEY, data.isPremiumUnlocked ? 'true' : 'false');
};

export const clearLocalAppData = () => {
  localStorage.removeItem(ENTRY_STORAGE_KEY);
  localStorage.removeItem(POINTS_STORAGE_KEY);
  localStorage.removeItem(UNLOCKED_STORAGE_KEY);
  localStorage.removeItem(PREMIUM_STORAGE_KEY);
};

export const hasLocalBusinessData = () => {
  const data = readLocalAppData();
  return (
    data.entries.length > 0 ||
    data.points > 0 ||
    data.unlockedItems.length > 0 ||
    data.isPremiumUnlocked
  );
};
