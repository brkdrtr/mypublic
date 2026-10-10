'use strict';

// Fiil çekim tablosu. ik, jij, hij ve wij şimdiki zaman, pv ik ile geçmiş zaman, perf geçmiş zaman ortacı.
// Ayrılabilen fiillerde ana cümle biçimi yazılır, ön ek sondadır.

const VERBS = [
  { inf: 'zijn', tr: 'olmak', ik: 'ben', jij: 'bent', hij: 'is', wij: 'zijn', pv: 'was', perf: 'geweest', aux: 'zijn' },
  { inf: 'hebben', tr: 'sahip olmak', ik: 'heb', jij: 'hebt', hij: 'heeft', wij: 'hebben', pv: 'had', perf: 'gehad', aux: 'hebben' },
  { inf: 'gaan', tr: 'gitmek', ik: 'ga', jij: 'gaat', hij: 'gaat', wij: 'gaan', pv: 'ging', perf: 'gegaan', aux: 'zijn' },
  { inf: 'komen', tr: 'gelmek', ik: 'kom', jij: 'komt', hij: 'komt', wij: 'komen', pv: 'kwam', perf: 'gekomen', aux: 'zijn' },
  { inf: 'doen', tr: 'yapmak', ik: 'doe', jij: 'doet', hij: 'doet', wij: 'doen', pv: 'deed', perf: 'gedaan', aux: 'hebben' },
  { inf: 'kunnen', tr: 'yapabilmek', ik: 'kan', jij: 'kunt', hij: 'kan', wij: 'kunnen', pv: 'kon', perf: 'gekund', aux: 'hebben' },
  { inf: 'willen', tr: 'istemek', ik: 'wil', jij: 'wilt', hij: 'wil', wij: 'willen', pv: 'wilde', perf: 'gewild', aux: 'hebben' },
  { inf: 'mogen', tr: 'izinli olmak', ik: 'mag', jij: 'mag', hij: 'mag', wij: 'mogen', pv: 'mocht', perf: 'gemogen', aux: 'hebben' },
  { inf: 'moeten', tr: 'zorunda olmak', ik: 'moet', jij: 'moet', hij: 'moet', wij: 'moeten', pv: 'moest', perf: 'gemoeten', aux: 'hebben' },
  { inf: 'eten', tr: 'yemek yemek', ik: 'eet', jij: 'eet', hij: 'eet', wij: 'eten', pv: 'at', perf: 'gegeten', aux: 'hebben' },
  { inf: 'drinken', tr: 'içmek', ik: 'drink', jij: 'drinkt', hij: 'drinkt', wij: 'drinken', pv: 'dronk', perf: 'gedronken', aux: 'hebben' },
  { inf: 'lezen', tr: 'okumak', ik: 'lees', jij: 'leest', hij: 'leest', wij: 'lezen', pv: 'las', perf: 'gelezen', aux: 'hebben' },
  { inf: 'schrijven', tr: 'yazmak', ik: 'schrijf', jij: 'schrijft', hij: 'schrijft', wij: 'schrijven', pv: 'schreef', perf: 'geschreven', aux: 'hebben' },
  { inf: 'spreken', tr: 'konuşmak', ik: 'spreek', jij: 'spreekt', hij: 'spreekt', wij: 'spreken', pv: 'sprak', perf: 'gesproken', aux: 'hebben' },
  { inf: 'zien', tr: 'görmek', ik: 'zie', jij: 'ziet', hij: 'ziet', wij: 'zien', pv: 'zag', perf: 'gezien', aux: 'hebben' },
  { inf: 'geven', tr: 'vermek', ik: 'geef', jij: 'geeft', hij: 'geeft', wij: 'geven', pv: 'gaf', perf: 'gegeven', aux: 'hebben' },
  { inf: 'nemen', tr: 'almak', ik: 'neem', jij: 'neemt', hij: 'neemt', wij: 'nemen', pv: 'nam', perf: 'genomen', aux: 'hebben' },
  { inf: 'kopen', tr: 'satın almak', ik: 'koop', jij: 'koopt', hij: 'koopt', wij: 'kopen', pv: 'kocht', perf: 'gekocht', aux: 'hebben' },
  { inf: 'brengen', tr: 'getirmek, götürmek', ik: 'breng', jij: 'brengt', hij: 'brengt', wij: 'brengen', pv: 'bracht', perf: 'gebracht', aux: 'hebben' },
  { inf: 'denken', tr: 'düşünmek', ik: 'denk', jij: 'denkt', hij: 'denkt', wij: 'denken', pv: 'dacht', perf: 'gedacht', aux: 'hebben' },
  { inf: 'vinden', tr: 'bulmak, düşünmek', ik: 'vind', jij: 'vindt', hij: 'vindt', wij: 'vinden', pv: 'vond', perf: 'gevonden', aux: 'hebben' },
  { inf: 'beginnen', tr: 'başlamak', ik: 'begin', jij: 'begint', hij: 'begint', wij: 'beginnen', pv: 'begon', perf: 'begonnen', aux: 'zijn' },
  { inf: 'blijven', tr: 'kalmak', ik: 'blijf', jij: 'blijft', hij: 'blijft', wij: 'blijven', pv: 'bleef', perf: 'gebleven', aux: 'zijn' },
  { inf: 'worden', tr: 'olmak, haline gelmek', ik: 'word', jij: 'wordt', hij: 'wordt', wij: 'worden', pv: 'werd', perf: 'geworden', aux: 'zijn' },
  { inf: 'weten', tr: 'bilmek', ik: 'weet', jij: 'weet', hij: 'weet', wij: 'weten', pv: 'wist', perf: 'geweten', aux: 'hebben' },
  { inf: 'slapen', tr: 'uyumak', ik: 'slaap', jij: 'slaapt', hij: 'slaapt', wij: 'slapen', pv: 'sliep', perf: 'geslapen', aux: 'hebben' },
  { inf: 'lopen', tr: 'yürümek', ik: 'loop', jij: 'loopt', hij: 'loopt', wij: 'lopen', pv: 'liep', perf: 'gelopen', aux: 'hebben' },
  { inf: 'rijden', tr: 'araç sürmek', ik: 'rijd', jij: 'rijdt', hij: 'rijdt', wij: 'rijden', pv: 'reed', perf: 'gereden', aux: 'hebben' },
  { inf: 'werken', tr: 'çalışmak', ik: 'werk', jij: 'werkt', hij: 'werkt', wij: 'werken', pv: 'werkte', perf: 'gewerkt', aux: 'hebben' },
  { inf: 'wonen', tr: 'oturmak, yaşamak', ik: 'woon', jij: 'woont', hij: 'woont', wij: 'wonen', pv: 'woonde', perf: 'gewoond', aux: 'hebben' },
  { inf: 'maken', tr: 'yapmak, hazırlamak', ik: 'maak', jij: 'maakt', hij: 'maakt', wij: 'maken', pv: 'maakte', perf: 'gemaakt', aux: 'hebben' },
  { inf: 'leren', tr: 'öğrenmek', ik: 'leer', jij: 'leert', hij: 'leert', wij: 'leren', pv: 'leerde', perf: 'geleerd', aux: 'hebben' },
  { inf: 'opbellen', tr: 'telefonla aramak', ik: 'bel op', jij: 'belt op', hij: 'belt op', wij: 'bellen op', pv: 'belde op', perf: 'opgebeld', aux: 'hebben' },
  { inf: 'opstaan', tr: 'kalkmak', ik: 'sta op', jij: 'staat op', hij: 'staat op', wij: 'staan op', pv: 'stond op', perf: 'opgestaan', aux: 'zijn' },
  { inf: 'meenemen', tr: 'yanına almak', ik: 'neem mee', jij: 'neemt mee', hij: 'neemt mee', wij: 'nemen mee', pv: 'nam mee', perf: 'meegenomen', aux: 'hebben' },
  { inf: 'afspreken', tr: 'sözleşmek, buluşma ayarlamak', ik: 'spreek af', jij: 'spreekt af', hij: 'spreekt af', wij: 'spreken af', pv: 'sprak af', perf: 'afgesproken', aux: 'hebben' },
  { inf: 'uitnodigen', tr: 'davet etmek', ik: 'nodig uit', jij: 'nodigt uit', hij: 'nodigt uit', wij: 'nodigen uit', pv: 'nodigde uit', perf: 'uitgenodigd', aux: 'hebben' },
  { inf: 'aankomen', tr: 'varmak', ik: 'kom aan', jij: 'komt aan', hij: 'komt aan', wij: 'komen aan', pv: 'kwam aan', perf: 'aangekomen', aux: 'zijn' },
  { inf: 'invullen', tr: 'doldurmak', ik: 'vul in', jij: 'vult in', hij: 'vult in', wij: 'vullen in', pv: 'vulde in', perf: 'ingevuld', aux: 'hebben' },
  { inf: 'ophalen', tr: 'gidip almak', ik: 'haal op', jij: 'haalt op', hij: 'haalt op', wij: 'halen op', pv: 'haalde op', perf: 'opgehaald', aux: 'hebben' }
];

