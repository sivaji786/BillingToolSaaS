# Module Report: Authentication & RBAC
**Status:** 🟡 Stable (Refining)

## 1. Sub-Modules
- **Hybrid Auth Filter:** Unified authentication for API (JWT) and Web (Session).
- **RBAC Engine:** Granular permission checks (`RbacFilter.php`).
- **Identity Provider:** JWT-based token issuance and validation.

## 2. Functionalities & Status
| Functionality | Description | Status |
| :--- | :--- | :--- |
| **JWT Login** | Stateless authentication for mobile/web clients. | ✅ Stable |
| **SA/Customer Switching**| Logic to handle multiple roles across different portals. | 🟡 Refining |
| **Resource Rights** | Ability to define rights like `invoices.create`. | 🟢 Active |
| **Session Blacklist** | Revoking tokens server-side. | 🔴 Pending |

## 3. Technical Implementation
- **Filter:** `App\Filters\RbacFilter`, `App\Filters\HybridAuthFilter`
- **Helper:** `App\Helpers\JWTHelper`
- **Controllers:** `App\Controllers\Auth`, `App\Controllers\AdminAuth`

## 4. Risks & Conflicts
- **Token Security:** Short-lived tokens are required to mitigate leakage risks.
- **Login Exclusion:** Past conflicts between Super Admin and regular User login states.

## 5. Roadmap
- Implement Multi-Factor Authentication (MFA).
- Add support for Social Logins (Google/GitHub).
