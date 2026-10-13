'use strict';
/* NetDevOps Lab arayuz testi. Repo kokunde python3 -m http.server 8765 acikken
   NODE_PATH=$(npm root -g) node tests/netdevops.e2e.js */
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765/netdevops-lab/';
const results = []; let failures = 0;
function ok(c, name, extra) { results.push((c ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!c) failures++; }
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const mk = async opts => { const ctx = await browser.newContext({ serviceWorkers: 'block', ...opts }); const p = await ctx.newPage(); p.on('pageerror', e => errors.push('pageerror ' + e.message)); p.on('dialog', d => d.accept(d.type() === 'prompt' ? 'demo.py' : undefined)); return p; };
  const text = async (p, s) => (await p.textContent(s)) || '';
  const count = async (p, s) => (await p.$$(s)).length;
  const vis = async (p, s) => { const el = await p.$(s); return el ? el.isVisible() : false; };
  const run = async (p, cmd) => { await p.fill('#cmd', cmd); await p.press('#cmd', 'Enter'); await p.waitForTimeout(40); };

  const d = await mk({ viewport: { width: 1280, height: 800 } });
  await d.goto(BASE); await d.waitForTimeout(300);
  ok(await vis(d, '#term') && await vis(d, '#v-mission'), 'masaustu terminal ve panel');
  ok((await text(d, '#pychip')).includes('🐍'), 'python rozeti var');
  await d.waitForFunction(() => PY.status === 'ready', { timeout: 150000 });
  ok((await text(d, '#pychip')).includes('hazır'), 'python hazir rozeti');
  await run(d, 'python3 -c "print(sum(range(10)))"');
  ok((await text(d, '#term')).includes('45'), 'terminalde python calisiyor');
  await run(d, 'lab devices');
  ok(/r1/.test(await text(d, '#term')), 'lab devices r1 listeliyor');
  await d.click('#tabs [data-v=editor]');
  ok(await count(d, '.edf') > 0, 'editor dosya listesi');
  await d.click('#ed-new'); await d.waitForTimeout(80);
  ok(await vis(d, '#ed-area'), 'yeni dosya editorde acildi');
  await d.fill('#ed-area', 'x = [i*i for i in range(4)]\nprint(x)\n');
  await d.click('#ed-run'); await d.waitForTimeout(300);
  ok((await text(d, '#term')).includes('[0, 1, 4, 9]'), 'editorden calistirma');
  await run(d, 'cat demo.py');
  ok((await text(d, '#term')).includes('range(4)'), 'editor dosyasi sanal diskte');
  await d.click('#tabs [data-v=home]');
  const chapters = await count(d, '.chap');
  ok(chapters >= 10, 'bolum listesi', String(chapters));
  const total = await d.evaluate(() => ALL.length);
  ok(total >= 100, 'toplam gorev', String(total));
  await d.click('#go-next');
  ok((await text(d, '#v-mission .tt')).length > 3, 'ilk gorev acildi');
  await d.click('#tabs [data-v=man]');
  ok(await count(d, '.mitem') > 90, 'sozluk', String(await count(d, '.mitem')));
  await d.fill('#msearch', 'kubectl');
  ok(await count(d, '.mitem') >= 1, 'kubectl sozlukte');
  await d.click('#tabs [data-v=quiz]'); await d.click('#qstart');
  ok(await count(d, '.opt') === 4, 'quiz');
  await d.click('#who'); await d.fill('#wp-name', 'Test'); await d.click('#wp-add');
  ok((await text(d, '#who')).includes('Test') && await d.evaluate(() => st.done.length === 0), 'yeni profil');
  await d.click('#who'); await d.click('#whosheet .prof[data-p=burak]');
  ok((await text(d, '#who')).includes('Burak'), 'profil degisimi');

  const m = await mk({ ...devices['iPhone 13'] });
  await m.goto(BASE); await m.waitForTimeout(400);
  ok(await vis(m, '#tabs [data-v=term]') && await vis(m, '#tabs [data-v=more]'), 'iPhone sekmeleri');
  await m.click('#tabs [data-v=more]');
  ok(await count(m, '#v-more .tile') === 4, 'daha sekmesi');
  await m.click('#v-more [data-go=man]');
  ok(await vis(m, '#msearch'), 'daha, sozluk');
  await m.click('#tabs [data-v=editor]');
  ok(await vis(m, '#v-editor'), 'iPhone editor');
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'yatay tasma yok');

  ok(errors.length === 0, 'JS hatasi yok', errors.slice(0, 5).join(' | '));
  console.log(results.filter(r => r.startsWith('FAIL')).join('\n') || '');
  console.log(`\n${results.length - failures}/${results.length} passed`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); console.log(results.filter(r => r.startsWith('FAIL')).join('\n')); process.exit(2); });
