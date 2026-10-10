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
const { Shell, CHAPTERS, QUIZ, BADGES, LAB_EXT } = vm.runInContext('({ Shell, CHAPTERS, QUIZ, BADGES, LAB_EXT })', ctx);
const sh = new Shell(); let fails = 0; let total = 0;
const ids = new Set();
for (const c of CHAPTERS) for (const m of c.missions) {
  total++;
  if (ids.has(m.id)) { fails++; console.log('DUP id', m.id); }
  ids.add(m.id);
  if (m.setup) m.setup(sh);
  let passed = false;
  for (const line of m.solution.split('\n')) {
    if (/^(nano|vim|vi) /.test(line)) {
      /* editor adimi, gorev kendi editorContent alanini verir */
      const f = line.split(/\s+/)[1];
      if (m.editorContent) { const abs = sh.resolve(f); const n = sh.node(abs); sh.writeFile(abs, typeof m.editorContent === 'function' ? m.editorContent(n ? n.d : '') : m.editorContent, false, 'nano'); }
      if (m.check(sh, { line: 'nano', out: '', submit: null })) passed = true;
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
