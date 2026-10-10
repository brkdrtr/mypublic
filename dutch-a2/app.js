'use strict';
/* A2 Nederlands uygulama mantigi. Veri dosyalari vocab.js, grammar.js, content.js, knm.js */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const DAY = 86400000;

/* ---------- veri hazirligi ---------- */

const WORDS = [];
VOCAB_THEMES.forEach(th => {
  th.words.trim().split('\n').forEach(line => {
    const [nl, tr, ex] = line.split('|').map(s => (s || '').trim());
    if (!nl) return;
    const m = /^(de|het)\s+(.+)$/.exec(nl);
    WORDS.push({ key: th.id + '|' + nl, nl, tr, ex, theme: th.id, art: m ? m[1] : null, bare: m ? m[2] : nl });
  });
});
const NOUNS = WORDS.filter(w => w.art);

/* Okuma metinlerinde dokununca anlam gostermek icin sozluk */
const DICT = new Map();
WORDS.forEach(w => { const k = w.bare.toLowerCase(); if (!DICT.has(k)) DICT.set(k, w); });
(typeof VERBS !== 'undefined' ? VERBS : []).forEach(v => {
  const entry = { nl: v.inf, tr: v.tr };
  [v.inf, v.ik, v.jij, v.hij, v.wij, v.pv, v.perf].forEach(f => {
    if (!f) return;
    const first = String(f).split(' ')[0].toLowerCase();
    if (!DICT.has(first)) DICT.set(first, entry);
  });
});

const LEX = new Map();
if (typeof LEXICON !== 'undefined') LEXICON.trim().split('\n').forEach(l => { const i = l.indexOf('|'); if (i > 0) LEX.set(l.slice(0, i).trim(), l.slice(i + 1).trim()); });

/* ---------- durum ---------- */

const KEY = 'a2.state.v1';
const DEF = {
  srs: {}, xp: 0, streak: 0, lastDay: null,
  stats: { lezen: [0, 0], luisteren: [0, 0], knm: [0, 0], grammatica: [0, 0], woorden: [0, 0] },
  done: { lezen: [], luisteren: [], schrijven: [], spreken: [], grammar: [] },
  knmWrong: [], exams: [],
  day: { date: null, cards: 0, newCards: 0, lezen: 0, luisteren: 0, knm: 0, out: 0 },
  set: { examDate: '', newPerDay: 10, goal: 30, rate: 0.9, voiceF: '', voiceM: '', showTr: true },
};
let S;
try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
S = deepMerge(JSON.parse(JSON.stringify(DEF)), S || {});
function deepMerge(a, b) { for (const k of Object.keys(b)) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], b[k]); else a[k] = b[k]; } return a; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* depolama kapali */ } renderTop(); }

function dstr(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function rollDay() {
  const t = dstr();
  if (S.day.date !== t) S.day = { date: t, cards: 0, newCards: 0, lezen: 0, luisteren: 0, knm: 0, out: 0 };
}
function activity(xp = 0) {
  rollDay();
  const t = dstr();
  if (S.lastDay !== t) {
    const y = dstr(new Date(Date.now() - DAY));
    S.streak = S.lastDay === y ? S.streak + 1 : 1;
    S.lastDay = t;
  }
  S.xp += xp;
}
function stat(k, ok) { S.stats[k] = S.stats[k] || [0, 0]; S.stats[k][1]++; if (ok) S.stats[k][0]++; }

function renderTop() { $('#streak').textContent = '🔥 ' + S.streak; $('#xp').textContent = S.xp + ' XP'; }
function toast(msg, ms = 2200) { const t = $('#toast'); t.innerHTML = msg; t.classList.remove('hidden'); clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.add('hidden'), ms); }
function vib(p) { if (navigator.vibrate) navigator.vibrate(p); }

/* ---------- ses, text to speech ---------- */

const TTS = {
  voices: [],
  load() {
    if (!('speechSynthesis' in window)) return;
    const all = speechSynthesis.getVoices();
    this.voices = all.filter(v => /^nl/i.test(v.lang));
  },
  pick(g) {
    if (!this.voices.length) this.load();
    const want = g === 'm' ? S.set.voiceM : S.set.voiceF;
    let v = this.voices.find(x => x.name === want);
    if (v) return v;
    const fem = /claire|ellen|fleur|lotte|anna|femke|sara|colette|google nederlands|female/i;
    const mal = /xander|frank|daan|ruben|maarten|arnaud|male/i;
    const nlNL = this.voices.filter(x => /nl[-_]NL/i.test(x.lang));
    const pool = nlNL.length ? nlNL : this.voices;
    v = pool.find(x => (g === 'm' ? mal : fem).test(x.name)) || pool[0] || null;
    return v;
  },
  speak(text, g = 'f', onend) {
    if (!('speechSynthesis' in window)) { toast('Bu cihazda konuşma sentezi yok'); if (onend) onend(); return; }
    const u = new SpeechSynthesisUtterance(text);
    const v = this.pick(g);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'nl-NL';
    u.rate = S.set.rate;
    const sameVoice = v && this.pick(g === 'm' ? 'f' : 'm') === v;
    u.pitch = sameVoice ? (g === 'm' ? 0.8 : 1.15) : 1;
    if (onend) { u.onend = onend; u.onerror = onend; }
    speechSynthesis.speak(u);
  },
  stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); },
  seq(items, onLine, onDone) {
    this.stop();
    let i = 0; let stopped = false;
    const next = () => {
      if (stopped) return;
      if (i >= items.length) { if (onDone) onDone(); return; }
      const it = items[i];
      if (onLine) onLine(i);
      i++;
      this.speak(it.t, it.g, () => setTimeout(next, 250));
    };
    next();
    return () => { stopped = true; this.stop(); };
  },
};
if ('speechSynthesis' in window) { TTS.load(); speechSynthesis.onvoiceschanged = () => TTS.load(); }

/* ---------- navigasyon ---------- */

let tab = 'home';
const stack = [];
function open(fn, ...args) { TTS.stop(); stopTimers(); stack.push([fn, args]); fn(...args); $('#main').scrollTop = 0; }
function back() { TTS.stop(); stopTimers(); stack.pop(); const top = stack[stack.length - 1]; if (top) top[0](...top[1]); else switchTab(tab); $('#main').scrollTop = 0; }
function switchTab(t) {
  tab = t; stack.length = 0; TTS.stop(); stopTimers();
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  ({ home: Home, words: Words, practice: Practice, exam: Exam, me: Me })[t]();
  $('#main').scrollTop = 0;
}
function view(html) { $('#main').innerHTML = html; const b = $('#main .back'); if (b) b.onclick = back; }
const backBtn = (label = 'Geri') => `<button class="back">‹ ${esc(label)}</button>`;

let timers = [];
function stopTimers() { timers.forEach(clearInterval); timers = []; if (window._stopSeq) { window._stopSeq(); window._stopSeq = null; } stopRecording(); hidePop(); }

/* ---------- SRS, SM-2 benzeri ---------- */

function cardOf(w) { return S.srs[w.key]; }
function dueWords() { const now = Date.now(); return WORDS.filter(w => S.srs[w.key] && S.srs[w.key].due <= now); }
function newWords(themes) { return WORDS.filter(w => !S.srs[w.key] && (!themes || themes.includes(w.theme))); }
function grade(w, q) {
  const now = Date.now();
  const c = S.srs[w.key] || { ef: 2.5, iv: 0, reps: 0, lapses: 0, due: now };
  if (q === 0) { c.reps = 0; c.lapses++; c.iv = 0; c.ef = Math.max(1.3, c.ef - 0.2); c.due = now + 60 * 1000; }
  else {
    if (c.reps === 0) c.iv = q === 1 ? 1 : q === 2 ? 1 : 4;
    else if (c.reps === 1) c.iv = q === 1 ? 2 : q === 2 ? 3 : 6;
    else c.iv = Math.max(1, Math.round(c.iv * c.ef * (q === 1 ? 0.6 : q === 3 ? 1.3 : 1)));
    c.ef = Math.max(1.3, c.ef + (q === 1 ? -0.15 : q === 3 ? 0.15 : 0));
    c.reps++;
    c.due = now + c.iv * DAY;
  }
  S.srs[w.key] = c;
}
function maturity(w) { const c = cardOf(w); if (!c) return 'yeni'; if (c.iv >= 21) return 'kalıcı'; if (c.iv >= 4) return 'iyi'; return 'öğreniliyor'; }

/* ---------- ANA SAYFA ---------- */

function daysToExam() { if (!S.set.examDate) return null; const d = Math.ceil((new Date(S.set.examDate + 'T09:00') - Date.now()) / DAY); return d; }
function acc(k) { const s = S.stats[k] || [0, 0]; return s[1] ? Math.round(s[0] / s[1] * 100) : null; }

