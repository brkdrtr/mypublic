'use strict';
/* Linux Lab git eklentisi. /home/burak/netconfigs network config repo'su, veri tabanli sahte git.
   Repo durumu .git/lab-state.json icinde JSON olarak durur, boylece kayit ve geri yukleme ile birlikte tasinir. */

const GIT_ROOT = '/home/burak/netconfigs';
const GIT_REMOTE = 'https://git.netlab.local/netops/netconfigs.git';
const GIT_PEOPLE = {
  burak: ['Burak Dartar', 'burak@netlab.local'],
  ayse: ['Ayşe Kaya', 'ayse@netlab.local'],
  mehmet: ['Mehmet Demir', 'mehmet@netlab.local'],
};
const GIT_BAD = '2c7d4f0';
const GIT_GOOD_TAG = 'v1.0';

const GIT_TXT = {};
GIT_TXT.readme = '# netconfigs\n\nBranch ve hub router config\'lerinin source of truth repo\'su.\nHer cihaz icin bir dosya, dosya adi hostname ile ayni.\n\n- hub-core.conf, Amsterdam DC hub\n- branch-*.conf, branch router\'lar\n- check-policy.sh, commit oncesi policy kontrolu\n';
GIT_TXT.readme2 = GIT_TXT.readme + '\n## Degisiklik proseduru\n\n1. Feature branch ac, config\'i duzenle\n2. ./check-policy.sh calistir, FAIL varsa commit etme\n3. Anlamli commit mesaji yaz, hostname ile basla\n4. Pazartesi change window\'da push ve deploy\n';
GIT_TXT.ignore = '*.bak\n*.log\n*.swp\n.DS_Store\n';
GIT_TXT.policy = [
  '#!/bin/bash',
  '# WAN policy: fiziksel WAN interface mtu 1500 kalir',
  '# GRE overhead Tunnel0 uzerinde ip mtu ile cozulur, fiziksel linkte degil',
  '# Ihlal varsa exit 1 doner, git bisect run bu script ile calisabilir',
  'if grep "^ mtu " branch-*.conf | grep -v "mtu 1500"; then',
  '  echo "FAIL: WAN mtu policy violation"',
  '  exit 1',
  'fi',
  'echo "OK: WAN mtu policy"',
].join('\n') + '\n';
GIT_TXT.hub = [
  '! hub-core, Amsterdam DC hub router',
  '! platform ASR1001-X, IOS-XE 17.9',
  'hostname hub-core',
  '!',
  'ip domain name netlab.local',
  '!',
  'interface Loopback0',
  ' description RID',
  ' ip address 10.255.0.1 255.255.255.255',
  '!',
  'interface GigabitEthernet0/0/0',
  ' description WAN to MPLS PE ams-pe1',
  ' ip address 203.0.113.2 255.255.255.252',
  ' mtu 1500',
  ' no shutdown',
  '!',
  'interface Tunnel11',
  ' description GRE to branch-ams-01',
  ' ip address 172.16.0.10 255.255.255.252',
  ' ip mtu 1400',
  ' ip tcp adjust-mss 1360',
  ' tunnel source GigabitEthernet0/0/0',
  ' tunnel destination 203.0.113.10',
  '!',
  'interface Tunnel12',
  ' description GRE to branch-rtm-02',
  ' ip address 172.16.0.14 255.255.255.252',
  ' ip mtu 1400',
  ' ip tcp adjust-mss 1360',
  ' tunnel source GigabitEthernet0/0/0',
  ' tunnel destination 203.0.113.14',
  '!',
  'router bgp 65000',
  ' bgp router-id 10.255.0.1',
  ' bgp log-neighbor-changes',
  ' neighbor 172.16.0.9 remote-as 65011',
  ' neighbor 172.16.0.9 description branch-ams-01',
  ' neighbor 172.16.0.13 remote-as 65012',
  ' neighbor 172.16.0.13 description branch-rtm-02',
  ' !',
  ' address-family ipv4',
  '  network 10.0.0.0 mask 255.255.0.0',
  '  neighbor 172.16.0.9 activate',
  '  neighbor 172.16.0.13 activate',
  ' exit-address-family',
  '!',
  'ntp server 10.0.50.10',
  'logging host 10.0.50.20',
  '!',
  'line vty 0 4',
  ' transport input ssh',
  '!',
  'end',
].join('\n') + '\n';
GIT_TXT.ams = [
  '! branch-ams-01, Amsterdam Zuidas branch router',
  '! platform ISR4331, IOS-XE 17.9',
  'hostname branch-ams-01',
  '!',
  'ip domain name netlab.local',
  '!',
  'interface Loopback0',
  ' description RID',
  ' ip address 10.255.0.11 255.255.255.255',
  '!',
  'interface GigabitEthernet0/0/0',
  ' description WAN to MPLS PE ams-pe1, KPN circuit NL-AMS-4471',
  ' ip address 203.0.113.10 255.255.255.252',
  ' mtu 1500',
  ' no shutdown',
  '!',
  'interface GigabitEthernet0/0/1',
  ' description LAN users vlan 10',
  ' ip address 10.11.10.1 255.255.255.0',
  ' no shutdown',
  '!',
  'interface Tunnel0',
  ' description GRE to hub-core over MPLS',
  ' ip address 172.16.0.9 255.255.255.252',
  ' ip mtu 1400',
  ' ip tcp adjust-mss 1360',
  ' tunnel source GigabitEthernet0/0/0',
  ' tunnel destination 203.0.113.2',
  '!',
  'router bgp 65011',
  ' bgp router-id 10.255.0.11',
  ' bgp log-neighbor-changes',
  ' neighbor 203.0.113.9 remote-as 65000',
  ' neighbor 203.0.113.9 description ams-pe1',
  ' neighbor 203.0.113.9 password 7 0822455D0A16',
  ' neighbor 172.16.0.10 remote-as 65000',
  ' neighbor 172.16.0.10 description hub-core over GRE',
  ' !',
  ' address-family ipv4',
  '  network 10.11.10.0 mask 255.255.255.0',
  '  neighbor 203.0.113.9 activate',
  '  neighbor 172.16.0.10 activate',
  ' exit-address-family',
  '!',
  'ip route 0.0.0.0 0.0.0.0 203.0.113.9',
  '!',
  'ntp server 10.0.50.10',
  '!',
  'line vty 0 4',
  ' transport input ssh',
  '!',
  'end',
].join('\n') + '\n';
GIT_TXT.rtm = [
  '! branch-rtm-02, Rotterdam Waalhaven branch router',
  '! platform ISR4331, IOS-XE 17.9',
  'hostname branch-rtm-02',
  '!',
  'ip domain name netlab.local',
  '!',
  'interface Loopback0',
  ' description RID',
  ' ip address 10.255.0.12 255.255.255.255',
  '!',
  'interface GigabitEthernet0/0/0',
  ' description WAN to MPLS PE rtm-pe1, KPN circuit NL-RTM-2210',
  ' ip address 203.0.113.14 255.255.255.252',
  ' mtu 1500',
  ' no shutdown',
  '!',
  'interface GigabitEthernet0/0/1',
  ' description LAN users vlan 10',
  ' ip address 10.12.10.1 255.255.255.0',
  ' ip ospf 1 area 10',
  ' no shutdown',
  '!',
  'interface Tunnel0',
  ' description GRE to hub-core over MPLS',
  ' ip address 172.16.0.13 255.255.255.252',
  ' ip mtu 1400',
  ' ip tcp adjust-mss 1360',
  ' tunnel source GigabitEthernet0/0/0',
  ' tunnel destination 203.0.113.2',
  '!',
  'router ospf 1',
  ' router-id 10.255.0.12',
  ' passive-interface default',
  ' no passive-interface GigabitEthernet0/0/1',
  '!',
  'router bgp 65012',
  ' bgp router-id 10.255.0.12',
  ' bgp log-neighbor-changes',
  ' neighbor 203.0.113.13 remote-as 65000',
  ' neighbor 203.0.113.13 description rtm-pe1',
  ' neighbor 203.0.113.13 password 7 104D000A0618',
  ' neighbor 172.16.0.14 remote-as 65000',
  ' neighbor 172.16.0.14 description hub-core over GRE',
  ' !',
  ' address-family ipv4',
  '  network 10.12.10.0 mask 255.255.255.0',
  '  neighbor 203.0.113.13 activate',
  '  neighbor 172.16.0.14 activate',
  ' exit-address-family',
  '!',
  'ip route 0.0.0.0 0.0.0.0 203.0.113.13',
  '!',
  'ntp server 10.0.50.10',
  '!',
  'line vty 0 4',
  ' transport input ssh',
  '!',
  'end',
].join('\n') + '\n';
GIT_TXT.utr = GIT_TXT.rtm
  .replace('branch-rtm-02, Rotterdam Waalhaven', 'branch-utr-03, Utrecht Papendorp')
  .replace(/branch-rtm-02/g, 'branch-utr-03')
  .replace('rtm-pe1, KPN circuit NL-RTM-2210', 'utr-pe1, KPN circuit NL-UTR-0917')
  .replace(/rtm-pe1/g, 'utr-pe1')
  .replace(/10\.255\.0\.12/g, '10.255.0.13').replace(/10\.12\.10\./g, '10.13.10.')
  .replace(/203\.0\.113\.14/g, '203.0.113.18').replace(/203\.0\.113\.13/g, '203.0.113.17')
  .replace(/172\.16\.0\.13/g, '172.16.0.17').replace(/172\.16\.0\.14/g, '172.16.0.18')
  .replace(/65012/g, '65013').replace('104D000A0618', '0458170B1A3C')
  .replace(' ip ospf 1 area 10\n', '')
  .replace('router ospf 1\n router-id 10.255.0.13\n passive-interface default\n no passive-interface GigabitEthernet0/0/1\n!\n', '');
