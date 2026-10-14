'use strict';
/* Temel bolumlerin senaryo varyantlari. nav, files, read, pipe, perm, proc, net.
   Her gorev icin iki varyant. Ayni kavram, farkli dunya. Varyant 1 genelde TAC case calisma alani ~/tac,
   varyant 2 branch audit alani ~/audit uzerinden ilerler. Tum ust seviye isimler VBA_ ya da vba on ekini tasir. */

const VBA_H = '/home/burak';
const VBA_U = 'burak';

/* ---------- yardimcilar ---------- */
function vbaPut(sh, path, content, mode, owner) { sh.install(path, mkfile(content, mode === undefined ? 0o644 : mode, owner || 'root')); }
/* eksik dizinleri olusturur, var olanlara dokunmaz */
function vbaDir(sh, path, owner, mode) {
  let cur = '';
  for (const p of path.split('/').filter(Boolean)) {
    const parent = sh.node(cur || '/');
    cur += '/' + p;
    if (!parent.c[p]) parent.c[p] = mkdir({}, mode === undefined ? 0o755 : mode, cur.startsWith(VBA_H) ? VBA_U : (owner || 'root'));
  }
  const n = sh.node(path);
  if (owner) n.o = owner;
  if (mode !== undefined) n.m = mode;
  return n;
}
/* ev dizinindeki kullanici dosyasi, yoksa olusturur */
function vbaUserFile(sh, path, content, mode) {
  vbaDir(sh, path.slice(0, path.lastIndexOf('/')), VBA_U);
  vbaPut(sh, path, content, mode === undefined ? 0o644 : mode, VBA_U);
}
function vbaHas(sh, p, s) { const n = sh.node(p); return !!(n && n.t === 'f' && n.d.includes(s)); }
function vbaEx(sh, p, t) { const n = sh.node(p); return !!(n && (!t || n.t === t)); }
function vbaRan(c, re) { return re.test(c.line); }
function vbaHist(sh, re) { return sh.history.some(h => re.test(h)); }
function vbaSub(c, ...answers) { return c.submit != null && answers.some(a => String(c.submit).trim().replace(/^["']|["']$/g, '').toLowerCase() === String(a).toLowerCase()); }
function vbaOutLines(c) { return c.out.trim() ? c.out.trim().split('\n') : []; }
function vbaLineCount(sh, p) { const n = sh.node(p); return n && n.t === 'f' ? (n.d.match(/\n/g) || []).length : -1; }
function vbaProc(sh, p) { if (!sh.procs.some(x => x.pid === p.pid)) sh.procs.push(Object.assign({}, p)); }
const VBA_LS = /^(ls|ll|la)\b/;
const VBA_LSL = /^(ls\s+.*-\w*l|ll\b)/;

/* ---------- sabit veriler ---------- */
const VBA_KERN = [
  'Oct 10 08:00:12 linuxlab kernel: [    8.112044] igb 0000:03:00.0 eth0: igb: eth0 NIC Link is Up 1000 Mbps Full Duplex, Flow Control: RX/TX',
  'Oct 10 08:00:12 linuxlab kernel: [    8.330912] igb 0000:03:00.1 eth1: igb: eth1 NIC Link is Up 100 Mbps Half Duplex, Flow Control: None',
  'Oct 10 08:00:13 linuxlab kernel: [    8.551200] igb 0000:04:00.0 eth2: igb: eth2 NIC Link is Up 100 Mbps Full Duplex, Flow Control: RX/TX',
  'Oct 10 08:52:01 linuxlab kernel: [ 3121.004120] eth1: late collision detected, check duplex setting on link partner',
  'Oct 10 08:57:49 linuxlab kernel: [ 3488.220114] eth1: late collision detected, check duplex setting on link partner',
  'Oct 10 09:01:10 linuxlab kernel: [ 3689.551203] eth1: late collision detected, check duplex setting on link partner',
  'Oct 10 09:05:44 linuxlab kernel: [ 3963.100877] IPv4: martian source 192.168.2.255 from 192.168.2.77, on dev eth1',
].join('\n') + '\n';

const VBA_FLOW = [
  '2026-10-10T09:14:01Z flow src=192.168.2.50:49210 dst=10.50.0.10:8443 app=erp-https state=TIMEOUT',
  '2026-10-10T09:14:03Z flow src=192.168.1.10:51022 dst=10.50.0.30:443 app=portal state=ESTABLISHED',
  '2026-10-10T09:14:05Z flow src=192.168.1.42:58834 dst=203.0.113.53:53 app=dns state=timeout',
  '2026-10-10T09:14:08Z flow src=192.168.2.50:49211 dst=10.50.0.10:8443 app=erp-https state=Timeout',
  '2026-10-10T09:14:09Z flow src=192.168.1.22:50110 dst=10.50.0.20:80 app=file-transfer state=ESTABLISHED',
  '2026-10-10T09:14:11Z flow src=192.168.1.42:58834 dst=203.0.113.53:53 app=dns state=timeout',
  '2026-10-10T09:14:14Z flow src=192.168.1.42:51300 dst=10.50.0.10:8443 app=erp-https state=TIMEOUT',
  '2026-10-10T09:14:20Z flow src=192.168.1.42:44871 dst=192.168.1.1:53 app=dns state=CLOSED',
].join('\n') + '\n';

const VBA_PROXY_ERR = [
  '2026/10/10 10:02:11 [error] 1501#1501: *14 access forbidden by rule, client: 192.168.1.77, server: portal-proxy, request: "GET /admin HTTP/1.1"',
  '2026/10/10 10:02:15 [notice] 1501#1501: *15 client 192.168.1.10 closed keepalive connection',
  '2026/10/10 10:03:02 [warn] 1501#1501: *16 upstream response Denied by WAF policy ist07-strict, client: 192.168.1.77',
  '2026/10/10 10:03:40 [error] 1501#1501: *17 open() "/var/www/html/.env" failed (13: Permission DENIED), client: 203.0.113.45',
  '2026/10/10 10:04:05 [info] 1501#1501: *18 client 192.168.1.22 sent request, upstream 10.50.0.30:443',
  '2026/10/10 10:04:41 [error] 1501#1501: *19 directory index of "/var/www/html/backup/" is forbidden, access denied, client: 203.0.113.45',
  '2026/10/10 10:05:12 [error] 1501#1501: *20 auth request denied, client: 192.168.1.77, server: portal-proxy',
].join('\n') + '\n';

const VBA_NGINX_HEAD = 'user www-data;\nworker_processes auto;\npid /run/nginx.pid;\n\nevents {\n    worker_connections 768;\n}\n\nhttp {\n    sendfile on;\n    server {\n        listen 80;\n        server_name linuxlab;\n        root /var/www/html;\n        index index.html;\n    }\n';
const VBA_NGINX_V1 = VBA_NGINX_HEAD + '    server {\n        listen 8O81;\n        server_name portal-proxy.ist-br07.lab;\n        location / {\n            proxy_pass https://10.50.0.30;\n        }\n    }\n}\n';
const VBA_NGINX_V2 = VBA_NGINX_HEAD + '    server {\n        listen 8090;\n        server_name status.ist-br07.lab;\n        location /health {\n            return 200;\n        }\n    }\n';

const VBA_PROC_RESYNC = { pid: 4711, user: 'erp', cpu: 99.3, mem: 6.1, cmd: 'python3 /opt/erp-agent/tools/resync.py --loop' };
const VBA_PROC_VACUUM = { pid: 2934, user: 'postgres', cpu: 98.9, mem: 18.2, cmd: 'postgres: 16/main: autovacuum worker flowdb' };

/* ======================================================================
   nav
   ====================================================================== */
addVariants('nav1', [
  { title: 'Backup sunucusunda',
    story: "Gece backup job'ı patlamış, on-call arkadaş seni ssh ile branch backup sunucusuna bıraktı. Nerede olduğunu bilmeden tek bir rm bile yazmamalısın.",
    task: "Bulunduğun directory'nin tam path'ini yazdır.",
    hint: "`pwd` shell'in o an durduğu yerin absolute path'ini basar. Farklı yerlerde aynı isimde dizinler olabilir, prompt'a bakıp tahmin etmek yerine `pwd` ile emin olursun. Output / ile başlıyorsa absolute path'tir.",
    solution: 'pwd',
    setup: sh => { vbaDir(sh, '/srv/backup/ist-br07', 'root'); sh.cwd = '/srv/backup/ist-br07'; },
    check: (sh, c) => vbaRan(c, /^pwd\b/) && c.out.trim() === '/srv/backup/ist-br07' },
  { title: 'Script seni nereye bıraktı',
    story: "SD-WAN TAC'ın log toplama script'ini source ile çalıştırdın. source edilen script kendi içinde cd yaptığında senin shell'in de o dizinde kalır.",
    task: "Şu an hangi directory'de olduğunu yazdır.",
    hint: "`pwd` print working directory demek, flag gerektirmez. source ile çalışan script senin shell'inin içinde koştuğu için yaptığı cd seni de taşır, normal çalıştırılan script'te bu olmaz. Log'ları yanlış yere kopyalamamak için önce `pwd` ile yerini doğrula.",
    solution: 'pwd',
    setup: sh => { vbaDir(sh, '/opt/sdwan/logs', 'root'); sh.cwd = '/opt/sdwan/logs'; },
    check: (sh, c) => vbaRan(c, /^pwd\b/) && c.out.trim() === '/opt/sdwan/logs' },
], { hint: "`pwd` print working directory demek, shell'in o an durduğu directory'nin absolute path'ini basar. Prompt bazen sadece kısaltma gösterir, script yazarken ya da bir sunucuya yeni düştüğünde gerçek path'i `pwd` söyler. Flag gerekmez." });

addVariants('nav2', [
  { title: 'Arşivler nerede',
    story: "Backup sunucusundasın ve ION config arşivlerinin bu dizinde durduğu söylendi. Ne var ne yok bir bakalım.",
    task: "Bulunduğun directory'yi listele ve en yeni ion-ist-br07 arşivinin tarihini YYYY-MM-DD olarak submit et.",
    hint: "`ls` argümansız çalışınca bulunduğun directory'yi listeler. Dosya adları tarih içerdiği için alfabetik sıralama aynı zamanda kronolojik sıradır, en yenisi listenin sonundadır. Cevabı submit ile gönder.",
    solution: 'ls\nsubmit 2026-10-09',
    setup: sh => {
      vbaDir(sh, '/srv/backup/ist-br07', 'root');
      ['ion-ist-br07-2026-10-07.tar.gz', 'ion-ist-br07-2026-10-08.tar.gz', 'ion-ist-br07-2026-10-09.tar.gz'].forEach(f => vbaPut(sh, '/srv/backup/ist-br07/' + f, 'ION config archive ' + f + '\n'));
      vbaPut(sh, '/srv/backup/ist-br07/backup.log', '2026-10-10 02:00 backup failed, disk full\n');
      sh.cwd = '/srv/backup/ist-br07';
    },
    check: (sh, c) => vbaSub(c, '2026-10-09') && vbaHist(sh, VBA_LS) },
  { title: 'Log dizini',
    story: "TAC senden flow export dosyasını istiyor. Log toplama dizinindesin, dosyanın tam adını bilmiyorsun.",
    task: "Bulunduğun directory'yi listele ve .csv uzantılı dosyanın tam adını submit et.",
    hint: "`ls` argümansız bulunduğun yeri listeler, dosya uzantısı adın bir parçasıdır, Linux uzantıya göre davranmaz. Listede tek bir .csv dosyası göreceksin, adını harfi harfine submit et.",
    solution: 'ls\nsubmit flow-export-ist07.csv',
    setup: sh => {
      vbaDir(sh, '/opt/sdwan/logs', 'root');
      vbaPut(sh, '/opt/sdwan/logs/ion-events.log.1', 'rotated\n');
      vbaPut(sh, '/opt/sdwan/logs/ion-events.log.2.gz', 'gz\n');
      vbaPut(sh, '/opt/sdwan/logs/flow-export-ist07.csv', 'src,dst,app,bytes\n');
      vbaPut(sh, '/opt/sdwan/logs/README', 'ION log toplama dizini\n');
      sh.cwd = '/opt/sdwan/logs';
    },
    check: (sh, c) => vbaSub(c, 'flow-export-ist07.csv') && vbaHist(sh, VBA_LS) },
], { hint: "`ls` list demek, bulunduğun directory'deki dosya ve dizinleri sıralar. Argüman vermezsen `pwd` neyi gösteriyorsa orayı listeler, path verirsen oraya bakar. Nokta ile başlayan hidden file'lar düz `ls` ile görünmez, onu sonraki görevde göreceksin." });

addVariants('nav3', [
  { title: 'Unutulan token',
    story: "Taşeron firma /opt/app altına deploy yaparken bir token dosyası bırakmış ama düz ls bakınca sadece certs görünüyor. Dosya adı nokta ile başlıyor olmalı.",
    task: "/opt/app içini hidden file'lar dahil listele, sonra token dosyasını oku.",
    hint: "`ls -a` all demek, adı nokta ile başlayan hidden file'ları da listeler, düz `ls` bunları atlar. Listede deploy ile ilgili gizli bir dosya göreceksin. Okurken `cat` ile tam path'i ve baştaki noktayı yaz, nokta olmadan dosya bulunamaz.",
    solution: 'ls -a /opt/app\ncat /opt/app/.deploy_token',
    setup: sh => vbaPut(sh, '/opt/app/.deploy_token', 'Yuklenici notu, deploy bitince silinecekti\nDEPLOY_TOKEN=ghp_lab_7Qx2Lm9Rt4Wc\n'),
    check: (sh, c) => vbaRan(c, /\.deploy_token/) && c.out.includes('DEPLOY_TOKEN=') },
  { title: 'Eski VPN profili',
    story: "Branch'teki eski FortiClient profilinin bir yedeği Documents altında saklanmış. Security ekibi içinde hangi gateway'in yazdığını soruyor.",
    task: "~/Documents içini hidden file'lar dahil listele ve gizli VPN yedeğini oku.",
    hint: "`ls -a` hidden file'ları da gösterir, Linux'ta gizli dosya sadece adı nokta ile başlayan dosyadır. `ls -a ~/Documents` ile adı gör, sonra `cat` ile oku. Tab tuşu noktayı da tamamlar, yazım hatasını önler.",
    solution: 'ls -a ~/Documents\ncat ~/Documents/.vpn_backup.conf',
    setup: sh => vbaUserFile(sh, VBA_H + '/Documents/.vpn_backup.conf', '# eski FortiClient profili, 2024\nremote_gw=203.0.113.77\nport=10443\nuser=ist07-branch\n'),
    check: (sh, c) => vbaRan(c, /\.vpn_backup\.conf/) && c.out.includes('remote_gw=203.0.113.77') },
], { hint: "`ls -a` all demek, adı nokta ile başlayan hidden file'ları da gösterir. Linux'ta gizlilik sadece isimden gelir, dosyayı okumak için `cat` ve baştaki noktayla birlikte tam adı yeter. Noktayı unutursan No such file or directory alırsın." });

addVariants('nav4', [
  { title: 'Ticket dizini',
    story: "Yeni bir ssh oturumu açtın, home directory'desin. TAC case dosyaların home altındaki tickets dizininde duruyor.",
    task: "tickets directory'sine geç.",
    hint: "`cd` change directory demek. / ile başlamayan bir isim relative path'tir, bulunduğun yere göre çözülür, home'dayken tickets demek ~/tickets demektir. Başka bir dizindeysen aynı komut No such file or directory verir.",
    solution: 'cd tickets',
    setup: sh => { vbaDir(sh, VBA_H + '/tickets', VBA_U); sh.cwd = VBA_H; },
    check: sh => sh.cwd === VBA_H + '/tickets' },
  { title: 'Bir alt dizine in',
    story: "Şu an /var/log içindesin. nginx'in access ve error log'ları hemen bir alt dizinde.",
    task: "Relative path kullanarak nginx directory'sine geç, / ile başlayan path yazma.",
    hint: "`cd` arkasına sadece dizin adını yazarsan bulunduğun yerin altında arar, buna relative path denir. /var/log içindeyken nginx yazmak /var/log/nginx demektir. Başına / koyarsan root'tan aramaya başlar ve /nginx diye bir yer olmadığı için hata alırsın.",
    solution: 'cd nginx',
    setup: sh => { sh.cwd = '/var/log'; },
    check: (sh, c) => sh.cwd === '/var/log/nginx' && vbaRan(c, /^cd\s+(\.\/)?nginx\/?\s*$/) },
], { hint: "`cd` change directory demek. projects gibi / ile başlamayan bir isim relative path'tir, bulunduğun yere göre çözülür. Önce home'da olduğundan emin ol, başka bir dizindeysen aynı isim bulunamaz." });

addVariants('nav5', [
  { title: 'Automation repo',
    story: "Branch onboarding için yazılan Ansible playbook'ları ~/projects/sdwan-automation/playbooks altında. İçine girip neler olduğuna bakacaksın.",
    task: "playbooks directory'sine tek komutla gir ve içini listele.",
    hint: "`cd` tek seferde birden çok seviye iner, ara dizinleri / ile ayırırsın. ~ home directory'nin kısaltmasıdır, böylece nerede olursan ol aynı yere gidersin. Vardıktan sonra `ls` ile içine bak.",
    solution: 'cd ~/projects/sdwan-automation/playbooks\nls',
    setup: sh => { ['onboard_branch.yml', 'rotate_psk.yml', 'inventory.ini'].forEach(f => vbaUserFile(sh, VBA_H + '/projects/sdwan-automation/playbooks/' + f, '# ' + f + '\n')); },
    check: (sh, c) => sh.cwd === VBA_H + '/projects/sdwan-automation/playbooks' && vbaRan(c, VBA_LS) && c.out.includes('onboard_branch.yml') },
  { title: 'Branch config dizini',
    story: "ION 1200 cihazının export edilen config'leri /opt/sdwan/configs/ist-br07 altında tutuluyor. Değişiklik öncesi ne olduğunu görmek istiyorsun.",
    task: "ist-br07 config directory'sine tek komutla gir ve içini listele.",
    hint: "/ ile başlayan path absolute'tur, nerede olursan ol aynı yere götürür. `cd` ile dizinler arasında / koyarak tek adımda en alta inersin. Sonra `ls` ile dosyaları gör.",
    solution: 'cd /opt/sdwan/configs/ist-br07\nls',
    setup: sh => { ['ion-1200.json', 'interfaces.yaml', 'policies.yaml'].forEach(f => vbaPut(sh, '/opt/sdwan/configs/ist-br07/' + f, '# ' + f + '\n')); },
    check: (sh, c) => sh.cwd === '/opt/sdwan/configs/ist-br07' && vbaRan(c, VBA_LS) && c.out.includes('policies.yaml') },
], { hint: "`cd` tek seferde birden çok seviye inebilir, ara dizinleri / ile ayırırsın. ~ home directory'nin kısaltmasıdır, ~ ile başlayan path nerede olursan ol aynı yere gider. Vardıktan sonra `ls` ile içine bak." });

addVariants('nav6', [
  { title: 'sshd config sonrası',
    story: "/etc/ssh içinde sshd_config'e bakıyordun. Şimdi kendi script'lerinin durduğu home directory'ne döneceksin.",
    task: "Home directory'ne dön.",
    hint: "Argümansız `cd` ya da `cd ~` seni home directory'ne götürür, ~ aslında $HOME değişkeninin kısaltmasıdır. Uzun path'i yazmana gerek yok. `cd -` ise home'a değil bir önceki dizine döner, ikisini karıştırma.",
    solution: 'cd',
    setup: sh => { sh.cwd = '/etc/ssh'; },
    check: (sh, c) => sh.cwd === VBA_H && vbaRan(c, /^cd\b/) },
  { title: 'Dön ve doğrula',
    story: "nginx log'larının içinde kayboldun. Home directory'ne dön ve gerçekten orada olduğunu kanıtla.",
    task: "Home directory'ne dön, sonra pwd ile doğrula.",
    hint: "`cd ~` home directory'ne gider çünkü shell ~ işaretini $HOME değeriyle değiştirir. Ardından `pwd` absolute path'i basar, /home/burak görmelisin. Bu iki adımlı kontrol script'lerde yanlış dizinde rm yapmamak için iyi bir alışkanlıktır.",
    solution: 'cd ~\npwd',
    setup: sh => { sh.cwd = '/var/log/nginx'; },
    check: (sh, c) => sh.cwd === VBA_H && vbaRan(c, /^pwd\b/) && c.out.trim() === VBA_H },
], { hint: "Argümansız `cd` ya da `cd ~` seni home directory'ne götürür, çünkü ~ $HOME değişkeninin kısaltmasıdır. Nerede kaybolursan kaybol en hızlı dönüş yolu budur. `cd -` ise home'a değil bir önceki directory'ye döner, ikisini karıştırma." });

addVariants('nav7', [
  { title: 'sshd config dizini',
    story: "ssh bağlantı sorunları için ilk bakılacak yer sshd'nin config dizini. Config dosyaları /etc altında yaşar.",
    task: "/etc/ssh directory'sine absolute path ile git.",
    hint: "/ ile başlayan path absolute path'tir, root directory'den başlar ve bulunduğun yerden bağımsızdır. etc/ssh diye yazarsan relative olur ve bulunduğun dizinin altında arar. `cd` ile path'in başına / koymayı unutma.",
    solution: 'cd /etc/ssh',
    check: sh => sh.cwd === '/etc/ssh' },
  { title: 'ION event log dizini',
    story: "SD-WAN ION cihazından gelen event log'ları jump box'ta /var/log/sdwan altında toplanıyor.",
    task: "/var/log/sdwan directory'sine git.",
    hint: "Absolute path / ile başlar ve her zaman aynı yeri gösterir, `cd` ile nerede olursan ol oraya gidersin. Path'in başındaki / root directory'dir. Yazarken Tab ile tamamlarsan yazım hatası yapmazsın.",
    solution: 'cd /var/log/sdwan',
    check: sh => sh.cwd === '/var/log/sdwan' },
], { hint: "/ ile başlayan path absolute path'tir, root directory'den başlar ve nerede olduğundan bağımsız hep aynı yere gider. Başındaki /'yi unutup relative gitmeye çalışırsan bulunduğun dizinin altında arar ve No such file or directory alırsın." });

addVariants('nav8', [
  { title: "Capture'lar ne kadar büyük",
    story: "TAC paket capture'larını case'e eklemeni istiyor ama upload limiti var. Önce dosyaların boyutlarına bak.",
    task: '/var/log/captures içini long format ve okunabilir boyutlarla listele.',
    hint: "`ls -l` long listing verir, her satırda permission, owner, boyut ve tarih görünür. `-h` human readable demek, boyutu byte yerine K ve M ile yazar. İki flag'i tek tire ile birleştirip path'i arkasına yazabilirsin.",
    solution: 'ls -lh /var/log/captures',
    check: (sh, c) => vbaRan(c, VBA_LSL) && (sh.cwd === '/var/log/captures' || vbaRan(c, /\/var\/log\/captures/)) && c.out.includes('dns.pcap') },
  { title: 'Key permission kontrolü',
    story: "Audit checklist'inde private key dosyalarının sadece owner tarafından okunabilir olması gerekiyor. /opt/app/certs altındaki erp.key'e bakacaksın.",
    task: '/opt/app/certs içini long format ve okunabilir boyutlarla listele, erp.key dosyasının permission string\'ini submit et.',
    hint: "`ls -l` satırının ilk sütunu permission string'idir, ilk karakter dosya tipi, sonra üçer üçer owner, group ve others gelir. `-h` boyutları okunabilir yapar. erp.key satırındaki on karakterlik ilk sütunu olduğu gibi submit et.",
    solution: 'ls -lh /opt/app/certs\nsubmit -rw-------',
    check: (sh, c) => vbaSub(c, '-rw-------', 'rw-------') && vbaHist(sh, /^(ls\s+.*-\w*l|ll\b)/) },
], { hint: "`ls -l` long listing verir, her satırda permission, owner, group, boyut ve tarih görünür. `-h` human readable demek, boyutu byte yerine K ve M ile yazar. Tek tire ile birleştirip `-lh` yazabilirsin, path vermezsen bulunduğun dizini listeler." });

addVariants('nav9', [
  { title: 'App dizin yapısı',
    story: "Uygulama ekibi /opt/app altındaki sertifika düzenini soruyor. Tek bakışta tüm yapıyı göster.",
    task: '/opt/app ağacını göster.',
    hint: "`tree` verdiğin dizinden başlayıp alt dizinleri girintili bir ağaç olarak çizer, en altta kaç dizin ve dosya olduğunu sayar. Hidden file'ları göstermez, onlar için `-a` gerekir. Path olarak /opt/app ver.",
    solution: 'tree /opt/app',
    check: (sh, c) => vbaRan(c, /^tree\b/) && c.out.includes('certs') && c.out.includes('erp.key') },
  { title: 'Kaynak kod ağacı',
    story: "GNU hello'yu kaynaktan derleyeceksin. configure ve Makefile.in nerede, kaynak dosya hangi alt dizinde, önce yapıyı gör.",
    task: '~/src/hello-2.12 ağacını göster.',
    hint: "`tree` dizin yapısını tek komutta çizer, ls ile tek tek dizinlere girmekten hızlıdır. Alt dizindeki dosyalar girintili görünür, hello.c'nin src altında olduğunu göreceksin. ~ home directory'nin kısaltmasıdır.",
    solution: 'tree ~/src/hello-2.12',
    check: (sh, c) => vbaRan(c, /^tree\b/) && c.out.includes('hello.c') && c.out.includes('Makefile.in') },
], { hint: "`tree` bir directory'yi alt dizinleriyle birlikte ağaç şeklinde çizer. Path vermezsen bulunduğun yerden başlar, en altta kaç dizin ve dosya olduğunu da sayar. Hidden file'ları da görmek istersen `-a` ekle." });

/* ======================================================================
   files. v1 ~/tac, v2 ~/audit
   ====================================================================== */
const VBA_TAC = VBA_H + '/tac';
const VBA_CASE = VBA_TAC + '/case-48213.txt';
const VBA_AUD = VBA_H + '/audit';
const VBA_FIND = VBA_AUD + '/findings.txt';
const VBA_L1 = 'symptom erp 8443 timeout';
const VBA_L2 = 'next check iptables HUB-BLOCK';
const VBA_A1 = 'sshd port 2222 root login kapali';
const VBA_A2 = 'nginx failed listen 80q';
function vbaCase(sh, two) { vbaDir(sh, VBA_TAC, VBA_U); if (!vbaHas(sh, VBA_CASE, VBA_L1)) vbaPut(sh, VBA_CASE, VBA_L1 + '\n' + (two ? VBA_L2 + '\n' : ''), 0o644, VBA_U); else if (two && !vbaHas(sh, VBA_CASE, VBA_L2)) sh.node(VBA_CASE).d += VBA_L2 + '\n'; }
function vbaFind(sh, two) { vbaDir(sh, VBA_AUD, VBA_U); if (!vbaHas(sh, VBA_FIND, VBA_A1)) vbaPut(sh, VBA_FIND, VBA_A1 + '\n' + (two ? VBA_A2 + '\n' : ''), 0o644, VBA_U); else if (two && !vbaHas(sh, VBA_FIND, VBA_A2)) sh.node(VBA_FIND).d += VBA_A2 + '\n'; }

addVariants('f1', [
  { title: 'Case çalışma alanı',
    story: "TAC-48213 açıldı, IST-BR-07 branch'inde ERP erişimi yok. Notlarını ve capture'larını tek yerde toplamak için kendine bir çalışma dizini aç.",
    task: "Home directory'nde tac adında bir directory oluştur.",
    hint: "`mkdir` make directory demek, verdiğin isimde yeni bir dizin açar. Başına ~/ koyarsan nerede olursan ol home altında oluşur. Aynı isimde dizin varsa File exists hatası alırsın, bu bir sorun değil.",
    solution: 'mkdir ~/tac',
    check: sh => vbaEx(sh, VBA_TAC, 'd') },
  { title: 'Audit klasörü',
    story: "Branch jump box'ında güvenlik audit'i yapacaksın. Bulguları sistem dosyalarıyla karıştırmamak için ayrı bir dizin lazım.",
    task: "Home directory'nde audit adında bir directory oluştur.",
    hint: "`mkdir` yeni bir dizin oluşturur, path olarak ~/audit verirsen bulunduğun yerden bağımsız home altına açılır. Sadece dizin adını yazarsan bulunduğun dizinin içinde oluşur, o yüzden ~/ önemli.",
    solution: 'mkdir ~/audit',
    check: sh => vbaEx(sh, VBA_AUD, 'd') },
], { hint: "`mkdir` make directory demek, verdiğin isimde yeni bir dizin açar. `~/lab` yazarsan nerede olursan ol home altında oluşur. Aynı isimde dizin zaten varsa File exists hatası alırsın." });

addVariants('f2', [
  { title: 'Case notu',
    story: "Her TAC case'i için bir not dosyası tutuyorsun, adı case numarasını taşır.",
    task: 'tac içinde case-48213.txt dosyasını oluştur.',
    hint: "`touch` dosya yoksa boş bir dosya oluşturur, varsa içeriğe dokunmadan sadece timestamp'ini günceller. Path'i ~/tac ile başlatırsan nerede olduğun önemli olmaz. touch ara dizin açmaz, tac dizini önceden var olmalı.",
    solution: 'touch ~/tac/case-48213.txt',
    setup: sh => { vbaDir(sh, VBA_TAC, VBA_U); },
    check: sh => vbaEx(sh, VBA_CASE, 'f') },
  { title: 'Bulgu dosyası',
    story: "Audit bulgularını tek bir metin dosyasında toplayacaksın.",
    task: 'audit içinde findings.txt dosyasını oluştur.',
    hint: "`touch` boş dosya oluşturmanın en hızlı yoludur, dosya varsa onu silmez. Tam path ver ki dosya doğru dizine düşsün. Dizin yoksa No such file or directory alırsın, touch dizin oluşturmaz.",
    solution: 'touch ~/audit/findings.txt',
    setup: sh => { vbaDir(sh, VBA_AUD, VBA_U); },
    check: sh => vbaEx(sh, VBA_FIND, 'f') },
], { hint: "`touch` dosya yoksa boş bir dosya oluşturur, varsa sadece timestamp'ini günceller. İçeriğe dokunmadığı için var olan dosyada güvenlidir. Path'i yazarken dizinin önceden var olması gerekir, touch ara dizin açmaz." });

addVariants('f3', [
  { title: 'Semptom',
    story: "Case notunun ilk satırı her zaman semptomdur. TAC mühendisi dosyayı açınca ilk bunu görmeli.",
    task: 'case-48213.txt içine `symptom erp 8443 timeout` yaz.',
    hint: "`echo` metni output'a basar, `>` bu output'u ekran yerine dosyaya yönlendirir. `>` dosyayı önce sıfırlar, içinde ne varsa gider. Metni tırnak içine al ki boşluklu metin tek parça kalsın.",
    solution: 'echo "' + VBA_L1 + '" > ~/tac/case-48213.txt',
    setup: sh => { vbaDir(sh, VBA_TAC, VBA_U); },
    check: sh => vbaHas(sh, VBA_CASE, VBA_L1) },
  { title: 'İlk bulgu',
    story: "Audit'in ilk bulgusu sshd ayarları. Dosyaya yazıp kaydedeceksin.",
    task: 'findings.txt içine `sshd port 2222 root login kapali` yaz.',
    hint: "`echo` ile ürettiğin metni `>` ile dosyaya yönlendirirsin, ekranda bir şey görünmez. Tek `>` dosyayı baştan yazar, ilk satır için doğru olan budur. Kontrol için ardından `cat` ile bakabilirsin.",
    solution: 'echo "' + VBA_A1 + '" > ~/audit/findings.txt',
    setup: sh => { vbaDir(sh, VBA_AUD, VBA_U); },
    check: sh => vbaHas(sh, VBA_FIND, VBA_A1) },
], { hint: "`echo` metni ekrana basar, `>` ise o output'u ekrana değil dosyaya yönlendirir. `>` dosyayı önce sıfırlar, içinde ne varsa gider. Metni tırnak içine al ki boşluklar tek bir argüman olarak kalsın." });

addVariants('f4', [
  { title: 'Sıradaki adım',
    story: "Semptomun altına bir sonraki kontrol adımını ekleyeceksin. Semptom satırı silinmemeli.",
    task: 'case-48213.txt sonuna `next check iptables HUB-BLOCK` satırını ekle.',
    hint: "`>>` append demek, dosyanın sonuna ekler ve mevcut satırlara dokunmaz. Burada tek `>` kullanırsan semptom satırını silmiş olursun. echo her satırın sonuna newline koyduğu için yeni metin ayrı satıra düşer.",
    solution: 'echo "' + VBA_L2 + '" >> ~/tac/case-48213.txt',
    setup: sh => vbaCase(sh, false),
    check: sh => vbaHas(sh, VBA_CASE, VBA_L1) && vbaHas(sh, VBA_CASE, VBA_L2) },
  { title: 'İkinci bulgu',
    story: "nginx servisinin failed olduğunu da gördün. Bulgu listesine ekle, ilk bulgu kalsın.",
    task: 'findings.txt sonuna `nginx failed listen 80q` satırını ekle.',
    hint: "İki büyüktür işareti yani `>>` dosyanın sonuna yazar, tek `>` ise her şeyi silip baştan yazar. Log ve bulgu dosyalarında hep `>>` kullanılır. Sonucu `cat` ile kontrol edersen iki satır görmelisin.",
    solution: 'echo "' + VBA_A2 + '" >> ~/audit/findings.txt',
    setup: sh => vbaFind(sh, false),
    check: sh => vbaHas(sh, VBA_FIND, VBA_A1) && vbaHas(sh, VBA_FIND, VBA_A2) },
], { hint: "`>>` append demek, dosyanın sonuna ekler ve mevcut satırlara dokunmaz. Tek `>` kullanırsan ilk satırı silmiş olursun, log yazan script'lerde en sık yapılan hata budur. echo her satırın sonuna kendisi newline koyar." });

addVariants('f5', [
  { title: 'Notun yedeği',
    story: "Case notunu büyük bir düzenlemeden önce yedekleyeceksin.",
    task: 'case-48213.txt dosyasını aynı dizine case-48213.bak adıyla kopyala.',
    hint: "`cp` önce kaynağı sonra hedefi alır. Hedef var olan bir dizinse dosya aynı isimle onun içine gider, burada yeni bir dosya adı veriyorsun. Hedef dosya zaten varsa cp sormadan üzerine yazar.",
    solution: 'cp ~/tac/case-48213.txt ~/tac/case-48213.bak',
    setup: sh => vbaCase(sh, true),
    check: sh => vbaHas(sh, VBA_TAC + '/case-48213.bak', VBA_L1) },
  { title: 'Config yedeği',
    story: "sshd_config'e dokunmadan önce orijinal halini audit dizinine alacaksın. Değişiklikten önce yedek almak altın kuraldır.",
    task: '/etc/ssh/sshd_config dosyasını ~/audit içine sshd_config.orig adıyla kopyala.',
    hint: "`cp` kaynak ve hedef alır, kaynak okunabilir olduğu sürece root'a ait olsa da kopyalayabilirsin. Kopya senin user'ına ait olur. Hedefte dosya adı verdiğin için kopya sshd_config.orig adını alır.",
    solution: 'cp /etc/ssh/sshd_config ~/audit/sshd_config.orig',
    setup: sh => { vbaDir(sh, VBA_AUD, VBA_U); },
    check: sh => vbaHas(sh, VBA_AUD + '/sshd_config.orig', 'Port 2222') },
], { hint: "`cp` kaynak ve hedef alır, kaynağı hedef adıyla kopyalar. Hedef var olan bir dizinse dosya aynı isimle onun içine gider. Hedef dosya zaten varsa cp sormadan üstüne yazar, `-i` sorarak yazar." });

addVariants('f6', [
  { title: 'Versiyonla',
    story: "Yedeği versiyon numarasıyla saklamak daha okunaklı. .bak dosyasının adını değiştireceksin.",
    task: 'case-48213.bak dosyasının adını case-48213-v1.txt yap.',
    hint: "`mv` aynı dizin içinde yeni bir isim verince sadece rename eder, kopya bırakmaz. Eski isim yok olur. Hedef isimde bir dosya varsa sormadan üzerine yazar, dikkat.",
    solution: 'mv ~/tac/case-48213.bak ~/tac/case-48213-v1.txt',
    setup: sh => { vbaCase(sh, true); if (!vbaEx(sh, VBA_TAC + '/case-48213.bak')) vbaPut(sh, VBA_TAC + '/case-48213.bak', VBA_L1 + '\n' + VBA_L2 + '\n', 0o644, VBA_U); },
    check: sh => vbaEx(sh, VBA_TAC + '/case-48213-v1.txt', 'f') && !vbaEx(sh, VBA_TAC + '/case-48213.bak') },
  { title: 'Tarihli yedek',
    story: "Audit raporunda yedeklerin tarih taşıması isteniyor. .orig dosyasını audit tarihiyle yeniden adlandır.",
    task: 'sshd_config.orig dosyasının adını sshd_config.2026-10-10 yap.',
    hint: "Linux'ta ayrı bir rename komutu yok, `mv` eski ve yeni adı alır. Aynı dizinde kaldığı için dosya taşınmaz, sadece adı değişir. İşlemden sonra eski isim artık yoktur.",
    solution: 'mv ~/audit/sshd_config.orig ~/audit/sshd_config.2026-10-10',
    setup: sh => { vbaDir(sh, VBA_AUD, VBA_U); if (!vbaEx(sh, VBA_AUD + '/sshd_config.orig')) vbaPut(sh, VBA_AUD + '/sshd_config.orig', sh.node('/etc/ssh/sshd_config').d, 0o644, VBA_U); },
    check: sh => vbaEx(sh, VBA_AUD + '/sshd_config.2026-10-10', 'f') && !vbaEx(sh, VBA_AUD + '/sshd_config.orig') },
], { hint: "`mv` hem taşır hem rename eder, aynı dizin içinde farklı bir isim verirsen sadece adı değişir. Hedef dosya varsa üzerine yazar. Kopya bırakmaz, eski isim yok olur." });

addVariants('f7', [
  { title: 'Eski versiyonu sil',
    story: "v1 kopyasına artık ihtiyaç yok. Sadece onu sil, asıl case notu kalmalı.",
    task: 'case-48213-v1.txt dosyasını sil, case-48213.txt kalsın.',
    hint: "`rm` dosyayı geri dönüşsüz siler, çöp kutusu yoktur. İki dosyanın adı çok benzer, tam adı yazmadan önce `ls ~/tac` ile kontrol et. Tab ile tamamlamak yanlış dosyayı silme riskini azaltır.",
    solution: 'rm ~/tac/case-48213-v1.txt',
    setup: sh => { vbaCase(sh, true); if (!vbaEx(sh, VBA_TAC + '/case-48213-v1.txt')) vbaPut(sh, VBA_TAC + '/case-48213-v1.txt', VBA_L1 + '\n', 0o644, VBA_U); },
    check: sh => vbaEx(sh, VBA_CASE, 'f') && !vbaEx(sh, VBA_TAC + '/case-48213-v1.txt') },
  { title: 'Swap artığı',
    story: "Editör çökünce findings.txt yanında gizli bir swap dosyası kalmış, adı .findings.txt.swp. Bunu temizle, asıl dosyaya dokunma.",
    task: '~/audit/.findings.txt.swp dosyasını sil.',
    hint: "`rm` verdiğin dosyayı siler, geri alınamaz. Dosya nokta ile başladığı için düz ls'te görünmez, önce `ls -a ~/audit` ile adını gör. findings.txt ile karıştırırsan bütün bulgular gider.",
    solution: 'ls -a ~/audit\nrm ~/audit/.findings.txt.swp',
    setup: sh => { vbaFind(sh, true); vbaPut(sh, VBA_AUD + '/.findings.txt.swp', 'b0VIM 9.1 swap\n', 0o600, VBA_U); },
    check: sh => vbaEx(sh, VBA_FIND, 'f') && !vbaEx(sh, VBA_AUD + '/.findings.txt.swp') },
], { hint: "`rm` dosyayı siler, çöp kutusu yoktur ve geri alınamaz. Path'i yazmadan önce `ls` ile doğru dosya olduğundan emin ol. Dizin silmek için düz rm yetmez, onu sonra göreceksin." });

addVariants('f8', [
  { title: 'Capture dizinleri',
    story: "Capture'ları ay ve site bazında saklamak istiyorsun. Ara dizinlerin hiçbiri henüz yok.",
    task: 'Tek komutla ~/tac/captures/2026-10/ist-br07 yapısını oluştur.',
    hint: "`mkdir -p` parents demek, yoldaki eksik ara dizinlerin hepsini sırayla açar. -p olmadan captures yoksa No such file or directory alırsın. Dizin zaten varsa -p hata vermez.",
    solution: 'mkdir -p ~/tac/captures/2026-10/ist-br07',
    setup: sh => { vbaDir(sh, VBA_TAC, VBA_U); },
    check: sh => vbaEx(sh, VBA_TAC + '/captures/2026-10/ist-br07', 'd') },
  { title: 'Config ağacı',
    story: "Audit için sistem config'lerini orijinal yollarını koruyarak toplayacaksın, örneğin etc/nginx.",
    task: 'Tek komutla ~/audit/configs/etc/nginx yapısını oluştur.',
    hint: "`mkdir` normalde sadece son dizini açar ve ara dizinler yoksa hata verir. `-p` parents flag'i configs ve etc dizinlerini de otomatik açar. Script'lerde -p tercih edilir çünkü dizin varsa da sessizce geçer.",
    solution: 'mkdir -p ~/audit/configs/etc/nginx',
    setup: sh => { vbaDir(sh, VBA_AUD, VBA_U); },
    check: sh => vbaEx(sh, VBA_AUD + '/configs/etc/nginx', 'd') },
], { hint: "`mkdir -p` parents demek, yoldaki eksik ara dizinleri de sırayla oluşturur. -p olmadan ara dizin yoksa No such file or directory alırsın. Dizin zaten varsa -p hata vermez, script'lerde bu yüzden sevilir." });

addVariants('f9', [
  { title: "Capture'ları topla",
    story: "/var/log/captures altında birkaç pcap ve bir README var. TAC sadece pcap dosyalarını istiyor.",
    task: "/var/log/captures içindeki tüm .pcap dosyalarını ~/tac/captures içine kopyala.",
    hint: "`*` wildcard'ını shell genişletir, cp çalışmadan önce eşleşen her dosya adı komuta yazılır. `*.pcap` sonu .pcap olanlar demek, README.txt bu yüzden gelmez. Birden çok kaynak olduğunda son argüman bir dizin olmalı.",
    solution: 'cp /var/log/captures/*.pcap ~/tac/captures/',
    setup: sh => { vbaDir(sh, VBA_TAC + '/captures', VBA_U); },
    check: sh => ['files-mtu.pcap', 'dns.pcap', 'otlab-syn.pcap'].every(f => vbaEx(sh, VBA_TAC + '/captures/' + f, 'f')) && !vbaEx(sh, VBA_TAC + '/captures/README.txt') },
  { title: 'Sertifikaları topla',
    story: "Audit için /opt/app/certs altındaki sertifikaların kopyası lazım ama private key'ler asla kopyalanmaz.",
    task: "/opt/app/certs içindeki tüm .crt dosyalarını ~/audit/configs içine kopyala, .key dosyası gelmesin.",
    hint: "`*.crt` wildcard'ı sadece sonu .crt olan dosyalarla eşleşir, erp.key bu yüzden dışarıda kalır. Shell eşleşmeleri genişletip cp'ye verir, son argüman hedef dizindir. `*` yazsaydın key'i de kopyalamaya çalışırdın.",
    solution: 'cp /opt/app/certs/*.crt ~/audit/configs/',
    setup: sh => { vbaDir(sh, VBA_AUD + '/configs', VBA_U); },
    check: sh => ['erp.crt', 'files.crt', 'portal.crt'].every(f => vbaEx(sh, VBA_AUD + '/configs/' + f, 'f')) && !vbaEx(sh, VBA_AUD + '/configs/erp.key') },
], { hint: "`*` wildcard'ını shell genişletir, komut çalışmadan önce eşleşen tüm dosya adlarını yerine yazar. `*.txt` sonu .txt olan her dosya demek. Birden çok kaynak varsa son argüman mutlaka bir dizin olmalı, yoksa cp hata verir." });

addVariants('f10', [
  { title: 'Case kapandı',
    story: "TAC case'i çözüldü, capture'lar upload edildi. captures dizinini içindekilerle birlikte temizle, case notu kalsın.",
    task: "~/tac/captures directory'sini içindekilerle birlikte sil.",
    hint: "`rm -r` recursive demek, dizini alt dizinleri ve dosyalarıyla birlikte siler. Düz rm dizinde Is a directory der. Path'i iki kez oku, ~/tac yazarsan case notu da gider.",
    solution: 'rm -r ~/tac/captures',
    setup: sh => { vbaCase(sh, true); vbaDir(sh, VBA_TAC + '/captures/2026-10/ist-br07', VBA_U); },
    check: sh => vbaEx(sh, VBA_TAC, 'd') && vbaEx(sh, VBA_CASE, 'f') && !vbaEx(sh, VBA_TAC + '/captures') },
  { title: 'Kopyaları temizle',
    story: "Audit raporu gönderildi. Toplanan config kopyaları artık gereksiz, findings.txt ise arşivde kalacak.",
    task: "~/audit/configs directory'sini içindekilerle birlikte sil.",
    hint: "Dolu bir dizini silmek için `rm` komutuna `-r` yani recursive gerekir, içteki her şeyi aşağıdan yukarı siler. `-f` ekleyince hiç sormaz ve hata da göstermez, ona gerçekten ihtiyacın yoksa kullanma. Sadece configs'i hedefle.",
    solution: 'rm -r ~/audit/configs',
    setup: sh => { vbaFind(sh, true); vbaDir(sh, VBA_AUD + '/configs/etc/nginx', VBA_U); },
    check: sh => vbaEx(sh, VBA_AUD, 'd') && vbaEx(sh, VBA_FIND, 'f') && !vbaEx(sh, VBA_AUD + '/configs') },
], { hint: "`rm -r` recursive demek, dizini içindeki her şeyle birlikte siler. Düz rm dizinde Is a directory der. `-f` eklersen hiç sormaz, `rm -rf` yazmadan önce path'i iki kez oku." });

/* ======================================================================
   read
   ====================================================================== */
addVariants('r1', [
  { title: 'Hangi resolver',
    story: "Branch'te isimler çözülmüyor. Önce sistemin hangi DNS server'a sorduğunu öğren.",
    task: '/etc/resolv.conf dosyasını oku ve nameserver adresini submit et.',
    hint: "`cat` dosyayı olduğu gibi terminale basar, resolv.conf gibi kısa config dosyaları için idealdir. nameserver ile başlayan satır resolver'ın IP adresidir. Sadece adresi submit et.",
    solution: 'cat /etc/resolv.conf\nsubmit 192.168.1.1',
    check: (sh, c) => vbaSub(c, '192.168.1.1') },
  { title: 'Saat dilimi',
    story: "Log saatleri İstanbul'daki branch saatiyle bir saat kayık görünüyor. Jump box hangi timezone'da çalışıyor?",
    task: '/etc/timezone dosyasını oku ve içindeki değeri submit et.',
    hint: "`cat` dosyanın içeriğini basar, /etc/timezone tek satırlık bir dosyadır. Değer Bölge/Şehir formatındadır, aynen submit et. Log'ları karşılaştırırken timezone farkı en sık yanılgı sebebidir.",
    solution: 'cat /etc/timezone\nsubmit Europe/Amsterdam',
    check: (sh, c) => vbaSub(c, 'Europe/Amsterdam') },
], { hint: "`cat` dosyanın içeriğini olduğu gibi terminale basar. Küçük config dosyaları için idealdir, binlerce satırlık log'da ekran akar gider, orada `head`, `tail` ya da `less` kullan." });

addVariants('r2', [
  { title: 'ION log formatı',
    story: "ION event log'u key=value formatında. Analize başlamadan önce formatı görmek için başına bak.",
    task: '/var/log/sdwan/ion-events.log dosyasının ilk 4 satırını göster.',
    hint: "`head` dosyanın baş kısmını basar, default 10 satırdır. `-n 4` kaç satır istediğini söyler, kısa yazımı `-4`. Önce birkaç satıra bakıp alanları tanımak sonraki grep ve cut adımlarını kolaylaştırır.",
    solution: 'head -n 4 /var/log/sdwan/ion-events.log',
    check: (sh, c) => vbaRan(c, /head/) && vbaOutLines(c).length === 4 && c.out.includes('NETWORK_VPNLINK_UP') },
  { title: 'strongSwan açılışı',
    story: "IPsec tunnel kalkmıyor. strongSwan log'unun başında daemon'ın hangi config'leri yüklediği yazar.",
    task: '/var/log/strongswan.log dosyasının ilk 7 satırını göster.',
    hint: "`head -n 7` dosyanın ilk yedi satırını basar ve durur. Daemon açılış mesajları log'un başında olduğu için yüklenen secret ve configuration satırlarını burada görürsün. -n vermezsen 10 satır gelir.",
    solution: 'head -n 7 /var/log/strongswan.log',
    check: (sh, c) => vbaRan(c, /head/) && vbaOutLines(c).length === 7 && c.out.includes('Started strongSwan') },
], { hint: "`head` dosyanın baş kısmını gösterir, default 10 satır. `-n 5` kaç satır istediğini söyler, `-5` kısa yazımıyla da olur. Büyük bir log'un formatını anlamak için önce başına bakmak iyi alışkanlıktır." });

addVariants('r3', [
  { title: 'Agent ne diyor',
    story: "erp-agent servisi sync yapamıyor. En son ne olduğunu log'un sonu söyler.",
    task: '/var/log/erp-agent.log dosyasının son 2 satırını göster.',
    hint: "`tail` dosyanın sonundan okur, `-n 2` son iki satır demek. Yeni kayıtlar hep sona eklendiği için güncel hata burada görünür. Arıza canlıysa `-f` ile takip edilir.",
    solution: 'tail -n 2 /var/log/erp-agent.log',
    check: (sh, c) => vbaRan(c, /tail/) && vbaOutLines(c).length === 2 && c.out.includes('sync failed') },
  { title: 'Son ION event\'leri',
    story: "DSL hattında latency alarmı geldi ve geçti mi? Son event'lere bak.",
    task: '/var/log/sdwan/ion-events.log dosyasının son 4 satırını göster.',
    hint: "`tail -n 4` son dört satırı basar. ION event'leri kronolojik yazıldığı için alarm ve onu kapatan CLEAR event'i en sonda görünür. -n vermezsen son 10 satır gelir.",
    solution: 'tail -n 4 /var/log/sdwan/ion-events.log',
    check: (sh, c) => vbaRan(c, /tail/) && vbaOutLines(c).length === 4 && c.out.includes('LATENCY_HIGH_CLEAR') },
], { hint: "`tail` dosyanın son satırlarını gösterir, default 10. `-n 3` son üç satır demek. Yeni event'ler log'un sonuna yazıldığı için arıza anında ilk bakılan yer burasıdır, canlı izlemek için `-f` eklenir." });

const VBA_BRANCHES = ['IST-BR-07', 'ANK-BR-02', 'IZM-BR-01', 'ANT-BR-04', 'BRS-BR-06', 'ADN-BR-08', 'KON-BR-09', 'AMS-DC-01', 'RTM-BR-03', 'UTR-BR-05', 'EIN-BR-10', 'FRA-BR-11', 'MUC-BR-12', 'LON-BR-13'];
addVariants('r4', [
  { title: 'Kaç branch var',
    story: "Prisma SD-WAN envanter export'unda her satır bir branch. Lisans yenilemesi için toplam sayı lazım.",
    task: '/opt/sdwan/inventory/branches.txt kaç satır, bul ve submit et.',
    hint: "`wc` word count demek, `-l` sadece satır sayısını verir. Her satır bir branch olduğu için satır sayısı branch sayısıdır. Output'ta sayının yanında dosya adı da yazar, sadece sayıyı gönder.",
    solution: 'wc -l /opt/sdwan/inventory/branches.txt\nsubmit 14',
    setup: sh => vbaPut(sh, '/opt/sdwan/inventory/branches.txt', VBA_BRANCHES.join('\n') + '\n'),
    check: (sh, c) => vbaSub(c, vbaLineCount(sh, '/opt/sdwan/inventory/branches.txt')) },
  { title: 'Kaç request',
    story: "nginx access.log'da her satır bir HTTP request. Kapasite raporu için bu sabahki toplam request sayısını istiyorlar.",
    task: '/var/log/nginx/access.log kaç satır, bul ve submit et.',
    hint: "`wc -l` dosyadaki newline karakterlerini sayar, yani satır sayısını verir. Access log'da her request bir satır olduğu için bu request sayısıdır. Flag vermezsen satır, kelime ve byte üçünü birden basar.",
    solution: 'wc -l /var/log/nginx/access.log\nsubmit 16',
    check: (sh, c) => vbaSub(c, vbaLineCount(sh, '/var/log/nginx/access.log')) },
], { hint: "`wc` word count demek, satır, kelime ve byte sayar. `-l` sadece satır sayısını verir. /etc/passwd'de her satır bir hesap olduğu için satır sayısı hesap sayısıdır. Output'ta sayının yanında dosya adı da yazar, sadece sayıyı gönder." });

addVariants('r5', [
  { title: 'IPsec config satırı',
    story: "strongSwan log'u cloud-lab tunnel'inin proposal'ını beğenmediğini söylüyor. Config'te o satırı bulup numarasını TAC'a yazacaksın.",
    task: '/etc/ipsec.conf dosyasını satır numaralarıyla oku, cloud-lab bloğundaki ike= satırının numarasını submit et.',
    hint: "`cat -n` her satırın başına numara koyar, boş satırlar da sayılır. Dosyada iki tane ike= satırı var, conn cloud-lab başlığının altındakini seç. Numarayı submit et.",
    solution: 'cat -n /etc/ipsec.conf\nsubmit 28',
    check: (sh, c) => vbaSub(c, 28) },
  { title: 'Netplan satırı',
    story: "DSL backup interface'inin MTU'su 1492 olarak ayarlanmış. Change request'e satır numarasını yazman gerekiyor.",
    task: '/etc/netplan/01-config.yaml dosyasını satır numaralarıyla oku, mtu satırının numarasını submit et.',
    hint: "`cat -n` satırları numaralandırarak basar, YAML'da girinti önemli olduğu için dosyayı bozmadan okumanın güvenli yoludur. mtu kelimesinin geçtiği satırın başındaki sayıyı gönder.",
    solution: 'cat -n /etc/netplan/01-config.yaml\nsubmit 18',
    check: (sh, c) => vbaSub(c, 18) },
], { hint: "`cat -n` her satırın başına numara koyar. nginx -t ya da journalctl hata verirken genelde dosya adı ve satır numarası söyler, numaralı okursan doğrudan o satıra gidersin. Boş satırlar da sayılır." });

addVariants('r6', [
  { title: 'Case güncellemesi',
    story: "Müşteriye bir sonraki güncelleme saatini söz verdin, bunu case notuna da yazmalısın.",
    task: 'nano ile ~/tac/case-48213.txt dosyasını aç, sona `next update 14.00 burak` satırını ekle ve kaydet.',
    hint: "`nano` terminal içinde çalışan basit bir editördür, dosyayı açınca imleç başta olur, en alta inip yeni satırı yazarsın. Gerçek nano'da Ctrl+O kaydeder ve Ctrl+X çıkar, lab'da Kaydet butonu var. Kaydetmeden çıkarsan değişiklik gider.",
    solution: 'nano ~/tac/case-48213.txt',
    setup: sh => vbaCase(sh, true),
    editorContent: old => old + 'next update 14.00 burak\n',
    check: sh => vbaHas(sh, VBA_CASE, 'next update 14.00 burak') && vbaHas(sh, VBA_CASE, VBA_L1) },
  { title: 'RCA notu',
    story: "Q3 raporuna incident'ın root cause'unu eklemen istendi.",
    task: 'nano ile ~/Documents/rapor.txt dosyasını aç, sona `RCA TAC-48213 iptables HUB-BLOCK` satırını ekle ve kaydet.',
    hint: "`nano` dosyayı açar, ok tuşlarıyla en sona gelip yeni satırı yazarsın. Kaydetmek gerçek nano'da Ctrl+O sonra Enter, lab'da Kaydet butonu. Var olan satırları silmemeye dikkat et, sadece ekle.",
    solution: 'nano ~/Documents/rapor.txt',
    setup: sh => { if (!vbaEx(sh, VBA_H + '/Documents/rapor.txt')) vbaUserFile(sh, VBA_H + '/Documents/rapor.txt', 'Q3 raporu\nUptime: 99.95%\nIncident: 2\n'); },
    editorContent: old => old + 'RCA TAC-48213 iptables HUB-BLOCK\n',
    check: sh => vbaHas(sh, VBA_H + '/Documents/rapor.txt', 'RCA TAC-48213 iptables HUB-BLOCK') && vbaHas(sh, VBA_H + '/Documents/rapor.txt', 'Q3 raporu') },
], { hint: "`nano` terminalde çalışan basit bir editördür, dosyayı açarsın ve yazdığın gibi düzenlersin. Gerçek nano'da Ctrl+O kaydeder, Ctrl+X çıkar, lab'da Kaydet butonu var. Dosya yoksa nano onu kaydettiğinde oluşturur." });

/* ======================================================================
   pipe
   ====================================================================== */
addVariants('p1', [
  { title: 'Timeout avı',
    story: "erp-agent DNS çözemediğini söylüyor. Log'da timeout olan satırları ayıkla.",
    task: '/var/log/erp-agent.log içinde timed out geçen satırları bul.',
    hint: "`grep` bir pattern ve bir dosya alır, pattern'in geçtiği satırları olduğu gibi basar. Pattern'de boşluk var, tırnak içine almazsan shell onu iki ayrı argüman sanar ve out kelimesini dosya adı olarak arar. grep default case sensitive çalışır.",
    solution: 'grep "timed out" /var/log/erp-agent.log',
    check: (sh, c) => vbaRan(c, /grep/) && c.out.includes('attempt 3/3') && !c.out.includes('INFO') },
  { title: 'Collision',
    story: "OT VLAN'daki HMI aralıklı kopuyor. Kernel log'unda eth1 için duplex sorunu var mı bak.",
    task: '/var/log/kern.log içinde collision geçen satırları bul.',
    hint: "`grep` dosyayı satır satır tarar ve pattern'i içeren satırları basar, geri kalanı atar. Pattern kelimenin bir parçası da olabilir, collision yazınca late collision satırları gelir. Half duplex bir link'te late collision klasik duplex mismatch belirtisidir.",
    solution: 'grep collision /var/log/kern.log',
    setup: sh => vbaPut(sh, '/var/log/kern.log', VBA_KERN, 0o644),
    check: (sh, c) => vbaRan(c, /grep/) && c.out.includes('late collision') && !c.out.includes('Link is Up') },
], { hint: "`grep` bir pattern ve dosya alır, pattern'in geçtiği satırları olduğu gibi basar. Default olarak case sensitive çalışır, Failed ile failed farklıdır. Pattern'de boşluk varsa tırnak içine al, yoksa shell onu iki ayrı argüman sanar." });

addVariants('p2', [
  { title: 'Flow timeout sayısı',
    story: "Flow log'unu yazan üç farklı modül timeout kelimesini üç farklı şekilde yazıyor, TIMEOUT, Timeout ve timeout.",
    task: '/var/log/sdwan/flow-ist07.log içinde case insensitive timeout geçen satır sayısını bul ve submit et.',
    hint: "`grep -i` ignore case demek, büyük küçük harf farkını yok sayar. `-c` count demek, satırları basmak yerine eşleşen satır sayısını yazar. İkisini `-ic` diye birleştirebilirsin, -i olmadan sadece küçük harfli satırları sayarsın.",
    solution: 'grep -ic timeout /var/log/sdwan/flow-ist07.log\nsubmit 5',
    setup: sh => vbaPut(sh, '/var/log/sdwan/flow-ist07.log', VBA_FLOW),
    check: (sh, c) => vbaSub(c, 5) },
  { title: 'Denied sayısı',
    story: "portal-proxy'nin error log'unda reddedilen istekler denied, Denied ve DENIED olarak geçiyor. Security ekibi kaç satır olduğunu soruyor.",
    task: '/var/log/nginx/portal-proxy.error.log içinde case insensitive denied geçen satır sayısını bul ve submit et.',
    hint: "`-i` ile grep harf büyüklüğüne bakmaz, `-c` ile eşleşen satırları listelemek yerine sayar. -c satır sayar, bir satırda kelime iki kez geçse de bir sayılır. forbidden gibi başka kelimeler sayıma girmez.",
    solution: 'grep -ic denied /var/log/nginx/portal-proxy.error.log\nsubmit 4',
    setup: sh => vbaPut(sh, '/var/log/nginx/portal-proxy.error.log', VBA_PROXY_ERR),
    check: (sh, c) => vbaSub(c, 4) },
], { hint: "`grep -i` ignore case demek, error, Error ve ERROR hepsini yakalar. `-c` count demek, satırları basmak yerine kaç satırın eşleştiğini yazar. İkisini `-ic` diye birleştirebilirsin. -c satır sayar, bir satırda iki kez geçse de bir sayılır." });

addVariants('p3', [
  { title: 'Kaç path switch',
    story: "Müşteri ERP'nin gün içinde kaç kez path değiştirdiğini soruyor. ION log'unda her switch bir NETWORK_PATH_SWITCH satırı.",
    task: 'ion-events.log içindeki PATH_SWITCH satırlarını pipe kullanarak say.',
    hint: "Pipe yani `|` soldaki komutun output'unu sağdakinin input'u yapar. `grep` PATH_SWITCH geçen satırları süzer, `wc -l` gelen satırları sayar. wc'ye dosya adı vermiyorsun, input'u pipe'tan okuyor.",
    solution: 'grep PATH_SWITCH /var/log/sdwan/ion-events.log | wc -l',
    check: (sh, c) => vbaRan(c, /\|/) && c.out.trim() === '4' },
  { title: 'Kaç madde',
    story: "TAC-48213 ticket'ında semptom ve notlar tire ile başlayan maddeler halinde yazılmış. Toplam kaç madde var?",
    task: '~/tickets/TAC-48213.txt içinde tire ile başlayan satırları pipe kullanarak say.',
    hint: "`grep '^-'` satır başında tire olanları seçer, ^ satırın başı demek, onsuz satırın ortasındaki tireler de eşleşir. Tırnak, shell'in ^ ve - karakterlerine karışmasını önler. `|` bu satırları `wc -l`'e verir, o da satır sayısını basar.",
    solution: "grep '^-' ~/tickets/TAC-48213.txt | wc -l",
    check: (sh, c) => vbaRan(c, /\|/) && c.out.trim() === '7' },
], { hint: "Pipe yani `|` soldaki komutun output'unu sağdakinin input'u yapar, arada dosya yazmaya gerek kalmaz. `grep` eşleşen satırları süzer, `wc -l` gelen satırları sayar. wc'ye dosya adı vermiyorsun çünkü input'u pipe'tan okuyor." });

addVariants('p4', [
  { title: 'Group adları',
    story: "/etc/group satırları da iki nokta ile ayrılır, ilk alan group adıdır. Audit için sadece group adlarını listele.",
    task: '/etc/group içinden sadece group adlarını listele.',
    hint: "`cut` satırı alanlara böler. `-d:` ayırıcının iki nokta olduğunu söyler, `-f1` ilk alanı yani group adını seçer. -d vermezsen cut Tab arar, bulamayınca satırın tamamını basar.",
    solution: 'cut -d: -f1 /etc/group',
    check: (sh, c) => c.out.includes('docker') && c.out.includes('developers') && c.out.includes('sudo') && !c.out.includes(':') },
  { title: 'Home dizinleri',
    story: "Disk dolmak üzere ve hangi hesabın home dizini nerede, görmek istiyorsun. /etc/passwd'de altıncı alan home directory.",
    task: "/etc/passwd içinden sadece home directory'leri listele.",
    hint: "`cut -d:` alanları iki noktadan böler, `-f6` altıncı alanı alır. Alanlar soldan bire başlayarak sayılır, sıra name, password, uid, gid, gecos, home, shell. Yanlış numara verirsen shell ya da gecos alanını görürsün.",
    solution: 'cut -d: -f6 /etc/passwd',
    check: (sh, c) => c.out.includes('/home/burak') && c.out.includes('/var/www') && !c.out.includes(':') && !c.out.includes('nologin') },
], { hint: "`cut` satırı alanlara böler. `-d` alan ayırıcıyı söyler, /etc/passwd alanları iki nokta ile ayrıldığı için `-d:` lazım. `-f1` ilk alanı yani kullanıcı adını seçer. -d vermezsen cut Tab arar ve satırın tamamını basar." });

const VBA_VPNLINKS = 'IST-BR-07:INET-1:up\nIST-BR-07:DSL-2:up\nANK-BR-02:MPLS-1:up\nANK-BR-02:INET-1:down\nIZM-BR-01:LTE-1:up\nIZM-BR-01:INET-1:up\nAMS-DC-01:MPLS-1:up\nAMS-DC-01:INET-1:up\nANT-BR-04:DSL-2:degraded\n';
addVariants('p5', [
  { title: 'Circuit tipleri',
    story: "~/data/vpnlinks.txt her satırda site, circuit ve durum tutuyor, alanlar iki nokta ile ayrılmış. Hangi circuit tiplerini kullandığımızı tekil liste olarak istiyorlar.",
    task: 'vpnlinks.txt içindeki unique circuit listesini çıkar.',
    hint: "`cut -d: -f2` her satırdan ikinci alanı yani circuit adını alır. `sort` aynı değerleri alt alta getirir, `uniq` ise sadece ardışık tekrarları teke indirir. sort'u atlarsan araya başka değer girmiş tekrarlar ayrı ayrı kalır.",
    solution: 'cut -d: -f2 ~/data/vpnlinks.txt | sort | uniq',
    setup: sh => vbaUserFile(sh, VBA_H + '/data/vpnlinks.txt', VBA_VPNLINKS),
    check: (sh, c) => c.out.trim() === 'DSL-2\nINET-1\nLTE-1\nMPLS-1' },
  { title: 'Status code listesi',
    story: "access.log'da hangi HTTP status code'ların döndüğünü tekil liste halinde görmek istiyorsun. Alanlar boşlukla ayrılmış, dokuzuncu alan status code.",
    task: 'access.log içindeki unique status code listesini çıkar.',
    hint: "`cut -d' '` ayırıcıyı boşluk yapar, boşluğu tırnak içine almazsan shell onu yutar. `-f9` dokuzuncu alanı yani status code'u keser. Ardından `sort` aynı kodları yan yana getirir, `uniq` tekrarları teke indirir.",
    solution: "cut -d' ' -f9 /var/log/nginx/access.log | sort | uniq",
    check: (sh, c) => c.out.trim() === '200\n301\n304\n401\n404\n500' },
], { hint: "`cut -d: -f7` her satırdan yedinci alanı yani login shell'i alır. `sort` aynı değerleri alt alta getirir, `uniq` ise sadece ardışık tekrarları teke indirir. sort'u atlarsan uniq araya başka değer girmiş tekrarları göremez ve liste kirli çıkar." });

const VBA_TALKERS = ['192.168.2.50', '192.168.1.10', '192.168.1.22', '192.168.2.50', '192.168.2.51', '192.168.1.22', '192.168.2.50', '192.168.1.10', '192.168.2.50', '192.168.1.22', '192.168.2.51', '192.168.1.10', '192.168.2.50', '192.168.1.22'].join('\n') + '\n';
addVariants('p6', [
  { title: 'Top talker',
    story: "WAN hattı doluyor. NetFlow export'undan her flow'un source IP'si ~/data/talkers.txt dosyasına satır satır yazıldı.",
    task: 'talkers.txt içinde en çok geçen IP adresini bul ve submit et.',
    hint: "`sort` aynı IP'leri alt alta getirir, `uniq -c` her grubun başına kaç kez geçtiğini yazar. Sonra `sort -rn` bu sayılara göre sıralar, `-n` numeric karşılaştırma, `-r` reverse yani en büyük en üstte. İlk sort'u unutursan uniq dağınık tekrarları ayrı ayrı sayar.",
    solution: 'sort ~/data/talkers.txt | uniq -c | sort -rn\nsubmit 192.168.2.50',
    setup: sh => vbaUserFile(sh, VBA_H + '/data/talkers.txt', VBA_TALKERS),
    check: (sh, c) => vbaSub(c, '192.168.2.50') },
  { title: 'En sık event',
    story: "ION event log'unda en sık görülen event code hangisi? Alanlar boşlukla ayrılmış, beşinci alan code=... şeklinde.",
    task: 'ion-events.log içinde en çok geçen event code\'u bul ve submit et.',
    hint: "`cut -d' ' -f5` her satırdan beşinci alanı yani code alanını keser. `sort` ve `uniq -c` aynı kodları gruplayıp sayar, `sort -rn` sayıya göre büyükten küçüğe dizer. En üstteki satırın kodunu submit et, code= kısmını yazmasan da olur.",
    solution: "cut -d' ' -f5 /var/log/sdwan/ion-events.log | sort | uniq -c | sort -rn\nsubmit NETWORK_PATH_SWITCH",
    check: (sh, c) => vbaSub(c, 'NETWORK_PATH_SWITCH', 'code=NETWORK_PATH_SWITCH') },
], { hint: "`sort` aynı satırları yan yana getirir, `uniq -c` her grubun başına kaç kez tekrarlandığını yazar. Sondaki `sort -rn` bu sayılara göre sıralar, `-n` numeric yani 10'u 9'dan büyük sayar, `-r` reverse yani en büyük en üstte. İlk sort'u unutursan uniq ardışık olmayan tekrarları ayrı sayar." });

const VBA_LATENCY = 'ist-br07-inet 44\nist-br07-dsl 148\nank-br02-mpls 21\nank-br02-inet 63\nizm-br01-lte 97\nams-dc-inet 9\nant-br04-dsl 131\n';
const VBA_UPTIME = 'IST-BR-07,TR,99.12\nANK-BR-02,TR,97.80\nIZM-BR-01,TR,99.95\nAMS-DC-01,NL,99.99\nANT-BR-04,TR,96.40\nRTM-BR-03,NL,98.75\nUTR-BR-05,NL,99.50\n';
addVariants('p7', [
  { title: 'En yavaş tunnel\'lar',
    story: "~/data/latency.txt her satırda tunnel adı ve ms cinsinden latency tutuyor. SLA ihlali olabilecek ilk üçü lazım.",
    task: "Latency'ye göre büyükten küçüğe sırala ve ilk 3'ü göster.",
    hint: "`sort -k2` ikinci alana göre sıralar, alanlar default boşlukla ayrılır. `-n` numeric karşılaştırır, yoksa 148 alfabetik olarak 21'den önce gelir ve sıra bozulur. `-r` büyükten küçüğe çevirir, `head -3` ilk üç satırı bırakır.",
    solution: 'sort -k2 -nr ~/data/latency.txt | head -3',
    setup: sh => vbaUserFile(sh, VBA_H + '/data/latency.txt', VBA_LATENCY),
    check: (sh, c) => vbaOutLines(c).length === 3 && c.out.trim().startsWith('ist-br07-dsl 148') && c.out.includes('izm-br01-lte 97') },
  { title: 'En düşük uptime',
    story: "~/data/uptime.csv virgülle ayrılmış, üçüncü alan aylık uptime yüzdesi. Review toplantısı için en kötü üç site'ı göster.",
    task: "Uptime'a göre küçükten büyüğe sırala ve ilk 3'ü göster.",
    hint: "`sort -t,` alan ayırıcıyı virgül yapar, `-k3` üçüncü alana göre sıralar. `-n` ondalıklı sayıları numeric karşılaştırır, burada küçükten büyüğe istediğin için `-r` yok. `head -3` ilk üç satırı yani en kötü üç site'ı bırakır.",
    solution: 'sort -t, -k3 -n ~/data/uptime.csv | head -3',
    setup: sh => vbaUserFile(sh, VBA_H + '/data/uptime.csv', VBA_UPTIME),
    check: (sh, c) => vbaOutLines(c).length === 3 && c.out.trim().startsWith('ANT-BR-04,TR,96.40') && c.out.includes('RTM-BR-03') },
], { hint: "`sort -k2` ikinci alana göre sıralar, alanlar default boşlukla ayrılır. `-n` numeric karşılaştırma yapar, yoksa 100 alfabetik olarak 99'dan önce gelir. `-r` büyükten küçüğe çevirir, `head -3` ise sadece ilk üç satırı bırakır." });

addVariants('p8', [
  { title: 'Site adı formatı',
    story: "Prisma SD-WAN portalında site adları büyük harfle tutuluyor. Elindeki listede ise küçük harf.",
    task: 'echo ile ist-br-07 yazdır, tr ile hepsini büyük harfe çevir.',
    hint: "`tr` stdin'den okur, dosya adı almaz, o yüzden echo ile pipe'larsın. İlk küme `a-z` küçük harfler, ikinci küme `A-Z` büyük harfler, aynı sıradaki karakterler birbirine eşlenir. Tire ve rakamlar kümelerde olmadığı için olduğu gibi kalır.",
    solution: 'echo ist-br-07 | tr a-z A-Z',
    check: (sh, c) => c.out.includes('IST-BR-07') && vbaRan(c, /tr\s/) },
  { title: 'MAC formatı',
    story: "Windows DHCP sunucusuna reservation gireceksin, MAC adresini iki nokta yerine tire ile istiyor. Adres `52:54:00:12:34:56`.",
    task: 'echo ile MAC adresini yazdır, tr ile iki noktaları tireye çevir.',
    hint: "`tr` birinci kümedeki her karakteri ikinci kümedeki karşılığıyla değiştirir, burada tek karakterlik iki küme yeter, iki nokta ve tire. Girdiyi pipe ile alır, dosya vermezsin. Silmek isteseydin `-d` kullanırdın.",
    solution: 'echo 52:54:00:12:34:56 | tr : -',
    check: (sh, c) => c.out.includes('52-54-00-12-34-56') && vbaRan(c, /tr\s/) },
], { hint: "`tr` stdin'den gelen karakterleri birinci kümeden ikinci kümeye çevirir, dosya adı almaz, o yüzden echo ile pipe'larsın. `a-z` küçük harf aralığı, `A-Z` büyük harf aralığı demek, aynı sıradaki karakterler eşlenir. Karakter silmek istersen `-d` kullanılır." });

addVariants('p9', [
  { title: 'IKE hatalarını kaydet',
    story: "TAC, cloud-lab tunnel'inin proposal hatalarını ayrı bir dosya olarak case'e eklemeni istiyor.",
    task: 'strongswan.log içindeki NO_PROPOSAL geçen satırları ~/tac/ike-fail.txt dosyasına yaz.',
    hint: "`grep` eşleşen satırları seçer, `>` ise ekrana gidecek output'u dosyaya yazar. Redirect yaptığında ekranda hiçbir şey görmezsin, bu normaldir, sonucu `cat` ile kontrol et. Hedef dizin yoksa shell dosyayı açamaz.",
    solution: 'grep NO_PROPOSAL /var/log/strongswan.log > ~/tac/ike-fail.txt',
    setup: sh => { vbaDir(sh, VBA_TAC, VBA_U); },
    check: sh => vbaHas(sh, VBA_TAC + '/ike-fail.txt', '08[IKE] received NO_PROPOSAL_CHOSEN') && vbaHas(sh, VBA_TAC + '/ike-fail.txt', '12[IKE]') },
  { title: 'Kritik event raporu',
    story: "Müdür sadece kritik ION event'lerini görmek istiyor. Raporu dosya olarak hazırlayacaksın.",
    task: 'ion-events.log içindeki CRITICAL satırlarını ~/audit/critical.txt dosyasına yaz.',
    hint: "`grep CRITICAL` sadece sev=CRITICAL içeren satırları bırakır, büyük harfle yazmalısın çünkü grep case sensitive. `>` output'u dosyaya yönlendirir ve dosya varsa ezer. Ekleme yapmak isteseydin `>>` kullanırdın.",
    solution: 'grep CRITICAL /var/log/sdwan/ion-events.log > ~/audit/critical.txt',
    setup: sh => { vbaDir(sh, VBA_AUD, VBA_U); },
    check: sh => vbaHas(sh, VBA_AUD + '/critical.txt', 'NETWORK_VPNBFD_DOWN') && vbaHas(sh, VBA_AUD + '/critical.txt', 'NETWORK_VPNLINK_DOWN') && !vbaHas(sh, VBA_AUD + '/critical.txt', 'PATH_SWITCH') },
], { hint: "`grep -i` büyük küçük harf ayırmadan arar, `>` ise ekrana gidecek output'u dosyaya yazar. Redirect yaptığında ekranda hiçbir şey görmezsin, bu normaldir, sonucu `cat` ile kontrol et. Hedef dizin yoksa shell dosyayı açamaz ve hata verir." });

const VBA_BRCSV = 'site,country,wan,status\nIST-BR-07,TR,INET+DSL,up\nAMS-DC-01,NL,INET+MPLS,up\nANK-BR-02,TR,MPLS+INET,degraded\nRTM-BR-03,NL,INET+LTE,up\nIZM-BR-01,TR,INET+LTE,up\nUTR-BR-05,NL,DSL,up\nANT-BR-04,TR,DSL,down\n';
const VBA_CIRCSV = 'circuit_id,site,type,provider\nC-1001,IST-BR-07,INET,Turkcell\nC-1002,IST-BR-07,DSL,TurkTelekom\nC-2001,ANK-BR-02,MPLS,TurkTelekom\nC-2002,ANK-BR-02,LTE,Vodafone\nC-3001,IZM-BR-01,LTE,Turkcell\nC-3002,IZM-BR-01,INET,Superonline\nC-4001,RTM-BR-03,LTE,KPN\n';
addVariants('p10', [
  { title: 'Türkiye branch\'leri',
    story: "~/data/branches.csv virgülle ayrılmış, ilk satır header. Türkiye operasyonu kendi branch listesini istiyor.",
    task: 'Sadece TR branch\'lerinin site adını listele.',
    hint: "`grep \",TR,\"` ülke alanı TR olan satırları bırakır, virgüllerle aramak TR harflerinin başka bir alanda geçmesini engeller. `cut -d,` ayırıcıyı virgül yapar, `-f1` ilk alanı yani site adını keser. Header satırında ,TR, olmadığı için kendiliğinden elenir.",
    solution: 'grep ",TR," ~/data/branches.csv | cut -d, -f1',
    setup: sh => vbaUserFile(sh, VBA_H + '/data/branches.csv', VBA_BRCSV),
    check: (sh, c) => ['IST-BR-07', 'ANK-BR-02', 'IZM-BR-01', 'ANT-BR-04'].every(x => c.out.includes(x)) && !c.out.includes('AMS-DC-01') && !c.out.includes(',') },
  { title: 'LTE backup olanlar',
    story: "~/data/circuits.csv circuit envanteri, alanlar circuit_id, site, type ve provider. Hangi site'larda LTE backup olduğunu bulacaksın.",
    task: 'Tipi LTE olan circuit\'lerin site adlarını listele.',
    hint: "`grep \",LTE,\"` type alanı LTE olan satırları seçer, iki yandaki virgül alanın tam eşleşmesini sağlar. `cut -d, -f2` virgülle böler ve ikinci alanı yani site adını alır. -f1 yazarsan circuit numaralarını görürsün.",
    solution: 'grep ",LTE," ~/data/circuits.csv | cut -d, -f2',
    setup: sh => vbaUserFile(sh, VBA_H + '/data/circuits.csv', VBA_CIRCSV),
    check: (sh, c) => ['ANK-BR-02', 'IZM-BR-01', 'RTM-BR-03'].every(x => c.out.includes(x)) && !c.out.includes('IST-BR-07') && !c.out.includes(',') },
], { hint: "`grep \",NL,\"` sadece ülke alanı NL olan satırları bırakır, virgüllerle birlikte aramak başka alanlardaki rastgele eşleşmeleri engeller. `cut -d, -f1` virgülü ayırıcı yapıp ilk alanı yani şehir adını keser. Header satırı ,NL, içermediği için kendiliğinden elenir." });

/* ======================================================================
   perm
   ====================================================================== */
const VBA_LINKCHK = '#!/bin/bash\n# WAN underlay kontrolu, IST-BR-07\necho "INET-1 up, DSL-2 up, LTE-1 standby"\n';
const VBA_ROTATE = '#!/bin/bash\n# nginx log rotate\necho "nginx loglari rotate edildi"\n';
addVariants('pm1', [
  { title: 'Link check script\'i',
    story: "Bir arkadaş WAN kontrol script'ini ~/tools altına kopyalamış. Çalıştırmayı dene.",
    task: "~/tools dizinine geç, link_check.sh'i ./ ile çalıştırmayı dene, sonra ls -l ile permission'larına bak.",
    hint: "./ bulunduğun dizindeki dosyayı çalıştır demek, Linux PATH'te olmayan dosyayı tek başına isimle bulmaz. Permission denied gelince `ls -l` ile bak, ilk sütunda hiç x yoksa dosya çalıştırılamaz. Dosyayı kopyalamak execute iznini her zaman taşımaz.",
    solution: 'cd ~/tools\n./link_check.sh\nls -l',
    setup: sh => vbaUserFile(sh, VBA_H + '/tools/link_check.sh', VBA_LINKCHK, 0o644),
    check: (sh, c) => vbaRan(c, /ls\s+-\w*l|ll/) && c.out.includes('link_check.sh') },
  { title: 'Rotate script\'i',
    story: "~/scripts altında nginx log'larını rotate eden yeni bir script var ama cron her seferinde hata veriyor.",
    task: "~/scripts dizinine geç, rotate_logs.sh'i ./ ile çalıştırmayı dene, sonra ls -l ile permission'ına bak.",
    hint: "Önce `cd` ile script'in dizinine geç ki ./ doğru yeri göstersin. Permission denied hatası dosyanın bulunduğunu ama çalıştırılamadığını söyler. `ls -l` satırındaki rw-r--r-- içinde x olmadığını göreceksin.",
    solution: 'cd ~/scripts\n./rotate_logs.sh\nls -l rotate_logs.sh',
    setup: sh => vbaUserFile(sh, VBA_H + '/scripts/rotate_logs.sh', VBA_ROTATE, 0o644),
    check: (sh, c) => vbaRan(c, /ls\s+-\w*l|ll/) && c.out.includes('rotate_logs.sh') },
], { hint: "./ bulunduğun dizindeki dosyayı çalıştır demek, Linux PATH'te olmayan dosyayı ismiyle bulmaz. Permission denied alırsan `ls -l` ile bak, ilk sütundaki rw-r--r-- içinde x yoksa dosya çalıştırılamaz. Önce script'in olduğu dizine geçmeyi unutma." });

addVariants('pm2', [
  { title: 'Çalıştırılabilir yap',
    story: "link_check.sh'in execute izni yok. İzni ver ve WAN durumunu gör.",
    task: 'link_check.sh dosyasına execute permission ver ve çalıştır.',
    hint: "`chmod +x` dosyaya execute biti ekler, kime vereceğini yazmazsan owner, group ve others üçüne birden. Sonra script'i path'iyle çağırırsın. `bash dosya` ile de çalışır ama cron ve diğer araçlar execute biti bekler.",
    solution: 'chmod +x ~/tools/link_check.sh\n~/tools/link_check.sh',
    setup: sh => { if (!vbaEx(sh, VBA_H + '/tools/link_check.sh')) vbaUserFile(sh, VBA_H + '/tools/link_check.sh', VBA_LINKCHK, 0o644); },
    check: (sh, c) => { const n = sh.node(VBA_H + '/tools/link_check.sh'); return !!n && !!(n.m & 0o100) && c.out.includes('INET-1 up'); } },
  { title: 'Cron için hazırla',
    story: "Cron rotate_logs.sh'i doğrudan path ile çağırıyor, execute izni olmadan her gece fail ediyor.",
    task: 'rotate_logs.sh dosyasına execute permission ver ve çalıştır.',
    hint: "`chmod +x` execute iznini ekler, diğer izinlere dokunmaz. Cron script'i bash ile değil path ile çağırdığı için x biti şarttır. Çalıştırınca rotate mesajını görmelisin.",
    solution: 'chmod +x ~/scripts/rotate_logs.sh\n~/scripts/rotate_logs.sh',
    setup: sh => { if (!vbaEx(sh, VBA_H + '/scripts/rotate_logs.sh')) vbaUserFile(sh, VBA_H + '/scripts/rotate_logs.sh', VBA_ROTATE, 0o644); },
    check: (sh, c) => { const n = sh.node(VBA_H + '/scripts/rotate_logs.sh'); return !!n && !!(n.m & 0o100) && c.out.includes('rotate edildi'); } },
], { hint: "`chmod +x` dosyaya execute biti ekler, harf belirtmezsen owner, group ve others üçüne birden. Bundan sonra script'i path'iyle çağırabilirsin. Execute izni yoksa `bash script.sh` ile çalıştırmak da bir yoldur, ama doğru çözüm izni vermektir." });

addVariants('pm3', [
  { title: 'PSK dosyası',
    story: "~/.vpn/ist-br07.psk içinde pre-shared key var ve herkes okuyabiliyor. Bu bir audit bulgusu.",
    task: '~/.vpn/ist-br07.psk dosyasını sadece senin okuyup yazabileceğin hale getir.',
    hint: "Octal permission'da her rakam bir grup içindir, sıra owner, group, others. r=4, w=2, x=1 toplanır, 6 rw demek, 0 hiçbir şey. Owner için 6, diğer ikisi için 0 vermelisin, gizli anahtarlar için standart budur.",
    solution: 'chmod 600 ~/.vpn/ist-br07.psk',
    setup: sh => { vbaDir(sh, VBA_H + '/.vpn', VBA_U, 0o700); vbaPut(sh, VBA_H + '/.vpn/ist-br07.psk', 'ist07-inet-2026-q4\n', 0o644, VBA_U); },
    check: sh => { const n = sh.node(VBA_H + '/.vpn/ist-br07.psk'); return !!n && (n.m & 0o777) === 0o600; } },
  { title: 'Takım script\'i',
    story: "ion_backup.sh'i sen ve network group'u çalıştıracak, başka kimse görmemeli bile.",
    task: '~/tools/ion_backup.sh için owner tam yetki, group okuma ve çalıştırma, others hiçbir izin olacak şekilde octal permission ver.',
    hint: "Her rakam r=4, w=2, x=1 toplamıdır. Owner için rwx yani 4+2+1=7, group için r-x yani 4+1=5, others için 0. Bu üç rakamı sırayla `chmod`'a verirsin, harf yerine sayı kullanmak tüm izinleri tek seferde net ayarlar.",
    solution: 'chmod 750 ~/tools/ion_backup.sh',
    setup: sh => vbaUserFile(sh, VBA_H + '/tools/ion_backup.sh', '#!/bin/bash\necho "ion config backup"\n', 0o644),
    check: sh => { const n = sh.node(VBA_H + '/tools/ion_backup.sh'); return !!n && (n.m & 0o777) === 0o750; } },
], { hint: "Octal permission'da her rakam bir grup içindir, sıra owner, group, others. r=4, w=2, x=1 toplanır, 6 rw demek, 0 hiçbir şey. 600 yazınca sadece owner okur ve yazar, group ve others tamamen dışarıda kalır." });

const VBA_APIKEY = '# ION API token, IST-BR-07 automation, quarterly rotate\ntoken=sdwan-ist07-9f4c2e\n';
addVariants('pm4', [
  { title: 'IPsec secret\'ları',
    story: "/etc/ipsec.secrets tunnel PSK'lerini tutar. Normal user'ın bunu okuyamaması gerekir.",
    task: '/etc/ipsec.secrets dosyasını oku. Sonra neden okuyamadığını düşün.',
    hint: "Dosya root'a ait ve permission'ı 600, yani others için hiçbir izin yok, `cat` Permission denied verir. `ls -l /etc/ipsec.secrets` ile bunu görebilirsin. Bu bir hata değil, PSK'lerin sızmasını engelleyen tasarım.",
    solution: 'cat /etc/ipsec.secrets',
    check: (sh, c) => vbaRan(c, /ipsec\.secrets/) },
  { title: 'API key',
    story: "Automation ekibi ION API token'ını /etc/ssl/private/ion-api.key içine koymuş. Normal user olarak erişebiliyor musun?",
    task: '/etc/ssl/private/ion-api.key dosyasını oku. Sonra neden okuyamadığını düşün.',
    hint: "`cat` dosyayı senin user'ınla açmaya çalışır, dosya root'a ait ve others için okuma izni yoksa Permission denied alırsın. `ls -l` ile izinleri gör, son üç karakter others içindir. Key ve token dosyaları hep böyle kilitli olmalı.",
    solution: 'cat /etc/ssl/private/ion-api.key',
    setup: sh => vbaPut(sh, '/etc/ssl/private/ion-api.key', VBA_APIKEY, 0o640),
    check: (sh, c) => vbaRan(c, /ion-api\.key/) },
], { hint: "/etc/shadow password hash'lerini tutar ve root'tan başkası okuyamaz, normal user olarak `cat` Permission denied verir. `ls -l /etc/shadow` ile bakarsan others için hiçbir izin olmadığını görürsün. Bu bir hata değil, güvenlik tasarımı." });

addVariants('pm5', [
  { title: 'cloud-lab PSK',
    story: "cloud-lab tunnel'ini karşı tarafla birlikte debug ediyorsun, PSK'nin doğru olduğunu teyit etmen lazım.",
    task: 'sudo ile /etc/ipsec.secrets dosyasını oku ve 203.0.113.20 peer\'ının PSK değerini tırnaksız submit et.',
    hint: "`sudo` arkasındaki komutu root yetkisiyle çalıştırır, root için permission kontrolü yoktur. Her satır local IP, remote IP ve PSK içerir, 203.0.113.20 satırındaki tırnak içindeki değeri al. sudo kullanımı auth.log'a yazılır, iz bırakır.",
    solution: 'sudo cat /etc/ipsec.secrets\nsubmit cl0ud-lab-0nb0ard',
    check: (sh, c) => vbaSub(c, 'cl0ud-lab-0nb0ard') },
  { title: 'Token rotasyonu',
    story: "Token rotate edilecek, eskisini change kaydına yazman gerekiyor.",
    task: 'sudo ile /etc/ssl/private/ion-api.key dosyasını oku ve token değerini submit et.',
    hint: "`sudo cat` dosyayı root olarak okur, normal user'ın göremediği içeriği böyle görürsün. token= satırındaki eşittir işaretinden sonraki değeri submit et. sudo'yu sadece gerçekten gerektiğinde kullan.",
    solution: 'sudo cat /etc/ssl/private/ion-api.key\nsubmit sdwan-ist07-9f4c2e',
    setup: sh => { if (!vbaEx(sh, '/etc/ssl/private/ion-api.key')) vbaPut(sh, '/etc/ssl/private/ion-api.key', VBA_APIKEY, 0o640); },
    check: (sh, c) => vbaSub(c, 'sdwan-ist07-9f4c2e', 'token=sdwan-ist07-9f4c2e') },
], { hint: "`sudo` arkasından gelen komutu root yetkisiyle çalıştırır, şifre sorar ve her kullanımı auth.log'a yazar. Okuma izni olmayan dosyayı `sudo cat` ile okursun. Sadece gerektiği an kullan, her komutu sudo ile yazmak kötü alışkanlıktır." });

addVariants('pm6', [
  { title: 'UID sıfır',
    story: "Script'ler root olup olmadıklarını genelde kullanıcı adına değil UID'ye bakarak anlar. root'un UID'i her zaman 0'dır.",
    task: 'sudo ile id -u çalıştır.',
    hint: "`id -u` sadece effective user ID'yi sayı olarak basar. sudo komutu root olarak çalıştırdığı için 0 görürsün, sudo olmadan 1000 görürdün. Script'lerde root kontrolü bu sayıyla yapılır.",
    solution: 'sudo id -u',
    check: (sh, c) => vbaRan(c, /^sudo\s+id\b/) && c.out.trim() === '0' },
  { title: 'Önce ve sonra',
    story: "sudo'nun kimliğini nasıl değiştirdiğini yan yana gör. Önce kendin, sonra sudo ile.",
    task: 'Önce whoami, sonra sudo whoami çalıştır.',
    hint: "`whoami` o an komutu hangi kullanıcı olarak çalıştırdığını basar, ilk seferde burak görürsün. Başına sudo koyunca aynı komut root olarak çalışır ve root döner. Kimlik sadece o tek komut için değişir, shell'in burak olarak kalır.",
    solution: 'whoami\nsudo whoami',
    check: (sh, c) => c.out.trim() === 'root' && vbaHist(sh, /^whoami\s*$/) },
], { hint: "`whoami` o an hangi kullanıcı olarak komut çalıştırdığını söyler. Başına sudo koyduğunda komut root olarak çalıştığı için cevap root olur. Script yazarken root olup olmadığını böyle kontrol edersin." });

addVariants('pm7', [
  { title: 'developers group\'u',
    story: "/srv/projects dizini developers group'una ait ve group'a yazma izni var. Oraya yazabilmen için o group'ta olman gerekiyor.",
    task: "id ile group'larına bak. developers group'unda mısın? evet ya da hayır olarak submit et.",
    hint: "`id` uid, gid ve groups alanlarını basar. groups listesinde sayıların yanındaki isimlere bak, developers orada geçiyorsa üyesin. Group'a yeni eklendiysen değişiklik ancak yeni bir login'de görünür.",
    solution: 'id\nsubmit evet',
    check: (sh, c) => vbaSub(c, 'evet', 'yes', 'e') },
  { title: 'deploy sudo yapabilir mi',
    story: "auth.log'da deploy hesabının root olmaya çalıştığını gördün. Bu hesap sudo group'unda mı?",
    task: "id ile deploy user'ının group'larına bak. deploy sudo group'unda mı? evet ya da hayır olarak submit et.",
    hint: "`id` arkasına bir kullanıcı adı alırsa o hesabın bilgilerini basar, kendininkini değil. groups listesinde sudo yoksa hesap sudo kullanamaz, auth.log'daki user NOT in sudoers satırı da bunu söyler. Sadece evet ya da hayır gönder.",
    solution: 'id deploy\nsubmit hayır',
    check: (sh, c) => vbaSub(c, 'hayır', 'hayir', 'no', 'h') },
], { hint: "`id` uid, gid ve groups alanlarını basar. groups listesinde bir group adı görüyorsan o group'un izinlerinden faydalanırsın, docker group'u docker socket'ine erişim demek. Sayıların yanındaki isimlere bak, sayılar group ID'sidir." });

/* ======================================================================
   proc
   ====================================================================== */
addVariants('pr1', [
  { title: 'Agent kimin adına',
    story: "erp-agent'ın hangi user ile çalıştığını bilmen lazım, dosya izinleri buna göre ayarlanacak.",
    task: "Tüm process'leri listele ve erp-agent process'inin user'ını submit et.",
    hint: "`ps aux` tüm process'leri listeler, a diğer kullanıcıları, u user sütununu, x terminale bağlı olmayan daemon'ları ekler. İlk sütun USER'dır. Çıktı uzunsa `| grep erp-agent` ile süzebilirsin.",
    solution: 'ps aux | grep erp-agent\nsubmit erp',
    setup: sh => vbaProc(sh, { pid: 1402, user: 'erp', cpu: 0.3, mem: 1.2, cmd: '/opt/erp-agent/bin/erp-agent --config /opt/erp-agent/agent.conf' }),
    check: (sh, c) => vbaSub(c, 'erp') },
  { title: 'charon PID',
    story: "strongSwan'ın IKE daemon'ı charon. Debug için PID'sini not alman isteniyor.",
    task: "Tüm process'leri listele ve charon process'inin PID'sini submit et.",
    hint: "`ps aux` çıktısında ikinci sütun PID'dir. aux içindeki x önemli, charon bir daemon ve terminale bağlı değil, x olmadan görünmez. `| grep charon` ile sadece ilgili satırı bırakabilirsin.",
    solution: 'ps aux | grep charon\nsubmit 1210',
    setup: sh => vbaProc(sh, { pid: 1210, user: 'root', cpu: 0.1, mem: 0.9, cmd: '/usr/lib/ipsec/charon' }),
    check: (sh, c) => vbaSub(c, 1210) },
], { hint: "`ps aux` sistemdeki tüm process'leri listeler. a başka kullanıcıların process'lerini, u user ve CPU, memory sütunlarını, x terminale bağlı olmayan daemon'ları ekler. Düz `ps` sadece senin terminalindeki process'leri gösterir, sunucuda yanıltıcıdır." });

addVariants('pr2', [
  { title: 'Takılan resync',
    story: "Jump box'ta load çok yüksek. Biri CPU'yu sonuna kadar kullanıyor.",
    task: "top ile en çok CPU yiyen process'i bul ve PID'sini submit et.",
    hint: "`top` process'leri CPU kullanımına göre sıralar, en çok yiyen en üstte durur. İlk sütun PID, kill ederken bu numarayı kullanırsın. %CPU sütununda iki process birbirine yakınsa sayılara dikkatli bak.",
    solution: 'top\nsubmit 4711',
    setup: sh => vbaProc(sh, VBA_PROC_RESYNC),
    check: (sh, c) => vbaSub(c, 4711) },
  { title: 'Kaçak vacuum',
    story: "Flow database'i olan postgres yavaşladı, sunucunun CPU grafiği tavan yapmış.",
    task: "top ile en çok CPU yiyen process'i bul ve PID'sini submit et.",
    hint: "`top` en çok CPU kullananı en üste koyar, sıralama %CPU sütununa göredir. COMMAND sütunu process'in ne olduğunu, PID sütunu numarasını verir. Gerçek top canlı güncellenir ve q ile çıkılır, burada bir snapshot var.",
    solution: 'top\nsubmit 2934',
    setup: sh => vbaProc(sh, VBA_PROC_VACUUM),
    check: (sh, c) => vbaSub(c, 2934) },
], { hint: "`top` process'leri CPU kullanımına göre sıralar, en çok yiyen en üstte durur. İlk sütun PID, kill ederken bu numarayı kullanırsın. Gerçek top canlı güncellenir ve q ile çıkılır, burada tek bir snapshot görürsün." });

addVariants('pr3', [
  { title: 'resync.py\'yi durdur',
    story: "resync.py sonsuz döngüye girmiş ve erp user'ı altında çalışıyor. Senin process'in değil.",
    task: "resync.py process'ini kill et.",
    hint: "`kill PID` process'e SIGTERM gönderir, yani düzgünce kapan der. Process erp user'ına ait, başka user'ın process'ini sadece root öldürebilir, Operation not permitted alırsan başına sudo ekle. PID'yi top ya da ps aux ile bulmuştun.",
    solution: 'sudo kill 4711',
    setup: sh => vbaProc(sh, VBA_PROC_RESYNC),
    check: sh => !sh.procs.some(p => p.pid === 4711) },
  { title: 'Vacuum\'u durdur',
    story: "DBA onay verdi, kaçak autovacuum worker'ı öldürebilirsin. postgres user'ı altında çalışıyor.",
    task: "autovacuum worker process'ini kill et.",
    hint: "`kill` default olarak SIGTERM gönderir, process temizlik yapıp çıkma şansı bulur. postgres user'ının process'ine dokunmak için root gerekir, o yüzden sudo. `kill -9` yani SIGKILL'i sadece SIGTERM işe yaramazsa kullan, database process'inde veri bozabilir.",
    solution: 'sudo kill 2934',
    setup: sh => vbaProc(sh, VBA_PROC_VACUUM),
    check: sh => !sh.procs.some(p => p.pid === 2934) },
], { hint: "`kill PID` process'e SIGTERM gönderir, yani düzgünce kapan der. Başka bir user'ın process'ini sadece root öldürebilir, Operation not permitted alırsan başına sudo eklersin. SIGTERM'e cevap vermeyen inatçı process için `kill -9` yani SIGKILL son çaredir." });

addVariants('pr4', [
  { title: 'Tunnel servisi',
    story: "Yeni cloud-lab IPsec tunnel'i hiç kalkmadı diyorlar. Önce strongSwan servisi ayakta mı bak.",
    task: "strongswan servisinin status'una bak.",
    hint: "`systemctl status` bir unit'in loaded, active ya da failed durumunu gösterir, .service ekini yazmasan da olur. Burada active running göreceksin, bu sadece daemon'ın ayakta olduğunu söyler. Tunnel'in kalkıp kalkmadığını log'lar söyler.",
    solution: 'systemctl status strongswan',
    check: (sh, c) => vbaRan(c, /systemctl\s+status\s+strongswan/) },
  { title: 'Agent servisi',
    story: "erp-agent sync yapmıyor. Servis çalışıyor mu, durmuş mu, önce onu netleştir.",
    task: "erp-agent servisinin status'una bak.",
    hint: "`systemctl status` servisin durumunu ve unit dosyasının yerini gösterir. Active satırında running görmek uygulamanın doğru çalıştığı anlamına gelmez, process ayakta ama işini yapamıyor olabilir. Sıradaki adım her zaman servisin log'larıdır.",
    solution: 'systemctl status erp-agent',
    check: (sh, c) => vbaRan(c, /systemctl\s+status\s+erp-agent/) },
], { hint: "`systemctl status` bir servisin loaded, active ya da failed durumunu ve son log satırlarını gösterir. Servis adı unit adıdır, .service eki yazmasan da olur. Active satırında failed görüyorsan sıradaki adım log'lara bakmaktır." });

addVariants('pr5', [
  { title: 'Proposal reddi',
    story: "strongSwan ayakta ama cloud-lab kalkmıyor. Hangi peer teklif ettiğin proposal'ı reddediyor?",
    task: "strongswan log'larını oku ve NO_PROPOSAL_CHOSEN dönen peer'ın IP adresini submit et.",
    hint: "`journalctl` komutuna `-u` ile unit adını verirsen sadece o servisin log'ları gelir. NO_PROPOSAL_CHOSEN satırının hemen üstünde received packet from ile başlayan satır cevabın hangi IP'den geldiğini söyler. Köşeli parantezdeki port'u değil sadece IP'yi gönder.",
    solution: 'journalctl -u strongswan\nsubmit 203.0.113.20',
    check: (sh, c) => vbaSub(c, '203.0.113.20') },
  { title: 'Yanlış resolver',
    story: "erp-agent ayakta ama erp.corp.lab'ı çözemiyor. Hangi DNS server'a soruyor?",
    task: "erp-agent log'larını oku ve kullandığı resolver IP adresini submit et.",
    hint: "`journalctl` `-u` flag'iyle tek bir unit'in log'larını süzer, sistemdeki diğer gürültüyü atar. using resolver satırı agent'ın sistem resolver'ını değil kendi config'indeki bir adresi kullandığını söylüyor. O adresi submit et.",
    solution: 'journalctl -u erp-agent\nsubmit 203.0.113.53',
    check: (sh, c) => vbaSub(c, '203.0.113.53') },
], { hint: "`journalctl` komutuna `-u` ve unit adını verirsen sadece o servisin log'larını gösterir, -u unit demek. nginx config hatası verdiğinde mesajın sonunda dosya yolu, iki nokta ve satır numarası yazar. O numara sıradaki görevde düzelteceğin satırdır." });

addVariants('pr6', [
  { title: 'Proxy port typo',
    story: "nginx'e portal için ikinci bir server bloğu eklendi ve servis düştü. Port numarasında sıfır yerine büyük O harfi yazılmış.",
    task: "nginx -t ile hatalı satırı bul, port'u 8081 olarak düzelt ve servisi restart et. Servis active olmalı.",
    hint: "`sudo nginx -t` config'i servisi bozmadan test eder ve hatalı satırı söyler. `sed -i` dosyayı in-place düzenler, `s/eski/yeni/` ilk eşleşmeyi değiştirir, dosya root'a ait olduğu için sudo şart. Test syntax is ok demeden restart etme, yoksa servis yine failed olur.",
    solution: "sudo nginx -t\nsudo sed -i 's/8O81/8081/' /etc/nginx/nginx.conf\nsudo nginx -t\nsudo systemctl restart nginx",
    setup: sh => { vbaPut(sh, '/etc/nginx/nginx.conf', VBA_NGINX_V1, 0o644); sh.services.nginx = 'failed'; },
    check: sh => sh.services.nginx === 'active' && vbaHas(sh, '/etc/nginx/nginx.conf', 'listen 8081;') },
  { title: 'Eksik süslü parantez',
    story: "Birisi status sayfası için server bloğu eklerken dosyanın sonundaki kapanış süslü parantezini silmiş. nginx config'in yarıda bittiğini söylüyor.",
    task: "nginx -t ile hatayı gör, dosyanın sonuna eksik kapanış parantezini ekle ve servisi restart et. Servis active olmalı.",
    hint: "`sudo nginx -t` unexpected end of file diyorsa bir blok açılmış ama kapanmamıştır. Dosya root'a ait, `sudo echo` ile `>>` çalışmaz çünkü redirect'i senin shell'in yapar, onun yerine echo çıktısını `sudo tee -a` ile sona ekle, `-a` append demek. Testten syntax is ok aldıktan sonra restart et.",
    solution: "sudo nginx -t\necho \"}\" | sudo tee -a /etc/nginx/nginx.conf\nsudo nginx -t\nsudo systemctl restart nginx",
    setup: sh => { vbaPut(sh, '/etc/nginx/nginx.conf', VBA_NGINX_V2, 0o644); sh.services.nginx = 'failed'; },
    check: sh => sh.services.nginx === 'active' && nginxConfError(sh) === null && vbaHas(sh, '/etc/nginx/nginx.conf', 'listen 8090;') },
], { hint: "`sed -i` dosyayı in-place düzenler, `s/eski/yeni/` her satırdaki ilk eşleşmeyi değiştirir. Dosya root'a ait olduğu için sudo şart. `sudo nginx -t` config'i servisi bozmadan test eder, syntax is ok görmeden restart etme, yoksa servis yine failed olur." });

addVariants('pr7', [
  { title: 'Status sayfası',
    story: "Branch IT, ekranlarında gösterecekleri status sayfasının geldiğinden emin olmak istiyor. Sayfa web root'ta branch-status.html.",
    task: "curl ile localhost'tan branch-status.html sayfasını çek.",
    hint: "`curl` URL'e HTTP GET atar ve gelen body'yi terminale basar. Path'i URL'in sonuna yazarsın, nginx onu /var/www/html altında arar. Connection refused gelirse servis port'u dinlemiyordur, önce `systemctl status nginx`.",
    solution: 'curl http://localhost/branch-status.html',
    setup: sh => vbaPut(sh, '/var/www/html/branch-status.html', '<h1>IST-BR-07 status OK</h1>\n<p>INET-1 up, DSL-2 up</p>\n'),
    check: (sh, c) => c.out.includes('IST-BR-07 status OK') },
  { title: 'Sadece header',
    story: "Monitoring check'i body ile ilgilenmiyor, sadece HTTP status koduna bakıyor. Sen de öyle test et.",
    task: "curl ile localhost'a sadece header isteyen bir request at ve 200 OK gör.",
    hint: "`curl -I` HEAD request atar, body yerine sadece response header'larını basar. İlk satırdaki HTTP/1.1 200 OK servisin cevap verdiğini kanıtlar, Server satırı hangi yazılımın cevap verdiğini söyler. Büyük sayfalarda hız ve okunurluk kazandırır.",
    solution: 'curl -I http://localhost',
    check: (sh, c) => vbaRan(c, /curl\s+.*-I/) && c.out.includes('200 OK') && c.out.includes('nginx') },
], { hint: "`curl` URL'e HTTP request atar ve gelen body'yi terminale basar. Servis active görünse bile gerçekten cevap verdiğini ancak böyle kanıtlarsın. Connection refused alırsan servis port'u dinlemiyordur, önce `systemctl status` ile kontrol et." });

/* ======================================================================
   net
   ====================================================================== */
addVariants('n1', [
  { title: 'OT VLAN adresi',
    story: "OT VLAN'daki HMI'lar jump box'ı gateway olarak kullanıyor. Jump box'ın o VLAN'daki adresi eth1 üzerinde.",
    task: "eth1 interface'inin IPv4 adresini prefix olmadan submit et.",
    hint: "`ip a` yani `ip addr` interface adreslerini basar, arkasına `show eth1` eklersen sadece o interface gelir. inet ile başlayan satır IPv4 adresidir, sonundaki /24 prefix length'tir. Submit ederken /24 kısmını yazma.",
    solution: 'ip a show eth1\nsubmit 192.168.2.1',
    check: (sh, c) => vbaSub(c, '192.168.2.1') },
  { title: 'WireGuard adresi',
    story: "Partner lab'a WireGuard tunnel'i ile bağlısın. Karşı taraf senin tunnel IP'ni soruyor.",
    task: "wg0 interface'inin IPv4 adresini prefix olmadan submit et.",
    hint: "`ip a` komutuna `-br` yani brief eklersen her interface'i adı, durumu ve adresleriyle tek satırda gösterir. wg0 satırındaki adresin /24 kısmı prefix'tir, onu atarak gönder. Tunnel interface'lerinde link/ether yerine link/none görmen normal.",
    solution: 'ip -br a\nsubmit 10.8.0.2',
    check: (sh, c) => vbaSub(c, '10.8.0.2') },
], { hint: "`ip a` yani `ip addr` her interface'in adreslerini listeler. inet satırı IPv4, inet6 satırı IPv6 adresidir, adresin sonundaki /24 prefix length'tir. Submit ederken sadece adresi yaz, prefix'i değil." });

addVariants('n2', [
  { title: 'Backup gateway',
    story: "DSL backup hattından çıkan trafik policy based routing ile ayrı bir routing table kullanıyor, adı dsl. O table'daki default gateway nedir?",
    task: 'dsl routing table\'ındaki default gateway adresini submit et.',
    hint: "`ip rule` hangi kaynağın hangi table'a baktığını gösterir. `ip route show` arkasına `table` ve table adını eklersen sadece o table'ın route'ları gelir, düz `ip route` main table'ı gösterir ve bu route'u görmezsin. default satırında via'dan sonraki adres gateway'dir.",
    solution: 'ip rule\nip route show table dsl\nsubmit 192.168.100.1',
    check: (sh, c) => vbaSub(c, '192.168.100.1') },
  { title: 'Tunnel next hop',
    story: "Partner lab'ın 10.20.0.0/16 network'üne giden paketler tunnel'in karşı ucuna gönderiliyor. O next hop hangi adres?",
    task: '10.20.0.0/16 route\'unun next hop adresini submit et.',
    hint: "`ip r` main routing table'ı basar. Her satır bir prefix ile başlar, via kelimesinden sonraki adres next hop'tur, dev'den sonrası çıkış interface'idir. 10.20.0.0/16 satırını bul ve via'dan sonrasını gönder.",
    solution: 'ip r\nsubmit 10.8.0.1',
    check: (sh, c) => vbaSub(c, '10.8.0.1') },
], { hint: "`ip route` yani `ip r` kernel'in routing table'ını basar. default ile başlayan satır default route'tur, via kelimesinden sonraki adres default gateway'dir. dev kelimesinden sonrası paketin hangi interface'ten çıktığını söyler." });

addVariants('n3', [
  { title: 'OT VLAN route',
    story: "HMI'lara giden 192.168.2.0/24 trafiği jump box'tan hangi kapıdan çıkıyor?",
    task: "192.168.2.0/24 hangi interface üzerinden gidiyor? Interface adını submit et.",
    hint: "`ip r` çıktısını `grep 192.168.2` ile süzersen sadece o prefix'in satırı kalır, grep pipe'tan gelen satırlarda pattern arar. dev kelimesinden sonraki isim çıkış interface'idir. proto kernel yazması network'ün doğrudan bağlı olduğunu söyler.",
    solution: 'ip r | grep 192.168.2\nsubmit eth1',
    check: (sh, c) => vbaSub(c, 'eth1') },
  { title: 'Container network',
    story: "Docker container'ları 172.17.0.0/16 kullanıyor ve dışarı çıkamadıklarını söylüyorlar.",
    task: "172.17.0.0/16 hangi interface üzerinden gidiyor? Interface adını submit et.",
    hint: "`ip r` çıktısını pipe ile `grep`'e verip 172.17 aratırsan route table'dan sadece container network satırı kalır. dev'den sonraki isim interface'tir, satırın sonundaki linkdown ise o interface'in şu an carrier'ı olmadığını, yani çalışan container olmadığını söyler. Sadece interface adını gönder.",
    solution: 'ip r | grep 172.17\nsubmit docker0',
    check: (sh, c) => vbaSub(c, 'docker0') },
], { hint: "`ip route` çıktısında her satır bir prefix ve onu nereye göndereceğini söyler. dev kelimesinden sonra gelen isim çıkış interface'idir. Çıktıyı pipe ile `grep`'e verirsen sadece ilgilendiğin prefix'in satırı kalır." });

addVariants('n4', [
  { title: 'Hub portal',
    story: "Branch'ten hub'daki portal.corp.lab sunucusuna latency ölçeceksin, adres 10.50.0.30.",
    task: '10.50.0.30 adresine 5 paket ping at.',
    hint: "`ping` ICMP echo request gönderir ve cevapları sayar. `-c 5` count demek, beş paketten sonra durur ve özet basar. Özetteki received sayısı ve rtt avg değeri SD-WAN path kalitesi hakkında ilk fikri verir.",
    solution: 'ping -c 5 10.50.0.30',
    check: (sh, c) => vbaRan(c, /ping\s+.*-c\s*5\b/) && c.out.includes('5 received') },
  { title: 'HMI erişimi',
    story: "OT ekibi hmi-01'e ulaşamadığını söylüyor. İsim /etc/hosts içinde tanımlı, isimle test et.",
    task: 'hmi-01 hostname\'ine 2 paket ping at.',
    hint: "`ping` hedef olarak IP ya da isim alır, isim verirsen önce /etc/hosts ve DNS ile çözülür. `-c 2` iki paket gönderip durur. Çıktının ilk satırında ismin hangi IP'ye çözüldüğünü de görürsün.",
    solution: 'ping -c 2 hmi-01',
    check: (sh, c) => vbaRan(c, /ping\s+.*-c\s*2\b/) && vbaRan(c, /hmi-01/) && c.out.includes('2 received') },
], { hint: "`ping` hedefe ICMP echo request gönderir ve cevapları sayar. `-c 3` count demek, üç paketten sonra durur ve özet basar. Gerçek Linux'ta -c vermezsen ping Ctrl+C'ye kadar sürer, script içinde bu takılıp kalmak demektir." });

addVariants('n5', [
  { title: 'Database port\'u',
    story: "Flow database'ine bağlanamıyorlar. postgres hangi port'ta dinliyor?",
    task: "postgres process'inin listen ettiği TCP port'unu submit et.",
    hint: "`ss` socket listesi verir. `-t` TCP, `-l` sadece listen edenler, `-n` port'u isim yerine numara olarak gösterir, `-p` socket'in hangi process'e ait olduğunu yazar. Local Address sütununda iki noktadan sonraki sayı port'tur, 127.0.0.1 ise sadece localhost'tan erişilebilir demek.",
    solution: 'ss -tlnp\nsubmit 5432',
    check: (sh, c) => vbaSub(c, 5432) },
  { title: 'Metrics port\'u',
    story: "Prometheus erp-agent'ın metrics endpoint'ini scrape edemiyor. Agent hangi port'ta dinliyor?",
    task: "erp-agent process'inin listen ettiği TCP port'unu submit et.",
    hint: "`ss` için `-t` TCP, `-l` listen, `-n` numeric, `-p` process demek ve tek tire ile birleştirilebilir. Process sütununda erp-agent satırını bul, Local Address'te iki noktadan sonraki sayı port'tur. -n olmadan bazı port'lar servis adıyla görünür ve karışır.",
    solution: 'ss -tlnp\nsubmit 9100',
    check: (sh, c) => vbaSub(c, 9100) },
], { hint: "`ss` socket istatistiği verir. `-t` TCP, `-u` UDP, `-l` sadece listen eden socket'ler, `-n` port'ları isim yerine numara olarak gösterir, `-p` socket'in hangi process'e ait olduğunu yazar. Local Address sütununda iki noktadan sonraki sayı port'tur." });

addVariants('n6', [
  { title: 'postgresql.conf',
    story: "Running state 5432 diyor. Config dosyası da aynı şeyi söylüyor mu, yoksa biri değiştirip restart etmeyi mi unuttu?",
    task: '/etc/postgresql/16/main/postgresql.conf içinde port satırını grep ile bul.',
    hint: "`grep port` dosyada port geçen her satırı basar, grep case sensitive olduğu için Port yazarsan eşleşmez. Başında # olan satır yorumdur ve etkisizdir, gerçek ayar # olmayan satırdır. Config ile running state farklıysa servis restart edilmemiştir.",
    solution: 'grep port /etc/postgresql/16/main/postgresql.conf',
    setup: sh => vbaPut(sh, '/etc/postgresql/16/main/postgresql.conf', "# PostgreSQL config, flowdb\nlisten_addresses = 'localhost'\n#port = 5433\nport = 5432\nmax_connections = 100\n"),
    check: (sh, c) => c.out.includes('port = 5432') },
  { title: 'Agent metrics config',
    story: "ss 9100 gösterdi. Agent'ın metrics config'i de aynı adresi mi söylüyor bak.",
    task: '/etc/erp-agent/metrics.conf içinde metrics_listen satırını grep ile bul.',
    hint: "`grep metrics_listen` sadece o anahtarın geçtiği satırı getirir. Değerdeki adres ve port ss çıktısındaki Local Address ile aynı olmalı. 127.0.0.1 ile dinleyen bir servise dışarıdan scrape gelemez, sorun buysa config'i değiştirmek gerekir.",
    solution: 'grep metrics_listen /etc/erp-agent/metrics.conf',
    setup: sh => vbaPut(sh, '/etc/erp-agent/metrics.conf', '# erp-agent metrics exporter\nmetrics_enabled = true\nmetrics_listen = 127.0.0.1:9100\nmetrics_path = /metrics\n'),
    check: (sh, c) => c.out.includes('127.0.0.1:9100') },
], { hint: "Running state ile config aynı şeyi söylemeyebilir, servis restart edilmeden config değiştirilmiş olabilir. `grep Port` dosyada Port geçen satırı bulur, grep case sensitive olduğu için port yazarsan eşleşmez. Yorum satırındaki #Port ile gerçek ayarı karıştırma." });

addVariants('n7', [
  { title: 'NMS kaydı',
    story: "Yeni NMS sunucusu nms.ist07.local henüz DNS'te yok, ama monitoring bu isimle bağlanacak. Geçici çözüm /etc/hosts.",
    task: '/etc/hosts dosyasına 10.50.0.44 nms.ist07.local satırını ekle ve getent hosts nms.ist07.local ile doğrula.',
    hint: "/etc/hosts root'a ait, `sudo echo ... >> /etc/hosts` çalışmaz çünkü redirect'i sudo değil senin shell'in yapar. echo çıktısını pipe ile `sudo tee -a`'ya verirsen dosyaya root yazar, `-a` append demek, unutursan tee dosyayı ezer. `getent hosts` /etc/hosts dahil sistem resolver sırasını kullanır, dig kullanmaz.",
    solution: 'echo "10.50.0.44 nms.ist07.local" | sudo tee -a /etc/hosts\ngetent hosts nms.ist07.local',
    check: (sh, c) => vbaHas(sh, '/etc/hosts', 'nms.ist07.local') && vbaRan(c, /getent|ping/) && c.out.includes('10.50.0.44') },
  { title: 'Partner CRM',
    story: "Partner'ın CRM sunucusu crm.partner.local sadece tunnel üzerinden erişilebilir ve public DNS'te yok. Adresi 172.31.10.5.",
    task: '/etc/hosts dosyasına 172.31.10.5 crm.partner.local satırını ekle ve getent hosts crm.partner.local ile doğrula.',
    hint: "`tee -a` stdin'i hem ekrana basar hem dosyanın sonuna ekler, sudo ile çalıştırınca root yetkisiyle yazar. -a olmadan tee dosyayı sıfırlar ve localhost satırları gider. Doğrulamada `getent hosts` kullan, çünkü dig /etc/hosts'a bakmaz.",
    solution: 'echo "172.31.10.5 crm.partner.local" | sudo tee -a /etc/hosts\ngetent hosts crm.partner.local',
    check: (sh, c) => vbaHas(sh, '/etc/hosts', 'crm.partner.local') && vbaRan(c, /getent|ping/) && c.out.includes('172.31.10.5') },
], { hint: "/etc/hosts root'a ait, `sudo echo ... >> /etc/hosts` çalışmaz çünkü redirect'i sudo değil senin shell'in yapar. `tee -a` stdin'i dosyanın sonuna append eder ve sudo ile çalıştığı için yazma izni olur, -a'yı unutursan tee dosyayı ezer. `getent hosts` /etc/hosts dahil sistemin resolver sırasını kullanır." });

addVariants('n8', [
  { title: 'ERP kaydı',
    story: "erp-agent erp.corp.lab'ı çözemiyor. Sistemin resolver'ı doğru cevabı veriyor mu?",
    task: "erp.corp.lab için A record'unu kısa formatta al.",
    hint: "`dig` /etc/resolv.conf'taki DNS server'a doğrudan sorar, /etc/hosts'a bakmaz. `+short` header ve section'ları atıp sadece cevabı basar. Cevap geliyorsa sistem resolver'ı sağlam, sorun agent'ın kendi resolver ayarındadır.",
    solution: 'dig erp.corp.lab +short',
    check: (sh, c) => vbaRan(c, /dig/) && c.out.includes('10.50.0.10') },
  { title: 'Mail server',
    story: "Branch'teki tarayıcı scan-to-mail gönderemiyor. corp.lab domain'inin mail server'ı hangisi?",
    task: "corp.lab için MX record'unu kısa formatta al.",
    hint: "`dig` isimden sonra record tipini alır, MX mail exchanger demek, default tip A'dır. `+short` sadece cevabı basar, MX cevabında önce priority sonra sunucu adı gelir. Tipi yazmazsan A record'una bakarsın ve mail server'ı göremezsin.",
    solution: 'dig corp.lab MX +short',
    check: (sh, c) => vbaRan(c, /dig/) && c.out.includes('mail.corp.lab') },
], { hint: "`dig` resolver dosyasındaki DNS server'a doğrudan sorar ve /etc/hosts'a hiç bakmaz. `+short` sadece cevap kayıtlarını basar, header ve section'ları atar. Belirli bir server'a sormak istersen `@ip` eklersin." });
