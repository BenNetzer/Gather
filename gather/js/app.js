// Gather – UI: router, list/map views, date filter, event page, private posting form.
(function () {
  const D = window.GatherDates;
  const Data = window.GatherData;
  const JERUSALEM = [31.778, 35.218];
  const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };

  const state = {
    events: [],
    venues: [],
    filter: null,
    freeOnly: false,
    view: store.get("gather_view") || "list",
    map: null,
    markers: null,
    selectedId: null,
    pickMap: null,
    pickMarker: null,
    picked: null,
  };

  // Inline SVG icons (stroke-based, inherit currentColor).
  const ICONS = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    ticket: '<path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3zM13 6v2M13 11v2M13 16v2"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
    nav: '<path d="m3 11 18-8-8 18-2-8-8-2z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2z"/>',
    doc: '<path d="M14 3H6v18h12V7l-4-4zM14 3v4h4M9 13h6M9 17h6"/>',
    external: '<path d="M14 4h6v6M20 4 10 14M18 14v6H4V6h6"/>',
    back: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevron: '<path d="m15 6-6 6 6 6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    calAdd: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    wallet: '<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM3 7l12-4v4M16 13h.01"/>',
  };
  const icon = (name, cls) =>
    `<svg class="icon${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function safeUrl(u) {
    try {
      const x = new URL(u);
      return x.protocol === "https:" || x.protocol === "http:" ? x.href : "";
    } catch (e) { return ""; }
  }

  function upcoming(now) {
    return state.events.filter((e) => D.endOf(e) > now);
  }

  function inFilter(filter, now) {
    return upcoming(now).filter((e) => D.inRange(e, filter, now) && (!state.freeOnly || e.is_free));
  }

  function visible() {
    return inFilter(state.filter, new Date());
  }

  function timeText(ev) {
    let t = D.timeLabel(ev.start_time);
    if (ev.end_time) t += "–" + D.timeLabel(ev.end_time);
    return t;
  }

  function priceBadge(ev) {
    return ev.is_free
      ? '<span class="badge badge-free">כניסה חופשית</span>'
      : `<span class="badge badge-paid">${esc(ev.price_text || "בתשלום")}</span>`;
  }

  function tagBadges(ev) {
    return `${priceBadge(ev)}
      ${ev.origin === "private" ? '<span class="badge badge-private">אירוע פרטי</span>' : ""}
      ${ev.sample ? '<span class="badge badge-sample">דוגמה</span>' : ""}`;
  }

  function placeText(ev) {
    return ev.venue_name || ev.address || "";
  }

  // ---------- default filter ----------
  function defaultFilter() {
    const now = new Date();
    const todayCount = upcoming(now).filter((e) => D.inRange(e, "today", now)).length;
    return todayCount > 10 ? "today" : "weekend";
  }

  // ---------- main screen ----------
  function renderChips() {
    const now = new Date();
    $$(".chip").forEach((b) => {
      const on = b.dataset.filter === state.filter;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on);
      const label = b.dataset.label || (b.dataset.label = b.textContent.trim());
      b.innerHTML = on
        ? `${esc(label)} <span class="pill-count">${inFilter(b.dataset.filter, now).length}</span>`
        : esc(label);
    });
    $$(".toggle-btn").forEach((b) => {
      const on = b.dataset.view === state.view;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on);
    });
    $("#free-only").setAttribute("aria-pressed", state.freeOnly);
  }

  function cardHtml(ev) {
    return `
      <a class="card" href="#/event/${encodeURIComponent(ev.id)}">
        <div class="card-time">${icon("clock", "icon-sm")}<span>${esc(timeText(ev))}</span></div>
        <div class="card-title">${esc(ev.title)}</div>
        ${placeText(ev) ? `<div class="card-place">${icon("pin", "icon-sm")}<span>${esc(placeText(ev))}</span></div>` : ""}
        <div class="card-tags">${tagBadges(ev)}</div>
        <span class="card-go">${icon("chevron")}</span>
      </a>`;
  }

  function renderList(list) {
    const el = $("#list");
    if (!list.length) { el.innerHTML = ""; return; }
    let html = "";
    let lastDay = null;
    for (const ev of list) {
      const day = D.dayKey(ev.start_time);
      if (day !== lastDay) {
        html += `<h2 class="day">${esc(D.dayLabel(ev.start_time))}</h2>`;
        lastDay = day;
      }
      html += cardHtml(ev);
    }
    el.innerHTML = html;
  }

  function ensureMap() {
    if (state.map) return;
    state.map = L.map("map", { zoomControl: true }).setView(JERUSALEM, 14);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(state.map);
    state.markers = L.layerGroup().addTo(state.map);
    state.map.on("click", () => selectOnMap(null));
  }

  function pinIcon(ev, selected) {
    const cls = "pin" + (ev.is_free ? " free" : "") + (selected ? " selected" : "");
    return L.divIcon({
      className: "",
      html: `<div class="${cls}"><span></span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  }

  function selectOnMap(ev) {
    state.selectedId = ev ? String(ev.id) : null;
    const card = $("#map-card");
    state.markers.eachLayer((m) => m.setIcon(pinIcon(m.ev, String(m.ev.id) === state.selectedId)));
    if (!ev) { card.hidden = true; card.innerHTML = ""; return; }
    card.innerHTML = `
      <button class="map-card-close" type="button" aria-label="סגירה">${icon("close")}</button>
      <div class="card-tags">${tagBadges(ev)}</div>
      <div class="card-time" style="margin-top:10px">${icon("clock", "icon-sm")}<span>${esc(D.dayLabel(ev.start_time))} · ${esc(timeText(ev))}</span></div>
      <div class="card-title">${esc(ev.title)}</div>
      ${placeText(ev) ? `<div class="card-place">${icon("pin", "icon-sm")}<span>${esc(placeText(ev))}</span></div>` : ""}
      <div class="map-card-actions">
        <a class="btn btn-primary" href="#/event/${encodeURIComponent(ev.id)}">לפרטים ${icon("chevron")}</a>
      </div>`;
    card.querySelector(".map-card-close").addEventListener("click", () => selectOnMap(null));
    card.hidden = false;
  }

  function renderMap(list) {
    ensureMap();
    state.markers.clearLayers();
    const pts = [];
    const stillThere = list.find((e) => String(e.id) === state.selectedId);
    for (const ev of list) {
      if (typeof ev.lat !== "number" || typeof ev.lng !== "number") continue;
      const m = L.marker([ev.lat, ev.lng], {
        icon: pinIcon(ev, String(ev.id) === state.selectedId),
        title: ev.title,
        keyboard: true,
      });
      m.ev = ev;
      m.on("click", (e) => { L.DomEvent.stopPropagation(e); selectOnMap(ev); });
      m.addTo(state.markers);
      pts.push([ev.lat, ev.lng]);
    }
    selectOnMap(stillThere || null);
    // Leaflet needs a size recalculation after the container is unhidden.
    setTimeout(() => {
      state.map.invalidateSize();
      if (pts.length > 1) state.map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
      else if (pts.length === 1) state.map.setView(pts[0], 15);
    }, 0);
  }

  function renderMain() {
    renderChips();
    const list = visible();
    const notice = $("#notice");
    if (!list.length) {
      const any = upcoming(new Date()).length;
      notice.textContent = any
        ? "אין אירועים בטווח הזה. נסו טווח אחר."
        : "עדיין אין אירועים קרובים. בדקו שוב בקרוב!";
      notice.hidden = false;
    } else {
      notice.hidden = true;
    }
    const isMap = state.view === "map";
    $("#screen-main").classList.toggle("is-map", isMap);
    $("#list").hidden = isMap;
    $("#map-wrap").hidden = !isMap;
    if (isMap) renderMap(list); else renderList(list);
  }

  // ---------- event page ----------
  function renderEvent(id) {
    const el = $("#screen-event");
    const ev = state.events.find((e) => String(e.id) === id);
    if (!ev) {
      el.innerHTML = `<a href="#/" class="back">${icon("back", "icon-sm")} חזרה לאירועים</a>
        <h1 class="page-title">האירוע לא נמצא</h1>
        <p class="lead">ייתכן שהאירוע כבר עבר או הוסר.</p>`;
      return;
    }
    const src = safeUrl(ev.source_url);
    const pay = safeUrl(ev.payment_link);
    const hasPt = typeof ev.lat === "number" && typeof ev.lng === "number";
    const q = hasPt ? `${ev.lat},${ev.lng}` : encodeURIComponent((ev.address || ev.venue_name || "") + " ירושלים");
    const gmaps = `https://www.google.com/maps/search/?api=1&query=${q}`;
    const waze = hasPt
      ? `https://waze.com/ul?ll=${ev.lat},${ev.lng}&navigate=yes`
      : `https://waze.com/ul?q=${q}&navigate=yes`;
    const past = D.endOf(ev) <= new Date();
    const isPrivate = ev.origin === "private";

    el.innerHTML = `
      <a href="#/" class="back">${icon("back", "icon-sm")} חזרה לאירועים</a>
      <div class="event-tags">
        ${tagBadges(ev)}
        ${past ? '<span class="badge badge-past">האירוע הסתיים</span>' : ""}
      </div>
      <h1 class="page-title">${esc(ev.title)}</h1>
      ${isPrivate && ev.description ? `<p class="desc">${esc(ev.description)}</p>` : ""}

      <div class="panel panel-low">
        <dl class="facts">
          <div class="fact">
            <span class="fact-icon">${icon("calendar")}</span>
            <div><dt>מתי</dt>
              <dd><div class="fact-main">${esc(D.dayLabel(ev.start_time))}</div>
                <div class="fact-sub">${esc(timeText(ev))}</div></dd></div>
          </div>
          <div class="fact">
            <span class="fact-icon">${icon("pin")}</span>
            <div><dt>איפה</dt>
              <dd><div class="fact-main">${esc(ev.venue_name || ev.address || "")}</div>
                ${ev.venue_name && ev.address ? `<div class="fact-sub">${esc(ev.address)}</div>` : ""}</dd></div>
          </div>
          <div class="fact">
            <span class="fact-icon${ev.is_free ? " ok" : ""}">${icon("ticket")}</span>
            <div><dt>כניסה</dt>
              <dd><div class="fact-main">${ev.is_free ? "כניסה חופשית" : esc(ev.price_text || "בתשלום")}</div>
                ${ev.is_free ? '<div class="fact-sub">בלי כרטיס מראש</div>' : ""}</dd></div>
          </div>
        </dl>
      </div>

      <div class="panel">
        <div class="panel-head"><span>${icon("map")} מיקום</span></div>
        ${hasPt ? '<div id="event-map" class="event-map"></div>' : ""}
        <div class="btn-row">
          <a class="btn btn-secondary" href="${esc(gmaps)}" target="_blank" rel="noopener">${icon("compass", "icon-sm")} Google Maps</a>
          <a class="btn btn-secondary" href="${esc(waze)}" target="_blank" rel="noopener">${icon("nav", "icon-sm")} Waze</a>
        </div>
      </div>

      <div class="panel panel-low">
        <div class="panel-head"><span>${icon("shield")} מקור המידע</span></div>
        <div class="source-row">
          ${icon("doc")}
          <div>
            <div class="source-title">${isPrivate ? "אירוע שפורסם על ידי משתמש" : "נאסף ממקור ציבורי" + (ev.source_name ? " · " + esc(ev.source_name) : "")}</div>
            <div class="fact-sub">${isPrivate ? "עבר אישור של צוות Gather לפני הפרסום." : "כדאי לוודא את הפרטים במקור לפני שיוצאים."}</div>
          </div>
        </div>
        ${!isPrivate && src ? `<a class="link-row" href="${esc(src)}" target="_blank" rel="noopener"><span>לעמוד המקורי</span>${icon("external", "icon-sm")}</a>` : ""}
      </div>

      <div class="actions">
        ${pay ? `<a class="btn btn-primary btn-lg" href="${esc(pay)}" target="_blank" rel="noopener">${icon("wallet")} לתשלום</a>` : ""}
        ${past ? "" : `<button type="button" class="btn ${pay ? "btn-secondary" : "btn-primary btn-lg"}" id="add-cal">${icon("calAdd")} הוספה ליומן</button>`}
        <button type="button" class="btn btn-secondary" id="share-ev">${icon("share")} שיתוף האירוע</button>
      </div>
    `;
    if (hasPt) {
      const m = L.map("event-map", { zoomControl: false, dragging: false, scrollWheelZoom: false, attributionControl: true })
        .setView([ev.lat, ev.lng], 16);
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(m);
      L.marker([ev.lat, ev.lng], { icon: pinIcon(ev, false) }).addTo(m);
    }
    const cal = $("#add-cal");
    if (cal) cal.addEventListener("click", () => downloadIcs(ev));
    $("#share-ev").addEventListener("click", (e) => shareEvent(ev, e.currentTarget));
    document.title = ev.title + " – Gather";
  }

  // ---------- calendar & share ----------
  function icsDate(d) {
    return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  function icsText(s) {
    return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  function downloadIcs(ev) {
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gather//Jerusalem//HE", "BEGIN:VEVENT",
      `UID:${icsText(ev.id)}@gather`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(ev.start_time)}`,
      `DTEND:${icsDate(D.endOf(ev))}`,
      `SUMMARY:${icsText(ev.title)}`,
      `LOCATION:${icsText([ev.venue_name, ev.address].filter(Boolean).join(", "))}`,
      ev.origin === "private" && ev.description ? `DESCRIPTION:${icsText(ev.description)}` : "",
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gather-event.ics";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  async function shareEvent(ev, btn) {
    const url = location.href;
    try {
      if (navigator.share) { await navigator.share({ title: ev.title, url }); return; }
      await navigator.clipboard.writeText(url);
      const old = btn.innerHTML;
      btn.innerHTML = `${icon("check")} הקישור הועתק`;
      setTimeout(() => { btn.innerHTML = old; }, 2000);
    } catch (e) { /* user cancelled or clipboard blocked */ }
  }

  // ---------- posting form ----------
  function initPostForm() {
    const form = $("#post-form");
    const dl = $("#venue-list");
    dl.innerHTML = state.venues.map((v) => `<option value="${esc(v.name)}">`).join("");

    // Choosing a known venue fills the pin.
    const syncVenueChips = () => {
      const val = form.address.value.trim();
      $$(".quick-chip").forEach((c) => c.classList.toggle("active", c.dataset.name === val));
    };
    form.address.addEventListener("change", () => {
      const v = state.venues.find((x) => x.name === form.address.value.trim());
      if (v) setPick(v.lat, v.lng, true);
      syncVenueChips();
    });
    form.address.addEventListener("input", syncVenueChips);

    // Quick picks: a few known venues as one-tap chips.
    const chips = $("#venue-chips");
    chips.innerHTML = state.venues.slice(0, 6)
      .map((v) => `<button type="button" class="quick-chip" data-name="${esc(v.name)}">${esc(v.name)}</button>`)
      .join("");
    chips.addEventListener("click", (e) => {
      const b = e.target.closest(".quick-chip");
      if (!b) return;
      const v = state.venues.find((x) => x.name === b.dataset.name);
      if (!v) return;
      form.address.value = v.name;
      setPick(v.lat, v.lng, true);
      syncVenueChips();
    });

    // Live character counters.
    $$(".counter").forEach((c) => {
      const input = document.getElementById(c.dataset.for);
      const update = () => { c.textContent = `${input.value.length}/${input.maxLength}`; };
      input.addEventListener("input", update);
      input.form.addEventListener("reset", () => setTimeout(update, 0));
      update();
    });

    form.querySelectorAll('input[name="price"]').forEach((r) =>
      r.addEventListener("change", () => {
        $("#paid-fields").hidden = form.price.value !== "paid";
      })
    );

    const today = new Date();
    form.date.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    form.addEventListener("submit", onSubmit);
  }

  function ensurePickMap() {
    if (state.pickMap) { setTimeout(() => state.pickMap.invalidateSize(), 0); return; }
    state.pickMap = L.map("pick-map").setView(JERUSALEM, 14);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(state.pickMap);
    state.pickMap.on("click", (e) => setPick(e.latlng.lat, e.latlng.lng, false));
    setTimeout(() => state.pickMap.invalidateSize(), 0);
  }

  function setPick(lat, lng, pan) {
    state.picked = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    if (!state.pickMap) return;
    if (state.pickMarker) state.pickMarker.setLatLng([lat, lng]);
    else state.pickMarker = L.marker([lat, lng]).addTo(state.pickMap);
    if (pan) state.pickMap.setView([lat, lng], 16);
  }

  // Local date + time → ISO string with the browser's offset (+02:00 / +03:00 in Israel).
  function toIso(dateStr, timeStr) {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? "+" : "-";
    const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
    const mm = String(Math.abs(off) % 60).padStart(2, "0");
    return `${dateStr}T${timeStr}:00${sign}${hh}:${mm}`;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const err = $("#form-error");
    const f = (n) => (form[n].value || "").trim();
    const problems = [];

    if (!f("title")) problems.push("שם האירוע");
    if (!f("date")) problems.push("תאריך");
    if (!f("start")) problems.push("שעת התחלה");
    if (!f("address")) problems.push("כתובת");
    if (!state.picked) problems.push("סימון על המפה");
    if (!f("description")) problems.push("תיאור");
    if (!f("contact")) problems.push("פרטי קשר");

    let msg = problems.length ? "חסרים: " + problems.join(", ") : "";
    if (!msg && f("date") && f("start")) {
      const start = new Date(toIso(f("date"), f("start")));
      if (start <= new Date()) msg = "מועד האירוע חייב להיות בעתיד.";
      if (!msg && f("end") && f("end") <= f("start")) msg = "שעת הסיום חייבת להיות אחרי שעת ההתחלה.";
    }
    const paid = form.price.value === "paid";
    if (!msg && paid && f("payment_link") && !safeUrl(f("payment_link"))) msg = "קישור התשלום אינו תקין.";

    if (msg) { err.textContent = msg; err.hidden = false; return; }
    err.hidden = true;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await Data.submitPrivate({
        title: f("title"),
        description: f("description"),
        start_time: toIso(f("date"), f("start")),
        end_time: f("end") ? toIso(f("date"), f("end")) : null,
        venue_name: null,
        address: f("address"),
        lat: state.picked.lat,
        lng: state.picked.lng,
        is_free: !paid,
        price_text: paid ? f("price_text") || null : null,
        payment_link: paid && f("payment_link") ? safeUrl(f("payment_link")) : null,
        poster_contact: f("contact"),
      });
      form.hidden = true;
      const done = $("#post-done");
      done.innerHTML = `<div class="done-icon">${icon("check")}</div>
        <h2>תודה! האירוע נשלח</h2>
        <p class="lead">הצוות יעבור עליו, והוא יפורסם לאחר אישור.</p>
        ${Data.useSupabase ? "" : '<p class="muted">(מצב הדגמה: האירוע נשמר רק בדפדפן הזה.)</p>'}
        <a class="btn btn-primary" href="#/">חזרה לאירועים</a>`;
      done.hidden = false;
    } catch (ex) {
      err.textContent = "השליחה נכשלה. נסו שוב בעוד רגע.";
      err.hidden = false;
      console.error(ex);
    } finally {
      btn.disabled = false;
    }
  }

  function resetPostForm() {
    const form = $("#post-form");
    if (!$("#post-done").hidden) {
      form.reset();
      $("#paid-fields").hidden = true;
      state.picked = null;
      if (state.pickMarker) { state.pickMarker.remove(); state.pickMarker = null; }
    }
    form.hidden = false;
    $("#post-done").hidden = true;
  }

  // ---------- router ----------
  const SECTIONS = { "screen-main": "גלו", "screen-event": "פרטי אירוע", "screen-post": "פרסום אירוע" };

  function show(id) {
    $$(".screen").forEach((s) => { s.hidden = s.id !== id; });
    $("#brand-section").textContent = SECTIONS[id] || "";
    $("#topbar-back").hidden = id !== "screen-event";
    $$(".nav-item").forEach((a) => {
      const on = (a.dataset.nav === "post") === (id === "screen-post") && id !== "screen-event";
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
  }

  function route() {
    const h = location.hash || "#/";
    document.title = "Gather – מה קורה בירושלים";
    if (h.startsWith("#/event/")) {
      show("screen-event");
      renderEvent(decodeURIComponent(h.slice(8)));
    } else if (h === "#/post") {
      resetPostForm();
      show("screen-post");
      ensurePickMap();
    } else {
      show("screen-main");
      renderMain();
    }
  }

  // ---------- greeting ----------
  // Hour in Jerusalem, so the greeting matches local time regardless of the device's time zone.
  function jerusalemHour(d) {
    const h = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jerusalem",
    }).format(d);
    return parseInt(h, 10);
  }

  // 05:00–11:59 morning, 12:00–16:59 noon, otherwise evening.
  function greetingFor(hour) {
    if (hour >= 5 && hour < 12) return "בוקר טוב ☀️";
    if (hour >= 12 && hour < 17) return "צהריים טובים 🌤️";
    return "ערב טוב 🌙";
  }

  function updateGreeting() {
    $("#greeting").textContent = greetingFor(jerusalemHour(new Date()));
  }

  // ---------- boot ----------
  async function boot() {
    updateGreeting();
    setInterval(updateGreeting, 60 * 1000);
    $$(".chip").forEach((b) => b.addEventListener("click", () => {
      state.filter = b.dataset.filter;
      renderMain();
    }));
    $$(".toggle-btn").forEach((b) => b.addEventListener("click", () => {
      state.view = b.dataset.view;
      store.set("gather_view", state.view);
      renderMain();
    }));
    $("#free-only").addEventListener("click", () => {
      state.freeOnly = !state.freeOnly;
      renderMain();
    });
    window.addEventListener("hashchange", route);

    $("#list").innerHTML = '<p class="muted loading">טוען אירועים…</p>';
    try {
      const [events, venues] = await Promise.all([Data.loadEvents(), Data.loadVenues()]);
      state.events = events;
      state.venues = venues;
    } catch (ex) {
      console.error(ex);
      $("#list").innerHTML = "";
      const n = $("#notice");
      n.textContent = "לא הצלחנו לטעון את האירועים. רעננו את הדף.";
      n.hidden = false;
    }
    state.filter = defaultFilter();
    initPostForm();
    route();
  }

  boot();
})();
