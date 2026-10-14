'use strict';
/* Senaryo varyantlari: pkg, sysadm, remote, jobs, cheat bolumleri.
   Her gorev icin iki varyant ve aciklayici temel ipucu. Tum ust seviye isimler VAD_ ya da vad onekli. */

const VAD_H = '/home/burak';
/* Ek uzak hostlar. ext-sys.js'deki host tablosuna eklenir, uzak dosya sistemleri /srv/remote/<host> altinda setup ile kurulur */
const VAD_HOSTS = { 'nms.lab': '10.50.0.60', 'edge-ist.lab': '10.50.0.61' };
if (typeof SYS_HOSTS !== 'undefined' && typeof SYS_HOSTDIR !== 'undefined') {
  Object.keys(VAD_HOSTS).forEach(h => {
    const ip = VAD_HOSTS[h];
    if (SYS_HOSTS[h]) return;
    SYS_HOSTS[h] = ip; SYS_HOSTS[h.split('.')[0]] = ip; SYS_HOSTS[ip] = ip; SYS_HOSTDIR[ip] = h;
  });
}
const VAD_PROXY = 'http://10.50.0.5:3128';

/* ---------- yardimcilar ---------- */
function vadOwnerFor(p) { return /\/home\/burak(\/|$)/.test(p) ? USER : 'root'; }
/* mkdir -p, yeni olusan ara dizinler home altindaysa burak'a ait olur */
function vadDir(sh, path, owner, mode) {
  const parts = path.split('/').filter(Boolean);
  let cur = sh.root; let p = '';
  for (let i = 0; i < parts.length; i++) {
    p += '/' + parts[i];
    const last = i === parts.length - 1;
    if (!cur.c[parts[i]]) cur.c[parts[i]] = mkdir({}, last && mode !== undefined ? mode : 0o755, last && owner ? owner : vadOwnerFor(p));
    cur = cur.c[parts[i]];
    if (cur.t !== 'd') return null;
  }
  return cur;
}
function vadFile(sh, path, data, mode, owner) {
  const i = path.lastIndexOf('/');
  const d = vadDir(sh, path.slice(0, i) || '/');
  if (!d) return null;
  const n = mkfile(data, mode === undefined ? 0o644 : mode, owner || vadOwnerFor(path));
  d.c[path.slice(i + 1)] = n;
  return n;
}
function vadHome(sh, rel, data, mode) { return vadFile(sh, VAD_H + '/' + rel, data, mode === undefined ? 0o644 : mode, USER); }
function vadDel(sh, path) { const { dir, name } = sh.parent(path); if (dir && dir.t === 'd' && dir.c[name]) delete dir.c[name]; }
function vadRoot(sh, fn) { const was = sh.isRoot; sh.isRoot = true; try { return fn(); } finally { sh.isRoot = was; } }
function vadPkg(sh, name, on) {
  sysEnsure(sh);
  const list = sysInstalled(sh);
  if (on && !list.includes(name)) sysSetInstalled(sh, list.concat([name]));
  if (!on && list.includes(name)) sysSetInstalled(sh, list.filter(x => x !== name));
}
function vadRemote(h, p) { return SYS_REMOTE + '/' + h + (p || ''); }
function vadHost(sh, h) {
  sysEnsure(sh);
  if (!sh.node(vadRemote(h, '/etc/hostname'))) vadFile(sh, vadRemote(h, '/etc/hostname'), h.split('.')[0] + '\n');
  vadDir(sh, vadRemote(h, '/home/burak'), USER, 0o750);
  vadDir(sh, vadRemote(h, '/var/log'));
  const ip = VAD_HOSTS[h];
  const hosts = sh.node('/etc/hosts');
  if (ip && hosts && hosts.t === 'f' && !hosts.d.includes(h)) hosts.d += `${ip}\t${h} ${h.split('.')[0]}\n`;
}
function vadProc(sh, pid, user, cmd, cpu, ni) {
  let p = sh.procs.find(x => x.pid === pid);
  if (!p) { p = { pid, user, cpu, mem: 1.4, cmd, ni: ni || 0 }; sh.procs.push(p); }
  else { p.user = user; p.cmd = cmd; p.cpu = cpu; if (ni !== undefined) p.ni = ni; }
  return p;
}
/* arka plan job'i yoksa olusturur, $! ona isaret eder */
function vadJob(sh, cmd, ni) {
  let j = sh.procs.find(p => p.jn && p.cmd === cmd);
  if (!j) {
    const jobs = sysJobs(sh);
    j = { pid: sysNewPid(sh), user: USER, cpu: 0.0, mem: 0.1, cmd, jn: jobs.length ? jobs[jobs.length - 1].jn + 1 : 1, ni: ni || 0, st: 'Running' };
    sh.procs.push(j);
    sh.sysLastBg = j.pid;
  } else if (ni !== undefined && j.ni < ni) j.ni = ni;
  return j;
}
function vadKeyLine(sh) { const n = sh.node(VAD_H + '/.ssh/id_ed25519.pub') || sh.node(VAD_H + '/.ssh/id_rsa.pub'); return n && n.t === 'f' ? n.d.trim() : ''; }
function vadKeyId(line) { return String(line || '').trim().split(' ').slice(0, 2).join(' '); }
function vadEnsureKey(sh) {
  if (!vadKeyLine(sh)) {
    vadDir(sh, VAD_H + '/.ssh', USER, 0o700);
    vadDel(sh, VAD_H + '/.ssh/id_ed25519');
    SYS_CMDS['ssh-keygen'].call(sh, ['-q', '-t', 'ed25519', '-N', '', '-C', 'burak@linuxlab', '-f', VAD_H + '/.ssh/id_ed25519']);
  }
  return vadKeyLine(sh);
}
function vadDeployKey(sh) {
  const p = VAD_H + '/.ssh/deploy_ed25519';
  if (!sh.node(p + '.pub')) {
    vadDir(sh, VAD_H + '/.ssh', USER, 0o700);
    vadDel(sh, p);
    SYS_CMDS['ssh-keygen'].call(sh, ['-q', '-t', 'ed25519', '-N', '', '-C', 'deploy@linuxlab', '-f', p]);
  }
  const n = sh.node(p + '.pub');
  return n ? n.d.trim() : '';
}
function vadAuthKeys(sh, h) { return vadRemote(h, '/home/burak/.ssh/authorized_keys'); }
function vadAuthorize(sh, h, line) {
  const p = vadAuthKeys(sh, h); const n = sh.node(p);
  if (n && n.t === 'f') { if (!n.d.includes(vadKeyId(line))) n.d += line + '\n'; return; }
  vadDir(sh, vadRemote(h, '/home/burak/.ssh'), USER, 0o700);
  vadFile(sh, p, line + '\n', 0o600, USER);
}
function vadTarGz(name, members) { return sysPack('gz', { n: name.replace(/\.gz$/, ''), d: sysPack('tar', { members: members.map(m => Object.assign({ m: m.t === 'd' ? 0o755 : 0o644, o: USER, d: '', ts: Date.now() }, m)) }) }); }
/* GNU hello kaynak agaci, ext-sys.js'deki pristine dosyalardan */
function vadHelloFiles() { return sysFiles().filter(f => f.path.startsWith(SYS_SRC + '/')); }
function vadHelloTree(sh, dest) {
  vadDir(sh, dest, USER);
  vadHelloFiles().forEach(f => {
    const rel = f.path.slice(SYS_SRC.length);
    if (f.node.t === 'd') vadDir(sh, dest + rel, USER);
    else if (!sh.node(dest + rel)) vadFile(sh, dest + rel, f.node.d, f.node.m, USER);
  });
}
function vadExtra(sh) { const st = sysState(sh); return st.extra ? st.extra.split(',').filter(Boolean) : []; }
function vadSetExtra(sh, list) { const st = sysState(sh); st.extra = list.join(','); sysSetState(sh, st); }
function vadLinkTo(sh, path) { const n = sh.node(path); return n && n.l ? sysLinkTarget(sh, path, n).replace(/\/$/, '') : ''; }
function vadNoSchedule(sh) { return !syEx(sh, SYS_SHUTDOWN); }

/* ======================================================================
   Paket Yonetimi
   ====================================================================== */
addVariants('pk1', [
  { title: 'Lock dosyası nerede',
    story: "Yeni kurulan İstanbul branch sunucusuna ssh ile girdin, stajyer apt update çalışmıyor diye ticket açmış. Hata mesajı hangi dosyayı açamadığını açıkça söylüyor. Önce stajyerin yaptığını tekrarla, mesajı oku, sonra doğrusunu yap.",
    task: 'apt update komutunu sudo olmadan çalıştır, hatadaki lock dosyasının tam yolunu submit et ve sudo ile listeyi tazele.',
    hint: "`apt update` paket veritabanına yazdığı için /var/lib/dpkg altındaki lock dosyasını kilitlemek ister ve o dosya root'a ait. Hata satırındaki Permission denied ve are you root ifadeleri yetki sorunu demek, ağ ya da depo sorunu değil. Komutun başına `sudo` eklemek yeter, lock dosyasını elle silmek ise asla çözüm değil, başka bir apt çalışıyorsa veritabanını bozar.",
    solution: 'apt update\nsudo apt update\nsubmit /var/lib/dpkg/lock-frontend',
    check: (sh, c) => sySub(c, '/var/lib/dpkg/lock-frontend') && syHist(sh, /^sudo apt(-get)?\s+update/) },
  { title: 'Bekleyen güncellemeler',
    story: "Security ekibi SSH tarafında yayınlanan bir açık için hangi kutularda güncelleme beklediğini soruyor. Liste eskiyse apt neyin yükseltilebilir olduğunu bilemez, önce depo listesini tazelemen lazım. Sonra apt list --upgradable bekleyen paketleri gösterir.",
    task: 'Depo listesini tazele, yükseltilebilir paketleri listele ve SSH sunucusuna ait paketin adını submit et.',
    hint: "`apt update` önce depo listesini indirir, liste eski kalırsa yeni sürümler hiç görünmez. Listeyi okumak root istemez, `apt list` ile `--upgradable` sadece yeni sürümü olan paketleri basar. SSH client ve server ayrı paketlerdir, aradığın server kelimesini taşıyan paket.",
    solution: 'sudo apt update\napt list --upgradable\nsubmit openssh-server',
    check: (sh, c) => sySub(c, 'openssh-server') && syHist(sh, /^sudo apt(-get)?\s+update/) },
], { hint: "`apt update` depo listelerini yeniden indirir ve paket veritabanına yazar, bu yüzden root ister. sudo olmadan dpkg lock dosyasını açamaz ve are you root hatası verir, bu mesajı tanımak ileride zaman kazandırır. update sadece listeyi tazeler, hiçbir paketi yükseltmez, yükseltme için ayrıca upgrade gerekir." });

addVariants('pk2', [
  { title: 'Disk neyle dolu',
    story: "Branch sunucusunda kök dosya sistemi yüzde 95 dolu, du ile dizin dizin gezmek yavaş. Arkadaşın ncurses tabanlı, okla gezilen bir disk usage aracı olduğunu söylüyor ama adını hatırlamıyor. apt search açıklamalarda da arar.",
    task: 'disk usage ifadesiyle tırnak içinde paket ara ve bulduğun aracın paket adını submit et.',
    hint: "`apt search` deseni hem paket adında hem kısa açıklamada arar. İki kelimelik ifadeyi tırnak içine alırsan shell onu tek argüman yapar ve kelimelerin yan yana geçtiği açıklama bulunur, tırnaksız yazarsan sonuç kalabalıklaşabilir. Açıklaması disk usage viewer olan satırın ilk kelimesi paket adıdır.",
    solution: 'apt search "disk usage"\nsubmit ncdu',
    check: (sh, c) => sySub(c, 'ncdu') },
  { title: 'Brute force kalkanı',
    story: "auth.log her gece aynı IP'lerden yüzlerce Failed password satırıyla doluyor. Belli sayıda hatalı denemeden sonra IP'yi otomatik banlayan bir araç istiyorsun. Adının içinde ne geçtiğini tahmin edebiliyorsun, ban.",
    task: 'ban kelimesiyle paket ara, açıklaması authentication hatalarından bahseden paketin adını submit et.',
    hint: "`apt search` kısa bir kelimeyle de çalışır, kelime paket adının ya da açıklamanın içinde geçiyorsa listelenir. Çok kısa kelimeler alakasız eşleşme getirebilir, bu yüzden açıklama satırını okuyup authentication errors geçen paketi seç. Emin olmak için adayı `apt show` ile incele.",
    solution: 'apt search ban\nsubmit fail2ban',
    check: (sh, c) => sySub(c, 'fail2ban') },
], { hint: "`apt search` verdiğin kelimeyi paket adlarında ve kısa açıklamalarda arar, adını bilmediğin aracı böyle bulursun. Çıktıda her paket iki satırdır, ilki ad ve sürüm, ikincisi açıklama. Kurulu olanların yanında installed yazar. Bulduğun aday hakkında detay için `apt show` kullan." });

addVariants('pk3', [
  { title: 'Eski runbook, eski araç',
    story: "Devraldığın eski bir runbook kullanıcı detayını finger ile alıyor ama komut bu kutuda yok, command not found. Önce kur, sonra nginx worker'larının çalıştığı www-data hesabına bak. finger artık yaygın değil, modern karşılığını cheat sheet bölümünde göreceksin.",
    task: 'finger paketini kur ve www-data hesabının bilgisini finger ile göster.',
    hint: "command not found genelde paketin kurulu olmadığını söyler, lab hangi paketi kuracağını da ipucu olarak yazar. `apt install` root ister, sudo olmadan lock hatası gelir. Paket adı ile komut adı her zaman aynı değildir, burada aynı ama locate komutunun paketi mlocate gibi farklılıklar sık görülür.",
    setup: sh => { vadPkg(sh, 'finger', false); },
    solution: 'finger www-data\nsudo apt install finger\nfinger www-data',
    check: (sh, c) => syInstalled(sh, 'finger') && syRan(c, /^finger\s+www-data/) && c.out.includes('Login: www-data') },
  { title: 'CPU kim yiyor',
    story: "NMS'ten branch sunucusu için CPU yüzde 99 alarmı geldi. top yerine sıralı ve renkli htop ile bakmak istiyorsun ama kurulu değil. Kur, çalıştır, en üstte duran process'in PID'sini bul.",
    task: "htop paketini kur, çalıştır ve en çok CPU kullanan process'in PID'sini submit et.",
    hint: "`apt install` root istediği için sudo ile kurarsın, kurulum bitince htop PATH'e girer. htop process'leri varsayılan olarak CPU yüzdesine göre büyükten küçüğe sıralar, en üst satır en çok yiyendir. PID ilk sütundur, kill ya da renice için o numara lazım.",
    setup: sh => { vadPkg(sh, 'htop', false); vadProc(sh, 5120, 'root', '/usr/sbin/rsyslogd -n -iNONE', 99.4); },
    solution: 'sudo apt install htop\nhtop\nsubmit 5120',
    check: (sh, c) => { const top = sh.procs.slice().sort((a, b) => b.cpu - a.cpu)[0]; return syInstalled(sh, 'htop') && syHist(sh, /^htop/) && !!top && sySub(c, String(top.pid)); } },
], { hint: "`apt install` paketi indirip kurar ve dpkg veritabanına yazar, bu yüzden root ister. sudo olmadan dpkg frontend lock hatası alırsın, kurulum reddedilmiş demektir. Kurulum bitince komut PATH'te olur ve doğrudan adıyla çalışır. htop içinde q çıkış, F9 kill, F7 ve F8 nice." });

addVariants('pk4', [
  { title: 'Docker var mı',
    story: "Denetim formunda branch sunucularında container runtime olup olmadığı soruluyor. Paket adını tam bilmiyorsun, docker diye geçtiğini biliyorsun. Kurulu paket listesini süzmek yeter.",
    task: 'Kurulu paketler arasında docker geçenleri apt list ile bul.',
    hint: "`apt list` tek başına depodaki her paketi listeler, `--installed` sadece kurulu olanları bırakır. Ubuntu'da Docker paketi docker.io adıyla gelir, bu yüzden tam ad yerine `grep` ile parça aramak işini kolaylaştırır. Satırdaki installed etiketi paketin kurulu olduğunu teyit eder.",
    solution: 'apt list --installed | grep docker',
    check: (sh, c) => syRan(c, /apt\s+list\s+--installed|dpkg\s+-l/) && c.out.includes('docker.io') },
  { title: 'tcpdump hazır mı',
    story: "Yarın gece WAN tarafında paket yakalayacaksın, kutuda tcpdump olup olmadığından emin olmak istiyorsun. Bu sefer apt yerine dpkg'nin kendi listesine bak, Debian dünyasının en alt katmanı o.",
    task: 'dpkg -l çıktısını süzerek tcpdump paketinin kurulu olduğunu göster.',
    hint: "`dpkg -l` kurulu paketleri tablo halinde gösterir, ilk sütundaki ii istenen ve gerçek durumun installed olduğunu söyler. Listeyi `grep` ile süzebilir ya da paket adını desen olarak doğrudan dpkg'ye verebilirsin. rc ile başlayan bir satır paketin kaldırıldığını ama config dosyalarının kaldığını gösterir.",
    solution: 'dpkg -l | grep tcpdump',
    check: (sh, c) => syRan(c, /dpkg\s+-l|apt\s+list\s+--installed/) && c.out.includes('tcpdump') },
], { hint: "`apt list --installed` kurulu tüm paketleri satır satır basar, liste uzun olduğu için pipe ile `grep`'e verip süzersin. Satırda installed etiketi görünüyorsa paket kurulu demektir. Aynı bilgiyi düşük seviyede `dpkg -l` verir, orada satır başındaki ii kurulu demek." });

