# Sewa Setu — Officer-Facing Model Context Protocol (MCP) Server

## Overview

The **Sewa Setu Officer MCP Server** (`sewasetu-officer-portal`) allows authorized Block Development Officers (BDOs) and the District Magistrate to inspect the pending pension application queue, review supporting evidence, monitor statutory deadlines under the Purvanchal Right to Public Services (RTPS) Act, and record legally binding adjudication decisions (Approve or Reject) with an immutable audit trail.

---

## Authentication & Authorization Architecture

1. **Role-Based Access Control (RBAC)**:
   - **Block Development Officers (BDOs)**: Strictly restricted to applications belonging to their assigned development block (e.g. `bdo_sonari` can only view and adjudicate `Sonari` applications).
   - **District Magistrate (DM)**: Supervisory access across all 6 notified blocks (`*`).
2. **Server-Side Identity Binding**:
   - The officer identity is established via authenticated Bearer token.
   - The model **cannot** declare or forge an officer identity. Decisions are permanently committed with the `decided_by` field bound directly to the authenticated officer's identity.
3. **Privilege Separation**:
   - The citizen MCP server does not expose any officer tools (`record_officer_decision`, `get_officer_queue`, etc.).
   - Officer endpoints (`/mcp/officer/sse`) require a valid officer token. Unauthenticated requests receive `401 Unauthorized`.

---

## Tool Reference

### 1. `get_officer_queue`
- **Purpose**: Lists pending applications permitted within the authenticated officer's block jurisdiction.
- **Arguments**:
  - `overdue_only` (boolean, optional): Only list applications pending $> 15$ days.
  - `limit` (number, default: 50).
- **Security**: Filters out all applications from unauthorized blocks.

### 2. `get_application_summary`
- **Purpose**: Returns a structured summary of an applicant's dossier (name, calculated age, eligibility check, masked bank details, days pending, and statutory deadline).
- **Arguments**: `application_id` (number).
- **Security**: Verifies block jurisdiction before returning record.

### 3. `get_application_evidence`
- **Purpose**: Returns age proof metadata, document verification flags, and banking format validation.
- **Arguments**: `application_id` (number).
- **Security**: Rejects access with `BLOCK_ACCESS_DENIED` if outside officer jurisdiction.

### 4. `check_processing_deadline`
- **Purpose**: Calculates elapsed days, statutory deadline date, and RTPS deemed approval applicability.
- **Arguments**: `application_id` (number).

### 5. `record_officer_decision`
- **Purpose**: Commits official binding decision (`APPROVE` or `REJECT`).
- **Arguments**:
  - `application_id` (number).
  - `decision` ('APPROVE' | 'REJECT').
  - `remarks` (string, mandatory for `REJECT` with minimum 5 characters).
  - `confirm_explicit` (boolean, must be `true`).
- **Security**: Protects terminal states; records immutable audit entry with officer identity and timestamp.

### 6. `get_decision_history`
- **Purpose**: Retrieves audit trail and decision logs within the officer's jurisdiction.
- **Arguments**: `application_id` (optional number), `limit` (optional number).
