'use strict';
/* Linux Lab, her gorevin ve her senaryo varyantinin cozumu gercekten gorevi tamamliyor mu.
   node tests/linux.test.js              temel senaryo ve tum varyant turlari
   node tests/linux.test.js --pass=1     sadece 1. varyant turu
   Tarayicidaki yukleme sirasiyla ayni. Eklentiler shell'den sonra, gorev dosyalari missions.js'den sonra, varyantlar en son */
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const dir = path.join(__dirname, '../linux-lab');
const ctx = { console, module: { exports: {} }, require };
vm.createContext(ctx);
const ls = re => fs.readdirSync(dir).filter(f => re.test(f)).sort();
const order = ['shell.js'].concat(ls(/^ext-.*\.js$/), ['missions.js'], ls(/^missions-.*\.js$/), ['variants-core.js'], ls(/^variants-(?!core).*\.js$/), fs.existsSync(path.join(dir, 'explain.js')) ? ['explain.js'] : [], ls(/^explain-db.*\.js$/));
for (const f of order) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
const { Shell, CHAPTERS, QUIZ, BADGES, LAB_EXT, VimEditor, VAR_REG, variantOf } = vm.runInContext('({ Shell, CHAPTERS, QUIZ, BADGES, LAB_EXT, VimEditor, VAR_REG, variantOf })', ctx);
const arg = (process.argv.find(a => a.startsWith('--pass=')) || '').slice(7);
const verbose = process.argv.includes('-v');

function runMission(sh, m) {
  if (m.setup) m.setup(sh);
  let passed = false;
  const log = [];
  for (const line of m.solution.split('\n')) {
    if (!line.trim()) continue;
    if (/^(sudo )?(nano|vim|vi|crontab -e)\b/.test(line)) {
      /* editor adimi. editorContent dosya icerigini verir, vimKeys ise tus dizisini vim motorundan gecirir */
      const root = line.startsWith('sudo ');
      const f = line.replace(/^sudo /, '').split(/\s+/)[1];
      const isCron = /crontab -e/.test(line);
      const abs = isCron ? '__crontab__' : sh.resolve(f);
      const n = isCron ? null : sh.node(abs);
      const old = isCron ? sh.crontab : (n ? n.d : '');
      let content = null;
      if (m.vimKeys) { const v = new VimEditor(old).feed(typeof m.vimKeys === 'function' ? m.vimKeys(old) : m.vimKeys); sh.vimLog.push(...v.log); if (v.done && v.done.save) content = v.text(); }
      else if (m.editorContent !== undefined) content = typeof m.editorContent === 'function' ? m.editorContent(old) : m.editorContent;
      if (content !== null) { if (isCron) sh.crontab = content; else { const was = sh.isRoot; sh.isRoot = root; sh.writeFile(abs, content, false, 'nano'); sh.isRoot = was; } }
      sh.history.push(line);
      if (m.check(sh, { line: line.replace(/^sudo /, '').split(/\s+/)[0], out: '', submit: null })) passed = true;
      continue;
    }
    const r = sh.run(line);
    const out = r.chunks.filter(x => x.cls !== 'err').map(x => x.text).join('');
    log.push('$ ' + line + '\n' + r.chunks.map(x => x.text).join('').slice(0, 300));
    let ok = false;
    try { ok = m.check(sh, { line, out, submit: r.ui.submit ?? null }); } catch (e) { log.push('check hata ' + e.message); }
    if (ok) passed = true;
  }
  return { passed, log };
}

const maxK = Math.max(0, ...CHAPTERS.flatMap(c => c.missions.map(m => (m.variants || []).length)));
const passes = arg !== '' ? [+arg] : Array.from({ length: maxK + 1 }, (_, i) => i);
let fails = 0; let total = 0; let variants = 0;
const ids = new Set();
for (const c of CHAPTERS) for (const m of c.missions) { if (ids.has(m.id)) { fails++; console.log('DUP id', m.id); } ids.add(m.id); variants += (m.variants || []).length; }
for (const k of passes) {
  const sh = new Shell();
  for (const c of CHAPTERS) for (const base of c.missions) {
    const m = variantOf(Object.assign(base, { chapter: c.id }), k);
    /* bu gorevin k. varyanti yoksa temel gorev sessizce oynanir, sonraki gorevlerin durumu bozulmasin */
    if (k > 0 && !(base.variants && base.variants.length >= k)) { runMission(sh, base); continue; }
    total++;
    const r = runMission(sh, m);
    if (!r.passed) { fails++; console.log(`FAIL v${k}`, c.id, m.id, m.title); if (verbose) console.log(r.log.slice(-3).join('\n') + '\n'); }
  }
}
for (const q of QUIZ) if (!q.a || q.a.length < 2 || q.c !== 0) { fails++; console.log('BAD quiz', q.q); }
if (VAR_REG.missing.length) { fails++; console.log('variant icin gorev bulunamadi', VAR_REG.missing.join(' ')); }
console.log('missions', ids.size, 'variants', variants, 'runs', total, 'chapters', CHAPTERS.length, 'fails', fails, 'quiz', QUIZ.length, 'badges', BADGES.length, 'ext commands', Object.keys(LAB_EXT.commands).length);
process.exit(fails ? 1 : 0);