GIT_TXT.notes = [
  '06 Oct 02:10 branch-ams-01 BGP neighbor 203.0.113.9 Down, hold timer expired',
  '06 Oct 02:14 session tekrar up, 3 dakika sonra yine down',
  '06 Oct 02:30 ping df-bit size 1472 to 203.0.113.9 basarisiz, size 1372 ok',
  '06 Oct 02:35 ilk suphe MTU, Pazartesi deploy edilen config degisiklikleri bak',
  'TODO: hangi commit, kim, neden',
].join('\n') + '\n';

/* Tarih sirasina gore commit'ler. set bir onceki snapshot'tan yeni snapshot'i uretir */
const GIT_HISTORY = [
  { h: 'a1f3c9e', a: 'burak', d: '2026-09-07T09:12:40+02:00', m: 'Initial commit: netconfigs repo for branch and hub configs', set: () => ({ 'README.md': GIT_TXT.readme, '.gitignore': GIT_TXT.ignore }) },
  { h: '7d02e4b', a: 'burak', d: '2026-09-07T10:48:15+02:00', m: 'Add WAN mtu policy check script', set: () => ({ 'check-policy.sh': GIT_TXT.policy }) },
  { h: 'c3e81a7', a: 'burak', d: '2026-09-08T11:30:02+02:00', m: 'Add hub-core baseline config', set: () => ({ 'hub-core.conf': GIT_TXT.hub }) },
  { h: '94b4f12', a: 'ayse', d: '2026-09-09T15:22:47+02:00', m: 'Add branch-ams-01 baseline config', set: () => ({ 'branch-ams-01.conf': GIT_TXT.ams }) },
  { h: 'e5a7c03', a: 'mehmet', d: '2026-09-10T09:05:19+02:00', m: 'Add branch-rtm-02 baseline config', set: () => ({ 'branch-rtm-02.conf': GIT_TXT.rtm }) },
  { h: 'f41d8b6', a: 'burak', d: '2026-09-14T16:40:33+02:00', m: 'hub-core: enable BFD on branch BGP neighbors', set: s => ({ 'hub-core.conf': s['hub-core.conf']
    .replace(' neighbor 172.16.0.9 description branch-ams-01\n', ' neighbor 172.16.0.9 description branch-ams-01\n neighbor 172.16.0.9 fall-over bfd\n')
    .replace(' neighbor 172.16.0.13 description branch-rtm-02\n', ' neighbor 172.16.0.13 description branch-rtm-02\n neighbor 172.16.0.13 fall-over bfd\n')
    .replace('interface Tunnel11\n description GRE to branch-ams-01\n ip address 172.16.0.10 255.255.255.252\n', 'interface Tunnel11\n description GRE to branch-ams-01\n ip address 172.16.0.10 255.255.255.252\n bfd interval 300 min_rx 300 multiplier 3\n')
    .replace('interface Tunnel12\n description GRE to branch-rtm-02\n ip address 172.16.0.14 255.255.255.252\n', 'interface Tunnel12\n description GRE to branch-rtm-02\n ip address 172.16.0.14 255.255.255.252\n bfd interval 300 min_rx 300 multiplier 3\n') }) },
  { h: '0a9e6d1', a: 'ayse', d: '2026-09-16T13:11:08+02:00', m: 'branch-ams-01: add SNMP community and syslog host', set: s => ({ 'branch-ams-01.conf': s['branch-ams-01.conf']
    .replace('ntp server 10.0.50.10\n', 'ntp server 10.0.50.10\nsnmp-server community n3tl4b-ro RO 10\nsnmp-server location Amsterdam Zuidas\nlogging host 10.0.50.20\n') }) },
  { h: '1b5c3e9', a: 'mehmet', d: '2026-09-21T10:27:54+02:00', m: 'branch-rtm-02: make OSPF area 10 a stub area', set: s => ({ 'branch-rtm-02.conf': s['branch-rtm-02.conf']
    .replace(' passive-interface default\n', ' area 10 stub\n passive-interface default\n') }) },
  { h: '2c7d4f0', a: 'ayse', d: '2026-09-24T17:48:12+02:00', m: 'branch-ams-01: lower WAN mtu for GRE overhead', set: s => ({ 'branch-ams-01.conf': s['branch-ams-01.conf']
    .replace(' ip address 203.0.113.10 255.255.255.252\n mtu 1500\n', ' ip address 203.0.113.10 255.255.255.252\n mtu 1400\n') }) },
  { h: '3d8e5a1', a: 'burak', d: '2026-09-28T11:02:36+02:00', m: 'hub-core: add BGP neighbor for branch-utr-03', set: s => ({ 'hub-core.conf': s['hub-core.conf']
    .replace('!\nrouter bgp 65000\n', 'interface Tunnel13\n description GRE to branch-utr-03\n ip address 172.16.0.18 255.255.255.252\n bfd interval 300 min_rx 300 multiplier 3\n ip mtu 1400\n ip tcp adjust-mss 1360\n tunnel source GigabitEthernet0/0/0\n tunnel destination 203.0.113.18\n!\nrouter bgp 65000\n')
    .replace(' neighbor 172.16.0.13 fall-over bfd\n', ' neighbor 172.16.0.13 fall-over bfd\n neighbor 172.16.0.17 remote-as 65013\n neighbor 172.16.0.17 description branch-utr-03\n neighbor 172.16.0.17 fall-over bfd\n')
    .replace('  neighbor 172.16.0.13 activate\n', '  neighbor 172.16.0.13 activate\n  neighbor 172.16.0.17 activate\n') }) },
  { h: '8e9f6b2', a: 'mehmet', d: '2026-09-29T14:36:21+02:00', m: 'Add branch-utr-03 baseline config', set: () => ({ 'branch-utr-03.conf': GIT_TXT.utr }) },
  { h: '5fa07c3', a: 'ayse', d: '2026-10-02T09:58:44+02:00', m: 'branch-ams-01: point syslog to new collector', set: s => ({ 'branch-ams-01.conf': s['branch-ams-01.conf'].replace('logging host 10.0.50.20\n', 'logging host 10.0.50.25\n') }) },
  { h: '6ab18d4', a: 'burak', d: '2026-10-05T15:20:07+02:00', m: 'README: document the change procedure', set: () => ({ 'README.md': GIT_TXT.readme2 }) },
];

/* ---------- kucuk yardimcilar ---------- */

