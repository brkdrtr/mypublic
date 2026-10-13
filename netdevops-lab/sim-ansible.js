'use strict';
/* Ansible simulatoru. ansible, ansible-playbook, ansible-inventory, ansible-vault, ansible-config, ansible-doc,
   ansible-galaxy, ansible-lint. Mini Jinja2 motoru JS ile yazildi. Cihaz hedefleri LAB.devices uzerinden,
   localhost hedefi sanal kabuk uzerinden calisir. LAB.ansible.last gorev kontrolleri icin dolar. */

const SIMAN_VERSION = '2.17.4';
const SIMAN_COLUMNS = 79;
const SIMAN_IP_MAP = { '10.0.0.1': 'r1', '10.0.0.2': 'r2', '10.0.0.11': 'sw1' };

/* ---------- genel yardimcilar ---------- */
function simanYamlSchema() {
  const Y = LAB.util.yaml();
  if (!Y) return null;
  if (simanYamlSchema.cache) return simanYamlSchema.cache;
  const BoolT = new Y.Type('tag:yaml.org,2002:bool', {
    kind: 'scalar',
    resolve: d => /^(yes|no|on|off|true|false|True|False|TRUE|FALSE|Yes|No|YES|NO|On|Off|ON|OFF)$/.test(d),
    construct: d => /^(yes|on|true)$/i.test(d),
    predicate: o => Object.prototype.toString.call(o) === '[object Boolean]',
    represent: { lowercase: o => (o ? 'true' : 'false') }, defaultStyle: 'lowercase',
  });
  const VaultT = new Y.Type('!vault', { kind: 'scalar', construct: d => ({ __vault: String(d) }) });
  const UnsafeT = new Y.Type('!unsafe', { kind: 'scalar', construct: d => String(d) });
  simanYamlSchema.cache = Y.DEFAULT_SCHEMA.extend({ implicit: [BoolT], explicit: [VaultT, UnsafeT] });
  return simanYamlSchema.cache;
}
function simanYamlLoad(text, file) {
  const Y = LAB.util.yaml();
  if (!Y) throw new SimanError('YAML kutuphanesi yuklenmedi');
  try { return simanDates(Y.load(text, { schema: simanYamlSchema(), filename: file })); }
  catch (e) {
    const line = e.mark ? e.mark.line + 1 : null; const col = e.mark ? e.mark.column + 1 : null;
    const src = text.split('\n');
    let msg = `Syntax Error while loading YAML.\n  ${e.reason || e.message}`;
    if (line) msg += `\n\nThe error appears to be in '${file}': line ${line}, column ${col}, but may\nbe elsewhere in the file depending on the exact syntax problem.\n\nThe offending line appears to be:\n\n${line > 1 ? src[line - 2] + '\n' : ''}${src[line - 1] || ''}\n${' '.repeat(Math.max(0, col - 1))}^ here`;
    throw new SimanError(msg);
  }
}
function simanDates(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(simanDates);
  if (v && typeof v === 'object' && !v.__vault) { for (const k of Object.keys(v)) v[k] = simanDates(v[k]); }
  return v;
}
function simanYamlDump(v) { const Y = LAB.util.yaml(); return Y ? Y.dump(v, { lineWidth: 120, noRefs: true }) : JSON.stringify(v, null, 2) + '\n'; }
function simanSortKeys(v) {
  if (Array.isArray(v)) return v.map(simanSortKeys);
  if (v && typeof v === 'object') { const o = {}; Object.keys(v).sort().forEach(k => { o[k] = simanSortKeys(v[k]); }); return o; }
  return v;
}
function simanJsonInline(v) {
  v = simanSortKeys(v);
  const enc = x => {
    if (x === null || x === undefined) return 'null';
    if (typeof x === 'string') return JSON.stringify(x);
    if (typeof x === 'number' || typeof x === 'boolean') return String(x);
    if (Array.isArray(x)) return '[' + x.map(enc).join(', ') + ']';
    return '{' + Object.entries(x).map(([k, val]) => JSON.stringify(k) + ': ' + enc(val)).join(', ') + '}';
  };
  return enc(v);
}
function simanJsonPretty(v) { return JSON.stringify(simanSortKeys(v), (k, x) => (x === undefined ? null : x), 4); }
function simanBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return /^(yes|y|true|t|on|1)$/i.test(v.trim());
  return !!v;
}
function simanIsPlainObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function simanDeepCopy(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function simanMerge(a, b) { if (!simanIsPlainObj(a) || !simanIsPlainObj(b)) return b; const o = Object.assign({}, a); for (const k of Object.keys(b)) o[k] = simanIsPlainObj(o[k]) && simanIsPlainObj(b[k]) ? simanMerge(o[k], b[k]) : b[k]; return o; }
function simanBanner(msg) { const stars = Math.max(3, SIMAN_COLUMNS - msg.length); return '\n' + msg + ' ' + '*'.repeat(stars); }
function simanShlex(s) {
  const out = []; let cur = ''; let q = null; let has = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === q) q = null; else if (ch === '\\' && q === '"' && i + 1 < s.length) cur += s[++i]; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; has = true; continue; }
    if (ch === '\\' && i + 1 < s.length) { cur += s[++i]; has = true; continue; }
    if (/\s/.test(ch)) { if (has) out.push(cur); cur = ''; has = false; continue; }
    cur += ch; has = true;
  }
  if (has) out.push(cur);
  return out;
}
function simanParseKv(s) {
  const args = {}; const raw = [];
  for (const tok of simanShlex(s)) {
    const m = /^([A-Za-z_][\w.]*)=([\s\S]*)$/.exec(tok);
    if (m) args[m[1]] = m[2]; else raw.push(tok);
  }
  if (raw.length) args._raw_params = raw.join(' ');
  return args;
}
function simanLiteral(s) {
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
  if (/^(True|true)$/.test(s)) return true;
  if (/^(False|false)$/.test(s)) return false;
  if (/^(None|none|null)$/.test(s)) return null;
  const q = /^(['"])([\s\S]*)\1$/.exec(s); if (q) return q[2];
  return s;
}
function simanMaskToPrefix(mask) { if (!mask) return null; if (/^\d+$/.test(mask)) return Number(mask); return mask.split('.').reduce((n, o) => n + ((Number(o) >>> 0).toString(2).match(/1/g) || []).length, 0); }
function simanPrefixToMask(p) { p = Number(p); const n = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0; return [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.'); }
function simanIp2n(ip) { return ip.split('.').reduce((n, o) => ((n << 8) >>> 0) + Number(o), 0) >>> 0; }
function simanN2ip(n) { return [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.'); }
function simanIsIp(s) { return typeof s === 'string' && /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s) && s.split('.').every(o => Number(o) <= 255); }

/* unified diff, config ve dosya farklari icin */
function simanDiffOps(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { ops.push(['=', a[i]]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(['-', a[i]]); i++; } else { ops.push(['+', b[j]]); j++; } }
  while (i < n) ops.push(['-', a[i++]]);
  while (j < m) ops.push(['+', b[j++]]);
  return ops;
}
function simanUnifiedDiff(aText, bText, ha, hb, ctxN) {
  ctxN = ctxN == null ? 3 : ctxN;
  const a = lines(aText), b = lines(bText);
  const ops = simanDiffOps(a, b);
  if (!ops.some(o => o[0] !== '=')) return '';
  const out = [`--- ${ha}`, `+++ ${hb}`];
  let k = 0;
  const changeIdx = []; ops.forEach((o, idx) => { if (o[0] !== '=') changeIdx.push(idx); });
  const hunks = [];
  for (const idx of changeIdx) { const last = hunks[hunks.length - 1]; if (last && idx - last.end <= ctxN * 2 + 1) last.end = idx; else hunks.push({ start: idx, end: idx }); }
  let oldPos = 0, newPos = 0; k = 0;
  const posAt = []; ops.forEach((o, idx) => { posAt[idx] = [oldPos, newPos]; if (o[0] !== '+') oldPos++; if (o[0] !== '-') newPos++; });
  for (const h of hunks) {
    const s = Math.max(0, h.start - ctxN), e = Math.min(ops.length - 1, h.end + ctxN);
    let oc = 0, nc = 0; const body = [];
    for (let x = s; x <= e; x++) { const o = ops[x]; if (o[0] !== '+') oc++; if (o[0] !== '-') nc++; body.push((o[0] === '=' ? ' ' : o[0]) + o[1]); }
    const [os, ns] = posAt[s];
    out.push(`@@ -${oc ? os + 1 : os},${oc} +${nc ? ns + 1 : ns},${nc} @@`, ...body);
  }
  return out.join('\n') + '\n';
}

/* ---------- Mini Jinja2 ---------- */
class SimanError extends Error {}
class SimanUndefined { constructor(name) { this.name = name; } }
const simanIsUndef = v => v instanceof SimanUndefined;
function simanNeed(v) { if (simanIsUndef(v)) throw new SimanError(`'${v.name}' is undefined`); return v; }
function simanTruthy(v) {
  v = simanNeed(v);
  if (v === null || v === undefined || v === false || v === 0 || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}
function simanRepr(v) {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.includes("'") && !v.includes('"') ? '"' + v + '"' : "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  if (Array.isArray(v)) return '[' + v.map(simanRepr).join(', ') + ']';
  if (typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => simanRepr(k) + ': ' + simanRepr(x)).join(', ') + '}';
  return String(v);
}
function simanStr(v) {
  v = simanNeed(v);
  if (typeof v === 'string') return v;
  if (v === null || v === undefined || typeof v === 'boolean' || typeof v === 'object') return simanRepr(v);
  return String(v);
}
function simanLex(src) {
  const toks = []; let i = 0;
  const reNum = /^\d+(?:\.\d+)?/, reName = /^[A-Za-z_][A-Za-z0-9_]*/, reOp = /^(\*\*|\/\/|==|!=|<=|>=|[-+*\/%~|()\[\]{},:.<>=])/;
  while (i < src.length) {
    const s = src.slice(i); let m;
    if ((m = /^\s+/.exec(s))) { i += m[0].length; continue; }
    if (s[0] === '"' || s[0] === "'") {
      const q = s[0]; let j = 1; let v = '';
      while (j < s.length && s[j] !== q) { if (s[j] === '\\' && j + 1 < s.length) { const e = s[j + 1]; v += e === 'n' ? '\n' : e === 't' ? '\t' : e; j += 2; } else v += s[j++]; }
      if (j >= s.length) throw new SimanError('unexpected end of string literal');
      toks.push({ t: 'str', v }); i += j + 1; continue;
    }
    if ((m = reNum.exec(s))) { toks.push({ t: 'num', v: Number(m[0]) }); i += m[0].length; continue; }
    if ((m = reName.exec(s))) { toks.push({ t: 'name', v: m[0] }); i += m[0].length; continue; }
    if ((m = reOp.exec(s))) { toks.push({ t: 'op', v: m[0] }); i += m[0].length; continue; }
    throw new SimanError(`unexpected char '${s[0]}'`);
  }
  return toks;
}
const SIMAN_EXPR_CACHE = new Map();
function simanParseExpr(src) {
  if (SIMAN_EXPR_CACHE.has(src)) return SIMAN_EXPR_CACHE.get(src);
  const toks = simanLex(src); let p = 0;
  const peek = (o = 0) => toks[p + o];
  const isOp = v => !!peek() && peek().t === 'op' && peek().v === v;
  const isKw = v => !!peek() && peek().t === 'name' && peek().v === v;
  const take = () => toks[p++];
  const expect = v => { const t = take(); if (!t || t.v !== v) throw new SimanError(`expected token '${v}', got '${t ? t.v : 'end of print statement'}'`); return t; };
  const argList = close => {
    const args = []; const kwargs = {};
    while (!isOp(close)) {
      if (peek() && peek().t === 'name' && peek(1) && peek(1).t === 'op' && peek(1).v === '=') { const k = take().v; take(); kwargs[k] = cond(); }
      else args.push(cond());
      if (isOp(',')) take(); else break;
    }
    expect(close);
    return { args, kwargs };
  };
  const evalKw = (kwargs, env) => { const o = {}; for (const k of Object.keys(kwargs)) o[k] = kwargs[k](env); return o; };
  function cond() {
    const a = or_();
    if (isKw('if')) { take(); const c = or_(); let b = null; if (isKw('else')) { take(); b = cond(); } return env => (simanTruthy(c(env)) ? a(env) : b ? b(env) : new SimanUndefined('conditional expression')); }
    return a;
  }
  function or_() { let a = and_(); while (isKw('or')) { take(); const b = and_(); const l = a; a = env => { const v = l(env); return simanTruthy(v) ? v : b(env); }; } return a; }
  function and_() { let a = not_(); while (isKw('and')) { take(); const b = not_(); const l = a; a = env => { const v = l(env); return simanTruthy(v) ? b(env) : v; }; } return a; }
  function not_() { if (isKw('not')) { take(); const a = not_(); return env => !simanTruthy(a(env)); } return cmp(); }
  function cmp() {
    let a = concat();
    for (;;) {
      if (peek() && peek().t === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(peek().v)) { const op = take().v; const b = concat(); const l = a; a = env => simanCompare(op, simanNeed(l(env)), simanNeed(b(env))); }
      else if (isKw('in')) { take(); const b = concat(); const l = a; a = env => simanIn(simanNeed(l(env)), simanNeed(b(env))); }
      else if (isKw('not') && peek(1) && peek(1).v === 'in') { take(); take(); const b = concat(); const l = a; a = env => !simanIn(simanNeed(l(env)), simanNeed(b(env))); }
      else if (isKw('is')) {
        take(); let neg = false; if (isKw('not')) { take(); neg = true; }
        const name = take().v; let args = [];
        if (isOp('(')) { take(); args = argList(')').args; }
        else if (peek() && (peek().t === 'str' || peek().t === 'num')) { const t = take(); args = [() => t.v]; }
        const l = a; a = env => { const r = simanTest(name, l(env), args.map(f => f(env)), env); return neg ? !r : r; };
      } else break;
    }
    return a;
  }
  function concat() { let a = add(); while (isOp('~')) { take(); const b = add(); const l = a; a = env => simanStr(l(env)) + simanStr(b(env)); } return a; }
  function add() { let a = mul(); while (isOp('+') || isOp('-')) { const op = take().v; const b = mul(); const l = a; a = env => simanArith(op, simanNeed(l(env)), simanNeed(b(env))); } return a; }
  function mul() { let a = unary(); while (isOp('*') || isOp('/') || isOp('//') || isOp('%')) { const op = take().v; const b = unary(); const l = a; a = env => simanArith(op, simanNeed(l(env)), simanNeed(b(env))); } return a; }
  function unary() { if (isOp('-')) { take(); const a = unary(); return env => -simanNeed(a(env)); } if (isOp('+')) { take(); return unary(); } return pow(); }
  function pow() { const a = filt(); if (isOp('**')) { take(); const b = unary(); return env => Math.pow(simanNeed(a(env)), simanNeed(b(env))); } return a; }
  function filt() {
    let a = postfix();
    while (isOp('|')) {
      take(); const name = take().v; let args = [], kwargs = {};
      if (isOp('(')) { take(); ({ args, kwargs } = argList(')')); }
      const l = a; a = env => simanFilter(name, l(env), args.map(f => f(env)), evalKw(kwargs, env), env);
    }
    return a;
  }
  function postfix() {
    let a = primary();
    for (;;) {
      if (isOp('.')) {
        take(); const t = take(); const name = t.t === 'num' ? t.v : t.v;
        if (isOp('(')) { take(); const { args, kwargs } = argList(')'); const l = a; a = env => simanMethod(l(env), name, args.map(f => f(env)), evalKw(kwargs, env), env); }
        else { const l = a; a = env => simanGetAttr(l(env), name); }
      } else if (isOp('[')) {
        take();
        if (isOp(':')) { take(); const hi = isOp(']') ? null : cond(); expect(']'); const l = a; a = env => simanSlice(simanNeed(l(env)), 0, hi ? hi(env) : null); continue; }
        const idx = cond();
        if (isOp(':')) { take(); const hi = isOp(']') ? null : cond(); expect(']'); const l = a; a = env => simanSlice(simanNeed(l(env)), idx(env), hi ? hi(env) : null); continue; }
        expect(']'); const l = a; a = env => simanGetAttr(l(env), simanNeed(idx(env)));
      } else if (isOp('(')) {
        take(); const { args, kwargs } = argList(')'); const l = a;
        a = env => { const f = l(env); if (typeof f !== 'function') throw new SimanError(`'${simanIsUndef(f) ? f.name : simanRepr(f)}' is not callable`); return f(args.map(x => x(env)), evalKw(kwargs, env), env); };
      } else break;
    }
    return a;
  }
  function primary() {
    const t = take();
    if (!t) throw new SimanError('unexpected end of expression');
    if (t.t === 'str') return () => t.v;
    if (t.t === 'num') return () => t.v;
    if (t.t === 'name') {
      if (t.v === 'true' || t.v === 'True') return () => true;
      if (t.v === 'false' || t.v === 'False') return () => false;
      if (t.v === 'none' || t.v === 'None') return () => null;
      return env => simanLookup(env, t.v);
    }
    if (t.v === '(') {
      const e = cond();
      if (isOp(',')) { const items = [e]; while (isOp(',')) { take(); if (isOp(')')) break; items.push(cond()); } expect(')'); return env => items.map(f => f(env)); }
      expect(')'); return e;
    }
    if (t.v === '[') { const items = []; while (!isOp(']')) { items.push(cond()); if (isOp(',')) take(); else break; } expect(']'); return env => items.map(f => f(env)); }
    if (t.v === '{') { const pairs = []; while (!isOp('}')) { const k = cond(); expect(':'); const v = cond(); pairs.push([k, v]); if (isOp(',')) take(); else break; } expect('}'); return env => { const o = {}; pairs.forEach(([k, v]) => { o[simanStr(k(env))] = v(env); }); return o; }; }
    throw new SimanError(`unexpected token '${t.v}'`);
  }
  const fn = cond();
  if (p < toks.length) throw new SimanError(`expected token 'end of print statement', got '${toks[p].v}'`);
  SIMAN_EXPR_CACHE.set(src, fn);
  return fn;
}
function simanCompare(op, a, b) {
  if (op === '==') return simanEq(a, b);
  if (op === '!=') return !simanEq(a, b);
  if (typeof a === 'string' && typeof b === 'number') a = Number(a);
  if (typeof b === 'string' && typeof a === 'number') b = Number(b);
  if (op === '<') return a < b; if (op === '>') return a > b; if (op === '<=') return a <= b; return a >= b;
}
function simanEq(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'string' && b.trim() !== '' && !isNaN(Number(b))) return a === Number(b);
  if (typeof b === 'number' && typeof a === 'string' && a.trim() !== '' && !isNaN(Number(a))) return b === Number(a);
  if (a && b && typeof a === 'object' && typeof b === 'object') return JSON.stringify(simanSortKeys(a)) === JSON.stringify(simanSortKeys(b));
  return false;
}
function simanIn(a, b) {
  if (Array.isArray(b)) return b.some(x => simanEq(x, a));
  if (typeof b === 'string') return b.includes(simanStr(a));
  if (b && typeof b === 'object') return Object.prototype.hasOwnProperty.call(b, String(a));
  return false;
}
function simanArith(op, a, b) {
  if (op === '+') { if (Array.isArray(a) && Array.isArray(b)) return a.concat(b); if (typeof a === 'string' || typeof b === 'string') return simanStr(a) + simanStr(b); return a + b; }
  if (op === '-') return Number(a) - Number(b);
  if (op === '*') { if (typeof a === 'string') return a.repeat(Number(b)); return Number(a) * Number(b); }
  if (op === '/') return Number(a) / Number(b);
  if (op === '//') return Math.floor(Number(a) / Number(b));
  if (op === '%') { if (typeof a === 'string') return simanPyFormat(a, Array.isArray(b) ? b : [b]); return Number(a) % Number(b); }
  return null;
}
function simanPyFormat(fmt, args) { let i = 0; return fmt.replace(/%[sd]/g, () => simanStr(args[i++])); }
function simanSlice(v, lo, hi) { lo = lo == null ? 0 : Number(lo); if (hi == null) hi = v.length; return Array.isArray(v) || typeof v === 'string' ? v.slice(lo, hi) : v; }
function simanGetAttr(obj, key) {
  if (simanIsUndef(obj)) return new SimanUndefined(`${obj.name}.${key}`);
  if (obj === null || obj === undefined) throw new SimanError(`'None' has no attribute '${key}'`);
  if (Array.isArray(obj)) { if (typeof key === 'number' || /^-?\d+$/.test(String(key))) { const i = Number(key); return obj[i < 0 ? obj.length + i : i] === undefined ? new SimanUndefined(`list object has no element ${key}`) : obj[i < 0 ? obj.length + i : i]; } return new SimanUndefined(`'list object' has no attribute '${key}'`); }
  if (typeof obj === 'string') { if (typeof key === 'number') return obj[key] === undefined ? new SimanUndefined(`string index ${key}`) : obj[key]; return new SimanUndefined(`'str object' has no attribute '${key}'`); }
  if (typeof obj === 'object') { if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key]; return new SimanUndefined(`'dict object' has no attribute '${key}'`); }
  return new SimanUndefined(`'${typeof obj}' has no attribute '${key}'`);
}
function simanMethod(obj, name, args, kwargs, env) {
  obj = simanNeed(obj);
  if (typeof obj === 'string') {
    switch (name) {
      case 'upper': return obj.toUpperCase(); case 'lower': return obj.toLowerCase(); case 'strip': return obj.trim(); case 'lstrip': return obj.replace(/^\s+/, ''); case 'rstrip': return obj.replace(/\s+$/, '');
      case 'split': return args.length && args[0] !== null ? obj.split(args[0]) : obj.split(/\s+/).filter(Boolean);
      case 'splitlines': return lines(obj); case 'startswith': return obj.startsWith(args[0]); case 'endswith': return obj.endsWith(args[0]);
      case 'replace': return obj.split(args[0]).join(args[1]); case 'join': return args[0].map(simanStr).join(obj); case 'title': return obj.replace(/\b\w/g, c => c.toUpperCase());
      case 'capitalize': return obj.charAt(0).toUpperCase() + obj.slice(1).toLowerCase(); case 'format': { let i = 0; return obj.replace(/\{(\w*)\}/g, (m, k) => simanStr(k ? kwargs[k] : args[i++])); }
      case 'count': return obj.split(args[0]).length - 1; case 'find': return obj.indexOf(args[0]); case 'isdigit': return /^\d+$/.test(obj); case 'zfill': return obj.padStart(args[0], '0');
      case 'encode': case 'decode': return obj;
    }
  }
  if (Array.isArray(obj)) {
    switch (name) {
      case 'append': obj.push(args[0]); return null; case 'index': return obj.findIndex(x => simanEq(x, args[0])); case 'count': return obj.filter(x => simanEq(x, args[0])).length; case 'copy': return obj.slice(); case 'pop': return obj.pop();
    }
  }
  if (simanIsPlainObj(obj)) {
    switch (name) {
      case 'items': return Object.entries(obj); case 'keys': return Object.keys(obj); case 'values': return Object.values(obj);
      case 'get': return Object.prototype.hasOwnProperty.call(obj, args[0]) ? obj[args[0]] : args.length > 1 ? args[1] : null;
      case 'copy': return Object.assign({}, obj); case 'update': Object.assign(obj, args[0] || {}); return null;
    }
  }
  throw new SimanError(`'${typeof obj === 'object' ? (Array.isArray(obj) ? 'list' : 'dict') : typeof obj === 'string' ? 'str' : typeof obj} object' has no attribute '${name}'`);
}
function simanLookup(env, name) {
  if (Object.prototype.hasOwnProperty.call(env.vars, name)) return simanResolveVar(env, name, env.vars[name]);
  if (env.parent && Object.prototype.hasOwnProperty.call(env.parent.vars, name)) return simanResolveVar(env, name, env.parent.vars[name]);
  if (SIMAN_GLOBALS[name]) return SIMAN_GLOBALS[name];
  return new SimanUndefined(name);
}
/* degisken degerleri tembel sablonlanir, vault degerleri tembel cozulur */
function simanResolveVar(env, name, v) {
  if (typeof v === 'string' ? !/\{[{%]/.test(v) : !(v && typeof v === 'object')) return v;
  env.depth = (env.depth || 0) + 1;
  if (env.depth > 25) { env.depth = 0; throw new SimanError(`recursive loop detected in template string: ${name}`); }
  try { return simanTemplateDeep(v, env); } finally { env.depth--; }
}
const SIMAN_GLOBALS = {
  range: (a) => { let [s, e, st] = a.length === 1 ? [0, a[0], 1] : [a[0], a[1], a[2] || 1]; const o = []; for (let i = s; st > 0 ? i < e : i > e; i += st) o.push(i); return o; },
  dict: (a, kw) => Object.assign({}, a[0] || {}, kw),
  lookup: (a, kw, env) => simanLookupPlugin(a[0], a.slice(1), kw, env),
  query: (a, kw, env) => { const r = simanLookupPlugin(a[0], a.slice(1), kw, env); return Array.isArray(r) ? r : [r]; },
  q: (a, kw, env) => SIMAN_GLOBALS.query(a, kw, env),
  now: () => LAB.util.now(),
  undef: () => new SimanUndefined('undef'),
  joiner: (a) => { let first = true; return () => (first ? (first = false, '') : (a[0] || ', ')); },
};
function simanLookupPlugin(kind, args, kw, env) {
  kind = String(kind).replace(/^ansible\.builtin\./, '');
  const sh = env.sh;
  if (kind === 'env') return sh && sh.env[args[0]] !== undefined ? sh.env[args[0]] : (kw.default !== undefined ? kw.default : '');
  if (kind === 'file') { const r = sh.readFile(env.resolve ? env.resolve(args[0]) : args[0], 'lookup'); if (r.err) throw new SimanError(`could not locate file in lookup: ${args[0]}`); return r.data.replace(/\n$/, ''); }
  if (kind === 'template') { const r = sh.readFile(env.resolve ? env.resolve(args[0]) : args[0], 'lookup'); if (r.err) throw new SimanError(`could not locate file in lookup: ${args[0]}`); return simanRender(r.data, env); }
  if (kind === 'vars') return simanNeed(simanLookup(env, args[0]));
  if (kind === 'pipe') { const buf = []; sh.execList(args[0], (t, c) => { if (c !== 'err') buf.push(t); }); return buf.join('').replace(/\n$/, ''); }
  if (kind === 'items' || kind === 'list') return args.flat();
  if (kind === 'dict') return Object.entries(args[0] || {}).map(([key, value]) => ({ key, value }));
  if (kind === 'password') return 'Lab' + LAB.util.id(10);
  if (kind === 'fileglob') return [];
  throw new SimanError(`lookup plugin (${kind}) not found`);
}
function simanTest(name, v, args, env) {
  switch (name) {
    case 'defined': return !simanIsUndef(v);
    case 'undefined': return simanIsUndef(v);
    case 'none': return simanNeed(v) === null;
    case 'string': return typeof simanNeed(v) === 'string';
    case 'number': return typeof simanNeed(v) === 'number';
    case 'integer': return Number.isInteger(simanNeed(v));
    case 'float': return typeof simanNeed(v) === 'number' && !Number.isInteger(v);
    case 'boolean': return typeof simanNeed(v) === 'boolean';
    case 'mapping': return simanIsPlainObj(simanNeed(v));
    case 'sequence': case 'iterable': return Array.isArray(simanNeed(v)) || typeof v === 'string' || simanIsPlainObj(v);
    case 'list': return Array.isArray(simanNeed(v));
    case 'callable': return typeof v === 'function';
    case 'sameas': return simanNeed(v) === args[0];
    case 'eq': case 'equalto': case '==': return simanEq(simanNeed(v), args[0]);
    case 'ne': case '!=': return !simanEq(simanNeed(v), args[0]);
    case 'gt': case '>': return simanNeed(v) > args[0]; case 'ge': case '>=': return simanNeed(v) >= args[0]; case 'lt': case '<': return simanNeed(v) < args[0]; case 'le': case '<=': return simanNeed(v) <= args[0];
    case 'in': return simanIn(simanNeed(v), args[0]);
    case 'even': return simanNeed(v) % 2 === 0; case 'odd': return simanNeed(v) % 2 === 1;
    case 'divisibleby': return simanNeed(v) % args[0] === 0;
    case 'truthy': return simanTruthy(v); case 'falsy': return !simanTruthy(v);
    case 'match': return new RegExp('^(?:' + args[0] + ')', args[1] === true ? 'i' : '').test(simanStr(v));
    case 'search': case 'regex': return new RegExp(args[0], args[1] === true ? 'i' : '').test(simanStr(v));
    case 'success': case 'succeeded': case 'successful': { v = simanNeed(v); return !v.failed && !v.skipped && !v.unreachable; }
    case 'failed': case 'failure': return !!simanNeed(v).failed;
    case 'changed': case 'change': return !!simanNeed(v).changed;
    case 'skipped': case 'skip': return !!simanNeed(v).skipped;
    case 'unreachable': return !!simanNeed(v).unreachable;
    case 'version': case 'version_compare': return simanVersionCmp(simanStr(v), String(args[0]), args[1] || 'eq');
    case 'ansible.builtin.version': return simanVersionCmp(simanStr(v), String(args[0]), args[1] || 'eq');
    case 'file': case 'exists': case 'directory': { const sh = env.sh; const n = sh.node(sh.resolve(simanStr(v))); return !!n && (name === 'exists' || (name === 'file' ? n.t === 'f' : n.t === 'd')); }
    case 'subset': return simanNeed(v).every(x => simanIn(x, args[0]));
    case 'superset': return args[0].every(x => simanIn(x, simanNeed(v)));
    case 'contains': return simanIn(args[0], simanNeed(v));
    case 'ansible.builtin.ipaddr': case 'ipaddr': case 'ansible.utils.ipaddr': return !!simanIpaddr(simanNeed(v), args[0]);
    default: throw new SimanError(`no test named '${name}'`);
  }
}
function simanVersionCmp(a, b, op) {
  const pa = a.split(/[.\-]/).map(x => (isNaN(x) ? x : Number(x))), pb = b.split(/[.\-]/).map(x => (isNaN(x) ? x : Number(x)));
  let c = 0; for (let i = 0; i < Math.max(pa.length, pb.length) && c === 0; i++) { const x = pa[i] === undefined ? 0 : pa[i], y = pb[i] === undefined ? 0 : pb[i]; c = x < y ? -1 : x > y ? 1 : 0; }
  const m = { eq: c === 0, '==': c === 0, ne: c !== 0, '!=': c !== 0, lt: c < 0, '<': c < 0, le: c <= 0, '<=': c <= 0, gt: c > 0, '>': c > 0, ge: c >= 0, '>=': c >= 0 };
  return !!m[op];
}
function simanIpaddr(v, q) {
  const one = s => {
    if (typeof s !== 'string') s = String(s);
    const m = /^(\d+\.\d+\.\d+\.\d+)(?:\/(\d+|\d+\.\d+\.\d+\.\d+))?$/.exec(s.trim());
    if (!m || !simanIsIp(m[1])) return false;
    const ip = m[1]; let pre = m[2] ? (m[2].includes('.') ? simanMaskToPrefix(m[2]) : Number(m[2])) : null;
    if (q === undefined || q === null || q === '') return s.trim();
    if (q === 'address') return ip;
    if (q === 'prefix') return pre == null ? 32 : pre;
    if (q === 'netmask') return simanPrefixToMask(pre == null ? 32 : pre);
    if (q === 'network') { const p = pre == null ? 32 : pre; return simanN2ip(p === 0 ? 0 : (simanIp2n(ip) & ((0xffffffff << (32 - p)) >>> 0)) >>> 0); }
    if (q === 'broadcast') { const p = pre == null ? 32 : pre; return simanN2ip((simanIp2n(ip) | ((1 << (32 - p)) - 1) >>> 0) >>> 0); }
    if (q === 'host') return pre == null ? ip + '/32' : s.trim();
    if (q === 'ipv4' || q === 'private' || q === 'public') return s.trim();
    if (q === 'size') return Math.pow(2, 32 - (pre == null ? 32 : pre));
    if (q === 'net') return pre != null && pre < 32 ? s.trim() : false;
    if (q === 'bool') return true;
    if (/^-?\d+$/.test(String(q))) { const p = pre == null ? 32 : pre; const net = p === 0 ? 0 : (simanIp2n(ip) & ((0xffffffff << (32 - p)) >>> 0)) >>> 0; const n = Number(q); return simanN2ip((n >= 0 ? net + n : net + Math.pow(2, 32 - p) + n) >>> 0) + '/' + p; }
    if (/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(String(q))) { const [nip, np] = q.split('/'); const mask = (0xffffffff << (32 - Number(np))) >>> 0; return (simanIp2n(ip) & mask) === (simanIp2n(nip) & mask) ? s.trim() : false; }
    return s.trim();
  };
  if (Array.isArray(v)) return v.map(one).filter(x => x !== false);
  return one(v);
}
function simanFilter(name, v, args, kw, env) {
  name = String(name).replace(/^ansible\.(builtin|utils|netcommon)\./, '').replace(/^community\.general\./, '');
  if (name === 'default' || name === 'd') { const bool = args[1] !== undefined ? simanBool(args[1]) : simanBool(kw.boolean); if (simanIsUndef(v) || v === undefined || (bool && !simanTruthy(v))) return args.length ? args[0] : ''; return v; }
  if (name === 'mandatory') { if (simanIsUndef(v)) throw new SimanError(args[0] ? simanStr(args[0]) : `Mandatory variable '${v.name}' not defined.`); return v; }
  if (name === 'defined') return !simanIsUndef(v);
  v = simanNeed(v);
  const S = () => simanStr(v);
  switch (name) {
    case 'upper': return S().toUpperCase(); case 'lower': return S().toLowerCase(); case 'capitalize': return S().charAt(0).toUpperCase() + S().slice(1).toLowerCase();
    case 'title': return S().replace(/\b\w/g, c => c.toUpperCase()); case 'trim': return S().trim(); case 'string': return S(); case 'quote': return "'" + S() + "'";
    case 'length': case 'count': return Array.isArray(v) || typeof v === 'string' ? v.length : Object.keys(v || {}).length;
    case 'join': return (Array.isArray(v) ? v : [v]).map(simanStr).join(args.length ? simanStr(args[0]) : '');
    case 'replace': return S().split(simanStr(args[0])).join(simanStr(args[1]));
    case 'regex_replace': return S().replace(new RegExp(args[0], 'g' + (kw.ignorecase ? 'i' : '')), simanStr(args[1] === undefined ? '' : args[1]).replace(/\\(\d)/g, '$$$1'));
    case 'regex_search': { const m = new RegExp(args[0], kw.ignorecase ? 'i' : '').exec(S()); return m ? (m.length > 1 && args.length > 1 ? m.slice(1) : m[0]) : ''; }
    case 'regex_findall': return (S().match(new RegExp(args[0], 'g' + (kw.ignorecase ? 'i' : ''))) || []);
    case 'regex_escape': return S().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    case 'int': return typeof v === 'number' ? Math.trunc(v) : (parseInt(S(), 10) || (args.length ? args[0] : 0));
    case 'float': return typeof v === 'number' ? v : (parseFloat(S()) || (args.length ? args[0] : 0));
    case 'bool': return simanBool(v);
    case 'to_json': return JSON.stringify(v); case 'to_nice_json': return JSON.stringify(v, null, kw.indent || 4);
    case 'to_yaml': return simanYamlDump(v); case 'to_nice_yaml': return simanYamlDump(v);
    case 'from_json': return JSON.parse(S()); case 'from_yaml': return simanYamlLoad(S(), '<string>');
    case 'list': return Array.isArray(v) ? v : typeof v === 'string' ? v.split('') : Object.keys(v);
    case 'first': return (Array.isArray(v) ? v : Object.keys(v))[0]; case 'last': { const a = Array.isArray(v) ? v : Object.keys(v); return a[a.length - 1]; }
    case 'sort': { const a = (Array.isArray(v) ? v.slice() : Object.keys(v)); const attr = kw.attribute; a.sort((x, y) => { const xa = attr ? x[attr] : x, ya = attr ? y[attr] : y; return xa < ya ? -1 : xa > ya ? 1 : 0; }); return kw.reverse ? a.reverse() : a; }
    case 'reverse': return Array.isArray(v) ? v.slice().reverse() : S().split('').reverse().join('');
    case 'unique': { const out = []; v.forEach(x => { if (!out.some(y => simanEq(x, y))) out.push(x); }); return out; }
    case 'flatten': return v.flat(args.length ? args[0] : Infinity);
    case 'min': return Math.min(...v); case 'max': return Math.max(...v); case 'sum': return v.reduce((a, b) => a + Number(b), args[0] || 0);
    case 'abs': return Math.abs(v); case 'round': return args.length ? Number(v.toFixed(args[0])) : Math.round(v);
    case 'split': return S().split(args.length ? args[0] : /\s+/);
    case 'items2dict': { const o = {}; v.forEach(x => { o[x[kw.key_name || 'key']] = x[kw.value_name || 'value']; }); return o; }
    case 'dict2items': return Object.entries(v).map(([key, value]) => ({ [kw.key_name || 'key']: key, [kw.value_name || 'value']: value }));
    case 'combine': { let o = v; const rec = kw.recursive; for (const a of args) o = rec ? simanMerge(o, a) : Object.assign({}, o, a); return o; }
    case 'keys': return Object.keys(v); case 'values': return Object.values(v); case 'items': return Object.entries(v);
    case 'type_debug': return v === null ? 'NoneType' : Array.isArray(v) ? 'list' : typeof v === 'object' ? 'dict' : typeof v === 'string' ? 'str' : typeof v === 'boolean' ? 'bool' : Number.isInteger(v) ? 'int' : 'float';
    case 'b64encode': return btoa(unescape(encodeURIComponent(S()))); case 'b64decode': return decodeURIComponent(escape(atob(S())));
    case 'hash': case 'md5': case 'sha1': case 'checksum': return simanHash(S());
    case 'password_hash': return '$6$lab$' + simanHash(S());
    case 'ternary': return simanTruthy(v) ? args[0] : args[1];
    case 'basename': return S().split('/').pop(); case 'dirname': { const p = S(); const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); }
    case 'indent': { const n = args.length ? args[0] : 4; const first = kw.first || args[1]; return S().split('\n').map((l, i) => (i === 0 && !first ? l : ' '.repeat(n) + l)).join('\n'); }
    case 'zip': return v.map((x, i) => [x].concat(args.map(a => a[i])));
    case 'difference': return v.filter(x => !simanIn(x, args[0])); case 'intersect': return v.filter(x => simanIn(x, args[0]));
    case 'union': return simanFilter('unique', v.concat(args[0]), [], {}, env); case 'symmetric_difference': return v.filter(x => !simanIn(x, args[0])).concat(args[0].filter(x => !simanIn(x, v)));
    case 'map': { if (kw.attribute) { const path = String(kw.attribute).split('.'); return v.map(x => path.reduce((o, k) => simanGetAttr(o, k), x)).map(x => (simanIsUndef(x) ? (kw.default !== undefined ? kw.default : (() => { throw new SimanError(`'${x.name}' is undefined`); })()) : x)); } return v.map(x => simanFilter(args[0], x, args.slice(1), {}, env)); }
    case 'select': case 'reject': { const keep = name === 'select'; return v.filter(x => { const r = args.length ? simanTest(args[0], x, args.slice(1), env) : simanTruthy(x); return keep ? r : !r; }); }
    case 'selectattr': case 'rejectattr': { const keep = name === 'selectattr'; const path = String(args[0]).split('.'); return v.filter(x => { const val = path.reduce((o, k) => simanGetAttr(o, k), x); const r = args.length > 1 ? simanTest(args[1], val, args.slice(2), env) : simanTruthy(val); return keep ? r : !r; }); }
    case 'json_query': throw new SimanError('json_query filtresi bu lab\'da yok, selectattr ve map kullan');
    case 'ipaddr': case 'ipv4': { const r = simanIpaddr(v, args[0]); return r; }
    case 'ipmath': { const [ip, p] = S().split('/'); return simanN2ip((simanIp2n(ip) + args[0]) >>> 0) + (p ? '/' + p : ''); }
    case 'ipsubnet': return S();
    case 'nthhost': return simanIpaddr(v, args[0]).split('/')[0];
    case 'ansible.builtin.ipaddr': return simanIpaddr(v, args[0]);
    case 'strftime': return LAB.util.now();
    case 'wordwrap': return S(); case 'center': return S();
    case 'format': return simanPyFormat(S(), args);
    case 'tojson': return JSON.stringify(v);
    case 'pprint': return simanRepr(v);
    case 'safe': case 'e': case 'escape': return S();
    case 'urlencode': return encodeURIComponent(S());
    case 'extract': return simanGetAttr(args[0], v);
    case 'batch': { const n = args[0]; const o = []; for (let i = 0; i < v.length; i += n) o.push(v.slice(i, i + n)); return o; }
    case 'groupby': { const o = {}; v.forEach(x => { const k = simanStr(x[args[0]]); (o[k] = o[k] || []).push(x); }); return Object.entries(o).map(([grouper, list]) => ({ grouper, list })); }
    case 'subelements': return v.flatMap(x => (x[args[0]] || []).map(y => [x, y]));
    case 'product': return v.flatMap(x => args[0].map(y => [x, y]));
    case 'random': return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : Math.floor(Math.random() * v);
    case 'shuffle': return v.slice().sort(() => Math.random() - 0.5);
    case 'comment': return S().split('\n').map(l => '# ' + l).join('\n');
    case 'splitext': { const p = S(); const i = p.lastIndexOf('.'); return i > 0 ? [p.slice(0, i), p.slice(i)] : [p, '']; }
    case 'realpath': case 'expanduser': return env.sh ? env.sh.resolve(S()) : S();
    case 'mandatory': return v;
    case 'human_readable': return v + ' B';
    case 'to_datetime': return S();
    case 'attr': return simanGetAttr(v, args[0]);
    case 'lookup': return simanLookupPlugin(args[0], [v], kw, env);
    default: throw new SimanError(`No filter named '${name}'.`);
  }
}
function simanHash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0').repeat(4); }

/* sablon derleyici */
const SIMAN_TPL_CACHE = new Map();
function simanParseTemplate(src) {
  if (SIMAN_TPL_CACHE.has(src)) return SIMAN_TPL_CACHE.get(src);
  const re = /\{\{-?[\s\S]*?-?\}\}|\{%-?[\s\S]*?-?%\}|\{#[\s\S]*?#\}/g;
  const toks = []; let last = 0; let m;
  while ((m = re.exec(src))) {
    if (m.index > last) toks.push({ t: 'text', v: src.slice(last, m.index) });
    const raw = m[0];
    if (raw.startsWith('{#')) toks.push({ t: 'comment', lstrip: false, rstrip: false });
    else {
      const lstrip = raw[2] === '-', rstrip = raw[raw.length - 3] === '-';
      const body = raw.slice(lstrip ? 3 : 2, rstrip ? -3 : -2).trim();
      toks.push({ t: raw.startsWith('{{') ? 'var' : 'tag', v: body, lstrip, rstrip });
    }
    last = m.index + raw.length;
  }
  if (last < src.length) toks.push({ t: 'text', v: src.slice(last) });
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === 'text') continue;
    if (t.lstrip && toks[i - 1] && toks[i - 1].t === 'text') toks[i - 1].v = toks[i - 1].v.replace(/\s+$/, '');
    if (toks[i + 1] && toks[i + 1].t === 'text') {
      if (t.rstrip) toks[i + 1].v = toks[i + 1].v.replace(/^\s+/, '');
      else if (t.t === 'tag' || t.t === 'comment') toks[i + 1].v = toks[i + 1].v.replace(/^\n/, '');
    }
  }
  let p = 0;
  const parseBlock = stops => {
    const nodes = [];
    while (p < toks.length) {
      const t = toks[p];
      if (t.t === 'tag') { const kw = t.v.split(/\s+/)[0]; if (stops.includes(kw)) return { nodes, stop: kw, tok: t }; }
      p++;
      if (t.t === 'text') { if (t.v) nodes.push({ t: 'text', v: t.v }); continue; }
      if (t.t === 'comment') continue;
      if (t.t === 'var') { nodes.push({ t: 'out', fn: simanParseExpr(t.v), src: t.v }); continue; }
      const kw = t.v.split(/\s+/)[0]; const rest = t.v.slice(kw.length).trim();
      if (kw === 'if') {
        const branches = []; let els = null; let cur = simanParseExpr(rest);
        for (;;) {
          const b = parseBlock(['elif', 'else', 'endif']);
          if (!b.stop) throw new SimanError("Unexpected end of template. Jinja was looking for the following tags: 'elif' or 'else' or 'endif'.");
          branches.push({ cond: cur, body: b.nodes }); p++;
          if (b.stop === 'elif') { cur = simanParseExpr(b.tok.v.slice(4).trim()); continue; }
          if (b.stop === 'else') { const e = parseBlock(['endif']); if (!e.stop) throw new SimanError("Unexpected end of template. Jinja was looking for the following tags: 'endif'."); els = e.nodes; p++; }
          break;
        }
        nodes.push({ t: 'if', branches, els }); continue;
      }
      if (kw === 'for') {
        const fm = /^(\w+)(?:\s*,\s*(\w+))?\s+in\s+([\s\S]+?)(?:\s+if\s+([\s\S]+))?$/.exec(rest);
        if (!fm) throw new SimanError(`invalid for statement: ${t.v}`);
        const b = parseBlock(['else', 'endfor']);
        if (!b.stop) throw new SimanError("Unexpected end of template. Jinja was looking for the following tags: 'endfor' or 'else'.");
        let els = null; p++;
        if (b.stop === 'else') { const e = parseBlock(['endfor']); if (!e.stop) throw new SimanError("Unexpected end of template. Jinja was looking for the following tags: 'endfor'."); els = e.nodes; p++; }
        nodes.push({ t: 'for', vars: fm[2] ? [fm[1], fm[2]] : [fm[1]], iter: simanParseExpr(fm[3]), cond: fm[4] ? simanParseExpr(fm[4]) : null, body: b.nodes, els }); continue;
      }
      if (kw === 'set') {
        const sm = /^(\w+)\s*=\s*([\s\S]+)$/.exec(rest);
        if (sm) { nodes.push({ t: 'set', name: sm[1], fn: simanParseExpr(sm[2]) }); continue; }
        const b = parseBlock(['endset']); p++; nodes.push({ t: 'setblock', name: rest.trim(), body: b.nodes }); continue;
      }
      if (kw === 'raw') { let txt = ''; while (p < toks.length && !(toks[p].t === 'tag' && toks[p].v === 'endraw')) { txt += toks[p].t === 'text' ? toks[p].v : toks[p].t === 'var' ? '{{ ' + toks[p].v + ' }}' : '{% ' + toks[p].v + ' %}'; p++; } p++; nodes.push({ t: 'text', v: txt }); continue; }
      if (kw === 'macro' || kw === 'block' || kw === 'filter') { const end = 'end' + kw; const b = parseBlock([end]); p++; nodes.push({ t: 'group', body: b.nodes }); continue; }
      if (kw === 'include' || kw === 'import' || kw === 'extends' || kw === 'from') { nodes.push({ t: 'text', v: '' }); continue; }
      throw new SimanError(`Encountered unknown tag '${kw}'.`);
    }
    return { nodes, stop: null };
  };
  const b = parseBlock([]);
  if (p < toks.length) throw new SimanError(`Encountered unknown tag '${toks[p].v.split(/\s+/)[0]}'.`);
  SIMAN_TPL_CACHE.set(src, b.nodes);
  return b.nodes;
}
function simanRenderNodes(nodes, env, out) {
  for (const n of nodes) {
    if (n.t === 'text') { out.push(n.v); continue; }
    if (n.t === 'out') { out.push(simanStr(n.fn(env))); continue; }
    if (n.t === 'group') { simanRenderNodes(n.body, env, out); continue; }
    if (n.t === 'set') { env.vars[n.name] = n.fn(env); continue; }
    if (n.t === 'setblock') { const buf = []; simanRenderNodes(n.body, env, buf); env.vars[n.name] = buf.join(''); continue; }
    if (n.t === 'if') { let done = false; for (const br of n.branches) { if (simanTruthy(br.cond(env))) { simanRenderNodes(br.body, env, out); done = true; break; } } if (!done && n.els) simanRenderNodes(n.els, env, out); continue; }
    if (n.t === 'for') {
      let it = simanNeed(n.iter(env));
      if (simanIsPlainObj(it)) it = Object.keys(it);
      if (typeof it === 'string') it = it.split('');
      if (!Array.isArray(it)) throw new SimanError(`'${typeof it}' object is not iterable`);
      const saved = {}; [...n.vars, 'loop'].forEach(k => { saved[k] = env.vars[k]; });
      if (n.cond) it = it.filter(item => { simanBindLoopVars(env, n.vars, item); return simanTruthy(n.cond(env)); });
      const outer = env.vars.loop;
      it.forEach((item, i) => {
        simanBindLoopVars(env, n.vars, item);
        env.vars.loop = { index: i + 1, index0: i, first: i === 0, last: i === it.length - 1, length: it.length, revindex: it.length - i, revindex0: it.length - i - 1, previtem: it[i - 1], nextitem: it[i + 1], depth: 1, depth0: 0, cycle: (a, kw) => a[i % a.length], changed: () => true };
        simanRenderNodes(n.body, env, out);
      });
      if (!it.length && n.els) simanRenderNodes(n.els, env, out);
      env.vars.loop = outer;
      Object.keys(saved).forEach(k => { if (saved[k] === undefined) delete env.vars[k]; else env.vars[k] = saved[k]; });
      continue;
    }
  }
}
function simanBindLoopVars(env, names, item) {
  if (names.length === 2) { const pair = Array.isArray(item) ? item : [item, undefined]; env.vars[names[0]] = pair[0]; env.vars[names[1]] = pair[1]; }
  else env.vars[names[0]] = item;
}
function simanRender(src, env) {
  const nodes = simanParseTemplate(String(src));
  const out = []; simanRenderNodes(nodes, env, out); return out.join('');
}
/* Ansible degerini sablonlar. Tek ifade ise dogal tip korunur */
function simanTemplateValue(v, env) {
  if (typeof v !== 'string') return v;
  if (!/\{[{%#]/.test(v)) return v;
  const whole = /^\s*\{\{-?([\s\S]*?)-?\}\}\s*$/.exec(v);
  if (whole && !/\{[{%]/.test(whole[1])) {
    let r = simanNeed(simanParseExpr(whole[1].trim())(env));
    if (typeof r === 'string' && /\{[{%]/.test(r)) r = simanTemplateValue(r, env);
    return r;
  }
  return simanRender(v, env);
}
function simanTemplateDeep(v, env) {
  if (typeof v === 'string') return simanTemplateValue(v, env);
  if (Array.isArray(v)) return v.map(x => simanTemplateDeep(x, env));
  if (v && typeof v === 'object') {
    if (v.__vault) return simanVaultDecryptValue(v.__vault, env);
    const o = {}; for (const k of Object.keys(v)) o[k] = simanTemplateDeep(v[k], env); return o;
  }
  return v;
}
function simanEvalCond(cond, env) {
  if (typeof cond === 'boolean') return cond;
  if (cond === null || cond === undefined) return true;
  if (Array.isArray(cond)) return cond.every(c => simanEvalCond(c, env));
  let s = String(cond).trim();
  if (/\{\{/.test(s)) { env.warn && env.warn(`conditional statements should not include jinja2 templating delimiters such as {{ }} or {% %}. Found: ${s}`); s = s.replace(/\{\{-?\s*([\s\S]*?)\s*-?\}\}/g, '($1)'); }
  if (s === '') return true;
  return simanTruthy(simanParseExpr(s)(env));
}

/* ---------- Vault ---------- */
function simanVaultKey(pw) { let h = 7; for (let i = 0; i < pw.length; i++) h = (Math.imul(h, 31) + pw.charCodeAt(i)) >>> 0; return h; }
function simanVaultStream(seed, n) { const out = []; let x = seed >>> 0; for (let i = 0; i < n; i++) { x = (Math.imul(x, 1103515245) + 12345) >>> 0; out.push((x >>> 16) & 255); } return out; }
function simanVaultEncrypt(secret, pw) {
  const bytes = Array.from(new TextEncoder().encode(secret));
  const key = simanVaultKey(pw); const salt = Math.floor(Math.random() * 0xffffffff) >>> 0;
  const ks = simanVaultStream(key ^ salt, bytes.length);
  const hex = b => b.map(x => x.toString(16).padStart(2, '0')).join('');
  const check = simanHash(pw + ':' + salt).slice(0, 16);
  const body = hex([(salt >>> 24) & 255, (salt >>> 16) & 255, (salt >>> 8) & 255, salt & 255]) + check + hex(bytes.map((b, i) => b ^ ks[i]));
  const doubled = body.split('').map(c => c.charCodeAt(0).toString(16)).join('');
  return '$ANSIBLE_VAULT;1.1;AES256\n' + (doubled.match(/.{1,80}/g) || []).join('\n') + '\n';
}
function simanVaultDecrypt(text, pw) {
  const ls = lines(String(text).trim());
  if (!/^\$ANSIBLE_VAULT;1\.[12];AES256/.test(ls[0] || '')) return { err: 'input is not vault encrypted data' };
  const doubled = ls.slice(1).join('').trim();
  let body = ''; for (let i = 0; i < doubled.length; i += 2) body += String.fromCharCode(parseInt(doubled.slice(i, i + 2), 16));
  const salt = parseInt(body.slice(0, 8), 16) >>> 0; const check = body.slice(8, 24); const data = body.slice(24);
  if (pw == null) return { err: 'no vault secrets found' };
  if (simanHash(pw + ':' + salt).slice(0, 16) !== check) return { err: 'Decryption failed (no vault secrets were found that could decrypt)' };
  const bytes = []; for (let i = 0; i < data.length; i += 2) bytes.push(parseInt(data.slice(i, i + 2), 16));
  const ks = simanVaultStream(simanVaultKey(pw) ^ salt, bytes.length);
  return { data: new TextDecoder().decode(new Uint8Array(bytes.map((b, i) => b ^ ks[i]))) };
}
function simanVaultDecryptValue(cipher, env) {
  if (!env.vaultPw) throw new SimanError('Attempting to decrypt but no vault secrets found');
  const r = simanVaultDecrypt(cipher, env.vaultPw);
  if (r.err) throw new SimanError(r.err);
  return r.data;
}
function simanIsVaultFile(text) { return /^\$ANSIBLE_VAULT;/.test(String(text || '').trimStart()); }

/* ---------- ayarlar ve envanter ---------- */
function simanReadCfg(sh) {
  const cands = [sh.env.ANSIBLE_CONFIG, sh.resolve('ansible.cfg'), HOME + '/.ansible.cfg', '/etc/ansible/ansible.cfg'].filter(Boolean);
  for (const c of cands) {
    const n = sh.node(sh.resolve(c));
    if (!n || n.t !== 'f') continue;
    const cfg = { path: sh.resolve(c), dir: sh.resolve(c).split('/').slice(0, -1).join('/') || '/', sections: {} };
    let sec = 'defaults';
    for (const raw of lines(n.d)) {
      const l = raw.trim(); if (!l || l.startsWith('#') || l.startsWith(';')) continue;
      const sm = /^\[(.+)\]$/.exec(l); if (sm) { sec = sm[1].trim(); cfg.sections[sec] = cfg.sections[sec] || {}; continue; }
      const kv = /^([\w.]+)\s*[=:]\s*(.*)$/.exec(l); if (kv) { cfg.sections[sec] = cfg.sections[sec] || {}; cfg.sections[sec][kv[1].trim()] = kv[2].trim(); }
    }
    return cfg;
  }
  return null;
}
function simanCfgGet(cfg, sec, key) { return cfg && cfg.sections[sec] && cfg.sections[sec][key] !== undefined ? cfg.sections[sec][key] : undefined; }
function simanNewInventory() { return { hosts: {}, groups: { all: { hosts: [], children: ['ungrouped'], vars: {} }, ungrouped: { hosts: [], children: [], vars: {} } }, sources: [], groupVarsDirs: [], hostVarsDirs: [], parsed: false, dir: null }; }
function simanInvGroup(inv, name) { if (!inv.groups[name]) { inv.groups[name] = { hosts: [], children: [], vars: {} }; if (name !== 'all' && name !== 'ungrouped' && !inv.groups.all.children.includes(name)) inv.groups.all.children.push(name); } return inv.groups[name]; }
function simanInvAddHost(inv, host, group, vars) {
  if (!inv.hosts[host]) inv.hosts[host] = { vars: {}, groups: [] };
  if (vars) Object.assign(inv.hosts[host].vars, vars);
  if (group && group !== 'all') { const g = simanInvGroup(inv, group); if (!g.hosts.includes(host)) g.hosts.push(host); if (!inv.hosts[host].groups.includes(group)) inv.hosts[host].groups.push(group); }
  const u = inv.groups.ungrouped; const inOther = inv.hosts[host].groups.some(g => g !== 'ungrouped');
  if (!inOther && !u.hosts.includes(host)) u.hosts.push(host);
  if (inOther) { const i = u.hosts.indexOf(host); if (i >= 0) u.hosts.splice(i, 1); }
}
function simanExpandRange(name) {
  const m = /^(.*)\[(\d+):(\d+)\](.*)$/.exec(name);
  if (!m) return [name];
  const out = []; const w = m[2].length;
  for (let i = Number(m[2]); i <= Number(m[3]); i++) out.push(m[1] + String(i).padStart(w, '0') + m[4]);
  return out;
}
function simanParseIni(inv, text) {
  let sec = 'ungrouped'; let kind = 'hosts';
  for (const raw of lines(text)) {
    const l = raw.replace(/\s[#;].*$/, '').trim(); if (!l || l.startsWith('#') || l.startsWith(';')) continue;
    const sm = /^\[([^\]:]+)(?::(children|vars))?\]$/.exec(l);
    if (sm) { sec = sm[1].trim(); kind = sm[2] || 'hosts'; simanInvGroup(inv, sec); continue; }
    if (kind === 'vars') { const kv = /^([\w.]+)\s*=\s*(.*)$/.exec(l); if (kv) simanInvGroup(inv, sec).vars[kv[1]] = simanLiteral(kv[2]); continue; }
    if (kind === 'children') { const g = simanInvGroup(inv, sec); simanInvGroup(inv, l); if (!g.children.includes(l)) g.children.push(l); const i = inv.groups.all.children.indexOf(l); if (i >= 0 && sec !== 'all') inv.groups.all.children.splice(i, 1); continue; }
    const toks = simanShlex(l); const vars = {};
    toks.slice(1).forEach(t => { const kv = /^([\w.]+)=([\s\S]*)$/.exec(t); if (kv) vars[kv[1]] = simanLiteral(kv[2]); });
    simanExpandRange(toks[0]).forEach(h => simanInvAddHost(inv, h, sec === 'ungrouped' ? null : sec, vars));
  }
  Object.keys(inv.groups).forEach(g => { if (g !== 'all' && g !== 'ungrouped' && !Object.values(inv.groups).some(x => x.children.includes(g)) && !inv.groups.all.children.includes(g)) inv.groups.all.children.push(g); });
}
function simanParseYamlInv(inv, data) {
  if (!simanIsPlainObj(data)) throw new SimanError('YAML inventory has invalid structure, it should be a dictionary, got: ' + typeof data);
  const walk = (name, g, parent) => {
    const grp = simanInvGroup(inv, name);
    if (parent && parent !== 'all' && !inv.groups[parent].children.includes(name)) { inv.groups[parent].children.push(name); const i = inv.groups.all.children.indexOf(name); if (i >= 0) inv.groups.all.children.splice(i, 1); }
    if (!g) return;
    if (g.vars) Object.assign(grp.vars, g.vars);
    if (g.hosts) Object.keys(g.hosts).forEach(h => simanExpandRange(h).forEach(hh => simanInvAddHost(inv, hh, name === 'all' ? null : name, g.hosts[h] || {})));
    if (g.children) Object.keys(g.children).forEach(c => walk(c, g.children[c], name));
  };
  Object.keys(data).forEach(k => walk(k, data[k], null));
}
function simanLoadInventory(sh, sources, cfg, warn) {
  const inv = simanNewInventory();
  if (!sources.length) { const d = simanCfgGet(cfg, 'defaults', 'inventory'); if (d) sources = d.split(',').map(s => s.trim()).filter(Boolean).map(s => (s.startsWith('/') || s.startsWith('~') ? s : cfg.dir + '/' + s)); else sources = ['/etc/ansible/hosts']; }
  for (const src of sources) {
    if (src.includes(',')) { src.split(',').map(s => s.trim()).filter(Boolean).forEach(h => simanInvAddHost(inv, h, null, {})); inv.parsed = true; inv.sources.push(src); continue; }
    const abs = sh.resolve(src); const n = sh.node(abs);
    if (!n) { if (src === '/etc/ansible/hosts') { warn('No inventory was parsed, only implicit localhost is available'); } else warn(`Unable to parse ${abs} as an inventory source`); continue; }
    if (n.t === 'd') { Object.keys(n.c).sort().forEach(f => { if (/\.(ini|yml|yaml)$/.test(f) || !f.includes('.')) simanLoadOne(sh, inv, abs + '/' + f, warn); }); inv.dir = abs; inv.sources.push(abs); continue; }
    simanLoadOne(sh, inv, abs, warn); inv.dir = abs.split('/').slice(0, -1).join('/') || '/'; inv.sources.push(abs);
  }
  if (inv.dir) { inv.groupVarsDirs.push(inv.dir + '/group_vars'); inv.hostVarsDirs.push(inv.dir + '/host_vars'); }
  Object.keys(inv.groups).forEach(g => { if (g !== 'all' && g !== 'ungrouped' && !Object.values(inv.groups).some(x => x.children.includes(g)) && !inv.groups.all.children.includes(g)) inv.groups.all.children.push(g); });
  if (!inv.groups.all.children.includes('ungrouped')) inv.groups.all.children.push('ungrouped');
  inv.groups.all.hosts = [];
  return inv;
}
function simanLoadOne(sh, inv, abs, warn) {
  const n = sh.node(abs); if (!n || n.t !== 'f') return;
  const txt = n.d;
  try {
    if (/\.(yml|yaml)$/.test(abs) || /^\s*(all|---)\s*:?/.test(txt) && !/^\s*\[/m.test(txt)) { const d = simanYamlLoad(txt, abs); if (simanIsPlainObj(d)) { simanParseYamlInv(inv, d); inv.parsed = true; return; } }
    simanParseIni(inv, txt); inv.parsed = true;
  } catch (e) { warn(`* Failed to parse ${abs} with yaml plugin: ${e.message.split('\n')[0]}`); warn(`Unable to parse ${abs} as an inventory source`); }
}
function simanAllHosts(inv, group) {
  const seen = new Set(); const out = [];
  const walk = g => { const grp = inv.groups[g]; if (!grp || seen.has(g)) return; seen.add(g); grp.hosts.forEach(h => { if (!out.includes(h)) out.push(h); }); grp.children.forEach(walk); };
  if (group === 'all') { walk('all'); Object.keys(inv.hosts).forEach(h => { if (!out.includes(h)) out.push(h); }); } else walk(group);
  return out;
}
function simanHostGroups(inv, host) {
  const direct = inv.hosts[host] ? inv.hosts[host].groups.slice() : [];
  const all = new Set(direct);
  let grew = true;
  while (grew) { grew = false; Object.keys(inv.groups).forEach(g => { if (!all.has(g) && inv.groups[g].children.some(c => all.has(c))) { all.add(g); grew = true; } }); }
  all.delete('all');
  const order = []; const visit = g => { if (order.includes(g) || !all.has(g)) return; Object.keys(inv.groups).forEach(pg => { if (inv.groups[pg].children.includes(g)) visit(pg); }); order.push(g); };
  [...all].sort().forEach(visit);
  return order;
}
function simanMatchPattern(inv, pattern, extraHosts) {
  const names = Object.keys(inv.hosts).concat(extraHosts || []);
  const matchOne = p => {
    p = p.trim(); if (!p) return [];
    if (p === 'all' || p === '*') return simanAllHosts(inv, 'all').concat(names.filter(h => !inv.hosts[h]));
    if (inv.groups[p]) return simanAllHosts(inv, p);
    if (/[*?]/.test(p)) { const re = new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'); return names.filter(h => re.test(h)).concat(Object.keys(inv.groups).filter(g => re.test(g)).flatMap(g => simanAllHosts(inv, g))); }
    if (p.startsWith('~')) { const re = new RegExp(p.slice(1)); return names.filter(h => re.test(h)); }
    const idx = /^(.+)\[(-?\d+)(?::(-?\d+))?\]$/.exec(p); if (idx && inv.groups[idx[1]]) { const hs = simanAllHosts(inv, idx[1]); return idx[3] !== undefined ? hs.slice(Number(idx[2]), Number(idx[3]) + 1) : [hs.at(Number(idx[2]))].filter(Boolean); }
    if (names.includes(p)) return [p];
    if (p === 'localhost' || p === '127.0.0.1') return ['localhost'];
    return [];
  };
  const parts = Array.isArray(pattern) ? pattern : String(pattern).split(/[,:](?!\d)/).map(s => s.trim()).filter(Boolean);
  let result = null;
  for (const p of parts) {
    if (p.startsWith('!')) { const ex = matchOne(p.slice(1)); result = (result || []).filter(h => !ex.includes(h)); }
    else if (p.startsWith('&')) { const inter = matchOne(p.slice(1)); result = (result || []).filter(h => inter.includes(h)); }
    else { const add = matchOne(p); result = result || []; add.forEach(h => { if (!result.includes(h)) result.push(h); }); }
  }
  return result || [];
}
function simanLoadVarsDir(sh, dir, name, env) {
  let out = {}; let found = false;
  const tryFile = abs => { const n = sh.node(abs); if (!n) return; if (n.t === 'd') { Object.keys(n.c).sort().forEach(f => { if (n.c[f].t === 'f' && /\.(yml|yaml|json)$/.test(f)) { const v = simanLoadVarsFile(sh, abs + '/' + f, env); if (simanIsPlainObj(v)) out = Object.assign(out, v); found = true; } }); return; } const v = simanLoadVarsFile(sh, abs, env); if (simanIsPlainObj(v)) out = Object.assign(out, v); found = true; };
  [dir + '/' + name, dir + '/' + name + '.yml', dir + '/' + name + '.yaml', dir + '/' + name + '.json'].forEach(tryFile);
  return found ? out : null;
}
function simanLoadVarsFile(sh, abs, env) {
  const r = sh.readFile(abs, 'ansible'); if (r.err) throw new SimanError(`Could not find or access '${abs}' on the Ansible Controller.`);
  let txt = r.data;
  if (simanIsVaultFile(txt)) { if (!env.vaultPw) throw new SimanError('Attempting to decrypt but no vault secrets found'); const d = simanVaultDecrypt(txt, env.vaultPw); if (d.err) throw new SimanError(d.err); txt = d.data; }
  const v = simanYamlLoad(txt, abs);
  return v == null ? {} : v;
}

/* ---------- cihaz baglantisi ---------- */
function simanDeviceFor(hostname, vars) {
  const cands = [vars.ansible_host, hostname].filter(x => x != null).map(String);
  for (const c of cands) {
    if (LAB.devices[c]) return LAB.devices[c];
    if (SIMAN_IP_MAP[c] && LAB.devices[SIMAN_IP_MAP[c]]) return LAB.devices[SIMAN_IP_MAP[c]];
    for (const d of Object.values(LAB.devices)) { if (d.host === c || d.name + '.lab' === c || d.mgmtIp === c || d.ip === c) return d; }
  }
  return null;
}
function simanDeviceAuth(dev, user, pass) {
  if (typeof dev.auth === 'function') { try { return !!dev.auth(user, pass); } catch (e) { return false; } }
  let users = []; try { users = (dev.model && dev.model.users) || (dev.state() || {}).users || []; } catch (e) { return true; }
  if (!users.length) return true;
  if (user == null) return false;
  const u = users.find(x => (x.username || x.name) === String(user));
  if (!u) return false;
  const sec = u.secret || u.password || u.configured_password;
  if (sec == null || /^\$\d\$/.test(String(sec)) || pass == null) return pass != null || sec == null;
  return String(sec) === String(pass);
}
function simanIsNetworkCli(conn) { return /network_cli$/.test(String(conn || '')); }
function simanIosFacts(dev, subsets) {
  const st = dev.state() || {}; const name = dev.name || st.hostname;
  const ifaces = {}; const v4 = [];
  for (const [n, i] of Object.entries(st.interfaces || {})) {
    const ipv4 = i.ip ? [{ address: i.ip, subnet: String(simanMaskToPrefix(i.mask) == null ? 24 : simanMaskToPrefix(i.mask)) }] : [];
    if (i.ip) v4.push(i.ip);
    ifaces[n] = { bandwidth: 1000000, description: i.description || '', duplex: 'Full', ipv4, lineprotocol: i.enabled ? 'up' : 'down', macaddress: '0050.56ab.' + (n.replace(/\D/g, '').padStart(2, '0') + '00').slice(0, 4), mediatype: 'Virtual', mtu: 1500, operstatus: i.enabled ? 'up' : 'administratively down', type: 'CSR vNIC' };
  }
  const facts = { ansible_net_hostname: st.hostname || name, ansible_net_version: '17.09.04a', ansible_net_model: 'C8000V', ansible_net_serialnum: '9LAB' + String(name).toUpperCase() + 'X01', ansible_net_image: 'bootflash:packages.conf', ansible_net_iostype: 'IOS-XE', ansible_net_system: 'ios', ansible_net_api: 'cliconf', ansible_net_python_version: '3.12.3', ansible_net_gather_subset: subsets || ['default', 'interfaces', 'hardware'], ansible_net_gather_network_resources: [], ansible_net_interfaces: ifaces, ansible_net_all_ipv4_addresses: v4, ansible_net_all_ipv6_addresses: [], ansible_net_neighbors: {}, ansible_net_memfree_mb: 2900.5, ansible_net_memtotal_mb: 3980.6, ansible_net_filesystems: ['bootflash:'], ansible_net_filesystems_info: { 'bootflash:': { spacetotal_kb: 6291456, spacefree_kb: 4194304 } }, ansible_network_resources: {} };
  return facts;
}
function simanNetworkResources(dev, which) {
  const st = dev.state() || {}; const out = {};
  const ifs = Object.entries(st.interfaces || {});
  if (which.includes('vlans') || which.includes('all')) out.vlans = Object.keys(st.vlans || {}).map(Number).sort((a, b) => a - b).map(id => ({ vlan_id: id, name: st.vlans[id].name, state: 'active', shutdown: 'disabled', mtu: 1500 }));
  if (which.includes('interfaces') || which.includes('all')) out.interfaces = ifs.map(([n, i]) => ({ name: n, description: i.description || undefined, enabled: !!i.enabled }));
  if (which.includes('l3_interfaces') || which.includes('all')) out.l3_interfaces = ifs.map(([n, i]) => ({ name: n, ipv4: i.ip ? [{ address: `${i.ip}/${simanMaskToPrefix(i.mask) == null ? 24 : simanMaskToPrefix(i.mask)}` }] : undefined }));
  if (which.includes('l2_interfaces') || which.includes('all')) out.l2_interfaces = ifs.filter(([, i]) => i.vlan).map(([n, i]) => ({ name: n, access: { vlan: i.vlan } }));
  if (which.includes('bgp_global') || which.includes('all')) out.bgp_global = { as_number: String((st.bgp || {}).asn || ''), neighbors: ((st.bgp || {}).neighbors || []).map(n => ({ neighbor_address: n.ip, remote_as: n.remoteAs !== undefined ? n.remoteAs : n.remote_as, description: n.description || undefined })) };
  if (which.includes('ntp_global') || which.includes('all')) out.ntp_global = { servers: (st.ntp || []).map(s => ({ server: simanNtpAddr(s) })) };
  return out;
}
/* running config'i blok agacina cevirir */
function simanConfigTree(text) {
  const ls = lines(text).filter(l => l.trim() && !/^(Building configuration|Current configuration|!|end$|version )/.test(l.trim()) && l.trim() !== '!');
  const root = { line: null, children: [], indent: -1 }; const stack = [root];
  for (const raw of ls) {
    const indent = raw.length - raw.replace(/^\s+/, '').length; const node = { line: raw.trim(), children: [], indent };
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    stack[stack.length - 1].children.push(node); stack.push(node);
  }
  return root;
}
function simanFindBlock(tree, parents) { let cur = tree; for (const p of parents) { const nxt = cur.children.find(c => c.line === String(p).trim()); if (!nxt) return null; cur = nxt; } return cur; }
function simanConfigLinesFromText(text) {
  /* girintili config metni -> [{parents:[], line}] */
  const out = []; const stack = [];
  for (const raw of lines(text)) {
    const t = raw.trim(); if (!t || t.startsWith('!') || /^(end|exit)$/.test(t)) { if (/^(end|exit)$/.test(t)) stack.length = 0; continue; }
    const indent = raw.length - raw.replace(/^\s+/, '').length;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    out.push({ parents: stack.map(s => s.line), line: t });
    stack.push({ line: t, indent });
  }
  return out;
}
function simanPredictConfig(running, parents, updates) {
  /* check modunda tahmini sonraki config, diff icin */
  const ls = lines(running); const tree = simanConfigTree(running);
  if (!parents.length) { const endIdx = ls.findIndex(l => l.trim() === 'end'); const ins = updates.filter(u => !ls.some(l => l.trim() === u)); if (endIdx >= 0) ls.splice(endIdx, 0, ...ins); else ls.push(...ins); return join(ls); }
  const blk = simanFindBlock(tree, parents);
  const indent = ' '.repeat(parents.length);
  if (!blk) { const endIdx = ls.findIndex(l => l.trim() === 'end'); const ins = parents.map((p, i) => ' '.repeat(i) + p).concat(updates.map(u => indent + u)).concat(['!']); if (endIdx >= 0) ls.splice(endIdx, 0, ...ins); else ls.push(...ins); return join(ls); }
  let idx = ls.findIndex(l => l.trim() === parents[parents.length - 1] && l.length - l.trimStart().length === parents.length - 1);
  if (idx < 0) return join(ls.concat(updates.map(u => indent + u)));
  let j = idx + 1; while (j < ls.length && (ls[j].startsWith(' ') && ls[j].trim())) j++;
  ls.splice(j, 0, ...updates.map(u => indent + u));
  return join(ls);
}

/* ---------- moduller ---------- */
/* Her modul fn(ctx, args) -> result nesnesi. ctx {run, host, vars, env, sh, dev, conn, check, diffMode, resolvePath, out} */
const SIMAN_MODULES = {};
function simanModFail(msg, extra) { return Object.assign({ failed: true, changed: false, msg }, extra || {}); }
function simanListArg(v) { if (v === undefined || v === null) return []; if (Array.isArray(v)) return v; if (typeof v === 'string') return v.split(/\n/).map(s => s.trim()).filter(Boolean).length > 1 ? v.split(/\n/).map(s => s.trim()).filter(Boolean) : [v]; return [v]; }
function simanNeedDev(ctx, modname) {
  if (ctx.host === 'localhost' || !ctx.dev) return simanModFail(`${modname} modulu bir network cihazi ister, hedef ${ctx.host} bir cihaz degil. inventory'de ansible_host ya da host adi r1, r2 olmali`);
  if (!simanIsNetworkCli(ctx.conn)) return simanModFail(`Connection type ${ctx.conn || 'ssh'} is not valid for this module`);
  return null;
}
function simanDiffHeader(ctx, before, after, what) { if (!ctx.diffMode) return; const d = simanUnifiedDiff(before, after, 'before' + (what ? ': ' + what : ''), 'after' + (what ? ': ' + what : '')); if (d) ctx.out.push(d.replace(/\n$/, '')); }

SIMAN_MODULES.ping = (ctx, a) => { if (a.data === 'crash') return simanModFail('boom'); return { changed: false, ping: a.data === undefined ? 'pong' : a.data }; };
SIMAN_MODULES.debug = (ctx, a) => {
  const verb = Number(a.verbosity || 0);
  if (verb > ctx.run.verbosity) return { skipped: true, changed: false, skip_reason: 'Verbosity threshold not met.', _verbose: true };
  if (a.var !== undefined) { let v; try { v = simanNeed(simanParseExpr(String(a.var))(ctx.env)); } catch (e) { v = `VARIABLE IS NOT DEFINED!: ${e.message}`; } return { changed: false, [String(a.var)]: v, _verbose: true, _hide: ['changed'] }; }
  return { changed: false, msg: a.msg === undefined ? 'Hello world!' : a.msg, _verbose: true, _hide: ['changed'] };
};
SIMAN_MODULES.set_fact = (ctx, a) => { const facts = {}; Object.keys(a).forEach(k => { if (k !== 'cacheable') facts[k] = a[k]; }); return { changed: false, ansible_facts: facts, _facts: facts }; };
SIMAN_MODULES.assert = (ctx, a) => {
  const that = simanListArg(a.that);
  if (!that.length) return simanModFail("missing required arguments: that");
  for (const c of that) {
    let r; try { r = simanEvalCond(c, ctx.env); } catch (e) { return simanModFail(`The conditional check '${c}' failed. The error was: ${e.message}`, { assertion: c, evaluated_to: false }); }
    if (!r) return simanModFail(a.fail_msg !== undefined ? a.fail_msg : a.msg !== undefined ? a.msg : 'Assertion failed', { assertion: c, evaluated_to: false });
  }
  const quiet = simanBool(a.quiet || false);
  return { changed: false, msg: a.success_msg !== undefined ? a.success_msg : 'All assertions passed', _verbose: !quiet };
};
SIMAN_MODULES.fail = (ctx, a) => simanModFail(a.msg === undefined ? 'Failed as requested from task' : a.msg);
SIMAN_MODULES.command = (ctx, a) => simanRunCmd(ctx, a, false);
SIMAN_MODULES.shell = (ctx, a) => simanRunCmd(ctx, a, true);
SIMAN_MODULES.raw = (ctx, a) => { if (ctx.dev && ctx.host !== 'localhost') { const out = ctx.dev.cli(String(a._raw_params || a.cmd || '')); return { changed: true, rc: 0, stdout: out.replace(/\n$/, ''), stderr: '', stdout_lines: lines(out), stderr_lines: [] }; } return simanRunCmd(ctx, a, true); };
function simanRunCmd(ctx, a, isShell) {
  const cmd = a._raw_params !== undefined ? String(a._raw_params) : a.cmd !== undefined ? (Array.isArray(a.cmd) ? a.cmd.join(' ') : String(a.cmd)) : a.argv ? a.argv.join(' ') : '';
  if (!cmd.trim()) return simanModFail('no command given');
  if (ctx.check && !ctx.checkOverride) return { skipped: true, changed: false, msg: `remote module (${isShell ? 'shell' : 'command'}) does not support check mode` };
  const sh = ctx.sh;
  if (a.creates && sh.node(ctx.resolvePath(a.creates))) return { changed: false, cmd, rc: 0, stdout: `skipped, since ${a.creates} exists`, stderr: '', stdout_lines: [`skipped, since ${a.creates} exists`], stderr_lines: [], msg: 'Did not run command since \'' + a.creates + '\' exists' };
  if (a.removes && !sh.node(ctx.resolvePath(a.removes))) return { changed: false, cmd, rc: 0, stdout: '', stderr: '', stdout_lines: [], stderr_lines: [], msg: 'Did not run command since \'' + a.removes + '\' does not exist' };
  const outB = []; const errB = []; let code = 0;
  const savedCwd = sh.cwd; if (a.chdir) { const d = ctx.resolvePath(a.chdir); if (!sh.node(d)) return simanModFail(`Unable to change directory before execution: [Errno 2] No such file or directory: '${a.chdir}'`); sh.cwd = d; }
  const savedDepth = sh.depth; sh.depth = (sh.depth || 0) + 1;
  try { code = sh.execList(cmd, (t, cls) => (cls === 'err' ? errB : outB).push(t)); } catch (e) { errB.push(String(e.message || e)); code = 1; } finally { sh.cwd = savedCwd; sh.depth = savedDepth; }
  const stdout = outB.join('').replace(/\n$/, ''), stderr = errB.join('').replace(/\n$/, '');
  const now = LAB.util.now();
  const r = { changed: true, cmd, rc: code, stdout, stderr, stdout_lines: stdout ? lines(stdout + '\n') : [], stderr_lines: stderr ? lines(stderr + '\n') : [], start: now, end: now, delta: '0:00:00.004', msg: code ? 'non-zero return code' : '' };
  if (code !== 0) r.failed = true;
  return r;
}
SIMAN_MODULES.copy = (ctx, a) => {
  const sh = ctx.sh; const dest = a.dest; if (!dest) return simanModFail('missing required arguments: dest');
  let content;
  if (a.content !== undefined) content = typeof a.content === 'string' ? a.content : JSON.stringify(a.content);
  else if (a.src) { const abs = ctx.resolveSrc(a.src, 'files'); const n = sh.node(abs); if (!n || n.t !== 'f') return simanModFail(`Could not find or access '${a.src}'\nSearched in:\n\t${ctx.dirs.join('/files/' + a.src + '\n\t')}/files/${a.src} on the Ansible Controller.\nIf you are using a module and expect the file to exist on the remote, see the remote_src option`); content = n.d; }
  else return simanModFail('src (or content) is required');
  let destAbs = ctx.resolvePath(dest); const dn = sh.node(destAbs);
  if (dn && dn.t === 'd') destAbs = destAbs.replace(/\/$/, '') + '/' + String(a.src || 'content').split('/').pop();
  const parent = destAbs.split('/').slice(0, -1).join('/') || '/';
  if (!sh.node(parent)) return simanModFail(`Destination directory ${parent} does not exist`);
  const cur = sh.node(destAbs); const before = cur ? cur.d : '';
  const changed = !cur || cur.d !== content || (a.mode && simanModeOf(a.mode) !== (cur.m & 0o777));
  if (changed) simanDiffHeader(ctx, before, content, destAbs);
  if (changed && !ctx.check) { const e = sh.writeFile(destAbs, content, false, 'copy'); if (e) return simanModFail(e); if (a.mode) { const n = sh.node(destAbs); n.m = simanModeOf(a.mode); } }
  return { changed, dest: destAbs, src: a.src || null, checksum: simanHash(content).slice(0, 40), size: content.length, mode: '0' + ((sh.node(destAbs) || { m: 0o644 }).m & 0o777).toString(8), owner: 'burak', group: 'burak', state: 'file' };
};
function simanModeOf(m) { if (typeof m === 'number') return m > 0o777 ? parseInt(String(m), 8) : parseInt(String(m), 8) || m; const s = String(m); if (/^0?[0-7]{3,4}$/.test(s)) return parseInt(s, 8); return 0o644; }
SIMAN_MODULES.file = (ctx, a) => {
  const sh = ctx.sh; const path = a.path || a.dest || a.name; if (!path) return simanModFail('missing required arguments: path');
  const abs = ctx.resolvePath(path); const n = sh.node(abs); const state = a.state || (n ? (n.t === 'd' ? 'directory' : 'file') : 'file');
  let changed = false;
  if (state === 'absent') { if (n) { changed = true; if (!ctx.check) { const { dir, name } = sh.parent(abs); delete dir.c[name]; } } return { changed, path: abs, state: 'absent' }; }
  if (state === 'directory') { if (!n) { changed = true; if (!ctx.check) { const r = sh.run ? null : null; const parts = abs.split('/').filter(Boolean); let cur = sh.root; for (const p of parts) { if (!cur.c[p]) cur.c[p] = mkdir({}, 0o755, sh.user); cur = cur.c[p]; } } } else if (n.t !== 'd') return simanModFail(`${abs} already exists as a file`); }
  else if (state === 'touch') { if (!n) { changed = true; if (!ctx.check) sh.writeFile(abs, '', false, 'file'); } else { n.ts = Date.now(); changed = true; } }
  else if (state === 'file') { if (!n) return simanModFail(`file (${abs}) is absent, cannot continue`, { path: abs }); }
  else if (state === 'link' || state === 'hard') return simanModFail('symlink bu lab\'da desteklenmiyor');
  const node = sh.node(abs);
  if (a.mode && node) { const want = simanModeOf(a.mode); if ((node.m & 0o777) !== want) { changed = true; if (!ctx.check) node.m = want; } }
  return { changed, path: abs, state, mode: '0' + (((node && node.m) || 0o644) & 0o777).toString(8), owner: 'burak', group: 'burak', size: node ? (node.t === 'd' ? 4096 : node.d.length) : 0 };
};
SIMAN_MODULES.lineinfile = (ctx, a) => {
  const sh = ctx.sh; const path = a.path || a.dest || a.name; if (!path) return simanModFail('missing required arguments: path');
  const abs = ctx.resolvePath(path); const n = sh.node(abs);
  if (!n) { if (!simanBool(a.create || false)) return simanModFail(`Destination ${abs} does not exist !`, { rc: 257 }); }
  const ls = n ? lines(n.d) : []; const before = n ? n.d : '';
  const state = a.state || 'present'; const re = a.regexp ? new RegExp(a.regexp) : null; const line = a.line === undefined ? undefined : String(a.line);
  let changed = false; let msg = '';
  if (state === 'absent') { const keep = ls.filter(l => (re ? !re.test(l) : l !== line)); if (keep.length !== ls.length) { changed = true; msg = `${ls.length - keep.length} line(s) removed`; ls.length = 0; ls.push(...keep); } }
  else {
    if (line === undefined) return simanModFail('line is required with state=present');
    let idx = -1; if (re) { for (let i = ls.length - 1; i >= 0; i--) if (re.test(ls[i])) { idx = i; break; } }
    if (idx < 0 && !re) idx = ls.indexOf(line);
    if (idx >= 0) { if (ls[idx] !== line) { ls[idx] = line; changed = true; msg = 'line replaced'; } }
    else if (!re || !ls.includes(line)) {
      changed = true; msg = 'line added';
      const where = a.insertbefore !== undefined ? ['before', a.insertbefore] : ['after', a.insertafter === undefined ? 'EOF' : a.insertafter];
      if (where[1] === 'EOF') ls.push(line); else if (where[1] === 'BOF') ls.unshift(line);
      else { const r2 = new RegExp(where[1]); let pos = -1; for (let i = 0; i < ls.length; i++) if (r2.test(ls[i])) { pos = i; if (where[0] === 'before') break; } if (pos < 0) ls.push(line); else ls.splice(where[0] === 'before' ? pos : pos + 1, 0, line); }
    }
  }
  const after = join(ls);
  if (changed) { simanDiffHeader(ctx, before, after, abs); if (!ctx.check) { const e = sh.writeFile(abs, after, false, 'lineinfile'); if (e) return simanModFail(e); } }
  return { changed, msg };
};
SIMAN_MODULES.blockinfile = (ctx, a) => {
  const sh = ctx.sh; const path = a.path || a.dest; if (!path) return simanModFail('missing required arguments: path');
  const abs = ctx.resolvePath(path); const n = sh.node(abs); if (!n && !simanBool(a.create || false)) return simanModFail(`Path ${abs} does not exist !`);
  const marker = String(a.marker || '# {mark} ANSIBLE MANAGED BLOCK'); const mb = marker.replace('{mark}', a.marker_begin || 'BEGIN'), me = marker.replace('{mark}', a.marker_end || 'END');
  const ls = n ? lines(n.d) : []; const bi = ls.indexOf(mb), ei = ls.indexOf(me);
  const block = a.state === 'absent' ? [] : [mb, ...lines(String(a.block || '') + '\n'), me];
  const out = bi >= 0 && ei >= bi ? ls.slice(0, bi).concat(block, ls.slice(ei + 1)) : ls.concat(block);
  const after = join(out); const changed = after !== (n ? n.d : '');
  if (changed) { simanDiffHeader(ctx, n ? n.d : '', after, abs); if (!ctx.check) sh.writeFile(abs, after, false, 'blockinfile'); }
  return { changed, msg: changed ? (bi >= 0 ? 'Block inserted' : 'Block inserted') : '' };
};
SIMAN_MODULES.replace = (ctx, a) => {
  const sh = ctx.sh; const abs = ctx.resolvePath(a.path || a.dest); const n = sh.node(abs); if (!n) return simanModFail(`Path ${abs} does not exist !`);
  const after = n.d.replace(new RegExp(a.regexp, 'gm'), String(a.replace || '').replace(/\\(\d)/g, '$$$1'));
  const changed = after !== n.d; if (changed) { simanDiffHeader(ctx, n.d, after, abs); if (!ctx.check) sh.writeFile(abs, after, false, 'replace'); }
  return { changed, msg: changed ? '1 replacements made' : '' };
};
SIMAN_MODULES.template = (ctx, a) => {
  const sh = ctx.sh; if (!a.src || !a.dest) return simanModFail('missing required arguments: ' + (!a.src ? 'src' : 'dest'));
  const abs = ctx.resolveSrc(a.src, 'templates'); const n = sh.node(abs);
  if (!n || n.t !== 'f') return simanModFail(`Could not find or access '${a.src}'\nSearched in:\n\t${ctx.dirs.map(d => d + '/templates/' + a.src).join('\n\t')}\n\t${ctx.dirs.map(d => d + '/' + a.src).join('\n\t')} on the Ansible Controller.\nIf you are using a module and expect the file to exist on the remote, see the remote_src option`);
  const env = Object.assign({}, ctx.env, { vars: Object.assign({}, ctx.env.vars, { ansible_managed: 'Ansible managed', template_host: 'linuxlab', template_path: abs, template_fullpath: abs, template_run_date: LAB.util.now(), template_destpath: a.dest }) });
  let rendered; try { rendered = simanRender(n.d, env); } catch (e) { return simanModFail(`AnsibleError: template error while templating string: ${e.message}. String: ${n.d.slice(0, 60).replace(/\n/g, '\\n')}`); }
  if (rendered && !rendered.endsWith('\n') && n.d.endsWith('\n')) rendered += '\n';
  return SIMAN_MODULES.copy(ctx, { content: rendered, dest: a.dest, mode: a.mode, src: undefined });
};
SIMAN_MODULES.stat = (ctx, a) => {
  const sh = ctx.sh; if (!a.path) return simanModFail('missing required arguments: path');
  const abs = ctx.resolvePath(a.path); const n = sh.node(abs);
  if (!n) return { changed: false, stat: { exists: false } };
  return { changed: false, stat: { exists: true, path: abs, isdir: n.t === 'd', isreg: n.t === 'f', islnk: false, size: n.t === 'd' ? 4096 : n.d.length, mode: '0' + (n.m & 0o777).toString(8), pw_name: n.o, gr_name: n.o, mtime: n.ts / 1000, checksum: n.t === 'f' ? simanHash(n.d).slice(0, 40) : undefined, readable: sh.canRead(n), writeable: sh.canWrite(n), executable: n.t === 'f' && !!(n.m & 0o111) } };
};
SIMAN_MODULES.slurp = (ctx, a) => { const n = ctx.sh.node(ctx.resolvePath(a.src || a.path)); if (!n || n.t !== 'f') return simanModFail(`file not found: ${a.src || a.path}`); return { changed: false, content: btoa(unescape(encodeURIComponent(n.d))), encoding: 'base64', source: ctx.resolvePath(a.src || a.path) }; };
SIMAN_MODULES.uri = (ctx, a) => {
  if (!a.url) return simanModFail('missing required arguments: url');
  const method = String(a.method || 'GET').toUpperCase(); const headers = Object.assign({}, a.headers || {});
  let body = a.body;
  if (a.body_format === 'json' && body !== undefined) { if (typeof body !== 'string') body = JSON.stringify(body); if (!Object.keys(headers).some(h => h.toLowerCase() === 'content-type')) headers['Content-Type'] = 'application/json'; }
  if (a.url_username || a.user) headers.Authorization = 'Basic ' + btoa((a.url_username || a.user) + ':' + (a.url_password || a.password || ''));
  if (ctx.check && method !== 'GET' && method !== 'HEAD') return { skipped: true, changed: false, msg: 'remote module (uri) does not support check mode' };
  const r = LAB.http({ method, url: a.url, headers, body });
  if (r.error) return simanModFail(`Status code was -1 and not [200]: Request failed: <urlopen error [Errno -2] Name or service not known>`, { status: -1, url: a.url, elapsed: 0, redirected: false });
  const want = simanListArg(a.status_code === undefined ? [200] : a.status_code).map(Number);
  const res = { changed: false, status: r.status, url: a.url, msg: `OK (${r.body.length} bytes)`, elapsed: 0, redirected: false, cookies: {}, cookies_string: '', content_type: r.headers['content-type'] || '', content_length: String(r.body.length), date: LAB.util.now() };
  if (/json/.test(res.content_type)) { try { res.json = JSON.parse(r.body); } catch (e) { /* json degil */ } }
  if (simanBool(a.return_content || false) || r.status >= 400) res.content = r.body;
  if (!want.includes(r.status)) { res.failed = true; res.msg = `Status code was ${r.status} and not [${want.join(', ')}]: HTTP Error ${r.status}: ${({ 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict', 500: 'Internal Server Error' })[r.status] || ''}`; }
  else if (method !== 'GET' && method !== 'HEAD' && r.status < 300) res.changed = true;
  if (a.dest && !res.failed) { ctx.sh.writeFile(ctx.resolvePath(a.dest), r.body, false, 'uri'); res.changed = true; }
  return res;
};
SIMAN_MODULES.get_url = (ctx, a) => { const r = LAB.http({ method: 'GET', url: a.url, headers: a.headers || {} }); if (r.error || r.status >= 400) return simanModFail(`Request failed: ${r.error || 'HTTP Error ' + r.status}`, { status_code: r.status }); const abs = ctx.resolvePath(a.dest); const n = ctx.sh.node(abs); const changed = !n || n.d !== r.body; if (changed && !ctx.check) ctx.sh.writeFile(abs, r.body, false, 'get_url'); return { changed, dest: abs, status_code: r.status, url: a.url, size: r.body.length }; };
SIMAN_MODULES.pause = (ctx, a) => { if (a.seconds !== undefined || a.minutes !== undefined) { ctx.out.push(`Pausing for ${a.seconds !== undefined ? a.seconds + ' seconds' : a.minutes + ' minutes'}\n(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)`); return { changed: false, delta: 0, echo: true, rc: 0, start: LAB.util.now(), stop: LAB.util.now(), stdout: 'Paused for 0.0 seconds', user_input: '' }; } return { skipped: true, changed: false, msg: 'pause prompt bu lab\'da atlanir, terminal interaktif degil' }; };
SIMAN_MODULES.setup = (ctx, a) => ({ changed: false, ansible_facts: simanLocalFacts(ctx), _facts: simanLocalFacts(ctx) });
SIMAN_MODULES.gather_facts = SIMAN_MODULES.setup;
SIMAN_MODULES.include_vars = (ctx, a) => {
  const file = typeof a === 'string' ? a : a.file || a._raw_params; const dir = a.dir;
  let facts = {};
  if (dir) { const abs = ctx.resolveSrc(dir, 'vars'); const n = ctx.sh.node(abs); if (!n || n.t !== 'd') return simanModFail(`${dir} directory does not exist`); Object.keys(n.c).sort().forEach(f => { if (/\.(yml|yaml|json)$/.test(f)) Object.assign(facts, simanLoadVarsFile(ctx.sh, abs + '/' + f, ctx.env)); }); }
  else { if (!file) return simanModFail('file or dir is required'); const abs = ctx.resolveSrc(file, 'vars'); if (!ctx.sh.node(abs)) return simanModFail(`Could not find or access '${file}' on the Ansible Controller.`); facts = simanLoadVarsFile(ctx.sh, abs, ctx.env); }
  if (a.name) facts = { [a.name]: facts };
  return { changed: false, ansible_facts: facts, ansible_included_var_files: [file || dir], _facts: facts };
};
SIMAN_MODULES.add_host = (ctx, a) => { const name = a.name || a.hostname || a.host; if (!name) return simanModFail('missing required arguments: name'); const groups = simanListArg(a.groups); const vars = {}; Object.keys(a).forEach(k => { if (!['name', 'hostname', 'host', 'groups'].includes(k)) vars[k] = a[k]; }); simanInvAddHost(ctx.run.inv, name, null, vars); groups.forEach(g => simanInvAddHost(ctx.run.inv, name, g, {})); return { changed: true, add_host: { host_name: name, groups, host_vars: vars } }; };
SIMAN_MODULES.wait_for_connection = () => ({ changed: false, elapsed: 0 });
SIMAN_MODULES.wait_for = () => ({ changed: false, elapsed: 0 });
SIMAN_MODULES.meta = (ctx, a) => ({ changed: false, _meta: a._raw_params || a });

/* cisco.ios */
SIMAN_MODULES.ios_command = (ctx, a) => {
  const e = simanNeedDev(ctx, 'ios_command'); if (e) return e;
  const cmds = simanListArg(a.commands).map(c => (simanIsPlainObj(c) ? c.command : String(c)));
  if (!cmds.length) return simanModFail('missing required arguments: commands');
  const bad = cmds.find(c => /^(conf(igure)?( t(erminal)?)?|interface |vlan \d|hostname |router |no |username |ntp server)/i.test(c.trim()));
  if (bad) return simanModFail(`ios_command does not support running config mode commands. Please use ios_config instead`);
  const stdout = [];
  for (const c of cmds) {
    const o = String(ctx.dev.cli(c) || '').replace(/\n$/, '');
    if (/% (Invalid input|Incomplete command|Ambiguous command)/.test(o)) return simanModFail(`${c}\r\n${o.replace(/\n/g, '\r\n')}\r\n${ctx.dev.state().hostname}#`);
    stdout.push(o);
  }
  return { changed: false, stdout, stdout_lines: stdout.map(s => lines(s + '\n')) };
};
SIMAN_MODULES.ios_config = (ctx, a) => {
  const e = simanNeedDev(ctx, 'ios_config'); if (e) return e;
  const dev = ctx.dev; const running = a.running_config || dev.running();
  const match = a.match || 'line';
  let entries = [];
  const parents = simanListArg(a.parents);
  if (a.src) { const abs = ctx.resolveSrc(a.src, 'templates'); const n = ctx.sh.node(abs); if (!n) return simanModFail(`Could not find or access '${a.src}' on the Ansible Controller.`); let txt = n.d; try { txt = simanRender(txt, ctx.env); } catch (err) { return simanModFail(`template error while templating string: ${err.message}`); } entries = simanConfigLinesFromText(txt); }
  else entries = simanListArg(a.lines !== undefined ? a.lines : a.commands).map(l => ({ parents, line: String(l).trim() }));
  if (!entries.length && !a.save_when && !a.backup) return simanModFail('one of the following is required: lines, src');
  const tree = simanConfigTree(running);
  const updates = []; const groups = [];
  for (const en of entries) {
    const blk = simanFindBlock(tree, en.parents);
    let present = false;
    if (match !== 'none' && blk) present = blk.children.some(c => c.line === en.line);
    if (match === 'none' || !present) { let g = groups.find(x => x.parents.join('\n') === en.parents.join('\n')); if (!g) { g = { parents: en.parents, lines: [] }; groups.push(g); } g.lines.push(en.line); }
  }
  const commands = [];
  const before = simanListArg(a.before), after = simanListArg(a.after);
  if (groups.length) { commands.push(...before); groups.forEach(g => { commands.push(...g.parents, ...g.lines); }); commands.push(...after); }
  groups.forEach(g => updates.push(...g.lines));
  const res = { changed: commands.length > 0, commands, updates, banners: {} };
  let afterCfg = running;
  if (commands.length) {
    if (ctx.check) { groups.forEach(g => { afterCfg = simanPredictConfig(afterCfg, g.parents, g.lines); }); }
    else {
      const r = dev.configure(commands) || {};
      if (r.errors || (r.output && /% (Invalid input|Incomplete command|Ambiguous|Bad mask|overlaps|Command rejected)/.test(r.output))) return simanModFail(simanIosErrText(r.output, commands, dev));
      afterCfg = dev.running();
    }
    if (ctx.diffMode) { const d = simanUnifiedDiff(running, afterCfg, 'before', 'after'); if (d) ctx.out.push(d.replace(/\n$/, '')); }
  }
  const sw = a.save_when || 'never';
  if (!ctx.check && (sw === 'always' || ((sw === 'modified' || sw === 'changed') && commands.length))) { try { dev.cli('write memory'); } catch (err) { /* yok */ } res.changed = true; res.saved = true; }
  if (a.backup) { const p = ctx.playbookDir + '/backup'; ctx.sh.run && null; const parts = p.split('/').filter(Boolean); let cur = ctx.sh.root; parts.forEach(x => { if (!cur.c[x]) cur.c[x] = mkdir({}, 0o755, 'burak'); cur = cur.c[x]; }); const f = `${p}/${ctx.host}_config.${new Date().toISOString().slice(0, 10)}.cfg`; ctx.sh.writeFile(f, running, false, 'ios_config'); res.backup_path = f; }
  return res;
};
SIMAN_MODULES.ios_facts = (ctx, a) => {
  const e = simanNeedDev(ctx, 'ios_facts'); if (e) return e;
  const subsets = simanListArg(a.gather_subset || ['!config']);
  const facts = simanIosFacts(ctx.dev, subsets.map(s => s.replace(/^!/, '')).filter(s => s !== 'config' && s !== 'min').length ? subsets : ['default', 'interfaces', 'hardware']);
  const nr = simanListArg(a.gather_network_resources);
  if (nr.length) { facts.ansible_network_resources = simanNetworkResources(ctx.dev, nr); facts.ansible_net_gather_network_resources = nr; }
  if (subsets.includes('config') || subsets.includes('all')) facts.ansible_net_config = ctx.dev.running();
  return { changed: false, ansible_facts: facts, _facts: facts };
};
SIMAN_MODULES.ios_vlans = (ctx, a) => {
  const e = simanNeedDev(ctx, 'ios_vlans'); if (e) return e;
  const dev = ctx.dev; const st = dev.state(); const state = a.state || 'merged';
  const have = Object.keys(st.vlans || {}).map(Number).map(id => ({ vlan_id: id, name: st.vlans[id].name }));
  const want = simanListArg(a.config).map(c => ({ vlan_id: Number(c.vlan_id), name: c.name, shutdown: c.shutdown, state: c.state }));
  if (['merged', 'replaced', 'overridden'].includes(state) && !want.length) return simanModFail('value of config parameter must not be empty for state ' + state);
  const cmds = [];
  const addOrUpdate = w => { const h = have.find(x => x.vlan_id === w.vlan_id); if (!h) { cmds.push(`vlan ${w.vlan_id}`); if (w.name) cmds.push(`name ${w.name}`); } else if (w.name && h.name !== w.name) { cmds.push(`vlan ${w.vlan_id}`, `name ${w.name}`); } };
  if (state === 'merged') want.forEach(addOrUpdate);
  else if (state === 'replaced') want.forEach(addOrUpdate);
  else if (state === 'overridden') { have.forEach(h => { if (h.vlan_id !== 1 && !want.some(w => w.vlan_id === h.vlan_id)) cmds.push(`no vlan ${h.vlan_id}`); }); want.forEach(addOrUpdate); }
  else if (state === 'deleted') { (want.length ? want : have).forEach(w => { if (w.vlan_id !== 1 && have.some(h => h.vlan_id === w.vlan_id)) cmds.push(`no vlan ${w.vlan_id}`); }); }
  else if (state === 'gathered') return { changed: false, gathered: have.map(h => ({ vlan_id: h.vlan_id, name: h.name, state: 'active', shutdown: 'disabled', mtu: 1500 })) };
  else if (state === 'rendered') { want.forEach(w => { cmds.push(`vlan ${w.vlan_id}`); if (w.name) cmds.push(`name ${w.name}`); }); return { changed: false, rendered: cmds }; }
  else return simanModFail(`value of state must be one of: merged, replaced, overridden, deleted, gathered, rendered, parsed, got: ${state}`);
  return simanApplyResource(ctx, cmds, have, () => { const s2 = dev.state(); return Object.keys(s2.vlans || {}).map(Number).map(id => ({ vlan_id: id, name: s2.vlans[id].name })); });
};
SIMAN_MODULES.ios_interfaces = (ctx, a) => {
  const e = simanNeedDev(ctx, 'ios_interfaces'); if (e) return e;
  const dev = ctx.dev; const st = dev.state(); const state = a.state || 'merged';
  const norm = n => { const m = /^(?:gi|gigabitethernet)\s*(\d[\d/]*)$/i.exec(String(n).trim()); return m ? 'GigabitEthernet' + m[1] : String(n).trim(); };
  const have = Object.entries(st.interfaces || {}).map(([n, i]) => ({ name: n, description: i.description || undefined, enabled: !!i.enabled }));
  const want = simanListArg(a.config).map(c => ({ name: norm(c.name), description: c.description, enabled: c.enabled === undefined ? undefined : simanBool(c.enabled), mtu: c.mtu }));
  if (state === 'gathered') return { changed: false, gathered: have };
  const cmds = [];
  for (const w of want) {
    const h = have.find(x => x.name === w.name); const sub = [];
    if (!h && !st.interfaces[w.name]) return simanModFail(`interface ${w.name} cihazda yok`);
    if (state === 'deleted') { if (h && h.description) sub.push('no description'); if (h && !h.enabled) sub.push('no shutdown'); }
    else {
      if (w.description !== undefined && (!h || h.description !== w.description)) sub.push(`description ${w.description}`);
      if ((state === 'replaced' || state === 'overridden') && w.description === undefined && h && h.description) sub.push('no description');
      if (w.enabled !== undefined && (!h || h.enabled !== w.enabled)) sub.push(w.enabled ? 'no shutdown' : 'shutdown');
      if (w.mtu !== undefined) sub.push(`mtu ${w.mtu}`);
    }
    if (sub.length) cmds.push(`interface ${w.name}`, ...sub);
  }
  return simanApplyResource(ctx, cmds, have, () => { const s2 = dev.state(); return Object.entries(s2.interfaces || {}).map(([n, i]) => ({ name: n, description: i.description || undefined, enabled: !!i.enabled })); });
};
SIMAN_MODULES.ios_l3_interfaces = (ctx, a) => {
  const e = simanNeedDev(ctx, 'ios_l3_interfaces'); if (e) return e;
  const dev = ctx.dev; const st = dev.state(); const state = a.state || 'merged';
  const norm = n => { const m = /^(?:gi|gigabitethernet)\s*(\d[\d/]*)$/i.exec(String(n).trim()); return m ? 'GigabitEthernet' + m[1] : String(n).trim(); };
  const have = Object.entries(st.interfaces || {}).map(([n, i]) => ({ name: n, ipv4: i.ip ? [{ address: `${i.ip}/${simanMaskToPrefix(i.mask) == null ? 24 : simanMaskToPrefix(i.mask)}` }] : undefined }));
  const cmds = [];
  for (const c of simanListArg(a.config)) {
    const name = norm(c.name); const h = have.find(x => x.name === name); const sub = [];
    if (state === 'deleted') { if (h && h.ipv4) sub.push('no ip address'); }
    else { const addr = (c.ipv4 || [])[0]; if (addr && addr.address) { const [ip, p] = String(addr.address).split('/'); const line = `ip address ${ip} ${simanPrefixToMask(p || 24)}`; const cur = h && h.ipv4 ? h.ipv4[0].address : null; if (cur !== addr.address) sub.push(line); } }
    if (sub.length) cmds.push(`interface ${name}`, ...sub);
  }
  return simanApplyResource(ctx, cmds, have, () => { const s2 = dev.state(); return Object.entries(s2.interfaces || {}).map(([n, i]) => ({ name: n, ipv4: i.ip ? [{ address: `${i.ip}/${simanMaskToPrefix(i.mask) == null ? 24 : simanMaskToPrefix(i.mask)}` }] : undefined })); });
};
SIMAN_MODULES.ios_system = (ctx, a) => { const e = simanNeedDev(ctx, 'ios_system'); if (e) return e; const st = ctx.dev.state(); const cmds = []; if (a.hostname && a.hostname !== st.hostname) cmds.push(`hostname ${a.hostname}`); return simanApplyResource(ctx, cmds, { hostname: st.hostname }, () => ({ hostname: ctx.dev.state().hostname })); };
SIMAN_MODULES.ios_user = (ctx, a) => {
  const e = simanNeedDev(ctx, 'ios_user'); if (e) return e; const st = { users: simanDevUsers(ctx.dev) }; const cmds = [];
  const users = simanListArg(a.aggregate && a.aggregate.length ? a.aggregate : [{ name: a.name, privilege: a.privilege, configured_password: a.configured_password, state: a.state }]);
  for (const u of users) { const name = u.name || a.name; if (!name) return simanModFail('missing required arguments: name'); const cur = st.users.find(x => x.name === name); const state = u.state || a.state || 'present'; if (state === 'absent') { if (cur) cmds.push(`no username ${name}`); continue; } const priv = u.privilege || a.privilege || 1; const pw = u.configured_password || a.configured_password; if (!cur || Number(cur.privilege) !== Number(priv) || (pw && cur.secret !== pw && !simanBool(a.update_password === 'on_create'))) cmds.push(`username ${name} privilege ${priv} secret ${pw || 'lab'}`); }
  return simanApplyResource(ctx, cmds, st.users.map(u => ({ name: u.name, privilege: u.privilege })), () => simanDevUsers(ctx.dev).map(u => ({ name: u.name, privilege: u.privilege })));
};
SIMAN_MODULES.ios_ntp_global = (ctx, a) => { const e = simanNeedDev(ctx, 'ios_ntp_global'); if (e) return e; const st = ctx.dev.state(); const cur = (st.ntp || []).map(simanNtpAddr); const cmds = []; const state = a.state || 'merged'; const want = ((a.config || {}).servers || []).map(s => s.server); if (state === 'deleted') cur.forEach(s => cmds.push(`no ntp server ${s}`)); else { want.forEach(s => { if (!cur.includes(s)) cmds.push(`ntp server ${s}`); }); if (state === 'replaced' || state === 'overridden') cur.forEach(s => { if (!want.includes(s)) cmds.push(`no ntp server ${s}`); }); } return simanApplyResource(ctx, cmds, { servers: cur.map(server => ({ server })) }, () => ({ servers: (ctx.dev.state().ntp || []).map(x => ({ server: simanNtpAddr(x) })) })); };
SIMAN_MODULES.ios_banner = (ctx, a) => { const e = simanNeedDev(ctx, 'ios_banner'); if (e) return e; return { changed: false, commands: [] }; };
function simanIosErrText(output, cmds, dev) {
  /* cihaz ciktisindan hatali satiri ve % mesajini cek, gercek ios_config hata metnine benzesin */
  const ls = lines(output || ''); const i = ls.findIndex(l => /^% /.test(l));
  if (i < 0) return (output || '').replace(/\n/g, '\r\n');
  const echo = ls.slice(Math.max(0, i - 2), i + 1).map(l => l.replace(/^[^#]*#/, '')).join('\r\n');
  return `${echo}\r\n\r\n${dev.state().hostname}(config)#`;
}
function simanApplyResource(ctx, cmds, before, afterFn) {
  const res = { changed: cmds.length > 0, commands: cmds, before };
  if (!cmds.length) { res.after = before; return res; }
  const dev = ctx.dev; const runBefore = dev.running();
  if (ctx.check) { res.after = before; if (ctx.diffMode) { let pred = runBefore; let parents = []; cmds.forEach(c => { if (/^(interface|vlan|router) /.test(c)) { parents = [c]; pred = simanPredictConfig(pred, [], [c]); } else pred = simanPredictConfig(pred, parents, [c]); }); const d = simanUnifiedDiff(runBefore, pred, 'before', 'after'); if (d) ctx.out.push(d.replace(/\n$/, '')); } return res; }
  const r = dev.configure(cmds) || {};
  if (r.errors || (r.output && /% (Invalid input|Incomplete|Bad mask|overlaps|Command rejected)/.test(r.output))) return simanModFail(simanIosErrText(r.output, cmds, dev));
  res.after = afterFn();
  if (ctx.diffMode) { const d = simanUnifiedDiff(runBefore, dev.running(), 'before', 'after'); if (d) ctx.out.push(d.replace(/\n$/, '')); }
  return res;
}
function simanNtpAddr(s) { return typeof s === 'string' ? s : (s.ip || s.address || s.server); }
function simanDevUsers(dev) { const us = (dev.model && dev.model.users) || (dev.state() || {}).users || []; return us.map(u => ({ name: u.name || u.username, privilege: u.privilege, secret: u.secret })); }
function simanLocalFacts(ctx) {
  const sh = ctx.sh; const d = new Date();
  return { ansible_hostname: 'linuxlab', ansible_fqdn: 'linuxlab', ansible_nodename: 'linuxlab', ansible_distribution: 'Ubuntu', ansible_distribution_version: '24.04', ansible_distribution_release: 'noble', ansible_os_family: 'Debian', ansible_system: 'Linux', ansible_kernel: '6.8.0-45-generic', ansible_architecture: 'x86_64', ansible_machine: 'x86_64', ansible_python_version: '3.12.3', ansible_user_id: sh.user, ansible_user_dir: HOME, ansible_env: Object.assign({}, sh.env), ansible_default_ipv4: { address: '192.168.1.42', interface: 'eth0', netmask: '255.255.255.0', gateway: '192.168.1.1' }, ansible_all_ipv4_addresses: ['192.168.1.42'], ansible_interfaces: ['lo', 'eth0'], ansible_memtotal_mb: 3934, ansible_processor_vcpus: 2, ansible_date_time: { date: d.toISOString().slice(0, 10), time: d.toTimeString().slice(0, 8), iso8601: LAB.util.now(), epoch: String(Math.floor(d.getTime() / 1000)), year: String(d.getFullYear()), month: String(d.getMonth() + 1).padStart(2, '0'), day: String(d.getDate()).padStart(2, '0'), hour: String(d.getHours()).padStart(2, '0'), minute: String(d.getMinutes()).padStart(2, '0'), weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()], tz: 'UTC' }, ansible_virtualization_type: 'docker', ansible_pkg_mgr: 'apt', ansible_service_mgr: 'systemd' };
}
const SIMAN_MODULE_ALIASES = { 'ansible.builtin': ['ping', 'debug', 'set_fact', 'assert', 'fail', 'command', 'shell', 'raw', 'copy', 'file', 'lineinfile', 'blockinfile', 'replace', 'template', 'stat', 'slurp', 'uri', 'get_url', 'pause', 'setup', 'gather_facts', 'include_vars', 'add_host', 'wait_for_connection', 'wait_for', 'meta'], 'cisco.ios': ['ios_command', 'ios_config', 'ios_facts', 'ios_vlans', 'ios_interfaces', 'ios_l3_interfaces', 'ios_system', 'ios_user', 'ios_ntp_global', 'ios_banner'], 'ansible.netcommon': ['cli_command', 'cli_config'] };
SIMAN_MODULES.cli_command = (ctx, a) => SIMAN_MODULES.ios_command(ctx, { commands: [a.command] });
SIMAN_MODULES.cli_config = (ctx, a) => SIMAN_MODULES.ios_config(ctx, { lines: lines(String(a.config || '')) });
function simanResolveModule(name) {
  const n = String(name);
  if (SIMAN_MODULES[n]) return { fn: SIMAN_MODULES[n], short: n, fqcn: simanFqcn(n) };
  const short = n.replace(/^(ansible\.builtin|ansible\.legacy|cisco\.ios|ansible\.netcommon|ansible\.utils)\./, '');
  if (SIMAN_MODULES[short] && (/^(ansible\.builtin|ansible\.legacy|cisco\.ios|ansible\.netcommon)\./.test(n))) return { fn: SIMAN_MODULES[short], short, fqcn: n };
  return null;
}
function simanFqcn(short) { for (const [ns, list] of Object.entries(SIMAN_MODULE_ALIASES)) if (list.includes(short)) return ns + '.' + short; return short; }
const SIMAN_TASK_KEYS = new Set(['name', 'when', 'loop', 'with_items', 'with_dict', 'with_list', 'with_together', 'with_subelements', 'with_nested', 'with_sequence', 'with_fileglob', 'loop_control', 'register', 'failed_when', 'changed_when', 'ignore_errors', 'ignore_unreachable', 'tags', 'notify', 'delegate_to', 'delegate_facts', 'run_once', 'vars', 'become', 'become_user', 'become_method', 'until', 'retries', 'delay', 'no_log', 'check_mode', 'diff', 'connection', 'args', 'environment', 'block', 'rescue', 'always', 'any_errors_fatal', 'throttle', 'timeout', 'collections', 'module_defaults', 'listen', 'local_action', 'action', 'remote_user', 'poll', 'async', 'debugger', 'port']);
const SIMAN_PLAY_KEYS = new Set(['name', 'hosts', 'gather_facts', 'gather_subset', 'connection', 'vars', 'vars_files', 'vars_prompt', 'tasks', 'pre_tasks', 'post_tasks', 'roles', 'handlers', 'tags', 'become', 'become_user', 'become_method', 'remote_user', 'any_errors_fatal', 'max_fail_percentage', 'serial', 'strategy', 'collections', 'module_defaults', 'environment', 'order', 'check_mode', 'diff', 'force_handlers', 'ignore_errors', 'ignore_unreachable', 'no_log', 'debugger', 'throttle', 'timeout', 'port', 'fact_path', 'run_once']);

/* ---------- playbook motoru ---------- */
class SimanLazy { }
const SIMAN_NO_CONN = new Set(['debug', 'set_fact', 'assert', 'fail', 'include_vars', 'add_host', 'meta', 'pause', 'wait_for_connection']);
class SimanRun {
  constructor(sh, o) {
    this.sh = sh; this.o = o; this.out = []; this.err = [];
    this.inv = o.inv; this.extra = o.extra || {}; this.check = !!o.check; this.diffMode = !!o.diff; this.verbosity = o.verbosity || 0;
    this.limit = o.limit || null; this.tags = o.tags || []; this.skipTags = o.skipTags || []; this.vaultPw = o.vaultPw == null ? null : o.vaultPw;
    this.cfg = o.cfg || null;
    this.facts = {}; this.nonpersist = {}; this.stats = {}; this.failed = new Set(); this.unreachable = new Set(); this.notified = {}; this.endedHosts = new Set();
    this.record = { tasks: [], plays: [] }; this.startAt = o.startAt || null; this.started = !this.startAt;
    this.varsCache = new Map();
  }
  warn(msg) { const l = `[WARNING]: ${msg}`; if (!this.err.includes(l)) this.err.push(l); }
  print(s) { this.out.push(s); }
  stat(host, k, n) { if (!this.stats[host]) this.stats[host] = { ok: 0, changed: 0, unreachable: 0, failed: 0, skipped: 0, rescued: 0, ignored: 0 }; this.stats[host][k] += n == null ? 1 : n; }
  touch(host) { this.stat(host, 'ok', 0); }
  active(hosts) { return hosts.filter(h => !this.failed.has(h) && !this.unreachable.has(h) && !this.endedHosts.has(h)); }
  baseEnv(vars, playbookDir) { const run = this; return { vars, sh: this.sh, vaultPw: this.vaultPw, warn: m => run.warn(m), resolve: p => (String(p).startsWith('/') ? p : (playbookDir || this.sh.cwd) + '/' + p), depth: 0 }; }
  loadVarsFilesFor(play, host, env) {
    const out = {}; const files = simanListArg(play.vars_files);
    for (let f of files) { if (Array.isArray(f)) f = f[0]; f = String(simanTemplateValue(String(f), env)); const abs = f.startsWith('/') ? f : play._dir + '/' + f; Object.assign(out, simanLoadVarsFile(this.sh, abs, env)); }
    return out;
  }
  hostVars(host, play, task, loopVars) {
    const inv = this.inv; const sh = this.sh; const run = this;
    let v = {}; const layer = o => { if (simanIsPlainObj(o)) Object.assign(v, o); };
    const pbDir = play ? play._dir : sh.cwd;
    const env0 = { vaultPw: this.vaultPw };
    if (task && task._role) layer(task._role.defaults);
    const groups = ['all', ...simanHostGroups(inv, host)];
    const gdirs = inv.groupVarsDirs.concat(pbDir ? [pbDir + '/group_vars'] : []).filter((d, i, a) => a.indexOf(d) === i);
    const hdirs = inv.hostVarsDirs.concat(pbDir ? [pbDir + '/host_vars'] : []).filter((d, i, a) => a.indexOf(d) === i);
    for (const g of groups) { if (inv.groups[g]) layer(inv.groups[g].vars); for (const d of gdirs) layer(simanLoadVarsDir(sh, d, g, env0)); }
    if (inv.hosts[host]) layer(inv.hosts[host].vars);
    for (const d of hdirs) layer(simanLoadVarsDir(sh, d, host, env0));
    layer(this.facts[host]);
    if (play) { layer(play.vars); if (play.vars_files) { const e = this.baseEnv(Object.assign({}, v, this.extra), pbDir); try { layer(this.loadVarsFilesFor(play, host, e)); } catch (err) { throw err; } } }
    if (task && task._role) { layer(task._role.vars); layer(task._role.params); }
    layer(this.nonpersist[host]);
    if (task) { layer(task._blockVars); layer(task.vars); }
    layer(this.extra);
    if (loopVars) layer(loopVars);
    const facts = this.facts[host] || {}; const af = {}; Object.keys(facts).forEach(k => { af[k.replace(/^ansible_/, '')] = facts[k]; });
    const magic = { ansible_managed: 'Ansible managed', inventory_hostname: host, inventory_hostname_short: host.split('.')[0], ansible_check_mode: this.check, ansible_diff_mode: this.diffMode, ansible_verbosity: this.verbosity, ansible_version: { full: SIMAN_VERSION, major: 2, minor: 17, revision: 4, string: SIMAN_VERSION }, ansible_facts: af, omit: '__omit_place_holder__' + simanHash('omit').slice(0, 32), playbook_dir: pbDir, inventory_dir: inv.dir || pbDir, inventory_file: inv.sources[0] || null, group_names: simanHostGroups(inv, host), ansible_play_name: play ? play.name : null, play_hosts: play ? play._hosts : [host], ansible_play_hosts: play ? play._hosts : [host], ansible_play_hosts_all: play ? play._hostsAll : [host], ansible_play_batch: play ? play._hosts : [host], ansible_run_tags: this.tags.length ? this.tags : ['all'], ansible_skip_tags: this.skipTags, ansible_config_file: this.cfg ? this.cfg.path : null, ansible_inventory_sources: inv.sources, ansible_limit: this.limit };
    if (v.ansible_host === undefined) magic.ansible_host = host;
    if (task && task._role) magic.role_path = task._role.path, magic.role_name = task._role.name;
    const grp = {}; Object.keys(inv.groups).forEach(g => { grp[g] = simanAllHosts(inv, g); }); grp.all = simanAllHosts(inv, 'all'); magic.groups = grp;
    const hv = new SimanLazy(); const allNames = Object.keys(inv.hosts).concat(['localhost']).filter((x, i, a) => a.indexOf(x) === i);
    allNames.forEach(h => { Object.defineProperty(hv, h, { enumerable: true, configurable: true, get: () => (h === host ? v : run.hostVars(h, play, null)) }); });
    magic.hostvars = hv;
    Object.keys(magic).forEach(k => { if (v[k] === undefined || k === 'hostvars' || k === 'groups' || k === 'inventory_hostname') v[k] = magic[k]; });
    return v;
  }
  env(host, play, task, loopVars) { return this.baseEnv(this.hostVars(host, play, task, loopVars), play ? play._dir : this.sh.cwd); }
  conn(host, play, task, vars) {
    let c = vars.ansible_connection; if (c === undefined && task && task.connection) c = task.connection; if (c === undefined && play && play.connection) c = play.connection;
    if (c === undefined) c = host === 'localhost' || host === '127.0.0.1' ? 'local' : 'ssh';
    return String(c);
  }
  /* ---- playbook ---- */
  loadPlaybook(path) {
    const sh = this.sh; const abs = sh.resolve(path); const r = sh.readFile(abs, 'ansible-playbook');
    if (r.err) throw new SimanError(`the playbook: ${path} could not be found`);
    const data = simanYamlLoad(r.data, abs);
    if (!Array.isArray(data)) throw new SimanError(`A playbook must be a list of plays, got a ${data === null ? 'NoneType' : simanIsPlainObj(data) ? 'dict' : typeof data} instead` + simanWhere(abs, r.data, 1));
    const plays = [];
    data.forEach((p, i) => {
      if (!simanIsPlainObj(p)) throw new SimanError('playbook entries must be either valid plays or \'import_playbook\' statements' + simanWhere(abs, r.data, simanLineOfItem(r.data, i)));
      if (p.import_playbook !== undefined || p.include_playbook !== undefined) { const f = String(p.import_playbook || p.include_playbook); const sub = this.loadPlaybook(f.startsWith('/') ? f : abs.split('/').slice(0, -1).join('/') + '/' + f); plays.push(...sub); return; }
      if (p.hosts === undefined) throw new SimanError("the field 'hosts' is required but was not set" + simanWhere(abs, r.data, simanLineOfItem(r.data, i)));
      for (const k of Object.keys(p)) if (!SIMAN_PLAY_KEYS.has(k)) throw new SimanError(`'${k}' is not a valid attribute for a Play` + simanWhere(abs, r.data, simanLineOfItem(r.data, i)) + `\n\nThe offending line appears to be:\n\n- hosts: ${simanRepr(p.hosts)}\n  ${k}:\n  ^ here`);
      p._file = abs; p._dir = abs.split('/').slice(0, -1).join('/') || '/'; p._src = r.data; p._index = i;
      plays.push(p);
    });
    return plays;
  }
  roleDirs(pbDir) { const dirs = [pbDir + '/roles']; const rp = simanCfgGet(this.cfg, 'defaults', 'roles_path'); if (rp) rp.split(':').forEach(d => dirs.push(d.startsWith('/') ? d : this.cfg.dir + '/' + d)); dirs.push(HOME + '/.ansible/roles', '/usr/share/ansible/roles', '/etc/ansible/roles', pbDir); return dirs; }
  loadRole(spec, play, from) {
    const sh = this.sh; const name = typeof spec === 'string' ? spec : spec.role || spec.name;
    if (!name) throw new SimanError("role definitions must contain a role name");
    const dirs = this.roleDirs(play._dir);
    const path = dirs.map(d => d + '/' + name).find(p => { const n = sh.node(p); return n && n.t === 'd'; });
    if (!path) throw new SimanError(`the role '${name}' was not found in ${dirs.join(':')}` + simanWhere(play._file, play._src, simanLineOf(play._src, name)));
    const loadYml = sub => { const abs = [path + '/' + sub + '/main.yml', path + '/' + sub + '/main.yaml'].find(p => sh.node(p)); if (!abs) return null; return { data: simanYamlLoad(sh.node(abs).d, abs), abs, src: sh.node(abs).d }; };
    const role = { name, path, defaults: (loadYml('defaults') || {}).data || {}, vars: (loadYml('vars') || {}).data || {}, params: {}, tasksFile: loadYml('tasks'), handlersFile: loadYml('handlers'), meta: (loadYml('meta') || {}).data || {}, tags: [], when: [] };
    if (simanIsPlainObj(spec)) { Object.keys(spec).forEach(k => { if (k === 'role' || k === 'name') return; if (k === 'vars') Object.assign(role.params, spec.vars); else if (k === 'tags') role.tags = simanListArg(spec.tags); else if (k === 'when') role.when = simanListArg(spec.when); else role.params[k] = spec[k]; }); }
    return role;
  }
  roleTasks(role, play, tasksFrom) {
    const tasks = [];
    const deps = simanListArg((role.meta || {}).dependencies);
    for (const d of deps) { const dr = this.loadRole(d, play); tasks.push(...this.roleTasks(dr, play)); }
    let tf = role.tasksFile;
    if (tasksFrom) { const abs = role.path + '/tasks/' + tasksFrom.replace(/\.ya?ml$/, '') + '.yml'; const n = this.sh.node(abs); if (!n) throw new SimanError(`Could not find or access '${abs}' on the Ansible Controller.`); tf = { data: simanYamlLoad(n.d, abs), abs, src: n.d }; }
    if (tf) tasks.push(...this.normalizeTasks(tf.data, tf.abs, tf.src, play, { role, when: role.when, tags: role.tags }));
    return tasks;
  }
  roleHandlers(role, play) { const hf = role.handlersFile; if (!hf) return []; return this.normalizeTasks(hf.data, hf.abs, hf.src, play, { role, handler: true }); }
  normalizeTasks(list, file, src, play, inherit) {
    inherit = inherit || {};
    if (list === null || list === undefined) return [];
    if (!Array.isArray(list)) throw new SimanError(`A malformed block was encountered while loading tasks: ${simanRepr(list).slice(0, 80)} should be a list or None` + simanWhere(file, src, 1));
    const out = [];
    list.forEach((raw, i) => {
      if (!simanIsPlainObj(raw)) throw new SimanError(`A malformed block was encountered while loading a block` + simanWhere(file, src, simanLineOfItem(src, i)));
      const line = simanLineOfItem(src, i, raw);
      const t = { name: raw.name, when: [].concat(inherit.when || [], raw.when === undefined ? [] : [raw.when]), tags: [].concat(inherit.tags || [], simanListArg(raw.tags)), _role: inherit.role || null, _blockVars: Object.assign({}, inherit.vars || {}), _file: file, _src: src, _line: line, _dir: file.split('/').slice(0, -1).join('/') || '/', ignore_errors: raw.ignore_errors !== undefined ? raw.ignore_errors : inherit.ignore_errors, _handler: !!inherit.handler };
      ['loop', 'with_items', 'with_dict', 'with_list', 'with_together', 'with_nested', 'with_subelements', 'with_sequence', 'loop_control', 'register', 'failed_when', 'changed_when', 'notify', 'delegate_to', 'delegate_facts', 'run_once', 'vars', 'until', 'retries', 'delay', 'no_log', 'check_mode', 'diff', 'connection', 'listen', 'any_errors_fatal', 'become', 'environment'].forEach(k => { if (raw[k] !== undefined) t[k] = raw[k]; });
      if (raw.block !== undefined) {
        t._block = true; const inh = { role: inherit.role, when: t.when, tags: t.tags, vars: Object.assign({}, inherit.vars || {}, raw.vars || {}), ignore_errors: t.ignore_errors, handler: inherit.handler };
        t.block = this.normalizeTasks(raw.block, file, src, play, inh); t.rescue = this.normalizeTasks(raw.rescue, file, src, play, Object.assign({}, inh, { when: inherit.when || [] })); t.always = this.normalizeTasks(raw.always, file, src, play, Object.assign({}, inh, { when: inherit.when || [] }));
        out.push(t); return;
      }
      const modKeys = Object.keys(raw).filter(k => !SIMAN_TASK_KEYS.has(k) && k !== 'block' && k !== 'rescue' && k !== 'always');
      let modName = null; let modArgs = {};
      if (raw.action !== undefined || raw.local_action !== undefined) { const a = raw.action !== undefined ? raw.action : raw.local_action; if (raw.local_action !== undefined) t.delegate_to = 'localhost'; if (typeof a === 'string') { const parts = a.trim().split(/\s+/); modName = parts[0]; modArgs = simanParseKv(a.trim().slice(modName.length).trim()); } else { modName = a.module; modArgs = Object.assign({}, a); delete modArgs.module; } }
      if (modKeys.length > 1) throw new SimanError(`conflicting action statements: ${modKeys.join(', ')}` + simanWhere(file, src, line));
      if (modKeys.length === 1) { modName = modKeys[0]; const a = raw[modName]; if (a === null || a === undefined) modArgs = {}; else if (typeof a === 'string') modArgs = /^(command|shell|raw|ansible\.builtin\.(command|shell|raw)|script|meta|ansible\.builtin\.meta|include_tasks|import_tasks|include_role|import_role|ansible\.builtin\.(include_tasks|import_tasks|include_role|import_role)|include_vars|ansible\.builtin\.include_vars)$/.test(modName) ? { _raw_params: a } : simanParseKv(a); else if (simanIsPlainObj(a)) modArgs = Object.assign({}, a); else modArgs = { _raw_params: a }; }
      if (!modName) throw new SimanError('no module/action detected in task.' + simanWhere(file, src, line));
      if (simanIsPlainObj(raw.args)) modArgs = Object.assign({}, raw.args, modArgs);
      const short = modName.replace(/^ansible\.(builtin|legacy)\./, '');
      t._modName = modName; t.args = modArgs;
      if (['include_tasks', 'import_tasks', 'include_role', 'import_role', 'include', 'import_playbook'].includes(short)) { t._include = short; out.push(t); return; }
      const mod = simanResolveModule(modName);
      if (!mod) throw new SimanError(`couldn't resolve module/action '${modName}'. This often indicates a misspelling, missing collection, or incorrect module path.` + simanWhere(file, src, line) + `\n\nThe offending line appears to be:\n\n${simanOffending(src, line)}`);
      t.module = mod.short; t._fqcn = mod.fqcn; t._fn = mod.fn;
      out.push(t);
    });
    return out;
  }
  taskLabel(t) {
    let name = t.name !== undefined && t.name !== null ? String(t.name) : (t._include ? t._include : t._modName);
    if (t._role) name = `${t._role.name} : ${name}`;
    return name;
  }
  tagOk(t) {
    const tags = (t.tags || []).map(String);
    if (this.skipTags.length && tags.some(x => this.skipTags.includes(x))) return false;
    if (tags.includes('never') && !this.tags.some(x => tags.includes(x))) return false;
    if (!this.tags.length || this.tags.includes('all')) return true;
    if (tags.includes('always')) return true;
    if (this.tags.includes('tagged')) return tags.length > 0; if (this.tags.includes('untagged')) return tags.length === 0;
    return tags.some(x => this.tags.includes(x));
  }
  runPlaybook(path) {
    const plays = this.loadPlaybook(path);
    this.record.playbook = this.sh.resolve(path);
    for (const play of plays) { this.runPlay(play); if (this.aborted) break; }
    this.printRecap();
  }
  playHosts(play) {
    const env0 = this.baseEnv(Object.assign({}, play.vars || {}, this.extra), play._dir);
    let pattern = play.hosts; try { pattern = simanTemplateDeep(pattern, env0); } catch (e) { throw new SimanError(`The field 'hosts' has an invalid value, which includes an undefined variable. The error was: ${e.message}`); }
    let hosts = simanMatchPattern(this.inv, pattern, []);
    if (this.limit) { const lim = simanMatchPattern(this.inv, this.limit, hosts); hosts = hosts.filter(h => lim.includes(h)); }
    return hosts;
  }
  runPlay(play) {
    const name = play.name !== undefined ? String(play.name) : String(play.hosts);
    const hosts = this.playHosts(play);
    play._hosts = hosts; play._hostsAll = hosts;
    const tasks = [], pre = [], post = []; const handlers = [];
    play._handlers = handlers;
    pre.push(...this.normalizeTasks(play.pre_tasks, play._file, play._src, play, { tags: simanListArg(play.tags) }));
    for (const r of simanListArg(play.roles)) { const role = this.loadRole(r, play); tasks.push(...this.roleTasks(role, play)); handlers.push(...this.roleHandlers(role, play)); }
    tasks.push(...this.normalizeTasks(play.tasks, play._file, play._src, play, { tags: simanListArg(play.tags) }));
    post.push(...this.normalizeTasks(play.post_tasks, play._file, play._src, play, { tags: simanListArg(play.tags) }));
    handlers.push(...this.normalizeTasks(play.handlers, play._file, play._src, play, { handler: true }));
    this.print(simanBanner(`PLAY [${name}]`));
    this.record.plays.push({ name, hosts: hosts.slice() });
    if (!hosts.length) {
      if (!this.inv.parsed && !Object.keys(this.inv.hosts).length) this.warn("provided hosts list is empty, only localhost is available. Note that the implicit localhost does not match 'all'");
      this.print('skipping: no hosts matched'); return;
    }
    if (play.vars_prompt) this.warn('vars_prompt bu lab\'da interaktif calismaz, default degerler kullanildi');
    if (play.vars_prompt) { play.vars = Object.assign({}, play.vars || {}); simanListArg(play.vars_prompt).forEach(p => { if (p && p.name && play.vars[p.name] === undefined) play.vars[p.name] = p.default === undefined ? '' : p.default; }); }
    hosts.forEach(h => this.touch(h));
    const gf = play.gather_facts === undefined ? true : simanBool(play.gather_facts);
    if (gf) this.gatherFacts(play, hosts);
    this.runTasks(pre, play, hosts); this.flushHandlers(play, hosts);
    this.runTasks(tasks, play, hosts); this.flushHandlers(play, hosts);
    this.runTasks(post, play, hosts); this.flushHandlers(play, hosts);
    this.endedHosts.clear();
  }
  gatherFacts(play, hosts) {
    const t = { name: 'Gathering Facts', module: 'gather_facts', _modName: 'gather_facts', args: {}, when: [], tags: [], _gather: true, _file: play._file, _src: play._src, _dir: play._dir };
    t._fn = (ctx, a) => { if (ctx.dev && simanIsNetworkCli(ctx.conn)) return SIMAN_MODULES.ios_facts(ctx, { gather_subset: simanListArg(play.gather_subset || ['!config']) }); return SIMAN_MODULES.setup(ctx, a); };
    this.runTask(t, play, hosts);
  }
  runTasks(tasks, play, hosts, opts) {
    for (const t of tasks) {
      if (this.aborted) return;
      const live = this.active(hosts); if (!live.length) return;
      if (t._block) { this.runBlock(t, play, live, opts); continue; }
      if (t._include) { this.runInclude(t, play, live, opts); continue; }
      this.runTask(t, play, live, opts);
    }
  }
  runBlock(b, play, hosts, opts) {
    const before = new Set(this.failed);
    this.runTasks(b.block, play, hosts, { inBlock: true, hasRescue: !!b.rescue.length });
    const newlyFailed = hosts.filter(h => this.failed.has(h) && !before.has(h));
    if (newlyFailed.length && b.rescue.length) {
      newlyFailed.forEach(h => { this.failed.delete(h); this.stat(h, 'rescued'); this.nonpersist[h] = this.nonpersist[h] || {}; this.nonpersist[h].ansible_failed_task = { name: this.lastFailedTask ? this.taskLabel(this.lastFailedTask) : '' }; this.nonpersist[h].ansible_failed_result = this.lastFailedResult || {}; });
      this.runTasks(b.rescue, play, newlyFailed, opts);
    } else if (newlyFailed.length && !(opts && opts.inBlock && opts.hasRescue)) newlyFailed.forEach(h => this.stat(h, 'failed'));
    if (b.always.length) { const live = hosts.filter(h => !this.unreachable.has(h)); this.runTasks(b.always, play, live, opts); }
  }
  runInclude(t, play, hosts, opts) {
    const kind = t._include; const args = t.args;
    if ((kind === 'include_tasks' || kind === 'include_role') && !this.tagOk(t)) return;
    const fileArg = args._raw_params !== undefined ? args._raw_params : args.file !== undefined ? args.file : args.name;
    const taskVars = t.vars || {};
    if (kind === 'import_tasks' || kind === 'include' || kind === 'include_tasks') {
      if (kind === 'include_tasks') { this.print(simanBanner(`TASK [${this.taskLabel(t)}]`)); }
      const inc = [];
      for (const h of hosts) {
        const env = this.env(h, play, t);
        let ok2 = true; try { ok2 = simanEvalCond(t.when, env); } catch (e) { this.fatal(h, t, { msg: `The conditional check '${t.when}' failed. The error was: ${e.message}` }); continue; }
        if (!ok2) { if (kind === 'include_tasks') { this.print(`skipping: [${h}]`); this.stat(h, 'skipped'); } continue; }
        if (!this.tagOk(t) && kind === 'include_tasks') continue;
        inc.push(h);
      }
      if (!inc.length) return;
      const env = this.env(inc[0], play, t);
      const f = String(simanTemplateValue(String(fileArg), env));
      const base = t._role ? t._role.path + '/tasks' : t._dir;
      const abs = f.startsWith('/') ? f : base + '/' + f;
      const n = this.sh.node(abs);
      if (!n) { const msg = `Could not find or access '${f}' on the Ansible Controller.`; if (kind === 'include_tasks') { inc.forEach(h => this.fatal(h, t, { msg })); return; } throw new SimanError(`Unable to retrieve file contents\n${msg}`); }
      const list = simanYamlLoad(n.d, abs);
      const inh = { role: t._role, when: kind === 'include_tasks' ? [] : t.when, tags: t.tags, vars: Object.assign({}, t._blockVars, taskVars, kind === 'include_tasks' ? {} : {}) };
      const sub = this.normalizeTasks(list, abs, n.d, play, inh);
      if (kind === 'include_tasks') this.print(`included: ${abs} for ${inc.join(', ')}`);
      this.runTasks(sub, play, inc, opts); return;
    }
    if (kind === 'include_role' || kind === 'import_role') {
      const env = this.env(hosts[0], play, t);
      const rname = String(simanTemplateValue(String(args.name || fileArg), env));
      const role = this.loadRole({ role: rname, vars: Object.assign({}, taskVars) }, play);
      if (kind === 'include_role') { this.print(simanBanner(`TASK [${this.taskLabel(t)}]`)); }
      const sub = this.roleTasks(role, play, args.tasks_from);
      sub.forEach(s => { s.when = [].concat(kind === 'include_role' ? [] : t.when, s.when); s.tags = [].concat(t.tags, s.tags); });
      play._handlers.push(...this.roleHandlers(role, play));
      this.runTasks(sub, play, hosts, opts); return;
    }
    throw new SimanError(`'${kind}' is not supported here`);
  }
  itemLabel(t, item, env) {
    const lc = t.loop_control || {};
    if (lc.label !== undefined) { try { return simanStr(simanTemplateValue(String(lc.label), env)); } catch (e) { return simanRepr(item); } }
    return simanRepr(item);
  }
  loopItems(t, env) {
    const tpl = v => simanTemplateDeep(v, env);
    if (t.loop !== undefined) { const v = tpl(t.loop); if (!Array.isArray(v)) throw new SimanError(`Invalid data passed to 'loop', it requires a list, got this instead: ${simanRepr(v)}. Hint: If you passed a list/dict of just one element, try adding wantlist=True to your lookup invocation or use q/query instead of lookup.`); return v; }
    if (t.with_items !== undefined || t.with_list !== undefined) { const v = tpl(t.with_items !== undefined ? t.with_items : t.with_list); const a = Array.isArray(v) ? v : [v]; return t.with_items !== undefined ? a.flat(1) : a; }
    if (t.with_dict !== undefined) { const v = tpl(t.with_dict); if (!simanIsPlainObj(v)) throw new SimanError('with_dict expects a dict'); return Object.entries(v).map(([key, value]) => ({ key, value })); }
    if (t.with_together !== undefined) { const v = tpl(t.with_together); return v[0].map((x, i) => v.map(l => l[i])); }
    if (t.with_nested !== undefined) { const v = tpl(t.with_nested); return v[0].flatMap(x => v[1].map(y => [x, y])); }
    if (t.with_subelements !== undefined) { const v = tpl(t.with_subelements); return v[0].flatMap(x => (x[v[1]] || []).map(y => [x, y])); }
    if (t.with_sequence !== undefined) { const v = simanParseKv(String(tpl(t.with_sequence))); const s = Number(v.start || 1), e = Number(v.end || v.count || 1); const out = []; for (let i = s; i <= e; i++) out.push(v.format ? v.format.replace('%d', i) : String(i)); return out; }
    return null;
  }
  runTask(t, play, hosts, opts) {
    opts = opts || {};
    if (!this.tagOk(t) && !t._handler) return;
    const label = this.taskLabel(t);
    if (!this.started) { if (this.startAt && String(label).includes(this.startAt)) this.started = true; else return; }
    this.print(simanBanner(`${t._handler ? 'RUNNING HANDLER' : 'TASK'} [${label}]`));
    let targets = hosts; if (t.run_once !== undefined && simanBool(t.run_once)) targets = [hosts[0]];
    const results = {};
    for (const h of targets) {
      const res = this.runTaskOnHost(t, play, h, opts);
      results[h] = res;
      if (res && res._abort) { this.aborted = true; break; }
    }
    if (targets.length !== hosts.length && t.register) { const r0 = results[targets[0]]; hosts.forEach(h => { this.nonpersist[h] = this.nonpersist[h] || {}; this.nonpersist[h][t.register] = r0 ? r0._registered : undefined; }); }
  }
  runTaskOnHost(t, play, h, opts) {
    let env;
    try { env = this.env(h, play, t); } catch (e) { return this.fatal(h, t, { msg: e.message }, opts); }
    let items = null;
    try { items = this.loopItems(t, env); } catch (e) { return this.fatal(h, t, { msg: e.message }, opts); }
    const loopVar = (t.loop_control && t.loop_control.loop_var) || 'item'; const indexVar = t.loop_control && t.loop_control.index_var;
    if (items === null) {
      const r = this.runOne(t, play, h, env, null, null, opts);
      return r;
    }
    const all = []; let anyChanged = false, anyFailed = false, allSkipped = items.length > 0, anyUnreach = false;
    const itemResults = [];
    items.forEach((item, i) => {
      if (this.failed.has(h) || this.unreachable.has(h)) return;
      const lv = { [loopVar]: item }; if (indexVar) lv[indexVar] = i; if (t.loop_control && t.loop_control.extended) lv.ansible_loop = { index: i + 1, index0: i, first: i === 0, last: i === items.length - 1, length: items.length };
      let env2; try { env2 = this.env(h, play, t, lv); } catch (e) { const r = this.fatal(h, t, { msg: e.message }, Object.assign({}, opts, { noStat: true, item: simanRepr(item) })); itemResults.push(r._registered); anyFailed = true; allSkipped = false; return; }
      const r = this.runOne(t, play, h, env2, item, this.itemLabel(t, item, env2), Object.assign({}, opts, { noStat: true, loop: true }));
      const reg = r._registered; reg[loopVar] = item; if (t.loop_control && t.loop_control.label !== undefined) reg.ansible_loop_var = loopVar; itemResults.push(reg);
      if (reg.unreachable) anyUnreach = true; if (reg.failed && !simanBool(t.ignore_errors || false)) anyFailed = true; if (reg.changed) anyChanged = true; if (!reg.skipped) allSkipped = false;
    });
    const agg = { results: itemResults, changed: anyChanged, msg: 'All items completed', failed: anyFailed };
    if (allSkipped) { agg.skipped = true; agg.skip_reason = 'No items in the list'; agg.changed = false; }
    if (anyFailed) agg.msg = 'One or more items failed';
    if (t.register) { this.nonpersist[h] = this.nonpersist[h] || {}; this.nonpersist[h][t.register] = agg; }
    if (!opts.noStat) {
      if (anyUnreach) { this.stat(h, 'unreachable'); this.unreachable.add(h); }
      else if (anyFailed) { if (simanBool(t.ignore_errors || false)) { this.stat(h, 'ok'); this.stat(h, 'ignored'); if (anyChanged) this.stat(h, 'changed'); } else { this.failed.add(h); if (!opts.inBlock) this.stat(h, 'failed'); this.lastFailedTask = t; this.lastFailedResult = agg; } }
      else if (allSkipped) this.stat(h, 'skipped');
      else { this.stat(h, 'ok'); if (anyChanged) this.stat(h, 'changed'); }
    }
    if (anyChanged && t.notify) this.notify(h, t, env);
    return { _registered: agg };
  }
  notify(h, t, env) {
    let names; try { names = simanListArg(simanTemplateDeep(t.notify, env)); } catch (e) { names = simanListArg(t.notify); }
    this.notified[h] = this.notified[h] || []; names.forEach(n => { if (!this.notified[h].includes(String(n))) this.notified[h].push(String(n)); });
  }
  fatal(h, t, res, opts) {
    opts = opts || {};
    res = Object.assign({ changed: false }, res, { failed: true });
    return this.report(h, t, res, opts.item || null, opts, null);
  }
  runOne(t, play, h, env, item, itemLabel, opts) {
    opts = opts || {};
    const vars = env.vars; const ignore = simanBool(t.ignore_errors || false);
    /* when */
    let condOk = true;
    try { condOk = simanEvalCond(t.when, env); } catch (e) { return this.report(h, t, { changed: false, failed: true, msg: `The conditional check '${simanListArg(t.when).join(' and ')}' failed. The error was: ${e.message}` + (t._file ? simanWhere(t._file, t._src, t._line) : '') }, itemLabel, opts, env); }
    if (!condOk) return this.report(h, t, { changed: false, skipped: true, skip_reason: 'Conditional result was False' }, itemLabel, opts, env);
    /* args */
    let args;
    try { args = simanTemplateDeep(t.args, env); } catch (e) { return this.report(h, t, { changed: false, failed: true, msg: `The task includes an option with an undefined variable. The error was: ${e.message}${e.message.includes('undefined') ? '. \'' + e.message.split("'")[1] + '\' is undefined' : ''}` + simanWhere(t._file, t._src, t._line) + `\n\nThe offending line appears to be:\n\n${simanOffending(t._src, t._line)}` }, itemLabel, opts, env); }
    args = simanOmit(args, vars.omit);
    /* hedef ve baglanti */
    let target = h; let display = h;
    if (t.delegate_to !== undefined) { try { target = String(simanTemplateValue(String(t.delegate_to), env)); } catch (e) { target = String(t.delegate_to); } if (target !== h) display = `${h} -> ${target}`; }
    const tvars = target === h ? vars : (this.inv.hosts[target] || target === 'localhost' ? this.hostVars(target, play, t) : vars);
    const tenv = target === h ? env : this.baseEnv(tvars, play._dir);
    let cvErr = null;
    const cv = n => { try { const v = simanLookup(tenv, n); return simanIsUndef(v) ? undefined : v; } catch (e) { if (/vault|Decryption/.test(e.message)) throw e; cvErr = e; return undefined; } };
    const cvars = { ansible_connection: cv('ansible_connection'), ansible_host: cv('ansible_host'), ansible_user: cv('ansible_user'), ansible_password: cv('ansible_password'), ansible_ssh_pass: cv('ansible_ssh_pass') };
    if (cvErr) return this.report(h, t, { changed: false, failed: true, msg: `baglanti degiskeni cozulemedi: ${cvErr.message}` }, itemLabel, opts, env, display);
    Object.keys(cvars).forEach(k => { if (cvars[k] !== undefined) tvars[k] = cvars[k]; });
    const conn = target === 'localhost' || target === '127.0.0.1' ? 'local' : this.conn(target, play, t, tvars);
    const isLocal = conn === 'local' || target === 'localhost';
    const dev = isLocal ? null : simanDeviceFor(target, tvars);
    const modName = t.module;
    const needsConn = !SIMAN_NO_CONN.has(modName);
    if (needsConn && !isLocal && !dev) { return this.report(h, t, { changed: false, unreachable: true, msg: `Failed to connect to the host via ssh: ssh: Could not resolve hostname ${tvars.ansible_host || target}: Name or service not known` }, itemLabel, opts, env, display); }
    if (needsConn && dev && !simanIsNetworkCli(conn) && !/^ios_|^cli_/.test(modName) && modName !== 'raw' && modName !== 'gather_facts') {
      return this.report(h, t, { changed: false, failed: true, module_stderr: `Shared connection to ${tvars.ansible_host || target} closed.\r\n`, module_stdout: `\r\nLine has invalid autocommand "/bin/sh -c 'echo ~${tvars.ansible_user || 'burak'} && sleep 0'"\r\n`, msg: 'MODULE FAILURE: cihaz bir Linux degil, ansible_connection=ansible.netcommon.network_cli ve ansible_network_os=cisco.ios.ios ayarla\nSee stdout/stderr for the exact error', rc: 0 }, itemLabel, opts, env, display);
    }
    if (needsConn && dev && simanIsNetworkCli(conn)) {
      const user = tvars.ansible_user, pw = tvars.ansible_password !== undefined ? tvars.ansible_password : tvars.ansible_ssh_pass;
      if (!simanDeviceAuth(dev, user, pw)) return this.report(h, t, { changed: false, failed: true, msg: user === undefined || pw === undefined ? `Failed to authenticate: ansible_user ve ansible_password tanimli degil. inventory ya da group_vars icinde ver (vault ile sifrele)` : 'Failed to authenticate: Authentication failed.' }, itemLabel, opts, env, display);
    }
    const run = this;
    const dirs = [].concat(t._role ? [t._role.path] : [], [t._dir, play._dir]).filter((d, i, a) => a.indexOf(d) === i);
    const ctx = {
      run, host: target, origHost: h, vars, env, sh: this.sh, dev, conn, check: this.check && !(t.check_mode !== undefined && !simanBool(t.check_mode)), checkOverride: t.check_mode !== undefined && !simanBool(t.check_mode), diffMode: this.diffMode || (t.diff !== undefined && simanBool(t.diff)), out: this.out, dirs, playbookDir: play._dir,
      resolvePath: p => { p = String(p); if (p.startsWith('~')) p = HOME + p.slice(1); return p.startsWith('/') ? p : this.sh.cwd + '/' + p; },
      resolveSrc: (p, sub) => { p = String(p); if (p.startsWith('/')) return p; if (p.startsWith('~')) return HOME + p.slice(1); for (const d of dirs) { for (const c of [d + '/' + sub + '/' + p, d + '/' + p]) if (this.sh.node(c)) return c; } const c2 = this.sh.cwd + '/' + p; if (this.sh.node(c2)) return c2; return dirs[0] + '/' + sub + '/' + p; },
    };
    if (ctx.check && t.check_mode !== undefined && simanBool(t.check_mode)) ctx.check = true;
    if (t.check_mode !== undefined && simanBool(t.check_mode)) ctx.check = true;
    let res; let retries = t.until !== undefined ? Number(t.retries === undefined ? 3 : t.retries) : 0; let attempt = 0;
    for (;;) {
      attempt++;
      try { res = t._fn(ctx, args) || { changed: false }; } catch (e) { res = { changed: false, failed: true, msg: e instanceof SimanError ? e.message : `Unexpected failure during module execution: ${e.message}`, exception: e instanceof SimanError ? undefined : String(e.stack || e) }; }
      res = Object.assign({}, res);
      if (res._meta !== undefined) return this.handleMeta(h, t, res._meta, play);
      if (t.register) env.vars[t.register] = res;
      if (t.until === undefined) break;
      res.attempts = attempt;
      let ok2 = false; try { env.vars[t.register || 'result'] = res; ok2 = simanEvalCond(t.until, env); } catch (e) { ok2 = false; }
      if (ok2) break;
      if (attempt > retries) { res.attempts = attempt; res.failed = true; res.msg = res.msg || ''; break; }
      this.print(`FAILED - RETRYING: [${display}]: ${this.taskLabel(t)} (${retries - attempt + 1} retries left).`);
    }
    if (t.changed_when !== undefined) { try { env.vars[t.register || 'result'] = res; res.changed = simanEvalCond(t.changed_when, env); } catch (e) { res = { changed: false, failed: true, msg: `The conditional check '${t.changed_when}' failed. The error was: ${e.message}` }; } }
    if (t.failed_when !== undefined && !res.unreachable) { try { env.vars[t.register || 'result'] = res; const f = simanEvalCond(t.failed_when, env); res.failed_when_result = f; if (f) res.failed = true; else delete res.failed; } catch (e) { res = { changed: false, failed: true, msg: `The conditional check '${t.failed_when}' failed. The error was: ${e.message}` }; } }
    if (res._facts && !res.failed) {
      const factHost = (t.delegate_to !== undefined && simanBool(t.delegate_facts || false)) ? target : h;
      if (modName === 'set_fact' || modName === 'include_vars') { this.nonpersist[factHost] = Object.assign(this.nonpersist[factHost] || {}, res._facts); }
      else this.facts[factHost] = Object.assign(this.facts[factHost] || {}, res._facts);
    }
    if (simanBool(t.no_log || false) && !res.failed) res = { changed: !!res.changed, censored: "the output has been hidden due to the fact that 'no_log: true' was specified for this result" };
    return this.report(h, t, res, itemLabel, opts, env, display);
  }
  handleMeta(h, t, what, play) {
    const w = String(what).trim();
    if (w === 'flush_handlers') { this.flushHandlers(play, play._hosts); return { _registered: {} }; }
    if (w === 'end_play') { this.aborted = true; return { _registered: {}, _abort: true }; }
    if (w === 'end_host') { this.endedHosts.add(h); return { _registered: {} }; }
    if (w === 'refresh_inventory' || w === 'noop' || w === 'clear_facts' || w === 'clear_host_errors' || w === 'reset_connection') { if (w === 'clear_host_errors') { this.failed.clear(); this.unreachable.clear(); } return { _registered: {} }; }
    return this.fatal(h, t, { msg: `invalid meta action requested: ${w}` });
  }
  cleanResult(res) { const o = {}; const hide = res._hide || []; Object.keys(res).forEach(k => { if (k.startsWith('_') || hide.includes(k) || res[k] === undefined || k === 'failed') return; o[k] = res[k]; }); return o; }
  report(h, t, res, itemLabel, opts, env, display) {
    opts = opts || {}; display = display || h;
    const ignore = simanBool(t.ignore_errors || false);
    const clean = this.cleanResult(res);
    const reg = Object.assign({}, clean); reg.failed = !!res.failed; if (reg.changed === undefined) reg.changed = false;
    const itemPart = itemLabel !== null && itemLabel !== undefined ? ` => (item=${itemLabel})` : '';
    let status;
    if (res.unreachable) { status = 'unreachable'; this.print(`fatal: [${display}]: UNREACHABLE! => ${simanJsonInline(clean)}`); }
    else if (res.failed) { status = ignore ? 'ignored' : 'failed'; this.print(`fatal: [${display}]: FAILED! => ${simanJsonInline(clean)}`); if (ignore) this.print('...ignoring'); }
    else if (res.skipped) { status = 'skipped'; this.print(`skipping: [${display}]${itemPart}` + (this.verbosity > 0 || res._verbose ? ` => ${simanJsonInline(clean)}` : '')); }
    else {
      status = res.changed ? 'changed' : 'ok';
      let tail = '';
      if (res._verbose) tail = ' => ' + simanJsonPretty(clean);
      else if (this.verbosity > 0) tail = ' => ' + simanJsonInline(clean);
      this.print(`${status}: [${display}]${itemPart}${tail}`);
    }
    if (!opts.noStat) {
      if (status === 'unreachable') { this.stat(h, 'unreachable'); this.unreachable.add(h); }
      else if (status === 'failed') { this.failed.add(h); if (!opts.inBlock) this.stat(h, 'failed'); this.lastFailedTask = t; this.lastFailedResult = reg; }
      else if (status === 'ignored') { this.stat(h, 'ok'); this.stat(h, 'ignored'); if (res.changed) this.stat(h, 'changed'); }
      else if (status === 'skipped') this.stat(h, 'skipped');
      else { this.stat(h, 'ok'); if (res.changed) this.stat(h, 'changed'); }
      if (t.register) { this.nonpersist[h] = this.nonpersist[h] || {}; this.nonpersist[h][t.register] = reg; }
      if (res.changed && t.notify && env) this.notify(h, t, env);
    } else if (opts.inBlock && status === 'failed') { this.lastFailedTask = t; this.lastFailedResult = reg; }
    this.record.tasks.push({ play: this.record.plays.length ? this.record.plays[this.record.plays.length - 1].name : null, name: this.taskLabel(t), module: t.module || t._modName, host: h, status, changed: !!res.changed, item: itemLabel === undefined ? null : itemLabel, result: reg, handler: !!t._handler, check: this.check });
    return { _registered: reg, status };
  }
  flushHandlers(play, hosts) {
    const handlers = play._handlers || [];
    for (const hd of handlers) {
      const hname = this.taskLabel(hd); const plain = hd.name !== undefined ? String(hd.name) : ''; const listen = simanListArg(hd.listen).map(String);
      const who = hosts.filter(h => (this.notified[h] || []).some(n => n === plain || n === hname || listen.includes(n)) && !this.failed.has(h) && !this.unreachable.has(h));
      if (!who.length) continue;
      this.runTask(hd, play, who);
      who.forEach(h => { this.notified[h] = (this.notified[h] || []).filter(n => !(n === plain || n === hname || listen.includes(n))); });
    }
  }
  printRecap() {
    this.print(simanBanner('PLAY RECAP'));
    const hosts = Object.keys(this.stats).sort();
    for (const h of hosts) { const s = this.stats[h]; this.print(`${h.padEnd(26)} : ${['ok', 'changed', 'unreachable', 'failed', 'skipped', 'rescued', 'ignored'].map(k => `${k}=${String(s[k]).padEnd(4)}`).join(' ')}`); }
    this.print('');
  }
  exitCode() { if (Object.values(this.stats).some(s => s.failed)) return 2; if (Object.values(this.stats).some(s => s.unreachable)) return 4; return 0; }
}
function simanOmit(v, token) {
  if (Array.isArray(v)) return v.map(x => simanOmit(x, token));
  if (simanIsPlainObj(v)) { const o = {}; Object.keys(v).forEach(k => { if (v[k] !== token) o[k] = simanOmit(v[k], token); }); return o; }
  return v;
}
function simanWhere(file, src, line) { return `\n\nThe error appears to be in '${file}': line ${line || 1}, column ${line && src ? ((src.split('\n')[line - 1] || '').search(/\S/) + 1) : 1}, but may\nbe elsewhere in the file depending on the exact syntax problem.`; }
function simanOffending(src, line) { const ls = (src || '').split('\n'); const l = ls[line - 1] || ''; const prev = line > 1 ? ls[line - 2] + '\n' : ''; return `${prev}${l}\n${' '.repeat(Math.max(0, l.search(/\S/)))}^ here`; }
function simanLineOf(src, needle) { const ls = (src || '').split('\n'); const i = ls.findIndex(l => l.includes(String(needle))); return i < 0 ? 1 : i + 1; }
function simanLineOfItem(src, idx, raw) {
  /* idx'inci ust seviye "- " ogesinin satiri, task adi varsa adla bulur */
  const ls = (src || '').split('\n');
  if (raw && raw.name !== undefined) { const i = ls.findIndex(l => /^\s*-?\s*name:\s*/.test(l) && l.includes(String(raw.name))); if (i >= 0) return i + 1; }
  let n = -1; let minIndent = null;
  for (let i = 0; i < ls.length; i++) { const m = /^(\s*)- /.exec(ls[i]); if (!m) continue; if (minIndent === null) minIndent = m[1].length; if (m[1].length !== minIndent) continue; n++; if (n === idx) return i + 1; }
  return 1;
}

/* ---------- komut satiri ---------- */
LAB.ansible = { last: null, history: [], version: SIMAN_VERSION };
function simanParseCli(args, spec) {
  /* spec: { valued: ['-i','--inventory', ...], flags: [...] } ; -vvv sayilir */
  const o = { inv: [], extra: [], tags: [], skipTags: [], verbosity: 0, rest: [], flags: new Set(), vals: {} };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (/^-v+$/.test(a)) { o.verbosity += a.length - 1; continue; }
    if (a === '--verbose') { o.verbosity++; continue; }
    let key = a, val = null; const eq = a.indexOf('=');
    if (a.startsWith('--') && eq > 0) { key = a.slice(0, eq); val = a.slice(eq + 1); }
    const need = () => (val !== null ? val : args[++i]);
    if (key === '-i' || key === '--inventory' || key === '--inventory-file') { o.inv.push(need()); continue; }
    if (key === '-e' || key === '--extra-vars') { o.extra.push(need()); continue; }
    if (key === '-t' || key === '--tags') { o.tags.push(...need().split(',').map(s => s.trim()).filter(Boolean)); continue; }
    if (key === '--skip-tags') { o.skipTags.push(...need().split(',').map(s => s.trim()).filter(Boolean)); continue; }
    if (key === '-l' || key === '--limit') { o.vals.limit = need(); continue; }
    if (key === '-m' || key === '--module-name') { o.vals.module = need(); continue; }
    if (key === '-a' || key === '--args') { o.vals.args = need(); continue; }
    if (key === '--vault-password-file' || key === '--vault-pass-file') { o.vals.vaultFile = need(); continue; }
    if (key === '--vault-id') { const v = need(); o.vals.vaultFile = v.includes('@') ? v.split('@')[1] : v; if (/@prompt$/.test(v)) o.flags.add('--ask-vault-pass'); continue; }
    if (key === '-u' || key === '--user') { o.vals.user = need(); continue; }
    if (key === '-f' || key === '--forks') { need(); continue; }
    if (key === '-c' || key === '--connection') { o.vals.connection = need(); continue; }
    if (key === '--start-at-task') { o.vals.startAt = need(); continue; }
    if (key === '-M' || key === '--module-path' || key === '--private-key' || key === '--key-file' || key === '-T' || key === '--timeout' || key === '--become-user' || key === '--become-method' || key === '--ssh-common-args' || key === '--ssh-extra-args' || key === '--scp-extra-args' || key === '--sftp-extra-args' || key === '--name' || key === '--vault-id-x' || key === '-B' || key === '-P' || key === '--output' || key === '--host' || key === '--graph-x' || key === '--encrypt-vault-id' || key === '--profile' || key === '-p' || key === '--playbook-dir' || key === '--new-vault-password-file' || key === '--new-vault-id' || key === '--stdin-name') { o.vals[key.replace(/^-+/, '')] = need(); continue; }
    if (a.startsWith('-') && a.length > 1) { o.flags.add(key); if (val !== null) o.vals[key.replace(/^-+/, '')] = val; continue; }
    o.rest.push(a);
  }
  return o;
}
function simanVaultPw(sh, o, cfg) {
  if (o.flags.has('--ask-vault-pass') || o.flags.has('-J') || o.flags.has('--ask-vault-password')) throw new SimanError('--ask-vault-pass bu lab\'da calismaz, terminal interaktif prompt desteklemiyor. Parolayi bir dosyaya yaz ve --vault-password-file dosya kullan');
  let f = o.vals.vaultFile || sh.env.ANSIBLE_VAULT_PASSWORD_FILE || simanCfgGet(cfg, 'defaults', 'vault_password_file');
  if (!f) return null;
  if (!f.startsWith('/') && !f.startsWith('~') && cfg && simanCfgGet(cfg, 'defaults', 'vault_password_file') === f && !o.vals.vaultFile) f = cfg.dir + '/' + f;
  const r = sh.readFile(f, 'ansible'); if (r.err) throw new SimanError(`The vault password file ${sh.resolve(f)} was not found`);
  return r.data.split('\n')[0];
}
function simanExtraVars(sh, list) {
  const out = {};
  for (const e of list) {
    const s = String(e).trim();
    if (s.startsWith('@')) { const r = sh.readFile(s.slice(1), 'ansible'); if (r.err) throw new SimanError(`Could not find or access '${s.slice(1)}' on the Ansible Controller.`); Object.assign(out, simanYamlLoad(r.data, s.slice(1)) || {}); continue; }
    if (s.startsWith('{') || s.startsWith('[')) { let v; try { v = JSON.parse(s); } catch (err) { v = simanYamlLoad(s, '<extra-vars>'); } if (simanIsPlainObj(v)) Object.assign(out, v); continue; }
    const kv = simanParseKv(s); delete kv._raw_params; Object.assign(out, kv);
  }
  return out;
}
function simanPrep(sh, o) {
  const cfg = simanReadCfg(sh);
  const warnings = []; const warn = m => { const l = `[WARNING]: ${m}`; if (!warnings.includes(l)) warnings.push(l); };
  const inv = simanLoadInventory(sh, o.inv, cfg, warn);
  const vaultPw = simanVaultPw(sh, o, cfg);
  const extra = simanExtraVars(sh, o.extra);
  if (o.flags.has('-k') || o.flags.has('--ask-pass') || o.flags.has('-K') || o.flags.has('--ask-become-pass')) throw new SimanError('-k ve -K bu lab\'da calismaz, parola prompt\'u yok. ansible_password degiskenini inventory ya da vault ile ver');
  return { cfg, inv, vaultPw, extra, warnings };
}
function simanFinish(sh, run, record) {
  LAB.ansible.last = record; LAB.ansible.history.push(record); if (LAB.ansible.history.length > 50) LAB.ansible.history.shift();
  const err = run.err.length ? run.err.join('\n') + '\n' : '';
  return { out: run.out.join('\n') + '\n', err, code: run.exitCode() };
}
function simanCmdPlaybook(args) {
  const sh = this;
  if (args.includes('--version')) return ok(simanVersionText(sh));
  if (!args.length || args.includes('-h') || args.includes('--help')) return ok('usage: ansible-playbook [-h] [--version] [-v] [-i INVENTORY] [-l SUBSET] [-e EXTRA_VARS] [-t TAGS] [--skip-tags SKIP_TAGS]\n                        [-C] [-D] [--list-tasks] [--list-hosts] [--syntax-check] [--vault-password-file FILE] [--start-at-task START_AT_TASK]\n                        playbook [playbook ...]\n\nRuns Ansible playbooks, executing the defined tasks on the targeted hosts.\n');
  const o = simanParseCli(args);
  if (!o.rest.length) return fail('ERROR! the following arguments are required: playbook\n', 2);
  let prep;
  try { prep = simanPrep(sh, o); } catch (e) { return fail('ERROR! ' + e.message + '\n', 5); }
  const run = new SimanRun(sh, { inv: prep.inv, extra: prep.extra, check: o.flags.has('-C') || o.flags.has('--check'), diff: o.flags.has('-D') || o.flags.has('--diff'), verbosity: o.verbosity, limit: o.vals.limit || null, tags: o.tags, skipTags: o.skipTags, vaultPw: prep.vaultPw, cfg: prep.cfg, startAt: o.vals.startAt || null });
  prep.warnings.forEach(w => run.err.push(w));
  const record = { cmd: 'ansible-playbook', args: args.slice(), playbooks: [], check: run.check, diff: run.diffMode, limit: run.limit, tags: run.tags, skipTags: run.skipTags, verbosity: run.verbosity, extra: prep.extra, recap: {}, tasks: [], plays: [], ok: false, output: '', time: LAB.util.now() };
  try {
    for (const pb of o.rest) {
      const abs = sh.resolve(pb); record.playbooks.push(abs); record.playbook = abs;
      if (o.flags.has('--syntax-check')) { run.loadPlaybook(pb).forEach(p => { run.normalizeTasks(p.tasks, p._file, p._src, p); run.normalizeTasks(p.handlers, p._file, p._src, p); simanListArg(p.roles).forEach(r => run.loadRole(r, p)); }); run.print(`\nplaybook: ${pb}`); continue; }
      if (o.flags.has('--list-tasks') || o.flags.has('--list-hosts') || o.flags.has('--list-tags')) { simanListPlaybook(run, pb, o); continue; }
      run.runPlaybook(pb);
    }
  } catch (e) {
    if (!(e instanceof SimanError)) throw e;
    record.error = e.message; record.recap = run.stats; record.tasks = run.record.tasks;
    LAB.ansible.last = record;
    if (run.out.length) return { out: run.out.join('\n') + '\nERROR! ' + e.message + '\n', err: run.err.length ? run.err.join('\n') + '\n' : '', code: 1 };
    return { out: '', err: (run.err.length ? run.err.join('\n') + '\n' : '') + 'ERROR! ' + e.message + '\n', code: 1 };
  }
  record.recap = simanDeepCopy(run.stats); record.tasks = run.record.tasks; record.plays = run.record.plays; record.ok = run.exitCode() === 0; record.output = run.out.join('\n');
  return simanFinish(sh, run, record);
}
function simanListPlaybook(run, pb, o) {
  const plays = run.loadPlaybook(pb);
  run.print(`\nplaybook: ${pb}`);
  plays.forEach((p, i) => {
    const tags = simanListArg(p.tags);
    run.print(`\n  play #${i + 1} (${Array.isArray(p.hosts) ? p.hosts.join(',') : p.hosts}): ${p.name !== undefined ? p.name : p.hosts}\tTAGS: [${tags.join(', ')}]`);
    if (o.flags.has('--list-hosts')) { const hs = run.playHosts(p); run.print(`    pattern: [${simanRepr(Array.isArray(p.hosts) ? p.hosts : [p.hosts]).slice(1, -1)}]`); run.print(`    hosts (${hs.length}):`); hs.forEach(h => run.print(`      ${h}`)); }
    if (o.flags.has('--list-tasks') || o.flags.has('--list-tags')) {
      const all = [];
      all.push(...run.normalizeTasks(p.pre_tasks, p._file, p._src, p, { tags }));
      for (const r of simanListArg(p.roles)) { const role = run.loadRole(r, p); all.push(...run.roleTasks(role, p)); }
      all.push(...run.normalizeTasks(p.tasks, p._file, p._src, p, { tags })); all.push(...run.normalizeTasks(p.post_tasks, p._file, p._src, p, { tags }));
      const flat = []; const walk = ts => ts.forEach(t => { if (t._block) { walk(t.block); walk(t.rescue); walk(t.always); } else flat.push(t); });
      walk(all);
      if (o.flags.has('--list-tasks')) { run.print('    tasks:'); flat.filter(t => run.tagOk(t)).forEach(t => run.print(`      ${run.taskLabel(t)}\tTAGS: [${(t.tags || []).join(', ')}]`)); }
      else { const ts = new Set(); flat.forEach(t => (t.tags || []).forEach(x => ts.add(x))); run.print(`      TASK TAGS: [${[...ts].sort().join(', ')}]`); }
    }
  });
}
function simanCmdAdhoc(args) {
  const sh = this;
  if (args.includes('--version')) return ok(simanVersionText(sh));
  if (!args.length || args.includes('-h') || args.includes('--help')) return ok('usage: ansible [-h] [--version] [-v] [-m MODULE_NAME] [-a MODULE_ARGS] [-i INVENTORY] [-l SUBSET] [-e EXTRA_VARS] [-C] [-D] [-o] [--list-hosts]\n               pattern\n\nDefine and run a single task \'playbook\' against a set of hosts\n');
  const o = simanParseCli(args);
  if (!o.rest.length) return fail('ERROR! the following arguments are required: pattern\n', 2);
  const pattern = o.rest[0];
  let prep; try { prep = simanPrep(sh, o); } catch (e) { return fail('ERROR! ' + e.message + '\n', 5); }
  const run = new SimanRun(sh, { inv: prep.inv, extra: prep.extra, check: o.flags.has('-C') || o.flags.has('--check'), diff: o.flags.has('-D') || o.flags.has('--diff'), verbosity: o.verbosity, limit: o.vals.limit || null, vaultPw: prep.vaultPw, cfg: prep.cfg });
  prep.warnings.forEach(w => run.err.push(w));
  let hosts = simanMatchPattern(prep.inv, pattern, []);
  if (run.limit) { const lim = simanMatchPattern(prep.inv, run.limit, hosts); hosts = hosts.filter(h => lim.includes(h)); }
  if (!hosts.length) { if (!Object.keys(prep.inv.hosts).length && pattern !== 'localhost') run.err.push("[WARNING]: provided hosts list is empty, only localhost is available. Note that the implicit localhost does not match 'all'"); else run.err.push(`[WARNING]: Could not match supplied host pattern, ignoring: ${pattern}`); if (o.flags.has('--list-hosts')) run.print('  hosts (0):'); return { out: run.out.join('\n') + (run.out.length ? '\n' : ''), err: run.err.join('\n') + '\n', code: 0 }; }
  if (o.flags.has('--list-hosts')) { run.print(`  hosts (${hosts.length}):`); hosts.forEach(h => run.print(`    ${h}`)); return ok(run.out.join('\n') + '\n'); }
  const modName = o.vals.module || 'command';
  const mod = simanResolveModule(modName);
  if (!mod) return fail(`ERROR! The module ${modName} was not found in configured module paths\n`, 1);
  const argStr = o.vals.args || '';
  const modArgs = /^(command|shell|raw)$/.test(mod.short) ? (() => { const kv = simanParseKv(argStr); const raw = kv._raw_params; const known = {}; Object.keys(kv).forEach(k => { if (['chdir', 'creates', 'removes', 'cmd', '_raw_params'].includes(k)) known[k] = kv[k]; }); if (raw === undefined && !known.cmd) known._raw_params = argStr; else if (raw !== undefined) known._raw_params = Object.keys(kv).filter(k => !['chdir', 'creates', 'removes', 'cmd', '_raw_params'].includes(k)).map(k => `${k}=${kv[k]}`).concat([raw]).join(' '); return known; })() : simanParseKv(argStr);
  if (!/^(command|shell|raw)$/.test(mod.short) && modArgs._raw_params !== undefined) { const r = modArgs._raw_params; delete modArgs._raw_params; if (mod.short === 'debug') modArgs.msg = modArgs.msg === undefined ? r : modArgs.msg + ' ' + r; else if (mod.short === 'ios_command' && !modArgs.commands) modArgs.commands = r; }
  if (modArgs.commands !== undefined && typeof modArgs.commands === 'string') modArgs.commands = modArgs.commands.split(',').map(s => s.trim()).filter(Boolean);
  if (modArgs.lines !== undefined && typeof modArgs.lines === 'string') modArgs.lines = modArgs.lines.split(',').map(s => s.trim()).filter(Boolean);
  if (modArgs.parents !== undefined && typeof modArgs.parents === 'string') modArgs.parents = modArgs.parents.split(',').map(s => s.trim()).filter(Boolean);
  const play = { name: 'Ansible Ad-Hoc', hosts: pattern, _dir: sh.cwd, _file: '<adhoc>', _src: '', _hosts: hosts, _hostsAll: hosts, _handlers: [], gather_facts: false, connection: o.vals.connection };
  const t = { name: modName, module: mod.short, _modName: modName, _fqcn: mod.fqcn, _fn: mod.fn, args: modArgs, when: [], tags: [], _file: '<adhoc>', _src: '', _dir: sh.cwd, _line: 1 };
  const record = { cmd: 'ansible', args: args.slice(), pattern, module: mod.short, moduleArgs: modArgs, hosts, results: {}, ok: true, check: run.check, time: LAB.util.now() };
  const outLines = [];
  for (const h of hosts) {
    const r = run.runTaskOnHost(t, play, h, {});
    const reg = r && r._registered ? r._registered : { failed: true, msg: 'unknown' };
    record.results[h] = reg;
    const clean = Object.assign({}, reg); delete clean.failed;
    const oneLine = o.flags.has('-o') || o.flags.has('--one-line');
    const dump = v => (oneLine ? simanJsonInline(v) : simanJsonPretty(v));
    const isCmd = /^(command|shell|raw)$/.test(mod.short) && reg.rc !== undefined;
    if (reg.unreachable) { outLines.push(`${h} | UNREACHABLE! => ${dump(clean)}`); record.ok = false; }
    else if (reg.failed && isCmd) { outLines.push(`${h} | FAILED | rc=${reg.rc} >>\n${[reg.stdout, reg.stderr, reg.msg].filter(Boolean).join('\n')}`); record.ok = false; }
    else if (reg.failed) { outLines.push(`${h} | FAILED! => ${dump(clean)}`); record.ok = false; }
    else if (reg.skipped) outLines.push(`${h} | SKIPPED`);
    else if (isCmd) outLines.push(`${h} | ${reg.changed ? 'CHANGED' : 'SUCCESS'} | rc=${reg.rc} >>\n${[reg.stdout, reg.stderr].filter(Boolean).join('\n')}`);
    else { delete clean.failed; outLines.push(`${h} | ${reg.changed ? 'CHANGED' : 'SUCCESS'} => ${dump(clean)}`); }
  }
  run.out = run.out.filter(l => /^(---|\+\+\+|@@|[-+ ])/.test(l) && run.diffMode).concat(outLines);
  LAB.ansible.last = record; LAB.ansible.history.push(record);
  return { out: run.out.join('\n') + '\n', err: run.err.length ? run.err.join('\n') + '\n' : '', code: record.ok ? 0 : (Object.values(record.results).some(r => r.unreachable) ? 4 : 2) };
}
function simanVersionText(sh) { const cfg = simanReadCfg(sh); return `ansible [core ${SIMAN_VERSION}]\n  config file = ${cfg ? cfg.path : 'None'}\n  configured module search path = ['/home/burak/.ansible/plugins/modules', '/usr/share/ansible/plugins/modules']\n  ansible python module location = /usr/lib/python3/dist-packages/ansible\n  ansible collection location = /home/burak/.ansible/collections:/usr/share/ansible/collections\n  executable location = /usr/bin/ansible\n  python version = 3.12.3 (main, Sep 11 2024, 14:17:37) [GCC 13.2.0] (/usr/bin/python3)\n  jinja version = 3.1.2\n  libyaml = True\n`; }
function simanCmdInventory(args) {
  const sh = this;
  if (args.includes('--version')) return ok(simanVersionText(sh));
  const o = simanParseCli(args);
  if (!o.flags.has('--list') && !o.flags.has('--graph') && !o.vals.host && !o.flags.has('--host')) return fail('ERROR! No action selected, at least one of --host, --graph or --list needs to be specified.\n', 1);
  let prep; try { prep = simanPrep(sh, o); } catch (e) { return fail('ERROR! ' + e.message + '\n', 5); }
  const inv = prep.inv; const run = new SimanRun(sh, { inv, extra: prep.extra, vaultPw: prep.vaultPw, cfg: prep.cfg });
  const errTxt = prep.warnings.length ? prep.warnings.join('\n') + '\n' : '';
  const hv = h => { const v = run.hostVars(h, null, null); const o2 = {}; Object.keys(v).forEach(k => { if (['ansible_managed', 'inventory_hostname', 'inventory_hostname_short', 'hostvars', 'groups', 'group_names', 'omit', 'ansible_check_mode', 'ansible_diff_mode', 'ansible_verbosity', 'ansible_version', 'ansible_facts', 'playbook_dir', 'inventory_dir', 'inventory_file', 'ansible_play_name', 'play_hosts', 'ansible_play_hosts', 'ansible_play_hosts_all', 'ansible_play_batch', 'ansible_run_tags', 'ansible_skip_tags', 'ansible_config_file', 'ansible_inventory_sources', 'ansible_limit'].includes(k)) return; if (k === 'ansible_host' && v[k] === h && !(inv.hosts[h] && inv.hosts[h].vars.ansible_host)) return; o2[k] = v[k]; }); return simanVaultMask(o2); };
  const yamlOut = o.flags.has('-y') || o.flags.has('--yaml');
  if (o.vals.host || o.flags.has('--host')) { const h = o.vals.host || o.rest[0]; if (!inv.hosts[h] && h !== 'localhost') return fail(`[WARNING]: Could not match supplied host pattern, ignoring: ${h}\nERROR! Could not match supplied host pattern, ignoring: ${h}\n`, 1); const v = hv(h); return { out: yamlOut ? simanYamlDump(v) : JSON.stringify(v, null, 4) + '\n', err: errTxt, code: 0 }; }
  const pattern = o.rest[0] || 'all';
  if (o.flags.has('--graph')) {
    const out = [];
    const walk = (g, depth) => { const pre = depth === 0 ? '' : '  |'.repeat(depth - 1) + '  |--'; out.push(`${pre}@${g}:`); const grp = inv.groups[g]; const hp = '  |'.repeat(depth) + '  |--'; grp.children.filter(c => inv.groups[c]).forEach(c => walk(c, depth + 1)); grp.hosts.forEach(h => { out.push(`${hp}${h}`); if (o.flags.has('--vars')) Object.entries(hv(h)).forEach(([k, v]) => out.push(`${'  |'.repeat(depth + 1)}  |--{${k} = ${JSON.stringify(v)}}`)); }); };
    walk(inv.groups[pattern] ? pattern : 'all', 0);
    return { out: out.join('\n') + '\n', err: errTxt, code: 0 };
  }
  const data = { _meta: { hostvars: {} } };
  const all = simanAllHosts(inv, 'all'); all.forEach(h => { data._meta.hostvars[h] = hv(h); });
  Object.keys(inv.groups).sort().forEach(g => { const grp = inv.groups[g]; const e = {}; if (grp.hosts.length) e.hosts = grp.hosts.slice(); if (grp.children.length) e.children = grp.children.filter(c => inv.groups[c]).slice(); if (Object.keys(grp.vars).length && g !== 'all') e.vars = simanVaultMask(grp.vars); if (g === 'all') { e.children = grp.children.filter(c => inv.groups[c]).slice(); if (!e.children.includes('ungrouped')) e.children.push('ungrouped'); } if (Object.keys(e).length || g === 'ungrouped') data[g] = e; });
  if (!data.ungrouped) data.ungrouped = {};
  if (yamlOut) { const y = { all: { children: {} } }; const build = g => { const grp = inv.groups[g]; const e = {}; if (grp.hosts.length) { e.hosts = {}; grp.hosts.forEach(h => { e.hosts[h] = hv(h); }); } const ch = grp.children.filter(c => inv.groups[c]); if (ch.length) { e.children = {}; ch.forEach(c => { e.children[c] = build(c); }); } if (Object.keys(grp.vars).length) e.vars = grp.vars; return e; }; y.all = build('all'); return { out: simanYamlDump(y), err: errTxt, code: 0 }; }
  if (o.flags.has('--export')) { Object.keys(inv.groups).forEach(g => { if (data[g] && Object.keys(inv.groups[g].vars).length) data[g].vars = simanVaultMask(inv.groups[g].vars); }); }
  if (o.vals.output) { sh.writeFile(o.vals.output, JSON.stringify(data, null, 4) + '\n', false, 'ansible-inventory'); return ok(''); }
  return { out: JSON.stringify(data, null, 4) + '\n', err: errTxt, code: 0 };
}
function simanVaultMask(v) { if (Array.isArray(v)) return v.map(simanVaultMask); if (v && typeof v === 'object') { if (v.__vault) return { __ansible_vault: v.__vault }; const o = {}; Object.keys(v).forEach(k => { o[k] = simanVaultMask(v[k]); }); return o; } return v; }
function simanCmdVault(args, stdin) {
  const sh = this;
  const sub = args[0];
  const usage = 'usage: ansible-vault [-h] [--version] [-v] {create,decrypt,edit,view,encrypt,encrypt_string,rekey} ...\n\nencryption/decryption utility for Ansible data files\n\n  encrypt_string --vault-password-file FILE [--name VAR] [STRING]\n  encrypt --vault-password-file FILE dosya\n  decrypt --vault-password-file FILE dosya\n  view --vault-password-file FILE dosya\n';
  if (!sub || sub === '-h' || sub === '--help') return ok(usage);
  if (sub === '--version') return ok(simanVersionText(sh));
  const o = simanParseCli(args.slice(1));
  const cfg = simanReadCfg(sh);
  let pw; try { pw = simanVaultPw(sh, o, cfg); } catch (e) { return fail('ERROR! ' + e.message + '\n', 5); }
  if (sub === 'create' || sub === 'edit' || sub === 'rekey') return fail(`ERROR! ansible-vault ${sub} bu lab'da calismaz, editor prompt'u yok. Dosyayi nano ile yaz, sonra ansible-vault encrypt ile sifrele\n`, 1);
  if (!pw) return fail('ERROR! A vault password must be specified to encrypt data. Parolayi bir dosyaya yaz ve --vault-password-file dosya kullan, --ask-vault-pass bu lab\'da interaktif olamaz\n', 5);
  if (sub === 'encrypt_string') {
    let secret = o.rest.length ? o.rest.join(' ') : null;
    if (secret === null && o.flags.has('--stdin-name')) secret = (stdin || '').replace(/\n$/, '');
    if (secret === null) { if (stdin != null && stdin !== '') secret = stdin.replace(/\n$/, ''); else return fail('ERROR! Sifrelenecek metni arguman olarak ver, ornek ansible-vault encrypt_string --vault-password-file vault.pass \'Gizli123\' --name ios_password\n', 1); }
    const name = o.vals.name || o.vals['stdin-name'];
    const enc = simanVaultEncrypt(secret, pw);
    const body = enc.split('\n').filter(Boolean).map(l => '          ' + l).join('\n');
    const out = (name ? `${name}: ` : '') + '!vault |\n' + body + '\n';
    return ok(out + (name ? '' : '') + 'Encryption successful\n');
  }
  const file = o.rest[0]; if (!file) return fail(`ERROR! ansible-vault ${sub} icin dosya adi gerekli\n`, 1);
  const r = sh.readFile(file, 'ansible-vault'); if (r.err) return fail(`ERROR! The vault file ${file} was not found\n`, 1);
  if (sub === 'encrypt') { if (simanIsVaultFile(r.data)) return fail(`ERROR! input is already encrypted\n`, 1); sh.writeFile(file, simanVaultEncrypt(r.data, pw), false, 'ansible-vault'); return { out: '', err: 'Encryption successful\n', code: 0 }; }
  if (sub === 'decrypt' || sub === 'view') {
    if (!simanIsVaultFile(r.data)) return fail('ERROR! input is not vault encrypted data for ' + file + '\n', 1);
    const d = simanVaultDecrypt(r.data, pw); if (d.err) return fail('ERROR! ' + d.err + '\n', 1);
    if (sub === 'view') return ok(d.data.endsWith('\n') ? d.data : d.data + '\n');
    sh.writeFile(o.vals.output || file, d.data, false, 'ansible-vault'); return { out: '', err: 'Decryption successful\n', code: 0 };
  }
  return fail(usage, 2);
}
function simanCmdConfig(args) {
  const sh = this; const sub = args[0];
  if (!sub || sub === '-h' || sub === '--help') return ok('usage: ansible-config [-h] [--version] [-v] {list,dump,view,init} ...\n');
  const cfg = simanReadCfg(sh);
  if (sub === 'view') { if (!cfg) return fail('ERROR! Config file not found; none found in /home/burak/ansible.cfg, ~/.ansible.cfg, /etc/ansible/ansible.cfg\n'); return ok(sh.node(cfg.path).d); }
  const defaults = { DEFAULT_HOST_LIST: ['/etc/ansible/hosts'], HOST_KEY_CHECKING: true, DEFAULT_ROLES_PATH: ['/home/burak/.ansible/roles', '/usr/share/ansible/roles', '/etc/ansible/roles'], DEFAULT_FORKS: 5, DEFAULT_GATHERING: 'implicit', DEFAULT_TIMEOUT: 10, DEFAULT_VAULT_PASSWORD_FILE: null, DEFAULT_STDOUT_CALLBACK: 'default', RETRY_FILES_ENABLED: false, DEPRECATION_WARNINGS: true, INTERPRETER_PYTHON: 'auto', DEFAULT_REMOTE_USER: null, DEFAULT_LOG_PATH: null, ANSIBLE_NOCOWS: false, PERSISTENT_COMMAND_TIMEOUT: 30, PERSISTENT_CONNECT_TIMEOUT: 30 };
  const map = { inventory: 'DEFAULT_HOST_LIST', host_key_checking: 'HOST_KEY_CHECKING', roles_path: 'DEFAULT_ROLES_PATH', forks: 'DEFAULT_FORKS', gathering: 'DEFAULT_GATHERING', timeout: 'DEFAULT_TIMEOUT', vault_password_file: 'DEFAULT_VAULT_PASSWORD_FILE', stdout_callback: 'DEFAULT_STDOUT_CALLBACK', retry_files_enabled: 'RETRY_FILES_ENABLED', deprecation_warnings: 'DEPRECATION_WARNINGS', interpreter_python: 'INTERPRETER_PYTHON', remote_user: 'DEFAULT_REMOTE_USER', log_path: 'DEFAULT_LOG_PATH', nocows: 'ANSIBLE_NOCOWS', command_timeout: 'PERSISTENT_COMMAND_TIMEOUT', connect_timeout: 'PERSISTENT_CONNECT_TIMEOUT' };
  const vals = {}; const src = {};
  Object.keys(defaults).forEach(k => { vals[k] = defaults[k]; src[k] = 'default'; });
  if (cfg) Object.entries(cfg.sections).forEach(([sec, kv]) => Object.entries(kv).forEach(([k, v]) => { const K = map[k]; if (!K) return; let val = v; if (/^(true|false|yes|no)$/i.test(v)) val = simanBool(v); else if (/^\d+$/.test(v)) val = Number(v); if (K === 'DEFAULT_HOST_LIST' || K === 'DEFAULT_ROLES_PATH') val = String(v).split(/[,:]/).map(s => s.trim()).filter(Boolean).map(s => (s.startsWith('/') ? s : cfg.dir + '/' + s)); vals[K] = val; src[K] = cfg.path; }));
  const repr = v => (v === null ? 'None' : typeof v === 'boolean' ? (v ? 'True' : 'False') : Array.isArray(v) ? '[' + v.map(x => `'${x}'`).join(', ') + ']' : typeof v === 'string' ? v : String(v));
  if (sub === 'dump') { const only = args.includes('--only-changed'); return ok(Object.keys(vals).sort().filter(k => !only || src[k] !== 'default').map(k => `${k}(${src[k]}) = ${repr(vals[k])}`).join('\n') + '\n'); }
  if (sub === 'list') return ok(Object.keys(map).map(k => `${map[k]}:\n  description: ${k} ayari\n  ini:\n  - key: ${k}\n    section: defaults\n  env:\n  - name: ANSIBLE_${k.toUpperCase()}`).join('\n') + '\n');
  if (sub === 'init') return ok('[defaults]\n;inventory=/etc/ansible/hosts\n;host_key_checking=True\n;roles_path=~/.ansible/roles:/usr/share/ansible/roles:/etc/ansible/roles\n;vault_password_file=\n;interpreter_python=auto\n\n[persistent_connection]\n;command_timeout=30\n;connect_timeout=30\n');
  return fail(`ansible-config: error: argument action: invalid choice: '${sub}' (choose from 'list', 'dump', 'view', 'init')\n`, 2);
}
const SIMAN_DOCS = {
  ping: ['ansible.builtin.ping', 'Try to connect to host, verify a usable python and return pong on success', { data: 'Data to return for the ping return value. If this parameter is set to crash, the module will cause an exception.' }, '- name: Test connectivity\n  ansible.builtin.ping:'],
  debug: ['ansible.builtin.debug', 'Print statements during execution', { msg: 'The customized message that is printed. If omitted, prints a generic message.', var: 'A variable name to debug. Mutually exclusive with the msg option.', verbosity: 'A number that controls when the debug is run, if you set to 3 it will only run debug when -vvv or above.' }, '- name: Print the gateway for each host\n  ansible.builtin.debug:\n    msg: System {{ inventory_hostname }} has gateway {{ ansible_default_ipv4.gateway }}\n\n- ansible.builtin.debug:\n    var: result.stdout_lines'],
  set_fact: ['ansible.builtin.set_fact', 'Set host variable(s) and fact(s)', { key_value: 'The set_fact module takes key=value pairs or variables as arguments', cacheable: 'This boolean converts the variable into an actual fact which will also be added to the fact cache.' }, '- name: Setting host facts using key value pairs\n  ansible.builtin.set_fact:\n    one_fact: something\n    other_fact: "{{ local_var }}"'],
  assert: ['ansible.builtin.assert', 'Asserts given expressions are true', { that: '(=) A list of string expressions of the same form that can be passed to the when statement.', fail_msg: 'The customized message used for a failing assertion.', success_msg: 'The customized message used for a successful assertion.', quiet: 'Set this to yes to avoid verbose output.' }, '- ansible.builtin.assert:\n    that:\n      - "ansible_net_version is version(\'17.9\', \'>=\')"\n      - "\'MGMT\' in vlan_output.stdout[0]"\n    fail_msg: compliance failed\n    success_msg: all good'],
  fail: ['ansible.builtin.fail', 'Fail with custom message', { msg: 'The customized message used for failing execution.' }, '- ansible.builtin.fail:\n    msg: The system may not be provisioned according to the CMDB status.\n  when: cmdb_status != "to-be-staged"'],
  command: ['ansible.builtin.command', 'Execute commands on targets', { cmd: 'The command to run.', chdir: 'Change into this directory before running the command.', creates: 'A filename or glob pattern. If a matching file already exists, this step will not be run.', removes: 'A filename or glob pattern. If a matching file exists, this step will be run.', free_form: 'The command module takes a free form string as a parameter.' }, '- name: Return motd to registered var\n  ansible.builtin.command: cat /etc/motd\n  register: mymotd\n  changed_when: false'],
  shell: ['ansible.builtin.shell', 'Execute shell commands on targets', { cmd: 'The command to run followed by optional arguments.', chdir: 'Change into this directory before running the command.', creates: 'A filename, when it already exists, this step will not be run.', executable: 'Change the shell used to execute the command.' }, '- name: Count vlans in a report\n  ansible.builtin.shell: grep -c VLAN report.txt | tee count.txt\n  args:\n    chdir: /home/burak/ansible'],
  copy: ['ansible.builtin.copy', 'Copy files to remote locations', { src: 'Local path to a file to copy to the remote server.', content: 'When used instead of src, sets the contents of a file directly to the specified value.', dest: '(=) Remote absolute path where the file should be copied to.', mode: 'The permissions of the destination file or directory.', backup: 'Create a backup file including the timestamp information.' }, '- name: Write a report\n  ansible.builtin.copy:\n    content: "{{ report_text }}"\n    dest: /home/burak/ansible/report.txt\n    mode: "0644"\n  delegate_to: localhost'],
  file: ['ansible.builtin.file', 'Manage files and file properties', { path: '(=) Path to the file being managed.', state: 'absent, directory, file, touch (link ve hard bu lab\'da yok)', mode: 'The permissions the resulting filesystem object should have.' }, '- name: Create a directory\n  ansible.builtin.file:\n    path: /home/burak/ansible/reports\n    state: directory\n    mode: "0755"'],
  lineinfile: ['ansible.builtin.lineinfile', 'Manage lines in text files', { path: '(=) The file to modify.', line: 'The line to insert/replace into the file.', regexp: 'The regular expression to look for in every line of the file.', state: 'Whether the line should be there or not. present, absent', insertafter: 'EOF, BOF or a regex', create: 'Create the file if it does not exist.' }, '- name: Ensure host_key_checking is off\n  ansible.builtin.lineinfile:\n    path: ansible.cfg\n    regexp: "^host_key_checking"\n    line: host_key_checking = False'],
  template: ['ansible.builtin.template', 'Template a file out to a target host', { src: '(=) Path of a Jinja2 formatted template on the Ansible controller. Searched in templates/ next to the playbook or role.', dest: '(=) Location to render the template to on the remote machine.', mode: 'The permissions the resulting file should have.' }, '- name: Render interface config\n  ansible.builtin.template:\n    src: interfaces.j2\n    dest: /home/burak/ansible/build/{{ inventory_hostname }}.cfg\n  delegate_to: localhost'],
  stat: ['ansible.builtin.stat', 'Retrieve file or file system status', { path: '(=) The full path of the file/object to get the facts of.' }, '- ansible.builtin.stat:\n    path: /home/burak/ansible/report.txt\n  register: st\n- ansible.builtin.debug:\n    msg: exists\n  when: st.stat.exists'],
  uri: ['ansible.builtin.uri', 'Interacts with webservices', { url: '(=) HTTP or HTTPS URL in the form (http|https)://host.domain[:port]/path', method: 'The HTTP method of the request or response. GET, POST, PUT, PATCH, DELETE', body: 'The body of the http request/response to the web service.', body_format: 'The serialization format of the body. json, form-urlencoded, raw', headers: 'Add custom HTTP headers to a request in the format of a YAML hash.', status_code: 'A list of valid, numeric, HTTP status codes that signifies success of the request.', return_content: 'Whether or not to return the body of the response as a content key in the dictionary result.', validate_certs: 'If no, SSL certificates will not be validated.', url_username: 'A username for the module to use for Digest, Basic or WSSE authentication.', url_password: 'A password for the module to use for Digest, Basic or WSSE authentication.' }, '- name: Get devices from the API\n  ansible.builtin.uri:\n    url: https://api.lab/v1/devices\n    method: GET\n    return_content: true\n    status_code: [200]\n  register: api\n- ansible.builtin.debug:\n    var: api.json'],
  ios_command: ['cisco.ios.ios_command', 'Module to run commands on remote devices', { commands: '(=) List of commands to send to the remote ios device over the configured provider. The resulting output from the command is returned.', wait_for: 'List of conditions to evaluate against the output of the command.', retries: 'Specifies the number of retries a command should by tried before it is considered failed.' }, '- name: run show version on remote devices\n  cisco.ios.ios_command:\n    commands: show version\n\n- name: run multiple commands\n  cisco.ios.ios_command:\n    commands:\n      - show version\n      - show vlan brief\n  register: output\n- ansible.builtin.debug:\n    var: output.stdout_lines'],
  ios_config: ['cisco.ios.ios_config', 'Module to manage configuration sections', { lines: 'The ordered set of commands that should be configured in the section. Alias commands.', parents: 'The ordered set of parents that uniquely identify the section or hierarchy the commands should be checked against.', src: 'Specifies the source path to the file that contains the configuration or configuration template to load.', before: 'The ordered set of commands to push on to the command stack if a change needs to be made.', after: 'The ordered set of commands to append to the end of the command stack if a change needs to be made.', match: 'line, strict, exact, none. Instructs the module on the way to perform the matching of the set of commands against the current device config.', save_when: 'always, never, modified, changed. When changed, the running-config is copied to startup-config only if the task made a change.', backup: 'This argument will cause the module to create a full backup of the current running-config in the backup folder.', diff_against: 'running, startup, intended' }, '- name: configure interface settings\n  cisco.ios.ios_config:\n    lines:\n      - description Uplink to core\n      - ip address 10.1.1.1 255.255.255.0\n    parents: interface GigabitEthernet2\n    save_when: changed\n\n- name: add vlans, idempotent on second run\n  cisco.ios.ios_config:\n    lines:\n      - name MGMT\n    parents: vlan 10'],
  ios_facts: ['cisco.ios.ios_facts', 'Module to collect facts from remote devices', { gather_subset: 'When supplied, this argument restricts the facts collected to a given subset. all, min, hardware, config, interfaces. Use ! to negate.', gather_network_resources: 'When supplied, this argument will restrict the facts collected to a given subset. vlans, interfaces, l3_interfaces, l2_interfaces, bgp_global, ntp_global, all' }, '- name: Gather facts\n  cisco.ios.ios_facts:\n    gather_subset: all\n    gather_network_resources:\n      - vlans\n      - interfaces\n- ansible.builtin.debug:\n    msg: "{{ ansible_net_hostname }} runs {{ ansible_net_version }}"'],
  ios_vlans: ['cisco.ios.ios_vlans', 'Resource module to configure VLANs', { config: 'A dictionary of VLANs options. vlan_id (=), name, state (active, suspend), shutdown', state: 'merged, replaced, overridden, deleted, gathered, rendered, parsed. Default merged.' }, '- name: Merge provided configuration with device configuration\n  cisco.ios.ios_vlans:\n    config:\n      - name: MGMT\n        vlan_id: 10\n      - name: USERS\n        vlan_id: 20\n    state: merged\n\n- name: Delete vlans\n  cisco.ios.ios_vlans:\n    config:\n      - vlan_id: 20\n    state: deleted'],
  ios_interfaces: ['cisco.ios.ios_interfaces', 'Resource module to configure interfaces', { config: 'A dictionary of interface options. name (=), description, enabled, mtu, speed, duplex', state: 'merged, replaced, overridden, deleted, gathered, rendered, parsed' }, '- name: Merge interface attributes\n  cisco.ios.ios_interfaces:\n    config:\n      - name: GigabitEthernet2\n        description: Uplink to core\n        enabled: true\n    state: merged'],
  ios_l3_interfaces: ['cisco.ios.ios_l3_interfaces', 'Resource module to configure L3 interfaces', { config: 'A dictionary of L3 interface options. name (=), ipv4 list of {address: a.b.c.d/p}', state: 'merged, replaced, overridden, deleted, gathered' }, '- cisco.ios.ios_l3_interfaces:\n    config:\n      - name: GigabitEthernet2\n        ipv4:\n          - address: 10.1.1.1/24\n    state: merged'],
  ios_system: ['cisco.ios.ios_system', 'Module to manage the system attributes', { hostname: 'Configure the device hostname parameter.' }, '- cisco.ios.ios_system:\n    hostname: branch-ams-01'],
  ios_user: ['cisco.ios.ios_user', 'Module to manage the aggregate of local users', { name: 'The username to be configured on the Cisco IOS device.', privilege: 'The privilege argument configures the privilege level of the user.', configured_password: 'The password to be configured on the Cisco IOS device.', state: 'present, absent', update_password: 'always, on_create' }, '- cisco.ios.ios_user:\n    name: netops\n    privilege: 15\n    configured_password: "{{ netops_password }}"\n    state: present'],
  ios_ntp_global: ['cisco.ios.ios_ntp_global', 'Resource module to configure NTP', { config: 'servers list of {server}', state: 'merged, replaced, overridden, deleted' }, '- cisco.ios.ios_ntp_global:\n    config:\n      servers:\n        - server: 10.0.50.10\n    state: merged'],
  include_tasks: ['ansible.builtin.include_tasks', 'Dynamically include a task list', { file: 'The name of the imported file is specified directly without any other option.', apply: 'Any valid task keyword, to apply to the included tasks.' }, '- ansible.builtin.include_tasks:\n    file: vlans.yml\n  when: vlans is defined'],
  import_tasks: ['ansible.builtin.import_tasks', 'Import a task list', { file: 'The name of the imported file is specified directly without any other option.' }, '- ansible.builtin.import_tasks: vlans.yml'],
  include_role: ['ansible.builtin.include_role', 'Load and execute a role', { name: '(=) The name of the role to be executed.', tasks_from: 'File to load from a role tasks/ directory.' }, '- ansible.builtin.include_role:\n    name: ios_base'],
  import_role: ['ansible.builtin.import_role', 'Import a role into a play', { name: '(=) The name of the role to be executed.' }, '- ansible.builtin.import_role:\n    name: ios_base'],
  include_vars: ['ansible.builtin.include_vars', 'Load variables from files, dynamically within a task', { file: 'The file name from which variables should be loaded.', dir: 'The directory name from which the variables should be loaded.', name: 'The name of a variable into which assign the included vars.' }, '- ansible.builtin.include_vars:\n    file: vlans.yml'],
  pause: ['ansible.builtin.pause', 'Pause playbook execution', { seconds: 'A positive number of seconds to pause for.', prompt: 'Optional text to use for the prompt message. Bu lab\'da prompt atlanir.' }, '- ansible.builtin.pause:\n    seconds: 5'],
  meta: ['ansible.builtin.meta', 'Execute Ansible actions', { free_form: 'flush_handlers, end_play, end_host, clear_host_errors, noop' }, '- ansible.builtin.meta: flush_handlers'],
  setup: ['ansible.builtin.setup', 'Gathers facts about remote hosts', { gather_subset: 'If supplied, restrict the additional facts collected to the given subset.' }, '- ansible.builtin.setup:'],
  blockinfile: ['ansible.builtin.blockinfile', 'Insert/update/remove a text block surrounded by marker lines', { path: '(=) The file to modify.', block: 'The text to insert inside the marker lines.', marker: 'The marker line template. {mark} will be replaced with BEGIN or END.', state: 'present, absent' }, '- ansible.builtin.blockinfile:\n    path: /home/burak/ansible/report.txt\n    block: |\n      vlan 10 MGMT\n      vlan 20 USERS'],
  slurp: ['ansible.builtin.slurp', 'Slurps a file from remote nodes', { src: '(=) The file on the remote system to fetch. This must be a file, not a directory.' }, '- ansible.builtin.slurp:\n    src: /home/burak/ansible/report.txt\n  register: r\n- ansible.builtin.debug:\n    msg: "{{ r.content | b64decode }}"'],
  raw: ['ansible.builtin.raw', 'Executes a low-down and dirty command', { free_form: 'The raw module takes a free form command to run.' }, '- ansible.builtin.raw: show version'],
  add_host: ['ansible.builtin.add_host', 'Add a host (and alternatively a group) to the ansible-playbook in-memory inventory', { name: '(=) The hostname/ip of the host to add to the inventory.', groups: 'The groups to add the hostname to.' }, '- ansible.builtin.add_host:\n    name: r2\n    groups: ios'],
  cli_command: ['ansible.netcommon.cli_command', 'Run a cli command on cli-based network devices', { command: '(=) The command to send to the remote network device.' }, '- ansible.netcommon.cli_command:\n    command: show version'],
  cli_config: ['ansible.netcommon.cli_config', 'Push text based configuration to network devices over network_cli', { config: 'The config to be pushed to the network device.' }, '- ansible.netcommon.cli_config:\n    config: |\n      vlan 30\n       name GUEST'],
};
function simanCmdDoc(args) {
  const sh = this;
  if (args.includes('--version')) return ok(simanVersionText(sh));
  if (args.includes('-l') || args.includes('--list')) { const fqcn = n => (SIMAN_DOCS[n] ? SIMAN_DOCS[n][0] : simanFqcn(n)); return ok(Object.keys(SIMAN_DOCS).sort().map(n => `${fqcn(n).padEnd(36)} ${SIMAN_DOCS[n][1]}`).join('\n') + '\n'); }
  const name = args.filter(a => !a.startsWith('-'))[0];
  if (!name) return ok('usage: ansible-doc [-h] [--version] [-v] [-l] [-s] [-t TYPE] [plugin ...]\n\nansible-doc -l  modulleri listeler\nansible-doc cisco.ios.ios_config\nansible-doc -s ansible.builtin.copy  kisa snippet\n');
  const short = name.replace(/^(ansible\.builtin|ansible\.legacy|cisco\.ios|ansible\.netcommon)\./, '');
  const d = SIMAN_DOCS[short];
  if (!d) return fail(`[WARNING]: module ${name} not found in: /home/burak/.ansible/plugins/modules:/usr/share/ansible/plugins/modules\nERROR! Bu lab\'da ${name} modulu yok. ansible-doc -l ile listeye bak\n`, 1);
  if (args.includes('-s') || args.includes('--snippet')) return ok(`- name: ${d[1]}\n  ${d[0]}:\n` + Object.keys(d[2]).map(k => `      ${k}:                 # ${d[2][k].slice(0, 60)}`).join('\n') + '\n');
  const opts = Object.entries(d[2]).map(([k, v]) => `        ${v.startsWith('(=)') ? '= ' : '- '}${k}\n            ${v.replace(/^\(=\) /, '')}\n`).join('\n');
  return ok(`> ${d[0].toUpperCase()}    (/usr/lib/python3/dist-packages/ansible_collections/${d[0].split('.').slice(0, 2).join('/')}/plugins/modules/${short}.py)\n\n        ${d[1]}\n\nOPTIONS (= is mandatory):\n\n${opts}\n\nAUTHOR: Ansible Core Team\n\nEXAMPLES:\n\n${d[3]}\n\n`);
}
function simanCmdGalaxy(args) {
  const sh = this; const a = args.slice();
  if (a.includes('--version')) return ok(simanVersionText(sh));
  if (a[0] === 'collection' && a[1] === 'install') { const names = a.slice(2).filter(x => !x.startsWith('-')); if (!names.length) return fail('ERROR! the following arguments are required: collection_name\n'); return ok('Starting galaxy collection install process\nProcess install dependency map\nStarting collection install process\n' + names.map(n => `'${n.includes(':') ? n : n + ':9.0.3'}' is already installed, skipping.`).join('\n') + '\n'); }
  if (a[0] === 'collection' && a[1] === 'list') return ok('\n# /usr/lib/python3/dist-packages/ansible_collections\nCollection                               Version\n---------------------------------------- -------\nansible.netcommon                        6.1.3  \nansible.utils                            4.1.0  \ncisco.ios                                9.0.3  \ncommunity.general                        9.4.0  \n');
  if (a[0] === 'role' && a[1] === 'list') return ok('# /home/burak/.ansible/roles\n');
  if (a[0] === 'role' && a[1] === 'install' || a[0] === 'install') return fail('ERROR! Bu lab cevrimdisi, galaxy\'den role indirilemez. ansible-galaxy init ile yerel role iskeleti olustur\n', 1);
  if ((a[0] === 'init') || (a[0] === 'role' && a[1] === 'init')) {
    const rest = a.slice(a[0] === 'init' ? 1 : 2); let initPath = null; const names = [];
    for (let i = 0; i < rest.length; i++) { if (rest[i] === '--init-path') initPath = rest[++i]; else if (rest[i].startsWith('--init-path=')) initPath = rest[i].split('=')[1]; else if (!rest[i].startsWith('-')) names.push(rest[i]); }
    if (!names.length) return fail('ERROR! the following arguments are required: role_name\n', 2);
    const name = names[0]; const base = sh.resolve((initPath ? initPath + '/' : '') + name);
    if (sh.node(base)) return fail(`ERROR! - the directory ${base} already exists.\nyou can use --force to re-initialize this directory, however\nthis is a destructive operation and will ruin the directory structure.\n`, 1);
    const short = name.split('/').pop();
    const files = { 'README.md': `Role Name\n=========\n\n${short} role'u. Branch router'lari icin temel konfigurasyon.\n\nRole Variables\n--------------\n\ndefaults/main.yml icindeki degiskenlere bak.\n\nExample Playbook\n----------------\n\n    - hosts: ios\n      roles:\n         - ${short}\n`, 'tasks/main.yml': `---\n# tasks file for ${short}\n`, 'handlers/main.yml': `---\n# handlers file for ${short}\n`, 'defaults/main.yml': `---\n# defaults file for ${short}\n`, 'vars/main.yml': `---\n# vars file for ${short}\n`, 'meta/main.yml': `galaxy_info:\n  author: burak\n  description: ${short}\n  license: MIT\n  min_ansible_version: "2.15"\n  galaxy_tags: []\ndependencies: []\n`, 'templates/.gitkeep': '', 'files/.gitkeep': '', 'tests/inventory': 'localhost\n\n', 'tests/test.yml': `---\n- hosts: localhost\n  remote_user: root\n  roles:\n    - ${short}\n` };
    for (const [p, c] of Object.entries(files)) { const abs = base + '/' + p; const dir = abs.split('/').slice(0, -1).join('/'); const parts = dir.split('/').filter(Boolean); let cur = sh.root; for (const x of parts) { if (!cur.c[x]) cur.c[x] = mkdir({}, 0o755, sh.user); cur = cur.c[x]; } if (p.endsWith('.gitkeep')) continue; sh.writeFile(abs, c, false, 'ansible-galaxy'); }
    return ok(`- Role ${name} was created successfully\n`);
  }
  return ok('usage: ansible-galaxy [-h] [--version] [-v] TYPE ...\n\n  ansible-galaxy collection install cisco.ios\n  ansible-galaxy collection list\n  ansible-galaxy init roles/ios_base\n');
}
function simanCmdLint(args) {
  const sh = this;
  if (args.includes('--version')) return ok('ansible-lint 24.9.2 using ansible-core:2.17.4 ansible-compat:24.9.1 ruamel-yaml:0.18.6 ruamel-yaml-clib:0.2.8\n');
  const files = args.filter(a => !a.startsWith('-'));
  let targets = files.length ? files : [];
  if (!targets.length) { const d = sh.node(sh.cwd); targets = Object.keys(d.c).filter(f => /\.(yml|yaml)$/.test(f) && !/^(inventory|group_vars|host_vars)/.test(f)); }
  const viol = []; const counts = {};
  const add = (rule, file, line, msg, detail, profile, tags) => { viol.push({ rule, file, line, msg, detail, profile, tags }); counts[rule] = counts[rule] || { n: 0, profile, tags }; counts[rule].n++; };
  for (const f of targets) {
    const r = sh.readFile(f, 'ansible-lint'); if (r.err) { add('load-failure[not-found]', f, 1, `File not found: ${f}`, '', 'min', 'core'); continue; }
    let data; try { data = simanYamlLoad(r.data, f); } catch (e) { add('load-failure[yaml]', f, 1, e.message.split('\n')[1] || e.message, '', 'min', 'core'); continue; }
    const src = r.data; const srcLines = src.split('\n');
    srcLines.forEach((l, i) => { if (/:\s+(yes|no|Yes|No|YES|NO|on|off)\s*$/.test(l) && !/^\s*#/.test(l)) add('yaml[truthy]', f, i + 1, 'Truthy value should be one of [false, true]', '', 'basic', 'formatting, yaml'); if (/\s+$/.test(l)) add('yaml[trailing-spaces]', f, i + 1, 'Trailing spaces', '', 'basic', 'formatting, yaml'); });
    if (!/^---/.test(src)) add('yaml[document-start]', f, 1, 'Missing document start "---"', '', 'basic', 'formatting, yaml');
    const walkTasks = (list, where) => {
      if (!Array.isArray(list)) return;
      list.forEach((t, i) => {
        if (!simanIsPlainObj(t)) return;
        const line = simanLineOfItem(src, i, t);
        if (t.block !== undefined) { walkTasks(t.block, where); walkTasks(t.rescue, where); walkTasks(t.always, where); return; }
        const modKeys = Object.keys(t).filter(k => !SIMAN_TASK_KEYS.has(k));
        const mod = modKeys[0]; if (!mod) return;
        const short = mod.replace(/^(ansible\.builtin|cisco\.ios|ansible\.netcommon)\./, '');
        const desc = `${where}: ${mod}` + (typeof t[mod] === 'string' ? ' ' + t[mod].slice(0, 40) : t.name ? '' : '');
        if (t.name === undefined || t.name === null || String(t.name).trim() === '') add('name[missing]', f, line, 'All tasks should be named.', desc, 'basic', 'idiom');
        else if (!/^[A-Z]/.test(String(t.name))) add('name[casing]', f, line, 'All names should start with an uppercase letter.', `${where}: ${t.name}`, 'moderate', 'idiom');
        if (!mod.includes('.') && !['block', 'include_tasks', 'import_tasks', 'include_role', 'import_role', 'meta', 'include_vars', 'set_fact', 'debug'].includes(mod) === false) { /* builtin keywords */ }
        if (!mod.includes('.')) add(/^ios_|^cli_/.test(mod) ? 'fqcn[action]' : 'fqcn[action-core]', f, line, /^ios_|^cli_/.test(mod) ? `Use FQCN for module actions, such \`cisco.ios.${mod}\`.` : `Use FQCN for builtin module actions (${mod}).`, /^ios_|^cli_/.test(mod) ? `Action \`${mod}\` is not FQCN.` : `Use \`ansible.builtin.${mod}\` or \`ansible.legacy.${mod}\` instead.`, 'basic', 'formatting');
        if (short === 'command' || short === 'shell') {
          const cmd = typeof t[mod] === 'string' ? t[mod] : (t[mod] && (t[mod].cmd || t[mod]._raw_params)) || '';
          if (t.changed_when === undefined && t.register === undefined) add('no-changed-when', f, line, 'Commands should not change things if nothing needs doing.', `${where}: ${t.name || mod}`, 'shared', 'command-shell, idempotency');
          const m = /^\s*(git|systemctl|service|apt|yum|pip|curl|wget|mkdir|cp|mv|rm|chmod|chown|touch|sed|lineinfile|tee)\b/.exec(String(cmd)); const map = { git: 'ansible.builtin.git', systemctl: 'ansible.builtin.systemd', service: 'ansible.builtin.service', apt: 'ansible.builtin.apt', yum: 'ansible.builtin.yum', pip: 'ansible.builtin.pip', curl: 'ansible.builtin.get_url or ansible.builtin.uri', wget: 'ansible.builtin.get_url or ansible.builtin.uri', mkdir: 'ansible.builtin.file', cp: 'ansible.builtin.copy', mv: 'ansible.builtin.copy', rm: 'ansible.builtin.file', chmod: 'ansible.builtin.file', chown: 'ansible.builtin.file', touch: 'ansible.builtin.file', sed: 'ansible.builtin.replace or ansible.builtin.lineinfile', tee: 'ansible.builtin.copy' };
          if (m) add('command-instead-of-module', f, line, `${m[1]} used in place of ${map[m[1]]} module`, `${where}: ${t.name || mod}`, 'basic', 'command-shell, idiom');
          if (short === 'shell' && !/[|&;<>$*`]/.test(String(cmd))) add('command-instead-of-shell', f, line, 'Use shell only when shell functionality is required.', `${where}: ${t.name || mod}`, 'basic', 'command-shell, idiom');
        }
        if ((short === 'copy' || short === 'template' || short === 'file') && simanIsPlainObj(t[mod]) && t[mod].mode === undefined && t[mod].state !== 'absent') add('risky-file-permissions', f, line, 'File permissions unset or incorrect.', `${where}: ${t.name || mod}`, 'safety', 'unpredictability');
        if (t.ignore_errors !== undefined && simanBool(t.ignore_errors)) add('ignore-errors', f, line, 'Use failed_when and specify error conditions instead of using ignore_errors.', `${where}: ${t.name || mod}`, 'shared', 'unpredictability');
        if (t.when !== undefined && /\{\{/.test(String(t.when))) add('no-jinja-when', f, line, 'No Jinja2 in when.', `${where}: ${t.name || mod}`, 'basic', 'deprecations');
        if (short === 'ios_command' && t.register === undefined) add('cisco.ios[command-unused]', f, line, 'ios_command ciktisi register ile saklanmazsa kaybolur.', `${where}: ${t.name || mod}`, 'basic', 'idiom');
      });
    };
    if (Array.isArray(data)) {
      data.forEach((p, i) => { if (!simanIsPlainObj(p)) return; if (p.hosts !== undefined) { if (p.name === undefined) add('name[play]', f, simanLineOfItem(src, i), 'All plays should be named.', `play: hosts=${p.hosts}`, 'basic', 'idiom'); walkTasks(p.tasks, 'Task/Handler'); walkTasks(p.pre_tasks, 'Task/Handler'); walkTasks(p.post_tasks, 'Task/Handler'); walkTasks(p.handlers, 'Task/Handler'); } else walkTasks([p], 'Task/Handler'); });
      if (data.length && data.every(x => simanIsPlainObj(x) && x.hosts === undefined)) walkTasks(data, 'Task/Handler');
    }
  }
  if (!viol.length) return ok(`Passed: 0 failure(s), 0 warning(s) on ${targets.length} files. Last profile that met the criteria: 'production'.\n`);
  viol.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  const warnRules = ['yaml[truthy]', 'name[casing]', 'risky-file-permissions', 'yaml[document-start]', 'yaml[trailing-spaces]', 'no-changed-when', 'cisco.ios[command-unused]'];
  const fatal = viol.filter(v => !warnRules.includes(v.rule)), warns = viol.filter(v => warnRules.includes(v.rule));
  const out = [];
  if (warns.length) { out.push(`WARNING  Listing ${warns.length} violation(s) that are not fatal`); warns.forEach(v => out.push(`${v.rule}: ${v.msg}\n${v.file}:${v.line}${v.detail ? ' ' + v.detail : ''}\n`)); }
  if (fatal.length) { out.push(`WARNING  Listing ${fatal.length} violation(s) that are fatal`); fatal.forEach(v => out.push(`${v.rule}: ${v.msg}\n${v.file}:${v.line}${v.detail ? ' ' + v.detail : ''}\n`)); }
  out.push('Read documentation for instructions on how to ignore specific rule violations.\n');
  out.push('                 Rule Violation Summary                  ');
  out.push(' count tag                         profile  rule associated tags');
  Object.keys(counts).sort().forEach(r => out.push(` ${String(counts[r].n).padStart(5)} ${r.padEnd(27)} ${String(counts[r].profile).padEnd(8)} ${counts[r].tags}`));
  out.push('');
  out.push(`${fatal.length ? 'Failed' : 'Passed'}: ${fatal.length} failure(s), ${warns.length} warning(s) on ${targets.length} files.` + (fatal.length ? '' : " Last profile that met the criteria: 'min'."));
  LAB.ansible.lint = { files: targets, violations: viol, fatal: fatal.length, warnings: warns.length };
  return { out: out.join('\n') + '\n', err: '', code: fatal.length ? 2 : 0 };
}
function simanDeviceGuard(fn) {
  return function (args, stdin) {
    if (!LAB.devices || !LAB.devices.r1) return fail('ansible: LAB.devices.r1 yok, sim-device.js yuklenmemis. Sayfayi yenile, sorun surerse index.html icinde sim-device.js sirasina bak\n', 1);
    return fn.call(this, args, stdin);
  };
}
registerExt({
  commands: {
    ansible: simanDeviceGuard(simanCmdAdhoc), 'ansible-playbook': simanDeviceGuard(simanCmdPlaybook), 'ansible-inventory': simanDeviceGuard(simanCmdInventory),
    'ansible-vault': simanCmdVault, 'ansible-config': simanCmdConfig, 'ansible-doc': simanCmdDoc, 'ansible-galaxy': simanCmdGalaxy, 'ansible-lint': simanCmdLint,
  },
  manual: {
    ansible: { d: "Ad hoc Ansible komutu, inventory'deki host'lara tek modul kosar. r1 ve r2 cisco.ios modulleriyle, localhost shell ile calisir", u: ['ansible pattern -m modul -a "args" [-i inventory] [-l limit] [-e k=v] [-C] [-D] [-v] [-o]', 'pattern: all, grup, host, r*, ios:!r2'], e: ['ansible all -i inventory.ini -m ping', 'ansible ios -m cisco.ios.ios_command -a "commands=\'show version\'"', 'ansible r1 -m cisco.ios.ios_config -a "lines=\'name MGMT\' parents=\'vlan 10\'"', 'ansible localhost -m debug -a "msg=hello"'] },
    'ansible-playbook': { d: 'Playbook calistirir. PLAY, TASK, RECAP ciktisi gercek Ansible ile ayni bicimde', u: ['ansible-playbook site.yml [-i inv] [-l host] [-t tag] [--skip-tags tag] [-C] [-D] [-v] [-e k=v]', '--list-tasks, --list-hosts, --syntax-check, --start-at-task "ad"', '--vault-password-file dosya, --ask-vault-pass bu lab\'da calismaz'], e: ['ansible-playbook site.yml', 'ansible-playbook site.yml --check --diff', 'ansible-playbook site.yml -t vlans -l r1 -v', 'ansible-playbook site.yml --vault-password-file vault.pass'] },
    'ansible-inventory': { d: 'Inventory\'yi grup ve host_vars ile birlikte gosterir', u: ['ansible-inventory -i inventory.ini --list', 'ansible-inventory -i inventory.ini --graph [--vars]', 'ansible-inventory -i inventory.ini --host r1', '-y yaml cikti'], e: ['ansible-inventory --graph', 'ansible-inventory --list | head -30', 'ansible-inventory --host r1'] },
    'ansible-vault': { d: 'Parola ve gizli degerleri sifreler. Parola dosyadan okunur, interaktif prompt yok', u: ['ansible-vault encrypt_string --vault-password-file vault.pass \'gizli\' --name ios_password', 'ansible-vault encrypt --vault-password-file vault.pass dosya.yml', 'ansible-vault view --vault-password-file vault.pass dosya.yml', 'ansible-vault decrypt --vault-password-file vault.pass dosya.yml'], e: ['echo Lab123 > vault.pass', "ansible-vault encrypt_string --vault-password-file vault.pass 'admin' --name ansible_password", 'ansible-playbook site.yml --vault-password-file vault.pass'] },
    'ansible-config': { d: 'Etkin ansible.cfg ayarlarini gosterir', u: ['ansible-config dump [--only-changed]', 'ansible-config view', 'ansible-config list', 'ansible-config init'], e: ['ansible-config dump --only-changed', 'ansible-config view'] },
    'ansible-doc': { d: 'Modul dokumantasyonu, parametreler ve ornekler', u: ['ansible-doc modul', 'ansible-doc -l', 'ansible-doc -s modul'], e: ['ansible-doc cisco.ios.ios_config', 'ansible-doc -l', 'ansible-doc -s ansible.builtin.template'] },
    'ansible-galaxy': { d: 'Collection ve role yonetimi. Lab cevrimdisi, init ile role iskeleti kurar', u: ['ansible-galaxy init roles/ad', 'ansible-galaxy collection install cisco.ios', 'ansible-galaxy collection list'], e: ['ansible-galaxy init roles/ios_base', 'ansible-galaxy collection list'] },
    'ansible-lint': { d: 'Playbook best practice kontrolu. name eksik, FQCN yok, command yerine modul gibi kurallar', u: ['ansible-lint [dosya.yml ...]'], e: ['ansible-lint site.yml', 'ansible-lint'] },
  },
  onReset: () => { LAB.ansible.last = null; LAB.ansible.history = []; LAB.ansible.lint = null; },
});
