'use strict';
/* Senaryo varyantlari. Her gorev icin ayni kavrami farkli veriyle ogreten alternatif senaryolar.
   variants-*.js dosyalari addVariants ile kayit eder, app.js bolum ve gorev bazinda hangisinin oynanacagini secer.
   Varyant nesnesi temel gorevin alanlarini ezer, verilmeyen alan temelden gelir.
   { story, task, hint, solution, setup(sh), check(sh, ctx), editorContent, vimKeys, title } */

const VAR_REG = { count: 0, missing: [] };
function addVariants(id, list, opts) {
  let m = null;
  for (const c of CHAPTERS) { m = c.missions.find(x => x.id === id); if (m) break; }
  if (!m) { VAR_REG.missing.push(id); return; }
  m.variants = (m.variants || []).concat(list);
  VAR_REG.count += list.length;
  if (opts && opts.hint) m.hint = opts.hint;
}
/* k 0 temel gorev, 1 ve sonrasi varyant. Varyant yoksa temel doner */
function variantOf(m, k) {
  if (!k || !m.variants || !m.variants.length) return m;
  const v = m.variants[(k - 1) % m.variants.length];
  return Object.assign({}, m, v, { id: m.id, chapter: m.chapter, variants: m.variants, vk: k });
}
function variantCount(m) { return 1 + ((m.variants && m.variants.length) || 0); }
