'use strict';
/* REST API ve Python requests bolumu. api.lab simulatoru sim-api.js, requests shim'i py/requests. Durum SIMA_STORE. */

const MA_H = '/home/burak/apiclient';
const MA_BASE = 'https://api.lab';
const MA_read = (sh, p) => { const n = sh.node(p); return n && n.t === 'f' ? n.d : null; };
const MA_has = (sh, p, re) => { const d = MA_read(sh, p); return d !== null && (re instanceof RegExp ? re.test(d) : d.includes(re)); };
const MA_py = sh => sh.lastPy || { argv: [], code: 1, stdout: '', stderr: '' };
const MA_ran = (sh, name) => (MA_py(sh).argv || []).some(a => String(a).endsWith(name));
const MA_logHas = (method, pathRe, status) => SIMA_STORE.log.some(e => e.method === method && pathRe.test(e.path) && (status === undefined || e.status === status));
const MA_recent = n => SIMA_STORE.log.slice(-n);
const MA_dev = hostname => SIMA_STORE.devices.find(d => d.hostname === hostname);
/* her gorevin setup'i, dizin, rate limit penceresi, flaky */
function MA_prep(sh, files) {
  sh.run('mkdir -p ~/apiclient');
  SIMA_STORE.rl.times = []; SIMA_STORE.rl.enabled = true;
  Object.entries(files || {}).forEach(([name, text]) => { if (!sh.node(MA_H + '/' + name)) sh.writeFile(MA_H + '/' + name, text, false, 'nano'); });
}

const MA_CLIENT_PY = `"""api.lab inventory client. Kullanim, from client import DeviceClient"""
import requests


class DeviceClient:
    def __init__(self, base_url='https://api.lab', username='burak', password='lab123', timeout=5):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers['Accept'] = 'application/json'
        self.login(username, password)

    def login(self, username, password):
        r = self.session.post(self.base_url + '/v1/auth/token', json={'username': username, 'password': password}, timeout=self.timeout)
        r.raise_for_status()
        self.session.headers['Authorization'] = 'Bearer ' + r.json()['access_token']

    def _request(self, method, path, **kwargs):
        kwargs.setdefault('timeout', self.timeout)
        r = self.session.request(method, self.base_url + path, **kwargs)
        r.raise_for_status()
        return r

    def list(self, **params):
        params.setdefault('per_page', 50)
        url = '/v1/devices'
        while url:
            data = self._request('GET', url, params=params).json()
            params = None
            yield from data['items']
            url = data['links']['next']

    def get(self, device_id):
        return self._request('GET', f'/v1/devices/{device_id}').json()

    def create(self, **fields):
        return self._request('POST', '/v1/devices', json=fields).json()

    def update(self, device_id, **fields):
        return self._request('PATCH', f'/v1/devices/{device_id}', json=fields).json()

    def delete(self, device_id):
        self._request('DELETE', f'/v1/devices/{device_id}')
`;

const MA_CLIENT_STARTER = `"""api.lab inventory client. TODO, DeviceClient sinifini tamamla.

Beklenen arayuz
    c = DeviceClient()                      login olur, token'i Session header'ina koyar
    for d in c.list(site='ams-dc1'): ...    links.next bitene kadar sayfalari gezer
    c.get(1)                                 GET /v1/devices/1
    c.create(hostname=..., site=..., model=..., mgmt_ip=...)   POST, 201
    c.update(1, status='maintenance')        PATCH
"""
import requests


class DeviceClient:
    def __init__(self, base_url='https://api.lab', username='burak', password='lab123', timeout=5):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        # TODO login, token al ve self.session.headers['Authorization'] ayarla

    def list(self, **params):
        raise NotImplementedError

    def get(self, device_id):
        raise NotImplementedError

    def create(self, **fields):
        raise NotImplementedError

    def update(self, device_id, **fields):
        raise NotImplementedError
`;

