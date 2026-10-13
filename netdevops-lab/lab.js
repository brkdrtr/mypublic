'use strict';
/* NetDevOps Lab ortak kayit defteri. Simulatorler buraya cihaz, HTTP servis ve Python modulu kaydeder.
   Yukleme sirasi, ../linux-lab/shell.js, lab.js, sim-*.js, py.js, missions-*.js, app.js */

/* Gorev ve quiz havuzlari, missions-*.js push eder */
const CHAPTERS = [];
const QUIZ = [];
const BADGES = [];

const LAB = {
  /* name -> cihaz nesnesi, sim-device.js doldurur. Sozlesme CONTRACT.md */
  devices: {},
  /* HTTP simulasyonu. handler(req) -> yanit ya da null. req {method, url, host, path, query, headers, body} */
  httpHandlers: [],
  registerHttp(fn) { this.httpHandlers.push(fn); },
  http(req) {
    req = Object.assign({}, req);
    req.method = (req.method || 'GET').toUpperCase();
    try { const u = new URL(req.url); req.host = u.hostname; req.port = u.port; req.path = u.pathname; req.query = Object.fromEntries(u.searchParams.entries()); req.protocol = u.protocol.replace(':', ''); }
    catch (e) { return { status: 0, headers: {}, body: '', error: 'Could not resolve host ' + req.url }; }
    req.headers = Object.fromEntries(Object.entries(req.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
    req.body = req.body == null ? '' : String(req.body);
    for (const h of this.httpHandlers) { const r = h(req); if (r) return normalizeRes(r); }
    return { status: 0, headers: {}, body: '', error: `Could not resolve host: ${req.host}` };
  },
  /* Python shim modulleri. registerPy('ncclient/manager.py', 'py/ncclient/manager.py') url uygulama kokune gore */
  pyFiles: {},
  registerPy(path, url) { this.pyFiles[path] = url; },
  /* Diger simulatorlerin ortak kullandigi kucuk yardimcilar */
  util: {
    yaml: () => (typeof jsyaml !== 'undefined' ? jsyaml : null),
    json: (o) => JSON.stringify(o, null, 2) + '\n',
    pad: (s, n) => String(s).padEnd(n),
    now: () => new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    id: (n = 12) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
  },
  /* Her sim onReset'te kendi durumunu sifirlar, shell.js registerExt onReset ile ayni amac */
};
function normalizeRes(r) {
  const out = { status: r.status || 200, headers: {}, body: r.body == null ? '' : (typeof r.body === 'string' ? r.body : JSON.stringify(r.body, null, 2) + '\n') };
  Object.entries(r.headers || {}).forEach(([k, v]) => { out.headers[k.toLowerCase()] = String(v); });
  if (!out.headers['content-type']) out.headers['content-type'] = typeof r.body === 'string' ? 'text/plain' : 'application/json';
  out.headers['content-length'] = String(new TextEncoder().encode(out.body).length);
  return out;
}
/* curl sim: linux-lab curl'u disari cikamaz, buradaki hostlara LAB.http ile cevap verilir. sim-http.js curl'u sarar */
if (typeof module !== 'undefined') module.exports = { LAB, CHAPTERS, QUIZ, BADGES };
