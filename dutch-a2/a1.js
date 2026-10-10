'use strict';

// A1 başlangıç paketi. Her satır nl|tr|en|örnek|örnek tr|örnek en biçimindedir.
// Buradaki kelimeler vocab.js ile çakışmaz, yeni başlayan için ilk 300 kelime.

const A1_THEMES = [
  { id: 'a1_basis', icon: '🌱', title: 'Temel 100', titleEn: 'Core 100', words: `
ik|ben|I|Ik ben Burak.|Ben Burak.|I am Burak.
jij|sen|you|Jij bent mijn vriend.|Sen benim arkadaşımsın.|You are my friend.
je|sen, vurgusuz|you, unstressed|Hoe heet je?|Adın ne?|What is your name?
u|siz, nazik|you, polite|Hoe heet u?|Adınız ne?|What is your name?
hij|o, erkek|he|Hij is mijn broer.|O benim erkek kardeşim.|He is my brother.
zij|o kadın, onlar|she, they|Zij is mijn zus.|O benim kız kardeşim.|She is my sister.
ze|o, onlar, vurgusuz|she, they, unstressed|Ze komt morgen.|O yarın geliyor.|She is coming tomorrow.
het|o, şey|it|Het is koud.|Hava soğuk.|It is cold.
wij|biz|we|Wij wonen in Nederland.|Biz Hollanda'da oturuyoruz.|We live in the Netherlands.
we|biz, vurgusuz|we, unstressed|We gaan naar huis.|Eve gidiyoruz.|We are going home.
jullie|siz, çoğul|you, plural|Jullie zijn welkom.|Hoş geldiniz.|You are welcome.
mijn|benim|my|Dit is mijn vrouw.|Bu benim eşim.|This is my wife.
jouw|senin|your|Is dit jouw tas?|Bu senin çantan mı?|Is this your bag?
uw|sizin|your, polite|Wat is uw naam?|Adınız nedir?|What is your name?
haar|onun, kadın|her|Dat is haar auto.|O onun arabası.|That is her car.
ons|bizim, het kelimeleriyle|our, with het words|Dit is ons huis.|Bu bizim evimiz.|This is our house.
onze|bizim, de kelimeleriyle|our, with de words|Onze buren zijn aardig.|Komşularımız nazik.|Our neighbours are nice.
hun|onların|their|Hun kinderen zijn groot.|Onların çocukları büyük.|Their children are big.
ja|evet|yes|Ja, graag.|Evet, lütfen.|Yes, please.
nee|hayır|no|Nee, dank je.|Hayır, teşekkürler.|No, thank you.
dank u wel|teşekkür ederim, nazik|thank you, polite|Dank u wel, mevrouw.|Teşekkür ederim hanımefendi.|Thank you, madam.
dank je wel|teşekkürler, samimi|thanks, informal|Dank je wel voor de koffie.|Kahve için teşekkürler.|Thanks for the coffee.
bedankt|teşekkürler|thanks|Bedankt voor je hulp.|Yardımın için teşekkürler.|Thanks for your help.
alstublieft|lütfen, buyurun, nazik|please, here you are, polite|Een koffie, alstublieft.|Bir kahve lütfen.|A coffee, please.
alsjeblieft|lütfen, buyur, samimi|please, here you are, informal|Alsjeblieft, je thee.|Buyur, çayın.|Here you are, your tea.
graag gedaan|rica ederim|you are welcome|Graag gedaan!|Rica ederim!|You are welcome!
sorry|özür dilerim|sorry|Sorry, ik ben te laat.|Özür dilerim, geç kaldım.|Sorry, I am late.
pardon|affedersiniz|excuse me|Pardon, mag ik erlangs?|Affedersiniz, geçebilir miyim?|Excuse me, may I pass?
goedemorgen|günaydın|good morning|Goedemorgen, hoe gaat het?|Günaydın, nasılsın?|Good morning, how are you?
hoe gaat het|nasılsın|how are you|Hoe gaat het met u?|Nasılsınız?|How are you?
het gaat goed|iyiyim|I am fine|Het gaat goed, dank je.|İyiyim, teşekkürler.|I am fine, thanks.
prima|gayet iyi|fine, great|Prima, en met jou?|Gayet iyi, ya sen?|Fine, and you?
oké|tamam|okay|Oké, tot morgen.|Tamam, yarına.|Okay, see you tomorrow.
natuurlijk|tabii ki|of course|Natuurlijk, geen probleem.|Tabii ki, sorun değil.|Of course, no problem.
geen probleem|sorun değil|no problem|Geen probleem, ik help je.|Sorun değil, sana yardım ederim.|No problem, I will help you.
meneer|bey, beyefendi|sir, mister|Goedemorgen, meneer.|Günaydın beyefendi.|Good morning, sir.
mevrouw|hanım, hanımefendi|madam|Dank u wel, mevrouw.|Teşekkür ederim hanımefendi.|Thank you, madam.
de|belirli tanımlık, de kelimeleri|the, de words|De man loopt.|Adam yürüyor.|The man walks.
een|bir, belirsiz tanımlık|a, an|Ik heb een vraag.|Bir sorum var.|I have a question.
dit|bu, het kelimeleri|this, het words|Dit is mijn huis.|Bu benim evim.|This is my house.
deze|bu, de kelimeleri|this, de words|Deze stoel is nieuw.|Bu sandalye yeni.|This chair is new.
die|şu, o, de kelimeleri|that, de words|Die man is mijn buurman.|O adam benim komşum.|That man is my neighbour.
met|ile|with|Ik ga met de bus.|Otobüsle gidiyorum.|I go by bus.
zonder|-siz, olmadan|without|Koffie zonder suiker, graag.|Şekersiz kahve lütfen.|Coffee without sugar, please.
van|-in, -den|of, from|Dit is de tas van Ayşe.|Bu Ayşe'nin çantası.|This is Ayşe's bag.
naar|-e, -a doğru|to|Ik ga naar school.|Okula gidiyorum.|I am going to school.
in|içinde, -de|in|Ik woon in Amsterdam.|Amsterdam'da oturuyorum.|I live in Amsterdam.
op|üstünde, -de|on|Het boek ligt op de tafel.|Kitap masanın üstünde.|The book is on the table.
bij|yanında, -de|at, near|Ik ben bij de dokter.|Doktordayım.|I am at the doctor.
uit|-den, dışarı|from, out|Ik kom uit Turkije.|Türkiye'den geliyorum.|I come from Turkey.
aan|-e, üzerinde|to, on|Ik geef het aan jou.|Onu sana veriyorum.|I give it to you.
tot|-e kadar|until|Tot morgen!|Yarın görüşürüz!|Until tomorrow!
om|-de, saat için|at, for times|De les begint om 9.00.|Ders 9.00'da başlıyor.|The class starts at 9.00.
heel|çok|very|Het is heel lekker.|Çok lezzetli.|It is very tasty.
erg|çok, fena|very, badly|Ik ben erg moe.|Çok yorgunum.|I am very tired.
een beetje|biraz|a little|Ik spreek een beetje Nederlands.|Biraz Hollandaca konuşuyorum.|I speak a little Dutch.
meer|daha fazla|more|Wil je meer thee?|Daha çay ister misin?|Do you want more tea?
minder|daha az|less|Minder suiker, graag.|Daha az şeker lütfen.|Less sugar, please.
alles|her şey|everything|Alles is goed.|Her şey iyi.|Everything is fine.
niets|hiçbir şey|nothing|Ik wil niets.|Hiçbir şey istemiyorum.|I want nothing.
iets|bir şey|something|Wil je iets drinken?|Bir şey içmek ister misin?|Do you want something to drink?
iemand|biri|someone|Er is iemand aan de deur.|Kapıda biri var.|There is someone at the door.
niemand|hiç kimse|nobody|Niemand is thuis.|Evde kimse yok.|Nobody is home.
elke|her|every|Ik werk elke dag.|Her gün çalışıyorum.|I work every day.
zo|böyle, öyle|so, like this|Zo doe je dat.|Böyle yapıyorsun.|This is how you do it.
even|kısaca, bir an|just, a moment|Wacht even.|Bir saniye bekle.|Wait a moment.
dan|o zaman, sonra|then|Dan gaan we.|O zaman gidiyoruz.|Then we go.
eerst|önce, ilk olarak|first|Eerst eten, dan tv.|Önce yemek, sonra televizyon.|First food, then tv.
later|daha sonra|later|Tot later!|Sonra görüşürüz!|See you later!
samen|birlikte|together|We eten samen.|Birlikte yemek yiyoruz.|We eat together.
alleen|yalnız, sadece|alone, only|Ik woon alleen.|Yalnız yaşıyorum.|I live alone.
thuis|evde|at home|Ik ben thuis.|Evdeyim.|I am at home.
binnen|içeride|inside|Kom binnen!|İçeri gel!|Come in!
buiten|dışarıda|outside|De kinderen spelen buiten.|Çocuklar dışarıda oynuyor.|The children play outside.
boven|yukarıda|upstairs, above|De slaapkamer is boven.|Yatak odası yukarıda.|The bedroom is upstairs.
beneden|aşağıda|downstairs, below|De keuken is beneden.|Mutfak aşağıda.|The kitchen is downstairs.
dichtbij|yakın|nearby|De winkel is dichtbij.|Dükkan yakın.|The shop is nearby.
ver|uzak|far|Het station is niet ver.|İstasyon uzak değil.|The station is not far.
de vraag|soru|question|Ik heb een vraag.|Bir sorum var.|I have a question.
het antwoord|cevap|answer|Het antwoord is ja.|Cevap evet.|The answer is yes.
de hulp|yardım|help|Dank je voor de hulp.|Yardım için teşekkürler.|Thanks for the help.
het probleem|sorun|problem|Er is een probleem.|Bir sorun var.|There is a problem.
ik weet het niet|bilmiyorum|I do not know|Sorry, ik weet het niet.|Üzgünüm, bilmiyorum.|Sorry, I do not know.
ik begrijp het niet|anlamıyorum|I do not understand|Ik begrijp het niet, sorry.|Anlamıyorum, özür dilerim.|I do not understand, sorry.
nog een keer|bir kez daha|once more|Nog een keer, alstublieft.|Bir kez daha lütfen.|Once more, please.
wat betekent|ne demek|what does it mean|Wat betekent dit woord?|Bu kelime ne demek?|What does this word mean?
hoe zeg je|nasıl denir|how do you say|Hoe zeg je dat in het Nederlands?|Bu Hollandaca nasıl denir?|How do you say that in Dutch?
het woord|kelime|word|Dit woord is nieuw.|Bu kelime yeni.|This word is new.
de zin|cümle|sentence|Lees de zin.|Cümleyi oku.|Read the sentence.
het Nederlands|Hollandaca|Dutch language|Ik leer Nederlands.|Hollandaca öğreniyorum.|I am learning Dutch.
het Turks|Türkçe|Turkish language|Thuis spreken wij Turks.|Evde Türkçe konuşuyoruz.|At home we speak Turkish.
het Engels|İngilizce|English language|Spreekt u Engels?|İngilizce biliyor musunuz?|Do you speak English?
Nederland|Hollanda|the Netherlands|Ik woon in Nederland.|Hollanda'da yaşıyorum.|I live in the Netherlands.
Turkije|Türkiye|Turkey|Mijn familie woont in Turkije.|Ailem Türkiye'de yaşıyor.|My family lives in Turkey.
jammer|yazık|a pity|Wat jammer!|Ne yazık!|What a pity!
gefeliciteerd|tebrikler|congratulations|Gefeliciteerd met je verjaardag!|Doğum günün kutlu olsun!|Happy birthday!
succes|başarılar, kolay gelsin|good luck|Succes met je examen!|Sınavında başarılar!|Good luck with your exam!
welkom|hoş geldin|welcome|Welkom in Nederland!|Hollanda'ya hoş geldin!|Welcome to the Netherlands!
hallo|merhaba|hello|Hallo, ik ben Burak.|Merhaba, ben Burak.|Hello, I am Burak.
tot ziens|görüşmek üzere, hoşça kalın|goodbye|Tot ziens, meneer.|Hoşça kalın beyefendi.|Goodbye, sir.
` },

  { id: 'a1_getallen', icon: '🔢', title: 'Sayılar', titleEn: 'Numbers', words: `
nul|sıfır|zero|Het is nul graden.|Hava sıfır derece.|It is zero degrees.
één|bir|one|Ik heb één broer.|Bir erkek kardeşim var.|I have one brother.
twee|iki|two|Wij hebben twee kinderen.|İki çocuğumuz var.|We have two children.
drie|üç|three|Ik heb drie kinderen.|Üç çocuğum var.|I have three children.
vier|dört|four|De les duurt vier uur.|Ders dört saat sürüyor.|The class lasts four hours.
vijf|beş|five|Het is vijf uur.|Saat beş.|It is five o'clock.
zes|altı|six|Ik sta om zes uur op.|Saat altıda kalkıyorum.|I get up at six.
zeven|yedi|seven|Een week heeft zeven dagen.|Bir hafta yedi gün.|A week has seven days.
acht|sekiz|eight|Mijn zoon is acht jaar.|Oğlum sekiz yaşında.|My son is eight years old.
negen|dokuz|nine|De winkel opent om negen uur.|Dükkan saat dokuzda açılıyor.|The shop opens at nine.
tien|on|ten|Ik heb tien euro.|On eurom var.|I have ten euros.
elf|on bir|eleven|Het is elf uur.|Saat on bir.|It is eleven o'clock.
twaalf|on iki|twelve|Een jaar heeft twaalf maanden.|Bir yıl on iki ay.|A year has twelve months.
dertien|on üç|thirteen|Mijn dochter is dertien.|Kızım on üç yaşında.|My daughter is thirteen.
veertien|on dört|fourteen|Twee weken zijn veertien dagen.|İki hafta on dört gün eder.|Two weeks are fourteen days.
vijftien|on beş|fifteen|De bus komt over vijftien minuten.|Otobüs on beş dakika sonra geliyor.|The bus comes in fifteen minutes.
zestien|on altı|sixteen|Hij is zestien jaar.|O on altı yaşında.|He is sixteen years old.
zeventien|on yedi|seventeen|Het is zeventien graden.|Hava on yedi derece.|It is seventeen degrees.
achttien|on sekiz|eighteen|Je bent achttien, je mag stemmen.|On sekizsin, oy verebilirsin.|You are eighteen, you may vote.
negentien|on dokuz|nineteen|Mijn neef is negentien.|Kuzenim on dokuz yaşında.|My cousin is nineteen.
twintig|yirmi|twenty|Dit kost twintig euro.|Bu yirmi euro.|This costs twenty euros.
eenentwintig|yirmi bir|twenty one|Zij is eenentwintig jaar.|O yirmi bir yaşında.|She is twenty one years old.
dertig|otuz|thirty|Ik ben dertig jaar.|Otuz yaşındayım.|I am thirty years old.
veertig|kırk|forty|Mijn vader is veertig.|Babam kırk yaşında.|My father is forty.
vijftig|elli|fifty|Het huis is vijftig jaar oud.|Ev elli yaşında.|The house is fifty years old.
zestig|altmış|sixty|Een uur heeft zestig minuten.|Bir saat altmış dakika.|An hour has sixty minutes.
zeventig|yetmiş|seventy|Mijn oma is zeventig.|Babaannem yetmiş yaşında.|My grandmother is seventy.
tachtig|seksen|eighty|Opa is tachtig jaar.|Dedem seksen yaşında.|Grandpa is eighty years old.
negentig|doksan|ninety|De trein rijdt negentig kilometer per uur.|Tren saatte doksan kilometre gidiyor.|The train goes ninety kilometres per hour.
honderd|yüz|hundred|Ik heb honderd euro.|Yüz eurom var.|I have a hundred euros.
duizend|bin|thousand|De huur is duizend euro.|Kira bin euro.|The rent is a thousand euros.
miljoen|milyon|million|Amsterdam heeft bijna een miljoen inwoners.|Amsterdam'ın neredeyse bir milyon nüfusu var.|Amsterdam has almost a million inhabitants.
eerste|birinci, ilk|first|Dit is mijn eerste les.|Bu benim ilk dersim.|This is my first lesson.
tweede|ikinci|second|Hij woont op de tweede verdieping.|O ikinci katta oturuyor.|He lives on the second floor.
derde|üçüncü|third|Het is de derde keer.|Bu üçüncü kez.|It is the third time.
vierde|dördüncü|fourth|Dit is de vierde week.|Bu dördüncü hafta.|This is the fourth week.
laatste|sonuncu, son|last|Dit is de laatste vraag.|Bu son soru.|This is the last question.
het getal|sayı|number|Welk getal is dit?|Bu hangi sayı?|Which number is this?
de helft|yarı, yarısı|half, the half|De helft van tien is vijf.|Onun yarısı beş.|Half of ten is five.
keer|kere, kez|times|Drie keer vier is twaalf.|Üç kere dört on iki.|Three times four is twelve.
plus|artı|plus|Twee plus twee is vier.|İki artı iki dört.|Two plus two is four.
min|eksi|minus|Tien min drie is zeven.|On eksi üç yedi.|Ten minus three is seven.
de euro|euro|euro|Dit kost vijf euro.|Bu beş euro.|This costs five euros.
de cent|sent, kuruş|cent|Het brood kost twee euro vijftig cent.|Ekmek iki euro elli sent.|The bread costs two euros fifty cents.
` },

  { id: 'a1_tijd', icon: '⏰', title: 'Saat ve gün', titleEn: 'Time and day', words: `
de klok|saat, duvar saati|clock|De klok hangt aan de muur.|Saat duvarda asılı.|The clock hangs on the wall.
het horloge|kol saati|watch|Mijn horloge is kapot.|Kol saatim bozuk.|My watch is broken.
hoe laat|saat kaç|what time|Hoe laat is het?|Saat kaç?|What time is it?
over|geçe|past|Het is tien over drie.|Saat üçü on geçiyor.|It is ten past three.
voor|kala|to|Het is vijf voor acht.|Saat sekize beş var.|It is five to eight.
de seconde|saniye|second|Wacht tien seconden.|On saniye bekle.|Wait ten seconds.
het moment|an|moment|Een moment, alstublieft.|Bir dakika lütfen.|One moment, please.
het seizoen|mevsim|season|De lente is mijn favoriete seizoen.|İlkbahar en sevdiğim mevsim.|Spring is my favourite season.
februari|şubat|February|Februari is kort.|Şubat kısa.|February is short.
maart|mart|March|In maart begint de lente.|Mart'ta ilkbahar başlar.|Spring starts in March.
april|nisan|April|Mijn verjaardag is in april.|Doğum günüm nisanda.|My birthday is in April.
mei|mayıs|May|In mei is het mooi weer.|Mayısta hava güzel.|In May the weather is nice.
juni|haziran|June|De zomer begint in juni.|Yaz haziranda başlar.|Summer begins in June.
augustus|ağustos|August|In augustus gaan wij naar Turkije.|Ağustosta Türkiye'ye gidiyoruz.|In August we go to Turkey.
september|eylül|September|De school begint in september.|Okul eylülde başlar.|School starts in September.
oktober|ekim|October|Oktober is in de herfst.|Ekim sonbaharda.|October is in autumn.
november|kasım|November|In november regent het veel.|Kasımda çok yağmur yağar.|In November it rains a lot.
vanmorgen|bu sabah|this morning|Vanmorgen was ik moe.|Bu sabah yorgundum.|This morning I was tired.
vanmiddag|bu öğleden sonra|this afternoon|Vanmiddag ga ik naar de markt.|Bu öğleden sonra pazara gidiyorum.|This afternoon I go to the market.
vanavond|bu akşam|this evening|Vanavond eten we vis.|Bu akşam balık yiyoruz.|This evening we eat fish.
vannacht|bu gece|tonight, last night|Vannacht heb ik slecht geslapen.|Bu gece kötü uyudum.|Last night I slept badly.
overmorgen|öbür gün|the day after tomorrow|Overmorgen is het zaterdag.|Öbür gün cumartesi.|The day after tomorrow is Saturday.
eergisteren|evvelsi gün|the day before yesterday|Eergisteren was ik ziek.|Evvelsi gün hastaydım.|The day before yesterday I was ill.
's ochtends|sabahları|in the morning|'s Ochtends drink ik koffie.|Sabahları kahve içerim.|In the morning I drink coffee.
's middags|öğleden sonraları|in the afternoon|'s Middags werk ik.|Öğleden sonraları çalışırım.|In the afternoon I work.
's avonds|akşamları|in the evening|'s Avonds kijken we tv.|Akşamları televizyon izleriz.|In the evening we watch tv.
's nachts|geceleri|at night|'s Nachts slaap ik.|Geceleri uyurum.|At night I sleep.
volgende|gelecek, sonraki|next|Volgende week heb ik vakantie.|Gelecek hafta tatilim var.|Next week I have a holiday.
vorige|geçen, önceki|last, previous|Vorige maand was ik in Turkije.|Geçen ay Türkiye'deydim.|Last month I was in Turkey.
op tijd|zamanında|on time|De trein is op tijd.|Tren zamanında.|The train is on time.
te laat|geç|late, too late|Sorry, ik ben te laat.|Özür dilerim, geç kaldım.|Sorry, I am late.
precies|tam|exactly|Het is precies twaalf uur.|Saat tam on iki.|It is exactly twelve o'clock.
ongeveer|yaklaşık|about, approximately|Het is ongeveer drie uur.|Saat yaklaşık üç.|It is about three o'clock.
de wekker|çalar saat|alarm clock|De wekker gaat om zeven uur.|Çalar saat yedide çalıyor.|The alarm goes off at seven.
` },

  { id: 'a1_mensen', icon: '👥', title: 'İnsanlar ve selamlaşma', titleEn: 'People and greetings', words: `
de mens|insan|human, person|Ieder mens is anders.|Her insan farklı.|Every person is different.
de mensen|insanlar|people|De mensen hier zijn aardig.|Buradaki insanlar nazik.|The people here are nice.
de persoon|kişi|person|Een tafel voor twee personen.|İki kişilik bir masa.|A table for two people.
de vriend|arkadaş, erkek arkadaş|friend, boyfriend|Ahmet is mijn vriend.|Ahmet benim arkadaşım.|Ahmet is my friend.
de vriendin|kız arkadaş, kadın arkadaş|female friend, girlfriend|Mijn vriendin heet Elif.|Arkadaşımın adı Elif.|My friend's name is Elif.
de jongen|oğlan, erkek çocuk|boy|De jongen speelt voetbal.|Oğlan futbol oynuyor.|The boy plays football.
het meisje|kız|girl|Het meisje is zes jaar.|Kız altı yaşında.|The girl is six years old.
de buurvrouw|kadın komşu|female neighbour|Mijn buurvrouw is aardig.|Komşum nazik.|My neighbour is nice.
de leraar|öğretmen|teacher|De leraar spreekt langzaam.|Öğretmen yavaş konuşuyor.|The teacher speaks slowly.
de verkoper|satıcı|shop assistant|De verkoper helpt mij.|Satıcı bana yardım ediyor.|The shop assistant helps me.
de Nederlander|Hollandalı|Dutch person|Mijn buurman is Nederlander.|Komşum Hollandalı.|My neighbour is Dutch.
de Turk|Türk|Turk|Ik ben Turk.|Ben Türküm.|I am a Turk.
de volwassene|yetişkin|adult|Dit is een film voor volwassenen.|Bu yetişkinler için bir film.|This is a film for adults.
de gast|misafir|guest|Wij hebben gasten vanavond.|Bu akşam misafirlerimiz var.|We have guests this evening.
de kennis|tanıdık|acquaintance|Hij is een kennis van mijn man.|O kocamın bir tanıdığı.|He is an acquaintance of my husband.
de dame|hanım, bayan|lady|Dames en heren, goedenavond.|Hanımlar ve beyler, iyi akşamlar.|Ladies and gentlemen, good evening.
de heer|bey, beyefendi|gentleman|Geachte heer Yilmaz.|Sayın Yılmaz Bey.|Dear Mr Yilmaz.
het stel|çift|couple|Zij zijn een leuk stel.|Onlar hoş bir çift.|They are a nice couple.
hoi|selam|hi|Hoi, alles goed?|Selam, her şey yolunda mı?|Hi, all good?
goedemiddag|iyi günler, öğleden sonra|good afternoon|Goedemiddag, mevrouw.|İyi günler hanımefendi.|Good afternoon, madam.
goedenavond|iyi akşamlar|good evening|Goedenavond, meneer.|İyi akşamlar beyefendi.|Good evening, sir.
goedenacht|iyi geceler|good night|Goedenacht en tot morgen.|İyi geceler, yarın görüşürüz.|Good night and see you tomorrow.
welterusten|iyi uykular|sleep well|Welterusten, lieverd.|İyi uykular canım.|Sleep well, darling.
doei|hoşça kal, bay bay|bye|Doei, tot morgen!|Hoşça kal, yarın görüşürüz!|Bye, see you tomorrow!
dag|merhaba ya da hoşça kal|hello or bye|Dag mevrouw, tot ziens!|Hoşça kalın hanımefendi!|Bye madam, goodbye!
tot morgen|yarın görüşürüz|see you tomorrow|Tot morgen, Ayşe!|Yarın görüşürüz Ayşe!|See you tomorrow, Ayşe!
tot straks|birazdan görüşürüz|see you soon|Tot straks, ik kom om zes uur.|Birazdan görüşürüz, altıda geliyorum.|See you soon, I am coming at six.
aangenaam|memnun oldum|pleased to meet you|Aangenaam, ik ben Burak.|Memnun oldum, ben Burak.|Pleased to meet you, I am Burak.
hoe heet je|adın ne|what is your name|Hoe heet je? Ik heet Zeynep.|Adın ne? Benim adım Zeynep.|What is your name? My name is Zeynep.
ik heet|benim adım|my name is|Ik heet Burak.|Benim adım Burak.|My name is Burak.
en jij|ya sen|and you|Goed, en jij?|İyiyim, ya sen?|Fine, and you?
de groet|selam|greeting|Groeten aan je vrouw!|Eşine selam söyle!|Greetings to your wife!
` },

  { id: 'a1_eten_basis', icon: '🍽️', title: 'Yemek temel', titleEn: 'Food basics', words: `
de banaan|muz|banana|Ik eet een banaan.|Bir muz yiyorum.|I eat a banana.
de sinaasappel|portakal|orange|Sinaasappels zijn gezond.|Portakal sağlıklıdır.|Oranges are healthy.
de tomaat|domates|tomato|Ik koop tomaten op de markt.|Pazardan domates alıyorum.|I buy tomatoes at the market.
de ui|soğan|onion|Ik snijd een ui.|Bir soğan doğruyorum.|I cut an onion.
de wortel|havuç|carrot|De wortel is oranje.|Havuç turuncu.|The carrot is orange.
de boterham|dilim ekmek, sandviç|slice of bread, sandwich|Ik eet een boterham met kaas.|Peynirli ekmek yiyorum.|I eat a sandwich with cheese.
de jam|reçel|jam|Wil je jam op je brood?|Ekmeğine reçel ister misin?|Do you want jam on your bread?
de honing|bal|honey|Honing is zoet.|Bal tatlı.|Honey is sweet.
de yoghurt|yoğurt|yoghurt|Ik eet yoghurt bij het ontbijt.|Kahvaltıda yoğurt yiyorum.|I eat yoghurt at breakfast.
de worst|sosis, sucuk|sausage|Deze worst is halal.|Bu sosis helal.|This sausage is halal.
de pasta|makarna|pasta|De kinderen willen pasta.|Çocuklar makarna istiyor.|The children want pasta.
de pizza|pizza|pizza|Wij bestellen een pizza.|Bir pizza sipariş ediyoruz.|We order a pizza.
de friet|patates kızartması|fries|Friet met mayonaise, graag.|Mayonezli patates lütfen.|Fries with mayonnaise, please.
het koekje|kurabiye|biscuit|Wil je een koekje bij de thee?|Çayın yanına kurabiye ister misin?|Do you want a biscuit with your tea?
de taart|pasta, turta|cake|Oma bakt een taart.|Nine pasta yapıyor.|Grandma bakes a cake.
de chocola|çikolata|chocolate|Ik hou van chocola.|Çikolatayı severim.|I love chocolate.
het ijs|dondurma|ice cream|In de zomer eten we ijs.|Yazın dondurma yeriz.|In summer we eat ice cream.
de peper|karabiber, biber|pepper|Zout en peper, alstublieft.|Tuz ve karabiber lütfen.|Salt and pepper, please.
de olie|yağ|oil|Ik kook met olijfolie.|Zeytinyağıyla pişiriyorum.|I cook with olive oil.
het bier|bira|beer|Hij drinkt geen bier.|O bira içmiyor.|He does not drink beer.
de wijn|şarap|wine|Wij drinken geen wijn.|Biz şarap içmiyoruz.|We do not drink wine.
de cola|kola|cola|Een cola, alstublieft.|Bir kola lütfen.|A cola, please.
de limonade|limonata, meyveli içecek|lemonade|De kinderen drinken limonade.|Çocuklar limonata içiyor.|The children drink lemonade.
de fles|şişe|bottle|Een fles water, graag.|Bir şişe su lütfen.|A bottle of water, please.
het kopje|fincan|cup|Een kopje koffie?|Bir fincan kahve?|A cup of coffee?
de pan|tencere, tava|pan|De soep staat in de pan.|Çorba tencerede.|The soup is in the pan.
het menu|menü|menu|Mag ik het menu?|Menüyü alabilir miyim?|May I have the menu?
de ober|garson|waiter|Ober, de rekening graag.|Garson, hesap lütfen.|Waiter, the bill please.
de maaltijd|öğün, yemek|meal|Dit is een lekkere maaltijd.|Bu lezzetli bir yemek.|This is a tasty meal.
het stuk|parça, adet|piece|Een stuk taart, graag.|Bir dilim pasta lütfen.|A piece of cake, please.
ontbijten|kahvaltı yapmak|to have breakfast|Wij ontbijten om acht uur.|Sekizde kahvaltı yapıyoruz.|We have breakfast at eight.
zoet|tatlı|sweet|De thee is te zoet.|Çay çok tatlı.|The tea is too sweet.
vers|taze|fresh|Het brood is vers.|Ekmek taze.|The bread is fresh.
heet|sıcak, kızgın|hot|Pas op, de soep is heet.|Dikkat, çorba sıcak.|Careful, the soup is hot.
eet smakelijk|afiyet olsun|enjoy your meal|Eet smakelijk allemaal!|Herkese afiyet olsun!|Enjoy your meal everyone!
` },

  { id: 'a1_kleuren', icon: '🎨', title: 'Renkler ve sıfatlar', titleEn: 'Colours and adjectives', words: `
de kleur|renk|colour|Welke kleur is dit?|Bu hangi renk?|Which colour is this?
rood|kırmızı|red|De tomaat is rood.|Domates kırmızı.|The tomato is red.
blauw|mavi|blue|De lucht is blauw.|Gökyüzü mavi.|The sky is blue.
groen|yeşil|green|Het gras is groen.|Çimen yeşil.|The grass is green.
geel|sarı|yellow|De banaan is geel.|Muz sarı.|The banana is yellow.
oranje|turuncu|orange|Nederland speelt in het oranje.|Hollanda turuncu forma giyer.|The Netherlands play in orange.
zwart|siyah|black|Mijn jas is zwart.|Ceketim siyah.|My coat is black.
wit|beyaz|white|De muur is wit.|Duvar beyaz.|The wall is white.
grijs|gri|grey|De lucht is grijs vandaag.|Gökyüzü bugün gri.|The sky is grey today.
bruin|kahverengi|brown|Mijn ogen zijn bruin.|Gözlerim kahverengi.|My eyes are brown.
roze|pembe|pink|Het meisje heeft een roze jas.|Kızın pembe bir ceketi var.|The girl has a pink coat.
paars|mor|purple|Deze bloem is paars.|Bu çiçek mor.|This flower is purple.
licht|açık, hafif|light|Ik wil een lichte kleur.|Açık bir renk istiyorum.|I want a light colour.
donker|koyu, karanlık|dark|Het is donker buiten.|Dışarısı karanlık.|It is dark outside.
dik|kalın, şişman|thick, fat|Dit boek is dik.|Bu kitap kalın.|This book is thick.
dun|ince, zayıf|thin|Het papier is dun.|Kağıt ince.|The paper is thin.
hoog|yüksek|high, tall|Het gebouw is hoog.|Bina yüksek.|The building is tall.
laag|alçak|low|De tafel is laag.|Masa alçak.|The table is low.
breed|geniş|wide|De straat is breed.|Sokak geniş.|The street is wide.
smal|dar|narrow|De trap is smal.|Merdiven dar.|The stairs are narrow.
zacht|yumuşak|soft|Het bed is zacht.|Yatak yumuşak.|The bed is soft.
hard|sert, yüksek sesli|hard, loud|De muziek is te hard.|Müzik çok yüksek.|The music is too loud.
nat|ıslak|wet|Mijn jas is nat.|Ceketim ıslak.|My coat is wet.
droog|kuru|dry|Het is droog vandaag.|Bugün hava kuru.|It is dry today.
sterk|güçlü|strong|De koffie is sterk.|Kahve sert.|The coffee is strong.
zwak|zayıf, güçsüz|weak|Ik voel me zwak.|Kendimi güçsüz hissediyorum.|I feel weak.
lief|tatlı, sevimli|sweet, kind|Wat een lief kind!|Ne tatlı bir çocuk!|What a sweet child!
rijk|zengin|rich|Hij is niet rijk.|O zengin değil.|He is not rich.
arm|fakir|poor|Het gezin is arm.|Aile fakir.|The family is poor.
klaar|hazır, bitmiş|ready, finished|Het eten is klaar.|Yemek hazır.|The food is ready.
vrij|boş, serbest|free|Is deze stoel vrij?|Bu sandalye boş mu?|Is this chair free?
zeker|kesinlikle, emin|certainly, sure|Ja, zeker!|Evet, kesinlikle!|Yes, certainly!
anders|farklı, başka|different|Dit is anders.|Bu farklı.|This is different.
hetzelfde|aynı|the same|Wij hebben hetzelfde boek.|Aynı kitaba sahibiz.|We have the same book.
fijn|hoş, güzel|nice, pleasant|Fijn weekend!|İyi hafta sonları!|Have a nice weekend!
lelijk|çirkin|ugly|Het gebouw is lelijk.|Bina çirkin.|The building is ugly.
fout|yanlış|wrong|Dit antwoord is fout.|Bu cevap yanlış.|This answer is wrong.
` },

  { id: 'a1_werkwoorden', icon: '🔁', title: 'İlk fiiller', titleEn: 'First verbs', words: `
heten|adı olmak|to be called|Ik heet Burak.|Benim adım Burak.|My name is Burak.
spelen|oynamak|to play|De kinderen spelen buiten.|Çocuklar dışarıda oynuyor.|The children play outside.
studeren|okumak, eğitim görmek|to study|Mijn neef studeert in Utrecht.|Kuzenim Utrecht'te okuyor.|My cousin studies in Utrecht.
oefenen|alıştırma yapmak|to practise|Ik oefen elke dag.|Her gün alıştırma yapıyorum.|I practise every day.
herhalen|tekrarlamak|to repeat|Kunt u dat herhalen?|Tekrar edebilir misiniz?|Can you repeat that?
spellen|hecelemek, harf harf söylemek|to spell|Kunt u dat spellen?|Bunu heceleyebilir misiniz?|Can you spell that?
vertellen|anlatmak|to tell|Vertel me iets.|Bana bir şey anlat.|Tell me something.
proberen|denemek|to try|Ik probeer het.|Deniyorum.|I am trying it.
tellen|saymak|to count|Ik tel tot tien.|Ona kadar sayıyorum.|I count to ten.
leven|yaşamak|to live|Mijn opa leeft nog.|Dedem hâlâ yaşıyor.|My grandpa is still alive.
voelen|hissetmek|to feel|Ik voel me goed.|Kendimi iyi hissediyorum.|I feel good.
lachen|gülmek|to laugh|De baby lacht.|Bebek gülüyor.|The baby laughs.
huilen|ağlamak|to cry|Het kind huilt.|Çocuk ağlıyor.|The child cries.
zingen|şarkı söylemek|to sing|Zij zingt mooi.|O güzel şarkı söylüyor.|She sings beautifully.
wassen|yıkamak|to wash|Ik was mijn handen.|Ellerimi yıkıyorum.|I wash my hands.
douchen|duş almak|to shower|Ik douche elke ochtend.|Her sabah duş alıyorum.|I shower every morning.
rennen|koşmak|to run|De jongen rent naar school.|Oğlan okula koşuyor.|The boy runs to school.
vallen|düşmek|to fall|Pas op, je valt!|Dikkat, düşüyorsun!|Careful, you are falling!
openen|açmak|to open|Ik open de deur.|Kapıyı açıyorum.|I open the door.
sluiten|kapatmak|to close|De winkel sluit om zes uur.|Dükkan altıda kapanıyor.|The shop closes at six.
pakken|almak, tutmak|to take, to grab|Pak je jas.|Ceketini al.|Take your coat.
halen|getirmek, gidip almak|to get, to fetch|Ik haal brood.|Ekmek alıyorum.|I am getting bread.
zetten|koymak, dik koymak|to put, upright|Ik zet de kopjes op tafel.|Fincanları masaya koyuyorum.|I put the cups on the table.
leggen|koymak, yatay koymak|to lay, to put flat|Ik leg het boek op de tafel.|Kitabı masaya koyuyorum.|I put the book on the table.
laten|bırakmak, izin vermek|to let, to leave|Laat me even denken.|Dur bir düşüneyim.|Let me think a moment.
kiezen|seçmek|to choose|Kies een kleur.|Bir renk seç.|Choose a colour.
reizen|seyahat etmek|to travel|Wij reizen met de trein.|Trenle seyahat ediyoruz.|We travel by train.
dragen|taşımak, giymek|to carry, to wear|Hij draagt een zwarte jas.|O siyah bir ceket giyiyor.|He wears a black coat.
vieren|kutlamak|to celebrate|Wij vieren mijn verjaardag.|Doğum günümü kutluyoruz.|We celebrate my birthday.
bedanken|teşekkür etmek|to thank|Ik bedank de dokter.|Doktora teşekkür ediyorum.|I thank the doctor.
` },

  { id: 'a1_huis', icon: '🏠', title: 'Ev temel', titleEn: 'Home basics', words: `
de muur|duvar|wall|De muur is wit.|Duvar beyaz.|The wall is white.
de vloer|zemin, yer|floor|De vloer is schoon.|Zemin temiz.|The floor is clean.
het dak|çatı|roof|Het dak is rood.|Çatı kırmızı.|The roof is red.
de gang|koridor|hallway|De jassen hangen in de gang.|Ceketler koridorda asılı.|The coats hang in the hallway.
de zolder|tavan arası|attic|De dozen staan op zolder.|Kutular tavan arasında.|The boxes are in the attic.
de verdieping|kat|floor, storey|Wij wonen op de derde verdieping.|Üçüncü katta oturuyoruz.|We live on the third floor.
de lift|asansör|lift|De lift is kapot.|Asansör bozuk.|The lift is broken.
de douche|duş|shower|De douche is boven.|Duş yukarıda.|The shower is upstairs.
het bad|küvet, banyo|bath|De kinderen zitten in bad.|Çocuklar küvette.|The children are in the bath.
de kraan|musluk|tap|De kraan lekt.|Musluk damlatıyor.|The tap is dripping.
de spiegel|ayna|mirror|De spiegel hangt in de badkamer.|Ayna banyoda asılı.|The mirror hangs in the bathroom.
de lamp|lamba|lamp|De lamp is aan.|Lamba açık.|The lamp is on.
het licht|ışık|light|Doe het licht uit.|Işığı kapat.|Turn off the light.
de bank|kanepe, banka|sofa, bank|Wij zitten op de bank.|Kanepede oturuyoruz.|We sit on the sofa.
het kussen|yastık|pillow, cushion|Het kussen is zacht.|Yastık yumuşak.|The pillow is soft.
de deken|battaniye|blanket|Ik heb een warme deken.|Sıcak bir battaniyem var.|I have a warm blanket.
het gordijn|perde|curtain|De gordijnen zijn dicht.|Perdeler kapalı.|The curtains are closed.
de wasmachine|çamaşır makinesi|washing machine|De wasmachine draait.|Çamaşır makinesi çalışıyor.|The washing machine is running.
de oven|fırın|oven|De taart staat in de oven.|Pasta fırında.|The cake is in the oven.
de magnetron|mikrodalga|microwave|Ik warm de soep op in de magnetron.|Çorbayı mikrodalgada ısıtıyorum.|I heat the soup in the microwave.
de computer|bilgisayar|computer|De computer staat op het bureau.|Bilgisayar masanın üstünde.|The computer is on the desk.
de telefoon|telefon|telephone|Mijn telefoon is leeg.|Telefonumun şarjı bitti.|My phone is dead.
het bureau|çalışma masası|desk|Ik werk aan mijn bureau.|Çalışma masamda çalışıyorum.|I work at my desk.
de plant|bitki|plant|De plant heeft water nodig.|Bitkinin suya ihtiyacı var.|The plant needs water.
de bloem|çiçek|flower|Ik koop bloemen voor mijn vrouw.|Eşime çiçek alıyorum.|I buy flowers for my wife.
de brievenbus|posta kutusu|letterbox|De post ligt in de brievenbus.|Posta, posta kutusunda.|The mail is in the letterbox.
de bel|zil|doorbell|De bel gaat.|Zil çalıyor.|The doorbell rings.
het slot|kilit|lock|Het slot is kapot.|Kilit bozuk.|The lock is broken.
de handdoek|havlu|towel|De handdoek is nat.|Havlu ıslak.|The towel is wet.
de zeep|sabun|soap|Was je handen met zeep.|Ellerini sabunla yıka.|Wash your hands with soap.
de tandenborstel|diş fırçası|toothbrush|Mijn tandenborstel is blauw.|Diş fırçam mavi.|My toothbrush is blue.
de prullenbak|çöp kutusu|bin|Gooi het in de prullenbak.|Çöp kutusuna at.|Throw it in the bin.
` }
];


