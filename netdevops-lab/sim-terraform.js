'use strict';
/* Terraform simulatoru. HCL alt kumesi parser, plan ve apply motoru, lab provider'i LAB.devices uzerinden
   IOS satirlari uretir. State terraform.tfstate dosyasinda JSON olarak durur. LAB.tf.last gorev kontrolleri icin dolar. */

const SIMTF_VERSION = '1.9.5';
const SIMTF_PROVIDER_VERSION = '1.2.0';
const SIMTF_PROVIDER_ADDR = 'registry.terraform.io/lab/lab';
const SIMTF_RULE = '─'.repeat(77);

class SimtfError extends Error { constructor(title, detail, where) { super(title); this.title = title; this.detail = detail || ''; this.where = where || null; } }
class SimtfUnknown { constructor(type) { this.type = type || 'string'; } }
const simtfIsUnknown = v => v instanceof SimtfUnknown;
class SimtfSensitive { constructor(v) { this.v = v; } }

/* ---------- lexer ---------- */
function simtfLex(src, file) {
  const toks = []; let i = 0; let line = 1;
  const push = (t, v, extra) => toks.push(Object.assign({ t, v, line }, extra || {}));
  const err = (msg) => { throw new SimtfError('Invalid character', msg, { file, line }); };
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { push('nl', '\n'); line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '#' || (c === '/' && src[i + 1] === '/')) { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); const seg = src.slice(i, j < 0 ? src.length : j + 2); line += (seg.match(/\n/g) || []).length; i = j < 0 ? src.length : j + 2; continue; }
    if (c === '<' && src[i + 1] === '<') {
      const m = /^<<(-?)([A-Za-z_][A-Za-z0-9_]*)\r?\n/.exec(src.slice(i));
      if (!m) err('Unterminated heredoc');
      const indent = m[1] === '-'; const tag = m[2]; let j = i + m[0].length; const bodyLines = []; let closed = false;
      while (j <= src.length) { let k = src.indexOf('\n', j); if (k < 0) k = src.length; const l = src.slice(j, k); if (l.trim() === tag) { closed = true; j = k; break; } bodyLines.push(l); j = k + 1; if (k >= src.length) break; }
      if (!closed) throw new SimtfError('Unterminated template string', `The heredoc marker "${tag}" was not found before the end of the file.`, { file, line });
      let body = bodyLines;
      if (indent) { const minI = Math.min(...body.filter(l => l.trim()).map(l => l.length - l.replace(/^[ \t]+/, '').length), 0); const mi = body.filter(l => l.trim()).length ? Math.min(...body.filter(l => l.trim()).map(l => l.length - l.replace(/^[ \t]+/, '').length)) : 0; body = body.map(l => l.slice(mi)); void minI; }
      push('tpl', body.join('\n') + (body.length ? '\n' : ''), { heredoc: tag });
      line += m[0].match(/\n/g).length + bodyLines.length; i = j; continue;
    }
    if (c === '"') {
      let j = i + 1; let s = ''; let depth = 0;
      while (j < src.length) {
        const ch = src[j];
        if (depth === 0 && ch === '"') break;
        if (ch === '\\' && depth === 0) { const e = src[j + 1]; s += '\\' + e; j += 2; continue; }
        if (ch === '$' && src[j + 1] === '$' && src[j + 2] === '{') { s += '$${'; j += 3; continue; }
        if (ch === '$' && src[j + 1] === '{') { depth++; s += '${'; j += 2; continue; }
        if (ch === '%' && src[j + 1] === '{') { depth++; s += '%{'; j += 2; continue; }
        if (ch === '{' && depth > 0) depth++;
        if (ch === '}' && depth > 0) depth--;
        if (ch === '\n') throw new SimtfError('Invalid multi-line string', 'Quoted strings may not be split over multiple lines. To produce a multi-line string, either use the \\n escape to represent a newline character or use the "heredoc" multi-line template syntax.', { file, line });
        s += ch; j++;
      }
      if (j >= src.length) throw new SimtfError('Unterminated template string', 'No closing marker was found for the string.', { file, line });
      push('tpl', s); i = j + 1; continue;
    }
    let m;
    if ((m = /^\d+(\.\d+)?([eE][-+]?\d+)?/.exec(src.slice(i)))) { push('num', Number(m[0])); i += m[0].length; continue; }
    if ((m = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(src.slice(i)))) { push('id', m[0]); i += m[0].length; continue; }
    if ((m = /^(=>|==|!=|<=|>=|&&|\|\||\.\.\.|[-+*\/%!<>=?:.,\[\]{}()])/.exec(src.slice(i)))) { push('op', m[0]); i += m[0].length; continue; }
    err(`This character is not used within the language.`);
  }
  push('eof', null);
  return toks;
}
/* sablon (dize) parcalari: "a ${expr} b" -> [{text},{expr}] ve %{ if } %{ for } */
function simtfParseTemplate(s, file, line, heredoc) {
  const parts = []; let i = 0; let text = '';
  const unesc = t => (heredoc ? t : t.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  while (i < s.length) {
    if (s[i] === '$' && s[i + 1] === '$' && s[i + 2] === '{') { text += '${'; i += 3; continue; }
    if ((s[i] === '$' || s[i] === '%') && s[i + 1] === '{') {
      const kind = s[i]; let j = i + 2; let depth = 1; let q = false;
      while (j < s.length && depth > 0) { const ch = s[j]; if (q) { if (ch === '\\') j++; else if (ch === '"') q = false; } else if (ch === '"') q = true; else if (ch === '{') depth++; else if (ch === '}') depth--; j++; }
      if (depth !== 0) throw new SimtfError('Invalid template interpolation value', 'Missing closing brace in template interpolation.', { file, line });
      let inner = s.slice(i + 2, j - 1); let strip = [false, false];
      if (inner.startsWith('~')) { strip[0] = true; inner = inner.slice(1); } if (inner.endsWith('~')) { strip[1] = true; inner = inner.slice(0, -1); }
      if (text) { parts.push({ k: 'text', v: unesc(text) }); text = ''; }
      if (strip[0] && parts.length && parts[parts.length - 1].k === 'text') parts[parts.length - 1].v = parts[parts.length - 1].v.replace(/\s+$/, '');
      if (kind === '$') parts.push({ k: 'expr', e: simtfParseExprSrc(inner.trim(), file, line), strip });
      else parts.push({ k: 'directive', src: inner.trim(), strip });
      i = j;
      if (strip[1]) { while (i < s.length && /\s/.test(s[i])) i++; }
      continue;
    }
    text += s[i]; i++;
  }
  if (text) parts.push({ k: 'text', v: unesc(text) });
  return simtfBuildDirectives(parts, file, line);
}
function simtfBuildDirectives(parts, file, line) {
  let p = 0;
  const block = (stops) => {
    const nodes = [];
    while (p < parts.length) {
      const x = parts[p];
      if (x.k === 'directive') { const kw = x.src.split(/\s+/)[0]; if (stops.includes(kw)) return { nodes, stop: kw, src: x.src }; }
      p++;
      if (x.k !== 'directive') { nodes.push(x); continue; }
      const kw = x.src.split(/\s+/)[0]; const rest = x.src.slice(kw.length).trim();
      if (kw === 'if') {
        const branches = []; let cond = simtfParseExprSrc(rest, file, line); let els = null;
        for (;;) { const b = block(['else', 'endif']); if (!b.stop) throw new SimtfError('Unterminated template directive', 'Missing endif.', { file, line }); branches.push({ cond, body: b.nodes }); p++; if (b.stop === 'else') { const e = block(['endif']); if (!e.stop) throw new SimtfError('Unterminated template directive', 'Missing endif.', { file, line }); els = e.nodes; p++; } break; }
        nodes.push({ k: 'if', branches, els }); continue;
      }
      if (kw === 'for') {
        const m = /^([A-Za-z_]\w*)(?:\s*,\s*([A-Za-z_]\w*))?\s+in\s+([\s\S]+)$/.exec(rest);
        if (!m) throw new SimtfError('Invalid for directive', rest, { file, line });
        const b = block(['endfor']); if (!b.stop) throw new SimtfError('Unterminated template directive', 'Missing endfor.', { file, line }); p++;
        nodes.push({ k: 'for', vars: m[2] ? [m[1], m[2]] : [m[1]], iter: simtfParseExprSrc(m[3], file, line), body: b.nodes }); continue;
      }
      throw new SimtfError('Invalid template directive', `Unknown directive "${kw}".`, { file, line });
    }
    return { nodes, stop: null };
  };
  return block([]).nodes;
}
function simtfParseExprSrc(src, file, line) { const toks = simtfLex(src, file).filter(t => t.t !== 'nl'); toks.forEach(t => { t.line = line; }); const P = new SimtfParser(toks, file); const e = P.expr(); if (P.peek().t !== 'eof') throw new SimtfError('Invalid expression', `Extra characters after expression: ${P.peek().v}`, { file, line }); return e; }

/* ---------- parser ---------- */
class SimtfParser {
  constructor(toks, file) { this.toks = toks; this.p = 0; this.file = file; }
  peek(o) { return this.toks[this.p + (o || 0)]; }
  take() { return this.toks[this.p++]; }
  isOp(v) { const t = this.peek(); return t.t === 'op' && t.v === v; }
  skipNl() { while (this.peek().t === 'nl') this.p++; }
  expectOp(v, what) { const t = this.take(); if (t.t !== 'op' || t.v !== v) throw new SimtfError(what || 'Invalid expression', `Expected "${v}" but found ${t.t === 'eof' ? 'end of file' : JSON.stringify(t.v === '\n' ? 'newline' : t.v)}.`, { file: this.file, line: t.line }); return t; }
  body(stopBrace) {
    const attrs = {}; const blocks = []; const order = [];
    for (;;) {
      this.skipNl();
      const t = this.peek();
      if (t.t === 'eof') { if (stopBrace) throw new SimtfError('Unclosed configuration block', 'There is no closing brace for this block before the end of the file. This may be caused by incorrect brace nesting elsewhere in this file.', { file: this.file, line: stopBrace.line }); return { attrs, blocks, order }; }
      if (t.t === 'op' && t.v === '}') { if (!stopBrace) throw new SimtfError('Argument or block definition required', 'An argument or block definition is required here.', { file: this.file, line: t.line }); this.take(); return { attrs, blocks, order }; }
      if (t.t !== 'id') throw new SimtfError('Argument or block definition required', 'An argument or block definition is required here.', { file: this.file, line: t.line });
      const name = this.take();
      if (this.isOp('=')) {
        this.take(); const e = this.expr();
        if (attrs[name.v]) throw new SimtfError('Attribute redefined', `The argument "${name.v}" was already set at ${this.file}:${attrs[name.v].line}. Each argument may be set only once.`, { file: this.file, line: name.line });
        attrs[name.v] = { e, line: name.line }; order.push({ kind: 'attr', name: name.v });
        const n = this.peek(); if (n.t !== 'nl' && n.t !== 'eof' && !(n.t === 'op' && n.v === '}')) throw new SimtfError('Missing newline after argument', 'An argument definition must end with a newline.', { file: this.file, line: n.line });
        continue;
      }
      const labels = [];
      while (this.peek().t === 'tpl' || this.peek().t === 'id') { const l = this.take(); labels.push(l.v); }
      if (!this.isOp('{')) { const n = this.peek(); throw new SimtfError(labels.length ? 'Invalid block definition' : 'Argument or block definition required', labels.length ? 'A block definition must have block content delimited by "{" and "}", starting on the same line as the block header.' : `Either a quoted string block label or an opening brace ("{") is expected here.${n.t === 'op' && n.v === ':' ? ' Did you mean "="?' : ''}`, { file: this.file, line: n.line }); }
      const brace = this.take();
      if (this.peek().t === 'nl' || (this.peek().t === 'op' && this.peek().v === '}')) {
        const b = this.body(brace);
        blocks.push({ type: name.v, labels, body: b, line: name.line }); order.push({ kind: 'block', idx: blocks.length - 1});
      } else {
        const b = this.body(brace);
        blocks.push({ type: name.v, labels, body: b, line: name.line }); order.push({ kind: 'block', idx: blocks.length - 1 });
      }
    }
  }
  expr() { return this.cond(); }
  cond() {
    const a = this.or();
    if (this.isOp('?')) { this.take(); this.skipNl(); const b = this.expr(); this.skipNl(); this.expectOp(':'); this.skipNl(); const c = this.expr(); return { k: 'cond', a, b, c, line: a.line }; }
    return a;
  }
  bin(next, ops) { let a = next.call(this); while (this.peek().t === 'op' && ops.includes(this.peek().v)) { const op = this.take().v; this.skipNl(); const b = next.call(this); a = { k: 'bin', op, a, b, line: a.line }; } return a; }
  or() { return this.bin(this.and, ['||']); }
  and() { return this.bin(this.eq, ['&&']); }
  eq() { return this.bin(this.cmp, ['==', '!=']); }
  cmp() { return this.bin(this.add, ['<', '>', '<=', '>=']); }
  add() { return this.bin(this.mul, ['+', '-']); }
  mul() { return this.bin(this.unary, ['*', '/', '%']); }
  unary() { if (this.isOp('-') || this.isOp('!')) { const op = this.take(); const a = this.unary(); return { k: 'unary', op: op.v, a, line: op.line }; } return this.postfix(); }
  postfix() {
    let a = this.primary();
    for (;;) {
      if (this.isOp('.')) {
        this.take(); const t = this.take();
        if (t.t === 'op' && t.v === '*') { a = { k: 'splat', a, line: a.line }; continue; }
        if (t.t === 'id' || t.t === 'num') { a = { k: 'attr', a, name: String(t.v), line: a.line }; continue; }
        throw new SimtfError('Invalid attribute name', 'An attribute name is required after a dot.', { file: this.file, line: t.line });
      }
      if (this.isOp('[')) {
        const br = this.take();
        if (this.isOp('*')) { this.take(); this.expectOp(']'); a = { k: 'splat', a, line: a.line }; continue; }
        this.skipNl(); const idx = this.expr(); this.skipNl(); this.expectOp(']'); a = { k: 'index', a, idx, line: br.line }; continue;
      }
      if (this.isOp('(') && a.k === 'var' && !a.scoped) {
        this.take(); const args = []; let expand = false;
        this.skipNl();
        while (!this.isOp(')')) { args.push(this.expr()); this.skipNl(); if (this.isOp('...')) { this.take(); expand = true; this.skipNl(); } if (this.isOp(',')) { this.take(); this.skipNl(); } else break; }
        this.skipNl(); this.expectOp(')', 'Unterminated function call');
        a = { k: 'call', name: a.name, args, expand, line: a.line }; continue;
      }
      break;
    }
    return a;
  }
  primary() {
    const t = this.take();
    if (t.t === 'num') return { k: 'lit', v: t.v, line: t.line };
    if (t.t === 'tpl') return { k: 'tpl', parts: simtfParseTemplate(t.v, this.file, t.line, !!t.heredoc), line: t.line, raw: t.v };
    if (t.t === 'id') {
      if (t.v === 'true') return { k: 'lit', v: true, line: t.line };
      if (t.v === 'false') return { k: 'lit', v: false, line: t.line };
      if (t.v === 'null') return { k: 'lit', v: null, line: t.line };
      return { k: 'var', name: t.v, line: t.line };
    }
    if (t.t === 'op' && t.v === '(') { this.skipNl(); const e = this.expr(); this.skipNl(); this.expectOp(')'); return e; }
    if (t.t === 'op' && t.v === '[') {
      this.skipNl();
      if (this.peek().t === 'id' && this.peek().v === 'for') return this.forExpr(t, ']');
      const items = [];
      while (!this.isOp(']')) { items.push(this.expr()); this.skipNl(); if (this.isOp(',')) { this.take(); this.skipNl(); } else { this.skipNl(); if (!this.isOp(']')) throw new SimtfError('Missing item separator', 'Expected a comma to mark the beginning of the next item.', { file: this.file, line: this.peek().line }); } }
      this.take(); return { k: 'list', items, line: t.line };
    }
    if (t.t === 'op' && t.v === '{') {
      this.skipNl();
      if (this.peek().t === 'id' && this.peek().v === 'for') return this.forExpr(t, '}');
      const pairs = [];
      while (!this.isOp('}')) {
        let key;
        if (this.peek().t === 'id' && !(this.peek(1).t === 'op' && (this.peek(1).v === '.' || this.peek(1).v === '['))) { const kt = this.take(); key = { k: 'lit', v: kt.v, line: kt.line }; }
        else if (this.isOp('(')) { this.take(); key = this.expr(); this.expectOp(')'); }
        else key = this.expr();
        if (!(this.isOp('=') || this.isOp(':'))) throw new SimtfError('Missing attribute value', 'Expected an attribute value, introduced by an equals sign ("=").', { file: this.file, line: this.peek().line });
        this.take(); this.skipNl(); const val = this.expr(); pairs.push({ key, val }); this.skipNl();
        if (this.isOp(',')) { this.take(); this.skipNl(); }
      }
      this.take(); return { k: 'obj', pairs, line: t.line };
    }
    if (t.t === 'eof') throw new SimtfError('Missing expression', 'Expected the start of an expression, but found the end of the file.', { file: this.file, line: t.line });
    if (t.t === 'nl') throw new SimtfError('Missing expression', 'Expected the start of an expression, but found a newline.', { file: this.file, line: t.line });
    throw new SimtfError('Invalid expression', `Expected the start of an expression, but found an invalid expression token${t.v ? ' "' + t.v + '"' : ''}.`, { file: this.file, line: t.line });
  }
  forExpr(open, close) {
    this.take(); const v1 = this.take(); let v2 = null;
    if (this.isOp(',')) { this.take(); v2 = this.take(); }
    const inKw = this.take(); if (!(inKw.t === 'id' && inKw.v === 'in')) throw new SimtfError('Invalid for expression', 'Expected "in" keyword.', { file: this.file, line: inKw.line });
    const coll = this.expr(); this.expectOp(':'); this.skipNl();
    const val = this.expr(); let keyE = null; let group = false;
    if (close === '}') { this.expectOp('=>'); this.skipNl(); keyE = val; const vv = this.expr(); if (this.isOp('...')) { this.take(); group = true; } return this.forTail(open, close, v1, v2, coll, vv, keyE, group); }
    return this.forTail(open, close, v1, v2, coll, val, null, false);
  }
  forTail(open, close, v1, v2, coll, val, keyE, group) {
    let cond = null; this.skipNl();
    if (this.peek().t === 'id' && this.peek().v === 'if') { this.take(); cond = this.expr(); }
    this.skipNl(); this.expectOp(close);
    return { k: 'for', vars: v2 ? [v1.v, v2.v] : [v1.v], coll, val, key: keyE, cond, group, isMap: close === '}', line: open.line };
  }
}
function simtfParseFile(src, file) {
  const toks = simtfLex(src, file); const P = new SimtfParser(toks, file);
  return P.body(null);
}

/* ---------- degerlendirme ---------- */
function simtfTypeName(v) { if (v === null || v === undefined) return 'null'; if (simtfIsUnknown(v)) return v.type; if (v instanceof SimtfSensitive) return simtfTypeName(v.v); if (typeof v === 'string') return 'string'; if (typeof v === 'number') return 'number'; if (typeof v === 'boolean') return 'bool'; if (Array.isArray(v)) return 'list'; if (v && v.__set) return 'set'; return 'object'; }
function simtfPlain(v) { return v instanceof SimtfSensitive ? v.v : v; }
function simtfTruthy(v, line) { v = simtfPlain(v); if (typeof v === 'boolean') return v; if (v === 'true') return true; if (v === 'false') return false; throw new SimtfError('Incorrect condition type', `The condition expression must be of type bool, not ${simtfTypeName(v)}.`, line); }
function simtfToStr(v, where) {
  v = simtfPlain(v);
  if (simtfIsUnknown(v)) return v;
  if (typeof v === 'string') return v; if (typeof v === 'number') return String(v); if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v === null || v === undefined) throw new SimtfError('Invalid template interpolation value', 'The expression result is null. Cannot include a null value in a string template.', where);
  throw new SimtfError('Invalid template interpolation value', `Cannot include the given value in a string template: string required.`, where);
}
function simtfToNum(v, where) { v = simtfPlain(v); if (simtfIsUnknown(v)) return v; if (typeof v === 'number') return v; if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v); throw new SimtfError('Invalid operand', `Unsuitable value for left operand: a number is required.`, where); }
function simtfEq(a, b) { a = simtfPlain(a); b = simtfPlain(b); if (typeof a === 'number' && typeof b === 'string') return a === Number(b); if (typeof b === 'number' && typeof a === 'string') return b === Number(a); if (a && b && typeof a === 'object' && typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b); return a === b; }
function simtfEval(e, scope) {
  const where = { file: scope.file, line: e.line };
  switch (e.k) {
    case 'lit': return e.v;
    case 'tpl': {
      if (e.parts.length === 1 && e.parts[0].k === 'expr' && !e.raw.startsWith('"')) { /* tek interpolasyon */ }
      const out = []; let unknown = false;
      const render = (nodes, sc) => {
        for (const p of nodes) {
          if (p.k === 'text') out.push(p.v);
          else if (p.k === 'expr') { const v = simtfEval(p.e, sc); if (simtfIsUnknown(v)) { unknown = true; continue; } out.push(simtfToStr(v, where)); }
          else if (p.k === 'if') { let done = false; for (const b of p.branches) { if (simtfTruthy(simtfEval(b.cond, sc), where)) { render(b.body, sc); done = true; break; } } if (!done && p.els) render(p.els, sc); }
          else if (p.k === 'for') { let it = simtfPlain(simtfEval(p.iter, sc)); const entries = Array.isArray(it) ? it.map((v, i) => [i, v]) : Object.entries(it || {}); for (const [k, v] of entries) { const sc2 = simtfChild(sc, p.vars.length === 2 ? { [p.vars[0]]: k, [p.vars[1]]: v } : { [p.vars[0]]: v }); render(p.body, sc2); } }
        }
      };
      if (e.parts.length === 1 && e.parts[0].k === 'expr') { const v = simtfEval(e.parts[0].e, scope); if (simtfIsUnknown(v)) return v; if (typeof v !== 'string' && (typeof v === 'object' && v !== null)) { throw new SimtfError('Invalid template interpolation value', `Cannot include the given value in a string template: string required.`, where); } return simtfToStr(v, where); }
      render(e.parts, scope);
      return unknown ? new SimtfUnknown('string') : out.join('');
    }
    case 'var': return simtfLookupVar(e, scope);
    case 'attr': { const o = simtfEval(e.a, scope); return simtfGetAttr(o, e.name, where, e); }
    case 'index': { const o = simtfPlain(simtfEval(e.a, scope)); const i = simtfPlain(simtfEval(e.idx, scope)); if (simtfIsUnknown(o) || simtfIsUnknown(i)) return new SimtfUnknown(); if (Array.isArray(o)) { const n = Number(i); if (!Number.isInteger(n)) throw new SimtfError('Invalid index', 'The given key does not identify an element in this collection value: a number is required.', where); if (n < 0 || n >= o.length) throw new SimtfError('Invalid index', `The given key does not identify an element in this collection value: the given index is greater than or equal to the length of the collection.`, where); return o[n]; } if (o && typeof o === 'object') { if (!Object.prototype.hasOwnProperty.call(o, String(i))) throw new SimtfError('Invalid index', `The given key does not identify an element in this collection value.`, where); return o[String(i)]; } throw new SimtfError('Invalid index', `This value does not have any indices.`, where); }
    case 'splat': { const o = simtfPlain(simtfEval(e.a, scope)); if (simtfIsUnknown(o)) return o; if (Array.isArray(o)) return o; if (o && typeof o === 'object') return Object.values(o); return o === null ? [] : [o]; }
    case 'call': if (e.name === 'try' || e.name === 'can') return simtfEvalTry(e, scope); return simtfCall(e, scope);
    case 'unary': { const v = simtfPlain(simtfEval(e.a, scope)); if (simtfIsUnknown(v)) return v; if (e.op === '-') return -simtfToNum(v, where); return !simtfTruthy(v, where); }
    case 'bin': {
      const a = simtfPlain(simtfEval(e.a, scope));
      if (e.op === '&&') { if (simtfIsUnknown(a)) return new SimtfUnknown('bool'); if (!simtfTruthy(a, where)) return false; const b = simtfPlain(simtfEval(e.b, scope)); return simtfIsUnknown(b) ? b : simtfTruthy(b, where); }
      if (e.op === '||') { if (simtfIsUnknown(a)) return new SimtfUnknown('bool'); if (simtfTruthy(a, where)) return true; const b = simtfPlain(simtfEval(e.b, scope)); return simtfIsUnknown(b) ? b : simtfTruthy(b, where); }
      const b = simtfPlain(simtfEval(e.b, scope));
      if (simtfIsUnknown(a) || simtfIsUnknown(b)) return new SimtfUnknown(['==', '!=', '<', '>', '<=', '>='].includes(e.op) ? 'bool' : 'number');
      switch (e.op) {
        case '==': return simtfEq(a, b); case '!=': return !simtfEq(a, b);
        case '<': return simtfToNum(a, where) < simtfToNum(b, where); case '>': return simtfToNum(a, where) > simtfToNum(b, where); case '<=': return simtfToNum(a, where) <= simtfToNum(b, where); case '>=': return simtfToNum(a, where) >= simtfToNum(b, where);
        case '+': return simtfToNum(a, where) + simtfToNum(b, where); case '-': return simtfToNum(a, where) - simtfToNum(b, where); case '*': return simtfToNum(a, where) * simtfToNum(b, where);
        case '/': { const d = simtfToNum(b, where); if (d === 0) throw new SimtfError('Error in function call', 'Call to function "/" failed: divide by zero.', where); return simtfToNum(a, where) / d; }
        case '%': return simtfToNum(a, where) % simtfToNum(b, where);
      }
      throw new SimtfError('Invalid operator', e.op, where);
    }
    case 'cond': { const c = simtfPlain(simtfEval(e.a, scope)); if (simtfIsUnknown(c)) return new SimtfUnknown(); return simtfTruthy(c, where) ? simtfEval(e.b, scope) : simtfEval(e.c, scope); }
    case 'list': return e.items.map(x => simtfEval(x, scope));
    case 'obj': { const o = {}; for (const p of e.pairs) { const k = simtfPlain(simtfEval(p.key, scope)); o[simtfToStr(k, where)] = simtfEval(p.val, scope); } return o; }
    case 'for': {
      let coll = simtfPlain(simtfEval(e.coll, scope));
      if (simtfIsUnknown(coll)) return new SimtfUnknown(e.isMap ? 'object' : 'list');
      if (coll === null) throw new SimtfError('Iteration over null value', 'A null value cannot be used as the collection in a \'for\' expression.', where);
      const entries = Array.isArray(coll) ? coll.map((v, i) => [i, v]) : (coll && coll.__set ? coll.items.map(v => [v, v]) : Object.entries(coll));
      const outL = []; const outM = {};
      for (const [k, v] of entries) {
        const sc = simtfChild(scope, e.vars.length === 2 ? { [e.vars[0]]: k, [e.vars[1]]: v } : { [e.vars[0]]: v });
        if (e.cond) { const c = simtfPlain(simtfEval(e.cond, sc)); if (simtfIsUnknown(c)) return new SimtfUnknown(); if (!simtfTruthy(c, where)) continue; }
        if (e.isMap) { const kk = simtfToStr(simtfPlain(simtfEval(e.key, sc)), where); const vv = simtfEval(e.val, sc); if (e.group) (outM[kk] = outM[kk] || []).push(vv); else { if (Object.prototype.hasOwnProperty.call(outM, kk)) throw new SimtfError('Duplicate object key', `Two different items produced the key "${kk}" in this 'for' expression. If duplicates are expected, use the ellipsis (...) after the value expression to enable grouping by key.`, where); outM[kk] = vv; } }
        else outL.push(simtfEval(e.val, sc));
      }
      return e.isMap ? outM : outL;
    }
    default: throw new SimtfError('Invalid expression', `unknown node ${e.k}`, where);
  }
}
function simtfChild(scope, vars) { return Object.assign(Object.create(scope), { locals: Object.assign({}, scope.locals || {}, vars), file: scope.file }); }
function simtfGetAttr(o, name, where, e) {
  o = simtfPlain(o);
  if (simtfIsUnknown(o)) return new SimtfUnknown();
  if (Array.isArray(o)) { if (/^\d+$/.test(name)) return o[Number(name)]; throw new SimtfError('Unsupported attribute', `Can't access attributes on a list of objects. Did you mean to access attribute "${name}" for a specific element of the list, or across all elements of the list?`, where); }
  if (o && typeof o === 'object' && o.__simtfProxy) return o[name];
  if (o && typeof o === 'object') { if (o.__set) throw new SimtfError('Unsupported attribute', `Can't access attributes on a set of objects.`, where); if (Object.prototype.hasOwnProperty.call(o, name)) return o[name]; if (o.__resource) throw new SimtfError('Unsupported attribute', `This object has no argument, nested block, or exported attribute named "${name}".`, where); if (o.__module) throw new SimtfError('Unsupported attribute', `This object does not have an attribute named "${name}".`, where); throw new SimtfError('Unsupported attribute', `This object does not have an attribute named "${name}".`, where); }
  if (o === null) throw new SimtfError('Attempt to get attribute from null value', `This value is null, so it does not have any attributes.`, where);
  throw new SimtfError('Unsupported attribute', `Can't access attributes on a primitive-typed value (${simtfTypeName(o)}).`, where);
}
function simtfLookupVar(e, scope) {
  const where = { file: scope.file, line: e.line }; const n = e.name;
  if (scope.locals && Object.prototype.hasOwnProperty.call(scope.locals, n)) return scope.locals[n];
  if (n === 'var') return scope.ctx.varsProxy(where);
  if (n === 'local') return scope.ctx.localsProxy(where);
  if (n === 'data') return scope.ctx.dataProxy(where);
  if (n === 'module') return scope.ctx.moduleProxy(where);
  if (n === 'each') { if (!scope.each) throw new SimtfError('Reference to "each" in context without for_each', 'The "each" object can be used only in "module" or "resource" blocks, and only when the "for_each" argument is set.', where); return scope.each; }
  if (n === 'count') { if (!scope.count) throw new SimtfError('Reference to "count" in non-counted context', 'The "count" object can only be used in "module", "resource", and "data" blocks, and only when the "count" argument is set.', where); return scope.count; }
  if (n === 'path') return { module: scope.ctx.dir, root: scope.ctx.rootDir, cwd: scope.ctx.cwd };
  if (n === 'terraform') return { workspace: scope.ctx.workspace };
  if (n === 'self') { if (!scope.self) throw new SimtfError('Invalid "self" reference', '"self" can only be used in provisioner and connection blocks.', where); return scope.self; }
  if (scope.ctx.resourceTypes().includes(n)) return scope.ctx.resourceProxy(n, where);
  throw new SimtfError('Invalid reference', `A reference to a resource type must be followed by at least one attribute access, specifying the resource name.`, where);
}
function simtfSet(items) { const seen = []; items.forEach(x => { if (!seen.some(y => simtfEq(x, y))) seen.push(x); }); return { __set: true, items: seen }; }
function simtfIter(v, where, fname) { v = simtfPlain(v); if (Array.isArray(v)) return v; if (v && v.__set) return v.items; if (v && typeof v === 'object') return Object.values(v); throw new SimtfError('Invalid function argument', `Invalid value for "list" parameter: ${fname ? 'in ' + fname + ', ' : ''}list of values required.`, where); }
function simtfCall(e, scope) {
  const where = { file: scope.file, line: e.line };
  let args = e.args.map(a => simtfEval(a, scope));
  if (e.expand && args.length) { const last = simtfPlain(args.pop()); args = args.concat(simtfIter(last, where)); }
  const f = SIMTF_FUNCS[e.name];
  if (!f) throw new SimtfError('Call to unknown function', `There is no function named "${e.name}".`, where);
  if (e.name !== 'try' && e.name !== 'can' && args.some(a => simtfIsUnknown(simtfPlain(a))) && !['length', 'tostring', 'tolist', 'toset', 'tomap', 'merge', 'concat', 'coalesce', 'lookup', 'format', 'join', 'cidrhost', 'cidrsubnet'].includes(e.name)) return new SimtfUnknown();
  try { return f(args.map(simtfPlain), where, scope); }
  catch (err) { if (err instanceof SimtfError) throw err; throw new SimtfError('Error in function call', `Call to function "${e.name}" failed: ${err.message}.`, where); }
}
function simtfCidr(prefix, where) { const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(String(prefix)); if (!m) throw new Error(`invalid CIDR expression: ${prefix}`); const ip = m[1].split('.').reduce((n, o) => ((n << 8) >>> 0) + Number(o), 0) >>> 0; const len = Number(m[2]); const mask = len === 0 ? 0 : ((0xffffffff << (32 - len)) >>> 0); return { net: (ip & mask) >>> 0, len }; }
function simtfN2ip(n) { return [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.'); }
function simtfFmt(fmt, args) { let i = 0; return String(fmt).replace(/%([-0]*)(\d*)(?:\.(\d+))?([sdvqfteExXobg%])/g, (m, fl, w, prec, c) => { if (c === '%') return '%'; const a = args[i++]; let s; if (c === 'q') s = JSON.stringify(String(a)); else if (c === 'd') s = String(Math.trunc(Number(a))); else if (c === 'f' || c === 'e' || c === 'E' || c === 'g') s = Number(a).toFixed(prec === undefined ? 6 : Number(prec)); else if (c === 't') s = String(!!a); else if (c === 'x') s = Number(a).toString(16); else if (c === 'X') s = Number(a).toString(16).toUpperCase(); else if (c === 'o') s = Number(a).toString(8); else if (c === 'b') s = Number(a).toString(2); else { s = typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a); if (prec !== undefined && c === 's') s = s.slice(0, Number(prec)); } if (w) { const n = Number(w); s = fl.includes('-') ? s.padEnd(n) : s.padStart(n, fl.includes('0') ? '0' : ' '); } return s; }); }
function simtfDeepPlain(v) { v = simtfPlain(v); if (simtfIsUnknown(v)) return v; if (Array.isArray(v)) return v.map(simtfDeepPlain); if (v && v.__set) return v.items.map(simtfDeepPlain); if (v && typeof v === 'object') { const o = {}; Object.keys(v).forEach(k => { if (!k.startsWith('__')) o[k] = simtfDeepPlain(v[k]); }); return o; } return v; }
const SIMTF_FUNCS = {
  length: ([v], w) => { if (simtfIsUnknown(v)) return new SimtfUnknown('number'); if (typeof v === 'string') return v.length; if (Array.isArray(v)) return v.length; if (v && v.__set) return v.items.length; if (v && typeof v === 'object') return Object.keys(v).filter(k => !k.startsWith('__')).length; throw new SimtfError('Invalid function argument', 'Invalid value for "value" parameter: argument must not be null.', w); },
  lower: ([s]) => String(s).toLowerCase(), upper: ([s]) => String(s).toUpperCase(), title: ([s]) => String(s).replace(/\b\w/g, c => c.toUpperCase()),
  format: ([f, ...a]) => (a.some(simtfIsUnknown) ? new SimtfUnknown('string') : simtfFmt(f, a)), formatlist: ([f, ...a], w) => { const n = Math.max(...a.map(x => (Array.isArray(x) ? x.length : 1))); const out = []; for (let i = 0; i < n; i++) out.push(simtfFmt(f, a.map(x => (Array.isArray(x) ? x[i] : x)))); return out; },
  join: ([sep, ...lists], w) => { const items = lists.flatMap(l => simtfIter(l, w, 'join')); if (items.some(simtfIsUnknown)) return new SimtfUnknown('string'); return items.map(String).join(sep); },
  split: ([sep, s]) => (s === '' ? [] : String(s).split(sep)), replace: ([s, a, b]) => { if (/^\/.*\/$/.test(a)) return String(s).replace(new RegExp(a.slice(1, -1), 'g'), b); return String(s).split(a).join(b); },
  trimspace: ([s]) => String(s).trim(), trim: ([s, c]) => String(s).replace(new RegExp(`^[${c.replace(/[\]\\^-]/g, '\\$&')}]+|[${c.replace(/[\]\\^-]/g, '\\$&')}]+$`, 'g'), ''), trimprefix: ([s, p]) => (String(s).startsWith(p) ? s.slice(p.length) : s), trimsuffix: ([s, p]) => (String(s).endsWith(p) ? s.slice(0, -p.length) : s), chomp: ([s]) => String(s).replace(/\r?\n$/, ''),
  substr: ([s, o, l]) => String(s).substr(o, l < 0 ? undefined : l), startswith: ([s, p]) => String(s).startsWith(p), endswith: ([s, p]) => String(s).endsWith(p), strrev: ([s]) => [...String(s)].reverse().join(''), indent: ([n, s]) => String(s).split('\n').map((l, i) => (i ? ' '.repeat(n) + l : l)).join('\n'),
  regex: ([re, s], w) => { const m = new RegExp(re).exec(String(s)); if (!m) throw new SimtfError('Error in function call', `Call to function "regex" failed: pattern did not match any part of the given string.`, w); return m.length > 1 ? (m.length === 2 ? m[1] : m.slice(1)) : m[0]; }, regexall: ([re, s]) => (String(s).match(new RegExp(re, 'g')) || []),
  cidrhost: ([prefix, n], w) => { if (simtfIsUnknown(prefix) || simtfIsUnknown(n)) return new SimtfUnknown('string'); const c = simtfCidr(prefix, w); const size = Math.pow(2, 32 - c.len); if (Math.abs(n) >= size) throw new Error(`prefix of ${c.len} does not accommodate a host numbered ${n}`); return simtfN2ip((c.net + (n >= 0 ? n : size + n)) >>> 0); },
  cidrnetmask: ([prefix], w) => { const c = simtfCidr(prefix, w); return simtfN2ip(c.len === 0 ? 0 : ((0xffffffff << (32 - c.len)) >>> 0)); },
  cidrsubnet: ([prefix, newbits, netnum], w) => { if (simtfIsUnknown(prefix)) return new SimtfUnknown('string'); const c = simtfCidr(prefix, w); const nl = c.len + newbits; if (nl > 32) throw new Error(`not enough remaining address space for a subnet with a prefix of ${nl} bits after ${c.len}`); if (netnum >= Math.pow(2, newbits)) throw new Error(`prefix extension of ${newbits} does not accommodate a subnet numbered ${netnum}`); return simtfN2ip((c.net + netnum * Math.pow(2, 32 - nl)) >>> 0) + '/' + nl; },
  cidrsubnets: ([prefix, ...bits], w) => { const c = simtfCidr(prefix, w); let cur = c.net; return bits.map(b => { const nl = c.len + b; const size = Math.pow(2, 32 - nl); const r = simtfN2ip(cur >>> 0) + '/' + nl; cur += size; return r; }); },
  toset: ([v], w) => (simtfIsUnknown(v) ? v : simtfSet(simtfIter(v, w, 'toset'))), tolist: ([v], w) => (simtfIsUnknown(v) ? v : simtfIter(v, w, 'tolist').slice()), tomap: ([v], w) => { if (simtfIsUnknown(v)) return v; if (!v || typeof v !== 'object' || Array.isArray(v)) throw new SimtfError('Invalid function argument', 'Invalid value for "v" parameter: cannot convert to map.', w); return Object.assign({}, v); }, tostring: ([v]) => (simtfIsUnknown(v) ? v : v === null ? null : String(v)), tonumber: ([v], w) => { if (typeof v === 'number') return v; if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v); throw new SimtfError('Invalid function argument', `Invalid value for "v" parameter: cannot convert "${v}" to number: string must be a decimal representation of a number.`, w); }, tobool: ([v], w) => { if (typeof v === 'boolean') return v; if (v === 'true') return true; if (v === 'false') return false; throw new SimtfError('Invalid function argument', `Invalid value for "v" parameter: cannot convert "${v}" to bool: only the strings "true" or "false" are allowed.`, w); },
  merge: (maps) => { if (maps.some(simtfIsUnknown)) return new SimtfUnknown('object'); return Object.assign({}, ...maps.filter(m => m && typeof m === 'object')); },
  lookup: ([m, k, d], w) => { if (simtfIsUnknown(m)) return new SimtfUnknown(); if (m && typeof m === 'object' && Object.prototype.hasOwnProperty.call(m, String(k))) return m[String(k)]; if (d === undefined) throw new SimtfError('Error in function call', `Call to function "lookup" failed: lookup failed to find key ${JSON.stringify(String(k))}.`, w); return d; },
  concat: (lists, w) => { if (lists.some(simtfIsUnknown)) return new SimtfUnknown('list'); return lists.flatMap(l => simtfIter(l, w, 'concat')); },
  range: (a) => { let [s, e, st] = a.length === 1 ? [0, a[0], 1] : [a[0], a[1], a[2] || 1]; const o = []; for (let i = s; st > 0 ? i < e : i > e; i += st) o.push(i); return o; },
  element: ([l, i], w) => { const a = simtfIter(l, w, 'element'); if (!a.length) throw new SimtfError('Error in function call', 'Call to function "element" failed: cannot use element function with an empty list.', w); return a[((i % a.length) + a.length) % a.length]; },
  index: ([l, v], w) => { const i = simtfIter(l, w, 'index').findIndex(x => simtfEq(x, v)); if (i < 0) throw new SimtfError('Error in function call', 'Call to function "index" failed: item not found.', w); return i; },
  keys: ([m]) => Object.keys(m).filter(k => !k.startsWith('__')).sort(), values: ([m]) => Object.keys(m).filter(k => !k.startsWith('__')).sort().map(k => m[k]), contains: ([l, v], w) => simtfIter(l, w, 'contains').some(x => simtfEq(x, v)), distinct: ([l], w) => simtfIter(l, w, 'distinct').filter((x, i, a) => a.findIndex(y => simtfEq(x, y)) === i), flatten: ([l], w) => { const f = x => (Array.isArray(x) ? x.flatMap(f) : x && x.__set ? x.items.flatMap(f) : [x]); return simtfIter(l, w, 'flatten').flatMap(f); },
  sort: ([l], w) => simtfIter(l, w, 'sort').map(String).sort(), reverse: ([l], w) => simtfIter(l, w, 'reverse').slice().reverse(), compact: ([l], w) => simtfIter(l, w, 'compact').filter(x => x !== null && x !== ''), slice: ([l, s, e], w) => simtfIter(l, w, 'slice').slice(s, e), chunklist: ([l, n], w) => { const a = simtfIter(l, w, 'chunklist'); const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; },
  zipmap: ([k, v], w) => { const o = {}; simtfIter(k, w).forEach((x, i) => { o[String(x)] = simtfIter(v, w)[i]; }); return o; }, setproduct: (sets, w) => sets.map(s => simtfIter(s, w)).reduce((acc, s) => acc.flatMap(a => s.map(b => a.concat([b]))), [[]]), setunion: (sets, w) => simtfSet(sets.flatMap(s => simtfIter(s, w))), setintersection: (sets, w) => simtfSet(simtfIter(sets[0], w).filter(x => sets.every(s => simtfIter(s, w).some(y => simtfEq(x, y))))), setsubtract: ([a, b], w) => simtfSet(simtfIter(a, w).filter(x => !simtfIter(b, w).some(y => simtfEq(x, y)))),
  min: (a) => Math.min(...a), max: (a) => Math.max(...a), abs: ([n]) => Math.abs(n), ceil: ([n]) => Math.ceil(n), floor: ([n]) => Math.floor(n), pow: ([a, b]) => Math.pow(a, b), signum: ([n]) => Math.sign(n), sum: ([l], w) => simtfIter(l, w, 'sum').reduce((a, b) => a + Number(b), 0), parseint: ([s, b]) => parseInt(s, b),
  coalesce: (a, w) => { const r = a.find(x => x !== null && x !== '' && x !== undefined); if (r === undefined) throw new SimtfError('Error in function call', 'Call to function "coalesce" failed: no non-null, non-empty-string arguments.', w); return r; }, coalescelist: (a, w) => { const r = a.find(x => x && (Array.isArray(x) ? x.length : true)); if (r === undefined) throw new SimtfError('Error in function call', 'Call to function "coalescelist" failed: no non-null arguments.', w); return r; },
  alltrue: ([l], w) => simtfIter(l, w).every(x => x === true), anytrue: ([l], w) => simtfIter(l, w).some(x => x === true), one: ([l], w) => { const a = simtfIter(l, w); if (a.length > 1) throw new SimtfError('Error in function call', 'Call to function "one" failed: must be a list, set, or tuple value with either zero or one elements.', w); return a.length ? a[0] : null; },
  jsonencode: ([v]) => JSON.stringify(simtfDeepPlain(v)), jsondecode: ([s], w) => { try { return JSON.parse(s); } catch (e) { throw new SimtfError('Error in function call', `Call to function "jsondecode" failed: ${e.message}.`, w); } },
  yamlencode: ([v]) => (LAB.util.yaml() ? LAB.util.yaml().dump(simtfDeepPlain(v)) : JSON.stringify(v)), yamldecode: ([s]) => (LAB.util.yaml() ? LAB.util.yaml().load(s) : JSON.parse(s)),
  base64encode: ([s]) => btoa(unescape(encodeURIComponent(String(s)))), base64decode: ([s]) => decodeURIComponent(escape(atob(String(s)))), md5: ([s]) => simtfHash(String(s)).slice(0, 32), sha1: ([s]) => simtfHash(String(s)).slice(0, 40), sha256: ([s]) => simtfHash(String(s)), uuid: () => LAB.util.id(8) + '-' + LAB.util.id(4) + '-4' + LAB.util.id(3) + '-a' + LAB.util.id(3) + '-' + LAB.util.id(12), timestamp: () => LAB.util.now(), formatdate: ([f, t]) => String(t),
  file: ([p], w, sc) => { const r = sc.ctx.sh.readFile(simtfResolvePath(sc, p), 'terraform'); if (r.err) throw new SimtfError('Invalid function argument', `Invalid value for "path" parameter: no file exists at "${simtfResolvePath(sc, p)}"; this function works only with files that are distributed as part of the configuration source code, so if this file will be created by a resource in this configuration you must instead obtain this result from an attribute of that resource.`, w); return r.data; },
  fileexists: ([p], w, sc) => !!sc.ctx.sh.node(simtfResolvePath(sc, p)), fileset: ([d, pat], w, sc) => { const n = sc.ctx.sh.node(simtfResolvePath(sc, d)); if (!n || n.t !== 'd') return []; const re = new RegExp('^' + String(pat).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '(.*/)?').replace(/\*/g, '[^/]*') + '$'); return Object.keys(n.c).filter(f => re.test(f)).sort(); },
  templatefile: ([p, vars], w, sc) => { const abs = simtfResolvePath(sc, p); const r = sc.ctx.sh.readFile(abs, 'terraform'); if (r.err) throw new SimtfError('Invalid function argument', `Invalid value for "path" parameter: no file exists at "${abs}".`, w); const parts = simtfParseTemplate(r.data, abs, 1, true); const sc2 = Object.assign(Object.create(sc), { locals: Object.assign({}, vars || {}), file: abs }); return simtfEval({ k: 'tpl', parts, line: 1, raw: '' }, sc2); },
  abspath: ([p], w, sc) => simtfResolvePath(sc, p), basename: ([p]) => String(p).split('/').pop(), dirname: ([p]) => { const i = String(p).lastIndexOf('/'); return i < 0 ? '.' : String(p).slice(0, i); }, pathexpand: ([p]) => String(p).replace(/^~/, HOME),
  try: (a) => a[0], can: () => true, nonsensitive: ([v]) => v, sensitive: ([v]) => new SimtfSensitive(v), type: ([v]) => simtfTypeName(v), issensitive: ([v]) => v instanceof SimtfSensitive,
  transpose: ([m]) => { const o = {}; Object.entries(m).forEach(([k, vs]) => vs.forEach(v => { (o[v] = o[v] || []).push(k); })); return o; }, matchkeys: ([vals, keys, search], w) => vals.filter((v, i) => search.some(s => simtfEq(s, keys[i]))),
  urlencode: ([s]) => encodeURIComponent(String(s)), textencodebase64: ([s]) => btoa(String(s)), log: ([n, b]) => Math.log(n) / Math.log(b), plantimestamp: () => LAB.util.now(), timeadd: ([t]) => t, cidrcontains: ([p, ip], w) => { const c = simtfCidr(p, w); const n = ip.split('.').reduce((x, o) => ((x << 8) >>> 0) + Number(o), 0) >>> 0; const mask = c.len === 0 ? 0 : ((0xffffffff << (32 - c.len)) >>> 0); return (n & mask) >>> 0 === c.net; },
  tostringlist: ([l]) => l.map(String), listformat: () => '', ipaddr: ([s]) => s,
};
function simtfHash(s) { let h1 = 0x811c9dc5, h2 = 0x01000193; for (let i = 0; i < s.length; i++) { h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 0x01000193) >>> 0; h2 = (Math.imul(h2, 31) + s.charCodeAt(i)) >>> 0; } return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(4); }
function simtfResolvePath(sc, p) { p = String(p); if (p.startsWith('/')) return p; if (p.startsWith('~')) return HOME + p.slice(1); const base = sc.ctx.dir; return simtfNorm(base + '/' + p); }
function simtfNorm(p) { const out = []; for (const seg of p.split('/')) { if (!seg || seg === '.') continue; if (seg === '..') out.pop(); else out.push(seg); } return '/' + out.join('/'); }
/* try() icin: hata firlatan arguman degerlendirmesini yakala */
function simtfEvalTry(e, scope) {
  if (e.k === 'call' && (e.name === 'try' || e.name === 'can')) {
    for (const a of e.args) { try { const v = simtfEval(a, scope); return e.name === 'can' ? true : v; } catch (err) { if (!(err instanceof SimtfError)) throw err; } }
    if (e.name === 'can') return false;
    throw new SimtfError('Error in function call', 'Call to function "try" failed: no expression succeeded.', { file: scope.file, line: e.line });
  }
  return simtfEval(e, scope);
}

