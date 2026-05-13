import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { Language, ensureTranslation, getTranslation, formatTranslation } from '../utils/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, values?: Record<string, string>) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [, setLoadTick] = useState(0);

  const isRtl = language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRtl]);

  const handleSetLanguage = useCallback((lang: Language) => {
    ensureTranslation(lang).then(() => {
      setLanguage(lang);
      setLoadTick(n => n + 1);
    });
  }, []);

  const t = useCallback((key: string, values?: Record<string, string>): string => {
    const translation = getTranslation(language, key);
    return values ? formatTranslation(translation, values) : translation;
  }, [language]);

  const ctxValue = useMemo(
    () => ({ language, setLanguage: handleSetLanguage, t, isRtl }),
    [language, handleSetLanguage, t, isRtl]
  );

  return (
    <LanguageContext.Provider value={ctxValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
