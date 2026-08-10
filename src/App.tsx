import { useState, useEffect, useMemo, useRef } from 'react';
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
import { UpdatePrompt } from './components/UpdatePrompt';
import { RecordFieldSettingsPage } from './components/RecordFieldSettingsPage';
import { ReminderSettingsPage } from './components/ReminderSettingsPage';
import { YearlyReportOverview } from './components/YearlyReportOverview';
import {
  GlobalToast,
  ToastMessage,
} from './components/Toast';
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
  createExportJson,
  parseImportJson,
} from './dataPortability';
import { createLogEntry } from './logEntry';
import {
  readLocalAppData,
  writeLocalAppData,
} from './localDataStore';
import { appConfig } from './appConfig';
import { formatLocalDate, getCurrentDateContext, YearMonth } from './dateContext';
import { getAvailableReportMonths, getYearlyReportData } from './reportData';
import { fetchUpdateManifest, isVersionNewer, UpdateManifest } from './updateCheck';
import { exportJsonFile } from './androidExport';
import { autoDataBridge, getEnabledAutoModules } from './autoDataBridge';
import { hasManualLogValues, mergePendingAutoDataIntoEntries } from './autoDataService';
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
  Smartphone,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  BellRing,
} from 'lucide-react';

const ANDROID_RELEASES_URL = 'https://github.com/leon-claw/mood-tracker/releases';

const formatYearMonth = ({ year, month }: YearMonth) => `${year}年 ${month}月`;
const formatMonthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;
const getEntryMonthKey = (entry: Pick<LogEntry, 'date'>) => entry.date.slice(0, 7);

const getLocalMonthSummaries = (entries: LogEntry[]) =>
  getAvailableReportMonths(entries).map(({ year, month }) => ({
    year,
    month,
    count: entries.filter((entry) => getEntryMonthKey(entry) === formatMonthKey(year, month)).length,
  }));

const getOptionalNumber = (value: unknown) => typeof value === 'number' ? value : null;
const formatScaleValue = (value: number | null) => value === null ? '未记录' : `${value}/10`;