const MA_NETCLI_PY = `"""netcli, api.lab icin operasyon CLI'si. Ornek, python3 netcli.py --log-level DEBUG backup --site ams-dc1 --wait"""
import argparse
import logging
import sys
import time

import requests

from client import DeviceClient

log = logging.getLogger('netcli')


class NetCli(DeviceClient):
    """DeviceClient'in her istegi logladigi surumu, ayrica job metodlari ekler."""

    def _request(self, method, path, **kwargs):
        kwargs.setdefault('timeout', self.timeout)
        r = self.session.request(method, self.base_url + path, **kwargs)
        log.debug('%s %s -> %s in %.0f ms', method, path, r.status_code, r.elapsed.total_seconds() * 1000)
        r.raise_for_status()
        return r

    def create_job(self, job_type, **params):
        return self._request('POST', '/v1/jobs', json={'type': job_type, 'params': params}).json()

    def get_job(self, job_id):
        return self._request('GET', f'/v1/jobs/{job_id}').json()


def cmd_list(c, args):
    params = {k: v for k, v in (('site', args.site), ('status', args.status)) if v}
    n = 0
    for d in c.list(**params):
        print(f"{d['id']:>3} {d['hostname']:<16} {d['site']:<8} {d['status']}")
        n += 1
    log.info('%d device listed', n)
    return 0


def cmd_backup(c, args):
    job = c.create_job('backup', site=args.site)
    log.info('job %s created, status %s', job['id'], job['status'])
    if not args.wait:
        print(job['id'], job['status'])
        return 0
    while job['status'] not in ('done', 'failed', 'cancelled'):
        time.sleep(1)
        job = c.get_job(job['id'])
        log.info('job %s status %s', job['id'], job['status'])
    print(job['id'], job['status'])
    if job['status'] == 'done':
        log.info('result %s', job['result'])
        return 0
    return 1


def main(argv=None):
    p = argparse.ArgumentParser(prog='netcli', description='api.lab inventory CLI')
    p.add_argument('--log-level', default='WARNING', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])
    p.add_argument('--base-url', default='https://api.lab')
    sub = p.add_subparsers(dest='cmd', required=True)
    pl = sub.add_parser('list', help='device listele')
    pl.add_argument('--site')
    pl.add_argument('--status')
    pb = sub.add_parser('backup', help='backup job baslat')
    pb.add_argument('--site', required=True)
    pb.add_argument('--wait', action='store_true', help='job done olana kadar polla')
    args = p.parse_args(argv)
    logging.basicConfig(level=getattr(logging, args.log_level), stream=sys.stderr, force=True,
                        format='%(asctime)s %(levelname)s %(name)s %(message)s')
    try:
        c = NetCli(base_url=args.base_url)
        return cmd_list(c, args) if args.cmd == 'list' else cmd_backup(c, args)
    except requests.exceptions.RequestException as e:
        log.error('request failed, %s', e)
        return 2


if __name__ == '__main__':
    sys.exit(main())
`;