addVariants('pk5', [
  { title: 'hdparm config nerede',
    story: "Disk ayarlarını kalıcı yapmak için hdparm'ın config dosyasını düzenleyeceksin ama yolunu hatırlamıyorsun. Paketin koyduğu dosyaların listesinde /etc altındaki satır aradığın şey.",
    task: 'hdparm paketinin dosyalarını listele ve config dosyasının tam yolunu submit et.',
    hint: "`dpkg -L` paket adını alır ve o paketin kurduğu dosyaları tek tek yazar. Debian geleneğinde sistem geneli config dosyaları /etc altında durur, listede o satırı ara. /usr/share/doc altındakiler sadece dokümandır, düzenlenecek dosya değildir.",
    solution: 'dpkg -L hdparm\nsubmit /etc/hdparm.conf',
    check: (sh, c) => sySub(c, '/etc/hdparm.conf') },
  { title: 'Bu dosya kimin',
    story: "Minimal kurulmuş bir kutuda ifconfig çalışıyor ve stajyer bunun hangi paketten geldiğini soruyor. Bu sefer tersten sormak gerekiyor, dosyadan pakete. dpkg -S bir dosya adını ya da yolunu alır, sahibi olan paketi söyler.",
    task: 'ifconfig dosyasının hangi pakete ait olduğunu bul ve paket adını submit et.',
    hint: "`dpkg -S` arama yönünü tersine çevirir, dosyadan pakete gider ve satırın başında paket adını yazar. Tam yol vermek daha kesin sonuç getirir, sadece ad verirsen o adla biten her yol eşleşir. Bu bilgi bir aracı kaldırırken ya da eksik bir komutu başka kutuya kurarken lazım olur.",
    solution: 'dpkg -S ifconfig\nsubmit net-tools',
    check: (sh, c) => sySub(c, 'net-tools') && syHist(sh, /dpkg\s+(-S|--search)/) },
], { hint: "`dpkg -L` kurulu bir paketin diske koyduğu her dosyayı listeler. Çalıştırılabilir dosyalar genelde /usr/bin ya da /usr/sbin altında, config dosyaları /etc altında olur. Paket kurulu değilse dpkg is not installed der, önce kurman gerekir." });

addVariants('pk6', [
  { title: 'finger gitsin',
    story: "finger işini gördü ama güvenlik standardınız kullanıcı bilgisi sızdıran araçların kutuda kalmamasını istiyor. Config izi de kalmasın.",
    task: 'finger paketini config dosyalarıyla birlikte kaldır ve komutun artık olmadığını gör.',
    hint: "`apt purge` paketi ve /etc altındaki config dosyalarını birlikte siler, remove ise config'i bırakır ve dpkg listesinde rc satırı kalır. Kaldırma da veritabanına yazdığı için sudo ister. Kaldırdıktan sonra komutu tekrar denemek işin bittiğini doğrulamanın en kısa yolu.",
    setup: sh => { vadPkg(sh, 'finger', true); },
    solution: 'sudo apt purge finger\nfinger',
    check: sh => !syInstalled(sh, 'finger') && syHist(sh, /apt(-get)?\s+purge\s+(\S+\s+)*finger/) },
  { title: 'Yanlışlıkla gelen Apache',
    story: "Biri nginx'in yanına apache2 kurmuş, iki web server aynı 80 portu için kavga ediyor. Apache'nin /etc/apache2 altında config bırakmasını da istemiyorsun, ileride kafa karıştırır.",
    task: 'apache2 paketini config dosyalarıyla birlikte kaldır ve kurulu listede kalmadığını gör.',
    hint: "Port çakışmasında fazla olan servisi kaldırmak en temiz yol, `apt purge` ile /etc/apache2 dizini de gider. remove kullansaydın config dosyaları kalır, bir sonraki kurulumda eski ayarlar sessizce geri gelirdi. Sonra kurulu listede apache aratıp boş döndüğünü görmek kontrolü tamamlar.",
    setup: sh => { vadPkg(sh, 'apache2', true); },
    solution: 'sudo apt purge apache2\napt list --installed | grep apache',
    check: sh => !syInstalled(sh, 'apache2') && syHist(sh, /apt(-get)?\s+purge\s+(\S+\s+)*apache2/) },
], { hint: "`apt remove` paketin programlarını kaldırır ama /etc altındaki config dosyalarını bırakır, yeniden kurarsan ayarların geri gelir. `apt purge` config dahil her şeyi siler, temiz kaldırma için o kullanılır. İkisi de root ister. Kaldırdıktan sonra komutu çalıştırınca command not found almalısın." });

addVariants('pk7', [
  { title: 'Unattended nmap',
    story: "Ansible playbook'un bir shell adımı branch sunucularına nmap kuruyor ve gece kimse başında olmadan çalışıyor. Adımı aynı komut biçimiyle elle deneyip doğrulamak istiyorsun.",
    task: 'nmap paketini apt-get ile, onay sormadan kur.',
    hint: "Otomasyonda `apt-get` kullanılır çünkü çıktısı sürümler arasında sabittir. `-y` olmadan Do you want to continue sorusu gelir, terminal başında kimse yoksa iş sonsuza kadar bekler. Root gerektiği için sudo şart, playbook'ta bunun karşılığı become.",
    setup: sh => { vadPkg(sh, 'nmap', false); },
    solution: 'sudo apt-get install -y nmap',
    check: (sh, c) => syInstalled(sh, 'nmap') && syRan(c, /apt-get\s+(-y\s+install|install\s+(\S+\s+)*-y)/) },
  { title: 'Provision script',
    story: "Yeni branch sunucuları için küçük bir ilk kurulum script'i yazacaksın. Liste tazelensin, sonra jq kurulsun, hiçbir adım soru sorup takılmasın. Script'i bir bütün olarak root ile çalıştıracaksın.",
    task: 'nano ile ~/scripts/provision.sh yaz, içinde apt-get update ve onaysız jq kurulumu olsun, sonra script\'i sudo ile çalıştır.',
    hint: "Script içinde `apt-get` tercih edilir, çıktısı sabittir. `-y` olmazsa install adımı onay bekler ve script yarıda kalır. Script'i sudo ile çalıştırınca içindeki her komut root olur, satır satır sudo yazmana gerek kalmaz.",
    setup: sh => { vadPkg(sh, 'jq', false); vadDir(sh, VAD_H + '/scripts', USER); },
    solution: 'nano ~/scripts/provision.sh\nsudo bash ~/scripts/provision.sh',
    editorContent: '#!/bin/bash\n# branch sunucusu ilk kurulum\napt-get update\napt-get install -y jq\n',
    check: sh => { const n = sh.node(VAD_H + '/scripts/provision.sh'); return syInstalled(sh, 'jq') && !!n && /apt-get\s+(-y\s+install|install\s+(\S+\s+)*-y)/.test(n.d); } },
], { hint: "`apt-get` apt'nin script dostu atasıdır, çıktısı sürümler arasında değişmez, bu yüzden otomasyonda tercih edilir. `-y` tüm evet hayır sorularına önceden evet der, yoksa script soruda takılı kalır. Root ister, sudo unutma." });

addVariants('pk8', [
  { title: 'yum alışkanlığı',
    story: "Rocky Linux kullanan müşterinin runbook'unda hâlâ yum install yazıyor. Modern RHEL 8 ve sonrasında yum aslında dnf'e giden bir isim. Komutu dene, lab'ın notunu oku.",
    task: "tmux paketini yum ile kurmayı dene ve notta yum'un yerine geçen aracı oku.",
    hint: "RHEL 8 ve sonrasında `yum` dnf'e yönlenen bir kısayoldur, eski script'ler kırılmasın diye durur. Yeni yazdığın her şeyde dnf kullan, seçenekler büyük ölçüde aynı. Bu kutu Ubuntu olduğu için kurulum gerçekten yapılmaz, sadece RHEL çıktısı gösterilir.",
    solution: 'sudo yum install tmux',
    check: (sh, c) => syRan(c, /^(sudo\s+)?yum\s+install/) && c.out.includes('dnf') },
  { title: 'rpm ile dosya listesi',
    story: "Rocky üzerinde nginx config'inin nerede olduğunu soruyorlar. Debian'da dpkg -L ile yaptığını RHEL'de rpm -ql yapar, q sorgula, l listele demek.",
    task: 'rpm ile nginx paketinin dosyalarını listele ve ana config dosyasının yolunu submit et.',
    hint: "`rpm -q` sorgu modudur, yanına eklenen `l` paketin dosyalarını listeler, `i` bilgi verir, `a` tüm kurulu paketleri sıralar. dpkg'deki `-L` ile aynı işi yapar. Config dosyası yine /etc altındadır, listede o satırı seç.",
    solution: 'rpm -ql nginx\nsubmit /etc/nginx/nginx.conf',
    check: (sh, c) => sySub(c, '/etc/nginx/nginx.conf') && syHist(sh, /^rpm\s+-\w*q\w*l|^rpm\s+-\w*l\w*q/) },
], { hint: "`dnf` RHEL, Fedora, Rocky ve Alma ailesinin paket yöneticisi, apt'nin karşılığı. `rpm` ise dpkg'nin karşılığı, `-qa` tüm kurulu paketleri sorgular. Bu kutu Ubuntu olduğu için lab gerçek bir RHEL çıktısını simüle eder ve notla uyarır." });

addVariants('pk9', [
  { title: 'Tarball ile gelen kaynak',
    story: "Vendor branch cihazının yardımcı aracını depoya koymamış, ~/Downloads altına hello-2.12.tar.gz olarak göndermiş. Kaynak kodu ~/build altına aç, orada derle ve dene.",
    task: "Tarball'ı ~/build altına aç, hello-2.12 dizininde configure ve make çalıştır, ./hello ile programı dene.",
    hint: "`tar` için `x` aç, `z` gzip, `f` dosya demek, `-C` hedef dizini seçer, vermezsen bulunduğun dizine açar. Sonra klasik üçlü gelir, `./configure` Makefile üretir, `make` derler, `./hello` yerinde çalıştırır. configure'u başında ./ olmadan yazarsan shell onu PATH'te arar ve command not found der.",
    setup: sh => {
      vadDir(sh, VAD_H + '/build', USER);
      const members = [{ p: 'hello-2.12/', t: 'd' }, { p: 'hello-2.12/src/', t: 'd' }].concat(vadHelloFiles().filter(f => f.node.t === 'f').map(f => ({ p: 'hello-2.12' + f.path.slice(SYS_SRC.length), t: 'f', m: f.node.m, d: f.node.d })));
      vadHome(sh, 'Downloads/hello-2.12.tar.gz', vadTarGz('hello-2.12.tar.gz', members));
    },
    solution: 'tar xzf ~/Downloads/hello-2.12.tar.gz -C ~/build\ncd ~/build/hello-2.12\n./configure\nmake\n./hello',
    check: (sh, c) => syEx(sh, VAD_H + '/build/hello-2.12/hello') && c.out.includes('Hello, world!') },
  { title: 'Önce configure',
    story: "Stajyer ~/src/hello-2.12 içinde doğrudan make yazmış ve hata almış, ne olduğunu anlamamış. Aynı hatayı sen de gör, sebebini anla, sonra doğru sırayla derle.",
    task: 'hello-2.12 dizininde önce make çalıştırıp hatayı gör, sonra configure ve make ile derle, ./hello ile dene.',
    hint: "`make` talimatları Makefile'dan okur, dizinde sadece Makefile.in varsa no makefile found der. Makefile'ı `./configure` üretir, derleyiciyi ve kütüphaneleri kontrol edip şablonu doldurur. Sıra hep aynıdır, önce configure, sonra make, en son programı dene.",
    setup: sh => { vadHelloTree(sh, SYS_SRC); ['/Makefile', '/hello', '/src/config.h'].forEach(p => vadDel(sh, SYS_SRC + p)); },
    solution: 'cd ~/src/hello-2.12\nmake\n./configure\nmake\n./hello',
    check: (sh, c) => syEx(sh, SYS_SRC + '/hello') && c.out.includes('Hello, world!') && syHist(sh, /^make\s*$/) },
], { hint: "Kaynaktan kurulum üç adımdır. `./configure` sistemi kontrol eder ve Makefile.in'den Makefile üretir, baştaki ./ bulunduğun dizindeki script'i çalıştır demek. `make` Makefile'a bakarak derler, `./hello` derlenen programı yerinde dener. configure atlanırsa make no makefile found der." });

addVariants('pk10', [
  { title: 'which ile doğrula',
    story: "Vendor aracını ~/build/hello-2.12 altında derledin, şimdi sisteme kuracaksın. Kurulumdan sonra komutun gerçekten hangi dosyadan çalıştığını which ile doğrula, başka bir dizine geçip dene.",
    task: "~/build/hello-2.12 içinden hello'yu sisteme kur, /tmp dizinine geç, which ile yolunu gör ve hello komutunu çalıştır.",
    hint: "`make install` Makefile'daki prefix altına kopyalar, burada /usr/local/bin, orası root'a ait olduğu için sudo ister ve sudo'suz denemede Permission denied görürsün. `which` komutun PATH'te hangi dosyaya çözüldüğünü gösterir, aynı isimde iki kurulum varsa hangisinin çalıştığını böyle anlarsın. Kurulumdan sonra hangi dizinde olursan ol komut adıyla çalışır.",
    setup: sh => { vadHelloTree(sh, VAD_H + '/build/hello-2.12'); },
    solution: 'cd ~/build/hello-2.12\n./configure\nmake\nmake install\nsudo make install\ncd /tmp\nwhich hello\nhello',
    check: (sh, c) => syEx(sh, '/usr/local/bin/hello') && syRan(c, /^hello\b/) && c.out.includes('Hello, world!') && syHist(sh, /^which\s+hello/) },
  { title: 'Eski sürümü yükselt',
    story: "Kutuda daha önce elle kurulmuş eski bir hello 2.10 var ve /usr/local/bin altında duruyor. ~/src/hello-2.12 kaynağından yeni sürümü derleyip üzerine kuracaksın, sonra hello komutunun artık yeni sürümü çalıştırdığını gör.",
    task: 'Önce hello çalıştırıp eski sürümü gör, sonra ~/src/hello-2.12 içinde derleyip sisteme kur ve hello komutunu tekrar çalıştır.',
    hint: "`make install` hedefte aynı isimde dosya varsa üzerine yazar, kaynaktan kurulan programların paket yöneticisindeki gibi bir sürüm takibi yoktur. /usr/local/bin root'a ait olduğu için install adımı sudo ister. Kurulumdan önce ve sonra komutu çalıştırıp çıktıyı karşılaştırmak yükseltmenin gerçekten olduğunu kanıtlar.",
    setup: sh => { vadHelloTree(sh, SYS_SRC); vadFile(sh, '/usr/local/bin/hello', '#!/bin/bash\necho "hello 2.10, eski surum"\n', 0o755, 'root'); },
    solution: 'hello\ncd ~/src/hello-2.12\n./configure\nmake\nsudo make install\nhello',
    check: (sh, c) => { const n = sh.node('/usr/local/bin/hello'); return !!n && n.x === 'elf' && syRan(c, /^hello\b/) && c.out.includes('Hello, world!') && !c.out.includes('2.10'); } },
], { hint: "`make install` derlenen programı Makefile'daki prefix altına kopyalar, varsayılan /usr/local, binary /usr/local/bin'e gider. Orası root'a ait olduğu için sudo olmadan Permission denied alırsın. /usr/local/bin PATH'te olduğundan kurulumdan sonra hangi dizinde olursan ol adıyla çalışır." });

/* ======================================================================
   Sistem Yonetimi
   ====================================================================== */
addVariants('sa1', [
  { title: 'Change window',
    story: "Müşteri MPLS'ten SD-WAN'a geçiş için 1 Mart 2027 tarihini önerdi ama hafta içi mi hafta sonu mu emin değil. Takvim uygulaması açmana gerek yok, terminal yeter.",
    task: "2027 Mart ayını göster ve 1 Mart'ın hangi güne denk geldiğini İngilizce submit et.",
    hint: "`cal` iki argüman alınca ilki ay numarası, ikincisi yıl olur. Sütunlar Su ile başlar, yani ilk sütun Pazar, ikinci sütun Pazartesi. Ayın 1'i hangi sütunun altındaysa gün odur.",
    solution: 'cal 3 2027\nsubmit Monday',
    check: (sh, c) => sySub(c, 'monday', 'mon', 'pazartesi') },
  { title: 'Artık yıl',
    story: "SLA raporu aylık uptime'ı dakika bazında hesaplıyor ve 2028 Şubat raporunda rakamlar tutmuyor. Şüphe artık yılda, Şubat 28 mi 29 mu çekiyor bakman lazım.",
    task: '2028 Şubat ayını göster ve kaç gün çektiğini submit et.',
    hint: "`cal` ay ve yıl alınca o ayı tam olarak çizer, son satırdaki en büyük sayı ayın gün sayısıdır. 4'e bölünen yıllar genelde artık yıldır, 100'e bölünüp 400'e bölünmeyenler hariç. Ay ile yılın yerini karıştırırsan cal hata verir ya da başka bir takvim basar.",
    solution: 'cal 2 2028\nsubmit 29',
    check: (sh, c) => sySub(c, '29') },
], { hint: "`cal` argümansız bu ayı gösterir, iki argümanla önce ay sonra yıl verirsin, tek argüman tüm yılı basar. Sütun başlıkları Su Mo Tu We Th Fr Sa, yani hafta Pazar ile başlar. Tek argümanı ay sanma, 12 yazarsan 12. yılın takvimini alırsın." });

addVariants('sa2', [
  { title: 'FQDN lazım',
    story: "Monitoring ekibi bu kutuyu NMS'e eklerken kısa isim değil tam alan adı istiyor, SNMP ve sertifika tarafı ona göre ayarlanacak. Kısa ismi biliyorsun, domain kısmını merak ediyorsun.",
    task: "Kutunun FQDN'ini hostname ile bul ve submit et.",
    hint: "`hostname` tek başına kısa ismi verir, `-f` ise kısa isim ile DNS domain'ini birleştirip tam alan adını yazar. Sadece domain kısmı için `-d` kullanılır. FQDN'i elle birleştirmek yerine komuta sormak yazım hatasını önler.",
    solution: 'hostname\nhostname -f\nsubmit linuxlab.corp.lab',
    check: (sh, c) => sySub(c, (syState(sh, 'hostname') || 'linuxlab').split('.')[0] + '.corp.lab') },
  { title: 'Docker köprüsü',
    story: "Firewall ekibi kutudaki tüm adresleri istedi ve listede tanımadıkları bir 172.17 adresi var. Bu Docker'ın default bridge'i, container'lar dışarı onun üzerinden çıkar. Tüm adresleri gör, Docker olanı ayıkla.",
    task: 'hostname -I ile tüm adresleri listele ve Docker bridge adresini submit et.',
    hint: "`hostname -I` interface adı yazmadan tüm adresleri sıralar, hangisinin hangi interface'e ait olduğunu `ip -br addr` ile karşılaştırırsın. Docker varsayılan olarak 172.17.0.0/16 bloğundan docker0 bridge'ine adres verir. Bu blok kurumsal ağla çakışırsa container trafiği yanlış yere gider, firewall ekibinin sorusu bu yüzden.",
    solution: 'hostname -I\nip -br addr\nsubmit 172.17.0.1',
    check: (sh, c) => sySub(c, '172.17.0.1') },
], { hint: "`hostname -I` büyük i ile kutunun tüm IP adreslerini boşlukla ayrılmış yazar, ilki genelde birincil interface. `hostname -f` FQDN yani tam alan adını verir. Küçük harf `-i` farklıdır, hostname'in /etc/hosts'taki karşılığını, çoğu zaman 127.0.1.1'i döndürür." });

