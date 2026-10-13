'use strict';
/* Git Workflow bolumu. ~/netauto python network automation projesi uzerinde init'ten PR'a kadar gercek bir git akisi.
   Repo motoru ../linux-lab/ext-git.js, durum ~/netauto/.git/lab-state.json. Yardimcilar MG_ ve mg on ekli. */

const MG_ROOT = '/home/burak/netauto';
const MG_URL = 'https://github.com/burak/netauto.git';
const MG_FEAT = 'feature/inventory-yaml';

/* ---------- proje dosyalari ---------- */

const MG_SRC = {};
MG_SRC.readme = '# netauto\n\nIOS-XE cihazlar icin kucuk bir network automation paketi.\n\n- netauto/inventory.py, cihaz envanteri\n- netauto/parsers.py, show komutu parser\'lari\n- tests/, pytest ile birim testleri\n';
MG_SRC.readmeDocs = MG_SRC.readme + '\n## Parser kullanimi\n\n    from netauto.parsers import parse_bgp_summary\n    peers = parse_bgp_summary(device.cli("show ip bgp summary"))\n';
MG_SRC.requirements = 'netmiko==4.3.0\npyyaml==6.0.2\npytest==8.3.3\n';
MG_SRC.requirementsRich = MG_SRC.requirements + 'rich==13.7.1\n';
MG_SRC.init = '"""netauto, network automation helpers."""\n__version__ = "0.1.0"\n';
MG_SRC.env = 'DEVICE_USER=admin\nDEVICE_PASSWORD=sup3rsecret\n';
MG_SRC.venv = '# This file must be used with "source bin/activate"\nexport VIRTUAL_ENV=/home/burak/netauto/.venv\n';
MG_SRC.pyc = 'o\r\r\n\x00\x00\x00\x00 compiled bytecode, netauto/parsers.py\n';
MG_SRC.inventoryJson = '{\n  "devices": [\n    {"host": "r1", "ip": "10.0.0.1", "platform": "ios-xe"},\n    {"host": "r2", "ip": "10.0.0.2", "platform": "ios-xe"},\n    {"host": "sw1", "ip": "10.0.0.10", "platform": "nxos"}\n  ]\n}\n';
MG_SRC.inventoryYml = 'devices:\n  - host: r1\n    ip: 10.0.0.1\n    platform: ios-xe\n  - host: r2\n    ip: 10.0.0.2\n    platform: ios-xe\n  - host: sw1\n    ip: 10.0.0.10\n    platform: nxos\n';
MG_SRC.tests = 'from netauto.parsers import parse_show_version\n\n\nSHOW_VERSION = (\n    "Cisco IOS XE Software, Version 17.09.04a, RELEASE SOFTWARE\\n"\n    "r1 uptime is 3 weeks, 2 days, 4 hours\\n"\n    "Processor board ID FGL2301A0B1\\n"\n)\n\n\ndef test_version():\n    assert parse_show_version(SHOW_VERSION)["version"] == "17.09.04a"\n';
MG_SRC.runner = '"""Run a show command on every device in the inventory."""\nfrom netauto.inventory import load_inventory\n\n\ndef run(command):\n    results = {}\n    for device in load_inventory():\n        results[device["host"]] = command\n    return results\n';

/* parsers.py, ozelliklere gore derlenir. bgp yeni parser, fixed status sutunu duzeltmesi, serial ve uptime ayni yere eklenir, guard bos cikti korumasi */
function mgParsers(o) {
  o = o || {};
  const L = ['"""Parsers for IOS-XE show command output."""', 'import re', '', '', 'def parse_show_version(text):', '    """Parse \'show version\' output into a dict."""'];
  if (o.guard) L.push('    if not text:', '        return {}');
  L.push('    out = {}', '    m = re.search(r"Version (\\S+),", text)', '    if m:', '        out["version"] = m.group(1)');
  if (o.serial) L.push('    m = re.search(r"Processor board ID (\\S+)", text)', '    if m:', '        out["serial"] = m.group(1)');
  if (o.uptime) L.push('    m = re.search(r"uptime is (.+)", text)', '    if m:', '        out["uptime"] = m.group(1).strip()');
  L.push('    return out', '', '', 'def parse_ip_int_brief(text):', '    """Parse \'show ip interface brief\' into a list of dicts."""', '    rows = []', '    for line in text.splitlines()[1:]:', '        parts = line.split()', '        if len(parts) < 6:', '            continue', `        rows.append({"interface": parts[0], "ip": parts[1], "status": parts[${o.fixed ? 4 : 3}], "protocol": parts[5]})`, '    return rows');
  if (o.bgp) L.push('', '', 'def parse_bgp_summary(text):', '    """Parse \'show ip bgp summary\' neighbours into a list of dicts."""', '    peers = []', '    for line in text.splitlines():', '        m = re.match(r"(\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+4\\s+(\\d+)\\s+.*\\s(\\S+)$", line)', '        if m:', '            peers.append({"neighbor": m.group(1), "asn": int(m.group(2)), "state": m.group(3)})', '    return peers');
  return L.join('\n') + '\n';
}
function mgInventory(o) {
  o = o || {};
  const L = ['"""Inventory loading for netauto."""', o.yaml ? 'import yaml' : 'import json', 'from pathlib import Path', '', '', `def load_inventory(path="inventory.${o.yaml ? 'yml' : 'json'}"):`, `    """Load devices from a ${o.yaml ? 'YAML' : 'JSON'} inventory file."""`, o.yaml ? '    data = yaml.safe_load(Path(path).read_text())' : '    data = json.loads(Path(path).read_text())', '    return data["devices"]', '', '', 'def device_names(devices):', '    """Return the host names in inventory order."""', '    return [d["host"] for d in devices]'];
  if (o.filter) L.push('', '', 'def filter_by_platform(devices, platform):', '    """Keep only devices of the given platform, for example ios-xe."""', '    return [d for d in devices if d.get("platform") == platform]');
  return L.join('\n') + '\n';
}
const MG_IGNORE = '__pycache__/\n.venv/\n*.pyc\n.env\n';
const MG_ALL = {
  bgp: { bgp: true }, fixed: { bgp: true, fixed: true }, serial: { bgp: true, fixed: true, serial: true }, uptime: { bgp: true, fixed: true, uptime: true },
  both: { bgp: true, fixed: true, serial: true, uptime: true }, hot: { bgp: true, fixed: true, serial: true, uptime: true, guard: true },
};
/* root commit'teki dosyalar, .gitignore disinda hepsi setup'ta diske yazilir */
function mgRootFiles() {
  return { 'README.md': MG_SRC.readme, 'requirements.txt': MG_SRC.requirements, 'netauto/__init__.py': MG_SRC.init, 'netauto/parsers.py': mgParsers(), 'netauto/inventory.py': mgInventory(), 'inventory.json': MG_SRC.inventoryJson, 'tests/test_parsers.py': MG_SRC.tests };
}
function mgProject(sh) {
  const put = (rel, content) => { const abs = MG_ROOT + '/' + rel; const n = sh.node(abs); if (n && n.t === 'f') return; G_API.write(sh, abs, content); };
  if (!sh.node(MG_ROOT)) G_API.install(sh, MG_ROOT, mkdir({}, 0o755, 'burak'));
  const f = mgRootFiles(); Object.keys(f).forEach(k => put(k, f[k]));
  put('.env', MG_SRC.env); put('.venv/bin/activate', MG_SRC.venv); put('netauto/__pycache__/parsers.cpython-312.pyc', MG_SRC.pyc); put('netauto/parsers.pyc', MG_SRC.pyc);
}

