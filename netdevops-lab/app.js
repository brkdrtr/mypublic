'use strict';
/* NetDevOps Lab arayuz mantigi. linux-lab/app.js tabanli, ek olarak Editor sekmesi ve Python runtime durumu. */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* depolama yok */ } }
function drop(k) { try { localStorage.removeItem(k); } catch (e) { /* yok */ } }

/* ---------- dil ---------- */

/* Arayuz metni iki dilli yazilir, T('turkce', 'english'). Dil profil ayarinda, st.lang, LAB_LANG shell.js icinde */
const isEnUI = () => typeof LAB_LANG !== 'undefined' && LAB_LANG === 'en';
function T(tr, en) { return isEnUI() && en != null ? en : tr; }
const hasI18n = () => typeof I18N_EN !== 'undefined';
const locM = m => (m && typeof locMission === 'function' ? locMission(m) : m);
const locC = c => (c && typeof locChapter === 'function' ? locChapter(c) : c);
const locQ = q => (q && typeof locQuiz === 'function' ? locQuiz(q) : q);
const locB = b => (b && typeof locBadge === 'function' ? locBadge(b) : b);
/* Ingilizce modda cevirisi olmayan icerik Turkce kalir, lang="tr" ile isaretlenir */
const trIf = untranslated => (isEnUI() && untranslated ? ' lang="tr"' : '');
/* alan bazinda, locMission metni degistirmediyse o alan Turkce kalmistir */
const fTr = (m, lm, f) => trIf(!!(m && m[f]) && lm[f] === m[f]);
const mTr = m => fTr(m, locM(m), 'title');
const cTr = c => trIf(!(c && hasI18n() && I18N_EN.chapters[c.id]));
const bTr = b => trIf(!(b && hasI18n() && I18N_EN.badges[b.id]));
/* Komut sozlugu, Ingilizce aciklama explain katmanindan */
function enX(k) { return isEnUI() && hasI18n() && I18N_EN.x[k] && typeof EXPLAIN_DB !== 'undefined' && EXPLAIN_DB[k] && typeof locX === 'function' ? locX(EXPLAIN_DB[k], I18N_EN.x[k]) : null; }
function cmdDesc(k) {
  const db = typeof EXPLAIN_DB !== 'undefined' && EXPLAIN_DB[k];
  let mm = null; try { mm = manualOf(k); } catch (e) { mm = null; }
  const ex = mm && mm.d ? mm.e || [] : db && db.ex ? db.ex.map(x => x[0]) : [];
  const x = enX(k);
  if (x && x.d) return { d: x.d, u: [], e: ex, tr: false };
  if (mm && mm.d) return { d: mm.d, u: isEnUI() ? [] : mm.u || [], e: ex, tr: true };
  return { d: db ? db.d : '', u: [], e: ex, tr: true };
}

const ALL = CHAPTERS.flatMap(c => c.missions.map(m => ({ ...m, chapter: c.id })));
const TITLES = ['Script Kiddie', 'Junior NetDev', 'Pythonista', 'API Ustası', 'Pipeline Mühendisi', 'Container Kaptanı', 'YANG Okuyucu', 'NETCONF Ustası', 'Automation Lead', 'Platform Mimarı', 'NetDevOps Principal'];
const TITLES_EN = ['Script Kiddie', 'Junior NetDev', 'Pythonista', 'API Master', 'Pipeline Engineer', 'Container Captain', 'YANG Reader', 'NETCONF Master', 'Automation Lead', 'Platform Architect', 'NetDevOps Principal'];
const DEF_ST = { done: [], xp: 0, cmds: 0, streak: 0, lastDay: null, noHint: 0, hinted: [], quizBest: 0, quizPerfect: false, secret: false, current: null, badges: [], mode: 'normal', daily: null, dailyDone: 0, revealed: [], auto: true, updatedAt: 0, progAt: 0, mVar: {}, mStart: {}, everDone: [], round: 0, practice: null, lang: 'tr', langAt: 0 };

/* ---------- profiller ---------- */

const KEY_PROFILES = 'nd.profiles';
const KEY_CUR = 'nd.profile';
const ICONS = ['🐧', '🦊', '🐺', '🦉', '🐙', '🦄', '🐉', '🦅'];
let PROFILES = [];
let PROFILE = null;
let st = null;
let sh = null;

function stKey(id) { return 'nd.state.v1.' + id; }
function shKey(id) { return 'nd.shell.v1.' + id; }
function loadProfiles() {
  try { PROFILES = JSON.parse(load(KEY_PROFILES) || 'null') || []; } catch (e) { PROFILES = []; }
  if (!PROFILES.length) {
    PROFILES = [{ id: 'burak', name: 'Burak', icon: '🐧' }];
    /* eski tek profilli veriyi tasi */
    const oldSt = null, oldSh = null;
    if (oldSt) { save(stKey('burak'), oldSt); drop('ll.state.v1'); }
    if (oldSh) { save(shKey('burak'), oldSh); drop('ll.shell.v1'); }
    save(KEY_PROFILES, JSON.stringify(PROFILES));
  }
}
function profName() { const p = PROFILES.find(x => x.id === PROFILE); return p ? p.name : ''; }
function profIcon() { const p = PROFILES.find(x => x.id === PROFILE); return p ? p.icon : '👤'; }
function useProfile(id) {
  if (!PROFILES.some(p => p.id === id)) return;
  PROFILE = id;
  save(KEY_CUR, id);
  let raw = {};
  try { raw = JSON.parse(load(stKey(id)) || '{}'); } catch (e) { raw = {}; }
  st = Object.assign(JSON.parse(JSON.stringify(DEF_ST)), raw);
  lastSig = progSig();
  applyLang();
  sh = new Shell(load(shKey(id)));
  quiz = null; hintShown = false; solShown = false; stepsShown = false; xpSteps.clear(); lastXp = null; edFile = null;
  term.innerHTML = '';
  welcome();
  renderPrompt();
  renderTop();
  renderAll();
}
function addProfile(name) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'p' + Date.now();
  if (PROFILES.some(p => p.id === id)) return toast(T('Bu isimde profil var', 'A profile with this name already exists'), 'bad');
  PROFILES.push({ id, name, icon: ICONS[PROFILES.length % ICONS.length] });
  save(KEY_PROFILES, JSON.stringify(PROFILES));
  useProfile(id);
  toast(T(`${name} profili açıldı`, `Profile ${name} created`), 'good');
  syncLater();
}
function deleteProfile(id) {
  if (PROFILES.length <= 1) return toast(T('Son profil silinemez', 'The last profile cannot be deleted'), 'bad');
  PROFILES = PROFILES.filter(p => p.id !== id);
  save(KEY_PROFILES, JSON.stringify(PROFILES));
  drop(stKey(id)); drop(shKey(id));
  if (PROFILE === id) useProfile(PROFILES[0].id);
  syncLater();
}
let lastSig = '';
function progSig() { return [st.xp, st.done.length, st.cmds, st.quizBest, (st.everDone || []).length].join('|'); }
function persist() {
  if (!PROFILE) return;
  st.updatedAt = Date.now();
  const sig = progSig(); if (sig !== lastSig) { st.progAt = Date.now(); lastSig = sig; }
  save(stKey(PROFILE), JSON.stringify(st));
  save(shKey(PROFILE), sh.serialize());
  syncLater();
}

/* ---------- senkron, GitHub Gist ---------- */

