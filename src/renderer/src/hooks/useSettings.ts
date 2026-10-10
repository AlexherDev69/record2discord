import { useCallback, useEffect, useState } from 'react';
import type { IpcResult, Settings } from '../../../shared/types';

export interface SettingsController {
  settings: Settings | null;
  save: (settings: Settings) => Promise<IpcResult<Settings>>;
}

export function useSettings(): SettingsController {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void window.api.getSettings().then(setSettings);
  }, []);

  const save = useCallback(async (next: Settings): Promise<IpcResult<Settings>> => {
    const result = await window.api.saveSettings(next);
    if (result.success) {
      setSettings(result.data);
    }
    return result;
  }, []);

  return { settings, save };
}
