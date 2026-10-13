# Kişisel iPhone uygulamaları

İki PWA. Safari ile açılıp Ana Ekrana eklendiğinde tam ekran, offline, native uygulama gibi çalışır. App Store, Xcode veya Apple Developer hesabı gerekmez. İlerleme cihazın kendi depolamasında kalır, sunucu yok.

## Linux Lab

Oynayarak Linux öğrenme. Tarayıcı içinde çalışan sanal bir Ubuntu kabuğu.

- Sanal dosya sistemi, pipe, `>` `>>` `<` `2>` yönlendirme, `&&` `||` `;`, değişkenler, `$(komut)`, glob, script çalıştırma, alias
- 100'e yakın komut. `ls grep awk sed sort uniq cut tr find chmod sudo ps kill systemctl journalctl ip ss ping dig curl tee nano` ve fazlası
- Masaüstü ve iPad'de sol tarafta terminal, sağ panelde görev, adımlar, kısayollar, bölümler, quiz, sözlük ve profil. iPhone'da sekmeli tek sütun
- Profiller. Birden fazla profil, her biri kendi filesystem ve ilerlemesiyle. Cihazlar arası senkron için GitHub Gist, sadece gist yetkili bir token yeter, token cihazda kalır
- Görev bitince popup yok. Terminalde ✔ satırı, panelde tamamlandı kutusu ve 2 saniye sonra sıradaki görev. Profil'den kapatılabilir
- Adımlar. Her görevin çözümü adım listesi olarak panelde, kullandığın komutlar otomatik işaretlenir, Göster ile açılır, yaz ile terminale yazılır
- 22 bölüm, 204 görev. Navigasyon, dosyalar, pipe, permission, process, network, olay yeri incelemesi, script, bash programlama, vim, git
- Gerçekçi senaryolar. Bozuk nginx config'ini bulup düzeltmek, cryptominer süreci, auth.log içinden ssh brute force analizi, /tmp altındaki backdoor
- Bash bölümü. if, for, while, case, function, exit code ile gerçek script'ler, crontab ve `cron-tick` ile cron simülasyonu
- Vim bölümü. Gerçek tuş sırasıyla çalışan vim modeli, `:wq` `dd` `yy` `p` `/` `:%s`
- SD-WAN TAC bölümü. Branch jump box'ında ION event log, path MTU, tcpdump pcap okuma, policy routing, iptables ile engellenen hub trafiği, DNS yanlış resolver, strongSwan NO_PROPOSAL_CHOSEN, openssl ile expired cert. 12 görev, kök neden raporu ile biter
- Netops bölümü. ethtool, ARP, ip_forward, sysctl, conntrack, nft masquerade, mtr, policy table. 10 görev
- Git bölümü. Network config repo'sunda `git log`, `blame`, `diff`, `stash`, `bisect` ile kötü commit'i bulma ve düzeltme
- Günün görevleri. Her gün 3 görev, tamamlayınca bonus XP
- Zorluk. Guided görev ve ipucu açık, normal, expert görev metni gizli ve XP artırılmış
- Öğrendiklerim. Terminalde gerçekten kullandığın komutlardan kişisel cheat sheet, kopyalanabilir
- XP, seviye, gün serisi, rozetler, quiz, aranabilir komut sözlüğü
- iPhone klavyesi için Tab, ok tuşları ve özel karakter çubuğu

## A2 Nederlands

Inburgeringsexamen A2 hazırlığı. İçerik Hollandaca, arayüz Türkçe veya İngilizce.

