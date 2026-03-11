# SaaS Systemarchitektur

## 1. Systemüberblick
Das Billing Tool SaaS ist eine **Single-Domain-Multi-Tenant**-Anwendung, die eine sichere Rechnungs- und Abrechnungsverwaltung für mehrere Unternehmen in einer gemeinsamen Infrastruktur ermöglicht.

### Technologie-Stack
*   **Frontend**: React (Vite, TypeScript, Tailwind CSS)
*   **Backend**: PHP 8.1+ (CodeIgniter 4 REST API)
*   **Datenbank**: MySQL (Gemeinsames Schema, Zeilenbasierte Sicherheit)
*   **Authentifizierung**: JWT (JSON Web Tokens)

---

## 2. Multi-Tenancy-Strategie
Im Gegensatz zu traditionellen SaaS-Anwendungen, die Subdomains verwenden (z. B. `firma.app.com`), setzt diese Anwendung auf eine **Single-Domain-Architektur** (z. B. `app.humpl.org`).

### Warum Single Domain?
*   **SSL-Einfachheit**: Kein Wildcard-SSL-Zertifikat erforderlich.
*   **DNS-Einfachheit**: Keine komplexen CNAME-Einträge für Kunden.
*   **Datenschutz**: Kundenpfade verwenden opake UUIDs statt Firmennamen.

### Tenant-Auflösung (Der „Kontext"-Filter)
Der `UnifiedAuthFilter` löst den Kontext in dieser Prioritätsreihenfolge auf:

1.  **JWT-Token (Primär)**:
    *   **Kontext**: Eingeloggter Benutzer.
    *   **Logik**: Das Backend dekodiert den `Authorization: Bearer <token>`-Header. Der Token enthält die `tenant_id`.
    *   **Verwendung**: 99 % aller API-Aufrufe.

2.  **UUID-Pfadsegment (Öffentlich/Fallback)**:
    *   **Kontext**: Öffentlicher Benutzer (z. B. Gast, der eine Rechnung bezahlt).
    *   **Logik**: Das Backend prüft den URL-Pfad auf ein UUID-Segment: `/portal/<uuid>/...`.

3.  **Subdomain (Fallback)**:
    *   **Logik**: Falls kein JWT oder UUID vorhanden, wird die Subdomain aus dem `Host`-Header extrahiert.

4.  **X-Tenant-ID Header (Legacy)**:
    *   **Kontext**: Spezifische Frontend-Überschreibungen (selten genutzt).

---

## 3. Sicherheitsarchitektur

### Fail-Closed-Datenisolierung (`TenantScope`)
Der globale Model-Trait `TenantScope` erzwingt die Isolierung auf Datenbankebene.
*   **Automatische Einschleusung**: Jedes `SELECT`, `UPDATE`, `DELETE` fügt automatisch `WHERE tenant_id = X` hinzu.
*   **Fail-Closed**: Falls kein Tenant ermittelt werden kann, wird `WHERE 1=0` eingefügt — es werden **keine Daten** zurückgegeben.

### Authentifizierungsablauf (`HybridAuth`)
*   **Registrierung**: Erstellt einen Tenant, Benutzer und eine UUID.
*   **Anmeldung**: Gibt einen mit `HS256` signierten JWT zurück.
    *   **Token-Payload**: Standard `sub` (user_id) + benutzerdefinierte `tenant_id`.

---

## 4. Schlüsselbegriffe
*   **Tenant**: Ein Unternehmen oder eine Organisation, die den Dienst abonniert. Identifiziert durch `id` (intern) und `uuid` (öffentlich).
*   **Benutzer**: Ein Konto, das einem Tenant gehört.
*   **Portal-URL**: Der öffentliche Zugangspunkt für einen Tenant, z. B. `/portal/550e8400-e29b-41d4-a716-446655440000/login`.

---

## 5. Pläne und Nutzungsverfolgung

Das System verwaltet das Tenant-Wachstum und Einnahmen durch standardisierte Abonnementpläne.

### Schlüssellogik
- **Plantypen**: Pläne können **Öffentlich**, **Privat** oder **Trailing** (Standard) sein.
- **Nutzungsdurchsetzung**: Echtzeitblockierung bei überschrittenen Limits (Speicher, API).
- **Wartungsaufgaben**: Hintergrund-CLI-Befehle überwachen die Nutzung und senden Schwellwertbenachrichtigungen.
