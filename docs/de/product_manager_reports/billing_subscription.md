# Modulbericht: Abonnement & Abrechnung
**Status:** 🟡 In Entwicklung

## 1. Teilmodule
- **Plan-Manager:** CRUD für Abonnementtarife (`Starter`, `Pro`, `Enterprise`).
- **Nutzungs-Tracker:** Überwacht API-Aufrufe, Speicher und Bandbreitennutzung.
- **Zahlungs-Gateway:** Externe Anbieterintegration (Stripe).

## 2. Funktionen & Status
| Funktionalität | Beschreibung | Status |
| :--- | :--- | :--- |
| **Tarifverwaltu ng** | Preis-, Feature- und Limit-Metadaten. Unterstützt **Öffentlich/Privat**-Umschalter | ✅ Stabil |
| **QuickAccess-Plan** | Automatische Zuweisung eines „Trailing"-Plans für neue Anmeldungen | ✅ Stabil |
| **Echtzeit-Nutzung** | Dashboard-Widgets und Limit-Durchsetzung (Speicher, API) | ✅ Stabil |
| **Automatisierte Abrechnung** | Abonnementverlängerung via Webhooks | 🟡 In Bearbeitung |
| **Schwellenwert-Benachrichtigungen** | E-Mail-Benachrichtigungen bei 80 %, 90 % und 100 % Nutzung | ✅ Stabil |

## 3. Technische Implementierung
- **Controller:** `App\Controllers\AdminBilling`, `App\Controllers\AdminPackages`
- **Modelle:** `App\Models\SubscriptionModel`, `App\Models\PlanModel`
- **Webhooks:** `App\Controllers\Webhooks` (Stripe-Handler)

## 4. Risiken & Konflikte
- **Datenkonsistenz:** Synchronisierung von Nutzungs-Metadaten mit Echtzeit-Datenbankstatus.
- **Proration:** Komplexitäten in der Abrechnungslogik bei Upgrades mitten im Abrechnungszeitraum.

## 5. Roadmap
- Integration mit PayPal und lokalen Zahlungs-Gateways.
- Rabattcodes und Aktionsgutschein-Unterstützung.
