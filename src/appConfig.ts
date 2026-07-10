export interface AppConfig {
  appVersion: string;
  updateManifestUrl: string;
  apiBaseUrl: string;
  isNativeAndroid: boolean;
  showCloudAccount: boolean;
}

type AppConfigEnv = Record<string, string | boolean | undefined>;

const DEFAULT_PRODUCTION_API_BASE_URL = 'https://mood-tracker.jianghong.site/api/';

const normalizeBaseUrl = (value?: string) => (value || '').trim().replace(/\/+$/, '');

export const createAppConfig = (env: AppConfigEnv = {}): AppConfig => {
  const configuredApiBaseUrl =
    typeof env.VITE_API_BASE_URL === 'string'
      ? env.VITE_API_BASE_URL
      : env.PROD
        ? DEFAULT_PRODUCTION_API_BASE_URL
        : '';
  const apiBaseUrl = normalizeBaseUrl(configuredApiBaseUrl);

  return {
    appVersion: String(env.VITE_ANDROID_APP_VERSION || env.VITE_APP_VERSION || '0.0.0'),
    updateManifestUrl: String(env.VITE_ANDROID_UPDATE_URL || '').trim(),
    apiBaseUrl,
    isNativeAndroid: env.VITE_CAPACITOR_PLATFORM === 'android',
    showCloudAccount: true,
  };
};

const viteEnv = (import.meta as ImportMeta & { env?: AppConfigEnv }).env || {};

export const appConfig = createAppConfig(viteEnv);
