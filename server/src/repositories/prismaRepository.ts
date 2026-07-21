import { Prisma, PrismaClient } from '@prisma/client';
import { normalizeSyncData, ServerLogEntry, SyncData } from '../domain/portableData';
import { sanitizeServerLogValues, ServerLogValues } from '../domain/logValues';
import { normalizeDatabaseEntryId } from '../domain/entryId';
import {
  AppRepository,
  BootstrapData,
  EntryMonthSummary,
  UserStateRecord,
  YearlyReportData,
} from './types';
import {
  AppPreferences,
  createDefaultAppPreferences,
  normalizeAppPreferences,
} from '../../../shared/appPreferences';

const dateStringToDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
const dateToDateString = (date: Date) => date.toISOString().slice(0, 10);
const toStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const getMonthBounds = (year: number, month: number) => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 1)),
});
const average = (values: number[]) => values.length > 0
  ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
  : null;

const emptyData = (): SyncData => ({
  entries: [],
  points: 0,
  unlockedItems: [],
  isPremiumUnlocked: false,
  preferences: createDefaultAppPreferences(),
});

export class PrismaRepository implements AppRepository {
  constructor(private prisma: PrismaClient) {}

  async createCaptcha(answerHash: string, expiresAt: Date) {
    return this.prisma.captchaChallenge.create({
      data: { answerHash, expiresAt },
    });
  }

  async findCaptcha(id: string) {
    return this.prisma.captchaChallenge.findUnique({ where: { id } });
  }

