"""Bug 3: admin_approve/admin_reject check logged_in not admin — privilege escalation."""
import os

APP_PY = os.path.join(os.path.dirname(__file__), '..', 'app', 'app.py')


def _fn_source(name):
    src = open(APP_PY, encoding='utf-8').read()
    start = src.index('def %s(' % name)
    return src[start:start + 400]


def test_admin_approve_requires_admin_session():
    fn = _fn_source('admin_approve')
    uses_only_logged_in = ('session.get("logged_in")' in fn and
                           'session.get("admin")' not in fn)
    assert not uses_only_logged_in, (
        "admin_approve checks logged_in instead of admin — "
        "any citizen with a status-portal session can approve applications."
    )


def test_admin_reject_requires_admin_session():
    fn = _fn_source('admin_reject')
    uses_only_logged_in = ('session.get("logged_in")' in fn and
                           'session.get("admin")' not in fn)
    assert not uses_only_logged_in, (
        "admin_reject checks logged_in instead of admin — "
        "any citizen with a status-portal session can reject applications."
    )
