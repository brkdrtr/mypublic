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
function gitAgo(iso) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso.slice(0, 19) + 'Z').getTime() + 2 * 3600e3) / 1000));
  const u = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  for (const [n, name] of u) if (s >= n) { const k = Math.floor(s / n); return `${k} ${name}${k > 1 ? 's' : ''} ago`; }
  return `${s} seconds ago`;
}
function gitSubject(c) { return c.message.split('\n')[0]; }
function gitParents(c) { return c.parents || (c.parent ? [c.parent] : []); }

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

/* Bos repo durumu, git init ve G_API.createRepo bunu kullanir */
function gitEmptyState(branch) {
  return { commits: [], head: null, branch: branch || 'main', branches: {}, remote: {}, tags: {}, tagObjs: {}, index: {}, stash: [], bisect: null, user: null, config: {}, remotes: {}, upstream: {}, reflog: [], merge: null, rebase: null, cherry: null };
}
/* Eski kayitlardan gelen durumlara yeni alanlari ekler */
function gitNorm(st) {
  if (!st.branches) st.branches = {};
  if (!st.remote) st.remote = {};
  if (!st.tags) st.tags = {};
  if (!st.tagObjs) st.tagObjs = {};
  if (!st.index) st.index = {};
  if (!st.stash) st.stash = [];
  if (st.bisect === undefined) st.bisect = null;
  if (!st.config) { st.config = {}; if (st.user) { st.config['user.name'] = st.user[0]; st.config['user.email'] = st.user[1]; } }
  if (!st.remotes) st.remotes = Object.keys(st.remote).length ? { origin: { url: GIT_REMOTE, offline: true, refs: Object.assign({}, st.remote), tags: {} } } : {};
  if (!st.upstream) { st.upstream = {}; Object.keys(st.remote).forEach(b => { st.upstream[b] = 'origin/' + b; }); }
  if (!st.reflog) st.reflog = [];
  if (st.merge === undefined) st.merge = null;
  if (st.rebase === undefined) st.rebase = null;
  if (st.cherry === undefined) st.cherry = null;
  return st;
}

function gitFreshState() {
  const commits = gitBuildCommits();
  const head = commits[commits.length - 1].hash;
  const tags = {}; tags[GIT_GOOD_TAG] = '0a9e6d1';
  const st = gitNorm({ commits, head, branch: 'main', branches: { main: head }, remote: { main: head }, tags, index: Object.assign({}, commits[commits.length - 1].files), stash: [], bisect: null, user: GIT_PEOPLE.burak.slice() });
  st.reflog = [{ hash: head, msg: 'clone: from ' + GIT_REMOTE }];
  return st;
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
  files.push({ path: GIT_ROOT + '/.git/config', node: mkfile(gitConfigText(st), 0o644, U) });
  files.push({ path: GIT_ROOT + '/.git/lab-state.json', node: mkfile(JSON.stringify(st), 0o644, U) });
  return files;
}

/* ---------- repo erisimi ---------- */

