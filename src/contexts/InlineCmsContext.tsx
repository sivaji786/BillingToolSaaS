import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { toast } from 'sonner';
import adminApi from '../services/adminApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InlineCmsContextValue {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  patchField: (slug: string, lang: string, field: string, value: string) => Promise<void>;
  isSavingField: (key: string) => boolean;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const InlineCmsContext = createContext<InlineCmsContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function InlineCmsProvider({ children }: { children: React.ReactNode }) {
  const [editMode, setEditModeState] = useState(false);
  // Set of keys currently being saved — format: "slug:field"
  const savingFields = useRef<Set<string>>(new Set());
  // Counter to trigger re-renders when the set changes
  const [savingVersion, setSavingVersion] = useState(0);

  // On mount: restore edit mode from sessionStorage signal
  useEffect(() => {
    if (sessionStorage.getItem('cms_edit_mode') === '1') {
      sessionStorage.removeItem('cms_edit_mode');
      setEditModeState(true);
    }
  }, []);

  const setEditMode = useCallback((v: boolean) => {
    setEditModeState(v);
  }, []);

  const patchField = useCallback(
    async (slug: string, lang: string, field: string, value: string): Promise<void> => {
      const key = `${slug}:${field}`;

      savingFields.current.add(key);
      setSavingVersion((v) => v + 1);

      try {
        await adminApi.patch(`/cms/${slug}`, { lang, field, value });
      } catch {
        toast.error('Failed to save. Please retry.');
        throw new Error('patch failed');
      } finally {
        savingFields.current.delete(key);
        setSavingVersion((v) => v + 1);
      }
    },
    [],
  );

  // savingVersion is read so the closure captures it and isSavingField re-evaluates
  const isSavingField = useCallback(
    (key: string): boolean => {
      void savingVersion; // intentional read to create reactive dependency
      return savingFields.current.has(key);
    },
    [savingVersion],
  );

  return (
    <InlineCmsContext.Provider value={{ editMode, setEditMode, patchField, isSavingField }}>
      {children}
    </InlineCmsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInlineCms(): InlineCmsContextValue {
  const ctx = useContext(InlineCmsContext);
  if (!ctx) {
    throw new Error('useInlineCms must be used inside <InlineCmsProvider>');
  }
  return ctx;
}
