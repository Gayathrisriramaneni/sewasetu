#!/usr/bin/env python3
"""
Sewa Setu Citizen MCP Server
Lets AI assistants help citizens apply for the Old Age Pension and track status.

Usage:
    export PORTAL_URL=https://your-deployment.onrender.com
    python server.py
"""
import os
from datetime import date, datetime
import requests
from mcp.server.fastmcp import FastMCP

PORTAL_URL = os.environ.get("PORTAL_URL", "http://localhost:8000").rstrip("/")

mcp = FastMCP("SewaSetu Citizen")


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
def get_supported_blocks() -> dict:
    """Return the list of blocks where Sewa Setu pension applications are accepted.

    Always call this first so you know the exact valid block names before submitting.
    Returns: {"blocks": ["Sonari", "Rajapara", ...]}
    """
    return _get("/api/v1/blocks")


@mcp.tool()
def check_eligibility(dob: str) -> dict:
    """Check if a person meets the age requirement (60 years minimum) for the pension.

    Args:
        dob: date of birth in YYYY-MM-DD format (e.g. "1952-06-15")

    Returns:
        {"eligible": true/false, "age": 72, "reason": "..."}

    Call this before collecting all other details so you can tell the citizen
    immediately if they are not eligible.
    """
    try:
        dob_date = datetime.strptime(dob, "%Y-%m-%d").date()
    except ValueError:
        return {"error": "dob must be in YYYY-MM-DD format (e.g. 1952-06-15)"}
    today = date.today()
    age = today.year - dob_date.year - (
        (today.month, today.day) < (dob_date.month, dob_date.day))
    eligible = age >= 60
    return {
        "eligible": eligible,
        "age": age,
        "reason": (
            "Eligible — age %d meets the minimum of 60 years." % age if eligible
            else "Not eligible — age %d is below the minimum of 60 years." % age
        )
    }


@mcp.tool()
def send_otp(mobile: str) -> dict:
    """Send a one-time password to the citizen's mobile number to verify identity.

    Args:
        mobile: 10-digit Indian mobile number (digits only, no spaces or dashes)

    Returns:
        {"status": "sent", "next_step": "...", "deadline": "YYYY-MM-DD"} or {"error": "..."}

    The OTP expires in 5 minutes. Ask the citizen to keep their phone nearby.
    """
    return _post("/api/v1/otp/send", {"mobile": mobile})


@mcp.tool()
def verify_otp(mobile: str, otp: str) -> dict:
    """Verify the OTP the citizen received by SMS.

    Args:
        mobile: same 10-digit mobile used in send_otp
        otp: 6-digit code from the SMS

    Returns:
        {"status": "verified", "token": "...", "next_step": "..."} or {"error": "..."}

    The token must be passed to submit_application and check_status.
    It expires in 30 minutes.
    """
    return _post("/api/v1/otp/verify", {"mobile": mobile, "otp": otp})


@mcp.tool()
def submit_application(
    token: str,
    applicant_name: str,
    dob: str,
    gender: str,
    marital_status: str,
    village: str,
    block: str,
    bank_account: str,
    ifsc: str,
    doc_base64: str,
    husband_name: str = "",
    husband_employer: str = ""
) -> dict:
    """Submit a pension application on behalf of the citizen.

    Requires a verified session token from verify_otp.
    All rules of the web form apply — age, block, document, duplicate check.

    Args:
        token: session token from verify_otp
        applicant_name: full name (Hindi/Devanagari is supported)
        dob: date of birth in YYYY-MM-DD format
        gender: "Male", "Female", or "Other"
        marital_status: "Single", "Married", "Widowed", or "Divorced"
        village: name of the village or locality
        block: block name — MUST be from get_supported_blocks()
        bank_account: bank account number (9–18 digits)
        ifsc: IFSC code (11 characters, e.g. SBIN0001234)
        doc_base64: proof-of-age PDF encoded as base64 (max 100 KB)
        husband_name: required only if marital_status is "Widowed"
        husband_employer: required only if marital_status is "Widowed"

    Returns:
        {"application_no": "SSP26XXXXXX", "app_id": 42, "next_step": "..."} or {"error": "..."}
    """
    return _post("/api/v1/application/submit", {
        "token": token,
        "applicant_name": applicant_name,
        "dob": dob,
        "gender": gender,
        "marital_status": marital_status,
        "village": village,
        "block": block,
        "bank_account": bank_account,
        "ifsc": ifsc,
        "doc_base64": doc_base64,
        "husband_name": husband_name,
        "husband_employer": husband_employer,
    })


@mcp.tool()
def check_status(mobile: str, token: str) -> dict:
    """Check the current status of a submitted pension application.

    Args:
        mobile: citizen's 10-digit mobile number
        token: session token from verify_otp

    Returns:
        {"application_no": "...", "status": "PENDING|APPROVED|REJECTED|DEEMED_APPROVED",
         "submitted_at": "...", "decided_at": "...", "decision_reason": "..."} or {"error": "..."}
    """
    return _get("/api/v1/application/status", {"mobile": mobile, "token": token})


if __name__ == "__main__":
    mcp.run()
