import { useCallback, useMemo, useRef, useState } from 'react';
import type { QRItem, Settings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { parseCodes } from '@/lib/parse';

export function useQueueStore() {
  const [items, setItems] = useState<QRItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [regenToken, setRegenToken] = useState(0);
  const regenRef = useRef(0);

  const current = items[currentIndex] ?? null;

  const generateQueue = useCallback((input: string) => {
    const parsed = parseCodes(input, settings.removeDuplicates);
    setItems(parsed);
    setCurrentIndex(0);
  }, [settings.removeDuplicates]);

  const next = useCallback(() => {
    setCurrentIndex((idx) => {
      if (items.length === 0) return idx;
      if (settings.wrapAround) {
        return (idx + 1) % items.length;
      }
      return Math.min(idx + 1, items.length - 1);
    });
  }, [items.length, settings.wrapAround]);

  const prev = useCallback(() => {
    setCurrentIndex((idx) => {
      if (items.length === 0) return idx;
      if (settings.wrapAround) {
        return (idx - 1 + items.length) % items.length;
      }
      return Math.max(idx - 1, 0);
    });
  }, [items.length, settings.wrapAround]);

  const first = useCallback(() => {
    if (items.length) setCurrentIndex(0);
  }, [items.length]);

  const last = useCallback(() => {
    if (items.length) setCurrentIndex(items.length - 1);
  }, [items.length]);

  const goTo = useCallback((index: number) => {
    if (items.length === 0) return;
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    setCurrentIndex(clamped);
  }, [items.length]);

  const goToId = useCallback((id: string) => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx >= 0) setCurrentIndex(idx);
  }, [items]);

  const reset = useCallback(() => {
    setItems([]);
    setCurrentIndex(0);
  }, []);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...partial }));
  }, []);

  const regenerate = useCallback(() => {
    regenRef.current += 1;
    setRegenToken(regenRef.current);
  }, []);

  return {
    items,
    setItems,
    currentIndex,
    setCurrentIndex,
    current,
    settings,
    updateSettings,
    generateQueue,
    next,
    prev,
    first,
    last,
    goTo,
    goToId,
    reset,
    regenerate,
    regenToken,
  };
}

export type QueueStore = ReturnType<typeof useQueueStore>;
