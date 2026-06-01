# WorkHub SaaS — User-Facing Feature Requirements

**Document type:** Product Requirements (User Perspective)  
**Scope:** WorkHub field-worker and planner-facing features as described in Help documentation  
**Framing:** All requirements are stated as "the system shall" obligations from the user's perspective  
**Version:** 1.0  
**Date:** 2026-05-27

---

## Table of Contents

1. [Getting Started & Role Overview](#1-getting-started--role-overview)
2. [Tasks](#2-tasks)
3. [Timer & Working Time Recording](#3-timer--working-time-recording)
4. [Done Reports](#4-done-reports)
5. [AI Text Correction](#5-ai-text-correction)
6. [Materials](#6-materials)
7. [Photos](#7-photos)
8. [Signature](#8-signature)
9. [Language Settings](#9-language-settings)
10. [Content Translation](#10-content-translation)
11. [Export Language](#11-export-language)
12. [Capacity Planning](#12-capacity-planning)
13. [Also at This Location (Batch Tasks)](#13-also-at-this-location-batch-tasks)
14. [Inbox (Notifications)](#14-inbox-notifications)
15. [Profile](#15-profile)
16. [Timesheet](#16-timesheet)
17. [Documents & Export](#17-documents--export)
18. [Customer Consent Form](#18-customer-consent-form)
19. [Offline Mode](#19-offline-mode)
20. [Legal Compliance Summary](#20-legal-compliance-summary)

---

## 1. Getting Started & Role Overview

| # | Requirement |
|---|-------------|
| 1.1 | The system shall present the user with a role-appropriate view upon login, distinguishing at minimum between field worker and planner roles. |
| 1.2 | The system shall provide onboarding or help documentation that explains each role's capabilities and responsibilities from the user's perspective. |
| 1.3 | The system shall ensure that users can access their assigned tasks, timer, and profile without requiring technical knowledge of the underlying system. |

---

## 2. Tasks

### 2.1 Viewing Tasks

| # | Requirement |
|---|-------------|
| 2.1.1 | The system shall display all tasks assigned to the logged-in user in a clear list or card view. |
| 2.1.2 | The system shall show relevant task details including location, description, scheduled time, and current status. |
| 2.1.3 | The system shall allow the user to filter or sort tasks by status, date, or location. |

### 2.2 Starting Tasks

| # | Requirement |
|---|-------------|
| 2.2.1 | The system shall provide a clearly labelled action to start a task, transitioning it from its current status to "In Progress". |
| 2.2.2 | The system shall record the actual start time when the user initiates a task. |

### 2.3 Status Management

| # | Requirement |
|---|-------------|
| 2.3.1 | The system shall allow users to transition tasks through defined status states (e.g., Pending → In Progress → Done). |
| 2.3.2 | The system shall prevent invalid status transitions and inform the user if an action is not permitted. |
| 2.3.3 | The system shall reflect status changes in real time (or upon next sync in offline mode). |

---

## 3. Timer & Working Time Recording

### 3.1 Timer Controls

| # | Requirement |
|---|-------------|
| 3.1.1 | The system shall provide Start, Stop, and Break controls for the working time timer. |
| 3.1.2 | The system shall record the precise timestamp of each Start, Stop, and Break event. |
| 3.1.3 | The system shall display the elapsed working time to the user in real time while the timer is running. |
| 3.1.4 | The system shall support resuming work after a break, clearly distinguishing break time from working time. |

### 3.2 Legal Recording Requirement (§16 ArbZG / EuGH C-55/18)

| # | Requirement |
|---|-------------|
| 3.2.1 | The system shall record working time in a manner compliant with §16 ArbZG (German Working Hours Act) and the EuGH C-55/18 ruling requiring objective, reliable, and accessible working time records. |
| 3.2.2 | The system shall store time records with sufficient granularity (start, end, breaks) to satisfy statutory audit requirements. |
| 3.2.3 | The system shall retain time records for a minimum of 2 years in compliance with applicable retention obligations. |

### 3.3 Break Warning

| # | Requirement |
|---|-------------|
| 3.3.1 | The system shall display a prominent warning to the user when cumulative working time reaches or exceeds 8 hours without a recorded break of at least 30 minutes. |
| 3.3.2 | The warning shall reference the statutory break requirement so the user understands the legal context. |
| 3.3.3 | The system shall not automatically stop the timer or insert a break; the warning is informational only and the user retains control. |

---

## 4. Done Reports

| # | Requirement |
|---|-------------|
| 4.1 | The system shall provide a Done Report form that the user completes when marking a task as finished. |
| 4.2 | The system shall require or prompt for a **completion note** describing the work performed. |
| 4.3 | The system shall prompt for an **overrun reason** if the actual time or scope exceeded the planned values. |
| 4.4 | The system shall allow the user to record **materials used** within the Done Report (see also Section 6). |
| 4.5 | The system shall allow the user to attach **photos** within the Done Report (see also Section 7). |
| 4.6 | The system shall collect a **customer signature** within the Done Report (see also Section 8). |
| 4.7 | The system shall obtain and record **GDPR/DSGVO consent** from the data subject within the Done Report flow. |
| 4.8 | The system shall offer a **paper alternative** for situations where the customer cannot or will not sign digitally, allowing the field worker to record that consent was obtained on paper. |

---

## 5. AI Text Correction

| # | Requirement |
|---|-------------|
| 5.1 | The system shall offer an AI-assisted text correction function for user-entered text fields (e.g., completion notes). |
| 5.2 | The system shall present the correction result as a **diff view** clearly showing "You wrote:" (original) and "Corrected to:" (suggested) side by side or sequentially. |
| 5.3 | The system shall allow the user to **accept** the corrected version, replacing the original in the field. |
| 5.4 | The system shall allow the user to **reject** the correction, preserving the original text unchanged. |
| 5.5 | The system shall **always preserve the original text** and never automatically overwrite it without explicit user acceptance. |
| 5.6 | The system shall support AI text correction **cross-language** — the correction engine shall handle input in any supported language and produce output in the same language without requiring the user to specify the language manually. |

---

## 6. Materials

| # | Requirement |
|---|-------------|
| 6.1 | The system shall allow users to add material line items to a task or Done Report, including item name, quantity, and unit. |
| 6.2 | The system shall allow users to enter a **billing comment** per material item to provide context for invoicing. |
| 6.3 | The system shall **automatically generate invoice line items** from recorded materials, carrying item descriptions, quantities, and billing comments through to the invoice. |
| 6.4 | The system shall allow users to edit or remove material entries before the Done Report is submitted. |

---

## 7. Photos

### 7.1 Job Site Photos

| # | Requirement |
|---|-------------|
| 7.1.1 | The system shall allow users to capture or upload **job site photos** documenting the work location and work performed. |
| 7.1.2 | Job site photos shall be attached to the relevant task and included in exported documents where applicable. |

### 7.2 Identity Photos

| # | Requirement |
|---|-------------|
| 7.2.1 | The system shall support capture of **identity photos** including: ID card photo, badge photo, QR code scan, and person photo. |
| 7.2.2 | Identity photos shall be stored securely and linked to the relevant task or consent record. |
| 7.2.3 | The system shall handle identity photos in compliance with GDPR/DSGVO data minimisation and purpose-limitation principles. |

---

## 8. Signature

| # | Requirement |
|---|-------------|
| 8.1 | The system shall provide an on-screen signature pad operable by **finger or stylus**. |
| 8.2 | The system shall capture the signer's **name and role** alongside the signature image. |
| 8.3 | The captured signature shall be stored in a manner that is **eIDAS Regulation 910/2014 compliant** for electronic signatures. |
| 8.4 | The system shall provide the **customer with a copy** of the signed document (digitally or as a printable PDF). |
| 8.5 | The system shall record the timestamp of the signature event and associate it with the signed document version. |

---

## 9. Language Settings

| # | Requirement |
|---|-------------|
| 9.1 | The system shall allow users to select their **UI language** from at least 5 supported language options. |
| 9.2 | The system shall allow users to configure a **fallback language** to be used when content is unavailable in the primary UI language. |
| 9.3 | The system shall allow users to set an **export language** independently of the UI language (see Section 11). |
| 9.4 | Language preferences shall be persisted per user profile and restored across sessions. |

---

## 10. Content Translation

| # | Requirement |
|---|-------------|
| 10.1 | The system shall **auto-detect the language** of incoming content (task descriptions, notes, etc.) without requiring user input. |
| 10.2 | The system shall display a **skeleton placeholder** in the target language while translation is being fetched, so the user sees the layout immediately. |
| 10.3 | Translation shall be performed **asynchronously**, updating the displayed content when the translation result becomes available without blocking user interaction. |
| 10.4 | The system shall provide a **"Translate all"** button allowing users to trigger translation of all untranslated content on a screen in one action. |
| 10.5 | The system shall provide a **"Show original"** toggle that allows the user to switch between the translated content and the original source text at any time. |

---

## 11. Export Language

| # | Requirement |
|---|-------------|
| 11.1 | The system shall use the user's configured **export language** to determine the language of headers, labels, and boilerplate text in exported documents (invoices, timesheets, work orders, etc.). |
| 11.2 | The export language setting shall **not affect task content** (descriptions, notes, completion reports) — task content is exported as entered or translated separately. |
| 11.3 | The export language shall be configurable independently of both the UI language and the fallback language. |

---

## 12. Capacity Planning

| # | Requirement |
|---|-------------|
| 12.1 | The system shall display each worker's **queue depth** (number of pending/active tasks assigned). |
| 12.2 | The system shall display a **free-from date** per worker, indicating the earliest date the worker is estimated to be available for new assignments. |
| 12.3 | The system shall display a **utilisation percentage** per worker reflecting current workload relative to capacity. |
| 12.4 | The system shall present **worker cards** within the New Task assignment flow, showing the capacity metrics above to assist planners in making informed assignment decisions. |

---

## 13. Also at This Location (Batch Tasks)

| # | Requirement |
|---|-------------|
| 13.1 | The system shall detect when multiple tasks share the same site/location and present them to the user as a group. |
| 13.2 | The system shall provide an **"Also at this location"** feature allowing users to view and action related tasks at the same site in a single workflow. |
| 13.3 | The system shall allow users to batch-complete or batch-update related location tasks where appropriate, reducing repeated data entry. |

---

## 14. Inbox (Notifications)

| # | Requirement |
|---|-------------|
| 14.1 | The system shall provide an **Inbox** view that aggregates notifications delivered to the user. |
| 14.2 | The Inbox shall display notifications from at least the following sources: **planner messages**, **client messages**, and **system notifications**. |
| 14.3 | The system shall indicate unread notification count to the user (e.g., badge on the Inbox icon). |
| 14.4 | The system shall allow users to mark notifications as read and navigate to the relevant task or record from a notification. |

---

## 15. Profile

| # | Requirement |
|---|-------------|
| 15.1 | The system shall provide a **Profile** page where users can view their own information and preferences. |
| 15.2 | The Profile page shall display **capacity tiles** showing the user's current queue depth, utilisation, and free-from date. |
| 15.3 | The Profile page shall allow users to manage their **language preferences** (UI language, fallback language, export language). |
| 15.4 | Users shall be able to update their profile information without requiring administrator intervention for standard fields. |

---

## 16. Timesheet

| # | Requirement |
|---|-------------|
| 16.1 | The system shall **automatically generate a timesheet** from the user's recorded timer events, requiring no manual timesheet entry. |
| 16.2 | The timesheet shall display **daily totals** and **weekly totals** of working time. |
| 16.3 | The system shall provide a **sign-off function** allowing the user (and/or a supervisor) to formally approve the timesheet for a given period. |
| 16.4 | The system shall allow the timesheet to be **printed or exported as PDF**. |
| 16.5 | Timesheet records shall be retained for a minimum of 2 years in compliance with §16 ArbZG and EuGH C-55/18. |

---

## 17. Documents & Export

### 17.1 Document Types

The system shall support generation and export of the following document types:

| Document Type | Description |
|---|---|
| Work Order | Pre-work document describing the task to be performed |
| Completion Certificate | Post-work document confirming task completion, signed by customer |
| Timesheet | Working time record for a worker over a period |
| Project Status Report | Overview of task/project progress |
| Invoice | Billable items, materials, and time for a task or project |

### 17.2 Export Requirements

| # | Requirement |
|---|-------------|
| 17.2.1 | The system shall make all document types **printable and exportable as PDF**. |
| 17.2.2 | All exported documents shall use the user's configured **export language** for headers and boilerplate (see Section 11). |
| 17.2.3 | Invoices shall include line items derived from recorded materials and time entries. |
| 17.2.4 | The system shall retain exported documents in compliance with §257 HGB and §147 AO (10-year retention). |

---

## 18. Customer Consent Form

| # | Requirement |
|---|-------------|
| 18.1 | The system shall provide a **paper-printable GDPR/DSGVO consent form** for situations where digital consent cannot be obtained. |
| 18.2 | The system shall allow the field worker to **photograph the signed paper consent form** and upload it to the relevant task record, creating a digital audit trail. |
| 18.3 | The uploaded photo of the signed paper form shall be stored securely and linked to the task, completion record, and any associated personal data processing activities. |
| 18.4 | The system shall record whether consent was obtained digitally (via in-app signature) or via the paper alternative, and store the corresponding evidence in either case. |

---

## 19. Offline Mode

| # | Requirement |
|---|-------------|
| 19.1 | The system shall display a clearly visible **offline banner** when the device has no network connectivity, informing the user they are working offline. |
| 19.2 | The system shall **cache task data, timer state, and form inputs locally** on the device so the user can continue working without interruption during connectivity loss. |
| 19.3 | The system shall **automatically synchronise** locally cached data with the server when network connectivity is restored, without requiring manual user action. |
| 19.4 | The system shall resolve or surface any **sync conflicts** to the user in a clear and non-destructive way. |
| 19.5 | Critical functions (viewing assigned tasks, running the timer, capturing a Done Report) shall remain available in offline mode. |

---

## 20. Legal Compliance Summary

The following table summarises the legal and regulatory obligations that the system must satisfy as observable from the user's perspective.

| Regulation / Standard | Scope | Key System Obligation |
|---|---|---|
| **GDPR / DSGVO** | EU data protection | Obtain and record explicit consent before processing personal data; support data subject rights (access, erasure); apply data minimisation to identity photos and signatures |
| **§257 HGB** (German Commercial Code) | Commercial document retention | Retain invoices, completion certificates, work orders, and related commercial documents for **10 years** |
| **§147 AO** (German Tax Code) | Tax document retention | Retain tax-relevant records (invoices, timesheets used for billing) for **10 years** |
| **§16 ArbZG** (German Working Hours Act) | Working time recording | Record start, end, and break times for every working day; make records accessible for inspection |
| **EuGH C-55/18** (CCOO v Deutsche Bank) | Working time recording | Maintain an objective, reliable, and accessible system for recording daily working time per worker |
| **eIDAS Regulation 910/2014** | Electronic signatures | Ensure customer signatures captured in-app meet eIDAS requirements for electronic signatures; record signer identity, timestamp, and document version |
| **BSI IT-Grundschutz** | IT security baseline | Implement security controls consistent with BSI IT-Grundschutz baseline protection for data at rest and in transit |
| **Data Retention — Time Records** | Working time records | Retain working time records for a **minimum of 2 years** |
| **Data Retention — Commercial/Tax Records** | Invoices, certificates | Retain for a **minimum of 10 years** (§257 HGB / §147 AO) |

---

*End of requirements document.*
