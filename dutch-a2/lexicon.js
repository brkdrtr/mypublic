'use strict';
/* Tamamlayici sozluk. Her satir form|ceviri */
const LEXICON = `
aan|-e, yanında; ayrılan fiil eki
aanbiedingen|indirimler · de aanbieding
aangevraagd|başvuruldu · aanvragen
aangifte|polis şikayeti, beyan · de aangifte
aanhef|mektupta hitap · de aanhef
aanmelden|kaydolmak
aannemen|kabul etmek, işe almak
aanpassen|uyarlamak, ayarlamak
aansprakelijkheidsverzekering|sorumluluk sigortası · de aansprakelijkheidsverzekering
aanstaande|gelecek, önümüzdeki
aanzetten|açmak, çalıştırmak
aardappels|patatesler · de aardappel
ab|isim parçası
acht|sekiz
achter|arkasında
activiteit|etkinlik · de activiteit
ademt|nefes alır · ademen
advertentie|ilan, reklam · de advertentie
advies|tavsiye · het advies
af|-den, ayrılan fiil eki
afbelt|arayıp iptal eder · afbellen
afdeling|bölüm, departman · de afdeling
afgelopen|geçen, sona ermiş · aflopen
afgesloten|kapatıldı, kilitli · afsluiten
afgespreekt|yanlış form, doğrusu afgesproken
afmelden|kaydını sildirmek, gelemeyeceğini bildirmek
afsluiting|kapanış, kapatma · de afsluiting
afstand|mesafe · de afstand
afvalkalender|çöp toplama takvimi · de afvalkalender
ahin|isim parçası
ahmed|kişi adı
ahmet|kişi adı
ali|kişi adı
alle|tüm, bütün · al
allebei|ikisi de
alleen|yalnız, sadece
allemaal|hepsi
allergie|alerji · de allergie
alles|her şey
alsjeblieft|lütfen, buyrun
alstublieft|lütfen, buyurun, kibar
alvast|şimdiden
amal|kişi adı
amrani|soyadı
amsterdam|şehir adı, başkent
an|isim parçası
ander|diğer, başka
andere|diğer, başka · ander
anders|başka türlü, yoksa
ankara|şehir adı
anna|kişi adı
anne|kişi adı
anouk|kişi adı
antwoord|cevap · het antwoord
antwoordt|cevap verir · antwoorden
aow|AOW, devlet emekli maaşı
aow-leeftijd|emeklilik yaşı · de AOW-leeftijd
app|uygulama, mesaj · de app
appels|elmalar · de appel
april|nisan
arbeidsinspectie|iş denetim kurumu
arslan|soyadı
artikel|makale, madde · het artikel
assistente|asistan, kadın · de assistente
attentie|dikkat · de attentie
automaat|otomat · de automaat
automatische|otomatik · automatisch
autos|yanlış yazım, doğrusu auto's
autoën|yanlış form, doğrusu auto's
avonden|akşamlar · de avond
avonds|akşamları · 's avonds
ay|isim parçası
ayd|isim parçası
aylin|kişi adı
azië|Asya, kıta adı
badmintonclub|badminton kulübü · de badmintonclub
badmintonnen|badminton oynamak
bakkerij|fırın, ekmekçi · de bakkerij
bal|top · de bal
balie|gişe, danışma · de balie
banen|işler · de baan
banenzwemmen|kulvarda yüzmek · het banenzwemmen
bank|banka, kanepe · de bank
bank-app|banka uygulaması · de bank-app
bankpas|banka kartı · de bankpas
barbecue|mangal · de barbecue
barbecueën|mangal yapmak
basispakket|temel paket · het basispakket
basisverzekering|temel sağlık sigortası · de basisverzekering
bedankt|teşekkürler
bedden|yataklar · het bed
beden|yanlış çoğul, doğrusu bedden
bedoeld|kastedilen · bedoelen
bedrag|tutar, miktar · het bedrag
bedrijven|şirketler · het bedrijf
beds|yanlış çoğul, doğrusu bedden
beetje|biraz · een beetje
begrijp|anlıyorum · begrijpen
begrip|anlayış · het begrip
begroet|selamlar · begroeten
behandeld|tedavi edildi · behandelen
behandeling|tedavi · de behandeling
bekijken|bakmak, incelemek
belangrijke|önemli · belangrijk
belastingaangifte|vergi beyannamesi · de belastingaangifte
bell|yanlış form, doğrusu bel · bellen
belte|aradı · bellen
bemoeit|karışır · zich bemoeien
beneden|aşağıda
benzine|benzin · de benzine
bepaalt|belirler · bepalen
bereikt|ulaşır, ulaştı · bereiken
bergen|dağlar · de berg
bericht|mesaj · het bericht
beroemd|ünlü
beschermen|korumak
beschrijf|tarif et, anlat · beschrijven
beslist|karar verir · beslissen
best|en iyi, oldukça
bestaat|var olur · bestaan
beste|en iyi, sevgili · goed
bestel|sipariş ederim · bestellen
bestelt|sipariş eder · bestellen
bestuurt|yönetir, sürer · besturen
betaal|öderim · betalen
betaald|ödendi · betalen
betaalt|öder · betalen
betekent|anlamına gelir · betekenen
beter|daha iyi · goed
betrouwbaar|güvenilir
beuk|kayın ağacı · de beuk
bevestiging|onay · de bevestiging
bevrijding|kurtuluş · de bevrijding
bevrijdingsdag|Kurtuluş Günü, 5 Mayıs · de bevrijdingsdag
bewaar|sakla · bewaren
beweegt|hareket eder · bewegen
bewegen|hareket etmek
bezet|meşgul, dolu
bezoek|ziyaret · het bezoek
bezoeken|ziyaret etmek
bezorgen|teslim etmek
bezorgt|teslim eder · bezorgen
bezwaar|itiraz · het bezwaar
bibliotheekpas|kütüphane kartı · de bibliotheekpas
bieden|sunmak
biedt|sunar · bieden
bij|yanında, -de; ayrılan fiil eki
bijna|neredeyse
bijstand|sosyal yardım · de bijstand
bijvoorbeeld|örneğin
binnen|içeride
blauw|mavi
blauwe|mavi · blauw
bloeddruk|tansiyon · de bloeddruk
bloeien|çiçek açmak
bloemen|çiçekler · de bloem
bloemstraat|sokak adı
boeken|kitaplar · het boek
boekken|yanlış çoğul, doğrusu boeken
boeks|yanlış çoğul, doğrusu boeken
boer|çiftçi · de boer
boete|para cezası · de boete
bomen|ağaçlar · de boom
boomen|yanlış çoğul, doğrusu bomen
booms|yanlış çoğul, doğrusu bomen
borden|tabaklar, tabelalar · het bord
bouwen|inşa etmek
boven|yukarıda
bovenaan|en üstte
bram|kişi adı
briefen|yanlış çoğul, doğrusu brieven
briefje|not, küçük mektup · het briefje
briefs|yanlış çoğul, doğrusu brieven
brieven|mektuplar · de brief
brievenbus|posta kutusu · de brievenbus
broers|erkek kardeşler · de broer
brutoloon|brüt maaş · het brutoloon
buiten|dışarıda
buitenland|yurt dışı · het buitenland
buitenschoolse|okul dışı · buitenschools
burak|kişi adı
burgemeester|belediye başkanı · de burgemeester
burgerzaken|nüfus işleri birimi
buschauffeur|otobüs şoförü · de buschauffeur
busen|yanlış çoğul, doğrusu bussen
buses|yanlış çoğul, doğrusu bussen
bushaltes|otobüs durakları · de bushalte
bussen|otobüsler · de bus
buurtbarbecue|mahalle mangalı · de buurtbarbecue
buurthuis|mahalle evi · het buurthuis
buurtvereniging|mahalle derneği · de buurtvereniging
buurvrouw|kadın komşu · de buurvrouw
cadeau|hediye · het cadeau
cadeautjes|küçük hediyeler · het cadeautje
can|kişi adı
centraal|merkezi, Centraal Station
centrum|merkez · het centrum
chauffeur|şoför · de chauffeur
checken|kontrol etmek
conflict|çatışma, anlaşmazlık · het conflict
consult|muayene, danışma · het consult
consultatiebureau|bebek sağlık merkezi · het consultatiebureau
controle|kontrol · de controle
controleren|kontrol etmek
cursus|kurs · de cursus
cv-ketel|kombi · de cv-ketel
daarna|ondan sonra
daarom|bu yüzden
daarop|onun üzerine
daarvoor|onun için, ondan önce
dagboek|günlük · het dagboek
dagen|günler · de dag
dak|çatı · het dak
dam|baraj, Dam meydanı · de dam
dames|bayanlar · de dame
damesfiets|kadın bisikleti · de damesfiets
dan|o zaman, -den
dank|teşekkür · de dank
dansen|dans etmek
de|belirli tanım edatı
deel|parça, bölüm · het deel
deltawerken|Delta Projesi, sel setleri
demir|soyadı
den|Den Haag parçası, Lahey
dennis|kişi adı
dertig|otuz
derya|kişi adı
deshuttle|servis aracı · de shuttle
deze|bu, bunlar
dezelfde|aynı
dichtbij|yakında
die|o, şu, ki
dient|gerekir, hizmet eder · dienen
diep|derin
dik|kalın, şişman
dikke|kalın, şişman · dik
dingen|şeyler · het ding
dinsdagavond|salı akşamı · de dinsdagavond
direct|hemen, doğrudan
directeur|müdür · de directeur
dirk|kişi adı, Dirk süpermarketi
discriminatie|ayrımcılık · de discriminatie
dit|bu
do|isim parçası
doede|yanlış form, doğrusu deed · doen
doei|hoşça kal
donderdagavond|perşembe akşamı · de donderdagavond
donker|karanlık, koyu
door|içinden, tarafından
doorgeeft|iletir · doorgeven
doorgeven|iletmek, bildirmek
doorsturen|iletmek, yönlendirmek
dorp|köy · het dorp
douchen|duş almak
draagt|taşır, giyer · dragen
dragen|taşımak, giymek
drankje|içecek · het drankje
dreef|cadde adı, geniş yol · de dreef
drie|üç
dringend|acil
droog|kuru
duits|Almanca, Alman
duitsland|Almanya, ülke adı
dure|pahalı · duur
duurder|daha pahalı · duur
duure|yanlış form, doğrusu dure
duurer|yanlış form, doğrusu duurder
duurst|en pahalı · duur
duurt|sürer · duren
e|harf, isim parçası
e-mail|e-posta · de e-mail
een|bir
eens|bir kez, hiç
eerder|daha önce
eerlijk|dürüst
eerst|önce
eerste|ilk, birinci
eette|yanlış form, doğrusu at · eten
eeuw|yüzyıl · de eeuw
eien|yanlış çoğul, doğrusu eieren
eieren|yumurtalar · het ei
eigen|kendi
eind|son · het eind
einde|son · het einde
eindtijd|bitiş saati · de eindtijd
eis|şart, talep · de eis
el|isim parçası
elif|kişi adı
elk|her
elkaar|birbirini
elke|her · elk
ellen|kişi adı
emir|kişi adı
emre|kişi adı
energie|enerji · de energie
energiebedrijf|enerji şirketi · het energiebedrijf
engels|İngilizce
er|orada, er is var
erg|çok, kötü
erik|kişi adı
ermee|onunla
eruit|oradan dışarı
ervoor|onun için
esra|kişi adı
esther|kişi adı
euro|avro · de euro
even|bir an, biraz
eventueel|gerekirse, belki
excuses|özür · het excuus
extra|ekstra
eén|yanlış yazım, doğrusu één
fabriek|fabrika · de fabriek
fatih|kişi adı
fatima|kişi adı
fatma|kişi adı
februari|şubat
feestje|parti · het feestje
feliciteert|tebrik eder · feliciteren
fietsde|yanlış form, doğrusu fietste
fietses|yanlış çoğul, doğrusu fietsen
fietst|bisiklete biner · fietsen
fietste|bisiklete bindi · fietsen
fijn|güzel, hoş
fijne|güzel, hoş · fijn
flessen|şişeler · de fles
flevoland|eyalet adı
frank|kişi adı
gang|koridor · de gang
gas|gaz · het gas
gast|misafir · de gast
geachte|sayın
geafsproken|yanlış form, doğrusu afgesproken
gebetaald|yanlış form, doğrusu betaald
gebeurd|oldu · gebeuren
gebeurt|olur · gebeuren
gebouwd|inşa edildi · bouwen
gebroken|kırık · breken
gebruik|kullanım · het gebruik
gebruikelijk|olağan, alışılmış
gebruikt|kullanır, kullanıldı · gebruiken
geel|sarı
gefeliciteerd|tebrikler · feliciteren
gefietsd|yanlış form, doğrusu gefietst
gefietst|bisiklete bindi · fietsen
gegevens|bilgiler · de gegevens
gehaald|alındı, getirildi · halen
geholpen|yardım edildi · helpen
gekregen|aldı · krijgen
gelijk|eşit, haklı
gelijke|eşit · gelijk
geloof|inanç · het geloof
gelukkiger|daha mutlu · gelukkig
gemeenten|belediyeler · de gemeente
gemeenteraad|belediye meclisi · de gemeenteraad
genoeg|yeterli
geografie|coğrafya · de geografie
geopbeld|yanlış form, doğrusu opgebeld
geopstaan|yanlış form, doğrusu opgestaan
gepraat|konuştu · praten
gepraatd|yanlış form, doğrusu gepraat
gepraatt|yanlış form, doğrusu gepraat
gereserveerd|rezerve edildi · reserveren
geschiedenis|tarih · de geschiedenis
geschrijfd|yanlış form, doğrusu geschreven
geschrijft|yanlış form, doğrusu geschreven
gesloten|kapalı · sluiten
gesneden|kesildi · snijden
gesprek|konuşma, görüşme · het gesprek
gestolen|çalındı · stelen
gestorven|öldü · sterven
gestuurd|gönderildi · sturen
geuitnodigd|yanlış form, doğrusu uitgenodigd
gevaar|tehlike · het gevaar
gevaarlijk|tehlikeli
gevergeten|yanlış form, doğrusu vergeten
geweld|şiddet · het geweld
gewerkd|yanlış form, doğrusu gewerkt
gewoon|sıradan, sadece
gewoont|yanlış form, doğrusu gewoond
gezag|otorite · het gezag
gezegd|söylendi · zeggen
gezet|kondu · zetten
gezient|yanlış form, doğrusu gezien
geëet|yanlış form, doğrusu gegeten
geët|yanlış form, doğrusu gegeten
geïnvuld|yanlış form, doğrusu ingevuld
ggd|GGD, belediye sağlık hizmeti
gingen|gittiler · gaan
gisteravond|dün akşam
glasbak|cam kumbarası · de glasbak
glazen|bardaklar · het glas
goede|iyi · goed
goedemiddag|iyi günler, öğleden sonra
goedemorgen|günaydın
goeder|yanlış form, doğrusu beter
goedkoopste|en ucuz · goedkoop
goedkopere|daha ucuz · goedkoop
gooit|atar · gooien
gors|isim parçası, yer adı
gorslaan|sokak adı
gouden|altın, altından
graager|yanlış form, doğrusu liever
graden|derece · de graad
gram|gram · het gram
grasveld|çimenlik · het grasveld
gratis|bedava
grijze|gri · grijs
groei|büyüme · de groei
groen|yeşil
groene|yeşil · groen
groet|selam · de groet
groeten|selamlar · de groet
groetjes|sevgiler, selamlar
grof|kaba, iri
grond|toprak, zemin · de grond
grondwet|anayasa · de grondwet
grootter|yanlış form, doğrusu groter
grote|büyük · groot
groter|daha büyük · groot
grotere|daha büyük · groot
haag|Den Haag, Lahey şehri
hadden|vardı, sahiptiler · hebben
hakan|kişi adı
halal|helal
hallo|merhaba
haltes|duraklar · de halte
handel|ticaret · de handel
handelsbedrijf|ticaret şirketi · het handelsbedrijf
handelsland|ticaret ülkesi · het handelsland
handen|eller · de hand
handig|pratik, kullanışlı
hangt|asılı, asar · hangen
hard|sert, hızlı
harde|sert, hızlı · hard
hasan|kişi adı
hbo|HBO, yüksek mesleki eğitim
heel|çok, bütün
heer|bey, beyefendi · de heer
heet|adı, sıcak · heten
heftruckcertificaat|forklift sertifikası · het heftruckcertificaat
helaas|maalesef
hele|bütün · heel
helemaal|tamamen
helpt|yardım eder · helpen
hem|onu, ona erkek
hen|onları, onlara
henk|kişi adı
herdenken|anmak
heren|beyler · de heer
herhaalrecepten|tekrar reçeteleri · het herhaalrecept
herhalen|tekrarlamak
herinnering|hatıra, hatırlatma · de herinnering
het|bu, o, het artikeli
hetzelfde|aynı şey
hiervoor|bunun için
hij|o erkek
hoeft|gerekmez · hoeven
hoek|köşe · de hoek
hoest|öksürük · de hoest
hoge|yüksek · hoog
hoger|daha yüksek · hoog
hoi|selam
homohuwelijk|eşcinsel evlilik · het homohuwelijk
hoofddoek|başörtüsü · de hoofddoek
hoofdstad|başkent · de hoofdstad
hoog|yüksek
hoogte|yükseklik · de hoogte
hoop|umut, umarım · de hoop
hoor|duyarım, ya işte · horen
hoorde|duydu · horen
hoorn|telefon ahizesi · de hoorn
hoort|duyar, ait olur · horen
houden|tutmak, sevmek
huilt|ağlar · huilen
huisartsenpraktijk|aile hekimi muayenehanesi · de huisartsenpraktijk
huisen|yanlış form, doğrusu huizen
huises|yanlış form, doğrusu huizen
huizen|evler · het huis
hulp|yardım · de hulp
hun|onların
huurcommissie|kira komisyonu, kira anlaşmazlık kurulu
huurcontract|kira sözleşmesi · het huurcontract
huurt|kiralar · huren
huurverhoging|kira artışı · de huurverhoging
huurwoning|kiralık ev · de huurwoning
ibrahim|kişi adı
identiteitsbewijs|kimlik belgesi · het identiteitsbewijs
iedereen|herkes
iemand|biri
iets|bir şey
ik|ben
ilse|kişi adı
in|içinde
inburgeringsexamen|uyum sınavı · het inburgeringsexamen
incasso|otomatik ödeme talimatı · de incasso
info|bilgi · de info
informatie|bilgi · de informatie
ingeschreven|kaydoldu · inschrijven
ingrid|kişi adı
inhalen|telafi etmek, sollamak
inhoudingen|kesintiler · de inhouding
inkomen|gelir · het inkomen
inkomstenbelasting|gelir vergisi · de inkomstenbelasting
instantie|kurum · de instantie
instanties|kurumlar · de instantie
interesse|ilgi · de interesse
internet|internet · het internet
invulgd|yanlış form, doğrusu ingevuld
istanbul|şehir adı
ja|evet
jaarafrekening|yıllık hesap kesimi · de jaarafrekening
jammer|ne yazık
jan|kişi adı
jarig|doğum günü olan
jasmijn|kişi adı
je|sen, senin
jesse|kişi adı
jeugd|gençlik · de jeugd
jij|sen
jonge|genç · jong
jonger|daha genç · jong
jongste|en genç · jong
joods|Yahudi
joost|kişi adı
jou|seni, sana
jouw|senin
jullie|siz, sizin
juni|haziran
juridisch|hukuki
kameren|yanlış form, doğrusu kamers
kamers|odalar · de kamer
kantine|kantin · de kantine
kantoren|ofisler · het kantoor
kapotte|bozuk · kapot
karim|kişi adı
karton|karton · het karton
kassabon|kasa fişi · de kassabon
kat|kedi · de kat
kaya|kişi adı, soyadı
keer|kez, defa · de keer
kees|kişi adı
kemal|kişi adı
ken|tanırım, bilirim · kennen
kennis|bilgi, tanıdık · de kennis
keren|kezler · de keer
kerk|kilise · de kerk
kerkstraat|sokak adı
kerstmis|Noel · de Kerstmis
ketel|kombi, kazan · de ketel
kiest|seçer · kiezen
kiezen|seçmek
kijk|bakarım, bak · kijken
kijkt|bakar · kijken
kilo|kilo · de kilo
kim|kişi adı
kinden|yanlış form, doğrusu kinderen
kinderbijslag|çocuk parası · de kinderbijslag
kinderen|çocuklar · het kind
kinderopvangtoeslag|kreş yardımı · de kinderopvangtoeslag
kinds|çocukluktan, van kinds af aan
klaar|hazır, bitti
klacht|şikayet · de klacht
klachten|şikayetler · de klacht
klantenservice|müşteri hizmetleri · de klantenservice
klantnummer|müşteri numarası · het klantnummer
klap|tokat, darbe · de klap
kledingwinkel|giyim mağazası · de kledingwinkel
kleine|küçük · klein
klopt|doğru, kapıyı çalar · kloppen
kochten|satın aldılar · kopen
kok|aşçı · de kok
komde|yanlış form, doğrusu kwam
koning|kral · de koning
koningin|kraliçe · de koningin
koningsdag|Kral Günü, 27 Nisan
kook|pişiririm · koken
kookt|pişirir, kaynar · koken
koopten|yanlış form, doğrusu kochten
kopje|fincan · het kopje
korter|daha kısa · kort
kost|tutar, mal olur · kosten
koude|soğuk · koud
krant|gazete · de krant
krijg|alırım · krijgen
krijgt|alır · krijgen
kritiek|eleştiri · de kritiek
kun|yapabilirsin · kunnen
kwamen|geldiler · komen
kwijt|kayıp
l|litre kısaltması
laag|alçak, düşük
laatste|son · laat
lach|gülerim, gülüş · lachen
lamp|lamba · de lamp
lampen|lambalar · de lamp
lange|uzun · lang
langer|daha uzun · lang
langs|yanından, uğrayarak
langsgaan|uğramak
langskomen|uğramak, ziyarete gelmek
lantaarnpaal|sokak lambası · de lantaarnpaal
last|sıkıntı, rahatsızlık · de last
late|geç · laat
laten|bırakmak, yaptırmak
later|sonra, daha geç
lawaai|gürültü · het lawaai
ld|kısaltma parçası
leden|üyeler · het lid
leen|ödünç veririm · lenen
leerlingen|öğrenciler · de leerling
leez|yanlış form, doğrusu lees
leg|koyarım · leggen
legaal|yasal
lege|boş · leeg
leidinggevende|yönetici, amir · de leidinggevende
leila|kişi adı
lekkere|lezzetli · lekker
lekt|sızdırıyor · lekken
let|dikkat et · letten
leuke|hoş, güzel · leuk
leuks|hoş bir şey · leuk
leven|hayat, yaşamak · het leven
levensgevaar|hayati tehlike · het levensgevaar
levensgevaarlijk|hayati tehlikeli
leyla|kişi adı
licht|ışık, hafif · het licht
lid|üye · het lid
lief|tatlı, sevimli
liefe|yanlış form, doğrusu lieve
lieve|sevgili, tatlı · lief
liever|tercihen · graag
ligt|yatar, bulunur · liggen
lijst|liste · de lijst
lina|kişi adı
linda|kişi adı
linde|kişi adı
lisa|kişi adı
log|giriş yap · inloggen
loonstrook|maaş bordrosu · de loonstrook
lopend|yürüyen, yürüyerek · lopen
lotte|kişi adı
luister|dinlerim, dinle · luisteren
luistert|dinler · luisteren
lukt|başarılır · lukken
lunchpakket|öğle yemeği paketi · het lunchpakket
m|metre kısaltması
maandagavond|pazartesi akşamı · de maandagavond
maanden|aylar · de maand
maart|mart
magazijn|depo · het magazijn
magt|yanlış form, doğrusu mag
mail|e-posta · de mail
makkelijke|kolay · makkelijk
makkelijker|daha kolay · makkelijk
manier|yol, yöntem · de manier
mannen|erkekler · de man
marco|kişi adı
maria|kişi adı
mark|kişi adı
me|beni, bana
mededeling|duyuru · de mededeling
medewerker|çalışan, görevli · de medewerker
medicijnen|ilaçlar · het medicijn
mee|birlikte, ayrılan fiil eki
meedoen|katılmak
meegeven|yanında vermek
meeneem|yanıma alırım · meenemen
meer|daha fazla, göl · het meer
meest|en çok · veel
meestal|genellikle
meeste|çoğu · veel
mehmet|kişi adı
mei|mayıs
meisje|kız · het meisje
meisjen|yanlış form, doğrusu meisjes
meisjes|kızlar · het meisje
meld|bildiririm · melden
melden|bildirmek
melding|bildirim · de melding
meldt|bildirir · melden
meneer|bay, beyefendi · de meneer
meningsuiting|ifade özgürlüğü · de meningsuiting
mensen|insanlar · de mens
meryem|kişi adı
met|ile
meteen|hemen
meter|metre, sayaç · de meter
meterstanden|sayaç değerleri · de meterstand
mevrouw|hanımefendi · de mevrouw
middags|öğleden sonra · 's middags
middelbare|orta · middelbaar
middeleeuwen|Orta Çağ · de middeleeuwen
mij|beni, bana
mijn|benim
mila|kişi adı
milieustraat|atık toplama merkezi · de milieustraat
minder|daha az · weinig
minimaal|en az
minimumloon|asgari ücret · het minimumloon
minister|bakan · de minister
minister-president|başbakan · de minister-president
minst|en az · weinig
minuten|dakikalar · de minuut
minutengesprek|kısa veli görüşmesi · het minutengesprek
misselijk|midesi bulanık
moedertaal|ana dil · de moedertaal
moeilijker|daha zor · moeilijk
molen|değirmen · de molen
monteur|tamirci · de monteur
mooie|güzel · mooi
mooier|daha güzel · mooi
mooist|en güzel · mooi
morgenavond|yarın akşam
morgenmiddag|yarın öğleden sonra
morgenochtend|yarın sabah
moskee|cami · de moskee
murat|kişi adı
mustafa|kişi adı
n|harf n
na|sonra
naar|-e, -a doğru
naast|yanında
nachten|geceler · de nacht
nachts|geceleri · 's nachts
nadia|kişi adı
nat|ıslak
nationale|ulusal · nationaal
natuurlijk|tabii ki, doğal
nederland|Hollanda, ülke adı
nederlander|Hollandalı · de Nederlander
nederlanders|Hollandalılar · de Nederlander
nederlands|Hollandaca, Hollandalı
nederlandse|Hollandalı · Nederlands
nee|hayır
negen|dokuz
net|az önce, düzgün
netjes|düzgün, temiz
nettoloon|net maaş · het nettoloon
nichtje|kız yeğen · het nichtje
niemand|hiç kimse
niets|hiçbir şey
nieuwe|yeni · nieuw
nieuws|haberler · het nieuws
nl|Hollanda kısaltması
noah|kişi adı
noemen|adlandırmak
nogmaals|bir kez daha
noord|kuzey
noord-holland|Kuzey Hollanda eyaleti
noorden|kuzey · het noorden
normaal|normal
normale|normal · normaal
normen|normlar · de norm
november|kasım
o|harf o
ober|garson · de ober
oefenen|alıştırma yapmak
oefening|alıştırma · de oefening
oktober|ekim
olga|kişi adı
om|saat, etrafında, için
omar|kişi adı
ombudsman|kamu denetçisi · de ombudsman
omgangsvormen|görgü kuralları · de omgangsvormen
omleiding|yol değişikliği, sapma · de omleiding
omroepbericht|anons · het omroepbericht
onafhankelijk|bağımsız
onbeleefd|kaba, nezaketsiz
onder|altında
ondergedoken|saklandı · onderduiken
onderweg|yolda
onderwijs|eğitim · het onderwijs
onderzoek|araştırma, muayene · het onderzoek
oneerlijk|haksız, adaletsiz
ongemak|rahatsızlık · het ongemak
ongeveer|yaklaşık
online|çevrimiçi
ons|bizi, bizim
ontmoet|buluşur, tanışır · ontmoeten
ontslag|işten çıkarma, istifa · het ontslag
onveilig|güvensiz
onverwacht|beklenmedik
onweren|fırtınalar · het onweer
onze|bizim · ons
oorlog|savaş · de oorlog
oorlogen|savaşlar · de oorlog
op|üzerinde, ayrılan fiil eki
opbel|telefon ederim · opbellen
opbelt|telefon eder · opbellen
openbaar|kamuya açık
openingstijden|açılış saatleri · de openingstijd
opgestaat|yanlış form, doğrusu opgestaan
ophaal|alırım, toplarım · ophalen
ophaaldag|çöp toplama günü · de ophaaldag
opsta|kalkarım · opstaan
opvang|bakım, barınma · de opvang
opvoeding|çocuk yetiştirme · de opvoeding
opzeggen|iptal etmek, feshetmek
oranje|turuncu
organiseert|düzenler · organiseren
organiseren|düzenlemek
oudder|yanlış form, doğrusu ouder
oude|eski, yaşlı · oud
ouder|daha yaşlı, ebeveyn · oud
ouderbijdrage|veli katkı payı · de ouderbijdrage
over|hakkında, üzerinden
overal|her yerde
overdag|gündüz
overheid|devlet, hükümet · de overheid
overheidsinstantie|devlet kurumu · de overheidsinstantie
paar|birkaç, çift · het paar
pak|alırım, paket · pakken
pakjesavond|Sinterklaas hediye akşamı · de pakjesavond
pakken|almak, tutmak
pakketje|küçük paket · het pakketje
pan|tencere · de pan
papier|kağıt · het papier
paracetamol|ağrı kesici · de paracetamol
pardon|pardon, affedersiniz
parkeergeld|park ücreti · het parkeergeld
parlement|parlamento · het parlement
pas|ancak, kart · de pas
pasen|Paskalya
pasfoto|vesikalık fotoğraf · de pasfoto
past|uyar · passen
pedagogisch|pedagojik
pen|kalem · de pen
per|başına
periode|dönem · de periode
personeel|personel · het personeel
persoon|kişi · de persoon
persoonlijke|kişisel · persoonlijk
peter|kişi adı
petra|kişi adı
peuteropvang|anaokulu, kreş · de peuteropvang
pieter|kişi adı
pizza|pizza · de pizza
plannen|planlar, planlamak · het plan
plek|yer · de plek
plus|artı
post|posta · de post
potten|kavanozlar · de pot
praat|konuşur · praten
praktijk|muayenehane, pratik · de praktijk
prima|çok iyi, tamam
probleem|sorun · het probleem
procent|yüzde · het procent
proeftijd|deneme süresi · de proeftijd
provincie|eyalet · de provincie
provincies|eyaletler · de provincie
purmerend|şehir adı
rachid|kişi adı
racket|raket · het racket
radiatoren|kaloriferler · de radiator
radio|radyo · de radio
ramadan|ramazan · de ramadan
reactie|tepki, yanıt · de reactie
reageren|tepki vermek, yanıtlamak
receptenlijn|reçete telefon hattı · de receptenlijn
rechten|haklar · het recht
rechter|hakim · de rechter
rechters|hakimler · de rechter
rechtsstaat|hukuk devleti · de rechtsstaat
reden|neden · de reden
regel|kural, satır · de regel
regels|kurallar · de regel
regenboog|gökkuşağı · de regenboog
regent|yağmur yağıyor · regenen
regering|hükümet · de regering
reis|yolculuk · de reis
reiskosten|yol masrafları · de reiskosten
reisplanner|yolculuk planlayıcı · de reisplanner
reist|seyahat eder · reizen
reisverzekering|seyahat sigortası · de reisverzekering
reizen|seyahat etmek
reizigers|yolcular · de reiziger
rekenen|hesaplamak
remmen|fren yapmak
repareert|tamir eder · repareren
repareren|tamir etmek
restafval|diğer çöp · het restafval
rick|kişi adı
rij|sıra, kuyruk · de rij
rijk|zengin, devlet · het rijk
rijksmuseum|Rijksmuseum, Amsterdam ulusal müzesi
risico|risk · het risico
rivieren|nehirler · de rivier
rob|kişi adı
rode|kırmızı · rood
roept|seslenir, bağırır · roepen
roken|sigara içmek
rood|kırmızı
rook|duman · de rook
rotterdam|şehir adı
route|güzergah · de route
ruben|kişi adı
rust|dinlenme, sessizlik · de rust
rustige|sakin · rustig
rustiger|daha sakin · rustig
s|'s, 's avonds gibi ek
salade|salata · de salade
samen|birlikte
samenwerken|iş birliği yapmak
samira|kişi adı
sandra|kişi adı
sanne|kişi adı
sara|kişi adı
saskia|kişi adı
schade|hasar, zarar · de schade
schatting|tahmin · de schatting
scheiding|boşanma, ayrıştırma · de scheiding
scherp|keskin
schijnt|parlar, görünüşe göre · schijnen
schilder|ressam, boyacı · de schilder
schiphol|Schiphol, Amsterdam havalimanı
schoenen|ayakkabılar · de schoen
scholen|okullar · de school
schone|temiz · schoon
schoolvakanties|okul tatilleri · de schoolvakantie
schoonbedrijf|temizlik şirketi · het schoonbedrijf
schoonmaker|temizlikçi · de schoonmaker
schopt|tekmeler · schoppen
schriftelijk|yazılı
selin|kişi adı
september|eylül
sevda|kişi adı
sevgi|kişi adı
shuttle|servis aracı · de shuttle
sinds|-den beri
sinterklaas|Sinterklaas, 5 Aralık bayramı
sjouwen|taşımak
slaan|vurmak
slaat|vurur · slaan
slimme|akıllı · slim
sloterdijk|Amsterdam'da semt ve istasyon
smal|dar
smit|soyadı
sneeuwt|kar yağıyor · sneeuwen
sneler|yanlış form, doğrusu sneller
sneller|daha hızlı · snel
snoep|şeker, tatlı · het snoep
sociale|sosyal · sociaal
solliciteer|iş başvurusu yaparım · solliciteren
solliciteert|iş başvurusu yapar · solliciteren
soorten|türler · de soort
sorry|özür dilerim
spaarkaart|puan kartı · de spaarkaart
spaarzegel|biriktirme pulu · de spaarzegel
speelde|oynadı · spelen
speelden|oynadılar · spelen
speelt|oynar · spelen
speelten|yanlış form, doğrusu speelden
speeltuin|oyun parkı · de speeltuin
spelen|oynamak
spoedeisende|acil · spoedeisend, spoedeisende hulp
spontaan|kendiliğinden, samimi
spoor|ray, peron · het spoor
sport|spor · de sport
sporthal|spor salonu · de sporthal
sportkleding|spor kıyafeti · de sportkleding
staakt|grev yapar · staken
staatshoofd|devlet başkanı · het staatshoofd
staatsinrichting|devlet yapısı · de staatsinrichting
stad|şehir · de stad
stadskantoor|belediye binası · het stadskantoor
stap|adım, adım atarım · de stap
stappen|adımlar, adım atmak · de stap
stapt|adım atar, biner · stappen
startkwalificatie|asgari diploma, MBO 2 seviyesi · de startkwalificatie
steden|şehirler · de stad
steil|dik, yokuş
stel|çift, sorarım · stellen
stellen|sormak, koymak
stemmen|oy vermek, sesler · de stem
stemt|oy verir · stemmen
stil|sessiz
stofzuigen|elektrik süpürgesi çekmek
stop|dur, durak
stopt|durur, bırakır · stoppen
storing|arıza · de storing
straaten|yanlış form, doğrusu straten
straats|sokağa ait · de straat
strafbaar|cezalandırılabilir, suç
strand|plaj · het strand
straten|sokaklar · de straat
streng|sıkı, katı
stroom|elektrik, akıntı · de stroom
studeert|okur, öğrenim görür · studeren
studeren|üniversitede okumak
studie|öğrenim · de studie
studiedag|okul tatil günü, öğretmen çalışma günü · de studiedag
studiefinanciering|öğrenci burs ve kredisi · de studiefinanciering
stuk|parça, tane · het stuk
stuur|gönder, gönderirim · sturen
stuurt|gönderir · sturen
suikerfeest|Şeker Bayramı · het suikerfeest
svb|SVB, AOW ve çocuk parası kurumu
systeem|sistem · het systeem
taalhuis|Taalhuis, kütüphanede dil merkezi · het taalhuis
taart|pasta · de taart
talen|diller · de taal
tandartspraktijk|diş muayenehanesi · de tandartspraktijk
te|çok, fazla, -mek
team|takım · het team
tegen|karşı
tegenover|karşısında
tekenen|çizmek, imzalamak
telefonisch|telefonla
telefoon|telefon · de telefoon
telefoongesprek|telefon görüşmesi · het telefoongesprek
telefoontijden|telefon saatleri · de telefoontijd
telefoontjes|telefon aramaları · het telefoontje
terecht|haklı olarak, ulaşabilir
terug|geri
teruggebracht|geri getirildi · terugbrengen
terugkomen|geri gelmek
terugkomt|geri gelir · terugkomen
terugkrijgen|geri almak
terugsturen|geri göndermek
tevoren|önceden
thomas|kişi adı
thuis|evde
thuisblijven|evde kalmak
thuiskom|eve gelirim · thuiskomen
tien|on
tijden|zamanlar, saatler · de tijd
tim|kişi adı
toch|yine de, değil mi
toe|-e doğru, ayrılan fiil eki
toen|o zaman, -dığında
toestemming|izin · de toestemming
toets|sınav, test · de toets
toiletten|tuvaletler · het toilet
tom|kişi adı
tot|-e kadar
treinen|trenler · de trein
trekken|çekmek
tuinafval|bahçe atığı · het tuinafval
turkije|Türkiye
turks|Türkçe, Türk
turkse|Türk · Turks
tussen|arasında
twaalf|on iki
twee|iki
tweede|ikinci
twintig|yirmi
typen|klavyede yazmak
u|siz
uit|-den, dışarı, ayrılan fiil eki
uiteindelijk|sonunda
uiterlijk|en geç, dış görünüş
uitje|gezi, eğlence · het uitje
uitkomt|uyar, çıkar · uitkomen
uitnodigd|yanlış form, doğrusu uitgenodigd
uitnodiging|davet · de uitnodiging
uitslag|sonuç · de uitslag
universiteit|üniversite · de universiteit
utrecht|şehir adı
uw|sizin
uwv|UWV, işsizlik ve iş kurumu
uzelf|kendiniz
vaccinatie|aşı · de vaccinatie
vaccinaties|aşılar · de vaccinatie
vaccineren|aşılamak
vakantiegeld|tatil parası · het vakantiegeld
vakbond|sendika · de vakbond
vaker|daha sık · vaak
valt|düşer · vallen
van|-den, -in
vanaf|-den itibaren
vanavond|bu akşam
vanmiddag|bugün öğleden sonra
vannacht|bu gece
vanochtend|bu sabah
veelste|yanlış form, doğrusu veel te
veertig|kırk
vegetarisch|vejetaryen
veilig|güvenli
ver|uzak
verander|değiştiririm · veranderen
veranderen|değiştirmek
verblijf|ikamet, oturum · het verblijf
verbod|yasak · het verbod
verboden|yasak
verdienen|kazanmak
verdient|kazanır · verdienen
verdieping|kat · de verdieping
verdiepingen|katlar · de verdieping
vergeet|unutur · vergeten
verhuisd|taşındı · verhuizen
verhuist|taşınır · verhuizen
verhuizing|taşınma · de verhuizing
verkiezingen|seçimler · de verkiezing
verkoopt|satar · verkopen
verleng|uzatırım · verlengen
verlengen|uzatmak
verlopen|süresi dolmuş · verlopen
verloren|kaybetti · verliezen
verplicht|zorunlu
vers|taze
versta|anlarım · verstaan
verstandig|akıllıca
vertel|anlatırım · vertellen
vertellen|anlatmak
vertrekt|kalkar, ayrılır · vertrekken
vertrektijd|kalkış saati · de vertrektijd
vervallen|iptal oldu · vervallen
vervelend|sıkıcı, can sıkıcı
vervoer|ulaşım · het vervoer
verwijzing|sevk kağıdı · de verwijzing
verzekering|sigorta · de verzekering
verzoek|rica, talep · het verzoek
via|üzerinden
vier|dört
vieren|kutlamak
viese|yanlış form, doğrusu vieze
vieze|pis, kirli · vies
vijf|beş
vijftien|on beş
vijftig|elli
visser|soyadı
vliegen|uçmak
vliegvelden|havalimanları · het vliegveld
vmbo|VMBO, meslek odaklı ortaokul
voc|VOC, Hollanda Doğu Hindistan Şirketi
voetbal|futbol · het voetbal
voetbalclub|futbol kulübü · de voetbalclub
voetbalt|futbol oynar · voetballen
voetbalvereniging|futbol kulübü · de voetbalvereniging
voicemail|sesli mesaj · de voicemail
volg|takip ederim · volgen
volgend|sonraki
volgende|sonraki · volgend
volkorenbrood|tam buğday ekmeği · het volkorenbrood
volle|dolu · vol
volwassene|yetişkin · de volwassene
volwassenen|yetişkinler · de volwassene
voor|için, önünde
voordat|-meden önce
voordeur|ön kapı · de voordeur
voorzitter|başkan · de voorzitter
vorig|geçen
vorige|geçen · vorig
vraag|soru, sorarım · de vraag
vraagt|sorar · vragen
vriend|arkadaş, erkek arkadaş · de vriend
vriendelijke|nazik · vriendelijk
vrienden|arkadaşlar · de vriend
vriendin|kız arkadaş · de vriendin
vrij|serbest, boş
vrijdagavond|cuma akşamı · de vrijdagavond
vrije|boş, serbest · vrij
vrijheid|özgürlük · de vrijheid
vrijmarkten|bit pazarları · de vrijmarkt
vrijwillig|gönüllü
vroeger|eskiden
vrouwen|kadınlar · de vrouw
vrouwenzwemmen|kadınlara özel yüzme · het vrouwenzwemmen
vve|VVE, okul öncesi erken eğitim
vwo-diploma|VWO diploması, lise diploması · het vwo-diploma
waarschijnlijk|muhtemelen
wacht|bekle, beklerim · wachten
wachttijd|bekleme süresi · de wachttijd
wandel|yürürüm · wandelen
wang|yanak · de wang
waren|idiler · zijn
warmer|daha sıcak · warm
warmtezorg|kurum adı, bakım kuruluşu
wasmachine|çamaşır makinesi · de wasmachine
waterland|bölge adı
waterlelie|nilüfer · de waterlelie
we|biz
website|web sitesi · de website
weerbericht|hava durumu · het weerbericht
weggaat|gider, ayrılır · weggaan
weidevenne|Purmerend'de semt adı
weiniger|yanlış form, doğrusu minder
weken|haftalar · de week
wel|ise, aslında
welk|hangi
welkom|hoş geldiniz
wens|dilek, dilerim · de wens
wereldoorlog|dünya savaşı · de wereldoorlog
werkdagen|iş günleri · de werkdag
werkde|çalıştı · werken
werknemers|çalışanlar · de werknemer
werkrooster|çalışma programı · het werkrooster
werktijden|çalışma saatleri · de werktijd
werkzaamheden|çalışmalar, yol çalışması · de werkzaamheden
westen|batı · het westen
wetten|yasalar · de wet
wij|biz
wijk|mahalle · de wijk
willem-alexander|Willem-Alexander, Hollanda kralı
winkelcentrum|alışveriş merkezi · het winkelcentrum
winkels|dükkanlar · de winkel
wit|beyaz
witte|beyaz · wit
woensdagmiddag|çarşamba öğleden sonra · de woensdagmiddag
wolken|bulutlar · de wolk
wonde|yanlış form, doğrusu woonde
woningcorporatie|konut kooperatifi · de woningcorporatie
woningen|evler, konutlar · de woning
woonstichting|konut vakfı · de woonstichting
woonte|yanlış form, doğrusu woonde
ww|WW, işsizlik ödeneği
ww-uitkering|işsizlik ödeneği · de ww-uitkering
y|isim parçası
yasmin|kişi adı
yilmaz|soyadı
yusuf|kişi adı
z|harf, kısaltma parçası
zaal|salon · de zaal
zaalschoenen|salon ayakkabıları · de zaalschoen
zaandam|şehir adı
zachter|daha yumuşak · zacht
zat|oturdu · zitten
zaterdagavond|cumartesi akşamı · de zaterdagavond
zaterdagochtend|cumartesi sabahı · de zaterdagochtend
ze|o, onlar
zeespiegel|deniz seviyesi · de zeespiegel
zeg|söylerim · zeggen
zegt|söyler · zeggen
zeker|kesinlikle, emin
zelf|kendi, kendisi
zelfs|hatta
zere|ağrıyan · zeer
zes|altı
zestig|altmış
zet|koyar · zetten
zetels|sandalyeler, meclis koltukları · de zetel
zetten|koymak
zeven|yedi
zeventiende|on yedinci
zeynep|kişi adı
zich|kendini
zichzelf|kendisini
ziekmelden|hastalık bildirmek · zich ziek melden
ziekte|hastalık · de ziekte
ziens|tot ziens, görüşürüz
zij|o, onlar
zin|cümle, istek · de zin
zinnen|cümleler · de zin
zit|oturur · zitten
zitt|yanlış form, doğrusu zit
zo|böyle, birazdan
zo'n|böyle bir
zoek|ararım · zoeken
zoekt|arar · zoeken
zoenen|öpmek
zolen|tabanlar · de zool
zomaar|öylesine, sebepsiz
zomervakantie|yaz tatili · de zomervakantie
zonder|-sız, olmadan
zonnetje|güneş · het zonnetje
zonnig|güneşli
zoontje|küçük oğul · het zoontje
zorg|bakım, endişe · de zorg
zorgen|bakmak, ilgilenmek
zorgpas|sağlık sigortası kartı · de zorgpas
zorgtoeslag|sağlık sigortası yardımı · de zorgtoeslag
zorgverzekeraar|sağlık sigorta şirketi · de zorgverzekeraar
zou|-erdi · zullen
zuid-holland|il adı
zwart|siyah
zwarte|siyah · zwart
zwemdiploma|yüzme diploması · het zwemdiploma
zwemles|yüzme dersi · de zwemles
één|bir
ömer|kişi adı
öztürk|soyadı
aangezet|açtı, açılmış · aanzetten
bemoeien|karışmak · zich bemoeien met
beëindigen|sona erdirmek, bitirmek
gewone|normal, sıradan · gewoon
langzamer|daha yavaş · langzaam
meegaan|birlikte gitmek, katılmak
organisaties|kuruluşlar · de organisatie
religieuze|dini · religieus
rond|civarında, yaklaşık, etrafında
tablet|tablet, hap · de tablet
toeslagen|devlet yardımları · de toeslag
tweeënhalf|iki buçuk
uitgezet|kapattı, kapatılmış · uitzetten
vast|sabit, kalıcı, vast contract süresiz sözleşme
zussen|kız kardeşler · de zus
aydın|kişi adı
şahin|soyadı
ayşe|kişi adı
doğan|soyadı
yıldız|soyadı
jansen|Hollandaca soyadı
apothekersassistente|eczane asistanı · de apothekersassistente
omroepster|anons yapan kadın, spiker · de omroepster
verkoopster|kadın satış elemanı · de verkoopster
weerman|hava durumu sunucusu · de weerman
verkeersbord|trafik levhası · het verkeersbord
inrijden|içine sürmek, girmek · inrijden
voorrang|geçiş önceliği · de voorrang
pijl|ok · de pijl
eenrichtingsweg|tek yönlü yol · de eenrichtingsweg
richting|yön · de richting
afslaan|sapmak, dönmek · afslaan
fietsers|bisikletliler · de fietser
voetgangers|yayalar · de voetganger
gebied|bölge, alan · het gebied
stapvoets|adım hızında, çok yavaş
maximaal|en fazla, azami
kilometer|kilometre · de kilometer
toeteren|korna çalmak · toeteren
zodat|böylece, ki
kant|taraf, kenar · de kant
zone|bölge · de zone
voorrangsweg|öncelikli yol · de voorrangsweg
zijwegen|yan yollar · de zijweg
driehoeken|üçgenler · de driehoek
kruisende|kesişen · kruisen
afstappen|inmek, bisikletten inmek · afstappen
doorrijden|sürmeye devam etmek · doorrijden
gooi|at · gooien
plastic|plastik · het plastic
blikjes|teneke kutular · het blikje
kranten|gazeteler · de krant
dozen|kutular · de doos
etensresten|yemek artıkları · de etensrest
verpakkingen|ambalajlar · de verpakking
blik|teneke, metal · het blik
drinkpakken|içecek kutuları · het drinkpak
kleding|giysi, kıyafet · de kleding
batterijen|piller · de batterij
verschillende|farklı, çeşitli
openingen|açıklıklar, delikler · de opening
scheidt|ayırır · scheiden
kleur|renk · de kleur
bruin|kahverengi
opening|açıklık, açılış · de opening
waarvoor|ne için, hangisi için
inlogscherm|giriş ekranı · het inlogscherm
loggen|giriş yapmak · inloggen
paal|direk · de paal
ingang|giriş · de ingang
gebouw|bina · het gebouw
sigaretten|sigaralar · de sigaret
hond|köpek · de hond
lijn|tasma, ip, çizgi · de lijn
loslaten|serbest bırakmak · loslaten
verlaten|terk etmek · verlaten
honden|köpekler · de hond
aed|otomatik kalp şok cihazı · de aed
apparaat|cihaz · het apparaat
hartstilstand|kalp durması · de hartstilstand
brandblusser|yangın söndürücü · de brandblusser
volgens|göre
bordje|küçük levha · het bordje
binnenlopen|içeri girmek · binnenlopen
tijdens|sırasında
parkeert|park eder · parkeren
voorwerp|nesne, eşya · het voorwerp
aankomsttijd|varış saati · de aankomsttijd
legt|koyar · leggen
voorruit|ön cam · de voorruit
parkeerautomaat|park ödeme makinesi · de parkeerautomaat
spiegel|ayna · de spiegel
bewijs|kanıt, belge · het bewijs
pakketbezorger|kargo kuryesi · de pakketbezorger
pakket|paket, koli · het pakket
depot|depo, dağıtım noktası · het depot
stoep|kaldırım · de stoep
stempas|oy pusulası kartı · de stempas
ov-kaart|toplu taşıma kartı · de ov-kaart
spel|hecele · spellen
bee|b harfinin adı
uu|u harfinin adı
aa|a harfinin adı
kaa|k harfinin adı
oe|oe sesi, Türkçe u gibi
ee|e harfinin adı
em|m harfinin adı
haa|h harfinin adı
tee|t harfinin adı
ie|i harfinin adı, Türkçe i gibi
ai|ai sesi
cee|c harfinin adı
letter|harf · de letter
w|w harfi
wee|w harfinin adı
vee|v harfinin adı
dubbel|çift
g|g harfi
gee|g harfinin adı
zjee|yanlış harf adı, seçenek
j|j harfi
jee|j harfinin adı
jay|yanlış harf adı, seçenek
ij|ij harfi, uzun ey sesi
i|i harfi
joe|yanlış harf adı, seçenek
q|q harfi
ku|q harfinin adı
kwee|yanlış harf adı, seçenek
zee|z harfinin adı
es|s harfinin adı
klank|ses · de klank
drieëntwintig|yirmi üç
tweeëntwintig|yirmi iki
zevenenveertig|kırk yedi
honderdvijf|yüz beş
vijfentwintig|yirmi beş
zesendertig|otuz altı
honderdtien|yüz on
vierentachtig|seksen dört
vijfenzestig|altmış beş
zesenvijftig|elli altı
vijfenzeventig|yetmiş beş
tweeduizend|iki bin
tweehonderd|iki yüz
twintigduizend|yirmi bin
ene|bir, diğeri ile birlikte
tienduizend|on bin
achtendertig|otuz sekiz
ochtends|sabahları · 's ochtends
begrijpt|anlıyor · begrijpen
vandaan|nereden, waar vandaan
erlangs|yanından
help|yardım et · helpen
tv|televizyon · de tv
opent|açıyor · openen
inwoners|sakinler, nüfus · de inwoner
seconden|saniyeler · de seconde
favoriete|en sevdiği · favoriet
ieder|her, her biri
personen|kişiler · de persoon
gasten|misafirler · de gast
lieverd|canım, tatlım · de lieverd
sinaasappels|portakallar · de sinaasappel
tomaten|domatesler · de tomaat
snijd|kesiyorum · snijden
mayonaise|mayonez · de mayonaise
bakt|pişiriyor, kızartıyor · bakken
hou|seviyorum, tutuyorum · houden
olijfolie|zeytinyağı · de olijfolie
smakelijk|afiyet olsun, lezzetli
lucht|hava, gökyüzü · de lucht
gras|çim · het gras
ogen|gözler · het oog
lichte|açık renkli · licht
voel|hissediyorum · voelen
oefen|alıştırma yapıyorum · oefenen
probeer|deniyorum · proberen
tel|sayıyorum · tellen
leeft|yaşıyor · leven
lacht|gülüyor · lachen
zingt|şarkı söylüyor · zingen
rent|koşuyor · rennen
sluit|kapatıyor · sluiten
kopjes|fincanlar · het kopje
kies|seçiyorum · kiezen
bedank|teşekkür ediyorum · bedanken
jassen|montlar · de jas
hangen|asmak, asılı olmak
warme|sıcak · warm
gordijnen|perdeler · het gordijn
draait|dönüyor, çeviriyor · draaien
`;
if (typeof module !== 'undefined') module.exports = { LEXICON };