function gitHex(s, len) {
  let out = ''; let h = 5381;
  for (let r = 0; out.length < len; r++) {
    const t = s + '#' + r;
    for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
    out += h.toString(16).padStart(8, '0');
  }
  return out.slice(0, len);
}
function gitFullHash(short, m) { return short + gitHex(short + m, 33); }
function gitMode(rel) { return rel.endsWith('.sh') ? '100755' : '100644'; }
function gitDate(iso, style) {
  const d = iso.slice(0, 10), t = iso.slice(11, 19), tz = iso.slice(19).replace(':', '') || '+0000';
  if (style === 'blame') return `${d} ${t} ${tz}`;
  if (style === 'short') return d;
  const dt = new Date(iso.slice(0, 19) + 'Z');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[dt.getUTCDay()]} ${mons[dt.getUTCMonth()]} ${dt.getUTCDate()} ${t} ${dt.getUTCFullYear()} ${tz}`;
}
function gitNow() { return new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 19) + '+02:00'; }

function gitBuildCommits() {
  const out = []; let snap = {}; let parent = null;
  for (const c of GIT_HISTORY) {
    snap = Object.assign({}, snap, c.set(snap));
    const files = {};
    Object.keys(snap).sort().forEach(k => { if (snap[k] !== null) files[k] = snap[k]; });
    snap = files;
    const [author, email] = GIT_PEOPLE[c.a];
    out.push({ hash: c.h, full: gitFullHash(c.h, c.m), parent, author, email, date: c.d, message: c.m, files });
    parent = c.h;
  }
  return out;
}

function gitFreshState() {
  const commits = gitBuildCommits();
  const head = commits[commits.length - 1].hash;
  const tags = {}; tags[GIT_GOOD_TAG] = '0a9e6d1';
  return { commits, head, branch: 'main', branches: { main: head }, remote: { main: head }, tags, index: Object.assign({}, commits[commits.length - 1].files), stash: [], bisect: null, user: GIT_PEOPLE.burak };
}

/* Working tree: HEAD snapshot + bir commit edilmemis degisiklik + bir untracked dosya */
function gitFreshFiles() {
  const st = gitFreshState();
  const head = st.commits[st.commits.length - 1].files;
  const U = 'burak';
  const files = [{ path: GIT_ROOT, node: mkdir({}, 0o755, U) }];
  for (const k of Object.keys(head)) files.push({ path: GIT_ROOT + '/' + k, node: mkfile(head[k], k.endsWith('.sh') ? 0o755 : 0o644, U) });
  files.push({ path: GIT_ROOT + '/branch-rtm-02.conf', node: mkfile(head['branch-rtm-02.conf'].replace('ntp server 10.0.50.10\n', 'ntp server 10.0.50.10\nntp server 10.0.50.11\n'), 0o644, U) });
  files.push({ path: GIT_ROOT + '/ams-outage-notes.txt', node: mkfile(GIT_TXT.notes, 0o644, U) });
  files.push({ path: GIT_ROOT + '/.git', node: mkdir({}, 0o755, U) });
  files.push({ path: GIT_ROOT + '/.git/HEAD', node: mkfile('ref: refs/heads/main\n', 0o644, U) });
  files.push({ path: GIT_ROOT + '/.git/config', node: mkfile(`[core]\n\trepositoryformatversion = 0\n\tbare = false\n[remote "origin"]\n\turl = ${GIT_REMOTE}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n[branch "main"]\n\tremote = origin\n\tmerge = refs/heads/main\n[user]\n\tname = Burak Dartar\n\temail = burak@netlab.local\n`, 0o644, U) });
  files.push({ path: GIT_ROOT + '/.git/lab-state.json', node: mkfile(JSON.stringify(st), 0o644, U) });
  return files;
}

/* ---------- repo erisimi ---------- */

function gitRepoRoot(sh) {
  let p = sh.cwd;
  while (true) {
    const n = sh.node(p + '/.git/lab-state.json');
    if (n && n.t === 'f') return p;
    if (p === '/' || p === '') return null;
    p = p.slice(0, p.lastIndexOf('/')) || '/';
  }
}
function gitLoad(sh, root) {
  const n = sh.node(root + '/.git/lab-state.json');
  try { return JSON.parse(n.d); } catch (e) { return null; }
}
function gitSave(sh, root, st) {
  const n = sh.node(root + '/.git/lab-state.json');
  if (n) n.d = JSON.stringify(st);
  const h = sh.node(root + '/.git/HEAD');
  if (h) h.d = st.branch ? `ref: refs/heads/${st.branch}\n` : gitFind(st, st.head).full + '\n';
}
function gitFind(st, h) { return st.commits.find(c => c.hash === h || c.full === h) || null; }
function gitRev(st, spec) {
  if (!spec) return null;
  const m = /^(.*?)((?:[~^]\d*)*)$/.exec(spec);
  let base = m[1] || 'HEAD';
  if (base.startsWith('origin/')) base = base.slice(7) in st.remote ? st.remote[base.slice(7)] : base;
  let c = base === 'HEAD' ? gitFind(st, st.head)
    : st.branches[base] !== undefined ? gitFind(st, st.branches[base])
      : st.tags[base] !== undefined ? gitFind(st, st.tags[base])
        : /^[0-9a-f]{4,40}$/.test(base) ? st.commits.find(x => x.full.startsWith(base)) || null : null;
  const mods = m[2].match(/[~^]\d*/g) || [];
  for (const md of mods) {
    const k = md[0] === '~' ? (md.length > 1 ? +md.slice(1) : 1) : 1;
    for (let i = 0; i < k && c; i++) c = c.parent ? gitFind(st, c.parent) : null;
  }
  return c;
}
function gitHistory(st, from) {
  const out = []; let c = gitFind(st, from);
  while (c) { out.push(c); c = c.parent ? gitFind(st, c.parent) : null; }
  return out;
}
function gitHead(st) { return gitFind(st, st.head); }
function gitRel(sh, root, p) {
  const abs = sh.resolve(p);
  if (abs === root) return '';
  return abs.startsWith(root + '/') ? abs.slice(root.length + 1) : null;
}

/* calisma agaci okuma ve yazma */
function gitWorkTree(sh, root) {
  const out = {};
  const walk = (node, pre) => {
    for (const k of Object.keys(node.c)) {
      if (!pre && k === '.git') continue;
      const n = node.c[k];
      if (n.t === 'd') walk(n, pre + k + '/'); else out[pre + k] = n.d;
    }
  };
  const r = sh.node(root);
  if (r && r.t === 'd') walk(r, '');
  return out;
}
function gitWrite(sh, root, rel, content) {
  const abs = root + '/' + rel;
  const n = sh.node(abs);
  if (n && n.t === 'f') { n.d = content; n.ts = Date.now(); return; }
  sh.install(abs, mkfile(content, rel.endsWith('.sh') ? 0o755 : 0o644, 'burak'));
}
function gitDelete(sh, root, rel) {
  const { dir, name } = sh.parent(root + '/' + rel);
  if (dir && dir.c[name]) delete dir.c[name];
}
function gitIgnored(sh, root, st, rel) {
  const n = sh.node(root + '/.gitignore');
  const pats = lines(n && n.t === 'f' ? n.d : (st.index['.gitignore'] || '')).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  const base = rel.slice(rel.lastIndexOf('/') + 1);
  return pats.some(p => {
    const anchored = p.includes('/');
    const re = new RegExp('^' + p.replace(/\/$/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]') + '$');
    return re.test(anchored ? rel : base);
  });
}
/* HEAD, index ve working tree arasindaki farklar */
function gitChangedFiles(A, B) {
  const names = Array.from(new Set(Object.keys(A).concat(Object.keys(B)))).sort();
  return names.filter(f => A[f] !== B[f]).map(f => ({ file: f, kind: A[f] === undefined ? 'new file' : B[f] === undefined ? 'deleted' : 'modified' }));
}
function gitChanges(sh, root, st) {
  const head = gitHead(st).files; const wt = gitWorkTree(sh, root);
  const tracked = {}; Object.keys(st.index).forEach(f => { if (wt[f] !== undefined) tracked[f] = wt[f]; });
  const staged = gitChangedFiles(head, st.index);
  const unstaged = gitChangedFiles(st.index, tracked);
  const untracked = Object.keys(wt).filter(f => st.index[f] === undefined && !gitIgnored(sh, root, st, f)).sort();
  return { staged, unstaged, untracked, wt, tracked };
}

/* ---------- diff ---------- */

function gitOps(a, b) {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { ops.push(['=', a[i]]); i++; j++; }
    else if (i < n && (j >= m || L[i + 1][j] >= L[i][j + 1])) { ops.push(['-', a[i]]); i++; }
    else { ops.push(['+', b[j]]); j++; }
  }
  return ops;
}
function gitHunks(ops, ctx = 3) {
  const aPos = []; const bPos = []; let ai = 0, bi = 0;
  ops.forEach(o => { aPos.push(ai); bPos.push(bi); if (o[0] !== '+') ai++; if (o[0] !== '-') bi++; });
  const changed = []; ops.forEach((o, k) => { if (o[0] !== '=') changed.push(k); });
  const groups = [];
  for (const k of changed) {
    const g = groups[groups.length - 1];
    if (g && k - g.end <= 2 * ctx) g.end = k; else groups.push({ start: k, end: k });
  }
  return groups.map(g => {
    const s = Math.max(0, g.start - ctx), e = Math.min(ops.length, g.end + ctx + 1);
    const body = ops.slice(s, e);
    const ac = body.filter(o => o[0] !== '+').length, bc = body.filter(o => o[0] !== '-').length;
    const as = ac ? aPos[s] + 1 : aPos[s], bs = bc ? bPos[s] + 1 : bPos[s];
    const rng = (x, c) => c === 1 ? String(x) : `${x},${c}`;
    return [`@@ -${rng(as, ac)} +${rng(bs, bc)} @@`].concat(body.map(o => (o[0] === '=' ? ' ' : o[0]) + o[1]));
  });
}
function gitCount(a, b) {
  const ops = gitOps(lines(a || ''), lines(b || ''));
  return { ins: ops.filter(o => o[0] === '+').length, del: ops.filter(o => o[0] === '-').length };
}
function gitUnified(file, a, b) {
  const out = [`diff --git a/${file} b/${file}`];
  const ha = a === undefined ? '0000000' : gitHex(a, 7), hb = b === undefined ? '0000000' : gitHex(b, 7);
  if (a === undefined) out.push(`new file mode ${gitMode(file)}`, `index ${ha}..${hb}`);
  else if (b === undefined) out.push(`deleted file mode ${gitMode(file)}`, `index ${ha}..${hb}`);
  else out.push(`index ${ha}..${hb} ${gitMode(file)}`);
  out.push(a === undefined ? '--- /dev/null' : `--- a/${file}`, b === undefined ? '+++ /dev/null' : `+++ b/${file}`);
  gitHunks(gitOps(lines(a || ''), lines(b || ''))).forEach(h => out.push(...h));
  return out;
}
function gitDiffText(A, B, paths, stat) {
  let ch = gitChangedFiles(A, B);
  if (paths && paths.length) ch = ch.filter(c => paths.some(p => c.file === p || c.file.startsWith(p + '/')));
  if (stat) return gitStat(ch, A, B);
  const out = [];
  ch.forEach(c => out.push(...gitUnified(c.file, A[c.file], B[c.file])));
  return out;
}
function gitStat(ch, A, B) {
  if (!ch.length) return [];
  const rows = ch.map(c => Object.assign({ n: gitCount(A[c.file], B[c.file]) }, c));
  const w = Math.max(...rows.map(r => r.file.length));
  const cw = Math.max(...rows.map(r => String(r.n.ins + r.n.del).length));
  let ti = 0, td = 0;
  const out = rows.map(r => {
    ti += r.n.ins; td += r.n.del;
    const tot = r.n.ins + r.n.del; const scale = tot > 40 ? 40 / tot : 1;
    return ` ${r.file.padEnd(w)} | ${String(tot).padStart(cw)} ${'+'.repeat(Math.round(r.n.ins * scale))}${'-'.repeat(Math.round(r.n.del * scale))}`;
  });
  const parts = [`${rows.length} file${rows.length > 1 ? 's' : ''} changed`];
  if (ti) parts.push(`${ti} insertion${ti > 1 ? 's' : ''}(+)`);
  if (td) parts.push(`${td} deletion${td > 1 ? 's' : ''}(-)`);
  out.push(' ' + parts.join(', '));
  return out;
}

/* ---------- commit gosterimi ---------- */

function gitDecor(st, c) {
  const d = [];
  if (st.head === c.hash) d.push(st.branch ? `HEAD -> ${st.branch}` : 'HEAD');
  Object.keys(st.branches).forEach(b => { if (st.branches[b] === c.hash && b !== st.branch) d.push(b); });
  Object.keys(st.remote).forEach(b => { if (st.remote[b] === c.hash) d.push(`origin/${b}`); });
  Object.keys(st.tags).forEach(t => { if (st.tags[t] === c.hash) d.push(`tag: ${t}`); });
  return d.length ? ` (${d.join(', ')})` : '';
}
function gitHeader(st, c) {
  return [`commit ${c.full}${gitDecor(st, c)}`, `Author: ${c.author} <${c.email}>`, `Date:   ${gitDate(c.date)}`, ''].concat(c.message.split('\n').map(l => l ? '    ' + l : ''), ['']);
}
function gitParentFiles(st, c) { return c.parent ? gitFind(st, c.parent).files : {}; }
function gitFormat(st, c, fmt) {
  return fmt.replace(/%(H|h|an|ae|ad|as|s|d|p|P|n)/g, (_, k) => ({
    H: c.full, h: c.hash, an: c.author, ae: c.email, ad: gitDate(c.date), as: gitDate(c.date, 'short'), s: c.message.split('\n')[0],
    d: gitDecor(st, c), p: c.parent || '', P: c.parent ? gitFind(st, c.parent).full : '', n: '\n',
  })[k]);
}
function gitStatus(sh, root, st, short) {
  const { staged, unstaged, untracked } = gitChanges(sh, root, st);
  const out = [];
  if (short) {
    const all = {};
    staged.forEach(c => { all[c.file] = (c.kind === 'new file' ? 'A' : c.kind === 'deleted' ? 'D' : 'M') + ' '; });
    unstaged.forEach(c => { all[c.file] = (all[c.file] || ' ')[0] + (c.kind === 'deleted' ? 'D' : 'M'); });
    untracked.forEach(f => { all[f] = '??'; });
    Object.keys(all).sort().forEach(f => out.push(`${all[f]} ${f}`));
    return out;
  }
  if (st.bisect) out.push(`HEAD detached at ${st.head}`, `You are currently bisecting, started from branch '${st.bisect.branch}'.`, '  (use "git bisect reset" to get back to the original branch)');
  else if (!st.branch) out.push(`HEAD detached at ${st.head}`);
  else {
    out.push(`On branch ${st.branch}`);
    const ahead = st.remote[st.branch] ? gitHistory(st, st.head).findIndex(c => c.hash === st.remote[st.branch]) : -1;
    if (ahead > 0) out.push(`Your branch is ahead of 'origin/${st.branch}' by ${ahead} commit${ahead > 1 ? 's' : ''}.`, '  (use "git push" to publish your local commits)');
    else if (ahead === 0) out.push(`Your branch is up to date with 'origin/${st.branch}'.`);
  }
  if (staged.length) out.push('', 'Changes to be committed:', '  (use "git restore --staged <file>..." to unstage)', ...staged.map(c => `\t${(c.kind + ':').padEnd(12)}${c.file}`));
  if (unstaged.length) out.push('', 'Changes not staged for commit:', '  (use "git add <file>..." to update what will be committed)', '  (use "git restore <file>..." to discard changes in working directory)', ...unstaged.map(c => `\t${(c.kind + ':').padEnd(12)}${c.file}`));
  if (untracked.length) out.push('', 'Untracked files:', '  (use "git add <file>..." to include in what will be committed)', ...untracked.map(f => '\t' + f));
  out.push('');
  if (!staged.length && !unstaged.length && !untracked.length) out.push('nothing to commit, working tree clean');
  else if (!staged.length && unstaged.length) out.push('no changes added to commit (use "git add" and/or "git commit -a")');
  else if (!staged.length) out.push('nothing added to commit but untracked files present (use "git add" to track)');
  return out;
}

/* snapshot'i working tree'ye yaz, index'i esitle */
function gitCheckoutFiles(sh, root, st, c) {
  const cur = gitHead(st).files;
  Object.keys(cur).forEach(f => { if (c.files[f] === undefined) gitDelete(sh, root, f); });
  Object.keys(c.files).forEach(f => gitWrite(sh, root, f, c.files[f]));
  st.head = c.hash;
  st.index = Object.assign({}, c.files);
}
function gitDirtyError(sh, root, st, what) {
  const { staged, unstaged } = gitChanges(sh, root, st);
  const files = Array.from(new Set(staged.concat(unstaged).map(c => c.file))).sort();
  if (!files.length) return null;
  return fail(`error: Your local changes to the following files would be overwritten by ${what}:\n${files.map(f => '\t' + f).join('\n')}\nPlease commit your changes or stash them before you switch branches.\nAborting`);
}
function gitNewCommit(st, message, files) {
  let short = gitHex(st.head + message + files.length + Date.now(), 7);
  while (gitFind(st, short)) short = gitHex(short + 'x', 7);
  const c = { hash: short, full: gitFullHash(short, message), parent: st.head, author: st.user[0], email: st.user[1], date: gitNow(), message, files: Object.assign({}, files) };
  st.commits.push(c);
  st.head = c.hash;
  if (st.branch) st.branches[st.branch] = c.hash;
  return c;
}
function gitCommitSummary(st, c) {
  const ch = gitChangedFiles(gitParentFiles(st, c), c.files);
  const out = [`[${st.branch || 'detached HEAD'} ${c.hash}] ${c.message.split('\n')[0]}`].concat(gitStat(ch, gitParentFiles(st, c), c.files).slice(-1));
  ch.forEach(x => { if (x.kind === 'new file') out.push(` create mode ${gitMode(x.file)} ${x.file}`); if (x.kind === 'deleted') out.push(` delete mode ${gitMode(x.file)} ${x.file}`); });
  return out;
}
function gitNoNet(what) { return fail(`fatal: unable to access '${GIT_REMOTE}/': Could not resolve host: git.netlab.local\n💡 Bu lab'da network yok, ${what} gerçek bir remote ister. Local history yine de senin.`, 128); }

