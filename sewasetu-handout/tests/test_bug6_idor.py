"""Bug 6: view_application has no ownership check — any citizen can read any other's data (IDOR)."""
import os

APP_PY = os.path.join(os.path.dirname(__file__), '..', 'app', 'app.py')


def test_view_application_has_ownership_check():
    src = open(APP_PY, encoding='utf-8').read()
    start = src.index('def view_application(')
    fn = src[start:start + 700]
    has_check = 'portal_mobile' in fn or ('abort(403)' in fn)
    assert has_check, (
        "view_application has no ownership check. "
        "Any logged-in citizen can view any other citizen's bank account and personal data "
        "by iterating /application/1, /application/2 etc."
    )
