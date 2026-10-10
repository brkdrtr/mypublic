'use strict';
/* Linux Lab arayuz mantigi */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

const KEY_SH = 'll.shell.v1';
const KEY_ST = 'll.state.v1';

function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* depolama yok */ } }

const ALL = CHAPTERS.flatMap(c => c.missions.map(m => ({ ...m, chapter: c.id })));
const TITLES = ['Çaylak', 'Meraklı', 'Terminal Kaşifi', 'Pipe Çırağı', 'Script Kiddie', 'Junior Sysadmin', 'Sysadmin', 'Log Avcısı', 'Kıdemli Sysadmin', 'Kernel Fısıldayan', 'Root'];

const sh = new Shell(load(KEY_SH));
let st = Object.assign({ done: [], xp: 0, cmds: 0, streak: 0, lastDay: null, noHint: 0, hinted: [], quizBest: 0, quizPerfect: false, secret: false, current: null, badges: [], mode: 'normal', daily: null, dailyDone: 0, revealed: [] }, JSON.parse(load(KEY_ST) || '{}'));

function persist() { save(KEY_ST, JSON.stringify(st)); save(KEY_SH, sh.serialize()); }

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
  $('#level').textContent = 'Lv ' + level() + ' · ' + title();
  $('#xpfill').style.width = ((st.xp % 120) / 120 * 100) + '%';
}

function toast(msg, kind) {
  const t = $('#toast');
  t.className = 'toast ' + (kind || '');
  t.innerHTML = msg;
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => t.classList.add('hidden'), 2600);
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

/* ---------- gorunumler ---------- */

let currentView = 'home';
function show(v) {
  currentView = v;
  document.querySelectorAll('.view').forEach(x => x.classList.toggle('active', x.id === 'v-' + v));
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v || (v === 'chapter' && b.dataset.v === 'home')));
  if (v === 'home') renderHome();
  if (v === 'term') { renderMission(); scrollTerm(); }
  if (v === 'quiz') renderQuizStart();
  if (v === 'man') renderMan();
  if (v === 'me') renderMe();
}

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
const MODES = { guided: { label: 'Rehberli', desc: 'İpucu baştan açık, acele yok', mult: 0.8 }, normal: { label: 'Normal', desc: 'Görev metni var, ipucu istersen', mult: 1 }, expert: { label: 'Uzman', desc: 'Sadece semptom, görev gizli, %50 bonus XP', mult: 1.5 } };
function modeOf() { return MODES[st.mode] ? st.mode : 'normal'; }
function xpFor(m) { const base = Math.round(m.xp * MODES[modeOf()].mult); return modeOf() === 'expert' && (st.hinted.includes(m.id) || st.revealed.includes(m.id)) ? m.xp : base; }

function renderHome() {
  const nm = nextMission();
  const total = ALL.length;
  let h = `<div class="hero"><div class="muted">Hoş geldin, Burak</div><div class="big">${st.done.length}/${total} görev tamam</div>`;
  h += `<div class="muted" style="margin-top:4px">${nm ? 'Sıradaki görev ' + esc(nm.title) : 'Tüm görevler bitti. Artık serbest terminalde istediğini dene.'}</div>`;
  h += `<div class="row">${nm ? `<button class="btn" id="go-next">▶ Devam et</button>` : ''}<button class="btn alt" id="go-free">Serbest terminal</button></div></div>`;
  const d = dailyMissions();
  h += `<h3>Günün görevleri <span class="muted" style="text-transform:none;letter-spacing:0">· ${d.done.length}/3${d.bonus ? ' · bonus alındı 🎁' : ' · hepsi bitince +30 XP'}</span></h3>`;
  d.ids.forEach(id => {
    const m = ALL.find(x => x.id === id); if (!m) return;
    const ch = CHAPTERS.find(c => c.id === m.chapter);
    const ok = d.done.includes(id) || st.done.includes(id);
    h += `<button class="mis ${ok ? 'done' : ''}" data-m="${m.id}"><span class="n">${ok ? '✓' : ch.icon}</span><span style="min-width:0"><span>${esc(m.title)}</span><div class="muted" style="font-size:12px">${esc(ch.title)}</div></span><span class="xp">+${xpFor(m)} XP</span></button>`;
  });
  h += `<h3>Zorluk</h3><div class="seg">${Object.keys(MODES).map(k => `<button data-mode="${k}" class="${modeOf() === k ? 'on' : ''}">${MODES[k].label}</button>`).join('')}</div><p class="muted" style="margin:-4px 0 12px;font-size:13px">${esc(MODES[modeOf()].desc)}</p>`;
  h += '<h3>Bölümler</h3>';
  CHAPTERS.forEach((c, i) => {
    const p = chapterProgress(c);
    h += `<button class="chap" data-c="${c.id}"><div class="ic">${c.icon}</div><div style="flex:1;min-width:0"><div class="t">${i + 1}. ${esc(c.title)}</div><div class="s">${esc(c.sub)}</div><div class="prog"><div style="width:${p.d / p.t * 100}%"></div></div></div><div class="meta">${p.d}/${p.t}</div></button>`;
  });
  $('#v-home').innerHTML = h;
  const gn = $('#go-next'); if (gn) gn.onclick = () => startMission(nm.id);
  $('#go-free').onclick = () => { st.current = null; persist(); show('term'); };
  document.querySelectorAll('.chap').forEach(b => b.onclick = () => renderChapter(b.dataset.c));
  document.querySelectorAll('#v-home .mis').forEach(b => b.onclick = () => startMission(b.dataset.m));
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { st.mode = b.dataset.mode; persist(); renderHome(); });
}

