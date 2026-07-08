export type AppTab = 'log' | 'report' | 'calendar' | 'profile';

export const tabRoutes: Record<AppTab, string> = {
  log: '#/log',
  report: '#/report',
  calendar: '#/calendar',
  profile: '#/profile',
};

export const getTabFromHash = (hash: string): AppTab => {
  const match = Object.entries(tabRoutes).find(([, route]) => route === hash);
  return (match?.[0] as AppTab | undefined) || 'report';
};

export const getHashForTab = (tab: AppTab) => tabRoutes[tab];