function Home() {
  rollDay();
  const dte = daysToExam();
  const due = dueWords().length;
  const learned = Object.keys(S.srs).length;
  const plan = [
    { ok: S.day.cards >= Math.min(S.set.goal, due + S.set.newPerDay) && S.day.cards > 0, t: 'Kelime tekrarı', s: `${S.day.cards} kart bugün · ${due} kart bekliyor`, go: () => open(Flash, null) },
    { ok: S.day.lezen > 0, t: '1 okuma metni', s: 'Lezen', go: () => open(PickNext, 'lezen') },
    { ok: S.day.luisteren > 0, t: '1 dinleme', s: 'Luisteren', go: () => open(PickNext, 'luisteren') },
    { ok: S.day.knm >= 5, t: '5 KNM sorusu', s: `${S.day.knm}/5 bugün`, go: () => open(KnmQuiz, null, 5) },
    { ok: S.day.spreken > 0, t: '1 konuşma sorusu', s: 'Spreken · kaydet ve dinle', go: () => open(PickNext, 'spreken') },
    { ok: S.day.schrijven > 0, t: '1 yazma görevi', s: 'Schrijven', go: () => open(PickNext, 'schrijven') },
  ];
  const doneN = plan.filter(p => p.ok).length;
  let h = `<div class="card hero"><div class="muted">${dte === null ? 'Sınav tarihini Profiel sekmesinden gir' : dte > 0 ? 'Sınava kalan' : dte === 0 ? 'Sınav bugün, succes!' : 'Sınav tarihi geçti'}</div>`;
  h += `<div class="big">${dte !== null && dte > 0 ? dte + ' gün' : 'Hoi Burak 👋'}</div><div class="muted" style="margin-top:6px">${learned} kelime çalışıldı · bugünün planı ${doneN}/${plan.length}</div></div>`;
  h += '<div class="card"><div style="font-weight:800;margin-bottom:4px">Bugünün planı</div>';
  plan.forEach((p, i) => { h += `<div class="plan ${p.ok ? 'ok' : ''}"><span class="ck">${p.ok ? '✓' : ''}</span><div><div style="font-weight:600">${esc(p.t)}</div><div class="small muted">${esc(p.s)}</div></div><button class="btn sm go" data-i="${i}">${p.ok ? 'Tekrar' : 'Başla'}</button></div>`; });
  h += '</div>';
  h += '<h3>Beceriler</h3><div class="grid2">';
  const sk = [['lezen', '📖 Lezen'], ['luisteren', '🎧 Luisteren'], ['knm', '🏛️ KNM'], ['grammatica', '🔧 Grammatica']];
  sk.forEach(([k, l]) => { const a = acc(k); h += `<div class="tile"><div class="t">${l}</div><div class="s">${a === null ? 'henüz veri yok' : '%' + a + ' doğru · ' + S.stats[k][1] + ' soru'}</div><div class="bar"><div style="width:${a || 0}%"></div></div></div>`; });
  h += `<div class="tile"><div class="t">✍️ Schrijven</div><div class="s">${S.done.schrijven.length}/${SCHRIJVEN.length} görev</div><div class="bar"><div style="width:${S.done.schrijven.length / SCHRIJVEN.length * 100}%"></div></div></div>`;
  h += `<div class="tile"><div class="t">🗣️ Spreken</div><div class="s">${S.done.spreken.length}/${SPREKEN.length} soru</div><div class="bar"><div style="width:${S.done.spreken.length / SPREKEN.length * 100}%"></div></div></div>`;
  h += '</div>';
  h += `<p class="small muted" style="margin-top:16px">Sınav A2 inburgeringsexamen formatına göre hazırlandı. Lezen, Luisteren, Schrijven, Spreken ve KNM. Resmi DUO oefenexamens ile de mutlaka deneme yap, Profiel sekmesinde bağlantı var.</p>`;
  view(h);
  $$('.plan .go').forEach(b => b.onclick = () => plan[+b.dataset.i].go());
}

function PickNext(kind) {
  const src = { lezen: LEZEN, luisteren: LUISTEREN, schrijven: SCHRIJVEN, spreken: SPREKEN }[kind];
  const done = S.done[kind];
  const item = src.find(x => !done.includes(x.id)) || pick(src, 1)[0];
  stack.pop();
  open({ lezen: Lezen, luisteren: Luisteren, schrijven: Schrijven, spreken: Spreken }[kind], item.id);
}

/* ---------- KELIMELER ---------- */

let wordThemes = null;
function Words() {
  const due = dueWords().length;
  const nw = newWords().length;
  let h = '<h2>📇 Woorden</h2>';
  h += `<div class="card"><div class="row"><div><div style="font-weight:800;font-size:20px">${due} tekrar · ${Math.min(nw, Math.max(0, S.set.newPerDay - S.day.newCards))} yeni</div><div class="small muted">Aralıklı tekrar. Bildiğin kartlar seyrekleşir, zorlandıkların sık gelir.</div></div></div><div class="row" style="margin-top:12px"><button class="btn" id="w-start">Kartlara başla</button><button class="btn alt" id="w-rev">TR → NL</button></div></div>`;
  h += `<div class="grid2"><button class="tile" id="w-dehet"><div class="e">⚡</div><div class="t">De of het</div><div class="s">60 saniye hız oyunu</div></button><button class="tile" id="w-type"><div class="e">⌨️</div><div class="t">Yazarak</div><div class="s">Türkçeden Hollandacaya yaz</div></button></div>`;
  h += '<h3>Temalar</h3>';
  VOCAB_THEMES.forEach(th => {
    const ws = WORDS.filter(w => w.theme === th.id);
    const seen = ws.filter(w => S.srs[w.key]).length;
    h += `<button class="list-item" data-th="${th.id}"><span class="ic">${th.icon}</span><span style="flex:1;min-width:0"><span class="t">${esc(th.title)}</span><div class="bar"><div style="width:${seen / ws.length * 100}%"></div></div></span><span class="r">${seen}/${ws.length}</span></button>`;
  });
  view(h);
  $('#w-start').onclick = () => open(Flash, null);
  $('#w-rev').onclick = () => open(Flash, null, true);
  $('#w-dehet').onclick = () => open(DeHet);
  $('#w-type').onclick = () => open(TypeQuiz, null);
  $$('[data-th]').forEach(b => b.onclick = () => open(Theme, b.dataset.th));
}

function Theme(id) {
  const th = VOCAB_THEMES.find(t => t.id === id);
  const ws = WORDS.filter(w => w.theme === id);
  let h = backBtn('Woorden') + `<h2>${th.icon} ${esc(th.title)}</h2><div class="row"><button class="btn" id="t-learn">Bu temayı çalış</button><button class="btn alt" id="t-type">Yazarak test</button></div><div class="card" style="margin-top:12px">`;
  ws.forEach((w, i) => { h += `<div class="wordrow"><button class="spk" data-i="${i}">🔊</button><div><div class="nl">${esc(w.nl)}</div><div class="small muted">${esc(w.tr)}</div></div><span class="lvl">${maturity(w)}</span></div>`; });
  h += '</div>';
  view(h);
  $$('.wordrow .spk').forEach(b => b.onclick = () => { const w = ws[+b.dataset.i]; TTS.speak(w.nl + '. ' + (w.ex || '')); });
  $('#t-learn').onclick = () => open(Flash, [id]);
  $('#t-type').onclick = () => open(TypeQuiz, [id]);
}

function buildQueue(themes) {
  const now = Date.now();
  const due = WORDS.filter(w => S.srs[w.key] && S.srs[w.key].due <= now && (!themes || themes.includes(w.theme)));
  const room = themes ? 15 : Math.max(0, S.set.newPerDay - S.day.newCards);
  const fresh = newWords(themes).slice(0, room);
  return shuffle(due).concat(fresh);
}

function Flash(themes, reverse) {
  rollDay();
  const queue = buildQueue(themes);
  let cur = null; let shown = false; let count = 0;
  const next = () => {
    cur = queue.shift(); shown = false;
    if (!cur) {
      view(backBtn() + `<div class="card center" style="padding:28px"><div style="font-size:48px">🎉</div><h2>Bugünlük bitti</h2><p class="muted">${count} kart çalıştın. Yarın tekrar gel, seri devam etsin.</p><div class="row" style="justify-content:center"><button class="btn" id="f-more">Yeni kelime ekle</button><button class="btn alt" id="f-dh">De of het oyna</button></div></div>`);
      $('#f-more').onclick = () => { S.day.newCards = Math.max(0, S.day.newCards - 10); save(); stack.pop(); open(Flash, themes, reverse); };
      $('#f-dh').onclick = () => { stack.pop(); open(DeHet); };
      return;
    }
    draw();
  };
  const draw = () => {
    const w = cur;
    const isNew = !S.srs[w.key];
    const front = reverse ? `<div class="tr" style="margin:0">${esc(w.tr)}</div>` : `<div class="w">${w.art ? `<span class="art ${w.art}">${w.art}</span> ` : ''}${esc(w.bare)}</div>`;
    const backSide = reverse ? `<div class="w" style="margin-top:12px">${w.art ? `<span class="art ${w.art}">${w.art}</span> ` : ''}${esc(w.bare)}</div>` : `<div class="tr">${esc(w.tr)}</div>`;
    let h = backBtn() + `<div class="qhead"><span>${isNew ? '🆕 yeni kelime' : '🔁 tekrar'}</span><span>${queue.length + 1} kaldı</span></div>`;
    h += `<div class="card flash" id="f-card">${front}${shown ? backSide + (w.ex ? `<div class="ex">${tw(w.ex)}</div>` : '') : '<div class="muted small" style="margin-top:18px">Cevabı görmek için dokun</div>'}</div>`;
    h += `<div class="row" style="justify-content:center;margin-bottom:12px"><button class="spk" id="f-say">🔊 kelime</button>${w.ex ? '<button class="spk" id="f-ex">🔊 cümle</button>' : ''}</div>`;
    if (shown) {
      const c = S.srs[w.key];
      const iv = q => { if (q === 0) return '1 dk'; const r = c ? c.reps : 0; const n = r === 0 ? [1, 1, 4][q - 1] : r === 1 ? [2, 3, 6][q - 1] : Math.max(1, Math.round(c.iv * c.ef * [0.6, 1, 1.3][q - 1])); return n + ' gün'; };
      h += `<div class="rate"><button class="r0" data-q="0">Tekrar<small>${iv(0)}</small></button><button class="r1" data-q="1">Zor<small>${iv(1)}</small></button><button class="r2" data-q="2">İyi<small>${iv(2)}</small></button><button class="r3" data-q="3">Kolay<small>${iv(3)}</small></button></div>`;
    } else h += '<button class="btn block" id="f-show">Göster</button>';
    view(h);
    if (!reverse && !shown) TTS.speak(w.nl);
    $('#f-card').onclick = () => { if (!shown) { shown = true; draw(); if (reverse) TTS.speak(w.nl); } };
    const fs = $('#f-show'); if (fs) fs.onclick = () => { shown = true; draw(); if (reverse) TTS.speak(w.nl); };
    $('#f-say').onclick = e => { e.stopPropagation(); TTS.speak(w.nl); };
    const fe = $('#f-ex'); if (fe) fe.onclick = e => { e.stopPropagation(); TTS.speak(w.ex); };
    $$('.rate button').forEach(b => b.onclick = () => {
      const q = +b.dataset.q;
      if (!S.srs[w.key]) S.day.newCards++;
      grade(w, q);
      stat('woorden', q > 0);
      S.day.cards++; count++;
      activity(q > 0 ? 2 : 1);
      if (q === 0) queue.splice(Math.min(3, queue.length), 0, w);
      save();
      next();
    });
  };
  next();
}

