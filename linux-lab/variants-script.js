'use strict';
/* Senaryo varyantlari, bash ve vim bolumleri ile users, hw, arch bolumleri.
   Her gorev icin iki varyant ve aciklayici temel ipucu. Ust seviye isimler VSC_ ve vsc on ekli. */

const VSC_H = '/home/burak';
const VSC_U = 'burak';

/* ---------- yardimcilar ---------- */
function vscFile(sh, p) { const n = sh.node(p); return n && n.t === 'f' ? n.d : null; }
function vscHas(sh, p, s) { const d = vscFile(sh, p); return d !== null && d.includes(s); }
function vscRe(sh, p, re) { const d = vscFile(sh, p); return d !== null && re.test(d); }
function vscEx(sh, p, t) { const n = sh.node(p); return !!(n && (!t || n.t === t)); }
function vscRan(c, re) { return re.test(c.line || ''); }
function vscHist(sh, re) { return sh.history.some(h => re.test(h)); }
function vscSub(c, ...answers) {
  if (c.submit == null) return false;
  const s = String(c.submit).trim().toLowerCase().replace(/\s+/g, ' ');
  return answers.some(a => s === String(a).toLowerCase());
}
function vscVim(sh, ...keys) { return keys.every(k => (sh.vimLog || []).includes(k)); }
function vscVimSearched(sh) { return (sh.vimLog || []).some(k => k.startsWith('/')); }
/* ara dizinleri olusturur, home altinda burak'a, disarida root'a ait */
function vscMkdirp(sh, abs, owner) {
  const parts = abs.split('/').filter(Boolean);
  let cur = sh.root; let path = '';
  for (const p of parts) {
    path += '/' + p;
    if (!cur.c[p]) cur.c[p] = mkdir({}, 0o755, owner || (path.startsWith(VSC_H) ? VSC_U : 'root'));
    cur = cur.c[p];
    if (cur.t !== 'd') return null;
  }
  return cur;
}
function vscPut(sh, abs, data, owner, mode) {
  const i = abs.lastIndexOf('/');
  const own = owner || (abs.startsWith(VSC_H) ? VSC_U : 'root');
  const dir = vscMkdirp(sh, abs.slice(0, i) || '/', abs.startsWith(VSC_H) ? VSC_U : undefined);
  if (dir) dir.c[abs.slice(i + 1)] = mkfile(data, mode === undefined ? 0o644 : mode, own);
}
function vscRm(sh, abs) { const i = abs.lastIndexOf('/'); const d = sh.node(abs.slice(0, i) || '/'); if (d && d.t === 'd') delete d.c[abs.slice(i + 1)]; }
/* gecmise yazmadan komut calistirir, root ya da burak olarak */
function vscSys(sh, line, asUser) {
  const was = sh.isRoot; sh.isRoot = !asUser;
  try { sh.execList(line, () => {}); } catch (e) { /* kurulum sessiz */ } finally { sh.isRoot = was; }
}
function vscLines(n) { return n.split('\n').filter(Boolean).length; }
function vscPasswd(sh, name) { const d = vscFile(sh, '/etc/passwd') || ''; return d.split('\n').find(l => l.startsWith(name + ':')) || null; }
function vscGroupLine(sh, g) { const d = vscFile(sh, '/etc/group') || ''; return d.split('\n').find(l => l.startsWith(g + ':')) || null; }
function vscGroupHas(sh, g, u) { const l = vscGroupLine(sh, g); return !!l && (l.split(':')[3] || '').split(',').includes(u); }
function vscShadow(sh, name) { const d = vscFile(sh, '/etc/shadow') || ''; return ((d.split('\n').find(l => l.startsWith(name + ':')) || '').split(':')[1]) || ''; }
function vscEnsureUser(sh, name, extra) {
  if (vscPasswd(sh, name) && vscEx(sh, '/home/' + name, 'd')) return;
  if (vscPasswd(sh, name)) vscSys(sh, 'userdel ' + name);
  vscSys(sh, `useradd -m -s /bin/bash ${extra || ''} ${name}`);
}
function vscDropUser(sh, name) { if (vscPasswd(sh, name)) vscSys(sh, 'userdel -r ' + name); vscRm(sh, '/home/' + name); }
function vscEnsureGroup(sh, g, gid) { if (!vscGroupLine(sh, g)) vscSys(sh, `groupadd ${gid ? '-g ' + gid + ' ' : ''}${g}`); }
function vscMounted(sh, dev, mp) { return (vscFile(sh, '/proc/mounts') || '').split('\n').find(l => l.startsWith(dev + ' ' + (mp ? mp + ' ' : ''))) || null; }
function vscUsbOff(sh) {
  const n = sh.node('/proc/mounts'); if (!n) return;
  const ls = n.d.split('\n'); const l = ls.find(x => x.startsWith('/dev/sdc1 '));
  if (!l) return;
  const mp = l.split(' ')[1]; const d = sh.node(mp); if (d && d.t === 'd') d.c = {};
  n.d = ls.filter(x => x !== l).join('\n');
  if (sh.cwd === mp || sh.cwd.startsWith(mp + '/')) sh.cwd = VSC_H;
}
function vscUsbOn(sh, mp, ro) { vscUsbOff(sh); vscMkdirp(sh, mp, 'root'); vscSys(sh, `mount ${ro ? '-o ro ' : ''}/dev/sdc1 ${mp}`); }
function vscMember(p, d, o) { return { p, t: p.endsWith('/') ? 'd' : 'f', m: p.endsWith('/') ? 0o755 : 0o644, o: o || VSC_U, d: p.endsWith('/') ? '' : d, ts: Date.now() }; }
function vscTar(list, o) { return sysPack('tar', { members: list.map(x => vscMember(x[0], x[1], o)) }); }
function vscGz(name, data) { return sysPack('gz', { n: name, d: data, l: data.length }); }
function vscBraces(sh) { const d = vscFile(sh, '/etc/nginx/nginx.conf') || ''; return (d.match(/{/g) || []).length === (d.match(/}/g) || []).length; }

const VSC_NGINX = conf => ['user www-data;', 'worker_processes auto;', 'pid /run/nginx.pid;', '', 'events {', '    worker_connections 768;', '}', '', 'http {', '    sendfile on;', ...conf, '}'].join('\n') + '\n';

/* ======================================================================
   BASH
   ====================================================================== */
