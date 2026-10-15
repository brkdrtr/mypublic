'use strict';
/* Ingilizce icerik katmani. Turkce kaynak dosyalara dokunmadan, gorev, varyant, bolum, quiz, rozet ve komut sozlugu
   cevirileri i18n-en-*.js ve explain-en-*.js dosyalarinda addEn ile eklenir. Bicim I18N.md.
   Dil secimi shell.js icindeki LAB_LANG, app.js profil ayarindan atar. */

const I18N_EN = { missions: {}, chapters: {}, quiz: {}, badges: {}, x: {} };
function addEn(part) {
  for (const sec of Object.keys(part)) {
    const dst = I18N_EN[sec] || (I18N_EN[sec] = {});
    for (const [k, v] of Object.entries(part[sec])) dst[k] = Object.assign(dst[k] || {}, v);
  }
}
function isEn() { return typeof LAB_LANG !== 'undefined' && LAB_LANG === 'en'; }
const EN_FIELDS = ['title', 'story', 'task', 'hint'];
/* Gorev, k 0 temel, 1 ve sonrasi varyant. Ceviri yoksa Turkce kalir */
function locMission(m) {
  if (!isEn() || !m) return m;
  const e = I18N_EN.missions[m.id];
  if (!e) return m;
  const out = Object.assign({}, m);
  const src = m.vk ? ((e.v || [])[(m.vk - 1) % Math.max(1, (e.v || []).length)] || {}) : e;
  EN_FIELDS.forEach(f => { if (typeof src[f] === 'string') out[f] = src[f]; else if (m.vk && typeof e[f] === 'string' && !(m.variants && m.variants[m.vk - 1] && m.variants[m.vk - 1][f])) out[f] = e[f]; });
  return out;
}
function locChapter(c) { if (!isEn() || !c) return c; const e = I18N_EN.chapters[c.id]; return e ? Object.assign({}, c, e) : c; }
function locQuiz(q) { if (!isEn() || !q) return q; const e = I18N_EN.quiz[q.q]; return e && e.a && e.a.length === q.a.length ? Object.assign({}, q, { q: e.q, a: e.a.slice() }) : q; }
function locBadge(b) { if (!isEn() || !b) return b; const e = I18N_EN.badges[b.id]; return e ? Object.assign({}, b, e) : b; }
/* Komut sozlugu girdisi, Ingilizce katman Turkce girdinin uzerine metin olarak bindirilir */
function locX(entry, en) {
  if (!entry || !en) return entry;
  const out = Object.assign({}, entry);
  ['d', 'tip', 'wt'].forEach(k => { if (typeof en[k] === 'string') out[k] = en[k]; });
  if (entry.o && en.o) {
    out.o = {};
    for (const [k, spec] of Object.entries(entry.o)) {
      const t = en.o[k];
      out.o[k] = t == null ? spec : typeof t === 'string' ? Object.assign({}, spec, { t }) : Object.assign({}, spec, t);
    }
  }
  if (entry.ex && en.ex) out.ex = entry.ex.map((x, i) => [x[0], en.ex[i] || x[1]]);
  if (entry.pos && en.pos && en.pos.length === entry.pos.length) out.pos = en.pos.slice();
  ['bsd', 'kv'].forEach(k => { if (entry[k] && en[k]) out[k] = Object.assign({}, entry[k], en[k]); });
  if (entry.sub && en.sub) { out.sub = {}; for (const [k, s] of Object.entries(entry.sub)) out.sub[k] = locX(s, en.sub[k]); }
  return out;
}