function DeHet() {
  let score = 0, total = 0, time = 60, best = +(localStorage.getItem('a2.dehet.best') || 0);
  let cur = null; let running = false;
  const start = () => {
    running = true; score = 0; total = 0; time = 60;
    timers.push(setInterval(() => { time--; const t = $('#dh-time'); if (t) t.textContent = time + ' sn'; if (time <= 0) end(); }, 1000));
    next();
  };
  const next = () => {
    cur = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    view(backBtn() + `<div class="qhead"><span id="dh-time" class="timer">${time} sn</span><span>${score}/${total}</span></div><div class="card flash" style="min-height:200px"><div class="w">${esc(cur.bare)}</div><div class="muted" style="margin-top:8px">${esc(cur.tr)}</div></div><div class="big-choice"><button class="de" data-a="de">de</button><button class="het" data-a="het">het</button></div>`);
    $$('.big-choice button').forEach(b => b.onclick = () => {
      if (!running) return;
      total++;
      const ok = b.dataset.a === cur.art;
      if (ok) { score++; vib(10); } else { vib([30, 30, 30]); toast(`❌ <b>${cur.art} ${esc(cur.bare)}</b>`, 1200); }
      stat('woorden', ok);
      next();
    });
  };
  const end = () => {
    running = false; stopTimers();
    if (score > best) { best = score; try { localStorage.setItem('a2.dehet.best', String(best)); } catch (e) { /* yok */ } }
    activity(score); save();
    view(backBtn() + `<div class="card center" style="padding:24px"><div style="font-size:44px">⚡</div><h2>${score} doğru / ${total}</h2><p class="muted">Rekor ${best}</p><button class="btn" id="dh-again">Tekrar oyna</button></div><div class="card small"><b>İpucu</b><br>Küçültme ekleri -je, -tje, -pje her zaman het. Kişiler ve çoğullar her zaman de. -heid, -ing, -tie ile bitenler de. Yaklaşık üç kelimeden ikisi de-woord.</div>`);
    $('#dh-again').onclick = () => start();
  };
  view(backBtn() + `<h2>⚡ De of het</h2><div class="card"><p>60 saniyede olabildiğince çok ismin artikelini bil. Yanlışlarda doğru hali gösterilir.</p><p class="muted">Rekor ${best}</p><button class="btn block" id="dh-go">Başla</button></div>`);
  $('#dh-go').onclick = start;
}

function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.!?,]/g, '').replace(/\s+/g, ' ').trim(); }

function TypeQuiz(themes) {
  const pool = WORDS.filter(w => (!themes || themes.includes(w.theme)));
  const seen = pool.filter(w => S.srs[w.key]);
  const items = pick(seen.length >= 10 ? seen : pool, 10);
  let i = 0, score = 0;
  const draw = (feedback) => {
    const w = items[i];
    let h = backBtn() + `<div class="qhead"><span>Soru ${i + 1}/10</span><span>Skor ${score}</span></div><div class="card"><div class="muted small">Hollandacasını yaz${w.art ? ', artikel ile' : ''}</div><div style="font-size:24px;font-weight:800;margin:6px 0 12px">${esc(w.tr)}</div>`;
    h += `<input id="ty-in" class="answer" style="width:100%;padding:12px;border-radius:10px;border:1.5px solid var(--line);background:var(--card)" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="${w.art ? 'de ... / het ...' : ''}" ${feedback ? 'disabled' : ''}>`;
    if (feedback) h += `<div class="ex" style="margin-top:10px">${feedback}</div><button class="btn block" id="ty-next" style="margin-top:10px">${i === 9 ? 'Sonuç' : 'Sonraki'}</button>`;
    else h += `<button class="btn block" id="ty-check" style="margin-top:10px">Kontrol et</button>`;
    h += '</div>';
    view(h);
    const inp = $('#ty-in');
    if (!feedback) {
      inp.focus();
      const check = () => {
        const a = norm(inp.value), want = norm(w.nl);
        let ok = a === want, msg;
        if (ok) { score++; msg = `✅ Doğru, <b>${esc(w.nl)}</b>`; vib(10); }
        else if (w.art && a === norm(w.bare)) { msg = `🟡 Kelime doğru, artikel eksik. <b>${esc(w.nl)}</b>`; }
        else if (w.art && a.replace(/^(de|het) /, '') === norm(w.bare)) { msg = `🟡 Artikel yanlış. <b>${esc(w.nl)}</b>`; }
        else msg = `❌ Doğrusu <b>${esc(w.nl)}</b>`;
        stat('woorden', ok);
        if (S.srs[w.key] && !ok) { S.srs[w.key].due = Date.now(); }
        TTS.speak(w.nl);
        draw(msg);
      };
      $('#ty-check').onclick = check;
      inp.onkeydown = e => { if (e.key === 'Enter') check(); };
    } else {
      $('#ty-next').onclick = () => {
        i++;
        if (i < 10) return draw();
        activity(score * 2); save();
        view(backBtn() + `<div class="card center" style="padding:24px"><h2>${score}/10</h2><p class="muted">Yanlış yazdıkların tekrar listesine eklendi.</p><button class="btn" id="ty-again">Yeni tur</button></div>`);
        $('#ty-again').onclick = () => { stack.pop(); open(TypeQuiz, themes); };
      };
    }
  };
  draw();
}

/* ---------- OEFENEN ---------- */

function Practice() {
  const prog = (k, src) => `${S.done[k].length}/${src.length}`;
  let h = '<h2>🧩 Oefenen</h2><div class="grid2">';
  h += `<button class="tile" data-go="lezen"><div class="e">📖</div><div class="t">Lezen</div><div class="s">Okuma · ${prog('lezen', LEZEN)}</div></button>`;
  h += `<button class="tile" data-go="luisteren"><div class="e">🎧</div><div class="t">Luisteren</div><div class="s">Dinleme · ${prog('luisteren', LUISTEREN)}</div></button>`;
  h += `<button class="tile" data-go="schrijven"><div class="e">✍️</div><div class="t">Schrijven</div><div class="s">Yazma · ${prog('schrijven', SCHRIJVEN)}</div></button>`;
  h += `<button class="tile" data-go="spreken"><div class="e">🗣️</div><div class="t">Spreken</div><div class="s">Konuşma · ${prog('spreken', SPREKEN)}</div></button>`;
  h += `<button class="tile" data-go="knm"><div class="e">🏛️</div><div class="t">KNM</div><div class="s">Toplum bilgisi · ${KNM.length} soru</div></button>`;
  h += `<button class="tile" data-go="gram"><div class="e">🔧</div><div class="t">Grammatica</div><div class="s">${GRAMMAR.length} ders + fiil çekimi</div></button>`;
  h += '</div><p class="small muted" style="margin-top:14px">Hollandaca her kelimeye dokununca Türkçesi çıkar. Cevap şıklarında kelimeye basılı tut.</p>';
  view(h);
  $$('[data-go]').forEach(b => b.onclick = () => {
    const k = b.dataset.go;
    if (k === 'knm') open(KnmHome);
    else if (k === 'gram') open(GramHome);
    else open(SkillList, k);
  });
}

const SKILL = {
  lezen: { title: '📖 Lezen', src: () => LEZEN, open: id => open(Lezen, id), sub: x => x.type, info: 'Gerçek sınavda kısa metinler okuyup çoktan seçmeli sorular cevaplarsın. Burada bilinmeyen kelimeye dokununca anlamı çıkar.' },
  luisteren: { title: '🎧 Luisteren', src: () => LUISTEREN, open: id => open(Luisteren, id), sub: x => x.setting, info: 'Önce soruları oku, sonra dinle. Ses cihazın Hollandaca sesiyle okunur. Sınav modunda en fazla iki dinleme hakkın var.' },
  schrijven: { title: '✍️ Schrijven', src: () => SCHRIJVEN, open: id => open(Schrijven, id), sub: x => x.kind === 'formulier' ? 'formulier' : 'bericht', info: 'Form doldurma ve kısa mesaj yazma. Uygulama istenen noktaları kontrol eder, sonra örnek cevabı gösterir.' },
  spreken: { title: '🗣️ Spreken', src: () => SPREKEN, open: id => open(Spreken, id), sub: x => ['', 'Kısa cevap', 'Duruma tepki', 'Fikir ve açıklama'][x.part] || '', info: 'Soruyu dinle, cevabını kaydet, kendini dinle, sonra örnek cevapla karşılaştır.' },
};

