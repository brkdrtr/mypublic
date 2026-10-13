'use strict';
/* api.lab, NetDevOps Lab'in sahte ama gercekci REST API'si. LAB.registerHttp ile kayit olur, curl ve Python requests
   shim'i LAB.http uzerinden buraya gelir. Durum bellekte, SIMA_STORE icinde, registerExt onReset ile sifirlanir.
   Ozellikler, bearer token, pagination, ETag ve If-Match, 422 validation, async job, rate limit, flaky endpoint. */

const SIMA_BASE = 'https://api.lab';
const SIMA_USERS = { burak: { password: 'lab123', role: 'netops', teams: ['network-automation', 'oncall'], email: 'burak@netlab.local' } };
const SIMA_SITES = [
  { code: 'ams-dc1', name: 'Amsterdam DC1', city: 'Amsterdam', country: 'NL', tier: 'datacenter', net: '10.10' },
  { code: 'rtm-br1', name: 'Rotterdam Branch', city: 'Rotterdam', country: 'NL', tier: 'branch', net: '10.20' },
  { code: 'utr-br2', name: 'Utrecht Branch', city: 'Utrecht', country: 'NL', tier: 'branch', net: '10.30' },
  { code: 'ehv-br3', name: 'Eindhoven Branch', city: 'Eindhoven', country: 'NL', tier: 'branch', net: '10.40' },
  { code: 'gro-br4', name: 'Groningen Branch', city: 'Groningen', country: 'NL', tier: 'branch', net: '10.50' },
];
const SIMA_STATUSES = ['active', 'maintenance', 'decommissioned'];
const SIMA_MODELS = [
  ['core', 'C8500-12X', 'ios-xe'], ['edge', 'C8000V', 'ios-xe'], ['edge', 'ISR4451-X', 'ios-xe'],
  ['acc', 'C9300-48P', 'ios-xe'], ['acc', 'C9200L-24P', 'ios-xe'], ['dist', 'C9500-24Y4C', 'ios-xe'],
  ['leaf', 'N9K-C93180YC-FX', 'nx-os'], ['fw', 'FPR-2130', 'ftd'],
];
const SIMA_RL_WINDOW = 2000;
const SIMA_RL_EVERY = 7;

/* Diger dosyalar bu nesneyi okur, missions-api.js check'leri cihazlari, loglari ve job'lari buradan dogrular */
const SIMA_STORE = {
  devices: [], nextId: 1, tokens: {}, jobs: [], nextJob: 1, log: [], deployments: {},
  rl: { times: [], enabled: true, limited: 0 }, flaky: { failed: false, calls: 0 }, stats: { requests: 0, errors: 0 },
  reqSeq: 0,
};
LAB.api = SIMA_STORE;

function SIMA_seedDevices() {
  const out = [];
  let id = 1;
  for (let i = 0; i < 60; i++) {
    const site = SIMA_SITES[i % SIMA_SITES.length];
    const n = Math.floor(i / SIMA_SITES.length) + 1;
    const [role, model, platform] = SIMA_MODELS[(i * 7 + n) % SIMA_MODELS.length];
    const status = i % 13 === 0 ? 'maintenance' : (i % 19 === 0 ? 'decommissioned' : 'active');
    const hostname = `${site.code.split('-')[0]}-${role}-${String(n).padStart(2, '0')}`;
    out.push({
      id: id++, hostname, site: site.code, model, platform, mgmt_ip: `${site.net}.${role === 'core' || role === 'dist' ? 0 : 1}.${10 + n}`,
      status, tags: [role, platform, site.tier].concat(status === 'active' ? [] : [status]),
      serial: 'FDO' + (2400 + i * 37).toString().padStart(4, '0') + 'L' + String.fromCharCode(65 + (i % 26)) + String(100 + i),
      os_version: platform === 'ios-xe' ? (i % 3 === 0 ? '17.9.4a' : '17.12.3') : (platform === 'nx-os' ? '10.3(4)' : '7.4.1'),
      description: `${site.name} ${role} ${n}`, version: 1,
      created_at: '2026-01-' + String(1 + (i % 28)).padStart(2, '0') + 'T09:00:00Z', updated_at: '2026-01-' + String(1 + (i % 28)).padStart(2, '0') + 'T09:00:00Z',
    });
  }
  return out;
}
function SIMA_reset() {
  const s = SIMA_STORE;
  s.devices = SIMA_seedDevices(); s.nextId = 61; s.tokens = {}; s.jobs = []; s.nextJob = 1; s.log = [];
  s.deployments = {
    staging: { env: 'staging', version: '1.1.0', deployed_at: '2026-10-01T10:00:00Z', deployed_by: 'ci', history: ['1.0.0', '1.1.0'] },
    production: { env: 'production', version: '1.1.0', deployed_at: '2026-10-02T14:00:00Z', deployed_by: 'ci', history: ['1.0.0', '1.1.0'] },
  };
  s.rl = { times: [], enabled: true, limited: 0 }; s.flaky = { failed: false, calls: 0 }; s.stats = { requests: 0, errors: 0 }; s.reqSeq = 0;
}
SIMA_reset();

