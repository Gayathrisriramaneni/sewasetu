# Bharat Digital Fellowship: Seva Setu — Final Project Report

## 1. Problem Statement & Objectives

### Problem Statement
The State Government of Purvanchal provides a monthly Old Age Pension of ₹250 to eligible elderly citizens (aged 60+) residing in notified development blocks under the Purvanchal Right to Public Services (RTPS) Act. However, the existing digital portal suffered from severe usability hurdles, fragile input validation, authentication and session vulnerabilities, broken accessibility on assistive devices, and lack of conversational AI channels for citizens and officers.

### Project Objectives
1. **Remediate Critical Portal Defects**: Fix defects in rejection authentication, age calculation, session invalidation, duplicate submissions, and the 15-day statutory deemed-approval job.
2. **Citizen-Facing MCP Server**: Develop a conversational AI assistant protocol enabling elderly citizens and family helpers to discover scheme details, verify eligibility, upload documents, and submit applications.
3. **Officer-Facing MCP Server**: Develop a role-based administrative assistant protocol for Block Development Officers (BDOs) and District Magistrates to inspect queues, review evidence, track SLA deadlines, and record official decisions with auditability.
4. **Unified System of Record**: Both MCP servers and web portals operate over the same shared business logic layer, atomic database, and telephony gateway.
5. **Production Deployment & Remote MCP Endpoints**: Deploy the application to a public HTTPS environment with reachable Server-Sent Events (SSE) MCP endpoints.

---

## 2. Architecture & Technology Stack

```
                          ┌────────────────────────────────────────────────────────┐
                          │         Google Cloud Run (HTTPS Termination)           │
                          └──────────────────────────┬─────────────────────────────┘
                                                     │
                                                     ▼
                                          Port 3000 (Express Server)
                                                     │
         ┌───────────────────────────────────────────┼────────────────────────────────────────┐
         │                                           │                                        │
         ▼                                           ▼                                        ▼
┌──────────────────┐                     ┌────────────────────────┐                ┌──────────────────────┐
│  React 19 Portal │                     │  Citizen MCP (SSE)     │                │  Officer MCP (SSE)   │
│  (Tailwind CSS)  │                     │  /mcp/citizen/sse      │                │  /mcp/officer/sse    │
└────────┬─────────┘                     └───────────┬────────────┘                └──────────┬───────────┘
         │                                           │                                        │
         │  Citizen Mobile Auth                      │ 6-Digit SMS OTP                        │ Bearer Token & Block
         │  (DOB DDMMYYYY)                           │ (Single-Use Token)                     │ RBAC (bdo_*, dm_*)
         │                                           │                                        │
         └───────────────────────────────────────────┼────────────────────────────────────────┘
                                                     │
                                                     ▼
                               ┌───────────────────────────────────────────┐
                               │     Shared Application-Service Layer      │
                               │  - Eligibility & Age Engine (60+ cutoff)  │
                               │  - RTPS 15-Day Statutory SLA Calculator   │
                               │  - File Upload Validator (PDF/IMG, 5MB)   │
                               │  - Banking (DBT Format & IFSC Regex)      │
                               └─────────────────────┬─────────────────────┘
                                                     │
                                                     ▼
                               ┌───────────────────────────────────────────┐
                               │         Unified Data Store Layer          │
                               │  - Atomic File Persistence (database.json)│
                               │  - Pre-modification Backup Engine         │
                               │  - In-Process RTPS Deemed Approval Cron   │
                               │  - Simulated Telephony Gateway (/gateway) │
                               └───────────────────────────────────────────┘
```

- **Runtime**: Node.js v22 (ES Modules) running on Linux.
- **Frontend**: React 19, Tailwind CSS v4, Lucide React, jsPDF.
- **Backend**: Express 4, TypeScript, tsx, Node HTTP.
- **MCP Protocol**: `@modelcontextprotocol/sdk` (v1.32.2) using `SSEServerTransport` and in-memory test transports.
- **Validation**: Zod v4 and custom Indian telecom/banking regular expressions.
- **Persistence**: File-backed atomic JSON engine (`data/database.json`).

---

## 3. Confirmed Bugs & Implemented Fixes

1. **Defect 1: Unauthenticated Application Rejection**:
   - *Bug*: Anyone calling the rejection endpoint could flip an application to `REJECTED` without checking officer session.
   - *Fix*: Enforced `isOfficerSession` verification; requires officer identity in server session; added mandatory statutory reason ($\ge 5$ chars).
2. **Defect 2: Vulnerable Date-of-Birth Age Calculation**:
   - *Bug*: Naive year subtraction (`currentYear - birthYear`) miscalculated age for citizens born later in the current year.
   - *Fix*: Exact day-of-month and month comparison against calendar cutoff; age strictly calculated using `calculateAgeFromDate()`.
3. **Defect 3: Stale Citizen Session After Password Reset**:
   - *Bug*: Resetting password did not invalidate active session tokens.
   - *Fix*: Session storage cleared immediately upon password reset; forces re-authentication with new DOB hash.
