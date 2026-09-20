import { useEffect, useRef, useState } from 'react';
import type { PersistedState } from '@/types';
import { loadState, saveState, clearState } from '@/lib/storage';

export function usePersistedState() {
  const [restorable, setRestorable] = useState<PersistedState | null>(() => loadState());
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const persist = (state: PersistedState) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveState(state), 400);
  };

  const dismissRestore = () => {
    setRestorable(null);
  };

  const clearAll = () => {
    clearState();
    setRestorable(null);
  };

  return { restorable, setRestorable, persist, dismissRestore, clearAll };
}
