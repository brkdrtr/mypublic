'use strict';
/* Git bolumu. ~/netconfigs repo'sunda outage'a sebep olan commit'i bul, duzelt, commit'le.
   Yardimcilar missions.js'tekilerle ayni isimde olamaz, ayni global scope'ta yasiyorlar. */

const G_REPO = '/home/burak/netconfigs';
const G_BAD = '2c7d4f0';
const gFile = (sh, p, s) => { const n = sh.node(p); return !!(n && n.t === 'f' && n.d.includes(s)); };
const gRan = (ctx, re) => re.test(ctx.line);
const gSub = (ctx, ...answers) => ctx.submit != null && answers.some(a => String(ctx.submit).trim().toLowerCase() === String(a).toLowerCase());
const gState = sh => { const n = sh.node(G_REPO + '/.git/lab-state.json'); try { return n ? JSON.parse(n.d) : null; } catch (e) { return null; } };
const gHeadCommit = sh => { const st = gState(sh); return st ? st.commits.find(c => c.hash === st.head) || null : null; };
const gChanged = (st, c) => {
  const p = c.parent ? st.commits.find(x => x.hash === c.parent).files : {};
  return Array.from(new Set(Object.keys(p).concat(Object.keys(c.files)))).filter(f => p[f] !== c.files[f]).sort();
};

