# Sicherheits- & Isolierungs-Datenfluss

## 1. Überblick
Dieses Dokument beschreibt die Sicherheitsarchitektur zur Durchsetzung von Multi-Tenancy und RBAC (rollenbasierte Zugriffskontrolle).

## 2. Filter-Pipeline
Jede Anfrage durchläuft eine Reihe von Filtern, die in `app/Config/Filters.php` definiert sind:

1.  **CorsFilter (`cors`)**:
    *   Erlaubt Anfragen von genehmigten Ursprüngen.
    *   Verarbeitet Preflight-`OPTIONS`-Anfragen.
2.  **UnifiedAuthFilter (`auth`)**:
    *   **Kritischer Schritt**: Verarbeitet sowohl Tenant-Identifizierung als auch Benutzerauthentifizierung.
    *   Quelle: JWT-Token (`tenant_id`) > URL-Pfad (`/portal/<uuid>`) > Host-Subdomain.
    *   Aktion: Lädt Tenant, validiert JWT und setzt `currentTenant`.
3.  **RbacFilter (`rbac`)**:
    *   Prüft, ob der Benutzer die spezifische Berechtigung hat (z. B. `invoices.read`).
    *   Umgeht für Benutzer mit `role = 'admin'`.
    *   Sicherheitsprüfung: Verifiziert `User.tenant_id == CurrentTenant.id`.

## 3. Datenbankscoping (TenantScope)
Der `TenantScope`-Trait ist die letzte Verteidigungslinie.

### Logikfluss
```php
protected function beforeFind(array $data) {
    $tenant = config('App')->currentTenant;

    if ($tenant) {
        // Normalbetrieb
        $this->where('tenant_id', $tenant->id);
    } else {
        // FAIL-CLOSED-SICHERHEIT
        // Kein Tenant identifiziert? Alle Zugriffe blockieren.
        $this->where('1=0');
    }
    return $data;
}
```

### Bypass-Mechanismus
Für globale Operationen (wie Login) muss dieser Scope explizit umgangen werden:
```php
$userModel->withoutTenant()->find($id);
```
So wird sichergestellt, dass das „Durchsickern" von Daten eine bewusste, explizite Aktion ist.
