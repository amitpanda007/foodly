import { useMemo } from 'react';

const STORAGE_KEY = 'foodly:userId';

export function useUserId() {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return 'anonymous';
    }

    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const generated =
      (typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : null) || `foodly-${Date.now()}`;

    window.localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  }, []);
}


