'use strict';
/* Unit ve Integration Test bolumu. Her gorev /home/burak/tws/<id>/ altinda calisir. Yardimcilar mts on ekli. */

const MTS_HOME = '/home/burak';
/* dizini yarat, dosyalari yaz */
function mtsFiles(sh, dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = dir + '/' + rel;
    const parent = abs.split('/').slice(0, -1).join('/');
    sh.run('mkdir -p ' + parent);
    sh.writeFile(abs, content, false, 'nano');
  }
}
/* pytest ozet satirindan sayilar, "2 passed, 1 skipped, 1 deselected, 1 xfailed in 0.02s" */
function mtsCounts(sh) {
  const lp = sh.lastPy;
  const n = { passed: 0, failed: 0, skipped: 0, xfailed: 0, xpassed: 0, deselected: 0, errors: 0, ok: false };
  if (!lp) return n;
  const out = String(lp.stdout || '');
  for (const key of Object.keys(n)) { const m = new RegExp('(\\d+) ' + (key === 'errors' ? 'errors?' : key) + '\\b').exec(out); if (m) n[key] = parseInt(m[1], 10); }
  n.ok = lp.code === 0;
  return n;
}
/* son pytest calismasi bu gorev dizininde mi, cwd ya da argv path */
function mtsRanIn(sh, dir) {
  const lp = sh.lastPy;
  if (!lp) return false;
  const argv = (lp.argv || []).map(a => String(a));
  return sh.cwd === dir || sh.cwd.startsWith(dir + '/') || argv.some(a => sh.resolve(a) === dir || sh.resolve(a).startsWith(dir + '/'));
}
/* pytest basarili, bu dizinde, en az n passed, sifir failed */
function mtsPassed(sh, dir, n) {
  const c = mtsCounts(sh);
  return c.ok && mtsRanIn(sh, dir) && c.passed >= n && c.failed === 0 && c.errors === 0;
}
function mtsFile(sh, path, ...needles) {
  const node = sh.node(path);
  return !!(node && node.t === 'f' && needles.every(s => s instanceof RegExp ? s.test(node.d) : node.d.includes(s)));
}
function mtsWasPytest(sh) {
  const argv = ((sh.lastPy || {}).argv || []).map(String);
  return !argv[0] || !argv[0].endsWith('.py') || argv.includes('pytest');
}

