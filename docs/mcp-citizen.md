# Sewa Setu — Citizen-Facing Model Context Protocol (MCP) Server

## Overview

The **Sewa Setu Citizen MCP Server** (`sewasetu-citizen-assistant`) allows conversational AI assistants (such as Claude, Cursor, or AI Studio Agents) to help senior citizens and their family helpers understand scheme eligibility, prepare application drafts, verify mobile identity, submit official applications, and track application status.

The MCP server connects directly to the **same authoritative application service and database** used by the web portal, guaranteeing that:
1. An application created through an AI assistant appears immediately in the official portal.
2. An application created on the portal website can be queried by the authorized citizen via MCP.
3. AI assistants cannot bypass eligibility rules, declare OTPs valid on their own, or manufacture fake application numbers.

---

## Connection Configuration

### Stdio Transport (Standard MCP Clients)
Any MCP-compliant client (such as Claude Desktop or Cursor) connects via `stdio`:

```json
{
  "mcpServers": {
    "sewasetu-citizen": {
      "command": "npx",
      "args": [
        "tsx",
        "src/mcp/runCitizenServer.ts"
      ]
    }
  }
}
```

---

## Identity & Privacy Architecture

- **Server-Authoritative OTP**: The client/assistant calls `start_application({ mobile })`. The server dispatches the OTP via the telecom gateway. The OTP code is **never** sent in the MCP response text or exposed to model logs.
- **Verification Token Binding**: The citizen provides the code to `verify_mobile_otp({ session_id, mobile, otp_code })`. On server-side verification, an ephemeral cryptographic token (`tok_...`) is issued with a 30-minute validity window.
- **Single-Use Consumption**: When `submit_application` succeeds, the token is consumed immediately, preventing replay attacks or accidental duplicate submissions from model retries.
- **Bank Account Confidentiality**: Bank account numbers returned via `get_my_application_status` are masked (`•••• •••• 8472`) to protect citizen privacy on shared screens.
- **IDOR Protection**: Status lookups require either a valid verification token or the citizen's Date of Birth password (`DDMMYYYY`). Looking up another citizen's record is blocked.

---

## Tool Reference

### 1. `get_scheme_information`
- **Purpose**: Returns authoritative rules, monthly amount (₹250), age requirement (60+), and 15-day statutory SLA under the RTPS Act.
- **Arguments**: `{}`
- **Security**: Public / Read-Only.

### 2. `get_supported_blocks`
- **Purpose**: Returns the 6 authorized development blocks: `Sonari`, `Rajapara`, `Dhemaji Pathar`, `Borgaon`, `Namti`, `Khelua`.
- **Arguments**: `{}`
- **Security**: Public / Read-Only.

### 3. `get_application_requirements`
- **Purpose**: Returns the structured pre-flight checklist for citizens and helpers.
- **Arguments**: `{}`
- **Security**: Public / Read-Only.

### 4. `start_application`
- **Purpose**: Checks for duplicate submissions, dispatches a 6-digit OTP, and creates a verification session.
- **Arguments**:
  - `mobile` (string, 10 digits): Citizen's active mobile number.
- **Security**: Rate-limited (10s cooldown); rejects duplicate registered numbers.

### 5. `verify_mobile_otp`
- **Purpose**: Submits the 6-digit OTP to the server for authentication and issues an authenticated token.
- **Arguments**:
  - `session_id` (string): Active session ID.
  - `mobile` (string, 10 digits).
  - `otp_code` (string, 6 digits).
- **Security**: Server-side validation; lockout after 5 failed attempts; 5-minute expiry.

### 6. `validate_application_draft`
- **Purpose**: Runs complete server-side validation against draft details without submitting, providing clear plain-language feedback on missing or ineligible fields.
- **Arguments**:
  - `applicant_name`, `dob`, `gender`, `marital_status`, `husband_name` (optional), `village`, `block`, `bank_account`, `ifsc`, `doc_name`, `doc_size`.
- **Security**: Read-Only / Pre-submission validation.

### 7. `submit_application`
- **Purpose**: Official submission to the government registry.
- **Arguments**:
  - `verification_token` (string): Authenticated token.
  - `consent_agreed` (boolean, must be `true`): Explicit statutory declaration consent.
  - `draft` (object): Complete validated details.
- **Security**: Verified token required; burns token on success; creates genuine tracking `SSP...` number.

### 8. `get_my_application_status`
- **Purpose**: Retrieves official status (`PENDING`, `APPROVED`, `REJECTED`, `DEEMED_APPROVED`).
- **Arguments**:
  - `mobile` (string, 10 digits).
  - `password_dob` (string, optional): Date of Birth as `DDMMYYYY`.
  - `verification_token` (string, optional): Active verified token.
- **Security**: Requires authentication; bank account masked; prohibits cross-citizen snooping.
