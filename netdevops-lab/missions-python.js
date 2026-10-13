'use strict';
/* Python ile Network Automation bolumu. Her gorev /home/burak/pyws/<id>/ altinda calisir. Yardimcilar mpy on ekli. */

const MPY_HOME = '/home/burak';
/* dizini yarat, dosyalari yaz. ownership burak, mode 644 */
function mpyFiles(sh, dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = dir + '/' + rel;
    const parent = abs.split('/').slice(0, -1).join('/');
    sh.run('mkdir -p ' + parent);
    sh.writeFile(abs, content, false, 'nano');
  }
}
/* son python calismasi bu gorev dizininde mi, argv ya da cwd uzerinden */
function mpyRanIn(sh, dir) {
  const lp = sh.lastPy;
  if (!lp) return false;
  const argv = (lp.argv || []).map(a => String(a));
  return argv.some(a => a.startsWith(dir + '/')) || sh.cwd === dir || sh.cwd.startsWith(dir + '/');
}
/* basarili calisti ve stdout verilen her parcayi iceriyor */
function mpyOut(sh, dir, ...needles) {
  const lp = sh.lastPy;
  return !!lp && lp.code === 0 && mpyRanIn(sh, dir) && needles.every(n => n instanceof RegExp ? n.test(lp.stdout) : lp.stdout.includes(n));
}
function mpyFile(sh, path, ...needles) {
  const n = sh.node(path);
  return !!(n && n.t === 'f' && needles.every(s => s instanceof RegExp ? s.test(n.d) : n.d.includes(s)));
}
/* p7 icin deterministik buyuk syslog, Park Miller LCG, 5 host x 480 satir, host sirali */
function mpyBigLog() {
  let seed = 20261013;
  const rnd = () => (seed = (seed * 48271) % 2147483647);
  const hosts = ['ion1', 'r1', 'r2', 'sw1', 'sw2'];
  const events = [
    ['LINK-3-UPDOWN', 'Interface GigabitEthernet2, changed state to down'],
    ['LINEPROTO-5-UPDOWN', 'Line protocol on Interface GigabitEthernet2, changed state to up'],
    ['SYS-5-CONFIG_I', 'Configured from console by burak on vty0 (10.10.10.5)'],
    ['BGP-5-ADJCHANGE', 'neighbor 10.0.12.2 Up'],
    ['OSPF-4-ERRRCV', 'Received invalid packet: mismatched area ID from 10.0.13.3, GigabitEthernet3'],
    ['SEC_LOGIN-4-LOGIN_FAILED', 'Login failed [user: admin] [Source: 203.0.113.9] [localport: 22]'],
    ['SYS-2-MALLOCFAIL', 'Memory allocation of 65536 bytes failed from 0x1A2B3C'],
    ['SYS-6-LOGGINGHOST_STARTSTOP', 'Logging to host 10.10.10.9 started'],
    ['PLATFORM-1-CRASHED', 'Process iosd crashed'],
  ];
  const pick = r => r === 39 ? 8 : r === 38 ? 6 : r >= 36 ? 0 : r >= 33 ? 7 : r >= 29 ? 5 : r >= 25 ? 4 : r >= 19 ? 3 : r >= 12 ? 2 : 1;
  const two = n => String(n).padStart(2, '0');
  const lines = [];
  for (const host of hosts) {
    let t = 0;
    for (let i = 0; i < 480; i++) {
      t += 1 + rnd() % 30;
      const ms = rnd() % 1000;
      const [tag, msg] = events[pick(rnd() % 40)];
      lines.push(`Oct 12 ${two(Math.floor(t / 3600) % 24)}:${two(Math.floor(t / 60) % 60)}:${two(t % 60)}.${String(ms).padStart(3, '0')} ${host} %${tag}: ${msg}`);
    }
  }
  return lines.join('\n') + '\n';
}

