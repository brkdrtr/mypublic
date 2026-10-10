#!/usr/bin/env node
/* Luisteren diyaloglari icin gercek ses dosyasi uretir. Sadece macOS, Apple'in say ve afconvert araclarini kullanir.
   Kullanim, repo kokunde
     node tools/make-audio.mjs            tum diyaloglar
     node tools/make-audio.mjs lu3 lu7    sadece verilenler
     FEMALE=Claire MALE=Xander node tools/make-audio.mjs
   Cikti, dutch-a2/audio/<id>/<n>.m4a ve dutch-a2/audio/index.js. Sonra commit ve push, uygulama otomatik bu dosyalari kullanir.
   Ses listesi icin, say -v '?' | grep nl_ */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'dutch-a2');
const OUT = join(ROOT, 'audio');
const FEMALE = process.env.FEMALE || 'Claire';
const MALE = process.env.MALE || 'Xander';
const RATE = process.env.RATE || '150';

if (process.platform !== 'darwin') { console.error('Bu script sadece macOS uzerinde calisir, say ve afconvert gerekir.'); process.exit(1); }

const ctx = { module: {}, exports: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'content.js'), 'utf8') + '\nthis.LUISTEREN = LUISTEREN;', ctx);
const LUISTEREN = ctx.LUISTEREN;
const only = process.argv.slice(2);
const list = only.length ? LUISTEREN.filter(x => only.includes(x.id)) : LUISTEREN;
if (!list.length) { console.error('Diyalog bulunamadi'); process.exit(1); }

const voices = execFileSync('say', ['-v', '?']).toString();
for (const v of [FEMALE, MALE]) if (!voices.includes(v)) console.warn(`Uyari, ${v} sesi yuklu degil. Ayarlar, Erisilebilirlik, Seslendirilen icerik, Sesler, Hollandaca altindan indir.`);

const index = existsSync(join(OUT, 'index.js')) ? readIndex() : {};
function readIndex() { const m = /AUDIO_INDEX = (\{[^;]*\})/.exec(readFileSync(join(OUT, 'index.js'), 'utf8')); try { return m ? JSON.parse(m[1]) : {}; } catch (e) { return {}; } }

for (const x of list) {
  const dir = join(OUT, x.id);
  mkdirSync(dir, { recursive: true });
  x.lines.forEach((l, i) => {
    const aiff = join(dir, i + '.aiff');
    const m4a = join(dir, i + '.m4a');
    execFileSync('say', ['-v', l.g === 'm' ? MALE : FEMALE, '-r', RATE, '-o', aiff, l.t]);
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', aiff, m4a]);
    rmSync(aiff);
  });
  index[x.id] = x.lines.length;
  console.log(`${x.id} ${x.lines.length} satir`);
}
writeFileSync(join(OUT, 'index.js'), `/* tools/make-audio.mjs uretti, elle duzenleme */\nconst AUDIO_INDEX = ${JSON.stringify(index)};\n`);
console.log('audio/index.js guncellendi, ' + Object.keys(index).length + ' diyalog');
