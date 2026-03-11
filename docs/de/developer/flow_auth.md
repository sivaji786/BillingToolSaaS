# Authentifizierungs- & Onboarding-Datenfluss

## 1. Überblick
Dieses Dokument beschreibt den Ablauf für Benutzerregistrierung, Tenant-Erstellung und Authentifizierung.

## 2. Registrierungsablauf (Neuer Tenant)
**Endpunkt**: `POST /onboarding/signup`
**Controller**: `Onboarding::signup`

```mermaid
sequenceDiagram
    participant Client
    participant API as API (Auth Controller)
    participant DB as Datenbank

    Client->>API: POST /signup (Firma, E-Mail, Passwort, Plan)
    API->>API: Eingabe validieren
    API->>DB: Prüfen ob E-Mail existiert
    alt E-Mail existiert
        API-->>Client: 400 Fehler: E-Mail bereits registriert
    else E-Mail verfügbar
        API->>API: UUID und Subdomain generieren
        API->>DB: In Tenants einfügen (Aktiv, Trial, UUID)
        API->>DB: In Benutzer einfügen (Rolle: Inhaber)
        API->>DB: Abonnement anlegen (Testphase)
        API->>DB: Firmenprofil erstellen
        API-->>Client: 201 Erstellt (Weiterleitungs-URL)
    end
```

### Schlüssellogik
*   **Tenant-Erstellung**: Ein neuer Eintrag in `tenants` wird mit der bereinigten Subdomain erstellt.
*   **Benutzerzuordnung**: Der neue Benutzer wird sofort an diese `tenant_id` gebunden.
*   **Rollenzuweisung**: Eine „Admin"-Rolle wird für den gewählten Unternehmenstyp zugewiesen.
*   **Quick-Access-Flow**: Vereinfachtes Onboarding per OTP — Benutzer werden automatisch dem „Trailing"-Plan zugewiesen.

## 3. Anmeldeablauf
**Endpunkt**: `POST /api/auth/login`
**Controller**: `Auth::login`

1.  **Scope-Umgehung**: Der `Auth`-Controller nutzt `withoutTenant()`, um den Benutzer global per E-Mail zu suchen.
2.  **Anmeldedaten**: `password_verify()` prüft den Hash.
3.  **Tenant-Abfrage**: Das System prüft, ob der Tenant des Benutzers existiert und aktiv ist.
4.  **Token-Generierung**:
    *   **Payload**: User-ID, Tenant-ID, E-Mail, Rolle.
    *   **Signierung**: Mit `JWT_SECRET` signiert.

## 4. Client-seitige Verarbeitung
*   **Speicherung**: Das Frontend speichert Token und `user`-Objekt in `localStorage`.
*   **Folgende Anfragen**: Die Logik in `api.ts` sendet das Token als `Authorization`-Header.
