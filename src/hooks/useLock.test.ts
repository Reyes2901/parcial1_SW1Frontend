import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLock } from './useLock';
import { useEditorStore } from '../stores/editor.store';
import { useAuthStore } from '../stores/auth.store';
import { diagramsService } from '../services/diagrams.service';

vi.mock('../services/diagrams.service', () => ({
  diagramsService: {
    acquireLock: vi.fn(),
    releaseLock: vi.fn(),
  },
}));

describe('useLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.getState().setSelectedId(null);
    useEditorStore.getState().setLockState(null);
    useAuthStore.getState().setSession({
      token: 'jwt',
      user: { id: 'u1', email: 'test@example.com', name: 'User A' },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('acquires lock when an element is selected', async () => {
    vi.mocked(diagramsService.acquireLock).mockResolvedValue({});

    renderHook(() => useLock('diag-1'));

    await act(async () => {
      useEditorStore.getState().setSelectedId('class-1');
    });

    expect(diagramsService.acquireLock).toHaveBeenCalledWith('diag-1', 'class-1');
    expect(useEditorStore.getState().lockState?.lockedBy).toBe('User A');
  });

  it('sets read-only lock state if 409 conflict occurs (locked by another user)', async () => {
    vi.mocked(diagramsService.acquireLock).mockResolvedValue({ locked: true, by: 'User B' });

    renderHook(() => useLock('diag-1'));

    await act(async () => {
      useEditorStore.getState().setSelectedId('class-1');
    });

    expect(useEditorStore.getState().lockState?.lockedBy).toBe('User B');
  });

  it('releases lock when element selection is cleared', async () => {
    vi.mocked(diagramsService.acquireLock).mockResolvedValue({});
    vi.mocked(diagramsService.releaseLock).mockResolvedValue(undefined);

    renderHook(() => useLock('diag-1'));

    await act(async () => {
      useEditorStore.getState().setSelectedId('class-1');
    });

    await act(async () => {
      useEditorStore.getState().setSelectedId(null);
    });

    expect(diagramsService.releaseLock).toHaveBeenCalledWith('diag-1', 'class-1');
    expect(useEditorStore.getState().lockState).toBeNull();
  });

  it('refreshes lock periodically every 15s', async () => {
    vi.mocked(diagramsService.acquireLock).mockResolvedValue({});

    renderHook(() => useLock('diag-1'));

    await act(async () => {
      useEditorStore.getState().setSelectedId('class-1');
    });

    expect(diagramsService.acquireLock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(diagramsService.acquireLock).toHaveBeenCalledTimes(2);
  });
});
