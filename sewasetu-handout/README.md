# Sewa Setu — Old Age Pension Portal

Government of Purvanchal, Department of Social Welfare.
Handover copy. Vendor maintenance contract ended 31/01/2026.

## Running locally

```bash
docker compose up --build
```

- Portal: http://localhost:8000
- SMS gateway console: http://localhost:8000/__gateway/
- Database: Postgres, loaded from `seed/seed.sql` on first boot

## Deploy to Render (one-click live URL)

1. Fork / push this repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect your GitHub repo — Render reads `render.yaml` automatically
4. Click **Apply** — you get a live URL in ~3 minutes

Set `ADMIN_PASSWORD` in the Render environment dashboard if you want to change the default.

---

## Bug Fixes — Top 5 by Citizen Impact

| # | Bug | Impact | Fix |
|---|-----|--------|-----|
| 1 | `sanitize()` truncated names at 20 **bytes** | Devanagari names silently corrupted in DB and PDF | Truncate at **character** level, maxlen 200 |
| 2 | SQL injection in `reset_password()` | Attacker reads all 100k citizen bank accounts | Parameterised queries |
| 3 | `admin_approve/reject` checked `logged_in` not `admin` | Any citizen with a status-portal session can approve their own application | Check `session["admin"]` |
| 4 | `deemed_approval.py` read `settings.ini` (doesn't exist) | RTPS 15-day auto-approval cron silently crashed every night since March 2026 | Change to `app.ini` |
| 5 | IDOR — `view_application` had no ownership check | Any citizen can read any other citizen's bank account by iterating `/application/1,2,3...` | Check `portal_mobile` matches row |

Additional fixes: date parsing now tries DD/MM/YYYY before MM/DD/YYYY (Bug 5), ERR_VAL_47 replaced with human-readable upload errors (Bug 7), 2000-iteration PDF border loop replaced with two `pdf.line()` calls (Bug 8).

Each fix has a test that fails before the fix and passes after — see `tests/`.

---

## MCP Servers

Two MCP (Model Context Protocol) servers let AI assistants interact with the portal.

### Citizen MCP (`mcp-citizen/`)

Lets AI assistants help citizens apply for the pension and track status.

```bash
pip install -r mcp-citizen/requirements.txt
export PORTAL_URL=https://your-deployment.onrender.com
python mcp-citizen/server.py
```

**Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "sewasetu-citizen": {
      "command": "python",
      "args": ["/path/to/mcp-citizen/server.py"],
      "env": { "PORTAL_URL": "https://your-deployment.onrender.com" }
    }
  }
}
```

**Tools:** `get_supported_blocks` · `check_eligibility` · `send_otp` · `verify_otp` · `submit_application` · `check_status`

### Officer MCP (`mcp-officer/`)

Lets block officers review and decide applications via AI.

```bash
pip install -r mcp-officer/requirements.txt
export PORTAL_URL=https://your-deployment.onrender.com
python mcp-officer/server.py
```

**Tools:** `officer_login` · `get_dashboard_summary` · `get_pending_queue` · `get_application_detail` · `approve_application` · `reject_application`

---

## JSON API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/blocks` | List supported blocks |
| POST | `/api/v1/otp/send` | Send OTP to mobile |
| POST | `/api/v1/otp/verify` | Verify OTP, get session token |
| POST | `/api/v1/application/submit` | Submit application |
| GET | `/api/v1/application/status` | Check application status |
| POST | `/api/v1/officer/login` | Officer authentication |
| GET | `/api/v1/officer/dashboard` | Dashboard summary |
| GET | `/api/v1/officer/queue` | Pending applications queue |
| GET | `/api/v1/officer/application/:id` | Application detail |
| POST | `/api/v1/officer/approve/:id` | Approve (requires reason) |
| POST | `/api/v1/officer/reject/:id` | Reject (requires reason) |

---

## Admin Credentials

- Username: `admin`
- Password: `sewasetu@123` (change via `ADMIN_PASSWORD` env var on Render)

## Running Tests

```bash
pip install -r tests/requirements.txt
pytest tests/ -v
# MCP eval suite (requires live deployment):
PORTAL_URL=https://your-deployment.onrender.com pytest tests/test_mcp_evals.py -v
```
