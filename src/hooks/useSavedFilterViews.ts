import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

/**
 * Lightweight, localStorage-only "saved filter views" primitive shared by
 * every table/list screen that needs it (InvoiceList, LetterList, ...).
 *
 * This is the one source of truth for the feature — screens should not
 * roll their own localStorage read/write for saved views; add to this hook
 * instead so behavior (naming, storage key scoping, persistence) stays
 * consistent everywhere it's used.
 *
 * No backend persistence: state is scoped per tenant+user when auth info is
 * available (via `useAuthStore`), falling back to a fixed shared key
 * otherwise (e.g. logged-out/guest contexts).
 */

export interface SavedFilterView<T = Record<string, unknown>> {
  id: string;
  name: string;
  createdAt: string;
  state: T;
}

const STORAGE_PREFIX = 'savedFilterViews';

function getStorageKey(scope: string): string {
  const { user, tenant } = useAuthStore.getState();
  const suffix = tenant?.id && user?.id ? `${tenant.id}:${user.id}` : 'shared';
  return `${STORAGE_PREFIX}:${scope}:${suffix}`;
}

function readViews<T>(scope: string): SavedFilterView<T>[] {
  try {
    const raw = localStorage.getItem(getStorageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeViews<T>(scope: string, views: SavedFilterView<T>[]): void {
  try {
    localStorage.setItem(getStorageKey(scope), JSON.stringify(views));
  } catch {
    // Saved views are a convenience feature — if localStorage is full or
    // unavailable (private browsing, quota), fail silently rather than
    // breaking the rest of the list screen.
  }
}

/**
 * `scope` must be a stable, unique identifier per screen, e.g. "invoiceList"
 * or "letterList" — it's part of the localStorage key.
 */
export function useSavedFilterViews<T extends Record<string, unknown>>(scope: string) {
  const [views, setViews] = useState<SavedFilterView<T>[]>(() => readViews<T>(scope));

  useEffect(() => {
    setViews(readViews<T>(scope));
  }, [scope]);

  const saveView = useCallback((name: string, state: T): SavedFilterView<T> | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const view: SavedFilterView<T> = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
      state,
    };
    setViews(prev => {
      // Replace any existing view with the same name (case-insensitive) so
      // "save" on an existing name updates it rather than duplicating it.
      const withoutDup = prev.filter(v => v.name.toLowerCase() !== trimmed.toLowerCase());
      const next = [...withoutDup, view];
      writeViews(scope, next);
      return next;
    });
    return view;
  }, [scope]);

  const deleteView = useCallback((id: string) => {
    setViews(prev => {
      const next = prev.filter(v => v.id !== id);
      writeViews(scope, next);
      return next;
    });
  }, [scope]);

  return { views, saveView, deleteView };
}
