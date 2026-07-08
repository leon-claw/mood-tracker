import { LogEntry } from './types';

export const MOOD_BUCKETS = [
  { id: 'low', label: '低落', min: 1, max: 2, color: '#BCAFA4', emoji: '😔' },
  { id: 'tired', label: '有些累', min: 3, max: 4, color: '#D48166', emoji: '🙁' },
  { id: 'steady', label: '平稳', min: 5, max: 6, color: '#E6D5B8', emoji: '😐' },
  { id: 'good', label: '不错', min: 7, max: 8, color: '#A9C2A5', emoji: '😄' },
  { id: 'great', label: '很好', min: 9, max: 10, color: '#8FA88B', emoji: '🤩' },
];

const getNumberValue = (entry: LogEntry, field: string) =>
  typeof entry.values[field] === 'number' ? entry.values[field] as number : 0;

const getStringValue = (entry: LogEntry, field: string) =>
  typeof entry.values[field] === 'string' ? entry.values[field] as string : '';

export const getMonthEntries = (entries: LogEntry[], year: number, month: number) =>
  entries
    .filter((entry) => {
      const date = new Date(entry.date);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

export const getMoodFlowData = (entries: LogEntry[], year: number, month: number) =>
  getMonthEntries(entries, year, month).map((entry) => ({
    date: entry.date,
    moodLevel: getNumberValue(entry, 'moodLevel'),
    sleepQuality: getNumberValue(entry, 'sleepQuality'),
    journal: getStringValue(entry, 'journal'),
  }));

export const getMoodDistributionData = (entries: LogEntry[], year: number, month: number) => {
  const monthEntries = getMonthEntries(entries, year, month);
  const total = monthEntries.length;

  return MOOD_BUCKETS.map((bucket) => {
    const count = monthEntries.filter((entry) => {
      const moodLevel = getNumberValue(entry, 'moodLevel');
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
    );
    const moodTotal = matchingEntries.reduce(
      (sum, entry) => sum + getNumberValue(entry, 'moodLevel'),
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
