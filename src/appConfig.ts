export interface AppConfig {
  appVersion: string;
  updateManifestUrl: string;
  isNativeAndroid: boolean;
}

type AppConfigEnv = Record<string, string | boolean | undefined>;

export const createAppConfig = (env: AppConfigEnv = {}): AppConfig => {
  return {
    appVersion: String(env.VITE_ANDROID_APP_VERSION || env.VITE_APP_VERSION || '0.0.0'),
    updateManifestUrl: String(env.VITE_ANDROID_UPDATE_URL || '').trim(),
    isNativeAndroid: env.VITE_CAPACITOR_PLATFORM === 'android',
  };
};

const viteEnv = (import.meta as ImportMeta & { env?: AppConfigEnv }).env || {};

export const appConfig = createAppConfig(viteEnv);
