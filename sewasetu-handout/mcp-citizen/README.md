# Sewa Setu — Citizen MCP Server

Lets AI assistants (Claude, Gemini, GPT-4 with tools) help citizens apply for the
Old Age Pension and track their application status.

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
    "sewasetu-citizen": {
      "command": "python",
      "args": ["/path/to/mcp-citizen/server.py"],
      "env": { "PORTAL_URL": "https://your-deployment.onrender.com" }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `get_supported_blocks` | List valid block names — call first |
| `check_eligibility` | Check age eligibility (60+ years) before collecting details |
| `send_otp` | Send OTP to citizen's mobile |
| `verify_otp` | Verify OTP, get session token |
| `submit_application` | Submit full application (same rules as web form) |
| `check_status` | Check application status |

## Typical Flow

1. `get_supported_blocks` — get valid block names
2. `check_eligibility(dob)` — verify age before going further
3. `send_otp(mobile)` — send OTP
4. `verify_otp(mobile, otp)` — get token
5. Collect details from citizen (name, village, block, bank account, IFSC, upload PDF)
6. `submit_application(token, ...)` — submit
7. `check_status(mobile, token)` — follow up later