/* ---------- semalar ve cihaz ---------- */
const SIMTF_SCHEMA = {
  lab_vlan: { attrs: { vlan_id: { type: 'number', required: true, forceNew: true, alias: 'id' }, name: { type: 'string', optional: true } }, idOf: a => String(a.vlan_id) },
  lab_interface: { attrs: { name: { type: 'string', required: true, forceNew: true }, description: { type: 'string', optional: true }, ip: { type: 'string', optional: true }, mask: { type: 'string', optional: true }, enabled: { type: 'bool', optional: true, default: true }, vlan: { type: 'number', optional: true } }, idOf: a => String(a.name) },
  lab_user: { attrs: { username: { type: 'string', required: true, forceNew: true }, privilege: { type: 'number', optional: true, default: 1 }, secret: { type: 'string', required: true, sensitive: true } }, idOf: a => String(a.username) },
  lab_ntp_server: { attrs: { address: { type: 'string', required: true, forceNew: true }, prefer: { type: 'bool', optional: true, default: false } }, idOf: a => String(a.address) },
  lab_bgp_neighbor: { attrs: { ip: { type: 'string', required: true, forceNew: true }, remote_as: { type: 'number', required: true }, description: { type: 'string', optional: true }, shutdown: { type: 'bool', optional: true, default: false } }, idOf: a => String(a.ip) },
};
const SIMTF_DATA_SCHEMA = { lab_device: { attrs: { name: { type: 'string', optional: true } } } };
function simtfDeviceByAddr(addr) {
  const a = String(addr || 'r1.lab').toLowerCase();
  const ipMap = { '10.0.0.1': 'r1', '10.0.0.2': 'r2', '10.0.0.11': 'sw1' };
  if (LAB.devices[a]) return LAB.devices[a];
  if (ipMap[a] && LAB.devices[ipMap[a]]) return LAB.devices[ipMap[a]];
  return Object.values(LAB.devices).find(d => d.host === a || d.name + '.lab' === a || d.ip === a || (d.name + '.lab.local') === a) || null;
}
function simtfIfName(s) { const m = /^(?:gi|gig|gigabitethernet)\s*(\d[\d/]*)$/i.exec(String(s).trim()); if (m) return 'GigabitEthernet' + m[1]; const l = /^(?:lo|loopback)\s*(\d+)$/i.exec(String(s).trim()); if (l) return 'Loopback' + l[1]; return String(s).trim(); }
/* cihazdan oku: {id, ...attrs} ya da null */
function simtfRead(type, dev, attrs) {
  const st = dev.state() || {};
  if (type === 'lab_vlan') { const id = Number(attrs.vlan_id !== undefined ? attrs.vlan_id : attrs.id); const v = (st.vlans || {})[id]; if (!v) return null; return { id: String(id), vlan_id: id, name: v.name === undefined ? null : v.name }; }
  if (type === 'lab_interface') { const n = simtfIfName(attrs.name || attrs.id); const i = (st.interfaces || {})[n]; if (!i) return null; return { id: n, name: n, description: i.description || null, ip: i.ip || null, mask: i.mask || null, enabled: !!i.enabled, vlan: i.vlan == null ? null : Number(i.vlan) }; }
  if (type === 'lab_user') { const name = String(attrs.username || attrs.id); const us = (dev.model && dev.model.users) || st.users || []; const u = us.find(x => (x.name || x.username) === name); if (!u) return null; return { id: name, username: name, privilege: Number(u.privilege), secret: u.secret !== undefined ? u.secret : (attrs.secret === undefined ? null : attrs.secret) }; }
  if (type === 'lab_ntp_server') { const addr = String(attrs.address || attrs.id); const n = (st.ntp || []).map(x => (typeof x === 'string' ? x : x.ip || x.address)); if (!n.includes(addr)) return null; const raw = (dev.model && dev.model.ntp || []).find(x => x.ip === addr); return { id: addr, address: addr, prefer: !!(raw && raw.prefer) }; }
  if (type === 'lab_bgp_neighbor') { const ip = String(attrs.ip || attrs.id); const nb = ((st.bgp || {}).neighbors || []).find(x => x.ip === ip); if (!nb) return null; return { id: ip, ip, remote_as: Number(nb.remoteAs !== undefined ? nb.remoteAs : nb.remote_as), description: nb.description || null, shutdown: !!nb.shutdown }; }
  return null;
}
function simtfLinesCreate(type, a, dev) {
  if (type === 'lab_vlan') return [`vlan ${a.vlan_id}`].concat(a.name ? [`name ${a.name}`] : []);
  if (type === 'lab_interface') { const n = simtfIfName(a.name); const L = [`interface ${n}`]; L.push(a.description ? `description ${a.description}` : 'no description'); if (a.ip) L.push(`ip address ${a.ip} ${a.mask || '255.255.255.0'}`); else L.push('no ip address'); if (!/^Loopback/.test(n)) L.push(a.vlan ? `switchport access vlan ${a.vlan}` : 'no switchport access vlan'); L.push(a.enabled === false ? 'shutdown' : 'no shutdown'); return L; }
  if (type === 'lab_user') return [`username ${a.username} privilege ${a.privilege == null ? 1 : a.privilege} secret ${a.secret}`];
  if (type === 'lab_ntp_server') return [`ntp server ${a.address}${a.prefer ? ' prefer' : ''}`];
  if (type === 'lab_bgp_neighbor') { const asn = ((dev.state() || {}).bgp || {}).asn; if (!asn) throw new SimtfError('Error creating lab_bgp_neighbor', `Device ${dev.host} has no "router bgp" process; configure BGP on the device first.`); const L = [`router bgp ${asn}`, `neighbor ${a.ip} remote-as ${a.remote_as}`]; if (a.description) L.push(`neighbor ${a.ip} description ${a.description}`); else L.push(`no neighbor ${a.ip} description`); L.push(`${a.shutdown ? '' : 'no '}neighbor ${a.ip} shutdown`); return L; }
  return [];
}
function simtfLinesDestroy(type, a, dev) {
  if (type === 'lab_vlan') return [`no vlan ${a.vlan_id}`];
  if (type === 'lab_interface') { const n = simtfIfName(a.name); return [`interface ${n}`, 'no description', 'no ip address'].concat(/^Loopback/.test(n) ? [] : ['no switchport access vlan']).concat(['shutdown']); }
  if (type === 'lab_user') return [`no username ${a.username}`];
  if (type === 'lab_ntp_server') return [`no ntp server ${a.address}`];
  if (type === 'lab_bgp_neighbor') { const asn = ((dev.state() || {}).bgp || {}).asn; return asn ? [`router bgp ${asn}`, `no neighbor ${a.ip}`] : []; }
  return [];
}
function simtfDataDevice(dev) {
  const st = dev.state() || {};
  const ifs = {}; Object.entries(st.interfaces || {}).forEach(([n, i]) => { ifs[n] = { description: i.description || '', ip: i.ip || null, mask: i.mask || null, enabled: !!i.enabled, vlan: i.vlan == null ? null : Number(i.vlan), oper: i.oper || (i.enabled ? 'up' : 'down') }; });
  const vlans = {}; Object.keys(st.vlans || {}).forEach(k => { vlans[String(k)] = st.vlans[k].name || ''; });
  return { id: dev.name, name: dev.name, hostname: st.hostname, address: dev.host, version: '17.09.04a', model: 'C8000V', serial: dev.serial || '9LAB' + dev.name.toUpperCase(), interfaces: ifs, vlans, bgp_asn: (st.bgp || {}).asn || null, bgp_neighbors: ((st.bgp || {}).neighbors || []).map(n => n.ip), ntp_servers: (st.ntp || []).map(x => (typeof x === 'string' ? x : x.ip || x.address)), users: (st.users || []).map(u => u.name || u.username) };
}

