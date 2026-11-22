# CLAUDE.md

Course project (Data & Technology). The product is **Gather**: a mobile-first Hebrew RTL web app
listing culture/leisure events in Jerusalem for ages 20–35. The spec is
`Gather – MVP Product Requirements Document.docx` at the repo root. All code lives in `gather/`;
`gather/README.md` is the user-facing setup guide.

## Stack and constraints

- Static site: plain HTML/CSS/JS, **no build step, no npm, no framework**. Leaflet for maps (CDN).
- Backend: Supabase free tier, called directly via its REST API (PostgREST) from `js/data.js`.
- Pipeline: Python, **stdlib only** (no pip dependencies).
- UI text is Hebrew, `dir="rtl"`. Keep new UI strings in Hebrew and layouts RTL-safe.
- Not a git repo. The path contains Hebrew and spaces: quote it in shell commands.

## Run

```bash
python -m http.server 8765 --directory gather
```

(`.claude/launch.json` config `gather` does the same.) Opening `index.html` from `file://` does not work.

## Layout

| Path | Role |
|---|---|
| `gather/index.html` | Single page; hash routes `#/` (list + map), `#/event/<id>`, `#/post`, `#/contact` |
| `gather/js/config.js` | `GATHER_CONFIG.SUPABASE_URL` / `SUPABASE_ANON_KEY`; empty = demo mode |
| `gather/js/data.js` | `GatherData`: `loadEvents`, `loadVenues`, `submitPrivate`, `submitContact` |
| `gather/js/dates.js`, `gather/js/app.js` | Date helpers; UI, filters, map, post form, router |
| `gather/data/events.json` | Events for demo mode |
| `gather/data/venues.json` | Venues with `name`, `aliases`, `address`, `lat`, `lng` |
| `gather/supabase/schema.sql` | `events` table, RLS policies, column grants |
| `gather/pipeline/` | `sources.json`, `common.py`, `process.py`, `publish.py`, `make_sample.py`; output in `pipeline/out/` |
| `.claude/commands/collect.md` | `/collect [days]`: extraction step, writes `pipeline/out/raw-<date>.json` |

## Data model (`events`)

Columns: `id, title, description, start_time, end_time, venue_name, address, lat, lng,
source_url, source_name, origin, is_free, price_text, payment_link, status, dedup_key,
poster_contact, created_at`.

- `origin`: `collected` (pipeline) | `private` (user-submitted form).
- `status`: `draft` | `active` | `cancelled` | `past`. Only `active` is shown.
- `dedup_key` = `normalize(title)|YYYY-MM-DD|normalize(venue)` (see `common.dedup_key`), unique.
- Times are ISO with Israel offset (`+02:00` / `+03:00`, see `common.to_iso`).
- Sample rows in `events.json` carry `"sample": true` (shown with a "דוגמה" badge); there is no
  such DB column, so strip it before sending to Supabase.

## Security rules (do not weaken)

- Anon (public site) may SELECT only `status='active'` rows and **never `poster_contact`**;
  `PUBLIC_COLS` in `data.js` must stay in sync with the SELECT grant in `schema.sql`.
- Anon may INSERT only `origin='private'`, `status='draft'`, and only the columns `submitPrivate`
  sends. If the form sends a new field, add it to the INSERT grant in `schema.sql` too.
- Inserts use `Prefer: return=minimal` (anon cannot read back drafts).
- No anon UPDATE/DELETE. Drafts are approved by a team member in the Supabase Table Editor
  (`status` → `active`).
- The `service_role` key is used only by `pipeline/publish.py` from the local environment.
  Never put it in `js/config.js`, any file under `gather/` that is served, or anything committed.
- `contact_messages` (contact form): anon may INSERT only `name, contact, topic, message`;
  no anon SELECT/UPDATE/DELETE. Team reads it in the Table Editor and sets `handled`.
- Render untrusted text with `esc()` and links through `safeUrl()` in `app.js`.

## Pipeline

1. `/collect` → `gather/pipeline/out/raw-<date>.json`. Precision over recall: every title, date,
   time and venue must appear verbatim in `source_text`; never invent fields.
2. `python gather/pipeline/process.py gather/pipeline/out/raw-<date>.json` → validates against
   `source_text`, matches venues, builds `events` rows and `dedup_key`.
3. `python gather/pipeline/publish.py` → publishes to Supabase (service-role key).

`python gather/pipeline/make_sample.py` adds sample events; `--clear` removes them.

Pipeline scripts call `common.utf8_stdout()` so Hebrew prints on the Windows console, and write
JSON with `ensure_ascii=False` (real Hebrew, not `\u05..` escapes).
