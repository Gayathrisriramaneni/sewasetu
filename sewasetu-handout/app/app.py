# -*- coding: utf-8 -*-
"""
Sewa Setu - Old Age Pension Portal
Government of Purvanchal, Department of Social Welfare

Developed by: Netlink Infosolutions Pvt Ltd (2023)
Maintenance contract ended 31/01/2026.
"""

import os
import io
import csv
import random
import hashlib
import secrets
import configparser
from datetime import datetime, date, timedelta

import requests
import psycopg2
from flask import (Flask, request, session, redirect, url_for, render_template,
                   flash, send_file, abort, jsonify)
from fpdf import FPDF

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

config = configparser.ConfigParser()
config.read(os.path.join(BASE_DIR, "config", "app.ini"))

# Env-var override: cloud deploys (Railway/Render) set DATABASE_URL and individual vars.
# Falls back to app.ini for local Docker Compose.
def _cfg(section, key, fallback=None):
    env_key = ("%s_%s" % (section, key)).upper().replace("-", "_")
    val = os.environ.get(env_key)
    if val:
        return val
    if config.has_option(section, key):
        return config.get(section, key)
    return fallback

def _cfg_int(section, key, fallback=0):
    v = _cfg(section, key)
    return int(v) if v is not None else fallback

app = Flask(__name__)
app.secret_key = _cfg("app", "secret_key", "ssp-fallback-dev-key")
app.config["PERMANENT_SESSION_LIFETIME"] = 300

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "sewasetu@123")

SMS_GATEWAY_URL = _cfg("app", "sms_gateway_url", "http://smsgw:8025")
OTP_VALIDITY_SECONDS = _cfg_int("app", "otp_validity_seconds", 300)
UPLOAD_DIR = _cfg("app", "upload_dir", "/var/sewasetu/uploads")
SCHEME_DEADLINE = datetime.strptime(
    _cfg("pension", "scheme_deadline", "2027-10-31 23:59"), "%Y-%m-%d %H:%M")
MIN_AGE = _cfg_int("pension", "min_age", 60)
SLA_DAYS = _cfg_int("pension", "sla_days", 15)

BLOCKS = ["Sonari", "Rajapara", "Dhemaji Pathar", "Borgaon", "Namti", "Khelua"]

import logging
_logdir = "/var/log/sewasetu"
try:
    os.makedirs(_logdir, exist_ok=True)
    _fh = logging.FileHandler(os.path.join(_logdir, "sewasetu-app.log"))
    _fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s in app: %(message)s"))
    app.logger.addHandler(_fh)
    app.logger.setLevel(logging.INFO)
except Exception:
    pass


def get_db():
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(
        host=_cfg("database", "host", "db"),
        port=_cfg_int("database", "port", 5432),
        dbname=_cfg("database", "name", "sewasetu"),
        user=_cfg("database", "user", "sewasetu"),
        password=_cfg("database", "password", "sewasetu123"),
    )


def sanitize(value, maxlen=200):
    # Truncate at character level, not byte level.
    # The previous 20-byte limit silently corrupted multi-byte (Devanagari) names.
    # maxlen raised to 200 to fit full Indian names.
    if value is None:
        return ""
    return value.strip()[:maxlen]


def hash_password(p):
    return hashlib.sha256(p.encode("utf-8")).hexdigest()


def send_sms(mobile, text):
    try:
        requests.post(SMS_GATEWAY_URL + "/api/send",
                      json={"to": mobile, "text": text}, timeout=5)
    except Exception as e:
        app.logger.error("sms gateway error: %s" % e)