function SkillList(k) {
  const sk = SKILL[k];
  const src = sk.src();
  let h = backBtn('Oefenen') + `<h2>${sk.title}</h2><p class="small muted">${esc(sk.info)}</p>`;
  src.forEach(x => {
    const d = S.done[k].includes(x.id);
    h += `<button class="list-item ${d ? 'done' : ''}" data-id="${x.id}"><span class="ic">${d ? '✅' : '•'}</span><span style="min-width:0"><div class="t">${esc(x.title || x.prompt)}</div><div class="s">${esc(sk.sub(x))}</div></span></button>`;
  });
  view(h);
  $$('[data-id]').forEach(b => b.onclick = () => sk.open(b.dataset.id));
}

/* Coktan secmeli soru blogu. onDone(dogruSayisi) */
function mcBlock(container, questions, opts = {}) {
  const prepared = questions.map(q => { const order = shuffle(q.a.map((_, i) => i)); return { ...q, opts: order.map(i => q.a[i]), c: order.indexOf(0) }; });
  const answers = new Array(prepared.length).fill(null);
  let checked = false;
  const draw = () => {
    let h = '';
    prepared.forEach((q, qi) => {
      h += `<div class="card"><div class="q">${qi + 1}. ${tw(q.q)}</div>${q.tr && S.set.showTr ? `<div class="qtr">${esc(q.tr)}</div>` : ''}`;
      q.opts.forEach((o, oi) => {
        let cls = '';
        if (checked) { if (oi === q.c) cls = 'right'; else if (answers[qi] === oi) cls = 'wrong'; }
        else if (answers[qi] === oi) cls = 'sel';
        h += `<button class="opt ${cls}" data-q="${qi}" data-o="${oi}">${tw(o)}</button>`;
      });
      if (checked && q.ex) h += `<div class="ex">💡 ${esc(q.ex)}</div>`;
      h += '</div>';
    });
    if (!checked) h += `<button class="btn block" id="mc-check" ${answers.some(a => a === null) ? 'disabled' : ''}>Kontrol et</button>`;
    container.innerHTML = h;
    container.querySelectorAll('.opt').forEach(b => b.onclick = () => { if (checked) return; answers[+b.dataset.q] = +b.dataset.o; draw(); });
    const c = container.querySelector('#mc-check');
    if (c) c.onclick = () => {
      checked = true;
      const right = prepared.filter((q, i) => answers[i] === q.c).length;
      draw();
      if (opts.onDone) opts.onDone(right, prepared.length, prepared.map((q, i) => answers[i] === q.c));
    };
  };
  draw();
}