CHAPTERS.push({
  id: "test", icon: "🧪", title: "Unit ve Integration Test", sub: "pytest ile parser, fixture, mock, marker ve lab API testi",
  missions: [
    { id: "t1", title: "İlk pytest", xp: 30,
      story: "Parser'ı yazdın, çalışıyor gibi. Gibi yetmez. pytest, `test_` ile başlayan dosyalardaki `test_` fonksiyonlarını bulur, assert'leri koşar, kırmızıyı gösterir. parse_brief.py'de bir bug var, ilk testin onu bulacak. Kırmızıyı okumak yeşil görmek kadar önemli, failure çıktısında hangi satır, hangi değer, hepsi yazıyor.",
      task: "`~/tws/t1/test_parse_brief.py` içine test_row_count ve test_admin_down_status testlerini yaz, `cd ~/tws/t1 && pytest -q` çalıştır. Bir test kırmızı, çıktıyı oku, parse_brief.py'deki bug'ı düzelt, tekrar koş. Sonuç `2 passed` olmalı.",
      hint: "Test fonksiyonu sıradan fonksiyon, düz assert kullanır, özel assertEqual yok. Failure çıktısında `E` ile başlayan satırlar beklenen ve gelen değeri gösterir, bug `parts[4]` ve `parts[5]`, status iki kelime olunca kayıyor, çözüm `\" \".join(parts[4:-1])` ve `parts[-1]`. pytest test dosyasının dizinini sys.path'e ekler, bu yüzden `from parse_brief import parse_brief` çalışır. `-q` sessiz mod, nokta başına bir test, F fail. Dokümantasyon pytest Get Started ve How to write and report assertions in tests.",
      solution: "nano ~/tws/t1/test_parse_brief.py\ncd ~/tws/t1 && pytest -q\nnano ~/tws/t1/parse_brief.py\npytest -q",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t1", {
        "parse_brief.py": `"""show ip interface brief parser. Bir bug var, test onu bulacak."""


def parse_brief(text: str) -> list[dict[str, str]]:
    """Her veri satirini interface, ip, status, protocol dict'ine cevir."""
    rows: list[dict[str, str]] = []
    for line in text.splitlines():
        if not line.strip() or line.startswith("Interface"):
            continue
        parts = line.split()
        rows.append({"interface": parts[0], "ip": parts[1], "status": parts[4], "protocol": parts[5]})
    return rows
`,
        "test_parse_brief.py": `"""Ilk pytest dosyasi. Dosya adi test_ ile baslar, fonksiyonlar da."""
from parse_brief import parse_brief

SAMPLE = """\\
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet1       10.0.0.1        YES NVRAM  up                    up
GigabitEthernet3       unassigned      YES unset  administratively down down
"""


# TODO test_row_count, parse_brief(SAMPLE) iki satir dondurmeli
# TODO test_admin_down_status, ikinci satirin status'u "administratively down", protocol'u "down" olmali
`,
      }); },
      editorContent: {
        "~/tws/t1/parse_brief.py": `"""show ip interface brief parser. Status birden fazla kelime olabilir, protocol hep sonuncu."""


def parse_brief(text: str) -> list[dict[str, str]]:
    """Her veri satirini interface, ip, status, protocol dict'ine cevir."""
    rows: list[dict[str, str]] = []
    for line in text.splitlines():
        if not line.strip() or line.startswith("Interface"):
            continue
        parts = line.split()
        rows.append({"interface": parts[0], "ip": parts[1], "status": " ".join(parts[4:-1]), "protocol": parts[-1]})
    return rows
`,
        "~/tws/t1/test_parse_brief.py": `"""Ilk pytest dosyasi. Dosya adi test_ ile baslar, fonksiyonlar da."""
from parse_brief import parse_brief

SAMPLE = """\\
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet1       10.0.0.1        YES NVRAM  up                    up
GigabitEthernet3       unassigned      YES unset  administratively down down
"""


def test_row_count() -> None:
    assert len(parse_brief(SAMPLE)) == 2


def test_admin_down_status() -> None:
    row = parse_brief(SAMPLE)[1]
    assert row["status"] == "administratively down"
    assert row["protocol"] == "down"
`,
      },
      check: (sh, c) => mtsPassed(sh, '/home/burak/tws/t1', 2) && mtsFile(sh, '/home/burak/tws/t1/test_parse_brief.py', 'def test_row_count', 'def test_admin_down_status') && mtsFile(sh, '/home/burak/tws/t1/parse_brief.py', 'parts[-1]') },
    { id: "t2", title: "assert ve mesajlar", xp: 30,
      story: "pytest'in assert introspection'ı sihir gibi, `assert len(up) == 2` patlayınca len'in döndüğü değeri, up listesini, hepsini gösterir. Yine de bir mesaj eklemek bağlamı verir, CI log'unda saat üçte bakan kişi neyin beklendiğini anlar. bgp.py'de Active state'i established sayan bir bug var.",
      task: "`~/tws/t2/test_bgp.py` içine test_active_is_not_established ve test_order_preserved testlerini yaz, var olan assert'e f-string mesaj ekle. `cd ~/tws/t2 && pytest -x --tb=short` ile koş, ilk failure'da durur. Çıktıdaki introspection'ı oku, bgp.py'yi isdigit ile düzelt, tekrar koş, `3 passed`.",
      hint: "assert ifadesinin ikinci kısmı mesaj, `assert x not in up, f'...{up}'`. pytest assert'i yeniden yazar, bu yüzden `where` ve `+` satırlarında ara değerler görünür, bu sadece test dosyalarında çalışır, yardımcı modülde değil. `-x` ilk hatada durur, `--tb=short` traceback'i kısaltır, `--tb=line` daha da kısa. Sık hata, `assert(x, 'mesaj')` yazmak, tuple her zaman True, pytest bunun için uyarı verir. Dokümantasyon pytest Assertion introspection ve How to invoke pytest.",
      solution: "nano ~/tws/t2/test_bgp.py\ncd ~/tws/t2 && pytest -x --tb=short\nnano ~/tws/t2/bgp.py\npytest -x --tb=short",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t2", {
        "bgp.py": `"""show ip bgp summary satirlarindan established neighbor listesi."""


def established(rows: list[dict[str, str]]) -> list[str]:
    """State/PfxRcd sutunu sayi olan neighbor'lar."""
    return [r["neighbor"] for r in rows if r["state"] != "Idle"]
`,
        "test_bgp.py": `"""assert introspection, pytest basarisiz assert'te degerleri kendisi gosterir."""
from bgp import established

ROWS = [
    {"neighbor": "10.0.12.2", "asn": "65002", "state": "120"},
    {"neighbor": "10.0.13.3", "asn": "65003", "state": "4"},
    {"neighbor": "10.0.14.4", "asn": "65004", "state": "Idle"},
    {"neighbor": "192.168.255.9", "asn": "65001", "state": "Active"},
]


def test_established_count() -> None:
    up = established(ROWS)
    assert len(up) == 2


# TODO test_active_is_not_established, "192.168.255.9" up listesinde olmamali,
#      assert'e f-string ile mesaj ekle, mesajda up listesi gorunsun
# TODO test_order_preserved, established(ROWS) == ["10.0.12.2", "10.0.13.3"]
`,
      }); },
      editorContent: {
        "~/tws/t2/bgp.py": `"""show ip bgp summary satirlarindan established neighbor listesi."""


def established(rows: list[dict[str, str]]) -> list[str]:
    """State/PfxRcd sutunu sayi olan neighbor'lar, Idle ve Active gibi metinler session yok demek."""
    return [r["neighbor"] for r in rows if r["state"].isdigit()]
`,
        "~/tws/t2/test_bgp.py": `"""assert introspection, pytest basarisiz assert'te degerleri kendisi gosterir."""
from bgp import established

ROWS = [
    {"neighbor": "10.0.12.2", "asn": "65002", "state": "120"},
    {"neighbor": "10.0.13.3", "asn": "65003", "state": "4"},
    {"neighbor": "10.0.14.4", "asn": "65004", "state": "Idle"},
    {"neighbor": "192.168.255.9", "asn": "65001", "state": "Active"},
]


def test_established_count() -> None:
    up = established(ROWS)
    assert len(up) == 2, f"expected 2 established peers, got {len(up)}: {up}"


def test_active_is_not_established() -> None:
    up = established(ROWS)
    assert "192.168.255.9" not in up, f"Active peer reported as established, up list is {up}"


def test_order_preserved() -> None:
    assert established(ROWS) == ["10.0.12.2", "10.0.13.3"]
`,
      },
      check: (sh, c) => mtsPassed(sh, '/home/burak/tws/t2', 3) && mtsFile(sh, '/home/burak/tws/t2/test_bgp.py', 'def test_active_is_not_established', /assert .*, f["']/) && mtsFile(sh, '/home/burak/tws/t2/bgp.py', 'isdigit()') },
    { id: "t3", title: "parametrize ve ids", xp: 35,
      story: "Aynı testi beş değerle koşmak için beş fonksiyon yazmazsın. parametrize her değeri ayrı test yapar, raporda `test_valid_vlan[users]` gibi görünür, biri patlayınca hangisi olduğu bellidir. ids vermezsen pytest değerden id üretir, 1002 yerine reserved-1002 okumak daha iyidir.",
      task: "`~/tws/t3/test_vlan.py` içindeki iki teste parametrize ekle. Geçerli değerler 1, 10, 4094 ids min, users, max. Geçersizler pytest.param ile 0 zero, 4095 above-max, 1002 reserved-1002, 1005 reserved-1005. `cd ~/tws/t3 && pytest -v` ile koş, `7 passed` ve id'ler görünsün.",
      hint: "`@pytest.mark.parametrize('vlan_id', [1, 10, 4094], ids=['min', 'users', 'max'])` ilk argüman parametre adı, fonksiyon imzasıyla aynı olmalı. Birden fazla parametre için `'vlan_id, expected'` ve tuple listesi. pytest.param her değere kendi id'sini ve marks'ını verir, `pytest.param(1002, id='reserved-1002', marks=pytest.mark.xfail)` gibi. `-v` her testi ayrı satırda id'siyle yazar, `-k reserved` ile sadece o id'leri seçersin. Dokümantasyon pytest How to parametrize fixtures and test functions.",
      solution: "nano ~/tws/t3/test_vlan.py\ncd ~/tws/t3 && pytest -v",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t3", {
        "test_vlan.py": `"""Ayni testi farkli verilerle kosmak icin parametrize, her durum ayri test olarak raporlanir."""
import pytest
from vlan import valid_vlan


# TODO @pytest.mark.parametrize("vlan_id", [...], ids=[...]) ile gecerli degerler
#      1 "min", 10 "users", 4094 "max"
def test_valid_vlan(vlan_id: int) -> None:
    assert valid_vlan(vlan_id)


# TODO parametrize ile gecersiz degerler, pytest.param(..., id="...") kullan
#      0 "zero", 4095 "above-max", 1002 "reserved-1002", 1005 "reserved-1005"
def test_invalid_vlan(vlan_id: int) -> None:
    assert not valid_vlan(vlan_id)
`,
        "vlan.py": `"""VLAN id dogrulama."""

RESERVED = range(1002, 1006)


def valid_vlan(vlan_id: int) -> bool:
    """1..4094 arasi ve 1002..1005 disinda ise True."""
    return 1 <= vlan_id <= 4094 and vlan_id not in RESERVED
`,
      }); },
      editorContent: {
        "~/tws/t3/test_vlan.py": `"""Ayni testi farkli verilerle kosmak icin parametrize, her durum ayri test olarak raporlanir."""
import pytest
from vlan import valid_vlan


@pytest.mark.parametrize("vlan_id", [1, 10, 4094], ids=["min", "users", "max"])
def test_valid_vlan(vlan_id: int) -> None:
    assert valid_vlan(vlan_id)


@pytest.mark.parametrize(
    "vlan_id",
    [
        pytest.param(0, id="zero"),
        pytest.param(4095, id="above-max"),
        pytest.param(1002, id="reserved-1002"),
        pytest.param(1005, id="reserved-1005"),
    ],
)
def test_invalid_vlan(vlan_id: int) -> None:
    assert not valid_vlan(vlan_id)
`,
      },
      check: (sh, c) => mtsPassed(sh, '/home/burak/tws/t3', 7) && /test_valid_vlan\[users\] PASSED/.test(sh.lastPy.stdout) && /test_invalid_vlan\[reserved-1002\] PASSED/.test(sh.lastPy.stdout) && mtsFile(sh, '/home/burak/tws/t3/test_vlan.py', 'parametrize', 'pytest.param(') },
    { id: "t4", title: "Fixture ve scope", xp: 35,
      story: "Her test aynı envanteri yüklerse hem yavaş hem tekrar. Fixture, testin ihtiyaç duyduğu şeyi adıyla ister, pytest hazırlar. scope ile ömrünü seçersin, function her test için taze, module dosya başına bir kere, session tüm koşu boyunca. yield'li fixture setup ve teardown'ı tek fonksiyonda tutar.",
      task: "`~/tws/t4/test_inventory.py` içine module scope'lu inventory fixture'ı ve yield'li function scope'lu scratch fixture'ı yaz. Testler zaten hazır, test_loaded_once dosyanın bir kere okunduğunu kanıtlar. `cd ~/tws/t4 && pytest -v`, `4 passed`.",
      hint: "`@pytest.fixture(scope='module')` üstüne, fonksiyon adı testin aldığı parametre adıdır, pytest adla eşler. yield'den önceki kısım setup, sonrası teardown, test patlasa da teardown çalışır. Module scope fixture'ın döndürdüğü nesneyi bir test değiştirirse sonrakiler değişmiş halini görür, paylaşılan state tuzağı, salt okunur veri için uygundur. `pytest --setup-show` hangi fixture'ın ne zaman kurulduğunu gösterir, `--fixtures` mevcut fixture'ları listeler. Dokümantasyon pytest How to use fixtures ve Fixture scopes.",
      solution: "nano ~/tws/t4/test_inventory.py\ncd ~/tws/t4 && pytest -v",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t4", {
        "inventory.json": `[
  {"hostname": "ist-core-01", "site": "IST", "role": "core"},
  {"hostname": "ist-acc-01", "site": "IST", "role": "access"},
  {"hostname": "ank-core-01", "site": "ANK", "role": "core"}
]
`,
        "inventory.py": `"""Envanter yukleme ve sorgulama."""
import json
from pathlib import Path

Device = dict[str, str]


def load_inventory(path: Path) -> list[Device]:
    return json.loads(path.read_text())


def by_role(devices: list[Device], role: str) -> list[str]:
    return sorted(d["hostname"] for d in devices if d["role"] == role)


def sites(devices: list[Device]) -> set[str]:
    return {d["site"] for d in devices}
`,
        "test_inventory.py": `"""Fixture, testin ihtiyac duydugu veriyi hazirlar. scope ile kac kere kurulacagi secilir."""
from pathlib import Path

import pytest
from inventory import by_role, load_inventory, sites

HERE = Path(__file__).parent
LOADS: list[str] = []


# TODO scope="module" fixture inventory, LOADS.append("load") yapip load_inventory(HERE / "inventory.json") dondursun
# TODO function scope fixture scratch, yield ile bir list versin, teardown'da list'i temizlesin


def test_core_devices(inventory) -> None:
    assert by_role(inventory, "core") == ["ank-core-01", "ist-core-01"]


def test_sites(inventory) -> None:
    assert sites(inventory) == {"IST", "ANK"}


def test_loaded_once(inventory) -> None:
    assert LOADS == ["load"], f"module scope fixture should load once, loaded {len(LOADS)} times"


def test_scratch_is_fresh(scratch) -> None:
    assert scratch == []
    scratch.append("x")
`,
      }); },
      editorContent: {
        "~/tws/t4/test_inventory.py": `"""Fixture, testin ihtiyac duydugu veriyi hazirlar. scope ile kac kere kurulacagi secilir."""
from collections.abc import Iterator
from pathlib import Path

import pytest
from inventory import by_role, load_inventory, sites

HERE = Path(__file__).parent
LOADS: list[str] = []


@pytest.fixture(scope="module")
def inventory() -> list[dict[str, str]]:
    """Dosya bir kere okunur, moduldeki tum testler ayni listeyi paylasir."""
    LOADS.append("load")
    return load_inventory(HERE / "inventory.json")


@pytest.fixture
def scratch() -> Iterator[list[str]]:
    """Her test icin taze liste, yield sonrasi teardown."""
    items: list[str] = []
    yield items
    items.clear()


def test_core_devices(inventory: list[dict[str, str]]) -> None:
    assert by_role(inventory, "core") == ["ank-core-01", "ist-core-01"]


def test_sites(inventory: list[dict[str, str]]) -> None:
    assert sites(inventory) == {"IST", "ANK"}


def test_loaded_once(inventory: list[dict[str, str]]) -> None:
    assert LOADS == ["load"], f"module scope fixture should load once, loaded {len(LOADS)} times"


def test_scratch_is_fresh(scratch: list[str]) -> None:
    assert scratch == []
    scratch.append("x")
`,
      },
      check: (sh, c) => mtsPassed(sh, '/home/burak/tws/t4', 4) && mtsFile(sh, '/home/burak/tws/t4/test_inventory.py', 'scope="module"', 'yield') },
    { id: "t5", title: "conftest ve src layout", xp: 40,
      story: "Proje büyüyünce fixture'lar dosyalar arasında paylaşılmalı ve kod testten ayrılmalı. conftest.py pytest'in otomatik bulduğu fixture deposudur, import edilmez. src layout ise paketi src altına koyar, pyproject'teki pythonpath ile pytest onu bulur, böylece kurulmamış paketi yanlışlıkla cwd'den import etme tuzağına düşmezsin.",
      task: "`~/tws/t5/` projesinde pyproject.toml'a pytest ayarlarını ekle, pythonpath src, testpaths tests, addopts -q. `tests/conftest.py` içine sample_vlans fixture'ı yaz, 10 users, 20 voice, 99 mgmt. `tests/test_validate.py` ve `tests/test_names.py` dosyalarını yaz, her biri fixture'ı kullanan bir test ve bir düz test içersin. `cd ~/tws/t5 && pytest` ile koş, `4 passed`.",
      hint: "pyproject.toml'da `[tool.pytest.ini_options]` tablosu, `pythonpath = [\"src\"]` sys.path'e ekler, `testpaths = [\"tests\"]` argümansız koşuda nereye bakılacağını söyler, `addopts = \"-q\"` her koşuya eklenir. conftest.py'deki fixture'lar aynı dizin ve altındaki tüm testlerde görünür, import satırı yazarsan pytest iki kere yükler ve garip hatalar alırsın. src layout'ta `from vlanlib import valid_vlan` paketin __init__'inden gelir. rootdir pyproject'in olduğu dizindir, `pytest --co -q` sadece toplar ve listeler. Dokümantasyon pytest Configuration, conftest.py local per-directory plugins ve Good Integration Practices.",
      solution: "nano ~/tws/t5/pyproject.toml\nnano ~/tws/t5/tests/conftest.py\nnano ~/tws/t5/tests/test_names.py\nnano ~/tws/t5/tests/test_validate.py\ncd ~/tws/t5 && pytest",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t5", {
        "pyproject.toml": `[project]
name = "vlanlib"
version = "0.1.0"

# TODO [tool.pytest.ini_options] bolumu, pythonpath = ["src"], testpaths = ["tests"], addopts = "-q"
`,
        "src/vlanlib/__init__.py": `"""vlanlib, VLAN dogrulama ve isimlendirme."""
from vlanlib.validate import valid_vlan, vlan_name_ok

__all__ = ["valid_vlan", "vlan_name_ok"]
`,
        "src/vlanlib/validate.py": `"""Dogrulama fonksiyonlari."""
import re

RESERVED = range(1002, 1006)
NAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_-]{0,31}$")


def valid_vlan(vlan_id: int) -> bool:
    return 1 <= vlan_id <= 4094 and vlan_id not in RESERVED


def vlan_name_ok(name: str) -> bool:
    return NAME_RE.fullmatch(name) is not None
`,
        "tests/.keep": ``,
      }); },
      editorContent: {
        "~/tws/t5/pyproject.toml": `[project]
name = "vlanlib"
version = "0.1.0"

[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]
addopts = "-q"
`,
        "~/tws/t5/tests/conftest.py": `"""Paylasilan fixture'lar. conftest.py import edilmez, pytest kendisi bulur."""
import pytest


@pytest.fixture
def sample_vlans() -> dict[int, str]:
    return {10: "users", 20: "voice", 99: "mgmt"}
`,
        "~/tws/t5/tests/test_names.py": `from vlanlib import vlan_name_ok


def test_sample_names_ok(sample_vlans: dict[int, str]) -> None:
    assert all(vlan_name_ok(n) for n in sample_vlans.values())


def test_name_cannot_start_with_digit() -> None:
    assert not vlan_name_ok("10users")
`,
        "~/tws/t5/tests/test_validate.py": `from vlanlib import valid_vlan


def test_sample_ids_valid(sample_vlans: dict[int, str]) -> None:
    assert all(valid_vlan(v) for v in sample_vlans)


def test_reserved_rejected() -> None:
    assert not valid_vlan(1002)
`,
      },
      check: (sh, c) => mtsPassed(sh, '/home/burak/tws/t5', 4) && mtsFile(sh, '/home/burak/tws/t5/pyproject.toml', '[tool.pytest.ini_options]', 'pythonpath', 'src') && mtsFile(sh, '/home/burak/tws/t5/tests/conftest.py', '@pytest.fixture', 'def sample_vlans') && mtsFile(sh, '/home/burak/tws/t5/tests/test_validate.py', 'sample_vlans') && mtsFile(sh, '/home/burak/tws/t5/tests/test_names.py', 'sample_vlans') && !mtsFile(sh, '/home/burak/tws/t5/tests/test_validate.py', 'import conftest') },
    { id: "t6", title: "tmp_path ve monkeypatch", xp: 40,
      story: "Dosya yazan ve environment okuyan kod test edilmesi zor sayılır, değil. tmp_path her teste gerçek, boş, otomatik silinen bir dizin verir. monkeypatch environment değişkenini ya da bir modül fonksiyonunu test süresince değiştirir, test bitince geri alır, global state kirlenmez. Tarih üreten timestamp'i sabitlemek deterministik test'in anahtarı.",
      task: "`~/tws/t6/test_backup.py` içine üç test yaz. test_backup_writes_file tmp_path ve monkeypatch ile timestamp'i 20261013'e sabitleyip dosyanın `r1-20261013.cfg` adıyla doğru içerikle yazıldığını doğrular. test_settings_from_env setenv ile NETLAB_USER svc-netops ve NETLAB_BACKUP_DIR /srv/bk verir. test_settings_defaults delenv ile ikisini siler ve default'ları bekler. `cd ~/tws/t6 && pytest -v`, `3 passed`.",
      hint: "tmp_path bir pathlib.Path, her test için farklı, altına istediğin kadar dizin açabilirsin, pytest eskileri kendisi temizler. `monkeypatch.setattr(backup, 'timestamp', lambda: '20261013')` modül attribute'unu değiştirir, backup_config içindeki çağrı modül globalini okuduğu için yeni lambda'yı görür, `from backup import timestamp` ile ayrı isme bağlasaydın patch işlemezdi. setenv ve delenv os.environ'u yönetir, `raising=False` olmayan değişkeni silerken hata vermez. Dokümantasyon pytest How to use temporary directories and files ve How to monkeypatch/mock modules and environments.",
      solution: "nano ~/tws/t6/test_backup.py\ncd ~/tws/t6 && pytest -v",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t6", {
        "backup.py": `"""Config backup. Hedef dizin ve kullanici environment'tan gelir, dosya adinda tarih var."""
import os
from datetime import date
from pathlib import Path


def timestamp() -> str:
    return date.today().strftime("%Y%m%d")


def settings() -> dict[str, str]:
    """NETLAB_USER ve NETLAB_BACKUP_DIR, yoksa default."""
    return {
        "user": os.environ.get("NETLAB_USER", "burak"),
        "backup_dir": os.environ.get("NETLAB_BACKUP_DIR", "/var/backups/net"),
    }


def backup_config(hostname: str, text: str, dest: Path) -> Path:
    """dest/HOST-YYYYMMDD.cfg yazar ve yolu doner."""
    dest.mkdir(parents=True, exist_ok=True)
    target = dest / f"{hostname}-{timestamp()}.cfg"
    target.write_text(text)
    return target
`,
        "test_backup.py": `"""tmp_path gercek ama gecici dizin verir, monkeypatch env ve attribute'u test suresince degistirir."""
from pathlib import Path

import pytest
import backup


# TODO test_backup_writes_file(tmp_path, monkeypatch)
#      monkeypatch.setattr(backup, "timestamp", lambda: "20261013")
#      backup_config("r1", "hostname r1\\n", tmp_path / "cfg") -> tmp_path/cfg/r1-20261013.cfg, icerik dogru

# TODO test_settings_from_env(monkeypatch)
#      setenv NETLAB_USER "svc-netops", NETLAB_BACKUP_DIR "/srv/bk" -> settings() bunlari dondurmeli

# TODO test_settings_defaults(monkeypatch)
#      delenv ile ikisini de raising=False sil -> user "burak", backup_dir "/var/backups/net"
`,
      }); },
      editorContent: {
        "~/tws/t6/test_backup.py": `"""tmp_path gercek ama gecici dizin verir, monkeypatch env ve attribute'u test suresince degistirir."""
from pathlib import Path

import pytest
import backup


def test_backup_writes_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(backup, "timestamp", lambda: "20261013")
    target = backup.backup_config("r1", "hostname r1\\n", tmp_path / "cfg")
    assert target == tmp_path / "cfg" / "r1-20261013.cfg"
    assert target.read_text() == "hostname r1\\n"


def test_settings_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NETLAB_USER", "svc-netops")
    monkeypatch.setenv("NETLAB_BACKUP_DIR", "/srv/bk")
    assert backup.settings() == {"user": "svc-netops", "backup_dir": "/srv/bk"}


def test_settings_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("NETLAB_USER", raising=False)
    monkeypatch.delenv("NETLAB_BACKUP_DIR", raising=False)
    assert backup.settings() == {"user": "burak", "backup_dir": "/var/backups/net"}
`,
      },
      check: (sh, c) => mtsPassed(sh, '/home/burak/tws/t6', 3) && mtsFile(sh, '/home/burak/tws/t6/test_backup.py', 'tmp_path', 'monkeypatch.setenv', 'monkeypatch.setattr', 'monkeypatch.delenv') },
    { id: "t7", title: "unittest.mock ve MagicMock", xp: 45,
      story: "get_version cihaza SSH açar, test ortamında cihaz yok. unittest.mock.patch, connect fonksiyonunu test süresince bir MagicMock ile değiştirir, MagicMock her attribute ve çağrıya cevap verir, return_value ile ne döneceğini, side_effect ile hangi hatayı atacağını söylersin. Sonra assert_called_once_with ile kodun cihaza doğru komutu gönderdiğini kanıtlarsın.",
      task: "`~/tws/t7/test_collector.py` içine üç test yaz. test_get_version_parses_output patch ile collector.connect'i sahteler, cli'ya SHOW_VERSION döndürtür, `17.09.04a` bekler ve connect, cli, close çağrılarını assert eder. test_get_version_unknown boş çıktıda `unknown` bekler. test_session_closed_on_error cli'ya TimeoutError side_effect verir, pytest.raises ile yakalar ve close'un yine çağrıldığını doğrular. `cd ~/tws/t7 && pytest -v`, `3 passed`.",
      hint: "patch hedefi ismin arandığı yer, `collector.connect`, fonksiyonun tanımlandığı yer değil, en sık hata budur. `with patch('collector.connect') as mock_connect` bloğunda mock_connect.return_value connect'in döndürdüğü oturumdur, onun `.cli.return_value` ayarlanır. `side_effect = TimeoutError('...')` çağrıda o hatayı atar, bir liste verirsen sırayla döner. assert_called_once_with argümanları birebir karşılaştırır, `call_args` ile elle de bakabilirsin. MagicMock her şeyi kabul ettiği için yanlış attribute adı sessizce geçer, `spec=Session` vererek sıkılaştır. Dokümantasyon unittest.mock, patch ve MagicMock bölümleri, ayrıca Where to patch.",
      solution: "nano ~/tws/t7/test_collector.py\ncd ~/tws/t7 && pytest -v",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t7", {
        "collector.py": `"""Cihazdan surum toplar. connect gercekte SSH acar, lab'da ag yok."""
import re

VERSION_RE = re.compile(r"Version ([\\w.()-]+)")


class Session:
    def __init__(self, host: str) -> None:
        self.host = host

    def cli(self, command: str) -> str:
        raise RuntimeError(f"no network path to {self.host}")

    def close(self) -> None:
        pass


def connect(host: str) -> Session:
    return Session(host)


def get_version(host: str) -> str:
    """show version ciktisindan surumu cek, oturumu kapat."""
    session = connect(host)
    try:
        match = VERSION_RE.search(session.cli("show version"))
        return match.group(1) if match else "unknown"
    finally:
        session.close()
`,
        "test_collector.py": `"""unittest.mock ile cihaza gitmeden get_version'i test et. patch'i kullanildigi yerde yap, collector.connect."""
from unittest.mock import MagicMock, patch

import pytest
from collector import get_version

SHOW_VERSION = "Cisco IOS XE Software, Version 17.09.04a\\nCisco IOS Software, Version 17.9.4a, RELEASE SOFTWARE (fc3)\\n"


# TODO test_get_version_parses_output
#      with patch("collector.connect") as mock_connect: session = mock_connect.return_value,
#      session.cli.return_value = SHOW_VERSION, get_version("r1") == "17.09.04a"
#      mock_connect.assert_called_once_with("r1"), session.cli.assert_called_once_with("show version"), session.close.assert_called_once()

# TODO test_get_version_unknown, cli "" donerse "unknown"

# TODO test_session_closed_on_error, session.cli.side_effect = TimeoutError("ssh timeout"),
#      pytest.raises(TimeoutError) icinde get_version("r1"), ardindan session.close.assert_called_once()
`,
      }); },
      editorContent: {
        "~/tws/t7/test_collector.py": `"""unittest.mock ile cihaza gitmeden get_version'i test et. patch'i kullanildigi yerde yap, collector.connect."""
from unittest.mock import MagicMock, patch

import pytest
from collector import get_version

SHOW_VERSION = "Cisco IOS XE Software, Version 17.09.04a\\nCisco IOS Software, Version 17.9.4a, RELEASE SOFTWARE (fc3)\\n"


def test_get_version_parses_output() -> None:
    with patch("collector.connect") as mock_connect:
        session: MagicMock = mock_connect.return_value
        session.cli.return_value = SHOW_VERSION
        assert get_version("r1") == "17.09.04a"
    mock_connect.assert_called_once_with("r1")
    session.cli.assert_called_once_with("show version")
    session.close.assert_called_once()


def test_get_version_unknown() -> None:
    with patch("collector.connect") as mock_connect:
        mock_connect.return_value.cli.return_value = ""
        assert get_version("r1") == "unknown"


def test_session_closed_on_error() -> None:
    with patch("collector.connect") as mock_connect:
        session = mock_connect.return_value
        session.cli.side_effect = TimeoutError("ssh timeout")
        with pytest.raises(TimeoutError):
            get_version("r1")
    session.close.assert_called_once()
`,
      },
      check: (sh, c) => mtsPassed(sh, '/home/burak/tws/t7', 3) && mtsFile(sh, '/home/burak/tws/t7/test_collector.py', 'patch("collector.connect")', 'assert_called_once_with("show version")', 'side_effect') },
    { id: "t8", title: "pytest.raises ve match", xp: 35,
      story: "Hata fırlatmak da bir davranıştır ve test edilir. pytest.raises bloğu içinde beklenen hata gelmezse test fail olur, match ile mesajı regex'e karşı doğrularsın, yanlış ValueError yakalamazsın. excinfo ile exception nesnesine ulaşır, __cause__ zincirini bile kontrol edersin.",
      task: "`~/tws/t8/prefix.py` içindeki parse_prefix'e üç hata yolu ekle, eksik `/` için `missing prefix length in TEXT`, 0..32 dışı için `bad prefix length N`, ip_network hatasında `bad network TEXT` from exc. `~/tws/t8/test_prefix.py` içine test_missing_length, test_bad_length ve excinfo kullanan test_bad_network_chained testlerini yaz. `cd ~/tws/t8 && pytest -v`, `4 passed`.",
      hint: "`with pytest.raises(ValueError, match=r'bad prefix length 33'):` bloğunun içine sadece hatayı üreten çağrı girer, assert'ler bloğun dışına, çünkü hata atıldığı anda blok biter, altındaki satırlar çalışmaz. match re.search ile bakar, tam eşleşme gerekmez, özel karakterleri escape et. `as excinfo` ile `excinfo.value` exception nesnesi, `excinfo.type` sınıfı, `str(excinfo.value)` mesajı. Daha geniş sınıf yakalamak alt sınıfı da yakalar, Exception yazarsan her şey geçer, dar tut. Dokümantasyon pytest How to write and report assertions, Assertions about expected exceptions bölümü.",
      solution: "nano ~/tws/t8/prefix.py\nnano ~/tws/t8/test_prefix.py\ncd ~/tws/t8 && pytest -v",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t8", {
        "prefix.py": `"""CIDR string'ini (network, prefixlen) ciftine cevir, anlamli hatalarla."""
from ipaddress import ip_network


def parse_prefix(text: str) -> tuple[str, int]:
    # TODO "/" yoksa ValueError "missing prefix length in TEXT"
    # TODO prefix 0..32 disinda ise ValueError "bad prefix length N"
    # TODO ip_network(text, strict=False) ValueError verirse ValueError "bad network TEXT" from exc
    net = ip_network(text, strict=False)
    return str(net.network_address), net.prefixlen
`,
        "test_prefix.py": `"""pytest.raises hata bekler, match mesaji regex ile dogrular, excinfo ile nesneye ulasirsin."""
import pytest
from prefix import parse_prefix


def test_valid() -> None:
    assert parse_prefix("10.0.0.5/24") == ("10.0.0.0", 24)


# TODO test_missing_length, "10.0.0.0" icin ValueError, match=r"missing prefix length"
# TODO test_bad_length, "10.0.0.0/33" icin ValueError, match=r"bad prefix length 33"
# TODO test_bad_network_chained, "10.0.0.300/24" icin excinfo ile yakala,
#      str(excinfo.value) "bad network" icersin ve excinfo.value.__cause__ bir ValueError olsun
`,
      }); },
      editorContent: {
        "~/tws/t8/prefix.py": `"""CIDR string'ini (network, prefixlen) ciftine cevir, anlamli hatalarla."""
from ipaddress import ip_network


def parse_prefix(text: str) -> tuple[str, int]:
    if "/" not in text:
        raise ValueError(f"missing prefix length in {text}")
    length = int(text.rsplit("/", 1)[1])
    if not 0 <= length <= 32:
        raise ValueError(f"bad prefix length {length}")
    try:
        net = ip_network(text, strict=False)
    except ValueError as exc:
        raise ValueError(f"bad network {text}") from exc
    return str(net.network_address), net.prefixlen
`,
        "~/tws/t8/test_prefix.py": `"""pytest.raises hata bekler, match mesaji regex ile dogrular, excinfo ile nesneye ulasirsin."""
import pytest
from prefix import parse_prefix


def test_valid() -> None:
    assert parse_prefix("10.0.0.5/24") == ("10.0.0.0", 24)


def test_missing_length() -> None:
    with pytest.raises(ValueError, match=r"missing prefix length"):
        parse_prefix("10.0.0.0")


def test_bad_length() -> None:
    with pytest.raises(ValueError, match=r"bad prefix length 33"):
        parse_prefix("10.0.0.0/33")


def test_bad_network_chained() -> None:
    with pytest.raises(ValueError) as excinfo:
        parse_prefix("10.0.0.300/24")
    assert "bad network" in str(excinfo.value)
    assert isinstance(excinfo.value.__cause__, ValueError)
`,
      },
      check: (sh, c) => mtsPassed(sh, '/home/burak/tws/t8', 4) && mtsFile(sh, '/home/burak/tws/t8/test_prefix.py', 'pytest.raises(ValueError, match=', 'excinfo.value') && mtsFile(sh, '/home/burak/tws/t8/prefix.py', 'from exc') },
    { id: "t9", title: "Marker ve -m seçimi", xp: 40,
      story: "Her test her zaman koşmaz. skip bilinçli atlar, skipif koşula bağlar, tarayıcıda socket yok gibi, xfail bilinen bug'ı belgeler, düzelince strict ile seni uyarır. Kendi marker'ların, slow ve device, pyproject'te kayıtlı olmalı, yoksa warning. `-m` ile marker ifadesine göre seçim yaparsın, CI'da hızlı testler, gece yavaşlar.",
      task: "`~/tws/t9/pyproject.toml` içine slow ve device marker'larını kaydet. `~/tws/t9/test_mtu.py` içindeki TODO'lara skip, skipif, xfail strict, slow ve device marker'larını ekle. `cd ~/tws/t9 && pytest -v -m \"not slow\"` ile koş. Çıktıda 1 deselected, en az 1 passed, 1 xfailed ve skipped testler görünsün, tarayıcıda socket testi de atlanır.",
      hint: "`@pytest.mark.skip(reason=...)`, `@pytest.mark.skipif(sys.platform == 'emscripten', reason=...)`, Pyodide'de platform emscripten'dir ve socket yoktur, bu test tarayıcıda atlanır, gerçek makinede koşar. `@pytest.mark.xfail(strict=True)` test beklenmedik şekilde geçerse XPASS yerine fail verir, bug düzelince marker'ı kaldırmayı unutmazsın. `-m \"not slow\"`, `-m \"slow or device\"` gibi boolean ifade, tırnak şart. Kayıtsız marker PytestUnknownMarkWarning verir, `--strict-markers` ile hata olur. Dokümantasyon pytest How to mark test functions with attributes, Skip and xfail, ve Working with custom markers.",
      solution: "nano ~/tws/t9/pyproject.toml\nnano ~/tws/t9/test_mtu.py\ncd ~/tws/t9 && pytest -v -m \"not slow\"",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t9", {
        "mtu.py": `"""MTU hesaplari."""


def payload_mtu(link_mtu: int, overhead: int) -> int:
    return link_mtu - overhead


def ipsec_overhead(cipher: str) -> int:
    """Tunnel mode ESP overhead, kaba tahmin. GCM icin henuz hesaplanmadi, bilinen eksik."""
    return {"aes-cbc": 73, "aes-gcm": 0}.get(cipher, 0)
`,
        "pyproject.toml": `[tool.pytest.ini_options]
# TODO markers listesi, "slow: uzun suren testler", "device: gercek cihaz ister"
`,
        "test_mtu.py": `"""Marker'lar testi etiketler. skip, skipif, xfail hazir, kendi marker'in pyproject'te kayitli olmali."""
import sys

import pytest
from mtu import ipsec_overhead, payload_mtu


def test_payload_mtu() -> None:
    assert payload_mtu(1500, 73) == 1427


# TODO @pytest.mark.skip(reason="gcm overhead henuz hesaplanmadi")
def test_gcm_overhead_documented() -> None:
    assert ipsec_overhead("aes-gcm") > 0


# TODO @pytest.mark.skipif(sys.platform == "emscripten", reason="tarayicida socket yok")
def test_resolver_available() -> None:
    import socket
    assert socket.gethostname()


# TODO @pytest.mark.xfail(reason="bilinen bug, overhead 73 yerine 74 olmali", strict=True)
def test_cbc_overhead_exact() -> None:
    assert ipsec_overhead("aes-cbc") == 74


# TODO @pytest.mark.slow
def test_big_table() -> None:
    assert all(payload_mtu(m, 73) == m - 73 for m in range(576, 9217))


# TODO @pytest.mark.device
def test_real_device_mtu() -> None:
    pytest.skip("lab cihazina bu bolumde baglanmiyoruz")
`,
      }); },
      editorContent: {
        "~/tws/t9/pyproject.toml": `[tool.pytest.ini_options]
markers = [
    "slow: uzun suren testler",
    "device: gercek cihaz ister",
]
`,
        "~/tws/t9/test_mtu.py": `"""Marker'lar testi etiketler. skip, skipif, xfail hazir, kendi marker'in pyproject'te kayitli olmali."""
import sys

import pytest
from mtu import ipsec_overhead, payload_mtu


def test_payload_mtu() -> None:
    assert payload_mtu(1500, 73) == 1427


@pytest.mark.skip(reason="gcm overhead henuz hesaplanmadi")
def test_gcm_overhead_documented() -> None:
    assert ipsec_overhead("aes-gcm") > 0


@pytest.mark.skipif(sys.platform == "emscripten", reason="tarayicida socket yok")
def test_resolver_available() -> None:
    import socket
    assert socket.gethostname()


@pytest.mark.xfail(reason="bilinen bug, overhead 73 yerine 74 olmali", strict=True)
def test_cbc_overhead_exact() -> None:
    assert ipsec_overhead("aes-cbc") == 74


@pytest.mark.slow
def test_big_table() -> None:
    assert all(payload_mtu(m, 73) == m - 73 for m in range(576, 9217))


@pytest.mark.device
def test_real_device_mtu() -> None:
    pytest.skip("lab cihazina bu bolumde baglanmiyoruz")
`,
      },
      check: (sh, c) => { const n = mtsCounts(sh); return n.ok && mtsRanIn(sh, '/home/burak/tws/t9') && n.passed >= 1 && n.failed === 0 && n.deselected === 1 && n.skipped >= 2 && n.xfailed === 1 && mtsFile(sh, '/home/burak/tws/t9/pyproject.toml', 'markers', 'slow', 'device') && mtsFile(sh, '/home/burak/tws/t9/test_mtu.py', '@pytest.mark.skipif(', '@pytest.mark.xfail(', '@pytest.mark.slow', '@pytest.mark.skip('); } },
    { id: "t10", title: "TDD red green refactor", xp: 45,
      story: "Test driven development, önce test, sonra kod. Red, test yazılır ve kırmızı görülür, fonksiyon bile yok. Green, testi geçiren en basit kod. Refactor, testler yeşilken kodu güzelleştir, güvenlik ağı var. VLAN adı doğrulayıcı için bu döngüyü tam olarak yaşıyorsun.",
      task: "`~/tws/t10/tests/test_vlan_name.py` içine parametrize ile geçerli ve geçersiz adları yaz, `cd ~/tws/t10 && pytest -q` ile kırmızıyı gör, ImportError. Sonra `~/tws/t10/vlan_name.py` içine vlan_name_ok fonksiyonunu yaz, önce if zinciri ile green, sonra tek regex ile refactor, re.compile ve fullmatch. Son koşu `10 passed`.",
      hint: "Kurallar, 1..32 karakter, ilk karakter ASCII harf, geri kalanı harf rakam alt çizgi tire. Kırmızı aşamada hata ImportError ya da NameError olur, bu da red sayılır, test toplanamadı. Green için `if not name or len(name) > 32: return False` gibi satırlar, sonra `name[0].isalpha()`, ama `isalpha` ü'yü de harf sayar, geçersiz listedeki `ünite` seni yakalar, Unicode tuzağı. Refactor'da `re.compile(r'[A-Za-z][A-Za-z0-9_-]{0,31}')` ve fullmatch, match sadece baştan eşleşir sona bakmaz. Her adımda pytest koş, refactor sonrası yeşil kalmak kuralı. Dokümantasyon re modülü, re.fullmatch ve Pattern.fullmatch, pytest How to invoke pytest.",
      solution: "nano ~/tws/t10/tests/test_vlan_name.py\ncd ~/tws/t10 && pytest -q\nnano ~/tws/t10/vlan_name.py\npytest -q",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t10", {
        "pyproject.toml": `[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
`,
        "tests/test_vlan_name.py": `"""Red, green, refactor. Kurallar, 1..32 karakter, harf ile baslar, harf rakam alt cizgi ve tire."""
import pytest
from vlan_name import vlan_name_ok

# TODO parametrize ile gecerli adlar, "users", "voice_10", "guest-wifi", "A", 32 harflik "a" * 32
# TODO parametrize ile gecersiz adlar, "", "10users", "a" * 33, "bad name", "ünite"
`,
        "vlan_name.py": `"""VLAN adi dogrulayici. Henuz yok, once test yazilacak, kirmizi gorulecek, sonra kod."""
`,
      }); },
      editorContent: {
        "~/tws/t10/tests/test_vlan_name.py": `"""Red, green, refactor. Kurallar, 1..32 karakter, harf ile baslar, harf rakam alt cizgi ve tire."""
import pytest
from vlan_name import vlan_name_ok


@pytest.mark.parametrize("name", ["users", "voice_10", "guest-wifi", "A", "a" * 32])
def test_valid_names(name: str) -> None:
    assert vlan_name_ok(name)


@pytest.mark.parametrize("name", ["", "10users", "a" * 33, "bad name", "ünite"])
def test_invalid_names(name: str) -> None:
    assert not vlan_name_ok(name)
`,
        "~/tws/t10/vlan_name.py": `"""VLAN adi dogrulayici. Refactor sonrasi tek regex, ilk green surum if zinciriydi."""
import re

NAME_RE = re.compile(r"[A-Za-z][A-Za-z0-9_-]{0,31}")


def vlan_name_ok(name: str) -> bool:
    """1..32 karakter, harf ile baslar, sadece ASCII harf, rakam, alt cizgi ve tire."""
    return NAME_RE.fullmatch(name) is not None
`,
      },
      check: (sh, c) => mtsPassed(sh, '/home/burak/tws/t10', 10) && mtsFile(sh, '/home/burak/tws/t10/vlan_name.py', 'fullmatch', 're.compile(') && mtsFile(sh, '/home/burak/tws/t10/tests/test_vlan_name.py', 'parametrize', '"10users"') },
    { id: "t11", title: "Lab API integration test", xp: 50,
      story: "Unit test fake ile konuşur, integration test gerçek servisle. Lab'daki `https://api.lab/v1/health` requests ile GET edilince 200 döner. Ama her ortamda API yok, requests shim'i yüklü olmayabilir. Olgun test paketi bunu bilir, erişilebilirse canlı koşar, değilse ya skip eder ya aynı sözleşmeyi taşıyan fake'e düşer. integration marker'ı ile ikisini ayırırsın.",
      task: "`~/tws/t11/tests/conftest.py` içine api_reachable fonksiyonunu, canlı ya da fake döndüren api fixture'ını, her zaman fake olan fake_api fixture'ını ve erişim yoksa skip eden live_only fixture'ını yaz. `~/tws/t11/tests/test_api.py` içine test_health_ok api ile 200, test_device_names fake_api ile `[\"r1\", \"sw1\"]`, integration marker'lı test_live_health live_only ile 200 testlerini yaz. `cd ~/tws/t11 && pytest -v`, en az `2 passed`, API yoksa 1 skipped.",
      hint: "api_reachable içinde `netapi.health() == 200` dene, her türlü Exception'da False dön, ImportError da RuntimeError da bağlantı hatası da ulaşılamaz demektir. Fake, netapi.http_get ile aynı imzayı taşır ve status_code ile json sunan bir nesne döner, kod bu sözleşmeye yazıldığı için fark etmez, Protocol'ün değeri burada. `monkeypatch.setattr(netapi, 'http_get', fake_get)` sadece o test süresince. live_only içinde `pytest.skip(reason)` testi SKIPPED yapar, fail değil. Daha sonra `pytest -m integration` ile sadece canlı testleri koşarsın. Pyodide'de socket yok, requests shim'i LAB.http üzerinden api.lab'a gider, shim yoksa fallback çalışır. Dokümantasyon pytest Skipping test functions, monkeypatch, ve requests Quickstart Response Content.",
      solution: "nano ~/tws/t11/tests/conftest.py\nnano ~/tws/t11/tests/test_api.py\ncd ~/tws/t11 && pytest -v",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t11", {
        "netapi.py": `"""Lab REST API istemcisi. requests shim'i varsa onu kullanir."""
from typing import Any, Protocol

try:
    import requests
except ImportError:  # shim yuklu degilse
    requests = None  # type: ignore[assignment]

BASE = "https://api.lab/v1"


class Response(Protocol):
    status_code: int

    def json(self) -> Any: ...


def http_get(url: str, timeout: float = 5.0) -> Response:
    """Tek cikis noktasi, test'te bu fonksiyon monkeypatch edilir."""
    if requests is None:
        raise RuntimeError("requests is not available")
    return requests.get(url, timeout=timeout)


def health() -> int:
    """GET /v1/health status code'u."""
    return http_get(f"{BASE}/health").status_code


def device_names() -> list[str]:
    """GET /v1/devices, kayitlarin name alanlari."""
    data = http_get(f"{BASE}/devices").json()
    items = data.get("devices", data) if isinstance(data, dict) else data
    return [d["name"] for d in items]
`,
        "pyproject.toml": `[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
markers = [
    "integration: lab API'sine gercekten gider",
]
`,
        "tests/conftest.py": `"""API erisilebilirse gercek, degilse ayni sekilde davranan fake ile test kos."""
from dataclasses import dataclass
from typing import Any

import pytest
import netapi


@dataclass
class FakeResponse:
    status_code: int
    payload: Any

    def json(self) -> Any:
        return self.payload


FAKE_ROUTES = {
    f"{netapi.BASE}/health": FakeResponse(200, {"status": "ok"}),
    f"{netapi.BASE}/devices": FakeResponse(200, {"devices": [{"name": "r1"}, {"name": "sw1"}]}),
}


def api_reachable() -> bool:
    """requests shim var ve api.lab 200 donuyor mu."""
    # TODO try netapi.health() == 200, except Exception False


# TODO fixture api(monkeypatch), api_reachable ise "live" don,
#      degilse netapi.http_get'i FAKE_ROUTES'tan okuyan fake ile monkeypatch.setattr edip "fake" don

# TODO fixture fake_api(monkeypatch), her zaman FAKE_ROUTES ile monkeypatch, unit test icin

# TODO fixture live_only, api_reachable degilse pytest.skip("api.lab reachable degil")
`,
        "tests/test_api.py": `"""Integration test. api fixture'i canli ya da fake, test ikisinde de ayni."""
import pytest
import netapi


# TODO test_health_ok(api), netapi.health() == 200
# TODO test_device_names(fake_api), netapi.device_names() == ["r1", "sw1"]
# TODO @pytest.mark.integration test_live_health(live_only), netapi.health() == 200
`,
      }); },
      editorContent: {
        "~/tws/t11/tests/conftest.py": `"""API erisilebilirse gercek, degilse ayni sekilde davranan fake ile test kos."""
from dataclasses import dataclass
from typing import Any

import pytest
import netapi


@dataclass
class FakeResponse:
    status_code: int
    payload: Any

    def json(self) -> Any:
        return self.payload


FAKE_ROUTES = {
    f"{netapi.BASE}/health": FakeResponse(200, {"status": "ok"}),
    f"{netapi.BASE}/devices": FakeResponse(200, {"devices": [{"name": "r1"}, {"name": "sw1"}]}),
}


def api_reachable() -> bool:
    """requests shim var ve api.lab 200 donuyor mu."""
    try:
        return netapi.health() == 200
    except Exception:
        return False


@pytest.fixture
def api(monkeypatch: pytest.MonkeyPatch) -> str:
    """Canli API varsa dokunma, yoksa http_get'i fake ile degistir."""
    if api_reachable():
        return "live"

    def fake_get(url: str, timeout: float = 5.0) -> FakeResponse:
        return FAKE_ROUTES.get(url, FakeResponse(404, {"error": "not found"}))

    monkeypatch.setattr(netapi, "http_get", fake_get)
    return "fake"


@pytest.fixture
def fake_api(monkeypatch: pytest.MonkeyPatch) -> None:
    """Her zaman fake, unit test icin deterministik veri."""
    monkeypatch.setattr(netapi, "http_get", lambda url, timeout=5.0: FAKE_ROUTES.get(url, FakeResponse(404, {})))


@pytest.fixture
def live_only() -> None:
    if not api_reachable():
        pytest.skip("api.lab reachable degil")
`,
        "~/tws/t11/tests/test_api.py": `"""Integration test. api fixture'i canli ya da fake, test ikisinde de ayni."""
import pytest
import netapi


def test_health_ok(api: str) -> None:
    assert netapi.health() == 200


def test_device_names(fake_api: None) -> None:
    assert netapi.device_names() == ["r1", "sw1"]


@pytest.mark.integration
def test_live_health(live_only: None) -> None:
    assert netapi.health() == 200
`,
      },
      check: (sh, c) => mtsPassed(sh, '/home/burak/tws/t11', 2) && mtsFile(sh, '/home/burak/tws/t11/tests/conftest.py', 'def api_reachable', 'monkeypatch.setattr(netapi, "http_get"', 'pytest.skip(') && mtsFile(sh, '/home/burak/tws/t11/tests/test_api.py', '@pytest.mark.integration', 'def test_health_ok', 'def test_device_names') },
    { id: "t12", title: "Flaky test ve zaman", xp: 45,
      story: "Gece 02.30'da CI kırmızı, sabah yeşil, kimse dokunmadı. Flaky test. Sebep çoğu zaman gizli bağımlılık, saat, random, ağ, sıra. maint.py bakım penceresini datetime.now ile kontrol ediyor, test de öyle, yani testin sonucu duvar saatine bağlı. Çözüm zamanı parametre yapmak, production now'ı verir, test istediği anı verir.",
      task: "`~/tws/t12/maint.py` içindeki in_maintenance_window'a `now: datetime | None = None` parametresi ekle, verilmezse datetime.now kullansın. `~/tws/t12/test_maint.py` içindeki flaky testi kaldır, parametrize ile 03.00 True, 01.59 False, 02.00 True, 04.00 False, 14.30 False durumlarını sabit datetime değerleriyle test et. `cd ~/tws/t12 && pytest -v`, `5 passed`.",
      hint: "`now or datetime.now()` deseni, parametre verildiyse onu kullanır. datetime nesnesi falsy olmaz, güvenli. Test içinde `datetime(2026, 10, 13, 3, 0)` gibi sabit anlar, sınırları ayrı ayrı test et, başlangıç dahil bitiş hariç. Alternatif, monkeypatch ile `maint.datetime` sınıfını sahtelemek, ama datetime C tipinde olduğu için now'ı tek başına patch edemezsin, tüm sınıfı sarmak gerekir, parametre enjeksiyonu daha temiz. time.sleep ile bekleyen testler de flaky, süreyi değil davranışı test et. Dokümantasyon datetime modülü, ve pytest How to monkeypatch, Monkeypatching returned objects.",
      solution: "nano ~/tws/t12/maint.py\nnano ~/tws/t12/test_maint.py\ncd ~/tws/t12 && pytest -v",
      setup: sh => { mtsFiles(sh, "/home/burak/tws/t12", {
        "maint.py": `"""Bakim penceresi kontrolu. Saat 02:00 ile 04:00 arasi bakim penceresi."""
from datetime import datetime, time

WINDOW_START = time(2, 0)
WINDOW_END = time(4, 0)


def in_maintenance_window() -> bool:
    """Suan bakim penceresinde miyiz."""
    now = datetime.now()
    return WINDOW_START <= now.time() < WINDOW_END
`,
        "test_maint.py": `"""Bu test flaky, gece 02 ile 04 arasi CI'da kirmizi. Zamani fonksiyona parametre olarak ver."""
from datetime import datetime

from maint import in_maintenance_window


def test_not_in_window() -> None:
    assert not in_maintenance_window()


# TODO in_maintenance_window(now: datetime | None = None) imzasina gecince
# TODO test_inside_window 2026-10-13 03:00 True, test_before_window 01:59 False
# TODO test_boundaries 02:00 True, 04:00 False
`,
      }); },
      editorContent: {
        "~/tws/t12/maint.py": `"""Bakim penceresi kontrolu. Saat 02:00 ile 04:00 arasi bakim penceresi."""
from datetime import datetime, time

WINDOW_START = time(2, 0)
WINDOW_END = time(4, 0)


def in_maintenance_window(now: datetime | None = None) -> bool:
    """Verilen an bakim penceresinde mi. now verilmezse su an, test'te hep verilir."""
    current = now or datetime.now()
    return WINDOW_START <= current.time() < WINDOW_END
`,
        "~/tws/t12/test_maint.py": `"""Zaman artik parametre, test deterministik. datetime.now sadece production yolunda cagrilir."""
from datetime import datetime

import pytest
from maint import in_maintenance_window


@pytest.mark.parametrize(
    "moment, expected",
    [
        (datetime(2026, 10, 13, 3, 0), True),
        (datetime(2026, 10, 13, 1, 59), False),
        (datetime(2026, 10, 13, 2, 0), True),
        (datetime(2026, 10, 13, 4, 0), False),
        (datetime(2026, 10, 13, 14, 30), False),
    ],
    ids=["inside", "before", "start-inclusive", "end-exclusive", "afternoon"],
)
def test_window(moment: datetime, expected: bool) -> None:
    assert in_maintenance_window(moment) is expected
`,
      },
      check: (sh, c) => mtsPassed(sh, '/home/burak/tws/t12', 5) && mtsFile(sh, '/home/burak/tws/t12/maint.py', 'now: datetime | None = None') && mtsFile(sh, '/home/burak/tws/t12/test_maint.py', 'datetime(2026') && !mtsFile(sh, '/home/burak/tws/t12/test_maint.py', 'in_maintenance_window()') },
  ],
});

