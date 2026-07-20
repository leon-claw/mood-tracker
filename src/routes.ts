export type AppTab = 'log' | 'report' | 'calendar' | 'profile';

export const tabRoutes: Record<AppTab, string> = {
  log: '#/log',
  report: '#/report',
  calendar: '#/calendar',
  profile: '#/profile',
};

export const recordFieldSettingsRoute = '#/profile/record-fields';
export const reminderSettingsRoute = '#/profile/reminders';

export const isRecordFieldSettingsHash = (hash: string) => hash === recordFieldSettingsRoute;
export const isReminderSettingsHash = (hash: string) => hash === reminderSettingsRoute;

export const getTabFromHash = (hash: string): AppTab => {
  if (isRecordFieldSettingsHash(hash) || isReminderSettingsHash(hash)) return 'profile';
  const match = Object.entries(tabRoutes).find(([, route]) => route === hash);
  return (match?.[0] as AppTab | undefined) || 'report';
};

export const getHashForTab = (tab: AppTab) => tabRoutes[tab];
