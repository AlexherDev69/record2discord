import { useCallback, useEffect, useState } from 'react';
import type { IpcResult, Settings } from '../../../shared/types';

export interface SettingsController {
  settings: Settings | null;
  /** Saves only the given fields. */
  save: SaveSettings;
}

export type SaveSettings = (patch: Partial<Settings>) => Promise<IpcResult<Settings>>;

export function useSettings(): SettingsController {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void window.api.getSettings().then(setSettings);
  }, []);

  const save = useCallback<SaveSettings>(async (patch) => {
    const result = await window.api.saveSettings(patch);
    if (result.success) {
      setSettings(result.data);
    }
    return result;
  }, []);

  return { settings, save };
}
