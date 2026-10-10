'use strict';
/* Kucuk bir vim. Buffer, cursor, normal insert ve command modlari.
   key(k) ile tus alir, k tek karakter ya da 'Escape' 'Enter' 'Backspace' 'ArrowLeft' gibi isimdir.
   Tarayicida app.js kullanir, test harness'i ayni motoru dosya uzerinde calistirir. */

class VimEditor {
  constructor(text) {
    this.lines = String(text || '').replace(/\n$/, '').split('\n');
    if (!this.lines.length) this.lines = [''];
    this.row = 0; this.col = 0;
    this.mode = 'normal';
    this.cmd = '';
    this.pending = '';
    this.count = '';
    this.reg = null;
    this.undo = [];
    this.msg = '';
    this.search = '';
    this.log = [];
    this.done = null;
    this.dirty = false;
    this.numbers = false;
  }

  text() { return this.lines.join('\n') + '\n'; }
  snapshot() { this.undo.push({ lines: this.lines.slice(), row: this.row, col: this.col }); if (this.undo.length > 50) this.undo.shift(); this.dirty = true; }
  clamp() {
    this.row = Math.max(0, Math.min(this.lines.length - 1, this.row));
    const max = this.mode === 'insert' ? this.lines[this.row].length : Math.max(0, this.lines[this.row].length - 1);
    this.col = Math.max(0, Math.min(max, this.col));
  }
  status() {
    if (this.mode === 'insert') return '-- INSERT --';
    if (this.mode === 'cmd') return ':' + this.cmd;
    return this.msg || (this.pending ? this.pending : '');
  }

  key(k) {
    this.msg = '';
    if (this.mode === 'insert') return this.insertKey(k);
    if (this.mode === 'cmd') return this.cmdKey(k);
    return this.normalKey(k);
  }

  insertKey(k) {
    const L = this.lines;
    if (k === 'Escape') { this.mode = 'normal'; this.col--; this.clamp(); return; }
    if (k === 'Enter') { this.snapshotOnce(); const rest = L[this.row].slice(this.col); L[this.row] = L[this.row].slice(0, this.col); L.splice(this.row + 1, 0, rest); this.row++; this.col = 0; return; }
    if (k === 'Backspace') {
      this.snapshotOnce();
      if (this.col > 0) { L[this.row] = L[this.row].slice(0, this.col - 1) + L[this.row].slice(this.col); this.col--; }
      else if (this.row > 0) { const prev = L[this.row - 1]; this.col = prev.length; L[this.row - 1] = prev + L[this.row]; L.splice(this.row, 1); this.row--; }
      return;
    }
    if (k.startsWith('Arrow')) return this.move(k);
    if (k === 'Tab') k = '  ';
    if (k.length === 1 || k === '  ') { this.snapshotOnce(); L[this.row] = L[this.row].slice(0, this.col) + k + L[this.row].slice(this.col); this.col += k.length; }
  }
  snapshotOnce() { if (!this._insSnap) { this.snapshot(); this._insSnap = true; } }

  move(k) {
    if (k === 'ArrowLeft' || k === 'h') this.col--;
    if (k === 'ArrowRight' || k === 'l') this.col++;
    if (k === 'ArrowUp' || k === 'k') this.row--;
    if (k === 'ArrowDown' || k === 'j') this.row++;
    this.clamp();
  }

  wordEnd(dir) {
    const L = this.lines;
    let r = this.row, c = this.col;
    const line = L[r];
    if (dir > 0) {
      const rest = line.slice(c);
      const m = /^\S*\s*/.exec(rest);
      if (m && c + m[0].length < line.length) return { r, c: c + m[0].length };
      if (r < L.length - 1) { const nl = L[r + 1]; const mm = /^\s*/.exec(nl); return { r: r + 1, c: mm[0].length }; }
      return { r, c: Math.max(0, line.length - 1) };
    }
    const before = line.slice(0, c).replace(/\s+$/, '');
    const m = /\S+$/.exec(before);
    if (m) return { r, c: before.length - m[0].length };
    if (r > 0) { const pl = L[r - 1]; const mm = /\S+\s*$/.exec(pl); return { r: r - 1, c: mm ? pl.length - mm[0].length : 0 }; }
    return { r, c: 0 };
  }