CHAPTERS.push({
  id: 'git', icon: '🌿', title: 'Git ile Config Yönetimi', sub: "Outage'ı getiren commit'i bul, düzelt, commit'le",
  missions: [
    { id: 'g1', title: 'Repo durumu', xp: 15,
      story: "Pazartesi gecesi change window'da branch config'leri deploy edildi. Gece ikiden sonra branch-ams-01 ile PE arasındaki BGP session hold timer expired ile düşmeye başladı, üç dakikada bir up down. Config'lerin source of truth'u ~/netconfigs repo'su. İşe repo'nun durumuna bakarak başla, commit edilmemiş ne var, kim ne bırakmış.",
      task: "netconfigs repo'suna gir ve working tree durumunu göster.", hint: 'cd ~/netconfigs sonra git status',
      solution: 'cd ~/netconfigs\ngit status',
      check: (sh, c) => gRan(c, /^git status/) && (c.out.includes('On branch') || c.out.includes('HEAD detached')) },
    { id: 'g2', title: 'Geçmişi oku', xp: 15,
      story: "Deploy edilen şey HEAD'deki snapshot. Ondan önce kim ne commit etmiş, hangi sırayla, görmek lazım. git log her commit'i hash, author, tarih ve mesajla listeler, --oneline ile hepsi tek satıra iner. Tag'leri de görürsün, v1.0 son stabil deploy.",
      task: "Commit geçmişini tek satırlık formatta listele.", hint: 'git log --oneline. Sadece bir kişinin commit\'leri için --author=isim',
      solution: 'cd ~/netconfigs\ngit log --oneline',
      check: (sh, c) => gRan(c, /^git log/) && c.out.includes('lower WAN mtu') },
    { id: 'g3', title: 'Kim yazdı', xp: 20,
      story: "Outage notlarında ping df-bit 1472 geçmiyor, 1372 geçiyor yazıyor. Yani branch-ams-01 WAN tarafında MTU ile oynanmış. git blame dosyanın her satırının hangi commit'ten, kimden ve ne zaman geldiğini gösterir. Satırın yanındaki hash seni doğrudan suçlu commit'e götürür.",
      task: "branch-ams-01.conf dosyasına blame çek, mtu satırının yanındaki hash ve ismi not al.", hint: 'git blame branch-ams-01.conf',
      solution: 'cd ~/netconfigs\ngit blame branch-ams-01.conf',
      check: (sh, c) => gRan(c, /^git blame\b.*branch-ams-01\.conf/) && c.out.includes('mtu 1400') },
    { id: 'g4', title: 'İki commit arası fark', xp: 20,
      story: "v1.0 tag'i 16 Eylül'deki stabil deploy'u işaretliyor, o gün her şey çalışıyordu. O günden bugüne branch-ams-01.conf'ta ne değişti, satır satır görelim. git diff iki commit'i karşılaştırır, sona -- dosya eklersen sadece o dosyayı gösterir. Eksi satırlar eski hal, artı satırlar yeni hal.",
      task: 'v1.0 ile HEAD arasında branch-ams-01.conf farkını göster.', hint: 'git diff v1.0 HEAD -- branch-ams-01.conf. v1.0..HEAD yazımı da aynı şey',
      solution: 'cd ~/netconfigs\ngit diff v1.0 HEAD -- branch-ams-01.conf',
      check: (sh, c) => gRan(c, /^git diff\s+\S+(\.\.\.?|\s+)\S+/) && c.out.includes('+ mtu 1400') },
    { id: 'g5', title: 'Kenara koy', xp: 20,
      story: "Suçlu commit'i kesin bulmak için git bisect kullanacağız ama bisect her adımda eski bir snapshot'ı working tree'ye checkout eder. branch-rtm-02.conf'ta senin yarım kalmış NTP değişikliğin var, checkout onu ezer, git de zaten izin vermez. git stash değişiklikleri kenara alır ve working tree'yi temizler, iş bitince git stash pop ile geri getirirsin.",
      task: 'Commit edilmemiş değişiklikleri stash\'e al, working tree temiz olsun.', hint: 'git stash, sonra git status ile doğrula',
      solution: 'cd ~/netconfigs\ngit stash',
      check: (sh, c) => { const st = gState(sh); return gRan(c, /^git stash\b/) && !!st && st.stash.length > 0 && !gFile(sh, G_REPO + '/branch-rtm-02.conf', 'ntp server 10.0.50.11'); } },
    { id: 'g6', title: 'Bisect ile suçluyu bul', xp: 40,
      story: "Elimizde iyi bir nokta var, v1.0. Kötü nokta HEAD. Arada altı commit var, hepsini tek tek açmak yerine binary search yap. git bisect start de, sonra git bisect bad ile HEAD'i kötü, git bisect good v1.0 ile tag'i iyi işaretle. git ortadaki commit'i checkout eder. Her adımda ./check-policy.sh çalıştır, OK derse git bisect good, FAIL derse git bisect bad. Üç adımda git sana ilk kötü commit'i söyler. Bu yöntem bin commit'te de on adımda biter.",
      task: "bisect ile outage'ı getiren ilk kötü commit'i bul.", hint: 'git bisect start, git bisect bad, git bisect good v1.0, sonra her adımda ./check-policy.sh ve good ya da bad. Tembel yol git bisect run ./check-policy.sh',
      solution: 'cd ~/netconfigs\ngit bisect start\ngit bisect bad\ngit bisect good v1.0\n./check-policy.sh\ngit bisect bad\n./check-policy.sh\ngit bisect bad\n./check-policy.sh\ngit bisect good',
      check: (sh, c) => gRan(c, /^git bisect/) && c.out.includes('is the first bad commit') && c.out.includes(G_BAD) },
    { id: 'g7', title: 'Kötü commit\'i incele', xp: 20,
      story: "Suçlu belli. Bisect işini bitirdiğinde git bisect reset ile main'e dön, çünkü HEAD hâlâ detached halde eski bir snapshot'ta duruyor. Sonra git show ile o commit'in mesajını ve diff'ini oku. Mesaj GRE overhead diyor ama değişiklik Tunnel0'a değil fiziksel WAN interface'ine yapılmış. Tunnel0'da zaten ip mtu 1400 var, fiziksel linkte 1400 olunca PE'den gelen 1500 byte'lık BGP update'ler düşüyor, hold timer expired.",
      task: "bisect'ten çık ve kötü commit'i git show ile göster.", hint: 'git bisect reset, sonra git show 2c7d4f0. HEAD~4 de aynı commit',
      solution: 'cd ~/netconfigs\ngit bisect reset\ngit show 2c7d4f0',
      check: (sh, c) => { const st = gState(sh); return gRan(c, /^git show\b/) && c.out.includes('+ mtu 1400') && !!st && !st.bisect; } },
    { id: 'g8', title: 'Satırı düzelt', xp: 30,
      story: "Düzeltme tek satır, GigabitEthernet0/0/0 altındaki mtu 1400 tekrar mtu 1500 olacak. Dikkat, git checkout v1.0 -- branch-ams-01.conf dersen Ayşe'nin sonradan eklediği syslog collector değişikliğini de geri alırsın. O yüzden sadece ilgili satırı düzelt, nano ile ya da sed -i ile, nasıl rahatsan. git revert 2c7d4f0 da olur, o doğrudan ters commit üretir.",
      task: 'branch-ams-01.conf içindeki WAN interface mtu değerini 1500 yap, syslog satırına dokunma.', hint: "nano branch-ams-01.conf ve 14. satır. Ya da sed -i 's/^ mtu 1400/ mtu 1500/' branch-ams-01.conf",
      solution: 'cd ~/netconfigs\nnano branch-ams-01.conf',
      editorContent: old => old.replace(/^ mtu 1400$/m, ' mtu 1500'),
      check: sh => { const n = sh.node(G_REPO + '/branch-ams-01.conf'); return !!n && n.t === 'f' && !/^ mtu 1400$/m.test(n.d) && /^ mtu 1500$/m.test(n.d) && n.d.includes('logging host 10.0.50.25'); } },
    { id: 'g9', title: 'Stash\'i geri al', xp: 15,
      story: "Bisect bitti, working tree'de artık sadece senin fix'in var. Kenara koyduğun NTP değişikliğini geri getir. git stash pop en üstteki stash'i uygular ve listeden siler, git stash apply ise uygular ama listede bırakır. git stash list ile ne birikmiş görürsün.",
      task: "Stash'teki değişikliği working tree'ye geri getir.", hint: 'git stash pop',
      solution: 'cd ~/netconfigs\ngit stash pop',
      check: (sh, c) => gRan(c, /^git stash (pop|apply)/) && gFile(sh, G_REPO + '/branch-rtm-02.conf', 'ntp server 10.0.50.11') },
    { id: 'g10', title: 'Kim yaptı', xp: 15,
      story: "Postmortem yazarken değişikliği kimin yaptığı gerekir. Suçlamak için değil, bir sonraki MTU değişikliğinde review'a kimi çağıracağını bilmek için. Bisect çıktısında ve git show'da Author satırı var, git log --format ile de sadece ismi çekebilirsin.",
      task: "Kötü commit'in author'ını submit ile gönder.", hint: 'git log -1 --format=%an 2c7d4f0 ya da git show 2c7d4f0 | head -3. Cevap submit Ad Soyad',
      solution: 'cd ~/netconfigs\ngit log -1 --format=%an 2c7d4f0\nsubmit Ayşe Kaya',
      check: (sh, c) => gSub(c, 'Ayşe Kaya', 'Ayse Kaya', 'ayşe', 'ayse', 'ayse@netlab.local') },
    { id: 'g11', title: 'Fix\'i commit\'le', xp: 35,
      story: "Fix working tree'de ama repo bilmiyor, repo bilmeyince Pazartesi deploy'u da bilmez. Sadece branch-ams-01.conf'u stage et, NTP işin henüz bitmedi onu karıştırma. Commit mesajı repo convention'ına uysun, hostname ile başla, neyi neden düzelttiğini yaz. Sonra git push dene, bakalım lab ne diyecek.",
      task: "branch-ams-01.conf fix'ini anlamlı bir mesajla commit'le.", hint: 'git add branch-ams-01.conf, sonra git commit -m ile mesaj. Mesajda mtu geçsin, sadece o dosya değişsin',
      solution: 'cd ~/netconfigs\ngit add branch-ams-01.conf\ngit commit -m "branch-ams-01: restore WAN mtu 1500, fixes BGP flap to ams-pe1"\ngit push',
      check: sh => {
        const st = gState(sh); const h = gHeadCommit(sh);
        if (!st || !h || !h.parent) return false;
        const ch = gChanged(st, h);
        return h.author === 'Burak Dartar' && /mtu/i.test(h.message) && h.message.trim().length >= 15 && ch.length === 1 && ch[0] === 'branch-ams-01.conf' && !/^ mtu 1400$/m.test(h.files['branch-ams-01.conf']) && /^ mtu 1500$/m.test(h.files['branch-ams-01.conf']);
      } },
  ],
});