CHAPTERS.push({
  id: "python", icon: "🐍", title: "Python ile Network Automation", sub: "Parse, model, dosya, CLI, paket. Gerçek Python 3.14 tarayıcıda",
  missions: [
    { id: "p1", title: "show ip int brief parse", xp: 30,
      story: "Her automation işi aynı yerden başlar, cihazdan gelen düz metni yapısal veriye çevirmek. `show ip interface brief` çıktısı sütunlu ama sabit genişlikte değil, `administratively down` iki kelime olduğu için naive split sütunları kaydırır. Bu görevde str metodları ve splitlines ile bir list of dict üretiyorsun.",
      task: "`~/pyws/p1/parse_brief.py` dosyasındaki TODO'ları doldur. `parse_brief` her veri satırını interface, ip, status, protocol anahtarlı dict'e çevirsin. main her satır için `GigabitEthernet3 unassigned administratively down/down` biçiminde bir satır, sonunda `total 7 up 4 down 3` yazsın. up demek status up ve protocol up. Sonra `python3 ~/pyws/p1/parse_brief.py` ile çalıştır.",
      hint: "text.splitlines ile satırları al, header satırını startswith ile atla. `parts = line.split()` yaptıktan sonra protocol her zaman `parts[-1]`, status ise `parts[4]` ile `parts[-1]` arasının birleşimi, yani `\" \".join(parts[4:-1])`. Negatif index ve dilim bu tip değişken kelime sayılı sütunlarda kurtarıcıdır. Sık hata, `split(\" \")` yazmak, boş argüman ardışık boşlukları tek ayraç sayar, `split(\" \")` saymaz. Dokümantasyon için docs.python.org'da Built-in Types altındaki str.split, str.splitlines ve Text Sequence Type bölümü.",
      solution: "nano ~/pyws/p1/parse_brief.py\npython3 ~/pyws/p1/parse_brief.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p1", {
        "parse_brief.py": `"""show ip interface brief ciktisini yapisal veriye cevir."""
from pathlib import Path


def parse_brief(text: str) -> list[dict[str, str]]:
    """Her veri satirini interface, ip, status, protocol anahtarli dict'e cevir."""
    # TODO splitlines ile satirlari gez, header satirini atla
    # TODO split ile parcala, "administratively down" iki kelime, dikkat
    raise NotImplementedError


def main() -> None:
    text = Path(__file__).with_name("show_ip_int_brief.txt").read_text()
    rows = parse_brief(text)
    # TODO her satir icin "interface ip status/protocol" yazdir
    # TODO sonunda "total N up N down N" yazdir, up demek status up ve protocol up


if __name__ == "__main__":
    main()
`,
        "show_ip_int_brief.txt": `Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet1       10.0.0.1        YES NVRAM  up                    up
GigabitEthernet2       10.0.12.1       YES NVRAM  up                    up
GigabitEthernet3       unassigned      YES unset  administratively down down
GigabitEthernet4       192.168.100.1   YES manual up                    down
Loopback0              1.1.1.1         YES NVRAM  up                    up
Tunnel100              172.16.0.1      YES manual up                    up
Vlan1                  unassigned      YES unset  down                  down
`,
      }); },
      editorContent: {
        "~/pyws/p1/parse_brief.py": `"""show ip interface brief ciktisini yapisal veriye cevir."""
from pathlib import Path


def parse_brief(text: str) -> list[dict[str, str]]:
    """Her veri satirini interface, ip, status, protocol anahtarli dict'e cevir."""
    rows: list[dict[str, str]] = []
    for line in text.splitlines():
        if not line.strip() or line.startswith("Interface"):
            continue
        parts = line.split()
        rows.append({
            "interface": parts[0],
            "ip": parts[1],
            "status": " ".join(parts[4:-1]),
            "protocol": parts[-1],
        })
    return rows


def is_up(row: dict[str, str]) -> bool:
    """Hem status hem protocol up ise interface calisiyor demektir."""
    return row["status"] == "up" and row["protocol"] == "up"


def main() -> None:
    text = Path(__file__).with_name("show_ip_int_brief.txt").read_text()
    rows = parse_brief(text)
    for row in rows:
        print(f"{row['interface']} {row['ip']} {row['status']}/{row['protocol']}")
    up = sum(1 for row in rows if is_up(row))
    print(f"total {len(rows)} up {up} down {len(rows) - up}")


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p1', 'GigabitEthernet3 unassigned administratively down/down', 'GigabitEthernet4 192.168.100.1 up/down', 'total 7 up 4 down 3') && mpyFile(sh, '/home/burak/pyws/p1/parse_brief.py', 'splitlines') },
    { id: "p2", title: "Regex named groups", xp: 35,
      story: "Syslog ve `show ip bgp summary` gibi çıktılarda split yetmez, desen gerekir. re modülünde named group, yani `(?P<isim>...)`, eşleşmeyi doğrudan dict'e çevirir ve kodu okunur tutar. Bir TAC mühendisi için bu, log'u dakikalar içinde tabloya dökmek demek.",
      task: "`~/pyws/p2/parse_logs.py` içindeki SYSLOG_RE ve BGP_RE desenlerini named group ile yaz, parse fonksiyonlarını groupdict ile doldur. Çıktı sırasıyla `syslog 9 lines, 2 with severity 3 or lower`, altında iki `  Oct 12 03:14:07.221 LINK-3-UPDOWN Interface GigabitEthernet2, changed state to down` biçiminde satır, `mnemonic counts ADJCHANGE=2 CONFIG_I=1 ERRRCV=1 LOGIN_FAILED=1 UPDOWN=4`, `bgp 4 neighbors, 2 established, 2 down` ve down olanlar için `  10.0.14.4 AS65004 Idle` satırları. Çalıştır.",
      hint: "Raw string kullan, r\"...\", yoksa \\d gibi kaçışlar Python string'inde kaybolur. Syslog için `^(?P<ts>\\w{3} +\\d+ \\d\\d:\\d\\d:\\d\\d(?:\\.\\d+)?) (?P<host>\\S+) %(?P<facility>[A-Z0-9_]+)-(?P<severity>\\d)-(?P<mnemonic>[A-Z0-9_]+): (?P<msg>.*)$`. BGP satırında neighbor, version, asn'den sonra 5 sayaç sütunu var, `(?:\\s+\\d+){5}` ile yakalamadan geç, sonra updown ve state. re.match satır başından eşleşir, re.search ortadan da bulur, header satırları eşleşmeyince None döner, walrus ile `if (m := RE.match(line))` deseni temizdir. State sütunu sayıysa session established, isdigit ile bak. Dokümantasyon re modülü, Regular Expression Syntax ve Match Objects bölümleri.",
      solution: "nano ~/pyws/p2/parse_logs.py\npython3 ~/pyws/p2/parse_logs.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p2", {
        "bgp_summary.txt": `BGP router identifier 1.1.1.1, local AS number 65001
BGP table version is 42, main routing table version 42

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.0.12.2       4        65002   18231   18227       42    0    0 1d02h         120
10.0.13.3       4        65003     912     915       42    0    0 00:05:12        4
10.0.14.4       4        65004       0       0        1    0    0 never    Idle
192.168.255.9   4        65001    4410    4412       42    0    0 3d11h  Active
`,
        "parse_logs.py": `"""Syslog ve show ip bgp summary ciktisini named group'lu regex ile parse et."""
import re
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent

# TODO ts, host, facility, severity, mnemonic, msg named group'lari
SYSLOG_RE = re.compile(r"")

# TODO neighbor, version, asn, updown, state named group'lari, aradaki 5 sayac sutununu yakalamadan gec
BGP_RE = re.compile(r"")


def parse_syslog(text: str) -> list[dict[str, str]]:
    """Her satiri groupdict'e cevir, eslesmeyen satirlari atla."""
    raise NotImplementedError


def parse_bgp(text: str) -> list[dict[str, str]]:
    """Sadece neighbor satirlarini yakala, header ve bos satirlar eslesmez."""
    raise NotImplementedError


def main() -> None:
    logs = parse_syslog((HERE / "syslog.log").read_text())
    # TODO "syslog N lines, N with severity 3 or lower" ve severity <= 3 olanlari "  ts FAC-SEV-MNEM msg" olarak yaz
    # TODO Counter ile mnemonic sayilari, "mnemonic counts A=1 B=2" alfabetik
    peers = parse_bgp((HERE / "bgp_summary.txt").read_text())
    # TODO "bgp N neighbors, N established, N down" ve down olanlari "  neighbor ASn state" olarak yaz
    # established demek state sutunu sayi, yani prefix sayisi


if __name__ == "__main__":
    main()
`,
        "syslog.log": `Oct 12 03:14:07.221 r1 %LINK-3-UPDOWN: Interface GigabitEthernet2, changed state to down
Oct 12 03:14:08.224 r1 %LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet2, changed state to down
Oct 12 03:14:40.901 r1 %BGP-5-ADJCHANGE: neighbor 10.0.12.2 Down BGP Notification sent
Oct 12 03:15:02.118 r1 %LINK-3-UPDOWN: Interface GigabitEthernet2, changed state to up
Oct 12 03:15:03.120 r1 %LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet2, changed state to up
Oct 12 03:15:31.552 r1 %BGP-5-ADJCHANGE: neighbor 10.0.12.2 Up
Oct 12 04:02:11.003 r1 %SYS-5-CONFIG_I: Configured from console by burak on vty0 (10.10.10.5)
Oct 12 04:30:00.777 r1 %OSPF-4-ERRRCV: Received invalid packet: mismatched area ID from 10.0.13.3, GigabitEthernet3
Oct 12 05:11:19.414 r1 %SEC_LOGIN-4-LOGIN_FAILED: Login failed [user: admin] [Source: 203.0.113.9] [localport: 22] [Reason: Login Authentication Failed]
`,
      }); },
      editorContent: {
        "~/pyws/p2/parse_logs.py": `"""Syslog ve show ip bgp summary ciktisini named group'lu regex ile parse et."""
import re
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent

SYSLOG_RE = re.compile(
    r"^(?P<ts>\\w{3} +\\d+ \\d\\d:\\d\\d:\\d\\d(?:\\.\\d+)?) (?P<host>\\S+) "
    r"%(?P<facility>[A-Z0-9_]+)-(?P<severity>\\d)-(?P<mnemonic>[A-Z0-9_]+): (?P<msg>.*)$"
)

BGP_RE = re.compile(
    r"^(?P<neighbor>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?P<version>\\d)\\s+(?P<asn>\\d+)"
    r"(?:\\s+\\d+){5}\\s+(?P<updown>\\S+)\\s+(?P<state>\\S+)$"
)


def parse_syslog(text: str) -> list[dict[str, str]]:
    """Her satiri groupdict'e cevir, eslesmeyen satirlari atla."""
    return [m.groupdict() for line in text.splitlines() if (m := SYSLOG_RE.match(line))]


def parse_bgp(text: str) -> list[dict[str, str]]:
    """Sadece neighbor satirlarini yakala, header ve bos satirlar eslesmez."""
    return [m.groupdict() for line in text.splitlines() if (m := BGP_RE.match(line))]


def is_established(peer: dict[str, str]) -> bool:
    """State sutunu sayi ise session kurulu ve sayi alinan prefix adedidir."""
    return peer["state"].isdigit()


def main() -> None:
    logs = parse_syslog((HERE / "syslog.log").read_text())
    urgent = [e for e in logs if int(e["severity"]) <= 3]
    print(f"syslog {len(logs)} lines, {len(urgent)} with severity 3 or lower")
    for e in urgent:
        print(f"  {e['ts']} {e['facility']}-{e['severity']}-{e['mnemonic']} {e['msg']}")
    counts = Counter(e["mnemonic"] for e in logs)
    print("mnemonic counts " + " ".join(f"{k}={v}" for k, v in sorted(counts.items())))

    peers = parse_bgp((HERE / "bgp_summary.txt").read_text())
    down = [p for p in peers if not is_established(p)]
    print(f"bgp {len(peers)} neighbors, {len(peers) - len(down)} established, {len(down)} down")
    for p in down:
        print(f"  {p['neighbor']} AS{p['asn']} {p['state']}")


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p2', 'syslog 9 lines, 2 with severity 3 or lower', 'mnemonic counts ADJCHANGE=2 CONFIG_I=1 ERRRCV=1 LOGIN_FAILED=1 UPDOWN=4', 'bgp 4 neighbors, 2 established, 2 down', '192.168.255.9 AS65001 Active') && mpyFile(sh, '/home/burak/pyws/p2/parse_logs.py', '(?P<') },
    { id: "p3", title: "Comprehension ve sorted", xp: 35,
      story: "Envanter elinde, sorular basit ama çok. Hangi site'ta hangi cihazlar var, kim upgrade bekliyor, en uzun uptime kimde. Comprehension'lar bu soruları tek satırlık, okunur ifadelere çevirir. sorted'ın key parametresi ise sıralamayı istediğin alana, hatta alan kombinasyonuna bağlar.",
      task: "`~/pyws/p3/report.py` içindeki by_site, needs_upgrade ve longest_uptime fonksiyonlarını comprehension ve sorted ile doldur, main'i tamamla. Çıktı `ANK ank-acc-01 ank-core-01` gibi site başına bir satır alfabetik, `upgrade ank-acc-01 ist-acc-01 izm-wan-01`, `longest ank-acc-01 402, ank-core-01 402, ist-core-01 211`, `models C9200L-48P C9300-48P C9500-24Y4C C9500-48Y4C ION-3000`. Çalıştır.",
      hint: "Dict comprehension `{site: [...] for site in sites}`, set comprehension `{d['model'] for d in devices}` tekrarları atar. Azalan uptime ve artan hostname için tek key yeter, `key=lambda d: (-d['uptime_days'], d['hostname'])`, tuple'lar soldan sağa karşılaştırılır, sayıyı negatiflemek reverse=True'dan daha esnektir çünkü alanların yönü ayrı ayrı seçilir. operator.itemgetter lambda'nın okunur alternatifi. Sık hata, sorted yerine list.sort kullanıp dönüş değerini beklemek, sort None döner. Dokümantasyon Sorting HOW TO ve Data Structures bölümündeki List Comprehensions.",
      solution: "nano ~/pyws/p3/report.py\npython3 ~/pyws/p3/report.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p3", {
        "inventory.json": `[
  {"hostname": "ist-core-01", "site": "IST", "role": "core", "model": "C9500-48Y4C", "version": "17.9.4a", "uptime_days": 211},
  {"hostname": "ist-core-02", "site": "IST", "role": "core", "model": "C9500-48Y4C", "version": "17.9.4a", "uptime_days": 211},
  {"hostname": "ist-acc-01", "site": "IST", "role": "access", "model": "C9300-48P", "version": "17.6.5", "uptime_days": 34},
  {"hostname": "ist-acc-02", "site": "IST", "role": "access", "model": "C9300-48P", "version": "17.9.4a", "uptime_days": 3},
  {"hostname": "ank-core-01", "site": "ANK", "role": "core", "model": "C9500-24Y4C", "version": "17.9.4a", "uptime_days": 402},
  {"hostname": "ank-acc-01", "site": "ANK", "role": "access", "model": "C9200L-48P", "version": "17.6.5", "uptime_days": 402},
  {"hostname": "izm-wan-01", "site": "IZM", "role": "wan", "model": "ION-3000", "version": "6.4.1", "uptime_days": 77},
  {"hostname": "ist-wan-01", "site": "IST", "role": "wan", "model": "ION-3000", "version": "6.5.3", "uptime_days": 12}
]
`,
        "report.py": `"""Envanter uzerinde comprehension ve sorted ile rapor."""
import json
from pathlib import Path

Device = dict[str, str | int]
TARGET = {"C9500-48Y4C": "17.9.4a", "C9500-24Y4C": "17.9.4a", "C9300-48P": "17.9.4a",
          "C9200L-48P": "17.9.4a", "ION-3000": "6.5.3"}


def load() -> list[Device]:
    return json.loads(Path(__file__).with_name("inventory.json").read_text())


def by_site(devices: list[Device]) -> dict[str, list[str]]:
    """site -> alfabetik hostname listesi, dict comprehension icinde list comprehension."""
    raise NotImplementedError  # TODO


def needs_upgrade(devices: list[Device]) -> list[str]:
    """TARGET surumunde olmayan hostname'ler, alfabetik."""
    raise NotImplementedError  # TODO


def longest_uptime(devices: list[Device], n: int = 3) -> list[Device]:
    """Uptime azalan, esitlikte hostname artan, ilk n."""
    raise NotImplementedError  # TODO key=lambda ile tuple key


def main() -> None:
    devices = load()
    # TODO her site icin "SITE host1 host2 ..." alfabetik site sirasi
    # TODO "upgrade host1 host2 ..."
    # TODO "longest host days, host days, host days"
    # TODO "models m1 m2 ..." benzersiz ve alfabetik, set comprehension


if __name__ == "__main__":
    main()
`,
      }); },
      editorContent: {
        "~/pyws/p3/report.py": `"""Envanter uzerinde comprehension ve sorted ile rapor."""
import json
from operator import itemgetter
from pathlib import Path

Device = dict[str, str | int]
TARGET = {"C9500-48Y4C": "17.9.4a", "C9500-24Y4C": "17.9.4a", "C9300-48P": "17.9.4a",
          "C9200L-48P": "17.9.4a", "ION-3000": "6.5.3"}


def load() -> list[Device]:
    return json.loads(Path(__file__).with_name("inventory.json").read_text())


def by_site(devices: list[Device]) -> dict[str, list[str]]:
    """site -> alfabetik hostname listesi, dict comprehension icinde list comprehension."""
    sites = sorted({str(d["site"]) for d in devices})
    return {site: sorted(str(d["hostname"]) for d in devices if d["site"] == site) for site in sites}


def needs_upgrade(devices: list[Device]) -> list[str]:
    """TARGET surumunde olmayan hostname'ler, alfabetik."""
    return sorted(str(d["hostname"]) for d in devices if d["version"] != TARGET[str(d["model"])])


def longest_uptime(devices: list[Device], n: int = 3) -> list[Device]:
    """Uptime azalan, esitlikte hostname artan, ilk n."""
    return sorted(devices, key=lambda d: (-int(d["uptime_days"]), d["hostname"]))[:n]


def main() -> None:
    devices = load()
    for site, hosts in by_site(devices).items():
        print(site, *hosts)
    print("upgrade", *needs_upgrade(devices))
    top = longest_uptime(devices)
    print("longest " + ", ".join(f"{d['hostname']} {d['uptime_days']}" for d in top))
    models = sorted({str(d["model"]) for d in devices})
    print("models", *models)
    oldest = min(devices, key=itemgetter("uptime_days"))
    print(f"newest boot {oldest['hostname']} {oldest['uptime_days']} days")


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p3', 'IST ist-acc-01 ist-acc-02 ist-core-01 ist-core-02 ist-wan-01', 'upgrade ank-acc-01 ist-acc-01 izm-wan-01', 'longest ank-acc-01 402, ank-core-01 402, ist-core-01 211', 'models C9200L-48P C9300-48P C9500-24Y4C C9500-48Y4C ION-3000') && mpyFile(sh, '/home/burak/pyws/p3/report.py', 'sorted(', ' for ') },
    { id: "p4", title: "ipaddress modülü", xp: 35,
      story: "Prefix hesabını elle yapan mühendis bir gün yanlış yapar. ipaddress modülü network, host, overlap ve summarization için doğru matematik verir, string karşılaştırmanın tuzaklarından kurtarır. Routing tablosunda hangi prefix hangisini kapsıyor, bunu modül bilir.",
      task: "`~/pyws/p4/prefixes.py` içindeki load_routes, covered_by ve longest_match fonksiyonlarını doldur, main'i tamamla. Çıktı `10.0.0.0/22 covers 10.0.0.0/24 10.0.1.0/24 10.0.2.0/24 10.0.3.0/24`, `collapsed 10.0.0.0/22 10.10.10.0/24 172.16.5.0/24 192.168.100.0/25`, `hosts 10.10.10.0/25 126`, her kontrol host'u için `10.0.2.17 -> 10.0.2.0/24` ya da `172.16.9.1 -> none`, son satır `range 10.20.0.0-10.20.1.255 -> 10.20.0.0/23`. Çalıştır.",
      hint: "`ip_network('10.0.0.1/24')` host bit'i set olduğu için ValueError verir, `strict=False` ile network adresine yuvarlanır. `r.subnet_of(net)` kapsama testi, `ip in net` üyelik testi, collapse_addresses hem kapsananları eler hem komşu blokları birleştirir, summarize_address_range bir aralığı en az sayıda CIDR'a çevirir. Longest prefix match için prefixlen'e göre max, boş durumda `default=None`. num_addresses network ve broadcast dahil, kullanılabilir host için 2 çıkar ya da `hosts()` üzerinde say. Dokümantasyon ipaddress modülü, Network objects ve Operators bölümleri.",
      solution: "nano ~/pyws/p4/prefixes.py\npython3 ~/pyws/p4/prefixes.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p4", {
        "prefixes.py": `"""Routing tablosundaki prefix'leri ipaddress modulu ile analiz et."""
from ipaddress import IPv4Address, IPv4Network, collapse_addresses, ip_address, ip_network, summarize_address_range
from pathlib import Path

CHECK_HOSTS = ["10.0.2.17", "172.16.9.1", "10.10.10.200"]


def load_routes() -> list[IPv4Network]:
    """Her satiri IPv4Network yap, bos satirlari atla."""
    raise NotImplementedError  # TODO ip_network, strict parametresine dikkat


def covered_by(net: IPv4Network, routes: list[IPv4Network]) -> list[IPv4Network]:
    """net icinde kalan daha spesifik prefix'ler, net'in kendisi haric."""
    raise NotImplementedError  # TODO subnet_of


def longest_match(ip: IPv4Address, routes: list[IPv4Network]) -> IPv4Network | None:
    """ip'yi iceren en uzun prefix, yoksa None."""
    raise NotImplementedError  # TODO max ile key=prefixlen, default=None


def main() -> None:
    routes = load_routes()
    # TODO baska prefix kapsayan her route icin "NET covers A B C"
    # TODO "collapsed ..." collapse_addresses sonucu
    # TODO "hosts 10.10.10.0/25 N" kullanilabilir host sayisi
    # TODO her CHECK_HOSTS icin "IP -> NET" ya da "IP -> none"
    # TODO "range 10.20.0.0-10.20.1.255 -> NET" summarize_address_range ile


if __name__ == "__main__":
    main()
`,
        "routes.txt": `10.0.0.0/24
10.0.1.0/24
10.0.2.0/24
10.0.3.0/24
10.0.0.0/22
10.10.10.0/25
10.10.10.128/25
172.16.5.0/24
192.168.100.0/26
192.168.100.64/26
`,
      }); },
      editorContent: {
        "~/pyws/p4/prefixes.py": `"""Routing tablosundaki prefix'leri ipaddress modulu ile analiz et."""
from ipaddress import IPv4Address, IPv4Network, collapse_addresses, ip_address, ip_network, summarize_address_range
from pathlib import Path

CHECK_HOSTS = ["10.0.2.17", "172.16.9.1", "10.10.10.200"]


def load_routes() -> list[IPv4Network]:
    """Her satiri IPv4Network yap, bos satirlari atla."""
    text = Path(__file__).with_name("routes.txt").read_text()
    return [ip_network(line.strip(), strict=False) for line in text.splitlines() if line.strip()]


def covered_by(net: IPv4Network, routes: list[IPv4Network]) -> list[IPv4Network]:
    """net icinde kalan daha spesifik prefix'ler, net'in kendisi haric."""
    return [r for r in routes if r != net and r.subnet_of(net)]


def longest_match(ip: IPv4Address, routes: list[IPv4Network]) -> IPv4Network | None:
    """ip'yi iceren en uzun prefix, yoksa None."""
    return max((r for r in routes if ip in r), key=lambda r: r.prefixlen, default=None)


def main() -> None:
    routes = load_routes()
    for net in routes:
        inner = covered_by(net, routes)
        if inner:
            print(f"{net} covers", *inner)
    print("collapsed", *collapse_addresses(routes))
    net = ip_network("10.10.10.0/25")
    print(f"hosts {net} {net.num_addresses - 2}")
    for host in CHECK_HOSTS:
        match = longest_match(ip_address(host), routes)
        print(f"{host} -> {match or 'none'}")
    first, last = IPv4Address("10.20.0.0"), IPv4Address("10.20.1.255")
    print(f"range {first}-{last} ->", *summarize_address_range(first, last))


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p4', '10.0.0.0/22 covers 10.0.0.0/24 10.0.1.0/24 10.0.2.0/24 10.0.3.0/24', 'collapsed 10.0.0.0/22 10.10.10.0/24 172.16.5.0/24 192.168.100.0/25', 'hosts 10.10.10.0/25 126', '10.10.10.200 -> 10.10.10.128/25', '172.16.9.1 -> none', 'range 10.20.0.0-10.20.1.255 -> 10.20.0.0/23') && mpyFile(sh, '/home/burak/pyws/p4/prefixes.py', 'subnet_of') },
    { id: "p5", title: "dataclass ve Enum", xp: 40,
      story: "dict'lerle taşınan veri bir yerden sonra dağılır, hangi anahtar var hangi tip ne belli olmaz. dataclass alanları ve default'ları tek yerde tanımlar, __post_init__ ise veriyi kapıda doğrular. Interface state gibi sabit kümeler için Enum, yazım hatasını import anında yakalar, up ile Up karışmaz.",
      task: "`~/pyws/p5/models.py` içinde IfState StrEnum üyelerini, Interface dataclass'ının default'lu alanlarını ve __post_init__ doğrulamasını yaz, main'i tamamla. Çıktıda önce geçersiz kayıtlar için `skip Vlan5000 vlan 5000 out of range 1..4094` ve `skip GigabitEthernet4 mtu 20 out of range 68..9216`, sonra geçerli her interface için `GigabitEthernet2 up 10.0.12.1 mtu 9000 tags p2p,bgp` biçiminde satır, ip yoksa `-`, tag yoksa `-`, en sonda `up 3 of 4`. Çalıştır.",
      hint: "Alan sırası önemli, default'suz alanlar default'lulardan önce gelmeli yoksa TypeError. `tags: list[str] = []` yazarsan dataclass ValueError verir, mutable default tüm instance'larda paylaşılır, bunun için `field(default_factory=list)`. __post_init__ içinde `self.state = IfState(self.state)` string'i enum'a çevirir, geçersiz string'de ValueError atar. StrEnum üyesi f-string'de düz değerini basar, Enum olsaydı IfState.UP yazardı. is_up için `is IfState.UP` kimlik karşılaştırması idiomatik. Dokümantasyon dataclasses modülü, Post-init processing ve Mutable Default Values bölümleri, enum modülündeki StrEnum.",
      solution: "nano ~/pyws/p5/models.py\npython3 ~/pyws/p5/models.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p5", {
        "interfaces.json": `[
  {"name": "GigabitEthernet1", "state": "up", "ip": "10.0.0.1", "description": "uplink to ist-core-01"},
  {"name": "GigabitEthernet2", "state": "up", "ip": "10.0.12.1", "mtu": 9000, "tags": ["p2p", "bgp"]},
  {"name": "GigabitEthernet3", "state": "administratively down"},
  {"name": "Vlan10", "state": "up", "ip": "192.168.10.1", "vlan": 10, "description": "users"},
  {"name": "Vlan5000", "state": "up", "vlan": 5000},
  {"name": "GigabitEthernet4", "state": "up", "mtu": 20}
]
`,
        "models.py": `"""Interface modeli, dataclass ve Enum ile dogrulanmis veri."""
import json
from dataclasses import dataclass, field
from enum import StrEnum
from pathlib import Path


class IfState(StrEnum):
    """Interface durumu, show ciktisindaki metinle birebir."""
    # TODO UP, DOWN, ADMIN_DOWN uyeleri, degerleri "up", "down", "administratively down"


@dataclass
class Interface:
    """Tek bir interface. Zorunlu alanlar once, default'lular sonra."""
    name: str
    state: IfState
    # TODO ip default None, mtu default 1500, description default "", vlan default None
    # TODO tags list, default_factory ile, mutable default tuzagina dusme

    def __post_init__(self) -> None:
        # TODO state str geldiyse IfState'e cevir
        # TODO mtu 68..9216 disiysa ValueError "mtu N out of range 68..9216"
        # TODO vlan verilmis ve 1..4094 disiysa ValueError "vlan N out of range 1..4094"
        pass

    @property
    def is_up(self) -> bool:
        return self.state is IfState.UP


def main() -> None:
    raw = json.loads(Path(__file__).with_name("interfaces.json").read_text())
    # TODO her kayit icin Interface(**row), ValueError olursa "skip NAME MESAJ" yaz ve gec
    # TODO gecerli olanlar icin "NAME STATE IP mtu N tags a,b" yaz, ip yoksa "-", tag yoksa "-"
    # TODO sonunda "up N of N"


if __name__ == "__main__":
    main()
`,
      }); },
      editorContent: {
        "~/pyws/p5/models.py": `"""Interface modeli, dataclass ve Enum ile dogrulanmis veri."""
import json
from dataclasses import dataclass, field
from enum import StrEnum
from pathlib import Path


class IfState(StrEnum):
    """Interface durumu, show ciktisindaki metinle birebir."""
    UP = "up"
    DOWN = "down"
    ADMIN_DOWN = "administratively down"


@dataclass
class Interface:
    """Tek bir interface. Zorunlu alanlar once, default'lular sonra."""
    name: str
    state: IfState
    ip: str | None = None
    mtu: int = 1500
    description: str = ""
    vlan: int | None = None
    tags: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.state = IfState(self.state)
        if not 68 <= self.mtu <= 9216:
            raise ValueError(f"mtu {self.mtu} out of range 68..9216")
        if self.vlan is not None and not 1 <= self.vlan <= 4094:
            raise ValueError(f"vlan {self.vlan} out of range 1..4094")

    @property
    def is_up(self) -> bool:
        return self.state is IfState.UP


def load(path: Path) -> list[Interface]:
    """JSON kayitlarini Interface'e cevir, gecersizleri raporla ve atla."""
    good: list[Interface] = []
    for row in json.loads(path.read_text()):
        try:
            good.append(Interface(**row))
        except ValueError as exc:
            print(f"skip {row['name']} {exc}")
    return good


def main() -> None:
    interfaces = load(Path(__file__).with_name("interfaces.json"))
    for iface in interfaces:
        tags = ",".join(iface.tags) or "-"
        print(f"{iface.name} {iface.state} {iface.ip or '-'} mtu {iface.mtu} tags {tags}")
    print(f"up {sum(i.is_up for i in interfaces)} of {len(interfaces)}")


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p5', 'skip Vlan5000 vlan 5000 out of range 1..4094', 'skip GigabitEthernet4 mtu 20 out of range 68..9216', 'GigabitEthernet2 up 10.0.12.1 mtu 9000 tags p2p,bgp', 'GigabitEthernet3 administratively down - mtu 1500 tags -', 'up 3 of 4') && mpyFile(sh, '/home/burak/pyws/p5/models.py', '__post_init__', 'default_factory', 'StrEnum') },
    { id: "p6", title: "TypedDict ve Protocol", xp: 40,
      story: "Type hint'ler Python'u yavaşlatmaz, çalışma zamanında zorlamaz ama editörün ve mypy gibi araçların seni uyarmasını sağlar. TypedDict bir dict'in hangi anahtarları taşıdığını, Protocol ise bir nesnenin hangi metodları sunması gerektiğini anlatır. Protocol sayesinde netmiko, scrapli ya da test'teki fake cihaz aynı fonksiyona girer, miras almadan, duck typing'in belgelenmiş hali.",
      task: "`~/pyws/p6/versions.py` içinde VersionRow TypedDict alanlarını, runtime_checkable DeviceLike Protocol'ünü ve collect fonksiyonunu yaz, main'i tamamla. Çıktı `r1 ios-xe 17.09.04a`, `sw1 nx-os 10.2(5)`, `ion1 ion 6.5.3-b1`, `DeviceLike r1 True`, `DeviceLike dict False`, `fields hostname platform version serial`. Çalıştır.",
      hint: "Protocol gövdesinde metod imzası ve `...` yeter, `def cli(self, command: str) -> str: ...`. isinstance ile Protocol testi için sınıfın üstünde @runtime_checkable şart, o da sadece attribute ve metod varlığına bakar, imzaya bakmaz. TypedDict'te serial her cihazda yok, `NotRequired[str]` ile isteğe bağlı yap, get_type_hints anahtar sırasını tanım sırasıyla verir. Sık hata, Iterable yerine list istemek, generator geçince editör şikayet eder, collections.abc.Iterable daha geniş sözleşmedir. Dokümantasyon typing modülü, Protocols ve TypedDict bölümleri.",
      solution: "nano ~/pyws/p6/versions.py\npython3 ~/pyws/p6/versions.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p6", {
        "devices.json": `[
  {"name": "r1", "platform": "ios-xe", "show_version": "Cisco IOS XE Software, Version 17.09.04a\\nCisco IOS Software [Cupertino], c8000be Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 17.9.4a, RELEASE SOFTWARE (fc3)\\nr1 uptime is 1 week, 2 days, 3 hours"},
  {"name": "sw1", "platform": "nx-os", "show_version": "Cisco Nexus Operating System (NX-OS) Software\\nSoftware\\n  BIOS: version 05.47\\n  NXOS: version 10.2(5)\\nHardware\\n  cisco Nexus9000 C93180YC-FX Chassis"},
  {"name": "ion1", "platform": "ion", "show_version": "Prisma SD-WAN ION 3000\\nSoftware version: 6.5.3-b1\\nSerial: 1234-5678-ABCD"}
]
`,
        "versions.py": `"""Type hint'ler ile sozlesme, TypedDict ve Protocol."""
import json
import re
from collections.abc import Iterable
from pathlib import Path
from typing import NotRequired, Protocol, TypedDict, get_type_hints, runtime_checkable


class VersionRow(TypedDict):
    """Rapor satiri. serial her cihazda yok, NotRequired."""
    # TODO hostname str, platform str, version str, serial NotRequired[str]


# TODO runtime_checkable Protocol DeviceLike, name: str attribute ve cli(self, command: str) -> str metodu


VERSION_RE = re.compile(r"(?:IOS XE Software, Version|NXOS: version|Software version:) (\\S+)")


class FakeDevice:
    """Gercek cihaz yerine canned cikti donen cihaz. DeviceLike'tan miras almaz, yapisal uyum yeter."""

    def __init__(self, name: str, platform: str, output: str) -> None:
        self.name = name
        self.platform = platform
        self._output = output

    def cli(self, command: str) -> str:
        return self._output if command == "show version" else ""


def collect(devices: Iterable["DeviceLike"]) -> list[VersionRow]:
    """Her cihazdan show version al, regex ile surumu cek."""
    raise NotImplementedError  # TODO VERSION_RE.search, grup 1


def main() -> None:
    raw = json.loads(Path(__file__).with_name("devices.json").read_text())
    devices = [FakeDevice(r["name"], r["platform"], r["show_version"]) for r in raw]
    # TODO her satir icin "hostname platform version"
    # TODO "DeviceLike r1 True" ve "DeviceLike dict False" isinstance ile
    # TODO "fields hostname platform version serial" get_type_hints(VersionRow) anahtarlari


if __name__ == "__main__":
    main()
`,
      }); },
      editorContent: {
        "~/pyws/p6/versions.py": `"""Type hint'ler ile sozlesme, TypedDict ve Protocol."""
import json
import re
from collections.abc import Iterable
from pathlib import Path
from typing import NotRequired, Protocol, TypedDict, get_type_hints, runtime_checkable


class VersionRow(TypedDict):
    """Rapor satiri. serial her cihazda yok, NotRequired."""
    hostname: str
    platform: str
    version: str
    serial: NotRequired[str]


@runtime_checkable
class DeviceLike(Protocol):
    """cli metodu olan her sey cihazdir, netmiko, scrapli ya da fake."""
    name: str

    def cli(self, command: str) -> str: ...


VERSION_RE = re.compile(r"(?:IOS XE Software, Version|NXOS: version|Software version:) (\\S+)")


class FakeDevice:
    """Gercek cihaz yerine canned cikti donen cihaz. DeviceLike'tan miras almaz, yapisal uyum yeter."""

    def __init__(self, name: str, platform: str, output: str) -> None:
        self.name = name
        self.platform = platform
        self._output = output

    def cli(self, command: str) -> str:
        return self._output if command == "show version" else ""


def collect(devices: Iterable[DeviceLike]) -> list[VersionRow]:
    """Her cihazdan show version al, regex ile surumu cek."""
    rows: list[VersionRow] = []
    for dev in devices:
        match = VERSION_RE.search(dev.cli("show version"))
        version = match.group(1) if match else "unknown"
        rows.append({"hostname": dev.name, "platform": getattr(dev, "platform", "unknown"), "version": version})
    return rows


def main() -> None:
    raw = json.loads(Path(__file__).with_name("devices.json").read_text())
    devices = [FakeDevice(r["name"], r["platform"], r["show_version"]) for r in raw]
    for row in collect(devices):
        print(f"{row['hostname']} {row['platform']} {row['version']}")
    print("DeviceLike r1", isinstance(devices[0], DeviceLike))
    print("DeviceLike dict", isinstance({"name": "r1"}, DeviceLike))
    print("fields", *get_type_hints(VersionRow))


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p6', 'r1 ios-xe 17.09.04a', 'sw1 nx-os 10.2(5)', 'ion1 ion 6.5.3-b1', 'DeviceLike r1 True', 'DeviceLike dict False', 'fields hostname platform version serial') && mpyFile(sh, '/home/burak/pyws/p6/versions.py', 'Protocol', 'TypedDict', 'runtime_checkable') },
    { id: "p7", title: "Generator ve groupby", xp: 40,
      story: "2400 satır küçük ama syslog collector'dan gelen gerçek dosya milyonlarca satır olur, readlines ile belleğe alırsan container ölür. Generator fonksiyon yield ile satırları tek tek akıtır, itertools.groupby ise ardışık aynı anahtarlı satırları grup olarak verir. İkisi birlikte sabit bellekle sınırsız log işler.",
      task: "`~/pyws/p7/logstream.py` içinde read_lines generator'ını ve severity_of fonksiyonunu yaz, main'de groupby ile host başına `ion1 lines 480 sev<=3 54` biçiminde satır ve sonunda `total 2400 lines, 5 hosts` yazdır. big.log dosyası host sıralı. Çalıştır.",
      hint: "`with path.open() as fh` içinde `for line in fh` zaten lazy'dir, her satırı `yield line.rstrip()` ile ver. groupby sadece ardışık eşit anahtarları gruplar, dosya host sıralı olmadığında aynı host birden fazla grup olarak gelir, o durumda önce sorted gerekir ama o da belleğe alır, bu yüzden collector export'unun sıralı olması tasarım kararıdır. Her grup tek geçişlik iterator'dur, len alamazsın, list'e çevirmeden tek döngüde hem say hem severity topla, bool toplanabilir, `urgent += sev <= 3`. Dokümantasyon itertools modülü groupby, ve Generators bölümü, ayrıca Functional Programming HOWTO.",
      solution: "nano ~/pyws/p7/logstream.py\npython3 ~/pyws/p7/logstream.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p7", {
        "logstream.py": `"""Buyuk syslog dosyasini belleğe almadan generator ile akit, groupby ile cihaz bazinda grupla."""
from collections.abc import Iterator
from itertools import groupby
from pathlib import Path

LOG = Path(__file__).with_name("big.log")


def read_lines(path: Path) -> Iterator[str]:
    """Dosyayi satir satir yield et, readlines kullanma."""
    raise NotImplementedError  # TODO with open, for line in f, yield line.rstrip


def host_of(line: str) -> str:
    """Satirin 4. kelimesi hostname."""
    return line.split()[3]


def severity_of(line: str) -> int:
    """%FAC-SEV-MNEM: parcasindan SEV."""
    raise NotImplementedError  # TODO 5. kelime, "-" ile bol, ortadaki


def main() -> None:
    # TODO groupby(read_lines(LOG), key=host_of) ile her host icin
    # TODO "HOST lines N sev<=3 N" yaz, grup bir iterator, bir kere gez
    # TODO sonunda "total N lines, N hosts"
    pass


if __name__ == "__main__":
    main()
`,
      }); sh.writeFile('/home/burak/pyws/p7/big.log', mpyBigLog(), false, 'nano'); },
      editorContent: {
        "~/pyws/p7/logstream.py": `"""Buyuk syslog dosyasini belleğe almadan generator ile akit, groupby ile cihaz bazinda grupla."""
from collections.abc import Iterator
from itertools import groupby
from pathlib import Path

LOG = Path(__file__).with_name("big.log")


def read_lines(path: Path) -> Iterator[str]:
    """Dosyayi satir satir yield et, readlines kullanma."""
    with path.open() as fh:
        for line in fh:
            yield line.rstrip("\\n")


def host_of(line: str) -> str:
    """Satirin 4. kelimesi hostname."""
    return line.split()[3]


def severity_of(line: str) -> int:
    """%FAC-SEV-MNEM: parcasindan SEV."""
    return int(line.split()[4].split("-")[1])


def main() -> None:
    total = hosts = 0
    for host, group in groupby(read_lines(LOG), key=host_of):
        lines = urgent = 0
        for line in group:
            lines += 1
            urgent += severity_of(line) <= 3
        print(f"{host} lines {lines} sev<=3 {urgent}")
        total += lines
        hosts += 1
    print(f"total {total} lines, {hosts} hosts")


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p7', 'ion1 lines 480 sev<=3 54', 'r1 lines 480 sev<=3 43', 'r2 lines 480 sev<=3 36', 'sw1 lines 480 sev<=3 47', 'sw2 lines 480 sev<=3 58', 'total 2400 lines, 5 hosts') && mpyFile(sh, '/home/burak/pyws/p7/logstream.py', 'yield', 'groupby(') },
    { id: "p8", title: "pathlib ve glob", xp: 35,
      story: "Config backup dizini büyür, alt dizinlere yayılır, araya .bak ve README karışır. os.path ile string birleştirmek yerine pathlib.Path nesneleri, rglob ile desenli arama, relative_to, stem ve stat ile dosya işi temiz ve platformdan bağımsız olur.",
      task: "`~/pyws/p8/catalog.py` dosyasını tamamla. configs altındaki tüm .cfg dosyalarını rglob ile bul, sıralı gez, her biri için `ank/ank-core-01.cfg 190 bytes hostname ank-core-01` biçiminde yaz. out dizinini oluştur, out/index.txt içine satır başına `relative_path hostname`, her config için out/HOST.txt içine `interfaces N` yaz. Son satır `indexed 3 configs in out/`. Çalıştır.",
      hint: "`CONFIGS.rglob('*.cfg')` özyinelemeli arar ve .cfg.bak dosyaları gelmez çünkü desen sonek'e tam eşleşir, `glob('**/*.cfg')` aynı şey. rglob sırası dosya sistemine bağlıdır, sorted şart. `cfg.relative_to(CONFIGS)` configs'e göre yol, `cfg.stem` uzantısız ad, `cfg.stat().st_size` byte boyutu. `OUT.mkdir(parents=True, exist_ok=True)` ikinci çalıştırmada patlamaz. Path üzerinde / operatörü birleştirir, read_text ve write_text open ile uğraştırmaz. Dokümantasyon pathlib modülü, Pattern language ve Reading and writing files bölümleri, glob modülü.",
      solution: "nano ~/pyws/p8/catalog.py\npython3 ~/pyws/p8/catalog.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p8", {
        "catalog.py": `"""configs dizinini pathlib ile tara, index ve ozet yaz."""
from pathlib import Path

ROOT = Path(__file__).parent
CONFIGS = ROOT / "configs"
OUT = ROOT / "out"


def hostname_of(cfg: Path) -> str:
    """Dosyadaki 'hostname X' satirindan X, yoksa 'unknown'."""
    raise NotImplementedError  # TODO read_text, splitlines, startswith


def main() -> None:
    # TODO CONFIGS altindaki tum *.cfg dosyalarini rglob ile bul, .bak'lar gelmemeli, sirala
    # TODO her biri icin "ist/ist-core-01.cfg 123 bytes hostname ist-core-01" relative_to ve stat().st_size
    # TODO OUT dizinini mkdir parents exist_ok ile yarat
    # TODO OUT / "index.txt" icine satir basina "relative_path hostname" yaz
    # TODO her config icin OUT / (stem + ".txt") icine interface satirlarinin sayisini "interfaces N" yaz
    # TODO sonunda "indexed N configs in out/" yaz
    pass


if __name__ == "__main__":
    main()
`,
        "configs/README.md": `Device configs exported nightly. .bak files are previous versions.
`,
        "configs/ank/ank-core-01.cfg": `hostname ank-core-01
!
interface GigabitEthernet1
 description uplink to ist-core-01
 ip address 10.0.1.1 255.255.255.252
!
interface GigabitEthernet2
 ip address 10.0.1.5 255.255.255.252
!
`,
        "configs/backup/ist-core-01.cfg.bak": `hostname ist-core-01-old
!
`,
        "configs/ist/ist-acc-01.cfg": `hostname ist-acc-01
!
interface GigabitEthernet1/0/48
 description uplink to ist-core-01
 switchport mode trunk
!
`,
        "configs/ist/ist-core-01.cfg": `hostname ist-core-01
!
interface GigabitEthernet1
 description uplink to ist-core-02
 ip address 10.0.0.1 255.255.255.252
!
ntp server 10.0.0.250
`,
      }); },
      editorContent: {
        "~/pyws/p8/catalog.py": `"""configs dizinini pathlib ile tara, index ve ozet yaz."""
from pathlib import Path

ROOT = Path(__file__).parent
CONFIGS = ROOT / "configs"
OUT = ROOT / "out"


def hostname_of(cfg: Path) -> str:
    """Dosyadaki 'hostname X' satirindan X, yoksa 'unknown'."""
    for line in cfg.read_text().splitlines():
        if line.startswith("hostname "):
            return line.split(maxsplit=1)[1]
    return "unknown"


def interface_count(cfg: Path) -> int:
    """'interface ' ile baslayan satir sayisi."""
    return sum(1 for line in cfg.read_text().splitlines() if line.startswith("interface "))


def main() -> None:
    configs = sorted(CONFIGS.rglob("*.cfg"))
    OUT.mkdir(parents=True, exist_ok=True)
    index_lines: list[str] = []
    for cfg in configs:
        rel = cfg.relative_to(CONFIGS)
        host = hostname_of(cfg)
        print(f"{rel} {cfg.stat().st_size} bytes hostname {host}")
        index_lines.append(f"{rel} {host}")
        (OUT / f"{cfg.stem}.txt").write_text(f"interfaces {interface_count(cfg)}\\n")
    (OUT / "index.txt").write_text("\\n".join(index_lines) + "\\n")
    print(f"indexed {len(configs)} configs in {OUT.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p8', 'ank/ank-core-01.cfg 190 bytes hostname ank-core-01', 'ist/ist-core-01.cfg 146 bytes hostname ist-core-01', 'indexed 3 configs in out/') && !sh.lastPy.stdout.includes('.bak') && mpyFile(sh, '/home/burak/pyws/p8/out/index.txt', 'ist/ist-acc-01.cfg ist-acc-01') && mpyFile(sh, '/home/burak/pyws/p8/out/ank-core-01.txt', 'interfaces 2') && mpyFile(sh, '/home/burak/pyws/p8/catalog.py', 'rglob') },
    { id: "p9", title: "JSON ve YAML round trip", xp: 35,
      story: "Envanter YAML'da yaşar, API JSON ister, sen ikisinin arasında köprüsün. json standart kütüphanede, yaml için pyyaml. İkisinin de yükleme ve yazma fonksiyonları birbirine benzer ama YAML 1.1'in `yes` kelimesini bool sayması gibi sürprizleri var, round trip yaparak bunları görürsün.",
      task: "`~/pyws/p9/convert.py` dosyasını tamamla. inventory.yaml'ı safe_load ile oku, `devices 2 vlans 2` ve `snmp enabled True bool` yaz. inventory.json'a indent 2 ve sort_keys ile yaz, geri oku, ist-acc-02 cihazını ekle, inventory_out.yaml'a sort_keys False ve default_flow_style False ile yaz, tekrar oku ve `roundtrip devices 3` yaz. Çalıştır.",
      hint: "yaml.load Loader istemeden çalışmaz ve keyfi Python nesnesi kurabilir, dosyadan gelen her şey için yaml.safe_load. json.dump dosyaya, json.dumps string'e, aynı ikili yaml.safe_dump ve safe_dump'ın string dönüşü. YAML'da `enabled: yes` True'ya dönüşür, `022` sekizlik sayı olabilir, string istiyorsan tırnakla. JSON'da yorum ve sondaki virgül yok, tuple list'e döner, dict anahtarı string olur. default_flow_style=False blok biçimde yazar, sort_keys=False tanım sırasını korur. Dokümantasyon json modülü, Basic Usage bölümü, pyyaml için PyYAML Documentation Loading YAML ve Dumping YAML.",
      solution: "nano ~/pyws/p9/convert.py\npython3 ~/pyws/p9/convert.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p9", {
        "convert.py": `"""YAML envanteri JSON'a cevir, geri oku, degistir, tekrar YAML yaz."""
import json
from pathlib import Path

import yaml

HERE = Path(__file__).parent


def main() -> None:
    data = None  # TODO yaml.safe_load ile inventory.yaml oku
    # TODO "devices N vlans N" yaz
    # TODO "snmp enabled True bool" yaz, type(...).__name__ ile, yes kelimesi YAML 1.1'de bool olur
    # TODO inventory.json'a json.dump ile indent=2 ve sort_keys=True yaz
    # TODO json.load ile geri oku, devices listesine
    #      {"hostname": "ist-acc-02", "mgmt": "10.0.0.12", "platform": "ios-xe", "uplinks": ["GigabitEthernet1/0/48"]} ekle
    # TODO inventory_out.yaml'a yaml.safe_dump ile sort_keys=False, default_flow_style=False yaz
    # TODO inventory_out.yaml'i tekrar safe_load ile oku ve "roundtrip devices N" yaz
    pass


if __name__ == "__main__":
    main()
`,
        "inventory.yaml": `site: IST
snmp:
  community: public
  enabled: yes
vlans:
  - id: 10
    name: users
  - id: 20
    name: voice
devices:
  - hostname: ist-core-01
    mgmt: 10.0.0.1
    platform: ios-xe
    uplinks: [GigabitEthernet1, GigabitEthernet2]
  - hostname: ist-acc-01
    mgmt: 10.0.0.11
    platform: ios-xe
    uplinks: [GigabitEthernet1/0/48]
`,
      }); },
      editorContent: {
        "~/pyws/p9/convert.py": `"""YAML envanteri JSON'a cevir, geri oku, degistir, tekrar YAML yaz."""
import json
from pathlib import Path
from typing import Any

import yaml

HERE = Path(__file__).parent

NEW_DEVICE = {"hostname": "ist-acc-02", "mgmt": "10.0.0.12", "platform": "ios-xe", "uplinks": ["GigabitEthernet1/0/48"]}


def load_yaml(path: Path) -> dict[str, Any]:
    """safe_load, yaml.load degil, dosyadan gelen veriye asla guvenme."""
    with path.open() as fh:
        return yaml.safe_load(fh)


def main() -> None:
    data = load_yaml(HERE / "inventory.yaml")
    print(f"devices {len(data['devices'])} vlans {len(data['vlans'])}")
    enabled = data["snmp"]["enabled"]
    print(f"snmp enabled {enabled} {type(enabled).__name__}")

    with (HERE / "inventory.json").open("w") as fh:
        json.dump(data, fh, indent=2, sort_keys=True)
    with (HERE / "inventory.json").open() as fh:
        back = json.load(fh)
    back["devices"].append(NEW_DEVICE)

    with (HERE / "inventory_out.yaml").open("w") as fh:
        yaml.safe_dump(back, fh, sort_keys=False, default_flow_style=False)
    again = load_yaml(HERE / "inventory_out.yaml")
    print(f"roundtrip devices {len(again['devices'])}")


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p9', 'devices 2 vlans 2', 'snmp enabled True bool', 'roundtrip devices 3') && mpyFile(sh, '/home/burak/pyws/p9/inventory.json', '"devices": [', '"hostname": "ist-core-01"') && mpyFile(sh, '/home/burak/pyws/p9/inventory_out.yaml', 'hostname: ist-acc-02', 'mgmt: 10.0.0.12') && mpyFile(sh, '/home/burak/pyws/p9/convert.py', 'safe_load', 'safe_dump') },
    { id: "p10", title: "CSV DictReader ve DictWriter", xp: 35,
      story: "Monitoring sistemi interface sayaçlarını CSV olarak export eder, yönetici bir rapor ister. csv modülünün DictReader'ı her satırı header'a göre dict yapar, DictWriter ise seçtiğin kolonlarla temiz bir dosya yazar. Değerler string gelir, sayı istiyorsan sen çevirirsin.",
      task: "`~/pyws/p10/errors_report.py` dosyasını tamamla. interfaces_raw.csv'yi DictReader ile oku, admin up ama oper down olanlar için `link down`, hata sayacı toplamı sıfırdan büyük olanlar için `errors` problemi üret. errors_report.csv'ye device, interface, problem, errors kolonlarıyla yaz. Ekrana her yazılan satır için `ist-core-02 GigabitEthernet1 errors 155`, sonunda `read 8 rows, wrote 5 problems`. Çalıştır.",
      hint: "CSV dosyalarını `open(path, newline='')` ile aç, aksi halde Windows'ta satır sonları ikileşir, dokümantasyonun ısrarla söylediği şey. DictReader ilk satırı header alır, `int('152')` dönüşümünü sen yaparsın. `DictWriter(fh, fieldnames=FIELDS)` ile writeheader çağırmayı unutma, dict'te fazla anahtar varsa `extrasaction='ignore'` yoksa ValueError. writerows bir liste alır. Dokümantasyon csv modülü, DictReader, DictWriter ve Dialects and Formatting Parameters bölümleri.",
      solution: "nano ~/pyws/p10/errors_report.py\npython3 ~/pyws/p10/errors_report.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p10", {
        "errors_report.py": `"""Monitoring CSV export'undan sorunlu interface raporu uret."""
import csv
from pathlib import Path

HERE = Path(__file__).parent
FIELDS = ["device", "interface", "problem", "errors"]


def problem_of(row: dict[str, str]) -> str | None:
    """'link down' admin up oper down ise, 'errors' hata sayaci sifirdan buyukse, yoksa None."""
    raise NotImplementedError  # TODO sayaclar string gelir, int'e cevir


def main() -> None:
    # TODO interfaces_raw.csv'yi csv.DictReader ile oku, newline="" ile ac
    # TODO sorunlu satirlari FIELDS kolonlariyla errors_report.csv'ye csv.DictWriter ile yaz, writeheader unutma
    #      errors kolonu in_errors + out_errors toplami
    # TODO her yazilan satir icin "device interface problem errors" yaz
    # TODO sonunda "read N rows, wrote N problems"
    pass


if __name__ == "__main__":
    main()
`,
        "interfaces_raw.csv": `device,interface,admin_status,oper_status,in_errors,out_errors,last_change
ist-core-01,GigabitEthernet1,up,up,0,0,2026-09-01T10:00:00
ist-core-01,GigabitEthernet2,up,down,0,0,2026-10-12T03:14:07
ist-core-01,GigabitEthernet3,down,down,0,0,2026-08-15T09:30:00
ist-core-02,GigabitEthernet1,up,up,152,3,2026-09-01T10:00:00
ist-core-02,GigabitEthernet2,up,up,0,0,2026-09-01T10:00:00
ist-acc-01,GigabitEthernet1/0/48,up,up,0,2048,2026-09-20T18:45:11
ist-acc-01,GigabitEthernet1/0/1,up,down,0,0,2026-10-11T22:01:00
ank-core-01,GigabitEthernet1,up,up,7,0,2026-09-01T10:00:00
`,
      }); },
      editorContent: {
        "~/pyws/p10/errors_report.py": `"""Monitoring CSV export'undan sorunlu interface raporu uret."""
import csv
from pathlib import Path

HERE = Path(__file__).parent
FIELDS = ["device", "interface", "problem", "errors"]


def problem_of(row: dict[str, str]) -> str | None:
    """'link down' admin up oper down ise, 'errors' hata sayaci sifirdan buyukse, yoksa None."""
    if row["admin_status"] == "up" and row["oper_status"] == "down":
        return "link down"
    if int(row["in_errors"]) + int(row["out_errors"]) > 0:
        return "errors"
    return None


def main() -> None:
    read = 0
    problems: list[dict[str, str | int]] = []
    with (HERE / "interfaces_raw.csv").open(newline="") as fh:
        for row in csv.DictReader(fh):
            read += 1
            if problem := problem_of(row):
                problems.append({
                    "device": row["device"],
                    "interface": row["interface"],
                    "problem": problem,
                    "errors": int(row["in_errors"]) + int(row["out_errors"]),
                })
    with (HERE / "errors_report.csv").open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(problems)
    for p in problems:
        print(f"{p['device']} {p['interface']} {p['problem']} {p['errors']}")
    print(f"read {read} rows, wrote {len(problems)} problems")


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p10', 'ist-core-01 GigabitEthernet2 link down 0', 'ist-core-02 GigabitEthernet1 errors 155', 'read 8 rows, wrote 5 problems') && mpyFile(sh, '/home/burak/pyws/p10/errors_report.csv', 'device,interface,problem,errors', 'ist-acc-01,GigabitEthernet1/0/48,errors,2048') && mpyFile(sh, '/home/burak/pyws/p10/errors_report.py', 'DictReader', 'DictWriter') },
    { id: "p11", title: "Jinja2 config template", xp: 45,
      story: "Elle yazılan interface config'i kopyala yapıştır hatasıyla doludur. Jinja2 ile yapı template'te, veri YAML'da durur, Ansible'ın altında da aynı motor var. Loop, if ve filter'larla tek template'ten yüzlerce port üretirsin, custom filter ile CIDR'ı maske biçimine çevirirsin.",
      task: "`~/pyws/p11/interfaces.j2` template'ini ve `~/pyws/p11/render.py` içindeki netmask filtresi ile main'i yaz. Her interface için `interface NAME`, `description` yoksa `no description`, access ise switchport mode access ve access vlan, trunk ise mode trunk ve `switchport trunk allowed vlan 10,20,30`, ip varsa `ip address 192.168.10.1 255.255.255.0`, enabled false ise `shutdown` yoksa `no shutdown`, bloklar `!` ile biter. Çıktı generated.cfg'ye yazılsın ve ekrana basılsın. Çalıştır.",
      hint: "Environment'ta trim_blocks=True ve lstrip_blocks=True olmadan her `{% %}` satırı boş satır bırakır, config'e girince gözü yorar. StrictUndefined eksik değişkende sessizce boş basmak yerine hata verir, Vlan10'da mode yok, o yüzden `iface.mode | default('routed')` ile oku, aynı şekilde `iface.enabled | default(true)`. `iface.ip is defined` testi var mı yok mu sorar. Custom filter için env.filters['netmask'] = fonksiyon, template'te `{{ iface.ip | netmask }}`. join filtresi listeyi virgülle birleştirir. Dokümantasyon Jinja2 Template Designer Documentation, List of Builtin Filters ve Whitespace Control, Python tarafı için ipaddress ip_interface.",
      solution: "nano ~/pyws/p11/interfaces.j2\nnano ~/pyws/p11/render.py\npython3 ~/pyws/p11/render.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p11", {
        "interfaces.j2": `hostname {{ hostname }}
!
{# TODO her interface icin asagidaki blok, trim_blocks ve lstrip_blocks acik olmali #}
{# interface NAME #}
{#  description DESC, yoksa "no description" default filtresi #}
{#  access ise switchport mode access + switchport access vlan N #}
{#  trunk ise switchport mode trunk + switchport trunk allowed vlan 10,20,30 join filtresi #}
{#  ip varsa ip address ADDR MASK, netmask custom filtresi ile #}
{#  enabled false ise shutdown, degilse no shutdown, enabled yoksa default(true) #}
{#  mode yoksa routed say, StrictUndefined ile iface.mode dogrudan okunamaz, default filtresi kullan #}
{# ! #}
`,
        "interfaces.yaml": `hostname: ist-acc-02
interfaces:
  - name: GigabitEthernet1/0/1
    description: user port
    mode: access
    vlan: 10
  - name: GigabitEthernet1/0/2
    mode: access
    vlan: 20
    enabled: false
  - name: GigabitEthernet1/0/48
    description: uplink to ist-core-01
    mode: trunk
    allowed: [10, 20, 30]
  - name: Vlan10
    description: users gateway
    ip: 192.168.10.1/24
`,
        "render.py": `"""YAML modelden Jinja2 ile interface config uret."""
from ipaddress import ip_interface
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined

HERE = Path(__file__).parent


def netmask(cidr: str) -> str:
    """'192.168.10.1/24' -> '192.168.10.1 255.255.255.0'."""
    raise NotImplementedError  # TODO ip_interface, .ip ve .network.netmask


def main() -> None:
    # TODO Environment loader=FileSystemLoader(HERE), trim_blocks, lstrip_blocks, undefined=StrictUndefined
    # TODO env.filters["netmask"] = netmask
    # TODO interfaces.yaml'i safe_load ile oku, template'i render et, generated.cfg'ye yaz, ekrana da bas
    pass


if __name__ == "__main__":
    main()
`,
      }); },
      editorContent: {
        "~/pyws/p11/interfaces.j2": `hostname {{ hostname }}
!
{% for iface in interfaces %}
{% set mode = iface.mode | default("routed") %}
interface {{ iface.name }}
 description {{ iface.description | default("no description") }}
{% if mode == "access" %}
 switchport mode access
 switchport access vlan {{ iface.vlan }}
{% elif mode == "trunk" %}
 switchport mode trunk
 switchport trunk allowed vlan {{ iface.allowed | join(",") }}
{% endif %}
{% if iface.ip is defined %}
 ip address {{ iface.ip | netmask }}
{% endif %}
{% if iface.enabled | default(true) %}
 no shutdown
{% else %}
 shutdown
{% endif %}
!
{% endfor %}
`,
        "~/pyws/p11/render.py": `"""YAML modelden Jinja2 ile interface config uret."""
from ipaddress import ip_interface
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined

HERE = Path(__file__).parent


def netmask(cidr: str) -> str:
    """'192.168.10.1/24' -> '192.168.10.1 255.255.255.0'."""
    iface = ip_interface(cidr)
    return f"{iface.ip} {iface.network.netmask}"


def build_env() -> Environment:
    """Config uretiminde bos satir ve eksik degisken affedilmez."""
    env = Environment(loader=FileSystemLoader(HERE), trim_blocks=True, lstrip_blocks=True, undefined=StrictUndefined)
    env.filters["netmask"] = netmask
    return env


def main() -> None:
    model = yaml.safe_load((HERE / "interfaces.yaml").read_text())
    config = build_env().get_template("interfaces.j2").render(model)
    (HERE / "generated.cfg").write_text(config)
    print(config, end="")


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p11', 'hostname ist-acc-02', ' description no description', ' switchport trunk allowed vlan 10,20,30', ' ip address 192.168.10.1 255.255.255.0') && /interface GigabitEthernet1\/0\/2\n description no description\n switchport mode access\n switchport access vlan 20\n shutdown\n!/.test(sh.lastPy.stdout) && mpyFile(sh, '/home/burak/pyws/p11/generated.cfg', 'interface Vlan10', ' no shutdown') && mpyFile(sh, '/home/burak/pyws/p11/interfaces.j2', '{% for ', '| netmask') },
    { id: "p12", title: "argparse CLI", xp: 45,
      story: "Script'in ekip içinde yayılınca komut satırı aracı olur. argparse alt komutları, tip dönüşümünü, help çıktısını ve kullanım hatasında exit code 2'yi bedavaya verir. Senin işin doğrulama hatasında 1, başarıda 0 dönmek, çünkü CI ve shell script'ler exit code'a bakar.",
      task: "`~/pyws/p12/vlantool.py` içinde validate fonksiyonunu, list, add ve check alt komutlarını yaz. `list` her vlan için `10 users` satırı ve `3 vlans`, `add 30 voice` kaydedip `added 30 voice` yazar, var olan ya da geçersiz id'de stderr'e `error: ...` yazıp 1 döner, `check 5000` için `invalid 5000 vlan 5000 out of range 1..4094` ve exit 1, `check 30` için `valid 30`. Sırasıyla list, add 30 voice, check 5000, check 30 ve tekrar list çalıştır.",
      hint: "`add_subparsers(dest='command', required=True)` alt komut zorunlu kılar, her alt parser'a add_argument ile kendi argümanları, type=int dönüşümü ve hatalı girişte argparse'ın kendi 2 kodlu hatası. main'in int dönmesi ve `sys.exit(main())` deseni test edilebilirlik için önemli, argv parametresi None olunca sys.argv kullanılır, test'te liste geçersin. Hata mesajları stderr'e, `print(..., file=sys.stderr)`, stdout sadece veri. Walrus `if error := validate(args.id)` mesaj varsa dala girer. Dokümantasyon argparse modülü, Sub-commands ve argparse Tutorial, ayrıca sys.exit.",
      solution: "nano ~/pyws/p12/vlantool.py\npython3 ~/pyws/p12/vlantool.py list\npython3 ~/pyws/p12/vlantool.py add 30 voice\npython3 ~/pyws/p12/vlantool.py check 5000\npython3 ~/pyws/p12/vlantool.py check 30\npython3 ~/pyws/p12/vlantool.py list",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p12", {
        "vlans.json": `{"10": "users", "20": "voice", "99": "mgmt"}
`,
        "vlantool.py": `"""vlantool, list / add / check alt komutlari olan kucuk CLI.

exit code 0 basari, 1 dogrulama hatasi, 2 kullanim hatasi, argparse kendisi verir.
"""
import argparse
import json
import sys
from pathlib import Path

DB = Path(__file__).with_name("vlans.json")
RESERVED = range(1002, 1006)


def load() -> dict[int, str]:
    return {int(k): v for k, v in json.loads(DB.read_text()).items()}


def save(vlans: dict[int, str]) -> None:
    DB.write_text(json.dumps({str(k): v for k, v in sorted(vlans.items())}, indent=2) + "\\n")


def validate(vlan_id: int) -> str | None:
    """Hata mesaji ya da None. 1..4094 arasi ve 1002..1005 disi."""
    raise NotImplementedError  # TODO


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="vlantool", description="VLAN veritabani araci")
    sub = parser.add_subparsers(dest="command", required=True)
    # TODO list alt komutu
    # TODO add alt komutu, pozitif argumanlar id (int) ve name
    # TODO check alt komutu, id (int)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    vlans = load()
    # TODO list: her vlan icin "ID NAME" sirali, sonra "N vlans"
    # TODO add: validate hatali ise "error: MESAJ" stderr ve 1 don, zaten varsa "error: vlan ID exists" ve 1,
    #           degilse kaydet, "added ID NAME" yaz ve 0 don
    # TODO check: hatali ise "invalid ID MESAJ" ve 1, degilse "valid ID" ve 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
      }); },
      editorContent: {
        "~/pyws/p12/vlantool.py": `"""vlantool, list / add / check alt komutlari olan kucuk CLI.

exit code 0 basari, 1 dogrulama hatasi, 2 kullanim hatasi, argparse kendisi verir.
"""
import argparse
import json
import sys
from pathlib import Path

DB = Path(__file__).with_name("vlans.json")
RESERVED = range(1002, 1006)


def load() -> dict[int, str]:
    return {int(k): v for k, v in json.loads(DB.read_text()).items()}


def save(vlans: dict[int, str]) -> None:
    DB.write_text(json.dumps({str(k): v for k, v in sorted(vlans.items())}, indent=2) + "\\n")


def validate(vlan_id: int) -> str | None:
    """Hata mesaji ya da None. 1..4094 arasi ve 1002..1005 disi."""
    if not 1 <= vlan_id <= 4094:
        return f"vlan {vlan_id} out of range 1..4094"
    if vlan_id in RESERVED:
        return f"vlan {vlan_id} is reserved"
    return None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="vlantool", description="VLAN veritabani araci")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list", help="vlanlari listele")
    add = sub.add_parser("add", help="vlan ekle")
    add.add_argument("id", type=int)
    add.add_argument("name")
    check = sub.add_parser("check", help="vlan id dogrula")
    check.add_argument("id", type=int)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    vlans = load()
    if args.command == "list":
        for vlan_id, name in sorted(vlans.items()):
            print(f"{vlan_id} {name}")
        print(f"{len(vlans)} vlans")
        return 0
    if args.command == "check":
        if error := validate(args.id):
            print(f"invalid {args.id} {error}")
            return 1
        print(f"valid {args.id}")
        return 0
    if error := validate(args.id):
        print(f"error: {error}", file=sys.stderr)
        return 1
    if args.id in vlans:
        print(f"error: vlan {args.id} exists", file=sys.stderr)
        return 1
    vlans[args.id] = args.name
    save(vlans)
    print(f"added {args.id} {args.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p12', '30 voice', '4 vlans') && mpyFile(sh, '/home/burak/pyws/p12/vlans.json', '"30": "voice"') && mpyFile(sh, '/home/burak/pyws/p12/vlantool.py', 'add_subparsers', 'sys.exit(main())') && sh.history.some(h => /vlantool\.py\s+check\s+5000/.test(h)) },
    { id: "p13", title: "logging ile denetim", xp: 40,
      story: "print ile debug yapan mühendis, production'da ya çok konuşur ya hiç. logging modülü seviyeleri, biçimi ve hedefi ayırır. Konsolda INFO ve üstü, dosyada DEBUG dahil her şey, aynı kod, iki handler. Bir TAC case'inde müşteriden istediğin tam da böyle bir log dosyasıdır.",
      task: "`~/pyws/p13/audit.py` içinde setup_logging ve check fonksiyonlarını yaz. netaudit logger'ına stdout'a yazan INFO seviyeli bir StreamHandler ve audit.log'a yazan DEBUG seviyeli bir FileHandler tak. Konsol biçimi `%(levelname)s %(message)s`, dosya biçimi FMT. Çıktıda `INFO r1 ok`, `WARNING badhost has invalid ip 10.0.0.300`, `INFO audit done, 3 of 4 ok` olsun, DEBUG satırları sadece dosyada görünsün. Çalıştır.",
      hint: "Logger seviyesi kapı, handler seviyesi ikinci kapı, logger DEBUG'da değilse handler'a hiç gelmez, bu yüzden `log.setLevel(logging.DEBUG)` ve handler'larda ayrı seviyeler. StreamHandler varsayılan stderr'e yazar, konsol için sys.stdout ver. Mesajı `log.debug('checking %s %s', name, ip)` ile lazy biçimle, f-string seviye kapalıyken bile string'i kurar. basicConfig root'u ayarlar ve sadece ilk çağrıda etki eder, kütüphane kodunda root'a dokunma, kendi logger'ını `logging.getLogger(__name__)` ile al. Aynı handler iki kere eklenirse satırlar ikileşir. Dokümantasyon logging modülü, Logging HOWTO ve Logging Cookbook, özellikle Logging to multiple destinations.",
      solution: "nano ~/pyws/p13/audit.py\npython3 ~/pyws/p13/audit.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p13", {
        "audit.py": `"""Logging ile denetim, konsolda INFO ve ustu, dosyada her sey."""
import logging
import sys
from ipaddress import ip_address
from pathlib import Path

HERE = Path(__file__).parent
LOG_FILE = HERE / "audit.log"
FMT = "%(asctime)s %(levelname)-8s %(name)s %(message)s"

log = logging.getLogger("netaudit")


def setup_logging() -> None:
    """Root'a dokunma, netaudit logger'ina iki handler tak."""
    # TODO log.setLevel(logging.DEBUG)
    # TODO StreamHandler(sys.stdout) seviye INFO, format "%(levelname)s %(message)s"
    # TODO FileHandler(LOG_FILE, mode="w") seviye DEBUG, format FMT
    pass


def check(name: str, ip: str) -> bool:
    """IP gecerliyse True. debug ile her adimi, warning ile hatayi logla."""
    # TODO log.debug("checking %s %s", name, ip) lazy format, f-string degil
    # TODO gecersizse log.warning("%s has invalid ip %s", name, ip) ve False
    # TODO gecerliyse log.info("%s ok", name) ve True
    raise NotImplementedError


def main() -> None:
    setup_logging()
    rows = [line.split() for line in (HERE / "devices.txt").read_text().splitlines() if line.strip()]
    good = sum(check(name, ip) for name, ip in rows)
    # TODO log.info("audit done, %d of %d ok", good, len(rows))


if __name__ == "__main__":
    main()
`,
        "devices.txt": `r1 10.0.0.1
r2 10.0.0.2
sw1 10.0.0.11
badhost 10.0.0.300
`,
      }); },
      editorContent: {
        "~/pyws/p13/audit.py": `"""Logging ile denetim, konsolda INFO ve ustu, dosyada her sey."""
import logging
import sys
from ipaddress import ip_address
from pathlib import Path

HERE = Path(__file__).parent
LOG_FILE = HERE / "audit.log"
FMT = "%(asctime)s %(levelname)-8s %(name)s %(message)s"

log = logging.getLogger("netaudit")


def setup_logging() -> None:
    """Root'a dokunma, netaudit logger'ina iki handler tak."""
    log.setLevel(logging.DEBUG)
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
    logfile = logging.FileHandler(LOG_FILE, mode="w")
    logfile.setLevel(logging.DEBUG)
    logfile.setFormatter(logging.Formatter(FMT))
    log.addHandler(console)
    log.addHandler(logfile)


def check(name: str, ip: str) -> bool:
    """IP gecerliyse True. debug ile her adimi, warning ile hatayi logla."""
    log.debug("checking %s %s", name, ip)
    try:
        ip_address(ip)
    except ValueError:
        log.warning("%s has invalid ip %s", name, ip)
        return False
    log.info("%s ok", name)
    return True


def main() -> None:
    setup_logging()
    rows = [line.split() for line in (HERE / "devices.txt").read_text().splitlines() if line.strip()]
    good = sum(check(name, ip) for name, ip in rows)
    log.info("audit done, %d of %d ok", good, len(rows))


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p13', 'INFO r1 ok', 'WARNING badhost has invalid ip 10.0.0.300', 'INFO audit done, 3 of 4 ok') && !sh.lastPy.stdout.includes('DEBUG') && mpyFile(sh, '/home/burak/pyws/p13/audit.log', 'DEBUG    netaudit checking r1 10.0.0.1', 'WARNING  netaudit badhost has invalid ip 10.0.0.300') && mpyFile(sh, '/home/burak/pyws/p13/audit.py', 'FileHandler', 'StreamHandler') },
    { id: "p14", title: "Özel exception ve raise from", xp: 40,
      story: "ValueError her yerden gelir, hangisi senin parser'ın, hangisi ipaddress'in belli olmaz. Kendi exception hiyerarşin, cağırana tek except ile yakalama imkanı verir, raise from ise asıl nedeni zincirde saklar. Traceback'te `The above exception was the direct cause` satırı tam bu zincirdir, TAC'ta root cause demektir.",
      task: "`~/pyws/p14/errors.py` içinde ParseError'ı line_no taşıyacak şekilde yaz, parse_interfaces generator'ını geçersiz ip'de `raise ParseError(...) from exc` ile tamamla, main'de ConfigError yakala, add_note ekle. Çıktı `ok GigabitEthernet1 10.0.0.1/24`, `ParseError line 7: bad ip address 10.0.0.300`, `  caused by ValueError ...` ve `  note file r1.cfg`. Çalıştır.",
      hint: "Alt sınıf __init__ içinde `super().__init__(message)` çağır, yoksa args boş kalır ve str boş çıkar. `raise ParseError(...) from exc` __cause__'u set eder, `from None` ise zinciri gizler, bazen istenir. except bloğunda exc değişkeni blok bitince silinir, dışarıda kullanacaksan başka isme ata. Python 3.11 ile `exc.add_note(...)` bağlam ekler, __notes__ listesinde durur. Generator içinde raise, tüketen for döngüsünün o anki adımında patlar, önceki ok satırları basılmış olur. ip_interface geçersiz adreste ValueError verir, mesajı aynen zincire gider. Dokümantasyon Errors and Exceptions bölümündeki Exception Chaining ve User-defined Exceptions, ayrıca Built-in Exceptions altında BaseException.add_note.",
      solution: "nano ~/pyws/p14/errors.py\npython3 ~/pyws/p14/errors.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p14", {
        "errors.py": `"""Ozel exception hiyerarsisi ve raise from ile neden zinciri."""
from collections.abc import Iterator
from ipaddress import ip_interface
from pathlib import Path

HERE = Path(__file__).parent


class ConfigError(Exception):
    """Tum config hatalarinin atasi, cagiran tek except ile yakalayabilir."""


class ParseError(ConfigError):
    """Satir numarasi tasiyan parse hatasi."""

    def __init__(self, message: str, line_no: int) -> None:
        # TODO super().__init__ ile mesaji ver, self.line_no sakla
        pass

    def __str__(self) -> str:
        # TODO "line N: mesaj" bicimi
        return ""


def parse_interfaces(text: str) -> Iterator[tuple[str, str]]:
    """(interface, cidr) ciftlerini yield et. Gecersiz ip'de ParseError, altinda ValueError zincirli."""
    # TODO enumerate(text.splitlines(), start=1) ile gez
    # TODO "interface X" gorunce current = X
    # TODO her gecerli ip icin (current, cidr.with_prefixlen) yield et
    # TODO " ip address A M" gorunce ip_interface(f"{A}/{M}") dene, ValueError gelirse
    #      raise ParseError(f"bad ip address {A}", line_no) from exc
    raise NotImplementedError


def main() -> None:
    # TODO parse_interfaces'i cagir, basarili olursa her satir "ok IFACE CIDR"
    # TODO ConfigError yakala, exc.add_note("file r1.cfg") ekle, sonra su uc satiri yaz
    #      "ParseError line 7: bad ip address 10.0.0.300"  -> f"{type(exc).__name__} {exc}"
    #      "  caused by ValueError ..."                   -> exc.__cause__
    #      "  note file r1.cfg"                            -> exc.__notes__
    pass


if __name__ == "__main__":
    main()
`,
        "r1.cfg": `hostname r1
!
interface GigabitEthernet1
 ip address 10.0.0.1 255.255.255.0
!
interface GigabitEthernet2
 ip address 10.0.0.300 255.255.255.0
!
interface GigabitEthernet3
 ip address 10.0.2.1 255.255.255.0
!
`,
      }); },
      editorContent: {
        "~/pyws/p14/errors.py": `"""Ozel exception hiyerarsisi ve raise from ile neden zinciri."""
from collections.abc import Iterator
from ipaddress import ip_interface
from pathlib import Path

HERE = Path(__file__).parent


class ConfigError(Exception):
    """Tum config hatalarinin atasi, cagiran tek except ile yakalayabilir."""


class ParseError(ConfigError):
    """Satir numarasi tasiyan parse hatasi."""

    def __init__(self, message: str, line_no: int) -> None:
        super().__init__(message)
        self.line_no = line_no

    def __str__(self) -> str:
        return f"line {self.line_no}: {self.args[0]}"


def parse_interfaces(text: str) -> Iterator[tuple[str, str]]:
    """(interface, cidr) ciftlerini yield et. Gecersiz ip'de ParseError, altinda ValueError zincirli."""
    current = ""
    for line_no, line in enumerate(text.splitlines(), start=1):
        if line.startswith("interface "):
            current = line.split()[1]
        elif line.strip().startswith("ip address "):
            _, _, addr, mask = line.split()
            try:
                cidr = ip_interface(f"{addr}/{mask}")
            except ValueError as exc:
                raise ParseError(f"bad ip address {addr}", line_no) from exc
            yield current, cidr.with_prefixlen


def main() -> None:
    try:
        for name, cidr in parse_interfaces((HERE / "r1.cfg").read_text()):
            print(f"ok {name} {cidr}")
    except ConfigError as exc:
        exc.add_note("file r1.cfg")
        print(f"{type(exc).__name__} {exc}")
        print(f"  caused by {type(exc.__cause__).__name__} {exc.__cause__}")
        print(f"  note {exc.__notes__[0]}")


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p14', 'ok GigabitEthernet1 10.0.0.1/24', 'ParseError line 7: bad ip address 10.0.0.300', "  caused by ValueError '10.0.0.300/255.255.255.0' does not appear", '  note file r1.cfg') && mpyFile(sh, '/home/burak/pyws/p14/errors.py', 'from exc', 'class ParseError(ConfigError)', 'add_note') },
    { id: "p15", title: "contextmanager ve decorator", xp: 45,
      story: "Cihaz oturumu açıldıysa kapanmalı, hata olsa bile. Komut timeout yediyse tekrar denenmeli, kaç sürdüğü ölçülmeli. Bu üç kaygı iş mantığına bulaşmasın diye contextlib.contextmanager ve decorator'lar var. functools.wraps olmadan sarılan fonksiyonun adı ve docstring'i kaybolur, debugger'da her şey wrapper görünür.",
      task: "`~/pyws/p15/session.py` içinde session contextmanager'ını, retry ve timed decorator'larını yaz, collect'i `@timed` ve `@retry(3)` ile sar, ExitStack ile r2 ve sw1 oturumlarını tek with içinde aç. Çıktı `connect r1`, `retry 1 r1 timeout on attempt 1`, `retry 2 r1 timeout on attempt 2`, `collect took N ms`, `r1 uptime is 3 days`, `disconnect r1`, `name collect doc Komutu gonder ve ciktiyi dondur.`, `connect r2`, `connect sw1`, `open r2 sw1`, `disconnect sw1`, `disconnect r2`. Çalıştır.",
      hint: "contextmanager ile yazılan generator'da yield'den önceki kısım __enter__, sonraki __exit__, hata olsa da çalışsın diye yield'i try finally içine al. Decorator üç katmanlı, `retry(times)` decorator döner, decorator wrapper döner, wrapper asıl fonksiyonu çağırır, her katmanda `@functools.wraps(func)`. Son denemede çıplak raise orijinal traceback'i korur. timed içinde perf_counter duvar saati değil, monoton ve hassas. ExitStack enter_context ile dinamik sayıda context'i yığına koyar, çıkışta ters sırada kapatır, bu yüzden sw1 önce kapanır. ParamSpec ile wrapper'ın imzası tip denetçisinde korunur. Dokümantasyon contextlib modülü, contextmanager ve ExitStack, functools modülü wraps, ve PEP 612 ParamSpec.",
      solution: "nano ~/pyws/p15/session.py\npython3 ~/pyws/p15/session.py",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p15", {
        "session.py": `"""Sahte cihaz oturumu, contextmanager ve decorator'lar."""
import functools
import time
from collections.abc import Callable, Iterator
from contextlib import ExitStack, contextmanager
from itertools import count
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")

_attempts = count(1)


class Device:
    """Ilk iki send cagrisinda ConnectionError atar, ucuncude cevap verir."""

    def __init__(self, host: str) -> None:
        self.host = host

    def send(self, command: str) -> str:
        n = next(_attempts)
        if n < 3:
            raise ConnectionError(f"{self.host} timeout on attempt {n}")
        return f"{self.host} uptime is 3 days"


@contextmanager
def session(host: str) -> Iterator[Device]:
    """'connect HOST' yaz, Device ver, hata olsa da 'disconnect HOST' yaz."""
    # TODO print, try, yield, finally print
    raise NotImplementedError


def retry(times: int, exc: type[Exception] = ConnectionError) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """times kere dene, her hatada 'retry N MESAJ' yaz, son denemede hatayi birak."""
    # TODO ic ice fonksiyon, functools.wraps ile isim ve docstring korunur
    raise NotImplementedError


def timed(func: Callable[P, R]) -> Callable[P, R]:
    """'FUNC took N.N ms' yaz, time.perf_counter kullan."""
    raise NotImplementedError


# TODO collect fonksiyonunu @timed ve @retry(3) ile sar
def collect(dev: Device, command: str) -> str:
    """Komutu gonder ve ciktiyi dondur."""
    return dev.send(command)


def main() -> None:
    with session("r1") as dev:
        print(collect(dev, "show version"))
    print("name", collect.__name__, "doc", collect.__doc__)
    # TODO ExitStack ile r2 ve sw1 icin oturum ac, her birinde dev.host yazdir, ikisi de tek with icinde kapansin


if __name__ == "__main__":
    main()
`,
      }); },
      editorContent: {
        "~/pyws/p15/session.py": `"""Sahte cihaz oturumu, contextmanager ve decorator'lar."""
import functools
import time
from collections.abc import Callable, Iterator
from contextlib import ExitStack, contextmanager
from itertools import count
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")

_attempts = count(1)


class Device:
    """Ilk iki send cagrisinda ConnectionError atar, ucuncude cevap verir."""

    def __init__(self, host: str) -> None:
        self.host = host

    def send(self, command: str) -> str:
        n = next(_attempts)
        if n < 3:
            raise ConnectionError(f"{self.host} timeout on attempt {n}")
        return f"{self.host} uptime is 3 days"


@contextmanager
def session(host: str) -> Iterator[Device]:
    """'connect HOST' yaz, Device ver, hata olsa da 'disconnect HOST' yaz."""
    print(f"connect {host}")
    try:
        yield Device(host)
    finally:
        print(f"disconnect {host}")


def retry(times: int, exc: type[Exception] = ConnectionError) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """times kere dene, her hatada 'retry N MESAJ' yaz, son denemede hatayi birak."""

    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except exc as err:
                    if attempt == times:
                        raise
                    print(f"retry {attempt} {err}")
            raise AssertionError("unreachable")

        return wrapper

    return decorator


def timed(func: Callable[P, R]) -> Callable[P, R]:
    """'FUNC took N.N ms' yaz, time.perf_counter kullan."""

    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            print(f"{func.__name__} took {(time.perf_counter() - start) * 1000:.1f} ms")

    return wrapper


@timed
@retry(3)
def collect(dev: Device, command: str) -> str:
    """Komutu gonder ve ciktiyi dondur."""
    return dev.send(command)


def main() -> None:
    with session("r1") as dev:
        print(collect(dev, "show version"))
    print("name", collect.__name__, "doc", collect.__doc__)
    with ExitStack() as stack:
        devices = [stack.enter_context(session(host)) for host in ("r2", "sw1")]
        print("open", *(d.host for d in devices))


if __name__ == "__main__":
    main()
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p15', 'connect r1\nretry 1 r1 timeout on attempt 1\nretry 2 r1 timeout on attempt 2\n', /collect took \d+\.\d ms\nr1 uptime is 3 days\ndisconnect r1\n/, 'name collect doc Komutu gonder ve ciktiyi dondur.', 'connect r2\nconnect sw1\nopen r2 sw1\ndisconnect sw1\ndisconnect r2') && mpyFile(sh, '/home/burak/pyws/p15/session.py', '@contextmanager', 'functools.wraps', 'ExitStack') },
    { id: "p16", title: "netaudit paketi", xp: 100,
      story: "Final. Her şeyi bir pakette topluyorsun. netaudit, bir dizindeki IOS config'leri parse eder, kurallara göre bulgu üretir, host bazında raporlar. __init__ dışa açılan API'yi, parse modeli, rules kuralları, report biçimi, __main__ ise `python3 -m netaudit` ile çalışmayı sağlar. Bu yapı pip ile kurulabilen gerçek bir araca bir pyproject uzaklıkta.",
      task: "`~/pyws/p16/netaudit/` altındaki parse.py, rules.py, report.py ve __main__.py dosyalarındaki TODO'ları doldur. `cd ~/pyws/p16 && python3 -m netaudit configs` çıktısı host başına `ist-core-01 3 findings` başlığı, altında severity azalan sırada `  HIGH   telnet_enabled telnet enabled on vty` gibi satırlar, sonda boş satır ve `total 6 findings, 3 high` olsun. ist-acc-01 temiz olduğu için görünmesin. `--strict` bulgu varsa 1 dönsün, `--version` `netaudit 0.1.0` yazsın.",
      hint: "parse_config'te girintisiz satır yeni blok başlatır, girintili satır bir önceki bloğa aittir, `raw.startswith(' ')` ile ayır, `!` satırlarını atla. Kurallar saf fonksiyon, DeviceConfig alır Finding listesi döner, run_rules iç içe comprehension ile birleştirir. report'ta groupby için önce host'a göre sorted şart, aynı key'de severity'yi negatifleyerek azalan sırala, IntEnum olduğu için eksi alınabilir, `f'{f.severity.name:<6}'` sola yaslar. __main__ içinde `from netaudit import ...` mutlak import, paket cwd'de olduğu için -m çalışır, dosyayı doğrudan python3 netaudit/__main__.py ile çalıştırırsan sys.path farklı olur ve import patlar. Log stderr'e, rapor stdout'a, böylece `> report.txt` temiz kalır. Dokümantasyon Modules bölümünde Packages, runpy ve __main__ belgesi, argparse action='version'.",
      solution: "nano ~/pyws/p16/netaudit/__init__.py\nnano ~/pyws/p16/netaudit/__main__.py\nnano ~/pyws/p16/netaudit/parse.py\nnano ~/pyws/p16/netaudit/report.py\nnano ~/pyws/p16/netaudit/rules.py\ncd ~/pyws/p16 && python3 -m netaudit configs",
      setup: sh => { mpyFiles(sh, "/home/burak/pyws/p16", {
        "configs/ank-core-01.cfg": `hostname ank-core-01
!
snmp-server community private RW
!
interface GigabitEthernet1
 ip address 10.0.1.1 255.255.255.252
!
interface Loopback0
 description router id
 ip address 2.2.2.2 255.255.255.255
!
line vty 0 4
 transport input ssh
!
`,
        "configs/ist-acc-01.cfg": `hostname ist-acc-01
!
ntp server 10.0.0.250
ntp server 10.0.0.251
!
snmp-server community s3cr3t-ro RO
!
interface Vlan10
 description users gateway
 ip address 192.168.10.1 255.255.255.0
!
line vty 0 4
 transport input ssh
!
`,
        "configs/ist-core-01.cfg": `hostname ist-core-01
!
ntp server 10.0.0.250
!
snmp-server community public RO
!
interface GigabitEthernet1
 description uplink to ist-core-02
 ip address 10.0.0.1 255.255.255.252
!
interface GigabitEthernet2
 ip address 10.0.0.5 255.255.255.252
!
interface GigabitEthernet3
 shutdown
!
line vty 0 4
 transport input telnet ssh
!
`,
        "netaudit/__init__.py": `"""netaudit, IOS config dosyalarini kurallara gore denetler."""
from netaudit.rules import Finding, Severity, run_rules

__version__ = "0.1.0"
__all__ = ["Finding", "Severity", "run_rules", "__version__"]
`,
        "netaudit/__main__.py": `"""python3 -m netaudit CONFIG_DIR [--strict]"""
import argparse
import logging
import sys
from pathlib import Path

from netaudit import __version__, run_rules
from netaudit.parse import parse_file
from netaudit.report import render

log = logging.getLogger("netaudit")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="netaudit", description="IOS config denetimi")
    # TODO configs pozitif argumani, Path tipinde
    # TODO --strict bayragi, bulgu varsa exit 1
    # TODO --version
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stderr)
    # TODO configs altindaki *.cfg dosyalarini sirali gez, parse et, log.info("parsed %s", path.name)
    # TODO tum bulgulari topla, render sonucunu print et
    # TODO strict ve bulgu varsa 1, yoksa 0 don
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
        "netaudit/parse.py": `"""IOS config metnini DeviceConfig modeline cevir."""
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Interface:
    name: str
    description: str = ""
    ip: str | None = None
    shutdown: bool = False


@dataclass
class DeviceConfig:
    hostname: str = "unknown"
    interfaces: list[Interface] = field(default_factory=list)
    ntp: list[str] = field(default_factory=list)
    snmp_communities: list[str] = field(default_factory=list)
    vty_transport: list[str] = field(default_factory=list)


def parse_config(text: str) -> DeviceConfig:
    """Satir satir gez. Girintili satirlar bir ustteki 'interface' ya da 'line vty' blokuna aittir."""
    # TODO hostname X, ntp server X, snmp-server community X ..., interface X, line vty
    # TODO blok icinde description, ip address A M, shutdown, transport input a b
    raise NotImplementedError


def parse_file(path: Path) -> DeviceConfig:
    return parse_config(path.read_text())
`,
        "netaudit/report.py": `"""Bulgulari host bazinda gruplayip metin rapor uret."""
from itertools import groupby

from netaudit.rules import Finding


def render(findings: list[Finding]) -> str:
    """
    Her host icin bir baslik ve altinda severity azalan, rule artan sirada bulgular.

    ist-core-01 3 findings
      HIGH   telnet_enabled telnet enabled on vty
      LOW    missing_description GigabitEthernet2 has no description
    Sonunda bos satir ve "total N findings, N high". Bulgu yoksa "no findings".
    """
    raise NotImplementedError  # TODO sorted + groupby, severity.name ljust 6
`,
        "netaudit/rules.py": `"""Denetim kurallari. Her kural DeviceConfig alir, Finding listesi doner."""
from collections.abc import Callable
from dataclasses import dataclass
from enum import IntEnum

from netaudit.parse import DeviceConfig


class Severity(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3


@dataclass(frozen=True)
class Finding:
    host: str
    rule: str
    severity: Severity
    message: str


Rule = Callable[[DeviceConfig], list[Finding]]


def no_ntp(cfg: DeviceConfig) -> list[Finding]:
    """ntp server yoksa MEDIUM, mesaj 'no ntp server configured'."""
    raise NotImplementedError  # TODO


def missing_description(cfg: DeviceConfig) -> list[Finding]:
    """ip'si olan, shutdown olmayan ve description'i bos her interface icin LOW, mesaj 'IFACE has no description'."""
    raise NotImplementedError  # TODO


def telnet_enabled(cfg: DeviceConfig) -> list[Finding]:
    """vty transport'ta telnet varsa HIGH, mesaj 'telnet enabled on vty'."""
    raise NotImplementedError  # TODO


def default_snmp_community(cfg: DeviceConfig) -> list[Finding]:
    """public ya da private community icin HIGH, mesaj 'default snmp community NAME'."""
    raise NotImplementedError  # TODO


RULES: list[Rule] = [no_ntp, missing_description, telnet_enabled, default_snmp_community]


def run_rules(cfg: DeviceConfig, rules: list[Rule] = RULES) -> list[Finding]:
    """Tum kurallari calistir, bulgulari birlestir."""
    raise NotImplementedError  # TODO
`,
      }); },
      editorContent: {
        "~/pyws/p16/netaudit/__init__.py": `"""netaudit, IOS config dosyalarini kurallara gore denetler."""
from netaudit.rules import Finding, Severity, run_rules

__version__ = "0.1.0"
__all__ = ["Finding", "Severity", "run_rules", "__version__"]
`,
        "~/pyws/p16/netaudit/__main__.py": `"""python3 -m netaudit CONFIG_DIR [--strict]"""
import argparse
import logging
import sys
from pathlib import Path

from netaudit import __version__, run_rules
from netaudit.parse import parse_file
from netaudit.report import render

log = logging.getLogger("netaudit")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="netaudit", description="IOS config denetimi")
    parser.add_argument("configs", type=Path, help="config dosyalarinin dizini")
    parser.add_argument("--strict", action="store_true", help="bulgu varsa exit 1")
    parser.add_argument("--version", action="version", version=f"netaudit {__version__}")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stderr)

    findings = []
    for path in sorted(args.configs.glob("*.cfg")):
        cfg = parse_file(path)
        log.info("parsed %s as %s", path.name, cfg.hostname)
        findings.extend(run_rules(cfg))
    print(render(findings), end="")
    return 1 if args.strict and findings else 0


if __name__ == "__main__":
    sys.exit(main())
`,
        "~/pyws/p16/netaudit/parse.py": `"""IOS config metnini DeviceConfig modeline cevir."""
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Interface:
    name: str
    description: str = ""
    ip: str | None = None
    shutdown: bool = False


@dataclass
class DeviceConfig:
    hostname: str = "unknown"
    interfaces: list[Interface] = field(default_factory=list)
    ntp: list[str] = field(default_factory=list)
    snmp_communities: list[str] = field(default_factory=list)
    vty_transport: list[str] = field(default_factory=list)


def parse_config(text: str) -> DeviceConfig:
    """Satir satir gez. Girintili satirlar bir ustteki 'interface' ya da 'line vty' blokuna aittir."""
    cfg = DeviceConfig()
    block: Interface | str | None = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line == "!":
            continue
        words = line.split()
        if not raw.startswith(" "):
            block = None
            if words[0] == "hostname":
                cfg.hostname = words[1]
            elif words[:2] == ["ntp", "server"]:
                cfg.ntp.append(words[2])
            elif words[:2] == ["snmp-server", "community"]:
                cfg.snmp_communities.append(words[2])
            elif words[0] == "interface":
                block = Interface(words[1])
                cfg.interfaces.append(block)
            elif words[:2] == ["line", "vty"]:
                block = "vty"
            continue
        if isinstance(block, Interface):
            if words[0] == "description":
                block.description = " ".join(words[1:])
            elif words[:2] == ["ip", "address"]:
                block.ip = words[2]
            elif words[0] == "shutdown":
                block.shutdown = True
        elif block == "vty" and words[:2] == ["transport", "input"]:
            cfg.vty_transport = words[2:]
    return cfg


def parse_file(path: Path) -> DeviceConfig:
    return parse_config(path.read_text())
`,
        "~/pyws/p16/netaudit/report.py": `"""Bulgulari host bazinda gruplayip metin rapor uret."""
from itertools import groupby

from netaudit.rules import Finding, Severity


def render(findings: list[Finding]) -> str:
    """
    Her host icin bir baslik ve altinda severity azalan, rule artan sirada bulgular.

    ist-core-01 3 findings
      HIGH   telnet_enabled telnet enabled on vty
      LOW    missing_description GigabitEthernet2 has no description
    Sonunda bos satir ve "total N findings, N high". Bulgu yoksa "no findings".
    """
    if not findings:
        return "no findings\\n"
    ordered = sorted(findings, key=lambda f: (f.host, -f.severity, f.rule, f.message))
    lines: list[str] = []
    for host, group in groupby(ordered, key=lambda f: f.host):
        items = list(group)
        lines.append(f"{host} {len(items)} findings")
        lines.extend(f"  {f.severity.name:<6} {f.rule} {f.message}" for f in items)
    high = sum(1 for f in findings if f.severity is Severity.HIGH)
    lines.append("")
    lines.append(f"total {len(findings)} findings, {high} high")
    return "\\n".join(lines) + "\\n"
`,
        "~/pyws/p16/netaudit/rules.py": `"""Denetim kurallari. Her kural DeviceConfig alir, Finding listesi doner."""
from collections.abc import Callable
from dataclasses import dataclass
from enum import IntEnum

from netaudit.parse import DeviceConfig


class Severity(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3


@dataclass(frozen=True)
class Finding:
    host: str
    rule: str
    severity: Severity
    message: str


Rule = Callable[[DeviceConfig], list[Finding]]


def no_ntp(cfg: DeviceConfig) -> list[Finding]:
    """ntp server yoksa MEDIUM, mesaj 'no ntp server configured'."""
    if cfg.ntp:
        return []
    return [Finding(cfg.hostname, "no_ntp", Severity.MEDIUM, "no ntp server configured")]


def missing_description(cfg: DeviceConfig) -> list[Finding]:
    """ip'si olan, shutdown olmayan ve description'i bos her interface icin LOW, mesaj 'IFACE has no description'."""
    return [
        Finding(cfg.hostname, "missing_description", Severity.LOW, f"{i.name} has no description")
        for i in cfg.interfaces
        if i.ip and not i.shutdown and not i.description
    ]


def telnet_enabled(cfg: DeviceConfig) -> list[Finding]:
    """vty transport'ta telnet varsa HIGH, mesaj 'telnet enabled on vty'."""
    if "telnet" not in cfg.vty_transport:
        return []
    return [Finding(cfg.hostname, "telnet_enabled", Severity.HIGH, "telnet enabled on vty")]


def default_snmp_community(cfg: DeviceConfig) -> list[Finding]:
    """public ya da private community icin HIGH, mesaj 'default snmp community NAME'."""
    return [
        Finding(cfg.hostname, "default_snmp_community", Severity.HIGH, f"default snmp community {name}")
        for name in cfg.snmp_communities
        if name in {"public", "private"}
    ]


RULES: list[Rule] = [no_ntp, missing_description, telnet_enabled, default_snmp_community]


def run_rules(cfg: DeviceConfig, rules: list[Rule] = RULES) -> list[Finding]:
    """Tum kurallari calistir, bulgulari birlestir."""
    return [finding for rule in rules for finding in rule(cfg)]
`,
      },
      check: (sh, c) => mpyOut(sh, '/home/burak/pyws/p16', 'ank-core-01 3 findings\n  HIGH   default_snmp_community default snmp community private\n  MEDIUM no_ntp no ntp server configured\n  LOW    missing_description GigabitEthernet1 has no description\n', 'ist-core-01 3 findings\n  HIGH   default_snmp_community default snmp community public\n  HIGH   telnet_enabled telnet enabled on vty\n  LOW    missing_description GigabitEthernet2 has no description\n', 'total 6 findings, 3 high') && !sh.lastPy.stdout.includes('ist-acc-01') && mpyFile(sh, '/home/burak/pyws/p16/netaudit/report.py', 'groupby(') && mpyFile(sh, '/home/burak/pyws/p16/netaudit/__main__.py', 'add_argument') && mpyFile(sh, '/home/burak/pyws/p16/netaudit/rules.py', 'Severity.HIGH') },
  ],
});

QUIZ.push(
  { q: "`'administratively down down'.split()` kaç eleman döner?", a: ["3","2","1","Hata verir"], c: 0 },
  { q: "Regex'te `(?P<host>\\S+)` ne yapar?", a: ["host adlı named group yakalar","host kelimesini arar","Boşlukları yakalar","Satır başını işaretler"], c: 0 },
  { q: "`sorted(devs, key=lambda d: (-d[\"uptime\"], d[\"name\"]))` ne sıralar?", a: ["Uptime azalan, eşitlikte isim artan","Uptime artan, isim azalan","Sadece isim","Sadece uptime artan"], c: 0 },
  { q: "`ip_network(\"10.0.0.1/24\")` neden ValueError verir?", a: ["Host bit'leri set, strict=False gerekir","Prefix 24 geçersiz","IPv6 bekler","String kabul etmez"], c: 0 },
  { q: "dataclass'ta `tags: list[str] = []` yazınca ne olur?", a: ["ValueError, default_factory gerekir","Her instance kendi listesini alır","Sessizce None olur","Tuple'a çevrilir"], c: 0 },
  { q: "Protocol ile isinstance kullanmak için ne gerekir?", a: ["@runtime_checkable dekoratörü","Sınıfın Protocol'den miras alması","ABC register","Hiçbir şey, her zaman çalışır"], c: 0 },
  { q: "itertools.groupby doğru sonuç için girişten ne bekler?", a: ["Anahtara göre sıralı ya da gruplanmış olmasını","Bir list olmasını","Benzersiz elemanlar","Sayısal anahtar"], c: 0 },
  { q: "`Path(\"configs\").rglob(\"*.cfg\")` hangi dosyaları getirmez?", a: ["x.cfg.bak gibi başka sonekli dosyaları","Alt dizindeki .cfg dosyalarını","Büyük harfli adları","Gizli dizindekileri"], c: 0 },
  { q: "YAML 1.1'de `enabled: yes` safe_load ile ne olur?", a: ["True bool","\"yes\" string","None","Hata"], c: 0 },
  { q: "csv dosyasını open ederken neden newline=\"\" verilir?", a: ["Satır sonlarının ikileşmemesi için","Hızlanması için","UTF-8 zorlamak için","Header atlamak için"], c: 0 },
  { q: "Jinja2'de StrictUndefined ne yapar?", a: ["Tanımsız değişkende hata fırlatır","Boş string basar","None basar","Uyarı loglar"], c: 0 },
  { q: "`raise ParseError(...) from exc` ne set eder?", a: ["__cause__ ile neden zincirini","__context__ silinir","Traceback silinir","Exception yutulur"], c: 0 },
);

BADGES.push({ id: 'pythonista', icon: '🐍', title: 'Pythonista', desc: 'Python ile Network Automation bölümünü bitir', test: st => CHAPTERS.find(c => c.id === 'python').missions.every(m => st.done.includes(m.id)) });