addVariants('sa3', [
  { title: 'Dubai branch',
    story: "Yeni Dubai branch sunucusu Amsterdam saatiyle kurulmuş, yerel ekip log saatlerini hep kafadan çevirmek zorunda kalıyor. Abu Dhabi diye bir dilim arama, tz veritabanı bölgeyi temsil eden büyük şehri kullanır.",
    task: 'Saat dilimini Asia/Dubai yap ve timedatectl ile doğrula.',
    hint: "Önce `list-timezones` çıktısını grep ile süzüp tam ismi doğrula, tz veritabanı her şehri içermez ve yanlış isim Invalid time zone hatası verir. `set-timezone` sistem geneli ayar olduğu için root ister. Ayardan sonra Time zone satırında +04 görmelisin.",
    solution: 'timedatectl list-timezones | grep -i dubai\nsudo timedatectl set-timezone Asia/Dubai\ntimedatectl',
    check: sh => syHas(sh, '/etc/timezone', 'Asia/Dubai') },
  { title: 'Her şey UTC',
    story: "Üç ülkedeki branch log'larını tek bir SIEM'de birleştiriyorsunuz, her kutu kendi yerel saatini yazınca olay sıralaması karışıyor. Ekip kararı net, sunucular UTC çalışacak, yerel saati insanlar çevirecek.",
    task: 'Saat dilimini UTC yap.',
    hint: "`timedatectl` ile `set-timezone` dilimi değiştirir, UTC listede özel bir isim olarak bulunur. Sunucularda UTC tercih edilir çünkü yaz saati geçişi yoktur ve farklı ülkelerin log'ları aynı zaman çizgisine oturur. Komut root ister, sudo'suz Interactive authentication required hatası alırsın.",
    solution: 'timedatectl\nsudo timedatectl set-timezone UTC\ntimedatectl',
    check: sh => { const n = sh.node('/etc/timezone'); return !!n && n.d.trim() === 'UTC'; } },
], { hint: "`timedatectl` saat, saat dilimi ve NTP durumunu tek ekranda gösterir. `set-timezone` sistem geneli bir ayar olduğu için root ister, isim Bölge/Şehir biçiminde olmalı. Geçerli isimleri `list-timezones` verir, grep ile süzersin. Türkiye için Europe/Istanbul kullanılır, Ankara diye bir dilim yoktur." });

addVariants('sa4', [
  { title: 'VLAN tagging',
    story: "Branch sunucusu switch'e trunk ile bağlanacak, eth1 üzerinde 802.1Q VLAN interface'leri açacaksın. VLAN desteği 8021q modülünde ve şu an yüklü değil.",
    task: '8021q modülünü yükle ve lsmod ile yüklendiğini doğrula.',
    hint: "`modprobe` modül adını alır, dosya yolu ya da .ko uzantısı istemez. 8021q yüklenirken bağımlı olduğu garp ve mrp de otomatik gelir, lsmod'da onların Used by sütununda 8021q yazar. Yükleme root ister, sudo'suz Operation not permitted alırsın.",
    solution: 'lsmod | grep 8021q\nsudo modprobe 8021q\nlsmod | grep 8021q',
    check: sh => syHas(sh, '/proc/modules', '8021q ') },
  { title: 'LACP bond',
    story: "İki uplink'i LACP ile birleştirip tek mantıksal interface yapacaksın, Linux tarafında bunun adı bonding. Modül yüklü değilse bond0 oluşturulamaz.",
    task: 'bonding modülünü yükle ve lsmod ile doğrula.',
    hint: "`modprobe` bağımlılıkları kendisi çözer, bonding için gereken modülleri de yükler. Yüklendikten sonra `lsmod` çıktısında bonding satırını görürsün. modprobe sadece bu açılış için yükler, kalıcı olması için modül adını /etc/modules-load.d altındaki bir dosyaya yazmak gerekir.",
    solution: 'sudo modprobe bonding\nlsmod | grep bonding',
    check: sh => syHas(sh, '/proc/modules', 'bonding ') },
], { hint: "`modprobe` bir kernel modülünü bağımlılıklarıyla birlikte yükler, kernel'e kod eklediği için root ister. `lsmod` yüklü modülleri listeler, Used by sütunu hangi modülün onu kullandığını gösterir. insmod bağımlılıkları çözmez, günlük işte modprobe kullanılır." });

addVariants('sa5', [
  { title: "VLAN'ı geri al",
    story: "Trunk planı iptal oldu, 8021q modülünü çıkarmak istiyorsun. Önce yanlışlıkla x_tables'ı kaldırmayı dene ve firewall modüllerinin onu nasıl tuttuğunu gör, sonra doğru modülü çıkar.",
    task: 'x_tables modülünü kaldırmayı dene ve hatayı oku, sonra 8021q modülünü kaldır.',
    hint: "`rmmod` başka modüllerin kullandığı bir modülü çıkarmaz, in use by satırı kimin kullandığını söyler. x_tables iptables altyapısının temelidir, onu zorla çıkarmak firewall'u çökertir. 8021q'yu kimse kullanmıyorsa sorunsuz çıkar, garp ve mrp ise yüklü kalır.",
    setup: sh => { if (!syHas(sh, '/proc/modules', '8021q ')) vadRoot(sh, () => SYS_CMDS.modprobe.call(sh, ['8021q'])); },
    solution: 'sudo rmmod x_tables\nsudo rmmod 8021q\nlsmod | grep 8021q',
    check: sh => !syHas(sh, '/proc/modules', '8021q ') && syHist(sh, /(rmmod|modprobe\s+-r)\s+x_tables/) },
  { title: "Bond'u kaldır",
    story: "LACP testi bitti, bonding modülünü kaldıracaksın, bu sefer modprobe -r ile. Önce conntrack modülünü kaldırmayı dene, NAT ve firewall modüllerinin onu tuttuğunu gör.",
    task: 'nf_conntrack modülünü rmmod ile kaldırmayı dene, sonra bonding modülünü modprobe -r ile kaldır.',
    hint: "`modprobe -r` modülü kaldırır ve gerçek sistemde artık kimsenin kullanmadığı bağımlılıkları da temizler. nf_conntrack bağlantı takibini yapar, NAT ve stateful firewall ona dayandığı için in use by hatası verir. Kaldırmadan sonra lsmod'da bonding satırı görünmemeli.",
    setup: sh => { if (!syHas(sh, '/proc/modules', 'bonding ')) vadRoot(sh, () => SYS_CMDS.modprobe.call(sh, ['bonding'])); },
    solution: 'sudo rmmod nf_conntrack\nsudo modprobe -r bonding\nlsmod | grep bonding',
    check: sh => !syHas(sh, '/proc/modules', 'bonding ') && syHist(sh, /(rmmod|modprobe\s+-r)\s+nf_conntrack/) },
], { hint: "`rmmod` bir modülü kernel'den çıkarır ama başka bir modül onu kullanıyorsa in use by hatası verir ve kullananları listeler. Önce kullananları kaldırmak gerekir, bağımlılığı olmayan modül doğrudan çıkar. `modprobe -r` aynı işi bağımlılıkları da hesaba katarak yapar. İkisi de root ister." });

addVariants('sa6', [
  { title: 'nginx 65535 istiyor',
    story: "Yoğun bir branch portalında nginx worker'ları too many open files diyor. Servisi değiştirmeden önce test için bu shell'de limiti 65535'e çekeceksin.",
    task: 'Açık dosya limitini gör ve bu shell için 65535 yap.',
    hint: "`ulimit -n` tek başına mevcut soft limiti yazar, ardına sayı verince değiştirir. Hard limit bu değerin üstündeyse root gerekmez. Bu ayar sadece bu shell'den başlayan process'leri etkiler, systemd ile başlayan nginx için unit dosyasında LimitNOFILE gerekir.",
    solution: 'ulimit -n\nulimit -n 65535\nulimit -n',
    check: sh => syState(sh, 'nofile') === '65535' },
  { title: 'Tavana kadar',
    story: "Bir log toplayıcı çok sayıda dosya açıyor, limiti olabildiğince yükseltmek istiyorsun. Önce tavanın ne olduğunu öğren, tavanın üstünü dene ve hatayı gör, en son tam tavana çek.",
    task: 'Hard limiti gör, ondan büyük bir değeri dene, sonra soft limiti hard limite eşitle.',
    hint: "`ulimit` için `-H` hard limiti, `-S` soft limiti seçer, ikisi de verilmezse soft değişir. Sıradan kullanıcı soft limiti hard limitin üstüne çıkaramaz, Operation not permitted alır. Hard limiti artırmak root ya da limits.conf işidir.",
    solution: 'ulimit -Hn\nulimit -n 2000000\nulimit -n 1048576',
    check: sh => syState(sh, 'nofile') === (syState(sh, 'nofileHard') || '1048576') },
], { hint: "`ulimit -n` bu shell ve ondan başlayan process'lerin açabileceği dosya sayısının soft limitini gösterir, sayı verirsen değiştirir. Sıradan kullanıcı soft limiti hard limite kadar yükseltebilir, üstü root ister. Değişiklik sadece bu shell için geçerlidir, kalıcı ayar /etc/security/limits.conf ya da systemd unit'te LimitNOFILE." });

addVariants('sa7', [
  { title: 'Kernel sonrası reboot',
    story: "Yeni kernel kuruldu, aktif olması için reboot lazım. Kullanıcılara 15 dakika süre ver ve sebebini mesajda yaz. Sonra müşteri son dakika erteleme istiyor, planı iptal et.",
    task: 'Kutuyu 15 dakika sonra mesajla yeniden başlatmaya planla, sonra iptal et.',
    hint: "`-r` seçeneği poweroff yerine reboot planlar, `+15` şimdiden 15 dakika sonra demektir. Tırnak içindeki metin wall mesajı olarak herkesin terminaline düşer, sebebi yazmak gereksiz ticket'ı önler. İptal için `-c` yeter, iptal de herkese duyurulur.",
    solution: 'sudo shutdown -r +15 "kernel guncellemesi icin reboot"\nsudo shutdown -c',
    check: sh => vadNoSchedule(sh) && syHist(sh, /shutdown\s+-r\s+\+15\b/) && syHist(sh, /shutdown\s+-c/) },
  { title: 'UPS bakımı',
    story: "Bina UPS'i bakıma giriyor, kutunun 30 dakika sonra kapanması gerekiyor. Plan yapıldıktan sonra elektrikçiler bakımı ertelediğini haber veriyor, iptali de kullanıcılara bir mesajla duyur.",
    task: 'Kutuyu 30 dakika sonraya mesajla kapatmaya planla, sonra iptal ederken de bir mesaj ver.',
    hint: "Zaman `+30` biçiminde dakika cinsindendir, saniye değil. systemd'de seçenek vermezsen poweroff yapılır, `-h` eklemek gerekmez. `-c` de bir mesaj alabilir, iptal sebebini herkese duyurmak iyi bir alışkanlık.",
    solution: 'sudo shutdown +30 "UPS bakimi"\nsudo shutdown -c "UPS bakimi ertelendi"',
    check: sh => vadNoSchedule(sh) && syHist(sh, /shutdown\s+(-[hP]\s+)?\+30\b/) && syHist(sh, /shutdown\s+-c/) },
], { hint: "`shutdown` zamanı `+dakika`, `hh:mm` ya da now biçiminde alır, arkasından gelen metin tüm oturumlara wall mesajı olarak gider. Modern systemd'de varsayılan poweroff'tur, `-r` yeniden başlatır. Planı `shutdown -c` iptal eder, ikisi de root ister." });

addVariants('sa8', [
  { title: 'Gece raporu',
    story: "Aylık rapor script'i ~/scripts/gece-rapor.sh hazır. Sistem yükü azaldığında, bu gece `23:30` saatinde bir kez çalışsın istiyorsun. cron'a koymak gereksiz, bir daha çalışmayacak.",
    task: 'gece-rapor.sh dosyasını at -f ile `23:30` saatine planla, atq ile kuyruğu gör, at-tick ile tetikle.',
    hint: "`at` komutları stdin yerine `-f` ile bir dosyadan da okur, dosyanın içeriği iş olarak kuyruğa girer. Saat tek başına yazılınca bugünün o saati demektir, geçtiyse yarına kayar. `atq` çıktısında iş numarasını ve zamanı görürsün, at-tick lab'da zamanı ileri sarar.",
    setup: sh => { vadHome(sh, 'scripts/gece-rapor.sh', '#!/bin/bash\necho "gece raporu arsivlendi"\n', 0o755); },
    solution: 'at -f ~/scripts/gece-rapor.sh 23:30\natq\nat-tick',
    check: (sh, c) => syRan(c, /^at-tick/) && c.out.includes('gece raporu arsivlendi') },
  { title: 'Yanlış iş kuyrukta',
    story: "Dün biri eski yedek script'ini at kuyruğuna koymuş, o script artık yanlış diske yazıyor. Kuyruktaki işi sil, yerine yeni yedek script'ini bir saat sonraya planla.",
    task: 'atq ile kuyruğa bak, eski işi atrm ile sil, yeni-yedek.sh script\'ini bir saat sonraya planla ve at-tick ile tetikle.',
    hint: "`atq` her işin numarasını ilk sütunda verir, `atrm` bu numarayı alıp işi kuyruktan siler. Yeni iş için komutu echo ile `at`'e pipe edersin, zaman `now + 1 hour` biçiminde yazılır. Silmeden önce `at -c` ile işin içeriğine bakmak doğru işi sildiğinden emin olmanı sağlar.",
    setup: sh => {
      vadHome(sh, 'scripts/eski-yedek.sh', '#!/bin/bash\necho "ESKI YEDEK CALISTI, /dev/sdc1 yazildi"\n', 0o755);
      vadHome(sh, 'scripts/yeni-yedek.sh', '#!/bin/bash\necho "yeni yedek tamam, /data/backup yazildi"\n', 0o755);
      const d = vadDir(sh, SYS_ATDIR); if (d) d.c = {};
      sh.install(SYS_ATDIR + '/a00001', mkfile(`# at job 1\n# when ${Date.now() + 20 * 3600000}\n# user ${USER}\nbash ~/scripts/eski-yedek.sh\n`, 0o700, USER));
    },
    solution: 'atq\natrm 1\necho "bash ~/scripts/yeni-yedek.sh" | at now + 1 hour\nat-tick',
    check: (sh, c) => syRan(c, /^at-tick/) && c.out.includes('yeni yedek tamam') && !c.out.includes('ESKI') },
], { hint: "`at` bir kerelik işi kuyruğa koyar ve çalıştırılacak komutu stdin'den okur, bu yüzden echo ile pipe edersin. Zaman `now + 5 minutes`, `10:30` ya da tomorrow gibi yazılır. `atq` kuyruğu gösterir, `atrm` siler. Lab'da zaman akmadığı için at-tick kuyruğu hemen çalıştırır." });

addVariants('sa9', [
  { title: 'Bellek izleme',
    story: "Branch sunucusunda gece bellek sızıntısı şüphesi var, available değerinin düşüşünü izlemek istiyorsun. Her beş saniyede bir yenilenmesi yeterli.",
    task: 'free -h komutunu watch ile beş saniye aralıkla izle.',
    hint: "`watch` için `-n` yenileme aralığıdır, varsayılan iki saniye. `free` için `-h` değerleri Mi ve Gi gibi okunur birimlerle verir. Sızıntı ararken used değerinden çok available sütununun zamanla azalmasına bak.",
    solution: 'watch -n 5 free -h',
    check: (sh, c) => syRan(c, /^watch\b.*free/) && c.out.includes('Every 5.0s') },
  { title: 'Load değişimi',
    story: "Bir cron işi her dakika başında load average'ı zıplatıyor gibi. /proc/loadavg dosyasını saniyede bir izle, değişen rakamlar vurgulansın ki gözünden kaçmasın.",
    task: 'cat /proc/loadavg komutunu watch ile bir saniye aralıkla ve farkları vurgulayarak izle.',
    hint: "`-d` her yenilemede bir öncekinden farklı olan karakterleri vurgular, hızlı değişen sayılarda işini kolaylaştırır. `-n 1` saniyede bir çalıştırır, izlediğin komut ağırsa bu kadar kısa aralık sisteme yük bindirir. /proc/loadavg ilk üç sayıda 1, 5 ve 15 dakikalık ortalamayı tutar.",
    solution: 'watch -d -n 1 cat /proc/loadavg',
    check: (sh, c) => syRan(c, /^watch\b.*-d/) && c.out.includes('Every 1.0s') },
], { hint: "`watch` verdiğin komutu belirli aralıkla tekrar çalıştırıp ekranı yeniler. `-n` aralığı saniye cinsinden belirler, `-d` iki yenileme arasında değişen yerleri vurgular. Ctrl+C ile çıkılır. Komut pipe içeriyorsa tırnak içine al, yoksa pipe watch'un çıktısına uygulanır." });