// Alfabe. say alanı harfin Hollandaca adıdır, sesli okuma için böyle yazılır.

const A1_ALPHABET = [
  { letter: 'a', say: 'aa', tr: 'uzun a, Türkçedeki a gibi ama uzun', en: 'long a', word: 'Amsterdam' },
  { letter: 'b', say: 'bee', tr: 'Türkçedeki b gibi, kelime sonunda p gibi', en: 'like b, p at the end of a word', word: 'brood' },
  { letter: 'c', say: 'cee', tr: 'genelde k ya da s okunur', en: 'reads as k or s', word: 'cent' },
  { letter: 'd', say: 'dee', tr: 'Türkçedeki d gibi, kelime sonunda t gibi', en: 'like d, t at the end of a word', word: 'dag' },
  { letter: 'e', say: 'ee', tr: 'uzun e, ey gibi', en: 'long e, like ay in say', word: 'twee' },
  { letter: 'f', say: 'ef', tr: 'Türkçedeki f gibi', en: 'like f', word: 'fiets' },
  { letter: 'g', say: 'gee', tr: 'Hollandacanın meşhur gırtlak sesi, boğazı kazıyan bir h, Türkçede yok', en: 'the famous Dutch throat sound, a scraped h, never like English g', word: 'goed' },
  { letter: 'h', say: 'haa', tr: 'Türkçedeki h gibi', en: 'like h', word: 'huis' },
  { letter: 'i', say: 'ie', tr: 'Türkçedeki i gibi', en: 'like ee in see', word: 'ik' },
  { letter: 'j', say: 'jee', tr: 'Türkçedeki y gibi', en: 'like y in yes', word: 'ja' },
  { letter: 'k', say: 'kaa', tr: 'Türkçedeki k gibi', en: 'like k', word: 'kind' },
  { letter: 'l', say: 'el', tr: 'Türkçedeki l gibi', en: 'like l', word: 'les' },
  { letter: 'm', say: 'em', tr: 'Türkçedeki m gibi', en: 'like m', word: 'man' },
  { letter: 'n', say: 'en', tr: 'Türkçedeki n gibi', en: 'like n', word: 'nee' },
  { letter: 'o', say: 'oo', tr: 'uzun o', en: 'long o', word: 'oom' },
  { letter: 'p', say: 'pee', tr: 'Türkçedeki p gibi', en: 'like p', word: 'pen' },
  { letter: 'q', say: 'ku', tr: 'kü diye okunur, nadir, sadece yabancı kelimelerde', en: 'rare, only in loanwords', word: 'quiz' },
  { letter: 'r', say: 'er', tr: 'Türkçedeki r gibi, bazı bölgelerde gırtlaktan', en: 'rolled r, in some regions from the throat', word: 'rood' },
  { letter: 's', say: 'es', tr: 'Türkçedeki s gibi', en: 'like s', word: 'school' },
  { letter: 't', say: 'tee', tr: 'Türkçedeki t gibi', en: 'like t', word: 'tien' },
  { letter: 'u', say: 'uu', tr: 'Türkçedeki ü gibi, uzun', en: 'like French u, long', word: 'uur' },
  { letter: 'v', say: 'vee', tr: 'v ile f arası bir ses', en: 'between v and f', word: 'vier' },
  { letter: 'w', say: 'wee', tr: 'yumuşak v, Türkçedeki v gibi', en: 'soft v, like Turkish v', word: 'water' },
  { letter: 'x', say: 'iks', tr: 'ks okunur, nadir', en: 'reads as ks, rare', word: 'taxi' },
  { letter: 'y', say: 'ij', tr: 'Griekse ij ya da i-grec denir, nadir, çoğu kelimede ij yazılır', en: 'called Griekse ij, rare, most words use ij instead', word: 'yoghurt' },
  { letter: 'z', say: 'zet', tr: 'Türkçedeki z gibi', en: 'like z', word: 'zon' },
  { letter: 'ij', say: 'ij', tr: 'ey ile ay arası bir ses, lange ij denir', en: 'between ay and eye, called lange ij', word: 'ijs' },
  { letter: 'ei', say: 'ei', tr: 'ij ile tamamen aynı ses, korte ei denir', en: 'exactly the same sound as ij, called korte ei', word: 'trein' },
  { letter: 'ui', say: 'ui', tr: 'Türkçede yok, dudaklar yuvarlak, öü der gibi', en: 'no Turkish or English equivalent, a rounded uh ee', word: 'huis' },
  { letter: 'eu', say: 'eu', tr: 'uzun ö gibi', en: 'like a long ö', word: 'deur' },
  { letter: 'oe', say: 'oe', tr: 'Türkçedeki u gibi', en: 'like oo in boot', word: 'boek' },
  { letter: 'ch', say: 'ch', tr: 'g ile aynı gırtlak sesi', en: 'the same throat sound as g', word: 'acht' }
];


