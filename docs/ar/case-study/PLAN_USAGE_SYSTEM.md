# Plans and Usage System

This document explains how packages (plans) are managed, how limits are defined, and how the system tracks and enforces usage for tenants.

## 1. Subscription Packages (Plans)

Packages are the core of the billing system. They define the features and limits available to a tenant.

### Plan Attributes
- **Public vs. Private**:
    - **Public**: Visible on the main pricing and upgrade pages. Useful for standard offerings.
    - **Private**: Hidden from public view. Used for custom deals, internal testing, or "legacy" plans.
- **Trailing (Default)**:
    - Only one plan can be the "Trailing" plan.
    - This plan is automatically assigned to new tenants created via the **QuickAccess** flow.
    - It cannot be deleted via the Admin Portal to ensure system stability.
- **Active/Inactive**:
    - Inactive plans cannot be assigned to new subscriptions.

## 2. Features and Limits

Plans have two ways of defining what a user gets:

### Descriptive Features
Stored in the `features` JSON column. These are purely for display in the UI (e.g., "Priority Support", "Custom Branding"). They do not trigger automated blocks.

### Enforced Limits
Stored in the `limits` JSON column. The backend automatically extracts these from the "Type" selected in the Package Editor.

| Feature Type | Key in `limits` | Description |
| :--- | :--- | :--- |
| **Storage** | `storage_gb` | Maximum disk space in GB for Workspace files. |
| **Users** | `users` | Maximum number of team members in a tenant. |
| **API Calls** | `api_calls` | Maximum number of AI Search or AI Invoice queries. |
| **Invoices** | `invoices` | Maximum number of invoices generated per month. |

> [!TIP]
> Setting a limit value to `-1` or `Unlimited` provides infinite access to that feature.

## 3. Usage Tracking & Enforcement

### Real-time Enforcement
The system uses the `UsageEnforcement` trait (found in `BaseController.php` or specialized controllers) to check limits before allowing an action.
- **Check**: `checkUsageLimit($tenantId, 'storage_gb')`
- **Result**: If the limit is exceeded, the request is blocked with a `403 Forbidden` response and a redirection hint to the billing page.

### Periodic Usage Checks
A background CLI command runs periodically to monitor usage across all tenants.
```bash
php spark maintenance:check-usage
```
- **Thresholds**: It checks if a tenant has reached 80%, 90%, or 100% of their limits.
- **Notifications**: It sends automated email alerts to the tenant admin when these thresholds are crossed.

### Database Schema
- `plans`: Stores plan definitions and limits.
- `usage_notifications`: Tracks which alerts have already been sent to avoid spamming the user.
- `workspace_files`: Size is summed to calculate storage usage.
- `ai_query_history`: Counted to calculate API usage.

## 4. Admin Management

The **Super Admin** can manage plans via the **Packages** section:
1. **Create/Edit**: Define name, price, and add features with assigned "Types".
2. **Toggle Visibility**: Use the "Visible to Public" checkbox.
3. **Set Default**: Use the "Default (Trailing)" checkbox to set the QuickAccess plan.
