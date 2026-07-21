import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { LogEntry } from './types';
import { MoodFlowChart } from './components/MoodFlowChart';
import { MoodDistribution } from './components/MoodDistribution';
import { SleepMoodChart } from './components/SleepMoodChart';
import { LogModal } from './components/LogModal';
import { CalendarMonthView } from './components/CalendarMonthView';
import { PageTransition } from './components/PageTransition';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AuthDialog, AuthDialogMode } from './components/AuthDialog';
import { DataSourceChoiceDialog } from './components/DataSourceChoiceDialog';
import { UpdatePrompt } from './components/UpdatePrompt';
import { RecordFieldSettingsPage } from './components/RecordFieldSettingsPage';
import { ReminderSettingsPage } from './components/ReminderSettingsPage';
import { YearlyReportOverview } from './components/YearlyReportOverview';
import {
  GlobalToast,
  SyncStatusIcon,
  ToastMessage,
} from './components/SyncFeedback';
import {
  AppTab,
  getHashForTab,
  getTabFromHash,
  isRecordFieldSettingsHash,
  isReminderSettingsHash,
  recordFieldSettingsRoute,
  reminderSettingsRoute,
} from './routes';
import { getActivityOption } from './fieldSchema';
import {
  AppExportData,
  createExportJson,
  normalizeAppData,
  parseImportJson,
} from './dataPortability';
import { createLogEntry } from './logEntry';
import {
  clearLocalAppData,
  hasLocalBusinessData,
  readLocalAppData,
  writeLocalAppData,
} from './localDataStore';
import {
  AuthUser,
  CloudBootstrapData,
  CloudChangesPayload,
  CloudEntryChange,
  createCloudDataStore,
  EntryMonthSummary,
  hasStoredCloudAuthToken,
  YearlyReportData,
} from './cloudDataStore';
import { appConfig } from './appConfig';
import { formatLocalDate, getCurrentDateContext, YearMonth } from './dateContext';
import { getAvailableReportMonths, getYearlyReportData } from './reportData';
import { fetchUpdateManifest, isVersionNewer, UpdateManifest } from './updateCheck';
import { exportJsonFile } from './androidExport';
import {
  AppPreferences,
  normalizeAppPreferences,
  RecordFieldId,
} from '../shared/appPreferences';
import {
  addCheckInReminderActionListener,
  getReminderExactAlarmPermissionState,
  getReminderPermissionState,
  ReminderPermissionState,
  requestReminderExactAlarmPermission,
  requestReminderPermission,
  syncCheckInReminderSchedule,
} from './reminderService';

import {
  Calendar,
  BarChart3,
  CalendarDays,
  User,
  Plus,
  Search,
  ChevronDown,
  Trash2,
  Moon,
  Smile,
  Database,
  Download,
  Upload,
  Cloud,
  KeyRound,
  LogIn,
  LogOut,
  UserPlus,
  Smartphone,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  BellRing,
} from 'lucide-react';

type DataMode = 'local' | 'cloud';
const ANDROID_RELEASES_URL = 'https://github.com/leon-claw/mood-tracker/releases';
export const CLOUD_SYNC_BATCH_DELAY_MS = 10_000;

const formatYearMonth = ({ year, month }: YearMonth) => `${year}年 ${month}月`;
const formatMonthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;
const getEntryMonthKey = (entry: Pick<LogEntry, 'date'>) => entry.date.slice(0, 7);

const mergeMonthEntries = (current: LogEntry[], year: number, month: number, monthEntries: LogEntry[]) => {
  const key = formatMonthKey(year, month);
  return [
    ...current.filter((entry) => getEntryMonthKey(entry) !== key),
    ...monthEntries,
  ].sort((left, right) => left.date.localeCompare(right.date));
};

const mergeChangedEntries = (current: LogEntry[], changed: LogEntry[]) => {
  const changedByDate = new Map(changed.map((entry) => [entry.date, entry]));
  return [
    ...current.filter((entry) => !changedByDate.has(entry.date)),
    ...changed,
  ].sort((left, right) => left.date.localeCompare(right.date));
};

const getLocalMonthSummaries = (entries: LogEntry[]): EntryMonthSummary[] =>
  getAvailableReportMonths(entries).map(({ year, month }) => ({
    year,
    month,
    count: entries.filter((entry) => getEntryMonthKey(entry) === formatMonthKey(year, month)).length,
  }));

interface PendingCloudChanges {
  entries: CloudEntryChange[];
  userState?: CloudChangesPayload['userState'];
  preferences?: AppPreferences;
}

const createPendingCloudChanges = (): PendingCloudChanges => ({ entries: [] });
const hasPendingCloudChanges = (changes: PendingCloudChanges) =>
  changes.entries.length > 0 || changes.userState !== undefined || changes.preferences !== undefined;

const getOptionalNumber = (value: unknown) => typeof value === 'number' ? value : null;
const formatScaleValue = (value: number | null) => value === null ? '未记录' : `${value}/10`;

const applyAppData = (
  data: unknown,
  setters: {
    setEntries: (entries: LogEntry[]) => void;
    setPoints: (points: number) => void;
    setUnlockedItems: (items: string[]) => void;
    setIsPremiumUnlocked: (value: boolean) => void;
    setPreferences: (preferences: AppPreferences) => void;
  }
) => {
  const normalized = normalizeAppData(data);
  setters.setEntries(normalized.entries);
  setters.setPoints(normalized.points);
  setters.setUnlockedItems(normalized.unlockedItems);
  setters.setIsPremiumUnlocked(normalized.isPremiumUnlocked);
  setters.setPreferences(normalized.preferences);
};

const applyBootstrapData = (
  data: CloudBootstrapData,
  setters: {
    setPoints: (points: number) => void;
    setUnlockedItems: (items: string[]) => void;
    setIsPremiumUnlocked: (value: boolean) => void;
    setPreferences: (preferences: AppPreferences) => void;
  }
) => {
  setters.setPoints(data.points);
  setters.setUnlockedItems(data.unlockedItems);
  setters.setIsPremiumUnlocked(data.isPremiumUnlocked);
  setters.setPreferences(data.preferences);
};

