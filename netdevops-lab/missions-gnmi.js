'use strict';
/* gNMI ve Telemetry bolumu. gnmic komutu ve pygnmi shim'i sim-device.js'den gelir, scriptler /home/burak/gnmi altinda. */

const MYG_H = '/home/burak';
const MYG_ran = (c, re) => re.test(c.line);
const MYG_sub = (c, ...answers) => c.submit != null && answers.some(a => String(c.submit).trim().toLowerCase().replace(/\s+/g, ' ') === String(a).toLowerCase());
const MYG_file = (sh, p) => { const n = sh.node(p); return n && n.t === 'f' ? n.d : null; };
const MYG_has = (sh, p, re) => { const d = MYG_file(sh, p); return d != null && (re instanceof RegExp ? re.test(d) : d.includes(re)); };
const MYG_write = (sh, p, d) => { const dir = p.split('/').slice(0, -1).join('/'); if (!sh.node(dir)) sh.run(`mkdir -p ${dir}`); if (!sh.node(p)) sh.writeFile(p, d, false, 'setup'); };
const MYG_py = sh => sh.lastPy || { code: -1, stdout: '', stderr: '', argv: [] };
const MYG_pyOk = (sh, c, name) => MYG_ran(c, /\bpython3?\b/) && c.line.includes(name) && MYG_py(sh).code === 0 && MYG_py(sh).argv.some(a => String(a).includes(name));
const MYG_state = () => (LAB.devices.r1 && LAB.devices.r1.state ? LAB.devices.r1.state() : null);
const MYG_intf = (st, name) => {
  if (!st || !st.interfaces) return null;
  const norm = n => n.replace(/^GigabitEthernet/i, 'Gi').replace(/^Loopback/i, 'Lo').toLowerCase();
  const want = norm(name);
  for (const [k, v] of Object.entries(st.interfaces)) { if (norm(k) === want) return v; }
  return null;
};
const MYG_gnmic = (c, re) => MYG_ran(c, /\bgnmic\b/) && /r1\.lab|10\.0\.0\.1/.test(c.line) && re.test(c.line);
/* ciktidaki in-octets degerlerini sirayla toplar, json ve json_ietf ikisinde de calisir */
const MYG_counterValues = (out, leaf) => { const vals = []; const re = new RegExp(leaf + '"?\\s*[:=]\\s*"?(\\d+)', 'g'); let m; while ((m = re.exec(out))) vals.push(Number(m[1])); return vals; };
const MYG_G = 'gnmic -a r1.lab:57400 -u admin -p admin --insecure';
const MYG_P2 = '/interfaces/interface[name=GigabitEthernet2]';

const MYG_STARTERS = {
  'pyg.py': `from pygnmi.client import gNMIclient

TARGET = ('r1.lab', 57400)
PATH = '/interfaces/interface[name=GigabitEthernet2]/config'
# Gorev, GigabitEthernet2 config'ini get ile oku ve "before description" yazdir,
# sonra set update ile description'i 'pygnmi set' yap, tekrar oku ve "after description" yazdir
with gNMIclient(target=TARGET, username='admin', password='admin', insecure=True) as gc:
    pass
`,
  'collector.py': `import sys
from pygnmi.client import gNMIclient

TARGET = ('r1.lab', 57400)
PATH = '/interfaces/interface[name=GigabitEthernet2]/state/counters/in-octets'
SAMPLES = int(sys.argv[1]) if len(sys.argv) > 1 else 5
INTERVAL_NS = 5 * 1000000000
# Gorev, PATH'e sample modunda SAMPLES ornek icin subscribe ol, her ornek icin
# "sample N in-octets X rate Y bps" yazdir, rate ardisik iki ornegin farkindan ve timestamp'lerinden hesaplanir,
# sonunda "avg Y bps" yazdir
`,
};
function MYG_setup(sh) {
  for (const [name, text] of Object.entries(MYG_STARTERS)) MYG_write(sh, `${MYG_H}/gnmi/${name}`, text);
}

