# Vertrieb: Preise & Paketübersicht

Dieses Dokument bietet eine Übersicht der Abonnementtarife für das Vertriebsteam.

## 1. Abrechnungsphilosophie
Die Plattform nutzt ein **gestuftes Multi-Tenant-Modell** mit strikter Limit-Durchsetzung. Die Einnahmen entstehen durch:
1.  **Abonnementgebühren**: Feste monatliche/jährliche wiederkehrende Einnahmen.
2.  **Nutzungsüberschreitungen**: Skalierbare Kosten basierend auf Speicher- und API-Aktivität.

## 2. Plantypen

### 🚀 Öffentliche Pläne (Self-Service)
Sichtbar auf der öffentlichen Preisseite. Optimiert für hohe Volumen und geringen Betreuungsaufwand.
- **Starter**: Für kleine Unternehmen. Fokus auf grundlegende Rechnungsstellung.
- **Pro**: Für wachsende Teams. Enthält erweiterte Vorlagen und KI-Suche.

### 🛡️ Private Pläne (Individuell/Enterprise)
Nicht öffentlich sichtbar. Werden von Admins für spezifische Partner oder hochwertige Kunden erstellt.
- **Enterprise**: Individuelle Speicher- und Benutzerlimits.
- **Partner/Legacy**: Rabattierte Tarife für Frühadoptierer oder Integrationspartner.

### 🧪 Trailing Plan (Automatischer Test)
Ein eingeschränkter Standardplan für alle **QuickAccess**-Benutzer.
- **Zweck**: Lead-Generierung mit geringer Einstiegshürde.
- **Konversionspfad**: Benutzer werden zur Aktualisierung aufgefordert, wenn sie 80 % der Nutzung oder 7 Aktivitätstage erreichen.

## 3. Limit-Übersicht (Strikte Durchsetzung)
Alle Pläne setzen Limits für folgende Metriken durch:
- **Benutzer**: Anzahl der Plätze.
- **Speicher (GB)**: Workspace-Dateikapazität.
- **API-Aufrufe**: Monatliches Kontingent für KI-Assistent / KI-Suche.
- **Rechnungen**: Gesamte Dokumentgenerierungsquote.

> [!NOTE]
> Alle Limits können für Enterprise-Abschlüsse auf „Unbegrenzt" gesetzt werden, indem der Wert `-1` im Paket-Editor verwendet wird.
