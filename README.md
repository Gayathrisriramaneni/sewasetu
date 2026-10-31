# Sewa Setu — Old Age Pension Portal
**Department of Social Welfare, Government of Purvanchal**  
*Accessible, Secure, High-Performance Old Age Pension System & MCP Assistant Network*

---

## Overview

The Old Age Pension Scheme provides a monthly pension of **₹250** to eligible senior citizens aged 60 and above residing in Purvanchal. Under the **Purvanchal Right to Public Services Act (RTPS)**, applications are guaranteed a 15-day statutory SLA, backed by automated deemed approval for unresolved applications.

This system provides a full-stack, production-grade overhaul of the legacy portal:
- Modern accessible React 19 + TypeScript + Vite SPA.
- Authoritative service layer (`src/services/` and `src/data/`) enforcing data integrity and security.
- Two distinct official Model Context Protocol (MCP) servers (`sewasetu-citizen-assistant` and `sewasetu-officer-assistant`).
- Comprehensive regression and evaluation test suite (64/64 tests passing).

---

## Key System Components

### 1. Citizen Pension Application Flow
- **6-Step Application Wizard**:
  - **Step 1 (Mobile Verification)**: Mobile number validation, random security math captcha, and 6-digit OTP delivery with a 5-minute validity window.
  - **Step 2 (Personal Details)**: Full applicant name, Date of Birth with live age validation (minimum 60 years required), gender, and marital status with non-blocking widow equity rules.
  - **Step 3 (Address Details)**: Village/Town and Block selection (`Sonari`, `Rajapara`, `Dhemaji Pathar`, `Borgaon`, `Namti`, `Khelua`).
  - **Step 4 (Bank Details)**: Bank account number and IFSC code validation for Direct Benefit Transfer (DBT).
  - **Step 5 (Document Upload)**: Upload age proof (Birth certificate, School leaving certificate, Voter ID) in JPG, JPEG, PNG, or PDF format up to **5 MB**.
  - **Step 6 (Declaration & Review)**: Comprehensive review card with masked bank account (`•••• •••• 8472`), statutory declaration checkbox, and final submission.
- **Application Number**: Automated generation of official tracking ID (e.g. `SSP26842011`).
- **Scheme Window Countdown**: Real-time calculation of remaining hours until the application window closes (midnight, 31 October).

### 2. Status Tracking Portal
- Citizen login using registered 10-digit mobile number and Date of Birth in `DDMMYYYY` format.
- Real-time status display (`PENDING`, `APPROVED`, `REJECTED`, `DEEMED_APPROVED`).
- **Forgot Password**: Password reset workflow that re-dispatches an SMS with the DOB password format.

### 3. Computer-Generated Acknowledgment PDF
- Direct client-side generation of the official Government of Purvanchal letterhead acknowledgment receipt with applicant data, table borders, and RTPS SLA terms.

### 4. Departmental Admin Panel
- **Login**: `admin` / `sewasetu@123`
- **Dashboard**:
  - Applications count by status.
  - Statutory SLA monitoring: Overdue count for applications pending beyond the 15-day statutory SLA.
  - Pending applications grouped by Block.
  - **Nightly Deemed Approval Batch**: Interactive executor simulating the RTPS automated approval process, marking overdue applications as `DEEMED_APPROVED` by `RTPS-AUTO` and dispatching SMS notifications to applicants.
- **Applications List**:
  - Filter by status (`PENDING`, `APPROVED`, `REJECTED`, `DEEMED_APPROVED`, `ALL`).
  - Search by Application Number, Applicant Name, Mobile, or Block.
  - Pagination and quick links.
- **Adjudication**:
  - Detailed view of application records and uploaded proof.
  - Role-based action buttons to **Approve** or **Reject** with timestamped departmental auditing and mandatory rejection reasons.

### 5. PurvSMS Gateway Console (`/__gateway`)
- Direct route at `/__gateway` and accessible via floating drawer from any screen.
- Simulates carrier delivery latency (1–3 seconds), queue states, message logs, and quick OTP copy helpers for effortless testing.

### 6. Citizen Model Context Protocol (MCP) Server (`sewasetu-citizen-assistant`)
- Built with official `@modelcontextprotocol/sdk`.
- Provides 8 authoritative tools: `get_scheme_information`, `get_supported_blocks`, `get_application_requirements`, `start_application`, `verify_mobile_otp`, `validate_application_draft`, `submit_application`, `get_my_application_status`.
- Protects OTP confidentiality and enforces server-side validation.

### 7. Officer Model Context Protocol (MCP) Server (`sewasetu-officer-assistant`)
- Built with official `@modelcontextprotocol/sdk`.
- Provides 7 authoritative tools: `authenticate_officer`, `get_officer_queue`, `get_application_summary`, `get_application_evidence`, `check_processing_deadline`, `record_officer_decision`, `get_decision_history`.
- Strictly enforces block-level jurisdiction isolation (Sonari, Rajapara, etc.) and audit logging.

---

## Running the Application

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Run automated test suites (Regression, Personas, MCP, Cross-System E2E)
npm test

# Build for production
npm run build

# Start Citizen MCP Server (Stdio)
npm run mcp:citizen

# Start Officer MCP Server (Stdio)
npm run mcp:officer
```

---

## Docker & Containerized Deployment

```bash
# Build and run Web and both MCP servers via Docker Compose
docker compose up -d --build

# Verify container health
curl -I http://localhost:3000/
```

---

## Documentation & Deliverables

All project deliverables are codified in the `/docs` directory:
- [Deliverable A: Repository Assessment Report](docs/A_repository_assessment.md)
- [Deliverable B: Top-Five-Fixes Report](docs/B_top_five_fixes.md)
- [Deliverable D: Database Migrations & Schema Protection](docs/D_database_migrations.md)
- [Deliverable H: MCP Tool Documentation](docs/H_mcp_tool_documentation.md)
- [Deliverable I: Security & Authorization Architecture](docs/I_security_architecture.md)
- [Deliverable J: Persona Definitions & Evaluation Scenarios](docs/J_persona_evaluation.md)
- [Deliverable L: Production Deployment Guide](docs/L_deployment_guide.md)
- [Deliverable M: Environment Variables Reference](docs/M_environment_variables.md)
- [Deliverable N: Comprehensive Test Results](docs/N_test_results.md)
- [Deliverable O: Git Commit Plan & Repository Checklist](docs/O_git_commit_plan.md)
- [Deliverable P: Three-Minute Loom Demonstration Script](docs/P_loom_demonstration_script.md)
- [Deliverable Q: Final Acceptance Checklist](docs/Q_final_acceptance_checklist.md)

---

## Credentials & Reference Access

- **Admin Portal**:
  - URL: `/admin`
  - Username: `admin`
  - Password: `sewasetu@123`
- **Sample Citizen (Status Portal)**:
  - URL: `/status`
  - Mobile: `9876543210`
  - Password: `12041955` (DOB: 12/04/1955)
- **SMS Gateway Console**:
  - URL: `/__gateway`