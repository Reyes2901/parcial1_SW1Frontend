import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedSave } from './useDebouncedSave';
import { useEditorStore } from '../stores/editor.store';
import type { UMLModel } from '../domain/uml-model';

describe('useDebouncedSave', () => {
  const sampleModel: UMLModel = {
    id: 'm1',
    name: 'Model 1',
    version: 1,
    classes: [],
    relations: [],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.getState().setSaveStatus('idle');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('debounces save calls by 800ms', async () => {
    const saveFn = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useDebouncedSave(saveFn));

    act(() => {
      result.current.scheduleSave(sampleModel);
    });

    expect(useEditorStore.getState().saveStatus).toBe('saving');
    expect(saveFn).not.toHaveBeenCalled();

    // Fast-forward 800ms timer
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith(sampleModel);
    expect(useEditorStore.getState().saveStatus).toBe('saved');
  });

  it('flush saves immediately without waiting for timer', async () => {
    const saveFn = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useDebouncedSave(saveFn));

    act(() => {
      result.current.scheduleSave(sampleModel);
    });

    expect(saveFn).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.flush();
    });

    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(useEditorStore.getState().saveStatus).toBe('saved');
  });

  it('sets error status if saveFn fails', async () => {
    const saveFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useDebouncedSave(saveFn));

    act(() => {
      result.current.scheduleSave(sampleModel);
    });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(useEditorStore.getState().saveStatus).toBe('error');
  });
});
