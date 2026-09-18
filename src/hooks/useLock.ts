import { useCallback, useEffect, useRef } from 'react';
import { diagramsService } from '../services/diagrams.service';
import { useEditorStore } from '../stores/editor.store';
import { useAuthStore } from '../stores/auth.store';

const REFRESH_INTERVAL_MS = 15_000;

export function useLock(diagramId: string) {
  const { selectedId, setLockState } = useEditorStore();
  const { user } = useAuthStore();
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentClassId = useRef<string | null>(null);

  const acquireLock = useCallback(async (classId: string) => {
    try {
      const res = await diagramsService.acquireLock(diagramId, classId);
      if ((res as { locked?: boolean }).locked) {
        setLockState({ lockedBy: (res as { by: string }).by });
      } else {
        setLockState({ lockedBy: user?.name ?? 'yo', expiresAt: Date.now() + 30_000 });
      }
    } catch {
      setLockState(null);
    }
  }, [diagramId, user, setLockState]);

  const releaseLock = useCallback(async (classId: string) => {
    try {
      await diagramsService.releaseLock(diagramId, classId);
    } catch { /* ignore */ }
    setLockState(null);
  }, [diagramId, setLockState]);

  useEffect(() => {
    if (!selectedId) {
      if (currentClassId.current) {
        void releaseLock(currentClassId.current);
        currentClassId.current = null;
      }
      if (refreshRef.current) clearInterval(refreshRef.current);
      return;
    }

    if (currentClassId.current && currentClassId.current !== selectedId) {
      void releaseLock(currentClassId.current);
    }

    currentClassId.current = selectedId;
    void acquireLock(selectedId);

    if (refreshRef.current) clearInterval(refreshRef.current);
    refreshRef.current = setInterval(() => {
      if (currentClassId.current) void acquireLock(currentClassId.current);
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [selectedId, acquireLock, releaseLock]);

  // Liberar al desmontar
  useEffect(() => {
    return () => {
      if (currentClassId.current) {
        void releaseLock(currentClassId.current);
      }
    };
  }, [releaseLock]);
}