def deadline_remaining():
    delta = SCHEME_DEADLINE - datetime.now()
    if delta.total_seconds() <= 0:
        return None
    return int(delta.total_seconds() // 3600)


def new_application_no():
    return "SSP" + datetime.now().strftime("%y") + str(random.randint(100000, 999999))


# ---------------------------------------------------------------------------
# Public pages
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html", hours_left=deadline_remaining())


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/__gateway/", defaults={"subpath": ""})
@app.route("/__gateway/<path:subpath>")
def gateway_proxy(subpath):
    # Convenience proxy to the internal SMS gateway, so the OTP inbox is reachable
    # on the main site without opening a second port on the host. The gateway
    # itself runs only on the internal network.
    try:
        r = requests.get(SMS_GATEWAY_URL + "/" + subpath,
                         params=request.args, timeout=5)
        return (r.content, r.status_code,
                {"Content-Type": r.headers.get("Content-Type", "text/html")})
    except Exception as e:
        return ("SMS gateway unreachable: %s" % e, 502)


# ---------------------------------------------------------------------------
# Application flow: mobile -> OTP -> form steps -> upload -> declaration
# ---------------------------------------------------------------------------

@app.route("/apply", methods=["GET", "POST"])
def apply():
    if deadline_remaining() is None:
        flash("The application window for this scheme has closed.")
        return redirect(url_for("index"))
    if request.method == "POST":
        mobile = request.form.get("mobile", "").strip()
        captcha = request.form.get("captcha", "")
        if len(mobile) != 10 or not mobile.isdigit():
            flash("Something went wrong. Please try again.")
            return render_template("apply.html", captcha_q=make_captcha())
        code = str(random.randint(100000, 999999))
        conn = get_db()
        cur = conn.cursor()
        cur.execute("INSERT INTO otps (mobile, code, created_at) VALUES (%s, %s, %s)",
                    (mobile, code, datetime.now()))
        conn.commit()
        cur.close(); conn.close()
        send_sms(mobile, "Your Sewa Setu OTP is %s. Valid for 5 minutes." % code)
        session.permanent = True
        session["apply_mobile"] = mobile
        return redirect(url_for("verify"))
    return render_template("apply.html", captcha_q=make_captcha())


def make_captcha():
    a, b = random.randint(1, 9), random.randint(1, 9)
    session["captcha_answer"] = a + b
    return "%d + %d" % (a, b)


@app.route("/verify", methods=["GET", "POST"])
def verify():
    mobile = session.get("apply_mobile")
    if not mobile:
        return redirect(url_for("apply"))
    if request.method == "POST":
        code = request.form.get("otp", "").strip()
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT code, created_at FROM otps WHERE mobile = %s "
                    "ORDER BY id DESC LIMIT 1", (mobile,))
        row = cur.fetchone()
        cur.close(); conn.close()
        if row and row[0] == code:
            age = (datetime.now() - row[1]).total_seconds()
            if age > OTP_VALIDITY_SECONDS:
                app.logger.warning("otp expired mobile=%s age=%ds" % (mobile, int(age)))
                flash("OTP expired. Please request a new OTP.")
                return redirect(url_for("apply"))
            session["verified_mobile"] = mobile
            return redirect(url_for("form_step", step=1))
        flash("Invalid OTP.")
    return render_template("verify.html", mobile=mobile)


@app.route("/form/<int:step>", methods=["GET", "POST"])
def form_step(step):
    if not session.get("verified_mobile"):
        flash("Session expired. Please verify your mobile number again.")
        return redirect(url_for("apply"))
    if step not in (1, 2, 3):
        abort(404)
    if request.method == "POST":
        data = session.get("form_data", {})
        for k, v in request.form.items():
            data[k] = v
        session["form_data"] = data
        if step < 3:
            return redirect(url_for("form_step", step=step + 1))
        return redirect(url_for("upload"))
    return render_template("form_step%d.html" % step,
                           data=session.get("form_data", {}), blocks=BLOCKS)


@app.route("/upload", methods=["GET", "POST"])
def upload():
    if not session.get("verified_mobile"):
        flash("Session expired. Please verify your mobile number again.")
        return redirect(url_for("apply"))
    if request.method == "POST":
        f = request.files.get("document")
        if f is None or f.filename == "":
            flash("Please select a file to upload.")
            return render_template("upload.html")
        filename = f.filename.lower()
        content = f.read()
        if not filename.endswith(".pdf"):
            flash("Only PDF files are accepted. Please upload your document as a PDF.")
            return render_template("upload.html")
        if len(content) > 102400:
            flash("The file is too large (maximum 100 KB). Please compress or scan at a lower resolution.")
            return render_template("upload.html")
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        path = os.path.join(UPLOAD_DIR, "%s_%s" % (session["verified_mobile"], filename))
        with open(path, "wb") as out:
            out.write(content)
        session["doc_path"] = path
        return redirect(url_for("declaration"))
    return render_template("upload.html")


@app.route("/declaration", methods=["GET", "POST"])
def declaration():
    if not session.get("verified_mobile"):
        flash("Session expired. Please verify your mobile number again.")
        return redirect(url_for("apply"))
    if request.method == "POST":
        return handle_submission()
    return render_template("declaration.html")


