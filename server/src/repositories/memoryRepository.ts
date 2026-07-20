import { randomUUID } from 'node:crypto';
import { normalizeSyncData, ServerLogEntry, SyncData } from '../domain/portableData';
import { sanitizeServerLogValues, ServerLogValues } from '../domain/logValues';
import { AppRepository, CaptchaRecord, UserRecord, UserStateRecord } from './types';
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