(function () {
  const REASONS = { 200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict', 412: 'Precondition Failed', 415: 'Unsupported Media Type', 422: 'Unprocessable Entity', 428: 'Precondition Required', 429: 'Too Many Requests', 500: 'Internal Server Error', 503: 'Service Unavailable' };
  const etagOf = d => `"${d.id}-${d.version}"`;
  const baseHeaders = () => ({ 'content-type': 'application/json; charset=utf-8', server: 'netlab-api/2.4.1', date: new Date().toUTCString(), 'x-request-id': LAB.util.id(16), 'cache-control': 'no-store' });
  const json = (status, body, headers) => ({ status, headers: Object.assign(baseHeaders(), headers || {}), body: JSON.stringify(body, null, 2) + '\n' });
  const err = (status, code, message, extra) => json(status, Object.assign({ error: code, message, status }, extra || {}));
  const parseBody = req => {
    const t = req.body || '';
    if (!t.trim()) return { data: null };
    const ct = (req.headers['content-type'] || '').toLowerCase();
    if (ct.includes('x-www-form-urlencoded') && !t.trim().startsWith('{')) {
      const o = {}; new URLSearchParams(t).forEach((v, k) => { o[k] = v; }); return { data: o };
    }
    try { return { data: JSON.parse(t) }; } catch (e) { return { bad: err(400, 'bad_request', 'request body is not valid JSON, ' + e.message.replace(/^JSON\.parse: /, '')) }; }
  };
  const auth = req => {
    const h = req.headers.authorization || '';
    const m = /^Bearer\s+(\S+)$/i.exec(h);
    if (!m) return { fail: err(401, 'unauthorized', 'missing bearer token, POST /v1/auth/token first and send Authorization: Bearer <token>', {}), hdr: { 'www-authenticate': 'Bearer realm="api.lab"' } };
    const tk = SIMA_STORE.tokens[m[1]];
    if (!tk) return { fail: err(401, 'unauthorized', 'invalid or expired token'), hdr: { 'www-authenticate': 'Bearer realm="api.lab", error="invalid_token"' } };
    if (Date.now() > tk.expires) return { fail: err(401, 'unauthorized', 'token expired, request a new one'), hdr: {} };
    return { user: tk.user };
  };
  const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const FIELDS = ['hostname', 'site', 'model', 'platform', 'mgmt_ip', 'status', 'tags', 'serial', 'os_version', 'description'];
  function validate(data, partial, selfId) {
    const errors = [];
    if (!data || typeof data !== 'object' || Array.isArray(data)) return [{ field: 'body', message: 'expected a JSON object' }];
    for (const k of Object.keys(data)) { if (!FIELDS.includes(k) && !['id', 'version', 'created_at', 'updated_at'].includes(k)) errors.push({ field: k, message: 'unknown field' }); }
    const need = partial ? [] : ['hostname', 'site', 'model', 'mgmt_ip'];
    for (const k of need) if (data[k] === undefined || data[k] === null || data[k] === '') errors.push({ field: k, message: 'is required' });
    if (data.hostname !== undefined) {
      if (typeof data.hostname !== 'string' || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(data.hostname)) errors.push({ field: 'hostname', message: 'must match ^[a-z0-9][a-z0-9-]{1,62}$' });
      else if (SIMA_STORE.devices.some(d => d.hostname === data.hostname && d.id !== selfId)) errors.push({ field: 'hostname', message: `already exists on device ${SIMA_STORE.devices.find(d => d.hostname === data.hostname).id}` });
    }
    if (data.site !== undefined && !SIMA_SITES.some(s => s.code === data.site)) errors.push({ field: 'site', message: 'unknown site, see GET /v1/sites' });
    if (data.mgmt_ip !== undefined && (typeof data.mgmt_ip !== 'string' || !IPV4.test(data.mgmt_ip))) errors.push({ field: 'mgmt_ip', message: 'must be a valid IPv4 address' });
    if (data.status !== undefined && !SIMA_STATUSES.includes(data.status)) errors.push({ field: 'status', message: 'must be one of ' + SIMA_STATUSES.join(', ') });
    if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some(t => typeof t !== 'string'))) errors.push({ field: 'tags', message: 'must be a list of strings' });
    if (data.model !== undefined && typeof data.model !== 'string') errors.push({ field: 'model', message: 'must be a string' });
    for (const k of ['platform', 'serial', 'os_version', 'description']) if (data[k] !== undefined && data[k] !== null && typeof data[k] !== 'string') errors.push({ field: k, message: 'must be a string' });
    return errors;
  }
  const pub = d => { const o = {}; FIELDS.forEach(k => { o[k] = d[k]; }); return Object.assign({ id: d.id }, o, { version: d.version, created_at: d.created_at, updated_at: d.updated_at, links: { self: `/v1/devices/${d.id}` } }); };
  const ifMatchOk = (req, d) => {
    const im = req.headers['if-match'];
    if (im === undefined) return null;
    if (im.trim() === '*') return true;
    return im.split(',').map(x => x.trim().replace(/^W\//, '')).includes(etagOf(d));
  };
  const jobView = j => ({ id: j.id, type: j.type, status: j.status, params: j.params, created_at: j.created_at, updated_at: j.updated_at, polls: j.polls, result: j.result, links: { self: `/v1/jobs/${j.id}` } });
  function advanceJob(j) {
    j.polls++;
    if (j.polls >= 2 && j.status === 'queued') { j.status = 'running'; j.started_at = LAB.util.now(); }
    if (j.polls >= 3 && j.status === 'running') {
      j.status = 'done'; j.finished_at = LAB.util.now();
      const p = j.params || {};
      if ((j.type === 'deploy' || j.type === 'rollback') && p.env && SIMA_STORE.deployments[p.env]) {
        const dep = SIMA_STORE.deployments[p.env];
        if (p.version) { dep.previous = dep.version; dep.version = String(p.version); dep.history.push(String(p.version)); }
        dep.deployed_at = LAB.util.now(); dep.deployed_by = j.user; dep.last_job = j.id; dep.action = j.type;
        j.result = { ok: true, env: p.env, version: dep.version, previous: dep.previous, message: `${j.type} of ${dep.version} to ${p.env} completed` };
      } else if (j.type === 'backup') {
        const devs = p.site ? SIMA_STORE.devices.filter(d => d.site === p.site) : SIMA_STORE.devices;
        j.result = { ok: true, backed_up: devs.filter(d => d.status === 'active').length, skipped: devs.filter(d => d.status !== 'active').length, location: `s3://netlab-backups/${j.id}/` };
      } else j.result = { ok: true, message: `${j.type} completed` };
    }
    j.updated_at = LAB.util.now();
  }
  function paginate(req, items, base) {
    let page = parseInt(req.query.page || '1', 10); let per = parseInt(req.query.per_page || '10', 10);
    if (!(page >= 1)) return { bad: err(422, 'validation_error', 'invalid query parameter', { errors: [{ field: 'page', message: 'must be a positive integer' }] }) };
    if (!(per >= 1 && per <= 50)) return { bad: err(422, 'validation_error', 'invalid query parameter', { errors: [{ field: 'per_page', message: 'must be between 1 and 50' }] }) };
    const total = items.length; const pages = Math.max(1, Math.ceil(total / per));
    const q = Object.assign({}, req.query);
    const link = p => { const u = new URLSearchParams(Object.assign({}, q, { page: String(p), per_page: String(per) })); return `${base}?${u.toString()}`; };
    const links = { self: link(page), first: link(1), last: link(pages), next: page < pages ? link(page + 1) : null, prev: page > 1 ? link(page - 1) : null };
    const hdr = {};
    const lh = [];
    if (links.next) lh.push(`<${SIMA_BASE}${links.next}>; rel="next"`);
    if (links.prev) lh.push(`<${SIMA_BASE}${links.prev}>; rel="prev"`);
    lh.push(`<${SIMA_BASE}${links.last}>; rel="last"`);
    hdr.link = lh.join(', '); hdr['x-total-count'] = String(total);
    return { body: { items: items.slice((page - 1) * per, page * per), page, per_page: per, total, pages, links }, hdr };
  }

  /* ---- route handler ---- */
  function route(req) {
    const s = SIMA_STORE;
    const p = req.path.replace(/\/+$/, '') || '/';
    const m = req.method;
    let mm;
    if (p === '/' || p === '/v1') return json(200, { name: 'netlab inventory api', version: '2.4.1', docs: '/v1/docs', endpoints: ['/v1/health', '/v1/auth/token', '/v1/me', '/v1/devices', '/v1/devices/{id}', '/v1/sites', '/v1/jobs', '/v1/jobs/{id}', '/v1/deployments', '/v1/echo', '/v1/flaky'] });
    if (p === '/v1/docs') return json(200, { auth: 'POST /v1/auth/token with {"username","password"}, then Authorization: Bearer <access_token>', read: 'GET /v1/devices supports ?page=&per_page=&site=&status=&q=, follow links.next', write: 'POST PUT PATCH DELETE need a bearer token. PUT needs If-Match with the ETag from GET', errors: '401 no or bad token, 404 unknown id, 412 stale If-Match, 422 validation with errors[] of {field,message}, 429 rate limit with Retry-After', jobs: 'POST /v1/jobs {"type":"backup"|"deploy"|"rollback", "params":{...}} returns 202, GET /v1/jobs/{id} moves queued, running, done on successive polls' });
    if (p === '/v1/health') { if (m !== 'GET' && m !== 'HEAD') return err(405, 'method_not_allowed', `${m} not allowed on ${p}`, {}); return json(200, { status: 'ok', version: '2.4.1', uptime_seconds: 86400 + Math.floor(Date.now() / 1000) % 1000, time: LAB.util.now(), devices: s.devices.length }); }
    if (p === '/v1/echo') {
      const pb = parseBody(req);
      return json(200, { method: m, path: req.path, query: req.query, headers: req.headers, body: req.body || '', json: pb.bad ? null : pb.data });
    }
    if (p === '/v1/flaky') {
      s.flaky.calls++;
      if (!s.flaky.failed) { s.flaky.failed = true; return err(500, 'internal_error', 'upstream inventory database timed out, try again', { attempt: s.flaky.calls }); }
      return json(200, { status: 'recovered', attempt: s.flaky.calls, message: 'second attempt succeeded, retries work' });
    }
    if (p === '/v1/auth/token') {
      if (m !== 'POST') return err(405, 'method_not_allowed', 'use POST with {"username":"...","password":"..."}');
      const pb = parseBody(req); if (pb.bad) return pb.bad;
      const d = pb.data || {};
      const u = SIMA_USERS[d.username];
      if (!u || u.password !== d.password) return Object.assign(err(401, 'invalid_credentials', 'username or password is wrong'), { headers: Object.assign(baseHeaders(), { 'www-authenticate': 'Bearer realm="api.lab"' }) });
      const token = 'lab-' + LAB.util.id(24);
      s.tokens[token] = { user: d.username, expires: Date.now() + 3600 * 1000, issued: LAB.util.now() };
      return json(200, { access_token: token, token_type: 'Bearer', expires_in: 3600, scope: 'inventory:read inventory:write jobs:write' });
    }
    if (p === '/v1/me') {
      if (m !== 'GET') return err(405, 'method_not_allowed', `${m} not allowed on ${p}`);
      const a = auth(req); if (a.fail) { a.fail.headers = Object.assign(a.fail.headers, a.hdr); return a.fail; }
      const u = SIMA_USERS[a.user];
      return json(200, { username: a.user, role: u.role, teams: u.teams, email: u.email, token_expires_in: Math.round((Object.values(s.tokens).find(t => t.user === a.user).expires - Date.now()) / 1000) });
    }
    if (p === '/v1/sites') { if (m !== 'GET') return err(405, 'method_not_allowed', 'sites are read only'); return json(200, { items: SIMA_SITES.map(x => Object.assign({}, x, { net: undefined, devices: s.devices.filter(d => d.site === x.code).length })), total: SIMA_SITES.length }); }
    if ((mm = /^\/v1\/sites\/([^/]+)$/.exec(p))) {
      const site = SIMA_SITES.find(x => x.code === mm[1]); if (!site) return err(404, 'not_found', `site ${mm[1]} not found`);
      if (/^\/v1\/sites\/[^/]+$/.test(p) && m === 'GET') return json(200, Object.assign({}, site, { net: undefined, devices: s.devices.filter(d => d.site === site.code).map(d => ({ id: d.id, hostname: d.hostname, status: d.status })) }));
      return err(405, 'method_not_allowed', 'sites are read only');
    }
    if (p === '/v1/deployments') { if (m !== 'GET') return err(405, 'method_not_allowed', 'deployments change through POST /v1/jobs with type deploy or rollback'); return json(200, { items: Object.values(s.deployments) }); }
    if ((mm = /^\/v1\/deployments\/([^/]+)$/.exec(p))) { const d = s.deployments[mm[1]]; if (!d) return err(404, 'not_found', `environment ${mm[1]} not found`); if (m !== 'GET') return err(405, 'method_not_allowed', 'deployments change through POST /v1/jobs'); return json(200, d); }
    if (p === '/v1/devices') {
      if (m === 'GET' || m === 'HEAD') {
        let items = s.devices.slice();
        if (req.query.site) items = items.filter(d => d.site === req.query.site);
        if (req.query.status) items = items.filter(d => d.status === req.query.status);
        if (req.query.tag) items = items.filter(d => d.tags.includes(req.query.tag));
        if (req.query.q) { const q = req.query.q.toLowerCase(); items = items.filter(d => d.hostname.includes(q) || d.model.toLowerCase().includes(q) || d.mgmt_ip.includes(q)); }
        const pg = paginate(req, items.map(pub), '/v1/devices'); if (pg.bad) return pg.bad;
        return json(200, pg.body, pg.hdr);
      }
      if (m === 'POST') {
        const a = auth(req); if (a.fail) { a.fail.headers = Object.assign(a.fail.headers, a.hdr); return a.fail; }
        const pb = parseBody(req); if (pb.bad) return pb.bad;
        if (!pb.data) return err(400, 'bad_request', 'request body is empty');
        const errors = validate(pb.data, false, null); if (errors.length) return err(422, 'validation_error', `${errors.length} field(s) failed validation`, { errors });
        const now = LAB.util.now();
        const d = { id: s.nextId++, hostname: pb.data.hostname, site: pb.data.site, model: pb.data.model, platform: pb.data.platform || 'ios-xe', mgmt_ip: pb.data.mgmt_ip, status: pb.data.status || 'active', tags: pb.data.tags || [], serial: pb.data.serial || null, os_version: pb.data.os_version || null, description: pb.data.description || '', version: 1, created_at: now, updated_at: now, created_by: a.user };
        s.devices.push(d);
        return json(201, pub(d), { location: `/v1/devices/${d.id}`, etag: etagOf(d) });
      }
      return err(405, 'method_not_allowed', `${m} not allowed on /v1/devices, use /v1/devices/{id}`, {});
    }
    if ((mm = /^\/v1\/devices\/([^/]+)$/.exec(p))) {
      const id = /^\d+$/.test(mm[1]) ? Number(mm[1]) : null;
      const d = id === null ? s.devices.find(x => x.hostname === mm[1]) : s.devices.find(x => x.id === id);
      if (m === 'GET' || m === 'HEAD') {
        if (!d) return err(404, 'not_found', `device ${mm[1]} not found`);
        const inm = req.headers['if-none-match'];
        if (inm && inm.split(',').map(x => x.trim()).includes(etagOf(d))) return { status: 304, headers: Object.assign(baseHeaders(), { etag: etagOf(d) }), body: '' };
        return json(200, pub(d), { etag: etagOf(d), 'last-modified': new Date(d.updated_at).toUTCString() });
      }
      if (!['PUT', 'PATCH', 'DELETE'].includes(m)) return err(405, 'method_not_allowed', `${m} not allowed on ${p}`);
      const a = auth(req); if (a.fail) { a.fail.headers = Object.assign(a.fail.headers, a.hdr); return a.fail; }
      if (!d) return err(404, 'not_found', `device ${mm[1]} not found`);
      if (m === 'DELETE') { s.devices = s.devices.filter(x => x !== d); return { status: 204, headers: baseHeaders(), body: '' }; }
      const pb = parseBody(req); if (pb.bad) return pb.bad;
      if (!pb.data) return err(400, 'bad_request', 'request body is empty');
      const pre = ifMatchOk(req, d);
      if (m === 'PUT' && pre === null) return err(428, 'precondition_required', 'PUT replaces the whole resource and needs If-Match with the ETag from GET /v1/devices/' + d.id, { etag: etagOf(d) });
      if (pre === false) return err(412, 'precondition_failed', `If-Match does not match current ETag ${etagOf(d)}, the device changed since you read it. GET it again and retry`, { etag: etagOf(d) });
      const errors = validate(pb.data, m === 'PATCH', d.id); if (errors.length) return err(422, 'validation_error', `${errors.length} field(s) failed validation`, { errors });
      if (m === 'PUT') { FIELDS.forEach(k => { d[k] = pb.data[k] !== undefined ? pb.data[k] : (k === 'tags' ? [] : (k === 'platform' ? 'ios-xe' : (k === 'status' ? 'active' : (k === 'description' ? '' : null)))); }); }
      else FIELDS.forEach(k => { if (pb.data[k] !== undefined) d[k] = pb.data[k]; });
      d.version++; d.updated_at = LAB.util.now(); d.updated_by = a.user;
      return json(200, pub(d), { etag: etagOf(d) });
    }
    if (p === '/v1/jobs') {
      if (m === 'GET') { const pg = paginate(req, s.jobs.slice().reverse().map(jobView), '/v1/jobs'); if (pg.bad) return pg.bad; return json(200, pg.body, pg.hdr); }
      if (m !== 'POST') return err(405, 'method_not_allowed', `${m} not allowed on /v1/jobs`);
      const a = auth(req); if (a.fail) { a.fail.headers = Object.assign(a.fail.headers, a.hdr); return a.fail; }
      const pb = parseBody(req); if (pb.bad) return pb.bad;
      const d = pb.data || {};
      const errors = [];
      if (!d.type || typeof d.type !== 'string') errors.push({ field: 'type', message: 'is required, one of backup, deploy, rollback, audit, sync' });
      else if (!['backup', 'deploy', 'rollback', 'audit', 'sync'].includes(d.type)) errors.push({ field: 'type', message: 'must be one of backup, deploy, rollback, audit, sync' });
      if (d.params !== undefined && (typeof d.params !== 'object' || d.params === null || Array.isArray(d.params))) errors.push({ field: 'params', message: 'must be an object' });
      if ((d.type === 'deploy' || d.type === 'rollback')) {
        const pr = d.params || {};
        if (!pr.env) errors.push({ field: 'params.env', message: 'is required for deploy and rollback' });
        else if (!s.deployments[pr.env]) errors.push({ field: 'params.env', message: 'unknown environment, one of ' + Object.keys(s.deployments).join(', ') });
        if (!pr.version) errors.push({ field: 'params.version', message: 'is required for deploy and rollback' });
      }
      if (errors.length) return err(422, 'validation_error', `${errors.length} field(s) failed validation`, { errors });
      const j = { id: 'job-' + String(s.nextJob++).padStart(4, '0'), type: d.type, params: d.params || {}, status: 'queued', polls: 0, created_at: LAB.util.now(), updated_at: LAB.util.now(), user: a.user, result: null };
      s.jobs.push(j);
      return json(202, jobView(j), { location: `/v1/jobs/${j.id}`, 'retry-after': '1' });
    }
    if ((mm = /^\/v1\/jobs\/([^/]+)$/.exec(p))) {
      const j = s.jobs.find(x => x.id === mm[1]);
      if (!j) return err(404, 'not_found', `job ${mm[1]} not found`);
      if (m === 'GET') { advanceJob(j); return json(200, jobView(j), j.status === 'done' ? {} : { 'retry-after': '1' }); }
      if (m === 'DELETE') { const a = auth(req); if (a.fail) return a.fail; if (j.status === 'done') return err(409, 'conflict', 'job already finished'); j.status = 'cancelled'; return json(200, jobView(j)); }
      return err(405, 'method_not_allowed', `${m} not allowed on ${p}`);
    }
    return err(404, 'not_found', `no route for ${m} ${req.path}`, { hint: 'GET /v1 lists the endpoints' });
  }

  function handler(req) {
    if (req.host !== 'api.lab') return null;
    const s = SIMA_STORE;
    const t0 = Date.now();
    s.stats.requests++;
    let res;
    /* rate limit, kisa pencerede her 7. istek 429 */
    if (s.rl.enabled) {
      const now = Date.now();
      s.rl.times = s.rl.times.filter(t => now - t < SIMA_RL_WINDOW);
      if (s.rl.times.length && now - s.rl.times[s.rl.times.length - 1] >= SIMA_RL_WINDOW) s.rl.times = [];
      s.rl.times.push(now);
      if (s.rl.times.length % SIMA_RL_EVERY === 0) {
        s.rl.times = []; s.rl.limited++;
        res = err(429, 'rate_limited', `burst limit of ${SIMA_RL_EVERY - 1} requests per ${SIMA_RL_WINDOW / 1000}s exceeded, retry after 1 second`);
        res.headers['retry-after'] = '1'; res.headers['x-ratelimit-limit'] = String(SIMA_RL_EVERY - 1); res.headers['x-ratelimit-remaining'] = '0';
      }
    }
    if (!res) {
      try { res = route(req); } catch (e) { res = err(500, 'internal_error', 'unhandled exception in api.lab, ' + (e.message || e)); }
      if (s.rl.enabled && res.headers) { res.headers['x-ratelimit-limit'] = String(SIMA_RL_EVERY - 1); res.headers['x-ratelimit-remaining'] = String(Math.max(0, SIMA_RL_EVERY - 1 - s.rl.times.length)); }
    }
    if (res.status >= 400) s.stats.errors++;
    if (req.method === 'HEAD') res.body = '';
    const entry = { seq: ++s.reqSeq, t: LAB.util.now(), method: req.method, path: req.path + (Object.keys(req.query).length ? '?' + new URLSearchParams(req.query).toString() : ''), status: res.status, ms: Date.now() - t0, auth: !!req.headers.authorization, ua: req.headers['user-agent'] || '', ifMatch: req.headers['if-match'] || null };
    s.log.push(entry); if (s.log.length > 300) s.log.splice(0, s.log.length - 300);
    return res;
  }
  LAB.registerHttp(handler);
  /* shell.js execSimple COMMANDS[name] || LAB_EXT.commands[name] sirasiyla bakar, yani sim-http.js'in registerExt ile
     verdigi curl hic calismaz, eski linux-lab curl'u kazanir. Lab servislerine curl ile ulasmak icin burada baglanir. */
  if (typeof COMMANDS !== 'undefined' && LAB_EXT.commands.curl && COMMANDS.curl !== LAB_EXT.commands.curl) COMMANDS.curl = LAB_EXT.commands.curl;

  /* ---- api-lab yardimci komutu ---- */
  function apiLab(args) {
    const sh = this;
    const sub = args[0] || 'status';
    const s = SIMA_STORE;
    if (sub === 'reset') { SIMA_reset(); return ok('api.lab reset, 60 device seeded, token ve job listesi temizlendi, rate limit ve flaky sayaclari sifirlandi\n'); }
    if (sub === 'seed') { s.devices = SIMA_seedDevices(); s.nextId = 61; return ok('api.lab device listesi yeniden seed edildi, 60 device, token ve job listesi korundu\n'); }
    if (sub === 'log') {
      const n = Math.min(parseInt(args[1] || '20', 10) || 20, 100);
      const rows = s.log.slice(-n);
      if (!rows.length) return ok('api.lab log bos, henuz istek yok\n');
      const lines = rows.map(r => `${String(r.seq).padStart(4)}  ${r.t.slice(11, 19)}  ${r.method.padEnd(6)} ${String(r.status).padEnd(3)} ${r.auth ? 'auth ' : '     '} ${r.path}${r.ifMatch ? '  If-Match: ' + r.ifMatch : ''}`);
      return ok(`${'seq'.padStart(4)}  time      method status        path\n` + lines.join('\n') + `\n${rows.length} of ${s.log.length} requests, ${s.stats.errors} errors total, ${s.rl.limited} rate limited\n`);
    }
    if (sub === 'status') {
      return ok([`api.lab  https://api.lab/v1  version 2.4.1`, `devices  ${s.devices.length} (${SIMA_STATUSES.map(x => x + ' ' + s.devices.filter(d => d.status === x).length).join(', ')})`, `tokens   ${Object.keys(s.tokens).length} active`, `jobs     ${s.jobs.length} (${s.jobs.filter(j => j.status === 'done').length} done)`, `deploy   staging ${s.deployments.staging.version}, production ${s.deployments.production.version}`, `requests ${s.stats.requests}, errors ${s.stats.errors}, rate limited ${s.rl.limited}, rate limit ${s.rl.enabled ? 'on' : 'off'}`, `flaky    ${s.flaky.failed ? 'armed again after api-lab reset, /v1/flaky now returns 200' : '/v1/flaky will return 500 once'}`].join('\n') + '\n');
    }
    if (sub === 'jobs') { if (!s.jobs.length) return ok('job yok\n'); return ok(s.jobs.map(j => `${j.id}  ${j.type.padEnd(9)} ${j.status.padEnd(8)} polls ${j.polls}  ${JSON.stringify(j.params)}`).join('\n') + '\n'); }
    if (sub === 'devices') { const site = args[1]; return ok(s.devices.filter(d => !site || d.site === site).map(d => `${String(d.id).padStart(3)}  ${d.hostname.padEnd(16)} ${d.site.padEnd(8)} ${d.model.padEnd(16)} ${d.mgmt_ip.padEnd(14)} ${d.status}`).join('\n') + '\n'); }
    if (sub === 'ratelimit') { if (args[1] === 'off') { s.rl.enabled = false; return ok('rate limit kapali\n'); } if (args[1] === 'on') { s.rl.enabled = true; s.rl.times = []; return ok('rate limit acik, 2 saniyelik pencerede 7. istek 429 alir\n'); } return ok(`rate limit ${s.rl.enabled ? 'on' : 'off'}, ${s.rl.limited} istek 429 aldi\n`); }
    if (sub === 'flaky') { s.flaky = { failed: false, calls: 0 }; return ok('/v1/flaky yeniden kuruldu, ilk istek 500, sonraki 200\n'); }
    if (sub === 'docs') { const r = LAB.http({ method: 'GET', url: SIMA_BASE + '/v1/docs' }); return ok(r.body); }
    return fail(`api-lab: bilinmeyen alt komut ${sub}. Kullanim, api-lab [status|log [n]|reset|seed|jobs|devices [site]|ratelimit on|off|flaky|docs]`);
  }
  registerExt({
    commands: { 'api-lab': apiLab },
    manual: {
      'api-lab': { d: 'api.lab inventory API simülatörü yardımcısı. Durumu gösterir, istek log\'unu listeler, veriyi sıfırlar', u: ['api-lab status', 'api-lab log [n]', 'api-lab reset', 'api-lab seed', 'api-lab jobs', 'api-lab devices [site]', 'api-lab ratelimit on|off', 'api-lab flaky', 'api-lab docs'], e: ['api-lab log 20', 'api-lab reset', 'curl -s https://api.lab/v1/docs'] },
    },
    onReset: () => SIMA_reset(),
  });
})();

/* Python requests shim'i, py.js acilista bu dosyalari Pyodide'de /lib/ndlab altina yazar */
['__init__.py', 'adapters.py', 'api.py', 'auth.py', 'exceptions.py', 'models.py', 'sessions.py', 'status_codes.py', 'structures.py', 'utils.py', 'packages/__init__.py']
  .forEach(f => LAB.registerPy('requests/' + f, 'py/requests/' + f));
['__init__.py', 'exceptions.py', 'util/__init__.py', 'util/retry.py', 'util/timeout.py']
  .forEach(f => LAB.registerPy('urllib3/' + f, 'py/urllib3/' + f));
