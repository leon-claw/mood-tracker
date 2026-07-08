import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface WriteTextFileInput {
  path: string;
  data: string;
}

interface ShareFileInput {
  uri: string;
  title: string;
}

export interface AndroidExportBridge {
  writeTextFile(input: WriteTextFileInput): Promise<{ uri: string }>;
  shareFile(input: ShareFileInput): Promise<void>;
}

interface ExportJsonFileInput {
  json: string;
  filename: string;
  bridge?: AndroidExportBridge | null;
}

const downloadInBrowser = (json: string, filename: string) => {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const createCapacitorExportBridge = (): AndroidExportBridge | null => {
  if (!Capacitor.isNativePlatform()) return null;

  return {
    async writeTextFile({ path, data }) {
      const file = await Filesystem.writeFile({
        path,
        data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      return { uri: file.uri };
    },
    async shareFile({ uri, title }) {
      await Share.share({
        title,
        url: uri,
      });
    },
  };
};

export const exportJsonFile = async ({ json, filename, bridge = createCapacitorExportBridge() }: ExportJsonFileInput) => {
  if (bridge) {
    const file = await bridge.writeTextFile({ path: filename, data: json });
    await bridge.shareFile({
      uri: file.uri,
      title: 'Mood Tracker JSON 备份',
    });
    return;
  }

  downloadInBrowser(json, filename);
};
