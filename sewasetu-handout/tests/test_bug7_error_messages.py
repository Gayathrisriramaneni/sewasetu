"""Bug 7: ERR_VAL_47 shown to citizens on upload errors — incomprehensible error code."""
import os

APP_PY = os.path.join(os.path.dirname(__file__), '..', 'app', 'app.py')


def test_no_err_val_47_in_source():
    src = open(APP_PY, encoding='utf-8').read()
    assert 'ERR_VAL_47' not in src, (
        "ERR_VAL_47 is still shown to citizens on upload errors. "
        "Replace with human-readable messages like 'Please select a PDF file'."
    )