export default function App() {
  // 1. State Initialization
  const isNativeMobile = Capacitor.isNativePlatform();
  const initialLocalData = useMemo(() => readLocalAppData(), []);
  const initialDateContext = useMemo(() => getCurrentDateContext(), []);
  const [entries, setEntries] = useState<LogEntry[]>(() => initialLocalData.entries);
  const [currentDate, setCurrentDate] = useState(() => initialDateContext.date);

  const [activeTab, setActiveTab] = useState<AppTab>(() => getTabFromHash(window.location.hash));
  const [reportRange, setReportRange] = useState<'month' | 'year'>('month');
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

  // Search & Filter state for Log history tab
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; closeCalendarEditor?: boolean } | null>(null);
  const calendarTransitionHasMounted = useRef(false);
  const appDataRef = useRef(initialLocalData);
  const preferencesRef = useRef(preferences);
  const autoDataSyncRef = useRef<() => Promise<void>>(async () => undefined);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // All business data is persisted locally.
  useEffect(() => {
    writeLocalAppData({
      entries,
      points,
      unlockedItems,
      isPremiumUnlocked,
      preferences,
    });
  }, [entries, points, unlockedItems, isPremiumUnlocked, preferences]);

  useEffect(() => {
    const currentData = { entries, points, unlockedItems, isPremiumUnlocked, preferences };
    appDataRef.current = currentData;
    preferencesRef.current = preferences;
  }, [entries, points, unlockedItems, isPremiumUnlocked, preferences]);

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
        void autoDataSyncRef.current().catch((error) => {
          setToast({
            type: 'error',
            message: error instanceof Error ? error.message : '设备数据同步失败，请稍后再试。',
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
    if (!isNativeMobile) return;

    let isCancelled = false;
    void autoDataSyncRef.current().catch((error) => {
      if (!isCancelled) {
        setToast({
          type: 'error',
          message: error instanceof Error ? error.message : '设备数据同步失败，请稍后再试。',
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isNativeMobile, preferences.enabledRecordFieldIds.join('|')]);

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

  const syncAutoData = async () => {
    if (!isNativeMobile) return;

    const enabledFieldIds = preferencesRef.current.enabledRecordFieldIds;
    await autoDataBridge.configure(enabledFieldIds);
    const pending = await autoDataBridge.drainPending();
    if (pending.entries.length === 0) return;

    const currentData = appDataRef.current;
    const nextEntries = mergePendingAutoDataIntoEntries(
      currentData.entries,
      pending.entries,
      enabledFieldIds,
    );
    const changedEntries = [...new Set(pending.entries.map((item) => item.date))]
      .map((date) => nextEntries.find((entry) => entry.date === date))
      .filter((entry): entry is LogEntry => Boolean(entry && entry.autoData));
    if (changedEntries.length === 0) return;

    appDataRef.current = { ...currentData, entries: nextEntries };
    setEntries(nextEntries);
  };
  autoDataSyncRef.current = syncAutoData;

  // Apply record changes immediately; the persistence effect writes them locally.
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

    const shouldRewardManualEntry = !existingEntry || !hasManualLogValues(existingEntry.values);
    const nextPoints = shouldRewardManualEntry ? currentData.points + 50 : currentData.points;
    appDataRef.current = {
      ...currentData,
      entries: nextEntries,
      points: nextPoints,
    };
    setEntries(nextEntries);
    if (shouldRewardManualEntry) setPoints(nextPoints);
  };

  const requestDeleteEntry = (id: string, options?: { closeCalendarEditor?: boolean }) => {
    setPendingDelete({ id, closeCalendarEditor: options?.closeCalendarEditor });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const deleteRequest = pendingDelete;
    const currentData = appDataRef.current;
    const nextEntries = currentData.entries.filter((entry) => entry.id !== deleteRequest.id);

    appDataRef.current = { ...currentData, entries: nextEntries };
    setEntries(nextEntries);
    if (deleteRequest.closeCalendarEditor) setCalendarEditorDate(null);
    setPendingDelete(null);
  };

  const handleExportData = async () => {
    try {
      const json = createExportJson(getCurrentAppData());
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
      setEntries(imported.entries);
      setPoints(imported.points);
      setUnlockedItems(imported.unlockedItems);
      setIsPremiumUnlocked(imported.isPremiumUnlocked);
      setPreferences(imported.preferences);
      appDataRef.current = imported;
      preferencesRef.current = imported.preferences;
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

    if (!isEnabled && isNativeMobile && getEnabledAutoModules([fieldId]).length > 0) {
      const autoFieldId = fieldId as 'autoSteps' | 'autoWeather' | 'autoScreenTime';
      void autoDataBridge.configure(nextPreferences.enabledRecordFieldIds)
        .then(() => autoDataBridge.requestModulePermission(autoFieldId))
        .then((permissionState) => {
          const module = fieldId === 'autoSteps'
            ? permissionState.steps
            : fieldId === 'autoWeather'
              ? permissionState.weather
              : permissionState.screenTime;
          if (module === 'permission-required') {
            setDataStatus('error', '请在系统设置中允许该设备数据权限，后台采集才能正常运行。');
          }
        })
        .catch(() => {
          setDataStatus('error', '无法申请设备数据权限，请稍后重试。');
        });
    }
  };

  const commitPreferences = (nextPreferences: AppPreferences) => {
    preferencesRef.current = nextPreferences;
    appDataRef.current = {
      ...appDataRef.current,
      preferences: nextPreferences,
    };
    setPreferences(nextPreferences);
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

  const monthSummaries = useMemo(() => getLocalMonthSummaries(entries), [entries]);

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
  const yearlyReport = getYearlyReportData(entries, selectedYear);

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
                </h2>
                <span className="text-xs bg-[#E6F0E6] text-[#8FA88B] font-semibold px-2.5 py-1 rounded-full">
                  共 {entries.length} 篇
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
                      还没有任何打卡记录
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-[210px]">
                      点击下方中间的绿色按钮，记录下你的第一篇心情吧！
                    </p>
                  </div>
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
                  <p className="text-xs text-gray-400 mt-0.5">本地存储</p>
                </div>
              </div>

              <div className="bg-white border border-[#F2EDE9] rounded-3xl p-5 shadow-xs flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#4A4540] text-sm flex items-center gap-1.5">
                      <Smartphone size={16} className="text-[#8FA88B]" />
                      <span>本地存储</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      记录、偏好和设备数据只保存在当前设备，建议定期导出 JSON 备份。
                    </p>
                  </div>
                  <span className="text-[10px] bg-[#E6F0E6] text-[#8FA88B] font-bold px-2 py-1 rounded-full shrink-0">
                    离线可用
                  </span>
                </div>
              </div>

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
                <>
                  <span>提示：打卡数据由本地浏览器离线安全存储（</span>
                  <span className="font-mono">localStorage</span>
                  <span>），清除浏览器缓存将重置进度。</span>
                </>
              </div>
            </div>
          )}

          {activeTab === 'profile' && isRecordFieldSettingsOpen && (
            <PageTransition key="record-field-settings">
              <RecordFieldSettingsPage
                enabledFieldIds={preferences.enabledRecordFieldIds}
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
          description="这条打卡记录会从本地数据中移除，删除后无法恢复。"
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />

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
