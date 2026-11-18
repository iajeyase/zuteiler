/* Zuteiler - frontend (vanilla JS, no build step) */
(() => {
  "use strict";

  // ------------------------------------------------------------ helpers

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const initials = (name) =>
    name.split(" ").slice(0, 2).map((w) => Array.from(w)[0] || "").join("").toUpperCase();

  // Storage is optional: every access is guarded (private mode, blocked storage, ...).
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    },
    del(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };

  const ICON = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    lock: '<svg class="lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="11" width="15" height="10" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  };

  // ------------------------------------------------------------ i18n

  const I18N = {
    en: {
      hero_1: "Who gives",
      hero_2: "to whom.",
      hero_lede: "Gather the group, draw the ring and learn exactly one name. Nobody else sees yours.",
      w1: "Anonymous.",
      w2: "Random.",
      w3: "Fair.",
      core: "Ring",
      tab_create: "Create room",
      tab_join: "Join room",
      create_title: "Start a room",
      create_sub: "You become the host. Share the code and draw once everyone is in.",
      join_title: "Join a room",
      join_sub: "Enter the code from your host, then pick a name and a password.",
      label_code: "Room code",
      label_name: "Your name",
      label_password: "Password",
      hint_pw: "At least 4 characters. Name and password are your login, so keep them safe.",
      pw_short: "At least 4 characters needed",
      pw_ok: "Looks good",
      show_pw: "Show password",
      hide_pw: "Hide password",
      btn_create: "Create room",
      btn_join: "Join room",
      invalid_code: "Enter the 6-character code.",
      lobby_label: "Room code",
      btn_copy: "Copy invite",
      copied: "Invite link copied",
      lobby_title: "Lobby",
      need_more: "{n} more to start",
      ready: "Everyone is here",
      ready_sub: "Draw whenever you like. Each person gets exactly one name.",
      min_note: "At least {min} people are needed.",
      btn_draw: "Spin the ring",
      btn_drawing: "Spinning",
      waiting_host: "Waiting for the host to draw",
      people: "People",
      host_tag: "Host",
      drawn_label: "Drawn",
      your_gift: "Your gift",
      reveal_front: "Tap to reveal",
      reveal_sub: "Only you can see this",
      reveal_kicker: "You give a gift to",
      reveal_again: "Tap to hide",
      reveal_hint: "Keep it a secret. Nobody else can see who you picked.",
      not_in_draw: "You are not part of this draw.",
      btn_reset: "Reset draw",
      confirm_reset: "Reset the draw? Every pick is cleared and the host can draw again.",
      btn_leave: "Leave room on this device",
      confirm_leave: "Leave this room on this device? You can sign back in with your name and password.",
      toast_created: "Room {code} created",
      toast_welcome: "Welcome, {name}",
      toast_drawn: "The ring is drawn",
      toast_reset: "Draw reset",
      center_open: "joined",
      center_drawn: "in the ring",
      loading: "Loading",
      aria_theme: "Switch to light or dark",
      aria_lang: "Switch language",
      err_nameRequired: "Please enter a name.",
      err_passwordShort: "The password needs at least 4 characters.",
      err_roomNotFound: "No room found with this code.",
      err_wrongPassword: "That password does not match this name.",
      err_locked: "Too many wrong attempts. Try again in a few minutes.",
      err_alreadyDrawn: "This room has already been drawn. New people can no longer join.",
      err_roomFull: "This room is full.",
      err_nameTaken: "That name was just taken. Try another one.",
      err_notEnough: "At least 3 people are needed for a draw.",
      err_hostOnly: "Only the host can do that.",
      err_unauthorized: "Your session has expired. Please sign in again.",
      err_serverError: "Something went wrong. Try again.",
      err_network: "No connection. Check your internet and try again.",
      online: "Online",
      offline: "Offline",
    },
    de: {
      hero_1: "Wer schenkt",
      hero_2: "wem?",
      hero_lede: "Versammelt die Gruppe, zieht den Kreis und erfahrt genau einen Namen. Keiner sonst sieht deinen.",
      w1: "Anonym.",
      w2: "Zufällig.",
      w3: "Fair.",
      core: "Kreis",
      tab_create: "Raum erstellen",
      tab_join: "Raum beitreten",
      create_title: "Raum starten",
      create_sub: "Du wirst Host. Teile den Code und zieh, sobald alle da sind.",
      join_title: "Raum beitreten",
      join_sub: "Gib den Code deines Hosts ein, dann wähle Namen und Passwort.",
      label_code: "Raum-Code",
      label_name: "Dein Name",
      label_password: "Passwort",
      hint_pw: "Mindestens 4 Zeichen. Name und Passwort sind dein Login, also gut aufbewahren.",
      pw_short: "Mindestens 4 Zeichen nötig",
      pw_ok: "Passt",
      show_pw: "Passwort anzeigen",
      hide_pw: "Passwort verbergen",
      btn_create: "Raum erstellen",
      btn_join: "Beitreten",
      invalid_code: "Gib den 6-stelligen Code ein.",
      lobby_label: "Raum-Code",
      btn_copy: "Einladung kopieren",
      copied: "Einladungslink kopiert",
      lobby_title: "Lobby",
      need_more: "Noch {n} bis zum Start",
      ready: "Alle sind da",
      ready_sub: "Zieh, wann du willst. Jede Person bekommt genau einen Namen.",
      min_note: "Mindestens {min} Personen werden benötigt.",
      btn_draw: "Ring drehen",
      btn_drawing: "Dreht sich",
      waiting_host: "Warten, bis der Host zieht",
      people: "Personen",
      host_tag: "Host",
      drawn_label: "Gezogen",
      your_gift: "Dein Geschenk",
      reveal_front: "Zum Aufdecken tippen",
      reveal_sub: "Nur du siehst das",
      reveal_kicker: "Du beschenkst",
      reveal_again: "Zum Verbergen tippen",
      reveal_hint: "Bleib diskret. Niemand sonst sieht, wen du gezogen hast.",
      not_in_draw: "Du bist nicht Teil dieser Ziehung.",
      btn_reset: "Ziehung zurücksetzen",
      confirm_reset: "Ziehung zurücksetzen? Alle Zuteilungen werden gelöscht und der Host kann neu ziehen.",
      btn_leave: "Raum auf diesem Gerät verlassen",
      confirm_leave: "Raum auf diesem Gerät verlassen? Mit Name und Passwort kannst du dich wieder anmelden.",
      toast_created: "Raum {code} erstellt",
      toast_welcome: "Willkommen, {name}",
      toast_drawn: "Der Kreis ist gezogen",
      toast_reset: "Ziehung zurückgesetzt",
      center_open: "dabei",
      center_drawn: "im Kreis",
      loading: "Lädt",
      aria_theme: "Zu hell oder dunkel wechseln",
      aria_lang: "Sprache wechseln",
      err_nameRequired: "Bitte gib einen Namen ein.",
      err_passwordShort: "Das Passwort braucht mindestens 4 Zeichen.",
      err_roomNotFound: "Kein Raum mit diesem Code gefunden.",
      err_wrongPassword: "Das Passwort passt nicht zu diesem Namen.",
      err_locked: "Zu viele Fehlversuche. Versuch es in ein paar Minuten nochmal.",
      err_alreadyDrawn: "Dieser Raum wurde schon gezogen. Es kann niemand mehr beitreten.",
      err_roomFull: "Dieser Raum ist voll.",
      err_nameTaken: "Dieser Name wurde gerade vergeben. Probier einen anderen.",
      err_notEnough: "Für eine Ziehung werden mindestens 3 Personen benötigt.",
      err_hostOnly: "Das kann nur der Host.",
      err_unauthorized: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
      err_serverError: "Etwas ist schiefgelaufen. Versuch es nochmal.",
      err_network: "Keine Verbindung. Prüfe dein Internet und versuch es erneut.",
      online: "Online",
      offline: "Offline",
    },
  };

  const t = (key, vars = {}) => {
    const dict = I18N[state.lang] || I18N.en;
    let text = dict[key] ?? I18N.en[key] ?? key;
    for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
    return text;
  };

  const errorMessage = (err) => {
    const key = `err_${err?.code}`;
    return I18N[state.lang][key] ? t(key) : t("err_serverError");
  };

  // ------------------------------------------------------------ state

  const params = new URLSearchParams(location.search);
  const inviteCode = (params.get("room") || "").toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);

  const state = {
    lang: store.get("zuteiler.lang", "en") === "de" ? "de" : "en",
    theme: store.get("zuteiler.theme", "dark") === "light" ? "light" : "dark",
    session: store.get("zuteiler.session", null), // { code, token, name, isHost }
    room: null,        // last state from the server
    tab: inviteCode ? "join" : "create",
    form: { name: "", password: "", code: inviteCode },
    showPw: false,
    revealed: false,
    seen: new Set(),   // people already shown on the ring (no re-animation)
    busy: false,
    sideSig: "",
    pollId: null,
    refreshing: false,
    serverOffset: 0,   // client clock minus server clock, updated on every sync
    spinSeen: null,    // which draw's spin was already started
    landedFor: null,   // which draw already flashed the landing orb
  };

  const viewIsRoom = () =>
    !!state.session && (!inviteCode || state.session.code === inviteCode);

  function saveSession(session) {
    state.session = session;
    store.set("zuteiler.session", session);
  }

  function forgetSession() {
    state.session = null;
    state.room = null;
    state.seen = new Set();
    state.revealed = false;
    state.sideSig = "";
    state.spinSeen = null;
    state.landedFor = null;
    store.del("zuteiler.session");
  }

  // ------------------------------------------------------------ API

  class ApiError extends Error {
    constructor(code, status) {
      super(code);
      this.code = code;
      this.status = status;
    }
  }

  async function api(path, { method = "GET", body, auth = true } = {}) {
    const headers = {};
    if (body) headers["content-type"] = "application/json";
    if (auth && state.session?.token) headers.authorization = `Bearer ${state.session.token}`;

    let res;
    try {
      res = await fetch(`/api${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError("network", 0);
    }
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* empty body */
    }
    if (!res.ok) throw new ApiError(data.error || "serverError", res.status);
    return data;
  }

  // ------------------------------------------------------------ chrome (header, theme, lang)

  function applyChrome() {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.lang = state.lang;
    const themeBtn = $("#themeBtn");
    themeBtn.innerHTML = `<span class="swap">${state.theme === "dark" ? ICON.sun : ICON.moon}</span>`;
    themeBtn.setAttribute("aria-label", t("aria_theme"));
    const langBtn = $("#langBtn");
    langBtn.textContent = state.lang === "en" ? "DE" : "EN";
    langBtn.setAttribute("aria-label", t("aria_lang"));
  }

  function toast(message, isError = false) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.toggle("error", isError);
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
  }

  // ------------------------------------------------------------ home (create / join)

  function renderHome() {
    stopPolling();
    const planets = [0, 72, 144, 216, 288]
      .map((a, i) => `<div class="planet" style="--a:${a}deg"><i style="--d:${(i * -0.7).toFixed(1)}s"></i></div>`)
      .join("");
    const words = [t("w1"), t("w2"), t("w3")].map((w) => `<span>${esc(w)}</span>`).join("");

    $("#app").innerHTML = `
      <section class="hero view">
        <div class="hero-copy">
          <h1>${esc(t("hero_1"))}<br><em>${esc(t("hero_2"))}</em></h1>
          <p>${esc(t("hero_lede"))}</p>
          <p class="words-line"><span class="words">${words}</span></p>
          <div class="orbit-deco" aria-hidden="true">
            <div class="ring"></div>
            <div class="ring"></div>
            ${planets}
            <div class="core">${esc(t("core"))}</div>
          </div>
        </div>
        <div class="card home-card">
          <div class="tabs" role="tablist" data-active="${state.tab}">
            <button class="tab" type="button" role="tab" data-action="tab" data-tab="create" aria-selected="${state.tab === "create"}">${esc(t("tab_create"))}</button>
            <button class="tab" type="button" role="tab" data-action="tab" data-tab="join" aria-selected="${state.tab === "join"}">${esc(t("tab_join"))}</button>
          </div>
          <div id="authArea"></div>
        </div>
      </section>`;
    paintForm();
  }

  function syncForm() {
    const name = $("#name");
    const pw = $("#pw");
    const code = $("#code");
    if (name) state.form.name = name.value;
    if (pw) state.form.password = pw.value;
    if (code) state.form.code = code.value;
  }

  function paintForm() {
    const area = $("#authArea");
    if (!area) return;
    const isJoin = state.tab === "join";

    document.querySelectorAll(".tabs .tab").forEach((tab) => {
      tab.setAttribute("aria-selected", String(tab.dataset.tab === state.tab));
    });
    $(".tabs").dataset.active = state.tab;

    area.innerHTML = `
      <h2 class="form-title">${esc(t(isJoin ? "join_title" : "create_title"))}</h2>
      <p class="form-sub">${esc(t(isJoin ? "join_sub" : "create_sub"))}</p>
      <form id="authForm" novalidate>
        ${isJoin ? `
        <div class="field">
          <label for="code">${esc(t("label_code"))}</label>
          <input id="code" class="code-input" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(state.form.code)}">
        </div>` : ""}
        <div class="field">
          <label for="name">${esc(t("label_name"))}</label>
          <input id="name" maxlength="20" autocomplete="nickname" value="${esc(state.form.name)}">
        </div>
        <div class="field">
          <label for="pw">${esc(t("label_password"))}</label>
          <div class="pw-wrap">
            <input id="pw" type="${state.showPw ? "text" : "password"}" autocomplete="${isJoin ? "current-password" : "new-password"}" value="${esc(state.form.password)}">
            <button type="button" class="eye" data-action="eye" aria-label="${esc(t(state.showPw ? "hide_pw" : "show_pw"))}">${ICON.eye}</button>
          </div>
          <div class="strength s0" id="strength"><span></span><span></span><span></span><span></span></div>
          <p class="hint" id="pwHint">${esc(t("hint_pw"))}</p>
        </div>
        <p class="error-text" id="formError" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit" id="submitBtn" ${state.busy ? "disabled" : ""}>
          <span>${esc(t(isJoin ? "btn_join" : "btn_create"))}</span>${ICON.arrow}
        </button>
      </form>`;
    updateStrength();
  }

  function updateStrength() {
    const pw = $("#pw");
    if (!pw) return;
    const len = pw.value.length;
    const level = len >= 8 ? 4 : len >= 6 ? 3 : len >= 4 ? 2 : len >= 1 ? 1 : 0;
    $("#strength").className = `strength s${level}`;
    const hint = $("#pwHint");
    if (hint) {
      hint.textContent = len === 0 ? t("hint_pw") : len < 4 ? t("pw_short") : t("pw_ok");
      hint.style.color = len > 0 && len < 4 ? "var(--danger)" : "";
    }
  }

  function showFormError(message, field) {
    const box = $("#formError");
    if (box) {
      box.textContent = message;
      box.hidden = false;
    }
    const input = field && $(`#${field}`);
    if (input) {
      input.classList.remove("is-invalid");
      void input.offsetWidth; // restart the shake animation
      input.classList.add("is-invalid");
      input.focus();
    }
  }

  function clearFormError() {
    const box = $("#formError");
    if (box) box.hidden = true;
    document.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  }

  function setBusy(value) {
    state.busy = value;
    const submit = $("#submitBtn");
    if (submit) submit.disabled = value;
    if (state.room && $("#side")) paintSide(state.room);
  }

  async function onAuthSubmit(form) {
    if (state.busy) return;
    clearFormError();
    const name = form.elements.name ? form.elements.name.value.trim().replace(/\s+/g, " ") : "";
    const password = form.elements.pw ? form.elements.pw.value : "";
    const code = form.elements.code ? form.elements.code.value.toUpperCase().trim() : "";
    const isJoin = state.tab === "join";

    if (!name) return showFormError(t("err_nameRequired"), "name");
    if (password.length < 4) return showFormError(t("err_passwordShort"), "pw");
    if (isJoin && !/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return showFormError(t("invalid_code"), "code");

    setBusy(true);
    try {
      const data = isJoin
        ? await api(`/rooms/${code}/join`, { method: "POST", body: { name, password }, auth: false })
        : await api("/rooms", { method: "POST", body: { name, password }, auth: false });

      saveSession({ code: data.code, token: data.token, name: data.name, isHost: data.isHost });
      state.form = { name: "", password: "", code: "" };
      state.room = null;
      state.seen = new Set();
      state.revealed = false;
      state.sideSig = "";
      history.replaceState(null, "", location.pathname);
      toast(isJoin ? t("toast_welcome", { name: data.name }) : t("toast_created", { code: data.code }));
      setBusy(false);
      render();
    } catch (err) {
      setBusy(false);
      showFormError(errorMessage(err), err.code === "wrongPassword" ? "pw" : null);
    }
  }

  // ------------------------------------------------------------ room (lobby + ring + reveal)

  function renderRoom() {
    startPolling();
    if (!state.room) {
      $("#app").innerHTML = `
        <section class="view loading-state">
          <div class="card"><div class="waiting-note">${esc(t("loading"))}<span class="dots"></span></div></div>
        </section>`;
      refresh();
      return;
    }
    mountRoom();
    paintRoom();
  }

  function mountRoom() {
    $("#app").innerHTML = `
      <section class="lobby view">
        <div class="card room-card">
          <div class="room-head">
            <div>
              <div class="room-label">${esc(t("lobby_label"))}</div>
              <div class="room-code">${esc(state.session.code)}</div>
            </div>
            <button class="copy-btn" type="button" data-action="copy">${ICON.copy}<span>${esc(t("btn_copy"))}</span></button>
          </div>
        </div>
        <div class="card stage-card"><div class="stage" id="stage"></div></div>
        <div class="card side" id="side"></div>
      </section>`;
    state.sideSig = "";
  }

  function paintRoom() {
    if (!$(".lobby")) mountRoom();
    if (!state.room) return;
    paintStage(state.room);
    paintSide(state.room);
  }

  // The spin is the same timeline for everybody (server timestamp), but each person's
  // wheel stops on their own target. Nobody else's pair is ever sent to the browser.
  const SPIN_MS = 4500;
  const SPIN_TURNS = 4;

  function serverNow() {
    return Date.now() - (state.serverOffset || 0);
  }

  function paintStage(room) {
    const stage = $("#stage");
    if (!stage) return;

    const people = room.participants;
    const n = people.length;
    const drawn = room.status === "drawn";
    const angleOf = (i) => (i * 360) / Math.max(n, 1);

    const tIdx = drawn && room.target
      ? people.findIndex((p) => p.name.toLowerCase() === room.target.toLowerCase())
      : -1;
    const spinning = drawn && !!room.drawnAt && serverNow() - room.drawnAt < SPIN_MS;

    const orbs = people
      .map((p, i) => {
        const key = p.name.toLowerCase();
        const isNew = !state.seen.has(key);
        state.seen.add(key);
        const isTarget = drawn && i === tIdx;
        const classes = [
          "orb",
          p.isHost && "is-host",
          p.isMe && "is-me",
          isTarget && !spinning && "is-target",
          !isNew && "seen",
        ].filter(Boolean).join(" ");
        return `
          <div class="${classes}" style="--a:${angleOf(i)}deg" title="${esc(p.name)}"${isTarget ? " data-target" : ""}>
            <div class="dot">${esc(initials(p.name))}<span class="presence ${p.online ? "on" : "off"}" title="${esc(t(p.online ? "online" : "offline"))}" aria-label="${esc(t(p.online ? "online" : "offline"))}"></span></div>
            <span class="label">${esc(p.name)}</span>
          </div>`;
      })
      .join("");

    const centerText = esc(t(drawn ? "center_drawn" : "center_open"));
    stage.innerHTML = `
      <div class="stage-ring"></div>
      <div class="pointer" aria-hidden="true"></div>
      <div class="stage-center"><div><strong>${n}</strong>${centerText}</div></div>
      <div class="wheel">${orbs}</div>`;

    if (drawn) playSpin(stage.querySelector(".wheel"), room.drawnAt, tIdx, n);
  }

  function playSpin(wheel, drawnAt, tIdx, n) {
    if (!wheel || !drawnAt || tIdx < 0) return;
    const elapsed = Math.max(0, serverNow() - drawnAt);
    // Turn the ring so that the target sits under the pointer at the top.
    const landAngle = (tIdx * 360) / Math.max(n, 1);
    const finalDeg = SPIN_TURNS * 360 - landAngle;
    wheel.style.transform = `rotate(${finalDeg}deg)`;
    if (elapsed >= SPIN_MS) return;

    const anim = wheel.animate(
      [{ transform: "rotate(0deg)" }, { transform: `rotate(${finalDeg}deg)` }],
      { duration: SPIN_MS, easing: "cubic-bezier(0.15, 0.6, 0.1, 1)", fill: "none" }
    );
    anim.currentTime = elapsed;

    if (drawnAt !== state.landedFor) {
      state.landedFor = drawnAt;
      setTimeout(flashLanding, SPIN_MS - elapsed);
    }
  }

  // The moment the ring stops: the landing person's orb flashes.
  function flashLanding() {
    const dot = document.querySelector(".orb[data-target] .dot");
    if (!dot) return;
    dot.animate(
      [
        { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(255, 122, 182, 0.9)" },
        { transform: "scale(1.5)", boxShadow: "0 0 0 28px rgba(255, 122, 182, 0)", offset: 0.5 },
        { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(255, 122, 182, 0)" },
      ],
      { duration: 1100, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.2)" }
    );
  }

  function peopleStrip(room) {
    return `<ul class="people-strip">${room.participants
      .map(
        (p, i) => `
          <li class="${p.isMe ? "is-me" : ""}" style="animation-delay:${i * 60}ms">
            <b>${esc(initials(p.name))}</b>${esc(p.name)}
            <i class="presence-chip ${p.online ? "on" : "off"}" title="${esc(t(p.online ? "online" : "offline"))}" aria-label="${esc(t(p.online ? "online" : "offline"))}"></i>
            ${p.isHost ? `<span class="tag">${esc(t("host_tag"))}</span>` : ""}
          </li>`
      )
      .join("")}</ul>`;
  }

  function paintSide(room) {
    const side = $("#side");
    if (!side) return;

    const sig = JSON.stringify([
      state.lang,
      room.status,
      room.me,
      room.target,
      room.min,
      state.busy,
      room.participants.map((p) => [p.name, p.isHost, p.isMe, p.online]),
    ]);
    if (sig === state.sideSig) return;
    state.sideSig = sig;

    const n = room.participants.length;
    const min = room.min || 3;
    const isHost = !!room.me?.isHost;
    const drawn = room.status === "drawn";
    const ready = n >= min;
    const pct = Math.min(100, Math.round((n / min) * 100));

    if (!drawn) {
      side.innerHTML = `
        <div>
          <p class="section-title">${esc(t("lobby_title"))}</p>
          <h2 class="side-title">${esc(ready ? t("ready") : t("need_more", { n: min - n }))}</h2>
          <p class="side-sub">${esc(ready ? t("ready_sub") : t("min_note", { min }))}</p>
        </div>
        <div class="progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
        ${isHost
          ? `<button class="btn btn-primary ${ready ? "is-ready" : ""}" type="button" data-action="draw" ${ready && !state.busy ? "" : "disabled"}>${ICON.shuffle}<span>${esc(t(state.busy ? "btn_drawing" : "btn_draw"))}</span></button>`
          : `<div class="waiting-note">${esc(t("waiting_host"))}<span class="dots"></span></div>`}
        <div>
          <p class="section-title people-title">${esc(t("people"))}<span class="legend"><i class="presence-chip on"></i>${esc(t("online"))} <i class="presence-chip off"></i>${esc(t("offline"))}</span></p>
          ${peopleStrip(room)}
        </div>
        <button class="linkish" type="button" data-action="leave">${esc(t("btn_leave"))}</button>`;
      return;
    }

    side.innerHTML = `
      <div>
        <p class="section-title">${esc(t("drawn_label"))}</p>
      </div>
      <div>
        <p class="section-title people-title">${esc(t("people"))}<span class="legend"><i class="presence-chip on"></i>${esc(t("online"))} <i class="presence-chip off"></i>${esc(t("offline"))}</span></p>
        ${peopleStrip(room)}
      </div>
      ${isHost ? `<button class="btn btn-ghost" type="button" data-action="reset" ${state.busy ? "disabled" : ""}>${esc(t("btn_reset"))}</button>` : ""}
      <button class="linkish" type="button" data-action="leave">${esc(t("btn_leave"))}</button>`;
  }

  // ------------------------------------------------------------ draw / reset / leave / copy

  async function onDraw() {
    if (state.busy || !state.room || !state.session) return;
    setBusy(true);
    try {
      // The spin starts for everybody from the server timestamp, see playSpin().
      await api(`/rooms/${state.session.code}/draw`, { method: "POST" });
      await refresh();
    } catch (err) {
      toast(errorMessage(err), true);
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    if (state.busy || !state.session) return;
    if (!window.confirm(t("confirm_reset"))) return;
    setBusy(true);
    try {
      await api(`/rooms/${state.session.code}/reset`, { method: "POST" });
      state.revealed = false;
      toast(t("toast_reset"));
      await refresh();
    } catch (err) {
      toast(errorMessage(err), true);
    } finally {
      setBusy(false);
    }
  }

  function onLeave() {
    if (!window.confirm(t("confirm_leave"))) return;
    stopPolling();
    forgetSession();
    render();
  }

  async function onCopy() {
    if (!state.session) return;
    const link = `${location.origin}${location.pathname}?room=${state.session.code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast(t("copied"));
    } catch {
      toast(link);
    }
  }

  // ------------------------------------------------------------ server sync

  async function refresh() {
    if (!state.session || state.refreshing) return;
    state.refreshing = true;
    try {
      const room = await api(`/rooms/${state.session.code}`);
      if (!room.me) {
        // Token no longer valid (or room gone): back to the start screen.
        stopPolling();
        forgetSession();
        toast(t("err_unauthorized"), true);
        render();
        return;
      }
      if (room.serverNow) state.serverOffset = Date.now() - room.serverNow;
      state.room = room;
      if ($(".lobby")) paintRoom();
      else renderRoom();
    } catch (err) {
      if (err.code === "roomNotFound") {
        stopPolling();
        forgetSession();
        toast(t("err_roomNotFound"), true);
        render();
      }
      // Network hiccups while polling are ignored on purpose.
    } finally {
      state.refreshing = false;
    }
  }

  function startPolling() {
    if (state.pollId) return;
    state.pollId = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 2000);
  }

  function stopPolling() {
    clearInterval(state.pollId);
    state.pollId = null;
  }

  // ------------------------------------------------------------ render entry

  function render() {
    applyChrome();
    if (viewIsRoom()) renderRoom();
    else renderHome();
  }

  // ------------------------------------------------------------ events

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    switch (el.dataset.action) {
      case "tab":
        if (state.busy) return;
        syncForm();
        state.tab = el.dataset.tab;
        clearFormError();
        paintForm();
        break;
      case "eye": {
        state.showPw = !state.showPw;
        const pw = $("#pw");
        if (pw) pw.type = state.showPw ? "text" : "password";
        el.setAttribute("aria-label", t(state.showPw ? "hide_pw" : "show_pw"));
        break;
      }
      case "draw":
        onDraw();
        break;
      case "reset":
        onReset();
        break;
      case "leave":
        onLeave();
        break;
      case "copy":
        onCopy();
        break;
      default:
        break;
    }
  });

  document.addEventListener("submit", (e) => {
    if (e.target.id !== "authForm") return;
    e.preventDefault();
    onAuthSubmit(e.target);
  });

  document.addEventListener("input", (e) => {
    const target = e.target;
    if (target.id === "pw") {
      state.form.password = target.value;
      updateStrength();
    } else if (target.id === "name") {
      state.form.name = target.value;
    } else if (target.id === "code") {
      // Only characters that can occur in a code (no 0, O, 1, I).
      target.value = target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 6);
      state.form.code = target.value;
    }
  });

  $("#langBtn").addEventListener("click", () => {
    syncForm();
    state.lang = state.lang === "en" ? "de" : "en";
    store.set("zuteiler.lang", state.lang);
    render();
  });

  $("#themeBtn").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    store.set("zuteiler.theme", state.theme);
    applyChrome();
  });

  // Ripple on buttons (touch and mouse).
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const span = document.createElement("span");
    span.className = "ripple";
    Object.assign(span.style, {
      width: `${size}px`,
      height: `${size}px`,
      left: `${e.clientX - rect.left - size / 2}px`,
      top: `${e.clientY - rect.top - size / 2}px`,
    });
    btn.appendChild(span);
    setTimeout(() => span.remove(), 800);
  });

  // Gentle parallax on the aurora for pointer devices.
  if (window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener(
      "pointermove",
      (e) => {
        document.documentElement.style.setProperty("--mx", ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
        document.documentElement.style.setProperty("--my", ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
      },
      { passive: true }
    );
  }

  // Tell the server right away when the page is left, so the dot turns grey at once.
  // sendBeacon survives page unloads; it is the reliable channel on iOS Safari.
  function announceOffline() {
    if (!state.session?.token || !navigator.sendBeacon) return;
    const body = new Blob([JSON.stringify({ token: state.session.token })], { type: "application/json" });
    navigator.sendBeacon(`/api/rooms/${state.session.code}/offline`, body);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (state.session) refresh();
    } else {
      announceOffline();
    }
  });
  window.addEventListener("pagehide", announceOffline);

  // Boot
  render();
  if (state.session && viewIsRoom()) refresh();
})();
