import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moodtracker.app',
  appName: 'Mood Tracker',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_mood_tree',
      iconColor: '#8FA88B',
      presentationOptions: ['sound', 'banner', 'list'],
    },
  },
};

export default config;
