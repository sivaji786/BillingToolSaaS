import { en } from '../translations/en';

export type Language = 'en' | 'de' | 'ar' | 'pl' | 'fr' | 'it';

const translations: Record<string, any> = { en };

const loaders: Record<string, () => Promise<any>> = {
  de: () => import('../translations/de').then(m => m.de),
  ar: () => import('../translations/ar').then(m => m.ar),
  pl: () => import('../translations/pl').then(m => m.pl),
  fr: () => import('../translations/fr').then(m => m.fr),
  it: () => import('../translations/it').then(m => m.it),
};

export async function ensureTranslation(lang: Language): Promise<void> {
  if (lang === 'en' || translations[lang]) return;
  translations[lang] = await loaders[lang]();
}

function lookup(obj: any, key: string): string | undefined {
  const keys = key.split('.');
  let value: any = obj;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  return typeof value === 'string' ? value : undefined;
}

export const getTranslation = (lang: Language, key: string): string => {
  return lookup(translations[lang], key) ?? lookup(translations['en'], key) ?? key;
};

export const formatTranslation = (text: string, params: Record<string, string | number>): string => {
  let result = text;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });
  return result;
};
