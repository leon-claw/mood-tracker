export interface YearMonth {
  year: number;
  month: number;
}

export interface CurrentDateContext extends YearMonth {
  date: string;
}

const padDatePart = (value: number) => String(value).padStart(2, '0');

export const formatLocalDate = (date: Date = new Date()) => (
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
);

export const getCurrentDateContext = (date: Date = new Date()): CurrentDateContext => ({
  date: formatLocalDate(date),
  year: date.getFullYear(),
  month: date.getMonth() + 1,
});