/* Hollandaca metni dokunulabilir kelimelere boler. Ham metin parcalanir, her parca ayri escape edilir */
const WORD_RE = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*)/;
function tw(text) {
  return String(text == null ? '' : text).split(WORD_RE).map((part, i) => {
    if (i % 2 === 0) return esc(part);
    const k = part.toLowerCase().replace(/'s$/, '').replace(/-$/, '');
    return `<span class="wd${lookup(k) ? ' known' : ''}" data-w="${esc(k)}">${esc(part)}</span>`;
  }).join('');
}
const wordWrap = tw;
function lookup(k) {
  if (!k) return null;
  const d = DICT.get(k);
  if (d) return { nl: d.nl, tr: d.tr };
  if (LEX.has(k)) return { nl: k, tr: LEX.get(k) };
  if (k.includes('-')) { const parts = k.split('-').map(x => lookup(x)).filter(Boolean); if (parts.length) return { nl: k, tr: parts.map(x => x.tr.split(' · ')[0]).join(' + ') }; }
  return null;
}
function showPop(html) { const p = $('#pop'); p.innerHTML = html; p.classList.remove('hidden'); clearTimeout(showPop.tm); showPop.tm = setTimeout(hidePop, 3500); }
function hidePop() { const p = $('#pop'); if (p) p.classList.add('hidden'); }

function Lezen(id) {
  const x = LEZEN.find(l => l.id === id);
  const idx = LEZEN.indexOf(x);
  let h = backBtn('Lezen') + `<div class="card doc"><div class="type">${esc(x.type)}</div><div style="font-weight:800;font-size:18px;margin:4px 0 8px">${tw(x.title)}</div><div class="reading" id="lz-text">${tw(x.text)}</div><div class="row" style="margin-top:10px"><button class="spk" id="lz-say">🔊 Sesli oku</button><span class="small muted">Altı noktalı kelimelere dokun, anlamını gör</span></div></div><div id="lz-q"></div><div id="lz-after"></div>`;
  view(h);
  $('#lz-say').onclick = () => TTS.speak(x.text.replace(/\n+/g, '. '));
  mcBlock($('#lz-q'), x.questions, { onDone: (r, t, res) => {
    res.forEach(ok => stat('lezen', ok));
    if (!S.done.lezen.includes(x.id)) S.done.lezen.push(x.id);
    rollDay(); S.day.lezen++; activity(r * 5); save();
    afterNav($('#lz-after'), r, t, LEZEN[idx + 1] && (() => { stack.pop(); open(Lezen, LEZEN[idx + 1].id); }));
  } });
}

function afterNav(el, r, t, next) {
  el.innerHTML = `<div class="card center"><div style="font-size:36px">${r === t ? '🌟' : r >= t / 2 ? '👍' : '💪'}</div><div style="font-weight:800;font-size:20px">${r}/${t} doğru</div><div class="row" style="justify-content:center;margin-top:10px"><button class="btn alt" id="an-back">Listeye dön</button>${next ? '<button class="btn" id="an-next">Sonraki ›</button>' : ''}</div></div>`;
  $('#an-back').onclick = back;
  if (next) $('#an-next').onclick = next;
  el.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function Luisteren(id, examMode) {
  const x = LUISTEREN.find(l => l.id === id);
  const idx = LUISTEREN.indexOf(x);
  let plays = 0; let answered = false; let playing = false;
  const maxPlays = examMode ? 2 : Infinity;
  const draw = () => {
    let h = backBtn('Luisteren') + `<div class="card"><div style="font-weight:800;font-size:18px">${tw(x.title)}</div><div class="muted small">${tw(x.setting)}</div><div class="player" style="margin-top:12px"><button class="play" id="lu-play">${playing ? '■' : '▶'}</button><div><div style="font-weight:700">${playing ? 'Dinleniyor...' : plays ? 'Tekrar dinle' : 'Dinle'}</div><div class="small muted">${plays} kez dinlendi${examMode ? ' · en fazla 2' : ''}</div></div></div></div>`;
    h += `<div id="lu-q"></div><div id="lu-tr"></div><div id="lu-after"></div>`;
    view(h);
    $('#lu-play').onclick = () => {
      if (playing) { window._stopSeq && window._stopSeq(); playing = false; draw(); return; }
      if (plays >= maxPlays) { toast('Sınav modunda dinleme hakkın bitti'); return; }
      plays++; playing = true; draw();
      window._stopSeq = TTS.seq(x.lines.map(l => ({ t: l.t, g: l.g })), i => { $$('#lu-tr .line').forEach((el, j) => el.classList.toggle('now', i === j)); }, () => { playing = false; const b = $('#lu-play'); if (b) b.textContent = '▶'; });
    };
    mcBlock($('#lu-q'), x.questions, { onDone: (r, t, res) => {
      answered = true;
      res.forEach(ok => stat('luisteren', ok));
      if (!S.done.luisteren.includes(x.id)) S.done.luisteren.push(x.id);
      rollDay(); S.day.luisteren++; activity(r * 5); save();
      transcript();
      afterNav($('#lu-after'), r, t, LUISTEREN[idx + 1] && (() => { stack.pop(); open(Luisteren, LUISTEREN[idx + 1].id, examMode); }));
    } });
  };
  const transcript = () => {
    let h = '<h3>Metin</h3>';
    x.lines.forEach((l, i) => { h += `<div class="line ${l.g}" data-i="${i}"><div class="who">${esc(l.s)}</div>${tw(l.t)}</div>`; });
    $('#lu-tr').innerHTML = h;
    $$('#lu-tr .line').forEach(el => el.onclick = () => { const l = x.lines[+el.dataset.i]; TTS.speak(l.t, l.g); });
  };
  draw();
  void answered;
}

function Schrijven(id) {
  const x = SCHRIJVEN.find(s => s.id === id);
  const idx = SCHRIJVEN.indexOf(x);
  const draftKey = 'a2.draft.' + id;
  let draft = {};
  try { draft = JSON.parse(localStorage.getItem(draftKey) || '{}'); } catch (e) { draft = {}; }
  let h = backBtn('Schrijven') + `<div class="card"><div class="small muted">${x.kind === 'formulier' ? 'Formulier' : 'Bericht'}</div><div style="font-weight:800;font-size:18px">${tw(x.title)}</div><p>${tw(x.prompt)}</p>${S.set.showTr ? `<p class="small muted">${esc(x.tr)}</p>` : ''}</div>`;
  h += '<div class="card">';
  if (x.fields && x.fields.length) {
    x.fields.forEach((f, i) => { h += `<div class="field"><label>${tw(f.label)}</label>${f.long ? `<textarea rows="3" data-f="${i}" placeholder="${esc(f.hint || '')}">${esc(draft['f' + i] || '')}</textarea>` : `<input data-f="${i}" placeholder="${esc(f.hint || '')}" value="${esc(draft['f' + i] || '')}">`}</div>`; });
  }
  if (x.kind !== 'formulier' || !x.fields || !x.fields.length) h += `<textarea class="answer" id="sc-text" placeholder="Schrijf hier..." autocapitalize="sentences">${esc(draft.text || '')}</textarea><div class="small muted" id="sc-count"></div>`;
  h += `<button class="btn block" id="sc-check" style="margin-top:10px">Kontrol et</button></div><div id="sc-res"></div>`;
  view(h);
  const getText = () => { const t = $('#sc-text'); return t ? t.value : ''; };
  const persistDraft = () => { const d = {}; $$('[data-f]').forEach(el => { d['f' + el.dataset.f] = el.value; }); d.text = getText(); try { localStorage.setItem(draftKey, JSON.stringify(d)); } catch (e) { /* yok */ } };
  const countEl = $('#sc-count');
  const upd = () => { if (countEl) countEl.textContent = wc(getText()) + ' kelime' + (x.min ? ` · en az ${x.min}` : ''); persistDraft(); };
  $$('#main textarea, #main input').forEach(el => el.oninput = upd);
  upd();
  $('#sc-check').onclick = () => {
    const text = getText();
    const fields = $$('[data-f]').map(el => el.value.trim());
    let r = '<div class="card"><div style="font-weight:800;margin-bottom:6px">Kontrol</div>';
    let okAll = true;
    if (x.fields && x.fields.length) {
      const empty = fields.filter(f => !f).length;
      r += chk(empty === 0, empty ? `${empty} alan boş` : 'Tüm alanlar dolu');
      okAll = okAll && empty === 0;
      x.fields.forEach((f, i) => { if (f.long) { const v = fields[i]; const sentence = /^[A-ZÀ-Ý]/.test(v) && /[.!?]$/.test(v) && wc(v) >= 4; r += chk(sentence, `${tw(f.label)} tam cümle mi, büyük harfle başlayıp noktayla bitiyor mu`); okAll = okAll && sentence; } });
    }
    if (x.points && x.points.length) {
      x.points.forEach(p => { let ok = false; try { ok = new RegExp(p.re, 'i').test(text); } catch (e) { ok = false; } okAll = okAll && ok; r += chk(ok, `${esc(p.label)} · ${esc(p.tr || '')}`); });
    }
    if (x.min) { const ok = wc(text) >= x.min; okAll = okAll && ok; r += chk(ok, `Uzunluk ${wc(text)} kelime, en az ${x.min}`); }
    if (text.trim()) {
      const sentences = text.split(/[.!?]\s+/).filter(s => s.trim());
      const capOk = sentences.every(s => /^[\s"']*[A-ZÀ-Ý0-9]/.test(s.trim()));
      r += chk(capOk, 'Cümleler büyük harfle başlıyor');
      const endOk = /[.!?]\s*$/.test(text.trim().split('\n').filter(Boolean).slice(-1)[0] || '') || /groet|groeten|\n[A-Z][a-z]+\s*$/i.test(text.trim());
      r += chk(endOk, 'Son satır noktalama veya isimle bitiyor');
    }
    r += `<p class="small muted">Makine kontrolü sadece istenen noktaları arar. Dil bilgisini örnek cevapla kendin karşılaştır.</p></div>`;
    r += `<div class="card"><div class="row"><div style="font-weight:800">Örnek cevap</div><button class="spk" id="sc-say" style="margin-left:auto">🔊</button></div><div class="model" style="margin-top:8px">${tw(x.model)}</div></div>`;
    r += `<div class="row" style="justify-content:center"><button class="btn alt" id="sc-back">Listeye dön</button>${SCHRIJVEN[idx + 1] ? '<button class="btn" id="sc-next">Sonraki ›</button>' : ''}</div>`;
    $('#sc-res').innerHTML = r;
    $('#sc-say').onclick = () => TTS.speak(x.model.replace(/\n+/g, '. '));
    $('#sc-back').onclick = back;
    const n = $('#sc-next'); if (n) n.onclick = () => { stack.pop(); open(Schrijven, SCHRIJVEN[idx + 1].id); };
    if (!S.done.schrijven.includes(x.id)) S.done.schrijven.push(x.id);
    rollDay(); S.day.out++; S.day.schrijven = (S.day.schrijven || 0) + 1; activity(okAll ? 15 : 8); save();
    $('#sc-res').scrollIntoView({ behavior: 'smooth' });
  };
}
function wc(s) { return (s || '').split(/\s+/).filter(Boolean).length; }
function chk(ok, label) { return `<div class="check ${ok ? 'ok' : 'no'}"><span class="d">${ok ? '✓' : '✕'}</span><span>${label}</span></div>`; }

/* Kayit */
let rec = null;
function stopRecording() { if (rec && rec.mr && rec.mr.state === 'recording') { try { rec.mr.stop(); } catch (e) { /* yok */ } } if (rec && rec.stream) rec.stream.getTracks().forEach(t => t.stop()); if (rec && rec.sr) { try { rec.sr.stop(); } catch (e) { /* yok */ } } rec = null; }

function Spreken(id) {
  const x = SPREKEN.find(s => s.id === id);
  const idx = SPREKEN.indexOf(x);
  let audioURL = null; let transcript = ''; let showModel = false; let secs = 0;
  const limit = x.part === 3 ? 60 : x.part === 2 ? 30 : 30;
  const draw = () => {
    const recording = rec && rec.mr && rec.mr.state === 'recording';
    let h = backBtn('Spreken') + `<div class="card"><div class="small muted">Deel ${x.part} · ${['', 'Kısa cevap', 'Duruma tepki', 'Fikir ve açıklama'][x.part]}</div><div style="font-weight:800;font-size:19px;margin:6px 0">${tw(x.prompt)}</div>${S.set.showTr ? `<div class="small muted">${esc(x.tr)}</div>` : ''}<div class="row" style="margin-top:10px"><button class="spk" id="sp-say">🔊 Soruyu dinle</button></div></div>`;
    h += `<div class="card center"><button class="rec ${recording ? 'on' : ''}" id="sp-rec">${recording ? '■' : '🎙️'}</button><div style="margin-top:8px;font-weight:700" class="timer">${recording ? secs + ' / ' + limit + ' sn' : audioURL ? 'Kaydın hazır' : 'Kayda başla'}</div>`;
    if (audioURL) h += `<audio controls src="${audioURL}" style="width:100%;margin-top:10px"></audio>`;
    if (transcript) h += `<div class="ex" style="text-align:left;margin-top:10px"><b>Tanınan metin</b><br>${esc(transcript)}</div>`;
    h += `<p class="small muted">İpucu ${esc(x.tip || '')}</p></div>`;
    h += `<button class="btn ${showModel ? 'alt' : ''} block" id="sp-model">${showModel ? 'Örnek cevabı gizle' : 'Örnek cevabı göster'}</button>`;
    if (showModel) h += `<div class="card" style="margin-top:10px"><div class="row"><b>Örnek cevap</b><button class="spk" id="sp-msay" style="margin-left:auto">🔊</button></div><div class="model" style="margin-top:8px">${tw(x.model)}</div></div>`;
    h += `<div class="row" style="justify-content:center;margin-top:12px"><button class="btn alt" id="sp-done">✅ Yaptım</button>${SPREKEN[idx + 1] ? '<button class="btn" id="sp-next">Sonraki ›</button>' : ''}</div>`;
    view(h);
    $('#sp-say').onclick = () => TTS.speak(x.prompt, 'm');
    $('#sp-rec').onclick = toggle;
    $('#sp-model').onclick = () => { showModel = !showModel; draw(); };
    const ms = $('#sp-msay'); if (ms) ms.onclick = () => TTS.speak(x.model, 'f');
    $('#sp-done').onclick = markDone;
    const nx = $('#sp-next'); if (nx) nx.onclick = () => { markDone(); stack.pop(); open(Spreken, SPREKEN[idx + 1].id); };
  };
  const markDone = () => { if (!S.done.spreken.includes(x.id)) S.done.spreken.push(x.id); rollDay(); S.day.out++; S.day.spreken = (S.day.spreken || 0) + 1; activity(10); save(); toast('Kaydedildi 👍'); };
  const toggle = async () => {
    if (rec && rec.mr && rec.mr.state === 'recording') { rec.mr.stop(); return; }
    TTS.stop();
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Bu tarayıcı ses kaydını desteklemiyor'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      rec = { mr, stream };
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (audioURL) URL.revokeObjectURL(audioURL);
        audioURL = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || 'audio/mp4' }));
        if (rec && rec.sr) { try { rec.sr.stop(); } catch (e) { /* yok */ } }
        stopTimers();
        draw();
      };
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        try {
          const sr = new SR(); sr.lang = 'nl-NL'; sr.continuous = true; sr.interimResults = true;
          sr.onresult = e => { transcript = Array.from(e.results).map(r => r[0].transcript).join(' '); };
          sr.onerror = () => {};
          sr.start(); rec.sr = sr;
        } catch (e) { /* tanima yok */ }
      }
      transcript = ''; secs = 0;
      mr.start();
      draw();
      timers.push(setInterval(() => { secs++; const t = $('.timer'); if (t) t.textContent = secs + ' / ' + limit + ' sn'; if (secs >= limit && rec && rec.mr.state === 'recording') rec.mr.stop(); }, 1000));
    } catch (e) { toast('Mikrofon izni gerekli. Ayarlar, Safari, Mikrofon'); }
  };
  draw();
}

/* ---------- KNM ---------- */

function KnmHome() {
  let h = backBtn('Oefenen') + '<h2>🏛️ KNM</h2><p class="small muted">Kennis van de Nederlandse Maatschappij. Hollanda toplumu, kurumları, kuralları. Her sorudan sonra Türkçe açıklama gelir.</p>';
  h += `<div class="grid2"><button class="tile" id="k-mix"><div class="e">🎲</div><div class="t">Karışık 10</div><div class="s">Rastgele sorular</div></button><button class="tile" id="k-wrong"><div class="e">🔁</div><div class="t">Hatalarım</div><div class="s">${S.knmWrong.length} soru</div></button></div><h3>Temalar</h3>`;
  Object.entries(KNM_THEMES).forEach(([k, t]) => {
    const n = KNM.filter(q => q.theme === k).length;
    h += `<button class="list-item" data-k="${k}"><span style="min-width:0"><div class="t">${esc(t)}</div><div class="s">${esc((typeof KNM_THEMES_TR !== 'undefined' && KNM_THEMES_TR[k]) || '')}</div></span><span class="r">${n} soru</span></button>`;
  });
  view(h);
  $('#k-mix').onclick = () => open(KnmQuiz, null, 10);
  $('#k-wrong').onclick = () => { if (!S.knmWrong.length) return toast('Henüz hata yok 🎉'); open(KnmQuiz, 'wrong', Math.min(10, S.knmWrong.length)); };
  $$('[data-k]').forEach(b => b.onclick = () => open(KnmQuiz, b.dataset.k, 10));
}

