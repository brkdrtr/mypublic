'use strict';
/* Linux Lab arayuz mantigi. Sol terminal, sag panel. Profil bazli state, GitHub Gist ile cihazlar arasi senkron. */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* depolama yok */ } }
function drop(k) { try { localStorage.removeItem(k); } catch (e) { /* yok */ } }

const ALL = CHAPTERS.flatMap(c => c.missions.map(m => ({ ...m, chapter: c.id })));
const TITLES = ['Çaylak', 'Meraklı', 'Terminal Kaşifi', 'Pipe Çırağı', 'Script Kiddie', 'Junior Sysadmin', 'Sysadmin', 'Log Avcısı', 'Kıdemli Sysadmin', 'Kernel Fısıldayan', 'Root'];
const DEF_ST = { done: [], xp: 0, cmds: 0, streak: 0, lastDay: null, noHint: 0, hinted: [], quizBest: 0, quizPerfect: false, secret: false, current: null, badges: [], mode: 'normal', daily: null, dailyDone: 0, revealed: [], auto: true, updatedAt: 0 };

/* ---------- profiller ---------- */

const KEY_PROFILES = 'll.profiles';
const KEY_CUR = 'll.profile';
const ICONS = ['🐧', '🦊', '🐺', '🦉', '🐙', '🦄', '🐉', '🦅'];
let PROFILES = [];
let PROFILE = null;
let st = null;
let sh = null;

function stKey(id) { return 'll.state.v2.' + id; }
function shKey(id) { return 'll.shell.v2.' + id; }
function loadProfiles() {
  try { PROFILES = JSON.parse(load(KEY_PROFILES) || 'null') || []; } catch (e) { PROFILES = []; }
  if (!PROFILES.length) {
    PROFILES = [{ id: 'burak', name: 'Burak', icon: '🐧' }];
    /* eski tek profilli veriyi tasi */
    const oldSt = load('ll.state.v1'), oldSh = load('ll.shell.v1');
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
  sh = new Shell(load(shKey(id)));
  quiz = null; hintShown = false; solShown = false; stepsShown = false;
  term.innerHTML = '';
  welcome();
  renderPrompt();
  renderTop();
  renderAll();
}
function addProfile(name) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'p' + Date.now();
  if (PROFILES.some(p => p.id === id)) return toast('Bu isimde profil var', 'bad');
  PROFILES.push({ id, name, icon: ICONS[PROFILES.length % ICONS.length] });
  save(KEY_PROFILES, JSON.stringify(PROFILES));
  useProfile(id);
  toast(`${name} profili açıldı`, 'good');
  syncLater();
}
function deleteProfile(id) {
  if (PROFILES.length <= 1) return toast('Son profil silinemez', 'bad');
  PROFILES = PROFILES.filter(p => p.id !== id);
  save(KEY_PROFILES, JSON.stringify(PROFILES));
  drop(stKey(id)); drop(shKey(id));
  if (PROFILE === id) useProfile(PROFILES[0].id);
  syncLater();
}
function persist() {
  if (!PROFILE) return;
  st.updatedAt = Date.now();
  save(stKey(PROFILE), JSON.stringify(st));
  save(shKey(PROFILE), sh.serialize());
  syncLater();
}

/* ---------- senkron, GitHub Gist ---------- */

