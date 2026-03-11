# Workspace-Modul (Mein Arbeitsbereich)

Das Workspace-Modul bietet ein mandantenfähiges Dateiverwaltungssystem, das es Benutzern ermöglicht, projektbezogene Dokumente hochzuladen, zu organisieren und zu durchsuchen.

## 1. Technischer Überblick

- **Frontend-Komponente**: `src/components/screens/Workspace.tsx`
- **Backend-Controller**: `App\Controllers\WorkspaceController`
- **Datenbankmodell**: `App\Models\WorkspaceFileModel`
- **Speicherpfad**: `WRITEPATH/uploads/tenants/{tenant_id}/workspace/`

## 2. Kernfunktionalitäten

### 2.1 Dateiverwaltung
- **CRUD-Operationen**: Benutzer können Ordner erstellen, Dateien hochladen, Elemente umbenennen und löschen.
- **Upload-Limits**: Werden auf Serverebene durchgesetzt (`post_max_size` und `upload_max_filesize`).
- **Sicherheit**: Pfad-Bereinigung verhindert Directory-Traversal-Angriffe.

### 2.2 ZIP-Unterstützung
- **Entpacken**: Unterstützt das direkte Entpacken von `.zip`-Archiven im Workspace.
- **Massen-Download**: Benutzer können mehrere Elemente auswählen und als eine einzige ZIP-Datei herunterladen.

### 2.3 KI-Suche (Gemini-gestützt)
Das Workspace-Modul bietet eine erweiterte KI-Suchfunktion:
1.  **Natürliche Sprache zu SQL**: Das System nutzt Gemini, um eine Texteingabe (z. B. „Alle PDFs der letzten Woche finden") in eine SQL-`WHERE`-Klausel umzuwandeln.
2.  **Kontextuelle Filterung**: Das generierte SQL ist streng auf die `tenant_id` des aktuellen Workspace beschränkt.
3.  **Verlaufs-Cache**: Häufige Abfragen werden in der `aiquery_history`-Tabelle gespeichert, um API-Latenz und Kosten zu reduzieren.

## 3. Multi-Tenancy & Sicherheit

### 3.1 Datenisolierung
Die Datenisolierung wird auf zwei Ebenen durchgesetzt:
1.  **Dateisystem**: Jeder Tenant hat ein eigenes Verzeichnissegment.
2.  **Datenbank**: Das `WorkspaceFileModel` erweitert `BaseModel`, das den `TenantScope`-Trait verwendet.

### 3.2 Workspace-Mismatch-Schutz
Durchgesetzt durch den `UnifiedAuthFilter` — stellt sicher, dass ein Benutzer nur auf den Workspace zugreifen kann, der durch sein JWT oder den validierten Subdomain-/UUID-Pfad festgelegt ist.

## 4. Nutzungserfassungsschlüssel
Das Workspace-Modul verbraucht folgende Limits aus dem Planungssystem:
- **storage_gb**: Gesamtgröße aller Dateien im Tenant-Workspace.
- **api_calls**: KI-Suchanfragen verbrauchen API-Aufruf-Credits.
