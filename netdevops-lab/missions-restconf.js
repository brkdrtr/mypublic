'use strict';
/* RESTCONF bolumu. curl ile r1.lab RESTCONF sunucusu, sonra python requests. Scriptler /home/burak/rc altinda. */

const MYR_H = '/home/burak';
const MYR_ran = (c, re) => re.test(c.line);
const MYR_file = (sh, p) => { const n = sh.node(p); return n && n.t === 'f' ? n.d : null; };
const MYR_has = (sh, p, re) => { const d = MYR_file(sh, p); return d != null && (re instanceof RegExp ? re.test(d) : d.includes(re)); };
const MYR_write = (sh, p, d) => { const dir = p.split('/').slice(0, -1).join('/'); if (!sh.node(dir)) sh.run(`mkdir -p ${dir}`); if (!sh.node(p)) sh.writeFile(p, d, false, 'setup'); };
const MYR_py = sh => sh.lastPy || { code: -1, stdout: '', stderr: '', argv: [] };
const MYR_pyOk = (sh, c, name) => MYR_ran(c, /\bpython3?\b/) && c.line.includes(name) && MYR_py(sh).code === 0 && MYR_py(sh).argv.some(a => String(a).includes(name));
const MYR_state = () => (LAB.devices.r1 && LAB.devices.r1.state ? LAB.devices.r1.state() : null);
const MYR_intf = (st, name) => {
  if (!st || !st.interfaces) return null;
  const norm = n => n.replace(/^GigabitEthernet/i, 'Gi').replace(/^Loopback/i, 'Lo').toLowerCase();
  const want = norm(name);
  for (const [k, v] of Object.entries(st.interfaces)) { if (norm(k) === want) return v; }
  return null;
};
const MYR_vlan = (st, id) => (st && st.vlans ? st.vlans[id] || st.vlans[String(id)] || null : null);
/* curl satiri r1.lab restconf'a gitti mi */
const MYR_curl = (c, re) => MYR_ran(c, /\bcurl\b/) && /r1\.lab|10\.0\.0\.1/.test(c.line) && re.test(c.line);
const MYR_U = 'https://r1.lab/restconf';
const MYR_CURL = 'curl -s -k -u admin:admin';
const MYR_JSON = '-H "Accept: application/yang-data+json"';
const MYR_CT = '-H "Content-Type: application/yang-data+json"';
const MYR_VLAN = `${MYR_U}/data/Cisco-IOS-XE-native:native/vlan`;
const MYR_VLAN_BODY = `'{"Cisco-IOS-XE-vlan:vlan-list": {"id": 30, "name": "servers"}}'`;

const MYR_STARTERS = {
  'session.py': `import requests

BASE = 'https://r1.lab/restconf'
# Gorev, bir Session ac, auth, verify ve Accept ile Content-Type header'larini bir kez ayarla,
# interface listesini GET ile cek ve her interface icin "isim description" yazdir,
# sonra GigabitEthernet2 description'ini PATCH ile 'requests session' yap ve "PATCH status" yazdir
`,
  'sync.py': `import yaml
import requests

BASE = 'https://r1.lab/restconf'
# Gorev, interfaces.yaml'daki her interface icin cihazdaki description'i GET ile oku,
# farkliysa PATCH ile duzelt ve "updated isim" yazdir, ayniysa "ok isim" yazdir.
# Sonunda "N updated" yazdir
`,
  'interfaces.yaml': `interfaces:
  - name: GigabitEthernet2
    description: core uplink to r2
  - name: GigabitEthernet3
    description: dmz firewall link
  - name: Loopback0
    description: router id loopback
`,
};
function MYR_setup(sh) {
  for (const [name, text] of Object.entries(MYR_STARTERS)) MYR_write(sh, `${MYR_H}/rc/${name}`, text);
}

