# Multi-language

**Status:** ✅ DONE  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** `src/contexts/LanguageContext.tsx` · `src/translations/*.ts` · `src/hooks/useLanguage.ts`

---

## Overview

Translation system covering all UI strings across tenant and admin screens. Supports English (en), German (de), Arabic (ar), and Polish (pl). Language context is provided at the app root; all components use the `t()` helper via `useLanguage()`. The context value and `t()` function are memoised to prevent unnecessary re-renders.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open items | 0 |
| Completed items | 2 |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Translation keys added for all new modules (letters, tickets, wiki, CMS, Telegram, invoice status variants) | 2026-05-08 | `src/translations/en.ts`, `de.ts`, `ar.ts`, `pl.ts` |
| LanguageContext value and `t()` / `handleSetLanguage` wrapped in `useMemo` / `useCallback` — eliminates context-triggered re-renders across all consumers | 2026-05-13 | `src/contexts/LanguageContext.tsx` |

---

## Supported Languages

| Code | Language | File |
|------|----------|------|
| `en` | English (default) | `src/translations/en.ts` |
| `de` | German | `src/translations/de.ts` |
| `ar` | Arabic (RTL) | `src/translations/ar.ts` |
| `pl` | Polish | `src/translations/pl.ts` |
