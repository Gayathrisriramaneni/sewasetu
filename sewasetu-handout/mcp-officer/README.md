# Sewa Setu — Officer MCP Server

Lets block officers review and decide pension applications via an AI assistant.

## Setup

```bash
pip install -r requirements.txt
export PORTAL_URL=https://your-deployment.onrender.com
python server.py
```

## Claude Desktop Config

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sewasetu-officer": {
      "command": "python",
      "args": ["/path/to/mcp-officer/server.py"],
      "env": { "PORTAL_URL": "https://your-deployment.onrender.com" }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `officer_login` | Authenticate, get session token |
| `get_dashboard_summary` | Overview — pending, approved today, overdue |
| `get_pending_queue` | List pending applications, filter by block |
| `get_application_detail` | Full details of one application |
| `approve_application` | Approve with mandatory reason (recorded against officer) |
| `reject_application` | Reject with mandatory reason (shown to citizen) |

## Typical Flow

1. `officer_login(username, password)` — get token
2. `get_dashboard_summary(token)` — see what's waiting
3. `get_pending_queue(token, block="Sonari")` — list pending
4. `get_application_detail(token, app_id)` — review a case
5. `approve_application(token, app_id, reason)` or `reject_application(...)` — decide