addVariants('sa10', [
  { title: 'Log dizinine kısayol',
    story: "Her incident'ta /var/log/nginx altına uzun yol yazmaktan sıkıldın. Tek dosya değil, dizinin kendisine bir kısayol istiyorsun, home'unda nginxlogs adıyla.",
    task: '/var/log/nginx dizini için home directory\'nde nginxlogs adında symbolic link oluştur ve içini listele.',
    hint: "Symbolic link dizinlere de verilebilir, hard link verilemez. Sıra her zaman önce hedef sonra link adıdır, tersini yazarsan var olmayan bir hedefe link üretirsin. Link'i ls ile listelerken sonuna / koymak link'in kendisi yerine hedef dizinin içeriğini gösterir.",
    setup: sh => { const n = sh.node(VAD_H + '/nginxlogs'); if (n && n.l) vadDel(sh, VAD_H + '/nginxlogs'); },
    solution: 'ln -s /var/log/nginx ~/nginxlogs\nls ~/nginxlogs/',
    check: sh => vadLinkTo(sh, VAD_H + '/nginxlogs') === '/var/log/nginx' },
  { title: 'Release değiştir',
    story: "Uygulama /opt/sdwan-portal/releases altında sürüm sürüm duruyor, servis her zaman /opt/sdwan-portal/current yolunu okuyor. current şu an v1.4'ü gösteriyor, v1.5'e geçeceksin. Link'i silip yeniden yaratmak yerine tek komutla üzerine yaz.",
    task: '/opt/sdwan-portal/current link\'ini /opt/sdwan-portal/releases/v1.5 dizinine çevir.',
    hint: "`ln` için `-s` symbolic, `-f` var olan link'i silip yenisini koyar, `-n` hedefteki link bir dizini gösteriyorsa onu dizin gibi takip etme der. `-n` olmadan yeni link current'ın gösterdiği dizinin içine düşer ve current değişmez. Bu desen deploy'larda geri dönüşü tek komuta indirir.",
    setup: sh => {
      const base = vadDir(sh, '/opt/sdwan-portal', USER); if (base) base.o = USER; vadDir(sh, '/opt/sdwan-portal/releases', USER);
      vadFile(sh, '/opt/sdwan-portal/releases/v1.4/app.py', 'VERSION = "1.4"\n', 0o644, USER);
      vadFile(sh, '/opt/sdwan-portal/releases/v1.5/app.py', 'VERSION = "1.5"\n', 0o644, USER);
      const ln = mkfile('', 0o777, USER); ln.l = '/opt/sdwan-portal/releases/v1.4';
      sh.node('/opt/sdwan-portal').c.current = ln;
    },
    solution: 'ls -l /opt/sdwan-portal\nln -sfn /opt/sdwan-portal/releases/v1.5 /opt/sdwan-portal/current\nls -l /opt/sdwan-portal/current',
    check: sh => vadLinkTo(sh, '/opt/sdwan-portal/current') === '/opt/sdwan-portal/releases/v1.5' },
], { hint: "`ln -s` symbolic link oluşturur, önce hedef sonra link adı gelir, sırayı karıştırmak en sık hatadır. `ls -l` link'i ok işaretiyle ve hedefiyle gösterir. `-s` olmadan hard link olur, dizinlere hard link verilemez." });

/* ======================================================================
   Uzak Erisim ve Transfer
   ====================================================================== */
addVariants('rm1', [
  { title: 'web01 ne zamandır ayakta',
    story: "Gece web01.lab'ın reboot olduğundan şüpheleniyorsun. Oturum açıp prompt beklemek yerine tek satırda uptime çıktısını almak istiyorsun.",
    task: 'web01.lab üzerinde uptime komutunu çalıştır.',
    hint: "`ssh` ile host adından sonraki kelimeler uzak komut olur, iş bitince bağlantı kendiliğinden kapanır. uptime çıktısındaki up süresi son reboot'tan beri geçen zamanı verir. Uzak komut pipe içeriyorsa tamamını tırnak içine al, yoksa pipe senin makinende çalışır.",
    solution: 'ssh web01.lab uptime',
    check: (sh, c) => syRan(c, /^ssh\s+(\S+@)?web01(\.lab)?\s+uptime/) && c.out.includes('load average') },
  { title: 'Edge kernel sürümü',
    story: "İstanbul'daki edge-ist.lab kutusu SD-WAN overlay'ini taşıyor, vendor bir kernel bug'ı için tam sürümü soruyor. Kutuya interaktif girmene gerek yok.",
    task: 'edge-ist.lab üzerinde uname -a çalıştır ve çıktının o kutudan geldiğini gör.',
    hint: "`ssh` ile host adından sonra komutu ve seçeneklerini aynen yazarsın, `-a` uname'e gider, ssh'a değil. uname çıktısındaki ikinci alan uzak kutunun hostname'idir, doğru kutuda olduğunu buradan anlarsın. Host adı çözülemezse Could not resolve hostname alırsın, /etc/hosts ya da DNS'e bak.",
    setup: sh => { vadHost(sh, 'edge-ist.lab'); },
    solution: 'ssh edge-ist.lab uname -a',
    check: (sh, c) => syRan(c, /^ssh\s+(\S+@)?edge-ist(\.lab)?\s+uname/) && c.out.includes('edge-ist') },
], { hint: "`ssh` host adından sonra yazdığın her şeyi uzakta komut olarak çalıştırır ve çıktıyı getirir, interaktif oturum açmaz. Kullanıcı farklıysa user@host, port farklıysa `-p` verilir. Yanlış port verirsen Connection refused alırsın, sunucu o portta dinlemiyor demektir." });

addVariants('rm2', [
  { title: 'Eski cihaz için RSA',
    story: "Branch'teki eski bir firewall'un yönetim arayüzü ed25519 tanımıyor, sadece RSA kabul ediyor. 4096 bit bir RSA anahtarı üret, yorumda hangi iş için olduğu yazsın.",
    task: '4096 bit, yorumu burak@legacy-fw olan bir RSA anahtar çifti üret.',
    hint: "`-t rsa` tipi seçer, `-b` bit uzunluğudur, RSA için 3072 altına inme, 4096 eski cihazlarla uyumlu ve güvenli bir seçim. Dosya adı vermezsen anahtar id_rsa ve id_rsa.pub olarak kaydedilir. Aynı isimde dosya varsa ssh-keygen üzerine yazmak için sorar, mevcut anahtarı ezmemeye dikkat et.",
    solution: 'ssh-keygen -t rsa -b 4096 -C "burak@legacy-fw"\nls -l ~/.ssh',
    check: sh => syHas(sh, VAD_H + '/.ssh/id_rsa.pub', 'ssh-rsa') && syEx(sh, VAD_H + '/.ssh/id_rsa') },
  { title: 'Deploy anahtarı',
    story: "CI pipeline'ı branch sunucularına deploy edecek. Kişisel anahtarını kullanmak yerine ayrı ve passphrase'siz bir deploy anahtarı istiyorsun, ayrı dosyada dursun ki kişisel anahtarın ezilmesin.",
    task: '~/.ssh/deploy_ed25519 dosyasına, passphrase\'siz, yorumu deploy@linuxlab olan bir ed25519 anahtarı üret.',
    hint: "`-f` anahtarın kaydedileceği dosyayı belirler, vermezsen varsayılan id_ed25519'u ezme riski vardır. `-N` passphrase'i komut satırından verir, boş tırnak passphrase yok demek, otomasyon için gerekli ama bu yüzden dosyayı iyi korumalısın. `-C` yorumu authorized_keys içinde anahtarın sahibini gösterir.",
    solution: 'ssh-keygen -t ed25519 -f ~/.ssh/deploy_ed25519 -N "" -C "deploy@linuxlab"\nls -l ~/.ssh',
    check: sh => syHas(sh, VAD_H + '/.ssh/deploy_ed25519.pub', 'deploy@linuxlab') && syEx(sh, VAD_H + '/.ssh/deploy_ed25519') },
], { hint: "`ssh-keygen` bir anahtar çifti üretir, private key ~/.ssh altında sende kalır, .pub uzantılı public key sunuculara dağıtılır. `-t` tipi seçer, modern seçim ed25519. `-C` yorum alanıdır, authorized_keys içinde anahtarın kime ait olduğunu anlatır. Private key'i asla kopyalayıp paylaşma." });

addVariants('rm3', [
  { title: 'web01 için anahtar',
    story: "web01.lab'a her deploy'da şifre yazıyorsun. Mevcut anahtarını oraya dağıt, bundan sonra şifre sorulmasın.",
    task: 'Public key\'ini web01.lab sunucusuna kopyala ve authorized_keys dosyasını kontrol et.',
    hint: "`ssh-copy-id` ~/.ssh altındaki varsayılan public key'i bulur ve uzaktaki authorized_keys dosyasının sonuna ekler, zaten varsa atlar. Sadece .pub dosyası gider, private key makinenden çıkmaz. Kontrol için uzak dosyayı ssh ile cat etmen yeter, satırın sonunda anahtarın yorumunu görürsün.",
    setup: sh => { vadEnsureKey(sh); },
    solution: 'ssh-copy-id burak@web01.lab\nssh web01.lab cat .ssh/authorized_keys',
    check: sh => { const k = vadKeyId(vadKeyLine(sh)); return !!k && syHas(sh, vadAuthKeys(sh, 'web01.lab'), k); } },
  { title: 'Deploy anahtarını dağıt',
    story: "Ayrı ürettiğin deploy anahtarını NMS sunucusu nms.lab'a koyacaksın, kişisel anahtarını değil. ssh-copy-id varsayılan olarak kişisel anahtarı seçer, hangi dosyayı göndereceğini açıkça söylemen lazım.",
    task: '~/.ssh/deploy_ed25519.pub anahtarını nms.lab sunucusuna kopyala.',
    hint: "`-i` gönderilecek public key dosyasını seçer, vermezsen ssh-copy-id id_ed25519 ya da id_rsa gibi varsayılanı kullanır. Dosya adını .pub ile vermek neyin gideceğini netleştirir, private key hiçbir zaman gönderilmez. Kopyalamadan sonra uzaktaki authorized_keys satırının yorumunda deploy@linuxlab görmelisin.",
    setup: sh => { vadHost(sh, 'nms.lab'); vadDeployKey(sh); },
    solution: 'ssh-copy-id -i ~/.ssh/deploy_ed25519.pub burak@nms.lab\nssh nms.lab cat .ssh/authorized_keys',
    check: sh => { const n = sh.node(VAD_H + '/.ssh/deploy_ed25519.pub'); return !!n && syHas(sh, vadAuthKeys(sh, 'nms.lab'), vadKeyId(n.d)); } },
], { hint: "`ssh-copy-id` public key'ini uzak sunucudaki ~/.ssh/authorized_keys dosyasına ekler, dosya ve dizin izinlerini de doğru ayarlar. Bu işlem son kez şifre sorar. Elle yapacaksan .pub dosyasının içeriğini o dosyaya ekleyip dosyayı 600, dizini 700 yaparsın." });

addVariants('rm4', [
  { title: "Kanıt auth.log'da",
    story: "Denetçi web01.lab'a şifreyle değil anahtarla girildiğinin kanıtını istiyor. Sunucunun kendi log'u en iyi kanıt, son satırda az önceki kendi girişin olacak.",
    task: 'web01.lab üzerindeki /var/log/auth.log dosyasının son satırını ssh ile göster ve girişin publickey ile yapıldığını gör.',
    hint: "`ssh` ile uzak komut olarak `tail` çalıştırırsın, `-1` son satırı getirir ve o satır az önceki kendi girişindir. Accepted publickey anahtarla, Accepted password şifreyle girildiğini söyler. Şifre sorulduysa anahtarın authorized_keys'e eklenmemiştir, önce onu düzelt.",
    setup: sh => { vadAuthorize(sh, 'web01.lab', vadEnsureKey(sh)); },
    solution: 'ssh web01.lab tail -1 /var/log/auth.log',
    check: (sh, c) => syRan(c, /^ssh\s+(\S+@)?web01(\.lab)?\s+tail/) && c.out.includes('Accepted publickey for burak') && !c.out.includes('password:') },
  { title: 'Şifre soruyorsa dağıt',
    story: "edge-ist.lab'a otomasyon bağlanamıyor çünkü şifre soruluyor. Önce dene ve şifre istendiğini gör, sonra anahtarını oraya dağıt ve tekrar dene.",
    task: 'edge-ist.lab üzerinde whoami çalıştır, şifre soruluyorsa anahtarını kopyala ve tekrar dene.',
    hint: "İlk denemede password satırı görmek anahtarın o sunucuda olmadığı anlamına gelir. `ssh-copy-id` public key'i uzaktaki authorized_keys'e ekler, kullanıcı vermezsen yerel kullanıcı adınla bağlanır. İkinci denemede çıktı sadece kullanıcı adı olmalı, araya şifre satırı girmemeli.",
    setup: sh => { vadHost(sh, 'edge-ist.lab'); vadEnsureKey(sh); vadDel(sh, vadAuthKeys(sh, 'edge-ist.lab')); },
    solution: 'ssh edge-ist.lab whoami\nssh-copy-id edge-ist.lab\nssh edge-ist.lab whoami',
    check: (sh, c) => syRan(c, /^ssh\s+(\S+@)?edge-ist(\.lab)?\s+whoami/) && c.out.trim() === 'burak' && syHist(sh, /ssh-copy-id\s+(-\S+\s+)*(\S+@)?edge-ist/) },
], { hint: "Anahtar doğru dağıtıldıysa `ssh` şifre sormadan girer, çıktıda password satırı görmezsin. Hâlâ soruyorsa uzaktaki ~/.ssh izinleri ya da authorized_keys içeriği yanlıştır. Sunucu tarafında auth.log her girişin publickey mi password mı olduğunu yazar." });

addVariants('rm5', [
  { title: "Config'i incelemeye gönder",
    story: "nginx config'inin neden açılmadığını web01.lab'daki kıdemli arkadaşın inceleyecek. Dosyayı oranın /tmp dizinine bırak, o kendisi alacak.",
    task: '/etc/nginx/nginx.conf dosyasını web01.lab üzerindeki /tmp dizinine kopyala ve orada olduğunu ssh ile gör.',
    hint: "`scp` için kaynak yerel dosya, hedef `host:yol` biçiminde uzak dizindir. Hedefte iki noktayı unutursan web01.lab adında yerel bir dosya oluşur ve hata bile almazsın. Uzak /tmp herkese yazılabilir olduğu için oraya bırakmak yetki sorunu çıkarmaz.",
    setup: sh => { sysEnsure(sh); vadDir(sh, vadRemote('web01.lab', '/tmp'), 'root', 0o777); },
    solution: 'scp /etc/nginx/nginx.conf web01.lab:/tmp/\nssh web01.lab ls /tmp',
    check: sh => syEx(sh, vadRemote('web01.lab', '/tmp/nginx.conf'), 'f') },
  { title: "Latency raporu NMS'e",
    story: "Aylık branch latency ölçümlerini CSV olarak çıkardın, NMS sunucusu nms.lab üzerinde /srv/reports altında toplanıyor. Raporu oraya gönder.",
    task: '~/reports/latency-2026-10.csv dosyasını nms.lab üzerindeki /srv/reports dizinine kopyala.',
    hint: "`scp` kaynak ve hedefi cp ile aynı sırayla alır, önce gönderilecek dosya sonra `host:dizin`. Uzak yol / ile başlarsa kökten, başlamazsa uzaktaki home'dan itibaren okunur. Hedef dizin uzakta yoksa scp dizin oluşturmaz, No such file or directory der.",
    setup: sh => {
      vadHost(sh, 'nms.lab'); vadDir(sh, vadRemote('nms.lab', '/srv/reports'));
      vadHome(sh, 'reports/latency-2026-10.csv', 'site,avg_ms,p95_ms,loss\nist-01,18,31,0.0\nams-02,7,12,0.0\nizm-03,24,58,0.4\n');
    },
    solution: 'scp ~/reports/latency-2026-10.csv nms.lab:/srv/reports/\nssh nms.lab ls /srv/reports',
    check: sh => syEx(sh, vadRemote('nms.lab', '/srv/reports/latency-2026-10.csv'), 'f') },
], { hint: "`scp` cp gibi kaynak ve hedef alır, uzak taraf `host:yol` biçiminde yazılır. İki noktayı unutursan scp yerel bir dosya oluşturur ve hiçbir şey gönderilmez. Hedef dizinin sonuna / koymak oranın bir dizin olduğunu netleştirir." });

addVariants('rm6', [
  { title: "web01 log'u masaya",
    story: "web01.lab'da tuhaf istekler olduğu söyleniyor. Access log'u kendi makinene indir, orada rahatça grep'le, sunucuda iz bırakma.",
    task: 'web01.lab üzerindeki /var/log/nginx/access.log dosyasını /tmp/web01-access.log olarak indir ve içindeki 404 satırlarını grep ile göster.',
    hint: "`scp` ile kaynak uzak olunca önce `host:yol`, sonra yerel hedef yazılır. Hedef olarak dizin yerine dosya adı verirsen indirilen dosya o adla kaydedilir, birden çok sunucudan aynı isimli log indirirken çakışmayı önler. Sonra `grep` ile durum kodunu süzersin.",
    setup: sh => {
      sysEnsure(sh);
      const p = vadRemote('web01.lab', '/var/log/nginx/access.log');
      if (!syHas(sh, p, 'wp-login.php')) vadFile(sh, p, '192.168.1.10 - - [13/Oct/2026:09:00:01 +0200] "GET / HTTP/1.1" 200 612\n203.0.113.45 - - [13/Oct/2026:09:01:10 +0200] "GET /wp-login.php HTTP/1.1" 404 153\n192.168.1.22 - - [13/Oct/2026:09:05:40 +0200] "GET /api/status HTTP/1.1" 200 48\n');
    },
    solution: 'scp web01.lab:/var/log/nginx/access.log /tmp/web01-access.log\ngrep 404 /tmp/web01-access.log',
    check: (sh, c) => syEx(sh, '/tmp/web01-access.log', 'f') && syRan(c, /grep\b.*404/) && c.out.includes('wp-login.php') },
  { title: 'Edge config yedeği',
    story: "edge-ist.lab'daki FRR ve netplan ayarları dün gece yedeklenmiş. Değişiklikten önce yedeği ~/restore altına çek ve açmadan içinde ne olduğuna bak.",
    task: 'edge-ist.lab üzerindeki /var/backups/edge-config-2026-10-12.tar.gz dosyasını ~/restore altına indir ve içeriğini listele.',
    hint: "`scp` uzak dosyayı yerel dizine indirirken hedef dizinin var olması gerekir, sondaki / onu netleştirir. `tar` için `t` arşivi açmadan listeler, `z` gzip, `f` dosya adını alır. Listede mutlak yol ya da .. ile başlayan bir şey görürsen açmadan önce dur.",
    setup: sh => {
      vadHost(sh, 'edge-ist.lab'); vadDir(sh, VAD_H + '/restore', USER);
      vadFile(sh, vadRemote('edge-ist.lab', '/var/backups/edge-config-2026-10-12.tar.gz'), vadTarGz('edge-config-2026-10-12.tar.gz', [
        { p: 'etc/', t: 'd', o: 'root' }, { p: 'etc/frr/', t: 'd', o: 'root' },
        { p: 'etc/frr/frr.conf', t: 'f', o: 'root', d: 'router bgp 65010\n neighbor 10.20.0.1 remote-as 65000\n' },
        { p: 'etc/netplan/', t: 'd', o: 'root' },
        { p: 'etc/netplan/01-wan.yaml', t: 'f', o: 'root', d: 'network:\n  ethernets:\n    eth0:\n      dhcp4: true\n' },
      ]));
    },
    solution: 'scp edge-ist.lab:/var/backups/edge-config-2026-10-12.tar.gz ~/restore/\ntar tzf ~/restore/edge-config-2026-10-12.tar.gz',
    check: (sh, c) => syEx(sh, VAD_H + '/restore/edge-config-2026-10-12.tar.gz', 'f') && syRan(c, /tar\s+-?t/) && c.out.includes('frr.conf') },
], { hint: "Ters yönde de aynı mantık geçerli, kaynak `host:yol`, hedef yerel dizin. İndirdiğin arşivi açmadan önce `tar tzf` ile içine bakmak beklemediğin yollara dosya saçılmasını önler. t listele, z gzip, f dosya demek." });

