"""Generate SAMPLE events (dates relative to today) into data/events.json.

Every sample event is marked "sample": true and shown with a "דוגמה" badge.
Run:  python pipeline/make_sample.py
Delete the sample events before launch:  python pipeline/make_sample.py --clear
"""
import json
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVENTS = ROOT / "data" / "events.json"
VENUES = ROOT / "data" / "venues.json"

# (days from today, HH:MM, title, venue name, free?, price)
TEMPLATES = [
    (0, "20:30", "ערב ג'אם פתוח", "הצוללת הצהובה", False, "30 ₪"),
    (0, "21:00", "הקרנת סרט קלאסי", "סינמטק ירושלים", False, "42 ₪"),
    (1, "19:00", "הרצאה: היסטוריה של השכונות", "בית אבי חי", True, ""),
    (2, "18:00", "סדנת צילום רחוב", "שוק מחנה יהודה", False, "60 ₪"),
    (3, "20:00", "תערוכה: פתיחה חגיגית", "בית הנסן", True, ""),
    (4, "22:00", "מסיבת סטודנטים", "התחנה הראשונה", False, "50 ₪"),
    (4, "19:30", "מופע סטנדאפ", "הצוללת הצהובה", False, "70 ₪"),
    (5, "10:00", "שוק יד שנייה", "המושבה הגרמנית - עמק רפאים", True, ""),
    (5, "13:00", "פיקניק מוזיקלי", "גן סאקר", True, ""),
    (5, "21:30", "הופעה חיה: אינדי מקומי", "הצוללת הצהובה", False, "60 ₪"),
    (6, "11:00", "סיור אמנות רחוב", "נחלאות - כיכר הנרייטה", True, ""),
    (6, "20:00", "ערב שירה פתוח", "בית הנסן", True, ""),
    (7, "19:00", "ערב משחקי קופסה", "מתחם בצלאל - מרכז העיר", True, ""),
    (9, "20:00", "קונצרט ג'אז", "הספרייה הלאומית", False, "40 ₪"),
    (11, "21:00", "מסיבת גג", "כיכר ספרא", False, "40 ₪"),
    (12, "10:00", "שוק אוכל וקראפט", "התחנה הראשונה", True, ""),
]


def main():
    existing = json.loads(EVENTS.read_text(encoding="utf-8")) if EVENTS.exists() else []
    real = [e for e in existing if not e.get("sample")]
    if "--clear" in sys.argv:
        EVENTS.write_text(json.dumps(real, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Removed sample events. {len(real)} real events kept.")
        return

    venues = {v["name"]: v for v in json.loads(VENUES.read_text(encoding="utf-8"))}
    today = date.today()
    samples = []
    for i, (days, hhmm, title, venue, free, price) in enumerate(TEMPLATES):
        v = venues[venue]
        d = today + timedelta(days=days)
        samples.append({
            "id": f"sample-{i}",
            "title": title,
            "description": "",
            "start_time": f"{d.isoformat()}T{hhmm}:00+02:00",
            "end_time": None,
            "venue_name": venue,
            "address": v["address"],
            "lat": v["lat"],
            "lng": v["lng"],
            "source_url": "https://example.com/sample",
            "source_name": "דוגמה",
            "origin": "collected",
            "is_free": free,
            "price_text": price,
            "payment_link": None,
            "status": "active",
            "dedup_key": f"sample-{i}",
            "sample": True,
        })
    EVENTS.write_text(json.dumps(real + samples, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(samples)} sample events (+{len(real)} real) to {EVENTS}")


if __name__ == "__main__":
    main()
