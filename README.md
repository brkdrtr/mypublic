# Kişisel iPhone uygulamaları

İki PWA. Safari ile açılıp Ana Ekrana eklendiğinde tam ekran, offline, native uygulama gibi çalışır. App Store, Xcode veya Apple Developer hesabı gerekmez. İlerleme cihazın kendi depolamasında kalır, sunucu yok.

## Linux Lab

Oynayarak Linux öğrenme. Tarayıcı içinde çalışan sanal bir Ubuntu kabuğu.

- Sanal dosya sistemi, pipe, `>` `>>` `<` `2>` yönlendirme, `&&` `||` `;`, değişkenler, `$(komut)`, glob, script çalıştırma, alias
- 100'e yakın komut. `ls grep awk sed sort uniq cut tr find chmod sudo ps kill systemctl journalctl ip ss ping dig curl tee nano` ve fazlası
- 9 bölüm, 71 görev. Navigasyon, dosyalar, pipe, permission, process, network, olay yeri incelemesi, script
- Gerçekçi senaryolar. Bozuk nginx config'ini bulup düzeltmek, cryptominer süreci, auth.log içinden ssh brute force analizi, /tmp altındaki backdoor
- XP, seviye, gün serisi, rozetler, quiz, aranabilir komut sözlüğü
- iPhone klavyesi için Tab, ok tuşları ve özel karakter çubuğu

## A2 Nederlands

Inburgeringsexamen A2 hazırlığı. İçerik Hollandaca, arayüz Türkçe veya İngilizce.

- İki profil, Burak ve Bahu. İlerleme, ayarlar ve dil profil başına ayrı
- Woorden. 17 tema, 515 kelime, SM-2 tarzı aralıklı tekrar, de of het hız oyunu, yazarak test
- Lezen, Luisteren. 16 metin, 16 diyalog. Her Hollandaca kelimeye dokununca çeviri, şıklarda basılı tut
- Schrijven. Yazdığın metin düzeltilmiş haliyle ve kelime kelime farkla gelir. Sıra şöyle. Claude API anahtarı varsa Claude ile tam düzeltme ve puan. Yoksa anahtarsız ücretsiz LanguageTool ile yazım ve dilbilgisi düzeltmesi. İnternet yoksa de/het, fiil çekimi, yazım ve büyük harf için offline kurallar
- Spreken. Kaydet, dinle, söylediğin metni kontrol ettir. Metin konuşma tanımadan ya da klavye diktesinden gelir, Claude ile ya da temel kurallarla puanlanır
- KNM. 100 soru, açıklamalı, hatalarım listesi
- Grammatica. 15 ders, 201 alıştırma, 40 fiillik çekim antrenörü
- Examen. KNM 40 soru 45 dakika, Lezen ve Luisteren denemeleri
- Ses. iPhone'daki en iyi Hollandaca ses otomatik seçilir, Enhanced Xander ve Claire önerilir
- Yedek indir ve yükle

Ücretsiz düzeltme [LanguageTool](https://github.com/languagetool-org/languagetool) public API ile yapılır, anahtar gerekmez, Profil sekmesinden kapatılabilir. Claude entegrasyonu için Profil sekmesine Anthropic API anahtarı girilir. Anahtar sadece cihazda saklanır. SDK `dutch-a2/vendor` altında yerel olarak gelir, CDN gerekmez.

## Testler

```
python3 -m http.server 8765 &
node tests/linux.test.js
NODE_PATH=$(npm root -g) node tests/a2.e2e.js
```

A2 testi Playwright ile iPhone 13 ekranında her ekranı, her içerik öğesini, iki dili, iki profili, yedeklemeyi ve sahte API yanıtıyla Claude düzeltme akışını çalıştırır.

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