addVariants('rm7', [
  { title: "Şablonları edge'e taşı",
    story: "Branch config şablonlarını ~/configs/branch-templates altında hazırladın. edge-ist.lab üzerinde render edilecekler, tüm dizini oradaki home'una gönder.",
    task: '~/configs/branch-templates dizinini edge-ist.lab üzerindeki home directory\'ne kopyala.',
    hint: "`-r` dizini içindekilerle birlikte kopyalar, unutursan scp not a regular file der ve dizini atlar. Hedefte ~ uzaktaki kullanıcının home'u demek, iki noktadan sonra yazıldığı için yerel shell onu açmaz. Kontrol için uzakta ls çalıştırıp dosyaların geldiğini görürsün.",
    setup: sh => {
      vadHost(sh, 'edge-ist.lab');
      vadHome(sh, 'configs/branch-templates/ist-01.cfg', 'hostname ist-01\nwan1 dhcp\nwan2 lte\n');
      vadHome(sh, 'configs/branch-templates/ams-02.cfg', 'hostname ams-02\nwan1 static 198.51.100.10/29\n');
    },
    solution: 'scp -r ~/configs/branch-templates edge-ist.lab:~/\nssh edge-ist.lab ls branch-templates',
    check: sh => syEx(sh, vadRemote('edge-ist.lab', '/home/burak/branch-templates/ist-01.cfg'), 'f') },
  { title: "web01 config'ini çek",
    story: "web01.lab'daki nginx ayarlarını kendi makinende diff'lemek istiyorsun. Uzaktaki /etc/nginx dizininin tamamını ~/web01-nginx adıyla indir.",
    task: 'web01.lab üzerindeki /etc/nginx dizinini ~/web01-nginx olarak indir ve içini listele.',
    hint: "`-r` ters yönde de çalışır, kaynak uzak dizin, hedef yerel yol olur. Hedef yol yoksa dizin o adla oluşur, varsa kaynak dizin onun içine nginx adıyla girer, bu farkı bilmek dosyaları ararken zaman kazandırır. Uzak config'i yerel kopyada incelemek sunucuda yanlışlıkla değişiklik yapma riskini sıfırlar.",
    setup: sh => { sysEnsure(sh); vadDel(sh, VAD_H + '/web01-nginx'); if (!sh.node(vadRemote('web01.lab', '/etc/nginx/nginx.conf'))) vadFile(sh, vadRemote('web01.lab', '/etc/nginx/nginx.conf'), 'user www-data;\nworker_processes auto;\n'); },
    solution: 'scp -r web01.lab:/etc/nginx ~/web01-nginx\nls ~/web01-nginx',
    check: sh => syEx(sh, VAD_H + '/web01-nginx/nginx.conf', 'f') },
], { hint: "`scp` dizin kopyalamak için `-r` ister, yoksa not a regular file der. Uzak tarafta ~ hedefin home dizinidir. Kaynak dizinin kendisi hedefin içine aynı adla kopyalanır." });

addVariants('rm8', [
  { title: "Dashboard'ları NMS'e",
    story: "Grafana dashboard export'larını ~/dashboards altında tutuyorsun, nms.lab üzerindeki /var/www/dash dizini bunların yayınlandığı yer. Orada artık kullanılmayan eski MPLS dashboard'u duruyor, senkron sonrası gitmeli.",
    task: '~/dashboards içeriğini nms.lab üzerindeki /var/www/dash dizinine --delete ile senkronla, önce dry run yap.',
    hint: "Dry run için `-n` ekle ve deleting satırlarında sadece silinmesini beklediğin dosyaların olduğunu doğrula. Kaynak yolun sonundaki / unutulursa dashboards dizininin kendisi hedefin içine kopyalanır ve --delete beklenmedik dosyaları siler. Çıktı temizse aynı komutu `-n` olmadan çalıştırırsın.",
    setup: sh => {
      vadHost(sh, 'nms.lab');
      vadHome(sh, 'dashboards/wan-overview.json', '{"title":"WAN overview"}\n');
      vadHome(sh, 'dashboards/lte-backup.json', '{"title":"LTE backup links"}\n');
      vadFile(sh, vadRemote('nms.lab', '/var/www/dash/old-mpls.json'), '{"title":"MPLS legacy"}\n');
    },
    solution: 'rsync -avn --delete ~/dashboards/ nms.lab:/var/www/dash/\nrsync -av --delete ~/dashboards/ nms.lab:/var/www/dash/',
    check: sh => syEx(sh, vadRemote('nms.lab', '/var/www/dash/wan-overview.json'), 'f') && !syEx(sh, vadRemote('nms.lab', '/var/www/dash/old-mpls.json')) && syHist(sh, /rsync\s+-\w*n\w*\s.*dashboards/) },
  { title: 'web01 aynası',
    story: "web01.lab'ın web kökünü kendi makinende ~/mirror/web01 altında ayna olarak tutuyorsun. Bu sefer yön ters, kaynak uzak sunucu. Yerel aynada sunucudan çoktan kalkmış eski bir banner dosyası var, senkron onu da temizlemeli.",
    task: 'web01.lab üzerindeki /var/www/html içeriğini ~/mirror/web01 dizinine --delete ile çek, önce dry run yap.',
    hint: "`rsync` yönü kaynak ve hedefin sırasıyla belirlenir, uzak taraf önce yazılırsa çekme yapılır. `--delete` bu sefer yerel aynadaki fazlalıkları siler, dry run çıktısında deleting satırını görmeden gerçek çalıştırmaya geçme. Kaynak sonundaki / html dizininin kendisini değil içeriğini getirir.",
    setup: sh => {
      sysEnsure(sh);
      vadFile(sh, vadRemote('web01.lab', '/var/www/html/index.html'), '<h1>web01, production front</h1>\n');
      vadFile(sh, vadRemote('web01.lab', '/var/www/html/status.html'), '<p>all branches up</p>\n');
      vadHome(sh, 'mirror/web01/index.html', '<h1>eski</h1>\n');
      vadHome(sh, 'mirror/web01/old-banner.html', '<marquee>bakim</marquee>\n');
    },
    solution: 'rsync -avn --delete web01.lab:/var/www/html/ ~/mirror/web01/\nrsync -av --delete web01.lab:/var/www/html/ ~/mirror/web01/',
    check: sh => syEx(sh, VAD_H + '/mirror/web01/status.html', 'f') && !syEx(sh, VAD_H + '/mirror/web01/old-banner.html') && syHist(sh, /rsync\s+-\w*n\w*\s.*web01/) },
], { hint: "`rsync` sadece değişen dosyaları gönderir. `-a` izin, sahiplik ve zamanları korur, `-v` neyin gittiğini listeler, `-n` dry run yapar ve hiçbir şey değiştirmez. `--delete` hedefte kaynakta olmayan dosyaları siler, bu yüzden önce dry run çıktısındaki deleting satırlarını okursun. Kaynak sonundaki / dizinin içeriğini gönderir." });

addVariants('rm9', [
  { title: 'Batch dosyasıyla sftp',
    story: "Her sabah web01.lab'dan aynı log'u çekiyorsun ve interaktif sftp'de hep aynı komutları yazıyorsun. sftp -b komutları bir dosyadan okur, işi cron'a koymaya hazır hale getirir.",
    task: 'nano ile ~/web01.batch dosyası yaz, içinde access.log\'u web01-access.log adıyla indiren bir get satırı olsun, home\'a geçip sftp -b ile çalıştır.',
    hint: "`sftp` için `-b` komutları satır satır bir dosyadan okur, promptta ne yazacaksan dosyaya onu yazarsın. get önce uzak yolu, sonra yerel adı alır, yerel ad göreli ise bulunduğun dizine düşer. Batch modunda bir komut hata verirse sftp durur, bu da cron'da sessiz yarım işleri önler.",
    setup: sh => { sysEnsure(sh); vadDel(sh, VAD_H + '/web01-access.log'); },
    solution: 'nano ~/web01.batch\ncd ~\nsftp -b ~/web01.batch web01.lab',
    editorContent: 'get /var/log/nginx/access.log web01-access.log\nquit\n',
    check: sh => syEx(sh, VAD_H + '/web01-access.log', 'f') && syHist(sh, /^sftp\s+(-\S+\s+)*-b\b/) },
  { title: 'SLA raporunu çek',
    story: "NMS sunucusu nms.lab haftalık SLA raporunu /srv/reports altına bırakıyor. Raporu ~/Documents altına almak istiyorsun, sftp'nin tek satırlık biçimiyle.",
    task: '~/Documents dizinine geç ve nms.lab üzerindeki /srv/reports/sla-week41.txt dosyasını sftp ile indir.',
    hint: "`sftp` için `host:yol` biçimi oturum açmadan tek dosya indirir ve dosyayı bulunduğun dizine koyar. Bu yüzden önce cd ile hedef dizine geçersin, yoksa dosya o an nerede duruyorsan oraya düşer. Uzak yol / ile başlamazsa uzaktaki home'a göre çözülür.",
    setup: sh => {
      vadHost(sh, 'nms.lab'); vadDir(sh, VAD_H + '/Documents', USER);
      vadFile(sh, vadRemote('nms.lab', '/srv/reports/sla-week41.txt'), 'Hafta 41 SLA\nist-01 99.97\nams-02 99.99\nizm-03 99.41 LTE failover 3 kez\n');
    },
    solution: 'cd ~/Documents\nsftp nms.lab:/srv/reports/sla-week41.txt\ncat sla-week41.txt',
    check: (sh, c) => syEx(sh, VAD_H + '/Documents/sla-week41.txt', 'f') && syHist(sh, /^sftp\s+\S*nms/) },
], { hint: "`sftp` ssh üzerinde interaktif transfer açar, sftp> promptunda get indirir, put yükler, ls ve cd gezer. Bunlar bash komutu değildir. Tek satırlık kullanımda `sftp host:yol` dosyayı bulunduğun dizine indirir, bu yüzden önce doğru dizine geç." });

addVariants('rm10', [
  { title: "Müşteri config'i",
    story: "edge-ist kutusunun running config export'u ~/exports altında düz metin duruyor ve içinde VPN PSK'leri var. Şifrele, şifreli kopyayı backup.lab'a gönder, sonra düz metni diskten kazı.",
    task: '~/exports/edge-ist-running.cfg dosyasını gpg ile şifrele, .gpg dosyasını backup.lab /var/backups altına gönder, sonra düz metin dosyayı shred ile yok et.',
    hint: "`gpg -c` aynı dizinde .gpg uzantılı şifreli bir kopya üretir, orijinale dokunmaz. Düz metni silmek için rm yetmez, `shred` içeriği önce ezer, `-u` sonra dosyayı siler. Sırayı karıştırma, gönderimin başarılı olduğunu görmeden düz metni yok edersen elinde sadece şifreli kopya kalır.",
    setup: sh => { sysEnsure(sh); vadHome(sh, 'exports/edge-ist-running.cfg', 'hostname edge-ist\ncrypto ipsec peer 203.0.113.20 psk Ist-Ams-2026!\n'); vadDel(sh, VAD_H + '/exports/edge-ist-running.cfg.gpg'); },
    solution: 'gpg --batch --passphrase Ist2026 -c ~/exports/edge-ist-running.cfg\nscp ~/exports/edge-ist-running.cfg.gpg backup.lab:/var/backups/\nshred -u ~/exports/edge-ist-running.cfg',
    check: sh => syEx(sh, vadRemote('backup.lab', '/var/backups/edge-ist-running.cfg.gpg'), 'f') && !syEx(sh, VAD_H + '/exports/edge-ist-running.cfg') && syHist(sh, /^shred\b/) },
  { title: "PSK'yı geri aç",
    story: "backup.lab'da şifreli duran vpn-psk.txt.gpg dosyasındaki ist-ams tüneli anahtarına ihtiyacın var, passphrase Branch2026. İndir, aç, oku, sonra açılmış düz metni kalıcı olarak yok et.",
    task: 'Dosyayı /tmp altına indir, gpg ile çöz, içeriğini oku, sonra çözülmüş dosyayı shred ile yok et.',
    hint: "`gpg` şifreli dosyayı argüman olarak alınca .gpg uzantısını atıp aynı yere düz metni yazar, `-d` verirsen ekrana basar. Passphrase yanlışsa Bad session key hatası alırsın. İş bitince düz metni `shred` ile ezmek gerekir çünkü rm sonrası veri diskte okunabilir kalır.",
    setup: sh => {
      sysEnsure(sh); vadDel(sh, '/tmp/vpn-psk.txt');
      vadFile(sh, vadRemote('backup.lab', '/var/backups/vpn-psk.txt.gpg'), sysPack('gpg', { n: 'vpn-psk.txt', p: sysHash('gpg:Branch2026', 32), d: 'tunnel ist-ams psk 7Hq2-Lm9x-Pw4k\n' }));
    },
    solution: 'scp backup.lab:/var/backups/vpn-psk.txt.gpg /tmp/\ngpg --batch --passphrase Branch2026 /tmp/vpn-psk.txt.gpg\ncat /tmp/vpn-psk.txt\nshred -u /tmp/vpn-psk.txt',
    check: sh => syEx(sh, '/tmp/vpn-psk.txt.gpg', 'f') && !syEx(sh, '/tmp/vpn-psk.txt') && syHist(sh, /gpg\b.*vpn-psk\.txt\.gpg/) && syHist(sh, /^shred\b.*vpn-psk\.txt\s*$/) },
], { hint: "`gpg -c` simetrik şifreler, aynı passphrase ile açılır ve dosya.gpg üretir. `--batch --passphrase` passphrase'i komut satırından verir, gerçek hayatta history'de kalacağı için dikkatli kullanılır. `shred -u` dosyanın içeriğini rastgele veriyle ezip siler, rm sadece dizin kaydını kaldırır." });

/* ======================================================================
   Job Kontrolu ve Oncelik
   ====================================================================== */
const VAD_TAIL = 'tail -f /var/log/syslog';
const VAD_PING = 'ping 10.50.0.61';
const VAD_REPORT = 'python3 /opt/report/build_report.py';
const VAD_YES = 'yes > /dev/null';

addVariants('jb1', [
  { title: 'syslog arkada aksın',
    story: "Bir branch'in bağlantısı kopup geliyor, syslog'u canlı izlemek istiyorsun ama terminali de kilitlemek istemiyorsun. tail -f'i arka plana at, job listesinde dursun.",
    task: 'tail -f /var/log/syslog komutunu arka planda başlat ve jobs -l ile PID\'siyle gör.',
    hint: "`tail -f` dosyayı takip eder ve kendiliğinden bitmez, sonuna `&` koymazsan terminal ona kilitlenir. `jobs -l` job numarasını, PID'yi ve durumu gösterir, Running görmelisin. Arka plandaki tail yine aynı terminale yazar, ekran kalabalıklaşırsa fg ile öne alıp Ctrl+C ile kapatırsın.",
    solution: VAD_TAIL + ' &\njobs -l',
    check: (sh, c) => !!syJob(sh, VAD_TAIL) && syRan(c, /^jobs\b/) && c.out.includes('Running') },
  { title: "Tünel ping'i arkada",
    story: "edge-ist.lab'a giden IPsec tüneli üzerinde bakım yapacaksın, 10.50.0.61'e sürekli ping atıp kopmayı yakalamak istiyorsun. Ping arkada dönsün, sen başka komutlar yazmaya devam et.",
    task: '10.50.0.61 adresine sürekli ping\'i arka planda başlat ve jobs -l ile gör.',
    hint: "`ping` sayı verilmezse sonsuza kadar çalışır, sonuna `&` koymak onu arka plana alır. `jobs -l` çıktısındaki PID ile ps'te aynı process'i bulursun. `-c` ile sayı verseydin ping kendi bitip job listesinden düşerdi.",
    solution: VAD_PING + ' &\njobs -l',
    check: (sh, c) => !!syJob(sh, VAD_PING) && syRan(c, /^jobs\b/) && c.out.includes('Running') },
], { hint: "Komutun sonuna `&` koyunca shell onu arka planda başlatır ve hemen prompt verir, köşeli parantezde job numarası, yanında PID yazar. `jobs` bu shell'in arka plan işlerini listeler, `-l` PID'yi de ekler. Job numarası sadece bu shell'de anlamlıdır, PID ise sistem geneli." });

addVariants('jb3', [
  { title: "tail'i dondur",
    story: "Arka plandaki tail -f ekranı sürekli dolduruyor, bir config'i düzenlerken çıktıyı okuyamıyorsun. Öldürmek istemiyorsun, sadece dondurup sonra sürdüreceksin. Job'ı numarasıyla değil adıyla adresle.",
    task: 'tail job\'ını adıyla durdur, jobs ile Stopped gör, sonra bg ile arkada sürdür.',
    hint: "Job adresi `%` ile başlar, ardından numara ya da komutun başı gelebilir, `%tail` tail ile başlayan job demek. `-STOP` process'i yakalanamaz biçimde dondurur, `jobs` çıktısında Stopped görürsün. `bg` aynı adresle job'ı arkada kaldığı yerden devam ettirir.",
    setup: sh => { vadJob(sh, VAD_TAIL); },
    solution: 'kill -STOP %tail\njobs\nbg %tail',
    check: sh => { const j = syJob(sh, VAD_TAIL); return !!j && (j.st || 'Running') === 'Running' && syHist(sh, /kill\s+-(STOP|SIGSTOP|19|TSTP)\b/) && syHist(sh, /^bg\b/); } },
  { title: 'Sinyal numarasıyla',
    story: "Arkadaki ping çıktısı dikkatini dağıtıyor. Bu sefer sinyali adıyla değil numarasıyla gönder, SIGSTOP Linux'ta 19. Durmuş job'ları ayrıca listele, sonra devam ettir.",
    task: 'ping job\'ını 19 numaralı sinyalle durdur, jobs -s ile sadece durmuş job\'ları gör, sonra bg ile sürdür.',
    hint: "`kill` sinyali adıyla ya da numarasıyla alır, `-19` Linux'ta SIGSTOP'tur, `kill -l` tüm listeyi verir. `jobs -s` sadece Stopped olanları, `-r` sadece Running olanları gösterir. Numaralar mimariye göre değişebildiği için script'lerde ad kullanmak daha güvenlidir.",
    setup: sh => { vadJob(sh, VAD_PING); },
    solution: 'kill -19 %ping\njobs -s\nbg %ping',
    check: sh => { const j = syJob(sh, VAD_PING); return !!j && (j.st || 'Running') === 'Running' && syHist(sh, /kill\s+-(19|STOP|SIGSTOP|TSTP)\b/) && syHist(sh, /^bg\b/); } },
], { hint: "`kill -STOP` bir process'i durdurur, Ctrl+Z ile aynı etkiyi yapar ve `jobs` onu Stopped gösterir. `bg` durmuş job'ı arka planda sürdürür, `fg` öne alır. %1 gibi job adresleri kill, bg ve fg'de PID yerine kullanılabilir." });

