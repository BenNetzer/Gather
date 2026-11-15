"""Shared helpers for the Gather pipeline (stdlib only)."""
import json
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # gather/
DATA = ROOT / "data"
OUT = Path(__file__).resolve().parent / "out"


def utf8_stdout():
    """Make print() safe for Hebrew on a Windows console."""
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass


def read_json(path, default=None):
    path = Path(path)
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path, obj):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# Hebrew normalization
# ---------------------------------------------------------------------------
_NIQQUD = re.compile(r"[֑-ׇ]")                 # cantillation + niqqud (incl. maqaf etc.)
_QUOTES = re.compile(r"[\"'`´׳״‘’‚‛“”„‟]")
_PUNCT = re.compile(r"[^\w\s]|_", re.UNICODE)            # everything else that isn't a letter/digit
_WS = re.compile(r"\s+")


def normalize(text):
    """Strip niqqud and quotes, lowercase Latin, turn punctuation into spaces,
    drop a leading ה from each word, collapse whitespace."""
    if not text:
        return ""
    s = str(text)
    s = _NIQQUD.sub(lambda m: " " if m.group() == "־" else "", s)  # maqaf -> space
    s = _QUOTES.sub("", s)
    s = s.lower()
    s = _PUNCT.sub(" ", s)
    words = []
    for w in s.split():
        if len(w) > 2 and w[0] == "ה":
            w = w[1:]
        words.append(w)
    return " ".join(words)


def contains_words(haystack_norm, needle_norm):
    """True if needle (normalized) appears in haystack (normalized) on word boundaries.
    Also accepts one Hebrew prefix letter glued to the first word (בבית הנסן, לסינמטק, ובתחנה)."""
    if not needle_norm:
        return False
    hay = f" {haystack_norm} "
    if f" {needle_norm} " in hay:
        return True
    return any(f" {p}{needle_norm} " in hay or f" {p}ה{needle_norm} " in hay for p in "ובלמשכ")


# ---------------------------------------------------------------------------
# Dates
# ---------------------------------------------------------------------------
HEB_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי",
              "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]


def parse_date(s):
    try:
        return date.fromisoformat(str(s).strip()[:10])
    except (TypeError, ValueError):
        return None


def date_in_text(d, text_norm):
    """Does date d appear in normalized source text? Accepts 15.11 / 15.11.26 / 15/11/2026 /
    2026-11-15 / '15 בנובמבר' (all become space-separated after normalize())."""
    t = f" {text_norm} "
    day_forms = {str(d.day), f"{d.day:02d}"}
    mon_forms = {str(d.month), f"{d.month:02d}"}
    cands = [f"{dd} {mm}" for dd in day_forms for mm in mon_forms]
    cands += [f"{d.year} {d.month:02d} {d.day:02d}"]
    m = HEB_MONTHS[d.month - 1]
    cands += [f"{dd} {p}{m}" for dd in day_forms for p in ("", "ב", "ל")]
    for c in cands:
        if re.search(r"(?<!\d)" + re.escape(c) + r"(?!\d)", t):
            return True
    return False


def _last_sunday(year, month):
    d = date(year, month + 1, 1) - timedelta(days=1) if month < 12 else date(year, 12, 31)
    return d - timedelta(days=(d.weekday() + 1) % 7)


def israel_offset(d):
    """+03:00 during Israel summer time (Friday before last Sunday of March → last Sunday
    of October), else +02:00. Day-level precision is enough for event listings."""
    start = _last_sunday(d.year, 3) - timedelta(days=2)
    end = _last_sunday(d.year, 10)
    return "+03:00" if start <= d < end else "+02:00"


def to_iso(d, hhmm):
    """date + 'HH:MM' -> '2026-11-15T18:00:00+02:00' (None if hhmm invalid)."""
    m = re.fullmatch(r"\s*(\d{1,2}):(\d{2})\s*", str(hhmm or ""))
    if not m or int(m.group(1)) > 23 or int(m.group(2)) > 59:
        return None
    return f"{d.isoformat()}T{int(m.group(1)):02d}:{m.group(2)}:00{israel_offset(d)}"


def parse_iso_dt(s):
    try:
        return datetime.fromisoformat(str(s))
    except (TypeError, ValueError):
        return None


def now_utc():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Venues
# ---------------------------------------------------------------------------
class VenueIndex:
    def __init__(self, venues):
        self.venues = venues
        self.keys = []   # (normalized key, venue)
        for v in venues:
            for name in [v["name"], *v.get("aliases", [])]:
                k = normalize(name)
                if k:
                    self.keys.append((k, v))
        self.exact = {k: v for k, v in self.keys}

    @classmethod
    def load(cls, path=None):
        return cls(read_json(path or DATA / "venues.json", []))

    def match(self, venue_text):
        """Return (venue, 'exact'|'partial') or (None, None).
        exact = whole normalized string equals a name/alias;
        partial = a name/alias appears inside the text as whole words (longest wins)."""
        n = normalize(venue_text)
        if not n:
            return None, None
        if n in self.exact:
            return self.exact[n], "exact"
        best = None
        for k, v in self.keys:
            if contains_words(n, k) and (best is None or len(k) > len(best[0])):
                best = (k, v)
        return (best[1], "partial") if best else (None, None)


def dedup_key(title, d, venue):
    return f"{normalize(title)}|{d.isoformat() if hasattr(d, 'isoformat') else d}|{normalize(venue)}"
