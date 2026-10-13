'use strict';
/* NETCONF ve ncclient bolumu. Baslangic scriptleri setup ile /home/burak/nc altina yazilir, cihaz r1.lab sim-device.js'den gelir. */

const MYN_H = '/home/burak';
const MYN_ran = (c, re) => re.test(c.line);
const MYN_file = (sh, p) => { const n = sh.node(p); return n && n.t === 'f' ? n.d : null; };
const MYN_has = (sh, p, re) => { const d = MYN_file(sh, p); return d != null && (re instanceof RegExp ? re.test(d) : d.includes(re)); };
const MYN_write = (sh, p, d) => { const dir = p.split('/').slice(0, -1).join('/'); if (!sh.node(dir)) sh.run(`mkdir -p ${dir}`); if (!sh.node(p)) sh.writeFile(p, d, false, 'setup'); };
const MYN_py = sh => sh.lastPy || { code: -1, stdout: '', stderr: '', argv: [] };
/* python3 bu dosyayla hatasiz kostu mu */
const MYN_pyOk = (sh, c, name) => MYN_ran(c, /\bpython3?\b/) && c.line.includes(name) && MYN_py(sh).code === 0 && MYN_py(sh).argv.some(a => String(a).includes(name));
const MYN_state = () => (LAB.devices.r1 && LAB.devices.r1.state ? LAB.devices.r1.state() : null);
/* state().interfaces icinde GigabitEthernet2, Gi2 ya da baska bir yazimla arar */
const MYN_intf = (st, name) => {
  if (!st || !st.interfaces) return null;
  const norm = n => n.replace(/^GigabitEthernet/i, 'Gi').replace(/^Loopback/i, 'Lo').toLowerCase();
  const want = norm(name);
  for (const [k, v] of Object.entries(st.interfaces)) { if (norm(k) === want) return v; }
  return null;
};

const MYN_HEAD = `from ncclient import manager

DEVICE = dict(host='r1.lab', port=830, username='admin', password='admin',
              hostkey_verify=False, device_params={'name': 'iosxe'})
`;
const MYN_YAML = `interfaces:
  - name: GigabitEthernet2
    description: core uplink to sw1
    enabled: true
  - name: GigabitEthernet3
    description: dmz firewall link
    enabled: false
  - name: Loopback0
    description: router id loopback
    enabled: true
`;
const MYN_STARTERS = {
  'caps.py': `${MYN_HEAD}
# Gorev, sunucu capability listesini al, sayisini yazdir ve ietf-interfaces iceren satirlari yazdir
with manager.connect(**DEVICE) as m:
    pass
`,
  'getconf.py': `${MYN_HEAD}
# Gorev, running datastore'dan sadece GigabitEthernet2'yi subtree filter ile cek ve reply.data_xml yazdir
FILTER = """
<filter>
</filter>
"""
with manager.connect(**DEVICE) as m:
    pass
`,
  'parse.py': `import json
from lxml import etree
${MYN_HEAD}
NS = {'if': 'urn:ietf:params:xml:ns:yang:ietf-interfaces',
      'ip': 'urn:ietf:params:xml:ns:yang:ietf-ip'}

# Gorev, get-config yanitini lxml ile parse et, {isim: {description, enabled, ipv4}} dict'i JSON olarak yazdir
with manager.connect(**DEVICE) as m:
    reply = m.get_config(source='running')
    root = etree.fromstring(reply.data_xml.encode())
    result = {}
    print(json.dumps(result, indent=2))
`,
  'oper.py': `from lxml import etree
${MYN_HEAD}
NS = {'if': 'urn:ietf:params:xml:ns:yang:ietf-interfaces'}
# Gorev, get ile interfaces-state cek, her interface icin "isim oper-status in-octets" satiri yazdir
`,
  'merge.py': `${MYN_HEAD}
# Gorev, candidate datastore'a merge ile GigabitEthernet2 description yaz, sonra commit
CONFIG = """
<config xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
</config>
"""
`,
  'lock.py': `${MYN_HEAD}
# Gorev, with m.locked('candidate') icinde GigabitEthernet3 description yaz, commit, blok oncesi locked sonrasi unlocked yazdir
`,
  'create.py': `${MYN_HEAD}from ncclient.operations import RPCError

# Gorev, Loopback100'u operation="create" ile olustur ve commit et, ayni edit-config'i tekrar gonderip data-exists hatasini yakala
`,
  'replace.py': `${MYN_HEAD}
# Gorev, tek edit-config icinde GigabitEthernet3'u operation="replace" ile yeniden tanimla, Loopback100'u operation="delete" ile sil
`,
  'validate.py': `${MYN_HEAD}from ncclient.operations import RPCError

# Gorev, candidate'e bir degisiklik yaz ve validate et, sonra hatali bir config'i inline validate ile sinat, en sonda discard-changes
`,
  'render.py': `import yaml
from jinja2 import Template
${MYN_HEAD}
# Gorev, interfaces.yaml'daki her interface icin tek bir edit-config uret ve uygula, oncesi ve sonrasi get-config ile karsilastir
TEMPLATE = """
<config xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
  </interfaces>
</config>
"""
`,
  'interfaces.yaml': MYN_YAML,
  'drift.xml': `<rpc message-id="201" xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <edit-config>
    <target><running/></target>
    <config>
      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
        <interface>
          <name>GigabitEthernet3</name>
          <description>manual change</description>
        </interface>
      </interfaces>
    </config>
  </edit-config>
</rpc>
]]>]]>
`,
  'audit.py': `import sys
import yaml
from lxml import etree
${MYN_HEAD}
NS = {'if': 'urn:ietf:params:xml:ns:yang:ietf-interfaces'}
# Gorev, interfaces.yaml ile cihazin running config'ini karsilastir, sapma varsa DRIFT satirlari yazdir ve exit 1
`,
};
function MYN_setup(sh) {
  for (const [name, text] of Object.entries(MYN_STARTERS)) MYN_write(sh, `${MYN_H}/nc/${name}`, text);
}

