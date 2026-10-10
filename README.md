# Kişisel iPhone uygulamaları

İki PWA. Safari ile açılıp Ana Ekrana eklendiğinde tam ekran, offline, native uygulama gibi çalışır. App Store, Xcode veya Apple Developer hesabı gerekmez. İlerleme cihazın kendi depolamasında kalır, sunucu yok.

## Linux Lab

Oynayarak Linux öğrenme. Tarayıcı içinde çalışan sanal bir Ubuntu kabuğu.

- Sanal dosya sistemi, pipe, `>` `>>` `<` `2>` yönlendirme, `&&` `||` `;`, değişkenler, `$(komut)`, glob, script çalıştırma, alias
- 100'e yakın komut. `ls grep awk sed sort uniq cut tr find chmod sudo ps kill systemctl journalctl ip ss ping dig curl tee nano` ve fazlası
- 9 bölüm, 71 görev. Navigasyon, dosyalar, pipe, izinler, süreçler, ağ, olay yeri incelemesi, script
- Gerçekçi senaryolar. Bozuk nginx config'ini bulup düzeltmek, cryptominer süreci, auth.log içinden ssh brute force analizi, /tmp altındaki backdoor
- XP, seviye, gün serisi, rozetler, quiz, aranabilir komut sözlüğü
- iPhone klavyesi için Tab, ok tuşları ve özel karakter çubuğu

## A2 Nederlands

Inburgeringsexamen A2 hazırlığı. Arayüz Türkçe, içerik Hollandaca.

- Woorden. Temalara ayrılmış kelimeler, SM-2 tarzı aralıklı tekrar, de of het hız oyunu, yazarak test
- Lezen. Sınav tarzı kısa metinler, kelimeye dokununca anlam
- Luisteren. Diyaloglar cihazın Hollandaca sesiyle okunur, kadın ve erkek ses ayrı
- Schrijven. Form doldurma ve mesaj yazma, istenen noktaların otomatik kontrolü, örnek cevap
- Spreken. Soruyu dinle, cevabını kaydet, dinle, örnek cevapla karşılaştır
- KNM. Temalara göre sorular, Türkçe açıklama, hatalarım listesi
- Grammatica. Dersler ve alıştırmalar, fiil çekimi antrenörü
- Examen. Süreli deneme sınavları ve geçmiş sonuçlar
- Günlük plan, sınav geri sayımı, yedek indir ve yükle

Daha doğal ses için iPhone'da Ayarlar, Erişilebilirlik, Seslendirilen İçerik, Sesler, Nederlands altından gelişmiş bir ses indir.

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