function KnmQuiz(theme, n) {
  let pool = theme === 'wrong' ? KNM.filter(q => S.knmWrong.includes(q.id)) : theme ? KNM.filter(q => q.theme === theme) : KNM;
  const qs = pick(pool, n);
  let i = 0, right = 0;
  const draw = () => {
    const q = qs[i];
    const order = shuffle(q.a.map((_, j) => j));
    let answered = false;
    let h = backBtn() + `<div class="qhead"><span>${i + 1}/${qs.length} · ${esc(KNM_THEMES[q.theme] || '')}</span><span>✓ ${right}</span></div><div class="card"><div class="q">${tw(q.q)}</div>${S.set.showTr ? `<div class="qtr">${esc(q.tr || '')}</div>` : ''}`;
    order.forEach(j => { h += `<button class="opt" data-j="${j}">${tw(q.a[j])}</button>`; });
    h += '<div id="kq-ex"></div></div><div id="kq-next"></div>';
    view(h);
    $$('.opt').forEach(b => b.onclick = () => {
      if (answered) return; answered = true;
      const ok = +b.dataset.j === 0;
      $$('.opt').forEach(o => { if (+o.dataset.j === 0) o.classList.add('right'); });
      if (!ok) { b.classList.add('wrong'); vib([30, 30, 30]); if (!S.knmWrong.includes(q.id)) S.knmWrong.push(q.id); }
      else { right++; vib(10); if (theme === 'wrong') S.knmWrong = S.knmWrong.filter(id => id !== q.id); }
      stat('knm', ok); rollDay(); S.day.knm++; activity(ok ? 3 : 1); save();
      $('#kq-ex').innerHTML = q.ex ? `<div class="ex">💡 ${esc(q.ex)}</div>` : '';
      $('#kq-next').innerHTML = `<button class="btn block">${i === qs.length - 1 ? 'Sonuç' : 'Sonraki ›'}</button>`;
      $('#kq-next button').onclick = () => { i++; if (i < qs.length) draw(); else result(); };
    });
  };
  const result = () => {
    view(backBtn() + `<div class="card center" style="padding:24px"><div style="font-size:40px">${right / qs.length >= 0.7 ? '🏛️' : '📚'}</div><h2>${right}/${qs.length}</h2><p class="muted">Yanlışlar Hatalarım listesine eklendi.</p><button class="btn" id="kq-again">Yeni tur</button></div>`);
    $('#kq-again').onclick = () => { stack.pop(); open(KnmQuiz, theme, n); };
  };
  if (!qs.length) { view(backBtn() + '<div class="card">Soru yok.</div>'); return; }
  draw();
}

/* ---------- GRAMER ---------- */

function GramHome() {
  let h = backBtn('Oefenen') + '<h2>🔧 Grammatica</h2>';
  h += `<div class="grid2"><button class="tile" id="g-verbs"><div class="e">🔁</div><div class="t">Fiil çekimi</div><div class="s">${VERBS.length} fiil, 3 zaman</div></button><button class="tile" id="g-mix"><div class="e">🎲</div><div class="t">Karışık test</div><div class="s">Tüm derslerden 12 soru</div></button></div><h3>Dersler</h3>`;
  GRAMMAR.forEach(g => { const d = S.done.grammar.includes(g.id); h += `<button class="list-item ${d ? 'done' : ''}" data-g="${g.id}"><span class="ic">${g.icon || '📘'}</span><span class="t">${esc(g.title)}</span><span class="r">${g.drills.length} soru</span></button>`; });
  view(h);
  $('#g-verbs').onclick = () => open(VerbDrill);
  $('#g-mix').onclick = () => open(GramDrill, null);
  $$('[data-g]').forEach(b => b.onclick = () => open(GramLesson, b.dataset.g));
}

function GramLesson(id) {
  const g = GRAMMAR.find(x => x.id === id);
  view(backBtn('Grammatica') + `<h2>${g.icon || '📘'} ${esc(g.title)}</h2><div class="card lesson">${g.body}</div><button class="btn block" id="gl-go">Alıştırmaya başla · ${g.drills.length} soru</button>`);
  $('#gl-go').onclick = () => open(GramDrill, id);
}

function GramDrill(id) {
  const g = id ? GRAMMAR.find(x => x.id === id) : null;
  const items = g ? shuffle(g.drills) : pick(GRAMMAR.flatMap(x => x.drills), 12);
  let i = 0, right = 0;
  const draw = () => {
    const d = items[i];
    const order = shuffle(d.a.map((_, j) => j));
    let answered = false;
    let h = backBtn() + `<div class="qhead"><span>${i + 1}/${items.length}</span><span>✓ ${right}</span></div><div class="card"><div class="q" style="font-size:20px">${tw(d.q).replace(/_{2,}/g, '<span style="border-bottom:2px solid var(--brand);padding:0 18px"></span>')}</div><div style="height:8px"></div>`;
    order.forEach(j => { h += `<button class="opt" data-j="${j}">${tw(d.a[j])}</button>`; });
    h += '<div id="gd-ex"></div></div><div id="gd-next"></div>';
    view(h);
    $$('.opt').forEach(b => b.onclick = () => {
      if (answered) return; answered = true;
      const ok = +b.dataset.j === 0;
      $$('.opt').forEach(o => { if (+o.dataset.j === 0) o.classList.add('right'); });
      if (!ok) { b.classList.add('wrong'); vib([30, 30, 30]); } else { right++; vib(10); }
      stat('grammatica', ok); activity(ok ? 2 : 1); save();
      const full = d.q.replace(/_{2,}/, d.a[0]);
      TTS.speak(full);
      $('#gd-ex').innerHTML = `<div class="ex">${ok ? '✅' : '❌'} <b>${esc(full)}</b>${d.ex ? '<br>' + esc(d.ex) : ''}</div>`;
      $('#gd-next').innerHTML = `<button class="btn block">${i === items.length - 1 ? 'Sonuç' : 'Sonraki ›'}</button>`;
      $('#gd-next button').onclick = () => { i++; if (i < items.length) draw(); else done(); };
    });
  };
  const done = () => {
    if (g && right / items.length >= 0.7 && !S.done.grammar.includes(g.id)) S.done.grammar.push(g.id);
    save();
    view(backBtn() + `<div class="card center" style="padding:24px"><h2>${right}/${items.length}</h2><p class="muted">${right / items.length >= 0.7 ? 'Ders tamamlandı ✅' : 'Yüzde 70 ve üstü ile ders tamamlanır'}</p><button class="btn" id="gd-again">Tekrar</button></div>`);
    $('#gd-again').onclick = () => { stack.pop(); open(GramDrill, id); };
  };
  draw();
}

const PERS = { ik: 'ik', jij: 'jij', hij: 'hij', wij: 'wij' };
const AUX = { hebben: { ik: 'heb', jij: 'hebt', hij: 'heeft', wij: 'hebben' }, zijn: { ik: 'ben', jij: 'bent', hij: 'is', wij: 'zijn' } };
function verbForm(v, tense, p) {
  if (tense === 'nu') return v[p];
  if (tense === 'perf') return AUX[v.aux][p] + ' ' + v.perf;
  if (tense === 'verl') return p === 'wij' ? (v.pvWij || pluralPast(v.pv)) : v.pv;
  return '';
}
function pluralPast(pv) {
  const sep = pv.split(' ');
  const base = sep[0];
  const irregular = { was: 'waren', had: 'hadden', kon: 'konden', wou: 'wilden', wilde: 'wilden', mocht: 'mochten', moest: 'moesten', zou: 'zouden', ging: 'gingen', kwam: 'kwamen', deed: 'deden', at: 'aten', las: 'lazen', zag: 'zagen', gaf: 'gaven', nam: 'namen', sprak: 'spraken', schreef: 'schreven', dronk: 'dronken', kocht: 'kochten', bracht: 'brachten', dacht: 'dachten', vond: 'vonden', begon: 'begonnen', bleef: 'bleven', werd: 'werden', wist: 'wisten', sliep: 'sliepen', liep: 'liepen', reed: 'reden', vloog: 'vlogen', stond: 'stonden', zat: 'zaten', lag: 'lagen', hielp: 'hielpen', hield: 'hielden', kreeg: 'kregen', trok: 'trokken', zocht: 'zochten', vroeg: 'vroegen', zei: 'zeiden', belde: 'belden', sprak_: 'spraken' };
  let pl = irregular[base];
  if (!pl) pl = /(te|de)$/.test(base) ? base + 'n' : base + 'en';
  return [pl].concat(sep.slice(1)).join(' ');
}