const SYNC = {
  token: load('labs.gh.token') || load('ll.gh.token') || load('nd.gh.token') || '',
  gist: load('nd.gh.gist') || '',
  status: 'off', msg: '', tm: null, busy: false, ready: false, lastPull: 0,
  api(path, method, body) {
    return fetch('https://api.github.com' + path, { method: method || 'GET', headers: { Authorization: 'Bearer ' + this.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(async r => { if (!r.ok) throw new Error('GitHub ' + r.status); return r.status === 204 ? null : r.json(); });
  },
  payload() {
    const states = {};
    PROFILES.forEach(p => { let s = null; try { s = JSON.parse(load(stKey(p.id)) || 'null'); } catch (e) { s = null; } states[p.id] = { st: s, sh: load(shKey(p.id)) || null, updatedAt: s ? s.updatedAt || 0 : 0 }; });
    return { v: 2, profiles: PROFILES, states, savedAt: Date.now() };
  },
  /* msg duz metin ya da [turkce, english], ikincisi dil degisince de dogru gorunur */
  set(status, msg) { this.status = status; this.msgPair = Array.isArray(msg) ? msg : null; this.msg = (this.msgPair ? T(msg[0], msg[1]) : msg) || ''; const el = $('#sync'); if (!el) return; el.className = 'chip sync ' + (status === 'ok' ? 'ok' : status === 'err' ? 'err' : status === 'busy' ? 'busy' : ''); el.textContent = status === 'ok' ? '☁︎' : status === 'err' ? '☁︎!' : status === 'busy' ? '☁︎…' : '·'; el.title = msg || (status === 'ok' ? T('Senkron', 'Sync') : T('Senkron kapalı', 'Sync off')); },
  async findGist() {
    if (this.gist) return this.gist;
    const list = await this.api('/gists?per_page=100');
    const g = list.find(x => x.description === 'netdevops-lab-sync' && x.files && x.files['netdevops-lab.json']);
    if (g) { this.gist = g.id; save('nd.gh.gist', g.id); return g.id; }
    return null;
  },
  async readRemote(id) {
    const g = await this.api('/gists/' + id);
    const f = g.files && g.files['netdevops-lab.json'];
    if (!f) return null;
    let raw = f.content;
    if (f.truncated) raw = await fetch(f.raw_url).then(r => r.text());
    try { return JSON.parse(raw); } catch (e) { this.set('err', ['Gist bozuk', 'Gist is corrupted']); return null; }
  },
  /* Uzaktaki durumu yereldekiyle birlestirir. Aktif profil bellekteki st ile birlesir, digerleri localStorage ile.
     Donus {changed, needPush}. changed aktif profilde gorunur bir degisiklik oldu demek */
  mergeRemote(data, replaceShell) {
    let changed = false, needPush = false;
    (data.profiles || []).forEach(p => { if (!PROFILES.some(x => x.id === p.id)) { PROFILES.push(p); changed = true; } });
    Object.entries(data.states || {}).forEach(([pid, s]) => {
      if (!s || !s.st) return;
      const active = pid === PROFILE && st;
      let loc = null;
      if (active) loc = st; else { try { loc = JSON.parse(load(stKey(pid)) || 'null'); } catch (e) { loc = null; } }
      if (!loc) { save(stKey(pid), JSON.stringify(s.st)); if (s.sh) save(shKey(pid), s.sh); return; }
      /* Zaman damgasi degil ilerleme birlestirilir. Yeni acilan bos tarayici uzaktaki ilerlemeyi ezemez */
      const merged = mergeSt(loc, s.st);
      const takeShell = replaceShell && !!s.sh && (s.st.progAt || 0) > (loc.progAt || 0);
      const diff = JSON.stringify(merged) !== JSON.stringify(loc);
      if (diff || takeShell) {
        save(stKey(pid), JSON.stringify(merged));
        if (takeShell) save(shKey(pid), s.sh);
        if (active) { if (takeShell) changed = true; else { const vis = merged.done.length !== st.done.length || merged.xp !== st.xp || merged.lang !== st.lang; st = merged; lastSig = progSig(); if (vis) changed = 'soft'; } }
      }
      if (JSON.stringify(merged) !== JSON.stringify(s.st)) needPush = true;
    });
    PROFILES.forEach(p => { if (!(data.states || {})[p.id]) needPush = true; });
    save(KEY_PROFILES, JSON.stringify(PROFILES));
    return { changed, needPush };
  },
  async pull() {
    if (!this.token) return false;
    this.set('busy', ['Çekiliyor', 'Pulling']);
    const id = await this.findGist();
    this.lastPull = Date.now();
    if (!id) { this.set('ok', ['Gist henüz yok, ilk kayıtta oluşur', 'No gist yet, it is created on first save']); return false; }
    const data = await this.readRemote(id);
    if (!data) { this.set('ok'); return false; }
    const r = this.mergeRemote(data, true);
    { const d = new Date(); this.set('ok', ['Son çekme ' + d.toLocaleTimeString('tr-TR'), 'Last pull ' + d.toLocaleTimeString('en-GB')]); }
    if (r.needPush) setTimeout(() => this.push(), 500);
    return r.changed;
  },
  /* Gondermeden once uzaktakini okuyup birlestirir, iki cihaz birbirinin ilerlemesini ezemez */
  async push() {
    if (!this.token) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    try {
      this.set('busy', ['Gönderiliyor', 'Pushing']);
      const id = await this.findGist();
      if (id) {
        const data = await this.readRemote(id);
        if (data) { const r = this.mergeRemote(data, false); if (r.changed === 'soft' && typeof renderAll === 'function') { renderTop(); renderAll(); } }
        if (PROFILE && st) save(stKey(PROFILE), JSON.stringify(st));
      }
      const body = { description: 'netdevops-lab-sync', public: false, files: { 'netdevops-lab.json': { content: JSON.stringify(this.payload()) } } };
      if (id) await this.api('/gists/' + id, 'PATCH', body);
      else { const g = await this.api('/gists', 'POST', body); this.gist = g.id; save('nd.gh.gist', g.id); }
      { const d = new Date(); this.set('ok', ['Son gönderme ' + d.toLocaleTimeString('tr-TR'), 'Last push ' + d.toLocaleTimeString('en-GB')]); }
    } catch (e) { this.set('err', String(e.message || e)); }
    this.busy = false;
    if (this.again) { this.again = false; setTimeout(() => this.push(), 300); }
  },
  async connect(token) {
    this.token = token.trim(); save('labs.gh.token', this.token); this.gist = ''; drop('nd.gh.gist');
    if (!this.token) { this.set('off'); return; }
    try {
      const changed = await this.pull();
      this.ready = true;
      if (changed) { loadProfiles(); useProfile(PROFILES.some(p => p.id === PROFILE) ? PROFILE : PROFILES[0].id); toast(T('Diğer cihazdaki ilerleme alındı', 'Progress from your other device loaded'), 'good'); }
      await this.push();
      toast(T('Senkron açık, bu tarayıcı artık eşitleniyor', 'Sync is on, this browser now stays in sync'), 'good');
    } catch (e) { this.set('err', String(e.message || e)); toast(T('Bağlanamadı, token ve gist yetkisini kontrol et', 'Could not connect, check the token and its gist scope'), 'bad'); }
  },
};
function syncLater() { if (!SYNC.token || !SYNC.ready) return; clearTimeout(SYNC.tm); SYNC.tm = setTimeout(() => { SYNC.tm = null; SYNC.push(); }, 4000); }
/* Iki cihazin ilerlemesini birlestirir. Tamamlanan gorevler, rozetler birlesir, sayaclar buyuk olani alir, ayarlar son ilerleme yapilan taraftan gelir */
function dayNum(d) { if (!d) return 0; const [y, m, dd] = String(d).split('-').map(Number); return new Date(y, (m || 1) - 1, dd || 1).getTime(); }
function mergeSt(a, b) {
  const pa = a.progAt || 0, pb = b.progAt || 0;
  const base = pb > pa ? b : a, other = base === a ? b : a;
  const out = Object.assign({}, other, base);
  const uni = k => [...new Set([].concat(a[k] || [], b[k] || []))];
  ['done', 'hinted', 'revealed', 'badges', 'everDone'].forEach(k => { out[k] = uni(k); });
  ['xp', 'cmds', 'quizBest', 'dailyDone', 'noHint', 'round'].forEach(k => { out[k] = Math.max(a[k] || 0, b[k] || 0); });
  out.quizPerfect = !!(a.quizPerfect || b.quizPerfect); out.secret = !!(a.secret || b.secret);
  const da = dayNum(a.lastDay), db = dayNum(b.lastDay);
  if (da === db) out.streak = Math.max(a.streak || 0, b.streak || 0); else { const w = da > db ? a : b; out.streak = w.streak || 0; out.lastDay = w.lastDay; }
  out.mVar = Object.assign({}, other.mVar || {}, base.mVar || {});
  out.mStart = Object.assign({}, base.mStart || {});
  /* dil ayari ilerlemeden bagimsiz, en son degistiren taraf kazanir */
  const la = a.langAt || 0, lb = b.langAt || 0;
  if (la !== lb) { const w = la > lb ? a : b; out.lang = w.lang || 'tr'; out.langAt = w.langAt; }
  out.progAt = Math.max(pa, pb); out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return out;
}
async function syncPullReload(quiet) {
  try {
    const ch = await SYNC.pull();
    if (ch === true) { loadProfiles(); useProfile(PROFILES.some(p => p.id === PROFILE) ? PROFILE : PROFILES[0].id); }
    else if (ch === 'soft') { persist(); renderTop(); renderAll(); }
    if (ch && !quiet) toast(T('Diğer cihazdaki ilerleme alındı', 'Progress from your other device loaded'), 'good');
    return ch;
  } catch (e) { SYNC.set('err', String(e.message || e)); return false; }
}
document.addEventListener('visibilitychange', () => {
  if (!SYNC.token || !SYNC.ready) return;
  if (document.visibilityState === 'hidden') { if (SYNC.tm) { clearTimeout(SYNC.tm); SYNC.tm = null; SYNC.push(); } }
  else if (Date.now() - SYNC.lastPull > 20000) syncPullReload(false);
});
function syncLink() { return location.origin + location.pathname + '#sync=' + encodeURIComponent(SYNC.token); }
window.addEventListener('pagehide', () => { if (SYNC.token && SYNC.tm) { clearTimeout(SYNC.tm); SYNC.push(); } });

/* ---------- genel ---------- */

function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function touchStreak() {
  const t = today();
  if (st.lastDay === t) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yd = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
  st.streak = st.lastDay === yd ? st.streak + 1 : 1;
  st.lastDay = t;
}
function level() { return Math.floor(st.xp / 120) + 1; }
function title() { const t = isEnUI() ? TITLES_EN : TITLES; return t[Math.min(level() - 1, t.length - 1)]; }

/* index.html icindeki sabit metinler. Turkcesi ilk calismada dataset icine alinir, dil degisince geri yazilir */
const STATIC_EN = [
  ['#tabs [data-v=term]', 'Terminal'], ['#tabs [data-v=mission]', 'Mission'], ['#tabs [data-v=home]', 'Chapters'], ['#tabs [data-v=quiz]', 'Quiz'],
  ['#tabs [data-v=man]', 'Dictionary'], ['#tabs [data-v=me]', 'Profile'], ['#tabs [data-v=editor]', 'Editor'], ['#tabs [data-v=more]', 'More'],
  ['#ed-cancel', 'Cancel'], ['#ed-save', 'Save'], ['.ed-foot', '^O Save   ^X Exit   use the buttons here'],
];
const STATIC_ATTR_EN = [['#cmd', 'aria-label', 'Command'], ['#t-help', 'title', 'help'], ['#lang', 'title', 'Language']];
function applyStatic() {
  STATIC_EN.forEach(([sel, en]) => {
    const el = $(sel); if (!el) return;
    /* sekmelerde ikon span, metin son dugum */
    const node = el.lastChild && el.lastChild.nodeType === 3 ? el.lastChild : null;
    const cur = node ? node.nodeValue : el.textContent;
    if (el.dataset.tr == null) el.dataset.tr = cur;
    const want = isEnUI() ? en : el.dataset.tr;
    if (node) node.nodeValue = want; else el.textContent = want;
  });
  STATIC_ATTR_EN.forEach(([sel, attr, en]) => {
    const el = $(sel); if (!el) return;
    const k = 'tr' + attr.replace(/\W/g, '');
    if (el.dataset[k] == null) el.dataset[k] = el.getAttribute(attr) || '';
    el.setAttribute(attr, isEnUI() ? en : el.dataset[k]);
  });
  const lc = $('#lang');
  if (lc) lc.innerHTML = `<span class="${isEnUI() ? '' : 'on'}">TR</span> <span class="${isEnUI() ? 'on' : ''}">EN</span>`;
}
/* Profilin dil ayarini shell'e ve sayfaya uygular */
function applyLang() {
  const lang = st && st.lang === 'en' ? 'en' : 'tr';
  if (typeof LAB_LANG !== 'undefined') LAB_LANG = lang;
  document.documentElement.lang = lang;
  applyStatic();
}
let welcomeEl = null;
function setLang(lang) {
  if (!st || (st.lang || 'tr') === lang) return;
  st.lang = lang; st.langAt = Date.now();
  applyLang();
  persist();
  /* terminalde sadece karsilama satiri varsa yeni dille yeniden yaz */
  if (welcomeEl && term.childElementCount === 1 && term.firstChild === welcomeEl) { term.innerHTML = ''; welcome(); }
  SYNC.set(SYNC.status, SYNC.msgPair || SYNC.msg);
  renderPrompt();
  renderTop();
  renderAll();
  if (currentView === 'chapter' && lastChapter) renderChapter(lastChapter);
  toast(T('Dil Türkçe', 'Language set to English'), 'good', 1400);
}

function renderTop() {
  applyLang();
  $('#streak').textContent = '🔥 ' + st.streak;
  $('#level').innerHTML = 'Lv ' + level() + '<span class="full"> · ' + esc(title()) + '</span>';
  $('#xpfill').style.width = ((st.xp % 120) / 120 * 100) + '%';
  $('#who').textContent = profIcon() + ' ' + profName();
  const m = curMission();
  const lm = locM(m), lc = m && locC(CHAPTERS.find(c => c.id === m.chapter));
  $('#topmis').innerHTML = m ? `<b${mTr(m)}>${esc(lm.title)}</b> · <span${cTr(lc)}>${esc(lc.title)}</span> · +${xpFor(m)} XP` : T('Serbest terminal', 'Free terminal');
  const p = sh.prompt();
  $('#ttitle').textContent = `${p.user}: ${p.path}`;
  renderPyChip();
}

function toast(msg, kind, ms) {
  const t = $('#toast');
  t.className = 'toast ' + (kind || '');
  t.innerHTML = msg;
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => t.classList.add('hidden'), ms || 2600);
}
function addXP(n) { st.xp += n; renderTop(); }
function checkBadges() {
  for (const b of BADGES) {
    if (!st.badges.includes(b.id) && b.test(st)) {
      st.badges.push(b.id);
      setTimeout(() => toast(`${b.icon} ${T('Yeni rozet', 'New badge')} <b>${esc(locB(b).title)}</b>`, 'good'), 900);
    }
  }
}
function confetti(n = 30) {
  const colors = ['#3ddc84', '#5aa9ff', '#f5b942', '#b58cff', '#ff6b6b'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.style.left = Math.random() * 100 + 'vw'; s.style.top = '-10px';
    s.style.background = colors[i % colors.length];
    s.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
    s.style.animationDelay = Math.random() * 0.3 + 's';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1800);
  }
}

/* ---------- gorunumler ---------- */

const isDesk = () => window.matchMedia('(min-width: 900px)').matches;
let currentView = 'mission';
function show(v) {
  if (v === 'term') {
    if (isDesk()) { input.focus(); return; }
    document.body.classList.add('m-term');
    currentView = 'term';
    $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === 'term'));
    scrollTerm();
    return;
  }
  document.body.classList.remove('m-term');
  currentView = v;
  $$('.view').forEach(x => x.classList.toggle('active', x.id === 'v-' + v));
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v || (v === 'chapter' && b.dataset.v === 'home') || (!isDesk() && ['quiz', 'man', 'me'].includes(v) && b.dataset.v === 'more')));
  if (v === 'mission') renderMission();
  if (v === 'editor') renderEditor();
  if (v === 'more') renderMore();
  if (v === 'home') renderHome();
  if (v === 'quiz') renderQuizStart();
  if (v === 'man') renderMan();
  if (v === 'me') renderMe();
}
function renderAll() { renderMission(); if (currentView !== 'mission' && currentView !== 'term') show(currentView); }

function chapterProgress(c) { const d = c.missions.filter(m => st.done.includes(m.id)).length; return { d, t: c.missions.length }; }
function nextMission() { return ALL.find(m => !st.done.includes(m.id)); }

