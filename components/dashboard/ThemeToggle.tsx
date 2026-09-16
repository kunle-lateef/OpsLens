'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'opslens-theme';
const listeners = new Set<() => void>();

// data-theme on <html> is an external mutable value (also written by the
// blocking script in app/layout.tsx before hydration) — useSyncExternalStore
// is the correct way to read it, since it lets getServerSnapshot answer
// 'dark' during SSR/hydration and only pick up the real client value after,
// without the extra setState-in-effect render a useState+useEffect version
// would need.
function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return document.documentElement.dataset.theme === 'light';
}

function getServerSnapshot() {
  return false;
}

function setTheme(light: boolean) {
  if (light) {
    document.documentElement.dataset.theme = 'light';
  } else {
    delete document.documentElement.dataset.theme;
  }
  try {
    localStorage.setItem(STORAGE_KEY, light ? 'light' : 'dark');
  } catch {
    // Best-effort persistence only — a private window or blocked storage
    // still lets the toggle work for the rest of this session.
  }
  listeners.forEach((listener) => listener());
}

export function ThemeToggle() {
  const isLight = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      onClick={() => setTheme(!isLight)}
    >
      {isLight ? (
        <Moon size={16} aria-hidden="true" />
      ) : (
        <Sun size={16} aria-hidden="true" />
      )}
    </Button>
  );
}
