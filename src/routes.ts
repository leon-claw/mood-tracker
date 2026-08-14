export type AppTab = 'assistant' | 'report' | 'calendar' | 'profile';

export const assistantRoute = '#/assistant';
export const logHistoryRoute = '#/profile/log-history';

export const tabRoutes: Record<AppTab, string> = {
  assistant: assistantRoute,
  report: '#/report',
  calendar: '#/calendar',
  profile: '#/profile',
};

export const recordFieldSettingsRoute = '#/profile/record-fields';
export const reminderSettingsRoute = '#/profile/reminders';

export const isLogHistoryHash = (hash: string) => hash === logHistoryRoute;
export const isRecordFieldSettingsHash = (hash: string) => hash === recordFieldSettingsRoute;
export const isReminderSettingsHash = (hash: string) => hash === reminderSettingsRoute;

export const getTabFromHash = (hash: string): AppTab => {
  if (
    isLogHistoryHash(hash) ||
    isRecordFieldSettingsHash(hash) ||
    isReminderSettingsHash(hash)
  ) return 'profile';
  if (hash === '#/log') return 'assistant';
  const match = Object.entries(tabRoutes).find(([, route]) => route === hash);
  return (match?.[0] as AppTab | undefined) || 'report';
};

export const getHashForTab = (tab: AppTab) => tabRoutes[tab];