def handle_submission():
    # TODO: split this up some day. It grew. - RK, 09/2024
    mobile = session.get("verified_mobile")
    data = session.get("form_data", {})
    doc_path = session.get("doc_path", "")

    name = sanitize(data.get("applicant_name", ""))
    village = data.get("village", "").strip()
    block = data.get("block", "").strip()
    gender = data.get("gender", "")
    marital = data.get("marital_status", "")
    husband_name = data.get("husband_name", "")
    husband_employer = data.get("husband_employer", "")
    bank_account = data.get("bank_account", "").strip()
    ifsc = data.get("ifsc", "").strip().upper()
    dob_raw = data.get("dob", "").strip()

    if not name or not village or not block or not bank_account or not dob_raw:
        flash("Something went wrong. Please try again.")
        return redirect(url_for("form_step", step=1))

    if marital == "Widowed":
        if not husband_name or not husband_employer:
            flash("Something went wrong. Please try again.")
            return redirect(url_for("form_step", step=1))

    # lenient date parsing to reduce rejections (CR-2024-117)
    dob = None
    for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d"):
        try:
            dob = datetime.strptime(dob_raw, fmt).date()
            break
        except ValueError:
            continue
    if dob is None:
        flash("Something went wrong. Please try again.")
        return redirect(url_for("form_step", step=1))

    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < MIN_AGE:
        flash("Applicant must be above %d years of age to be eligible." % MIN_AGE)
        return redirect(url_for("form_step", step=1))

    if datetime.now() > SCHEME_DEADLINE:
        flash("The application deadline has passed.")
        return redirect(url_for("index"))

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT count(*) FROM applications WHERE mobile = %s", (mobile,))
    if cur.fetchone()[0] > 0:
        cur.close(); conn.close()
        flash("An application already exists for this mobile number. "
              "Duplicate applications are not permitted.")
        return redirect(url_for("index"))

    app_no = new_application_no()
    cur.execute(
        """INSERT INTO applications
           (application_no, applicant_name, mobile, dob, gender, marital_status,
            husband_name, husband_employer, village, block, bank_account, ifsc,
            doc_path, status, submitted_at)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'PENDING',%s)
           RETURNING id""",
        (app_no, name, mobile, dob, gender, marital, husband_name,
         husband_employer, village, block, bank_account, ifsc, doc_path,
         datetime.now()))
    new_id = cur.fetchone()[0]

    # status portal account; password is DOB as DDMMYYYY per dept. circular
    portal_pass = dob.strftime("%d%m%Y")
    cur.execute("SELECT count(*) FROM portal_users WHERE mobile = %s", (mobile,))
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO portal_users (mobile, password_hash) VALUES (%s,%s)",
                    (mobile, hash_password(portal_pass)))
    conn.commit()

    app.logger.info("generating acknowledgment pdf application=%d" % new_id)
    pdf_bytes = generate_acknowledgment(cur, new_id)
    ack_dir = os.path.join(UPLOAD_DIR, "ack")
    os.makedirs(ack_dir, exist_ok=True)
    with open(os.path.join(ack_dir, "%d.pdf" % new_id), "wb") as out:
        out.write(pdf_bytes)

    cur.close(); conn.close()
    session.pop("form_data", None)
    session.pop("doc_path", None)
    session.pop("verified_mobile", None)
    send_sms(mobile, "Sewa Setu: application %s received. Track at the status portal "
                     "with mobile no. and password (DOB as DDMMYYYY)." % app_no)
    return render_template("confirmation.html", app_no=app_no, app_id=new_id)


def generate_acknowledgment(cur, app_id):
    cur.execute("SELECT application_no, applicant_name, mobile, dob, village, block, "
                "bank_account, ifsc, submitted_at, status FROM applications WHERE id = %s",
                (app_id,))
    row = cur.fetchone()
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "GOVERNMENT OF PURVANCHAL", ln=1, align="C")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, "Department of Social Welfare", ln=1, align="C")
    pdf.cell(0, 8, "Old Age Pension Scheme - Acknowledgment", ln=1, align="C")
    pdf.ln(4)
    # simple top and bottom border lines (replaced 2000-iteration loop)
    pdf.line(10, 12, 200, 12)
    pdf.line(10, 282, 200, 282)
    labels = ["Application No", "Applicant Name", "Mobile", "Date of Birth",
              "Village", "Block", "Bank Account", "IFSC", "Submitted At", "Status"]
    pdf.set_font("Helvetica", "", 10)
    for label, val in zip(labels, row):
        try:
            pdf.cell(60, 8, label, border=1)
            pdf.cell(0, 8, str(val), border=1, ln=1)
        except Exception:
            pdf.cell(0, 8, "?", border=1, ln=1)
    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 9)
    pdf.multi_cell(0, 5, "This is a computer generated acknowledgment. Processing SLA "
                         "as per the Purvanchal Right to Public Services Act applies.")
    return bytes(pdf.output())