  async markCaptchaUsed(id: string) {
    await this.prisma.captchaChallenge.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  async createUser(email: string, passwordHash: string) {
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        state: {
          create: {
            points: 0,
            unlockedItems: [],
            isPremiumUnlocked: false,
            preferences: createDefaultAppPreferences() as unknown as Prisma.InputJsonValue,
          },
        },
      },
    });
    return user;
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updatePassword(userId: string, passwordHash: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async getBootstrapData(userId: string): Promise<BootstrapData> {
    const state = await this.prisma.userState.findUnique({ where: { userId } });
    return {
      points: state?.points || 0,
      unlockedItems: toStringArray(state?.unlockedItems),
      isPremiumUnlocked: state?.isPremiumUnlocked === true,
      preferences: normalizeAppPreferences(state?.preferences),
    };
  }

  async getEntriesByMonth(userId: string, year: number, month: number) {
    const { start, end } = getMonthBounds(year, month);
    const entries = await this.prisma.logEntry.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    });
    return entries.map((entry) => this.toServerEntry(entry));
  }

  async getEntryMonths(userId: string): Promise<EntryMonthSummary[]> {
    return this.prisma.$queryRaw<EntryMonthSummary[]>(Prisma.sql`
      SELECT
        EXTRACT(YEAR FROM "date")::int AS "year",
        EXTRACT(MONTH FROM "date")::int AS "month",
        COUNT(*)::int AS "count"
      FROM "log_entries"
      WHERE "user_id" = ${userId}::uuid
      GROUP BY EXTRACT(YEAR FROM "date"), EXTRACT(MONTH FROM "date")
      ORDER BY EXTRACT(YEAR FROM "date") DESC, EXTRACT(MONTH FROM "date") DESC
    `);
  }

  async getYearlyReport(userId: string, year: number): Promise<YearlyReportData> {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const entries = await this.prisma.logEntry.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    });
    const normalized = entries.map((entry) => this.toServerEntry(entry));
    return {
      year,
      months: Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const monthEntries = normalized.filter((entry) => Number(entry.date.slice(5, 7)) === month);
        const moodValues = monthEntries
          .map((entry) => entry.values.moodLevel)
          .filter((value): value is number => typeof value === 'number');
        const sleepValues = monthEntries
          .map((entry) => entry.values.sleepQuality)
          .filter((value): value is number => typeof value === 'number');
        return {
          month,
          entryCount: monthEntries.length,
          averageMood: average(moodValues),
          averageSleepQuality: average(sleepValues),
        };
      }),
    };
  }

  async getSyncData(userId: string) {
    const [entries, state] = await Promise.all([
      this.prisma.logEntry.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      }),
      this.prisma.userState.findUnique({ where: { userId } }),
    ]);

    return normalizeSyncData({
      entries: entries.map((entry) => this.toServerEntry(entry)),
      points: state?.points || 0,
      unlockedItems: toStringArray(state?.unlockedItems),
      isPremiumUnlocked: state?.isPremiumUnlocked === true,
      preferences: normalizeAppPreferences(state?.preferences),
    });
  }

  async replaceSyncData(userId: string, data: SyncData) {
    const normalized = normalizeSyncData(data);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.logEntry.deleteMany({ where: { userId } });
      if (normalized.entries.length > 0) {
        await transaction.logEntry.createMany({
          data: normalized.entries.map((entry) => ({
            id: normalizeDatabaseEntryId(entry.id),
            userId,
            date: dateStringToDate(entry.date),
            values: entry.values as Prisma.InputJsonValue,
          })),
        });
      }
      await transaction.userState.upsert({
        where: { userId },
        update: {
          points: normalized.points,
          unlockedItems: normalized.unlockedItems,
          isPremiumUnlocked: normalized.isPremiumUnlocked,
          preferences: normalized.preferences as unknown as Prisma.InputJsonValue,
        },
        create: {
          userId,
          points: normalized.points,
          unlockedItems: normalized.unlockedItems,
          isPremiumUnlocked: normalized.isPremiumUnlocked,
          preferences: normalized.preferences as unknown as Prisma.InputJsonValue,
        },
      });
    });

    return this.getSyncData(userId);
  }

  async upsertEntry(userId: string, date: string, values: ServerLogValues) {
    const sanitized = sanitizeServerLogValues(values);
    const entry = await this.prisma.logEntry.upsert({
      where: {
        userId_date: {
          userId,
          date: dateStringToDate(date),
        },
      },
      update: {
        values: sanitized as Prisma.InputJsonValue,
      },
      create: {
        userId,
        date: dateStringToDate(date),
        values: sanitized as Prisma.InputJsonValue,
      },
    });
    return this.toServerEntry(entry);
  }

  async deleteEntry(userId: string, entryId: string) {
    await this.prisma.logEntry.deleteMany({
      where: { userId, id: entryId },
    });
  }

  async deleteEntryByDate(userId: string, date: string) {
    await this.prisma.logEntry.deleteMany({
      where: { userId, date: dateStringToDate(date) },
    });
  }

  async updateUserState(userId: string, state: UserStateRecord) {
    const updated = await this.prisma.userState.upsert({
      where: { userId },
      update: {
        points: Math.max(0, Math.round(Number(state.points) || 0)),
        unlockedItems: state.unlockedItems,
        isPremiumUnlocked: state.isPremiumUnlocked,
      },
      create: {
        userId,
        points: Math.max(0, Math.round(Number(state.points) || 0)),
        unlockedItems: state.unlockedItems,
        isPremiumUnlocked: state.isPremiumUnlocked,
      },
    });

    return {
      points: updated.points,
      unlockedItems: toStringArray(updated.unlockedItems),
      isPremiumUnlocked: updated.isPremiumUnlocked,
    };
  }

  async updatePreferences(userId: string, preferences: AppPreferences) {
    const normalized = normalizeAppPreferences(preferences);
    const updated = await this.prisma.userState.upsert({
      where: { userId },
      update: {
        preferences: normalized as unknown as Prisma.InputJsonValue,
      },
      create: {
        userId,
        preferences: normalized as unknown as Prisma.InputJsonValue,
      },
    });
    return normalizeAppPreferences(updated.preferences);
  }

  private toServerEntry(entry: { id: string; date: Date; values: Prisma.JsonValue }): ServerLogEntry {
    const data = emptyData();
    const normalized = normalizeSyncData({
      ...data,
      entries: [{
        id: entry.id,
        date: dateToDateString(entry.date),
        values: entry.values,
      }],
    });
    return normalized.entries[0];
  }
}
