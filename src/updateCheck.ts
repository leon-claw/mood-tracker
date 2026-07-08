export interface UpdateManifest {
  version: string;
  apkUrl: string;
  notes: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseVersion = (version: string) => {
  const parts = version.split('.');
  if (parts.length === 0 || parts.some((part) => !/^\d+$/.test(part))) return null;
  return parts.map((part) => Number(part));
};

export const isVersionNewer = (remoteVersion: string, currentVersion: string) => {
  const remote = parseVersion(remoteVersion);
  const current = parseVersion(currentVersion);
  if (!remote || !current) return false;

  const maxLength = Math.max(remote.length, current.length);
  for (let index = 0; index < maxLength; index += 1) {
    const remotePart = remote[index] || 0;
    const currentPart = current[index] || 0;
    if (remotePart > currentPart) return true;
    if (remotePart < currentPart) return false;
  }
  return false;
};

export const parseUpdateManifest = (value: unknown): UpdateManifest | null => {
  if (!isRecord(value) || typeof value.version !== 'string' || typeof value.apkUrl !== 'string') {
    return null;
  }

  return {
    version: value.version.trim(),
    apkUrl: value.apkUrl.trim(),
    notes: typeof value.notes === 'string' ? value.notes.trim() : '',
  };
};

export const fetchUpdateManifest = async (
  manifestUrl: string,
  fetcher: typeof fetch = fetch
) => {
  try {
    const response = await fetcher(manifestUrl, { cache: 'no-store' });
    if (!response.ok) return null;
    return parseUpdateManifest(await response.json());
  } catch {
    return null;
  }
};
