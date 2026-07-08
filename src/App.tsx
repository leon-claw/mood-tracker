import { useState, useEffect, useMemo, useRef } from 'react';
import type { ChangeEvent } from 'react';
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
import { AppTab, getHashForTab, getTabFromHash } from './routes';
import { getActivityOption } from './fieldSchema';
import { createExportJson, parseImportJson } from './dataPortability';
import { createLogEntry } from './logEntry';
import {
  clearLocalAppData,
  hasLocalBusinessData,
  readLocalAppData,
  writeLocalAppData,
} from './localDataStore';
import { AuthUser, createCloudDataStore } from './cloudDataStore';
import { appConfig } from './appConfig';
import { fetchUpdateManifest, isVersionNewer, UpdateManifest } from './updateCheck';
import { exportJsonFile } from './androidExport';

import {
  Calendar,
  BarChart3,
  CalendarDays,
  User,
  Plus,
  Search,
  ChevronDown,
  Trash2,
  Award,
  Moon,
  Smile,
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Cloud,
  KeyRound,
  LogIn,
  LogOut,
  UserPlus,
} from 'lucide-react';

type DataMode = 'local' | 'cloud';

const cloudStore = createCloudDataStore(fetch, { apiBaseUrl: appConfig.apiBaseUrl });

const applyAppData = (
  data: ReturnType<typeof readLocalAppData>,
  setters: {
    setEntries: (entries: LogEntry[]) => void;
    setPoints: (points: number) => void;
    setUnlockedItems: (items: string[]) => void;
    setIsPremiumUnlocked: (value: boolean) => void;
  }
) => {
  setters.setEntries(data.entries);
  setters.setPoints(data.points);
  setters.setUnlockedItems(data.unlockedItems);
  setters.setIsPremiumUnlocked(data.isPremiumUnlocked);
};

