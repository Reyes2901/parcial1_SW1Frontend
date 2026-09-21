import { useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '../stores/editor.store';
import type { UMLModel } from '../domain/uml-model';

const DEBOUNCE_MS = 800;
const MAX_FAILS = 3;

export function useDebouncedSave(
  saveFn: (model: UMLModel) => Promise<unknown>,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<UMLModel | null>(null);
  const failCountRef = useRef(0);
  const inFlightRef = useRef(false);
  const saveFnRef = useRef(saveFn);
  const { setSaveStatus } = useEditorStore();

  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  const doSave = useCallback(async (model: UMLModel) => {
    if (inFlightRef.current) return;
    if (failCountRef.current >= MAX_FAILS) {
      console.warn('[useDebouncedSave] Pausa tras 3 fallos. Recarga la página.');
      return;
    }
    inFlightRef.current = true;
    setSaveStatus('saving');
    try {
      await saveFnRef.current(model);
      failCountRef.current = 0;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      const status = (err as { status?: number }).status;
      failCountRef.current += 1;
      setSaveStatus('error');
      if (status === 409 && failCountRef.current >= MAX_FAILS) {
        console.error('[useDebouncedSave] 3+ 409s seguidos. Pausa hasta recargar.');
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [setSaveStatus]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const model = pendingRef.current;
    if (!model) return;
    pendingRef.current = null;
    await doSave(model);
  }, [doSave]);

  const scheduleSave = useCallback((model: UMLModel) => {
    pendingRef.current = model;
    setSaveStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush();
    }, DEBOUNCE_MS);
  }, [flush, setSaveStatus]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const model = pendingRef.current;
      if (model && failCountRef.current < MAX_FAILS) {
        Promise.resolve(saveFnRef.current(model)).catch(() => { /* ignorar */ });
      }
      pendingRef.current = null;
    };
  }, []);

  return { scheduleSave, flush };
}