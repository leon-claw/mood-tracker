import { Capacitor, registerPlugin } from '@capacitor/core';
import { AutoData, AutoModuleId } from './types';

export type AutoDataFieldId = 'autoSteps' | 'autoWeather' | 'autoScreenTime';
export type AutoDataStatus = 'granted' | 'permission-required' | 'unsupported' | 'error';

export interface AutoDataPermissionState {
  steps: AutoDataStatus;
  weather: AutoDataStatus;
  screenTime: AutoDataStatus;
}

export interface PendingAutoData {
  date: string;
  autoData: AutoData;
}

export interface AutoDataPlugin {
  configure(options: { enabledModules: AutoDataFieldId[] }): Promise<{ enabledModules: AutoDataFieldId[] }>;
  getPermissionState(): Promise<AutoDataPermissionState>;
  requestModulePermission(options: { module: AutoDataFieldId }): Promise<AutoDataPermissionState>;
  drainPending(): Promise<{ entries: PendingAutoData[] }>;
  getSchedulerState(): Promise<{ enabledModules: AutoDataFieldId[]; scheduled: boolean }>;
}

export const getEnabledAutoModules = (fieldIds: readonly string[]): AutoDataFieldId[] => {
  const supported = new Set<AutoDataFieldId>(['autoSteps', 'autoWeather', 'autoScreenTime']);
  const seen = new Set<AutoDataFieldId>();
  return fieldIds.reduce<AutoDataFieldId[]>((result, fieldId) => {
    if (supported.has(fieldId as AutoDataFieldId) && !seen.has(fieldId as AutoDataFieldId)) {
      seen.add(fieldId as AutoDataFieldId);
      result.push(fieldId as AutoDataFieldId);
    }
    return result;
  }, []);
};

export const shouldCollectModule = (
  module: AutoDataFieldId,
  enabledFieldIds: readonly string[],
) => getEnabledAutoModules(enabledFieldIds).includes(module);

const nativePlugin = registerPlugin<AutoDataPlugin>('AutoData');
const unsupportedPermissionState: AutoDataPermissionState = {
  steps: 'unsupported',
  weather: 'unsupported',
  screenTime: 'unsupported',
};

const isNative = () => Capacitor.isNativePlatform();

export const autoDataBridge = {
  configure: async (enabledFieldIds: readonly string[]) => {
    const enabledModules = getEnabledAutoModules(enabledFieldIds);
    if (!isNative()) return { enabledModules, supported: false };
    return { ...(await nativePlugin.configure({ enabledModules })), supported: true };
  },
  getPermissionState: async (): Promise<AutoDataPermissionState> => {
    if (!isNative()) return unsupportedPermissionState;
    return nativePlugin.getPermissionState();
  },
  requestModulePermission: async (module: AutoDataFieldId): Promise<AutoDataPermissionState> => {
    if (!isNative()) return unsupportedPermissionState;
    return nativePlugin.requestModulePermission({ module });
  },
  drainPending: async (): Promise<{ entries: PendingAutoData[] }> => {
    if (!isNative()) return { entries: [] };
    return nativePlugin.drainPending();
  },
  getSchedulerState: async () => {
    if (!isNative()) return { enabledModules: [], scheduled: false, supported: false };
    return { ...(await nativePlugin.getSchedulerState()), supported: true };
  },
};

export type AutoDataBridge = typeof autoDataBridge;
