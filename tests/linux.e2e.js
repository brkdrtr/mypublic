'use strict';
/* Linux Lab arayuz testi. Repo kokunde python3 -m http.server 8765 acikken
   NODE_PATH=$(npm root -g) node tests/linux.e2e.js */
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765/linux-lab/';
const results = []; let failures = 0;
function ok(c, name, extra) { results.push((c ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!c) failures++; }

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  /* sahte GitHub gist API, iki cihaz ayni gist'i paylasir */
  let gist = null;
  const gistRoute = async route => {
    const req = route.request(); const url = req.url(); const m = req.method();
    const hdr = req.headers()['authorization'] || '';
    if (!hdr.startsWith('Bearer ghp_')) return route.fulfill({ status: 401, body: '{}' });
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(body) });
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (url.endsWith('/gists?per_page=100')) return json(200, gist ? [gist] : []);
    if (m === 'POST' && url.endsWith('/gists')) { gist = Object.assign({ id: 'g1' }, JSON.parse(req.postData())); return json(201, gist); }
    if (m === 'PATCH' && url.endsWith('/gists/g1')) { gist = Object.assign(gist, JSON.parse(req.postData())); return json(200, gist); }
    if (m === 'GET' && url.endsWith('/gists/g1')) return json(200, gist);
    return json(404, {});
  };
  const mk = async (opts) => {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('pageerror ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FAILED|404/.test(m.text())) errors.push('console ' + m.text()); });
    page.on('dialog', d => d.accept());
    await page.route('https://api.github.com/**', gistRoute);
    return page;
  };
  const text = async (p, sel) => (await p.textContent(sel)) || '';
  const count = async (p, sel) => (await p.$$(sel)).length;
  const run = async (p, cmd) => { await p.fill('#cmd', cmd); await p.press('#cmd', 'Enter'); await p.waitForTimeout(30); };
  const vis = async (p, sel) => { const el = await p.$(sel); return el ? el.isVisible() : false; };

  /* ---------- masaustu ---------- */
  const d = await mk({ viewport: { width: 1280, height: 800 } });
  await d.goto(BASE); await d.waitForTimeout(300);
  ok(await vis(d, '#term') && await vis(d, '#v-mission'), 'masaustunde terminal ve gorev paneli ayni anda gorunuyor');
  ok(!(await vis(d, '#tabs [data-v=term]')), 'masaustunde terminal sekmesi yok');
  ok(!(await vis(d, '#keys')), 'masaustunde tus cubugu gizli');
  ok((await text(d, '#who')).includes('Burak'), 'varsayilan profil Burak');
  const box = await d.$eval('#term', e => e.getBoundingClientRect().x);
  const pbox = await d.$eval('#panel', e => e.getBoundingClientRect().x);
  ok(box < pbox, 'terminal solda, panel sagda');
  await d.click('#tabs [data-v=home]');
  const chapters = await count(d, '.chap');
  ok(chapters >= 12, 'bolum listesi', String(chapters));
  await d.click('#go-next');
  ok(await vis(d, '#v-mission') && (await text(d, '#v-mission .tt')).length > 3, 'devam et gorev panelini aciyor');
  ok((await text(d, '#topmis')).length > 5, 'ust barda aktif gorev');
  const first = await d.evaluate(() => ALL[0]);
  ok(await count(d, '.steps li') === first.solution.split('\n').filter(s => s.trim() && !s.startsWith('#')).length, 'adimlar cozum satirlari kadar');
  ok(await count(d, '.steps .st.blur') > 0, 'normal modda adimlar gizli');
  await d.click('#mp-steps');
  ok(await count(d, '.steps .st.blur') === 0 && await count(d, '[data-use]') > 0, 'adimlar goster ile aciliyor');
  await d.click('#v-mission [data-use]');
  ok((await d.$eval('#cmd', e => e.value)).length > 0, 'adim yaz butonu komutu terminale koyuyor');
  await d.fill('#cmd', '');
  /* ilk gorevi coz, otomatik gecis */
  for (const line of first.solution.split('\n')) if (line.trim() && !line.startsWith('#')) await run(d, line.trim());
  ok((await text(d, '#term')).includes('Görev tamamlandı'), 'gorev tamamlandi satiri terminalde');
  ok(await count(d, '#v-mission .done-box') === 1 && await count(d, '.celebrate') === 0, 'popup yok, panelde tamamlandi kutusu');
  ok((await text(d, '#mp-auto')).includes('birazdan'), 'otomatik gecis sayaci');
  await d.waitForTimeout(2600);
  const second = await d.evaluate(() => ALL[1]);
  ok((await text(d, '#v-mission .tt')).includes(second.title), 'ikinci goreve otomatik gecti', await text(d, '#v-mission .tt'));
  ok((await text(d, '#term')).includes(second.title), 'terminalde yeni gorev basligi');
  /* otomatik gecis kapali */
  await d.click('#tabs [data-v=me]');
  await d.click('#s-auto');
  await d.click('#tabs [data-v=mission]');
  for (const line of second.solution.split('\n')) if (line.trim() && !line.startsWith('#')) await run(d, line.trim());
  await d.waitForTimeout(2600);
  ok((await text(d, '#v-mission .tt')).includes(second.title) && await count(d, '#mp-next') === 1, 'otomatik gecis kapaliyken kaliyor, Sonraki butonu var');
  await d.click('#mp-next');
  ok(!(await text(d, '#v-mission .tt')).includes(second.title), 'Sonraki ile gecis');
  /* adim isaretleme */
  const cur = await d.evaluate(() => ALL.find(m => m.id === st.current));
  const stepLines = cur.solution.split('\n').filter(s => s.trim() && !s.startsWith('#'));
  if (stepLines.length > 1) {
    await run(d, stepLines[0]);
    ok(await count(d, '.steps li.ok') >= 1, 'calistirilan adim isaretleniyor');
  }
  /* sozluk, quiz */
  await d.click('#tabs [data-v=man]');
  ok(await count(d, '.mitem') > 70, 'sozluk', String(await count(d, '.mitem')));
  await d.fill('#msearch', 'tcpdump');
  ok(await count(d, '.mitem') >= 1 && (await text(d, '.mitem .c')).includes('tcpdump'), 'ext komutlari sozlukte');
  await d.click('#tabs [data-v=quiz]'); await d.click('#qstart');
  ok(await count(d, '.opt') === 4, 'quiz basliyor');
  /* profil ekle, sil */
  await d.click('#who');
  ok(await vis(d, '#whosheet'), 'profil secici aciliyor');
  await d.fill('#wp-name', 'Bahu'); await d.click('#wp-add');
  ok((await text(d, '#who')).includes('Bahu'), 'yeni profil aktif');
  ok(await d.evaluate(() => st.xp === 0 && st.done.length === 0), 'yeni profil sifirdan');
  await d.click('#who'); await d.click('#whosheet .prof[data-p=burak]');
  ok(await d.evaluate(() => st.done.length === 2), 'eski profile donunce ilerleme yerinde');
  /* gezinme, adim gizliligi, aciklamali ipucu, komut aciklamasi */
  await d.click('#tabs [data-v=mission]');
  await d.evaluate(() => startMission('nav4'));
  await run(d, 'ls');
  await d.evaluate(() => startMission('nav5'));
  ok(await count(d, '#v-mission .steps .st.blur') === 2, 'onceki gorevde yazilan komut yeni gorevin adimini acmiyor', String(await count(d, '#v-mission .steps .st.blur')));
  await d.click('#mp-prev');
  ok(await d.evaluate(() => st.current === 'nav4'), 'Onceki butonu bir onceki goreve donuyor');
  await d.click('#mp-nextm');
  ok(await d.evaluate(() => st.current === 'nav5'), 'Sonraki butonu ilerliyor');
  ok((await text(d, '.mnav')).includes('5/'), 'bolum icinde konum gosteriliyor', await text(d, '.mnav'));
  await d.click('#mp-hint');
  ok(await count(d, '#v-mission .hc-wrap .hc') >= 1 && (await text(d, '#v-mission .hc-wrap')).includes('ls'), 'ipucunda kullanilacak arac ve aciklamasi');
  await d.click('#mp-sol');
  ok(await count(d, '#v-mission .sol-wrap .xp') >= 1, 'cozumde her satirin aciklamasi');
  await run(d, 'cut -d: -f1 /etc/passwd');
  ok((await text(d, '#mp-last')).includes('-d:') && (await text(d, '#mp-last')).toLowerCase().includes('ayırıcı'), 'son komutun aciklamasi panelde', (await text(d, '#mp-last')).slice(0, 120));
  await run(d, 'ls -l /etc');
  const xis = await d.$$('#term .xi');
  await xis[xis.length - 2].click();
  ok((await text(d, '#mp-last')).includes('cut'), 'terminaldeki i butonu o komutu acikliyor');
  await d.click('#v-mission [data-xs="0"]');
  ok(await count(d, '#v-mission .xp-li .xp') === 1, 'adimdaki soru isareti adim aciklamasini aciyor');
  await run(d, 'explain cut');
  ok((await text(d, '#term')).includes('Seçenekler'), 'explain komutu secenek listesini basiyor');
  await run(d, "explain awk -F: '{print $1}' /etc/passwd");
  ok((await text(d, '#term')).includes('1. alan'), 'explain awk programini acikliyor');
  await run(d, 'man cut');
  ok((await text(d, '#term')).includes('SEÇENEKLER VE ÖRNEKLER'), 'man ciktisina secenekler ekleniyor');
  await d.click('#tabs [data-v=man]'); await d.fill('#msearch', 'cut');
  ok(await count(d, '#mlist details.opts') >= 1, 'sozlukte tum secenekler bolumu');
  const hasVar = await d.evaluate(() => ALL.some(m => vCount(m) > 1));
  if (hasVar) {
    await d.evaluate(() => { const m = ALL.find(x => vCount(x) > 1); st.done.push(m.id); persist(); startMission(m.id); });
    const before = await d.evaluate(() => vIndex(ALL.find(x => x.id === st.current)));
    await d.click('#mp-replay');
    ok(await d.evaluate(b => vIndex(ALL.find(x => x.id === st.current)) !== b && st.practice === st.current, before), 'farkli senaryoyla tekrar baska varyanti aciyor');
  }

  /* senkron */
  await d.click('#tabs [data-v=me]');
  await d.fill('#gh-token', 'ghp_test'); await d.click('#gh-connect'); await d.waitForTimeout(300);
  ok(gist && gist.files['linux-lab.json'], 'token ile gist olustu');
  ok((await text(d, '#sync')) === '☁︎', 'senkron rozeti');
  const payload = JSON.parse(gist.files['linux-lab.json'].content);
  ok(payload.profiles.length === 2 && payload.states.burak.st.done.length >= 2, 'gist iki profil ve ilerlemeyi tasiyor');
  /* ikinci cihaz, bos localStorage, token girince ilerleme gelir */
  const d2 = await mk({ viewport: { width: 1280, height: 800 } });
  await d2.goto(BASE); await d2.waitForTimeout(200);
  ok(await d2.evaluate(() => st.done.length === 0), 'ikinci cihaz bos basliyor');
  ok(await count(d2, '.go-sync') === 1, 'senkron kapaliyken uyari gorunuyor');
  await run(d2, 'pwd'); await run(d2, 'ls');
  await d2.click('#tabs [data-v=me]');
  await d2.fill('#gh-token', 'ghp_test'); await d2.click('#gh-connect'); await d2.waitForTimeout(400);
  const want = JSON.parse(gist.files['linux-lab.json'].content).states.burak.st.done.length;
  ok(await d2.evaluate(w => st.done.length >= w && PROFILES.length === 2, want), 'ikinci cihaz once komut yazsa bile gist ilerlemesini aliyor, ezmiyor', await d2.evaluate(() => st.done.length + ' ' + PROFILES.length));
  await d2.waitForTimeout(1200);
  ok(JSON.parse(gist.files['linux-lab.json'].content).states.burak.st.done.length >= want, 'birlesmis durum gist e geri yazildi, ilerleme kaybolmadi');
  /* link ile ucuncu cihaz */
  const d3 = await mk({ viewport: { width: 1280, height: 800 } });
  await d3.goto(BASE + '#sync=ghp_test'); await d3.waitForTimeout(600);
  ok(await d3.evaluate(w => SYNC.token === 'ghp_test' && st.done.length >= w && !location.hash, want), 'senkron linki yeni tarayiciyi otomatik bagliyor', await d3.evaluate(() => SYNC.token + ' ' + st.done.length + ' ' + location.hash));
  /* ikinci cihazda ilerle, birinci cihaz cekince gorsun */
  const third = await d2.evaluate(() => ALL.find(m => !st.done.includes(m.id)));
  await d2.click('#tabs [data-v=home]'); await d2.click('#go-next');
  for (const line of third.solution.split('\n')) if (line.trim() && !line.startsWith('#')) await run(d2, line.trim());
  await d2.waitForTimeout(6500);
  ok(JSON.parse(gist.files['linux-lab.json'].content).states.burak.st.done.length > want, 'ikinci cihaz gist i guncelledi');
  await d.click('#gh-pull'); await d.waitForTimeout(400);
  ok(await d.evaluate(w => st.done.length > w, want), 'birinci cihaz cekince yeni gorevi goruyor', await d.evaluate(() => String(st.done.length)));
  await d.reload(); await d.waitForTimeout(400);
  ok(await d.evaluate(w => st.done.length > w && SYNC.token === 'ghp_test', want), 'yenilemede token ve ilerleme kaliyor');

  /* ---------- Ingilizce ---------- */
  /* kod, lang="tr" ile isaretli cevrilmemis icerik ve explain motoru ciktisi disinda Turkce karakter kalmasin.
     Cevrilmis gorev metnindeki Ayse gibi ozel isimler sayilmaz */
  const turkish = (p, sel) => p.evaluate(sel => {
    const root = document.querySelector(sel); if (!root) return 'yok ' + sel;
    const c = root.cloneNode(true);
    c.querySelectorAll('code, [lang=tr], .xp, .xp-ref, .hc > span, .hc li, .ex').forEach(e => e.remove());
    c.querySelectorAll('.story, .task, .hint, .tt, .mis, .chap, .qcard, b').forEach(e => { e.textContent = e.textContent.replace(/\p{Lu}\p{L}*/gu, w => /[ğışçöüĞİŞÇÖÜ]/.test(w) ? '' : w); });
    const t = c.textContent.replace(/\s+/g, ' '); const mm = t.match(/.{0,40}[ğışçöüĞİŞÇÖÜ].{0,40}/); return mm ? mm[0] : '';
  }, sel);
  await d.click('#tabs [data-v=me]');
  ok(await count(d, '#v-me [data-lang]') === 2 && (await text(d, '#v-me .lang-seg')).includes('Türkçe') && (await text(d, '#v-me .lang-seg')).includes('English'), 'profil ayarlarinda Turkce English secimi');
  await d.click('#v-me [data-lang=en]');
  ok(await d.evaluate(() => st.lang === 'en' && LAB_LANG === 'en' && document.documentElement.lang === 'en'), 'English secilince st.lang, LAB_LANG ve html lang en');
  ok((await text(d, '#toast')).includes('English'), 'dil degisim bildirimi Ingilizce');
  ok((await text(d, '#lang .on')) === 'EN', 'ust bardaki dil chipi EN gosteriyor');
  ok((await text(d, '#tabs [data-v=mission]')).includes('Mission') && (await text(d, '#tabs [data-v=man]')).includes('Dictionary'), 'sekmeler Ingilizce');
  ok(await turkish(d, '#tabs') === '', 'sekmelerde Turkce yok', await turkish(d, '#tabs'));
  ok(await turkish(d, '#v-me') === '', 'profil ekraninda Turkce yok', await turkish(d, '#v-me'));
  ok(await turkish(d, '#top') === '', 'ust barda Turkce yok', await turkish(d, '#top'));
  await d.click('#tabs [data-v=home]');
  ok((await text(d, '#v-home')).includes('Chapters') && await turkish(d, '#v-home') === '', 'bolumler ekrani Ingilizce', await turkish(d, '#v-home'));
  await d.click('#go-next');
  ok(await turkish(d, '#v-mission') === '', 'gorev panelinde Turkce yok', await turkish(d, '#v-mission'));
  const enMis = await d.evaluate(() => { const m = curMission(); return I18N_EN.missions[m.id] ? locMission(m).title : null; });
  if (enMis) ok((await text(d, '#v-mission .tt')).includes(enMis), 'gorev basligi overlay dan geliyor', enMis);
  await d.click('#mp-hint');
  ok((await text(d, '#v-mission')).includes('Tools you will use') && await turkish(d, '#v-mission') === '', 'ipucu kutusu Ingilizce', await turkish(d, '#v-mission'));
  await d.click('#mp-steps');
  await d.click('#v-mission [data-use]');
  await d.press('#cmd', 'Enter'); await d.waitForTimeout(80);
  ok(await turkish(d, '#v-mission') === '', 'komut sonrasi gorev paneli Ingilizce', await turkish(d, '#v-mission'));
  await d.click('#tabs [data-v=quiz]');
  ok(await turkish(d, '#v-quiz') === '', 'quiz giris ekrani Ingilizce', await turkish(d, '#v-quiz'));
  await d.click('#qstart');
  ok(await count(d, '.opt') === 4 && (await text(d, '.qhead')).includes('Question') && await turkish(d, '#v-quiz') === '', 'quiz sorusu Ingilizce', await turkish(d, '#v-quiz'));
  await d.click('.opt');
  ok(await count(d, '#qn') === 1 && await count(d, '.opt.right') === 1, 'quiz cevap tiklamasi calisiyor');
  await d.click('#tabs [data-v=man]');
  ok(await turkish(d, '#v-man') === '', 'sozlukte Turkce yok', await turkish(d, '#v-man'));
  await d.fill('#msearch', 'cut');
  const cutEn = await d.evaluate(() => I18N_EN.x.cut ? locX(EXPLAIN_DB.cut, I18N_EN.x.cut).d : null);
  if (cutEn) ok((await text(d, '#mlist')).includes(cutEn) && await count(d, '#mlist .u:not(:empty)') === 0, 'sozlukte Ingilizce aciklama, Turkce kullanim notu yok');
  await d.click('#v-man [data-mt=mine]');
  ok((await text(d, '#v-man')).includes('My commands') && await turkish(d, '#v-man') === '', 'ogrendiklerim Ingilizce', await turkish(d, '#v-man'));
  ok(await d.evaluate(() => !/[ğışçöüĞİŞÇÖÜ]/.test(cheatSheetText().split('\n').slice(0, 2).join(' '))), 'komut ozeti basligi Ingilizce');
  await run(d, 'man cut');
  if (cutEn) ok(!(await text(d, '#term')).split('$ man cut').pop().includes('SEÇENEKLER'), 'Ingilizce modda man sadece Ingilizce referansi basiyor');
  /* kalicilik, profil bazli, senkron */
  await d.evaluate(() => SYNC.push());
  await d.reload(); await d.waitForTimeout(500);
  ok(await d.evaluate(() => st.lang === 'en' && LAB_LANG === 'en') && (await text(d, '#tabs [data-v=mission]')).includes('Mission'), 'yenilemeden sonra dil English kaliyor');
  await d.click('#who'); await d.click('#whosheet .prof[data-p=bahu]');
  ok(await d.evaluate(() => st.lang === 'tr' && LAB_LANG === 'tr') && (await text(d, '#tabs [data-v=mission]')).includes('Görev'), 'diger profil kendi dilinde, Turkce');
  await d.click('#who');
  ok((await text(d, '#whosheet h2')).includes('Profil seç'), 'profil secici Turkce');
  await d.click('#whosheet .prof[data-p=burak]');
  ok(await d.evaluate(() => st.lang === 'en') && (await text(d, '#tabs [data-v=home]')).includes('Chapters'), 'profile donunce English geri geliyor');
  await d2.evaluate(() => syncPullReload(true)); await d2.waitForTimeout(200);
  ok(await d2.evaluate(() => st.lang === 'en' && LAB_LANG === 'en') && (await text(d2, '#tabs [data-v=mission]')).includes('Mission'), 'dil ayari senkronla diger cihaza gidiyor');
  /* ust bar chipi ile Turkceye donus */
  await d.click('#lang');
  ok(await d.evaluate(() => st.lang === 'tr' && LAB_LANG === 'tr' && document.documentElement.lang === 'tr'), 'chip ile Turkceye donus');
  await d.click('#tabs [data-v=home]');
  ok((await text(d, '#tabs [data-v=mission]')).includes('Görev') && (await text(d, '#v-home')).includes('Bölümler') && (await text(d, '#v-home')).includes('Günün görevleri'), 'Turkce metinler geri geliyor');
  await d.click('#tabs [data-v=me]');
  ok((await text(d, '#v-me')).includes('Cihazlar arası senkron') && (await text(d, '#v-me')).includes('Zorluk'), 'profil ekrani Turkce');

  /* ---------- iPhone ---------- */
  const m = await mk({ ...devices['iPhone 13'] });
  await m.goto(BASE); await m.waitForTimeout(300);
  ok(await vis(m, '#tabs [data-v=term]'), 'iPhone da terminal sekmesi var');
  ok(await vis(m, '#v-home') && !(await vis(m, '#term')), 'iPhone acilista bolumler, terminal gizli');
  await m.click('#go-next');
  ok(await vis(m, '#term') && await vis(m, '#keys'), 'gorev baslayinca terminal ve tus cubugu');
  ok(await vis(m, '#mstrip') && (await text(m, '#mstrip .task')).length > 5, 'terminal ustunde gorev seridi ve gorev metni');
  await m.click('#ms-tg');
  ok(!(await vis(m, '#mstrip .task')) && (await text(m, '#mstrip .tt')).length > 2, 'serit katlaninca sadece baslik');
  await m.click('#ms-tg');
  await m.click('#ms-steps');
  ok(await count(m, '#mstrip .steps li') >= 1 && await count(m, '#mstrip [data-use]') >= 1, 'seritte adimlar aciliyor');
  await m.click('#mstrip [data-use]');
  ok((await m.$eval('#cmd', e => e.value)).length > 0, 'seritteki yaz butonu komutu koyuyor');
  await m.fill('#cmd', '');
  ok(!(await vis(d, '#mstrip')), 'masaustunde serit yok');
  await m.click('#tabs [data-v=mission]');
  ok(await vis(m, '#v-mission') && !(await vis(m, '#term')), 'gorev sekmesi paneli aciyor');
  await m.click('#tabs [data-v=term]');
  ok(await vis(m, '#term'), 'terminal sekmesine donus');
  await m.click('#keys .keybtn[data-k="|"]');
  ok((await m.$eval('#cmd', e => e.value)) === '|', 'tus cubugu karakter ekliyor');
  await m.fill('#cmd', '');
  const mf = await m.evaluate(() => ALL[0]);
  for (const line of mf.solution.split('\n')) if (line.trim() && !line.startsWith('#')) await run(m, line.trim());
  ok((await text(m, '#term')).includes('Görev tamamlandı') && await count(m, '.celebrate') === 0, 'iPhone da popup yok');
  ok(await count(m, '#mstrip .done-box') === 1, 'seritte tamamlandi kutusu');
  await m.waitForTimeout(2600);
  ok(await m.evaluate(() => st.current === ALL[1].id), 'iPhone da otomatik gecis');
  const hs = await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok(hs, 'yatay tasma yok');

  ok(errors.length === 0, 'JS hatasi yok', errors.slice(0, 5).join(' | '));
  console.log(results.filter(r => r.startsWith('FAIL')).join('\n') || '');
  console.log(`\n${results.length - failures}/${results.length} passed`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); console.log(results.filter(r => r.startsWith('FAIL')).join('\n')); process.exit(2); });
