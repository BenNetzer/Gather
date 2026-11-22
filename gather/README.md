# Gather

Gather is a mobile-first Hebrew (RTL) web app that lists culture and leisure events in Jerusalem,
on a list and on a map (Leaflet). Anyone can also submit a private event; it is saved as a
**draft** and appears on the site only after a team member approves it.

It is a static site — plain HTML, CSS and JavaScript, no build step. The backend is the
Supabase free tier, reached directly through its REST API.

## Files

| Path | What it is |
|---|---|
| `index.html` | The single page |
| `css/style.css` | Styles |
| `js/config.js` | Supabase URL + anon key (empty = demo mode) |
| `js/data.js` | Data layer: loads events, submits private events (Supabase or demo) |
| `js/dates.js`, `js/app.js` | Date helpers, UI and routing |
| `data/events.json` | Event data for demo mode |
| `data/venues.json` | Known venues |
| `supabase/schema.sql` | Table, row-level security and grants for Supabase |
| `pipeline/` | Python scripts that build and publish the event data |

## Run locally

From inside the `gather/` folder:

```bash
python -m http.server
```

Then open <http://localhost:8000>. (Opening `index.html` straight from disk won't work — the
app fetches JSON files, which browsers block on `file://`.)

## Demo mode vs. Supabase mode

The mode is chosen by `js/config.js`:

|  | Demo mode (`SUPABASE_URL` / `SUPABASE_ANON_KEY` empty) | Supabase mode (both filled) |
|---|---|---|
| Events shown | `data/events.json`, rows with `status: "active"` | `events` table: `status = active`, starting from 12 hours ago onward |
| "Post an event" form | Saved only in this browser (`localStorage` key `gather_pending`) | Inserted into `events` as `origin = private`, `status = draft` |
| Venues | `data/venues.json` | `data/venues.json` |

Demo mode needs no account and is fine for development and presentations.

## Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and click **Run**.
   This creates the `events` table and locks it down:
   - the public (anon) key can read only `active` events, and never the `poster_contact` column;
   - the anon key can insert only rows with `origin = 'private'` and `status = 'draft'`;
   - the anon key cannot update or delete anything.
3. Go to **Project Settings → API** and copy the **Project URL** and the **anon / public** key into `js/config.js`:

   ```js
   window.GATHER_CONFIG = {
     SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
     SUPABASE_ANON_KEY: "eyJ...",
   };
   ```

   The anon key is meant to be public. **Never put the `service_role` key in `config.js` or anywhere in
   the site** — it bypasses all security rules. It belongs only in the pipeline's environment on a team
   member's machine, never committed.
4. Reload the site. It now reads from and writes to Supabase.

## Approving private events

1. In Supabase, open **Table Editor → events**.
2. Filter `status` = `draft` (and `origin` = `private`).
3. Check the row; you can see `poster_contact` here if you need to reach the person who posted it.
4. To publish it, change `status` to `active`. To reject it, set `status` to `cancelled` (or delete the row).

The Table Editor runs with admin rights, so it isn't restricted by row-level security.

## Contact form

The "צרו קשר" page (`#/contact`, linked from the footer) lets visitors send a message to the team.

- **Supabase mode:** messages are inserted into the `contact_messages` table (created by
  `supabase/schema.sql`). The public key can only insert; nobody can read messages from the site.
  Read them in **Table Editor → contact_messages** and set `handled` to `true` once answered.
- **Demo mode:** messages are kept in this browser only (`localStorage` key `gather_contact`).

## Event pipeline

Collected events (`origin = collected`) are added in three steps, run in this order; see the
scripts in `pipeline/` for details and options:

1. **`/collect`** — gather raw event listings.
2. **`python pipeline/process.py`** — normalize the raw listings into `events` rows, including a `dedup_key`.
3. **`python pipeline/publish.py`** — publish the processed events (to Supabase, using the
   service-role key from your local environment).

`python pipeline/make_sample.py` fills `data/events.json` with sample events dated from today
(shown with a "דוגמה" badge); `python pipeline/make_sample.py --clear` removes them before launch.
