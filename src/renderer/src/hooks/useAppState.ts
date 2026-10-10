import { useEffect, useState } from 'react';
import type { AppState } from '../../../shared/types';

/** Live state of the watcher, pushed by the main process. */
export function useAppState(): AppState | null {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    void window.api.getState().then(setState);
    return window.api.onState(setState);
  }, []);

  return state;
}