# ---------------------------------------------------------------------------
# Status portal (citizen login)
# ---------------------------------------------------------------------------

@app.route("/status", methods=["GET", "POST"])
def status_login():
    if request.method == "POST":
        mobile = request.form.get("mobile", "").strip()
        password = request.form.get("password", "")
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT password_hash FROM portal_users WHERE mobile = %s", (mobile,))
        row = cur.fetchone()
        cur.close(); conn.close()
        if row and row[0] == hash_password(password):
            session["logged_in"] = True
            session["portal_mobile"] = mobile
            conn = get_db()
            cur = conn.cursor()
            cur.execute("SELECT id FROM applications WHERE mobile = %s "
                        "ORDER BY submitted_at DESC LIMIT 1", (mobile,))
            r = cur.fetchone()
            cur.close(); conn.close()
            if r:
                return redirect(url_for("view_application", app_id=r[0]))
            flash("No application found for this mobile number.")
            return redirect(url_for("status_login"))
        flash("Something went wrong. Please try again.")
    return render_template("status_login.html")


@app.route("/application/<int:app_id>")
def view_application(app_id):
    if not session.get("logged_in"):
        flash("Please login to view application status.")
        return redirect(url_for("status_login"))
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT application_no, applicant_name, mobile, dob, village, block, "
                "bank_account, ifsc, status, submitted_at, decided_at "
                "FROM applications WHERE id = %s", (app_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row:
        abort(404)
    # IDOR fix: ensure the application belongs to the logged-in citizen
    if row[2] != session.get("portal_mobile"):
        abort(403)
    return render_template("application.html", a=row, app_id=app_id)


@app.route("/ack/<int:app_id>.pdf")
def ack_pdf(app_id):
    path = os.path.join(UPLOAD_DIR, "ack", "%d.pdf" % app_id)
    if not os.path.exists(path):
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id FROM applications WHERE id = %s", (app_id,))
        if not cur.fetchone():
            cur.close(); conn.close()
            abort(404)
        data = generate_acknowledgment(cur, app_id)
        cur.close(); conn.close()
        return send_file(io.BytesIO(data), mimetype="application/pdf")
    return send_file(path, mimetype="application/pdf")


@app.route("/status/reset", methods=["GET", "POST"])
def reset_password():
    if request.method == "POST":
        mobile = request.form.get("mobile", "")
        conn = get_db()
        cur = conn.cursor()
        # fetch account for reset
        cur.execute("SELECT mobile FROM portal_users WHERE mobile = %s", (mobile,))
        row = cur.fetchone()
        if row:
            cur.execute("SELECT dob FROM applications WHERE mobile = %s LIMIT 1", (mobile,))
            r2 = cur.fetchone()
            if r2:
                newpass = r2[0].strftime("%d%m%Y")
                cur.execute("UPDATE portal_users SET password_hash = %s WHERE mobile = %s",
                            (hash_password(newpass), row[0]))
                conn.commit()
                send_sms(row[0], "Sewa Setu: your password has been reset to your "
                                 "date of birth (DDMMYYYY).")
        cur.close(); conn.close()
        flash("If the mobile number exists, the password has been reset and sent by SMS.")
    return render_template("reset.html")


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

@app.route("/admin", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        if (request.form.get("username") == ADMIN_USERNAME and
                request.form.get("password") == ADMIN_PASSWORD):
            session["logged_in"] = True
            session["admin"] = True
            return redirect(url_for("admin_dashboard"))
        flash("Invalid credentials.")
    return render_template("admin_login.html")


@app.route("/admin/dashboard")
def admin_dashboard():
    if not session.get("admin"):
        return redirect(url_for("admin_login"))
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT status, count(*) FROM applications GROUP BY status")
    by_status = cur.fetchall()
    cur.execute("SELECT count(*) FROM applications WHERE status = 'PENDING' "
                "AND submitted_at < %s", (datetime.now() - timedelta(days=SLA_DAYS),))
    overdue = cur.fetchone()[0]
    cur.execute("SELECT block, count(*) FROM applications WHERE status = 'PENDING' "
                "GROUP BY block ORDER BY count(*) DESC")
    by_block = cur.fetchall()
    cur.close(); conn.close()
    return render_template("admin_dashboard.html", by_status=by_status,
                           overdue=overdue, by_block=by_block, sla=SLA_DAYS)


@app.route("/admin/applications")
def admin_list():
    if not session.get("admin"):
        return redirect(url_for("admin_login"))
    status = request.args.get("status", "PENDING")
    page = int(request.args.get("page", 1))
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, application_no, applicant_name, mobile, block, status, "
                "submitted_at FROM applications WHERE status = %s "
                "ORDER BY submitted_at ASC LIMIT 50 OFFSET %s",
                (status, (page - 1) * 50))
    rows = cur.fetchall()
    cur.close(); conn.close()
    return render_template("admin_list.html", rows=rows, status=status, page=page)


@app.route("/admin/application/<int:app_id>")
def admin_view(app_id):
    if not session.get("admin"):
        return redirect(url_for("admin_login"))
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT application_no, applicant_name, mobile, dob, gender, "
                "marital_status, village, block, bank_account, ifsc, doc_path, "
                "status, submitted_at, decided_at, decided_by "
                "FROM applications WHERE id = %s", (app_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row:
        abort(404)
    return render_template("admin_view.html", a=row, app_id=app_id)


@app.route("/admin/approve/<int:app_id>", methods=["POST"])
def admin_approve(app_id):
    if not session.get("admin"):
        abort(403)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE applications SET status = 'APPROVED', decided_at = %s "
                "WHERE id = %s", (datetime.now(), app_id))
    conn.commit()
    cur.close(); conn.close()
    flash("Application approved.")
    return redirect(url_for("admin_list"))


@app.route("/admin/reject/<int:app_id>", methods=["POST"])
def admin_reject(app_id):
    if not session.get("admin"):
        abort(403)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE applications SET status = 'REJECTED', decided_at = %s "
                "WHERE id = %s", (datetime.now(), app_id))
    conn.commit()
    cur.close(); conn.close()
    flash("Application rejected.")
    return redirect(url_for("admin_list"))


