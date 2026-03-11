# Modulbericht: Rechnungsverwaltung
**Status:** ✅ Produktionsbereit

## 1. Teilmodule
- **UBL-Compliance-Engine:** Stellt Kompatibilität mit europäischem E-Rechnungsstandard (EN 16931) sicher.
- **Dynamischer Editor:** Echtzeit-Berechnung und -Validierung in React.
- **PDF-Kern:** Hochwertige Dokumentgenerierung (`invoice-pdf.ts`).

## 2. Funktionen & Status
| Funktionalität | Beschreibung | Status |
| :--- | :--- | :--- |
| **Vollständiges CRUD** | Rechnungen und Positionen erstellen, lesen, aktualisieren, löschen | ✅ Stabil |
| **Status-Lebenszyklus** | Zustandsübergänge: Entwurf → Gesendet → Bezahlt | ✅ Stabil |
| **PDF-Export** | Hochwertige, markenwirksame PDF-Downloads | ✅ Stabil |
| **Digitale Signaturen** | Kryptographische Signierung für rechtliche Compliance | 🟡 In Bearbeitung |

## 3. Technische Implementierung
- **Controller:** `App\Controllers\InvoiceController`
- **Modelle:** `App\Models\InvoiceModel`, `App\Models\InvoiceLineModel`
- **Frontend:** `src/components/screens/InvoiceEditor.tsx`

## 4. Risiken & Konflikte
- **Steuer-Compliance:** Dynamische Steuerregeln variieren stark nach Region.
- **Gleichzeitige Bearbeitung:** Risiko des Überschreibens von Daten bei gleichzeitiger Bearbeitung.

## 5. Roadmap
- Unterstützung für wiederkehrende Rechnungen (Abonnements).
- Automatischer E-Mail-Versand via SMTP/SendGrid.
