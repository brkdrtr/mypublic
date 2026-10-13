'use strict';
/* NetDevOps Lab gorev testi. Gercek Pyodide ile Chromium icinde her gorevin cozumunu oynatir.
   Repo kokunde python3 -m http.server 8765 acikken
   NODE_PATH=$(npm root -g) node tests/netdevops.test.js [bolum-id] */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765/netdevops-lab/';
const only = process.argv[2] || null;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + 'index.html');
  await page.waitForFunction(() => typeof PY !== 'undefined' && typeof CHAPTERS !== 'undefined', { timeout: 30000 });
  await page.evaluate(() => PY.load());
  await page.waitForFunction(() => PY.status === 'ready' || PY.status === 'error', { timeout: 180000 });
  const pyStatus = await page.evaluate(() => PY.status + ' ' + PY.msg);
  console.log('python', pyStatus);
  const result = await page.evaluate(async (only) => {
    const fails = [];
    let missions = 0, chapters = 0;
    const shx = new Shell(null);
    for (const c of CHAPTERS) {
      if (only && c.id !== only) continue;
      chapters++;
      shx.reset();
      Object.values(LAB.devices).forEach(d => { if (d.reset) d.reset(); });
      for (const m of c.missions) {
        missions++;
        shx.cwd = '/home/burak'; shx.isRoot = false;
        let passed = false; const log = [];
        try {
          if (m.setup) m.setup(shx);
          const lines = String(m.solution || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
          if (!lines.length) { fails.push(`${c.id}/${m.id} solution bos`); continue; }
          for (const line of lines) {
            let res, out = '';
            const ed = /^(sudo\s+)?(nano|vim|vi)\s+(\S+)$/.exec(line);
            if (ed) {
              const content = typeof m.editorContent === 'string' ? m.editorContent : (m.editorContent || {})[ed[3]];
              if (content == null) { fails.push(`${c.id}/${m.id} editorContent yok ${ed[3]}`); break; }
              const was = shx.isRoot; shx.isRoot = !!ed[1];
              const dir = shx.resolve(ed[3]).split('/').slice(0, -1).join('/') || '/';
              if (!shx.node(dir)) shx.run(`mkdir -p ${dir}`);
              const err = shx.writeFile(ed[3], content.endsWith('\n') ? content : content + '\n', false, 'nano');
              shx.isRoot = was;
              if (err) { log.push('nano ' + err); }
              shx.history.push(line);
              res = { chunks: [], ui: {} };
            } else {
              res = shx.run(line);
              out = res.chunks.filter(ch => ch.cls !== 'err').map(ch => ch.text).join('');
              const errTxt = res.chunks.filter(ch => ch.cls === 'err').map(ch => ch.text).join('');
              log.push('$ ' + line + '\n' + (out + errTxt).slice(0, 400));
            }
            let ok2 = false;
            try { ok2 = !!m.check(shx, { line, out, submit: res.ui.submit == null ? null : res.ui.submit }); } catch (e) { log.push('check hata ' + e.message); }
            if (ok2) { passed = true; }
          }
        } catch (e) { log.push('hata ' + (e.stack || e.message)); }
        if (!passed) fails.push(`${c.id}/${m.id} ${m.title}\n` + log.slice(-4).join('\n'));
      }
    }
    return { fails, missions, chapters, quiz: QUIZ.length, badges: BADGES.length, cmds: Object.keys(LAB_EXT.commands).length };
  }, only);
  result.fails.forEach(f => console.log('FAIL ' + f + '\n'));
  console.log(`missions ${result.missions} chapters ${result.chapters} fails ${result.fails.length} quiz ${result.quiz} badges ${result.badges} ext commands ${result.cmds}`);
  if (errors.length) console.log('page errors', errors.slice(0, 5));
  await browser.close();
  process.exit(result.fails.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