# ---------------------------------------------------------------------------
# Unused / legacy
# ---------------------------------------------------------------------------

def export_to_excel(rows):
    # Was used for the monthly disbursement report before eKosh integration.
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["application_no", "name", "account", "ifsc", "amount"])
    for r in rows:
        writer.writerow(list(r) + ["250"])
    return out.getvalue()


def old_payment_gateway_callback(txn):
    # retained for reference; eChallan integration was descoped in Phase 2
    status = txn.get("STATUS")
    if status == "0300":
        return "SUCCESS"
    elif status == "0399":
        return "FAILED"
    return "PENDING"


# ---------------------------------------------------------------------------
# JSON API v1 — for MCP servers and AI assistants
# ---------------------------------------------------------------------------

def _api_error(msg, code=400):
    return jsonify({"error": msg}), code


def _get_api_session(token):
    """Validate a citizen API token. Returns mobile or None."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT mobile FROM api_sessions WHERE token = %s AND expires_at > NOW()",
        (token,))
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row else None


def _get_officer_session(token):
    """Validate an officer API token. Returns username or None."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT username FROM officer_sessions WHERE token = %s AND expires_at > NOW()",
        (token,))
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row else None


@app.route("/api/v1/blocks", methods=["GET"])
def api_blocks():
    """List supported blocks."""
    return jsonify({"blocks": BLOCKS})


@app.route("/api/v1/otp/send", methods=["POST"])
def api_otp_send():
    """Send OTP to citizen mobile."""
    data = request.get_json(silent=True) or {}
    mobile = str(data.get("mobile", "")).strip()
    if len(mobile) != 10 or not mobile.isdigit():
        return _api_error("mobile must be exactly 10 digits")
    if deadline_remaining() is None:
        return _api_error("The application window for this scheme has closed.")
    code = str(random.randint(100000, 999999))
    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO otps (mobile, code, created_at) VALUES (%s, %s, %s)",
                (mobile, code, datetime.now()))
    conn.commit()
    cur.close(); conn.close()
    send_sms(mobile, "Your Sewa Setu OTP is %s. Valid for 5 minutes." % code)
    return jsonify({
        "status": "sent",
        "next_step": "Ask the citizen for the 6-digit OTP from their SMS.",
        "deadline": SCHEME_DEADLINE.strftime("%Y-%m-%d"),
        "hours_remaining": deadline_remaining()
    })


