import { useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '../stores/editor.store';
import type { UMLModel } from '../domain/uml-model';

const DEBOUNCE_MS = 800;

export function useDebouncedSave(
  saveFn: (model: UMLModel) => Promise<unknown>,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<UMLModel | null>(null);
  const { setSaveStatus } = useEditorStore();

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current) {
      const model = pendingRef.current;
      pendingRef.current = null;
      setSaveStatus('saving');
      try {
        await saveFn(model);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }
  }, [saveFn, setSaveStatus]);

  const scheduleSave = useCallback((model: UMLModel) => {
    pendingRef.current = model;
    setSaveStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const m = pendingRef.current;
      pendingRef.current = null;
      if (!m) return;
      try {
        await saveFn(m);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, DEBOUNCE_MS);
  }, [saveFn, setSaveStatus]);

  useEffect(() => {
    return () => {
      void flush();
    };
  }, [flush]);

  return { scheduleSave, flush };
}
