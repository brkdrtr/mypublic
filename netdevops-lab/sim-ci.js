'use strict';
/* CI runner simulasyonu. GitHub Actions workflow'larini ve kucuk bir .gitlab-ci.yml alt kumesini sanal shell'de kosar.
   Komutlar, ci run [workflow] [--job j] [--event e] [--ref r] [--input k=v], act [-j job] [-W workflow] [event],
   gitlab-runner exec shell <job>. YAML, global jsyaml ile okunur. Son kosum LAB.ci.last icinde, missions-ci.js buradan dogrular. */

const SIMC_STATE = { last: null, runs: [], cache: {}, runNumber: 0, artifacts: [] };
LAB.ci = SIMC_STATE;

(function () {
  const H = '/home/burak';
  const SECRETS_FILE = H + '/.ci/secrets.env';
  const RUNNER_VERSION = '2.321.0';

  /* ---------- kucuk yardimcilar ---------- */
  const readText = (sh, abs) => { const n = sh.node(abs); return n && n.t === 'f' ? n.d : null; };
  const isDir = (sh, abs) => { const n = sh.node(abs); return !!(n && n.t === 'd'); };
  function mkdirp(sh, abs) {
    const parts = abs.split('/').filter(Boolean);
    let dir = sh.root;
    for (const p of parts) {
      if (!dir.c[p]) dir.c[p] = mkdir({}, 0o755, 'burak');
      dir = dir.c[p];
      if (dir.t !== 'd') return false;
    }
    return true;
  }
  function writeText(sh, abs, text) { mkdirp(sh, abs.slice(0, abs.lastIndexOf('/'))); const { dir, name } = sh.parent(abs); dir.c[name] = mkfile(text, 0o644, 'burak'); }
  function listFiles(sh, absDir, out, rel) {
    const n = sh.node(absDir); if (!n || n.t !== 'd') return out;
    for (const [k, ch] of Object.entries(n.c)) { const r = rel ? rel + '/' + k : k; if (ch.t === 'd') listFiles(sh, absDir + '/' + k, out, r); else out.push({ rel: r, abs: absDir + '/' + k, node: ch }); }
    return out;
  }
  function globRe(p) {
    let re = '^';
    for (let i = 0; i < p.length; i++) {
      const c = p[i];
      if (c === '*') { if (p[i + 1] === '*') { re += '.*'; i++; if (p[i + 1] === '/') i++; } else re += '[^/]*'; }
      else if (c === '?') re += '[^/]';
      else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(re + '$');
  }
  function matchFiles(sh, root, patterns) {
    const all = listFiles(sh, root, [], '');
    const out = [];
    for (let pat of patterns) {
      pat = pat.trim(); if (!pat) continue;
      const neg = pat.startsWith('!'); if (neg) pat = pat.slice(1);
      pat = pat.replace(/^\.\//, '').replace(/\/$/, '');
      const dirMatch = isDir(sh, root + '/' + pat);
      const re = globRe(dirMatch ? pat + '/**' : pat);
      for (const f of all) { if (re.test(f.rel)) { if (neg) { const i = out.indexOf(f); if (i >= 0) out.splice(i, 1); } else if (!out.includes(f)) out.push(f); } }
    }
    return out;
  }
  function hash(str, bits) {
    let h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0xdeadbeef, h4 = 0x9e3779b9;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = Math.imul(h2 + c, 2654435761) >>> 0; h3 = (Math.imul(h3 ^ (c << 5), 0x85ebca6b) + i) >>> 0; h4 = Math.imul(h4 ^ c ^ (h1 >>> 3), 0xc2b2ae35) >>> 0;
    }
    const parts = [h1, h2, h3, h4, h1 ^ h2, h3 ^ h4, (h1 + h3) >>> 0, (h2 + h4) >>> 0].map(x => (x >>> 0).toString(16).padStart(8, '0'));
    return parts.join('').slice(0, bits / 4);
  }
  const fmtDur = ms => ms < 1000 ? (ms / 1000).toFixed(1) + 's' : ms < 60000 ? (ms / 1000).toFixed(1) + 's' : Math.floor(ms / 60000) + 'm ' + Math.round((ms % 60000) / 1000) + 's';
  const pad = (s, n) => String(s).padEnd(n);
  const MARK = { success: '✓', failure: '✗', skipped: '⊘', waiting: '⏸', manual: '⏸', cancelled: '⊘' };

  function loadYaml(text) {
    if (typeof jsyaml === 'undefined') throw new Error('jsyaml yuklu degil, vendor/js-yaml.min.js eksik');
    return jsyaml.load(text, { schema: jsyaml.DEFAULT_SCHEMA });
  }
  function loadSecrets(sh) {
    const out = {}; const t = readText(sh, SECRETS_FILE);
    if (t) for (const raw of t.split('\n')) {
      const line = raw.trim(); if (!line || line.startsWith('#')) continue;
      const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line); if (!m) continue;
      let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
    out.GITHUB_TOKEN = out.GITHUB_TOKEN || 'ghs_' + hash('token' + SIMC_STATE.runNumber, 128);
    return out;
  }
  function findRoot(sh, hint) {
    if (hint) { const abs = sh.resolve(hint); const i = abs.indexOf('/.github/'); if (i > 0) return abs.slice(0, i); return abs.slice(0, abs.lastIndexOf('/')) || H; }
    let d = sh.cwd;
    while (d && d !== '/' && d !== H) { if (isDir(sh, d + '/.github/workflows') || sh.node(d + '/.gitlab-ci.yml')) return d; d = d.slice(0, d.lastIndexOf('/')) || '/'; }
    if (sh.cwd.startsWith(H + '/')) return H + '/' + sh.cwd.slice(H.length + 1).split('/')[0];
    return null;
  }

  /* ---------- ${{ }} ifade motoru ---------- */
  function tokenizeExpr(src) {
    const toks = []; let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "'") { let j = i + 1; let s = ''; while (j < src.length) { if (src[j] === "'") { if (src[j + 1] === "'") { s += "'"; j += 2; continue; } break; } s += src[j]; j++; } toks.push({ t: 'str', v: s }); i = j + 1; continue; }
      if (/[0-9]/.test(c) || (c === '-' && /[0-9]/.test(src[i + 1] || ''))) { const m = /^-?\d+(\.\d+)?/.exec(src.slice(i)); toks.push({ t: 'num', v: Number(m[0]) }); i += m[0].length; continue; }
      if (/[A-Za-z_]/.test(c)) { const m = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(src.slice(i)); toks.push({ t: 'id', v: m[0] }); i += m[0].length; continue; }
      const two = src.slice(i, i + 2);
      if (['==', '!=', '<=', '>=', '&&', '||'].includes(two)) { toks.push({ t: 'op', v: two }); i += 2; continue; }
      if ('()[].,!<>'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
      if (c === '*') { toks.push({ t: 'id', v: '*' }); i++; continue; }
      throw new Error(`Unexpected symbol: '${c}' in expression ${src}`);
    }
    return toks;
  }
  const truthy = v => !(v === null || v === undefined || v === false || v === 0 || v === '' || (typeof v === 'number' && isNaN(v)));
  function looseEq(a, b) {
    if (a === null || a === undefined) a = '';
    if (b === null || b === undefined) b = '';
    if (typeof a === 'boolean') a = a ? 'true' : 'false';
    if (typeof b === 'boolean') b = b ? 'true' : 'false';
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    if (typeof a === 'number' || typeof b === 'number') { const na = Number(a), nb = Number(b); if (!isNaN(na) && !isNaN(nb)) return na === nb; }
    return String(a).toLowerCase() === String(b).toLowerCase();
  }
  function evalExpr(src, ctx) {
    const toks = tokenizeExpr(src); let p = 0;
    const peek = () => toks[p]; const next = () => toks[p++];
    const isOp = v => peek() && peek().t === 'op' && peek().v === v;
    function parseOr() { let l = parseAnd(); while (isOp('||')) { next(); const r = parseAnd(); l = truthy(l) ? l : r; } return l; }
    function parseAnd() { let l = parseCmp(); while (isOp('&&')) { next(); const r = parseCmp(); l = truthy(l) ? r : l; } return l; }
    function parseCmp() {
      let l = parseUnary();
      while (peek() && peek().t === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(peek().v)) {
        const op = next().v; const r = parseUnary();
        if (op === '==') l = looseEq(l, r); else if (op === '!=') l = !looseEq(l, r);
        else { const a = Number(l), b = Number(r); const x = isNaN(a) || isNaN(b) ? [String(l), String(r)] : [a, b]; l = op === '<' ? x[0] < x[1] : op === '>' ? x[0] > x[1] : op === '<=' ? x[0] <= x[1] : x[0] >= x[1]; }
      }
      return l;
    }
    function parseUnary() { if (isOp('!')) { next(); return !truthy(parseUnary()); } return parsePostfix(parsePrimary()); }
    function parsePostfix(v) {
      while (peek() && peek().t === 'op' && (peek().v === '.' || peek().v === '[')) {
        if (isOp('.')) { next(); const id = next(); if (!id || (id.t !== 'id' && id.t !== 'num')) throw new Error('expected property name'); v = id.v === '*' ? (Array.isArray(v) ? v : Object.values(v || {})) : prop(v, id.v); }
        else { next(); const k = parseOr(); if (!isOp(']')) throw new Error("expected ']'"); next(); v = Array.isArray(v) && typeof k === 'number' ? v[k] : prop(v, k); }
      }
      return v;
    }
    function prop(o, k) {
      if (o === null || o === undefined) return null;
      if (Array.isArray(o)) { if (typeof k === 'number') return o[k] === undefined ? null : o[k]; return o.map(x => prop(x, k)); }
      if (typeof o !== 'object') return null;
      const key = Object.keys(o).find(x => x.toLowerCase() === String(k).toLowerCase());
      return key === undefined ? null : o[key];
    }
    function parsePrimary() {
      const t = next();
      if (!t) throw new Error('unexpected end of expression');
      if (t.t === 'str' || t.t === 'num') return t.v;
      if (t.t === 'op' && t.v === '(') { const v = parseOr(); if (!isOp(')')) throw new Error("expected ')'"); next(); return v; }
      if (t.t === 'id') {
        const id = t.v;
        if (isOp('(')) {
          next(); const args = [];
          while (!isOp(')')) { args.push(parseOr()); if (isOp(',')) next(); else if (!isOp(')')) throw new Error("expected ',' or ')'"); }
          next();
          return callFn(id, args, ctx);
        }
        if (id === 'true') return true; if (id === 'false') return false; if (id === 'null') return null;
        if (id in ctx) return ctx[id];
        throw new Error(`Unrecognized named-value: '${id}'`);
      }
      throw new Error(`unexpected token ${t.v}`);
    }
    const v = parseOr();
    if (p < toks.length) throw new Error(`unexpected token '${toks[p].v}' in expression ${src}`);
    return v;
  }
  function callFn(name, a, ctx) {
    const s = x => x === null || x === undefined ? '' : typeof x === 'object' ? JSON.stringify(x) : String(x);
    switch (name.toLowerCase()) {
      case 'success': return ctx.__status.success();
      case 'failure': return ctx.__status.failure();
      case 'always': return true;
      case 'cancelled': return false;
      case 'contains': if (Array.isArray(a[0])) return a[0].some(x => looseEq(x, a[1])); return s(a[0]).toLowerCase().includes(s(a[1]).toLowerCase());
      case 'startswith': return s(a[0]).toLowerCase().startsWith(s(a[1]).toLowerCase());
      case 'endswith': return s(a[0]).toLowerCase().endsWith(s(a[1]).toLowerCase());
      case 'format': return s(a[0]).replace(/\{(\d+)\}/g, (m, i) => s(a[Number(i) + 1]));
      case 'join': return (Array.isArray(a[0]) ? a[0] : [a[0]]).map(s).join(a.length > 1 ? s(a[1]) : ',');
      case 'tojson': return JSON.stringify(a[0], null, 2);
      case 'fromjson': try { return JSON.parse(s(a[0])); } catch (e) { throw new Error('fromJSON: ' + e.message); }
      case 'hashfiles': { const files = matchFiles(ctx.__sh, ctx.github.workspace, a.map(s)); if (!files.length) return ''; return hash(files.map(f => f.rel + '\n' + f.node.d).join('\n'), 256); }
      default: throw new Error(`Unrecognized function: '${name}'`);
    }
  }
  function interpolate(str, ctx) {
    if (str === null || str === undefined) return str;
    if (typeof str !== 'string') return str;
    return str.replace(/\$\{\{([\s\S]*?)\}\}/g, (m, e) => { const v = evalExpr(e.trim(), ctx); return v === null || v === undefined ? '' : typeof v === 'boolean' ? String(v) : typeof v === 'object' ? JSON.stringify(v) : String(v); });
  }
  function evalIf(cond, ctx) {
    if (cond === undefined || cond === null) return ctx.__status.success();
    if (typeof cond === 'boolean') return cond;
    let src = String(cond).trim();
    const whole = /^\$\{\{([\s\S]*)\}\}$/.exec(src);
    if (whole && !whole[1].includes('${{')) src = whole[1].trim();
    else if (src.includes('${{')) { const r = interpolate(src, ctx).trim(); return r !== '' && r.toLowerCase() !== 'false'; }
    return truthy(evalExpr(src, ctx));
  }
  function interpolateDeep(v, ctx) {
    if (typeof v === 'string') return interpolate(v, ctx);
    if (Array.isArray(v)) return v.map(x => interpolateDeep(x, ctx));
    if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = interpolateDeep(x, ctx); return o; }
    return v;
  }

  /* ---------- tetikleyici ve dal filtresi ---------- */
  function triggers(wf) {
    const on = wf.on !== undefined ? wf.on : wf[true] !== undefined ? wf[true] : wf['true'];
    if (on === undefined || on === null) return {};
    if (typeof on === 'string') return { [on]: {} };
    if (Array.isArray(on)) { const o = {}; on.forEach(e => { o[e] = {}; }); return o; }
    const o = {}; Object.entries(on).forEach(([k, v]) => { o[k] = v || {}; }); return o;
  }
  const refToBranch = ref => ref.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '');
  function branchAllowed(cfg, ref) {
    const branch = refToBranch(ref);
    const isTag = ref.startsWith('refs/tags/');
    const list = x => x === undefined || x === null ? null : Array.isArray(x) ? x.map(String) : [String(x)];
    const inc = list(isTag ? cfg.tags : cfg.branches), exc = list(isTag ? cfg['tags-ignore'] : cfg['branches-ignore']);
    if (inc && !inc.some(p => globRe(p).test(branch))) return `branch ${branch} is not in ${isTag ? 'tags' : 'branches'} filter [${inc.join(', ')}]`;
    if (exc && exc.some(p => globRe(p).test(branch))) return `branch ${branch} is in ${isTag ? 'tags-ignore' : 'branches-ignore'} [${exc.join(', ')}]`;
    return null;
  }

  /* ---------- matrix ---------- */
  function expandMatrix(strategy, ctx) {
    if (!strategy || !strategy.matrix) return [null];
    let mx = strategy.matrix;
    if (typeof mx === 'string') mx = evalExpr(mx.replace(/^\$\{\{|\}\}$/g, '').trim(), ctx);
    mx = interpolateDeep(mx, ctx);
    const include = Array.isArray(mx.include) ? mx.include : []; const exclude = Array.isArray(mx.exclude) ? mx.exclude : [];
    const keys = Object.keys(mx).filter(k => k !== 'include' && k !== 'exclude');
    let combos = [{}];
    for (const k of keys) { const vals = Array.isArray(mx[k]) ? mx[k] : [mx[k]]; const nx = []; for (const c of combos) for (const v of vals) nx.push(Object.assign({}, c, { [k]: v })); combos = nx; }
    if (!keys.length) combos = [];
    combos = combos.filter(c => !exclude.some(ex => Object.entries(ex).every(([k, v]) => looseEq(c[k], v))));
    for (const inc of include) {
      const shared = Object.keys(inc).filter(k => keys.includes(k));
      const targets = combos.filter(c => shared.every(k => looseEq(c[k], inc[k])));
      if (shared.length && targets.length) targets.forEach(c => { Object.entries(inc).forEach(([k, v]) => { if (!keys.includes(k) || c[k] === undefined) c[k] = v; }); });
      else combos.push(Object.assign({}, inc));
    }
    return combos.length ? combos : [null];
  }
  const matrixLabel = m => m ? ' (' + Object.values(m).map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ') + ')' : '';

  /* ---------- run adimi, shell motoru ---------- */
  function splitStatements(script) {
    const raw = script.replace(/\r/g, '').split('\n');
    const lines = []; let acc = null;
    for (const l of raw) { if (acc !== null) { acc += ' ' + l.trim(); } else acc = l; if (acc.trimEnd().endsWith('\\')) { acc = acc.trimEnd().slice(0, -1); continue; } lines.push(acc); acc = null; }
    if (acc !== null) lines.push(acc);
    const out = []; let depth = 0; let buf = [];
    const opens = /^\s*(if|for|while|until|case)\b|^\s*(function\s+\w+|\w+\s*\(\s*\))\s*\{?\s*$|^\s*\{\s*$/;
    const closes = /^\s*(fi|done|esac|\})\s*(;.*)?$/;
    for (const l of lines) {
      const t = l.trim();
      if (depth === 0 && (!t || t.startsWith('#'))) continue;
      if (opens.test(t) && !/\b(fi|done|esac)\s*$/.test(t)) { depth++; buf.push(l); continue; }
      if (depth > 0) { buf.push(l); if (closes.test(t)) { depth--; if (depth === 0) { out.push(buf.join('\n')); buf = []; } } continue; }
      out.push(l);
    }
    if (buf.length) out.push(buf.join('\n'));
    return out;
  }
  /* py.js Pyodide os.environ'u shell env ile senkronlamaz, CI adimlari env ile calistigi icin burada gecici olarak yazilir */
  function pyEnv(env) {
    if (typeof PY === 'undefined' || !PY.pyodide) return () => {};
    try {
      const keys = Object.keys(env);
      PY.pyodide.runPython(`import os, json\n_simc_env_saved = {k: os.environ.get(k) for k in json.loads(${JSON.stringify(JSON.stringify(keys))})}\nos.environ.update(json.loads(${JSON.stringify(JSON.stringify(env))}))`);
      return () => { try { PY.pyodide.runPython('import os\nfor _k, _v in _simc_env_saved.items():\n    (os.environ.pop(_k, None) if _v is None else os.environ.__setitem__(_k, _v))\ndel _simc_env_saved'); } catch (e) { /* yok */ } };
    } catch (e) { return () => {}; }
  }
  function runShell(sh, script, env, cwd, collect) {
    const savedEnv = sh.env; const savedCwd = sh.cwd; const savedCode = sh.lastCode;
    sh.env = Object.assign({}, savedEnv, env); sh.cwd = cwd; sh.lastCode = 0;
    const restorePy = pyEnv(sh.env);
    let code = 0; let xtrace = false; let errexit = true;
    const write = (t, cls) => collect(t, cls);
    try {
      for (const stmt of splitStatements(script)) {
        const t = stmt.trim();
        let m;
        if ((m = /^set\s+(-[a-zA-Z]+(\s+-[a-zA-Z]+)*)(\s+pipefail)?$/.exec(t)) || (m = /^set\s+-o\s+\w+$/.exec(t))) { if (/x/.test(t.replace(/pipefail/, ''))) xtrace = true; if (/\+e/.test(t)) errexit = false; continue; }
        if ((m = /^exit(?:\s+(\d+))?$/.exec(t))) { code = Number(m[1] || 0); break; }
        if (xtrace) write('+ ' + t.split('\n')[0] + '\n', 'trace');
        try { code = sh.execList(stmt, write); } catch (e) { write('bash: ' + (e.message || e) + '\n', 'err'); code = 1; }
        if (code !== 0 && errexit) break;
      }
    } finally { sh.env = savedEnv; sh.cwd = savedCwd; sh.lastCode = savedCode; restorePy(); }
    return code;
  }
  function parseKv(text) {
    const out = {}; const lines = (text || '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]; if (!l.trim()) continue;
      let m;
      if ((m = /^([^=<]+)<<(\S+)\s*$/.exec(l))) { const key = m[1].trim(); const d = m[2]; const buf = []; i++; while (i < lines.length && lines[i].trim() !== d) { buf.push(lines[i]); i++; } out[key] = buf.join('\n'); continue; }
      if ((m = /^([^=]+)=(.*)$/.exec(l))) out[m[1].trim()] = m[2];
    }
    return out;
  }
  const PY_VERSIONS = { 3.8: '3.8.20', 3.9: '3.9.21', '3.10': '3.10.16', 3.11: '3.11.11', 3.12: '3.12.8', 3.13: '3.13.2', 3.14: '3.14.2', '3.x': '3.13.2', '3': '3.13.2' };

  /* uses adimlarinin sahte ama gercekci log'u */
  function simulateAction(sh, step, ctx, run, job, out) {
    const uses = step.uses; const w = step.with || {};
    const name = uses.split('@')[0]; const ver = uses.split('@')[1] || '';
    const log = l => out.push(l);
    const withLines = () => { const ks = Object.keys(w); if (ks.length) { log('with:'); ks.forEach(k => log(`  ${k}: ${typeof w[k] === 'object' ? JSON.stringify(w[k]) : w[k]}`)); } };
    if (name === 'actions/checkout') {
      log(`Syncing repository: ${ctx.github.repository}`); log(`Getting Git version info`); log(`Fetching the repository`); log(`Checking out the ref`); log(`HEAD is now at ${ctx.github.sha.slice(0, 7)} ${ctx.github.ref.startsWith('refs/pull/') ? 'Merge ' + ctx.github.head_ref + ' into ' + ctx.github.base_ref : ctx.github.ref_name + ' workspace'}`);
      log(`Workspace ${ctx.github.workspace}`);
      return { code: 0, fake: 600 };
    }
    if (name === 'actions/setup-python') {
      const want = String(w['python-version'] !== undefined ? w['python-version'] : (w['python-version-file'] ? readText(sh, ctx.github.workspace + '/' + w['python-version-file']) || '3.x' : '3.x')).trim();
      const full = PY_VERSIONS[want] || (/^\d+\.\d+\.\d+$/.test(want) ? want : null);
      if (!full) { log(`Error: Version ${want} with arch x64 not found`); log(`Available versions: 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14`); return { code: 1, fake: 300 }; }
      log(`Installed versions`); log(`  Version ${want} was not found in the local cache`); log(`  Version ${want} is available for downloading`); log(`  Download from "https://github.com/actions/python-versions/releases/download/${full}/python-${full}-linux-22.04-x64.tar.gz"`); log(`Successfully set up CPython (${full})`);
      log(`Note: lab shell runs python3 as 3.14, version pin shown for the log only`);
      if (w.cache) log(`pip cache is not found`);
      step.__outputs = { 'python-version': full, 'python-path': `/opt/hostedtoolcache/Python/${full}/x64/bin/python` };
      return { code: 0, fake: 900 };
    }
    if (name === 'actions/cache' || name === 'actions/cache/restore') {
      const key = String(w.key || ''); const paths = String(w.path || '').split('\n').filter(Boolean);
      if (!key || !paths.length) { log('Error: Input required and not supplied: ' + (!key ? 'key' : 'path')); return { code: 1, fake: 100 }; }
      const restoreKeys = String(w['restore-keys'] || '').split('\n').map(x => x.trim()).filter(Boolean);
      const exact = !!SIMC_STATE.cache[key];
      const partial = !exact && restoreKeys.find(rk => Object.keys(SIMC_STATE.cache).some(k => k.startsWith(rk)));
      if (exact) log(`Cache restored from key: ${key}`);
      else if (partial) log(`Cache restored from key: ${Object.keys(SIMC_STATE.cache).find(k => k.startsWith(partial))}`);
      else log(`Cache not found for input keys: ${[key].concat(restoreKeys).join(', ')}`);
      log(`Cache paths: ${paths.join(', ')}`);
      step.__outputs = { 'cache-hit': exact ? 'true' : 'false', 'cache-primary-key': key, 'cache-matched-key': exact ? key : '' };
      if (name === 'actions/cache') job.__post.push(() => { if (!exact) { SIMC_STATE.cache[key] = { saved: LAB.util.now(), paths }; return `Cache saved with key: ${key}`; } return `Cache hit occurred on the primary key ${key}, not saving cache.`; });
      return { code: 0, fake: exact ? 400 : 200 };
    }
    if (name === 'actions/cache/save') { SIMC_STATE.cache[String(w.key)] = { saved: LAB.util.now(), paths: String(w.path || '').split('\n') }; log(`Cache saved with key: ${w.key}`); return { code: 0, fake: 300 }; }
    if (name === 'actions/upload-artifact') {
      const aname = String(w.name || 'artifact'); const pats = String(w.path || '').split('\n').map(x => x.trim()).filter(Boolean);
      if (!pats.length) { log('Error: Input required and not supplied: path'); return { code: 1, fake: 100 }; }
      const files = matchFiles(sh, ctx.github.workspace, pats);
      if (!files.length) {
        const mode = String(w['if-no-files-found'] || 'warn');
        log(`${mode === 'error' ? 'Error' : 'Warning'}: No files were found with the provided path: ${pats.join(', ')}. No artifacts will be uploaded.`);
        return { code: mode === 'error' ? 1 : 0, fake: 150 };
      }
      log(`With the provided path, there will be ${files.length} file(s) uploaded`); log(`Artifact name is valid!`); log(`Root directory input is valid!`);
      files.forEach(f => log(`  ${f.rel}`));
      const size = files.reduce((a, f) => a + f.node.d.length, 0);
      const art = { name: aname, files: files.map(f => f.rel), size, job: job.name, workflow: run.workflow, id: 1000 + SIMC_STATE.artifacts.length + 1 };
      SIMC_STATE.artifacts = SIMC_STATE.artifacts.filter(a => a.name !== aname).concat([art]); run.artifacts.push(art);
      log(`Uploaded bytes ${size}`); log(`Artifact ${aname}.zip successfully finalized. Artifact ID ${art.id}`); log(`Artifact ${aname} has been successfully uploaded! Final size is ${size} bytes.`);
      step.__outputs = { 'artifact-id': String(art.id), 'artifact-url': `https://ci.lab/${ctx.github.repository}/actions/runs/${ctx.github.run_id}/artifacts/${art.id}` };
      return { code: 0, fake: 500 };
    }
    if (name === 'actions/download-artifact') {
      const aname = w.name ? String(w.name) : null;
      const arts = aname ? SIMC_STATE.artifacts.filter(a => a.name === aname) : SIMC_STATE.artifacts;
      if (!arts.length) { log(`Error: Unable to download artifact(s): ${aname ? 'Artifact not found for name: ' + aname : 'no artifacts in this run'}`); return { code: 1, fake: 150 }; }
      arts.forEach(a => { log(`Downloading ${aname ? 'single' : 'all'} artifact(s)`); log(`Preparing to download the following artifacts:`); log(`- ${a.name} (ID: ${a.id}, Size: ${a.size})`); log(`Total of ${a.files.length} file(s) downloaded, files live under ${w.path ? w.path : ctx.github.workspace}`); });
      log(`Artifact download has finished successfully`);
      return { code: 0, fake: 350 };
    }
    if (name === 'actions/github-script') { log(`Simulated actions/github-script, script not executed in lab`); return { code: 0, fake: 200 }; }
    log(`Simulated action ${uses}${ver ? '' : ' (no version pin, use @vN or a sha)'}, no-op in lab`); withLines();
    return { code: 0, fake: 250 };
  }

  /* ---------- workflow kosumu ---------- */
  function runWorkflow(sh, file, opts) {
    const root = findRoot(sh, file) || H;
    const abs = sh.resolve(file);
    const text = readText(sh, abs);
    if (text === null) throw new Error(`workflow dosyasi yok, ${file}`);
    let wf; try { wf = loadYaml(text); } catch (e) { throw new Error(`YAML parse error in ${file}: ${e.message.split('\n')[0]}`); }
    if (!wf || typeof wf !== 'object') throw new Error(`${file} bos ya da gecersiz`);
    if (wf.stages || (!wf.jobs && Object.values(wf).some(v => v && typeof v === 'object' && v.script))) return runGitlabPipeline(sh, abs, wf, opts);
    const out = [];
    const W = l => out.push(l);
    const repo = 'netops/' + root.split('/').pop();
    SIMC_STATE.runNumber++;
    const runNumber = SIMC_STATE.runNumber;
    const sha = hash(repo + runNumber + listFiles(sh, root, [], '').map(f => f.rel + f.node.d.length).join(','), 160);
    const event = opts.event || 'push';
    let ref = opts.ref || (event === 'pull_request' ? 'refs/pull/7/merge' : 'refs/heads/main');
    if (!ref.startsWith('refs/')) ref = 'refs/heads/' + ref;
    const relFile = abs.startsWith(root + '/') ? abs.slice(root.length + 1) : abs;
    const run = { workflow: wf.name || relFile, file: relFile, kind: 'github', event, ref, sha, runNumber, status: 'success', jobs: [], artifacts: [], notes: [], startedAt: LAB.util.now(), inputs: {} };
    const secrets = loadSecrets(sh);
    const secretValues = Object.values(secrets).filter(v => v && v.length >= 3);
    const mask = s => { let t = s; secretValues.forEach(v => { t = t.split(v).join('***'); }); return t; };
    const trig = triggers(wf);
    W(`🚦 ${repo} · ${run.workflow} (${relFile}) · ${event} ${ref} · ${sha.slice(0, 7)} · run #${runNumber}`);
    const secretNames = Object.keys(secrets).filter(k => k !== 'GITHUB_TOKEN');
    W(`   secrets ${secretNames.length ? secretNames.join(', ') + ' from ~/.ci/secrets.env' : 'none, ~/.ci/secrets.env missing or empty'} · runner ${RUNNER_VERSION} · ubuntu-latest`);
    if (trig.schedule) { const crons = (Array.isArray(trig.schedule) ? trig.schedule : [trig.schedule]).map(x => x && x.cron ? x.cron : String(x)); W(`   note: schedule trigger [${crons.join(', ')}] is not simulated, use --event schedule to force it`); run.notes.push('schedule not simulated'); }
    if (wf.concurrency) { W(`   note: concurrency ${typeof wf.concurrency === 'object' ? JSON.stringify(wf.concurrency) : wf.concurrency} ignored in lab`); run.notes.push('concurrency ignored'); }
    const finish = (status, msg) => { run.status = status; if (msg) W(`   ${MARK[status] || '•'} ${msg}`); run.finishedAt = LAB.util.now(); SIMC_STATE.runs.push(run); if (SIMC_STATE.runs.length > 30) SIMC_STATE.runs.shift(); return { text: out.join('\n') + '\n', code: status === 'failure' ? 1 : 0, run }; };
    if (!Object.keys(trig).length) return finish('skipped', `workflow has no 'on' trigger, nothing to run`);
    if (!trig[event]) return finish('skipped', `workflow is not triggered by ${event}, triggers are [${Object.keys(trig).join(', ')}]${trig.workflow_dispatch && event !== 'workflow_dispatch' ? ', try --event workflow_dispatch' : ''}`);
    if (event === 'push' || event === 'pull_request') { const why = branchAllowed(trig[event] || {}, ref); if (why) return finish('skipped', `${event} skipped, ${why}`); }
    if (event === 'workflow_dispatch') {
      const defs = (trig.workflow_dispatch && trig.workflow_dispatch.inputs) || {};
      for (const [k, d] of Object.entries(defs)) { if (opts.inputs[k] !== undefined) run.inputs[k] = opts.inputs[k]; else if (d && d.default !== undefined) run.inputs[k] = String(d.default); else if (d && d.required) return finish('failure', `workflow_dispatch input '${k}' is required, pass --input ${k}=value`); }
      Object.keys(opts.inputs).forEach(k => { if (run.inputs[k] === undefined) run.inputs[k] = opts.inputs[k]; });
      if (Object.keys(run.inputs).length) W(`   inputs ${Object.entries(run.inputs).map(([k, v]) => k + '=' + v).join(' ')}`);
    }
    const jobsDef = wf.jobs || {};
    if (!Object.keys(jobsDef).length) return finish('failure', 'workflow has no jobs');
    const github = { repository: repo, repository_owner: 'netops', ref, ref_name: refToBranch(ref), ref_type: ref.startsWith('refs/tags/') ? 'tag' : 'branch', sha, event_name: event, actor: 'burak', triggering_actor: 'burak', run_id: String(9000 + runNumber), run_number: String(runNumber), run_attempt: '1', workflow: run.workflow, workspace: root, server_url: 'https://ci.lab', api_url: 'https://ci.lab/api', head_ref: event === 'pull_request' ? 'feature/pr-7' : '', base_ref: event === 'pull_request' ? 'main' : '', job: '', action: '', event: { inputs: run.inputs, ref, repository: { name: repo.split('/')[1], full_name: repo, default_branch: 'main' }, head_commit: { id: sha, message: 'lab workspace' }, pull_request: event === 'pull_request' ? { number: 7, title: 'feature/pr-7', base: { ref: 'main' }, head: { ref: 'feature/pr-7' } } : null } };
    const runner = { os: 'Linux', arch: 'X64', name: 'lab-runner-1', temp: '/tmp', tool_cache: '/opt/hostedtoolcache' };
    const baseCtx = { github, runner, secrets, inputs: run.inputs, vars: {}, env: {}, matrix: null, steps: {}, needs: {}, job: { status: 'success' }, strategy: {}, __sh: sh, __status: { success: () => true, failure: () => false } };
    /* needs sirasi */
    const order = []; const done = new Set();
    const ids = Object.keys(jobsDef);
    const needsOf = id => { const n = jobsDef[id] && jobsDef[id].needs; return n === undefined || n === null ? [] : Array.isArray(n) ? n.map(String) : [String(n)]; };
    for (const id of ids) for (const n of needsOf(id)) if (!jobsDef[n]) return finish('failure', `job '${id}' needs unknown job '${n}'`);
    while (order.length < ids.length) {
      const ready = ids.filter(id => !done.has(id) && needsOf(id).every(n => done.has(n)));
      if (!ready.length) return finish('failure', `circular needs between jobs [${ids.filter(id => !done.has(id)).join(', ')}]`);
      ready.forEach(id => { order.push(id); done.add(id); });
    }
    if (opts.job && !jobsDef[opts.job]) return finish('failure', `job '${opts.job}' not found, jobs are [${ids.join(', ')}]`);
    const results = {};
    const wfEnv = wf.env || {};
    const wfDefaults = (wf.defaults && wf.defaults.run) || {};
    let anyFail = false; let anyWait = false;
    const t0 = Date.now();
    for (const jobId of order) {
      const jd = jobsDef[jobId] || {};
      const needs = needsOf(jobId);
      if (opts.job && jobId !== opts.job) { results[jobId] = { result: 'success', outputs: {} }; continue; }
      const needsCtx = {}; needs.forEach(n => { needsCtx[n] = results[n] || { result: 'skipped', outputs: {} }; });
      const needOk = needs.every(n => (results[n] || {}).result === 'success');
      const needFail = needs.some(n => ['failure', 'cancelled'].includes((results[n] || {}).result));
      const jobCtx = Object.assign({}, baseCtx, { needs: needsCtx, __status: { success: () => needOk, failure: () => needFail } });
      /* job if */
      let jobIf = true; let ifErr = null;
      try { jobIf = evalIf(jd.if, jobCtx); } catch (e) { ifErr = e.message; }
      const displayBase = jd.name ? interpolate(String(jd.name), Object.assign({}, jobCtx, { matrix: {} })) : jobId;
      if (ifErr) { W(`━━ ${jobId}`); W(`   ✗ invalid 'if' expression, ${ifErr}`); run.jobs.push({ id: jobId, name: displayBase, status: 'failure', needs, steps: [], outputs: {}, error: ifErr }); results[jobId] = { result: 'failure', outputs: {} }; anyFail = true; continue; }
      if (!jobIf) {
        const why = jd.if !== undefined ? `if condition is false, ${String(jd.if).trim()}` : (needs.length ? `needs ${needs.filter(n => (results[n] || {}).result !== 'success').join(', ')} did not succeed` : 'condition false');
        W(`━━ ${jobId}${needs.length ? ' · needs ' + needs.join(', ') : ''}`); W(`   ⊘ skipped, ${why}`);
        run.jobs.push({ id: jobId, name: displayBase, status: 'skipped', needs, steps: [], outputs: {}, reason: why }); results[jobId] = { result: 'skipped', outputs: {} }; continue;
      }
      /* environment gate */
      let envName = null; try { envName = jd.environment ? interpolate(String(typeof jd.environment === 'object' ? jd.environment.name : jd.environment), jobCtx) : null; } catch (e) { envName = String(jd.environment); }
      if (envName && /prod/i.test(envName) && event !== 'workflow_dispatch') {
        W(`━━ ${jobId}${needs.length ? ' · needs ' + needs.join(', ') : ''} · environment ${envName}`);
        W(`   ⏸ waiting for approval, environment '${envName}' has required reviewers. Approve by dispatching manually, ci run ${relFile} --event workflow_dispatch`);
        run.jobs.push({ id: jobId, name: displayBase, status: 'waiting', needs, steps: [], outputs: {}, environment: envName }); results[jobId] = { result: 'skipped', outputs: {} }; anyWait = true; continue;
      }
      /* matrix */
      let combos; try { combos = expandMatrix(jd.strategy, jobCtx); } catch (e) { W(`━━ ${jobId}`); W(`   ✗ matrix error, ${e.message}`); run.jobs.push({ id: jobId, name: displayBase, status: 'failure', needs, steps: [], outputs: {} }); results[jobId] = { result: 'failure', outputs: {} }; anyFail = true; continue; }
      if (jd.strategy && jd.strategy['fail-fast'] === false) run.notes.push('fail-fast false');
      let jobResult = 'success'; const jobOutputs = {};
      for (const matrix of combos) {
        const ctx = Object.assign({}, jobCtx, { matrix: matrix || {}, steps: {}, env: {}, job: { status: 'success' }, strategy: { 'fail-fast': !(jd.strategy && jd.strategy['fail-fast'] === false), 'job-index': 0, 'job-total': combos.length, 'max-parallel': combos.length } });
        ctx.github = Object.assign({}, github, { job: jobId });
        const name = (jd.name ? interpolate(String(jd.name), ctx) : jobId) + (jd.name && String(jd.name).includes('${{') ? '' : matrixLabel(matrix));
        const job = { id: jobId, name, status: 'success', needs, steps: [], outputs: {}, matrix, runsOn: interpolate(String(Array.isArray(jd['runs-on']) ? jd['runs-on'].join(',') : jd['runs-on'] || 'ubuntu-latest'), ctx), environment: envName, __post: [] };
        const jt0 = Date.now();
        W(`━━ ${name} · ${job.runsOn}${needs.length ? ' · needs ' + needs.join(', ') : ''}${envName ? ' · environment ' + envName : ''}`);
        if (jd.services) { W(`   note: services ${Object.keys(jd.services).join(', ')} are not started in lab`); run.notes.push('services ignored'); }
        if (jd.container) W(`   note: container ${typeof jd.container === 'object' ? jd.container.image : jd.container} ignored, steps run in the lab shell`);
        if (jd['timeout-minutes']) W(`   timeout-minutes ${jd['timeout-minutes']} (not enforced)`);
        let jobEnv; try { jobEnv = Object.assign({}, interpolateDeep(wfEnv, ctx), interpolateDeep(jd.env || {}, ctx)); } catch (e) { W(`   ✗ env expression error, ${e.message}`); job.status = 'failure'; jobResult = 'failure'; run.jobs.push(job); continue; }
        Object.keys(jobEnv).forEach(k => { jobEnv[k] = jobEnv[k] === null || jobEnv[k] === undefined ? '' : String(jobEnv[k]); });
        ctx.env = jobEnv;
        const jobDefaults = Object.assign({}, wfDefaults, (jd.defaults && jd.defaults.run) || {});
        const stepsDef = Array.isArray(jd.steps) ? jd.steps : [];
        W(`   ${MARK.success} ${pad('Set up job', 44)} 0.0s`);
        let failed = false; const runDir = `${H}/.ci/runs/${runNumber}/${jobId}`;
        mkdirp(sh, runDir);
        if (!stepsDef.length) { W(`   ✗ job has no steps`); failed = true; }
        for (let si = 0; si < stepsDef.length; si++) {
          const sd = stepsDef[si] || {};
          ctx.job.status = failed ? 'failure' : 'success';
          ctx.__status = { success: () => !failed, failure: () => failed };
          const stepRec = { name: '', id: sd.id || null, uses: sd.uses || null, run: null, status: 'success', outcome: 'success', conclusion: 'success', code: 0, out: '', outputs: {}, ms: 0 };
          let label;
          try { label = sd.name ? interpolate(String(sd.name), ctx) : (sd.uses ? 'Run ' + sd.uses : 'Run ' + (sd.run === undefined || sd.run === null ? '' : String(sd.run)).trim().split('\n')[0]); } catch (e) { label = sd.name || 'step'; }
          stepRec.name = label;
          let cond;
          try { cond = evalIf(sd.if, ctx); } catch (e) { W(`   ✗ ${pad(label, 44)} invalid if, ${e.message}`); stepRec.status = stepRec.outcome = stepRec.conclusion = 'failure'; stepRec.out = e.message; job.steps.push(stepRec); failed = true; continue; }
          if (!cond) { W(`   ⊘ ${pad(label, 44)} skipped${sd.if !== undefined ? ', if ' + String(sd.if).trim() : ''}`); stepRec.status = stepRec.outcome = stepRec.conclusion = 'skipped'; job.steps.push(stepRec); if (sd.id) ctx.steps[sd.id] = { outputs: {}, outcome: 'skipped', conclusion: 'skipped' }; continue; }
          if (!sd.uses && sd.run === undefined) { W(`   ✗ ${pad(label, 44)} step needs 'uses' or 'run'`); stepRec.status = 'failure'; job.steps.push(stepRec); failed = true; continue; }
          const st0 = Date.now();
          const lines = []; let code = 0; let fake = 0;
          let stepEnv;
          try { stepEnv = interpolateDeep(sd.env || {}, ctx); Object.keys(stepEnv).forEach(k => { stepEnv[k] = stepEnv[k] == null ? '' : String(stepEnv[k]); }); } catch (e) { stepEnv = {}; lines.push({ text: 'env expression error, ' + e.message + '\n', cls: 'err' }); code = 1; }
          if (code === 0 && sd.uses) {
            try {
              const withI = interpolateDeep(sd.with || {}, ctx);
              const step = { uses: interpolate(String(sd.uses), ctx), with: withI };
              const buf = [];
              const r = simulateAction(sh, step, ctx, run, job, buf);
              lines.push(...buf.map(t => ({ text: t + '\n', cls: '' })));
              code = r.code; fake = r.fake; stepRec.outputs = step.__outputs || {};
              if (withI && Object.keys(withI).length) stepRec.with = withI;
            } catch (e) { lines.push({ text: 'expression error, ' + e.message + '\n', cls: 'err' }); code = 1; }
          } else if (code === 0) {
            let script;
            try { script = interpolate(String(sd.run), ctx); } catch (e) { lines.push({ text: 'expression error in run, ' + e.message + '\n', cls: 'err' }); code = 1; }
            if (code === 0) {
              stepRec.run = script;
              const shell = String(sd.shell || jobDefaults.shell || 'bash');
              const wd = sd['working-directory'] || jobDefaults['working-directory'];
              let cwd = root; if (wd) { const w = interpolate(String(wd), ctx); cwd = w.startsWith('/') ? w : root + '/' + w.replace(/^\.\//, ''); }
              if (!isDir(sh, cwd)) { lines.push({ text: `working-directory ${cwd} does not exist\n`, cls: 'err' }); code = 1; }
              const outFile = `${runDir}/step${si}.output`, envFile = `${runDir}/step${si}.env`, sumFile = `${runDir}/step${si}.summary`, pathFile = `${runDir}/step${si}.path`;
              [outFile, envFile, sumFile, pathFile].forEach(f => writeText(sh, f, ''));
              const env = Object.assign({ CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: root, GITHUB_REPOSITORY: repo, GITHUB_SHA: sha, GITHUB_REF: ref, GITHUB_REF_NAME: refToBranch(ref), GITHUB_EVENT_NAME: event, GITHUB_ACTOR: 'burak', GITHUB_RUN_ID: github.run_id, GITHUB_RUN_NUMBER: github.run_number, GITHUB_JOB: jobId, GITHUB_WORKFLOW: run.workflow, GITHUB_OUTPUT: outFile, GITHUB_ENV: envFile, GITHUB_STEP_SUMMARY: sumFile, GITHUB_PATH: pathFile, RUNNER_OS: 'Linux', RUNNER_ARCH: 'X64', RUNNER_TEMP: '/tmp', GITHUB_HEAD_REF: github.head_ref, GITHUB_BASE_REF: github.base_ref, GITHUB_SERVER_URL: 'https://ci.lab' }, jobEnv, stepEnv);
              const firstLines = script.trim().split('\n');
              lines.push({ text: `▶ ${shell}: ` + firstLines[0] + (firstLines.length > 1 ? ` (+${firstLines.length - 1} lines)` : '') + '\n', cls: 'hdr' });
              if (code === 0) {
                const collect = (t, cls) => { if (t) lines.push({ text: t, cls: cls || '' }); };
                if (shell === 'python' || shell.startsWith('python')) { const pf = `${runDir}/step${si}.py`; writeText(sh, pf, script); code = runShell(sh, `python3 ${pf}`, env, cwd, collect); }
                else if (shell === 'bash' || shell === 'sh' || shell.startsWith('bash ') || shell.startsWith('sh ')) code = runShell(sh, script, env, cwd, collect);
                else { lines.push({ text: `shell '${shell}' not supported in lab, use bash, sh or python\n`, cls: 'err' }); code = 1; }
                const outs = parseKv(readText(sh, outFile)); stepRec.outputs = outs;
                const envAdd = parseKv(readText(sh, envFile)); Object.assign(jobEnv, envAdd); Object.keys(envAdd).forEach(k => lines.push({ text: `  GITHUB_ENV ${k}=${envAdd[k]}\n`, cls: 'note' }));
                const sum = readText(sh, sumFile); if (sum && sum.trim()) { job.summary = (job.summary || '') + sum; }
              }
            }
          }
          const real = Date.now() - st0;
          stepRec.ms = real + fake; stepRec.code = code;
          /* workflow komutlari ve maskeleme */
          const rendered = [];
          for (const l of lines) {
            let txt = l.text.replace(/\n$/, '');
            for (let piece of txt.split('\n')) {
              let m;
              if ((m = /^::(notice|warning|error)(?:\s+[^:]*)?::(.*)$/.exec(piece))) piece = `${m[1] === 'error' ? '✗' : m[1] === 'warning' ? '⚠' : 'ℹ'} ${m[1]}: ${m[2]}`;
              else if (/^::(group|endgroup|add-mask|debug)::/.test(piece)) { if (piece.startsWith('::add-mask::')) secretValues.push(piece.slice(12)); continue; }
              rendered.push({ text: mask(piece), cls: l.cls });
            }
          }
          stepRec.out = rendered.map(r => r.text).join('\n');
          const coe = sd['continue-on-error'] === true || (typeof sd['continue-on-error'] === 'string' && evalIf(sd['continue-on-error'], ctx));
          if (code !== 0) { stepRec.outcome = 'failure'; if (coe) { stepRec.conclusion = 'success'; stepRec.status = 'success'; } else { stepRec.conclusion = 'failure'; stepRec.status = 'failure'; failed = true; } }
          W(`   ${code === 0 ? MARK.success : (coe ? '⚠' : MARK.failure)} ${pad(label, 44)} ${code !== 0 ? 'exit ' + code + (coe ? ' (continue-on-error)' : '') + '  ' : ''}${fmtDur(stepRec.ms)}`);
          rendered.forEach(r => W(`     ${r.cls === 'err' ? '✗ ' : ''}${r.text}`));
          if (sd.id) ctx.steps[sd.id] = { outputs: stepRec.outputs, outcome: stepRec.outcome, conclusion: stepRec.conclusion };
          job.steps.push(stepRec);
        }
        for (const post of job.__post) { const msg = post(); W(`   ${MARK.success} ${pad('Post Run actions/cache', 44)} 0.2s`); W(`     ${msg}`); }
        delete job.__post;
        if (job.summary) { W(`   Job summary`); job.summary.trim().split('\n').forEach(l => W(`     ${mask(l)}`)); }
        if (jd.outputs) { try { for (const [k, v] of Object.entries(jd.outputs)) job.outputs[k] = interpolate(String(v), ctx); } catch (e) { W(`   ⚠ job outputs error, ${e.message}`); } Object.assign(jobOutputs, job.outputs); }
        job.status = failed ? 'failure' : 'success';
        job.ms = job.steps.reduce((a, s) => a + s.ms, 0) + 50;
        W(`   ${MARK[job.status]} ${name} ${job.status === 'success' ? 'succeeded' : 'failed'} in ${fmtDur(job.ms)}${Object.keys(job.outputs).length ? ' · outputs ' + Object.entries(job.outputs).map(([k, v]) => k + '=' + mask(String(v))).join(' ') : ''}`);
        run.jobs.push(job);
        if (failed) jobResult = 'failure';
      }
      results[jobId] = { result: jobResult, outputs: jobOutputs };
      if (jobResult === 'failure') anyFail = true;
    }
    /* ozet */
    const total = Date.now() - t0 + run.jobs.reduce((a, j) => a + (j.ms || 0), 0);
    W('');
    W(`Summary ${run.workflow} · run #${runNumber}`);
    W(`   ${pad('job', 28)} ${pad('status', 10)} ${pad('steps', 7)} duration`);
    for (const j of run.jobs) {
      const okSteps = j.steps.filter(s => s.status === 'success').length;
      W(`   ${pad(j.name, 28)} ${MARK[j.status] || '•'} ${pad(j.status, 8)} ${pad(j.steps.length ? okSteps + '/' + j.steps.length : '-', 7)} ${j.ms !== undefined ? fmtDur(j.ms) : (j.reason ? j.reason : j.status === 'waiting' ? 'needs approval' : '')}`);
    }
    if (run.artifacts.length) W(`   artifacts ${run.artifacts.map(a => a.name + ' (' + a.files.length + ' files)').join(', ')}`);
    const status = anyFail ? 'failure' : anyWait ? 'waiting' : 'success';
    W(`${MARK[status]} Run #${runNumber} ${status} in ${fmtDur(total)}`);
    return finish(status, null);
  }

  /* ---------- GitLab CI ---------- */
  const GL_RESERVED = ['stages', 'variables', 'default', 'include', 'workflow', 'image', 'services', 'before_script', 'after_script', 'cache', 'pages'];
  function glJobs(cfg) { return Object.entries(cfg).filter(([k, v]) => !GL_RESERVED.includes(k) && !k.startsWith('.') && v && typeof v === 'object' && (v.script || v.trigger)); }
  function glExpand(s, vars) { return String(s).replace(/\$\{(\w+)\}|\$(\w+)/g, (m, a, b) => { const k = a || b; return vars[k] !== undefined ? vars[k] : ''; }); }
  function glRules(job, vars, branch) {
    const list = x => x === undefined || x === null ? null : Array.isArray(x) ? x.map(String) : typeof x === 'object' ? (x.refs ? x.refs.map(String) : null) : [String(x)];
    const only = list(job.only), except = list(job.except);
    const matchRef = p => p === 'branches' || p === 'main' && branch === 'main' ? (p === 'branches' ? !/^\d+\.\d+/.test(branch) : true) : p === 'tags' ? /^v?\d+\.\d+/.test(branch) : p.startsWith('/') && p.endsWith('/') ? new RegExp(p.slice(1, -1)).test(branch) : globRe(p).test(branch);
    if (only && !only.some(matchRef)) return { run: false, why: `only [${only.join(', ')}] does not match ${branch}` };
    if (except && except.some(matchRef)) return { run: false, why: `except [${except.join(', ')}] matches ${branch}` };
    if (Array.isArray(job.rules)) {
      for (const r of job.rules) {
        let hit = true;
        if (r.if) {
          const e = glExpand(String(r.if).replace(/"/g, "'"), Object.assign({}, vars, { CI_COMMIT_BRANCH: branch, CI_COMMIT_REF_NAME: branch }));
          try { hit = truthy(evalExpr(e.replace(/\s*=~\s*/g, ' == ').replace(/'([^']*)'/g, (m, s) => "'" + s + "'"), { __status: { success: () => true, failure: () => false } })); } catch (x) { hit = e.trim() !== '' && !/==\s*''\s*$/.test(e) && !/^\s*''\s*==/.test(e); }
        }
        if (hit) { if (r.when === 'never') return { run: false, why: `rule ${r.if || ''} when never` }; if (r.when === 'manual') return { run: false, why: 'rule when manual, start it by hand', manual: true }; return { run: true }; }
      }
      return { run: false, why: 'no rule matched' };
    }
    if (job.when === 'manual') return { run: false, why: 'when manual, start it by hand', manual: true };
    if (job.when === 'never') return { run: false, why: 'when never' };
    return { run: true };
  }
  function glRunJob(sh, root, cfg, name, job, vars, branch, out, run, opts) {
    const W = l => out.push(l);
    const def = cfg.default || {};
    const jobVars = Object.assign({}, cfg.variables || {}, job.variables || {}, opts.env || {});
    Object.keys(jobVars).forEach(k => { jobVars[k] = jobVars[k] && typeof jobVars[k] === 'object' ? String(jobVars[k].value) : String(jobVars[k]); });
    const sha = run.sha;
    const secretsEnv = loadSecrets(sh); delete secretsEnv.GITHUB_TOKEN;
    const env = Object.assign({}, secretsEnv, { CI: 'true', GITLAB_CI: 'true', CI_PROJECT_DIR: root, CI_PROJECT_NAME: root.split('/').pop(), CI_PROJECT_PATH: 'netops/' + root.split('/').pop(), CI_COMMIT_SHA: sha, CI_COMMIT_SHORT_SHA: sha.slice(0, 8), CI_COMMIT_BRANCH: branch, CI_COMMIT_REF_NAME: branch, CI_COMMIT_REF_SLUG: branch.replace(/[^a-z0-9]/gi, '-').toLowerCase(), CI_JOB_NAME: name, CI_JOB_STAGE: String(job.stage || 'test'), CI_JOB_ID: String(100 + run.jobs.length), CI_PIPELINE_ID: String(run.runNumber), CI_PIPELINE_SOURCE: 'push', CI_REGISTRY: 'registry.lab', CI_SERVER_URL: 'https://gitlab.lab', GITLAB_USER_LOGIN: 'burak' }, vars, jobVars);
    Object.keys(env).forEach(k => { env[k] = glExpand(env[k], env); });
    const rec = { id: name, name, stage: String(job.stage || 'test'), status: 'success', steps: [], outputs: {}, allowFailure: job.allow_failure === true };
    const secrets = secretsEnv; const sv = Object.values(secrets).filter(v => v && v.length >= 3).concat(Object.entries(env).filter(([k]) => /TOKEN|PASSWORD|SECRET|KEY/.test(k)).map(([, v]) => v).filter(v => v && v.length >= 3));
    const mask = s => { let t = s; sv.forEach(v => { t = t.split(v).join('[MASKED]'); }); return t; };
    W(`Running with gitlab-runner 17.4.0 (lab)`); W(`  on linuxlab ${hash(name, 32)}`);
    W(`Preparing the "shell" executor`); W(`Using Shell (bash) executor...`);
    W(`Preparing environment`); W(`Running on linuxlab...`);
    W(`Getting source from Git repository`); W(`Fetching changes...`); W(`Checking out ${sha.slice(0, 8)} as detached HEAD (ref is ${branch})...`); W(`Skipping Git submodules setup`);
    if (job.image || def.image || cfg.image) W(`Note: image ${job.image || def.image || cfg.image} ignored, shell executor runs in the lab shell`);
    const t0 = Date.now(); let failed = false;
    const phases = [['before_script', job.before_script !== undefined ? job.before_script : (def.before_script !== undefined ? def.before_script : cfg.before_script)], ['step_script', job.script], ['after_script', job.after_script !== undefined ? job.after_script : (def.after_script !== undefined ? def.after_script : cfg.after_script)]];
    for (const [phase, body] of phases) {
      if (body === undefined || body === null) continue;
      const cmds = (Array.isArray(body) ? body : [body]).map(String);
      if (!cmds.length) continue;
      if (phase === 'step_script' && failed) continue;
      if (phase === 'after_script') W(`Running after_script`);
      W(`Executing "${phase}" stage of the job script`);
      const step = { name: phase, status: 'success', code: 0, out: '', ms: 0 };
      const st0 = Date.now(); const buf = [];
      let code = 0;
      for (const c of cmds) {
        W(`$ ${mask(c)}`);
        const collect = (t, cls) => { if (t) { t.replace(/\n$/, '').split('\n').forEach(l => { W(mask(l)); buf.push(l); }); } };
        code = runShell(sh, c, env, root, collect);
        if (code !== 0) break;
      }
      step.ms = Date.now() - st0; step.code = code; step.out = buf.join('\n');
      if (code !== 0) { step.status = 'failure'; if (phase !== 'after_script') failed = true; }
      rec.steps.push(step);
    }
    if (failed && !(cfg.default && cfg.default.after_script === undefined) && job.after_script === undefined && cfg.after_script === undefined) { /* yok */ }
    rec.ms = Date.now() - t0;
    if (failed) { rec.status = rec.allowFailure ? 'success' : 'failure'; W(rec.allowFailure ? `WARNING: Job failed but allow_failure is set, treated as success` : `ERROR: Job failed: exit status ${rec.steps.find(s => s.status === 'failure').code}`); }
    else W(`Job succeeded`);
    if (job.artifacts && job.artifacts.paths) { const files = matchFiles(sh, root, job.artifacts.paths.map(String)); W(`Uploading artifacts for ${failed ? 'failed' : 'successful'} job`); if (files.length) { W(`${files.map(f => f.rel).join(', ')}: found ${files.length} matching artifact files and directories`); run.artifacts.push({ name: name, files: files.map(f => f.rel), job: name, size: files.reduce((a, f) => a + f.node.d.length, 0) }); } else W(`WARNING: ${job.artifacts.paths.join(', ')}: no matching files`); }
    if (failed) rec.failedAt = rec.steps.find(s => s.status === 'failure').name;
    run.jobs.push(rec);
    return rec;
  }
  function runGitlabPipeline(sh, abs, cfg, opts) {
    const root = abs.slice(0, abs.lastIndexOf('/')) || H;
    const out = []; const W = l => out.push(l);
    SIMC_STATE.runNumber++;
    const branch = refToBranch(opts.ref || 'main');
    const run = { workflow: '.gitlab-ci.yml', file: abs.slice(root.length + 1), kind: 'gitlab', event: 'push', ref: 'refs/heads/' + branch, sha: hash('gl' + SIMC_STATE.runNumber + root, 160), runNumber: SIMC_STATE.runNumber, status: 'success', jobs: [], artifacts: [], notes: [], startedAt: LAB.util.now() };
    const stages = Array.isArray(cfg.stages) && cfg.stages.length ? cfg.stages.map(String) : ['.pre', 'build', 'test', 'deploy', '.post'];
    const jobs = glJobs(cfg);
    W(`🦊 netops/${root.split('/').pop()} · pipeline #${run.runNumber} · branch ${branch} · stages ${stages.join(' → ')}`);
    if (cfg.include) { W(`   note: include ignored in lab`); run.notes.push('include ignored'); }
    const vars = {}; Object.entries(cfg.variables || {}).forEach(([k, v]) => { vars[k] = v && typeof v === 'object' ? String(v.value) : String(v); });
    let anyFail = false;
    if (opts.job) { const j = jobs.find(([k]) => k === opts.job); if (!j) { W(`   ✗ job '${opts.job}' not found, jobs are [${jobs.map(([k]) => k).join(', ')}]`); run.status = 'failure'; SIMC_STATE.runs.push(run); return { text: out.join('\n') + '\n', code: 1, run }; } }
    for (const stage of stages) {
      const inStage = jobs.filter(([k, j]) => String(j.stage || 'test') === stage && (!opts.job || k === opts.job));
      if (!inStage.length) continue;
      W(`── stage ${stage}`);
      let stageFail = false;
      for (const [name, job] of inStage) {
        const r = glRules(job, vars, branch);
        if (!r.run) { W(`   ${r.manual ? '⏸' : '⊘'} ${pad(name, 20)} skipped, ${r.why}`); run.jobs.push({ id: name, name, stage, status: r.manual ? 'manual' : 'skipped', steps: [], outputs: {}, reason: r.why }); continue; }
        const buf = [];
        const rec = glRunJob(sh, root, cfg, name, job, vars, branch, buf, run, opts);
        W(`   ${MARK[rec.status]} ${pad(name, 20)} ${rec.status} ${fmtDur(rec.ms)}`);
        buf.forEach(l => W(`     ${l}`));
        if (rec.status === 'failure') { stageFail = true; anyFail = true; }
      }
      if (stageFail) { W(`   ✗ stage ${stage} failed, later stages skipped`); const later = stages.slice(stages.indexOf(stage) + 1); jobs.filter(([k, j]) => later.includes(String(j.stage || 'test'))).forEach(([k, j]) => run.jobs.push({ id: k, name: k, stage: String(j.stage || 'test'), status: 'skipped', steps: [], outputs: {}, reason: 'earlier stage failed' })); break; }
    }
    jobs.filter(([k, j]) => !stages.includes(String(j.stage || 'test'))).forEach(([k, j]) => W(`   ⚠ job ${k} has stage ${j.stage} which is not in stages, ignored`));
    W('');
    W(`Summary .gitlab-ci.yml · pipeline #${run.runNumber}`);
    W(`   ${pad('job', 22)} ${pad('stage', 10)} status`);
    run.jobs.forEach(j => W(`   ${pad(j.name, 22)} ${pad(j.stage, 10)} ${MARK[j.status] || '•'} ${j.status}${j.reason ? ', ' + j.reason : ''}`));
    run.status = anyFail ? 'failure' : 'success';
    W(`${MARK[run.status]} Pipeline #${run.runNumber} ${run.status}`);
    run.finishedAt = LAB.util.now(); SIMC_STATE.runs.push(run); if (SIMC_STATE.runs.length > 30) SIMC_STATE.runs.shift();
    return { text: out.join('\n') + '\n', code: anyFail ? 1 : 0, run };
  }

  /* ---------- komutlar ---------- */
  function parseRunArgs(args, style) {
    const o = { file: null, job: null, event: null, ref: null, inputs: {}, env: {}, list: false, help: false };
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '--job' || a === '-j') o.job = args[++i];
      else if (a === '--event' || a === '-e') o.event = args[++i];
      else if (a === '--ref' || a === '-r') o.ref = args[++i];
      else if (a === '--workflow' || a === '-W') o.file = args[++i];
      else if (a === '--input' || a === '-i') { const kv = args[++i] || ''; const k = kv.indexOf('='); if (k > 0) o.inputs[kv.slice(0, k)] = kv.slice(k + 1); }
      else if (a === '--env') { const kv = args[++i] || ''; const k = kv.indexOf('='); if (k > 0) o.env[kv.slice(0, k)] = kv.slice(k + 1); }
      else if (a === '-l' || a === '--list') o.list = true;
      else if (a === '-h' || a === '--help') o.help = true;
      else if (a.startsWith('--')) { /* bilinmeyen bayrak */ }
      else if (style === 'act' && ['push', 'pull_request', 'workflow_dispatch', 'schedule', 'release'].includes(a)) o.event = a;
      else if (!o.file) o.file = a;
    }
    return o;
  }
  function findWorkflows(sh, root) {
    const dir = root + '/.github/workflows'; const n = sh.node(dir);
    const files = n && n.t === 'd' ? Object.keys(n.c).filter(k => /\.ya?ml$/.test(k) && n.c[k].t === 'f').sort().map(k => dir + '/' + k) : [];
    if (sh.node(root + '/.gitlab-ci.yml')) files.push(root + '/.gitlab-ci.yml');
    return files;
  }
  function runAll(sh, o) {
    const root = findRoot(sh, o.file);
    if (!root) return fail(`ci: repo bulunamadi. /home/burak/<repo> altinda .github/workflows ya da .gitlab-ci.yml olmali, ya da workflow dosyasini ver`);
    let files = o.file ? [sh.resolve(o.file)] : findWorkflows(sh, root);
    if (o.file && !sh.node(files[0])) return fail(`ci: workflow dosyasi yok, ${o.file}`);
    if (!files.length) return fail(`ci: ${root}/.github/workflows altinda workflow yok. Ornek, nano ${root}/.github/workflows/ci.yml`);
    if (!o.file && files.length > 1 && files.some(f => f.endsWith('.gitlab-ci.yml'))) files = files.filter(f => !f.endsWith('.gitlab-ci.yml'));
    const texts = []; let code = 0; let lastRun = null; let lastReal = null;
    for (const f of files) {
      let r;
      try { r = runWorkflow(sh, f, o); } catch (e) { texts.push(`✗ ${f.slice(root.length + 1)}: ${e.message}\n`); code = 1; continue; }
      texts.push(r.text); if (r.code) code = r.code; lastRun = r.run; if (r.run.status !== 'skipped') lastReal = r.run;
    }
    SIMC_STATE.last = lastReal || lastRun || SIMC_STATE.last;
    return { out: texts.join('\n'), err: '', code };
  }
  function ciCmd(args) {
    const sh = this;
    const sub = args[0];
    if (!sub || sub === 'help' || sub === '--help' || sub === '-h') return ok(['ci, lab icinde CI kosucusu. GitHub Actions workflow\'larini ve .gitlab-ci.yml\'i sanal shell\'de calistirir.', '', '  ci run [workflow.yml] [--job ad] [--event push|pull_request|workflow_dispatch] [--ref refs/heads/main] [--input k=v]', '  ci list            workflow ve job listesi', '  ci last            son kosumun ozeti', '  ci secrets         ~/.ci/secrets.env icindeki secret adlari', '  ci runs            kosum gecmisi', '  ci cache clear     actions/cache onbellegini sil', '', 'Varsayilan event push, ref refs/heads/main. secrets.X degerleri ~/.ci/secrets.env dosyasindan okunur, logda *** olarak maskelenir.'].join('\n') + '\n');
    if (sub === 'run') return runAll(sh, parseRunArgs(args.slice(1), 'ci'));
    if (sub === 'list') {
      const root = findRoot(sh, null); if (!root) return fail('ci list: repo bulunamadi, cd /home/burak/<repo>');
      const files = findWorkflows(sh, root); if (!files.length) return ok(`${root} icinde workflow yok\n`);
      const lines = [];
      for (const f of files) { try { const wf = loadYaml(readText(sh, f)); if (f.endsWith('.gitlab-ci.yml')) lines.push(`${f.slice(root.length + 1)}  gitlab  stages [${(wf.stages || []).join(', ')}]  jobs [${glJobs(wf).map(([k]) => k).join(', ')}]`); else lines.push(`${f.slice(root.length + 1)}  "${wf.name || ''}"  on [${Object.keys(triggers(wf)).join(', ')}]  jobs [${Object.keys(wf.jobs || {}).join(', ')}]`); } catch (e) { lines.push(`${f.slice(root.length + 1)}  YAML error, ${e.message.split('\n')[0]}`); } }
      return ok(lines.join('\n') + '\n');
    }
    if (sub === 'last') {
      const r = SIMC_STATE.last; if (!r) return ok('henuz kosum yok, ci run\n');
      return ok([`${r.workflow} (${r.file}) run #${r.runNumber} ${r.event} ${r.ref} ${r.status}`].concat(r.jobs.map(j => `  ${MARK[j.status] || '•'} ${pad(j.name, 26)} ${pad(j.status, 8)} ${j.steps.map(s => (MARK[s.status] || '•') + ' ' + s.name).join(' | ')}${j.reason ? '  ' + j.reason : ''}`)).join('\n') + '\n');
    }
    if (sub === 'runs') return ok(SIMC_STATE.runs.length ? SIMC_STATE.runs.map(r => `#${r.runNumber}  ${pad(r.workflow, 22)} ${pad(r.event, 18)} ${pad(r.ref, 24)} ${r.status}`).join('\n') + '\n' : 'kosum yok\n');
    if (sub === 'secrets') { const s = loadSecrets(sh); return ok(Object.keys(s).map(k => `${k}=${'*'.repeat(Math.min(8, s[k].length))}`).join('\n') + '\n'); }
    if (sub === 'cache') { if (args[1] === 'clear') { SIMC_STATE.cache = {}; return ok('cache temizlendi\n'); } return ok(Object.keys(SIMC_STATE.cache).length ? Object.entries(SIMC_STATE.cache).map(([k, v]) => `${k}  ${v.paths.join(',')}  ${v.saved}`).join('\n') + '\n' : 'cache bos\n'); }
    return fail(`ci: bilinmeyen alt komut ${sub}, ci help`);
  }
  function actCmd(args) {
    const sh = this;
    const o = parseRunArgs(args, 'act');
    if (o.help) return ok('act [event] [-j job] [-W workflow] [-l]\nGitHub Actions workflow\'larini yerelde kosar, lab icinde ci run ile aynidir.\n');
    if (o.list) { const root = findRoot(sh, null); if (!root) return fail('act: repo bulunamadi'); const rows = []; for (const f of findWorkflows(sh, root).filter(f => !f.endsWith('.gitlab-ci.yml'))) { try { const wf = loadYaml(readText(sh, f)); Object.entries(wf.jobs || {}).forEach(([id, j]) => rows.push(`${pad(id, 12)} ${pad(j.name || id, 20)} ${pad(wf.name || '', 16)} ${pad(f.split('/').pop(), 16)} ${Object.keys(triggers(wf)).join(',')}`)); } catch (e) { rows.push(`${f} YAML error`); } } return ok(`${pad('Job ID', 12)} ${pad('Job name', 20)} ${pad('Workflow name', 16)} ${pad('Workflow file', 16)} Events\n` + rows.join('\n') + '\n'); }
    return runAll(sh, o);
  }
  function gitlabRunnerCmd(args) {
    const sh = this;
    if (args[0] === '--version' || args[0] === '-v') return ok('Version:      17.4.0 (lab)\nGit revision: netlab\nGO version:   go1.22\nOS/Arch:      linux/amd64\n');
    if (args[0] !== 'exec') return fail('gitlab-runner: kullanim, gitlab-runner exec shell <job> [--ref branch] [--env K=V]. Butun pipeline icin ci run .gitlab-ci.yml');
    if (args[1] !== 'shell') return fail(`gitlab-runner: executor '${args[1] || ''}' yok, lab'da yalniz shell var`);
    const o = parseRunArgs(args.slice(2), 'gl');
    if (!o.file) return fail('gitlab-runner exec shell: job adi ver');
    const root = findRoot(sh, null); const abs = root ? root + '/.gitlab-ci.yml' : null;
    if (!abs || !sh.node(abs)) return fail(`gitlab-runner: .gitlab-ci.yml bulunamadi${root ? ' in ' + root : ', cd /home/burak/<repo>'}`);
    let cfg; try { cfg = loadYaml(readText(sh, abs)); } catch (e) { return fail('gitlab-runner: YAML error, ' + e.message.split('\n')[0]); }
    const job = (cfg || {})[o.file];
    if (!job || typeof job !== 'object' || !job.script) return fail(`gitlab-runner: job '${o.file}' not found in .gitlab-ci.yml, jobs are [${glJobs(cfg || {}).map(([k]) => k).join(', ')}]`);
    SIMC_STATE.runNumber++;
    const branch = refToBranch(o.ref || 'main');
    const run = { workflow: '.gitlab-ci.yml', file: '.gitlab-ci.yml', kind: 'gitlab', event: 'exec', ref: 'refs/heads/' + branch, sha: hash('glx' + SIMC_STATE.runNumber, 160), runNumber: SIMC_STATE.runNumber, status: 'success', jobs: [], artifacts: [], notes: ['only/except not evaluated by exec'], startedAt: LAB.util.now() };
    const vars = {}; Object.entries(cfg.variables || {}).forEach(([k, v]) => { vars[k] = v && typeof v === 'object' ? String(v.value) : String(v); });
    const buf = [];
    const rec = glRunJob(sh, root, cfg, o.file, job, vars, branch, buf, run, o);
    run.status = rec.status; run.finishedAt = LAB.util.now();
    SIMC_STATE.runs.push(run); SIMC_STATE.last = run;
    return { out: buf.join('\n') + '\n', err: '', code: rec.status === 'failure' ? 1 : 0 };
  }
  /* make, Makefile hedeflerini kosar. Degiskenler, bagimliliklar, @ ile sessiz satir */
  function makeCmd(args) {
    const sh = this;
    let file = 'Makefile'; const targets = [];
    for (let i = 0; i < args.length; i++) { if (args[i] === '-f') file = args[++i]; else if (args[i] === '-n' || args[i] === '-s' || args[i] === '-k') { /* yok say */ } else if (!args[i].startsWith('-')) targets.push(args[i]); }
    const text = readText(sh, sh.resolve(file));
    if (text === null) return fail(`make: *** No rule to make target '${targets[0] || 'all'}'.  Stop.\nmake: ${file}: No such file or directory`, 2);
    const vars = {}; const rules = {}; let order = []; let cur = null;
    for (const raw of text.split('\n')) {
      if (/^\t/.test(raw) && cur) { rules[cur].recipe.push(raw.slice(1)); continue; }
      const line = raw.replace(/#.*$/, '').trimEnd(); if (!line.trim()) continue;
      let m;
      if ((m = /^([A-Za-z_][\w]*)\s*[:?]?=\s*(.*)$/.exec(line))) { vars[m[1]] = m[2].trim(); continue; }
      if ((m = /^([^\s:]+(?:\s+[^\s:]+)*)\s*:(?!=)\s*(.*)$/.exec(line))) { for (const t of m[1].split(/\s+/)) { if (!rules[t]) { rules[t] = { deps: [], recipe: [] }; if (!t.startsWith('.')) order.push(t); } rules[t].deps.push(...m[2].split(/\s+/).filter(Boolean)); cur = t; } continue; }
    }
    const expand = str => str.replace(/\$\(([\w]+)\)|\$\{([\w]+)\}/g, (x, a, b) => { const k = a || b; return vars[k] !== undefined ? vars[k] : (sh.env[k] || ''); }).replace(/\$\$/g, '$');
    const out = []; const err = [];
    const done = new Set();
    const run = t => {
      if (done.has(t)) return 0; done.add(t);
      const r = rules[t];
      if (!r) { if (sh.node(sh.resolve(t))) return 0; err.push(`make: *** No rule to make target '${t}'.  Stop.`); return 2; }
      for (const d of r.deps) { const c = run(d); if (c) return c; }
      for (let i = 0; i < r.recipe.length; i++) {
        let cmd = expand(r.recipe[i]); let quiet = false, ignore = false;
        while (cmd.startsWith('@') || cmd.startsWith('-')) { if (cmd.startsWith('@')) quiet = true; else ignore = true; cmd = cmd.slice(1); }
        if (!quiet) out.push(cmd);
        const code = sh.execList(cmd, (x, cls) => (cls === 'err' ? err : out).push(x.replace(/\n$/, '')));
        if (code && !ignore) { err.push(`make: *** [${file}: ${t}] Error ${code}`); return code; }
      }
      return 0;
    };
    const goals = targets.length ? targets : (vars['.DEFAULT_GOAL'] ? [vars['.DEFAULT_GOAL']] : order.slice(0, 1));
    if (!goals.length) return fail('make: *** No targets.  Stop.', 2);
    let code = 0;
    for (const g of goals) { code = run(g); if (code) break; }
    return { out: out.length ? out.join('\n') + '\n' : '', err: err.length ? err.join('\n') + '\n' : '', code };
  }
  registerExt({
    commands: { ci: ciCmd, act: actCmd, 'gitlab-runner': gitlabRunnerCmd, make: makeCmd },
    manual: {
      ci: { d: 'Lab CI kosucusu. GitHub Actions workflow\'larini ve .gitlab-ci.yml pipeline\'ini sanal shell\'de calistirir, GitHub Actions log formatinda yazar. Secrets ~/.ci/secrets.env dosyasindan gelir', u: ['ci run [workflow.yml] [--job ad] [--event push|pull_request|workflow_dispatch] [--ref refs/heads/main] [--input k=v]', 'ci list', 'ci last', 'ci runs', 'ci secrets', 'ci cache clear'], e: ['cd ~/netauto && ci run', 'ci run .github/workflows/ci.yml --job test', 'ci run --ref refs/heads/feature/x', 'ci run .github/workflows/release.yml --event workflow_dispatch --input version=1.2.0', 'ci run .gitlab-ci.yml'] },
      act: { d: 'GitHub Actions\'i yerelde kosan act aracinin lab surumu, ci run ile ayni motor', u: ['act [push|pull_request|workflow_dispatch] [-j job] [-W workflow.yml]', 'act -l'], e: ['act', 'act -j test', 'act pull_request -W .github/workflows/ci.yml'] },
      make: { d: 'Makefile hedeflerini kosar, bagimliliklar ve degiskenler desteklenir', u: ['make [hedef]', 'make -f dosya hedef'], e: ['make test', 'make lint build'] },
      'gitlab-runner': { d: 'GitLab CI job\'unu yerelde kosar, .gitlab-ci.yml icindeki tek bir job\'u shell executor ile calistirir', u: ['gitlab-runner exec shell <job> [--ref branch] [--env K=V]', 'gitlab-runner --version'], e: ['gitlab-runner exec shell test', 'gitlab-runner exec shell deploy --ref main', 'ci run .gitlab-ci.yml'] },
    },
    onReset: () => { SIMC_STATE.last = null; SIMC_STATE.runs = []; SIMC_STATE.cache = {}; SIMC_STATE.runNumber = 0; SIMC_STATE.artifacts = []; },
  });
})();
