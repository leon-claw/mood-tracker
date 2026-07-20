import { randomUUID } from 'node:crypto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isDatabaseEntryId = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

export const normalizeDatabaseEntryId = (value: unknown) =>
  isDatabaseEntryId(value) ? value : randomUUID();
