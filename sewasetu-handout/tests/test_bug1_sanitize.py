"""Bug 1: sanitize() byte-truncation corrupts Devanagari (multi-byte) names.
This test confirms the bug exists BEFORE the fix.
"""
import os

APP_PY = os.path.join(os.path.dirname(__file__), '..', 'app', 'app.py')


def _extract_sanitize():
    """Pull the sanitize function source and exec it in isolation."""
    src = open(APP_PY, encoding='utf-8').read()
    start = src.index('def sanitize(')
    # grab up to 15 lines
    lines = src[start:].split('\n')
    fn_lines = [lines[0]]
    for line in lines[1:]:
        if line and not line[0].isspace():
            break
        fn_lines.append(line)
    ns = {}
    exec('\n'.join(fn_lines), ns)
    return ns['sanitize']


def test_devanagari_name_truncated_by_bug():
    sanitize = _extract_sanitize()
    name = "रामकली देवी"  # 12 chars, 34 UTF-8 bytes
    result = sanitize(name)
    # Bug: encode[:20] cuts mid-character producing garbled output OR silent truncation
    # After fix this test will be replaced with test_bug1_sanitize_fixed.py
    assert result != name, (
        "sanitize() should truncate this name at 20 bytes (bug) — "
        "if this passes the fix is already applied"
    )


def test_ascii_name_within_20_chars_ok():
    sanitize = _extract_sanitize()
    assert sanitize("Rama Devi") == "Rama Devi"