QUIZ.push(
  { q: 'git bisect ne yapar?', a: ["İyi ve kötü commit arasında binary search ile ilk kötü commit'i bulur", "Branch'leri birleştirir", 'Dosyayı iki parçaya böler', 'Remote ile senkron eder'], c: 0 },
  { q: 'git blame dosya ne gösterir?', a: ['Her satırı hangi commit\'in ve kimin yazdığını', 'Dosyadaki syntax hatalarını', 'Dosyayı kimin sildiğini', 'Sadece son commit mesajını'], c: 0 },
  { q: 'git stash ne işe yarar?', a: ["Commit edilmemiş değişiklikleri kenara alır, working tree temizlenir", "Son commit'i siler", 'Yeni branch oluşturur', "Remote'a push eder"], c: 0 },
  { q: 'HEAD~2 neyi ifade eder?', a: ["HEAD'in iki önceki commit'ini", 'İki commit sonrasını', "İkinci branch'i", 'İki tag önceki sürümü'], c: 0 },
  { q: 'git diff v1.0 HEAD -- dosya ne yapar?', a: ['İki commit arasında sadece o dosyanın farkını gösterir', 'Dosyayı v1.0 haline döndürür', "v1.0 tag'ini siler", 'Dosyayı stage eder'], c: 0 },
  { q: 'git add ile git commit arasındaki fark?', a: ["add değişikliği index'e alır, commit index'i kalıcı kaydeder", 'İkisi aynı işi yapar', "add remote'a yollar", 'commit dosyayı siler'], c: 0 },
  { q: "Working tree'de değişiklik varken git checkout neden reddedilir?", a: ['Checkout değişikliği ezebilir, önce commit ya da stash gerekir', 'Git her zaman reddeder', 'Sadece root checkout yapabilir', 'Network olmadığı için'], c: 0 },
  { q: 'git revert ile git reset --hard farkı?', a: ['revert geçmişi koruyup ters bir commit üretir, reset geçmişi geri sarar', 'İkisi de geçmişi siler', 'revert sadece remote içindir', 'Fark yok'], c: 0 },
);

BADGES.push({ id: 'git', icon: '🌿', title: 'Bisect Ustası', desc: 'Git bölümünü bitir', test: s => CHAPTERS.find(c => c.id === 'git').missions.every(m => s.done.includes(m.id)) });