/* ---------- durum okuma yardimcilari ---------- */

const mgState = sh => G_API.state(sh, MG_ROOT);
const mgFind = (st, h) => (st && h ? st.commits.find(c => c.hash === h) || null : null);
const mgHead = st => mgFind(st, st && st.head);
const mgTip = (st, b) => mgFind(st, st && st.branches[b]);
const mgParents = c => (c ? c.parents || (c.parent ? [c.parent] : []) : []);
const mgAnc = (st, h) => { const seen = new Set(); const stack = [h]; while (stack.length) { const x = stack.pop(); if (!x || seen.has(x)) continue; seen.add(x); mgParents(mgFind(st, x)).forEach(p => stack.push(p)); } return seen; };
const mgChain = (st, h) => { const out = []; let c = mgFind(st, h); while (c) { out.push(c); c = mgFind(st, c.parent); } return out; };
const mgRoot = st => (st ? st.commits.find(c => !c.parent) || null : null);
const mgWt = (sh, rel) => { const n = sh.node(MG_ROOT + '/' + rel); return n && n.t === 'f' ? n.d : ''; };
const mgRan = (ctx, re) => re.test(ctx.line);
const mgDid = (sh, re) => sh.history.some(l => re.test(l.trim()));
const mgMarkers = t => /^(<{7}|={7}|>{7})/m.test(t || '');
const mgFeatBranch = st => (st ? Object.keys(st.branches).find(b => b.startsWith('feature/') && b !== 'feature/show-version' && b !== MG_FEAT) || null : null);
function mgIdentity(sh) {
  const n = sh.node('/home/burak/.gitconfig'); const g = n && n.t === 'f' ? n.d : '';
  const st = mgState(sh);
  const name = /^\s*name\s*=\s*\S/m.test(g) || (st && st.config && st.config['user.name']);
  const email = /^\s*email\s*=\s*\S+@\S+/m.test(g) || (st && st.config && st.config['user.email']);
  return !!(name && email);
}
/* setup'ta branch degistirmek icin kucuk checkout, working tree'yi hedef snapshot'a esitler */
function mgCheckout(sh, st, branch) {
  const cur = mgHead(st); const c = mgTip(st, branch); if (!c) return;
  Object.keys(cur ? cur.files : {}).forEach(f => { if (c.files[f] === undefined) { const p = sh.parent(MG_ROOT + '/' + f); if (p.dir && p.dir.c[p.name]) delete p.dir.c[p.name]; } });
  Object.keys(c.files).forEach(f => G_API.write(sh, MG_ROOT + '/' + f, c.files[f]));
  st.branch = branch; st.head = c.hash; st.index = Object.assign({}, c.files);
}
function mgEnsureConfig(sh) {
  if (mgIdentity(sh)) return;
  const abs = '/home/burak/.gitconfig'; const n = sh.node(abs);
  const txt = '[user]\n\tname = Burak Dartar\n\temail = burak@netlab.local\n';
  G_API.write(sh, abs, txt);
}