// A1 dersleri. Alıştırmalarda a[0] her zaman doğru cevaptır, uygulama seçenekleri karıştırır.

const A1_LESSONS = [
  {
    id: 'a1_spellen', icon: '🔤', title: 'Alfabe ve spelling', titleEn: 'Alphabet and spelling',
    body: `<p>Hollandada adını sürekli heceleyeceksin, belediyede, doktorda, telefonda. O yüzden harflerin Hollandaca adlarını ezberle. Çoğu harf kolay, <b>a</b> aa, <b>b</b> bee, <b>k</b> kaa, <b>s</b> es gibi.</p>
<p>Dikkat edilecek harfler şunlar</p>
<ul>
<li><b>e</b> harfi ee diye okunur, <b>i</b> ise ie. Türkçedeki e ve i yer değiştirmiş gibi hissedersin, alış.</li>
<li><b>g</b> gee diye söylenir ama sesi gırtlaktan gelen bir h, Türkçede yok.</li>
<li><b>j</b> jee, sesi Türkçedeki y.</li>
<li><b>u</b> uu, Türkçedeki ü gibi.</li>
<li><b>v</b> vee, <b>w</b> wee, ikisi ayrı harf, karıştırma.</li>
<li><b>y</b> harfine Griekse ij denir, <b>z</b> zet.</li>
</ul>
<p>Hollandacada bazı harf çiftleri tek ses verir. <b>ij</b> ve <b>ei</b> aynı ses, ey ile ay arası. <b>oe</b> Türkçedeki u, <b>eu</b> uzun ö, <b>ui</b> ise Türkçede olmayan bir ses, dudakları yuvarlayıp öü der gibi.</p>
<p>Burak şöyle hecelenir, bee uu er aa kaa. Önce kendi adını ve soyadını çalış, sonra sokağının adını. Alfabe sayfasında her harfe dokunup dinleyebilirsin.</p>`,
    bodyEn: `<p>In the Netherlands you will spell your name all the time, at the municipality, at the doctor, on the phone. So learn the Dutch names of the letters. Most are easy, <b>a</b> aa, <b>b</b> bee, <b>k</b> kaa, <b>s</b> es.</p>
<p>Watch out for these</p>
<ul>
<li><b>e</b> is called ee, <b>i</b> is called ie. It feels like e and i swapped places, get used to it.</li>
<li><b>g</b> is called gee but the sound is a scraped h from the throat, never a hard g.</li>
<li><b>j</b> is jee, the sound is y as in yes.</li>
<li><b>u</b> is uu, like a French u.</li>
<li><b>v</b> vee and <b>w</b> wee are two different letters.</li>
<li><b>y</b> is called Griekse ij, <b>z</b> is zet.</li>
</ul>
<p>Some letter pairs make one sound. <b>ij</b> and <b>ei</b> sound the same, between ay and eye. <b>oe</b> is oo as in boot, <b>eu</b> is a long ö, <b>ui</b> has no English equivalent, round your lips and say uh ee.</p>
<p>Burak is spelled bee uu er aa kaa. Practise your own name and surname first, then your street. On the alphabet page you can tap each letter and listen.</p>`,
    drills: [
      { q: 'Hoe spel je Burak?', a: ['bee uu er aa kaa', 'bee oe er aa kaa', 'bee uu er ee kaa'], ex: 'u harfi uu, a harfi aa diye söylenir.', exEn: 'The letter u is called uu and a is called aa.' },
      { q: 'Hoe spel je Mehmet?', a: ['em ee haa em ee tee', 'em ee aa em ee tee', 'en ee haa en ee tee'], ex: 'e harfi ee, h harfi haa, m harfi em.', exEn: 'e is ee, h is haa, m is em.' },
      { q: 'Hoe spel je Ali?', a: ['aa el ie', 'aa el ai', 'ee el ie'], ex: 'i harfinin adı ie, a harfinin adı aa.', exEn: 'The letter i is called ie, a is called aa.' },
      { q: 'Hoe spel je Emre?', a: ['ee em er ee', 'ee em er ie', 'ie em er ee'], ex: 'e harfi hep ee diye söylenir.', exEn: 'The letter e is always called ee.' },
      { q: 'Hoe spel je Utrecht?', a: ['uu tee er ee cee haa tee', 'oe tee er ee cee haa tee', 'uu tee er ee kaa haa tee'], ex: 'u harfi uu, c harfi cee.', exEn: 'u is uu, c is cee.' },
      { q: 'Hoe heet de letter w?', a: ['wee', 'vee', 'dubbel uu'], ex: 'w harfi wee, v harfi vee. İkisi ayrı.', exEn: 'w is wee, v is vee. They are different letters.' },
      { q: 'Hoe heet de letter g?', a: ['gee', 'zjee', 'haa'], ex: 'Adı gee, sesi gırtlaktan h.', exEn: 'It is called gee, the sound is a throat h.' },
      { q: 'Hoe heet de letter j?', a: ['jee', 'jay', 'ie'], ex: 'j harfi jee, sesi Türkçedeki y.', exEn: 'j is jee, the sound is y as in yes.' },
      { q: 'Hoe heet de letter y?', a: ['ij', 'uu', 'ie'], ex: 'y harfine Griekse ij ya da i-grec denir.', exEn: 'y is called Griekse ij or i-grec.' },
      { q: 'Hoe heet de letter i?', a: ['ie', 'ai', 'ei'], ex: 'i harfinin adı ie.', exEn: 'The letter i is called ie.' },
      { q: 'Hoe heet de letter e?', a: ['ee', 'ie', 'aa'], ex: 'e harfinin adı ee, ey gibi.', exEn: 'The letter e is called ee, like ay.' },
      { q: 'Hoe heet de letter u?', a: ['uu', 'oe', 'joe'], ex: 'u harfi uu, Türkçedeki ü gibi.', exEn: 'u is uu, like a French u.' },
      { q: 'Hoe heet de letter q?', a: ['ku', 'kaa', 'kwee'], ex: 'q harfi ku, kü gibi okunur.', exEn: 'q is called ku.' },
      { q: 'Hoe heet de letter z?', a: ['zet', 'zee', 'es'], ex: 'z harfinin adı zet.', exEn: 'The letter z is called zet.' },
      { q: 'Welk woord heeft de klank ui?', a: ['huis', 'boek', 'deur'], ex: 'huis kelimesinde ui var, boek oe, deur eu.', exEn: 'huis has ui, boek has oe, deur has eu.' },
      { q: 'Welk woord heeft de klank oe?', a: ['boek', 'huis', 'trein'], ex: 'boek oe sesi, Türkçedeki u gibi.', exEn: 'boek has oe, like oo in boot.' }
    ]
  },

  {
    id: 'a1_getallen', icon: '🔢', title: 'Sayılar', titleEn: 'Numbers',
    body: `<p>Sayılar her yerde karşına çıkar, fiyatlar, saatler, telefon numaraları. 0 ile 12 arası ezber, nul, één, twee, drie, vier, vijf, zes, zeven, acht, negen, tien, elf, twaalf.</p>
<p>13 ile 19 arası sona <b>tien</b> gelir, dertien, veertien, vijftien, zestien, zeventien, achttien, negentien. Dikkat, dertien ve veertien biraz değişiyor.</p>
<p>Onlar <b>tig</b> ile biter, twintig, dertig, veertig, vijftig, zestig, zeventig, tachtig, negentig. tachtig başta t alır, achttig değil.</p>
<p>Asıl numara şu. 21 ile 99 arasında Hollandalılar önce birler basamağını söyler, sonra <b>en</b>, sonra onlar basamağı. Yani 23 drieëntwintig, üç ve yirmi. 47 zevenenveertig. Türkçenin tam tersi, o yüzden bir sayı duyunca sonunu bekle.</p>
<p>Sesli harfler çakışınca ë yazılır, tweeëntwintig, drieëntwintig. Yüzler kolay, honderd, tweehonderd, honderdvijf. Binler de aynı, duizend, tweeduizend.</p>
<p>Sıra sayıları, eerste, tweede, derde, vierde, vijfde. Sonrası genelde <b>de</b> alır, tiende gibi, yirmiden sonra <b>ste</b>, twintigste.</p>`,
    bodyEn: `<p>Numbers are everywhere, prices, times, phone numbers. Learn 0 to 12 by heart, nul, één, twee, drie, vier, vijf, zes, zeven, acht, negen, tien, elf, twaalf.</p>
<p>13 to 19 end in <b>tien</b>, dertien, veertien, vijftien, zestien, zeventien, achttien, negentien. Note that dertien and veertien change a little.</p>
<p>The tens end in <b>tig</b>, twintig, dertig, veertig, vijftig, zestig, zeventig, tachtig, negentig. tachtig starts with a t, not achttig.</p>
<p>Here is the trick. From 21 to 99 the Dutch say the units first, then <b>en</b>, then the tens. So 23 is drieëntwintig, three and twenty. 47 is zevenenveertig. It is the reverse of English, so when you hear a number wait for the end.</p>
<p>When vowels collide you write ë, tweeëntwintig, drieëntwintig. Hundreds are easy, honderd, tweehonderd, honderdvijf. Thousands too, duizend, tweeduizend.</p>
<p>Ordinals are eerste, tweede, derde, vierde, vijfde. After that mostly <b>de</b>, like tiende, and from twenty on <b>ste</b>, twintigste.</p>`,
    drills: [
      { q: 'drieëntwintig', a: ['23', '32', '13'], ex: 'drie ve twintig, önce birler sonra onlar.', exEn: 'drie and twintig, units first then tens.' },
      { q: 'Hoeveel is twaalf plus acht?', a: ['twintig', 'achttien', 'tweeëntwintig'], ex: '12 artı 8 eşittir 20, twintig.', exEn: '12 plus 8 is 20, twintig.' },
      { q: 'zevenenveertig', a: ['47', '74', '37'], ex: 'zeven ve veertig, yani 47.', exEn: 'zeven and veertig, so 47.' },
      { q: 'honderdvijf', a: ['105', '150', '115'], ex: 'honderd artı vijf, 105.', exEn: 'honderd plus vijf, 105.' },
      { q: 'Hoeveel is vijf keer zes?', a: ['dertig', 'vijfentwintig', 'zesendertig'], ex: '5 kere 6 eşittir 30, dertig.', exEn: '5 times 6 is 30, dertig.' },
      { q: 'negentien', a: ['19', '90', '9'], ex: 'negen artı tien, 19. 90 negentig olurdu.', exEn: 'negen plus tien, 19. 90 would be negentig.' },
      { q: 'Hoeveel is honderd min tien?', a: ['negentig', 'tachtig', 'honderdtien'], ex: '100 eksi 10 eşittir 90.', exEn: '100 minus 10 is 90.' },
      { q: 'vierentachtig', a: ['84', '48', '88'], ex: 'vier ve tachtig, 84.', exEn: 'vier and tachtig, 84.' },
      { q: '65', a: ['vijfenzestig', 'zesenvijftig', 'vijfenzeventig'], ex: 'Önce 5 vijf, sonra en, sonra 60 zestig.', exEn: 'First 5 vijf, then en, then 60 zestig.' },
      { q: '12', a: ['twaalf', 'twintig', 'elf'], ex: '12 twaalf, 20 twintig, 11 elf.', exEn: '12 is twaalf, 20 is twintig, 11 is elf.' },
      { q: '2000', a: ['tweeduizend', 'tweehonderd', 'twintigduizend'], ex: 'twee artı duizend. tweehonderd 200 olurdu.', exEn: 'twee plus duizend. tweehonderd would be 200.' },
      { q: 'Maandag is de ___ dag van de week.', a: ['eerste', 'een', 'ene'], ex: 'Sıra sayısı, eerste.', exEn: 'Ordinal number, eerste.' },
      { q: 'Hoeveel is veertien min vier?', a: ['tien', 'vier', 'achttien'], ex: '14 eksi 4 eşittir 10.', exEn: '14 minus 4 is 10.' },
      { q: '1000', a: ['duizend', 'honderd', 'tienduizend'], ex: '1000 duizend, 100 honderd.', exEn: '1000 is duizend, 100 is honderd.' },
      { q: 'Het is de ___ keer dat ik hier ben.', a: ['derde', 'drie', 'dertig'], ex: 'Üçüncü kez, derde keer.', exEn: 'The third time, derde keer.' },
      { q: 'achtendertig', a: ['38', '83', '28'], ex: 'acht ve dertig, 38.', exEn: 'acht and dertig, 38.' }
    ]
  },

  {
    id: 'a1_klok', icon: '🕒', title: 'Saat', titleEn: 'Telling the time',
    body: `<p>Hollandaca saat söylemek başta kafa karıştırır çünkü <b>half</b> kelimesi gelecek saate bakar. <b>half vier</b> 3.30 demek, dörde yarım kala diye düşün. Türkçedeki üç buçuk gibi değil, dikkat.</p>
<p>Tam saat için <b>uur</b>, het is drie uur, 3.00.</p>
<p>Çeyrek için <b>kwart over</b> ve <b>kwart voor</b>. kwart over negen 9.15, kwart voor tien 9.45.</p>
<p>Dakikalar için <b>over</b> geçe, <b>voor</b> kala. vijf over drie 3.05, tien voor vier 3.50.</p>
<p>Zor kısım yarımın etrafı. 20, 25, 35 ve 40 dakikalarda tam saate değil, yarıma göre sayarsın.</p>
<ul>
<li>3.20 tien voor half vier</li>
<li>3.25 vijf voor half vier</li>
<li>3.30 half vier</li>
<li>3.35 vijf over half vier</li>
<li>3.40 tien over half vier</li>
</ul>
<p>Yani tien over half elf 10.40, vijf voor half drie 2.25. Hollandalılar konuşurken on ikilik sistemi kullanır, 15.00 için drie uur der, gerekirse 's middags ekler.</p>
<p>Soru şöyle sorulur, Hoe laat is het? Cevap, Het is half vier. Saat kaçta için <b>om</b>, De les begint om half negen.</p>`,
    bodyEn: `<p>Dutch time is confusing at first because <b>half</b> looks ahead to the next hour. <b>half vier</b> means 3.30, think half way to four. Not half past four, careful.</p>
<p>For the full hour use <b>uur</b>, het is drie uur, 3.00.</p>
<p>For quarters use <b>kwart over</b> and <b>kwart voor</b>. kwart over negen is 9.15, kwart voor tien is 9.45.</p>
<p>For minutes <b>over</b> is past and <b>voor</b> is to. vijf over drie is 3.05, tien voor vier is 3.50.</p>
<p>The hard part is around the half hour. At 20, 25, 35 and 40 minutes you count from the half, not from the hour.</p>
<ul>
<li>3.20 tien voor half vier</li>
<li>3.25 vijf voor half vier</li>
<li>3.30 half vier</li>
<li>3.35 vijf over half vier</li>
<li>3.40 tien over half vier</li>
</ul>
<p>So tien over half elf is 10.40 and vijf voor half drie is 2.25. In speech the Dutch use the twelve hour clock, 15.00 is drie uur, with 's middags added if needed.</p>
<p>The question is Hoe laat is het? The answer, Het is half vier. For at what time use <b>om</b>, De les begint om half negen.</p>`,
    drills: [
      { q: 'half vier', a: ['3.30', '4.30', '3.45'], ex: 'half dörde yarım kala demek, yani 3.30.', exEn: 'half means half way to four, so 3.30.' },
      { q: 'kwart over negen', a: ['9.15', '8.45', '9.45'], ex: 'kwart over dokuzu çeyrek geçe, 9.15.', exEn: 'kwart over is quarter past, 9.15.' },
      { q: 'Het is 10.40. Hoe laat is het?', a: ['tien over half elf', 'twintig voor tien', 'tien voor half elf'], ex: 'half elf 10.30, on dakika geçince tien over half elf.', exEn: 'half elf is 10.30, ten minutes later is tien over half elf.' },
      { q: 'kwart voor zes', a: ['5.45', '6.45', '6.15'], ex: 'altıya çeyrek kala, 5.45.', exEn: 'quarter to six, 5.45.' },
      { q: 'tien voor half drie', a: ['2.20', '3.20', '2.40'], ex: 'half drie 2.30, on dakika öncesi 2.20.', exEn: 'half drie is 2.30, ten minutes before is 2.20.' },
      { q: 'vijf over half acht', a: ['7.35', '8.35', '7.25'], ex: 'half acht 7.30, beş geçe 7.35.', exEn: 'half acht is 7.30, five past that is 7.35.' },
      { q: 'Het is 2.25. Hoe laat is het?', a: ['vijf voor half drie', 'vijf over half drie', 'vijf voor drie'], ex: 'half drie 2.30, beş dakika öncesi vijf voor half drie.', exEn: 'half drie is 2.30, five minutes before is vijf voor half drie.' },
      { q: 'Het is 12.30. Hoe laat is het?', a: ['half een', 'half twaalf', 'twaalf half'], ex: 'Bire yarım kala, half een.', exEn: 'Half way to one, half een.' },
      { q: 'Het is 8.50. Hoe laat is het?', a: ['tien voor negen', 'tien over acht', 'tien over half negen'], ex: 'dokuza on kala, tien voor negen.', exEn: 'ten to nine, tien voor negen.' },
      { q: 'Het is 6.05. Hoe laat is het?', a: ['vijf over zes', 'vijf voor zes', 'vijf over half zeven'], ex: 'altıyı beş geçe, vijf over zes.', exEn: 'five past six, vijf over zes.' },
      { q: 'Het is 11.00. Hoe laat is het?', a: ['Het is elf uur.', 'Het is elf.', 'Het is half elf.'], ex: 'Tam saatte uur eklenir.', exEn: 'On the full hour you add uur.' },
      { q: 'Het is 4.45. Hoe laat is het?', a: ['kwart voor vijf', 'kwart over vier', 'kwart voor vier'], ex: 'beşe çeyrek kala, kwart voor vijf.', exEn: 'quarter to five, kwart voor vijf.' },
      { q: 'Het is 9.20. Hoe laat is het?', a: ['tien voor half tien', 'tien over half tien', 'twintig voor negen'], ex: 'half tien 9.30, on dakika öncesi tien voor half tien.', exEn: 'half tien is 9.30, ten minutes before is tien voor half tien.' },
      { q: 'half twaalf', a: ['11.30', '12.30', '11.45'], ex: 'on ikiye yarım kala, 11.30.', exEn: 'half way to twelve, 11.30.' },
      { q: "De les begint om half negen 's ochtends. Hoe laat?", a: ['8.30', '9.30', '8.45'], ex: 'half negen 8.30, sabah.', exEn: 'half negen is 8.30, in the morning.' },
      { q: 'Het is 1.55. Hoe laat is het?', a: ['vijf voor twee', 'vijf over twee', 'vijf over half twee'], ex: 'ikiye beş kala, vijf voor twee.', exEn: 'five to two, vijf voor twee.' }
    ]
  },

  {
    id: 'a1_zinnen', icon: '💬', title: 'İlk cümleler', titleEn: 'First sentences',
    body: `<p>İlk cümlelerin hepsi aynı kalıp, özne, fiil, gerisi. Fiil hep ikinci sırada.</p>
<ul>
<li>Ik <b>heet</b> Burak. Adım Burak.</li>
<li>Ik <b>ben</b> dertig jaar. Otuz yaşındayım.</li>
<li>Ik <b>kom</b> uit Turkije. Türkiye'denim.</li>
<li>Ik <b>woon</b> in Purmerend. Purmerend'de oturuyorum.</li>
<li>Ik <b>spreek</b> een beetje Nederlands. Biraz Hollandaca konuşuyorum.</li>
</ul>
<p>Fiil çekimi şimdilik şu kadar. ik ile kök, jij ve hij ile kök artı <b>t</b>, wij ve jullie ile mastar. ik woon, jij woont, hij woont, wij wonen. Şu ikisi düzensiz, <b>zijn</b> için ik ben, jij bent, hij is, wij zijn. <b>hebben</b> için ik heb, jij hebt, hij heeft, wij hebben.</p>
<p>Nazik konuşurken <b>u</b> kullan, u heet, u woont, u bent, u heeft.</p>
<p>Olumsuz için ismin önüne <b>geen</b>, Ik ben geen Nederlander. Gerisine <b>niet</b>, Ik begrijp het niet.</p>
<p>Kurtarıcı cümleler, Ik begrijp het niet. Kunt u dat herhalen? Spreekt u Engels? Ik weet het niet. Bunları ezberle, gerisi gelir.</p>`,
    bodyEn: `<p>All your first sentences follow one pattern, subject, verb, the rest. The verb is always in second place.</p>
<ul>
<li>Ik <b>heet</b> Burak. My name is Burak.</li>
<li>Ik <b>ben</b> dertig jaar. I am thirty.</li>
<li>Ik <b>kom</b> uit Turkije. I am from Turkey.</li>
<li>Ik <b>woon</b> in Purmerend. I live in Purmerend.</li>
<li>Ik <b>spreek</b> een beetje Nederlands. I speak a little Dutch.</li>
</ul>
<p>This is all the conjugation you need for now. ik takes the stem, jij and hij take the stem plus <b>t</b>, wij and jullie take the infinitive. ik woon, jij woont, hij woont, wij wonen. Two are irregular, <b>zijn</b> gives ik ben, jij bent, hij is, wij zijn. <b>hebben</b> gives ik heb, jij hebt, hij heeft, wij hebben.</p>
<p>When being polite use <b>u</b>, u heet, u woont, u bent, u heeft.</p>
<p>For a negative put <b>geen</b> before a noun, Ik ben geen Nederlander. Everywhere else use <b>niet</b>, Ik begrijp het niet.</p>
<p>Lifesaver sentences, Ik begrijp het niet. Kunt u dat herhalen? Spreekt u Engels? Ik weet het niet. Learn these by heart and the rest will follow.</p>`,
    drills: [
      { q: 'Ik ___ Burak.', a: ['heet', 'heten', 'heb'], ex: 'ik ile kök, heet. Adım Burak.', exEn: 'ik takes the stem, heet. My name is Burak.' },
      { q: 'Ik ___ uit Turkije.', a: ['kom', 'komt', 'komen'], ex: 'ik kom, jij komt, wij komen.', exEn: 'ik kom, jij komt, wij komen.' },
      { q: 'Wij ___ in Purmerend.', a: ['wonen', 'woon', 'woont'], ex: 'wij ile mastar, wonen.', exEn: 'wij takes the infinitive, wonen.' },
      { q: 'Hij ___ dertig jaar.', a: ['is', 'ben', 'zijn'], ex: 'zijn düzensiz, hij is.', exEn: 'zijn is irregular, hij is.' },
      { q: '___ gaat het?', a: ['Hoe', 'Wat', 'Wie'], ex: 'Hoe gaat het, nasılsın.', exEn: 'Hoe gaat het, how are you.' },
      { q: 'Ik spreek een ___ Nederlands.', a: ['beetje', 'klein', 'veel'], ex: 'een beetje, biraz.', exEn: 'een beetje, a little.' },
      { q: 'Dank u ___.', a: ['wel', 'goed', 'veel'], ex: 'Dank u wel, teşekkür ederim.', exEn: 'Dank u wel, thank you.' },
      { q: 'Ik ___ het niet.', a: ['begrijp', 'begrijpt', 'begrijpen'], ex: 'ik ile kök, begrijp.', exEn: 'ik takes the stem, begrijp.' },
      { q: 'Ik ___ graag een koffie.', a: ['wil', 'wilt', 'willen'], ex: 'ik wil, jij wilt, wij willen.', exEn: 'ik wil, jij wilt, wij willen.' },
      { q: 'Tot ___!', a: ['ziens', 'zien', 'zie'], ex: 'Tot ziens, görüşmek üzere.', exEn: 'Tot ziens, goodbye.' },
      { q: 'Ik ben ___ Nederlander. Ik ben Turk.', a: ['geen', 'niet', 'nee'], ex: 'İsmin önünde geen.', exEn: 'Before a noun use geen.' },
      { q: 'Dit ___ mijn vrouw.', a: ['is', 'ben', 'zijn'], ex: 'dit tekil, dit is.', exEn: 'dit is singular, dit is.' },
      { q: 'Spreekt ___ Engels?', a: ['u', 'jij', 'je'], ex: 'spreekt ile u gider, jij ile spreek jij olurdu.', exEn: 'spreekt goes with u, with jij it would be spreek jij.' },
      { q: 'Hoe ___ je?', a: ['heet', 'heten', 'heeft'], ex: 'Soruda je ile kök, hoe heet je.', exEn: 'In a question je takes the stem, hoe heet je.' },
      { q: 'Ik woon ___ Amsterdam.', a: ['in', 'op', 'naar'], ex: "Şehirlerde in, Amsterdam'da.", exEn: 'For cities use in.' },
      { q: 'Wij ___ twee kinderen.', a: ['hebben', 'heb', 'heeft'], ex: 'wij ile mastar, hebben.', exEn: 'wij takes the infinitive, hebben.' }
    ]
  },

  {
    id: 'a1_vragen', icon: '❓', title: 'Soru kelimeleri', titleEn: 'Question words',
    body: `<p>Soru kelimeleri hep cümlenin başında, hemen arkasından fiil gelir, sonra özne.</p>
<ul>
<li><b>wie</b> kim. Wie is dat?</li>
<li><b>wat</b> ne. Wat is dit?</li>
<li><b>waar</b> nerede. Waar woon je?</li>
<li><b>wanneer</b> ne zaman. Wanneer kom je?</li>
<li><b>waarom</b> neden. Waarom ben je moe?</li>
<li><b>hoe</b> nasıl. Hoe gaat het?</li>
<li><b>hoeveel</b> kaç, ne kadar. Hoeveel kost dit?</li>
<li><b>welke</b> hangi. Welke bus gaat naar het station?</li>
</ul>
<p>Hoe ile başlayan hazır sorular çok işine yarar. <b>Hoe heet je?</b> adın ne. <b>Hoe oud ben je?</b> kaç yaşındasın. <b>Hoe laat is het?</b> saat kaç.</p>
<p>Nereden sorusu ikiye bölünür, <b>Waar kom je vandaan?</b> vandaan sona gider.</p>
<p>Evet hayır sorusunda soru kelimesi yok, fiil başa geçer. Wil je koffie? Spreekt u Engels? Türkçedeki mi ekinin işini fiili başa almak görür.</p>
<p>Not, jij ya da je ile soru sorunca t düşer, jij woont ama woon jij. u ile düşmez, woont u.</p>`,
    bodyEn: `<p>Question words always come first, then the verb straight after, then the subject.</p>
<ul>
<li><b>wie</b> who. Wie is dat?</li>
<li><b>wat</b> what. Wat is dit?</li>
<li><b>waar</b> where. Waar woon je?</li>
<li><b>wanneer</b> when. Wanneer kom je?</li>
<li><b>waarom</b> why. Waarom ben je moe?</li>
<li><b>hoe</b> how. Hoe gaat het?</li>
<li><b>hoeveel</b> how much, how many. Hoeveel kost dit?</li>
<li><b>welke</b> which. Welke bus gaat naar het station?</li>
</ul>
<p>Ready made questions with hoe are very useful. <b>Hoe heet je?</b> what is your name. <b>Hoe oud ben je?</b> how old are you. <b>Hoe laat is het?</b> what time is it.</p>
<p>Where from splits in two, <b>Waar kom je vandaan?</b> vandaan goes to the end.</p>
<p>A yes or no question has no question word, the verb simply moves to the front. Wil je koffie? Spreekt u Engels?</p>
<p>Note, when you ask with jij or je the t drops, jij woont but woon jij. With u it stays, woont u.</p>`,
    drills: [
      { q: '___ heet je?', a: ['Hoe', 'Wat', 'Wie'], ex: 'Hoe heet je, adın ne.', exEn: 'Hoe heet je, what is your name.' },
      { q: '___ woon je?', a: ['Waar', 'Wie', 'Wanneer'], ex: 'waar nerede.', exEn: 'waar means where.' },
      { q: '___ is dat? Dat is mijn broer.', a: ['Wie', 'Wat', 'Waar'], ex: 'Kişi sorulunca wie.', exEn: 'For a person use wie.' },
      { q: '___ is dit? Dit is een boek.', a: ['Wat', 'Wie', 'Hoe'], ex: 'Şey sorulunca wat.', exEn: 'For a thing use wat.' },
      { q: '___ kost dit?', a: ['Hoeveel', 'Hoe', 'Welke'], ex: 'Fiyat için hoeveel, ne kadar.', exEn: 'For a price use hoeveel, how much.' },
      { q: '___ begint de les? Om negen uur.', a: ['Hoe laat', 'Hoeveel', 'Waar'], ex: 'Saat sorulunca hoe laat.', exEn: 'For the time use hoe laat.' },
      { q: 'Waar kom je ___?', a: ['vandaan', 'van', 'uit'], ex: 'Nereden sorusu waar ... vandaan.', exEn: 'Where from is waar ... vandaan.' },
      { q: '___ ben je moe? Omdat ik hard werk.', a: ['Waarom', 'Wanneer', 'Waar'], ex: 'Cevap omdat ile başlıyorsa soru waarom.', exEn: 'If the answer starts with omdat the question is waarom.' },
      { q: '___ taal spreek je?', a: ['Welke', 'Wat', 'Wie'], ex: 'İsimden önce hangi, welke.', exEn: 'Which before a noun, welke.' },
      { q: '___ oud ben je?', a: ['Hoe', 'Hoeveel', 'Wat'], ex: 'Hoe oud, kaç yaşında.', exEn: 'Hoe oud, how old.' },
      { q: '___ is je verjaardag?', a: ['Wanneer', 'Waar', 'Wie'], ex: 'Zaman sorulunca wanneer.', exEn: 'For a time or date use wanneer.' },
      { q: '___ kinderen heb je?', a: ['Hoeveel', 'Hoe', 'Wat'], ex: 'Sayı sorulunca hoeveel.', exEn: 'For a number use hoeveel.' },
      { q: '___ is je telefoonnummer?', a: ['Wat', 'Hoe', 'Hoeveel'], ex: 'Numara wat ile sorulur.', exEn: 'A phone number is asked with wat.' },
      { q: '___ bus gaat naar het station?', a: ['Welke', 'Wat', 'Hoe'], ex: 'Hangi otobüs, welke bus.', exEn: 'Which bus, welke bus.' },
      { q: '___ gaat het met je moeder?', a: ['Hoe', 'Wat', 'Wie'], ex: 'Hoe gaat het met, nasıl.', exEn: 'Hoe gaat het met, how is.' },
      { q: '___ je koffie?', a: ['Wil', 'Wat', 'Hoe'], ex: 'Evet hayır sorusu, fiil başa, je ile t düşer.', exEn: 'Yes or no question, verb first, the t drops with je.' }
    ]
  }
];

if (typeof module !== 'undefined') module.exports = { A1_THEMES, A1_LESSONS, A1_ALPHABET };
