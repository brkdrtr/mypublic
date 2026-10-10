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
    id: 'dehet', icon: '📰', title: 'De mi, het mi?',
    body: `<p>Hollandacada belirli tanımlık yani lidwoord olarak iki kelime var, <b>de</b> ve <b>het</b>. İsimlerin aşağı yukarı üçte ikisi <b>de-woord</b>. Yani emin değilsen <b>de</b> de, çoğu zaman tutar.</p>
<p>Bunlar <b>het-woord</b></p>
<ul>
<li>Küçültme ekli her kelime, <i>het meisje, het broodje, het kaartje</i></li>
<li>Fiilden gelen isimler, <i>het eten, het werken</i></li>
<li>Dil isimleri, <i>het Nederlands, het Turks</i></li>
<li><b>ge-</b> ve <b>be-</b> ile başlayanların çoğu, <i>het gesprek, het bedrijf</i></li>
<li>Sonu -um ve -ment olanlar, <i>het museum, het appartement</i></li>
</ul>
<p>Bunlar <b>de-woord</b></p>
<ul>
<li>Bütün çoğullar, istisnasız, <i>de huizen, de kinderen</i></li>
<li>İnsanların ve mesleklerin çoğu, <i>de man, de leraar</i></li>
<li>Sonu -ing, -heid ve -tie olanlar, <i>de woning, de gezondheid, de informatie</i></li>
</ul>
<p>De mi het mi meselesi işaret kelimelerini de etkiliyor. de-woord yakındaysa <b>deze</b>, uzaktaysa <b>die</b>. het-woord yakındaysa <b>dit</b>, uzaktaysa <b>dat</b>. Çoğulda hep <b>deze</b> ve <b>die</b>.</p>
<p><i>deze stoel, die tafel, dit huis, dat boek, deze boeken</i></p>
<p>Türkçede böyle bir şey olmadığı için en sağlam yol şu, her yeni ismi tanımlığıyla beraber ezberle. Sadece <i>huis</i> değil, <i>het huis</i> diye öğren.</p>`,
    drills: [
      { q: "___ huis is groot.", a: ["Het", "De"], ex: "huis bir het-woord, o yüzden het." },
      { q: "___ trein heeft vertraging.", a: ["De", "Het"], ex: "trein bir de-woord." },
      { q: "___ meisje speelt buiten.", a: ["Het", "De"], ex: "Sonu -je olan küçültmeler hep het alır." },
      { q: "___ kinderen zijn op school.", a: ["De", "Het"], ex: "Çoğul isimler her zaman de alır." },
      { q: "___ appartement is te klein.", a: ["Het", "De"], ex: "Sonu -ment olanlar het-woord." },
      { q: "___ informatie staat op de website.", a: ["De", "Het"], ex: "Sonu -tie olanlar de-woord." },
      { q: "___ vergadering begint om negen uur.", a: ["De", "Het"], ex: "Sonu -ing olanlar de-woord." },
      { q: "___ Nederlands is niet makkelijk.", a: ["Het", "De"], ex: "Dil isimleri het alır." },
      { q: "___ gesprek duurt een half uur.", a: ["Het", "De"], ex: "ge- ile başlayanların çoğu het-woord." },
      { q: "___ stoel hier is kapot.", a: ["Deze", "Dit"], ex: "stoel bir de-woord ve yakında, o yüzden deze." },
      { q: "Kijk, ___ huis daar is te koop.", a: ["dat", "die", "deze"], ex: "huis bir het-woord ve uzakta, yani dat." },
      { q: "___ boek hier is van mij.", a: ["Dit", "Deze", "Dat"], ex: "boek bir het-woord ve yakında, yani dit." },
      { q: "Wie is ___ man daar?", a: ["die", "dat", "deze"], ex: "man bir de-woord ve uzakta, yani die." },
      { q: "___ schoenen hier zijn nieuw.", a: ["Deze", "Dit"], ex: "Çoğulda yakındaki şey için hep deze." }
    ]
  },

  {
    id: 'tegenwoordig', icon: '⏳', title: 'Şimdiki zaman çekimi',
    body: `<p>Şimdiki zamanda işe fiilin kökünü bularak başla. Kök genelde mastardan yani infinitief'ten <b>-en</b> atılınca çıkar, <b>ik</b> ile de aynen bu kök kullanılır.</p>
<ul>
<li><b>ik</b> werk</li>
<li><b>jij, u, hij, zij</b> werkt, yani kök artı <b>t</b></li>
<li><b>wij, jullie, zij</b> werken, yani mastarın kendisi</li>
</ul>
<p>Yazarken dikkat edeceğin şeyler</p>
<ul>
<li>Uzun sesli kaybolmasın diye harf çift yazılır. <i>wonen, ik woon</i>. <i>slapen, ik slaap</i>.</li>
<li>Çift ünsüz teke düşer. <i>bellen, ik bel</i>. <i>zitten, ik zit</i>.</li>
<li>Kökün sonunda v f olur, z s olur. <i>leven, ik leef</i>. <i>lezen, ik lees</i>.</li>
<li>Kök zaten t ile bitiyorsa bir t daha eklenmez. <i>hij zit, hij praat</i>.</li>
<li>Kısa fiiller de var. <i>gaan, ik ga, hij gaat</i>. <i>doen, ik doe</i>. <i>zien, ik zie</i>.</li>
</ul>
<p>Şimdi çok önemli bir kural. <b>jij</b> fiilden sonra gelirse, yani soruda ya da devrik cümlede, sondaki <b>t düşer</b>.</p>
<p><i>Jij werkt.</i> ama <i>Werk jij morgen?</i> ve <i>Morgen werk jij.</i></p>
<p>Bu sadece jij ve je için geçerli. <i>Werkt hij?</i> ve <i>Werkt u?</i> olduğu gibi kalır.</p>
<p>Şu iki düzensiz fiili baştan ezberle</p>
<ul>
<li><b>zijn</b> ik ben, jij bent, hij is, wij zijn</li>
<li><b>hebben</b> ik heb, jij hebt, hij heeft, wij hebben</li>
</ul>`,
    drills: [
      { q: "Ik ___ in Purmerend.", a: ["woon", "woont", "wonen"], ex: "ik ile sadece kök gelir, wonen fiilinin kökü woon." },
      { q: "Hij ___ bij een bakkerij.", a: ["werkt", "werk", "werken"], ex: "hij ile kök artı t, werkt." },
      { q: "Wij ___ elke dag Nederlands.", a: ["leren", "leert", "leer"], ex: "wij ile fiilin mastar hali kullanılır." },
      { q: "___ jij morgen?", a: ["Werk", "Werkt"], ex: "jij fiilden sonra geldiği için t düşüyor, Werk jij." },
      { q: "Jij ___ goed Nederlands.", a: ["spreekt", "spreek", "spreken"], ex: "jij fiilden önce, o zaman kök artı t." },
      { q: "Ik ___ morgen naar de dokter.", a: ["ga", "gaat", "gaan"], ex: "gaan fiilinin kökü ga, ik ga." },
      { q: "Mijn zus ___ twee kinderen.", a: ["heeft", "hebt", "hebben"], ex: "hebben düzensiz, hij ve zij ile heeft." },
      { q: "Ik ___ een boek.", a: ["lees", "leest", "leez"], ex: "Kökün sonunda z s olur, ik lees." },
      { q: "Hij ___ op de bank.", a: ["zit", "zitt", "zitten"], ex: "Kök zaten t ile bitiyor, bir t daha eklenmez." },
      { q: "Ik ___ mijn moeder elke week.", a: ["bel", "bell", "bellen"], ex: "Çift ünsüz kökte teke düşer, ik bel." },
      { q: "Jullie ___ in een mooi huis.", a: ["wonen", "woont", "woon"], ex: "jullie ile mastar hali kullanılır." },
      { q: "Wat ___ u?", a: ["drinkt", "drink", "drinken"], ex: "u ile hep kök artı t gelir, soruda bile. Wat drinkt u?" },
      { q: "Ik ___ moe.", a: ["ben", "is", "bent"], ex: "zijn düzensiz, ik ben." },
      { q: "Morgen ___ jij vrij.", a: ["ben", "bent", "is"], ex: "Devrik cümlede jij ile t düşer, bent değil ben." }
    ]
  },

  {
    id: 'woordvolgorde', icon: '🔀', title: 'Kelime sırası',
    body: `<p>Türkçede fiil sona gider, değil mi? Hollandacada ana cümlede çekimli fiil yani persoonsvorm <b>hep ikinci sırada</b> durur. Kısacası verb ikinci sırada.</p>
<p><i>Ik werk vandaag.</i></p>
<p>Cümleye özneyle değil de zamanla, yerle ya da başka bir şeyle başlarsan fiil yine ikinci sırada kalır, subject yani özne fiilin arkasına geçer. Buna devrik cümle, Hollandacada inversie diyoruz.</p>
<ul>
<li><i>Vandaag <b>werk ik</b> niet.</i></li>
<li><i>Morgen <b>ga ik</b> naar Amsterdam.</i></li>
<li><i>In het weekend <b>slapen wij</b> lang.</i></li>
</ul>
<p>Cümlede ikinci bir fiil varsa, mastar ya da participle, o fiil cümlenin <b>en sonuna</b> gider.</p>
<ul>
<li><i>Ik wil morgen koffie <b>drinken</b>.</i></li>
<li><i>Ik heb gisteren <b>gewerkt</b>.</i></li>
</ul>
<p>Ortadaki bilgiler genelde şu sırayla gelir, önce zaman, sonra nasıl, en son nereye.</p>
<p><i>Ik ga morgen met de trein naar Amsterdam.</i></p>
<p>Sorularda</p>
<ul>
<li>Evet hayır sorusu direkt fiille başlar. <i>Woon je in Purmerend?</i></li>
<li>Soru kelimesinden hemen sonra fiil gelir. <i>Waar woon je? Wanneer begint de les?</i></li>
</ul>
<p>Unutma, jij fiilden sonra gelince t düşer. <i>Werk jij?</i></p>`,
    drills: [
      { q: "Morgen ___ naar de markt.", a: ["ga ik", "ik ga"], ex: "Cümle zamanla başlıyor. Fiil yine ikinci sırada, özne arkasına geçiyor." },
      { q: "Vandaag ___ niet.", a: ["werk ik", "ik werk"], ex: "vandaag birinci sırada, fiil ikinci, sonra özne." },
      { q: "___ in Purmerend?", a: ["Woon je", "Woont je", "Je woon"], ex: "Evet hayır sorusu fiille başlar, je fiilden sonra gelince t düşer." },
      { q: "Waar ___?", a: ["werkt hij", "hij werkt"], ex: "Soru kelimesinden sonra önce fiil, sonra özne." },
      { q: "In het weekend ___ lang.", a: ["slapen wij", "wij slapen"], ex: "Cümle in het weekend ile başlıyor, fiil yine ikinci sırada." },
      { q: "Ik ga ___ naar Amsterdam.", a: ["morgen met de trein", "met de trein morgen"], ex: "Sıra önce zaman, sonra nasıl, en son nereye." },
      { q: "Ik wil morgen koffie ___.", a: ["drinken", "drink", "drinkt"], ex: "İkinci fiil mastar halinde en sona gider." },
      { q: "Gisteren ___ gewerkt.", a: ["heb ik", "ik heb"], ex: "Çekimli fiil heb ikinci sırada, özne arkasından gelir." },
      { q: "Wanneer ___ de les?", a: ["begint", "begin", "beginnen"], ex: "Soru kelimesinden sonra çekimli fiil gelir, de les tekil olduğu için begint." },
      { q: "Om negen uur ___ open.", a: ["gaat de winkel", "de winkel gaat"], ex: "Cümle saatle başlıyor, fiil ikinci sırada kalıyor." },
      { q: "Na het eten ___ televisie.", a: ["kijken we", "we kijken"], ex: "Na het eten birinci sırada, fiil ikinci, sonra özne." },
      { q: "Wat ___ jij in het weekend?", a: ["doe", "doet"], ex: "Soru kelimesinden sonra fiil gelir, jij arkada olduğu için t düşer." }
    ]
  },

  {
    id: 'bijzin', icon: '🔗', title: 'Bijzin yani yan cümle',
    body: `<p>Bazı bağlaçlar bijzin yani yan cümle kurar. Bijzinde çekimli fiil <b>en sona</b> gider. Bu kısım Türkçeye biraz benziyor, o yüzden aslında size kolay gelecek.</p>
<p>Fiili sona atan bağlaçlar</p>
<ul>
<li><b>omdat</b> çünkü. <i>Ik blijf thuis omdat ik ziek <b>ben</b>.</i></li>
<li><b>dat</b> ki, -dığını. <i>Ik denk dat hij morgen <b>komt</b>.</i></li>
<li><b>als</b> eğer, -ınca. <i>Als het <b>regent</b>, neem ik de bus.</i></li>
<li><b>wanneer</b> -dığında. <i>Wanneer ik thuis <b>ben</b>, drink ik thee.</i></li>
<li><b>of</b> -ıp -madığını. <i>Ik weet niet of de winkel open <b>is</b>.</i></li>
</ul>
<p>Soru kelimesiyle kurulan dolaylı sorularda da fiil sona kayar. <i>Weet jij wanneer de bus <b>vertrekt</b>?</i></p>
<p>Bijzin başa gelirse ana cümle direkt fiille başlar. <i>Als het regent, <b>neem ik</b> de bus.</i></p>
<p>Sırayı bozmayan bağlaçlar</p>
<ul>
<li><b>want</b> çünkü. <i>Ik blijf thuis, want ik <b>ben</b> ziek.</i></li>
<li><b>maar</b> ama. <i>Ik wil komen, maar ik <b>heb</b> geen tijd.</i></li>
<li><b>en</b> ve, <b>of</b> ya da.</li>
<li><b>dus</b> bu yüzden. <i>Het regent, dus ik neem de bus.</i> Burada <i>dus neem ik</i> da olur, ikisi de doğru.</li>
</ul>
<p>Püf noktası şu. <b>omdat</b> ve <b>want</b> ikisi de çünkü demek ama sıraları farklı. omdat fiili sona atar, want hiç dokunmaz.</p>`,
    drills: [
      { q: "Ik blijf thuis omdat ___.", a: ["ik ziek ben", "ik ben ziek"], ex: "omdat bijzin kurar, fiil sona gider." },
      { q: "Ik blijf thuis, want ___.", a: ["ik ben ziek", "ik ziek ben"], ex: "want sırayı bozmaz, normal ana cümle sırası." },
      { q: "Ik denk dat ___.", a: ["hij morgen komt", "hij komt morgen"], ex: "dat ile fiil sona gider." },
      { q: "Als het regent, ___ de bus.", a: ["neem ik", "ik neem"], ex: "Bijzin başta, o yüzden ana cümle fiille başlıyor." },
      { q: "Ik wil komen, maar ___.", a: ["ik heb geen tijd", "ik geen tijd heb"], ex: "maar sırayı bozmaz." },
      { q: "Ik weet niet of ___.", a: ["de winkel open is", "de winkel is open"], ex: "of burada bijzin kurar, fiil sona gider." },
      { q: "Wanneer ik thuiskom, ___.", a: ["drink ik koffie", "ik drink koffie"], ex: "Bijzin başta, ana cümle fiille başlar." },
      { q: "Het regent, ___ ik neem de paraplu mee.", a: ["dus", "omdat"], ex: "Arkadan normal sıra geliyor. omdat olsaydı fiil sona giderdi." },
      { q: "Ik leer Nederlands, ___ ik wil hier werken.", a: ["want", "omdat"], ex: "Fiil sonda değil, o zaman want." },
      { q: "Ik leer Nederlands ___ ik hier wil werken.", a: ["omdat", "want"], ex: "Fiil sonda, o zaman omdat." },
      { q: "Hij belt de huisarts omdat ___.", a: ["zijn dochter koorts heeft", "zijn dochter heeft koorts"], ex: "omdat ile fiil sona gider." },
      { q: "Weet jij wanneer ___?", a: ["de bus vertrekt", "vertrekt de bus"], ex: "Dolaylı soruda da fiil sona gider." }
    ]
  },

  {
    id: 'perfectum', icon: '✅', title: 'Perfectum ile geçmiş zaman',
    body: `<p>Konuşurken geçmişi anlatmak için en çok <b>perfectum</b> kullanılır. Formül basit, <b>hebben</b> ya da <b>zijn</b> artı cümlenin sonunda participle yani geçmiş zaman ortacı.</p>
<p><i>Ik <b>heb</b> gisteren <b>gewerkt</b>. Wij <b>zijn</b> naar Amsterdam <b>gegaan</b>.</i></p>
<p>Düzenli fiillerde participle <b>ge + kök + t ya da d</b> olur. Hangisinin geleceğini <b>'t kofschip</b> söyler. Kök t, k, f, s, ch ya da p ile bitiyorsa <b>t</b>, bitmiyorsa <b>d</b>.</p>
<ul>
<li><i>werken, gewerkt</i> ve <i>fietsen, gefietst</i></li>
<li><i>wonen, gewoond</i> ve <i>leren, geleerd</i></li>
<li>Kök zaten t ya da d ile bitiyorsa bir şey eklenmez. <i>praten, gepraat</i>. <i>antwoorden, geantwoord</i>.</li>
<li>Mastarda v ya da z varsa d gelir. <i>verhuizen, verhuisd</i>. <i>leven, geleefd</i>.</li>
</ul>
<p><b>be-, ge-, ver-, her-, ont-, er-</b> ile başlayan fiiller ayrıca ge- almaz. <i>betalen, betaald</i>. <i>vergeten, vergeten</i>.</p>
<p>Çok kullanılan düzensizler <i>geweest, gehad, gegaan, gekomen, gedaan, gegeten, gedronken, gelezen, geschreven, gezien</i>. Bunları ezberlemek lazım.</p>
<p><b>zijn</b> ile kurulanlar genelde bir yere gitmeyi ya da bir değişimi anlatır. <i>gaan, komen, blijven, worden, beginnen, vertrekken, verhuizen, opstaan, aankomen</i> ve tabii <i>zijn</i>. Mesela <i>Ik ben ziek geweest.</i> Geri kalanların çoğu <b>hebben</b> ile gider.</p>`,
    drills: [
      { q: "Ik ___ gisteren lang gewerkt.", a: ["heb", "ben"], ex: "werken hebben ile kurulur." },
      { q: "Wij ___ naar Amsterdam gegaan.", a: ["zijn", "hebben"], ex: "gaan bir yere gitmek, o yüzden zijn." },
      { q: "Hij heeft de hele dag ___.", a: ["gewerkt", "gewerkd"], ex: "werk k ile bitiyor, k 't kofschip içinde var, yani t." },
      { q: "Ik heb tien jaar in Ankara ___.", a: ["gewoond", "gewoont"], ex: "woon n ile bitiyor, n 't kofschip içinde yok, yani d." },
      { q: "Zij heeft vandaag veel ___.", a: ["gefietst", "gefietsd"], ex: "fiets s ile bitiyor, yani t." },
      { q: "Ik heb een brief ___.", a: ["geschreven", "geschrijft", "geschrijfd"], ex: "schrijven düzensiz, participle geschreven." },
      { q: "Heb je al ___?", a: ["gegeten", "geëet", "geët"], ex: "eten düzensiz, participle gegeten." },
      { q: "Ik heb de rekening al ___.", a: ["betaald", "gebetaald", "betaalt"], ex: "be- ile başlayan fiiller ge- almaz." },
      { q: "Ik ben mijn sleutel ___.", a: ["vergeten", "gevergeten"], ex: "ver- ile başlayan fiiller ge- almaz." },
      { q: "Wij ___ vorig jaar verhuisd.", a: ["zijn", "hebben"], ex: "verhuizen bir değişim anlatıyor, zijn ile kurulur." },
      { q: "De film ___ om acht uur begonnen.", a: ["is", "heeft"], ex: "beginnen zijn ile kurulur." },
      { q: "Ik heb hem gisteren ___.", a: ["gezien", "gezient", "gezag"], ex: "zien düzensiz, participle gezien." },
      { q: "Mijn zoon ___ ziek geweest.", a: ["is", "heeft"], ex: "zijn fiilinin perfectumu da zijn ile kurulur, is geweest." },
      { q: "Hij heeft lang met de buurvrouw ___.", a: ["gepraat", "gepraatt", "gepraatd"], ex: "Kök zaten t ile bitiyor, bir şey eklenmez." }
    ]
  },

  {
    id: 'imperfectum', icon: '📖', title: 'Imperfectum, hikâye geçmişi',
    body: `<p><b>Imperfectum</b> bir hikâye anlatırken ya da geçmişteki bir durumu, bir alışkanlığı anlatırken kullanılır. <i>Vroeger woonde ik in Turkije.</i></p>
<p>Düzenli fiillerde köke tekilde <b>-te</b> ya da <b>-de</b>, çoğulda <b>-ten</b> ya da <b>-den</b> eklenir. Burada da <b>'t kofschip</b> devrede.</p>
<ul>
<li><i>werken, ik werkte, wij werkten</i></li>
<li><i>fietsen, ik fietste, wij fietsten</i></li>
<li><i>wonen, ik woonde, wij woonden</i></li>
<li><i>bellen, ik belde, wij belden</i></li>
<li><i>spelen, ik speelde, wij speelden</i></li>
</ul>
<p>En çok karşına çıkacak düzensizler</p>
<ul>
<li><b>zijn</b> ik was, wij waren</li>
<li><b>hebben</b> ik had, wij hadden</li>
<li><b>gaan</b> ik ging, wij gingen</li>
<li><b>komen</b> ik kwam, wij kwamen</li>
<li><b>doen</b> ik deed, <b>zien</b> ik zag, <b>eten</b> ik at</li>
<li><b>kunnen</b> ik kon, <b>willen</b> ik wilde, <b>moeten</b> ik moest, <b>mogen</b> ik mocht</li>
<li><b>kopen</b> ik kocht, <b>denken</b> ik dacht, <b>brengen</b> ik bracht</li>
</ul>
<p>Imperfectumda ik, jij ve hij aynı biçimi kullanır, hiç t falan eklenmez. <i>ik was, jij was, hij was</i>. Çoğulda düzensiz fiillere çoğu zaman <b>-en</b> eklenir. <i>kwam, kwamen</i>. <i>at, aten</i>.</p>`,
    drills: [
      { q: "Vroeger ___ ik in Turkije.", a: ["woonde", "woonte", "wonde"], ex: "woon n ile bitiyor, yani -de." },
      { q: "Gisteren ___ hij tot zes uur.", a: ["werkte", "werkde"], ex: "werk k ile bitiyor, k 't kofschip içinde var, yani -te." },
      { q: "Ik ___ gisteren ziek.", a: ["was", "waren", "ben"], ex: "zijn tekilde was olur." },
      { q: "Wij ___ vorige week op vakantie.", a: ["waren", "was"], ex: "zijn çoğulda waren olur." },
      { q: "Mijn moeder ___ geen tijd.", a: ["had", "hadden", "hebt"], ex: "hebben tekilde had olur." },
      { q: "Gisteren ___ ik naar de markt.", a: ["ging", "gaat", "gingen"], ex: "gaan düzensiz, ik ging." },
      { q: "De bus ___ te laat.", a: ["kwam", "kwamen", "komde"], ex: "komen düzensiz, tekilde kwam." },
      { q: "Vorig jaar ___ wij een nieuwe auto.", a: ["kochten", "kocht", "koopten"], ex: "kopen düzensiz, çoğulda kochten." },
      { q: "Toen ik klein was, ___ ik elke dag.", a: ["fietste", "fietsde"], ex: "fiets s ile bitiyor, yani -te." },
      { q: "Hij ___ me om negen uur.", a: ["belde", "belte"], ex: "bel l ile bitiyor, yani -de." },
      { q: "De kinderen ___ in de tuin.", a: ["speelden", "speelde", "speelten"], ex: "Özne çoğul ve spelen düzenli, yani -den." },
      { q: "Gisteren ___ ik een broodje met kaas.", a: ["at", "eette", "eet"], ex: "eten düzensiz, ik at." },
      { q: "Wat ___ jij gisteren?", a: ["deed", "doede", "doet"], ex: "doen düzensiz, jij deed." }
    ]
  },

  {
    id: 'scheidbaar', icon: '✂️', title: 'Ayrılan fiiller',
    body: `<p>Bazı fiillerin başında ayrılabilen bir ön ek var, mesela <b>op, mee, af, uit, aan, in, terug</b>. Vurgu da bu ön ekte. <i>opbellen, meenemen, opstaan, afspreken, uitnodigen, aankomen, invullen, ophalen</i>.</p>
<p>Ana cümlede çekimli fiil yine ikinci sırada durur, ön ek ise kopup <b>cümlenin sonuna</b> gider.</p>
<ul>
<li><i>Ik <b>bel</b> mijn moeder <b>op</b>.</i></li>
<li><i>Ik <b>sta</b> om zeven uur <b>op</b>.</i></li>
<li><i><b>Neem</b> je paraplu <b>mee</b>.</i></li>
</ul>
<p>Modal fiille beraber kullanınca fiil ayrılmaz, mastar halinde bitişik olarak en sona gider. <i>Ik moet de dokter <b>opbellen</b>.</i></p>
<p>Bijzinde de fiil bitişik yazılır ve sondadır. <i>Ik ben moe omdat ik elke dag vroeg <b>opsta</b>.</i></p>
<p>Perfectumda <b>ge</b> ön ekle kökün arasına girer.</p>
<ul>
<li><i>opbellen, opgebeld</i></li>
<li><i>meenemen, meegenomen</i></li>
<li><i>afspreken, afgesproken</i></li>
<li><i>uitnodigen, uitgenodigd</i></li>
<li><i>invullen, ingevuld</i></li>
<li><i>opstaan, ik ben opgestaan</i></li>
<li><i>aankomen, de trein is aangekomen</i></li>
</ul>
<p>Dikkat, <b>be-, ver-, ont-</b> gibi ön ekler hiç ayrılmaz. <i>Ik betaal de rekening. Ik vertel een verhaal.</i></p>`,
    drills: [
      { q: "Ik ___ mijn moeder elke zondag op.", a: ["bel", "opbel", "belt"], ex: "Ana cümlede ön ek sona gider, fiil ikinci sırada kalır." },
      { q: "Ik sta elke dag om zeven uur ___.", a: ["op", "mee", "af"], ex: "opstaan fiilinde ön ek op sona gider." },
      { q: "___ je paraplu mee, het regent.", a: ["Neem", "Meeneem", "Neemt"], ex: "Emir cümlesinde de ön ek mee sona gider." },
      { q: "Ik moet de dokter ___.", a: ["opbellen", "bellen op", "op bellen"], ex: "Modal fiille mastar bitişik ve en sonda." },
      { q: "Ik heb het formulier al ___.", a: ["ingevuld", "geïnvuld", "invulgd"], ex: "ge ön ekle kökün arasına girer, ingevuld." },
      { q: "Wij hebben om drie uur ___.", a: ["afgesproken", "geafsproken", "afgespreekt"], ex: "spreken düzensiz, af artı gesproken." },
      { q: "Hij is om zes uur ___.", a: ["opgestaan", "geopstaan", "opgestaat"], ex: "op artı gestaan, zijn ile kurulur." },
      { q: "Ik heb mijn buren ___.", a: ["uitgenodigd", "geuitnodigd", "uitnodigd"], ex: "uit artı genodigd, uitgenodigd." },
      { q: "De trein komt om tien uur ___.", a: ["aan", "op", "mee"], ex: "aankomen fiilinde ön ek aan sona gider." },
      { q: "Ik ___ de kinderen om drie uur op.", a: ["haal", "ophaal", "haalt"], ex: "ophalen ana cümlede ayrılır, haal ikinci sırada, op en sonda." },
      { q: "Ik ben moe omdat ik elke dag vroeg ___.", a: ["opsta", "sta op", "op sta"], ex: "Bijzinde fiil bitişik ve en sonda." },
      { q: "Kun je brood ___?", a: ["meenemen", "nemen mee", "mee nemen"], ex: "Modal fiille mastar bitişik ve en sonda." },
      { q: "Ik heb haar gisteren ___.", a: ["opgebeld", "geopbeld", "opbelt"], ex: "op artı gebeld, opgebeld." }
    ]
  },

  {
    id: 'modaal', icon: '🗝️', title: 'Modal fiiller',
    body: `<p>Modal fiiller tek başına pek kullanılmaz, yanına bir fiil daha alır. O ikinci fiil <b>mastar</b> halinde ve <b>cümlenin sonunda</b> durur.</p>
<ul>
<li><b>kunnen</b> yapabilmek, -ebilmek. <i>Ik kan goed koken.</i></li>
<li><b>willen</b> istemek. <i>Hij wil een nieuwe fiets kopen.</i></li>
<li><b>moeten</b> zorunda olmak, -meli. <i>Ik moet morgen werken.</i></li>
<li><b>mogen</b> izni olmak. <i>Mag ik hier parkeren?</i></li>
</ul>
<p>Çekimleri</p>
<ul>
<li>ik kan, jij kunt, hij kan, wij kunnen</li>
<li>ik wil, jij wilt, hij wil, wij willen</li>
<li>ik moet, jij moet, hij moet, wij moeten</li>
<li>ik mag, jij mag, hij mag, wij mogen</li>
</ul>
<p>Dikkat, <b>hij kan, hij wil, hij mag</b> biçimlerinde t yok. Soruda jij arkaya geçince <i>Kun jij</i> ve <i>Wil jij</i> olur.</p>
<p>Kibarca bir şey isterken <i>Ik wil graag een kopje koffie</i> ya da <i>Mag ik de rekening?</i> dersin.</p>
<p>Gerek yok demek için <b>niet hoeven te</b> kullanılır. <i>Je hoeft morgen niet te komen.</i> <i>Je mag niet roken</i> ise yasak demek, ikisini karıştırma.</p>`,
    drills: [
      { q: "Ik ___ goed zwemmen.", a: ["kan", "kun", "kunnen"], ex: "ik ile kan." },
      { q: "Hij ___ een nieuwe fiets kopen.", a: ["wil", "wilt", "willen"], ex: "hij ile wil, t almaz." },
      { q: "Wij ___ morgen vroeg opstaan.", a: ["moeten", "moet"], ex: "wij ile mastar hali, moeten." },
      { q: "___ ik hier parkeren?", a: ["Mag", "Mogen"], ex: "ik ile mag, izin isterken kullanılır." },
      { q: "Jij ___ hier niet roken.", a: ["mag", "mogen", "magt"], ex: "mogen fiilinde jij ile de mag, t almaz." },
      { q: "Ik moet morgen naar de tandarts ___.", a: ["gaan", "ga", "gegaan"], ex: "İkinci fiil mastar halinde en sonda." },
      { q: "Ik wil graag een kopje koffie ___.", a: ["drinken", "drink", "drinkt"], ex: "İkinci fiil mastar halinde en sonda." },
      { q: "___ jij Nederlands spreken?", a: ["Kun", "Kunt", "Kunnen"], ex: "jij fiilden sonra gelince t düşer, kunt değil kun." },
      { q: "Het is verplicht. Je ___ een geldig paspoort hebben.", a: ["moet", "mag", "wil"], ex: "verplicht yani zorunlu diyor, o yüzden moet." },
      { q: "Mijn kinderen ___ op zaterdag lang slapen.", a: ["mogen", "mag"], ex: "Özne çoğul, o yüzden mogen." },
      { q: "Kunt u mij ___?", a: ["helpen", "helpt", "geholpen"], ex: "İkinci fiil mastar halinde en sonda." },
      { q: "Ik kan morgen niet ___, want ik moet werken.", a: ["komen", "kom", "komt"], ex: "kan ile ikinci fiil mastar halinde gelir." },
      { q: "Wat ___ jullie eten?", a: ["willen", "wil", "wilt"], ex: "jullie ile mastar hali, willen." }
    ]
  },

  {
    id: 'meervoud', icon: '👥', title: 'Çoğul yapmak',
    body: `<p>Hollandacada çoğul iki yolla yapılır, <b>-en</b> ya da <b>-s</b>. Ve unutma, bütün çoğullar <b>de</b> alır.</p>
<p><b>-en</b> kelimelerin çoğunda. <i>boek, boeken</i>. <i>fiets, fietsen</i>.</p>
<p><b>-s</b> şu kelimelerde</p>
<ul>
<li>Sonu -el, -em, -en, -er olanlar. <i>tafel, tafels</i>. <i>kamer, kamers</i>.</li>
<li>Sonu -je olanlar. <i>meisje, meisjes</i>.</li>
<li>Sonu a, o, u, i, y olanlar, araya kesme işareti girer. <i>auto, auto's</i>. <i>baby, baby's</i>.</li>
</ul>
<p>Yazarken dikkat</p>
<ul>
<li>Çift yazılan uzun sesli, -en gelince teke düşer. <i>boom, bomen</i>. <i>straat, straten</i>.</li>
<li>Kısa sesliden sonra ünsüz çift yazılır. <i>bus, bussen</i>. <i>bed, bedden</i>.</li>
<li>f bazen v, s bazen z olur. <i>brief, brieven</i>. <i>huis, huizen</i>.</li>
</ul>
<p>Düzensizler</p>
<ul>
<li><i>kind, kinderen</i></li>
<li><i>ei, eieren</i></li>
<li><i>stad, steden</i></li>
<li><i>dag, dagen</i> ve <i>weg, wegen</i>, burada ünsüz çiftleşmiyor</li>
</ul>
<p>Dikkat, sayıdan sonra <i>uur</i> ve <i>euro</i> genelde tekil kalır. <i>drie uur, tien euro</i>.</p>`,
    drills: [
      { q: "Ik heb twee ___.", a: ["boeken", "boeks", "boekken"], ex: "Kelimelerin çoğu -en alır." },
      { q: "In de straat staan veel ___.", a: ["bomen", "boomen", "booms"], ex: "Çift sesli -en gelince teke düşer, bomen." },
      { q: "Er rijden veel ___ in de stad.", a: ["bussen", "busen", "buses"], ex: "Kısa sesliden sonra ünsüz çift yazılır, bussen." },
      { q: "Wij hebben drie ___.", a: ["kinderen", "kinden", "kinds"], ex: "kind düzensiz, kinderen." },
      { q: "Ik heb twee ___ gekregen.", a: ["brieven", "briefen", "briefs"], ex: "f burada v oluyor, brieven." },
      { q: "Deze ___ zijn duur.", a: ["huizen", "huisen", "huises"], ex: "s burada z oluyor, huizen." },
      { q: "Het huis heeft vier ___.", a: ["kamers", "kameren"], ex: "Sonu -er olanlar -s alır, kamers." },
      { q: "Er staan twee ___ voor de deur.", a: ["auto's", "autos", "autoën"], ex: "Sonu o olanlar kesme işaretiyle -s alır, auto's." },
      { q: "In de klas zitten tien ___.", a: ["meisjes", "meisjen"], ex: "Sonu -je olanlar -s alır, meisjes." },
      { q: "In de winter zijn de ___ lang.", a: ["nachten", "nachts"], ex: "nacht -en alır, nachten." },
      { q: "In Nederland zijn veel ___.", a: ["fietsen", "fietses", "fiets's"], ex: "fiets -en alır, fietsen." },
      { q: "Ik koop zes ___.", a: ["eieren", "eien", "eis"], ex: "ei düzensiz, eieren." },
      { q: "De ___ in Amsterdam zijn smal.", a: ["straten", "straaten", "straats"], ex: "Çift sesli -en gelince teke düşer, straten." },
      { q: "Er staan twee ___ in de slaapkamer.", a: ["bedden", "beden", "beds"], ex: "Kısa sesliden sonra ünsüz çift yazılır, bedden." }
    ]
  },

  {
    id: 'bijvoeglijk', icon: '🎨', title: 'Sıfatlar ve -e eki',
    body: `<p>Sıfat ismin önüne gelince genelde sonuna <b>-e</b> alır.</p>
<ul>
<li><i>de grote stad</i></li>
<li><i>het grote huis</i></li>
<li><i>een grote stad</i></li>
<li><i>grote huizen</i></li>
</ul>
<p><b>Tek bir istisna var</b>. İsim tekil bir <b>het-woord</b> ise ve önünde <b>een</b> ya da <b>geen</b> varsa veya hiç tanımlık yoksa sıfat <b>-e almaz</b>.</p>
<ul>
<li><i>een groot huis</i></li>
<li><i>geen groot huis</i></li>
<li><i>mooi weer, koud water</i></li>
</ul>
<p>Sıfat fiilden sonra gelirse hiç ek almaz. <i>Het huis is groot. De stad is mooi.</i></p>
<p>Yazarken dikkat</p>
<ul>
<li>Çift yazılan uzun sesli teke düşer. <i>groot, grote</i>. <i>duur, dure</i>.</li>
<li>Kısa sesliden sonra ünsüz çift yazılır. <i>dik, dikke</i>. <i>wit, witte</i>.</li>
<li>f bazen v, s bazen z olur. <i>lief, lieve</i>. <i>vies, vieze</i>.</li>
</ul>
<p>Pratik test şu. İsim tekil bir het-woord mu ve önünde een, geen ya da hiçbir şey yok mu? Evetse ek yok. Geri kalan her durumda -e. İşte bu yüzden her ismi de ya da het ile beraber öğrenmek burada da çok işine yarar.</p>`,
    drills: [
      { q: "Ik woon in een ___ huis.", a: ["groot", "grote"], ex: "huis het-woord, önünde een var, -e yok." },
      { q: "Het ___ huis is van mijn buren.", a: ["grote", "groot"], ex: "Önünde het var, -e gelir." },
      { q: "Wij hebben een ___ auto gekocht.", a: ["nieuwe", "nieuw"], ex: "auto de-woord, een olsa bile -e gelir." },
      { q: "Het weer is vandaag ___.", a: ["mooi", "mooie"], ex: "Sıfat fiilden sonra, ek almaz." },
      { q: "Vandaag is het ___ weer.", a: ["mooi", "mooie"], ex: "weer het-woord ve tanımlık yok, -e almaz." },
      { q: "Ik zoek een ___ baan.", a: ["leuke", "leuk"], ex: "baan de-woord, -e gelir." },
      { q: "Mijn zoon heeft een ___ bed.", a: ["klein", "kleine"], ex: "bed het-woord, önünde een var, -e yok." },
      { q: "De ___ kinderen spelen buiten.", a: ["kleine", "klein"], ex: "Çoğulda her zaman -e gelir." },
      { q: "Dit is een ___ boek.", a: ["dik", "dikke"], ex: "boek het-woord, önünde een var, -e yok." },
      { q: "Ik heb ___ handen.", a: ["vieze", "viese", "vies"], ex: "Çoğul, -e gelir ve s z olur." },
      { q: "Wij hebben ___ buren.", a: ["lieve", "liefe", "lief"], ex: "Çoğul, -e gelir ve f v olur." },
      { q: "Dat is een ___ restaurant.", a: ["duur", "dure", "duure"], ex: "restaurant het-woord, önünde een var, -e yok." },
      { q: "Ik drink ___ water.", a: ["koud", "koude"], ex: "water het-woord ve tanımlık yok, -e almaz." },
      { q: "Het ___ station is dichtbij.", a: ["nieuwe", "nieuw"], ex: "Önünde het var, -e gelir." }
    ]
  },

  {
    id: 'negatie', icon: '🚫', title: 'Olumsuzluk, geen mi niet mi?',
    body: `<p>Hollandacada olumsuzluk için iki kelime var, <b>geen</b> ve <b>niet</b>.</p>
<p><b>geen</b> bir ismi olumsuz yapar. Önünde <b>een</b> olan ya da hiç tanımlık olmayan isimlerle kullanılır.</p>
<ul>
<li><i>Ik heb een auto. Ik heb <b>geen</b> auto.</i></li>
<li><i>Ik drink koffie. Ik drink <b>geen</b> koffie.</i></li>
<li><i>Ik heb <b>geen</b> tijd. Er is <b>geen</b> melk.</i></li>
</ul>
<p><b>niet</b> geri kalan her şey için.</p>
<ul>
<li>Fiil. <i>Ik werk vandaag <b>niet</b>.</i></li>
<li>Sıfat. <i>Het is <b>niet</b> duur.</i></li>
<li>Önünde de, het ya da mijn gibi bir kelime olan isim. <i>Ik zie de bus <b>niet</b>. Dat is <b>niet</b> mijn tas.</i></li>
</ul>
<p>niet nereye gelir?</p>
<ul>
<li>Genelde cümlenin sonuna. <i>Ik begrijp het <b>niet</b>.</i></li>
<li>Sıfattan ve edattan önce. <i>Ik ben <b>niet</b> ziek. Ik ga <b>niet</b> naar school.</i></li>
<li>Sondaki ikinci fiilden önce. <i>Ik heb de brief <b>niet</b> gelezen.</i></li>
</ul>
<p>Kabaca şöyle düşün. Türkçedeki <i>yok</i> ve <i>hiç</i> çoğu zaman geen, <i>değil</i> ve <i>-me</i> eki çoğu zaman niet olur.</p>`,
    drills: [
      { q: "Ik heb ___ auto.", a: ["geen", "niet"], ex: "een auto olumsuz olunca geen auto olur." },
      { q: "Ik werk vandaag ___.", a: ["niet", "geen"], ex: "Olumsuz olan fiil, o yüzden niet." },
      { q: "Hij drinkt ___ koffie.", a: ["geen", "niet"], ex: "Tanımlıksız isim, o yüzden geen." },
      { q: "Het eten is ___ lekker.", a: ["niet", "geen"], ex: "Olumsuz olan sıfat, o yüzden niet." },
      { q: "Ik zie de bus ___.", a: ["niet", "geen"], ex: "Önünde de olan isim, o yüzden niet." },
      { q: "Wij hebben ___ kinderen.", a: ["geen", "niet"], ex: "Tanımlıksız çoğul isim, o yüzden geen." },
      { q: "Dat is ___ mijn tas.", a: ["niet", "geen"], ex: "Önünde mijn olan isim, o yüzden niet." },
      { q: "Ik heb ___ broers of zussen.", a: ["geen", "niet"], ex: "Tanımlıksız çoğul isim, o yüzden geen." },
      { q: "Ik ga morgen ___ naar school.", a: ["niet", "geen"], ex: "Fiil olumsuz, niet edattan önce gelir." },
      { q: "Er is ___ melk meer.", a: ["geen", "niet"], ex: "Tanımlıksız isim, o yüzden geen." },
      { q: "Ik heb het formulier ___ ingevuld.", a: ["niet", "geen"], ex: "Fiil olumsuz, niet sondaki participle'dan önce gelir." },
      { q: "Zij is ___ ziek.", a: ["niet", "geen"], ex: "Olumsuz olan sıfat, o yüzden niet." },
      { q: "Ik heb ___ tijd.", a: ["geen", "niet"], ex: "Tanımlıksız isim, o yüzden geen." },
      { q: "Heb je ___ honger?", a: ["geen", "niet"], ex: "honger bir isim, o yüzden geen." }
    ]
  },

  {
    id: 'vergelijken', icon: '⚖️', title: 'Karşılaştırma',
    body: `<p>Karşılaştırma yaparken sıfata <b>-er</b> eklersin, arkasından da <b>dan</b> gelir.</p>
<p><i>Amsterdam is <b>groter dan</b> Purmerend.</i></p>
<p>En üstün derece için <b>-st</b> eklenir. <i>Dit is het grootste huis. Dit huis is het grootst.</i></p>
<ul>
<li><i>klein, kleiner, kleinst</i></li>
<li><i>snel, sneller, snelst</i></li>
<li><i>groot, groter, grootst</i>, uzun sesli teke düşer</li>
<li><i>dik, dikker, dikst</i>, ünsüz çift yazılır</li>
<li>Sonu -r olan sıfatlara <b>-der</b> gelir. <i>duur, duurder</i>. <i>lekker, lekkerder</i>.</li>
<li>Uzun sıfatlar da -er alır, meer moeilijk denmez. <i>moeilijk, moeilijker</i>.</li>
</ul>
<p>Düzensizler</p>
<ul>
<li><i>goed, beter, best</i></li>
<li><i>veel, meer, meest</i></li>
<li><i>weinig, minder, minst</i></li>
<li><i>graag, liever, liefst</i></li>
</ul>
<p>Eşitlik için <b>even ... als</b> ya da <b>zo ... als</b> kullanılır. <i>Zij is even oud als haar man.</i></p>
<p>İsmin önüne gelince karşılaştırma biçimi de -e alabilir. <i>een groter huis, de grootste stad</i>.</p>
<p>Dikkat, karşılaştırmada <b>dan</b>, eşitlikte <b>als</b>. Türkçedeki <i>-den daha</i> Hollandacada <i>-er dan</i> olur.</p>`,
    drills: [
      { q: "Amsterdam is ___ dan Purmerend.", a: ["groter", "grootter", "meer groot"], ex: "groot artı -er, uzun sesli teke düşer." },
      { q: "Mijn broer is ___ dan ik.", a: ["ouder", "oudder", "meer oud"], ex: "oud artı -er, ouder." },
      { q: "De trein is ___ dan de bus.", a: ["sneller", "sneler"], ex: "Kısa sesliden sonra ünsüz çift yazılır, sneller." },
      { q: "Dit huis is ___ dan dat huis.", a: ["duurder", "duurer", "duurst"], ex: "Sonu -r olan sıfatlar -der alır." },
      { q: "Mijn Nederlands is nu ___ dan vorig jaar.", a: ["beter", "goeder", "best"], ex: "goed düzensiz, beter." },
      { q: "Dit is de ___ winkel van Purmerend.", a: ["goedkoopste", "goedkopere", "meest goedkoop"], ex: "İsmin önünde en üstün derece, -ste." },
      { q: "Ik drink ___ thee dan koffie.", a: ["liever", "graager", "meer graag"], ex: "graag düzensiz, liever." },
      { q: "Wie heeft de ___ kinderen?", a: ["meeste", "meer", "veelste"], ex: "veel düzensiz, en çok anlamında meeste." },
      { q: "Ik heb ___ tijd dan vroeger.", a: ["minder", "weiniger", "minst"], ex: "weinig düzensiz, minder." },
      { q: "Zij is even oud ___ haar man.", a: ["als", "dan"], ex: "Eşitlikte als kullanılır." },
      { q: "Mijn zoon is ouder ___ mijn dochter.", a: ["dan", "als"], ex: "Karşılaştırmada dan kullanılır." },
      { q: "Welke tas vind jij het ___?", a: ["mooist", "mooier", "mooie"], ex: "het ile en üstün derece, mooist." },
      { q: "Dit examen is ___ dan het vorige.", a: ["moeilijker", "meer moeilijk"], ex: "Uzun sıfatlar da -er alır, meer moeilijk denmez." }
    ]
  },

  {
    id: 'voornaamwoorden', icon: '🙋', title: 'Zamirler',
    body: `<p>Her şahıs için üç biçim var. Subject yani özne, nesne ve iyelik.</p>
<ul>
<li><b>ik</b>, mij veya me, mijn</li>
<li><b>jij</b> veya je, jou veya je, jouw veya je</li>
<li><b>u</b>, u, uw. Resmi, kibar hitap.</li>
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
<p><b>ons</b> mu <b>onze</b> mi? Tekil bir het-woord önünde <b>ons</b>, de-woord ve çoğul önünde <b>onze</b>.</p>
<p><i>ons huis, onze auto, onze kinderen</i></p>
<p>Dikkat, <b>jou</b> nesne, <b>jouw</b> iyelik. Resmi yazışmalarda, doktorda, belediyede genelde <b>u</b> ve <b>uw</b> duyarsın.</p>`,
    drills: [
      { q: "Ik heb een fiets. Dat is ___ fiets.", a: ["mijn", "mij", "me"], ex: "İyelik biçimi, mijn." },
      { q: "Ik heb een vraag. Kun je ___ helpen?", a: ["mij", "mijn", "ik"], ex: "Nesne biçimi, mij." },
      { q: "Wij hebben een huis. ___ huis is groot.", a: ["Ons", "Onze"], ex: "huis tekil bir het-woord, o yüzden ons." },
      { q: "Wij hebben een auto. ___ auto is oud.", a: ["Onze", "Ons"], ex: "auto bir de-woord, o yüzden onze." },
      { q: "Wat is ___ naam, meneer?", a: ["uw", "u", "jij"], ex: "Resmi hitapta iyelik biçimi uw." },
      { q: "Mijn zus is ziek. Ik bel ___ vanavond.", a: ["haar", "zij", "hem"], ex: "Kadın için nesne biçimi haar." },
      { q: "Waar is Ahmet? Ik zie ___ niet.", a: ["hem", "hij", "zijn"], ex: "Erkek için nesne biçimi hem." },
      { q: "Ahmet en ___ vrouw wonen in Purmerend.", a: ["zijn", "hem", "hij"], ex: "Ahmet erkek, iyelik biçimi zijn." },
      { q: "Is dit ___ jas, Sara?", a: ["jouw", "jou", "jij"], ex: "İyelik biçimi jouw." },
      { q: "Sara, ik geef ___ een cadeau.", a: ["jou", "jouw", "jij"], ex: "Nesne biçimi jou." },
      { q: "De kinderen zijn thuis. ___ moeder is aan het werk.", a: ["Hun", "Hen", "Zij"], ex: "Çoğulda iyelik biçimi hun." },
      { q: "Jullie zijn welkom. Komen ___ morgen?", a: ["jullie", "jouw", "hun"], ex: "Özne biçimi jullie." },
      { q: "Wij gaan naar het park. Ga je met ___ mee?", a: ["ons", "onze", "wij"], ex: "Edattan sonra nesne biçimi gelir, ons." },
      { q: "Wij hebben twee kinderen. ___ kinderen gaan naar de basisschool.", a: ["Onze", "Ons"], ex: "Çoğul önünde onze." }
    ]
  },

  {
    id: 'voorzetsels', icon: '📍', title: 'Edatlar',
    body: `<p>Türkçede hal ekleriyle yaptığımız işi Hollandacada edatlar yapar. En önemlileri bunlar.</p>
<ul>
<li><b>in</b> içinde. Şehir, ülke, ay, yıl, mevsim. <i>in Purmerend, in de winkel, in mei, in 2020, in de zomer, in het weekend</i></li>
<li><b>op</b> üstünde. Günler ve bazı yerler. <i>op tafel, op maandag, op 3 mei, op school, op het werk</i></li>
<li><b>aan</b> bitişik, kenarında. <i>aan de muur, aan tafel zitten</i></li>
<li><b>naar</b> bir yere doğru, yani -e. <i>naar Amsterdam, naar huis, naar de dokter</i></li>
<li><b>bij</b> birinin yanında, bir yerde. <i>bij de bakker, bij mijn moeder, Ik werk bij een bedrijf.</i></li>
<li><b>met</b> ile. <i>met de bus, met mijn vrouw</i></li>
<li><b>voor</b> için ya da önünde. <i>voor jou, voor het huis</i></li>
<li><b>om</b> saatlerde. <i>om 9 uur, om half drie</i></li>
</ul>
<p>Zaman için kısa özet. Saat <b>om</b>, gün ve tarih <b>op</b>, ay, yıl, mevsim ve hafta sonu <b>in</b>.</p>
<p>Gitmek ile orada olmak farklı şeyler. <i>Ik ga <b>naar</b> de huisarts</i> gidişi anlatır. <i>Ik ben <b>bij</b> de huisarts</i> oradasın demek. <i>Ik heb een afspraak <b>bij</b> de huisarts</i> da bij ile kurulur.</p>`,
    drills: [
      { q: "De les begint ___ negen uur.", a: ["om", "op", "in"], ex: "Saatlerde om kullanılır." },
      { q: "Ik werk niet ___ maandag.", a: ["op", "in", "om"], ex: "Günlerde op kullanılır." },
      { q: "___ het weekend slaap ik lang.", a: ["In", "Op", "Om"], ex: "Hafta sonu için in het weekend denir." },
      { q: "Ik woon ___ Purmerend.", a: ["in", "op", "naar"], ex: "Şehir isimlerinde in kullanılır." },
      { q: "Ik ga morgen ___ Amsterdam.", a: ["naar", "in", "bij"], ex: "Bir yere gidiyorsan naar." },
      { q: "Ik koop brood ___ de bakker.", a: ["bij", "naar", "op"], ex: "Bir dükkânda ya da birinin yanında bij kullanılır." },
      { q: "Ik ga ___ de bus naar mijn werk.", a: ["met", "op", "naar"], ex: "Ulaşım aracıyla gidiyorsan met." },
      { q: "Mijn zoon zit ___ school.", a: ["op", "in", "aan"], ex: "Okul için op school denir." },
      { q: "Dit cadeau is ___ jou.", a: ["voor", "naar", "met"], ex: "Biri için anlamında voor kullanılır." },
      { q: "___ de zomer gaan we naar Turkije.", a: ["In", "Op", "Om"], ex: "Mevsimlerde in kullanılır." },
      { q: "Het boek ligt ___ tafel.", a: ["op", "aan", "naar"], ex: "Bir şeyin üstündeyse op." },
      { q: "Wij zitten ___ tafel en eten.", a: ["aan", "op", "naar"], ex: "Masada oturup yemek yemek için aan tafel zitten denir." },
      { q: "Ik heb een afspraak ___ de huisarts.", a: ["bij", "naar", "op"], ex: "Randevu birinin yanında olur, o yüzden bij." },
      { q: "___ 3 mei is mijn verjaardag.", a: ["Op", "In", "Om"], ex: "Tarihlerde op kullanılır." }
    ]
  },

  {
    id: 'er', icon: '👉', title: 'Er kelimesi',
    body: `<p><b>er</b> küçük ama her yerde karşına çıkan bir kelime. A2 için en önemli üç kullanımı şunlar.</p>
<p><b>1. er is ve er zijn</b>, Türkçedeki <i>var</i>. Tekil için <b>er is</b>, çoğul için <b>er zijn</b>.</p>
<ul>
<li><i>Er is een supermarkt in de buurt.</i></li>
<li><i>Er zijn veel fietsen in Nederland.</i></li>
<li><i>Er is geen melk meer.</i></li>
<li><i>Wat is er aan de hand?</i></li>
</ul>
<p><b>2. Sayı ya da miktarla</b>. İsmi tekrar etmemek için er kullanılır. İsim söylenmez ama er mutlaka gelir.</p>
<ul>
<li><i>Hoeveel kinderen heb je? Ik heb <b>er</b> twee.</i></li>
<li><i>Heb je nog eieren? Ja, ik heb <b>er</b> nog zes.</i></li>
<li><i>Heb je een auto? Nee, ik heb <b>er</b> geen.</i></li>
</ul>
<p><b>3. Yer için</b>, daha önce söylenen yerin yerine. Yani <i>orada</i>.</p>
<ul>
<li><i>Ben je al in Utrecht geweest? Ja, ik ben <b>er</b> vorig jaar geweest.</i></li>
<li><i>Woon je in Purmerend? Ja, ik woon <b>er</b> al vijf jaar.</i></li>
</ul>
<p>Türkçede tam karşılığı olmadığı için çok unutulur. <i>Ik heb twee</i> yanlış, <i>Ik heb er twee</i> doğru.</p>`,
    drills: [
      { q: "___ is een apotheek in de buurt.", a: ["Er", "Het"], ex: "var demek için er is." },
      { q: "Er ___ veel mensen in de trein.", a: ["zijn", "is"], ex: "İsim çoğul, er zijn." },
      { q: "Er ___ een brief voor jou.", a: ["is", "zijn"], ex: "İsim tekil, er is." },
      { q: "Hoeveel kinderen heb je? Ik heb ___ drie.", a: ["er", "het", "ze"], ex: "Sayıyla beraber ismin yerine er gelir." },
      { q: "Heb je nog eieren? Ja, ik heb ___ nog zes.", a: ["er", "ze", "het"], ex: "Miktarla beraber ismin yerine er gelir." },
      { q: "Is er nog koffie? Nee, er is ___ koffie meer.", a: ["geen", "niet"], ex: "Tanımlıksız isim, o yüzden geen." },
      { q: "Ben je al in Utrecht geweest? Ja, ik ben ___ vorig jaar geweest.", a: ["er", "het", "ze"], ex: "Daha önce söylenen yer için er." },
      { q: "Hoeveel broers heb je? Ik heb ___ één.", a: ["er", "hem", "het"], ex: "Sayıyla beraber er gelir." },
      { q: "___ zijn twee bushaltes in onze straat.", a: ["Er", "Het"], ex: "var demek için er zijn." },
      { q: "Er ___ geen supermarkt in ons dorp.", a: ["is", "zijn"], ex: "İsim tekil, er is." },
      { q: "Wat ___ er aan de hand?", a: ["is", "zijn"], ex: "Kalıp ifade, wat is er aan de hand, yani ne oldu." },
      { q: "Hoeveel appels wil je? Ik wil ___ vier.", a: ["er", "ze", "het"], ex: "Sayıyla beraber ismin yerine er gelir." },
      { q: "Woon je in Purmerend? Ja, ik woon ___ al vijf jaar.", a: ["er", "het", "hem"], ex: "Daha önce söylenen yer için er." }
    ]
  }
];

if (typeof module !== 'undefined') module.exports = { VERBS, GRAMMAR };