CHAPTERS.push({
  id: 'restconf', icon: '🌐', title: 'RESTCONF', sub: 'host-meta, yang-data+json, PATCH, PUT, 409, 404, requests',
  missions: [
    { id: 'rc1', title: 'Keşif', xp: 20,
      story: "RESTCONF, RFC 8040, aynı YANG modellerini HTTPS üzerinden sunar. Kök yol `/restconf` olmak zorunda değildir, sunucu bunu `/.well-known/host-meta` ile ilan eder. İyi bir client önce bu dosyayı okur, `rel=\"restconf\"` link'indeki `href` değerini alır ve tüm istekleri oradan kurar. Lab'da kimlik doğrulama HTTP Basic, kullanıcı admin parola admin, sertifika self signed olduğu için `-k` gerekir.",
      task: "`curl -s -k -u admin:admin https://r1.lab/.well-known/host-meta` ile RESTCONF kök yolunu keşfet.",
      hint: "Yanıt bir XRD belgesidir, RFC 6415. İçindeki `<Link rel='restconf' href='/restconf'/>` satırı kök yolu verir. RFC 8040 bölüm 3.1 bu keşif adımını zorunlu kılar, çünkü bazı cihazlar `/api/restconf` gibi farklı kökler kullanır.",
      solution: 'curl -s -k -u admin:admin https://r1.lab/.well-known/host-meta',
      setup: MYR_setup,
      check: (sh, c) => MYR_curl(c, /well-known\/host-meta/) && /rel=.restconf/.test(c.out) && /href=.\/restconf/.test(c.out) },
    { id: 'rc2', title: 'Accept ve 406', xp: 30,
      story: "RESTCONF iki medya tipi konuşur, `application/yang-data+json` ve `application/yang-data+xml`. Client `Accept` header'ı ile hangisini istediğini söyler. Desteklenmeyen bir tip istersen sunucu `406 Not Acceptable` döner ve script'in beklediği JSON yerine bir hata gövdesi gelir. Önce yanlışını gör, sonra doğrusunu yap.",
      task: "Önce `curl -s -k -u admin:admin -i -H \"Accept: text/html\" https://r1.lab/restconf/data/ietf-interfaces:interfaces` ile 406'yı gör. Sonra Accept'i `application/yang-data+json` yaparak `ietf-interfaces:interfaces` kaynağını JSON olarak çek.",
      hint: "`-i` yanıt header'larını da basar, status satırı ilk satırdır. Doğru istek `-H \"Accept: application/yang-data+json\"` taşır, yanıt `{\"ietf-interfaces:interfaces\": {\"interface\": [...]}}` biçimindedir, kök anahtarda modül adı prefix olarak durur. RFC 8040 bölüm 5.2 medya tiplerini, 7.1 ise 406 dahil hata kodlarını anlatır.",
      solution: `curl -s -k -u admin:admin -i -H "Accept: text/html" ${MYR_U}/data/ietf-interfaces:interfaces\n${MYR_CURL} ${MYR_JSON} ${MYR_U}/data/ietf-interfaces:interfaces`,
      setup: MYR_setup,
      check: (sh, c) => MYR_curl(c, /yang-data\+json/) && MYR_curl(c, /ietf-interfaces:interfaces/) && /"ietf-interfaces:interfaces"/.test(c.out) && /GigabitEthernet2/.test(c.out) },
    { id: 'rc3', title: 'depth ve fields', xp: 30,
      story: "Tüm ağacı çekmek yerine sunucudan budamasını isteyebilirsin. `depth=N` yanıtı N seviye derinlikte keser, `fields=` ise sadece saydığın leaf'leri döner, noktalı virgülle ayrılır ve parantezle iç içe yazılır. Büyük cihazlarda bu iki parametre saniyeler kazandırır ve bant genişliğini korur.",
      task: "`ietf-interfaces:interfaces` kaynağını `fields=interface(name;description)` query parametresiyle çek, yanıtta sadece isim ve description görünsün.",
      hint: "URL `?fields=interface(name;description)` ile biter, shell'de parantez ve noktalı virgül yüzünden URL'i tırnak içine al. `depth=2` denemesi de yap, interface listesinin altını keser. RFC 8040 bölüm 4.8.2 depth, 4.8.3 fields parametresini tanımlar, sunucu desteklediği parametreleri `ietf-restconf-monitoring` capability'leri olarak da ilan eder.",
      solution: `${MYR_CURL} ${MYR_JSON} "${MYR_U}/data/ietf-interfaces:interfaces?depth=2"\n${MYR_CURL} ${MYR_JSON} "${MYR_U}/data/ietf-interfaces:interfaces?fields=interface(name;description)"`,
      setup: MYR_setup,
      check: (sh, c) => MYR_curl(c, /fields=interface\(name;description\)/) && /"name"/.test(c.out) && /"description"/.test(c.out) && !/"enabled"/.test(c.out) && !/"type"/.test(c.out) },
    { id: 'rc4', title: 'Tek entry', xp: 25,
      story: "Bir list entry'si URL'de `liste=anahtar` ile adreslenir. Anahtar özel karakter taşıyorsa yüzde kodlanır, `GigabitEthernet1/0/1` için `%2F` kullanılır. Yanıt sadece o entry'yi döner, böylece tek interface için koca listeyi çekmezsin. Leaf'e kadar inebilirsin, `interface=GigabitEthernet2/description` tek bir değer döner.",
      task: "`interface=GigabitEthernet2` entry'sini JSON olarak çek, sonra sadece `description` leaf'ini çek.",
      hint: "URL `/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet2` ve ardından `/description`. Yanıtta kök anahtar `ietf-interfaces:interface` olur çünkü artık container değil entry döner, leaf için `ietf-interfaces:description`. RFC 8040 bölüm 3.5.3 key encoding kurallarını, birden fazla key varsa virgülle ayrılacağını anlatır.",
      solution: `${MYR_CURL} ${MYR_JSON} ${MYR_U}/data/ietf-interfaces:interfaces/interface=GigabitEthernet2\n${MYR_CURL} ${MYR_JSON} ${MYR_U}/data/ietf-interfaces:interfaces/interface=GigabitEthernet2/description`,
      setup: MYR_setup,
      check: (sh, c) => MYR_curl(c, /interface=GigabitEthernet2/) && /GigabitEthernet2|ietf-interfaces:description/.test(c.out) && !/GigabitEthernet1"/.test(c.out) && !/GigabitEthernet3/.test(c.out) },
    { id: 'rc5', title: 'PATCH ve PUT', xp: 40,
      story: "Yazmak için iki fiil var. `PATCH` merge yapar, gönderdiğin leaf'ler değişir gerisi kalır, NETCONF merge'ün karşılığı. `PUT` replace yapar, kaynağı gönderdiğinle tamamen değiştirir, göndermediğin leaf'ler silinir. İkisi de var olan kaynakta `204 No Content` döner, PUT yeni bir kaynak yaratırsa `201 Created` ve `Location` header'ı döner. Gövde `Content-Type: application/yang-data+json` taşımalı, yoksa 415 gelir.",
      task: "GigabitEthernet2 description'ını PATCH ile `restconf patched` yap ve `-i` ile 204'ü gör. Sonra `Loopback200` interface'ini PUT ile oluştur, description `restconf put`, type `iana-if-type:softwareLoopback`, enabled true ve 201'i gör.",
      hint: "PATCH gövdesi `{\"ietf-interfaces:interface\": {\"name\": \"GigabitEthernet2\", \"description\": \"restconf patched\"}}` ve URL entry'yi gösterir. PUT için URL `interface=Loopback200`, gövdede name type enabled description hepsi olmalı çünkü PUT tam tanım ister. `-X PATCH` ve `-X PUT` ile `-d` gövde, `-i` header. RFC 8040 bölüm 4.5 PUT, 4.6 PATCH, 201 ve 204 ayrımı 4.5'te anlatılır.",
      solution: `${MYR_CURL} -i -X PATCH ${MYR_CT} -d '{"ietf-interfaces:interface": {"name": "GigabitEthernet2", "description": "restconf patched"}}' ${MYR_U}/data/ietf-interfaces:interfaces/interface=GigabitEthernet2\n${MYR_CURL} -i -X PUT ${MYR_CT} -d '{"ietf-interfaces:interface": {"name": "Loopback200", "description": "restconf put", "type": "iana-if-type:softwareLoopback", "enabled": true}}' ${MYR_U}/data/ietf-interfaces:interfaces/interface=Loopback200`,
      setup: MYR_setup,
      check: (sh, c) => { const st = MYR_state(); const g2 = MYR_intf(st, 'GigabitEthernet2'), lo = MYR_intf(st, 'Loopback200'); return MYR_curl(c, /-X\s+PUT/i) && !!g2 && g2.description === 'restconf patched' && !!lo && lo.description === 'restconf put' && /HTTP\/1\.1 201/.test(c.out); } },
    { id: 'rc6', title: 'POST ve 409', xp: 40,
      story: "`POST` bir list'e yeni entry ekler, URL entry'yi değil parent'ı gösterir, key gövdededir. Başarıda `201 Created` ve yeni kaynağın adresini taşıyan `Location` header'ı gelir. Aynı key ile ikinci POST `409 Conflict` döner, NETCONF'taki data-exists'in HTTP karşılığı. PUT ile fark bu, PUT varsa ezer, POST varsa reddeder. VLAN'lar native modelde `native/vlan` altında, list ise `Cisco-IOS-XE-vlan` modülünden geldiği için kendi prefix'ini taşır.",
      task: "`Cisco-IOS-XE-native:native/vlan` altına POST ile 30 numaralı, adı `servers` olan bir VLAN ekle ve 201'i gör. Aynı isteği tekrar gönder ve 409'u gör.",
      hint: "URL `/restconf/data/Cisco-IOS-XE-native:native/vlan`, gövde `{\"Cisco-IOS-XE-vlan:vlan-list\": {\"id\": 30, \"name\": \"servers\"}}`. `-i -X POST` ile status ve Location header'ını gör. RFC 8040 bölüm 4.4 POST'u, 4.4.1 ise list'e entry eklemeyi anlatır, 409 için bölüm 7.1 error tablosuna bak, error-tag data-exists.",
      solution: `${MYR_CURL} -i -X POST ${MYR_CT} -d ${MYR_VLAN_BODY} ${MYR_VLAN}\n${MYR_CURL} -i -X POST ${MYR_CT} -d ${MYR_VLAN_BODY} ${MYR_VLAN}`,
      setup: MYR_setup,
      check: (sh, c) => { const v = MYR_vlan(MYR_state(), 30); return MYR_curl(c, /-X\s+POST/i) && !!v && v.name === 'servers' && /HTTP\/1\.1 409/.test(c.out) && /data-exists/.test(c.out); } },
    { id: 'rc7', title: 'DELETE, 404 ve hata gövdesi', xp: 35,
      story: "`DELETE` kaynağı siler ve `204` döner. Olmayan bir kaynağı silmeye kalkarsan `404 Not Found` gelir ve gövdede `ietf-restconf:errors` yapısı bulunur, içinde `error-type`, `error-tag` ve `error-message`. Bu gövde RFC 8040'ın standart hata biçimidir, her 4xx ve 5xx yanıtında aynı yapı gelir, script'lerin önce status'a sonra bu gövdeye bakmalı.",
      task: "VLAN 30'u DELETE ile sil ve 204'ü gör. Aynı DELETE'i tekrar gönder, 404 ile gelen `ietf-restconf:errors` gövdesini oku.",
      hint: "URL `/restconf/data/Cisco-IOS-XE-native:native/vlan/Cisco-IOS-XE-vlan:vlan-list=30`, `-i -X DELETE`. İkinci yanıtta `error-tag` değeri `invalid-value`, `error-message` ise uri keypath'in bulunamadığını söyler. RFC 8040 bölüm 4.7 DELETE, 7.1 hata biçimi ve error-tag ile HTTP kodu eşlemesi tablosu.",
      solution: `${MYR_CURL} -i -X DELETE ${MYR_JSON} ${MYR_VLAN}/Cisco-IOS-XE-vlan:vlan-list=30\n${MYR_CURL} -i -X DELETE ${MYR_JSON} ${MYR_VLAN}/Cisco-IOS-XE-vlan:vlan-list=30`,
      setup: MYR_setup,
      check: (sh, c) => MYR_curl(c, /-X\s+DELETE/i) && !MYR_vlan(MYR_state(), 30) && /HTTP\/1\.1 404/.test(c.out) && /ietf-restconf:errors/.test(c.out) && /error-tag/.test(c.out) },
    { id: 'rc8', title: 'Operations, save-config', xp: 30,
      story: "Her şey data değildir. YANG `rpc` ve `action` tanımları RESTCONF'ta `/restconf/operations/` altında POST ile çağrılır. IOS-XE'de running config'i startup'a yazmak `Cisco-IOS-XE-rpc:save-config` RPC'sidir. Yanıt `200 OK` ve `output` gövdesi taşır, çıktı üretmeyen RPC'ler `204` döner. Config'i değiştirip kaydetmeyi unutmak klasik hatadır, bir sonraki reload her şeyi geri alır.",
      task: "Önce `/restconf/operations` kaynağını GET ile çekip hangi RPC'lerin olduğunu gör. Sonra `/restconf/operations/Cisco-IOS-XE-rpc:save-config` kaynağına POST gönder ve sonucu oku.",
      hint: "`-X POST` ile boş gövde yeterli, Accept header'ı yine `application/yang-data+json`. Yanıtta `Cisco-IOS-XE-rpc:output` içinde `result` leaf'i var. RFC 8040 bölüm 3.6 operations resource'unu, 4.4.2 ise RPC çağırmayı anlatır. Bir `action` ise data ağacındaki node üzerinde POST ile çağrılır, bölüm 4.4.2 ikisini ayırır.",
      solution: `${MYR_CURL} ${MYR_JSON} ${MYR_U}/operations\n${MYR_CURL} -i -X POST ${MYR_JSON} ${MYR_U}/operations/Cisco-IOS-XE-rpc:save-config`,
      setup: MYR_setup,
      check: (sh, c) => { const st = MYR_state(); return MYR_curl(c, /operations\/Cisco-IOS-XE-rpc:save-config/) && MYR_ran(c, /-X\s+POST/i) && /HTTP\/1\.1 200/.test(c.out) && /"result"/.test(c.out) && !!st && st.saved === true; } },
    { id: 'rc9', title: 'python requests ve Session', xp: 45,
      story: "curl keşif içindir, iş Python'da döner. `requests.Session` auth, header ve TLS ayarlarını bir kez tutar, her istekte tekrar yazmazsın. `verify=False` self signed sertifika için, `r.status_code` kontrolü ve `r.json()` ile gövde. `raise_for_status` 4xx ve 5xx'te exception fırlatır, sessiz hatayı engeller.",
      task: "`~/rc/session.py` yaz. `requests.Session()` aç, `auth`, `verify`, `Accept` ve `Content-Type` header'larını session üstünde ayarla. Interface listesini GET ile çek, her satırda `isim description` yazdır. Sonra GigabitEthernet2 description'ını PATCH ile `requests session` yap ve `PATCH 204` gibi status code'u yazdır. `python3 ~/rc/session.py` çalıştır.",
      hint: "`s = requests.Session(); s.auth = ('admin', 'admin'); s.verify = False; s.headers.update({'Accept': 'application/yang-data+json', 'Content-Type': 'application/yang-data+json'})`. GET için `s.get(BASE + '/data/ietf-interfaces:interfaces').json()['ietf-interfaces:interfaces']['interface']`. PATCH için `s.patch(url, json={...})` gövdeyi JSON'a çevirir. RFC 8040 bölüm 4.6 PATCH, 204'te gövde yoktur, `r.json()` çağırma.",
      solution: 'nano ~/rc/session.py\npython3 ~/rc/session.py',
      setup: MYR_setup,
      editorContent: `import requests

BASE = 'https://r1.lab/restconf'

s = requests.Session()
s.auth = ('admin', 'admin')
s.verify = False
s.headers.update({'Accept': 'application/yang-data+json',
                  'Content-Type': 'application/yang-data+json'})

r = s.get(BASE + '/data/ietf-interfaces:interfaces')
r.raise_for_status()
for intf in r.json()['ietf-interfaces:interfaces']['interface']:
    print(intf['name'], intf.get('description', ''))

body = {'ietf-interfaces:interface': {'name': 'GigabitEthernet2', 'description': 'requests session'}}
r = s.patch(BASE + '/data/ietf-interfaces:interfaces/interface=GigabitEthernet2', json=body)
print('PATCH', r.status_code)
`,
      check: (sh, c) => { const g2 = MYR_intf(MYR_state(), 'GigabitEthernet2'); return MYR_pyOk(sh, c, 'session.py') && !!g2 && g2.description === 'requests session' && /PATCH\s+204/.test(MYR_py(sh).stdout) && /GigabitEthernet1\s+MGMT/.test(MYR_py(sh).stdout) && MYR_has(sh, `${MYR_H}/rc/session.py`, /requests\.Session\(\)/) && MYR_has(sh, `${MYR_H}/rc/session.py`, /\.auth\s*=|auth=/); } },
    { id: 'rc10', title: 'Source of truth sync', xp: 60,
      story: "Son görev. `interfaces.yaml` doğruyu söyler, cihaz ona uymalı. Her interface için önce GET ile mevcut description'ı oku, farklıysa PATCH gönder ve `updated` yaz, aynıysa `ok` yaz. Gereksiz PATCH göndermemek idempotency'dir, ikinci çalışma sıfır değişiklik raporlamalı. Bu yapı Ansible ve Terraform'un içinde döndüğü döngünün ta kendisidir, read, compare, write.",
      task: "`~/rc/sync.py` yaz. `~/rc/interfaces.yaml` dosyasını oku, her interface için `GET .../interface=isim/description` ile mevcut değeri al, farklıysa PATCH ile düzelt ve `updated isim`, aynıysa `ok isim` yazdır. Sonunda `N updated` yazdır. `python3 ~/rc/sync.py` iki kez çalıştır, ikincisi `0 updated` demeli.",
      hint: "Description leaf'i GET yanıtında `{\"ietf-interfaces:description\": \"...\"}` olarak gelir, leaf hiç yoksa 404 döner, bunu boş string say. PATCH gövdesi önceki görevdeki gibi. Sayaç tut ve sonunda yazdır. RFC 8040 bölüm 3.5.3 leaf adresleme, 4.3 GET, 4.6 PATCH. 404'ü hata değil `yok` olarak yorumlamak bu script'in püf noktasıdır, Loopback0'ın description'ı boş başlar.",
      solution: 'nano ~/rc/sync.py\npython3 ~/rc/sync.py\npython3 ~/rc/sync.py',
      setup: MYR_setup,
      editorContent: `import yaml
import requests

BASE = 'https://r1.lab/restconf'

s = requests.Session()
s.auth = ('admin', 'admin')
s.verify = False
s.headers.update({'Accept': 'application/yang-data+json',
                  'Content-Type': 'application/yang-data+json'})

with open('/home/burak/rc/interfaces.yaml') as f:
    wanted = yaml.safe_load(f)['interfaces']

updated = 0
for w in wanted:
    url = BASE + '/data/ietf-interfaces:interfaces/interface=' + w['name']
    r = s.get(url + '/description')
    current = r.json().get('ietf-interfaces:description', '') if r.status_code == 200 else ''
    if current == w['description']:
        print('ok', w['name'])
        continue
    body = {'ietf-interfaces:interface': {'name': w['name'], 'description': w['description']}}
    r = s.patch(url, json=body)
    r.raise_for_status()
    print('updated', w['name'], repr(current), '->', repr(w['description']))
    updated += 1

print(updated, 'updated')
`,
      check: (sh, c) => {
        const st = MYR_state(); if (!MYR_pyOk(sh, c, 'sync.py') || !st) return false;
        const g2 = MYR_intf(st, 'GigabitEthernet2'), g3 = MYR_intf(st, 'GigabitEthernet3'), lo = MYR_intf(st, 'Loopback0');
        return !!g2 && !!g3 && !!lo && g2.description === 'core uplink to r2' && g3.description === 'dmz firewall link' && lo.description === 'router id loopback' && /^0 updated/m.test(MYR_py(sh).stdout) && MYR_has(sh, `${MYR_H}/rc/sync.py`, /safe_load|yaml\.load/) && MYR_has(sh, `${MYR_H}/rc/sync.py`, /\.patch\(/);
      } },
  ],
});

QUIZ.push(
  { q: "RESTCONF kök yolu nasıl keşfedilir?", a: ["/.well-known/host-meta içindeki rel restconf link'i ile", 'Her zaman /restconf', 'DNS TXT kaydı ile', '/api/discover ile'], c: 0 },
  { q: 'Sunucu desteklemediği bir Accept tipi görünce ne döner?', a: ['406 Not Acceptable', '415 Unsupported Media Type', '400 Bad Request', '200 ve XML'], c: 0 },
  { q: 'RESTCONF JSON medya tipi nedir?', a: ['application/yang-data+json', 'application/json', 'text/json', 'application/restconf'], c: 0 },
  { q: 'PATCH ile PUT arasındaki fark nedir?', a: ['PATCH merge eder, PUT kaynağı tamamen değiştirir', 'PUT daha hızlıdır', 'PATCH sadece leaf için çalışır', 'Fark yoktur'], c: 0 },
  { q: "POST ile var olan bir list entry'si tekrar eklenirse ne döner?", a: ['409 Conflict', '201 Created', '204 No Content', '500'], c: 0 },
  { q: 'Başarılı bir PATCH hangi kodu döner?', a: ['204 No Content', '200 ve tam kaynak', '201 Created', '202 Accepted'], c: 0 },
  { q: 'RESTCONF hata gövdesinin kök anahtarı nedir?', a: ['ietf-restconf:errors', 'error', 'rpc-error', 'ietf-yang:fault'], c: 0 },
  { q: "YANG rpc tanımları RESTCONF'ta nerede çağrılır?", a: ['/restconf/operations/ altında POST ile', '/restconf/data/ altında GET ile', '/restconf/rpc/ altında PUT ile', 'Çağrılamaz'], c: 0 },
  { q: "`fields=interface(name;description)` ne yapar?", a: ["Yanıtı sadece sayılan leaf'lerle sınırlar", "Interface'i yeniden adlandırır", 'İki interface döner', 'Sıralama yapar'], c: 0 },
  { q: "requests.Session kullanmanın faydası nedir?", a: ["auth ve header'lar bir kez ayarlanır, her istek bunları taşır", 'Daha güçlü şifreleme', 'Otomatik retry', 'JSON parse etmeye gerek kalmaz'], c: 0 },
);

BADGES.push({ id: 'restconf', icon: '🌐', title: 'REST Mimarı', desc: 'RESTCONF bölümünü bitir', test: st => CHAPTERS.find(c => c.id === 'restconf').missions.every(m => st.done.includes(m.id)) });