CHAPTERS.push({
  id: 'netconf', icon: '📡', title: 'NETCONF ve ncclient', sub: 'hello, get-config, edit-config, candidate, lock, jinja2, audit',
  missions: [
    { id: 'nc1', title: 'hello', xp: 20,
      story: "NETCONF, RFC 6241, SSH üzerinde port 830'da çalışan bir RPC protokolüdür. Oturum açılınca iki taraf da bir `hello` mesajı gönderir ve capability listesini paylaşır, bu liste sunucunun hangi YANG modüllerini ve hangi datastore'ları desteklediğini söyler. Client da kendi hello'sunu göndermeden hiçbir RPC gönderemez. `ssh -s netconf` ile subsystem'i elle açıp ham hello'yu görebilirsin, stdin'den bir rpc verirsen cevabını da alırsın. Lab `~/netconf/get-interfaces.xml` adında hazır bir rpc koydu.",
      task: "`ssh -p 830 admin@r1.lab -s netconf` ile r1'in NETCONF subsystem'ine bağlan ve sunucunun hello mesajını oku. Sonra `cat ~/netconf/get-interfaces.xml | ssh -p 830 admin@r1.lab -s netconf` ile ham bir get-config gönder.",
      hint: "SSH `-s` bayrağı bir subsystem ister, NETCONF subsystem adı `netconf` ve port 830. Çıktıda `urn:ietf:params:netconf:base:1.1` base capability'si, `candidate` ve `writable-running` gibi datastore capability'leri ve `module=` ile YANG modülleri görünür. Mesajın sonundaki `]]>]]>` RFC 6242 çerçeveleme işaretidir, base 1.1 ile chunked framing'e geçilir.",
      solution: 'ssh -p 830 admin@r1.lab -s netconf\ncat ~/netconf/get-interfaces.xml | ssh -p 830 admin@r1.lab -s netconf',
      setup: MYN_setup,
      check: (sh, c) => MYN_ran(c, /ssh\s+.*-s\s+netconf/) && /<hello/i.test(c.out) && /capabilit/i.test(c.out) },
    { id: 'nc2', title: 'İlk bağlantı', xp: 30,
      story: "Python tarafında ncclient standart kütüphanedir. `manager.connect` bir oturum açar, context manager olarak kullanılırsa çıkışta `close-session` gönderilir. `m.server_capabilities` hello'daki listenin aynısıdır ve bir script'in ilk işi cihazın gerçekten ihtiyaç duyduğu modülü destekleyip desteklemediğini kontrol etmek olmalı.",
      task: "`~/nc/caps.py` dosyasını tamamla. r1.lab'a bağlan, capability sayısını `N capability` biçiminde yazdır, sonra içinde `ietf-interfaces` geçen capability satırlarını yazdır. `python3 ~/nc/caps.py` ile çalıştır.",
      hint: "`caps = list(m.server_capabilities)` sonra `[c for c in caps if 'ietf-interfaces' in c]`. `device_params={'name': 'iosxe'}` ncclient'a Cisco'ya özel davranışları açar. `hostkey_verify=False` lab için, üretimde known_hosts kullan. RFC 6241 bölüm 8 capability'leri, modül listesinin URL biçimi ise RFC 6020 bölüm 5.6.4'te anlatılır, `module=` ve `revision=` parametreleriyle gelir.",
      solution: 'nano ~/nc/caps.py\npython3 ~/nc/caps.py',
      setup: MYN_setup,
      editorContent: `${MYN_HEAD}
with manager.connect(**DEVICE) as m:
    caps = list(m.server_capabilities)
    print(len(caps), 'capability')
    for c in caps:
        if 'ietf-interfaces' in c:
            print(c)
`,
      check: (sh, c) => MYN_pyOk(sh, c, 'caps.py') && /module=ietf-interfaces/.test(MYN_py(sh).stdout) && /\d+ capability/.test(MYN_py(sh).stdout) },
    { id: 'nc3', title: 'get-config ve subtree filter', xp: 35,
      story: "Koca running config'i çekip Python'da süzmek israftır. `get-config` bir `filter` alır, subtree filter istediğin dalı XML olarak tarif eder, sunucu sadece eşleşen kısmı döner. Filter'da bir list key verirsen sadece o entry gelir, buna content match node denir. Namespace zorunludur, `xmlns` olmadan sunucu neyi kastettiğini bilemez.",
      task: "`~/nc/getconf.py` içindeki FILTER'ı doldur, running datastore'dan sadece GigabitEthernet2 gelsin, `reply.data_xml` yazdır. `python3 ~/nc/getconf.py` çalıştır.",
      hint: "Filter gövdesi `<interfaces xmlns=\"urn:ietf:params:xml:ns:yang:ietf-interfaces\"><interface><name>GigabitEthernet2</name></interface></interfaces>` olmalı. ncclient'a `filter=FILTER` olarak string verilebilir, `<filter>` sarmalı yoksa ncclient kendisi ekler. RFC 6241 bölüm 6 subtree filtering'i anlatır, 6.2.5 content match node olarak `name` seçim yapar.",
      solution: 'nano ~/nc/getconf.py\npython3 ~/nc/getconf.py',
      setup: MYN_setup,
      editorContent: `${MYN_HEAD}
FILTER = """
<filter>
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
    <interface>
      <name>GigabitEthernet2</name>
    </interface>
  </interfaces>
</filter>
"""
with manager.connect(**DEVICE) as m:
    reply = m.get_config(source='running', filter=FILTER)
    print(reply.data_xml)
`,
      check: (sh, c) => MYN_pyOk(sh, c, 'getconf.py') && /GigabitEthernet2/.test(MYN_py(sh).stdout) && !/GigabitEthernet1</.test(MYN_py(sh).stdout) && !/Loopback0</.test(MYN_py(sh).stdout) && MYN_has(sh, `${MYN_H}/nc/getconf.py`, /<name>GigabitEthernet2<\/name>/) },
    { id: 'nc4', title: 'lxml ile parse', xp: 40,
      story: "XML yanıtı string olarak işe yaramaz, veri yapısına çevireceksin. lxml ile `etree.fromstring` ağacı kurar, `xpath` ya da `findtext` namespace sözlüğüyle çalışır. ietf-ip augment'i farklı namespace'te geldiği için `ip:` prefix'i ayrıca tanımlanır. Sonuç JSON olunca diğer araçlarla konuşabilir.",
      task: "`~/nc/parse.py` dosyasını tamamla. Her interface için `description`, `enabled` boolean ve `ipv4` adres listesi çıkar, interface adı key olacak şekilde JSON yazdır. `python3 ~/nc/parse.py` çalıştır.",
      hint: "`root.xpath('//if:interfaces/if:interface', namespaces=NS)` interface'leri bulur, `intf.findtext('if:name', namespaces=NS)` adı verir. IPv4 için `intf.xpath('ip:ipv4/ip:address/ip:ip', namespaces=NS)` ve `.text`. `enabled` metin olarak gelir, `!= 'false'` ile boolean'a çevir, description yoksa boş string say. XML namespace'leri RFC 7950 bölüm 7.1.3 namespace statement'ından gelir.",
      solution: 'nano ~/nc/parse.py\npython3 ~/nc/parse.py',
      setup: MYN_setup,
      editorContent: `import json
from lxml import etree
${MYN_HEAD}
NS = {'if': 'urn:ietf:params:xml:ns:yang:ietf-interfaces',
      'ip': 'urn:ietf:params:xml:ns:yang:ietf-ip'}

with manager.connect(**DEVICE) as m:
    reply = m.get_config(source='running')
    root = etree.fromstring(reply.data_xml.encode())
    result = {}
    for intf in root.xpath('//if:interfaces/if:interface', namespaces=NS):
        name = intf.findtext('if:name', namespaces=NS)
        result[name] = {
            'description': intf.findtext('if:description', namespaces=NS) or '',
            'enabled': intf.findtext('if:enabled', namespaces=NS) != 'false',
            'ipv4': [a.text for a in intf.xpath('ip:ipv4/ip:address/ip:ip', namespaces=NS)],
        }
    print(json.dumps(result, indent=2))
`,
      check: (sh, c) => {
        if (!MYN_pyOk(sh, c, 'parse.py')) return false;
        let j; try { j = JSON.parse(MYN_py(sh).stdout); } catch (e) { return false; }
        const st = MYN_state(); if (!st) return false;
        const names = Object.keys(j);
        if (names.length < 3) return false;
        return names.every(n => { const v = j[n]; const s = MYN_intf(st, n); return s && typeof v.enabled === 'boolean' && v.enabled === s.enabled && Array.isArray(v.ipv4) && (s.description || '') === (v.description || '') && (s.ip ? v.ipv4.includes(s.ip) : v.ipv4.length === 0); });
      } },
    { id: 'nc5', title: 'Operasyonel state', xp: 30,
      story: "`get-config` sadece config döner. Sayaçlar, oper-status, fiziksel adres gibi `config false` veriler `get` ile gelir, `get` hem config hem state'i tek yanıtta verir. Cihaz bunları klasik `interfaces-state` container'ında da sunar. İzleme script'lerinin tamamı bu RPC üzerine kuruludur.",
      task: "`~/nc/oper.py` dosyasını tamamla. `m.get` ile sadece `interfaces-state` dalını filtrele, her interface için `isim oper-status in-octets` satırı yazdır. `python3 ~/nc/oper.py` çalıştır.",
      hint: "Filter `<interfaces-state xmlns=\"urn:ietf:params:xml:ns:yang:ietf-interfaces\"/>` tek başına yeter, boş element tüm dalı seçer. Yanıtta `statistics/in-octets` leaf'i var, `findtext('if:statistics/if:in-octets', namespaces=NS)`. RFC 6241 bölüm 7.7 get operasyonunu, RFC 7223 bölüm 3 interfaces-state'i anlatır. NMDA yani RFC 8342 sonrası modellerde aynı state `interface` listesinin içinde `ro` olarak da bulunur.",
      solution: 'nano ~/nc/oper.py\npython3 ~/nc/oper.py',
      setup: MYN_setup,
      editorContent: `from lxml import etree
${MYN_HEAD}
NS = {'if': 'urn:ietf:params:xml:ns:yang:ietf-interfaces'}
FILTER = """
<filter>
  <interfaces-state xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces"/>
</filter>
"""
with manager.connect(**DEVICE) as m:
    reply = m.get(filter=FILTER)
    root = etree.fromstring(reply.data_xml.encode())
    for intf in root.xpath('//if:interfaces-state/if:interface', namespaces=NS):
        name = intf.findtext('if:name', namespaces=NS)
        oper = intf.findtext('if:oper-status', namespaces=NS)
        octets = intf.findtext('if:statistics/if:in-octets', namespaces=NS)
        print(name, oper, octets)
`,
      check: (sh, c) => MYN_pyOk(sh, c, 'oper.py') && /GigabitEthernet1\s+up\s+\d+/.test(MYN_py(sh).stdout) && /GigabitEthernet3\s+down\s+\d+/.test(MYN_py(sh).stdout) && MYN_has(sh, `${MYN_H}/nc/oper.py`, /interfaces-state/) && MYN_has(sh, `${MYN_H}/nc/oper.py`, /m\.get\(/) },
    { id: 'nc6', title: 'edit-config, merge ve commit', xp: 40,
      story: "Yazma işi `edit-config` ile olur. Hedef datastore `candidate` ise değişiklik önce taslağa yazılır, cihaz `commit` görene kadar running'e dokunmaz. Varsayılan operation `merge`, yani gönderdiğin node'lar var olanlarla birleşir, göndermediklerine dokunulmaz. Bu, CLI'daki `description` satırını yazmanın programatik karşılığı.",
      task: "`~/nc/merge.py` içindeki CONFIG'i doldur, GigabitEthernet2 description'ını `core uplink to sw1` yap. candidate'e `edit-config` gönder, ardından `commit`. `python3 ~/nc/merge.py` çalıştır ve `ssh admin@r1.lab \"show interfaces description\"` ile doğrula.",
      hint: "`m.edit_config(target='candidate', config=CONFIG)` sonra `m.commit()`. CONFIG kökü `<config xmlns=\"urn:ietf:params:xml:ns:netconf:base:1.0\">` olmalı, içinde ietf-interfaces namespace'li `<interfaces><interface><name>GigabitEthernet2</name><description>...</description></interface></interfaces>`. Commit olmadan candidate'teki değişiklik running'e geçmez, RFC 6241 bölüm 8.3 candidate capability ve 7.2 edit-config, default-operation merge'ü anlatır.",
      solution: 'nano ~/nc/merge.py\npython3 ~/nc/merge.py\nssh admin@r1.lab "show interfaces description"',
      setup: MYN_setup,
      editorContent: `${MYN_HEAD}
CONFIG = """
<config xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
    <interface>
      <name>GigabitEthernet2</name>
      <description>core uplink to sw1</description>
    </interface>
  </interfaces>
</config>
"""
with manager.connect(**DEVICE) as m:
    reply = m.edit_config(target='candidate', config=CONFIG)
    print('edit-config', 'ok' if reply.ok else reply.error)
    reply = m.commit()
    print('commit', 'ok' if reply.ok else reply.error)
`,
      check: (sh, c) => { const st = MYN_state(); const i = MYN_intf(st, 'GigabitEthernet2'); return MYN_pyOk(sh, c, 'merge.py') && !!i && i.description === 'core uplink to sw1' && st.candidatePending === false && MYN_has(sh, `${MYN_H}/nc/merge.py`, /candidate/) && MYN_has(sh, `${MYN_H}/nc/merge.py`, /commit\(/); } },
    { id: 'nc7', title: 'lock ve unlock', xp: 35,
      story: "İki operatör aynı anda candidate'e yazarsa biri diğerinin yarım değişikliğini commit edebilir. `lock` datastore'u sana ayırır, işin bitince `unlock`. ncclient'ta `m.locked('candidate')` bir context manager, blok bitince ya da exception fırlasa bile kilidi bırakır. Üretimde bu bloğu atlayan script bir gün birinin canını yakar.",
      task: "`~/nc/lock.py` yaz. `with m.locked('candidate'):` bloğu içinde GigabitEthernet3 description'ını `dmz firewall link` yap ve commit et. Blok içinde `locked`, blok sonrası `unlocked` yazdır. `python3 ~/nc/lock.py` çalıştır.",
      hint: "`with m.locked('candidate'):` içinde `m.edit_config(...)` ve `m.commit()`. Kilit zaten başkasındaysa sunucu `lock-denied` error-tag'i ve kilidi tutan session-id'yi döner, RFC 6241 bölüm 7.5 lock ve 7.6 unlock. Bazı cihazlar candidate ile birlikte running'i de kilitlemeni ister, commit sırasında running yazıldığı için.",
      solution: 'nano ~/nc/lock.py\npython3 ~/nc/lock.py',
      setup: MYN_setup,
      editorContent: `${MYN_HEAD}
CONFIG = """
<config xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
    <interface>
      <name>GigabitEthernet3</name>
      <description>dmz firewall link</description>
    </interface>
  </interfaces>
</config>
"""
with manager.connect(**DEVICE) as m:
    with m.locked('candidate'):
        print('locked')
        m.edit_config(target='candidate', config=CONFIG)
        m.commit()
    print('unlocked')
`,
      check: (sh, c) => { const st = MYN_state(); const i = MYN_intf(st, 'GigabitEthernet3'); return MYN_pyOk(sh, c, 'lock.py') && !!i && i.description === 'dmz firewall link' && st.locks && st.locks.candidate == null && /locked[\s\S]*unlocked/.test(MYN_py(sh).stdout) && MYN_has(sh, `${MYN_H}/nc/lock.py`, /locked\(/); } },
    { id: 'nc8', title: 'create ve data-exists', xp: 45,
      story: "merge sessizdir, var olanı günceller yok olanı yaratır. Bazen tam tersini istersin, `nc:operation=\"create\"` node zaten varsa hata döner, böylece yanlışlıkla başkasının interface'ini ezmezsin. Hata `rpc-error` olarak gelir, error-tag `data-exists`. ncclient bunu `RPCError` exception'ına çevirir, `e.tag` ve `e.message` alanları var. İyi script hatayı yakalar ve anlamlı bir şey söyler.",
      task: "`~/nc/create.py` yaz. `Loopback100` interface'ini `operation=\"create\"` ile, description `netconf lab`, type `ianaift:softwareLoopback` olarak candidate'e yaz ve commit et. Aynı edit-config'i ikinci kez gönder, `RPCError` yakala ve `e.tag` yazdır, sonra `discard_changes` çağır. `python3 ~/nc/create.py` çalıştır.",
      hint: "`<interface xmlns:nc=\"urn:ietf:params:xml:ns:netconf:base:1.0\" nc:operation=\"create\">` ile node'a operation verilir. type için `<type xmlns:ianaift=\"urn:ietf:params:xml:ns:yang:iana-if-type\">ianaift:softwareLoopback</type>`. `from ncclient.operations import RPCError` ve `try: ... except RPCError as e: print(e.tag)`. RFC 6241 bölüm 7.2 operation attribute'unu, Appendix A ise data-exists ve diğer error-tag'leri listeler.",
      solution: 'nano ~/nc/create.py\npython3 ~/nc/create.py',
      setup: MYN_setup,
      editorContent: `${MYN_HEAD}from ncclient.operations import RPCError

CONFIG = """
<config xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
    <interface xmlns:nc="urn:ietf:params:xml:ns:netconf:base:1.0" nc:operation="create">
      <name>Loopback100</name>
      <description>netconf lab</description>
      <type xmlns:ianaift="urn:ietf:params:xml:ns:yang:iana-if-type">ianaift:softwareLoopback</type>
      <enabled>true</enabled>
    </interface>
  </interfaces>
</config>
"""
with manager.connect(**DEVICE) as m:
    for attempt in (1, 2):
        try:
            m.edit_config(target='candidate', config=CONFIG)
            m.commit()
            print('attempt', attempt, 'created Loopback100')
        except RPCError as e:
            print('attempt', attempt, 'rpc-error', e.tag, e.message)
            m.discard_changes()
`,
      check: (sh, c) => { const st = MYN_state(); const i = MYN_intf(st, 'Loopback100'); return MYN_pyOk(sh, c, 'create.py') && !!i && i.description === 'netconf lab' && st.candidatePending === false && /data-exists/.test(MYN_py(sh).stdout) && /created/.test(MYN_py(sh).stdout) && MYN_has(sh, `${MYN_H}/nc/create.py`, /except\s+RPCError/) && MYN_has(sh, `${MYN_H}/nc/create.py`, /operation="create"/); } },
    { id: 'nc9', title: 'replace ve delete', xp: 40,
      story: "Dört operation daha var. `replace` hedef node'u gönderdiğinle tamamen değiştirir, göndermediğin child'lar silinir. `delete` node'u siler, yoksa `data-missing` hatası döner. `remove` da siler ama yoksa sessiz kalır. Replace bir interface'in tüm ayarlarını tek seferde bilinen bir duruma getirmek için idealdir, declarative yaklaşımın temelidir.",
      task: "`~/nc/replace.py` yaz. Tek bir edit-config içinde GigabitEthernet3'ü `operation=\"replace\"` ile description `dmz replaced`, type `ianaift:ethernetCsmacd` ve enabled true olarak yeniden tanımla, ayrıca Loopback100'ü `operation=\"delete\"` ile sil. Commit et. `python3 ~/nc/replace.py` çalıştır.",
      hint: "Aynı `<interfaces>` içinde iki `<interface>` element'i, biri `nc:operation=\"replace\"` diğeri `nc:operation=\"delete\"`. Replace edilen interface'te mandatory `type` leaf'ini de göndermelisin, çünkü replace önce siler sonra yazar. RFC 6241 bölüm 7.2 operation değerlerini, replace ile merge farkını anlatır. Delete için sadece key yeterlidir.",
      solution: 'nano ~/nc/replace.py\npython3 ~/nc/replace.py',
      setup: MYN_setup,
      editorContent: `${MYN_HEAD}
CONFIG = """
<config xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces" xmlns:nc="urn:ietf:params:xml:ns:netconf:base:1.0">
    <interface nc:operation="replace">
      <name>GigabitEthernet3</name>
      <description>dmz replaced</description>
      <type xmlns:ianaift="urn:ietf:params:xml:ns:yang:iana-if-type">ianaift:ethernetCsmacd</type>
      <enabled>true</enabled>
    </interface>
    <interface nc:operation="delete">
      <name>Loopback100</name>
    </interface>
  </interfaces>
</config>
"""
with manager.connect(**DEVICE) as m:
    reply = m.edit_config(target='candidate', config=CONFIG)
    print('edit-config', 'ok' if reply.ok else reply.error)
    m.commit()
    print('commit ok')
`,
      check: (sh, c) => { const st = MYN_state(); const i = MYN_intf(st, 'GigabitEthernet3'); return MYN_pyOk(sh, c, 'replace.py') && !!i && i.description === 'dmz replaced' && i.enabled === true && !MYN_intf(st, 'Loopback100') && MYN_has(sh, `${MYN_H}/nc/replace.py`, /operation="replace"/) && MYN_has(sh, `${MYN_H}/nc/replace.py`, /operation="delete"/); } },
    { id: 'nc10', title: 'validate ve discard-changes', xp: 40,
      story: "Candidate'in asıl gücü burada. Taslağı `validate` ile sunucuya kontrol ettirirsin, tip ve kısıt ihlalleri commit'ten önce yakalanır. validate'e datastore adı yerine bir `<config>` gövdesi de verebilirsin, sunucu onu uygulamadan sınar, dry run'ın ta kendisi. Beğenmediysen `discard-changes` taslağı running'in kopyasına geri döndürür. Hiçbir şey cihazın canlı config'ine dokunmamış olur.",
      task: "`~/nc/validate.py` yaz. Önce candidate'e GigabitEthernet2 description `pending change` yaz ve `m.validate(source='candidate')` ile doğrula, `candidate valid` yazdır. Sonra `enabled` değeri `maybe` olan bozuk bir config'i `m.validate(source=BAD)` ile inline sına, `RPCError` yakala ve `e.tag` yazdır. En sonda `m.discard_changes()` çağır ve `discarded` yazdır. `python3 ~/nc/validate.py` çalıştır, cihazda description değişmemiş olmalı.",
      hint: "validate sunucuya YANG tiplerini kontrol ettirir, boolean leaf'e `maybe` yazınca `invalid-value` error-tag'i gelir. `try: m.validate(source=BAD) except RPCError as e: print('invalid', e.tag, e.message)` ve `finally: m.discard_changes()`. RFC 6241 bölüm 8.6 validate capability, 8.6.4.1 validate'in config kaynağı alabildiğini, 8.3.4.2 discard-changes'ı anlatır.",
      solution: 'nano ~/nc/validate.py\npython3 ~/nc/validate.py',
      setup: MYN_setup,
      editorContent: `${MYN_HEAD}from ncclient.operations import RPCError

PENDING = """
<config xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
    <interface>
      <name>GigabitEthernet2</name>
      <description>pending change</description>
    </interface>
  </interfaces>
</config>
"""
BAD = """
<config xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
    <interface>
      <name>GigabitEthernet2</name>
      <enabled>maybe</enabled>
    </interface>
  </interfaces>
</config>
"""
with manager.connect(**DEVICE) as m:
    try:
        m.edit_config(target='candidate', config=PENDING)
        m.validate(source='candidate')
        print('candidate valid')
        m.validate(source=BAD)
        print('bad config valid, this should not happen')
    except RPCError as e:
        print('invalid', e.tag, e.message)
    finally:
        m.discard_changes()
        print('discarded')
`,
      check: (sh, c) => { const st = MYN_state(); const i = MYN_intf(st, 'GigabitEthernet2'); const out = MYN_py(sh).stdout; return MYN_pyOk(sh, c, 'validate.py') && !!i && i.description !== 'pending change' && st.candidatePending === false && /candidate valid/.test(out) && /invalid\s+invalid-value/.test(out) && /discarded/.test(out) && MYN_has(sh, `${MYN_H}/nc/validate.py`, /validate\(/) && MYN_has(sh, `${MYN_H}/nc/validate.py`, /discard_changes\(/); } },
    { id: 'nc11', title: 'jinja2 ile toplu edit-config', xp: 50,
      story: "Gerçek iş üç interface'i tek tek yazmak değil, bir source of truth dosyasından üretmektir. YAML veriyi tutar, jinja2 template'i XML'e çevirir, tek bir edit-config hepsini atomik olarak uygular, ya hepsi ya hiçbiri. İkinci çalışmada hiçbir şey değişmemeli, buna idempotency denir ve kontrolü edit-config öncesi ve sonrası get-config karşılaştırmasıyla yapılır.",
      task: "`~/nc/render.py` yaz. `~/nc/interfaces.yaml` dosyasını oku, TEMPLATE'i jinja2 ile render edip tek edit-config olarak candidate'e yaz ve commit et. Edit öncesi ve sonrası aynı interface'ler için get-config çek, çıktılar farklıysa `changed` aynıysa `no change` yazdır. Script'i iki kez çalıştır, ikinci çıktı `no change` olmalı.",
      hint: "`Template(TEMPLATE).render(interfaces=data['interfaces'])` ve template içinde `{% for i in interfaces %}` döngüsü, `enabled` için `{{ 'true' if i.enabled else 'false' }}`. Karşılaştırma için `m.get_config(source='running', filter=F).data_xml` iki kez, filter da aynı yaml'dan render edilebilir. RFC 6241 bölüm 7.2 edit-config'in tek mesaj içinde birden fazla node taşıyabildiğini, hata halinde `rollback-on-error` ile tümünün geri alınabildiğini anlatır.",
      solution: 'nano ~/nc/render.py\npython3 ~/nc/render.py\npython3 ~/nc/render.py',
      setup: MYN_setup,
      editorContent: `import yaml
from jinja2 import Template
${MYN_HEAD}
TEMPLATE = """
<config xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
  {% for i in interfaces %}
    <interface>
      <name>{{ i.name }}</name>
      <description>{{ i.description }}</description>
      <enabled>{{ 'true' if i.enabled else 'false' }}</enabled>
    </interface>
  {% endfor %}
  </interfaces>
</config>
"""
FILTER = """
<filter>
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
  {% for i in interfaces %}
    <interface><name>{{ i.name }}</name></interface>
  {% endfor %}
  </interfaces>
</filter>
"""
with open('/home/burak/nc/interfaces.yaml') as f:
    data = yaml.safe_load(f)

config = Template(TEMPLATE).render(interfaces=data['interfaces'])
flt = Template(FILTER).render(interfaces=data['interfaces'])
with manager.connect(**DEVICE) as m:
    before = m.get_config(source='running', filter=flt).data_xml
    m.edit_config(target='candidate', config=config)
    m.commit()
    after = m.get_config(source='running', filter=flt).data_xml
    print('changed' if before != after else 'no change')
`,
      check: (sh, c) => {
        const st = MYN_state(); if (!MYN_pyOk(sh, c, 'render.py') || !st) return false;
        const g2 = MYN_intf(st, 'GigabitEthernet2'), g3 = MYN_intf(st, 'GigabitEthernet3'), lo = MYN_intf(st, 'Loopback0');
        const applied = g2 && g3 && lo && g2.description === 'core uplink to sw1' && g2.enabled === true && g3.description === 'dmz firewall link' && g3.enabled === false && lo.description === 'router id loopback';
        return !!applied && /no change/.test(MYN_py(sh).stdout) && MYN_has(sh, `${MYN_H}/nc/render.py`, /\{%\s*for/) && MYN_has(sh, `${MYN_H}/nc/render.py`, /safe_load|yaml\.load/);
      } },
    { id: 'nc12', title: 'Compliance audit', xp: 60,
      story: "Son görev bir CI job'ının yapacağı iş. Source of truth dosyası ile cihazın running config'ini NETCONF üzerinden karşılaştır, her interface için description ve enabled durumunu kontrol et. Sapma varsa satır satır raporla ve exit code 1 ile çık, pipeline kırmızıya dönsün. Sapma yoksa `compliant` yaz ve 0 ile çık. Birisi cihazda elle değişiklik yaptığında bunu ilk fark eden script olur. Lab `~/nc/drift.xml` içine böyle bir elle değişikliği ham rpc olarak koydu.",
      task: "`~/nc/audit.py` yaz. `interfaces.yaml`'ı oku, her interface için running'den description ve enabled çek, farkları `DRIFT isim alan beklenen gerçek` biçiminde yazdır. Drift varsa `sys.exit(1)`. Önce `python3 ~/nc/audit.py` ile compliant olduğunu gör, sonra `cat ~/nc/drift.xml | ssh -p 830 admin@r1.lab -s netconf` ile cihazı elle değiştir ve script'in drift yakalayıp exit 1 döndüğünü `echo $?` ile gör.",
      hint: "lxml ile parse edip `findtext` ile değerleri al, `enabled` metnini boolean'a çevir, YAML değeriyle karşılaştır. XPath'te tek bir entry'yi `//if:interfaces/if:interface[if:name='GigabitEthernet3']` ile seçebilirsin. RFC 6241 get-config, RFC 7223 ietf-interfaces, exit code sözleşmesi ise POSIX'ten gelir, 0 başarı, sıfır dışı hata, CI sistemleri sadece buna bakar.",
      solution: 'nano ~/nc/audit.py\npython3 ~/nc/audit.py\ncat ~/nc/drift.xml | ssh -p 830 admin@r1.lab -s netconf\npython3 ~/nc/audit.py',
      setup: MYN_setup,
      editorContent: `import sys
import yaml
from lxml import etree
${MYN_HEAD}
NS = {'if': 'urn:ietf:params:xml:ns:yang:ietf-interfaces'}

with open('/home/burak/nc/interfaces.yaml') as f:
    wanted = yaml.safe_load(f)['interfaces']

drift = 0
with manager.connect(**DEVICE) as m:
    root = etree.fromstring(m.get_config(source='running').data_xml.encode())
    for w in wanted:
        node = root.xpath(f"//if:interfaces/if:interface[if:name='{w['name']}']", namespaces=NS)
        if not node:
            print('DRIFT', w['name'], 'missing')
            drift += 1
            continue
        node = node[0]
        actual = {
            'description': node.findtext('if:description', namespaces=NS) or '',
            'enabled': node.findtext('if:enabled', namespaces=NS) != 'false',
        }
        for field in ('description', 'enabled'):
            if actual[field] != w[field]:
                print('DRIFT', w['name'], field, repr(w[field]), repr(actual[field]))
                drift += 1

if drift:
    print(drift, 'drift found')
    sys.exit(1)
print('compliant')
`,
      check: (sh, c) => {
        if (!MYN_ran(c, /\bpython3?\b/) || !c.line.includes('audit.py')) return false;
        const p = MYN_py(sh); const st = MYN_state(); const g3 = MYN_intf(st, 'GigabitEthernet3');
        const fileOk = MYN_has(sh, `${MYN_H}/nc/audit.py`, /sys\.exit\(1\)/) && MYN_has(sh, `${MYN_H}/nc/audit.py`, /safe_load|yaml\.load/) && MYN_has(sh, `${MYN_H}/nc/audit.py`, /get_config\(/);
        /* drift durumu, cihaz elle degistirilmis ve script 1 ile cikmis */
        return fileOk && !!g3 && g3.description === 'manual change' && p.code === 1 && /DRIFT\s+GigabitEthernet3\s+description/.test(p.stdout);
      } },
  ],
});

QUIZ.push(
  { q: 'NETCONF hangi transport ve port üzerinde çalışır?', a: ['SSH, TCP 830', 'HTTPS, TCP 443', 'gRPC, TCP 57400', 'Telnet, TCP 23'], c: 0 },
  { q: "NETCONF oturumunun ilk mesajı nedir?", a: ['hello, capability listesiyle', 'get-config', 'lock', 'commit'], c: 0 },
  { q: "candidate datastore'a yazılan değişiklik running'e ne zaman geçer?", a: ['commit gönderilince', 'edit-config biter bitmez', 'unlock ile', 'close-session ile'], c: 0 },
  { q: "edit-config'in varsayılan operation'ı nedir?", a: ['merge', 'replace', 'create', 'delete'], c: 0 },
  { q: "operation=\"create\" zaten var olan bir node'a uygulanırsa ne olur?", a: ['data-exists error-tag ile rpc-error döner', 'Node güncellenir', 'Node silinir', 'Sessizce yok sayılır'], c: 0 },
  { q: 'delete ile remove arasındaki fark nedir?', a: ["delete node yoksa data-missing hatası verir, remove sessiz kalır", 'remove daha hızlıdır', "delete sadece running'de çalışır", 'Fark yoktur'], c: 0 },
  { q: 'Subtree filter nasıl çalışır?', a: ['İstenen dalın XML iskeleti gönderilir, sunucu sadece eşleşen kısmı döner', 'Regex ile', 'SQL where ile', 'Sunucu her şeyi döner, client süzer'], c: 0 },
  { q: 'get ile get-config arasındaki fark nedir?', a: ["get config ve config false state'i birlikte döner, get-config sadece config döner", 'get daha hızlıdır', 'get-config yazma yapar', 'Fark yoktur'], c: 0 },
  { q: "`m.locked('candidate')` context manager'ı neden tercih edilir?", a: ['Exception olsa bile blok çıkışında unlock gönderir', 'Daha hızlı commit yapar', 'Validate de yapar', 'Running de kilitlenmez'], c: 0 },
  { q: 'validate RPC ne yapar?', a: ["Datastore'u ya da verilen config'i uygulamadan YANG kurallarına göre kontrol eder", 'Config yedekler', "Cihazı reboot eder", 'Sadece XML syntax kontrolü yapar'], c: 0 },
);

BADGES.push({ id: 'netconf', icon: '📡', title: 'NETCONF Ustası', desc: 'NETCONF ve ncclient bölümünü bitir', test: st => CHAPTERS.find(c => c.id === 'netconf').missions.every(m => st.done.includes(m.id)) });
