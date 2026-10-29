#!/usr/bin/env python3
"""
Sewa Setu Officer MCP Server
Lets block officers review and decide pension applications via AI assistants.

Usage:
    export PORTAL_URL=https://your-deployment.onrender.com
    python server.py
"""
import os
import requests
from mcp.server.fastmcp import FastMCP

PORTAL_URL = os.environ.get("PORTAL_URL", "http://localhost:8000").rstrip("/")

mcp = FastMCP("SewaSetu Officer")


def _post(path, payload):
    try:
        r = requests.post(PORTAL_URL + path, json=payload, timeout=15)
        return r.json()
    except Exception as e:
        return {"error": "Portal unreachable: %s" % e}


def _get(path, params=None):
    try:
        r = requests.get(PORTAL_URL + path, params=params or {}, timeout=15)
        return r.json()
    except Exception as e:
        return {"error": "Portal unreachable: %s" % e}


@mcp.tool()
def officer_login(username: str, password: str) -> dict:
    """Authenticate as a block officer to access the review queue.

    Args:
        username: officer username
        password: officer password

    Returns:
        {"token": "...", "role": "admin", "expires_in_hours": 8} or {"error": "..."}

    The token expires after 8 hours. Call once per session.
    """
    return _post("/api/v1/officer/login", {"username": username, "password": password})


@mcp.tool()
def get_dashboard_summary(token: str) -> dict:
    """Get a summary of all pending applications for the dashboard.

    Args:
        token: officer session token from officer_login

    Returns:
        {
          "pending": 120, "approved_today": 5, "rejected_today": 2,
          "overdue": 8,
          "by_block": [{"block": "Sonari", "pending": 30}, ...]
        }
    """
    return _get("/api/v1/officer/dashboard", {"token": token})


@mcp.tool()
def get_pending_queue(token: str, block: str = "", page: int = 1) -> dict:
    """Get the list of pending applications waiting for a decision.

    Args:
        token: officer session token from officer_login
        block: optional — filter by block name. Leave empty for all blocks.
        page: page number (50 applications per page)

    Returns list of applications with days_pending and is_overdue flags.
    Applications overdue by 15+ days must be decided urgently (RTPS Act).
    """
    return _get("/api/v1/officer/queue",
                {"token": token, "block": block, "page": page})


@mcp.tool()
def get_application_detail(token: str, app_id: int) -> dict:
    """Get full details of an application before making a decision.

    Args:
        token: officer session token
        app_id: application ID from get_pending_queue

    Returns all fields needed for a decision.
    Bank account is partially masked for privacy.
    """
    return _get("/api/v1/officer/application/%d" % app_id, {"token": token})


@mcp.tool()
def approve_application(token: str, app_id: int, reason: str) -> dict:
    """Approve a pending pension application.

    Args:
        token: officer session token from officer_login
        app_id: application ID to approve
        reason: reason for approval (required, minimum 10 characters).
                Example: "Documents verified. Age confirmed from Aadhaar card."

    The decision and reason are permanently recorded against the officer's name.
    Returns: {"status": "approved", "app_id": 42, "decided_by": "admin (via MCP)"}
    """
    return _post("/api/v1/officer/approve/%d" % app_id,
                 {"token": token, "reason": reason})


@mcp.tool()
def reject_application(token: str, app_id: int, reason: str) -> dict:
    """Reject a pending pension application.

    Args:
        token: officer session token from officer_login
        app_id: application ID to reject
        reason: reason for rejection (required, minimum 10 characters).
                This reason is shown to the citizen — write clearly.
                Example: "Age proof document is not legible. Please reapply with a clear scan."

    The decision and reason are permanently recorded against the officer's name.
    Returns: {"status": "rejected", "app_id": 42, "decided_by": "admin (via MCP)"}
    """
    return _post("/api/v1/officer/reject/%d" % app_id,
                 {"token": token, "reason": reason})


if __name__ == "__main__":
    mcp.run()