@app.route("/api/v1/otp/verify", methods=["POST"])
def api_otp_verify():
    """Verify OTP and return session token."""
    data = request.get_json(silent=True) or {}
    mobile = str(data.get("mobile", "")).strip()
    code = str(data.get("otp", "")).strip()
    if len(mobile) != 10 or not mobile.isdigit():
        return _api_error("mobile must be exactly 10 digits")
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT code, created_at FROM otps WHERE mobile = %s "
                "ORDER BY id DESC LIMIT 1", (mobile,))
    row = cur.fetchone()
    if not row or row[0] != code:
        cur.close(); conn.close()
        return _api_error("Invalid OTP. Ask the citizen to check the SMS or request a new one.")
    age = (datetime.now() - row[1]).total_seconds()
    if age > OTP_VALIDITY_SECONDS:
        cur.close(); conn.close()
        return _api_error("OTP expired. Call send_otp again.")
    token = secrets.token_urlsafe(32)
    expires = datetime.now() + timedelta(minutes=30)
    cur.execute(
        "INSERT INTO api_sessions (mobile, token, created_at, expires_at) VALUES (%s,%s,%s,%s)",
        (mobile, token, datetime.now(), expires))
    conn.commit()
    cur.close(); conn.close()
    return jsonify({
        "status": "verified",
        "token": token,
        "next_step": "Mobile verified. Collect the citizen's details to submit the application."
    })


@app.route("/api/v1/application/submit", methods=["POST"])
def api_application_submit():
    """Submit a pension application."""
    import base64 as _b64, re as _re
    data = request.get_json(silent=True) or {}
    token = str(data.get("token", "")).strip()
    mobile = _get_api_session(token)
    if not mobile:
        return _api_error("Invalid or expired session token. Call verify_otp again.", 401)

    name = sanitize(data.get("applicant_name", ""))
    village = str(data.get("village", "")).strip()
    block = str(data.get("block", "")).strip()
    gender = str(data.get("gender", "")).strip()
    marital = str(data.get("marital_status", "")).strip()
    husband_name = str(data.get("husband_name", "")).strip()
    husband_employer = str(data.get("husband_employer", "")).strip()
    bank_account = str(data.get("bank_account", "")).strip()
    ifsc = str(data.get("ifsc", "")).strip().upper()
    dob_raw = str(data.get("dob", "")).strip()
    doc_b64 = str(data.get("doc_base64", "")).strip()

    if not name:
        return _api_error("applicant_name is required")
    if not village:
        return _api_error("village is required")
    if block not in BLOCKS:
        return _api_error(
            "Block '%s' is not supported. Supported blocks: %s" % (block, ", ".join(BLOCKS)))
    if not bank_account or not bank_account.isdigit() or not (9 <= len(bank_account) <= 18):
        return _api_error("bank_account must be 9-18 digits")
    if not _re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', ifsc):
        return _api_error("ifsc must be 11 characters: 4 letters, '0', 6 alphanumeric")
    if marital == "Widowed" and (not husband_name or not husband_employer):
        return _api_error("husband_name and husband_employer required for widowed applicants")
    if not doc_b64:
        return _api_error("doc_base64 is required. Encode a PDF as base64.")
    try:
        doc_bytes = _b64.b64decode(doc_b64)
    except Exception:
        return _api_error("doc_base64 is not valid base64")
    if len(doc_bytes) > 102400:
        return _api_error("Document exceeds 100 KB. Please compress the PDF.")
    if not doc_bytes.startswith(b'%PDF'):
        return _api_error("Document must be a PDF file.")

    dob = None
    for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d"):
        try:
            dob = datetime.strptime(dob_raw, fmt).date()
            break
        except ValueError:
            continue
    if dob is None:
        return _api_error("dob must be in DD/MM/YYYY or YYYY-MM-DD format")

    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < MIN_AGE:
        return _api_error(
            "Applicant is %d years old. Minimum age is %d. Not eligible." % (age, MIN_AGE))
    if datetime.now() > SCHEME_DEADLINE:
        return _api_error("The application deadline has passed.")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT application_no FROM applications WHERE mobile = %s LIMIT 1", (mobile,))
    existing = cur.fetchone()
    if existing:
        cur.close(); conn.close()
        return _api_error(
            "An application already exists for this mobile. "
            "Application number: %s. Use check_status to follow up." % existing[0])

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    doc_path = os.path.join(UPLOAD_DIR, "%s_api_doc.pdf" % mobile)
    with open(doc_path, "wb") as f:
        f.write(doc_bytes)

    app_no = new_application_no()
    cur.execute(
        """INSERT INTO applications
           (application_no, applicant_name, mobile, dob, gender, marital_status,
            husband_name, husband_employer, village, block, bank_account, ifsc,
            doc_path, status, submitted_at)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'PENDING',%s)
           RETURNING id""",
        (app_no, name, mobile, dob, gender, marital, husband_name,
         husband_employer, village, block, bank_account, ifsc, doc_path, datetime.now()))
    new_id = cur.fetchone()[0]

    portal_pass = dob.strftime("%d%m%Y")
    cur.execute("SELECT count(*) FROM portal_users WHERE mobile = %s", (mobile,))
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO portal_users (mobile, password_hash) VALUES (%s,%s)",
                    (mobile, hash_password(portal_pass)))
    conn.commit()

    pdf_bytes = generate_acknowledgment(cur, new_id)
    ack_dir = os.path.join(UPLOAD_DIR, "ack")
    os.makedirs(ack_dir, exist_ok=True)
    with open(os.path.join(ack_dir, "%d.pdf" % new_id), "wb") as out:
        out.write(pdf_bytes)
    cur.close(); conn.close()

    send_sms(mobile,
             "Sewa Setu: application %s received. Track at the status portal "
             "with mobile no. and password (DOB as DDMMYYYY)." % app_no)
    return jsonify({
        "application_no": app_no,
        "app_id": new_id,
        "next_step": "Application submitted. Share this number with the citizen: %s" % app_no
    })