  normalKey(k) {
    const L = this.lines;
    const n = Math.max(1, parseInt(this.count || '1', 10));
    if (/^\d$/.test(k) && !(k === '0' && !this.count)) { this.count += k; return; }
    if (k === 'Escape') { this.pending = ''; this.count = ''; return; }
    if (k.startsWith('Arrow')) { for (let i = 0; i < n; i++) this.move(k); this.count = ''; return; }
    if (k === 'Enter') k = 'j';
    if (k === 'Backspace') k = 'h';

    /* bekleyen iki tuslu komutlar */
    if (this.pending) {
      const p = this.pending; this.pending = '';
      const op = p[0];
      if (op === 'r' && k.length === 1) { this.snapshot(); L[this.row] = L[this.row].slice(0, this.col) + k + L[this.row].slice(this.col + 1); this.log.push('r'); this.count = ''; return; }
      if (op === 'g' && k === 'g') { this.row = n > 1 && this.count ? n - 1 : 0; this.col = 0; this.clamp(); this.log.push('gg'); this.count = ''; return; }
      if (op === 'Z' && k === 'Z') { this.log.push('ZZ'); this.done = { save: true }; return; }
      if (op === 'Z' && k === 'Q') { this.log.push('ZQ'); this.done = { save: false }; return; }
      if (op === 'd' || op === 'y' || op === 'c') {
        if (k === op) {
          const cnt = Math.min(n, L.length - this.row);
          const taken = L.slice(this.row, this.row + cnt);
          this.reg = { lines: taken };
          if (op === 'y') { this.msg = cnt > 1 ? cnt + ' lines yanked' : ''; this.log.push('yy'); this.count = ''; return; }
          this.snapshot();
          L.splice(this.row, cnt);
          if (!L.length) L.push('');
          this.log.push(op + op);
          if (op === 'c') { L.splice(this.row, 0, ''); this.mode = 'insert'; this._insSnap = true; this.col = 0; }
          this.clamp(); this.count = ''; return;
        }
        if (k === 'w' || k === '$' || k === '0') {
          const line = L[this.row];
          let from = this.col, to = this.col;
          if (k === 'w') { const e = this.wordEnd(1); to = e.r === this.row ? e.c : line.length; }
          if (k === '$') to = line.length;
          if (k === '0') { from = 0; to = this.col; }
          const piece = line.slice(from, to);
          this.reg = { text: piece };
          if (op !== 'y') { this.snapshot(); L[this.row] = line.slice(0, from) + line.slice(to); this.col = from; }
          if (op === 'c') { this.mode = 'insert'; this._insSnap = true; }
          this.log.push(op + k); this.clamp(); this.count = ''; return;
        }
        this.count = ''; return;
      }
      this.count = '';
      return;
    }

    switch (k) {
      case 'h': case 'j': case 'k': case 'l': for (let i = 0; i < n; i++) this.move(k); break;
      case '0': this.col = 0; break;
      case '^': { const m = /^\s*/.exec(L[this.row]); this.col = m[0].length; break; }
      case '$': this.col = Math.max(0, L[this.row].length - 1); break;
      case 'w': for (let i = 0; i < n; i++) { const e = this.wordEnd(1); this.row = e.r; this.col = e.c; } break;
      case 'b': for (let i = 0; i < n; i++) { const e = this.wordEnd(-1); this.row = e.r; this.col = e.c; } break;
      case 'G': this.row = this.count ? n - 1 : L.length - 1; this.col = 0; this.log.push('G'); break;
      case 'g': case 'd': case 'y': case 'c': case 'r': case 'Z': this.pending = k; return;
      case 'x': this.snapshot(); for (let i = 0; i < n; i++) L[this.row] = L[this.row].slice(0, this.col) + L[this.row].slice(this.col + 1); this.log.push('x'); break;
      case 'X': if (this.col > 0) { this.snapshot(); L[this.row] = L[this.row].slice(0, this.col - 1) + L[this.row].slice(this.col); this.col--; } break;
      case 'D': this.snapshot(); this.reg = { text: L[this.row].slice(this.col) }; L[this.row] = L[this.row].slice(0, this.col); this.log.push('D'); break;
      case 'J': if (this.row < L.length - 1) { this.snapshot(); const nx = L[this.row + 1].replace(/^\s+/, ''); this.col = L[this.row].length; L[this.row] = L[this.row] + (nx ? ' ' + nx : ''); L.splice(this.row + 1, 1); this.log.push('J'); } break;
      case 'p': case 'P': {
        if (!this.reg) { this.msg = 'E353: Nothing in register'; break; }
        this.snapshot();
        if (this.reg.lines) { const at = k === 'p' ? this.row + 1 : this.row; for (let i = 0; i < n; i++) L.splice(at, 0, ...this.reg.lines); this.row = at; this.col = 0; }
        else { const c = k === 'p' ? this.col + 1 : this.col; L[this.row] = L[this.row].slice(0, c) + this.reg.text.repeat(n) + L[this.row].slice(c); this.col = c + this.reg.text.length * n - 1; }
        this.log.push(k); break;
      }
      case 'u': { const u = this.undo.pop(); if (u) { this.lines = u.lines; this.row = u.row; this.col = u.col; this.msg = '1 change; before'; } else this.msg = 'Already at oldest change'; this.log.push('u'); break; }
      case 'i': this.mode = 'insert'; this._insSnap = false; this.log.push('i'); break;
      case 'a': this.mode = 'insert'; this._insSnap = false; if (L[this.row].length) this.col++; this.log.push('a'); break;
      case 'I': this.mode = 'insert'; this._insSnap = false; this.col = (/^\s*/.exec(L[this.row]))[0].length; this.log.push('I'); break;
      case 'A': this.mode = 'insert'; this._insSnap = false; this.col = L[this.row].length; this.log.push('A'); break;
      case 'o': this.snapshot(); this._insSnap = true; L.splice(this.row + 1, 0, ''); this.row++; this.col = 0; this.mode = 'insert'; this.log.push('o'); break;
      case 'O': this.snapshot(); this._insSnap = true; L.splice(this.row, 0, ''); this.col = 0; this.mode = 'insert'; this.log.push('O'); break;
      case ':': this.mode = 'cmd'; this.cmd = ''; this.count = ''; return;
      case '/': this.mode = 'cmd'; this.cmd = '/'; this.count = ''; return;
      case 'n': case 'N': this.findNext(k === 'N' ? -1 : 1); break;
      case '*': { const m = /\w+/.exec(L[this.row].slice(this.col)); if (m) { this.search = m[0]; this.findNext(1); } break; }
      default: break;
    }
    this.clamp();
    this.count = '';
  }

