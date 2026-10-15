'use strict';
/* Linux Lab sistem eklentisi. Mousepad cheat sheet'indeki her komut burada calisir.
   Kullanici ve grup yonetimi, donanim, arsiv, paket, sistem, ssh ve transfer, job kontrolu, arama, dosya ve degisken komutlari.
   Butun ust seviye isimler SYS_ ya da sys on ekini tasir, tum dosyalar tek global scope paylasiyor.
   Durum sanal dosya sistemine yazilir, /etc/passwd, /etc/group, /var/lib/dpkg/status, /proc/modules, /var/lib/lab-sys/state gibi.
   Var olan komutlar COMMANDS uzerinden sarmalanir, execSimple once COMMANDS'a bakar. */

const SYS_STATE = '/var/lib/lab-sys/state';
const SYS_DPKG = '/var/lib/dpkg/status';
const SYS_LOCATEDB = '/var/lib/mlocate/mlocate.db';
const SYS_MOUNTS = '/proc/mounts';
const SYS_MODULES = '/proc/modules';
const SYS_ATDIR = '/var/spool/cron/atjobs';
const SYS_SHUTDOWN = '/run/systemd/shutdown/scheduled';
const SYS_REMOTE = '/srv/remote';
const SYS_KERNEL = '6.8.0-45-generic';
const SYS_BOOT = 'Fri Oct 10 07:58';

/* ---------- magic prefixler, arsiv ve sifreli dosya icerikleri JSON manifest olarak saklanir ---------- */
const SYS_MAGIC = { tar: '\x00LABTAR\x00', gz: '\x1f\x8b\x08', xz: '\xfd7zXZ\x00', bz2: 'BZh9', zip: 'PK\x03\x04', gpg: '\x8c\x0d\x04\x09' };
function sysPack(kind, obj) { return SYS_MAGIC[kind] + JSON.stringify(obj); }
function sysKind(data) { for (const k of Object.keys(SYS_MAGIC)) if (typeof data === 'string' && data.startsWith(SYS_MAGIC[k])) return k; return null; }
function sysUnpack(data) { const k = sysKind(data); if (!k) return null; try { return { kind: k, obj: JSON.parse(data.slice(SYS_MAGIC[k].length)) }; } catch (e) { return null; } }

/* ---------- genel yardimcilar ---------- */
/* en verilirse Ingilizce modda o metin kullanilir */
function sysNote(t, en) { return '💡 ' + lt(t, en); }
function sysPad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }
function sysLpad(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }
function sysNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function sysHash(s, len) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } let out = ''; let x = h || 1; while (out.length < len) { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; out += x.toString(16).padStart(8, '0'); } return out.slice(0, len); }
function sysB64(s, len) { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; const h = sysHash(s, len * 2); let o = ''; for (let i = 0; i < len; i++) o += A[parseInt(h.slice(i * 2, i * 2 + 2), 16) % 64]; return o; }
const SYS_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SYS_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function sysHM(d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function sysHMS(d) { return sysHM(d) + ':' + String(d.getSeconds()).padStart(2, '0'); }
function sysYMD(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
/* Tue Oct 13 10:30:00 2026 */
function sysCtime(d) { return `${SYS_DAYS[d.getDay()]} ${SYS_MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, ' ')} ${sysHMS(d)} ${d.getFullYear()}`; }
/* Tue 2026-10-13 10:30:00 CEST */
function sysSysd(d) { return `${SYS_DAYS[d.getDay()]} ${sysYMD(d)} ${sysHMS(d)} CEST`; }

/* key=value durum dosyasi */
function sysState(sh) {
  const n = sh.node(SYS_STATE);
  const st = { umask: '0022', nofile: '1024', nofileHard: '1048576', tz: 'Europe/Amsterdam', ntp: '1', extra: '', ro: '', hostname: '' };
  if (n && n.t === 'f') lines(n.d).forEach(l => { const i = l.indexOf('='); if (i > 0) st[l.slice(0, i)] = l.slice(i + 1); });
  return st;
}
function sysSetState(sh, st) {
  const d = Object.keys(st).map(k => k + '=' + st[k]).join('\n') + '\n';
  const n = sh.node(SYS_STATE);
  if (n && n.t === 'f') n.d = d; else sh.install(SYS_STATE, mkfile(d, 0o600, 'root'));
}
function sysRootWrite(sh, path, data, mode, owner) {
  const n = sh.node(path);
  if (n && n.t === 'f') { n.d = data; n.ts = Date.now(); } else sh.install(path, mkfile(data, mode === undefined ? 0o644 : mode, owner || 'root'));
}
function sysRead(sh, path) { const n = sh.node(path); return n && n.t === 'f' ? n.d : ''; }
function sysDel(sh, abs) { const { dir, name } = sh.parent(abs); if (dir && dir.c[name]) delete dir.c[name]; }
function sysClone(n) { return JSON.parse(JSON.stringify(n)); }
function sysWalk(sh, abs, fn) {
  const n = sh.node(abs);
  if (!n) return;
  fn(abs, n);
  if (n.t === 'd') for (const c of Object.keys(n.c).sort()) sysWalk(sh, abs === '/' ? '/' + c : abs + '/' + c, fn);
}
function sysSize(n) { return n.t === 'f' ? n.d.length : Object.values(n.c).reduce((s, c) => s + sysSize(c), 4096); }
function sysHuman(n) { if (n < 1024) return n + ''; if (n < 1048576) return (n / 1024).toFixed(n / 1024 < 10 ? 1 : 0) + 'K'; if (n < 1073741824) return (n / 1048576).toFixed(n / 1048576 < 10 ? 1 : 0) + 'M'; return (n / 1073741824).toFixed(1) + 'G'; }
function sysNewPid(sh) { let p = 3000 + Math.floor(Math.random() * 5000); while (sh.procs.some(x => x.pid === p)) p++; return p; }

/* ---------- kullanici ve grup dosyalari ---------- */
const SYS_GROUP_FILE = [
  'root:x:0:', 'daemon:x:1:', 'bin:x:2:', 'sys:x:3:', 'adm:x:4:syslog,burak', 'tty:x:5:', 'disk:x:6:', 'lp:x:7:', 'mail:x:8:', 'cdrom:x:24:burak', 'sudo:x:27:burak',
  'audio:x:29:', 'dip:x:30:burak', 'www-data:x:33:', 'backup:x:34:', 'plugdev:x:46:burak', 'users:x:100:', 'systemd-journal:x:999:', 'docker:x:998:burak',
  'postgres:x:120:', 'syslog:x:104:', 'burak:x:1000:', 'deploy:x:1001:', 'developers:x:1500:burak',
].join('\n') + '\n';
const SYS_SHADOW_FILE = 'root:$6$Zx9Qm2Lp$9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0:19500:0:99999:7:::\ndaemon:*:19000:0:99999:7:::\nbin:*:19000:0:99999:7:::\nsys:*:19000:0:99999:7:::\nsync:*:19000:0:99999:7:::\nwww-data:*:19000:0:99999:7:::\nbackup:*:19000:0:99999:7:::\nsshd:*:19000:0:99999:7:::\npostgres:*:19000:0:99999:7:::\nburak:$6$k2PzR8Wq$1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3:19500:0:99999:7:::\ndeploy:$6$Hs7Lm3Vb$aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44e:19600:0:99999:7:::\nFLAG{root_okur_sen_okuyamazsin}\n';

function sysPasswd(sh) {
  return lines(sysRead(sh, '/etc/passwd')).filter(l => l.includes(':')).map(l => { const p = l.split(':'); return { name: p[0], x: p[1] || 'x', uid: +p[2], gid: +p[3], gecos: p[4] || '', home: p[5] || '/', shell: p[6] || '/bin/sh' }; });
}
function sysSavePasswd(sh, list) { sysRootWrite(sh, '/etc/passwd', join(list.map(u => [u.name, u.x, u.uid, u.gid, u.gecos, u.home, u.shell].join(':'))), 0o644); }
function sysGroups(sh) {
  return lines(sysRead(sh, '/etc/group')).filter(l => l.includes(':')).map(l => { const p = l.split(':'); return { name: p[0], x: p[1] || 'x', gid: +p[2], members: (p[3] || '').split(',').filter(Boolean) }; });
}
function sysSaveGroups(sh, list) { sysRootWrite(sh, '/etc/group', join(list.map(g => [g.name, g.x, g.gid, g.members.join(',')].join(':'))), 0o644); }
function sysShadow(sh) {
  return lines(sysRead(sh, '/etc/shadow')).map(l => { if (!l.includes(':')) return { raw: l }; const p = l.split(':'); return { name: p[0], hash: p[1], last: p[2] || '19500', min: p[3] || '0', max: p[4] || '99999', warn: p[5] || '7', rest: p.slice(6).join(':') }; });
}
function sysSaveShadow(sh, list) { sysRootWrite(sh, '/etc/shadow', join(list.map(s => (s.raw !== undefined ? s.raw : [s.name, s.hash, s.last, s.min, s.max, s.warn, s.rest].join(':')))), 0o640); }
function sysUser(sh, name) { return sysPasswd(sh).find(u => u.name === name) || null; }
function sysGroup(sh, name) { return sysGroups(sh).find(g => g.name === name || String(g.gid) === String(name)) || null; }
function sysUserGroups(sh, u) {
  const gs = sysGroups(sh);
  const prim = gs.find(g => g.gid === u.gid);
  const list = [];
  if (prim) list.push(prim);
  gs.forEach(g => { if (g.members.includes(u.name) && !list.includes(g)) list.push(g); });
  return list;
}
function sysIdLine(sh, u) {
  const gs = sysUserGroups(sh, u);
  const prim = gs[0] ? `${gs[0].gid}(${gs[0].name})` : `${u.gid}`;
  return `uid=${u.uid}(${u.name}) gid=${prim} groups=${gs.map(g => `${g.gid}(${g.name})`).join(',') || prim}`;
}
function sysCurrentUser(sh) { return sh.isRoot ? 'root' : USER; }
function sysSkel(owner) {
  return mkdir({
    '.bashrc': mkfile('# ~/.bashrc: executed by bash(1) for non-login shells.\ncase $- in\n    *i*) ;;\n      *) return;;\nesac\nHISTSIZE=1000\nalias ls=\'ls --color=auto\'\n', 0o644, owner),
    '.profile': mkfile('# ~/.profile: executed by the command interpreter for login shells.\nif [ -n "$BASH_VERSION" ]; then\n    if [ -f "$HOME/.bashrc" ]; then\n        . "$HOME/.bashrc"\n    fi\nfi\n', 0o644, owner),
    '.bash_logout': mkfile('# ~/.bash_logout: executed by bash(1) when login shell exits.\n', 0o644, owner),
  }, 0o750, owner);
}
function sysSetGroup(n, g) { n.g = g; if (n.t === 'd') Object.values(n.c).forEach(c => sysSetGroup(c, g)); }

/* ---------- paket katalogu ---------- */
const SYS_PKGS = [
  { n: 'nginx', v: '1.24.0-2ubuntu7.1', d: 'small, powerful, scalable web/proxy server', s: 1540, i: 1, f: ['/usr/sbin/nginx', '/etc/nginx/nginx.conf', '/var/www/html/index.nginx-debian.html'] },
  { n: 'htop', v: '3.3.0-4build1', d: 'interactive processes viewer', s: 420, i: 0, f: ['/usr/bin/htop', '/usr/share/man/man1/htop.1.gz'] },
  { n: 'tmux', v: '3.4-1ubuntu0.1', d: 'terminal multiplexer', s: 1120, i: 0, f: ['/usr/bin/tmux'] },
  { n: 'jq', v: '1.7.1-3build1', d: 'lightweight and flexible command-line JSON processor', s: 160, i: 0, f: ['/usr/bin/jq'] },
  { n: 'tree', v: '2.1.1-2ubuntu3', d: 'displays an indented directory tree, in color', s: 120, i: 1, f: ['/usr/bin/tree'] },
  { n: 'git', v: '1:2.43.0-1ubuntu7.1', d: 'fast, scalable, distributed revision control system', s: 23700, i: 1, f: ['/usr/bin/git', '/usr/lib/git-core/git-log'] },
  { n: 'curl', v: '8.5.0-2ubuntu10.4', d: 'command line tool for transferring data with URL syntax', s: 530, i: 1, f: ['/usr/bin/curl'] },
  { n: 'wget', v: '1.21.4-1ubuntu4.1', d: 'retrieves files from the web', s: 1010, i: 1, f: ['/usr/bin/wget', '/etc/wgetrc'] },
  { n: 'python3', v: '3.12.3-0ubuntu2', d: 'interactive high-level object-oriented language (default python3 version)', s: 90, i: 1, f: ['/usr/bin/python3'] },
  { n: 'net-tools', v: '2.10-0.1ubuntu4', d: 'NET-3 networking toolkit', s: 1010, i: 1, f: ['/usr/bin/netstat', '/usr/sbin/ifconfig', '/usr/sbin/route', '/usr/sbin/arp'] },
  { n: 'iproute2', v: '6.1.0-1ubuntu6', d: 'networking and traffic control tools', s: 3660, i: 1, f: ['/usr/bin/ip', '/usr/bin/ss', '/usr/sbin/tc'] },
  { n: 'tcpdump', v: '4.99.4-3ubuntu4', d: 'command-line network traffic analyzer', s: 1390, i: 1, f: ['/usr/bin/tcpdump'] },
  { n: 'nmap', v: '7.94+git20230807.3be01efb1+dfsg-3build2', d: 'The Network Mapper', s: 5420, i: 0, f: ['/usr/bin/nmap'] },
  { n: 'vim', v: '2:9.1.0016-1ubuntu7.3', d: 'Vi IMproved - enhanced vi editor', s: 4100, i: 1, f: ['/usr/bin/vim.basic', '/usr/share/vim/vim91/defaults.vim'] },
  { n: 'docker.io', v: '26.1.3-0ubuntu1~24.04.1', d: 'Linux container runtime', s: 158000, i: 1, f: ['/usr/bin/dockerd', '/usr/bin/docker', '/lib/systemd/system/docker.service'] },
  { n: 'openssh-server', v: '1:9.6p1-3ubuntu13.5', d: 'secure shell (SSH) server, for secure access from remote machines', s: 1980, i: 1, f: ['/usr/sbin/sshd', '/etc/ssh/sshd_config'] },
  { n: 'mlocate', v: '1.1.22-1', d: 'quickly find files on the filesystem based on their name', s: 480, i: 0, f: ['/usr/bin/locate', '/usr/bin/updatedb', '/etc/updatedb.conf'] },
  { n: 'finger', v: '0.17-17build1', d: 'user information lookup program', s: 60, i: 0, f: ['/usr/bin/finger'] },
  { n: 'rsync', v: '3.2.7-1ubuntu1', d: 'fast, versatile, remote (and local) file-copying tool', s: 820, i: 1, f: ['/usr/bin/rsync'] },
  { n: 'zip', v: '3.0-13build1', d: 'Archiver for .zip files', s: 600, i: 1, f: ['/usr/bin/zip'] },
  { n: 'unzip', v: '6.0-28ubuntu4.1', d: 'De-archiver for .zip files', s: 400, i: 1, f: ['/usr/bin/unzip'] },
  { n: 'gnupg', v: '2.4.4-2ubuntu17', d: 'GNU privacy guard - a free PGP replacement', s: 860, i: 1, f: ['/usr/bin/gpg'] },
  { n: 'build-essential', v: '12.10ubuntu1', d: 'Informational list of build-essential packages', s: 20, i: 1, f: ['/usr/share/doc/build-essential/copyright'] },
  { n: 'apache2', v: '2.4.58-1ubuntu8.4', d: 'Apache HTTP Server', s: 540, i: 0, f: ['/usr/sbin/apache2', '/etc/apache2/apache2.conf'] },
  { n: 'postgresql', v: '16+257build1.1', d: 'object-relational SQL database (supported version)', s: 70, i: 1, f: ['/usr/share/doc/postgresql/README.Debian'] },
  { n: 'ncdu', v: '1.19-0.1', d: 'ncurses disk usage viewer', s: 130, i: 0, f: ['/usr/bin/ncdu'] },
  { n: 'lshw', v: '02.19.git.2021.06.19.996aaad9c7-2build3', d: 'information about hardware configuration', s: 1030, i: 1, f: ['/usr/bin/lshw'] },
  { n: 'hdparm', v: '9.65+ds-1build1', d: 'tune hard disk parameters for high performance', s: 250, i: 1, f: ['/usr/sbin/hdparm', '/etc/hdparm.conf'] },
  { n: 'fail2ban', v: '1.0.2-3ubuntu0.1', d: 'ban hosts that cause multiple authentication errors', s: 2300, i: 0, f: ['/usr/bin/fail2ban-client', '/etc/fail2ban/jail.conf'] },
  { n: 'ufw', v: '0.36.2-6', d: 'program for managing a Netfilter firewall', s: 860, i: 1, f: ['/usr/sbin/ufw', '/etc/ufw/ufw.conf'] },
  { n: 'cowsay', v: '3.03+dfsg2-8', d: 'configurable talking cow', s: 90, i: 1, f: ['/usr/games/cowsay'] },
];
const SYS_UPGRADABLE = ['curl', 'openssh-server'];
function sysPkg(name) { return SYS_PKGS.find(p => p.n === name) || null; }
function sysDpkgText(installed) {
  return SYS_PKGS.filter(p => installed.includes(p.n)).map(p => `Package: ${p.n}\nStatus: install ok installed\nPriority: optional\nSection: ${p.n === 'nginx' || p.n === 'apache2' ? 'httpd' : p.n === 'git' ? 'vcs' : 'utils'}\nInstalled-Size: ${p.s}\nMaintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>\nArchitecture: amd64\nVersion: ${p.v}\nDescription: ${p.d}\n`).join('\n');
}
function sysInstalled(sh) {
  const d = sysRead(sh, SYS_DPKG);
  const list = [];
  d.replace(/^Package: (\S+)$/gm, (m, n) => { list.push(n); return m; });
  return list.length ? list : SYS_PKGS.filter(p => p.i).map(p => p.n);
}
function sysSetInstalled(sh, list) { sysRootWrite(sh, SYS_DPKG, sysDpkgText(list), 0o644); }
function sysHasPkg(sh, name) { return sysInstalled(sh).includes(name); }
function sysNeedPkg(sh, cmd, pkg) { return sysHasPkg(sh, pkg) ? null : fail(`${cmd}: command not found\n${sysNote(`${cmd} bu kutuda kurulu değil. Ubuntu'da sudo apt install ${pkg}, RHEL ve Fedora'da sudo dnf install ${pkg}`, `${cmd} is not installed on this box. On Ubuntu run sudo apt install ${pkg}, on RHEL and Fedora sudo dnf install ${pkg}`)}`, 127); }

/* ---------- eklenti dosyalari ---------- */
const SYS_SRC = '/home/burak/src/hello-2.12';
function sysFiles() {
  const f = (path, content, mode, owner) => ({ path, node: mkfile(content, mode === undefined ? 0o644 : mode, owner || 'root') });
  const U = USER;
  const remoteHostname = h => f(`${SYS_REMOTE}/${h}/etc/hostname`, h.split('.')[0] + '\n');
  const d = (path, mode, owner) => ({ path, node: mkdir({}, mode === undefined ? 0o755 : mode, owner || 'root') });
  return [
    d('/home/burak/.ssh', 0o700, U), d('/home/burak/src', 0o755, U), d(SYS_SRC, 0o755, U), d(SYS_SRC + '/src', 0o755, U),
    d(`${SYS_REMOTE}/backup.lab/home/burak`, 0o750, U), d(`${SYS_REMOTE}/backup.lab/var/backups`, 0o755, U), d(`${SYS_REMOTE}/web01.lab/home/burak`, 0o750, U), d(`${SYS_REMOTE}/web01.lab/var/www/html`, 0o755, U),
    d('/mnt'), d('/media'), d('/data'), d('/data/db', 0o700, 'postgres'),
    f('/data/README', 'Uygulama verisi, /dev/sdb1 uzerinde. Dolulugu df -h /data ile izle.\n'),
    f('/etc/group', SYS_GROUP_FILE),
    f('/etc/shadow', SYS_SHADOW_FILE, 0o640),
    f('/etc/skel/.bashrc', '# ~/.bashrc: executed by bash(1) for non-login shells.\n'),
    f('/etc/login.defs', 'MAIL_DIR        /var/mail\nPASS_MAX_DAYS   99999\nPASS_MIN_DAYS   0\nPASS_WARN_AGE   7\nUID_MIN          1000\nUID_MAX         60000\nGID_MIN          1000\nGID_MAX         60000\nCREATE_HOME     yes\nUMASK           022\nUSERGROUPS_ENAB yes\n'),
    f('/etc/timezone', 'Europe/Amsterdam\n'),
    f('/etc/fstab', '# <file system> <mount point>   <type>  <options>       <dump>  <pass>\nUUID=3f1c9a2e-7b4d-4c1e-9a0b-2d5e6f7a8b9c /               ext4    errors=remount-ro 0       1\nUUID=8a2b-1C3D  /boot/efi       vfat    umask=0077      0       1\nUUID=5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9 /data           ext4    defaults        0       2\n/swapfile                                 none            swap    sw              0       0\n'),
    f(SYS_MOUNTS, 'sysfs /sys sysfs rw,nosuid,nodev,noexec,relatime 0 0\nproc /proc proc rw,nosuid,nodev,noexec,relatime 0 0\nudev /dev devtmpfs rw,nosuid,relatime,size=1976464k,nr_inodes=494116,mode=755 0 0\n/dev/sda1 / ext4 rw,relatime,errors=remount-ro 0 0\ntmpfs /dev/shm tmpfs rw,nosuid,nodev 0 0\ntmpfs /run tmpfs rw,nosuid,nodev,noexec,relatime,size=402836k,mode=755 0 0\n/dev/sda15 /boot/efi vfat rw,relatime,fmask=0077,dmask=0077,codepage=437,iocharset=iso8859-1,shortname=mixed,errors=remount-ro 0 0\n/dev/sdb1 /data ext4 rw,relatime 0 0\n'),
    f(SYS_MODULES, 'wireguard 98304 0 - Live 0x0000000000000000\nxt_conntrack 12288 2 - Live 0x0000000000000000\nnf_conntrack 196608 3 xt_conntrack,xt_MASQUERADE,nf_nat, Live 0x0000000000000000\nip_tables 32768 2 iptable_filter,iptable_nat, Live 0x0000000000000000\nx_tables 65536 6 xt_conntrack,xt_MASQUERADE,ip_tables,iptable_filter,iptable_nat,xt_tcpudp, Live 0x0000000000000000\nbridge 421888 0 - Live 0x0000000000000000\noverlay 212992 2 - Live 0x0000000000000000\next4 1052672 2 - Live 0x0000000000000000\nvirtio_net 94208 0 - Live 0x0000000000000000\nvirtio_blk 28672 3 - Live 0x0000000000000000\n'),
    f('/proc/cpuinfo', [0, 1].map(i => `processor\t: ${i}\nvendor_id\t: GenuineIntel\ncpu family\t: 6\nmodel\t\t: 85\nmodel name\t: Intel(R) Xeon(R) Gold 6248 CPU @ 2.50GHz\nstepping\t: 7\nmicrocode\t: 0x5003604\ncpu MHz\t\t: 2494.140\ncache size\t: 28160 KB\nphysical id\t: 0\nsiblings\t: 2\ncore id\t\t: ${i}\ncpu cores\t: 2\nfpu\t\t: yes\ncpuid level\t: 22\nwp\t\t: yes\nflags\t\t: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 ss ht syscall nx pdpe1gb rdtscp lm constant_tsc rep_good nopl xtopology cpuid tsc_known_freq pni pclmulqdq ssse3 fma cx16 pcid sse4_1 sse4_2 x2apic movbe popcnt aes xsave avx f16c rdrand hypervisor lahf_lm abm 3dnowprefetch avx2 bmi1 bmi2 avx512f avx512dq avx512cd avx512bw avx512vl\nbugs\t\t: spectre_v1 spectre_v2 spec_store_bypass mds swapgs taa itlb_multihit mmio_stale_data retbleed\nbogomips\t: 4988.28\nclflush size\t: 64\ncache_alignment\t: 64\naddress sizes\t: 46 bits physical, 48 bits virtual\n`).join('\n') + '\n'),
    f('/proc/meminfo', 'MemTotal:        4028340 kB\nMemFree:          812344 kB\nMemAvailable:    2310220 kB\nBuffers:          102384 kB\nCached:          1398452 kB\nSwapCached:         4120 kB\nActive:          1540232 kB\nInactive:         980120 kB\nSwapTotal:       2097148 kB\nSwapFree:        1966076 kB\nDirty:               212 kB\nMapped:           210344 kB\nShmem:             12288 kB\nSlab:             180236 kB\nCommitLimit:     4111316 kB\nCommitted_AS:    2890112 kB\nVmallocTotal:   34359738367 kB\nHugePages_Total:       0\nHugepagesize:       2048 kB\n'),
    f('/proc/loadavg', '1.02 0.98 0.95 2/312 4821\n'),
    f('/proc/uptime', '275543.21 498120.55\n'),
    f('/etc/ssh/ssh_config', 'Include /etc/ssh/ssh_config.d/*.conf\nHost *\n    SendEnv LANG LC_*\n    HashKnownHosts yes\n    GSSAPIAuthentication yes\n'),
    f('/home/burak/.ssh/known_hosts', 'backup.lab,10.50.0.40 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG4bYx3kQ2p0F9vLzS1mN7cRt8uWe2aHd6jK5lPqZbAc\nweb01.lab,10.50.0.41 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJ9sTq2wErTy4uIo8pLkJh7gFdSa3zXcVbNm1qAzWsXe\n', 0o600, U),
    f('/home/burak/.ssh/config', '# ssh client config, ssh backup yazinca backup.lab 22 user burak\nHost backup\n    HostName backup.lab\n    User burak\n    Port 22\n\nHost web01\n    HostName web01.lab\n    User burak\n', 0o600, U),
    remoteHostname('backup.lab'),
    f(`${SYS_REMOTE}/backup.lab/var/backups/notes-2026-10-01.tar.gz`, sysPack('gz', { n: 'notes-2026-10-01.tar', d: sysPack('tar', { members: [{ p: 'notes.txt', t: 'f', m: 0o644, o: U, d: 'TODO: nginx config duzelt\nTODO: yedekleme scriptini yaz\n' }] }) })),
    f(`${SYS_REMOTE}/backup.lab/var/backups/README`, 'Bu dizin gece yedeklerini tutar. Yedekler tar.gz, isim formati <kaynak>-<tarih>.tar.gz\n'),
    f(`${SYS_REMOTE}/backup.lab/home/burak/.bashrc`, '# ~/.bashrc on backup.lab\n', 0o644, U),
    f(`${SYS_REMOTE}/backup.lab/home/burak/motd.txt`, 'backup.lab, nightly backup host. Disk /dev/sdb1 on /var/backups\n', 0o644, U),
    remoteHostname('web01.lab'),
    f(`${SYS_REMOTE}/web01.lab/var/www/html/index.html`, '<h1>web01, production front</h1>\n'),
    f(`${SYS_REMOTE}/web01.lab/var/log/nginx/access.log`, '192.168.1.10 - - [13/Oct/2026:09:00:01 +0200] "GET / HTTP/1.1" 200 612\n203.0.113.45 - - [13/Oct/2026:09:01:10 +0200] "GET /wp-login.php HTTP/1.1" 404 153\n192.168.1.22 - - [13/Oct/2026:09:05:40 +0200] "GET /api/status HTTP/1.1" 200 48\n'),
    f(`${SYS_REMOTE}/web01.lab/home/burak/.bashrc`, '# ~/.bashrc on web01.lab\n', 0o644, U),
    f(`${SYS_REMOTE}/web01.lab/etc/nginx/nginx.conf`, 'user www-data;\nworker_processes auto;\nhttp {\n    server {\n        listen 80;\n        root /var/www/html;\n    }\n}\n'),
    f(`${SYS_SRC}/README`, 'GNU Hello 2.12, lab surumu\n\nKaynaktan kurulum, klasik uclu\n  ./configure\n  make\n  sudo make install\n\nconfigure Makefile.in dosyasindan Makefile uretir, make hello binary\'sini derler, make install /usr/local/bin altina kopyalar.\n', 0o644, U),
    f(`${SYS_SRC}/NEWS`, '* Noteworthy changes in release 2.12 (2022-01-01)\n** Bug fixes, translation updates.\n', 0o644, U),
    f(`${SYS_SRC}/src/hello.c`, '#include <stdio.h>\n#include <config.h>\n\nint main (int argc, char **argv)\n{\n  printf ("Hello, world!\\n");\n  return 0;\n}\n', 0o644, U),
    f(`${SYS_SRC}/Makefile.in`, '# Makefile.in, configure bunu Makefile yapar\nprefix = @prefix@\nbindir = $(prefix)/bin\nCC = gcc\nCFLAGS = -O2 -g -Wall\n\nall: hello\n\nhello: src/hello.c\n\t$(CC) $(CFLAGS) -I. -o hello src/hello.c\n\ninstall: hello\n\t/usr/bin/install -c -d $(bindir)\n\t/usr/bin/install -c hello $(bindir)/hello\n\nuninstall:\n\trm -f $(bindir)/hello\n\nclean:\n\trm -f hello\n', 0o644, U),
    f(`${SYS_SRC}/configure`, '#!/bin/bash\n# GNU Hello configure, lab surumu. --prefix=/dizin kabul eder\nPREFIX=/usr/local\nfor a in "$@"; do\n  case $a in\n    --prefix=*) PREFIX=${a#--prefix=};;\n    --help) echo "Usage: ./configure [--prefix=PREFIX]"; exit 0;;\n  esac\ndone\necho "checking for a BSD-compatible install... /usr/bin/install -c"\necho "checking whether build environment is sane... yes"\necho "checking for gcc... gcc"\necho "checking whether the C compiler works... yes"\necho "checking whether we are using the GNU C compiler... yes"\necho "checking for stdio.h... yes"\necho "checking for library containing strerror... none required"\necho "configure: creating ./config.status"\necho "config.status: creating Makefile"\necho "config.status: creating src/config.h"\nsed "s|@prefix@|$PREFIX|" Makefile.in > Makefile\necho "#define PACKAGE_STRING \\"GNU Hello 2.12\\"" > src/config.h\n', 0o755, U),
    f('/var/log/wtmp', 'binary wtmp, last komutu okur\n', 0o664),
    f('/var/log/big/journal.log', Array.from({ length: 400 }, (x, i) => `Oct 13 0${i % 10}:${String(i % 60).padStart(2, '0')}:00 linuxlab journal[${1000 + i}]: rotated segment ${i} size=4096 state=ok checksum=${sysHash('seg' + i, 32)}`).join('\n') + '\n'),
  ];
}
/* Eski kayitlarda eksik olan seyleri tamamlar, her komut basinda ucuz bir kontrol */
function sysEnsure(sh) {
  if (!sh.node('/etc/group')) sysFiles().forEach(f => { if (!sh.node(f.path)) sh.install(f.path, f.node); });
  const hosts = sh.node('/etc/hosts');
  if (hosts && hosts.t === 'f' && !hosts.d.includes('backup.lab')) hosts.d += '\n# lab remote hosts\n10.50.0.40\tbackup.lab backup\n10.50.0.41\tweb01.lab web01\n';
  if (!sh.node(SYS_DPKG)) sysSetInstalled(sh, SYS_PKGS.filter(p => p.i).map(p => p.n));
  ['/home/burak/.ssh', '/home/burak/src', SYS_SRC, SYS_SRC + '/src', `${SYS_REMOTE}/backup.lab/home/burak`, `${SYS_REMOTE}/backup.lab/var/backups`, `${SYS_REMOTE}/web01.lab/home/burak`, `${SYS_REMOTE}/web01.lab/var/www/html`].forEach(p => { const n = sh.node(p); if (n && n.t === 'd' && n.o === 'root') { n.o = USER; if (p.endsWith('.ssh')) n.m = 0o700; } });
  ['/mnt', '/media', '/data'].forEach(p => { if (!sh.node(p)) sh.install(p, mkdir({}, 0o755, 'root')); });
  if (!sh.sysTraps) sh.sysTraps = {};
  if (!sh.sysReadonly) sh.sysReadonly = new Set();
}

/* ======================================================================
   1. Kullanicilar ve gruplar
   ====================================================================== */
const SYS_CMDS = {};

SYS_CMDS.useradd = function (args) {
  sysEnsure(this);
  if (!this.isRoot) return fail('useradd: Permission denied.\nuseradd: cannot lock /etc/passwd; try again later.');
  const { flags, vals, rest } = parseOpts(args, 'sGugdcK');
  const name = rest[0];
  if (!name) return fail('Usage: useradd [options] LOGIN\n\nOptions:\n  -m, --create-home             create the user\'s home directory\n  -s, --shell SHELL             login shell of the new account\n  -G, --groups GROUPS           list of supplementary groups of the new account\n  -u, --uid UID                 user ID of the new account\n  -c, --comment COMMENT         GECOS field of the new account', 2);
  if (!/^[a-z_][a-z0-9_-]*$/.test(name)) return fail(`useradd: invalid user name '${name}'`, 3);
  const users = sysPasswd(this);
  if (users.some(u => u.name === name)) return fail(`useradd: user '${name}' already exists`, 9);
  const groups = sysGroups(this);
  const extra = vals.G ? vals.G.split(',').filter(Boolean) : [];
  for (const g of extra) if (!groups.some(x => x.name === g)) return fail(`useradd: group '${g}' does not exist`, 6);
  let uid = vals.u ? +vals.u : Math.max(999, ...users.map(u => u.uid).filter(u => u < 60000)) + 1;
  if (users.some(u => u.uid === uid)) return fail(`useradd: UID ${uid} is not unique`, 4);
  let gid = uid;
  if (vals.g) { const g = sysGroup(this, vals.g); if (!g) return fail(`useradd: group '${vals.g}' does not exist`, 6); gid = g.gid; }
  else { while (groups.some(g => g.gid === gid)) gid++; groups.push({ name, x: 'x', gid, members: [] }); }
  const home = vals.d || '/home/' + name;
  const shell = vals.s || '/bin/sh';
  users.push({ name, x: 'x', uid, gid, gecos: vals.c || '', home, shell });
  sysSavePasswd(this, users);
  extra.forEach(g => { const gg = groups.find(x => x.name === g); if (!gg.members.includes(name)) gg.members.push(name); });
  sysSaveGroups(this, groups);
  const sh = sysShadow(this); sh.splice(sh.findIndex(s => s.raw !== undefined) < 0 ? sh.length : sh.findIndex(s => s.raw !== undefined), 0, { name, hash: '!', last: '20740', min: '0', max: '99999', warn: '7', rest: '::' }); sysSaveShadow(this, sh);
  if (flags.has('m')) { if (!this.node(home)) { this.install(home, sysSkel(name)); sysSetGroup(this.node(home), name); } }
  const notes = [];
  if (!flags.has('m')) notes.push(sysNote(`-m vermedin, home directory açılmadı. Debian'da useradd default olarak home açmaz, adduser açar`, `You did not pass -m, so no home directory was created. On Debian useradd does not create a home by default, adduser does`));
  if (!vals.s) notes.push(sysNote(`-s vermedin, shell /bin/sh oldu. Bash için -s /bin/bash`, `You did not pass -s, so the shell is /bin/sh. For bash use -s /bin/bash`));
  notes.push(sysNote(`Hesap kilitli geldi, şifre için sudo passwd ${name}`, `The account starts locked, set a password with sudo passwd ${name}`));
  return ok(notes.length ? notes.join('\n') + '\n' : '');
};

SYS_CMDS.adduser = function (args) {
  sysEnsure(this);
  if (!this.isRoot) return fail('adduser: Only root may add a user or group to the system.');
  const plain = args.filter(a => !a.startsWith('--'));
  const name = plain[0];
  if (!name) return fail('adduser: Only one or two names allowed.\nUsage: adduser [--home DIR] [--shell SHELL] [--gecos GECOS] [--disabled-password] USER\n       adduser USER GROUP', 1);
  if (plain[1]) {
    const u = sysUser(this, name); const groups = sysGroups(this); const g = groups.find(x => x.name === plain[1]);
    if (!u) return fail(`adduser: The user \`${name}' does not exist.`, 1);
    if (!g) return fail(`adduser: The group \`${plain[1]}' does not exist.`, 1);
    if (g.members.includes(name)) return ok(`The user \`${name}' is already a member of \`${plain[1]}'.\n`);
    g.members.push(name); sysSaveGroups(this, groups);
    return ok(`Adding user \`${name}' to group \`${plain[1]}' ...\nAdding user ${name} to group ${plain[1]}\nDone.\n`);
  }
  if (!/^[a-z_][a-z0-9_-]*$/.test(name)) return fail(`adduser: To avoid problems, the username should consist only of letters, digits, underscores, periods, at signs and dashes, and not start with a dash (as defined by IEEE Std 1003.1-2001). For compatibility with Samba machine accounts $ is also supported at the end of the username`, 1);
  if (sysUser(this, name)) return fail(`adduser: The user \`${name}' already exists.`, 1);
  const shellIdx = args.indexOf('--shell');
  const r = SYS_CMDS.useradd.call(this, ['-m', '-s', shellIdx >= 0 ? args[shellIdx + 1] : '/bin/bash', name]);
  if (r.err) return r;
  const u = sysUser(this, name);
  const sd = sysShadow(this); const s = sd.find(x => x.name === name); if (s) s.hash = '$6$lab$' + sysHash('lab:' + name, 86); sysSaveShadow(this, sd);
  return ok(`Adding user \`${name}' ...\nAdding new group \`${name}' (${u.gid}) ...\nAdding new user \`${name}' (${u.uid}) with group \`${name} (${u.gid})' ...\nCreating home directory \`${u.home}' ...\nCopying files from \`/etc/skel' ...\nNew password: \nRetype new password: \npasswd: password updated successfully\nChanging the user information for ${name}\nEnter the new value, or press ENTER for the default\n\tFull Name []: \n\tRoom Number []: \n\tWork Phone []: \n\tHome Phone []: \n\tOther []: \nIs the information correct? [Y/n] \nAdding new user \`${name}' to supplemental / extra groups \`users' ...\nAdding user \`${name}' to group \`users' ...\n${sysNote("Gerçek adduser şifreyi ve bilgileri interaktif sorar, lab'da prompt yok, şifre lab123 kabul edildi. Değiştirmek için sudo passwd " + name, 'Real adduser asks for the password and details interactively, the lab has no prompt, so the password lab123 was accepted. To change it run sudo passwd ' + name)}\n`);
};

SYS_CMDS.userdel = function (args) {
  sysEnsure(this);
  if (!this.isRoot) return fail('userdel: Permission denied.\nuserdel: cannot lock /etc/passwd; try again later.');
  const { flags, rest } = parseOpts(args);
  const name = rest[0];
  if (!name) return fail('Usage: userdel [options] LOGIN\n\nOptions:\n  -r, --remove                  remove home directory and mail spool\n  -f, --force                   force removal of files, even if not owned by user', 2);
  const users = sysPasswd(this);
  const u = users.find(x => x.name === name);
  if (!u) return fail(`userdel: user '${name}' does not exist`, 6);
  if (name === USER || name === 'root') return fail(`userdel: user ${name} is currently used by process ${name === 'root' ? 1 : 733}`, 8);
  sysSavePasswd(this, users.filter(x => x !== u));
  const groups = sysGroups(this);
  groups.forEach(g => { g.members = g.members.filter(m => m !== name); });
  const own = groups.find(g => g.gid === u.gid && g.name === name);
  sysSaveGroups(this, groups.filter(g => g !== own));
  sysSaveShadow(this, sysShadow(this).filter(s => s.name !== name));
  let out = '';
  if (flags.has('r')) { if (this.node(u.home)) sysDel(this, u.home); else out += `userdel: ${name} home directory (${u.home}) not found\n`; }
  else if (this.node(u.home)) out += sysNote(`home directory ${u.home} duruyor, -r ile birlikte silinirdi`, `home directory ${u.home} is still there, -r would have removed it too`) + '\n';
  return ok(out);
};

SYS_CMDS.usermod = function (args) {
  sysEnsure(this);
  if (!this.isRoot) return fail('usermod: Permission denied.\nusermod: cannot lock /etc/passwd; try again later.');
  const { flags, vals, rest } = parseOpts(args, 'Gsdcgul');
  const name = rest[0];
  if (!name) return fail('Usage: usermod [options] LOGIN\n\nOptions:\n  -a, --append                  append the user to the supplemental GROUPS mentioned by the -G option\n  -G, --groups GROUPS           new list of supplementary GROUPS\n  -s, --shell SHELL             new login shell for the user account\n  -L, --lock                    lock the user account\n  -U, --unlock                  unlock the user account\n  -d, --home HOME_DIR           new home directory for the user account\n  -l, --login NEW_LOGIN         new value of the login name', 2);
  const users = sysPasswd(this);
  const u = users.find(x => x.name === name);
  if (!u) return fail(`usermod: user '${name}' does not exist`, 6);
  if (flags.has('a') && vals.G === undefined) return fail('usermod: -a flag is only allowed with the -G flag', 3);
  const notes = [];
  if (vals.G !== undefined) {
    const groups = sysGroups(this);
    const want = vals.G.split(',').filter(Boolean);
    for (const g of want) if (!groups.some(x => x.name === g)) return fail(`usermod: group '${g}' does not exist`, 6);
    if (!flags.has('a')) {
      const before = groups.filter(g => g.members.includes(name) && g.gid !== u.gid).map(g => g.name);
      groups.forEach(g => { if (g.gid !== u.gid) g.members = g.members.filter(m => m !== name); });
      const lost = before.filter(g => !want.includes(g));
      if (lost.length) notes.push(sysNote(`-a olmadan -G listeyi değiştirir, ${name} şu gruplardan çıktı: ${lost.join(', ')}. Eklemek istiyorsan usermod -aG`, `Without -a, -G replaces the list, ${name} was removed from these groups ${lost.join(', ')}. To add instead use usermod -aG`));
    }
    want.forEach(g => { const gg = groups.find(x => x.name === g); if (!gg.members.includes(name)) gg.members.push(name); });
    sysSaveGroups(this, groups);
    if (name === USER) notes.push(sysNote('Grup üyeliği yeni login\'de geçerli olur, id ile bak, gerçek sistemde çıkıp girmen gerekir', 'Group membership takes effect at the next login, check with id, on a real system you need to log out and back in'));
  }
  if (vals.s) u.shell = vals.s;
  if (vals.c !== undefined) u.gecos = vals.c;
  if (vals.d) u.home = vals.d;
  if (vals.u) u.uid = +vals.u;
  if (vals.g) { const g = sysGroup(this, vals.g); if (!g) return fail(`usermod: group '${vals.g}' does not exist`, 6); u.gid = g.gid; }
  if (vals.l) { if (users.some(x => x.name === vals.l)) return fail(`usermod: user '${vals.l}' already exists`, 9); u.name = vals.l; }
  sysSavePasswd(this, users);
  if (flags.has('L') || flags.has('U')) {
    const sd = sysShadow(this); const s = sd.find(x => x.name === name);
    if (s) { if (flags.has('L') && !s.hash.startsWith('!')) s.hash = '!' + s.hash; if (flags.has('U')) s.hash = s.hash.replace(/^!+/, '') || '!'; }
    sysSaveShadow(this, sd);
  }
  return ok(notes.length ? notes.join('\n') + '\n' : '');
};

SYS_CMDS.groupadd = function (args) {
  sysEnsure(this);
  if (!this.isRoot) return fail('groupadd: Permission denied.\ngroupadd: cannot lock /etc/group; try again later.');
  const { vals, rest } = parseOpts(args, 'g');
  const name = rest[0];
  if (!name) return fail('Usage: groupadd [options] GROUP\n\nOptions:\n  -g, --gid GID                 use GID for the new group', 2);
  if (!/^[a-z_][a-z0-9_-]*$/.test(name)) return fail(`groupadd: '${name}' is not a valid group name`, 3);
  const groups = sysGroups(this);
  if (groups.some(g => g.name === name)) return fail(`groupadd: group '${name}' already exists`, 9);
  let gid = vals.g ? +vals.g : Math.max(999, ...groups.map(g => g.gid).filter(g => g < 60000)) + 1;
  if (groups.some(g => g.gid === gid)) return fail(`groupadd: GID '${gid}' already exists`, 4);
  groups.push({ name, x: 'x', gid, members: [] });
  sysSaveGroups(this, groups);
  return ok();
};

SYS_CMDS.groupdel = function (args) {
  sysEnsure(this);
  if (!this.isRoot) return fail('groupdel: Permission denied.\ngroupdel: cannot lock /etc/group; try again later.');
  const name = args.filter(a => !a.startsWith('-'))[0];
  if (!name) return fail('Usage: groupdel [options] GROUP', 2);
  const groups = sysGroups(this);
  const g = groups.find(x => x.name === name);
  if (!g) return fail(`groupdel: group '${name}' does not exist`, 6);
  const prim = sysPasswd(this).find(u => u.gid === g.gid);
  if (prim) return fail(`groupdel: cannot remove the primary group of user '${prim.name}'`, 8);
  sysSaveGroups(this, groups.filter(x => x !== g));
  return ok();
};

SYS_CMDS.chgrp = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  if (rest.length < 2) return fail(rest.length ? `chgrp: missing operand after '${rest[0]}'` : 'chgrp: missing operand');
  const g = sysGroup(this, rest[0]);
  if (!g) return fail(`chgrp: invalid group: '${rest[0]}'`);
  let err = '';
  for (const f of rest.slice(1)) {
    const n = this.node(this.resolve(f));
    if (!n) { err += `chgrp: cannot access '${f}': No such file or directory\n`; continue; }
    if (!this.isRoot && n.o !== USER) { err += `chgrp: changing group of '${f}': Operation not permitted\n`; continue; }
    if (!this.isRoot && !g.members.includes(USER) && g.name !== USER) { err += `chgrp: changing group of '${f}': Operation not permitted\n${sysNote(`Üyesi olmadığın bir gruba veremezsin, id ile gruplarına bak`, `You cannot give it to a group you are not a member of, check your groups with id`)}\n`; continue; }
    if (flags.has('R')) sysSetGroup(n, g.name); else n.g = g.name;
  }
  return { out: '', err, code: err ? 1 : 0 };
};

SYS_CMDS.passwd = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  const me = sysCurrentUser(this);
  const name = rest[0] || me;
  const users = sysPasswd(this);
  if (!users.some(u => u.name === name)) return fail(`passwd: user '${name}' does not exist`, 1);
  if (!this.isRoot && name !== me) return fail(`passwd: You may not view or modify password information for ${name}.`, 1);
  const sd = sysShadow(this); let s = sd.find(x => x.name === name);
  if (!s) { s = { name, hash: '!', last: '20740', min: '0', max: '99999', warn: '7', rest: '::' }; sd.push(s); }
  if (flags.has('S') || flags.has('--status')) {
    const st = s.hash === '*' || s.hash === '!' || s.hash === '' ? (s.hash === '' ? 'NP' : 'L') : s.hash.startsWith('!') ? 'L' : 'P';
    const d = new Date(+s.last * 86400000);
    return ok(`${name} ${st} ${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()} ${s.min} ${s.max} ${s.warn} -1\n`);
  }
  if (flags.has('l') || flags.has('u') || flags.has('d') || flags.has('e')) {
    if (!this.isRoot) return fail(`passwd: Only root can do that.`, 1);
    if (flags.has('l')) { if (!s.hash.startsWith('!')) s.hash = '!' + s.hash; sysSaveShadow(this, sd); return ok(`passwd: password changed.\n`); }
    if (flags.has('u')) { if (!s.hash.startsWith('!')) return fail(`passwd: unlocking the password would result in a passwordless account.\nYou should set a password with usermod -p to unlock the password of this account.`, 3); s.hash = s.hash.replace(/^!+/, ''); if (s.hash === '') s.hash = '!'; sysSaveShadow(this, sd); return ok('passwd: password changed.\n'); }
    if (flags.has('d')) { s.hash = ''; sysSaveShadow(this, sd); return ok('passwd: password expiry information changed.\n'); }
    s.last = '0'; sysSaveShadow(this, sd); return ok('passwd: password expiry information changed.\n');
  }
  const stdinPass = flags.has('--stdin');
  s.hash = '$6$lab$' + sysHash('lab:' + name + ':' + Date.now(), 86);
  s.last = String(Math.floor(Date.now() / 86400000));
  sysSaveShadow(this, sd);
  const flow = this.isRoot ? `New password: \nRetype new password: \npasswd: password updated successfully\n` : `Changing password for ${name}.\nCurrent password: \nNew password: \nRetype new password: \npasswd: password updated successfully\n`;
  return ok(flow + sysNote(`Gerçek passwd şifreyi klavyeden gizli okur, lab'da prompt yok, şifre lab123 olarak kaydedildi. Script içinde şifre vermek için echo "user:pass" | sudo chpasswd${stdinPass ? '. --stdin Red Hat usulü, Debian passwd bunu bilmez' : ''}`, `Real passwd reads the password hidden from the keyboard, the lab has no prompt, so the password was saved as lab123. To set a password inside a script use echo "user:pass" | sudo chpasswd${stdinPass ? '. --stdin is the Red Hat way, Debian passwd does not know it' : ''}`) + '\n');
};

SYS_CMDS.chpasswd = function (args, stdin) {
  sysEnsure(this);
  if (!this.isRoot) return fail('chpasswd: Permission denied.\nchpasswd: cannot lock /etc/passwd; try again later.');
  if (stdin == null) return fail('chpasswd: ' + lt('stdin bekler, echo "user:sifre" | sudo chpasswd', 'expects stdin, echo "user:password" | sudo chpasswd'));
  const sd = sysShadow(this); let err = '';
  lines(stdin).forEach((l, i) => {
    const k = l.indexOf(':'); if (k < 0) { err += `chpasswd: line ${i + 1}: missing new password\n`; return; }
    const name = l.slice(0, k); const s = sd.find(x => x.name === name);
    if (!s || !sysUser(this, name)) { err += `chpasswd: line ${i + 1}: user '${name}' does not exist\n`; return; }
    s.hash = '$6$lab$' + sysHash('lab:' + name + ':' + l.slice(k + 1), 86); s.last = String(Math.floor(Date.now() / 86400000));
  });
  sysSaveShadow(this, sd);
  return { out: '', err, code: err ? 1 : 0 };
};

SYS_CMDS.id = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  const name = rest[0] || sysCurrentUser(this);
  const u = sysUser(this, name);
  if (!u) return fail(`id: '${name}': no such user`);
  const gs = sysUserGroups(this, u);
  const nm = flags.has('n');
  if (flags.has('u')) return ok((nm ? u.name : u.uid) + '\n');
  if (flags.has('g')) return ok((nm ? (gs[0] ? gs[0].name : u.gid) : u.gid) + '\n');
  if (flags.has('G')) return ok(gs.map(g => (nm ? g.name : g.gid)).join(' ') + '\n');
  return ok(sysIdLine(this, u) + '\n');
};

SYS_CMDS.groups = function (args) {
  sysEnsure(this);
  if (!args.length) { const u = sysUser(this, sysCurrentUser(this)); return ok(sysUserGroups(this, u).map(g => g.name).join(' ') + '\n'); }
  const out = []; let err = '';
  for (const n of args) { const u = sysUser(this, n); if (!u) { err += `groups: '${n}': no such user\n`; continue; } out.push(`${n} : ${sysUserGroups(this, u).map(g => g.name).join(' ')}`); }
  return { out: join(out), err, code: err ? 1 : 0 };
};

const SYS_WTMP = [
  'burak    pts/0        192.168.1.10     Tue Oct 13 08:01    still logged in',
  'burak    pts/1        192.168.1.10     Mon Oct 12 17:40 - 18:55  (01:15)',
  'deploy   pts/1        198.51.100.23    Fri Oct 10 06:11 - 06:13  (00:02)',
  'burak    pts/0        192.168.1.10     Fri Oct 10 04:01 - 09:30  (05:29)',
  'reboot   system boot  6.8.0-45-generic Fri Oct 10 07:58   still running',
  'burak    tty1                          Thu Oct  9 22:10 - down   (00:40)',
  'reboot   system boot  6.8.0-45-generic Thu Oct  9 22:08 - 22:50  (00:42)',
  'burak    pts/0        192.168.1.10     Thu Oct  9 09:12 - 17:02  (07:50)',
  'reboot   system boot  6.8.0-41-generic Mon Oct  6 07:30 - 22:05  (3+14:35)',
];
SYS_CMDS.last = function (args) {
  const { vals, rest } = parseOpts(args, 'n');
  let list = SYS_WTMP.slice();
  if (rest[0]) list = list.filter(l => l.split(/\s+/)[0] === rest[0]);
  if (vals.n) list = list.slice(0, +vals.n);
  if (!list.length) return ok('\nwtmp begins Mon Oct  6 07:30:11 2026\n');
  return ok(join(list) + '\nwtmp begins Mon Oct  6 07:30:11 2026\n');
};
SYS_CMDS.lastlog = function (args) {
  sysEnsure(this);
  const { vals } = parseOpts(args, 'u');
  const known = { root: 'tty1     ', burak: 'pts/0    192.168.1.10     ', deploy: 'pts/1    198.51.100.23    ' };
  const when = { root: 'Thu Oct  9 22:10:04 +0200 2026', burak: 'Tue Oct 13 08:01:12 +0200 2026', deploy: 'Fri Oct 10 06:11:02 +0200 2026' };
  let users = sysPasswd(this);
  if (vals.u) { users = users.filter(u => u.name === vals.u); if (!users.length) return fail(`lastlog: Unknown user or range: ${vals.u}`); }
  const out = ['Username         Port     From             Latest'];
  users.forEach(u => out.push(known[u.name] ? `${sysPad(u.name, 17)}${known[u.name]}${when[u.name]}` : `${sysPad(u.name, 17)}${sysPad('', 26)}**Never logged in**`));
  return ok(join(out));
};
SYS_CMDS.w = function (args) {
  const d = new Date();
  const out = [` ${sysHMS(d)} up 3 days,  4:12,  2 users,  load average: 1.02, 0.98, 0.95`];
  if (!args.includes('-h')) out.push('USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT');
  out.push(`burak    pts/0    192.168.1.10     08:01    0.00s  0.12s  0.00s w`, `burak    pts/1    192.168.1.10     09:20   14:02   0.05s  0.05s -bash`);
  return ok(join(out));
};
SYS_CMDS.who = function (args) {
  const { flags } = parseOpts(args);
  if (flags.has('b')) return ok('         system boot  2026-10-10 07:58\n');
  if (flags.has('r')) return ok('         run-level 5  2026-10-10 07:58\n');
  if (flags.has('q')) return ok('burak burak\n# users=2\n');
  if (args[0] === 'am' || flags.has('m')) return ok('burak    pts/0        2026-10-13 08:01 (192.168.1.10)\n');
  const base = ['burak    pts/0        2026-10-13 08:01 (192.168.1.10)', 'burak    pts/1        2026-10-13 09:20 (192.168.1.10)'];
  if (flags.has('a')) return ok(join(['           system boot  2026-10-10 07:58', '           run-level 5  2026-10-10 07:58', ...base.map(l => l.replace(/^(\S+\s+)(\S+\s+)/, '$1+ $2'))]));
  if (flags.has('H')) base.unshift('NAME     LINE         TIME             COMMENT');
  return ok(join(base));
};
SYS_CMDS.finger = function (args) {
  sysEnsure(this);
  const gate = sysNeedPkg(this, 'finger', 'finger'); if (gate) return gate;
  const names = args.filter(a => !a.startsWith('-'));
  const users = sysPasswd(this);
  if (!names.length) return ok('Login     Name       Tty      Idle  Login Time   Office     Office Phone\nburak     Burak      pts/0          Oct 13 08:01 (192.168.1.10)\nburak     Burak      pts/1       14 Oct 13 09:20 (192.168.1.10)\n');
  const out = []; let code = 0;
  for (const n of names) {
    const u = users.find(x => x.name === n || x.gecos.split(',')[0].toLowerCase() === n.toLowerCase());
    if (!u) { out.push(`finger: ${n}: no such user.`); code = 1; continue; }
    out.push(`Login: ${sysPad(u.name, 32)}Name: ${u.gecos.split(',')[0]}`, `Directory: ${sysPad(u.home, 28)}Shell: ${u.shell}`, u.name === USER ? 'On since Tue Oct 13 08:01 (CEST) on pts/0 from 192.168.1.10' : 'Never logged in.', 'No mail.', 'No Plan.');
  }
  return { out: join(out) + sysNote('finger çoğu sunucuda kurulu değildir, standart araçlar id user, getent passwd user, w ve last', 'finger is not installed on most servers, the standard tools are id user, getent passwd user, w and last') + '\n', err: '', code };
};

/* ======================================================================
   2. Donanim
   ====================================================================== */
SYS_CMDS.lscpu = function () {
  return ok(['Architecture:             x86_64', '  CPU op-mode(s):         32-bit, 64-bit', '  Address sizes:          46 bits physical, 48 bits virtual', '  Byte Order:             Little Endian', 'CPU(s):                   2', '  On-line CPU(s) list:    0,1', 'Vendor ID:                GenuineIntel', '  Model name:             Intel(R) Xeon(R) Gold 6248 CPU @ 2.50GHz', '    CPU family:           6', '    Model:                85', '    Thread(s) per core:   1', '    Core(s) per socket:   2', '    Socket(s):            1', '    Stepping:             7', '    BogoMIPS:             4988.28', '    Flags:                fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 ss ht syscall nx lm avx avx2 avx512f hypervisor', 'Virtualization features:  ', '  Hypervisor vendor:      KVM', '  Virtualization type:    full', 'Caches (sum of all):      ', '  L1d:                    64 KiB (2 instances)', '  L1i:                    64 KiB (2 instances)', '  L2:                     2 MiB (2 instances)', '  L3:                     27.5 MiB (1 instance)', 'NUMA:                     ', '  NUMA node(s):           1', '  NUMA node0 CPU(s):      0,1', 'Vulnerabilities:          ', '  Meltdown:               Mitigation; PTI', '  Spectre v1:             Mitigation; usercopy/swapgs barriers and __user pointer sanitization', '  Spectre v2:             Mitigation; Retpolines; IBPB conditional; IBRS_FW; STIBP disabled; RSB filling; PBRSB-eIBRS Not affected; BHI Retpoline'].join('\n') + '\n');
};
SYS_CMDS.dmidecode = function (args) {
  if (!this.isRoot) return fail('/sys/firmware/dmi/tables/smbios_entry_point: Permission denied\n/dev/mem: Permission denied\n' + sysNote('dmidecode BIOS tablolarini /dev/mem uzerinden okur, root ister', 'dmidecode reads the BIOS tables through /dev/mem and needs root'));
  const ti = args.indexOf('-t'); const type = ti >= 0 ? args[ti + 1] : null;
  const si = args.indexOf('-s');
  if (si >= 0) { const key = args[si + 1]; const m = { 'system-manufacturer': 'QEMU', 'system-product-name': 'Standard PC (Q35 + ICH9, 2009)', 'bios-version': '1.16.3-debian-1.16.3-2', 'system-serial-number': 'Not Specified', 'processor-version': 'Intel(R) Xeon(R) Gold 6248 CPU @ 2.50GHz' }; return m[key] ? ok(m[key] + '\n') : fail(`Invalid string keyword: ${key}`); }
  const head = '# dmidecode 3.5\nGetting SMBIOS data from sysfs.\nSMBIOS 2.8 present.\n';
  const bios = 'Handle 0x0000, DMI type 0, 24 bytes\nBIOS Information\n\tVendor: SeaBIOS\n\tVersion: 1.16.3-debian-1.16.3-2\n\tRelease Date: 04/01/2014\n\tROM Size: 64 kB\n\tBIOS Revision: 0.0\n';
  const system = 'Handle 0x0100, DMI type 1, 27 bytes\nSystem Information\n\tManufacturer: QEMU\n\tProduct Name: Standard PC (Q35 + ICH9, 2009)\n\tVersion: pc-q35-8.2\n\tSerial Number: Not Specified\n\tUUID: 9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d\n\tWake-up Type: Power Switch\n\tSKU Number: Not Specified\n\tFamily: Not Specified\n';
  const cpu = 'Handle 0x0400, DMI type 4, 42 bytes\nProcessor Information\n\tSocket Designation: CPU 0\n\tType: Central Processor\n\tFamily: Other\n\tManufacturer: QEMU\n\tVersion: Intel(R) Xeon(R) Gold 6248 CPU @ 2.50GHz\n\tMax Speed: 2000 MHz\n\tCurrent Speed: 2000 MHz\n\tStatus: Populated, Enabled\n\tCore Count: 2\n\tThread Count: 2\n';
  const mem = 'Handle 0x1000, DMI type 16, 23 bytes\nPhysical Memory Array\n\tLocation: Other\n\tUse: System Memory\n\tError Correction Type: Multi-bit ECC\n\tMaximum Capacity: 4 GB\n\tNumber Of Devices: 1\n\nHandle 0x1100, DMI type 17, 40 bytes\nMemory Device\n\tArray Handle: 0x1000\n\tTotal Width: Unknown\n\tData Width: Unknown\n\tSize: 4 GB\n\tForm Factor: DIMM\n\tLocator: DIMM 0\n\tBank Locator: Not Specified\n\tType: RAM\n\tSpeed: Unknown\n\tManufacturer: QEMU\n\tSerial Number: Not Specified\n';
  const map = { bios: bios, 0: bios, system: system, 1: system, processor: cpu, 4: cpu, memory: mem, 16: mem, 17: mem };
  if (type) { if (!map[type]) return fail(`Invalid type keyword: ${type}\nValid type keywords are:\n  bios\n  system\n  baseboard\n  chassis\n  processor\n  memory\n  cache\n  connector\n  slot`); return ok(head + '\n' + map[type]); }
  return ok(head + '\n' + [bios, system, cpu, mem].join('\n'));
};
const SYS_BLK = [
  { n: 'sda', t: 'disk', sz: '40G', parts: [{ n: 'sda1', sz: '39.9G', fs: 'ext4', uuid: '3f1c9a2e-7b4d-4c1e-9a0b-2d5e6f7a8b9c', mp: '/', label: '' }, { n: 'sda15', sz: '106M', fs: 'vfat', uuid: '8A2B-1C3D', mp: '/boot/efi', label: 'UEFI' }] },
  { n: 'sdb', t: 'disk', sz: '100G', parts: [{ n: 'sdb1', sz: '100G', fs: 'ext4', uuid: '5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9', mp: '/data', label: 'data' }] },
  { n: 'sdc', t: 'disk', sz: '32G', parts: [{ n: 'sdc1', sz: '32G', fs: 'vfat', uuid: '1A2B-3C4D', mp: '', label: 'USBDISK' }] },
  { n: 'sr0', t: 'rom', sz: '1024M', parts: [] },
];
function sysMountOf(sh, dev) { const l = lines(sysRead(sh, SYS_MOUNTS)).find(x => x.startsWith('/dev/' + dev + ' ')); return l ? l.split(' ')[1] : ''; }
SYS_CMDS.lsblk = function (args) {
  sysEnsure(this);
  const { flags } = parseOpts(args);
  const out = [];
  if (flags.has('f')) {
    out.push('NAME    FSTYPE FSVER LABEL   UUID                                 FSAVAIL FSUSE% MOUNTPOINTS');
    SYS_BLK.forEach(d => { out.push(d.n); d.parts.forEach((p, i) => { const mp = sysMountOf(this, p.n); out.push(`${i === d.parts.length - 1 ? '└─' : '├─'}${sysPad(p.n, 6)}${sysPad(p.fs, 7)}${sysPad(p.fs === 'ext4' ? '1.0' : 'FAT32', 6)}${sysPad(p.label, 8)}${sysPad(p.uuid, 37)}${mp ? sysPad(mp === '/' ? '7.1G' : mp === '/data' ? '83G' : '31G', 8) + sysPad(mp === '/' ? '82%' : mp === '/data' ? '13%' : '2%', 7) + mp : ''}`); }); });
    return ok(join(out));
  }
  out.push('NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS');
  SYS_BLK.forEach((d, di) => {
    out.push(`${sysPad(d.n, 8)}${sysPad((d.t === 'rom' ? 11 : 8) + ':' + di * 16, 8)}${d.n === 'sdc' || d.t === 'rom' ? ' 1' : ' 0'} ${sysLpad(d.sz, 5)} ${d.t === 'rom' ? ' 1' : ' 0'} ${sysPad(d.t, 5)}`);
    d.parts.forEach((p, i) => out.push(`${i === d.parts.length - 1 ? '└─' : '├─'}${sysPad(p.n, 6)}${sysPad('8:' + (di * 16 + +p.n.replace(/\D/g, '')), 8)}${d.n === 'sdc' ? ' 1' : ' 0'} ${sysLpad(p.sz, 5)}  0 part ${sysMountOf(this, p.n)}`));
  });
  return ok(join(out));
};
SYS_CMDS.lshw = function (args) {
  const short = args.includes('-short');
  const cls = args.indexOf('-class') >= 0 ? args[args.indexOf('-class') + 1] : args.indexOf('-C') >= 0 ? args[args.indexOf('-C') + 1] : null;
  const warn = this.isRoot ? '' : 'WARNING: you should run this program as super-user.\n';
  const rows = [['/0', 'bus', 'Standard PC (Q35 + ICH9, 2009)'], ['/0/0', 'memory', '96KiB BIOS'], ['/0/400', 'processor', 'Intel(R) Xeon(R) Gold 6248 CPU @ 2.50GHz'], ['/0/1000', 'memory', '4GiB System Memory'], ['/0/100/1', 'display', 'QXL paravirtual graphic card'], ['/0/100/2', 'network', 'Virtio network device'], ['/0/100/3', 'network', 'Virtio network device'], ['/0/100/4', 'storage', 'Virtio block device'], ['/0/100/1f.2', 'storage', '82801IR/IO/IH (ICH9R/DO/DH) 6 port SATA Controller [AHCI mode]'], ['/0/1', 'disk', '40GB /dev/sda'], ['/0/2', 'disk', '100GB /dev/sdb'], ['/0/3', 'disk', '32GB USB DISK 3.0']];
  const list = cls ? rows.filter(r => r[1] === cls) : rows;
  if (short || cls) {
    const out = ['H/W path       Device     Class          Description', '====================================================='];
    list.forEach(r => out.push(`${sysPad(r[0], 15)}${sysPad(r[1] === 'network' ? (r[0].endsWith('/2') ? 'eth0' : 'eth1') : r[1] === 'disk' ? r[2].split(' ').pop().replace('3.0', '/dev/sdc') : '', 11)}${sysPad(r[1], 15)}${r[2]}`));
    return ok(warn + join(out) + (this.isRoot ? '' : sysNote('root olmadan bazı alanlar eksik kalır, sudo lshw -short', 'Some fields stay empty without root, sudo lshw -short') + '\n'));
  }
  return ok(warn + `linuxlab\n    description: Computer\n    product: Standard PC (Q35 + ICH9, 2009)\n    vendor: QEMU\n    version: pc-q35-8.2\n    width: 64 bits\n    capabilities: smbios-2.8 dmi-2.8 smp vsyscall32\n  *-core\n       description: Motherboard\n       physical id: 0\n     *-memory\n          description: System Memory\n          physical id: 1000\n          size: 4GiB\n     *-cpu\n          product: Intel(R) Xeon(R) Gold 6248 CPU @ 2.50GHz\n          vendor: Intel Corp.\n          physical id: 400\n          bus info: cpu@0\n          width: 64 bits\n     *-pci\n          description: Host bridge\n          product: 82G33/G31/P35/P31 Express DRAM Controller\n        *-network:0\n             description: Ethernet interface\n             product: Virtio network device\n             logical name: eth0\n             serial: 52:54:00:12:34:56\n             capabilities: ethernet physical\n             configuration: autonegotiation=off broadcast=yes driver=virtio_net ip=192.168.1.42 link=yes multicast=yes\n        *-storage\n             description: SATA controller\n             product: 82801IR/IO/IH (ICH9R/DO/DH) 6 port SATA Controller [AHCI mode]\n             configuration: driver=ahci\n  *-disk:0\n       description: ATA Disk\n       product: QEMU HARDDISK\n       logical name: /dev/sda\n       size: 40GiB (42GB)\n  *-disk:1\n       description: ATA Disk\n       product: QEMU HARDDISK\n       logical name: /dev/sdb\n       size: 100GiB (107GB)\n`);
};
const SYS_PCI = [
  ['00:00.0', 'Host bridge', 'Intel Corporation 82G33/G31/P35/P31 Express DRAM Controller', ''],
  ['00:01.0', 'VGA compatible controller', 'Red Hat, Inc. QXL paravirtual graphic card (rev 04)', 'qxl'],
  ['00:02.0', 'Ethernet controller', 'Red Hat, Inc. Virtio network device', 'virtio-pci'],
  ['00:03.0', 'Ethernet controller', 'Red Hat, Inc. Virtio network device', 'virtio-pci'],
  ['00:04.0', 'SCSI storage controller', 'Red Hat, Inc. Virtio block device', 'virtio-pci'],
  ['00:05.0', 'Unclassified device [00ff]', 'Red Hat, Inc. Virtio memory balloon', 'virtio-pci'],
  ['00:1b.0', 'Audio device', 'Intel Corporation 82801I (ICH9 Family) HD Audio Controller (rev 03)', 'snd_hda_intel'],
  ['00:1d.0', 'USB controller', 'Intel Corporation 82801I (ICH9 Family) USB UHCI Controller #1 (rev 03)', 'uhci_hcd'],
  ['00:1d.7', 'USB controller', 'Intel Corporation 82801I (ICH9 Family) USB2 EHCI Controller #1 (rev 03)', 'ehci-pci'],
  ['00:1f.0', 'ISA bridge', 'Intel Corporation 82801IB (ICH9) LPC Interface Controller (rev 02)', 'lpc_ich'],
  ['00:1f.2', 'SATA controller', 'Intel Corporation 82801IR/IO/IH (ICH9R/DO/DH) 6 port SATA Controller [AHCI mode] (rev 02)', 'ahci'],
  ['00:1f.3', 'SMBus', 'Intel Corporation 82801I (ICH9 Family) SMBus Controller (rev 02)', 'i801_smbus'],
];
SYS_CMDS.lspci = function (args) {
  const { flags } = parseOpts(args);
  if (flags.has('t')) {
    const out = ['-[0000:00]-+-00.0' + (flags.has('v') ? '  Intel Corporation 82G33/G31/P35/P31 Express DRAM Controller' : '')];
    SYS_PCI.slice(1).forEach((p, i) => out.push(`           ${i === SYS_PCI.length - 2 ? '\\' : '+'}-${p[0].slice(3)}${flags.has('v') ? '  ' + p[2] : ''}`));
    return ok(join(out));
  }
  const out = [];
  SYS_PCI.forEach(p => {
    out.push(`${p[0]} ${p[1]}: ${p[2]}`);
    if (flags.has('k') || flags.has('v')) { if (flags.has('v')) out.push(`\tSubsystem: Red Hat, Inc. QEMU Virtual Machine`); if (p[3]) out.push(`\tKernel driver in use: ${p[3]}`, `\tKernel modules: ${p[3].replace('-', '_')}`); out.push(''); }
  });
  return ok(join(out));
};
SYS_CMDS.lsusb = function (args) {
  const { flags } = parseOpts(args);
  if (flags.has('t')) return ok('/:  Bus 02.Port 1: Dev 1, Class=root_hub, Driver=ehci-pci/6p, 480M\n    |__ Port 2: Dev 2, If 0, Class=Mass Storage, Driver=usb-storage, 480M\n/:  Bus 01.Port 1: Dev 1, Class=root_hub, Driver=uhci_hcd/2p, 12M\n    |__ Port 1: Dev 2, If 0, Class=Human Interface Device, Driver=usbhid, 12M\n    |__ Port 2: Dev 3, If 0, Class=Human Interface Device, Driver=usbhid, 12M\n');
  const base = ['Bus 002 Device 002: ID 0781:5583 SanDisk Corp. Ultra Fit', 'Bus 002 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub', 'Bus 001 Device 003: ID 0627:0001 Adomax Technology Co., Ltd QEMU Tablet', 'Bus 001 Device 002: ID 0627:0001 Adomax Technology Co., Ltd QEMU USB Keyboard', 'Bus 001 Device 001: ID 1d6b:0001 Linux Foundation 1.1 root hub'];
  if (flags.has('v')) return ok(join(base.map(b => b + '\n  bLength                18\n  bDescriptorType         1\n  bcdUSB               2.00\n  bDeviceClass            0 \n  idVendor           0x' + b.split('ID ')[1].slice(0, 4) + '\n  idProduct          0x' + b.split('ID ')[1].slice(5, 9) + '\n  bNumConfigurations      1\n')));
  return ok(join(base));
};
function sysDevOk(dev) { return /^\/dev\/(sd[abc]\d*|sr0|vda\d*|nvme0n1(p\d)?)$/.test(dev || ''); }
SYS_CMDS.hdparm = function (args) {
  const { flags, rest } = parseOpts(args);
  const dev = rest[0];
  if (!dev) return fail('hdparm - get/set hard disk parameters - version v9.65, by Mark Lord.\n\nUsage:  hdparm  [options] [device ...]\n\nOptions:\n -i   display drive identification\n -I   detailed/current information directly from drive\n -t   perform device read timings\n -T   perform cache read timings');
  if (!sysDevOk(dev)) return fail(`${dev}: No such file or directory`);
  if (!this.isRoot) return fail(`${dev}: Permission denied\n${sysNote('Disk aygıtına ham erişim root ister, sudo hdparm', 'Raw access to a disk device needs root, sudo hdparm')}`);
  const out = [`\n${dev}:`];
  if (flags.has('i') || flags.has('I')) out.push('', ' Model=QEMU HARDDISK, FwRev=2.5+, SerialNo=QM00001', ' Config={ HardSect NotMFM HdSw>15uSec SpinMotCtl Fixed DTR>5Mbs FmtGapReq }', ' RawCHS=16383/16/63, TrkSize=0, SectSize=0, ECCbytes=0', ' BuffType=unknown, BuffSize=unknown, MaxMultSect=16, MultSect=16', ' CurCHS=16383/16/63, CurSects=16514064, LBA=yes, LBAsects=83886080', ' IORDY=on/off, tPIO={min:120,w/IORDY:120}, tDMA={min:120,rec:120}', ' PIO modes:  pio0 pio1 pio2 pio3 pio4 ', ' DMA modes:  mdma0 mdma1 mdma2 ', ' UDMA modes: udma0 udma1 udma2 udma3 udma4 *udma5 ', ' AdvancedPM=no WriteCache=enabled', ' Drive conforms to: unknown:  ATA/ATAPI-5,6,7', '', ' * signifies the current active mode');
  if (flags.has('T')) out.push(' Timing cached reads:   18924 MB in  1.99 seconds = 9496.12 MB/sec');
  if (flags.has('t')) out.push(' Timing buffered disk reads: 1428 MB in  3.00 seconds = 475.87 MB/sec');
  if (!flags.has('i') && !flags.has('I') && !flags.has('t') && !flags.has('T')) out.push(' multcount     = 16 (on)', ' IO_support    =  1 (32-bit)', ' readonly      =  0 (off)', ' readahead     = 256 (on)', ' geometry      = 5221/255/63, sectors = 83886080, start = 0');
  return ok(join(out));
};
SYS_CMDS.badblocks = function (args) {
  const { flags, rest } = parseOpts(args, 'bco');
  const dev = rest[0];
  if (!dev) return fail('Usage: badblocks [-b block_size] [-i input_file] [-o output_file] [-svwnfBX]\n       [-c blocks_at_once] [-d delay_factor_between_reads] [-e max_bad_blocks]\n       [-p num_passes] [-t test_pattern [-t test_pattern [...]]]\n       device [last_block [first_block]]');
  if (!sysDevOk(dev)) return fail(`badblocks: No such file or directory while trying to determine device size`, 1);
  if (!this.isRoot) return fail(`badblocks: Permission denied while trying to open ${dev}\n${sysNote('Blok aygıtını okumak root ister, sudo badblocks -s ' + dev, 'Reading a block device needs root, sudo badblocks -s ' + dev)}`);
  if (flags.has('w')) return fail(`badblocks: ${dev} is apparently in use by the system; it's not safe to run badblocks!\n${sysNote('-w yazma testi diskteki her şeyi siler, mount edilmiş bir diske asla', 'The -w write test wipes everything on the disk, never use it on a mounted disk')}`);
  const total = dev.includes('sdb') ? 104857600 : dev.includes('sdc') ? 33554432 : 41943040;
  const out = [];
  if (flags.has('s')) { for (const pct of [0.00, 12.50, 37.50, 62.50, 87.50, 100.00]) out.push(`Checking for bad blocks (read-only test): ${sysLpad(pct.toFixed(2), 6)}% done, ${Math.round(pct * 1.2)}:${String(Math.round(pct * 0.6) % 60).padStart(2, '0')} elapsed. (0/0/0 errors)`); }
  else out.push('Checking for bad blocks (read-only test): ');
  out.push(`Checking for bad blocks (read-only test): done`, `Pass completed, 0 bad blocks found. (0/0/0 errors)`);
  if (flags.has('v')) out.unshift(`Checking blocks 0 to ${total - 1}`);
  return ok(join(out) + sysNote('Gerçekte bu tarama dakikalar sürer, -s ilerlemeyi gösterir. Modern SSD için smartctl -a daha anlamlı', 'In reality this scan takes minutes, -s shows progress. For a modern SSD smartctl -a is more useful') + '\n');
};

/* ======================================================================
   3. Arsiv ve sikistirma
   ====================================================================== */
function sysGzipName(f, kind) { return f + { gz: '.gz', xz: '.xz', bz2: '.bz2' }[kind]; }
function sysCompress(sh, args, kind, cmd) {
  const { flags, rest } = parseOpts(args);
  const ext = { gz: '.gz', xz: '.xz', bz2: '.bz2' }[kind];
  const decompress = flags.has('d') || cmd === 'gunzip' || cmd === 'unxz' || cmd === 'bunzip2';
  const toStdout = flags.has('c') || cmd === 'zcat' || cmd === 'xzcat' || cmd === 'bzcat';
  const keep = flags.has('k') || toStdout;
  if (!rest.length) return fail(`${cmd}: compressed data not read from a terminal. Use -f to force decompression.\nFor help, type: ${cmd} -h`);
  let out = ''; let err = '';
  for (const f of rest) {
    const abs = sh.resolve(f); const n = sh.node(abs);
    if (!n) { err += `${cmd}: ${f}: No such file or directory\n`; continue; }
    if (n.t === 'd') { err += `${cmd}: ${f} is a directory -- ignored\n`; continue; }
    if (!sh.canRead(n)) { err += `${cmd}: ${f}: Permission denied\n`; continue; }
    const packed = sysUnpack(n.d);
    if (decompress || toStdout) {
      if (!packed || packed.kind !== kind) { err += `${cmd}: ${f}: not in ${kind === 'gz' ? 'gzip' : kind} format\n`; continue; }
      if (toStdout) { out += packed.obj.d; continue; }
      const target = abs.endsWith(ext) ? abs.slice(0, -ext.length) : abs + '.out';
      if (sh.node(target) && !flags.has('f')) { err += `${cmd}: ${target.split('/').pop()} already exists; not overwritten\n`; continue; }
      const { dir } = sh.parent(target);
      dir.c[target.split('/').pop()] = mkfile(packed.obj.d, n.m, n.o);
      if (!keep) delete dir.c[abs.split('/').pop()];
      if (flags.has('v')) out += `${f}:\t ${(100 - Math.round(packed.obj.d.length / Math.max(1, n.d.length) * 100))}% -- replaced with ${target}\n`;
    } else {
      if (packed && packed.kind === kind) { err += `${cmd}: ${f} already has ${ext} suffix -- unchanged\n`; continue; }
      if (abs.endsWith(ext)) { err += `${cmd}: ${f} already has ${ext} suffix -- unchanged\n`; continue; }
      const target = abs + ext;
      if (sh.node(target) && !flags.has('f')) { err += `${cmd}: ${target.split('/').pop()} already exists; not overwritten\n`; continue; }
      const { dir } = sh.parent(target);
      if (!sh.canWrite(dir)) { err += `${cmd}: ${target}: Permission denied\n`; continue; }
      const data = sysPack(kind, { n: abs.split('/').pop(), d: n.d, l: n.d.length });
      if (toStdout) { out += data; continue; }
      dir.c[target.split('/').pop()] = mkfile(data, n.m, n.o);
      if (!keep) delete dir.c[abs.split('/').pop()];
      if (flags.has('v')) out += `${f}:\t ${Math.min(95, Math.round(60 + n.d.length % 30))}% -- replaced with ${f}${ext}\n`;
    }
  }
  return { out, err, code: err ? 1 : 0 };
}
SYS_CMDS.gzip = function (args) { return sysCompress(this, args, 'gz', 'gzip'); };
SYS_CMDS.gunzip = function (args) { return sysCompress(this, args, 'gz', 'gunzip'); };
SYS_CMDS.zcat = function (args) { return sysCompress(this, args, 'gz', 'zcat'); };
SYS_CMDS.xz = function (args) { return sysCompress(this, args, 'xz', 'xz'); };
SYS_CMDS.unxz = function (args) { return sysCompress(this, args, 'xz', 'unxz'); };
SYS_CMDS.xzcat = function (args) { return sysCompress(this, args, 'xz', 'xzcat'); };
SYS_CMDS.bzip2 = function (args) { return sysCompress(this, args, 'bz2', 'bzip2'); };
SYS_CMDS.bunzip2 = function (args) { return sysCompress(this, args, 'bz2', 'bunzip2'); };
SYS_CMDS.bzcat = function (args) { return sysCompress(this, args, 'bz2', 'bzcat'); };

/* tar: manifest { members: [{p, t, m, o, d, ts}] }, -z -j -J ile gz xz bz2 icine sarilir */
function sysTarCollect(sh, base, rel, members, exclude) {
  const abs = base === '/' ? '/' + rel : rel.startsWith('/') ? rel : base + '/' + rel;
  const n = sh.node(sh.resolve(abs));
  if (!n) return `tar: ${rel}: Cannot stat: No such file or directory\n`;
  const name = rel.replace(/^\.\//, '');
  if (exclude.some(re => re.test(name.split('/').pop()) || re.test(name))) return '';
  if (!sh.canRead(n)) return `tar: ${rel}: Cannot open: Permission denied\n`;
  members.push({ p: n.t === 'd' ? name.replace(/\/$/, '') + '/' : name, t: n.t, m: n.m & 0o777, o: n.o, d: n.t === 'f' ? n.d : '', ts: n.ts || Date.now() });
  let err = '';
  if (n.t === 'd') for (const c of Object.keys(n.c).sort()) err += sysTarCollect(sh, base, (rel.endsWith('/') ? rel : rel + '/') + c, members, exclude);
  return err;
}
SYS_CMDS.tar = function (args, stdin) {
  const a = args.slice();
  if (a.length && !a[0].startsWith('-')) a[0] = '-' + a[0];
  let mode = null; let file = null; let verbose = false; let comp = null; let dirC = null; const exclude = []; const files = []; let strip = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    if (x === '--') { files.push(...a.slice(i + 1)); break; }
    if (x.startsWith('--')) {
      if (x === '--create') mode = 'c'; else if (x === '--extract' || x === '--get') mode = 'x'; else if (x === '--list') mode = 't';
      else if (x === '--verbose') verbose = true; else if (x === '--gzip' || x === '--gunzip') comp = 'gz'; else if (x === '--xz') comp = 'xz'; else if (x === '--bzip2') comp = 'bz2';
      else if (x === '--file') file = a[++i]; else if (x.startsWith('--file=')) file = x.slice(7);
      else if (x === '--directory') dirC = a[++i]; else if (x.startsWith('--directory=')) dirC = x.slice(12);
      else if (x === '--exclude') exclude.push(globToRe(a[++i])); else if (x.startsWith('--exclude=')) exclude.push(globToRe(x.slice(10)));
      else if (x.startsWith('--strip-components=')) strip = +x.slice(19);
      else if (x === '--preserve-permissions' || x === '--same-permissions' || x === '--no-same-owner' || x === '--same-owner' || x === '--totals' || x === '--numeric-owner') { /* kabul */ }
      else return fail(`tar: unrecognized option '${x}'\nTry 'tar --help' or 'tar --usage' for more information.`, 64);
      continue;
    }
    if (x.startsWith('-')) {
      for (let j = 1; j < x.length; j++) {
        const ch = x[j];
        if (ch === 'c' || ch === 'x' || ch === 't') mode = ch;
        else if (ch === 'v') verbose = true; else if (ch === 'z') comp = 'gz'; else if (ch === 'j') comp = 'bz2'; else if (ch === 'J') comp = 'xz';
        else if (ch === 'f') { file = x.slice(j + 1) || a[++i]; break; }
        else if (ch === 'C') { dirC = x.slice(j + 1) || a[++i]; break; }
        else if (ch === 'p' || ch === 'a' || ch === 'h' || ch === 'k' || ch === 'u' || ch === 'r' || ch === 'O' || ch === 'w') { /* kabul */ }
        else return fail(`tar: invalid option -- '${ch}'\nTry 'tar --help' or 'tar --usage' for more information.`, 64);
      }
      continue;
    }
    files.push(x);
  }
  if (!mode) return fail("tar: You must specify one of the '-Acdtrux', '--delete' or '--test-label' options\nTry 'tar --help' or 'tar --usage' for more information.", 2);
  if (!file) return fail(`tar: Refusing to ${mode === 'c' ? 'write archive contents to' : 'read archive contents from'} terminal (missing -f option?)\nTry 'tar --help' or 'tar --usage' for more information.`, 2);
  const baseDir = dirC ? this.resolve(dirC) : this.cwd;
  if (dirC && !(this.node(baseDir) && this.node(baseDir).t === 'd')) return fail(`tar: ${dirC}: Cannot open: No such file or directory\ntar: Error is not recoverable: exiting now`, 2);
  if (mode === 'c') {
    if (!files.length) return fail('tar: Cowardly refusing to create an empty archive\nTry \'tar --help\' or \'tar --usage\' for more information.', 2);
    const members = []; let err = ''; let stripped = false;
    for (const f of files) {
      if (f.startsWith('/')) { stripped = true; err += sysTarCollect(this, '/', f.slice(1), members, exclude).replace(/tar: ([^:]+):/g, (m, p) => `tar: /${p}:`); }
      else err += sysTarCollect(this, baseDir, f, members, exclude);
    }
    if (stripped) err = 'tar: Removing leading `/\' from member names\n' + err;
    const archAbs = this.resolve(file);
    if (members.some(m => this.resolve(baseDir + '/' + m.p) === archAbs)) err += `tar: ${file}: file is the archive; not dumped\n`;
    const manifest = sysPack('tar', { members: members.filter(m => this.resolve((m.p.startsWith('/') ? '' : baseDir + '/') + m.p) !== archAbs) });
    const data = comp ? sysPack(comp, { n: archAbs.split('/').pop().replace(/\.(gz|xz|bz2|tgz)$/, m => (m === '.tgz' ? '.tar' : '')), d: manifest, l: manifest.length }) : manifest;
    if (!comp && /\.(tgz|tar\.gz)$/.test(file)) err += sysNote('Uzantı .gz ama -z vermedin, arşiv sıkıştırılmadan yazıldı. tar czf ya da tar -czvf', 'The extension is .gz but you did not pass -z, so the archive was written uncompressed. Use tar czf or tar -czvf') + '\n';
    const e = this.writeFile(file, data, false, 'tar');
    if (e) return fail(`tar: ${file}: Cannot open: ${e.split(': ').pop()}\ntar: Error is not recoverable: exiting now`, 2);
    const out = verbose ? join(members.map(m => m.p)) : '';
    return { out, err, code: err.includes('Cannot') ? 2 : 0 };
  }
  const r = this.readFile(file, 'tar');
  if (r.err) return fail(r.err.replace(/^tar: ([^:]+): (.*)$/, 'tar: $1: Cannot open: $2') + '\ntar: Error is not recoverable: exiting now', 2);
  let packed = sysUnpack(r.data);
  if (packed && packed.kind !== 'tar') {
    if (comp && comp !== packed.kind) return fail(`tar: Archive is compressed. Use -${packed.kind === 'gz' ? 'z' : packed.kind === 'xz' ? 'J' : 'j'} option\ntar: Error is not recoverable: exiting now`, 2);
    packed = sysUnpack(packed.obj.d);
  } else if (comp && packed) { return fail(`\n${comp === 'gz' ? 'gzip' : comp}: stdin: not in ${comp === 'gz' ? 'gzip' : comp} format\ntar: Child returned status 1\ntar: Error is not recoverable: exiting now`, 2); }
  if (!packed || packed.kind !== 'tar') return fail('tar: This does not look like a tar archive\ntar: Exiting with failure status due to previous errors', 2);
  let members = packed.obj.members || [];
  if (files.length) { const want = files.map(f => f.replace(/\/$/, '')); const miss = want.filter(w => !members.some(m => m.p.replace(/\/$/, '') === w || m.p.startsWith(w + '/'))); if (miss.length) return fail(join(miss.map(m => `tar: ${m}: Not found in archive`)) + 'tar: Exiting with failure status due to previous errors', 2); members = members.filter(m => want.some(w => m.p.replace(/\/$/, '') === w || m.p.startsWith(w + '/'))); }
  if (mode === 't') {
    if (!verbose) return ok(join(members.map(m => m.p)));
    return ok(join(members.map(m => `${modeStr({ t: m.t, m: m.m })} ${m.o}/${m.o} ${sysLpad(m.t === 'f' ? m.d.length : 0, 7)} ${sysYMD(new Date(m.ts))} ${sysHM(new Date(m.ts))} ${m.p}`)));
  }
  let err = ''; const out = [];
  for (const m of members) {
    let rel = m.p.replace(/\/$/, '');
    if (strip) { const parts = rel.split('/'); if (parts.length <= strip) continue; rel = parts.slice(strip).join('/'); }
    const abs = this.resolve(baseDir + '/' + rel);
    const parts = abs.split('/').filter(Boolean);
    let cur = this.root; let okp = true;
    for (let i = 0; i < parts.length - 1; i++) { if (!cur.c[parts[i]]) cur.c[parts[i]] = mkdir({}, 0o755, this.user); cur = cur.c[parts[i]]; if (cur.t !== 'd') { okp = false; break; } }
    if (!okp) { err += `tar: ${m.p}: Cannot mkdir: Not a directory\n`; continue; }
    if (!this.canWrite(cur)) { err += `tar: ${m.p}: Cannot open: Permission denied\n`; continue; }
    const name = parts[parts.length - 1];
    if (m.t === 'd') { if (!cur.c[name]) cur.c[name] = mkdir({}, m.m, this.isRoot ? m.o : this.user); }
    else cur.c[name] = mkfile(m.d, m.m, this.isRoot ? m.o : this.user);
    if (verbose) out.push(m.p);
  }
  return { out: join(out), err, code: err ? 2 : 0 };
};

SYS_CMDS.zip = function (args) {
  const { flags, rest } = parseOpts(args);
  if (rest.length < 2) return fail('\nzip error: Nothing to do! (' + (rest[0] || 'archive.zip') + ')\n' + (rest.length ? '' : 'Copyright (c) 1990-2008 Info-ZIP - Type \'zip "-L"\' for software license.\nZip 3.0 (July 5th 2008). Usage:\nzip [-options] [-b path] [-t mmddyyyy] [-n suffixes] [zipfile list] [-xi list]\n'), 12);
  let file = rest[0]; if (!/\.zip$/.test(file)) file += '.zip';
  const members = []; let err = '';
  for (const f of rest.slice(1)) {
    const n = this.node(this.resolve(f));
    if (!n) { err += `\tzip warning: name not matched: ${f}\n`; continue; }
    if (n.t === 'd' && !flags.has('r')) { members.push({ p: f.replace(/\/$/, '') + '/', t: 'd', m: n.m & 0o777, o: n.o, d: '', ts: n.ts }); continue; }
    err += sysTarCollect(this, this.cwd, f, members, []);
  }
  if (!members.length) return fail(err + `\nzip error: Nothing to do! (${file})`, 12);
  members.forEach(m => { m.p = m.p.replace(/^\/+/, ''); });
  const existing = this.node(this.resolve(file));
  const old = existing ? sysUnpack(existing.d) : null;
  const all = old && old.kind === 'zip' ? old.obj.members.filter(m => !members.some(x => x.p === m.p)).concat(members) : members;
  const e = this.writeFile(file, sysPack('zip', { members: all }), false, 'zip');
  if (e) return fail(`zip I/O error: Permission denied\nzip error: Could not create output file (${file})`, 15);
  return { out: (old ? '' : '') + join(members.map(m => `  adding: ${m.p} (${m.t === 'd' || !m.d.length ? 'stored 0%' : 'deflated ' + Math.min(90, 20 + m.d.length % 60) + '%'})`)), err, code: 0 };
};
SYS_CMDS.unzip = function (args) {
  const { flags, vals, rest } = parseOpts(args, 'd');
  if (!rest.length) return fail('UnZip 6.00 of 20 April 2009, by Debian. Original by Info-ZIP.\n\nUsage: unzip [-Z] [-opts[modifiers]] file[.zip] [list] [-x xlist] [-d exdir]\n  -l  list files (short format)      -d  extract files into exdir', 10);
  let file = rest[0]; if (!this.node(this.resolve(file)) && this.node(this.resolve(file + '.zip'))) file += '.zip';
  const r = this.readFile(file, 'unzip');
  if (r.err) return fail(`unzip:  cannot find or open ${rest[0]}, ${rest[0]}.zip or ${rest[0]}.ZIP.`, 9);
  const packed = sysUnpack(r.data);
  if (!packed || packed.kind !== 'zip') return fail(`Archive:  ${file}\n  End-of-central-directory signature not found.  Either this file is not\n  a zipfile, or it constitutes one disk of a multi-part archive.\n\nunzip:  cannot find zipfile directory in one of ${file} or\n        ${file}.zip, and cannot find ${file}.ZIP, period.`, 9);
  const members = packed.obj.members;
  if (flags.has('l')) {
    const out = [`Archive:  ${file}`, '  Length      Date    Time    Name', '---------  ---------- -----   ----'];
    let total = 0;
    members.forEach(m => { const d = new Date(m.ts || Date.now()); total += m.d.length; out.push(`${sysLpad(m.d.length, 9)}  ${sysYMD(d)} ${sysHM(d)}   ${m.p}`); });
    out.push('---------                     -------', `${sysLpad(total, 9)}                     ${members.length} file${members.length === 1 ? '' : 's'}`);
    return ok(join(out));
  }
  const base = vals.d ? this.resolve(vals.d) : this.cwd;
  if (!this.node(base)) { const e = COMMANDS.mkdir.call(this, ['-p', base]); if (e.err) return fail(`checkdir:  cannot create extraction directory: ${vals.d}\n           ${e.err.split(': ').pop().trim()}`, 2); }
  const out = [`Archive:  ${file}`]; let err = '';
  for (const m of members) {
    const abs = this.resolve(base + '/' + m.p.replace(/\/$/, ''));
    const parts = abs.split('/').filter(Boolean);
    let cur = this.root;
    for (let i = 0; i < parts.length - 1; i++) { if (!cur.c[parts[i]]) cur.c[parts[i]] = mkdir({}, 0o755, this.user); cur = cur.c[parts[i]]; }
    if (!this.canWrite(cur)) { err += `checkdir error:  cannot create ${m.p}\n                 Permission denied\n`; continue; }
    const name = parts[parts.length - 1];
    if (m.t === 'd') { if (!cur.c[name]) { cur.c[name] = mkdir({}, m.m, this.user); out.push(`   creating: ${m.p}`); } }
    else { const existed = !!cur.c[name]; cur.c[name] = mkfile(m.d, m.m, this.user); out.push(`  ${existed ? 'replacing' : 'inflating'}: ${m.p}`); }
  }
  return { out: join(out), err, code: err ? 2 : 0 };
};

/* ======================================================================
   4. Paket yonetimi
   ====================================================================== */
const SYS_APT_LOCK = 'E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?';
const SYS_APT_HEAD = 'Reading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\n';
function sysApt(sh, args, front) {
  sysEnsure(sh);
  const { flags, rest } = parseOpts(args);
  const sub = rest[0]; const names = rest.slice(1);
  const installed = sysInstalled(sh);
  const hint = front === 'apt-get' ? sysNote('apt-get script ve otomasyon için, insan için modern ön yüz apt. İkisi de çalışır, apt daha okunur çıktı ve ilerleme çubuğu verir', 'apt-get is for scripts and automation, apt is the modern front end for humans. Both work, apt gives more readable output and a progress bar') + '\n' : '';
  const warn = front === 'apt' ? '' : '';
  if (!sub) return fail(front === 'apt' ? 'apt 2.7.14 (amd64)\nUsage: apt [options] command\n\napt is a commandline package manager and provides commands for\nsearching and managing as well as querying information about packages.\n\nMost used commands:\n  list - list packages based on package names\n  search - search in package descriptions\n  show - show package details\n  install - install packages\n  reinstall - reinstall packages\n  remove - remove packages\n  autoremove - automatically remove all unused packages\n  update - update list of available packages\n  upgrade - upgrade the system by installing/upgrading packages\n  full-upgrade - upgrade the system by removing/installing/upgrading packages\n  edit-sources - edit the source information file\n  satisfy - satisfy dependency strings' : 'apt-get 2.7.14 (amd64)\nUsage: apt-get [options] command\n\napt-get is a command line interface for retrieval of packages\nand information about them from authenticated sources and\nfor installation, upgrade and removal of packages together\nwith their dependencies.\n\nMost used commands:\n  update - Retrieve new lists of packages\n  upgrade - Perform an upgrade\n  install - Install new packages (pkg is libc6 not libc6.deb)\n  remove - Remove packages\n  purge - Remove packages and config files\n  autoremove - Remove automatically all unused packages', 1);
  if (sub === 'update') {
    if (!sh.isRoot) return fail('Reading package lists... Done\n' + SYS_APT_LOCK);
    return ok(hint + 'Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease\nGet:2 http://archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]\nGet:3 http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]\nHit:4 http://archive.ubuntu.com/ubuntu noble-backports InRelease\nGet:5 http://archive.ubuntu.com/ubuntu noble-updates/main amd64 Packages [1,021 kB]\nFetched 1,273 kB in 1s (1,180 kB/s)\nReading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\n' + SYS_UPGRADABLE.filter(p => installed.includes(p)).length + ' packages can be upgraded. Run \'apt list --upgradable\' to see them.\n');
  }
  if (sub === 'upgrade' || sub === 'full-upgrade' || sub === 'dist-upgrade') {
    if (!sh.isRoot) return fail(SYS_APT_LOCK);
    const up = SYS_UPGRADABLE.filter(p => installed.includes(p));
    return ok(hint + SYS_APT_HEAD + 'Calculating upgrade... Done\n' + (up.length ? `The following packages will be upgraded:\n  ${up.join(' ')}\n${up.length} upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\nNeed to get 2,118 kB of archives.\nAfter this operation, 12.3 kB of additional disk space will be used.\nDo you want to continue? [Y/n] ${flags.has('y') ? 'Y' : ''}\n` + up.map(p => `Get:1 http://archive.ubuntu.com/ubuntu noble-updates/main amd64 ${p} amd64 ${sysPkg(p).v} [${sysPkg(p).s} kB]\nPreparing to unpack .../${p}_${sysPkg(p).v.replace(/:/, '%3a')}_amd64.deb ...\nUnpacking ${p} (${sysPkg(p).v}) over (${sysPkg(p).v.replace(/\.(\d+)$/, (m, n) => '.' + (n - 1))}) ...\nSetting up ${p} (${sysPkg(p).v}) ...`).join('\n') + '\nProcessing triggers for man-db (2.12.0-4build2) ...\n' : '0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n'));
  }
  if (sub === 'list') {
    if (flags.has('--installed')) return ok('Listing... Done\n' + join(SYS_PKGS.filter(p => installed.includes(p.n)).map(p => `${p.n}/noble,now ${p.v} amd64 [installed${SYS_UPGRADABLE.includes(p.n) ? ',upgradable to: ' + p.v.replace(/\.(\d+)$/, (m, n) => '.' + (+n + 1)) : ''}]`)));
    if (flags.has('--upgradable')) return ok('Listing... Done\n' + join(SYS_UPGRADABLE.filter(p => installed.includes(p)).map(p => `${p}/noble-updates ${sysPkg(p).v.replace(/\.(\d+)$/, (m, n) => '.' + (+n + 1))} amd64 [upgradable from: ${sysPkg(p).v}]`)));
    const pat = names[0] ? globToRe(names[0]) : null;
    return ok('Listing... Done\n' + join(SYS_PKGS.filter(p => !pat || pat.test(p.n)).map(p => `${p.n}/noble ${p.v} amd64${installed.includes(p.n) ? ' [installed]' : ''}`)));
  }
  if (sub === 'search') {
    if (!names[0]) return fail('E: You must give at least one search pattern');
    const re = new RegExp(names[0], 'i');
    const hits = SYS_PKGS.filter(p => re.test(p.n) || re.test(p.d));
    return ok('Sorting... Done\nFull Text Search... Done\n' + hits.map(p => `${p.n}/noble ${p.v} amd64${installed.includes(p.n) ? ' [installed]' : ''}\n  ${p.d}\n`).join('\n'));
  }
  if (sub === 'show' || sub === 'policy') {
    if (!names[0]) return fail('E: No packages found');
    const p = sysPkg(names[0]);
    if (!p) return fail(`N: Unable to locate package ${names[0]}\nN: Couldn't find any package by glob '${names[0]}'\nE: No packages found`, 100);
    if (sub === 'policy') return ok(`${p.n}:\n  Installed: ${installed.includes(p.n) ? p.v : '(none)'}\n  Candidate: ${p.v}\n  Version table:\n ${installed.includes(p.n) ? '***' : '   '} ${p.v} 500\n        500 http://archive.ubuntu.com/ubuntu noble/main amd64 Packages\n${installed.includes(p.n) ? '        100 /var/lib/dpkg/status\n' : ''}`);
    return ok(`Package: ${p.n}\nVersion: ${p.v}\nPriority: optional\nSection: ${p.n === 'nginx' ? 'web' : 'utils'}\nOrigin: Ubuntu\nMaintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>\nInstalled-Size: ${p.s} kB\nDepends: libc6 (>= 2.34)\nHomepage: https://packages.ubuntu.com/${p.n}\nDownload-Size: ${Math.round(p.s / 3)} kB\nAPT-Manual-Installed: ${installed.includes(p.n) ? 'yes' : 'no'}\nAPT-Sources: http://archive.ubuntu.com/ubuntu noble/main amd64 Packages\nDescription: ${p.d}\n`);
  }
  if (sub === 'install' || sub === 'reinstall') {
    if (!names.length) return fail(SYS_APT_HEAD + (sh.isRoot ? '0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.' : SYS_APT_LOCK), sh.isRoot ? 0 : 100);
    const missing = names.filter(n => !sysPkg(n));
    if (missing.length) return fail((sh.isRoot ? SYS_APT_HEAD : '') + join(missing.map(m => `E: Unable to locate package ${m}`)), 100);
    if (!sh.isRoot) return fail(SYS_APT_LOCK + '\n' + sysNote('Paket kurmak root ister, sudo apt install ' + names.join(' '), 'Installing packages needs root, sudo apt install ' + names.join(' ')), 100);
    const fresh = names.filter(n => !installed.includes(n) || sub === 'reinstall');
    const already = names.filter(n => installed.includes(n) && sub !== 'reinstall');
    let out = hint + SYS_APT_HEAD;
    already.forEach(n => { out += `${n} is already the newest version (${sysPkg(n).v}).\n`; });
    if (!fresh.length) return ok(out + '0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n');
    const size = fresh.reduce((s, n) => s + Math.round(sysPkg(n).s / 3), 0);
    out += `The following NEW packages will be installed:\n  ${fresh.join(' ')}\n0 upgraded, ${fresh.length} newly installed, 0 to remove and 0 not upgraded.\nNeed to get ${sysNum(size)} kB of archives.\nAfter this operation, ${sysNum(fresh.reduce((s, n) => s + sysPkg(n).s, 0))} kB of additional disk space will be used.\n`;
    if (fresh.length > 1 && !flags.has('y')) out += 'Do you want to continue? [Y/n] Y\n' + sysNote('Birden çok paket ya da bağımlılık varsa apt sorar, script içinde apt-get install -y', 'apt asks when there are several packages or dependencies, in a script use apt-get install -y') + '\n';
    fresh.forEach((n, i) => { const p = sysPkg(n); out += `Get:${i + 1} http://archive.ubuntu.com/ubuntu noble/main amd64 ${n} amd64 ${p.v} [${Math.round(p.s / 3)} kB]\n`; });
    out += `Fetched ${sysNum(size)} kB in 0s (${sysNum(size * 4)} kB/s)\n`;
    fresh.forEach(n => { const p = sysPkg(n); out += `Selecting previously unselected package ${n}.\n(Reading database ... 98214 files and directories currently installed.)\nPreparing to unpack .../${n}_${p.v.replace(/:/, '%3a')}_amd64.deb ...\nUnpacking ${n} (${p.v}) ...\n`; });
    fresh.forEach(n => { out += `Setting up ${n} (${sysPkg(n).v}) ...\n`; });
    out += 'Processing triggers for man-db (2.12.0-4build2) ...\n';
    if (fresh.includes('mlocate')) out += sysNote('mlocate kuruldu ama veritabanı boş, sudo updatedb çalıştırmadan locate bir şey bulmaz', 'mlocate is installed but its database is empty, locate finds nothing until you run sudo updatedb') + '\n';
    sysSetInstalled(sh, installed.concat(fresh.filter(n => !installed.includes(n))));
    return ok(out);
  }
  if (sub === 'remove' || sub === 'purge' || sub === 'autoremove') {
    if (!sh.isRoot) return fail(SYS_APT_LOCK, 100);
    if (sub === 'autoremove' && !names.length) return ok(hint + SYS_APT_HEAD + '0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n');
    const missing = names.filter(n => !sysPkg(n));
    if (missing.length) return fail(SYS_APT_HEAD + join(missing.map(m => `E: Unable to locate package ${m}`)), 100);
    const gone = names.filter(n => installed.includes(n));
    let out = hint + SYS_APT_HEAD;
    names.filter(n => !installed.includes(n)).forEach(n => { out += `Package '${n}' is not installed, so not removed\n`; });
    if (!gone.length) return ok(out + '0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n');
    if (gone.includes('build-essential') || gone.includes('openssh-server')) out += sysNote('Bu paket olmadan lab işlevsiz kalır, kaldırılmış sayıldı ama komutlar çalışmaya devam eder', 'The lab cannot work without this package, it counts as removed but the commands keep working') + '\n';
    out += `The following packages will be REMOVED:\n  ${gone.map(n => n + (sub === 'purge' ? '*' : '')).join(' ')}\n0 upgraded, 0 newly installed, ${gone.length} to remove and 0 not upgraded.\nAfter this operation, ${sysNum(gone.reduce((s, n) => s + sysPkg(n).s, 0))} kB disk space will be freed.\n`;
    if (!flags.has('y')) out += 'Do you want to continue? [Y/n] Y\n';
    gone.forEach(n => { out += `(Reading database ... 98214 files and directories currently installed.)\nRemoving ${n} (${sysPkg(n).v}) ...\n`; if (sub === 'purge') out += `Purging configuration files for ${n} (${sysPkg(n).v}) ...\n`; });
    out += 'Processing triggers for man-db (2.12.0-4build2) ...\n';
    if (sub === 'remove' && gone.some(n => sysPkg(n).f.some(f => f.startsWith('/etc/')))) out += sysNote('remove config dosyalarını /etc altında bırakır, hepsini silmek için purge', 'remove leaves config files under /etc, use purge to delete everything') + '\n';
    sysSetInstalled(sh, installed.filter(n => !gone.includes(n)));
    return ok(out + warn);
  }
  if (sub === 'clean' || sub === 'autoclean') return sh.isRoot ? ok(hint) : fail(SYS_APT_LOCK, 100);
  if (sub === 'edit-sources' || sub === 'satisfy' || sub === 'depends' || sub === 'rdepends') return ok(hint + sysNote(`${sub} bu lab'da simüle edilmiyor`, `${sub} is not simulated in this lab`) + '\n');
  return fail(`E: Invalid operation ${sub}`, 100);
}
SYS_CMDS.apt = function (args) { return sysApt(this, args, 'apt'); };
SYS_CMDS['apt-get'] = function (args) { return sysApt(this, args, 'apt-get'); };
SYS_CMDS['apt-cache'] = function (args) {
  const sub = args[0];
  if (sub === 'search' || sub === 'show' || sub === 'policy') return sysApt(this, args, 'apt');
  if (sub === 'depends') return args[1] && sysPkg(args[1]) ? ok(`${args[1]}\n  Depends: libc6\n  Depends: libssl3\n`) : fail(`E: No packages found`, 100);
  return fail('Usage: apt-cache [options] command\n       apt-cache [options] show pkg1 [pkg2 ...]\n\nMost used commands:\n  showsrc - Show source records\n  search - Search the package list for a regex pattern\n  depends - Show raw dependency information for a package\n  rdepends - Show reverse dependency information for a package\n  show - Show a readable record for the package\n  policy - Show policy settings', 100);
};
SYS_CMDS.dpkg = function (args) {
  sysEnsure(this);
  const installed = sysInstalled(this);
  const { flags, rest } = parseOpts(args);
  if (flags.has('l') || flags.has('--list')) {
    const pat = rest[0] ? globToRe(rest[0].includes('*') ? rest[0] : '*' + rest[0] + '*') : null;
    const list = SYS_PKGS.filter(p => installed.includes(p.n) && (!pat || pat.test(p.n)));
    if (rest[0] && !list.length) return fail(`dpkg-query: no packages found matching ${rest[0]}`);
    return ok('Desired=Unknown/Install/Remove/Purge/Hold\n| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend\n|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)\n||/ Name              Version                       Architecture Description\n+++-=================-=============================-============-===========================================\n' + join(list.map(p => `ii  ${sysPad(p.n, 17)} ${sysPad(p.v, 29)} amd64        ${p.d}`)));
  }
  if (flags.has('L') || flags.has('--listfiles')) {
    if (!rest[0]) return fail('dpkg-query: --listfiles needs at least one package name argument', 2);
    const p = sysPkg(rest[0]);
    if (!p || !installed.includes(p.n)) return fail(`dpkg-query: package '${rest[0]}' is not installed\nUse dpkg --contents (= dpkg-deb --contents) to list archive files contents.`, 1);
    return ok(join(['/.', '/usr', '/usr/bin'].concat(p.f, [`/usr/share/doc/${p.n}`, `/usr/share/doc/${p.n}/copyright`, `/usr/share/doc/${p.n}/changelog.Debian.gz`])));
  }
  if (flags.has('s') || flags.has('--status')) {
    if (!rest[0]) return fail('dpkg-query: --status needs at least one package name argument', 2);
    const p = sysPkg(rest[0]);
    if (!p || !installed.includes(p.n)) return fail(`dpkg-query: package '${rest[0]}' is not installed and no information is available\nUse dpkg --info (= dpkg-deb --info) to examine archive files.`, 1);
    return ok(sysDpkgText([p.n]));
  }
  if (flags.has('S') || flags.has('--search')) {
    if (!rest[0]) return fail('dpkg-query: --search needs at least one file name pattern argument', 2);
    const hits = SYS_PKGS.filter(p => installed.includes(p.n) && p.f.some(f => f === rest[0] || f.endsWith('/' + rest[0])));
    if (!hits.length) return fail(`dpkg-query: no path found matching pattern ${rest[0]}`, 1);
    return ok(join(hits.map(p => `${p.n}: ${p.f.find(f => f === rest[0] || f.endsWith('/' + rest[0]))}`)));
  }
  if (flags.has('i') || flags.has('--install')) {
    if (!rest[0]) return fail('dpkg: error: --install needs at least one package archive file argument\n\nType dpkg --help for help about installing and deinstalling packages [*];', 2);
    if (!this.isRoot) return fail('dpkg: error: requested operation requires superuser privilege', 2);
    const r = this.readFile(rest[0], 'dpkg');
    if (r.err) return fail(`dpkg: error: cannot access archive '${rest[0]}': No such file or directory`, 2);
    const m = /^([a-z0-9.+-]+)_([^_]+)_(amd64|all)\.deb$/.exec(rest[0].split('/').pop());
    if (!m) return fail(`dpkg-deb: error: '${rest[0]}' is not a Debian format archive\ndpkg: error processing archive ${rest[0]} (--install):\n dpkg-deb --control subprocess returned error exit status 2\nErrors were encountered while processing:\n ${rest[0]}`, 1);
    if (!sysPkg(m[1])) SYS_PKGS.push({ n: m[1], v: m[2], d: 'locally installed package', s: 100, i: 0, f: ['/usr/bin/' + m[1]] });
    sysSetInstalled(this, installed.concat(installed.includes(m[1]) ? [] : [m[1]]));
    return ok(`Selecting previously unselected package ${m[1]}.\n(Reading database ... 98214 files and directories currently installed.)\nPreparing to unpack ${rest[0]} ...\nUnpacking ${m[1]} (${m[2]}) ...\nSetting up ${m[1]} (${m[2]}) ...\n`);
  }
  if (flags.has('r') || flags.has('P') || flags.has('--remove') || flags.has('--purge')) {
    if (!this.isRoot) return fail('dpkg: error: requested operation requires superuser privilege', 2);
    const p = sysPkg(rest[0] || '');
    if (!p || !installed.includes(p.n)) return fail(`dpkg: warning: ignoring request to remove ${rest[0]} which isn't installed`, 0);
    sysSetInstalled(this, installed.filter(n => n !== p.n));
    return ok(`(Reading database ... 98214 files and directories currently installed.)\nRemoving ${p.n} (${p.v}) ...\n`);
  }
  if (flags.has('--configure') || flags.has('--get-selections')) return ok(join(installed.map(n => `${sysPad(n, 40)}install`)));
  return fail('dpkg: error: need an action option\n\nType dpkg --help for help about installing and deinstalling packages [*];\nUse \'apt\' or \'aptitude\' for user-friendly package management;\nType dpkg -Dhelp for a list of dpkg debug flag values;', 2);
};
function sysRpmNote(cmd) { return sysNote(`Bu kutu Debian tabanlı Ubuntu, ${cmd} RHEL, Fedora, Rocky ve Alma ailesinin aracı. Burada karşılığı apt ve dpkg. Öğrenmek için aşağıda gerçek bir RHEL çıktısı simüle ediliyor`, `This box is Debian based Ubuntu, ${cmd} is a tool of the RHEL, Fedora, Rocky and Alma family. The equivalent here is apt and dpkg. For learning, real RHEL output is simulated below`) + '\n'; }
SYS_CMDS.dnf = function (args) {
  sysEnsure(this);
  const sub = args.filter(a => !a.startsWith('-'))[0];
  const names = args.filter(a => !a.startsWith('-')).slice(1);
  const note = sysRpmNote('dnf');
  if (!sub) return fail('usage: dnf [options] COMMAND\n\nList of Main Commands:\n\ninstall                   install a package or packages on your system\nremove                    remove a package or packages from your system\nsearch                    search package details for the given string\nupdate                    upgrade a package or packages on your system\ninfo                      display details about a package or group of packages\nlist                      list a package or groups of packages\ncheck-update              check for available package upgrades', 1);
  if (['install', 'remove', 'update', 'upgrade', 'erase'].includes(sub)) {
    if (!this.isRoot) return fail(note + 'Error: This command has to be run with superuser privileges (under the root user on most systems).', 1);
    if (sub === 'install' && names[0] && !sysPkg(names[0])) return fail(note + `Updating Subscription Management repositories.\nLast metadata expiration check: 0:12:03 ago on ${sysCtime(new Date())}.\nNo match for argument: ${names[0]}\nError: Unable to find a match: ${names[0]}`, 1);
    const p = names[0] ? sysPkg(names[0]) : null;
    return ok(note + `Updating Subscription Management repositories.\nLast metadata expiration check: 0:12:03 ago on ${sysCtime(new Date())}.\nDependencies resolved.\n================================================================================\n Package           Architecture   Version                  Repository      Size\n================================================================================\n${sub === 'install' ? 'Installing' : sub === 'remove' || sub === 'erase' ? 'Removing' : 'Upgrading'}:\n ${sysPad(p ? p.n : 'kernel', 17)} x86_64         ${sysPad(p ? p.v.replace(/^\d+:/, '').replace(/-.*$/, '') + '-1.el9' : '5.14.0-427.el9', 24)} ${sysPad(sub === 'remove' ? '@baseos' : 'appstream', 15)}${p ? Math.round(p.s / 3) : 4200} k\n\nTransaction Summary\n================================================================================\n${sub === 'install' ? 'Install' : sub === 'remove' || sub === 'erase' ? 'Remove' : 'Upgrade'}  1 Package\n\nIs this ok [y/N]: ${args.includes('-y') ? 'y' : ''}\n${args.includes('-y') ? 'Complete!' : sysNote('dnf onay ister, script için dnf -y install ' + (p ? p.n : ''), 'dnf asks for confirmation, in a script use dnf -y install ' + (p ? p.n : ''))}\n`);
  }
  if (sub === 'search') return ok(note + `Last metadata expiration check: 0:12:03 ago on ${sysCtime(new Date())}.\n========================== Name & Summary Matched: ${names[0] || ''} ==========================\n` + join(SYS_PKGS.filter(p => !names[0] || p.n.includes(names[0]) || p.d.includes(names[0])).slice(0, 8).map(p => `${p.n}.x86_64 : ${p.d}`)));
  if (sub === 'list') return ok(note + 'Installed Packages\n' + join(SYS_PKGS.filter(p => sysInstalled(this).includes(p.n)).map(p => `${sysPad(p.n + '.x86_64', 40)} ${sysPad(p.v.replace(/^\d+:/, '').replace(/-.*$/, '') + '-1.el9', 30)} @baseos`)));
  if (sub === 'info') { const p = sysPkg(names[0] || ''); if (!p) return fail(note + `Error: No matching Packages to list`, 1); return ok(note + `Installed Packages\nName         : ${p.n}\nVersion      : ${p.v.replace(/^\d+:/, '').replace(/-.*$/, '')}\nRelease      : 1.el9\nArchitecture : x86_64\nSize         : ${p.s} k\nSource       : ${p.n}-${p.v.replace(/^\d+:/, '').replace(/-.*$/, '')}-1.el9.src.rpm\nRepository   : @System\nSummary      : ${p.d}\nLicense      : GPLv2+\n`); }
  if (sub === 'check-update') return ok(note + `Last metadata expiration check: 0:12:03 ago on ${sysCtime(new Date())}.\n\ncurl.x86_64                        7.76.1-29.el9_4                  baseos\nopenssh-server.x86_64              8.7p1-38.el9                     baseos\n`);
  if (sub === 'repolist') return ok(note + 'repo id                     repo name\nappstream                   Rocky Linux 9 - AppStream\nbaseos                      Rocky Linux 9 - BaseOS\nextras                      Rocky Linux 9 - Extras\n');
  return fail(note + `No such command: ${sub}. Please use /usr/bin/dnf --help\nIt could be a DNF plugin command, try: "dnf install 'dnf-command(${sub})'"`, 1);
};
SYS_CMDS.yum = function (args) {
  const r = SYS_CMDS.dnf.call(this, args);
  const note = sysNote('yum eskidi, modern RHEL 8 ve sonrası, Fedora ve Rocky üzerinde yum aslında dnf\'e giden bir symlink. Yeni sistemde dnf yaz', 'yum is outdated, on modern RHEL 8 and later, Fedora and Rocky yum is just a symlink to dnf. On a new system type dnf') + '\n';
  return { out: r.out ? note + r.out : '', err: r.err ? note + r.err : '', code: r.code };
};
SYS_CMDS.rpm = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  const note = sysRpmNote('rpm');
  const installed = sysInstalled(this);
  const rpmName = p => `${p.n}-${p.v.replace(/^\d+:/, '').replace(/-.*$/, '')}-1.el9.x86_64`;
  if (flags.has('q')) {
    if (flags.has('a')) return ok(note + join(SYS_PKGS.filter(p => installed.includes(p.n)).map(rpmName)));
    if (!rest[0]) return fail(note + 'rpm: no arguments given for query', 1);
    const p = sysPkg(rest[0]);
    if (!p || !installed.includes(p.n)) return fail(note + `package ${rest[0]} is not installed`, 1);
    if (flags.has('i')) return ok(note + `Name        : ${p.n}\nVersion     : ${p.v.replace(/^\d+:/, '').replace(/-.*$/, '')}\nRelease     : 1.el9\nArchitecture: x86_64\nInstall Date: ${sysCtime(new Date(Date.now() - 86400000 * 30))}\nGroup       : Unspecified\nSize        : ${p.s * 1024}\nLicense     : GPLv2+\nSignature   : RSA/SHA256, ${sysCtime(new Date(Date.now() - 86400000 * 60))}, Key ID 15af5dac6d745a60\nSource RPM  : ${p.n}-${p.v.replace(/^\d+:/, '').replace(/-.*$/, '')}-1.el9.src.rpm\nBuild Date  : ${sysCtime(new Date(Date.now() - 86400000 * 61))}\nVendor      : Rocky Enterprise Software Foundation\nSummary     : ${p.d}\nDescription :\n${p.d}\n`);
    if (flags.has('l')) return ok(note + join(p.f));
    if (flags.has('f')) return ok(note + rpmName(SYS_PKGS.find(x => x.f.includes(rest[0])) || p));
    return ok(note + rpmName(p) + '\n');
  }
  if (flags.has('e')) {
    if (!this.isRoot) return fail(note + `error: can't create transaction lock on /var/lib/rpm/.rpm.lock (Permission denied)`, 1);
    const p = sysPkg(rest[0] || '');
    if (!p || !installed.includes(p.n)) return fail(note + `error: package ${rest[0]} is not installed`, 1);
    sysSetInstalled(this, installed.filter(n => n !== p.n));
    return ok(note);
  }
  if (flags.has('i') || flags.has('U')) {
    if (!this.isRoot) return fail(note + `error: can't create transaction lock on /var/lib/rpm/.rpm.lock (Permission denied)`, 1);
    if (!rest[0]) return fail(note + 'rpm: no packages given for install', 1);
    const r = this.readFile(rest[0], 'rpm');
    if (r.err) return fail(note + `error: open of ${rest[0]} failed: No such file or directory`, 1);
    const m = /^([a-z0-9.+-]+)-(\d[^-]*)-([^-]+)\.(x86_64|noarch)\.rpm$/.exec(rest[0].split('/').pop());
    if (!m) return fail(note + `error: ${rest[0]}: not an rpm package (or package manifest)`, 1);
    if (!sysPkg(m[1])) SYS_PKGS.push({ n: m[1], v: m[2], d: 'locally installed package', s: 100, i: 0, f: ['/usr/bin/' + m[1]] });
    if (installed.includes(m[1]) && flags.has('i')) return fail(note + `\tpackage ${m[1]}-${m[2]}-${m[3]}.${m[4]} is already installed`, 1);
    sysSetInstalled(this, installed.concat(installed.includes(m[1]) ? [] : [m[1]]));
    return ok(note + (flags.has('v') ? 'Verifying...                          ################################# [100%]\nPreparing...                          ################################# [100%]\nUpdating / installing...\n   1:' + sysPad(`${m[1]}-${m[2]}-${m[3]}`, 34) + '################################# [100%]\n' : ''));
  }
  if (flags.has('V')) return ok(note);
  return fail(note + 'RPM version 4.16.1.3\nUsage: rpm [-aKfgpWHqV] [-aKfgpWHqV] [--afterinstall] ...\n  -q, --query                      query packages\n  -i, --install                    install package(s)\n  -e, --erase                      erase (uninstall) package', 1);
};

/* make ve hello: ~/src/hello-2.12 icinde ./configure, make, sudo make install */
function sysMakefile(sh) { const n = sh.node(sh.resolve('Makefile')) || sh.node(sh.resolve('makefile')) || sh.node(sh.resolve('GNUmakefile')); return n && n.t === 'f' ? n.d : null; }
SYS_CMDS.make = function (args) {
  const { rest } = parseOpts(args, 'fCj');
  const mk = sysMakefile(this);
  if (mk === null) return fail(rest[0] ? `make: *** No rule to make target '${rest[0]}'.  Stop.` : 'make: *** No targets specified and no makefile found.  Stop.' + (this.node(this.resolve('Makefile.in')) ? '\n' + sysNote('Makefile.in var ama Makefile yok, önce ./configure', 'There is a Makefile.in but no Makefile, run ./configure first') : ''), 2);
  const prefix = (/^prefix\s*=\s*(\S+)/m.exec(mk) || [])[1] || '/usr/local';
  const bindir = prefix + '/bin';
  const targets = {}; mk.replace(/^([A-Za-z_][\w.-]*)\s*:/gm, (m, t) => { targets[t] = true; return m; });
  const target = rest[0] || (Object.keys(targets)[0] || 'all');
  if (!targets[target]) return fail(`make: *** No rule to make target '${target}'.  Stop.`, 2);
  const hello = this.node(this.resolve('hello'));
  const src = this.node(this.resolve('src/hello.c'));
  const build = () => {
    if (!src) return `make: *** No rule to make target 'src/hello.c', needed by 'hello'.  Stop.\n`;
    const bin = mkfile('#!/bin/bash\n# lab: derlenmis ELF binary simulasyonu, gcc ciktisi\necho "Hello, world!"\n', 0o755, this.user);
    bin.x = 'elf';
    const { dir } = this.parent(this.resolve('hello'));
    if (!this.canWrite(dir)) return `/usr/bin/ld: cannot open output file hello: Permission denied\ncollect2: error: ld returned 1 exit status\nmake: *** [Makefile:9: hello] Error 1\n`;
    dir.c.hello = bin;
    return null;
  };
  if (target === 'all' || target === 'hello') {
    if (hello && hello.x === 'elf' && src && hello.ts >= src.ts) return ok(`make: ${target === 'all' ? "Nothing to be done for 'all'." : "'hello' is up to date."}\n`);
    const e = build(); if (e) return fail(e, 2);
    return ok('gcc -O2 -g -Wall -I. -o hello src/hello.c\n');
  }
  if (target === 'install') {
    let out = '';
    if (!(hello && hello.x === 'elf')) { const e = build(); if (e) return fail(e, 2); out += 'gcc -O2 -g -Wall -I. -o hello src/hello.c\n'; }
    out += `/usr/bin/install -c -d ${bindir}\n/usr/bin/install -c hello ${bindir}/hello\n`;
    const binDirNode = this.node(bindir);
    if (!binDirNode) { if (!this.isRoot && !prefix.startsWith(HOME)) return fail(out + `/usr/bin/install: cannot create directory '${bindir}': Permission denied\nmake: *** [Makefile:12: install] Error 1\n${sysNote('Sistem dizinine kurulum root ister, sudo make install. Alternatif ./configure --prefix=$HOME/.local ile kendi dizinine kur', 'Installing into a system directory needs root, sudo make install. Or install into your own directory with ./configure --prefix=$HOME/.local')}`, 2); COMMANDS.mkdir.call(this, ['-p', bindir]); }
    else if (!this.canWrite(binDirNode)) return fail(out + `/usr/bin/install: cannot create regular file '${bindir}/hello': Permission denied\nmake: *** [Makefile:13: install] Error 1\n${sysNote('Sistem dizinine kurulum root ister, sudo make install', 'Installing into a system directory needs root, sudo make install')}`, 2);
    const copy = sysClone(this.node(this.resolve('hello'))); copy.o = this.user; copy.ts = Date.now();
    this.node(bindir).c.hello = copy;
    return ok(out);
  }
  if (target === 'uninstall') { const b = this.node(bindir); if (b && b.c.hello) { if (!this.canWrite(b)) return fail(`rm: cannot remove '${bindir}/hello': Permission denied\nmake: *** [Makefile:16: uninstall] Error 1`, 2); delete b.c.hello; } return ok(`rm -f ${bindir}/hello\n`); }
  if (target === 'clean') { const { dir } = this.parent(this.resolve('hello')); if (dir && dir.c.hello) delete dir.c.hello; return ok('rm -f hello\n'); }
  return ok(`make: Nothing to be done for '${target}'.\n`);
};
SYS_CMDS.hello = function () {
  for (const p of this.env.PATH.split(':')) { const n = this.node(p + '/hello'); if (n && n.t === 'f') return this.runScript(p + '/hello', [], true, null); }
  return fail('hello: command not found\n' + sysNote('hello henüz PATH üzerinde değil. ~/src/hello-2.12 içinde ./configure, make, sudo make install', 'hello is not on the PATH yet. In ~/src/hello-2.12 run ./configure, make, sudo make install'), 127);
};
SYS_CMDS.gcc = function (args) {
  const { vals, rest } = parseOpts(args, 'o');
  const src = rest.find(a => a.endsWith('.c'));
  if (!src) return fail('gcc: fatal error: no input files\ncompilation terminated.', 1);
  const n = this.node(this.resolve(src));
  if (!n) return fail(`gcc: error: ${src}: No such file or directory\ngcc: fatal error: no input files\ncompilation terminated.`, 1);
  const outName = vals.o || 'a.out';
  const msg = (/printf\s*\(\s*"([^"]*)/.exec(n.d) || [, 'Hello, world!'])[1].replace(/\\n/g, '');
  const bin = mkfile(`#!/bin/bash\n# lab: derlenmis ELF binary simulasyonu\necho "${msg.replace(/"/g, '\\"')}"\n`, 0o755, this.user); bin.x = 'elf';
  const abs = this.resolve(outName); const { dir, name } = this.parent(abs);
  if (!dir || !this.canWrite(dir)) return fail(`/usr/bin/ld: cannot open output file ${outName}: Permission denied\ncollect2: error: ld returned 1 exit status`, 1);
  dir.c[name] = bin;
  return ok();
};
SYS_CMDS.cc = SYS_CMDS.gcc;

/* ======================================================================
   5. Sistem yonetimi
   ====================================================================== */
function sysCalMonth(m, y, today) {
  const first = new Date(y, m, 1); const days = new Date(y, m + 1, 0).getDate();
  const title = `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m]} ${y}`;
  const pad = Math.floor((20 - title.length) / 2);
  const rows = [' '.repeat(pad) + title + ' '.repeat(20 - pad - title.length), 'Su Mo Tu We Th Fr Sa'];
  let line = '   '.repeat(first.getDay()).replace(/ $/, ''); let col = first.getDay();
  for (let d = 1; d <= days; d++) {
    const cell = today && today.getFullYear() === y && today.getMonth() === m && today.getDate() === d ? `_${String(d).padStart(2, ' ')}` : String(d).padStart(2, ' ');
    line += (col ? ' ' : '') + cell.replace(/^_/, ''); col++;
    if (col === 7) { rows.push(sysPad(line, 20)); line = ''; col = 0; }
  }
  if (line) rows.push(sysPad(line, 20));
  while (rows.length < 8) rows.push(' '.repeat(20));
  return rows;
}
SYS_CMDS.cal = function (args) {
  const { flags, rest } = parseOpts(args);
  const now = new Date();
  const nums = rest.map(Number);
  if (rest.some((r, i) => isNaN(nums[i]))) return fail(`cal: not a valid ${rest.length === 1 ? 'year' : 'month'}: ${rest.find((r, i) => isNaN(nums[i]))}`, 64);
  if (rest.length === 1 || flags.has('y')) {
    const y = rest.length ? nums[0] : now.getFullYear();
    if (y < 1 || y > 9999) return fail(`cal: year '${y}' not in range 1..9999`, 64);
    const out = [sysPad(' '.repeat(29) + y, 62).trimEnd(), ''];
    for (let q = 0; q < 12; q += 3) {
      const blocks = [0, 1, 2].map(k => sysCalMonth(q + k, y, null));
      for (let r = 0; r < 8; r++) out.push((blocks[0][r] + '  ' + blocks[1][r] + '  ' + blocks[2][r]).trimEnd());
    }
    return ok(join(out));
  }
  let m = now.getMonth(); let y = now.getFullYear();
  if (rest.length === 2) { m = nums[0] - 1; y = nums[1]; if (m < 0 || m > 11) return fail(`cal: ${nums[0]} is not a month number (1..12)`, 64); }
  if (flags.has('3')) {
    const blocks = [-1, 0, 1].map(k => { const d = new Date(y, m + k, 1); return sysCalMonth(d.getMonth(), d.getFullYear(), now); });
    const out = []; for (let r = 0; r < 8; r++) out.push((blocks[0][r] + '  ' + blocks[1][r] + '  ' + blocks[2][r]).trimEnd());
    return ok(join(out));
  }
  return ok(join(sysCalMonth(m, y, now).map(l => l.trimEnd())));
};

SYS_CMDS.hostname = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  const st = sysState(this);
  const name = st.hostname || HOSTNAME;
  if (rest[0]) { if (!this.isRoot) return fail('hostname: you must be root to change the host name'); st.hostname = rest[0]; sysSetState(this, st); return ok(sysNote(`Kernel hostname ${rest[0]} oldu, kalıcı olması için sudo hostnamectl set-hostname ${rest[0]}. Lab prompt'u sabit kalır`, `The kernel hostname is now ${rest[0]}, to make it permanent run sudo hostnamectl set-hostname ${rest[0]}. The lab prompt stays the same`) + '\n'); }
  if (flags.has('I')) return ok('192.168.1.42 192.168.2.1 192.168.100.5 172.17.0.1 10.8.0.2 \n');
  if (flags.has('i')) return ok('127.0.1.1\n');
  if (flags.has('f') || flags.has('A') || flags.has('--fqdn')) return ok(name + '.corp.lab\n');
  if (flags.has('d') || flags.has('y')) return ok('corp.lab\n');
  if (flags.has('s') || flags.has('--short')) return ok(name.split('.')[0] + '\n');
  if (flags.has('a')) return ok('linuxlab\n');
  const bad = [...flags].find(f => !['b'].includes(f));
  if (bad) return fail(`hostname: invalid option -- '${bad}'\nUsage: hostname [-b] {hostname|-F file}         set host name (from file)\n       hostname [-a|-A|-d|-f|-i|-I|-s|-y]      display formatted name\n       hostname                                display host name\n\n    -a, --alias            alias names\n    -A, --all-fqdns        all long host names (FQDNs)\n    -d, --domain           DNS domain name\n    -f, --fqdn, --long     long host name (FQDN)\n    -i, --ip-address       addresses for the host name\n    -I, --all-ip-addresses all addresses for the host\n    -s, --short            short host name\n    -y, --yp, --nis        NIS/YP domain name` + (bad === 'l' ? '\n' + sysNote('Küçük l yok, IP adresleri için büyük I, hostname -I', 'There is no lowercase l, use uppercase I for IP addresses, hostname -I') : ''), 1);
  return ok(name + '\n');
};
SYS_CMDS.hostnamectl = function (args) {
  sysEnsure(this);
  const st = sysState(this);
  if (args[0] === 'set-hostname') { if (!this.isRoot) return fail('Could not set property: Interactive authentication required.'); if (!args[1]) return fail('Expected a hostname, got nothing.'); st.hostname = args[1]; sysSetState(this, st); sysRootWrite(this, '/etc/hostname', args[1] + '\n'); return ok(); }
  if (args[0] === 'hostname') return ok((st.hostname || HOSTNAME) + '\n');
  return ok(` Static hostname: ${st.hostname || HOSTNAME}\n       Icon name: computer-vm\n         Chassis: vm 🖴\n      Machine ID: 9a1b2c3d4e5f4a6b8c7d0e1f2a3b4c5d\n         Boot ID: 7f6e5d4c3b2a49188776655443322110\n  Virtualization: kvm\nOperating System: Ubuntu 24.04 LTS\n          Kernel: Linux ${SYS_KERNEL}\n    Architecture: x86-64\n Hardware Vendor: QEMU\n  Hardware Model: Standard PC _Q35 + ICH9, 2009_\nFirmware Version: 1.16.3-debian-1.16.3-2\n`);
};

const SYS_MODCAT = { vfat: 'fat,nls_iso8859_1', nf_conntrack: '', ip_tables: 'x_tables', wireguard: 'curve25519_x86_64,libchacha20poly1305', btrfs: 'blake2b_generic,xor,raid6_pq', loop: '', kvm: 'irqbypass', kvm_intel: 'kvm', dummy: '', bonding: 'tls', '8021q': 'garp,mrp', tun: '', usb_storage: 'scsi_mod', nfs: 'lockd,grace,sunrpc,fscache', nfsd: 'auth_rpcgss,nfs_acl,lockd,grace,sunrpc', br_netfilter: 'bridge', xfs: 'libcrc32c', zfs: 'spl', iptable_nat: 'nf_nat,ip_tables', ext4: 'mbcache,jbd2', bridge: 'stp,llc', overlay: '', virtio_net: 'net_failover', virtio_blk: '', xt_conntrack: 'nf_conntrack', x_tables: '' };
function sysModules(sh) { return lines(sysRead(sh, SYS_MODULES)).map(l => { const p = l.split(' '); return { n: p[0], size: p[1], used: p[2], by: p[3] === '-' ? [] : p[3].split(',').filter(Boolean) }; }); }
function sysSaveModules(sh, list) { sysRootWrite(sh, SYS_MODULES, join(list.map(m => `${m.n} ${m.size} ${m.used} ${m.by.length ? m.by.join(',') + ',' : '-'} Live 0x0000000000000000`))); }
SYS_CMDS.lsmod = function () {
  sysEnsure(this);
  const out = ['Module                  Size  Used by'];
  sysModules(this).forEach(m => out.push(`${sysPad(m.n, 20)}${sysLpad(m.size, 8)}  ${m.used}${m.by.length ? ' ' + m.by.join(',') : ''}`));
  return ok(join(out));
};
SYS_CMDS.modprobe = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  const name = rest[0];
  if (!name) return fail('Usage:\n\tmodprobe [options] [-i] [-b] modulename\n\tmodprobe [options] -a [-i] [-b] modulename [modulename...]\n\tmodprobe [options] -r [-i] modulename [modulename...]\n\tmodprobe [options] -c\n\tmodprobe [options] --dump-modversions filename\nManagement Options:\n\t-a, --all                   Consider every non-argument to\n\t                            be a module name to be inserted\n\t                            or removed (-r)\n\t-r, --remove                Remove modules instead of inserting', 1);
  const mods = sysModules(this);
  const key = name.replace(/-/g, '_');
  if (flags.has('r') || flags.has('--remove')) return SYS_CMDS.rmmod.call(this, [key]);
  if (flags.has('n') || flags.has('--show') || flags.has('--dry-run')) return ok(SYS_MODCAT[key] === undefined ? '' : (SYS_MODCAT[key] ? SYS_MODCAT[key].split(',').map(d => `insmod /lib/modules/${SYS_KERNEL}/kernel/${d}.ko`).join('\n') + '\n' : '') + `insmod /lib/modules/${SYS_KERNEL}/kernel/${key}.ko\n`);
  if (SYS_MODCAT[key] === undefined) return fail(`modprobe: FATAL: Module ${name} not found in directory /lib/modules/${SYS_KERNEL}`, 1);
  if (!this.isRoot) return fail(`modprobe: ERROR: could not insert '${key}': Operation not permitted\n${sysNote('Kernel modülü yüklemek root ister, sudo modprobe ' + name, 'Loading a kernel module needs root, sudo modprobe ' + name)}`, 1);
  if (mods.some(m => m.n === key)) return ok();
  const deps = SYS_MODCAT[key] ? SYS_MODCAT[key].split(',') : [];
  deps.forEach(d => { if (!mods.some(m => m.n === d)) mods.push({ n: d, size: String(16384 + d.length * 4096), used: '1', by: [key] }); else { const m = mods.find(x => x.n === d); m.used = String(+m.used + 1); if (!m.by.includes(key)) m.by.push(key); } });
  mods.unshift({ n: key, size: String(20480 + key.length * 8192), used: '0', by: [] });
  sysSaveModules(this, mods);
  const dm = this.node('/var/log/kern.log'); const line = `${SYS_MONTHS[new Date().getMonth()]} ${String(new Date().getDate()).padStart(2, ' ')} ${sysHMS(new Date())} linuxlab kernel: [${(Date.now() / 1000 % 100000).toFixed(6)}] ${key}: module loaded\n`;
  if (dm) dm.d += line; else sysRootWrite(this, '/var/log/kern.log', line);
  return ok(flags.has('v') ? `insmod /lib/modules/${SYS_KERNEL}/kernel/${key}.ko\n` : '');
};
SYS_CMDS.rmmod = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  const name = rest[0];
  if (!name) return fail('rmmod: ERROR: missing module name.', 1);
  const key = name.replace(/-/g, '_');
  const mods = sysModules(this);
  const m = mods.find(x => x.n === key);
  if (!m) return fail(`rmmod: ERROR: Module ${name} is not currently loaded`, 1);
  if (!this.isRoot) return fail(`rmmod: ERROR: could not remove '${key}': Operation not permitted\nrmmod: ERROR: could not remove module ${name}: Operation not permitted`, 1);
  if (m.by.length) return fail(`rmmod: ERROR: Module ${key} is in use by: ${m.by.join(' ')}`, 1);
  if (+m.used > 0 && !flags.has('f')) return fail(`rmmod: ERROR: Module ${key} is in use`, 1);
  mods.forEach(x => { if (x.by.includes(key)) { x.by = x.by.filter(b => b !== key); x.used = String(Math.max(0, +x.used - 1)); } });
  sysSaveModules(this, mods.filter(x => x !== m));
  return ok();
};
SYS_CMDS.modinfo = function (args) {
  const name = (args.filter(a => !a.startsWith('-'))[0] || '').replace(/-/g, '_');
  if (SYS_MODCAT[name] === undefined) return fail(`modinfo: ERROR: Module ${name} not found.`, 1);
  return ok(`filename:       /lib/modules/${SYS_KERNEL}/kernel/${name}.ko.zst\nlicense:        GPL\ndescription:    ${name} kernel module\nsrcversion:     ${sysHash(name, 20).toUpperCase()}\ndepends:        ${SYS_MODCAT[name] || ''}\nretpoline:      Y\nintree:         Y\nname:           ${name}\nvermagic:       ${SYS_KERNEL} SMP preempt mod_unload modversions \n`);
};

/* shutdown, reboot, poweroff, halt. Kutu gercekten kapanmaz */
function sysShutdownAt(spec) {
  const now = new Date();
  if (spec === undefined || spec === 'now' || spec === '+0') return now;
  let m;
  if ((m = /^\+(\d+)$/.exec(spec))) return new Date(now.getTime() + +m[1] * 60000);
  if ((m = /^(\d{1,2}):(\d{2})$/.exec(spec))) { const d = new Date(now); d.setHours(+m[1], +m[2], 0, 0); if (d < now) d.setDate(d.getDate() + 1); return d; }
  return null;
}
function sysShutdown(sh, args, defMode) {
  sysEnsure(sh);
  let mode = defMode; let cancel = false; let spec; let msg = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-c') cancel = true;
    else if (a === '-r' || a === '--reboot') mode = 'reboot';
    else if (a === '-h' || a === '-P' || a === '--poweroff' || a === '--halt' || a === '-H') mode = a === '-H' || a === '--halt' ? 'halt' : 'poweroff';
    else if (a === '-k' || a === '--no-wall' || a === '-f' || a === '--force' || a === '-n') { /* kabul */ }
    else if (a.startsWith('-')) return fail(`shutdown: invalid option -- '${a.replace(/^-+/, '')}'\nshutdown [OPTIONS...] [TIME] [WALL...]\n\nShut down the system.\n\n     --help      Show this help\n  -H --halt      Halt the machine\n  -P --poweroff  Power-off the machine\n  -r --reboot    Reboot the machine\n  -h             Equivalent to --poweroff, overridden by --halt\n  -k             Don't halt/power-off/reboot, just send warnings\n     --no-wall   Don't send wall message before halt/power-off/reboot\n  -c             Cancel a pending shutdown`, 1);
    else if (spec === undefined) spec = a; else msg.push(a);
  }
  if (cancel) {
    if (!sh.isRoot) return fail('Failed to set wall message, ignoring: Interactive authentication required.\nFailed to cancel scheduled shutdown: Interactive authentication required.', 1);
    const sched = sh.node(SYS_SHUTDOWN);
    if (!sched) return ok();
    sysDel(sh, SYS_SHUTDOWN);
    return ok(`\nBroadcast message from root@linuxlab on pts/0 (${sysSysd(new Date())}):\n\nThe system shutdown has been cancelled\n\n`);
  }
  const at = sysShutdownAt(spec);
  if (!at) return fail(`Failed to parse time specification: ${spec}`, 1);
  if (!sh.isRoot) return fail(`Failed to set wall message, ignoring: Interactive authentication required.\nFailed to ${defMode === 'reboot' && !args.length ? 'reboot system via logind' : 'call ScheduleShutdown in logind, no action will be taken'}: Interactive authentication required.\n${sysNote('Kapatma ve yeniden başlatma root ister, sudo shutdown', 'Shutting down and rebooting needs root, sudo shutdown')}`, 1);
  const verb = mode === 'reboot' ? 'reboot' : mode === 'halt' ? 'halt' : 'power off';
  const immediate = at.getTime() - Date.now() < 1000;
  if (!immediate) {
    sysRootWrite(sh, SYS_SHUTDOWN, `USEC=${at.getTime() * 1000}\nWARN_WALL=1\nMODE=${mode}\nUID=0\nTTY=pts/0\nWALL_MESSAGE=${msg.join(' ')}\n`, 0o600);
    return ok(`${mode === 'reboot' ? 'Reboot' : 'Shutdown'} scheduled for ${sysSysd(at)}, use 'shutdown -c' to cancel.\n\nBroadcast message from root@linuxlab on pts/0 (${sysSysd(new Date())}):\n\n${msg.length ? msg.join(' ') + '\n' : ''}The system will ${verb} at ${sysSysd(at)}!\n\n${sysNote('Gerçek sistemde tüm oturumlara wall mesajı gider ve süre dolunca kutu kapanır. Lab kapanmaz, iptal için sudo shutdown -c', 'On a real system a wall message goes to every session and the box shuts down when the time is up. The lab stays up, cancel with sudo shutdown -c')}\n`);
  }
  sysDel(sh, SYS_SHUTDOWN);
  return ok(`\nBroadcast message from root@linuxlab on pts/0 (${sysSysd(new Date())}):\n\n${msg.length ? msg.join(' ') + '\n' : ''}The system will ${verb} now!\n\n${sysNote(`Gerçek sistemde bu noktada ssh bağlantın kopar ve kutu ${mode === 'reboot' ? 'yeniden başlar' : 'kapanır'}. Lab'da kutu ayakta kalır, çalışmaya devam et`, `On a real system your ssh connection drops at this point and the box ${mode === 'reboot' ? 'restarts' : 'powers off'}. In the lab the box stays up, keep working`)}\n`);
}
SYS_CMDS.shutdown = function (args) { return sysShutdown(this, args, 'poweroff'); };
SYS_CMDS.reboot = function (args) { return sysShutdown(this, args.concat(['now']), 'reboot'); };
SYS_CMDS.poweroff = function (args) { return sysShutdown(this, args.concat(['now']), 'poweroff'); };
SYS_CMDS.halt = function (args) { return sysShutdown(this, args.concat(['now']), 'halt'); };
SYS_CMDS.wall = function (args, stdin) { const msg = args.length ? args.join(' ') : (stdin || '').trim(); if (!this.isRoot && !msg) return fail('wall: cannot read stdin'); return ok(`\nBroadcast message from ${sysCurrentUser(this)}@linuxlab (pts/0) (${sysCtime(new Date())}):\n\n${msg}\n\n`); };

const SYS_TZ = ['Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/New_York', 'America/Sao_Paulo', 'America/Toronto', 'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Jakarta', 'Asia/Kolkata', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/Amsterdam', 'Europe/Berlin', 'Europe/Brussels', 'Europe/Dublin', 'Europe/Istanbul', 'Europe/Lisbon', 'Europe/London', 'Europe/Madrid', 'Europe/Moscow', 'Europe/Paris', 'Europe/Rome', 'Europe/Stockholm', 'Europe/Vienna', 'Europe/Warsaw', 'Europe/Zurich', 'Pacific/Auckland', 'Pacific/Honolulu', 'UTC'];
const SYS_TZOFF = { 'Europe/Istanbul': [3, '+03'], 'Europe/Amsterdam': [2, 'CEST'], 'Europe/Berlin': [2, 'CEST'], 'Europe/Paris': [2, 'CEST'], 'Europe/London': [1, 'BST'], 'UTC': [0, 'UTC'], 'America/New_York': [-4, 'EDT'], 'America/Los_Angeles': [-7, 'PDT'], 'Asia/Tokyo': [9, 'JST'], 'Asia/Dubai': [4, '+04'], 'Asia/Kolkata': [5.5, 'IST'] };
SYS_CMDS.timedatectl = function (args) {
  sysEnsure(this);
  const st = sysState(this);
  const sub = args[0] || 'status';
  if (sub === 'list-timezones') return ok(join(SYS_TZ));
  if (sub === 'set-timezone') {
    if (!args[1]) return fail('Expected a time zone, got nothing.', 1);
    if (!this.isRoot) return fail('Failed to set time zone: Interactive authentication required.\n' + sysNote('Saat dilimi sistem geneli bir ayar, sudo timedatectl set-timezone ' + args[1], 'The time zone is a system wide setting, sudo timedatectl set-timezone ' + args[1]), 1);
    if (!SYS_TZ.includes(args[1])) return fail(`Failed to set time zone: Invalid or not installed time zone '${args[1]}'\n${sysNote('Geçerli isimler için timedatectl list-timezones | grep -i ' + args[1].split('/')[0], 'For valid names run timedatectl list-timezones | grep -i ' + args[1].split('/')[0])}`, 1);
    st.tz = args[1]; sysSetState(this, st); sysRootWrite(this, '/etc/timezone', args[1] + '\n');
    return ok();
  }
  if (sub === 'set-ntp') { if (!this.isRoot) return fail('Failed to set ntp: Interactive authentication required.', 1); st.ntp = /^(true|1|yes|on)$/.test(args[1] || '') ? '1' : '0'; sysSetState(this, st); return ok(); }
  if (sub === 'set-time') { if (!this.isRoot) return fail('Failed to set time: Interactive authentication required.', 1); if (st.ntp === '1') return fail('Failed to set time: Automatic time synchronization is enabled', 1); return ok(sysNote('Lab saati tarayıcı saatidir, değişmedi', 'The lab clock is the browser clock, it did not change') + '\n'); }
  if (sub !== 'status' && sub !== 'show') return fail(`Unknown command verb ${sub}.`, 1);
  const [off, abbr] = SYS_TZOFF[st.tz] || [0, 'UTC'];
  const now = new Date();
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const local = new Date(utc.getTime() + off * 3600000);
  const sign = off >= 0 ? '+' : '-'; const oh = String(Math.floor(Math.abs(off))).padStart(2, '0') + String(Math.round((Math.abs(off) % 1) * 60)).padStart(2, '0');
  if (sub === 'show') return ok(`Timezone=${st.tz}\nLocalRTC=no\nCanNTP=yes\nNTP=${st.ntp === '1' ? 'yes' : 'no'}\nNTPSynchronized=${st.ntp === '1' ? 'yes' : 'no'}\nTimeUSec=${sysSysd(local).replace('CEST', abbr)}\nRTCTimeUSec=${sysSysd(utc).replace('CEST', '')}\n`);
  return ok(`               Local time: ${SYS_DAYS[local.getDay()]} ${sysYMD(local)} ${sysHMS(local)} ${abbr}\n           Universal time: ${SYS_DAYS[utc.getDay()]} ${sysYMD(utc)} ${sysHMS(utc)} UTC\n                 RTC time: ${SYS_DAYS[utc.getDay()]} ${sysYMD(utc)} ${sysHMS(utc)}\n                Time zone: ${st.tz} (${abbr}, ${sign}${oh})\nSystem clock synchronized: ${st.ntp === '1' ? 'yes' : 'no'}\n              NTP service: ${st.ntp === '1' ? 'active' : 'inactive'}\n          RTC in local TZ: no\n`);
};

SYS_CMDS.ulimit = function (args) {
  sysEnsure(this);
  const st = sysState(this);
  const { flags, rest } = parseOpts(args);
  const hard = flags.has('H');
  const soft = st.nofile; const hardv = st.nofileHard;
  if (flags.has('a') || !args.length && false) {
    return ok(`real-time non-blocking time  (microseconds, -R) unlimited\ncore file size              (blocks, -c) 0\ndata seg size               (kbytes, -d) unlimited\nscheduling priority                 (-e) 0\nfile size                   (blocks, -f) unlimited\npending signals                     (-i) 15521\nmax locked memory           (kbytes, -l) 503540\nmax memory size             (kbytes, -m) unlimited\nopen files                          (-n) ${hard ? hardv : soft}\npipe size                (512 bytes, -p) 8\nPOSIX message queues         (bytes, -q) 819200\nreal-time priority                  (-r) 0\nstack size                  (kbytes, -s) 8192\ncpu time                   (seconds, -t) unlimited\nmax user processes                  (-u) 15521\nvirtual memory              (kbytes, -v) unlimited\nfile locks                          (-x) unlimited\n`);
  }
  if (flags.has('n')) {
    if (!rest.length) return ok((hard ? hardv : soft) + '\n');
    const v = rest[0] === 'unlimited' ? 'unlimited' : String(parseInt(rest[0], 10));
    if (v === 'NaN') return fail(`bash: ulimit: ${rest[0]}: invalid number`, 1);
    if (!this.isRoot && (v === 'unlimited' || +v > +hardv)) return fail('bash: ulimit: open files: cannot modify limit: Operation not permitted\n' + sysNote(`Soft limit hard limit'i (${hardv}) aşamaz. Kalıcı değişiklik /etc/security/limits.conf, root ise ulimit -n ile yükseltebilir`, `The soft limit cannot exceed the hard limit of ${hardv}. A permanent change goes in /etc/security/limits.conf, root can raise it with ulimit -n`), 1);
    if (hard) st.nofileHard = v; else st.nofile = v;
    if (!hard && +v > +hardv) st.nofileHard = v;
    sysSetState(this, st);
    return ok();
  }
  if (flags.has('u')) return ok((rest[0] ? '' : '15521\n'));
  if (flags.has('c')) return ok(rest[0] ? '' : '0\n');
  if (flags.has('s')) return ok(rest[0] ? '' : '8192\n');
  if (flags.has('v') || flags.has('m') || flags.has('d') || flags.has('t')) return ok(rest[0] ? '' : 'unlimited\n');
  if (flags.has('f')) return ok(rest[0] ? '' : 'unlimited\n');
  if (!args.length) return ok('unlimited\n');
  return fail(`bash: ulimit: -${[...flags][0]}: invalid option\nulimit: usage: ulimit [-SHabcdefiklmnpqrstuvxPRT] [limit]`, 2);
};

SYS_CMDS.umask = function (args) {
  sysEnsure(this);
  const st = sysState(this);
  const { flags, rest } = parseOpts(args);
  const cur = parseInt(st.umask, 8);
  if (!rest.length) {
    if (flags.has('S')) { const p = 0o777 & ~cur; const s = b => (b & 4 ? 'r' : '') + (b & 2 ? 'w' : '') + (b & 1 ? 'x' : ''); return ok(`u=${s(p >> 6)},g=${s((p >> 3) & 7)},o=${s(p & 7)}\n`); }
    if (flags.has('p')) return ok(`umask ${st.umask}\n`);
    return ok(st.umask + '\n');
  }
  let m;
  if (/^[0-7]{1,4}$/.test(rest[0])) m = parseInt(rest[0], 8) & 0o777;
  else {
    let mask = cur; let okm = true;
    for (const part of rest[0].split(',')) {
      const mm = /^([ugoa]*)([+\-=])([rwx]*)$/.exec(part); if (!mm) { okm = false; break; }
      const who = mm[1] || 'a'; let bits = 0;
      const b = (mm[3].includes('r') ? 4 : 0) | (mm[3].includes('w') ? 2 : 0) | (mm[3].includes('x') ? 1 : 0);
      if (/[ua]/.test(who)) bits |= b << 6; if (/[ga]/.test(who)) bits |= b << 3; if (/[oa]/.test(who)) bits |= b;
      let scope = 0; if (/[ua]/.test(who)) scope |= 0o700; if (/[ga]/.test(who)) scope |= 0o70; if (/[oa]/.test(who)) scope |= 0o7;
      if (mm[2] === '+') mask &= ~bits; else if (mm[2] === '-') mask |= bits; else mask = (mask & ~scope) | (scope & ~bits);
    }
    if (!okm) return fail(`bash: umask: \`${rest[0]}': invalid symbolic mode operator`, 1);
    m = mask;
  }
  st.umask = m.toString(8).padStart(4, '0');
  sysSetState(this, st);
  return ok();
};

/* ======================================================================
   6. Izinler. chmod -R, chown user:group, chattr ve lsattr
   ====================================================================== */
const SYS_OLD = { chmod: COMMANDS.chmod, chown: COMMANDS.chown, ls: COMMANDS.ls, rm: COMMANDS.rm, df: COMMANDS.df, du: COMMANDS.du, find: COMMANDS.find, ssh: COMMANDS.ssh, ps: COMMANDS.ps, kill: COMMANDS.kill, pkill: COMMANDS.pkill, history: COMMANDS.history, which: COMMANDS.which, type: COMMANDS.type, file: COMMANDS.file, ifconfig: COMMANDS.ifconfig, netstat: COMMANDS.netstat, declare: COMMANDS.declare, unset: COMMANDS.unset, ip: COMMANDS.ip, xargs: COMMANDS.xargs, mkdir: COMMANDS.mkdir, export: COMMANDS.export, stat: COMMANDS.stat, tail: COMMANDS.tail, getent: COMMANDS.getent, cp: COMMANDS.cp, mv: COMMANDS.mv };

SYS_CMDS.chmod = function (args) {
  const { flags, rest } = parseOpts(args.filter(a => a !== '--reference'));
  const plain = args.filter(a => !/^-[RvcfF]+$/.test(a) && a !== '--recursive' && a !== '--verbose');
  if (plain.length < 2) return fail(plain.length ? `chmod: missing operand after '${plain[0]}'\nTry 'chmod --help' for more information.` : 'chmod: missing operand\nTry \'chmod --help\' for more information.');
  const mode = plain[0];
  if (/^[0-7]{3,4}$/.test(mode) && /^[0-7]*7[0-7]{0,2}$/.test(mode) && mode.endsWith('7') && !flags.has('R')) { /* 777 uyarisi asagida */ }
  const targets = plain.slice(1);
  let out = ''; let err = '';
  const immut = (n, f) => { if (n.at && n.at.includes('i')) { err += `chmod: changing permissions of '${f}': Operation not permitted\n`; return true; } return false; };
  for (const f of targets) {
    const abs = this.resolve(f); const n = this.node(abs);
    if (!n) { err += `chmod: cannot access '${f}': No such file or directory\n`; continue; }
    if (immut(n, f)) continue;
    const r = SYS_OLD.chmod.call(this, [mode, abs]);
    if (r.err) { err += r.err.replace(abs, f); continue; }
    if (flags.has('v') || flags.has('c')) out += `mode of '${f}' changed to 0${(n.m & 0o777).toString(8)} (${modeStr(n).slice(1)})\n`;
    if ((flags.has('R') || flags.has('--recursive')) && n.t === 'd') sysWalk(this, abs, (p, c) => { if (p === abs) return; const rr = SYS_OLD.chmod.call(this, [mode, p]); if (rr.err) err += rr.err; });
  }
  if (/^0?777$/.test(mode) && !err) out += sysNote('777 herkese yazma ve çalıştırma verir, bir çözüm değil bir itiraf. Dizin için 755, dosya için 644, gizli şeyler için 600 ya da 700', '777 gives everyone write and execute, it is not a fix but a confession. Use 755 for directories, 644 for files, 600 or 700 for secrets') + '\n';
  if (/^0?766$/.test(mode) && !err) out += sysNote('766 tuhaf bir kombinasyon, group ve others yazabilir ama çalıştıramaz. Dizinde x olmadan içine girilemez. Gerçek hayatta 755 ya da 775 görürsün', '766 is an odd combination, group and others can write but not execute. Without x nobody can enter a directory. In real life you see 755 or 775') + '\n';
  return { out, err, code: err ? 1 : 0 };
};
SYS_CMDS.chown = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  if (rest.length < 2) return fail(rest.length ? `chown: missing operand after '${rest[0]}'\nTry 'chown --help' for more information.` : 'chown: missing operand\nTry \'chown --help\' for more information.');
  const [spec, ...files] = rest;
  const [owner, group] = spec.includes(':') ? spec.split(':') : spec.includes('.') && !sysUser(this, spec) ? spec.split('.') : [spec, undefined];
  if (owner && !sysUser(this, owner)) return fail(`chown: invalid user: '${spec}'`);
  if (group && !sysGroup(this, group)) return fail(`chown: invalid group: '${spec}'`);
  if (!this.isRoot) {
    const mine = files.every(f => { const n = this.node(this.resolve(f)); return n && n.o === USER; });
    if (owner && owner !== USER) return fail(`chown: changing ownership of '${files[0]}': Operation not permitted\n${sysNote("Dosyayı başkasına vermek root ister, sudo chown. Sıradan kullanıcı sadece üyesi olduğu gruba chgrp yapabilir", 'Giving a file to someone else needs root, sudo chown. A regular user can only chgrp to a group they belong to')}`);
    if (!mine) return fail(`chown: changing ownership of '${files[0]}': Operation not permitted`);
  }
  let err = '';
  for (const f of files) {
    const abs = this.resolve(f); const n = this.node(abs);
    if (!n) { err += `chown: cannot access '${f}': No such file or directory\n`; continue; }
    const apply = x => { if (owner) x.o = owner; if (group) x.g = group; else if (owner && spec.endsWith(':')) x.g = owner; };
    if (flags.has('R')) sysWalk(this, abs, (p, x) => apply(x)); else apply(n);
  }
  return { out: '', err, code: err ? 1 : 0 };
};
SYS_CMDS.chattr = function (args) {
  const flags = new Set(args.filter(a => /^-[RVfp]+$/.test(a)).flatMap(a => a.slice(1).split('')));
  const plain = args.filter(a => !/^-[RVfp]+$/.test(a));
  const spec = plain[0]; const files = plain.slice(1);
  if (!spec || !files.length) return fail('Usage: chattr [-pRVf] [-+=aAcCdDeijmPsStTuFx] [-v version] files...', 1);
  const m = /^([+\-=])([aAcdeijsStTu]+)$/.exec(spec);
  if (!m) return fail(`chattr: Invalid mode: ${spec}`, 1);
  if (!this.isRoot && /[ia]/.test(m[2])) return fail(`chattr: Operation not permitted while setting flags on ${files[0]}\n${sysNote('immutable ve append-only bayrakları root ister, sudo chattr', 'The immutable and append-only flags need root, sudo chattr')}`, 1);
  let err = '';
  for (const f of files) {
    const n = this.node(this.resolve(f));
    if (!n) { err += `chattr: No such file or directory while trying to stat ${f}\n`; continue; }
    const cur = new Set((n.at || '').split(''));
    if (m[1] === '=') cur.clear();
    for (const ch of m[2]) { if (m[1] === '-') cur.delete(ch); else cur.add(ch); }
    const apply = x => { x.at = [...cur].filter(Boolean).sort().join(''); };
    if (flags.has('R')) sysWalk(this, this.resolve(f), (p, x) => apply(x)); else apply(n);
  }
  return { out: '', err, code: err ? 1 : 0 };
};
SYS_CMDS.lsattr = function (args) {
  const { flags, rest } = parseOpts(args);
  const targets = rest.length ? rest : ['.'];
  const out = []; let err = '';
  const fmt = (p, n) => { const a = (n.at || '').split(''); const order = 'suSDiadAcEjItTeCxFNPVm'; out.push(order.split('').map(ch => (a.includes(ch) || (ch === 'e' && n.t === 'f') ? ch : '-')).join('') + ' ' + p); };
  for (const t of targets) {
    const abs = this.resolve(t); const n = this.node(abs);
    if (!n) { err += `lsattr: No such file or directory while trying to stat ${t}\n`; continue; }
    if (n.t === 'd' && !flags.has('d')) Object.keys(n.c).sort().forEach(c => fmt((t === '.' ? './' : t.replace(/\/$/, '') + '/') + c, n.c[c])); else fmt(t, n);
  }
  return { out: join(out), err, code: err ? 1 : 0 };
};

/* ======================================================================
   7. SSH ve transfer
   ====================================================================== */
const SYS_HOSTS = { 'backup.lab': '10.50.0.40', backup: '10.50.0.40', '10.50.0.40': '10.50.0.40', 'web01.lab': '10.50.0.41', web01: '10.50.0.41', '10.50.0.41': '10.50.0.41' };
const SYS_HOSTDIR = { '10.50.0.40': 'backup.lab', '10.50.0.41': 'web01.lab' };
function sysRemote(host) { const ip = SYS_HOSTS[host]; return ip ? SYS_HOSTDIR[ip] : null; }
function sysParseTarget(t) { const m = /^(?:([^@]+)@)?([^:]+)(?::(.*))?$/.exec(t || ''); return m ? { user: m[1] || USER, host: m[2], path: m[3] } : null; }
function sysNorm(p) { const out = []; for (const x of p.split('/')) { if (!x || x === '.') continue; if (x === '..') out.pop(); else out.push(x); } return '/' + out.join('/'); }
function sysRemotePath(h, user, p) { const base = SYS_REMOTE + '/' + h; const home = user === 'root' ? '/root' : '/home/' + user; if (!p || p === '' || p === '.') return sysNorm(base + home); if (p.startsWith('/')) return sysNorm(base + p); if (p.startsWith('~')) return sysNorm(base + home + p.slice(1)); return sysNorm(base + home + '/' + p); }
function sysKeyAuth(sh, h, user) {
  const pub = sh.node(HOME + '/.ssh/id_ed25519.pub') || sh.node(HOME + '/.ssh/id_rsa.pub');
  if (!pub) return false;
  const ak = sh.node(sysRemotePath(h, user, '.ssh/authorized_keys'));
  return !!(ak && ak.d.includes(pub.d.trim().split(' ').slice(0, 2).join(' ')));
}
function sysRemoteLog(sh, h, user, how) {
  const p = SYS_REMOTE + '/' + h + '/var/log/auth.log';
  const line = `${SYS_MONTHS[new Date().getMonth()]} ${String(new Date().getDate()).padStart(2, ' ')} ${sysHMS(new Date())} ${h.split('.')[0]} sshd[${4000 + Math.floor(Math.random() * 900)}]: Accepted ${how} for ${user} from 192.168.1.42 port ${40000 + Math.floor(Math.random() * 9000)} ssh2\n`;
  const n = sh.node(p); if (n && n.t === 'f') n.d += line; else sysRootWrite(sh, p, line);
}
SYS_CMDS.ssh = function (args) {
  sysEnsure(this);
  let port = null; let user = null; const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (rest.length) { rest.push(a); continue; }
    if (a === '-p') port = args[++i]; else if (/^-p\d+$/.test(a)) port = a.slice(2);
    else if (a === '-l') user = args[++i]; else if (a === '-i' || a === '-o' || a === '-F' || a === '-J' || a === '-L' || a === '-R' || a === '-D') i++;
    else if (a.startsWith('-')) { /* -v -q -t -A -N -4 -6 kabul */ }
    else rest.push(a);
  }
  if (!rest.length) return fail('usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [-B bind_interface] [-b bind_address]\n           [-c cipher_spec] [-D [bind_address:]port] [-E log_file]\n           [-e escape_char] [-F configfile] [-I pkcs11] [-i identity_file]\n           [-J destination] [-L address] [-l login_name] [-m mac_spec]\n           [-O ctl_cmd] [-o option] [-P tag] [-p port] [-R address]\n           [-S ctl_path] [-W host:port] [-w local_tun[:remote_tun]]\n           destination [command [argument ...]]', 255);
  const t = sysParseTarget(rest[0]); if (user) t.user = user;
  const h = sysRemote(t.host);
  if (!h) {
    const inHosts = lines(sysRead(this, '/etc/hosts')).some(l => l.trim().split(/\s+/).slice(1).includes(t.host));
    if (/^\d+\.\d+\.\d+\.\d+$/.test(t.host) || inHosts || /\.(com|net|org)$/.test(t.host) || t.host === 'localhost' || t.host === 'linuxlab') return SYS_OLD.ssh.call(this, [t.host]);
    return fail(`ssh: Could not resolve hostname ${t.host}: Name or service not known`, 255);
  }
  if (port && port !== '22') return fail(`ssh: connect to host ${t.host} port ${port}: Connection refused\n${sysNote(`${h} üzerinde sshd 22'de dinliyor. Port'u -p ile verirsin ama doğru port'u bilmen gerekir, karşı tarafta ss -tlnp`, `sshd on ${h} listens on 22. You pass the port with -p but you need to know the right port, on the other side run ss -tlnp`)}`, 255);
  if (!sysUser(this, t.user) && t.user !== 'root') return fail(`${t.user}@${t.host}: Permission denied (publickey,password).`, 255);
  const key = sysKeyAuth(this, h, t.user);
  const pw = key ? '' : `${t.user}@${t.host}'s password: \n`;
  sysRemoteLog(this, h, t.user, key ? 'publickey' : 'password');
  const cmd = rest.slice(1);
  if (!cmd.length) {
    return ok(pw + `Welcome to Ubuntu 24.04 LTS (GNU/Linux ${SYS_KERNEL} x86_64)\n\n * Documentation:  https://help.ubuntu.com\n * Management:     https://landscape.canonical.com\n\n  System information as of ${sysCtime(new Date())}\n\n  System load:  0.08              Processes:             118\n  Usage of /:   ${h === 'backup.lab' ? '61.2% of 97.87GB' : '23.4% of 38.70GB'}  Users logged in:       0\n  Memory usage: 31%               IPv4 address for eth0: ${SYS_HOSTS[h]}\n\nLast login: ${sysCtime(new Date(Date.now() - 86400000))} from 192.168.1.42\n${t.user}@${h.split('.')[0]}:~$ \n${sysNote(`Interaktif remote shell bu lab'da yok. Komutu ssh satırının sonuna ekle, ssh ${t.user === USER ? '' : t.user + '@'}${t.host} ls /var/backups`, `There is no interactive remote shell in this lab. Add the command to the end of the ssh line, ssh ${t.user === USER ? '' : t.user + '@'}${t.host} ls /var/backups`)}\n`);
  }
  const mapArgs = cmd.slice(1).map(a => (a.startsWith('-') ? a : /^[~/]/.test(a) || !['hostname', 'uptime', 'whoami', 'id', 'uname', 'df', 'free', 'date', 'w', 'ps'].includes(cmd[0]) && !a.includes('=') ? sysRemotePath(h, t.user, a) : a));
  const home = sysRemotePath(h, t.user, '');
  if (!this.node(home)) this.install(home + '/.bashrc', mkfile('# remote bashrc\n', 0o644, t.user));
  const saved = { cwd: this.cwd, root: this.isRoot, env: this.env.HOME };
  this.cwd = home; this.isRoot = t.user === 'root'; this.env.HOME = home;
  let r;
  try {
    if (cmd[0] === 'hostname') r = ok(h.split('.')[0] + (cmd.includes('-f') ? '.corp.lab' : '') + '\n');
    else if (cmd[0] === 'uptime') r = ok(` ${sysHMS(new Date())} up 41 days, 12:03,  0 users,  load average: 0.08, 0.05, 0.01\n`);
    else if (cmd[0] === 'whoami') r = ok(t.user + '\n');
    else if (cmd[0] === 'uname') r = ok(cmd.includes('-a') ? `Linux ${h.split('.')[0]} ${SYS_KERNEL} #45-Ubuntu SMP x86_64 GNU/Linux\n` : 'Linux\n');
    else if (cmd[0] === 'df') r = ok(`Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        40G   ${h === 'backup.lab' ? '9.1G   29G  24%' : '24G   15G  62%'} /\n${h === 'backup.lab' ? '/dev/sdb1       2.0T  1.2T  720G  63% /var/backups\n' : ''}`);
    else if (['ls', 'cat', 'head', 'tail', 'wc', 'tree', 'du', 'mkdir', 'rm', 'touch', 'grep', 'find', 'echo', 'pwd', 'id', 'date', 'free', 'tar', 'gzip', 'gunzip', 'zcat', 'cp', 'mv', 'chmod', 'stat', 'file', 'cut', 'sort', 'uniq', 'sed', 'awk', 'ps', 'w', 'rmdir', 'systemctl'].includes(cmd[0])) {
      if (cmd[0] === 'pwd') r = ok(t.user === 'root' ? '/root\n' : '/home/' + t.user + '\n');
      else if (cmd[0] === 'ps' || cmd[0] === 'w' || cmd[0] === 'systemctl' || cmd[0] === 'free') r = ok(cmd[0] === 'systemctl' ? `  UNIT                 LOAD   ACTIVE SUB     DESCRIPTION\n  ${h === 'web01.lab' ? 'nginx.service        loaded active running A high performance web server' : 'rsync.service        loaded active running fast remote file copy program daemon'}\n  ssh.service          loaded active running OpenBSD Secure Shell server\n` : cmd[0] === 'free' ? '               total        used        free      shared  buff/cache   available\nMem:           7.7Gi       2.4Gi       3.1Gi        12Mi       2.2Gi       5.0Gi\nSwap:          2.0Gi          0B       2.0Gi\n' : `    PID TTY          TIME CMD\n   ${4000 + Math.floor(Math.random() * 500)} ?        00:00:00 sshd\n   ${4600 + Math.floor(Math.random() * 300)} ?        00:00:00 ${cmd[0]}\n`);
      else { const fn = COMMANDS[cmd[0]] || LAB_EXT.commands[cmd[0]]; r = fn.call(this, mapArgs, null) || ok(); }
    } else r = fail(`bash: ${cmd[0]}: command not found`, 127);
  } finally { this.cwd = saved.cwd; this.isRoot = saved.root; this.env.HOME = saved.env; }
  const unmap = s => (s || '').split(SYS_REMOTE + '/' + h).join('').replace(new RegExp('/home/' + t.user + '/', 'g'), '');
  return { out: pw + unmap(r.out), err: unmap(r.err), code: r.code };
};
/* scp: kaynak ve hedef host:path olabilir, her iki yon */
function sysCopyNode(sh, src, dstAbs, rec, who, cmd) {
  const sn = sh.node(src);
  if (!sn) return `${cmd}: ${src}: No such file or directory\n`;
  if (sn.t === 'd' && !rec) return `${cmd}: ${src.split('/').pop()}: not a regular file\n`;
  const dn = sh.node(dstAbs);
  const target = dn && dn.t === 'd' ? dstAbs + '/' + src.split('/').pop() : dstAbs;
  const { dir, name } = sh.parent(target);
  if (!dir || dir.t !== 'd') return `${cmd}: ${dstAbs}: No such file or directory\n`;
  if (!sh.canWrite(dir) && !who) return `${cmd}: ${target}: Permission denied\n`;
  const clone = sysClone(sn); const set = x => { x.o = who || sh.user; x.ts = Date.now(); if (x.t === 'd') Object.values(x.c).forEach(set); }; set(clone);
  dir.c[name] = clone;
  return null;
}
SYS_CMDS.scp = function (args) {
  sysEnsure(this);
  const { flags, vals, rest } = parseOpts(args, 'Pi');
  if (rest.length < 2) return fail('usage: scp [-346ABCOpqRrsTv] [-c cipher] [-D sftp_server_path] [-F ssh_config]\n           [-i identity_file] [-J destination] [-l limit] [-o ssh_option]\n           [-P port] [-S program] [-X sftp_option] source ... target', 1);
  if (vals.P && vals.P !== '22') return fail(`ssh: connect to host ${sysParseTarget(rest.find(r => r.includes(':')) || rest[0]).host} port ${vals.P}: Connection refused\nscp: Connection closed`, 255);
  const rec = flags.has('r');
  const dst = sysParseTarget(rest[rest.length - 1]);
  const srcs = rest.slice(0, -1).map(sysParseTarget);
  const resolveSide = t => {
    if (t.path === undefined) return { local: true, abs: this.resolve(t.host) };
    const h = sysRemote(t.host);
    if (!h) return { err: `ssh: Could not resolve hostname ${t.host}: Name or service not known\nscp: Connection closed\n` };
    return { local: false, h, user: t.user, abs: sysRemotePath(h, t.user, t.path) };
  };
  const d = resolveSide(dst); if (d.err) return fail(d.err, 255);
  let out = ''; let err = '';
  for (const s of srcs) {
    const ss = resolveSide(s); if (ss.err) { err += ss.err; continue; }
    if (ss.local && d.local) { err += 'scp: ' + sysNote('iki taraf da local, cp kullan', 'both sides are local, use cp') + '\n'; continue; }
    const remote = ss.local ? d : ss;
    if (!sysUser(this, remote.user) && remote.user !== 'root') { err += `${remote.user}@${remote.h}: Permission denied (publickey,password).\nscp: Connection closed\n`; continue; }
    if (!sysKeyAuth(this, remote.h, remote.user)) out += `${remote.user}@${remote.h}'s password: \n`;
    const sn = this.node(ss.abs);
    if (!sn) { err += ss.local ? `scp: ${s.host}: No such file or directory\n` : `scp: ${s.path}: No such file or directory\n`; continue; }
    if (sn.t === 'd' && !rec) { err += `scp: ${ss.local ? s.host : s.path}: not a regular file\n`; continue; }
    if (!ss.local && remote.user !== 'root' && !this.canRead(sn) && sn.o !== remote.user) { err += `scp: ${s.path}: Permission denied\n`; continue; }
    const e = sysCopyNode(this, ss.abs, d.abs, rec, d.local ? null : d.user, 'scp');
    if (e) { err += d.local ? e.replace(d.abs, dst.host) : `scp: dest open "${dst.path}": No such file or directory\nscp: failed to upload file ${s.host} to ${dst.path}\n`; continue; }
    sysRemoteLog(this, remote.h, remote.user, sysKeyAuth(this, remote.h, remote.user) ? 'publickey' : 'password');
    const name = ss.abs.split('/').pop(); const size = sysSize(sn);
    if (!flags.has('q')) out += `${sysPad(name, 40)} 100% ${sysLpad(sysHuman(size), 5)} ${sysLpad((size / 1024 / 0.02).toFixed(1), 7)}KB/s   00:00\n`;
  }
  return { out, err, code: err ? 1 : 0 };
};
SYS_CMDS.rsync = function (args) {
  sysEnsure(this);
  const longs = args.filter(a => a.startsWith('--'));
  const { flags, rest } = parseOpts(args.filter(a => !a.startsWith('--')), 'e');
  const dry = flags.has('n') || longs.includes('--dry-run');
  const del = longs.includes('--delete');
  const verbose = flags.has('v');
  const archive = flags.has('a');
  if (rest.length < 2) return fail('rsync  version 3.2.7  protocol version 31\n\nUsage: rsync [OPTION]... SRC [SRC]... DEST\n  or   rsync [OPTION]... SRC [SRC]... [USER@]HOST:DEST\n  or   rsync [OPTION]... [USER@]HOST:SRC [DEST]\n\n -v, --verbose               increase verbosity\n -a, --archive               archive mode is -rlptgoD (no -A,-X,-U,-N,-H)\n -z, --compress              compress file data during the transfer\n -n, --dry-run               perform a trial run with no changes made\n     --delete                delete extraneous files from dest dirs\n -e, --rsh=COMMAND           specify the remote shell to use', 1);
  const dst = sysParseTarget(rest[rest.length - 1]); const src = sysParseTarget(rest[0]);
  const side = t => { if (t.path === undefined) return { local: true, abs: this.resolve(t.host) }; const h = sysRemote(t.host); if (!h) return { err: `ssh: Could not resolve hostname ${t.host}: Name or service not known\nrsync: connection unexpectedly closed (0 bytes received so far) [${t === src ? 'Receiver' : 'sender'}]\nrsync error: unexplained error (code 255) at io.c(232) [${t === src ? 'Receiver' : 'sender'}=3.2.7]\n` }; return { local: false, h, user: t.user, abs: sysRemotePath(h, t.user, t.path) }; };
  const S = side(src), D = side(dst);
  if (S.err) return fail(S.err, 255); if (D.err) return fail(D.err, 255);
  const sn = this.node(S.abs);
  if (!sn) return fail(`rsync: [sender] change_dir "${S.abs.replace(/\/[^/]*$/, '')}" failed: No such file or directory (2)\nrsync error: some files/attrs were not transferred (see previous errors) (code 23) at main.c(1338) [sender=3.2.7]`, 23);
  if (sn.t === 'd' && !flags.has('r') && !archive) return ok(`skipping directory ${src.path !== undefined ? src.path : src.host}\n`);
  const srcSpec = src.path !== undefined ? src.path : src.host;
  const contents = srcSpec.endsWith('/');
  let out = ''; let err = '';
  const remote = S.local ? D : S;
  if (!S.local || !D.local) { if (!sysUser(this, remote.user) && remote.user !== 'root') return fail(`${remote.user}@${remote.h}: Permission denied (publickey,password).\nrsync: connection unexpectedly closed\nrsync error: unexplained error (code 255)`, 255); if (!sysKeyAuth(this, remote.h, remote.user)) out += `${remote.user}@${remote.h}'s password: \n`; }
  let dstDirAbs = D.abs;
  let dn = this.node(dstDirAbs);
  if (!dn) { if (!dry) { const r = COMMANDS.mkdir.call(this, ['-p', dstDirAbs]); if (r.err) return fail(`rsync: [Receiver] mkdir "${dst.path !== undefined ? dst.path : dst.host}" failed: ${r.err.split(': ').pop().trim()} (13)\nrsync error: error in file IO (code 11) at main.c(790) [Receiver=3.2.7]`, 11); dn = this.node(dstDirAbs); } }
  const list = [];
  const base = sn.t === 'd' && !contents ? S.abs.split('/').pop() + '/' : '';
  if (sn.t === 'f') list.push({ rel: S.abs.split('/').pop(), n: sn });
  else sysWalk(this, S.abs, (p, n) => { const rel = p === S.abs ? (contents ? './' : base) : base + p.slice(S.abs.length + 1) + (n.t === 'd' ? '/' : ''); list.push({ rel, n }); });
  const targetRoot = dn && dn.t === 'd' ? dstDirAbs : dstDirAbs;
  const changed = [];
  for (const it of list) {
    const tAbs = it.rel === './' ? targetRoot : this.resolve(targetRoot + '/' + it.rel.replace(/\/$/, ''));
    const ex = this.node(tAbs);
    const same = ex && it.n.t === 'f' && ex.t === 'f' && ex.d === it.n.d;
    if (!same || it.rel === './' || (it.n.t === 'd' && !ex)) changed.push(it);
    if (dry) continue;
    if (it.n.t === 'd') { if (!ex) { const { dir, name } = this.parent(tAbs); if (dir) dir.c[name] = mkdir({}, it.n.m, D.local ? this.user : D.user); } continue; }
    const { dir, name } = this.parent(tAbs);
    if (!dir) { err += `rsync: [receiver] mkstemp "${tAbs}" failed: No such file or directory (2)\n`; continue; }
    if (D.local && !this.canWrite(dir)) { err += `rsync: [receiver] mkstemp "${tAbs}" failed: Permission denied (13)\n`; continue; }
    const c = sysClone(it.n); c.o = D.local ? this.user : D.user; if (!archive) c.ts = Date.now();
    dir.c[name] = c;
  }
  const deleted = [];
  if (del && dn && dn.t === 'd' && sn.t === 'd') {
    const root = contents ? targetRoot : this.resolve(targetRoot + '/' + base.replace(/\/$/, ''));
    const keep = new Set(list.map(it => (it.rel === './' ? root : this.resolve(targetRoot + '/' + it.rel.replace(/\/$/, '')))));
    const extra = []; sysWalk(this, root, (p, n) => { if (!keep.has(p)) extra.push({ p, n }); });
    extra.forEach(({ p, n }) => { deleted.push((contents ? '' : base) + p.slice(root.length + 1) + (n.t === 'd' ? '/' : '')); if (!dry) sysDel(this, p); });
  }
  const total = list.reduce((s, it) => s + (it.n.t === 'f' ? it.n.d.length : 0), 0);
  const sent = changed.reduce((s, it) => s + (it.n.t === 'f' ? it.n.d.length : 0), 0) + 60 + list.length * 20;
  if (verbose) {
    out += (S.local && !D.local ? 'sending incremental file list\n' : !S.local ? 'receiving incremental file list\n' : 'sending incremental file list\n');
    deleted.forEach(d => { out += `deleting ${d}\n`; });
    changed.forEach(it => { out += it.rel + '\n'; });
    out += `\nsent ${sysNum(sent)} bytes  received ${sysNum(35 + changed.length * 12)} bytes  ${sysNum(((sent + 35) * 2).toFixed(2))} bytes/sec\ntotal size is ${sysNum(total)}  speedup is ${(total / Math.max(1, sent + 35)).toFixed(2)}${dry ? ' (DRY RUN)' : ''}\n`;
  } else if (dry) out += sysNote('-n dry run bitti, hiçbir şey kopyalanmadı. Listeyi görmek için -v ekle', 'The -n dry run finished, nothing was copied. Add -v to see the list') + '\n';
  if (del && !deleted.length && verbose && !dry && dn) { /* sessiz */ }
  if (!S.local || !D.local) sysRemoteLog(this, remote.h, remote.user, sysKeyAuth(this, remote.h, remote.user) ? 'publickey' : 'password');
  return { out, err, code: err ? 23 : 0 };
};
SYS_CMDS.sftp = function (args) {
  sysEnsure(this);
  const { vals, rest } = parseOpts(args, 'Pbi');
  if (!rest.length) return fail('usage: sftp [-46AaCfNpqrv] [-B buffer_size] [-b batchfile] [-c cipher]\n          [-D sftp_server_command] [-F ssh_config] [-i identity_file]\n          [-J destination] [-l limit] [-o ssh_option] [-P port]\n          [-R num_requests] [-S program] [-s subsystem | sftp_server]\n          [-X sftp_option] destination', 1);
  const t = sysParseTarget(rest[0]);
  const h = sysRemote(t.host);
  if (!h) return fail(`ssh: Could not resolve hostname ${t.host}: Name or service not known\nConnection closed.  \nConnection closed`, 255);
  if (vals.P && vals.P !== '22') return fail(`ssh: connect to host ${t.host} port ${vals.P}: Connection refused\nConnection closed.  \nConnection closed`, 255);
  const key = sysKeyAuth(this, h, t.user);
  let out = key ? '' : `${t.user}@${t.host}'s password: \n`;
  const home = sysRemotePath(h, t.user, '');
  const doGet = (remote, local) => { const abs = sysRemotePath(h, t.user, remote); const n = this.node(abs); if (!n) return `File "${remote.startsWith('/') ? remote : '/home/' + t.user + '/' + remote}" not found.\n`; const e = sysCopyNode(this, abs, this.resolve(local || abs.split('/').pop()), n.t === 'd', null, 'sftp'); if (e) return e; out += `Fetching ${abs.slice((SYS_REMOTE + '/' + h).length)} to ${local || abs.split('/').pop()}\n${sysPad(abs.split('/').pop(), 40)} 100% ${sysLpad(sysHuman(sysSize(n)), 5)} ${sysLpad((sysSize(n) / 20).toFixed(1), 7)}KB/s   00:00\n`; return null; };
  const doPut = (local, remote) => { const abs = this.resolve(local); const n = this.node(abs); if (!n) return `stat ${local}: No such file or directory\n`; const e = sysCopyNode(this, abs, sysRemotePath(h, t.user, remote || ''), n.t === 'd', t.user, 'sftp'); if (e) return e; out += `Uploading ${local} to ${remote ? (remote.startsWith('/') ? remote : '/home/' + t.user + '/' + remote) : '/home/' + t.user + '/' + abs.split('/').pop()}\n${sysPad(abs.split('/').pop(), 40)} 100% ${sysLpad(sysHuman(sysSize(n)), 5)} ${sysLpad((sysSize(n) / 20).toFixed(1), 7)}KB/s   00:00\n`; return null; };
  sysRemoteLog(this, h, t.user, key ? 'publickey' : 'password');
  let err = '';
  if (vals.b) {
    const r = this.readFile(vals.b, 'sftp'); if (r.err) return fail(r.err, 1);
    out += `Connected to ${t.host}.\n`;
    for (const l of lines(r.data)) { const p = l.trim().split(/\s+/); if (!p[0] || p[0].startsWith('#')) continue; out += `sftp> ${l.trim()}\n`; if (p[0] === 'get') err += doGet(p[1], p[2]) || ''; else if (p[0] === 'put') err += doPut(p[1], p[2]) || ''; else if (p[0] === 'ls') out += (this.node(home) ? Object.keys(this.node(home).c).sort().join('  ') : '') + '\n'; else if (p[0] === 'pwd') out += `Remote working directory: /home/${t.user}\n`; else if (p[0] === 'quit' || p[0] === 'bye' || p[0] === 'exit') break; else err += `Invalid command.\n`; }
    return { out, err, code: err ? 1 : 0 };
  }
  if (t.path !== undefined && t.path !== '') {
    const p = t.path.split(/\s+/);
    if (p[0] === 'get' || p[0] === 'put') {
      const file = p[1] || rest[1];
      out += `Connected to ${t.host}.\n` + sysNote(`${p[0]} bir sftp oturum komutudur, gerçekte sftp> promptunda yazılır. Tek satırda indirmek için sftp ${t.user}@${t.host}:${file || 'dosya'}, yüklemek için scp ${file || 'dosya'} ${t.user}@${t.host}:`, `${p[0]} is an sftp session command, normally typed at the sftp> prompt. To download in one line use sftp ${t.user}@${t.host}:${file || 'file'}, to upload use scp ${file || 'file'} ${t.user}@${t.host}:`) + '\n';
      if (!file) return fail(out, 1);
      const e = p[0] === 'get' ? doGet(file, rest[2]) : doPut(file, p[2]);
      return e ? { out, err: e, code: 1 } : ok(out);
    }
    out += `Connected to ${t.host}.\n`;
    const e = doGet(t.path, rest[1]);
    return e ? { out, err: e, code: 1 } : ok(out);
  }
  return ok(out + `Connected to ${t.host}.\nsftp> \n${sysNote(`Interaktif sftp oturumu bu lab'da yok. sftp> promptunda get dosya indirir, put dosya yükler, ls ve cd gezer, quit çıkar. Lab'da tek satır: sftp ${t.user}@${t.host}:uzak/dosya ya da sftp -b batch.txt ${t.user}@${t.host}`, `There is no interactive sftp session in this lab. At the sftp> prompt get downloads a file, put uploads a file, ls and cd browse, quit leaves. In the lab use one line, sftp ${t.user}@${t.host}:remote/file or sftp -b batch.txt ${t.user}@${t.host}`)}\n`);
};
['get', 'put', 'mget', 'mput', 'quit', 'bye', 'lcd', 'lls'].forEach(c => {
  SYS_CMDS[c] = function () { return fail(`${c}: command not found\n${sysNote(`${c} bir Linux komutu değil, sftp ve ftp oturumunun içinde çalışan bir komut. Önce sftp user@host, sonra sftp> promptunda ${c}. Lab'da tek satırlık karşılığı ${c === 'get' || c === 'mget' ? 'scp user@host:dosya .' : c === 'put' || c === 'mput' ? 'scp dosya user@host:' : c === 'quit' || c === 'bye' ? 'exit, bash için de aynı' : 'cd ya da ls'}`, `${c} is not a Linux command, it runs inside an sftp or ftp session. First sftp user@host, then ${c} at the sftp> prompt. The one line equivalent in the lab is ${c === 'get' || c === 'mget' ? 'scp user@host:file .' : c === 'put' || c === 'mput' ? 'scp file user@host:' : c === 'quit' || c === 'bye' ? 'exit, same as for bash' : 'cd or ls'}`)}`, 127); };
});
SYS_CMDS['ssh-keygen'] = function (args) {
  sysEnsure(this);
  const { flags, vals, rest } = parseOpts(args, 'tfCNbE');
  const type = (vals.t || 'rsa').toLowerCase();
  if (!['rsa', 'ed25519', 'ecdsa', 'dsa'].includes(type)) return fail(`unknown key type ${type}`, 255);
  const file = this.resolve(vals.f || HOME + '/.ssh/id_' + type);
  if (flags.has('l')) { const n = this.node(file) || this.node(file + '.pub'); if (!n) return fail(`${vals.f || file}: No such file or directory`, 255); const pub = n.d.startsWith('ssh-') ? n.d : (this.node(file + '.pub') || { d: '' }).d; return ok(`256 SHA256:${sysB64(pub, 43)} ${(pub.trim().split(' ')[2] || USER + '@' + HOSTNAME)} (${type.toUpperCase()})\n`); }
  if (flags.has('y')) { const n = this.node(file + '.pub'); if (!n) return fail(`Load key "${vals.f || file}": No such file or directory`, 255); return ok(n.d); }
  if (type === 'dsa') return fail('ssh-keygen: DSA keys are not allowed in OpenSSH 9.x\n' + sysNote('dsa 2015\'ten beri kapalı, ed25519 kullan', 'dsa has been disabled since 2015, use ed25519'), 255);
  const comment = vals.C || USER + '@' + HOSTNAME;
  const bits = type === 'ed25519' ? 256 : +(vals.b || (type === 'rsa' ? 3072 : 256));
  const { dir, name } = this.parent(file);
  if (!dir) { return fail(`Saving key "${file}" failed: No such file or directory`, 1); }
  if (this.node(file)) return fail(`${file} already exists.\nOverwrite (y/n)? \n${sysNote('Gerçek ssh-keygen sorar, lab prompt açamaz. Üstüne yazmak için önce rm, ya da -f ile başka bir dosya adı ver', 'Real ssh-keygen asks, the lab cannot open a prompt. To overwrite run rm first, or give another file name with -f')}`, 1);
  if (!this.canWrite(dir)) return fail(`Saving key "${file}" failed: Permission denied`, 1);
  const seed = file + comment + Date.now();
  const pub = `${type === 'ed25519' ? 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI' + sysB64(seed, 43) : type === 'rsa' ? 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQ' + sysB64(seed, 540) : 'ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABB' + sysB64(seed, 88)} ${comment}\n`;
  const priv = `-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\n${sysB64(seed + 'priv', 70)}\n${sysB64(seed + 'priv2', 70)}\n${sysB64(seed + 'priv3', 38)}=\n-----END OPENSSH PRIVATE KEY-----\n`;
  dir.c[name] = mkfile(priv, 0o600, this.user);
  dir.c[name + '.pub'] = mkfile(pub, 0o644, this.user);
  if (dir.o === this.user && name.startsWith('id_')) dir.m = 0o700;
  const fp = sysB64(pub, 43);
  const art = ['+--[' + (type === 'ed25519' ? 'ED25519 256' : type.toUpperCase() + ' ' + bits) + ']--+', '|      o+o.       |', '|     . =.o .     |', '|      + * o .    |', '|     o B = o     |', '|    . + S = .    |', '|     . = * +     |', '|      o B.=      |', '|       o=E=      |', '|       .o+=o     |', '+----[SHA256]-----+'];
  if (flags.has('q')) return ok();
  return ok(`Generating public/private ${type} key pair.\n${vals.f ? '' : `Enter file in which to save the key (${file}): \n`}${vals.N !== undefined ? '' : 'Enter passphrase (empty for no passphrase): \nEnter same passphrase again: \n'}Your identification has been saved in ${file}\nYour public key has been saved in ${file}.pub\nThe key fingerprint is:\nSHA256:${fp} ${comment}\nThe key's randomart image is:\n${art.join('\n')}\n${vals.N === undefined ? sysNote('Lab prompt açamaz, passphrase boş kabul edildi. Script içinde ssh-keygen -t ed25519 -N "" -f dosya', 'The lab cannot open a prompt, an empty passphrase was accepted. In a script use ssh-keygen -t ed25519 -N "" -f file') + '\n' : ''}`);
};
SYS_CMDS['ssh-copy-id'] = function (args) {
  sysEnsure(this);
  const { vals, rest } = parseOpts(args, 'ip');
  if (!rest.length) return fail('Usage: /usr/bin/ssh-copy-id [-h|-?|-f|-n|-s|-x] [-i [identity_file]] [-p port] [-F alternative ssh_config file] [-t target_path] [[-o <ssh -o options>] ...] [user@]hostname', 1);
  const t = sysParseTarget(rest[0]);
  const h = sysRemote(t.host);
  if (!h) return fail(`/usr/bin/ssh-copy-id: ERROR: ssh: Could not resolve hostname ${t.host}: Name or service not known\n`, 1);
  const keyFile = vals.i ? this.resolve(vals.i.endsWith('.pub') ? vals.i : vals.i + '.pub') : [HOME + '/.ssh/id_ed25519.pub', HOME + '/.ssh/id_rsa.pub', HOME + '/.ssh/id_ecdsa.pub'].find(p => this.node(p));
  const pub = keyFile && this.node(keyFile);
  if (!pub) return fail(`/usr/bin/ssh-copy-id: ERROR: No identities found\n${sysNote('Önce bir anahtar üret, ssh-keygen -t ed25519', 'Generate a key first, ssh-keygen -t ed25519')}`, 1);
  if (!sysUser(this, t.user) && t.user !== 'root') return fail(`/usr/bin/ssh-copy-id: ERROR: ${t.user}@${t.host}: Permission denied (publickey,password).`, 1);
  const akPath = sysRemotePath(h, t.user, '.ssh/authorized_keys');
  const ak = this.node(akPath);
  const key = pub.d.trim();
  if (ak && ak.d.includes(key.split(' ').slice(0, 2).join(' '))) return ok(`/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "${keyFile}"\n/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed\n\n/usr/bin/ssh-copy-id: WARNING: All keys were skipped because they already exist on the remote system.\n\t\t(if you think this is a mistake, you may want to use -f option)\n\n`);
  if (ak) ak.d += key + '\n'; else { this.install(akPath, mkfile(key + '\n', 0o600, t.user)); const d = this.node(sysRemotePath(h, t.user, '.ssh')); if (d) { d.m = 0o700; d.o = t.user; } }
  sysRemoteLog(this, h, t.user, 'password');
  return ok(`/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "${keyFile}"\n/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed\n/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys\n${t.user}@${t.host}'s password: \n\nNumber of key(s) added: 1\n\nNow try logging into the machine, with:   "ssh '${t.user}@${t.host}'"\nand check to make sure that only the key(s) you wanted were added.\n\n`);
};
SYS_CMDS['ssh-add'] = function (args) { if (args.includes('-l')) { const pub = this.node(HOME + '/.ssh/id_ed25519.pub'); return pub ? ok(`256 SHA256:${sysB64(pub.d, 43)} ${pub.d.trim().split(' ')[2] || ''} (ED25519)\n`) : ok('The agent has no identities.\n'); } return this.node(HOME + '/.ssh/id_ed25519') ? ok('Identity added: /home/burak/.ssh/id_ed25519 (burak@linuxlab)\n') : fail('Could not open a connection to your authentication agent.\n' + sysNote('eval "$(ssh-agent -s)" ile agent başlatılır, lab\'da agent simüle edilmiyor', 'The agent is started with eval "$(ssh-agent -s)", the agent is not simulated in the lab')); };

/* ======================================================================
   8. Disk
   ====================================================================== */
const SYS_FS = [
  { fs: '/dev/sda1', type: 'ext4', size: 41152384, used: 32456704, mp: '/', ino: [2621440, 412033], dev: 'sda1' },
  { fs: 'tmpfs', type: 'tmpfs', size: 2014168, used: 0, mp: '/dev/shm', ino: [503542, 1] },
  { fs: 'tmpfs', type: 'tmpfs', size: 402836, used: 1128, mp: '/run', ino: [503542, 820] },
  { fs: '/dev/sda15', type: 'vfat', size: 106858, used: 6186, mp: '/boot/efi', ino: [0, 0] },
  { fs: '/dev/sdb1', type: 'ext4', size: 102686784, used: 12582912, mp: '/data', ino: [6553600, 18231], dev: 'sdb1' },
];
const SYS_MOUNTABLE = { '/dev/sdc1': { type: 'vfat', size: 31457280, used: 614400, files: { 'backup-2026-10-01.tar.gz': sysPack('gz', { n: 'backup-2026-10-01.tar', d: sysPack('tar', { members: [{ p: 'etc/', t: 'd', m: 0o755, o: 'root', d: '' }, { p: 'etc/hostname', t: 'f', m: 0o644, o: 'root', d: 'linuxlab\n' }, { p: 'etc/hosts', t: 'f', m: 0o644, o: 'root', d: '127.0.0.1 localhost\n' }] }) }), 'README.txt': 'USB disk, haftalik yedek. Mount: sudo mount /dev/sdc1 /mnt\n' } } };
function sysMountTable(sh) { sysEnsure(sh); return lines(sysRead(sh, SYS_MOUNTS)).map(l => { const p = l.split(' '); return { fs: p[0], mp: p[1], type: p[2], opts: p[3] }; }); }
function sysDfRows(sh) {
  const extra = sysMountTable(sh).filter(m => SYS_MOUNTABLE[m.fs]).map(m => ({ fs: m.fs, type: m.type, size: SYS_MOUNTABLE[m.fs].size, used: SYS_MOUNTABLE[m.fs].used, mp: m.mp, ino: [0, 0] }));
  return SYS_FS.concat(extra);
}
function sysMountFor(sh, abs) { const rows = sysDfRows(sh); let best = rows[0]; for (const r of rows) if ((abs === r.mp || abs.startsWith(r.mp === '/' ? '/' : r.mp + '/')) && r.mp.length >= best.mp.length) best = r; return best; }
SYS_CMDS.df = function (args) {
  const { flags, rest } = parseOpts(args, 't');
  let rows = sysDfRows(this);
  if (flags.has('a')) rows = [{ fs: 'sysfs', type: 'sysfs', size: 0, used: 0, mp: '/sys', ino: [0, 0] }, { fs: 'proc', type: 'proc', size: 0, used: 0, mp: '/proc', ino: [0, 0] }].concat(rows);
  if (rest.length) { const picked = []; for (const r of rest) { const n = this.node(this.resolve(r)); if (!n) return fail(`df: ${r}: No such file or directory`); const m = sysMountFor(this, this.resolve(r)); if (!picked.includes(m)) picked.push(m); } rows = picked; }
  if (flags.has('x')) rows = rows.filter(r => r.type !== args[args.indexOf('-x') + 1]);
  const h = flags.has('h') || flags.has('H');
  const H = n => (h ? sysHuman(n * 1024).replace(/\.0([KMG])/, '$1') : String(n));
  const showT = flags.has('T');
  if (flags.has('i')) {
    const out = [`Filesystem     ${showT ? 'Type     ' : ''} Inodes IUsed  IFree IUse% Mounted on`];
    rows.forEach(r => { const tot = r.ino[0], used = r.ino[1]; out.push(`${sysPad(r.fs, 15)}${showT ? sysPad(r.type, 9) : ''}${sysLpad(tot ? (h ? sysHuman(tot) : tot) : 0, 7)} ${sysLpad(tot ? (h ? sysHuman(used) : used) : 0, 5)} ${sysLpad(tot ? (h ? sysHuman(tot - used) : tot - used) : 0, 6)} ${sysLpad(tot ? Math.ceil(used / tot * 100) + '%' : '-', 4)} ${r.mp}`); });
    return ok(join(out));
  }
  const out = [`Filesystem     ${showT ? 'Type     ' : ''}${h ? ' Size  Used Avail' : '1K-blocks     Used Available'} Use% Mounted on`];
  rows.forEach(r => { const avail = r.size - r.used; out.push(`${sysPad(r.fs, 15)}${showT ? sysPad(r.type, 9) : ''}${h ? `${sysLpad(H(r.size), 5)} ${sysLpad(H(r.used), 5)} ${sysLpad(H(avail), 5)}` : `${sysLpad(r.size, 9)} ${sysLpad(r.used, 8)} ${sysLpad(avail, 9)}`} ${sysLpad(r.size ? Math.ceil(r.used / r.size * 100) + '%' : '-', 4)} ${r.mp}`); });
  return ok(join(out));
};
SYS_CMDS.du = function (args) {
  const longs = args.filter(a => a.startsWith('--'));
  const { flags, rest } = parseOpts(args.filter(a => !a.startsWith('--')), 'd');
  let depth = Infinity;
  const md = longs.find(l => l.startsWith('--max-depth='));
  if (md) depth = +md.split('=')[1];
  const dIdx = args.indexOf('-d'); if (dIdx >= 0 && args[dIdx + 1] !== undefined) depth = +args[dIdx + 1];
  if (flags.has('s') || longs.includes('--summarize')) depth = 0;
  const all = flags.has('a') || longs.includes('--all');
  const human = flags.has('h') || longs.includes('--human-readable');
  const fmt = n => (human ? sysHuman(n) : String(Math.ceil(n / 1024)));
  const targets = rest.length ? rest : ['.'];
  const out = []; let err = ''; let grand = 0;
  for (const t of targets) {
    const abs = this.resolve(t); const n = this.node(abs);
    if (!n) { err += `du: cannot access '${t}': No such file or directory\n`; continue; }
    const rows = [];
    const walk = (p, node, disp, d) => {
      if (node.t === 'd' && !this.canRead(node)) { err += `du: cannot read directory '${disp}': Permission denied\n`; return 4096; }
      let size = node.t === 'f' ? node.d.length : 4096;
      if (node.t === 'd') for (const c of Object.keys(node.c).sort()) size += walk(p + (p.endsWith('/') ? '' : '/') + c, node.c[c], (disp.endsWith('/') ? disp : disp + '/') + c, d + 1);
      if (d <= depth && (node.t === 'd' || all || d === 0)) rows.push([size, disp]);
      return size;
    };
    grand += walk(abs, n, t, 0);
    rows.forEach(r => out.push(`${fmt(r[0])}\t${r[1]}`));
  }
  if (flags.has('c') || longs.includes('--total')) out.push(`${fmt(grand)}\ttotal`);
  return { out: join(out), err, code: err ? 1 : 0 };
};
SYS_CMDS.fdisk = function (args) {
  const { flags, rest } = parseOpts(args);
  if (!flags.has('l')) { if (!rest[0]) return fail('\nUsage:\n fdisk [options] <disk>         change partition table\n fdisk [options] -l [<disk>...] list partition table(s)\n\nDisplay or manipulate a disk partition table.\n\nOptions:\n -l, --list                    display partitions and exit\n -x, --list-details            like --list but with more details', 1); if (!sysDevOk(rest[0])) return fail(`fdisk: cannot open ${rest[0]}: No such file or directory`, 1); if (!this.isRoot) return fail(`fdisk: cannot open ${rest[0]}: Permission denied`, 1); return fail(`\nWelcome to fdisk (util-linux 2.39.3).\nChanges will remain in memory only, until you decide to write them.\nBe careful before using the write command.\n\nCommand (m for help): \n${sysNote('Interaktif bölümleme bu lab\'da yok. Gerçekte p listeler, n yeni bölüm, d siler, w yazar, q kaydetmeden çıkar. Tabloyu görmek için sudo fdisk -l', 'There is no interactive partitioning in this lab. Normally p lists, n adds a partition, d deletes, w writes, q quits without saving. To see the table run sudo fdisk -l')}`, 1); }
  if (!this.isRoot) return fail('fdisk: cannot open /dev/sda: Permission denied\n' + sysNote('Bölüm tablosu ham diskten okunur, sudo fdisk -l', 'The partition table is read from the raw disk, sudo fdisk -l'), 1);
  const want = rest.length ? rest : ['/dev/sda', '/dev/sdb', '/dev/sdc'];
  const out = [];
  for (const d of want) {
    if (!sysDevOk(d)) { out.push(`fdisk: cannot open ${d}: No such file or directory`); continue; }
    const base = d.replace(/\d+$/, '');
    const disk = SYS_BLK.find(b => '/dev/' + b.n === base);
    if (!disk) { out.push(`fdisk: cannot open ${d}: No such file or directory`); continue; }
    const gb = parseInt(disk.sz, 10); const sectors = gb * 2097152;
    out.push(`Disk ${base}: ${gb} GiB, ${sectors * 512} bytes, ${sectors} sectors`, `Disk model: ${disk.n === 'sdc' ? 'Ultra Fit       ' : 'QEMU HARDDISK   '}`, 'Units: sectors of 1 * 512 = 512 bytes', 'Sector size (logical/physical): 512 bytes / 512 bytes', 'I/O size (minimum/optimal): 512 bytes / 512 bytes', `Disklabel type: ${disk.n === 'sda' ? 'gpt' : 'dos'}`, `Disk identifier: ${disk.n === 'sda' ? '9A1B2C3D-4E5F-4A6B-8C7D-0E1F2A3B4C5D' : '0x' + sysHash(disk.n, 8)}`, '');
    if (disk.n === 'sda') out.push('Device       Start      End  Sectors  Size Type', '/dev/sda1   227328 83886046 83658719 39.9G Linux filesystem', '/dev/sda15    2048   227327   225280  110M EFI System', '', 'Partition table entries are not in disk order.');
    else out.push('Device     Boot Start       End   Sectors  Size Id Type', `/dev/${disk.n}1        2048 ${sectors - 1} ${sectors - 2048} ${sysLpad(disk.sz, 5)} ${disk.n === 'sdc' ? ' c W95 FAT32 (LBA)' : '83 Linux'}`);
    out.push('', '');
  }
  return ok(join(out).replace(/\n+$/, '\n'));
};
SYS_CMDS.findmnt = function (args) {
  const { flags, vals, rest } = parseOpts(args, 'to');
  let rows = sysMountTable(this);
  if (vals.t) rows = rows.filter(r => vals.t.split(',').includes(r.type));
  if (rest[0]) { const target = this.resolve(rest[0]); const r = rows.find(x => x.mp === target) || rows.find(x => x.fs === rest[0]); if (!r) return { out: '', err: '', code: 1 }; return ok(`TARGET${' '.repeat(Math.max(1, r.mp.length - 1))} SOURCE     FSTYPE OPTIONS\n${sysPad(r.mp, Math.max(6, r.mp.length))} ${sysPad(r.fs, 10)} ${sysPad(r.type, 6)} ${r.opts}\n`); }
  if (flags.has('l') || vals.t) { const out = ['TARGET      SOURCE     FSTYPE   OPTIONS']; rows.forEach(r => out.push(`${sysPad(r.mp, 11)} ${sysPad(r.fs, 10)} ${sysPad(r.type, 8)} ${r.opts}`)); return ok(join(out)); }
  const out = ['TARGET                       SOURCE      FSTYPE     OPTIONS'];
  const root = rows.find(r => r.mp === '/');
  if (root) out.push(`${sysPad('/', 28)} ${sysPad(root.fs, 11)} ${sysPad(root.type, 10)} ${root.opts}`);
  const others = rows.filter(r => r.mp !== '/');
  others.forEach((r, i) => out.push(`${sysPad((i === others.length - 1 ? '└─' : '├─') + r.mp, 28)} ${sysPad(r.fs, 11)} ${sysPad(r.type, 10)} ${r.opts}`));
  return ok(join(out));
};
SYS_CMDS.mount = function (args) {
  sysEnsure(this);
  const { flags, vals, rest } = parseOpts(args, 'to');
  const table = sysMountTable(this);
  if (!rest.length) return ok(join(table.map(r => `${r.fs} on ${r.mp} type ${r.type} (${r.opts})`)));
  if (!this.isRoot) return fail('mount: only root can do that\n' + sysNote('Mount sistem geneli bir işlem, sudo mount', 'Mount is a system wide operation, sudo mount'), 1);
  if (flags.has('a')) return ok();
  if (rest.length === 1) { const t = this.resolve(rest[0]); if (table.some(r => r.mp === t)) return ok(); const fst = lines(sysRead(this, '/etc/fstab')).find(l => l.split(/\s+/)[1] === t); if (!fst) return fail(`mount: ${rest[0]}: can't find in /etc/fstab.`, 1); return ok(); }
  const [dev, mpRaw] = rest; const mp = this.resolve(mpRaw);
  const spec = SYS_MOUNTABLE[dev];
  if (!spec) { if (sysDevOk(dev)) { const al = table.find(r => r.fs === dev); return al ? fail(`mount: ${mp}: ${dev} already mounted on ${al.mp}.`, 32) : fail(`mount: ${mp}: wrong fs type, bad option, bad superblock on ${dev}, missing codepage or helper program, or other error.`, 32); } return fail(`mount: ${mp}: special device ${dev} does not exist.`, 32); }
  const mpNode = this.node(mp);
  if (!mpNode) return fail(`mount: ${mp}: mount point does not exist.`, 32);
  if (mpNode.t !== 'd') return fail(`mount: ${mp}: mount point is not a directory.`, 32);
  const al = table.find(r => r.fs === dev);
  if (al) return fail(`mount: ${mp}: ${dev} already mounted on ${al.mp}.`, 32);
  if (table.some(r => r.mp === mp)) return fail(`mount: ${mp}: ${table.find(r => r.mp === mp).fs} already mounted on ${mp}.`, 32);
  if (vals.t && vals.t !== spec.type && vals.t !== 'auto') return fail(`mount: ${mp}: wrong fs type, bad option, bad superblock on ${dev}, missing codepage or helper program, or other error.\n       dmesg(1) may have more information after failed mount system call.`, 32);
  const ro = (vals.o || '').split(',').includes('ro');
  mpNode.c = {}; Object.keys(spec.files).forEach(f => { mpNode.c[f] = mkfile(spec.files[f], ro ? 0o444 : 0o644, 'root'); });
  sysRootWrite(this, SYS_MOUNTS, sysRead(this, SYS_MOUNTS) + `${dev} ${mp} ${spec.type} ${ro ? 'ro' : 'rw'},relatime,fmask=0022,dmask=0022,codepage=437,iocharset=iso8859-1,shortname=mixed,errors=remount-ro 0 0\n`);
  return ok(Object.keys(spec.files).length ? '' : '');
};
SYS_CMDS.umount = function (args) {
  sysEnsure(this);
  const { rest } = parseOpts(args, 't');
  if (!rest.length) return fail('umount: bad usage\nTry \'umount --help\' for more information.', 1);
  if (!this.isRoot) return fail('umount: only root can do that', 1);
  const table = sysMountTable(this);
  const t = rest[0].startsWith('/dev/') ? rest[0] : this.resolve(rest[0]);
  const r = table.find(x => x.mp === t || x.fs === t);
  if (!r) return fail(`umount: ${rest[0]}: not mounted.`, 32);
  if (r.mp === '/' || r.mp === '/data' || r.mp === '/boot/efi' || !SYS_MOUNTABLE[r.fs]) return fail(`umount: ${r.mp}: target is busy.`, 32);
  if (this.cwd === r.mp || this.cwd.startsWith(r.mp + '/')) return fail(`umount: ${r.mp}: target is busy.\n${sysNote('Mount noktasının içindesin, önce cd ile dışarı çık. Kim kullanıyor görmek için lsof ' + r.mp, 'You are inside the mount point, cd out of it first. To see who is using it run lsof ' + r.mp)}`, 32);
  const n = this.node(r.mp); if (n) n.c = {};
  sysRootWrite(this, SYS_MOUNTS, join(lines(sysRead(this, SYS_MOUNTS)).filter(l => l.split(' ')[1] !== r.mp)));
  return ok();
};
SYS_CMDS.blkid = function (args) {
  const { rest } = parseOpts(args, 'so');
  if (!this.isRoot) return rest.length ? ok() : ok(sysNote('blkid root olmadan sadece cache\'i gösterir, burada boş. sudo blkid', 'Without root blkid only shows its cache, which is empty here. sudo blkid') + '\n');
  const out = [];
  SYS_BLK.forEach(d => d.parts.forEach(p => { if (!rest.length || rest.includes('/dev/' + p.n)) out.push(`/dev/${p.n}: ${p.label ? 'LABEL="' + p.label + '" ' : ''}UUID="${p.uuid}" BLOCK_SIZE="${p.fs === 'vfat' ? '512' : '4096'}" TYPE="${p.fs}" PARTUUID="${sysHash(p.n, 8)}-0${p.n.replace(/\D/g, '').padStart(1, '0')}"`); }));
  return ok(join(out));
};
SYS_CMDS.lsof = function (args) {
  sysEnsure(this);
  const { flags, vals, rest } = parseOpts(args, 'pui');
  const iVal = vals.i !== undefined ? vals.i : null;
  const net = [
    { cmd: 'sshd', pid: 412, user: 'root', fd: '3u', node: 'TCP', name: '*:2222 (LISTEN)' },
    { cmd: 'sshd', pid: 2100, user: 'root', fd: '4u', node: 'TCP', name: '192.168.1.42:2222->192.168.1.10:51000 (ESTABLISHED)' },
    { cmd: 'python3', pid: 1024, user: 'burak', fd: '3u', node: 'TCP', name: '*:8000 (LISTEN)' },
    { cmd: 'postgres', pid: 640, user: 'postgres', fd: '5u', node: 'TCP', name: 'localhost:5432 (LISTEN)' },
    { cmd: 'systemd-r', pid: 588, user: 'systemd-resolve', fd: '12u', node: 'UDP', name: '127.0.0.53:53' },
    { cmd: 'charon', pid: 1210, user: 'root', fd: '9u', node: 'UDP', name: '*:500' },
    { cmd: 'dockerd', pid: 777, user: 'root', fd: '7u', node: 'unix', name: '/run/docker.sock' },
  ];
  if (this.services.nginx === 'active') net.push({ cmd: 'nginx', pid: 1501, user: 'www-data', fd: '6u', node: 'TCP', name: '*:80 (LISTEN)' });
  const head = 'COMMAND    PID            USER   FD   TYPE DEVICE SIZE/OFF   NODE NAME';
  const row = r => `${sysPad(r.cmd, 9)} ${sysLpad(r.pid, 5)} ${sysLpad(r.user, 15)} ${sysLpad(r.fd, 4)} ${sysPad(r.node === 'unix' ? 'unix' : 'IPv4', 4)} ${sysLpad(20000 + r.pid, 6)} ${sysLpad('0t0', 8)} ${sysLpad(r.node, 6)} ${r.name}`;
  const mine = r => this.isRoot || r.user === USER;
  let rows;
  if (iVal !== null || flags.has('i')) {
    rows = net.filter(r => r.node !== 'unix');
    if (iVal) { let m; if ((m = /^:(\d+)$/.exec(iVal))) rows = rows.filter(r => r.name.includes(':' + m[1] + ' ') || r.name.includes(':' + m[1] + '-') || r.name.endsWith(':' + m[1])); else if ((m = /^(tcp|udp)(?::(\d+))?$/i.exec(iVal))) rows = rows.filter(r => r.node.toLowerCase() === m[1].toLowerCase() && (!m[2] || r.name.includes(':' + m[2]))); else if (/^\d+$/.test(iVal)) rows = rows.filter(r => r.name.includes(':' + iVal)); }
    if (flags.has('P') || flags.has('n')) { /* zaten numerik */ }
    rows = rows.filter(mine);
    if (!rows.length) return { out: this.isRoot ? '' : sysNote('Sonuç yok. Root olmayan kullanıcı sadece kendi process\'lerini görür, sudo lsof -i', 'No results. A non root user only sees their own processes, sudo lsof -i') + '\n', err: '', code: 1 };
    return ok(head + '\n' + join(rows.map(row)));
  }
  if (vals.p) { const pid = +vals.p; const p = this.procs.find(x => x.pid === pid); if (!p) return fail(`lsof: status error on ${vals.p}: No such process\nlsof 4.95.0\n latest version: https://github.com/lsof-org/lsof`, 1); if (!this.isRoot && p.user !== USER) return { out: '', err: '', code: 1 }; const base = p.cmd.split(' ')[0].split('/').pop(); const out = [head, `${sysPad(base.slice(0, 9), 9)} ${sysLpad(pid, 5)} ${sysLpad(p.user, 15)}  cwd    DIR    8,1     4096      2 ${p.user === USER ? HOME : '/'}`, `${sysPad(base.slice(0, 9), 9)} ${sysLpad(pid, 5)} ${sysLpad(p.user, 15)}  rtd    DIR    8,1     4096      2 /`, `${sysPad(base.slice(0, 9), 9)} ${sysLpad(pid, 5)} ${sysLpad(p.user, 15)}  txt    REG    8,1   ${sysLpad(900000 + pid * 7, 7)}  ${sysLpad(130000 + pid, 6)} /usr/bin/${base}`, `${sysPad(base.slice(0, 9), 9)} ${sysLpad(pid, 5)} ${sysLpad(p.user, 15)}  mem    REG    8,1  2125328 393346 /usr/lib/x86_64-linux-gnu/libc.so.6`, `${sysPad(base.slice(0, 9), 9)} ${sysLpad(pid, 5)} ${sysLpad(p.user, 15)}    0u   CHR  136,0      0t0      3 /dev/pts/0`]; net.filter(r => r.pid === pid).forEach(r => out.push(row(r))); return ok(join(out)); }
  if (vals.u) { const u = vals.u; const procs = this.procs.filter(p => p.user === u); if (!procs.length) return fail(`lsof: can't get UID for ${u}`, 1); if (!this.isRoot && u !== USER) return { out: '', err: '', code: 1 }; const out = [head]; procs.forEach(p => { const base = p.cmd.split(' ')[0].split('/').pop(); out.push(`${sysPad(base.slice(0, 9), 9)} ${sysLpad(p.pid, 5)} ${sysLpad(p.user, 15)}  cwd    DIR    8,1     4096      2 ${u === USER ? HOME : '/'}`); net.filter(r => r.pid === p.pid).forEach(r => out.push(row(r))); }); return ok(join(out)); }
  if (rest[0]) { const abs = this.resolve(rest[0]); const n = this.node(abs); if (!n) return fail(`lsof: status error on ${rest[0]}: No such file or directory`, 1); const users = this.procs.filter(p => (abs === HOME && p.user === USER) || p.cmd.includes(abs) || (abs === '/var/log/nginx/access.log' && this.services.nginx === 'active') || (abs === '/run/docker.sock' && p.pid === 777) || (abs.startsWith('/mnt') && this.cwd.startsWith('/mnt') && p.pid === 733)); if (!users.length) return { out: '', err: '', code: 1 }; return ok(head + '\n' + join(users.map(p => `${sysPad(p.cmd.split(' ')[0].split('/').pop().slice(0, 9), 9)} ${sysLpad(p.pid, 5)} ${sysLpad(p.user, 15)}  ${n.t === 'd' ? 'cwd' : '3r'}    ${n.t === 'd' ? 'DIR' : 'REG'}    8,1 ${sysLpad(n.t === 'd' ? 4096 : n.d.length, 8)} ${sysLpad(131000 + abs.length, 6)} ${abs}`))); }
  const out = [head];
  this.procs.filter(mine).forEach(p => { const base = p.cmd.split(' ')[0].split('/').pop(); out.push(`${sysPad(base.slice(0, 9), 9)} ${sysLpad(p.pid, 5)} ${sysLpad(p.user, 15)}  cwd    DIR    8,1     4096      2 /`, `${sysPad(base.slice(0, 9), 9)} ${sysLpad(p.pid, 5)} ${sysLpad(p.user, 15)}  txt    REG    8,1   ${sysLpad(900000 + p.pid * 7, 7)}  ${sysLpad(130000 + p.pid, 6)} /usr/bin/${base}`); net.filter(r => r.pid === p.pid).forEach(r => out.push(row(r))); });
  return ok(join(out) + (this.isRoot ? '' : sysNote('Tam liste için sudo lsof, en çok kullanılan biçimler lsof -i :80, lsof -p PID, lsof -u user, lsof /mnt', 'For the full list run sudo lsof, the most common forms are lsof -i :80, lsof -p PID, lsof -u user, lsof /mnt') + '\n'));
};

/* ======================================================================
   9. Process ve job kontrolu
   ====================================================================== */
const SYS_LONG = /^(sleep|tail|watch|top|htop|yes|ping|python3|nc|ncat|socat|tcpdump|journalctl|less|more)\b/;
function sysJobs(sh) { return sh.procs.filter(p => p.jn).sort((a, b) => a.jn - b.jn); }
function sysJobMark(jobs, j) { if (!jobs.length) return ' '; if (j === jobs[jobs.length - 1]) return '+'; if (j === jobs[jobs.length - 2]) return '-'; return ' '; }
function sysJobLine(sh, j, withPid) { const jobs = sysJobs(sh); return `[${j.jn}]${sysJobMark(jobs, j)} ${withPid ? sysLpad(j.pid, 6) + ' ' : ' '}${sysPad(j.st || 'Running', 23)} ${j.cmd}${(j.st || 'Running') === 'Running' ? ' &' : ''}`; }
function sysFindJob(sh, spec) {
  const jobs = sysJobs(sh);
  if (!jobs.length) return { err: `${spec || 'current'}: no such job` };
  if (!spec || spec === '%' || spec === '%%' || spec === '%+') return { job: jobs[jobs.length - 1] };
  if (spec === '%-') return { job: jobs[jobs.length - 2] || jobs[jobs.length - 1] };
  let m;
  if ((m = /^%?(\d+)$/.exec(spec))) { const j = jobs.find(x => x.jn === +m[1]); return j ? { job: j } : { err: `${spec}: no such job` }; }
  if ((m = /^%\?(.+)$/.exec(spec))) { const j = jobs.find(x => x.cmd.includes(m[1])); return j ? { job: j } : { err: `${spec}: no such job` }; }
  if ((m = /^%(.+)$/.exec(spec))) { const j = jobs.find(x => x.cmd.startsWith(m[1])); return j ? { job: j } : { err: `${spec}: no such job` }; }
  return { err: `${spec}: no such job` };
}
function sysIsLong(cmd) {
  const c = cmd.replace(/^(sudo|nohup|nice(\s+-n\s*\S+|\s+-\d+)?|time)\s+/g, '').replace(/^(sudo|nohup|nice(\s+-n\s*\S+|\s+-\d+)?)\s+/, '');
  if (/^tail\b/.test(c) && !/\s-[fF]\b|--follow/.test(c)) return false;
  if (/^ping\b/.test(c) && /\s-c\s*\d+/.test(c)) return false;
  if (/^(journalctl|less|more)\b/.test(c) && !/\s-f\b/.test(c)) return false;
  return SYS_LONG.test(c);
}
/* cmd & icin: job kaydi, kisa komutlar hemen calisir, uzun komutlar Running kalir */
function sysBackground(sh, cmd, write) {
  const jobs = sysJobs(sh);
  const jn = jobs.length ? jobs[jobs.length - 1].jn + 1 : 1;
  const pid = sysNewPid(sh);
  let ni = 0; let m;
  if ((m = /^nice\s+(?:-n\s*)?(-?\d+)\s+/.exec(cmd))) ni = Math.max(-20, Math.min(19, +m[1]));
  let body = cmd.replace(/^nice\s+(?:-n\s*)?-?\d+\s+/, '');
  const isNohup = /^nohup\s+/.test(body);
  const user = /^sudo\s+/.test(body) ? 'root' : sh.user;
  const long = sysIsLong(body);
  const proc = { pid, user, cpu: long ? 0.0 : 0.1, mem: 0.1, cmd: body.replace(/^nohup\s+/, '').replace(/^sudo\s+/, ''), jn, ni, st: 'Running' };
  sh.procs.push(proc);
  sh.sysLastBg = pid;
  write(`[${jn}] ${pid}\n`);
  if (isNohup) {
    const e = sh.writeFile('nohup.out', '', true, 'nohup');
    write(`nohup: ignoring input and appending output to 'nohup.out'\n`, 'err');
    if (e) write(e + '\n', 'err');
    body = body.replace(/^nohup\s+/, '');
  }
  if (long) { sh.lastCode = 0; return; }
  const buf = []; const errs = [];
  const code = sh.execList(body, (t, cls) => (cls === 'err' ? errs : buf).push(t));
  if (isNohup) { sh.writeFile('nohup.out', buf.join('') + errs.join(''), true, 'nohup'); }
  else { if (buf.length) write(buf.join('')); if (errs.length) write(errs.join(''), 'err'); }
  sh.procs = sh.procs.filter(p => p !== proc);
  write(`[${jn}]+  ${code === 0 ? 'Done' : 'Exit ' + code}${' '.repeat(Math.max(1, 24 - (code === 0 ? 4 : 5 + String(code).length)))}${cmd}\n`);
  sh.lastCode = 0;
}
SYS_CMDS.jobs = function (args) {
  const { flags, rest } = parseOpts(args);
  let jobs = sysJobs(this);
  if (rest.length) { const r = sysFindJob(this, rest[0]); if (r.err) return fail('bash: jobs: ' + r.err); jobs = [r.job]; }
  if (flags.has('p')) return ok(join(jobs.map(j => String(j.pid))));
  if (flags.has('r')) jobs = jobs.filter(j => (j.st || 'Running') === 'Running');
  if (flags.has('s')) jobs = jobs.filter(j => j.st === 'Stopped');
  return ok(join(jobs.map(j => sysJobLine(this, j, flags.has('l')))));
};
SYS_CMDS.fg = function (args) {
  const r = sysFindJob(this, args[0]);
  if (r.err) return fail('bash: fg: ' + r.err);
  const j = r.job;
  this.procs = this.procs.filter(p => p !== j);
  let out = j.cmd + '\n';
  if (sysIsLong(j.cmd)) out += sysNote(`${j.cmd.split(' ')[0]} öne alındı. Gerçekte terminal bu komuta kilitlenir, Ctrl+Z ile tekrar durdurur, bg ile arkaya atar, Ctrl+C ile öldürürsün. Lab'da job bitmiş sayıldı`, `${j.cmd.split(' ')[0]} was brought to the foreground. Normally the terminal locks to this command, Ctrl+Z stops it again, bg sends it to the background, Ctrl+C kills it. In the lab the job counts as finished`) + '\n';
  else { const buf = []; const errs = []; this.execList(j.cmd, (t, cls) => (cls === 'err' ? errs : buf).push(t)); out += buf.join(''); if (errs.length) return { out, err: errs.join(''), code: 1 }; }
  return ok(out);
};
SYS_CMDS.bg = function (args) {
  const r = sysFindJob(this, args[0]);
  if (r.err) return fail('bash: bg: ' + r.err);
  const j = r.job;
  if ((j.st || 'Running') === 'Running') return fail(`bash: bg: job ${j.jn} already in background`);
  j.st = 'Running';
  return ok(`[${j.jn}]${sysJobMark(sysJobs(this), j)} ${j.cmd} &\n`);
};
SYS_CMDS.wait = function (args) {
  if (!args.length) { sysJobs(this).forEach(j => { this.procs = this.procs.filter(p => p !== j); }); return ok(); }
  let code = 0;
  for (const a of args) { const r = /^\d+$/.test(a) ? (() => { const j = this.procs.find(p => p.pid === +a && p.jn); return j ? { job: j } : { err: `pid ${a} is not a child of this shell` }; })() : sysFindJob(this, a); if (r.err) { code = 127; continue; } this.procs = this.procs.filter(p => p !== r.job); }
  return { out: '', err: code ? `bash: wait: ${args[0]}: no such job\n` : '', code };
};
SYS_CMDS.disown = function (args) { const r = sysFindJob(this, args.filter(a => !a.startsWith('-'))[0]); if (r.err) return fail('bash: disown: ' + r.err); delete r.job.jn; return ok(); };
SYS_CMDS.nohup = function (args, stdin) {
  if (!args.length) return fail("nohup: missing operand\nTry 'nohup --help' for more information.", 125);
  const cmd = args.join(' ');
  const e = this.writeFile('nohup.out', '', true, 'nohup');
  if (e) return fail(`nohup: failed to open 'nohup.out': Permission denied`, 125);
  if (sysIsLong(cmd)) return { out: '', err: `nohup: ignoring input and appending output to 'nohup.out'\n${sysNote(`${args[0]} uzun süren bir komut, gerçekte terminal buna takılı kalır. Arkaya atmak için sonuna & koy: nohup ${cmd} &`, `${args[0]} is a long running command, normally the terminal would hang on it. To send it to the background add & at the end, nohup ${cmd} &`)}\n`, code: 0 };
  const buf = []; const errs = [];
  const code = this.execList(cmd, (t, cls) => (cls === 'err' ? errs : buf).push(t));
  this.writeFile('nohup.out', buf.join('') + errs.join(''), true, 'nohup');
  return { out: '', err: `nohup: ignoring input and appending output to 'nohup.out'\n`, code };
};
const SYS_SIGS = ['HUP', 'INT', 'QUIT', 'ILL', 'TRAP', 'ABRT', 'BUS', 'FPE', 'KILL', 'USR1', 'SEGV', 'USR2', 'PIPE', 'ALRM', 'TERM', 'STKFLT', 'CHLD', 'CONT', 'STOP', 'TSTP', 'TTIN', 'TTOU', 'URG', 'XCPU', 'XFSZ', 'VTALRM', 'PROF', 'WINCH', 'IO', 'PWR', 'SYS'];
SYS_CMDS.kill = function (args) {
  if (args.includes('-l') || args.includes('-L')) return ok(SYS_SIGS.map((s, i) => `${sysLpad(i + 1, 2)}) SIG${sysPad(s, 7)}`).reduce((acc, x, i) => acc + x + ((i + 1) % 5 === 0 ? '\n' : ' '), '').trim() + '\n');
  let sig = 'TERM'; const targets = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-s' || a === '-n') { sig = (args[++i] || '').toUpperCase().replace(/^SIG/, ''); continue; }
    if (/^-\d+$/.test(a)) { sig = SYS_SIGS[+a.slice(1) - 1] || a.slice(1); continue; }
    if (/^-[A-Za-z]+$/.test(a)) { sig = a.slice(1).toUpperCase().replace(/^SIG/, ''); continue; }
    targets.push(a);
  }
  if (!targets.length) return fail('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]', 2);
  if (!SYS_SIGS.includes(sig) && !/^\d+$/.test(sig)) return fail(`bash: kill: ${sig}: invalid signal specification`, 1);
  let out = ''; let err = '';
  for (const t of targets) {
    let pid = t; let job = null;
    if (t.startsWith('%')) { const r = sysFindJob(this, t); if (r.err) { err += `bash: kill: ${r.err}\n`; continue; } job = r.job; pid = String(job.pid); }
    else job = this.procs.find(p => p.jn && String(p.pid) === t) || null;
    if (sig === 'STOP' || sig === 'TSTP') { const p = this.procs.find(x => String(x.pid) === pid); if (!p) { err += `bash: kill: (${pid}) - No such process\n`; continue; } if (!this.isRoot && p.user !== USER) { err += `bash: kill: (${pid}) - Operation not permitted\n`; continue; } p.st = 'Stopped'; if (p.jn) out += `\n[${p.jn}]+  Stopped                 ${p.cmd}\n`; continue; }
    if (sig === 'CONT') { const p = this.procs.find(x => String(x.pid) === pid); if (!p) { err += `bash: kill: (${pid}) - No such process\n`; continue; } p.st = 'Running'; continue; }
    if (sig === 'HUP' || sig === 'USR1' || sig === 'USR2' || sig === 'WINCH' || sig === '0') { const p = this.procs.find(x => String(x.pid) === pid); if (!p) { err += `bash: kill: (${pid}) - No such process\n`; continue; } if (!this.isRoot && p.user !== USER) { err += `bash: kill: (${pid}) - Operation not permitted\n`; continue; } if (sig === 'HUP' && !p.jn) out += sysNote(`SIGHUP ${p.cmd.split(' ')[0]} için çoğu daemon'da config reload demektir`, `For most daemons SIGHUP means a config reload for ${p.cmd.split(' ')[0]}`) + '\n'; continue; }
    const r = SYS_OLD.kill.call(this, [pid]);
    if (r.err) { err += r.err; continue; }
    if (job) out += `[${job.jn}]+  ${sig === 'KILL' ? 'Killed' : 'Terminated'}${' '.repeat(sig === 'KILL' ? 18 : 14)}${job.cmd}\n`;
  }
  return { out, err, code: err ? 1 : 0 };
};
SYS_CMDS.killall = function (args) {
  const { flags, rest } = parseOpts(args, 'su');
  if (!rest.length) return fail('Usage: killall [OPTION]... [--] NAME...\n       killall -l, --list\n       killall -V, --version\n\n  -e,--exact          require exact match for very long names\n  -I,--ignore-case    case insensitive process name match\n  -g,--process-group  kill process group instead of process\n  -i,--interactive    ask for confirmation before killing\n  -l,--list           list all known signal names\n  -q,--quiet          do not print complaints\n  -s,--signal SIGNAL  send this signal instead of SIGTERM\n  -u,--user USER      kill only process(es) running as USER\n  -v,--verbose        report if the signal was successfully sent', 1);
  let out = ''; let err = ''; let code = 0;
  for (const name of rest) {
    const ms = this.procs.filter(p => { const base = p.cmd.split(' ')[0].split('/').pop().replace(/^-/, ''); return flags.has('I') ? base.toLowerCase() === name.toLowerCase() : base === name; });
    if (!ms.length) { if (!flags.has('q')) err += `${name}: no process found\n`; code = 1; continue; }
    for (const p of ms) {
      if (p.pid === 1) { err += `${name}(1): Operation not permitted\n`; code = 1; continue; }
      if (p.pid === 733) { err += sysNote('kendi shell\'ini kill etmeye kalkma 🙂', 'do not try to kill your own shell 🙂') + '\n'; continue; }
      if (!this.isRoot && p.user !== USER) { err += `${name}(${p.pid}): Operation not permitted\n`; code = 1; continue; }
      this.procs = this.procs.filter(x => x !== p);
      if (flags.has('v')) out += `Killed ${name}(${p.pid}) with signal ${flags.has('9') ? 9 : 15}\n`;
      if (p.jn) out += `[${p.jn}]+  Terminated              ${p.cmd}\n`;
    }
  }
  return { out, err, code };
};
SYS_CMDS.pkill = function (args) {
  const { flags, rest } = parseOpts(args, 'u');
  const r = SYS_OLD.pkill.call(this, rest.length ? rest : args);
  if (!r.err && rest[0]) { const left = this.procs.filter(p => p.jn && p.cmd.includes(rest[0])); void left; }
  return r;
};
SYS_CMDS.ps = function (args) {
  const bare = args.filter(a => /^\d+$/.test(a));
  const oIdx = args.findIndex(a => a === '-o' || a === 'o' || a.startsWith('-o') && a.length > 2);
  const pIdx = args.findIndex(a => a === '-p' || a === 'p' || a === '--pid');
  const uIdx = args.findIndex(a => a === '-u' || a === '-U' || a === '--user');
  const cIdx = args.findIndex(a => a === '-C');
  const fmtArg = oIdx >= 0 ? (args[oIdx].length > 2 ? args[oIdx].slice(2).replace(/^=/, '') : args[oIdx + 1] || '') : null;
  if (oIdx < 0 && pIdx < 0 && uIdx < 0 && cIdx < 0 && !bare.length && !args.includes('-l') && !args.includes('-ejH') && !args.includes('axjf') && !args.includes('-eo')) {
    const r = SYS_OLD.ps.call(this, args);
    const full = args.some(a => /aux|ef|-e/.test(a));
    if (full && this.procs.some(p => p.ni)) { /* nice bilgisi aux'ta yok, -o ni ile */ }
    return r;
  }
  let list = this.procs.slice();
  if (pIdx >= 0 || bare.length) { const pids = (pIdx >= 0 ? (args[pIdx + 1] || '').split(',') : bare).map(Number); list = list.filter(p => pids.includes(p.pid)); if (!list.length) return { out: fmtArg ? '' : '    PID TTY      STAT   TIME COMMAND\n', err: '', code: 1 }; }
  else if (uIdx >= 0) { const u = args[uIdx + 1]; list = list.filter(p => p.user === u); if (!list.length) return fail(`error: user name does not exist\n\nUsage:\n ps [options]`, 1); }
  else if (cIdx >= 0) { const c = args[cIdx + 1]; list = list.filter(p => p.cmd.split(' ')[0].split('/').pop() === c); if (!list.length) return { out: '    PID TTY          TIME CMD\n', err: '', code: 1 }; }
  else if (!args.some(a => /e|a|x|A/.test(a.replace(/^-/, '')))) list = list.filter(p => p.user === this.user || p.jn);
  const cols = (fmtArg || 'pid,tty,time,cmd').split(/[,\s]+/).filter(Boolean);
  const val = (p, c) => {
    const k = c.toLowerCase();
    if (k === 'pid') return String(p.pid); if (k === 'ppid') return p.pid === 1 ? '0' : p.jn ? '733' : p.pid === 733 ? '2100' : '1';
    if (k === 'ni' || k === 'nice') return String(p.ni || 0); if (k === 'pri') return String(80 + (p.ni || 0)); if (k === 'user' || k === 'uname' || k === 'euser') return p.user;
    if (k === 'cmd' || k === 'command' || k === 'args') return p.cmd; if (k === 'comm' || k === 'ucmd') return p.cmd.split(' ')[0].split('/').pop();
    if (k === '%cpu' || k === 'pcpu') return p.cpu.toFixed(1); if (k === '%mem' || k === 'pmem') return p.mem.toFixed(1);
    if (k === 'stat' || k === 's' || k === 'state') return p.st === 'Stopped' ? 'T' : p.cpu > 50 ? 'R' : 'S'; if (k === 'tty' || k === 'tt') return p.jn || p.pid === 733 || p.pid === 1024 ? 'pts/0' : '?';
    if (k === 'time' || k === 'etime') return '00:00:0' + (p.pid % 10); if (k === 'rss') return String(Math.round(p.mem * 40000)); if (k === 'vsz') return String(Math.round(p.mem * 120000 + 10000));
    if (k === 'start' || k === 'lstart' || k === 'stime') return p.jn ? sysHM(new Date()) : '07:58'; if (k === 'pgid' || k === 'sid') return String(p.jn ? p.pid : 733); if (k === 'wchan') return p.st === 'Stopped' ? 'do_sig' : p.cmd.startsWith('sleep') ? 'hrtime' : '-';
    return null;
  };
  const bad = cols.find(c => val(list[0] || this.procs[0], c) === null);
  if (bad) return fail(`error: unknown user-defined format specifier "${bad}"\n\nUsage:\n ps [options]\n\n Try 'ps --help <simple|list|output|threads|misc|all>'\n  or 'ps --help <s|l|o|t|m|a>'\n for additional help text.\n\nFor more details see ps(1).`, 1);
  const header = { pid: 'PID', ppid: 'PPID', ni: 'NI', nice: 'NI', pri: 'PRI', user: 'USER', cmd: 'CMD', command: 'COMMAND', args: 'COMMAND', comm: 'COMMAND', '%cpu': '%CPU', '%mem': '%MEM', stat: 'STAT', tty: 'TTY', time: 'TIME', etime: 'ELAPSED', rss: 'RSS', vsz: 'VSZ', start: 'START', stime: 'STIME', pgid: 'PGID', sid: 'SID', wchan: 'WCHAN', s: 'S', state: 'S', uname: 'USER', euser: 'USER', tt: 'TT', ucmd: 'CMD', lstart: 'STARTED', pcpu: '%CPU', pmem: '%MEM' };
  const widths = cols.map(c => (/^(cmd|command|args|comm|ucmd)$/i.test(c) ? 0 : Math.max((header[c.toLowerCase()] || c).length, ...list.map(p => val(p, c).length))));
  const line = vals => cols.map((c, i) => (widths[i] ? (/^(user|uname|euser|tty|tt|stat|s|state|wchan|start|stime|lstart)$/i.test(c) ? sysPad(vals[i], widths[i]) : sysLpad(vals[i], widths[i])) : vals[i])).join(' ');
  const out = [line(cols.map(c => header[c.toLowerCase()] || c.toUpperCase()))];
  list.forEach(p => out.push(line(cols.map(c => val(p, c)))));
  return ok(join(out));
};
SYS_CMDS.pstree = function (args) {
  const { flags, rest } = parseOpts(args);
  const P = flags.has('p');
  const name = (p, n) => (n || p.cmd.split(' ')[0].split('/').pop().replace(/^-/, '')) + (P ? `(${p.pid})` : '');
  const jobs = sysJobs(this);
  const bashKids = jobs.map(j => name(j)).concat([name({ pid: sysNewPid(this), cmd: 'pstree' })]);
  const sub = (kids, indent) => kids.map((k, i) => (i === 0 ? '' : indent) + (kids.length === 1 ? '───' : i === 0 ? '─┬─' : i === kids.length - 1 ? ' └─' : ' ├─') + k).join('\n');
  const bash = 'bash' + (P ? '(733)' : '') + sub(bashKids, ' '.repeat(('sshd' + (P ? '(2100)' : '')).length + ('sshd' + (P ? '(412)' : '')).length + 'systemd(1)'.length + 9 + ('bash' + (P ? '(733)' : '')).length - 'systemd(1)'.length - 2 + (P ? 2 : 0)));
  if (rest[0] && !/^\d+$/.test(rest[0])) return fail(`pstree: ${rest[0]}: no such user`);
  const others = this.procs.filter(p => ![1, 412, 733, 2100].includes(p.pid) && !p.jn).map(p => name(p));
  const root = 'systemd' + (P ? '(1)' : '');
  const lines2 = [];
  const kids = others.concat(['sshd' + (P ? '(412)' : '') + '───sshd' + (P ? '(2100)' : '') + '───' + bash.split('\n')[0]]);
  kids.sort((a, b) => a.replace(/\(.*/, '').localeCompare(b.replace(/\(.*/, '')));
  kids.forEach((k, i) => lines2.push((i === 0 ? root : ' '.repeat(root.length)) + (kids.length === 1 ? '───' : i === 0 ? '─┬─' : i === kids.length - 1 ? ' └─' : ' ├─') + k));
  const idx = lines2.findIndex(l => l.includes('sshd'));
  const pad = ' '.repeat(root.length + 3 + 'sshd───sshd───bash'.length + (P ? 15 : 0));
  const extra = bash.split('\n').slice(1).map(l => pad + l.trim().replace(/^[ ]*/, ''));
  if (extra.length) lines2.splice(idx + 1, 0, ...extra.map(l => (idx === kids.length - 1 ? l : l.replace(pad, ' '.repeat(root.length) + ' │' + pad.slice(root.length + 2)))));
  return ok(join(lines2) + (flags.has('p') ? '' : sysNote('PID görmek için pstree -p, bir kullanıcının ağacı için pstree burak', 'To see PIDs use pstree -p, for one user tree use pstree burak') + '\n'));
};
SYS_CMDS.htop = function () {
  const gate = sysNeedPkg(this, 'htop', 'htop'); if (gate) return gate;
  const sorted = [...this.procs].sort((a, b) => b.cpu - a.cpu);
  const bar = (pct, w, label) => { const f = Math.round(pct / 100 * w); return '[' + '|'.repeat(f) + ' '.repeat(Math.max(0, w - f - label.length)) + label + ']'; };
  const out = [
    `  0  ${bar(Math.min(100, sorted[0] ? sorted[0].cpu : 0), 40, Math.min(100, sorted[0] ? sorted[0].cpu : 0).toFixed(1) + '%')}   Tasks: ${this.procs.length}, ${this.procs.length + 14} thr; ${sorted.filter(p => p.cpu > 50).length + 1} running`,
    `  1  ${bar(4.2, 40, '4.2%')}   Load average: 1.02 0.98 0.95 `,
    `  Mem${bar(42, 40, '1.61G/3.84G')}   Uptime: 3 days, 04:12:33`,
    `  Swp${bar(6, 40, '128M/2.00G')}`, '',
    '    PID USER       PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command',
  ];
  sorted.forEach(p => out.push(`${sysLpad(p.pid, 7)} ${sysPad(p.user.slice(0, 10), 10)} ${sysLpad(20 + (p.ni || 0), 3)} ${sysLpad(p.ni || 0, 3)} ${sysLpad(sysHuman(Math.round(p.mem * 120000 + 10000) * 1024), 5)} ${sysLpad(sysHuman(Math.round(p.mem * 40000) * 1024), 5)} ${sysLpad(sysHuman(4096 * 1024), 5)} ${p.st === 'Stopped' ? 'T' : p.cpu > 50 ? 'R' : 'S'} ${sysLpad(p.cpu.toFixed(1), 4)} ${sysLpad(p.mem.toFixed(1), 4)} ${sysLpad('0:0' + (p.pid % 10) + '.' + String(p.pid % 100).padStart(2, '0'), 8)} ${p.cmd}`));
  out.push('', 'F1Help  F2Setup F3SearchF4FilterF5Tree  F6SortByF7Nice -F8Nice +F9Kill  F10Quit', '', lt('[htop canlı güncellenir, q ile çıkılır, F9 kill, F7 ve F8 nice. Burada tek frame var]', '[htop updates live, q quits, F9 kills, F7 and F8 change nice. This is a single frame]'));
  return ok(join(out));
};
SYS_CMDS.nice = function (args, stdin) {
  let n = 10; let rest = args.slice();
  if (!rest.length) return ok('0\n');
  if (rest[0] === '-n') { n = parseInt(rest[1], 10); rest = rest.slice(2); } else if (/^-n\d+$/.test(rest[0])) { n = +rest[0].slice(2); rest = rest.slice(1); } else if (/^-\d+$/.test(rest[0])) { n = +rest[0].slice(1); rest = rest.slice(1); } else if (/^--adjustment=/.test(rest[0])) { n = +rest[0].split('=')[1]; rest = rest.slice(1); }
  if (isNaN(n)) return fail(`nice: invalid adjustment '${args[1]}'`, 125);
  if (!rest.length) return fail('nice: a command must be given with an adjustment\nTry \'nice --help\' for more information.', 125);
  let warn = '';
  if (n < 0 && !this.isRoot) { warn = 'nice: cannot set niceness: Permission denied\n'; n = 0; }
  n = Math.max(-20, Math.min(19, n));
  if (sysIsLong(rest.join(' '))) return { out: sysNote(`${rest[0]} nice ${n} ile çalışırdı ama uzun süren bir komut, arkaya atmak için sonuna & ekle: nice -n ${n} ${rest.join(' ')} &`, `${rest[0]} would run with nice ${n}, but it is a long running command, add & at the end to send it to the background, nice -n ${n} ${rest.join(' ')} &`) + '\n', err: warn, code: 0 };
  const r = this.execSimple(rest, stdin, {});
  return { out: r.out || '', err: warn + (r.err || ''), code: r.code };
};
SYS_CMDS.renice = function (args) {
  let n; const targets = []; let mode = 'p';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-n' || a === '--priority') n = parseInt(args[++i], 10);
    else if (a === '-p' || a === '--pid') mode = 'p'; else if (a === '-u' || a === '--user') mode = 'u'; else if (a === '-g') mode = 'g';
    else if (/^-?\d+$/.test(a) && n === undefined) n = +a;
    else targets.push([mode, a]);
  }
  if (n === undefined || !targets.length) return fail('\nUsage:\n renice [-n] <priority> [-p|--pid] <pid>...\n renice [-n] <priority>  -g|--pgrp <pgid>...\n renice [-n] <priority>  -u|--user <user>...\n\nAlter the priority of running processes.\n\nOptions:\n -n, --priority <num>   specify the nice value\n -p, --pid              interpret arguments as process ID (default)\n -g, --pgrp             interpret arguments as process group ID\n -u, --user             interpret arguments as username or user ID', 1);
  let out = ''; let err = '';
  for (const [m, t] of targets) {
    const list = m === 'u' ? this.procs.filter(p => p.user === t) : this.procs.filter(p => String(p.pid) === t);
    if (!list.length) { err += m === 'u' ? `renice: unknown user ${t}\n` : `renice: failed to get priority for ${t} (process ID): No such process\n`; continue; }
    for (const p of list) {
      const old = p.ni || 0;
      const nn = Math.max(-20, Math.min(19, n));
      if (!this.isRoot && (p.user !== USER || nn < old)) { err += `renice: failed to set priority for ${p.pid} (process ID): Permission denied\n${nn < old && p.user === USER ? sysNote('Sıradan kullanıcı niceness\'ı sadece artırabilir yani önceliği düşürebilir. Geri almak root ister, sudo renice -n ' + nn + ' -p ' + p.pid, 'A regular user can only raise niceness, which lowers priority. Undoing it needs root, sudo renice -n ' + nn + ' -p ' + p.pid) + '\n' : ''}`; continue; }
      p.ni = nn;
      out += `${p.pid} (process ID) old priority ${old}, new priority ${nn}\n`;
    }
  }
  return { out, err, code: err ? 1 : 0 };
};
SYS_CMDS.pmap = function (args) {
  const { flags, rest } = parseOpts(args);
  const pid = +rest[0];
  if (!rest[0]) return fail('\nUsage:\n pmap [options] PID [PID ...]\n\nDisplay information about process memory mappings.\n\nOptions:\n -x, --extended              show details\n -d, --device                show the device format\n -q, --quiet                 do not display header and footer', 1);
  const p = this.procs.find(x => x.pid === pid);
  if (!p) return fail(`${rest[0]}: ${isNaN(pid) ? 'invalid process id' : 'No such process'}`, 42);
  if (!this.isRoot && p.user !== USER) return ok(`${pid}:   ${p.cmd}\n` + sysNote('Başkasının process haritasını okumak için sudo pmap ' + pid, 'To read the process map of another user run sudo pmap ' + pid) + '\n');
  const base = p.cmd.split(' ')[0].split('/').pop().replace(/^-/, '');
  const rows = [['0000555b2c200000', '132K', 'r----', base], ['0000555b2c221000', '920K', 'r-x--', base], ['0000555b2c307000', '280K', 'r----', base], ['0000555b2c34d000', '16K', 'r----', base], ['0000555b2c351000', '52K', 'rw---', base], ['0000555b2d9a0000', `${Math.round(p.mem * 400 + 132)}K`, 'rw---', '[ anon ]'], ['00007f3c1a000000', '160K', 'r----', 'libc.so.6'], ['00007f3c1a028000', '1620K', 'r-x--', 'libc.so.6'], ['00007f3c1a1bd000', '352K', 'r----', 'libc.so.6'], ['00007f3c1a215000', '16K', 'r----', 'libc.so.6'], ['00007f3c1a219000', '8K', 'rw---', 'libc.so.6'], ['00007f3c1a21b000', '52K', 'rw---', '[ anon ]'], ['00007f3c1a2d0000', '8K', 'r----', 'ld-linux-x86-64.so.2'], ['00007f3c1a2d2000', '152K', 'r-x--', 'ld-linux-x86-64.so.2'], ['00007ffd4e1c0000', '132K', 'rw---', '[ stack ]'], ['00007ffd4e1fb000', '16K', 'r----', '[ vvar ]'], ['00007ffd4e1ff000', '8K', 'r-x--', '[ vdso ]']];
  const total = rows.reduce((s, r) => s + parseInt(r[1], 10), 0);
  const out = flags.has('q') ? [] : [`${pid}:   ${p.cmd}`];
  if (flags.has('x')) { out.push('Address           Kbytes     RSS   Dirty Mode  Mapping'); rows.forEach(r => out.push(`${r[0]} ${sysLpad(parseInt(r[1], 10), 7)} ${sysLpad(Math.round(parseInt(r[1], 10) * 0.6), 7)} ${sysLpad(r[2].includes('w') ? Math.round(parseInt(r[1], 10) * 0.6) : 0, 7)} ${r[2]} ${r[3]}`)); if (!flags.has('q')) out.push('---------------- ------- ------- ------- ', `total kB         ${sysLpad(total, 7)} ${sysLpad(Math.round(total * 0.6), 7)} ${sysLpad(Math.round(total * 0.1), 7)}`); }
  else { rows.forEach(r => out.push(`${r[0]} ${sysLpad(r[1], 7)} ${r[2]} ${r[3]}`)); if (!flags.has('q')) out.push(` total ${sysLpad(total + 'K', 12)}`); }
  return ok(join(out));
};
SYS_CMDS.trap = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  if (flags.has('l')) return ok(SYS_SIGS.map((s, i) => `${sysLpad(i + 1, 2)}) SIG${sysPad(s, 7)}`).reduce((acc, x, i) => acc + x + ((i + 1) % 5 === 0 ? '\n' : ' '), '').trim() + '\n');
  const norm = s => { const u = s.toUpperCase().replace(/^SIG/, ''); if (u === '0') return 'EXIT'; if (/^\d+$/.test(u)) return SYS_SIGS[+u - 1] || u; return u; };
  if (!rest.length || flags.has('p')) { const list = rest.length ? rest.map(norm) : Object.keys(this.sysTraps); return ok(join(list.filter(k => this.sysTraps[k] !== undefined).map(k => `trap -- '${this.sysTraps[k]}' ${k}`))); }
  if (rest.length === 1) { const k = norm(rest[0]); if (k === 'EXIT' || SYS_SIGS.includes(k) || k === 'ERR' || k === 'DEBUG') { delete this.sysTraps[k]; return ok(); } return fail(`bash: trap: ${rest[0]}: invalid signal specification`, 1); }
  const action = rest[0]; const sigs = rest.slice(1).map(norm);
  for (const s of sigs) { if (!(s === 'EXIT' || s === 'ERR' || s === 'DEBUG' || s === 'RETURN' || SYS_SIGS.includes(s))) return fail(`bash: trap: ${s}: invalid signal specification`, 1); if (s === 'KILL' || s === 'STOP') return fail(`bash: trap: ${s}: SIGKILL ve SIGSTOP yakalanamaz, kernel bunu izin vermez`, 1); }
  sigs.forEach(s => { if (action === '-' || action === '') delete this.sysTraps[s]; else this.sysTraps[s] = action; });
  const out = this.depth === 0 && sigs.includes('EXIT') ? sysNote('EXIT trap interaktif shell kapanırken çalışır. Asıl yeri script, temp dosya temizliği gibi işler için. Bir script içinde dene, bash ~/scripts/trap.sh', 'The EXIT trap runs when the interactive shell closes. Its real place is a script, for jobs like temp file cleanup. Try it in a script, bash ~/scripts/trap.sh') + '\n' : '';
  return ok(out);
};

/* ======================================================================
   10. Shell: at, atq, atrm, watch, history
   ====================================================================== */
function sysAtJobs(sh) { const d = sh.node(SYS_ATDIR); if (!d || d.t !== 'd') return []; return Object.keys(d.c).map(k => { const n = d.c[k]; const m = /^# at job (\d+)\n# when (\d+)\n# user (\S+)\n([\s\S]*)$/.exec(n.d); return m ? { id: +m[1], when: +m[2], user: m[3], cmd: m[4] } : null; }).filter(Boolean).sort((a, b) => a.id - b.id); }
function sysAtTime(spec) {
  const now = new Date(); let m;
  const s = spec.trim().toLowerCase();
  if (s === 'now') return now;
  if ((m = /^now\s*\+\s*(\d+)\s*(min|mins|minute|minutes|hour|hours|day|days|week|weeks)$/.exec(s))) { const mult = /^min/.test(m[2]) ? 60000 : /^hour/.test(m[2]) ? 3600000 : /^day/.test(m[2]) ? 86400000 : 604800000; return new Date(now.getTime() + +m[1] * mult); }
  if ((m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s+(today|tomorrow))?$/.exec(s))) { let h = +m[1]; const mi = +(m[2] || 0); if (m[3] === 'pm' && h < 12) h += 12; if (m[3] === 'am' && h === 12) h = 0; if (h > 23 || mi > 59) return null; const d = new Date(now); d.setHours(h, mi, 0, 0); if (m[4] === 'tomorrow' || (d <= now && m[4] !== 'today')) d.setDate(d.getDate() + 1); return d; }
  if (s === 'noon') { const d = new Date(now); d.setHours(12, 0, 0, 0); if (d <= now) d.setDate(d.getDate() + 1); return d; }
  if (s === 'midnight') { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); return d; }
  if (s === 'teatime') { const d = new Date(now); d.setHours(16, 0, 0, 0); if (d <= now) d.setDate(d.getDate() + 1); return d; }
  if (s === 'tomorrow') { const d = new Date(now); d.setDate(d.getDate() + 1); return d; }
  if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(s))) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  return null;
}
SYS_CMDS.at = function (args, stdin) {
  sysEnsure(this);
  const { flags, vals, rest } = parseOpts(args, 'fq');
  if (flags.has('l')) return SYS_CMDS.atq.call(this, []);
  if (flags.has('r') || flags.has('d')) return SYS_CMDS.atrm.call(this, rest);
  if (flags.has('c')) { const j = sysAtJobs(this).find(x => x.id === +rest[0]); if (!j) return fail(`Cannot find jobid ${rest[0]}`, 1); return ok(`#!/bin/sh\n# atrun uid=1000 gid=1000\n# mail burak 0\numask 22\nHOME=/home/burak; export HOME\nLOGNAME=burak; export LOGNAME\ncd /home/burak || {\n\t echo 'Execution directory inaccessible' >&2\n\t exit 1\n}\n${j.cmd}`); }
  if (this.services.atd === 'inactive') return fail("Can't open /var/run/atd.pid to signal atd. No atd running?", 1);
  if (!rest.length) return fail('Garbled time', 1);
  const when = sysAtTime(rest.join(' '));
  if (!when) return fail(`syntax error. Last token seen: ${rest[rest.length - 1]}\nGarbled time\n${sysNote('Kabul edilen biçimler: at 10:30, at now + 5 minutes, at noon tomorrow, at 2026-12-31 23:59', 'Accepted formats are at 10:30, at now + 5 minutes, at noon tomorrow, at 2026-12-31 23:59')}`, 1);
  let cmd = null;
  if (vals.f) { const r = this.readFile(vals.f, 'at'); if (r.err) return fail(`Cannot open input file ${vals.f}: No such file or directory`, 1); cmd = r.data; }
  else if (stdin != null) cmd = stdin;
  if (cmd === null) return fail(`warning: commands will be executed using /bin/sh\nat> \n${sysNote('Gerçek at komutları at> promptundan okur, Ctrl+D ile bitirirsin. Lab\'da prompt yok, komutu pipe ile ver: echo "komut" | at ' + rest.join(' ') + ', ya da at -f dosya ' + rest.join(' '), 'Real at reads commands from the at> prompt and you finish with Ctrl+D. The lab has no prompt, pipe the command in, echo "command" | at ' + rest.join(' ') + ', or at -f file ' + rest.join(' '))}`, 1);
  if (!cmd.trim()) return fail('warning: commands will be executed using /bin/sh\nat: no commands, job not queued', 1);
  const jobs = sysAtJobs(this);
  const id = jobs.length ? jobs[jobs.length - 1].id + 1 : 1;
  this.install(`${SYS_ATDIR}/a${String(id).padStart(5, '0')}`, mkfile(`# at job ${id}\n# when ${when.getTime()}\n# user ${this.user}\n${cmd.endsWith('\n') ? cmd : cmd + '\n'}`, 0o700, this.user));
  return { out: '', err: `warning: commands will be executed using /bin/sh\njob ${id} at ${sysCtime(when)}\n`, code: 0 };
};
SYS_CMDS.atq = function () { sysEnsure(this); const jobs = sysAtJobs(this).filter(j => this.isRoot || j.user === USER); return ok(join(jobs.map(j => `${j.id}\t${sysCtime(new Date(j.when))} a ${j.user}`))); };
SYS_CMDS.atrm = function (args) {
  sysEnsure(this);
  if (!args.length) return fail('usage: atrm [-V] jobid ...', 1);
  let err = '';
  for (const a of args) { const j = sysAtJobs(this).find(x => x.id === +a); if (!j) { err += `Cannot find jobid ${a}\n`; continue; } if (!this.isRoot && j.user !== USER) { err += `Cannot find jobid ${a}\n`; continue; } sysDel(this, `${SYS_ATDIR}/a${String(j.id).padStart(5, '0')}`); }
  return { out: '', err, code: err ? 1 : 0 };
};
SYS_CMDS['at-tick'] = function () {
  sysEnsure(this);
  const jobs = sysAtJobs(this);
  if (!jobs.length) return fail('at-tick: ' + lt('kuyruk boş, önce echo "komut" | at now + 1 minute', 'the queue is empty, first run echo "command" | at now + 1 minute'));
  const out = [];
  for (const j of jobs) {
    const buf = []; const errs = [];
    const code = this.runScriptText(j.cmd, (t, cls) => (cls === 'err' ? errs : buf).push(t), null, 'at');
    sysDel(this, `${SYS_ATDIR}/a${String(j.id).padStart(5, '0')}`);
    out.push(`▶ job ${j.id} ${j.cmd.trim()}  →  exit ${code}` + (buf.length ? '\n' + buf.join('').replace(/\n$/, '') : '') + (errs.length ? '\n' + errs.join('').replace(/\n$/, '') : ''));
  }
  return ok(join(out));
};
SYS_CMDS.watch = function (args) {
  let interval = 2; let diff = false; let title = true; let rest = args.slice();
  while (rest.length && rest[0].startsWith('-')) {
    const a = rest.shift();
    if (a === '-n' || a === '--interval') interval = parseFloat(rest.shift()); else if (/^-n[\d.]+$/.test(a)) interval = parseFloat(a.slice(2)); else if (a.startsWith('--interval=')) interval = parseFloat(a.slice(11));
    else if (a === '-d' || a === '--differences') diff = true; else if (a === '-t' || a === '--no-title') title = false;
    else if (a === '-g' || a === '-e' || a === '-x' || a === '-c' || a === '-b' || a === '--chgexit' || a === '--errexit' || a === '--color' || a === '--exec' || a === '--beep') { /* kabul */ }
    else return fail(`watch: unrecognized option '${a}'\n\nUsage:\n watch [options] command\n\nOptions:\n  -d, --differences[=<permanent>]\n                         highlight changes between updates\n  -n, --interval <secs>  seconds to wait between updates\n  -t, --no-title         turn off header`, 1);
  }
  if (!rest.length) return fail('watch: ' + lt('command yok', 'no command given') + '\n\nUsage:\n watch [options] command', 1);
  if (isNaN(interval) || interval < 0.1) interval = 0.1;
  const cmd = rest.join(' ');
  const buf = []; const errs = [];
  this.execList(cmd, (t, cls) => (cls === 'err' ? errs : buf).push(t));
  const head = `Every ${interval.toFixed(1)}s: ${cmd}`;
  const right = `${HOSTNAME}: ${sysCtime(new Date())}`;
  const out = title ? [head + ' '.repeat(Math.max(1, 80 - head.length - right.length)) + right, ''] : [];
  out.push((buf.join('') + errs.join('')).replace(/\n$/, ''));
  out.push('', lt(`[watch her ${interval} saniyede bir ekranı yeniler, Ctrl+C ile çıkılır${diff ? ', -d değişen yerleri vurgular' : ''}. Burada tek bir yenileme var]`, `[watch refreshes the screen every ${interval} seconds, Ctrl+C quits${diff ? ', -d highlights what changed' : ''}. This is a single refresh]`));
  return ok(join(out));
};
SYS_CMDS.history = function (args) {
  const { flags, vals, rest } = parseOpts(args, 'd');
  if (flags.has('c')) { this.history.length = 0; return ok(); }
  if (vals.d !== undefined) { const i = +vals.d - 1; if (!(i >= 0 && i < this.history.length)) return fail(`bash: history: ${vals.d}: history position out of range`); this.history.splice(i, 1); return ok(); }
  if (flags.has('w') || flags.has('a')) { this.writeFile(HOME + '/.bash_history', join(this.history), false, 'history'); return ok(); }
  if (flags.has('r')) return ok();
  const r = SYS_OLD.history.call(this, []);
  if (rest[0] && /^\d+$/.test(rest[0])) return ok(join(lines(r.out).slice(-+rest[0])));
  return r;
};
SYS_CMDS.fc = function (args) { const { flags } = parseOpts(args); if (flags.has('l')) return ok(join(this.history.slice(-16).map((h, i) => `${sysLpad(this.history.length - 16 + i + 1 > 0 ? this.history.length - Math.min(16, this.history.length) + i + 1 : i + 1, 5)}\t ${h}`))); return fail('fc: ' + lt('bu lab\'da sadece fc -l, düzenlemek için ↑ ve !n', 'only fc -l in this lab, to edit use ↑ and !n')); };

/* ======================================================================
   11. Arama: find, locate, updatedb
   ====================================================================== */
function sysSizeSpec(spec) {
  const m = /^([+-]?)(\d+)([ckMGb]?)$/.exec(spec);
  if (!m) return null;
  const unit = { c: 1, k: 1024, M: 1048576, G: 1073741824, b: 512, '': 512 }[m[3]];
  return { op: m[1], n: +m[2] * unit, unit: unit === 1 ? 1 : unit };
}
SYS_CMDS.find = function (args) {
  const starts = []; let i = 0;
  while (i < args.length && !args[i].startsWith('-') && args[i] !== '(' && args[i] !== '!') starts.push(args[i++]);
  if (!starts.length) starts.push('.');
  const now = Date.now();
  let maxdepth = Infinity; let mindepth = 0; const actions = []; let print0 = false; let del = false; let explicitPrint = false;
  /* ifade agaci: diziler and, -o ile or */
  const parse = () => {
    const orGroups = [[]]; let neg = false;
    const push = t => { const f = neg ? (n, p, d) => !t(n, p, d) : t; neg = false; orGroups[orGroups.length - 1].push(f); };
    while (i < args.length) {
      const a = args[i++];
      if (a === ')') break;
      if (a === '(') { const sub = parse(); push(sub); continue; }
      if (a === '!' || a === '-not') { neg = !neg; continue; }
      if (a === '-o' || a === '-or') { orGroups.push([]); continue; }
      if (a === '-a' || a === '-and') continue;
      const v = () => { const x = args[i++]; if (x === undefined) throw new Error(`find: missing argument to \`${a}'`); return x; };
      if (a === '-name') { const re = globToRe(v()); push((n, p) => re.test(p.split('/').pop())); }
      else if (a === '-iname') { const re = new RegExp(globToRe(v()).source, 'i'); push((n, p) => re.test(p.split('/').pop())); }
      else if (a === '-path' || a === '-wholename') { const re = new RegExp(globToRe(v()).source.replace(/\[\^\/\]\*/g, '.*')); push((n, p) => re.test(p)); }
      else if (a === '-ipath') { const re = new RegExp(globToRe(v()).source.replace(/\[\^\/\]\*/g, '.*'), 'i'); push((n, p) => re.test(p)); }
      else if (a === '-regex') { const re = new RegExp('^' + v() + '$'); push((n, p) => re.test(p)); }
      else if (a === '-type') { const t = v(); if (!'fdl'.includes(t)) throw new Error(`find: Unknown argument to -type: ${t}`); push(n => (t === 'l' ? !!n.l : t === 'f' ? n.t === 'f' && !n.l : n.t === t)); }
      else if (a === '-user') { const u = v(); if (!sysUser(this, u)) throw new Error(`find: \`${u}' is not the name of a known user`); push(n => n.o === u); }
      else if (a === '-group') { const g = v(); push(n => (n.g || n.o) === g); }
      else if (a === '-perm') { const spec = v(); const m = /^([-/]?)([0-7]{3,4})$/.exec(spec); if (!m) throw new Error(`find: invalid mode \`${spec}'`); const bits = parseInt(m[2], 8); push(n => (m[1] === '-' ? (n.m & bits) === bits : m[1] === '/' ? (n.m & bits) !== 0 : (n.m & 0o777) === bits)); }
      else if (a === '-empty') push(n => (n.t === 'f' ? n.d.length === 0 : Object.keys(n.c).length === 0));
      else if (a === '-size') { const s = sysSizeSpec(v()); if (!s) throw new Error(`find: invalid -size type \`${args[i - 1]}'`); push(n => { const sz = n.t === 'f' ? n.d.length : 4096; const units = s.unit === 1 ? sz : Math.ceil(sz / s.unit) * s.unit; return s.op === '+' ? units > s.n : s.op === '-' ? units < s.n : units === s.n; }); }
      else if (a === '-mtime' || a === '-atime' || a === '-ctime') { const spec = v(); const m = /^([+-]?)(\d+)$/.exec(spec); if (!m) throw new Error(`find: invalid argument \`${spec}' to \`${a}'`); push(n => { const days = Math.floor((now - (n.ts || now)) / 86400000); return m[1] === '+' ? days > +m[2] : m[1] === '-' ? days < +m[2] : days === +m[2]; }); }
      else if (a === '-mmin' || a === '-amin' || a === '-cmin') { const spec = v(); const m = /^([+-]?)(\d+)$/.exec(spec); if (!m) throw new Error(`find: invalid argument \`${spec}' to \`${a}'`); push(n => { const mins = Math.floor((now - (n.ts || now)) / 60000); return m[1] === '+' ? mins > +m[2] : m[1] === '-' ? mins < +m[2] : mins === +m[2]; }); }
      else if (a === '-newer') { const f = v(); const ref = this.node(this.resolve(f)); if (!ref) throw new Error(`find: '${f}': No such file or directory`); push(n => (n.ts || 0) > (ref.ts || 0)); }
      else if (a === '-maxdepth') { maxdepth = +v(); }
      else if (a === '-mindepth') { mindepth = +v(); }
      else if (a === '-print') { explicitPrint = true; actions.push({ t: 'print' }); }
      else if (a === '-print0') { print0 = true; explicitPrint = true; actions.push({ t: 'print0' }); }
      else if (a === '-ls') { explicitPrint = true; actions.push({ t: 'ls' }); }
      else if (a === '-delete') { del = true; explicitPrint = true; actions.push({ t: 'delete' }); }
      else if (a === '-exec' || a === '-execdir' || a === '-ok') { const cmd = []; let plus = false; while (i < args.length) { const x = args[i++]; if (x === ';' || x === '\;') break; if (x === '+') { plus = true; break; } cmd.push(x); } if (!cmd.length) throw new Error(`find: missing argument to \`${a}'`); explicitPrint = true; actions.push({ t: 'exec', cmd, plus }); }
      else if (a === '-readable') push(n => this.canRead(n));
      else if (a === '-writable') push(n => this.canWrite(n));
      else if (a === '-executable') push(n => this.canExec(n));
      else if (a === '-prune' || a === '-xdev' || a === '-mount' || a === '-depth' || a === '-follow' || a === '-L' || a === '-P' || a === '-H') { /* kabul */ }
      else if (a === '-quit') { /* kabul */ }
      else throw new Error(/^-/.test(a) ? `find: unknown predicate \`${a}'` : `find: paths must precede expression: \`${a}'\nfind: possible unquoted pattern after predicate \`-name'?`);
    }
    return (n, p, d) => orGroups.some(g => g.every(t => t(n, p, d)));
  };
  let test;
  try { test = parse(); } catch (e) { return fail(e.message, 1); }
  const found = []; let err = '';
  for (const s of starts) {
    const abs = this.resolve(s);
    if (!this.node(abs)) { err += `find: \u2018${s}\u2019: No such file or directory\n`; continue; }
    const walk = (p, disp, d) => {
      const n = this.node(p);
      if (!n) return;
      if (d >= mindepth && test(n, disp, d)) found.push({ p, disp, n });
      if (n.t === 'd' && d < maxdepth) {
        if (!this.canRead(n) || !(this.isRoot || n.m & 0o001 || n.o === USER)) { if (disp !== '.') err += `find: \u2018${disp}\u2019: Permission denied\n`; return; }
        for (const c of Object.keys(n.c).sort()) walk(p === '/' ? '/' + c : p + '/' + c, disp === '/' ? '/' + c : disp + '/' + c, d + 1);
      }
    };
    walk(abs, s, 0);
  }
  let out = '';
  const acts = actions.length ? actions : [{ t: 'print' }];
  for (const act of acts) {
    if (act.t === 'print') out += join(found.map(f => f.disp));
    else if (act.t === 'print0') out += found.map(f => f.disp).join('\0') + (found.length ? '\0' : '');
    else if (act.t === 'ls') out += join(found.map(f => `${sysLpad(130000 + f.p.length, 7)} ${sysLpad(Math.ceil((f.n.t === 'f' ? f.n.d.length : 4096) / 1024) * 4, 4)} ${modeStr(f.n)} ${sysLpad(f.n.nl || 1, 3)} ${sysPad(f.n.o, 8)} ${sysPad(f.n.g || f.n.o, 8)} ${sysLpad(f.n.t === 'f' ? f.n.d.length : 4096, 8)} ${fmtDate(f.n.ts)} ${f.disp}${f.n.l ? ' -> ' + f.n.l : ''}`));
    else if (act.t === 'delete') { for (const f of found.slice().reverse()) { if (f.p === this.cwd || f.p === HOME) { err += `find: cannot delete \u2018${f.disp}\u2019: Directory not empty\n`; continue; } if (f.n.t === 'd' && Object.keys(f.n.c).length) { err += `find: cannot delete \u2018${f.disp}\u2019: Directory not empty\n`; continue; } const { dir } = this.parent(f.p); if (!this.canWrite(dir)) { err += `find: cannot delete \u2018${f.disp}\u2019: Permission denied\n`; continue; } sysDel(this, f.p); } }
    else if (act.t === 'exec') {
      const run = argv => { const r = this.execSimple(argv, null, {}); out += r.out || ''; if (r.err) err += r.err; };
      if (act.plus) run(act.cmd.flatMap(c => (c === '{}' ? found.map(f => f.disp) : [c])));
      else for (const f of found) run(act.cmd.map(c => c.replace(/\{\}/g, f.disp)));
    }
  }
  void print0; void del; void explicitPrint;
  return { out, err, code: err ? 1 : 0 };
};
SYS_CMDS.updatedb = function () {
  sysEnsure(this);
  const gate = sysNeedPkg(this, 'updatedb', 'mlocate'); if (gate) return gate;
  if (!this.isRoot) return fail(`updatedb: can not open a temporary file for \`/var/lib/mlocate/mlocate.db'\n${sysNote('Veritabanı root\'a ait, sudo updatedb. Normalde cron her gün gece çalıştırır', 'The database belongs to root, sudo updatedb. Normally cron runs it every night')}`, 1);
  const all = [];
  sysWalk(this, '/', (p, n) => { if (!p.startsWith('/proc') && !p.startsWith('/srv/remote') && !p.startsWith('/var/lib/lab') && p !== '/') all.push(p); });
  sysRootWrite(this, SYS_LOCATEDB, join(all), 0o640);
  return ok();
};
SYS_CMDS.locate = function (args) {
  sysEnsure(this);
  const gate = sysNeedPkg(this, 'locate', 'mlocate'); if (gate) return gate;
  const { flags, vals, rest } = parseOpts(args, 'nd');
  const db = this.node(SYS_LOCATEDB);
  if (!db) return fail(`locate: can not stat () \`/var/lib/mlocate/mlocate.db': No such file or directory\n${sysNote('locate canlı aramaz, updatedb ile üretilen veritabanına bakar. Önce sudo updatedb', 'locate does not search live, it reads the database built by updatedb. Run sudo updatedb first')}`, 1);
  if (!rest.length) return fail('locate: no pattern to search for specified\nTry `locate --help\' for more information.', 1);
  let list = lines(db.d);
  if (!this.isRoot) list = list.filter(p => { const parts = p.split('/'); let n = this.root; for (let k = 1; k < parts.length - 1; k++) { n = n.c[parts[k]]; if (!n || !(n.m & 0o001 || n.o === USER)) return false; } return true; });
  const ci = flags.has('i');
  const pats = rest.map(p => (flags.has('r') || flags.has('--regex') ? new RegExp(p, ci ? 'i' : '') : /[*?[]/.test(p) ? new RegExp(globToRe(p).source.replace(/\[\^\/\]/g, '.'), ci ? 'i' : '') : null) || p);
  let hits = list.filter(p => pats.some(pt => (pt instanceof RegExp ? pt.test(p) : ci ? p.toLowerCase().includes(pt.toLowerCase()) : p.includes(pt))));
  if (flags.has('b')) hits = hits.filter(p => pats.some(pt => (pt instanceof RegExp ? pt.test(p.split('/').pop()) : p.split('/').pop().includes(pt))));
  if (flags.has('e')) hits = hits.filter(p => !!this.node(p));
  if (vals.n) hits = hits.slice(0, +vals.n);
  if (flags.has('c')) return ok(hits.length + '\n');
  const stale = hits.some(p => !this.node(p));
  return { out: join(hits) + (stale && !flags.has('e') ? sysNote('Bazı yollar artık yok, veritabanı eski. sudo updatedb ile tazele ya da locate -e ile sadece var olanları göster', 'Some paths no longer exist, the database is stale. Refresh it with sudo updatedb or show only existing ones with locate -e') + '\n' : ''), err: '', code: hits.length ? 0 : 1 };
};

/* ======================================================================
   12. Dosyalar: ln, readlink, gpg, shred ve sarmalamalar
   ====================================================================== */
SYS_CMDS.ln = function (args) {
  const { flags, rest } = parseOpts(args);
  const sym = flags.has('s'); const force = flags.has('f');
  if (!rest.length) return fail('ln: missing file operand\nTry \'ln --help\' for more information.');
  if (rest.length === 1) rest.push(rest[0].split('/').pop());
  const dest = rest[rest.length - 1]; const srcs = rest.slice(0, -1);
  const destAbs = this.resolve(dest); const dn = this.node(destAbs);
  if (srcs.length > 1 && !(dn && dn.t === 'd')) return fail(`ln: target '${dest}': Not a directory`);
  let err = '';
  for (const s of srcs) {
    const srcAbs = this.resolve(s); const sn = this.node(srcAbs);
    const target = dn && dn.t === 'd' ? destAbs + '/' + s.replace(/\/$/, '').split('/').pop() : destAbs;
    const { dir, name } = this.parent(target);
    if (!dir || dir.t !== 'd') { err += `ln: failed to create ${sym ? 'symbolic' : 'hard'} link '${dest}': No such file or directory\n`; continue; }
    if (!sym) {
      if (!sn) { err += `ln: failed to access '${s}': No such file or directory\n`; continue; }
      if (sn.t === 'd') { err += `ln: ${s}: hard link not allowed for directory\n`; continue; }
      if (sn.l) { err += `ln: failed to access '${s}': No such file or directory\n`; continue; }
    }
    if (dir.c[name]) { if (!force) { err += `ln: failed to create ${sym ? 'symbolic' : 'hard'} link '${target === destAbs ? dest : dest.replace(/\/$/, '') + '/' + name}': File exists\n`; continue; } if (dir.c[name].nl > 1) dir.c[name].nl--; delete dir.c[name]; }
    if (!this.canWrite(dir)) { err += `ln: failed to create ${sym ? 'symbolic' : 'hard'} link '${dest}': Permission denied\n`; continue; }
    if (sym) { const ln = mkfile('', 0o777, this.user); ln.l = s; dir.c[name] = ln; }
    else { sn.nl = (sn.nl || 1) + 1; dir.c[name] = sn; }
  }
  return { out: '', err, code: err ? 1 : 0 };
};
function sysLinkTarget(sh, abs, n) { const t = n.l; return t.startsWith('/') ? t : sh.resolve(sh.parent(abs).ppath + '/' + t); }
SYS_CMDS.readlink = function (args) {
  const { flags, rest } = parseOpts(args);
  const out = []; let code = 0;
  for (const f of rest) { const abs = this.resolve(f); const n = this.node(abs); if (flags.has('f') || flags.has('e')) { if (!n && flags.has('e')) { code = 1; continue; } out.push(n && n.l ? sysLinkTarget(this, abs, n) : abs); continue; } if (!n || !n.l) { code = 1; continue; } out.push(n.l); }
  return { out: join(out), err: '', code };
};
SYS_CMDS.gpg = function (args, stdin) {
  const longs = args.filter(a => a.startsWith('--'));
  const { flags, vals, rest } = parseOpts(args.filter(a => !a.startsWith('--')), 'o');
  const pi = args.indexOf('--passphrase'); let pass = pi >= 0 ? args[pi + 1] : (this.env.GPG_PASSPHRASE || null);
  const pfi = args.indexOf('--passphrase-file'); if (pfi >= 0) { const r = this.readFile(args[pfi + 1], 'gpg'); if (r.err) return fail(`gpg: can't open '${args[pfi + 1]}': No such file or directory`, 2); pass = lines(r.data)[0] || ''; }
  const files = rest.filter((x, k) => !(pi >= 0 && args[pi + 1] === x) && !(pfi >= 0 && args[pfi + 1] === x));
  const oi = args.indexOf('--output'); const outName = vals.o || (oi >= 0 ? args[oi + 1] : null);
  const files2 = files.filter(x => x !== outName);
  if (longs.includes('--version')) return ok('gpg (GnuPG) 2.4.4\nlibgcrypt 1.10.3\nCopyright (C) 2024 g10 Code GmbH\n\nHome: /home/burak/.gnupg\nSupported algorithms:\nPubkey: RSA, ELG, DSA, ECDH, ECDSA, EDDSA\nCipher: IDEA, 3DES, CAST5, BLOWFISH, AES, AES192, AES256, TWOFISH,\n        CAMELLIA128, CAMELLIA192, CAMELLIA256\nHash: SHA1, RIPEMD160, SHA256, SHA384, SHA512, SHA224\nCompression: Uncompressed, ZIP, ZLIB, BZIP2\n');
  if (longs.includes('--gen-key') || longs.includes('--full-generate-key') || longs.includes('--list-keys') || flags.has('k')) return ok(sysNote('Açık anahtar işlemleri bu lab\'da simüle edilmiyor, mousepad\'deki kullanım simetrik şifreleme: gpg -c dosya ve gpg dosya.gpg', 'Public key operations are not simulated in this lab, the usage in mousepad is symmetric encryption, gpg -c file and gpg file.gpg') + '\n');
  const sym = flags.has('c') || longs.includes('--symmetric');
  const dec = flags.has('d') || longs.includes('--decrypt');
  const f = files2[0];
  if (!f) { if (sym) return fail(`gpg: ${sysNote('şifrelenecek dosyayı ver, gpg -c dosya', 'give the file to encrypt, gpg -c file')}`, 2); return fail('gpg: WARNING: no command supplied.  Trying to guess what you mean ...\ngpg: Go ahead and type your message ...\n' + sysNote('Dosya adı ver. gpg -c dosya şifreler, gpg dosya.gpg çözer', 'Give a file name. gpg -c file encrypts, gpg file.gpg decrypts'), 2); }
  const r = this.readFile(f, 'gpg');
  if (r.err) return fail(`gpg: can't open '${f}': No such file or directory\ngpg: ${sym ? 'symmetric encryption of' : 'decrypt_message failed:'} '${f}' failed: No such file or directory`, 2);
  const noPass = () => fail(`gpg: problem with the agent: No pinentry\ngpg: error creating passphrase: Operation cancelled\n${sysNote('Gerçek gpg passphrase\'i pinentry penceresinden sorar, lab\'da prompt yok. --batch --passphrase "gizli" ile ver ya da export GPG_PASSPHRASE=gizli', 'Real gpg asks for the passphrase in a pinentry window, the lab has no prompt. Pass it with --batch --passphrase "secret" or export GPG_PASSPHRASE=secret')}`, 2);
  if (sym) {
    if (sysKind(r.data) === 'gpg') return fail(lt(`gpg: ${f}: zaten şifreli görünüyor, çözmek için gpg ${f}`, `gpg: ${f}: looks already encrypted, to decrypt run gpg ${f}`), 2);
    if (pass === null) return noPass();
    const target = outName || f + '.gpg';
    if (this.node(this.resolve(target)) && !longs.includes('--yes') && !longs.includes('--batch')) return fail(`File '${target}' exists. Overwrite? (y/N) \n${sysNote('Üstüne yazmak için --yes ekle', 'Add --yes to overwrite')}`, 2);
    const e = this.writeFile(target, sysPack('gpg', { n: f.split('/').pop(), p: sysHash('gpg:' + pass, 32), d: r.data }), false, 'gpg');
    if (e) return fail(`gpg: can't create '${target}': Permission denied`, 2);
    return ok(longs.includes('--armor') || flags.has('a') ? sysNote('ASCII armor bu lab\'da ikili ile aynı saklanır', 'In this lab ASCII armor is stored the same as binary') + '\n' : '');
  }
  const packed = sysUnpack(r.data);
  if (!packed || packed.kind !== 'gpg') return fail(`gpg: no valid OpenPGP data found.\ngpg: decrypt_message failed: Unknown system error`, 2);
  if (pass === null) return noPass();
  if (sysHash('gpg:' + pass, 32) !== packed.obj.p) return fail('gpg: decryption failed: Bad session key', 2);
  const head = 'gpg: AES256.CFB encrypted data\ngpg: encrypted with 1 passphrase\n';
  if (dec && !outName) return { out: packed.obj.d, err: head, code: 0 };
  const target = outName || (f.endsWith('.gpg') || f.endsWith('.asc') ? f.slice(0, -4) : packed.obj.n);
  if (this.node(this.resolve(target)) && !longs.includes('--yes') && !longs.includes('--batch')) return fail(`${head}File '${target}' exists. Overwrite? (y/N) \n${sysNote('Üstüne yazmak için --yes ekle', 'Add --yes to overwrite')}`, 2);
  const e = this.writeFile(target, packed.obj.d, false, 'gpg');
  if (e) return fail(`${head}gpg: can't create '${target}': Permission denied`, 2);
  return { out: '', err: head, code: 0 };
};
SYS_CMDS.shred = function (args) {
  const { flags, vals, rest } = parseOpts(args, 'ns');
  if (!rest.length) return fail('shred: missing file operand\nTry \'shred --help\' for more information.');
  const passes = +(vals.n || 3); let out = ''; let err = '';
  for (const f of rest) {
    const abs = this.resolve(f); const n = this.node(abs);
    if (!n) { err += `shred: ${f}: failed to open for writing: No such file or directory\n`; continue; }
    if (n.t === 'd') { err += `shred: ${f}: failed to open for writing: Is a directory\n`; continue; }
    if (!this.canWrite(n)) { err += `shred: ${f}: failed to open for writing: Permission denied\n`; continue; }
    const len = n.d.length;
    for (let p = 1; p <= passes; p++) { if (flags.has('v')) out += `shred: ${f}: pass ${p}/${flags.has('z') ? passes + 1 : passes} (${p === 1 ? 'random' : p === 2 ? '000000' : p === 3 ? 'ffffff' : 'random'})...\n`; }
    if (flags.has('z') && flags.has('v')) out += `shred: ${f}: pass ${passes + 1}/${passes + 1} (000000)...\n`;
    n.d = flags.has('z') ? '\0'.repeat(len) : sysHash(abs + Date.now(), Math.max(1, len)).slice(0, len); n.ts = Date.now();
    if (flags.has('u') || flags.has('--remove')) { if (flags.has('v')) out += `shred: ${f}: removing\nshred: ${f}: renamed to ${'0'.repeat(f.split('/').pop().length)}\nshred: ${f}: removed\n`; sysDel(this, abs); }
  }
  return { out, err, code: err ? 1 : 0 };
};
SYS_CMDS.file = function (args) {
  const out = []; let err = '';
  for (const f of args.filter(a => !a.startsWith('-'))) {
    const abs = this.resolve(f); const n = this.node(abs);
    if (!n) { out.push(`${f}: cannot open \`${f}' (No such file or directory)`); continue; }
    if (n.l) { out.push(`${f}: symbolic link to ${n.l}`); continue; }
    if (n.t === 'd') { out.push(`${f}: directory`); continue; }
    if (n.x === 'elf') { out.push(`${f}: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, for GNU/Linux 3.2.0, not stripped`); continue; }
    const k = sysKind(n.d);
    if (k === 'tar') { out.push(`${f}: POSIX tar archive (GNU)`); continue; }
    if (k === 'gz') { const p = sysUnpack(n.d); out.push(`${f}: gzip compressed data, was "${p ? p.obj.n : ''}", last modified: ${sysCtime(new Date(n.ts))}, from Unix, original size modulo 2^32 ${p ? p.obj.l || p.obj.d.length : 0}`); continue; }
    if (k === 'xz') { out.push(`${f}: XZ compressed data, checksum CRC64`); continue; }
    if (k === 'bz2') { out.push(`${f}: bzip2 compressed data, block size = 900k`); continue; }
    if (k === 'zip') { out.push(`${f}: Zip archive data, at least v2.0 to extract, compression method=deflate`); continue; }
    if (k === 'gpg') { out.push(`${f}: GPG symmetrically encrypted data (AES256 cipher)`); continue; }
    if (n.d.startsWith('-----BEGIN OPENSSH PRIVATE KEY')) { out.push(`${f}: OpenSSH private key (no password)`); continue; }
    if (/^ssh-(ed25519|rsa) /.test(n.d)) { out.push(`${f}: OpenSSH ${n.d.startsWith('ssh-ed25519') ? 'ED25519' : 'RSA'} public key`); continue; }
    const r = SYS_OLD.file.call(this, [f]); out.push(r.out.replace(/\n$/, ''));
  }
  return { out: join(out), err, code: err ? 1 : 0 };
};
/* ls: symlink oku, grup, hard link sayisi */
SYS_CMDS.ls = function (args) {
  const { flags, rest } = parseOpts(args);
  if (flags.has('d')) {
    const targets = rest.length ? rest : ['.'];
    const out = []; let err = '';
    for (const t of targets) {
      const abs = this.resolve(t); const n = this.node(abs);
      if (!n) { err += `ls: cannot access '${t}': No such file or directory\n`; continue; }
      if (!flags.has('l')) { out.push(t); continue; }
      const links = n.t === 'd' ? 2 + Object.values(n.c).filter(c => c.t === 'd').length : n.nl || 1;
      out.push(`${n.l ? 'lrwxrwxrwx' : modeStr(n)} ${links} ${sysPad(n.o, 8)} ${sysPad(n.g || n.o, 8)} ${sysLpad(n.l ? n.l.length : n.t === 'd' ? 4096 : n.d.length, 6)} ${fmtDate(n.ts)} ${t}${n.l ? ' -> ' + n.l : ''}`);
    }
    return { out: flags.has('l') ? join(out) : out.join('  ') + (out.length ? '\n' : ''), err, code: err ? 2 : 0 };
  }
  const r = SYS_OLD.ls.call(this, args);
  if (!flags.has('l') || !r.out) return r;
  const targets = rest.length ? rest : ['.'];
  const dirs = targets.map(t => this.resolve(t));
  const lookup = name => { for (const d of dirs) { const n = this.node(d); if (n && n.t === 'd' && n.c[name]) return n.c[name]; if (n && n.t === 'f' && d.split('/').pop() === name.split('/').pop()) return n; } for (const t of targets) { const n = this.node(this.resolve(t)); if (n && n.t === 'f' && t === name) return n; } return null; };
  const fix = line => {
    const m = /^([-d][rwx-]{9}) (\d+) (\S+)\s+(\S+)\s+(\S+) (\w{3} +\d+ \d\d:\d\d) (.*)$/.exec(line);
    if (!m) return line;
    const name = m[7].replace(/[*/]$/, '');
    const n = lookup(name) || lookup(m[7]);
    if (!n) return line;
    const links = n.t === 'd' ? 2 + Object.values(n.c).filter(c => c.t === 'd').length : n.nl || 1;
    const mode = n.l ? 'lrwxrwxrwx' : m[1];
    const size = n.l ? n.l.length : m[5];
    return `${mode} ${links} ${sysPad(n.o, 8)} ${sysPad(n.g || n.o, 8)} ${sysLpad(size, 6)} ${m[6]} ${m[7]}${n.l ? ' -> ' + n.l : ''}`;
  };
  r.out = join(lines(r.out).map(fix));
  if (r.rich) {
    const rich = []; let i = 0;
    while (i < r.rich.length) {
      const c = r.rich[i];
      const m = /^([-d][rwx-]{9}) (\d+) (\S+)\s+(\S+)\s+(\S+) (\w{3} +\d+ \d\d:\d\d) $/.exec(c.text);
      if (m && r.rich[i + 1]) { const nameChunk = r.rich[i + 1]; const full = fix(c.text + nameChunk.text); const arrow = full.indexOf(nameChunk.text); const pre = full.slice(0, arrow); const post = full.slice(arrow + nameChunk.text.length); rich.push({ text: pre, cls: '' }, { text: nameChunk.text, cls: lookup(nameChunk.text.replace(/[*/]$/, '')) && lookup(nameChunk.text.replace(/[*/]$/, '')).l ? 'lnk' : nameChunk.cls }); if (post) rich.push({ text: post, cls: '' }); i += 2; continue; }
      rich.push(c); i++;
    }
    r.rich = rich;
  }
  return r;
};
SYS_CMDS.rm = function (args) {
  const { flags, rest } = parseOpts(args);
  const rec = flags.has('r') || flags.has('R') || flags.has('--recursive');
  if (rec && rest.some(r => this.resolve(r) === '/')) return fail(`rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe\n${sysNote(`${rest.length > 1 ? 'Bu komut muhtemelen bir boşluk hatası, rm -rf /tmp/x/ yazarken / ayrı bir argüman oldu. ' : ''}Gerçek sistemde --no-preserve-root ile her şeyi siler, geri dönüşü yok. Değişkenli yollarda "$DIR"/x yerine "${'${DIR:?}'}"/x kullan, DIR boşsa patlar, silmez`, `${rest.length > 1 ? 'This command is probably a space typo, while typing rm -rf /tmp/x/ the / became a separate argument. ' : ''}On a real system --no-preserve-root deletes everything with no way back. In paths with variables use "${'${DIR:?}'}"/x instead of "$DIR"/x, if DIR is empty it fails instead of deleting`)}`);
  if (rec && rest.some(r => /^\/\*$/.test(r))) return fail(`rm: cannot remove '/*': ${sysNote('/* preserve-root korumasını atlar ve her şeyi siler. Lab durdurdu, gerçek sistem durdurmaz', '/* skips the preserve-root guard and deletes everything. The lab stopped it, a real system will not')}`);
  for (const f of rest) { const n = this.node(this.resolve(f)); if (n && n.at && n.at.includes('i')) return fail(`rm: cannot remove '${f}': Operation not permitted\n${sysNote('Dosya immutable, lsattr ile bak, sudo chattr -i ' + f + ' ile kaldır', 'The file is immutable, check with lsattr, remove the flag with sudo chattr -i ' + f)}`); if (n && n.t === 'd' && rec) { let im = null; sysWalk(this, this.resolve(f), (p, x) => { if (!im && x.at && x.at.includes('i')) im = p; }); if (im) return fail(`rm: cannot remove '${im}': Operation not permitted`); } }
  for (const f of rest) { const n = this.node(this.resolve(f)); if (n && !n.l && n.nl > 1) n.nl--; }
  return SYS_OLD.rm.call(this, args);
};
SYS_CMDS.stat = function (args) {
  const { flags, vals, rest } = parseOpts(args, 'c');
  const f = rest[0];
  const n = this.node(this.resolve(f || ''));
  if (!n) return SYS_OLD.stat.call(this, args);
  if (vals.c) { const u = sysUser(this, n.o); const g = n.g || n.o; const gg = sysGroup(this, g); return ok(vals.c.replace(/%a/g, (n.m & 0o777).toString(8)).replace(/%A/g, modeStr(n)).replace(/%U/g, n.o).replace(/%G/g, g).replace(/%u/g, u ? u.uid : 0).replace(/%g/g, gg ? gg.gid : 0).replace(/%s/g, n.t === 'd' ? 4096 : n.d.length).replace(/%n/g, f).replace(/%h/g, n.nl || 1).replace(/%y/g, new Date(n.ts).toISOString()).replace(/%F/g, n.l ? 'symbolic link' : n.t === 'd' ? 'directory' : 'regular file') + '\n'); }
  if (flags.has('L') && n.l) { const t = this.node(sysLinkTarget(this, this.resolve(f), n)); if (t) return SYS_CMDS.stat.call(this, [sysLinkTarget(this, this.resolve(f), n)]); }
  const u = sysUser(this, n.o); const g = n.g || n.o; const gg = sysGroup(this, g);
  const size = n.l ? n.l.length : n.t === 'd' ? 4096 : n.d.length;
  const d = new Date(n.ts || Date.now());
  const ts = `${sysYMD(d)} ${sysHMS(d)}.${String(d.getMilliseconds()).padStart(3, '0')}000000 +0200`;
  return ok(`  File: ${f}${n.l ? ' -> ' + n.l : ''}\n  Size: ${sysPad(size, 15)} Blocks: ${sysPad(Math.ceil(size / 512) * 8 || 0, 10)} IO Block: 4096   ${n.l ? 'symbolic link' : n.t === 'd' ? 'directory' : n.d.length ? 'regular file' : 'regular empty file'}\nDevice: 8,1\tInode: ${130000 + this.resolve(f).length * 7}  Links: ${n.t === 'd' ? 2 + Object.values(n.c).filter(c => c.t === 'd').length : n.nl || 1}\nAccess: (${n.l ? '0777' : '0' + (n.m & 0o777).toString(8).padStart(3, '0')}/${n.l ? 'lrwxrwxrwx' : modeStr(n)})  Uid: (${sysLpad(u ? u.uid : 0, 5)}/${sysPad(n.o, 8)})   Gid: (${sysLpad(gg ? gg.gid : 0, 5)}/${sysPad(g, 8)})\nAccess: ${ts}\nModify: ${ts}\nChange: ${ts}\n Birth: ${ts}\n`);
};
SYS_CMDS.which = function (args) {
  const out = []; let code = 0;
  const { flags, rest } = parseOpts(args);
  for (const a of rest) {
    if (this.aliases[a] && flags.has('a')) out.push(`alias ${a}='${this.aliases[a]}'`);
    const path = this.env.PATH.split(':').find(p => { const n = this.node(p + '/' + a); return n && n.t === 'f'; });
    if (path) { out.push(path + '/' + a); continue; }
    if (COMMANDS[a] || LAB_EXT.commands[a]) { if (['cd', 'alias', 'export', 'history', 'jobs', 'fg', 'bg', 'wait', 'umask', 'ulimit', 'set', 'unset', 'read', 'source', 'trap', 'declare', 'readonly', 'let', 'local', 'shift', 'type', 'exit', 'pwd', 'echo', 'test', 'true', 'false', 'kill', 'help', 'submit', 'cron-tick', 'at-tick', 'hello'].includes(a)) { if (a === 'echo' || a === 'pwd' || a === 'test' || a === 'kill' || a === 'true' || a === 'false') out.push('/usr/bin/' + a); else code = 1; continue; } out.push((['useradd', 'userdel', 'usermod', 'groupadd', 'groupdel', 'shutdown', 'reboot', 'poweroff', 'modprobe', 'rmmod', 'fdisk', 'hdparm', 'badblocks', 'blkid', 'dmidecode', 'updatedb', 'ifconfig', 'iptables', 'nft', 'sysctl', 'ipsec', 'swanctl', 'conntrack', 'ethtool', 'nginx', 'arp', 'chpasswd'].includes(a) ? '/usr/sbin/' : '/usr/bin/') + a); continue; }
    code = 1;
  }
  return { out: join(out), err: '', code };
};
SYS_CMDS.type = function (args) {
  const { flags, rest } = parseOpts(args);
  const out = []; let err = ''; let code = 0;
  const builtins = ['cd', 'alias', 'unalias', 'export', 'history', 'jobs', 'fg', 'bg', 'wait', 'umask', 'ulimit', 'set', 'unset', 'read', 'source', 'trap', 'declare', 'readonly', 'let', 'local', 'shift', 'type', 'exit', 'pwd', 'echo', 'test', 'true', 'false', 'kill', 'help', 'printf', 'disown', 'fc', ':', '[', '[['];
  for (const a of rest) {
    if (this.aliases[a]) { out.push(flags.has('t') ? 'alias' : `${a} is aliased to \`${this.aliases[a]}'`); continue; }
    if (this.funcs[a]) { out.push(flags.has('t') ? 'function' : `${a} is a function`); continue; }
    if (builtins.includes(a)) { out.push(flags.has('t') ? 'builtin' : `${a} is a shell builtin`); continue; }
    const w = SYS_CMDS.which.call(this, [a]);
    if (w.out) { out.push(flags.has('t') ? 'file' : `${a} is ${w.out.trim()}`); continue; }
    if (COMMANDS[a] || LAB_EXT.commands[a]) { out.push(flags.has('t') ? 'file' : `${a} is /usr/bin/${a}`); continue; }
    err += `bash: type: ${a}: not found\n`; code = 1;
  }
  return { out: join(out), err, code };
};
SYS_CMDS.xargs = function (args, stdin) {
  const longs = args.filter(a => a.startsWith('--'));
  let zero = false; let n = null; let repl = null; let trace = false; let noRun = false; let maxArgsSeen = false; const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (rest.length) { rest.push(a); continue; }
    if (a === '-0' || a === '--null') zero = true;
    else if (a === '-n' || a === '--max-args') { n = +args[++i]; maxArgsSeen = true; } else if (/^-n\d+$/.test(a)) { n = +a.slice(2); maxArgsSeen = true; }
    else if (a === '-I' || a === '--replace') repl = args[++i]; else if (/^-I.+$/.test(a)) repl = a.slice(2); else if (a === '-i') repl = '{}';
    else if (a === '-t' || a === '--verbose') trace = true; else if (a === '-r' || a === '--no-run-if-empty') noRun = true;
    else if (a === '-d' || a === '--delimiter') { const d = args[++i]; zero = d === '\\0'; if (d === '\\n' || d === '\n') zero = 'nl'; }
    else if (a === '-p' || a === '--interactive') { /* kabul */ } else if (a === '-P' || a === '--max-procs' || a === '-L' || a === '-s') i++;
    else if (a.startsWith('-') && a.length > 1 && !/^-\d/.test(a)) return fail(`xargs: invalid option -- '${a.slice(1)}'\nUsage: xargs [OPTION]... COMMAND [INITIAL-ARGS]...`, 1);
    else rest.push(a);
  }
  void longs; void maxArgsSeen;
  const input = stdin || '';
  const items = zero === true ? input.split('\0').filter(Boolean) : zero === 'nl' || repl ? lines(input).filter(Boolean) : input.split(/\s+/).filter(Boolean);
  const cmd = rest.length ? rest : ['echo'];
  if (!items.length && noRun) return ok();
  if (!zero && items.some(x => x.includes("'")) && false) { /* bash xargs: unmatched single quote */ }
  const hasQuote = !zero && !repl && /^\s*[^\n]*'[^']*$/m.test(input);
  if (hasQuote) return fail(`xargs: unmatched single quote; by default quotes are special to xargs unless you use the -0 option`, 1);
  const batches = [];
  if (repl) items.forEach(it => batches.push(cmd.map(c => c.split(repl).join(it))));
  else if (n) for (let i = 0; i < items.length; i += n) batches.push(cmd.concat(items.slice(i, i + n)));
  else batches.push(cmd.concat(items));
  let out = ''; let err = ''; let code = 0;
  for (const b of batches) { if (trace) err += b.join(' ') + '\n'; const r = this.execSimple(b, null, {}); out += r.out || ''; err += r.err || ''; if (r.code) code = 123; }
  if (!zero && !repl && items.length > 1 && cmd[0] === 'wc' && input.includes(' ') && lines(input).some(l => / /.test(l.trim()))) err += sysNote('Boşluklu bir ad boşluktan bölündü, wc iki ayrı dosya sandı. Çözüm find -print0 ile xargs -0, ya da doğrudan wc *', 'A name with a space was split at the space, wc saw two separate files. The fix is find -print0 with xargs -0, or just wc *') + '\n';
  return { out, err, code };
};
SYS_CMDS.ifconfig = function (args) {
  const r = SYS_OLD.ifconfig.call(this, args);
  if (args.length && !/^-a$/.test(args[0]) && !/^eth0$/.test(args[0])) { if (/^(eth1|eth2|wg0|docker0|lo)$/.test(args[0])) { const ipr = SYS_OLD.ip.call(this, ['addr', 'show', args[0]]); const inet = (/inet (\S+)/.exec(ipr.out || '') || [])[1] || ''; const [ip, len] = inet.split('/'); const mask = len ? [0, 0, 0, 0].map((x, i) => { const b = Math.max(0, Math.min(8, +len - i * 8)); return 256 - (1 << (8 - b)); }).join('.') : ''; return ok(`${args[0]}: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu ${args[0] === 'wg0' ? 1420 : args[0] === 'eth2' ? 1492 : args[0] === 'lo' ? 65536 : 1500}\n        inet ${ip}  netmask ${mask}${args[0] !== 'lo' && args[0] !== 'wg0' ? '  broadcast ' + ip.replace(/\d+$/, '255') : ''}\n\n${sysNote('ifconfig net-tools paketinden, 2009\'dan beri deprecated. Modern karşılığı ip addr show ' + args[0] + ', adres eklemek için sudo ip addr add 10.0.0.5/24 dev ' + args[0], 'ifconfig comes from the net-tools package, deprecated since 2009. The modern equivalent is ip addr show ' + args[0] + ', to add an address use sudo ip addr add 10.0.0.5/24 dev ' + args[0])}\n`); } if (args.includes('up') || args.includes('down') || /^\d/.test(args[1] || '')) return this.isRoot ? fail(`SIOCSIFFLAGS: ${sysNote('ifconfig ile adres ve link değişikliği lab\'da simüle edilmiyor, sudo ip addr add 10.0.0.5/24 dev eth0 ve sudo ip link set eth0 up kullan', 'Address and link changes with ifconfig are not simulated in the lab, use sudo ip addr add 10.0.0.5/24 dev eth0 and sudo ip link set eth0 up')}`) : fail('SIOCSIFFLAGS: Operation not permitted'); return fail(`${args[0]}: error fetching interface information: Device not found`); }
  return ok(r.out.replace(/\[ifconfig eskidi, ip addr kullanmaya alis\]|\[ifconfig is outdated, get used to ip addr\]/, sysNote("ifconfig net-tools paketinden, 2009'dan beri deprecated ve yeni kurulumlarda yok. Modern karşılığı ip addr, ip -br addr, ip link", 'ifconfig comes from the net-tools package, deprecated since 2009 and missing on new installs. The modern equivalent is ip addr, ip -br addr, ip link')));
};
SYS_CMDS.netstat = function (args) {
  const r = SYS_OLD.netstat.call(this, args);
  const { flags } = parseOpts(args);
  if (flags.has('r')) return ok('Kernel IP routing table\nDestination     Gateway         Genmask         Flags   MSS Window  irtt Iface\n0.0.0.0         192.168.1.1     0.0.0.0         UG        0 0          0 eth0\n10.8.0.0        0.0.0.0         255.255.255.0   U         0 0          0 wg0\n10.50.0.0       192.168.1.1     255.255.0.0     UG        0 0          0 eth0\n192.168.1.0     0.0.0.0         255.255.255.0   U         0 0          0 eth0\n192.168.2.0     0.0.0.0         255.255.255.0   U         0 0          0 eth1\n\n' + sysNote('netstat -r yerine ip route', 'use ip route instead of netstat -r') + '\n');
  if (flags.has('i')) return ok('Kernel Interface table\nIface      MTU    RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\ndocker0   1500        0      0      0 0             0      0      0      0 BMU\neth0      1500  2210488      0      0 0       1744021      0      0      0 BMRU\neth1      1500   981203   1843     12 0        744102      0      0      0 BMRU\neth2      1492   120330      0      0 0         98012      0      0      0 BMRU\nlo       65536   180211      0      0 0        180211      0      0      0 LRU\nwg0       1420    44102      0      0 0         40211      0      0      0 OPRU\n\n' + sysNote('netstat -i yerine ip -s link', 'use ip -s link instead of netstat -i') + '\n');
  const flagStr = [...flags].sort().join('');
  const ls = lines(r.out);
  const header = ls[0]; let rows = ls.slice(1);
  if (flags.has('l')) rows = rows.filter(x => /LISTEN|UNCONN/.test(x));
  if (flags.has('t') && !flags.has('u')) rows = rows.filter(x => x.startsWith('tcp'));
  if (flags.has('u') && !flags.has('t')) rows = rows.filter(x => x.startsWith('udp'));
  const out = ['Active Internet connections ' + (flags.has('l') ? '(only servers)' : flags.has('a') ? '(servers and established)' : '(w/o servers)'), 'Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    '];
  rows.forEach(x => { const p = x.trim().split(/\s+/); const proto = p[0]; const state = p[1] === 'UNCONN' ? '' : p[1] === 'ESTAB' ? 'ESTABLISHED' : p[1]; const prog = (/pid=(\d+)/.exec(x) || [])[1]; const name = (/\("([^"]+)"/.exec(x) || [])[1]; out.push(`${sysPad(proto, 5)} ${sysLpad(p[2], 6)} ${sysLpad(p[3], 6)} ${sysPad(p[4].replace('%lo', ''), 23)} ${sysPad(p[5], 23)} ${sysPad(state, 11)} ${prog ? prog + '/' + name : flags.has('p') && !this.isRoot ? '-' : '-'}`); });
  void header; void flagStr;
  return ok(join(out) + '\n' + sysNote(`netstat net-tools paketinden, deprecated. Modern karşılığı ss -tulpn${!this.isRoot && flags.has('p') ? '. Başkasının PID bilgisi için sudo' : ''}`, `netstat comes from the net-tools package and is deprecated. The modern equivalent is ss -tulpn${!this.isRoot && flags.has('p') ? '. For PIDs of other users use sudo' : ''}`) + '\n');
};
SYS_CMDS.ip = function (args) {
  sysEnsure(this);
  const plain = args.filter(a => !a.startsWith('-'));
  const sub = plain[0] || ''; const rest = plain.slice(1);
  if (['a', 'addr', 'address'].includes(sub) && (rest[0] === 'add' || rest[0] === 'del' || rest[0] === 'delete')) {
    const spec = rest[1]; const di = rest.indexOf('dev'); const dev = di >= 0 ? rest[di + 1] : null;
    if (!spec) return fail('Command line is not complete. Try option "help" or "--help" for more information.', 1);
    if (!/^\d+\.\d+\.\d+\.\d+(\/\d+)?$/.test(spec)) return fail(`Error: any valid prefix is expected rather than "${spec}".`, 1);
    if (!dev) return fail('Not enough information: "dev" argument is required.\n' + sysNote('Adres tek başına yetmez, hangi interface\'e eklendiği de gerekir: sudo ip addr add ' + spec + (spec.includes('/') ? '' : '/24') + ' dev eth0', 'An address alone is not enough, you also need the interface it goes on, sudo ip addr add ' + spec + (spec.includes('/') ? '' : '/24') + ' dev eth0'), 2);
    if (!['eth0', 'eth1', 'eth2', 'lo', 'docker0', 'wg0'].includes(dev)) return fail(`Cannot find device "${dev}"`, 1);
    if (!this.isRoot) return fail('RTNETLINK answers: Operation not permitted\n' + sysNote('Interface ayarı root ister, sudo ip addr ' + rest[0] + ' ' + spec + ' dev ' + dev, 'Interface settings need root, sudo ip addr ' + rest[0] + ' ' + spec + ' dev ' + dev), 2);
    const st = sysState(this); const extra = st.extra ? st.extra.split(',').filter(Boolean) : [];
    const full = spec.includes('/') ? spec : spec + '/32';
    const key = full + '@' + dev;
    if (rest[0] === 'add') { if (extra.includes(key)) return fail('RTNETLINK answers: File exists', 2); extra.push(key); st.extra = extra.join(','); sysSetState(this, st); return ok(spec.includes('/') ? '' : sysNote('Prefix vermedin, kernel /32 yazdı yani tek adres, o subnet için route oluşmadı. Genelde istenen ' + spec + '/24', 'You gave no prefix, so the kernel used /32, a single address, and no route was created for that subnet. Usually you want ' + spec + '/24') + '\n'); }
    const idx = extra.findIndex(e => e === key || e.split('@')[0].split('/')[0] === spec.split('/')[0] && e.endsWith('@' + dev));
    if (idx < 0) return fail('RTNETLINK answers: Cannot assign requested address', 2);
    extra.splice(idx, 1); st.extra = extra.join(','); sysSetState(this, st); return ok();
  }
  const r = SYS_OLD.ip.call(this, args);
  if (['a', 'addr', 'address'].includes(sub) && r.out) {
    const st = sysState(this); const extra = st.extra ? st.extra.split(',').filter(Boolean) : [];
    if (extra.length) { let out = r.out; extra.forEach(e => { const [addr, dev] = e.split('@'); const brief = args.includes('-br') || args.includes('-brief'); if (brief) out = out.replace(new RegExp('^(' + dev + '\\s+\\S+\\s+.*)$', 'm'), '$1 ' + addr); else out = out.replace(new RegExp('(\\d+: ' + dev + ':[^]*?\\n    inet [^\\n]*\\n)'), `$1    inet ${addr} scope global ${addr.endsWith('/32') ? '' : 'secondary '}${dev}\n       valid_lft forever preferred_lft forever\n`); }); r.out = out; }
  }
  return r;
};
SYS_CMDS.mkdir = function (args) {
  sysEnsure(this);
  const before = new Set();
  const { rest } = parseOpts(args, 'm');
  rest.forEach(d => { if (this.node(this.resolve(d))) before.add(this.resolve(d)); });
  const r = SYS_OLD.mkdir.call(this, args);
  const st = sysState(this); const um = parseInt(st.umask, 8);
  const mi = args.indexOf('-m'); const mode = mi >= 0 ? parseInt(args[mi + 1], 8) : null;
  rest.forEach(d => { const abs = this.resolve(d); const n = this.node(abs); if (n && !before.has(abs)) n.m = mode !== null && !isNaN(mode) ? mode : 0o777 & ~um; });
  return r;
};
SYS_CMDS.cp = function (args) {
  const { flags, rest } = parseOpts(args);
  if (flags.has('a') || flags.has('p')) {
    const dest = rest[rest.length - 1]; const destAbs = this.resolve(dest); const dn = this.node(destAbs);
    const srcs = rest.slice(0, -1).map(s => ({ s, abs: this.resolve(s), n: this.node(this.resolve(s)) }));
    const r = SYS_OLD.cp.call(this, args);
    srcs.forEach(({ abs, n }) => { if (!n) return; const t = dn && dn.t === 'd' ? destAbs + '/' + abs.split('/').pop() : destAbs; const c = this.node(t); if (!c) return; const keep = (a, b) => { b.m = a.m; b.ts = a.ts; if (this.isRoot) { b.o = a.o; b.g = a.g; } if (a.t === 'd' && b.t === 'd') Object.keys(a.c).forEach(k => { if (b.c[k]) keep(a.c[k], b.c[k]); }); }; keep(n, c); });
    return r;
  }
  return SYS_OLD.cp.call(this, args);
};

/* ======================================================================
   13. Degiskenler: set, readonly, declare, export, unset
   ====================================================================== */
SYS_CMDS.set = function (args) {
  sysEnsure(this);
  if (!args.length) {
    const out = Object.keys(this.env).sort().map(k => `${k}=${/[\s'"$]/.test(this.env[k]) || this.env[k] === '' ? "'" + this.env[k].replace(/'/g, "'\\''") + "'" : this.env[k]}`);
    out.push('PWD=' + this.cwd, 'BASH=/usr/bin/bash', 'BASH_VERSION=\'5.2.21(1)-release\'', 'HISTSIZE=1000', 'HOSTTYPE=x86_64', 'OSTYPE=linux-gnu', 'PS1=\'\\u@\\h:\\w\\$ \'', 'UID=' + (this.isRoot ? 0 : 1000), 'SHLVL=1', 'TERM=xterm-256color');
    Object.keys(this.funcs).sort().forEach(f => out.push(`${f} () \n{ \n    ...\n}`));
    return ok(join(out.sort()));
  }
  const st = sysState(this); const opts = new Set((st.setopts || '').split(',').filter(Boolean));
  const notes = [];
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--') { this.positional = args.slice(i + 1); return ok(); }
    if (a === '-o' || a === '+o') { const name = args[++i]; if (!name) return ok(join(['allexport     \toff', 'braceexpand   \ton', 'errexit       \t' + (opts.has('e') ? 'on' : 'off'), 'noclobber     \t' + (opts.has('C') ? 'on' : 'off'), 'nounset       \t' + (opts.has('u') ? 'on' : 'off'), 'pipefail      \t' + (opts.has('pipefail') ? 'on' : 'off'), 'xtrace        \t' + (opts.has('x') ? 'on' : 'off')])); const map = { errexit: 'e', xtrace: 'x', nounset: 'u', noclobber: 'C', pipefail: 'pipefail', verbose: 'v' }; if (!map[name]) return fail(`bash: set: ${name}: invalid option name`, 2); if (a === '-o') opts.add(map[name]); else opts.delete(map[name]); i++; continue; }
    if (/^[-+][a-zA-Z]+$/.test(a)) { const on = a[0] === '-'; for (const ch of a.slice(1)) { if (!'exuvCnfhBHmkpat'.includes(ch)) return fail(`bash: set: -${ch}: invalid option\nset: usage: set [-abefhkmnptuvxBCEHPT] [-o option-name] [--] [-] [arg ...]`, 2); if (on) opts.add(ch); else opts.delete(ch); } i++; continue; }
    this.positional = args.slice(i); break;
  }
  st.setopts = [...opts].join(','); sysSetState(this, st);
  if (opts.has('e')) notes.push(lt('set -e açık, script içinde bir komut sıfır dışı exit code verirse script orada durur', 'set -e is on, if a command in a script exits non zero the script stops there'));
  if (opts.has('x')) notes.push(lt('set -x açık, script içinde her komut çalışmadan önce + ile ekrana yazılır, debug için birebir', 'set -x is on, each command in a script is printed with + before it runs, perfect for debugging'));
  if (opts.has('u')) notes.push(lt('set -u açık, tanımsız değişken kullanımı hata verir', 'set -u is on, using an undefined variable is an error'));
  if (opts.has('pipefail')) notes.push(lt('pipefail açık, pipe içindeki herhangi bir komut fail olursa pipe fail sayılır', 'pipefail is on, if any command in a pipe fails the whole pipe fails'));
  return ok(notes.length ? sysNote(notes.join('. ') + ". Lab'ın interaktif satırında bu bayraklar sadece kaydedilir, bash script başına set -euxo pipefail koymak iyi alışkanlık", notes.join('. ') + '. On the interactive lab prompt these flags are only recorded, putting set -euxo pipefail at the top of a bash script is a good habit') + '\n' : '');
};
SYS_CMDS.readonly = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  if (!rest.length || flags.has('p')) return ok(join([...this.sysReadonly].sort().map(k => `declare -r ${k}="${this.env[k] === undefined ? '' : this.env[k]}"`)));
  for (const a of rest) { const k = a.indexOf('='); const name = k > 0 ? a.slice(0, k) : a; if (this.sysReadonly.has(name) && k > 0) return fail(`bash: ${name}: readonly variable`, 1); if (k > 0) this.env[name] = a.slice(k + 1); this.sysReadonly.add(name); }
  return ok();
};
SYS_CMDS.declare = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  if (flags.has('p') || (!rest.length && !flags.size)) { const list = rest.length ? rest : Object.keys(this.env).sort(); const out = []; let err = ''; for (const k of list) { if (this.env[k] === undefined) { err += `bash: declare: ${k}: not found\n`; continue; } out.push(`declare -${this.sysReadonly.has(k) ? 'r' : ''}${(this.sysInt || new Set()).has(k) ? 'i' : ''}${k === k.toUpperCase() && ['HOME', 'PATH', 'USER', 'SHELL', 'LANG', 'EDITOR', 'HOSTNAME'].includes(k) ? 'x' : ''}${this.sysReadonly.has(k) || (this.sysInt || new Set()).has(k) ? '' : '-'} ${k}="${this.env[k]}"`); } return { out: join(out), err, code: err ? 1 : 0 }; }
  if (flags.has('f') || flags.has('F')) { const names = rest.length ? rest : Object.keys(this.funcs); const out = []; names.forEach(n => { if (this.funcs[n]) out.push(flags.has('F') ? `declare -f ${n}` : `${n} () \n{ \n    ...\n}`); }); return { out: join(out), err: '', code: 0 }; }
  if (flags.has('a') || flags.has('A')) return ok(sysNote('Bash dizileri bu lab\'da simüle edilmiyor, düz değişken ve for döngüsü kullan', 'Bash arrays are not simulated in this lab, use plain variables and a for loop') + '\n');
  this.sysInt = this.sysInt || new Set();
  let err = '';
  for (const a of rest) {
    const k = a.indexOf('='); const name = k > 0 ? a.slice(0, k) : a; let val = k > 0 ? a.slice(k + 1) : undefined;
    if (!/^[A-Za-z_]\w*$/.test(name)) { err += `bash: declare: \`${a}': not a valid identifier\n`; continue; }
    if (this.sysReadonly.has(name) && k > 0) { err += `bash: declare: ${name}: readonly variable\n`; continue; }
    if (flags.has('i')) { this.sysInt.add(name); if (val !== undefined) { try { val = String(this.arith(val)); } catch (e) { val = '0'; } } else if (this.env[name] === undefined) val = '0'; }
    if (flags.has('r')) this.sysReadonly.add(name);
    if (flags.has('u') && val !== undefined) val = val.toUpperCase(); if (flags.has('l') && val !== undefined) val = val.toLowerCase();
    if (val !== undefined) this.env[name] = val; else if (this.env[name] === undefined && !flags.has('i')) this.env[name] = '';
    if (this.localScope) this.localScope.push(name);
  }
  return { out: '', err, code: err ? 1 : 0 };
};
SYS_CMDS.unset = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args);
  let err = '';
  for (const a of rest) { if (flags.has('f')) { delete this.funcs[a]; continue; } if (this.sysReadonly.has(a)) { err += `bash: unset: ${a}: cannot unset: readonly variable\n`; continue; } if (this.funcs[a] && this.env[a] === undefined) { delete this.funcs[a]; continue; } delete this.env[a]; if (this.sysInt) this.sysInt.delete(a); }
  return { out: '', err, code: err ? 1 : 0 };
};
SYS_CMDS.export = function (args) {
  sysEnsure(this);
  const { flags, rest } = parseOpts(args, 'n');
  if (flags.has('p') || !args.length) return ok(join(Object.keys(this.env).sort().map(k => `declare -x ${k}="${this.env[k]}"`)));
  for (const a of rest) { const k = a.indexOf('='); const name = k > 0 ? a.slice(0, k) : a; if (this.sysReadonly.has(name) && k > 0) return fail(`bash: export: ${name}: readonly variable`, 1); if (!/^[A-Za-z_]\w*$/.test(name)) return fail(`bash: export: \`${a}': not a valid identifier`, 1); }
  return SYS_OLD.export.call(this, rest);
};
SYS_CMDS.getent = function (args) {
  sysEnsure(this);
  if (args[0] === 'passwd' || args[0] === 'group' || args[0] === 'shadow') {
    if (args[0] === 'shadow' && !this.isRoot) return { out: '', err: '', code: 2 };
    const data = sysRead(this, '/etc/' + args[0]);
    if (!args[1]) return ok(data);
    const l = lines(data).find(x => x.split(':')[0] === args[1] || (x.split(':')[2] === args[1] && /^\d+$/.test(args[1])));
    return l ? ok(l + '\n') : { out: '', err: '', code: 2 };
  }
  if (args[0] === 'hosts' && args[1] && SYS_HOSTS[args[1]]) return ok(`${SYS_HOSTS[args[1]]}\t${args[1]}\n`);
  if (args[0] === 'services') { const m = { ssh: 22, http: 80, https: 443, smtp: 25, domain: 53, ntp: 123, mysql: 3306, postgresql: 5432 }; const k = args[1]; const port = m[k] || Object.keys(m).find(x => String(m[x]) === k); if (!port) return { out: '', err: '', code: 2 }; return ok(typeof port === 'number' ? `${k}\t\t${port}/tcp\n` : `${port}\t\t${k}/tcp\n`); }
  return SYS_OLD.getent.call(this, args);
};

/* ======================================================================
   Shell sarmalamalari: history expansion, cmd &, trap, symlink, umask
   ====================================================================== */
const SYS_RUN = Shell.prototype.run;
const SYS_RUNSCRIPT = Shell.prototype.runScript;
const SYS_READFILE = Shell.prototype.readFile;
const SYS_WRITEFILE = Shell.prototype.writeFile;

/* !!, !$, !*, !n, !-n, !kelime. Tek tirnak icini atlar */
function sysHistExpand(sh, line) {
  const h = sh.history;
  const last = h.length ? h[h.length - 1] : null;
  let out = ''; let q = null; let changed = false; let err = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { out += ch; if (ch === q) q = null; continue; }
    if (ch === "'") { q = ch; out += ch; continue; }
    if (ch === '\\' && i + 1 < line.length) { out += ch + line[i + 1]; i++; continue; }
    if (ch === '!' && i + 1 < line.length && !/[\s=(]/.test(line[i + 1])) {
      const rest = line.slice(i + 1);
      let m; let rep = null; let len = 0;
      if (rest[0] === '!') { rep = last; len = 1; if (rep === null) err = '!!'; }
      else if (rest[0] === '$') { rep = last ? last.trim().split(/\s+/).pop() : null; len = 1; if (rep === null) err = '!$'; }
      else if (rest[0] === '*') { rep = last ? last.trim().split(/\s+/).slice(1).join(' ') : null; len = 1; if (rep === null) err = '!*'; }
      else if (rest[0] === '^') { rep = last ? last.trim().split(/\s+/)[1] || '' : null; len = 1; if (rep === null) err = '!^'; }
      else if ((m = /^-(\d+)/.exec(rest))) { rep = h[h.length - +m[1]] || null; len = m[0].length; if (rep === null) err = '!' + m[0]; }
      else if ((m = /^(\d+)/.exec(rest))) { rep = h[+m[1] - 1] || null; len = m[0].length; if (rep === null) err = '!' + m[0]; }
      else if ((m = /^\?([^?]+)\??/.exec(rest))) { rep = [...h].reverse().find(x => x.includes(m[1])) || null; len = m[0].length; if (rep === null) err = '!' + m[0]; }
      else if ((m = /^([A-Za-z_][\w-]*)/.exec(rest))) { rep = [...h].reverse().find(x => x.startsWith(m[1])) || null; len = m[0].length; if (rep === null) err = '!' + m[1]; }
      if (err) return { err };
      if (rep !== null) { out += rep; i += len; changed = true; continue; }
    }
    if (ch === '"') { out += ch; continue; }
    out += ch;
  }
  return { line: out, changed };
}
Shell.prototype.run = function (line) {
  sysEnsure(this);
  let text = String(line == null ? '' : line);
  const raw = text.trim();
  const chunks = [];
  const write = (t, cls) => { if (t) chunks.push({ text: t, cls: cls || '' }); };
  if (/!/.test(raw) && !/^\s*#/.test(raw)) {
    const r = sysHistExpand(this, raw);
    if (r.err) { this.ui = {}; this.lastCode = 1; return { chunks: [{ text: `bash: ${r.err}: event not found\n`, cls: 'err' }], ui: this.ui }; }
    if (r.changed) { text = r.line; write(text + '\n', 'sys'); }
  }
  if (text.includes('$!')) text = text.split('$!').join(String(this.sysLastBg || ''));
  const t = text.trim();
  if (/\s&$/.test(t) && !/&&$/.test(t) && !/[>|]\s*&$/.test(t) && (t.split("'").length % 2 === 1)) {
    const cmd = t.replace(/\s*&$/, '').trim();
    this.ui = {};
    if (!cmd) { this.lastCode = 2; return { chunks: [{ text: "bash: syntax error near unexpected token `&'\n", cls: 'err' }], ui: this.ui }; }
    if (!raw.startsWith(' ')) this.history.push(t);
    try {
      if (/^\s*(if|for|while|until|case)\b/.test(cmd) || cmd.includes(';') || cmd.includes('&&') || cmd.includes('||')) { const buf = []; this.execList(cmd, (x, cls) => (cls === 'err' ? write(x, cls) : buf.push(x))); if (buf.length) write(buf.join('')); }
      else sysBackground(this, cmd, write);
    } catch (e) { write('bash: ' + (e.message || e) + '\n', 'err'); this.lastCode = 1; }
    this.isRoot = false;
    return { chunks, ui: this.ui };
  }
  const r = SYS_RUN.call(this, text);
  if (chunks.length) r.chunks.unshift(...chunks);
  return r;
};
/* script bitince EXIT trap'i calisir, set -x ve set -e script icinde uygulanir */
Shell.prototype.runScript = function (path, args, needExec, stdin) {
  sysEnsure(this);
  const savedTraps = this.sysTraps; this.sysTraps = {};
  const r = SYS_RUNSCRIPT.call(this, path, args, needExec, stdin);
  const trap = this.sysTraps.EXIT;
  this.sysTraps = savedTraps;
  if (trap && r && typeof r === 'object') {
    const buf = []; const errs = [];
    try { this.execList(trap, (t, cls) => (cls === 'err' ? errs : buf).push(t)); } catch (e) { errs.push('bash: ' + e.message + '\n'); }
    r.out = (r.out || '') + buf.join(''); r.err = (r.err || '') + errs.join('');
  }
  return r;
};
Shell.prototype.readFile = function (path, cmd) {
  const abs = this.resolve(path);
  const n = this.node(abs);
  if (n && n.l) {
    const target = sysLinkTarget(this, abs, n);
    const tn = this.node(target);
    if (!tn) return { err: `${cmd}: ${path}: No such file or directory` };
    if (tn.t === 'd') return { err: `${cmd}: ${path}: Is a directory` };
    if (!this.canRead(tn)) return { err: `${cmd}: ${path}: Permission denied` };
    return { data: tn.d };
  }
  return SYS_READFILE.call(this, path, cmd);
};
Shell.prototype.writeFile = function (path, data, append, cmd) {
  const abs = this.resolve(path);
  const n = this.node(abs);
  if (n && n.l) { const target = sysLinkTarget(this, abs, n); if (this.node(target) || this.node(this.parent(target).ppath)) return SYS_WRITEFILE.call(this, target, data, append, cmd); }
  if (n && n.at && n.at.includes('i')) return `${cmd}: ${path}: Operation not permitted`;
  if (n && n.at && n.at.includes('a') && !append) return `${cmd}: ${path}: Operation not permitted`;
  const existed = !!n;
  const r = SYS_WRITEFILE.call(this, path, data, append, cmd);
  if (!existed && !r) { const created = this.node(abs); if (created) { const st = sysState(this); created.m = 0o666 & ~parseInt(st.umask, 8); } }
  return r;
};

/* ======================================================================
   Man sayfalari
   ====================================================================== */
const SYS_MANUAL = {
  useradd: { d: 'Yeni kullanıcı hesabı açar, root ister. Debian\'da home açmaz, -m ister', u: ['sudo useradd -m -s /bin/bash -G grup1,grup2 isim', '-m home directory açar, -s login shell, -G ek gruplar, -u uid, -c açıklama', 'Hesap kilitli gelir, sudo passwd isim ile şifre ver'], e: ['sudo useradd -m -s /bin/bash ali', 'sudo useradd -m -G sudo,docker -s /bin/bash ayse'] },
  adduser: { d: 'Debian\'ın dost canlısı useradd\'i. Home açar, skel kopyalar, şifre sorar. adduser user grup ile gruba ekler', u: ['sudo adduser isim', 'sudo adduser isim grup'], e: ['sudo adduser ali', 'sudo adduser ali sudo'] },
  userdel: { d: 'Kullanıcıyı siler, root ister. -r olmadan home directory kalır', u: ['sudo userdel [-r] isim', '-r home ve mail spool da silinir'], e: ['sudo userdel -r ali'] },
  usermod: { d: 'Var olan hesabı değiştirir, root ister. Grup eklerken -aG, yoksa -G listeyi değiştirir', u: ['sudo usermod -aG grup isim', 'sudo usermod -s /bin/bash isim', 'sudo usermod -L isim  kilitle, -U aç', 'sudo usermod -d /yeni/home -m isim', 'sudo usermod -l yeniad eskiad'], e: ['sudo usermod -aG sudo ali', 'sudo usermod -s /bin/bash ali', 'sudo usermod -L deploy'] },
  groupadd: { d: 'Yeni grup açar, root ister', u: ['sudo groupadd [-g gid] grup'], e: ['sudo groupadd devops'] },
  groupdel: { d: 'Grubu siler, root ister. Birinin primary grubu silinemez', u: ['sudo groupdel grup'], e: ['sudo groupdel devops'] },
  chgrp: { d: 'Dosyanın grubunu değiştirir. Sıradan kullanıcı sadece üyesi olduğu gruba verebilir', u: ['chgrp [-R] grup dosya'], e: ['chgrp developers rapor.txt', 'sudo chgrp -R www-data /var/www'] },
  passwd: { d: 'Şifre değiştirir. Gerçekte interaktif sorar, lab\'da prompt yok, şifre lab123 kabul edilir', u: ['passwd  kendi şifren', 'sudo passwd isim', 'sudo passwd -l isim  kilitle, -u aç', 'passwd -S isim  durum, P açık L kilitli NP şifresiz', 'echo "isim:sifre" | sudo chpasswd  script için'], e: ['sudo passwd ali', 'passwd -S ali', 'sudo passwd -l ali'] },
  chpasswd: { d: 'stdin\'den user:sifre çiftleri okur, script ve toplu işler için', u: ['echo "isim:sifre" | sudo chpasswd'], e: ['echo "ali:Gizli123" | sudo chpasswd'] },
  last: { d: 'Son login\'leri ve reboot\'ları wtmp\'den listeler', u: ['last [isim] [-n N]', 'last reboot  sadece boot kayıtları'], e: ['last', 'last reboot', 'last -n 5 burak'] },
  lastlog: { d: 'Her kullanıcının son login zamanı', u: ['lastlog', 'lastlog -u isim'], e: ['lastlog', 'lastlog -u deploy'] },
  w: { d: 'Kim login olmuş, ne çalıştırıyor, uptime ve load ile birlikte', u: ['w', 'w -h  başlıksız'], e: ['w'] },
  who: { d: 'Login olan kullanıcılar. -b boot zamanı, -r runlevel', u: ['who', 'who -b', 'who -r', 'who -a', 'who am i'], e: ['who', 'who -b'] },
  finger: { d: 'Kullanıcı bilgisi. Çoğu sunucuda kurulu değil, standart araçlar id, w, getent passwd', u: ['finger [isim]'], e: ['finger', 'finger burak'] },
  groups: { d: 'Kullanıcının üye olduğu grupları yazar', u: ['groups [isim]'], e: ['groups', 'groups ali'] },
  lscpu: { d: 'CPU mimarisi, çekirdek sayısı, cache ve sanallaştırma bilgisi', u: ['lscpu'], e: ['lscpu', 'lscpu | grep -i "model name"'] },
  dmidecode: { d: 'BIOS ve donanım tablolarını SMBIOS\'tan okur, root ister', u: ['sudo dmidecode', 'sudo dmidecode -t memory|system|bios|processor', 'sudo dmidecode -s system-product-name'], e: ['sudo dmidecode -t memory', 'sudo dmidecode -s system-manufacturer'] },
  lsblk: { d: 'Blok aygıtları ağaç halinde listeler, -f ile filesystem ve UUID', u: ['lsblk', 'lsblk -f'], e: ['lsblk', 'lsblk -f'] },
  lshw: { d: 'Donanım envanteri, -short tek satırlık özet, tam liste root ister', u: ['sudo lshw -short', 'sudo lshw -class network', 'sudo lshw'], e: ['sudo lshw -short', 'sudo lshw -class disk'] },
  lspci: { d: 'PCI aygıtları. -k driver, -tv ağaç', u: ['lspci', 'lspci -k', 'lspci -tv', 'lspci -v'], e: ['lspci', 'lspci -k | grep -A2 Ethernet'] },
  lsusb: { d: 'USB aygıtları. -tv ağaç, -v ayrıntı', u: ['lsusb', 'lsusb -tv'], e: ['lsusb', 'lsusb -tv'] },
  hdparm: { d: 'Disk parametreleri ve hız testi, root ister', u: ['sudo hdparm -i /dev/sda  kimlik', 'sudo hdparm -tT /dev/sda  cache ve disk okuma hızı'], e: ['sudo hdparm -i /dev/sda', 'sudo hdparm -tT /dev/sda'] },
  badblocks: { d: 'Diskte bozuk blok arar, root ister. -w yazma testi her şeyi siler', u: ['sudo badblocks -s /dev/sdb1  ilerleme göstererek', 'sudo badblocks -sv /dev/sdb1'], e: ['sudo badblocks -s /dev/sdb1'] },
  gzip: { d: 'Dosyayı sıkıştırır, .gz ekler ve orijinali siler. -k orijinali korur, -d açar', u: ['gzip [-k] [-9] dosya', 'gzip -d dosya.gz', 'gunzip dosya.gz', 'zcat dosya.gz'], e: ['gzip -k big.log', 'gunzip big.log.gz', 'zcat big.log.gz | head'] },
  gunzip: { d: '.gz dosyasını açar', u: ['gunzip dosya.gz', 'gunzip -k dosya.gz  arşivi koru'], e: ['gunzip notes.gz'] },
  zcat: { d: '.gz dosyasını açmadan ekrana basar', u: ['zcat dosya.gz'], e: ['zcat /var/log/syslog.1.gz | grep error'] },
  xz: { d: 'LZMA ile sıkıştırır, gzip\'ten küçük çıktı, daha yavaş', u: ['xz [-k] dosya', 'xz -d dosya.xz', 'unxz dosya.xz', 'xzcat dosya.xz'], e: ['xz -k big.log', 'unxz big.log.xz'] },
  bzip2: { d: 'bzip2 ile sıkıştırır, .bz2', u: ['bzip2 [-k] dosya', 'bunzip2 dosya.bz2', 'bzcat dosya.bz2'], e: ['bzip2 -k big.log'] },
  tar: { d: 'Arşiv aracı. c oluştur, x çıkar, t listele, v ayrıntı, f dosya, z gzip, j bzip2, J xz', u: ['tar czvf arsiv.tar.gz dizin', 'tar xzvf arsiv.tar.gz [-C hedef]', 'tar tf arsiv.tar  içini listele, çıkarmadan önce bak', 'tar cf arsiv.tar dosya1 dosya2', 'tar --exclude="*.log" -czf arsiv.tgz dizin', 'tar xf arsiv.tar --strip-components=1'], e: ['tar czvf etc-backup.tar.gz /etc/nginx', 'tar tf etc-backup.tar.gz', 'tar xzvf etc-backup.tar.gz -C /tmp/restore'] },
  zip: { d: 'zip arşivi oluşturur, Windows ile paylaşım için. Dizin için -r', u: ['zip arsiv.zip dosya...', 'zip -r arsiv.zip dizin'], e: ['zip -r proje.zip ~/projects/webapp'] },
  unzip: { d: 'zip arşivini açar, -l sadece listeler, -d hedef dizin', u: ['unzip arsiv.zip', 'unzip -l arsiv.zip', 'unzip arsiv.zip -d hedef'], e: ['unzip -l proje.zip', 'unzip proje.zip -d /tmp/x'] },
  apt: { d: 'Debian ve Ubuntu paket yöneticisinin modern ön yüzü. Kurulum root ister', u: ['sudo apt update  paket listesini tazele', 'sudo apt install [-y] paket', 'sudo apt remove paket, purge config dahil siler', 'apt list --installed', 'apt search kelime', 'apt show paket', 'sudo apt upgrade'], e: ['sudo apt update', 'sudo apt install htop', 'apt search json', 'apt list --installed | grep nginx'] },
  'apt-get': { d: 'apt\'nin script dostu eski ön yüzü. Çıktısı sabit, otomasyonda -y ile', u: ['sudo apt-get update', 'sudo apt-get install -y paket', 'sudo apt-get remove paket'], e: ['sudo apt-get install -y htop'] },
  'apt-cache': { d: 'Paket veritabanında arama, apt search ve apt show ile aynı iş', u: ['apt-cache search kelime', 'apt-cache show paket', 'apt-cache policy paket'], e: ['apt-cache policy nginx'] },
  dpkg: { d: 'Debian paketlerinin düşük seviye aracı. Bağımlılık çözmez, apt onun üstünde çalışır', u: ['dpkg -l [desen]  kurulu paketler', 'dpkg -L paket  paketin dosyaları', 'dpkg -s paket  durum', 'dpkg -S /yol/dosya  hangi paketten', 'sudo dpkg -i paket.deb', 'sudo dpkg -r paket'], e: ['dpkg -l | grep nginx', 'dpkg -L curl', 'dpkg -S /usr/bin/ss'] },
  dnf: { d: 'RHEL, Fedora, Rocky ve Alma paket yöneticisi, yum\'un yerini aldı. Bu kutu Debian, burada apt', u: ['sudo dnf install paket', 'sudo dnf remove paket', 'dnf search kelime', 'dnf info paket', 'dnf list installed'], e: ['sudo dnf install htop', 'dnf search nginx'] },
  yum: { d: 'Eski RHEL paket yöneticisi, modern sistemde dnf\'e symlink', u: ['sudo yum install paket', 'yum list installed'], e: ['sudo yum install htop'] },
  rpm: { d: 'RPM paketlerinin düşük seviye aracı, dpkg\'nin RHEL karşılığı', u: ['rpm -qa  kurulu paketler', 'rpm -qi paket  bilgi', 'rpm -ql paket  dosyalar', 'sudo rpm -ivh paket.rpm  kur', 'sudo rpm -e paket  kaldır'], e: ['rpm -qa | grep nginx', 'rpm -qi curl'] },
  make: { d: 'Makefile\'daki hedefleri derler. Kaynaktan kurulumun klasik üçlüsü ./configure, make, sudo make install', u: ['./configure [--prefix=/dizin]', 'make', 'sudo make install', 'make clean'], e: ['cd ~/src/hello-2.12 && ./configure && make', 'sudo make install'] },
  gcc: { d: 'C derleyicisi, lab\'da hello.c tarzı basit dosyaları derler', u: ['gcc -o cikti kaynak.c'], e: ['gcc -o hello src/hello.c'] },
  cal: { d: 'Takvim gösterir. Argümansız bu ay, yıl verirsen tüm yıl', u: ['cal', 'cal 2026', 'cal 10 2026', 'cal -3  önceki ve sonraki ay'], e: ['cal', 'cal 12 2026'] },
  hostname: { d: 'Makine adı. -I tüm IP adresleri, -f FQDN. Küçük l diye bir seçenek yok', u: ['hostname', 'hostname -I', 'hostname -f', 'hostname -s'], e: ['hostname -I', 'hostname -f'] },
  hostnamectl: { d: 'systemd ile hostname görüntüle ve kalıcı değiştir', u: ['hostnamectl', 'sudo hostnamectl set-hostname yeniad'], e: ['hostnamectl'] },
  lsmod: { d: 'Yüklü kernel modüllerini listeler, /proc/modules okur', u: ['lsmod', 'lsmod | grep modul'], e: ['lsmod | grep wireguard'] },
  modprobe: { d: 'Kernel modülü yükler, bağımlılıklarıyla birlikte. root ister', u: ['sudo modprobe modul', 'sudo modprobe -r modul  kaldır', 'modprobe -n modul  dry run'], e: ['sudo modprobe vfat', 'sudo modprobe -r dummy'] },
  rmmod: { d: 'Kernel modülünü kaldırır, kullanımdaysa reddeder. root ister', u: ['sudo rmmod modul'], e: ['sudo rmmod dummy'] },
  modinfo: { d: 'Modül dosyası hakkında bilgi, bağımlılıklar ve parametreler', u: ['modinfo modul'], e: ['modinfo wireguard'] },
  shutdown: { d: 'Sistemi kapatır ya da yeniden başlatır, root ister. Modern systemd shutdown default olarak poweroff', u: ['sudo shutdown now  hemen kapat', 'sudo shutdown +5 "mesaj"  5 dakika sonra', 'sudo shutdown 23:30', 'sudo shutdown -r now  yeniden başlat', 'sudo shutdown -c  iptal', 'Eski sistemlerde -h gerekirdi, shutdown -h now hâlâ çalışır'], e: ['sudo shutdown -r +5 "kernel update"', 'sudo shutdown -c', 'sudo shutdown now'] },
  reboot: { d: 'Hemen yeniden başlatır, shutdown -r now ile aynı', u: ['sudo reboot'], e: ['sudo reboot'] },
  poweroff: { d: 'Hemen kapatır, shutdown now ile aynı', u: ['sudo poweroff'], e: ['sudo poweroff'] },
  halt: { d: 'CPU\'yu durdurur, gücü kesmeyebilir. Genelde poweroff istenir', u: ['sudo halt'], e: ['sudo halt'] },
  wall: { d: 'Tüm login olmuş kullanıcılara mesaj yollar', u: ['wall "mesaj"', 'echo mesaj | wall'], e: ['sudo wall "Sunucu 10 dakikaya kapanacak"'] },
  timedatectl: { d: 'Saat, saat dilimi ve NTP durumu. Dilimi değiştirmek root ister', u: ['timedatectl', 'timedatectl list-timezones | grep Istanbul', 'sudo timedatectl set-timezone Europe/Istanbul', 'sudo timedatectl set-ntp true'], e: ['timedatectl', 'sudo timedatectl set-timezone Europe/Istanbul'] },
  ulimit: { d: 'Shell ve child process\'lerinin kaynak limitleri. Açık dosya sayısı en bilineni', u: ['ulimit -a  hepsi', 'ulimit -n  açık dosya limiti', 'ulimit -n 4096  bu shell için değiştir', 'ulimit -Hn  hard limit', 'Kalıcısı /etc/security/limits.conf'], e: ['ulimit -a', 'ulimit -n 4096'] },
  umask: { d: 'Yeni dosya ve dizinlerin default izninden düşülen maske. 022 ile dosya 644, dizin 755 olur', u: ['umask', 'umask -S  sembolik', 'umask 077  sadece sahibi okusun'], e: ['umask', 'umask 027 && touch gizli.txt && ls -l gizli.txt'] },
  chattr: { d: 'ext4 dosya attribute\'ları. +i immutable, root bile silemez, +a sadece ekleme', u: ['sudo chattr +i dosya', 'sudo chattr -i dosya', 'sudo chattr +a log'], e: ['sudo chattr +i /etc/resolv.conf', 'sudo chattr -i /etc/resolv.conf'] },
  lsattr: { d: 'Dosya attribute\'larını gösterir, i immutable, a append only', u: ['lsattr [dosya]', 'lsattr -d dizin'], e: ['lsattr /etc/resolv.conf'] },
  scp: { d: 'ssh üzerinden dosya kopyalar, cp sözdizimi ama bir taraf user@host:yol', u: ['scp dosya user@host:/hedef/', 'scp user@host:/uzak/dosya .', 'scp -r dizin user@host:~/', 'scp -P 2222 dosya user@host:'], e: ['scp notes.txt burak@backup.lab:/var/backups/', 'scp backup.lab:/var/backups/README .', 'scp -r ~/projects/webapp web01.lab:~/'] },
  rsync: { d: 'Fark bazlı senkron, sadece değişen bloklar gider. Yedek ve deploy için standart', u: ['rsync -avz kaynak/ user@host:/hedef/', 'rsync -avz --delete kaynak/ hedef/  hedefteki fazlalığı sil', 'rsync -avn kaynak/ hedef/  dry run, önce bunu çalıştır', 'Kaynak sonundaki / içeriği kopyalar, / yoksa dizinin kendisini'], e: ['rsync -avz ~/projects/webapp/ web01.lab:/var/www/html/', 'rsync -avn --delete ~/data/ backup.lab:/var/backups/data/'] },
  sftp: { d: 'ssh üzerinden interaktif dosya transferi. get, put, ls, cd, quit oturum içi komutlardır, Linux komutu değil', u: ['sftp user@host  oturum açar, sftp> promptu', 'sftp> get dosya, put dosya, ls, cd, quit', 'sftp user@host:/uzak/dosya  tek satırda indir', 'sftp -b batch.txt user@host  komut dosyası'], e: ['sftp burak@backup.lab', 'sftp backup.lab:/var/backups/README', 'sftp -b ~/sftp.txt web01.lab'] },
  'ssh-keygen': { d: 'SSH anahtar çifti üretir. Modern seçim ed25519, rsa ise en az 3072 bit', u: ['ssh-keygen -t ed25519 -C "yorum"', 'ssh-keygen -t ed25519 -f ~/.ssh/isim -N ""  script için', 'ssh-keygen -l -f ~/.ssh/id_ed25519.pub  fingerprint', 'ssh-keygen -y -f ~/.ssh/id_ed25519  public key\'i yazdır'], e: ['ssh-keygen -t ed25519 -C "burak@linuxlab"', 'ssh-keygen -l -f ~/.ssh/id_ed25519.pub'] },
  'ssh-copy-id': { d: 'Public key\'i uzak sunucunun authorized_keys dosyasına ekler, ondan sonra şifre sorulmaz', u: ['ssh-copy-id user@host', 'ssh-copy-id -i ~/.ssh/isim.pub user@host'], e: ['ssh-copy-id burak@backup.lab', 'ssh backup.lab hostname'] },
  'ssh-add': { d: 'Anahtarı ssh-agent\'a ekler, passphrase bir kez sorulur', u: ['ssh-add', 'ssh-add -l'], e: ['ssh-add -l'] },
  fdisk: { d: 'Bölüm tablosunu listeler ve düzenler, root ister. -l sadece okur', u: ['sudo fdisk -l', 'sudo fdisk -l /dev/sdb', 'sudo fdisk /dev/sdb  interaktif, p n d w q'], e: ['sudo fdisk -l'] },
  findmnt: { d: 'Mount noktalarını ağaç halinde gösterir, mount çıktısından okunaklı', u: ['findmnt', 'findmnt /', 'findmnt -t ext4', 'findmnt -l'], e: ['findmnt /', 'findmnt -t ext4,vfat'] },
  mount: { d: 'Bir aygıtı dizine bağlar. Argümansız mount edilmişleri listeler. Bağlamak root ister', u: ['mount', 'sudo mount /dev/sdc1 /mnt', 'sudo mount -o ro /dev/sdc1 /mnt', 'sudo mount -t vfat /dev/sdc1 /mnt', 'mount | grep sdc'], e: ['sudo mount /dev/sdc1 /mnt', 'mount | column -t'] },
  umount: { d: 'Mount\'u çözer. İçinde biri varsa target is busy', u: ['sudo umount /mnt', 'sudo umount /dev/sdc1'], e: ['sudo umount /mnt'] },
  blkid: { d: 'Blok aygıtların UUID ve filesystem tipini basar, fstab yazarken lazım', u: ['sudo blkid', 'sudo blkid /dev/sdb1'], e: ['sudo blkid'] },
  lsof: { d: 'Açık dosyalar ve socket\'ler. Hangi process hangi port\'u ya da dosyayı tutuyor', u: ['lsof -i  tüm network bağlantıları', 'lsof -i :80  port 80', 'lsof -p PID', 'lsof -u user', 'lsof /mnt  bu dizini kim tutuyor', 'Başkasının process\'i için sudo'], e: ['sudo lsof -i :2222', 'lsof -p 1024', 'sudo lsof -u www-data'] },
  jobs: { d: 'Bu shell\'in arka plan job\'larını listeler. cmd & ile başlar, %N ile adreslenir', u: ['jobs', 'jobs -l  pid ile', 'komut &  arkaya at', 'fg %1  öne al', 'bg %1  durmuş job\'ı arkada sürdür', 'kill %1', 'wait  hepsini bekle', 'Ctrl+Z öndeki komutu durdurur, lab\'da bunun yerine kill -STOP %1'], e: ['sleep 300 &', 'jobs', 'fg %1', 'kill %1'] },
  fg: { d: 'Job\'ı öne alır, terminal ona kilitlenir', u: ['fg', 'fg %N'], e: ['fg %1'] },
  bg: { d: 'Durmuş job\'ı arka planda sürdürür. Ctrl+Z sonrası klasik hamle', u: ['bg', 'bg %N'], e: ['bg %1'] },
  wait: { d: 'Arka plan job\'larının bitmesini bekler, script\'te paralel işleri toplamak için', u: ['wait', 'wait %N', 'wait PID'], e: ['sleep 5 & sleep 7 & wait'] },
  nohup: { d: 'Komutu terminal kapansa da çalışacak şekilde başlatır, çıktı nohup.out\'a. Modern alternatif tmux ya da systemd-run', u: ['nohup komut &', 'nohup komut > log 2>&1 &'], e: ['nohup bash ~/scripts/backup.sh &', 'cat nohup.out'] },
  killall: { d: 'İsme göre process öldürür, exact match. pkill ise kısmi eşleşme', u: ['killall isim', 'killall -9 isim', 'killall -u user'], e: ['killall sleep', 'sudo killall -9 cryptominer'] },
  pstree: { d: 'Process\'leri parent child ağacı olarak gösterir', u: ['pstree', 'pstree -p  PID ile', 'pstree kullanici'], e: ['pstree -p'] },
  htop: { d: 'top\'un renkli ve interaktif hali, apt ile kurulur', u: ['htop', 'F9 kill, F7 F8 nice, q çık'], e: ['sudo apt install htop', 'htop'] },
  nice: { d: 'Komutu düşük öncelikle başlatır. Niceness -20 en yüksek, 19 en düşük öncelik, negatif root ister', u: ['nice -n 10 komut', 'nice -n 19 tar czf big.tgz /data &'], e: ['nice -n 10 sleep 300 &', 'ps -o pid,ni,cmd -p PID'] },
  renice: { d: 'Çalışan process\'in niceness değerini değiştirir. Sıradan kullanıcı sadece artırabilir', u: ['renice -n 5 -p PID', 'sudo renice -n -5 -p PID', 'renice -n 10 -u user'], e: ['renice -n 5 -p 1024', 'sudo renice -n -5 -p 1024'] },
  pmap: { d: 'Process\'in bellek haritası, hangi kütüphane ne kadar yer tutuyor', u: ['pmap PID', 'pmap -x PID'], e: ['pmap 1024', 'pmap -x 1024 | tail -1'] },
  trap: { d: 'Script içinde signal yakalar. EXIT ile temizlik, INT ile Ctrl+C karşılama. Interaktif satırda sadece kaydedilir', u: ["trap 'echo bye' EXIT", "trap 'rm -f $TMP' EXIT", "trap 'echo iptal; exit 1' INT TERM", 'trap -l  signal listesi', 'trap -p  kayıtlı trap\'ler'], e: ["trap 'echo bye' EXIT", 'bash ~/scripts/trap.sh'] },
  at: { d: 'Komutu bir kez belirli zamanda çalıştırır, cron tekrar için. Komut stdin\'den gelir', u: ['echo "komut" | at 10:30', 'echo "komut" | at now + 5 minutes', 'at -f dosya tomorrow', 'atq  kuyruk', 'atrm N  sil', 'at-tick  lab, kuyruğu hemen çalıştırır'], e: ['echo "bash ~/scripts/backup.sh" | at now + 5 minutes', 'atq', 'atrm 1'] },
  atq: { d: 'at kuyruğunu listeler', u: ['atq'], e: ['atq'] },
  atrm: { d: 'at job\'ını kuyruktan siler', u: ['atrm N'], e: ['atrm 2'] },
  'at-tick': { d: 'Lab\'a özel, at kuyruğundaki işleri beklemeden çalıştırır', u: ['at-tick'], e: ['at-tick'] },
  watch: { d: 'Komutu düzenli aralıkla tekrar çalıştırıp ekranda gösterir, Ctrl+C ile çıkılır', u: ['watch -n 2 komut', 'watch -d komut  değişenleri vurgula', "watch -n 1 'ss -tlnp | grep 80'"], e: ['watch -n 2 df -h', 'watch -d free -h'] },
  locate: { d: 'Dosya adını veritabanından bulur, find\'dan çok hızlı ama veritabanı updatedb ile güncellenmeli. mlocate paketi gerekir', u: ['locate desen', 'locate -i desen', 'locate -c desen  sayı', 'locate -e desen  sadece var olanlar'], e: ['sudo apt install mlocate', 'sudo updatedb', 'locate nginx.conf'] },
  updatedb: { d: 'locate veritabanını yeniler, root ister. Cron günde bir çalıştırır', u: ['sudo updatedb'], e: ['sudo updatedb && locate sshd_config'] },
  ln: { d: 'Link oluşturur. -s symbolic link, bir kısayol gibi hedefi gösterir. -s yoksa hard link, aynı inode\'un ikinci adı', u: ['ln -s hedef link', 'ln -sf hedef link  var olanın üstüne', 'ln dosya hardlink', 'ls -l ok ile hedefi gösterir, cat link hedefi okur'], e: ['ln -s /var/log/nginx/access.log ~/access.log', 'ln ~/notes.txt ~/notes.hard'] },
  readlink: { d: 'Symbolic link\'in hedefini yazar, -f tam yolu çözer', u: ['readlink link', 'readlink -f yol'], e: ['readlink ~/access.log'] },
  gpg: { d: 'Şifreleme. -c simetrik, aynı passphrase ile çözülür. Lab\'da passphrase --batch --passphrase ile verilir', u: ['gpg -c dosya  dosya.gpg üretir', 'gpg dosya.gpg  çözer, dosya adıyla yazar', 'gpg -d dosya.gpg  ekrana', 'gpg --batch --passphrase "gizli" -c dosya', 'gpg --batch --passphrase "gizli" -o cikti -d dosya.gpg'], e: ['gpg --batch --passphrase lab123 -c ~/Documents/rapor.txt', 'gpg --batch --passphrase lab123 ~/Documents/rapor.txt.gpg'] },
  shred: { d: 'Dosyanın üstüne rastgele veri yazar, -u ile de siler. rm diskten silmez, shred siler', u: ['shred -u dosya', 'shred -vun 5 dosya', 'SSD ve journaling filesystem\'de garanti değil'], e: ['shred -vu gizli.txt'] },
  set: { d: 'Shell seçenekleri ve değişken listesi. Argümansız her şeyi listeler', u: ['set  tüm değişkenler ve fonksiyonlar', 'set -e  hata olunca dur', 'set -x  her komutu yazdır, debug', 'set -u  tanımsız değişken hata', 'set -o pipefail', 'set -- a b c  positional parametreler', 'set +x  kapat'], e: ['set | grep HOME', 'set -euo pipefail'] },
  readonly: { d: 'Değişkeni salt okunur yapar, unset edilemez', u: ['readonly AD=deger', 'readonly -p  listele'], e: ['readonly PORT=8080', 'unset PORT'] },
  declare: { d: 'Değişken tanımlar ve tipini belirler. -i tamsayı, -r salt okunur, -x export, -p göster', u: ['declare -i SAYI=5', 'declare -r SABIT=1', 'declare -x DEGISKEN=deger', 'declare -p DEGISKEN', 'declare -f  fonksiyonlar'], e: ['declare -i n=3+4; echo $n', 'declare -p HOME'] },
  kill: { d: 'Process\'e signal gönderir, default SIGTERM. %N ile job', u: ['kill PID', 'kill -9 PID  SIGKILL', 'kill %1  job', 'kill -STOP PID, kill -CONT PID', 'kill -l  signal listesi'], e: ['kill 1024', 'kill -9 %1', 'kill -l'] },
};
MANUAL.id.u.push('id isim  başkasının uid, gid ve grupları', 'id -u, id -g, id -Gn');
MANUAL.id.e.push('id deploy', 'id -Gn burak');
MANUAL.find.u.push('find / -size +100M  100 MB üstü', 'find /var/log -mtime -1  son 24 saatte değişen', 'find . -name "*.log" -exec rm {} \;', 'find . -type f -print0 | xargs -0 wc -l', 'find /tmp -mmin -30, -newer dosya, -maxdepth 2, -delete');
MANUAL.find.e.push('find / -size +100M 2>/dev/null', 'find /var/log -mtime -1 -type f', 'find ~ -name "*.txt" -exec wc -l {} +');
MANUAL.df.u.push('df -i  inode doluluğu', 'df -T  filesystem tipi', 'df -h /yol  o yolun bulunduğu disk');
MANUAL.df.e.push('df -hT', 'df -i /');
MANUAL.du.u.push('du -ah dizin  her dosya', 'du -h --max-depth=1 dizin', 'du -sh * | sort -h');
MANUAL.du.e.push('du -h --max-depth=1 /var', 'du -ah ~/data');
MANUAL.history.u.push('!!  son komutu tekrarla, sudo !! klasik', '!$  son komutun son argümanı', '!n  n numaralı komut', '!ssh  ssh ile başlayan son komut', 'history -c  temizle', 'history 10  son on');
MANUAL.history.e.push('sudo !!', 'cat !$');
MANUAL.ps.u.push('ps PID', 'ps -p PID -o pid,ni,cmd', 'ps -u user', 'ps -C isim', 'ps -eo pid,ppid,ni,stat,cmd');
MANUAL.ps.e.push('ps -p 1024 -o pid,ni,cmd', 'ps -eo pid,ni,cmd | sort -k2 -n | tail -3');
MANUAL.chmod.u.push('chmod -R 755 dizin  recursive', 'chmod u+x,g-w,o=r dosya  sembolik', 'Dizin için 755, dosya için 644, gizli şey için 600 ya da 700. 777 bir çözüm değil');
MANUAL.chmod.e.push('chmod -R 755 ~/scripts', 'chmod g-w,o= dosya');
MANUAL.chown.u.push('sudo chown -R user:group dizin', 'sudo chown :group dosya  sadece grup');
MANUAL.chown.e.push('sudo chown -R www-data:www-data /var/www');
SYS_MANUAL.ssh = { d: 'Uzak sunucuya şifreli oturum açar ya da tek komut çalıştırır. Lab\'da interaktif oturum yok, komutu satıra ekle', u: ['ssh user@host', 'ssh -p port user@host', 'ssh user@host komut  komutu uzakta çalıştır', 'ssh -i ~/.ssh/anahtar user@host', '~/.ssh/config içinde Host kısayolları, ~/.ssh/known_hosts bilinen sunucular'], e: ['ssh backup.lab ls /var/backups', 'ssh -p 2222 burak@192.168.1.10', 'ssh web01.lab cat /etc/hostname'] };
MANUAL.xargs.u.push('find . -print0 | xargs -0 komut  boşluklu adlar için', 'xargs -n 1 komut  her satır için ayrı', 'xargs -I {} komut {} ek  yer tutucu', 'ls | xargs wc  dizindeki dosyaların içeriğini sayar, dizini değil, boşluklu adda kırılır');
MANUAL.xargs.e.push('find ~/data -type f -print0 | xargs -0 wc -l', 'cat hosts.txt | xargs -I {} ping -c 1 {}');
SYS_MANUAL.source = { d: 'Dosyayı mevcut shell içinde çalıştırır, değişkenler ve fonksiyonlar shell\'de kalır. Kaynaktan derlemeyle ilgisi yok, o ./configure && make', u: ['source dosya', '. dosya  aynı şey', 'source ~/.bashrc  config\'i yeniden yükle'], e: ['source ~/.bashrc', 'source ~/scripts/vars.sh && echo $APP'] };
MANUAL.tail.u.push('tail -f dosya  canlı takip, Ctrl+C ile çık', 'tail -n 20 -f dosya');
MANUAL.getent.u.push('getent passwd isim  kullanıcı kaydı, finger yerine', 'getent group grup');
MANUAL.getent.e.push('getent passwd deploy', 'getent group sudo');
MANUAL.ifconfig = { d: 'net-tools paketinden, deprecated. ip addr kullan. Lab\'da çalışır ama uyarı verir', u: ['ifconfig', 'ifconfig eth0', 'Modern: ip addr, ip -br addr, ip link'], e: ['ifconfig', 'ip -br addr'] };
MANUAL.netstat = { d: 'net-tools paketinden, deprecated. ss kullan. Lab\'da çalışır ama uyarı verir', u: ['netstat -tulpn', 'netstat -r', 'Modern: ss -tulpn, ip route'], e: ['netstat -tulpn', 'ss -tulpn'] };
MANUAL.rm.u.push('rm -rf /  korumalıdır, --no-preserve-root ister. rm -rf /tmp/x / gibi bir boşluk hatası felakettir', 'rm -rf "${DIR:?}"/x  değişken boşsa durur');
MANUAL.ln = SYS_MANUAL.ln;

/* ---------- kayit ---------- */
Object.keys(SYS_CMDS).forEach(k => { if (COMMANDS[k]) COMMANDS[k] = SYS_CMDS[k]; });
registerExt({
  files: sysFiles(),
  commands: Object.assign({}, ...Object.keys(SYS_CMDS).filter(k => !SYS_OLD[k] && !COMMANDS[k] || k === 'id' || k === 'groups').map(k => ({ [k]: SYS_CMDS[k] }))),
  services: { atd: 'active' },
  manual: SYS_MANUAL,
  onReset: sh => { sysFiles().forEach(f => sh.install(f.path, f.node)); sh.sysTraps = {}; sh.sysReadonly = new Set(); sh.sysInt = new Set(); sysEnsure(sh); },
});
delete SUGGEST.apt;
delete SUGGEST.ifconfig;
delete SUGGEST.netstat;
