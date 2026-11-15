"""Validate, venue-match and dedupe raw collected events → out/staging-<date>.json (status draft).

Usage (from the repo root or gather/):
    python gather/pipeline/process.py gather/pipeline/out/raw-2026-11-15.json [more raw files...]
Options:
    --today YYYY-MM-DD   treat this as today (default: system date)
    --events PATH        existing published events (default: gather/data/events.json)
    --venues PATH        known venues (default: gather/data/venues.json)
    --out PATH           staging file (default: gather/pipeline/out/staging-<today>.json)

Review fields start with "_" (e.g. _venue_match, _sources, _source_text, _flags);
publish.py strips them. To drop an event during review, delete it or set "status": "rejected".
"""
import argparse
from collections import Counter, OrderedDict
from datetime import date, timedelta

from common import (OUT, DATA, VenueIndex, contains_words, date_in_text, dedup_key,
                    normalize, parse_date, parse_iso_dt, read_json, to_iso, utf8_stdout,
                    write_json)


def validate(raw, today):
    """Return (reason, parsed_date). reason is None when the event is acceptable."""
    title = (raw.get("title") or "").strip()
    venue = (raw.get("venue_text") or raw.get("venue") or "").strip()
    src = normalize(raw.get("source_text") or "")
    d = parse_date(raw.get("date"))
    if not raw.get("date"):
        return "no_date", None
    if d is None:
        return "bad_date", None
    if d < today:
        return "past_date", d
    if not title:
        return "no_title", d
    if not venue:
        return "no_venue", d
    if not to_iso(d, raw.get("start_time")):
        return "no_start_time", d
    if not src:
        return "no_source_text", d
    if not contains_words(src, normalize(title)):
        return "title_not_in_source", d
    if not date_in_text(d, src):
        return "date_not_in_source", d
    if not contains_words(src, normalize(venue)):
        return "venue_not_in_source", d
    return None, d


def build_event(raw, d, venues):
    venue_text = (raw.get("venue_text") or raw.get("venue") or "").strip()
    v, how = venues.match(venue_text)
    start = to_iso(d, raw.get("start_time"))
    end = None
    if raw.get("end_time"):
        end = to_iso(d, raw["end_time"])
        if end and parse_iso_dt(end) < parse_iso_dt(start):       # ends after midnight
            end = to_iso(d + timedelta(days=1), raw["end_time"])
    is_free = raw.get("is_free")
    ev = OrderedDict(
        id=None,
        title=raw["title"].strip(),
        description="",
        start_time=start,
        end_time=end,
        venue_name=v["name"] if v else venue_text,
        address=v["address"] if v else None,
        lat=v["lat"] if v else None,
        lng=v["lng"] if v else None,
        source_url=raw.get("source_url"),
        source_name=raw.get("source_name"),
        origin="collected",
        is_free=is_free if isinstance(is_free, bool) else None,
        price_text=(raw.get("price_text") or "").strip(),
        payment_link=None,
        status="draft",
        dedup_key=dedup_key(raw["title"], d, v["name"] if v else venue_text),
        _venue_text=venue_text,
        _venue_match=how or "none",
        _sources=[{"source_name": raw.get("source_name"), "source_url": raw.get("source_url")}],
        _source_text=raw.get("source_text"),
        _existing=False,
        _flags=[],
    )
    if not v:
        ev["_flags"].append("unmatched_venue")
    elif how == "partial":
        ev["_flags"].append("partial_venue_match")
    return ev


def merge_into(base, other):
    """Merge a duplicate from another source into base (fill blanks, keep both sources)."""
    for k in ("end_time", "price_text", "source_url", "source_name"):
        if not base.get(k) and other.get(k):
            base[k] = other[k]
    if base.get("is_free") is None and other.get("is_free") is not None:
        base["is_free"] = other["is_free"]
    for s in other["_sources"]:
        if s not in base["_sources"]:
            base["_sources"].append(s)
    if "merged_sources" not in base["_flags"]:
        base["_flags"].append("merged_sources")


def process(raws, venues, existing, today):
    """Pure function used by the CLI and the tests. Returns (staging_events, report dict)."""
    rejected = []
    kept = OrderedDict()
    merged = 0
    for raw in raws:
        reason, d = validate(raw, today)
        if reason:
            rejected.append({"reason": reason, "title": raw.get("title"),
                             "source_name": raw.get("source_name"), "date": raw.get("date")})
            continue
        ev = build_event(raw, d, venues)
        key = ev["dedup_key"]
        if key in kept:
            merge_into(kept[key], ev)
            merged += 1
        else:
            kept[key] = ev

    by_key = {e.get("dedup_key"): e for e in existing if e.get("dedup_key")}
    matched_existing = 0
    for key, ev in kept.items():
        old = by_key.get(key)
        if old:
            matched_existing += 1
            ev["id"] = old.get("id")
            ev["_existing"] = True
            for k in ("description", "end_time", "price_text", "payment_link"):
                if not ev.get(k) and old.get(k):
                    ev[k] = old[k]
            if ev.get("is_free") is None and old.get("is_free") is not None:
                ev["is_free"] = old["is_free"]

    staging = list(kept.values())
    report = {
        "raw": len(raws),
        "rejected": len(rejected),
        "rejection_reasons": dict(Counter(r["reason"] for r in rejected)),
        "rejected_items": rejected,
        "merged_duplicates": merged,
        "matched_existing": matched_existing,
        "staged": len(staging),
        "unmatched_venues": sorted({e["_venue_text"] for e in staging if e["_venue_match"] == "none"}),
        "partial_venue_matches": sorted({f'{e["_venue_text"]} → {e["venue_name"]}'
                                         for e in staging if e["_venue_match"] == "partial"}),
    }
    return staging, report


def print_report(report, out_path):
    print(f"Raw events:          {report['raw']}")
    print(f"Rejected:            {report['rejected']}")
    for reason, n in sorted(report["rejection_reasons"].items(), key=lambda x: -x[1]):
        print(f"  - {reason}: {n}")
    for r in report["rejected_items"]:
        print(f"      [{r['reason']}] {r['title']!s} ({r['source_name']}, {r['date']})")
    print(f"Merged duplicates:   {report['merged_duplicates']}")
    print(f"Already in events:   {report['matched_existing']}")
    print(f"Staged (draft):      {report['staged']}  →  {out_path}")
    if report["unmatched_venues"]:
        print("Unmatched venues (add to data/venues.json or fix in staging):")
        for v in report["unmatched_venues"]:
            print(f"  ! {v}")
    if report["partial_venue_matches"]:
        print("Partial venue matches (check):")
        for v in report["partial_venue_matches"]:
            print(f"  ~ {v}")


def main(argv=None):
    utf8_stdout()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("raw", nargs="+")
    ap.add_argument("--today")
    ap.add_argument("--events", default=str(DATA / "events.json"))
    ap.add_argument("--venues", default=str(DATA / "venues.json"))
    ap.add_argument("--out")
    a = ap.parse_args(argv)

    today = date.fromisoformat(a.today) if a.today else date.today()
    raws = []
    for p in a.raw:
        data = read_json(p, [])
        if not isinstance(data, list):
            raise SystemExit(f"{p}: expected a JSON array of events")
        raws.extend(data)
    existing = read_json(a.events, []) or []
    staging, report = process(raws, VenueIndex.load(a.venues), existing, today)
    out = a.out or str(OUT / f"staging-{today.isoformat()}.json")
    write_json(out, staging)
    print_report(report, out)
    return report


if __name__ == "__main__":
    main()