/* Gorev N bitmis gibi repo kur. Kullanici bolume ortadan girerse setup bunu cagirir */
function mgBuild(sh, level) {
  const home = sh.node('/home/burak'); if (home && home.c.netauto) delete home.c.netauto;
  mgProject(sh);
  if (level < 1) return;
  mgEnsureConfig(sh);
  const st = G_API.createRepo(sh, MG_ROOT, [], null, { keepFiles: true });
  const add = c => G_API.addCommit(sh, MG_ROOT, c, st);
  const d = i => new Date(Date.parse('2026-10-06T09:00:00+02:00') + i * 4 * 3600e3 + 2 * 3600e3).toISOString().slice(0, 19) + '+02:00';
  let i = 0;
  const done = () => G_API.save(sh, MG_ROOT, st);
  if (level < 2) return done();
  const rootFiles = Object.assign({ '.gitignore': MG_IGNORE }, mgRootFiles());
  add({ msg: 'chore: initial project layout', files: rootFiles, author: 'burak', date: d(i++) });
  if (level < 3) return done();
  st.branches['feature/bgp-parser'] = st.head; st.branch = 'feature/bgp-parser';
  add({ msg: 'feat: add parse_bgp_summary for show ip bgp summary', files: { 'netauto/parsers.py': mgParsers(MG_ALL.bgp) }, author: 'burak', date: d(i++) });
  add({ msg: 'fix: read status column in parse_ip_int_brief', files: { 'netauto/parsers.py': mgParsers(MG_ALL.fixed) }, author: 'burak', date: d(i++) });
  add({ msg: 'chore: add rich to requirements', files: { 'requirements.txt': MG_SRC.requirementsRich }, author: 'burak', date: d(i++) });
  if (level < 4) return done();
  add({ msg: 'docs: describe parser usage in README', files: { 'README.md': MG_SRC.readmeDocs }, author: 'burak', date: d(i++) });
  if (level < 5) return done();
  st.branches.main = st.head; mgCheckout(sh, st, 'main');
  if (level < 6) return done();
  add({ branch: 'feature/show-version', from: 'main', msg: 'feat: parse uptime in parse_show_version', files: { 'netauto/parsers.py': mgParsers(MG_ALL.uptime) }, author: 'ayse', date: d(i++) });
  add({ branch: 'main', msg: 'feat: parse serial number in parse_show_version', files: { 'netauto/parsers.py': mgParsers(MG_ALL.serial) }, author: 'burak', date: d(i++) });
  add({ branch: 'main', merge: 'feature/show-version', msg: "Merge branch 'feature/show-version'", files: { 'netauto/parsers.py': mgParsers(MG_ALL.both) }, author: 'burak', date: d(i++) });
  if (level < 7) return done();
  const invFiles = { 'netauto/inventory.py': mgInventory({ yaml: true }), 'inventory.yml': MG_SRC.inventoryYml, 'inventory.json': null };
  const invFiles2 = { 'netauto/inventory.py': mgInventory({ yaml: true, filter: true }), 'inventory.yml': MG_SRC.inventoryYml, 'inventory.json': null };
  if (level < 8) {
    add({ branch: MG_FEAT, from: 'main', msg: 'feat: load inventory from yaml', files: invFiles, author: 'mehmet', date: d(i++) });
    add({ branch: MG_FEAT, msg: 'feat: filter devices by platform', files: { 'netauto/inventory.py': mgInventory({ yaml: true, filter: true }) }, author: 'mehmet', date: d(i++) });
    mgCheckout(sh, st, MG_FEAT); return done();
  }
  add({ branch: MG_FEAT, from: 'main', msg: 'feat: load inventory from yaml with platform filter', files: invFiles2, author: 'burak', date: d(i++) });
  mgCheckout(sh, st, MG_FEAT);
  if (level < 9) return done();
  add({ branch: 'main', msg: 'fix: return empty dict for empty show version output', files: { 'netauto/parsers.py': mgParsers(MG_ALL.hot) }, author: 'burak', date: d(i++) });
  add({ branch: 'release/1.0', from: mgRoot(st).hash, msg: 'fix: return empty dict for empty show version output', files: { 'netauto/parsers.py': mgParsers({ guard: true }) }, author: 'burak', date: d(i++) });
  mgCheckout(sh, st, 'release/1.0');
  if (level < 10) return done();
  st.tags['v1.0.0'] = st.branches['release/1.0']; st.tagObjs['v1.0.0'] = { msg: 'First stable release', tagger: 'Burak Dartar', email: 'burak@netlab.local', date: d(i) };
  st.tags['v1.1.0'] = st.branches.main; st.tagObjs['v1.1.0'] = { msg: 'Serial, uptime and BGP parsers', tagger: 'Burak Dartar', email: 'burak@netlab.local', date: d(i++) };
  mgCheckout(sh, st, 'main');
  if (level < 11) return done();
  const refs = { main: st.branches.main }; refs[MG_FEAT] = st.branches[MG_FEAT];
  st.remotes = { origin: { url: MG_URL, refs, tags: Object.assign({}, st.tags) } };
  st.remote = Object.assign({}, refs); st.upstream = { main: 'origin/main' }; st.upstream[MG_FEAT] = 'origin/' + MG_FEAT;
  if (level < 12) return done();
  add({ branch: 'main', msg: 'docs: add review checklist', files: { 'README.md': MG_SRC.readmeDocs + '\n- Merge oncesi pytest calistir\n' }, author: 'burak', date: d(i++) });
  st.remotes.origin.refs.main = st.branches.main; st.remote.main = st.branches.main;
  st.branches[MG_FEAT] = st.branches.main;
  add({ branch: MG_FEAT, msg: 'feat: load inventory from yaml with platform filter', files: invFiles2, author: 'burak', date: d(i++) });
  st.remotes.origin.refs[MG_FEAT] = st.branches[MG_FEAT]; st.remote[MG_FEAT] = st.branches[MG_FEAT];
  mgCheckout(sh, st, MG_FEAT);
  if (level < 13) return done();
  mgCheckout(sh, st, 'main');
  add({ branch: 'main', msg: 'feat: add runner skeleton', files: { 'netauto/runner.py': MG_SRC.runner }, author: 'burak', date: d(i++) });
  if (level < 14) return done();
  add({ branch: 'main', merge: MG_FEAT, msg: `Merge branch '${MG_FEAT}'`, files: invFiles2, author: 'burak', date: d(i++) });
  return done();
}
/* kademeli setup, gereken sey yoksa o seviyeye kadar kur */
function mgNeed(sh, level, test) { const st = mgState(sh); if (!st || !test(st)) mgBuild(sh, level); }

/* ---------- gorevler ---------- */