const SYNC = {
  token: load('ll.gh.token') || '',
  gist: load('ll.gh.gist') || '',
  status: 'off', msg: '', tm: null, busy: false,
  api(path, method, body) {
    return fetch('https://api.github.com' + path, { method: method || 'GET', headers: { Authorization: 'Bearer ' + this.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(async r => { if (!r.ok) throw new Error('GitHub ' + r.status); return r.status === 204 ? null : r.json(); });
  },
  payload() {
    const states = {};
    PROFILES.forEach(p => { let s = null; try { s = JSON.parse(load(stKey(p.id)) || 'null'); } catch (e) { s = null; } states[p.id] = { st: s, sh: load(shKey(p.id)) || null, updatedAt: s ? s.updatedAt || 0 : 0 }; });
    return { v: 2, profiles: PROFILES, states, savedAt: Date.now() };
  },
  set(status, msg) { this.status = status; this.msg = msg || ''; const el = $('#sync'); if (!el) return; el.className = 'chip sync ' + (status === 'ok' ? 'ok' : status === 'err' ? 'err' : status === 'busy' ? 'busy' : ''); el.textContent = status === 'ok' ? '☁︎' : status === 'err' ? '☁︎!' : status === 'busy' ? '☁︎…' : '·'; el.title = msg || (status === 'ok' ? 'Senkron' : 'Senkron kapalı'); },
  async findGist() {
    if (this.gist) return this.gist;
    const list = await this.api('/gists?per_page=100');
    const g = list.find(x => x.description === 'linux-lab-sync' && x.files && x.files['linux-lab.json']);
    if (g) { this.gist = g.id; save('ll.gh.gist', g.id); return g.id; }
    return null;
  },
  async pull() {
    if (!this.token) return false;
    this.set('busy', 'Çekiliyor');
    const id = await this.findGist();
    if (!id) { this.set('ok', 'Gist henüz yok, ilk kayıtta oluşur'); return false; }
    const g = await this.api('/gists/' + id);
    const f = g.files && g.files['linux-lab.json'];
    if (!f) { this.set('ok'); return false; }
    let raw = f.content;
    if (f.truncated) raw = await fetch(f.raw_url).then(r => r.text());
    let data; try { data = JSON.parse(raw); } catch (e) { this.set('err', 'Gist bozuk'); return false; }
    let changed = false;
    (data.profiles || []).forEach(p => { if (!PROFILES.some(x => x.id === p.id)) { PROFILES.push(p); changed = true; } });
    Object.entries(data.states || {}).forEach(([pid, s]) => {
      if (!s || !s.st) return;
      let loc = null; try { loc = JSON.parse(load(stKey(pid)) || 'null'); } catch (e) { loc = null; }
      if (!loc || (s.updatedAt || 0) > (loc.updatedAt || 0)) { save(stKey(pid), JSON.stringify(s.st)); if (s.sh) save(shKey(pid), s.sh); changed = true; }
    });
    if (changed) save(KEY_PROFILES, JSON.stringify(PROFILES));
    this.set('ok', 'Son çekme ' + new Date().toLocaleTimeString('tr-TR'));
    return changed;
  },
  async push() {
    if (!this.token || this.busy) return;
    this.busy = true;
    try {
      this.set('busy', 'Gönderiliyor');
      const body = { description: 'linux-lab-sync', public: false, files: { 'linux-lab.json': { content: JSON.stringify(this.payload()) } } };
      const id = await this.findGist();
      if (id) await this.api('/gists/' + id, 'PATCH', body);
      else { const g = await this.api('/gists', 'POST', body); this.gist = g.id; save('ll.gh.gist', g.id); }
      this.set('ok', 'Son gönderme ' + new Date().toLocaleTimeString('tr-TR'));
    } catch (e) { this.set('err', String(e.message || e)); }
    this.busy = false;
  },
  async connect(token) {
    this.token = token.trim(); save('ll.gh.token', this.token); this.gist = ''; drop('ll.gh.gist');
    if (!this.token) { this.set('off'); return; }
    try {
      const changed = await this.pull();
      if (changed) { loadProfiles(); useProfile(PROFILES.some(p => p.id === PROFILE) ? PROFILE : PROFILES[0].id); toast('Diğer cihazdaki ilerleme alındı', 'good'); }
      await this.push();
      toast('Senkron açık', 'good');
    } catch (e) { this.set('err', String(e.message || e)); toast('Bağlanamadı, token ve gist yetkisini kontrol et', 'bad'); }
  },
};
function syncLater() { if (!SYNC.token) return; clearTimeout(SYNC.tm); SYNC.tm = setTimeout(() => SYNC.push(), 4000); }
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
function title() { return TITLES[Math.min(level() - 1, TITLES.length - 1)]; }

function renderTop() {
  $('#streak').textContent = '🔥 ' + st.streak;
  $('#level').innerHTML = 'Lv ' + level() + '<span class="full"> · ' + esc(title()) + '</span>';
  $('#xpfill').style.width = ((st.xp % 120) / 120 * 100) + '%';
  $('#who').textContent = profIcon() + ' ' + profName();
  const m = ALL.find(x => x.id === st.current);
  $('#topmis').innerHTML = m ? `<b>${esc(m.title)}</b> · ${esc(CHAPTERS.find(c => c.id === m.chapter).title)} · +${xpFor(m)} XP` : 'Serbest terminal';
  const p = sh.prompt();
  $('#ttitle').textContent = `${p.user}: ${p.path}`;
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
      setTimeout(() => toast(`${b.icon} Yeni rozet <b>${esc(b.title)}</b>`, 'good'), 900);
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
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v || (v === 'chapter' && b.dataset.v === 'home')));
  if (v === 'mission') renderMission();
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
  if (d.done.length === d.ids.length && !d.bonus) { d.bonus = true; st.dailyDone = (st.dailyDone || 0) + 1; addXP(30); setTimeout(() => toast('🎁 Günün 3 görevi tamam, +30 bonus XP', 'good'), 1200); }
}
const MODES = { guided: { label: 'Rehberli', desc: 'Adımlar ve ipucu baştan açık, acele yok', mult: 0.8 }, normal: { label: 'Normal', desc: 'Görev metni var, adımları istersen açarsın', mult: 1 }, expert: { label: 'Uzman', desc: 'Sadece semptom, görev gizli, %50 bonus XP', mult: 1.5 } };
function modeOf() { return MODES[st.mode] ? st.mode : 'normal'; }
function xpFor(m) { const base = Math.round(m.xp * MODES[modeOf()].mult); return modeOf() === 'expert' && (st.hinted.includes(m.id) || st.revealed.includes(m.id)) ? m.xp : base; }

function renderHome() {
  const nm = nextMission();
  const total = ALL.length;
  let h = `<div class="hero"><div class="muted small">Hoş geldin, ${esc(profName())}</div><div class="big">${st.done.length}/${total} görev tamam</div>`;
  h += `<div class="muted small" style="margin-top:2px">${nm ? 'Sıradaki görev ' + esc(nm.title) : 'Tüm görevler bitti. Artık serbest terminalde istediğini dene.'}</div><div class="prog"><div style="width:${st.done.length / total * 100}%"></div></div>`;
  h += `<div class="row">${nm ? `<button class="btn" id="go-next">▶ Devam et</button>` : ''}<button class="btn alt" id="go-free">Serbest terminal</button></div></div>`;
  const d = dailyMissions();
  h += `<h3>Günün görevleri <span style="text-transform:none;letter-spacing:0;font-weight:400">· ${d.done.length}/3${d.bonus ? ' · bonus alındı 🎁' : ' · hepsi bitince +30 XP'}</span></h3>`;
  d.ids.forEach(id => {
    const m = ALL.find(x => x.id === id); if (!m) return;
    const ch = CHAPTERS.find(c => c.id === m.chapter);
    const ok = d.done.includes(id) || st.done.includes(id);
    h += `<button class="mis ${ok ? 'done' : ''} ${st.current === id ? 'cur' : ''}" data-m="${m.id}"><span class="n">${ok ? '✓' : ch.icon}</span><span style="min-width:0"><span>${esc(m.title)}</span><div class="muted" style="font-size:12px">${esc(ch.title)}</div></span><span class="xp">+${xpFor(m)}</span></button>`;
  });
  h += `<h3>Zorluk</h3><div class="seg">${Object.keys(MODES).map(k => `<button data-mode="${k}" class="${modeOf() === k ? 'on' : ''}">${MODES[k].label}</button>`).join('')}</div><p class="muted small" style="margin:-4px 0 12px">${esc(MODES[modeOf()].desc)}</p>`;
  h += '<h3>Bölümler</h3>';
  CHAPTERS.forEach((c, i) => {
    const p = chapterProgress(c);
    const cur = ALL.find(x => x.id === st.current);
    h += `<button class="chap ${cur && cur.chapter === c.id ? 'cur' : ''}" data-c="${c.id}"><div class="ic">${c.icon}</div><div style="flex:1;min-width:0"><div class="t">${i + 1}. ${esc(c.title)}</div><div class="s">${esc(c.sub)}</div><div class="prog"><div style="width:${p.d / p.t * 100}%"></div></div></div><div class="meta">${p.d}/${p.t}</div></button>`;
  });
  $('#v-home').innerHTML = h;
  const gn = $('#go-next'); if (gn) gn.onclick = () => startMission(nm.id);
  $('#go-free').onclick = () => { st.current = null; persist(); renderTop(); renderMission(); show('term'); if (isDesk()) show('mission'); };
  $$('.chap').forEach(b => b.onclick = () => renderChapter(b.dataset.c));
  $$('#v-home .mis').forEach(b => b.onclick = () => startMission(b.dataset.m));
  $$('[data-mode]').forEach(b => b.onclick = () => { st.mode = b.dataset.mode; persist(); renderHome(); renderMission(); });
}

function renderChapter(cid) {
  const c = CHAPTERS.find(x => x.id === cid);
  let h = `<button class="back" id="bk">‹ Bölümler</button><h2>${c.icon} ${esc(c.title)}</h2><p class="muted small" style="margin-top:-6px">${esc(c.sub)}</p>`;
  c.missions.forEach((m, i) => {
    const done = st.done.includes(m.id);
    h += `<button class="mis ${done ? 'done' : ''} ${st.current === m.id ? 'cur' : ''}" data-m="${m.id}"><span class="n">${done ? '✓' : i + 1}</span><span>${esc(m.title)}</span><span class="xp">+${m.xp}</span></button>`;
  });
  $('#v-chapter').innerHTML = h;
  $('#bk').onclick = () => show('home');
  $$('#v-chapter .mis').forEach(b => b.onclick = () => startMission(b.dataset.m));
  currentView = 'chapter';
  $$('.view').forEach(x => x.classList.toggle('active', x.id === 'v-chapter'));
}

/* ---------- gorev paneli ---------- */

let hintShown = false, solShown = false, stepsShown = false, autoTm = null;
function startMission(id) {
  const m = ALL.find(x => x.id === id);
  if (!m) return;
  clearTimeout(autoTm); autoTm = null;
  st.current = id;
  hintShown = false; solShown = false; stepsShown = false;
  if (m.setup) { try { m.setup(sh); } catch (e) { /* yok say */ } }
  persist();
  renderTop();
  printSys(`\n── Görev ${m.title} ──\n`, 'mhead');
  renderMission();
  if (isDesk()) { show('mission'); input.focus(); } else show('term');
}

/* Cozumun her satiri bir adim. Kullanicinin komutu ayni komutla basliyor ve kelimelerin cogu tutuyorsa isaretlenir */
function stepsOf(m) {
  return String(m.solution || '').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
}
function stepDone(step, lines) {
  const norm = s => s.replace(/^sudo\s+/, '').replace(/\s+/g, ' ').trim();
  const t = norm(step);
  const cmd = t.split(' ')[0];
  const toks = t.split(' ');
  return lines.some(l => {
    const u = norm(l);
    if (u === t) return true;
    if (u.split(' ')[0] !== cmd) return false;
    const hit = toks.filter(x => u.includes(x)).length;
    return hit / toks.length >= 0.6;
  });
}
function renderMission() {
  const box = $('#v-mission');
  const m = ALL.find(x => x.id === st.current);
  if (!m) {
    box.innerHTML = `<div class="card"><div style="font-weight:700;margin-bottom:4px">🧪 Serbest terminal</div><div class="muted small">Burası senin sandbox'ın. Ne istersen dene, bir şeyi bozarsan Profil sekmesinden filesystem'i sıfırla. <code>help</code> komut listesini verir.</div></div>` + nextBlock() + keyHelp();
    bindKeyHelp();
    const nb = $('#mp-next'); if (nb) nb.onclick = () => { const nm = nextMission(); if (nm) startMission(nm.id); };
    return;
  }
  const ch = CHAPTERS.find(c => c.id === m.chapter);
  const done = st.done.includes(m.id);
  const expert = modeOf() === 'expert' && !done;
  const taskHidden = expert && !st.revealed.includes(m.id);
  if (modeOf() === 'guided') { stepsShown = true; if (!hintShown) { hintShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); } }
  const steps = stepsOf(m);
  const since = sh.history.slice(-40);
  let h = `<div class="mhdr"><div><div class="ch">${ch.icon} ${esc(ch.title)}</div><div class="tt">${done ? '✅ ' : ''}${esc(m.title)}</div></div><div class="right"><span class="pill xp">+${xpFor(m)} XP</span>${expert ? '<span class="pill">uzman</span>' : ''}</div></div>`;
  if (done) h += `<div class="done-box"><div class="t">Görev tamamlandı</div><div class="small muted" id="mp-auto">${autoTm ? 'Sıradaki görev birazdan açılıyor' : 'Sıradaki göreve geçebilirsin'}</div><div class="row" style="margin-top:8px"><button class="btn small" id="mp-next">Sonraki ›</button>${autoTm ? '<button class="btn alt small" id="mp-stay">Burada kal</button>' : ''}</div></div>`;
  h += `<div class="story">${md(m.story)}</div>`;
  h += taskHidden ? `<div class="task locked">🔒 Uzman modu, görev metni gizli. Semptomdan yola çık. <button class="ghost" id="mp-reveal" style="margin-top:6px">Görevi göster</button></div>` : `<div class="task">${md(m.task)}</div>`;
  if (steps.length) {
    const doneN = steps.filter(s => stepDone(s, since)).length;
    h += `<h3 style="margin-top:12px">Adımlar <span style="text-transform:none;letter-spacing:0;font-weight:400">· ${done ? steps.length : doneN}/${steps.length}</span>${!stepsShown && !done ? ` <button class="ghost" id="mp-steps" style="float:right;padding:2px 8px;font-size:12px">Göster</button>` : ''}</h3><ol class="steps">`;
    steps.forEach((s, i) => {
      const ok = done || stepDone(s, since);
      const vis = stepsShown || done || ok;
      h += `<li class="${ok ? 'ok' : ''}"><span class="ck">${ok ? '✓' : i + 1}</span><span class="st ${vis ? '' : 'blur'}">${esc(vis ? s : s.replace(/\S/g, '•'))}</span>${vis && !ok ? `<button class="use" data-use="${esc(s)}">yaz</button>` : ''}</li>`;
    });
    h += '</ol>';
  }
  h += `<div class="row">${!hintShown ? '<button class="ghost" id="mp-hint">💡 İpucu</button>' : ''}${!solShown ? '<button class="ghost" id="mp-sol">🔓 Çözüm</button>' : ''}${done ? '' : '<button class="ghost" id="mp-skip">Atla ›</button>'}</div>`;
  h += `<button class="btn block mobile-only" id="mp-term" style="margin-top:14px">⌨️ Terminale geç</button>`;
  if (hintShown) h += `<div class="hint">💡 ${md(m.hint)}</div>`;
  if (solShown) h += `<div class="sol">${esc(m.solution)}</div>`;
  h += keyHelp();
  box.innerHTML = h;
  bindKeyHelp();
  const rv = $('#mp-reveal'); if (rv) rv.onclick = () => { if (!st.revealed.includes(m.id)) st.revealed.push(m.id); persist(); renderMission(); };
  const hb = $('#mp-hint'); if (hb) hb.onclick = () => { hintShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); persist(); renderMission(); };
  const sb = $('#mp-sol'); if (sb) sb.onclick = () => { solShown = true; stepsShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); persist(); renderMission(); };
  const stb = $('#mp-steps'); if (stb) stb.onclick = () => { stepsShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); persist(); renderMission(); };
  const nx = $('#mp-next'); if (nx) nx.onclick = goNext;
  const sk = $('#mp-skip'); if (sk) sk.onclick = goNext;
  const stay = $('#mp-stay'); if (stay) stay.onclick = () => { clearTimeout(autoTm); autoTm = null; renderMission(); };
  $$('[data-use]').forEach(b => b.onclick = () => { input.value = b.dataset.use; show('term'); input.focus(); });
  const tb = $('#mp-term'); if (tb) tb.onclick = () => { show('term'); input.focus(); };
}
function nextBlock() { const nm = nextMission(); return nm ? `<div class="card soft"><div class="small muted">Sıradaki görev</div><div style="font-weight:600">${esc(nm.title)}</div><button class="btn small" id="mp-next" style="margin-top:8px">Başla ›</button></div>` : ''; }
function keyHelp() {
  return `<div class="desk-only"><h3>Kısayollar</h3><div class="kv"><b>Tab</b><span>tamamla</span><b>↑ ↓</b><span>geçmiş</span><b>Ctrl L</b><span>ekranı temizle</span><b>Ctrl C</b><span>satırı iptal et</span><b>man cmd</b><span>kılavuz</span></div></div>`;
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
function printSys(t, cls) { const s = document.createElement('span'); s.className = cls || 'sys'; s.textContent = t; term.appendChild(s); scrollTerm(); }
function promptHTML() { const p = sh.prompt(); return `<span class="pu">${esc(p.user)}</span>:<span class="pp">${esc(p.path)}</span>$ `; }
function renderPrompt() { $('#prompt').innerHTML = promptHTML(); }
function welcome() {
  if (term.childElementCount) return;
  printSys(`Linux Lab · Ubuntu 24.04 simülasyonu · ${profName()}\nhelp yaz, komutları gör. Detay için man komut.\n\n`);
}

function execute(line) {
  const echo = document.createElement('div');
  echo.innerHTML = promptHTML() + esc(line);
  term.appendChild(echo);
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
  const m = ALL.find(x => x.id === st.current);
  if (!m) { checkBadges(); return; }
  if (st.done.includes(m.id)) { checkBadges(); if (line.trim()) renderMission(); return; }
  let passed = false;
  try { passed = !!m.check(sh, { line: line.trim(), out, submit: submit == null ? null : submit }); } catch (e) { passed = false; }
  if (passed) {
    st.done.push(m.id);
    if (!st.hinted.includes(m.id)) st.noHint = (st.noHint || 0) + 1;
    const gained = xpFor(m);
    addXP(gained);
    dailyMark(m.id);
    printSys(`\n✔ Görev tamamlandı +${gained} XP · Lv ${level()} ${title()}\n`, 'okk');
    confetti();
    if (navigator.vibrate) navigator.vibrate(30);
    checkBadges();
    persist();
    const nm = ALL.slice(ALL.findIndex(x => x.id === m.id) + 1).find(x => !st.done.includes(x.id)) || nextMission();
    if (st.auto !== false && nm) {
      autoTm = setTimeout(() => { autoTm = null; goNext(); }, 2200);
      toast(`✔ <b>${esc(m.title)}</b> +${gained} XP · sıradaki geliyor`, 'good', 2000);
    } else toast(`✔ <b>${esc(m.title)}</b> +${gained} XP`, 'good');
    renderMission();
  } else if (submit != null && /submit/.test(m.solution)) {
    toast('❌ Yanlış cevap, output\'a bir daha bak', 'bad');
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
term.addEventListener('click', () => { if (!window.getSelection().toString()) input.focus(); });

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
  if (e) { printSys(`[ ${e} ]\n💡 Dosya root'a aitse sudo nano dosya ile aç\n`); }
  else if (isCron) printSys('crontab: installing new crontab\n');
  else { printSys(`[ ${text.split('\n').length - 1} satır yazıldı ]\n`); }
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
    if (e) printSys(`[ ${e} ]\n💡 Dosya root'a aitse sudo vim dosya ile aç\n`);
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
  $('#v-quiz').innerHTML = `<h2>🎓 Hızlı Quiz</h2><p class="muted small">10 rastgele soru. Her doğru +5 XP. 10/10 yaparsan rozet.</p><div class="stat" style="margin-bottom:14px"><div class="v">${st.quizBest}/10</div><div class="l">En iyi skor</div></div><button class="btn" id="qstart">Başla</button>`;
  $('#qstart').onclick = () => {
    quiz = { qs: shuffle(QUIZ).slice(0, 10).map(q => { const order = shuffle(q.a.map((t, i) => i)); return { q: q.q, a: order.map(i => q.a[i]), c: order.indexOf(q.c) }; }), i: 0, score: 0, answered: false, finished: false };
    renderQuestion();
  };
}
function renderQuestion() {
  const q = quiz.qs[quiz.i];
  let h = `<div class="qhead"><span>Soru ${quiz.i + 1}/10</span><span>Skor ${quiz.score}</span></div><div class="qcard"><div class="q">${esc(q.q)}</div>`;
  q.a.forEach((a, i) => { h += `<button class="opt" data-i="${i}">${esc(a)}</button>`; });
  h += '</div><div id="qnext" style="margin-top:12px"></div>';
  $('#v-quiz').innerHTML = h;
  $$('.opt').forEach(b => b.onclick = () => {
    if (quiz.answered) return;
    quiz.answered = true;
    const i = +b.dataset.i;
    $$('.opt').forEach(x => { if (+x.dataset.i === q.c) x.classList.add('right'); });
    if (i === q.c) { quiz.score++; addXP(5); } else b.classList.add('wrong');
    $('#qnext').innerHTML = `<button class="btn" id="qn">${quiz.i === 9 ? 'Sonucu gör' : 'Sonraki ›'}</button>`;
    $('#qn').onclick = () => { quiz.answered = false; if (quiz.i === 9) return finishQuiz(); quiz.i++; renderQuestion(); };
    persist();
  });
}
function finishQuiz() {
  quiz.finished = true;
  st.quizBest = Math.max(st.quizBest, quiz.score);
  if (quiz.score === 10) st.quizPerfect = true;
  touchStreak();
  checkBadges();
  persist();
  const msg = quiz.score === 10 ? 'Kusursuz 👑' : quiz.score >= 7 ? 'Çok iyi 💪' : quiz.score >= 4 ? 'Fena değil, tekrar dene' : 'Görevlere biraz daha zaman ayır';
  $('#v-quiz').innerHTML = `<h2>Sonuç</h2><div class="hero"><div class="big">${quiz.score}/10</div><div class="muted">${msg}</div></div><button class="btn" id="qagain">Tekrar</button>`;
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
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map(c => ({ c, n: counts[c], ex: examples[c], man: manualOf(c) }));
}
function cheatSheetText() {
  const list = learnedCommands();
  const lines2 = [`# Linux Lab, ${profName()} için komut özeti`, `${st.done.length} görev, ${sh.history.length} komut, ${list.length} farklı komut`, ''];
  list.forEach(x => { lines2.push(`## ${x.c}${x.man ? ' · ' + x.man.d : ''}`); x.ex.forEach(e => lines2.push('    $ ' + e)); lines2.push(''); });
  return lines2.join('\n');
}
function useCmd(c) { input.value = c; show('term'); input.focus(); }
function renderMan(filter = '') {
  const keys = Object.keys(Object.assign({}, LAB_EXT.manual, MANUAL)).sort();
  let h = `<h2>📚 Komut Sözlüğü</h2><div class="seg"><button data-mt="all" class="${manTab === 'all' ? 'on' : ''}">Tüm komutlar</button><button data-mt="mine" class="${manTab === 'mine' ? 'on' : ''}">Öğrendiklerim</button></div>`;
  if (manTab === 'mine') {
    const list = learnedCommands();
    h += `<p class="muted small">Terminalde kullandığın komutlardan otomatik çıkarılan kişisel özet. ${list.length} komut, en çok kullandığın üstte.</p>`;
    h += `<div class="row" style="margin-bottom:12px"><button class="btn small" id="cs-copy">📋 Markdown kopyala</button></div>`;
    if (!list.length) h += '<p class="muted">Henüz komut yok. Terminale geç, birkaç görev yap.</p>';
    h += list.map(x => `<div class="mitem"><div class="c">${esc(x.c)} <span class="muted" style="font-weight:400;font-size:12px">· ${x.n} kez</span></div>${x.man ? `<div class="d">${esc(x.man.d)}</div>` : ''}<div class="ex">${x.ex.map(e => `<button data-e="${esc(e)}">$ ${esc(e)}</button>`).join('')}</div></div>`).join('');
    $('#v-man').innerHTML = h;
    $$('[data-mt]').forEach(b => b.onclick = () => { manTab = b.dataset.mt; renderMan(); });
    $$('#v-man .ex button').forEach(b => b.onclick = () => useCmd(b.dataset.e));
    $('#cs-copy').onclick = async () => { try { await navigator.clipboard.writeText(cheatSheetText()); toast('Kopyalandı, Notlar\'a yapıştır', 'good'); } catch (e) { toast('Kopyalanamadı', 'bad'); } };
    return;
  }
  h += `<input class="search" id="msearch" placeholder="Komut ya da açıklama ara" value="${esc(filter)}"><div id="mlist"></div>`;
  $('#v-man').innerHTML = h;
  $$('[data-mt]').forEach(b => b.onclick = () => { manTab = b.dataset.mt; renderMan(); });
  const list = () => {
    const f = $('#msearch').value.toLowerCase();
    $('#mlist').innerHTML = keys.filter(k => !f || k.includes(f) || manualOf(k).d.toLowerCase().includes(f)).map(k => {
      const m = manualOf(k);
      return `<div class="mitem"><div class="c">${esc(k)}</div><div class="d">${esc(m.d)}</div><div class="u">${m.u.map(esc).join('\n')}</div><div class="ex">${m.e.map(e => `<button data-e="${esc(e)}">$ ${esc(e)}</button>`).join('')}</div></div>`;
    }).join('');
    $$('#mlist .ex button').forEach(b => b.onclick = () => useCmd(b.dataset.e));
  };
  $('#msearch').oninput = list;
  list();
}

/* ---------- profil ---------- */

function renderMe() {
  let h = `<h2>${profIcon()} ${esc(profName())}</h2><div class="grid2">
    <div class="stat"><div class="v">${st.xp}</div><div class="l">Toplam XP</div></div>
    <div class="stat"><div class="v">Lv ${level()}</div><div class="l">${esc(title())}</div></div>
    <div class="stat"><div class="v">${st.done.length}/${ALL.length}</div><div class="l">Görev</div></div>
    <div class="stat"><div class="v">${st.cmds}</div><div class="l">Komut</div></div>
    <div class="stat"><div class="v">🔥 ${st.streak}</div><div class="l">Gün serisi</div></div>
    <div class="stat"><div class="v">${st.quizBest}/10</div><div class="l">Quiz rekoru</div></div>
    <div class="stat"><div class="v">${st.dailyDone || 0}</div><div class="l">Günlük set tamam</div></div>
    <div class="stat"><div class="v">${esc(MODES[modeOf()].label)}</div><div class="l">Zorluk</div></div></div>`;
  h += '<h3>Profiller</h3>';
  PROFILES.forEach(p => { h += `<button class="prof ${p.id === PROFILE ? 'on' : ''}" data-p="${p.id}"><span class="ic">${p.icon}</span><span><div class="nm">${esc(p.name)}</div><div class="sub">${p.id === PROFILE ? 'aktif' : 'geç'}</div></span>${PROFILES.length > 1 ? `<span class="del" data-del="${p.id}" title="sil">🗑</span>` : ''}</button>`; });
  h += `<div class="row" style="margin-top:6px"><input type="text" id="np-name" placeholder="Yeni profil adı" class="search" style="margin:0;flex:1;min-width:120px"><button class="btn small" id="np-add">Ekle</button></div>`;
  h += `<h3>Cihazlar arası senkron</h3><div class="card"><p class="small muted" style="margin:0 0 8px">İlerleme GitHub hesabındaki gizli bir gist'e yazılır, başka cihazda aynı token'ı girince kaldığın yerden devam edersin. Token sadece bu cihazda saklanır. github.com, Settings, Developer settings, Personal access tokens, Tokens classic, sadece <b>gist</b> yetkisi.</p>
    <div class="row"><input type="password" id="gh-token" placeholder="ghp_… token" class="search" style="margin:0;flex:1;min-width:140px" value="${esc(SYNC.token)}"><button class="btn small" id="gh-connect">${SYNC.token ? 'Güncelle' : 'Bağlan'}</button>${SYNC.token ? '<button class="ghost" id="gh-off">Kapat</button>' : ''}</div>
    <div class="small muted" id="gh-status" style="margin-top:8px">${SYNC.token ? (SYNC.status === 'err' ? '⚠️ ' + esc(SYNC.msg) : '☁︎ Bağlı' + (SYNC.msg ? ' · ' + esc(SYNC.msg) : '')) : 'Kapalı'}</div>
    ${SYNC.token ? '<div class="row" style="margin-top:8px"><button class="ghost" id="gh-pull">⬇ Şimdi çek</button><button class="ghost" id="gh-push">⬆ Şimdi gönder</button></div>' : ''}</div>`;
  h += '<h3>Ayarlar</h3><div class="card">';
  h += `<label class="toggle"><span>Görev bitince otomatik sıradakine geç</span><input type="checkbox" id="s-auto" ${st.auto !== false ? 'checked' : ''}></label>`;
  h += `<label class="toggle"><span>Zorluk</span><select id="s-mode">${Object.keys(MODES).map(k => `<option value="${k}" ${modeOf() === k ? 'selected' : ''}>${MODES[k].label}</option>`).join('')}</select></label></div>`;
  h += '<h3>Rozetler</h3><div class="badges">';
  BADGES.forEach(b => { const on = st.badges.includes(b.id); h += `<div class="badge ${on ? '' : 'off'}"><div class="e">${b.icon}</div><div class="t">${esc(b.title)}</div><div class="muted">${esc(b.desc)}</div></div>`; });
  h += '</div><h3>Sıfırlama</h3>';
  h += '<p class="muted small">Sanal filesystem\'i bozduysan sadece onu sıfırla, ilerlemen kalır.</p>';
  h += '<div class="row"><button class="ghost" id="rs-fs">Filesystem\'i sıfırla</button><button class="ghost danger" id="rs-all">Bu profili sıfırla</button></div>';
  h += '<p class="muted small" style="margin-top:24px">Gerçek bir Linux pratiği için iPhone\'da iSH ya da a-Shell ücretsiz. Burada öğrendiklerin oralarda birebir çalışır.</p>';
  $('#v-me').innerHTML = h;
  $$('.prof').forEach(b => b.onclick = e => {
    const del = e.target.closest('[data-del]');
    if (del) { const p = PROFILES.find(x => x.id === del.dataset.del); if (confirm(`${p.name} profili ve tüm ilerlemesi silinsin mi?`)) { deleteProfile(p.id); renderMe(); } return; }
    if (b.dataset.p !== PROFILE) { useProfile(b.dataset.p); show('me'); toast(`${profName()} profiline geçildi`, 'good'); }
  });
  $('#np-add').onclick = () => { const n = $('#np-name').value.trim(); if (!n) return; addProfile(n); show('me'); };
  $('#gh-connect').onclick = async () => { const tok = $('#gh-token').value.trim(); if (!tok) return toast('Token gir', 'bad'); $('#gh-status').textContent = 'Bağlanıyor…'; await SYNC.connect(tok); renderMe(); };
  const off = $('#gh-off'); if (off) off.onclick = () => { SYNC.token = ''; drop('ll.gh.token'); drop('ll.gh.gist'); SYNC.gist = ''; SYNC.set('off'); renderMe(); };
  const pl = $('#gh-pull'); if (pl) pl.onclick = async () => { try { const ch = await SYNC.pull(); if (ch) { loadProfiles(); useProfile(PROFILES.some(p => p.id === PROFILE) ? PROFILE : PROFILES[0].id); toast('Güncel ilerleme alındı', 'good'); } else toast('Zaten güncel', 'good'); } catch (e) { SYNC.set('err', String(e.message || e)); toast('Çekilemedi', 'bad'); } renderMe(); };
  const ps = $('#gh-push'); if (ps) ps.onclick = async () => { await SYNC.push(); toast(SYNC.status === 'ok' ? 'Gönderildi' : 'Gönderilemedi', SYNC.status === 'ok' ? 'good' : 'bad'); renderMe(); };
  $('#s-auto').onchange = e => { st.auto = e.target.checked; persist(); };
  $('#s-mode').onchange = e => { st.mode = e.target.value; persist(); renderMission(); };
  $('#rs-fs').onclick = () => { if (confirm('Filesystem, process\'ler ve servisler ilk haline dönsün mü?')) { sh.reset(); term.innerHTML = ''; welcome(); renderPrompt(); persist(); toast('Sıfırlandı', 'good'); } };
  $('#rs-all').onclick = () => { if (confirm(`${profName()} profilinin XP, rozet ve görev ilerlemesi silinecek. Emin misin?`)) { drop(stKey(PROFILE)); drop(shKey(PROFILE)); useProfile(PROFILE); persist(); show('me'); } };
}

/* profil secici, ust bardaki chip */
function openWho() {
  let h = `<h2>Profil seç</h2>`;
  PROFILES.forEach(p => { h += `<button class="prof ${p.id === PROFILE ? 'on' : ''}" data-p="${p.id}"><span class="ic">${p.icon}</span><span><div class="nm">${esc(p.name)}</div><div class="sub">${p.id === PROFILE ? 'aktif' : ''}</div></span></button>`; });
  h += `<div class="row" style="margin-top:8px"><input type="text" id="wp-name" placeholder="Yeni profil adı" class="search" style="margin:0;flex:1;min-width:120px"><button class="btn small" id="wp-add">Ekle</button></div><div class="row" style="margin-top:12px;justify-content:flex-end"><button class="ghost" id="wp-close">Kapat</button></div>`;
  $('#whosheet').innerHTML = h;
  $('#whobox').classList.remove('hidden');
  $$('#whosheet .prof').forEach(b => b.onclick = () => { if (b.dataset.p !== PROFILE) { useProfile(b.dataset.p); toast(`${profName()} profiline geçildi`, 'good'); } closeWho(); });
  $('#wp-add').onclick = () => { const n = $('#wp-name').value.trim(); if (!n) return; addProfile(n); closeWho(); };
  $('#wp-close').onclick = closeWho;
}
function closeWho() { $('#whobox').classList.add('hidden'); }
$('#whobox').addEventListener('click', e => { if (e.target.id === 'whobox') closeWho(); });
$('#who').onclick = openWho;

/* ---------- baslat ---------- */

$$('#tabs button').forEach(b => b.onclick = () => show(b.dataset.v));
loadProfiles();
useProfile(PROFILES.some(p => p.id === load(KEY_CUR)) ? load(KEY_CUR) : PROFILES[0].id);
show(isDesk() ? 'mission' : (st.current ? 'term' : 'home'));
if (SYNC.token) { SYNC.set('busy'); SYNC.pull().then(ch => { if (ch) { loadProfiles(); useProfile(PROFILES.some(p => p.id === PROFILE) ? PROFILE : PROFILES[0].id); toast('Diğer cihazdaki ilerleme alındı', 'good'); } }).catch(e => SYNC.set('err', String(e.message || e))); }

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