export default function App() {
  // 1. State Initialization
  const isNativeMobile = Capacitor.isNativePlatform();
  const showCloudAccount = appConfig.showCloudAccount;
  const initialLocalData = useMemo(() => readLocalAppData(), []);
  const initialDateContext = useMemo(() => getCurrentDateContext(), []);
  const hasInitialCloudToken = useMemo(
    () => showCloudAccount && hasStoredCloudAuthToken(),
    [showCloudAccount]
  );
  const [entries, setEntries] = useState<LogEntry[]>(() => initialLocalData.entries);
  const [currentDate, setCurrentDate] = useState(() => initialDateContext.date);

  const [activeTab, setActiveTab] = useState<AppTab>(() => getTabFromHash(window.location.hash));
  const [reportRange, setReportRange] = useState<'month' | 'year'>('month');
  const [dataMode, setDataMode] = useState<DataMode>(() => hasInitialCloudToken ? 'cloud' : 'local');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authDialogMode, setAuthDialogMode] = useState<AuthDialogMode | null>(null);
  const [pendingSourceUser, setPendingSourceUser] = useState<AuthUser | null>(null);
  const [isSourceChoiceBusy, setIsSourceChoiceBusy] = useState(false);
  const [updateManifest, setUpdateManifest] = useState<UpdateManifest | null>(null);

  // Month and Year selector states
  const [selectedYear, setSelectedYear] = useState<number>(() => initialDateContext.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => initialDateContext.month);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState<number>(() => initialDateContext.year);
  const [calendarMonth, setCalendarMonth] = useState<number>(() => initialDateContext.month);
  const [calendarEditorDate, setCalendarEditorDate] = useState<string | null>(null);

  // Gamification & Unlock states
  const [points, setPoints] = useState<number>(() => initialLocalData.points);
  const [unlockedItems, setUnlockedItems] = useState<string[]>(() => initialLocalData.unlockedItems);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState<boolean>(() => initialLocalData.isPremiumUnlocked);
  const [preferences, setPreferences] = useState<AppPreferences>(() => initialLocalData.preferences);
  const [isRecordFieldSettingsOpen, setIsRecordFieldSettingsOpen] = useState(
    () => isRecordFieldSettingsHash(window.location.hash)
  );
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(
    () => isNativeMobile && isReminderSettingsHash(window.location.hash)
  );
  const [reminderPermissionState, setReminderPermissionState] = useState<ReminderPermissionState>('unknown');
  const [reminderExactAlarmState, setReminderExactAlarmState] = useState<ReminderPermissionState>('unknown');
  const [isReminderPermissionBusy, setIsReminderPermissionBusy] = useState(false);
  const [isReminderExactAlarmBusy, setIsReminderExactAlarmBusy] = useState(false);
  // Daily Logging modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage>(null);
  const [syncRequestCount, setSyncRequestCount] = useState(0);
  const [loadedMonthKeys, setLoadedMonthKeys] = useState<string[]>(() =>
    dataMode === 'local' ? getAvailableReportMonths(initialLocalData.entries).map(({ year, month }) => formatMonthKey(year, month)) : []
  );
  const [cloudEntryMonths, setCloudEntryMonths] = useState<EntryMonthSummary[]>([]);
  const [hasLoadedCloudEntryMonths, setHasLoadedCloudEntryMonths] = useState(false);
  const [yearlyReports, setYearlyReports] = useState<Record<number, YearlyReportData>>({});

  const cloudStore = useMemo(() => createCloudDataStore(fetch, {
    apiBaseUrl: appConfig.apiBaseUrl,
    useBearerToken: true,
    onSyncStart: () => setSyncRequestCount((count) => count + 1),
    onSyncEnd: () => setSyncRequestCount((count) => Math.max(0, count - 1)),
    onSyncError: (error) => setToast({ type: 'error', message: error.message }),
  }), []);
  const isCloudSyncing = syncRequestCount > 0;

  // Search & Filter state for Log history tab
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; closeCalendarEditor?: boolean } | null>(null);
  const calendarTransitionHasMounted = useRef(false);
  const cloudBatchTimerRef = useRef<number | null>(null);
  const pendingCloudChangesRef = useRef<PendingCloudChanges>(createPendingCloudChanges());
  const loadingMonthKeysRef = useRef(new Set<string>());
  const loadingYearKeysRef = useRef(new Set<number>());
  const dataModeRef = useRef<DataMode>(dataMode);
  const appDataRef = useRef<AppExportData>(initialLocalData);
  const preferencesRef = useRef(preferences);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Save states to LocalStorage only while the app is in guest/local mode.
  useEffect(() => {
    if (dataMode !== 'local') return;
    writeLocalAppData({
      entries,
      points,
      unlockedItems,
      isPremiumUnlocked,
      preferences,
    });
  }, [dataMode, entries, points, unlockedItems, isPremiumUnlocked, preferences]);

  useEffect(() => {
    dataModeRef.current = dataMode;
    const currentData = { entries, points, unlockedItems, isPremiumUnlocked, preferences };
    appDataRef.current = currentData;
    preferencesRef.current = preferences;
  }, [dataMode, entries, points, unlockedItems, isPremiumUnlocked, preferences]);

  useEffect(() => () => {
    if (cloudBatchTimerRef.current !== null) {
      window.clearTimeout(cloudBatchTimerRef.current);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const restoreSession = async () => {
      if (!showCloudAccount || !hasInitialCloudToken) {
        return;
      }

      try {
        const user = await cloudStore.getMe();
        if (isCancelled) return;
        if (!user) {
          setAuthUser(null);
          setDataMode('local');
          return;
        }

        const [bootstrap, monthEntries] = await Promise.all([
          cloudStore.getBootstrap(),
          cloudStore.getEntriesByMonth(initialDateContext.year, initialDateContext.month),
        ]);
        if (isCancelled) return;
        applyBootstrapData(bootstrap, {
          setPoints,
          setUnlockedItems,
          setIsPremiumUnlocked,
          setPreferences,
        });
        setEntries(monthEntries);
        setLoadedMonthKeys([formatMonthKey(initialDateContext.year, initialDateContext.month)]);
        clearLocalAppData();
        setAuthUser(user);
        setDataMode('cloud');
      } catch (error) {
        if (!isCancelled) {
          setToast({
            type: 'error',
            message: error instanceof Error ? error.message : '云端数据拉取失败，请稍后再试。',
          });
        }
      }
    };

    void restoreSession();
    return () => {
      isCancelled = true;
    };
  }, [cloudStore, hasInitialCloudToken, initialDateContext.month, initialDateContext.year, showCloudAccount]);

  useEffect(() => {
    let isDisposed = false;
    let nativeListener: PluginListenerHandle | null = null;

    const refreshDateContext = () => {
      const next = getCurrentDateContext();
      setCurrentDate(next.date);
      setSelectedYear(next.year);
      setSelectedMonth(next.month);
      setCalendarYear(next.year);
      setCalendarMonth(next.month);
      setIsMonthDropdownOpen(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshDateContext();
    };

    refreshDateContext();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', refreshDateContext);

    if (isNativeMobile) {
      void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) return;
        refreshDateContext();
        void syncCheckInReminderSchedule(preferencesRef.current.reminders).catch((error) => {
          setToast({
            type: 'error',
            message: error instanceof Error ? error.message : '打卡提醒更新失败，请稍后再试。',
          });
        });
        if (isReminderSettingsHash(window.location.hash)) {
          void getReminderPermissionState()
            .then(setReminderPermissionState)
            .catch(() => undefined);
          void getReminderExactAlarmPermissionState()
            .then(setReminderExactAlarmState)
            .catch(() => undefined);
        }
      }).then((listener) => {
        if (isDisposed) void listener.remove();
        else nativeListener = listener;
      });
    }

    return () => {
      isDisposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', refreshDateContext);
      if (nativeListener) void nativeListener.remove();
    };
  }, [isNativeMobile]);

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', getHashForTab(activeTab));
    }

    const handleHashChange = () => {
      if (!isNativeMobile && isReminderSettingsHash(window.location.hash)) {
        window.history.replaceState(null, '', getHashForTab('profile'));
        setActiveTab('profile');
        setIsRecordFieldSettingsOpen(false);
        setIsReminderSettingsOpen(false);
        return;
      }
      setActiveTab(getTabFromHash(window.location.hash));
      setIsRecordFieldSettingsOpen(isRecordFieldSettingsHash(window.location.hash));
      setIsReminderSettingsOpen(isNativeMobile && isReminderSettingsHash(window.location.hash));
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isNativeMobile]);

  useEffect(() => {
    if (!isNativeMobile) return;

    let isCancelled = false;
    void syncCheckInReminderSchedule(preferences.reminders).catch((error) => {
      if (!isCancelled) {
        setToast({
          type: 'error',
          message: error instanceof Error ? error.message : '打卡提醒更新失败，请稍后再试。',
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isNativeMobile, preferences.reminders]);

  useEffect(() => {
    if (!isNativeMobile || !isReminderSettingsOpen) return;

    let isCancelled = false;
    void Promise.all([
      getReminderPermissionState(),
      getReminderExactAlarmPermissionState(),
    ])
      .then(([displayState, exactAlarmState]) => {
        if (isCancelled) return;
        setReminderPermissionState(displayState);
        setReminderExactAlarmState(exactAlarmState);
      })
      .catch((error) => {
        if (!isCancelled) {
          setToast({
            type: 'error',
            message: error instanceof Error ? error.message : '无法读取系统通知权限。',
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isNativeMobile, isReminderSettingsOpen]);

  useEffect(() => {
    if (!isNativeMobile) return;

    let isDisposed = false;
    let listener: PluginListenerHandle | null = null;
    void addCheckInReminderActionListener(() => {
      setCalendarEditorDate(null);
      window.location.hash = getHashForTab('log');
      setIsLogModalOpen(true);
    }).then((handle) => {
      if (!handle) return;
      if (isDisposed) void handle.remove();
      else listener = handle;
    }).catch((error) => {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : '无法响应打卡提醒。',
      });
    });

    return () => {
      isDisposed = true;
      if (listener) void listener.remove();
    };
  }, [isNativeMobile]);

  useEffect(() => {
    let isCancelled = false;

    const checkForUpdates = async () => {
      if (!appConfig.updateManifestUrl) return;
      const manifest = await fetchUpdateManifest(appConfig.updateManifestUrl);
      if (!manifest || isCancelled) return;
      if (isVersionNewer(manifest.version, appConfig.appVersion)) {
        setUpdateManifest(manifest);
      }
    };

    void checkForUpdates();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, toast.type === 'error' ? 4200 : 2800);

    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'calendar') {
      calendarTransitionHasMounted.current = true;
      return;
    }
    calendarTransitionHasMounted.current = false;
  }, [activeTab]);

  const navigateToTab = (tab: AppTab) => {
    const nextHash = getHashForTab(tab);
    if (window.location.hash === nextHash) {
      setActiveTab(tab);
      return;
    }
    window.location.hash = nextHash;
  };

  const navigateToRecordFieldSettings = () => {
    window.location.hash = recordFieldSettingsRoute;
  };

  const navigateToReminderSettings = () => {
    if (isNativeMobile) window.location.hash = reminderSettingsRoute;
  };

  const getCurrentAppData = () => ({
    entries,
    points,
    unlockedItems,
    isPremiumUnlocked,
    preferences,
  });

  const setDataStatus = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  const cancelScheduledCloudSync = (discardPendingChanges = false) => {
    if (cloudBatchTimerRef.current !== null) {
      window.clearTimeout(cloudBatchTimerRef.current);
      cloudBatchTimerRef.current = null;
    }
    if (discardPendingChanges) {
      pendingCloudChangesRef.current = createPendingCloudChanges();
    }
  };

  const scheduleCloudSync = () => {
    if (dataModeRef.current !== 'cloud' || cloudBatchTimerRef.current !== null) return;

    cloudBatchTimerRef.current = window.setTimeout(() => {
      cloudBatchTimerRef.current = null;
      if (dataModeRef.current !== 'cloud') return;

      const batch = pendingCloudChangesRef.current;
      pendingCloudChangesRef.current = createPendingCloudChanges();
      if (!hasPendingCloudChanges(batch)) return;

      void cloudStore.applyChanges(batch).then((result) => {
        const newerChanges = pendingCloudChangesRef.current;
        const pendingDates = new Set(newerChanges.entries.map((change) => change.date));
        const confirmedEntries = result.entries.filter((entry) => !pendingDates.has(entry.date));
        if (confirmedEntries.length > 0) {
          const nextEntries = mergeChangedEntries(appDataRef.current.entries, confirmedEntries);
          appDataRef.current = { ...appDataRef.current, entries: nextEntries };
          setEntries(nextEntries);
        }
        if (result.bootstrap) {
          if (!newerChanges.userState) {
            appDataRef.current = {
              ...appDataRef.current,
              points: result.bootstrap.points,
              unlockedItems: result.bootstrap.unlockedItems,
              isPremiumUnlocked: result.bootstrap.isPremiumUnlocked,
            };
            setPoints(result.bootstrap.points);
            setUnlockedItems(result.bootstrap.unlockedItems);
            setIsPremiumUnlocked(result.bootstrap.isPremiumUnlocked);
          }
          if (!newerChanges.preferences) {
            preferencesRef.current = result.bootstrap.preferences;
            appDataRef.current = { ...appDataRef.current, preferences: result.bootstrap.preferences };
            setPreferences(result.bootstrap.preferences);
          }
        }
      }).catch(() => {
        const queued = pendingCloudChangesRef.current;
        const entriesByDate = new Map(batch.entries.map((change) => [change.date, change]));
        queued.entries.forEach((change) => entriesByDate.set(change.date, change));
        pendingCloudChangesRef.current = {
          entries: [...entriesByDate.values()],
          userState: queued.userState || batch.userState,
          preferences: queued.preferences || batch.preferences,
        };
        scheduleCloudSync();
      });
    }, CLOUD_SYNC_BATCH_DELAY_MS);
  };

  const queueCloudChanges = (changes: CloudChangesPayload) => {
    if (dataModeRef.current !== 'cloud') return;
    const pending = pendingCloudChangesRef.current;
    const entriesByDate = new Map(pending.entries.map((change) => [change.date, change]));
    changes.entries?.forEach((change) => entriesByDate.set(change.date, change));
    pendingCloudChangesRef.current = {
      entries: [...entriesByDate.values()],
      userState: changes.userState || pending.userState,
      preferences: changes.preferences || pending.preferences,
    };
    scheduleCloudSync();
  };

  const loadCloudMonth = useCallback(async (year: number, month: number, force = false) => {
    if (dataModeRef.current !== 'cloud') return;
    const key = formatMonthKey(year, month);
    if (!force && (loadedMonthKeys.includes(key) || loadingMonthKeysRef.current.has(key))) return;
    loadingMonthKeysRef.current.add(key);
    try {
      const monthEntries = await cloudStore.getEntriesByMonth(year, month);
      setEntries((current) => mergeMonthEntries(current, year, month, monthEntries));
      setLoadedMonthKeys((current) => current.includes(key) ? current : [...current, key]);
    } catch {
      // The cloud store forwards backend errors to the global toast.
    } finally {
      loadingMonthKeysRef.current.delete(key);
    }
  }, [cloudStore, loadedMonthKeys]);

  const loadCloudEntryMonths = useCallback(async (force = false) => {
    if (dataModeRef.current !== 'cloud' || (!force && hasLoadedCloudEntryMonths)) return;
    try {
      setCloudEntryMonths(await cloudStore.getEntryMonths());
      setHasLoadedCloudEntryMonths(true);
    } catch {
      // The cloud store forwards backend errors to the global toast.
    }
  }, [cloudStore, hasLoadedCloudEntryMonths]);

  const loadCloudYearlyReport = useCallback(async (year: number, force = false) => {
    if (dataModeRef.current !== 'cloud') return;
    if ((!force && yearlyReports[year]) || loadingYearKeysRef.current.has(year)) return;
    loadingYearKeysRef.current.add(year);
    try {
      const report = await cloudStore.getYearlyReport(year);
      setYearlyReports((current) => ({ ...current, [year]: report }));
    } catch {
      // The cloud store forwards backend errors to the global toast.
    } finally {
      loadingYearKeysRef.current.delete(year);
    }
  }, [cloudStore, yearlyReports]);

  const handleAuthenticated = async (user: AuthUser) => {
    setAuthUser(user);
    if (hasLocalBusinessData()) {
      setPendingSourceUser(user);
      return;
    }

    try {
      const current = getCurrentDateContext();
      const [bootstrap, monthEntries] = await Promise.all([
        cloudStore.getBootstrap(),
        cloudStore.getEntriesByMonth(current.year, current.month),
      ]);
      applyBootstrapData(bootstrap, {
        setPoints,
        setUnlockedItems,
        setIsPremiumUnlocked,
        setPreferences,
      });
      setEntries(monthEntries);
      setLoadedMonthKeys([formatMonthKey(current.year, current.month)]);
      setCloudEntryMonths([]);
      setHasLoadedCloudEntryMonths(false);
      setYearlyReports({});
      clearLocalAppData();
      setDataMode('cloud');
      setDataStatus('success', '已进入云端同步模式。');
    } catch {
      // The cloud store forwards backend errors to the global toast.
    }
  };

  const handleUseLocalData = async () => {
    setIsSourceChoiceBusy(true);
    cancelScheduledCloudSync(true);
    try {
      const uploaded = await cloudStore.replaceData(readLocalAppData());
      applyAppData(uploaded, {
        setEntries,
        setPoints,
        setUnlockedItems,
        setIsPremiumUnlocked,
        setPreferences,
      });
      clearLocalAppData();
      setDataMode('cloud');
      setLoadedMonthKeys(getAvailableReportMonths(uploaded.entries).map(({ year, month }) => formatMonthKey(year, month)));
      setCloudEntryMonths(getLocalMonthSummaries(uploaded.entries));
      setHasLoadedCloudEntryMonths(true);
      setYearlyReports({});
      setPendingSourceUser(null);
      setDataStatus('success', '本地数据已上传并覆盖云端。');
    } catch {
      // The cloud store forwards backend errors to the global toast.
    } finally {
      setIsSourceChoiceBusy(false);
    }
  };

  const handleUseCloudData = async () => {
    setIsSourceChoiceBusy(true);
    cancelScheduledCloudSync(true);
    try {
      const current = getCurrentDateContext();
      const [bootstrap, monthEntries] = await Promise.all([
        cloudStore.getBootstrap(),
        cloudStore.getEntriesByMonth(current.year, current.month),
      ]);
      applyBootstrapData(bootstrap, {
        setPoints,
        setUnlockedItems,
        setIsPremiumUnlocked,
        setPreferences,
      });
      setEntries(monthEntries);
      setLoadedMonthKeys([formatMonthKey(current.year, current.month)]);
      setCloudEntryMonths([]);
      setHasLoadedCloudEntryMonths(false);
      setYearlyReports({});
      clearLocalAppData();
      setDataMode('cloud');
      setPendingSourceUser(null);
      setDataStatus('success', '已使用云端数据，并清空本地记录。');
    } catch {
      // The cloud store forwards backend errors to the global toast.
    } finally {
      setIsSourceChoiceBusy(false);
    }
  };

  const handleCancelSourceChoice = async () => {
    try {
      await cloudStore.logout();
      setAuthUser(null);
      setPendingSourceUser(null);
      setDataMode('local');
      pendingCloudChangesRef.current = createPendingCloudChanges();
    } catch (error) {
      setDataStatus('error', error instanceof Error ? error.message : '退出登录失败，请稍后再试。');
    }
  };

  const handleLogout = async () => {
    cancelScheduledCloudSync(true);
    try {
      await cloudStore.logout();
      setAuthUser(null);
      setDataMode('local');
      pendingCloudChangesRef.current = createPendingCloudChanges();
      setLoadedMonthKeys([]);
      setCloudEntryMonths([]);
      setHasLoadedCloudEntryMonths(false);
      setYearlyReports({});
      clearLocalAppData();
      const emptyData = readLocalAppData();
      applyAppData(emptyData, {
        setEntries,
        setPoints,
        setUnlockedItems,
        setIsPremiumUnlocked,
        setPreferences,
      });
      setDataStatus('success', '已退出登录，当前回到本地模式。');
    } catch (error) {
      setDataStatus('error', error instanceof Error ? error.message : '退出登录失败，请稍后再试。');
    }
  };

  const invalidateYearlyReportForDate = (date: string) => {
    const year = Number(date.slice(0, 4));
    setYearlyReports((current) => {
      if (!current[year]) return current;
      const next = { ...current };
      delete next[year];
      return next;
    });
  };

  // Apply record changes immediately, then let the shared cloud batch persist them.
  const handleSaveEntry = (newEntryData: Omit<LogEntry, 'id'>) => {
    const currentData = appDataRef.current;
    const existingEntry = currentData.entries.find((entry) => entry.date === newEntryData.date);
    const optimisticEntry = existingEntry
      ? { ...existingEntry, ...newEntryData }
      : createLogEntry(newEntryData.date, newEntryData.values);
    const existingIndex = currentData.entries.findIndex((entry) => entry.date === newEntryData.date);
    const nextEntries = [...currentData.entries];
    if (existingIndex === -1) nextEntries.push(optimisticEntry);
    else nextEntries[existingIndex] = optimisticEntry;

    const nextPoints = existingEntry ? currentData.points : currentData.points + 50;
    appDataRef.current = {
      ...currentData,
      entries: nextEntries,
      points: nextPoints,
    };
    setEntries(nextEntries);
    invalidateYearlyReportForDate(optimisticEntry.date);
    if (!existingEntry) setPoints(nextPoints);
    if (!existingEntry) {
      setCloudEntryMonths((current) => {
        const year = Number(newEntryData.date.slice(0, 4));
        const month = Number(newEntryData.date.slice(5, 7));
        const existingMonth = current.find((item) => item.year === year && item.month === month);
        const next = existingMonth
          ? current.map((item) => item === existingMonth ? { ...item, count: item.count + 1 } : item)
          : [...current, { year, month, count: 1 }];
        return next.sort((left, right) => (right.year * 12 + right.month) - (left.year * 12 + left.month));
      });
    }
    queueCloudChanges({
      entries: [{ operation: 'upsert', date: optimisticEntry.date, values: optimisticEntry.values }],
      ...(!existingEntry ? {
        userState: {
          points: nextPoints,
          unlockedItems: currentData.unlockedItems,
          isPremiumUnlocked: currentData.isPremiumUnlocked,
        },
      } : {}),
    });
  };

  const requestDeleteEntry = (id: string, options?: { closeCalendarEditor?: boolean }) => {
    setPendingDelete({ id, closeCalendarEditor: options?.closeCalendarEditor });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const deleteRequest = pendingDelete;
    const currentData = appDataRef.current;
    const deletedEntry = currentData.entries.find((entry) => entry.id === deleteRequest.id);
    const nextEntries = currentData.entries.filter((entry) => entry.id !== deleteRequest.id);

    appDataRef.current = { ...currentData, entries: nextEntries };
    setEntries(nextEntries);
    if (deletedEntry) invalidateYearlyReportForDate(deletedEntry.date);
    if (deleteRequest.closeCalendarEditor) setCalendarEditorDate(null);
    setPendingDelete(null);
    if (deletedEntry) {
      setCloudEntryMonths((current) => current
        .map((item) => getEntryMonthKey(deletedEntry) === formatMonthKey(item.year, item.month)
          ? { ...item, count: Math.max(0, item.count - 1) }
          : item)
        .filter((item) => item.count > 0));
      queueCloudChanges({ entries: [{ operation: 'delete', date: deletedEntry.date }] });
    }
  };

  const handleExportData = async () => {
    try {
      const exportData = dataMode === 'cloud'
        ? await cloudStore.getExportData()
        : getCurrentAppData();
      const json = createExportJson(exportData);
      await exportJsonFile({
        json,
        filename: `mood-tracker-export-${formatLocalDate()}.json`,
      });
      setDataStatus('success', '已导出 JSON 备份。');
    } catch (error) {
      setDataStatus('error', error instanceof Error ? error.message : '导出失败，请稍后再试。');
    }
  };

  const handleImportDataFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    try {
      const imported = parseImportJson(await file.text());
      cancelScheduledCloudSync(true);
      const nextData = dataMode === 'cloud' ? await cloudStore.replaceData(imported) : imported;
      applyAppData(nextData, {
        setEntries,
        setPoints,
        setUnlockedItems,
        setIsPremiumUnlocked,
        setPreferences,
      });
      const importedMonths = getLocalMonthSummaries(nextData.entries);
      setLoadedMonthKeys(importedMonths.map(({ year, month }) => formatMonthKey(year, month)));
      setCloudEntryMonths(dataMode === 'cloud' ? importedMonths : []);
      setHasLoadedCloudEntryMonths(dataMode === 'cloud');
      setYearlyReports({});
      setDataStatus('success', `已导入 ${imported.entries.length} 条记录。`);
    } catch (error) {
      setDataStatus('error', error instanceof Error ? error.message : '导入失败，请检查 JSON 文件。');
    }
  };

  const handleToggleRecordField = (fieldId: RecordFieldId) => {
    const previousPreferences = preferencesRef.current;
    const isEnabled = previousPreferences.enabledRecordFieldIds.includes(fieldId);
    if (isEnabled && previousPreferences.enabledRecordFieldIds.length === 1) {
      setDataStatus('error', '至少保留一个记录模块。');
      return;
    }

    const nextPreferences = normalizeAppPreferences({
      ...previousPreferences,
      enabledRecordFieldIds: isEnabled
        ? previousPreferences.enabledRecordFieldIds.filter((id) => id !== fieldId)
        : [...previousPreferences.enabledRecordFieldIds, fieldId],
    });
    preferencesRef.current = nextPreferences;
    appDataRef.current = {
      ...appDataRef.current,
      preferences: nextPreferences,
    };
    setPreferences(nextPreferences);
    queueCloudChanges({ preferences: nextPreferences });
  };

  const commitPreferences = (nextPreferences: AppPreferences) => {
    preferencesRef.current = nextPreferences;
    appDataRef.current = {
      ...appDataRef.current,
      preferences: nextPreferences,
    };
    setPreferences(nextPreferences);
    queueCloudChanges({ preferences: nextPreferences });
  };

  const handleToggleReminders = async (enabled: boolean) => {
    const previousPreferences = preferencesRef.current;
    if (!enabled) {
      commitPreferences(normalizeAppPreferences({
        ...previousPreferences,
        reminders: { ...previousPreferences.reminders, enabled: false },
      }));
      return;
    }

    if (previousPreferences.reminders.times.length === 0) {
      setDataStatus('error', '请先添加一个提醒时间。');
      return;
    }

    setIsReminderPermissionBusy(true);
    try {
      const permission = await requestReminderPermission();
      setReminderPermissionState(permission);
      if (permission !== 'granted') {
        setDataStatus('error', '通知权限未开启，暂时无法启用提醒。');
        return;
      }

      const exactAlarmPermission = await getReminderExactAlarmPermissionState();
      setReminderExactAlarmState(exactAlarmPermission);

      commitPreferences(normalizeAppPreferences({
        ...previousPreferences,
        reminders: { ...previousPreferences.reminders, enabled: true },
      }));
      if (exactAlarmPermission === 'denied') {
        setDataStatus('error', '每日提醒已开启，但系统可能延迟，请继续开启精确提醒权限。');
      }
    } catch (error) {
      setDataStatus('error', error instanceof Error ? error.message : '通知权限申请失败，请稍后再试。');
    } finally {
      setIsReminderPermissionBusy(false);
    }
  };

  const handleRequestReminderExactAlarmPermission = async () => {
    setIsReminderExactAlarmBusy(true);
    try {
      const permission = await requestReminderExactAlarmPermission();
      setReminderExactAlarmState(permission);
      if (permission !== 'granted') {
        setDataStatus('error', '精确提醒权限未开启，系统可能延迟通知。');
        return;
      }

      await syncCheckInReminderSchedule(preferencesRef.current.reminders);
      setDataStatus('success', '精确提醒已开启，提醒时间已重新登记。');
    } catch (error) {
      setDataStatus('error', error instanceof Error ? error.message : '无法开启精确提醒权限。');
    } finally {
      setIsReminderExactAlarmBusy(false);
    }
  };

  const handleAddReminderTime = (time: string) => {
    const previousPreferences = preferencesRef.current;
    if (!time || previousPreferences.reminders.times.includes(time)) return;
    commitPreferences(normalizeAppPreferences({
      ...previousPreferences,
      reminders: {
        ...previousPreferences.reminders,
        times: [...previousPreferences.reminders.times, time],
      },
    }));
  };

  const handleRemoveReminderTime = (time: string) => {
    const previousPreferences = preferencesRef.current;
    commitPreferences(normalizeAppPreferences({
      ...previousPreferences,
      reminders: {
        ...previousPreferences.reminders,
        times: previousPreferences.reminders.times.filter((item) => item !== time),
      },
    }));
  };

  const monthSummaries = useMemo(
    () => dataMode === 'cloud' ? cloudEntryMonths : getLocalMonthSummaries(entries),
    [cloudEntryMonths, dataMode, entries]
  );

  useEffect(() => {
    if (dataMode !== 'cloud' || !authUser) return;
    const current = getCurrentDateContext(new Date(`${currentDate}T12:00:00`));
    void loadCloudMonth(current.year, current.month);
  }, [authUser, currentDate, dataMode, loadCloudMonth]);

  useEffect(() => {
    if (dataMode !== 'cloud' || !authUser) return;
    if (activeTab === 'log' || activeTab === 'report') {
      void loadCloudEntryMonths();
    }
    if (activeTab === 'calendar') {
      void loadCloudMonth(calendarYear, calendarMonth);
    }
    if (activeTab === 'report' && reportRange === 'month') {
      void loadCloudMonth(selectedYear, selectedMonth);
    }
    if (activeTab === 'report' && reportRange === 'year') {
      void loadCloudYearlyReport(selectedYear);
    }
  }, [
    activeTab,
    authUser,
    calendarMonth,
    calendarYear,
    dataMode,
    loadCloudEntryMonths,
    loadCloudMonth,
    loadCloudYearlyReport,
    reportRange,
    selectedMonth,
    selectedYear,
  ]);

  const todayEntry = useMemo(() => {
    return entries.find((entry) => entry.date === currentDate);
  }, [currentDate, entries]);

  const calendarEditorEntry = useMemo(
    () => entries.find((entry) => entry.date === calendarEditorDate),
    [entries, calendarEditorDate]
  );
  const disableCalendarInitialAnimation = activeTab === 'calendar' && !calendarTransitionHasMounted.current;
  const isSecondarySettingsOpen = isRecordFieldSettingsOpen || isReminderSettingsOpen;

  const monthOptions = useMemo(() => {
    const currentYearMonth = getCurrentDateContext(new Date(`${currentDate}T12:00:00`));
    const months = monthSummaries.length > 0
      ? monthSummaries
      : [{ year: currentYearMonth.year, month: currentYearMonth.month }];

    return months.map((yearMonth) => ({
      ...yearMonth,
      label: formatYearMonth(yearMonth),
    }));
  }, [currentDate, monthSummaries]);

  const yearOptions = useMemo(() => {
    const years = [...new Set(monthOptions.map((option) => option.year))];
    return years.length > 0 ? years : [selectedYear];
  }, [monthOptions, selectedYear]);
  const totalEntryCount = monthSummaries.reduce((total, month) => total + month.count, 0);
  const nextUnloadedMonth = dataMode === 'cloud'
    ? monthSummaries.find((month) => !loadedMonthKeys.includes(formatMonthKey(month.year, month.month)))
    : undefined;
  const yearlyReport = dataMode === 'cloud'
    ? yearlyReports[selectedYear] || getYearlyReportData([], selectedYear)
    : getYearlyReportData(entries, selectedYear);

  return (
    <div id="app-viewport-wrapper" className="h-dvh overflow-hidden bg-[#EAE7E2] flex items-center justify-center p-0 sm:pt-6 sm:pb-0 md:pt-10">
      {/* Smartphone Outer Container Shell (adds magnificent fidelity for desktop, fluid responsive on mobile) */}
      <div
        id="phone-shell"
        className="w-full h-full sm:max-w-[420px] sm:h-[min(860px,calc(100dvh-1.5rem))] md:h-[min(860px,calc(100dvh-2.5rem))] bg-[#F9F8F6] sm:rounded-[40px] sm:shadow-2xl overflow-hidden flex flex-col relative sm:border-x-[10px] sm:border-t-[10px] sm:border-white text-[#4A4540]"
      >
        {/* Phone Speaker/Camera Notch decorator on desktop */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-white rounded-full border border-[#F2EDE9] z-40"></div>

        <GlobalToast toast={toast} />

        {/* Scrollable Content Pane */}
        <div
          id="main-scroll-pane"
          className={`relative flex-1 overflow-y-auto pt-8 px-5 scrollbar-none ${
            isSecondarySettingsOpen ? 'pb-8' : 'pb-24'
          }`}
        >
          
          {/* TAB 1: LOG HISTORY (日历打卡历史) */}
          {activeTab === 'log' && (
            <div id="log-view-pane" className="flex flex-col gap-4">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-2xl font-bold text-[#4A4540] flex items-center gap-2">
                  <span>打卡日志</span>
                  <SyncStatusIcon isSyncing={isCloudSyncing} />
                </h2>
                <span className="text-xs bg-[#E6F0E6] text-[#8FA88B] font-semibold px-2.5 py-1 rounded-full">
                  共 {dataMode === 'cloud' && hasLoadedCloudEntryMonths ? totalEntryCount : entries.length} 篇
                </span>
              </div>

              {/* Search & Filter controls */}
              <div className="bg-white rounded-2xl p-4 border border-[#F2EDE9] shadow-xs flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="搜索日志备注内容..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100/50 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-[#8FA88B] focus:bg-white"
                  />
                </div>

                {/* Mood Quick Filter row */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase shrink-0">心情筛选:</span>
                  <button
                    onClick={() => setSelectedMoodFilter(null)}
                    className={`text-[10px] px-2 py-1 rounded-full font-medium shrink-0 ${
                      selectedMoodFilter === null
                        ? 'bg-[#8FA88B] text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    全部
                  </button>
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                    <button
                      key={score}
                      onClick={() => setSelectedMoodFilter(score)}
                      className={`text-[10px] px-2 py-1 rounded-full font-medium flex items-center gap-0.5 shrink-0 transition-colors ${
                        selectedMoodFilter === score
                          ? 'bg-[#8FA88B] text-white shadow-xs font-semibold'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <span>{score}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Log Cards Timeline */}
              <div className="flex flex-col gap-3 mt-1">
                {entries
                  .filter((e) => {
                    const journal = typeof e.values.journal === 'string' ? e.values.journal : '';
                    const moodLevel = getOptionalNumber(e.values.moodLevel);
                    const matchesSearch = journal.toLowerCase().includes(logSearchQuery.toLowerCase());
                    const matchesMood = selectedMoodFilter === null || moodLevel === selectedMoodFilter;
                    return matchesSearch && matchesMood;
                  })
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((e) => {
                    const moodLevel = getOptionalNumber(e.values.moodLevel);
                    const sleepQuality = getOptionalNumber(e.values.sleepQuality);
                    const activities = Array.isArray(e.values.activities) ? e.values.activities as string[] : [];
                    const journal = typeof e.values.journal === 'string' ? e.values.journal : '';
                    return (
                      <div
                        key={e.id}
                        className="bg-white border border-gray-100/60 rounded-3xl p-5 shadow-xs flex flex-col gap-3 relative hover:shadow-md transition-shadow duration-300"
                      >
                        {/* Top row */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-gray-400 font-mono">{e.date}</span>
                            {moodLevel !== null && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-7 h-7 rounded-full bg-[#E6F0E6] flex items-center justify-center text-[#8FA88B] shadow-inner">
                                  <Smile size={15} />
                                </div>
                                <span className="text-xs font-semibold text-gray-700">心情 {formatScaleValue(moodLevel)}</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => requestDeleteEntry(e.id)}
                            className="text-rose-500 bg-rose-50 p-1.5 rounded-full hover:text-rose-600 hover:bg-rose-100 transition-colors"
                            title="删除记录"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Middle metrics row */}
                        {(sleepQuality !== null || moodLevel !== null) && (
                          <div
                            className={`grid ${
                              sleepQuality !== null && moodLevel !== null ? 'grid-cols-2' : 'grid-cols-1'
                            } gap-2 bg-gray-50/50 rounded-2xl p-2.5 text-xs text-gray-500`}
                          >
                            {sleepQuality !== null && (
                              <div className="flex items-center gap-1">
                                <Moon size={12} className="text-indigo-400" />
                                <span>睡眠质量：<strong className="text-gray-700">{formatScaleValue(sleepQuality)}</strong></span>
                              </div>
                            )}
                            {moodLevel !== null && (
                              <div className="flex items-center gap-1">
                                <Smile size={12} className="text-[#8FA88B]" />
                                <span>心情：<strong className="text-gray-700">{formatScaleValue(moodLevel)}</strong></span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Activities row */}
                        {activities.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {activities.map((actId) => {
                              const act = getActivityOption(actId);
                              if (!act) return null;
                              return (
                                <span
                                  key={actId}
                                  className="text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-gray-100/30"
                                >
                                  <span>{act.emoji}</span>
                                  <span>{act.label}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Notes reflection text */}
                        {journal && (
                          <p className="text-xs text-gray-600 font-normal leading-relaxed italic border-l-2 border-[#8FA88B] pl-2.5 py-0.5 bg-[#E6F0E6]/20 rounded-r-lg">
                            &ldquo;{journal}&rdquo;
                          </p>
                        )}
                      </div>
                    );
                  })}

                {entries.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="text-4xl mb-2">🌿</span>
                    <h3 className="font-semibold text-gray-600">
                      {nextUnloadedMonth ? '当前月份还没有记录' : '还没有任何打卡记录'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-[210px]">
                      {nextUnloadedMonth ? '可以继续加载更早月份，或记录今天的状态。' : '点击下方中间的绿色按钮，记录下你的第一篇心情吧！'}
                    </p>
                  </div>
                )}

                {nextUnloadedMonth && (
                  <button
                    type="button"
                    onClick={() => void loadCloudMonth(nextUnloadedMonth.year, nextUnloadedMonth.month)}
                    className="mx-auto mt-1 flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#D8E7D6] bg-white px-5 text-xs font-bold text-[#6E876B] shadow-xs transition-all hover:bg-[#E6F0E6]/50 active:scale-95"
                  >
                    <ChevronDown size={14} />
                    加载 {nextUnloadedMonth.year}年{nextUnloadedMonth.month}月
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REPORTS (可视化报告分析) */}
          {activeTab === 'report' && (
            <div id="report-view-pane" className="flex flex-col gap-4">
              {/* Header with Monthly/Yearly toggle */}
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-2xl font-bold text-[#4A4540] flex items-center gap-2">
                  <span>报告</span>
                  <SyncStatusIcon isSyncing={isCloudSyncing} />
                </h2>
                
                {/* Custom Month/Year toggle tabs */}
                <div className="bg-gray-200/60 p-0.5 rounded-xl flex items-center relative shadow-inner">
                  <button
                    onClick={() => setReportRange('month')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      reportRange === 'month'
                        ? 'bg-white text-[#8FA88B] shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    月度
                  </button>
                  <button
                    onClick={() => setReportRange('year')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      reportRange === 'year'
                        ? 'bg-white text-[#8FA88B] shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    年度
                  </button>
                </div>
              </div>

              {/* Functional Month Selector dropdown */}
              <div className="relative z-20">
                <button
                  onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                  className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-xs w-fit cursor-pointer"
                >
                  <span>{reportRange === 'year' ? `${selectedYear}年` : `${selectedYear}年 ${selectedMonth}月`}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMonthDropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-40 bg-white border border-gray-100 rounded-2xl shadow-lg py-1.5 z-30 animate-in fade-in slide-in-from-top-1">
                    {reportRange === 'month'
                      ? monthOptions.map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => {
                            setSelectedYear(opt.year);
                            setSelectedMonth(opt.month);
                            setIsMonthDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                            selectedYear === opt.year && selectedMonth === opt.month
                              ? 'bg-green-50 text-green-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))
                      : yearOptions.map((year) => (
                        <button
                          key={year}
                          onClick={() => {
                            setSelectedYear(year);
                            setIsMonthDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                            selectedYear === year
                              ? 'bg-green-50 text-green-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {year}年
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Dashboard report cards rendering */}
              {reportRange === 'year' ? (
                <YearlyReportOverview report={yearlyReport} />
              ) : (
                <>
                  <MoodFlowChart
                    entries={entries}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                  />

                  <MoodDistribution
                    entries={entries}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                  />

                  <SleepMoodChart
                    entries={entries}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                  />
                </>
              )}
            </div>
          )}

          {/* TAB 3: CALENDAR (月视图与日期记录) */}
          {activeTab === 'calendar' && (
            <PageTransition key="calendar-month" disableInitialAnimation={disableCalendarInitialAnimation}>
              <CalendarMonthView
                entries={entries}
                selectedYear={calendarYear}
                selectedMonth={calendarMonth}
                todayDate={currentDate}
                onMonthChange={(year, month) => {
                  setCalendarYear(year);
                  setCalendarMonth(month);
                }}
                onSelectDate={(date) => {
                  setCalendarEditorDate(date);
                  setIsLogModalOpen(true);
                }}
                isSyncing={isCloudSyncing}
              />
            </PageTransition>
          )}

          {/* TAB 4: PROFILE & STREAKS (我的 & 植物架) */}
          {activeTab === 'profile' && !isSecondarySettingsOpen && (
            <div id="profile-view-pane" className="flex flex-col gap-4 pb-12">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 bg-[#E6F0E6] rounded-full border-[3px] border-white shadow-md overflow-hidden flex items-center justify-center text-3xl select-none">
                  🥑
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#4A4540]">打卡小助手</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{authUser?.email || '本地模式'}</p>
                </div>
              </div>

              {/* Account and cloud sync controls */}
              {showCloudAccount && (
                <div className="bg-white border border-[#F2EDE9] rounded-3xl p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#4A4540] text-sm flex items-center gap-1.5">
                        <Cloud size={16} className="text-[#8FA88B]" />
                        <span>账号与云端同步</span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        {dataMode === 'cloud'
                          ? '当前数据已保存在云端数据库，本地浏览器不再保留业务数据。'
                          : '未登录时默认使用 localStorage，本地离线记录不会强制上传。'}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                        dataMode === 'cloud'
                          ? 'bg-[#E6F0E6] text-[#8FA88B]'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {dataMode === 'cloud' ? '云端同步' : '本地模式'}
                    </span>
                  </div>

                  {authUser ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthDialogMode('password')}
                        className="h-11 rounded-full bg-gray-50 hover:bg-[#E6F0E6]/50 border border-[#F2EDE9] text-[#4A4540] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <KeyRound size={15} className="text-[#8FA88B]" />
                        <span>修改密码</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="h-11 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <LogOut size={15} />
                        <span>退出登录</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthDialogMode('login')}
                        className="h-11 rounded-full bg-[#8FA88B] hover:bg-[#7D9779] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <LogIn size={15} />
                        <span>登录</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthDialogMode('register')}
                        className="h-11 rounded-full bg-gray-50 hover:bg-[#E6F0E6]/50 border border-[#F2EDE9] text-[#4A4540] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <UserPlus size={15} className="text-[#8FA88B]" />
                        <span>注册</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div
                id="profile-settings-group"
                className="overflow-hidden rounded-3xl border border-[#F2EDE9] bg-white shadow-xs"
              >
                <button
                  type="button"
                  onClick={navigateToRecordFieldSettings}
                  className="flex min-h-[88px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#E6F0E6]/25 active:bg-[#E6F0E6]/45"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E6F0E6] text-[#8FA88B]">
                      <SlidersHorizontal size={19} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#4A4540]">记录模块</span>
                      <span className="mt-1 block text-xs leading-relaxed text-gray-400">
                        选择新建和编辑记录时显示的内容
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[#8FA88B]">
                    <span className="font-mono text-[10px] font-bold">
                      已启用 {preferences.enabledRecordFieldIds.length} 项
                    </span>
                    <ChevronRight size={17} />
                  </span>
                </button>

                {isNativeMobile && (
                  <button
                    type="button"
                    onClick={navigateToReminderSettings}
                    className="flex min-h-[88px] w-full items-center justify-between gap-4 border-t border-[#F2EDE9] px-5 py-4 text-left transition-colors hover:bg-[#FAF0ED]/35 active:bg-[#FAF0ED]/60"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF0ED] text-[#D48166]">
                        <BellRing size={19} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#4A4540]">打卡提醒</span>
                        <span className="mt-1 block text-xs leading-relaxed text-gray-400">
                          设置每天提醒记录的时间
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[#8FA88B]">
                      <span className="text-[10px] font-bold">
                        {preferences.reminders.enabled
                          ? `已开启 · ${preferences.reminders.times.length} 个`
                          : '未开启'}
                      </span>
                      <ChevronRight size={17} />
                    </span>
                  </button>
                )}
              </div>

              <div className="bg-white border border-[#F2EDE9] rounded-3xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#4A4540] text-sm flex items-center gap-1.5">
                      <Smartphone size={16} className="text-[#8FA88B]" />
                      <span>Android 版本</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      前往 GitHub Releases 下载最新 APK 安装包。
                    </p>
                  </div>
                  <span className="text-[10px] bg-[#E6F0E6] text-[#8FA88B] font-bold px-2 py-1 rounded-full shrink-0">
                    APK
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => window.open(ANDROID_RELEASES_URL, '_blank', 'noopener,noreferrer')}
                  className="h-11 rounded-full bg-[#8FA88B] hover:bg-[#7D9779] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Download size={15} />
                  <span>下载 Android 版本</span>
                  <ExternalLink size={13} />
                </button>
              </div>

              {/* Data backup disclaimer */}
              <div className="bg-white border border-[#F2EDE9] rounded-3xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#4A4540] text-sm flex items-center gap-1.5">
                      <Database size={16} className="text-[#8FA88B]" />
                      <span>数据管理</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      将本地记录导出为 JSON，或导入已有备份覆盖当前数据。
                    </p>
                  </div>
                  <span className="text-[10px] bg-[#E6F0E6] text-[#8FA88B] font-bold px-2 py-1 rounded-full shrink-0">
                    JSON
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="h-11 rounded-full bg-[#8FA88B] hover:bg-[#7D9779] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Download size={15} />
                    <span>导出 JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => importFileInputRef.current?.click()}
                    className="h-11 rounded-full bg-gray-50 hover:bg-[#E6F0E6]/50 border border-[#F2EDE9] text-[#4A4540] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Upload size={15} className="text-[#8FA88B]" />
                    <span>导入 JSON</span>
                  </button>
                </div>

                <input
                  ref={importFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportDataFile}
                  className="hidden"
                />
              </div>

              <div className="text-[11px] text-gray-400 text-center leading-relaxed px-4">
                {dataMode === 'cloud' ? (
                  <span>提示：当前为云端同步模式，记录会保存在后端数据库中。</span>
                ) : (
                  <>
                    <span>提示：打卡数据由本地浏览器离线安全存储（</span>
                    <span className="font-mono">localStorage</span>
                    <span>），清除浏览器缓存将重置进度。</span>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && isRecordFieldSettingsOpen && (
            <PageTransition key="record-field-settings">
              <RecordFieldSettingsPage
                enabledFieldIds={preferences.enabledRecordFieldIds}
                isSyncing={isCloudSyncing}
                onBack={() => navigateToTab('profile')}
                onToggle={handleToggleRecordField}
              />
            </PageTransition>
          )}

          {activeTab === 'profile' && isReminderSettingsOpen && isNativeMobile && (
            <PageTransition key="reminder-settings">
              <ReminderSettingsPage
                reminders={preferences.reminders}
                permissionState={reminderPermissionState}
                exactAlarmState={reminderExactAlarmState}
                isPermissionBusy={isReminderPermissionBusy}
                isExactAlarmBusy={isReminderExactAlarmBusy}
                isSyncing={isCloudSyncing}
                onBack={() => navigateToTab('profile')}
                onToggle={(enabled) => void handleToggleReminders(enabled)}
                onRequestExactAlarmPermission={() => void handleRequestReminderExactAlarmPermission()}
                onAddTime={handleAddReminderTime}
                onRemoveTime={handleRemoveReminderTime}
              />
            </PageTransition>
          )}

        </div>

        {/* BOTTOM TAB NAVIGATION BAR (custom curved central action shape) */}
        {!isSecondarySettingsOpen && (
          <div id="bottom-nav-bar" className="absolute bottom-0 left-0 right-0 h-20 bg-white border-t border-[#F2EDE9] flex justify-around items-center px-4 z-40 select-none">
          {/* Tab 1: Log History */}
          <button
            onClick={() => navigateToTab('log')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all duration-200 ${
              activeTab === 'log' ? 'text-[#8FA88B] scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Calendar size={22} className={activeTab === 'log' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            <span className="text-[10px] font-bold">日志</span>
          </button>

          {/* Tab 2: Reports */}
          <button
            onClick={() => navigateToTab('report')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all duration-200 ${
              activeTab === 'report' ? 'text-[#8FA88B] scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <BarChart3 size={22} className={activeTab === 'report' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            <span className="text-[10px] font-bold">趋势</span>
          </button>

          {/* Central floating smiley Action Button */}
          <div className="relative w-[76px] h-20 flex items-start justify-center">
            <div className="absolute top-[-18px] left-1/2 -translate-x-1/2 bg-[#F9F8F6] w-[76px] h-[76px] rounded-full border-t border-[#F2EDE9]"></div>
            <button
              onClick={() => {
                setCalendarEditorDate(null);
                setIsLogModalOpen(true);
              }}
              className="absolute top-[-10px] left-1/2 -translate-x-1/2 bg-[#8FA88B] text-white hover:bg-[#7D9779] hover:scale-105 active:scale-95 transition-all w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-md border-2 border-white select-none cursor-pointer z-10"
              title="记录今天指标"
            >
              <Plus size={20} strokeWidth={3} className="text-white" />
            </button>
          </div>

          {/* Tab 3: Calendar */}
          <button
            onClick={() => navigateToTab('calendar')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all duration-200 ${
              activeTab === 'calendar' ? 'text-[#8FA88B] scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <CalendarDays size={22} className={activeTab === 'calendar' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            <span className="text-[10px] font-bold">日历</span>
          </button>

          {/* Tab 4: Profile */}
          <button
            onClick={() => navigateToTab('profile')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all duration-200 ${
              activeTab === 'profile' ? 'text-[#8FA88B] scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <User size={22} className={activeTab === 'profile' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            <span className="text-[10px] font-bold">我的</span>
          </button>
          </div>
        )}

        {/* Global Log modal drawer */}
        <LogModal
          isOpen={isLogModalOpen}
          onClose={() => {
            setIsLogModalOpen(false);
            setCalendarEditorDate(null);
          }}
          onSave={handleSaveEntry}
          todayDate={currentDate}
          initialDate={calendarEditorDate || undefined}
          entry={calendarEditorEntry || todayEntry}
          enabledFieldIds={preferences.enabledRecordFieldIds}
        />

        <ConfirmDialog
          isOpen={Boolean(pendingDelete)}
          title="确认删除"
          description="这条打卡记录会从当前数据源中移除，删除后无法恢复。"
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />

        {showCloudAccount && authDialogMode && (
          <AuthDialog
            isOpen={Boolean(authDialogMode)}
            mode={authDialogMode}
            cloudStore={cloudStore}
            currentUser={authUser}
            onModeChange={setAuthDialogMode}
            onAuthenticated={handleAuthenticated}
            onPasswordChanged={() => setDataStatus('success', '密码已更新。')}
            onError={(message) => setDataStatus('error', message)}
            onClose={() => setAuthDialogMode(null)}
          />
        )}

        {showCloudAccount && (
          <DataSourceChoiceDialog
            isOpen={Boolean(pendingSourceUser)}
            email={pendingSourceUser?.email}
            isBusy={isSourceChoiceBusy}
            onUseLocal={handleUseLocalData}
            onUseCloud={handleUseCloudData}
            onCancel={handleCancelSourceChoice}
          />
        )}

        <UpdatePrompt
          manifest={updateManifest}
          onDismiss={() => setUpdateManifest(null)}
          onDownload={(apkUrl) => {
            window.open(apkUrl, '_blank', 'noopener,noreferrer');
            setUpdateManifest(null);
          }}
        />

      </div>
    </div>
  );
}