QUIZ.push(
  { q: "pytest hangi fonksiyonları test olarak toplar?", a: ["test_ ile başlayan dosyalardaki test_ ile başlayan fonksiyonları","Her .py dosyasındaki her fonksiyonu","Sadece unittest.TestCase sınıflarını","main fonksiyonunu"], c: 0 },
  { q: "`assert x == 2, \"mesaj\"` ile `assert(x == 2, \"mesaj\")` arasındaki fark?", a: ["İkincisi tuple olduğu için hep True, test hiç fail olmaz","Fark yok","İkincisi daha hızlı","İlki syntax hatası"], c: 0 },
  { q: "parametrize ile 4 değer verilen bir test raporda kaç test sayılır?", a: ["4","1","2","5"], c: 0 },
  { q: "scope=\"module\" fixture ne zaman kurulur?", a: ["Dosya başına bir kere","Her test için","Koşu başına bir kere","Hiç"], c: 0 },
  { q: "conftest.py içindeki fixture testlerde nasıl kullanılır?", a: ["Import etmeden, parametre adıyla","from conftest import ile","pytest.use ile","Kullanılamaz"], c: 0 },
  { q: "pyproject.toml içinde `pythonpath = [\"src\"]` ne yapar?", a: ["src dizinini sys.path'e ekler","Testleri src altında arar","src'yi paket olarak kurar","Hiçbir şey"], c: 0 },
  { q: "tmp_path fixture ne verir?", a: ["Her teste özel geçici bir pathlib.Path dizini","Sabit /tmp dizini","Bir string","Bellekteki sahte dosya sistemi"], c: 0 },
  { q: "patch hedefi hangi isim olmalı?", a: ["Fonksiyonun kullanıldığı modüldeki isim","Fonksiyonun tanımlandığı modüldeki isim","Fonksiyonun kendisi","Herhangi biri çalışır"], c: 0 },
  { q: "pytest.raises bloğunda beklenen hata atılmazsa?", a: ["Test fail olur","Test geçer","Test skip olur","Uyarı basılır"], c: 0 },
  { q: "`pytest -m \"not slow\"` ne yapar?", a: ["slow marker'lı testleri deselect eder","Sadece slow testleri koşar","Yavaş testleri hızlandırır","Marker'ları listeler"], c: 0 },
  { q: "`xfail(strict=True)` testi beklenmedik şekilde geçerse?", a: ["Fail sayılır","XPASS olarak geçer","Skip olur","Tekrar koşulur"], c: 0 },
  { q: "datetime.now kullanan bir testi deterministik yapmanın temiz yolu?", a: ["Zamanı fonksiyona parametre olarak vermek","time.sleep ile beklemek","Testi geceleri koşmamak","assert yerine print kullanmak"], c: 0 },
);

BADGES.push({ id: 'tester', icon: '🧪', title: 'Test Mühendisi', desc: 'Unit ve Integration Test bölümünü bitir', test: st => CHAPTERS.find(c => c.id === 'test').missions.every(m => st.done.includes(m.id)) });
