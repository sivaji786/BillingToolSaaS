# Statusbericht: BillingTool SaaS — April 2026
**Datum:** 11.04.2026
**Erstellt von:** Produktteam
**Status:** 🟢 GA-Phase — Rechnungsintelligenz & Auth-Härtung

## Zusammenfassung
Nach dem Premium Experience Patch (3. April) konzentrierte sich dieser Sprint auf zwei kritische Bereiche: **Auth-Härtung** (Passwortzurücksetzungsablauf) und **Rechnungsintelligenz** (konfigurierbare Standardwerte, automatische Nummerierung). Das Käuferverzeichnis erhielt Sortier- und Filterverbesserungen, und das Unternehmensprofilschema wurde erweitert, um Rechnungsstandards pro Mandant zu speichern.

---

## Neue Funktionen (6.–11. April 2026)

| Funktion | Status |
|----------|--------|
| **Passwort-Zurücksetzen** — Vollständiger Ablauf: Passwort vergessen → E-Mail-Token → Zurücksetzen-Bildschirm | ✅ Fertiggestellt |
| **password_resets-Tabelle** — Migration `2026-04-06-141344_CreatePasswordResetsTable` | ✅ Fertiggestellt |
| **UnifiedAuthFilter-Ausnahme** — `/reset-password`-Route umgeht die Auth-Schranke | ✅ Fertiggestellt |
| **Rechnungsnummerformat** — Benutzerdefiniertes Muster pro Mandant (z.B. `INV-{YYYY}-{NNNNN}`) | ✅ Fertiggestellt |
| **Rechnungsstandards-Migration** — Standardwährung EUR, Steuersatz 19 %, Zahlungsziel 30 Tage | ✅ Fertiggestellt |
| **`generateInvoiceNumber()`-Hilfsfunktion** — Formatbasierte automatische Nummerierung | ✅ Fertiggestellt |
| **Rechnungsvorschau-Refactoring** — Leistungs- und Layout-Verbesserungen | ✅ Fertiggestellt |
| **Rechnungsstandards-UI** — Neue Felder in den Einstellungen (Währung, Steuersatz, Format, Zahlungsziel) | ✅ Fertiggestellt |
| **Käufer-Sortierung** — Auf-/Absteigende Sortierung mit Richtungssymbolen | ✅ Fertiggestellt |
| **Adressfilterung** — Client-seitiger Filter für Käuferverzeichnis | ✅ Fertiggestellt |
| **Übersetzungsschlüssel** — EN/DE/AR: Vorlagen, Logo-Upload, Registrierung | ✅ Fertiggestellt |

---

## Laufende Arbeiten

| Problem | Status | Notizen |
|---------|--------|---------|
| Automatischer E-Mail-Versand | 🟡 In Bearbeitung | Roadmap — Rechnungen direkt aus dem Portal senden |
| Digitale Signatur-Integration | 🟡 In Bearbeitung | Rechtliche Konformität (E-Sign-Prüfprotokoll) |
| Admin-Portal-Übersetzungsstandardisierung | 🟡 In Bearbeitung | Übersetzungsrückstand |
| Stripe-Webhook-Härtung | 🔴 Ausstehend | Finale Validierung vor GA |

---

## Nächste Meilensteine
- **Mitte April 2026:** Automatischer E-Mail-Versand für Rechnungen.
- **Ende April 2026:** Abschluss der digitalen Signatur für rechtliche Konformität.
- **April 2026:** Offizieller GA-Launch.

---
**Bericht erstellt von Antigravity AI**