function VerbDrill() {
  const tenses = [['nu', 'şimdiki zaman'], ['perf', 'perfectum'], ['verl', 'imperfectum']];
  let i = 0, right = 0;
  const total = 12;
  const draw = () => {
    const v = VERBS[Math.floor(Math.random() * VERBS.length)];
    const [t, tl] = tenses[Math.floor(Math.random() * tenses.length)];
    const p = Object.keys(PERS)[Math.floor(Math.random() * 4)];
    const correct = verbForm(v, t, p);
    const wrongs = new Set();
    const others = Object.keys(PERS).filter(x => x !== p).map(x => verbForm(v, t, x));
    others.forEach(o => { if (o !== correct) wrongs.add(o); });
    if (t === 'perf') wrongs.add(AUX[v.aux === 'hebben' ? 'zijn' : 'hebben'][p] + ' ' + v.perf);
    if (t !== 'nu') wrongs.add(v[p]);
    if (t === 'nu') wrongs.add(v.inf);
    const opts = shuffle([correct].concat(pick([...wrongs].filter(w => w && w !== correct), 3)));
    let answered = false;
    let h = backBtn() + `<div class="qhead"><span>${i + 1}/${total}</span><span>✓ ${right}</span></div><div class="card center"><div class="muted">${esc(v.tr)}</div><div style="font-size:28px;font-weight:800">${esc(v.inf)}</div><div class="chips" style="justify-content:center;margin-top:8px"><span class="chip on">${esc(tl)}</span><span class="chip">${p}</span></div></div>`;
    opts.forEach(o => { h += `<button class="opt" data-o="${esc(o)}">${tw(p + ' ' + o)}</button>`; });
    h += '<div id="vd-next"></div>';
    view(h);
    $$('.opt').forEach(b => b.onclick = () => {
      if (answered) return; answered = true;
      const ok = b.dataset.o === correct;
      $$('.opt').forEach(o => { if (o.dataset.o === correct) o.classList.add('right'); });
      if (!ok) b.classList.add('wrong'); else right++;
      vib(ok ? 10 : [30, 30, 30]);
      stat('grammatica', ok); activity(ok ? 2 : 1); save();
      TTS.speak(p + ' ' + correct);
      $('#vd-next').innerHTML = `<button class="btn block">${i === total - 1 ? 'Sonuç' : 'Sonraki ›'}</button>`;
      $('#vd-next button').onclick = () => { i++; if (i < total) draw(); else { view(backBtn() + `<div class="card center" style="padding:24px"><h2>${right}/${total}</h2><button class="btn" id="vd-again">Tekrar</button></div>`); $('#vd-again').onclick = () => { stack.pop(); open(VerbDrill); }; } };
    });
  };
  draw();
}

/* ---------- SINAV SIMULASYONU ---------- */

function Exam() {
  let h = '<h2>📝 Examen simülasyonu</h2><p class="small muted">Süreli deneme. Sonuçlar kaydedilir, gelişimini görürsün. Geçme çizgisi yaklaşık yüzde 70 olarak gösterilir, resmi puanlama DUO tarafından yapılır.</p>';
  const parts = [
    ['knm', '🏛️', 'KNM tam deneme', '40 soru · 45 dakika'],
    ['knm20', '🏛️', 'KNM kısa deneme', '20 soru · 22 dakika'],
    ['lezen', '📖', 'Lezen deneme', '5 metin · 25 dakika'],
    ['luisteren', '🎧', 'Luisteren deneme', '6 parça · en fazla 2 dinleme'],
  ];
  parts.forEach(([k, ic, t, s]) => { h += `<button class="list-item" data-x="${k}"><span class="ic">${ic}</span><span><div class="t">${t}</div><div class="s">${s}</div></span></button>`; });
  if (S.exams.length) {
    h += '<h3>Geçmiş denemeler</h3><div class="card">';
    S.exams.slice(-12).reverse().forEach(e => { const pct = Math.round(e.r / e.t * 100); h += `<div class="wordrow"><div><div class="nl">${esc(e.name)}</div><div class="small muted">${esc(e.date)}</div></div><span class="lvl" style="color:${pct >= 70 ? 'var(--good)' : 'var(--bad)'};font-weight:700">${e.r}/${e.t} · %${pct}</span></div>`; });
    h += '</div>';
  }
  view(h);
  $$('[data-x]').forEach(b => b.onclick = () => {
    const k = b.dataset.x;
    if (k === 'knm') open(ExamMC, 'KNM tam deneme', pick(KNM, 40), 45 * 60);
    if (k === 'knm20') open(ExamMC, 'KNM kısa deneme', pick(KNM, 20), 22 * 60);
    if (k === 'lezen') open(ExamLezen);
    if (k === 'luisteren') open(ExamLuisteren);
  });
}

function startClock(sec, onTick, onEnd) {
  const end = Date.now() + sec * 1000;
  const tick = () => { const left = Math.max(0, Math.round((end - Date.now()) / 1000)); onTick(left); if (left <= 0) { stopTimers(); onEnd(); } };
  timers.push(setInterval(tick, 1000));
  tick();
}
const mmss = s => Math.floor(s / 60) + '.' + String(s % 60).padStart(2, '0');

function finishExam(name, r, t, review) {
  S.exams.push({ name, r, t, date: new Date().toLocaleDateString('nl-NL') });
  activity(r * 3); save();
  const pct = Math.round(r / t * 100);
  let h = `<div class="card center" style="padding:24px"><div style="font-size:44px">${pct >= 70 ? '🎉' : '📚'}</div><h2>${r}/${t} · %${pct}</h2><p class="muted">${pct >= 70 ? 'Geçme çizgisinin üstündesin' : 'Biraz daha pratik, hatalara aşağıdan bak'}</p></div>`;
  if (review) h += review;
  view(backBtn('Examen') + h);
}

function ExamMC(name, qs, sec) {
  const answers = new Array(qs.length).fill(null);
  const orders = qs.map(q => shuffle(q.a.map((_, j) => j)));
  let i = 0;
  const finish = () => {
    let r = 0; let rev = '<h3>Yanlışlar</h3>';
    qs.forEach((q, k) => {
      const ok = answers[k] === 0;
      stat('knm', ok);
      if (ok) r++;
      else { if (!S.knmWrong.includes(q.id)) S.knmWrong.push(q.id); rev += `<div class="card"><div class="q">${tw(q.q)}</div><div class="small" style="color:var(--good)">✓ ${tw(q.a[0])}</div>${answers[k] !== null ? `<div class="small" style="color:var(--bad)">✕ ${tw(q.a[answers[k]])}</div>` : '<div class="small muted">boş bırakıldı</div>'}${q.ex ? `<div class="ex">${esc(q.ex)}</div>` : ''}</div>`; }
    });
    finishExam(name, r, qs.length, r === qs.length ? '' : rev);
  };
  const draw = () => {
    const q = qs[i];
    let h = `<div class="qhead"><span>${i + 1}/${qs.length}</span><span class="timer" id="ex-clock"></span></div><div class="card"><div class="q">${tw(q.q)}</div>`;
    orders[i].forEach(j => { h += `<button class="opt ${answers[i] === j ? 'sel' : ''}" data-j="${j}">${tw(q.a[j])}</button>`; });
    h += `</div><div class="row" style="justify-content:space-between"><button class="btn alt" id="ex-prev" ${i === 0 ? 'disabled' : ''}>‹ Önceki</button><span class="small muted">${answers.filter(a => a !== null).length} cevaplandı</span>${i < qs.length - 1 ? '<button class="btn" id="ex-next">Sonraki ›</button>' : '<button class="btn" id="ex-end">Bitir</button>'}</div>`;
    const keep = $('#ex-clock') ? $('#ex-clock').textContent : '';
    view(h);
    $('#ex-clock').textContent = keep;
    $$('.opt').forEach(b => b.onclick = () => { answers[i] = +b.dataset.j; $$('.opt').forEach(o => o.classList.toggle('sel', o === b)); });
    $('#ex-prev').onclick = () => { if (i > 0) { i--; draw(); } };
    const n = $('#ex-next'); if (n) n.onclick = () => { i++; draw(); };
    const e = $('#ex-end'); if (e) e.onclick = () => { const empty = answers.filter(a => a === null).length; if (!empty || confirm(empty + ' soru boş. Yine de bitirilsin mi?')) { stopTimers(); finish(); } };
  };
  draw();
  startClock(sec, left => { const c = $('#ex-clock'); if (c) c.textContent = '⏱ ' + mmss(left); }, () => { toast('Süre doldu'); finish(); });
}

function ExamLezen() {
  const texts = pick(LEZEN, 5);
  const container = document.createElement('div');
  let h = backBtn('Examen') + '<div class="qhead"><span>Lezen deneme</span><span class="timer" id="ex-clock"></span></div>';
  texts.forEach((x, k) => { h += `<div class="card doc"><div class="type">Tekst ${k + 1} · ${esc(x.type)}</div><div style="font-weight:800;margin:4px 0 8px">${tw(x.title)}</div><div class="reading">${tw(x.text)}</div></div><div id="exl-${k}"></div>`; });
  h += '<button class="btn block" id="exl-end">Bitir ve puanla</button>';
  view(h);
  void container;
  const all = [];
  texts.forEach((x, k) => {
    const el = $('#exl-' + k);
    const qs = x.questions.map(q => { const order = shuffle(q.a.map((_, j) => j)); return { q, order, ans: null }; });
    all.push(...qs);
    el.innerHTML = qs.map((o, qi) => `<div class="card"><div class="q">${tw(o.q.q)}</div>${o.order.map(j => `<button class="opt" data-k="${k}" data-qi="${qi}" data-j="${j}">${tw(o.q.a[j])}</button>`).join('')}</div>`).join('');
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => { qs[+b.dataset.qi].ans = +b.dataset.j; el.querySelectorAll(`.opt[data-qi="${b.dataset.qi}"]`).forEach(o => o.classList.toggle('sel', o === b)); });
  });
  const finish = () => {
    stopTimers();
    let r = 0; let rev = '<h3>Yanlışlar</h3>';
    all.forEach(o => { const ok = o.ans === 0; stat('lezen', ok); if (ok) r++; else rev += `<div class="card"><div class="q">${tw(o.q.q)}</div><div class="small" style="color:var(--good)">✓ ${tw(o.q.a[0])}</div></div>`; });
    finishExam('Lezen deneme', r, all.length, r === all.length ? '' : rev);
  };
  $('#exl-end').onclick = () => { if (confirm('Deneme bitirilsin mi?')) finish(); };
  startClock(25 * 60, left => { const c = $('#ex-clock'); if (c) c.textContent = '⏱ ' + mmss(left); }, () => { toast('Süre doldu'); finish(); });
}

