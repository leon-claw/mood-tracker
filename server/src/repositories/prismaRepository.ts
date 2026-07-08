import { Prisma, PrismaClient } from '@prisma/client';
import { normalizeSyncData, ServerLogEntry, SyncData } from '../domain/portableData';
import { sanitizeServerLogValues, ServerLogValues } from '../domain/logValues';
import { AppRepository, UserStateRecord } from './types';

const dateStringToDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
const dateToDateString = (date: Date) => date.toISOString().slice(0, 10);
const toStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const emptyData = (): SyncData => ({
  entries: [],
  points: 0,
  unlockedItems: [],
  isPremiumUnlocked: false,
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
    });
  }

  async replaceSyncData(userId: string, data: SyncData) {
    const normalized = normalizeSyncData(data);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.logEntry.deleteMany({ where: { userId } });
      if (normalized.entries.length > 0) {
        await transaction.logEntry.createMany({
          data: normalized.entries.map((entry) => ({
            id: entry.id,
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
        },
        create: {
          userId,
          points: normalized.points,
          unlockedItems: normalized.unlockedItems,
          isPremiumUnlocked: normalized.isPremiumUnlocked,
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
