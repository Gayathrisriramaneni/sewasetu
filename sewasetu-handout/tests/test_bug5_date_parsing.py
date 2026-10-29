"""Bug 5: date parsing tries MM/DD/YYYY before DD/MM/YYYY — wrong for Indian users."""
from datetime import date, datetime


def _parse_buggy(dob_raw):
    dob = None
    for fmt in ("%m/%d/%Y", "%d/%m/%Y"):   # BUG: US format first
        try:
            dob = datetime.strptime(dob_raw, fmt).date()
            break
        except ValueError:
            continue
    return dob


def _parse_fixed(dob_raw):
    dob = None
    for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d"):
        try:
            dob = datetime.strptime(dob_raw, fmt).date()
            break
        except ValueError:
            continue
    return dob


def test_indian_date_wrong_before_fix():
    """05/03/1955 means 5 March — bug reads it as 3 May."""
    result = _parse_buggy("05/03/1955")
    assert result == date(1955, 5, 3), "Expected buggy result (May 3, not March 5)"


def test_indian_date_correct_after_fix():
    assert _parse_fixed("05/03/1955") == date(1955, 3, 5)


def test_iso_date_accepted_after_fix():
    assert _parse_fixed("1955-03-05") == date(1955, 3, 5)