/* Gunun gorevleri. Tarihe gore sabit 3 gorev, tamamlanmamislar oncelikli, hepsi bitince bonus XP */
function seededRandom(seed) { let x = 0; for (const ch of seed) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
function dailyMissions() {
  const t = today();
  if (st.daily && st.daily.date === t && st.daily.ids.every(id => ALL.some(m => m.id === id))) return st.daily;
  const rnd = seededRandom(t + ':' + ALL.length);
  const pool = ALL.filter(m => !st.done.includes(m.id));
  const src = pool.length >= 3 ? pool : ALL;
  const picked = [];
  const bag = src.slice();
  while (picked.length < 3 && bag.length) { const i = Math.floor(rnd() * bag.length); picked.push(bag.splice(i, 1)[0].id); }
  st.daily = { date: t, ids: picked, done: [], bonus: false };
  persist();
  return st.daily;
}
function dailyMark(id) {
  const d = dailyMissions();
  if (!d.ids.includes(id) || d.done.includes(id)) return;
  d.done.push(id);
  if (d.done.length === d.ids.length && !d.bonus) { d.bonus = true; st.dailyDone = (st.dailyDone || 0) + 1; addXP(30); setTimeout(() => toast(T('🎁 Günün 3 görevi tamam, +30 bonus XP', '🎁 All 3 daily missions done, +30 bonus XP'), 'good'), 1200); }
}
const MODES = { guided: { label: 'Rehberli', desc: 'Adımlar ve ipucu baştan açık, acele yok', mult: 0.8, en: ['Guided', 'Steps and hint are open from the start, no rush'] }, normal: { label: 'Normal', desc: 'Görev metni var, adımları istersen açarsın', mult: 1, en: ['Normal', 'Task text is shown, open the steps when you want'] }, expert: { label: 'Uzman', desc: 'Sadece semptom, görev gizli, %50 bonus XP', mult: 1.5, en: ['Expert', 'Only the symptom, task hidden, 50% bonus XP'] } };
function modeOf() { return MODES[st.mode] ? st.mode : 'normal'; }
function modeLabel(k) { return T(MODES[k].label, MODES[k].en[0]); }
function modeDesc(k) { return T(MODES[k].desc, MODES[k].en[1]); }
/* Senaryo varyanti. Her gorevin temel senaryosu ve varyantlari var, hangisinin oynanacagi profil durumunda saklanir */
function vCount(m) { return typeof variantCount === 'function' ? variantCount(m) : 1; }
function vIndex(m) { const n = vCount(m); const k = st.mVar && st.mVar[m.id] != null ? st.mVar[m.id] : (st.round || 0); return n > 1 ? ((k % n) + n) % n : 0; }
function eff(m) { return m && typeof variantOf === 'function' ? variantOf(m, vIndex(m)) : m; }
function curMission() { const m = ALL.find(x => x.id === st.current); return m ? eff(m) : null; }
function isDone(m) { return st.done.includes(m.id) && st.practice !== m.id; }
function xpFor(m) { const base = Math.round(m.xp * MODES[modeOf()].mult); return modeOf() === 'expert' && (st.hinted.includes(m.id) || st.revealed.includes(m.id)) ? m.xp : base; }

function renderHome() {
  const nm = nextMission();
  const total = ALL.length;
  const lnm = nm && locM(nm);
  let h = `<div class="hero"><div class="muted small">${T('Hoş geldin', 'Welcome')}, ${esc(profName())}</div><div class="big">${st.done.length}/${total} ${T('görev tamam', 'missions done')}</div>`;
  h += `<div class="muted small" style="margin-top:2px">${nm ? T('Sıradaki görev ', 'Next mission ') + `<span${mTr(nm)}>${esc(lnm.title)}</span>` : T('Tüm görevler bitti. Artık serbest terminalde istediğini dene.', 'All missions are done. Try anything you like in the free terminal.')}</div><div class="prog"><div style="width:${st.done.length / total * 100}%"></div></div>`;
  h += `<div class="row">${nm ? `<button class="btn" id="go-next">▶ ${T('Devam et', 'Continue')}</button>` : ''}<button class="btn alt" id="go-free">${T('Serbest terminal', 'Free terminal')}</button></div></div>`;
  h += syncWarn();
  const d = dailyMissions();
  h += `<h3>${T('Günün görevleri', 'Daily missions')} <span style="text-transform:none;letter-spacing:0;font-weight:400">· ${d.done.length}/3${d.bonus ? T(' · bonus alındı 🎁', ' · bonus claimed 🎁') : T(' · hepsi bitince +30 XP', ' · finish all for +30 XP')}</span></h3>`;
  d.ids.forEach(id => {
    const m = ALL.find(x => x.id === id); if (!m) return;
    const ch = locC(CHAPTERS.find(c => c.id === m.chapter));
    const ok = d.done.includes(id) || st.done.includes(id);
    h += `<button class="mis ${ok ? 'done' : ''} ${st.current === id ? 'cur' : ''}" data-m="${m.id}"><span class="n">${ok ? '✓' : ch.icon}</span><span style="min-width:0"><span${mTr(eff(m))}>${esc(locM(eff(m)).title)}</span><div class="muted" style="font-size:12px"${cTr(ch)}>${esc(ch.title)}</div></span><span class="xp">+${xpFor(m)}</span></button>`;
  });
  h += `<h3>${T('Zorluk', 'Difficulty')}</h3><div class="seg">${Object.keys(MODES).map(k => `<button data-mode="${k}" class="${modeOf() === k ? 'on' : ''}">${modeLabel(k)}</button>`).join('')}</div><p class="muted small" style="margin:-4px 0 12px">${esc(modeDesc(modeOf()))}</p>`;
  h += `<h3>${T('Bölümler', 'Chapters')}</h3>`;
  CHAPTERS.forEach((c0, i) => {
    const c = locC(c0);
    const p = chapterProgress(c0);
    const cur = ALL.find(x => x.id === st.current);
    h += `<button class="chap ${cur && cur.chapter === c.id ? 'cur' : ''}" data-c="${c.id}"><div class="ic">${c.icon}</div><div style="flex:1;min-width:0"${cTr(c)}><div class="t">${i + 1}. ${esc(c.title)}</div><div class="s">${esc(c.sub)}</div><div class="prog"><div style="width:${p.d / p.t * 100}%"></div></div></div><div class="meta">${p.d}/${p.t}</div></button>`;
  });
  $('#v-home').innerHTML = h;
  const gn = $('#go-next'); if (gn) gn.onclick = () => startMission(nm.id);
  bindSyncWarn($('#v-home'));
  $('#go-free').onclick = () => { st.current = null; persist(); renderTop(); renderMission(); show('term'); if (isDesk()) show('mission'); };
  $$('.chap').forEach(b => b.onclick = () => renderChapter(b.dataset.c));
  $$('#v-home .mis').forEach(b => b.onclick = () => startMission(b.dataset.m));
  $$('[data-mode]').forEach(b => b.onclick = () => { st.mode = b.dataset.mode; persist(); renderHome(); renderMission(); });
}

let lastChapter = null;
function renderChapter(cid) {
  lastChapter = cid;
  const c = CHAPTERS.find(x => x.id === cid);
  const lc = locC(c);
  let h = `<button class="back" id="bk">‹ ${T('Bölümler', 'Chapters')}</button><h2${cTr(c)}>${c.icon} ${esc(lc.title)}</h2><p class="muted small" style="margin-top:-6px"${cTr(c)}>${esc(lc.sub)}</p>`;
  const anyDone = c.missions.some(m => st.done.includes(m.id));
  const nv = Math.max(...c.missions.map(m => vCount(m)));
  c.missions.forEach((m, i) => {
    const done = st.done.includes(m.id);
    const em = eff(Object.assign({}, m, { chapter: c.id }));
    h += `<button class="mis ${done ? 'done' : ''} ${st.current === m.id ? 'cur' : ''}" data-m="${m.id}"><span class="n">${done ? '✓' : i + 1}</span><span${mTr(em)}>${esc(locM(em).title)}</span><span class="xp">+${m.xp}</span></button>`;
  });
  if (anyDone && nv > 1) h += `<button class="btn alt block" id="ch-replay" style="margin-top:10px">${T('🔄 Bölümü farklı senaryoyla baştan oyna', '🔄 Replay the chapter with a different scenario')}</button><p class="small muted" style="margin-top:6px">${T(`Her görevin ${nv} farklı senaryosu var. Aynı komutları farklı dosya, kullanıcı ve log'larla tekrar çözersin. Tekrar XP'si yarıdır.`, `Every mission has ${nv} scenarios. You solve it again with the same commands on different files, users and logs. Replays give half XP.`)}</p>`;
  $('#v-chapter').innerHTML = h;
  $('#bk').onclick = () => show('home');
  const rp = $('#ch-replay'); if (rp) rp.onclick = () => {
    if (!confirm(T('Bu bölümdeki görevler sıfırlanıp farklı senaryoyla baştan başlasın mı?', 'Reset the missions in this chapter and start over with a different scenario?'))) return;
    c.missions.forEach(m => { const base = ALL.find(x => x.id === m.id); st.mVar[m.id] = (vIndex(base) + 1) % vCount(base); st.done = st.done.filter(x => x !== m.id); });
    persist(); startMission(c.missions[0].id);
  };
  $$('#v-chapter .mis').forEach(b => b.onclick = () => startMission(b.dataset.m));
  currentView = 'chapter';
  $$('.view').forEach(x => x.classList.toggle('active', x.id === 'v-chapter'));
}

/* ---------- gorev paneli ---------- */

let hintShown = false, solShown = false, stepsShown = false, autoTm = null, lastXp = null;
const xpSteps = new Set();
function startMission(id, opts) {
  const base = ALL.find(x => x.id === id);
  if (!base) return;
  clearTimeout(autoTm); autoTm = null;
  if (opts && opts.replay) { st.mVar[id] = (vIndex(base) + 1) % vCount(base); st.practice = id; }
  else if (st.practice && st.practice !== id) st.practice = null;
  const m = eff(base);
  st.current = id;
  st.mStart[id] = sh.history.length;
  hintShown = false; solShown = false; stepsShown = false; xpSteps.clear();
  if (m.setup) { try { m.setup(sh); } catch (e) { /* yok say */ } }
  persist();
  renderTop();
  printSys(`\n── ${T('Görev', 'Mission')} ${locM(m).title}${vCount(base) > 1 ? T(' · senaryo ', ' · scenario ') + (vIndex(base) + 1) + '/' + vCount(base) : ''} ──\n`, 'mhead');
  renderMission();
  if (isDesk()) { show('mission'); input.focus(); } else show('term');
}

/* Cozumun her satiri bir adim. Kullanicinin komutu ayni komutla basliyor ve kelimelerin cogu tutuyorsa isaretlenir */
function stepsOf(m) {
  return String(m.solution || '').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
}
/* Sadece bu gorev basladiktan sonra yazilan komutlar sayilir, onceki gorevlerin komutlari adimlari kendiliginden acmasin */
function stepDone(step, lines) {
  const norm = s => s.replace(/^sudo\s+/, '').replace(/\s+/g, ' ').trim();
  const t = norm(step);
  const toks = t.split(' ');
  return lines.some(l => {
    const u = norm(l);
    if (u === t) return true;
    const ut = u.split(' ');
    if (ut[0] !== toks[0]) return false;
    const a = new Set(toks), b = new Set(ut); let inter = 0; a.forEach(x => { if (b.has(x)) inter++; });
    return inter / (a.size + b.size - inter) >= 0.75;
  });
}
function sinceStart(m) { const s0 = st.mStart && st.mStart[m.id]; return s0 != null && s0 <= sh.history.length ? sh.history.slice(s0) : []; }
/* Ipucu, cozumdeki komutlarin ne ise yaradigi ve hangi secenekleri kullanacagin, degerleri vermeden */
function hintCmdsHTML(m) {
  if (typeof explainHint !== 'function') return '';
  const list = explainHint(m.solution).filter(x => x.name && x.name !== 'submit');
  if (!list.length) return '';
  const opName = isEnUI() ? { '|': 'pipe |', '>': 'redirect >', '>>': 'append >>', '2>': 'error redirect 2>', '2>&1': '2>&1', '&&': '&&', '||': '||', ';': ';', '<': 'input <', '&': 'background &' } : { '|': 'pipe |', '>': 'yönlendirme >', '>>': 'ekleme >>', '2>': 'hata yönlendirme 2>', '2>&1': '2>&1', '&&': '&&', '||': '||', ';': ';', '<': 'girdi <', '&': 'arka plan &' };
  return `<div class="hc-wrap"><div class="hc-h">${T('Kullanacağın araçlar', 'Tools you will use')}</div>` + list.map(x => `<div class="hc"><code>${esc(x.name)}</code> <span>${esc(x.d)}</span>${x.opts.length ? '<ul>' + x.opts.map(o => `<li><code>${esc(o.k)}</code> ${esc(o.t)}</li>`).join('') + '</ul>' : ''}${x.ops.length ? `<div class="small muted">${T('Bağlantı', 'Joined with')} ${x.ops.map(o => esc(opName[o] || o)).join(', ')}</div>` : ''}</div>`).join('') + '</div>';
}
function xpBlock(line) { return typeof explainHTML === 'function' ? explainHTML(line) : ''; }
function showExplain(line) {
  lastXp = line;
  if (isDesk()) { show('mission'); const el = $('#mp-last'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  else openSheet(`<h2>${T('Komut açıklaması', 'Command explained')}</h2><div class="xp-line"><code>${esc(line)}</code></div>${xpBlock(line)}<div class="row" style="margin-top:12px;justify-content:flex-end"><button class="ghost" id="sh-close">${T('Kapat', 'Close')}</button></div>`);
}
function syncWarn() { return !SYNC.token && load('labs.synchint') !== 'off' ? `<div class="card warn"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="small">${T('☁︎ İlerlemen sadece bu tarayıcıda. Başka tarayıcı ya da cihazdan devam etmek için senkronu aç.', '☁︎ Your progress lives only in this browser. Turn on sync to continue from another browser or device.')}</span><button class="ghost sync-x" title="${T('gizle', 'hide')}">✕</button></div><button class="btn small go-sync" style="margin-top:8px">${T('Senkronu kur', 'Set up sync')}</button></div>` : ''; }
function bindSyncWarn(root) {
  root.querySelectorAll('.go-sync').forEach(b => b.onclick = () => { show('me'); setTimeout(() => { const el = $('#sync-card'); if (el) el.scrollIntoView({ block: 'start' }); }, 50); });
  root.querySelectorAll('.sync-x').forEach(b => b.onclick = () => { save('labs.synchint', 'off'); renderAll(); if (currentView === 'home') renderHome(); });
}
function navOf(m) { const gi = ALL.findIndex(x => x.id === m.id); return { prev: ALL[gi - 1] || null, next: ALL[gi + 1] || null }; }
let stripCol = false;
/* Mobilde terminalin ustunde kompakt gorev seridi, dikey ekranda goreve gitmeden calisilsin */
function renderStrip(m, done, taskHidden, steps, since) {
  const sp = $('#mstrip');
  if (!m) { sp.className = 'mstrip mobile-only'; sp.innerHTML = `<div class="mh"><span class="tt muted">🧪 ${T('Serbest terminal', 'Free terminal')}</span><button class="tg" id="ms-go">${T('Görev ›', 'Mission ›')}</button></div>`; $('#ms-go').onclick = () => show('mission'); return; }
  sp.className = 'mstrip mobile-only' + (stripCol ? ' col' : '');
  const lm = locM(m), tr = f => fTr(m, lm, f);
  const doneN = steps.filter(s => stepDone(s, since)).length;
  const nav = navOf(m);
  let h = `<div class="mh"><button class="tg" id="ms-prev" ${nav.prev ? '' : 'disabled'} aria-label="${T('önceki', 'previous')}">‹</button><span class="tt"${tr('title')}>${done ? '✅ ' : '🎯 '}${esc(lm.title)}</span><span class="pill xp">+${xpFor(m)}</span>${steps.length ? `<span class="pill">${done ? steps.length : doneN}/${steps.length}</span>` : ''}<button class="tg" id="ms-nextm" ${nav.next ? '' : 'disabled'} aria-label="${T('sonraki', 'next')}">›</button><button class="tg" id="ms-tg">${stripCol ? '▾' : '▴'}</button></div><div class="mb">`;
  if (done) h += `<div class="done-box"><div class="t">${T('Görev tamamlandı', 'Mission complete')}</div><div class="small muted">${autoTm ? T('Sıradaki görev birazdan açılıyor', 'The next mission opens in a moment') : T('Sıradaki göreve geçebilirsin', 'You can move on to the next mission')}</div><div class="row"><button class="btn small" id="ms-next">${T('Sonraki ›', 'Next ›')}</button></div></div>`;
  else h += taskHidden ? `<div class="task locked">${T('🔒 Görev gizli, uzman modu.', '🔒 Task hidden in expert mode.')} <button class="ghost" id="ms-reveal">${T('Göster', 'Show')}</button></div>` : `<div class="task"${tr('task')}>${md(lm.task)}</div>`;
  if (steps.length && !done && (stepsShown || steps.some(s => stepDone(s, since)))) {
    h += '<ol class="steps">';
    steps.forEach((s, i) => { const ok = stepDone(s, since); const vis = stepsShown || ok; h += `<li class="${ok ? 'ok' : ''}"><span class="ck">${ok ? '✓' : i + 1}</span><span class="st ${vis ? '' : 'blur'}">${esc(vis ? s : s.replace(/\S/g, '•'))}</span>${vis && !ok ? `<button class="use" data-use="${esc(s)}">${T('yaz', 'type')}</button>` : ''}</li>`; });
    h += '</ol>';
  }
  if (hintShown && !done) h += `<div class="hint">💡 <span${tr('hint')}>${md(lm.hint)}</span>${hintCmdsHTML(m)}</div>`;
  h += `<div class="row">${!done && !stepsShown ? `<button class="ghost" id="ms-steps">${T('Adımlar', 'Steps')}</button>` : ''}${!done && !hintShown ? `<button class="ghost" id="ms-hint">💡 ${T('İpucu', 'Hint')}</button>` : ''}<button class="ghost" id="ms-go">${T('Detay ›', 'Details ›')}</button></div></div>`;
  sp.innerHTML = h;
  $('#ms-tg').onclick = () => { stripCol = !stripCol; renderMission(); };
  $('#ms-prev').onclick = () => { if (nav.prev) startMission(nav.prev.id); };
  $('#ms-nextm').onclick = () => { if (nav.next) startMission(nav.next.id); };
  $('#ms-go').onclick = () => show('mission');
  const nx = $('#ms-next'); if (nx) nx.onclick = goNext;
  const rv = $('#ms-reveal'); if (rv) rv.onclick = () => { if (!st.revealed.includes(m.id)) st.revealed.push(m.id); persist(); renderMission(); };
  const sb = $('#ms-steps'); if (sb) sb.onclick = () => { stepsShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); persist(); renderMission(); };
  const hb = $('#ms-hint'); if (hb) hb.onclick = () => { hintShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); persist(); renderMission(); };
  $$('#mstrip [data-use]').forEach(b => b.onclick = () => { input.value = b.dataset.use; input.focus(); });
}
function renderMission() {
  const box = $('#v-mission');
  const base = ALL.find(x => x.id === st.current);
  const m = base ? eff(base) : null;
  if (!m) {
    renderStrip(null);
    box.innerHTML = syncWarn() + `<div class="card"><div style="font-weight:700;margin-bottom:4px">🧪 ${T('Serbest terminal', 'Free terminal')}</div><div class="muted small">${T("Burası senin sandbox'ın. Ne istersen dene, bir şeyi bozarsan Profil sekmesinden filesystem'i sıfırla. <code>help</code> komut listesini verir.", 'This is your sandbox. Try anything, and if you break something reset the filesystem from the Profile tab. <code>help</code> lists the commands.')}</div></div>` + nextBlock() + keyHelp();
    bindKeyHelp(); bindSyncWarn(box);
    const nb = $('#mp-next'); if (nb) nb.onclick = () => { const nm = nextMission(); if (nm) startMission(nm.id); };
    return;
  }
  const ch = locC(CHAPTERS.find(c => c.id === m.chapter));
  const lm = locM(m), tr = f => fTr(m, lm, f);
  const done = isDone(m);
  const expert = modeOf() === 'expert' && !done;
  const taskHidden = expert && !st.revealed.includes(m.id);
  if (modeOf() === 'guided') { stepsShown = true; if (!hintShown) { hintShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); } }
  const steps = stepsOf(m);
  const since = sinceStart(m);
  renderStrip(m, done, taskHidden, steps, since);
  const nav = navOf(m);
  const idx = ch.missions.findIndex(x => x.id === m.id);
  const nv = vCount(base);
  let h = syncWarn() + `<div class="mnav"><button class="ghost" id="mp-prev" ${nav.prev ? '' : 'disabled'}>${T('‹ Önceki', '‹ Previous')}</button><span class="small muted">${ch.icon} <span${cTr(ch)}>${esc(ch.title)}</span> · ${idx + 1}/${ch.missions.length}</span><button class="ghost" id="mp-nextm" ${nav.next ? '' : 'disabled'}>${T('Sonraki ›', 'Next ›')}</button></div>`;
  h += `<div class="mhdr"><div><div class="tt"${tr('title')}>${done ? '✅ ' : ''}${esc(lm.title)}</div>${nv > 1 ? `<div class="ch">${T('Senaryo', 'Scenario')} ${vIndex(base) + 1}/${nv}${st.practice === m.id ? T(' · tekrar', ' · replay') : ''}</div>` : ''}</div><div class="right"><span class="pill xp">+${xpFor(m)} XP</span>${expert ? `<span class="pill">${T('uzman', 'expert')}</span>` : ''}</div></div>`;
  if (done) h += `<div class="done-box"><div class="t">${T('Görev tamamlandı', 'Mission complete')}</div><div class="small muted" id="mp-auto">${autoTm ? T('Sıradaki görev birazdan açılıyor', 'The next mission opens in a moment') : T('Sıradaki göreve geçebilirsin', 'You can move on to the next mission')}</div><div class="row" style="margin-top:8px"><button class="btn small" id="mp-next">${T('Sonraki ›', 'Next ›')}</button>${autoTm ? `<button class="btn alt small" id="mp-stay">${T('Burada kal', 'Stay here')}</button>` : `<button class="btn alt small" id="mp-replay">🔄 ${nv > 1 ? T('Farklı senaryoyla tekrar', 'Replay with another scenario') : T('Tekrar çöz', 'Solve again')}</button>`}</div></div>`;
  h += `<div class="story"${tr('story')}>${md(lm.story)}</div>`;
  h += taskHidden ? `<div class="task locked">${T('🔒 Uzman modu, görev metni gizli. Semptomdan yola çık.', '🔒 Expert mode, the task text is hidden. Work from the symptom.')} <button class="ghost" id="mp-reveal" style="margin-top:6px">${T('Görevi göster', 'Show task')}</button></div>` : `<div class="task"${tr('task')}>${md(lm.task)}</div>`;
  if (steps.length) {
    const doneN = steps.filter(s => stepDone(s, since)).length;
    h += `<h3 style="margin-top:12px">${T('Adımlar', 'Steps')} <span style="text-transform:none;letter-spacing:0;font-weight:400">· ${done ? steps.length : doneN}/${steps.length}</span>${!stepsShown && !done ? ` <button class="ghost" id="mp-steps" style="float:right;padding:2px 8px;font-size:12px">${T('Göster', 'Show')}</button>` : ''}</h3><ol class="steps">`;
    steps.forEach((s, i) => {
      const ok = done || stepDone(s, since);
      const vis = stepsShown || done || ok;
      h += `<li class="${ok ? 'ok' : ''}"><span class="ck">${ok ? '✓' : i + 1}</span><span class="st ${vis ? '' : 'blur'}">${esc(vis ? s : s.replace(/\S/g, '•'))}</span>${vis ? `<button class="use" data-xs="${i}" title="${T('ne demek', 'what it means')}">?</button>` : ''}${vis && !ok ? `<button class="use" data-use="${esc(s)}">${T('yaz', 'type')}</button>` : ''}</li>`;
      if (vis && xpSteps.has(i)) h += `<li class="xp-li">${xpBlock(s)}</li>`;
    });
    h += '</ol>';
  }
  h += `<div class="row">${!hintShown ? `<button class="ghost" id="mp-hint">💡 ${T('İpucu', 'Hint')}</button>` : ''}${!solShown ? `<button class="ghost" id="mp-sol">🔓 ${T('Çözüm', 'Solution')}</button>` : ''}${done ? '' : `<button class="ghost" id="mp-skip">${T('Atla ›', 'Skip ›')}</button>`}</div>`;
  h += `<button class="btn block mobile-only" id="mp-term" style="margin-top:14px">⌨️ ${T('Terminale geç', 'Go to terminal')}</button>`;
  if (hintShown) h += `<div class="hint">💡 <span${tr('hint')}>${md(lm.hint)}</span>${hintCmdsHTML(m)}</div>`;
  if (solShown) h += `<div class="sol-wrap"><div class="hc-h">${T('Çözüm ve açıklaması', 'Solution explained')}</div>${steps.map(sx => `<div class="sol-line"><code>${esc(sx)}</code></div>${/^(sudo\s+)?(nano|vim|vi)\s/.test(sx) ? `<div class="small muted" style="margin:4px 0 8px">${T('Editörde dosyayı aç, görev metnindeki değişikliği yap, kaydet.', 'Open the file in the editor, make the change the task asks for, then save.')}</div>` : xpBlock(sx)}`).join('')}</div>`;
  if (lastXp) h += `<div id="mp-last"><h3>${T('Son komutun açıklaması', 'Your last command explained')}</h3><div class="xp-line"><code>${esc(lastXp)}</code></div>${xpBlock(lastXp)}</div>`;
  else h += `<p class="small muted desk-only" style="margin-top:14px">${T('Terminalde çalıştırdığın her komutun yanındaki ⓘ ile o komutu parça parça açıklatabilirsin. <code>explain komut</code> bir komutun tüm seçeneklerini listeler.', 'Tap the ⓘ next to any command you ran in the terminal to have it explained piece by piece. <code>explain command</code> lists all options of a command.')}</p>`;
  h += keyHelp();
  box.innerHTML = h;
  bindKeyHelp(); bindSyncWarn(box);
  const rv = $('#mp-reveal'); if (rv) rv.onclick = () => { if (!st.revealed.includes(m.id)) st.revealed.push(m.id); persist(); renderMission(); };
  const hb = $('#mp-hint'); if (hb) hb.onclick = () => { hintShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); persist(); renderMission(); };
  const sb = $('#mp-sol'); if (sb) sb.onclick = () => { solShown = true; stepsShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); persist(); renderMission(); };
  const stb = $('#mp-steps'); if (stb) stb.onclick = () => { stepsShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); persist(); renderMission(); };
  const nx = $('#mp-next'); if (nx) nx.onclick = goNext;
  const sk = $('#mp-skip'); if (sk) sk.onclick = goNext;
  $('#mp-prev').onclick = () => { if (nav.prev) startMission(nav.prev.id); };
  $('#mp-nextm').onclick = () => { if (nav.next) startMission(nav.next.id); };
  const rpl = $('#mp-replay'); if (rpl) rpl.onclick = () => startMission(m.id, { replay: true });
  $$('#v-mission [data-xs]').forEach(b => b.onclick = () => { const i = +b.dataset.xs; if (xpSteps.has(i)) xpSteps.delete(i); else xpSteps.add(i); renderMission(); });
  const stay = $('#mp-stay'); if (stay) stay.onclick = () => { clearTimeout(autoTm); autoTm = null; renderMission(); };
  $$('#v-mission [data-use]').forEach(b => b.onclick = () => { input.value = b.dataset.use; show('term'); input.focus(); });
  const tb = $('#mp-term'); if (tb) tb.onclick = () => { show('term'); input.focus(); };
}
function nextBlock() { const nm = nextMission(); return nm ? `<div class="card soft"><div class="small muted">${T('Sıradaki görev', 'Next mission')}</div><div style="font-weight:600"${mTr(nm)}>${esc(locM(nm).title)}</div><button class="btn small" id="mp-next" style="margin-top:8px">${T('Başla ›', 'Start ›')}</button></div>` : ''; }
function keyHelp() {
  return `<div class="desk-only"><h3>${T('Kısayollar', 'Shortcuts')}</h3><div class="kv"><b>Tab</b><span>${T('tamamla', 'complete')}</span><b>↑ ↓</b><span>${T('geçmiş', 'history')}</span><b>Ctrl L</b><span>${T('ekranı temizle', 'clear screen')}</span><b>Ctrl C</b><span>${T('satırı iptal et', 'cancel line')}</span><b>man cmd</b><span>${T('kılavuz', 'manual')}</span></div></div>`;
}
function bindKeyHelp() { /* desktop kisayol metni, buton yok */ }

