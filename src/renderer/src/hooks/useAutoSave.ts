import { useEffect, useRef, useState } from 'react';

// Waits for a pause in typing, since saving restarts the watcher.
const AUTO_SAVE_DELAY_MS = 800;

export type AutoSaveStatus = 'idle' | 'saved' | 'invalid';

/**
 * Saves `value` shortly after it stops changing, and when the component goes away with a change pending.
 * `save` resolves to false when the value was rejected.
 */
export function useAutoSave<Value>(value: Value, save: (value: Value) => Promise<boolean>): AutoSaveStatus {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const lastSaved = useRef(value);
  const latest = useRef({ value, save });

  useEffect(() => {
    latest.current = { value, save };
  });

  useEffect(() => {
    if (value === lastSaved.current) {
      return;
    }
    setStatus('idle');
    const timer = setTimeout(() => {
      lastSaved.current = value;
      // A save that could not even be sent is reported like a rejected value.
      const saving = latest.current.save(value).catch(() => false);
      void saving.then((accepted) => setStatus(accepted ? 'saved' : 'invalid'));
    }, AUTO_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(
    () => () => {
      if (latest.current.value !== lastSaved.current) {
        void latest.current.save(latest.current.value).catch(() => false);
      }
    },
    [],
  );

  return status;
}
