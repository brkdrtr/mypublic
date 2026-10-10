'use strict';
/* Linux Lab, her gorevin cozumu gercekten gorevi tamamliyor mu. node tests/linux.test.js
   Tarayicidaki yukleme sirasiyla ayni. Eklentiler shell'den sonra, gorev dosyalari missions.js'den sonra */
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const dir = path.join(__dirname, '../linux-lab');
const ctx = { console, module: { exports: {} }, require };
vm.createContext(ctx);
const order = ['shell.js'].concat(fs.readdirSync(dir).filter(f => /^ext-.*\.js$/.test(f)).sort(), ['missions.js'], fs.readdirSync(dir).filter(f => /^missions-.*\.js$/.test(f)).sort());
for (const f of order) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
const { Shell, CHAPTERS, QUIZ, BADGES, LAB_EXT, VimEditor } = vm.runInContext('({ Shell, CHAPTERS, QUIZ, BADGES, LAB_EXT, VimEditor })', ctx);
const sh = new Shell(); let fails = 0; let total = 0;
const ids = new Set();
for (const c of CHAPTERS) for (const m of c.missions) {
  total++;
  if (ids.has(m.id)) { fails++; console.log('DUP id', m.id); }
  ids.add(m.id);
  if (m.setup) m.setup(sh);
  let passed = false;
  for (const line of m.solution.split('\n')) {
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
      if (m.check(sh, { line: line.replace(/^sudo /, '').split(/\s+/)[0], out: '', submit: null })) passed = true;
      continue;
    }
    const r = sh.run(line);
    const out = r.chunks.filter(x => x.cls !== 'err').map(x => x.text).join('');
    if (m.check(sh, { line, out, submit: r.ui.submit ?? null })) passed = true;
  }
  if (!passed) { fails++; console.log('FAIL', c.id, m.id, m.title); }
}
for (const q of QUIZ) if (!q.a || q.a.length < 2 || q.c !== 0) { fails++; console.log('BAD quiz', q.q); }
console.log('missions', total, 'chapters', CHAPTERS.length, 'fails', fails, 'quiz', QUIZ.length, 'badges', BADGES.length, 'ext commands', Object.keys(LAB_EXT.commands).length);
process.exit(fails ? 1 : 0);
