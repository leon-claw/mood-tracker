import { randomUUID } from 'node:crypto';
import { normalizeSyncData, ServerLogEntry, SyncData } from '../domain/portableData';
import { sanitizeServerLogValues, ServerLogValues } from '../domain/logValues';
import {
  AppRepository,
  BootstrapData,
  CaptchaRecord,
  EntryMonthSummary,
  UserRecord,
  UserStateRecord,
  YearlyReportData,
} from './types';
import {
  AppPreferences,
  createDefaultAppPreferences,
  normalizeAppPreferences,
} from '../../../shared/appPreferences';

const createEmptyData = (): SyncData => ({
  entries: [],
  points: 0,
  unlockedItems: [],
  isPremiumUnlocked: false,
  preferences: createDefaultAppPreferences(),
});

export class MemoryRepository implements AppRepository {
  private captchas = new Map<string, CaptchaRecord>();
  private users = new Map<string, UserRecord>();
  private userData = new Map<string, SyncData>();

  async createCaptcha(answerHash: string, expiresAt: Date) {
    const captcha: CaptchaRecord = {
      id: randomUUID(),
      answerHash,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    this.captchas.set(captcha.id, captcha);
    return captcha;
  }

  async findCaptcha(id: string) {
    return this.captchas.get(id) || null;
  }

  async markCaptchaUsed(id: string) {
    const captcha = this.captchas.get(id);
    if (captcha) {
      captcha.usedAt = new Date();
    }
  }

  async createUser(email: string, passwordHash: string) {
    const user: UserRecord = {
      id: randomUUID(),
      email,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    this.userData.set(user.id, createEmptyData());
    return user;
  }

  async findUserByEmail(email: string) {
    const normalizedEmail = email.toLowerCase();
    return Array.from(this.users.values()).find((user) => user.email === normalizedEmail) || null;
  }

  async findUserById(id: string) {
    return this.users.get(id) || null;
  }

  async updatePassword(userId: string, passwordHash: string) {
    const user = this.users.get(userId);
    if (user) {
      user.passwordHash = passwordHash;
      user.updatedAt = new Date();
    }
  }

  async getBootstrapData(userId: string): Promise<BootstrapData> {
    const data = this.cloneData(this.userData.get(userId) || createEmptyData());
    return {
      points: data.points,
      unlockedItems: data.unlockedItems,
      isPremiumUnlocked: data.isPremiumUnlocked,
      preferences: data.preferences,
    };
  }

  async getEntriesByMonth(userId: string, year: number, month: number) {
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    const data = this.userData.get(userId) || createEmptyData();
    return data.entries
      .filter((entry) => entry.date.startsWith(prefix))
      .map((entry) => this.cloneEntry(entry));
  }

  async getEntryMonths(userId: string): Promise<EntryMonthSummary[]> {
    const data = this.userData.get(userId) || createEmptyData();
    const counts = new Map<string, EntryMonthSummary>();
    for (const entry of data.entries) {
      const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(entry.date);
      if (!match) continue;
      const key = `${match[1]}-${match[2]}`;
      const existing = counts.get(key);
      counts.set(key, {
        year: Number(match[1]),
        month: Number(match[2]),
        count: (existing?.count || 0) + 1,
      });
    }
    return [...counts.values()].sort((left, right) =>
      (right.year * 12 + right.month) - (left.year * 12 + left.month)
    );
  }

  async getYearlyReport(userId: string, year: number): Promise<YearlyReportData> {
    const data = this.userData.get(userId) || createEmptyData();
    return buildYearlyReport(data.entries, year);
  }

  async getSyncData(userId: string) {
    return this.cloneData(this.userData.get(userId) || createEmptyData());
  }

  async replaceSyncData(userId: string, data: SyncData) {
    const normalized = normalizeSyncData(data);
    this.userData.set(userId, this.cloneData(normalized));
    return this.cloneData(normalized);
  }

  async upsertEntry(userId: string, date: string, values: ServerLogValues) {
    const current = this.cloneData(this.userData.get(userId) || createEmptyData());
    const existing = current.entries.find((entry) => entry.date === date);
    const entry: ServerLogEntry = {
      id: existing?.id || randomUUID(),
      date,
      values: sanitizeServerLogValues(values),
    };
    current.entries = existing
      ? current.entries.map((item) => (item.id === existing.id ? entry : item))
      : [...current.entries, entry];
    current.entries.sort((left, right) => left.date.localeCompare(right.date));
    this.userData.set(userId, current);
    return this.cloneEntry(entry);
  }

  async deleteEntry(userId: string, entryId: string) {
    const current = this.cloneData(this.userData.get(userId) || createEmptyData());
    current.entries = current.entries.filter((entry) => entry.id !== entryId);
    this.userData.set(userId, current);
  }

  async deleteEntryByDate(userId: string, date: string) {
    const current = this.cloneData(this.userData.get(userId) || createEmptyData());
    current.entries = current.entries.filter((entry) => entry.date !== date);
    this.userData.set(userId, current);
  }

  async updateUserState(userId: string, state: UserStateRecord) {
    const current = this.cloneData(this.userData.get(userId) || createEmptyData());
    current.points = Math.max(0, Math.round(Number(state.points) || 0));
    current.unlockedItems = Array.isArray(state.unlockedItems)
      ? state.unlockedItems.filter((item): item is string => typeof item === 'string')
      : [];
    current.isPremiumUnlocked = state.isPremiumUnlocked === true;
    this.userData.set(userId, current);
    return {
      points: current.points,
      unlockedItems: [...current.unlockedItems],
      isPremiumUnlocked: current.isPremiumUnlocked,
    };
  }

  async updatePreferences(userId: string, preferences: AppPreferences) {
    const current = this.cloneData(this.userData.get(userId) || createEmptyData());
    current.preferences = normalizeAppPreferences(preferences);
    this.userData.set(userId, current);
    return normalizeAppPreferences(current.preferences);
  }

  private cloneData(data: SyncData): SyncData {
    return {
      entries: data.entries.map((entry) => this.cloneEntry(entry)),
      points: data.points,
      unlockedItems: [...data.unlockedItems],
      isPremiumUnlocked: data.isPremiumUnlocked,
      preferences: normalizeAppPreferences(data.preferences),
    };
  }

  private cloneEntry(entry: ServerLogEntry): ServerLogEntry {
    return {
      id: entry.id,
      date: entry.date,
      values: {
        ...entry.values,
        activities: Array.isArray(entry.values.activities) ? [...entry.values.activities] : [],
        weather: Array.isArray(entry.values.weather) ? [...entry.values.weather] : [],
        social: Array.isArray(entry.values.social) ? [...entry.values.social] : [],
        achievementMilestones: Array.isArray(entry.values.achievementMilestones)
          ? [...entry.values.achievementMilestones]
          : [],
      },
    };
  }
}

const average = (values: number[]) => values.length > 0
  ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
  : null;

const buildYearlyReport = (entries: ServerLogEntry[], year: number): YearlyReportData => ({
  year,
  months: Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    const monthEntries = entries.filter((entry) => entry.date.startsWith(prefix));
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
});