/* ---------- bisect ---------- */

function gitBisectStep(sh, root, st) {
  const b = st.bisect;
  if (b.good === null || b.bad === null) {
    const miss = b.bad === null ? 'bad' : 'good';
    return ok(`Status: waiting for both good and bad commits, ${miss} commit still missing\n💡 git bisect ${miss} <rev> ile isaretle\n`);
  }
  const chain = gitHistory(st, b.bad).reverse();
  const gi = chain.findIndex(c => c.hash === b.good);
  if (gi < 0) return fail('fatal: the good revision is not an ancestor of the bad revision, git bisect reset ile bastan basla');
  const cand = chain.slice(gi + 1);
  if (!cand.length) return fail('fatal: good and bad revisions are the same, git bisect reset ile bastan basla');
  if (cand.length === 1) {
    const c = cand[0];
    b.done = c.hash;
    const stat = gitStat(gitChangedFiles(gitParentFiles(st, c), c.files), gitParentFiles(st, c), c.files);
    return ok(join([`${c.full} is the first bad commit`].concat(gitHeader(st, c), stat)));
  }
  const mid = cand[Math.floor((cand.length - 1) / 2)];
  const left = Math.floor((cand.length - 1) / 2);
  const steps = left ? Math.ceil(Math.log2(left + 1)) : 0;
  gitCheckoutFiles(sh, root, st, mid);
  b.log.push(`# testing ${mid.hash} ${mid.message}`);
  return ok(`Bisecting: ${left} revision${left === 1 ? '' : 's'} left to test after this (roughly ${steps} step${steps === 1 ? '' : 's'})\n[${mid.full}] ${mid.message.split('\n')[0]}\n`);
}