function gitRepoRoot(sh, from) {
  let p = from || sh.cwd;
  while (true) {
    const n = sh.node(p + '/.git/lab-state.json');
    if (n && n.t === 'f') return p;
    if (p === '/' || p === '') return null;
    p = p.slice(0, p.lastIndexOf('/')) || '/';
  }
}
function gitLoad(sh, root) {
  const n = sh.node(root + '/.git/lab-state.json');
  try { return gitNorm(JSON.parse(n.d)); } catch (e) { return null; }
}
function gitConfigText(st) {
  const out = ['[core]', '\trepositoryformatversion = 0', '\tfilemode = true', '\tbare = false', '\tlogallrefupdates = true'];
  Object.keys(st.remotes || {}).forEach(r => out.push(`[remote "${r}"]`, `\turl = ${st.remotes[r].url}`, `\tfetch = +refs/heads/*:refs/remotes/${r}/*`));
  Object.keys(st.upstream || {}).forEach(b => { const [r, rb] = st.upstream[b].split('/'); out.push(`[branch "${b}"]`, `\tremote = ${r}`, `\tmerge = refs/heads/${rb}`); });
  const u = Object.keys(st.config || {}).filter(k => k.startsWith('user.'));
  if (u.length) { out.push('[user]'); u.forEach(k => out.push(`\t${k.slice(5)} = ${st.config[k]}`)); }
  Object.keys(st.config || {}).filter(k => !k.startsWith('user.')).forEach(k => { const [s, key] = k.split('.'); out.push(`[${s}]`, `\t${key} = ${st.config[k]}`); });
  return join(out);
}
function gitSave(sh, root, st) {
  const n = sh.node(root + '/.git/lab-state.json');
  if (n) n.d = JSON.stringify(st);
  const h = sh.node(root + '/.git/HEAD');
  const headTxt = st.branch ? `ref: refs/heads/${st.branch}\n` : (st.head ? (gitFind(st, st.head) || { full: st.head }).full + '\n' : 'ref: refs/heads/main\n');
  if (h) h.d = headTxt; else gitInstall(sh, root + '/.git/HEAD', mkfile(headTxt, 0o644, 'burak'));
  const c = sh.node(root + '/.git/config');
  if (c) c.d = gitConfigText(st); else gitInstall(sh, root + '/.git/config', mkfile(gitConfigText(st), 0o644, 'burak'));
}
function gitFind(st, h) { if (!h) return null; return st.commits.find(c => c.hash === h || c.full === h) || null; }
function gitRev(st, spec) {
  if (!spec) return null;
  const m = /^(.*?)((?:[~^]\d*)*)$/.exec(spec);
  let base = m[1] || 'HEAD';
  if (base === '@') base = 'HEAD';
  const rl = /^HEAD@\{(\d+)\}$/.exec(base);
  if (rl) { const e = st.reflog[+rl[1]]; if (!e) return null; base = e.hash; }
  if (base.startsWith('origin/')) base = base.slice(7) in st.remote ? st.remote[base.slice(7)] : base;
  for (const r of Object.keys(st.remotes || {})) if (base.startsWith(r + '/') && st.remote[base.slice(r.length + 1)] !== undefined) base = st.remote[base.slice(r.length + 1)];
  let c = base === 'HEAD' ? gitFind(st, st.head)
    : st.branches[base] !== undefined ? gitFind(st, st.branches[base])
      : st.tags[base] !== undefined ? gitFind(st, st.tags[base])
        : /^[0-9a-f]{4,40}$/.test(base) ? st.commits.find(x => x.full.startsWith(base)) || null : null;
  const mods = m[2].match(/[~^]\d*/g) || [];
  for (const md of mods) {
    if (md[0] === '^' && md.length > 1) { const k = +md.slice(1); const ps = c ? gitParents(c) : []; c = k === 0 ? c : gitFind(st, ps[k - 1]); continue; }
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
function gitHeadFiles(st) { const h = gitHead(st); return h ? h.files : {}; }
/* tum parent'lar uzerinden erisilebilen commit kumesi */
function gitAncestors(st, starts) {
  const seen = new Set(); const stack = (Array.isArray(starts) ? starts : [starts]).filter(Boolean);
  while (stack.length) { const h = stack.pop(); if (!h || seen.has(h)) continue; const c = gitFind(st, h); if (!c) continue; seen.add(c.hash); gitParents(c).forEach(p => stack.push(p)); }
  return seen;
}
/* erisilebilen commit'ler, yeni olan ustte, topolojik sira commit listesindeki indeks ile */
function gitReachable(st, starts, excludes) {
  const inc = gitAncestors(st, starts); const exc = excludes ? gitAncestors(st, excludes) : new Set();
  return st.commits.filter(c => inc.has(c.hash) && !exc.has(c.hash)).reverse();
}
function gitIsAncestor(st, a, b) { return a === b || gitAncestors(st, b).has(a); }
function gitMergeBase(st, a, b) {
  const A = gitAncestors(st, a);
  for (const c of gitReachable(st, b)) if (A.has(c.hash)) return c;
  return null;
}
function gitRel(sh, root, p) {
  const abs = sh.resolve(p);
  if (abs === root) return '';
  return abs.startsWith(root + '/') ? abs.slice(root.length + 1) : null;
}

/* ---------- kimlik ve config ---------- */

function gitIniParse(text) {
  const out = {}; let sec = '';
  lines(text || '').forEach(l => {
    const s = l.trim(); if (!s || s.startsWith('#') || s.startsWith(';')) return;
    const m = /^\[([^\]"]+)(?:\s+"([^"]*)")?\]$/.exec(s);
    if (m) { sec = m[2] !== undefined ? `${m[1]}.${m[2]}` : m[1]; return; }
    const kv = /^([^=]+?)\s*=\s*(.*)$/.exec(s);
    if (kv && sec) out[`${sec}.${kv[1].trim()}`] = kv[2];
  });
  return out;
}
function gitIniText(obj) {
  const secs = {};
  Object.keys(obj).forEach(k => { const i = k.lastIndexOf('.'); const s = k.slice(0, i), key = k.slice(i + 1); (secs[s] = secs[s] || []).push(`\t${key} = ${obj[k]}`); });
  const out = [];
  Object.keys(secs).forEach(s => { const j = s.indexOf('.'); out.push(j < 0 ? `[${s}]` : `[${s.slice(0, j)} "${s.slice(j + 1)}"]`, ...secs[s]); });
  return join(out);
}
function gitGlobalConfig(sh) { const n = sh.node(HOME + '/.gitconfig'); return gitIniParse(n && n.t === 'f' ? n.d : ''); }
function gitGlobalSet(sh, key, value) {
  const cfg = gitGlobalConfig(sh);
  if (value === null) delete cfg[key]; else cfg[key] = value;
  const n = sh.node(HOME + '/.gitconfig');
  if (n && n.t === 'f') { n.d = gitIniText(cfg); n.ts = Date.now(); } else gitInstall(sh, HOME + '/.gitconfig', mkfile(gitIniText(cfg), 0o644, 'burak'));
}
function gitConfigGet(sh, st, key) {
  if (st && st.config[key] !== undefined) return st.config[key];
  const g = gitGlobalConfig(sh);
  return g[key] !== undefined ? g[key] : undefined;
}
function gitIdentity(sh, st) {
  const name = gitConfigGet(sh, st, 'user.name'), email = gitConfigGet(sh, st, 'user.email');
  if (name === undefined && email === undefined) return null;
  return [name || (email ? email.split('@')[0] : 'burak'), email || `${(name || 'burak').toLowerCase().replace(/\s+/g, '.')}@linuxlab.local`];
}
function gitIdentityError(sh) {
  return fail(`Author identity unknown\n\n*** Please tell me who you are.\n\nRun\n\n  git config --global user.email "you@example.com"\n  git config --global user.name "Your Name"\n\nto set your account's default identity.\nOmit --global to set the identity only in this repository.\n\nfatal: unable to auto-detect email address (got 'burak@linuxlab.(none)')`, 128);
}

/* ---------- calisma agaci okuma ve yazma ---------- */

function gitWorkTree(sh, root) {
  const out = {};
  const walk = (node, pre) => {
    for (const k of Object.keys(node.c)) {
      if (k === '.git') continue;
      const n = node.c[k];
      if (n.t === 'd') { if (pre && n.c['.git']) continue; walk(n, pre + k + '/'); } else out[pre + k] = n.d;
    }
  };
  const r = sh.node(root);
  if (r && r.t === 'd') walk(r, '');
  return out;
}
/* sh.install ara dizinleri root'a verir, repo icinde kullanici yazamaz. Burada ara dizinler burak'in olur */
function gitInstall(sh, abs, node) {
  const parts = abs.split('/').filter(Boolean);
  let dir = sh.root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!dir.c[parts[i]]) dir.c[parts[i]] = mkdir({}, 0o755, 'burak');
    dir = dir.c[parts[i]];
  }
  dir.c[parts[parts.length - 1]] = node;
}
function gitWrite(sh, root, rel, content) {
  const abs = root + '/' + rel;
  const n = sh.node(abs);
  if (n && n.t === 'f') { n.d = content; n.ts = Date.now(); return; }
  gitInstall(sh, abs, mkfile(content, rel.endsWith('.sh') ? 0o755 : 0o644, 'burak'));
}
function gitDelete(sh, root, rel) {
  const { dir, name } = sh.parent(root + '/' + rel);
  if (dir && dir.c[name]) delete dir.c[name];
  /* bosalan ara dizinleri de kaldir, git de izlenmeyen bos dizin birakmaz */
  let p = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
  while (p) { const d = sh.node(root + '/' + p); if (d && d.t === 'd' && !Object.keys(d.c).length) { const pp = sh.parent(root + '/' + p); delete pp.dir.c[pp.name]; p = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : ''; } else break; }
}
function gitIgnored(sh, root, st, rel) {
  const n = sh.node(root + '/.gitignore');
  const pats = lines(n && n.t === 'f' ? n.d : (st.index['.gitignore'] || '')).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  const segs = rel.split('/');
  let ignored = false;
  for (let p of pats) {
    const neg = p.startsWith('!'); if (neg) p = p.slice(1);
    const dirOnly = p.endsWith('/'); p = p.replace(/\/$/, '');
    const anchored = p.includes('/'); p = p.replace(/^\//, '');
    const re = globToRe(p);
    let hit = false;
    if (anchored) {
      for (let i = 1; i <= segs.length; i++) { const sub = segs.slice(0, i).join('/'); const isDir = i < segs.length; if ((!dirOnly || isDir) && re.test(sub)) { hit = true; break; } }
    } else {
      for (let i = 0; i < segs.length; i++) { const isDir = i < segs.length - 1; if ((!dirOnly || isDir) && re.test(segs[i])) { hit = true; break; } }
    }
    if (hit) ignored = !neg;
  }
  return ignored;
}
function gitConflictFiles(st) { const s = st.merge || st.rebase || st.cherry; return s && s.conflicts ? s.conflicts : []; }
function gitChangedFiles(A, B) {
  const names = Array.from(new Set(Object.keys(A).concat(Object.keys(B)))).sort();
  return names.filter(f => A[f] !== B[f]).map(f => ({ file: f, kind: A[f] === undefined ? 'new file' : B[f] === undefined ? 'deleted' : 'modified' }));
}
function gitChanges(sh, root, st) {
  const head = gitHeadFiles(st); const wt = gitWorkTree(sh, root);
  const conf = gitConflictFiles(st);
  const tracked = {}; Object.keys(st.index).forEach(f => { if (wt[f] !== undefined) tracked[f] = wt[f]; });
  const staged = gitChangedFiles(head, st.index).filter(c => !conf.includes(c.file));
  const unstaged = gitChangedFiles(st.index, tracked).filter(c => !conf.includes(c.file));
  const untracked = Object.keys(wt).filter(f => st.index[f] === undefined && !gitIgnored(sh, root, st, f)).sort();
  return { staged, unstaged, untracked, wt, tracked };
}
/* untracked listesinde tamamen izlenmeyen dizinler tek satira iner, git de oyle yapar */
function gitCollapse(st, untracked) {
  const out = []; const seen = new Set();
  for (const f of untracked) {
    if (!f.includes('/')) { out.push(f); continue; }
    const top = f.slice(0, f.indexOf('/') + 1);
    const trackedUnder = Object.keys(st.index).some(k => k.startsWith(top));
    if (trackedUnder) { out.push(f); continue; }
    if (!seen.has(top)) { seen.add(top); out.push(top); }
  }
  return out;
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

/* ---------- uc yollu birlestirme, basit diff3 ---------- */

function gitMatch(o, x) {
  const ops = gitOps(o, x); const m = new Array(o.length).fill(-1); let oi = 0, xi = 0;
  for (const op of ops) { if (op[0] === '=') { m[oi] = xi; oi++; xi++; } else if (op[0] === '-') oi++; else xi++; }
  return m;
}
function gitDiff3(o, a, b, labelA, labelB) {
  const ma = gitMatch(o, a), mb = gitMatch(o, b);
  const eq = (x, y) => x.length === y.length && x.every((l, i) => l === y[i]);
  const out = []; let conflicts = 0; let i = 0, ai = 0, bi = 0;
  while (true) {
    let k = i; while (k < o.length && (ma[k] < 0 || mb[k] < 0)) k++;
    const aEnd = k < o.length ? ma[k] : a.length, bEnd = k < o.length ? mb[k] : b.length;
    const oc = o.slice(i, k), ac = a.slice(ai, aEnd), bc = b.slice(bi, bEnd);
    if (oc.length || ac.length || bc.length) {
      if (eq(oc, ac)) out.push(...bc);
      else if (eq(oc, bc)) out.push(...ac);
      else if (eq(ac, bc)) out.push(...ac);
      else { conflicts++; out.push(`<<<<<<< ${labelA}`, ...ac, '=======', ...bc, `>>>>>>> ${labelB}`); }
    }
    if (k >= o.length) break;
    out.push(o[k]); i = k + 1; ai = aEnd + 1; bi = bEnd + 1;
  }
  return { lines: out, conflicts };
}
/* snapshot duzeyinde 3 yollu birlestirme. {files, conflicts, log} */
function gitMerge3(base, ours, theirs, labelA, labelB) {
  const files = Object.assign({}, ours); const conflicts = []; const log = [];
  const names = Array.from(new Set(Object.keys(base).concat(Object.keys(ours), Object.keys(theirs)))).sort();
  for (const f of names) {
    const o = base[f], a = ours[f], b = theirs[f];
    if (a === b) continue;
    if (b === o) continue;
    if (a === o) { if (b === undefined) delete files[f]; else files[f] = b; continue; }
    if (a === undefined || b === undefined) {
      conflicts.push(f); files[f] = a === undefined ? b : a;
      log.push(`CONFLICT (modify/delete): ${f} deleted in ${a === undefined ? labelA : labelB} and modified in ${a === undefined ? labelB : labelA}.  Version ${a === undefined ? labelB : labelA} of ${f} left in tree.`);
      continue;
    }
    log.push(`Auto-merging ${f}`);
    const r = gitDiff3(lines(o === undefined ? '' : o), lines(a), lines(b), labelA, labelB);
    files[f] = join(r.lines);
    if (r.conflicts) { conflicts.push(f); log.push(`CONFLICT (${o === undefined ? 'add/add' : 'content'}): Merge conflict in ${f}`); }
  }
  return { files, conflicts, log };
}

/* ---------- commit gosterimi ---------- */

function gitDecorList(st, c) {
  const d = [];
  if (st.head === c.hash) d.push(st.branch ? `HEAD -> ${st.branch}` : 'HEAD');
  Object.keys(st.branches).sort().forEach(b => { if (st.branches[b] === c.hash && b !== st.branch) d.push(b); });
  Object.keys(st.tags).sort().forEach(t => { if (st.tags[t] === c.hash) d.push(`tag: ${t}`); });
  Object.keys(st.remote).sort().forEach(b => { if (st.remote[b] === c.hash) d.push(`origin/${b}`); });
  return d;
}
function gitDecor(st, c) { const d = gitDecorList(st, c); return d.length ? ` (${d.join(', ')})` : ''; }
function gitHeader(st, c) {
  const out = [`commit ${c.full}${gitDecor(st, c)}`];
  const ps = gitParents(c);
  if (ps.length > 1) out.push(`Merge: ${ps.join(' ')}`);
  out.push(`Author: ${c.author} <${c.email}>`, `Date:   ${gitDate(c.date)}`, '');
  return out.concat(c.message.split('\n').map(l => l ? '    ' + l : ''), ['']);
}
function gitParentFiles(st, c) { const p = c.parent ? gitFind(st, c.parent) : null; return p ? p.files : {}; }
function gitFormat(st, c, fmt) {
  return fmt.replace(/%C\([^)]*\)|%Creset|%Cred|%Cgreen|%Cblue/g, '').replace(/%(H|h|an|ae|ad|ar|as|cd|cr|s|b|d|D|p|P|n)/g, (_, k) => ({
    H: c.full, h: c.hash, an: c.author, ae: c.email, ad: gitDate(c.date), ar: gitAgo(c.date), as: gitDate(c.date, 'short'), cd: gitDate(c.date), cr: gitAgo(c.date), s: gitSubject(c), b: c.message.split('\n').slice(2).join('\n'),
    d: gitDecor(st, c), D: gitDecorList(st, c).join(', '), p: gitParents(c).join(' '), P: gitParents(c).map(h => (gitFind(st, h) || { full: h }).full).join(' '), n: '\n',
  })[k]);
}

/* ASCII graph. list yeni olan ustte, fmt(c) satir dizisi doner */
function gitGraphLines(st, list, fmt) {
  const cols = []; const out = [];
  for (const c of list) {
    let idx = cols.indexOf(c.hash);
    if (idx < 0) { idx = cols.length; cols.push(c.hash); }
    const parents = gitParents(c); const text = fmt(c);
    const next = cols.slice(); let kind = 'same'; const added = []; let target = -1;
    if (!parents.length) { next.splice(idx, 1); kind = 'end'; }
    else {
      target = cols.findIndex((h, i) => i !== idx && h === parents[0]);
      if (target >= 0) { next.splice(idx, 1); kind = 'collapse'; } else next[idx] = parents[0];
      let at = kind === 'collapse' ? -1 : idx;
      for (const p of parents.slice(1)) {
        if (next.includes(p)) continue;
        if (at < 0) next.push(p); else { next.splice(at + 1, 0, p); at++; }
        added.push(p);
      }
    }
    const merge = added.length > 0 && kind !== 'collapse';
    const row = cols.map((h, i) => i === idx ? '*' : '|').join(' ') + (merge ? '  '.repeat(added.length) : '');
    out.push(row + ' ' + text[0]);
    let conn = null;
    if (merge) {
      const ch = [];
      for (let i = 0; i < cols.length; i++) { if (i < idx) ch.push('| '); else if (i === idx) { ch.push('|'); for (let k = 0; k < added.length; k++) ch.push('\\'); } else ch.push(' \\'); }
      conn = ch.join('');
    } else if ((kind === 'collapse' || kind === 'end') && cols.length > 1) {
      const ch = new Array(cols.length * 2).fill(' ');
      for (let i = 0; i < cols.length; i++) {
        if (i < idx) ch[2 * i] = '|';
        else if (i === idx) { if (kind === 'collapse' && target < idx) ch[2 * i - 1] = '/'; }
        else if (kind === 'collapse' && target < idx) ch[2 * i - 1] = '/';
        else { ch[2 * (i - 1)] = '|'; ch[2 * i - 1] = '/'; }
      }
      conn = ch.join('').replace(/\s+$/, '');
    }
    /* hedef lane bitisik degilse cizgi aradaki lane'leri gecerek sola kayar, git de |/| ile cizer */
    const extra = [];
    if (kind === 'collapse' && target >= 0 && target < idx - 1) {
      for (let k = 2; k <= idx - target; k++) {
        const ch = new Array(next.length * 2).fill(' ');
        next.forEach((h, q) => { ch[2 * q] = '|'; });
        ch[2 * (idx - k) + 1] = '/';
        extra.push(ch.join('').replace(/\s+$/, ''));
      }
    }
    const cont = next.map(() => '|').join(' ');
    if (text.length > 1) {
      for (let k = 1; k < text.length; k++) {
        const pre = k === 1 && conn ? conn.padEnd(Math.max(cont.length, conn.length)) : (k - 2 < extra.length && k >= 2 ? extra[k - 2].padEnd(cont.length) : cont);
        out.push((pre + ' ' + text[k]).replace(/\s+$/, ''));
      }
      if (text.length - 2 < extra.length) out.push(...extra.slice(Math.max(0, text.length - 2)));
    } else { if (conn) out.push(conn); out.push(...extra); }
    cols.length = 0; cols.push(...next);
  }
  return out;
}

function gitAheadBehind(st, local, remote) {
  if (!local || !remote) return null;
  const L = gitAncestors(st, local), R = gitAncestors(st, remote);
  let ahead = 0, behind = 0;
  L.forEach(h => { if (!R.has(h)) ahead++; }); R.forEach(h => { if (!L.has(h)) behind++; });
  return { ahead, behind };
}
function gitUpstreamOf(st, branch) {
  const u = st.upstream[branch]; if (!u) return null;
  const i = u.indexOf('/'); const rb = u.slice(i + 1);
  return st.remote[rb] !== undefined ? { name: u, hash: st.remote[rb], remote: u.slice(0, i), branch: rb } : { name: u, hash: null, remote: u.slice(0, i), branch: rb };
}
function gitStatus(sh, root, st, short) {
  const { staged, unstaged, untracked } = gitChanges(sh, root, st);
  const conf = gitConflictFiles(st);
  const out = [];
  /* git mv sonrasi: ayni icerikli silinen + eklenen cifti rename olarak goster */
  const head = gitHeadFiles(st);
  const renames = [];
  staged.filter(c => c.kind === 'deleted').forEach(d => { const n = staged.find(c => c.kind === 'new file' && st.index[c.file] === head[d.file]); if (n && !renames.some(r => r.to === n.file)) renames.push({ from: d.file, to: n.file }); });
  const stagedShown = staged.filter(c => !renames.some(r => r.from === c.file || r.to === c.file));
  if (short) {
    const all = {};
    stagedShown.forEach(c => { all[c.file] = (c.kind === 'new file' ? 'A' : c.kind === 'deleted' ? 'D' : 'M') + ' '; });
    renames.forEach(r => { all[`${r.from} -> ${r.to}`] = 'R '; });
    unstaged.forEach(c => { all[c.file] = (all[c.file] || ' ')[0] + (c.kind === 'deleted' ? 'D' : 'M'); });
    conf.forEach(f => { all[f] = 'UU'; });
    gitCollapse(st, untracked).forEach(f => { all[f] = '??'; });
    Object.keys(all).sort().forEach(f => out.push(`${all[f]} ${f}`));
    return out;
  }
  if (st.rebase) {
    const rb = st.rebase;
    out.push(`interactive rebase in progress; onto ${rb.onto}`);
    const done = rb.done.length + (rb.current ? 1 : 0);
    if (done) {
      out.push(`Last command${done > 1 ? 's' : ''} done (${done} command${done > 1 ? 's' : ''} done):`);
      rb.done.slice(-1).forEach(h => { const c = gitFind(st, h); out.push(`   pick ${c ? c.hash + ' ' + gitSubject(c) : h}`); });
      if (rb.current) { const c = gitFind(st, rb.current); out.push(`   pick ${c.hash} ${gitSubject(c)}`); }
    }
    if (rb.todo.length) { out.push(`Next command${rb.todo.length > 1 ? 's' : ''} to do (${rb.todo.length} remaining command${rb.todo.length > 1 ? 's' : ''}):`); rb.todo.slice(0, 1).forEach(h => { const c = gitFind(st, h); out.push(`   pick ${c.hash} ${gitSubject(c)}`); }); out.push('  (use "git rebase --edit-todo" to view and edit)'); }
    else out.push('No commands remaining.');
    out.push(`You are currently rebasing branch '${rb.branch}' on '${rb.onto}'.`);
    if (conf.length) out.push('  (fix conflicts and then run "git rebase --continue")', '  (use "git rebase --skip" to skip this patch)', '  (use "git rebase --abort" to check out the original branch)');
    else out.push('  (all conflicts fixed: run "git rebase --continue")');
  } else if (st.bisect) out.push(`HEAD detached at ${st.head}`, `You are currently bisecting, started from branch '${st.bisect.branch}'.`, '  (use "git bisect reset" to get back to the original branch)');
  else if (!st.branch) out.push(`HEAD detached at ${st.head}`);
  else {
    out.push(`On branch ${st.branch}`);
    const up = gitUpstreamOf(st, st.branch);
    if (up && up.hash) {
      const ab = gitAheadBehind(st, st.head, up.hash);
      if (ab.ahead && ab.behind) out.push(`Your branch and '${up.name}' have diverged,`, `and have ${ab.ahead} and ${ab.behind} different commit${ab.behind > 1 ? 's' : ''} each, respectively.`, '  (use "git pull" if you want to integrate the remote branch with yours)');
      else if (ab.ahead) out.push(`Your branch is ahead of '${up.name}' by ${ab.ahead} commit${ab.ahead > 1 ? 's' : ''}.`, '  (use "git push" to publish your local commits)');
      else if (ab.behind) out.push(`Your branch is behind '${up.name}' by ${ab.behind} commit${ab.behind > 1 ? 's' : ''}, and can be fast-forwarded.`, '  (use "git pull" to update your local branch)');
      else out.push(`Your branch is up to date with '${up.name}'.`);
    }
    if (st.merge) {
      if (conf.length) out.push('You have unmerged paths.', '  (fix conflicts and run "git commit")', '  (use "git merge --abort" to abort the merge)');
      else out.push('All conflicts fixed but you are still merging.', '  (use "git commit" to conclude merge)');
    } else if (st.cherry) {
      out.push(`You are currently cherry-picking commit ${st.cherry.hash}.`);
      if (conf.length) out.push('  (fix conflicts and run "git cherry-pick --continue")', '  (use "git cherry-pick --skip" to skip this patch)', '  (use "git cherry-pick --abort" to cancel the cherry-pick operation)');
      else out.push('  (all conflicts fixed: run "git cherry-pick --continue")');
    }
  }
  /* git sadece "On branch x" basligindan sonra bos satir koymaz, upstream satiri ya da bolum varsa koyar */
  const sep = () => { if (out.length > 1) out.push(''); };
  if (!st.head) out.push('', 'No commits yet');
  if (staged.length) { sep(); out.push('Changes to be committed:', st.head ? '  (use "git restore --staged <file>..." to unstage)' : '  (use "git rm --cached <file>..." to unstage)', ...renames.map(r => `\trenamed:    ${r.from} -> ${r.to}`), ...stagedShown.map(c => `\t${(c.kind + ':').padEnd(12)}${c.file}`)); }
  if (conf.length) { sep(); out.push('Unmerged paths:', '  (use "git add <file>..." to mark resolution)', ...conf.map(f => `\tboth modified:   ${f}`)); }
  if (unstaged.length) { sep(); out.push('Changes not staged for commit:', '  (use "git add <file>..." to update what will be committed)', '  (use "git restore <file>..." to discard changes in working directory)', ...unstaged.map(c => `\t${(c.kind + ':').padEnd(12)}${c.file}`)); }
  const unt = gitCollapse(st, untracked);
  if (unt.length) { sep(); out.push('Untracked files:', '  (use "git add <file>..." to include in what will be committed)', ...unt.map(f => '\t' + f)); }
  sep();
  if (conf.length) out.push('no changes added to commit (use "git add" and/or "git commit -a")');
  else if (!staged.length && !unstaged.length && !untracked.length) { if (!st.merge) out.push('nothing to commit, working tree clean'); }
  else if (!staged.length && unstaged.length) out.push('no changes added to commit (use "git add" and/or "git commit -a")');
  else if (!staged.length) out.push('nothing added to commit but untracked files present (use "git add" to track)');
  while (out.length && out[out.length - 1] === '') out.pop();
  if (staged.length && !unstaged.length && !untracked.length && !conf.length) out.push('');
  return out.filter((l, i, a) => !(l === '' && a[i - 1] === ''));
}

/* snapshot'i working tree'ye yaz, index'i esitle. keep: tasinacak yerel degisiklikler */
function gitCheckoutFiles(sh, root, st, c, keep) {
  const cur = gitHeadFiles(st); keep = keep || {};
  Object.keys(cur).forEach(f => { if (c.files[f] === undefined && !keep[f]) gitDelete(sh, root, f); });
  Object.keys(c.files).forEach(f => { if (!keep[f]) gitWrite(sh, root, f, c.files[f]); });
  st.head = c.hash;
  st.index = Object.assign({}, c.files);
  Object.keys(keep).forEach(f => { if (keep[f].index === undefined) delete st.index[f]; else st.index[f] = keep[f].index; });
}
/* yerel degisiklikler hedef commit ile cakisiyorsa hata, cakismiyorsa tasinacaklari doner */
function gitDirtyCheck(sh, root, st, target, what) {
  const { staged, unstaged, wt } = gitChanges(sh, root, st);
  const head = gitHeadFiles(st);
  const files = Array.from(new Set(staged.concat(unstaged).map(c => c.file))).sort();
  const clash = files.filter(f => head[f] !== target.files[f]);
  if (clash.length) return { err: fail(`error: Your local changes to the following files would be overwritten by ${what}:\n${clash.map(f => '\t' + f).join('\n')}\nPlease commit your changes or stash them before you switch branches.\nAborting`) };
  const keep = {}; files.forEach(f => { keep[f] = { index: st.index[f], wt: wt[f] }; });
  return { keep };
}
function gitDirtyError(sh, root, st, what) {
  const { staged, unstaged } = gitChanges(sh, root, st);
  const files = Array.from(new Set(staged.concat(unstaged).map(c => c.file))).sort();
  if (!files.length) return null;
  return fail(`error: Your local changes to the following files would be overwritten by ${what}:\n${files.map(f => '\t' + f).join('\n')}\nPlease commit your changes or stash them before you switch branches.\nAborting`);
}
function gitReflog(st, hash, msg) { st.reflog.unshift({ hash, msg }); if (st.reflog.length > 200) st.reflog.length = 200; }
/* Deterministik hash. Ayni parent, mesaj, yazar ve icerik ayni hash'i verir */
function gitNewCommit(st, message, files, opts) {
  opts = opts || {};
  const parents = opts.parents || (st.head ? [st.head] : []);
  const author = opts.author || (st.user ? st.user[0] : 'Burak Dartar'), email = opts.email || (st.user ? st.user[1] : 'burak@netlab.local');
  const snap = {}; Object.keys(files).sort().forEach(k => { if (files[k] !== undefined && files[k] !== null) snap[k] = files[k]; });
  let short = gitHex(parents.join(',') + '|' + message + '|' + author + '|' + JSON.stringify(snap), 7);
  while (gitFind(st, short) || !/[a-f]/.test(short)) short = gitHex(short + 'x', 7);
  const c = { hash: short, full: gitFullHash(short, message), parent: parents[0] || null, author, email, date: opts.date || gitNow(), message, files: snap };
  if (parents.length > 1) c.parents = parents;
  st.commits.push(c);
  if (!opts.detachedOnly) {
    st.head = c.hash;
    if (st.branch) st.branches[st.branch] = c.hash;
    if (opts.reflog !== false) gitReflog(st, c.hash, opts.reflogMsg || `commit${parents.length > 1 ? ' (merge)' : parents.length ? '' : ' (initial)'}: ${gitSubject(c)}`);
  }
  return c;
}
function gitCommitSummary(st, c, label) {
  const ch = gitChangedFiles(gitParentFiles(st, c), c.files);
  const root = !c.parent ? '(root-commit) ' : '';
  const out = [`[${label || st.branch || 'detached HEAD'} ${root}${c.hash}] ${gitSubject(c)}`].concat(gitStat(ch, gitParentFiles(st, c), c.files).slice(-1));
  ch.forEach(x => { if (x.kind === 'new file') out.push(` create mode ${gitMode(x.file)} ${x.file}`); if (x.kind === 'deleted') out.push(` delete mode ${gitMode(x.file)} ${x.file}`); });
  return out;
}
function gitNoNet(what, url) { return fail(`fatal: unable to access '${url || GIT_REMOTE}/': Could not resolve host: ${(url || GIT_REMOTE).replace(/^https?:\/\//, '').split('/')[0]}\n💡 Bu lab'da network yok, ${what} gerçek bir remote ister. Local history yine de senin.`, 128); }

/* ---------- remote deposu ---------- */

/* Remote'un gercek yeri. Bellek ici depo, baska bir yerel repo (clone) ya da onun bellek ici deposu (via) */
function gitRemoteStore(sh, st, name) {
  const r = st.remotes[name];
  if (!r) return null;
  if (r.offline) return { offline: true, url: r.url };
  if (r.via) {
    const vr = gitRepoRoot(sh, r.via); const vst = vr ? gitLoad(sh, vr) : null;
    if (!vst || !vst.remotes[name] || vst.remotes[name].via) return { offline: true, url: r.url };
    const vs = vst.remotes[name];
    if (!vs.refs) vs.refs = {}; if (!vs.tags) vs.tags = {};
    return { url: r.url, refs: vs.refs, tags: vs.tags, commits: vst.commits, save: () => gitSave(sh, vr, vst) };
  }
  if (r.local) {
    const lr = gitRepoRoot(sh, r.local); const lst = lr ? gitLoad(sh, lr) : null;
    if (!lst) return { offline: true, url: r.url, missing: true };
    return { url: r.url, refs: lst.branches, tags: lst.tags, tagObjs: lst.tagObjs, commits: lst.commits, local: lst, root: lr, save: () => gitSave(sh, lr, lst) };
  }
  if (!r.refs) r.refs = {}; if (!r.tags) r.tags = {};
  return { url: r.url, refs: r.refs, tags: r.tags, commits: st.commits, save: () => {} };
}
/* object store kopyalama, eksik commit'leri sirayla ekle */
function gitCopyCommits(from, to) {
  const have = new Set(to.map(c => c.hash)); let n = 0;
  from.forEach(c => { if (!have.has(c.hash)) { to.push(JSON.parse(JSON.stringify(c))); have.add(c.hash); n++; } });
  return n;
}
function gitFetchInto(sh, st, name, store) {
  const out = []; const before = Object.assign({}, st.remote);
  if (store.commits !== st.commits) gitCopyCommits(store.commits, st.commits);
  Object.keys(store.refs).forEach(b => {
    const h = store.refs[b];
    if (before[b] === h) return;
    st.remote[b] = h;
    if (before[b] === undefined) out.push(` * [new branch]      ${b.padEnd(10)} -> ${name}/${b}`);
    else if (gitIsAncestor(st, before[b], h)) out.push(`   ${before[b]}..${h}  ${b.padEnd(10)} -> ${name}/${b}`);
    else out.push(` + ${before[b]}...${h} ${b.padEnd(10)} -> ${name}/${b}  (forced update)`);
  });
  Object.keys(st.remote).forEach(b => { if (store.refs[b] === undefined && name === 'origin') { delete st.remote[b]; } });
  Object.keys(store.tags || {}).forEach(t => {
    if (st.tags[t] === undefined) { st.tags[t] = store.tags[t]; if (store.tagObjs && store.tagObjs[t]) st.tagObjs[t] = store.tagObjs[t]; out.push(` * [new tag]         ${t.padEnd(10)} -> ${t}`); }
  });
  return out.length ? [`From ${store.url.replace(/\.git$/, '')}`].concat(out) : [];
}
/* bir repo'nun branch'ine disaridan commit basma, checkout edilmis branch ise working tree de guncellenir */
function gitRemoteSetRef(sh, store, branch, hash, srcCommits) {
  if (store.commits !== srcCommits) gitCopyCommits(srcCommits, store.commits);
  store.refs[branch] = hash;
  if (store.local && store.local.branch === branch) {
    const c = gitFind(store.local, hash);
    if (c) gitCheckoutFiles(sh, store.root, store.local, c);
  }
}

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
  return ok(`Bisecting: ${left} revision${left === 1 ? '' : 's'} left to test after this (roughly ${steps} step${steps === 1 ? '' : 's'})\n[${mid.full}] ${gitSubject(mid)}\n`);
}

/* ---------- merge, rebase, cherry-pick ortak ---------- */

function gitApplyMerge(sh, root, st, base, ours, theirs, labelA, labelB) {
  const r = gitMerge3(base, ours, theirs, labelA, labelB);
  Object.keys(ours).forEach(f => { if (r.files[f] === undefined) gitDelete(sh, root, f); });
  Object.keys(r.files).forEach(f => { if (r.files[f] !== ours[f]) gitWrite(sh, root, f, r.files[f]); });
  st.index = Object.assign({}, r.files);
  return r;
}
function gitSeqConflictMsg(kind, c) {
  if (kind === 'rebase') return [`error: could not apply ${c.hash}... ${gitSubject(c)}`, 'hint: Resolve all conflicts manually, mark them as resolved with', 'hint: "git add/rm <conflicted_files>", then run "git rebase --continue".', 'hint: You can instead skip this commit: run "git rebase --skip".', 'hint: To abort and get back to the state before "git rebase", run "git rebase --abort".', `Could not apply ${c.hash}... ${gitSubject(c)}`];
  return [`error: could not apply ${c.hash}... ${gitSubject(c)}`, 'hint: After resolving the conflicts, mark them with', 'hint: "git add/rm <pathspec>", then run', 'hint: "git cherry-pick --continue".', 'hint: You can instead skip this commit with "git cherry-pick --skip".', 'hint: To abort and get back to the state before "git cherry-pick",', 'hint: run "git cherry-pick --abort".'];
}
/* rebase dongusu, todo bitene ya da conflict'e kadar */
function gitRebaseRun(sh, root, st, out) {
  const rb = st.rebase;
  while (rb.todo.length) {
    const h = rb.todo.shift(); const c = gitFind(st, h);
    const base = gitParentFiles(st, c); const ours = gitHeadFiles(st);
    const r = gitApplyMerge(sh, root, st, base, ours, c.files, 'HEAD', `${c.hash} (${gitSubject(c)})`);
    out.push(...r.log);
    if (r.conflicts.length) { rb.current = c.hash; rb.conflicts = r.conflicts; out.push(...gitSeqConflictMsg('rebase', c)); return { out: join(out), err: '', code: 1 }; }
    if (!gitChangedFiles(ours, r.files).length) { rb.done.push(c.hash); continue; }
    const n = gitNewCommit(st, c.message, r.files, { author: c.author, email: c.email, date: c.date, reflogMsg: `rebase (pick): ${gitSubject(c)}` });
    rb.done.push(n.hash);
  }
  const branch = rb.branch;
  st.branches[branch] = st.head; st.branch = branch; st.rebase = null;
  gitReflog(st, st.head, `rebase (finish): returning to refs/heads/${branch}`);
  out.push(`Successfully rebased and updated refs/heads/${branch}.`);
  return ok(join(out));
}
function gitFinishCherry(sh, root, st) {
  const c = gitFind(st, st.cherry.hash);
  const n = gitNewCommit(st, c.message, st.index, { author: c.author, email: c.email, date: c.date, reflogMsg: `cherry-pick: ${gitSubject(c)}` });
  st.cherry = null;
  return ok(join(gitCommitSummary(st, n).slice(0, 1).concat([` Date: ${gitDate(n.date)}`], gitCommitSummary(st, n).slice(1))));
}
function gitRebaseTodoText(st, list, onto) {
  const out = list.map(c => `pick ${c.hash} ${gitSubject(c)}`);
  out.push('', `# Rebase ${onto.hash}..${list.length ? list[list.length - 1].hash : onto.hash} onto ${onto.hash} (${list.length} command${list.length === 1 ? '' : 's'})`, '#', '# Commands:', '# p, pick <commit> = use commit', '# r, reword <commit> = use commit, but edit the commit message', '# e, edit <commit> = use commit, but stop for amending', '# s, squash <commit> = use commit, but meld into previous commit', '# f, fixup <commit> = like "squash" but discard this commit\'s log message', '# d, drop <commit> = remove commit', '#', '# These lines can be re-ordered; they are executed from top to bottom.', '#');
  return out;
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
    const paths = []; const starts = []; const excludes = [];
    for (const r of rest) {
      if (/^-\d+$/.test(r)) { limit = +r.slice(1); continue; }
      if (r.includes('..')) {
        const [a, b] = r.split(/\.{2,3}/); const ca = gitRev(st, a || 'HEAD'), cb = gitRev(st, b || 'HEAD');
        if (!ca || !cb) return fail(`fatal: ambiguous argument '${r}': unknown revision or path not in the working tree.`, 128);
        starts.push(cb.hash); excludes.push(ca.hash); if (r.includes('...')) starts.push(ca.hash); continue;
      }
      const c = gitRev(st, r);
      if (c) starts.push(c.hash); else { const rel = gitRel(sh, root, r); if (rel !== null && (st.index[rel] !== undefined || sh.node(root + '/' + rel) || st.commits.some(x => x.files[rel] !== undefined))) paths.push(rel); else return fail(`fatal: ambiguous argument '${r}': unknown revision or path not in the working tree.`, 128); }
    }
    if (flags.has('--all')) { starts.push(st.head, ...Object.values(st.branches), ...Object.values(st.tags), ...Object.values(st.remote)); }
    if (!starts.length) { if (!st.head) return fail(`fatal: your current branch '${st.branch}' does not have any commits yet`, 128); starts.push(st.head); }
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
    let list = flags.has('--first-parent') ? gitHistory(st, starts[0]) : gitReachable(st, starts, excludes);
    if (author) list = list.filter(c => c.author.toLowerCase().includes(author) || c.email.toLowerCase().includes(author));
    if (grep) list = list.filter(c => c.message.toLowerCase().includes(grep));
    if (since) list = list.filter(c => c.date.slice(0, 10) >= since);
    if (flags.has('--merges')) list = list.filter(c => gitParents(c).length > 1);
    if (flags.has('--no-merges')) list = list.filter(c => gitParents(c).length < 2);
    /* bir path icin merge commit, parent'lardan biriyle ayniysa listelenmez, git'in history simplification'i */
    if (paths.length) list = list.filter(c => { const ps = gitParents(c).map(h => (gitFind(st, h) || { files: {} }).files); if (!ps.length) ps.push({}); return paths.some(f => ps.every(p => p[f] !== c.files[f])); });
    list = list.slice(0, limit);
    const render = c => {
      if (fmt) return gitFormat(st, c, fmt).split('\n');
      if (oneline) return [`${c.hash}${gitDecor(st, c)} ${gitSubject(c)}`];
      const out = gitHeader(st, c);
      if ((flags.has('--stat') || flags.has('p') || flags.has('--patch')) && gitParents(c).length < 2) { out.push(...gitDiffText(gitParentFiles(st, c), c.files, paths, flags.has('--stat')), ''); }
      return out;
    };
    if (!list.length && (author || since || grep)) return ok('');
    if (flags.has('--graph')) return ok(join(gitGraphLines(st, list, render)));
    const out = []; list.forEach(c => out.push(...render(c)));
    return ok(join(out));
  },

  shortlog(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const start = rest[0] && gitRev(st, rest[0]) ? gitRev(st, rest[0]).hash : st.head;
    if (!start) return ok('');
    const by = {};
    gitReachable(st, start).forEach(c => { const k = flags.has('e') ? `${c.author} <${c.email}>` : c.author; (by[k] = by[k] || []).push(gitSubject(c)); });
    let names = Object.keys(by);
    names = flags.has('n') ? names.sort((a, b) => by[b].length - by[a].length || a.localeCompare(b)) : names.sort();
    if (flags.has('s')) return ok(join(names.map(a => `${String(by[a].length).padStart(6)}\t${a}`)));
    const out = [];
    names.forEach(a => { out.push(`${a} (${by[a].length}):`, ...by[a].map(s => '      ' + s), ''); });
    return ok(join(out));
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
    const out = [];
    if (st.tagObjs[spec]) { const t = st.tagObjs[spec]; out.push(`tag ${spec}`, `Tagger: ${t.tagger} <${t.email}>`, `Date:   ${gitDate(t.date)}`, '', ...t.msg.split('\n'), ''); }
    out.push(...gitHeader(st, c));
    if (flags.has('--name-only')) out.push(...gitChangedFiles(gitParentFiles(st, c), c.files).map(x => x.file));
    else if (gitParents(c).length > 1 && !flags.has('--stat')) out.push(...gitDiffText(gitParentFiles(st, c), c.files, paths, true));
    else out.push(...gitDiffText(gitParentFiles(st, c), c.files, paths, flags.has('--stat')));
    return ok(join(out));
  },

  diff(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const revs = []; const paths = [];
    for (const r of rest) {
      if (r.includes('..')) { const [a, b] = r.split(/\.{2,3}/); const ca = gitRev(st, a || 'HEAD'), cb = gitRev(st, b || 'HEAD'); if (!ca || !cb) return fail(`fatal: bad revision '${r}'`, 128); if (r.includes('...')) { const mb = gitMergeBase(st, ca.hash, cb.hash); revs.push(mb || ca, cb); } else revs.push(ca, cb); continue; }
      const c = gitRev(st, r);
      if (c && !paths.length) revs.push(c);
      else { const rel = gitRel(sh, root, r); if (rel === null) return fail(`fatal: ambiguous argument '${r}': unknown revision or path not in the working tree.`, 128); paths.push(rel); }
    }
    const head = gitHeadFiles(st); const { tracked } = gitChanges(sh, root, st);
    let A, B;
    if (flags.has('--cached') || flags.has('--staged')) { A = revs[0] ? revs[0].files : head; B = st.index; }
    else if (!revs.length) { A = st.index; B = tracked; }
    else if (revs.length === 1) { A = revs[0].files; B = Object.assign({}, tracked); Object.keys(A).forEach(f => { if (B[f] === undefined && st.index[f] === undefined) B[f] = undefined; }); }
    else { A = revs[0].files; B = revs[1].files; }
    if (flags.has('--name-only')) return ok(join(gitChangedFiles(A, B).filter(c => !paths.length || paths.includes(c.file)).map(c => c.file)));
    if (flags.has('--name-status')) return ok(join(gitChangedFiles(A, B).filter(c => !paths.length || paths.includes(c.file)).map(c => `${c.kind === 'new file' ? 'A' : c.kind === 'deleted' ? 'D' : 'M'}\t${c.file}`)));
    return ok(join(gitDiffText(A, B, paths, flags.has('--stat'))));
  },

  blame(sh, root, st, args) {
    const { vals, rest } = parseOpts(args, 'L');
    if (!rest[0]) return fail('usage: git blame [<options>] [<rev>] [--] <file>');
    const rel = gitRel(sh, root, rest[0]);
    const head = gitHead(st);
    if (!head || rel === null || head.files[rel] === undefined) return fail(`fatal: no such path '${rest[0]}' in HEAD`, 128);
    const wtn = sh.node(root + '/' + rel);
    const text = wtn && wtn.t === 'f' ? wtn.d : head.files[rel];
    const headLines = lines(head.files[rel]);
    let rows = lines(text).map((l, i) => {
      if (!headLines.includes(l)) return { h: '00000000', a: 'Not Committed Yet', d: gitDate(gitNow(), 'blame'), n: i + 1, l };
      let c = head;
      while (c.parent) { const p = gitFind(st, c.parent); if (!p || p.files[rel] === undefined || !lines(p.files[rel]).includes(l)) break; c = p; }
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
    const ignored = []; const conf = gitConflictFiles(st);
    const stage = f => { if (wt[f] !== undefined) st.index[f] = wt[f]; else delete st.index[f]; const i = conf.indexOf(f); if (i >= 0) conf.splice(i, 1); };
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
      under.forEach(f => { if (st.index[f] === undefined && gitIgnored(sh, root, st, f) && !flags.has('f')) ignored.push(f); else stage(f); });
    }
    if (ignored.length) return fail(`The following paths are ignored by one of your .gitignore files:\n${ignored.join('\n')}\nhint: Use -f if you really want to add them.`);
    return ok();
  },

  rm(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const out = [];
    for (const r of rest) {
      const rel = gitRel(sh, root, r);
      const under = rel === null ? [] : Object.keys(st.index).filter(f => f === rel || (flags.has('r') && f.startsWith(rel + '/')));
      if (!under.length) return fail(rel !== null && sh.node(root + '/' + rel) && sh.node(root + '/' + rel).t === 'd' ? `fatal: not removing '${r}' recursively without -r` : `fatal: pathspec '${r}' did not match any files`, 128);
      under.forEach(f => { delete st.index[f]; if (!flags.has('--cached')) gitDelete(sh, root, f); out.push(`rm '${f}'`); });
    }
    return ok(join(out));
  },

  mv(sh, root, st, args) {
    const { rest } = parseOpts(args);
    if (rest.length < 2) return fail('usage: git mv [<options>] <source>... <destination>');
    const src = gitRel(sh, root, rest[0]), dst = gitRel(sh, root, rest[1]);
    if (src === null || st.index[src] === undefined) return fail(`fatal: not under version control, source=${rest[0]}, destination=${rest[1]}`, 128);
    if (dst === null) return fail(`fatal: '${rest[1]}' is outside repository`, 128);
    const dn = sh.node(root + '/' + dst);
    const target = dn && dn.t === 'd' ? dst + '/' + src.slice(src.lastIndexOf('/') + 1) : dst;
    if (st.index[target] !== undefined || sh.node(root + '/' + target)) return fail(`fatal: destination exists, source=${src}, destination=${target}`, 128);
    const wn = sh.node(root + '/' + src);
    const content = wn && wn.t === 'f' ? wn.d : st.index[src];
    gitDelete(sh, root, src); gitWrite(sh, root, target, content);
    st.index[target] = st.index[src]; delete st.index[src];
    return ok();
  },

  restore(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    if (!rest.length) return fail('fatal: you must specify path(s) to restore');
    const head = gitHeadFiles(st);
    const srcFlag = [...flags].find(f => f.startsWith('--source='));
    const src = srcFlag ? gitRev(st, srcFlag.slice(9)) : null;
    if (srcFlag && !src) return fail(`fatal: could not resolve ${srcFlag.slice(9)}`, 128);
    for (const r of rest) {
      const rel = gitRel(sh, root, r);
      const under = rel === null ? [] : Object.keys(st.index).concat(Object.keys(head), src ? Object.keys(src.files) : []).filter(f => f === rel || (rel !== '' && f.startsWith(rel + '/')) || rel === '');
      if (!under.length) return fail(`error: pathspec '${r}' did not match any file(s) known to git`);
      for (const f of Array.from(new Set(under))) {
        if (flags.has('--staged') || flags.has('S')) {
          const from = src ? src.files : head;
          if (from[f] === undefined) delete st.index[f]; else st.index[f] = from[f];
          if (!flags.has('W') && !flags.has('--worktree')) continue;
        }
        const content = src ? src.files[f] : st.index[f];
        if (content === undefined) { if (src) gitDelete(sh, root, f); continue; }
        gitWrite(sh, root, f, content);
      }
    }
    return ok();
  },

  checkout(sh, root, st, args) {
    const dd = args.indexOf('--');
    const { flags, rest } = parseOpts(dd >= 0 ? args.slice(0, dd) : args);
    const paths = dd >= 0 ? args.slice(dd + 1).map(p => gitRel(sh, root, p)) : [];
    if (flags.has('b') || flags.has('B')) {
      const name = rest[0];
      if (!name) return fail('fatal: branch name required');
      if (!/^[\w./-]+$/.test(name) || name.endsWith('/') || name.includes('..')) return fail(`fatal: '${name}' is not a valid branch name`, 128);
      if (st.branches[name] !== undefined && !flags.has('B')) return fail(`fatal: a branch named '${name}' already exists`, 128);
      let start = null;
      if (rest[1]) { start = gitRev(st, rest[1]); if (!start) return fail(`fatal: '${rest[1]}' is not a commit and a branch '${name}' cannot be created from it`, 128); }
      if (start && start.hash !== st.head) {
        const d = gitDirtyCheck(sh, root, st, start, 'checkout'); if (d.err) return d.err;
        gitCheckoutFiles(sh, root, st, start, d.keep);
      }
      if (!st.head && !start) { st.branch = name; return ok(`Switched to a new branch '${name}'\n`); }
      st.branches[name] = st.head; st.prev = st.branch; st.branch = name;
      gitReflog(st, st.head, `checkout: moving from ${st.prev || st.head} to ${name}`);
      return ok(`Switched to a new branch '${name}'\n`);
    }
    const isPath = r => { const rel = gitRel(sh, root, r); return rel !== null && (rel === '' || st.index[rel] !== undefined || Object.keys(st.index).some(f => f.startsWith(rel + '/'))); };
    if (paths.length || (rest.length && !gitRev(st, rest[0]) && isPath(rest[0]))) {
      const src = paths.length && rest[0] ? gitRev(st, rest[0]) : null;
      if (paths.length && rest[0] && !src) return fail(`error: pathspec '${rest[0]}' did not match any file(s) known to git`);
      const list = paths.length ? paths : rest.map(p => gitRel(sh, root, p));
      const pool = src ? src.files : st.index; let count = 0;
      for (const rel of list) {
        if (rel === null) return fail(`error: pathspec '${rel}' did not match any file(s) known to git`);
        const under = Object.keys(pool).filter(f => rel === '' || f === rel || f.startsWith(rel + '/'));
        if (!under.length) return fail(`error: pathspec '${rel}' did not match any file(s) known to git`);
        for (const f of under) { if (src) st.index[f] = pool[f]; gitWrite(sh, root, f, pool[f]); count++; }
      }
      return ok(src ? `Updated ${count} path${count > 1 ? 's' : ''} from ${src.hash}\n` : '');
    }
    let target = rest[0];
    if (target === '-') { if (!st.prev) return fail('fatal: no previous branch'); target = st.prev; }
    if (!target) return ok(join(gitStatus(sh, root, st, false)));
    if (st.bisect) return fail('fatal: bisect aktifken checkout yapma, once git bisect reset');
    if (st.merge || st.rebase || st.cherry) return fail(`fatal: cannot switch branch while ${st.merge ? 'merging' : st.rebase ? 'rebasing' : 'cherry-picking'}\nConsider "git ${st.merge ? 'merge' : st.rebase ? 'rebase' : 'cherry-pick'} --abort" or ${st.merge ? '"git commit"' : '"git ' + (st.rebase ? 'rebase' : 'cherry-pick') + ' --continue"'}`, 128);
    const c = gitRev(st, target);
    if (!c) return fail(`error: pathspec '${target}' did not match any file(s) known to git`);
    const isBranch = st.branches[target] !== undefined;
    if (isBranch && st.branch === target) return ok(`Already on '${target}'\n`);
    const d = gitDirtyCheck(sh, root, st, c, 'checkout');
    if (d.err) return d.err;
    const prev = gitHead(st);
    const wasDetached = !st.branch;
    const from = st.branch || st.head;
    gitCheckoutFiles(sh, root, st, c, d.keep);
    if (isBranch) {
      st.prev = st.branch; st.branch = target;
      gitReflog(st, c.hash, `checkout: moving from ${from} to ${target}`);
      const up = gitUpstreamOf(st, target); let upTxt = '';
      if (up && up.hash) { const ab = gitAheadBehind(st, c.hash, up.hash); upTxt = ab.ahead && ab.behind ? `Your branch and '${up.name}' have diverged,\nand have ${ab.ahead} and ${ab.behind} different commits each, respectively.\n` : ab.ahead ? `Your branch is ahead of '${up.name}' by ${ab.ahead} commit${ab.ahead > 1 ? 's' : ''}.\n` : ab.behind ? `Your branch is behind '${up.name}' by ${ab.behind} commit${ab.behind > 1 ? 's' : ''}, and can be fast-forwarded.\n` : `Your branch is up to date with '${up.name}'.\n`; }
      return ok((wasDetached && prev ? `Previous HEAD position was ${prev.hash} ${gitSubject(prev)}\n` : '') + `Switched to branch '${target}'\n` + upTxt);
    }
    st.prev = st.branch; st.branch = null;
    gitReflog(st, c.hash, `checkout: moving from ${from} to ${c.hash}`);
    return ok(`Note: switching to '${target}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n\nIf you want to create a new branch to retain commits you create, you may\ndo so (now or later) by using -c with the switch command. Example:\n\n  git switch -c <new-branch-name>\n\nOr undo this operation with:\n\n  git switch -\n\nHEAD is now at ${c.hash} ${gitSubject(c)}\n`);
  },

  switch(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    if (flags.has('c') || flags.has('C')) return GIT_SUB.checkout.call(null, sh, root, st, [flags.has('C') ? '-B' : '-b'].concat(rest));
    if (flags.has('--detach')) return GIT_SUB.checkout.call(null, sh, root, st, [rest[0]]);
    if (rest[0] === '-') return GIT_SUB.checkout.call(null, sh, root, st, ['-']);
    if (!rest[0] || st.branches[rest[0]] === undefined) {
      if (rest[0] && st.remote[rest[0]] !== undefined) { st.branches[rest[0]] = st.remote[rest[0]]; st.upstream[rest[0]] = 'origin/' + rest[0]; const r = GIT_SUB.checkout.call(null, sh, root, st, [rest[0]]); return r.err ? r : ok(`branch '${rest[0]}' set up to track 'origin/${rest[0]}'.\n` + r.out); }
      return fail(`fatal: invalid reference: ${rest[0] || ''}`, 128);
    }
    return GIT_SUB.checkout.call(null, sh, root, st, [rest[0]]);
  },

  branch(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    if (flags.has('--show-current')) return ok(st.branch ? st.branch + '\n' : '');
    if (flags.has('d') || flags.has('D') || flags.has('--delete')) {
      const out = [];
      for (const b of rest) {
        if (st.branches[b] === undefined) return fail(`error: branch '${b}' not found.`);
        if (b === st.branch) return fail(`error: Cannot delete branch '${b}' checked out at '${root}'`);
        if (!flags.has('D') && st.head && !gitIsAncestor(st, st.branches[b], st.head)) return fail(`error: The branch '${b}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${b}'.`);
        const h = st.branches[b]; delete st.branches[b]; delete st.upstream[b];
        out.push(`Deleted branch ${b} (was ${h}).`);
      }
      return ok(join(out));
    }
    if (flags.has('m') || flags.has('M')) {
      const [a, b] = rest.length === 1 ? [st.branch, rest[0]] : rest;
      if (!a || st.branches[a] === undefined) return fail(`error: refname refs/heads/${a} not found`);
      if (st.branches[b] !== undefined && !flags.has('M')) return fail(`fatal: a branch named '${b}' already exists`, 128);
      st.branches[b] = st.branches[a]; delete st.branches[a];
      if (st.upstream[a]) { st.upstream[b] = st.upstream[a]; delete st.upstream[a]; }
      if (st.branch === a) st.branch = b;
      return ok();
    }
    if (flags.has('u') || flags.has('--set-upstream-to')) {
      const v = [...flags].find(f => f.startsWith('--set-upstream-to='));
      const up = v ? v.slice(18) : rest[0]; const b = (v ? rest[0] : rest[1]) || st.branch;
      if (!up || !up.includes('/')) return fail('fatal: branch name required, ornek git branch -u origin/main');
      st.upstream[b] = up;
      return ok(`branch '${b}' set up to track '${up}'.\n`);
    }
    if (rest[0]) {
      if (!/^[\w./-]+$/.test(rest[0]) || rest[0].endsWith('/') || rest[0].includes('..')) return fail(`fatal: '${rest[0]}' is not a valid branch name`, 128);
      if (st.branches[rest[0]] !== undefined) return fail(`fatal: a branch named '${rest[0]}' already exists`, 128);
      if (!st.head) return fail(`fatal: not a valid object name: '${rest[1] || 'main'}'`, 128);
      const start = rest[1] ? gitRev(st, rest[1]) : gitHead(st);
      if (!start) return fail(`fatal: not a valid object name: '${rest[1]}'`, 128);
      st.branches[rest[0]] = start.hash;
      return ok();
    }
    const out = [];
    const names = Object.keys(st.branches).sort();
    const w = Math.max(0, ...names.map(b => b.length));
    const line = (b, cur) => {
      let s = (cur ? '* ' : '  ') + b;
      if (flags.has('v') || flags.has('vv') || flags.has('--verbose')) { const c = gitFind(st, st.branches[b]); const up = gitUpstreamOf(st, b); let track = ''; if (up && flags.has('vv')) { const ab = gitAheadBehind(st, st.branches[b], up.hash); track = `[${up.name}${ab && ab.ahead ? ': ahead ' + ab.ahead : ''}${ab && ab.behind ? (ab.ahead ? ', ' : ': ') + 'behind ' + ab.behind : ''}] `; } s = s.padEnd(w + 3) + `${c ? c.hash : '0000000'} ${track}${c ? gitSubject(c) : ''}`; }
      return s;
    };
    if (!st.branch && st.head) out.push(`* (HEAD detached at ${st.head})`);
    if (!flags.has('r')) names.forEach(b => out.push(line(b, b === st.branch)));
    if (flags.has('a') || flags.has('r')) Object.keys(st.remote).sort().forEach(b => out.push(`  remotes/origin/${b}`));
    return ok(join(out));
  },

  commit(sh, root, st, args) {
    const { flags, vals } = parseOpts(args, 'm');
    const head = gitHeadFiles(st);
    const conf = gitConflictFiles(st);
    if (conf.length) return fail('error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use \'git add/rm <file>\'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.', 128);
    if (st.rebase) return fail('fatal: rebase devam ediyor, git rebase --continue ile ilerle ya da git rebase --abort', 128);
    if (st.cherry) return gitFinishCherry(sh, root, st);
    if (flags.has('a') || flags.has('--all')) {
      const { unstaged, wt } = gitChanges(sh, root, st);
      unstaged.forEach(c => { if (wt[c.file] !== undefined) st.index[c.file] = wt[c.file]; else delete st.index[c.file]; });
    }
    const id = gitIdentity(sh, st);
    if (!id) return gitIdentityError(sh);
    let msg = vals.m !== undefined ? vals.m : [...flags].filter(f => f.startsWith('--message=')).map(f => f.slice(10))[0];
    if (flags.has('--amend')) {
      const old = gitHead(st);
      if (!old) return fail('fatal: You have nothing to amend.', 128);
      if (msg === undefined) msg = old.message;
      const ps = gitParents(old);
      st.head = ps[0] || null;
      const c = gitNewCommit(st, msg, st.index, { parents: ps, author: old.author, email: old.email, reflogMsg: `commit (amend): ${msg.split('\n')[0]}` });
      return ok(join(gitCommitSummary(st, c)));
    }
    const staged = gitChangedFiles(head, st.index);
    if (!staged.length && !st.merge && !flags.has('--allow-empty')) return { out: join(gitStatus(sh, root, st, false)), err: '', code: 1 };
    if (msg === undefined && st.merge) msg = st.merge.msg;
    if (msg === undefined || !msg.trim()) return fail('Aborting commit due to empty commit message.\n💡 git commit -m "feat: ne degisti ve neden"');
    const parents = st.merge ? [st.head, st.merge.other] : undefined;
    const c = gitNewCommit(st, msg, st.index, { parents, author: id[0], email: id[1] });
    const wasMerge = !!st.merge;
    st.merge = null;
    return ok(join(wasMerge ? gitCommitSummary(st, c).slice(0, 1) : gitCommitSummary(st, c)));
  },

  merge(sh, root, st, args) {
    const { flags, vals, rest } = parseOpts(args, 'm');
    if (flags.has('--abort') || flags.has('--quit')) {
      if (!st.merge) return fail('fatal: There is no merge to abort (MERGE_HEAD missing).', 128);
      const h = gitHead(st); st.merge = null; gitCheckoutFiles(sh, root, st, h);
      return ok();
    }
    if (flags.has('--continue')) { if (!st.merge) return fail('fatal: There is no merge in progress (MERGE_HEAD missing).', 128); return GIT_SUB.commit(sh, root, st, []); }
    if (st.merge) return fail('error: Merging is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use \'git add/rm <file>\'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.', 128);
    const spec = rest[0];
    if (!spec) return fail('fatal: No remote for the current branch.\n💡 git merge <branch>', 128);
    const other = gitRev(st, spec);
    if (!other) return fail(`merge: ${spec} - not something we can merge`, 128);
    if (!st.head) { st.branches[st.branch] = other.hash; gitCheckoutFiles(sh, root, st, other); return ok(`Updating 0000000..${other.hash}\nFast-forward\n`); }
    const head = gitHead(st);
    if (gitIsAncestor(st, other.hash, head.hash)) return ok('Already up to date.\n');
    const d = gitDirtyCheck(sh, root, st, other, 'merge');
    if (d.err) return fail(d.err.err.replace('switch branches', 'merge') + 'fatal: merge failed', 128);
    const label = st.branches[spec] !== undefined ? `branch '${spec}'` : st.tags[spec] !== undefined ? `tag '${spec}'` : st.remote[spec.replace(/^origin\//, '')] !== undefined && spec.startsWith('origin/') ? `remote-tracking branch '${spec}'` : `commit '${other.hash}'`;
    const into = st.branch && st.branch !== 'main' && st.branch !== 'master' ? ` into ${st.branch}` : '';
    const msg = vals.m !== undefined ? vals.m : `Merge ${label}${into}`;
    if (gitIsAncestor(st, head.hash, other.hash) && !flags.has('--no-ff')) {
      if (flags.has('--ff-only') || true) {
        const stat = gitStat(gitChangedFiles(head.files, other.files), head.files, other.files);
        gitCheckoutFiles(sh, root, st, other, d.keep);
        if (st.branch) st.branches[st.branch] = other.hash;
        gitReflog(st, other.hash, `merge ${spec}: Fast-forward`);
        return ok(join([`Updating ${head.hash}..${other.hash}`, 'Fast-forward'].concat(stat)));
      }
    }
    if (flags.has('--ff-only')) return fail('fatal: Not possible to fast-forward, aborting.', 128);
    const base = gitMergeBase(st, head.hash, other.hash);
    const baseFiles = base ? base.files : {};
    const r = gitApplyMerge(sh, root, st, baseFiles, head.files, other.files, 'HEAD', spec);
    const out = r.log.slice();
    if (r.conflicts.length) {
      st.merge = { other: other.hash, branch: spec, conflicts: r.conflicts, msg };
      out.push('Automatic merge failed; fix conflicts and then commit the result.');
      return { out: join(out), err: '', code: 1 };
    }
    const id = gitIdentity(sh, st);
    if (!id) return gitIdentityError(sh);
    const c = gitNewCommit(st, msg, r.files, { parents: [head.hash, other.hash], author: id[0], email: id[1], reflogMsg: `merge ${spec}: Merge made by the 'ort' strategy.` });
    const stat = gitStat(gitChangedFiles(head.files, c.files), head.files, c.files);
    return ok(join(out.concat(["Merge made by the 'ort' strategy."], stat)));
  },

  rebase(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const rb = st.rebase;
    if (flags.has('--abort')) {
      if (!rb) return fail('fatal: No rebase in progress?', 128);
      const orig = gitFind(st, rb.orig);
      st.rebase = null; st.branch = rb.branch; st.branches[rb.branch] = rb.orig;
      gitCheckoutFiles(sh, root, st, orig);
      gitReflog(st, orig.hash, `rebase (abort): returning to refs/heads/${rb.branch}`);
      return ok();
    }
    if (flags.has('--continue') || flags.has('--skip')) {
      if (!rb) return fail('fatal: No rebase in progress?', 128);
      const out = [];
      if (rb.current) {
        const c = gitFind(st, rb.current);
        if (flags.has('--skip')) { gitCheckoutFiles(sh, root, st, gitHead(st)); }
        else {
          if (gitConflictFiles(st).length) return fail(`error: could not apply ${c.hash}... ${gitSubject(c)}\nhint: Resolve all conflicts manually, mark them as resolved with\nhint: "git add/rm <conflicted_files>", then run "git rebase --continue".`, 128);
          const { unstaged, wt } = gitChanges(sh, root, st);
          unstaged.forEach(u => { if (wt[u.file] !== undefined) st.index[u.file] = wt[u.file]; });
          if (gitChangedFiles(gitHeadFiles(st), st.index).length) { const n = gitNewCommit(st, c.message, st.index, { author: c.author, email: c.email, date: c.date, reflogMsg: `rebase (continue): ${gitSubject(c)}` }); rb.done.push(n.hash); out.push(...gitCommitSummary(st, n, 'detached HEAD')); }
        }
        rb.current = null; rb.conflicts = [];
      }
      return gitRebaseRun(sh, root, st, out);
    }
    if (rb) return fail('fatal: It seems that there is already a rebase-merge directory, and\nI wonder if you are in the middle of another rebase.  If that is the\ncase, please try\n\tgit rebase (--continue | --abort | --skip)', 128);
    const spec = rest[0] || (gitUpstreamOf(st, st.branch) || {}).name;
    if (!spec) return fail(`fatal: There is no tracking information for the current branch.\nPlease specify which branch you want to rebase against.\n    git rebase <branch>`, 128);
    const onto = gitRev(st, spec);
    if (!onto) return fail(`fatal: invalid upstream '${spec}'`, 128);
    if (!st.branch) return fail('fatal: detached HEAD uzerinde rebase yok, once bir branch\'e gec', 128);
    const head = gitHead(st);
    const base = gitMergeBase(st, head.hash, onto.hash);
    const list = base ? gitHistory(st, head.hash).filter(c => c.hash !== base.hash && !gitAncestors(st, base.hash).has(c.hash)).reverse() : gitHistory(st, head.hash).reverse();
    const linear = list.filter(c => gitParents(c).length < 2);
    if (flags.has('i') || flags.has('--interactive')) {
      const todo = gitRebaseTodoText(st, linear, onto);
      return ok(join(todo.concat(['', `💡 Interactive rebase bir editor acar ve yukaridaki todo listesini duzenletir, bu lab'da editor acilmaz.`, `   pick satirlarini squash ya da fixup yapmak commit'leri birlestirir, reword mesaji degistirir, drop siler, sira degistirilebilir.`, `   Ayni sonucu elle almak icin: git reset --soft ${spec} ardindan git commit -m "tek mesaj". Tum commit'ler tek commit'e iner.`])));
    }
    const dirty = gitDirtyError(sh, root, st, 'rebase');
    if (dirty) return fail('error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.', 128);
    if (gitIsAncestor(st, onto.hash, head.hash)) return ok(`Current branch ${st.branch} is up to date.\n`);
    const branch = st.branch;
    if (gitIsAncestor(st, head.hash, onto.hash) || !list.length) {
      gitCheckoutFiles(sh, root, st, onto); st.branches[branch] = onto.hash;
      gitReflog(st, onto.hash, `rebase (finish): returning to refs/heads/${branch}`);
      return ok(`Successfully rebased and updated refs/heads/${branch}.\n`);
    }
    st.rebase = { branch, orig: head.hash, onto: onto.hash, todo: linear.map(c => c.hash), done: [], current: null, conflicts: [], interactive: false };
    st.branch = null;
    gitCheckoutFiles(sh, root, st, onto);
    gitReflog(st, onto.hash, `rebase (start): checkout ${spec}`);
    return gitRebaseRun(sh, root, st, []);
  },

  'cherry-pick'(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    if (flags.has('--abort') || flags.has('--quit')) {
      if (!st.cherry) return fail('error: no cherry-pick or revert in progress\nfatal: cherry-pick failed', 128);
      st.cherry = null; gitCheckoutFiles(sh, root, st, gitHead(st));
      return ok();
    }
    if (flags.has('--continue')) {
      if (!st.cherry) return fail('error: no cherry-pick or revert in progress\nfatal: cherry-pick failed', 128);
      if (gitConflictFiles(st).length) return fail('error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use \'git add/rm <file>\'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.', 128);
      return gitFinishCherry(sh, root, st);
    }
    if (flags.has('--skip')) { if (!st.cherry) return fail('error: no cherry-pick or revert in progress', 128); st.cherry = null; gitCheckoutFiles(sh, root, st, gitHead(st)); return ok(); }
    if (st.cherry) return fail('error: cherry-pick is already in progress\nhint: try "git cherry-pick (--continue | --abort | --quit)"\nfatal: cherry-pick failed', 128);
    if (!rest.length) return fail('usage: git cherry-pick [<options>] <commit-ish>...');
    const dirty = gitDirtyError(sh, root, st, 'cherry-pick');
    if (dirty) return fail('error: your local changes would be overwritten by cherry-pick.\nhint: commit your changes or stash them to proceed.\nfatal: cherry-pick failed', 128);
    const id = gitIdentity(sh, st);
    if (!id) return gitIdentityError(sh);
    const out = [];
    for (const spec of rest) {
      const c = gitRev(st, spec);
      if (!c) return fail(`fatal: bad revision '${spec}'`, 128);
      if (gitParents(c).length > 1) return fail(`error: commit ${c.full} is a merge but no -m option was given.\nfatal: cherry-pick failed`, 128);
      const base = gitParentFiles(st, c); const ours = gitHeadFiles(st);
      const r = gitApplyMerge(sh, root, st, base, ours, c.files, 'HEAD', `${c.hash} (${gitSubject(c)})`);
      out.push(...r.log);
      if (r.conflicts.length) { st.cherry = { hash: c.hash, conflicts: r.conflicts }; out.push(...gitSeqConflictMsg('cherry-pick', c)); return { out: join(out), err: '', code: 1 }; }
      if (!gitChangedFiles(ours, r.files).length) return fail(`On branch ${st.branch}\nYou are currently cherry-picking commit ${c.hash}.\n\nnothing to commit, working tree clean\nThe previous cherry-pick is now empty, possibly due to conflict resolution.\nIf you wish to commit it anyway, use:\n\n    git commit --allow-empty\n\nOtherwise, please use 'git cherry-pick --skip'`, 1);
      st.cherry = { hash: c.hash, conflicts: [] };
      const r2 = gitFinishCherry(sh, root, st);
      out.push(r2.out.replace(/\n$/, ''));
    }
    return ok(join(out));
  },

  revert(sh, root, st, args) {
    const { rest } = parseOpts(args);
    const c = gitRev(st, rest[0]);
    if (!c) return fail(`fatal: bad revision '${rest[0] || ''}'`, 128);
    const dirty = gitDirtyError(sh, root, st, 'revert');
    if (dirty) return fail('error: your local changes would be overwritten by revert.\nhint: commit your changes or stash them to proceed.\nfatal: revert failed');
    const parent = gitParentFiles(st, c); const headFiles = Object.assign({}, gitHeadFiles(st));
    for (const ch of gitChangedFiles(parent, c.files)) {
      const f = ch.file;
      if (c.files[f] === undefined) { if (headFiles[f] === undefined) headFiles[f] = parent[f]; continue; }
      if (parent[f] === undefined) { if (headFiles[f] === c.files[f]) delete headFiles[f]; else return fail(`error: could not revert ${c.hash}... ${gitSubject(c)}\nCONFLICT (content): Merge conflict in ${f}`); continue; }
      if (headFiles[f] === undefined) return fail(`error: could not revert ${c.hash}... ${gitSubject(c)}\nCONFLICT (modify/delete): ${f} deleted in HEAD`);
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
        if (at < 0) return fail(`error: could not revert ${c.hash}... ${gitSubject(c)}\nhint: after resolving the conflicts, mark the corrected paths\nCONFLICT (content): Merge conflict in ${f}`);
        cur = cur.slice(0, at + g.before.length).concat(g.minus, cur.slice(at + g.before.length + g.plus.length));
      }
      headFiles[f] = join(cur);
    }
    const id = gitIdentity(sh, st) || (st.user ? st.user : null);
    if (!id) return gitIdentityError(sh);
    const msg = `Revert "${gitSubject(c)}"\n\nThis reverts commit ${c.full}.`;
    st.index = Object.assign({}, headFiles);
    const n = gitNewCommit(st, msg, headFiles, { author: id[0], email: id[1], reflogMsg: `revert: ${gitSubject(c)}` });
    Object.keys(gitHeadFiles(st)).forEach(f => gitWrite(sh, root, f, headFiles[f]));
    Object.keys(c.files).forEach(f => { if (headFiles[f] === undefined) gitDelete(sh, root, f); });
    return ok(join(gitCommitSummary(st, n)));
  },

  reset(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const head = gitHeadFiles(st);
    const c = rest[0] ? gitRev(st, rest[0]) : null;
    if (rest.length && !c) {
      for (const r of rest) { const rel = gitRel(sh, root, r); if (rel === null || (st.index[rel] === undefined && head[rel] === undefined)) return fail(`fatal: ambiguous argument '${r}': unknown revision or path not in the working tree.`, 128); if (head[rel] === undefined) delete st.index[rel]; else st.index[rel] = head[rel]; }
      return ok();
    }
    if (st.merge && !rest.length && flags.has('--hard')) { st.merge = null; }
    const target = c || gitHead(st);
    if (!target) return fail('fatal: Failed to resolve \'HEAD\' as a valid ref.', 128);
    const spec = rest[0] || 'HEAD';
    if (flags.has('--hard')) { gitCheckoutFiles(sh, root, st, target); if (st.branch) st.branches[st.branch] = target.hash; st.merge = null; st.cherry = null; gitReflog(st, target.hash, `reset: moving to ${spec}`); return ok(`HEAD is now at ${target.hash} ${gitSubject(target)}\n`); }
    const moved = target.hash !== st.head;
    st.head = target.hash; if (st.branch) st.branches[st.branch] = target.hash;
    if (moved) gitReflog(st, target.hash, `reset: moving to ${spec}`);
    if (!flags.has('--soft')) st.index = Object.assign({}, target.files);
    const { unstaged } = gitChanges(sh, root, st);
    return ok(unstaged.length && !flags.has('--soft') ? join(['Unstaged changes after reset:'].concat(unstaged.map(u => `${u.kind === 'deleted' ? 'D' : 'M'}\t${u.file}`))) : '');
  },

  reflog(sh, root, st, args) {
    const sub = args[0] && !args[0].startsWith('-') ? args[0] : 'show';
    if (sub === 'expire' || sub === 'delete') return ok();
    if (sub !== 'show') return fail(`error: unknown subcommand: '${sub}'`);
    const { flags } = parseOpts(args);
    const out = st.reflog.map((e, i) => { const c = gitFind(st, e.hash); return `${e.hash}${c ? gitDecor(st, c) : ''} HEAD@{${i}}: ${e.msg}`; });
    if (!out.length) return ok('');
    const lim = [...flags].find(f => /^-?\d+$/.test(f.replace(/^-n/, '')));
    void lim;
    return ok(join(out));
  },

  stash(sh, root, st, args) {
    const sub = args[0] && !args[0].startsWith('-') ? args[0] : 'push';
    const { flags, vals } = parseOpts(args.slice(args[0] === sub ? 1 : 0), 'm');
    const head = gitHead(st);
    if (!head) return fail('fatal: You do not have the initial commit yet', 128);
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
      const msg = vals.m ? `${label}: ${vals.m}` : `WIP on ${st.branch || '(no branch)'}: ${head.hash} ${gitSubject(head)}`;
      st.stash.unshift({ id: gitHex(msg + st.stash.length + JSON.stringify(changes), 40), msg, changes });
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
    if (flags.has('d') || flags.has('--delete')) { if (st.tags[rest[0]] === undefined) return fail(`error: tag '${rest[0]}' not found.`); const h = st.tags[rest[0]]; delete st.tags[rest[0]]; delete st.tagObjs[rest[0]]; return ok(`Deleted tag '${rest[0]}' (was ${h})\n`); }
    if (!rest.length || flags.has('l') || flags.has('--list') || flags.has('n')) {
      let names = Object.keys(st.tags).sort();
      const pat = (flags.has('l') || flags.has('--list') || flags.has('n')) && rest[0] ? rest[0] : null;
      if (pat) names = names.filter(t => globToRe(pat).test(t));
      if (flags.has('n')) return ok(join(names.map(t => `${t.padEnd(15)} ${st.tagObjs[t] ? st.tagObjs[t].msg.split('\n')[0] : gitSubject(gitFind(st, st.tags[t]) || { message: '' })}`)));
      return ok(join(names));
    }
    const name = rest[0];
    if (!/^[\w./-]+$/.test(name) || name.includes('..')) return fail(`fatal: '${name}' is not a valid tag name.`, 128);
    if (st.tags[name] !== undefined && !flags.has('f')) return fail(`fatal: tag '${name}' already exists`, 128);
    if (!st.head) return fail('fatal: Failed to resolve \'HEAD\' as a valid ref.', 128);
    const c = rest[1] ? gitRev(st, rest[1]) : gitHead(st);
    if (!c) return fail(`fatal: Failed to resolve '${rest[1]}' as a valid ref.`, 128);
    const msg = vals.m !== undefined ? vals.m : [...flags].filter(f => f.startsWith('--message=')).map(f => f.slice(10))[0];
    if ((flags.has('a') || flags.has('s')) && msg === undefined) return fail('fatal: no tag message?\n💡 git tag -a v1.0.0 -m "release notes"');
    st.tags[name] = c.hash;
    if (flags.has('a') || flags.has('s') || msg !== undefined) { const id = gitIdentity(sh, st) || ['Burak Dartar', 'burak@netlab.local']; st.tagObjs[name] = { msg, tagger: id[0], email: id[1], date: gitNow() }; }
    else delete st.tagObjs[name];
    return ok();
  },

  describe(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const c = rest[0] ? gitRev(st, rest[0]) : gitHead(st);
    if (!c) return fail(`fatal: Not a valid object name ${rest[0] || 'HEAD'}`, 128);
    const all = flags.has('--tags') || flags.has('--all');
    const cand = Object.keys(st.tags).filter(t => all || st.tagObjs[t]);
    const reach = gitReachable(st, c.hash);
    const idx = {}; reach.forEach((x, i) => { idx[x.hash] = i; });
    let best = null;
    for (const t of cand) { const h = st.tags[t]; if (idx[h] === undefined) continue; if (!best || idx[h] < idx[best] || (idx[h] === idx[best] && t > best)) best = t; }
    if (!best) {
      const other = Object.keys(st.tags).filter(t => idx[st.tags[t]] !== undefined);
      return fail(other.length && !all ? `fatal: No annotated tags can describe '${c.full}'.\nHowever, there were unannotated tags: try --tags.` : `fatal: No tags can describe '${c.full}'.\nTry --always, or create some tags.`, 128);
    }
    const dist = gitReachable(st, c.hash, st.tags[best]).length;
    const abbrev0 = [...flags].some(f => f === '--abbrev=0');
    if (!dist || abbrev0) return ok(best + (flags.has('--dirty') && gitChanges(sh, root, st).unstaged.length ? '-dirty' : '') + '\n');
    return ok(`${best}-${dist}-g${c.hash}${flags.has('--dirty') && gitChanges(sh, root, st).unstaged.length ? '-dirty' : ''}\n`);
  },

  remote(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const sub = rest[0];
    const show = () => {
      const out = [];
      Object.keys(st.remotes).sort().forEach(r => { if (flags.has('v') || flags.has('--verbose')) out.push(`${r}\t${st.remotes[r].url} (fetch)`, `${r}\t${st.remotes[r].url} (push)`); else out.push(r); });
      return ok(join(out));
    };
    if (!sub) return show();
    if (sub === 'add') {
      const [name, url] = rest.slice(1);
      if (!name || !url) return fail('usage: git remote add [<options>] <name> <url>');
      if (st.remotes[name]) return fail(`error: remote ${name} already exists.`, 3);
      const r = { url, refs: {}, tags: {} };
      const abs = url.startsWith('/') || url.startsWith('~') || url.startsWith('.') ? sh.resolve(url) : null;
      if (abs && gitRepoRoot(sh, abs) === abs) { r.local = abs; }
      st.remotes[name] = r;
      return ok();
    }
    if (sub === 'remove' || sub === 'rm') {
      const name = rest[1];
      if (!st.remotes[name]) return fail(`error: No such remote: '${name}'`, 2);
      delete st.remotes[name];
      Object.keys(st.upstream).forEach(b => { if (st.upstream[b].startsWith(name + '/')) delete st.upstream[b]; });
      if (name === 'origin') st.remote = {};
      return ok();
    }
    if (sub === 'rename') { const [a, b] = rest.slice(1); if (!st.remotes[a]) return fail(`error: No such remote: '${a}'`, 2); st.remotes[b] = st.remotes[a]; delete st.remotes[a]; Object.keys(st.upstream).forEach(k => { st.upstream[k] = st.upstream[k].replace(new RegExp('^' + a + '/'), b + '/'); }); return ok(); }
    if (sub === 'get-url') { const r = st.remotes[rest[1] || 'origin']; return r ? ok(r.url + '\n') : fail(`error: No such remote '${rest[1]}'`, 2); }
    if (sub === 'set-url') { const r = st.remotes[rest[1]]; if (!r) return fail(`error: No such remote '${rest[1]}'`, 2); r.url = rest[2]; return ok(); }
    if (sub === 'show') {
      const name = rest[1]; if (!name) return show();
      const r = st.remotes[name]; if (!r) return fail(`error: No such remote '${name}'`, 2);
      const out = [`* remote ${name}`, `  Fetch URL: ${r.url}`, `  Push  URL: ${r.url}`, `  HEAD branch: main`, '  Remote branches:'];
      Object.keys(st.remote).sort().forEach(b => out.push(`    ${b.padEnd(28)} tracked`));
      const pulls = Object.keys(st.upstream).filter(b => st.upstream[b].startsWith(name + '/'));
      if (pulls.length) { out.push(`  Local branch${pulls.length > 1 ? 'es' : ''} configured for 'git pull':`); pulls.forEach(b => out.push(`    ${b.padEnd(10)} merges with remote ${st.upstream[b].slice(name.length + 1)}`)); }
      return ok(join(out));
    }
    return fail(`error: unknown subcommand: '${sub}'\nusage: git remote [-v | --verbose]\n   or: git remote add <name> <url>\n   or: git remote remove <name>\n   or: git remote get-url <name>`);
  },

  fetch(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const name = rest[0] || 'origin';
    if (!st.remotes[name]) return fail(Object.keys(st.remotes).length ? `fatal: '${name}' does not appear to be a git repository\nfatal: Could not read from remote repository.` : 'fatal: No remote repository specified.  Please, specify either a URL or a\nremote name from which new revisions should be fetched.', 128);
    const store = gitRemoteStore(sh, st, name);
    if (store.offline) return gitNoNet('fetch', store.url);
    const out = gitFetchInto(sh, st, name, store);
    if (flags.has('--prune') || flags.has('p')) Object.keys(st.remote).forEach(b => { if (store.refs[b] === undefined) { delete st.remote[b]; out.push(` - [deleted]         (none)     -> ${name}/${b}`); } });
    return ok(join(out));
  },

  pull(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const name = rest[0] || 'origin';
    if (!st.remotes[name]) return fail('fatal: No remote repository specified.\nThere is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\n\n    git pull <remote> <branch>', 128);
    const store = gitRemoteStore(sh, st, name);
    if (store.offline) return gitNoNet('pull', store.url);
    const up = rest[1] ? { branch: rest[1], name: `${name}/${rest[1]}` } : gitUpstreamOf(st, st.branch);
    if (!up) return fail(`There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\nSee git-pull(1) for details.\n\n    git pull <remote> <branch>\n\nIf you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=${name}/<branch> ${st.branch}\n`, 1);
    const fetched = gitFetchInto(sh, st, name, store);
    const target = st.remote[up.branch];
    if (target === undefined) return fail(`fatal: couldn't find remote ref ${up.branch}`, 128);
    if (!st.head) { st.branches[st.branch] = target; gitCheckoutFiles(sh, root, st, gitFind(st, target)); st.upstream[st.branch] = up.name; return ok(join(fetched)); }
    const head = gitHead(st);
    if (gitIsAncestor(st, target, head.hash)) return ok(join(fetched.concat(['Already up to date.'])));
    if (flags.has('--rebase')) { const r = GIT_SUB.rebase(sh, root, st, [up.name]); return r.err ? r : ok(join(fetched) + r.out); }
    const r = GIT_SUB.merge(sh, root, st, [up.name].concat(flags.has('--no-ff') ? ['--no-ff'] : flags.has('--ff-only') ? ['--ff-only'] : []));
    if (r.err) return r;
    return { out: join(fetched) + r.out, err: '', code: r.code };
  },

  push(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    let name = rest[0]; let refs = rest.slice(1);
    if (name && !st.remotes[name]) { if (/^[\w./-]+$/.test(name) && !name.includes('/') && st.branches[name] !== undefined) { refs = [name]; name = null; } else return fail(`fatal: '${name}' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.`, 128); }
    if (!name) {
      const up = st.branch ? gitUpstreamOf(st, st.branch) : null;
      if (!up && !flags.has('--tags') && !refs.length) {
        if (!Object.keys(st.remotes).length) return fail('fatal: No configured push destination.\nEither specify the URL from the command-line or configure a remote repository using\n\n    git remote add <name> <url>\n\nand then push using the remote name\n\n    git push <name>\n', 128);
        return fail(`fatal: The current branch ${st.branch} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream origin ${st.branch}\n\nTo have this happen automatically for branches without a tracking\nupstream, see 'push.autoSetupRemote' in 'git help config'.\n`, 128);
      }
      name = up ? up.remote : 'origin';
    }
    const store = gitRemoteStore(sh, st, name);
    if (!store) return fail(`fatal: '${name}' does not appear to be a git repository`, 128);
    if (store.offline) return gitNoNet('push', store.url);
    const out = []; let rejected = false; let changed = 0;
    const setUp = flags.has('u') || flags.has('--set-upstream');
    const force = flags.has('f') || flags.has('--force');
    const lease = flags.has('--force-with-lease') || [...flags].some(f => f.startsWith('--force-with-lease='));
    const del = flags.has('d') || flags.has('--delete');
    let todo = [];
    if (refs.length) refs.forEach(r => { const [src, dst] = r.includes(':') ? r.split(':') : [r, r]; todo.push({ src, dst }); });
    else if (!flags.has('--tags') || st.branch) { if (!st.branch) return fail('fatal: You are not currently on a branch.\nTo push the history leading to the current (detached HEAD)\nstate now, use\n\n    git push origin HEAD:<name-of-remote-branch>\n', 128); if (!flags.has('--tags')) todo.push({ src: st.branch, dst: st.branch }); }
    if (flags.has('--all')) todo = Object.keys(st.branches).map(b => ({ src: b, dst: b }));
    const tagsToPush = flags.has('--tags') ? Object.keys(st.tags) : [];
    todo.forEach(t => { if (st.tags[t.src] !== undefined && st.branches[t.src] === undefined) tagsToPush.push(t.src); });
    todo = todo.filter(t => !(st.tags[t.src] !== undefined && st.branches[t.src] === undefined));
    const tagLines = [];
    for (const t of tagsToPush) {
      if (del) { delete store.tags[t]; tagLines.push(` - [deleted]         ${t}`); changed++; continue; }
      if (store.tags[t] === st.tags[t]) continue;
      if (store.tags[t] !== undefined && !force) { tagLines.push(` ! [rejected]        ${t} -> ${t} (already exists)`); rejected = true; continue; }
      store.tags[t] = st.tags[t]; if (store.tagObjs && st.tagObjs[t]) store.tagObjs[t] = st.tagObjs[t];
      if (store.commits !== st.commits) gitCopyCommits(st.commits, store.commits);
      tagLines.push(` * [new tag]         ${t} -> ${t}`); changed++;
    }
    const lines2 = [];
    for (const t of todo) {
      if (del) { if (store.refs[t.dst] === undefined) { lines2.push(` ! [rejected]        ${t.dst} (remote ref does not exist)`); rejected = true; continue; } delete store.refs[t.dst]; delete st.remote[t.dst]; lines2.push(` - [deleted]         ${t.dst}`); changed++; continue; }
      const src = t.src === 'HEAD' ? st.head : st.branches[t.src];
      if (src === undefined) { lines2.push(`error: src refspec ${t.src} does not match any`); rejected = true; continue; }
      const cur = store.refs[t.dst];
      if (cur === src) { continue; }
      if (cur !== undefined && !gitIsAncestor(st, cur, src)) {
        if (force) { gitRemoteSetRef(sh, store, t.dst, src, st.commits); st.remote[t.dst] = src; lines2.push(` + ${cur.slice(0, 7)}...${src.slice(0, 7)} ${t.src} -> ${t.dst} (forced update)`); changed++; continue; }
        if (lease) {
          if (st.remote[t.dst] === cur) { gitRemoteSetRef(sh, store, t.dst, src, st.commits); st.remote[t.dst] = src; lines2.push(` + ${cur.slice(0, 7)}...${src.slice(0, 7)} ${t.src} -> ${t.dst} (forced update)`); changed++; continue; }
          lines2.push(` ! [rejected]        ${t.src} -> ${t.dst} (stale info)`); rejected = true; continue;
        }
        lines2.push(` ! [rejected]        ${t.src} -> ${t.dst} (${gitIsAncestor(st, src, cur) ? 'non-fast-forward' : 'non-fast-forward'})`); rejected = true; continue;
      }
      gitRemoteSetRef(sh, store, t.dst, src, st.commits); st.remote[t.dst] = src; changed++;
      lines2.push(cur === undefined ? ` * [new branch]      ${t.src} -> ${t.dst}` : `   ${cur.slice(0, 7)}..${src.slice(0, 7)}  ${t.src} -> ${t.dst}`);
      if (setUp) st.upstream[t.src] = `${name}/${t.dst}`;
    }
    store.save();
    if (!changed && !rejected) return ok('Everything up-to-date\n');
    if (changed) { const n = Math.max(1, changed * 3); out.push(`Enumerating objects: ${n}, done.`, `Counting objects: 100% (${n}/${n}), done.`, `Writing objects: 100% (${n}/${n}), ${n * 311} bytes | ${n * 311} bytes/s, done.`, `Total ${n} (delta ${Math.max(0, n - 3)}), reused 0 (delta 0), pack-reused 0`); }
    out.push(`To ${store.url}`, ...lines2, ...tagLines);
    if (rejected) {
      out.push(`error: failed to push some refs to '${store.url}'`);
      if (lines2.some(l => l.includes('non-fast-forward'))) out.push('hint: Updates were rejected because the tip of your current branch is behind', 'hint: its remote counterpart. If you want to integrate the remote changes,', "hint: use 'git pull' before pushing again.", "hint: See the 'Note about fast-forwards' in 'git push --help' for details.");
      if (lines2.some(l => l.includes('stale info'))) out.push('hint: Updates were rejected because the remote contains work that you do not', 'hint: have locally. Run git fetch first, look at the remote branch, then decide.');
      return { out: '', err: join(out), code: 1 };
    }
    if (setUp) todo.forEach(t => out.push(`branch '${t.src}' set up to track '${name}/${t.dst}'.`));
    return ok(join(out));
  },

  'request-pull'(sh, root, st, args) {
    const { rest } = parseOpts(args);
    if (rest.length < 2) return fail('usage: git request-pull [-p] <start> <URL> [<end>]');
    const start = gitRev(st, rest[0]); const url = rest[1]; const endSpec = rest[2] || 'HEAD';
    const end = gitRev(st, endSpec);
    if (!start) return fail(`fatal: Not a valid revision: ${rest[0]}`, 128);
    if (!end) return fail(`fatal: Not a valid revision: ${endSpec}`, 128);
    const list = gitReachable(st, end.hash, start.hash);
    if (!list.length) return fail(`warn: No match for commit ${end.full} found at ${url}\nwarn: Are you sure you pushed '${endSpec}' there?`, 1);
    const base = gitMergeBase(st, start.hash, end.hash) || start;
    const by = {}; list.forEach(c => { (by[c.author] = by[c.author] || []).push(gitSubject(c)); });
    const out = [`The following changes since commit ${base.full}:`, '', `  ${gitSubject(base)} (${gitDate(base.date)})`, '', 'are available in the Git repository at:', '', `  ${st.remotes[url] ? st.remotes[url].url : url} ${endSpec.replace(/^HEAD$/, st.branch || end.hash)}`, '', `for you to fetch changes up to ${end.full}:`, '', `  ${gitSubject(end)} (${gitDate(end.date)})`, '', '----------------------------------------------------------------'];
    Object.keys(by).sort().forEach(a => { out.push(`${a} (${by[a].length}):`, ...by[a].map(s => '      ' + s), ''); });
    out.push(...gitStat(gitChangedFiles(base.files, end.files), base.files, end.files));
    return ok(join(out));
  },

  config(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const global = flags.has('--global');
    const gcfg = gitGlobalConfig(sh);
    const defaults = { 'core.editor': 'nano', 'init.defaultbranch': 'main' };
    const all = Object.assign({}, defaults, gcfg, st ? st.config : {});
    if (st) { Object.keys(st.remotes).forEach(r => { all[`remote.${r}.url`] = st.remotes[r].url; }); Object.keys(st.upstream).forEach(b => { const [r, rb] = st.upstream[b].split('/'); all[`branch.${b}.remote`] = r; all[`branch.${b}.merge`] = `refs/heads/${rb}`; }); }
    if (flags.has('--list') || flags.has('l')) { const src = global ? gcfg : all; return ok(join(Object.keys(src).map(k => `${k}=${src[k]}`))); }
    if (!rest[0]) return fail('usage: git config [--global] [--list] <key> [<value>]');
    const key = rest[0].toLowerCase() === rest[0] ? rest[0] : rest[0].split('.').map((p, i, a) => i === 0 || i === a.length - 1 ? p.toLowerCase() : p).join('.');
    if (flags.has('--unset')) { if (global || !st) gitGlobalSet(sh, key, null); else delete st.config[key]; return ok(); }
    if (rest[1] !== undefined) {
      const value = rest.slice(1).join(' ');
      if (global || !st) { gitGlobalSet(sh, key, value); return ok(); }
      st.config[key] = value;
      if (key === 'user.name') st.user = [value, st.user ? st.user[1] : (gcfg['user.email'] || '')];
      if (key === 'user.email') st.user = [st.user ? st.user[0] : (gcfg['user.name'] || ''), value];
      return ok();
    }
    const src = global ? gcfg : all;
    return src[key] !== undefined ? ok(src[key] + '\n') : { out: '', err: '', code: 1 };
  },

  'rev-parse'(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    if (flags.has('--show-toplevel')) return ok(root + '\n');
    if (flags.has('--git-dir')) return ok(root + '/.git\n');
    if (flags.has('--abbrev-ref')) return ok((st.branch || 'HEAD') + '\n');
    const out = [];
    for (const r of rest.length ? rest : ['HEAD']) { const c = gitRev(st, r); if (!c) return fail(`fatal: ambiguous argument '${r}': unknown revision or path not in the working tree.`, 128); out.push(flags.has('--short') ? c.hash : c.full); }
    return ok(join(out));
  },
  'merge-base'(sh, root, st, args) {
    const { rest } = parseOpts(args);
    const a = gitRev(st, rest[0]), b = gitRev(st, rest[1]);
    if (!a || !b) return fail(`fatal: Not a valid object name ${!a ? rest[0] : rest[1]}`, 128);
    const m = gitMergeBase(st, a.hash, b.hash);
    return m ? ok(m.full + '\n') : { out: '', err: '', code: 1 };
  },
  'ls-files'(sh, root, st) { return ok(join(Object.keys(st.index).sort())); },
  'cat-file'(sh, root, st, args) {
    const { flags, rest } = parseOpts(args);
    const c = gitRev(st, rest[rest.length - 1]);
    if (!c) return fail(`fatal: Not a valid object name ${rest[rest.length - 1]}`, 128);
    if (flags.has('t')) return ok('commit\n');
    return ok(join([`tree ${gitHex('tree' + c.hash, 40)}`].concat(gitParents(c).map(p => `parent ${(gitFind(st, p) || { full: p }).full}`), [`author ${c.author} <${c.email}> ${Math.floor(new Date(c.date.slice(0, 19) + 'Z').getTime() / 1000)} ${c.date.slice(19).replace(':', '') || '+0000'}`, `committer ${c.author} <${c.email}> ${Math.floor(new Date(c.date.slice(0, 19) + 'Z').getTime() / 1000)} ${c.date.slice(19).replace(':', '') || '+0000'}`, '', c.message])));
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
      return ok((prev.hash !== target.hash ? `Previous HEAD position was ${prev.hash} ${gitSubject(prev)}\n` : '') + (st.branch ? `Switched to branch '${st.branch}'\n` : `HEAD is now at ${target.hash}\n`));
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

/* ---------- init ve clone ---------- */

function gitInit(sh, args) {
  const { flags, vals, rest } = parseOpts(args, 'b');
  const dir = rest[0] ? sh.resolve(rest[0]) : sh.cwd;
  const branch = vals.b || [...flags].filter(f => f.startsWith('--initial-branch=')).map(f => f.slice(17))[0] || gitGlobalConfig(sh)['init.defaultbranch'] || 'main';
  if (gitRepoRoot(sh, dir) === dir) return ok(`Reinitialized existing Git repository in ${dir}/.git/\n`);
  const dn = sh.node(dir);
  if (dn && dn.t !== 'd') return fail(`fatal: cannot mkdir ${rest[0]}: File exists`, 128);
  if (!dn) { const p = sh.parent(dir); if (!p.dir) return fail(`fatal: cannot mkdir ${rest[0]}: No such file or directory`, 128); gitInstall(sh, dir, mkdir({}, 0o755, 'burak')); }
  const st = gitEmptyState(branch);
  gitInstall(sh, dir + '/.git', mkdir({}, 0o755, 'burak'));
  gitInstall(sh, dir + '/.git/lab-state.json', mkfile(JSON.stringify(st), 0o644, 'burak'));
  gitInstall(sh, dir + '/.git/description', mkfile("Unnamed repository; edit this file 'description' to name the repository.\n", 0o644, 'burak'));
  gitSave(sh, dir, st);
  return ok(`Initialized empty Git repository in ${dir}/.git/\n`);
}
/* URL'yi bellek ici remote olarak tasiyan repo'yu bul */
function gitFindRemoteByUrl(sh, url) {
  const found = [];
  const walk = (node, p, depth) => {
    if (depth > 6) return;
    for (const k of Object.keys(node.c)) {
      const n = node.c[k]; const abs = p === '/' ? '/' + k : p + '/' + k;
      if (n.t !== 'd') continue;
      if (n.c['.git'] && n.c['.git'].t === 'd' && n.c['.git'].c['lab-state.json']) {
        const st = gitLoad(sh, abs);
        if (st) Object.keys(st.remotes).forEach(r => { if (st.remotes[r].url === url && !st.remotes[r].via && !st.remotes[r].offline && !st.remotes[r].local) found.push({ root: abs, st, name: r }); });
        continue;
      }
      walk(n, abs, depth + 1);
    }
  };
  walk(sh.root, '/', 0);
  return found[0] || null;
}
function gitClone(sh, args) {
  const { flags, rest } = parseOpts(args);
  const src = rest[0];
  if (!src) return fail('fatal: You must specify a repository to clone.\n\nusage: git clone [<options>] [--] <repo> [<dir>]', 129);
  const isPath = src.startsWith('/') || src.startsWith('~') || src.startsWith('.') || (!src.includes('://') && !src.includes('@') && sh.node(sh.resolve(src)));
  let name = rest[1] || src.replace(/\/+$/, '').replace(/\.git$/, '').split('/').pop();
  const dir = sh.resolve(name);
  if (sh.node(dir) && Object.keys(sh.node(dir).c || {}).length) return fail(`fatal: destination path '${name}' already exists and is not an empty directory.`, 128);
  let st, remote, out = [`Cloning into '${name}'...`];
  if (isPath) {
    const abs = sh.resolve(src); const sroot = gitRepoRoot(sh, abs);
    if (sroot !== abs) return fail(`fatal: repository '${abs}' does not exist`, 128);
    const sst = gitLoad(sh, abs);
    st = gitEmptyState(sst.branch || 'main');
    st.commits = JSON.parse(JSON.stringify(sst.commits));
    st.remote = Object.assign({}, sst.branches); st.tags = Object.assign({}, sst.tags); st.tagObjs = JSON.parse(JSON.stringify(sst.tagObjs));
    remote = { url: abs, local: abs };
    out.push('done.');
  } else {
    const f = gitFindRemoteByUrl(sh, src);
    if (!f) return fail(`Cloning into '${name}'...\nfatal: unable to access '${src}/': Could not resolve host: ${src.replace(/^https?:\/\//, '').split('/')[0]}\n💡 Bu lab'da network yok. Once bir repo'da git remote add origin ${src} ve git push -u origin main yap, sonra clone o remote'tan gelir.`, 128);
    const store = f.st.remotes[f.name];
    st = gitEmptyState('main');
    const reach = gitAncestors(f.st, Object.values(store.refs || {}).concat(Object.values(store.tags || {})));
    st.commits = JSON.parse(JSON.stringify(f.st.commits.filter(c => reach.has(c.hash))));
    st.remote = Object.assign({}, store.refs || {}); st.tags = Object.assign({}, store.tags || {});
    Object.keys(st.tags).forEach(t => { if (f.st.tagObjs[t]) st.tagObjs[t] = JSON.parse(JSON.stringify(f.st.tagObjs[t])); });
    remote = { url: src, via: f.root };
    const n = st.commits.length * 3 || 3;
    out.push(`remote: Enumerating objects: ${n}, done.`, `remote: Counting objects: 100% (${n}/${n}), done.`, `remote: Compressing objects: 100% (${Math.max(1, n - 2)}/${Math.max(1, n - 2)}), done.`, `remote: Total ${n} (delta ${Math.max(0, n - 4)}), reused ${n} (delta ${Math.max(0, n - 4)}), pack-reused 0`, `Receiving objects: 100% (${n}/${n}), done.`, `Resolving deltas: 100% (${Math.max(0, n - 4)}/${Math.max(0, n - 4)}), done.`);
  }
  st.remotes = { origin: remote };
  const def = st.remote.main !== undefined ? 'main' : st.remote.master !== undefined ? 'master' : Object.keys(st.remote).sort()[0];
  if (!sh.node(dir)) gitInstall(sh, dir, mkdir({}, 0o755, 'burak'));
  gitInstall(sh, dir + '/.git', mkdir({}, 0o755, 'burak'));
  gitInstall(sh, dir + '/.git/lab-state.json', mkfile('{}', 0o644, 'burak'));
  if (def) {
    st.branch = def; st.branches[def] = st.remote[def]; st.upstream[def] = 'origin/' + def;
    const c = gitFind(st, st.remote[def]);
    st.head = c.hash; st.index = Object.assign({}, c.files);
    Object.keys(c.files).forEach(f => gitWrite(sh, dir, f, c.files[f]));
    gitReflog(st, c.hash, `clone: from ${remote.url}`);
  } else out.push('warning: You appear to have cloned an empty repository.');
  if (flags.has('q') || flags.has('--quiet')) out = [];
  gitSave(sh, dir, st);
  return ok(join(out));
}

const GIT_USAGE = `usage: git [--version] [--help] <command> [<args>]

Bu lab'da desteklenen komutlar

start a working area
   init       Bulundugun dizinde bos repo olustur
   clone      Yerel bir repo'dan ya da push edilmis fake remote'tan kopya al

work on the current change
   add        Degisiklikleri stage et, . ile hepsi
   mv         Dosyayi git ile tasi ya da yeniden adlandir
   restore    Dosyayi geri al, --staged ile unstage
   rm         Dosyayi index'ten ve diskten sil, --cached sadece index

examine the history and state
   status     Working tree durumu
   log        Commit gecmisi, --oneline --graph --all -p --stat main..feature
   show       Bir commit ya da tag'i goster
   diff       Working tree, index ve commit'ler arasi fark, --staged
   blame      Her satiri kim yazdi
   bisect     Hatali commit'i binary search ile bul
   describe   En yakin tag'e gore surum adi, --tags
   shortlog   Yazara gore ozet, -sn
   reflog     HEAD'in gectigi her yer, kaybolan commit'i bul

grow, mark and tweak your common history
   branch     Branch listele, olustur, -d sil
   checkout   Branch ya da commit'e gec, -b yeni branch
   switch     Branch'e gec, -c yeni branch
   commit     Stage edilenleri commit et, -m "mesaj", --amend
   merge      Branch birlestir, fast-forward ya da --no-ff, --abort
   rebase     Commit'leri baska bir base uzerine tasi, --continue --abort
   cherry-pick Tek bir commit'i bu branch'e uygula
   revert     Bir commit'i tersine ceviren yeni commit
   reset      HEAD'i tasi, --soft --mixed --hard
   stash      Degisiklikleri kenara al, pop ile geri getir
   tag        Tag listele ya da olustur, -a -m annotated

collaborate
   remote     Remote ekle ve listele, add -v
   fetch      Remote'taki yeni commit'leri al
   pull       fetch + merge
   push       Branch ya da tag'leri remote'a gonder, -u --tags --force-with-lease
   request-pull  Pull request metni uret
`;

function gitCommand(args) {
  const sub = args[0];
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') return ok(GIT_USAGE);
  if (sub === '--version' || sub === 'version') return ok('git version 2.43.0\n');
  if (sub === 'init') return gitInit(this, args.slice(1));
  if (sub === 'clone') return gitClone(this, args.slice(1));
  const root = gitRepoRoot(this);
  if (!root) {
    if (sub === 'config' && (args.includes('--global') || args.includes('--list') || args.includes('-l'))) return GIT_SUB.config(this, null, null, args.slice(1).concat(args.includes('--global') ? [] : ['--global']));
    return fail('fatal: not a git repository (or any of the parent directories): .git', 128);
  }
  const st = gitLoad(this, root);
  if (!st) return fail('fatal: .git/lab-state.json bozuk, Profil sekmesinden filesystem\'i sifirla', 128);
  const fn = GIT_SUB[sub];
  if (!fn) {
    const near = Object.keys(GIT_SUB).filter(k => k.startsWith(sub.slice(0, 2))).slice(0, 3);
    return fail(`git: '${sub}' is not a git command. See 'git --help'.${near.length ? '\n\nThe most similar command' + (near.length > 1 ? 's are' : ' is') + '\n\t' + near.join('\n\t') : ''}`);
  }
  const r = fn(this, root, st, args.slice(1)) || ok();
  gitSave(this, root, st);
  return r;
}

/* ---------- diger simulatorler icin API ---------- */

/* createRepo(sh, path, commits, remote)
   commits: [{msg, files:{rel: content | null}, author?: 'burak' | 'Ad Soyad' | [ad, email], date?, branch?: 'main', from?: 'main', merge?: 'other', tag?: 'v1.0.0', tagMsg?}]
   remote: 'https://...' ya da {url, branches?: ['main'], tags?: true}. Donus: repo durumu */
const G_API = {
  state(sh, path) { const root = gitRepoRoot(sh, sh.resolve(path)); return root ? gitLoad(sh, root) : null; },
  save(sh, path, st) { const root = gitRepoRoot(sh, sh.resolve(path)); if (root) gitSave(sh, root, st); },
  person(a) {
    if (!a) return ['Burak Dartar', 'burak@netlab.local'];
    if (Array.isArray(a)) return a;
    if (GIT_PEOPLE[a]) return GIT_PEOPLE[a];
    return [a, a.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@netlab.local'];
  },
  createRepo(sh, path, commits, remote, opts) {
    opts = opts || {};
    const dir = sh.resolve(path);
    const old = sh.node(dir);
    if (old && old.t === 'd' && old.c['.git']) delete old.c['.git'];
    if (!sh.node(dir)) gitInstall(sh, dir, mkdir({}, 0o755, 'burak'));
    const st = gitEmptyState(opts.branch || 'main');
    if (opts.user) { st.config['user.name'] = opts.user[0]; st.config['user.email'] = opts.user[1]; st.user = opts.user.slice(); }
    gitInstall(sh, dir + '/.git', mkdir({}, 0o755, 'burak'));
    gitInstall(sh, dir + '/.git/lab-state.json', mkfile('{}', 0o644, 'burak'));
    const base = opts.date ? new Date(opts.date).getTime() : Date.parse('2026-10-01T09:00:00+02:00');
    (commits || []).forEach((c, i) => G_API.addCommit(sh, dir, Object.assign({ date: new Date(base + i * 5 * 3600e3 + 2 * 3600e3).toISOString().slice(0, 19) + '+02:00' }, c), st));
    const co = opts.checkout || st.branch;
    if (st.branches[co] !== undefined) { st.branch = co; st.head = st.branches[co]; }
    if (st.head) { const c = gitFind(st, st.head); st.index = Object.assign({}, c.files); Object.keys(gitWorkTree(sh, dir)).forEach(f => { if (c.files[f] === undefined && !opts.keepFiles) gitDelete(sh, dir, f); }); Object.keys(c.files).forEach(f => gitWrite(sh, dir, f, c.files[f])); }
    if (remote) {
      const r = typeof remote === 'string' ? { url: remote } : remote;
      const bl = r.branches || Object.keys(st.branches);
      const refs = {}; bl.forEach(b => { if (st.branches[b] !== undefined) refs[b] = st.branches[b]; });
      st.remotes.origin = { url: r.url, refs, tags: r.tags === false ? {} : Object.assign({}, st.tags) };
      st.remote = Object.assign({}, refs);
      Object.keys(refs).forEach(b => { st.upstream[b] = 'origin/' + b; });
    }
    gitSave(sh, dir, st);
    return st;
  },
  /* var olan repo'ya commit ekle. branch yoksa from'dan acilir. Checkout edilmis branch ise working tree de guncellenir */
  addCommit(sh, path, c, stIn) {
    const dir = sh.resolve(path);
    const st = stIn || gitLoad(sh, dir);
    if (!st) return null;
    const branch = c.branch || st.branch || 'main';
    if (st.branches[branch] === undefined && st.commits.length) { const from = c.from ? (gitRev(st, c.from) || {}).hash : (st.branches.main !== undefined ? st.branches.main : st.head); if (from) st.branches[branch] = from; }
    const tip = st.branches[branch] !== undefined ? gitFind(st, st.branches[branch]) : null;
    const files = Object.assign({}, tip ? tip.files : {});
    Object.keys(c.files || {}).forEach(k => { if (c.files[k] === null) delete files[k]; else files[k] = c.files[k]; });
    const [author, email] = G_API.person(c.author);
    const parents = tip ? [tip.hash] : [];
    if (c.merge) { const m = gitRev(st, c.merge); if (m) parents.push(m.hash); }
    const n = gitNewCommit(st, c.msg, files, { parents, author, email, date: c.date || gitNow(), detachedOnly: true });
    st.branches[branch] = n.hash;
    if (c.tag) { st.tags[c.tag] = n.hash; if (c.tagMsg) st.tagObjs[c.tag] = { msg: c.tagMsg, tagger: author, email, date: n.date }; }
    if (st.branch === branch) { st.head = n.hash; st.index = Object.assign({}, n.files); Object.keys(c.files || {}).forEach(k => { if (c.files[k] === null) gitDelete(sh, dir, k); else gitWrite(sh, dir, k, c.files[k]); }); gitReflog(st, n.hash, `commit: ${gitSubject(n)}`); }
    if (!st.branch && !st.head) { st.branch = branch; st.head = n.hash; st.index = Object.assign({}, n.files); }
    if (!stIn) gitSave(sh, dir, st);
    return n;
  },
  /* remote'a baska birinin commit'ini bas, pull alistirmasi icin */
  remoteCommit(sh, path, c) {
    const dir = sh.resolve(path); const st = gitLoad(sh, dir); if (!st) return null;
    const name = c.remote || 'origin'; const r = st.remotes[name]; if (!r || r.offline) return null;
    const store = gitRemoteStore(sh, st, name);
    const branch = c.branch || 'main';
    const tip = store.refs[branch] !== undefined ? gitFind(st, store.refs[branch]) || st.commits.find(x => x.hash === store.refs[branch]) : null;
    const files = Object.assign({}, tip ? tip.files : {});
    Object.keys(c.files || {}).forEach(k => { if (c.files[k] === null) delete files[k]; else files[k] = c.files[k]; });
    const [author, email] = G_API.person(c.author);
    const n = gitNewCommit(st, c.msg, files, { parents: tip ? [tip.hash] : [], author, email, date: c.date || gitNow(), detachedOnly: true });
    gitRemoteSetRef(sh, store, branch, n.hash, st.commits);
    store.save(); gitSave(sh, dir, st);
    return n;
  },
  rev(sh, path, spec) { const st = G_API.state(sh, path); return st ? gitRev(st, spec) : null; },
  /* dosya yaz, ara dizinler kullaniciya ait olur */
  write(sh, abs, content) { const n = sh.node(abs); if (n && n.t === 'f') { n.d = content; n.ts = Date.now(); } else gitInstall(sh, abs, mkfile(content, 0o644, 'burak')); },
  install(sh, abs, node) { gitInstall(sh, abs, node); },
  hasMarkers(text) { return /^(<{7}|={7}|>{7})/m.test(text || ''); },
};

registerExt({
  files: gitFreshFiles(),
  commands: { git: gitCommand },
  manual: {
    git: { d: 'Version control. Config repo\'sunda kim neyi ne zaman degistirdi, hepsi burada', u: ['git status', 'git log [--oneline] [--graph --all] [-n N] [--author=isim] [--stat] [-p]', 'git show <hash|HEAD~N|tag>', 'git diff [--staged] [<a> <b>] [-- dosya]', 'git blame dosya', 'git bisect start|bad|good|run|reset', 'git add dosya, git commit -m "mesaj"', 'git branch, git switch -c isim, git merge isim', 'git rebase main, git cherry-pick hash', 'git stash, git stash pop', 'git tag -a v1.0.0 -m "mesaj"', 'git remote add origin url, git push -u origin main, git pull', 'git reflog, git reset --hard HEAD@{1}'], e: ['git log --oneline --graph --all', 'git show HEAD~1', 'git diff v1.0 HEAD -- branch-ams-01.conf', 'git switch -c feature/x', 'git merge --no-ff feature/x'] },
    'git-log': { d: 'Commit gecmisini listeler, en yeni ustte', u: ['git log', 'git log --oneline', 'git log --oneline --graph --all --decorate', 'git log main..feature, feature\'da olup main\'de olmayanlar', 'git log -n 3', 'git log --author=ayse', 'git log --since=2026-09-20', 'git log --stat', 'git log -p dosya'], e: ['git log --oneline --author=mehmet', 'git log -3 --stat', 'git log --oneline --graph --all'] },
    'git-diff': { d: 'Iki durum arasindaki satir farkini unified diff olarak gosterir', u: ['git diff, working tree ile index', 'git diff --staged, index ile HEAD', 'git diff <a> <b>', 'git diff <a>..<b> -- dosya', 'git diff main...feature --stat'], e: ['git diff', 'git diff --staged', 'git diff HEAD~3 HEAD'] },
    'git-blame': { d: 'Dosyanin her satirini yazan commit, kisi ve tarihi gosterir', u: ['git blame dosya', 'git blame -L 10,20 dosya'], e: ['git blame branch-ams-01.conf', 'git blame -L 11,16 branch-ams-01.conf'] },
    'git-bisect': { d: 'Iyi ve kotu commit arasinda binary search ile hatayi getiren commit\'i bulur', u: ['git bisect start', 'git bisect bad [rev]', 'git bisect good <rev>', 'her adimda test et, sonra git bisect good ya da bad', 'git bisect run ./script.sh, exit 0 good 1 bad', 'git bisect reset'], e: ['git bisect start', 'git bisect bad', 'git bisect good v1.0', 'git bisect run ./check-policy.sh', 'git bisect reset'] },
    'git-stash': { d: 'Commit etmeye hazir olmayan degisiklikleri kenara alir, sonra geri getirir', u: ['git stash', 'git stash list', 'git stash pop', 'git stash -u, untracked dahil'], e: ['git stash', 'git stash pop'] },
    'git-commit': { d: 'Stage edilmis degisiklikleri bir commit olarak kaydeder', u: ['git add dosya', 'git commit -m "feat: ne degisti ve neden"', 'git commit -am "mesaj", tracked degisikliklerin hepsi', 'git commit --amend -m "yeni mesaj"'], e: ['git add branch-ams-01.conf', 'git commit -m "branch-ams-01: restore WAN mtu 1500"'] },
    'git-branch': { d: 'Branch listeler, olusturur, siler', u: ['git branch', 'git branch isim', 'git branch -d isim, merge edilmisse siler', 'git branch -D isim, zorla siler', 'git branch -vv, upstream ile birlikte'], e: ['git branch', 'git branch -d feature/x'] },
    'git-switch': { d: 'Branch degistirir, -c ile yeni branch acar', u: ['git switch isim', 'git switch -c yeni-branch', 'git switch -, onceki branch'], e: ['git switch -c feature/bgp-parser', 'git switch main'] },
    'git-merge': { d: 'Baska bir branch\'i bulundugun branch\'e birlestirir', u: ['git merge branch, mumkunse fast-forward', 'git merge --no-ff branch, her zaman merge commit', 'conflict olursa dosyayi duzelt, git add, git commit', 'git merge --abort'], e: ['git merge feature/x', 'git merge --no-ff feature/x'] },
    'git-rebase': { d: 'Branch\'in commit\'lerini baska bir base uzerine yeniden oynatir, hash\'ler degisir', u: ['git rebase main', 'conflict olursa duzelt, git add, git rebase --continue', 'git rebase --abort', 'git rebase -i main, bu lab\'da sadece aciklar'], e: ['git rebase main', 'git rebase --continue'] },
    'git-cherry-pick': { d: 'Tek bir commit\'i bulundugun branch\'e yeni commit olarak uygular', u: ['git cherry-pick hash', 'git cherry-pick branch, o branch\'in tip commit\'i', 'git cherry-pick --continue, --abort'], e: ['git cherry-pick a1b2c3d', 'git cherry-pick main'] },
    'git-tag': { d: 'Bir commit\'e kalici isim verir, surum numaralari icin', u: ['git tag', 'git tag -a v1.0.0 -m "release notes"', 'git tag -a v1.0.0 -m "mesaj" <commit>', 'git tag -l "v1.*"', 'git show v1.0.0', 'git describe --tags'], e: ['git tag -a v1.0.0 -m "first stable release"', 'git describe --tags'] },
    'git-remote': { d: 'Uzak repo tanimlari', u: ['git remote add origin url', 'git remote -v', 'git push -u origin main', 'git push --tags', 'git push --force-with-lease, rebase sonrasi', 'git fetch', 'git pull'], e: ['git remote add origin https://github.com/burak/netauto.git', 'git push -u origin main'] },
    'git-reflog': { d: 'HEAD\'in ugradigi her commit, reset ile kaybolani geri getirmek icin', u: ['git reflog', 'git reset --hard HEAD@{1}', 'git checkout -b kurtar <hash>'], e: ['git reflog', 'git reset --hard HEAD@{1}'] },
    'git-reset': { d: 'HEAD\'i tasir. --soft index\'i korur, --mixed index\'i sifirlar, --hard working tree\'yi de', u: ['git reset --soft HEAD~1', 'git reset HEAD~1', 'git reset --hard HEAD~1', 'git reset dosya, unstage'], e: ['git reset --soft main', 'git reset --hard HEAD@{1}'] },
  },
  onReset: sh => { gitFreshFiles().forEach(f => sh.install(f.path, f.node)); },
});
