'use strict';
/* Ingilizce katman kapsami ve yazim kontrolu.
   node tests/i18n.test.js [linux|netdevops] [--only=missions,quiz,x,chapters,badges] [--ch=nav,files] [-v] */
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const args = process.argv.slice(2);
const which = args[0] && !args[0].startsWith('-') ? args[0] : 'linux';
const verbose = args.includes('-v');
const only = ((args.find(a => a.startsWith('--only=')) || '').slice(7) || 'chapters,missions,quiz,badges,x').split(',');
const chf = ((args.find(a => a.startsWith('--ch=')) || '').slice(5)).split(',').filter(Boolean);
const ll = path.join(__dirname, '../linux-lab');
const nd = path.join(__dirname, '../netdevops-lab');
const ctx = { console, module: { exports: {} }, require, TextEncoder, TextDecoder, URL, btoa, atob, jsyaml: { load: () => ({}), loadAll: () => [], dump: () => '' } };
vm.createContext(ctx);
const ls = (d, re) => fs.readdirSync(d).filter(f => re.test(f)).sort().map(f => path.join(d, f));
const run = f => { try { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: path.basename(f) }); } catch (e) { console.log('yuklenemedi', path.basename(f), e.message.split('\n')[0]); process.exitCode = 1; } };
let files;
if (which === 'linux') files = [path.join(ll, 'shell.js')].concat(ls(ll, /^ext-.*\.js$/), [path.join(ll, 'missions.js')], ls(ll, /^missions-.*\.js$/), [path.join(ll, 'variants-core.js')], ls(ll, /^variants-(?!core).*\.js$/), [path.join(ll, 'explain.js')], ls(ll, /^explain-db.*\.js$/), [path.join(ll, 'i18n-core.js')], ls(ll, /^i18n-en-.*\.js$/), ls(ll, /^explain-en-.*\.js$/));
else files = [path.join(ll, 'shell.js'), path.join(ll, 'ext-git.js'), path.join(ll, 'ext-vim.js'), path.join(nd, 'lab.js')].concat(ls(nd, /^sim-.*\.js$/), [path.join(nd, 'py.js')], ls(nd, /^missions-.*\.js$/), [path.join(ll, 'explain.js'), path.join(ll, 'explain-db.js')], ls(nd, /^explain-db.*\.js$/), [path.join(ll, 'i18n-core.js')], ls(ll, /^explain-en-.*\.js$/), ls(nd, /^i18n-en-.*\.js$/), ls(nd, /^explain-en-.*\.js$/));
files.forEach(run);
const { CHAPTERS, QUIZ, BADGES, EXPLAIN_DB, I18N_EN } = vm.runInContext('({ CHAPTERS, QUIZ, BADGES, EXPLAIN_DB, I18N_EN })', ctx);
const missing = {}; const lint = [];
const miss = (sec, id) => { (missing[sec] = missing[sec] || []).push(id); };
/* yazim, ters tirnak disinda em dash, en dash, parantez, iki nokta, ** ve Turkce karakter olmasin */
const bad = s => { const t = String(s).replace(/`[^`]*`/g, '').replace(/\b[A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ]*[çğıöşüÇĞİÖŞÜ][\wçğıöşü]*/g, 'Name'); const m = t.match(/[—–()]|\*\*|[ğışĞİŞçÇöÖüÜ]|:(?!\/\/)/); return m ? m[0] : null; };
const check = (where, s, isCode) => { if (typeof s !== 'string' || isCode) return; const b = bad(s); if (b) lint.push(`${where} '${b}' ${s.slice(0, 90)}`); };
const inCh = c => !chf.length || chf.includes(c.id);
if (only.includes('chapters')) for (const c of CHAPTERS) { if (!inCh(c)) continue; const e = I18N_EN.chapters[c.id]; if (!e || !e.title || (c.sub && !e.sub)) miss('chapters', c.id); else { check('chapter ' + c.id, e.title); check('chapter ' + c.id, e.sub); } }
if (only.includes('missions')) for (const c of CHAPTERS) {
  if (!inCh(c)) continue;
  for (const m of c.missions) {
    const e = I18N_EN.missions[m.id];
    if (!e) { miss('missions', m.id); continue; }
    ['title', 'story', 'task', 'hint'].forEach(f => { if (m[f] && !e[f]) miss('missions', m.id + '.' + f); else check(m.id + '.' + f, e[f]); });
    const vs = m.variants || [];
    if (vs.length && (!e.v || e.v.length !== vs.length)) { miss('variants', `${m.id} v ${(e.v || []).length}/${vs.length}`); }
    vs.forEach((v, i) => { const ev = (e.v || [])[i] || {}; ['title', 'story', 'task', 'hint'].forEach(f => { if (v[f] && !ev[f]) miss('variants', `${m.id}.v${i + 1}.${f}`); else check(`${m.id}.v${i + 1}.${f}`, ev[f]); }); });
  }
}
const qset = new Set();
if (only.includes('quiz')) QUIZ.forEach(q => { qset.add(q.q); const e = I18N_EN.quiz[q.q]; if (!e || !e.q || !e.a || e.a.length !== q.a.length) miss('quiz', q.q.slice(0, 60)); else { check('quiz', e.q); e.a.forEach(a => check('quiz a', a, /^[\w./-]+(\s[\w./*-]+)*$/.test(a) && !/\s[a-z]{4,}\s/.test(a))); } });
if (only.includes('badges')) BADGES.forEach(b => { const e = I18N_EN.badges[b.id]; if (!e || !e.title || !e.desc) miss('badges', b.id); else { check('badge', e.title); check('badge', e.desc); } });
if (only.includes('x')) {
  const own = which === 'linux' ? null : new Set(Object.keys(EXPLAIN_DB));
  const walk = (name, src, en) => {
    if (!en) { miss('x', name); return; }
    if (src.d && !en.d) miss('x', name + ' d'); else check('x ' + name, en.d);
    if (src.tip && !en.tip) miss('x', name + ' tip'); else check('x ' + name + ' tip', en.tip);
    Object.entries(src.o || {}).forEach(([k, spec]) => { const t = en.o && en.o[k]; const tt = typeof t === 'string' ? t : t && t.t; if (spec.t && !tt) miss('x', `${name} ${k}`); else check(`x ${name} ${k}`, tt); });
    (src.ex || []).forEach((x, i) => { if (!(en.ex || [])[i]) miss('x', `${name} ex${i + 1}`); else check(`x ${name} ex`, en.ex[i]); });
    Object.entries(src.sub || {}).forEach(([k, s]) => walk(name + ' ' + k, s, (en.sub || {})[k]));
  };
  for (const name of Object.keys(EXPLAIN_DB)) { if (own && !own.has(name)) continue; walk(name, EXPLAIN_DB[name], I18N_EN.x[name]); }
}
let total = 0;
for (const [sec, list] of Object.entries(missing)) { total += list.length; console.log(`eksik ${sec} ${list.length}` + (verbose ? '\n  ' + list.slice(0, 80).join('\n  ') : '')); }
if (lint.length) console.log(`yazim ${lint.length}` + (verbose ? '\n  ' + lint.slice(0, 80).join('\n  ') : ''));
console.log(`${which}, eksik ${total}, yazim ${lint.length}`);
process.exit(total || lint.length ? 1 : 0);