function renderChapter(cid) {
  const c = CHAPTERS.find(x => x.id === cid);
  let h = `<button class="back" id="bk">‹ Bölümler</button><h2>${c.icon} ${esc(c.title)}</h2><p class="muted">${esc(c.sub)}</p>`;
  c.missions.forEach((m, i) => {
    const done = st.done.includes(m.id);
    h += `<button class="mis ${done ? 'done' : ''}" data-m="${m.id}"><span class="n">${done ? '✓' : i + 1}</span><span>${esc(m.title)}</span><span class="xp">+${m.xp} XP</span></button>`;
  });
  $('#v-chapter').innerHTML = h;
  $('#bk').onclick = () => show('home');
  document.querySelectorAll('.mis').forEach(b => b.onclick = () => startMission(b.dataset.m));
  currentView = 'chapter';
  document.querySelectorAll('.view').forEach(x => x.classList.toggle('active', x.id === 'v-chapter'));
}

/* ---------- gorev karti ---------- */

let hintShown = false, solShown = false;
function startMission(id) {
  const m = ALL.find(x => x.id === id);
  if (!m) return;
  st.current = id;
  hintShown = false; solShown = false;
  if (m.setup) { try { m.setup(sh); } catch (e) { /* yok say */ } }
  persist();
  show('term');
  printSys(`\n── Görev ${m.title} ──\n`);
}

function renderMission() {
  const card = $('#mcard');
  const m = ALL.find(x => x.id === st.current);
  if (!m) {
    card.className = 'mcard';
    card.innerHTML = `<div class="mt">🧪 Serbest mod<button class="x" id="mc-x">✕</button></div><div class="story">Burası senin sandbox\'ın. Ne istersen dene, bir şeyi bozarsan Profil sekmesinden filesystem\'i sıfırla. <code>help</code> yaz, komut listesini gör.</div>`;
    $('#mc-x').onclick = () => card.classList.add('hidden');
    return;
  }
  const done = st.done.includes(m.id);
  const expert = modeOf() === 'expert' && !done;
  const taskHidden = expert && !st.revealed.includes(m.id);
  if (modeOf() === 'guided' && !hintShown) { hintShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); }
  card.className = 'mcard' + (card.dataset.col === '1' ? ' collapsed' : '');
  let h = `<div class="mt">${done ? '✅' : expert ? '🧠' : '🎯'} ${esc(m.title)} <span class="muted" style="font-weight:400">+${xpFor(m)} XP${expert ? ' · uzman' : ''}</span><button class="x" id="mc-col">${card.dataset.col === '1' ? '▾' : '▴'}</button></div>`;
  h += `<div class="story">${md(m.story)}</div>`;
  h += taskHidden ? `<div class="task muted">🔒 Uzman modu. Semptomdan yola çık, görev metni gizli. <button class="btn alt small" id="mc-reveal">Görevi göster</button></div>` : `<div class="task">${md(m.task)}</div>`;
  h += `<div class="acts"><button class="btn alt small" id="mc-hint">💡 İpucu</button><button class="btn alt small" id="mc-sol">🔓 Çözüm</button>${done ? '<button class="btn small" id="mc-next">Sonraki ›</button>' : ''}</div>`;
  if (hintShown) h += `<div class="hint">💡 ${md(m.hint)}</div>`;
  if (solShown) h += `<div class="sol">${esc(m.solution)}</div>`;
  card.innerHTML = h;
  $('#mc-col').onclick = () => { card.dataset.col = card.dataset.col === '1' ? '0' : '1'; renderMission(); };
  const rv = $('#mc-reveal'); if (rv) rv.onclick = () => { if (!st.revealed.includes(m.id)) st.revealed.push(m.id); persist(); renderMission(); };
  $('#mc-hint').onclick = () => { hintShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); persist(); renderMission(); };
  $('#mc-sol').onclick = () => { solShown = true; if (!st.hinted.includes(m.id)) st.hinted.push(m.id); persist(); renderMission(); };
  const nx = $('#mc-next'); if (nx) nx.onclick = goNext;
}