/* ---------- alt komutlar ---------- */

const GIT_SUB = {
  status(sh, root, st, args) {
    const { flags } = parseOpts(args);
    return ok(join(gitStatus(sh, root, st, flags.has('s') || flags.has('--short'))));
  },

  log(sh, root, st, args) {
    const { flags, vals, rest } = parseOpts(args, 'n');
    let limit = vals.n !== undefined ? +vals.n : Infinity;
    const paths = []; let start = st.head;
    for (const r of rest) {
      if (/^-\d+$/.test(r)) { limit = +r.slice(1); continue; }
      const c = gitRev(st, r);
      if (c) start = c.hash; else { const rel = gitRel(sh, root, r); if (rel !== null) paths.push(rel); else return fail(`fatal: ambiguous argument '${r}': unknown revision or path not in the working tree.`, 128); }
    }
    let fmt = null; let oneline = flags.has('--oneline');
    let author = null; let since = null; let grep = null;
    for (const f of flags) {
      if (f.startsWith('--max-count=')) limit = +f.slice(12);
      if (f.startsWith('--author=')) author = f.slice(9).toLowerCase();
      if (f.startsWith('--grep=')) grep = f.slice(7).toLowerCase();
      if (f.startsWith('--since=') || f.startsWith('--after=')) {
        let v = f.slice(f.indexOf('=') + 1);
        const rel = /^(\d+)\s*(day|week|month)s?(\s+ago)?$/.exec(v);
        if (rel) { const days = +rel[1] * (rel[2] === 'week' ? 7 : rel[2] === 'month' ? 30 : 1); v = new Date(Date.now() - days * 86400e3).toISOString().slice(0, 10); }
        since = v;
      }
      if (f.startsWith('--pretty=') || f.startsWith('--format=')) { const v = f.slice(f.indexOf('=') + 1); if (v === 'oneline') oneline = true; else fmt = v.replace(/^format:/, '').replace(/^tformat:/, ''); }
    }
    let list = gitHistory(st, start);
    if (author) list = list.filter(c => c.author.toLowerCase().includes(author) || c.email.toLowerCase().includes(author));
    if (grep) list = list.filter(c => c.message.toLowerCase().includes(grep));
    if (since) list = list.filter(c => c.date.slice(0, 10) >= since);
    if (paths.length) list = list.filter(c => { const p = gitParentFiles(st, c); return paths.some(f => p[f] !== c.files[f]); });
    list = list.slice(0, limit);
    const out = [];
    const pre = flags.has('--graph') ? '* ' : '';
    for (const c of list) {
      if (fmt) { out.push(pre + gitFormat(st, c, fmt)); continue; }
      if (oneline) { out.push(`${pre}${c.hash}${gitDecor(st, c)} ${c.message.split('\n')[0]}`); continue; }
      out.push(...gitHeader(st, c).map(l => pre + l));
      if (flags.has('--stat') || flags.has('p') || flags.has('--patch')) {
        const d = gitDiffText(gitParentFiles(st, c), c.files, paths, flags.has('--stat'));
        out.push(...d, '');
      }
    }
    if (!list.length && (author || since || grep)) return ok('');
    return ok(join(out));
  },

  shortlog(sh, root, st) {
    const cnt = {};
    gitHistory(st, st.head).forEach(c => { cnt[c.author] = (cnt[c.author] || 0) + 1; });
    return ok(join(Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).map(a => `${String(cnt[a]).padStart(6)}\t${a}`)));
  },

  show(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const spec = rest.find(r => r.includes(':') || gitRev(st, r)) || 'HEAD';
    if (spec.includes(':')) {
      const [r, p] = spec.split(':');
      const c = gitRev(st, r || 'HEAD');
      if (!c) return fail(`fatal: invalid object name '${r}'.`, 128);
      const rel = gitRel(sh, root, p);
      if (rel === null || c.files[rel] === undefined) return fail(`fatal: path '${p}' does not exist in '${r || 'HEAD'}'`, 128);
      return ok(c.files[rel]);
    }
    const c = gitRev(st, spec);
    if (!c) return fail(`fatal: ambiguous argument '${spec}': unknown revision or path not in the working tree.`, 128);
    const paths = rest.filter(r => r !== spec).map(r => gitRel(sh, root, r)).filter(r => r !== null);
    const out = gitHeader(st, c);
    if (flags.has('--name-only')) out.push(...gitChangedFiles(gitParentFiles(st, c), c.files).map(x => x.file));
    else out.push(...gitDiffText(gitParentFiles(st, c), c.files, paths, flags.has('--stat')));
    return ok(join(out));
  },

  diff(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const revs = []; const paths = [];
    for (const r of rest) {
      if (r.includes('..')) { const [a, b] = r.split(/\.{2,3}/); const ca = gitRev(st, a || 'HEAD'), cb = gitRev(st, b || 'HEAD'); if (!ca || !cb) return fail(`fatal: bad revision '${r}'`, 128); revs.push(ca, cb); continue; }
      const c = gitRev(st, r);
      if (c && !paths.length) revs.push(c);
      else { const rel = gitRel(sh, root, r); if (rel === null) return fail(`fatal: ambiguous argument '${r}': unknown revision or path not in the working tree.`, 128); paths.push(rel); }
    }
    const head = gitHead(st).files; const { tracked } = gitChanges(sh, root, st);
    let A, B;
    if (flags.has('--cached') || flags.has('--staged')) { A = revs[0] ? revs[0].files : head; B = st.index; }
    else if (!revs.length) { A = st.index; B = tracked; }
    else if (revs.length === 1) { A = revs[0].files; B = Object.assign({}, tracked); Object.keys(A).forEach(f => { if (B[f] === undefined && st.index[f] === undefined) B[f] = undefined; }); }
    else { A = revs[0].files; B = revs[1].files; }
    if (flags.has('--name-only')) return ok(join(gitChangedFiles(A, B).filter(c => !paths.length || paths.includes(c.file)).map(c => c.file)));
    return ok(join(gitDiffText(A, B, paths, flags.has('--stat'))));
  },

  blame(sh, root, st, args) {
    const { vals, rest } = parseOpts(args, 'L');
    if (!rest[0]) return fail('usage: git blame [<options>] [<rev>] [--] <file>');
    const rel = gitRel(sh, root, rest[0]);
    const head = gitHead(st);
    if (rel === null || head.files[rel] === undefined) return fail(`fatal: no such path '${rest[0]}' in HEAD`, 128);
    const wtn = sh.node(root + '/' + rel);
    const text = wtn && wtn.t === 'f' ? wtn.d : head.files[rel];
    const headLines = lines(head.files[rel]);
    let rows = lines(text).map((l, i) => {
      if (!headLines.includes(l)) return { h: '00000000', a: 'Not Committed Yet', d: gitDate(gitNow(), 'blame'), n: i + 1, l };
      let c = head;
      while (c.parent) { const p = gitFind(st, c.parent); if (p.files[rel] === undefined || !lines(p.files[rel]).includes(l)) break; c = p; }
      return { h: c.full.slice(0, 8), a: c.author, d: gitDate(c.date, 'blame'), n: i + 1, l };
    });
    if (vals.L) { const [a, b] = vals.L.split(',').map(Number); rows = rows.filter(r => r.n >= a && r.n <= (b || a)); }
    const aw = Math.max(...rows.map(r => r.a.length)); const nw = String(rows.length ? rows[rows.length - 1].n : 1).length;
    return ok(join(rows.map(r => `${r.h} (${r.a.padEnd(aw)} ${r.d} ${String(r.n).padStart(nw)}) ${r.l}`)));
  },

  add(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const { wt } = gitChanges(sh, root, st);
    const all = flags.has('A') || flags.has('--all') || flags.has('u') || rest.includes('.');
    if (!rest.length && !all) return fail('Nothing specified, nothing added.\nhint: Maybe you wanted to say \'git add .\'?');
    const ignored = [];
    const stage = f => { if (wt[f] !== undefined) st.index[f] = wt[f]; else delete st.index[f]; };
    if (all) {
      Object.keys(wt).forEach(f => { if (st.index[f] !== undefined || !gitIgnored(sh, root, st, f)) stage(f); });
      Object.keys(st.index).forEach(f => { if (wt[f] === undefined) stage(f); });
    }
    for (const r of rest) {
      if (r === '.') continue;
      const rel = gitRel(sh, root, r);
      if (rel === null) return fail(`fatal: ${r}: '${r}' is outside repository at '${root}'`, 128);
      const under = Object.keys(wt).concat(Object.keys(st.index)).filter(f => f === rel || (rel === '' ? true : f.startsWith(rel + '/')));
      if (!under.length) return fail(`fatal: pathspec '${r}' did not match any files`, 128);
      under.forEach(f => { if (st.index[f] === undefined && gitIgnored(sh, root, st, f)) ignored.push(f); else stage(f); });
    }
    if (ignored.length) return fail(`The following paths are ignored by one of your .gitignore files:\n${ignored.join('\n')}\nhint: Use -f if you really want to add them.`);
    return ok();
  },

  rm(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const out = [];
    for (const r of rest) {
      const rel = gitRel(sh, root, r);
      if (rel === null || st.index[rel] === undefined) return fail(`fatal: pathspec '${r}' did not match any files`, 128);
      delete st.index[rel];
      if (!flags.has('--cached')) gitDelete(sh, root, rel);
      out.push(`rm '${rel}'`);
    }
    return ok(join(out));
  },

  restore(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    if (!rest.length) return fail('fatal: you must specify path(s) to restore');
    const head = gitHead(st).files;
    for (const r of rest) {
      const rel = gitRel(sh, root, r);
      if (flags.has('--staged') || flags.has('S')) {
        if (rel === null || (st.index[rel] === undefined && head[rel] === undefined)) return fail(`error: pathspec '${r}' did not match any file(s) known to git`);
        if (head[rel] === undefined) delete st.index[rel]; else st.index[rel] = head[rel];
      } else {
        if (rel === null || st.index[rel] === undefined) return fail(`error: pathspec '${r}' did not match any file(s) known to git`);
        gitWrite(sh, root, rel, st.index[rel]);
      }
    }
    return ok();
  },

  checkout(sh, root, st, args) {
    const dd = args.indexOf('--');
    const { flags, rest } = parseOpts(dd >= 0 ? args.slice(0, dd) : args);
    const paths = dd >= 0 ? args.slice(dd + 1).map(p => gitRel(sh, root, p)) : [];
    if (flags.has('b')) {
      const name = rest[0];
      if (!name) return fail('fatal: branch name required');
      if (st.branches[name] !== undefined) return fail(`fatal: a branch named '${name}' already exists`, 128);
      st.branches[name] = st.head; st.branch = name;
      return ok(`Switched to a new branch '${name}'\n`);
    }
    if (paths.length || (rest.length && !gitRev(st, rest[0]) && gitRel(sh, root, rest[0]) !== null && (st.index[gitRel(sh, root, rest[0])] !== undefined))) {
      const src = paths.length && rest[0] ? gitRev(st, rest[0]) : null;
      if (paths.length && rest[0] && !src) return fail(`error: pathspec '${rest[0]}' did not match any file(s) known to git`);
      const list = paths.length ? paths : rest.map(p => gitRel(sh, root, p));
      for (const rel of list) {
        const content = src ? src.files[rel] : st.index[rel];
        if (rel === null || content === undefined) return fail(`error: pathspec '${rel}' did not match any file(s) known to git`);
        if (src) st.index[rel] = content;
        gitWrite(sh, root, rel, content);
      }
      return ok(src ? `Updated ${list.length} path${list.length > 1 ? 's' : ''} from ${src.hash}\n` : '');
    }
    const target = rest[0];
    if (!target) return ok(join(gitStatus(sh, root, st, false)));
    if (st.bisect) return fail('fatal: bisect aktifken checkout yapma, once git bisect reset');
    const c = gitRev(st, target);
    if (!c) return fail(`error: pathspec '${target}' did not match any file(s) known to git`);
    const isBranch = st.branches[target] !== undefined;
    if (isBranch && st.branch === target) return ok(`Already on '${target}'\n`);
    const dirty = gitDirtyError(sh, root, st, 'checkout');
    if (dirty && c.hash !== st.head) return dirty;
    const prev = gitHead(st);
    const wasDetached = !st.branch;
    gitCheckoutFiles(sh, root, st, c);
    if (isBranch) {
      st.branch = target;
      return ok((wasDetached ? `Previous HEAD position was ${prev.hash} ${prev.message.split('\n')[0]}\n` : '') + `Switched to branch '${target}'\n` + (st.remote[target] ? `Your branch is ${st.remote[target] === c.hash ? 'up to date with' : 'ahead of'} 'origin/${target}'.\n` : ''));
    }
    st.branch = null;
    return ok(`Note: switching to '${target}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n\nIf you want to create a new branch to retain commits you create, you may\ndo so (now or later) by using -c with the switch command. Example:\n\n  git switch -c <new-branch-name>\n\nOr undo this operation with:\n\n  git switch -\n\nHEAD is now at ${c.hash} ${c.message.split('\n')[0]}\n`);
  },

  switch(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    if (flags.has('c')) return GIT_SUB.checkout.call(null, sh, root, st, ['-b', rest[0]]);
    if (flags.has('--detach')) return GIT_SUB.checkout.call(null, sh, root, st, [rest[0]]);
    if (!rest[0] || st.branches[rest[0]] === undefined) return fail(`fatal: invalid reference: ${rest[0] || ''}`, 128);
    return GIT_SUB.checkout.call(null, sh, root, st, [rest[0]]);
  },

  branch(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    if (flags.has('d') || flags.has('D')) {
      const b = rest[0];
      if (st.branches[b] === undefined) return fail(`error: branch '${b}' not found.`);
      if (b === st.branch) return fail(`error: Cannot delete branch '${b}' checked out at '${root}'`);
      const h = st.branches[b]; delete st.branches[b];
      return ok(`Deleted branch ${b} (was ${h}).\n`);
    }
    if (rest[0]) {
      if (st.branches[rest[0]] !== undefined) return fail(`fatal: a branch named '${rest[0]}' already exists`, 128);
      st.branches[rest[0]] = rest[1] ? (gitRev(st, rest[1]) || {}).hash || st.head : st.head;
      return ok();
    }
    const out = [];
    if (!st.branch) out.push(`* (HEAD detached at ${st.head})`);
    Object.keys(st.branches).sort().forEach(b => out.push((b === st.branch ? '* ' : '  ') + b));
    if (flags.has('a') || flags.has('r')) Object.keys(st.remote).forEach(b => out.push(`  remotes/origin/${b}`));
    return ok(join(out));
  },

  commit(sh, root, st, args) {
    const { flags, vals } = parseOpts(args, 'm');
    const head = gitHead(st).files;
    if (flags.has('a') || flags.has('--all')) {
      const { unstaged, wt } = gitChanges(sh, root, st);
      unstaged.forEach(c => { if (wt[c.file] !== undefined) st.index[c.file] = wt[c.file]; else delete st.index[c.file]; });
    }
    const staged = gitChangedFiles(head, st.index);
    if (!staged.length) return { out: join(gitStatus(sh, root, st, false)), err: '', code: 1 };
    const msg = vals.m !== undefined ? vals.m : [...flags].filter(f => f.startsWith('--message=')).map(f => f.slice(10))[0];
    if (msg === undefined || !msg.trim()) return fail('Aborting commit due to empty commit message.\n💡 git commit -m "hostname: ne degisti ve neden"');
    const c = gitNewCommit(st, msg, st.index);
    return ok(join(gitCommitSummary(st, c)));
  },

  revert(sh, root, st, args) {
    const { rest } = parseOpts(args);
    const c = gitRev(st, rest[0]);
    if (!c) return fail(`fatal: bad revision '${rest[0] || ''}'`, 128);
    const dirty = gitDirtyError(sh, root, st, 'revert');
    if (dirty) return fail('error: your local changes would be overwritten by revert.\nhint: commit your changes or stash them to proceed.\nfatal: revert failed');
    const parent = gitParentFiles(st, c); const headFiles = Object.assign({}, gitHead(st).files);
    for (const ch of gitChangedFiles(parent, c.files)) {
      const f = ch.file;
      if (c.files[f] === undefined) { if (headFiles[f] === undefined) headFiles[f] = parent[f]; continue; }
      if (parent[f] === undefined) { if (headFiles[f] === c.files[f]) delete headFiles[f]; else return fail(`error: could not revert ${c.hash}... ${c.message.split('\n')[0]}\nCONFLICT (content): Merge conflict in ${f}`); continue; }
      if (headFiles[f] === undefined) return fail(`error: could not revert ${c.hash}... ${c.message.split('\n')[0]}\nCONFLICT (modify/delete): ${f} deleted in HEAD`);
      const ops = gitOps(lines(parent[f]), lines(c.files[f]));
      let cur = lines(headFiles[f]);
      const groups = []; let k = 0;
      while (k < ops.length) {
        if (ops[k][0] === '=') { k++; continue; }
        const s = k; while (k < ops.length && ops[k][0] !== '=') k++;
        groups.push({ before: ops.slice(Math.max(0, s - 3), s).map(o => o[1]), minus: ops.slice(s, k).filter(o => o[0] === '-').map(o => o[1]), plus: ops.slice(s, k).filter(o => o[0] === '+').map(o => o[1]), after: ops.slice(k, k + 3).map(o => o[1]) });
      }
      for (const g of groups) {
        const needle = g.before.concat(g.plus, g.after);
        let at = -1;
        for (let i = 0; i + needle.length <= cur.length; i++) if (needle.every((l, j) => cur[i + j] === l)) { at = i; break; }
        if (at < 0) return fail(`error: could not revert ${c.hash}... ${c.message.split('\n')[0]}\nhint: after resolving the conflicts, mark the corrected paths\nCONFLICT (content): Merge conflict in ${f}`);
        cur = cur.slice(0, at + g.before.length).concat(g.minus, cur.slice(at + g.before.length + g.plus.length));
      }
      headFiles[f] = join(cur);
    }
    const msg = `Revert "${c.message.split('\n')[0]}"\n\nThis reverts commit ${c.full}.`;
    st.index = Object.assign({}, headFiles);
    const n = gitNewCommit(st, msg, headFiles);
    Object.keys(gitHead(st).files).forEach(f => gitWrite(sh, root, f, headFiles[f]));
    Object.keys(c.files).forEach(f => { if (headFiles[f] === undefined) gitDelete(sh, root, f); });
    return ok(join(gitCommitSummary(st, n)));
  },

  reset(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const head = gitHead(st).files;
    const c = rest[0] ? gitRev(st, rest[0]) : null;
    if (rest.length && !c) {
      for (const r of rest) { const rel = gitRel(sh, root, r); if (rel === null || (st.index[rel] === undefined && head[rel] === undefined)) return fail(`fatal: ambiguous argument '${r}': unknown revision or path not in the working tree.`, 128); if (head[rel] === undefined) delete st.index[rel]; else st.index[rel] = head[rel]; }
      return ok();
    }
    const target = c || gitHead(st);
    if (flags.has('--hard')) { gitCheckoutFiles(sh, root, st, target); if (st.branch) st.branches[st.branch] = target.hash; return ok(`HEAD is now at ${target.hash} ${target.message.split('\n')[0]}\n`); }
    st.head = target.hash; if (st.branch) st.branches[st.branch] = target.hash;
    if (!flags.has('--soft')) st.index = Object.assign({}, target.files);
    const { unstaged } = gitChanges(sh, root, st);
    return ok(unstaged.length ? join(['Unstaged changes after reset:'].concat(unstaged.map(u => `M\t${u.file}`))) : '');
  },

  stash(sh, root, st, args) {
    const sub = args[0] && !args[0].startsWith('-') ? args[0] : 'push';
    const { flags, vals } = parseOpts(args.slice(args[0] === sub ? 1 : 0), 'm');
    const head = gitHead(st);
    if (sub === 'list') return ok(join(st.stash.map((s, i) => `stash@{${i}}: ${s.msg}`)));
    if (sub === 'clear') { st.stash = []; return ok(); }
    if (sub === 'push' || sub === 'save') {
      const { staged, unstaged, untracked, wt } = gitChanges(sh, root, st);
      const withU = flags.has('u') || flags.has('--include-untracked');
      if (!staged.length && !unstaged.length && !(withU && untracked.length)) return ok('No local changes to save\n');
      const changes = {};
      staged.concat(unstaged).forEach(c => { changes[c.file] = wt[c.file] === undefined ? null : wt[c.file]; });
      if (withU) untracked.forEach(f => { changes[f] = wt[f]; });
      const label = st.branch ? `On ${st.branch}` : 'On (no branch)';
      const msg = vals.m ? `${label}: ${vals.m}` : `WIP on ${st.branch || '(no branch)'}: ${head.hash} ${head.message.split('\n')[0]}`;
      st.stash.unshift({ id: gitHex(msg + Date.now(), 40), msg, changes });
      Object.keys(changes).forEach(f => { if (head.files[f] === undefined) gitDelete(sh, root, f); else gitWrite(sh, root, f, head.files[f]); });
      st.index = Object.assign({}, head.files);
      return ok(`Saved working directory and index state ${msg}\n`);
    }
    const idx = (() => { const a = args.find(x => /^stash@\{\d+\}$/.test(x)) || args.find(x => /^\d+$/.test(x)); return a ? +a.replace(/\D/g, '') : 0; })();
    const s = st.stash[idx];
    if (!s) return fail(st.stash.length ? `fatal: Log for 'refs/stash' only has ${st.stash.length} entries` : 'No stash entries found.', 128);
    if (sub === 'show') {
      const B = Object.assign({}, head.files); Object.keys(s.changes).forEach(f => { if (s.changes[f] === null) delete B[f]; else B[f] = s.changes[f]; });
      return ok(join(gitDiffText(head.files, B, [], !flags.has('p'))));
    }
    if (sub === 'drop') { st.stash.splice(idx, 1); return ok(`Dropped refs/stash@{${idx}} (${s.id})\n`); }
    if (sub === 'pop' || sub === 'apply') {
      Object.keys(s.changes).forEach(f => { if (s.changes[f] === null) gitDelete(sh, root, f); else gitWrite(sh, root, f, s.changes[f]); });
      const out = gitStatus(sh, root, st, false);
      if (sub === 'pop') { st.stash.splice(idx, 1); out.push(`Dropped refs/stash@{${idx}} (${s.id})`); }
      return ok(join(out));
    }
    return fail(`error: unknown subcommand: '${sub}'\nusage: git stash [list | show | drop | pop | apply | push | clear]`);
  },

  tag(sh, root, st, args) {
    const { flags, vals, rest } = parseOpts(args, 'm');
    if (flags.has('d')) { if (st.tags[rest[0]] === undefined) return fail(`error: tag '${rest[0]}' not found.`); const h = st.tags[rest[0]]; delete st.tags[rest[0]]; return ok(`Deleted tag '${rest[0]}' (was ${h})\n`); }
    if (!rest.length || flags.has('l')) return ok(join(Object.keys(st.tags).sort()));
    if (st.tags[rest[0]] !== undefined) return fail(`fatal: tag '${rest[0]}' already exists`, 128);
    const c = rest[1] ? gitRev(st, rest[1]) : gitHead(st);
    if (!c) return fail(`fatal: Failed to resolve '${rest[1]}' as a valid ref.`, 128);
    if (flags.has('a') && vals.m === undefined) return fail('fatal: no tag message?\n💡 git tag -a isim -m "mesaj"');
    st.tags[rest[0]] = c.hash;
    return ok();
  },

  remote(sh, root, st, args) {
    if (args.includes('-v') || args.includes('--verbose') || args[0] === 'show') return ok(`origin\t${GIT_REMOTE} (fetch)\norigin\t${GIT_REMOTE} (push)\n`);
    if (args[0] === 'get-url') return ok(GIT_REMOTE + '\n');
    return ok('origin\n');
  },
  pull() { return gitNoNet('pull'); },
  push() { return gitNoNet('push'); },
  fetch() { return gitNoNet('fetch'); },

  config(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const all = { 'user.name': st.user[0], 'user.email': st.user[1], 'remote.origin.url': GIT_REMOTE, 'core.editor': 'nano', 'branch.main.remote': 'origin' };
    if (flags.has('--list') || flags.has('l')) return ok(join(Object.keys(all).map(k => `${k}=${all[k]}`)));
    if (!rest[0]) return fail('usage: git config [--list] | git config <key> [<value>]');
    if (rest[1] !== undefined) {
      if (rest[0] === 'user.name') st.user[0] = rest[1]; else if (rest[0] === 'user.email') st.user[1] = rest[1];
      return ok();
    }
    return all[rest[0]] !== undefined ? ok(all[rest[0]] + '\n') : { out: '', err: '', code: 1 };
  },

  bisect(sh, root, st, args) {
    const sub = args[0];
    const b = st.bisect;
    if (!sub) return fail('usage: git bisect [help|start|bad|good|new|old|terms|skip|next|reset|visualize|view|replay|log|run]');
    if (sub === 'start') {
      if (b) return fail('fatal: zaten bisect icindesin, git bisect reset ile cik');
      const dirty = gitDirtyError(sh, root, st, 'checkout');
      if (dirty) return dirty;
      st.bisect = { branch: st.branch, head: st.head, good: null, bad: null, done: null, log: ['git bisect start'] };
      const extra = args.slice(1).filter(a => !a.startsWith('-'));
      let out = 'status: waiting for both good and bad commits\n';
      if (extra[0]) { const r = GIT_SUB.bisect(sh, root, st, ['bad', extra[0]]); if (r.err) return r; out = r.out; }
      if (extra[1]) { const r = GIT_SUB.bisect(sh, root, st, ['good', extra[1]]); if (r.err) return r; out = r.out; }
      return ok(out);
    }
    if (sub === 'reset') {
      if (!b) return fail('We are not bisecting.');
      const prev = gitHead(st);
      const target = gitFind(st, args[1] ? (gitRev(st, args[1]) || {}).hash || b.head : b.head);
      gitCheckoutFiles(sh, root, st, target);
      st.branch = b.branch; st.bisect = null;
      return ok((prev.hash !== target.hash ? `Previous HEAD position was ${prev.hash} ${prev.message.split('\n')[0]}\n` : '') + (st.branch ? `Switched to branch '${st.branch}'\n` : `HEAD is now at ${target.hash}\n`));
    }
    if (!b) return fail('You need to start by "git bisect start"\nDo you want me to do it for you [Y/n]? Burada Y yok, git bisect start yaz');
    if (sub === 'log') return ok(join(b.log));
    if (sub === 'bad' || sub === 'good' || sub === 'new' || sub === 'old') {
      const isBad = sub === 'bad' || sub === 'new';
      const c = args[1] ? gitRev(st, args[1]) : gitHead(st);
      if (!c) return fail(`error: Bad rev input: ${args[1]}`);
      if (b.done) return fail(`fatal: bisect bitti, ${b.done} is the first bad commit. git bisect reset ile cik`);
      if (isBad) b.bad = c.hash; else b.good = c.hash;
      b.log.push(`git bisect ${sub} ${c.full}`);
      return gitBisectStep(sh, root, st);
    }
    if (sub === 'run') {
      if (b.good === null || b.bad === null) return fail('error: bisect run failed: good and bad commits must be marked first');
      const cmd = args.slice(1).join(' ');
      if (!cmd) return fail('usage: git bisect run <cmd>...');
      const out = [];
      for (let i = 0; i < 20 && !b.done; i++) {
        out.push(`running  '${cmd}'`);
        let code = 0;
        try { code = sh.execList(cmd, (t, cls) => { if (cls !== 'err') out.push(t.replace(/\n$/, '')); else out.push(t.replace(/\n$/, '')); }); } catch (e) { code = 1; }
        const r = GIT_SUB.bisect(sh, root, st, [code === 0 ? 'good' : 'bad']);
        if (r.err) { out.push(r.err.replace(/\n$/, '')); break; }
        out.push(r.out.replace(/\n$/, ''));
      }
      if (b.done) out.push('bisect found first bad commit');
      return ok(join(out));
    }
    return fail(`error: unknown bisect subcommand '${sub}'`);
  },
};

