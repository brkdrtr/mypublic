# Komut açıklama sözlüğü, veri biçimi

Motor `explain.js`, veri `explain-db.js` (Linux Lab komutları) ve `../netdevops-lab/explain-db-nd.js` (NetDevOps komutları).
Veri dosyası şöyle başlar ve sadece ekleme yapar.

```js
'use strict';
Object.assign(EXPLAIN_DB, {
  cut: {
    d: 'Her satırdan seçilen alanları ya da karakterleri keser',      // komutun ne yaptığı, tek cümle
    o: {                                                              // seçenekler, kısa ve uzun
      '-d': { a: 'ayırıcı', t: 'Alan ayırıcı karakter. Varsayılan Tab, /etc/passwd için -d:' },
      '-f': { a: 'alanlar', t: 'Seçilecek alan numaraları', f: 'list' },
      '-c': { a: 'karakterler', t: 'Alan yerine karakter konumu seç', f: 'list' },
      '--complement': { t: 'Seçimin tersini bas' },
    },
    al: { '--delimiter': '-d', '--fields': '-f' },                   // eş anlamlı yazımlar, anahtar takma ad, değer o içindeki asıl anahtar
    pos: ['dosya...'],                                                // pozisyonel argüman adları, son öğe ... ile biterse tekrar eder
    ex: [['cut -d: -f1 /etc/passwd', 'Kullanıcı adlarını listeler']], // 2 ile 4 örnek, gerçek ve faydalı
    tip: 'Birden fazla boşlukla ayrılmış sütunlarda cut zorlanır, awk kullan',  // isteğe bağlı, sık hata
  },
});
```

Alanlar
- `d` komut açıklaması. `o` seçenekler. Her seçenek `t` açıklama, değer alıyorsa `a` değerin adı.
- `f` değer biçimleyici, motor değeri yorumlar. Kullanılabilir değerler `list` (1,3 ve 2-4), `sortkey` (sort -k 2,2n), `mode` (chmod 755, u+x), `owner` (user:group), `size` (find -size +100M), `time` (find -mtime -1), `signal` (9, TERM), `regex`, `glob`, `dateFmt` (+%F), `type` (find -type f), `perm` (find -perm).
- `al` eş anlamlılar. `-r` ile `-R` aynıysa `al: {'-R': '-r'}`.
- `pos` pozisyonel argüman etiketleri, örnek `['kaynak', 'hedef']`, `['desen', 'dosya...']`.
- `sp` özel yorumlayıcı. `awk` ilk argüman program, `sed` script, `grep` ilk argüman regex, `find` tek tireli uzun koşullar ve -exec, `chmod` mod, `chown` sahip, `tar` tiresiz harf demeti, `ps` BSD stili harfler (`bsd: {a: '...', u: '...', x: '...'}` alanıyla), `dd` anahtar=değer (`kv: {if: '...', of: '...'}`), `date` +FORMAT, `tr` küme, `kill` sinyal, `wrap` seçeneklerden sonrası başka bir komuttur (sudo, xargs, watch, nohup, time, nice, timeout).
- `single: true` tek tire ile uzun seçenek, harf demeti yok. find, tcpdump ifadeleri, java benzeri araçlar.
- `num` sayı kısayolu açıklaması, head -5 için `num: 'Satır sayısı, -n 5 ile aynı'`. `numf` biçimleyici adı, kill -9 için `numf: 'signal'`.
- `sub` alt komutlar, `ip addr show`, `git log`, `systemctl restart`. Her alt komut kendi `d`, `o`, `al`, `pos`, `sub` alanlarına sahip olabilir, `al2: ['a', 'address']` kısaltmalar. Üst komutun seçenekleri alt komutta da geçerli.

Kurallar
- Türkçe açıklama, Linux terimleri İngilizce. Em dash, en dash, parantez, iki nokta ve ** yok. Açıklama kısa, tek ya da iki cümle, neden kullanılır sorusuna cevap verir.
- Komutun gerçek GNU ve Linux davranışı. Lab'da olmayan ama gerçekte sık kullanılan önemli seçenekler de eklenir.
- Kontrol, `node tests/explain.test.js` tüm görev çözümlerinde ve varyantlarda bilinmeyen komut ya da seçenek kalmadığını doğrular.
