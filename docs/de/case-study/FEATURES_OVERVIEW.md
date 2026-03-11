# Funktionsübersicht: BillingTool

## Einführung

BillingTool bietet eine umfassende Suite von Funktionen zur Erstellung, Verwaltung und zum Export von EN 16931-konformen Rechnungen. Dieses Dokument beschreibt alle wichtigen Funktionen und Möglichkeiten.

## Kernfunktionen

### 1. SaaS & Mehrmandantenfähigkeit

#### Mandanten-Isolierung (Subdomains)
- ✅ **Dedizierte Subdomains** - Automatisches Routing über `{tenant}.humpl.org`.
- ✅ **Fail-Closed-Sicherheit** - Strenge Isolierung gewährleistet null Datenlecks zwischen Mandanten.
- ✅ **Dynamisches Branding** - Subdomain-spezifische Logos und Unternehmensprofile.

#### Nutzungsdurchsetzung (Harte Limits)
- ✅ **Ressourcen-Deckelung** - Automatisches Blockieren der Datensatzerstellung bei Erreichen von Planlimits.
- ✅ **Echtzeit-Prüfungen** - Limits werden on-the-fly für Rechnungen, Benutzer und Projekte überprüft.
- ✅ **Upgrade-Aufforderungen** - Integrierte Benachrichtigungen beim Erreichen von Nutzungsgrenzen.

#### Plan-Verwaltung
- ✅ **Gestufte Abonnements** - Unterstützung für Starter-, Pro-, Business- und Enterprise-Pläne.
- ✅ **Feature-Gating** - Modularer Zugriff auf erweiterte Tools (z. B. KI-Assistent) basierend auf dem Plan.

### 2. Rechnungsverwaltung

#### Beteiligten-Management

**Verkäufer-Informationen:**
- Firmenname
- USt-IdNr. (validiertes Format)
- Rechtliche Organisations-ID
- Vollständige Adresse (Straße, Stadt, Postleitzahl, Land)
- Kontakt-E-Mail und Telefon
- Bankverbindung (IBAN, BIC)

**Käufer-Informationen:**
- Alle Verkäuferfelder anwendbar
- Kundenspezifische Details
- Rechnungsadresse
- Kontaktinformationen

#### Positionen (Line Items)
- ✅ Unbegrenzte Positionen hinzufügen.
- ✅ Drag-to-Reorder für Positionen.
- ✅ Inline-Bearbeitung.
- ✅ Automatische Berechnung der Summen.
- ✅ Steuerkategorie pro Position.

### 3. Steuerberechnungen

#### Unterstützte Steuerkategorien

| Code | Beschreibung | Anwendungsfall |
|------|-------------|----------|
| **S** | Standardsatz | Normale MwSt (z. B. 19 %) |
| **Z** | Nullsatz | Exporte, Bücher |
| **E** | Steuerbefreit | Gesundheitswesen, Bildung |
| **AE** | Umkehrung der Steuerschuld (Reverse Charge) | B2B-Dienstleistungen |
| **K** | Innergemeinschaftlich | EU-grenzüberschreitend |
| **G** | Freier Export | Außerhalb der EU |

#### Automatische Berechnungen
- Zeilensumme = Menge × Einzelpreis
- Steuerbetrag = Zeilensumme × Prozentsatz
- Nettobetrag (Summe aller Zeilensummen)
- Steuerpflichtiger Betrag
- Bruttobetrag (einschließlich Steuern)
- Zahlbarer Betrag (Endsumme)

### 4. EN 16931 Konformität

#### Echtzeit-Validierung
- ✅ **Gültig** - Vollständig EN 16931-konform.
- ⚠️ **Warnung** - Fehlende optionale Felder.
- ❌ **Fehler** - Fehlende Pflichtfelder.

#### Validierungs-Panel
- Live-Validierung während der Eingabe.
- Detaillierte Fehlermeldungen.
- Lösungsvorschläge für jedes Problem.
- UBL-Pfad-Referenzen.

### 5. Export- und Importformate

#### Export
- ✅ **PDF** - Professionelles Rechnungs-Layout, Template-gesteuert.
- ✅ **UBL XML** - EN 16931-konform, korrekte Namespaces.
- ✅ **JSON** - Strukturierte Daten für einfache Analyse.
- ✅ **CSV** - Tabellenkalkulationskompatibel für Excel/Google Sheets.

#### Import
- ✅ **JSON** - Einzelobjekte oder Arrays.
- ✅ **CSV** - Unterstützung für mehrere Rechnungen, Vorlage verfügbar.
- ✅ **UBL XML** - Vollständiges Parsing von Beteiligten und Positionen.

### 6. Templates & Design

- **Template-Editor**: Logo-Upload, Farben, Schriftarten, Kopf- und Fußzeilen.
- **Template-Bibliothek**: Speichern und Verwalten eigener Vorlagen.
- **Mehrsprachigkeit**: Volle Unterstützung für 6 Sprachen inkl. Arabisch (RTL).
- **Theme-System**: Hell-/Dunkelmodus mit Systemerkennung.

### 7. Erweiterte Module

- **Mein Arbeitsbereich**: Persönliches Produktivitätszentrum (Pro+-Pläne).
- **Quick Access**: Sofortige Testversion ohne Registrierung.
- **Quick Tour**: Interaktive Einführung für neue Benutzer.
- **Käufer / Kontakte**: Adressbuch für die schnelle Rechnungserstellung.
- **KI-Assistent (Gemini)**: Entwurfserstellung, Analyse und Compliance-Beratung.
- **Super-Admin-Portal**: Plattformverwaltung, Pakete, Billing und Ticket-Queue.
- **Ticketing-Widget**: Eingebetteter Support auf allen Seiten.
- **Admin Wiki**: Live-Dokumentation im Admin-Portal.

---

**Nächster Schritt:** Lesen Sie den [Geschäftswert](BUSINESS_VALUE.md) für ROI und Marktanalysen.

**Version:** 2.0.0  
**Zuletzt aktualisiert:** Januar 2026
