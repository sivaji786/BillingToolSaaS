# Technische Architektur: BillingTool

## Systemübersicht

BillingTool basiert auf einer modernen, skalierbaren Architektur, die die Belange zwischen der Frontend-Präsentationsschicht und der Backend-API-Schicht trennt und so Wartbarkeit, Sicherheit und Leistung gewährleistet.

## High-Level-Architektur

Das System ist in vier Hauptschichten unterteilt:
1. **Client-Schicht**: Webbrowser mit React 18 Anwendung.
2. **Frontend-Schicht**: TypeScript-Komponenten, Tailwind CSS Styling und API-Client.
3. **Backend-Schicht**: CodeIgniter 4 API mit JWT-Authentifizierung und Trait-basierter Geschäftslogik.
4. **Datenschicht**: MySQL-Datenbank mit mandantenfähigem Schema.

## SaaS & Mehrmandanten-Architektur

### Subdomain-basierte Isolierung
Die Plattform verwendet ein dynamisches Subdomain-Routing-System, bei dem jeder Mandant über `{tenant}.humpl.org` auf die Anwendung zugreift.

- **Mandanten-Identifizierung**: Der `TenantFilter`-Interceptor extrahiert die Subdomain und validiert sie gegen die Datenbank.
- **Fail-Closed-Kontext**: Wenn kein gültiger Mandant identifiziert wird, blockiert die Anwendung jeglichen Datenzugriff.

### Trait-basierte modulare Logik
Kern-SaaS-Logik ist in wiederverwendbaren PHP-Traits gekapselt:
- **TenantScope**: Globale Datenisolierung durch automatische Injektion der `tenant_id`.
- **UsageEnforcement**: Erzwingt Planlimits (Rechnungen, Benutzer).
- **AuditTrait**: Erfasst alle Änderungen für einen revisionssicheren Audit-Trail.

## Frontend-Architektur

### Technologie-Stack
- **Framework**: React 18.3.1
- **Sprache**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **Build-Tool**: Vite
- **UI-Komponenten**: shadcn/ui
- **Charts**: Recharts

### Zustandsverwaltung
Verwendet die React Context API für globale Zustände (z. B. Sprache, Authentifizierung) und lokales Zustandsmanagement (z. B. React Hook Form für Rechnungen).

## Backend-Architektur

### Technologie-Stack
- **Framework**: CodeIgniter 4.x
- **Sprache**: PHP 8.1+
- **Datenbank**: MySQL 8.0+
- **Authentifizierung**: JWT (JSON Web Tokens)
- **KI-Integration**: Gemini API

### Sicherheitsarchitektur
- **Authentifizierung**: Token-basierte JWT-Sicherheit.
- **Autorisierung**: Rollenbasierte Zugriffskontrolle (RBAC).
- **Datenschutz**: Vorbereitete Statements, XSS-Prävention, CSRF-Schutz und strikte Mandantentrennung.

## Deployment-Architektur

### Optionen
- **Shared Hosting**: Klassisches PHP/MySQL-Hosting.
- **VPS/Cloud**: Dedizierter Server mit Nginx/Apache.
- **Docker**: Containerisierte Bereitstellung für einfache Skalierbarkeit.

## Leistungsoptimierung
- **Frontend**: Code-Splitting, Lazy Loading und Minifizierung.
- **Backend**: Datenbank-Indizierung, Query-Caching und Opcode-Caching.

---

**Nächster Schritt:** Lesen Sie die [Funktionsübersicht](FEATURES_OVERVIEW.md) für detaillierte Dokumentationen.

**Version:** 2.0.0  
**Zuletzt aktualisiert:** Januar 2026
