import { ServerLogEntry, SyncData } from '../domain/portableData';
import { ServerLogValues } from '../domain/logValues';
import { AppPreferences } from '../../../shared/appPreferences';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaptchaRecord {
  id: string;
  answerHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface UserStateRecord {
  points: number;
  unlockedItems: string[];
  isPremiumUnlocked: boolean;
}

export interface BootstrapData extends UserStateRecord {
  preferences: AppPreferences;
}

export interface EntryMonthSummary {
  year: number;
  month: number;
  count: number;
}

export interface YearlyMonthSummary {
  month: number;
  entryCount: number;
  averageMood: number | null;
  averageSleepQuality: number | null;
}

export interface YearlyReportData {
  year: number;
  months: YearlyMonthSummary[];
}

export interface AppRepository {
  createCaptcha(answerHash: string, expiresAt: Date): Promise<CaptchaRecord>;
  findCaptcha(id: string): Promise<CaptchaRecord | null>;
  markCaptchaUsed(id: string): Promise<void>;
  createUser(email: string, passwordHash: string): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  getBootstrapData(userId: string): Promise<BootstrapData>;
  getEntriesByMonth(userId: string, year: number, month: number): Promise<ServerLogEntry[]>;
  getEntryMonths(userId: string): Promise<EntryMonthSummary[]>;
  getYearlyReport(userId: string, year: number): Promise<YearlyReportData>;
  getSyncData(userId: string): Promise<SyncData>;
  replaceSyncData(userId: string, data: SyncData): Promise<SyncData>;
  upsertEntry(userId: string, date: string, values: ServerLogValues): Promise<ServerLogEntry>;
  deleteEntry(userId: string, entryId: string): Promise<void>;
  deleteEntryByDate(userId: string, date: string): Promise<void>;
  updateUserState(userId: string, state: UserStateRecord): Promise<UserStateRecord>;
  updatePreferences(userId: string, preferences: AppPreferences): Promise<AppPreferences>;
}