// Dilbilgisi dersleri. Alıştırmalarda a[0] her zaman doğru cevaptır.

const GRAMMAR = [
  {
    id: 'dehet', icon: '📰', title: 'De of het',
    body: `<p>Hollandacada iki belirli tanımlık vardır, <b>de</b> ve <b>het</b>. İsimlerin yaklaşık üçte ikisi <b>de</b> alır. Emin değilsen <b>de</b> demek daha güvenlidir.</p>
<p><b>Het</b> alan isimler</p>
<ul>
<li>Küçültme ekli bütün kelimeler, <i>het meisje, het broodje, het kaartje</i></li>
<li>Fiilden yapılan isimler, <i>het eten, het werken</i></li>
<li>Dil adları, <i>het Nederlands, het Turks</i></li>
<li>Çoğu <b>ge-</b> ve <b>be-</b> ile başlayan kelime, <i>het gesprek, het bedrijf</i></li>
<li>-um ve -ment ile bitenler, <i>het museum, het appartement</i></li>
</ul>
<p><b>De</b> alan isimler</p>
<ul>
<li>Bütün çoğul isimler, <i>de huizen, de kinderen</i></li>
<li>Çoğu insan ve meslek, <i>de man, de leraar</i></li>
<li>-ing, -heid ve -tie ile bitenler, <i>de woning, de gezondheid, de informatie</i></li>
</ul>
<p>İşaret sözcükleri de tanımlığa bağlıdır. <b>De</b> kelimelerinde yakın için <b>deze</b>, uzak için <b>die</b> kullanılır. <b>Het</b> kelimelerinde yakın için <b>dit</b>, uzak için <b>dat</b> kullanılır. Çoğulda her zaman <b>deze</b> ve <b>die</b> gelir.</p>
<p><i>deze stoel, die tafel, dit huis, dat boek, deze boeken</i></p>
<p>Türkçede tanımlık olmadığı için en iyi yöntem her yeni ismi tanımlığıyla birlikte ezberlemektir. <i>huis</i> değil, <i>het huis</i> diye öğren.</p>`,
    drills: [
      { q: "___ huis is groot.", a: ["Het", "De"], ex: "huis bir het kelimesidir." },
      { q: "___ trein heeft vertraging.", a: ["De", "Het"], ex: "trein bir de kelimesidir." },
      { q: "___ meisje speelt buiten.", a: ["Het", "De"], ex: "-je ile biten küçültme kelimeleri her zaman het alır." },
      { q: "___ kinderen zijn op school.", a: ["De", "Het"], ex: "Bütün çoğul isimler de alır." },
      { q: "___ appartement is te klein.", a: ["Het", "De"], ex: "-ment ile biten kelimeler het alır." },
      { q: "___ informatie staat op de website.", a: ["De", "Het"], ex: "-tie ile biten kelimeler de alır." },
      { q: "___ vergadering begint om negen uur.", a: ["De", "Het"], ex: "-ing ile biten kelimeler de alır." },
      { q: "___ Nederlands is niet makkelijk.", a: ["Het", "De"], ex: "Dil adları het alır." },
      { q: "___ gesprek duurt een half uur.", a: ["Het", "De"], ex: "ge- ile başlayan çoğu kelime het alır." },
      { q: "___ stoel hier is kapot.", a: ["Deze", "Dit"], ex: "stoel bir de kelimesi ve yakında, bu yüzden deze." },
      { q: "Kijk, ___ huis daar is te koop.", a: ["dat", "die", "deze"], ex: "huis bir het kelimesi ve uzakta, bu yüzden dat." },
      { q: "___ boek hier is van mij.", a: ["Dit", "Deze", "Dat"], ex: "boek bir het kelimesi ve yakında, bu yüzden dit." },
      { q: "Wie is ___ man daar?", a: ["die", "dat", "deze"], ex: "man bir de kelimesi ve uzakta, bu yüzden die." },
      { q: "___ schoenen hier zijn nieuw.", a: ["Deze", "Dit"], ex: "Çoğulda yakın için her zaman deze kullanılır." }
    ]
  },

  {
    id: 'tegenwoordig', icon: '⏳', title: 'Şimdiki zaman çekimi',
    body: `<p>Şimdiki zamanda önce fiilin kökünü bul. Kök çoğu zaman mastardan <b>-en</b> düşürülerek bulunur ve <b>ik</b> ile kullanılır.</p>
<ul>
<li><b>ik</b> werk</li>
<li><b>jij, u, hij, zij</b> werkt, yani kök artı <b>t</b></li>
<li><b>wij, jullie, zij</b> werken, yani mastar</li>
</ul>
<p>Yazım kuralları</p>
<ul>
<li>Uzun sesli korunur, harf çiftleşir. <i>wonen, ik woon</i>. <i>slapen, ik slaap</i>.</li>
<li>Çift ünsüz teke iner. <i>bellen, ik bel</i>. <i>zitten, ik zit</i>.</li>
<li>Kökün sonunda v yerine f, z yerine s gelir. <i>leven, ik leef</i>. <i>lezen, ik lees</i>.</li>
<li>Kök zaten t ile bitiyorsa ikinci t eklenmez. <i>hij zit, hij praat</i>.</li>
<li>Kısa fiiller. <i>gaan, ik ga, hij gaat</i>. <i>doen, ik doe</i>. <i>zien, ik zie</i>.</li>
</ul>
<p>Çok önemli kural. <b>jij</b> fiilden sonra gelirse, yani soruda veya devrik cümlede, <b>t düşer</b>.</p>
<p><i>Jij werkt.</i> ama <i>Werk jij morgen?</i> ve <i>Morgen werk jij.</i></p>
<p>Bu kural sadece jij ve je içindir. <i>Werkt hij?</i> ve <i>Werkt u?</i> değişmez.</p>
<p>Düzensiz fiiller</p>
<ul>
<li><b>zijn</b> ik ben, jij bent, hij is, wij zijn</li>
<li><b>hebben</b> ik heb, jij hebt, hij heeft, wij hebben</li>
</ul>`,
    drills: [
      { q: "Ik ___ in Purmerend.", a: ["woon", "woont", "wonen"], ex: "ik ile sadece kök kullanılır, wonen fiilinin kökü woon." },
      { q: "Hij ___ bij een bakkerij.", a: ["werkt", "werk", "werken"], ex: "hij ile kök artı t." },
      { q: "Wij ___ elke dag Nederlands.", a: ["leren", "leert", "leer"], ex: "wij ile mastar biçimi kullanılır." },
      { q: "___ jij morgen?", a: ["Werk", "Werkt"], ex: "jij fiilden sonra gelince t düşer." },
      { q: "Jij ___ goed Nederlands.", a: ["spreekt", "spreek", "spreken"], ex: "jij fiilden önce gelince kök artı t." },
      { q: "Ik ___ morgen naar de dokter.", a: ["ga", "gaat", "gaan"], ex: "gaan fiilinin kökü ga." },
      { q: "Mijn zus ___ twee kinderen.", a: ["heeft", "hebt", "hebben"], ex: "hebben düzensizdir, hij ve zij ile heeft." },
      { q: "Ik ___ een boek.", a: ["lees", "leest", "leez"], ex: "Kökün sonunda z yerine s gelir, ik lees." },
      { q: "Hij ___ op de bank.", a: ["zit", "zitt", "zitten"], ex: "Kök zaten t ile bitiyor, ikinci t eklenmez." },
      { q: "Ik ___ mijn moeder elke week.", a: ["bel", "bell", "bellen"], ex: "Çift ünsüz kökte teke iner, ik bel." },
      { q: "Jullie ___ in een mooi huis.", a: ["wonen", "woont", "woon"], ex: "jullie ile mastar biçimi kullanılır." },
      { q: "Wat ___ u?", a: ["drinkt", "drink", "drinken"], ex: "u ile her zaman kök artı t, devrik cümlede bile." },
      { q: "Ik ___ moe.", a: ["ben", "is", "bent"], ex: "zijn düzensizdir, ik ben." },
      { q: "Morgen ___ jij vrij.", a: ["ben", "bent", "is"], ex: "Devrik cümlede jij ile t düşer, bent yerine ben olur." }
    ]
  },

  {
    id: 'woordvolgorde', icon: '🔀', title: 'Kelime sırası',
    body: `<p>Türkçede fiil cümlenin sonundadır. Hollandaca ana cümlede ise çekimli fiil <b>her zaman ikinci yerdedir</b>.</p>
<p><i>Ik werk vandaag.</i></p>
<p>Cümle özneyle değil de zaman, yer veya başka bir kelimeyle başlarsa fiil yine ikinci yerde kalır ve özne fiilden sonra gelir. Buna devrik cümle denir.</p>
<ul>
<li><i>Vandaag <b>werk ik</b> niet.</i></li>
<li><i>Morgen <b>ga ik</b> naar Amsterdam.</i></li>
<li><i>In het weekend <b>slapen wij</b> lang.</i></li>
</ul>
<p>Cümlede ikinci bir fiil varsa, mastar veya geçmiş zaman ortacı, o fiil cümlenin <b>sonuna</b> gider.</p>
<ul>
<li><i>Ik wil morgen koffie <b>drinken</b>.</i></li>
<li><i>Ik heb gisteren <b>gewerkt</b>.</i></li>
</ul>
<p>Ortadaki bilgiler genellikle şu sırayla gelir, önce zaman, sonra nasıl, en son nereye.</p>
<p><i>Ik ga morgen met de trein naar Amsterdam.</i></p>
<p>Sorular</p>
<ul>
<li>Evet hayır sorusu fiille başlar. <i>Woon je in Purmerend?</i></li>
<li>Soru kelimesinden hemen sonra fiil gelir. <i>Waar woon je? Wanneer begint de les?</i></li>
</ul>
<p>Unutma, jij fiilden sonra gelince t düşer. <i>Werk jij?</i></p>`,
    drills: [
      { q: "Morgen ___ naar de markt.", a: ["ga ik", "ik ga"], ex: "Cümle zamanla başlıyor, fiil ikinci yerde kalır, özne arkasına geçer." },
      { q: "Vandaag ___ niet.", a: ["werk ik", "ik werk"], ex: "vandaag ilk yerde, fiil ikinci yerde, sonra özne." },
      { q: "___ in Purmerend?", a: ["Woon je", "Je woont", "Je woon"], ex: "Evet hayır sorusu fiille başlar, je fiilden sonra gelince t düşer." },
      { q: "Waar ___?", a: ["werkt hij", "hij werkt"], ex: "Soru kelimesinden sonra önce fiil, sonra özne gelir." },
      { q: "In het weekend ___ lang.", a: ["slapen wij", "wij slapen"], ex: "Cümle in het weekend ile başlıyor, fiil ikinci yerde." },
      { q: "Ik ga ___ naar Amsterdam.", a: ["morgen met de trein", "met de trein morgen"], ex: "Sıra önce zaman, sonra nasıl, en son nereye." },
      { q: "Ik wil morgen koffie ___.", a: ["drinken", "drink", "drinkt"], ex: "İkinci fiil mastar halinde cümlenin sonuna gider." },
      { q: "Gisteren ___ gewerkt.", a: ["heb ik", "ik heb"], ex: "Çekimli fiil heb ikinci yerde, özne ondan sonra." },
      { q: "Wanneer ___ de les?", a: ["begint", "begin", "beginnen"], ex: "Soru kelimesinden sonra çekimli fiil gelir, de les tekil olduğu için begint." },
      { q: "Om negen uur ___ open.", a: ["gaat de winkel", "de winkel gaat"], ex: "Cümle saatle başlıyor, fiil ikinci yerde kalır." },
      { q: "Na het eten ___ televisie.", a: ["kijken we", "we kijken"], ex: "Na het eten ilk yerde, fiil ikinci yerde, sonra özne." },
      { q: "Wat ___ jij in het weekend?", a: ["doe", "doet"], ex: "Soru kelimesinden sonra fiil gelir, jij fiilden sonra olduğu için t düşer." }
    ]
  },

  {
    id: 'bijzin', icon: '🔗', title: 'Yan cümle',
    body: `<p>Bazı bağlaçlar yan cümle kurar. Yan cümlede çekimli fiil <b>en sona</b> gider. Bu Türkçeye biraz benzer.</p>
<p>Fiili sona gönderen bağlaçlar</p>
<ul>
<li><b>omdat</b> çünkü. <i>Ik blijf thuis omdat ik ziek <b>ben</b>.</i></li>
<li><b>dat</b> ki. <i>Ik denk dat hij morgen <b>komt</b>.</i></li>
<li><b>als</b> eğer veya -dığında. <i>Als het <b>regent</b>, neem ik de bus.</i></li>
<li><b>wanneer</b> -dığında. <i>Wanneer ik thuis <b>ben</b>, drink ik thee.</i></li>
<li><b>of</b> -ip -mediği. <i>Ik weet niet of de winkel open <b>is</b>.</i></li>
</ul>
<p>Soru kelimesiyle kurulan dolaylı sorularda da fiil sona gider. <i>Weet jij wanneer de bus <b>vertrekt</b>?</i></p>
<p>Yan cümle başta gelirse ana cümle fiille başlar. <i>Als het regent, <b>neem ik</b> de bus.</i></p>
<p>Normal sırayı bozmayan bağlaçlar</p>
<ul>
<li><b>want</b> çünkü. <i>Ik blijf thuis, want ik <b>ben</b> ziek.</i></li>
<li><b>maar</b> ama. <i>Ik wil komen, maar ik <b>heb</b> geen tijd.</i></li>
<li><b>en</b> ve, <b>of</b> veya.</li>
<li><b>dus</b> bu yüzden. <i>Het regent, dus ik neem de bus.</i> Burada <i>dus neem ik</i> da doğrudur.</li>
</ul>
<p>Püf noktası. <b>omdat</b> ve <b>want</b> aynı anlama gelir ama sıraları farklıdır. omdat fiili sona atar, want atmaz.</p>`,
    drills: [
      { q: "Ik blijf thuis omdat ___.", a: ["ik ziek ben", "ik ben ziek"], ex: "omdat yan cümle kurar, fiil sona gider." },
      { q: "Ik blijf thuis, want ___.", a: ["ik ben ziek", "ik ziek ben"], ex: "want normal sırayı korur." },
      { q: "Ik denk dat ___.", a: ["hij morgen komt", "hij komt morgen"], ex: "dat ile fiil sona gider." },
      { q: "Als het regent, ___ de bus.", a: ["neem ik", "ik neem"], ex: "Yan cümle başta olunca ana cümle fiille başlar." },
      { q: "Ik wil komen, maar ___.", a: ["ik heb geen tijd", "ik geen tijd heb"], ex: "maar normal sırayı korur." },
      { q: "Ik weet niet of ___.", a: ["de winkel open is", "de winkel is open"], ex: "of yan cümle kurar, fiil sona gider." },
      { q: "Wanneer ik thuiskom, ___.", a: ["drink ik koffie", "ik drink koffie"], ex: "Yan cümle başta olunca ana cümle fiille başlar." },
      { q: "Het regent, ___ ik neem de paraplu mee.", a: ["dus", "omdat"], ex: "Arkadan normal sıra geliyor, omdat fiili sona atardı." },
      { q: "Ik leer Nederlands ___ ik wil hier werken.", a: ["want", "omdat"], ex: "Fiil sonda değil, bu yüzden want." },
      { q: "Ik leer Nederlands ___ ik hier wil werken.", a: ["omdat", "want"], ex: "Fiil sonda, bu yüzden omdat." },
      { q: "Hij belt de huisarts omdat ___.", a: ["zijn dochter koorts heeft", "zijn dochter heeft koorts"], ex: "omdat ile fiil sona gider." },
      { q: "Weet jij wanneer ___?", a: ["de bus vertrekt", "vertrekt de bus"], ex: "Dolaylı soruda da fiil sona gider." }
    ]
  },

  {
    id: 'perfectum', icon: '✅', title: 'Geçmiş zaman perfectum',
    body: `<p>Konuşmada geçmişi anlatmak için en çok <b>perfectum</b> kullanılır. Yapısı <b>hebben</b> veya <b>zijn</b> artı cümle sonunda geçmiş zaman ortacıdır.</p>
<p><i>Ik <b>heb</b> gisteren <b>gewerkt</b>. Wij <b>zijn</b> naar Amsterdam <b>gegaan</b>.</i></p>
<p>Düzenli fiiller <b>ge + kök + t veya d</b> olur. Hangisi olduğunu <b>'t kofschip</b> kelimesi söyler. Kök t, k, f, s, ch veya p ile bitiyorsa <b>t</b>, yoksa <b>d</b> gelir.</p>
<ul>
<li><i>werken, gewerkt</i> ve <i>fietsen, gefietst</i></li>
<li><i>wonen, gewoond</i> ve <i>leren, geleerd</i></li>
<li>Kök zaten t veya d ile bitiyorsa ek yoktur. <i>praten, gepraat</i>. <i>antwoorden, geantwoord</i>.</li>
<li>Mastarda v veya z varsa d gelir. <i>verhuizen, verhuisd</i>. <i>leven, geleefd</i>.</li>
</ul>
<p><b>be-, ge-, ver-, her-, ont-, er-</b> ile başlayan fiiller ge- almaz. <i>betalen, betaald</i>. <i>vergeten, vergeten</i>.</p>
<p>Sık kullanılan düzensizler <i>geweest, gehad, gegaan, gekomen, gedaan, gegeten, gedronken, gelezen, geschreven, gezien</i>.</p>
<p><b>zijn</b> ile kullanılan fiiller genellikle bir yere gitmeyi veya bir değişimi anlatır. <i>gaan, komen, blijven, worden, beginnen, vertrekken, verhuizen, opstaan, aankomen</i> ve <i>zijn</i>. Örnek <i>Ik ben ziek geweest.</i> Diğer fiillerin çoğu <b>hebben</b> ile kullanılır.</p>`,
    drills: [
      { q: "Ik ___ gisteren lang gewerkt.", a: ["heb", "ben"], ex: "werken hebben ile kullanılır." },
      { q: "Wij ___ naar Amsterdam gegaan.", a: ["zijn", "hebben"], ex: "gaan bir yere gitmeyi anlatır, zijn ile kullanılır." },
      { q: "Hij heeft de hele dag ___.", a: ["gewerkt", "gewerkd"], ex: "werk k ile bitiyor, 't kofschip içinde, bu yüzden t." },
      { q: "Ik heb tien jaar in Ankara ___.", a: ["gewoond", "gewoont"], ex: "woon n ile bitiyor, 't kofschip içinde değil, bu yüzden d." },
      { q: "Zij heeft naar haar werk ___.", a: ["gefietst", "gefietsd"], ex: "fiets s ile bitiyor, bu yüzden t." },
      { q: "Ik heb een brief ___.", a: ["geschreven", "geschrijft", "geschrijfd"], ex: "schrijven düzensizdir, geschreven." },
      { q: "Heb je al ___?", a: ["gegeten", "geëet", "geët"], ex: "eten düzensizdir, gegeten." },
      { q: "Ik heb de rekening al ___.", a: ["betaald", "gebetaald", "betaalt"], ex: "be- ile başlayan fiiller ge- almaz." },
      { q: "Ik ben mijn sleutel ___.", a: ["vergeten", "gevergeten"], ex: "ver- ile başlayan fiiller ge- almaz." },
      { q: "Wij ___ vorig jaar verhuisd.", a: ["zijn", "hebben"], ex: "verhuizen bir değişimi anlatır, zijn ile kullanılır." },
      { q: "De film ___ om acht uur begonnen.", a: ["is", "heeft"], ex: "beginnen zijn ile kullanılır." },
      { q: "Ik heb hem gisteren ___.", a: ["gezien", "gezient", "gezag"], ex: "zien düzensizdir, gezien." },
      { q: "Mijn zoon ___ ziek geweest.", a: ["is", "heeft"], ex: "zijn fiilinin perfectumu da zijn ile kurulur." },
      { q: "Hij heeft lang met de buurvrouw ___.", a: ["gepraat", "gepraatt", "gepraatd"], ex: "Kök zaten t ile bitiyor, ek gelmez." }
    ]
  },

  {
    id: 'imperfectum', icon: '📖', title: 'Hikaye geçmiş zaman',
    body: `<p><b>Imperfectum</b> bir hikaye anlatırken veya geçmişteki bir durumu ve alışkanlığı anlatırken kullanılır. <i>Vroeger woonde ik in Turkije.</i></p>
<p>Düzenli fiillerde köke tekilde <b>-te</b> veya <b>-de</b>, çoğulda <b>-ten</b> veya <b>-den</b> eklenir. Yine <b>'t kofschip</b> kuralı geçerlidir.</p>
<ul>
<li><i>werken, ik werkte, wij werkten</i></li>
<li><i>fietsen, ik fietste, wij fietsten</i></li>
<li><i>wonen, ik woonde, wij woonden</i></li>
<li><i>bellen, ik belde, wij belden</i></li>
<li><i>spelen, ik speelde, wij speelden</i></li>
</ul>
<p>En sık kullanılan düzensizler</p>
<ul>
<li><b>zijn</b> ik was, wij waren</li>
<li><b>hebben</b> ik had, wij hadden</li>
<li><b>gaan</b> ik ging, wij gingen</li>
<li><b>komen</b> ik kwam, wij kwamen</li>
<li><b>doen</b> ik deed, <b>zien</b> ik zag, <b>eten</b> ik at</li>
<li><b>kunnen</b> ik kon, <b>willen</b> ik wilde, <b>moeten</b> ik moest, <b>mogen</b> ik mocht</li>
<li><b>kopen</b> ik kocht, <b>denken</b> ik dacht, <b>brengen</b> ik bracht</li>
</ul>
<p>Imperfectumda ik, jij ve hij aynı biçimi kullanır. <i>ik was, jij was, hij was</i>. Çoğulda düzensiz fiillere genellikle <b>-en</b> eklenir. <i>kwam, kwamen</i>. <i>at, aten</i>.</p>`,
    drills: [
      { q: "Vroeger ___ ik in Turkije.", a: ["woonde", "woonte", "wonde"], ex: "woon n ile bitiyor, bu yüzden -de." },
      { q: "Gisteren ___ hij tot zes uur.", a: ["werkte", "werkde"], ex: "werk k ile bitiyor, 't kofschip içinde, bu yüzden -te." },
      { q: "Ik ___ gisteren ziek.", a: ["was", "waren", "ben"], ex: "zijn tekilde was olur." },
      { q: "Wij ___ vorige week op vakantie.", a: ["waren", "was"], ex: "zijn çoğulda waren olur." },
      { q: "Mijn moeder ___ geen tijd.", a: ["had", "hadden", "hebt"], ex: "hebben tekilde had olur." },
      { q: "Gisteren ___ ik naar de markt.", a: ["ging", "gaat", "gingen"], ex: "gaan düzensizdir, ik ging." },
      { q: "De bus ___ te laat.", a: ["kwam", "kwamen", "komde"], ex: "komen düzensizdir, tekilde kwam." },
      { q: "Vorig jaar ___ wij een nieuwe auto.", a: ["kochten", "kocht", "koopten"], ex: "kopen düzensizdir, çoğulda kochten." },
      { q: "Toen ik klein was, ___ ik elke dag.", a: ["fietste", "fietsde"], ex: "fiets s ile bitiyor, bu yüzden -te." },
      { q: "Hij ___ me om negen uur.", a: ["belde", "belte"], ex: "bel l ile bitiyor, bu yüzden -de." },
      { q: "De kinderen ___ in de tuin.", a: ["speelden", "speelde", "speelten"], ex: "Çoğul özne, spelen düzenli, -den." },
      { q: "Gisteren ___ ik een broodje met kaas.", a: ["at", "eette", "eet"], ex: "eten düzensizdir, ik at." },
      { q: "Wat ___ jij gisteren?", a: ["deed", "doede", "doet"], ex: "doen düzensizdir, jij deed." }
    ]
  },

  {
    id: 'scheidbaar', icon: '✂️', title: 'Ayrılabilen fiiller',
    body: `<p>Bazı fiillerin başında ayrılabilen bir ön ek vardır, örneğin <b>op, mee, af, uit, aan, in, terug</b>. Vurgu bu ön ektedir. <i>opbellen, meenemen, opstaan, afspreken, uitnodigen, aankomen, invullen, ophalen</i>.</p>
<p>Ana cümlede çekimli fiil ikinci yerde kalır, ön ek <b>cümlenin sonuna</b> gider.</p>
<ul>
<li><i>Ik <b>bel</b> mijn moeder <b>op</b>.</i></li>
<li><i>Ik <b>sta</b> om zeven uur <b>op</b>.</i></li>
<li><i><b>Neem</b> je paraplu <b>mee</b>.</i></li>
</ul>
<p>Modal fiille birlikte kullanınca fiil ayrılmaz, mastar halinde sondadır. <i>Ik moet de dokter <b>opbellen</b>.</i></p>
<p>Yan cümlede de fiil bitişik yazılır ve sondadır. <i>Ik ben moe omdat ik vroeg <b>opsta</b>.</i></p>
<p>Perfectumda <b>ge</b> ön ek ile kök arasına girer.</p>
<ul>
<li><i>opbellen, opgebeld</i></li>
<li><i>meenemen, meegenomen</i></li>
<li><i>afspreken, afgesproken</i></li>
<li><i>uitnodigen, uitgenodigd</i></li>
<li><i>invullen, ingevuld</i></li>
<li><i>opstaan, ik ben opgestaan</i></li>
<li><i>aankomen, de trein is aangekomen</i></li>
</ul>
<p>Dikkat, <b>be-, ver-, ont-</b> gibi ön ekler ayrılmaz. <i>Ik betaal de rekening. Ik vertel een verhaal.</i></p>`,
    drills: [
      { q: "Ik ___ mijn moeder elke zondag op.", a: ["bel", "opbel", "belt"], ex: "Ana cümlede ön ek sona gider, fiil ikinci yerde kalır." },
      { q: "Ik sta elke dag om zeven uur ___.", a: ["op", "mee", "af"], ex: "opstaan, ön ek op sona gider." },
      { q: "___ je paraplu mee, het regent.", a: ["Neem", "Meeneem", "Neemt"], ex: "Emir cümlesinde ön ek mee sona gider." },
      { q: "Ik moet de dokter ___.", a: ["opbellen", "bellen op", "op bellen"], ex: "Modal fiille mastar bitişik ve sonda kalır." },
      { q: "Ik heb het formulier al ___.", a: ["ingevuld", "geïnvuld", "invulgd"], ex: "ge ön ek ile kök arasına girer, ingevuld." },
      { q: "Wij hebben om drie uur ___.", a: ["afgesproken", "geafsproken", "afgespreekt"], ex: "spreken düzensizdir, af artı gesproken." },
      { q: "Hij is om zes uur ___.", a: ["opgestaan", "geopstaan", "opgestaat"], ex: "op artı gestaan, zijn ile kullanılır." },
      { q: "Ik heb mijn buren ___.", a: ["uitgenodigd", "geuitnodigd", "uitnodigd"], ex: "uit artı genodigd." },
      { q: "De trein komt om tien uur ___.", a: ["aan", "op", "mee"], ex: "aankomen, ön ek aan sona gider." },
      { q: "Ik ___ de kinderen om drie uur op.", a: ["haal", "ophaal", "haalt"], ex: "ophalen, ana cümlede haal ... op." },
      { q: "Ik ben moe omdat ik vroeg ___.", a: ["opsta", "sta op", "op sta"], ex: "Yan cümlede fiil bitişik ve sondadır." },
      { q: "Kun je brood ___?", a: ["meenemen", "nemen mee", "mee nemen"], ex: "Modal fiille mastar bitişik ve sonda kalır." },
      { q: "Ik heb haar gisteren ___.", a: ["opgebeld", "geopbeld", "opbelt"], ex: "op artı gebeld." }
    ]
  },

  {
    id: 'modaal', icon: '🗝️', title: 'Modal fiiller',
    body: `<p>Modal fiiller başka bir fiille birlikte kullanılır. İkinci fiil <b>mastar</b> halinde ve <b>cümlenin sonundadır</b>.</p>
<ul>
<li><b>kunnen</b> yapabilmek, mümkün olmak. <i>Ik kan goed koken.</i></li>
<li><b>willen</b> istemek. <i>Hij wil een nieuwe fiets kopen.</i></li>
<li><b>moeten</b> zorunda olmak. <i>Ik moet morgen werken.</i></li>
<li><b>mogen</b> izinli olmak. <i>Mag ik hier parkeren?</i></li>
</ul>
<p>Çekimler</p>
<ul>
<li>ik kan, jij kunt, hij kan, wij kunnen</li>
<li>ik wil, jij wilt, hij wil, wij willen</li>
<li>ik moet, jij moet, hij moet, wij moeten</li>
<li>ik mag, jij mag, hij mag, wij mogen</li>
</ul>
<p>Dikkat, <b>hij kan, hij wil, hij mag</b> biçimlerinde t yoktur. Soruda jij gelince <i>Kun jij</i> ve <i>Wil jij</i> olur.</p>
<p>Kibar istek için <i>Ik wil graag een kopje koffie</i> veya <i>Mag ik de rekening?</i> kullanılır.</p>
<p>Gerekli değil demek için <b>niet hoeven te</b> kullanılır. <i>Je hoeft morgen niet te komen.</i> <i>Je mag niet roken</i> ise yasak anlamına gelir.</p>`,
    drills: [
      { q: "Ik ___ goed zwemmen.", a: ["kan", "kun", "kunnen"], ex: "ik ile kan." },
      { q: "Hij ___ een nieuwe fiets kopen.", a: ["wil", "wilt", "willen"], ex: "hij wil, t almaz." },
      { q: "Wij ___ morgen vroeg opstaan.", a: ["moeten", "moet"], ex: "wij ile mastar biçimi moeten." },
      { q: "___ ik hier parkeren?", a: ["Mag", "Mogen"], ex: "ik ile mag, izin sormak için." },
      { q: "Jij ___ hier niet roken.", a: ["mag", "mogen", "magt"], ex: "mogen fiilinde jij ile de mag, t almaz." },
      { q: "Ik moet morgen naar de tandarts ___.", a: ["gaan", "ga", "gegaan"], ex: "İkinci fiil mastar halinde sonda." },
      { q: "Ik wil graag een kopje koffie ___.", a: ["drinken", "drink", "drinkt"], ex: "İkinci fiil mastar halinde sonda." },
      { q: "___ jij Nederlands spreken?", a: ["Kun", "Kunt", "Kunnen"], ex: "jij fiilden sonra gelince t düşer, kunt yerine kun." },
      { q: "Je ___ een geldig paspoort hebben.", a: ["moet", "mag", "wil"], ex: "Zorunluluk için moeten kullanılır." },
      { q: "Mijn kinderen ___ op zaterdag lang slapen.", a: ["mogen", "mag"], ex: "Çoğul özne, mogen." },
      { q: "Kunt u mij ___?", a: ["helpen", "helpt", "geholpen"], ex: "İkinci fiil mastar halinde sonda." },
      { q: "Ik kan morgen niet ___, want ik moet werken.", a: ["komen", "kom", "komt"], ex: "kan ile ikinci fiil mastar halinde gelir." },
      { q: "Wat ___ jullie eten?", a: ["willen", "wil", "wilt"], ex: "jullie ile mastar biçimi willen." }
    ]
  },

  {
    id: 'meervoud', icon: '👥', title: 'Çoğul',
    body: `<p>Hollandacada çoğul iki şekilde yapılır, <b>-en</b> veya <b>-s</b>. Bütün çoğul isimler <b>de</b> alır.</p>
<p><b>-en</b> çoğu kelime için. <i>boek, boeken</i>. <i>fiets, fietsen</i>.</p>
<p><b>-s</b> şu kelimeler için</p>
<ul>
<li>-el, -em, -en, -er ile bitenler. <i>tafel, tafels</i>. <i>kamer, kamers</i>.</li>
<li>-je ile bitenler. <i>meisje, meisjes</i>.</li>
<li>a, o, u, i, y ile bitenler kesme işaretiyle. <i>auto, auto's</i>. <i>baby, baby's</i>.</li>
</ul>
<p>Yazım kuralları</p>
<ul>
<li>Uzun çift sesli, -en eklenince teke iner. <i>boom, bomen</i>. <i>straat, straten</i>.</li>
<li>Kısa sesliden sonra ünsüz çiftleşir. <i>bus, bussen</i>. <i>bed, bedden</i>.</li>
<li>f bazen v, s bazen z olur. <i>brief, brieven</i>. <i>huis, huizen</i>.</li>
</ul>
<p>Düzensizler</p>
<ul>
<li><i>kind, kinderen</i></li>
<li><i>ei, eieren</i></li>
<li><i>stad, steden</i></li>
<li><i>dag, dagen</i> ve <i>weg, wegen</i>, burada ünsüz çiftleşmez</li>
</ul>
<p>Dikkat, sayılardan sonra <i>uur</i> ve <i>euro</i> genellikle tekil kalır. <i>drie uur, tien euro</i>.</p>`,
    drills: [
      { q: "Ik heb twee ___.", a: ["boeken", "boeks", "boekken"], ex: "Çoğu kelime -en alır." },
      { q: "In de straat staan veel ___.", a: ["bomen", "boomen", "booms"], ex: "Uzun çift sesli -en ile teke iner, bomen." },
      { q: "Er rijden veel ___ in de stad.", a: ["bussen", "busen", "buses"], ex: "Kısa sesliden sonra ünsüz çiftleşir." },
      { q: "Wij hebben drie ___.", a: ["kinderen", "kinden", "kinds"], ex: "kind düzensizdir, kinderen." },
      { q: "Ik heb twee ___ gekregen.", a: ["brieven", "briefen", "briefs"], ex: "f burada v olur." },
      { q: "Deze ___ zijn duur.", a: ["huizen", "huisen", "huises"], ex: "s burada z olur." },
      { q: "Het huis heeft vier ___.", a: ["kamers", "kameren"], ex: "-er ile biten kelimeler -s alır." },
      { q: "Er staan twee ___ voor de deur.", a: ["auto's", "autos", "autoën"], ex: "o ile biten kelimeler kesme işaretiyle -s alır." },
      { q: "In de klas zitten tien ___.", a: ["meisjes", "meisjen"], ex: "-je ile biten kelimeler -s alır." },
      { q: "In de winter zijn de ___ lang.", a: ["nachten", "nachts"], ex: "nacht kelimesi -en alır." },
      { q: "In Nederland zijn veel ___.", a: ["fietsen", "fietses", "fiets's"], ex: "fiets -en alır." },
      { q: "Ik koop zes ___.", a: ["eieren", "eien", "eis"], ex: "ei düzensizdir, eieren." },
      { q: "De ___ in Amsterdam zijn smal.", a: ["straten", "straaten", "straats"], ex: "Uzun çift sesli -en ile teke iner, straten." },
      { q: "Er staan twee ___ in de slaapkamer.", a: ["bedden", "beden", "beds"], ex: "Kısa sesliden sonra ünsüz çiftleşir, bedden." }
    ]
  },

  {
    id: 'bijvoeglijk', icon: '🎨', title: 'Sıfat çekimi',
    body: `<p>Sıfat ismin önünde gelirse genellikle <b>-e</b> alır.</p>
<ul>
<li><i>de grote stad</i></li>
<li><i>het grote huis</i></li>
<li><i>een grote stad</i></li>
<li><i>grote huizen</i></li>
</ul>
<p><b>Tek istisna</b>. İsim bir <b>het</b> kelimesi, tekil ve önünde <b>een</b>, <b>geen</b> varsa veya hiç tanımlık yoksa sıfat <b>-e almaz</b>.</p>
<ul>
<li><i>een groot huis</i></li>
<li><i>geen groot huis</i></li>
<li><i>mooi weer, koud water</i></li>
</ul>
<p>Sıfat fiilden sonra gelirse hiç ek almaz. <i>Het huis is groot. De stad is mooi.</i></p>
<p>Yazım kuralları</p>
<ul>
<li>Uzun çift sesli teke iner. <i>groot, grote</i>. <i>duur, dure</i>.</li>
<li>Kısa sesliden sonra ünsüz çiftleşir. <i>dik, dikke</i>. <i>wit, witte</i>.</li>
<li>f bazen v, s bazen z olur. <i>lief, lieve</i>. <i>vies, vieze</i>.</li>
</ul>
<p>Hızlı test. Önünde een var ve isim het kelimesi mi? Evetse ek yok. Diğer bütün durumlarda -e. Bu yüzden her ismi de veya het ile birlikte öğrenmek burada da çok işe yarar.</p>`,
    drills: [
      { q: "Ik woon in een ___ huis.", a: ["groot", "grote"], ex: "huis het kelimesi ve önünde een var, -e yok." },
      { q: "Het ___ huis is van mijn buren.", a: ["grote", "groot"], ex: "Önünde het var, -e gelir." },
      { q: "Wij hebben een ___ auto gekocht.", a: ["nieuwe", "nieuw"], ex: "auto de kelimesi, een ile de -e gelir." },
      { q: "Het weer is vandaag ___.", a: ["mooi", "mooie"], ex: "Sıfat fiilden sonra, ek almaz." },
      { q: "Vandaag is het ___ weer.", a: ["mooi", "mooie"], ex: "weer het kelimesi ve tanımlık yok, -e almaz." },
      { q: "Ik zoek een ___ baan.", a: ["leuke", "leuk"], ex: "baan de kelimesi, -e gelir." },
      { q: "Mijn zoon heeft een ___ bed.", a: ["klein", "kleine"], ex: "bed het kelimesi ve önünde een var, -e yok." },
      { q: "De ___ kinderen spelen buiten.", a: ["kleine", "klein"], ex: "Çoğulda her zaman -e gelir." },
      { q: "Dit is een ___ boek.", a: ["dik", "dikke"], ex: "boek het kelimesi ve önünde een var, -e yok." },
      { q: "Ik heb ___ handen.", a: ["vieze", "viese", "vies"], ex: "Çoğulda -e gelir ve s z olur." },
      { q: "Wij hebben ___ buren.", a: ["lieve", "liefe", "lief"], ex: "Çoğulda -e gelir ve f v olur." },
      { q: "Dat is een ___ restaurant.", a: ["duur", "dure", "duure"], ex: "restaurant het kelimesi ve önünde een var, -e yok." },
      { q: "Ik drink ___ water.", a: ["koud", "koude"], ex: "water het kelimesi ve tanımlık yok, -e almaz." },
      { q: "Het ___ station is dichtbij.", a: ["nieuwe", "nieuw"], ex: "Önünde het var, -e gelir." }
    ]
  },

  {
    id: 'negatie', icon: '🚫', title: 'Olumsuzluk',
    body: `<p>Hollandacada iki olumsuzluk kelimesi vardır, <b>geen</b> ve <b>niet</b>.</p>
<p><b>geen</b> bir ismi olumsuz yapar. Önünde <b>een</b> olan veya hiç tanımlık olmayan isimlerde kullanılır.</p>
<ul>
<li><i>Ik heb een auto. Ik heb <b>geen</b> auto.</i></li>
<li><i>Ik drink koffie. Ik drink <b>geen</b> koffie.</i></li>
<li><i>Ik heb <b>geen</b> tijd. Er is <b>geen</b> melk.</i></li>
</ul>
<p><b>niet</b> diğer her şey için kullanılır.</p>
<ul>
<li>Fiil. <i>Ik werk vandaag <b>niet</b>.</i></li>
<li>Sıfat. <i>Het is <b>niet</b> duur.</i></li>
<li>de, het veya mijn gibi bir kelimeyle gelen isim. <i>Ik zie de bus <b>niet</b>. Dat is <b>niet</b> mijn tas.</i></li>
</ul>
<p>niet nereye gelir?</p>
<ul>
<li>Genellikle cümlenin sonuna. <i>Ik begrijp het <b>niet</b>.</i></li>
<li>Sıfattan ve edattan önce. <i>Ik ben <b>niet</b> ziek. Ik ga <b>niet</b> naar school.</i></li>
<li>Sondaki ikinci fiilden önce. <i>Ik heb de brief <b>niet</b> gelezen.</i></li>
</ul>
<p>Türkçedeki <i>yok</i> ve <i>hiç</i> çoğu zaman geen, <i>değil</i> ve <i>-me</i> eki çoğu zaman niet olur.</p>`,
    drills: [
      { q: "Ik heb ___ auto.", a: ["geen", "niet"], ex: "een auto olumsuz olunca geen auto olur." },
      { q: "Ik werk vandaag ___.", a: ["niet", "geen"], ex: "Fiil olumsuz, niet kullanılır." },
      { q: "Hij drinkt ___ koffie.", a: ["geen", "niet"], ex: "Tanımlıksız isim, geen kullanılır." },
      { q: "Het eten is ___ lekker.", a: ["niet", "geen"], ex: "Sıfat olumsuz, niet kullanılır." },
      { q: "Ik zie de bus ___.", a: ["niet", "geen"], ex: "de ile gelen isim, niet kullanılır." },
      { q: "Wij hebben ___ kinderen.", a: ["geen", "niet"], ex: "Tanımlıksız çoğul isim, geen kullanılır." },
      { q: "Dat is ___ mijn tas.", a: ["niet", "geen"], ex: "mijn ile gelen isim, niet kullanılır." },
      { q: "Ik spreek ___ Duits.", a: ["geen", "niet"], ex: "Dil adları tanımlıksız isim gibi geen alır." },
      { q: "Ik ga morgen ___ naar school.", a: ["niet", "geen"], ex: "Fiil olumsuz, niet edattan önce gelir." },
      { q: "Er is ___ melk meer.", a: ["geen", "niet"], ex: "Tanımlıksız isim, geen kullanılır." },
      { q: "Ik heb het formulier ___ ingevuld.", a: ["niet", "geen"], ex: "Fiil olumsuz, niet sondaki fiilden önce gelir." },
      { q: "Zij is ___ ziek.", a: ["niet", "geen"], ex: "Sıfat olumsuz, niet kullanılır." },
      { q: "Ik heb ___ tijd.", a: ["geen", "niet"], ex: "Tanımlıksız isim, geen kullanılır." },
      { q: "Heb je ___ honger?", a: ["geen", "niet"], ex: "honger bir isimdir, geen kullanılır." }
    ]
  },

  {
    id: 'vergelijken', icon: '⚖️', title: 'Karşılaştırma',
    body: `<p>Karşılaştırmada sıfata <b>-er</b> eklenir ve <b>dan</b> kullanılır.</p>
<p><i>Amsterdam is <b>groter dan</b> Purmerend.</i></p>
<p>En üstün derece için <b>-st</b> eklenir. <i>Dit is het grootste huis. Dit huis is het grootst.</i></p>
<ul>
<li><i>klein, kleiner, kleinst</i></li>
<li><i>snel, sneller, snelst</i></li>
<li><i>groot, groter, grootst</i>, uzun sesli teke iner</li>
<li><i>dik, dikker, dikst</i>, ünsüz çiftleşir</li>
<li>-r ile biten sıfatlara <b>-der</b> gelir. <i>duur, duurder</i>. <i>lekker, lekkerder</i>.</li>
<li>Uzun sıfatlar da -er alır. <i>moeilijk, moeilijker</i>.</li>
</ul>
<p>Düzensizler</p>
<ul>
<li><i>goed, beter, best</i></li>
<li><i>veel, meer, meest</i></li>
<li><i>weinig, minder, minst</i></li>
<li><i>graag, liever, liefst</i></li>
</ul>
<p>Eşitlik için <b>even ... als</b> veya <b>zo ... als</b> kullanılır. <i>Zij is even oud als haar man.</i></p>
<p>Sıfat isimden önce gelirse karşılaştırma biçimi de -e alabilir. <i>een groter huis, de grootste stad</i>.</p>
<p>Dikkat, karşılaştırmada <b>dan</b>, eşitlikte <b>als</b> gelir. Türkçedeki <i>-den daha</i> yapısı Hollandacada <i>-er dan</i> olur.</p>`,
    drills: [
      { q: "Amsterdam is ___ dan Purmerend.", a: ["groter", "grootter", "meer groot"], ex: "groot artı -er, uzun sesli teke iner." },
      { q: "Mijn broer is ___ dan ik.", a: ["ouder", "oudder", "meer oud"], ex: "oud artı -er." },
      { q: "De trein is ___ dan de bus.", a: ["sneller", "sneler"], ex: "Kısa sesliden sonra ünsüz çiftleşir." },
      { q: "Dit huis is ___ dan dat huis.", a: ["duurder", "duurer", "duurst"], ex: "-r ile biten sıfatlar -der alır." },
      { q: "Mijn Nederlands is nu ___ dan vorig jaar.", a: ["beter", "goeder", "best"], ex: "goed düzensizdir, beter." },
      { q: "Dit is de ___ winkel van Purmerend.", a: ["goedkoopste", "goedkopere", "meest goedkoop"], ex: "En üstün derece -ste, isimden önce." },
      { q: "Ik drink ___ thee dan koffie.", a: ["liever", "graager", "meer graag"], ex: "graag düzensizdir, liever." },
      { q: "Wie heeft de ___ kinderen?", a: ["meeste", "meer", "veelste"], ex: "veel düzensizdir, en çok meeste." },
      { q: "Ik heb ___ tijd dan vroeger.", a: ["minder", "weiniger", "minst"], ex: "weinig düzensizdir, minder." },
      { q: "Zij is even oud ___ haar man.", a: ["als", "dan"], ex: "Eşitlikte als kullanılır." },
      { q: "Mijn zoon is ouder ___ mijn dochter.", a: ["dan", "als"], ex: "Karşılaştırmada dan kullanılır." },
      { q: "Welke tas vind jij het ___?", a: ["mooist", "mooier", "mooie"], ex: "het ile en üstün derece, mooist." },
      { q: "Dit examen is ___ dan het vorige.", a: ["moeilijker", "meer moeilijk"], ex: "Uzun sıfatlar da -er alır." }
    ]
  },

  {
    id: 'voornaamwoorden', icon: '🙋', title: 'Zamirler',
    body: `<p>Her şahıs için üç biçim vardır. Özne, nesne ve iyelik.</p>
<ul>
<li><b>ik</b>, mij veya me, mijn</li>
<li><b>jij</b> veya je, jou veya je, jouw veya je</li>
<li><b>u</b>, u, uw. Resmi ve kibar hitap.</li>
<li><b>hij</b>, hem, zijn</li>
<li><b>zij</b> veya ze, haar, haar</li>
<li><b>het</b>, het, zijn</li>
<li><b>wij</b> veya we, ons, ons veya onze</li>
<li><b>jullie</b>, jullie, jullie</li>
<li><b>zij</b> veya ze, hen veya hun veya ze, hun</li>
</ul>
<p>Örnekler</p>
<ul>
<li><i>Ik zie <b>hem</b>. Dat is <b>zijn</b> fiets.</i></li>
<li><i>Kun je <b>mij</b> helpen?</i></li>
<li><i>Is dit <b>jouw</b> jas? Ik geef <b>jou</b> een cadeau.</i></li>
<li><i>Wat is <b>uw</b> naam?</i></li>
</ul>
<p><b>ons</b> ve <b>onze</b> farkı. Tekil bir het kelimesinden önce <b>ons</b>, de kelimelerinden ve çoğuldan önce <b>onze</b> gelir.</p>
<p><i>ons huis, onze auto, onze kinderen</i></p>
<p>Dikkat, <b>jou</b> nesne, <b>jouw</b> iyeliktir. Resmi yazışmalarda, doktorda ve belediyede genellikle <b>u</b> ve <b>uw</b> kullanılır.</p>`,
    drills: [
      { q: "Ik heb een fiets. Dat is ___ fiets.", a: ["mijn", "mij", "me"], ex: "İyelik biçimi mijn." },
      { q: "Ik heb een vraag. Kun je ___ helpen?", a: ["mij", "mijn", "ik"], ex: "Nesne biçimi mij." },
      { q: "Wij hebben een huis. ___ huis is groot.", a: ["Ons", "Onze"], ex: "huis tekil bir het kelimesi, ons." },
      { q: "Wij hebben een auto. ___ auto is oud.", a: ["Onze", "Ons"], ex: "auto bir de kelimesi, onze." },
      { q: "Wat is ___ naam, meneer?", a: ["uw", "u", "jij"], ex: "Resmi hitapta iyelik biçimi uw." },
      { q: "Mijn zus is ziek. Ik bel ___ vanavond.", a: ["haar", "zij", "hem"], ex: "Kadın için nesne biçimi haar." },
      { q: "Waar is Ahmet? Ik zie ___ niet.", a: ["hem", "hij", "zijn"], ex: "Erkek için nesne biçimi hem." },
      { q: "Ahmet en ___ vrouw wonen in Purmerend.", a: ["zijn", "hem", "haar"], ex: "Ahmet erkek, iyelik biçimi zijn." },
      { q: "Is dit ___ jas, Sara?", a: ["jouw", "jou", "jij"], ex: "İyelik biçimi jouw." },
      { q: "Sara, ik geef ___ een cadeau.", a: ["jou", "jouw", "jij"], ex: "Nesne biçimi jou." },
      { q: "De kinderen zijn thuis. ___ moeder is aan het werk.", a: ["Hun", "Hen", "Zij"], ex: "Çoğul iyelik biçimi hun." },
      { q: "Jullie zijn welkom. Komen ___ morgen?", a: ["jullie", "jouw", "hun"], ex: "Özne biçimi jullie." },
      { q: "Wij gaan naar het park. Ga je met ___ mee?", a: ["ons", "onze", "wij"], ex: "Edattan sonra nesne biçimi ons." },
      { q: "Wij hebben twee kinderen. ___ kinderen gaan naar de basisschool.", a: ["Onze", "Ons"], ex: "Çoğuldan önce onze." }
    ]
  },

  {
    id: 'voorzetsels', icon: '📍', title: 'Edatlar',
    body: `<p>Edatlar Türkçedeki hal eklerinin yerini tutar. En önemlileri şunlardır.</p>
<ul>
<li><b>in</b> içinde. Şehir, ülke, ay, yıl, mevsim. <i>in Purmerend, in de winkel, in mei, in 2020, in de zomer, in het weekend</i></li>
<li><b>op</b> üstünde. Günler ve bazı yerler. <i>op tafel, op maandag, op 3 mei, op school, op het werk</i></li>
<li><b>aan</b> bitişik, kenarında. <i>aan de muur, aan tafel zitten</i></li>
<li><b>naar</b> bir yere doğru, -e. <i>naar Amsterdam, naar huis, naar de dokter</i></li>
<li><b>bij</b> birinin yanında, bir yerde. <i>bij de bakker, bij mijn moeder, Ik werk bij een bedrijf.</i></li>
<li><b>met</b> ile. <i>met de bus, met mijn vrouw</i></li>
<li><b>voor</b> için veya önünde. <i>voor jou, voor het huis</i></li>
<li><b>om</b> saatler için. <i>om 9 uur, om half drie</i></li>
</ul>
<p>Zaman için kısa özet. Saat <b>om</b>, gün ve tarih <b>op</b>, ay, yıl, mevsim ve hafta sonu <b>in</b>.</p>
<p>Hareket ve yer farkı. <i>Ik ga <b>naar</b> de huisarts</i> gidişi anlatır. <i>Ik ben <b>bij</b> de huisarts</i> orada olmayı anlatır. <i>Ik heb een afspraak <b>bij</b> de huisarts</i> da bij ile kurulur.</p>`,
    drills: [
      { q: "De les begint ___ negen uur.", a: ["om", "op", "in"], ex: "Saatlerde om kullanılır." },
      { q: "Ik werk niet ___ maandag.", a: ["op", "in", "om"], ex: "Günlerde op kullanılır." },
      { q: "___ het weekend slaap ik lang.", a: ["In", "Op", "Om"], ex: "Hafta sonu için in het weekend denir." },
      { q: "Ik woon ___ Purmerend.", a: ["in", "op", "bij"], ex: "Şehirlerde in kullanılır." },
      { q: "Ik ga morgen ___ Amsterdam.", a: ["naar", "in", "bij"], ex: "Bir yere gitmek için naar kullanılır." },
      { q: "Ik koop brood ___ de bakker.", a: ["bij", "naar", "op"], ex: "Bir dükkânda veya birinin yanında bij kullanılır." },
      { q: "Ik ga ___ de bus naar mijn werk.", a: ["met", "op", "naar"], ex: "Ulaşım aracı için met kullanılır." },
      { q: "Mijn zoon zit ___ school.", a: ["op", "in", "aan"], ex: "Okul için op school denir." },
      { q: "Dit cadeau is ___ jou.", a: ["voor", "naar", "met"], ex: "için anlamında voor kullanılır." },
      { q: "___ de zomer gaan we naar Turkije.", a: ["In", "Op", "Om"], ex: "Mevsimlerde in kullanılır." },
      { q: "Het boek ligt ___ tafel.", a: ["op", "aan", "naar"], ex: "Bir şeyin üstünde olmak için op kullanılır." },
      { q: "Wij zitten ___ tafel en eten.", a: ["aan", "op", "naar"], ex: "Masada yemek yemek için aan tafel zitten denir." },
      { q: "Ik heb een afspraak ___ de huisarts.", a: ["bij", "naar", "op"], ex: "Randevu birinin yanında olur, bij kullanılır." },
      { q: "___ 3 mei is mijn verjaardag.", a: ["Op", "In", "Om"], ex: "Tarihlerde op kullanılır." }
    ]
  },

  {
    id: 'er', icon: '👉', title: 'Er kelimesi',
    body: `<p><b>er</b> küçük ama çok kullanılan bir kelimedir. A2 için en önemli üç kullanımı şunlardır.</p>
<p><b>1. er is ve er zijn</b>, Türkçedeki <i>var</i> anlamında. Tekil için <b>er is</b>, çoğul için <b>er zijn</b>.</p>
<ul>
<li><i>Er is een supermarkt in de buurt.</i></li>
<li><i>Er zijn veel fietsen in Nederland.</i></li>
<li><i>Er is geen melk meer.</i></li>
<li><i>Wat is er aan de hand?</i></li>
</ul>
<p><b>2. Sayı veya miktarla</b>. İsmi tekrar etmemek için er kullanılır. İsim söylenmez ama er mutlaka gelir.</p>
<ul>
<li><i>Hoeveel kinderen heb je? Ik heb <b>er</b> twee.</i></li>
<li><i>Heb je nog eieren? Ja, ik heb <b>er</b> nog zes.</i></li>
<li><i>Heb je een auto? Nee, ik heb <b>er</b> geen.</i></li>
</ul>
<p><b>3. Yer için</b>, daha önce söylenen yerin yerine. <i>orada</i> anlamındadır.</p>
<ul>
<li><i>Ben je al in Utrecht geweest? Ja, ik ben <b>er</b> vorig jaar geweest.</i></li>
<li><i>Woon je in Purmerend? Ja, ik woon <b>er</b> al vijf jaar.</i></li>
</ul>
<p>Türkçede bu kelimenin karşılığı olmadığı için sık unutulur. <i>Ik heb twee</i> yanlıştır, <i>Ik heb er twee</i> doğrudur.</p>`,
    drills: [
      { q: "___ is een apotheek in de buurt.", a: ["Er", "Het"], ex: "var anlamında er is kullanılır." },
      { q: "Er ___ veel mensen in de trein.", a: ["zijn", "is"], ex: "Çoğul isim, er zijn." },
      { q: "Er ___ een brief voor jou.", a: ["is", "zijn"], ex: "Tekil isim, er is." },
      { q: "Hoeveel kinderen heb je? Ik heb ___ drie.", a: ["er", "het", "ze"], ex: "Sayıyla birlikte ismin yerine er gelir." },
      { q: "Heb je nog eieren? Ja, ik heb ___ nog zes.", a: ["er", "ze", "het"], ex: "Miktarla birlikte ismin yerine er gelir." },
      { q: "Is er nog koffie? Nee, er is ___ koffie meer.", a: ["geen", "niet"], ex: "Tanımlıksız isim, geen kullanılır." },
      { q: "Ben je al in Utrecht geweest? Ja, ik ben ___ vorig jaar geweest.", a: ["er", "het", "ze"], ex: "Daha önce söylenen yer için er kullanılır." },
      { q: "Hoeveel broers heb je? Ik heb ___ één.", a: ["er", "hem", "het"], ex: "Sayıyla birlikte er gelir." },
      { q: "___ zijn twee bushaltes in onze straat.", a: ["Er", "Het"], ex: "var anlamında er zijn kullanılır." },
      { q: "Er ___ geen supermarkt in ons dorp.", a: ["is", "zijn"], ex: "Tekil isim, er is." },
      { q: "Wat ___ er aan de hand?", a: ["is", "zijn"], ex: "Sabit ifade, wat is er aan de hand." },
      { q: "Hoeveel appels wil je? Ik wil ___ vier.", a: ["er", "ze", "het"], ex: "Sayıyla birlikte ismin yerine er gelir." },
      { q: "Woon je in Purmerend? Ja, ik woon ___ al vijf jaar.", a: ["er", "het", "hem"], ex: "Daha önce söylenen yer için er kullanılır." }
    ]
  }
];

if (typeof module !== 'undefined') module.exports = { VERBS, GRAMMAR };