@app.route("/api/v1/application/status", methods=["GET"])
def api_application_status():
    """Check application status for a mobile number."""
    mobile = request.args.get("mobile", "").strip()
    token = request.args.get("token", "").strip()
    session_mobile = _get_api_session(token)
    if not session_mobile:
        return _api_error("Invalid or expired session token.", 401)
    if session_mobile != mobile:
        return _api_error("Token does not match the requested mobile number.", 403)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT application_no, status, submitted_at, decided_at, decision_reason "
        "FROM applications WHERE mobile = %s ORDER BY submitted_at DESC LIMIT 1",
        (mobile,))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row:
        return _api_error("No application found for this mobile number.")
    return jsonify({
        "application_no": row[0],
        "status": row[1],
        "submitted_at": str(row[2]),
        "decided_at": str(row[3]) if row[3] else None,
        "decision_reason": row[4]
    })


# --- Officer API ---

@app.route("/api/v1/officer/login", methods=["POST"])
def api_officer_login():
    """Authenticate as a block officer."""
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()
    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        return _api_error("Invalid officer credentials.", 401)
    token = secrets.token_urlsafe(32)
    expires = datetime.now() + timedelta(hours=8)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO officer_sessions (username, token, created_at, expires_at) "
        "VALUES (%s,%s,%s,%s)",
        (username, token, datetime.now(), expires))
    conn.commit()
    cur.close(); conn.close()
    return jsonify({"token": token, "role": "admin", "expires_in_hours": 8})


