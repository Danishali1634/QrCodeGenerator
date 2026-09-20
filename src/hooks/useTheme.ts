import { useEffect, useState, useCallback } from 'react';
import type { ThemeMode } from '@/types';

function applyTheme(theme: ThemeMode): 'light' | 'dark' {
  let resolved: 'light' | 'dark';
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    resolved = theme;
  }
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  return resolved;
}

export function useTheme(initial: ThemeMode = 'system') {
  const [theme, setTheme] = useState<ThemeMode>(initial);
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => applyTheme(initial));

  useEffect(() => {
    setResolved(applyTheme(theme));
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => setResolved(applyTheme('system'));
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  const changeTheme = useCallback((t: ThemeMode) => setTheme(t), []);
  return { theme, resolved, changeTheme };
}
