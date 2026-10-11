// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSave } from './useAutoSave';

const AUTO_SAVE_DELAY_MS = 800;

type Save = (value: string) => Promise<boolean>;

function renderAutoSave(save: Save) {
  return renderHook(({ value }) => useAutoSave(value, save), { initialProps: { value: 'initial' } });
}

async function waitForAutoSave(): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutoSave', () => {
  it('should not save when the value has not changed', async () => {
    const save = vi.fn<Save>().mockResolvedValue(true);
    const { result } = renderAutoSave(save);
    await waitForAutoSave();
    expect(save).not.toHaveBeenCalled();
    expect(result.current).toBe('idle');
  });

  it('should save the value when it stops changing', async () => {
    const save = vi.fn<Save>().mockResolvedValue(true);
    const { result, rerender } = renderAutoSave(save);
    rerender({ value: 'changed' });
    await waitForAutoSave();
    expect(save).toHaveBeenCalledExactlyOnceWith('changed');
    expect(result.current).toBe('saved');
  });

  it('should save only the last value when it changes again before the delay', async () => {
    const save = vi.fn<Save>().mockResolvedValue(true);
    const { rerender } = renderAutoSave(save);
    rerender({ value: 'a' });
    await act(() => vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS / 2));
    rerender({ value: 'ab' });
    await waitForAutoSave();
    expect(save).toHaveBeenCalledExactlyOnceWith('ab');
  });

  it('should report the value as invalid when the save is rejected', async () => {
    const { result, rerender } = renderAutoSave(vi.fn<Save>().mockResolvedValue(false));
    rerender({ value: 'bad' });
    await waitForAutoSave();
    expect(result.current).toBe('invalid');
  });

  it('should report the value as invalid when the save cannot be sent', async () => {
    const { result, rerender } = renderAutoSave(vi.fn<Save>().mockRejectedValue(new Error('window closed')));
    rerender({ value: 'changed' });
    await waitForAutoSave();
    expect(result.current).toBe('invalid');
  });

  it('should save a pending change when the component goes away', () => {
    const save = vi.fn<Save>().mockResolvedValue(true);
    const { rerender, unmount } = renderAutoSave(save);
    rerender({ value: 'pending' });
    unmount();
    expect(save).toHaveBeenCalledExactlyOnceWith('pending');
  });

  it('should not save again when the component goes away after a save', async () => {
    const save = vi.fn<Save>().mockResolvedValue(true);
    const { rerender, unmount } = renderAutoSave(save);
    rerender({ value: 'changed' });
    await waitForAutoSave();
    unmount();
    expect(save).toHaveBeenCalledTimes(1);
  });
});