function goNext() {
  $('#celebrate').classList.add('hidden');
  const cur = ALL.findIndex(x => x.id === st.current);
  const nm = ALL.slice(cur + 1).find(m => !st.done.includes(m.id)) || nextMission();
  if (nm) startMission(nm.id); else { st.current = null; persist(); show('home'); }
}

function celebrate(m) {
  const box = $('#celebrate');
  const emojis = ['🎉', '🚀', '🏆', '⚡', '🧠', '🔥', '💪'];
  box.innerHTML = `<div class="box"><div class="e">${emojis[Math.floor(Math.random() * emojis.length)]}</div><div class="t">${esc(m.title)} tamam</div><div class="muted">+${xpFor(m)} XP · Lv ${level()} ${esc(title())}</div><div class="row"><button class="btn alt" id="cb-stay">Terminalde kal</button><button class="btn" id="cb-next">Sonraki ›</button></div></div>`;
  box.classList.remove('hidden');
  $('#cb-next').onclick = goNext;
  $('#cb-stay').onclick = () => { box.classList.add('hidden'); renderMission(); };
  const colors = ['#4ade80', '#60a5fa', '#fbbf24', '#c084fc', '#f87171'];
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.style.left = Math.random() * 100 + 'vw';
    s.style.top = '-10px';
    s.style.background = colors[i % colors.length];
    s.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
    s.style.animationDelay = Math.random() * 0.4 + 's';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 2000);
  }
  if (navigator.vibrate) navigator.vibrate(30);
}

/* ---------- terminal ---------- */

const term = $('#term');
const input = $('#cmd');
let histIdx = -1;

function scrollTerm() { requestAnimationFrame(() => { term.scrollTop = term.scrollHeight; }); }
function printSys(t) { const s = document.createElement('span'); s.className = 'sys'; s.textContent = t; term.appendChild(s); scrollTerm(); }
function promptHTML() { const p = sh.prompt(); return `<span class="pu">${esc(p.user)}</span>:<span class="pp">${esc(p.path)}</span>$ `; }
function renderPrompt() { $('#prompt').innerHTML = promptHTML(); }

