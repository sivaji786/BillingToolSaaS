# Modulbericht: Authentifizierung & RBAC
**Status:** 🟡 Stabil (Verfeinert)

## 1. Teilmodule
- **Hybrid-Auth-Filter:** Einheitliche Authentifizierung für API (JWT) und Web (Session).
- **RBAC-Engine:** Granulare Berechtigungsprüfungen (`RbacFilter.php`).
- **Identity Provider:** JWT-basierte Token-Ausstellung und -Validierung.

## 2. Funktionen & Status
| Funktionalität | Beschreibung | Status |
| :--- | :--- | :--- |
| **JWT-Login** | Zustandslose Authentifizierung für mobile/Web-Clients | ✅ Stabil |
| **SA/Kunden-Wechsel** | Logik für mehrere Rollen in verschiedenen Portalen | 🟡 Verfeinert |
| **Ressourcenrechte** | Fähigkeit, Rechte wie `invoices.create` zu definieren | 🟢 Aktiv |
| **Session-Blacklist** | Token serverseitig widerrufen | 🔴 Ausstehend |

## 3. Technische Implementierung
- **Filter:** `App\Filters\RbacFilter`, `App\Filters\HybridAuthFilter`
- **Helfer:** `App\Helpers\JWTHelper`
- **Controller:** `App\Controllers\Auth`, `App\Controllers\AdminAuth`

## 4. Risiken & Konflikte
- **Token-Sicherheit:** Kurzlebige Tokens erforderlich, um Lecks zu minimieren.
- **Login-Ausschluss:** Frühere Konflikte zwischen Super-Admin- und regulären Benutzer-Login-Zuständen.

## 5. Roadmap
- Multi-Faktor-Authentifizierung (MFA) implementieren.
- Unterstützung für Social Logins hinzufügen (Google/GitHub).