function ExamLuisteren() {
  const items = pick(LUISTEREN, 6);
  let k = 0; const results = [];
  const run = () => {
    const x = items[k];
    let plays = 0; let playing = false;
    const qs = x.questions.map(q => { const order = shuffle(q.a.map((_, j) => j)); return { q, order, ans: null }; });
    const draw = () => {
      let h = backBtn('Examen') + `<div class="qhead"><span>Fragment ${k + 1}/${items.length}</span><span>${plays}/2 dinleme</span></div><div class="card"><div class="muted small">${esc(x.setting)}</div><div class="player" style="margin-top:10px"><button class="play" id="el-play" ${plays >= 2 && !playing ? 'disabled style="opacity:.4"' : ''}>${playing ? '■' : '▶'}</button><div class="small muted">Önce soruları oku, sonra dinle.</div></div></div>`;
      h += qs.map((o, qi) => `<div class="card"><div class="q">${tw(o.q.q)}</div>${o.order.map(j => `<button class="opt ${o.ans === j ? 'sel' : ''}" data-qi="${qi}" data-j="${j}">${tw(o.q.a[j])}</button>`).join('')}</div>`).join('');
      h += `<button class="btn block" id="el-next">${k === items.length - 1 ? 'Bitir' : 'Sonraki fragment ›'}</button>`;
      view(h);
      $('#el-play').onclick = () => {
        if (playing) { window._stopSeq && window._stopSeq(); playing = false; draw(); return; }
        if (plays >= 2) return;
        plays++; playing = true; draw();
        window._stopSeq = TTS.seq(x.lines.map(l => ({ t: l.t, g: l.g })), null, () => { playing = false; draw(); });
      };
      $$('.opt').forEach(b => b.onclick = () => { qs[+b.dataset.qi].ans = +b.dataset.j; draw(); });
      $('#el-next').onclick = () => {
        TTS.stop();
        results.push(...qs);
        k++;
        if (k < items.length) run();
        else {
          let r = 0; let rev = '<h3>Yanlışlar</h3>';
          results.forEach(o => { const ok = o.ans === 0; stat('luisteren', ok); if (ok) r++; else rev += `<div class="card"><div class="q">${tw(o.q.q)}</div><div class="small" style="color:var(--good)">✓ ${tw(o.q.a[0])}</div></div>`; });
          finishExam('Luisteren deneme', r, results.length, r === results.length ? '' : rev);
        }
      };
    };
    draw();
  };
  run();
}

/* ---------- PROFIL ---------- */

function Me() {
  TTS.load();
  const voiceOpts = sel => '<option value="">Otomatik</option>' + TTS.voices.map(v => `<option ${v.name === sel ? 'selected' : ''} value="${esc(v.name)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join('');
  let h = '<h2>⚙️ Profiel</h2><div class="card">';
  h += `<div class="setting"><span>Sınav tarihi</span><input type="date" id="s-date" value="${esc(S.set.examDate)}"></div>`;
  h += `<div class="setting"><span>Günlük yeni kelime</span><select id="s-new">${[5, 10, 15, 20, 30].map(n => `<option ${n === S.set.newPerDay ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
  h += `<div class="setting"><span>Günlük kart hedefi</span><select id="s-goal">${[15, 30, 50, 80].map(n => `<option ${n === S.set.goal ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
  h += `<div class="setting"><span>Türkçe çeviri göster</span><input type="checkbox" id="s-tr" ${S.set.showTr ? 'checked' : ''}></div>`;
  h += '</div><h3>Ses</h3><div class="card">';
  h += `<div class="setting"><span>Konuşma hızı</span><select id="s-rate">${[0.7, 0.8, 0.9, 1, 1.1].map(n => `<option ${n === S.set.rate ? 'selected' : ''} value="${n}">${n}x</option>`).join('')}</select></div>`;
  h += `<div class="setting"><span>Kadın ses</span><select id="s-vf">${voiceOpts(S.set.voiceF)}</select></div>`;
  h += `<div class="setting"><span>Erkek ses</span><select id="s-vm">${voiceOpts(S.set.voiceM)}</select></div>`;
  h += `<div class="row" style="margin-top:8px"><button class="btn sm alt" id="s-test">🔊 Test et</button></div>`;
  h += `<p class="small muted">${TTS.voices.length ? TTS.voices.length + ' Hollandaca ses bulundu.' : 'Hollandaca ses bulunamadı.'} Daha doğal ses için iPhone Ayarlar, Erişilebilirlik, Seslendirilen İçerik, Sesler, Nederlands altından Xander veya Claire gelişmiş sesini indir.</p></div>`;
  h += '<h3>İstatistik</h3><div class="grid2">';
  const learned = Object.values(S.srs).filter(c => c.iv >= 21).length;
  h += `<div class="tile"><div class="t">${Object.keys(S.srs).length}/${WORDS.length}</div><div class="s">kelime görüldü</div></div><div class="tile"><div class="t">${learned}</div><div class="s">kalıcı kelime</div></div><div class="tile"><div class="t">${S.streak} gün</div><div class="s">seri</div></div><div class="tile"><div class="t">${S.exams.length}</div><div class="s">deneme sınavı</div></div></div>`;
  h += '<h3>Resmi kaynaklar</h3><div class="card small">';
  h += '<p><a href="https://www.inburgeren.nl" target="_blank" rel="noopener">inburgeren.nl, DUO sınav bilgisi ve resmi oefenexamens</a></p>';
  h += '<p><a href="https://ind.nl/nl/inburgering-voor-naturalisatie" target="_blank" rel="noopener">IND naturalisatie inburgering şartı</a></p>';
  h += '<p class="muted">Kurallar değişebilir. Sınava kaydolmadan önce DUO ve IND sayfalarını kontrol et.</p></div>';
  h += '<h3>Yedek</h3><div class="card"><p class="small muted">İlerleme sadece bu cihazda saklanır. Ara sıra yedek al.</p><div class="row"><button class="btn sm alt" id="s-exp">Yedeği indir</button><label class="btn sm alt" style="display:inline-block">Yedeği yükle<input type="file" id="s-imp" accept="application/json" style="display:none"></label><button class="btn sm alt" id="s-reset" style="color:var(--bad)">Sıfırla</button></div></div>';
  view(h);
  $('#s-date').onchange = e => { S.set.examDate = e.target.value; save(); };
  $('#s-new').onchange = e => { S.set.newPerDay = +e.target.value; save(); };
  $('#s-goal').onchange = e => { S.set.goal = +e.target.value; save(); };
  $('#s-tr').onchange = e => { S.set.showTr = e.target.checked; save(); };
  $('#s-rate').onchange = e => { S.set.rate = +e.target.value; save(); };
  $('#s-vf').onchange = e => { S.set.voiceF = e.target.value; save(); };
  $('#s-vm').onchange = e => { S.set.voiceM = e.target.value; save(); };
  $('#s-test').onclick = () => { window._stopSeq = TTS.seq([{ t: 'Goedemorgen, hoe gaat het met u?', g: 'f' }, { t: 'Goed, dank u wel. En met u?', g: 'm' }]); };
  $('#s-exp').onclick = () => {
    const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'a2-yedek-' + dstr() + '.json'; a.click();
  };
  $('#s-imp').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { try { const d = JSON.parse(t); if (!d.srs) throw new Error('x'); S = deepMerge(JSON.parse(JSON.stringify(DEF)), d); save(); toast('Yedek yüklendi'); Me(); } catch (err) { toast('Geçersiz dosya'); } });
  };
  $('#s-reset').onclick = () => { if (confirm('Tüm ilerleme silinecek. Emin misin?')) { try { localStorage.removeItem(KEY); } catch (e) { /* yok */ } location.reload(); } };
}

/* ---------- baslat ---------- */

$$('#tabs button').forEach(b => b.onclick = () => switchTab(b.dataset.t));
/* Kelimeye dokununca ceviri. Cevaplanmamis siktaki kelime icin basili tut, normal dokunus sikki secer */
function showWord(el) {
  const k = el.dataset.w;
  const d = lookup(k);
  showPop(d ? `<b>${esc(el.textContent)}</b> · ${esc(d.tr)}` : `<b>${esc(el.textContent)}</b> · sözlükte yok`);
  TTS.speak(el.textContent);
}
let pressTimer = null, pressFired = false;
document.addEventListener('pointerdown', e => {
  const w = e.target.closest('.wd');
  pressFired = false;
  if (!w || !w.closest('.opt')) return;
  pressTimer = setTimeout(() => { pressFired = true; showWord(w); vib(10); }, 450);
});
['pointerup', 'pointercancel', 'pointermove'].forEach(ev => document.addEventListener(ev, e => { if (ev === 'pointermove' && Math.abs(e.movementY || 0) < 4) return; clearTimeout(pressTimer); }));
document.addEventListener('click', e => {
  if (pressFired) { pressFired = false; e.stopPropagation(); e.preventDefault(); return; }
  const w = e.target.closest('.wd');
  if (w) {
    const opt = w.closest('.opt');
    const answered = opt && !!opt.parentElement.querySelector('.opt.right');
    if (!opt || answered) { e.stopPropagation(); e.preventDefault(); showWord(w); return; }
  }
  if (!e.target.closest('#pop')) hidePop();
}, true);
document.addEventListener('contextmenu', e => { if (e.target.closest('.opt')) e.preventDefault(); });
renderTop();
switchTab('home');
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