function goNext() {
  clearTimeout(autoTm); autoTm = null;
  const cur = ALL.findIndex(x => x.id === st.current);
  const nm = ALL.slice(cur + 1).find(m => !st.done.includes(m.id)) || nextMission();
  if (nm) startMission(nm.id); else { st.current = null; persist(); renderTop(); renderMission(); show('home'); }
}

/* ---------- terminal ---------- */

const term = $('#term');
const input = $('#cmd');
let histIdx = -1;

function scrollTerm() { requestAnimationFrame(() => { term.scrollTop = term.scrollHeight; }); }
function printSys(t, cls) { const s = document.createElement('span'); s.className = cls || 'sys'; s.textContent = t; term.appendChild(s); scrollTerm(); return s; }
function promptHTML() { const p = sh.prompt(); return `<span class="pu">${esc(p.user)}</span>:<span class="pp">${esc(p.path)}</span>$ `; }
function renderPrompt() { $('#prompt').innerHTML = promptHTML(); }
function welcome() {
  if (term.childElementCount) return;
  welcomeEl = printSys(T(`NetDevOps Lab · Ubuntu 24.04 + Python 3.14 + lab cihazları · ${profName()}\nhelp yaz, komutları gör. Detay için man komut.\nCihazlar r1.lab 10.0.0.1 ve r2.lab 10.0.0.2, API api.lab, registry.lab. lab devices yaz.\n\n`, `NetDevOps Lab · Ubuntu 24.04 + Python 3.14 + lab devices · ${profName()}\nType help to see the commands. Use man command for details.\nDevices r1.lab 10.0.0.1 and r2.lab 10.0.0.2, API api.lab, registry.lab. Type lab devices.\n\n`));
}