CHAPTERS.push({
  id: 'git', icon: '🌿', title: 'Git Workflow', sub: "netauto projesinde init'ten pull request'e",
  missions: [
    { id: 'mg1', title: 'Repo doğuyor', xp: 15,
      story: "~/netauto altında küçük bir python network automation paketi var, parser'lar, inventory, testler. Şu ana kadar hiç version control görmemiş, her değişiklik bir öncekini eziyor. İlk iş git init ile projeyi repo yapmak. Git her commit'e bir yazar yazar, o yüzden user.name ve user.email ayarı şart. --global ile ~/.gitconfig dosyasına yazılır ve bu makinedeki bütün repo'lar için geçerli olur.",
      task: 'netauto dizinine gir, repo başlat, --global ile user.name ve user.email ayarla.', hint: 'cd ~/netauto sonra git init. Kimlik için `git config --global user.name "Burak Dartar"` ve `git config --global user.email burak@netlab.local`. cat ~/.gitconfig ile doğrula',
      solution: 'cd ~/netauto\ngit init\ngit config --global user.name "Burak Dartar"\ngit config --global user.email burak@netlab.local\ngit status',
      setup: sh => { if (!sh.node(MG_ROOT)) mgBuild(sh, 0); else mgProject(sh); },
      check: sh => { const st = mgState(sh); return !!st && st.branch === 'main' && mgIdentity(sh); } },
    { id: 'mg2', title: 'İlk commit ve .gitignore', xp: 25,
      story: "git status üç şey gösteriyor ki repo'ya hiç girmemeli. .env içinde cihaz şifresi var, .venv yüzlerce megabyte kütüphane, __pycache__ ve .pyc dosyaları python'un ürettiği çöp. .gitignore dosyası bu pattern'leri listeler, git onları hiç görmez. Dizin pattern'i sonunda slash ile yazılır, uzantı pattern'i yıldız ile. Sonra git add . ile kalan her şeyi stage et ve ilk commit'i at. Commit mesajı conventional commits formatında olsun, chore prefix'i kod değişikliği olmayan işler için.",
      task: '.gitignore yaz, __pycache__ .venv *.pyc ve .env dışarıda kalsın, sonra her şeyi stage edip ilk commit\'i at.', hint: 'nano .gitignore içine dört satır `__pycache__/` `.venv/` `*.pyc` `.env`. Sonra git add . ve `git commit -m "chore: initial project layout"`. git status ile .env görünmemeli',
      solution: 'cd ~/netauto\nnano .gitignore\ngit status\ngit add .\ngit commit -m "chore: initial project layout"\ngit log --oneline',
      editorContent: { '.gitignore': MG_IGNORE },
      setup: sh => { mgNeed(sh, 1, st => !!st); mgProject(sh); },
      check: sh => {
        const st = mgState(sh); const h = mgHead(st); if (!st || !h || h.parent) return false;
        const f = Object.keys(h.files);
        const ig = h.files['.gitignore'] || '';
        return ['__pycache__', '.venv', '*.pyc', '.env'].every(p => ig.includes(p)) && f.includes('netauto/parsers.py') && f.includes('README.md') && !f.some(x => /\.pyc$|^\.env$|^\.venv\//.test(x)) && /^chore/.test(h.message);
      } },
    { id: 'mg3', title: 'Feature branch ve conventional commits', xp: 35,
      story: "BGP summary çıktısını parse edecek yeni bir fonksiyon gerek. Yeni iş doğrudan main'e yazılmaz, bir feature branch açılır. git switch -c hem branch'i oluşturur hem geçer. Branch'te üç commit yapacaksın. feat yeni özellik, fix hata düzeltmesi, chore bakım işi. Bu prefix'ler changelog üretmeyi ve review'u kolaylaştırır. parse_ip_int_brief içinde bir bug da var, status sütunu parts[3] yerine parts[4] olmalı, onu fix commit'i ile düzelt. requirements.txt'e rich ekle, o da chore.",
      task: 'feature/bgp-parser branch\'i aç, parse_bgp_summary fonksiyonunu ekleyip feat, bug\'ı fix, requirements\'ı chore mesajıyla üç ayrı commit yap.', hint: 'git switch -c feature/bgp-parser. nano netauto/parsers.py ile fonksiyonu ekle, `git commit -am "feat: add parse_bgp_summary"`. Bug için `sed -i \'s/"status": parts\\[3\\]/"status": parts[4]/\' netauto/parsers.py` ve fix commit. `echo "rich==13.7.1" >> requirements.txt` ve chore commit',
      solution: 'cd ~/netauto\ngit switch -c feature/bgp-parser\nnano netauto/parsers.py\ngit commit -am "feat: add parse_bgp_summary for show ip bgp summary"\nsed -i \'s/"status": parts\\[3\\]/"status": parts[4]/\' netauto/parsers.py\ngit diff\ngit commit -am "fix: read status column in parse_ip_int_brief"\necho "rich==13.7.1" >> requirements.txt\ngit commit -am "chore: add rich to requirements"\ngit log --oneline',
      editorContent: { 'netauto/parsers.py': mgParsers(MG_ALL.bgp) },
      setup: sh => mgNeed(sh, 2, st => !!st.head),
      check: sh => {
        const st = mgState(sh); const h = mgHead(st); if (!st || !h || !st.branch || !st.branch.startsWith('feature/')) return false;
        const msgs = mgChain(st, st.head).map(c => c.message);
        const p = h.files['netauto/parsers.py'] || '';
        return msgs.some(m => /^feat(\(.+\))?:/.test(m)) && msgs.some(m => /^fix(\(.+\))?:/.test(m)) && msgs.some(m => /^chore(\(.+\))?:/.test(m)) && p.includes('def parse_bgp_summary') && p.includes('"status": parts[4]') && (h.files['requirements.txt'] || '').includes('rich');
      } },
    { id: 'mg4', title: 'Geçmiş ve fark', xp: 25,
      story: "Commit atmadan önce ne değiştirdiğini görmek refleks olmalı. git diff working tree ile index arasındaki farkı gösterir, yani henüz stage edilmemiş değişiklikler. git add sonrası git diff boş döner, çünkü değişiklik artık index'te. O zaman git diff --staged ile index ile HEAD arasını görürsün, commit'e tam olarak ne girecek. Geçmiş için git log --oneline --graph --all her branch'i tek satır ve ASCII graph ile çizer. README'ye parser kullanım notu ekle ve docs prefix'i ile commit et.",
      task: 'README.md\'ye kullanım notu ekle, git diff ve git diff --staged ile farkı iki aşamada gör, docs commit\'i at, sonra git log --oneline --graph --all ile geçmişe bak.', hint: 'nano README.md ile not ekle. git diff, git add README.md, git diff --staged, `git commit -m "docs: describe parser usage in README"`, en son git log --oneline --graph --all',
      solution: 'cd ~/netauto\nnano README.md\ngit diff\ngit add README.md\ngit diff --staged\ngit commit -m "docs: describe parser usage in README"\ngit log --oneline --graph --all',
      editorContent: { 'README.md': MG_SRC.readmeDocs },
      setup: sh => mgNeed(sh, 3, st => !!mgFeatBranch(st)),
      check: (sh, c) => { const st = mgState(sh); const h = mgHead(st); return !!h && mgRan(c, /^git log\b.*--graph/) && c.out.includes('*') && mgDid(sh, /^git diff (--staged|--cached)\b/) && /^docs(\(.+\))?:/.test(h.message); } },
    { id: 'mg5', title: 'Fast forward merge', xp: 20,
      story: "Feature bitti, main'e alınacak. main'e geç ve git merge feature/bgp-parser de. main branch'in feature açıldığından beri hiç commit almadı, yani feature main'in düz devamı. Git böyle durumda merge commit üretmez, main pointer'ını feature'ın ucuna taşır, buna fast-forward denir. Çıktıda Fast-forward yazısını ve değişen dosyaların özetini görürsün. Merge sonrası iki branch aynı commit'i gösterir, feature artık silinebilir.",
      task: 'main\'e geç ve feature branch\'ini fast-forward ile merge et.', hint: 'git switch main sonra git merge feature/bgp-parser. git log --oneline --graph --all ile iki branch\'in aynı commit\'te olduğunu gör',
      solution: 'cd ~/netauto\ngit switch main\ngit merge feature/bgp-parser\ngit log --oneline --graph --all',
      setup: sh => mgNeed(sh, 4, st => !!mgFeatBranch(st)),
      check: (sh, c) => { const st = mgState(sh); const f = mgFeatBranch(st); return !!st && !!f && st.branch === 'main' && st.branches.main === st.branches[f] && mgDid(sh, /^git merge\b/) && mgRan(c, /^git (merge|log)\b/); } },
    { id: 'mg6', title: 'Conflict çözümü', xp: 45,
      story: "Ayşe feature/show-version branch'inde parse_show_version'a uptime parse'ı ekledi. Sen aynı sabah aynı fonksiyonun aynı yerine serial number parse'ı yazdın, henüz commit etmedin. Önce kendi değişikliğini main'e commit et, sonra Ayşe'nin branch'ini merge et. Git iki tarafın aynı satırlara dokunduğunu görünce otomatik birleştiremez ve CONFLICT der. Dosyaya <<<<<<< HEAD, ======= ve >>>>>>> işaretleri koyar. Üst blok senin halin, alt blok Ayşe'nin. Doğru çözüm iki parse bloğunu da tutmak, işaret satırlarını silmek. Sonra git add ile çözüldü diye işaretle, git commit merge'ü tamamlar.",
      task: 'Serial değişikliğini commit et, feature/show-version\'ı merge et, conflict\'i nano ile çöz, iki parse da kalsın, marker kalmasın, add ve commit ile bitir.', hint: 'git switch main, `git commit -am "feat: parse serial number in parse_show_version"`, git merge feature/show-version, git status, nano netauto/parsers.py ile işaretleri temizle ve iki bloğu da bırak, git add netauto/parsers.py, git commit',
      solution: 'cd ~/netauto\ngit switch main\ngit status\ngit commit -am "feat: parse serial number in parse_show_version"\ngit merge feature/show-version\ngit status\nnano netauto/parsers.py\ngit add netauto/parsers.py\ngit commit\ngit log --oneline --graph --all',
      editorContent: { 'netauto/parsers.py': mgParsers(MG_ALL.both) },
      setup: sh => {
        mgNeed(sh, 5, st => !!st.head && st.branches.main !== undefined);
        const st = mgState(sh); if (!st) return;
        const main = mgTip(st, 'main'); if (!main) return;
        if (!st.branches['feature/show-version']) {
          const p = (main.files['netauto/parsers.py'] || mgParsers(MG_ALL.fixed)).replace('    return out\n', '    m = re.search(r"uptime is (.+)", text)\n    if m:\n        out["uptime"] = m.group(1).strip()\n    return out\n');
          G_API.addCommit(sh, MG_ROOT, { branch: 'feature/show-version', from: 'main', msg: 'feat: parse uptime in parse_show_version', files: { 'netauto/parsers.py': p }, author: 'ayse' });
        }
        const wt = mgWt(sh, 'netauto/parsers.py');
        if (!wt.includes('serial') && !(main.files['netauto/parsers.py'] || '').includes('serial')) {
          const p = (main.files['netauto/parsers.py'] || mgParsers(MG_ALL.fixed)).replace('    return out\n', '    m = re.search(r"Processor board ID (\\S+)", text)\n    if m:\n        out["serial"] = m.group(1)\n    return out\n');
          G_API.write(sh, MG_ROOT + '/netauto/parsers.py', p);
        }
      },
      check: sh => {
        const st = mgState(sh); const h = mgHead(st); if (!st || !h || st.merge || st.branch !== 'main') return false;
        const p = h.files['netauto/parsers.py'] || '';
        return mgParents(h).length === 2 && !mgMarkers(p) && !mgMarkers(mgWt(sh, 'netauto/parsers.py')) && p.includes('out["serial"]') && p.includes('out["uptime"]');
      } },
    { id: 'mg7', title: 'Rebase', xp: 40,
      story: "Mehmet'in feature/inventory-yaml branch'i haftalar önce ilk commit'ten açılmış, iki commit'i var ve main o sırada çok ilerledi. Merge edersen graph'ta kocaman bir çatal görünür. Alternatif rebase. git rebase main branch'teki commit'leri alır, main'in ucuna sırayla yeniden uygular. Sonuç düz bir çizgi. Dikkat, yeniden uygulanan commit'ler yeni hash alır, çünkü parent'ları değişti. Hash içerik artı parent'tan hesaplanır. Rebase öncesi ve sonrası git log --oneline ile hash'leri karşılaştır. Bu yüzden başkasıyla paylaşılmış bir branch'i rebase etmek tehlikelidir.",
      task: 'feature/inventory-yaml branch\'ine geç, rebase öncesi hash\'leri not al, main üzerine rebase et, yeni hash\'leri ve düz graph\'ı gör.', hint: 'git switch feature/inventory-yaml, git log --oneline -3, git rebase main, tekrar git log --oneline --graph --all. Hash\'ler değişti ama mesajlar aynı',
      solution: 'cd ~/netauto\ngit switch feature/inventory-yaml\ngit log --oneline --graph --all\ngit rebase main\ngit log --oneline --graph --all',
      setup: sh => {
        mgNeed(sh, 6, st => !!st.head && st.branches.main !== undefined);
        const st = mgState(sh); if (!st || st.branches[MG_FEAT]) return;
        const root = mgRoot(st); if (!root) return;
        G_API.addCommit(sh, MG_ROOT, { branch: MG_FEAT, from: root.hash, msg: 'feat: load inventory from yaml', files: { 'netauto/inventory.py': mgInventory({ yaml: true }), 'inventory.yml': MG_SRC.inventoryYml, 'inventory.json': null }, author: 'mehmet' });
        G_API.addCommit(sh, MG_ROOT, { branch: MG_FEAT, msg: 'feat: filter devices by platform', files: { 'netauto/inventory.py': mgInventory({ yaml: true, filter: true }) }, author: 'mehmet' });
      },
      check: sh => {
        const st = mgState(sh); const h = mgHead(st); if (!st || !h || st.rebase || st.branch !== MG_FEAT) return false;
        const main = st.branches.main; const chain = mgChain(st, st.head);
        const above = chain.findIndex(c => c.hash === main);
        return above >= 1 && mgAnc(st, st.head).has(main) && (h.files['inventory.yml'] || '').includes('devices') && (mgDid(sh, /^git rebase\b/) || st.reflog.some(e => /rebase \(finish\)/.test(e.msg)));
      } },
    { id: 'mg8', title: 'Interactive rebase ve squash', xp: 35,
      story: "Review'a iki küçük commit yerine tek anlamlı commit göndermek istiyorsun. Gerçek git'te git rebase -i main bir editor açar, her commit için pick satırı listeler, ikinci satırı squash yaparsan ikisi tek commit olur. Bu lab'da editor açılmaz, komut sana todo listesini ve ne yapacağını anlatır. Aynı sonucu elle almanın yolu git reset --soft main. HEAD main'e döner ama index ve working tree olduğu gibi kalır, iki commit'in bütün değişikliği stage edilmiş halde bekler. Tek bir git commit ile hepsi tek commit olur.",
      task: 'git rebase -i main ile açıklamayı oku, sonra reset --soft main ve tek bir feat commit\'i ile iki commit\'i squash et.', hint: 'git rebase -i main, git reset --soft main, git status ile stage edilmiş değişiklikleri gör, `git commit -m "feat: load inventory from yaml with platform filter"`, git log --oneline -3',
      solution: 'cd ~/netauto\ngit rebase -i main\ngit reset --soft main\ngit status\ngit commit -m "feat: load inventory from yaml with platform filter"\ngit log --oneline -3',
      setup: sh => mgNeed(sh, 7, st => !!st.branches[MG_FEAT]),
      check: sh => {
        const st = mgState(sh); const h = mgHead(st); if (!st || !h || st.branch !== MG_FEAT) return false;
        const inv = h.files['netauto/inventory.py'] || '';
        return h.parent === st.branches.main && /^feat(\(.+\))?:/.test(h.message) && inv.includes('yaml') && inv.includes('filter_by_platform') && mgDid(sh, /^git rebase (-i|--interactive)\b/);
      } },
    { id: 'mg9', title: 'Cherry-pick ile hotfix', xp: 35,
      story: "Üretimde release/1.0 branch'i koşuyor, ilk commit'ten açılmış eski bir sürüm. Bir müşteri cihazı boş show version çıktısı döndürünce parse_show_version patlıyor. Düzeltmeyi main'e yapacaksın, ama release'e main'in tamamını merge edemezsin, orada test edilmemiş yeni parser'lar var. git cherry-pick tek bir commit'in değişikliğini alır ve bulunduğun branch'e yeni commit olarak uygular. Hash verebilirsin ya da main yazarsan main'in son commit'ini alır. Aynı değişiklik iki branch'te iki farklı hash ile yaşar.",
      task: 'main\'de parse_show_version\'a boş metin koruması ekleyip fix commit\'i at, release/1.0\'a geç ve o commit\'i cherry-pick ile al.', hint: 'git switch main, nano netauto/parsers.py ile fonksiyon başına `if not text:` ve `return {}` ekle, `git commit -am "fix: return empty dict for empty show version output"`, git switch release/1.0, git cherry-pick main, git log --oneline -2',
      solution: 'cd ~/netauto\ngit switch main\nnano netauto/parsers.py\ngit commit -am "fix: return empty dict for empty show version output"\ngit switch release/1.0\ngit cherry-pick main\ngit log --oneline -2',
      editorContent: { 'netauto/parsers.py': mgParsers(MG_ALL.hot) },
      setup: sh => {
        mgNeed(sh, 8, st => !!st.branches[MG_FEAT] && st.branches.main !== undefined);
        const st = mgState(sh); if (!st || st.branches['release/1.0']) return;
        const root = mgRoot(st); if (!root) return;
        st.branches['release/1.0'] = root.hash; G_API.save(sh, MG_ROOT, st);
      },
      check: sh => {
        const st = mgState(sh); const h = mgHead(st); if (!st || !h || st.cherry || st.branch !== 'release/1.0') return false;
        const main = mgTip(st, 'main'); const p = h.files['netauto/parsers.py'] || '';
        return /^fix(\(.+\))?:/.test(h.message) && p.includes('if not text') && !!main && main.message === h.message && main.hash !== h.hash && !(main.files['netauto/parsers.py'] || '').includes('<<<<');
      } },
    { id: 'mg10', title: 'Tag ve semantic versioning', xp: 25,
      story: "Sürümler branch'le değil tag ile işaretlenir. Semantic versioning MAJOR.MINOR.PATCH der, uyumsuz değişiklik major'ı, yeni özellik minor'ı, hata düzeltmesi patch'i artırır. release/1.0 ucu v1.0.0, main'deki yeni parser'lar v1.1.0. Annotated tag için -a ve -m gerekir, tag'in kendi yazarı, tarihi ve mesajı olur, release notu gibi. git show v1.1.0 önce tag'i sonra commit'i gösterir. git describe --tags HEAD'in en yakın tag'e uzaklığını söyler, tam tag üstündeysen sadece tag adını yazar.",
      task: 'main\'e geç, release/1.0 ucunu v1.0.0, main ucunu v1.1.0 olarak annotated tag\'le, tag\'leri listele ve git describe --tags çalıştır.', hint: 'git switch main, `git tag -a v1.0.0 -m "First stable release" release/1.0`, `git tag -a v1.1.0 -m "Serial, uptime and BGP parsers"`, git tag -l, git show v1.1.0, git describe --tags',
      solution: 'cd ~/netauto\ngit switch main\ngit tag -a v1.0.0 -m "First stable release" release/1.0\ngit tag -a v1.1.0 -m "Serial, uptime and BGP parsers"\ngit tag -l\ngit show v1.1.0\ngit describe --tags',
      setup: sh => mgNeed(sh, 9, st => !!st.branches['release/1.0']),
      check: (sh, c) => {
        const st = mgState(sh); if (!st) return false;
        const ok2 = st.tagObjs && st.tagObjs['v1.0.0'] && st.tagObjs['v1.1.0'] && st.tags['v1.1.0'] === st.branches.main && st.tags['v1.0.0'] === st.branches['release/1.0'];
        return !!ok2 && mgRan(c, /^git describe\b/) && /^v1\.[01]\.0/.test(c.out.trim());
      } },
    { id: 'mg11', title: 'Remote ve push', xp: 30,
      story: "Repo hâlâ sadece senin diskinde. git remote add origin url ile uzak repo'yu tanımlarsın, origin sadece bir takma ad. git push -u origin main main'i gönderir ve upstream ilişkisini kurar, sonraki push ve pull'larda branch adı yazman gerekmez. Tag'ler push ile otomatik gitmez, git push --tags ayrıca gerekir. Push sonrası origin/main diye bir remote tracking branch oluşur, git log origin/main ile remote'un bildiği son commit'i görürsün. Bu lab'daki remote sahte ama davranışı gerçek.",
      task: 'origin remote\'unu ekle, main ve feature/inventory-yaml branch\'lerini -u ile push et, tag\'leri push et.', hint: '`git remote add origin https://github.com/burak/netauto.git`, git remote -v, git push -u origin main, git push -u origin feature/inventory-yaml, git push --tags, git log --oneline origin/main -1',
      solution: 'cd ~/netauto\ngit remote add origin https://github.com/burak/netauto.git\ngit remote -v\ngit push -u origin main\ngit push -u origin feature/inventory-yaml\ngit push --tags\ngit log --oneline -1 origin/main',
      setup: sh => mgNeed(sh, 10, st => !!(st.tagObjs && st.tagObjs['v1.1.0'])),
      check: sh => {
        const st = mgState(sh); if (!st || !st.remotes.origin) return false;
        const r = st.remotes.origin;
        return r.refs && r.refs.main === st.branches.main && r.refs[MG_FEAT] === st.branches[MG_FEAT] && !!(r.tags && r.tags['v1.0.0'] && r.tags['v1.1.0']) && st.upstream.main === 'origin/main';
      } },
    { id: 'mg12', title: 'Clone, pull ve force-with-lease', xp: 45,
      story: "Takım arkadaşı gibi davran. Remote'u ~/netauto-review olarak clone et, README'ye review notu ekle, commit'le ve push'la. Sonra ~/netauto'ya dön, git pull ile o commit'i çek, fast-forward gelir. Şimdi feature/inventory-yaml'ı main üzerine yeniden rebase et. Branch daha önce push edilmişti, rebase hash'leri değiştirdi, düz git push rejected döner çünkü remote'taki geçmiş seninkinin devamı değil. git push --force-with-lease remote'u ezer ama sadece remote hâlâ senin son gördüğün commit'teyse, arada başkası push ettiyse reddeder. Çıplak --force bunu kontrol etmez, o yüzden tercih edilmez.",
      task: 'Remote\'u netauto-review olarak clone et, orada bir docs commit\'i push et, netauto\'da pull al, feature branch\'ini rebase edip --force-with-lease ile push et.', hint: 'cd ~ ve `git clone https://github.com/burak/netauto.git netauto-review`, cd netauto-review, README\'ye echo ile satır ekle, `git commit -am "docs: add review checklist"`, git push. cd ~/netauto, git pull, git switch feature/inventory-yaml, git rebase main, git push rejected der, git push --force-with-lease',
      solution: 'cd ~\ngit clone https://github.com/burak/netauto.git netauto-review\ncd netauto-review\necho "- Merge oncesi pytest calistir" >> README.md\ngit commit -am "docs: add review checklist"\ngit push\ncd ~/netauto\ngit pull\ngit switch feature/inventory-yaml\ngit rebase main\ngit push\ngit push --force-with-lease',
      setup: sh => { mgNeed(sh, 11, st => !!st.remotes.origin); const home = sh.node('/home/burak'); if (home && home.c['netauto-review']) delete home.c['netauto-review']; },
      check: sh => {
        const st = mgState(sh); if (!st || !st.remotes.origin) return false;
        const main = mgTip(st, 'main'); const f = mgTip(st, MG_FEAT);
        return !!main && !!f && /review/i.test(main.message) && st.remote.main === main.hash && f.parent === main.hash && st.remote[MG_FEAT] === f.hash && st.remotes.origin.refs[MG_FEAT] === f.hash && mgDid(sh, /^git push .*--force-with-lease/);
      } },
    { id: 'mg13', title: 'Reflog ile kurtarma', xp: 35,
      story: "main'e runner iskeletini commit ettin. Sonra yanlış pencerede git reset --hard HEAD~1 yazdın, commit branch'ten düştü, dosya diskten silindi, git log artık göstermiyor. Panik yok. Git commit'i silmedi, sadece pointer geri gitti. git reflog HEAD'in uğradığı her commit'i sırayla tutar, HEAD@{0} şu an, HEAD@{1} bir önceki. Kaybolan commit'in hash'ini orada görürsün. git reset --hard HEAD@{1} ya da hash ile main'i tekrar oraya taşırsın, dosya geri gelir. Reflog yereldir ve zamanla temizlenir, kurtarma işini erteleme.",
      task: 'main\'e runner.py ekleyip commit et, reset --hard HEAD~1 ile kaybet, reflog ile bul ve geri getir.', hint: 'git switch main, nano netauto/runner.py, git add netauto/runner.py, `git commit -m "feat: add runner skeleton"`, git reset --hard HEAD~1, ls netauto, git reflog, git reset --hard HEAD@{1}, git log --oneline -1',
      solution: 'cd ~/netauto\ngit switch main\nnano netauto/runner.py\ngit add netauto/runner.py\ngit commit -m "feat: add runner skeleton"\ngit reset --hard HEAD~1\ngit reflog\ngit reset --hard HEAD@{1}\ngit log --oneline -1',
      editorContent: { 'netauto/runner.py': MG_SRC.runner },
      setup: sh => mgNeed(sh, 12, st => !!st.remotes.origin),
      check: sh => {
        const st = mgState(sh); const main = mgTip(st, 'main'); if (!st || !main || st.branch !== 'main') return false;
        return /runner/i.test(main.message) && !!main.files['netauto/runner.py'] && mgWt(sh, 'netauto/runner.py').includes('def run') && st.reflog.some(e => /^reset: moving to HEAD~1/.test(e.msg)) && mgDid(sh, /^git reflog\b/);
      } },
    { id: 'mg14', title: 'Pull request akışı', xp: 40,
      story: "Gerçek hayatta feature branch push edilir, GitHub'da pull request açılır, reviewer farkı okur, onaylar, merge butonuna basar. Aynı akışı komut satırında yaşa. git log main..feature/inventory-yaml feature'da olup main'de olmayan commit'leri listeler, reviewer tam bunu okur. git diff main...feature --stat üç noktalı, ortak atadan itibaren farkı özetler. git request-pull klasik PR metnini üretir. Merge ederken --no-ff kullan, fast-forward mümkün olsa bile bir merge commit oluşsun, böylece graph'ta feature'ın nerede başlayıp bittiği her zaman görünür, geri almak da tek revert.",
      task: 'main..feature farkını ve request-pull metnini incele, main\'e geç, --no-ff ile merge et ve push\'la.', hint: 'git log main..feature/inventory-yaml --oneline, git diff main...feature/inventory-yaml --stat, git request-pull main origin feature/inventory-yaml, git switch main, git merge --no-ff feature/inventory-yaml, git push, git log --oneline --graph -5',
      solution: 'cd ~/netauto\ngit log main..feature/inventory-yaml --oneline\ngit diff main...feature/inventory-yaml --stat\ngit request-pull main origin feature/inventory-yaml\ngit switch main\ngit merge --no-ff feature/inventory-yaml\ngit push\ngit log --oneline --graph -5',
      setup: sh => mgNeed(sh, 13, st => !!st.branches[MG_FEAT] && !!st.remotes.origin),
      check: sh => {
        const st = mgState(sh); const main = mgTip(st, 'main'); if (!st || !main || st.merge || st.branch !== 'main') return false;
        const ps = mgParents(main);
        return ps.length === 2 && ps[1] === st.branches[MG_FEAT] && /^Merge/.test(main.message) && (mgDid(sh, /^git log main\.\./) || mgDid(sh, /^git request-pull\b/)) && st.remote.main === main.hash;
      } },
  ],
});

QUIZ.push(
  { q: 'git switch -c feature/x ne yapar?', a: ["feature/x branch'ini oluşturur ve ona geçer", "feature/x branch'ini siler", "feature/x'i main'e merge eder", "Remote'tan feature/x çeker"], c: 0 },
  { q: 'Fast-forward merge ne zaman olur?', a: ["Hedef branch, merge edilen branch'in düz atasıysa, pointer ileri taşınır", 'Her merge fast-forward olur', 'Sadece conflict varken', 'Sadece --no-ff ile'], c: 0 },
  { q: 'Conflict markerları <<<<<<< HEAD ve >>>>>>> branch ne anlatır?', a: ['Üstteki blok senin branch\'in, alttaki merge edilen branch\'in hali', 'Dosya bozuldu, silip yeniden yazmak gerek', 'Git dosyayı otomatik düzeltti', 'Sadece bilgi amaçlı, commit edilebilir'], c: 0 },
  { q: 'Rebase sonrası commit hash\'leri neden değişir?', a: ["Hash içerik ve parent'tan hesaplanır, parent değişince hash değişir", 'Git her komutta hash üretir', 'Mesajlar silinir', 'Tarih değiştiği için değil, rastgele'], c: 0 },
  { q: 'git reset --soft main ne yapar?', a: ["HEAD'i main'e taşır, index ve working tree olduğu gibi kalır", 'Bütün değişiklikleri siler', "main branch'ini siler", "Remote'u sıfırlar"], c: 0 },
  { q: 'git cherry-pick ne işe yarar?', a: ["Tek bir commit'in değişikliğini bulunduğun branch'e yeni commit olarak uygular", "İki branch'i birleştirir", "En iyi commit'i seçip diğerlerini siler", 'Tag oluşturur'], c: 0 },
  { q: 'Annotated tag ile lightweight tag farkı?', a: ['Annotated tag kendi yazarı, tarihi ve mesajı olan bir nesnedir, lightweight sadece pointer', 'Fark yok', "Lightweight tag push edilemez", "Annotated tag sadece main'de olur"], c: 0 },
  { q: 'Rebase sonrası git push neden reddedilir?', a: ["Remote'taki geçmiş yerel branch'in atası değil, non-fast-forward", 'Network yok', 'Tag eksik', 'Upstream ayarlı değil'], c: 0 },
  { q: '--force-with-lease ile --force farkı?', a: ["force-with-lease remote senin son gördüğün commit'teyse ezer, başkası push ettiyse reddeder", 'İkisi aynı', 'force-with-lease sadece tag için', 'force daha güvenli'], c: 0 },
  { q: 'git reset --hard ile kaybolan commit nasıl bulunur?', a: ["git reflog ile, HEAD'in uğradığı her commit orada listelenir", 'Bulunamaz, gitti', 'git log --all ile her zaman görünür', 'Sadece remote\'tan geri alınır'], c: 0 },
);

BADGES.push({ id: 'git', icon: '🌿', title: 'Git Workflow Ustası', desc: 'Git Workflow bölümünü bitir', test: s => CHAPTERS.find(c => c.id === 'git').missions.every(m => s.done.includes(m.id)) });
