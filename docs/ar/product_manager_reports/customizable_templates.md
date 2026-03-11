# Bericht: Anpassbare Vorlagen
**Projekt:** BillingTool SaaS
**Datum:** 26.01.2026
**Status:** ✅ Produktionsbereit

---

## 1. Zusammenfassung
Das Modul **Anpassbare Vorlagen** ermöglicht es Tenants, individuelle Rechnungslayouts über eine visuelle Drag-and-Drop-Oberfläche zu gestalten. Es schließt die Lücke zwischen starren Standardexporten und professioneller, markenwirksamer Dokumentation.

## 2. Kernfunktionen

### 2.1 Visueller Design-Layout-Editor
- **Canvas-basierte Oberfläche:** React-Komponente (`TemplateDesignLayout.tsx`) mit pixelgenauer Rechnungsvorschau.
- **Element-Bibliothek:** Drag-and-Drop-Unterstützung für 13+ kritische Komponenten:
    - Unternehmens-IDs (Logo, Header, Titel)
    - Party-Daten (Verkäufer, Käufer)
    - Funktionsblöcke (Positionstabelle, Steuerübersicht, Summen)
    - Compliance-Blöcke (Digitale Signatur, QR-Code, Fußzeile)
- **Erweiterte Werkzeuge:**
    - **Raster-Einrasten:** Professionelle Ausrichtung sicherstellen.
    - **Eigenschaftsinspektor:** Granulare Kontrolle über (X, Y)-Koordinaten und (W, H)-Dimensionen.
    - **Zoom-Steuerung:** Präzises Bearbeiten für detaillierte Layouts.

### 2.2 Vorlagenverwaltung
- **Speicherung:** Layouts werden als JSON in der Spalte `invoice_templates.layout_json` gespeichert.
- **Tenant-Isolierung:** Jede Vorlage ist strikt an eine `tenant_id` via `TenantScope` gebunden.
- **Standard-System:** Möglichkeit, Standardwährungen, Steuerkategorien und Zahlungsbedingungen pro Vorlage festzulegen.

## 3. Technische Implementierung

### Backend
- **Controller:** `InvoiceTemplateController.php`
- **Modell:** `InvoiceTemplateModel.php` (erweitert `BaseModel`).
- **Datentrennung:** Fail-closed-Sicherheit verhindert tenantübergreifenden Zugriff.

### Frontend
- **Native Tailwind-Integration:** Layout-Engine nutzt Tailwind für den responsiven Eigenschaftsinspektor.
- **Subdomain-bewusstes Branding:** Vorlagen ziehen automatisch tenant-spezifisches Branding (Logos).

## 4. Aktueller Status & Roadmap

| Funktion | Status | Implementierungsdetail |
| :--- | :--- | :--- |
| **Visuelles Canvas** | ✅ Stabil | React-basierte Drag/Drop-Logik |
| **JSON-Speicher** | ✅ Stabil | `layout_json`-Spalte in MySQL |
| **Tenant-Scoping** | ✅ Stabil | Globale `TenantScope`-Integration |
| **Logo-Integration** | ✅ Beta | Dynamische URL-Injektion aus Firmenprofil |
| **ZUGFeRD-Integration** | 🟡 Recherche | Visuelle Blöcke auf Hybrid-PDF-Standards abbilden |

## 5. Risiken & Einschränkungen
- **Risiko:** Komplexe Layouts könnten auf sehr schmalen Mobilbildschirmen brechen.
- **Konflikt:** Gleichzeitiges Bearbeiten derselben Vorlage durch zwei Admins (via „Last-Write-Wins" gelöst, aber Lock-Mechanismus benötigt).

---
**Fazit:** Dieses Modul ist eines der technisch anspruchsvollsten Bereiche des Projekts und bietet erheblichen Geschäftswert.
