/* Offline icin onbellek. Pyodide ve wheel dosyalari buyuk, ilk calismada onbellege alinir. Surum degisince eski onbellek silinir. */
const CACHE = 'netdevops-lab-v2';
const FILES = ['./', 'index.html', 'style.css', 'lab.js', 'sim-http.js', 'sim-device.js', 'sim-api.js', 'sim-ci.js', 'sim-docker.js', 'sim-k8s.js', 'sim-ansible.js', 'sim-terraform.js', 'py.js', 'missions-python.js', 'missions-test.js', 'missions-git.js', 'missions-api.js', 'missions-ci.js', 'missions-docker.js', 'missions-k8s.js', 'missions-yang.js', 'missions-netconf.js', 'missions-restconf.js', 'missions-gnmi.js', 'missions-ansible.js', 'missions-terraform.js', 'app.js', 'explain-db-nd.js', '../linux-lab/explain.js', '../linux-lab/explain-db.js', 'vendor/js-yaml.min.js', '../linux-lab/shell.js', '../linux-lab/ext-git.js', '../linux-lab/ext-vim.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== CACHE + '-big').map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const big = /\/pyodide\/|\/py\//.test(e.request.url);
  if (big) {
    e.respondWith(caches.open(CACHE + '-big').then(async c => { const hit = await c.match(e.request, { ignoreSearch: true }); if (hit && !/\/py\//.test(e.request.url)) return hit; try { const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; } catch (err) { return hit || Response.error(); } }));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
