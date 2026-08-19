/* Shared CMS + analytics store for the portfolio and Admin panel.
   Same-origin localStorage, so edits in Admin.dc.html show on the site immediately
   (same tab via subscribe, other tabs via the storage event). */
(function () {
  var CKEY = "akash.cms.v1";
  var DKEY = "akash.cms.draft.v1";
  var MKEY = "akash.metrics.v1";
  /* The panel edits a DRAFT; the site renders the PUBLISHED copy. Nothing a
     visitor sees changes until Publish copies draft -> published (and server). */
  var draftMode = false;
  /* Opened from the panel with ?preview=1 → render the DRAFT so unpublished edits show. */
  try { if (/[?&]preview=1/.test(location.search)) draftMode = true; } catch (e) {}
  function activeKey() { return draftMode ? DKEY : CKEY; }

  /* Text fields the Admin panel can edit. `key` matches data-cms="" in the site. */
  var FIELDS = [
    { key: "hero.kicker", label: "Kicker line", group: "Hero", type: "text", hint: "The small uppercase line above the headline." },
    { key: "hero.sub", label: "Intro paragraph", group: "Hero", type: "area", hint: "The grey paragraph beside the scroll button." },
    { key: "about.label", label: "Section label", group: "About", type: "text" },
    { key: "about.lead", label: "Opening statement", group: "About", type: "area", hint: "The large first sentence of the About section." },
    { key: "about.p1", label: "Second paragraph", group: "About", type: "area" },
    { key: "about.p2", label: "Third paragraph", group: "About", type: "area" },
    { key: "about.cv", label: "CV link label", group: "About", type: "text" },
    { key: "about.journey", label: "Journey link label", group: "About", type: "text", hint: "Opens the journey timeline." },
    { key: "cap.label", label: "Section label", group: "Capabilities", type: "text" },
    { key: "cap.lead", label: "Section statement", group: "Capabilities", type: "area" },
    { key: "cap.1.title", label: "01 · Title", group: "Capabilities", type: "text" },
    { key: "cap.1.body", label: "01 · Description", group: "Capabilities", type: "area" },
    { key: "cap.2.title", label: "02 · Title", group: "Capabilities", type: "text" },
    { key: "cap.2.body", label: "02 · Description", group: "Capabilities", type: "area" },
    { key: "cap.3.title", label: "03 · Title", group: "Capabilities", type: "text" },
    { key: "cap.3.body", label: "03 · Description", group: "Capabilities", type: "area" },
    { key: "cap.4.title", label: "04 · Title", group: "Capabilities", type: "text" },
    { key: "cap.4.body", label: "04 · Description", group: "Capabilities", type: "area" },
    { key: "cap.5.title", label: "05 · Title", group: "Capabilities", type: "text" },
    { key: "cap.5.body", label: "05 · Description", group: "Capabilities", type: "area" },
    { key: "cap.6.title", label: "06 · Title", group: "Capabilities", type: "text" },
    { key: "cap.6.body", label: "06 · Description", group: "Capabilities", type: "area" },
    { key: "contact.label", label: "Section label", group: "Contact", type: "text" },
    { key: "contact.title", label: "Closing headline", group: "Contact", type: "area" },
    { key: "contact.sub", label: "Closing paragraph", group: "Contact", type: "area" },
    { key: "contact.cta", label: "Email button label", group: "Contact", type: "text" },
    { key: "contact.link1", label: "Link 1 label", group: "Contact", type: "text" },
    { key: "contact.link2", label: "Link 2 label", group: "Contact", type: "text" },
    { key: "contact.link3", label: "Link 3 label", group: "Contact", type: "text" },
    { key: "contact.link4", label: "Link 4 label", group: "Contact", type: "text" },
    { key: "footer.line", label: "Footer line", group: "Footer", type: "text" },
    { key: "footer.year", label: "Year", group: "Footer", type: "text" }
  ];

  /* Home-page sections, in the order they appear on the site. Selected work is
     absent on purpose — the Work tab owns those cards. */
  var HOME_SECTIONS = [
    { group: "Hero", title: "Hero", note: "Portrait, kicker and intro paragraph." },
    { group: "About", title: "About", note: "Statement, paragraphs and the two links." },
    { group: "Capabilities", title: "Capabilities", note: "Section intro and the six numbered items." },
    { group: "Contact", title: "Contact", note: "Closing copy and the link card." },
    { group: "Footer", title: "Footer", note: "Bottom line and year." }
  ];

  var GROUPS = ["live", "cases", "labs"];
  var GROUP_LABEL = { live: "Live Products", cases: "Case Studies", labs: "MVPs" };

  function readJSON(k, fallback) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function writeJSON(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    if (k === DKEY) { try { localStorage.setItem("akash.cms.dirty", "1"); } catch (e) {} }
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  var listeners = [];
  window.addEventListener("storage", function (e) {
    if (e.key === CKEY || e.key === DKEY || e.key === MKEY) listeners.forEach(function (fn) { try { fn(); } catch (err) {} });
  });

  /* ---------- content ---------- */
  /* In draft mode the draft seeds itself from the published copy on first read. */
  function store() {
    return draftMode ? readJSON(DKEY, readJSON(CKEY, {})) : readJSON(CKEY, {});
  }
  function published() { return readJSON(CKEY, {}); }
  function text() { return store().text || {}; }
  function setText(key, value) {
    var s = store();
    s.text = s.text || {};
    if (value === null || value === undefined || value === "") delete s.text[key]; else s.text[key] = value;
    writeJSON(activeKey(), s);
  }
  function resetText() { var s = store(); delete s.text; writeJSON(activeKey(), s); }

  /* Overwrite every [data-cms] node in the document with its override, if any. */
  /* The DC runtime annotates nodes with data-dc- and data-om- attributes; those must
     never leak into editable copy. */
  function clean(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    d.querySelectorAll("*").forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        if (/^data-(dc|om)-/.test(a.name) || a.name === "data-dc-tpl") el.removeAttribute(a.name);
      });
    });
    /* Editors show real characters, not escaped entities; innerHTML accepts both. */
    return d.innerHTML.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
  }

  /* Long-form keys are namespaced per entry ("ws@workspace-copy.7") so a duplicated
     case study can carry its own copy while falling back to the original's. */
  function nsKey(key, ns) {
    if (!ns) return key;
    var m = /^(ws|bu)\.(.+)$/.exec(key);
    return m ? m[1] + "@" + ns + "." + m[2] : key;
  }
  function lookup(key, ns) {
    var t = text();
    var nk = nsKey(key, ns);
    if (Object.prototype.hasOwnProperty.call(t, nk)) return t[nk];
    if (Object.prototype.hasOwnProperty.call(t, key)) return t[key];
    return undefined;
  }
  function applyText(root, ns) {
    (root || document).querySelectorAll("[data-cms]").forEach(function (el) {
      var k = el.getAttribute("data-cms");
      if (!el.hasAttribute("data-cms-orig")) el.setAttribute("data-cms-orig", clean(el.innerHTML));
      var v = lookup(k, ns);
      if (v === undefined) v = el.getAttribute("data-cms-orig");
      if (el.innerHTML !== v) el.innerHTML = v;
    });
  }
  /* The portfolio snapshots its shipped copy so Admin can show and restore it
     without needing the site's DOM present. */
  function captureDefaults() {
    var out = {}, tags = {}, n = 0;
    document.querySelectorAll("[data-cms]").forEach(function (el) {
      var k = el.getAttribute("data-cms");
      out[k] = el.getAttribute("data-cms-orig") || clean(el.innerHTML);
      tags[k] = el.tagName.toLowerCase();
      n++;
    });
    if (!n) return;
    var s = store();
    s.defaults = Object.assign({}, s.defaults || {}, out);
    s.tags = Object.assign({}, s.tags || {}, tags);
    writeJSON(activeKey(), s);
  }
  /* Case-study copy lives inside views that are only mounted when open, so the panel
     harvests every data-cms default straight from the source file instead. */
  function harvestFromSource(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var nodes = doc.querySelectorAll("[data-cms], [data-cms-media]");
      if (!nodes.length) return 0;
      var st = store();
      st.defaults = st.defaults || {};
      st.tags = st.tags || {};
      st.mediaDefaults = st.mediaDefaults || {};
      st.order = [];
      var added = 0;
      nodes.forEach(function (el) {
        var mk = el.getAttribute("data-cms-media");
        if (mk) {
          var t = el.tagName.toLowerCase();
          st.mediaDefaults[mk] = {
            type: t === "video" ? "video" : "image",
            src: el.getAttribute(t === "video" ? "data-vsrc" : "src") || "",
            label: el.getAttribute("placeholder") || el.getAttribute("alt") || ""
          };
          st.order.push({ key: mk, kind: "media" });
          return;
        }
        var k = el.getAttribute("data-cms");
        if (st.defaults[k] === undefined) added++;
        st.defaults[k] = clean(el.innerHTML);
        st.tags[k] = el.tagName.toLowerCase();
        st.order.push({ key: k, kind: "text", tag: el.tagName.toLowerCase() });
      });
      writeJSON(activeKey(), st);
      return added;
    }).catch(function () { return 0; });
  }

  /* ---------- media slots (photo or video, per position) ---------- */
  function media() { return store().media || {}; }
  function mediaDefaults() { return store().mediaDefaults || {}; }
  function mediaFor(key, ns) {
    var m = media();
    var nk = ns ? key.replace(/^(ws|bu)\./, "$1@" + ns + ".") : key;
    return m[nk] || m[key] || null;
  }
  function setMedia(key, ns, value) {
    var st = store();
    st.media = st.media || {};
    var nk = ns ? key.replace(/^(ws|bu)\./, "$1@" + ns + ".") : key;
    if (!value || (!value.src && !value.type)) delete st.media[nk];
    else st.media[nk] = value;
    writeJSON(activeKey(), st);
  }
  /* Swap the authored element for whatever the CMS says should be there. */
  function applyMedia(root, ns) {
    (root || document).querySelectorAll("[data-cms-media]").forEach(function (el) {
      var key = el.getAttribute("data-cms-media");
      var ov = mediaFor(key, ns);
      var def = mediaDefaults()[key] || {};
      var type = (ov && ov.type) || def.type || "image";
      var src = (ov && ov.src) || def.src || "";
      var tag = el.tagName.toLowerCase();
      if (type === "video" && tag !== "video") {
        var v = el.previousElementSibling;
        if (!v || v.getAttribute("data-cms-swap") !== key) {
          v = document.createElement("video");
          v.setAttribute("data-cms-swap", key);
          v.setAttribute("data-autoplay-in-view", "");
          v.muted = true; v.loop = true; v.playsInline = true; v.preload = "none";
          v.style.cssText = "display:block;width:100%;height:100%;object-fit:cover;border-radius:inherit;";
          el.parentNode.insertBefore(v, el);
        }
        if (v.getAttribute("data-vsrc") !== src) { v.setAttribute("data-vsrc", src); v.src = src; }
        el.style.display = "none";
      } else {
        var stale = el.previousElementSibling;
        if (stale && stale.getAttribute && stale.getAttribute("data-cms-swap") === key) stale.remove();
        el.style.display = "";
        if (tag === "video") {
          if (src && el.getAttribute("data-vsrc") !== src) { el.setAttribute("data-vsrc", src); el.src = src; }
        } else if (src && el.getAttribute("src") !== src) {
          el.setAttribute("src", src);
        }
      }
    });
  }

  function tagOf(key) { return (store().tags || {})[key] || "p"; }
  /* The site hands over its built-in case data so the editor can show real values. */
  function setCaseDefaults(obj) {
    var s = store();
    s.caseDefaults = JSON.parse(JSON.stringify(obj));
    writeJSON(activeKey(), s);
  }
  function caseDefaults() { return store().caseDefaults || {}; }
  function defaults() {
    var out = {}, n = 0;
    document.querySelectorAll("[data-cms]").forEach(function (el) {
      out[el.getAttribute("data-cms")] = el.getAttribute("data-cms-orig") || clean(el.innerHTML);
      n++;
    });
    return n ? out : (store().defaults || {});
  }

  /* ---------- case studies / projects ---------- */
  /* Admin owns an array; the site merges it over its built-in defaults. */
  function projects(defaultsMap) {
    var saved = store().projects;
    var base = [];
    if (defaultsMap) for (var id in defaultsMap) base.push(Object.assign({}, defaultsMap[id]));
    if (!saved) return base;
    var byId = {};
    base.forEach(function (p) { byId[p.id] = p; });
    return saved.filter(function (p) { return !p.deleted; }).map(function (p) {
      return Object.assign({}, byId[p.id] || {}, p);
    });
  }
  function saveProjects(list) { var s = store(); s.projects = list; writeJSON(activeKey(), s); }
  function resetProjects() { var s = store(); delete s.projects; writeJSON(activeKey(), s); }

  /* ---------- per-case detail (data-driven "Live Products" format) ---------- */
  function detail(id) { return (store().details || {})[id] || {}; }
  function setDetail(id, path, value) {
    var st = store();
    st.details = st.details || {};
    st.details[id] = st.details[id] || {};
    var parts = String(path).split("."), node = st.details[id];
    for (var i = 0; i < parts.length - 1; i++) {
      var k = parts[i];
      if (typeof node[k] !== "object" || node[k] === null) node[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      node = node[k];
    }
    var leaf = parts[parts.length - 1];
    /* null/"" clears the override so the site's built-in value shows through again. */
    if (value === null || value === undefined || value === "") delete node[leaf];
    else node[leaf] = value;
    writeJSON(activeKey(), st);
  }
  function resetDetail(id) {
    var st = store();
    if (st.details) delete st.details[id];
    writeJSON(activeKey(), st);
  }

  /* Long-form formats (WorkSpace, BUSEit) are markup, so their fields are derived
     from the data-cms keys the site snapshotted. */
  function derivedFields(prefix) {
    var d = defaults(), md = mediaDefaults(), order = store().order || [], out = [];
    order.forEach(function (o) {
      if (o.key.indexOf(prefix + ".") !== 0) return;
      if (o.kind === "media") {
        var m = md[o.key] || {};
        out.push({ key: o.key, kind: "media", tag: m.type || "image", label: m.label || (m.type === "video" ? "Video" : "Image") });
      } else {
        out.push({ key: o.key, kind: "text", tag: o.tag || tagOf(o.key), label: labelFor(d[o.key]) });
      }
    });
    if (out.length) return out;
    /* Pre-order snapshot fallback */
    Object.keys(d).forEach(function (k) {
      if (k.indexOf(prefix + ".") !== 0) return;
      out.push({ key: k, kind: "text", tag: tagOf(k), label: labelFor(d[k]), n: parseInt(k.slice(prefix.length + 1), 10) || 0 });
    });
    return out.sort(function (a, b) { return (a.n || 0) - (b.n || 0); });
  }
  function labelFor(html) {
    var t = String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return t.length > 64 ? t.slice(0, 64) + "…" : (t || "(empty)");
  }

  /* Duplicate an entry: card, structured detail, and namespaced long-form copy. */
  function duplicate(id) {
    var st = store();
    var list = projects();
    var src = list.filter(function (p) { return p.id === id; })[0];
    if (!src) return null;
    var newId = id.replace(/-copy.*$/, "") + "-copy-" + Date.now().toString(36);
    var copy = JSON.parse(JSON.stringify(src));
    copy.id = newId;
    copy.title = src.title + " (copy)";
    copy.source = src.source || id;
    copy.format = src.format || null;
    st.projects = list.concat([copy]);
    st.details = st.details || {};
    if (st.details[id]) st.details[newId] = JSON.parse(JSON.stringify(st.details[id]));
    st.text = st.text || {};
    Object.keys(st.text).forEach(function (k) {
      var m = /^(ws|bu)@([^.]+)\.(.+)$/.exec(k);
      if (m && m[2] === id) st.text[m[1] + "@" + newId + "." + m[3]] = st.text[k];
      else {
        var p = /^(ws|bu)\.(.+)$/.exec(k);
        if (p && (src.source || id) === id) st.text[p[1] + "@" + newId + "." + p[2]] = st.text[k];
      }
    });
    writeJSON(activeKey(), st);
    return newId;
  }

  /* ---------- analytics ---------- */
  function metrics() { return readJSON(MKEY, { events: [], sessions: 0, dwell: {} }); }
  function saveMetrics(m) { writeJSON(MKEY, m); }

  var sessionStarted = false;
  function track(type, label, meta) {
    var e = { t: Date.now(), type: type, label: label || "", meta: meta || null };
    var m = metrics();
    m.events = m.events || [];
    m.events.push(e);
    if (m.events.length > 4000) m.events = m.events.slice(-4000);
    saveMetrics(m);
    queueEvent({ t: e.t, type: type, label: e.label });
  }
  function startSession() {
    if (sessionStarted) return;
    sessionStarted = true;
    var m = metrics();
    m.sessions = (m.sessions || 0) + 1;
    m.events = m.events || [];
    m.events.push({ t: Date.now(), type: "session", label: document.referrer ? hostOf(document.referrer) : "direct" });
    saveMetrics(m);
    queueEvent({ t: Date.now(), type: "session", label: document.referrer ? hostOf(document.referrer) : "direct" });
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "direct"; } }

  /* Dwell time per page ("home" or a case id), accumulated in 5s ticks. */
  var current = "home", lastTick = Date.now(), visible = true, pending = {};
  function flush() {
    var now = Date.now();
    if (visible && now - lastTick > 900) {
      var add = Math.min(now - lastTick, 60000);
      var m = metrics();
      m.dwell = m.dwell || {};
      m.dwell[current] = (m.dwell[current] || 0) + add;
      saveMetrics(m);
      /* Server-side dwell is reported in coarser chunks to keep requests rare. */
      pending[current] = (pending[current] || 0) + add;
      if (pending[current] > 15000) {
        queueEvent({ t: now, type: "dwell", label: current, ms: pending[current] });
        pending[current] = 0;
      }
    }
    lastTick = now;
  }
  function setPage(id) {
    flush();
    if (pending[current]) { queueEvent({ t: Date.now(), type: "dwell", label: current, ms: pending[current] }); pending[current] = 0; }
    current = id || "home";
  }
  function startTracking() {
    startSession();
    setInterval(flush, 5000);
    document.addEventListener("visibilitychange", function () {
      flush(); visible = !document.hidden; lastTick = Date.now();
    });
    window.addEventListener("beforeunload", function () {
      flush();
      Object.keys(pending).forEach(function (k) {
        if (pending[k]) { queueEvent({ t: Date.now(), type: "dwell", label: k, ms: pending[k] }); pending[k] = 0; }
      });
      sendQueue(true);
    });
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      var h = a.getAttribute("href") || "";
      if (h.indexOf("mailto:") === 0) track("cta", "email");
      else if (/^https?:/.test(h)) track("outbound", hostOf(h) + (/drive\.google/.test(h) ? " (CV)" : ""));
    }, true);
  }

  function summary() {
    var m = metrics();
    var ev = m.events || [];
    var byType = {}, byCase = {}, refs = {}, videos = {}, depth = 0, ctas = 0;
    ev.forEach(function (e) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      if (e.type === "case_open") byCase[e.label] = (byCase[e.label] || 0) + 1;
      if (e.type === "session") refs[e.label || "direct"] = (refs[e.label || "direct"] || 0) + 1;
      if (e.type === "video") videos[e.label] = (videos[e.label] || 0) + 1;
      if (e.type === "scroll") depth = Math.max(depth, Number(e.label) || 0);
      if (e.type === "cta") ctas++;
    });
    return {
      sessions: m.sessions || 0,
      events: ev.length,
      caseOpens: byType.case_open || 0,
      ctas: ctas,
      byCase: byCase,
      refs: refs,
      videos: videos,
      depth: depth,
      dwell: m.dwell || {},
      recent: ev.slice(-40).reverse(),
      series: series(ev)
    };
  }
  /* Sessions per day for the last 14 days. */
  function series(ev) {
    var days = [], now = new Date();
    for (var i = 13; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({ key: d.toISOString().slice(0, 10), label: d.getDate(), n: 0 });
    }
    var idx = {}; days.forEach(function (d) { idx[d.key] = d; });
    ev.forEach(function (e) {
      if (e.type !== "session") return;
      var k = new Date(e.t).toISOString().slice(0, 10);
      if (idx[k]) idx[k].n++;
    });
    return days;
  }
  function clearMetrics() { writeJSON(MKEY, { events: [], sessions: 0, dwell: {} }); }

  /* ---------- server sync (GoDaddy / any PHP host) ----------
     With /api present, content.json on the server is the source of truth and the
     panel publishes to it. Without it, everything falls back to this browser. */
  var API = "api/";
  var remote = { available: false, admin: false, loaded: false, saving: false, lastSaved: null, error: null };

  function api(path, opts) {
    return fetch(API + path, Object.assign({ credentials: "same-origin" }, opts || {}))
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); });
  }
  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  /* Pull published content over the local copy, unless there are unsaved edits. */
  function loadRemote() {
    return api("content.php").then(function (r) {
      remote.available = true;
      remote.admin = !!(r.body && r.body.admin);
      remote.loaded = true;
      var c = r.body && r.body.content;
      /* The published copy always mirrors the server; the draft is separate. */
      if (c && typeof c === "object" && Object.keys(c).length) {
        try { localStorage.setItem(CKEY, JSON.stringify(c)); } catch (e) {}
      }
      notify();
      return remote;
    }).catch(function () {
      /* No PHP (GitHub Pages, plain static hosting): read the committed file. */
      return fetch("content.json", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (c) {
          remote.available = false;
          remote.staticFile = !!c;
          remote.loaded = true;
          if (c && typeof c === "object" && Object.keys(c).length) {
            try { localStorage.setItem(CKEY, JSON.stringify(c)); } catch (e) {}
          }
          notify();
          return remote;
        })
        .catch(function () {
          remote.available = false; remote.loaded = true; notify(); return remote;
        });
    });
  }

  function markDirty(on) {
    try { on ? localStorage.setItem("akash.cms.dirty", "1") : localStorage.removeItem("akash.cms.dirty"); } catch (e) {}
  }

  function publish() {
    remote.saving = true; remote.error = null; notify();
    var draft = store();
    return api("save.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft })
    }).then(function (r) {
      remote.saving = false;
      if (r.status === 401) { remote.admin = false; remote.error = "Sign in to publish."; notify(); return false; }
      if (!r.body || !r.body.ok) { remote.error = (r.body && r.body.error) || "Save failed."; notify(); return false; }
      remote.lastSaved = r.body.saved;
      /* The draft becomes the published copy the site renders. */
      try { localStorage.setItem(CKEY, JSON.stringify(draft)); } catch (e) {}
      markDirty(false); notify(); return true;
    }).catch(function () {
      remote.saving = false;
      /* No server (local preview): publishing still promotes the draft locally. */
      if (!remote.available) {
        try { localStorage.setItem(CKEY, JSON.stringify(draft)); } catch (e) {}
        markDirty(false); notify(); return true;
      }
      remote.error = "Server unreachable."; notify(); return false;
    });
  }

  /* Throw away everything edited since the last publish. */
  function discardDraft() {
    try { localStorage.removeItem(DKEY); } catch (e) {}
    markDirty(false); notify();
  }

  /* Roll the live site back to the version published before the last one. */
  function restoreLastPublish() {
    return api("restore.php", { method: "POST" }).then(function (r) {
      if (!r.body || !r.body.ok) { remote.error = (r.body && r.body.error) || "Nothing to restore."; notify(); return false; }
      try { localStorage.removeItem(DKEY); } catch (e) {}
      markDirty(false);
      return loadRemote().then(function () { return true; });
    }).catch(function () { remote.error = "Server unreachable."; notify(); return false; });
  }

  function login(password) {
    return api("auth.php?action=login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password })
    }).then(function (r) {
      remote.available = true;
      remote.admin = !!(r.body && r.body.ok);
      notify();
      return remote.admin;
    }).catch(function () { remote.error = "Server unreachable."; notify(); return false; });
  }
  function logout() {
    return api("auth.php?action=logout").then(function () { remote.admin = false; notify(); });
  }
  /* Local fallback when there is no PHP endpoint: keep the file in the page as a
     data URL so the panel still previews it. Real hosting writes to /uploads. */
  function upload(file) {
    var fd = new FormData();
    fd.append("file", file);
    return api("upload.php", { method: "POST", body: fd }).then(function (r) {
      if (r.body && r.body.ok) return r.body.path;
      return dataUrl(file);
    }).catch(function () { return dataUrl(file); });
  }
  function dataUrl(file) {
    return new Promise(function (res) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { res(null); };
      fr.readAsDataURL(file);
    });
  }
  function remoteStats(clear) {
    return api("stats.php" + (clear ? "?clear=1" : "")).then(function (r) {
      return r.body && r.body.ok ? r.body : null;
    }).catch(function () { return null; });
  }

  /* Events are batched so a busy page doesn't fire a request per interaction. */
  var queue = [], flushTimer = null;
  function queueEvent(e) {
    if (!remote.available) return;
    queue.push(e);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(sendQueue, 2500);
    if (queue.length >= 12) sendQueue();
  }
  function sendQueue(useBeacon) {
    if (!queue.length || !remote.available) return;
    var payload = JSON.stringify({ events: queue.splice(0, queue.length) });
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(API + "track.php", new Blob([payload], { type: "application/json" }));
      return;
    }
    fetch(API + "track.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(function () {});
  }
  window.addEventListener("pagehide", function () { sendQueue(true); });

  loadRemote();

  /* Static hosting has nowhere to POST: publishing means downloading
     content.json and committing it to the repo. */
  function publishFile() {
    var draft = store();
    var blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "content.json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    try { localStorage.setItem(CKEY, JSON.stringify(draft)); } catch (e) {}
    markDirty(false); notify();
    return true;
  }

  window.CMS = {
    CKEY: CKEY, DKEY: DKEY, MKEY: MKEY, FIELDS: FIELDS, HOME_SECTIONS: HOME_SECTIONS, GROUPS: GROUPS, GROUP_LABEL: GROUP_LABEL,
    enterDraftMode: function () { draftMode = true; },
    isDirty: function () { try { return !!localStorage.getItem("akash.cms.dirty"); } catch (e) { return false; } },
    discardDraft: discardDraft, restoreLastPublish: restoreLastPublish, published: published,
    remote: remote, loadRemote: loadRemote, publish: publish, publishFile: publishFile, login: login, logout: logout,
    upload: upload, remoteStats: remoteStats, markDirty: markDirty,
    text: text, setText: setText, resetText: resetText, applyText: applyText,
    defaults: defaults, captureDefaults: captureDefaults,
    nsKey: nsKey, lookup: lookup, duplicate: duplicate,
    media: media, mediaDefaults: mediaDefaults, mediaFor: mediaFor, setMedia: setMedia, applyMedia: applyMedia,
    projects: projects, saveProjects: saveProjects, resetProjects: resetProjects,
    detail: detail, setDetail: setDetail, resetDetail: resetDetail,
    derivedFields: derivedFields, labelFor: labelFor, tagOf: tagOf,
    setCaseDefaults: setCaseDefaults, caseDefaults: caseDefaults,
    harvestFromSource: harvestFromSource,
    track: track, setPage: setPage, startTracking: startTracking,
    summary: summary, metrics: metrics, clearMetrics: clearMetrics,
    exportAll: function () { return JSON.stringify({ content: store(), metrics: metrics() }, null, 2); },
    importAll: function (json) {
      var o = JSON.parse(json);
      if (o.content) writeJSON(CKEY, o.content);
      if (o.metrics) writeJSON(MKEY, o.metrics);
    },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  };
})();