function execute(line) {
  const echo = document.createElement('div');
  echo.innerHTML = promptHTML() + esc(line) + (line.trim() && typeof explainLine === 'function' ? ` <button class="xi" title="${T('komutu açıkla', 'explain command')}">ⓘ</button>` : '');
  echo.dataset.line = line;
  term.appendChild(echo);
  if (line.trim() && !/^\s*(explain|clear|help)\b/.test(line)) lastXp = line.trim();
  if (/^\s*cowsay\b|^\s*sl\s*$|^\s*fortune\b|^\s*matrix\b|^\s*neofetch\b/.test(line)) { if (!st.secret) { st.secret = true; } }
  const res = sh.run(line);
  if (res.ui.clear) term.innerHTML = '';
  const out = [];
  const frag = document.createDocumentFragment();
  for (const c of res.chunks) {
    const s = document.createElement('span');
    if (c.cls) s.className = c.cls;
    s.textContent = c.text;
    frag.appendChild(s);
    if (c.cls !== 'err') out.push(c.text);
  }
  term.appendChild(frag);
  if (line.trim()) { st.cmds++; touchStreak(); }
  renderPrompt();
  scrollTerm();
  if (res.ui.editor) { if (res.ui.editorVim) openVim(res.ui.editor); else openEditor(res.ui.editor, false); }
  evaluate(line, out.join(''), res.ui.submit);
  persist();
  renderTop();
}

function evaluate(line, out, submit) {
  const m = curMission();
  if (!m) { checkBadges(); return; }
  if (isDone(m)) { checkBadges(); if (line.trim()) renderMission(); return; }
  if (line === 'editor') { /* editor kaydi gorev kontrolune girer ama komut satiri degildir */ }
  let passed = false;
  try { passed = !!m.check(sh, { line: line.trim(), out, submit: submit == null ? null : submit }); } catch (e) { passed = false; }
  if (passed) {
    const practice = st.practice === m.id;
    const replay = !practice && (st.everDone || []).includes(m.id);
    if (!st.done.includes(m.id)) st.done.push(m.id);
    if (!st.everDone.includes(m.id)) st.everDone.push(m.id);
    st.practice = null;
    if (!practice && !replay && !st.hinted.includes(m.id)) st.noHint = (st.noHint || 0) + 1;
    const gained = practice ? Math.max(3, Math.round(xpFor(m) * 0.3)) : replay ? Math.max(5, Math.round(xpFor(m) * 0.5)) : xpFor(m);
    addXP(gained);
    dailyMark(m.id);
    printSys(`\n✔ ${T('Görev tamamlandı', 'Mission complete')} +${gained} XP · Lv ${level()} ${title()}\n`, 'okk');
    confetti();
    if (navigator.vibrate) navigator.vibrate(30);
    checkBadges();
    persist();
    const nm = ALL.slice(ALL.findIndex(x => x.id === m.id) + 1).find(x => !st.done.includes(x.id)) || nextMission();
    if (st.auto !== false && nm && !practice) {
      autoTm = setTimeout(() => { autoTm = null; goNext(); }, 2200);
      toast(`✔ <b>${esc(locM(m).title)}</b> +${gained} XP · ${T('sıradaki geliyor', 'next one coming')}`, 'good', 2000);
    } else toast(`✔ <b>${esc(locM(m).title)}</b> +${gained} XP`, 'good');
    renderMission();
  } else if (submit != null && /submit/.test(m.solution)) {
    toast(T('❌ Yanlış cevap, output\'a bir daha bak', '❌ Wrong answer, look at the output again'), 'bad');
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
  } else { checkBadges(); if (line.trim()) renderMission(); }
}

$('#cmdform').addEventListener('submit', e => {
  e.preventDefault();
  const line = input.value;
  input.value = '';
  histIdx = -1;
  execute(line);
});

function histMove(dir) {
  const h = sh.history;
  if (!h.length) return;
  if (histIdx === -1) histIdx = h.length;
  histIdx = Math.max(0, Math.min(h.length, histIdx + dir));
  input.value = histIdx === h.length ? '' : h[histIdx];
  setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
}
function doComplete() {
  const r = sh.complete(input.value);
  if (typeof r === 'string') input.value = r;
  else if (r.options && r.options.length > 1) {
    const d = document.createElement('div');
    d.innerHTML = promptHTML() + esc(input.value);
    term.appendChild(d);
    printSys(r.options.join('  ') + '\n');
  }
}
input.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp') { e.preventDefault(); histMove(-1); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); histMove(1); }
  else if (e.key === 'Tab') { e.preventDefault(); doComplete(); }
  else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); term.innerHTML = ''; }
  else if (e.key === 'c' && e.ctrlKey) { e.preventDefault(); const d = document.createElement('div'); d.innerHTML = promptHTML() + esc(input.value) + '^C'; term.appendChild(d); input.value = ''; scrollTerm(); }
});
document.addEventListener('pointerdown', e => { if (e.target.closest('.keybtn')) e.preventDefault(); });
document.addEventListener('click', e => {
  const b = e.target.closest('.keybtn'); if (!b) return;
  const k = b.dataset.k;
  if (k === 'TAB') doComplete();
  else if (k === 'UP') histMove(-1);
  else if (k === 'DOWN') histMove(1);
  else if (k === 'CLEAR') term.innerHTML = '';
  else {
    const s = input.selectionStart ?? input.value.length;
    input.value = input.value.slice(0, s) + k + input.value.slice(input.selectionEnd ?? s);
    input.setSelectionRange(s + k.length, s + k.length);
  }
  input.focus();
});
$('#t-help').onclick = () => { input.value = 'help'; $('#cmdform').requestSubmit(); };
term.addEventListener('click', e => { const xi = e.target.closest('.xi'); if (xi) { e.stopPropagation(); showExplain(xi.parentElement.dataset.line); return; } if (!window.getSelection().toString()) input.focus(); });

/* iOS klavye acildiginda yuksekligi ayarla */
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fit = () => {
    const kb = window.innerHeight - vv.height > 120;
    document.body.classList.toggle('kb', kb);
    $('#app').style.height = vv.height + 'px';
    window.scrollTo(0, 0);
    scrollTerm();
  };
  vv.addEventListener('resize', fit);
  vv.addEventListener('scroll', () => window.scrollTo(0, 0));
}
window.matchMedia('(min-width: 900px)').addEventListener('change', e => { if (e.matches) { document.body.classList.remove('m-term'); if (currentView === 'term') show('mission'); } });

/* ---------- editor ---------- */

let edState = null;
function openEditor(info, vim) {
  edState = info;
  $('#ed-title').textContent = (vim ? 'vim ' : 'GNU nano  ') + info.display;
  $('#ed-text').value = info.content;
  $('#editor').classList.remove('hidden');
  setTimeout(() => $('#ed-text').focus(), 50);
}
$('#ed-cancel').onclick = () => { $('#editor').classList.add('hidden'); edState = null; input.focus(); };
$('#ed-save').onclick = () => {
  if (!edState) return;
  const was = sh.isRoot;
  sh.isRoot = edState.root;
  let text = $('#ed-text').value;
  if (text && !text.endsWith('\n')) text += '\n';
  const isCron = edState.path === '__crontab__';
  const e = isCron ? (sh.crontab = text, null) : sh.writeFile(edState.path, text, false, 'nano');
  sh.isRoot = was;
  $('#editor').classList.add('hidden');
  if (e) { printSys(`[ ${e} ]\n` + T("💡 Dosya root'a aitse sudo nano dosya ile aç\n", '💡 If root owns the file, open it with sudo nano file\n')); }
  else if (isCron) printSys('crontab: installing new crontab\n');
  else { printSys(T(`[ ${text.split('\n').length - 1} satır yazıldı ]\n`, `[ Wrote ${text.split('\n').length - 1} lines ]\n`)); }
  edState = null;
  evaluate(isCron ? 'crontab' : 'nano', '', null);
  persist();
  input.focus();
};

