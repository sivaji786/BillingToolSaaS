# Modul-Tiefeanalyse-Bericht
**Status:** ✅ Stabil
**Zuletzt aktualisiert:** März 2026

---

## Überblick

Dieser Bericht gibt einen umfassenden Überblick über alle Hauptmodule der BillingTool SaaS-Plattform.

## Kernmodule

| Modul | Status | Beschreibung |
|-------|--------|--------------|
| **Multi-Tenancy-Kern** | ✅ Bereit | Mandantenisolierung, Onboarding, UUID-basiertes Routing |
| **Authentifizierung & RBAC** | ✅ Stabil | JWT, rollenbasierte Zugriffskontrolle |
| **Rechnungsverwaltung** | ✅ Bereit | UBL 2.1-konforme Rechnungsstellung, PDF-Export |
| **Anpassbare Vorlagen** | ✅ Bereit | Drag-and-Drop-Canvas für Rechnungslayouts |
| **Mein Arbeitsbereich** | ✅ Stabil | Dateimanagement mit KI-Suche |
| **KI & Intelligence** | 🔵 Beta | NLP-gestützte Rechnungsassistenz (Gemini) |
| **Abonnement & Abrechnung** | 🟡 In Entwicklung | Plan-Verwaltung, Stripe-Integration |
| **Admin-Wiki** | ✅ Stabil | Live-Dokumentationssystem |
| **Ticketing-Widget** | ✅ Stabil | Eingebetteter Support-Kanal |
| **Administrative Portale** | 🟢 Aktiv | Super-Admin-Dashboard, Audit-Logs |

## Vollständiger Technologie-Stack

### Frontend
- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS 4
- **Zustandsverwaltung:** Zustand
- **PDF:** jsPDF + html2canvas
- **Internationalisierung:** Benutzerdefiniertes i18n-System (EN/DE/AR)

### Backend
- **Framework:** CodeIgniter 4 (PHP 8.1+)
- **Datenbank:** MySQL 8.0 (Mehrere Tenants, geteiltes Schema)
- **Auth:** JWT (`firebase/php-jwt`)
- **KI:** Gemini API

### Infrastruktur
- **Hosting:** Apache / Nginx
- **Dateispeicherung:** Lokales Dateisystem mit Tenant-isolierten Pfaden
- **CI/CD:** Manuelles Deployment (Vite-Build + PHP-Upload)

## Architektonische Entscheidungen

1. **Single-Domain-Architektur** — Kein Wildcard-SSL erforderlich; Tenant-Kontext via JWT.
2. **Fail-Closed-Sicherheit** — `TenantScope` injiziert `WHERE 1=0` bei fehlendem Tenant.
3. **Plan-Gate-Muster** — Nutzungsdurchsetzung über `UsageEnforcement`-Trait in Echtzeit.
4. **UBL 2.1-Compliance** — Alle Rechnungen entsprechen europäischen E-Rechnungsstandards.