- Profiller. Burak ve Bahu hazır gelir, yeni profil eklenip silinebilir. İlerleme, ayarlar ve dil profil başına ayrı ve kalıcı
- Woorden. 17 tema, 515 kelime, SM-2 tarzı aralıklı tekrar, de of het hız oyunu, yazarak test
- Kelime defteri. Metinde dokunduğun herhangi bir kelimeyi deftere ekle, flashcard havuzuna girer
- A1 başlangıç paketi. Profil'den açılır. 344 temel kelime, 5 kolay ders, alfabe ve isim heceleme. Bahu için
- Lezen, Luisteren. 16 metin, 16 diyalog. Her Hollandaca kelimeye dokununca çeviri, şıklarda basılı tut
- Schrijven. Yazdığın metin düzeltilmiş haliyle ve kelime kelime farkla gelir. Sıra şöyle. Claude API anahtarı varsa Claude ile tam düzeltme ve puan. Yoksa anahtarsız ücretsiz LanguageTool ile yazım ve dilbilgisi düzeltmesi. İnternet yoksa de/het, fiil çekimi, yazım ve büyük harf için offline kurallar
- Spreken. Kaydet, dinle, söylediğin metni kontrol ettir. Metin konuşma tanımadan ya da klavye diktesinden gelir, Claude ile ya da temel kurallarla puanlanır
- KNM. 100 soru artı 24 görsel soru, trafik levhası, çöp konteyneri, DigiD ekranı gibi SVG çizimlerle. Açıklamalı, hatalarım listesi
- Shadowing. Cümleyi dinle, tekrar et, kelime kelime karşılaştırma ve yüzde. Luisteren satırlarından ve Spreken örnek cevaplarından da açılır
- Grammatica. 15 ders, 201 alıştırma, 40 fiillik çekim antrenörü
- Examen. KNM 40 soru 45 dakika, Lezen ve Luisteren denemeleri
- Sınav günü. Beş bölüm arka arkaya, gerçek süreler, aralarda mola, Schrijven ve Spreken de puanlanır, parça parça sonuç
- Zayıf noktalar. Gramer konusu, KNM teması ve kelime teması bazında başarı takibi, ana ekranda en zayıf 3 konu ve tek dokunuşla alıştırma
- Haftalık rapor ve hatırlatma. Bu hafta ve geçen hafta karşılaştırması, takvim dosyası ile günlük hatırlatma
- Gerçek ses kayıtları. Mac'te `node tools/make-audio.mjs` Luisteren diyaloglarını Claire ve Xander sesiyle m4a üretir, uygulama varsa onları kullanır
- Ses. iPhone'daki en iyi Hollandaca ses otomatik seçilir, Enhanced Xander ve Claire önerilir
- Yedek indir ve yükle

Ücretsiz düzeltme [LanguageTool](https://github.com/languagetool-org/languagetool) public API ile yapılır, anahtar gerekmez, Profil sekmesinden kapatılabilir. Claude entegrasyonu için Profil sekmesine Anthropic API anahtarı girilir. Anahtar sadece cihazda saklanır. SDK `dutch-a2/vendor` altında yerel olarak gelir, CDN gerekmez.

## NetDevOps Lab

Orta ve ileri seviye uygulamalı NetDevOps eğitimi. Linux Lab ile aynı sanal shell ve arayüz, artı gerçek Python ve simüle altyapı.

- Python 3.14 tarayıcıda, Pyodide ile. pytest, pyyaml, jinja2, lxml hazır, çevrimdışı çalışır. Pipe ve yönlendirme Python çıktısıyla çalışır, Python'un yazdığı dosyalar sanal diskte görünür
- Editor sekmesi. Dosya gezgini, Tab girintisi, Kaydet, tek tuşla python3 veya pytest
- Cihazlar. r1.lab ve r2.lab IOS-XE simülasyonu, SSH show komutları, NETCONF running ve candidate datastore, RESTCONF, gNMI. ncclient, pygnmi, netmiko ve requests kütüphaneleri gerçek API imzalarıyla simülatöre bağlı
- Simülatörler. api.lab REST API, GitHub Actions ve GitLab CI runner, docker ve compose, kubectl, ansible ve ansible-playbook, terraform, pyang, gnmic
- 13 bölüm, 156 görev, 128 quiz. Python 16, Unit ve Integration Test 12, Git Workflow 14, REST API 12, CI ve CD 12, Docker 12, Kubernetes 12, YANG 10, NETCONF 12, RESTCONF 10, gNMI 10, Ansible 12, Terraform 12
- Profiller ve GitHub Gist senkronu Linux Lab ile aynı

Modül sözleşmesi `netdevops-lab/CONTRACT.md` içinde. Test `tests/netdevops.test.js` her görevin çözümünü gerçek Pyodide ile Chromium içinde oynatır, `tests/netdevops.e2e.js` arayüzü test eder.

## Testler

```
python3 -m http.server 8765 &
node tests/linux.test.js
NODE_PATH=$(npm root -g) node tests/linux.e2e.js
NODE_PATH=$(npm root -g) node tests/netdevops.test.js
NODE_PATH=$(npm root -g) node tests/netdevops.e2e.js
NODE_PATH=$(npm root -g) node tests/a2.e2e.js
```

Linux arayüz testi masaüstü ve iPhone düzenini, otomatik görev geçişini, profilleri ve sahte GitHub API ile iki cihaz arası senkronu çalıştırır. A2 testi Playwright ile iPhone 13 ekranında her ekranı, her içerik öğesini, iki dili, iki profili, yedeklemeyi ve sahte API yanıtıyla Claude düzeltme akışını çalıştırır.

## Yayınlama

Repo public olduğu için GitHub Pages ücretsiz.

1. GitHub'da repo Settings, Pages, Source olarak GitHub Actions seç
2. Bu branch'e veya main'e her push'ta `.github/workflows/pages.yml` siteyi yayınlar
3. Adres `https://<kullanıcı>.github.io/mypublic/`

## Yerelde çalıştırma

```
python3 -m http.server 8000
```

Sonra `http://localhost:8000` aç.