addVariants('jb4', [
  { title: "tail'i öne al",
    story: "Config işin bitti, şimdi syslog'a tam ekran odaklanmak istiyorsun. Arkadaki tail -f'i öne al.",
    task: 'tail job\'ını öne al.',
    hint: "`fg` job adresini kill ve bg ile aynı biçimde alır, `%tail` tail ile başlayan job demek. Öne alınan komut terminali tutar, gerçek sistemde Ctrl+C ile kapatır ya da Ctrl+Z ile tekrar durdurursun. Lab job'ı öne alınca bitmiş sayar.",
    setup: sh => { vadJob(sh, VAD_TAIL); },
    solution: 'fg %tail',
    check: (sh, c) => !syJob(sh, VAD_TAIL) && syRan(c, /^fg\b/) },
  { title: 'İçerikle seç',
    story: "Bakım bitti, tünel ping'ini öne alıp son sonuçlara bakacak ve kapatacaksın. Komutun başını değil içindeki IP'yi hatırlıyorsun, job'ı içerikle adresle.",
    task: 'İçinde 10.50 geçen job\'ı öne al.',
    hint: "`%?` ile başlayan job adresi komutun herhangi bir yerinde geçen metni arar, `%ping` ise sadece başına bakar. Birden çok job eşleşirse shell ambiguous job spec der, o zaman numara kullanırsın. Öne aldıktan sonra Ctrl+C ping'i durdurur ve özet istatistiği basar.",
    setup: sh => { vadJob(sh, VAD_PING); },
    solution: 'fg %?10.50',
    check: (sh, c) => !syJob(sh, VAD_PING) && syRan(c, /^fg\b/) },
], { hint: "`fg` job'ı öne alır ve terminal ona bağlanır, job bitene ya da Ctrl+C ile kesilene kadar prompt dönmez. Tek job varsa argüman gerekmez, birden çoksa %numara ile seçersin. Öne alınan job artık jobs listesinde görünmez." });

addVariants('jb5', [
  { title: 'Export gece sürsün',
    story: "CDR export script'i saatlerce sürüyor, sen VPN'den düşünce oturumun da kopuyor. Script'i nohup ile başlat ki bağlantı gitse de çalışsın, çıktısı rapor dizininde dursun.",
    task: '~/reports dizinine geç, export-cdr.sh script\'ini nohup ile arka planda çalıştır ve nohup.out dosyasını oku.',
    hint: "nohup.out bulunduğun dizine yazılır, bu yüzden önce cd ile çıktının durmasını istediğin yere geçersin. Sondaki `&` job'ı arkaya atar, `nohup` ise terminal kapanınca gelen SIGHUP'ı engeller, ikisi farklı işlerdir. Dizin yazılabilir değilse nohup çıktıyı home'daki nohup.out'a yazar.",
    setup: sh => { vadDir(sh, VAD_H + '/reports', USER); vadDel(sh, VAD_H + '/reports/nohup.out'); vadHome(sh, 'scripts/export-cdr.sh', '#!/bin/bash\necho "export tamamlandi, 4211 kayit"\n', 0o755); },
    solution: 'cd ~/reports\nnohup bash ~/scripts/export-cdr.sh &\ncat nohup.out',
    check: sh => syHas(sh, VAD_H + '/reports/nohup.out', 'export tamamlandi') },
  { title: 'Kendi log dosyan',
    story: "Tünel kontrol script'inin çıktısı nohup.out gibi genel bir dosyaya karışmasın, kendi log'una gitsin istiyorsun. stdout'u ve stderr'i bir dosyaya yönlendirirsen nohup.out'a gerek kalmaz.",
    task: 'tunnel-check.sh script\'ini nohup ile arka planda çalıştır, tüm çıktısı ~/tunnel-check.log dosyasına gitsin, sonra log\'u oku.',
    hint: "`>` stdout'u dosyaya yönlendirir, `2>&1` stderr'i de stdout'un gittiği yere gönderir, sıra önemlidir, önce dosya sonra 2>&1. stdout zaten bir dosyaya gidiyorsa gerçek nohup ayrıca nohup.out açmaz. En sondaki `&` hepsini arka plana atar.",
    setup: sh => { vadHome(sh, 'scripts/tunnel-check.sh', '#!/bin/bash\necho "ist-ams tunnel up, rtt 21 ms"\n', 0o755); vadDel(sh, VAD_H + '/tunnel-check.log'); },
    solution: 'nohup bash ~/scripts/tunnel-check.sh > ~/tunnel-check.log 2>&1 &\ncat ~/tunnel-check.log',
    check: sh => syHas(sh, VAD_H + '/tunnel-check.log', 'tunnel up') },
], { hint: "`nohup` komutun SIGHUP sinyalini yok saymasını sağlar, böylece terminal kapanınca ölmez. Çıktıyı bulunduğun dizindeki nohup.out dosyasına yazar. Arka plana atmak için yine sonuna `&` koyman gerekir, nohup bunu kendisi yapmaz." });

addVariants('jb6', [
  { title: 'Rapor yavaş aksın',
    story: "Aylık rapor üreten Python script'i /opt/report altında duruyor ve CPU'yu sömürüp canlı trafiği etkiliyor. Script'i niceness 15 ile arkada başlat, kernel önce diğer işlere CPU versin.",
    task: 'python3 /opt/report/build_report.py komutunu niceness 15 ile arka planda başlat ve ps ile NI değerini gör.',
    hint: "`nice` komutun önüne yazılır ve `-n` ile niceness verilir, `&` en sonda kalır. ps çıktısındaki NI sütunu 15 göstermeli. nice CPU'yu kısmaz, sadece yarışta öncelik sırasını değiştirir, sistem boştaysa script yine tam hızda çalışır.",
    setup: sh => { if (!sh.node('/opt/report/build_report.py')) vadFile(sh, '/opt/report/build_report.py', '#!/usr/bin/env python3\n# aylik branch raporu\nprint("rapor hazirlaniyor")\n', 0o755); },
    solution: 'nice -n 15 ' + VAD_REPORT + ' &\nps -o pid,ni,cmd -p $!',
    check: sh => { const j = syJob(sh, VAD_REPORT); return !!j && j.ni === 15; } },
  { title: 'Alarm testi',
    story: "NMS'teki CPU alarmının çalıştığını test etmek için kutuda yapay yük üreteceksin. Üretim trafiği etkilenmesin diye yük üreten süreç en düşük öncelikte çalışsın, yes çıktısı /dev/null'a aksın.",
    task: 'yes komutunu çıktısı /dev/null\'a gidecek şekilde niceness 19 ile arka planda başlat ve NI değerini ps ile gör.',
    hint: "19 en düşük önceliktir, kernel CPU'yu önce diğer process'lere verir ama boşta kalan her döngüyü yine yes alır, bu yüzden alarm tetiklenir. `> /dev/null` yes'in sonsuz çıktısını çöpe atar, yoksa terminal dolar. `$!` son arka plan PID'sidir, ps'e `-p` ile verirsin.",
    solution: 'nice -n 19 ' + VAD_YES + ' &\nps -o pid,ni,cmd -p $!',
    check: sh => { const j = syJob(sh, VAD_YES); return !!j && j.ni === 19; } },
], { hint: "`nice` bir komutu düşük öncelikle başlatır, `-n` niceness değerini verir. 19 en düşük öncelik, -20 en yüksek, negatif değerler root ister. `ps` ile `-o pid,ni,cmd` sadece istediğin sütunları gösterir, `$!` son arka plan job'ının PID'sidir." });

addVariants('jb7', [
  { title: 'Daha da geri çekil',
    story: "Rapor script'i 15'te bile müşteri portalını yavaşlatıyor. Önce yanlışlıkla 10'a çekmeyi dene ve kernel'in neden reddettiğini gör, sonra 19'a çek. PID'yi pgrep ile bul.",
    task: 'build_report process\'ini önce niceness 10 yapmayı dene, hatayı oku, sonra 19 yap.',
    hint: "`pgrep -f` komut satırının tamamında arar ve PID'yi döndürür, `$( )` bu çıktıyı renice'a argüman olarak verir. Sıradan kullanıcı niceness'ı düşüremez, 15'ten 10'a inmek önceliği artırmak demektir ve Permission denied alırsın. Artırmak serbesttir, 19'a çıkabilirsin.",
    setup: sh => { vadJob(sh, VAD_REPORT, 15); },
    solution: 'renice -n 10 -p $(pgrep -f build_report)\nrenice -n 19 -p $(pgrep -f build_report)',
    check: sh => { const j = syJob(sh, VAD_REPORT); return !!j && j.ni === 19; } },
  { title: "Başkasının process'i",
    story: "www-data altında çalışan php-fpm worker'ı 4242 PID'siyle CPU yiyor ama öldüremezsin, müşteri portalı onun üzerinde. Önceliğini 10'a çekmek istiyorsun. Process senin değil, kendi yetkinle denersen ne olacağını gör.",
    task: '4242 numaralı process\'in niceness değerini önce sudo\'suz, sonra sudo ile 10 yap.',
    hint: "`renice` sıradan kullanıcıyla sadece kendi process'lerinde çalışır, başka bir kullanıcının process'ine dokunmak root ister ve sudo'suz Permission denied alırsın. `ps -o` listesine user sütununu eklemek process'in kime ait olduğunu baştan gösterir. Öldürmek yerine önceliği düşürmek servisi kesmeden diğer işlere nefes aldırır.",
    setup: sh => { vadProc(sh, 4242, 'www-data', 'php-fpm: pool www', 61.3, 0); },
    solution: 'ps -o pid,user,ni,cmd -p 4242\nrenice -n 10 -p 4242\nsudo renice -n 10 -p 4242',
    check: sh => { const p = sh.procs.find(x => x.pid === 4242); return !!p && p.ni === 10 && syHist(sh, /^sudo\s+renice\b/); } },
], { hint: "`renice` çalışan bir process'in niceness değerini değiştirir, `-n` yeni değer, `-p` PID. Sıradan kullanıcı değeri sadece artırabilir yani önceliği düşürebilir, azaltmak root ister. PID'yi `$!`, `jobs -l` ya da pgrep ile bulursun." });

addVariants('jb8', [
  { title: 'Sadece rapor ölsün',
    story: "Rapor script'i takıldı, öldüreceksin. Kutuda python3 ile çalışan başka bir şey de var, 8000 portunda http.server. killall python3 ikisini birden götürür, sadece build_report'u hedefle.",
    task: 'pgrep ile python3 process\'lerine bak, sadece build_report process\'ini pkill -f ile öldür.',
    hint: "`pgrep -a` eşleşen PID'leri komut satırlarıyla gösterir, kimi vuracağını önceden görürsün. `pkill -f` sadece adı değil tüm komut satırını eşleştirir, script adına göre hedefleme böyle yapılır. `killall python3` aynı yorumlayıcıyla çalışan her şeyi öldürürdü.",
    setup: sh => { vadJob(sh, VAD_REPORT, 19); },
    solution: 'pgrep -a python3\npkill -f build_report\npgrep -a python3',
    check: sh => !sh.procs.some(p => p.cmd.includes('build_report')) && syHist(sh, /pkill\s+(-\S+\s+)*\S*build_report/) && !syHist(sh, /killall\s+(-\S+\s+)*python3/) },
  { title: 'Yük testini bitir',
    story: "Alarm geldi, test tamam. Arkada dönen yes'i adıyla öldür, NMS'teki CPU grafiği normale dönsün.",
    task: 'Tüm yes process\'lerini isimle öldür ve jobs ile listenin boşaldığını gör.',
    hint: "`killall` tam ad eşleşmesi ister, yes için sorun yok ama uzun isimlerde kısaltma çalışmaz. Varsayılan sinyal SIGTERM'dir, process temizlik yapıp çıkabilir. jobs çıktısında yes satırı kalmamalı.",
    setup: sh => { vadJob(sh, VAD_YES, 19); },
    solution: 'killall yes\njobs',
    check: sh => !sh.procs.some(p => /^yes\b/.test(p.cmd)) && syHist(sh, /^(killall|pkill)\s+(-\S+\s+)*yes\b/) },
], { hint: "`killall` process'leri tam adıyla, `pkill` ise adın bir parçasıyla eşleştirir. İkisi de varsayılan olarak SIGTERM gönderir, inatçı process için `-9`. Eşleşme geniş olabileceği için önce `pgrep -a` ile kimin vurulacağını görmek iyi alışkanlıktır." });

addVariants('jb9', [
  { title: "Kendi shell'in",
    story: "Uzun süredir açık duran oturumunun ne kadar bellek tuttuğunu merak ediyorsun. Ağaçta kendi bash'ini bul, PID'siyle genişletilmiş bellek haritasına bak.",
    task: 'pstree -p ile bash PID\'ini bul, sonra o process\'in pmap -x çıktısının son satırını göster.',
    hint: "`pstree -p` sshd altındaki bash düğümünde senin shell'inin PID'sini gösterir. `pmap -x` her eşleme için RSS ve Dirty sütunlarını ekler, son satır toplamı verir. Sadece toplama bakmak için çıktıyı `tail -1`'e pipe edersin.",
    solution: 'pstree -p\npmap -x 733 | tail -1',
    check: (sh, c) => syHist(sh, /^pstree/) && syRan(c, /^pmap\b.*\b733\b/) && c.out.includes('total') },
  { title: "Root'un process'i",
    story: "dockerd'nin bellek kullanımı şüpheli görünüyor, PID 777. Root'a ait bir process'in haritasını kendi yetkinle okuyamazsın, önce dene, sonra doğru yoldan bak.",
    task: '777 numaralı process\'in bellek haritasını önce sudo\'suz dene, sonra sudo ile toplam satırını göster.',
    hint: "Başka kullanıcının bellek haritası /proc altında korunur, `pmap` sudo'suz sadece komut satırını gösterir. sudo ile tam harita gelir, `tail -1` son satırdaki total'i bırakır. Pipe'ın sağındaki tail root olmadan da çalışır, sudo sadece pmap için gerekir.",
    setup: sh => { if (!sh.procs.some(p => p.pid === 777)) vadProc(sh, 777, 'root', '/usr/bin/dockerd', 0.4); },
    solution: 'pmap 777\nsudo pmap 777 | tail -1',
    check: (sh, c) => syRan(c, /^sudo\s+pmap\b.*\b777\b/) && c.out.includes('total') },
], { hint: "`pstree` process'leri parent child ağacı olarak çizer, `-p` her düğüme PID ekler. `pmap` bir process'in bellek haritasını verir, son satırdaki total toplam sanal bellektir. Çıktı uzun olduğu için `tail -1` ile sadece toplamı alırsın." });

addVariants('jb10', [
  { title: 'Lock dosyası',
    story: "Yedek script'i aynı anda iki kez çalışmasın diye /tmp/backup.lock oluşturuyor, ama script yarıda kalınca lock kalıyor ve ertesi gece yedek hiç başlamıyor. Lock her durumda kalksın.",
    task: 'nano ile ~/scripts/backup-lock.sh yaz. /tmp/backup.lock oluştursun, EXIT trap\'i lock\'u silip kilit kaldirildi yazsın. Çalıştır.',
    hint: "Lock yolunu bir değişkene koy, `trap` satırını lock'u oluşturmadan önce yaz, sonra touch ile lock'u yarat. trap komutunu çift tırnakla yazarsan değişken trap tanımlanırken açılır, tek tırnakla yazarsan çıkış anında açılır, burada ikisi de çalışır. Script bitince /tmp/backup.lock kalmamalı.",
    setup: sh => { vadDel(sh, '/tmp/backup.lock'); vadDir(sh, VAD_H + '/scripts', USER); },
    solution: 'nano ~/scripts/backup-lock.sh\nbash ~/scripts/backup-lock.sh',
    editorContent: '#!/bin/bash\nLOCK=/tmp/backup.lock\ntrap "rm -f $LOCK; echo kilit kaldirildi" EXIT\ntouch $LOCK\necho yedek basladi\n',
    check: (sh, c) => syHas(sh, VAD_H + '/scripts/backup-lock.sh', 'trap') && c.out.includes('kilit kaldirildi') && !syEx(sh, '/tmp/backup.lock') },
  { title: 'Fonksiyonla temizlik',
    story: "Deploy script'in geçici bir çalışma dizini açıyor ve temizlik birkaç adım sürüyor. Uzun komutları trap satırına sıkıştırmak yerine bir cleanup fonksiyonu yaz ve trap'e onu ver.",
    task: 'nano ile ~/scripts/deploy-tmp.sh yaz. /tmp/deploy.$$ dizinini açsın, cleanup fonksiyonu dizini silip temizlik tamam yazsın, trap EXIT cleanup\'ı çağırsın. Çalıştır.',
    hint: "Fonksiyonu `trap` satırından önce tanımla, trap'e sadece fonksiyonun adını verirsin. Dizini `rm -rf` ile silerken değişkeni tırnak içine al, değişken boş kalırsa yanlış yeri silmeyesin. `$$` her çalıştırmada farklı bir dizin adı üretir, paralel çalışmalar çakışmaz.",
    setup: sh => { vadDir(sh, VAD_H + '/scripts', USER); },
    solution: 'nano ~/scripts/deploy-tmp.sh\nbash ~/scripts/deploy-tmp.sh',
    editorContent: '#!/bin/bash\nWORKDIR=/tmp/deploy.$$\ncleanup() {\n  rm -rf "$WORKDIR"\n  echo "temizlik tamam"\n}\ntrap cleanup EXIT\nmkdir -p $WORKDIR\ntouch $WORKDIR/release.tar\necho "deploy hazirlaniyor"\n',
    check: (sh, c) => { const t = sh.node('/tmp'); return syHas(sh, VAD_H + '/scripts/deploy-tmp.sh', 'trap') && c.out.includes('temizlik tamam') && !!t && !Object.keys(t.c).some(k => k.startsWith('deploy.')); } },
], { hint: "`trap 'komut' EXIT` script hangi yoldan biterse bitsin çıkarken komutu çalıştırır, geçici dosya temizliği için klasik yöntemdir. INT eklersen Ctrl+C'de de çalışır. `$$` script'in PID'sidir, geçici dosya adlarını çakışmasız yapar. trap satırını geçici dosyayı oluşturmadan önce yaz ki arada hata olsa da temizlensin." });

