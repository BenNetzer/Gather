// Data layer: Supabase when configured, otherwise static JSON (demo mode).
window.GatherData = (function () {
  const cfg = window.GATHER_CONFIG || {};
  const useSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

  // Public columns only — poster_contact is never requested (and anon has no grant on it).
  const PUBLIC_COLS = "id,title,description,start_time,end_time,venue_name,address,lat,lng," +
    "source_url,source_name,origin,is_free,price_text,payment_link,status,dedup_key";

  function sbHeaders(extra) {
    return Object.assign({
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    }, extra || {});
  }

  // Safety net: drop duplicates that slipped through the pipeline.
  function dedupe(events) {
    const seen = new Set();
    return events.filter((e) => {
      const k = e.dedup_key || e.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  async function loadEvents() {
    let rows;
    if (useSupabase) {
      const nowIso = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
      const url = `${cfg.SUPABASE_URL}/rest/v1/events?select=${PUBLIC_COLS}` +
        `&status=eq.active&start_time=gte.${encodeURIComponent(nowIso)}&order=start_time.asc`;
      const res = await fetch(url, { headers: sbHeaders() });
      if (!res.ok) throw new Error("Supabase " + res.status);
      rows = await res.json();
    } else {
      const res = await fetch("data/events.json", { cache: "no-store" });
      if (!res.ok) throw new Error("events.json " + res.status);
      rows = (await res.json()).filter((e) => e.status === "active");
    }
    rows.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    return dedupe(rows);
  }

  async function loadVenues() {
    const res = await fetch("data/venues.json");
    return res.ok ? res.json() : [];
  }

  async function submitPrivate(ev) {
    const row = Object.assign({}, ev, { origin: "private", status: "draft" });
    if (useSupabase) {
      const res = await fetch(`${cfg.SUPABASE_URL}/rest/v1/events`, {
        method: "POST",
        headers: sbHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error("Supabase " + res.status + ": " + (await res.text()));
      return { demo: false };
    }
    try {
      const key = "gather_pending";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.push(row);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) { /* storage unavailable — demo only */ }
    return { demo: true, row };
  }

  return { useSupabase, loadEvents, loadVenues, submitPrivate };
})();
