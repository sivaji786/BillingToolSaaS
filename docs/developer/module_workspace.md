# Workspace Module (My Workspace)

The Workspace module provides a multi-tenant file management system, allowing users to upload, organize, and search through project-related documents.

## 1. Technical Overview

- **Frontend Component**: `src/components/screens/Workspace.tsx`
- **Backend Controller**: `App\Controllers\WorkspaceController`
- **Database Model**: `App\Models\WorkspaceFileModel`
- **Storage Path**: `WRITEPATH/uploads/tenants/{tenant_id}/workspace/`

## 2. Core Functionalities

### 2.1 File Management
- **CRUD Operations**: Users can create folders, upload files, rename items, and delete them.
- **Upload Limits**: Currently enforced at the server level (`post_max_size` and `upload_max_filesize`).
- **Safety**: Path sanitization prevents directory traversal attacks.

### 2.2 ZIP Support
- **Extraction**: Supports extracting `.zip` archives directly within the workspace.
- **Bulk Download**: Users can select multiple items and download them as a single auto-generated ZIP file.

### 2.3 AI Search (Gemini Powered)
The Workspace module features an advanced AI search capability:
1.  **Natural Language to SQL**: The system uses Gemini to convert a text prompt (e.g., "Find all PDFs uploaded last week") into a SQL `WHERE` clause.
2.  **Contextual Filtering**: The generated SQL is strictly scoped to the `tenant_id` of the current workspace.
3.  **History Cache**: Frequent queries are stored in the `aiquery_history` table to reduce API latency and costs.

## 3. Multi-Tenancy & Security

### 3.1 Data Isolation
Data isolation is enforced at two levels:
1.  **Filesystem**: Each tenant has a dedicated directory segment.
2.  **Database**: The `WorkspaceFileModel` extends `BaseModel`, which uses the `TenantScope` trait to automatically filter all queries by the active `tenant_id`.

### 3.2 Workspace Mismatch Protection
Enforced by the `UnifiedAuthFilter`, ensuring that a user can only access the workspace designated by their JWT or the validated subdomain/UUID path.

## 4. Usage Tracking Keys
The Workspace module consumes the following limits defined in the [Plans and Usage System](../../PLAN_USAGE_SYSTEM.md):
- **storage_gb**: The total size of all files in the tenant's workspace.
- **api_calls**: AI search requests consume API call credits.
