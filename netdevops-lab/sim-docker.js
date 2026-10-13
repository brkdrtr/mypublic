'use strict';
/* sim-docker. Docker Engine simulasyonu. Durum /var/lib/lab-docker/state.json icinde JSON olarak durur,
   boylece kayit ve geri yukleme ile birlikte tasinir, registerExt onReset ile sifirlanir.
   Dis arayuz: SIMDK_load(sh), SIMDK_save(sh, st), SIMDK_imageKnown(sh, ref), SIMDK_imageRecord(sh, ref),
   SIMDK_runProgram(src, files, env, argv) ve SIMDK_ensureRegistry(sh, ref). sim-k8s.js bunlari kullanir. */

const SIMDK_STATE = '/var/lib/lab-docker/state.json';
const SIMDK_REGISTRY = 'registry.lab';
let SIMDK_lastSh = null;

/* ---------- bilinen public imajlar ---------- */
const SIMDK_PUBLIC = {
  'python:3.12-slim': { size: 125000000, os: 'debian', cmd: ['python3'], env: ['PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'LANG=C.UTF-8', 'GPG_KEY=7169605F62C751356D054A26A821E680E5FA6305', 'PYTHON_VERSION=3.12.7'], created: '2026-09-12T02:11:40Z', layers: [29130000, 3270000, 11870000, 80730000] },
  'python:3.12': { size: 1020000000, os: 'debian', cmd: ['python3'], env: ['PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'LANG=C.UTF-8', 'GPG_KEY=7169605F62C751356D054A26A821E680E5FA6305', 'PYTHON_VERSION=3.12.7'], created: '2026-09-12T02:14:02Z', layers: [49280000, 24040000, 64100000, 211000000, 6350000, 21980000, 643000000] },
  'python:3.11-slim': { size: 130000000, os: 'debian', cmd: ['python3'], env: ['PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'LANG=C.UTF-8', 'PYTHON_VERSION=3.11.10'], created: '2026-09-12T02:09:11Z', layers: [29130000, 3270000, 12880000, 84720000] },
  'python:3.13-slim': { size: 121000000, os: 'debian', cmd: ['python3'], env: ['PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'LANG=C.UTF-8', 'PYTHON_VERSION=3.13.0'], created: '2026-10-08T01:52:30Z', layers: [29130000, 3270000, 11200000, 77400000] },
  'alpine:3.20': { size: 7800000, os: 'alpine', cmd: ['/bin/sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], created: '2026-09-06T22:19:21Z', layers: [7800000] },
  'alpine:3.19': { size: 7380000, os: 'alpine', cmd: ['/bin/sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], created: '2026-09-06T22:17:02Z', layers: [7380000] },
  'alpine:latest': { size: 7800000, os: 'alpine', cmd: ['/bin/sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], created: '2026-09-06T22:19:21Z', layers: [7800000], alias: 'alpine:3.20' },
  'nginx:1.27': { size: 192000000, os: 'debian', cmd: ['nginx', '-g', 'daemon off;'], entrypoint: ['/docker-entrypoint.sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'NGINX_VERSION=1.27.2', 'NJS_VERSION=0.8.6', 'PKG_RELEASE=1~bookworm'], ports: ['80/tcp'], created: '2026-10-02T17:13:09Z', layers: [29130000, 62480000, 627, 955, 393, 1210, 1400, 100000000] },
  'nginx:latest': { size: 192000000, os: 'debian', cmd: ['nginx', '-g', 'daemon off;'], entrypoint: ['/docker-entrypoint.sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'NGINX_VERSION=1.27.2'], ports: ['80/tcp'], created: '2026-10-02T17:13:09Z', layers: [29130000, 62480000, 627, 955, 393, 1210, 1400, 100000000], alias: 'nginx:1.27' },
  'nginx:1.27-alpine': { size: 43300000, os: 'alpine', cmd: ['nginx', '-g', 'daemon off;'], entrypoint: ['/docker-entrypoint.sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'NGINX_VERSION=1.27.2'], ports: ['80/tcp'], created: '2026-10-02T17:20:40Z', layers: [3630000, 1800000, 627, 955, 393, 1210, 1400, 35800000] },
  'nginx:1.26': { size: 188000000, os: 'debian', cmd: ['nginx', '-g', 'daemon off;'], entrypoint: ['/docker-entrypoint.sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'NGINX_VERSION=1.26.2'], ports: ['80/tcp'], created: '2026-08-14T10:02:55Z', layers: [29130000, 62480000, 627, 955, 393, 1210, 1400, 96000000] },
  'redis:7': { size: 117000000, os: 'debian', cmd: ['redis-server'], entrypoint: ['docker-entrypoint.sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'GOSU_VERSION=1.17', 'REDIS_VERSION=7.4.1'], ports: ['6379/tcp'], created: '2026-10-03T06:41:23Z', layers: [29130000, 1980000, 5080000, 80600000, 97, 571] },
  'redis:7-alpine': { size: 41400000, os: 'alpine', cmd: ['redis-server'], entrypoint: ['docker-entrypoint.sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'REDIS_VERSION=7.4.1'], ports: ['6379/tcp'], created: '2026-10-03T06:44:02Z', layers: [3630000, 5100000, 32600000, 97, 571] },
  'redis:latest': { size: 117000000, os: 'debian', cmd: ['redis-server'], entrypoint: ['docker-entrypoint.sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'REDIS_VERSION=7.4.1'], ports: ['6379/tcp'], created: '2026-10-03T06:41:23Z', layers: [29130000, 1980000, 5080000, 80600000, 97, 571], alias: 'redis:7' },
  'postgres:16': { size: 432000000, os: 'debian', cmd: ['postgres'], entrypoint: ['docker-entrypoint.sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/lib/postgresql/16/bin', 'GOSU_VERSION=1.17', 'LANG=en_US.utf8', 'PG_MAJOR=16', 'PG_VERSION=16.4-1.pgdg120+2', 'PGDATA=/var/lib/postgresql/data'], ports: ['5432/tcp'], created: '2026-09-26T21:18:47Z', layers: [29130000, 4130000, 1260000, 6800000, 3960000, 1280000, 95700000, 289000000] },
  'postgres:16-alpine': { size: 248000000, os: 'alpine', cmd: ['postgres'], entrypoint: ['docker-entrypoint.sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/lib/postgresql/bin', 'LANG=en_US.utf8', 'PG_MAJOR=16', 'PGDATA=/var/lib/postgresql/data'], ports: ['5432/tcp'], created: '2026-09-26T21:40:11Z', layers: [3630000, 244000000] },
  'busybox:latest': { size: 4260000, os: 'busybox', cmd: ['sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], created: '2026-09-26T21:31:42Z', layers: [4260000] },
  'busybox:1.36': { size: 4260000, os: 'busybox', cmd: ['sh'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], created: '2026-09-26T21:31:42Z', layers: [4260000], alias: 'busybox:latest' },
  'ubuntu:24.04': { size: 78100000, os: 'ubuntu', cmd: ['/bin/bash'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], created: '2026-09-11T10:27:40Z', layers: [78100000] },
  'ubuntu:22.04': { size: 77900000, os: 'ubuntu', cmd: ['/bin/bash'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], created: '2026-09-11T10:25:12Z', layers: [77900000] },
  'ubuntu:latest': { size: 78100000, os: 'ubuntu', cmd: ['/bin/bash'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], created: '2026-09-11T10:27:40Z', layers: [78100000], alias: 'ubuntu:24.04' },
  'hello-world:latest': { size: 13300, os: 'scratch', cmd: ['/hello'], env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], created: '2026-05-02T19:13:09Z', layers: [13300] },
};
const SIMDK_NAMES = ['admiring', 'brave', 'clever', 'dreamy', 'eager', 'festive', 'gallant', 'hopeful', 'jolly', 'keen', 'lucid', 'nifty', 'quirky', 'sharp', 'vigilant', 'zen'];
const SIMDK_SURNAMES = ['turing', 'hopper', 'lovelace', 'knuth', 'ritchie', 'torvalds', 'hamilton', 'noether', 'curie', 'shannon', 'lamport', 'cerf', 'kahn', 'postel', 'dijkstra', 'liskov'];

/* ---------- genel yardimcilar ---------- */
function simdkHash(s) {
  let out = '';
  for (let k = 0; k < 8 && out.length < 64; k++) {
    let h = 0x811c9dc5 ^ (k * 0x9e3779b1);
    const str = s + '#' + k;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    out += ('00000000' + h.toString(16)).slice(-8);
  }
  return out;
}
function simdkRand(n) { let s = ''; while (s.length < n) s += Math.floor(Math.random() * 16).toString(16); return s; }
function simdkBytes(s) { try { return new TextEncoder().encode(s).length; } catch (e) { return String(s).length; } }
function simdkSize(n) {
  const u = ['B', 'kB', 'MB', 'GB', 'TB']; let i = 0; let v = n;
  while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  if (i === 0) return `${Math.round(v)}B`;
  let s = Number(v.toPrecision(3)).toString();
  return s + u[i];
}
function simdkAgo(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 1) return 'Less than a second ago';
  if (s === 1) return '1 second ago';
  if (s < 60) return `${s} seconds ago`;
  const m = Math.floor(s / 60);
  if (m === 1) return 'About a minute ago';
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h === 1) return 'About an hour ago';
  if (h < 48) return `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d} days ago`;
  const w = Math.floor(d / 7);
  if (d < 60) return `${w} weeks ago`;
  const mo = Math.floor(d / 30);
  if (mo < 24) return `${mo} months ago`;
  return `${Math.floor(d / 365)} years ago`;
}
function simdkDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 1) return 'Less than a second';
  if (s === 1) return '1 second';
  if (s < 60) return `${s} seconds`;
  const m = Math.floor(s / 60);
  if (m === 1) return 'About a minute';
  if (m < 60) return `${m} minutes`;
  const h = Math.floor(m / 60);
  if (h === 1) return 'About an hour';
  if (h < 48) return `${h} hours`;
  return `${Math.floor(h / 24)} days`;
}
/* Go tabwriter taklidi. docker minwidth 10 padding 3, kubectl minwidth 6 */
function simdkTable(rows, minw = 10, pad = 3) {
  if (!rows.length) return '';
  const cols = Math.max(...rows.map(r => r.length));
  const w = [];
  for (let c = 0; c < cols; c++) w[c] = Math.max(minw, ...rows.map(r => String(r[c] == null ? '' : r[c]).length + pad));
  return rows.map(r => r.map((cell, c) => c === r.length - 1 ? String(cell == null ? '' : cell) : String(cell == null ? '' : cell).padEnd(w[c])).join('').replace(/\s+$/, '')).join('\n') + '\n';
}
function simdkQuote(a) { return /[\s"'$]/.test(a) || a === '' ? `'${a.replace(/'/g, "'\\''")}'` : a; }
function simdkJson(o) { return JSON.stringify(o, null, 4) + '\n'; }

/* ---------- imaj referansi ---------- */
function simdkRef(s) {
  let name = s; let digest = null;
  const at = name.indexOf('@'); if (at > 0) { digest = name.slice(at + 1); name = name.slice(0, at); }
  let tag = 'latest';
  const slash = name.lastIndexOf('/'); const colon = name.lastIndexOf(':');
  if (colon > slash) { tag = name.slice(colon + 1); name = name.slice(0, colon); }
  const first = name.split('/')[0];
  const hasReg = name.includes('/') && (first.includes('.') || first.includes(':') || first === 'localhost');
  const registry = hasReg ? first : 'docker.io';
  let path = hasReg ? name.slice(first.length + 1) : name;
  if (!hasReg && !path.includes('/')) path = 'library/' + path;
  const full = hasReg ? `${registry}/${path}` : `${registry}/${path}`;
  const short = hasReg ? name : (path.startsWith('library/') ? path.slice(8) : path);
  return { repo: short, tag, digest, registry, path, full, display: `${short}:${tag}`, normalized: `${full}:${tag}` };
}

/* ---------- durum ---------- */
function simdkFresh() {
  return { tick: 0, images: [], containers: [], networks: [
    { id: simdkHash('net-bridge').slice(0, 64), name: 'bridge', driver: 'bridge', scope: 'local', subnet: '172.17.0.0/16', gateway: '172.17.0.1', created: new Date(Date.now() - 86400e3 * 3).toISOString(), builtin: true, nextIp: 2 },
    { id: simdkHash('net-host').slice(0, 64), name: 'host', driver: 'host', scope: 'local', subnet: '', gateway: '', created: new Date(Date.now() - 86400e3 * 3).toISOString(), builtin: true },
    { id: simdkHash('net-none').slice(0, 64), name: 'none', driver: 'null', scope: 'local', subnet: '', gateway: '', created: new Date(Date.now() - 86400e3 * 3).toISOString(), builtin: true },
  ], volumes: [], registry: {}, auth: {}, cache: {}, nextNet: 18, lastBuild: null, audit: { logs: [], exec: [], inspect: [] }, kindLoaded: [] };
}
function SIMDK_load(sh) {
  const n = sh.node(SIMDK_STATE);
  if (n && n.t === 'f') { try { const st = JSON.parse(n.d); if (st && st.containers) return st; } catch (e) { /* bozuk */ } }
  const st = simdkFresh();
  SIMDK_save(sh, st);
  return st;
}
function SIMDK_save(sh, st) {
  const n = sh.node(SIMDK_STATE);
  if (n && n.t === 'f') n.d = JSON.stringify(st); else sh.install(SIMDK_STATE, mkfile(JSON.stringify(st), 0o600, 'root'));
}
function simdkPublicMeta(ref) {
  const r = typeof ref === 'string' ? simdkRef(ref) : ref;
  if (r.registry !== 'docker.io') return null;
  const key = `${r.repo}:${r.tag}`;
  const m = SIMDK_PUBLIC[key];
  return m ? Object.assign({ key }, m) : null;
}
function simdkPublicRecord(ref) {
  const m = simdkPublicMeta(ref); if (!m) return null;
  const r = simdkRef(ref);
  const base = m.alias || m.key;
  const id = simdkHash('image:' + base);
  const layers = m.layers.map((sz, i) => ({ id: 'sha256:' + simdkHash(base + ':layer' + i), size: sz, createdBy: i === 0 ? `ADD file:${simdkHash(base).slice(0, 12)} in /` : (i === m.layers.length - 1 ? `CMD ${JSON.stringify(m.cmd)}` : `RUN /bin/sh -c #(nop) layer ${i}`) }));
  return { id, created: m.created, size: m.size, repoTags: [`${r.repo}:${r.tag}`], repoDigests: [`${r.repo}@sha256:${simdkHash('digest:' + base)}`], digest: 'sha256:' + simdkHash('digest:' + base), os: m.os, public: true, config: { Cmd: m.cmd, Entrypoint: m.entrypoint || null, Env: m.env, ExposedPorts: (m.ports || []).reduce((o, p) => { o[p] = {}; return o; }, {}), WorkingDir: '', User: '', Labels: {}, Healthcheck: null }, layers, files: {}, pulled: new Date().toISOString() };
}
function simdkFindImage(st, ref) {
  if (!ref) return null;
  const r = simdkRef(ref);
  const tag = `${r.repo}:${r.tag}`;
  let img = st.images.find(i => i.repoTags.includes(tag));
  if (img) return img;
  if (/^(sha256:)?[0-9a-f]{3,64}$/.test(ref)) { const h = ref.replace(/^sha256:/, ''); img = st.images.find(i => i.id.startsWith(h)); if (img) return img; }
  return null;
}
function SIMDK_imageKnown(sh, ref) {
  const st = SIMDK_load(sh);
  const r = simdkRef(ref);
  if (simdkPublicMeta(r)) return true;
  if (st.registry[`${r.repo}:${r.tag}`]) return true;
  if ((st.kindLoaded || []).includes(`${r.repo}:${r.tag}`)) return true;
  return false;
}
function SIMDK_imageRecord(sh, ref) {
  const st = SIMDK_load(sh);
  const r = simdkRef(ref);
  const key = `${r.repo}:${r.tag}`;
  if (st.registry[key]) return st.registry[key];
  if ((st.kindLoaded || []).includes(key)) { const img = simdkFindImage(st, key); if (img) return img; }
  return simdkPublicRecord(key);
}
/* Gorev kurulumlari icin. Registry'de imaj yoksa yerelde insa etmeden kayit yazar */
function SIMDK_ensureRegistry(sh, ref, build) {
  const st = SIMDK_load(sh);
  const r = simdkRef(ref); const key = `${r.repo}:${r.tag}`;
  if (st.registry[key]) return st.registry[key];
  const rec = build(st);
  rec.repoTags = [key];
  st.registry[key] = rec;
  SIMDK_save(sh, st);
  return rec;
}

/* ---------- Dockerfile ---------- */
function simdkParseDockerfile(text) {
  const raw = text.split('\n');
  const logical = []; let cur = null;
  for (let i = 0; i < raw.length; i++) {
    let line = raw[i];
    if (cur === null) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      cur = { text: '', line: i + 1 };
    } else if (/^\s*#/.test(line)) continue;
    if (/\\\s*$/.test(line)) { cur.text += line.replace(/\\\s*$/, '') + ' '; continue; }
    cur.text += line; logical.push(cur); cur = null;
  }
  if (cur) logical.push(cur);
  const inst = [];
  for (const l of logical) {
    const m = /^\s*([A-Za-z]+)\s*(.*)$/s.exec(l.text);
    if (!m) continue;
    const op = m[1].toUpperCase(); let rest = m[2].trim();
    const flags = {};
    while (/^--[\w-]+(=\S*)?\s/.test(rest + ' ')) {
      const fm = /^--([\w-]+)(?:=(\S*))?\s*/.exec(rest);
      flags[fm[1]] = fm[2] === undefined ? true : fm[2];
      rest = rest.slice(fm[0].length);
    }
    let exec = null;
    if (rest.startsWith('[')) { try { const a = JSON.parse(rest); if (Array.isArray(a) && a.every(x => typeof x === 'string')) exec = a; } catch (e) { exec = null; } }
    inst.push({ op, raw: l.text.trim(), line: l.line, args: rest, flags, exec });
  }
  return { inst, raw };
}
function simdkIgnoreRules(text) {
  return text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(p => {
    let neg = false; if (p.startsWith('!')) { neg = true; p = p.slice(1); }
    p = p.replace(/^\.\//, '').replace(/\/$/, '');
    let re = '';
    for (let i = 0; i < p.length; i++) {
      const ch = p[i];
      if (ch === '*' && p[i + 1] === '*') { re += '.*'; i++; if (p[i + 1] === '/') i++; }
      else if (ch === '*') re += '[^/]*';
      else if (ch === '?') re += '[^/]';
      else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    return { neg, re: new RegExp('^' + re + '(/.*)?$') };
  });
}
function simdkIgnored(rules, rel) {
  let ig = false;
  for (const r of rules) { if (r.re.test(rel)) ig = !r.neg; }
  return ig;
}
/* Build context. rel -> {content, size, mode, dir} */
function simdkContext(sh, dir, rules) {
  const out = {};
  const walk = (node, rel) => {
    for (const [name, ch] of Object.entries(node.c)) {
      const p = rel ? rel + '/' + name : name;
      if (simdkIgnored(rules, p)) continue;
      if (ch.t === 'd') { out[p] = { dir: true, size: 0, mode: ch.m }; walk(ch, p); }
      else out[p] = { content: ch.d, size: simdkBytes(ch.d), mode: ch.m };
    }
  };
  const root = sh.node(dir);
  if (root && root.t === 'd') walk(root, '');
  return out;
}
function simdkSub(s, vars) {
  return s.replace(/\$\{([A-Za-z_][\w]*)(?::-([^}]*))?\}|\$([A-Za-z_][\w]*)/g, (m, a, def, b) => {
    const k = a || b;
    if (vars[k] !== undefined) return vars[k];
    return def !== undefined ? def : '';
  });
}
function simdkMatchCtx(ctx, pattern) {
  pattern = pattern.replace(/^\.\//, '').replace(/^\//, '');
  if (pattern === '.' || pattern === '') return Object.keys(ctx);
  if (ctx[pattern]) {
    if (ctx[pattern].dir) return Object.keys(ctx).filter(k => k === pattern || k.startsWith(pattern + '/'));
    return [pattern];
  }
  if (/[*?]/.test(pattern)) {
    const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]') + '$');
    return Object.keys(ctx).filter(k => re.test(k));
  }
  return [];
}
function simdkLayerEstimate(inst, cmdText, ctxFiles, stage) {
  if (inst.op === 'COPY' || inst.op === 'ADD') return ctxFiles.reduce((n, f) => n + f.size, 0);
  if (inst.op === 'WORKDIR') return 0;
  if (inst.op !== 'RUN') return 0;
  const c = cmdText; let size = 0;
  if (/pip3?\s+install/.test(c)) {
    let n = 2;
    const reqs = /-r\s+(\S+)/.exec(c);
    if (reqs && stage.files[reqs[1].replace(/^\.\//, '')]) n = stage.files[reqs[1].replace(/^\.\//, '')].split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
    else { const pk = c.replace(/.*pip3?\s+install/, '').split(/\s+/).filter(x => x && !x.startsWith('-')); n = Math.max(1, pk.length); }
    size += 4200000 + n * 6100000 + (/--no-cache-dir/.test(c) ? 0 : n * 4300000) + (/--upgrade\s+pip|install\s+-U\s+pip|pip\s+install\s+pip/.test(c) ? 11000000 : 0);
  }
  if (/apt-get\s+install|apt\s+install/.test(c)) {
    const pk = c.replace(/.*apt(-get)?\s+install/, '').split(/[&|;]/)[0].split(/\s+/).filter(x => x && !x.startsWith('-'));
    size += pk.length * 21000000 + (/--no-install-recommends/.test(c) ? 0 : pk.length * 14000000) + (/rm\s+-rf\s+\/var\/lib\/apt\/lists/.test(c) ? 0 : 46000000) + 1800000;
  }
  if (/apk\s+add/.test(c)) { const pk = c.replace(/.*apk\s+add/, '').split(/[&|;]/)[0].split(/\s+/).filter(x => x && !x.startsWith('-')); size += pk.length * 3400000 + (/--no-cache/.test(c) ? 0 : 1500000); }
  if (/npm\s+(install|ci)/.test(c)) size += 38000000;
  if (/(useradd|adduser|addgroup|groupadd)/.test(c)) size += 4500;
  if (/\b(chown|chmod)\s+-R/.test(c)) size += Object.values(stage.files).reduce((n, f) => n + simdkBytes(f), 0);
  if (/mkdir/.test(c)) size += 0;
  if (/curl|wget/.test(c)) size += 1200000;
  if (!size && /echo|touch|cp|mv|ln/.test(c)) size += 120;
  return size;
}
function simdkBuildError(dfRaw, inst, msg, stepLine) {
  const out = [];
  if (stepLine) out.push(stepLine, '------', ` > ${stepLine.replace(/^ => ERROR /, '').replace(/\s+\d+\.\ds$/, '')}:`, '------');
  if (inst) {
    out.push(`Dockerfile:${inst.line}`, '--------------------');
    const from = Math.max(1, inst.line - 2), to = Math.min(dfRaw.length, inst.line + 1);
    for (let i = from; i <= to; i++) out.push(`${String(i).padStart(4)} | ${i === inst.line ? '>>> ' : '    '}${dfRaw[i - 1]}`);
    out.push('--------------------');
  }
  out.push(`ERROR: failed to solve: ${msg}`);
  return { out: '', err: out.join('\n') + '\n', code: 1 };
}
function simdkStepLine(text, dur, prefix) {
  const left = ` => ${prefix || ''}${text}`;
  const d = `${dur.toFixed(1)}s`;
  return left.length + 1 + d.length > 80 ? left + ' ' + d : left.padEnd(80 - d.length) + d;
}

function simdkBuild(sh, st, o) {
  const ctxDir = sh.resolve(o.path || '.');
  const ctxNode = sh.node(ctxDir);
  if (!ctxNode || ctxNode.t !== 'd') return fail(`ERROR: unable to prepare context: path "${o.path}" not found`);
  const dfPath = o.file ? sh.resolve(o.file) : ctxDir + '/Dockerfile';
  const dfNode = sh.node(dfPath);
  if (!dfNode || dfNode.t !== 'f') return fail(`ERROR: failed to solve: failed to read dockerfile: open ${o.file ? sh.resolve(o.file).replace(ctxDir + '/', '') : '/Dockerfile'}: no such file or directory`);
  const df = simdkParseDockerfile(dfNode.d);
  const dfName = dfPath.slice(dfPath.lastIndexOf('/') + 1);
  const igNode = sh.node(ctxDir + '/.dockerignore');
  const rules = simdkIgnoreRules(igNode && igNode.t === 'f' ? igNode.d : '');
  const ctx = simdkContext(sh, ctxDir, rules);
  delete ctx['.dockerignore'];
  if (!o.file || dfPath === ctxDir + '/Dockerfile') { if (!simdkIgnored(rules, 'Dockerfile')) delete ctx['Dockerfile']; }
  const ctxBytes = Object.values(ctx).reduce((n, f) => n + f.size, 0);
  const KNOWN = ['FROM', 'RUN', 'COPY', 'ADD', 'WORKDIR', 'ENV', 'ARG', 'EXPOSE', 'USER', 'HEALTHCHECK', 'LABEL', 'ENTRYPOINT', 'CMD', 'VOLUME', 'SHELL', 'STOPSIGNAL', 'ONBUILD', 'MAINTAINER'];
  for (const ins of df.inst) if (!KNOWN.includes(ins.op)) return simdkBuildError(df.raw, ins, `dockerfile parse error on line ${ins.line}: unknown instruction: ${ins.op}`);
  if (!df.inst.length) return fail('ERROR: failed to solve: failed to read dockerfile: the Dockerfile cannot be empty');
  /* asamalar */
  const stages = []; const globalArgs = {}; let s = null;
  const buildArgs = o.buildArgs || {};
  for (const ins of df.inst) {
    if (ins.op === 'FROM') { s = { inst: [], index: stages.length, name: null, fromInst: ins }; stages.push(s); continue; }
    if (!s) {
      if (ins.op === 'ARG') { const m = /^([\w]+)(?:=(.*))?$/.exec(ins.args.trim()); if (m) globalArgs[m[1]] = buildArgs[m[1]] !== undefined ? buildArgs[m[1]] : (m[2] === undefined ? '' : m[2].replace(/^"(.*)"$/, '$1')); continue; }
      return simdkBuildError(df.raw, ins, `dockerfile parse error on line ${ins.line}: ${ins.op}: no build stage in current context`);
    }
    s.inst.push(ins);
  }
  for (const sg of stages) {
    const m = /^(\S+)(?:\s+[Aa][Ss]\s+(\S+))?/.exec(simdkSub(sg.fromInst.args, globalArgs));
    sg.base = m ? m[1] : ''; sg.name = m && m[2] ? m[2] : null; sg.label = sg.name || `stage-${sg.index}`;
  }
  let targetIdx = stages.length - 1;
  if (o.target) { targetIdx = stages.findIndex(x => x.name === o.target); if (targetIdx < 0) return fail(`ERROR: failed to solve: target stage "${o.target}" could not be found`); }
  const needed = new Set(); const mark = i => { if (needed.has(i)) return; needed.add(i); const sg = stages[i]; const bi = stages.findIndex(x => x.name === sg.base); if (bi >= 0 && bi < i) mark(bi); sg.inst.forEach(ins => { if ((ins.op === 'COPY' || ins.op === 'ADD') && ins.flags.from) { const fi = stages.findIndex(x => x.name === ins.flags.from || String(x.index) === ins.flags.from); if (fi >= 0 && fi < i) mark(fi); } }); };
  mark(targetIdx);
  const active = stages.filter((x, i) => needed.has(i));
  const multi = stages.length > 1;
  const log = []; const hints = []; let total = 0; let dur = 0.1; const tick = () => { dur += 0.05; return 0; };
  const step = (text, d, prefix) => { log.push(simdkStepLine(text, d, prefix)); dur += d; };
  const sub = (text, d) => { log.push(simdkStepLine(text, d, '=> ')); };
  step(`[internal] load build definition from ${dfName}`, 0); sub(`transferring dockerfile: ${simdkSize(simdkBytes(dfNode.d))}`, 0); total++;
  /* base metadata */
  const bases = []; const cacheKeys = {}; const pulls = [];
  for (const sg of active) {
    if (stages.some(x => x.name === sg.base && x.index < sg.index)) continue;
    const r = simdkRef(sg.base);
    let img = simdkFindImage(st, sg.base);
    if (!img && sg.base !== 'scratch') {
      const pub = simdkPublicRecord(sg.base);
      const reg = r.registry === SIMDK_REGISTRY ? st.registry[`${r.repo}:${r.tag}`] : null;
      if (pub) { img = pub; st.images.push(pub); pulls.push(r.normalized); }
      else if (reg) { img = JSON.parse(JSON.stringify(reg)); img.pulled = new Date().toISOString(); st.images.push(img); pulls.push(r.normalized); }
      else {
        const known = Object.keys(SIMDK_PUBLIC).some(k => k.split(':')[0] === r.repo) && r.registry === 'docker.io';
        const msg = known ? `${r.repo}:${r.tag}: failed to resolve source metadata for ${r.normalized}: ${r.normalized}: not found` : (r.registry === SIMDK_REGISTRY ? `${r.repo}:${r.tag}: failed to resolve source metadata for ${r.normalized}: ${r.normalized}: not found` : `${r.repo}:${r.tag}: failed to resolve source metadata for ${r.normalized}: pull access denied, repository does not exist or may require authorization: server message: insufficient_scope: authorization failed`);
        step(`[internal] load metadata for ${r.normalized}`, 0.8); log.push(simdkStepLine(`[${multi ? sg.label + ' ' : ''}1/${sg.inst.filter(x => ['RUN', 'COPY', 'ADD', 'WORKDIR'].includes(x.op)).length + 1}] FROM ${r.normalized}`, 0, 'ERROR '));
        return { out: '', err: `[+] Building ${dur.toFixed(1)}s (${total}/${total + 1}) FINISHED\n` + log.join('\n') + '\n' + simdkBuildError(df.raw, sg.fromInst, msg).err, code: 1 };
      }
    }
    if (!bases.includes(r.normalized)) { bases.push(r.normalized); if (sg.base !== 'scratch') { step(`[internal] load metadata for ${r.normalized}`, 1.1); total++; } }
    sg.baseImg = img;
  }
  step('[internal] load .dockerignore', 0); sub(`transferring context: ${igNode ? simdkSize(simdkBytes(igNode.d)) : '2B'}`, 0); total++;
  const usesCtx = active.some(sg => sg.inst.some(ins => (ins.op === 'COPY' || ins.op === 'ADD') && !ins.flags.from));
  const stepLogs = []; const built = {};
  /* her asama */
  for (const sg of active) {
    const layerOps = sg.inst.filter(x => ['RUN', 'COPY', 'ADD', 'WORKDIR'].includes(x.op));
    const nSteps = layerOps.length + 1; let sn = 1;
    const prefix = multi ? `[${sg.label} ` : '[';
    const parent = stages.find(x => x.name === sg.base && x.index < sg.index);
    const parentBuilt = parent ? built[parent.index] : null;
    const base = parentBuilt || (sg.baseImg ? { size: sg.baseImg.size, config: JSON.parse(JSON.stringify(sg.baseImg.config)), files: Object.assign({}, sg.baseImg.files || {}), os: sg.baseImg.os, key: 'base:' + sg.baseImg.id, layers: [], pipFiles: {} } : { size: 0, config: { Cmd: null, Entrypoint: null, Env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], ExposedPorts: {}, WorkingDir: '', User: '', Labels: {}, Healthcheck: null }, files: {}, os: 'scratch', key: 'base:scratch', layers: [], pipFiles: {} });
    const cur = { size: base.size, baseSize: base.size, config: JSON.parse(JSON.stringify(base.config)), files: Object.assign({}, base.files), os: base.os, key: base.key, layers: [], pipFiles: Object.assign({}, base.pipFiles || {}), args: Object.assign({}, globalArgs), env: {} };
    (cur.config.Env || []).forEach(e => { const i = e.indexOf('='); cur.env[e.slice(0, i)] = e.slice(i + 1); });
    const vars = () => Object.assign({}, cur.args, cur.env);
    const fromText = sg.baseImg ? `${simdkRef(sg.base).normalized}@${sg.baseImg.digest || 'sha256:' + simdkHash('d' + sg.baseImg.id)}` : (parent ? sg.base : sg.base);
    if (parent) { stepLogs.push({ text: `${prefix}${sn}/${nSteps}] FROM ${sg.base}`, d: 0, cached: false }); }
    else if (pulls.includes(simdkRef(sg.base).normalized)) { stepLogs.push({ text: `${prefix}${sn}/${nSteps}] FROM ${fromText}`, d: 2.4, cached: false, subs: [`resolve ${fromText}`, ...(sg.baseImg.layers || []).slice(0, 3).map(l => `${l.id.slice(7, 19)} ${simdkSize(l.size)} / ${simdkSize(l.size)}`), 'extracting'] }); }
    else stepLogs.push({ text: `${prefix}${sn}/${nSteps}] FROM ${fromText}`, d: 0, cached: false });
    if (usesCtx && !stepLogs.some(x => x.text.startsWith('[internal] load build context'))) { stepLogs.push({ text: '[internal] load build context', d: 0, internal: true, subs: [`transferring context: ${simdkSize(ctxBytes)}`] }); total++; }
    total++;
    let cacheBroken = o.noCache;
    for (const ins of sg.inst) {
      const v = vars();
      const argText = ins.exec ? ins.exec.map(x => simdkSub(x, v)) : simdkSub(ins.args, v);
      const isLayer = ['RUN', 'COPY', 'ADD', 'WORKDIR'].includes(ins.op);
      let text = null; let size = 0; let copied = [];
      if (ins.op === 'ARG') { const m = /^([\w]+)(?:=(.*))?$/.exec(ins.args.trim()); if (m) cur.args[m[1]] = buildArgs[m[1]] !== undefined ? buildArgs[m[1]] : (globalArgs[m[1]] !== undefined && m[2] === undefined ? globalArgs[m[1]] : (m[2] === undefined ? '' : m[2].replace(/^"(.*)"$/, '$1'))); continue; }
      if (ins.op === 'ENV') {
        const pairs = []; const a = typeof argText === 'string' ? argText : argText.join(' ');
        if (/^[\w]+\s+[^=]/.test(a) && !/^\w+=/.test(a)) { const m = /^(\w+)\s+(.*)$/s.exec(a); pairs.push([m[1], m[2]]); }
        else { const re = /(\w+)=("([^"]*)"|'([^']*)'|(\S*))/g; let m; while ((m = re.exec(a))) pairs.push([m[1], m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : m[5])]); }
        pairs.forEach(([k, val]) => { cur.env[k] = val; });
        cur.config.Env = Object.entries(cur.env).map(([k, val]) => `${k}=${val}`);
        cur.key = simdkHash(cur.key + '|ENV ' + a); continue;
      }
      if (ins.op === 'LABEL') { const re = /([\w.\-]+)=("([^"]*)"|'([^']*)'|(\S*))/g; let m; const a = typeof argText === 'string' ? argText : argText.join(' '); while ((m = re.exec(a))) cur.config.Labels[m[1]] = m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : m[5]); cur.key = simdkHash(cur.key + '|LABEL ' + a); continue; }
      if (ins.op === 'EXPOSE') { String(argText).split(/\s+/).filter(Boolean).forEach(p => { cur.config.ExposedPorts[/\//.test(p) ? p : p + '/tcp'] = {}; }); cur.key = simdkHash(cur.key + '|EXPOSE ' + argText); continue; }
      if (ins.op === 'USER') { cur.config.User = String(argText).trim(); cur.key = simdkHash(cur.key + '|USER ' + argText); continue; }
      if (ins.op === 'CMD') { cur.config.Cmd = ins.exec ? argText : ['/bin/sh', '-c', argText]; cur.config.CmdShell = !ins.exec; cur.key = simdkHash(cur.key + '|CMD ' + JSON.stringify(cur.config.Cmd)); continue; }
      if (ins.op === 'ENTRYPOINT') { cur.config.Entrypoint = ins.exec ? argText : ['/bin/sh', '-c', argText]; if (!ins.exec) cur.config.Cmd = null; cur.key = simdkHash(cur.key + '|ENTRYPOINT ' + JSON.stringify(cur.config.Entrypoint)); continue; }
      if (ins.op === 'HEALTHCHECK') {
        if (/^NONE$/i.test(String(argText).trim())) { cur.config.Healthcheck = { Test: ['NONE'] }; continue; }
        const m = /^(.*?)\bCMD\s+(.*)$/s.exec(ins.args);
        if (!m) return simdkBuildError(df.raw, ins, `dockerfile parse error on line ${ins.line}: Unknown type "${ins.args.split(/\s+/)[0]}" in HEALTHCHECK (try CMD)`);
        const hc = { Test: [], Interval: 30e9, Timeout: 30e9, Retries: 3, StartPeriod: 0 };
        const fl = { ...ins.flags }; const re = /--(interval|timeout|retries|start-period)=(\S+)/g; let fm; while ((fm = re.exec(m[1]))) fl[fm[1]] = fm[2];
        const ns = x => { const mm = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/.exec(x); if (!mm) return 30e9; return Math.round(parseFloat(mm[1]) * ({ ms: 1e6, s: 1e9, m: 60e9, h: 3600e9 })[mm[2] || 's']); };
        if (fl.interval) hc.Interval = ns(fl.interval); if (fl.timeout) hc.Timeout = ns(fl.timeout); if (fl.retries) hc.Retries = parseInt(fl.retries, 10); if (fl['start-period']) hc.StartPeriod = ns(fl['start-period']);
        let cmd = m[2].trim(); let ex = null; if (cmd.startsWith('[')) { try { ex = JSON.parse(cmd); } catch (e) { ex = null; } }
        hc.Test = ex ? ['CMD', ...ex] : ['CMD-SHELL', simdkSub(cmd, v)];
        cur.config.Healthcheck = hc; cur.key = simdkHash(cur.key + '|HEALTHCHECK ' + JSON.stringify(hc)); continue;
      }
      if (ins.op === 'VOLUME' || ins.op === 'SHELL' || ins.op === 'STOPSIGNAL' || ins.op === 'ONBUILD' || ins.op === 'MAINTAINER') { cur.key = simdkHash(cur.key + '|' + ins.raw); continue; }
      /* katman olusturan talimatlar */
      sn++;
      const stepText = `${prefix}${sn}/${nSteps}] ${ins.op} ${ins.exec ? JSON.stringify(argText) : argText}`;
      let fileHash = '';
      if (ins.op === 'COPY' || ins.op === 'ADD') {
        const parts = ins.exec ? argText : String(argText).split(/\s+/).filter(Boolean);
        if (parts.length < 2) return simdkBuildError(df.raw, ins, `dockerfile parse error on line ${ins.line}: ${ins.op} requires at least two arguments, but only one was provided. Destination could not be determined`);
        const dest = parts[parts.length - 1]; const srcs = parts.slice(0, -1);
        let srcFiles = {}; let srcRoot = null;
        if (ins.flags.from) {
          const fs = stages.find(x => (x.name === ins.flags.from || String(x.index) === ins.flags.from) && x.index < sg.index);
          if (fs) { srcFiles = built[fs.index].files; srcRoot = built[fs.index]; }
          else {
            const fimg = simdkFindImage(st, ins.flags.from) || simdkPublicRecord(ins.flags.from);
            if (!fimg) { const fr = simdkRef(ins.flags.from); return { out: '', err: `[+] Building ${dur.toFixed(1)}s (${total}/${total + 1})\n` + log.join('\n') + '\n' + simdkBuildError(df.raw, ins, `${fr.repo}:${fr.tag}: failed to resolve source metadata for ${fr.normalized}: ${fr.normalized}: not found`).err, code: 1 }; }
            srcFiles = fimg.files || {}; srcRoot = { pipFiles: {}, files: srcFiles, pipSize: 0 };
          }
        }
        const destDir = dest.endsWith('/') || dest === '.' || srcs.length > 1 || srcs.some(x => /[*?]/.test(x)) || dest === './';
        const wd = cur.config.WorkingDir || '/';
        const absDest = dest.startsWith('/') ? dest : (wd.replace(/\/$/, '') + '/' + dest.replace(/^\.\/?/, '')).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
        for (const src of srcs) {
          if (ins.flags.from) {
            const clean = src.replace(/\/$/, '');
            const matched = Object.keys(srcFiles).filter(k => '/' + k === clean || ('/' + k).startsWith(clean + '/') || k === clean || k.startsWith(clean.replace(/^\//, '') + '/'));
            const pipHit = srcRoot && srcRoot.pipFiles && Object.keys(srcRoot.pipFiles).find(p => clean === p || clean.startsWith(p + '/') || p.startsWith(clean + '/'));
            if (!matched.length && !pipHit && !/^\/(usr|install|root|opt|venv|app|build|etc|bin|lib|var|home|wheels|dist)/.test(clean)) {
              return { out: '', err: `[+] Building ${dur.toFixed(1)}s (${total}/${total + 1})\n` + log.join('\n') + '\n' + simdkBuildError(df.raw, ins, `failed to compute cache key: failed to calculate checksum of ref ${simdkHash('ref' + sg.index).slice(0, 8)}::${simdkHash(ins.raw).slice(0, 24)}: "${clean}": not found`, simdkStepLine(stepText, 0, 'ERROR ')).err, code: 1 };
            }
            matched.forEach(k => { const rel = k.replace(/^\//, ''); const tail = clean.replace(/^\//, '') === rel ? rel.slice(rel.lastIndexOf('/') + 1) : rel.slice(clean.replace(/^\//, '').length + 1); const target = (destDir || matched.length > 1 ? absDest + '/' + tail : absDest).replace(/\/+/g, '/'); cur.files[target.replace(/^\//, '')] = srcFiles[k]; size += simdkBytes(srcFiles[k]); });
            if (pipHit) { size += srcRoot.pipFiles[pipHit]; cur.pipFiles[clean] = srcRoot.pipFiles[pipHit]; cur.pipInstalled = true; cur.requirements = srcRoot.requirements; }
            fileHash += simdkHash('from:' + ins.flags.from + ':' + clean + ':' + matched.length + ':' + size);
            continue;
          }
          if (/^https?:\/\//.test(src)) { if (ins.op === 'ADD') { size += 1300000; fileHash += simdkHash(src); copied.push({ size: 1300000 }); continue; } }
          const m = simdkMatchCtx(ctx, src);
          if (!m.length) {
            const errText = log.join('\n') + '\n' + stepLogs.map(x => simdkStepLine(x.text, x.d, x.cached ? 'CACHED ' : '')).join('\n') + '\n';
            return { out: '', err: `[+] Building ${dur.toFixed(1)}s (${total}/${total + 1})\n` + errText + simdkBuildError(df.raw, ins, `failed to compute cache key: failed to calculate checksum of ref ${simdkHash('ref' + sg.index).slice(0, 8)}::${simdkHash(ins.raw).slice(0, 24)}: "/${src.replace(/^\.\//, '').replace(/^\//, '')}": not found`, simdkStepLine(stepText, 0, 'ERROR ')).err, code: 1 };
          }
          const srcClean = src.replace(/^\.\//, '').replace(/^\//, '').replace(/\/$/, '');
          for (const rel of m) {
            const f = ctx[rel]; if (f.dir) continue;
            copied.push(f); fileHash += simdkHash(rel + ':' + f.content + ':' + f.mode);
            let tail;
            if (srcClean === '.' || srcClean === '') tail = rel;
            else if (rel === srcClean) tail = destDir ? rel.slice(rel.lastIndexOf('/') + 1) : null;
            else tail = ctx[srcClean] && ctx[srcClean].dir ? rel.slice(srcClean.length + 1) : rel.slice(rel.lastIndexOf('/') + 1);
            const target = tail === null ? absDest : (absDest + '/' + tail).replace(/\/+/g, '/');
            cur.files[target.replace(/^\//, '')] = f.content;
          }
        }
        size = size || simdkLayerEstimate(ins, '', copied, cur);
        text = stepText;
      } else if (ins.op === 'WORKDIR') {
        const wd = String(argText).trim();
        cur.config.WorkingDir = wd.startsWith('/') ? wd : ((cur.config.WorkingDir || '/') + '/' + wd).replace(/\/+/g, '/');
        text = stepText; size = 0;
      } else if (ins.op === 'RUN') {
        const cmdText = ins.exec ? argText.join(' ') : argText;
        const wdRel = (cur.config.WorkingDir || '/').replace(/^\//, '');
        const stageView = { files: {} };
        Object.keys(cur.files).forEach(k => { if (wdRel && k.startsWith(wdRel + '/')) stageView.files[k.slice(wdRel.length + 1)] = cur.files[k]; stageView.files['/' + k] = cur.files[k]; });
        size = simdkLayerEstimate(ins, cmdText, [], stageView);
        if (/pip3?\s+install/.test(cmdText)) {
          cur.pipInstalled = true;
          const reqs = /-r\s+(\S+)/.exec(cmdText);
          const rf = reqs ? stageView.files[reqs[1].replace(/^\.\//, '')] : null;
          if (reqs && rf === undefined) {
            return { out: '', err: `[+] Building ${dur.toFixed(1)}s (${total}/${total + 1})\n` + log.join('\n') + '\n' + stepLogs.map(x => simdkStepLine(x.text, x.d, x.cached ? 'CACHED ' : '')).join('\n') + '\n' + simdkStepLine(stepText, 0.9, 'ERROR ') + `\n------\n > ${stepText}:\n0.812 ERROR: Could not open requirements file: [Errno 2] No such file or directory: '${reqs[1]}'\n------\n` + simdkBuildError(df.raw, ins, `process "/bin/sh -c ${cmdText}" did not complete successfully: exit code: 1`).err, code: 1 };
          }
          cur.requirements = rf ? rf.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')) : cmdText.replace(/.*pip3?\s+install/, '').split(/\s+/).filter(x => x && !x.startsWith('-'));
          const prefix2 = /--prefix[= ]\s*(\S+)/.exec(cmdText); const target2 = /--target[= ]\s*(\S+)/.exec(cmdText); const userFlag = /--user\b/.test(cmdText);
          const pipDir = prefix2 ? prefix2[1] : (target2 ? target2[1] : (userFlag ? '/root/.local' : '/usr/local'));
          cur.pipFiles[pipDir] = size;
          if (!/--no-cache-dir/.test(cmdText) && !hints.includes('pipcache')) hints.push('pipcache');
        }
        if (/apt-get\s+install|apt\s+install/.test(cmdText)) {
          if (!/--no-install-recommends/.test(cmdText) && !hints.includes('aptrec')) hints.push('aptrec');
          if (!/rm\s+-rf\s+\/var\/lib\/apt\/lists/.test(cmdText) && !hints.includes('aptlists')) hints.push('aptlists');
        }
        if (/(useradd|adduser)\s/.test(cmdText)) { const um = /(?:useradd|adduser)\s+(?:-[\w-]+\s+(?:\S+\s+)?)*(\S+)\s*$/.exec(cmdText.split(/&&|;/).find(x => /useradd|adduser/.test(x)) || ''); if (um) cur.users = (cur.users || []).concat(um[1]); }
        if (/mkdir\s+(-p\s+)?(\S+)/.test(cmdText)) { const dm = /mkdir\s+(?:-p\s+)?(\S+)/.exec(cmdText); cur.files[(dm[1].startsWith('/') ? dm[1] : (cur.config.WorkingDir || '/') + '/' + dm[1]).replace(/\/+/g, '/').replace(/^\//, '') + '/.keep'] = ''; }
        if (/touch\s+(\S+)/.test(cmdText)) { const tm = /touch\s+(\S+)/.exec(cmdText); cur.files[(tm[1].startsWith('/') ? tm[1] : (cur.config.WorkingDir || '/') + '/' + tm[1]).replace(/\/+/g, '/').replace(/^\//, '')] = ''; }
        text = stepText;
      }
      const key = simdkHash(cur.key + '|' + ins.op + ' ' + (ins.exec ? JSON.stringify(argText) : argText) + '|' + fileHash);
      const hit = !cacheBroken && st.cache[key];
      if (hit) { stepLogs.push({ text, d: 0, cached: true, inst: ins.raw, size: hit.size }); size = hit.size; cur.layers.push({ id: hit.layerId, size: hit.size, createdBy: ins.raw, cached: true }); }
      else {
        cacheBroken = true;
        const d = ins.op === 'RUN' ? (/pip|apt|apk|npm/.test(ins.args) ? 6 + Math.round(size / 8e6) / 2 : 0.4) : 0.1;
        const layerId = 'sha256:' + simdkHash(key + 'layer');
        st.cache[key] = { layerId, size, created: new Date().toISOString(), inst: ins.raw };
        stepLogs.push({ text, d, cached: false, inst: ins.raw, size });
        cur.layers.push({ id: layerId, size, createdBy: ins.raw, cached: false });
      }
      cur.key = key; cur.size += size; total++;
    }
    built[sg.index] = cur;
  }
  const finalStage = built[targetIdx];
  const metaKey = simdkHash(finalStage.key + '|config|' + JSON.stringify(finalStage.config));
  const imageId = simdkHash('image|' + metaKey);
  const tagRefs = (o.tags || []).map(t => { const r = simdkRef(t); return `${r.repo}:${r.tag}`; });
  /* ciktiyi bitir */
  stepLogs.forEach(x => { log.push(simdkStepLine(x.text, x.d, x.cached ? 'CACHED ' : '')); dur += x.d; (x.subs || []).forEach(sl => log.push(simdkStepLine(sl, 0, '=> '))); });
  step('exporting to image', 0.2); total++;
  sub('exporting layers', 0.2); sub(`writing image sha256:${imageId}`, 0);
  tagRefs.forEach(t => sub(`naming to ${simdkRef(t).normalized}`, 0));
  const header = `[+] Building ${dur.toFixed(1)}s (${total}/${total}) FINISHED`.padEnd(66) + 'docker:default';
  /* imaji kaydet */
  let img = st.images.find(i => i.id === imageId);
  if (!img) {
    img = { id: imageId, created: new Date().toISOString(), size: Math.round(finalStage.size), repoTags: [], repoDigests: [], digest: 'sha256:' + simdkHash('digest|' + imageId), os: finalStage.os, public: false, lab: true, config: finalStage.config, layers: (stages[targetIdx].baseImg ? stages[targetIdx].baseImg.layers : []).concat(finalStage.layers), files: finalStage.files, context: ctxDir, dockerfile: dfNode.d, base: stages[targetIdx].base, baseSize: finalStage.baseSize, baseCreated: stages[targetIdx].baseImg ? stages[targetIdx].baseImg.created : null, requirements: finalStage.requirements || null, users: finalStage.users || [], pipInstalled: !!finalStage.pipInstalled, stages: stages.length, workdir: finalStage.config.WorkingDir };
    st.images.push(img);
  } else { img.created = new Date().toISOString(); img.files = finalStage.files; img.dockerfile = dfNode.d; img.context = ctxDir; }
  for (const t of tagRefs) { st.images.forEach(i => { if (i !== img) i.repoTags = i.repoTags.filter(x => x !== t); }); if (!img.repoTags.includes(t)) img.repoTags.push(t); }
  st.lastBuild = { tags: tagRefs, imageId, size: img.size, steps: stepLogs.filter(x => !x.internal).map(x => ({ inst: x.inst || x.text, cached: !!x.cached, size: x.size || 0 })), hints: hints.slice(), target: o.target || null, file: dfPath, context: ctxDir, dockerignore: !!igNode, multistage: stages.length > 1, at: new Date().toISOString() };
  let out = o.quiet ? `sha256:${imageId}\n` : header + '\n' + log.join('\n') + '\n';
  const H = { pipcache: '💡 pip install --no-cache-dir kullan, pip cache katmana giriyor ve imaj buyuyor', aptrec: '💡 apt-get install --no-install-recommends ile onerilen paketleri disarida birak, imaj kucuk kalir', aptlists: '💡 apt-get install sonrasi ayni RUN icinde rm -rf /var/lib/apt/lists/* yap, paket listeleri katmana girmesin' };
  if (!o.quiet && hints.length) out += hints.map(h => H[h]).join('\n') + '\n';
  if (!o.quiet) { const ignored = Object.keys(simdkContext(sh, ctxDir, [])).filter(k => !ctx[k] && k !== '.dockerignore' && k !== 'Dockerfile'); if (!igNode && Object.keys(ctx).some(k => /^(\.git|tests?|__pycache__|\.venv|venv|node_modules)(\/|$)/.test(k))) out += '💡 Build context icinde .git, tests ya da __pycache__ var, .dockerignore ile disarida birak\n'; void ignored; }
  return ok(out);
}

/* ---------- sahte Python calistirici ---------- */
/* app.py icindeki print satirlarini okur, env ve inventory ile f-string'leri doldurur.
   Donus {lines:[{s:'out'|'err', t}], exit:null|number, longRunning:bool} */
function simdkPyRepr(v) {
  if (Array.isArray(v)) return '[' + v.map(simdkPyRepr).join(', ') + ']';
  if (typeof v === 'string') return `'${v}'`;
  if (v && typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => `'${k}': ${simdkPyRepr(x)}`).join(', ') + '}';
  return String(v);
}
function SIMDK_runProgram(src, files, env, argv) {
  const res = { lines: [], exit: null, longRunning: false };
  const push = (t, err) => res.lines.push({ s: err ? 'err' : 'out', t });
  if (typeof src !== 'string') { push("python: can't open file 'app.py': [Errno 2] No such file or directory", true); res.exit = 2; return res; }
  const consts = {}; const sets = {}; const lists = {};
  const srcLines = src.split('\n');
  const envGet = (k, d) => (env[k] !== undefined ? env[k] : d);
  for (const l of srcLines) {
    let m;
    if ((m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(?:int\()?os\.environ\.get\(\s*["'](\w+)["']\s*(?:,\s*["']([^"']*)["'])?\s*\)\)?\s*$/.exec(l))) { consts[m[1]] = envGet(m[2], m[3] === undefined ? '' : m[3]); continue; }
    if ((m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(?:int\()?os\.environ\[\s*["'](\w+)["']\s*\]\)?\s*$/.exec(l))) { if (env[m[2]] === undefined) { push(`Traceback (most recent call last):\n  File "/app/app.py", line ${srcLines.indexOf(l) + 1}, in <module>\n    ${l.trim()}\n  File "<frozen os>", line 714, in __getitem__\nKeyError: '${m[2]}'`, true); res.exit = 1; return res; } consts[m[1]] = env[m[2]]; continue; }
    if ((m = /^([A-Z_][A-Z0-9_]*)\s*=\s*["']([^"']*)["']\s*$/.exec(l))) { consts[m[1]] = m[2]; continue; }
    if ((m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(\d+)\s*$/.exec(l))) { consts[m[1]] = m[2]; continue; }
    if ((m = /^([A-Z_][A-Z0-9_]*)\s*=\s*\{([^}]*)\}\s*$/.exec(l))) { sets[m[1]] = m[2].split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean); continue; }
    if ((m = /^([A-Z_][A-Z0-9_]*)\s*=\s*\[([^\]]*)\]\s*$/.exec(l))) { lists[m[1]] = m[2].split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean); continue; }
  }
  Object.keys(env).forEach(k => { if (consts[k] === undefined && /^[A-Z_][A-Z0-9_]*$/.test(k)) consts[k] = env[k]; });
  /* envanter */
  let devices = null; let invMissing = false; let invPath = consts.INVENTORY || 'inventory.yaml';
  const openM = /open\(\s*(\w+)\s*\)/.exec(src) || /open\(\s*["']([^"']+)["']\s*\)/.exec(src);
  if (openM) {
    const lit = /open\(\s*["']([^"']+)["']\s*\)/.exec(src);
    const pathConst = Object.keys(consts).find(k => /INVENTORY|_FILE$|_PATH$/.test(k));
    invPath = consts[openM[1]] !== undefined ? consts[openM[1]] : (lit ? lit[1] : (pathConst ? consts[pathConst] : 'inventory.yaml'));
    const rel = invPath.replace(/^\.\//, '').replace(/^\//, '');
    const wd = (env.__WORKDIR || '/app').replace(/^\//, '');
    const content = files[rel] !== undefined ? files[rel] : (files[wd + '/' + rel] !== undefined ? files[wd + '/' + rel] : (files['/' + rel] !== undefined ? files['/' + rel] : undefined));
    if (content === undefined) invMissing = true;
    else {
      try { const y = typeof jsyaml !== 'undefined' ? jsyaml.load(content) : null; devices = y && Array.isArray(y.devices) ? y.devices : (Array.isArray(y) ? y : []); }
      catch (e) { devices = []; }
    }
  }
  const fstr = (s, d) => s.replace(/\{([^{}]+)\}/g, (m, expr) => {
    expr = expr.trim();
    let mm;
    if ((mm = /^len\((\w+)\)$/.exec(expr))) { if (mm[1] === 'devices' || mm[1] === 'inventory' || mm[1] === 'hosts') return String(devices ? devices.length : 0); if (lists[mm[1]]) return String(lists[mm[1]].length); if (sets[mm[1]]) return String(sets[mm[1]].length); return '0'; }
    if ((mm = /^sorted\((\w+)\)$/.exec(expr))) return simdkPyRepr((sets[mm[1]] || lists[mm[1]] || []).slice().sort());
    if ((mm = /^(\w+)\[["'](\w+)["']\]$/.exec(expr)) || (mm = /^(\w+)\.get\(["'](\w+)["'](?:,\s*["']?([^"')]*)["']?)?\)$/.exec(expr))) { if (d && d[mm[2]] !== undefined) return String(d[mm[2]]); return mm[3] !== undefined ? mm[3] : 'None'; }
    if ((mm = /^(\w+)\.(\w+)$/.exec(expr))) { if (d && d[mm[2]] !== undefined) return String(d[mm[2]]); return '?'; }
    if (consts[expr] !== undefined) return String(consts[expr]);
    if (sets[expr]) return '{' + sets[expr].map(x => `'${x}'`).join(', ') + '}';
    if (lists[expr]) return simdkPyRepr(lists[expr]);
    if (expr === 'sys.argv') return simdkPyRepr(argv);
    if (/^[\w.]+\.version$/.test(expr)) return '3.12.7';
    return '?';
  });
  const strOf = (call, d) => {
    const m = /^(f?)(["'])([\s\S]*?)\2\s*(,\s*file\s*=\s*sys\.stderr)?\s*$/.exec(call.trim());
    if (!m) { const parts = []; const re = /(f?)(["'])([^"']*)\2/g; let x; while ((x = re.exec(call))) parts.push(x[1] ? fstr(x[3], d) : x[3]); return { text: parts.join(' ') || call.replace(/,\s*file\s*=\s*sys\.stderr/, '').trim(), err: /sys\.stderr/.test(call) }; }
    return { text: m[1] ? fstr(m[3], d) : m[3], err: !!m[4] };
  };
  /* blok agaci */
  const nodes = srcLines.map((l, i) => ({ i, text: l, indent: l.search(/\S|$/), body: l.trim() })).filter(n => n.body && !n.body.startsWith('#'));
  const tree = []; const stack = [{ indent: -1, children: tree }];
  for (const n of nodes) {
    n.children = [];
    while (stack.length > 1 && stack[stack.length - 1].indent >= n.indent) stack.pop();
    stack[stack.length - 1].children.push(n);
    if (n.body.endsWith(':')) stack.push(n);
  }
  const defs = {}; tree.forEach(n => { const m = /^def\s+(\w+)\s*\(/.exec(n.body); if (m) defs[m[1]] = n; });
  const cond = c => {
    let m;
    if (/__name__\s*==\s*["']__main__["']/.test(c)) return true;
    if ((m = /^(\w+)\s+not\s+in\s+(\w+)$/.exec(c))) { const v = consts[m[1]]; const S = sets[m[2]] || lists[m[2]] || []; return !S.includes(String(v)); }
    if ((m = /^(\w+)\s+in\s+(\w+)$/.exec(c))) { const v = consts[m[1]]; const S = sets[m[2]] || lists[m[2]] || []; return S.includes(String(v)); }
    if ((m = /^["']([^"']+)["']\s+in\s+sys\.argv$/.exec(c))) return argv.includes(m[1]);
    if ((m = /^len\(sys\.argv\)\s*>\s*(\d+)$/.exec(c))) return argv.length > parseInt(m[1], 10);
    if ((m = /^not\s+(\w+)$/.exec(c))) return !consts[m[1]];
    if ((m = /^(\w+)$/.exec(c))) return !!consts[m[1]] && consts[m[1]] !== '0' && consts[m[1]] !== 'False';
    if ((m = /^(\w+)\s*==\s*["']([^"']*)["']$/.exec(c))) return String(consts[m[1]]) === m[2];
    if ((m = /^(\w+)\s*!=\s*["']([^"']*)["']$/.exec(c))) return String(consts[m[1]]) !== m[2];
    if (/__name__\s*==\s*["']__main__["']/.test(c)) return true;
    return false;
  };
  let done = false; let depth = 0;
  const run = (children, d) => {
    for (let k = 0; k < children.length && !done; k++) {
      const n = children[k]; const b = n.body; let m;
      if (/^(import|from)\s/.test(b)) continue;
      if (/^def\s/.test(b) || /^class\s/.test(b)) continue;
      if ((m = /^print\((.*)\)\s*$/.exec(b))) { const s = strOf(m[1], d); push(s.text, s.err); continue; }
      if ((m = /^sys\.exit\((\d*)\)/.exec(b)) || (m = /^raise\s+SystemExit\((\d*)\)/.exec(b))) { res.exit = m[1] ? parseInt(m[1], 10) : 0; done = true; return; }
      if ((m = /^raise\s+(\w+)\((.*)\)/.exec(b))) { push(`Traceback (most recent call last):\n  File "/app/app.py", line ${n.i + 1}, in main\n    ${b}\n${m[1]}: ${m[2].replace(/^f?["']|["']$/g, '')}`, true); res.exit = 1; done = true; return; }
      if ((m = /^if\s+(.*):$/.exec(b))) {
        if (cond(m[1])) { run(n.children, d); let j = k + 1; while (j < children.length && /^(elif|else)\b/.test(children[j].body)) j++; k = j - 1; }
        continue;
      }
      if ((m = /^elif\s+(.*):$/.exec(b))) { if (cond(m[1])) { run(n.children, d); let j = k + 1; while (j < children.length && /^(elif|else)\b/.test(children[j].body)) j++; k = j - 1; } continue; }
      if (/^else\s*:$/.test(b)) { run(n.children, d); continue; }
      if (/^try\s*:$/.test(b)) {
        const tryBody = n.children.map(c => c.body).join('\n');
        const failed = invMissing && /open\(|load_inventory|yaml\.|read_/.test(tryBody);
        if (failed) { const ex = children.slice(k + 1).find(c => /^except\b/.test(c.body)); if (ex) run(ex.children, d); else { push(`Traceback (most recent call last):\n  File "/app/app.py", line ${n.i + 2}, in main\nFileNotFoundError: [Errno 2] No such file or directory: '${invPath}'`, true); res.exit = 1; done = true; return; } }
        else run(n.children, d);
        let j = k + 1; while (j < children.length && /^(except|finally|else)\b/.test(children[j].body)) { if (/^finally\b/.test(children[j].body)) run(children[j].children, d); j++; } k = j - 1;
        continue;
      }
      if (/^except\b/.test(b) || /^finally\b/.test(b)) continue;
      if ((m = /^for\s+(\w+)\s+in\s+(\w+)(?:\.items\(\))?\s*:$/.exec(b))) {
        const items = (m[2] === 'devices' || m[2] === 'inventory' || m[2] === 'hosts') ? (devices || []) : (lists[m[2]] || []).map(x => ({ name: x }));
        for (const it of items) { if (done) break; run(n.children, typeof it === 'object' ? it : { name: it }); }
        continue;
      }
      if (/^while\s+True\s*:$/.test(b)) { run(n.children, d); res.longRunning = true; done = true; return; }
      if (/^time\.sleep\(/.test(b)) continue;
      if ((m = /^(\w+)\s*\(\s*\)\s*$/.exec(b)) && defs[m[1]] && depth < 6) { depth++; run(defs[m[1]].children, d); depth--; continue; }
      if ((m = /^\w+\s*=\s*(load_inventory|read_inventory|load_yaml|load)\(/.exec(b))) { if (invMissing) { push(`Traceback (most recent call last):\n  File "/app/app.py", line ${n.i + 1}, in main\n    ${b}\nFileNotFoundError: [Errno 2] No such file or directory: '${invPath}'`, true); res.exit = 1; done = true; return; } continue; }
      if ((m = /^\w+\s*=\s*open\(/.exec(b))) { if (invMissing) { push(`Traceback (most recent call last):\n  File "/app/app.py", line ${n.i + 1}, in <module>\n    ${b}\nFileNotFoundError: [Errno 2] No such file or directory: '${invPath}'`, true); res.exit = 1; done = true; return; } continue; }
    }
  };
  run(tree, null);
  if (res.exit === null && !res.longRunning) res.exit = 0;
  if (res.longRunning) res.exit = null;
  return res;
}

/* ---------- container surec simulasyonu ---------- */
function simdkOsRelease(os) {
  if (os === 'alpine') return 'NAME="Alpine Linux"\nID=alpine\nVERSION_ID=3.20.3\nPRETTY_NAME="Alpine Linux v3.20"\nHOME_URL="https://alpinelinux.org/"\n';
  if (os === 'ubuntu') return 'PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nVERSION="24.04.1 LTS (Noble Numbat)"\nID=ubuntu\nID_LIKE=debian\n';
  if (os === 'busybox') return 'cat: can\'t open \'/etc/os-release\': No such file or directory\n';
  return 'PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"\nNAME="Debian GNU/Linux"\nVERSION_ID="12"\nVERSION="12 (bookworm)"\nVERSION_CODENAME=bookworm\nID=debian\n';
}
function simdkEnvList(img, c) {
  const env = {}; const put = e => { const i = e.indexOf('='); if (i > 0) env[e.slice(0, i)] = e.slice(i + 1); };
  (img && img.config && img.config.Env || []).forEach(put);
  if (!env.PATH) env.PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';
  env.HOSTNAME = c.hostname || c.id.slice(0, 12);
  (c.env || []).forEach(put);
  env.HOME = img && img.config && img.config.User && img.config.User !== 'root' ? `/home/${img.config.User.split(':')[0]}` : '/root';
  return env;
}
function simdkArgv(img, c) {
  const ep = c.entrypoint !== undefined ? c.entrypoint : (img && img.config ? img.config.Entrypoint : null);
  const cmd = c.cmd && c.cmd.length ? c.cmd : (img && img.config ? img.config.Cmd : null);
  return (ep || []).concat(c.cmd && c.cmd.length ? c.cmd : (cmd || []));
}
/* Container'in programini calistirir, log ve cikis kodu uretir */
function simdkStartProgram(sh, st, c) {
  const img = st.images.find(i => i.id === c.imageId);
  const argv = simdkArgv(img, c);
  const env = simdkEnvList(img, c);
  const wd = (c.workdir || (img && img.config.WorkingDir) || '/');
  const os = img ? img.os : 'debian';
  const out = []; const push = (t, s) => out.push({ s: s || 'out', t, ts: new Date().toISOString() });
  let exit = null; let longRunning = false;
  const a = argv.slice();
  if (a[0] === '/bin/sh' && a[1] === '-c' && a.length === 3) { a.splice(0, 3, ...simdkSplit(a[2])); }
  if (a[0] === 'sh' && a[1] === '-c' && a.length === 3) { a.splice(0, 3, ...simdkSplit(a[2])); }
  if (a.length > 1 && /^(\/usr\/local\/bin\/)?docker-entrypoint\.sh$/.test(a[0]) && !/nginx/.test((img && img.repoTags.join(' ')) || '')) a.shift();
  const base = a[0] ? a[0].replace(/^.*\//, '') : '';
  const isPy = /^python3?(\.\d+)?$/.test(base);
  const script = isPy ? a.find((x, i) => i > 0 && /\.py$/.test(x)) : null;
  if (!a.length) { push('docker: Error response from daemon: no command specified.', 'err'); return { exit: 125, logs: out, longRunning: false, fatal: 'Error response from daemon: no command specified' }; }
  if (isPy && script) {
    const rel = script.replace(/^\.\//, '');
    const abs = (rel.startsWith('/') ? rel : wd.replace(/\/$/, '') + '/' + rel).replace(/^\//, '');
    const files = img ? img.files || {} : {};
    const src = files[abs] !== undefined ? files[abs] : files[rel];
    if (src === undefined) { push(`python: can't open file '${(rel.startsWith('/') ? rel : wd.replace(/\/$/, '') + '/' + rel)}': [Errno 2] No such file or directory`, 'err'); exit = 2; }
    else {
      const envx = Object.assign({ __WORKDIR: wd }, env);
      const r = SIMDK_runProgram(src, files, envx, a.slice(1));
      r.lines.forEach(l => push(l.t, l.s));
      exit = r.exit; longRunning = r.longRunning;
    }
  } else if (isPy && a[1] === '-c') {
    const r = simdkHostRun(sh, ['python3', '-c', a[2]], img);
    r.out.split('\n').filter(Boolean).forEach(l => push(l)); r.err.split('\n').filter(Boolean).forEach(l => push(l, 'err')); exit = r.code;
  } else if (isPy && a.length === 1) { exit = c.tty ? null : 0; longRunning = !!c.tty; if (c.tty) push('Python 3.12.7 (main, Oct  2 2026, 10:30:11) [GCC 12.2.0] on linux\nType "help", "copyright", "credits" or "license" for more information.'); }
  else if (isPy && a[1] === '--version') { push('Python 3.12.7'); exit = 0; }
  else if (isPy && a[1] === '-m' && a[2] === 'pytest') { push('============================= test session starts ==============================\nplatform linux -- Python 3.12.7, pytest-8.3.3\ncollected 2 items\n\ntests/test_app.py ..                                                     [100%]\n\n============================== 2 passed in 0.04s ==============================='); exit = 0; }
  else if (base === 'nginx' || (img && img.repoTags.some(t => /^nginx/.test(t)) && /docker-entrypoint/.test(argv[0] || ''))) {
    push('/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration');
    push('/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/');
    push('/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh');
    push('10-listen-on-ipv6-by-default.sh: info: Getting the checksum of /etc/nginx/conf.d/default.conf');
    push('10-listen-on-ipv6-by-default.sh: info: Enabled listen on IPv6 in /etc/nginx/conf.d/default.conf');
    push('/docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh');
    push('/docker-entrypoint.sh: Launching /docker-entrypoint.d/30-tune-worker-processes.sh');
    push('/docker-entrypoint.sh: Configuration complete; ready for start up');
    const t = new Date().toISOString().replace('T', ' ').slice(0, 19);
    push(`${t} [notice] 1#1: using the "epoll" event method`, 'err'); push(`${t} [notice] 1#1: nginx/1.27.2`, 'err'); push(`${t} [notice] 1#1: start worker processes`, 'err'); push(`${t} [notice] 1#1: start worker process 29`, 'err');
    longRunning = true;
  } else if (base === 'redis-server' || (img && img.repoTags.some(t => /^redis/.test(t)) && !a.some(x => /^(redis-cli|sh|bash|\/bin\/sh|\/bin\/bash)$/.test(x)))) {
    const d = new Date(); const ts = `${String(d.getUTCDate()).padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]} ${d.getUTCFullYear()} ${d.toISOString().slice(11, 23)}`;
    push(`1:C ${ts} * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo`); push(`1:C ${ts} * Redis version=7.4.1, bits=64, commit=00000000, modified=0, pid=1, just started`);
    push(`1:C ${ts} # Warning: no config file specified, using the default config. In order to specify a config file use redis-server /path/to/redis.conf`);
    push(`1:M ${ts} * monotonic clock: POSIX clock_gettime`); push(`1:M ${ts} * Running mode=standalone, port=6379.`); push(`1:M ${ts} * Server initialized`); push(`1:M ${ts} * Ready to accept connections tcp`);
    longRunning = true;
  } else if (base === 'postgres' || (img && img.repoTags.some(t => /^postgres/.test(t)) && a.length <= 2)) {
    if (!env.POSTGRES_PASSWORD && !env.POSTGRES_HOST_AUTH_METHOD) { push('Error: Database is uninitialized and superuser password is not specified.\n       You must specify POSTGRES_PASSWORD to a non-empty value for the\n       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".\n\n       You may also use "POSTGRES_HOST_AUTH_METHOD=trust" to allow all\n       connections without a password. This is *not* recommended.\n\n       See PostgreSQL documentation about "trust":\n       https://www.postgresql.org/docs/current/auth-trust.html', 'err'); exit = 1; }
    else { push('The files belonging to this database system will be owned by user "postgres".\nThis user must also own the server process.\n\nThe database cluster will be initialized with locale "en_US.utf8".\n\nPostgreSQL init process complete; ready for start up.\n'); const t = new Date().toISOString().replace('T', ' ').slice(0, 19); push(`${t}.123 UTC [1] LOG:  starting PostgreSQL 16.4 (Debian 16.4-1.pgdg120+2) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit`); push(`${t}.124 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432`); push(`${t}.130 UTC [1] LOG:  database system is ready to accept connections`); longRunning = true; }
  } else if (base === 'crash') { push('panic: simulated crash', 'err'); exit = 1; }
  else if (base === 'sleep' || base === 'tail' || base === 'yes' || base === 'top' || (base === 'sh' && !c.tty && a.length === 1 && false)) { longRunning = !/^\d+$/.test(a[1] || 'x') || parseInt(a[1], 10) > 30; if (!longRunning) exit = 0; }
  else if ((base === 'sh' || base === 'bash' || base === 'ash' || base === 'zsh') && a.length === 1) {
    if (c.tty) { longRunning = true; push(`lab: etkileşimli TTY simüle edilmiyor, container açık kaldı. docker exec -it ${c.name} ${base} -c "komut" ya da docker exec ${c.name} ls ile çalış`, 'err'); }
    else exit = 0;
  } else if (/^\/hello$/.test(a[0]) || (img && img.repoTags.some(t => /^hello-world/.test(t)))) {
    push('\nHello from Docker!\nThis message shows that your installation appears to be working correctly.\n\nTo generate this message, Docker took the following steps:\n 1. The Docker client contacted the Docker daemon.\n 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.\n    (amd64)\n 3. The Docker daemon created a new container from that image which runs the\n    executable that produces the output you are currently reading.\n 4. The Docker daemon streamed that output to the Docker client, which sent it\n    to your terminal.\n\nTo try something more ambitious, you can run an Ubuntu container with:\n $ docker run -it ubuntu bash\n\nFor more examples and ideas, visit:\n https://docs.docker.com/get-started/\n'); exit = 0;
  } else if (/while\s+true/.test(argv.join(' '))) {
    const m = /echo\s+["']?([^"';]+)["']?/.exec(argv.join(' ')); for (let i = 0; i < 3; i++) push(m ? m[1].trim() : 'tick'); longRunning = true;
  } else {
    const r = simdkExecIn(sh, st, c, img, a, { silentNote: true });
    r.out.split('\n').filter((l, i, arr) => l || i < arr.length - 1).forEach(l => push(l)); r.err.split('\n').filter(Boolean).forEach(l => push(l, 'err'));
    exit = r.code; if (r.notFound) exit = 127;
    if (r.notFound) { out.length = 0; return { exit: 127, logs: out, longRunning: false, fatal: `failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: exec: "${a[0]}": executable file not found in $PATH: unknown.` }; }
  }
  if (env.CRASH === '1' || env.CRASH === 'true') { push('fatal: CRASH=1 set, exiting', 'err'); exit = 1; longRunning = false; }
  return { exit, logs: out, longRunning };
}
function simdkSplit(s) {
  const out = []; let cur = ''; let q = null; let has = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === q) q = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; has = true; continue; }
    if (/\s/.test(ch)) { if (has || cur) { out.push(cur); cur = ''; has = false; } continue; }
    cur += ch; has = true;
  }
  if (has || cur) out.push(cur);
  return out;
}
/* host shell uzerinden komut, container cwd'si build context ile eslenir */
function simdkHostRun(sh, argv, img) {
  const buf = []; const errs = [];
  const line = argv.map(simdkQuote).join(' ');
  const savedCwd = sh.cwd; const savedUi = sh.ui; const savedCode = sh.lastCode;
  if (img && img.context && sh.node(img.context)) sh.cwd = img.context;
  let code = 0;
  try { code = sh.execList(line, (t, cls) => (cls === 'err' ? errs : buf).push(t)); } catch (e) { errs.push('sh: ' + (e.message || e) + '\n'); code = 1; }
  sh.cwd = savedCwd; sh.ui = savedUi; sh.lastCode = savedCode;
  return { out: buf.join(''), err: errs.join(''), code, notFound: code === 127 };
}
/* docker exec ve run icin komut motoru */
function simdkExecIn(sh, st, c, img, argv, opt = {}) {
  const env = simdkEnvList(img, c);
  const os = img ? img.os : 'debian';
  const wd = c.workdir || (img && img.config.WorkingDir) || '/';
  const files = img ? img.files || {} : {};
  let a = argv.slice();
  const okr = t => ({ out: t, err: '', code: 0 });
  if ((a[0] === 'sh' || a[0] === '/bin/sh' || a[0] === 'bash' || a[0] === '/bin/bash') && a[1] === '-c') {
    const script = a.slice(2).join(' ');
    if (/&&|;/.test(script) && !/\||>|<|\$\(/.test(script)) {
      const segs = script.split(/\s*(&&|;)\s*/); let out = ''; let err = ''; let code = 0; let prevOp = null;
      for (const seg of segs) { if (seg === '&&' || seg === ';') { prevOp = seg; continue; } if (prevOp === '&&' && code !== 0) continue; const r = simdkExecIn(sh, st, c, img, simdkSplit(seg), opt); out += r.out; err += r.err; code = r.code; }
      return { out, err, code };
    }
    if (/\||>|<|\$\(/.test(script)) { const r = simdkHostRun(sh, ['sh', '-c', script], img); if (!opt.silentNote) r.err = `lab: pipe ve yönlendirme içeren komut host shell'inde çalıştı\n` + r.err; return r; }
    a = simdkSplit(script);
  }
  const base = (a[0] || '').replace(/^.*\//, '');
  if (!a.length) return okr('');
  if (base === 'env' || base === 'printenv') { if (a[1]) return env[a[1]] !== undefined ? okr(env[a[1]] + '\n') : { out: '', err: '', code: 1 }; return okr(Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'); }
  if (base === 'echo') { return okr(a.slice(1).map(x => x.replace(/^\$(\w+)$/, (m, k) => env[k] !== undefined ? env[k] : '')).join(' ') + '\n'); }
  if (base === 'hostname') return okr((c.hostname || c.id.slice(0, 12)) + '\n');
  if (base === 'whoami') return okr(((img && img.config.User) || 'root').split(':')[0] + '\n');
  if (base === 'id') { const u = ((img && img.config.User) || 'root').split(':')[0]; return okr(u === 'root' ? 'uid=0(root) gid=0(root) groups=0(root)\n' : `uid=1000(${u}) gid=1000(${u}) groups=1000(${u})\n`); }
  if (base === 'pwd') return okr(wd + '\n');
  if (base === 'uname') return okr(a.includes('-a') ? 'Linux ' + c.id.slice(0, 12) + ' 6.8.0-45-generic #45-Ubuntu SMP x86_64 GNU/Linux\n' : 'Linux\n');
  if (base === 'cat' && a[1] === '/etc/os-release') return okr(simdkOsRelease(os));
  if (base === 'cat' && a[1] === '/etc/hostname') return okr(c.id.slice(0, 12) + '\n');
  if (base === 'cat' && a[1] === '/etc/hosts') { return okr('127.0.0.1\tlocalhost\n::1\tlocalhost ip6-localhost ip6-loopback\n' + (c.ip || '172.17.0.2') + '\t' + c.id.slice(0, 12) + '\n'); }
  if (base === 'ps') { const cmd = simdkArgv(img, c).join(' '); return okr(`PID   USER     TIME  COMMAND\n    1 ${((img && img.config.User) || 'root').split(':')[0].padEnd(8)} 0:00 ${cmd}\n   ${a.length ? '17' : '12'} root      0:00 ${a.join(' ')}\n`); }
  if (base === 'python' || base === 'python3') { if (a[1] === '--version' || a[1] === '-V') return okr('Python 3.12.7\n'); if (a[1] === '-c') { const r = simdkHostRun(sh, ['python3', '-c', a[2]], img); return r; } if (a[1] && /\.py$/.test(a[1])) { const r = SIMDK_runProgram(files[(wd.replace(/^\//, '') + '/' + a[1]).replace(/\/+/g, '/')] !== undefined ? files[(wd.replace(/^\//, '') + '/' + a[1]).replace(/\/+/g, '/')] : files[a[1].replace(/^\//, '')], files, Object.assign({ __WORKDIR: wd }, env), a.slice(1)); return { out: r.lines.filter(l => l.s === 'out').map(l => l.t + '\n').join(''), err: r.lines.filter(l => l.s === 'err').map(l => l.t + '\n').join(''), code: r.exit === null ? 0 : r.exit }; } }
  if (base === 'pip' || base === 'pip3') { const reqs = img && img.requirements ? img.requirements : []; if (a[1] === 'list') return okr('Package    Version\n---------- -------\npip        24.2\n' + reqs.map(r => { const [n, v] = r.split('=='); return `${n.padEnd(10)} ${v || 'lab'}`; }).join('\n') + '\n'); if (a[1] === 'freeze') return okr(reqs.join('\n') + '\n'); if (a[1] === '--version') return okr('pip 24.2 from /usr/local/lib/python3.12/site-packages/pip (python 3.12)\n'); }
  if (base === 'redis-cli' && img && img.repoTags.some(t => /^redis/.test(t))) { if (a[1] === 'ping' || !a[1]) return okr('PONG\n'); if (a[1] === 'info') return okr('# Server\nredis_version:7.4.1\nredis_mode:standalone\ntcp_port:6379\n'); if (a[1] === 'set') return okr('OK\n'); if (a[1] === 'get') return okr('(nil)\n'); return okr('OK\n'); }
  if (base === 'nginx' && a[1] === '-t') return okr('nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful\n');
  if (base === 'nginx' && a[1] === '-v') return { out: '', err: 'nginx version: nginx/1.27.2\n', code: 0 };
  if (base === 'ping' || base === 'nslookup' || base === 'getent' || base === 'nc' || base === 'curl' || base === 'wget') {
    const host = base === 'getent' ? a[2] : (base === 'nc' ? a.filter(x => !x.startsWith('-'))[1] : a.filter(x => !x.startsWith('-') && !/^\d+$/.test(x))[1]);
    const h = (host || '').replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const peer = st.containers.find(x => x !== c && x.status === 'running' && (x.name === h || (x.aliases || []).includes(h)) && (x.network !== 'bridge' || c.network === 'host') && x.network === c.network);
    const self = h === 'localhost' || h === '127.0.0.1';
    if (base === 'ping') {
      if (!peer && !self && !/^\d+\.\d+\.\d+\.\d+$/.test(h)) return { out: '', err: os === 'alpine' || os === 'busybox' ? `ping: bad address '${h}'\n` : `ping: ${h}: Name or service not known\n`, code: os === 'alpine' ? 1 : 2 };
      const ip = self ? '127.0.0.1' : (peer ? peer.ip : h);
      return okr(`PING ${h} (${ip}): 56 data bytes\n64 bytes from ${ip}: seq=0 ttl=64 time=0.081 ms\n64 bytes from ${ip}: seq=1 ttl=64 time=0.064 ms\n64 bytes from ${ip}: seq=2 ttl=64 time=0.059 ms\n\n--- ${h} ping statistics ---\n3 packets transmitted, 3 packets received, 0% packet loss\nround-trip min/avg/max = 0.059/0.068/0.081 ms\n`);
    }
    if (base === 'getent') return peer ? okr(`${peer.ip}      ${h}\n`) : { out: '', err: '', code: 2 };
    if (base === 'nslookup') return peer ? okr(`Server:\t\t127.0.0.11\nAddress:\t127.0.0.11:53\n\nNon-authoritative answer:\nName:\t${h}\nAddress: ${peer.ip}\n`) : { out: '', err: `nslookup: can't resolve '${h}'\n`, code: 1 };
    if (base === 'nc') { const port = a.filter(x => /^\d+$/.test(x)).pop(); return peer ? okr(`${h} (${peer.ip}:${port}) open\n`) : { out: '', err: `nc: bad address '${h}'\n`, code: 1 }; }
    if (base === 'curl' || base === 'wget') {
      if (peer) { const pimg = st.images.find(i => i.id === peer.imageId); if (pimg && pimg.repoTags.some(t => /^nginx/.test(t))) return okr('<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, the nginx web server is successfully installed and\nworking. Further configuration is required.</p>\n</body>\n</html>\n'); return okr(`{"status":"ok","service":"${peer.name}"}\n`); }
      if (self) return okr('{"status":"ok","version":"1.0.0"}\n');
      return { out: '', err: base === 'curl' ? `curl: (6) Could not resolve host: ${h}\n` : `wget: bad address '${h}'\n`, code: 6 };
    }
  }
  if (base === 'ls') {
    const flags = a.slice(1).filter(x => x.startsWith('-')).join(''); const target = a.slice(1).filter(x => !x.startsWith('-'))[0] || wd;
    const abs = (target.startsWith('/') ? target : wd.replace(/\/$/, '') + '/' + target).replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');
    if (abs === '' || abs === '.') return okr('bin\nboot\ndev\netc\nhome\nlib\nlib64\nmedia\nmnt\nopt\nproc\nroot\nrun\nsbin\nsrv\nsys\ntmp\nusr\nvar\n'.split('\n').filter(Boolean).concat(Object.keys(files).map(k => k.split('/')[0]).filter((v, i, arr) => arr.indexOf(v) === i && v)).filter((v, i, arr) => arr.indexOf(v) === i).sort().join('\n') + '\n');
    const names = new Set();
    Object.keys(files).forEach(k => { if (k.startsWith(abs + '/')) names.add(k.slice(abs.length + 1).split('/')[0]); });
    (c.mounts || []).forEach(m => { const d = m.Destination.replace(/^\//, ''); if (d.startsWith(abs + '/')) names.add(d.slice(abs.length + 1).split('/')[0]); else if (d === abs && m.Type === 'bind') { const n = sh.node(m.Source); if (n && n.t === 'd') Object.keys(n.c).forEach(x => names.add(x)); } });
    if (!names.size && files[abs] === undefined) { const n = sh.node('/' + abs); if (n && n.t === 'd' && /^(etc|usr|var|tmp|home|root)/.test(abs)) return okr(Object.keys(n.c).sort().join('\n') + '\n'); return { out: '', err: `ls: cannot access '${target}': No such file or directory\n`, code: 2 }; }
    if (files[abs] !== undefined) return okr(target + '\n');
    const list = [...names].filter(n => n !== '.keep').sort();
    if (/l/.test(flags)) return okr(`total ${list.length * 4}\n` + list.map(n => { const isDir = Object.keys(files).some(k => k.startsWith(abs + '/' + n + '/')); const sz = isDir ? 4096 : simdkBytes(files[abs + '/' + n] || ''); return `${isDir ? 'drwxr-xr-x' : '-rw-r--r--'} 1 root root ${String(sz).padStart(6)} Oct 13 08:00 ${n}`; }).join('\n') + '\n');
    return okr(list.join('\n') + '\n');
  }
  if (base === 'cat' || base === 'head' || base === 'tail') {
    const target = a.slice(1).filter(x => !x.startsWith('-')).pop();
    if (target) {
      const abs = (target.startsWith('/') ? target : wd.replace(/\/$/, '') + '/' + target).replace(/\/+/g, '/').replace(/^\//, '');
      if (files[abs] !== undefined) return okr(files[abs].endsWith('\n') || !files[abs] ? files[abs] : files[abs] + '\n');
      const mnt = (c.mounts || []).find(m => ('/' + abs).startsWith(m.Destination + '/') || '/' + abs === m.Destination);
      if (mnt && mnt.Type === 'bind') { const n = sh.node(mnt.Source + ('/' + abs).slice(mnt.Destination.length)); if (n && n.t === 'f') return okr(n.d); }
      if (mnt && mnt.Type === 'volume') { const vol = st.volumes.find(v => v.name === mnt.Name); const sub = ('/' + abs).slice(mnt.Destination.length).replace(/^\//, ''); if (vol && vol.files && vol.files[sub] !== undefined) return okr(vol.files[sub]); }
      if (!sh.node('/' + abs)) return { out: '', err: `${base}: ${target}: No such file or directory\n`, code: 1 };
    }
  }
  if (base === 'touch' || (base === 'sh' && false)) {
    const target = a[1]; if (target) { const abs = (target.startsWith('/') ? target : wd.replace(/\/$/, '') + '/' + target).replace(/\/+/g, '/'); const mnt = (c.mounts || []).find(m => abs.startsWith(m.Destination + '/')); if (mnt && mnt.Type === 'volume') { const vol = st.volumes.find(v => v.name === mnt.Name); if (vol) { vol.files = vol.files || {}; vol.files[abs.slice(mnt.Destination.length + 1)] = ''; return okr(''); } } if (mnt && mnt.Type === 'bind') { sh.writeFile(mnt.Source + abs.slice(mnt.Destination.length), '', false, 'touch'); return okr(''); } }
  }
  if (base === 'apt-get' || base === 'apt' || base === 'apk' || base === 'yum') return { out: '', err: `lab: container içinde paket kurulumu simüle edilmiyor, ${base} satırını Dockerfile RUN içine yaz\n`, code: 1 };
  if (base === 'exit') return okr('');
  if (base === 'true') return okr('');
  if (base === 'false') return { out: '', err: '', code: 1 };
  if (base === 'sleep') return okr('');
  /* host shell'e dus */
  const r = simdkHostRun(sh, a, img);
  if (r.notFound) return { out: '', err: `OCI runtime exec failed: exec failed: unable to start container process: exec: "${a[0]}": executable file not found in $PATH: unknown\n`, code: 126, notFound: true };
  if (!opt.silentNote) r.err = `lab: container filesystem simüle ediliyor, ${a[0]} host shell'inde ${img && img.context ? img.context + ' içinde' : ''} çalıştı\n` + r.err;
  return r;
}

/* ---------- pull, push, login ---------- */
function simdkPullLines(ref, img) {
  const r = simdkRef(ref);
  const lines = [`${r.tag}: Pulling from ${r.registry === 'docker.io' ? r.path : r.path}`];
  (img.layers || []).slice(0, 8).forEach(l => lines.push(`${l.id.slice(7, 19)}: Pull complete`));
  lines.push(`Digest: ${img.digest}`, `Status: Downloaded newer image for ${r.registry === 'docker.io' ? `${r.repo}:${r.tag}` : `${r.repo}:${r.tag}`}`, r.registry === 'docker.io' ? r.normalized : `${r.repo}:${r.tag}`);
  return lines;
}
/* {img, out} ya da {err} */
function simdkPull(sh, st, ref) {
  const r = simdkRef(ref);
  const key = `${r.repo}:${r.tag}`;
  const have = simdkFindImage(st, key);
  if (have) return { img: have, out: `${r.tag}: Pulling from ${r.path}\nDigest: ${have.digest}\nStatus: Image is up to date for ${key}\n${r.registry === 'docker.io' ? r.normalized : key}\n` };
  let rec = null;
  if (r.registry === SIMDK_REGISTRY) {
    rec = st.registry[key] ? JSON.parse(JSON.stringify(st.registry[key])) : null;
    if (!rec) { const anyTag = Object.keys(st.registry).some(k => k.split(':')[0] === r.repo); return { err: anyTag ? `Error response from daemon: manifest for ${key} not found: manifest unknown: manifest unknown` : `Error response from daemon: manifest for ${key} not found: manifest unknown: manifest unknown` }; }
    rec.pulled = new Date().toISOString();
  } else if (r.registry === 'docker.io') {
    rec = simdkPublicRecord(key);
    if (!rec) {
      const repoKnown = Object.keys(SIMDK_PUBLIC).some(k => k.split(':')[0] === r.repo);
      if (repoKnown) return { err: `Error response from daemon: manifest for ${key} not found: manifest unknown: manifest unknown` };
      return { err: `Error response from daemon: pull access denied for ${r.repo}, repository does not exist or may require 'docker login': denied: requested access to the resource is denied` };
    }
  } else return { err: `Error response from daemon: Get "https://${r.registry}/v2/": dial tcp: lookup ${r.registry}: no such host` };
  const existing = st.images.find(i => i.id === rec.id);
  if (existing) { if (!existing.repoTags.includes(key)) existing.repoTags.push(key); return { img: existing, out: simdkPullLines(key, existing).join('\n') + '\n' }; }
  rec.repoTags = [key];
  st.images.push(rec);
  return { img: rec, out: simdkPullLines(key, rec).join('\n') + '\n' };
}

/* ---------- ag ve volume ---------- */
function simdkNet(st, name) { return st.networks.find(n => n.name === name || n.id.startsWith(name)); }
function simdkAllocIp(st, net) {
  if (!net || net.driver !== 'bridge') return '';
  net.nextIp = net.nextIp || 2;
  const base = net.subnet.split('/')[0].split('.').slice(0, 3).join('.');
  const used = new Set(st.containers.filter(c => c.network === net.name && c.status === 'running').map(c => c.ip));
  let n = 2; while (used.has(`${base}.${n}`)) n++;
  return `${base}.${n}`;
}
function simdkVolume(st, name) { return st.volumes.find(v => v.name === name); }
function simdkEnsureVolume(st, name) { let v = simdkVolume(st, name); if (!v) { v = { name, driver: 'local', mountpoint: `/var/lib/docker/volumes/${name}/_data`, created: new Date().toISOString(), labels: {}, files: {} }; st.volumes.push(v); } return v; }

/* ---------- container yasam dongusu ---------- */
function simdkCont(st, ref) {
  if (!ref) return null;
  return st.containers.find(c => c.name === ref || c.name === ref.replace(/^\//, '')) || st.containers.find(c => c.id.startsWith(ref)) || null;
}
function simdkRandomName(st) {
  for (let i = 0; i < 50; i++) { const n = `${SIMDK_NAMES[Math.floor(Math.random() * SIMDK_NAMES.length)]}_${SIMDK_SURNAMES[Math.floor(Math.random() * SIMDK_SURNAMES.length)]}`; if (!st.containers.some(c => c.name === n)) return n; }
  return 'container_' + simdkRand(4);
}
function simdkParsePort(p) {
  let proto = 'tcp'; const sl = p.lastIndexOf('/'); if (sl > 0) { proto = p.slice(sl + 1); p = p.slice(0, sl); }
  const parts = p.split(':');
  if (parts.length === 1) return { hostIp: '0.0.0.0', host: null, cont: parts[0], proto };
  if (parts.length === 2) return { hostIp: '0.0.0.0', host: parts[0], cont: parts[1], proto };
  return { hostIp: parts[0], host: parts[1], cont: parts[2], proto };
}
/* run / create secenekleri. hata varsa string doner */
function simdkParseRun(sh, args) {
  const o = { detach: false, name: null, ports: [], env: [], volumes: [], network: null, rm: false, tty: false, interactive: false, restart: 'no', workdir: null, user: null, hostname: null, entrypoint: undefined, labels: {}, image: null, cmd: [], publishAll: false, healthCmd: null, memory: null, cpus: null, platform: null };
  let i = 0;
  for (; i < args.length; i++) {
    const a = args[i];
    const val = () => { if (a.includes('=') && a.startsWith('--')) return a.slice(a.indexOf('=') + 1); const v = args[++i]; if (v === undefined) throw new Error(`flag needs an argument: ${a}`); return v; };
    if (a === '-d' || a === '--detach') o.detach = true;
    else if (a === '--name' || a.startsWith('--name=')) o.name = val();
    else if (a === '-p' || a === '--publish' || a.startsWith('--publish=')) o.ports.push(val());
    else if (a === '-P' || a === '--publish-all') o.publishAll = true;
    else if (a === '-e' || a === '--env' || a.startsWith('--env=')) { const v = val(); if (!v.includes('=')) { if (sh.env[v] !== undefined) o.env.push(`${v}=${sh.env[v]}`); } else o.env.push(v); }
    else if (a === '--env-file' || a.startsWith('--env-file=')) { const f = val(); const r = sh.readFile(f, 'docker'); if (r.err) throw new Error(`open ${sh.resolve(f)}: no such file or directory`); r.data.split('\n').forEach(l => { l = l.trim(); if (l && !l.startsWith('#')) o.env.push(l.includes('=') ? l : `${l}=${sh.env[l] || ''}`); }); }
    else if (a === '-v' || a === '--volume' || a.startsWith('--volume=')) o.volumes.push(val());
    else if (a === '--mount' || a.startsWith('--mount=')) { const v = val(); const kv = Object.fromEntries(v.split(',').map(x => x.split('='))); o.volumes.push(`${kv.source || kv.src}:${kv.target || kv.dst || kv.destination}${kv.readonly !== undefined || kv.ro !== undefined ? ':ro' : ''}`); }
    else if (a === '--network' || a === '--net' || a.startsWith('--network=') || a.startsWith('--net=')) o.network = val();
    else if (a === '--rm') o.rm = true;
    else if (a === '-it' || a === '-ti') { o.tty = true; o.interactive = true; }
    else if (a === '-i' || a === '--interactive') o.interactive = true;
    else if (a === '-t' || a === '--tty') o.tty = true;
    else if (a === '-dit' || a === '-itd' || a === '-dt' || a === '-di') { o.detach = true; o.tty = true; o.interactive = true; }
    else if (a === '--restart' || a.startsWith('--restart=')) o.restart = val();
    else if (a === '-w' || a === '--workdir' || a.startsWith('--workdir=')) o.workdir = val();
    else if (a === '-u' || a === '--user' || a.startsWith('--user=')) o.user = val();
    else if (a === '-h' || a === '--hostname' || a.startsWith('--hostname=')) o.hostname = val();
    else if (a === '--entrypoint' || a.startsWith('--entrypoint=')) { const v = val(); o.entrypoint = v === '' ? [] : [v]; }
    else if (a === '-l' || a === '--label' || a.startsWith('--label=')) { const v = val(); const k = v.indexOf('='); o.labels[k > 0 ? v.slice(0, k) : v] = k > 0 ? v.slice(k + 1) : ''; }
    else if (a === '--health-cmd' || a.startsWith('--health-cmd=')) o.healthCmd = val();
    else if (a === '-m' || a === '--memory' || a.startsWith('--memory=')) o.memory = val();
    else if (a === '--cpus' || a.startsWith('--cpus=')) o.cpus = val();
    else if (a === '--platform' || a.startsWith('--platform=')) o.platform = val();
    else if (/^--(health-interval|health-retries|health-timeout|health-start-period|log-driver|log-opt|add-host|dns|cap-add|cap-drop|security-opt|ulimit|device|tmpfs|ip|mac-address|cpu-shares|memory-swap|shm-size|stop-timeout|pull|cgroupns|pid|ipc|userns|runtime|sysctl|expose|link|network-alias|group-add|storage-opt|volumes-from|cidfile|label-file|domainname|stop-signal|oom-score-adj|pids-limit|blkio-weight)$/.test(a)) i++;
    else if (/^--(health-interval|health-retries|health-timeout|health-start-period|log-driver|log-opt|add-host|dns|cap-add|cap-drop|security-opt|ulimit|device|tmpfs|ip|mac-address|cpu-shares|memory-swap|shm-size|stop-timeout|pull|cgroupns|pid|ipc|userns|runtime|sysctl|expose|link|network-alias|group-add|storage-opt|volumes-from|cidfile|label-file|domainname|stop-signal|oom-score-adj|pids-limit|blkio-weight)=/.test(a)) { /* yok say */ }
    else if (a === '--privileged' || a === '--init' || a === '--read-only' || a === '--no-healthcheck' || a === '--sig-proxy' || a === '--oom-kill-disable' || a === '-a' || a === '--attach' || a === '-q' || a === '--quiet') { /* yok say */ }
    else if (a.startsWith('-') && a.length > 1) throw new Error(`unknown flag: ${a.split('=')[0]}`);
    else break;
  }
  o.image = args[i]; o.cmd = args.slice(i + 1);
  return o;
}
function simdkCreate(sh, st, o, img, opts = {}) {
  const r = simdkRef(o.image);
  const id = simdkRand(64);
  const name = o.name || simdkRandomName(st);
  const netName = o.network || 'bridge';
  const net = simdkNet(st, netName);
  const ports = {}; const bindings = {};
  (img.config.ExposedPorts ? Object.keys(img.config.ExposedPorts) : []).forEach(p => { ports[p] = null; });
  for (const p of o.ports) {
    const pp = simdkParsePort(p);
    const key = `${pp.cont}/${pp.proto}`;
    const host = pp.host === null ? String(32768 + Math.floor(Math.random() * 20000)) : pp.host;
    ports[key] = [{ HostIp: pp.hostIp, HostPort: host }];
    bindings[key] = [{ HostIp: pp.hostIp === '0.0.0.0' ? '' : pp.hostIp, HostPort: host }];
  }
  if (o.publishAll) Object.keys(ports).forEach(k => { if (!ports[k]) { const host = String(32768 + Math.floor(Math.random() * 20000)); ports[k] = [{ HostIp: '0.0.0.0', HostPort: host }]; } });
  const mounts = [];
  for (const v of o.volumes) {
    const parts = v.split(':');
    let src = parts[0]; let dst = parts[1]; const mode = parts[2] || '';
    if (!dst) { dst = src; src = null; }
    if (src === null) { const an = simdkRand(64); simdkEnsureVolume(st, an); mounts.push({ Type: 'volume', Name: an, Source: `/var/lib/docker/volumes/${an}/_data`, Destination: dst, Driver: 'local', Mode: '', RW: true, Propagation: '' }); }
    else if (/^[./~]/.test(src) || src.startsWith('$')) { const abs = sh.resolve(src); mounts.push({ Type: 'bind', Source: abs, Destination: dst, Mode: mode, RW: mode !== 'ro', Propagation: 'rprivate' }); }
    else { simdkEnsureVolume(st, src); mounts.push({ Type: 'volume', Name: src, Source: `/var/lib/docker/volumes/${src}/_data`, Destination: dst, Driver: 'local', Mode: mode === 'ro' ? 'ro' : 'z', RW: mode !== 'ro', Propagation: '' }); }
  }
  const c = { id, name, image: r.registry === 'docker.io' ? `${r.repo}:${r.tag}` : `${r.repo}:${r.tag}`, imageId: img.id, cmd: o.cmd, entrypoint: o.entrypoint, env: o.env, ports, bindings, mounts, network: net ? net.name : netName, networks: [net ? net.name : netName], ip: '', gateway: net ? net.gateway : '', status: 'created', exitCode: 0, created: new Date().toISOString(), started: null, finished: null, logs: [], restart: o.restart || 'no', restartCount: 0, rm: !!o.rm, tty: !!o.tty, interactive: !!o.interactive, workdir: o.workdir, user: o.user, hostname: o.hostname, labels: Object.assign({}, img.config.Labels || {}, o.labels || {}), healthTick: null, aliases: opts.aliases || [], compose: opts.compose || null, longRunning: false };
  st.containers.push(c);
  return c;
}
/* baslatir, port cakismasi vb hata string doner */
function simdkStart(sh, st, c) {
  const img = st.images.find(i => i.id === c.imageId);
  for (const [key, b] of Object.entries(c.ports)) {
    if (!b) continue;
    const hp = b[0].HostPort;
    const clash = st.containers.find(x => x !== c && x.status === 'running' && Object.values(x.ports).some(y => y && y[0].HostPort === hp));
    if (clash) return `Error response from daemon: driver failed programming external connectivity on endpoint ${c.name} (${simdkHash(c.id).slice(0, 64)}): Bind for ${b[0].HostIp}:${hp} failed: port is already allocated`;
  }
  const net = simdkNet(st, c.network);
  if (!net && c.network !== 'host' && c.network !== 'none') return `Error response from daemon: network ${c.network} not found`;
  c.ip = net ? simdkAllocIp(st, net) : '';
  c.status = 'running'; c.started = new Date().toISOString(); c.finished = null; c.exitCode = 0;
  const r = simdkStartProgram(sh, st, c);
  if (r.fatal) { c.status = 'created'; c.started = null; c.logs = c.logs.concat(r.logs); return `Error response from daemon: ${r.fatal}`; }
  c.logs = c.logs.concat(r.logs);
  c.longRunning = r.longRunning;
  if (!r.longRunning) { c.status = 'exited'; c.exitCode = r.exit == null ? 0 : r.exit; c.finished = new Date(Date.now() + 40).toISOString(); c.ip = ''; }
  else if (img && img.config.Healthcheck && img.config.Healthcheck.Test && img.config.Healthcheck.Test[0] !== 'NONE') { c.healthTick = st.tick; c.health = 'starting'; }
  return null;
}
function simdkStop(st, c, signal) {
  if (c.status !== 'running') return;
  const argv = simdkArgv(st.images.find(i => i.id === c.imageId), c).join(' ');
  c.status = 'exited'; c.finished = new Date().toISOString(); c.ip = '';
  c.exitCode = signal === 'KILL' ? 137 : (/sleep|tail -f|while true|^sh$|^bash$|^\/bin\/sh$/.test(argv) ? 137 : 0);
  c.health = undefined;
  if (c.rm) st.containers.splice(st.containers.indexOf(c), 1);
}
/* her docker komutunda cagrilir. health, restart politikasi */
function simdkTick(sh, st) {
  st.tick = (st.tick || 0) + 1;
  for (const c of st.containers.slice()) {
    const img = st.images.find(i => i.id === c.imageId);
    if (c.status === 'running' && c.health === 'starting' && st.tick - c.healthTick >= 2) {
      const hc = img && img.config.Healthcheck ? img.config.Healthcheck.Test.join(' ') : '';
      c.health = /exit 1$|false$/.test(hc.trim()) && !/\|\|/.test(hc) ? 'unhealthy' : 'healthy';
    }
    if (c.status === 'exited' && c.exitCode !== 0 && (c.restart === 'always' || c.restart === 'unless-stopped' || /^on-failure/.test(c.restart)) && !c.stoppedByUser) {
      const max = /^on-failure:(\d+)/.exec(c.restart);
      if (!max || c.restartCount < parseInt(max[1], 10)) { c.restartCount++; c.status = 'restarting'; c.restartTick = st.tick; }
    } else if (c.status === 'restarting' && st.tick - (c.restartTick || 0) >= 1) {
      c.status = 'running'; c.started = new Date().toISOString();
      const r = simdkStartProgram(sh, st, c); c.logs = c.logs.concat(r.logs);
      if (!r.longRunning) { c.status = 'exited'; c.exitCode = r.exit == null ? 0 : r.exit; c.finished = new Date().toISOString(); }
    }
  }
}
function simdkStatusText(c) {
  if (c.status === 'created') return 'Created';
  if (c.status === 'restarting') return `Restarting (${c.exitCode}) ${simdkAgo(Date.now() - new Date(c.finished || c.created).getTime())}`;
  if (c.status === 'exited') return `Exited (${c.exitCode}) ${simdkAgo(Date.now() - new Date(c.finished || c.created).getTime())}`;
  if (c.status === 'paused') return `Up ${simdkDur(Date.now() - new Date(c.started).getTime())} (Paused)`;
  const h = c.health ? ` (${c.health === 'starting' ? 'health: starting' : c.health})` : '';
  return `Up ${simdkDur(Date.now() - new Date(c.started).getTime())}${h}`;
}
function simdkPortsText(c) {
  const out = [];
  for (const [key, b] of Object.entries(c.ports)) {
    if (!b) { if (c.status === 'running') out.push(key); continue; }
    if (c.status !== 'running') continue;
    const hp = b[0].HostPort; const [cp, proto] = key.split('/');
    out.push(`${b[0].HostIp}:${hp}->${cp}/${proto}`);
    if (b[0].HostIp === '0.0.0.0') out.push(`[::]:${hp}->${cp}/${proto}`);
  }
  return out.join(', ');
}
function simdkCmdText(c, st, full) {
  const img = st.images.find(i => i.id === c.imageId);
  const argv = simdkArgv(img, c);
  const s = argv.join(' ');
  if (full || s.length <= 20) return `"${s}"`;
  return `"${s.slice(0, 19)}…"`;
}
function simdkInspectContainer(st, c) {
  const img = st.images.find(i => i.id === c.imageId);
  const argv = simdkArgv(img, c);
  const networks = {};
  const net = simdkNet(st, c.network);
  networks[c.network] = { IPAMConfig: null, Links: null, Aliases: c.aliases && c.aliases.length ? c.aliases : null, MacAddress: c.status === 'running' ? '02:42:' + c.ip.split('.').map(x => ('0' + parseInt(x, 10).toString(16)).slice(-2)).join(':') : '', NetworkID: net ? net.id : '', EndpointID: c.status === 'running' ? simdkHash('ep' + c.id).slice(0, 64) : '', Gateway: c.status === 'running' ? c.gateway : '', IPAddress: c.status === 'running' ? c.ip : '', IPPrefixLen: c.status === 'running' ? 16 : 0, IPv6Gateway: '', GlobalIPv6Address: '', GlobalIPv6PrefixLen: 0, DNSNames: c.network !== 'bridge' ? [c.name, c.id.slice(0, 12)].concat(c.aliases || []) : null };
  const portsOut = {};
  Object.entries(c.ports).forEach(([k, b]) => { portsOut[k] = b && c.status === 'running' ? [{ HostIp: '0.0.0.0', HostPort: b[0].HostPort }, { HostIp: '::', HostPort: b[0].HostPort }] : null; });
  return {
    Id: c.id, Created: c.created, Path: argv[0] || '', Args: argv.slice(1),
    State: { Status: c.status, Running: c.status === 'running', Paused: c.status === 'paused', Restarting: c.status === 'restarting', OOMKilled: false, Dead: false, Pid: c.status === 'running' ? 4000 + parseInt(c.id.slice(0, 3), 16) % 900 : 0, ExitCode: c.exitCode, Error: '', StartedAt: c.started || '0001-01-01T00:00:00Z', FinishedAt: c.finished || '0001-01-01T00:00:00Z', Health: c.health ? { Status: c.health, FailingStreak: c.health === 'unhealthy' ? 3 : 0, Log: [] } : undefined },
    Image: 'sha256:' + c.imageId, ResolvConfPath: `/var/lib/docker/containers/${c.id}/resolv.conf`, HostnamePath: `/var/lib/docker/containers/${c.id}/hostname`, HostsPath: `/var/lib/docker/containers/${c.id}/hosts`, LogPath: `/var/lib/docker/containers/${c.id}/${c.id}-json.log`, Name: '/' + c.name, RestartCount: c.restartCount, Driver: 'overlay2', Platform: 'linux',
    HostConfig: { Binds: c.mounts.filter(m => m.Type === 'bind').map(m => `${m.Source}:${m.Destination}${m.Mode ? ':' + m.Mode : ''}`), NetworkMode: c.network, PortBindings: c.bindings, RestartPolicy: { Name: c.restart, MaximumRetryCount: /^on-failure:(\d+)/.test(c.restart) ? parseInt(c.restart.split(':')[1], 10) : 0 }, AutoRemove: c.rm, Privileged: false, Memory: 0, NanoCpus: 0, LogConfig: { Type: 'json-file', Config: {} } },
    Mounts: c.mounts,
    Config: { Hostname: c.hostname || c.id.slice(0, 12), Domainname: '', User: c.user || (img ? img.config.User : ''), AttachStdin: false, AttachStdout: !c.tty, AttachStderr: !c.tty, ExposedPorts: Object.keys(c.ports).reduce((o, k) => { o[k] = {}; return o; }, {}), Tty: c.tty, OpenStdin: c.interactive, StdinOnce: false, Env: Object.entries(simdkEnvList(img, c)).filter(([k]) => k !== 'HOSTNAME' && k !== 'HOME').map(([k, v]) => `${k}=${v}`), Cmd: c.cmd && c.cmd.length ? c.cmd : (img ? img.config.Cmd : null), Healthcheck: img && img.config.Healthcheck ? img.config.Healthcheck : undefined, Image: c.image, Volumes: null, WorkingDir: c.workdir || (img ? img.config.WorkingDir : ''), Entrypoint: c.entrypoint !== undefined ? c.entrypoint : (img ? img.config.Entrypoint : null), OnBuild: null, Labels: c.labels },
    NetworkSettings: { Bridge: '', SandboxID: simdkHash('sb' + c.id).slice(0, 64), SandboxKey: `/var/run/docker/netns/${simdkHash('sb' + c.id).slice(0, 12)}`, Ports: portsOut, HairpinMode: false, Gateway: c.status === 'running' && c.network === 'bridge' ? c.gateway : '', IPAddress: c.status === 'running' && c.network === 'bridge' ? c.ip : '', IPPrefixLen: c.status === 'running' && c.network === 'bridge' ? 16 : 0, MacAddress: c.status === 'running' && c.network === 'bridge' ? networks[c.network].MacAddress : '', Networks: networks },
  };
}
function simdkInspectImage(st, img) {
  return { Id: 'sha256:' + img.id, RepoTags: img.repoTags, RepoDigests: img.repoDigests || [], Parent: '', Comment: img.lab ? 'buildkit.dockerfile.v0' : '', Created: img.created, DockerVersion: img.lab ? '' : '27.3.1', Author: '', Config: { Hostname: '', Domainname: '', User: img.config.User || '', AttachStdin: false, AttachStdout: false, AttachStderr: false, ExposedPorts: Object.keys(img.config.ExposedPorts || {}).length ? img.config.ExposedPorts : undefined, Tty: false, OpenStdin: false, StdinOnce: false, Env: img.config.Env, Cmd: img.config.Cmd, Healthcheck: img.config.Healthcheck || undefined, ArgsEscaped: true, Image: '', Volumes: null, WorkingDir: img.config.WorkingDir || '', Entrypoint: img.config.Entrypoint, OnBuild: null, Labels: Object.keys(img.config.Labels || {}).length ? img.config.Labels : null }, Architecture: 'amd64', Os: 'linux', Size: img.size, GraphDriver: { Data: null, Name: 'overlay2' }, RootFS: { Type: 'layers', Layers: (img.layers || []).filter(l => l.size > 0).map(l => l.id) }, Metadata: { LastTagTime: img.created } };
}
/* --format '{{.State.ExitCode}}' benzeri go template taklidi */
function simdkFormat(tpl, obj) {
  const get = (path, o) => { let cur = o; for (const p of path.split('.').filter(Boolean)) { if (cur == null) return ''; cur = cur[p]; } return cur; };
  let out = tpl.replace(/\{\{\s*range\s+(\.[\w.]*)\s*\}\}([\s\S]*?)\{\{\s*end\s*\}\}/g, (m, path, body) => {
    const v = get(path, obj);
    const items = Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.entries(v).map(([k, x]) => Object.assign({ $key: k }, typeof x === 'object' ? x : { $value: x })) : []);
    return items.map(it => simdkFormat(body.replace(/\$key/g, '.$key'), it)).join('');
  });
  out = out.replace(/\{\{\s*json\s+(\.[\w.]*)\s*\}\}/g, (m, path) => JSON.stringify(path === '.' ? obj : get(path, obj)));
  const goVal = v => { if (v == null) return '<no value>'; if (Array.isArray(v)) return '[' + v.map(goVal).join(' ') + ']'; if (typeof v === 'object') return 'map[' + Object.entries(v).map(([k, x]) => `${k}:${goVal(x)}`).join(' ') + ']'; return String(v); };
  out = out.replace(/\{\{\s*(\.[\w.$]*)\s*\}\}/g, (m, path) => { const v = path === '.' ? obj : get(path, obj); return goVal(v); });
  out = out.replace(/\{\{\s*(?:index|printf|upper|lower|title)\b[^}]*\}\}/g, '');
  return out.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

/* ---------- CLI ---------- */
const SIMDK_USAGE = `
Usage:  docker [OPTIONS] COMMAND

A self-sufficient runtime for containers

Common Commands:
  run         Create and run a new container from an image
  exec        Execute a command in a running container
  ps          List containers
  build       Build an image from a Dockerfile
  pull        Download an image from a registry
  push        Upload an image to a registry
  images      List images
  login       Authenticate to a registry
  logout      Log out from a registry
  info        Display system-wide information

Management Commands:
  builder     Manage builds
  compose*    Docker Compose
  container   Manage containers
  image       Manage images
  network     Manage networks
  system      Manage Docker
  volume      Manage volumes

Commands:
  create      Create a new container
  history     Show the history of an image
  inspect     Return low-level information on Docker objects
  kill        Kill one or more running containers
  logs        Fetch the logs of a container
  port        List port mappings or a specific mapping for the container
  rename      Rename a container
  restart     Restart one or more containers
  rm          Remove one or more containers
  rmi         Remove one or more images
  start       Start one or more stopped containers
  stats       Display a live stream of container(s) resource usage statistics
  stop        Stop one or more running containers
  tag         Create a tag TARGET_IMAGE that refers to SOURCE_IMAGE
  top         Display the running processes of a container
  version     Show the Docker version information

Run 'docker COMMAND --help' for more information on a command.
`;
function simdkOpts(args, valued) {
  const flags = new Set(); const vals = {}; const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { rest.push(...args.slice(i + 1)); break; }
    if (a.startsWith('--')) { const eq = a.indexOf('='); const k = eq > 0 ? a.slice(2, eq) : a.slice(2); if (valued.includes(k)) { vals[k] = eq > 0 ? a.slice(eq + 1) : args[++i]; if (k === 'filter' || k === 'f') { vals.filters = (vals.filters || []).concat(vals[k]); } } else flags.add(k); continue; }
    if (a.startsWith('-') && a.length > 1) { for (let j = 1; j < a.length; j++) { const ch = a[j]; if (valued.includes(ch)) { vals[ch] = a.slice(j + 1) || args[++i]; if (ch === 'f') vals.filters = (vals.filters || []).concat(vals[ch]); break; } flags.add(ch); } continue; }
    rest.push(a);
  }
  return { flags, vals, rest, has: (...k) => k.some(x => flags.has(x)), val: (...k) => { for (const x of k) if (vals[x] !== undefined) return vals[x]; return undefined; } };
}
function simdkNoContainer(name, cmd) { return fail(cmd === 'inspect' ? `[]\nError: No such object: ${name}` : `Error response from daemon: No such container: ${name}`); }
function simdkFilterContainers(st, o) {
  let list = st.containers.slice().reverse();
  for (const f of (o.vals.filters || [])) {
    const [k, v] = f.split('=');
    if (k === 'name') list = list.filter(c => c.name.includes(v));
    else if (k === 'status') list = list.filter(c => c.status === v);
    else if (k === 'ancestor') list = list.filter(c => c.image === v || c.image.split(':')[0] === v || c.imageId.startsWith(v));
    else if (k === 'label') list = list.filter(c => v.includes('=') ? c.labels[v.split('=')[0]] === v.split('=')[1] : c.labels[v] !== undefined);
    else if (k === 'network') list = list.filter(c => c.network === v);
    else if (k === 'id') list = list.filter(c => c.id.startsWith(v));
    else if (k === 'exited') list = list.filter(c => c.status === 'exited' && String(c.exitCode) === v);
  }
  return list;
}
function simdkPsRows(st, list, o) {
  const noTrunc = o.has('no-trunc');
  const rows = [['CONTAINER ID', 'IMAGE', 'COMMAND', 'CREATED', 'STATUS', 'PORTS', 'NAMES']];
  if (o.has('s', 'size')) rows[0].push('SIZE');
  for (const c of list) { const r = [noTrunc ? c.id : c.id.slice(0, 12), c.image, simdkCmdText(c, st, noTrunc), simdkAgo(Date.now() - new Date(c.created).getTime()), simdkStatusText(c), simdkPortsText(c), c.name]; if (o.has('s', 'size')) r.push(`${simdkSize(c.logs.length * 120)} (virtual ${simdkSize((st.images.find(i => i.id === c.imageId) || { size: 0 }).size)})`); rows.push(r); }
  return rows;
}
function simdkPsFormatObj(st, c) { return { ID: c.id.slice(0, 12), Image: c.image, Command: simdkCmdText(c, st), CreatedAt: c.created, RunningFor: simdkAgo(Date.now() - new Date(c.created).getTime()), Status: simdkStatusText(c), State: c.status, Ports: simdkPortsText(c), Names: c.name, Labels: Object.entries(c.labels).map(([k, v]) => `${k}=${v}`).join(','), Networks: c.network, Mounts: c.mounts.map(m => m.Type === 'bind' ? m.Source : m.Name).join(',') }; }

function simdkRunCmd(sh, st, args, create) {
  let o;
  try { o = simdkParseRun(sh, args); } catch (e) { return fail(`docker: ${e.message}.\nSee 'docker ${create ? 'create' : 'run'} --help'.`, 125); }
  if (!o.image) return fail(`docker: 'docker ${create ? 'create' : 'run'}' requires at least 1 argument.\nSee 'docker ${create ? 'create' : 'run'} --help'.\n\nUsage:  docker ${create ? 'create' : 'run'} [OPTIONS] IMAGE [COMMAND] [ARG...]\n\n${create ? 'Create a new container' : 'Create and run a new container from an image'}`, 125);
  let out = ''; let err = '';
  if (o.name && st.containers.some(c => c.name === o.name)) { const ex = st.containers.find(c => c.name === o.name); return fail(`docker: Error response from daemon: Conflict. The container name "/${o.name}" is already in use by container "${ex.id}". You have to remove (or rename) that container to be able to reuse that name.\nSee 'docker ${create ? 'create' : 'run'} --help'.`, 125); }
  if (o.name && !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(o.name)) return fail(`docker: Error response from daemon: Invalid container name (${o.name}), only [a-zA-Z0-9][a-zA-Z0-9_.-] are allowed.\nSee 'docker run --help'.`, 125);
  if (o.network && !simdkNet(st, o.network) && o.network !== 'host' && o.network !== 'none') return fail(`docker: Error response from daemon: network ${o.network} not found.\nSee 'docker run --help'.`, 125);
  for (const p of o.ports) { const pp = simdkParsePort(p); if (!/^\d+(-\d+)?$/.test(pp.cont) || (pp.host !== null && !/^\d+(-\d+)?$/.test(pp.host))) return fail(`docker: Error response from daemon: invalid port specification: "${p}".\nSee 'docker run --help'.`, 125); }
  for (const v of o.volumes) { if (!v.includes(':') && /^[./]/.test(v)) continue; if (/^[^/.~$][^:]*:/.test(v) && !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*:/.test(v)) return fail(`docker: Error response from daemon: create ${v.split(':')[0]}: "${v.split(':')[0]}" includes invalid characters for a local volume name, only "[a-zA-Z0-9][a-zA-Z0-9_.-]" are allowed. If you intended to pass a host directory, use absolute path.\nSee 'docker run --help'.`, 125); }
  let img = simdkFindImage(st, o.image);
  if (!img) {
    const r = simdkRef(o.image);
    err += `Unable to find image '${r.repo}:${r.tag}' locally\n`;
    const p = simdkPull(sh, st, o.image);
    if (p.err) return { out: '', err: err + `docker: ${p.err}.\nSee 'docker run --help'.\n`, code: 125 };
    err += p.out; img = p.img;
  }
  const c = simdkCreate(sh, st, o, img);
  if (create) return { out: out + c.id + '\n', err, code: 0 };
  const e = simdkStart(sh, st, c);
  if (e) { if (/no command specified|executable file not found/.test(e)) { st.containers.splice(st.containers.indexOf(c), 1); } return { out, err: err + `docker: ${e}.\n`, code: 125 }; }
  if (o.detach) return { out: out + c.id + '\n', err, code: 0 };
  /* on planda */
  const logs = c.logs.map(l => ({ s: l.s, t: l.t }));
  const o2 = logs.filter(l => l.s === 'out').map(l => l.t + '\n').join('');
  const e2 = logs.filter(l => l.s === 'err').map(l => l.t + '\n').join('');
  if (c.longRunning) { err += e2; out += o2; err += `lab: container ${c.name} ön planda çalışıyor gibi görünür, burada arka planda kaldı. docker logs ${c.name}, docker stop ${c.name} kullan, bir dahaki sefere -d ile başlat\n`; return { out, err, code: 0 }; }
  if (c.rm && c.status === 'exited') st.containers.splice(st.containers.indexOf(c), 1);
  return { out: out + o2, err: err + e2, code: c.exitCode };
}

function simdkCompose(sh, st, args) {
  let gi = 0; while (gi < args.length && args[gi].startsWith('-')) { if (/^(-f|--file|-p|--project-name|--profile|--env-file|--project-directory)$/.test(args[gi])) gi++; gi++; }
  const o = simdkOpts(args.slice(0, gi), ['f', 'file', 'p', 'project-name', 'profile', 'env-file', 'project-directory']);
  const sub = args[gi]; const rest = args.slice(gi + 1);
  if (!sub || sub === 'help' || sub === '--help') return ok('\nUsage:  docker compose [OPTIONS] COMMAND\n\nDefine and run multi-container applications with Docker\n\nCommands:\n  build       Build or rebuild services\n  config      Parse, resolve and render compose file in canonical format\n  down        Stop and remove containers, networks\n  exec        Execute a command in a running container\n  logs        View output from containers\n  ps          List containers\n  pull        Pull service images\n  restart     Restart service containers\n  start       Start services\n  stop        Stop services\n  up          Create and start containers\n\nRun \'docker compose COMMAND --help\' for more information on a command.\n');
  if (sub === 'version') return ok('Docker Compose version v2.29.7\n');
  const names = ['compose.yaml', 'compose.yml', 'docker-compose.yml', 'docker-compose.yaml'];
  let file = o.val('f', 'file');
  if (!file) { let dir = sh.cwd; while (true) { const hit = names.find(n => { const nd = sh.node(dir + '/' + n); return nd && nd.t === 'f'; }); if (hit) { file = dir + '/' + hit; break; } if (dir === '/' || !dir) break; dir = dir.slice(0, dir.lastIndexOf('/')) || '/'; } }
  if (!file) return fail('no configuration file provided: not found');
  const abs = sh.resolve(file); const node = sh.node(abs);
  if (!node || node.t !== 'f') return fail(`open ${abs}: no such file or directory`);
  const dir = abs.slice(0, abs.lastIndexOf('/')) || '/';
  const proj = o.val('p', 'project-name') || (dir.slice(dir.lastIndexOf('/') + 1) || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  let cfg;
  try { cfg = jsyaml.load(node.d); } catch (e) { return fail(`yaml: ${e.message.split('\n')[0]}`); }
  if (!cfg || typeof cfg !== 'object' || !cfg.services || typeof cfg.services !== 'object') return fail(`validating ${abs}: services must be a mapping`);
  const envFile = sh.node(dir + '/.env'); const dotenv = {}; if (envFile && envFile.t === 'f') envFile.d.split('\n').forEach(l => { const m = /^\s*([\w]+)=(.*)$/.exec(l); if (m) dotenv[m[1]] = m[2].replace(/^"(.*)"$/, '$1'); });
  const subst = s => typeof s === 'string' ? s.replace(/\$\{(\w+)(?::-([^}]*))?\}|\$(\w+)/g, (m, a, d, b) => { const k = a || b; return dotenv[k] !== undefined ? dotenv[k] : (sh.env[k] !== undefined ? sh.env[k] : (d !== undefined ? d : '')); }) : s;
  const services = {};
  for (const [name, raw] of Object.entries(cfg.services)) {
    if (!raw || typeof raw !== 'object') return fail(`validating ${abs}: services.${name} must be a mapping`);
    const s = { name, image: subst(raw.image) || null, build: raw.build || null, ports: (raw.ports || []).map(p => typeof p === 'object' ? `${p.published}:${p.target}` : subst(String(p))), env: [], volumes: raw.volumes || [], depends: Array.isArray(raw.depends_on) ? raw.depends_on : Object.keys(raw.depends_on || {}), networks: Array.isArray(raw.networks) ? raw.networks : Object.keys(raw.networks || {}), healthcheck: raw.healthcheck || null, command: raw.command, container_name: raw.container_name, restart: raw.restart || 'no', profiles: raw.profiles || [] };
    if (Array.isArray(raw.environment)) s.env = raw.environment.map(subst); else if (raw.environment) s.env = Object.entries(raw.environment).map(([k, v]) => `${k}=${subst(v == null ? '' : String(v))}`);
    const ef = raw.env_file ? (Array.isArray(raw.env_file) ? raw.env_file : [raw.env_file]) : [];
    for (const f of ef) { const n = sh.node(sh.resolve(dir + '/' + f)); if (!n || n.t !== 'f') return fail(`env file ${sh.resolve(dir + '/' + f)} not found: stat ${sh.resolve(dir + '/' + f)}: no such file or directory`); n.d.split('\n').forEach(l => { l = l.trim(); if (l && !l.startsWith('#')) s.env.push(l); }); }
    if (!s.image && !s.build) return fail(`service "${name}" has neither an image nor a build context specified: invalid compose project`);
    if (s.profiles.length && !(o.vals.profile && s.profiles.includes(o.vals.profile))) continue;
    services[name] = s;
  }
  for (const s of Object.values(services)) for (const d of s.depends) if (!services[d]) return fail(`service "${s.name}" depends on undefined service "${d}": invalid compose project`);
  const order = []; const seen = new Set(); const visit = n => { if (seen.has(n)) return; seen.add(n); services[n].depends.forEach(visit); order.push(n); }; Object.keys(services).forEach(visit);
  const cname = s => s.container_name || `${proj}-${s.name}-1`;
  const netNames = s => (s.networks.length ? s.networks : ['default']).map(n => `${proj}_${n}`);
  const lines = []; const done = x => lines.push(` ✔ ${x}`);
  const pad = (a, b) => `${a.padEnd(Math.max(...lines.map(l => 0), 0))} ${b}`;
  if (sub === 'config') { const outCfg = { name: proj, services: {} }; for (const s of Object.values(services)) { const sv = {}; if (s.build) sv.build = typeof s.build === 'string' ? { context: sh.resolve(dir + '/' + s.build), dockerfile: 'Dockerfile' } : Object.assign({ context: sh.resolve(dir + '/' + (s.build.context || '.')), dockerfile: s.build.dockerfile || 'Dockerfile' }, s.build.target ? { target: s.build.target } : {}); if (s.command) sv.command = Array.isArray(s.command) ? s.command : simdkSplit(s.command); if (s.container_name) sv.container_name = s.container_name; if (s.depends.length) { sv.depends_on = {}; s.depends.forEach(d => { sv.depends_on[d] = { condition: 'service_started', required: true }; }); } if (s.env.length) { sv.environment = {}; s.env.forEach(e => { const i = e.indexOf('='); sv.environment[i > 0 ? e.slice(0, i) : e] = i > 0 ? e.slice(i + 1) : null; }); } if (s.healthcheck) sv.healthcheck = s.healthcheck; sv.image = s.image || `${proj}-${s.name}`; sv.networks = {}; (s.networks.length ? s.networks : ['default']).forEach(n => { sv.networks[n] = null; }); if (s.ports.length) sv.ports = s.ports.map(p => { const pp = simdkParsePort(p); return { mode: 'ingress', target: parseInt(pp.cont, 10), published: String(pp.host), protocol: pp.proto }; }); if (s.restart !== 'no') sv.restart = s.restart; if (s.volumes.length) sv.volumes = s.volumes.map(v => { const parts = String(v).split(':'); const src = parts[0]; const bind = /^[./~$]/.test(src); return { type: bind ? 'bind' : 'volume', source: bind ? sh.resolve(dir + '/' + src) : src, target: parts[1] || src, read_only: parts[2] === 'ro' ? true : undefined }; }); outCfg.services[s.name] = sv; } outCfg.networks = {}; const nets = new Set(); Object.values(services).forEach(s => (s.networks.length ? s.networks : ['default']).forEach(n => nets.add(n))); nets.forEach(n => { outCfg.networks[n] = { name: `${proj}_${n}` }; }); if (cfg.volumes) { outCfg.volumes = {}; Object.keys(cfg.volumes).forEach(v => { outCfg.volumes[v] = { name: `${proj}_${v}` }; }); } return ok(jsyaml.dump(outCfg, { lineWidth: 120, noRefs: true }).replace(/: null$/gm, ': null')); }
  const projContainers = () => st.containers.filter(c => c.compose && c.compose.project === proj);
  const buildService = s => {
    const b = typeof s.build === 'string' ? { context: s.build } : s.build;
    const r = simdkBuild(sh, st, { path: sh.resolve(dir + '/' + (b.context || '.')), file: b.dockerfile ? sh.resolve(dir + '/' + (b.context || '.') + '/' + b.dockerfile) : null, target: b.target || null, buildArgs: b.args || {}, tags: [s.image || `${proj}-${s.name}:latest`] });
    return r;
  };
  if (sub === 'build') { let out = ''; for (const n of order) { const s = services[n]; if (!s.build) continue; const r = buildService(s); if (r.code) return r; out += r.out; } return ok(out); }
  if (sub === 'up') {
    const up = simdkOpts(rest, ['scale', 'timeout']); const only = up.rest;
    let out = ''; const sel = order.filter(n => !only.length || only.includes(n) || only.some(x => services[x] && services[x].depends.includes(n)));
    for (const n of only) if (!services[n]) return fail(`no such service: ${n}`);
    for (const n of sel) { const s = services[n]; if (s.build && (up.has('build') || !simdkFindImage(st, s.image || `${proj}-${s.name}:latest`))) { const r = buildService(s); if (r.code) return r; out += r.out; } }
    const items = [];
    const nets = new Set(); sel.forEach(n => netNames(services[n]).forEach(x => nets.add(x)));
    for (const nn of nets) { if (!simdkNet(st, nn)) { st.networks.push({ id: simdkRand(64), name: nn, driver: 'bridge', scope: 'local', subnet: `172.${st.nextNet}.0.0/16`, gateway: `172.${st.nextNet}.0.1`, created: new Date().toISOString(), labels: { 'com.docker.compose.network': nn.slice(proj.length + 1), 'com.docker.compose.project': proj }, nextIp: 2 }); st.nextNet++; items.push(['Network', nn, 'Created']); } }
    for (const [vn] of Object.entries(cfg.volumes || {})) { if (!simdkVolume(st, `${proj}_${vn}`)) { simdkEnsureVolume(st, `${proj}_${vn}`).labels = { 'com.docker.compose.project': proj, 'com.docker.compose.volume': vn }; items.push(['Volume', `${proj}_${vn}`, 'Created']); } }
    for (const n of sel) {
      const s = services[n]; const name = cname(s); const imgRef = s.image || `${proj}-${s.name}:latest`;
      let img = simdkFindImage(st, imgRef);
      if (!img) { const p = simdkPull(sh, st, imgRef); if (p.err) return { out, err: `Error response from daemon: ${p.err.replace(/^Error response from daemon: /, '')}\n`, code: 1 }; out += p.out; img = p.img; }
      const vols = s.volumes.map(v => { const parts = String(v).split(':'); if (/^[./~$]/.test(parts[0])) parts[0] = sh.resolve(dir + '/' + parts[0]); else if (cfg.volumes && cfg.volumes[parts[0]] !== undefined) parts[0] = `${proj}_${parts[0]}`; return parts.join(':'); });
      const ropts = { detach: true, name, ports: s.ports, env: s.env, volumes: vols, network: netNames(s)[0], rm: false, tty: false, interactive: false, restart: s.restart, workdir: null, user: null, hostname: null, entrypoint: undefined, labels: { 'com.docker.compose.project': proj, 'com.docker.compose.service': s.name, 'com.docker.compose.container-number': '1', 'com.docker.compose.project.config_files': abs, 'com.docker.compose.project.working_dir': dir }, image: imgRef, cmd: s.command ? (Array.isArray(s.command) ? s.command : simdkSplit(s.command)) : [] };
      const sig = JSON.stringify([ropts.ports, ropts.env, ropts.volumes, ropts.cmd, img.id, ropts.network]);
      const ex = st.containers.find(c => c.name === name);
      if (ex && ex.compose && ex.compose.sig === sig && ex.status === 'running') { items.push(['Container', name, 'Running']); continue; }
      if (ex && ex.compose && ex.compose.sig === sig) { const e = simdkStart(sh, st, ex); if (e) return { out, err: e + '\n', code: 1 }; items.push(['Container', name, 'Started']); continue; }
      if (ex && !ex.compose) return { out, err: `Error response from daemon: Conflict. The container name "/${name}" is already in use by container "${ex.id}". You have to remove (or rename) that container to be able to reuse that name\n`, code: 1 };
      if (ex) { st.containers.splice(st.containers.indexOf(ex), 1); items.push(['Container', name, 'Recreated']); } else items.push(['Container', name, 'Created']);
      const c = simdkCreate(sh, st, ropts, img, { aliases: [s.name], compose: { project: proj, service: s.name, sig, file: abs } });
      c.networks = netNames(s);
      const e = simdkStart(sh, st, c);
      if (e) return { out, err: e + '\n', code: 1 };
      items[items.length - 1][2] = items[items.length - 1][2] === 'Recreated' ? 'Started' : 'Started';
      if (s.healthcheck && s.healthcheck.test) { c.healthTick = st.tick; c.health = 'starting'; }
    }
    const w = Math.max(...items.map(i => (i[0] + ' ' + i[1]).length));
    out += `[+] Running ${items.length}/${items.length}\n` + items.map(i => ` ✔ ${(i[0] + ' ' + i[1]).padEnd(w)}  ${i[2].padEnd(9)} ${(0.1 + Math.random() * 0.6).toFixed(1)}s`).join('\n') + '\n';
    if (!up.has('d', 'detach')) out += 'lab: compose up ön planda log akışı simüle edilmiyor, servisler arka planda çalışıyor. docker compose logs ile bak, bir dahaki sefere -d kullan\n';
    const failed = projContainers().filter(c => c.status === 'exited' && c.exitCode !== 0);
    if (failed.length) out += failed.map(c => `container ${c.name} exited (${c.exitCode})`).join('\n') + '\n';
    return ok(out);
  }
  if (sub === 'down') {
    const dn = simdkOpts(rest, ['timeout']);
    const items = [];
    for (const c of projContainers().slice().reverse()) { simdkStop(st, c); st.containers.splice(st.containers.indexOf(c), 1); items.push(['Container', c.name, 'Removed']); }
    for (const n of st.networks.slice()) { if (n.labels && n.labels['com.docker.compose.project'] === proj && !st.containers.some(c => c.network === n.name)) { st.networks.splice(st.networks.indexOf(n), 1); items.push(['Network', n.name, 'Removed']); } }
    if (dn.has('v', 'volumes')) for (const v of st.volumes.slice()) { if (v.labels && v.labels['com.docker.compose.project'] === proj) { st.volumes.splice(st.volumes.indexOf(v), 1); items.push(['Volume', v.name, 'Removed']); } }
    if (dn.has('rmi')) { for (const s of Object.values(services)) { const img = simdkFindImage(st, s.image || `${proj}-${s.name}:latest`); if (img && !st.containers.some(c => c.imageId === img.id)) { st.images.splice(st.images.indexOf(img), 1); items.push(['Image', s.image || `${proj}-${s.name}:latest`, 'Removed']); } } }
    if (!items.length) return ok('');
    const w = Math.max(...items.map(i => (i[0] + ' ' + i[1]).length));
    return ok(`[+] Running ${items.length}/${items.length}\n` + items.map(i => ` ✔ ${(i[0] + ' ' + i[1]).padEnd(w)}  ${i[2].padEnd(9)} ${(0.1 + Math.random() * 0.6).toFixed(1)}s`).join('\n') + '\n');
  }
  if (sub === 'ps') {
    const ps = simdkOpts(rest, ['format', 'filter']);
    const list = projContainers().filter(c => ps.has('a', 'all') || c.status === 'running');
    if (ps.has('q', 'quiet')) return ok(list.map(c => c.id).join('\n') + (list.length ? '\n' : ''));
    const rows = [['NAME', 'IMAGE', 'COMMAND', 'SERVICE', 'CREATED', 'STATUS', 'PORTS']];
    list.forEach(c => rows.push([c.name, c.image, simdkCmdText(c, st), c.compose.service, simdkAgo(Date.now() - new Date(c.created).getTime()), simdkStatusText(c), simdkPortsText(c)]));
    return ok(simdkTable(rows));
  }
  if (sub === 'logs') {
    const lg = simdkOpts(rest, ['tail', 'n', 'since', 'until']);
    const list = projContainers().filter(c => !lg.rest.length || lg.rest.includes(c.compose.service));
    for (const n of lg.rest) if (!services[n]) return fail(`no such service: ${n}`);
    const w = Math.max(0, ...list.map(c => c.name.length));
    let out = '';
    list.forEach(c => { let logs = c.logs; const t = lg.val('tail', 'n'); if (t && t !== 'all') logs = logs.slice(-parseInt(t, 10)); logs.forEach(l => { out += `${c.name.padEnd(w)}  | ${l.t}\n`; }); });
    st.audit.logs.push(...list.map(c => c.name));
    if (lg.has('f', 'follow')) out += 'lab: canlı log takibi simüle edilmiyor, son loglar gösterildi\n';
    return ok(out);
  }
  if (sub === 'stop' || sub === 'start' || sub === 'restart' || sub === 'kill' || sub === 'rm') {
    const list = projContainers().filter(c => !rest.filter(x => !x.startsWith('-')).length || rest.includes(c.compose.service));
    const items = [];
    for (const c of (sub === 'start' ? list : list.slice().reverse())) {
      if (sub === 'stop' || sub === 'kill') { if (c.status === 'running') { c.stoppedByUser = true; simdkStop(st, c, sub === 'kill' ? 'KILL' : null); items.push(['Container', c.name, sub === 'kill' ? 'Killed' : 'Stopped']); } }
      else if (sub === 'start') { if (c.status !== 'running') { const e = simdkStart(sh, st, c); if (e) return fail(e); items.push(['Container', c.name, 'Started']); } }
      else if (sub === 'restart') { simdkStop(st, c); const e = simdkStart(sh, st, c); if (e) return fail(e); items.push(['Container', c.name, 'Started']); }
      else if (sub === 'rm') { if (c.status === 'running' && !rest.includes('-f') && !rest.includes('-s')) continue; simdkStop(st, c); st.containers.splice(st.containers.indexOf(c), 1); items.push(['Container', c.name, 'Removed']); }
    }
    if (!items.length) return ok('');
    const w = Math.max(...items.map(i => (i[0] + ' ' + i[1]).length));
    return ok(`[+] ${sub === 'start' ? 'Running' : (sub === 'restart' ? 'Restarting' : (sub === 'rm' ? 'Removing' : 'Stopping'))} ${items.length}/${items.length}\n` + items.map(i => ` ✔ ${(i[0] + ' ' + i[1]).padEnd(w)}  ${i[2].padEnd(9)} ${(0.1 + Math.random() * 0.6).toFixed(1)}s`).join('\n') + '\n');
  }
  if (sub === 'exec' || sub === 'run') {
    const ex = simdkOpts(rest, ['e', 'env', 'w', 'workdir', 'u', 'user']);
    const svc = ex.rest[0]; const cmd = ex.rest.slice(1);
    if (!svc || !services[svc]) return fail(`service "${svc || ''}" is not running`);
    const c = st.containers.find(x => x.compose && x.compose.project === proj && x.compose.service === svc);
    if (sub === 'exec') { if (!c || c.status !== 'running') return fail(`service "${svc}" is not running container #1`); if (!cmd.length) return fail('docker compose exec: requires a command'); const r = simdkExecIn(sh, st, c, st.images.find(i => i.id === c.imageId), cmd); st.audit.exec.push(c.name); return r; }
    const s = services[svc]; const img = simdkFindImage(st, s.image || `${proj}-${s.name}:latest`);
    if (!img) return fail(`Error response from daemon: No such image: ${s.image || `${proj}-${s.name}:latest`}`);
    const tmp = simdkCreate(sh, st, { detach: false, name: `${proj}-${svc}-run-${simdkRand(12)}`, ports: [], env: s.env, volumes: [], network: netNames(s)[0], rm: true, tty: false, interactive: false, restart: 'no', entrypoint: undefined, labels: {}, image: s.image || `${proj}-${s.name}:latest`, cmd }, img, { aliases: [], compose: { project: proj, service: svc, sig: 'run' } });
    const e = simdkStart(sh, st, tmp); if (e) return fail(e);
    const out = tmp.logs.filter(l => l.s === 'out').map(l => l.t + '\n').join(''); const err = tmp.logs.filter(l => l.s === 'err').map(l => l.t + '\n').join('');
    if (!tmp.longRunning) st.containers.splice(st.containers.indexOf(tmp), 1);
    return { out, err, code: tmp.exitCode || 0 };
  }
  if (sub === 'pull') { let out = ''; for (const s of Object.values(services)) { if (!s.image) continue; const p = simdkPull(sh, st, s.image); if (p.err) return fail(p.err); out += ` ✔ ${s.name} Pulled\n`; } return ok(`[+] Pulling ${Object.values(services).filter(s => s.image).length}/${Object.values(services).filter(s => s.image).length}\n` + out); }
  if (sub === 'images') { const rows = [['CONTAINER', 'REPOSITORY', 'TAG', 'IMAGE ID', 'SIZE']]; projContainers().forEach(c => { const img = st.images.find(i => i.id === c.imageId); const [repo, tag] = c.image.split(':'); rows.push([c.name, repo, tag || 'latest', c.imageId.slice(0, 12), simdkSize(img ? img.size : 0)]); }); return ok(simdkTable(rows)); }
  if (sub === 'top') { let out = ''; projContainers().filter(c => c.status === 'running').forEach(c => { out += `${c.name}\nUID   PID    PPID   C    STIME   TTY   TIME       CMD\nroot  ${4000 + parseInt(c.id.slice(0, 3), 16) % 900}   ${3990}   0    08:00   ?     00:00:00   ${simdkArgv(st.images.find(i => i.id === c.imageId), c).join(' ')}\n\n`; }); return ok(out); }
  if (sub === 'ls') { const projs = new Set(st.containers.filter(c => c.compose).map(c => c.compose.project)); const rows = [['NAME', 'STATUS', 'CONFIG FILES']]; projs.forEach(p => { const cs = st.containers.filter(c => c.compose && c.compose.project === p); rows.push([p, `running(${cs.filter(c => c.status === 'running').length})`, cs[0].compose.file || abs]); }); return ok(simdkTable(rows)); }
  return fail(`unknown docker command: "compose ${sub}"`);
}

function simdkCommand(args, stdin) {
  const sh = this; SIMDK_lastSh = sh;
  args = args.flatMap(a => /\n/.test(a) ? a.split(/\s+/).filter(Boolean) : [a]);
  const st = SIMDK_load(sh);
  simdkTick(sh, st);
  let r;
  try { r = simdkDispatch(sh, st, args, stdin); } catch (e) { r = fail(`docker: lab iç hata, ${e.message}`); if (typeof console !== 'undefined' && console.error) console.error(e); }
  SIMDK_save(sh, st);
  return r || ok();
}
function simdkDispatch(sh, st, args, stdin) {
  let sub = args[0]; let rest = args.slice(1);
  if (!sub || sub === '--help' || sub === 'help') return ok(SIMDK_USAGE);
  if (sub === '--version' || sub === '-v') return ok('Docker version 27.3.1, build ce12230\n');
  /* yonetim komutlari */
  if (sub === 'container') { sub = rest[0]; rest = rest.slice(1); if (sub === 'ls' || sub === 'list') sub = 'ps'; if (sub === 'prune') sub = 'container-prune'; }
  else if (sub === 'image') { sub = rest[0]; rest = rest.slice(1); if (sub === 'ls' || sub === 'list') sub = 'images'; else if (sub === 'rm' || sub === 'remove') sub = 'rmi'; else if (sub === 'prune') sub = 'image-prune'; }
  else if (sub === 'builder') { if (rest[0] === 'prune') sub = 'builder-prune'; else if (rest[0] === 'build') { sub = 'build'; rest = rest.slice(1); } }
  else if (sub === 'buildx') { if (rest[0] === 'build') { sub = 'build'; rest = rest.slice(1); } else return ok('github.com/docker/buildx v0.17.1\n'); }
  if (!sub) return ok(SIMDK_USAGE);
  const C = simdkCont.bind(null, st);
  switch (sub) {
    case 'version': return ok(`Client: Docker Engine - Community\n Version:           27.3.1\n API version:       1.47\n Go version:        go1.22.7\n Git commit:        ce12230\n Built:             Fri Sep 20 11:41:00 2024\n OS/Arch:           linux/amd64\n Context:           default\n\nServer: Docker Engine - Community\n Engine:\n  Version:          27.3.1\n  API version:      1.47 (minimum version 1.24)\n  Go version:       go1.22.7\n  Git commit:       41ca978\n  Built:            Fri Sep 20 11:41:00 2024\n  OS/Arch:          linux/amd64\n  Experimental:     false\n containerd:\n  Version:          1.7.22\n  GitCommit:        7f7fdf5fed64eb6a7caf99b3e12efcf9d60e311c\n runc:\n  Version:          1.1.14\n  GitCommit:        v1.1.14-0-g2c9f560\n docker-init:\n  Version:          0.19.0\n  GitCommit:        de40ad0\n`);
    case 'info': { const run = st.containers.filter(c => c.status === 'running').length; const stopped = st.containers.filter(c => c.status !== 'running').length; return ok(`Client: Docker Engine - Community\n Version:    27.3.1\n Context:    default\n Debug Mode: false\n Plugins:\n  buildx: Docker Buildx (Docker Inc.)\n    Version:  v0.17.1\n    Path:     /usr/libexec/docker/cli-plugins/docker-buildx\n  compose: Docker Compose (Docker Inc.)\n    Version:  v2.29.7\n    Path:     /usr/libexec/docker/cli-plugins/docker-compose\n\nServer:\n Containers: ${st.containers.length}\n  Running: ${run}\n  Paused: 0\n  Stopped: ${stopped}\n Images: ${st.images.length}\n Server Version: 27.3.1\n Storage Driver: overlay2\n  Backing Filesystem: extfs\n  Supports d_type: true\n  Using metacopy: false\n  Native Overlay Diff: true\n  userxattr: false\n Logging Driver: json-file\n Cgroup Driver: systemd\n Cgroup Version: 2\n Plugins:\n  Volume: local\n  Network: bridge host ipvlan macvlan null overlay\n  Log: awslogs fluentd gcplogs gelf journald json-file local splunk syslog\n Swarm: inactive\n Runtimes: io.containerd.runc.v2 runc\n Default Runtime: runc\n Init Binary: docker-init\n containerd version: 7f7fdf5fed64eb6a7caf99b3e12efcf9d60e311c\n runc version: v1.1.14-0-g2c9f560\n init version: de40ad0\n Security Options:\n  apparmor\n  seccomp\n   Profile: builtin\n  cgroupns\n Kernel Version: 6.8.0-45-generic\n Operating System: Ubuntu 24.04.1 LTS\n OSType: linux\n Architecture: x86_64\n CPUs: 4\n Total Memory: 7.75GiB\n Name: linuxlab\n ID: ${simdkHash('engine').slice(0, 8)}-${simdkHash('engine').slice(8, 12)}-${simdkHash('engine').slice(12, 16)}\n Docker Root Dir: /var/lib/docker\n Debug Mode: false\n Experimental: false\n Insecure Registries:\n  registry.lab\n  127.0.0.0/8\n Live Restore Enabled: false\n`); }
    case 'build': {
      const o = simdkOpts(rest, ['t', 'tag', 'f', 'file', 'target', 'build-arg', 'platform', 'progress', 'cache-from', 'label', 'network', 'secret', 'ssh']);
      const tags = []; const bargs = {};
      for (let i = 0; i < rest.length; i++) { const a = rest[i]; if (a === '-t' || a === '--tag') tags.push(rest[++i]); else if (a.startsWith('--tag=')) tags.push(a.slice(6)); else if (a === '--build-arg') { const v = rest[++i] || ''; const k = v.indexOf('='); bargs[k > 0 ? v.slice(0, k) : v] = k > 0 ? v.slice(k + 1) : (sh.env[v] || ''); } else if (a.startsWith('--build-arg=')) { const v = a.slice(12); const k = v.indexOf('='); bargs[k > 0 ? v.slice(0, k) : v] = k > 0 ? v.slice(k + 1) : (sh.env[v] || ''); } }
      const path = o.rest[0];
      if (!path) return fail('ERROR: "docker buildx build" requires exactly 1 argument.\nSee \'docker buildx build --help\'.\n\nUsage:  docker buildx build [OPTIONS] PATH | URL | -');
      for (const t of tags) { const tr = simdkRef(t); if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)*$/.test(tr.repo) || !/^[\w][\w.-]{0,127}$/.test(tr.tag)) return fail(`ERROR: invalid tag "${t}": ${/[A-Z]/.test(tr.repo) ? 'repository name must be lowercase' : 'invalid reference format'}`); }
      return simdkBuild(sh, st, { path, file: o.val('f', 'file'), target: o.val('target'), buildArgs: bargs, tags, noCache: o.has('no-cache'), quiet: o.has('q', 'quiet') });
    }
    case 'images': {
      const o = simdkOpts(rest, ['filter', 'f', 'format']);
      let list = st.images.slice().sort((a, b) => new Date(b.created) - new Date(a.created));
      const filterRepo = o.rest[0];
      if (filterRepo) { const fr = simdkRef(filterRepo); list = list.filter(i => i.repoTags.some(t => filterRepo.includes(':') ? t === `${fr.repo}:${fr.tag}` : t.split(':')[0] === fr.repo)); }
      for (const f of (o.vals.filters || [])) { const [k, v] = f.split('='); if (k === 'dangling') list = list.filter(i => (v === 'true') === !i.repoTags.length); if (k === 'reference') list = list.filter(i => i.repoTags.some(t => t.split(':')[0] === v.split(':')[0])); }
      if (o.has('q', 'quiet')) return ok([...new Set(list.map(i => i.id.slice(0, 12)))].join('\n') + (list.length ? '\n' : ''));
      const rows = [['REPOSITORY', 'TAG', 'IMAGE ID', 'CREATED', 'SIZE']];
      if (o.has('digests')) rows[0].splice(2, 0, 'DIGEST');
      for (const i of list) { const tags = i.repoTags.length ? i.repoTags : ['<none>:<none>']; for (const t of tags) { const ci = t.lastIndexOf(':'); const row = [t.slice(0, ci), t.slice(ci + 1), i.id.slice(0, 12), simdkAgo(Date.now() - new Date(i.pulled && !i.lab ? i.created : i.created).getTime()), simdkSize(i.size)]; if (o.has('digests')) row.splice(2, 0, i.digest || '<none>'); if (o.vals.format) { const obj = { Repository: row[0], Tag: row[1], ID: i.id.slice(0, 12), CreatedSince: row[3], Size: simdkSize(i.size), Digest: i.digest }; rows.push([simdkFormat(o.vals.format, obj)]); } else rows.push(row); } }
      if (o.vals.format) return ok(rows.slice(1).map(r => r[0]).join('\n') + (rows.length > 1 ? '\n' : ''));
      return ok(simdkTable(rows));
    }
    case 'rmi': {
      const o = simdkOpts(rest, []);
      if (!o.rest.length) return fail('"docker rmi" requires at least 1 argument.\nSee \'docker rmi --help\'.\n\nUsage:  docker rmi [OPTIONS] IMAGE [IMAGE...]\n\nRemove one or more images');
      let out = ''; let err = '';
      for (const ref of o.rest) {
        const img = simdkFindImage(st, ref);
        if (!img) { err += `Error response from daemon: No such image: ${/^[0-9a-f]{3,}$/.test(ref) ? ref : (() => { const r = simdkRef(ref); return `${r.repo}:${r.tag}`; })()}\n`; continue; }
        const users = st.containers.filter(c => c.imageId === img.id);
        const byId = /^(sha256:)?[0-9a-f]{3,64}$/.test(ref) && !img.repoTags.includes(ref);
        if (users.length && !o.has('f', 'force')) { const u = users[0]; if (byId) err += `Error response from daemon: conflict: unable to delete ${img.id.slice(0, 12)} (cannot be forced) - image is being used by running container ${u.id.slice(0, 12)}\n`; else { const r = simdkRef(ref); err += u.status === 'running' ? `Error response from daemon: conflict: unable to remove repository reference "${r.repo}:${r.tag}" (must force) - container ${u.id.slice(0, 12)} is using its referenced image ${img.id.slice(0, 12)}\n` : `Error response from daemon: conflict: unable to remove repository reference "${r.repo}:${r.tag}" (must force) - container ${u.id.slice(0, 12)} is using its referenced image ${img.id.slice(0, 12)}\n`; } continue; }
        if (users.some(c => c.status === 'running') && o.has('f', 'force')) { err += `Error response from daemon: conflict: unable to delete ${img.id.slice(0, 12)} (cannot be forced) - image is being used by running container ${users.find(c => c.status === 'running').id.slice(0, 12)}\n`; continue; }
        if (byId && img.repoTags.length > 1 && !o.has('f', 'force')) { err += `Error response from daemon: conflict: unable to delete ${img.id.slice(0, 12)} (must be forced) - image is referenced in multiple repositories\n`; continue; }
        if (!byId && img.repoTags.length > 1) { const r = simdkRef(ref); img.repoTags = img.repoTags.filter(t => t !== `${r.repo}:${r.tag}`); out += `Untagged: ${r.repo}:${r.tag}\n`; continue; }
        img.repoTags.forEach(t => { out += `Untagged: ${t}\n`; if (img.public || img.pulled) out += `Untagged: ${t.split(':')[0]}@${img.digest}\n`; });
        out += `Deleted: sha256:${img.id}\n`;
        (img.layers || []).filter(l => l.size > 0 && !l.cached).slice(-3).forEach(l => { out += `Deleted: ${l.id}\n`; });
        if (o.has('f', 'force')) users.forEach(u => { st.containers.splice(st.containers.indexOf(u), 1); });
        st.images.splice(st.images.indexOf(img), 1);
      }
      return { out, err, code: err ? 1 : 0 };
    }
    case 'history': {
      const o = simdkOpts(rest, ['format']);
      const img = simdkFindImage(st, o.rest[0]);
      if (!img) return fail(`Error response from daemon: No such image: ${o.rest[0] || ''}`);
      const rows = [['IMAGE', 'CREATED', 'CREATED BY', 'SIZE', 'COMMENT']];
      const layers = img.layers || [];
      const meta = [];
      if (img.lab) { const df = simdkParseDockerfile(img.dockerfile || '').inst; const metaOps = df.filter(x => !['FROM', 'RUN', 'COPY', 'ADD', 'WORKDIR', 'ARG'].includes(x.op)).reverse(); metaOps.forEach(m => meta.push([img.id.slice(0, 12), simdkAgo(Date.now() - new Date(img.created).getTime()), m.raw.length > 45 && !o.has('no-trunc') ? m.raw.slice(0, 42) + '…' : m.raw, '0B', 'buildkit.dockerfile.v0'])); }
      meta.forEach(m => rows.push(m));
      layers.slice().reverse().forEach((l, k) => { const own = img.lab && k < layers.length - (img.layers.length - (img.layers.filter(x => x.createdBy && !/^(ADD file|CMD|RUN \/bin\/sh -c #\(nop\))/.test(x.createdBy)).length)); const by = l.createdBy || ''; rows.push([own || (k === 0 && img.lab) ? img.id.slice(0, 12) : '<missing>', simdkAgo(Date.now() - new Date(own || (k === 0 && img.lab) || !img.baseCreated ? img.created : img.baseCreated).getTime()), by.length > 45 && !o.has('no-trunc') ? by.slice(0, 42) + '…' : by, simdkSize(l.size), own ? 'buildkit.dockerfile.v0' : '']); });
      return ok(simdkTable(rows));
    }
    case 'tag': {
      if (rest.length !== 2) return fail('"docker tag" requires exactly 2 arguments.\nSee \'docker tag --help\'.\n\nUsage:  docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]\n\nCreate a tag TARGET_IMAGE that refers to SOURCE_IMAGE');
      const img = simdkFindImage(st, rest[0]);
      if (!img) { const r = simdkRef(rest[0]); return fail(`Error response from daemon: No such image: ${r.repo}:${r.tag}`); }
      const t = simdkRef(rest[1]);
      if (/[A-Z]/.test(t.repo)) return fail(`Error parsing reference: "${rest[1]}" is not a valid repository/tag: repository name must be lowercase`);
      const key = `${t.repo}:${t.tag}`;
      st.images.forEach(i => { if (i !== img) i.repoTags = i.repoTags.filter(x => x !== key); });
      if (!img.repoTags.includes(key)) img.repoTags.push(key);
      return ok();
    }
    case 'pull': {
      const o = simdkOpts(rest, ['platform']);
      if (!o.rest[0]) return fail('"docker pull" requires exactly 1 argument.\nSee \'docker pull --help\'.\n\nUsage:  docker pull [OPTIONS] NAME[:TAG|@DIGEST]\n\nDownload an image from a registry');
      const ref = o.rest[0]; const r = simdkRef(ref);
      let pre = '';
      if (!/:[^/]+$/.test(ref)) pre = 'Using default tag: latest\n';
      const p = simdkPull(sh, st, ref);
      if (p.err) return { out: pre, err: p.err + '\n', code: 1 };
      void r;
      return ok(pre + p.out);
    }
    case 'push': {
      const o = simdkOpts(rest, []);
      if (!o.rest[0]) return fail('"docker push" requires exactly 1 argument.\nSee \'docker push --help\'.\n\nUsage:  docker push [OPTIONS] NAME[:TAG]\n\nUpload an image to a registry');
      const r = simdkRef(o.rest[0]);
      const key = `${r.repo}:${r.tag}`;
      let pre = /:[^/]+$/.test(o.rest[0]) ? '' : 'Using default tag: latest\n';
      const img = simdkFindImage(st, key);
      const head = `The push refers to repository [${r.registry === 'docker.io' ? r.full : `${r.registry}/${r.path}`}]\n`;
      if (!img) return { out: '', err: pre + head + `An image does not exist locally with the tag: ${r.registry === 'docker.io' ? r.repo : `${r.registry}/${r.path}`}\n`, code: 1 };
      if (r.registry === 'docker.io') return { out: '', err: pre + head + (st.auth['docker.io'] ? `denied: requested access to the resource is denied\n` : `denied: requested access to the resource is denied\n💡 Bu lab'da Docker Hub'a push yok, imajı registry.lab/${r.repo.replace(/^library\//, '')}:${r.tag} olarak tag'le ve oraya push et\n`), code: 1 };
      if (r.registry !== SIMDK_REGISTRY) return { out: '', err: pre + head + `Get "https://${r.registry}/v2/": dial tcp: lookup ${r.registry}: no such host\n`, code: 1 };
      if (!st.auth[SIMDK_REGISTRY]) return { out: '', err: pre + head + `no basic auth credentials\n💡 Önce docker login registry.lab -u burak -p <parola>\n`, code: 1 };
      const layers = (img.layers || []).filter(l => l.size > 0);
      const already = st.registry[key] && st.registry[key].id === img.id;
      const pushedBefore = Object.values(st.registry).some(x => x.id === img.id);
      let out = pre + head;
      layers.slice().reverse().forEach(l => { out += `${l.id.slice(7, 19)}: ${already || pushedBefore ? 'Layer already exists' : (l.cached && Math.random() < 0.3 ? 'Layer already exists' : 'Pushed')}\n`; });
      const rec = JSON.parse(JSON.stringify(img)); rec.repoTags = [key]; rec.pushed = new Date().toISOString(); rec.repoDigests = [`${r.repo}@${img.digest}`];
      st.registry[key] = rec;
      if (!img.repoDigests) img.repoDigests = []; if (!img.repoDigests.includes(`${r.repo}@${img.digest}`)) img.repoDigests.push(`${r.repo}@${img.digest}`);
      out += `${r.tag}: digest: ${img.digest} size: ${1200 + layers.length * 230}\n`;
      return ok(out);
    }
    case 'login': {
      const o = simdkOpts(rest, ['u', 'username', 'p', 'password']);
      const reg = o.rest[0] || 'docker.io';
      let user = o.val('u', 'username'); let pass = o.val('p', 'password');
      if (o.has('password-stdin')) pass = (stdin || '').trim();
      if (!user) return fail(`Error: Cannot perform an interactive login from a non TTY device\n💡 docker login ${reg} -u burak --password-stdin ya da -p ile parola ver`);
      if (!pass) return fail('Error: Cannot perform an interactive login from a non TTY device');
      if (reg !== SIMDK_REGISTRY && reg !== 'docker.io' && !reg.startsWith('registry.lab')) return fail(`Error response from daemon: Get "https://${reg}/v2/": dial tcp: lookup ${reg}: no such host`);
      if (reg === 'docker.io') return fail('Error response from daemon: Get "https://registry-1.docker.io/v2/": dial tcp: lookup registry-1.docker.io: no such host\n💡 Bu lab çevrimdışı, registry.lab kullan');
      if (pass.length < 4) return fail('Error response from daemon: login attempt to https://registry.lab/v2/ failed with status: 401 Unauthorized');
      st.auth[SIMDK_REGISTRY] = user;
      return ok((o.val('p', 'password') ? 'WARNING! Using --password via the CLI is insecure. Use --password-stdin.\n' : '') + '\nWARNING! Your credentials are stored unencrypted in \'/home/burak/.docker/config.json\'.\nConfigure a credential helper to remove this warning. See\nhttps://docs.docker.com/go/credential-store/\n\nLogin Succeeded\n');
    }
    case 'logout': { const reg = rest[0] || 'docker.io'; if (!st.auth[reg]) return ok(`Not logged in to ${reg}\n`); delete st.auth[reg]; return ok(`Removing login credentials for ${reg}\n`); }
    case 'run': return simdkRunCmd(sh, st, rest, false);
    case 'create': return simdkRunCmd(sh, st, rest, true);
    case 'ps': {
      const o = simdkOpts(rest, ['filter', 'f', 'format', 'n', 'last']);
      let list = simdkFilterContainers(st, o);
      if (!o.has('a', 'all') && !o.vals.n && !o.has('l', 'latest')) list = list.filter(c => c.status === 'running' || c.status === 'restarting' || c.status === 'paused');
      if (o.has('l', 'latest')) list = list.slice(0, 1);
      if (o.vals.n) list = list.slice(0, parseInt(o.vals.n, 10));
      if (o.has('q', 'quiet')) return ok(list.map(c => o.has('no-trunc') ? c.id : c.id.slice(0, 12)).join('\n') + (list.length ? '\n' : ''));
      if (o.vals.format) { if (o.vals.format === 'json') return ok(list.map(c => JSON.stringify(simdkPsFormatObj(st, c))).join('\n') + (list.length ? '\n' : '')); const tpl = o.vals.format.replace(/^table\s+/, '').replace(/\\t/g, '\t'); const isTable = o.vals.format.startsWith('table '); const rows = list.map(c => simdkFormat(tpl, simdkPsFormatObj(st, c))); if (isTable) { const hdr = tpl.replace(/\{\{\s*\.(\w+)\s*\}\}/g, (m, k) => ({ ID: 'CONTAINER ID', Names: 'NAMES', Image: 'IMAGE', Status: 'STATUS', Ports: 'PORTS', Command: 'COMMAND', RunningFor: 'CREATED', State: 'STATE', Networks: 'NETWORKS', Mounts: 'MOUNTS', Labels: 'LABELS' })[k] || k.toUpperCase()); return ok(simdkTable([hdr.split('\t')].concat(rows.map(r => r.split('\t'))))); } return ok(rows.join('\n') + (rows.length ? '\n' : '')); }
      return ok(simdkTable(simdkPsRows(st, list, o)));
    }
    case 'logs': {
      const o = simdkOpts(rest, ['tail', 'n', 'since', 'until']);
      const c = C(o.rest[0]);
      if (!o.rest[0]) return fail('"docker logs" requires exactly 1 argument.\nSee \'docker logs --help\'.\n\nUsage:  docker logs [OPTIONS] CONTAINER\n\nFetch the logs of a container');
      if (!c) return simdkNoContainer(o.rest[0]);
      let logs = c.logs; const t = o.val('tail', 'n'); if (t !== undefined && t !== 'all') logs = logs.slice(-parseInt(t, 10));
      st.audit.logs.push(c.name);
      const fmt = l => (o.has('t', 'timestamps') ? l.ts.replace(/Z$/, '000000Z') + ' ' : '') + l.t + '\n';
      const out = logs.filter(l => l.s === 'out').map(fmt).join(''); const err = logs.filter(l => l.s === 'err').map(fmt).join('');
      if (o.has('f', 'follow') && c.status === 'running') return { out, err: err + `lab: canlı takip simüle edilmiyor, ${c.name} çalışmaya devam ediyor, son loglar gösterildi\n`, code: 0 };
      return { out, err, code: 0 };
    }
    case 'exec': {
      let split = 0; while (split < rest.length && rest[split].startsWith('-')) { if (/^(-e|--env|-w|--workdir|-u|--user)$/.test(rest[split])) split++; split++; }
      const o = simdkOpts(rest.slice(0, split), ['e', 'env', 'w', 'workdir', 'u', 'user']);
      const ref = rest[split]; const cmd = rest.slice(split + 1);
      if (!ref || !cmd.length) return fail('"docker exec" requires at least 2 arguments.\nSee \'docker exec --help\'.\n\nUsage:  docker exec [OPTIONS] CONTAINER COMMAND [ARG...]\n\nExecute a command in a running container');
      const c = C(ref);
      if (!c) return simdkNoContainer(ref);
      if (c.status !== 'running') return fail(`Error response from daemon: container ${c.id} is not running`);
      const img = st.images.find(i => i.id === c.imageId);
      st.audit.exec.push(c.name);
      if ((o.has('i') || o.has('t')) && cmd.length === 1 && /^(sh|bash|\/bin\/sh|\/bin\/bash|ash|python3?|redis-cli|psql)$/.test(cmd[0])) {
        if (/python/.test(cmd[0])) return ok('Python 3.12.7 (main, Oct  2 2026, 10:30:11) [GCC 12.2.0] on linux\nlab: etkileşimli REPL yok, docker exec ' + c.name + ' python -c "kod" kullan\n');
        if (/redis-cli/.test(cmd[0])) return ok('lab: etkileşimli redis-cli yok, docker exec ' + c.name + ' redis-cli ping kullan\n');
        return ok(`lab: etkileşimli shell simüle edilmiyor. Tek komut çalıştır, örnek docker exec ${c.name} ${cmd[0]} -c "ls /app && env" ya da docker exec ${c.name} ls /app\n`);
      }
      const tmp = Object.assign({}, c, { env: c.env.concat([].concat(o.vals.e || [], o.vals.env || [])), workdir: o.val('w', 'workdir') || c.workdir });
      return simdkExecIn(sh, st, tmp, img, cmd);
    }
    case 'stop': case 'kill': case 'start': case 'restart': case 'pause': case 'unpause': {
      const o = simdkOpts(rest, ['t', 'time', 's', 'signal']);
      if (!o.rest.length) return fail(`"docker ${sub}" requires at least 1 argument.\nSee 'docker ${sub} --help'.\n\nUsage:  docker ${sub} [OPTIONS] CONTAINER [CONTAINER...]`);
      let out = ''; let err = '';
      for (const ref of o.rest) {
        const c = C(ref);
        if (!c) { err += `Error response from daemon: No such container: ${ref}\n`; continue; }
        if (sub === 'stop' || sub === 'kill') { if (c.status !== 'running' && sub === 'kill') { err += `Error response from daemon: cannot kill container: ${ref}: container ${c.id} is not running\n`; continue; } c.stoppedByUser = true; const wasRm = c.rm; simdkStop(st, c, sub === 'kill' || o.val('s', 'signal') === 'KILL' || o.val('s', 'signal') === 'SIGKILL' ? 'KILL' : null); out += ref + '\n'; void wasRm; }
        else if (sub === 'start') { if (c.status === 'running') { out += ref + '\n'; continue; } c.stoppedByUser = false; const e = simdkStart(sh, st, c); if (e) { err += `${e}\nError: failed to start containers: ${ref}\n`; continue; } out += ref + '\n'; if (o.has('a', 'attach') || o.has('i')) out += c.logs.slice(-5).map(l => l.t + '\n').join(''); }
        else if (sub === 'restart') { simdkStop(st, c); c.stoppedByUser = false; const e = simdkStart(sh, st, c); if (e) { err += e + '\n'; continue; } c.restartCount = 0; out += ref + '\n'; }
        else if (sub === 'pause') { if (c.status !== 'running') { err += `Error response from daemon: container ${c.id} is not running\n`; continue; } c.status = 'paused'; out += ref + '\n'; }
        else if (sub === 'unpause') { if (c.status !== 'paused') { err += `Error response from daemon: container ${c.id} is not paused\n`; continue; } c.status = 'running'; out += ref + '\n'; }
      }
      return { out, err, code: err ? 1 : 0 };
    }
    case 'rm': {
      const o = simdkOpts(rest, []);
      if (!o.rest.length) return fail('"docker rm" requires at least 1 argument.\nSee \'docker rm --help\'.\n\nUsage:  docker rm [OPTIONS] CONTAINER [CONTAINER...]\n\nRemove one or more containers');
      let out = ''; let err = '';
      for (const ref of o.rest) {
        const c = C(ref);
        if (!c) { err += `Error response from daemon: No such container: ${ref}\n`; continue; }
        if ((c.status === 'running' || c.status === 'restarting' || c.status === 'paused') && !o.has('f', 'force')) { err += `Error response from daemon: cannot remove container "/${c.name}": container is ${c.status === 'paused' ? 'paused' : 'running'}: stop the container before removing or force remove\n`; continue; }
        simdkStop(st, c, 'KILL');
        if (st.containers.includes(c)) st.containers.splice(st.containers.indexOf(c), 1);
        if (o.has('v', 'volumes')) c.mounts.filter(m => m.Type === 'volume' && /^[0-9a-f]{64}$/.test(m.Name)).forEach(m => { const v = simdkVolume(st, m.Name); if (v) st.volumes.splice(st.volumes.indexOf(v), 1); });
        out += ref + '\n';
      }
      return { out, err, code: err ? 1 : 0 };
    }
    case 'rename': { const c = C(rest[0]); if (!c) return simdkNoContainer(rest[0]); if (!rest[1]) return fail('"docker rename" requires exactly 2 arguments.'); if (st.containers.some(x => x.name === rest[1])) return fail(`Error response from daemon: Conflict. The container name "/${rest[1]}" is already in use by container "${st.containers.find(x => x.name === rest[1]).id}". You have to remove (or rename) that container to be able to reuse that name.`); c.name = rest[1]; return ok(); }
    case 'inspect': {
      const o = simdkOpts(rest, ['format', 'f', 'type']);
      if (!o.rest.length) return fail('"docker inspect" requires at least 1 argument.\nSee \'docker inspect --help\'.\n\nUsage:  docker inspect [OPTIONS] NAME|ID [NAME|ID...]\n\nReturn low-level information on Docker objects');
      const objs = []; let err = '';
      for (const ref of o.rest) {
        const c = o.vals.type === 'image' ? null : C(ref); const img = o.vals.type === 'container' ? null : simdkFindImage(st, ref); const net = simdkNet(st, ref); const vol = simdkVolume(st, ref);
        if (c) { objs.push(simdkInspectContainer(st, c)); st.audit.inspect.push(c.name); }
        else if (img) objs.push(simdkInspectImage(st, img));
        else if (net && o.vals.type !== 'container') objs.push(simdkInspectNetwork(st, net));
        else if (vol && o.vals.type !== 'container') objs.push(simdkInspectVolume(st, vol));
        else err += `Error: No such object: ${ref}\n`;
      }
      const fmt = o.val('format', 'f');
      if (fmt) return { out: objs.map(x => simdkFormat(fmt, x)).join('\n') + (objs.length ? '\n' : ''), err, code: err ? 1 : 0 };
      return { out: (objs.length || !err ? simdkJson(objs) : '[]\n'), err, code: err ? 1 : 0 };
    }
    case 'port': { const c = C(rest[0]); if (!rest[0]) return fail('"docker port" requires at least 1 argument.'); if (!c) return simdkNoContainer(rest[0]); const out = []; Object.entries(c.ports).forEach(([k, b]) => { if (!b) return; if (rest[1] && !k.startsWith(rest[1].split('/')[0] + '/')) return; if (rest[1]) { out.push(`0.0.0.0:${b[0].HostPort}`, `[::]:${b[0].HostPort}`); return; } out.push(`${k} -> 0.0.0.0:${b[0].HostPort}`, `${k} -> [::]:${b[0].HostPort}`); }); if (rest[1] && !out.length) return fail(`Error: No public port '${rest[1]}' published for ${rest[0]}`); return ok(out.join('\n') + (out.length ? '\n' : '')); }
    case 'top': { const c = C(rest[0]); if (!c) return simdkNoContainer(rest[0]); if (c.status !== 'running') return fail(`Error response from daemon: container ${c.id} is not running`); const img = st.images.find(i => i.id === c.imageId); const u = ((img && img.config.User) || 'root').split(':')[0]; return ok(simdkTable([['UID', 'PID', 'PPID', 'C', 'STIME', 'TTY', 'TIME', 'CMD'], [u, String(4000 + parseInt(c.id.slice(0, 3), 16) % 900), '3990', '0', c.started.slice(11, 16), '?', '00:00:00', simdkArgv(img, c).join(' ')]], 6, 3)); }
    case 'stats': {
      const o = simdkOpts(rest, ['format']);
      let list = st.containers.filter(c => c.status === 'running'); if (o.rest.length) { list = o.rest.map(r => C(r)).filter(Boolean); if (list.length !== o.rest.length) return fail(`Error response from daemon: No such container: ${o.rest.find(r => !C(r))}`); }
      const rows = [['CONTAINER ID', 'NAME', 'CPU %', 'MEM USAGE / LIMIT', 'MEM %', 'NET I/O', 'BLOCK I/O', 'PIDS']];
      list.forEach(c => { const img = st.images.find(i => i.id === c.imageId); const isPy = img && img.lab; const mem = isPy ? 18.4 + (parseInt(c.id.slice(0, 2), 16) % 20) / 10 : (/nginx/.test(c.image) ? 3.6 : (/redis/.test(c.image) ? 8.2 : (/postgres/.test(c.image) ? 38.5 : 1.1))); const cpu = c.status === 'running' ? ((parseInt(c.id.slice(2, 4), 16) % 30) / 100).toFixed(2) : '0.00'; rows.push([c.id.slice(0, 12), c.name, `${cpu}%`, `${mem.toFixed(1)}MiB / 7.75GiB`, `${(mem / 7936 * 100).toFixed(2)}%`, `${(1.2 + c.logs.length * 0.1).toFixed(1)}kB / ${(0.4 + c.logs.length * 0.05).toFixed(1)}kB`, `${/postgres/.test(c.image) ? '31.2MB' : '0B'} / ${/postgres/.test(c.image) ? '45.1MB' : '0B'}`, String(isPy ? 1 : (/nginx/.test(c.image) ? 5 : (/postgres/.test(c.image) ? 7 : 1)))]); });
      return ok(simdkTable(rows) + (o.has('no-stream') ? '' : 'lab: canlı stats akışı simüle edilmiyor, tek kare gösterildi, --no-stream ile aynı\n'));
    }
    case 'cp': { if (rest.length < 2) return fail('"docker cp" requires exactly 2 arguments.'); const [src, dst] = rest; const m = /^([^:]+):(.+)$/.exec(src) || /^([^:]+):(.+)$/.exec(dst); if (!m) return fail('docker cp: must specify at least one container source'); const c = C(m[1]); if (!c) return simdkNoContainer(m[1]); const img = st.images.find(i => i.id === c.imageId); if (/^[^:]+:/.test(src)) { const rel = m[2].replace(/^\//, ''); const f = img && img.files[rel]; if (f === undefined) return fail(`Error response from daemon: Could not find the file ${m[2]} in container ${m[1]}`); const target = sh.resolve(dst); const tn = sh.node(target); const e = sh.writeFile(tn && tn.t === 'd' ? target + '/' + rel.split('/').pop() : dst, f, false, 'docker'); return e ? fail(e) : ok('Successfully copied ' + simdkSize(simdkBytes(f) + 1536) + ' to ' + target + '\n'); } const r = sh.readFile(src, 'docker'); if (r.err) return fail(`lstat ${sh.resolve(src)}: no such file or directory`); if (img) { img.files = img.files || {}; img.files[m[2].replace(/^\//, '').replace(/\/$/, '') + (m[2].endsWith('/') ? '/' + src.split('/').pop() : '')] = r.data; } return ok(`Successfully copied ${simdkSize(simdkBytes(r.data) + 1536)} to ${m[1]}:${m[2]}\n`); }
    case 'wait': { const c = C(rest[0]); if (!c) return simdkNoContainer(rest[0]); return ok(String(c.exitCode) + '\n'); }
    case 'diff': { const c = C(rest[0]); if (!c) return simdkNoContainer(rest[0]); return ok('C /root\nA /root/.bash_history\nC /tmp\n'); }
    case 'commit': case 'save': case 'load': case 'export': case 'import': return fail(`lab: docker ${sub} bu lab'da simüle edilmiyor. Imaj değişikliği için Dockerfile düzenleyip docker build çalıştır`);
    case 'network': return simdkNetworkCmd(sh, st, rest);
    case 'volume': return simdkVolumeCmd(sh, st, rest);
    case 'system': return simdkSystemCmd(sh, st, rest, stdin);
    case 'container-prune': { const gone = st.containers.filter(c => c.status === 'exited' || c.status === 'created'); if (!rest.includes('-f') && !rest.includes('--force') && !/^y/i.test((stdin || '').trim())) return ok(`WARNING! This will remove all stopped containers.\nAre you sure you want to continue? [y/N] \nlab: onay istemi yok, docker container prune -f kullan\n`); gone.forEach(c => st.containers.splice(st.containers.indexOf(c), 1)); return ok((gone.length ? 'Deleted Containers:\n' + gone.map(c => c.id).join('\n') + '\n\n' : '') + `Total reclaimed space: ${simdkSize(gone.length * 1200)}\n`); }
    case 'image-prune': { const all = rest.includes('-a') || rest.includes('--all'); const gone = st.images.filter(i => (!i.repoTags.length || all) && !st.containers.some(c => c.imageId === i.id)); if (!rest.includes('-f') && !rest.includes('--force') && !/^y/i.test((stdin || '').trim())) return ok(`WARNING! This will remove all ${all ? 'images without at least one container associated to them' : 'dangling images'}.\nAre you sure you want to continue? [y/N] \nlab: onay istemi yok, docker image prune -f kullan\n`); gone.forEach(i => st.images.splice(st.images.indexOf(i), 1)); return ok((gone.length ? 'Deleted Images:\n' + gone.map(i => (i.repoTags.length ? i.repoTags.map(t => `untagged: ${t}`).join('\n') + '\n' : '') + `deleted: sha256:${i.id}`).join('\n') + '\n\n' : '') + `Total reclaimed space: ${simdkSize(gone.reduce((n, i) => n + i.size, 0))}\n`); }
    case 'builder-prune': { const n = Object.keys(st.cache).length; const sz = Object.values(st.cache).reduce((a, c) => a + c.size, 0); if (!rest.includes('-f') && !rest.includes('--force') && !/^y/i.test((stdin || '').trim())) return ok(`WARNING! This will remove all dangling build cache. Are you sure you want to continue? [y/N] \nlab: onay istemi yok, docker builder prune -f kullan\n`); st.cache = {}; return ok(`Total:\t${simdkSize(sz)}\n` + (n ? '' : '')); }
    case 'compose': return simdkCompose(sh, st, rest);
    case 'context': return ok(rest[0] === 'ls' ? 'NAME        DESCRIPTION                               DOCKER ENDPOINT               ERROR\ndefault *   Current DOCKER_HOST based configuration   unix:///var/run/docker.sock\n' : 'default\n');
    case 'search': return fail('Error response from daemon: Get "https://index.docker.io/v1/search?q=' + (rest[0] || '') + '&n=25": dial tcp: lookup index.docker.io: no such host\n💡 Bu lab çevrimdışı, bilinen imajlar: ' + Object.keys(SIMDK_PUBLIC).join(', '));
    case 'swarm': case 'service': case 'stack': case 'node': return fail(`Error response from daemon: This node is not a swarm manager. Use "docker swarm init" or "docker swarm join" to connect this node to swarm and try again.\n💡 Bu lab'da swarm yok, orkestrasyon için kubectl bölümüne geç`);
    case 'events': return ok('lab: docker events canlı akışı simüle edilmiyor\n');
    case 'manifest': case 'trust': case 'plugin': case 'checkpoint': return fail(`lab: docker ${sub} bu lab'da yok`);
    default: return fail(`docker: unknown command: docker ${sub}\n\nRun 'docker --help' for more information`);
  }
}
function simdkInspectNetwork(st, n) {
  const containers = {};
  st.containers.filter(c => c.status === 'running' && (c.network === n.name || (c.networks || []).includes(n.name))).forEach(c => { containers[c.id] = { Name: c.name, EndpointID: simdkHash('ep' + c.id + n.name).slice(0, 64), MacAddress: '02:42:' + (c.ip || '0.0.0.0').split('.').map(x => ('0' + parseInt(x, 10).toString(16)).slice(-2)).join(':'), IPv4Address: c.ip ? `${c.ip}/16` : '', IPv6Address: '' }; });
  return { Name: n.name, Id: n.id, Created: n.created, Scope: n.scope, Driver: n.driver, EnableIPv6: false, IPAM: { Driver: 'default', Options: n.builtin ? null : {}, Config: n.subnet ? [{ Subnet: n.subnet, Gateway: n.gateway }] : [] }, Internal: false, Attachable: false, Ingress: false, ConfigFrom: { Network: '' }, ConfigOnly: false, Containers: containers, Options: n.name === 'bridge' ? { 'com.docker.network.bridge.default_bridge': 'true', 'com.docker.network.bridge.enable_icc': 'true', 'com.docker.network.bridge.enable_ip_masquerade': 'true', 'com.docker.network.bridge.host_binding_ipv4': '0.0.0.0', 'com.docker.network.bridge.name': 'docker0', 'com.docker.network.driver.mtu': '1500' } : {}, Labels: n.labels || {} };
}
function simdkInspectVolume(st, v) { return { CreatedAt: v.created, Driver: v.driver, Labels: v.labels && Object.keys(v.labels).length ? v.labels : null, Mountpoint: v.mountpoint, Name: v.name, Options: null, Scope: 'local' }; }
function simdkNetworkCmd(sh, st, args) {
  const sub = args[0]; const rest = args.slice(1);
  if (!sub || sub === '--help') return ok('\nUsage:  docker network COMMAND\n\nManage networks\n\nCommands:\n  connect     Connect a container to a network\n  create      Create a network\n  disconnect  Disconnect a container from a network\n  inspect     Display detailed information on one or more networks\n  ls          List networks\n  prune       Remove all unused networks\n  rm          Remove one or more networks\n\nRun \'docker network COMMAND --help\' for more information on a command.\n');
  const o = simdkOpts(rest, ['d', 'driver', 'subnet', 'gateway', 'format', 'filter', 'f', 'ip', 'alias', 'label', 'opt', 'o', 'ip-range']);
  if (sub === 'ls' || sub === 'list') { if (o.has('q', 'quiet')) return ok(st.networks.map(n => n.id.slice(0, 12)).join('\n') + '\n'); const rows = [['NETWORK ID', 'NAME', 'DRIVER', 'SCOPE']]; st.networks.forEach(n => rows.push([n.id.slice(0, 12), n.name, n.driver, n.scope])); return ok(simdkTable(rows)); }
  if (sub === 'create') { const name = o.rest[0]; if (!name) return fail('"docker network create" requires exactly 1 argument.\nSee \'docker network create --help\'.\n\nUsage:  docker network create [OPTIONS] NETWORK\n\nCreate a network'); if (simdkNet(st, name) && simdkNet(st, name).name === name) return fail(`Error response from daemon: network with name ${name} already exists`); const drv = o.val('d', 'driver') || 'bridge'; if (!['bridge', 'overlay', 'macvlan', 'ipvlan', 'host', 'null'].includes(drv)) return fail(`Error response from daemon: plugin "${drv}" not found`); const subnet = o.vals.subnet || `172.${st.nextNet}.0.0/16`; if (!o.vals.subnet) st.nextNet++; if (st.networks.some(n => n.subnet === subnet)) return fail(`Error response from daemon: Pool overlaps with other one on this address space`); const n = { id: simdkRand(64), name, driver: drv, scope: 'local', subnet, gateway: o.vals.gateway || subnet.split('/')[0].replace(/\.\d+$/, '.1'), created: new Date().toISOString(), labels: {}, nextIp: 2 }; st.networks.push(n); return ok(n.id + '\n'); }
  if (sub === 'rm' || sub === 'remove') { let out = ''; let err = ''; for (const ref of o.rest) { const n = simdkNet(st, ref); if (!n) { err += `Error response from daemon: network ${ref} not found\n`; continue; } if (n.builtin) { err += `Error response from daemon: ${n.name} is a pre-defined network and cannot be removed\n`; continue; } const users = st.containers.filter(c => c.status === 'running' && (c.network === n.name || (c.networks || []).includes(n.name))); if (users.length) { err += `Error response from daemon: error while removing network: network ${n.name} id ${n.id} has active endpoints\n`; continue; } st.networks.splice(st.networks.indexOf(n), 1); out += ref + '\n'; } return { out, err, code: err ? 1 : 0 }; }
  if (sub === 'inspect') { const objs = []; let err = ''; for (const ref of o.rest) { const n = simdkNet(st, ref); if (!n) { err += `Error response from daemon: network ${ref} not found\n`; continue; } objs.push(simdkInspectNetwork(st, n)); } if (o.val('format', 'f')) return { out: objs.map(x => simdkFormat(o.val('format', 'f'), x)).join('\n') + '\n', err, code: err ? 1 : 0 }; return { out: objs.length ? simdkJson(objs) : '[]\n', err, code: err ? 1 : 0 }; }
  if (sub === 'connect') { const n = simdkNet(st, o.rest[0]); const c = simdkCont(st, o.rest[1]); if (!n) return fail(`Error response from daemon: network ${o.rest[0]} not found`); if (!c) return fail(`Error response from daemon: No such container: ${o.rest[1]}`); if (c.network === n.name || (c.networks || []).includes(n.name)) return fail(`Error response from daemon: endpoint with name ${c.name} already exists in network ${n.name}`); c.networks = (c.networks || [c.network]).concat(n.name); if (c.network === 'bridge' && n.name !== 'bridge') { c.network = n.name; c.ip = simdkAllocIp(st, n); c.gateway = n.gateway; } if (o.vals.alias) c.aliases = (c.aliases || []).concat(o.vals.alias); return ok(); }
  if (sub === 'disconnect') { const n = simdkNet(st, o.rest[0]); const c = simdkCont(st, o.rest[1]); if (!n) return fail(`Error response from daemon: network ${o.rest[0]} not found`); if (!c) return fail(`Error response from daemon: No such container: ${o.rest[1]}`); if (!(c.networks || [c.network]).includes(n.name)) return fail(`Error response from daemon: container ${c.id} is not connected to network ${n.name}`); c.networks = (c.networks || [c.network]).filter(x => x !== n.name); if (c.network === n.name) { c.network = c.networks[0] || 'none'; const nn = simdkNet(st, c.network); c.ip = nn ? simdkAllocIp(st, nn) : ''; } return ok(); }
  if (sub === 'prune') { const gone = st.networks.filter(n => !n.builtin && !st.containers.some(c => c.network === n.name || (c.networks || []).includes(n.name))); if (!o.has('f', 'force')) return ok('WARNING! This will remove all custom networks not used by at least one container.\nAre you sure you want to continue? [y/N] \nlab: onay istemi yok, docker network prune -f kullan\n'); gone.forEach(n => st.networks.splice(st.networks.indexOf(n), 1)); return ok(gone.length ? 'Deleted Networks:\n' + gone.map(n => n.name).join('\n') + '\n\n' : ''); }
  return fail(`docker: unknown command: docker network ${sub}\n\nRun 'docker network --help' for more information`);
}
function simdkVolumeCmd(sh, st, args) {
  const sub = args[0]; const rest = args.slice(1);
  if (!sub || sub === '--help') return ok('\nUsage:  docker volume COMMAND\n\nManage volumes\n\nCommands:\n  create      Create a volume\n  inspect     Display detailed information on one or more volumes\n  ls          List volumes\n  prune       Remove unused local volumes\n  rm          Remove one or more volumes\n\nRun \'docker volume COMMAND --help\' for more information on a command.\n');
  const o = simdkOpts(rest, ['d', 'driver', 'format', 'filter', 'f', 'label', 'opt', 'o', 'name']);
  if (sub === 'ls' || sub === 'list') { let list = st.volumes.slice(); for (const f of (o.vals.filters || [])) { const [k, v] = f.split('='); if (k === 'name') list = list.filter(x => x.name.includes(v)); if (k === 'dangling') list = list.filter(x => (v === 'true') === !st.containers.some(c => c.mounts.some(m => m.Name === x.name))); } if (o.has('q', 'quiet')) return ok(list.map(v => v.name).join('\n') + (list.length ? '\n' : '')); const rows = [['DRIVER', 'VOLUME NAME']]; list.forEach(v => rows.push([v.driver, v.name])); return ok(simdkTable(rows)); }
  if (sub === 'create') { const name = o.rest[0] || o.vals.name || simdkRand(64); if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) return fail(`Error response from daemon: create ${name}: "${name}" includes invalid characters for a local volume name, only "[a-zA-Z0-9][a-zA-Z0-9_.-]" are allowed. If you intended to pass a host directory, use absolute path`); simdkEnsureVolume(st, name); return ok(name + '\n'); }
  if (sub === 'rm' || sub === 'remove') { let out = ''; let err = ''; for (const ref of o.rest) { const v = simdkVolume(st, ref); if (!v) { err += `Error response from daemon: get ${ref}: no such volume\n`; continue; } const u = st.containers.find(c => c.mounts.some(m => m.Type === 'volume' && m.Name === v.name)); if (u && !o.has('f', 'force')) { err += `Error response from daemon: remove ${v.name}: volume is in use - [${u.id}]\n`; continue; } st.volumes.splice(st.volumes.indexOf(v), 1); out += ref + '\n'; } return { out, err, code: err ? 1 : 0 }; }
  if (sub === 'inspect') { const objs = []; let err = ''; for (const ref of o.rest) { const v = simdkVolume(st, ref); if (!v) { err += `Error response from daemon: get ${ref}: no such volume\n`; continue; } objs.push(simdkInspectVolume(st, v)); } if (o.val('format', 'f')) return { out: objs.map(x => simdkFormat(o.val('format', 'f'), x)).join('\n') + '\n', err, code: err ? 1 : 0 }; return { out: objs.length ? simdkJson(objs) : '[]\n', err, code: err ? 1 : 0 }; }
  if (sub === 'prune') { const gone = st.volumes.filter(v => !st.containers.some(c => c.mounts.some(m => m.Name === v.name)) && (o.has('a', 'all') || /^[0-9a-f]{64}$/.test(v.name))); if (!o.has('f', 'force')) return ok('WARNING! This will remove anonymous local volumes not used by at least one container.\nAre you sure you want to continue? [y/N] \nlab: onay istemi yok, docker volume prune -f kullan\n'); gone.forEach(v => st.volumes.splice(st.volumes.indexOf(v), 1)); return ok((gone.length ? 'Deleted Volumes:\n' + gone.map(v => v.name).join('\n') + '\n\n' : '') + 'Total reclaimed space: 0B\n'); }
  return fail(`docker: unknown command: docker volume ${sub}\n\nRun 'docker volume --help' for more information`);
}
function simdkSystemCmd(sh, st, args, stdin) {
  const sub = args[0]; const rest = args.slice(1);
  if (sub === 'df') {
    const imgSize = st.images.reduce((n, i) => n + i.size, 0); const used = st.images.filter(i => st.containers.some(c => c.imageId === i.id));
    const usedSize = used.reduce((n, i) => n + i.size, 0);
    const cacheSize = Object.values(st.cache).reduce((n, c) => n + c.size, 0);
    const volUsed = st.volumes.filter(v => st.containers.some(c => c.mounts.some(m => m.Name === v.name))).length;
    const rows = [['TYPE', 'TOTAL', 'ACTIVE', 'SIZE', 'RECLAIMABLE'], ['Images', String(st.images.length), String(used.length), simdkSize(imgSize), `${simdkSize(imgSize - usedSize)} (${imgSize ? Math.round((imgSize - usedSize) / imgSize * 100) : 0}%)`], ['Containers', String(st.containers.length), String(st.containers.filter(c => c.status === 'running').length), simdkSize(st.containers.reduce((n, c) => n + c.logs.length * 120, 0)), `${simdkSize(st.containers.filter(c => c.status !== 'running').reduce((n, c) => n + c.logs.length * 120, 0))} (${st.containers.length ? Math.round(st.containers.filter(c => c.status !== 'running').length / st.containers.length * 100) : 0}%)`], ['Local Volumes', String(st.volumes.length), String(volUsed), simdkSize(st.volumes.reduce((n, v) => n + Object.values(v.files || {}).reduce((a, f) => a + simdkBytes(f), 0), 0)), `0B (0%)`], ['Build Cache', String(Object.keys(st.cache).length), '0', simdkSize(cacheSize), `${simdkSize(cacheSize)}`]];
    return ok(simdkTable(rows));
  }
  if (sub === 'prune') {
    const all = rest.includes('-a') || rest.includes('--all'); const vols = rest.includes('--volumes');
    if (!rest.includes('-f') && !rest.includes('--force') && !/^y/i.test((stdin || '').trim())) return ok(`WARNING! This will remove:\n  - all stopped containers\n  - all networks not used by at least one container\n${vols ? '  - all anonymous volumes not used by at least one container\n' : ''}  - all ${all ? 'images without at least one container associated to them' : 'dangling images'}\n  - ${all ? 'unused' : 'dangling'} build cache\n\nAre you sure you want to continue? [y/N] \nlab: onay istemi yok, docker system prune -f kullan\n`);
    let out = ''; let total = 0;
    const gc = st.containers.filter(c => c.status === 'exited' || c.status === 'created'); if (gc.length) { out += 'Deleted Containers:\n' + gc.map(c => c.id).join('\n') + '\n\n'; gc.forEach(c => st.containers.splice(st.containers.indexOf(c), 1)); }
    const gn = st.networks.filter(n => !n.builtin && !st.containers.some(c => c.network === n.name || (c.networks || []).includes(n.name))); if (gn.length) { out += 'Deleted Networks:\n' + gn.map(n => n.name).join('\n') + '\n\n'; gn.forEach(n => st.networks.splice(st.networks.indexOf(n), 1)); }
    if (vols) { const gv = st.volumes.filter(v => /^[0-9a-f]{64}$/.test(v.name) && !st.containers.some(c => c.mounts.some(m => m.Name === v.name))); if (gv.length) { out += 'Deleted Volumes:\n' + gv.map(v => v.name).join('\n') + '\n\n'; gv.forEach(v => st.volumes.splice(st.volumes.indexOf(v), 1)); } }
    const gi = st.images.filter(i => (!i.repoTags.length || all) && !st.containers.some(c => c.imageId === i.id)); if (gi.length) { out += 'Deleted Images:\n' + gi.map(i => (i.repoTags.map(t => `untagged: ${t}`).join('\n') + (i.repoTags.length ? '\n' : '') + `deleted: sha256:${i.id}`)).join('\n') + '\n\n'; total += gi.reduce((n, i) => n + i.size, 0); gi.forEach(i => st.images.splice(st.images.indexOf(i), 1)); }
    const cacheSize = Object.values(st.cache).reduce((n, c) => n + c.size, 0); if (Object.keys(st.cache).length) { out += 'Deleted build cache objects:\n' + Object.values(st.cache).map(c => c.layerId.slice(7, 32)).join('\n') + '\n\n'; total += cacheSize; st.cache = {}; }
    return ok(out + `Total reclaimed space: ${simdkSize(total)}\n`);
  }
  if (sub === 'info') return simdkDispatch(sh, st, ['info'], stdin);
  if (sub === 'events') return ok('lab: docker events canlı akışı simüle edilmiyor\n');
  return fail(`docker: unknown command: docker system ${sub || ''}\n\nRun 'docker system --help' for more information`);
}
function simdkComposeV1(args, stdin) { return simdkCommand.call(this, ['compose'].concat(args), stdin); }

/* registry.lab HTTP API, curl https://registry.lab/v2/_catalog */
if (typeof LAB !== 'undefined' && LAB.registerHttp) {
  LAB.registerHttp(req => {
    if (req.host !== SIMDK_REGISTRY) return null;
    const st = SIMDK_lastSh ? SIMDK_load(SIMDK_lastSh) : simdkFresh();
    if (req.path === '/v2/' || req.path === '/v2') return { status: 200, headers: { 'docker-distribution-api-version': 'registry/2.0' }, body: {} };
    if (req.path === '/v2/_catalog') return { status: 200, body: { repositories: [...new Set(Object.keys(st.registry).map(k => k.replace(/^registry\.lab\//, '').split(':')[0]))].sort() } };
    const m = /^\/v2\/(.+)\/tags\/list$/.exec(req.path);
    if (m) { const tags = Object.keys(st.registry).filter(k => k.replace(/^registry\.lab\//, '').split(':')[0] === m[1]).map(k => k.split(':').pop()); if (!tags.length) return { status: 404, body: { errors: [{ code: 'NAME_UNKNOWN', message: 'repository name not known to registry', detail: { name: m[1] } }] } }; return { status: 200, body: { name: m[1], tags: tags.sort() } }; }
    const mm = /^\/v2\/(.+)\/manifests\/(.+)$/.exec(req.path);
    if (mm) { const rec = st.registry[`registry.lab/${mm[1]}:${mm[2]}`]; if (!rec) return { status: 404, body: { errors: [{ code: 'MANIFEST_UNKNOWN', message: 'manifest unknown', detail: { Tag: mm[2] } }] } }; return { status: 200, headers: { 'docker-content-digest': rec.digest, 'content-type': 'application/vnd.docker.distribution.manifest.v2+json' }, body: { schemaVersion: 2, mediaType: 'application/vnd.docker.distribution.manifest.v2+json', config: { mediaType: 'application/vnd.docker.container.image.v1+json', size: 4211, digest: 'sha256:' + rec.id }, layers: (rec.layers || []).filter(l => l.size > 0).map(l => ({ mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip', size: l.size, digest: l.id })) } }; }
    return { status: 404, body: { errors: [{ code: 'NOT_FOUND', message: 'not found' }] } };
  });
}

registerExt({
  files: [{ path: SIMDK_STATE, node: mkfile(JSON.stringify(simdkFresh()), 0o600, 'root') }],
  commands: { docker: simdkCommand, 'docker-compose': simdkComposeV1 },
  manual: {
    docker: { d: 'Container engine CLI. Imaj build eder, container çalıştırır, registry.lab ile konuşur. Durum sanal engine içinde tutulur', u: ['docker build -t ad:tag [-f Dockerfile] [--target stage] [--build-arg K=V] yol', 'docker run [-d] [--name ad] [-p host:cont] [-e K=V] [--env-file f] [-v kaynak:hedef] [--network ag] [--rm] [-it] [--restart politika] imaj [komut]', 'docker ps [-a] [-q] [--filter name=x] [--format "{{.Names}}"]', 'docker logs [-f] [--tail N] [-t] container', 'docker exec [-it] container komut', 'docker stop|start|restart|rm [-f] container', 'docker inspect [--format "{{.State.ExitCode}}"] nesne', 'docker images, docker rmi, docker history, docker tag, docker pull, docker push, docker login registry.lab -u burak -p parola', 'docker network ls|create|inspect|rm|connect', 'docker volume ls|create|inspect|rm', 'docker system df, docker system prune -f', 'docker compose up -d|ps|logs|down|config'], e: ['docker build -t netauto:1.0.0 .', 'docker run -d --name netauto -p 8080:8080 -e LOG_LEVEL=DEBUG netauto:1.0.0', 'docker logs netauto', 'docker exec netauto env', 'docker inspect --format "{{.NetworkSettings.IPAddress}}" netauto'] },
    'docker-compose': { d: 'Çok container\'lı uygulamayı compose.yaml ile tanımlar ve yönetir. docker compose ile aynı', u: ['docker compose up -d [--build]', 'docker compose ps', 'docker compose logs [servis]', 'docker compose down [-v]', 'docker compose config', 'docker compose exec servis komut'], e: ['docker compose up -d', 'docker compose logs app', 'docker compose down'] },
    dockerfile: { d: 'Imaj tarifi. Her talimat bir katman ya da metadata üretir, sıra cache\'i belirler', u: ['FROM imaj[:tag] [AS asama]', 'WORKDIR /app', 'COPY kaynak hedef, COPY --from=asama /yol /yol', 'RUN komut', 'ENV K=V, ARG K=V, EXPOSE port, USER ad, LABEL k=v', 'HEALTHCHECK --interval=30s CMD komut', 'ENTRYPOINT ["exe"], CMD ["arg"]'], e: ['FROM python:3.12-slim', 'COPY requirements.txt .', 'RUN pip install --no-cache-dir -r requirements.txt', 'CMD ["python", "app.py", "--serve"]'] },
  },
  onReset: sh => { sh.install(SIMDK_STATE, mkfile(JSON.stringify(simdkFresh()), 0o600, 'root')); },
});
if (typeof module !== 'undefined') module.exports = { SIMDK_load, SIMDK_save, SIMDK_imageKnown, SIMDK_imageRecord, SIMDK_runProgram, SIMDK_PUBLIC };