/* ---------- vim ---------- */

let vimState = null;
function openVim(info) {
  const ed = new VimEditor(info.content);
  vimState = { ed, info };
  $('#vim').classList.remove('hidden');
  $('#vim-title').textContent = info.display;
  renderVim();
  setTimeout(() => $('#vim-in').focus(), 50);
}
function renderVim() {
  if (!vimState) return;
  const ed = vimState.ed;
  const rows = ed.lines.map((l, r) => {
    const num = ed.numbers ? `<span class="vnum">${String(r + 1).padStart(3)} </span>` : '';
    if (r !== ed.row) return num + esc(l || '');
    const c = Math.min(ed.col, l.length);
    const ch = l[c] === undefined ? ' ' : l[c];
    return num + esc(l.slice(0, c)) + `<span class="vcur ${ed.mode === 'insert' ? 'ins' : ''}">${esc(ch)}</span>` + esc(l.slice(c + 1));
  });
  while (rows.length < 12) rows.push('<span class="vtilde">~</span>');
  $('#vim-screen').innerHTML = rows.join('\n');
  const st2 = ed.status();
  $('#vim-status').innerHTML = `<span>${esc(st2 || '')}</span><span class="muted">${ed.row + 1},${ed.col + 1}</span>`;
  const cur = $('#vim-screen .vcur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
  if (ed.done) finishVim();
}
function finishVim() {
  const { ed, info } = vimState;
  const d = ed.done;
  sh.vimLog.push(...ed.log);
  if (d.stay) { ed.done = null; const was = sh.isRoot; sh.isRoot = info.root; const e = sh.writeFile(info.path, ed.text(), false, 'vim'); sh.isRoot = was; ed.msg = e ? e : `"${info.display}" ${ed.lines.length}L written`; ed.dirty = !!e; renderVim(); return; }
  $('#vim').classList.add('hidden');
  if (d.save) {
    const was = sh.isRoot; sh.isRoot = info.root;
    const e = sh.writeFile(info.path, ed.text(), false, 'vim');
    sh.isRoot = was;
    if (e) printSys(`[ ${e} ]\n` + T("💡 Dosya root'a aitse sudo vim dosya ile aç\n", '💡 If root owns the file, open it with sudo vim file\n'));
    else printSys(`"${info.display}" ${ed.lines.length}L written\n`);
  }
  vimState = null;
  evaluate('vim', '', null);
  persist();
  input.focus();
}
function vimKey(k) { if (!vimState) return; vimState.ed.key(k); renderVim(); }
$('#vim-in').addEventListener('keydown', e => {
  if (!vimState) return;
  const k = e.key;
  if (k === 'Escape' || k === 'Enter' || k === 'Backspace' || k === 'Tab' || k.startsWith('Arrow')) { e.preventDefault(); vimKey(k); return; }
  if (k.length === 1 && !e.metaKey && !e.ctrlKey) { e.preventDefault(); vimKey(k); return; }
  if (e.ctrlKey && k === '[') { e.preventDefault(); vimKey('Escape'); }
});
/* iOS klavyesi bazen keydown yerine sadece input verir */
$('#vim-in').addEventListener('input', e => {
  const v = e.target.value; e.target.value = '';
  if (!vimState || !v) return;
  if (e.inputType === 'insertLineBreak') { vimKey('Enter'); return; }
  for (const ch of v) vimKey(ch);
});
$('#vim-in').addEventListener('beforeinput', e => { if (e.inputType === 'deleteContentBackward') { e.preventDefault(); vimKey('Backspace'); } });
$$('#vim button[data-k]').forEach(b => {
  b.addEventListener('pointerdown', e => e.preventDefault());
  b.addEventListener('click', () => { const seq = b.dataset.k; if (seq === 'FOCUS') { $('#vim-in').focus(); return; } for (const k of seq.split(',')) vimKey(k); $('#vim-in').focus(); });
});
$('#vim-screen').addEventListener('click', () => $('#vim-in').focus());

/* ---------- quiz ---------- */

let quiz = null;
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function renderQuizStart() {
  if (quiz && !quiz.finished) return renderQuestion();
  $('#v-quiz').innerHTML = `<h2>${T('🎓 Hızlı Quiz', '🎓 Quick Quiz')}</h2><p class="muted small">${T('10 rastgele soru. Her doğru +5 XP. 10/10 yaparsan rozet.', '10 random questions. Each correct answer is worth 5 XP. Score 10 out of 10 for a badge.')}</p><div class="stat" style="margin-bottom:14px"><div class="v">${st.quizBest}/10</div><div class="l">${T('En iyi skor', 'Best score')}</div></div><button class="btn" id="qstart">${T('Başla', 'Start')}</button>`;
  $('#qstart').onclick = () => {
    /* sik sirasi karistirilir, metin her cizimde locQuiz ile aktif dilden kurulur */
    quiz = { qs: shuffle(QUIZ).slice(0, 10).map(q => { const order = shuffle(q.a.map((t, i) => i)); return { src: q, order, c: order.indexOf(q.c) }; }), i: 0, score: 0, answered: false, finished: false };
    renderQuestion();
  };
}
function quizItem(it) { const lq = locQ(it.src); return { q: lq.q, a: it.order.map(i => lq.a[i]), c: it.c, tr: trIf(lq === it.src) }; }
function renderQuestion() {
  const q = quizItem(quiz.qs[quiz.i]);
  let h = `<div class="qhead"><span>${T('Soru', 'Question')} ${quiz.i + 1}/10</span><span>${T('Skor', 'Score')} ${quiz.score}</span></div><div class="qcard"${q.tr}><div class="q">${md(q.q)}</div>`;
  /* cevaplanmis soru yeniden cizilince, dil ya da sekme degisimi, isaretler ve Sonraki butonu korunur */
  q.a.forEach((a, i) => { const cls = quiz.answered ? (i === q.c ? ' right' : i === quiz.pick ? ' wrong' : '') : ''; h += `<button class="opt${cls}" data-i="${i}">${md(a)}</button>`; });
  h += `</div><div id="qnext" style="margin-top:12px">${quiz.answered ? `<button class="btn" id="qn">${quiz.i === 9 ? T('Sonucu gör', 'See result') : T('Sonraki ›', 'Next ›')}</button>` : ''}</div>`;
  $('#v-quiz').innerHTML = h;
  const qn = $('#qn'); if (qn) qn.onclick = () => { quiz.answered = false; quiz.pick = null; if (quiz.i === 9) return finishQuiz(); quiz.i++; renderQuestion(); };
  $$('.opt').forEach(b => b.onclick = () => {
    if (quiz.answered) return;
    quiz.answered = true;
    quiz.pick = +b.dataset.i;
    if (quiz.pick === q.c) { quiz.score++; addXP(5); }
    persist();
    renderQuestion();
  });
}
function finishQuiz() {
  quiz.finished = true;
  st.quizBest = Math.max(st.quizBest, quiz.score);
  if (quiz.score === 10) st.quizPerfect = true;
  touchStreak();
  checkBadges();
  persist();
  const msg = quiz.score === 10 ? T('Kusursuz 👑', 'Flawless 👑') : quiz.score >= 7 ? T('Çok iyi 💪', 'Great job 💪') : quiz.score >= 4 ? T('Fena değil, tekrar dene', 'Not bad, try again') : T('Görevlere biraz daha zaman ayır', 'Spend a bit more time on the missions');
  $('#v-quiz').innerHTML = `<h2>${T('Sonuç', 'Result')}</h2><div class="hero"><div class="big">${quiz.score}/10</div><div class="muted">${msg}</div></div><button class="btn" id="qagain">${T('Tekrar', 'Again')}</button>`;
  $('#qagain').onclick = () => { quiz = null; renderQuizStart(); $('#qstart').click(); };
}

/* ---------- sozluk ---------- */

let manTab = 'all';
function learnedCommands() {
  const counts = {}; const examples = {};
  const skip = new Set(['sudo', 'submit', 'help', 'man', 'clear', 'cowsay', 'sl', 'fortune', 'matrix', 'neofetch', 'exit', 'cron-tick']);
  for (const line of sh.history) {
    for (const seg of line.split(/\s*(?:\|\||&&|\||;)\s*/)) {
      let toks = seg.trim().split(/\s+/);
      while (toks.length && /^[A-Za-z_]\w*=/.test(toks[0])) toks.shift();
      if (toks[0] === 'sudo') toks.shift();
      const c = toks[0];
      if (!c || skip.has(c) || !(COMMANDS[c] || LAB_EXT.commands[c])) continue;
      counts[c] = (counts[c] || 0) + 1;
      examples[c] = examples[c] || [];
      if (!examples[c].includes(seg.trim()) && examples[c].length < 3) examples[c].push(seg.trim());
    }
  }
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map(c => ({ c, n: counts[c], ex: examples[c], man: cmdDesc(c) }));
}
function cheatSheetText() {
  const list = learnedCommands();
  const lines2 = [T(`# Linux Lab, ${profName()} için komut özeti`, `# Linux Lab command summary for ${profName()}`), T(`${st.done.length} görev, ${sh.history.length} komut, ${list.length} farklı komut`, `${st.done.length} missions, ${sh.history.length} commands, ${list.length} distinct commands`), ''];
  list.forEach(x => { lines2.push(`## ${x.c}${x.man && x.man.d ? ' · ' + x.man.d : ''}`); x.ex.forEach(e => lines2.push('    $ ' + e)); lines2.push(''); });
  return lines2.join('\n');
}
function useCmd(c) { input.value = c; show('term'); input.focus(); }
function renderMan(filter = '') {
  const keys = Object.keys(Object.assign({}, LAB_EXT.manual, MANUAL, typeof EXPLAIN_DB !== 'undefined' ? EXPLAIN_DB : {})).sort();
  const descMemo = {};
  const descOf = k => descMemo[k] || (descMemo[k] = cmdDesc(k));
  let h = `<h2>📚 ${T('Komut Sözlüğü', 'Command Dictionary')}</h2><div class="seg"><button data-mt="all" class="${manTab === 'all' ? 'on' : ''}">${T('Tüm komutlar', 'All commands')}</button><button data-mt="mine" class="${manTab === 'mine' ? 'on' : ''}">${T('Öğrendiklerim', 'My commands')}</button></div>`;
  if (manTab === 'mine') {
    const list = learnedCommands();
    h += `<p class="muted small">${T(`Terminalde kullandığın komutlardan otomatik çıkarılan kişisel özet. ${list.length} komut, en çok kullandığın üstte.`, `A personal summary built from the commands you ran in the terminal. ${list.length} commands, most used first.`)}</p>`;
    h += `<div class="row" style="margin-bottom:12px"><button class="btn small" id="cs-copy">📋 ${T('Markdown kopyala', 'Copy as Markdown')}</button></div>`;
    if (!list.length) h += `<p class="muted">${T('Henüz komut yok. Terminale geç, birkaç görev yap.', 'No commands yet. Go to the terminal and do a few missions.')}</p>`;
    h += list.map(x => `<div class="mitem"><div class="c">${esc(x.c)} <span class="muted" style="font-weight:400;font-size:12px">· ${x.n} ${T('kez', x.n === 1 ? 'time' : 'times')}</span></div>${x.man && x.man.d ? `<div class="d"${trIf(x.man.tr)}>${esc(x.man.d)}</div>` : ''}<div class="ex">${x.ex.map(e => `<button data-e="${esc(e)}">$ ${esc(e)}</button>`).join('')}</div></div>`).join('');
    $('#v-man').innerHTML = h;
    $$('[data-mt]').forEach(b => b.onclick = () => { manTab = b.dataset.mt; renderMan(); });
    $$('#v-man .ex button').forEach(b => b.onclick = () => useCmd(b.dataset.e));
    $('#cs-copy').onclick = async () => { try { await navigator.clipboard.writeText(cheatSheetText()); toast(T('Kopyalandı, Notlar\'a yapıştır', 'Copied, paste it into your notes'), 'good'); } catch (e) { toast(T('Kopyalanamadı', 'Could not copy'), 'bad'); } };
    return;
  }
  h += `<input class="search" id="msearch" placeholder="${T('Komut ya da açıklama ara', 'Search commands or descriptions')}" value="${esc(filter)}"><div id="mlist"></div>`;
  $('#v-man').innerHTML = h;
  $$('[data-mt]').forEach(b => b.onclick = () => { manTab = b.dataset.mt; renderMan(); });
  const list = () => {
    const f = $('#msearch').value.toLowerCase();
    $('#mlist').innerHTML = keys.filter(k => !f || k.includes(f) || (descOf(k).d || '').toLowerCase().includes(f)).map(k => {
      const m = descOf(k);
      const ref = typeof explainRef === 'function' ? explainRef(k, true) : null;
      return `<div class="mitem"><div class="c">${esc(k)}</div><div class="d"${trIf(m.tr)}>${esc(m.d)}</div><div class="u">${(m.u || []).map(esc).join('\n')}</div><div class="ex">${(m.e || []).map(e => `<button data-e="${esc(e)}">$ ${esc(e)}</button>`).join('')}</div>${ref ? `<details class="opts"><summary>${T('Tüm seçenekler ve açıklamalı örnekler', 'All options and annotated examples')}</summary><div${trIf(m.tr)}>${ref}</div></details>` : ''}</div>`;
    }).join('');
    $$('#mlist .ex button, #mlist .xp-ex').forEach(b => b.onclick = () => useCmd(b.dataset.e));
  };
  $('#msearch').oninput = list;
  list();
}

/* ---------- editor sekmesi ---------- */

let edFile = null, edDir = null, edDirty = false;
function fileIcon(name, node) { if (node.t === 'd') return '📁'; if (/\.py$/.test(name)) return '🐍'; if (/\.ya?ml$/.test(name)) return '📄'; if (/\.tf$/.test(name)) return '🏗️'; if (/Dockerfile/.test(name)) return '🐳'; if (/\.(sh|cfg|ini|json|md|txt|yang|xml|j2)$/.test(name)) return '📝'; return '📄'; }
function runCmdFor(path) {
  const n = path.split('/').pop();
  if (/^test_.*\.py$|_test\.py$/.test(n)) return `pytest -q ${path}`;
  if (/\.py$/.test(n)) return `python3 ${path}`;
  if (/\.sh$/.test(n)) return `bash ${path}`;
  if (/playbook|\.ya?ml$/.test(n) && /ansible/.test(path)) return `ansible-playbook ${path}`;
  if (/\.tf$/.test(n)) return 'terraform plan';
  if (/^Dockerfile/.test(n)) return 'docker build -t app:dev .';
  if (/\.ya?ml$/.test(n) && /k8s|kube|manifest/.test(path)) return `kubectl apply -f ${path}`;
  if (/\.yang$/.test(n)) return `pyang -f tree ${path}`;
  return null;
}
function renderEditor() {
  const box = $('#v-editor');
  if (edDir === null || !sh.node(edDir)) edDir = sh.cwd;
  const dirNode = sh.node(edDir);
  const entries = dirNode && dirNode.t === 'd' ? Object.keys(dirNode.c).sort((a, b) => (dirNode.c[a].t === 'd' ? 0 : 1) - (dirNode.c[b].t === 'd' ? 0 : 1) || a.localeCompare(b)) : [];
  let h = `<div class="edbar"><button class="ghost" id="ed-up" ${edDir === '/' ? 'disabled' : ''}>‹</button><span class="edpath mono">${esc(edDir.replace(/^\/home\/burak/, '~'))}</span><button class="ghost" id="ed-new">${T('+ dosya', '+ file')}</button><button class="ghost" id="ed-cwd" title="${T('terminalin dizinine git', 'go to the terminal directory')}">cd</button></div>`;
  h += `<div class="edfiles">${entries.filter(n => !n.startsWith('.') || n === '.github' || n === '.gitignore' || n === '.dockerignore').map(n => { const nd = dirNode.c[n]; const p = (edDir === '/' ? '' : edDir) + '/' + n; return `<button class="edf ${edFile === p ? 'on' : ''}" data-p="${esc(p)}" data-t="${nd.t}">${fileIcon(n, nd)} ${esc(n)}${nd.t === 'd' ? '/' : ''}</button>`; }).join('') || `<span class="muted small">${T('boş dizin', 'empty directory')}</span>`}</div>`;
  if (edFile) {
    const node = sh.node(edFile);
    const run = runCmdFor(edFile);
    h += `<div class="edhead"><span class="mono">${esc(edFile.replace(/^\/home\/burak/, '~'))}${edDirty ? ' •' : ''}</span><span class="row"><button class="btn small alt" id="ed-save2">${T('Kaydet', 'Save')}</button>${run ? `<button class="btn small" id="ed-run">▶ ${esc(run.split(' ')[0])}</button>` : ''}</span></div>`;
    h += `<textarea id="ed-area" class="edarea" spellcheck="false" autocapitalize="none" autocorrect="off">${esc(node && node.t === 'f' ? node.d : '')}</textarea>`;
    h += `<div class="small muted" style="margin-top:6px">${T('Tab 4 boşluk ekler. Kaydet dosyayı sanal diske yazar, ▶ terminalde çalıştırır.', 'Tab inserts 4 spaces. Save writes the file to the virtual disk, ▶ runs it in the terminal.')}</div>`;
  } else h += `<p class="muted small" style="margin-top:12px">${T('Düzenlemek için bir dosya seç ya da + dosya ile yeni oluştur. Terminalde <code>nano</code> ve <code>vim</code> de çalışır.', 'Pick a file to edit or create one with + file. <code>nano</code> and <code>vim</code> also work in the terminal.')}</p>`;
  box.innerHTML = h;
  $('#ed-up').onclick = () => { edDir = edDir.split('/').slice(0, -1).join('/') || '/'; renderEditor(); };
  $('#ed-cwd').onclick = () => { edDir = sh.cwd; renderEditor(); };
  $('#ed-new').onclick = () => { const n = prompt(T('Dosya adı', 'File name')); if (!n) return; const p = (edDir === '/' ? '' : edDir) + '/' + n; if (!sh.node(p)) { const e = sh.writeFile(p, '', false, 'editor'); if (e) return toast(e, 'bad'); persist(); } edFile = p; edDirty = false; renderEditor(); };
  $$('.edf').forEach(b => b.onclick = () => { if (b.dataset.t === 'd') { edDir = b.dataset.p; } else { if (edDirty && !confirm(T('Kaydedilmemiş değişiklik var, vazgeç?', 'You have unsaved changes, discard them?'))) return; edFile = b.dataset.p; edDirty = false; } renderEditor(); });
  const ta = $('#ed-area');
  if (ta) {
    ta.oninput = () => { if (!edDirty) { edDirty = true; const hd = $('#v-editor .edhead .mono'); if (hd) hd.textContent += ' •'; } };
    ta.onkeydown = e => {
      if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart, en = ta.selectionEnd; ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(en); ta.selectionStart = ta.selectionEnd = s + 4; ta.oninput(); }
      else if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveEditor(); }
      else if (e.key === 'Enter') { const s = ta.selectionStart; const line = ta.value.slice(0, s).split('\n').pop(); const ind = (/^\s*/.exec(line) || [''])[0] + (/[:{\[(]\s*$/.test(line) ? '    ' : ''); if (ind) { e.preventDefault(); ta.value = ta.value.slice(0, s) + '\n' + ind + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 1 + ind.length; ta.oninput(); } }
    };
    $('#ed-save2').onclick = saveEditor;
    const rb = $('#ed-run'); if (rb) rb.onclick = () => { saveEditor(); const c = runCmdFor(edFile); const rel = edFile.startsWith(sh.cwd + '/') ? edFile.slice(sh.cwd.length + 1) : edFile; execute(c.replace(edFile, rel)); if (!isDesk()) show('term'); };
  }
}
function saveEditor() {
  const ta = $('#ed-area'); if (!ta || !edFile) return;
  let text = ta.value; if (text && !text.endsWith('\n')) text += '\n';
  const e = sh.writeFile(edFile, text, false, 'editor');
  if (e) return toast(e, 'bad');
  edDirty = false; persist(); renderEditor();
  toast(T('Kaydedildi', 'Saved'), 'good', 1200);
  evaluate('editor', '', null);
}

/* mobil "daha" sekmesi */
function renderMore() {
  $('#v-more').innerHTML = `<div class="grid2"><button class="tile" data-go="quiz"><div class="e">🎓</div><div class="t">Quiz</div></button><button class="tile" data-go="man"><div class="e">📚</div><div class="t">${T('Sözlük', 'Dictionary')}</div></button><button class="tile" data-go="me"><div class="e">👤</div><div class="t">${T('Profil', 'Profile')}</div></button><button class="tile" data-go="home"><div class="e">🗺️</div><div class="t">${T('Bölümler', 'Chapters')}</div></button></div>`;
  $$('#v-more [data-go]').forEach(b => b.onclick = () => show(b.dataset.go));
}

/* Python runtime rozeti */
function renderPyChip() {
  const el = $('#pychip'); if (!el) return;
  const s = PY.status;
  el.className = 'chip py ' + s;
  /* mobilde sadece ikon kalir, durum rengi chip sinifinda */
  const word = s === 'ready' ? T('hazır', 'ready') : s === 'loading' ? pyMsg() || T('yükleniyor', 'loading') : s === 'error' ? T('hata', 'error') : '';
  el.innerHTML = '🐍' + (word ? `<span class="full"> ${esc(word)}</span>` : '');
  el.title = pyMsg();
}
/* py.js durum mesaji yuklenirken aktif dilde gelir, dil sonradan degisirse bilinenler ceviriyle eslenir */
const PY_MSG = [['Python runtime yükleniyor', 'Loading the Python runtime'], ['Paketler yükleniyor, pytest, pyyaml, jinja2, lxml', 'Loading packages, pytest, pyyaml, jinja2, lxml'], ['Python 3.14 hazır', 'Python 3.14 ready']];
function pyMsg() { const m = PY.msg || ''; const hit = PY_MSG.find(x => x.includes(m)); return hit ? T(hit[0], hit[1]) : m; }
PY.onStatus = () => { renderPyChip(); if (PY.status === 'ready') toast(T('Python hazır', 'Python is ready'), 'good', 1500); if (PY.status === 'error') toast(T('Python yüklenemedi, ', 'Python failed to load, ') + PY.msg, 'bad', 5000); };

/* ---------- profil ---------- */

function renderMe() {
  let h = `<h2>${profIcon()} ${esc(profName())}</h2><div class="grid2">
    <div class="stat"><div class="v">${st.xp}</div><div class="l">${T('Toplam XP', 'Total XP')}</div></div>
    <div class="stat"><div class="v">Lv ${level()}</div><div class="l">${esc(title())}</div></div>
    <div class="stat"><div class="v">${st.done.length}/${ALL.length}</div><div class="l">${T('Görev', 'Missions')}</div></div>
    <div class="stat"><div class="v">${st.cmds}</div><div class="l">${T('Komut', 'Commands')}</div></div>
    <div class="stat"><div class="v">🔥 ${st.streak}</div><div class="l">${T('Gün serisi', 'Day streak')}</div></div>
    <div class="stat"><div class="v">${st.quizBest}/10</div><div class="l">${T('Quiz rekoru', 'Quiz best')}</div></div>
    <div class="stat"><div class="v">${st.dailyDone || 0}</div><div class="l">${T('Günlük set tamam', 'Daily sets done')}</div></div>
    <div class="stat"><div class="v">${esc(modeLabel(modeOf()))}</div><div class="l">${T('Zorluk', 'Difficulty')}</div></div></div>`;
  h += `<h3>${T('Profiller', 'Profiles')}</h3>`;
  PROFILES.forEach(p => { h += `<button class="prof ${p.id === PROFILE ? 'on' : ''}" data-p="${p.id}"><span class="ic">${p.icon}</span><span><div class="nm">${esc(p.name)}</div><div class="sub">${p.id === PROFILE ? T('aktif', 'active') : T('geç', 'switch')}</div></span>${PROFILES.length > 1 ? `<span class="del" data-del="${p.id}" title="${T('sil', 'delete')}">🗑</span>` : ''}</button>`; });
  h += `<div class="row" style="margin-top:6px"><input type="text" id="np-name" placeholder="${T('Yeni profil adı', 'New profile name')}" class="search" style="margin:0;flex:1;min-width:120px"><button class="btn small" id="np-add">${T('Ekle', 'Add')}</button></div>`;
  h += `<h3 id="sync-card">${T('Cihazlar arası senkron', 'Sync across devices')}</h3><div class="card"><p class="small muted" style="margin:0 0 8px">${T("Senkron kapalıyken ilerleme sadece bu tarayıcıda durur, başka tarayıcı ya da cihaz baştan başlar. Senkron GitHub hesabındaki gizli bir gist'e yazar. Token sadece cihazda saklanır, aynı siteden açılan Linux Lab ve NetDevOps Lab ortak kullanır.", 'With sync off, progress stays in this browser only and any other browser or device starts from scratch. Sync writes to a secret gist in your GitHub account. The token is stored only on this device and is shared by Linux Lab and NetDevOps Lab on the same site.')}</p>
    ${SYNC.token ? '' : T(`<ol class="small" style="margin:0 0 10px;padding-left:18px"><li><a href="https://github.com/settings/tokens/new?scopes=gist&description=Lab%20sync" target="_blank" rel="noopener">Bu linkle token oluştur</a>, sadece gist kutusu işaretli gelir, Generate token</li><li>ghp_ ile başlayan token'ı aşağıya yapıştır, Bağlan</li><li>Diğer cihazda Profil, Senkron altındaki linki aç ya da aynı token'ı gir</li></ol>`, `<ol class="small" style="margin:0 0 10px;padding-left:18px"><li><a href="https://github.com/settings/tokens/new?scopes=gist&description=Lab%20sync" target="_blank" rel="noopener">Create a token with this link</a>, only the gist box comes checked, then Generate token</li><li>Paste the token starting with ghp_ below and press Connect</li><li>On the other device open the link under Profile, Sync, or enter the same token</li></ol>`)}
    <div class="row"><input type="password" id="gh-token" placeholder="ghp_… token" class="search" style="margin:0;flex:1;min-width:140px" value="${esc(SYNC.token)}"><button class="btn small" id="gh-connect">${SYNC.token ? T('Güncelle', 'Update') : T('Bağlan', 'Connect')}</button>${SYNC.token ? `<button class="ghost" id="gh-off">${T('Kapat', 'Turn off')}</button>` : ''}</div>
    <div class="small muted" id="gh-status" style="margin-top:8px">${SYNC.token ? (SYNC.msgPair && (SYNC.msg = T(SYNC.msgPair[0], SYNC.msgPair[1])), SYNC.status === 'err' ? '⚠️ ' + esc(SYNC.msg) : T('☁︎ Bağlı', '☁︎ Connected') + (SYNC.msg ? ' · ' + esc(SYNC.msg) : '')) : T('Kapalı', 'Off')}</div>
    ${SYNC.token ? `<div class="row" style="margin-top:8px"><button class="ghost" id="gh-pull">⬇ ${T('Şimdi çek', 'Pull now')}</button><button class="ghost" id="gh-push">⬆ ${T('Şimdi gönder', 'Push now')}</button><button class="ghost" id="gh-link">🔗 ${T('Diğer cihaz için link', 'Link for another device')}</button></div><p class="small muted" style="margin:8px 0 0">${T('Link token içerir, sadece kendine gönder. Diğer cihazda açınca senkron otomatik kurulur.', 'The link contains your token, send it only to yourself. Opening it on the other device sets up sync automatically.')}</p>` : ''}</div>`;
  h += `<h3>${T('Ayarlar', 'Settings')}</h3><div class="card">`;
  h += `<div class="toggle"><span>${T('Dil', 'Language')}</span><span class="seg lang-seg" style="margin:0"><button data-lang="tr" lang="tr" class="${isEnUI() ? '' : 'on'}">Türkçe</button><button data-lang="en" lang="en" class="${isEnUI() ? 'on' : ''}">English</button></span></div>`;
  h += `<label class="toggle"><span>${T('Görev bitince otomatik sıradakine geç', 'Move to the next mission automatically')}</span><input type="checkbox" id="s-auto" ${st.auto !== false ? 'checked' : ''}></label>`;
  h += `<label class="toggle"><span>${T('Zorluk', 'Difficulty')}</span><select id="s-mode">${Object.keys(MODES).map(k => `<option value="${k}" ${modeOf() === k ? 'selected' : ''}>${modeLabel(k)}</option>`).join('')}</select></label></div>`;
  h += `<h3>${T('Rozetler', 'Badges')}</h3><div class="badges">`;
  BADGES.forEach(b0 => { const b = locB(b0); const on = st.badges.includes(b.id); h += `<div class="badge ${on ? '' : 'off'}"${bTr(b0)}><div class="e">${b.icon}</div><div class="t">${esc(b.title)}</div><div class="muted">${esc(b.desc)}</div></div>`; });
  h += `</div><h3>${T('Sıfırlama', 'Reset')}</h3>`;
  h += `<p class="muted small">${T("Sanal filesystem'i bozduysan sadece onu sıfırla, ilerlemen kalır.", 'If you broke the virtual filesystem, reset just that and keep your progress.')}</p>`;
  h += `<div class="row"><button class="ghost" id="rs-fs">${T("Filesystem'i sıfırla", 'Reset filesystem')}</button><button class="ghost danger" id="rs-all">${T('Bu profili sıfırla', 'Reset this profile')}</button></div>`;
  h += `<p class="muted small" style="margin-top:24px">${T('Python kodu gerçek, Pyodide ile tarayıcıda Python 3.14 çalışır. Cihazlar, API, Docker, Kubernetes, Ansible ve Terraform simülasyondur, komut ve çıktı biçimleri gerçeğe sadık tutuldu.', 'Python code is real, Python 3.14 runs in the browser through Pyodide. Devices, API, Docker, Kubernetes, Ansible and Terraform are simulated, with command and output formats kept true to the real tools.')}</p>`;
  $('#v-me').innerHTML = h;
  $$('.prof').forEach(b => b.onclick = e => {
    const del = e.target.closest('[data-del]');
    if (del) { const p = PROFILES.find(x => x.id === del.dataset.del); if (confirm(T(`${p.name} profili ve tüm ilerlemesi silinsin mi?`, `Delete profile ${p.name} and all its progress?`))) { deleteProfile(p.id); renderMe(); } return; }
    if (b.dataset.p !== PROFILE) { useProfile(b.dataset.p); show('me'); toast(T(`${profName()} profiline geçildi`, `Switched to ${profName()}`), 'good'); }
  });
  $('#np-add').onclick = () => { const n = $('#np-name').value.trim(); if (!n) return; addProfile(n); show('me'); };
  $('#gh-connect').onclick = async () => { const tok = $('#gh-token').value.trim(); if (!tok) return toast(T('Token gir', 'Enter a token'), 'bad'); $('#gh-status').textContent = T('Bağlanıyor…', 'Connecting…'); await SYNC.connect(tok); renderMe(); };
  const off = $('#gh-off'); if (off) off.onclick = () => { SYNC.token = ''; SYNC.ready = false; ['labs.gh.token', 'll.gh.token', 'nd.gh.token', 'll.gh.gist', 'nd.gh.gist'].forEach(drop); SYNC.gist = ''; SYNC.set('off'); renderMe(); };
  const pl = $('#gh-pull'); if (pl) pl.onclick = async () => { try { const ch = await SYNC.pull(); if (ch) { loadProfiles(); useProfile(PROFILES.some(p => p.id === PROFILE) ? PROFILE : PROFILES[0].id); toast(T('Güncel ilerleme alındı', 'Latest progress loaded'), 'good'); } else toast(T('Zaten güncel', 'Already up to date'), 'good'); } catch (e) { SYNC.set('err', String(e.message || e)); toast(T('Çekilemedi', 'Pull failed'), 'bad'); } renderMe(); };
  const gl = $('#gh-link'); if (gl) gl.onclick = async () => { const u = syncLink(); try { await navigator.clipboard.writeText(u); toast(T('Link kopyalandı, diğer cihazda aç', 'Link copied, open it on the other device'), 'good'); } catch (e) { prompt(T('Bu linki kopyala', 'Copy this link'), u); } };
  const ps = $('#gh-push'); if (ps) ps.onclick = async () => { await SYNC.push(); toast(SYNC.status === 'ok' ? T('Gönderildi', 'Pushed') : T('Gönderilemedi', 'Push failed'), SYNC.status === 'ok' ? 'good' : 'bad'); renderMe(); };
  $$('#v-me [data-lang]').forEach(b => b.onclick = e => { e.preventDefault(); setLang(b.dataset.lang); });
  $('#s-auto').onchange = e => { st.auto = e.target.checked; persist(); };
  $('#s-mode').onchange = e => { st.mode = e.target.value; persist(); renderMission(); };
  $('#rs-fs').onclick = () => { if (confirm(T('Filesystem, process\'ler ve servisler ilk haline dönsün mü?', 'Restore the filesystem, processes and services to their initial state?'))) { sh.reset(); term.innerHTML = ''; welcome(); renderPrompt(); persist(); edFile = null; toast(T('Sıfırlandı', 'Reset done'), 'good'); } };
  $('#rs-all').onclick = () => { if (confirm(T(`${profName()} profilinin XP, rozet ve görev ilerlemesi silinecek. Baştan oynarken görevler farklı senaryolarla gelir. Emin misin?`, `XP, badges and mission progress of ${profName()} will be deleted. When you play again the missions come with different scenarios. Are you sure?`))) { const r = (st.round || 0) + 1; save(stKey(PROFILE), JSON.stringify({ lang: st.lang, langAt: st.langAt })); drop(shKey(PROFILE)); useProfile(PROFILE); st.round = r; persist(); show('me'); } };
}

/* profil secici, ust bardaki chip */
function openWho() {
  let h = `<h2>${T('Profil seç', 'Choose profile')}</h2>`;
  PROFILES.forEach(p => { h += `<button class="prof ${p.id === PROFILE ? 'on' : ''}" data-p="${p.id}"><span class="ic">${p.icon}</span><span><div class="nm">${esc(p.name)}</div><div class="sub">${p.id === PROFILE ? T('aktif', 'active') : ''}</div></span></button>`; });
  h += `<div class="row" style="margin-top:8px"><input type="text" id="wp-name" placeholder="${T('Yeni profil adı', 'New profile name')}" class="search" style="margin:0;flex:1;min-width:120px"><button class="btn small" id="wp-add">${T('Ekle', 'Add')}</button></div><div class="row" style="margin-top:12px;justify-content:flex-end"><button class="ghost" id="wp-close">${T('Kapat', 'Close')}</button></div>`;
  $('#whosheet').innerHTML = h;
  $('#whobox').classList.remove('hidden');
  $$('#whosheet .prof').forEach(b => b.onclick = () => { if (b.dataset.p !== PROFILE) { useProfile(b.dataset.p); toast(T(`${profName()} profiline geçildi`, `Switched to ${profName()}`), 'good'); } closeWho(); });
  $('#wp-add').onclick = () => { const n = $('#wp-name').value.trim(); if (!n) return; addProfile(n); closeWho(); };
  $('#wp-close').onclick = closeWho;
}
function closeWho() { $('#whobox').classList.add('hidden'); }
function openSheet(html) { $('#whosheet').innerHTML = html; $('#whobox').classList.remove('hidden'); const c = $('#sh-close'); if (c) c.onclick = closeWho; $$('#whosheet .xp-ex').forEach(b => b.onclick = () => { closeWho(); useCmd(b.dataset.e); }); }
$('#whobox').addEventListener('click', e => { if (e.target.id === 'whobox') closeWho(); });
$('#who').onclick = openWho;
{ const lc = $('#lang'); if (lc) lc.onclick = () => setLang(isEnUI() ? 'tr' : 'en'); }

/* ---------- baslat ---------- */

$$('#tabs button').forEach(b => b.onclick = () => show(b.dataset.v));
loadProfiles();
useProfile(PROFILES.some(p => p.id === load(KEY_CUR)) ? load(KEY_CUR) : PROFILES[0].id);
show(isDesk() ? 'mission' : (st.current ? 'term' : 'home'));
setTimeout(() => PY.load().catch(() => {}), 300);
const syncHash = /[#&]sync=([^&]+)/.exec(location.hash);
if (syncHash) { history.replaceState(null, '', location.pathname + location.search); SYNC.connect(decodeURIComponent(syncHash[1])).then(() => renderAll()); }
else if (SYNC.token) { SYNC.set('busy'); syncPullReload(false).finally(() => { SYNC.ready = true; syncLater(); }); }
if (typeof explainRef === 'function' && COMMANDS.man) {
  const origMan = COMMANDS.man;
  /* Ingilizce modda komutun Ingilizce explain katmani varsa sadece o basilir, Turkce MANUAL metni gosterilmez */
  COMMANDS.man = function (args, stdin) { if (isEnUI() && args[0] && hasI18n() && I18N_EN.x[args[0]]) { const enRef = explainRef(args[0]); if (enRef) return ok(enRef); } const r = origMan.call(this, args, stdin) || ok(); const ref = args[0] && explainRef(args[0]); if (ref) r.out = (r.out || '') + T('\nSEÇENEKLER VE ÖRNEKLER\n', '\nOPTIONS AND EXAMPLES\n') + ref; if (r.out && r.err && ref) r.err = ''; if (!r.out && ref) { r.out = ref; r.err = ''; r.code = 0; } return r; };
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
