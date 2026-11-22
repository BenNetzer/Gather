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
    view: store.get("gather_view") || "list",
    map: null,
    markers: null,
    pickMap: null,
    pickMarker: null,
    picked: null,
  };

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

  function visible() {
    const now = new Date();
    return upcoming(now).filter((e) => D.inRange(e, state.filter, now));
  }

  function timeText(ev) {
    let t = D.timeLabel(ev.start_time);
    if (ev.end_time) t += "–" + D.timeLabel(ev.end_time);
    return t;
  }

  function priceBadge(ev) {
    return ev.is_free
      ? '<span class="badge badge-free">חינם</span>'
      : `<span class="badge">${esc(ev.price_text || "בתשלום")}</span>`;
  }

  // ---------- default filter ----------
  function defaultFilter() {
    const now = new Date();
    const todayCount = upcoming(now).filter((e) => D.inRange(e, "today", now)).length;
    return todayCount > 10 ? "today" : "weekend";
  }

  // ---------- main screen ----------
  function renderChips() {
    $$(".chip").forEach((b) => {
      const on = b.dataset.filter === state.filter;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on);
    });
    $$(".toggle-btn").forEach((b) => {
      const on = b.dataset.view === state.view;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on);
    });
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
      html += `
        <a class="card" href="#/event/${encodeURIComponent(ev.id)}">
          <div class="card-time">${esc(timeText(ev))}</div>
          <div class="card-body">
            <div class="card-title">${esc(ev.title)}</div>
            <div class="card-place">${esc(ev.venue_name || ev.address || "")}</div>
            <div class="card-tags">
              ${priceBadge(ev)}
              ${ev.origin === "private" ? '<span class="badge badge-private">אירוע פרטי</span>' : ""}
              ${ev.sample ? '<span class="badge badge-sample">דוגמה</span>' : ""}
            </div>
          </div>
        </a>`;
    }
    el.innerHTML = html;
  }

  function ensureMap() {
    if (state.map) return;
    state.map = L.map("map", { zoomControl: true }).setView(JERUSALEM, 14);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(state.map);
    state.markers = L.layerGroup().addTo(state.map);
  }

  function renderMap(list) {
    ensureMap();
    state.markers.clearLayers();
    const pts = [];
    for (const ev of list) {
      if (typeof ev.lat !== "number" || typeof ev.lng !== "number") continue;
      const m = L.marker([ev.lat, ev.lng]);
      m.bindPopup(
        `<a class="pop" href="#/event/${encodeURIComponent(ev.id)}">
           <strong>${esc(ev.title)}</strong><br>
           ${esc(D.dayLabel(ev.start_time))} · ${esc(timeText(ev))}<br>
           <span>${esc(ev.venue_name || ev.address || "")}</span>
         </a>`
      );
      m.addTo(state.markers);
      pts.push([ev.lat, ev.lng]);
    }
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
    $("#list").hidden = isMap;
    $("#map").hidden = !isMap;
    if (isMap) renderMap(list); else renderList(list);
  }

  // ---------- event page ----------
  function renderEvent(id) {
    const el = $("#screen-event");
    const ev = state.events.find((e) => String(e.id) === id);
    if (!ev) {
      el.innerHTML = `<a href="#/" class="back">→ חזרה</a><h1>האירוע לא נמצא</h1>
        <p class="muted">ייתכן שהאירוע כבר עבר או הוסר.</p>`;
      return;
    }
    const src = safeUrl(ev.source_url);
    const pay = safeUrl(ev.payment_link);
    const hasPt = typeof ev.lat === "number" && typeof ev.lng === "number";
    const nav = hasPt
      ? `https://www.google.com/maps/search/?api=1&query=${ev.lat},${ev.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.address || ev.venue_name || "") + " ירושלים")}`;
    const past = D.endOf(ev) <= new Date();

    el.innerHTML = `
      <a href="#/" class="back">→ חזרה</a>
      ${ev.sample ? '<span class="badge badge-sample">דוגמה</span>' : ""}
      <h1>${esc(ev.title)}</h1>
      ${past ? '<p class="notice">האירוע הזה כבר הסתיים.</p>' : ""}
      <dl class="facts">
        <dt>מתי</dt><dd>${esc(D.dayLabel(ev.start_time))} · ${esc(timeText(ev))}</dd>
        <dt>איפה</dt><dd>${esc(ev.venue_name || "")}${ev.venue_name && ev.address ? "<br>" : ""}<span class="muted">${esc(ev.address || "")}</span></dd>
        <dt>מחיר</dt><dd>${ev.is_free ? "חינם" : esc(ev.price_text || "בתשלום")}</dd>
      </dl>
      ${ev.origin === "private" && ev.description ? `<p class="desc">${esc(ev.description)}</p>` : ""}
      <div class="actions">
        ${ev.origin !== "private" && src ? `<a class="btn btn-primary" href="${esc(src)}" target="_blank" rel="noopener">למקור${ev.source_name ? " · " + esc(ev.source_name) : ""} ↗</a>` : ""}
        ${pay ? `<a class="btn btn-primary" href="${esc(pay)}" target="_blank" rel="noopener">לתשלום ↗</a>` : ""}
        <a class="btn btn-ghost" href="${esc(nav)}" target="_blank" rel="noopener">פתח בניווט ↗</a>
      </div>
      ${hasPt ? '<div id="event-map" class="event-map"></div>' : ""}
    `;
    if (hasPt) {
      const m = L.map("event-map", { zoomControl: false, dragging: false, scrollWheelZoom: false })
        .setView([ev.lat, ev.lng], 16);
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(m);
      L.marker([ev.lat, ev.lng]).addTo(m);
    }
    document.title = ev.title + " – Gather";
  }

  // ---------- posting form ----------
  function initPostForm() {
    const form = $("#post-form");
    const dl = $("#venue-list");
    dl.innerHTML = state.venues.map((v) => `<option value="${esc(v.name)}">`).join("");

    // Choosing a known venue fills the pin.
    form.address.addEventListener("change", () => {
      const v = state.venues.find((x) => x.name === form.address.value.trim());
      if (v) setPick(v.lat, v.lng, true);
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
      done.innerHTML = `<h2>תודה! 🎉</h2>
        <p>האירוע נשלח לצוות ויפורסם לאחר אישור.</p>
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

  // ---------- contact form ----------
  async function onContactSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const err = $("#contact-error");
    const f = (n) => (form[n].value || "").trim();

    if (f("website")) return; // honeypot filled → bot, silently drop

    const problems = [];
    if (!f("name")) problems.push("שם");
    if (!f("contact")) problems.push("אימייל או טלפון");
    if (!f("message")) problems.push("הודעה");
    let msg = problems.length ? "חסרים: " + problems.join(", ") : "";
    const c = f("contact");
    if (!msg && !/^\S+@\S+\.\S+$/.test(c) && !/^[+\d][\d\s-]{7,}$/.test(c)) {
      msg = "נא להזין אימייל או מספר טלפון תקינים.";
    }
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    err.hidden = true;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await Data.submitContact({
        name: f("name"), contact: c, topic: form.topic.value, message: f("message"),
      });
      form.hidden = true;
      const done = $("#contact-done");
      done.innerHTML = `<h2>תודה, ${esc(f("name"))}!</h2>
        <p>ההודעה התקבלה. נחזור אליכם בהקדם.</p>
        ${Data.useSupabase ? "" : '<p class="muted">(מצב הדגמה: ההודעה נשמרה רק בדפדפן הזה.)</p>'}
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

  function resetContactForm() {
    const form = $("#contact-form");
    if (!$("#contact-done").hidden) form.reset();
    form.hidden = false;
    $("#contact-done").hidden = true;
  }

  // ---------- router ----------
  function show(id) {
    $$(".screen").forEach((s) => { s.hidden = s.id !== id; });
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
    } else if (h === "#/contact") {
      resetContactForm();
      show("screen-contact");
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
    $("#contact-form").addEventListener("submit", onContactSubmit);
    route();
  }

  boot();
})();
