'use strict';

// Kelime temaları. Her satır hollandaca|türkçe|örnek cümle biçimindedir.

const VOCAB_THEMES = [
  { id: 'persoon', icon: '🪪', title: 'Kişisel bilgiler', words: `
de naam|isim|Mijn naam is Burak.
de achternaam|soyadı|Wat is uw achternaam?
de voornaam|ad, ön ad|Mijn voornaam staat op mijn paspoort.
het adres|adres|Wat is uw adres?
de straat|sokak, cadde|Ik woon in een rustige straat.
het huisnummer|kapı numarası|Mijn huisnummer is 12.
de postcode|posta kodu|Wat is uw postcode?
de woonplaats|ikamet yeri, oturduğun şehir|Mijn woonplaats is Purmerend.
wonen|oturmak, yaşamak|Ik woon in Purmerend.
de geboortedatum|doğum tarihi|Wat is uw geboortedatum?
de geboorteplaats|doğum yeri|Mijn geboorteplaats is Ankara.
de nationaliteit|uyruk, vatandaşlık|Ik heb de Turkse nationaliteit.
getrouwd|evli|Ik ben getrouwd.
gescheiden|boşanmış|Mijn buurman is gescheiden.
alleenstaand|bekâr, yalnız yaşayan|Zij is alleenstaand en heeft twee kinderen.
het telefoonnummer|telefon numarası|Mag ik uw telefoonnummer?
het e-mailadres|e-posta adresi|Wat is uw e-mailadres?
de handtekening|imza|Zet hier uw handtekening.
de leeftijd|yaş|Wat is uw leeftijd?
het land|ülke|Uit welk land komt u?
de taal|dil|Welke taal spreekt u thuis?
` },

  { id: 'familie', icon: '👨‍👩‍👧', title: 'Aile', words: `
de familie|aile, akrabalar|Mijn familie woont in Turkije.
het gezin|çekirdek aile|Wij zijn een gezin met twee kinderen.
de ouders|anne ve baba|Mijn ouders wonen in Istanbul.
de vader|baba|Mijn vader is zestig jaar.
de moeder|anne|Mijn moeder belt elke zondag.
de man|erkek, koca|Haar man werkt in Amsterdam.
de vrouw|kadın, eş|Mijn vrouw spreekt ook Nederlands.
de partner|partner, eş|Mijn partner werkt in een ziekenhuis.
het kind|çocuk|Het kind speelt buiten.
de zoon|oğul|Mijn zoon is acht jaar.
de dochter|kız evlat|Onze dochter zit in groep 3.
de broer|erkek kardeş, ağabey|Mijn broer woont in Rotterdam.
de zus|kız kardeş, abla|Mijn zus heeft twee kinderen.
de opa|dede|Opa komt in de zomer op bezoek.
de oma|nine, babaanne, anneanne|Oma maakt lekkere soep.
de grootouders|büyükanne ve büyükbaba|Mijn grootouders wonen in een dorp.
de oom|amca, dayı|Mijn oom heeft een winkel.
de tante|teyze, hala|Mijn tante woont in Duitsland.
de neef|erkek kuzen, erkek yeğen|Mijn neef studeert in Utrecht.
de nicht|kız kuzen, kız yeğen|Mijn nicht is net getrouwd.
de baby|bebek|De baby huilt veel.
de schoonmoeder|kayınvalide|Mijn schoonmoeder komt morgen.
de echtgenoot|eş, koca|Haar echtgenoot heet Mehmet.
trouwen|evlenmek|Wij zijn in 2015 getrouwd.
het huwelijk|evlilik|Het huwelijk was in Turkije.
de verjaardag|doğum günü|Morgen is mijn verjaardag.
` },

  { id: 'huis', icon: '🏠', title: 'Ev ve yaşam', words: `
het huis|ev|Ons huis heeft een tuin.
de woning|konut, daire|Wij zoeken een grotere woning.
het appartement|daire|Ik woon in een appartement.
de flat|apartman, blok|De flat heeft vier verdiepingen.
de huur|kira|De huur is 900 euro per maand.
huren|kiralamak|Wij huren een huis in Purmerend.
de huurder|kiracı|De huurder betaalt elke maand op tijd.
de verhuurder|ev sahibi, kiraya veren|Ik bel de verhuurder over de lekkage.
de buren|komşular|Onze buren zijn erg aardig.
de buurman|erkek komşu|De buurman helpt mij met de fiets.
de buurt|mahalle, semt|Het is een rustige buurt.
de kamer|oda|Het huis heeft drie kamers.
de woonkamer|oturma odası|We zitten samen in de woonkamer.
de slaapkamer|yatak odası|De slaapkamer is boven.
de keuken|mutfak|Ik kook in de keuken.
de badkamer|banyo|De badkamer is klein.
het toilet|tuvalet|Het toilet is beneden.
de tuin|bahçe|De kinderen spelen in de tuin.
het balkon|balkon|Wij hebben een klein balkon.
de trap|merdiven|De trap is steil.
de deur|kapı|Doe de deur dicht, alsjeblieft.
het raam|pencere|Mag het raam open?
de sleutel|anahtar|Ik ben mijn sleutel kwijt.
de verwarming|ısıtma, kalorifer|De verwarming is kapot.
het afval|çöp, atık|Het afval wordt op dinsdag opgehaald.
de vuilniszak|çöp torbası|Doe de vuilniszak in de container.
de container|çöp konteyneri|De container staat op de hoek.
de energierekening|enerji faturası|De energierekening is dit jaar hoog.
de lekkage|su sızıntısı|Er is een lekkage in de badkamer.
verhuizen|taşınmak|Wij verhuizen volgende maand.
schoonmaken|temizlemek|Ik maak de keuken schoon.
de stofzuiger|elektrik süpürgesi|De stofzuiger staat in de gang.
de kast|dolap|De borden staan in de kast.
het bed|yatak|Het bed is te klein.
de stoel|sandalye|Pak een stoel en ga zitten.
de tafel|masa|Het eten staat op tafel.
` },

  { id: 'eten', icon: '🍞', title: 'Yemek ve içecek', words: `
het eten|yemek|Het eten is klaar.
het brood|ekmek|Ik koop vers brood.
het broodje|sandviç, küçük ekmek|Ik eet een broodje kaas.
de boter|tereyağı|Wil je boter op je brood?
de kaas|peynir|Nederlandse kaas is beroemd.
de melk|süt|Ik koop twee pakken melk.
het ei|yumurta|Ik eet elke ochtend een ei.
de groente|sebze|Groente is gezond.
het fruit|meyve|De kinderen eten veel fruit.
de appel|elma|Ik neem een appel mee naar mijn werk.
de aardappel|patates|Wij eten vaak aardappels.
de rijst|pirinç|Ik kook rijst met kip.
de kip|tavuk|De kip is lekker.
het vlees|et|Het vlees is vers.
de vis|balık|Op vrijdag eten we vis.
de soep|çorba|De soep is heet.
de suiker|şeker|Ik drink thee zonder suiker.
het zout|tuz|Mag ik het zout?
de koffie|kahve|Wilt u koffie of thee?
de thee|çay|Ik drink graag Turkse thee.
het water|su|Een glas water, alstublieft.
het sap|meyve suyu|Ik wil een glas sap.
het ontbijt|kahvaltı|Het ontbijt is om half acht.
de lunch|öğle yemeği|Ik neem een broodje voor de lunch.
het avondeten|akşam yemeği|Het avondeten is om zes uur.
koken|yemek pişirmek|Mijn man kookt vandaag.
lekker|lezzetli|De soep is erg lekker.
de honger|açlık|Ik heb honger.
de dorst|susuzluk|Heb je dorst?
het glas|bardak|Mag ik een glas water?
het bord|tabak|Zet de borden op tafel.
het mes|bıçak|Het mes is scherp.
de vork|çatal|Ik eet met mes en vork.
de lepel|kaşık|Ik heb een lepel nodig voor de soep.
de koelkast|buzdolabı|De melk staat in de koelkast.
het restaurant|restoran|We gaan zaterdag naar een restaurant.
bestellen|sipariş etmek|Ik bestel een pizza.
de rekening|hesap, fatura|Mag ik de rekening, alstublieft?
` },

  { id: 'winkel', icon: '🛒', title: 'Alışveriş', words: `
de winkel|dükkân, mağaza|De winkel gaat om negen uur open.
de supermarkt|süpermarket|Ik doe boodschappen in de supermarkt.
de boodschappen|market alışverişi|Ik doe op zaterdag boodschappen.
de markt|pazar|Op dinsdag is er markt in het centrum.
de bakker|fırın, fırıncı|Ik koop brood bij de bakker.
de prijs|fiyat|Wat is de prijs van deze jas?
duur|pahalı|Die schoenen zijn te duur.
goedkoop|ucuz|Deze winkel is goedkoop.
kosten|tutmak, mal olmak|Hoeveel kost dit?
betalen|ödemek|Kan ik hier met mijn telefoon betalen?
pinnen|banka kartıyla ödemek|Kan ik hier pinnen?
contant|nakit|Ik betaal contant.
de pinpas|banka kartı|Ik ben mijn pinpas vergeten.
de kassa|kasa|U kunt betalen bij de kassa.
de bon|fiş|Bewaar de bon goed.
de aanbieding|kampanya, indirimli ürün|Kaas is deze week in de aanbieding.
de korting|indirim|Ik krijg tien procent korting.
ruilen|değiştirmek|Kan ik deze broek ruilen?
terugbrengen|iade etmek, geri götürmek|Ik breng de jas terug naar de winkel.
de maat|beden|Welke maat heeft u?
passen|denemek, uymak|Mag ik deze broek passen?
de kleren|kıyafetler|Ik koop nieuwe kleren voor de kinderen.
de jas|mont, ceket|Mijn jas is te klein.
de broek|pantolon|Deze broek is te lang.
de schoen|ayakkabı|Mijn schoen is kapot.
de tas|çanta|Heeft u een tas nodig?
het geld|para|Ik heb geen geld bij me.
open|açık|Is de winkel op zondag open?
dicht|kapalı|De bakker is op maandag dicht.
` },

  { id: 'werk', icon: '💼', title: 'İş', words: `
het werk|iş|Mijn werk begint om acht uur.
de baan|iş, pozisyon|Ik zoek een nieuwe baan.
de vacature|iş ilanı|Ik zag een vacature op internet.
solliciteren|işe başvurmak|Ik solliciteer bij een bakkerij.
de sollicitatie|iş başvurusu|Ik stuur mijn sollicitatie per e-mail.
het sollicitatiegesprek|iş görüşmesi|Het sollicitatiegesprek is om tien uur.
het cv|özgeçmiş|Stuur uw cv naar dit adres.
het contract|sözleşme|Ik heb een contract voor een jaar.
de werkgever|işveren|Mijn werkgever betaalt de reiskosten.
de werknemer|çalışan, işçi|Het bedrijf heeft vijftig werknemers.
de collega|iş arkadaşı|Mijn collega helpt mij vaak.
de baas|patron|Mijn baas is streng maar eerlijk.
de manager|yönetici|De manager heeft geen tijd.
het bedrijf|şirket|Ik werk bij een groot bedrijf.
het kantoor|ofis|Ik werk op een kantoor in Amsterdam.
de klant|müşteri|De klant wil de manager spreken.
het salaris|maaş|Het salaris komt aan het eind van de maand.
het loon|ücret|Het loon wordt elke maand betaald.
fulltime|tam zamanlı|Ik werk fulltime.
parttime|yarı zamanlı|Mijn vrouw werkt parttime.
de dienst|vardiya|Ik heb vandaag een late dienst.
het rooster|çalışma çizelgesi|Het nieuwe rooster hangt in de kantine.
zich ziek melden|işe hastayım diye haber vermek|Ik meld me ziek bij mijn baas.
de vakantiedagen|izin günleri|Ik heb nog tien vakantiedagen.
het uitzendbureau|geçici iş ajansı|Ik heb werk via een uitzendbureau.
de vergadering|toplantı|De vergadering begint om negen uur.
de pauze|mola|Om twaalf uur heb ik pauze.
overwerken|fazla mesai yapmak|Ik moet vandaag overwerken.
de ervaring|deneyim|Ik heb vijf jaar ervaring.
het diploma|diploma|Mijn diploma komt uit Turkije.
de opleiding|eğitim, meslek eğitimi|Ik volg een opleiding tot kok.
werkloos|işsiz|Hij is al drie maanden werkloos.
de uitkering|sosyal yardım, işsizlik ödeneği|Hij krijgt een uitkering.
` },

  { id: 'gezondheid', icon: '🏥', title: 'Sağlık', words: `
de gezondheid|sağlık|Sport is goed voor je gezondheid.
gezond|sağlıklı|Fietsen is gezond.
ziek|hasta|Mijn dochter is ziek.
de huisarts|aile hekimi|Ik bel de huisarts voor een afspraak.
de doktersassistent|doktor asistanı|De doktersassistent vraagt wat er aan de hand is.
de afspraak|randevu|Ik heb morgen een afspraak bij de tandarts.
het spreekuur|muayene saatleri|De huisarts heeft elke ochtend spreekuur.
de huisartsenpost|nöbetçi doktor merkezi|In het weekend bel je de huisartsenpost.
de dokter|doktor|De dokter kijkt naar mijn keel.
de specialist|uzman doktor|De huisarts stuurt mij naar een specialist.
de verwijsbrief|sevk belgesi|Voor de specialist heeft u een verwijsbrief nodig.
het ziekenhuis|hastane|Hij ligt in het ziekenhuis.
de apotheek|eczane|Ik haal mijn medicijnen bij de apotheek.
het recept|reçete, yemek tarifi|De huisarts geeft mij een recept.
het medicijn|ilaç|Dit medicijn moet je drie keer per dag nemen.
de pil|hap|Ik neem een pil tegen de pijn.
de zorgverzekering|sağlık sigortası|Iedereen in Nederland moet een zorgverzekering hebben.
het eigen risico|sigortada cepten ödenen pay|Ik heb mijn eigen risico al betaald.
de tandarts|diş hekimi|Ik ga twee keer per jaar naar de tandarts.
de koorts|ateş|Het kind heeft koorts.
de pijn|ağrı|Ik heb pijn in mijn rug.
de hoofdpijn|baş ağrısı|Ik heb hoofdpijn.
de buikpijn|karın ağrısı|Mijn zoon heeft buikpijn.
hoesten|öksürmek|Ik hoest al een week.
de griep|grip|Ik heb griep en blijf in bed.
verkouden|nezle olmuş|Ik ben verkouden.
het ongeluk|kaza|Er is een ongeluk gebeurd.
de ambulance|ambulans|Bel 112 voor een ambulance.
de spoedeisende hulp|acil servis|Na het ongeluk ging hij naar de spoedeisende hulp.
de wond|yara|De wond is niet diep.
gewond|yaralı|Twee mensen zijn gewond.
de beterschap|geçmiş olsun, iyileşme|Ik wens je veel beterschap.
` },

  { id: 'lichaam', icon: '🫀', title: 'Vücut', words: `
het lichaam|vücut|Sport is goed voor je lichaam.
het hoofd|baş|Mijn hoofd doet pijn.
het haar|saç|Zij heeft lang haar.
het oog|göz|Mijn oog is rood.
het oor|kulak|Het kind heeft pijn aan zijn oor.
de neus|burun|Mijn neus loopt.
de mond|ağız|Doe uw mond open, alstublieft.
de tand|diş|Ik heb pijn aan een tand.
de keel|boğaz|Ik heb een zere keel.
de nek|ense, boyun|Ik heb last van mijn nek.
de schouder|omuz|Mijn schouder doet pijn.
de arm|kol|Hij heeft zijn arm gebroken.
de hand|el|Was je handen voor het eten.
de vinger|parmak|Ik heb me in mijn vinger gesneden.
de buik|karın|Mijn buik doet pijn.
de rug|sırt|Ik heb last van mijn rug.
het been|bacak|Zij heeft haar been gebroken.
de knie|diz|Mijn knie doet pijn bij het fietsen.
de voet|ayak|Mijn voet is dik.
het hart|kalp|Zijn hart is gezond.
` },

  { id: 'vervoer', icon: '🚲', title: 'Ulaşım', words: `
het openbaar vervoer|toplu taşıma|Het openbaar vervoer is goed in Nederland.
de OV-chipkaart|toplu taşıma kartı|Ik reis met mijn OV-chipkaart.
inchecken|kart okutarak binmek|Je moet inchecken in de bus.
uitchecken|kart okutarak inmek|Vergeet niet uit te checken.
de trein|tren|De trein naar Amsterdam vertrekt om kwart over acht.
de bus|otobüs|De bus is vol.
de tram|tramvay|In Amsterdam neem ik de tram.
de metro|metro|Ik neem de metro naar het centrum.
het station|istasyon|Het station is dichtbij.
het perron|peron|De trein vertrekt van perron 3.
de halte|durak|Ik stap uit bij de volgende halte.
overstappen|aktarma yapmak|U moet in Zaandam overstappen.
de vertraging|gecikme|De trein heeft tien minuten vertraging.
vertrekken|kalkmak, yola çıkmak|De bus vertrekt over vijf minuten.
aankomen|varmak|De trein komt om tien uur aan.
het kaartje|bilet|Ik koop een kaartje bij de automaat.
de dienstregeling|sefer tarifesi|Kijk op de dienstregeling.
de fiets|bisiklet|Ik ga met de fiets naar mijn werk.
fietsen|bisiklet sürmek|Mijn kinderen fietsen naar school.
het fietspad|bisiklet yolu|Fiets altijd op het fietspad.
de auto|araba|Wij hebben geen auto.
het rijbewijs|ehliyet|Ik haal dit jaar mijn rijbewijs.
parkeren|park etmek|Hier mag je niet parkeren.
de weg|yol|De weg is afgesloten.
het verkeer|trafik|Er is veel verkeer in de ochtend.
de file|trafik sıkışıklığı|Ik sta in de file.
het stoplicht|trafik ışığı|Stop bij het rode stoplicht.
de kruising|kavşak|Ga bij de kruising naar links.
links|sol, sola|Ga hier naar links.
rechts|sağ, sağa|Neem de tweede straat rechts.
rechtdoor|dümdüz|Ga rechtdoor tot het station.
het vliegtuig|uçak|Wij gaan met het vliegtuig naar Turkije.
` },

  { id: 'tijd', icon: '⏰', title: 'Zaman ve tarih', words: `
de tijd|zaman|Heb je even tijd?
de dag|gün|Ik werk vijf dagen per week.
de week|hafta|Volgende week heb ik vakantie.
de maand|ay|Ik woon hier al drie maanden.
het jaar|yıl|Ik woon al vijf jaar in Nederland.
het uur|saat|De les duurt een uur.
de minuut|dakika|De bus komt over twee minuten.
het kwartier|çeyrek saat|Ik wacht al een kwartier.
half|yarım, buçuk|Het is half drie.
kwart|çeyrek|Het is kwart over vier.
maandag|pazartesi|Op maandag werk ik niet.
dinsdag|salı|Dinsdag ga ik naar de markt.
woensdag|çarşamba|Op woensdag zijn de kinderen 's middags vrij.
donderdag|perşembe|Donderdag heb ik Nederlandse les.
vrijdag|cuma|Vrijdag gaan we naar de moskee.
zaterdag|cumartesi|Zaterdag doe ik boodschappen.
zondag|pazar|Op zondag slaap ik lang.
januari|ocak|In januari is het koud.
juli|temmuz|In juli hebben de kinderen vakantie.
december|aralık|Pakjesavond is op 5 december.
vandaag|bugün|Vandaag is het mooi weer.
morgen|yarın|Morgen ga ik naar de huisarts.
gisteren|dün|Gisteren was ik ziek.
de ochtend|sabah|In de ochtend drink ik koffie.
de middag|öğleden sonra|In de middag haal ik de kinderen op.
de avond|akşam|In de avond ben ik moe.
de nacht|gece|Ik slaap acht uur per nacht.
het weekend|hafta sonu|In het weekend werk ik niet.
vroeg|erken|Ik sta vroeg op.
laat|geç|Sorry, ik ben te laat.
straks|birazdan|Ik bel je straks.
nu|şimdi|Ik heb nu geen tijd.
de datum|tarih|Wat is de datum van vandaag?
de agenda|ajanda|Ik zet de afspraak in mijn agenda.
` },

  { id: 'weer', icon: '🌦️', title: 'Hava', words: `
het weer|hava|Het weer is vandaag slecht.
de zon|güneş|De zon schijnt.
de regen|yağmur|Vandaag komt er veel regen.
regenen|yağmur yağmak|Het regent al de hele dag.
de wind|rüzgâr|Er staat veel wind.
de sneeuw|kar|De kinderen spelen in de sneeuw.
sneeuwen|kar yağmak|Het sneeuwt bijna nooit.
de wolk|bulut|Er zijn veel wolken vandaag.
het onweer|gök gürültülü fırtına|Vannacht was er onweer.
de storm|fırtına|Door de storm rijden er geen treinen.
warm|sıcak|Het is warm vandaag.
koud|soğuk|Het water is koud.
de temperatuur|sıcaklık|De temperatuur is vandaag laag.
de graad|derece|Het is vijf graden.
de paraplu|şemsiye|Neem een paraplu mee.
de lente|ilkbahar|In de lente bloeien de bloemen.
de zomer|yaz|In de zomer gaan we naar Turkije.
de herfst|sonbahar|In de herfst valt er veel regen.
de winter|kış|De winter is hier nat.
` },

  { id: 'gemeente', icon: '🏛️', title: 'Belediye ve resmi kurumlar', words: `
de gemeente|belediye|De gemeente haalt het afval op.
het gemeentehuis|belediye binası|Het gemeentehuis is in het centrum.
het stadhuis|belediye sarayı|We trouwen in het stadhuis.
inschrijven|kaydolmak, kayıt yaptırmak|Na de verhuizing schrijf ik me in bij de gemeente.
de Belastingdienst|vergi dairesi|De Belastingdienst stuurt mij een brief.
de belasting|vergi|Iedereen betaalt belasting.
de toeslag|devlet ödeneği|Wij krijgen een toeslag voor de zorgverzekering.
de huurtoeslag|kira yardımı|Je kunt huurtoeslag aanvragen.
het formulier|form|Het formulier is in het Nederlands.
invullen|doldurmak|Ik vul het formulier in.
aanvragen|başvurmak, talep etmek|Ik vraag een nieuw paspoort aan.
de aanvraag|başvuru|De aanvraag duurt acht weken.
de brief|mektup|Ik krijg een brief van de gemeente.
de envelop|zarf|Doe de brief in de envelop.
het BSN|vatandaşlık hizmet numarası|Wat is uw BSN?
de DigiD|dijital kimlik|Log in met uw DigiD.
de verblijfsvergunning|oturma izni|Mijn verblijfsvergunning is vijf jaar geldig.
de IND|göç ve vatandaşlık dairesi|De IND beslist over mijn aanvraag.
DUO|sınavları yürüten devlet kurumu|Je meldt je aan voor het examen bij DUO.
de inburgering|uyum süreci|De inburgering duurt meestal drie jaar.
het examen|sınav|Ik doe volgend jaar examen.
de naturalisatie|vatandaşlığa geçiş|Ik vraag naturalisatie aan bij de gemeente.
het paspoort|pasaport|Mijn paspoort is verlopen.
de identiteitskaart|kimlik kartı|U kunt ook uw identiteitskaart laten zien.
het legitimatiebewijs|kimlik belgesi|Neem een geldig legitimatiebewijs mee.
geldig|geçerli|Is uw paspoort nog geldig?
het loket|gişe|U wordt geholpen bij loket 4.
het nummer|numara, sıra numarası|Pak een nummer en wacht even.
het uittreksel|nüfus kayıt örneği|Ik vraag een uittreksel aan bij de gemeente.
de politie|polis|Bel de politie bij gevaar.
` },

  { id: 'school', icon: '🎒', title: 'Okul ve çocuk', words: `
de school|okul|De school begint om half negen.
de basisschool|ilkokul|Mijn dochter zit op de basisschool.
de middelbare school|ortaokul ve lise|Mijn zoon gaat naar de middelbare school.
de leerkracht|öğretmen|De leerkracht geeft veel huiswerk.
de juf|kadın öğretmen|De juf is vandaag ziek.
de meester|erkek öğretmen|Meester Peter is heel aardig.
de leerling|öğrenci|De klas heeft 25 leerlingen.
de klas|sınıf|Mijn zoon zit in een grote klas.
de groep|sınıf, grup|Mijn dochter zit in groep 5.
de les|ders|De les begint om negen uur.
het huiswerk|ev ödevi|Heb je je huiswerk al gemaakt?
het rapport|karne|Mijn zoon krijgt vandaag zijn rapport.
het oudergesprek|veli görüşmesi|Het oudergesprek is dinsdagavond.
de ouderavond|veli toplantısı|Er is een ouderavond op school.
het schoolplein|okul bahçesi|De kinderen spelen op het schoolplein.
de gymles|beden eğitimi dersi|Op donderdag heeft hij gymles.
het schoolreisje|okul gezisi|Morgen gaat de klas op schoolreisje.
de schoolvakantie|okul tatili|In de schoolvakantie gaan we naar Turkije.
de luizencontrole|bit kontrolü|Na de vakantie is er luizencontrole.
de kinderopvang|çocuk bakım yeri|De baby gaat twee dagen per week naar de kinderopvang.
het kinderdagverblijf|kreş|Ons kind gaat naar het kinderdagverblijf.
de buitenschoolse opvang|okul sonrası bakım|Na school gaat hij naar de buitenschoolse opvang.
leren|öğrenmek|Ik leer Nederlands.
ophalen|gidip almak|Ik haal de kinderen om drie uur op.
` },

  { id: 'vrijetijd', icon: '⚽', title: 'Boş zaman', words: `
de vrije tijd|boş zaman|In mijn vrije tijd lees ik graag.
de hobby|hobi|Mijn hobby is koken.
sporten|spor yapmak|Ik sport twee keer per week.
de sportschool|spor salonu|Ik ga naar de sportschool.
voetballen|futbol oynamak|Mijn zoon voetbalt op zaterdag.
de vereniging|dernek, kulüp|Mijn zoon zit bij een voetbalvereniging.
zwemmen|yüzmek|De kinderen leren zwemmen.
het zwembad|yüzme havuzu|Het zwembad is op zaterdag open.
wandelen|yürüyüş yapmak|Op zondag wandelen we in het park.
het park|park|Het park is mooi in de lente.
de film|film|We kijken vanavond een film.
de bioscoop|sinema|We gaan naar de bioscoop.
het boek|kitap|Ik lees een Nederlands boek.
de bibliotheek|kütüphane|Ik leen boeken in de bibliotheek.
lenen|ödünç almak|Mag ik je pen lenen?
de muziek|müzik|Ik luister graag naar muziek.
het feest|parti, kutlama|Zaterdag is er een feest bij de buren.
gezellig|keyifli, samimi|Het feest was erg gezellig.
de vakantie|tatil|In de zomer gaan we op vakantie.
het museum|müze|Het museum is op maandag dicht.
de televisie|televizyon|Wij kijken samen televisie.
uitgaan|eğlenmeye çıkmak|Op zaterdag gaan we uit.
de vrijwilliger|gönüllü|Ik werk als vrijwilliger in de bibliotheek.
` },

  { id: 'werkwoorden', icon: '🔁', title: 'Temel fiiller', words: `
zijn|olmak|Wij zijn thuis.
hebben|sahip olmak|Ik heb twee kinderen.
gaan|gitmek|Ik ga naar de supermarkt.
komen|gelmek|Ik kom uit Turkije.
doen|yapmak|Wat doe je vanavond?
maken|yapmak, hazırlamak|Ik maak een afspraak bij de huisarts.
kunnen|yapabilmek|Kunt u dat herhalen?
willen|istemek|Ik wil een kopje thee.
moeten|zorunda olmak|Ik moet morgen werken.
mogen|izinli olmak|Mag ik iets vragen?
eten|yemek yemek|Wij eten om zes uur.
drinken|içmek|Ik drink veel water.
slapen|uyumak|De baby slaapt al.
werken|çalışmak|Ik werk in een ziekenhuis.
spreken|konuşmak|Spreekt u Engels?
praten|konuşmak, sohbet etmek|Ik praat met mijn buurvrouw.
zeggen|söylemek|Wat zeg je?
vragen|sormak|Ik vraag de weg naar het station.
antwoorden|cevap vermek|Hij antwoordt niet.
begrijpen|anlamak|Ik begrijp het niet.
verstaan|duyup anlamak|Ik versta u niet goed.
weten|bilmek|Ik weet het niet.
kennen|tanımak, bilmek|Ken jij mijn buurman?
denken|düşünmek|Ik denk dat het gaat regenen.
vinden|bulmak, düşünmek|Ik vind Nederlands moeilijk.
zien|görmek|Ik zie de bus.
kijken|bakmak, izlemek|Wij kijken naar het nieuws.
horen|duymak|Ik hoor de bel.
luisteren|dinlemek|Luister goed naar de leerkracht.
lezen|okumak|Ik lees de krant.
schrijven|yazmak|Ik schrijf een e-mail.
geven|vermek|Ik geef mijn moeder bloemen.
krijgen|almak, elde etmek|Ik krijg een pakketje.
nemen|almak|Ik neem de trein.
kopen|satın almak|Ik koop een nieuwe telefoon.
verkopen|satmak|Wij verkopen onze oude auto.
brengen|getirmek, götürmek|Ik breng de kinderen naar school.
zoeken|aramak|Ik zoek mijn sleutel.
wachten|beklemek|Ik wacht op de bus.
helpen|yardım etmek|Kunt u mij helpen?
beginnen|başlamak|De cursus begint in september.
stoppen|durmak, bırakmak|De bus stopt hier.
blijven|kalmak|Ik blijf vandaag thuis.
worden|olmak, haline gelmek|Mijn zoon wordt morgen tien.
staan|durmak, ayakta durmak|De fiets staat buiten.
zitten|oturmak|Ik zit in de trein.
liggen|yatmak, durmak|Het boek ligt op tafel.
lopen|yürümek|Ik loop naar de winkel.
rijden|araç sürmek|Ik rijd in een kleine auto.
bellen|aramak, telefon etmek|Ik bel je morgen.
opbellen|telefonla aramak|Ik bel de tandarts op.
opstaan|kalkmak|Ik sta om zeven uur op.
meenemen|yanına almak|Neem je paspoort mee.
afspreken|sözleşmek, buluşma ayarlamak|Wij spreken af om drie uur.
uitnodigen|davet etmek|Ik nodig mijn buren uit.
sturen|göndermek|Ik stuur je een bericht.
vergeten|unutmak|Ik ben mijn tas vergeten.
gebruiken|kullanmak|Mag ik uw telefoon gebruiken?
` },

  { id: 'bijvoeglijk', icon: '🎨', title: 'Sıfatlar', words: `
groot|büyük|Ons huis is niet groot.
klein|küçük|Mijn appartement is klein.
nieuw|yeni|Ik heb een nieuwe fiets.
oud|eski, yaşlı|Mijn opa is oud.
jong|genç|Zij is nog jong.
mooi|güzel|Wat een mooie tuin!
goed|iyi|Het gaat goed met mij.
slecht|kötü|Ik slaap slecht.
makkelijk|kolay|Deze oefening is makkelijk.
moeilijk|zor|Nederlands is soms moeilijk.
snel|hızlı|De trein is snel.
langzaam|yavaş|Kunt u wat langzamer praten?
druk|kalabalık, yoğun|Het is druk in de winkel.
rustig|sakin|Purmerend is een rustige stad.
blij|mutlu, memnun|Ik ben blij met mijn nieuwe baan.
moe|yorgun|Na het werk ben ik moe.
boos|kızgın|Mijn vader is boos.
aardig|nazik, sevimli|Mijn collega's zijn aardig.
vriendelijk|kibar, güler yüzlü|De buschauffeur is vriendelijk.
lang|uzun|De rij bij de kassa is lang.
kort|kısa|De pauze is kort.
schoon|temiz|De keuken is schoon.
vies|kirli|Je handen zijn vies.
leeg|boş|De koelkast is leeg.
vol|dolu|Mijn tas is vol.
belangrijk|önemli|Dit is een belangrijke brief.
leuk|hoş, eğlenceli|Ik vind mijn werk leuk.
kapot|bozuk|Mijn telefoon is kapot.
zwaar|ağır|De tas is zwaar.
` },

  { id: 'klein', icon: '🧩', title: 'Soru ve küçük kelimeler', words: `
wie|kim|Wie is dat?
wat|ne|Wat doe jij in het weekend?
waar|nerede|Waar woon je?
wanneer|ne zaman|Wanneer begint de les?
waarom|neden|Waarom ben je te laat?
hoe|nasıl|Hoe gaat het met je?
hoeveel|kaç, ne kadar|Hoeveel kost een kaartje?
welke|hangi|Welke bus gaat naar het station?
omdat|çünkü|Ik blijf thuis omdat ik ziek ben.
want|çünkü|Ik blijf thuis, want ik ben ziek.
maar|ama|Ik wil komen, maar ik heb geen tijd.
dus|yani, bu yüzden|Het regent, dus ik neem de bus.
en|ve|Ik heb een zoon en een dochter.
of|veya, mı mi|Wil je thee of koffie?
als|eğer, -dığında|Als het mooi weer is, gaan we naar het park.
dat|ki, şu|Ik denk dat hij ziek is.
ook|de, da, ayrıca|Ik spreek ook Engels.
nog|hâlâ, daha|Ik woon nog in Purmerend.
al|zaten, çoktan|Ik heb al gegeten.
niet|değil, -me|Ik werk vandaag niet.
geen|hiç, yok|Ik heb geen kinderen.
misschien|belki|Misschien kom ik morgen.
altijd|her zaman|Ik drink altijd koffie in de ochtend.
nooit|asla, hiç|Ik rook nooit.
vaak|sık sık|Wij eten vaak rijst.
soms|bazen|Soms werk ik op zaterdag.
graag|seve seve, memnuniyetle|Ik wil graag een kopje koffie.
hier|burada|Woont u hier?
daar|orada|Daar is het station.
veel|çok|Ik heb veel werk.
weinig|az|Ik heb weinig tijd.
` }
];

if (typeof module !== 'undefined') module.exports = { VOCAB_THEMES };
