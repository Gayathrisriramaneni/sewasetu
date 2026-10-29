"""Bug 4: deemed_approval.py reads settings.ini which does not exist (renamed to app.ini)."""
import os

SCRIPT = os.path.join(os.path.dirname(__file__), '..', 'app', 'scripts', 'deemed_approval.py')


def test_deemed_approval_reads_correct_config():
    src = open(SCRIPT, encoding='utf-8').read()
    assert 'settings.ini' not in src, (
        "deemed_approval.py still references settings.ini which does not exist. "
        "The file was renamed to app.ini in CR-2026-031. "
        "The nightly cron has been silently failing — no application has been auto-approved."
    )
    assert 'app.ini' in src, "deemed_approval.py must reference app.ini"
