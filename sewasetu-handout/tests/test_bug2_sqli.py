"""Bug 2: reset_password() uses string-interpolated SQL — SQL injection vulnerability."""
import os, re

APP_PY = os.path.join(os.path.dirname(__file__), '..', 'app', 'app.py')


def _reset_password_source():
    src = open(APP_PY, encoding='utf-8').read()
    start = src.index('def reset_password()')
    return src[start:start + 800]


def test_no_string_interpolation_in_reset_password():
    """After fix: reset_password must NOT use % string-formatting in SQL."""
    fn = _reset_password_source()
    bad = re.search(r"WHERE\s+mobile\s*=\s*'%s'", fn)
    assert bad is None, (
        "SQL injection: reset_password still uses string-interpolated SQL. "
        "Use parameterised queries with (mobile,) tuple."
    )
