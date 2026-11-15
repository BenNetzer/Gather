"""Run:  python gather/pipeline/tests/test_pipeline.py      (or: python -m unittest discover gather/pipeline/tests)"""
import json
import shutil
import sys
import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import common  # noqa: E402
import process  # noqa: E402
import publish  # noqa: E402

TODAY = date(2026, 11, 15)
NOW = datetime(2026, 11, 15, 10, 0, tzinfo=timezone.utc)
FIXTURE = HERE / "fixture_raw.json"
VENUES = HERE.parent.parent / "data" / "venues.json"


class PipelineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raws = json.loads(FIXTURE.read_text(encoding="utf-8"))
        cls.venues = common.VenueIndex.load(VENUES)
        cls.staging, cls.report = process.process(cls.raws, cls.venues, [], TODAY)
        cls.by_title = {e["title"]: e for e in cls.staging}

    def test_counts(self):
        r = self.report
        self.assertEqual(r["raw"], 6)
        self.assertEqual(r["rejected"], 2)
        self.assertEqual(r["merged_duplicates"], 1)
        self.assertEqual(r["staged"], 3)
        self.assertEqual(r["rejection_reasons"], {"no_date": 1, "venue_not_in_source": 1})

    def test_merged_event(self):
        e = self.by_title["הבדחן"]
        self.assertEqual(e["venue_name"], "סינמטק ירושלים")
        self.assertEqual(len(e["_sources"]), 2)
        self.assertEqual(e["price_text"], "42 ₪")            # filled from the 2nd source
        self.assertIs(e["is_free"], False)
        self.assertEqual(e["start_time"], "2026-11-16T18:00:00+02:00")
        self.assertEqual(e["end_time"], "2026-11-16T19:45:00+02:00")
        self.assertIn("merged_sources", e["_flags"])

    def test_known_venue_gets_coordinates(self):
        e = self.by_title["ערב ג'אם פתוח"]
        self.assertEqual(e["venue_name"], "בית הנסן")
        self.assertEqual(e["address"], "גדליהו אלון 14, טלביה")
        self.assertAlmostEqual(e["lat"], 31.7686)
        self.assertAlmostEqual(e["lng"], 35.2176)
        self.assertEqual(e["status"], "draft")
        self.assertEqual(e["_venue_match"], "exact")
        for ev in self.staging:
            if ev["_venue_match"] != "none":
                self.assertIsNotNone(ev["lat"])

    def test_unmatched_venue_flagged(self):
        e = self.by_title["מסיבת גג"]
        self.assertIsNone(e["lat"])
        self.assertIn("unmatched_venue", e["_flags"])
        self.assertEqual(self.report["unmatched_venues"], ["גג המשביר"])

    def test_normalize(self):
        n = common.normalize
        self.assertEqual(n("הַבַּדְחָן"), n("הבדחן"))
        self.assertEqual(n("ג׳אם"), n("ג'אם"))
        self.assertEqual(n("הסינמטק"), "סינמטק")
        self.assertEqual(n("Jerusalem CINEMATHEQUE"), "jerusalem cinematheque")

    def test_past_and_existing(self):
        raw = dict(self.raws[4], date="2026-11-01")
        _, rep = process.process([raw], self.venues, [], TODAY)
        self.assertEqual(rep["rejection_reasons"], {"past_date": 1})
        key = self.by_title["ערב ג'אם פתוח"]["dedup_key"]
        st, rep = process.process(self.raws, self.venues, [{"id": "old-1", "dedup_key": key}], TODAY)
        self.assertEqual(rep["matched_existing"], 1)
        self.assertEqual([e["id"] for e in st if e["_existing"]], ["old-1"])

    def test_publish_demo(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            events = tmp / "events.json"
            old_past = {"id": "x", "title": "ישן", "start_time": "2020-01-01T20:00:00+02:00",
                        "end_time": None, "status": "active", "dedup_key": "old"}
            events.write_text(json.dumps([old_past], ensure_ascii=False), encoding="utf-8")
            rows, skipped = publish.select_rows(self.staging, allow_unmatched=False)
            self.assertEqual(len(rows), 2)                     # unmatched party skipped
            self.assertEqual(len(skipped), 1)
            added, updated, past = publish.publish_demo(rows, events, now=NOW)
            self.assertEqual((added, updated, past), (2, 0, 1))
            data = json.loads(events.read_text(encoding="utf-8"))
            self.assertTrue(all(not k.startswith("_") for e in data for k in e))
            self.assertEqual({e["status"] for e in data if e["dedup_key"] != "old"}, {"active"})
            self.assertEqual(next(e for e in data if e["dedup_key"] == "old")["status"], "past")
            # re-publishing is idempotent (upsert by dedup_key)
            added, updated, _ = publish.publish_demo(rows, events, now=NOW)
            self.assertEqual((added, updated), (0, 2))
            self.assertIn("ערב ג'אם פתוח", events.read_text(encoding="utf-8"))  # real UTF-8, not \u escapes
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    common.utf8_stdout()
    unittest.main(verbosity=2)
