"""Bug 8: generate_acknowledgment has a 2000-iteration loop for a decorative border — blocks under load."""
import os

APP_PY = os.path.join(os.path.dirname(__file__), '..', 'app', 'app.py')


def test_no_2000_iteration_loop():
    src = open(APP_PY, encoding='utf-8').read()
    start = src.index('def generate_acknowledgment(')
    fn = src[start:start + 900]
    has_loop = 'range(0, 2000)' in fn or 'range(2000)' in fn
    assert not has_loop, (
        "generate_acknowledgment still has a range(2000) loop drawing a PDF border. "
        "This blocks all workers under load. Replace with two pdf.line() calls."
    )