const GIT_USAGE = `usage: git [--version] [--help] <command> [<args>]

Bu lab'da desteklenen komutlar

   status     Working tree durumunu goster
   log        Commit gecmisi, --oneline -n N --author= --since= --stat -p
   show       Bir commit'i mesaj ve diff ile goster, HEAD~2 ya da hash
   diff       Working tree, index ve commit'ler arasi fark
   blame      Dosyadaki her satiri kim, ne zaman yazdi
   bisect     Hatali commit'i binary search ile bul, start bad good run reset
   add        Degisiklikleri stage et
   commit     Stage edilenleri commit et, -m "mesaj"
   restore    Dosyayi geri al, --staged ile unstage
   checkout   Commit, branch ya da dosya checkout
   branch     Branch listele ya da olustur
   stash      Degisiklikleri kenara al, pop ile geri getir
   revert     Bir commit'i tersine ceviren yeni commit
   reset      HEAD ve index'i tasi
   tag        Tag listele ya da olustur
   remote     Remote'lari goster
   pull push  Remote senkron, bu lab'da network yok
`;

function gitCommand(args) {
  const sub = args[0];
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') return ok(GIT_USAGE);
  if (sub === '--version' || sub === 'version') return ok('git version 2.43.0\n');
  if (sub === 'clone') return gitNoNet('clone');
  if (sub === 'init') return fail('git init: bu lab tek repo ile calisir, cd ~/netconfigs');
  const root = gitRepoRoot(this);
  if (!root) return fail('fatal: not a git repository (or any of the parent directories): .git', 128);
  const st = gitLoad(this, root);
  if (!st) return fail('fatal: .git/lab-state.json bozuk, Profil sekmesinden filesystem\'i sifirla', 128);
  const fn = GIT_SUB[sub];
  if (!fn) return fail(`git: '${sub}' is not a git command. See 'git --help'.`);
  const r = fn(this, root, st, args.slice(1)) || ok();
  gitSave(this, root, st);
  return r;
}