/* ======================================================================
   Cheat sheet'i dogrula
   ====================================================================== */
addVariants('cs1', [
  { title: 'bashrc yenile',
    story: "Mousepad ~/.bashrc değişikliği için logout login şart diyor. Gereksiz, source ile aynı shell'e hemen yüklersin. ~/.bashrc'ye BRANCH_ID değişkeni eklendi ama açık shell'in onu henüz bilmiyor.",
    task: 'BRANCH_ID değişkenini echo ile yazdır ve boş geldiğini gör, ~/.bashrc dosyasını source et ve tekrar yazdır.',
    hint: "Mousepad logout login diyor, oysa ~/.bashrc sadece shell açılırken okunur ve `source` onu mevcut shell'de yeniden çalıştırır. Değişken, alias ve fonksiyonlar anında gelir, oturumu kapatıp açmana gerek yoktur. `bash ~/.bashrc` yazarsan değişiklik alt shell'de kalır ve sen yine boş görürsün.",
    setup: sh => { delete sh.env.BRANCH_ID; const n = sh.node(VAD_H + '/.bashrc'); if (n && n.t === 'f') { if (!n.d.includes('BRANCH_ID=')) n.d += 'export BRANCH_ID=IST-01\n'; } else vadHome(sh, '.bashrc', '# ~/.bashrc\nexport BRANCH_ID=IST-01\n'); },
    solution: 'echo $BRANCH_ID\nsource ~/.bashrc\necho $BRANCH_ID',
    check: sh => sh.env.BRANCH_ID === 'IST-01' && syHist(sh, /^(source|\.)\s+\S*bashrc/) },
  { title: 'bash ile source aynı mı',
    story: "Mousepad bash dosya ile source dosya aynı şey diyor. Değil. ~/scripts/proxy.env kurumsal proxy ayarlarını export ediyor, ikisini de deneyip farkı kendi gözünle gör.",
    task: 'proxy.env dosyasını önce bash ile çalıştırıp https_proxy değişkenine bak, sonra source edip tekrar bak.',
    hint: "Mousepad ikisini aynı sanıyor ama `bash dosya` yeni bir alt shell açar, export edilen değişkenler o alt shell kapanınca kaybolur. `source` dosyayı senin shell'inde çalıştırır, bu yüzden değişken kalır. Ortam değişkeni ayarlayan dosyalar her zaman source edilir, çalıştırılmaz.",
    setup: sh => { delete sh.env.https_proxy; delete sh.env.no_proxy; vadHome(sh, 'scripts/proxy.env', 'export https_proxy=' + VAD_PROXY + '\nexport no_proxy=localhost,10.50.0.0/16\n'); },
    solution: 'bash ~/scripts/proxy.env\necho $https_proxy\nsource ~/scripts/proxy.env\necho $https_proxy',
    check: sh => sh.env.https_proxy === VAD_PROXY && syHist(sh, /^bash\s+\S*proxy\.env/) && syHist(sh, /^(source|\.)\s+\S*proxy\.env/) },
], { hint: "`source dosya` dosyayı yeni bir shell açmadan mevcut shell içinde çalıştırır, içinde tanımlanan değişkenler ve fonksiyonlar senin shell'inde kalır. Gerçek bash'te nokta ile yazılan kısa biçim de aynı işi yapar. `bash dosya` ise alt shell açar ve değişkenler o shell'le birlikte kaybolur. Kaynak koddan derlemeyle hiçbir ilgisi yoktur." });


addVariants('cs2', [
  { title: 'arp da eskidi',
    story: "Mousepad ARP tablosu için arp -a yazıyor. arp de net-tools ailesinden, modern karşılığı ip neigh. eth1 tarafındaki bir cihaz cevap vermiyor, hangisi olduğunu iki araçla da bul.",
    task: 'arp -an ile eski çıktıyı gör, sonra aynı tabloyu ip neigh ile al ve FAILED durumundaki komşuyu bul.',
    hint: "Mousepad `arp -a` diyor, bu net-tools'tan gelir ve deprecated durumda. Doğrusu `ip neigh`, durum sütununda REACHABLE, STALE ve FAILED gibi değerler verir. arp çıktısında incomplete, ip neigh'te FAILED görünen satır ARP isteğine cevap gelmediğini söyler, genelde kablo, VLAN ya da kapalı cihaz demektir.",
    solution: 'arp -an\nip neigh',
    check: (sh, c) => syRan(c, /^ip\s+(-\S+\s+)*n(eigh\w*)?\b/) && /FAILED|INCOMPLETE/.test(c.out) && syHist(sh, /^arp\b/) },
  { title: 'Route tablosu',
    story: "Mousepad route tablosu için netstat -rn diyor. Çalışır ama net-tools'tan, modern karşılığı ip route. 10.50.0.0/16 lab sunucularına giden trafiğin hangi next hop'a gittiğini öğren.",
    task: 'netstat -rn ile eski tabloyu gör, sonra ip route ile aynı tabloyu al ve 10.50.0.0/16 satırındaki next hop\'u oku.',
    hint: "Mousepad `netstat -rn` diyor, bu eski net-tools aracıdır. Doğrusu `ip route`, prefix'leri CIDR biçiminde ve via ile next hop'u gösterir, netstat'taki Genmask sütununu kafanda çevirmen gerekmez. via kelimesinden sonraki adres next hop'tur, dev ise trafiğin çıktığı interface.",
    solution: 'netstat -rn\nip route',
    check: (sh, c) => syRan(c, /^ip\s+(-\S+\s+)*r(o|oute)?\b/) && c.out.includes('10.50.0.0/16') && syHist(sh, /^netstat\s+-\w*r/) },
], { hint: "`ifconfig` ve `netstat` net-tools paketindendir, yıllardır geliştirilmiyor ve yeni kurulumlarda gelmiyor. Karşılıkları iproute2'den gelir, adresler için `ip addr`, `-br` ile tek satırlık özet, soketler için `ss`. ss için `-t` TCP, `-u` UDP, `-l` dinleyenler, `-p` process, `-n` sayısal çıktı demek." });

addVariants('cs3', [
  { title: 'put da değil',
    story: "Mousepad put dosya ile sunucuya dosya yüklenir diyor. put da sadece sftp oturumunda yaşar. Devir notunu web01.lab'ın /tmp dizinine bırakacaksın.",
    task: 'Bash\'te put ~/handover-ist.txt yaz ve hatayı gör, sonra dosyayı web01.lab üzerindeki /tmp dizinine scp ile gönder.',
    hint: "Mousepad `put` komutunu Linux komutu gibi yazmış, oysa o sadece sftp> promptunda çalışır ve bash'te command not found verir. Bash'ten tek satırda yüklemek için `scp` kullanırsın, önce yerel dosya sonra `host:yol`. Hedefteki iki noktayı unutursan dosya yerelde kopyalanır.",
    setup: sh => { sysEnsure(sh); vadDir(sh, vadRemote('web01.lab', '/tmp'), 'root', 0o777); vadHome(sh, 'handover-ist.txt', 'ist-01 devir notu\nLTE yedek hat test edildi\nWAN1 ISP ticket 48213 acik\n'); },
    solution: 'put ~/handover-ist.txt\nscp ~/handover-ist.txt web01.lab:/tmp/',
    check: sh => syEx(sh, vadRemote('web01.lab', '/tmp/handover-ist.txt'), 'f') && syHist(sh, /^put\b/) },
  { title: 'mget de değil',
    story: "Mousepad mget ile birden çok dosya indirilir diyor, o da sftp ve ftp oturumuna ait bir komut. web01.lab'daki tüm nginx log dizinini /tmp/web01-logs altına çekeceksin.",
    task: 'Bash\'te mget yaz ve hatayı gör, sonra web01.lab üzerindeki /var/log/nginx dizinini /tmp/web01-logs olarak scp ile indir.',
    hint: "Mousepad `mget`'i bash komutu sanıyor, oysa sadece sftp ya da ftp oturumunda çalışır. Bash'ten bir dizindeki her şeyi tek seferde almak için `scp` ile `-r` kullanırsın. Hedef yol yoksa dizin o adla oluşur, varsa kaynak dizin onun içine girer.",
    setup: sh => { sysEnsure(sh); vadDel(sh, '/tmp/web01-logs'); const p = vadRemote('web01.lab', '/var/log/nginx/access.log'); if (!sh.node(p)) vadFile(sh, p, '192.168.1.10 - - [13/Oct/2026:09:00:01 +0200] "GET / HTTP/1.1" 200 612\n'); },
    solution: 'mget access.log\nscp -r web01.lab:/var/log/nginx /tmp/web01-logs\nls /tmp/web01-logs',
    check: sh => syEx(sh, '/tmp/web01-logs/access.log', 'f') && syHist(sh, /^mget\b/) },
], { hint: "get, put ve quit sftp ile ftp oturumunun içindeki komutlardır, bash bunları tanımaz ve command not found der. Bash'ten tek satırda indirmek için `scp` kullanılır, kaynak `host:yol`, hedef yerel dizin. Yüklemek için yön tersine döner." });

addVariants('cs4', [
  { title: "Loopback'e /32",
    story: "Mousepad ip address add ip diyor, dev yok. Bu sefer yönetim için loopback'e 10.255.0.1 ekleyeceksin, burada /32 bilerek doğru, router-id gibi tek bir host adresi istiyorsun. Ama dev yine şart.",
    task: 'Mousepad\'deki gibi dev olmadan dene, hatayı oku, sonra 10.255.0.1/32 adresini lo üzerine doğru biçimde ekle.',
    hint: "Mousepad'deki biçimde `dev` eksik, kernel adresi hangi interface'e bağlayacağını bilemez ve dev argument is required der. Loopback adresleri tek host'u temsil ettiği için /32 burada doğru seçimdir, fiziksel interface'te ise genelde subnet prefix'i istenir. Komut root ister.",
    setup: sh => { sysEnsure(sh); vadSetExtra(sh, vadExtra(sh).filter(e => e !== '10.255.0.1/32@lo')); },
    solution: 'sudo ip addr add 10.255.0.1/32\nsudo ip addr add 10.255.0.1/32 dev lo\nip addr show lo',
    check: sh => vadExtra(sh).includes('10.255.0.1/32@lo') && syHist(sh, /ip\s+a\S*\s+add\s+10\.255\.0\.1\S*\s*$/) },
  { title: 'ip address del de eksik',
    story: "Biri eth1'e yanlışlıkla 192.168.2.50/24 eklemiş, oysa o adres aynı segmentteki bir cihazın ve ARP tarafında duplicate görünüyor. Mousepad silmek için ip address del ip diyor, add'deki eksik burada da var.",
    task: 'Mousepad\'deki gibi dev olmadan silmeyi dene, hatayı oku, sonra adresi eth1\'den doğru biçimde kaldır.',
    hint: "Mousepad'deki silme komutunda da `dev` yok, aynı adres birden fazla interface'te olabileceği için kernel hangisinden silineceğini bilmek ister. Prefix'i eklerken kullanılanla aynı yazmak en güvenlisidir. İşlem root ister, sonra adresin gittiğini ip addr show ile doğrula.",
    setup: sh => { sysEnsure(sh); const ex = vadExtra(sh); if (!ex.includes('192.168.2.50/24@eth1')) vadSetExtra(sh, ex.concat(['192.168.2.50/24@eth1'])); },
    solution: 'ip addr show eth1\nsudo ip addr del 192.168.2.50/24\nsudo ip addr del 192.168.2.50/24 dev eth1\nip addr show eth1',
    check: sh => !vadExtra(sh).includes('192.168.2.50/24@eth1') && syHist(sh, /ip\s+a\S*\s+del\S*\s+192\.168\.2\.50\S*\s+dev\s+eth1/) },
], { hint: "`ip addr add` adresi bir interface'e ekler, `dev` zorunludur çünkü kernel adresin hangi interface'e ait olduğunu bilmeli. Prefix vermezsen /32 olur ve o subnet için route oluşmaz. Interface ayarı root ister." });

addVariants('cs5', [
  { title: '777 çözüm değil',
    story: "Mousepad yükleme dizini çalışmazsa chmod 777 yap diyor. Bu bir çözüm değil, bir itiraf. Herkes yazabilir ve çalıştırabilir, saldırgan bir script bırakıp çalıştırır. ~/lab/www/uploads için 777 dene, lab'ın notunu oku, sonra makul izne çek.",
    task: '~/lab/www/uploads dizinine önce 777 ver, notu oku, sonra 755 yap ve ls -ld ile doğrula.',
    hint: "Mousepad izin sorununa 777 öneriyor ama bu herkese yazma ve çalıştırma verir. Dizinde 755 owner'a her şeyi, diğerlerine sadece listeleme ve içine girmeyi bırakır, web server'ın yazması gerekiyorsa doğru yol owner ya da grubu ayarlamaktır. `ls -ld` dizinin kendi iznini gösterir, -d olmadan içini listeler.",
    setup: sh => { const d = vadDir(sh, VAD_H + '/lab/www/uploads', USER); if (d) d.m = 0o750; },
    solution: 'chmod 777 ~/lab/www/uploads\nchmod 755 ~/lab/www/uploads\nls -ld ~/lab/www/uploads',
    check: sh => { const n = sh.node(VAD_H + '/lab/www/uploads'); return !!n && (n.m & 0o777) === 0o755 && syHist(sh, /chmod\s+0?777\s+\S*uploads/); } },
  { title: 'Private key 644 olmaz',
    story: "Mousepad private key dosyası için chmod 644 yeterli diyor. Değil, ssh başkalarının okuyabildiği private key'i UNPROTECTED PRIVATE KEY FILE uyarısıyla reddeder. ~/.ssh/branch_rsa şu an 644.",
    task: '~/.ssh/branch_rsa dosyasının iznini ls -l ile gör, sonra sadece owner okuyup yazabilecek şekilde ayarla.',
    hint: "Mousepad 644 diyor ama bu group ve others'a okuma verir, ssh private key'in sadece sahibince okunmasını şart koşar ve dosyayı kullanmayı reddeder. 600 owner'a okuma ve yazma verir, diğerlerine hiçbir şey. .pub uzantılı public key 644 kalabilir, ~/.ssh dizini ise 700 olmalı.",
    setup: sh => { vadDir(sh, VAD_H + '/.ssh', USER, 0o700); vadHome(sh, '.ssh/branch_rsa', '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn\n-----END OPENSSH PRIVATE KEY-----\n', 0o644); },
    solution: 'ls -l ~/.ssh/branch_rsa\nchmod 600 ~/.ssh/branch_rsa\nls -l ~/.ssh/branch_rsa',
    check: sh => { const n = sh.node(VAD_H + '/.ssh/branch_rsa'); return !!n && (n.m & 0o777) === 0o600; } },
], { hint: "`chmod` sayısal modda her rakam sırayla owner, group ve others içindir, r 4, w 2, x 1 değerindedir. 766 group ve others'a yazma verip çalıştırmayı vermez, mantıklı bir kombinasyon değildir. Script ve dizin için 755, düz dosya için 644, gizli dosya için 600 kullanılır. `ls -l` ile sonucu doğrula." });

addVariants('cs6', [
  { title: '+5 saniye değil',
    story: "Mousepad shutdown +5 için beş saniye sonra yazıyor. Yanlış, + ile verilen sayı dakikadır. Kernel güncellemesi sonrası reboot'u planla, çıktıda planlanan saate bak, sonra iptal et.",
    task: 'Kutuyu 5 dakika sonra yeniden başlatmaya planla, çıktıdaki saati gör, sonra iptal et.',
    hint: "Mousepad +5'i saniye sanıyor, oysa `shutdown` zamanı + ile dakika cinsinden alır, çıktıdaki scheduled for satırı bunu açıkça gösterir. Saniye düzeyinde bir seçenek yoktur, hemen kapatmak için now kullanılır. `-r` reboot, `-c` iptal demek.",
    solution: 'sudo shutdown -r +5\nsudo shutdown -c',
    check: sh => syHist(sh, /shutdown\s+-r\s+\+5\b/) && syHist(sh, /shutdown\s+-c/) && vadNoSchedule(sh) },
  { title: 'İptal kill ile olmaz',
    story: "Mousepad planlı kapatmayı iptal etmek için shutdown process'ini kill et diyor. systemd'de planı logind tutar, öldürülecek bir shutdown process'i yoktur, iptal shutdown -c ile yapılır. Planı yap, planın tutulduğu dosyaya bak, sonra doğru yoldan iptal et.",
    task: 'Kutuyu `22:15` saatine planla, plan dosyasını sudo ile oku, sonra iptal et.',
    hint: "Mousepad kill öneriyor ama modern sistemde plan systemd-logind'de durur ve /run/systemd/shutdown/scheduled dosyasına yazılır, ps'te öldürülecek bir process bulamazsın. `shutdown -c` planı siler ve iptali herkese duyurur. Plan dosyası root'a ait olduğu için okumak sudo ister.",
    solution: 'sudo shutdown 22:15 "gece bakimi"\nsudo cat /run/systemd/shutdown/scheduled\nsudo shutdown -c',
    check: sh => syHist(sh, /shutdown\s+(-[hP]\s+)?22:15/) && syHist(sh, /shutdown\s+-c/) && vadNoSchedule(sh) },
], { hint: "Modern systemd'de `shutdown` seçeneksiz verilince poweroff yapar, saat `hh:mm` biçiminde yazılır ve geçmiş bir saatse ertesi güne planlanır. `-r` yeniden başlatır, `-c` planı iptal eder. Eski SysV sistemlerde -h ya da -r zorunluydu, mousepad o döneme göre yazılmış." });