CHAPTERS.push({
  id: 'gnmi', icon: '📶', title: 'gNMI ve Telemetry', sub: 'gnmic, OpenConfig path, set, subscribe, pygnmi, collector',
  missions: [
    { id: 'g1', title: 'Capabilities', xp: 20,
      story: "gNMI, gRPC Network Management Interface, OpenConfig topluluğunun protokolüdür, gRPC ve HTTP/2 üzerinde port 57400'de çalışır. Dört RPC'si vardır, Capabilities, Get, Set ve Subscribe. NETCONF'un hello'suna karşılık gelen Capabilities, desteklenen modelleri, encoding'leri ve gNMI sürümünü döner. `gnmic` açık kaynak CLI client'ıdır, `-a` adres, `-u` ve `-p` kimlik, `--insecure` TLS olmadan.",
      task: "`gnmic -a r1.lab:57400 -u admin -p admin --insecure capabilities` çalıştır ve desteklenen modelleri ve encoding'leri oku.",
      hint: "Çıktıda `gNMI version`, `supported models` ve `supported encodings` başlıkları var. Modeller `openconfig-interfaces` gibi isimlerle, organizasyon ve sürümle listelenir. gNMI spesifikasyonu bölüm 3.2 Capabilities RPC'sini anlatır, encoding listesinde JSON_IETF görmen gerekir çünkü OpenConfig cihazlar genelde bunu kullanır. `--insecure` olmadan TLS doğrulaması x509 hatasıyla düşer.",
      solution: `${MYG_G} capabilities`,
      setup: MYG_setup,
      check: (sh, c) => MYG_gnmic(c, /\bcapabilities\b/) && /openconfig-interfaces/.test(c.out) && /JSON_IETF/i.test(c.out) },
    { id: 'g2', title: 'Path ve OpenConfig ağacı', xp: 25,
      story: "gNMI path'i YANG ağacındaki yolu eğik çizgiyle, list key'lerini köşeli parantezle yazar, `/interfaces/interface[name=GigabitEthernet2]/config/description`. OpenConfig'te her list entry'si `config` ve `state` ikilisi taşır, `config` yazdığın, `state` cihazın uyguladığı ve ölçtüğüdür. Path ne kadar derinse yanıt o kadar küçüktür.",
      task: "`gnmic ... get --path \"/interfaces/interface[name=GigabitEthernet2]/config\"` ile GigabitEthernet2'nin config container'ını çek.",
      hint: "Path'i tırnak içine al, köşeli parantez shell'de glob sayılabilir. Yanıt JSON'dır, `updates` dizisinde `Path` ve `values` bulunur, `values` içinde `description` ve `enabled` leaf'leri. gNMI spesifikasyonu bölüm 2.2.2 path encoding'i anlatır, key değeri eşittir ile yazılır ve birden çok key için parantezler arka arkaya gelir.",
      solution: `${MYG_G} get --path "${MYG_P2}/config"`,
      setup: MYG_setup,
      check: (sh, c) => MYG_gnmic(c, /\bget\b/) && MYG_ran(c, /interface\[name=GigabitEthernet2\]\/config/) && /"description"/.test(c.out) && /GigabitEthernet2/.test(c.out) },
    { id: 'g3', title: 'Config, state ve JSON_IETF', xp: 30,
      story: "Get RPC'de `type` alanı ne istediğini söyler, CONFIG sadece yazılabilir node'lar, STATE sadece operasyonel, ALL ikisi. `--encoding json_ietf` değerlerin YANG JSON kurallarına göre, RFC 7951, kodlanmasını ister, uint64 sayaçlar string olarak gelir, identityref'ler modül prefix'i taşır. OpenConfig cihazlarda JSON yerine JSON_IETF istemek kuraldır.",
      task: "GigabitEthernet2 için `--type state --encoding json_ietf` ile `state` container'ını çek, `counters` ve `oper-status` görünsün.",
      hint: "`gnmic ... get --path \"/interfaces/interface[name=GigabitEthernet2]/state\" --type state --encoding json_ietf`. Sayaçların tırnak içinde string olduğuna dikkat et, RFC 7951 bölüm 6.1 64 bit sayıları string yapar çünkü JavaScript double'ı 2 üzeri 53'ten büyüğü tutamaz. Aynı isteği `--encoding json` ile tekrarla ve farkı gör. gNMI spesifikasyonu bölüm 3.3 Get ve bölüm 2.3 encoding'leri anlatır.",
      solution: `${MYG_G} get --path "${MYG_P2}/state" --type state --encoding json_ietf`,
      setup: MYG_setup,
      check: (sh, c) => MYG_gnmic(c, /\bget\b/) && MYG_ran(c, /--type\s+state|-t\s+state/) && MYG_ran(c, /json_ietf/i) && /"counters"/.test(c.out) && /"oper-status"/.test(c.out) && /"in-octets":\s*"\d+"/.test(c.out) },
    { id: 'g4', title: 'Set, update, replace, delete', xp: 45,
      story: "Set RPC tek mesajda üç liste taşır ve hepsi atomik uygulanır. `update` merge yapar, `replace` hedef altındaki her şeyi gönderdiğinle değiştirir, `delete` siler. gnmic'te bunlar `--update-path` ile `--update-value`, `--replace-path` ile `--replace-value`, `--delete` bayraklarıdır. Sunucu başarıda her işlem için `UpdateResult` döner, gnmic bunu `results` olarak basar.",
      task: "Üç Set gönder. GigabitEthernet2 `config/description` leaf'ini update ile `gnmi update` yap. GigabitEthernet3 `config` container'ını replace ile `{\"name\": \"GigabitEthernet3\", \"description\": \"gnmi replace\", \"enabled\": true}` yap. GigabitEthernet1 `config/description` leaf'ini delete ile sil.",
      hint: "`gnmic ... set --update-path \"/interfaces/interface[name=GigabitEthernet2]/config/description\" --update-value \"gnmi update\"`, replace için `--replace-path ... --replace-value '{...}'`, delete için `--delete \"/interfaces/interface[name=GigabitEthernet1]/config/description\"`. gNMI spesifikasyonu bölüm 3.4 Set'i anlatır, sıralama delete, replace, update olarak uygulanır ve biri başarısızsa hiçbiri uygulanmaz.",
      solution: `${MYG_G} set --update-path "${MYG_P2}/config/description" --update-value "gnmi update"\n${MYG_G} set --replace-path "/interfaces/interface[name=GigabitEthernet3]/config" --replace-value '{"name": "GigabitEthernet3", "description": "gnmi replace", "enabled": true}'\n${MYG_G} set --delete "/interfaces/interface[name=GigabitEthernet1]/config/description"`,
      setup: MYG_setup,
      check: (sh, c) => { const st = MYG_state(); const g1 = MYG_intf(st, 'GigabitEthernet1'), g2 = MYG_intf(st, 'GigabitEthernet2'), g3 = MYG_intf(st, 'GigabitEthernet3'); return MYG_gnmic(c, /\bset\b/) && !!g2 && g2.description === 'gnmi update' && !!g3 && g3.description === 'gnmi replace' && g3.enabled === true && !!g1 && !g1.description; } },
    { id: 'g5', title: 'Subscribe once', xp: 30,
      story: "Subscribe RPC'nin üç modu var, ONCE tek seferlik anlık görüntü, POLL istek üzerine, STREAM sürekli akış. ONCE aslında Get gibidir ama Subscribe altyapısıyla gelir, her leaf ayrı bir update olarak, timestamp ile iner ve sonunda `sync-response` gelir. Telemetry pipeline'ını kurmadan önce ONCE ile path'in doğru olduğunu gör.",
      task: "`gnmic ... subscribe --path \"/interfaces/interface[name=GigabitEthernet2]/state/counters\" --mode once` ile sayaçları tek seferlik çek.",
      hint: "gnmic'te `sub` kısaltması da çalışır. Çıktıda her update'in `timestamp`, `Path` ve `values` alanı var, ardından `sync-response` true gelir. gNMI spesifikasyonu bölüm 3.5.1.5 ONCE modunu anlatır, sunucu tüm veriyi gönderip `sync_response` ile oturumu kapatır.",
      solution: `${MYG_G} subscribe --path "${MYG_P2}/state/counters" --mode once`,
      setup: MYG_setup,
      check: (sh, c) => MYG_gnmic(c, /\b(subscribe|sub)\b/) && MYG_ran(c, /--mode\s+once/) && /in-octets/.test(c.out) && /"timestamp"/.test(c.out) && /sync-response/.test(c.out) },
    { id: 'g6', title: 'Stream sample', xp: 40,
      story: "Gerçek telemetry STREAM modunda SAMPLE ile akar, cihaz her `sample-interval` sürede değeri gönderir, sen sormazsın. SNMP polling'in tersidir, dial-in modelinde client bağlanır ve sunucu iter. Lab'da akış `--max` kadar örnekten sonra kesilir ve her örnekte sayaç ilerlemiş görünür, gerçekte bu akış sen kesene kadar sürer.",
      task: "`in-octets` sayacına `--mode stream --stream-mode sample --sample-interval 5s --max 4` ile subscribe ol ve ardışık örneklerde değerin arttığını gör.",
      hint: "Path `/interfaces/interface[name=GigabitEthernet2]/state/counters/in-octets`. Her örnek ayrı bir update, timestamp nanosaniye cinsinden. İki ardışık değerin farkını interval'a bölersen byte/s elde edersin, 8 ile çarpınca bps. gNMI spesifikasyonu bölüm 3.5.1.5.2 SAMPLE modunu ve `sample_interval` alanını anlatır.",
      solution: `${MYG_G} subscribe --path "${MYG_P2}/state/counters/in-octets" --mode stream --stream-mode sample --sample-interval 5s --max 4`,
      setup: MYG_setup,
      check: (sh, c) => { if (!MYG_gnmic(c, /\b(subscribe|sub)\b/) || !MYG_ran(c, /--stream-mode\s+sample/) || !MYG_ran(c, /--sample-interval/)) return false; const v = MYG_counterValues(c.out, 'in-octets'); return v.length >= 3 && v.every((x, i) => i === 0 || x > v[i - 1]); } },
    { id: 'g7', title: 'On-change', xp: 35,
      story: "Sayaçlar sürekli değişir ama `oper-status` saatlerce aynı kalır, her 5 saniyede aynı değeri göndermek israf. ON_CHANGE modunda sunucu önce mevcut değeri gönderir, `sync-response` ile ilk turu kapatır, sonra sadece değişince konuşur. Interface flap, BGP neighbor düşmesi gibi olaylar için doğru mod budur. Lab'da simülatör abonelik sırasında GigabitEthernet2 üzerinde bir link flap üretir.",
      task: "GigabitEthernet2 `state/oper-status` leaf'ine `--mode stream --stream-mode on-change` ile subscribe ol ve DOWN ardından UP değişikliklerini yakala.",
      hint: "Path `/interfaces/interface[name=GigabitEthernet2]/state/oper-status`. İlk update mevcut değer UP, sonra `sync-response`, ardından DOWN ve tekrar UP gelir, timestamp'lere bak. gNMI spesifikasyonu bölüm 3.5.1.5.2 ON_CHANGE modunu anlatır, sunucu bir leaf için desteklemiyorsa `Unimplemented` ya da `InvalidArgument` hatası döner, bu yüzden her leaf on-change destekler sanma.",
      solution: `${MYG_G} subscribe --path "${MYG_P2}/state/oper-status" --mode stream --stream-mode on-change`,
      setup: MYG_setup,
      check: (sh, c) => MYG_gnmic(c, /\b(subscribe|sub)\b/) && MYG_ran(c, /--stream-mode\s+on-change/) && /oper-status/.test(c.out) && /"DOWN"/.test(c.out) && /"UP"/.test(c.out) && /sync-response/.test(c.out) },
    { id: 'g8', title: 'pygnmi get ve set', xp: 45,
      story: "Python tarafında pygnmi kütüphanesi var. `gNMIclient` context manager olarak bağlanır, `gc.get(path=[...], encoding='json_ietf')` bir dict döner, `gc.set(update=[(path, value)])` yazar. Yanıt yapısı gnmic'tekiyle aynıdır, `notification` listesi, içinde `update` listesi, her birinde `path` ve `val`. Set yanıtında `response` listesi her işlemin `op` değerini taşır.",
      task: "`~/gnmi/pyg.py` dosyasını tamamla. GigabitEthernet2 `config` container'ını get ile oku ve `before` ile description'ı yazdır. Sonra set update ile description'ı `pygnmi set` yap, `op` değerini yazdır, tekrar oku ve `after` ile yeni değeri yazdır. `python3 ~/gnmi/pyg.py` çalıştır.",
      hint: "`r = gc.get(path=[PATH], encoding='json_ietf')` ardından `r['notification'][0]['update'][0]['val']['description']`. Set için `gc.set(update=[(PATH + '/description', 'pygnmi set')], encoding='json_ietf')` ve dönen `result['response'][0]['op']`. gNMI spesifikasyonu bölüm 3.4.1, update'te path leaf'i gösteriyorsa değer düz JSON skalar olur.",
      solution: 'nano ~/gnmi/pyg.py\npython3 ~/gnmi/pyg.py',
      setup: MYG_setup,
      editorContent: `from pygnmi.client import gNMIclient

TARGET = ('r1.lab', 57400)
PATH = '/interfaces/interface[name=GigabitEthernet2]/config'

def description(gc):
    r = gc.get(path=[PATH], encoding='json_ietf')
    return r['notification'][0]['update'][0]['val'].get('description', '')

with gNMIclient(target=TARGET, username='admin', password='admin', insecure=True) as gc:
    print('before', description(gc))
    result = gc.set(update=[(PATH + '/description', 'pygnmi set')], encoding='json_ietf')
    print('set', result['response'][0]['op'])
    print('after', description(gc))
`,
      check: (sh, c) => { const g2 = MYG_intf(MYG_state(), 'GigabitEthernet2'); const out = MYG_py(sh).stdout; return MYG_pyOk(sh, c, 'pyg.py') && !!g2 && g2.description === 'pygnmi set' && /after\s+pygnmi set/.test(out) && /set\s+UPDATE/.test(out) && /^before\s+\S/m.test(out) && MYG_has(sh, `${MYG_H}/gnmi/pyg.py`, /\.set\(/) && MYG_has(sh, `${MYG_H}/gnmi/pyg.py`, /\.get\(/); } },
    { id: 'g9', title: 'Telemetry collector', xp: 55,
      story: "Bir sayaç tek başına anlam taşımaz, hız taşır. Collector `in-octets` sayacına sample modunda subscribe olur, ardışık iki örnek arasındaki farkı iki timestamp arasındaki süreye böler ve 8 ile çarpar, sonuç bit per second. pygnmi'de `subscribe2` bir `subscription` listesi alır ve her update'i dict olarak verir, `sync_response` kayıtlarını atlaman gerekir. Gerçek pipeline bunu bir time series veritabanına yazar, burada ekrana yazacaksın.",
      task: "`~/gnmi/collector.py` dosyasını tamamla. `gc.subscribe2` ile PATH'e sample modunda SAMPLES örnek al, her örnekte `sample N in-octets X rate Y bps` yazdır, ilk örnekte rate 0. Sonunda `avg Y bps` yazdır. `python3 ~/gnmi/collector.py 5` ile çalıştır.",
      hint: "`sub = {'subscription': [{'path': PATH, 'mode': 'sample', 'sample_interval': INTERVAL_NS}], 'mode': 'stream', 'encoding': 'json_ietf', 'count': SAMPLES}` ve `for msg in gc.subscribe2(sub)`. Her mesajda ya `update` ya `sync_response` anahtarı var, `msg['update']['timestamp']` nanosaniye, `msg['update']['update'][0]['val']` sayaç. JSON_IETF'te sayaç string gelir, `int()` ile çevir. `rate = (cur - prev) * 8 * 1e9 / (ts - prev_ts)`. RFC 7951 bölüm 6.1 ve gNMI spesifikasyonu bölüm 3.5.2.3 SubscribeResponse.",
      solution: 'nano ~/gnmi/collector.py\npython3 ~/gnmi/collector.py 5',
      setup: MYG_setup,
      editorContent: `import sys
from pygnmi.client import gNMIclient

TARGET = ('r1.lab', 57400)
PATH = '/interfaces/interface[name=GigabitEthernet2]/state/counters/in-octets'
SAMPLES = int(sys.argv[1]) if len(sys.argv) > 1 else 5
INTERVAL_NS = 5 * 1000000000

sub = {
    'subscription': [{'path': PATH, 'mode': 'sample', 'sample_interval': INTERVAL_NS}],
    'mode': 'stream',
    'encoding': 'json_ietf',
    'count': SAMPLES,
}

rates = []
prev = prev_ts = None
n = 0
with gNMIclient(target=TARGET, username='admin', password='admin', insecure=True) as gc:
    for msg in gc.subscribe2(sub):
        if 'update' not in msg:
            continue
        ts = int(msg['update']['timestamp'])
        cur = int(msg['update']['update'][0]['val'])
        n += 1
        rate = 0
        if prev is not None and cur >= prev and ts > prev_ts:
            rate = int((cur - prev) * 8 * 1000000000 / (ts - prev_ts))
            rates.append(rate)
        print(f'sample {n} in-octets {cur} rate {rate} bps')
        prev, prev_ts = cur, ts

avg = sum(rates) // len(rates) if rates else 0
print(f'avg {avg} bps')
`,
      check: (sh, c) => { if (!MYG_pyOk(sh, c, 'collector.py')) return false; const out = MYG_py(sh).stdout; const m = [...out.matchAll(/sample \d+ in-octets (\d+) rate (\d+) bps/g)]; const avg = /avg (\d+) bps/.exec(out); return m.length >= 5 && m.slice(1).every((x, i) => Number(x[2]) > 0 && Number(x[1]) > Number(m[i][1])) && !!avg && Number(avg[1]) > 0 && MYG_has(sh, `${MYG_H}/gnmi/collector.py`, /subscribe2|subscribe\(/) && MYG_has(sh, `${MYG_H}/gnmi/collector.py`, /\*\s*8|8\s*\*/); } },
    { id: 'g10', title: 'Üç protokol, bir değişiklik', xp: 40,
      story: "Aynı description değişikliğini üç kere yaptın. NETCONF ile XML, candidate ve commit, lock ve validate, transaction güvenliği. RESTCONF ile HTTP fiilleri, JSON, her web aracıyla uyum, ama transaction yok, her istek kendi başına. gNMI ile gRPC, protobuf, tek Set'te atomik update replace delete ve asıl gücü Subscribe ile streaming telemetry. Seçim iş yüküne göre yapılır, config transaction'ı için NETCONF, basit CRUD ve entegrasyon için RESTCONF, telemetry ve yüksek frekanslı okuma için gNMI.",
      task: "Yüzlerce cihazdan saniyede bir interface sayacı toplayacak bir izleme sistemi kuruyorsun. Hangi protokolü seçersin, `netconf`, `restconf` ya da `gnmi` olarak `submit` et.",
      hint: "Soru polling değil streaming istiyor. NETCONF ve RESTCONF'ta her örnek için istek atman gerekir, gNMI Subscribe STREAM SAMPLE ile cihaz kendisi iter, HTTP/2 multiplexing ve protobuf ile yük düşüktür. RFC 6241 ve RFC 8040 config protokolleridir, gNMI spesifikasyonu bölüm 3.5 Subscribe'ı telemetry için tasarlar. Değişiklik transaction'ı sorulsaydı cevap NETCONF olurdu.",
      solution: 'submit gnmi',
      setup: MYG_setup,
      check: (sh, c) => MYG_sub(c, 'gnmi', 'gNMI') },
  ],
});

QUIZ.push(
  { q: "gNMI hangi transport üzerinde çalışır?", a: ['gRPC ve HTTP/2, genelde port 57400', 'SSH port 830', 'HTTPS port 443', 'UDP 161'], c: 0 },
  { q: "gNMI'ın dört RPC'si hangileridir?", a: ['Capabilities, Get, Set, Subscribe', 'Hello, Get, Edit, Commit', 'GET, PUT, POST, DELETE', 'Open, Read, Write, Close'], c: 0 },
  { q: "gNMI path'inde list key nasıl yazılır?", a: ['interface[name=GigabitEthernet2]', 'interface=GigabitEthernet2', 'interface/GigabitEthernet2', 'interface?name=GigabitEthernet2'], c: 0 },
  { q: 'JSON_IETF encoding uint64 sayaçları nasıl kodlar?', a: ['String olarak, RFC 7951', 'Sayı olarak', 'Base64 olarak', 'Hex olarak'], c: 0 },
  { q: "OpenConfig'te config ile state container'ları arasındaki fark nedir?", a: ["config istenen, state cihazın uyguladığı ve ölçtüğü değerler", 'state yazılabilir', 'config sadece okunur', 'Fark yoktur'], c: 0 },
  { q: 'Set RPC içinde update, replace ve delete nasıl uygulanır?', a: ['Tek transaction olarak, biri başarısızsa hiçbiri uygulanmaz', 'Sırayla ve bağımsız', 'Sadece update uygulanır', 'Rastgele'], c: 0 },
  { q: 'Subscribe STREAM SAMPLE modu ne yapar?', a: ['Sunucu her sample-interval sürede değeri gönderir', 'Client her seferinde sorar', 'Sadece değişince gönderir', 'Tek seferlik döner'], c: 0 },
  { q: 'ON_CHANGE modu hangi veri için uygundur?', a: ['oper-status gibi seyrek değişen değerler', 'Byte sayaçları', 'CPU yüzdesi', 'Her şey için'], c: 0 },
  { q: 'İki ardışık in-octets örneğinden bps nasıl hesaplanır?', a: ["Fark bölü geçen saniye çarpı 8", 'Fark bölü 8', 'Toplam bölü 2', 'Son değer çarpı 8'], c: 0 },
  { q: 'Config transaction, lock ve validate gerektiren bir değişiklik için hangi protokol en uygundur?', a: ['NETCONF', 'gNMI', 'RESTCONF', 'SNMP'], c: 0 },
);

BADGES.push({ id: 'gnmi', icon: '📶', title: 'Telemetry Avcısı', desc: 'gNMI ve Telemetry bölümünü bitir', test: st => CHAPTERS.find(c => c.id === 'gnmi').missions.every(m => st.done.includes(m.id)) });
