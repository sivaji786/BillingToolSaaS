# Sales: Pricing & Package Summary

This document provides a high-level overview of our subscription tiers, designed for the sales team to quickly identify the best fit for prospects.

## 1. Billing Philosophy
The platform uses a **Tiered Multi-Tenant model** with hard-limit enforcement. Revenue is driven by:
1.  **Subscription Fees**: Fixed monthly/annual recurring revenue.
2.  **Usage Overages**: Scaling costs based on Storage and API activity.

## 2. Plan Types

### 🚀 Public Plans (Self-Serve)
Visible on the public pricing page. Optimized for high-volume, low-touch acquisition.
- **Starter**: For small businesses. Focused on basic invoicing.
- **Pro**: For growing teams. Includes advanced templates and AI search.

### 🛡️ Private Plans (Custom/Enterprise)
Hidden from the public site. These are created by admins for specific partners or high-value clients.
- **Enterprise**: Custom limits on storage and users.
- **Partner/Legacy**: Discounted tiers for early adopters or integration partners.

### 🧪 Trailing Plan (Automated Trial)
A restricted default plan assigned to all **QuickAccess** users. 
- **Purpose**: Low-friction lead generation.
- **Conversion Path**: Users on the trailing plan are prompted to upgrade once they hit 80% usage or 7 days of activity.

## 3. Limits Overview (Hard Enforcement)
All plans enforce limits on the following metrics:
- **Users**: Number of seats.
- **Storage (GB)**: Workspace file capacity.
- **API Calls**: Monthly quota for AI Assistant / AI Search.
- **Invoices**: Total document generation quota.

> [!NOTE]
> All limits can be set to "Unlimited" for Enterprise deals by using the value `-1` in the Package Editor.