addVariants('cs7', [
  { title: 'Donan ekran',
    story: "Bir arkadaşının terminali dondu, yazdığı hiçbir şey görünmüyor. Muhtemelen yanlışlıkla Ctrl+S'e bastı, bu terminal çıkışını durdurur. Mousepad Ctrl+Q için uygulamadan çıkar yazıyor, bu yüzden o kısayola dokunmaya korkuyor.",
    task: 'Ctrl+S ile duran terminal çıkışını sürdüren kısayolu submit et.',
    hint: "Mousepad Ctrl+Q'yu uygulamadan çıkış sanıyor, terminalde ise Ctrl+S XOFF gönderip çıkışı durdurur, Ctrl+Q XON gönderip sürdürür. Donma sırasında yazdıkların kaybolmaz, Ctrl+Q'dan sonra hepsi birden görünür. Submit Ctrl+harf biçiminde olmalı.",
    solution: 'submit Ctrl+Q',
    check: (sh, c) => sySub(c, 'ctrl+q', 'ctrl q', 'ctrl-q', '^q', 'c-q', 'control+q') },
  { title: '!$ son komut değil',
    story: "Mousepad !$ için son komutu tekrarlar yazıyor. Yanlış, son komut !!, !$ ise son komutun son argümanı. Yeni case için dizin açacak ve hemen içine gireceksin, uzun yolu ikinci kez yazmadan.",
    task: 'mkdir -p ile ~/lab/tac/case-48213 dizinini aç, sonra yolu tekrar yazmadan !$ ile içine gir.',
    hint: "Mousepad !$'ı son komut sanıyor, oysa son komutun tamamı !! ile, son argümanı !$ ile gelir. Bash satırı çalıştırmadan önce !$'ı açar ve açılmış hali ekrana yazar, neyin çalıştığını görürsün. Alt+. aynı argümanı interaktif olarak satıra yapıştırır.",
    setup: sh => { vadDir(sh, VAD_H + '/lab', USER); },
    solution: 'mkdir -p ~/lab/tac/case-48213\ncd !$\npwd',
    check: (sh, c) => sh.cwd === VAD_H + '/lab/tac/case-48213' && syHist(sh, /^mkdir\b.*case-48213/) && /!\$/.test(sh.history.join('\n') + c.line) },
], { hint: "Ctrl+R geçmişte geriye doğru arama açar, yazdıkça eşleşen son komutu getirir, tekrar Ctrl+R bir öncekine gider. Enter çalıştırır, Ctrl+G ya da Esc aramadan çıkar. Mousepad'deki Ctrl+G geçmişten çıkar açıklaması yanlış, sadece aramayı iptal eder." });

addVariants('cs8', [
  { title: 'who herkes değil',
    story: "Mousepad who sistemdeki tüm hesapları gösterir diyor. who sadece şu an login olmuş oturumları gösterir. Veritabanı ekibi postgres hesabının home dizinini soruyor, o hesap hiç login olmaz.",
    task: 'who çalıştır ve postgres\'in listede olmadığını gör, sonra getent ile postgres hesabını bulup home dizinini submit et.',
    hint: "Mousepad who'yu hesap listesi sanıyor, oysa who sadece aktif oturumları gösterir ve servis hesapları orada hiç görünmez. `getent passwd` hesap veritabanını sorgular, iki nokta ile ayrılmış satırın altıncı alanı home dizinidir. Tüm hesapları görmek için getent'e isim vermeden çalıştırırsın.",
    solution: 'who\ngetent passwd postgres\nsubmit /var/lib/postgresql',
    check: (sh, c) => { const l = syPasswd(sh, 'postgres'); const home = l ? l.split(':')[5] : '/var/lib/postgresql'; return sySub(c, home) && syHist(sh, /^who\b/); } },
  { title: 'finger grup göstermez',
    story: "Mousepad bir kullanıcının gruplarını görmek için finger yaz diyor. finger kurulu olsa bile grup üyeliğini göstermez. nginx'in worker kullanıcısı www-data hangi gruplarda, log okuyabilmesi için adm'de mi, bakman lazım.",
    task: 'finger www-data dene, sonra id ile www-data\'nın gruplarını göster.',
    hint: "Mousepad finger'ı grup bilgisi için öneriyor ama finger sadece isim, home, shell ve login bilgisini verir, üstelik çoğu kutuda kurulu bile değildir. `id` uid, primary gid ve tüm ek grupları tek satırda gösterir, `groups` sadece grup adlarını. adm çıktıda yoksa www-data adm grubuna ait log'ları okuyamaz.",
    solution: 'finger www-data\nid www-data\ngroups www-data',
    check: (sh, c) => syRan(c, /^id\s+www-data/) && syHist(sh, /^finger\b/) },
], { hint: "`finger` çoğu sunucuda kurulu değildir ve güvenlik nedeniyle kurulması da önerilmez. Kullanıcı bilgisi için `id` uid, gid ve grupları, `getent passwd isim` hesap satırını verir. getent sadece /etc/passwd'e değil LDAP gibi kaynaklara da bakar, bu yüzden dosyayı grep'lemekten daha doğrudur." });

function vadAllIps(sh) { const r = sh.execSimple(['hostname', '-I'], null, {}); return (r.out || '').trim().split(/\s+/).filter(Boolean); }

addVariants('cs9', [
  { title: 'Küçük i tuzağı',
    story: "Mousepad tüm IP'ler için hostname -i yazmış, küçük i ile. Küçük i hostname'in /etc/hosts'taki karşılığını verir, genelde 127.0.1.1. VPN ekibi kutunun WireGuard tünel adresini soruyor, tünel 10.8.0.0/24 bloğunda.",
    task: 'hostname -i ile ne döndüğünü gör, sonra hostname -I ile tüm adresleri al ve WireGuard tünel adresini submit et.',
    hint: "Mousepad küçük `-i` yazmış ama o hostname'in çözüldüğü tek adresi verir, Debian ve Ubuntu'da bu çoğu zaman 127.0.1.1'dir. Doğrusu büyük `-I`, kutudaki tüm adresleri sıralar. Tünel adresi 10.8.0 ile başlayandır, emin olmak istersen ip -br addr ile wg0 satırına bak.",
    solution: 'hostname -i\nhostname -I\nsubmit 10.8.0.2',
    check: (sh, c) => { const ip = vadAllIps(sh).find(x => x.startsWith('10.8.0.')) || '10.8.0.2'; return sySub(c, ip) && syHist(sh, /hostname\s+-i\b/); } },
  { title: '-a adres değil',
    story: "Mousepad'in başka bir satırı hostname -a ile tüm adresler gelir diyor. -a alias isimlerini verir, adres değil. Firewall ekibi kutuda kaç IPv4 adresi olduğunu soruyor.",
    task: 'hostname -a ile ne geldiğini gör, sonra hostname -I ile adresleri al ve kaç adres olduğunu submit et.',
    hint: "Mousepad `-a`'yı adres sanıyor, oysa a alias'tan gelir ve /etc/hosts'taki takma isimleri döndürür. Adresler için doğrusu büyük `-I`, boşlukla ayrılmış listeyi sayarsın, istersen çıktıyı `wc -w`'ye pipe edip saydırırsın. Seçenek harflerini tahmin etmek yerine hata mesajındaki usage listesine bakmak en güvenlisi.",
    solution: 'hostname -a\nhostname -I\nsubmit 5',
    check: (sh, c) => sySub(c, String(vadAllIps(sh).length)) && syHist(sh, /hostname\s+-a\b/) },
], { hint: "`hostname` seçenekleri büyük küçük harfe duyarlıdır. Büyük `-I` tüm IP adreslerini, küçük `-i` hostname'in çözüldüğü adresi verir, `-l` diye bir seçenek yoktur ve invalid option hatası alırsın. Hata mesajındaki usage satırları geçerli seçenekleri listeler." });

addVariants('cs10', [
  { title: 'xargs rm tehlikesi',
    story: "Mousepad eski log'ları silmek için ls *.log | xargs rm diyor. ~/lab/oldlogs içinde adında boşluk olan bir log var, xargs onu ikiye bölüp silemiyor. Daha kötüsü, bölünen parçalardan biri başka bir dosyanın adıyla eşleşirse yanlış dosya silinir.",
    task: '~/lab/oldlogs içinde mousepad\'in komutunu çalıştır ve kalan dosyayı gör, sonra find -print0 ve xargs -0 ile .log dosyalarının hepsini sil.',
    hint: "Mousepad'in komutu ls çıktısını boşluktan böldüğü için old report.log iki argümana dönüşür ve silinmez. `find` için `-print0` adları null karakterle ayırır, `xargs -0` da null'dan böler, böylece boşluk ve satır sonu içeren adlar bozulmaz. Silme işlemlerinde önce aynı boru hattını rm yerine echo ile denemek iyi alışkanlıktır.",
    setup: sh => {
      vadDir(sh, VAD_H + '/lab/oldlogs', USER);
      vadHome(sh, 'lab/oldlogs/app.log', 'Oct 01 app started\n');
      vadHome(sh, 'lab/oldlogs/old report.log', 'Sep 30 rapor\n');
      vadHome(sh, 'lab/oldlogs/keep.txt', 'bu dosya kalmali\n');
    },
    solution: 'cd ~/lab/oldlogs\nls *.log | xargs rm\nls\nfind . -name "*.log" -print0 | xargs -0 rm\nls',
    check: sh => { const d = sh.node(VAD_H + '/lab/oldlogs'); return !!d && !Object.keys(d.c).some(k => k.endsWith('.log')) && !!d.c['keep.txt'] && syHist(sh, /ls\b.*\|\s*xargs\s+rm/); } },
  { title: 'find | xargs grep',
    story: "Mousepad config'lerde arama için `find . -name \"*.conf\" | xargs grep listen` diyor. ~/lab/confs içinde adında boşluk olan bir config var ve 8443 portu tam orada, mousepad'in komutu onu kaçırıyor.",
    task: '~/lab/confs içinde mousepad\'in komutunu çalıştır, kaçan dosyayı fark et, sonra boşluklu adlara dayanıklı bir yöntemle listen satırlarını bul.',
    hint: "Mousepad'in boru hattında xargs site a.conf adını iki parçaya böler, grep No such file der ve 8443 satırı hiç görünmez. `-exec grep listen {} +` dosya adlarını find'ın kendisi argüman olarak verir, bölünme olmaz, sondaki + birçok dosyayı tek grep çağrısında toplar. Aynı güvenliği `-print0` ile `xargs -0` da sağlar.",
    setup: sh => {
      vadDir(sh, VAD_H + '/lab/confs', USER);
      vadHome(sh, 'lab/confs/site a.conf', 'server {\n    listen 8443 ssl;\n    server_name portal.corp.lab;\n}\n');
      vadHome(sh, 'lab/confs/b.conf', 'server {\n    listen 80;\n}\n');
    },
    solution: 'cd ~/lab/confs\nfind . -name "*.conf" | xargs grep listen\nfind . -name "*.conf" -exec grep listen {} +',
    check: (sh, c) => syRan(c, /-exec\s+grep|-print0\s*\|\s*xargs\s+-0\s+grep/) && c.out.includes('8443') && syHist(sh, /find\b.*\|\s*xargs\s+grep/) },
], { hint: "`ls | xargs komut` ls çıktısını boşluktan bölüp argüman yapar, adında boşluk olan dosya iki ayrı argümana dönüşür ve komut olmayan dosyalar üzerinde çalışır. `wc *` glob'u shell'e açtırır, her dosya adı tek argüman kalır. Güvenli boru hattı `find -print0` ile `xargs -0`, ayırıcı olarak null karakter kullanır." });

addVariants('cs11', [
  { title: 'Yeni dosya görünmüyor',
    story: "Mousepad locate anlık arar diyor. Aramaz, son tazelenen veritabanına bakar. WAN failover notunu az önce yazacaksın ve locate onu bulamayacak.",
    task: '~/lab/wan-failover.md dosyasını oluştur, locate ile ara ve bulamadığını gör, veritabanını tazele ve tekrar ara.',
    hint: "Mousepad locate'i canlı arama sanıyor, oysa sadece son `updatedb` anındaki dosyaları bilir. updatedb tüm dosya sistemini tarayıp veritabanını yeniden yazar ve root ister. Az önce oluşturduğun bir dosyayı hemen bulmak gerekiyorsa find kullanırsın.",
    setup: sh => { vadPkg(sh, 'mlocate', true); vadDir(sh, VAD_H + '/lab', USER); vadDel(sh, VAD_H + '/lab/wan-failover.md'); vadRoot(sh, () => SYS_CMDS.updatedb.call(sh, [])); },
    solution: 'touch ~/lab/wan-failover.md\nlocate wan-failover\nsudo updatedb\nlocate wan-failover',
    check: (sh, c) => syRan(c, /^locate\b/) && c.out.includes(VAD_H + '/lab/wan-failover.md') && syHist(sh, /updatedb/) },
  { title: 'Silinen dosya hâlâ orada',
    story: "Mousepad locate'in bulduğu her dosya diskte vardır diyor. Değil, veritabanı eskiyse çoktan silinmiş dosyaları da gösterir. Eski tünel config'i ~/lab/old-tunnel.conf dün silindi ama locate onu hâlâ listeliyor.",
    task: 'locate ile old-tunnel.conf ara, dosyanın gerçekten olmadığını ls ile gör, sonra locate\'e sadece var olan dosyaları göstermesini söyle.',
    hint: "Mousepad'in iddiası veritabanı güncelken doğrudur, eskiyse locate silinmiş dosyaları da listeler. `-e` her sonucu diskte kontrol eder ve sadece var olanları basar. Kalıcı çözüm root olarak `updatedb` çalıştırıp veritabanını tazelemektir.",
    setup: sh => { vadPkg(sh, 'mlocate', true); vadHome(sh, 'lab/old-tunnel.conf', 'peer 203.0.113.99\n'); vadRoot(sh, () => SYS_CMDS.updatedb.call(sh, [])); vadDel(sh, VAD_H + '/lab/old-tunnel.conf'); },
    solution: 'locate old-tunnel.conf\nls ~/lab/old-tunnel.conf\nlocate -e old-tunnel.conf',
    check: (sh, c) => syInstalled(sh, 'mlocate') && syEx(sh, SYS_LOCATEDB) && syRan(c, /^locate\b.*old-tunnel/) && !c.out.includes('old-tunnel.conf') && syHist(sh, /^locate\s+old-tunnel/) },
], { hint: "`locate` diski taramaz, updatedb'nin ürettiği veritabanına bakar, bu yüzden find'dan çok hızlıdır. Ubuntu'da komut mlocate paketiyle gelir, kurduktan sonra veritabanını bir kez `updatedb` ile üretmen gerekir ve bu adım root ister. Veritabanı normalde gece cron ile tazelenir, arada oluşan dosyaları göremez." });

addVariants('cs12', [
  { title: 'Boş değişken',
    story: "Mousepad'deki temizlik satırı `rm -rf $BUILD_DIR/cache`. BUILD_DIR tanımlı değilse bu satır `rm -rf /cache` olur, yanlış bir değişken adı kökten silmeye kadar gider. Güvenli biçimi dene, değişken boşken komutun hiç çalışmadan durduğunu gör.",
    task: 'BUILD_DIR\'in boş olduğunu echo ile gör, sonra korumalı biçimle cache dizinini silmeyi dene ve hatayı oku.',
    hint: "Mousepad değişkeni çıplak yazıyor, değişken boşsa yol köke kayar ve rm bunu fark etmez. `${BUILD_DIR:?}` değişken boş ya da tanımsızsa shell hata verip komutu hiç çalıştırmaz. Değişkeni çift tırnak içine almak da boşluklu değerlerin bölünmesini önler.",
    setup: sh => { delete sh.env.BUILD_DIR; },
    solution: 'echo "[$BUILD_DIR]"\nrm -rf "${BUILD_DIR:?}"/cache',
    check: (sh, c) => syRan(c, /^rm\s+-\w+\s+"?\$\{BUILD_DIR:\?/) && sh.lastCode !== 0 && syEx(sh, '/etc', 'd') },
  { title: 'Argümansız script',
    story: "Mousepad'deki bir script parçası `CACHE_DIR=$1` ardından `rm -rf $CACHE_DIR/*` yapıyor. Biri script'i argümansız çalıştırırsa satır `rm -rf /*` olur ve preserve-root bile korumaz. ~/scripts/clean-cache.sh düzeltilmiş hali, önce argümansız çalıştırıp korumayı gör, sonra doğru argümanla çalıştır.",
    task: 'clean-cache.sh script\'ini önce argümansız çalıştır ve hatayı oku, sonra ~/lab/cache argümanıyla çalıştırıp dizinin boşaldığını gör.',
    hint: "Mousepad'deki çıplak değişken argüman verilmezse boş kalır ve yol `/*` olur, glob kökteki her şeyi ayrı argüman yaptığı için preserve-root devreye girmez. `${CACHE_DIR:?mesaj}` biçimi değişken boşsa mesajı basıp script'i durdurur. Mesajda kullanıcının ne vermesi gerektiğini yazmak hatayı kendi kendine açıklar.",
    setup: sh => {
      vadHome(sh, 'scripts/clean-cache.sh', '#!/bin/bash\n# kullanim clean-cache.sh DIZIN\nCACHE_DIR=$1\nrm -rf "${CACHE_DIR:?kullanim clean-cache.sh DIZIN}"/*\necho "cache temizlendi"\n', 0o755);
      vadDir(sh, VAD_H + '/lab/cache', USER);
      vadHome(sh, 'lab/cache/tiles-001.tmp', 'x\n'); vadHome(sh, 'lab/cache/tiles-002.tmp', 'y\n');
    },
    solution: 'cat ~/scripts/clean-cache.sh\nbash ~/scripts/clean-cache.sh\nbash ~/scripts/clean-cache.sh ~/lab/cache\nls -A ~/lab/cache',
    check: sh => { const d = sh.node(VAD_H + '/lab/cache'); return !!d && d.t === 'd' && Object.keys(d.c).length === 0 && syHist(sh, /clean-cache\.sh\s*$/) && syEx(sh, '/etc', 'd'); } },
], { hint: "`rm -rf /tmp/x /` satırında boşluk yüzünden / ayrı bir argüman olur ve kök dizini hedefler. Gerçek rm buna preserve-root korumasıyla engel olur, ama `/*` gibi glob'lar ve --no-preserve-root bu korumayı aşar. Değişkenli yollarda `${DIR:?}` biçimi değişken boşsa komutu hiç çalıştırmadan durdurur." });
