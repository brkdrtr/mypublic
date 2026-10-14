'use strict';
/* Komut aciklama sozlugu kapsami. Linux Lab ve NetDevOps Lab gorev cozumlerindeki her komut ve secenek aciklanabiliyor mu.
   node tests/explain.test.js [linux|netdevops] [-v] */
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const which = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : 'linux';
const verbose = process.argv.includes('-v');
const ll = path.join(__dirname, '../linux-lab');
const nd = path.join(__dirname, '../netdevops-lab');
const ctx = { console, module: { exports: {} }, require, document: undefined, window: undefined, TextEncoder, TextDecoder, URL, btoa, atob };
vm.createContext(ctx);
const ls = (d, re) => fs.readdirSync(d).filter(f => re.test(f)).sort().map(f => path.join(d, f));
const run = f => { try { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: path.basename(f) }); } catch (e) { console.log('yuklenemedi', path.basename(f), e.message.split('\n')[0]); } };
let files;
if (which === 'linux') files = [path.join(ll, 'shell.js')].concat(ls(ll, /^ext-.*\.js$/), [path.join(ll, 'missions.js')], ls(ll, /^missions-.*\.js$/), [path.join(ll, 'variants-core.js')], ls(ll, /^variants-(?!core).*\.js$/), [path.join(ll, 'explain.js')], ls(ll, /^explain-db.*\.js$/));
else {
  /* netdevops gorev dosyalari tarayici icin yazildi, burada sadece veri olarak yuklenir */
  ctx.jsyaml = { load: () => ({}), loadAll: () => [], dump: () => '' };
  files = [path.join(ll, 'shell.js'), path.join(ll, 'ext-git.js'), path.join(ll, 'ext-vim.js'), path.join(nd, 'lab.js')].concat(ls(nd, /^sim-.*\.js$/), [path.join(nd, 'py.js')], ls(nd, /^missions-.*\.js$/), [path.join(ll, 'explain.js')], ls(ll, /^explain-db.*\.js$/), ls(nd, /^explain-db.*\.js$/));
}
files.forEach(run);
const { CHAPTERS, explainLine, EXPLAIN_DB } = vm.runInContext('({ CHAPTERS, explainLine, EXPLAIN_DB })', ctx);
const unknownCmd = new Map(); const unknownOpt = new Map();
let lines = 0;
for (const c of CHAPTERS) for (const m of c.missions) {
  const sols = [m.solution].concat((m.variants || []).map(v => v.solution).filter(Boolean));
  for (const sol of sols) for (const line of String(sol || '').split('\n')) {
    if (!line.trim() || /^(sudo\s+)?(nano|vim|vi)\s/.test(line.trim())) continue;
    lines++;
    const r = explainLine(line);
    let cur = '';
    for (const x of r.items) {
      if (x.kind === 'cmd') { cur = x.name; if (x.nodb) unknownCmd.set(x.name, (unknownCmd.get(x.name) || []).concat(c.id + '/' + m.id)); }
      if (x.kind === 'unknown') { const k = cur + ' ' + x.tok.trim(); unknownOpt.set(k, (unknownOpt.get(k) || []).concat(line)); }
    }
  }
}
const cmds = [...unknownCmd.keys()].sort();
const opts = [...unknownOpt.keys()].sort();
if (cmds.length) console.log('Sozlukte olmayan komutlar\n  ' + cmds.map(k => k + (verbose ? '  ' + unknownCmd.get(k).slice(0, 2).join(' ') : '')).join('\n  '));
if (opts.length) console.log('Sozlukte olmayan secenekler\n  ' + opts.map(k => k + (verbose ? '   ' + unknownOpt.get(k)[0] : '')).join('\n  '));
console.log(`${which}, satir ${lines}, sozlukte komut ${Object.keys(EXPLAIN_DB).length}, bilinmeyen komut ${cmds.length}, bilinmeyen secenek ${opts.length}`);
process.exit(cmds.length || opts.length ? 1 : 0);