  findNext(dir) {
    if (!this.search) { this.msg = 'E35: No previous regular expression'; return; }
    const L = this.lines; const total = L.length;
    for (let step = 0; step < total; step++) {
      const r = ((this.row + dir * step) % total + total) % total;
      const line = L[r];
      let idx = -1;
      if (step === 0) { idx = dir > 0 ? line.indexOf(this.search, this.col + 1) : line.lastIndexOf(this.search, this.col - 1); if (dir < 0 && this.col === 0) idx = -1; }
      else idx = dir > 0 ? line.indexOf(this.search) : line.lastIndexOf(this.search);
      if (idx >= 0) { this.row = r; this.col = idx; this.log.push('/' + this.search); return; }
    }
    this.msg = 'E486: Pattern not found: ' + this.search;
  }

  cmdKey(k) {
    if (k === 'Escape') { this.mode = 'normal'; this.cmd = ''; return; }
    if (k === 'Backspace') { this.cmd = this.cmd.slice(0, -1); if (!this.cmd) this.mode = 'normal'; return; }
    if (k === 'Enter') { const c = this.cmd; this.mode = 'normal'; this.cmd = ''; this.runCmd(c); return; }
    if (k.length === 1) this.cmd += k;
  }

  runCmd(c) {
    const L = this.lines;
    let m;
    if (c.startsWith('/')) { this.search = c.slice(1); this.col--; this.findNext(1); this.clamp(); return; }
    this.log.push(':' + c);
    if (c === 'w') { this.done = { save: true, stay: true }; return; }
    if (c === 'wq' || c === 'x' || c === 'wq!') { this.done = { save: true }; return; }
    if (c === 'q') { if (this.dirty) { this.msg = 'E37: No write since last change (add ! to override)'; return; } this.done = { save: false }; return; }
    if (c === 'q!') { this.done = { save: false }; return; }
    if ((m = /^(\d+)$/.exec(c))) { this.row = Math.min(L.length, +m[1]) - 1; this.col = 0; this.clamp(); return; }
    if (c === '$') { this.row = L.length - 1; this.clamp(); return; }
    if (c === 'set nu' || c === 'set number') { this.numbers = true; return; }
    if (c === 'set nonu' || c === 'set nonumber') { this.numbers = false; return; }
    if (c === 'noh' || c === 'nohlsearch') return;
    if ((m = /^(%|\d+,\d+|\d+|)s\/((?:[^/\\]|\\.)*)\/((?:[^/\\]|\\.)*)\/?([gi]*)$/.exec(c))) {
      let from = this.row, to = this.row;
      if (m[1] === '%') { from = 0; to = L.length - 1; }
      else if (m[1].includes(',')) { const [a, b] = m[1].split(',').map(Number); from = a - 1; to = b - 1; }
      else if (m[1]) { from = to = +m[1] - 1; }
      let re;
      try { re = new RegExp(m[2].replace(/\\\//g, '/'), m[4].includes('g') ? 'g' : '' + (m[4].includes('i') ? 'i' : '')); } catch (e) { this.msg = 'E486: Pattern not found: ' + m[2]; return; }
      let count = 0;
      this.snapshot();
      for (let r = from; r <= to && r < L.length; r++) { const before = L[r]; L[r] = before.replace(re, m[3].replace(/\\\//g, '/')); if (before !== L[r]) count++; }
      this.msg = count ? `${count} substitution${count > 1 ? 's' : ''} on ${count} line${count > 1 ? 's' : ''}` : 'E486: Pattern not found: ' + m[2];
      this.clamp();
      return;
    }
    if ((m = /^(\d+)?d$/.exec(c))) { this.snapshot(); L.splice(m[1] ? +m[1] - 1 : this.row, 1); if (!L.length) L.push(''); this.clamp(); return; }
    this.msg = 'E492: Not an editor command: ' + c;
  }

  /* Tus dizisini ardarda uygular, test ve replay icin. <Esc> <CR> <BS> isimleri desteklenir */
  feed(seq) {
    const toks = seq.match(/<Esc>|<CR>|<BS>|<Tab>|<Left>|<Right>|<Up>|<Down>|[\s\S]/g) || [];
    const map = { '<Esc>': 'Escape', '<CR>': 'Enter', '<BS>': 'Backspace', '<Tab>': 'Tab', '<Left>': 'ArrowLeft', '<Right>': 'ArrowRight', '<Up>': 'ArrowUp', '<Down>': 'ArrowDown', '\n': 'Enter' };
    for (const tk of toks) { if (this.done && !this.done.stay) break; if (this.done && this.done.stay) this.done = null; this.key(map[tk] || tk); }
    return this;
  }
}

/* Shell'e vim gecmisi ekler, gorev kontrolleri buradan okur */
if (typeof registerExt === 'function') registerExt({ onReset: sh => { sh.vimLog = []; } });

if (typeof module !== 'undefined') module.exports = { VimEditor };