addVariants('b1', [
  { title: 'Dizin var mı',
    story: "TAC case'i için ION cihazından log çekeceksin. Script önce hedef dizinin varlığını kontrol etmeli, yoksa log'lar boşluğa yazılır. Dosya için `-f`, dizin için `-d` testi kullanılır.",
    task: "Tek satırda if ile /srv/ion-logs dizini varsa `hazir`, yoksa `eksik` yazdır.",
    hint: "`[ -d yol ]` yol var ve bir dizinse 0 döner, `-f` burada işe yaramaz çünkü dizin normal dosya değildir. `then`, `else` ve `fi` öncesine `;` koy. Köşeli parantezlerin iç kenarındaki boşluklar zorunlu, `[-d` yazarsan bash bunu komut adı sanar.",
    solution: 'if [ -d /srv/ion-logs ]; then echo hazir; else echo eksik; fi',
    setup: sh => { vscRm(sh, '/srv/ion-logs'); },
    check: (sh, c) => vscRan(c, /^if\s+\[\s*-d\b/) && vscRan(c, /\bthen\b/) && vscRan(c, /\bfi\b/) && c.out.trim() === 'eksik' },
  { title: 'Boş mu dolu mu',
    story: "Branch router'ı WAN hatalarını /var/log/branch/wan.err dosyasına yazıyor. Dosya boşsa hat temiz, içinde satır varsa alarm üretmek gerekiyor. `-s` testi dosya var ve boyutu sıfırdan büyükse doğru döner.",
    task: "Tek satırda if ile /var/log/branch/wan.err boş değilse `alarm`, boşsa `temiz` yazdır.",
    hint: "`[ -s dosya ]` dosya var ve en az bir bayt içeriyorsa 0 döner, sadece varlığa bakan `-e` boş dosyada da doğru olurdu. Tek satırlık if içinde `then`, `else`, `fi` öncesine `;` koymayı unutma. Önce `cat` ile dosyaya bakarsan çıktının neden öyle geldiğini görürsün.",
    solution: 'if [ -s /var/log/branch/wan.err ]; then echo alarm; else echo temiz; fi',
    setup: sh => { vscPut(sh, '/var/log/branch/wan.err', 'Oct 13 10:02:11 ist-br-07 wan1 link flap, carrier lost\n'); },
    check: (sh, c) => vscRan(c, /^if\s+\[\s*-s\b/) && vscRan(c, /\bfi\b/) && c.out.trim() === 'alarm' },
], { hint: "`if` bir komutun exit code'una bakar, `[ ]` aslında `test` komutudur ve `-f` dosya var ve normal dosyaysa 0 döner. Tek satırda yazarken `then`, `else` ve `fi` öncesinde `;` gerekir. En sık hata köşeli parantezin iç kenarındaki boşluğu unutmak, `[-f` yazarsan bash bunu komut adı sanar." });

addVariants('b2', [
  { title: "Log'ları say",
    story: "SD-WAN edge cihazından çekilen log'lar /var/log/edge-pull altında. TAC mühendisi her dosyanın kaç satır olduğunu soruyor, hangisinin şiştiğini görmek istiyor.",
    task: "/var/log/edge-pull altındaki her .log dosyası için `dosya: N satır` yazdır. N için wc -l kullan.",
    hint: "`for f in /var/log/edge-pull/*.log` glob'u dosya listesine açar, her turda `$f` tam yol olur. `wc -l < $f` dosyayı stdin'den okuttuğu için sadece sayıyı basar, dosya adını tekrar yazmaz. Sayıyı echo içine `$( )` ile gömersin.",
    solution: 'for f in /var/log/edge-pull/*.log; do echo "$f: $(wc -l < $f) satır"; done',
    setup: sh => {
      vscPut(sh, '/var/log/edge-pull/wan1.log', 'Oct 13 09:00:01 wan1 up\nOct 13 09:10:44 wan1 jitter 38ms\nOct 13 09:12:02 wan1 loss 4%\nOct 13 09:12:30 wan1 down\nOct 13 09:13:05 wan1 up\n');
      vscPut(sh, '/var/log/edge-pull/lte.log', 'Oct 13 09:12:31 lte failover active\nOct 13 09:13:06 lte standby\nOct 13 09:20:00 lte signal -97dBm\n');
    },
    check: (sh, c) => vscRan(c, /^for\s+\w+\s+in/) && /wan1\.log:\s*5\b/.test(c.out) && /lte\.log:\s*3\b/.test(c.out) },
  { title: "Config'leri say",
    story: "Her branch'in router config'i ~/branch-configs altında .cfg dosyası olarak duruyor. Change öncesi hangi config'in daha uzun olduğunu hızlıca görmek istiyorsun.",
    task: "~/branch-configs içindeki her .cfg dosyası için `dosya: N satır` yazdır. N için wc -l kullan.",
    hint: "`for` ile `~/branch-configs/*.cfg` glob'unu dönersin, her turda `$f` bir dosya. `wc -l` dosya adını argüman alırsa sayının yanına adı da yazar, `<` ile verirsen sadece sayı gelir. Glob hiç eşleşmezse bash deseni olduğu gibi bırakır, dizin adını kontrol et.",
    solution: 'for f in ~/branch-configs/*.cfg; do echo "$f: $(wc -l < $f) satır"; done',
    setup: sh => {
      vscPut(sh, VSC_H + '/branch-configs/ist-br-07.cfg', 'hostname IST-BR-07\ninterface wan1\n ip address dhcp\ninterface lan\n ip address 10.7.0.1/24\nip route 0.0.0.0/0 wan1\n');
      vscPut(sh, VSC_H + '/branch-configs/ank-br-02.cfg', 'hostname ANK-BR-02\ninterface wan1\n ip address dhcp\nip route 0.0.0.0/0 wan1\n');
    },
    check: (sh, c) => vscRan(c, /^for\s+\w+\s+in/) && /ist-br-07\.cfg:\s*6\b/.test(c.out) && /ank-br-02\.cfg:\s*4\b/.test(c.out) },
], { hint: "`for f in ~/data/*.txt` glob'u dosya listesine açar ve her turda `$f` bir dosya yolu olur. Satır sayısı için `wc -l` kullan, `< $f` ile stdin'den verirsen wc sadece sayıyı basar, dosya adını tekrar yazmaz. `$( )` komutun çıktısını echo içine gömer." });

addVariants('b3', [
  { title: 'Geri sayım',
    story: "Branch router'a planlı reboot atmadan önce ekrana beşten geriye sayan bir uyarı basmak istiyorsun, Ctrl+C ile vazgeçme şansı kalsın.",
    task: "5'ten 1'e kadar geriye sayan bir while döngüsü yaz, her satırda bir sayı.",
    hint: "`while` koşul doğru kaldıkça döner, geri sayımda `-ge 1` yani büyük ya da eşit testi işini görür. Sayacı her turda `$(( ))` ile bir azaltırsın. Azaltmayı unutursan koşul hep doğru kalır ve döngü bitmez.",
    solution: 'i=5; while [ $i -ge 1 ]; do echo $i; i=$((i-1)); done',
    check: (sh, c) => vscRan(c, /\bwhile\b/) && c.out.trim() === '5\n4\n3\n2\n1' },
  { title: 'Retry döngüsü',
    story: "Hub'a bağlanan bir API çağrısı bazen ilk denemede düşüyor. Script en fazla üç kez denemeli ve her denemeyi `deneme N` diye loglamalı.",
    task: "1'den 3'e kadar dönen bir while döngüsü yaz, her satırda `deneme N` yazsın.",
    hint: "`while [ $i -le 3 ]` sayaç üçü geçene kadar döner, `-le` küçük ya da eşit demek. echo içinde `$i` değişkenini metinle birleştirirsin, çift tırnak boşluklu metni tek argüman tutar. Sayacı `$(( ))` ile artırmayı unutma.",
    solution: 'i=1; while [ $i -le 3 ]; do echo "deneme $i"; i=$((i+1)); done',
    check: (sh, c) => vscRan(c, /\bwhile\b/) && c.out.trim() === 'deneme 1\ndeneme 2\ndeneme 3' },
], { hint: "`while` koşul 0 döndükçe döner, `[ $i -le 5 ]` küçük ya da eşit testi yapar. Sayacı `$((i+1))` ile artırırsın, `$(( ))` bash'in tamsayı aritmetiği. Sayacı artırmayı unutursan döngü sonsuza gider, lab 10000 turda keser." });

addVariants('b4', [
  { title: 'Yavaş siteler',
    story: "NOC her sabah branch'lerin hub'a olan gecikmesini ~/data/latency.txt dosyasına yazıyor, her satırda site ve milisaniye var. 100 ms üstündeki siteleri ayıklayıp ticket açacaksın.",
    task: "~/data/latency.txt dosyasını satır satır oku, gecikmesi 100'den büyük olanları `site yavas` biçiminde yazdır.",
    hint: "`while read site ms` her satırı boşluktan bölüp ilk kelimeyi site, ikincisini ms değişkenine koyar. Dosyayı `done` sonrasına `<` ile verirsin. Büyüktür için `-gt` kullan, `>` yazarsan bash bunu yönlendirme sanar ve 100 adında dosya açar.",
    solution: 'while read site ms; do [ $ms -gt 100 ] && echo "$site yavas"; done < ~/data/latency.txt',
    setup: sh => { vscPut(sh, VSC_H + '/data/latency.txt', 'ist-br-07 45\nank-br-02 180\nizm-br-11 95\nams-hub 12\nfra-hub 230\nber-br-03 101\n'); },
    check: (sh, c) => vscRan(c, /\bread\b/) && c.out.trim() === 'ank-br-02 yavas\nfra-hub yavas\nber-br-03 yavas' },
  { title: 'Dolan diskler',
    story: "Monitoring ajanı her mount noktasının doluluk yüzdesini ~/data/disk.txt dosyasına döküyor. Yüzde 80 ve üstü olanlar için uyarı üreteceksin.",
    task: "~/data/disk.txt dosyasını satır satır oku, doluluğu 80 ve üstü olanları `mount dolu` biçiminde yazdır.",
    hint: "`read mp pct` satırın iki alanını iki değişkene ayırır, dosya `done < dosya` ile döngünün stdin'i olur. Büyük ya da eşit için `-ge`, sınırdaki 80 de dahil olsun diye `-gt` değil. `&&` ile yazılan kısa if test başarısızsa echo'yu atlar.",
    solution: 'while read mp pct; do [ $pct -ge 80 ] && echo "$mp dolu"; done < ~/data/disk.txt',
    setup: sh => { vscPut(sh, VSC_H + '/data/disk.txt', '/ 82\n/data 13\n/var 91\n/home 45\n/boot 80\n'); },
    check: (sh, c) => vscRan(c, /\bread\b/) && c.out.trim() === '/ dolu\n/var dolu\n/boot dolu' },
], { hint: "`while read name score` her satırı boşluktan bölüp ilk kelimeyi name, kalanını score değişkenine koyar. Dosyayı `done` sonrasına `<` ile verirsin, böylece döngünün stdin'i dosya olur. `[ $score -ge 90 ] && echo` kısa bir if, test başarılıysa echo çalışır." });

addVariants('b5', [
  { title: 'Port sınıflandır',
    story: "Firewall log'undan gelen hedef portu insan diline çevirecek küçük bir case yazıyorsun. Script ileride bir döngünün içine girecek.",
    task: "PORT=443 değişkeni için case yaz. 22 ise `ssh`, 80 ise `http`, 443 ise `https`, başka bir şeyse `bilinmiyor` yazdırsın.",
    hint: "`case $PORT in` değeri sırayla kalıplarla karşılaştırır, her kalıp `)` ile biter ve dal `;;` ile kapanır. `*)` default dal, en sona koy, yoksa ondan sonraki kalıplara hiç sıra gelmez. Blok `esac` ile kapanır.",
    solution: 'PORT=443; case $PORT in 22) echo ssh;; 80) echo http;; 443) echo https;; *) echo bilinmiyor;; esac',
    check: (sh, c) => vscRan(c, /\bcase\b/) && vscRan(c, /\besac\b/) && c.out.trim() === 'https' },
  { title: 'Link rolü',
    story: "Branch'te üç uplink var. wan ve mpls primary, lte ise yedek. Hangi linkin aktif olduğuna göre farklı bir QoS profili basacaksın.",
    task: "LINK=lte değişkeni için case yaz. wan ya da mpls ise `primary`, lte ise `backup`, başka bir şeyse `down` yazdırsın.",
    hint: "case kalıbında `|` veya demek, iki değeri tek dalda toplar. Her dal `;;` ile biter, `*)` hiçbir kalıp tutmazsa çalışır. case ilk eşleşen dalı çalıştırıp çıkar, aşağıdaki dallara düşmez.",
    solution: 'LINK=lte; case $LINK in wan|mpls) echo primary;; lte) echo backup;; *) echo down;; esac',
    check: (sh, c) => vscRan(c, /\bcase\b/) && vscRan(c, /\|/) && c.out.trim() === 'backup' },
], { hint: "`case $SVC in` değişkeni sırayla kalıplarla karşılaştırır, her kalıp `)` ile biter ve dal `;;` ile kapanır. `*)` hiçbir kalıp tutmazsa çalışan default dal, en sona koyulur. Blok `esac` ile biter, case'in tersten yazılışı." });

addVariants('b6', [
  { title: 'Alarm fonksiyonu',
    story: "Monitoring script'lerinde aynı alarm satırını her yerde elle yazıyorsun. Bunu bir fonksiyona alıp link adını argüman olarak vereceksin.",
    task: 'alarm adında, verilen link adını `ALARM: link down` biçiminde yazdıran bir fonksiyon tanımla ve alarm wan1 ile çağır.',
    hint: "Fonksiyon `isim() { komutlar; }` biçiminde tanımlanır, süslü parantezin iç kenarlarında boşluk ve kapanıştan önce `;` şart. Çağırırken verdiğin ilk kelime içeride `$1` olur. echo metnini çift tırnağa al ki `$1` açılsın, tek tırnak değişkeni olduğu gibi basar.",
    solution: 'alarm() { echo "ALARM: $1 down"; }; alarm wan1',
    check: (sh, c) => !!sh.funcs.alarm && c.out.includes('ALARM: wan1 down') },
  { title: 'İki argümanlı fonksiyon',
    story: "Tunnel kurulumunu loglayan bir yardımcı fonksiyon istiyorsun. Site adı ve hub adı iki ayrı argüman olarak gelecek.",
    task: 'tunnel adında, iki argüman alıp `tunnel site hub up` yazdıran bir fonksiyon tanımla ve tunnel ist-br-07 ams-hub ile çağır.',
    hint: "Fonksiyon içinde ilk argüman `$1`, ikincisi `$2`, toplam sayı `$#`. Tanımı ve çağrıyı aynı satırda `;` ile ayırabilirsin. Argümanları boşlukla ayırırsın, virgül koyarsan virgül de değerin parçası olur.",
    solution: 'tunnel() { echo "tunnel $1 $2 up"; }; tunnel ist-br-07 ams-hub',
    check: (sh, c) => !!sh.funcs.tunnel && c.out.includes('tunnel ist-br-07 ams-hub up') },
], { hint: "Fonksiyon `isim() { komutlar; }` biçiminde tanımlanır, süslü parantezlerin içinde boşluk ve kapanıştan önce `;` şart. Fonksiyona verilen argümanlar içeride `$1`, `$2` olarak gelir. Tanım ile çağrıyı aynı satırda `;` ile ayırabilirsin." });

addVariants('b7', [
  { title: 'OOM var mı',
    story: "Gece bir process ölmüş. Syslog'da Out of memory kaydı varsa kernel öldürmüştür. grep bulursa 0, bulamazsa 1 döner, script bu exit code'a göre karar verecek.",
    task: "grep ile /var/log/syslog içinde `Out of memory` ara, çıktısını /dev/null'a at. Ardından exit code 0 ise `oom var` yazdır. Tek satırda, if ile.",
    hint: "`grep` eşleşme bulursa 0, bulamazsa 1 döner, `$?` bu değeri bir sonraki komuta taşır. Çıktıyı `> /dev/null` ile atarsın, sadece exit code ile ilgileniyorsun. Arada başka komut çalıştırırsan `$?` onun sonucuna döner, kontrolü hemen arkasından yap.",
    solution: 'grep "Out of memory" /var/log/syslog > /dev/null; if [ $? -eq 0 ]; then echo "oom var"; fi',
    check: (sh, c) => vscRan(c, /\$\?/) && vscRan(c, /grep/) && c.out.includes('oom var') },
  { title: 'Hub erişimi',
    story: "IST-BR-07 overlay üzerinden hub'ın tunnel IP'si 10.99.7.1 adresine ulaşamıyor gibi. Script bunu ping'in exit code'u ile anlamalı.",
    task: "ping -c 1 10.99.7.1 çalıştır, ardından exit code 0 değilse `hub unreachable` yazdır. Tek satırda, if ile.",
    hint: "`ping -c 1` tek paket gönderir, cevap gelmezse 1 döner. `$?` son komutun exit code'u, `[ $? -ne 0 ]` sıfır değilse doğru olur. -c vermezsen gerçek Linux'ta ping durmaz ve script orada takılır.",
    solution: 'ping -c 1 10.99.7.1; if [ $? -ne 0 ]; then echo "hub unreachable"; fi',
    check: (sh, c) => vscRan(c, /\$\?/) && vscRan(c, /10\.99\.7\.1/) && c.out.includes('hub unreachable') },
], { hint: "`$?` hemen önceki komutun exit code'unu tutar, 0 başarı, 0 dışı hata. ping cevap alamazsa 1 döner, bu yüzden `[ $? -ne 0 ]` ile kontrol edersin. Araya başka komut koyarsan `$?` onun sonucunu verir, kontrolü hemen arkasından yap." });

addVariants('b8', [
  { title: 'Disk alarm script',
    story: "Monitoring ajanı branch sunucusunda çalışmıyor, geçici bir çözüm lazım. ~/data/usage.txt her mount noktası için doluluk yüzdesini tutuyor. Eşik değeri argüman olarak verilecek, eşiği aşanlar için ALERT basılacak.",
    task: "nano ile ~/scripts/diskalert.sh yaz. İlk argüman eşik olsun. ~/data/usage.txt dosyasını satır satır okusun, eşik ve üstü için `ALERT mount yuzde%`, altı için `OK mount` yazsın. Sonra bash ~/scripts/diskalert.sh 80 ile çalıştır.",
    hint: "Script içinde `$1` ilk argüman, okunurluk için `limit=$1` gibi bir değişkene al. `while read mp pct; do ... done < dosya` her satırı iki alana böler, `if [ $pct -ge $limit ]` eşik kontrolü yapar. Script'i argümansız çalıştırırsan limit boş kalır ve test hata verir.",
    solution: 'nano ~/scripts/diskalert.sh\nbash ~/scripts/diskalert.sh 80',
    setup: sh => { vscMkdirp(sh, VSC_H + '/scripts'); vscPut(sh, VSC_H + '/data/usage.txt', '/ 82\n/data 13\n/var 91\n'); },
    editorContent: '#!/bin/bash\nlimit=$1\nwhile read mp pct; do\n  if [ $pct -ge $limit ]; then\n    echo "ALERT $mp $pct%"\n  else\n    echo "OK $mp"\n  fi\ndone < ~/data/usage.txt\n',
    check: (sh, c) => vscRe(sh, VSC_H + '/scripts/diskalert.sh', /while\b[\s\S]*if\b/) && c.out.includes('ALERT / 82%') && c.out.includes('OK /data') && c.out.includes('ALERT /var 91%') },
  { title: 'Servis kontrol script',
    story: "Branch sunucusunda sdwan-agent servisi ara ara düşüyor. Verilen servis adlarını tek tek kontrol eden ve sonucu raporlayan bir script yazacaksın.",
    task: "nano ile ~/scripts/svccheck.sh yaz. Her argüman için systemctl is-active çalışsın, aktifse `servis RUNNING`, değilse `servis STOPPED` yazsın. Sonra bash ~/scripts/svccheck.sh cron sdwan-agent ile çalıştır.",
    hint: "`for s in \"$@\"` her argümanı sırayla gezer. `systemctl is-active` servis aktifse 0, değilse sıfır dışı döner, bu yüzden doğrudan `if` koşulu olarak kullanılır. Çıktısını `> /dev/null` ile gizle, yoksa raporun arasına active ve failed satırları karışır.",
    solution: 'nano ~/scripts/svccheck.sh\nbash ~/scripts/svccheck.sh cron sdwan-agent',
    setup: sh => { vscMkdirp(sh, VSC_H + '/scripts'); sh.services['sdwan-agent'] = 'failed'; sh.services.cron = 'active'; },
    editorContent: '#!/bin/bash\nfor s in "$@"; do\n  if systemctl is-active $s > /dev/null; then\n    echo "$s RUNNING"\n  else\n    echo "$s STOPPED"\n  fi\ndone\n',
    check: (sh, c) => vscRe(sh, VSC_H + '/scripts/svccheck.sh', /for\b[\s\S]*if\b/) && c.out.includes('cron RUNNING') && c.out.includes('sdwan-agent STOPPED') },
], { hint: "`for h in \"$@\"` script'e verilen her argümanı ayrı ayrı gezer, tırnak içindeki `$@` boşluklu argümanları bölmez. `if ping -c 1 $h > /dev/null` doğrudan ping'in exit code'una bakar, `-c 1` tek paket, `> /dev/null` ping çıktısını gizler. Script'i nano ile kaydettikten sonra `bash` ile argümanlarla çalıştır." });

addVariants('b9', [
  { title: 'Log rotate',
    story: "Uygulama kendi log'unu döndürmüyor ve ~/lab/rotate altındaki .log dosyaları büyüyor. logrotate kurulana kadar basit bir rotate script'i yazacaksın. Her .log dosyası .log.1 olacak, yerine boş bir log açılacak.",
    task: "nano ile ~/scripts/rotate.sh yaz. ~/lab/rotate içindeki her .log dosyasını .log.1 olarak taşısın, yerine boş .log oluştursun ve sonunda `N log döndürüldü` yazsın. Çalıştır.",
    hint: "`for f in ~/lab/rotate/*.log` sadece .log uzantılıları gezer, diğer dosyalara dokunmaz. `mv \"$f\" \"$f.1\"` dosyayı taşır, ardından `touch \"$f\"` aynı adla boş dosya açar. Sayaç için `n=$((n+1))`, döngüden sonra echo ile toplamı yaz.",
    solution: 'nano ~/scripts/rotate.sh\nbash ~/scripts/rotate.sh',
    setup: sh => {
      vscRm(sh, VSC_H + '/lab/rotate'); vscMkdirp(sh, VSC_H + '/scripts');
      vscPut(sh, VSC_H + '/lab/rotate/nginx.log', '10.7.0.21 GET /portal 200\n10.7.0.22 GET /portal 200\n');
      vscPut(sh, VSC_H + '/lab/rotate/agent.log', 'sdwan-agent heartbeat ok\nsdwan-agent heartbeat ok\n');
      vscPut(sh, VSC_H + '/lab/rotate/notes.txt', 'bu dosya log degil, dokunma\n');
    },
    editorContent: '#!/bin/bash\nn=0\nfor f in ~/lab/rotate/*.log; do\n  mv "$f" "$f.1"\n  touch "$f"\n  n=$((n+1))\ndone\necho "$n log döndürüldü"\n',
    check: (sh, c) => { const R = VSC_H + '/lab/rotate/'; return vscHas(sh, R + 'nginx.log.1', 'portal') && vscFile(sh, R + 'nginx.log') === '' && vscHas(sh, R + 'agent.log.1', 'heartbeat') && vscEx(sh, R + 'notes.txt') && !vscEx(sh, R + 'notes.txt.1') && /2 log döndürüldü/.test(c.out); } },
  { title: 'Incident toplayıcı',
    story: "TAC senden hata içeren log'ları istiyor. ~/lab/applogs altında birkaç log var, sadece içinde ERROR geçenler ~/lab/incident altına kopyalanacak.",
    task: "nano ile ~/scripts/collect.sh yaz. ~/lab/incident dizinini açsın, ~/lab/applogs içindeki ERROR geçen her dosyayı oraya kopyalasın ve sonunda `N dosya kopyalandı` yazsın. Çalıştır.",
    hint: "`if grep ERROR \"$f\" > /dev/null` grep'in exit code'unu koşul yapar, eşleşme varsa 0 döner. Çıktıyı /dev/null'a atmazsan eşleşen satırlar ekrana dökülür. Hedef dizini döngüden önce `mkdir -p` ile aç, -p dizin zaten varsa hata vermez.",
    solution: 'nano ~/scripts/collect.sh\nbash ~/scripts/collect.sh',
    setup: sh => {
      vscRm(sh, VSC_H + '/lab/applogs'); vscRm(sh, VSC_H + '/lab/incident'); vscMkdirp(sh, VSC_H + '/scripts');
      vscPut(sh, VSC_H + '/lab/applogs/api.log', 'INFO start\nERROR upstream timeout 10.99.7.1\nINFO retry ok\n');
      vscPut(sh, VSC_H + '/lab/applogs/auth.log', 'INFO login burak\nINFO login deploy\n');
      vscPut(sh, VSC_H + '/lab/applogs/sync.log', 'INFO sync start\nERROR checksum mismatch site ank-br-02\n');
    },
    editorContent: '#!/bin/bash\nmkdir -p ~/lab/incident\nn=0\nfor f in ~/lab/applogs/*.log; do\n  if grep ERROR "$f" > /dev/null; then\n    cp "$f" ~/lab/incident/\n    n=$((n+1))\n  fi\ndone\necho "$n dosya kopyalandı"\n',
    check: (sh, c) => { const I = VSC_H + '/lab/incident/'; return vscEx(sh, I + 'api.log') && vscEx(sh, I + 'sync.log') && !vscEx(sh, I + 'auth.log') && /2 dosya kopyalandı/.test(c.out); } },
], { hint: "`[ ! -s \"$f\" ]` dosya boşsa doğru olur, `-s` boyutu sıfırdan büyük demek ve `!` tersler. Sayaç için `n=$((n+1))` kullan, döngü bitince `echo` ile toplamı yaz. `$f` değişkenini tırnağa al, boşluklu dosya adında rm yanlış dosyaları hedefler." });

addVariants('b10', [
  { title: 'Her 15 dakikada',
    story: "WAN kontrol script'in hazır, artık her çeyrek saatte bir kendiliğinden çalışmalı. Cron'da adım değeri için `*/N` yazılır.",
    task: "crontab -e ile her 15 dakikada bir bash ~/scripts/wan-check.sh çalıştıran bir satır ekle, sonra crontab -l ile doğrula.",
    hint: "Cron satırı dakika, saat, ayın günü, ay, haftanın günü sırasıyla beş alan ve komuttan oluşur. Dakika alanına `*/15` yazmak 0, 15, 30 ve 45. dakikalar demek. Saat alanına yazarsan her 15 saatte bir çalışır, alanların sırasına dikkat.",
    solution: 'crontab -e\ncrontab -l',
    setup: sh => { if (!vscEx(sh, VSC_H + '/scripts/wan-check.sh')) vscPut(sh, VSC_H + '/scripts/wan-check.sh', 'mkdir -p ~/lab\nping -c 1 10.99.7.1 > /dev/null || echo "hub 10.99.7.1 down" >> ~/lab/wan-alerts.log\n'); },
    editorContent: old => old + '*/15 * * * * bash ~/scripts/wan-check.sh\n',
    check: (sh, c) => /^\s*\*\/15\s+\*\s+\*\s+\*\s+\*\s+.*wan-check\.sh/m.test(sh.crontab) && vscRan(c, /crontab\s+-l/) },
  { title: 'Hafta içi akşam',
    story: "Log rotate script'i sadece hafta içi mesai bitiminde, 18.45'te çalışmalı. Haftanın günü alanında 1 pazartesi, 5 cuma demek.",
    task: "crontab -e ile pazartesiden cumaya her gün 18.45'te bash ~/scripts/logrotate.sh çalıştıran bir satır ekle, sonra crontab -l ile doğrula.",
    hint: "İlk alan dakika, ikinci saat, beşinci haftanın günü. Gün aralığı `1-5` biçiminde yazılır, 0 ve 7 pazar demek. Saati yazarken 18.45'i ters çevirip dakika alanına 18 yazmak klasik hata.",
    solution: 'crontab -e\ncrontab -l',
    setup: sh => { if (!vscEx(sh, VSC_H + '/scripts/logrotate.sh')) vscPut(sh, VSC_H + '/scripts/logrotate.sh', 'mv ~/lab/app.log ~/lab/app.log.1\ntouch ~/lab/app.log\n'); },
    editorContent: old => old + '45 18 * * 1-5 bash ~/scripts/logrotate.sh\n',
    check: (sh, c) => /^\s*45\s+18\s+\*\s+\*\s+1-5\s+.*logrotate\.sh/m.test(sh.crontab) && vscRan(c, /crontab\s+-l/) },
], { hint: "Cron satırı beş zaman alanıyla başlar, dakika, saat, ayın günü, ay ve haftanın günü, sonra komut gelir. 02.30 için dakika alanına 30, saat alanına 2 yazılır. `crontab -e` editörü açar, `crontab -l` kaydedilen satırı gösterir." });

addVariants('b11', [
  { title: 'WAN check tetikle',
    story: "WAN kontrol satırı crontab'da. Çeyrek saati beklemek yerine cron-tick ile tetikleyip syslog'da kaydını ve script'in yazdığı alarm dosyasını göreceksin.",
    task: "cron-tick çalıştır, sonra syslog'da wan-check geçen CRON satırını grep ile bul.",
    hint: "`cron-tick` crontab'daki her satırı bir kez çalıştırır ve syslog'a CRON etiketiyle kayıt düşer. `grep` ile script adını ararsan sadece o işin satırlarını görürsün. Sonra ~/lab/wan-alerts.log dosyasına bakıp script'in gerçekten çalıştığını doğrula.",
    solution: 'cron-tick\ngrep wan-check /var/log/syslog',
    setup: sh => {
      if (!/wan-check\.sh/.test(sh.crontab)) sh.crontab += '*/15 * * * * bash ~/scripts/wan-check.sh\n';
      vscPut(sh, VSC_H + '/scripts/wan-check.sh', 'mkdir -p ~/lab\nping -c 1 10.99.7.1 > /dev/null || echo "hub 10.99.7.1 down" >> ~/lab/wan-alerts.log\n');
      vscRm(sh, VSC_H + '/lab/wan-alerts.log');
    },
    check: (sh, c) => (sh.cronLog || []).some(x => /wan-check\.sh/.test(x.cmd)) && vscRan(c, /grep/) && /CRON/.test(c.out) && /wan-check/.test(c.out) && vscHas(sh, VSC_H + '/lab/wan-alerts.log', 'hub 10.99.7.1 down') },
  { title: 'Rotate tetikle',
    story: "Log rotate satırı crontab'da ama akşamı beklemek istemiyorsun. cron-tick ile çalıştırıp syslog kaydına ve ~/lab altındaki app.log.1 dosyasına bakacaksın.",
    task: "cron-tick çalıştır, sonra syslog'un CRON satırlarından sonuncusunu grep ve tail ile göster.",
    hint: "`cron-tick` bir cron dakikasını simüle eder. `grep CRON` ile süzdüğün satırları `|` ile `tail -1`'e verirsen en yeni kaydı görürsün. Kayıt varsa ama app.log.1 yoksa sorun script'in içindedir, cron değil.",
    solution: 'cron-tick\ngrep CRON /var/log/syslog | tail -1',
    setup: sh => {
      if (!/logrotate\.sh/.test(sh.crontab)) sh.crontab += '45 18 * * 1-5 bash ~/scripts/logrotate.sh\n';
      vscPut(sh, VSC_H + '/scripts/logrotate.sh', 'mv ~/lab/app.log ~/lab/app.log.1\ntouch ~/lab/app.log\n');
      vscPut(sh, VSC_H + '/lab/app.log', 'portal login ok\nportal login failed\n');
      vscRm(sh, VSC_H + '/lab/app.log.1');
    },
    check: (sh, c) => (sh.cronLog || []).some(x => /logrotate\.sh/.test(x.cmd)) && vscRan(c, /grep/) && /CRON/.test(c.out) && vscHas(sh, VSC_H + '/lab/app.log.1', 'portal login') },
], { hint: "`cron-tick` lab'da bir cron dakikasını simüle eder ve crontab'daki her satırı bir kez çalıştırır. Gerçek cron her çalıştırmayı syslog'a CRON etiketiyle yazar, `grep CRON /var/log/syslog` ile süzersin. `tail` ile son satırlara bakmak en yeni kaydı gösterir." });

addVariants('b12', [
  { title: 'Restart script',
    story: "Ekipten biri restart script'ini argümansız çalıştırınca script boş servis adıyla systemctl çağırdı. Tam olarak bir argüman yoksa kullanım bilgisi verip çıkmalı.",
    task: "nano ile ~/scripts/restart.sh yaz. Argüman sayısı 1 değilse `usage: restart.sh <service>` yazıp exit 1 ile çıksın, doğruysa `restarting $1` yazsın. Önce argümansız, sonra nginx argümanıyla çalıştır.",
    hint: "`$#` argüman sayısıdır, `[ $# -ne 1 ]` tam olarak bir değilse doğru olur, fazla argümanı da yakalar. Kullanım mesajından sonra `exit 1` yaz ki script devam etmesin. Sıfır dışı exit code çağıran script'e hata olduğunu söyler.",
    solution: 'nano ~/scripts/restart.sh\nbash ~/scripts/restart.sh\nbash ~/scripts/restart.sh nginx',
    setup: sh => { vscMkdirp(sh, VSC_H + '/scripts'); },
    editorContent: '#!/bin/bash\nif [ $# -ne 1 ]; then\n  echo "usage: restart.sh <service>"\n  exit 1\nfi\necho "restarting $1"\n',
    check: (sh, c) => vscRe(sh, VSC_H + '/scripts/restart.sh', /\$#/) && c.out.includes('restarting nginx') && vscHist(sh, /restart\.sh\s*$/) },
  { title: 'İki argüman şart',
    story: "Tunnel script'i site ve hub adını ister. Tek argümanla çağrılırsa yarım bir config üretiyor, bunu engelleyeceksin.",
    task: "nano ile ~/scripts/tunnel.sh yaz. Argüman sayısı 2'den azsa `usage: tunnel.sh <site> <hub>` yazıp exit 1 ile çıksın, yeterliyse `tunnel $1 $2 kuruluyor` yazsın. Önce sadece ist-br-07 ile, sonra ist-br-07 ams-hub ile çalıştır.",
    hint: "`[ $# -lt 2 ]` argüman ikiden azsa doğru olur, `-lt` küçüktür demek. `exit 1` olmadan script usage yazdıktan sonra boş `$2` ile devam eder. Kullanım satırındaki açılı parantezleri çift tırnak içinde yaz, tırnaksız `<` yönlendirme olur.",
    solution: 'nano ~/scripts/tunnel.sh\nbash ~/scripts/tunnel.sh ist-br-07\nbash ~/scripts/tunnel.sh ist-br-07 ams-hub',
    setup: sh => { vscMkdirp(sh, VSC_H + '/scripts'); },
    editorContent: '#!/bin/bash\nif [ $# -lt 2 ]; then\n  echo "usage: tunnel.sh <site> <hub>"\n  exit 1\nfi\necho "tunnel $1 $2 kuruluyor"\n',
    check: (sh, c) => vscRe(sh, VSC_H + '/scripts/tunnel.sh', /\$#/) && c.out.includes('tunnel ist-br-07 ams-hub kuruluyor') && vscHist(sh, /tunnel\.sh\s+ist-br-07\s*$/) },
], { hint: "`$#` script'e verilen argüman sayısıdır, `[ $# -eq 0 ]` hiç argüman yoksa doğru olur. Kullanım mesajından sonra `exit 1` ile çık, sıfır dışı exit code çağırana hata olduğunu söyler. `exit` yazmazsan script devam eder ve boş `$1` ile çalışır." });

/* ======================================================================
   VIM
   ====================================================================== */
addVariants('v1', [
  { title: 'Bak ve çık',
    story: "Branch cihazının site config'ine sadece bakman gerekiyor, değiştirmek yok. Vim'de dosyayı aç, değeri oku ve hiçbir şeye dokunmadan çık.",
    task: "vim ile ~/lab/ion-site.conf dosyasını aç, kaydetmeden çık ve wan_mtu değerini submit et.",
    hint: "Vim normal modda açılır, ok tuşları ya da `j` ile satırlarda gezebilirsin. `:q!` hiçbir şey kaydetmeden çıkar, ünlem zorla demek. Çıktıktan sonra değeri `submit` ile gönder.",
    solution: 'vim ~/lab/ion-site.conf\nsubmit 1420',
    setup: sh => { vscPut(sh, VSC_H + '/lab/ion-site.conf', 'site_id=IST-BR-07\nhub=10.99.7.1\nwan_mtu=1420\nlte_backup=yes\n'); },
    vimKeys: ':q!<CR>',
    check: (sh, c) => vscVim(sh, ':q!') && vscSub(c, '1420') && vscHas(sh, VSC_H + '/lab/ion-site.conf', 'wan_mtu=1420') },
  { title: 'Kazayı geri al',
    story: "Route listesini açtın ve yanlışlıkla dd bastın, bir satır gitti. Dosyayı kaydetmeden çıkarsan diskteki hali bozulmadan kalır.",
    task: "vim ile ~/lab/routes.bak dosyasını aç, dd ile ilk satırı sil, sonra kaydetmeden çık. Dosya değişmemiş olmalı.",
    hint: "`dd` satırı sadece buffer'da siler, `:w` yazana kadar disk değişmez. Değişiklik varken `:q` yazarsan vim E37 ile çıkmayı reddeder. `:q!` buffer'ı atıp çıkar.",
    solution: 'vim ~/lab/routes.bak',
    setup: sh => { vscPut(sh, VSC_H + '/lab/routes.bak', '10.7.0.0/24 via lan\n10.99.0.0/16 via tunnel0\n0.0.0.0/0 via wan1\n'); },
    vimKeys: 'dd:q!<CR>',
    check: sh => vscFile(sh, VSC_H + '/lab/routes.bak') === '10.7.0.0/24 via lan\n10.99.0.0/16 via tunnel0\n0.0.0.0/0 via wan1\n' && vscVim(sh, 'dd', ':q!') },
], { hint: "Vim açılınca normal moddasın, `:` komut satırını açar. `:q!` değişiklikleri atıp çıkar, ünlem zorla demek. Sadece `:q` yazarsan ve dosya değiştiyse vim E37 hatasıyla çıkmayı reddeder." });

addVariants('v2', [
  { title: 'MOTD yaz',
    story: "Branch sunucusuna login olan herkes bakım notunu görsün istiyorsun. Notu vim ile ~/lab/motd.txt dosyasına yazacaksın.",
    task: "vim ile ~/lab/motd.txt dosyasını aç, `IST-BR-07 bakimda` yaz, kaydet ve çık.",
    hint: "Normal modda `i` insert moda geçirir, ekranın altında INSERT görünür. Yazdıktan sonra `Esc` ile normal moda dön, `:wq` kaydedip çıkar. Esc'ye basmadan yazdığın `:wq` metne karakter olarak girer.",
    solution: 'vim ~/lab/motd.txt',
    setup: sh => { vscMkdirp(sh, VSC_H + '/lab'); vscRm(sh, VSC_H + '/lab/motd.txt'); },
    vimKeys: 'iIST-BR-07 bakimda<Esc>:wq<CR>',
    check: sh => vscHas(sh, VSC_H + '/lab/motd.txt', 'IST-BR-07 bakimda') && vscVim(sh, 'i') },
  { title: 'Satır sonuna ekle',
    story: "Login banner'ı ~/lab/banner.txt dosyasında. Satırın sonuna NOC bilgisini eklemek istiyorsun, imleci elle sona taşımak yerine doğrudan satır sonunda insert moda geçeceksin.",
    task: "vim ile ~/lab/banner.txt dosyasını aç, A ile satır sonuna `, NOC 7x24 izliyor` ekle, kaydet ve çık.",
    hint: "`A` imleci satırın sonuna taşıyıp insert moda geçer, `I` ise satırın ilk dolu karakterine. `i` kullansaydın metin imlecin olduğu yere, satırın başına girerdi. Bitince Esc ve `:wq`.",
    solution: 'vim ~/lab/banner.txt',
    setup: sh => { vscPut(sh, VSC_H + '/lab/banner.txt', 'Yetkisiz erisim yasaktir\n'); },
    vimKeys: 'A, NOC 7x24 izliyor<Esc>:wq<CR>',
    check: sh => vscFile(sh, VSC_H + '/lab/banner.txt') === 'Yetkisiz erisim yasaktir, NOC 7x24 izliyor\n' && vscVim(sh, 'A') },
], { hint: "Normal modda `i` imlecin olduğu yerde insert moda geçirir, artık yazdığın her harf metne girer. `Esc` ile normal moda dönersin, sonra `:wq` yazar ve çıkar. Esc'yi unutup `:wq` yazarsan bu karakterler dosyaya metin olarak girer." });

addVariants('v3', [
  { title: 'Test kuralını sil',
    story: "~/lab/acl.txt dosyasında geçen haftaki testten kalmış bir deny kuralı var, üçüncü satır. Onu silip diğer kurallara dokunmayacaksın.",
    task: "~/lab/acl.txt dosyasında üçüncü satırı dd ile sil ve kaydet.",
    hint: "`j` her basışta bir satır aşağı iner, üçüncü satır için iki kez bas ya da `2j` yaz. `dd` bulunduğun satırı siler. Yanlış satırı sildiysen `u` geri alır.",
    solution: 'vim ~/lab/acl.txt',
    setup: sh => { vscPut(sh, VSC_H + '/lab/acl.txt', 'allow 10.10.0.0/16\nallow 172.16.0.0/12\ndeny 0.0.0.0/0 temp-test\nallow 192.168.0.0/16\n'); },
    vimKeys: 'jjdd:wq<CR>',
    check: sh => vscFile(sh, VSC_H + '/lab/acl.txt') === 'allow 10.10.0.0/16\nallow 172.16.0.0/12\nallow 192.168.0.0/16\n' && vscVim(sh, 'dd') },
  { title: 'Eski peer',
    story: "~/lab/peers.txt dosyasının ilk satırında artık kapatılmış eski bir BGP peer duruyor. Vim dosyayı açtığında imleç zaten ilk satırda.",
    task: "~/lab/peers.txt dosyasının ilk satırını dd ile sil ve kaydet.",
    hint: "Vim açılınca imleç ilk satırdadır, hareket etmeden `dd` o satırı siler. Emin olmak için önce `gg` ile başa gidebilirsin. Sonra `:wq` ile kaydet.",
    solution: 'vim ~/lab/peers.txt',
    setup: sh => { vscPut(sh, VSC_H + '/lab/peers.txt', '203.0.113.45 old-peer\n10.50.0.40 backup\n10.50.0.41 web01\n'); },
    vimKeys: 'dd:wq<CR>',
    check: sh => vscFile(sh, VSC_H + '/lab/peers.txt') === '10.50.0.40 backup\n10.50.0.41 web01\n' && vscVim(sh, 'dd') },
], { hint: "`j` bir satır aşağı, `k` bir satır yukarı iner. `dd` imlecin bulunduğu satırı keser ve register'a alır, istersen `p` ile geri yapıştırırsın. Sayı ön eki de çalışır, `3dd` üç satır siler." });

addVariants('v4', [
  { title: 'IP listesine ekle',
    story: "Yeni web sunucusu 10.50.0.42 adresiyle devreye girdi, ~/lab/allowed_ips.txt dosyasının sonuna eklenmesi gerekiyor.",
    task: "~/lab/allowed_ips.txt dosyasının sonuna `10.50.0.42` satırı ekle ve kaydet.",
    hint: "`G` son satıra atlar, `o` altına yeni satır açıp insert moda geçer. Sadece `i` ile yazarsan metin son satırın başına yapışır. Bitince Esc ve `:wq`.",
    solution: 'vim ~/lab/allowed_ips.txt',
    setup: sh => { vscPut(sh, VSC_H + '/lab/allowed_ips.txt', '10.50.0.40\n10.50.0.41\n'); },
    vimKeys: 'Go10.50.0.42<Esc>:wq<CR>',
    check: sh => vscFile(sh, VSC_H + '/lab/allowed_ips.txt') === '10.50.0.40\n10.50.0.41\n10.50.0.42\n' && vscVim(sh, 'o') },
  { title: 'hosts kaydı',
    story: "DNS kaydı henüz yayılmadı, web02.lab adresini geçici olarak /etc/hosts dosyasına ekleyeceksin. Dosya root'a ait.",
    task: "sudo vim ile /etc/hosts dosyasının sonuna `10.50.0.42 web02.lab` satırını ekle ve kaydet.",
    hint: "Root'a ait dosyayı `sudo vim` ile açmazsan `:wq` readonly hatası verir. `G` son satıra gider, `o` altına satır açıp insert moda geçer. Satırda önce IP sonra hostname gelir, sıra ters olursa çözümleme çalışmaz.",
    solution: 'sudo vim /etc/hosts',
    vimKeys: 'Go10.50.0.42 web02.lab<Esc>:wq<CR>',
    check: sh => vscRe(sh, '/etc/hosts', /10\.50\.0\.42\s+web02\.lab\n$/) && vscVim(sh, 'G', 'o') },
], { hint: "`G` dosyanın son satırına atlar, `gg` başa döner. `o` bulunduğun satırın altına boş satır açar ve doğrudan insert moda geçer, `O` üstüne açar. Yazdıktan sonra Esc ve `:wq`." });

addVariants('v5', [
  { title: "Hub taşıma",
    story: "Amsterdam hub'ı bakıma giriyor, tüm tunnel'lar Frankfurt hub'ına taşınacak. ~/lab/tunnels.txt içinde her ams-hub geçen yer fra-hub olmalı.",
    task: "~/lab/tunnels.txt içindeki tüm `ams-hub` ifadelerini `fra-hub` yap ve kaydet.",
    hint: "`:%s/eski/yeni/g` komutunda `%` tüm satırlar, sondaki `g` satırdaki her eşleşme demek. % olmadan sadece imlecin olduğu satır değişir. Sonucu görmek için kaydetmeden önce `gg` ile dosyayı gözden geçir.",
    solution: 'vim ~/lab/tunnels.txt',
    setup: sh => { vscPut(sh, VSC_H + '/lab/tunnels.txt', 'ist-br-07 ams-hub ipsec\nank-br-02 ams-hub ipsec\nizm-br-11 ams-hub gre\n'); },
    vimKeys: ':%s/ams-hub/fra-hub/g<CR>:wq<CR>',
    check: sh => { const d = vscFile(sh, VSC_H + '/lab/tunnels.txt'); return !!d && !d.includes('ams-hub') && d.includes('izm-br-11 fra-hub gre') && (sh.vimLog || []).some(k => k.startsWith(':%s')); } },
  { title: 'Port değiştir',
    story: "Portal uygulaması 8080'den 8443'e taşınıyor. ~/lab/app.conf içinde port üç farklı satırda geçiyor, biri aynı satırda iki kez.",
    task: "~/lab/app.conf içindeki tüm `8080` değerlerini `8443` yap ve kaydet.",
    hint: "`:%s/8080/8443/g` tüm dosyada değiştirir. Sondaki `g` olmazsa aynı satırda iki kez geçen port sadece ilk yerde değişir, ikinci kalır. Vim kaç satırda değişiklik yaptığını alt satırda söyler.",
    solution: 'vim ~/lab/app.conf',
    setup: sh => { vscPut(sh, VSC_H + '/lab/app.conf', 'listen=8080\nhealth=http://localhost:8080/health\nredirect=8080 to 8080/ssl\n'); },
    vimKeys: ':%s/8080/8443/g<CR>:wq<CR>',
    check: sh => vscFile(sh, VSC_H + '/lab/app.conf') === 'listen=8443\nhealth=http://localhost:8443/health\nredirect=8443 to 8443/ssl\n' && (sh.vimLog || []).some(k => k.startsWith(':%s')) },
], { hint: "`:%s/eski/yeni/g` komutunda `%` tüm satırlar, `g` satırdaki her eşleşme demek. g olmazsa her satırda sadece ilk eşleşme değişir. Desen bir regex, nokta her karakteri tutar, kesin eşleşme için `\\.` ile kaçırırsın." });

addVariants('v6', [
  { title: 'VLAN kopyala',
    story: "~/lab/vlans.txt dosyasında voice VLAN'ı ikinci satırda. Aynı satırın bir kopyası listenin sonunda da olmalı, ikinci switch için şablon olacak.",
    task: "~/lab/vlans.txt dosyasının ikinci satırını yy ile kopyala, G ile sona git, p ile yapıştır, kaydet.",
    hint: "`j` ile ikinci satıra in, `yy` satırı kopyalar. `G` son satıra gider, `p` kopyayı imlecin altına yapıştırır. `P` kullanırsan son satırın üstüne girer ve sıra bozulur.",
    solution: 'vim ~/lab/vlans.txt',
    setup: sh => { vscPut(sh, VSC_H + '/lab/vlans.txt', 'vlan 10 mgmt\nvlan 20 voice\nvlan 30 data\n'); },
    vimKeys: 'jyyGp:wq<CR>',
    check: sh => vscFile(sh, VSC_H + '/lab/vlans.txt') === 'vlan 10 mgmt\nvlan 20 voice\nvlan 30 data\nvlan 20 voice\n' && vscVim(sh, 'yy', 'p') },
  { title: 'Arayüz çoğalt',
    story: "~/lab/interfaces.txt dosyasına üçüncü bir LAN arayüzü ekleyeceksin. Son satırı kopyalayıp altına yapıştırmak ve sadece numaraları değiştirmek en hızlısı.",
    task: "~/lab/interfaces.txt dosyasının son satırını yy ile kopyala, p ile altına yapıştır, yapıştırdığın satırda tüm 2'leri 3 yap ve kaydet.",
    hint: "`G` son satıra gider, `yy` kopyalar, `p` altına yapıştırır ve imleç yeni satıra geçer. Yüzde işareti olmadan yazılan `:s/2/3/g` sadece bulunduğun satırda çalışır, diğer satırlar korunur. `:%s` yazarsan orijinal eth2 satırı da bozulur.",
    solution: 'vim ~/lab/interfaces.txt',
    setup: sh => { vscPut(sh, VSC_H + '/lab/interfaces.txt', 'eth1 wan 10.0.1.1\neth2 lan 10.0.2.1\n'); },
    vimKeys: 'Gyyp:s/2/3/g<CR>:wq<CR>',
    check: sh => vscFile(sh, VSC_H + '/lab/interfaces.txt') === 'eth1 wan 10.0.1.1\neth2 lan 10.0.2.1\neth3 lan 10.0.3.1\n' && vscVim(sh, 'yy', 'p') },
], { hint: "`yy` satırı kopyalar, vim buna yank der. `p` imlecin altına, `P` üstüne yapıştırır. Önce `gg` ile ilk satıra, kopyaladıktan sonra `G` ile son satıra git." });

addVariants('v7', [
  { title: 'Stajyeri çıkar',
    story: "~/lab/users.txt erişim listesinde dönemi biten stajyerin satırı duruyor. Satır numarasını bilmiyorsun, aratıp bulacaksın.",
    task: "~/lab/users.txt içinde `stajyer` geçen satırı / ile bul, dd ile sil, kaydet.",
    hint: "`/stajyer` yazıp Enter'a basınca imleç ilk eşleşmeye gider. `dd` o satırı siler. Arama büyük küçük harfe duyarlıdır, Stajyer yazarsan bulamaz.",
    solution: 'vim ~/lab/users.txt',
    setup: sh => { vscPut(sh, VSC_H + '/lab/users.txt', 'burak admin\ndeploy ci\nstajyer temp\nnoc readonly\n'); },
    vimKeys: '/stajyer<CR>dd:wq<CR>',
    check: sh => { const d = vscFile(sh, VSC_H + '/lab/users.txt'); return d === 'burak admin\ndeploy ci\nnoc readonly\n' && vscVimSearched(sh); } },
  { title: 'İkinci eşleşme',
    story: "~/lab/routes.txt içinde lte iki satırda geçiyor. İlki 172.16 ağının meşru route'u, ikincisi yanlışlıkla eklenmiş default route. Sadece ikincisi silinecek.",
    task: "~/lab/routes.txt içinde `lte` ara, n ile ikinci eşleşmeye geç, o satırı dd ile sil ve kaydet.",
    hint: "`/lte` ilk eşleşmeye götürür, `n` aynı aramayı ileri doğru tekrarlar. İlk eşleşmede `dd` basarsan meşru route gider. Silmeden önce imlecin hangi satırda olduğuna bak, yanlışsa `u` ile geri al.",
    solution: 'vim ~/lab/routes.txt',
    setup: sh => { vscPut(sh, VSC_H + '/lab/routes.txt', '10.0.0.0/8 via wan1\n172.16.0.0/12 via lte\n192.168.0.0/16 via lan\n0.0.0.0/0 via lte\n'); },
    vimKeys: '/lte<CR>ndd:wq<CR>',
    check: sh => vscFile(sh, VSC_H + '/lab/routes.txt') === '10.0.0.0/8 via wan1\n172.16.0.0/12 via lte\n192.168.0.0/16 via lan\n' && vscVimSearched(sh) },
], { hint: "`/kelime` Enter ile ileri doğru arar ve imleci ilk eşleşmeye taşır, `n` sonraki, `N` önceki eşleşmeye gider. Bulduğun satırda `dd` satırı siler. Aranan kelime birden fazla satırda geçiyorsa doğru satırda olduğundan emin ol." });

addVariants('v8', [
  { title: 'Eksik süslü parantez',
    story: "Portal sitesinin server bloğu düzenlenirken kapanış süslü parantezi silinmiş, nginx -t dosya sonunda kapanış bekliyor diyor. Eksik satırı vim ile ekleyeceksin, dosya root'a ait.",
    task: "sudo vim ile /etc/nginx/nginx.conf aç, `index index.html;` satırının altına `    }` satırını ekle, kaydet, sonra sudo nginx -t ile test et.",
    hint: "`/index index` ile satırı bul, `o` altına yeni satır açıp insert moda geçer, dört boşluk ve kapanış süslü parantezini yaz. Açılan ve kapanan süslü parantez sayısı eşit olmalı, nginx -t bunu kontrol eder. Dosyayı sudo olmadan açarsan kaydedemezsin.",
    solution: 'sudo vim /etc/nginx/nginx.conf\nsudo nginx -t',
    setup: sh => { vscPut(sh, '/etc/nginx/nginx.conf', VSC_NGINX(['    server {', '        listen 80;', '        server_name portal.ist-br-07.lab;', '        root /var/www/portal;', '        index index.html;'])); },
    vimKeys: '/index index<CR>o    }<Esc>:wq<CR>',
    check: (sh, c) => vscBraces(sh) && vscRe(sh, '/etc/nginx/nginx.conf', /index index\.html;\n\s*}\n}/) && vscRan(c, /nginx\s+-t/) },
  { title: 'Fazla süslü parantez',
    story: "Birisi config'e bir blok yapıştırırken dosyanın sonuna fazladan bir kapanış süslü parantezi bırakmış, nginx -t süslü parantezlerin dengesiz olduğunu söylüyor. Son satırı silmen yeterli.",
    task: "sudo vim ile /etc/nginx/nginx.conf aç, dosyanın son satırındaki fazla `}` satırını sil, kaydet, sonra sudo nginx -t ile test et.",
    hint: "`G` son satıra atlar, `dd` satırı siler. Silmeden önce sondan bir önceki satırın http bloğunu kapatan süslü parantez olduğuna emin ol. Kaydettikten sonra `sudo nginx -t` syntax is ok demeli.",
    solution: 'sudo vim /etc/nginx/nginx.conf\nsudo nginx -t',
    setup: sh => { vscPut(sh, '/etc/nginx/nginx.conf', VSC_NGINX(['    server {', '        listen 8080;', '        server_name api.ank-br-02.lab;', '        root /var/www/api;', '    }']) + '}\n'); },
    vimKeys: 'Gdd:wq<CR>',
    check: (sh, c) => vscBraces(sh) && vscHas(sh, '/etc/nginx/nginx.conf', 'listen 8080;') && vscRan(c, /nginx\s+-t/) },
], { hint: "Dosya root'a ait, `sudo vim` ile açmazsan kaydederken readonly hatası alırsın. `/80q` hatalı satıra götürür, `:s/80q/80/` sadece bulunduğun satırda değiştirir ya da `x` ile tek harfi silersin. Kaydettikten sonra `sudo nginx -t` config'i yükleyip sözdizimini test eder, servisi restart etmeden önce hep bunu çalıştır." });

/* ======================================================================
   USERS, 1. tur selin ve noc, 2. tur emre ve netops
   ====================================================================== */
addVariants('u1', [
  { title: 'Servis hesabı',
    story: "DB ekibi postgres hesabının hangi uid ile çalıştığını soruyor, yedek dosyalarının sahipliğini buna göre ayarlayacaklar. Servis hesapları genelde 1000 altı uid alır.",
    task: 'Kendi id bilgini, sonra postgres kullanıcısının id bilgisini göster.',
    hint: "`id kullanıcı` o hesabın uid, birincil grup ve ek gruplarını tek satırda verir. Argümansız `id` seni gösterir, karşılaştırma için önce kendine bak. 1000 altındaki uid'ler sistem ve servis hesaplarına ayrılmıştır.",
    solution: 'id\nid postgres',
    check: (sh, c) => vscRan(c, /^id\s+postgres\b/) && c.out.includes('uid=112(postgres)') },
  { title: 'Sadece uid',
    story: "Bir script www-data'nın uid değerini numara olarak istiyor, tüm satırı parse etmek yerine id'nin tek alan veren seçeneklerini kullanacaksın.",
    task: 'Önce kendi gruplarını isim olarak listele, sonra www-data kullanıcısının sadece uid numarasını göster.',
    hint: "`id -nG` grupları numara yerine isimle, `-G` tüm grupları verir. `id -u kullanıcı` sadece uid numarasını basar, script'te değişkene almak için ideal. -n olmadan -G numara listesi döner.",
    solution: 'id -nG\nid -u www-data',
    check: (sh, c) => vscRan(c, /^id\s+-u\s+www-data\b/) && c.out.trim() === '33' },
], { hint: "`id` argümansız kendi uid, gid ve gruplarını verir, kullanıcı adı verirsen o kullanıcınınkini. groups kısmında sudo görünüyorsa o hesap sudo kullanabilir. Hesap yoksa `no such user` döner, yazım hatasını yakalamak için de iyi bir test." });

addVariants('u2', [
  { title: 'Home nerede',
    story: "postgres hesabının home directory'si klasik /home altında değil. Yedek script'i bu dizini bilmek zorunda, passwd kaydından okuyacaksın.",
    task: "postgres kullanıcısının passwd kaydını getent ile göster ve home directory değerini submit et.",
    hint: "`getent passwd isim` iki nokta ile ayrılmış yedi alan döner, altıncı alan home directory. Alanları sırayla say, ad, x, uid, gid, açıklama, home, shell. grep ile /etc/passwd okumak LDAP kullanıcılarını göstermez, getent gösterir.",
    solution: 'getent passwd postgres\nsubmit /var/lib/postgresql',
    check: (sh, c) => vscSub(c, '/var/lib/postgresql', '/var/lib/postgresql/') && vscHist(sh, /getent\s+passwd\s+postgres/) },
  { title: 'Login olamayan hesap',
    story: "Güvenlik denetimi www-data hesabıyla birinin interaktif login olup olamayacağını soruyor. Cevap login shell alanında.",
    task: "www-data kullanıcısının passwd kaydını getent ile göster ve login shell değerini submit et.",
    hint: "`getent passwd www-data` satırının son alanı login shell. /usr/sbin/nologin hesabın interaktif oturum açamayacağı anlamına gelir, servis hesaplarında standarttır. Satırı iki nokta işaretlerinden bölerek oku.",
    solution: 'getent passwd www-data\nsubmit /usr/sbin/nologin',
    check: (sh, c) => vscSub(c, '/usr/sbin/nologin', 'nologin') && vscHist(sh, /getent\s+passwd\s+www-data/) },
], { hint: "`getent passwd isim` NSS üzerinden kaydı getirir, yerel dosyanın yanında LDAP ve SSSD kullanıcılarını da bulur. Satır iki nokta ile ayrılmış yedi alandır, sonuncusu login shell. grep ile /etc/passwd okumak sadece yerel kullanıcıları gösterir." });

addVariants('u3', [
  { title: 'NOC stajyeri',
    story: "NOC'a Selin adında bir stajyer başlıyor. Hesabı selin olacak, home directory ve bash shell lazım. Kim olduğu passwd kaydında da görünsün diye açıklama alanına adını yazacaksın.",
    task: 'selin adında, home directory açılmış, shell\'i /bin/bash olan ve açıklama alanında `Selin Stajyer` yazan bir kullanıcı oluştur.',
    hint: "`useradd` içinde `-m` home directory açar, `-s` login shell'i belirler, `-c` beşinci alan olan açıklamayı yazar. Açıklama boşluk içerdiği için çift tırnağa al, yoksa ikinci kelime kullanıcı adı sanılır. Hesap açmak root ister.",
    solution: 'sudo useradd -m -s /bin/bash -c "Selin Stajyer" selin\ngetent passwd selin',
    setup: sh => { vscDropUser(sh, 'selin'); },
    check: sh => { const l = vscPasswd(sh, 'selin'); return !!l && l.endsWith(':/bin/bash') && l.includes(':/home/selin:') && l.includes('Selin Stajyer') && vscEx(sh, '/home/selin', 'd'); } },
  { title: 'Sabit uid',
    story: "Taşeron mühendis Emre, NFS üzerinden dosya paylaşan iki sunucuda aynı uid ile olmalı, yoksa dosya sahiplikleri karışır. Diğer sunucuda uid 2001 verilmiş.",
    task: 'emre adında, uid değeri 2001, home directory açılmış ve shell\'i /bin/bash olan bir kullanıcı oluştur.',
    hint: "`-u 2001` uid'yi elle verir, vermezsen useradd sıradaki boş uid'yi seçer ve sunucular arasında tutmaz. `-m` ve `-s /bin/bash` yine gerekli. Sonra `id emre` ile uid'yi doğrula.",
    solution: 'sudo useradd -m -s /bin/bash -u 2001 emre\nid emre',
    setup: sh => { vscDropUser(sh, 'emre'); },
    check: sh => { const l = vscPasswd(sh, 'emre'); return !!l && l.split(':')[2] === '2001' && l.endsWith(':/bin/bash') && vscEx(sh, '/home/emre', 'd'); } },
], { hint: "`useradd` Debian'da sade çalışır, `-m` olmadan home directory açılmaz, `-s` olmadan shell /bin/sh olur. Bu yüzden ikisini birlikte ver ve komutu sudo ile çalıştır. Sonra `getent passwd` ile home ve shell alanlarını kontrol et." });

addVariants('u4', [
  { title: 'Selin için şifre',
    story: "selin hesabı kilitli açıldı, ilk gün login olabilmesi için şifre vereceksin. Sonra hesabın durumunu tek satırda doğrulayacaksın.",
    task: 'selin için şifre belirle, sonra passwd -S ile durumun P olduğunu gör.',
    hint: "`passwd kullanıcı` başkasının şifresini değiştirdiği için sudo ister. `-S` durum satırında ikinci alanı verir, P kullanılabilir şifre, L kilitli. Şifre vermeden önce de -S çalıştırırsan L görürsün, fark netleşir.",
    solution: 'sudo passwd selin\nsudo passwd -S selin',
    setup: sh => { vscEnsureUser(sh, 'selin'); },
    check: (sh, c) => vscShadow(sh, 'selin').startsWith('$6$') && vscRan(c, /passwd\s+-S/) && /^selin P /.test(c.out) },
  { title: 'Script ile şifre',
    story: "emre hesabını bir provisioning script'i açıyor, orada interaktif passwd kullanılamaz. chpasswd stdin'den kullanıcı ve şifre çiftini okur.",
    task: 'echo ile `emre:Branch2026` satırını sudo chpasswd komutuna pipe et, sonra passwd -S ile durumun P olduğunu gör.',
    hint: "`chpasswd` her satırda kullanıcı ve şifreyi iki nokta ile ayrılmış olarak bekler ve root ister. echo çıktısını `|` ile `sudo chpasswd` komutuna verirsin. Şifre komut satırında kaldığı için history'ye düşer, gerçek hayatta dosyadan oku.",
    solution: 'echo "emre:Branch2026" | sudo chpasswd\nsudo passwd -S emre',
    setup: sh => { vscEnsureUser(sh, 'emre', '-u 2001'); },
    check: (sh, c) => vscShadow(sh, 'emre').startsWith('$6$') && vscHist(sh, /chpasswd/) && vscRan(c, /passwd\s+-S/) && /^emre P /.test(c.out) },
], { hint: "`passwd kullanıcı` başkasının şifresini değiştirmek için root ister, sudo ile çalıştır. `-S` hesabın durumunu tek satırda verir, P kullanılabilir şifre, L kilitli, NP şifresiz. useradd ile açılan hesap L başlar, şifre verince P olur." });

addVariants('u5', [
  { title: 'NOC grubu',
    story: "NOC rapor dizinine sadece NOC ekibi yazabilsin istiyorsun. Önce noc grubunu açacak, sonra selin'i içine alacaksın.",
    task: 'noc adında grup oluştur ve selin\'i bu gruba ekle.',
    hint: "`groupadd` grubu /etc/group dosyasına ekler, grup yoksa usermod onu tanımaz. `usermod` için `-a` append, `-G` ek grup demek, sıra önce grup sonra kullanıcı. Sonra `id` ile selin'in groups kısmında noc görünmeli.",
    solution: 'sudo groupadd noc\nsudo usermod -aG noc selin\nid selin',
    setup: sh => { vscEnsureUser(sh, 'selin'); if (vscGroupLine(sh, 'noc')) vscSys(sh, 'groupdel noc'); },
    check: sh => vscGroupHas(sh, 'noc', 'selin') },
  { title: 'Sabit gid',
    story: "netops grubu diğer sunucularda gid 3000 ile açılmış, paylaşımlı dizinlerde aynı gid lazım. Grubu bu gid ile açıp emre'yi ekleyeceksin.",
    task: 'gid değeri 3000 olan netops grubunu oluştur ve emre\'yi bu gruba ekle.',
    hint: "`groupadd -g 3000` gid'yi elle verir, vermezsen sıradaki boş gid seçilir ve sunucular arasında tutmaz. Üye eklemek için `usermod -aG`, -a olmadan kullanıcının diğer ek grupları silinir. `getent group netops` ile gid ve üyeyi gör.",
    solution: 'sudo groupadd -g 3000 netops\nsudo usermod -aG netops emre\ngetent group netops',
    setup: sh => { vscEnsureUser(sh, 'emre', '-u 2001'); if (vscGroupLine(sh, 'netops')) vscSys(sh, 'groupdel netops'); },
    check: sh => vscGroupHas(sh, 'netops', 'emre') && (vscGroupLine(sh, 'netops') || '').split(':')[2] === '3000' },
], { hint: "`groupadd` yeni grubu /etc/group dosyasına ekler. `usermod -aG grup kullanıcı` içinde `-a` append, `-G` ek grup listesi demek. -a unutulursa kullanıcının mevcut ek grupları silinir ve sadece verdiğin grup kalır." });

addVariants('u6', [
  { title: "Log okuma yetkisi",
    story: "selin syslog ve auth.log okuyabilmeli. Debian'da bunun yolu adm grubu. Ama noc üyeliği kaybolmamalı.",
    task: 'selin\'i noc üyeliğini kaybetmeden adm grubuna da ekle.',
    hint: "`usermod` ile `-aG` birlikte verilince grup mevcut listeye eklenir. -a olmadan `-G` listeyi baştan yazar ve noc üyeliği uçar. Sonra `groups` ile selin'in iki grubu birlikte görünmeli.",
    solution: 'sudo usermod -aG adm selin\ngroups selin',
    setup: sh => { vscEnsureUser(sh, 'selin'); vscEnsureGroup(sh, 'noc'); vscSys(sh, 'usermod -G noc selin'); },
    check: sh => vscGroupHas(sh, 'adm', 'selin') && vscGroupHas(sh, 'noc', 'selin') },
  { title: 'Docker yetkisi',
    story: "emre lab container'larını yönetecek, docker grubuna girmesi gerekiyor. netops üyeliği yerinde kalmalı.",
    task: 'emre\'yi netops üyeliğini kaybetmeden docker grubuna da ekle.',
    hint: "`-aG` mevcut ek grupların üstüne ekler, sadece `-G` ise listeyi verdiğin grupla değiştirir. Docker grubu fiilen root yetkisi demektir, kime verdiğine dikkat et. Sonra `id emre` ile iki grubu da gör.",
    solution: 'sudo usermod -aG docker emre\nid emre',
    setup: sh => { vscEnsureUser(sh, 'emre', '-u 2001'); vscEnsureGroup(sh, 'netops', 3000); vscSys(sh, 'usermod -G netops emre'); },
    check: sh => vscGroupHas(sh, 'docker', 'emre') && vscGroupHas(sh, 'netops', 'emre') },
], { hint: "`-G` tek başına ek grup listesini baştan yazar, `-a` ile birlikte kullanınca mevcut listeye ekler. Bu yüzden sudo eklerken de `-aG` kullanmalısın, yoksa devops üyeliği gider. `groups ali` iki grubu birlikte göstermeli." });

addVariants('u7', [
  { title: 'Rapor dizini',
    story: "/srv/noc-reports dizini root'a ait ve NOC ekibi içine yazamıyor. Dizini ve içindekileri selin ile noc grubuna devredeceksin.",
    task: '/srv/noc-reports dizininin ve içindekilerin sahibini selin, grubunu noc yap.',
    hint: "`chown kullanıcı:grup` ikisini birden değiştirir. `-R` olmadan sadece dizin değişir, içindeki rapor dosyaları root'ta kalır. Root'a ait dosyayı başkasına vermek sudo ister.",
    solution: 'sudo chown -R selin:noc /srv/noc-reports\nls -l /srv/noc-reports',
    setup: sh => {
      vscEnsureUser(sh, 'selin'); vscEnsureGroup(sh, 'noc');
      vscRm(sh, '/srv/noc-reports');
      vscPut(sh, '/srv/noc-reports/2026-10-13-wan.txt', 'IST-BR-07 wan1 flap 3\n');
      vscPut(sh, '/srv/noc-reports/2026-10-13-lte.txt', 'ANK-BR-02 lte failover 1\n');
    },
    check: sh => { const d = sh.node('/srv/noc-reports'); const f = sh.node('/srv/noc-reports/2026-10-13-wan.txt'); return !!d && !!f && d.o === 'selin' && d.g === 'noc' && f.o === 'selin' && f.g === 'noc'; } },
  { title: 'Sadece grup',
    story: "~/sdwan-lab dizini senin, sahibi sende kalacak. Sadece netops ekibinin de erişebilmesi için grubu değiştireceksin.",
    task: '~/sdwan-lab dizininin ve içindekilerin grubunu netops yap, sahibi burak kalsın.',
    hint: "`chown :grup` biçiminde kullanıcı kısmını boş bırakırsan sadece grup değişir, `chgrp` ile aynı iş. `-R` alt dosyalara da uygular. Kullanıcı adını da yazarsan sahiplik elinden gider.",
    solution: 'sudo chown -R :netops ~/sdwan-lab\nls -l ~/sdwan-lab',
    setup: sh => {
      vscEnsureGroup(sh, 'netops', 3000);
      vscRm(sh, VSC_H + '/sdwan-lab');
      vscPut(sh, VSC_H + '/sdwan-lab/topology.txt', 'ist-br-07 -> ams-hub\nank-br-02 -> fra-hub\n');
      vscPut(sh, VSC_H + '/sdwan-lab/policies.yml', 'voice: wan1\nbulk: lte\n');
    },
    check: sh => { const d = sh.node(VSC_H + '/sdwan-lab'); const f = sh.node(VSC_H + '/sdwan-lab/topology.txt'); return !!d && !!f && d.g === 'netops' && f.g === 'netops' && d.o === VSC_U && f.o === VSC_U; } },
], { hint: "`chown kullanıcı:grup` sahibi ve grubu tek seferde değiştirir. `-R` dizinin içindeki her dosyaya iner, olmadan sadece dizinin kendisi değişir. Başka bir kullanıcıya dosya vermek root ister, sudo ile çalıştır." });

addVariants('u8', [
  { title: 'usermod ile kilit',
    story: "selin'in stajı bitti ama raporları incelenecek, hesap silinmeyecek sadece kilitlenecek. Bu sefer usermod ile kilitleyeceksin.",
    task: 'selin hesabını usermod ile kilitle ve passwd -S ile L durumunu doğrula.',
    hint: "`usermod -L` passwd -l ile aynı şeyi yapar, shadow'daki hash'in başına ünlem koyar. Açmak için `-U`. Kilitleme sadece şifreli login'i keser, SSH anahtarı varsa onu ayrıca kaldırmak gerekir.",
    solution: 'sudo usermod -L selin\nsudo passwd -S selin',
    setup: sh => { vscEnsureUser(sh, 'selin'); vscSys(sh, 'passwd selin'); },
    check: (sh, c) => vscShadow(sh, 'selin').startsWith('!') && vscRan(c, /passwd\s+-S/) && /^selin L /.test(c.out) },
  { title: 'Shadow ile doğrula',
    story: "emre'nin sözleşmesi askıya alındı, hesabı kilitleyeceksin. Doğrulamayı bu sefer shadow kaydının kendisine bakarak yapacaksın.",
    task: 'emre hesabını passwd ile kilitle, sonra getent shadow ile kaydında ünlem işaretini gör.',
    hint: "`passwd -l` hash'in önüne ünlem ekler. `getent shadow` kullanıcının shadow satırını getirir, ikinci alan ünlemle başlıyorsa hesap kilitli. shadow dosyası root'a özel, getent'i de sudo ile çalıştırman gerekir.",
    solution: 'sudo passwd -l emre\nsudo getent shadow emre',
    setup: sh => { vscEnsureUser(sh, 'emre', '-u 2001'); vscSys(sh, 'passwd emre'); },
    check: (sh, c) => vscShadow(sh, 'emre').startsWith('!') && vscRan(c, /getent\s+shadow\s+emre/) && c.out.includes('emre:!') },
], { hint: "`passwd -l` shadow dosyasındaki hash'in başına ünlem koyar, şifreyle login imkansız olur ama hesap, uid ve dosyalar yerinde kalır. Root ister. `passwd -S` ile ikinci alanda L görmelisin, açmak için `-u`." });

addVariants('u9', [
  { title: 'Deploy nereden girdi',
    story: "auth.log'da deploy hesabının şifre denemeleri var. Güvenlik ekibi bu hesabın son başarılı login'inin hangi IP'den geldiğini soruyor.",
    task: 'last ile sadece deploy kullanıcısının login geçmişini göster ve geldiği IP adresini submit et.',
    hint: "`last kullanıcı` wtmp kayıtlarını o kullanıcıya göre süzer. Üçüncü sütun bağlantının geldiği adres. `last -n 5` gibi bir sınır vermezsen tüm geçmiş gelir.",
    solution: 'last deploy\nsubmit 198.51.100.23',
    check: (sh, c) => vscSub(c, '198.51.100.23') && vscHist(sh, /^last\s+deploy/) },
  { title: 'Boot saati',
    story: "Monitoring kutunun gece yeniden başladığını iddia ediyor. Son boot'un tam saatini en kısa yoldan öğrenmek istiyorsun.",
    task: 'who -b ile son boot zamanını göster, saat ve dakikayı submit et.',
    hint: "`who -b` sadece son system boot satırını verir, `last reboot` ise tüm boot geçmişini. Saati satırdaki tarih ile birlikte okursun. uptime da ne kadar süredir açık olduğunu söyler ama başlangıç saatini hesaplaman gerekir.",
    solution: 'who -b\nsubmit 07:58',
    check: (sh, c) => vscSub(c, '07:58', '7:58', '07.58', '2026-10-10 07:58') && vscHist(sh, /^who\s+-b/) },
], { hint: "`w` şu an login olanları ve ne çalıştırdıklarını gösterir. `last` /var/log/wtmp dosyasını okur, `last reboot` sadece boot kayıtlarını listeler. still running yazan satır şu anki boot, tarih o satırda." });

addVariants('u10', [
  { title: 'Stajyeri sil',
    story: "Hukuk onay verdi, selin hesabı home directory'si ile birlikte tamamen kaldırılacak.",
    task: "selin hesabını home directory'si ile birlikte sil.",
    hint: "`userdel -r` hesabı passwd, shadow ve group dosyalarından siler, home directory ve mail spool'u da kaldırır. -r olmadan /home/selin sahipsiz bir dizin olarak kalır. Sonra `getent passwd selin` boş dönmeli.",
    solution: 'sudo userdel -r selin\ngetent passwd selin',
    setup: sh => { vscEnsureUser(sh, 'selin'); },
    check: sh => !vscPasswd(sh, 'selin') && !vscEx(sh, '/home/selin') },
  { title: 'Hesabı sil, dosyalar kalsın',
    story: "emre'nin sözleşmesi bitti, hesabı kaldırılacak. Ama home directory'sindeki dosyaları hukuk inceleyecek, dizin silinmemeli.",
    task: 'emre hesabını sil ama /home/emre dizini yerinde kalsın, sonra ls -ld ile dizini kontrol et.',
    hint: "`userdel` tek başına sadece hesabı siler, home directory'ye dokunmaz. `-r` verirsen dosyalar da gider ve geri dönüşü yoktur. `ls -ld` dizinin kendisini gösterir, gerçek sistemde sahip sütununda artık isim yerine uid görünür.",
    solution: 'sudo userdel emre\nls -ld /home/emre',
    setup: sh => { vscEnsureUser(sh, 'emre', '-u 2001'); },
    check: sh => !vscPasswd(sh, 'emre') && vscEx(sh, '/home/emre', 'd') },
], { hint: "`userdel` hesabı passwd, shadow ve group dosyalarından siler ama home directory'yi bırakır. `-r` home ve mail spool'u da kaldırır. Geri dönüşü yok, önce yedek al." });

/* ======================================================================
   HW
   ====================================================================== */
addVariants('hw1', [
  { title: 'Hypervisor',
    story: "Lisans ekibi bu sunucunun fiziksel mi sanal mı olduğunu ve sanalsa hangi hypervisor üzerinde koştuğunu soruyor. lscpu bunu da gösterir.",
    task: 'lscpu ile işlemciye bak ve hypervisor vendor değerini submit et.',
    hint: "`lscpu` çıktısının Virtualization features bölümünde Hypervisor vendor satırı var. Fiziksel makinede bu satır hiç görünmez. Aynı ipucu /proc/cpuinfo içindeki flags satırında hypervisor kelimesi olarak da geçer.",
    solution: 'lscpu\nsubmit KVM',
    check: (sh, c) => vscSub(c, 'kvm') },
  { title: 'L3 cache',
    story: "Uygulama ekibi performans testinden önce L3 cache boyutunu istiyor, tuning parametrelerini buna göre seçecekler.",
    task: 'lscpu ile işlemciye bak ve L3 cache boyutunu submit et.',
    hint: "`lscpu` Caches bölümünde L1d, L1i, L2 ve L3 satırlarını verir. L3 tüm çekirdeklerin paylaştığı son seviye cache, instance sayısı genelde soket sayısıdır. Değeri birimiyle birlikte yaz.",
    solution: 'lscpu\nsubmit 27.5 MiB',
    check: (sh, c) => vscSub(c, '27.5 mib', '27.5mib', '27.5', '27.5 mb') },
], { hint: "`lscpu` işlemci özetini verir, `CPU(s)` satırı kernel'in gördüğü mantıksal CPU sayısı. Thread ve core satırları bu sayının nasıl oluştuğunu açıklar. Aynı bilgi ham olarak /proc/cpuinfo içindeki processor satırlarında." });

addVariants('hw2', [
  { title: 'Swap boyutu',
    story: "Veritabanı ekibi swap alanının toplam boyutunu soruyor, OOM riskini hesaplayacaklar. Kesin değer /proc/meminfo içinde.",
    task: '/proc/meminfo içindeki SwapTotal değerini kB olarak submit et.',
    hint: "`grep Swap /proc/meminfo` swap ile ilgili satırları süzer. SwapTotal tanımlı toplam alan, SwapFree boş kalanı. Değer kB cinsinden, birimi dönüştürmeden olduğu gibi gönder.",
    solution: 'grep SwapTotal /proc/meminfo\nsubmit 2097148',
    check: (sh, c) => vscSub(c, '2097148', '2097148 kb') },
  { title: 'Gerçek boş bellek',
    story: "Monitoring MemFree düşük diye alarm veriyor ama Linux boş RAM'i cache için kullanır. Yeni uygulamalar için gerçekten kullanılabilir miktar MemAvailable satırında.",
    task: '/proc/meminfo içindeki MemAvailable değerini kB olarak submit et.',
    hint: "`grep Mem /proc/meminfo` MemTotal, MemFree ve MemAvailable satırlarını getirir. MemFree hiç dokunulmamış RAM, MemAvailable ise boşaltılabilir cache dahil kullanılabilir miktar. Alarm eşiğini MemFree'ye koymak klasik hata.",
    solution: 'grep MemAvailable /proc/meminfo\nsubmit 2310220',
    check: (sh, c) => vscSub(c, '2310220', '2310220 kb') },
], { hint: "/proc/meminfo kernel'in bellek sayaçlarını kB cinsinden tutar, `grep` ile istediğin satırı süzersin. MemTotal kernel'in kullanabildiği toplam RAM, fiziksel modülden biraz azdır çünkü kernel kendine pay ayırır. `free -h` aynı veriyi okunur birimle gösterir ama yuvarlar." });

addVariants('hw3', [
  { title: 'USB diskin tipi',
    story: "Sahadan gelen USB disk takılı ama mount edilmemiş. Bağlamadan önce hangi filesystem ile formatlandığını öğrenmek istiyorsun.",
    task: 'lsblk -f ile diskleri listele, sdc1 bölümünün filesystem tipini submit et.',
    hint: "`lsblk -f` mount edilmemiş bölümleri de FSTYPE ve LABEL ile gösterir. sdc1 satırında MOUNTPOINTS boş, ama FSTYPE dolu. vfat Windows ile uyumlu FAT32 demek.",
    solution: 'lsblk -f\nsubmit vfat',
    check: (sh, c) => vscSub(c, 'vfat', 'fat32') },
  { title: 'fstab için UUID',
    story: "/data diskini fstab'a aygıt adıyla değil UUID ile yazacaksın, çünkü disk sırası değişince sdb sdc olabilir.",
    task: 'lsblk -f ile diskleri listele, /data üzerindeki bölümün UUID değerini submit et.',
    hint: "`lsblk -f` UUID sütununu ekler, /data satırını MOUNTPOINTS sütunundan bul. UUID filesystem oluşturulurken atanır ve aygıt adı değişse de sabit kalır. Değeri kopyalarken tirelerle birlikte eksiksiz al.",
    solution: 'lsblk -f\nsubmit 5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9',
    check: (sh, c) => vscSub(c, '5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9', 'uuid=5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9') },
], { hint: "`lsblk` blok aygıtlarını disk ve bölüm ağacı olarak çizer. `-f` FSTYPE, LABEL ve UUID sütunlarını ekler. Sorulan mount noktasını MOUNTPOINTS sütununda bul, aynı satırın FSTYPE değerine bak." });

addVariants('hw4', [
  { title: 'Üretici kim',
    story: "Envanter sistemine her sunucunun donanım üreticisini girmen gerekiyor. Sanal makinede bu alan hypervisor'ı ele verir.",
    task: 'dmidecode ile system tablosunu oku, Manufacturer değerini submit et.',
    hint: "`dmidecode -t system` System Information bloğunu verir, Manufacturer ve Product Name satırları üreticiyi ve modeli söyler. SMBIOS okumak için sudo gerekir. Fiziksel sunucuda burada Dell ya da HPE görürsün.",
    solution: 'sudo dmidecode -t system\nsubmit QEMU',
    check: (sh, c) => vscSub(c, 'qemu') },
  { title: 'BIOS sürümü',
    story: "Bir kernel bug'ı belirli BIOS'larda görülüyor. Bu makinenin BIOS üreticisini öğreneceksin.",
    task: 'dmidecode ile bios tablosunu oku, Vendor değerini submit et.',
    hint: "`dmidecode -t bios` BIOS Information bloğunu gösterir, Vendor, Version ve Release Date satırları var. Tek bir alan için `-s bios-version` gibi anahtar kelimeler de kullanılır. sudo olmadan /dev/mem okunamaz.",
    solution: 'sudo dmidecode -t bios\nsubmit SeaBIOS',
    check: (sh, c) => vscSub(c, 'seabios') },
], { hint: "`dmidecode` SMBIOS tablolarını okur, /dev/mem eriştiği için sudo ister. `-t memory` sadece bellek tablolarını gösterir, Memory Device bloğu takılı modülü anlatır. Physical Memory Array bloğundaki Maximum Capacity ile karıştırma." });

addVariants('hw5', [
  { title: 'Disk denetleyicisi',
    story: "Disk performansı sorununda ilk soru SATA denetleyicinin hangi driver ile çalıştığı. lspci -k bunu her aygıtın altına yazar.",
    task: 'lspci -k çalıştır, SATA controller için kullanılan kernel driver\'ı submit et.',
    hint: "`lspci -k` her PCI aygıtının altına Kernel driver in use satırını ekler. SATA controller satırını bul, hemen altındaki driver adına bak. `grep -A2 SATA` ile çıktıyı daraltabilirsin.",
    solution: 'lspci -k\nsubmit ahci',
    check: (sh, c) => vscSub(c, 'ahci') && vscHist(sh, /^lspci\s+-\w*k/) },
  { title: 'USB disk kimliği',
    story: "Sahadan gelen USB diskin markasını envantere yazacaksın. lsusb vendor ve product ID ile birlikte üretici adını verir.",
    task: 'lsusb ve lsusb -tv çalıştır, Mass Storage aygıtının üreticisini submit et.',
    hint: "`lsusb` her satırda ID ve üretici adını verir, root hub satırları Linux Foundation'dır. `-tv` ağaç görünümünde hangi port'ta hangi sınıf ve driver olduğunu gösterir, usb-storage diski işaret eder. Üretici adını ID'den sonraki ilk kelimelerden oku.",
    solution: 'lsusb\nlsusb -tv\nsubmit SanDisk',
    check: (sh, c) => vscSub(c, 'sandisk', 'sandisk corp.', 'sandisk corp', 'sandisk ultra fit') && vscHist(sh, /^lsusb\s+-tv/) },
], { hint: "`lspci -k` her PCI aygıtının altına kullandığı kernel driver'ı yazar. Ethernet controller satırının altındaki Kernel driver in use değerine bak. `lsusb -tv` USB aygıtlarını port ağacı ve driver ile gösterir." });

addVariants('hw6', [
  { title: 'Veri diski hızı',
    story: "Veritabanı /data üzerinde, yani sdb diskinde duruyor. Yavaşlık şikayeti için root diski değil asıl veri diskini ölçeceksin.",
    task: '/dev/sdb için gerçek disk okuma hızı testi yap.',
    hint: "`hdparm -t` cache'i atlayıp diskten okuma hızını ölçer, `-T` sadece cache hızını verir. Aygıt adını doğru ver, /data hangi diskteyse onu ölç. Ham disk erişimi sudo ister.",
    solution: 'sudo hdparm -t /dev/sdb',
    check: (sh, c) => vscRan(c, /hdparm\s+-\w*t\w*\s+\/dev\/sdb/) && c.out.includes('Timing buffered disk reads') },
  { title: 'Disk modeli',
    story: "Tedarikçi diskin modelini ve firmware sürümünü istiyor. hdparm diskin kendi kimlik bilgisini de okuyabilir.",
    task: 'hdparm ile /dev/sda kimlik bilgisini oku ve Model değerini submit et.',
    hint: "`hdparm -i` diskin kendi bildirdiği Model, FwRev ve SerialNo alanlarını gösterir. `-I` daha ayrıntılı bir dökümdür. Ham aygıta eriştiği için sudo gerekir.",
    solution: 'sudo hdparm -i /dev/sda\nsubmit QEMU HARDDISK',
    check: (sh, c) => vscSub(c, 'qemu harddisk') && vscHist(sh, /hdparm\s+-i/) },
], { hint: "`hdparm -tT` iki okuma testi yapar, `-T` cache üzerinden okuma, `-t` diskten gerçek okuma. Ham disk aygıtına eriştiği için sudo ister. Test anlık bir ölçüm, birkaç kez çalıştırıp ortalamaya bak." });

addVariants('hw7', [
  { title: 'Veri diskinin tablosu',
    story: "/data diskini 2 TB'lık yenisiyle değiştirmeden önce mevcut bölüm tablosu tipini bilmen gerekiyor. MBR 2 TB üstünü adresleyemez.",
    task: 'fdisk ile sadece /dev/sdb diskinin bölüm tablosunu listele, disklabel tipini submit et.',
    hint: "`fdisk -l /dev/sdb` sadece o diski listeler, aygıt vermezsen hepsi gelir. Disklabel type satırında dos eski MBR, gpt modern tablo demek. Okumak için de sudo gerekir.",
    solution: 'sudo fdisk -l /dev/sdb\nsubmit dos',
    check: (sh, c) => vscSub(c, 'dos', 'mbr') && vscHist(sh, /fdisk\s+-l\s+\/dev\/sdb/) },
  { title: 'USB bölüm tipi',
    story: "USB diskin Windows makinelerde de açılması gerekiyor. Bölüm tablosundaki tip kodu bunu söyler.",
    task: 'fdisk ile /dev/sdc bölüm tablosunu listele, sdc1 bölümünün Type değerini submit et.',
    hint: "`fdisk -l /dev/sdc` bölüm satırında Id ve Type sütunlarını gösterir. dos tablolarda Id tek bir hex kod, Type onun okunur adı. sudo olmadan disk açılamaz.",
    solution: 'sudo fdisk -l /dev/sdc\nsubmit W95 FAT32 (LBA)',
    check: (sh, c) => vscSub(c, 'w95 fat32 (lba)', 'w95 fat32', 'fat32', 'c') && vscHist(sh, /fdisk\s+-l/) },
], { hint: "`fdisk -l` tüm disklerin bölüm tablosunu listeler, ham diski okuduğu için sudo ister. Her diskin bloğunda Disklabel type satırı gpt ya da dos yazar, dos eski MBR demek. -l olmadan fdisk interaktif açılır, yanlış diskte w basmak felaket olur." });

addVariants('hw8', [
  { title: 'Debug log şişmiş',
    story: "/opt altındaki SD-WAN ajanı debug modunda unutulmuş ve bir log dosyası şişmiş. Hangi dosya olduğunu bulup TAC'a raporlayacaksın.",
    task: '/opt/ion-agent altında 30 KB\'tan büyük dosyayı find ile bul ve tam yolunu submit et.',
    hint: "Önce `du -h --max-depth=1` ile hangi alt dizinin büyük olduğunu gör. `find yol -size +30k` 30 kilobayttan büyük dosyaları listeler, `+` büyüktür, `k` kilobayt. Birim harfini unutursan find 512 baytlık blok sayar.",
    solution: 'du -h --max-depth=1 /opt/ion-agent\nfind /opt/ion-agent -size +30k\nsubmit /opt/ion-agent/logs/ion-debug.log',
    setup: sh => {
      vscPut(sh, '/opt/ion-agent/logs/ion-debug.log', Array.from({ length: 500 }, (x, i) => `DEBUG path-select flow=${1000 + i} wan1 rtt=${20 + i % 30}ms lte rtt=${60 + i % 40}ms decision=wan1`).join('\n') + '\n');
      vscPut(sh, '/opt/ion-agent/logs/agent.log', 'agent start\nheartbeat ok\n');
      vscPut(sh, '/opt/ion-agent/etc/agent.conf', 'loglevel=debug\nhub=10.99.7.1\n');
    },
    check: (sh, c) => vscSub(c, '/opt/ion-agent/logs/ion-debug.log') },
  { title: 'Home kotası',
    story: "Home kotan dolmak üzere. ~/Downloads altında unutulmuş büyük bir firmware dosyası olmalı, onu bulacaksın.",
    task: '~/Downloads altında 40 KB\'tan büyük dosyayı find ile bul ve tam yolunu submit et.',
    hint: "`du -sh` dizinin toplamını, `--max-depth=1` alt dizin dağılımını gösterir. `find` ile `-size +40k` vermek 40 kilobayttan büyük dosyaları listeler, `+` büyüktür demek. Submit ederken ~ yerine tam yolu yaz.",
    solution: 'du -h --max-depth=1 ~/Downloads\nfind ~/Downloads -size +40k\nsubmit /home/burak/Downloads/firmware/ion-3000-6.2.1.bin',
    setup: sh => {
      vscPut(sh, VSC_H + '/Downloads/firmware/ion-3000-6.2.1.bin', 'ION3000FW'.repeat(9000));
      vscPut(sh, VSC_H + '/Downloads/firmware/release-notes.txt', 'ION 3000 6.2.1\nfixes path flap\n');
      vscPut(sh, VSC_H + '/Downloads/ticket-48213.txt', 'TAC-48213 notlari\n');
    },
    check: (sh, c) => vscSub(c, '/home/burak/downloads/firmware/ion-3000-6.2.1.bin', '~/downloads/firmware/ion-3000-6.2.1.bin') },
], { hint: "`df -hT` hangi filesystem'in dolduğunu, `du -h --max-depth=1` dizin bazında yerin nereye gittiğini gösterir. Tek büyük dosyayı `find yol -size +20k` bulur, `+` büyüktür, `k` kilobayt demek. Birimi unutursan find 512 baytlık blok sayar ve sonuç şaşırtır." });

addVariants('hw9', [
  { title: 'media altına bağla',
    story: "Masaüstü dağıtımlar takılabilir diskleri /media altına bağlar, sen de bu düzeni koruyacaksın. Hedef dizin henüz yok.",
    task: '/media/usb dizinini oluştur, /dev/sdc1 bölümünü oraya bağla ve içindekileri listele.',
    hint: "`mount` hedef dizin var olmadan çalışmaz, önce `mkdir -p` ile aç, /media root'a ait olduğu için sudo gerekir. Sonra `mount aygıt dizin` ile bağla. `findmnt /media/usb` bağlantıyı doğrular.",
    solution: 'sudo mkdir -p /media/usb\nsudo mount /dev/sdc1 /media/usb\nls /media/usb',
    setup: sh => { vscUsbOff(sh); vscRm(sh, '/media/usb'); },
    check: sh => !!vscMounted(sh, '/dev/sdc1', '/media/usb') && vscEx(sh, '/media/usb/README.txt') },
  { title: 'Salt okunur bağla',
    story: "USB disk bir olay incelemesinin delili, üzerine tek bayt yazılmamalı. Diski read-only bağlayacaksın.",
    task: '/dev/sdc1 bölümünü /mnt altına salt okunur bağla ve findmnt ile ro olduğunu doğrula.',
    hint: "`mount -o ro` read-only bağlar, kernel diske yazmayı reddeder. -o seçenekleri virgülle birleşir. `findmnt /mnt` OPTIONS sütununda ro görmelisin.",
    solution: 'sudo mount -o ro /dev/sdc1 /mnt\nfindmnt /mnt',
    setup: sh => { vscUsbOff(sh); },
    check: sh => { const l = vscMounted(sh, '/dev/sdc1', '/mnt'); return !!l && / ro,/.test(l) && vscEx(sh, '/mnt/README.txt'); } },
], { hint: "`mount aygıt hedef` bölümü bir dizine bağlar, sistem geneli bir işlem olduğu için sudo ister. Hedef dizin önceden var olmalı. Sonra `ls` ile içeriğe, `findmnt` ile bağlantıya bak." });

addVariants('hw10', [
  { title: 'Meşgul disk',
    story: "Bir önceki oturumdan kalan shell'in hâlâ /media/usb içinde duruyor. Diski çıkarmak istediğinde kernel onu meşgul sayacak.",
    task: 'Şu an /media/usb içindesin. umount\'un neden reddettiğini gör, sonra dışarı çıkıp diski düzgün çıkar.',
    hint: "`pwd` ile nerede olduğuna bak, cwd'si mount noktasında olan her process diski meşgul eder. `cd /` ile çıkınca `umount` çalışır. umount komutunda aygıt değil mount noktasını da verebilirsin.",
    solution: 'sudo umount /media/usb\ncd /\nsudo umount /media/usb',
    setup: sh => { vscUsbOn(sh, '/media/usb'); sh.cwd = '/media/usb'; },
    check: (sh, c) => !vscMounted(sh, '/dev/sdc1') && vscRan(c, /umount/) },
  { title: 'Aygıt adıyla çıkar',
    story: "Disk /mnt altında bağlı ve sen içindesin. Bu sefer umount'a mount noktası yerine aygıt adını vereceksin.",
    task: 'Şu an /mnt içindesin. umount\'a /dev/sdc1 ver, reddi gör, home\'a dönüp tekrar dene.',
    hint: "`umount` mount noktası yerine aygıt adını da kabul eder, ikisi aynı bağlantıyı çözer. Shell'in cwd'si mount noktasındaysa target is busy alırsın. `cd ~` ile çıkıp tekrar dene, `lsof /mnt` kimin tuttuğunu gösterir.",
    solution: 'sudo umount /dev/sdc1\ncd ~\nsudo umount /dev/sdc1',
    setup: sh => { vscUsbOn(sh, '/mnt'); sh.cwd = '/mnt'; },
    check: (sh, c) => !vscMounted(sh, '/dev/sdc1') && vscRan(c, /umount\s+\/dev\/sdc1/) },
], { hint: "Bir shell'in cwd'si mount noktasının içindeyse kernel diski meşgul sayar ve umount `target is busy` der. `cd` ile dışarı çıkınca umount çalışır. Başka kim tutuyor görmek için `lsof` ya da `fuser -m` kullanılır." });

/* ======================================================================
   ARCH
   ====================================================================== */
const VSC_DIAG = [['diag/', ''], ['diag/show-tech.txt', 'show tech IST-BR-07\nuptime 3d\n'], ['diag/routes.txt', '0.0.0.0/0 via wan1\n10.99.0.0/16 via tunnel0\n'], ['diag/ion-config.yml', 'site: IST-BR-07\nhub: ams-hub\n']];
function vscCaptures(sh) {
  vscPut(sh, VSC_H + '/captures/wan1-0913.pcap', 'pcap wan1 flap capture\n');
  vscPut(sh, VSC_H + '/captures/lte-0913.pcap', 'pcap lte failover capture\n');
  vscPut(sh, VSC_H + '/captures/notes.txt', 'wan1 09.12 dustu, lte 09.13 devraldi\n');
}
function vscWww(sh) { if (!vscEx(sh, VSC_H + '/www-backup.tgz')) vscSys(sh, 'tar czf ~/www-backup.tgz /var/www/html', true); }

addVariants('ar1', [
  { title: 'Capture paketi',
    story: "TAC case'i için aldığın paket yakalamaları ~/captures altında. Hepsini tek dosya halinde case'e yükleyeceksin.",
    task: "Home directory'nde captures dizinini captures.tar adıyla paketle.",
    hint: "`tar` için `c` oluştur, `v` dosyaları yaz, `f` arşiv adını belirt demek. f'den hemen sonra arşiv adı gelir, ardından paketlenecek dizin. Önce home'a geçersen arşivdeki yollar captures ile başlar, tam yol taşımaz.",
    solution: 'cd ~\ntar cvf captures.tar captures',
    setup: sh => { vscCaptures(sh); vscRm(sh, VSC_H + '/captures.tar'); },
    check: sh => vscHas(sh, VSC_H + '/captures.tar', 'captures/wan1-0913.pcap') && vscHas(sh, VSC_H + '/captures.tar', 'captures/notes.txt') },
  { title: "nginx log'ları",
    story: "Web ekibi nginx log'larının bir kopyasını istiyor. /var/log altındaki nginx dizinini /tmp içine arşiv olarak koyacaksın.",
    task: '/var/log altındaki nginx dizinini /tmp/nginx-logs.tar adıyla paketle.',
    hint: "Önce `cd /var/log` ile üst dizine geç, sonra dizini göreli adıyla ver, arşivde yollar nginx ile başlar. Arşiv adına tam yol verebilirsin, `f` sonrası /tmp altını gösterir. /var/log root'a ait ama okunabilir, /tmp ise herkese yazılabilir.",
    solution: 'cd /var/log\ntar cvf /tmp/nginx-logs.tar nginx',
    setup: sh => { vscRm(sh, '/tmp/nginx-logs.tar'); },
    check: sh => vscHas(sh, '/tmp/nginx-logs.tar', 'nginx/access.log') && !vscHas(sh, '/tmp/nginx-logs.tar', 'var/log/nginx') },
], { hint: "`tar` harf seçenekleri alır, `c` arşiv oluştur, `v` her dosyayı yaz, `f` arşiv dosyasının adını belirtir. f'den hemen sonra arşiv adı gelmeli, sonra paketlenecek dizin. Göreli yol vermek için önce home'a geç, arşivdeki yollar kısa kalır." });

addVariants('ar2', [
  { title: 'Vendor bundle',
    story: "TAC sana ~/Downloads/ion-diag.tar diye bir diagnostic bundle gönderdi. Ne içerdiğini bilmeden açmayacaksın.",
    task: 'ion-diag.tar arşivinin içeriğini çıkarmadan listele.',
    hint: "`tar tf arşiv` sadece listeler, hiçbir dosya yazmaz. `x` ile karıştırma, x çıkarır. Liste diag ile başlıyorsa her şey tek bir dizine açılır, dağılmaz.",
    solution: 'tar tf ~/Downloads/ion-diag.tar',
    setup: sh => { vscPut(sh, VSC_H + '/Downloads/ion-diag.tar', vscTar(VSC_DIAG, 'root')); },
    check: (sh, c) => vscRan(c, /tar\s+-?t/) && c.out.includes('diag/show-tech.txt') && c.out.includes('diag/ion-config.yml') },
  { title: 'Ayrıntılı liste',
    story: "/tmp/nginx-logs.tar arşivini açmadan önce dosyaların kime ait olduğunu ve boyutlarını görmek istiyorsun.",
    task: 'nginx-logs.tar arşivini ayrıntılı listele ve dosyaların sahibini submit et.',
    hint: "`tar tvf` listeye izinleri, sahip ve grubu, boyutu ve tarihi ekler, `v` ayrıntı demek. Sahip sütunu kullanıcı ve grubu eğik çizgiyle ayırır. Root'a ait dosyaları sıradan kullanıcı olarak açarsan sahiplik sana geçer.",
    solution: 'tar tvf /tmp/nginx-logs.tar\nsubmit root',
    setup: sh => { if (!vscEx(sh, '/tmp/nginx-logs.tar')) vscSys(sh, 'tar cf /tmp/nginx-logs.tar -C /var/log nginx'); },
    check: (sh, c) => vscSub(c, 'root', 'root/root') && vscHist(sh, /tar\s+-?\w*t\w*v|tar\s+-?\w*v\w*t/) },
], { hint: "`tar t` arşivi açmadan içindekileri listeler, `f` yine arşiv adını verir. `v` eklersen izin, sahip ve boyut da görünür. Bilinmeyen arşivi açmadan önce listelemek dosyaların nereye saçılacağını gösterir." });

addVariants('ar3', [
  { title: 'Orijinal kalsın',
    story: "ion-diag.tar dosyasını TAC portalına sıkıştırılmış yükleyeceksin ama orijinal tar da sende dursun, üzerinde çalışmaya devam edeceksin.",
    task: 'ion-diag.tar dosyasını orijinali silinmeden gzip ile sıkıştır.',
    hint: "`gzip` varsayılan olarak orijinali silip yerine .gz bırakır. `-k` keep demek, orijinal dosya korunur. Sonra `ls -l` ile iki dosyanın boyutunu karşılaştır.",
    solution: 'gzip -k ~/Downloads/ion-diag.tar\nls -l ~/Downloads',
    setup: sh => { if (!vscEx(sh, VSC_H + '/Downloads/ion-diag.tar')) vscPut(sh, VSC_H + '/Downloads/ion-diag.tar', vscTar(VSC_DIAG, 'root')); vscRm(sh, VSC_H + '/Downloads/ion-diag.tar.gz'); },
    check: sh => vscEx(sh, VSC_H + '/Downloads/ion-diag.tar.gz') && vscEx(sh, VSC_H + '/Downloads/ion-diag.tar') },
  { title: 'Debug log sıkıştır',
    story: "~/lab/sdwan-debug.log yer kaplıyor. Sıkıştırıp oranına bakacaksın, orijinale ihtiyaç yok.",
    task: 'sdwan-debug.log dosyasını gzip ile ayrıntılı çıktı vererek sıkıştır.',
    hint: "`gzip -v` her dosya için sıkıştırma oranını yazar. -k vermediğin için orijinal silinir ve yerine .gz kalır. Metin log'lar genelde yüzde seksenin üstünde küçülür.",
    solution: 'gzip -v ~/lab/sdwan-debug.log',
    setup: sh => { vscRm(sh, VSC_H + '/lab/sdwan-debug.log.gz'); vscPut(sh, VSC_H + '/lab/sdwan-debug.log', Array.from({ length: 200 }, (x, i) => `DEBUG tunnel0 keepalive seq=${i} ok`).join('\n') + '\n'); },
    check: (sh, c) => vscEx(sh, VSC_H + '/lab/sdwan-debug.log.gz') && !vscEx(sh, VSC_H + '/lab/sdwan-debug.log') && vscRan(c, /gzip\s+-\w*v/) },
], { hint: "`gzip dosya` dosyayı sıkıştırır, `.gz` ekler ve orijinali siler. Orijinali korumak için `-k` gerekir. Açmak için `gunzip` ya da `gzip -d`." });

addVariants('ar4', [
  { title: 'SSH config yedeği',
    story: "sshd ayarlarını değiştirmeden önce /etc/ssh dizininin sıkıştırılmış bir yedeğini alacaksın. Yanlış bir ayar seni kutunun dışında bırakabilir.",
    task: '/etc/ssh dizinini gzip\'li tek komutla ~/ssh-config.tar.gz olarak arşivle.',
    hint: "`c` ile birlikte `z` verirsen tar çıktıyı gzip'ten geçirir, ayrı gzip adımı gerekmez. `f` en sonda olmalı, hemen ardından arşiv adı. Mutlak yol verince tar baştaki / işaretini kaldırır, bu uyarı normal.",
    solution: 'tar czvf ~/ssh-config.tar.gz /etc/ssh',
    check: sh => vscHas(sh, VSC_H + '/ssh-config.tar.gz', 'etc/ssh/sshd_config') && vscRe(sh, VSC_H + '/ssh-config.tar.gz', /^\x1f\x8b/) },
  { title: 'Web kökü yedeği',
    story: "Web sitesinin içeriğini güncellemeden önce /var/www/html dizinini yedekleyeceksin. Arşiv adı kısa uzantılı .tgz olsun.",
    task: '/var/www/html dizinini gzip\'li tek komutla ~/www-backup.tgz olarak arşivle.',
    hint: "`.tgz` ile `.tar.gz` aynı şey, uzantı sadece isim. Sıkıştırmayı uzantı değil `z` harfi yapar, z unutulursa .tgz adlı ama sıkıştırılmamış bir dosya çıkar. f en sona, hemen arkasından arşiv adı.",
    solution: 'tar czvf ~/www-backup.tgz /var/www/html',
    setup: sh => { vscRm(sh, VSC_H + '/www-backup.tgz'); },
    check: sh => vscHas(sh, VSC_H + '/www-backup.tgz', 'var/www/html/index.html') && vscRe(sh, VSC_H + '/www-backup.tgz', /^\x1f\x8b/) },
], { hint: "`z` tar'ın çıktısını gzip'ten geçirir, böylece c, z, v ve f harfleri tek komutta paketleyip sıkıştırır. f en sonda, hemen arkasından arşiv adı gelir. Mutlak yol verdiğinde tar baştaki / işaretini kaldırır, uyarı normal." });

addVariants('ar5', [
  { title: 'SSH yedeğini karşılaştır',
    story: "sshd_config değişikliğinden sonra bir şey ters gitti. Yedeği /etc üzerine değil /tmp/ssh-restore altına açıp farkı inceleyeceksin.",
    task: 'ssh-config.tar.gz arşivini /tmp/ssh-restore dizinine çıkar.',
    hint: "`x` çıkar, `z` gzip'i açar, `-C dizin` hedefi belirler. Hedef dizin yoksa tar hata verir, önce `mkdir -p` ile aç. Sonra `diff` ile /etc/ssh/sshd_config ve açtığın kopyayı karşılaştırabilirsin.",
    solution: 'mkdir -p /tmp/ssh-restore\ntar xzvf ~/ssh-config.tar.gz -C /tmp/ssh-restore',
    setup: sh => { if (!vscEx(sh, VSC_H + '/ssh-config.tar.gz')) vscSys(sh, 'tar czf ~/ssh-config.tar.gz /etc/ssh', true); vscRm(sh, '/tmp/ssh-restore'); },
    check: sh => vscEx(sh, '/tmp/ssh-restore/etc/ssh/sshd_config') },
  { title: 'Tek dosya çıkar',
    story: "Web yedeğinin tamamına ihtiyacın yok, sadece index.html dosyasının eski halini görmek istiyorsun.",
    task: 'www-backup.tgz arşivinden sadece var/www/html/index.html dosyasını /tmp/www-check dizinine çıkar.',
    hint: "tar komutunun sonuna arşivdeki yolu yazarsan sadece o üye çıkar. Yol arşivdeki haliyle olmalı, baştaki / olmadan, emin değilsen önce `tar tzf` ile bak. `-C` hedef dizini belirler ve dizin önceden var olmalı.",
    solution: 'mkdir -p /tmp/www-check\ntar xzvf ~/www-backup.tgz -C /tmp/www-check var/www/html/index.html',
    setup: sh => { vscWww(sh); vscRm(sh, '/tmp/www-check'); },
    check: sh => vscEx(sh, '/tmp/www-check/var/www/html/index.html') },
], { hint: "`x` arşivi çıkarır, `z` gzip'i açar, `-C dizin` hedef dizini belirler. Hedef dizin önceden var olmalı, yoksa tar hata verir. -C vermezsen dosyalar bulunduğun dizine açılır." });

addVariants('ar6', [
  { title: 'Core dump hariç',
    story: "Site log'larını TAC'a göndereceksin ama ~/sitelogs içinde her biri büyük olan .core crash dump'ları var. Onlar arşive girmemeli.",
    task: 'sitelogs dizinini .core dosyaları hariç ~/sitelogs.tgz olarak arşivle.',
    hint: "`--exclude=\"*.core\"` desene uyan dosyaları atlar, tırnak shell'in yıldızı kendisi açmasını engeller. `-C ~` home'a geçer, ardından dizini göreli adıyla verirsin. Sonra `tar tzf` ile .core dosyalarının gerçekten dışarıda kaldığını kontrol et.",
    solution: 'tar czf ~/sitelogs.tgz --exclude="*.core" -C ~ sitelogs\ntar tzf ~/sitelogs.tgz',
    setup: sh => {
      vscRm(sh, VSC_H + '/sitelogs'); vscRm(sh, VSC_H + '/sitelogs.tgz');
      vscPut(sh, VSC_H + '/sitelogs/ist-br-07/wan.log', 'wan1 flap 09.12\n');
      vscPut(sh, VSC_H + '/sitelogs/ist-br-07/agent.core', 'CORE'.repeat(2000));
      vscPut(sh, VSC_H + '/sitelogs/ank-br-02/wan.log', 'lte failover 09.13\n');
      vscPut(sh, VSC_H + '/sitelogs/ank-br-02/agent.core', 'CORE'.repeat(2000));
    },
    check: sh => vscHas(sh, VSC_H + '/sitelogs.tgz', 'sitelogs/ist-br-07/wan.log') && vscHas(sh, VSC_H + '/sitelogs.tgz', 'sitelogs/ank-br-02/wan.log') && !vscHas(sh, VSC_H + '/sitelogs.tgz', '.core') },
  { title: 'Secret ve cache hariç',
    story: "netbox-scripts dizinini bir meslektaşına göndereceksin. İçinde API token'ı taşıyan .env dosyası ve Python cache dosyaları var, ikisi de gitmemeli.",
    task: 'netbox-scripts dizinini .env ve .pyc dosyaları hariç ~/netbox-scripts.tgz olarak arşivle.',
    hint: "`--exclude` birden fazla kez yazılabilir, her biri ayrı bir desen. Gizli dosyanın adını olduğu gibi, cache dosyalarını yıldızlı desenle ver. Secret'ı arşive koymak en sık yapılan sızıntı, arşivi gönderilmeden önce `tar tzf` ile kontrol et.",
    solution: 'tar czf ~/netbox-scripts.tgz --exclude=".env" --exclude="*.pyc" -C ~ netbox-scripts\ntar tzf ~/netbox-scripts.tgz',
    setup: sh => {
      vscRm(sh, VSC_H + '/netbox-scripts'); vscRm(sh, VSC_H + '/netbox-scripts.tgz');
      vscPut(sh, VSC_H + '/netbox-scripts/sync.py', 'import requests\nprint("sync sites")\n');
      vscPut(sh, VSC_H + '/netbox-scripts/README.md', '# netbox-scripts\n');
      vscPut(sh, VSC_H + '/netbox-scripts/.env', 'NETBOX_TOKEN=0123456789abcdef\n', VSC_U, 0o600);
      vscPut(sh, VSC_H + '/netbox-scripts/__pycache__/sync.cpython-312.pyc', 'PYC');
    },
    check: sh => { const p = VSC_H + '/netbox-scripts.tgz'; return vscHas(sh, p, 'netbox-scripts/sync.py') && vscHas(sh, p, 'netbox-scripts/README.md') && !vscHas(sh, p, '.env') && !vscHas(sh, p, '.pyc'); } },
], { hint: "`--exclude=\"desen\"` desene uyan dosyaları atlar, tırnak shell'in deseni kendisi açmasını engeller. `-C ~` önce home'a geçer, ardından verilen göreli dizin arşive kısa yolla girer. Sonra `tar tzf` ile istenmeyen dosyaların gerçekten dışarıda kaldığını kontrol et." });

addVariants('ar7', [
  { title: 'Link down ara',
    story: "Dünkü WAN log'u logrotate tarafından ~/wan1.log.gz olarak sıkıştırılmış. Link'in düştüğü anı bulman lazım, dosyayı açmadan.",
    task: '~/wan1.log.gz dosyasını açmadan `link down` geçen satırı bul.',
    hint: "`zcat` sıkıştırılmış dosyayı açmadan stdout'a basar, diskte açılmış kopya bırakmaz. Çıktıyı `|` ile grep'e verirsin. Aradığın ifade boşluk içerdiği için tırnağa al, yoksa grep ikinci kelimeyi dosya adı sanar.",
    solution: 'zcat ~/wan1.log.gz | grep "link down"',
    setup: sh => { vscPut(sh, VSC_H + '/wan1.log.gz', vscGz('wan1.log', 'Oct 12 09:00:01 wan1 link up\nOct 12 09:12:30 wan1 link down carrier lost\nOct 12 09:13:05 wan1 link up\n')); vscRm(sh, VSC_H + '/wan1.log'); },
    check: (sh, c) => vscRan(c, /zcat|gzip\s+-dc|gunzip\s+-c/) && c.out.includes('wan1 link down carrier lost') && vscEx(sh, VSC_H + '/wan1.log.gz') },
  { title: 'Denemeleri say',
    story: "Geçen haftanın auth log'u ~/auth.log.2.gz olarak arşivlenmiş. Kaç tane başarısız şifre denemesi olduğunu sayacaksın.",
    task: '~/auth.log.2.gz dosyasını açmadan Failed password satırlarını say.',
    hint: "`zcat` içeriği stdout'a döker, `grep -c` eşleşen satırları listelemek yerine sayısını verir. Desen boşluk içerdiği için tırnak şart. `gunzip` kullansaydın arşiv kalıcı olarak açılırdı.",
    solution: 'zcat ~/auth.log.2.gz | grep -c "Failed password"',
    setup: sh => { vscPut(sh, VSC_H + '/auth.log.2.gz', vscGz('auth.log.2', 'Oct 05 02:11:01 sshd[901]: Failed password for root from 203.0.113.45\nOct 05 02:11:04 sshd[901]: Failed password for root from 203.0.113.45\nOct 05 02:30:00 sshd[930]: Accepted publickey for burak from 192.168.1.10\nOct 05 03:01:12 sshd[960]: Failed password for invalid user admin from 198.51.100.23\nOct 05 03:01:15 sshd[960]: Failed password for invalid user admin from 198.51.100.23\n')); },
    check: (sh, c) => vscRan(c, /zcat|gzip\s+-dc|gunzip\s+-c/) && vscRan(c, /grep\s+-c/) && c.out.trim() === '4' },
], { hint: "`zcat` sıkıştırılmış dosyayı açmadan stdout'a basar, diske açılmış kopya bırakmaz. Çıktıyı `|` ile `grep`'e verip istediğin satırı süzersin. `gunzip` kullanırsan dosya kalıcı olarak açılır ve .gz kaybolur." });

addVariants('ar8', [
  { title: 'Rapor klasörü',
    story: "Yönetim Q3 uptime raporlarını zip olarak istiyor, Windows'ta tar.gz açamıyorlar. Raporlar ~/reports/q3 altında.",
    task: 'reports içindeki q3 dizinini ~/q3.zip olarak zip\'le.',
    hint: "`zip -r` dizinin içine özyinelemeli girer, -r olmadan sadece boş dizin girdisi eklenir. Önce `cd ~/reports` ile üst dizine geç, arşivdeki yollar q3 ile başlar. zip'te ilk argüman arşiv adı, sonrakiler eklenecekler.",
    solution: 'cd ~/reports\nzip -r ~/q3.zip q3',
    setup: sh => { vscRm(sh, VSC_H + '/q3.zip'); vscPut(sh, VSC_H + '/reports/q3/uptime.csv', 'site,uptime\nIST-BR-07,99.95\nANK-BR-02,99.80\n'); vscPut(sh, VSC_H + '/reports/q3/incidents.txt', 'INC-1021 wan1 flap\nINC-1044 lte outage\n'); },
    check: sh => vscHas(sh, VSC_H + '/q3.zip', 'q3/uptime.csv') && vscHas(sh, VSC_H + '/q3.zip', 'q3/incidents.txt') },
  { title: 'Seçili dosyalar',
    story: "Muhasebe sadece eylül ve ekim fatura dökümlerini istiyor, ~/lab/exports içindeki diğer dosyalar gitmeyecek.",
    task: '~/lab/exports içindeki fatura-09.csv ve fatura-10.csv dosyalarını ~/faturalar.zip olarak zip\'le.',
    hint: "Tek tek dosya verirken `-r` gerekmez, zip arşiv adından sonra gelen her dosyayı ekler. Önce `cd` ile dizine geç ki arşivde sadece dosya adları olsun. Sonra `unzip -l` ile içeriği kontrol edebilirsin.",
    solution: 'cd ~/lab/exports\nzip ~/faturalar.zip fatura-09.csv fatura-10.csv',
    setup: sh => { vscRm(sh, VSC_H + '/faturalar.zip'); ['08', '09', '10'].forEach(m => vscPut(sh, `${VSC_H}/lab/exports/fatura-${m}.csv`, `ay,tutar\n${m},12000\n`)); vscPut(sh, VSC_H + '/lab/exports/maas.csv', 'gizli\n'); },
    check: sh => { const p = VSC_H + '/faturalar.zip'; return vscHas(sh, p, 'fatura-09.csv') && vscHas(sh, p, 'fatura-10.csv') && !vscHas(sh, p, 'fatura-08.csv') && !vscHas(sh, p, 'maas.csv'); } },
], { hint: "`zip -r arşiv.zip dizin` dizinin içine özyinelemeli girer, `-r` olmadan sadece boş dizin girdisi eklenir. Önce üst dizine `cd` ile geç, böylece arşivdeki yollar kısa kalır. zip arşiv adını ilk argüman olarak alır, tar'daki f gibi." });

addVariants('ar9', [
  { title: 'Raporları aç',
    story: "q3.zip dosyasını kontrol için /tmp altına açacaksın. Önce içinde ne olduğuna bakmak alışkanlık olsun.",
    task: 'q3.zip içeriğini listele, sonra /tmp/q3 dizinine aç.',
    hint: "`unzip -l` arşivi açmadan listeler. `-d dizin` hedefi belirler, dizin yoksa unzip kendisi oluşturur. -d vermezsen her şey bulunduğun dizine açılır.",
    solution: 'unzip -l ~/q3.zip\nunzip ~/q3.zip -d /tmp/q3',
    setup: sh => { if (!vscEx(sh, VSC_H + '/q3.zip')) vscPut(sh, VSC_H + '/q3.zip', sysPack('zip', { members: [vscMember('q3/', ''), vscMember('q3/uptime.csv', 'site,uptime\nIST-BR-07,99.95\n'), vscMember('q3/incidents.txt', 'INC-1021 wan1 flap\n')] })); vscRm(sh, '/tmp/q3'); },
    check: sh => vscEx(sh, '/tmp/q3/q3/uptime.csv') && vscHist(sh, /unzip\s+-l/) },
  { title: 'Vendor dokümanı',
    story: "Üretici yeni firmware ile birlikte ~/Downloads/ion-docs.zip gönderdi. İçeriğe bakıp home altında ion-docs dizinine açacaksın.",
    task: 'ion-docs.zip içeriğini listele, sonra ~/ion-docs dizinine aç.',
    hint: "Önce `unzip -l` ile bak, arşiv dosyaları bir üst dizin içinde mi yoksa düz mü tutuyor gör. `-d ~/ion-docs` hedef dizini verir, yoksa oluşturulur. Düz arşivi -d olmadan açarsan dosyalar Downloads'a dağılır.",
    solution: 'unzip -l ~/Downloads/ion-docs.zip\nunzip ~/Downloads/ion-docs.zip -d ~/ion-docs',
    setup: sh => { vscPut(sh, VSC_H + '/Downloads/ion-docs.zip', sysPack('zip', { members: [vscMember('release-notes.txt', 'ION 6.2.1 release notes\n'), vscMember('upgrade-guide.txt', 'Upgrade once hub, sonra branch\n')] })); vscRm(sh, VSC_H + '/ion-docs'); },
    check: sh => vscEx(sh, VSC_H + '/ion-docs/release-notes.txt') && vscEx(sh, VSC_H + '/ion-docs/upgrade-guide.txt') && vscHist(sh, /unzip\s+-l/) },
], { hint: "`unzip -l` arşivi açmadan listeler. `-d dizin` hedef dizini belirler, yoksa oluşturur. -d vermezsen her şey bulunduğun dizine açılır." });