4. **Defect 4: Single-Citizen Portal Locking**:
   - *Bug*: Hardcoded mobile reference locked the portal state to only one applicant.
   - *Fix*: Decoupled login state; dynamic store lookups supporting arbitrary citizen mobile numbers.
5. **Defect 5: Duplicate Application Creation**:
   - *Bug*: Network retry or double-click created duplicate records for the same mobile.
   - *Fix*: Unique mobile constraint enforced in `createApplication`; single-use verification tokens consumed on first submission.
6. **Defect 6: Broken Statutory RTPS Deemed Approval Job**:
   - *Bug*: Applications pending $> 15$ days were neither tracked nor transitioned.
   - *Fix*: Automated scheduler transitions overdue `PENDING` records to `DEEMED_APPROVED`, binds actor `RTPS-AUTO`, dispatches SMS notifications, and operates idempotently.
7. **Defect 7: Terminal State Mutation**:
   - *Bug*: Decided applications (`APPROVED`, `REJECTED`) could be re-decided.
   - *Fix*: Terminal state protection blocks any subsequent decision updates.

---

## 4. MCP Server Designs

### A. Citizen MCP Server (`sewasetu-citizen-assistant`)
- **Philosophy**: Conversational assistance without compromising statutory rules.
- **Tools**:
  - `get_scheme_information`: Explains ₹250/month pension, 60+ age criterion, and RTPS timeline.
  - `get_supported_blocks`: Returns notified blocks (Sonari, Rajapara, Dhemaji Pathar, Borgaon, Namti, Khelua).
  - `get_application_requirements`: Lists required identity, DBT banking, and proof documents.
  - `start_application`: Validates mobile number and initiates telecom OTP dispatch.
  - `verify_mobile_otp`: Verifies 6-digit code and issues single-use cryptographic token.
  - `validate_application_draft`: Performs statutory eligibility checks before submission.
  - `submit_application`: Commits record to official database after explicit citizen consent.
  - `get_my_application_status`: Secure lookup using mobile + DOB; masks bank accounts (`•••• •••• 8472`).

### B. Officer MCP Server (`sewasetu-officer-portal`)
- **Philosophy**: Empower official adjudication while enforcing strict territorial jurisdiction and auditability.
- **RBAC Model**:
  - BDO Sonari (`bdo_sonari`): Restricted to Sonari applications.
  - BDO Rajapara (`bdo_rajapara`): Restricted to Rajapara applications.
  - District Magistrate (`dm_purvanchal`): Supervisory access across all 6 blocks.
- **Tools**:
  - `get_officer_queue`: Filtered list of pending applications in officer's jurisdiction.
  - `get_application_summary`: Dossier summary with calculated age and SLA deadline.
  - `get_application_evidence`: Age proof metadata and bank format verification.
  - `check_processing_deadline`: 15-day RTPS SLA timeline and deemed approval status.
  - `record_officer_decision`: Commits `APPROVE` or `REJECT` with mandatory confirmation and reason.
  - `get_decision_history`: Retrieves chronological statutory audit trail.

---

## 5. Security, Privacy & Accessibility Decisions

1. **Anti-IDOR Protection**: Citizens can only view their own records by authenticating with their registered mobile number and DOB password.
2. **Zero PII Exposure**: Telephony SMS OTP codes are dispatched exclusively to the user's mobile and are **never** returned in MCP responses or logged.
3. **Defense Against Prompt Injection**:
   - All tool arguments are validated against strict Zod schemas.
   - The AI assistant cannot invent or override officer identities; identity is established server-side from bearer tokens.
   - Explicit confirmation flags (`consent_agreed: true`, `confirm_explicit: true`) prevent accidental or autonomous submissions.
4. **Accessibility (WCAG 2.1 AA)**:
   - High-contrast visual cues (minimum 4.5:1 ratio).
   - Screen-reader friendly semantic labels (`aria-label`, `<label for="...">`).
   - Assamese and Bengali multi-language text rendering support.
   - Full keyboard navigability across wizard steps.

---

## 6. Implementation Status Matrix

| Component | Status | Verification Reference |
|---|---|---|
| Citizen Web Portal | **IMPLEMENTED** | Verified live at port 3000 / Cloud Run HTTPS |
| Officer Web Dashboard | **IMPLEMENTED** | Secured administrative view at `/admin` |
| Shared Application Service | **IMPLEMENTED** | `src/services/applicationService.ts` |
| Atomic File Database & Backup | **IMPLEMENTED** | `src/data/dbPersistence.ts` |
| RTPS Deemed Approval Cron | **IMPLEMENTED** | In-process daemon in `server.ts` |
| Citizen MCP Server | **IMPLEMENTED** | Verified via Vitest & SSE transport |
| Officer MCP Server & RBAC | **IMPLEMENTED** | Verified via Vitest & SSE transport |
| SMS Gateway Simulation | **IMPLEMENTED** | `/src/services/smsService.ts` & UI gateway |
| Real Telecom Carrier Integration | *BLOCKED* | Requires commercial SMPP/CDAC telephony gateway contract |
| Distributed Multi-Region SQL | *PARTIALLY IMPLEMENTED* | SQLite/JSON persistent file active; ready for Cloud SQL |
