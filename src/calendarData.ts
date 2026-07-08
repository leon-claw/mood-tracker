import { LogEntry } from './types';

export type CalendarCell =
  | { kind: 'blank'; key: string }
  | { kind: 'day'; key: string; date: string; day: number };

export interface CalendarMonthSummary {
  loggedDays: number;
  averageMood: number | null;
}

export const toDateString = (year: number, month: number, day: number) => {
  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
};

export const buildMonthGrid = (year: number, month: number): CalendarCell[] => {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
  const cells: CalendarCell[] = [];

  for (let index = 0; index < mondayFirstOffset; index++) {
    cells.push({ kind: 'blank', key: `blank-start-${index}` });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = toDateString(year, month, day);
    cells.push({ kind: 'day', key: date, date, day });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ kind: 'blank', key: `blank-end-${cells.length}` });
  }

  return cells;
};

export const buildEntriesByDate = (entries: LogEntry[]) =>
  entries.reduce<Record<string, LogEntry>>((acc, entry) => {
    acc[entry.date] = entry;
    return acc;
  }, {});

export const getCalendarMonthSummary = (
  entries: LogEntry[],
  year: number,
  month: number
): CalendarMonthSummary => {
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;
  const monthEntries = entries.filter((entry) => entry.date.startsWith(monthPrefix));
  const moodValues = monthEntries
    .map((entry) => entry.values.moodLevel)
    .filter((value): value is number => typeof value === 'number');

  if (moodValues.length === 0) {
    return {
      loggedDays: monthEntries.length,
      averageMood: null,
    };
  }

  const totalMood = moodValues.reduce((sum, value) => sum + value, 0);

  return {
    loggedDays: monthEntries.length,
    averageMood: Math.round(totalMood / moodValues.length),
  };
};