function welcome() {
  if (term.childElementCount) return;
  printSys('Linux Lab v1.0 · Ubuntu 24.04 simülasyonu\nhelp yaz, komutları gör. Detay için man komut.\n\n');
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
  if (st.done.includes(m.id)) { checkBadges(); return; }
  let passed = false;
  try { passed = !!m.check(sh, { line: line.trim(), out, submit: submit == null ? null : submit }); } catch (e) { passed = false; }
  if (passed) {
    st.done.push(m.id);
    if (!st.hinted.includes(m.id)) st.noHint = (st.noHint || 0) + 1;
    const gained = xpFor(m);
    addXP(gained);
    dailyMark(m.id);
    const okSpan = document.createElement('span');
    okSpan.className = 'okk';
    okSpan.textContent = `\n✔ Görev tamamlandı +${gained} XP\n`;
    term.appendChild(okSpan);
    scrollTerm();
    checkBadges();
    persist();
    setTimeout(() => celebrate(m), 250);
    renderMission();
  } else if (submit != null && /submit/.test(m.solution)) {
    toast('❌ Yanlış cevap, output\'a bir daha bak', 'bad');
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
  } else checkBadges();
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

document.querySelectorAll('#keys button').forEach(b => {
  b.addEventListener('pointerdown', e => e.preventDefault());
  b.addEventListener('click', () => {
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
});

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
document.querySelectorAll('#vim button[data-k]').forEach(b => {
  b.addEventListener('pointerdown', e => e.preventDefault());
  b.addEventListener('click', () => { const seq = b.dataset.k; if (seq === 'FOCUS') { $('#vim-in').focus(); return; } for (const k of seq.split(',')) vimKey(k); $('#vim-in').focus(); });
});
$('#vim-screen').addEventListener('click', () => $('#vim-in').focus());

/* ---------- quiz ---------- */

let quiz = null;
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function renderQuizStart() {
  if (quiz && !quiz.finished) return renderQuestion();
  $('#v-quiz').innerHTML = `<h2>🎯 Hızlı Quiz</h2><p class="muted">10 rastgele soru. Her doğru +5 XP. 10/10 yaparsan rozet.</p><div class="stat" style="margin-bottom:14px"><div class="v">${st.quizBest}/10</div><div class="l">En iyi skor</div></div><button class="btn" id="qstart">Başla</button>`;
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
  document.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    if (quiz.answered) return;
    quiz.answered = true;
    const i = +b.dataset.i;
    document.querySelectorAll('.opt').forEach(x => { if (+x.dataset.i === q.c) x.classList.add('right'); });
    if (i === q.c) { quiz.score++; addXP(5); } else b.classList.add('wrong');
    $('#qnext').innerHTML = `<button class="btn" id="qn">${quiz.i === 9 ? 'Sonucu gör' : 'Sonraki ›'}</button>`;
    $('#qn').onclick = () => {
      quiz.answered = false;
      if (quiz.i === 9) return finishQuiz();
      quiz.i++; renderQuestion();
    };
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
  const lines2 = [`# Linux Lab, ${profNameLL()} için komut özeti`, `${st.done.length} görev, ${sh.history.length} komut, ${list.length} farklı komut`, ''];
  list.forEach(x => { lines2.push(`## ${x.c}${x.man ? ' · ' + x.man.d : ''}`); x.ex.forEach(e => lines2.push('    $ ' + e)); lines2.push(''); });
  return lines2.join('\n');
}
function profNameLL() { return 'Burak'; }
function renderMan(filter = '') {
  const keys = Object.keys(Object.assign({}, LAB_EXT.manual, MANUAL)).sort();
  let h = `<h2>📚 Komut Sözlüğü</h2><div class="seg"><button data-mt="all" class="${manTab === 'all' ? 'on' : ''}">Tüm komutlar</button><button data-mt="mine" class="${manTab === 'mine' ? 'on' : ''}">Öğrendiklerim</button></div>`;
  if (manTab === 'mine') {
    const list = learnedCommands();
    h += `<p class="muted" style="font-size:13px">Terminalde kullandığın komutlardan otomatik çıkarılan kişisel özet. ${list.length} komut, en çok kullandığın üstte.</p>`;
    h += `<div class="row" style="margin-bottom:12px"><button class="btn small" id="cs-copy">📋 Markdown kopyala</button></div>`;
    if (!list.length) h += '<p class="muted">Henüz komut yok. Terminale geç, birkaç görev yap.</p>';
    h += list.map(x => `<div class="mitem"><div class="c">${esc(x.c)} <span class="muted" style="font-weight:400;font-size:12px">· ${x.n} kez</span></div>${x.man ? `<div class="d">${esc(x.man.d)}</div>` : ''}<div class="ex">${x.ex.map(e => `<button data-e="${esc(e)}">$ ${esc(e)}</button>`).join('')}</div></div>`).join('');
    $('#v-man').innerHTML = h;
    document.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => { manTab = b.dataset.mt; renderMan(); });
    document.querySelectorAll('#v-man .ex button').forEach(b => b.onclick = () => { show('term'); input.value = b.dataset.e; input.focus(); });
    $('#cs-copy').onclick = async () => { try { await navigator.clipboard.writeText(cheatSheetText()); toast('Kopyalandı, Notlar\'a yapıştır', 'good'); } catch (e) { toast('Kopyalanamadı', 'bad'); } };
    return;
  }
  h += `<input class="search" id="msearch" placeholder="Komut ya da açıklama ara" value="${esc(filter)}">`;
  h += '<div id="mlist"></div>';
  $('#v-man').innerHTML = h;
  document.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => { manTab = b.dataset.mt; renderMan(); });
  const list = () => {
    const f = $('#msearch').value.toLowerCase();
    $('#mlist').innerHTML = keys.filter(k => !f || k.includes(f) || manualOf(k).d.toLowerCase().includes(f)).map(k => {
      const m = manualOf(k);
      return `<div class="mitem"><div class="c">${esc(k)}</div><div class="d">${esc(m.d)}</div><div class="u">${m.u.map(esc).join('\n')}</div><div class="ex">${m.e.map(e => `<button data-e="${esc(e)}">$ ${esc(e)}</button>`).join('')}</div></div>`;
    }).join('');
    document.querySelectorAll('#mlist .ex button').forEach(b => b.onclick = () => { show('term'); input.value = b.dataset.e; input.focus(); });
  };
  $('#msearch').oninput = list;
  list();
}

/* ---------- profil ---------- */

function renderMe() {
  let h = `<h2>👤 Profil</h2><div class="grid2">
    <div class="stat"><div class="v">${st.xp}</div><div class="l">Toplam XP</div></div>
    <div class="stat"><div class="v">Lv ${level()}</div><div class="l">${esc(title())}</div></div>
    <div class="stat"><div class="v">${st.done.length}/${ALL.length}</div><div class="l">Görev</div></div>
    <div class="stat"><div class="v">${st.cmds}</div><div class="l">Komut</div></div>
    <div class="stat"><div class="v">🔥 ${st.streak}</div><div class="l">Gün serisi</div></div>
    <div class="stat"><div class="v">${st.quizBest}/10</div><div class="l">Quiz rekoru</div></div>
    <div class="stat"><div class="v">${st.dailyDone || 0}</div><div class="l">Günlük set tamam</div></div>
    <div class="stat"><div class="v">${esc(MODES[modeOf()].label)}</div><div class="l">Zorluk</div></div></div>`;
  h += '<h3>Rozetler</h3><div class="badges">';
  BADGES.forEach(b => { const on = st.badges.includes(b.id); h += `<div class="badge ${on ? '' : 'off'}"><div class="e">${b.icon}</div><div class="t">${esc(b.title)}</div><div class="muted">${esc(b.desc)}</div></div>`; });
  h += '</div><h3>Ayarlar</h3>';
  h += '<p class="muted">Sanal filesystem\'i bozduysan sadece onu sıfırla, ilerlemen kalır.</p>';
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="ghost" id="rs-fs">Filesystem\'i sıfırla</button><button class="ghost danger" id="rs-all">Her şeyi sıfırla</button></div>';
  h += '<p class="muted" style="margin-top:24px;font-size:13px">Gerçek bir Linux pratiği için iPhone\'da iSH ya da a-Shell uygulamaları ücretsizdir. Burada öğrendiklerin oralarda birebir çalışır.</p>';
  $('#v-me').innerHTML = h;
  $('#rs-fs').onclick = () => { if (confirm('Filesystem, process\'ler ve servisler ilk haline dönsün mü?')) { sh.reset(); term.innerHTML = ''; welcome(); renderPrompt(); persist(); toast('Sıfırlandı', 'good'); } };
  $('#rs-all').onclick = () => { if (confirm('Tüm XP, rozet ve görev ilerlemesi silinecek. Emin misin?')) { try { localStorage.removeItem(KEY_ST); localStorage.removeItem(KEY_SH); } catch (e) { /* yok */ } location.reload(); } };
}

/* ---------- baslat ---------- */

document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => show(b.dataset.v));
renderTop();
renderPrompt();
welcome();
show('home');

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
