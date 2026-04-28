import { en } from '../translations/en';
import { de } from '../translations/de';
import { ar } from '../translations/ar';
import { pl } from '../translations/pl';

export type Language = 'en' | 'de' | 'ar' | 'pl';

export const translations = {
  en,
  de,
  ar,
  pl,
};

export const getTranslation = (lang: Language, key: string): string => {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if translation missing
      if (lang !== 'en') {
        return getTranslation('en', key);
      }
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
};

export const formatTranslation = (text: string, params: Record<string, string | number>): string => {
  let result = text;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });
  return result;
};