registerExt({
  files: gitFreshFiles(),
  commands: { git: gitCommand },
  manual: {
    git: { d: 'Version control. Config repo\'sunda kim neyi ne zaman degistirdi, hepsi burada', u: ['git status', 'git log [--oneline] [-n N] [--author=isim] [--stat] [-p]', 'git show <hash|HEAD~N>', 'git diff [<a> <b>] [-- dosya]', 'git blame dosya', 'git bisect start|bad|good|run|reset', 'git add dosya, git commit -m "mesaj"', 'git stash, git stash pop', 'git checkout <rev> -- dosya', 'git revert <hash>'], e: ['git log --oneline', 'git show HEAD~1', 'git diff v1.0 HEAD -- branch-ams-01.conf', 'git blame branch-ams-01.conf', 'git bisect start && git bisect bad && git bisect good v1.0'] },
    'git-log': { d: 'Commit gecmisini listeler, en yeni ustte', u: ['git log', 'git log --oneline', 'git log -n 3', 'git log --author=ayse', 'git log --since=2026-09-20', 'git log --stat', 'git log -p dosya'], e: ['git log --oneline --author=mehmet', 'git log -3 --stat'] },
    'git-diff': { d: 'Iki durum arasindaki satir farkini unified diff olarak gosterir', u: ['git diff, working tree ile index', 'git diff --staged, index ile HEAD', 'git diff <a> <b>', 'git diff <a>..<b> -- dosya'], e: ['git diff', 'git diff HEAD~3 HEAD', 'git diff v1.0..HEAD -- branch-ams-01.conf'] },
    'git-blame': { d: 'Dosyanin her satirini yazan commit, kisi ve tarihi gosterir', u: ['git blame dosya', 'git blame -L 10,20 dosya'], e: ['git blame branch-ams-01.conf', 'git blame -L 11,16 branch-ams-01.conf'] },
    'git-bisect': { d: 'Iyi ve kotu commit arasinda binary search ile hatayi getiren commit\'i bulur', u: ['git bisect start', 'git bisect bad [rev]', 'git bisect good <rev>', 'her adimda test et, sonra git bisect good ya da bad', 'git bisect run ./script.sh, exit 0 good 1 bad', 'git bisect reset'], e: ['git bisect start', 'git bisect bad', 'git bisect good v1.0', 'git bisect run ./check-policy.sh', 'git bisect reset'] },
    'git-stash': { d: 'Commit etmeye hazir olmayan degisiklikleri kenara alir, sonra geri getirir', u: ['git stash', 'git stash list', 'git stash pop', 'git stash -u, untracked dahil'], e: ['git stash', 'git stash pop'] },
    'git-commit': { d: 'Stage edilmis degisiklikleri bir commit olarak kaydeder', u: ['git add dosya', 'git commit -m "hostname: ne degisti ve neden"', 'git commit -am "mesaj", tracked degisikliklerin hepsi'], e: ['git add branch-ams-01.conf', 'git commit -m "branch-ams-01: restore WAN mtu 1500"'] },
  },
  onReset: sh => { gitFreshFiles().forEach(f => sh.install(f.path, f.node)); },
});