CHAPTERS.push({
  id: 'api', icon: '🔌', title: 'REST API ve Python requests', sub: 'curl, status code, auth, pagination, ETag, retry, async job',
  missions: [
    { id: 'api1', title: 'Sunucuya merhaba', xp: 20,
      story: "Ekibin yeni inventory servisi api.lab yayına girdi. Otomasyon yazmadan önce bir network mühendisi gibi davran, önce elle bak. curl -i hem status line'ı hem response header'larını basar, body JSON gelir.",
      task: "`curl -i https://api.lab/v1/health` ile health endpoint'ine istek at, status code ve Content-Type header'ını incele.",
      hint: "-i include demek, header'ları da gösterir. -s ile progress çıktısı susar, ikisi birlikte kullanılır.",
      solution: 'curl -i https://api.lab/v1/health',
      setup: sh => MA_prep(sh),
      check: (sh, c) => /curl\s.*(-i|--include)\b/.test(c.line) && /HTTP\/1\.1 200/.test(c.out) && /"status": "ok"/.test(c.out) && MA_logHas('GET', /^\/v1\/health$/, 200) },
    { id: 'api2', title: 'Status code dili', xp: 25,
      story: "REST API'ler konuşmayı status code ile yapar. 2xx iyi, 4xx senin hatan, 5xx onların hatası. Olmayan bir device iste ve token'sız bir DELETE dene, sunucunun ne dediğini body'deki message alanından oku.",
      task: "Önce `curl -i https://api.lab/v1/devices/999` ile 404 al, sonra `curl -i -X DELETE https://api.lab/v1/devices/1` ile 401 al. -X ile HTTP method seçilir.",
      hint: "İki ayrı komut. 401 cevabındaki WWW-Authenticate header'ına ve JSON body'deki message alanına dikkat, sana ne yapman gerektiğini söylüyor.",
      solution: 'curl -i https://api.lab/v1/devices/999\ncurl -i -X DELETE https://api.lab/v1/devices/1',
      setup: sh => MA_prep(sh),
      check: (sh, c) => MA_logHas('GET', /^\/v1\/devices\/999$/, 404) && MA_logHas('DELETE', /^\/v1\/devices\/1$/, 401) && /-X\s+DELETE/.test(c.line) && /401/.test(c.out) && !!SIMA_STORE.devices.find(d => d.id === 1) },
    { id: 'api3', title: 'JSON ayrıştır', xp: 25,
      story: "Sunucu pretty print etse de 60 device'ı gözle saymak işkence. Terminalde JSON'u python3 ile süz. jq bu lab'da yok, python3 -c ile json modülü aynı işi görür. Liste endpoint'i page, per_page, total, items ve links alanları döner.",
      task: "`curl -s 'https://api.lab/v1/devices?per_page=5'` çıktısını pipe ile python3'e ver, total değerini ve items içindeki hostname'leri yazdır.",
      hint: "Tek satır, `curl -s 'https://api.lab/v1/devices?per_page=5' | python3 -c \"import json,sys; d=json.load(sys.stdin); print(d['total']); print([x['hostname'] for x in d['items']])\"`",
      solution: `curl -s 'https://api.lab/v1/devices?per_page=5' | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['total']); print([x['hostname'] for x in d['items']])"`,
      setup: sh => MA_prep(sh),
      check: (sh, c) => /curl\s.*\|\s*python3?\b/.test(c.line) && /\b60\b/.test(c.out) && SIMA_STORE.devices.slice(0, 5).every(d => c.out.includes(d.hostname)) && MA_logHas('GET', /^\/v1\/devices\?/, 200) },
    { id: 'api4', title: 'Token al ve kullan', xp: 30,
      story: "Yazma işlemleri bearer token ister. POST /v1/auth/token JSON body ile username ve password alır, access_token döner. Token'ı shell değişkenine koy, sonraki istekte Authorization header'ı ile gönder. Kullanıcı burak, şifre lab123.",
      task: "Token'ı TOKEN değişkenine al, ardından `curl -s -H \"Authorization: Bearer $TOKEN\" https://api.lab/v1/me` ile kendi profilini çek.",
      hint: "Tek satır, `TOKEN=$(curl -s -X POST -H 'Content-Type: application/json' -d '{\"username\":\"burak\",\"password\":\"lab123\"}' https://api.lab/v1/auth/token | python3 -c \"import json,sys; print(json.load(sys.stdin)['access_token'])\")`",
      solution: `TOKEN=$(curl -s -X POST -H 'Content-Type: application/json' -d '{"username":"burak","password":"lab123"}' https://api.lab/v1/auth/token | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")\ncurl -s -H "Authorization: Bearer $TOKEN" https://api.lab/v1/me`,
      setup: sh => MA_prep(sh),
      check: (sh, c) => /^lab-/.test(sh.env.TOKEN || '') && /\/v1\/me/.test(c.line) && /"username": "burak"/.test(c.out) && MA_logHas('POST', /^\/v1\/auth\/token$/, 200) && SIMA_STORE.log.some(e => e.method === 'GET' && e.path === '/v1/me' && e.status === 200 && e.auth) },
    { id: 'api5', title: 'requests ile ilk script', xp: 30,
      story: "Shell'de curl güzel ama otomasyon Python'da yaşar. requests kütüphanesi HTTP'yi insana uygun hale getirir. Response nesnesinde status_code, headers, text ve `json()` var. timeout'u her zaman ver, takılı kalan script gece üçte seni arar.",
      task: "nano ile ~/apiclient/health.py yaz. requests.get ile /v1/health'i timeout=5 ile çek, status_code'u, Content-Type header'ını ve `json()['status']` değerini ayrı satırlarda yazdır. Sonra `python3 ~/apiclient/health.py` ile çalıştır.",
      hint: "`r = requests.get('https://api.lab/v1/health', timeout=5)` sonra `print(r.status_code)`, `print(r.headers['Content-Type'])` ve `print(r.json()['status'])`. headers sözlüğü büyük küçük harf duyarsız.",
      solution: 'nano ~/apiclient/health.py\npython3 ~/apiclient/health.py',
      setup: sh => MA_prep(sh, { 'health.py': '# TODO requests ile /v1/health cek, status_code, Content-Type ve status yazdir\nimport requests\n\nBASE = "https://api.lab"\n' }),
      editorContent: { '~/apiclient/health.py': `import requests\n\nBASE = 'https://api.lab'\n\nr = requests.get(BASE + '/v1/health', timeout=5)\nprint(r.status_code)\nprint(r.headers['Content-Type'])\nprint(r.json()['status'])\n` },
      check: (sh, c) => MA_ran(sh, 'health.py') && MA_py(sh).code === 0 && /^200$/m.test(MA_py(sh).stdout) && /application\/json/.test(MA_py(sh).stdout) && /^ok$/m.test(MA_py(sh).stdout) && MA_has(sh, MA_H + '/health.py', /import requests/) && MA_has(sh, MA_H + '/health.py', /timeout/) },
    { id: 'api6', title: 'Session ve token', xp: 35,
      story: "Her istekte token header'ını elle yazmak hata üretir. requests.Session header'ları, auth'u ve cookie'leri saklar. Token'ı bir kez al, Session.headers'a koy, sonraki tüm istekler onu taşır.",
      task: "nano ile ~/apiclient/session.py yaz. POST /v1/auth/token ile token al, bir Session oluştur, Authorization header'ını Session'a koy, GET /v1/me ile username ve role'ü `burak netops` biçiminde tek satırda yazdır. `python3 ~/apiclient/session.py` ile çalıştır.",
      hint: "`s = requests.Session()` sonra `s.headers['Authorization'] = 'Bearer ' + token`, ardından `me = s.get(BASE + '/v1/me', timeout=5).json()` ve `print(me['username'], me['role'])`",
      solution: 'nano ~/apiclient/session.py\npython3 ~/apiclient/session.py',
      setup: sh => MA_prep(sh),
      editorContent: { '~/apiclient/session.py': `import requests\n\nBASE = 'https://api.lab'\n\nr = requests.post(BASE + '/v1/auth/token', json={'username': 'burak', 'password': 'lab123'}, timeout=5)\nr.raise_for_status()\ntoken = r.json()['access_token']\n\ns = requests.Session()\ns.headers['Authorization'] = 'Bearer ' + token\nme = s.get(BASE + '/v1/me', timeout=5).json()\nprint(me['username'], me['role'])\n` },
      check: (sh, c) => MA_ran(sh, 'session.py') && MA_py(sh).code === 0 && /burak netops/.test(MA_py(sh).stdout) && MA_has(sh, MA_H + '/session.py', /Session\(/) && MA_recent(3).some(e => e.method === 'GET' && e.path === '/v1/me' && e.status === 200 && e.auth) },
    { id: 'api7', title: 'Pagination döngüsü', xp: 40,
      story: "60 device var ama bir sayfada en fazla 50 gelir, varsayılan 10. İyi bir client links.next null olana kadar yürür. Cevapta links.next relative path gelir, base URL ile birleştir. Bugün 60, gelecek yıl 600 olacak, kod aynı kalmalı.",
      task: "nano ile ~/apiclient/pages.py yaz. per_page=25 ile başla, links.next null olana kadar sayfaları takip et, tüm device'ları topla. Önce toplam sayıyı tek başına bir satırda yazdır, sonra her site için `site sayı` satırı bas. `python3 ~/apiclient/pages.py` ile çalıştır.",
      hint: "`url = '/v1/devices?per_page=25'` ile başla, `while url` döngüsünde `d = requests.get(BASE + url, timeout=5).json()`, `items += d['items']`, `url = d['links']['next']`. Sayım için collections.Counter.",
      solution: 'nano ~/apiclient/pages.py\npython3 ~/apiclient/pages.py',
      setup: sh => MA_prep(sh),
      editorContent: { '~/apiclient/pages.py': `from collections import Counter\n\nimport requests\n\nBASE = 'https://api.lab'\n\nitems = []\nurl = '/v1/devices?per_page=25'\nwhile url:\n    r = requests.get(BASE + url, timeout=5)\n    r.raise_for_status()\n    data = r.json()\n    items.extend(data['items'])\n    url = data['links']['next']\n\nprint(len(items))\nfor site, n in sorted(Counter(d['site'] for d in items).items()):\n    print(site, n)\n` },
      check: (sh, c) => { if (!MA_ran(sh, 'pages.py') || MA_py(sh).code !== 0) return false; const out = MA_py(sh).stdout; const total = SIMA_STORE.devices.length; const counts = {}; SIMA_STORE.devices.forEach(d => { counts[d.site] = (counts[d.site] || 0) + 1; }); return new RegExp('^' + total + '$', 'm').test(out) && Object.entries(counts).every(([s, n]) => new RegExp('^' + s + '\\s+' + n + '$', 'm').test(out)) && MA_has(sh, MA_H + '/pages.py', /next/) && MA_recent(6).filter(e => /^\/v1\/devices\?.*page=/.test(e.path) && e.status === 200).length >= 3; } },
    { id: 'api8', title: 'Hataları yakala', xp: 40,
      story: "Prod script'i 404'te traceback ile ölmemeli. raise_for_status 4xx ve 5xx'te HTTPError fırlatır, e.response içinde sunucunun cevabı durur. Olmayan host ConnectionError verir, Timeout ayrı bir sınıf, hepsi RequestException'dan türer. Hangi hatayı yakaladığına göre mesaj ver.",
      task: "nano ile ~/apiclient/errors.py yaz. /v1/devices/999 için raise_for_status ile HTTPError yakala ve `http 404 not_found` yazdır. `https://nope.lab/v1/health` için ConnectionError yakala ve `baglanti hatasi nope.lab` yazdır. `python3 ~/apiclient/errors.py` ile çalıştır.",
      hint: "try bloğunda `r = requests.get(...)` ve `r.raise_for_status()`, `except requests.exceptions.HTTPError as e` ile `print('http', e.response.status_code, e.response.json()['error'])`. İkinci istek için `except requests.exceptions.ConnectionError`.",
      solution: 'nano ~/apiclient/errors.py\npython3 ~/apiclient/errors.py',
      setup: sh => MA_prep(sh),
      editorContent: { '~/apiclient/errors.py': `import requests\nfrom requests.exceptions import HTTPError, ConnectionError, Timeout\n\nBASE = 'https://api.lab'\n\ntry:\n    r = requests.get(BASE + '/v1/devices/999', timeout=5)\n    r.raise_for_status()\n    print('bulundu', r.json()['hostname'])\nexcept HTTPError as e:\n    print('http', e.response.status_code, e.response.json()['error'])\n\ntry:\n    requests.get('https://nope.lab/v1/health', timeout=3)\nexcept ConnectionError:\n    print('baglanti hatasi nope.lab')\nexcept Timeout:\n    print('timeout nope.lab')\n` },
      check: (sh, c) => MA_ran(sh, 'errors.py') && MA_py(sh).code === 0 && /http 404 not_found/.test(MA_py(sh).stdout) && /baglanti hatasi nope\.lab/.test(MA_py(sh).stdout) && MA_has(sh, MA_H + '/errors.py', /raise_for_status/) && MA_has(sh, MA_H + '/errors.py', /HTTPError/) && MA_has(sh, MA_H + '/errors.py', /ConnectionError/) },
    { id: 'api9', title: 'DeviceClient modülü', xp: 50,
      story: "Artık tekrar eden kodu bir sınıfa topla. DeviceClient login olur, Session tutar, list ile sayfaları gezer, get, create ve update yapar. Modülü ayrı dosyaya koy ki CLI ve testler onu import etsin. Script'i bulunduğu dizinden çalıştırmak import'u kolaylaştırır, Python cwd'yi sys.path'e ekler.",
      task: "nano ile ~/apiclient/client.py içindeki DeviceClient sınıfını tamamla, metodlar list, get, create ve update. Sonra ~/apiclient/use_client.py ile ams-lab-99 adında, site ams-dc1, model C8000V, mgmt_ip 10.10.9.99 bir device oluştur, status'unu maintenance yap ve `id hostname status` yazdır. `cd ~/apiclient && python3 use_client.py` ile çalıştır.",
      hint: "create POST /v1/devices json= ile 201 ve body'de id döner, update PATCH /v1/devices/{id}. Her metodda raise_for_status olsun, list bir generator olabilir ve links.next'i takip eder.",
      solution: 'nano ~/apiclient/client.py\nnano ~/apiclient/use_client.py\ncd ~/apiclient && python3 use_client.py',
      setup: sh => { MA_prep(sh, { 'client.py': MA_CLIENT_STARTER }); SIMA_STORE.devices = SIMA_STORE.devices.filter(d => d.hostname !== 'ams-lab-99'); },
      editorContent: { '~/apiclient/client.py': MA_CLIENT_PY, '~/apiclient/use_client.py': `from client import DeviceClient\n\nc = DeviceClient()\nd = c.create(hostname='ams-lab-99', site='ams-dc1', model='C8000V', mgmt_ip='10.10.9.99', tags=['lab'])\nd = c.update(d['id'], status='maintenance')\nprint(d['id'], d['hostname'], d['status'])\n` },
      check: (sh, c) => { const d = MA_dev('ams-lab-99'); const cp = MA_read(sh, MA_H + '/client.py') || ''; return !!d && d.status === 'maintenance' && d.site === 'ams-dc1' && /class DeviceClient/.test(cp) && /def list\b/.test(cp) && /def get\b/.test(cp) && /def create\b/.test(cp) && /def update\b/.test(cp) && !/NotImplementedError/.test(cp) && MA_ran(sh, 'use_client.py') && MA_py(sh).code === 0 && new RegExp(d.id + ' ams-lab-99 maintenance').test(MA_py(sh).stdout) && MA_logHas('POST', /^\/v1\/devices$/, 201) && MA_logHas('PATCH', new RegExp('^/v1/devices/' + d.id + '$'), 200); } },
    { id: 'api10', title: 'PUT, ETag ve 412', xp: 45,
      story: "PATCH kısmi günceller, PUT kaynağın tamamını değiştirir. İki mühendis aynı device'ı aynı anda düzenlerse son yazan kazanır ve birinin değişikliği kaybolur. ETag bunu çözer. GET'te gelen ETag'i If-Match ile geri gönder, sunucu sürüm değiştiyse 412 döner. api.lab PUT'ta If-Match'i zorunlu tutar, hiç göndermezsen 428 alırsın.",
      task: "nano ile ~/apiclient/etag.py yaz. Device 1'i GET ile al ve ETag header'ını sakla. Önce If-Match değeri \"stale\" ile PUT dene ve status'u yazdır, sonra doğru ETag ile description'ı `edited by burak` yapan PUT at ve status'u yazdır. Çıktıda 412 ve 200 ayrı satırlarda olmalı. `python3 ~/apiclient/etag.py` ile çalıştır.",
      hint: "`body = r.json()` sonra id, links, version, created_at, updated_at alanlarını pop et, `body['description'] = 'edited by burak'`, PUT'u `headers={'If-Match': etag}` ile gönder. Token için Session kullan.",
      solution: 'nano ~/apiclient/etag.py\npython3 ~/apiclient/etag.py',
      setup: sh => MA_prep(sh),
      editorContent: { '~/apiclient/etag.py': `import requests\n\nBASE = 'https://api.lab'\n\ns = requests.Session()\ntok = s.post(BASE + '/v1/auth/token', json={'username': 'burak', 'password': 'lab123'}, timeout=5).json()['access_token']\ns.headers['Authorization'] = 'Bearer ' + tok\n\nr = s.get(BASE + '/v1/devices/1', timeout=5)\nr.raise_for_status()\netag = r.headers['ETag']\nbody = r.json()\nfor k in ('id', 'links', 'version', 'created_at', 'updated_at'):\n    body.pop(k, None)\nbody['description'] = 'edited by burak'\n\nstale = s.put(BASE + '/v1/devices/1', json=body, headers={'If-Match': '"stale"'}, timeout=5)\nprint(stale.status_code)\n\nfresh = s.put(BASE + '/v1/devices/1', json=body, headers={'If-Match': etag}, timeout=5)\nprint(fresh.status_code)\nprint('new etag', fresh.headers.get('ETag'))\n` },
      check: (sh, c) => { const d = SIMA_STORE.devices.find(x => x.id === 1); return MA_ran(sh, 'etag.py') && MA_py(sh).code === 0 && /^412$/m.test(MA_py(sh).stdout) && /^200$/m.test(MA_py(sh).stdout) && !!d && d.description === 'edited by burak' && MA_logHas('PUT', /^\/v1\/devices\/1$/, 412) && MA_logHas('PUT', /^\/v1\/devices\/1$/, 200) && MA_has(sh, MA_H + '/etag.py', /If-Match/); } },
    { id: 'api11', title: 'Retry ve backoff', xp: 55,
      story: "api.lab kısa pencerede 7. isteği 429 ile keser ve Retry-After header'ı verir. /v1/flaky ilk çağrıda 500 döner, ikincisinde düzelir. Prod'da ikisi de olur. Kör döngü yazma, 429'da Retry-After kadar bekle, 5xx'te üstel backoff uygula, en fazla 5 deneme. requests'in HTTPAdapter max_retries ayarı bu lab'da no op, döngüyü kendin yaz.",
      task: "nano ile ~/apiclient/retry.py yaz. `get_with_retry(session, url, retries=5)` fonksiyonu 429'da Retry-After saniye bekleyip tekrar denesin, 5xx'te 0.5, 1, 2 saniye backoff ile tekrar denesin. /v1/flaky'yi çek ve `flaky 200` yazdır, ardından /v1/devices?per_page=5 adresini 10 kez üst üste çek ve hepsi 200 ise `devices ok 10` yazdır. `python3 ~/apiclient/retry.py` ile çalıştır.",
      hint: "`for attempt in range(retries)` döngüsünde `r = session.get(url, timeout=5)`. 429 ise `time.sleep(int(r.headers.get('Retry-After', '1')))` ve continue, status 500 ve üstü ise `time.sleep(0.5 * 2 ** attempt)` ve continue, aksi halde return r.",
      solution: 'nano ~/apiclient/retry.py\npython3 ~/apiclient/retry.py',
      setup: sh => { MA_prep(sh); SIMA_STORE.flaky = { failed: false, calls: 0 }; },
      editorContent: { '~/apiclient/retry.py': `import time\n\nimport requests\n\nBASE = 'https://api.lab'\n\n\ndef get_with_retry(session, url, retries=5):\n    last = None\n    for attempt in range(retries):\n        r = session.get(url, timeout=5)\n        last = r\n        if r.status_code == 429:\n            wait = int(r.headers.get('Retry-After', '1'))\n            print(f'429 rate limited, {wait}s bekle, deneme {attempt + 1}')\n            time.sleep(wait)\n            continue\n        if r.status_code >= 500:\n            wait = 0.5 * 2 ** attempt\n            print(f'{r.status_code} sunucu hatasi, {wait}s backoff, deneme {attempt + 1}')\n            time.sleep(wait)\n            continue\n        return r\n    raise RuntimeError(f'{retries} denemede basarilamadi, son status {last.status_code}')\n\n\ns = requests.Session()\nr = get_with_retry(s, BASE + '/v1/flaky')\nprint('flaky', r.status_code)\n\nok = 0\nfor i in range(10):\n    r = get_with_retry(s, BASE + '/v1/devices?per_page=5')\n    if r.status_code == 200:\n        ok += 1\nprint('devices ok', ok)\n` },
      check: (sh, c) => { const rp = MA_read(sh, MA_H + '/retry.py') || ''; const log = SIMA_STORE.log; const i500 = log.findIndex(e => e.path === '/v1/flaky' && e.status === 500); return MA_ran(sh, 'retry.py') && MA_py(sh).code === 0 && /flaky 200/.test(MA_py(sh).stdout) && /devices ok 10/.test(MA_py(sh).stdout) && /retry-after/i.test(rp) && /sleep/.test(rp) && i500 >= 0 && log.slice(i500 + 1).some(e => e.path === '/v1/flaky' && e.status === 200) && log.slice(i500).some(e => e.status === 429) && log.slice(i500).filter(e => /^\/v1\/devices\?/.test(e.path) && e.status === 200).length >= 10; } },
    { id: 'api12', title: 'Async job ve CLI', xp: 60,
      story: "Backup gibi uzun işler senkron cevap vermez. POST /v1/jobs 202 Accepted ve Location döner, sen GET ile job'u pollarsın, status queued, running, done diye ilerler. Bunu argparse ile gerçek bir CLI'ya sar, logging ile her isteği logla, DEBUG seviyesinde path ve status görünsün. Operasyon ekibi bu aracı cron'dan çalıştıracak, print yerine logging kullanmanın sebebi bu.",
      task: "nano ile ~/apiclient/netcli.py yaz. argparse ile `list --site X` ve `backup --site X --wait` alt komutları ve --log-level seçeneği olsun. backup POST /v1/jobs ile type backup job'u oluştursun, --wait ile 1 saniye aralıkla done olana kadar pollasın ve `job-XXXX done` yazdırsın. client.py içindeki DeviceClient'ı import edip kullan. `cd ~/apiclient && python3 netcli.py --log-level DEBUG backup --site ams-dc1 --wait` ile çalıştır.",
      hint: "`logging.basicConfig(level=getattr(logging, args.log_level), stream=sys.stderr, force=True)` ve `log.debug('%s %s -> %s', method, path, r.status_code)`. Poll döngüsü, `while job['status'] != 'done'` içinde `time.sleep(1)` ve GET /v1/jobs/{id}.",
      solution: 'nano ~/apiclient/netcli.py\ncd ~/apiclient && python3 netcli.py --log-level DEBUG backup --site ams-dc1 --wait',
      setup: sh => { MA_prep(sh); const cp = MA_read(sh, MA_H + '/client.py'); if (!cp || /NotImplementedError/.test(cp)) sh.writeFile(MA_H + '/client.py', MA_CLIENT_PY, false, 'nano'); },
      editorContent: { '~/apiclient/netcli.py': MA_NETCLI_PY },
      check: (sh, c) => { const np = MA_read(sh, MA_H + '/netcli.py') || ''; const py = MA_py(sh); const job = SIMA_STORE.jobs.filter(j => j.type === 'backup' && j.params && j.params.site === 'ams-dc1' && j.status === 'done').pop(); return !!job && MA_ran(sh, 'netcli.py') && py.code === 0 && new RegExp(job.id + ' done').test(py.stdout) && /DEBUG/.test(py.stderr) && /\/v1\/jobs/.test(py.stderr) && /argparse/.test(np) && /logging/.test(np) && /DeviceClient/.test(np) && job.polls >= 3; } },
  ],
});

QUIZ.push(
  { q: 'HTTP 401 ile 403 arasındaki fark nedir?', a: ['401 kimlik yok ya da geçersiz, 403 kimlik var ama yetki yok', 'İkisi de aynı', '401 sunucu hatası, 403 istemci hatası', '403 token süresi dolmuş demek'], c: 0 },
  { q: 'PATCH ile PUT arasındaki fark?', a: ['PATCH kısmi günceller, PUT kaynağın tamamını değiştirir', 'PUT yeni kaynak yaratır, PATCH siler', 'PATCH body almaz', 'Fark yok'], c: 0 },
  { q: 'If-Match header\'ı ne işe yarar?', a: ['ETag eşleşmezse sunucu 412 döner, kayıp güncelleme önlenir', 'Cache süresini belirler', 'Body\'nin JSON olduğunu söyler', 'Pagination sayfasını seçer'], c: 0 },
  { q: '429 cevabında hangi header kaç saniye bekleneceğini söyler?', a: ['Retry-After', 'X-Timeout', 'Cache-Control', 'Expires'], c: 0 },
  { q: 'requests\'te raise_for_status ne zaman exception fırlatır?', a: ['Status 4xx ya da 5xx ise', 'Her zaman', 'Sadece 500 ise', 'JSON bozuksa'], c: 0 },
  { q: 'Async bir job oluşturan POST genellikle hangi status ile döner?', a: ['202 Accepted', '200 OK', '201 Created', '204 No Content'], c: 0 },
  { q: 'requests.Session kullanmanın temel faydası?', a: ['Header, auth ve cookie\'ler istekler arasında saklanır', 'İstekler paralel gider', 'JSON otomatik doğrulanır', 'Retry otomatik yapılır'], c: 0 },
  { q: 'Üstel backoff ne demek?', a: ['Her denemede bekleme süresi katlanarak artar', 'Her denemede aynı süre beklenir', 'Hiç beklemeden tekrar denenir', 'Sunucu tarafında kuyruk tutulur'], c: 0 },
);

BADGES.push({ id: 'api', icon: '🔌', title: 'API Ustası', desc: 'REST API bölümünü bitir', test: s => CHAPTERS.find(c => c.id === 'api').missions.every(m => s.done.includes(m.id)) });