@app.route("/api/v1/officer/dashboard", methods=["GET"])
def api_officer_dashboard():
    """Officer dashboard summary."""
    token = request.args.get("token", "").strip()
    officer = _get_officer_session(token)
    if not officer:
        return _api_error("Invalid or expired officer token.", 401)
    conn = get_db()
    cur = conn.cursor()
    overdue_cutoff = datetime.now() - timedelta(days=SLA_DAYS)
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    cur.execute("SELECT count(*) FROM applications WHERE status='PENDING'")
    pending = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM applications WHERE status='APPROVED' AND decided_at >= %s",
                (today_start,))
    approved_today = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM applications WHERE status='REJECTED' AND decided_at >= %s",
                (today_start,))
    rejected_today = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM applications WHERE status='PENDING' AND submitted_at < %s",
                (overdue_cutoff,))
    overdue = cur.fetchone()[0]
    cur.execute(
        "SELECT block, count(*) FROM applications WHERE status='PENDING' "
        "GROUP BY block ORDER BY count(*) DESC")
    by_block = [{"block": r[0], "pending": r[1]} for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify({
        "pending": pending,
        "approved_today": approved_today,
        "rejected_today": rejected_today,
        "overdue": overdue,
        "by_block": by_block
    })


@app.route("/api/v1/officer/queue", methods=["GET"])
def api_officer_queue():
    """Pending applications queue."""
    token = request.args.get("token", "").strip()
    officer = _get_officer_session(token)
    if not officer:
        return _api_error("Invalid or expired officer token.", 401)
    block = request.args.get("block", "").strip()
    page = int(request.args.get("page", 1))
    conn = get_db()
    cur = conn.cursor()
    if block:
        cur.execute(
            "SELECT id, application_no, applicant_name, block, submitted_at "
            "FROM applications WHERE status='PENDING' AND block = %s "
            "ORDER BY submitted_at ASC LIMIT 50 OFFSET %s",
            (block, (page - 1) * 50))
    else:
        cur.execute(
            "SELECT id, application_no, applicant_name, block, submitted_at "
            "FROM applications WHERE status='PENDING' "
            "ORDER BY submitted_at ASC LIMIT 50 OFFSET %s",
            ((page - 1) * 50,))
    rows = cur.fetchall()
    overdue_cutoff = datetime.now() - timedelta(days=SLA_DAYS)
    cur.execute("SELECT count(*) FROM applications WHERE status='PENDING' AND submitted_at < %s",
                (overdue_cutoff,))
    overdue_count = cur.fetchone()[0]
    cur.close(); conn.close()
    now = datetime.now()
    apps = [{
        "id": r[0], "application_no": r[1], "applicant_name": r[2],
        "block": r[3], "submitted_at": str(r[4]),
        "days_pending": (now - r[4]).days,
        "is_overdue": (now - r[4]).days >= SLA_DAYS
    } for r in rows]
    return jsonify({"applications": apps, "overdue": overdue_count, "page": page})


@app.route("/api/v1/officer/application/<int:app_id>", methods=["GET"])
def api_officer_get_application(app_id):
    """Full application detail for officer review."""
    token = request.args.get("token", "").strip()
    officer = _get_officer_session(token)
    if not officer:
        return _api_error("Invalid or expired officer token.", 401)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT application_no, applicant_name, mobile, dob, gender, marital_status, "
        "village, block, bank_account, ifsc, status, submitted_at, decided_at, "
        "decided_by, decision_reason FROM applications WHERE id = %s", (app_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row:
        return _api_error("Application not found.", 404)
    bank = str(row[8])
    masked_bank = bank[:2] + "*" * (len(bank) - 4) + bank[-2:] if len(bank) > 4 else "****"
    mobile = str(row[2])
    masked_mobile = mobile[:2] + "X" * 6 + mobile[-2:] if len(mobile) == 10 else mobile
    return jsonify({
        "id": app_id, "application_no": row[0], "applicant_name": row[1],
        "mobile": masked_mobile, "dob": str(row[3]), "gender": row[4],
        "marital_status": row[5], "village": row[6], "block": row[7],
        "bank_account": masked_bank, "ifsc": row[9], "status": row[10],
        "submitted_at": str(row[11]),
        "decided_at": str(row[12]) if row[12] else None,
        "decided_by": row[13], "decision_reason": row[14]
    })


@app.route("/api/v1/officer/approve/<int:app_id>", methods=["POST"])
def api_officer_approve(app_id):
    """Approve a pending application. Requires reason (recorded against officer)."""
    data = request.get_json(silent=True) or {}
    token = str(data.get("token", "")).strip()
    reason = str(data.get("reason", "")).strip()
    officer = _get_officer_session(token)
    if not officer:
        return _api_error("Invalid or expired officer token.", 401)
    if len(reason) < 10:
        return _api_error("reason is required (minimum 10 characters).")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE applications SET status='APPROVED', decided_at=%s, "
        "decided_by=%s, decision_reason=%s WHERE id=%s AND status='PENDING'",
        (datetime.now(), "%s (via MCP)" % officer, reason, app_id))
    updated = cur.rowcount
    conn.commit()
    cur.close(); conn.close()
    if updated == 0:
        return _api_error("Application not found or already decided.", 404)
    return jsonify({"status": "approved", "app_id": app_id,
                    "decided_by": "%s (via MCP)" % officer})


@app.route("/api/v1/officer/reject/<int:app_id>", methods=["POST"])
def api_officer_reject(app_id):
    """Reject a pending application. Requires reason (shown to citizen)."""
    data = request.get_json(silent=True) or {}
    token = str(data.get("token", "")).strip()
    reason = str(data.get("reason", "")).strip()
    officer = _get_officer_session(token)
    if not officer:
        return _api_error("Invalid or expired officer token.", 401)
    if len(reason) < 10:
        return _api_error("reason is required (minimum 10 characters).")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE applications SET status='REJECTED', decided_at=%s, "
        "decided_by=%s, decision_reason=%s WHERE id=%s AND status='PENDING'",
        (datetime.now(), "%s (via MCP)" % officer, reason, app_id))
    updated = cur.rowcount
    conn.commit()
    cur.close(); conn.close()
    if updated == 0:
        return _api_error("Application not found or already decided.", 404)
    return jsonify({"status": "rejected", "app_id": app_id,
                    "decided_by": "%s (via MCP)" % officer})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
