import { useEffect, useState } from 'react';
import type { ScoreRegions } from '../../../shared/types';
import { nextLivePreview, type LivePreview } from '../lib/livePreview';

const LIVE_PREVIEW_INTERVAL_MS = 1000;

interface LivePreviewResult {
  livePreview: LivePreview | null;
  error: string | null;
}

/** Polls what the app currently reads in the score regions, while enabled. */
export function useLivePreview(regions: ScoreRegions, enabled: boolean): LivePreviewResult {
  const [livePreview, setLivePreview] = useState<LivePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    let isReading = false;
    const refresh = async (): Promise<void> => {
      // A slow answer is not overtaken by a newer request, which would show readings out of order.
      if (isReading) {
        return;
      }
      isReading = true;
      const result = await window.api.previewLiveRegions(regions).finally(() => {
        isReading = false;
      });
      if (cancelled) {
        return;
      }
      if (result.success) {
        setLivePreview((previous) => nextLivePreview(previous, result.data));
      }
      setError(result.success ? null : result.error);
    };
    void refresh();
    const timer = setInterval(() => void refresh(), LIVE_PREVIEW_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [regions, enabled]);

  return { livePreview, error };
}
