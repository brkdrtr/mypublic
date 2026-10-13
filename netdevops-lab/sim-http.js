'use strict';
/* curl sarmalayici. LAB.http uzerinden simule servislere gider, bilinmeyen hostta eski curl'e dusulur */
(function () {
  const oldCurl = COMMANDS.curl;
  const NDH_HOSTS = () => new Set(['api.lab', 'r1.lab', 'r2.lab', 'sw1.lab', 'registry.lab', 'ci.lab', 'gitlab.lab', '10.0.0.1', '10.0.0.2', '10.0.0.11', 'localhost', '127.0.0.1']);
  function parseCurl(args) {
    const o = { method: null, headers: {}, body: null, url: null, include: false, silent: false, head: false, insecure: false, user: null, output: null, fail: false, verbose: false, write: null };
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '-X' || a === '--request') o.method = args[++i];
      else if (a === '-H' || a === '--header') { const h = args[++i] || ''; const j = h.indexOf(':'); if (j > 0) o.headers[h.slice(0, j).trim().toLowerCase()] = h.slice(j + 1).trim(); }
      else if (a === '-d' || a === '--data' || a === '--data-raw' || a === '--data-binary') { o.body = (o.body ? o.body + '&' : '') + (args[++i] || ''); if (!o.method) o.method = 'POST'; }
      else if (a === '-i' || a === '--include') o.include = true;
      else if (a === '-s' || a === '--silent') o.silent = true;
      else if (a === '-I' || a === '--head') o.head = true;
      else if (a === '-k' || a === '--insecure') o.insecure = true;
      else if (a === '-u' || a === '--user') o.user = args[++i];
      else if (a === '-o' || a === '--output') o.output = args[++i];
      else if (a === '-f' || a === '--fail') o.fail = true;
      else if (a === '-v' || a === '--verbose') o.verbose = true;
      else if (a === '-w' || a === '--write-out') o.write = args[++i];
      else if (a === '-L' || a === '-S' || a === '--show-error' || a === '--compressed') { /* yok say */ }
      else if (a.startsWith('-') && a.length > 1) { /* bilinmeyen bayrak, yok say */ }
      else o.url = a;
    }
    if (!o.method) o.method = o.head ? 'HEAD' : 'GET';
    if (o.user) o.headers.authorization = 'Basic ' + btoa(o.user.includes(':') ? o.user : o.user + ':');
    if (o.body && !o.headers['content-type']) o.headers['content-type'] = 'application/x-www-form-urlencoded';
    return o;
  }
  function curl(args, stdin) {
    const sh = this;
    const o = parseCurl(args);
    if (!o.url) return oldCurl.call(sh, args, stdin);
    let url = o.url; if (!/^https?:\/\//.test(url)) url = 'https://' + url;
    let host; try { host = new URL(url).hostname; } catch (e) { return fail(`curl: (3) URL using bad/illegal format or missing URL\n`); }
    if (!NDH_HOSTS().has(host) && !host.endsWith('.lab')) return oldCurl.call(sh, args, stdin);
    if (o.body === '@-' ) o.body = stdin || '';
    else if (o.body && o.body.startsWith('@')) { const rf = sh.readFile(o.body.slice(1), 'curl'); if (!rf || rf.err) return fail(`curl: (26) Failed to open/read local data from file ${o.body.slice(1)}\n`); o.body = rf.data; }
    const r = LAB.http({ method: o.method, url, headers: o.headers, body: o.body });
    if (r.error) return fail(`curl: (6) ${r.error}\n`);
    let out = '';
    if (o.verbose) out += `* Connected to ${host} port 443\n> ${o.method} ${new URL(url).pathname} HTTP/1.1\n> Host: ${host}\n${Object.entries(o.headers).map(([k, v]) => `> ${k}: ${v}`).join('\n')}${Object.keys(o.headers).length ? '\n' : ''}>\n`;
    const statusLine = `HTTP/1.1 ${r.status} ${({ 200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content', 304: 'Not Modified', 412: 'Precondition Failed', 428: 'Precondition Required', 406: 'Not Acceptable', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict', 415: 'Unsupported Media Type', 422: 'Unprocessable Entity', 429: 'Too Many Requests', 500: 'Internal Server Error' })[r.status] || ''}`;
    if (o.include || o.head || o.verbose) out += (o.verbose ? '< ' : '') + statusLine + '\n' + Object.entries(r.headers).map(([k, v]) => (o.verbose ? '< ' : '') + k.replace(/(^|-)\w/g, c => c.toUpperCase()) + ': ' + v).join('\n') + '\n' + (o.verbose ? '<\n' : '\n');
    if (!o.head) out += r.body;
    if (o.write) out += o.write.replace(/%\{http_code\}/g, r.status).replace(/\\n/g, '\n');
    if (o.fail && r.status >= 400) return fail(`curl: (22) The requested URL returned error: ${r.status}\n`);
    if (o.output) { const e = sh.writeFile(o.output, r.body, false, 'curl'); if (e) return fail(e + '\n'); return ok(''); }
    return ok(out);
  }
  COMMANDS.curl = curl; /* COMMANDS LAB_EXT'ten once cozulur, dogrudan degistir */
  registerExt({ commands: { curl }, manual: { curl: { d: 'HTTP istemcisi. Lab içindeki api.lab, r1.lab gibi servislere gerçek HTTP semantiğiyle konuşur', u: ['curl [-s] [-i] [-X METHOD] [-H "K: V"] [-d veri] URL', 'curl -u user:pass URL', 'curl -o dosya URL', 'curl -w "%{http_code}" URL'], e: ['curl -s https://api.lab/v1/devices', 'curl -s -H "Authorization: Bearer TOKEN" https://api.lab/v1/me', 'curl -k -u admin:admin -H "Accept: application/yang-data+json" https://r1.lab/restconf/data/ietf-interfaces:interfaces'] } } });
})();
