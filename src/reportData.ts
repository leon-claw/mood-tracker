import { LogEntry } from './types';
import type { YearlyReportData } from './cloudDataStore';

export const MOOD_BUCKETS = [
  { id: 'low', label: '低落', min: 1, max: 2, color: '#BCAFA4', emoji: '😔' },
  { id: 'tired', label: '有些累', min: 3, max: 4, color: '#D48166', emoji: '🙁' },
  { id: 'steady', label: '平稳', min: 5, max: 6, color: '#E6D5B8', emoji: '😐' },
  { id: 'good', label: '不错', min: 7, max: 8, color: '#A9C2A5', emoji: '😄' },
  { id: 'great', label: '很好', min: 9, max: 10, color: '#8FA88B', emoji: '🤩' },
];

const getNumberValue = (entry: LogEntry, field: string) =>
  typeof entry.values[field] === 'number' ? entry.values[field] as number : undefined;

const getStringValue = (entry: LogEntry, field: string) =>
  typeof entry.values[field] === 'string' ? entry.values[field] as string : '';

export const getAvailableReportMonths = (entries: LogEntry[]) => {
  const months = new Map<string, { year: number; month: number }>();

  entries.forEach((entry) => {
    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(entry.date);
    if (!match) return;

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return;
    months.set(`${year}-${String(month).padStart(2, '0')}`, { year, month });
  });

  return [...months.values()].sort((a, b) =>
    (b.year * 12 + b.month) - (a.year * 12 + a.month)
  );
};

export const getMonthEntries = (entries: LogEntry[], year: number, month: number) =>
  entries
    .filter((entry) => {
      const date = new Date(entry.date);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

export const getMoodFlowData = (entries: LogEntry[], year: number, month: number) =>
  getMonthEntries(entries, year, month).reduce<{
    date: string;
    moodLevel: number;
    sleepQuality?: number;
    journal: string;
  }[]>((result, entry) => {
    const moodLevel = getNumberValue(entry, 'moodLevel');
    if (moodLevel === undefined) return result;

    const sleepQuality = getNumberValue(entry, 'sleepQuality');
    result.push({
      date: entry.date,
      moodLevel,
      ...(sleepQuality === undefined ? {} : { sleepQuality }),
      journal: getStringValue(entry, 'journal'),
    });
    return result;
  }, []);

export const getMoodDistributionData = (entries: LogEntry[], year: number, month: number) => {
  const monthEntries = getMonthEntries(entries, year, month)
    .filter((entry) => getNumberValue(entry, 'moodLevel') !== undefined);
  const total = monthEntries.length;

  return MOOD_BUCKETS.map((bucket) => {
    const count = monthEntries.filter((entry) => {
      const moodLevel = getNumberValue(entry, 'moodLevel') || 0;
      return moodLevel >= bucket.min && moodLevel <= bucket.max;
    }).length;

    return {
      ...bucket,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
};

export const getSleepMoodData = (entries: LogEntry[], year: number, month: number) =>
  Array.from({ length: 10 }, (_, index) => {
    const sleepQuality = index + 1;
    const matchingEntries = getMonthEntries(entries, year, month).filter(
      (entry) => getNumberValue(entry, 'sleepQuality') === sleepQuality
        && getNumberValue(entry, 'moodLevel') !== undefined
    );
    const moodTotal = matchingEntries.reduce(
      (sum, entry) => sum + (getNumberValue(entry, 'moodLevel') || 0),
      0
    );

    return {
      sleepQuality,
      count: matchingEntries.length,
      averageMood: matchingEntries.length
        ? Number((moodTotal / matchingEntries.length).toFixed(1))
        : 0,
    };
  });

const average = (values: number[]) => values.length > 0
  ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
  : null;

export const getYearlyReportData = (entries: LogEntry[], year: number): YearlyReportData => ({
  year,
  months: Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthEntries = getMonthEntries(entries, year, month);
    const moodValues = monthEntries
      .map((entry) => getNumberValue(entry, 'moodLevel'))
      .filter((value): value is number => value !== undefined);
    const sleepValues = monthEntries
      .map((entry) => getNumberValue(entry, 'sleepQuality'))
      .filter((value): value is number => value !== undefined);
    return {
      month,
      entryCount: monthEntries.length,
      averageMood: average(moodValues),
      averageSleepQuality: average(sleepValues),
    };
  }),
});
