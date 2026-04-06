# Application Architecture & Scalability Assessment

This document provides a technical analysis of the BillingTool application architecture, focusing on its real-world scalability characteristics and system design constraints.

---

## 1. Scalability Model of the Application

### Horizontal Scaling Capability
The system is designed for **horizontal scaling at the application layer**. The backend (CodeIgniter 4) and frontend (React/Vite) can be deployed across multiple parallel nodes without code changes.

### State Management
- **Statelessness**: The API is largely stateless, using JWT (JSON Web Tokens) for request authentication.
- **State Storage**: Application state (sessions, tenant data, configurations) is centralized in a database.
- **Session bridging**: Incoming JWTs are bridged to database-backed PHP sessions to support legacy RBAC (Role-Based Access Control) while maintaining distribution capability.

---

## 2. Session and State Handling

### Centralized Store
The application avoids local memory or file-based sessions. Instead, it utilizes a **Database-backed Session Store** (`ci_sessions` table).

### Load Balancing Compatibility
- **Node Survival**: User sessions survive load balancing across multiple server nodes because any node can retrieve the session data from the shared database.
- **Persistence**: Tokens (JWT) are stored client-side, ensuring that the frontend can interact with any backend node interchangeably.

---

## 3. Database Architecture

### Strategy
- **Single Instance Multi-tenancy**: All tenants share a single database instance.
- **Isolation**: Data isolation is enforced at the application level via a `tenant_id` filter applied to all queries.

### Expected Bottlenecks
- **Connection Limits**: As the number of concurrent application nodes increases, the database connection pool may become a bottleneck.
- **Shared IOPS**: High-intensity data operations by one tenant (e.g., massive invoice generation) can impact the performance of other tenants sharing the same physical disk and database instance.

---

## 4. Bottleneck Analysis (Enterprise Scale)

Using the **Enterprise Package** (1 TB Storage, 1,000,000 API calls, 10 TB Bandwidth, Unlimited Invoices) as the benchmark, the following operational bottlenecks are identified:

### 1. Filesystem I/O & Controller (The "Hard Break" Point)
- **Constraint**: The "Workspace" feature is hardcoded to `WRITEPATH/uploads/`.
- **Scaling Failure**: If multiple Enterprise tenants utilize their 1 TB capacity, the primary server's disk space, I/O bandwidth, and backup windows become insurmountable.
- **Critical Limit**: Beyond 2–5 TB of total multi-tenant storage, single-node Ext4/XFS filesystems will experience severe metadata latency, and the absence of a distributed file system (like S3/EFS) prevents the horizontal scaling of storage capacity independently from the application nodes.

### 2. Database Index & Query Performance (Unlimited Invoices)
- **Constraint**: Shared `invoices` and `invoice_lines` tables for all tenants.
- **Scaling Failure**: "Unlimited" invoicing means a single tenant can generate 100,000+ invoices/month. As tables swell into the tens of millions of rows, non-indexed fields and global scans (like Admin Analytics) will trigger long-running locks.
- **Critical Limit**: Database VACUUM and indexing operations will begin to overlap between maintenance windows, leading to overall system degradation across all tenants.

### 3. PHP-FPM Process Pool (1M API Calls/Month)
- **Constraint**: Synchronous request cycle for all API endpoints.
- **Scaling Failure**: 1M requests per month equates to ~0.4 req/s on average, but peak batch invoicing (often at end-of-month) can surge to 500+ req/s.
- **Critical Limit**: Since each request is synchronous, a surge in Enterprise-level traffic will starve other tenants of available PHP execution slots, resulting in "502 Bad Gateway" errors even if the CPU/RAM is not fully utilized.

### 4. Network Throughput & Memory (10 TB Bandwidth)
- **Constraint**: PHP serving large files/exports (PDFs and ZIPs) directly.
- **Scaling Failure**: Serving 10 TB/month of binary data via PHP is highly inefficient. 
- **Critical Limit**: Large file downloads (e.g., Workspace ZIP exports) consume massive RAM per PHP worker and saturate the server's NIC. This should be offloaded to a CDN or direct-access Object Storage buckets.

---

## 5. Load Distribution Capability

### Request Independence
The system is designed to handle independent requests. There are no "sticky session" requirements for core functionality. 

### Shared State Conflicts
The only major conflict is in **Workspace Management**. Since file operations (`scandir`, `mkdir`, `unlink`) are performed on local paths, the system cannot operate behind a load balancer in a multi-node environment without a shared network filesystem (NFS/EFS).

---

## 6. Background Processing

### Current Implementation: Synchronous
Heavy tasks are handled **synchronously**. There is currently no independent worker system or message queue (e.g., Redis/RabbitMQ) for off-loading long-running jobs.

### Scaling Independent Tasks
To scale heavy tasks independently, the extraction logic in `WorkspaceController` and `AIInvoiceController` must be decoupled into an asynchronous worker architecture.

---

## 7. Scaling Limits

### Design-Based Limits
- **Filesystem Hardcoding**: The reliance on `PHP's` local file functions for the Workspace feature is a hard design limit. It tethers the application to a single "source of truth" disk.
- **Global Table Reliance**: Features like `AdminAnalytics` query across all tenants on a single instance, which will degrade as the number of rows reaches the tens of millions.

---

## 8. Required Changes for True Scalability

### For 10× Scalability
1. **Centralized Caching**: Move from Database sessions/cache to **Redis**.
2. **Database Read Replicas**: Separate read/write traffic at the `Database.php` config level.
3. **Database Indexing**: Full audit of `tenant_id` and `created_at` indexes across all tables.

### For 100× Scalability
1. **Object Storage Migration**: Replace local filesystem paths with **Amazon S3 / Google Cloud Storage**. This is the single most important change required for true cloud-native horizontal scaling.
2. **Asynchronous Worker Tier**: Implement a queue system (e.g., Laravel Sidekick style or CI4 Tasks with a Redis backend) for all AI and file-processing tasks.
3. **Database Sharding**: Move to a "Database per Tenant" or "Sharded Cluster" model to eliminate cross-tenant IOPS interference.

---

**Architectural Summary**: The application is highly scalable at the logic level but currently limited by its storage design. Transitioning from local disk to object storage is the critical path to professional-grade scalability.
