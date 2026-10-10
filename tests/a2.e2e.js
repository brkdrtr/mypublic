'use strict';
/* A2 Nederlands uctan uca test. Calistirma, repo kokunde python3 -m http.server 8765 acikken
   NODE_PATH=$(npm root -g) node tests/a2.e2e.js */

const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765/dutch-a2/';
const results = [];
let failures = 0;
function ok(cond, name, extra) { results.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) failures++; }

(async () => {
  const proxy = undefined;
  const browser = await chromium.launch({ proxy, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13'], permissions: ['microphone'], ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource.*(favicon|anthropic|401|ERR_FAILED)/.test(m.text())) errors.push('console ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.clock.install();
  await page.addInitScript(() => {
    window.__srMode = 'ok';
    class FakeSR {
      start() { setTimeout(() => { if (window.__srMode === 'deny') { if (this.onerror) this.onerror({ error: 'not-allowed' }); if (this.onend) this.onend(); return; } const res = [[{ transcript: 'Ik woon al drie jaar in Purmerend' }]]; res[0].isFinal = true; if (this.onresult) this.onresult({ results: res }); }, 100); }
      stop() { setTimeout(() => { if (this.onend) this.onend(); }, 10); }
      abort() {}
    }
    window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;
  });
  /* LanguageTool varsayilan olarak erisilemez, ayri testte sahte yanit verilir */
  let ltMode = 'down';
  await page.route('https://api.languagetool.org/**', async route => {
    if (ltMode === 'down') return route.abort();
    const body = new URLSearchParams(route.request().postData() || '');
    const txt = body.get('text') || '';
    const i = txt.indexOf('pakket');
    const matches = i >= 0 ? [{ message: 'Het pakket, niet de pakket', offset: i - 3, length: 9, replacements: [{ value: 'het pakket' }] }] : [];
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ language: { code: 'nl' }, matches }) });
  });

  const tab = async t => { await page.click(`#tabs button[data-t=${t}]`); await page.waitForTimeout(30); };
  const text = async sel => (await page.textContent(sel)) || '';
  const count = async sel => (await page.$$(sel)).length;
  /* Ekrandaki her Hollandaca kelime icin sozlukte karsilik var mi */
  const unknownWords = async () => page.evaluate(() => [...new Set([...document.querySelectorAll('.wd')].map(e => e.dataset.w))].filter(w => !lookup(w)));
  const allUnknown = new Set();
  const scan = async () => (await unknownWords()).forEach(w => allUnknown.add(w));
  /* Ingilizce modda Turkce harf kalmis mi, Hollandaca kelimeler haric */
  const turkishLeft = async () => page.evaluate(() => {
    const clone = document.querySelector('#main').cloneNode(true);
    clone.querySelectorAll('.wd, .reading, .model, textarea, input, select, [data-l]').forEach(e => e.remove());
    const names = new Set([...document.querySelectorAll('.wd')].map(e => e.textContent));
    const txt = clone.innerText.split(/(\s+)/).filter(w => !names.has(w.replace(/[.,!?']+$/g, '').replace(/'s$/, ''))).join('');
    const m = txt.match(/[^\n]*[ğışİçĞŞÇ][^\n]*/g);
    return m ? m.slice(0, 3) : [];
  });
  const rawKeys = async () => page.evaluate(() => { const m = document.querySelector('#app').innerText.match(/\b(?:me|ex|sp|w|f|dh|ty|knm|gram|plan|m|r|t|q|s|info|ai|fix)_[a-z0-9_]+\b/g); return m || []; });

  /* ---------- 1. ilk acilis ve profil secimi ---------- */
  await page.goto(BASE);
  await page.waitForTimeout(300);
  ok(await count('.who-btn[data-p]') === 2 && await count('#who-add') === 1, 'profil secim ekrani iki profil ve yeni profil butonu gosteriyor');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('#tabs')).visibility) === 'hidden', 'profil secilmeden sekmeler gizli');
  await page.click('.who-btn[data-p=burak]');
  ok((await text('#who')).includes('Burak'), 'Burak profili aktif');
  ok(await count('.plan') === 6, 'gunluk plan 6 madde');

  /* ---------- 2. plan butonlari ---------- */
  for (let i = 0; i < 6; i++) {
    await tab('home');
    await page.click(`.plan .go[data-i="${i}"]`);
    await page.waitForTimeout(60);
    ok(await count('.back') === 1, 'plan maddesi ' + i + ' ekran aciyor');
  }

  /* ---------- 3. kelimeler ---------- */
  await tab('words');
  await page.click('#w-start');
  let rated = 0;
  for (let i = 0; i < 12; i++) {
    if (!(await page.$('#f-show'))) break;
    await page.click('#f-show');
    ok(await count('.rate button') === 4, 'flashcard puanlama 4 buton', 'kart ' + i);
    await scan();
    await page.click(i % 4 === 0 ? '.rate .r0' : '.rate .r2');
    rated++;
  }
  ok(rated >= 10, 'flashcard en az 10 kart puanlandi', String(rated));
  await tab('words');
  await page.click('#w-rev');
  if (await page.$('#f-more')) { ok(true, 'kart bitince bitis ekrani'); await page.click('#f-more'); }
  await page.click('#f-show');
  ok(await count('.flash .w') === 1, 'ters kart Hollandacayi gosteriyor');
  await tab('words');
  await page.click('#w-dehet'); await page.click('#dh-go');
  for (let i = 0; i < 6; i++) await page.click(i % 2 ? '.big-choice .de' : '.big-choice .het');
  await page.clock.fastForward(61000);
  await page.waitForTimeout(50);
  ok((await text('#main')).match(/\d+ doğru \/ 6/), 'de of het oyunu suresi bitince skor gosteriyor', (await text('#main h2')));
  await tab('words');
  await page.click('#w-type');
  for (let i = 0; i < 10; i++) { await page.fill('#ty-in', 'xxx'); await page.click('#ty-check'); ok((await text('.ex')).includes('❌'), 'yazarak test yanlis cevap geri bildirimi', String(i)); await page.click('#ty-next'); }
  ok((await text('#main h2')) === '0/10', 'yazarak test sonucu');
  const themeIds = await page.evaluate(() => VOCAB_THEMES.map(x => x.id));
  for (const id of themeIds) { await tab('words'); await page.click(`[data-th="${id}"]`); ok(await count('.wordrow') > 5, 'tema ' + id); }

  /* ---------- 4. Lezen ---------- */
  const lezenIds = await page.evaluate(() => LEZEN.map(x => x.id));
  for (const id of lezenIds) {
    await tab('practice'); await page.click('[data-go=lezen]'); await page.click(`[data-id="${id}"]`);
    await scan();
    const qn = await count('#lz-q .card');
    for (let q = 0; q < qn; q++) await page.click(`#lz-q .card:nth-child(${q + 1}) .opt`);
    await page.click('#mc-check');
    ok(await count('#lz-q .opt.right') === qn, 'lezen ' + id + ' dogru cevaplar isaretli');
    ok((await text('#lz-after')).includes('/' + qn), 'lezen ' + id + ' sonuc');
    await scan();
  }
  await tab('practice'); await page.click('[data-go=lezen]'); await page.click(`[data-id="${lezenIds[0]}"]`);
  await page.click('.reading .wd');
  ok(!(await text('#pop')).includes('sözlükte yok'), 'okuma metninde kelimeye dokununca ceviri', await text('#pop'));
  const firstOptWord = await page.$('#lz-q .opt .wd');
  await firstOptWord.scrollIntoViewIfNeeded();
  const bb = await firstOptWord.boundingBox();
  await page.mouse.move(bb.x + 3, bb.y + 3); await page.mouse.down(); await page.clock.runFor(600); await page.waitForTimeout(30); await page.mouse.up();
  ok(await count('#lz-q .opt.sel') === 0 && !(await page.$eval('#pop', e => e.classList.contains('hidden'))), 'sikta basili tutmak secmeden ceviri gosteriyor');

  /* ---------- 5. Luisteren ---------- */
  const luIds = await page.evaluate(() => LUISTEREN.map(x => x.id));
  for (const id of luIds) {
    await tab('practice'); await page.click('[data-go=luisteren]'); await page.click(`[data-id="${id}"]`);
    await page.click('#lu-play'); await page.waitForTimeout(20); await page.click('#lu-play');
    const qn = await count('#lu-q .card');
    for (let q = 0; q < qn; q++) await page.click(`#lu-q .card:nth-child(${q + 1}) .opt`);
    await page.click('#mc-check');
    ok(await count('#lu-tr .line') > 3, 'luisteren ' + id + ' metin gosteriliyor');
    await scan();
  }

  /* ---------- 6. Schrijven, temel kontrol ---------- */
  const sch = await page.evaluate(() => SCHRIJVEN.map(x => ({ id: x.id, fields: (x.fields || []).length, model: x.model })));
  for (const x of sch) {
    await tab('practice'); await page.click('[data-go=schrijven]'); await page.click(`[data-id="${x.id}"]`);
    await scan();
    if (x.fields) { const inputs = await page.$$('[data-f]'); for (const el of inputs) await el.fill('Ik woon in Purmerend.'); }
    else await page.fill('#sc-text', x.model);
    await page.click('#sc-check');
    await page.waitForSelector('#sc-res .diff');
    ok(await count('#sc-res .check') > 0, 'schrijven ' + x.id + ' kontrol listesi');
    if (!x.fields) ok(await count('#sc-res .check.no') === 0, 'schrijven ' + x.id + ' ornek cevap tum noktalari karsiliyor', (await page.$$eval('#sc-res .check.no', e => e.map(z => z.textContent))).join(' | '));
    await scan();
  }
  await tab('practice'); await page.click('[data-go=schrijven]'); await page.click(`[data-id="${sch.find(s => !s.fields).id}"]`);
  await page.fill('#sc-text', 'beste meneer, ik werkt morgen niet. de huis is koud.  Ik heeft een afsprak bij de huisarts. Groeten, Burak');
  await page.click('#sc-check'); await page.waitForSelector('#sc-res .diff');
  const fixed = await page.evaluate(() => autoFix('beste meneer, ik werkt morgen niet. de huis is koud.  Ik heeft een afsprak bij de huisarts. Groeten, Burak').fixed);
  ok(/ik werk morgen/.test(fixed) && /Het huis/.test(fixed) && /Ik heb een afspraak/.test(fixed) && /Beste/.test(fixed), 'temel duzeltme fiil, de het, yazim ve buyuk harf hatalarini duzeltiyor', fixed.replace(/\n/g, ' '));
  ok(await count('#sc-res s.del') >= 4 && await count('#sc-res b.ins') >= 4, 'duzeltme farki silinen ve eklenen kelimeleri isaretliyor');

  ltMode = 'up';
  await tab('practice'); await page.click('[data-go=schrijven]'); await page.click(`[data-id="${sch.find(s => !s.fields).id}"]`);
  await page.fill('#sc-text', 'Beste buurvrouw, dank je wel voor de pakket. Ik werkt morgen. Groeten, Burak');
  await page.click('#sc-check'); await page.waitForSelector('#sc-res .diff');
  const ltTxt = await text('#sc-res');
  ok(ltTxt.includes('LanguageTool') && (await page.$$eval('#sc-res .diff b.ins', e => e.map(x => x.textContent))).join(' ') === 'het werk', 'LanguageTool duzeltmesi ve yerel kurallar birlikte uygulaniyor', ltTxt.slice(0, 160));
  ltMode = 'down';
  await page.click('#sc-check'); await page.waitForSelector('#sc-res .diff');
  ok((await text('#sc-res')).includes('LanguageTool\'a ulaşılamadı'), 'LanguageTool erisilemezse offline kontrole dusuyor');

  /* ---------- 7. Spreken ---------- */
  const spIds = await page.evaluate(() => SPREKEN.map(x => x.id));
  for (const id of spIds) {
    await tab('practice'); await page.click('[data-go=spreken]'); await page.click(`[data-id="${id}"]`);
    await page.click('#sp-check');
    ok(await count('#sp-res .card') === 0, 'spreken ' + id + ' bos metinle kontrol yapmiyor');
    const model = await page.evaluate(i => SPREKEN.find(x => x.id === i).model, id);
    await page.fill('#sp-text', model);
    await page.click('#sp-check');
    await page.waitForSelector('#sp-res .score');
    const sc = +(await text('#sp-res .score')).match(/(\d)\/5/)[1];
    ok(sc >= 4, 'spreken ' + id + ' ornek cevap yuksek puan aliyor', String(sc));
    await page.click('#sp-model');
    await scan();
  }
  await tab('practice'); await page.click('[data-go=spreken]'); await page.click(`[data-id="${spIds[0]}"]`);
  await page.fill('#sp-text', 'ja');
  await page.click('#sp-check'); await page.waitForSelector('#sp-res .score');
  ok(+(await text('#sp-res .score')).match(/(\d)\/5/)[1] <= 2, 'spreken alakasiz kisa cevap dusuk puan aliyor');
  await page.fill('#sp-text', '');
  await page.click('#sp-sr');
  ok((await text('.sp-live')).length > 0, 'ses tanima dinlemeye basliyor');
  await page.clock.runFor(200); await page.waitForTimeout(50);
  ok((await page.$eval('#sp-text', e => e.value)) === 'Ik woon al drie jaar in Purmerend', 'ses tanima metni kutuya yaziyor', await page.$eval('#sp-text', e => e.value));
  await page.clock.runFor(2700); await page.waitForTimeout(50);
  ok(!(await page.$('.sp-live')), 'ses tanima sessizlikte kendiliginden duruyor');
  await page.click('#sp-sr'); await page.waitForTimeout(30);
  ok(!!(await page.$('.sp-live')), 'ses tanima tekrar basliyor');
  await page.click('#sp-sr'); await page.clock.runFor(50); await page.waitForTimeout(50);
  ok(!(await page.$('.sp-live')) && (await page.$eval('#sp-text', e => e.value)).includes('Purmerend'), 'ses tanima bitince metin korunuyor');
  await page.evaluate(() => { window.__srMode = 'deny'; });
  await page.click('#sp-sr'); await page.clock.runFor(200); await page.waitForTimeout(50);
  ok((await text('#toast')).includes('izin'), 'ses tanima izni yoksa dikteye yonlendiriyor', await text('#toast'));
  await page.evaluate(() => { window.__srMode = 'ok'; });
  await page.fill('#sp-text', 'ja');
  await page.click('#sp-rec');
  await page.waitForTimeout(400);
  ok(await page.$eval('#sp-rec', e => e.classList.contains('on')), 'ses kaydi basliyor');
  ok(!(await page.$eval('#sp-sr', e => e.classList.contains('on'))), 'kayit ve ses tanima ayni anda calismiyor');
  await page.clock.runFor(2000);
  await page.click('#sp-rec');
  await page.waitForTimeout(600); await page.clock.runFor(600); await page.waitForTimeout(100);
  ok(await count('audio') === 1, 'kayit bitince dinleme oynaticisi geliyor');
  ok((await page.$eval('#sp-text', e => e.value)) === 'ja', 'kayit sonrasi yazilan metin korunuyor');

  const voiceTest = await page.evaluate(() => {
    const saved = TTS.voices;
    TTS.voices = [{ name: 'Xander', lang: 'nl-NL', voiceURI: 'com.apple.voice.compact.nl-NL.Xander' }, { name: 'Ellen', lang: 'nl-BE', voiceURI: 'com.apple.voice.enhanced.nl-BE.Ellen' }];
    const a = TTS.pick('f').name + '/' + TTS.pick('m').name;
    TTS.voices = [{ name: 'Xander', lang: 'nl-NL', voiceURI: 'com.apple.voice.compact.nl-NL.Xander' }, { name: 'Claire', lang: 'nl-NL', voiceURI: 'com.apple.voice.enhanced.nl-NL.Claire' }, { name: 'Xander (Enhanced)', lang: 'nl-NL', voiceURI: 'com.apple.voice.enhanced.nl-NL.Xander' }];
    const b = TTS.pick('f').name + '/' + TTS.pick('m').name;
    TTS.voices = [{ name: 'Xander', lang: 'nl-NL', voiceURI: 'com.apple.voice.enhanced.nl-NL.Xander' }, { name: 'Claire', lang: 'nl-NL', voiceURI: 'com.apple.voice.compact.nl-NL.Claire' }];
    const c = TTS.pick('f').name + '/' + TTS.pick('m').name;
    TTS.voices = saved;
    return [a, b, c];
  });
  ok(voiceTest[0] === 'Xander/Xander' && voiceTest[1] === 'Claire/Xander (Enhanced)' && voiceTest[2] === 'Xander/Xander', 'zayif veya Belcika kadin sesi yerine erkek ses, iyi nl-NL kadin ses varsa o', voiceTest.join(' | '));

  /* ---------- 8. KNM ---------- */
  await tab('practice'); await page.click('[data-go=knm]'); await page.click('#k-mix');
  for (let i = 0; i < 10; i++) { await scan(); await page.click('.opt'); ok(await count('.opt.right') === 1, 'knm soru ' + i + ' dogru cevap isaretli'); await page.click('#kq-next button'); }
  ok((await text('#main h2')).match(/\d+\/10/), 'knm sonuc');
  const knmThemes = await page.evaluate(() => Object.keys(KNM_THEMES));
  for (const k of knmThemes) { await tab('practice'); await page.click('[data-go=knm]'); await page.click(`[data-k="${k}"]`); ok(await count('.opt') === 3, 'knm tema ' + k); }
  await tab('practice'); await page.click('[data-go=knm]');
  const wrongN = +(await text('#k-wrong .s')).match(/\d+/)[0];
  ok(wrongN >= 0, 'hatalarim sayaci', String(wrongN));
  if (wrongN) { await page.click('#k-wrong'); ok(await count('.opt') === 3, 'hatalarim listesi aciliyor'); }

  /* ---------- 9. gramer ---------- */
  const gIds = await page.evaluate(() => GRAMMAR.map(g => g.id));
  for (const g of gIds) {
    await tab('practice'); await page.click('[data-go=gram]'); await page.click(`[data-g="${g}"]`);
    ok((await text('.lesson')).length > 200, 'ders ' + g + ' metni');
    await page.click('#gl-go');
    let n = 0;
    while (await page.$('.opt') && n < 20) { await scan(); await page.click('.opt'); await page.click('#gd-next button'); n++; }
    ok(await count('#gd-again') === 1, 'ders ' + g + ' alistirma tamamlandi', String(n));
  }
  await tab('practice'); await page.click('[data-go=gram]'); await page.click('#g-verbs');
  for (let i = 0; i < 12; i++) { await page.click('.opt'); ok(await count('.opt.right') === 1, 'fiil sorusu ' + i); await page.click('#vd-next button'); }
  ok(await count('#vd-again') === 1, 'fiil cekimi tamamlandi');
  ok(await page.evaluate(() => VERBS.every(v => ['ik', 'jij', 'hij', 'wij'].every(p => ['nu', 'perf', 'verl'].every(tn => verbForm(v, tn, p))))), 'tum fiillerde tum zaman ve sahis formlari uretiliyor');
  await tab('practice'); await page.click('[data-go=gram]'); await page.click('#g-mix');
  for (let i = 0; i < 12; i++) { await page.click('.opt'); await page.click('#gd-next button'); }
  ok(await count('#gd-again') === 1, 'karisik gramer testi');

  /* ---------- 10. sinavlar ---------- */
  await tab('exam'); await page.click('[data-x=knm20]');
  for (let i = 0; i < 20; i++) { await page.click('.opt'); if (i < 19) await page.click('#ex-next'); }
  await page.click('#ex-end');
  ok((await text('#main h2')).includes('/20'), 'KNM kisa deneme puanlandi');
  await tab('exam'); await page.click('[data-x=knm]');
  await page.clock.fastForward(45 * 60 * 1000 + 2000); await page.waitForTimeout(50);
  ok((await text('#main h2')).includes('/40'), 'KNM tam deneme sure dolunca otomatik bitiyor');
  await tab('exam'); await page.click('[data-x=lezen]');
  for (const el of await page.$$('[id^=exl-] .card')) { const o = await el.$('.opt'); await o.click(); }
  await page.click('#exl-end');
  ok((await text('#main h2')).match(/\d+\/\d+/), 'Lezen deneme puanlandi');
  await tab('exam'); await page.click('[data-x=luisteren]');
  for (let i = 0; i < 6; i++) { for (const el of await page.$$('.card:has(.opt)')) { const o = await el.$('.opt'); await o.click(); } await page.click('#el-next'); }
  ok((await text('#main h2')).match(/\d+\/\d+/), 'Luisteren deneme puanlandi');
  await tab('exam');
  ok(await count('.wordrow') === 4, 'gecmis denemeler listeleniyor', String(await count('.wordrow')));

  /* ---------- 11. Claude ile duzeltme, sahte API ---------- */
  let apiCalls = 0; let lastBody = null; let mode = 'ok';
  await page.route('https://api.anthropic.com/**', async route => {
    apiCalls++;
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } });
    lastBody = JSON.parse(req.postData() || '{}');
    if (mode === '401') return route.fulfill({ status: 401, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) });
    const isSpeak = /Spreken/.test(lastBody.system || '');
    const payload = isSpeak
      ? { corrected_text: 'Ik woon al drie jaar in Purmerend.', changes: [{ from: 'woon in Purmerend drie jaar', to: 'woon al drie jaar in Purmerend', why: 'Süre al ... jaar ile, yer en sona yakın' }], answers_question: true, score: 3, feedback: 'Soruya cevap verdin.', better_answer: 'Ik woon al drie jaar in Purmerend. Het is een rustige stad.' }
      : { corrected_text: 'Beste meneer,\n\nIk ben vandaag ziek. Ik kom morgen weer.\n\nMet vriendelijke groet,\nBurak', changes: [{ from: 'ik ben ziek vandaag', to: 'Ik ben vandaag ziek', why: 'Zaman ifadesi fiilden sonra' }], points: [{ point: 'Hitap', covered: true }, { point: 'Ne zaman döneceğin', covered: true }], score: 4, feedback: 'Güzel ve net.' };
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'request-id': 'req_test' }, body: JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', model: lastBody.model, content: [{ type: 'text', text: JSON.stringify(payload) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }) });
  });
  await tab('me');
  await page.fill('#s-key', 'sk-ant-test-123');
  await page.click('#s-key-save');
  ok((await text('#s-ai-state')).includes('Açık'), 'API anahtari kaydedildi');
  const msgId = sch.find(s => !s.fields).id;
  await tab('practice'); await page.click('[data-go=schrijven]'); await page.click(`[data-id="${msgId}"]`);
  await page.fill('#sc-text', 'beste meneer,\n\nik ben ziek vandaag. ik kom morgen weer.\n\nmet vriendelijke groet,\nBurak');
  await page.click('#sc-check');
  await page.waitForSelector('#sc-res .diff', { timeout: 30000 });
  await page.waitForTimeout(200);
  const aiTxt = await text('#sc-res');
  ok(apiCalls > 0 && aiTxt.includes('Claude tarafından düzeltildi') && aiTxt.includes('Puan 4/5'), 'Schrijven Claude duzeltmesi gosteriliyor', 'calls=' + apiCalls + ' ' + aiTxt.slice(0, 120));
  ok(lastBody && lastBody.model === 'claude-opus-5-5' && lastBody.output_config && lastBody.output_config.format && lastBody.output_config.format.type === 'json_schema', 'API istegi dogru model ve json_schema ile gidiyor', JSON.stringify(lastBody && { m: lastBody.model, f: lastBody.fallbacks }));
  await tab('practice'); await page.click('[data-go=spreken]'); await page.click(`[data-id="${spIds[0]}"]`);
  await page.fill('#sp-text', 'ik woon in Purmerend drie jaar');
  await page.click('#sp-check');
  await page.waitForSelector('#sp-res .score', { timeout: 30000 });
  ok((await text('#sp-res')).includes('Daha iyi bir A2 cevabı'), 'Spreken Claude degerlendirmesi ve daha iyi cevap gosteriliyor');
  mode = '401';
  await page.click('#sp-check');
  await page.waitForSelector('#sp-res .score', { timeout: 30000 });
  await page.waitForTimeout(100);
  ok((await text('#sp-res')).includes('API anahtarı geçersiz'), 'gecersiz anahtarda temel kontrole dusuyor', (await text('#sp-res')).slice(0, 80));
  await page.unroute('https://api.anthropic.com/**');
  await tab('me'); await page.fill('#s-key', ''); await page.click('#s-key-save');

  /* ---------- 12. Ingilizce arayuz ---------- */
  await tab('me'); await page.click('[data-l=en]');
  ok((await text('#tabs')).includes('Practice'), 'sekme etiketleri Ingilizce');
  const enScreens = [
    ['home', null], ['words', null], ['words', '#w-start'], ['words', '#w-dehet'], ['words', `[data-th="${themeIds[0]}"]`],
    ['practice', null], ['practice', '[data-go=lezen]'], ['practice', '[data-go=schrijven]'], ['practice', '[data-go=spreken]'], ['practice', '[data-go=knm]'], ['practice', '[data-go=gram]'], ['exam', null], ['me', null],
  ];
  for (const [tb, sel] of enScreens) {
    await tab(tb); if (sel) { await page.click(sel); await page.waitForTimeout(30); }
    const tl = await turkishLeft();
    ok(tl.length === 0, 'EN ekran ' + tb + ' ' + (sel || '') + ' Turkce metin yok', tl.join(' | '));
  }
  for (const g of gIds) { await tab('practice'); await page.click('[data-go=gram]'); await page.click(`[data-g="${g}"]`); const tl = await turkishLeft(); ok(tl.length === 0, 'EN ders ' + g, tl.join(' | ')); }
  for (const id of sch.map(s => s.id)) { await tab('practice'); await page.click('[data-go=schrijven]'); await page.click(`[data-id="${id}"]`); const tl = await turkishLeft(); ok(tl.length === 0, 'EN schrijven ' + id, tl.join(' | ')); }
  for (const id of spIds.slice(0, 30)) { await tab('practice'); await page.click('[data-go=spreken]'); await page.click(`[data-id="${id}"]`); const tl = await turkishLeft(); ok(tl.length === 0, 'EN spreken ' + id, tl.join(' | ')); }
  await tab('practice'); await page.click('[data-go=knm]'); await page.click('#k-mix');
  for (let i = 0; i < 10; i++) { await page.click('.opt'); const tl = await turkishLeft(); ok(tl.length === 0, 'EN knm soru ' + i, tl.join(' | ')); await page.click('#kq-next button'); }
  ok(await page.evaluate(() => KNM.every(q => I18N_EN.knm && I18N_EN.knm[q.id] && I18N_EN.knm[q.id].q && I18N_EN.knm[q.id].ex)), 'tum KNM sorularinin Ingilizcesi var');
  ok(await page.evaluate(() => WORDS.every(w => I18N_EN.vocab && I18N_EN.vocab[w.nl])), 'tum kelimelerin Ingilizcesi var');
  await tab('practice'); await page.click('[data-go=lezen]'); await page.click(`[data-id="${lezenIds[0]}"]`);
  await page.click('.reading .wd');
  ok(!/[ğışçİ]/.test(await text('#pop')), 'EN modda kelime cevirisi Ingilizce', await text('#pop'));
  ok((await rawKeys()).length === 0, 'cevrilmemis anahtar gorunmuyor');
  await tab('me'); await page.click('[data-l=tr]');

  /* ---------- 13. profil ayrimi ve yedek ---------- */
  const xpBurak = await text('#xp');
  await page.click('#who'); await page.click('.who-btn[data-p=bahu]');
  ok((await text('#who')).includes('Bahu') && (await text('#xp')) === '0 XP', 'Bahu profili temiz basliyor');
  await tab('words'); await page.click('#w-start'); await page.click('#f-show'); await page.click('.rate .r2');
  ok((await text('#xp')) !== '0 XP', 'Bahu ilerlemesi kaydediliyor');
  await page.click('#who'); await page.click('.who-btn[data-p=burak]');
  ok((await text('#xp')) === xpBurak, 'Burak ilerlemesi Bahu\'dan etkilenmedi', xpBurak + ' vs ' + (await text('#xp')));
  await tab('me');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#s-exp')]);
  const p = await dl.path();
  const backup = JSON.parse(require('fs').readFileSync(p, 'utf8'));
  ok(backup.profile === 'burak' && backup.state && backup.state.xp > 0, 'yedek dosyasi indiriliyor');
  await page.setInputFiles('#s-imp', p);
  await page.waitForTimeout(200);
  ok((await text('#toast')).includes('Yedek yüklendi'), 'yedek geri yukleniyor');
  await page.reload(); await page.waitForTimeout(300);
  ok((await text('#who')).includes('Burak') && (await text('#xp')) === xpBurak, 'yeniden acilista son profil ve ilerleme korunuyor');

  /* ---------- 13b. yeni profil, ayarlarin kaliciligi, silme ---------- */
  await page.click('#who'); await page.click('#who-add');
  await page.click('#np-create');
  ok((await text('#toast')).includes('isim'), 'isimsiz profil olusturulmuyor');
  await page.fill('#np-name', 'Deniz'); await page.click('.chip.icon[data-i="👧🏻"]'); await page.click('[data-l=en]');
  await page.click('#np-create');
  ok((await text('#who')).includes('Deniz') && (await text('#tabs')).includes('Practice'), 'yeni profil olusturuldu ve secilen dille acildi');
  await tab('me');
  await page.fill('#s-date', '2027-03-15'); await page.dispatchEvent('#s-date', 'change');
  await page.selectOption('#s-new', '20'); await page.selectOption('#s-goal', '50'); await page.selectOption('#s-rate', '0.8');
  await page.uncheck('#s-tr'); await page.uncheck('#s-lt');
  await page.reload(); await page.waitForTimeout(300);
  await tab('me');
  const setv = await page.evaluate(() => [document.querySelector('#s-date').value, document.querySelector('#s-new').value, document.querySelector('#s-goal').value, document.querySelector('#s-rate').value, document.querySelector('#s-tr').checked, document.querySelector('#s-lt').checked, lang()].join(','));
  ok(setv === '2027-03-15,20,50,0.8,false,false,en', 'profil ayarlari yeniden acilista korunuyor', setv);
  await page.click('#who'); await page.click('.who-btn[data-p=burak]'); await tab('me');
  const burakSet = await page.evaluate(() => [document.querySelector('#s-new').value, document.querySelector('#s-tr').checked, lang()].join(','));
  ok(burakSet === '10,true,tr', 'diger profilin ayarlari etkilenmedi', burakSet);
  await page.click('#who');
  ok(await count('.who-btn[data-p]') === 3, 'yeni profil listede');
  const denizId = await page.$eval('.who-btn[data-p]:nth-child(3)', e => e.dataset.p);
  await page.click(`.who-btn[data-p="${denizId}"]`); await tab('me');
  await page.click('#s-del');
  ok(await count('.who-btn[data-p]') === 2 && await page.evaluate(id => !localStorage.getItem('a2.state.v2.' + id), denizId), 'profil ve verisi silindi');
  await page.click('.who-btn[data-p=burak]');

  /* ---------- 14. sozluk kapsami ---------- */
  ok(allUnknown.size === 0, 'tum ekranlardaki Hollandaca kelimelerin cevirisi var', [...allUnknown].slice(0, 30).join(' '));
  const dataUnknown = await page.evaluate(() => {
    const texts = [];
    LEZEN.forEach(x => { texts.push(x.title, x.text); x.questions.forEach(q => texts.push(q.q, ...q.a)); });
    LUISTEREN.forEach(x => { texts.push(x.title, x.setting); x.lines.forEach(l => texts.push(l.t)); x.questions.forEach(q => texts.push(q.q, ...q.a)); });
    SCHRIJVEN.forEach(x => { texts.push(x.title, x.prompt, x.model); (x.fields || []).forEach(f => texts.push(f.label)); });
    SPREKEN.forEach(x => texts.push(x.prompt, x.model));
    KNM.forEach(q => texts.push(q.q, ...q.a));
    GRAMMAR.forEach(g => g.drills.forEach(d => texts.push(d.q.replace(/_+/, d.a[0]), ...d.a)));
    WORDS.forEach(w => texts.push(w.ex));
    const out = new Set();
    texts.forEach(s => String(s || '').split(/([A-Za-zÀ-ÿĀ-ſ][A-Za-zÀ-ÿĀ-ſ'-]*)/).forEach((part, i) => { if (i % 2) { const k = part.toLowerCase().replace(/'s$/, '').replace(/-$/, ''); if (!lookup(k)) out.add(k); } }));
    return [...out];
  });
  ok(dataUnknown.length === 0, 'tum icerikteki Hollandaca kelimelerin cevirisi var', dataUnknown.slice(0, 30).join(' '));
  const strParity = await page.evaluate(() => { const a = Object.keys(STR.tr), b = Object.keys(STR.en); return a.filter(k => !b.includes(k)).concat(b.filter(k => !a.includes(k))); });
  ok(strParity.length === 0, 'TR ve EN arayuz metinleri esit', strParity.join(' '));

  ok(errors.length === 0, 'JS hatasi yok', errors.slice(0, 5).join(' | '));
  console.log(results.filter(r => r.startsWith('FAIL')).join('\n') || '');
  console.log(`\n${results.length - failures}/${results.length} passed`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); console.log(results.filter(r => r.startsWith('FAIL')).join('\n')); process.exit(2); });
