# Rollenbasierte Zugriffskontrolle (RBAC) System

Dieses Dokument bietet einen tiefen Einblick in das RBAC-System (Role-Based Access Control), das in der BillingTool SaaS-Plattform verwendet wird. Es erklärt, wie Rollen und Rechte strukturiert, gespeichert und anwendungsübergreifend durchgesetzt werden.

## 1. Architektonischer Überblick

Das RBAC-System folgt der Standard-Hierarchie **Benutzer -> Rolle -> Recht**. Einem Benutzer werden eine oder mehrere Rollen zugewiesen, und jeder Rolle wird ein Satz von Rechten (Berechtigungen) gewährt.

### Kernkomponenten
- **Rechte (Rights)**: Die diskreten Aktionen, die ausgeführt werden können (z. B. `invoices.read`, `workspace.upload`).
- **Rollen (Roles)**: Logische Gruppierungen von Rechten (z. B. `Admin`, `Techniker`, `Buchhalter`).
- **Berechtigungen (Permissions)**: Die Brücke zwischen Rollen und Rechten.
- **Durchsetzung (Enforcement)**: Middleware (Filter), die prüfen, ob ein Benutzer über das erforderliche Recht verfügt, bevor eine Aktion zugelassen wird.

---

## 2. Datenbank-Schema

Das RBAC-System basiert auf vier primären Tabellen:

### `rights`
Definiert die im System verfügbaren atomaren Aktionen.
- `id`: Primärschlüssel.
- `module`: Der Funktionsbereich (z. B. `invoices`, `tickets`).
- `action`: Das Verb (z. B. `read`, `create`, `update`, `delete`).
- `code`: Der im Code verwendete eindeutige Identifikator (z. B. `invoices.read`).
- `description`: Menschlich lesbare Erklärung.

### `roles`
Definiert die verfügbaren Rollen. Rollen können global (für alle Mandanten) oder spezifisch für einen Mandanten sein.
- `id`: Primärschlüssel.
- `tenant_id`: (Nullable) Link zu einem bestimmten Mandanten.
- `name`: Rollenname (z. B. `Admin`).
- `is_super_admin`: Boolean-Flag. Wenn wahr, umgeht die Rolle alle Rechteprüfungen.

### `role_rights` (Pivot)
Ordnet Rollen ihre jeweiligen Rechte zu.
- `role_id`: FK zu `roles`.
- `right_id`: FK zu `rights`.

### `user_roles` (Pivot)
Weist Benutzern Rollen zu.
- `user_id`: FK zu `users`.
- `role_id`: FK zu `roles`.

---

## 3. Backend-Implementierung

### Durchsetzung über Filter
Der primäre Durchsetzungsmechanismus ist der `RbacFilter` (`app/Filters/RbacFilter.php`).

In `app/Config/Routes.php` wenden Sie den Filter wie folgt auf Routengruppen an:

```php
// Lesezugriff für eine Gruppe von Routen erzwingen
$routes->group('invoices', ['filter' => 'rbac:invoices.read'], function($routes) {
    $routes->get('', 'InvoiceController::index');
    $routes->get('(:segment)', 'InvoiceController::show/$1');
});
```

Der Filter funktioniert wie folgt:
1. Extrahiert die `userId` aus dem authentifizierten Kontext (JWT oder Sitzung).
2. Prüft, ob die Spalte `role` des Benutzers auf `admin` gesetzt ist (globaler Bypass).
3. Wenn nicht, wird `UserModel::hasRight($userId, 'invoices.read')` aufgerufen.

### `UserModel` Logik
Das `UserModel` enthält die zentrale Logik zur Berechtigungsprüfung:

1. **Besitzer/Admin Bypass**: Wenn ein Benutzer die Rolle `owner` oder `admin` direkt in der Tabelle `users` hat, hat er vollen Zugriff.
2. **Super-Admin-Rolle**: Wenn dem Benutzer eine Rolle zugewiesen ist, bei der `is_super_admin = 1` ist, hat er vollen Zugriff.
3. **Spezifische Rechteprüfung**: Eine JOIN-Abfrage über `user_roles`, `roles`, `role_rights` und `rights` überprüft, ob der spezifische Code für diesen Benutzer existiert.

---

## 4. Anwendung von Rechten im Kundenportal

Das Kundenportal nutzt das RBAC-System, um eine auf Benutzerberechtigungen zugeschnittene Erfahrung zu bieten.

### API-Schutz
Jeder API-Endpunkt im Kundenportal ist durch den `rbac`-Filter in `Routes.php` geschützt. Dies stellt sicher, dass ein Benutzer selbst dann, wenn er einen API-Endpunkt kennt, diesen ohne die korrekte Hintergrundberechtigung nicht ausführen kann.

### Frontend-Integration
Wenn sich ein Benutzer anmeldet, werden seine verfügbaren Rechte häufig im Endpunkt `auth/me` zurückgegeben. Das Frontend verwendet diese Rechte für:
- **Menüpunkte ausblenden/anzeigen**: Wenn ein Benutzer nicht über `invoices.read` verfügt, wird der Link "Rechnungen" ausgeblendet.
- **Aktionsschaltflächen umschalten**: Wenn ein Benutzer über `workspace.read`, aber nicht über `workspace.delete` verfügt, werden die Löschschaltflächen in der Benutzeroberfläche deaktiviert oder ausgeblendet.
- **Bedingtes Routing**: Verhinderung der Navigation zu Seiten, auf die der Benutzer keinen Zugriff hat.

---

## 5. Hinzufügen neuer Rechte

Um dem System ein neues Recht hinzuzufügen:

1. **Migration**: Erstellen Sie eine Migration, um das neue Recht in die Tabelle `rights` einzufügen.
   ```php
   $this->db->table('rights')->insert([
       'module' => 'new_feature',
       'action' => 'manage',
       'code'   => 'new_feature.manage',
       'description' => 'Voller Zugriff auf neue Funktion'
   ]);
   ```
2. **Routen**: Fügen Sie den `rbac`-Filter zu Ihren neuen Routen hinzu.
   ```php
   $routes->group('new-feature', ['filter' => 'rbac:new_feature.manage'], ...);
   ```
3. **Seeding**: Aktualisieren Sie `MainSeeder.php`, um das neue Recht in die Heuristik der Standardrollen einzubeziehen.

## 6. Überlegungen zur Mandantenfähigkeit (Multi-Tenancy)

RBAC ist eng in die Mandantenfähigkeit integriert. Die Operationen von `RbacFilter` und `UserModel` sind auf den aktuellen Mandanten (Tenant) beschränkt. Dies verhindert, dass ein Benutzer eine Rolle von Mandant A nutzt, um auf Daten von Mandant B zuzugreifen.
