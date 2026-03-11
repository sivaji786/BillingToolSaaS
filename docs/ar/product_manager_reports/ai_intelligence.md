# Modulbericht: KI & Intelligence-Systeme
**Status:** 🔵 Beta

## 1. Teilmodule
- **KI-Rechnungsassistent:** Text-zu-Rechnung-Parser für natürliche Sprache.
- **Ticketing-Widget:** UI-Komponente für Support und Fehlermeldungen.

## 2. Funktionen & Status
| Funktionalität | Beschreibung | Status |
| :--- | :--- | :--- |
| **NL-Parsing** | Freitext-Eingaben in UBL-konformes JSON umwandeln | 🔵 Beta |
| **Screenshot-Unterstützung** | Visuellen Kontext automatisch an Tickets anhängen | 🟢 Aktiv |
| **Kontextuelle Hilfe** | Wissensdatenbank-Integration im Ticketing-Widget | 🟡 In Bearbeitung |

## 3. Technische Implementierung
- **Controller:** `App\Controllers\AIInvoiceController`, `App\Controllers\TicketController`
- **Frontend:** `src/components/GlobalAIAssistant.tsx`, `src/components/TicketingWidget.tsx`

## 4. Risiken & Konflikte
- **KI-Halluzinationen:** Falsche Finanzzahlen durch zweideutige Eingaben.
- **Datenschutz:** Sensible Geschäftsdaten werden an LLM-Anbieter gesendet.

## 5. Roadmap
- Sprach-zu-Rechnung-Befehlsunterstützung.
- Vollständig automatisierter KI-Support-Chatbot, trainiert auf Projektdokumentation.