/* ---------- konfigurasyon yukleme ---------- */
function simtfLoadDir(sh, dir, isModule) {
  const n = sh.node(dir);
  if (!n || n.t !== 'd') throw new SimtfError('Module not found', `The module directory ${dir} does not exist.`);
  const files = Object.keys(n.c).filter(f => /\.tf$/.test(f) && n.c[f].t === 'f').sort();
  const cfg = { dir, files: {}, terraform: null, providers: {}, variables: {}, locals: {}, outputs: {}, resources: [], datas: [], modules: [], order: [] };
  for (const f of files) {
    const abs = dir + '/' + f; const src = n.c[f].d; cfg.files[abs] = src;
    const body = simtfParseFile(src, abs);
    for (const [k, a] of Object.entries(body.attrs)) throw new SimtfError('Unsupported argument', `An argument named "${k}" is not expected here. Did you mean to define a block of type "${k}"?`, { file: abs, line: a.line });
    for (const b of body.blocks) {
      const where = { file: abs, line: b.line };
      const needLabels = (n2, what) => { if (b.labels.length !== n2) throw new SimtfError(`Invalid ${what} block`, `A ${what} block must have ${n2 === 1 ? 'one label' : n2 + ' labels'}.`, where); };
      if (b.type === 'terraform') { cfg.terraform = cfg.terraform || { requiredProviders: {}, backend: null, where }; for (const sb of b.body.blocks) { if (sb.type === 'required_providers') Object.entries(sb.body.attrs).forEach(([k, a]) => { cfg.terraform.requiredProviders[k] = simtfEvalConst(a.e, abs); }); else if (sb.type === 'backend') cfg.terraform.backend = { type: sb.labels[0] || 'local', attrs: Object.fromEntries(Object.entries(sb.body.attrs).map(([k, a]) => [k, simtfEvalConst(a.e, abs)])) }; else if (sb.type === 'cloud') throw new SimtfError('Unsupported block type', 'Blocks of type "cloud" are not expected here in this lab, use backend "local".', { file: abs, line: sb.line }); } if (body.attrs.required_version) { /* yok say */ } Object.entries(b.body.attrs).forEach(([k, a]) => { if (k === 'required_version') cfg.terraform.requiredVersion = simtfEvalConst(a.e, abs); else if (k !== 'experiments') throw new SimtfError('Unsupported argument', `An argument named "${k}" is not expected here.`, { file: abs, line: a.line }); }); continue; }
      if (b.type === 'provider') { needLabels(1, 'provider'); const name = b.labels[0]; const attrs = {}; Object.entries(b.body.attrs).forEach(([k, a]) => { attrs[k] = a; }); const alias = attrs.alias ? simtfEvalConst(attrs.alias.e, abs) : null; cfg.providers[alias ? name + '.' + alias : name] = { name, alias, attrs, where }; continue; }
      if (b.type === 'variable') { needLabels(1, 'variable'); const name = b.labels[0]; if (!/^[A-Za-z_][\w-]*$/.test(name)) throw new SimtfError('Invalid variable name', 'Name must start with a letter or underscore and may contain only letters, digits, underscores, and dashes.', where); if (cfg.variables[name]) throw new SimtfError('Duplicate variable declaration', `A variable named "${name}" was already declared at ${cfg.variables[name].where.file}:${cfg.variables[name].where.line}. Variable names must be unique within a module.`, where); const v = { name, where, type: null, default: undefined, hasDefault: false, description: '', sensitive: false, nullable: true, validations: [] }; for (const [k, a] of Object.entries(b.body.attrs)) { if (k === 'type') v.type = simtfTypeExpr(a.e); else if (k === 'default') { v.default = simtfEvalConst(a.e, abs); v.hasDefault = true; } else if (k === 'description') v.description = simtfEvalConst(a.e, abs); else if (k === 'sensitive') v.sensitive = !!simtfEvalConst(a.e, abs); else if (k === 'nullable') v.nullable = !!simtfEvalConst(a.e, abs); else throw new SimtfError('Unsupported argument', `An argument named "${k}" is not expected here.`, { file: abs, line: a.line }); } for (const sb of b.body.blocks) { if (sb.type !== 'validation') throw new SimtfError('Unsupported block type', `Blocks of type "${sb.type}" are not expected here.`, { file: abs, line: sb.line }); if (!sb.body.attrs.condition || !sb.body.attrs.error_message) throw new SimtfError('Missing required argument', `The argument "${!sb.body.attrs.condition ? 'condition' : 'error_message'}" is required, but no definition was found.`, { file: abs, line: sb.line }); v.validations.push({ cond: sb.body.attrs.condition.e, msg: sb.body.attrs.error_message.e, where: { file: abs, line: sb.line } }); } cfg.variables[name] = v; continue; }
      if (b.type === 'locals') { needLabels(0, 'locals'); Object.entries(b.body.attrs).forEach(([k, a]) => { if (cfg.locals[k]) throw new SimtfError('Duplicate local value definition', `A local value named "${k}" was already defined at ${cfg.locals[k].where.file}:${cfg.locals[k].where.line}. Local value names must be unique within a module.`, { file: abs, line: a.line }); cfg.locals[k] = { e: a.e, where: { file: abs, line: a.line } }; }); continue; }
      if (b.type === 'output') { needLabels(1, 'output'); const name = b.labels[0]; if (cfg.outputs[name]) throw new SimtfError('Duplicate output definition', `An output named "${name}" was already defined at ${cfg.outputs[name].where.file}:${cfg.outputs[name].where.line}. Output names must be unique within a module.`, where); const o = { name, where, value: null, sensitive: false, description: '', dependsOn: [] }; for (const [k, a] of Object.entries(b.body.attrs)) { if (k === 'value') o.value = a.e; else if (k === 'sensitive') o.sensitive = !!simtfEvalConst(a.e, abs); else if (k === 'description') o.description = simtfEvalConst(a.e, abs); else if (k === 'depends_on') o.dependsOn = a.e; else throw new SimtfError('Unsupported argument', `An argument named "${k}" is not expected here.`, { file: abs, line: a.line }); } if (!o.value) throw new SimtfError('Missing required argument', 'The argument "value" is required, but no definition was found.', where); cfg.outputs[name] = o; continue; }
      if (b.type === 'resource' || b.type === 'data') {
        needLabels(2, b.type); const [type, name] = b.labels;
        if (!/^[A-Za-z_][\w-]*$/.test(name)) throw new SimtfError('Invalid resource name', 'A name must start with a letter or underscore and may contain only letters, digits, underscores, and dashes.', where);
        const list = b.type === 'resource' ? cfg.resources : cfg.datas;
        const schema = b.type === 'resource' ? SIMTF_SCHEMA[type] : SIMTF_DATA_SCHEMA[type];
        if (!schema) { if (/^lab_/.test(type)) throw new SimtfError(`Invalid ${b.type === 'resource' ? 'resource' : 'data source'} type`, `The provider lab/lab does not support ${b.type === 'resource' ? 'resource' : 'data source'} "${type}".\n\nDesteklenen tipler, ${Object.keys(b.type === 'resource' ? SIMTF_SCHEMA : SIMTF_DATA_SCHEMA).join(', ')}`, where); const prov = type.split('_')[0]; throw new SimtfError('Missing required provider', `This configuration requires provider registry.terraform.io/hashicorp/${prov}, but that provider isn't available. You may be able to install it automatically by running:\n  terraform init\n\nBu lab yalnizca "lab" provider'ini sunar, ${Object.keys(SIMTF_SCHEMA).join(', ')}`, where); }
        if (list.some(r => r.type === type && r.name === name)) { const prev = list.find(r => r.type === type && r.name === name); throw new SimtfError(`Duplicate ${b.type === 'resource' ? 'resource' : 'data'} "${type}" configuration`, `A ${type} ${b.type === 'resource' ? 'resource' : 'data resource'} named "${name}" was already declared at ${prev.where.file}:${prev.where.line}. Resource names must be unique per type in each module.`, where); }
        const r = { kind: b.type, type, name, where, attrs: {}, count: null, forEach: null, dependsOn: null, lifecycle: { preventDestroy: false, ignoreChanges: [], createBeforeDestroy: false }, provider: null, schema };
        for (const [k, a] of Object.entries(b.body.attrs)) { if (k === 'count') r.count = a.e; else if (k === 'for_each') r.forEach = a.e; else if (k === 'depends_on') r.dependsOn = a.e; else if (k === 'provider') r.provider = a.e; else { const sa = schema.attrs[k] || (k === 'id' && schema.attrs.vlan_id ? schema.attrs.vlan_id : null); if (!sa) throw new SimtfError('Unsupported argument', `An argument named "${k}" is not expected here.`, { file: abs, line: a.line }); r.attrs[k === 'id' && schema.attrs.vlan_id ? 'vlan_id' : k] = { e: a.e, line: a.line }; } }
        if (r.count && r.forEach) throw new SimtfError('Invalid combination of "count" and "for_each"', 'The "count" and "for_each" meta-arguments are mutually-exclusive, only one should be used to be explicit about the number of resources to be created.', where);
        for (const sb of b.body.blocks) { if (sb.type === 'lifecycle') { Object.entries(sb.body.attrs).forEach(([k, a]) => { if (k === 'prevent_destroy') r.lifecycle.preventDestroy = !!simtfEvalConst(a.e, abs); else if (k === 'create_before_destroy') r.lifecycle.createBeforeDestroy = !!simtfEvalConst(a.e, abs); else if (k === 'ignore_changes') r.lifecycle.ignoreChanges = (a.e.k === 'list' ? a.e.items.map(x => (x.k === 'var' ? x.name : x.k === 'attr' ? x.name : simtfEvalConst(x, abs))) : ['all']); else if (k === 'replace_triggered_by') { /* yok say */ } else throw new SimtfError('Unsupported argument', `An argument named "${k}" is not expected here.`, { file: abs, line: a.line }); }); } else if (sb.type === 'provisioner' || sb.type === 'connection') { /* yok say */ } else throw new SimtfError('Unsupported block type', `Blocks of type "${sb.type}" are not expected here.`, { file: abs, line: sb.line }); }
        for (const [k, sa] of Object.entries(schema.attrs)) if (sa.required && !r.attrs[k]) throw new SimtfError('Missing required argument', `The argument "${k}" is required, but no definition was found.`, where);
        list.push(r); continue;
      }
      if (b.type === 'module') { needLabels(1, 'module'); const name = b.labels[0]; if (cfg.modules.some(m => m.name === name)) throw new SimtfError('Duplicate module call', `A module call named "${name}" was already defined. Module calls must have unique names.`, where); const m = { name, where, source: null, inputs: {}, count: null, forEach: null, dependsOn: null, providers: null }; for (const [k, a] of Object.entries(b.body.attrs)) { if (k === 'source') m.source = simtfEvalConst(a.e, abs); else if (k === 'version') m.version = simtfEvalConst(a.e, abs); else if (k === 'count') m.count = a.e; else if (k === 'for_each') m.forEach = a.e; else if (k === 'depends_on') m.dependsOn = a.e; else if (k === 'providers') m.providers = a.e; else m.inputs[k] = { e: a.e, line: a.line }; } if (!m.source) throw new SimtfError('Missing required argument', 'The argument "source" is required, but no definition was found.', where); if (!/^\.\.?\//.test(m.source)) throw new SimtfError('Module not installed', `Module "${name}" uses source "${m.source}". Bu lab cevrimdisi, yalnizca yerel kaynaklar desteklenir, ornek source = "./modules/vlans".`, where); cfg.modules.push(m); continue; }
      if (b.type === 'moved' || b.type === 'import' || b.type === 'check' || b.type === 'removed') { cfg[b.type + 's'] = cfg[b.type + 's'] || []; cfg[b.type + 's'].push({ attrs: b.body.attrs, where }); continue; }
      throw new SimtfError('Unsupported block type', `Blocks of type "${b.type}" are not expected here.`, where);
    }
  }
  return cfg;
}
function simtfEvalConst(e, file) { return simtfDeepPlain(simtfEval(e, { file, ctx: SIMTF_CONST_CTX, locals: {} })); }
const SIMTF_CONST_CTX = { varsProxy: w => { throw new SimtfError('Variables not allowed', 'Variables may not be used here.', w); }, localsProxy: w => { throw new SimtfError('Variables not allowed', 'Variables may not be used here.', w); }, dataProxy: w => { throw new SimtfError('Variables not allowed', 'Variables may not be used here.', w); }, moduleProxy: w => { throw new SimtfError('Variables not allowed', 'Variables may not be used here.', w); }, resourceTypes: () => [], resourceProxy: () => null, dir: '/', rootDir: '/', cwd: '/', workspace: 'default', sh: null };
function simtfTypeExpr(e) {
  if (e.k === 'var') return e.name;
  if (e.k === 'call') return e.name + '(' + e.args.map(simtfTypeExpr).join(', ') + ')';
  if (e.k === 'obj') return 'object({' + e.pairs.map(p => (p.key.v || p.key.name) + ' = ' + simtfTypeExpr(p.val)).join(', ') + '})';
  if (e.k === 'list') return 'tuple([' + e.items.map(simtfTypeExpr).join(', ') + '])';
  return 'any';
}
function simtfConvert(v, type, name, where) {
  if (!type || type === 'any') return v;
  if (v === null || v === undefined) return null;
  const base = type.split('(')[0];
  const bad = () => { throw new SimtfError('Invalid value for input variable', `${name ? 'The given value is not suitable for var.' + name + ' declared at ' + (where ? where.file + ':' + where.line : '') : 'Unsuitable value'}: ${base} required.`, where); };
  if (base === 'string') { if (typeof v === 'object') bad(); return String(v); }
  if (base === 'number') { if (typeof v === 'number') return v; if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v); throw new SimtfError('Invalid value for input variable', `${name ? 'The given value is not suitable for var.' + name + ' declared at ' + where.file + ':' + where.line : 'Unsuitable value'}: a number is required.`, where); }
  if (base === 'bool') { if (typeof v === 'boolean') return v; if (v === 'true') return true; if (v === 'false') return false; throw new SimtfError('Invalid value for input variable', `${name ? 'The given value is not suitable for var.' + name + ' declared at ' + where.file + ':' + where.line : 'Unsuitable value'}: a bool is required.`, where); }
  const inner = type.includes('(') ? type.slice(type.indexOf('(') + 1, -1) : 'any';
  if (base === 'list' || base === 'set' || base === 'tuple') { const items = Array.isArray(v) ? v : (v && v.__set ? v.items : null); if (!items) throw new SimtfError('Invalid value for input variable', `${name ? 'The given value is not suitable for var.' + name + ' declared at ' + where.file + ':' + where.line : 'Unsuitable value'}: ${base} of ${inner} required.`, where); const out = items.map(x => simtfConvert(x, base === 'tuple' ? 'any' : inner, name, where)); return base === 'set' ? simtfSet(out) : out; }
  if (base === 'map' || base === 'object') { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new SimtfError('Invalid value for input variable', `${name ? 'The given value is not suitable for var.' + name + ' declared at ' + where.file + ':' + where.line : 'Unsuitable value'}: ${base} required.`, where); if (base === 'map') { const o = {}; Object.keys(v).forEach(k => { o[k] = simtfConvert(v[k], inner, name, where); }); return o; } const o = {}; const fields = {}; inner.replace(/^\{|\}$/g, '').split(/,(?![^(]*\))/).map(s => s.trim()).filter(Boolean).forEach(f => { const m = /^([\w-]+)\s*=\s*(.+)$/.exec(f); if (m) fields[m[1]] = m[2].trim(); }); Object.keys(v).forEach(k => { o[k] = fields[k] ? simtfConvert(v[k], fields[k].replace(/^optional\((.*?)(?:,.*)?\)$/, '$1'), name, where) : v[k]; }); Object.entries(fields).forEach(([k, t]) => { if (o[k] === undefined) { if (/^optional\(/.test(t)) { const d = /^optional\([^,]+,\s*(.+)\)$/.exec(t); o[k] = d ? simtfEvalConst(simtfParseExprSrc(d[1], 'type', 1), 'type') : null; } else throw new SimtfError('Invalid value for input variable', `The given value is not suitable for var.${name} declared at ${where.file}:${where.line}: attribute "${k}" is required.`, where); } }); return o; }
  return v;
}
function simtfParseTfvars(sh, abs) {
  const r = sh.readFile(abs, 'terraform'); if (r.err) throw new SimtfError('Failed to read variables file', `Given variables file ${abs} does not exist.`);
  if (/\.json$/.test(abs)) { try { return JSON.parse(r.data); } catch (e) { throw new SimtfError('Invalid JSON variables file', e.message, { file: abs, line: 1 }); } }
  const body = simtfParseFile(r.data, abs);
  if (body.blocks.length) throw new SimtfError('Unexpected block', 'Blocks are not allowed here. Variables files may contain only variable value assignments.', { file: abs, line: body.blocks[0].line });
  const out = {}; Object.entries(body.attrs).forEach(([k, a]) => { out[k] = simtfEvalConst(a.e, abs); }); return out;
}

/* ---------- degerlendirme baglami ---------- */
class SimtfCtx {
  constructor(run, cfg, opts) {
    this.run = run; this.sh = run.sh; this.cfg = cfg; this.dir = cfg.dir; this.rootDir = opts.rootDir || cfg.dir; this.cwd = run.sh.cwd; this.workspace = run.workspace;
    this.modulePath = opts.modulePath || ''; this.inputs = opts.inputs || {}; this.isRoot = !opts.modulePath;
    this.varCache = {}; this.localCache = {}; this.localBusy = new Set(); this.resCache = {}; this.dataCache = {}; this.modCache = {};
    this.vals = null;
  }
  scope(extra) { return Object.assign({ ctx: this, file: this.cfg.dir, locals: {} }, extra || {}); }
  resourceTypes() { return Object.keys(SIMTF_SCHEMA); }
  variable(name, where) {
    const v = this.cfg.variables[name];
    if (!v) throw new SimtfError('Reference to undeclared input variable', `An input variable with the name "${name}" has not been declared. This variable can be declared with a variable "${name}" {} block.`, where);
    if (name in this.varCache) return this.varCache[name];
    let val; let has = false;
    if (Object.prototype.hasOwnProperty.call(this.inputs, name)) { val = this.inputs[name]; has = true; }
    else if (v.hasDefault) { val = v.default; has = true; }
    if (!has) { if (this.isRoot) throw new SimtfError('No value for required variable', `The root module input variable "${name}" is not set, and has no default value. Use a -var or -var-file command line argument to provide a value for this variable.`, v.where); throw new SimtfError('Missing required argument', `The argument "${name}" is required, but no definition was found.`, this.callWhere || v.where); }
    val = simtfConvert(val, v.type, name, v.where);
    if (val === null && !v.nullable) throw new SimtfError('Invalid value for input variable', `The given value is not suitable for var.${name} declared at ${v.where.file}:${v.where.line}: required.`, v.where);
    this.varCache[name] = val;
    for (const vd of v.validations) { const sc = this.scope({ file: vd.where.file }); let ok2; try { ok2 = simtfTruthy(simtfEvalTry(vd.cond, sc), vd.where); } catch (e) { if (e instanceof SimtfError) ok2 = false; else throw e; } if (!ok2) { let msg = ''; try { msg = simtfToStr(simtfEval(vd.msg, sc), vd.where); } catch (e) { msg = 'validation failed'; } throw new SimtfError('Invalid value for variable', `${msg}\n\nThis was checked by the validation rule at ${vd.where.file}:${vd.where.line},3-13.`, Object.assign({}, v.where, { ctxLine: `var.${name} is ${simtfRepr(val)}` })); } }
    return v.sensitive ? new SimtfSensitive(val) : val;
  }
  varsProxy(where) { const p = {}; const self = this; Object.keys(this.cfg.variables).forEach(n => Object.defineProperty(p, n, { enumerable: true, get: () => self.variable(n, where) })); p.__simtfProxy = true; return new Proxy(p, { get(t, k) { if (simtfProxyMiss(t, k)) throw new SimtfError('Reference to undeclared input variable', `An input variable with the name "${k}" has not been declared. This variable can be declared with a variable "${k}" {} block.`, where); return t[k]; } }); }
  local(name, where) {
    const l = this.cfg.locals[name];
    if (!l) throw new SimtfError('Reference to undeclared local value', `A local value with the name "${name}" has not been declared.`, where);
    if (name in this.localCache) return this.localCache[name];
    if (this.localBusy.has(name)) throw new SimtfError('Cycle', `local.${name} depends on itself.`, l.where);
    this.localBusy.add(name);
    try { this.localCache[name] = simtfEval(l.e, this.scope({ file: l.where.file })); } finally { this.localBusy.delete(name); }
    return this.localCache[name];
  }
  localsProxy(where) { const self = this; const p = { __simtfProxy: true }; Object.keys(this.cfg.locals).forEach(n => Object.defineProperty(p, n, { enumerable: true, get: () => self.local(n, where) })); return new Proxy(p, { get(t, k) { if (simtfProxyMiss(t, k)) throw new SimtfError('Reference to undeclared local value', `A local value with the name "${k}" has not been declared.`, where); return t[k]; } }); }
  dataProxy(where) { const self = this; const types = { __simtfProxy: true }; this.cfg.datas.forEach(d => { types[d.type] = types[d.type] || { __simtfProxy: true }; Object.defineProperty(types[d.type], d.name, { enumerable: true, get: () => self.dataValue(d, where) }); }); return new Proxy(types, { get(t, k) { if (simtfProxyMiss(t, k)) throw new SimtfError('Reference to undeclared resource', `A data resource "${k}" has not been declared in ${self.modulePath ? self.modulePath : 'the root module'}.`, where); if (!t[k] || typeof t[k] !== 'object') return t[k]; return new Proxy(t[k], { get(t2, k2) { if (simtfProxyMiss(t2, k2)) throw new SimtfError('Reference to undeclared resource', `A data resource "${k}" "${k2}" has not been declared in ${self.modulePath ? self.modulePath : 'the root module'}.`, where); return t2[k2]; } }); } }); }
  dataValue(d, where) {
    const key = d.type + '.' + d.name; if (this.dataCache[key]) return this.dataCache[key];
    const sc = this.scope({ file: d.where.file });
    const attrs = {}; Object.entries(d.attrs).forEach(([k, a]) => { attrs[k] = simtfDeepPlain(simtfEval(a.e, sc)); });
    const dev = this.run.deviceFor(d, attrs.name, this);
    const v = Object.assign({ __resource: true }, simtfDataDevice(dev));
    if (attrs.name && dev.name !== attrs.name && !simtfDeviceByAddr(attrs.name)) throw new SimtfError('Error reading lab_device', `No device named "${attrs.name}". Lab devices, ${Object.keys(LAB.devices).join(', ')}`, d.where);
    this.dataCache[key] = v; return v;
  }
  resourceProxy(type, where) {
    const self = this; const byName = { __simtfProxy: true };
    this.cfg.resources.filter(r => r.type === type).forEach(r => Object.defineProperty(byName, r.name, { enumerable: true, get: () => self.resourceValue(r, where) }));
    return new Proxy(byName, { get(t, k) { if (simtfProxyMiss(t, k)) throw new SimtfError('Reference to undeclared resource', `A managed resource "${type}" "${k}" has not been declared in ${self.modulePath ? self.modulePath : 'the root module'}.`, where); return t[k]; } });
  }
  /* kaynak degeri: tek nesne, count ile liste, for_each ile map. Degerler planlanan attr'lar + state'teki id */
  resourceValue(r, where) {
    const key = r.type + '.' + r.name; if (this.resCache[key]) return this.resCache[key];
    if (this.resBusy && this.resBusy.has(key)) throw new SimtfError('Cycle', `${this.modulePath ? this.modulePath + '.' : ''}${key} depends on itself (directly or indirectly).`, r.where);
    this.resBusy = this.resBusy || new Set(); this.resBusy.add(key);
    try {
      const insts = this.run.expand(r, this);
      const mk = inst => { const attrs = Object.assign({ __resource: true }, inst.planned); const prior = this.run.priorFor(inst.addr); if (prior && !inst.replace && !prior.tainted) attrs.id = prior.attributes.id; else attrs.id = new SimtfUnknown('string'); return attrs; };
      let v;
      if (r.forEach) { v = {}; insts.forEach(i => { v[i.key] = mk(i); }); }
      else if (r.count) { v = insts.map(mk); }
      else v = insts.length ? mk(insts[0]) : null;
      this.resCache[key] = v; return v;
    } finally { this.resBusy.delete(key); }
  }
  moduleProxy(where) { const self = this; const p = { __simtfProxy: true }; this.cfg.modules.forEach(m => Object.defineProperty(p, m.name, { enumerable: true, get: () => self.moduleValue(m, where) })); return new Proxy(p, { get(t, k) { if (simtfProxyMiss(t, k)) throw new SimtfError('Reference to undeclared module', `No module call named "${k}" is declared in ${self.modulePath ? self.modulePath : 'the root module'}.`, where); return t[k]; } }); }
  moduleValue(m, where) {
    if (this.modCache[m.name]) return this.modCache[m.name];
    const child = this.run.moduleCtx(m, this);
    const outs = { __module: true };
    Object.entries(child.cfg.outputs).forEach(([n, o]) => Object.defineProperty(outs, n, { enumerable: true, get: () => { const v = simtfEval(o.value, child.scope({ file: o.where.file })); return o.sensitive ? new SimtfSensitive(v) : v; } }));
    this.modCache[m.name] = outs; return outs;
  }
}
function simtfProxyMiss(t, k) { return typeof k === 'string' && !(k in t) && !['then', 'toJSON', 'constructor', 'valueOf', 'toString', 'length'].includes(k) && !k.startsWith('__'); }
function simtfRepr(v) { v = simtfPlain(v); if (simtfIsUnknown(v)) return '(known after apply)'; if (typeof v === 'string') return JSON.stringify(v); if (v === null || v === undefined) return 'null'; if (typeof v === 'number' || typeof v === 'boolean') return String(v); if (Array.isArray(v)) return '[' + v.map(simtfRepr).join(', ') + ']'; if (v.__set) return 'toset([' + v.items.map(simtfRepr).join(', ') + '])'; return '{ ' + Object.keys(v).filter(k => !k.startsWith('__')).map(k => k + ' = ' + simtfRepr(v[k])).join(', ') + ' }'; }

/* ---------- calisma motoru ---------- */
function simtfAddrKey(key) { return key === null || key === undefined ? '' : typeof key === 'number' ? `[${key}]` : `["${key}"]`; }
function simtfParseAddr(addr) {
  const m = /^((?:module\.[\w-]+\.)*)(data\.)?([\w-]+)\.([\w-]+)(?:\[(\d+|"[^"]*")\])?$/.exec(String(addr).trim());
  if (!m) return null;
  const key = m[5] === undefined ? null : m[5].startsWith('"') ? m[5].slice(1, -1) : Number(m[5]);
  return { module: m[1] ? m[1].replace(/\.$/, '') : '', mode: m[2] ? 'data' : 'managed', type: m[3], name: m[4], key, base: (m[1] || '') + (m[2] || '') + m[3] + '.' + m[4] };
}
class SimtfRun {
  constructor(sh, opts) {
    this.sh = sh; this.o = opts || {}; this.out = []; this.dir = sh.cwd; this.warnings = [];
    this.workspace = this.readWorkspace();
    this.state = null; this.cfg = null; this.ctxs = {}; this.expandCache = new Map(); this.rootCtx = null;
  }
  print(...s) { this.out.push(...s); }
  readWorkspace() { const n = this.sh.node(this.dir + '/.terraform/environment'); return n && n.t === 'f' && n.d.trim() ? n.d.trim() : 'default'; }
  statePath() { return this.workspace === 'default' ? this.dir + '/terraform.tfstate' : `${this.dir}/terraform.tfstate.d/${this.workspace}/terraform.tfstate`; }
  loadState() {
    const n = this.sh.node(this.statePath());
    if (!n || n.t !== 'f' || !n.d.trim()) { this.state = { version: 4, terraform_version: SIMTF_VERSION, serial: 0, lineage: LAB.util.id(8) + '-' + LAB.util.id(4) + '-' + LAB.util.id(4) + '-' + LAB.util.id(4) + '-' + LAB.util.id(12), outputs: {}, resources: [], check_results: null }; this.stateIsNew = true; return this.state; }
    try { this.state = JSON.parse(n.d); } catch (e) { throw new SimtfError('Failed to load state', `Error loading state: ${e.message}. The file ${this.statePath()} is not valid JSON.`); }
    this.state.resources = this.state.resources || []; this.state.outputs = this.state.outputs || [];
    if (!this.state.outputs || Array.isArray(this.state.outputs)) this.state.outputs = {};
    return this.state;
  }
  writeState() {
    this.state.serial = (this.state.serial || 0) + 1; this.state.terraform_version = SIMTF_VERSION;
    const p = this.statePath(); const dir = p.split('/').slice(0, -1).join('/');
    const parts = dir.split('/').filter(Boolean); let cur = this.sh.root; for (const x of parts) { if (!cur.c[x]) cur.c[x] = mkdir({}, 0o755, this.sh.user); cur = cur.c[x]; }
    const prev = this.sh.node(p); if (prev) this.sh.writeFile(p + '.backup', prev.d, false, 'terraform');
    const e = this.sh.writeFile(p, JSON.stringify(this.state, null, 2) + '\n', false, 'terraform'); if (e) throw new SimtfError('Failed to save state', e);
  }
  stateInstances() { const out = []; if (!this.state) return out; for (const r of this.state.resources) { if (r.mode !== 'managed') continue; for (const i of r.instances) out.push({ res: r, inst: i, addr: (r.module ? r.module + '.' : '') + r.type + '.' + r.name + simtfAddrKey(i.index_key === undefined ? null : i.index_key) }); } return out; }
  findState(addr) { return this.stateInstances().find(x => x.addr === addr) || null; }
  priorFor(addr) { const s = this.prior ? this.prior[addr] : (this.findState(addr) ? { attributes: this.findState(addr).inst.attributes, tainted: this.findState(addr).inst.status === 'tainted' } : null); return s || null; }
  setStateInstance(addr, attrs, deps, keepTaint) {
    const a = simtfParseAddr(addr); const mod = a.module || undefined;
    let r = this.state.resources.find(x => x.mode === 'managed' && x.type === a.type && x.name === a.name && (x.module || undefined) === mod);
    if (!r) { r = { mode: 'managed', type: a.type, name: a.name, provider: `provider["${SIMTF_PROVIDER_ADDR}"]`, instances: [] }; if (mod) r.module = mod; if (a.key !== null) r.each = typeof a.key === 'number' ? 'list' : 'map'; this.state.resources.push(r); }
    let inst = r.instances.find(i => (i.index_key === undefined ? null : i.index_key) === a.key);
    if (!inst) { inst = { schema_version: 0 }; if (a.key !== null) inst.index_key = a.key; r.instances.push(inst); }
    inst.attributes = attrs; inst.sensitive_attributes = Object.keys(SIMTF_SCHEMA[a.type].attrs).filter(k => SIMTF_SCHEMA[a.type].attrs[k].sensitive && attrs[k] != null).map(k => [{ type: 'get_attr', value: k }]); inst.private = 'bnVsbA=='; inst.dependencies = deps || []; if (!keepTaint) delete inst.status;
  }
  removeStateInstance(addr) {
    const a = simtfParseAddr(addr); const mod = a.module || undefined;
    const r = this.state.resources.find(x => x.mode === 'managed' && x.type === a.type && x.name === a.name && (x.module || undefined) === mod); if (!r) return false;
    const before = r.instances.length; r.instances = r.instances.filter(i => (i.index_key === undefined ? null : i.index_key) !== a.key);
    if (!r.instances.length) this.state.resources = this.state.resources.filter(x => x !== r);
    return r.instances.length !== before;
  }
  /* ---- konfigurasyon ---- */
  requireInit() {
    const n = this.sh.node(this.dir + '/.terraform');
    if (!n) throw new SimtfError('Required plugins are not installed', `The installed provider plugins are not consistent with the requirements of this configuration:\n\n  ${SIMTF_PROVIDER_ADDR}: no plugin installed\n\nTo install the required provider plugins, run "terraform init". This command may need to be re-run each time you change the provider requirements of this configuration.`);
    if (!this.sh.node(this.dir + '/.terraform.lock.hcl')) throw new SimtfError('Inconsistent dependency lock file', 'The following dependency selections recorded in the lock file are inconsistent with the current configuration:\n  - provider registry.terraform.io/lab/lab: required by this configuration but no version is selected\n\nTo update the locked dependency selections to match a changed configuration, run:\n  terraform init -upgrade');
  }
  loadConfig() {
    const n = this.sh.node(this.dir); const hasTf = n && n.t === 'd' && Object.keys(n.c).some(f => /\.tf$/.test(f));
    if (!hasTf) throw new SimtfError('No configuration files', `Bu dizinde .tf dosyasi yok, ${this.dir}. Once main.tf yaz ya da terraform init calistirilacak dizine cd ile gec.`, null, true);
    this.cfg = simtfLoadDir(this.sh, this.dir, false);
    if (this.cfg.terraform && this.cfg.terraform.requiredProviders) { for (const [k, v] of Object.entries(this.cfg.terraform.requiredProviders)) { const src = v && v.source ? String(v.source) : null; if (src && !/^(registry\.terraform\.io\/)?lab\/lab$/.test(src)) throw new SimtfError('Unsupported provider', `Provider "${k}" with source "${src}" bu lab'da yok. Yalnizca lab/lab provider'i kullanilabilir.`, this.cfg.terraform.where); } }
    const mods = this.sh.node(this.dir + '/.terraform/modules/modules.json');
    const installed = mods ? JSON.parse(mods.d).Modules.map(m => m.Key) : [];
    if (this.cfg.modules.length && !this.o.skipInitCheck) for (const m of this.cfg.modules) if (!installed.includes(m.name)) throw new SimtfError('Module not installed', `This module is not yet installed. Run "terraform init" to install all modules required by this configuration.`, m.where);
    return this.cfg;
  }
  loadVars() {
    const sh = this.sh; let vars = {};
    const auto = ['terraform.tfvars', 'terraform.tfvars.json'].filter(f => sh.node(this.dir + '/' + f));
    const d = sh.node(this.dir); if (d) Object.keys(d.c).filter(f => /\.auto\.tfvars(\.json)?$/.test(f)).sort().forEach(f => auto.push(f));
    const envKeys = new Set();
    Object.entries(sh.env).forEach(([k, v]) => { if (k.startsWith('TF_VAR_')) { vars[k.slice(7)] = simtfParseVarValue(v); envKeys.add(k.slice(7)); } });
    for (const f of auto) { const fv = simtfParseTfvars(sh, this.dir + '/' + f); Object.keys(fv).forEach(k => envKeys.delete(k)); Object.assign(vars, fv); }
    for (const vf of this.o.varFiles || []) Object.assign(vars, simtfParseTfvars(sh, sh.resolve(vf)));
    for (const v of this.o.vars || []) { const eq = v.indexOf('='); if (eq < 0) throw new SimtfError('Invalid -var option', `The given -var option "${v}" is not correctly specified. Must be a variable name and value separated by an equals sign, like -var="key=value".`); vars[v.slice(0, eq).trim()] = simtfParseVarValue(v.slice(eq + 1)); }
    for (const k of Object.keys(vars)) if (this.cfg && !this.cfg.variables[k]) { if (envKeys.has(k)) { delete vars[k]; continue; } if ((this.o.vars || []).some(v => v.startsWith(k + '='))) throw new SimtfError('Value for undeclared variable', `A variable named "${k}" was assigned on the command line, but the root module does not declare a variable of that name. To use this value, add a "variable" block to the configuration.`); this.warnings.push(`Value for undeclared variable\n\nThe root module does not declare a variable named "${k}" but a value was found in file "terraform.tfvars". If you meant to use this value, add a "variable" block to the configuration.`); delete vars[k]; }
    this.inputs = vars; return vars;
  }
  root() { if (!this.rootCtx) { this.rootCtx = new SimtfCtx(this, this.cfg, { inputs: this.inputs || {}, rootDir: this.dir }); this.ctxs[''] = this.rootCtx; } return this.rootCtx; }
  freshCtx() { this.rootCtx = null; this.ctxs = {}; this.expandCache = new Map(); return this.root(); }
  moduleCtx(m, parent) {
    const path = (parent.modulePath ? parent.modulePath + '.' : '') + 'module.' + m.name;
    if (this.ctxs[path]) return this.ctxs[path];
    if (m.count || m.forEach) throw new SimtfError('Unsupported module meta-argument', 'Bu lab module bloklarinda count ve for_each desteklemiyor, modulu birden fazla kez cagirmak icin ayri module bloklari kullan.', m.where);
    const dir = simtfNorm(parent.cfg.dir + '/' + m.source);
    const cfg = simtfLoadDir(this.sh, dir, true);
    const inputs = {}; const sc = parent.scope({ file: m.where.file });
    for (const [k, a] of Object.entries(m.inputs)) { if (!cfg.variables[k]) throw new SimtfError('Unsupported argument', `An argument named "${k}" is not expected here.`, { file: m.where.file, line: a.line }); inputs[k] = simtfEval(a.e, sc); }
    const ctx = new SimtfCtx(this, cfg, { modulePath: path, inputs, rootDir: this.dir }); ctx.callWhere = m.where; ctx.callModule = m;
    for (const v of Object.values(cfg.variables)) if (!v.hasDefault && !(v.name in inputs)) throw new SimtfError('Missing required argument', `The argument "${v.name}" is required, but no definition was found.`, m.where);
    this.ctxs[path] = ctx; return ctx;
  }
  allCtxs() { const list = [this.root()]; const walk = ctx => { for (const m of ctx.cfg.modules) { const c = this.moduleCtx(m, ctx); list.push(c); walk(c); } }; walk(this.root()); return list; }
  deviceFor(r, addrOverride, ctx) {
    let pname = 'lab';
    if (r.provider) { const e = r.provider; pname = e.k === 'attr' ? (e.a.name + '.' + e.name) : e.k === 'var' ? e.name : 'lab'; }
    const findProv = c => c.cfg.providers[pname] || (pname === 'lab' ? null : null);
    let prov = null; let c = ctx; while (c) { prov = findProv(c); if (prov) break; c = c.callModule ? this.ctxs[c.modulePath.split('.').slice(0, -2).join('.')] || this.root() : null; if (c === ctx) break; }
    if (!prov) prov = this.root().cfg.providers[pname];
    if (!prov && pname !== 'lab') throw new SimtfError('Provider configuration not present', `To work with ${r.type}.${r.name} its original provider configuration at provider["${SIMTF_PROVIDER_ADDR}"].${pname.split('.')[1] || ''} is required, but it has been removed. Add a provider "lab" block with alias = "${pname.split('.')[1] || ''}".`, r.where);
    let address = addrOverride || 'r1.lab'; let user = null, pass = null;
    if (prov) { const sc = this.root().scope({ file: prov.where.file }); const val = k => (prov.attrs[k] ? simtfDeepPlain(simtfEval(prov.attrs[k].e, sc)) : undefined); if (!addrOverride && val('address') !== undefined) address = val('address'); user = val('username'); pass = val('password'); for (const k of Object.keys(prov.attrs)) if (!['address', 'username', 'password', 'alias', 'insecure', 'timeout'].includes(k)) throw new SimtfError('Unsupported argument', `An argument named "${k}" is not expected here.`, { file: prov.where.file, line: prov.attrs[k].line }); }
    const dev = simtfDeviceByAddr(address);
    if (!dev) throw new SimtfError('Error configuring provider "lab"', `could not connect to ${address}: dial tcp: lookup ${address}: no such host\n\nLab cihazlari, ${Object.values(LAB.devices).map(d => d.host).join(', ')}`, prov ? prov.where : r.where);
    if (user !== undefined && user !== null) { const users = (dev.model && dev.model.users) || []; const u = users.find(x => x.name === String(user)); if (users.length && (!u || (pass != null && u.secret !== undefined && String(u.secret) !== String(pass)))) throw new SimtfError('Error configuring provider "lab"', `ssh: handshake failed: ssh: unable to authenticate to ${address} as user "${user}", attempted methods [none password], no supported methods remain`, prov ? prov.where : r.where); }
    return dev;
  }
  /* ---- genisletme ---- */
  expand(r, ctx) {
    const key = ctx.modulePath + '|' + r.type + '.' + r.name;
    if (this.expandCache.has(key)) return this.expandCache.get(key);
    const base = (ctx.modulePath ? ctx.modulePath + '.' : '') + r.type + '.' + r.name;
    const keys = [];
    if (r.forEach) {
      const fe = simtfPlain(simtfEval(r.forEach, ctx.scope({ file: r.where.file })));
      if (simtfIsUnknown(fe)) throw new SimtfError('Invalid for_each argument', 'The "for_each" set includes values derived from resource attributes that cannot be determined until apply, and so Terraform cannot determine the full set of keys that will identify the instances of this resource.', r.where);
      if (Array.isArray(fe)) throw new SimtfError('Invalid for_each argument', `The given "for_each" argument value is unsuitable: the "for_each" argument must be a map, or set of strings, and you have provided a value of type list of ${simtfTypeName(fe[0])}.`, r.where);
      if (fe && fe.__set) fe.items.forEach(k => { if (typeof k !== 'string') throw new SimtfError('Invalid for_each set argument', 'The given "for_each" argument value is unsuitable: "for_each" supports maps and sets of strings, but you have provided a set containing type number.', r.where); keys.push([k, { key: k, value: k }]); });
      else if (fe && typeof fe === 'object') Object.keys(fe).sort().forEach(k => keys.push([k, { key: k, value: fe[k] }]));
      else throw new SimtfError('Invalid for_each argument', `The given "for_each" argument value is unsuitable: the "for_each" argument must be a map, or set of strings, and you have provided a value of type ${simtfTypeName(fe)}.`, r.where);
    } else if (r.count) {
      const c = simtfPlain(simtfEval(r.count, ctx.scope({ file: r.where.file })));
      if (simtfIsUnknown(c)) throw new SimtfError('Invalid count argument', 'The "count" value depends on resource attributes that cannot be determined until apply, so Terraform cannot predict how many instances will be created.', r.where);
      if (typeof c !== 'number' || !Number.isInteger(c) || c < 0) throw new SimtfError('Invalid count argument', `The given "count" argument value is unsuitable: a whole number is required.`, r.where);
      for (let i = 0; i < c; i++) keys.push([i, null]);
    } else keys.push([null, null]);
    const insts = keys.map(([k, each]) => {
      const sc = ctx.scope({ file: r.where.file, each: each || undefined, count: typeof k === 'number' ? { index: k } : undefined });
      const planned = {};
      for (const [an, sa] of Object.entries(r.schema.attrs)) {
        if (r.attrs[an]) { let v = simtfEval(r.attrs[an].e, sc); const plain = simtfPlain(v); if (simtfIsUnknown(plain)) planned[an] = plain; else if (plain === null) planned[an] = sa.default !== undefined ? sa.default : null; else planned[an] = simtfConvertAttr(plain, sa, an, r, ctx); }
        else planned[an] = sa.default !== undefined ? sa.default : null;
      }
      const addr = base + simtfAddrKey(k);
      return { addr, base, key: k, planned, r, ctx, replace: (this.o.replace || []).includes(addr) };
    });
    this.expandCache.set(key, insts); return insts;
  }
  allInstances() { const out = []; for (const ctx of this.allCtxs()) for (const r of ctx.cfg.resources) out.push(...this.expand(r, ctx)); return out; }
  depsOf(inst) {
    const refs = new Set(); const prefix = inst.ctx.modulePath ? inst.ctx.modulePath + '.' : '';
    const walk = e => { if (!e || typeof e !== 'object') return; if (e.k === 'attr' && e.a && e.a.k === 'var' && SIMTF_SCHEMA[e.a.name]) refs.add(prefix + e.a.name + '.' + e.name); if (e.k === 'attr' && e.a && e.a.k === 'var' && e.a.name === 'module') refs.add(prefix + 'module.' + e.name); if (e.k === 'attr' && e.a && e.a.k === 'attr' && e.a.a && e.a.a.k === 'var' && e.a.a.name === 'data') refs.add(prefix + 'data.' + e.a.name + '.' + e.name); if (e.k === 'attr' && e.a && e.a.k === 'var' && e.a.name === 'local') { const l = inst.ctx.cfg.locals[e.name]; if (l && !this._localWalk) { this._localWalk = true; walk(l.e); this._localWalk = false; } } for (const k of Object.keys(e)) { if (k === 'line') continue; const v = e[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v); } };
    Object.values(inst.r.attrs).forEach(a => walk(a.e)); if (inst.r.forEach) walk(inst.r.forEach); if (inst.r.count) walk(inst.r.count);
    if (inst.r.dependsOn) { const e = inst.r.dependsOn; (e.k === 'list' ? e.items : [e]).forEach(x => { const s = simtfExprText(x); if (s) refs.add(prefix + s); }); }
    return [...refs];
  }
  /* ---- refresh ---- */
  refresh(quiet) {
    this.prior = null; const cfgInsts = this.allInstancesSafe();
    this.prior = {}; this.drift = [];
    for (const si of this.stateInstances()) {
      const a = simtfParseAddr(si.addr); const schema = SIMTF_SCHEMA[a.type]; if (!schema) continue;
      const cfgInst = cfgInsts.find(i => i.addr === si.addr);
      let dev; try { dev = cfgInst ? this.deviceFor(cfgInst.r, null, cfgInst.ctx) : this.deviceFor({ type: a.type, name: a.name, provider: null, where: null }, null, this.root()); } catch (e) { if (e instanceof SimtfError) { dev = Object.values(LAB.devices)[0]; } else throw e; }
      if (!quiet) this.print(`${si.addr}: Refreshing state... [id=${si.inst.attributes.id}]`);
      if (this.o.noRefresh) { this.prior[si.addr] = { attributes: si.inst.attributes, tainted: si.inst.status === 'tainted' }; continue; }
      const actual = simtfRead(a.type, dev, si.inst.attributes);
      if (!actual) { this.drift.push({ addr: si.addr, deleted: true, before: si.inst.attributes }); continue; }
      const merged = Object.assign({}, si.inst.attributes, actual);
      if (a.type === 'lab_user') merged.secret = si.inst.attributes.secret;
      const changed = Object.keys(merged).filter(k => JSON.stringify(merged[k]) !== JSON.stringify(si.inst.attributes[k]));
      if (changed.length) this.drift.push({ addr: si.addr, before: si.inst.attributes, after: merged, changed });
      this.prior[si.addr] = { attributes: merged, tainted: si.inst.status === 'tainted' };
    }
    this.freshCtx();
    return this.drift;
  }
  allInstancesSafe() { try { return this.allInstances(); } catch (e) { if (e instanceof SimtfError) return []; throw e; } }
  /* ---- plan ---- */
  plan(destroy) {
    const changes = [];
    const insts = destroy ? [] : this.allInstances();
    const targets = this.o.targets || [];
    const inTarget = addr => !targets.length || targets.some(t => addr === t || addr.startsWith(t + '[') || addr.startsWith(t + '.'));
    for (const inst of insts) {
      if (!inTarget(inst.addr)) continue;
      this.deviceFor(inst.r, null, inst.ctx);
      const prior = this.prior[inst.addr] || null;
      const after = Object.assign({}, inst.planned);
      const schema = inst.r.schema;
      if (!prior) { after.id = new SimtfUnknown('string'); changes.push({ action: 'create', inst, addr: inst.addr, before: null, after, forces: [] }); continue; }
      const before = prior.attributes; const diffs = []; const forces = [];
      for (const [k, sa] of Object.entries(schema.attrs)) { if (inst.r.lifecycle.ignoreChanges.includes(k) || inst.r.lifecycle.ignoreChanges.includes('all')) { after[k] = before[k]; continue; } const bv = before[k] === undefined ? null : before[k]; const av = after[k]; if (simtfIsUnknown(av)) { diffs.push(k); if (sa.forceNew) forces.push(k); continue; } if (JSON.stringify(bv) !== JSON.stringify(av)) { diffs.push(k); if (sa.forceNew) forces.push(k); } }
      if (prior.tainted || inst.replace || forces.length) { after.id = new SimtfUnknown('string'); changes.push({ action: 'replace', inst, addr: inst.addr, before, after, forces, reason: prior.tainted ? 'tainted' : inst.replace ? 'requested' : 'forces' }); continue; }
      after.id = before.id;
      if (diffs.length) changes.push({ action: 'update', inst, addr: inst.addr, before, after, diffs, forces: [] });
      else changes.push({ action: 'noop', inst, addr: inst.addr, before, after, forces: [] });
    }
    for (const [addr, prior] of Object.entries(this.prior)) {
      if (insts.some(i => i.addr === addr)) continue;
      if (!inTarget(addr)) continue;
      const a = simtfParseAddr(addr); const cfgRes = this.findCfgResource(a);
      let reason = null; if (!destroy) { if (!cfgRes) reason = `because ${a.base} is not in configuration`; else if (cfgRes.forEach) reason = `because key ${JSON.stringify(a.key)} is not in for_each map`; else if (cfgRes.count) reason = `because index [${a.key}] is out of range for count`; }
      changes.push({ action: 'delete', addr, before: prior.attributes, after: null, reason, cfgRes, forces: [] });
    }
    for (const c of changes) { if ((c.action === 'delete' || c.action === 'replace') ) { const res = c.inst ? c.inst.r : c.cfgRes; if (res && res.lifecycle.preventDestroy) throw new SimtfError('Instance cannot be destroyed', `Resource ${c.addr} has lifecycle.prevent_destroy set, but the plan calls for this resource to be destroyed. To avoid this error and continue with the plan, either disable lifecycle.prevent_destroy or reduce the scope of the plan using the -target option.`, res.where); } }
    /* ciktilar */
    const outChanges = [];
    if (!destroy) {
      const ctx = this.root();
      for (const [n, o] of Object.entries(this.cfg.outputs)) {
        let v = simtfEval(o.value, ctx.scope({ file: o.where.file })); const sens = o.sensitive || v instanceof SimtfSensitive; v = simtfDeepPlain(v);
        const prev = this.state.outputs[n];
        const unknown = simtfHasUnknown(v);
        if (!prev) outChanges.push({ action: 'create', name: n, after: v, sensitive: sens, unknown });
        else if (unknown || JSON.stringify(prev.value) !== JSON.stringify(v) || !!prev.sensitive !== sens) outChanges.push({ action: 'update', name: n, before: prev.value, after: v, sensitive: sens, unknown });
        else outChanges.push({ action: 'noop', name: n, before: prev.value, after: v, sensitive: sens });
      }
      for (const n of Object.keys(this.state.outputs)) if (!this.cfg.outputs[n]) outChanges.push({ action: 'delete', name: n, before: this.state.outputs[n].value, sensitive: !!this.state.outputs[n].sensitive });
    } else for (const n of Object.keys(this.state.outputs)) outChanges.push({ action: 'delete', name: n, before: this.state.outputs[n].value, sensitive: !!this.state.outputs[n].sensitive });
    outChanges.sort((x, y) => (x.name < y.name ? -1 : 1));
    const counts = { add: 0, change: 0, destroy: 0 };
    changes.forEach(c => { if (c.action === 'create') counts.add++; else if (c.action === 'update') counts.change++; else if (c.action === 'delete') counts.destroy++; else if (c.action === 'replace') { counts.add++; counts.destroy++; } });
    this.planResult = { changes, outChanges, counts, destroy: !!destroy, drift: this.drift || [] };
    return this.planResult;
  }
  findCfgResource(a) { const ctx = this.ctxs[a.module] || (a.module ? null : this.root()); if (!ctx) return null; return ctx.cfg.resources.find(r => r.type === a.type && r.name === a.name) || null; }
  /* ---- plan ciktisi ---- */
  renderPlan(p) {
    const L = [];
    if (p.drift.length) {
      L.push('', 'Note: Objects have changed outside of Terraform', '', 'Terraform detected the following changes made outside of Terraform since the', 'last "terraform apply" which may have affected this plan:', '');
      for (const d of p.drift) {
        const a = simtfParseAddr(d.addr);
        if (d.deleted) { L.push(`  # ${d.addr} has been deleted`, `  - resource "${a.type}" "${a.name}" {`); L.push(...simtfRenderAttrs(a.type, d.before, null, 'delete', [], 8)); L.push('    }', ''); }
        else { L.push(`  # ${d.addr} has changed`, `  ~ resource "${a.type}" "${a.name}" {`); L.push(...simtfRenderAttrs(a.type, d.before, d.after, 'update', [], 8)); L.push('    }', ''); }
      }
      L.push('', 'Unless you have made equivalent changes to your configuration, or ignored the', 'relevant attributes using ignore_changes, the following plan may include', 'actions to undo or respond to these changes.', '', SIMTF_RULE);
    }
    const real = p.changes.filter(c => c.action !== 'noop'); const outs = p.outChanges.filter(c => c.action !== 'noop');
    if (!real.length && !outs.length) { L.push('', 'No changes. Your infrastructure matches the configuration.', '', 'Terraform has compared your real infrastructure against your configuration', 'and found no differences, so no changes are needed.'); return L; }
    if (!real.length && outs.length) { L.push('', 'Changes to Outputs:'); L.push(...simtfRenderOutputs(outs)); L.push('', 'You can apply this plan to save these new output values to the Terraform', 'state, without changing any real infrastructure.'); return L; }
    const syms = []; if (real.some(c => c.action === 'create')) syms.push('  + create'); if (real.some(c => c.action === 'update')) syms.push('  ~ update in-place'); if (real.some(c => c.action === 'delete')) syms.push('  - destroy'); if (real.some(c => c.action === 'replace')) syms.push('-/+ destroy and then create replacement');
    L.push('', 'Terraform used the selected providers to generate the following execution', 'plan. Resource actions are indicated with the following symbols:', ...syms, '', 'Terraform will perform the following actions:', '');
    for (const c of real) {
      const a = simtfParseAddr(c.addr);
      if (c.action === 'create') { L.push(`  # ${c.addr} will be created`, `  + resource "${a.type}" "${a.name}" {`); L.push(...simtfRenderAttrs(a.type, null, c.after, 'create', [], 8)); L.push('    }', ''); }
      else if (c.action === 'update') { L.push(`  # ${c.addr} will be updated in-place`, `  ~ resource "${a.type}" "${a.name}" {`); L.push(...simtfRenderAttrs(a.type, c.before, c.after, 'update', [], 8)); L.push('    }', ''); }
      else if (c.action === 'delete') { L.push(`  # ${c.addr} will be destroyed`); if (c.reason) L.push(`  # (${c.reason})`); L.push(`  - resource "${a.type}" "${a.name}" {`); L.push(...simtfRenderAttrs(a.type, c.before, null, 'delete', [], 8)); L.push('    }', ''); }
      else if (c.action === 'replace') { L.push(c.reason === 'tainted' ? `  # ${c.addr} is tainted, so must be replaced` : c.reason === 'requested' ? `  # ${c.addr} will be replaced, as requested` : `  # ${c.addr} must be replaced`, `-/+ resource "${a.type}" "${a.name}" {`); L.push(...simtfRenderAttrs(a.type, c.before, c.after, 'replace', c.forces, 8)); L.push('    }', ''); }
    }
    L.push(`Plan: ${p.counts.add} to add, ${p.counts.change} to change, ${p.counts.destroy} to destroy.`);
    if (outs.length) { L.push('', 'Changes to Outputs:'); L.push(...simtfRenderOutputs(outs)); }
    return L;
  }
  /* ---- apply ---- */
  apply(p) {
    const order = this.applyOrder(p.changes.filter(c => c.action !== 'noop'));
    const t0 = Date.now(); const elapsed = () => `${Math.max(0, Math.round((Date.now() - t0) / 1000))}s`;
    let added = 0, changed = 0, destroyed = 0;
    for (const c of order) {
      const a = simtfParseAddr(c.addr);
      if (c.action === 'delete' || c.action === 'replace') {
        const dev = this.devForAddr(c);
        this.print(`${c.addr}: Destroying... [id=${c.before.id}]`);
        const lines = simtfLinesDestroy(a.type, c.before, dev); const r = lines.length ? dev.configure(lines) : { errors: 0 };
        if (r.errors) { this.writeState(); throw new SimtfError(`Error deleting ${a.type}`, `${c.addr}: ${simtfDevErr(r.output)}`, c.inst ? c.inst.r.where : null); }
        this.removeStateInstance(c.addr); this.print(`${c.addr}: Destruction complete after ${elapsed()}`); destroyed++;
      }
      if (c.action === 'create' || c.action === 'replace' || c.action === 'update') {
        const dev = this.devForAddr(c);
        const after = {}; Object.entries(c.after).forEach(([k, v]) => { after[k] = simtfIsUnknown(v) ? null : v; });
        const planned = Object.assign({}, after); delete planned.id;
        if (c.action === 'update') this.print(`${c.addr}: Modifying... [id=${c.before.id}]`); else this.print(`${c.addr}: Creating...`);
        const lines = simtfLinesCreate(a.type, planned, dev); const r = dev.configure(lines);
        if (r.errors) { this.writeState(); throw new SimtfError(`Error ${c.action === 'update' ? 'updating' : 'creating'} ${a.type}`, `${c.addr}: ${simtfDevErr(r.output)}`, c.inst.r.where); }
        const read = simtfRead(a.type, dev, planned) || Object.assign({ id: SIMTF_SCHEMA[a.type].idOf(planned) }, planned);
        const attrs = {}; Object.keys(SIMTF_SCHEMA[a.type].attrs).forEach(k => { attrs[k] = read[k] !== undefined ? read[k] : planned[k]; }); attrs.id = read.id;
        if (a.type === 'lab_user') attrs.secret = planned.secret;
        this.setStateInstance(c.addr, simtfSortObj(attrs), this.depsOf(c.inst).filter(d => !d.startsWith('data.') && !/\.data\./.test(d)));
        if (c.action === 'update') { this.print(`${c.addr}: Modifications complete after ${elapsed()} [id=${attrs.id}]`); changed++; } else { this.print(`${c.addr}: Creation complete after ${elapsed()} [id=${attrs.id}]`); added++; }
      }
    }
    /* ciktilar, yeni id'lerle tekrar degerlendir */
    if (!p.destroy) {
      this.prior = null; const ctx = this.freshCtx(); const outs = {};
      for (const [n, o] of Object.entries(this.cfg.outputs)) { let v = simtfEval(o.value, ctx.scope({ file: o.where.file })); const sens = o.sensitive || v instanceof SimtfSensitive; v = simtfDeepPlain(v); outs[n] = { value: v, type: simtfStateType(v) }; if (sens) outs[n].sensitive = true; }
      this.state.outputs = outs;
    } else this.state.outputs = {};
    this.writeState();
    this.print('', p.destroy ? `Destroy complete! Resources: ${destroyed} destroyed.` : `Apply complete! Resources: ${added} added, ${changed} changed, ${destroyed} destroyed.`);
    if (!p.destroy && Object.keys(this.state.outputs).length) { this.print('', 'Outputs:', ''); this.print(...simtfRenderOutputValues(this.state.outputs)); }
    return { added, changed, destroyed };
  }
  devForAddr(c) { if (c.inst) return this.deviceFor(c.inst.r, null, c.inst.ctx); const a = simtfParseAddr(c.addr); try { return this.deviceFor({ type: a.type, name: a.name, provider: null, where: null }, null, this.ctxs[a.module] || this.root()); } catch (e) { return Object.values(LAB.devices)[0]; } }
  applyOrder(changes) {
    const dels = changes.filter(c => c.action === 'delete'); const rest = changes.filter(c => c.action !== 'delete');
    const depsOf = c => (c.inst ? this.depsOf(c.inst) : []);
    const sorted = []; const seen = new Set(); const byBase = {}; rest.forEach(c => { const a = simtfParseAddr(c.addr); (byBase[a.base] = byBase[a.base] || []).push(c); });
    const visit = (c, stack) => { if (seen.has(c.addr)) return; if (stack.has(c.addr)) throw new SimtfError('Cycle', `${[...stack].join(', ')}, ${c.addr}`); stack.add(c.addr); for (const d of depsOf(c)) { for (const cc of (byBase[d] || [])) visit(cc, stack); if (d.includes('module.')) rest.filter(x => x.addr.startsWith(d + '.')).forEach(x => visit(x, stack)); } stack.delete(c.addr); seen.add(c.addr); sorted.push(c); };
    rest.forEach(c => visit(c, new Set()));
    /* silmeler ters bagimlilik sirasiyla, basit olarak state sirasinin tersi */
    const delOrder = dels.slice().sort((x, y) => (x.addr < y.addr ? 1 : -1));
    return delOrder.concat(sorted);
  }
}
function simtfHasUnknown(v) { if (simtfIsUnknown(v)) return true; if (Array.isArray(v)) return v.some(simtfHasUnknown); if (v && typeof v === 'object') return Object.values(v).some(simtfHasUnknown); return false; }
function simtfSortObj(o) { const r = {}; Object.keys(o).sort().forEach(k => { r[k] = o[k]; }); return r; }
function simtfStateType(v) { if (typeof v === 'string') return 'string'; if (typeof v === 'number') return 'number'; if (typeof v === 'boolean') return 'bool'; if (Array.isArray(v)) return ['tuple', v.map(simtfStateType)]; if (v && typeof v === 'object') { const o = {}; Object.keys(v).forEach(k => { o[k] = simtfStateType(v[k]); }); return ['object', o]; } return 'dynamic'; }
function simtfDevErr(output) { const ls = (output || '').split('\n'); const i = ls.findIndex(l => /^% /.test(l)); return i >= 0 ? `device rejected "${(ls[i - 2] || '').replace(/^[^#]*#/, '').trim() || (ls[i - 1] || '').trim()}": ${ls[i]}` : (output || 'unknown error'); }
function simtfExprText(e) { if (!e) return ''; if (e.k === 'var') return e.name; if (e.k === 'attr') return simtfExprText(e.a) + '.' + e.name; if (e.k === 'index') return simtfExprText(e.a) + '[' + simtfRepr(e.idx.k === 'lit' ? e.idx.v : '?') + ']'; return ''; }
function simtfConvertAttr(v, sa, an, r, ctx) {
  const where = { file: r.where.file, line: r.attrs[an] ? r.attrs[an].line : r.where.line };
  if (sa.type === 'number') { if (typeof v === 'number') return v; if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v); throw new SimtfError('Incorrect attribute value type', `Inappropriate value for attribute "${an}": a number is required.`, where); }
  if (sa.type === 'bool') { if (typeof v === 'boolean') return v; if (v === 'true') return true; if (v === 'false') return false; throw new SimtfError('Incorrect attribute value type', `Inappropriate value for attribute "${an}": a bool is required.`, where); }
  if (sa.type === 'string') { if (typeof v === 'object') throw new SimtfError('Incorrect attribute value type', `Inappropriate value for attribute "${an}": string required.`, where); return String(v); }
  return v;
}
/* ozellik satirlari */
function simtfFmtVal(v, keyCol, sign, step) {
  step = step || 2;
  if (v instanceof SimtfSensitive) return ['(sensitive value)'];
  if (simtfIsUnknown(v)) return ['(known after apply)'];
  if (v === null || v === undefined) return ['null'];
  if (typeof v === 'string') return [JSON.stringify(v)];
  if (typeof v === 'number' || typeof v === 'boolean') return [String(v)];
  const pad = ' '.repeat(keyCol); const inner = ' '.repeat(keyCol + step); const sg = sign ? sign + ' ' : '';
  if (Array.isArray(v) || (v && v.__set)) { const items = Array.isArray(v) ? v : v.items; if (!items.length) return ['[]']; const L = ['[']; items.forEach(x => { const sub = simtfFmtVal(x, keyCol + step, sign, step); L.push(inner + sg + sub[0] + (sub.length === 1 ? ',' : '')); sub.slice(1).forEach((l, i) => L.push(l + (i === sub.length - 2 ? ',' : ''))); }); L.push(pad + ']'); return L; }
  if (typeof v === 'object') { const keys = Object.keys(v).filter(k => !k.startsWith('__')); if (!keys.length) return ['{}']; const w = Math.max(...keys.map(k => JSON.stringify(k).length)); const L = ['{']; keys.sort().forEach(k => { const sub = simtfFmtVal(v[k], keyCol + step, sign, step); L.push(inner + sg + JSON.stringify(k).padEnd(w) + ' = ' + sub[0]); sub.slice(1).forEach(l => L.push(l)); }); L.push(pad + '}'); return L; }
  return [String(v)];
}
function simtfRenderAttrs(type, before, after, action, forces, indent) {
  const pad = ' '.repeat(indent); const schema = SIMTF_SCHEMA[type]; const L = [];
  const keys = ['id'].concat(Object.keys(schema.attrs)).filter((k, i, a) => a.indexOf(k) === i).sort();
  const sens = k => !!(schema.attrs[k] && schema.attrs[k].sensitive);
  const wrap = (k, v) => (sens(k) && v !== null && v !== undefined && !simtfIsUnknown(v) ? new SimtfSensitive(v) : v);
  const rows = []; let hidden = 0;
  for (const k of keys) {
    const bv = before ? (before[k] === undefined ? null : before[k]) : null; const av = after ? (after[k] === undefined ? null : after[k]) : null;
    if (action === 'create') { if (av === null) continue; rows.push({ sign: '+', k, text: simtfFmtVal(wrap(k, av), indent, '+') }); continue; }
    if (action === 'delete') { if (bv === null) continue; const t = simtfFmtVal(wrap(k, bv), indent, '-'); t[t.length - 1] += ' -> null'; rows.push({ sign: '-', k, text: t }); continue; }
    const same = !simtfIsUnknown(av) && JSON.stringify(bv) === JSON.stringify(av);
    if (same) { if (k === 'id' || (action === 'replace' && bv !== null)) rows.push({ sign: ' ', k, text: simtfFmtVal(wrap(k, bv), indent, null) }); else if (bv !== null) hidden++; continue; }
    if (bv === null) { rows.push({ sign: '+', k, text: simtfFmtVal(wrap(k, av), indent, '+') }); continue; }
    if (av === null) { const t = simtfFmtVal(wrap(k, bv), indent, '-'); t[t.length - 1] += ' -> null'; rows.push({ sign: '-', k, text: t }); continue; }
    const b = simtfFmtVal(wrap(k, bv), indent, null), a = simtfFmtVal(wrap(k, av), indent, null);
    const t = b.length === 1 && a.length === 1 ? [b[0] + ' -> ' + a[0]] : b.concat([' -> ']).concat(a);
    if (forces.includes(k)) t[t.length - 1] += ' # forces replacement';
    rows.push({ sign: '~', k, text: t });
  }
  const w = Math.max(0, ...rows.map(r => r.k.length));
  for (const r of rows) { L.push(pad.slice(2) + r.sign + ' ' + r.k.padEnd(w) + ' = ' + r.text[0]); r.text.slice(1).forEach(l => L.push(l)); }
  if (hidden) L.push(pad + `# (${hidden} unchanged attribute${hidden > 1 ? 's' : ''} hidden)`);
  return L;
}
function simtfRenderOutputs(outs) {
  const L = []; const w = Math.max(0, ...outs.map(o => o.name.length));
  for (const o of outs) {
    const val = v => (o.sensitive ? new SimtfSensitive(v) : v);
    if (o.action === 'create') { const t = simtfFmtVal(val(o.after), 4, '+'); L.push('  + ' + o.name.padEnd(w) + ' = ' + t[0]); t.slice(1).forEach(l => L.push(l)); }
    else if (o.action === 'delete') { const t = simtfFmtVal(val(o.before), 4, '-'); t[t.length - 1] += ' -> null'; L.push('  - ' + o.name.padEnd(w) + ' = ' + t[0]); t.slice(1).forEach(l => L.push(l)); }
    else { const b = simtfFmtVal(val(o.before), 4, null), a = simtfFmtVal(val(o.after), 4, null); if (b.length === 1 && a.length === 1) L.push('  ~ ' + o.name.padEnd(w) + ' = ' + b[0] + ' -> ' + a[0]); else { L.push('  ~ ' + o.name.padEnd(w) + ' = ' + b[0]); b.slice(1).forEach(l => L.push(l)); L[L.length - 1] += ' -> ' + a[0]; a.slice(1).forEach(l => L.push(l)); } }
  }
  return L;
}
function simtfRenderOutputValues(outs) { const L = []; Object.keys(outs).sort().forEach(n => { const o = outs[n]; if (o.sensitive) { L.push(`${n} = <sensitive>`); return; } const t = simtfFmtVal(o.value, 0, null); L.push(`${n} = ${t[0]}`); t.slice(1).forEach(l => L.push(l)); }); return L; }
function simtfParseVarValue(s) { s = String(s); const t = s.trim(); if (/^[\[{]/.test(t)) { try { return simtfEvalConst(simtfParseExprSrc(t, '<var>', 1), '<var>'); } catch (e) { return s; } } return s; }

/* ---------- komut satiri ---------- */
LAB.tf = { last: null, history: [], version: SIMTF_VERSION };
function simtfRenderError(e, sh) {
  const L = ['╷', `│ Error: ${e.title}`, '│ '];
  if (e.where && e.where.file && e.where.line) {
    const n = sh.node(e.where.file); const src = n && n.t === 'f' ? n.d.split('\n') : []; const ln = e.where.line;
    const rel = e.where.file.startsWith(sh.cwd + '/') ? e.where.file.slice(sh.cwd.length + 1) : e.where.file;
    const blk = simtfBlockLabelAt(src, ln);
    L.push(`│   on ${rel} line ${ln}${blk ? ', in ' + blk : ''}:`);
    L.push(`│   ${String(ln).padStart(2)}: ${src[ln - 1] !== undefined ? src[ln - 1] : ''}`);
    if (e.where.ctxLine) { L.push('│     ├────────────────', `│     │ ${e.where.ctxLine}`); }
    L.push('│ ');
  }
  const detail = String(e.detail || '');
  detail.split('\n').forEach(l => { simtfWrap(l, 76).forEach(x => L.push('│ ' + x)); });
  L.push('╵');
  return L.join('\n') + '\n';
}
function simtfWrap(s, w) { if (s.length <= w) return [s]; const out = []; let cur = ''; for (const word of s.split(' ')) { if ((cur + ' ' + word).trim().length > w && cur) { out.push(cur); cur = word; } else cur = cur ? cur + ' ' + word : word; } if (cur) out.push(cur); return out; }
function simtfBlockLabelAt(src, line) {
  let depth = 0;
  for (let i = line - 1; i >= 0; i--) { const l = src[i] || ''; const opens = (l.match(/\{/g) || []).length, closes = (l.match(/\}/g) || []).length; if (i === line - 1) { const m = /^\s*([a-z_]+)((?:\s+"[^"]*")*)\s*\{/.exec(l); if (m) return `${m[1]}${m[2]}`; continue; } depth += closes - opens; if (depth < 0) { const m = /^\s*([a-z_]+)((?:\s+"[^"]*")*)\s*\{/.exec(l); if (m) return `${m[1]}${m[2]}`; depth = 0; } }
  return null;
}
function simtfParseArgs(args) {
  const o = { flags: new Set(), vars: [], varFiles: [], targets: [], replace: [], rest: [], out: null, state: null, json: false };
  for (let i = 0; i < args.length; i++) {
    let a = args[i]; if (!a.startsWith('-')) { o.rest.push(a); continue; }
    a = a.replace(/^--/, '-'); let key = a, val = null; const eq = a.indexOf('='); if (eq > 0) { key = a.slice(0, eq); val = a.slice(eq + 1); }
    const need = () => (val !== null ? val : args[++i]);
    if (key === '-var') o.vars.push(need()); else if (key === '-var-file') o.varFiles.push(need()); else if (key === '-target') o.targets.push(need()); else if (key === '-replace') o.replace.push(need()); else if (key === '-out') o.out = need(); else if (key === '-state') o.state = need(); else if (key === '-backup' || key === '-parallelism' || key === '-lock-timeout' || key === '-backend-config' || key === '-from-module' || key === '-chdir' || key === '-plugin-dir' || key === '-lockfile') need();
    else if (key === '-auto-approve') o.flags.add('auto-approve'); else if (key === '-json') { o.json = true; o.flags.add('json'); } else if (key === '-raw') o.flags.add('raw'); else if (key === '-destroy') o.flags.add('destroy'); else if (key === '-refresh-only') o.flags.add('refresh-only'); else if (key === '-check') o.flags.add('check'); else if (key === '-diff') o.flags.add('diff'); else if (key === '-recursive') o.flags.add('recursive'); else if (key === '-list') o.flags.add('list'); else if (key === '-write') o.flags.add('write'); else if (key === '-upgrade') o.flags.add('upgrade'); else if (key === '-reconfigure' || key === '-migrate-state' || key === '-force-copy') o.flags.add(key.slice(1)); else if (key === '-force') o.flags.add('force'); else if (key === '-no-color' || key === '-compact-warnings' || key === '-lock' || key === '-input' || key === '-detailed-exitcode' || key === '-refresh' || key === '-dry-run' || key === '-ignore-remote-version' || key === '-allow-missing-config' || key === '-concise') { if (key === '-refresh' && (val === 'false')) o.flags.add('no-refresh'); if (key === '-lock' || key === '-input' || key === '-refresh') { if (val === null && args[i + 1] && /^(true|false)$/.test(args[i + 1])) { if (key === '-refresh' && args[i + 1] === 'false') o.flags.add('no-refresh'); i++; } } if (key === '-detailed-exitcode') o.flags.add('detailed-exitcode'); }
    else o.flags.add(key.slice(1));
  }
  return o;
}
function simtfRecord(run, extra) { const rec = Object.assign({ cmd: extra.cmd, dir: run.dir, workspace: run.workspace, ok: true, plan: { add: 0, change: 0, destroy: 0 }, time: LAB.util.now() }, extra); LAB.tf.last = rec; LAB.tf.history.push(rec); if (LAB.tf.history.length > 50) LAB.tf.history.shift(); return rec; }
function simtfInit(sh, run, o) {
  const L = ['', 'Initializing the backend...'];
  run.o.skipInitCheck = true;
  let cfg; try { cfg = run.loadConfig(); } catch (e) { if (e instanceof SimtfError && !e.where && /No configuration files/.test(e.title)) { L.push('', 'Initializing provider plugins...', '', 'Terraform has been successfully initialized!', '', 'You may now begin working with Terraform. Try running "terraform plan" to see', 'any changes that are required for your infrastructure. All Terraform commands', 'should now work.'); simtfEnsureDir(sh, run.dir + '/.terraform'); return { out: L.join('\n') + '\n', err: '', code: 0 }; } throw e; }
  if (cfg.terraform && cfg.terraform.backend) { const bt = cfg.terraform.backend.type; if (bt !== 'local') throw new SimtfError('Unsupported backend', `Backend "${bt}" bu lab'da yok, yalnizca backend "local" desteklenir.`, cfg.terraform.where); const p = cfg.terraform.backend.attrs.path; if (p) L.push(`- Using local backend with path ${p}`); L.push('', 'Successfully configured the backend "local"! Terraform will automatically', 'use this backend unless the backend configuration changes.'); }
  const mods = []; const walk = (c, prefix) => { for (const m of c.cfg.modules) { const dir = simtfNorm(c.cfg.dir + '/' + m.source); const key = (prefix ? prefix + '.' : '') + m.name; mods.push({ Key: key, Source: m.source, Dir: dir.startsWith(run.dir + '/') ? dir.slice(run.dir.length + 1) : dir }); const n = sh.node(dir); if (!n || n.t !== 'd') throw new SimtfError('Unreadable module directory', `Unable to evaluate directory symlink: lstat ${dir}: no such file or directory`, m.where); const sub = { cfg: simtfLoadDir(sh, dir, true) }; walk(sub, key); } };
  run.o.skipInitCheck = true; walk({ cfg }, '');
  if (mods.length) { L.splice(1, 0, 'Initializing modules...'); mods.forEach(m => L.splice(2 + mods.indexOf(m), 0, `- ${m.Key} in ${m.Dir}`)); L.splice(2 + mods.length, 0, ''); }
  simtfEnsureDir(sh, run.dir + '/.terraform/modules'); sh.writeFile(run.dir + '/.terraform/modules/modules.json', JSON.stringify({ Modules: [{ Key: '', Source: '', Dir: '.' }].concat(mods) }, null, 2) + '\n', false, 'terraform');
  const req = cfg.terraform && cfg.terraform.requiredProviders && cfg.terraform.requiredProviders.lab; const constraint = req && req.version ? String(req.version) : null;
  const had = !!sh.node(run.dir + '/.terraform.lock.hcl');
  L.push('', 'Initializing provider plugins...');
  if (had && !o.flags.has('upgrade')) L.push(`- Reusing previous version of lab/lab from the dependency lock file`, `- Using previously-installed lab/lab v${SIMTF_PROVIDER_VERSION}`);
  else L.push(`- Finding ${constraint ? constraint + ' version' : 'latest version'} of lab/lab...`, `- Installing lab/lab v${SIMTF_PROVIDER_VERSION}...`, `- Installed lab/lab v${SIMTF_PROVIDER_VERSION} (self-signed, key ID 7A3F2C9D1E4B8A60)`);
  if (!had) L.push('', 'Partner and community providers are signed by their developers.', 'If you\'d like to know more about provider signing, you can read about it here:', 'https://www.terraform.io/docs/cli/plugins/signing.html');
  if (!cfg.terraform || !req) L.push('', '[WARNING]: required_providers blogu yok. terraform { required_providers { lab = { source = "lab/lab" } } } eklemek iyi pratiktir.');
  simtfEnsureDir(sh, run.dir + '/.terraform/providers/registry.terraform.io/lab/lab/' + SIMTF_PROVIDER_VERSION + '/linux_amd64');
  sh.writeFile(run.dir + '/.terraform/providers/registry.terraform.io/lab/lab/' + SIMTF_PROVIDER_VERSION + '/linux_amd64/terraform-provider-lab_v' + SIMTF_PROVIDER_VERSION, '\x7fELF binary', false, 'terraform');
  const lock = `# This file is maintained automatically by "terraform init".\n# Manual edits may be lost in future updates.\n\nprovider "${SIMTF_PROVIDER_ADDR}" {\n  version     = "${SIMTF_PROVIDER_VERSION}"\n${constraint ? `  constraints = "${constraint}"\n` : ''}  hashes = [\n    "h1:${simtfHash('lab' + SIMTF_PROVIDER_VERSION).slice(0, 43)}=",\n    "zh:${simtfHash('zh' + SIMTF_PROVIDER_VERSION).slice(0, 64)}",\n  ]\n}\n`;
  sh.writeFile(run.dir + '/.terraform.lock.hcl', lock, false, 'terraform');
  if (!had) L.push('', 'Terraform has created a lock file .terraform.lock.hcl to record the provider', 'selections it made above. Include this file in your version control repository', 'so that Terraform can guarantee to make the same selections by default when', 'you run "terraform init" in the future.');
  L.push('', 'Terraform has been successfully initialized!', '', 'You may now begin working with Terraform. Try running "terraform plan" to see', 'any changes that are required for your infrastructure. All Terraform commands', 'should now work.', '', 'If you ever set or change modules or backend configuration for Terraform,', 'rerun this command to reinitialize your working directory. If you forget, other', 'commands will detect it and remind you to do so if necessary.');
  return { out: L.join('\n') + '\n', err: '', code: 0 };
}
function simtfEnsureDir(sh, dir) { const parts = dir.split('/').filter(Boolean); let cur = sh.root; for (const x of parts) { if (!cur.c[x]) cur.c[x] = mkdir({}, 0o755, sh.user); cur = cur.c[x]; } }
function simtfValidate(sh, run, o) {
  run.o.skipInitCheck = true;
  const cfg = run.loadConfig();
  /* referanslari dogrula: her ifadeyi kuru degerlendir */
  const ctxs = run.allCtxs();
  for (const ctx of ctxs) {
    const sc = ctx.scope();
    for (const [n, l] of Object.entries(ctx.cfg.locals)) { try { ctx.local(n, l.where); } catch (e) { if (e instanceof SimtfError && /undeclared|Unsupported attribute|unknown function|Invalid function|Call to unknown/.test(e.title + e.detail)) throw e; if (!(e instanceof SimtfError)) throw e; } }
    for (const r of ctx.cfg.resources.concat(ctx.cfg.datas)) { const sc2 = ctx.scope({ file: r.where.file, each: { key: new SimtfUnknown(), value: new SimtfUnknown() }, count: { index: new SimtfUnknown('number') } }); for (const [k, a] of Object.entries(r.attrs)) simtfDryEval(a.e, sc2); if (r.forEach) simtfDryEval(r.forEach, sc2); if (r.count) simtfDryEval(r.count, sc2); }
    for (const [n, out] of Object.entries(ctx.cfg.outputs)) simtfDryEval(out.value, ctx.scope({ file: out.where.file }));
    for (const m of ctx.cfg.modules) for (const [k, a] of Object.entries(m.inputs)) simtfDryEval(a.e, ctx.scope({ file: m.where.file }));
  }
  if (o.json) return { out: JSON.stringify({ format_version: '1.0', valid: true, error_count: 0, warning_count: 0, diagnostics: [] }, null, 2) + '\n', err: '', code: 0 };
  return { out: 'Success! The configuration is valid.\n', err: '', code: 0 };
}
function simtfDryEval(e, sc) { try { simtfEval(e, sc); } catch (err) { if (!(err instanceof SimtfError)) throw err; if (/undeclared|Unsupported attribute|Call to unknown function|Reference to "each"|Reference to "count"|Invalid reference|Variables not allowed|Missing required argument/.test(err.title + ' ' + err.detail)) throw err; } }
/* fmt: girinti ve = hizalama */
function simtfFmtText(src) {
  const lines0 = src.replace(/\r/g, '').split('\n'); const out = []; let depth = 0; let heredoc = null; let blank = 0;
  const parsed = lines0.map(raw => {
    if (heredoc) { out.push(raw); if (raw.trim() === heredoc) heredoc = null; return null; }
    const t = raw.trim();
    if (!t) { blank++; if (blank <= 1 && out.length) out.push(''); return null; }
    blank = 0;
    const closes = /^[}\]\)]/.test(t) ? 1 : 0;
    const d = Math.max(0, depth - closes);
    const line = '  '.repeat(d) + t.replace(/\s+$/, '').replace(/\s*=\s*/, ' = ').replace(/^([\w-]+)\s+=\s+/, '$1 = ');
    let inStr = false; let opens = 0, cl = 0; let esc = false;
    for (let i = 0; i < t.length; i++) { const ch = t[i]; if (esc) { esc = false; continue; } if (ch === '\\') { esc = true; continue; } if (ch === '"') inStr = !inStr; if (inStr) continue; if (ch === '#' || (ch === '/' && t[i + 1] === '/')) break; if (ch === '{' || ch === '[' || ch === '(') opens++; if (ch === '}' || ch === ']' || ch === ')') cl++; }
    depth = Math.max(0, depth + opens - cl);
    const hd = /<<-?([A-Za-z_]\w*)/.exec(t); if (hd) heredoc = hd[1];
    out.push(line); return line;
  });
  void parsed;
  /* = hizalama, ardisik tek satirli attribute gruplarinda */
  let i = 0;
  while (i < out.length) {
    const m = /^(\s*)([\w-]+) = (.*)$/.exec(out[i]);
    if (!m || /[{\[(]\s*$/.test(out[i]) || /<<-?\w+/.test(out[i])) { i++; continue; }
    let j = i; const grp = [];
    while (j < out.length) { const mm = /^(\s*)([\w-]+) = (.*)$/.exec(out[j]); if (!mm || mm[1] !== m[1] || /[{\[(]\s*$/.test(out[j]) || /<<-?\w+/.test(out[j])) break; grp.push(j); j++; }
    const w = Math.max(...grp.map(k => /^(\s*)([\w-]+) = /.exec(out[k])[2].length));
    grp.forEach(k => { const mm = /^(\s*)([\w-]+) = (.*)$/.exec(out[k]); out[k] = mm[1] + mm[2].padEnd(w) + ' = ' + mm[3]; });
    i = j;
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n') + '\n';
}
function simtfFmtCmd(sh, run, o) {
  const targets = o.rest.length ? o.rest.map(p => sh.resolve(p)) : [sh.cwd];
  const files = [];
  for (const t of targets) { const n = sh.node(t); if (!n) return { out: '', err: `Error: No file or directory at ${t}\n`, code: 2 }; if (n.t === 'd') { const walk = (d, p) => Object.keys(d.c).sort().forEach(f => { if (d.c[f].t === 'f' && /\.(tf|tfvars)$/.test(f)) files.push(p + '/' + f); else if (d.c[f].t === 'd' && o.flags.has('recursive') && !f.startsWith('.')) walk(d.c[f], p + '/' + f); }); walk(n, t); } else files.push(t); }
  const changed = []; let diffOut = '';
  for (const f of files) {
    const n = sh.node(f); const fmt = simtfFmtText(n.d);
    if (fmt !== n.d) { changed.push(f); if (o.flags.has('diff')) diffOut += simtfUnifiedDiff(n.d, fmt, f + '.orig', f); if (!o.flags.has('check')) sh.writeFile(f, fmt, false, 'terraform'); }
  }
  const rel = f => (f.startsWith(sh.cwd + '/') ? f.slice(sh.cwd.length + 1) : f);
  if (o.flags.has('check')) return { out: changed.map(rel).join('\n') + (changed.length ? '\n' : ''), err: '', code: changed.length ? 3 : 0 };
  return { out: (o.flags.has('diff') ? diffOut : '') + changed.map(rel).join('\n') + (changed.length ? '\n' : ''), err: '', code: 0 };
}
function simtfUnifiedDiff(a, b, ha, hb) { if (typeof simanUnifiedDiff === 'function') return simanUnifiedDiff(a, b, ha, hb); const la = a.split('\n'), lb = b.split('\n'); return `--- ${ha}\n+++ ${hb}\n` + la.map(l => '-' + l).join('\n') + '\n' + lb.map(l => '+' + l).join('\n') + '\n'; }
function simtfPlanPipeline(sh, run, o, destroy) {
  run.requireInit(); run.loadConfig(); run.loadVars(); run.loadState();
  run.o.noRefresh = o.flags.has('no-refresh'); run.o.targets = o.targets; run.o.replace = o.replace;
  if (o.targets.length) run.warnings.push('Resource targeting is in effect\n\nYou are creating a plan with the -target option, which means that the result of this plan may not represent all of the changes requested by the current configuration.\n\nThe -target option is not for routine use, and is provided only for exceptional situations such as recovering from errors or mistakes, or when Terraform specifically suggests to use it as part of an error message.');
  run.refresh(false);
  const p = run.plan(destroy);
  return p;
}
function simtfSavePlan(sh, run, p, path) {
  const data = { format_version: 'lab-1', terraform_version: SIMTF_VERSION, workspace: run.workspace, dir: run.dir, serial: run.state.serial, lineage: run.state.lineage, destroy: p.destroy, vars: run.inputs, counts: p.counts, changes: p.changes.map(c => ({ action: c.action, addr: c.addr, before: c.before, after: simtfSerial(c.after), forces: c.forces, reason: c.reason || null })), outChanges: p.outChanges.map(oc => ({ action: oc.action, name: oc.name, before: oc.before, after: simtfSerial(oc.after), sensitive: oc.sensitive })), text: run.renderPlan(p).join('\n') };
  const e = sh.writeFile(path, '# terraform plan file, lab format\n' + JSON.stringify(data) + '\n', false, 'terraform'); if (e) throw new SimtfError('Failed to write plan file', e);
}
function simtfSerial(v) { if (simtfIsUnknown(v)) return { __unknown: true }; if (v instanceof SimtfSensitive) return simtfSerial(v.v); if (Array.isArray(v)) return v.map(simtfSerial); if (v && v.__set) return v.items.map(simtfSerial); if (v && typeof v === 'object') { const o = {}; Object.keys(v).forEach(k => { if (!k.startsWith('__')) o[k] = simtfSerial(v[k]); }); return o; } return v === undefined ? null : v; }
function simtfUnserial(v) { if (v && typeof v === 'object' && v.__unknown) return new SimtfUnknown(); if (Array.isArray(v)) return v.map(simtfUnserial); if (v && typeof v === 'object') { const o = {}; Object.keys(v).forEach(k => { o[k] = simtfUnserial(v[k]); }); return o; } return v; }
function simtfLoadPlan(sh, path) { const r = sh.readFile(path, 'terraform'); if (r.err || !r.data.startsWith('# terraform plan file')) return null; try { return JSON.parse(r.data.split('\n')[1]); } catch (e) { return null; } }
function simtfShowState(run) {
  const L = [];
  for (const si of run.stateInstances()) { const a = simtfParseAddr(si.addr); L.push(`# ${si.addr}:`, `resource "${a.type}" "${a.name}" {`); const attrs = si.inst.attributes; const keys = Object.keys(attrs).sort(); const w = Math.max(...keys.map(k => k.length)); keys.forEach(k => { const sens = SIMTF_SCHEMA[a.type] && SIMTF_SCHEMA[a.type].attrs[k] && SIMTF_SCHEMA[a.type].attrs[k].sensitive; if (attrs[k] === null) return; const t = simtfFmtVal(sens ? new SimtfSensitive(attrs[k]) : attrs[k], 4, null, 4); L.push(`    ${k.padEnd(w)} = ${t[0]}`); t.slice(1).forEach(l => L.push(l)); }); L.push('}', ''); }
  if (Object.keys(run.state.outputs).length) { L.push('', 'Outputs:', ''); L.push(...simtfRenderOutputValues(run.state.outputs)); }
  if (!L.length) L.push('The state file is empty. No resources are represented.');
  return L.join('\n') + '\n';
}
function simtfWorkspaceCmd(sh, run, o, tool) {
  const sub = o.rest[0]; const name = o.rest[1];
  const dir = run.dir + '/terraform.tfstate.d'; const n = sh.node(dir); const list = ['default'].concat(n && n.t === 'd' ? Object.keys(n.c).filter(k => n.c[k].t === 'd').sort() : []);
  const setWs = w => { simtfEnsureDir(sh, run.dir + '/.terraform'); sh.writeFile(run.dir + '/.terraform/environment', w === 'default' ? '' : w, false, 'terraform'); };
  if (!sub || sub === 'list') return ok(list.map(w => (w === run.workspace ? '* ' : '  ') + w).join('\n') + '\n');
  if (sub === 'show') return ok(run.workspace + '\n');
  if (sub === 'new') { if (!name) return fail('Usage: terraform [global options] workspace new [OPTIONS] NAME\n', 1); if (!/^[\w-]+$/.test(name)) return fail(`The workspace name "${name}" is not allowed. The name must contain only URL safe characters, and no path separators.\n`, 1); if (list.includes(name)) return fail(`Workspace "${name}" already exists\n`, 1); simtfEnsureDir(sh, dir + '/' + name); setWs(name); return ok(`Created and switched to workspace "${name}"!\n\nYou're now on a new, empty workspace. Workspaces isolate their state,\nso if you run "terraform plan" Terraform will not see any existing state\nfor this configuration.\n`); }
  if (sub === 'select') { if (!name) return fail('Usage: terraform [global options] workspace select NAME\n', 1); if (!list.includes(name)) { if (o.flags.has('or-create')) { simtfEnsureDir(sh, dir + '/' + name); setWs(name); return ok(`Created and switched to workspace "${name}"!\n`); } return fail(`\nWorkspace "${name}" doesn't exist.\n\nYou can create this workspace with the "new" subcommand\nor include the "-or-create" flag with the "select" subcommand.\n`, 1); } setWs(name); return ok(`Switched to workspace "${name}".\n`); }
  if (sub === 'delete') { if (!name) return fail('Usage: terraform [global options] workspace delete [OPTIONS] NAME\n', 1); if (name === 'default') return fail('Workspace "default" cannot be deleted\n', 1); if (name === run.workspace) return fail(`Workspace "${name}" is your active workspace.\n\nYou cannot delete the currently active workspace. Please switch\nto another workspace and try again.\n`, 1); if (!list.includes(name)) return fail(`Workspace "${name}" doesn't exist.\n`, 1); const st = sh.node(dir + '/' + name + '/terraform.tfstate'); if (st && !o.flags.has('force')) { try { const j = JSON.parse(st.d); if ((j.resources || []).some(r => r.instances.length)) return fail(`Workspace "${name}" is not empty.\n\nDeleting "${name}" can result in dangling resources: resources that\nexist but are no longer manageable by Terraform. Please destroy\nthese resources first.  If you want to delete this workspace\nanyway and risk dangling resources, use the '-force' flag.\n`, 1); } catch (e) { /* bos */ } } delete n.c[name]; return ok(`Deleted workspace "${name}"!\n`); }
  return fail(`Usage: ${tool} [global options] workspace <subcommand> [args]\n\n  new, list, show, select and delete Terraform workspaces.\n`, 1);
}
function simtfStateCmd(sh, run, o, tool) {
  const sub = o.rest[0]; run.loadState();
  if (sub === 'list') { const pre = o.rest[1]; const L = run.stateInstances().map(x => x.addr).filter(a => !pre || a === pre || a.startsWith(pre + '.') || a.startsWith(pre + '[')); return ok(L.join('\n') + (L.length ? '\n' : '')); }
  if (sub === 'pull') return ok(JSON.stringify(run.state, null, 2) + '\n');
  if (sub === 'show') { const addr = o.rest[1]; if (!addr) return fail('Exactly one argument expected.\n', 1); const si = run.findState(addr); if (!si) { throw new SimtfError(`No instance found for the given address!`, `This command requires that the address references one specific instance.\nTo view the available instances, use "terraform state list". Please modify \nthe address to reference a specific instance.`); } const a = simtfParseAddr(addr); const attrs = si.inst.attributes; const keys = Object.keys(attrs).sort(); const w = Math.max(...keys.map(k => k.length)); const L = [`# ${addr}:`, `resource "${a.type}" "${a.name}" {`]; keys.forEach(k => { if (attrs[k] === null) return; const sens = SIMTF_SCHEMA[a.type].attrs[k] && SIMTF_SCHEMA[a.type].attrs[k].sensitive; const t = simtfFmtVal(sens ? new SimtfSensitive(attrs[k]) : attrs[k], 4, null, 4); L.push(`    ${k.padEnd(w)} = ${t[0]}`); t.slice(1).forEach(l => L.push(l)); }); L.push('}'); return ok(L.join('\n') + '\n'); }
  if (sub === 'rm') { const addrs = o.rest.slice(1); if (!addrs.length) return fail('At least one address is required.\n', 1); const L = []; for (const addr of addrs) { const matches = run.stateInstances().filter(x => x.addr === addr || x.addr.startsWith(addr + '[')); if (!matches.length) { throw new SimtfError(`No matching objects found.`, `To see which resources are in the state, use "${tool} state list".`); } matches.forEach(m => { run.removeStateInstance(m.addr); L.push(`Removed ${m.addr}`); }); } run.writeState(); L.push(`Successfully removed ${L.length} resource instance(s).`); return ok(L.join('\n') + '\n'); }
  if (sub === 'mv') { const [from, to] = o.rest.slice(1); if (!from || !to) return fail('Exactly two arguments expected.\n', 1); const matches = run.stateInstances().filter(x => x.addr === from || x.addr.startsWith(from + '[')); if (!matches.length) { throw new SimtfError(`Invalid source address`, `Cannot move ${from}: does not match anything in the current state.`); } const ta = simtfParseAddr(to); if (!ta) { throw new SimtfError(`Invalid target address`, `Cannot move to ${to}: invalid resource address.`); } for (const m of matches) { const fa = simtfParseAddr(m.addr); if (fa.type !== ta.type) { throw new SimtfError(`Invalid state move request`, `Cannot move ${m.addr} to ${to}: resource types don't match.`); } const newAddr = m.addr === from ? to : to + m.addr.slice(from.length); if (run.findState(newAddr)) { throw new SimtfError(`Invalid target address`, `Cannot move to ${newAddr}: there is already a resource instance at that address in the current state.`); } const attrs = m.inst.attributes; const taint = m.inst.status === 'tainted'; run.removeStateInstance(m.addr); run.setStateInstance(newAddr, attrs, m.inst.dependencies, true); if (taint) run.findState(newAddr).inst.status = 'tainted'; } run.writeState(); return ok(`Move "${from}" to "${to}"\nSuccessfully moved ${matches.length} object(s).\n`); }
  if (sub === 'push') return fail('terraform state push bu lab\'da yok, state dosyasi zaten yerel.\n', 1);
  if (sub === 'replace-provider') return ok('No matching resources found.\n');
  { throw new SimtfError(`Usage: ${tool} [global options] state <subcommand> [args]`, `  list, show, mv, rm, pull`); }
}
function simtfMain(tool) {
  return function (args) {
    const sh = this;
    if (!LAB.devices || !LAB.devices.r1) return fail(`${tool}: LAB.devices.r1 yok, sim-device.js yuklenmemis. Sayfayi yenile, sorun surerse index.html icinde sim-device.js sirasina bak\n`, 1);
    let cmd = args[0]; let rest = args.slice(1);
    let chdir = null; while (cmd && cmd.startsWith('-')) { if (cmd.startsWith('-chdir=')) chdir = cmd.slice(7); else if (cmd === '-version' || cmd === '--version' || cmd === '-v') cmd = 'version'; else if (cmd === '-help' || cmd === '--help' || cmd === '-h') cmd = 'help'; if (cmd.startsWith('-')) { cmd = rest[0]; rest = rest.slice(1); } }
    const savedCwd = sh.cwd; if (chdir) { const d = sh.resolve(chdir); if (!sh.node(d)) return fail(`Error: Failed to change working directory to ${chdir}: chdir ${chdir}: no such file or directory\n`, 1); sh.cwd = d; }
    try { return simtfDispatch(sh, tool, cmd, rest); }
    catch (e) {
      if (e instanceof SimtfError) { if (LAB.tf.last && LAB.tf.last.cmd === cmd && LAB.tf.last._pending) { LAB.tf.last.ok = false; LAB.tf.last.error = e.title; } else simtfRecord({ dir: sh.cwd, workspace: 'default' }, { cmd, ok: false, error: e.title, detail: e.detail }); return fail(simtfRenderError(e, sh), 1); }
      throw e;
    } finally { sh.cwd = savedCwd; }
  };
}
function simtfDispatch(sh, tool, cmd, rest) {
  const o = simtfParseArgs(rest);
  const ver = tool === 'tofu' ? `OpenTofu v1.8.2\non linux_amd64` : `Terraform v${SIMTF_VERSION}\non linux_amd64`;
  if (!cmd || cmd === 'help') return ok(`Usage: ${tool} [global options] <subcommand> [args]\n\nThe available commands for execution are listed below.\nThe primary workflow commands are given first, followed by\nless common or more advanced commands.\n\nMain commands:\n  init          Prepare your working directory for other commands\n  validate      Check whether the configuration is valid\n  plan          Show changes required by the current configuration\n  apply         Create or update infrastructure\n  destroy       Destroy previously-created infrastructure\n\nAll other commands:\n  console       Try Terraform expressions at an interactive command prompt\n  fmt           Reformat your configuration in the standard style\n  graph         Generate a Graphviz graph of the steps in an operation\n  import        Associate existing infrastructure with a Terraform resource\n  output        Show output values from your root module\n  providers     Show the providers required for this configuration\n  refresh       Update the state to match remote systems\n  show          Show the current state or a saved plan\n  state         Advanced state management\n  taint         Mark a resource instance as not fully functional\n  untaint       Remove the 'tainted' state from a resource instance\n  version       Show the current Terraform version\n  workspace     Workspace management\n\nGlobal options (use these before the subcommand, if any):\n  -chdir=DIR    Switch to a different working directory before executing the\n                given subcommand.\n  -help         Show this help output, or the help for a specified subcommand.\n  -version      An alias for the "version" subcommand.\n`);
  if (cmd === 'version') { const lock = sh.node(sh.cwd + '/.terraform.lock.hcl'); return ok(ver + (lock ? `\n+ provider ${SIMTF_PROVIDER_ADDR} v${SIMTF_PROVIDER_VERSION}` : '') + '\n'); }
  const run = new SimtfRun(sh, { vars: o.vars, varFiles: o.varFiles });
  const recRO = () => { if (['output', 'show', 'graph', 'providers', 'version', 'console', 'refresh'].includes(cmd)) simtfRecord(run, { cmd, ok: true, args: rest.slice() }); };
  recRO();
  const finish = (rec, res) => { res.out = (run.warnings.length ? run.warnings.map(w => '╷\n│ Warning: ' + w.split('\n')[0] + '\n│ \n' + w.split('\n').slice(2).flatMap(l => simtfWrap(l, 76)).map(l => '│ ' + l).join('\n') + '\n╵\n').join('') : '') + res.out; return res; };
  if (cmd === 'init') { const r = simtfInit(sh, run, o); simtfRecord(run, { cmd: 'init', ok: true }); return r; }
  if (cmd === 'validate') { const r = simtfValidate(sh, run, o); simtfRecord(run, { cmd: 'validate', ok: true }); return r; }
  if (cmd === 'fmt') { const r = simtfFmtCmd(sh, run, o); simtfRecord(run, { cmd: 'fmt', ok: r.code === 0, changedFiles: r.out.trim().split('\n').filter(Boolean) }); return r; }
  if (cmd === 'workspace') { const r = simtfWorkspaceCmd(sh, run, o, tool); simtfRecord(run, { cmd: 'workspace', sub: o.rest[0], ok: r.code === 0, workspace: run.readWorkspace() }); return r; }
  if (cmd === 'state') { const r = simtfStateCmd(sh, run, o, tool); simtfRecord(run, { cmd: 'state', sub: o.rest[0], ok: r.code === 0 }); return r; }
  if (cmd === 'providers') { run.o.skipInitCheck = true; run.loadConfig(); const L = ['', 'Providers required by configuration:', '.', `└── provider[${SIMTF_PROVIDER_ADDR}]${run.cfg.terraform && run.cfg.terraform.requiredProviders.lab && run.cfg.terraform.requiredProviders.lab.version ? ' ' + run.cfg.terraform.requiredProviders.lab.version : ''}`]; run.cfg.modules.forEach(m => L.push(`    └── module.${m.name}`)); run.loadState(); if (run.state.resources.length) L.push('', 'Providers required by state:', '', `    provider[${SIMTF_PROVIDER_ADDR}]`); return ok(L.join('\n') + '\n'); }
  if (cmd === 'output') {
    run.loadState(); const outs = run.state.outputs; const name = o.rest[0];
    if (name) { const v = outs[name]; if (!v) return fail(`╷\n│ Error: Output "${name}" not found\n│ \n│ The output variable requested could not be found in the state file. If you\n│ recently added this to your configuration, be sure to run \`terraform apply\`,\n│ since the state won't be updated with new output variables until that\n│ command is run.\n╵\n`, 1); if (o.flags.has('raw')) { if (typeof v.value === 'object' && v.value !== null) return fail(`╷\n│ Error: Unsupported value for raw output\n│ \n│ The -raw option only supports strings, numbers, and boolean values, but\n│ output value "${name}" is ${Array.isArray(v.value) ? 'tuple' : 'object'}.\n│ \n│ Use the -json option for machine-readable representations of output values\n│ that have complex types.\n╵\n`, 1); return ok(String(v.value) + '\n'); } if (o.json) return ok(JSON.stringify(v.value, null, 2) + '\n'); if (v.sensitive) return ok('<sensitive>\n'); return ok(simtfFmtVal(v.value, 0, null).join('\n') + '\n'); }
    if (o.json) return ok(JSON.stringify(Object.fromEntries(Object.keys(outs).sort().map(k => [k, { sensitive: !!outs[k].sensitive, type: outs[k].type, value: outs[k].value }])), null, 2) + '\n');
    if (!Object.keys(outs).length) { return { out: '', err: '╷\n│ Warning: No outputs found\n│ \n│ The state file either has no outputs defined, or all the defined outputs\n│ are empty. Please define an output in your configuration with the `output`\n│ keyword and run `terraform refresh` for it to become available. If you are\n│ using interpolation, please verify the interpolated value is not empty. You\n│ can use the `terraform console` command to assist.\n╵\n', code: 0 }; }
    return ok(simtfRenderOutputValues(outs).join('\n') + '\n');
  }
  if (cmd === 'show') {
    if (o.rest[0]) { const pf = simtfLoadPlan(sh, sh.resolve(o.rest[0])); if (pf) { if (o.json) return ok(JSON.stringify({ format_version: '1.2', terraform_version: SIMTF_VERSION, resource_changes: pf.changes.map(c => ({ address: c.addr, change: { actions: c.action === 'replace' ? ['delete', 'create'] : [c.action === 'noop' ? 'no-op' : c.action], before: c.before, after: c.after } })) }, null, 2) + '\n'); return ok(pf.text + '\n'); } const r = sh.readFile(o.rest[0], 'terraform'); if (r.err) return fail(`╷\n│ Error: Failed to read the given file as a state or plan file\n│ \n│ State read error: Error loading state: open ${o.rest[0]}: no such file or directory\n╵\n`, 1); try { run.state = JSON.parse(r.data); } catch (e) { return fail(`╷\n│ Error: Failed to read the given file as a state or plan file\n│ \n│ State read error: ${e.message}\n╵\n`, 1); } return ok(simtfShowState(run)); }
    run.loadState(); if (o.json) return ok(JSON.stringify({ format_version: '1.0', terraform_version: SIMTF_VERSION, values: { outputs: run.state.outputs, root_module: { resources: run.stateInstances().map(si => ({ address: si.addr, mode: 'managed', type: si.res.type, name: si.res.name, index: si.inst.index_key, provider_name: SIMTF_PROVIDER_ADDR, values: si.inst.attributes })) } } }, null, 2) + '\n');
    return ok(simtfShowState(run));
  }
  if (cmd === 'graph') { run.o.skipInitCheck = true; run.loadConfig(); run.loadVars(); run.loadState(); const L = ['digraph {', '\tcompound = "true"', '\tnewrank = "true"', '\tsubgraph "root" {']; const insts = run.allInstancesSafe(); const nodes = new Set(); insts.forEach(i => { nodes.add(i.base); }); run.allCtxs().forEach(c => c.cfg.datas.forEach(d => nodes.add((c.modulePath ? c.modulePath + '.' : '') + 'data.' + d.type + '.' + d.name))); [...nodes].sort().forEach(n => L.push(`\t\t"[root] ${n} (expand)" [label = "${n}", shape = "box"]`)); L.push(`\t\t"[root] provider[\\"${SIMTF_PROVIDER_ADDR}\\"]" [label = "provider[\\"${SIMTF_PROVIDER_ADDR}\\"]", shape = "diamond"]`); insts.forEach(i => { run.depsOf(i).forEach(d => L.push(`\t\t"[root] ${i.base} (expand)" -> "[root] ${d} (expand)"`)); L.push(`\t\t"[root] ${i.base} (expand)" -> "[root] provider[\\"${SIMTF_PROVIDER_ADDR}\\"]"`); }); L.push('\t}', '}'); return ok([...new Set(L)].join('\n') + '\n'); }
  if (cmd === 'console') return fail(`${tool} console bu lab'da interaktif calismaz. Ifadeleri bir output bloguna yazip terraform plan ile gor, ya da echo 'length(var.vlans)' | terraform console dene\n`, 1);
  if (cmd === 'login' || cmd === 'logout' || cmd === 'get' || cmd === 'force-unlock' || cmd === 'test' || cmd === 'metadata') { if (cmd === 'get') { simtfInit(sh, run, o); return ok(''); } return fail(`${tool} ${cmd} bu lab'da desteklenmiyor\n`, 1); }
  if (cmd === 'taint' || cmd === 'untaint') {
    const addr = o.rest[0]; if (!addr) return fail('Exactly one argument expected.\n', 1); run.loadState(); const si = run.findState(addr);
    if (!si) return fail(`╷\n│ Error: No such resource instance\n│ \n│ There is no resource instance in the state with the address ${addr}.\n╵\n`, 1);
    if (cmd === 'taint') { si.inst.status = 'tainted'; run.writeState(); simtfRecord(run, { cmd: 'taint', addr, ok: true }); return ok(`Resource instance ${addr} has been marked as tainted.\n`); }
    if (si.inst.status !== 'tainted') return fail(`╷\n│ Error: Resource instance is not tainted\n│ \n│ Resource instance ${addr} is not currently tainted, and so it cannot be\n│ untainted.\n╵\n`, 1);
    delete si.inst.status; run.writeState(); simtfRecord(run, { cmd: 'untaint', addr, ok: true }); return ok(`Resource instance ${addr} has been successfully untainted.\n`);
  }
  if (cmd === 'import') {
    const [addr, id] = o.rest; if (!addr || !id) return fail('Error: Too few command line arguments\n\nTo import a resource, run:\n  terraform import <address> <id>\n', 1);
    run.requireInit(); run.loadConfig(); run.loadVars(); run.loadState();
    const a = simtfParseAddr(addr); if (!a || a.mode !== 'managed') return fail(`╷\n│ Error: Invalid address\n│ \n│ Resource instance address "${addr}" is not valid.\n╵\n`, 1);
    const cfgRes = run.findCfgResource(a); if (!cfgRes) throw new SimtfError('Resource not found in configuration', `resource address "${addr}" does not exist in the configuration.\n\nBefore importing this resource, please create its configuration in the root module. For example:\n\nresource "${a.type}" "${a.name}" {\n  # (resource arguments)\n}`);
    if (run.findState(addr)) throw new SimtfError('Resource already managed by Terraform', `Terraform is already managing a remote object for ${addr}. To import to this address you must first remove the existing object from the state.`);
    const dev = run.deviceFor(cfgRes, null, run.ctxs[a.module] || run.root());
    run.print(`${addr}: Importing from ID "${id}"...`, `${addr}: Import prepared!`, `  Prepared ${a.type} for import`, `${addr}: Refreshing state... [id=${id}]`);
    const read = simtfRead(a.type, dev, { id, vlan_id: id, name: id, username: id, address: id, ip: id });
    if (!read) throw new SimtfError('Cannot import non-existent remote object', `While attempting to import an existing object to "${addr}", the provider detected that no object exists with the given id. Only pre-existing objects can be imported; check that the id is correct and that it is associated with the provider's configured region or endpoint, or use "terraform apply" to create a new remote object for this resource.`);
    const attrs = {}; Object.keys(SIMTF_SCHEMA[a.type].attrs).forEach(k => { attrs[k] = read[k] === undefined ? null : read[k]; }); attrs.id = read.id;
    run.setStateInstance(addr, simtfSortObj(attrs), []); run.writeState();
    run.print('', 'Import successful!', '', 'The resources that were imported are shown above. These resources are now in', 'your Terraform state and will henceforth be managed by Terraform.');
    simtfRecord(run, { cmd: 'import', addr, id, ok: true }); return ok(run.out.join('\n') + '\n');
  }
  if (cmd === 'refresh') { run.requireInit(); run.loadConfig(); run.loadVars(); run.loadState(); run.refresh(false); for (const d of run.drift) { if (d.deleted) run.removeStateInstance(d.addr); else { const si = run.findState(d.addr); si.inst.attributes = d.after; } } const ctx = run.freshCtx(); run.prior = null; const outs = {}; try { for (const [n, out] of Object.entries(run.cfg.outputs)) { const v = simtfDeepPlain(simtfEval(out.value, ctx.scope({ file: out.where.file }))); if (!simtfHasUnknown(v)) { outs[n] = { value: v, type: simtfStateType(v) }; if (out.sensitive) outs[n].sensitive = true; } } run.state.outputs = outs; } catch (e) { if (!(e instanceof SimtfError)) throw e; } run.writeState(); if (Object.keys(run.state.outputs).length) { run.print('', 'Outputs:', ''); run.print(...simtfRenderOutputValues(run.state.outputs)); } simtfRecord(run, { cmd: 'refresh', ok: true, drift: run.drift.map(d => d.addr) }); return ok(run.out.join('\n') + '\n'); }
  if (cmd === 'plan' || cmd === 'apply' || cmd === 'destroy') {
    const isDestroy = cmd === 'destroy' || o.flags.has('destroy');
    const rec = simtfRecord(run, { cmd, ok: true, destroy: isDestroy, _pending: true });
    if (cmd === 'apply' && o.rest[0]) {
      const pf = simtfLoadPlan(sh, sh.resolve(o.rest[0])); if (!pf) throw new SimtfError('Failed to load "' + o.rest[0] + '" as a plan file', `Error: ${o.rest[0]} is not a valid plan file. Create one with "terraform plan -out=${o.rest[0]}".`);
      run.requireInit(); run.loadConfig(); run.inputs = pf.vars || {}; run.loadState();
      if (run.stateIsNew && pf.serial === 0) run.state.lineage = pf.lineage;
      if (pf.serial !== run.state.serial || pf.lineage !== run.state.lineage) throw new SimtfError('Saved plan is stale', 'The given plan file can no longer be applied because the state was changed by another operation after the plan was created.');
      run.refresh(true); run.allInstancesSafe(); const insts = run.allInstances();
      const p = { destroy: pf.destroy, counts: pf.counts, changes: pf.changes.map(c => ({ action: c.action, addr: c.addr, before: c.before, after: simtfUnserial(c.after), forces: c.forces, reason: c.reason, inst: insts.find(i => i.addr === c.addr) || null, cfgRes: run.findCfgResource(simtfParseAddr(c.addr)) })), outChanges: pf.outChanges, drift: [] };
      for (const c of p.changes) if ((c.action === 'create' || c.action === 'update' || c.action === 'replace') && !c.inst) throw new SimtfError('Saved plan is stale', `Resource ${c.addr} in the plan no longer exists in the configuration.`);
      const r = run.apply(p); rec.plan = pf.counts; rec.applied = r; rec.ok = true; rec.outputs = run.state.outputs; rec.changes = p.changes.map(c => ({ addr: c.addr, action: c.action })); delete rec._pending;
      return finish(rec, ok(run.out.join('\n') + '\n'));
    }
    const p = simtfPlanPipeline(sh, run, o, isDestroy);
    rec.plan = p.counts; rec.changes = p.changes.filter(c => c.action !== 'noop').map(c => ({ addr: c.addr, action: c.action, forces: c.forces })); rec.drift = p.drift.map(d => ({ addr: d.addr, deleted: !!d.deleted, changed: d.changed || [] })); rec.outChanges = p.outChanges.filter(c => c.action !== 'noop').map(c => c.name);
    const planLines = run.renderPlan(p);
    const hasChanges = p.changes.some(c => c.action !== 'noop') || p.outChanges.some(c => c.action !== 'noop');
    if (cmd === 'plan') {
      run.print(...planLines);
      if (o.out) { simtfSavePlan(sh, run, p, sh.resolve(o.out)); run.print('', SIMTF_RULE, '', `Saved the plan to: ${o.out}`, '', 'To perform exactly these actions, run the following command to apply:', `    ${tool} apply "${o.out}"`); rec.outFile = sh.resolve(o.out); }
      else if (hasChanges) run.print('', SIMTF_RULE, '', 'Note: You didn\'t use the -out option to save this plan, so Terraform can\'t', `guarantee to take exactly these actions if you run "${tool} apply" now.`);
      delete rec._pending; rec.hasChanges = hasChanges;
      return finish(rec, { out: run.out.join('\n') + '\n', err: '', code: o.flags.has('detailed-exitcode') && hasChanges ? 2 : 0 });
    }
    run.print(...planLines);
    if (!hasChanges) { delete rec._pending; rec.applied = { added: 0, changed: 0, destroyed: 0 }; if (isDestroy) { run.state.outputs = {}; run.writeState(); } run.print('', isDestroy ? 'Destroy complete! Resources: 0 destroyed.' : 'Apply complete! Resources: 0 added, 0 changed, 0 destroyed.'); if (!isDestroy && Object.keys(run.state.outputs).length) { run.print('', 'Outputs:', ''); run.print(...simtfRenderOutputValues(run.state.outputs)); } return finish(rec, ok(run.out.join('\n') + '\n')); }
    if (!o.flags.has('auto-approve')) {
      run.print('', isDestroy ? 'Do you really want to destroy all resources?' : 'Do you want to perform these actions?', isDestroy ? '  Terraform will destroy all your managed infrastructure, as shown above.' : '  Terraform will perform the actions described above.', "  Only 'yes' will be accepted to " + (isDestroy ? 'confirm.' : 'approve.'), '', '  Enter a value: ', '');
      run.print(`Error: ${isDestroy ? 'Destroy' : 'Apply'} cancelled.`, '', `Bu lab'in terminali interaktif onay alamaz. Plani yukarida gordun, uygulamak icin`, `  ${tool} ${cmd} -auto-approve`, `ya da once ${tool} plan -out=tfplan, sonra ${tool} apply tfplan kullan.`);
      rec.ok = false; rec.cancelled = true; delete rec._pending;
      return finish(rec, { out: run.out.join('\n') + '\n', err: '', code: 1 });
    }
    run.print('');
    const r = run.apply(p); rec.applied = r; rec.outputs = run.state.outputs; delete rec._pending;
    return finish(rec, ok(run.out.join('\n') + '\n'));
  }
  return fail(`${tool}: Unknown command "${cmd}"\n\nUsage: ${tool} [global options] <subcommand> [args]\n\nRun '${tool} -help' for a list of available commands.\n`, 1);
}
registerExt({
  commands: { terraform: simtfMain('terraform'), tofu: simtfMain('tofu') },
  manual: {
    terraform: { d: 'Infrastructure as Code. HCL ile yazilan lab_vlan, lab_interface, lab_user, lab_ntp_server, lab_bgp_neighbor kaynaklarini r1 ve r2 uzerine uygular, state terraform.tfstate dosyasinda', u: ['terraform init', 'terraform validate', 'terraform fmt [-check] [-diff] [-recursive]', 'terraform plan [-out=tfplan] [-var k=v] [-var-file=f] [-destroy] [-replace=addr] [-target=addr]', 'terraform apply [-auto-approve | tfplan]', 'terraform destroy -auto-approve', 'terraform output [-json] [-raw] [ad]', 'terraform show [tfplan]', 'terraform state list|show|mv|rm|pull', 'terraform import addr id', 'terraform taint|untaint addr', 'terraform workspace list|new|select|show|delete', 'terraform refresh', 'terraform graph', 'terraform providers', 'tofu ayni komutlarla calisir'], e: ['terraform init', 'terraform plan', 'terraform apply -auto-approve', 'terraform plan -out=tfplan && terraform apply tfplan', 'terraform import lab_vlan.voice 20', 'terraform state list', 'terraform workspace new rtm'] },
    'terraform-plan': { d: 'Konfigurasyon ile state ve cihazi karsilastirir, + create, ~ update in-place, - destroy, -/+ replace eylemlerini listeler. Cihazda elle degisiklik varsa once Objects have changed outside of Terraform notu gelir', u: ['terraform plan', 'terraform plan -out=tfplan', 'terraform plan -destroy', 'terraform plan -refresh=false', 'terraform plan -var "site=rtm"'], e: ['terraform plan', 'terraform plan -out=tfplan'] },
    'terraform-state': { d: 'State dosyasini inceler ve duzenler. mv adres degistirir, rm state\'ten cikarir ama cihaza dokunmaz', u: ['terraform state list', 'terraform state show lab_vlan.mgmt', 'terraform state mv lab_vlan.a lab_vlan.b', 'terraform state rm lab_vlan.a', 'terraform state pull'], e: ['terraform state list', 'terraform state show lab_vlan.mgmt'] },
    tofu: { d: 'OpenTofu, terraform ile ayni komut seti', u: ['tofu init', 'tofu plan', 'tofu apply -auto-approve'], e: ['tofu plan'] },
  },
  onReset: () => { LAB.tf.last = null; LAB.tf.history = []; },
});