export default function App() {
  // 1. State Initialization
  const initialLocalData = useMemo(() => readLocalAppData(), []);
  const [entries, setEntries] = useState<LogEntry[]>(() => initialLocalData.entries);

  const [activeTab, setActiveTab] = useState<AppTab>(() => getTabFromHash(window.location.hash));
  const [reportRange, setReportRange] = useState<'month' | 'year'>('month');
  const [dataMode, setDataMode] = useState<DataMode>('local');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authDialogMode, setAuthDialogMode] = useState<AuthDialogMode | null>(null);
  const [pendingSourceUser, setPendingSourceUser] = useState<AuthUser | null>(null);
  const [isSourceChoiceBusy, setIsSourceChoiceBusy] = useState(false);
  const [updateManifest, setUpdateManifest] = useState<UpdateManifest | null>(null);
  const showCloudAccount = appConfig.showCloudAccount;

  // Month and Year selector states
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Default to June 2026 matching screenshots
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(6);
  const [calendarEditorDate, setCalendarEditorDate] = useState<string | null>(null);

  // Gamification & Unlock states
  const [points, setPoints] = useState<number>(() => initialLocalData.points);
  const [unlockedItems, setUnlockedItems] = useState<string[]>(() => initialLocalData.unlockedItems);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState<boolean>(() => initialLocalData.isPremiumUnlocked);
  // Daily Logging modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [dataImportStatus, setDataImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Search & Filter state for Log history tab
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; closeCalendarEditor?: boolean } | null>(null);
  const calendarTransitionHasMounted = useRef(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Save states to LocalStorage only while the app is in guest/local mode.
  useEffect(() => {
    if (dataMode !== 'local') return;
    writeLocalAppData({
      entries,
      points,
      unlockedItems,
      isPremiumUnlocked,
    });
  }, [dataMode, entries, points, unlockedItems, isPremiumUnlocked]);

  useEffect(() => {
    let isCancelled = false;

    const restoreSession = async () => {
      if (!showCloudAccount) return;
      const user = await cloudStore.getMe();
      if (!user || isCancelled) return;

      setAuthUser(user);
      if (hasLocalBusinessData()) {
        setPendingSourceUser(user);
        return;
      }

      const cloudData = await cloudStore.getData();
      if (isCancelled) return;
      applyAppData(cloudData, {
        setEntries,
        setPoints,
        setUnlockedItems,
        setIsPremiumUnlocked,
      });
      clearLocalAppData();
      setDataMode('cloud');
    };

    void restoreSession();
    return () => {
      isCancelled = true;
    };
  }, [showCloudAccount]);

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', getHashForTab(activeTab));
    }

    const handleHashChange = () => {
      setActiveTab(getTabFromHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  const getCurrentAppData = () => ({
    entries,
    points,
    unlockedItems,
    isPremiumUnlocked,
  });

  const setDataStatus = (type: 'success' | 'error', message: string) => {
    setDataImportStatus({ type, message });
  };

  const syncUserState = async (nextPoints = points, nextUnlockedItems = unlockedItems, nextPremium = isPremiumUnlocked) => {
    if (dataMode !== 'cloud') return;
    await cloudStore.updateUserState({
      points: nextPoints,
      unlockedItems: nextUnlockedItems,
      isPremiumUnlocked: nextPremium,
    });
  };

  const handleAuthenticated = async (user: AuthUser) => {
    setAuthUser(user);
    if (hasLocalBusinessData()) {
      setPendingSourceUser(user);
      return;
    }

    try {
      const cloudData = await cloudStore.getData();
      applyAppData(cloudData, {
        setEntries,
        setPoints,
        setUnlockedItems,
        setIsPremiumUnlocked,
      });
      clearLocalAppData();
      setDataMode('cloud');
      setDataStatus('success', '已进入云端同步模式。');
    } catch (error) {
      setDataStatus('error', error instanceof Error ? error.message : '云端数据读取失败。');
    }
  };

  const handleUseLocalData = async () => {
    setIsSourceChoiceBusy(true);
    try {
      const uploaded = await cloudStore.replaceData(readLocalAppData());
      applyAppData(uploaded, {
        setEntries,
        setPoints,
        setUnlockedItems,
        setIsPremiumUnlocked,
      });
      clearLocalAppData();
      setDataMode('cloud');
      setPendingSourceUser(null);
      setDataStatus('success', '本地数据已上传并覆盖云端。');
    } catch (error) {
      setDataStatus('error', error instanceof Error ? error.message : '上传本地数据失败。');
    } finally {
      setIsSourceChoiceBusy(false);
    }
  };

  const handleUseCloudData = async () => {
    setIsSourceChoiceBusy(true);
    try {
      const cloudData = await cloudStore.getData();
      applyAppData(cloudData, {
        setEntries,
        setPoints,
        setUnlockedItems,
        setIsPremiumUnlocked,
      });
      clearLocalAppData();
      setDataMode('cloud');
      setPendingSourceUser(null);
      setDataStatus('success', '已使用云端数据，并清空本地记录。');
    } catch (error) {
      setDataStatus('error', error instanceof Error ? error.message : '云端数据读取失败。');
    } finally {
      setIsSourceChoiceBusy(false);
    }
  };

  const handleCancelSourceChoice = async () => {
    await cloudStore.logout();
    setAuthUser(null);
    setPendingSourceUser(null);
    setDataMode('local');
  };

  const handleLogout = async () => {
    await cloudStore.logout();
    setAuthUser(null);
    setDataMode('local');
    clearLocalAppData();
    const emptyData = readLocalAppData();
    applyAppData(emptyData, {
      setEntries,
      setPoints,
      setUnlockedItems,
      setIsPremiumUnlocked,
    });
    setDataStatus('success', '已退出登录，当前回到本地模式。');
  };

  // Handle saving new or updated log entry
  const handleSaveEntry = async (newEntryData: Omit<LogEntry, 'id'>) => {
    const existingIndex = entries.findIndex((e) => e.date === newEntryData.date);
    let updatedEntries = [...entries];
    let savedEntry: LogEntry | null = null;

    try {
      if (dataMode === 'cloud') {
        savedEntry = await cloudStore.upsertEntry(newEntryData);
      }

      if (existingIndex > -1) {
        // Update existing
        updatedEntries[existingIndex] = savedEntry || {
          ...entries[existingIndex],
          ...newEntryData,
        };
      } else {
        // Create new
        const newEntry = savedEntry || createLogEntry(newEntryData.date, newEntryData.values);
        updatedEntries.push(newEntry);
        const nextPoints = points + 50;
        setPoints(nextPoints);
        await syncUserState(nextPoints);
      }

      setEntries(updatedEntries);
    } catch (error) {
      setDataStatus('error', error instanceof Error ? error.message : '保存记录失败，请稍后再试。');
    }
  };

  const requestDeleteEntry = (id: string, options?: { closeCalendarEditor?: boolean }) => {
    setPendingDelete({ id, closeCalendarEditor: options?.closeCalendarEditor });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      if (dataMode === 'cloud') {
        await cloudStore.deleteEntry(pendingDelete.id);
      }
      setEntries((prev) => prev.filter((entry) => entry.id !== pendingDelete.id));
      if (pendingDelete.closeCalendarEditor) {
        setCalendarEditorDate(null);
      }
      setPendingDelete(null);
    } catch (error) {
      setDataStatus('error', error instanceof Error ? error.message : '删除失败，请稍后再试。');
    }
  };

  const handleExportData = async () => {
    const json = createExportJson(getCurrentAppData());
    try {
      await exportJsonFile({
        json,
        filename: `mood-tracker-export-${new Date().toISOString().slice(0, 10)}.json`,
      });
      setDataImportStatus({ type: 'success', message: '已导出 JSON 备份。' });
    } catch (error) {
      setDataImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '导出失败，请稍后再试。',
      });
    }
  };

  const handleImportDataFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    try {
      const imported = parseImportJson(await file.text());
      const nextData = dataMode === 'cloud' ? await cloudStore.replaceData(imported) : imported;
      applyAppData(nextData, {
        setEntries,
        setPoints,
        setUnlockedItems,
        setIsPremiumUnlocked,
      });
      setDataImportStatus({
        type: 'success',
        message: `已导入 ${imported.entries.length} 条记录。`,
      });
    } catch (error) {
      setDataImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '导入失败，请检查 JSON 文件。',
      });
    }
  };

  const handleTogglePremium = async () => {
    const nextPremium = !isPremiumUnlocked;
    setIsPremiumUnlocked(nextPremium);
    try {
      await syncUserState(points, unlockedItems, nextPremium);
    } catch (error) {
      setIsPremiumUnlocked(!nextPremium);
      setDataStatus('error', error instanceof Error ? error.message : '同步专业版状态失败。');
    }
  };

  // Calculate Streak Counts
  const streakInfo = useMemo(() => {
    // Sort all unique logged dates descending
    const loggedDates = Array.from(new Set<string>(entries.map((e) => e.date))).sort(
      (a: string, b: string) => b.localeCompare(a)
    );

    if (loggedDates.length === 0) return { currentStreak: 0, totalDays: 0 };

    let currentStreak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if the most recent log is today or yesterday to continue the streak
    const mostRecent = loggedDates[0];
    if (mostRecent !== todayStr && mostRecent !== yesterdayStr) {
      return { currentStreak: 0, totalDays: loggedDates.length };
    }

    // Traverse backward to count continuous days
    let expectedDate = new Date(mostRecent);
    for (let i = 0; i < loggedDates.length; i++) {
      const logDate = new Date(loggedDates[i]);
      // Math.abs diff in days
      const diffTime = Math.abs(expectedDate.getTime() - logDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        currentStreak++;
        expectedDate = logDate; // move expected backward
      } else {
        break;
      }
    }

    return {
      currentStreak,
      totalDays: loggedDates.length,
    };
  }, [entries]);

  const todayEntry = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return entries.find((entry) => entry.date === todayStr);
  }, [entries]);

  const calendarEditorEntry = useMemo(
    () => entries.find((entry) => entry.date === calendarEditorDate),
    [entries, calendarEditorDate]
  );
  const disableCalendarInitialAnimation = activeTab === 'calendar' && !calendarTransitionHasMounted.current;

  // Month selection options
  const monthOptions = [
    { year: 2026, month: 6, label: '2026年 6月' },
    { year: 2026, month: 7, label: '2026年 7月' },
    { year: 2026, month: 5, label: '2026年 5月' },
  ];

  return (
    <div id="app-viewport-wrapper" className="h-dvh overflow-hidden bg-[#EAE7E2] flex items-center justify-center p-0 sm:pt-6 sm:pb-0 md:pt-10">
      {/* Smartphone Outer Container Shell (adds magnificent fidelity for desktop, fluid responsive on mobile) */}
      <div
        id="phone-shell"
        className="w-full h-full sm:max-w-[420px] sm:h-[min(860px,calc(100dvh-1.5rem))] md:h-[min(860px,calc(100dvh-2.5rem))] bg-[#F9F8F6] sm:rounded-[40px] sm:shadow-2xl overflow-hidden flex flex-col relative sm:border-x-[10px] sm:border-t-[10px] sm:border-white text-[#4A4540]"
      >
        {/* Phone Speaker/Camera Notch decorator on desktop */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-white rounded-full border border-[#F2EDE9] z-40"></div>

        {/* Scrollable Content Pane */}
        <div id="main-scroll-pane" className="relative flex-1 overflow-y-auto pt-8 pb-24 px-5 scrollbar-none">
          
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
                    const moodLevel = typeof e.values.moodLevel === 'number' ? e.values.moodLevel : 0;
                    const matchesSearch = journal.toLowerCase().includes(logSearchQuery.toLowerCase());
                    const matchesMood = selectedMoodFilter === null || moodLevel === selectedMoodFilter;
                    return matchesSearch && matchesMood;
                  })
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((e) => {
                    const moodLevel = typeof e.values.moodLevel === 'number' ? e.values.moodLevel : 0;
                    const sleepQuality = typeof e.values.sleepQuality === 'number' ? e.values.sleepQuality : 0;
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
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-7 h-7 rounded-full bg-[#E6F0E6] flex items-center justify-center text-[#8FA88B] shadow-inner">
                                <Smile size={15} />
                              </div>
                              <span className="text-xs font-semibold text-gray-700">心情 {moodLevel}/10</span>
                            </div>
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
                        <div className="grid grid-cols-2 gap-2 bg-gray-50/50 rounded-2xl p-2.5 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Moon size={12} className="text-indigo-400" />
                            <span>睡眠质量：<strong className="text-gray-700">{sleepQuality}/10</strong></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Smile size={12} className="text-[#8FA88B]" />
                            <span>心情等级：<strong className="text-gray-700">{moodLevel}/10</strong></span>
                          </div>
                        </div>

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
                    <h3 className="font-semibold text-gray-600">还没有任何打卡记录</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">点击下方中间的绿色按钮，记录下你的第一篇心情吧！</p>
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
                <h2 className="text-2xl font-bold text-[#4A4540]">报告</h2>
                
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
                  <span>{selectedYear}年 {selectedMonth}月</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMonthDropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-40 bg-white border border-gray-100 rounded-2xl shadow-lg py-1.5 z-30 animate-in fade-in slide-in-from-top-1">
                    {monthOptions.map((opt) => (
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
                    ))}
                  </div>
                )}
              </div>

              {/* Dashboard report cards rendering */}
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
            </div>
          )}

          {/* TAB 3: CALENDAR (月视图与日期记录) */}
          {activeTab === 'calendar' && (
            <PageTransition key="calendar-month" disableInitialAnimation={disableCalendarInitialAnimation}>
              <CalendarMonthView
                entries={entries}
                selectedYear={calendarYear}
                selectedMonth={calendarMonth}
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
          {activeTab === 'profile' && (
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

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-[#F2EDE9] rounded-2xl p-3.5 text-center shadow-xs">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase leading-none mb-1.5">连续打卡</span>
                  <span className="text-lg font-bold text-[#8FA88B] font-mono leading-none">{streakInfo.currentStreak}</span>
                  <span className="text-[10px] text-gray-500 font-medium block mt-1">天</span>
                </div>
                <div className="bg-white border border-[#F2EDE9] rounded-2xl p-3.5 text-center shadow-xs">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase leading-none mb-1.5">打卡总天数</span>
                  <span className="text-lg font-bold text-[#4A4540] font-mono leading-none">{streakInfo.totalDays}</span>
                  <span className="text-[10px] text-gray-500 font-medium block mt-1">天</span>
                </div>
                <div className="bg-white border border-[#F2EDE9] rounded-2xl p-3.5 text-center shadow-xs">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase leading-none mb-1.5">可用积分</span>
                  <span className="text-lg font-bold text-[#D48166] font-mono leading-none">{points}</span>
                  <span className="text-[10px] text-gray-500 font-medium block mt-1">分</span>
                </div>
              </div>

              {/* Gamified unlocked Virtual Plant Shelf Display */}
              <div className="bg-white border border-[#F2EDE9] rounded-3xl p-5 shadow-xs">
                <h3 className="font-semibold text-[#4A4540] text-sm flex items-center gap-1.5 mb-3">
                  <Award size={16} className="text-[#D48166]" />
                  <span>我的疗愈植物架</span>
                </h3>
                
                {/* Virtual Shelf layout */}
                <div className="bg-[#FAF0ED]/40 border border-[#F2EDE9] rounded-2xl p-4 min-h-[100px] flex flex-col justify-between relative">
                  {/* Row of plants */}
                  <div className="flex justify-around items-end z-10 min-h-[50px] pb-1">
                    {unlockedItems.filter(id => id.startsWith('plant_')).map((id) => {
                      const label = id === 'plant_succulent' ? '🪴' : id === 'plant_cactus' ? '🌵' : '🌻';
                      return (
                        <div key={id} className="flex flex-col items-center group relative cursor-pointer transform hover:-translate-y-1 transition-transform">
                          <span className="text-4xl filter drop-shadow-sm">{label}</span>
                          <span className="absolute -bottom-6 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {id === 'plant_succulent' ? '多肉' : id === 'plant_cactus' ? '仙人掌' : '向日葵'}
                          </span>
                        </div>
                      );
                    })}

                    {unlockedItems.filter(id => id.startsWith('plant_')).length === 0 && (
                      <span className="text-xs text-gray-300 italic py-3">植物架空空如也，继续记录会慢慢长出新绿。</span>
                    )}
                  </div>
                  
                  {/* Wooden Shelf representation line */}
                  <div className="w-full h-2.5 bg-amber-800/60 rounded-full shadow-inner mt-2"></div>
                </div>
              </div>

              {/* Premium toggle option inside user profile */}
              <div className="bg-zinc-900 text-zinc-100 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute right-4 -bottom-6 opacity-10 text-9xl">👑</div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <span className="text-[10px] bg-amber-500 text-zinc-950 px-2 py-0.5 rounded-full font-bold">PREMIUM</span>
                    <h3 className="text-base font-bold mt-2">专业版健康管理</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-[200px] leading-normal">
                      开启专业版的全部精细运动趋势图标、睡眠环境健康洞察以及AI陪伴分析。
                    </p>
                  </div>
                  <button
                    onClick={handleTogglePremium}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      isPremiumUnlocked
                        ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        : 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-900 hover:brightness-105 shadow-md shadow-amber-500/20'
                    }`}
                  >
                    {isPremiumUnlocked ? '已开启' : '免费开启'}
                  </button>
                </div>
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

                {dataImportStatus && (
                  <div
                    className={`rounded-2xl px-3 py-2 text-xs font-medium flex items-start gap-2 ${
                      dataImportStatus.type === 'success'
                        ? 'bg-[#E6F0E6]/70 text-[#6E876B]'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {dataImportStatus.type === 'success' ? (
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    )}
                    <span>{dataImportStatus.message}</span>
                  </div>
                )}
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

        </div>

        {/* BOTTOM TAB NAVIGATION BAR (custom curved central action shape) */}
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
          <div className="relative -top-4">
            <div className="absolute inset-0 bg-[#F9F8F6] w-[72px] h-[72px] -top-3 left-1/2 -translate-x-1/2 rounded-full border-t border-[#F2EDE9]"></div>
            <button
              onClick={() => {
                setCalendarEditorDate(null);
                setIsLogModalOpen(true);
              }}
              className="relative -top-2.5 bg-[#8FA88B] text-white hover:bg-[#7D9779] hover:scale-105 active:scale-95 transition-all w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-md border-2 border-white select-none cursor-pointer z-10"
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

        {/* Global Log modal drawer */}
        <LogModal
          isOpen={isLogModalOpen}
          onClose={() => {
            setIsLogModalOpen(false);
            setCalendarEditorDate(null);
          }}
          onSave={handleSaveEntry}
          initialDate={calendarEditorDate || undefined}
          entry={calendarEditorEntry || todayEntry}
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
