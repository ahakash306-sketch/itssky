/* Shared CMS + analytics store for the portfolio and Admin panel.
   Same-origin localStorage, so edits in Admin.dc.html show on the site immediately
   (same tab via subscribe, other tabs via the storage event). */
(function () {
  var CKEY = "akash.cms.v1";
  var MKEY = "akash.metrics.v1";

  /* Text fields the Admin panel can edit. `key` matches data-cms="" in the site. */
  var FIELDS = [
    { key: "hero.eyebrow", label: "Hero eyebrow", group: "Hero", type: "text" },
    { key: "hero.title", label: "Hero headline", group: "Hero", type: "rich", hint: "Wrap a word in <span class=\"em\" style=\"color: var(--color-accent)\">…</span> to accent it." },
    { key: "hero.sub", label: "Hero subline", group: "Hero", type: "area" },
    { key: "about.lead", label: "Opening line", group: "About", type: "area" },
    { key: "about.p2", label: "Paragraph 2", group: "About", type: "area" },
    { key: "about.p3", label: "Paragraph 3", group: "About", type: "area" },
    { key: "journey.title", label: "Section title", group: "Journey", type: "rich" },
    { key: "journey.sub", label: "Section subline", group: "Journey", type: "text" },
    { key: "craft.eyebrow", label: "Section eyebrow", group: "Craft", type: "text" },
    { key: "craft.title", label: "Section title", group: "Craft", type: "rich" },
    { key: "connect.title", label: "Section title", group: "Connect", type: "rich" },
    { key: "connect.body", label: "Section body", group: "Connect", type: "area" }
  ];

  var GROUPS = ["live", "cases", "labs"];
  var GROUP_LABEL = { live: "Live Products", cases: "Case Studies", labs: "Experiments & MVPs" };

  function readJSON(k, fallback) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function writeJSON(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    /* Content edits are unpublished until the panel pushes them to the server. */
    if (k === CKEY) { try { localStorage.setItem("akash.cms.dirty", "1"); } catch (e) {} }
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  var listeners = [];
  window.addEventListener("storage", function (e) {
    if (e.key === CKEY || e.key === MKEY) listeners.forEach(function (fn) { try { fn(); } catch (err) {} });
  });

  /* ---------- content ---------- */
  function store() { return readJSON(CKEY, {}); }
  function text() { return store().text || {}; }
  function setText(key, value) {
    var s = store();
    s.text = s.text || {};
    if (value === null || value === undefined || value === "") delete s.text[key]; else s.text[key] = value;
    writeJSON(CKEY, s);
  }
  function resetText() { var s = store(); delete s.text; writeJSON(CKEY, s); }

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
    writeJSON(CKEY, s);
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
      writeJSON(CKEY, st);
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
    writeJSON(CKEY, st);
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
    writeJSON(CKEY, s);
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
  function saveProjects(list) { var s = store(); s.projects = list; writeJSON(CKEY, s); }
  function resetProjects() { var s = store(); delete s.projects; writeJSON(CKEY, s); }

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
    writeJSON(CKEY, st);
  }
  function resetDetail(id) {
    var st = store();
    if (st.details) delete st.details[id];
    writeJSON(CKEY, st);
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
    writeJSON(CKEY, st);
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
      if (c && typeof c === "object" && Object.keys(c).length && !localStorage.getItem("akash.cms.dirty")) {
        try { localStorage.setItem(CKEY, JSON.stringify(c)); } catch (e) {}
      }
      notify();
      return remote;
    }).catch(function () {
      remote.available = false; remote.loaded = true; notify(); return remote;
    });
  }

  function markDirty(on) {
    try { on ? localStorage.setItem("akash.cms.dirty", "1") : localStorage.removeItem("akash.cms.dirty"); } catch (e) {}
  }

  function publish() {
    remote.saving = true; remote.error = null; notify();
    return api("save.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: store() })
    }).then(function (r) {
      remote.saving = false;
      if (r.status === 401) { remote.admin = false; remote.error = "Sign in to publish."; notify(); return false; }
      if (!r.body || !r.body.ok) { remote.error = (r.body && r.body.error) || "Save failed."; notify(); return false; }
      remote.lastSaved = r.body.saved; markDirty(false); notify(); return true;
    }).catch(function () {
      remote.saving = false; remote.error = "Server unreachable."; notify(); return false;
    });
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
  function upload(file) {
    var fd = new FormData();
    fd.append("file", file);
    return api("upload.php", { method: "POST", body: fd }).then(function (r) {
      return r.body && r.body.ok ? r.body.path : null;
    }).catch(function () { return null; });
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

  window.CMS = {
    CKEY: CKEY, MKEY: MKEY, FIELDS: FIELDS, GROUPS: GROUPS, GROUP_LABEL: GROUP_LABEL,
    remote: remote, loadRemote: loadRemote, publish: publish, login: login, logout: logout,
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
