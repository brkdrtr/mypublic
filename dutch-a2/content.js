'use strict';

// Oefenmateriaal voor het inburgeringsexamen A2
// In elke meerkeuzevraag is a[0] het goede antwoord, de app husselt de opties

const LEZEN = [
  {
    id: 'l1', title: 'Brief van de gemeente', type: 'brief',
    text: `Beste meneer Yilmaz,\n\nU heeft een nieuw paspoort aangevraagd. Uw paspoort is nu klaar. U kunt het ophalen bij het Stadskantoor in Purmerend.\n\nU moet eerst een afspraak maken. Dat kan via de website van de gemeente of telefonisch via 14 0299. Wij zijn open van maandag tot en met vrijdag van 9.00 tot 16.30 uur. Op donderdag zijn wij open tot 20.00 uur.\n\nNeem uw oude paspoort mee. U moet het nieuwe paspoort zelf ophalen. Iemand anders mag het niet voor u ophalen.\n\nLet op! Haal uw paspoort binnen drie maanden op.\n\nMet vriendelijke groet,\n\nAfdeling Burgerzaken\nGemeente Purmerend`,
    questions: [
      { q: 'Wat moet meneer Yilmaz eerst doen?', a: ['Een afspraak maken', 'Zonder afspraak naar het Stadskantoor gaan', 'Een brief terugsturen'] },
      { q: 'Wat moet meneer Yilmaz meenemen?', a: ['Zijn oude paspoort', 'Een pasfoto', 'Zijn rijbewijs'] },
      { q: 'Wanneer is het Stadskantoor ook in de avond open?', a: ['Op donderdag', 'Op maandag', 'Op vrijdag'] },
      { q: 'Wat is waar?', a: ['Meneer Yilmaz moet het paspoort zelf ophalen', 'De vrouw van meneer Yilmaz mag het paspoort ophalen', 'Meneer Yilmaz kan het paspoort na een jaar nog ophalen'] }
    ]
  },
  {
    id: 'l2', title: 'Nieuws van de huisarts', type: 'website',
    text: `Huisartsenpraktijk De Linde\n\nBelangrijk nieuws\nVanaf 1 november heeft onze praktijk nieuwe telefoontijden.\n\nVoor een afspraak belt u tussen 8.00 en 10.00 uur. Voor de uitslag van een onderzoek belt u tussen 13.00 en 14.00 uur. U kunt ook een afspraak maken via onze app.\n\nHerhaalrecepten\nHeeft u weer dezelfde medicijnen nodig? Bestel ze minimaal drie werkdagen van tevoren via de app of de receptenlijn. Na drie werkdagen kunt u de medicijnen ophalen bij de apotheek.\n\nAvond en weekend\nIs de praktijk dicht en heeft u dringend een huisarts nodig? Bel dan de huisartsenpost. Bij levensgevaar belt u altijd 112.`,
    questions: [
      { q: 'Wanneer belt u voor een afspraak?', a: ['Tussen 8.00 en 10.00 uur', 'Tussen 13.00 en 14.00 uur', 'Tussen 10.00 en 12.00 uur'] },
      { q: 'U heeft weer dezelfde medicijnen nodig. Wat doet u?', a: ['Ik bestel ze drie werkdagen van tevoren', 'Ik ga meteen naar de apotheek', 'Ik bel de huisartsenpost'] },
      { q: 'Het is zaterdag en uw kind is erg ziek. Wie belt u?', a: ['De huisartsenpost', 'Huisartsenpraktijk De Linde', 'De apotheek'] }
    ]
  },
  {
    id: 'l3', title: 'Uitje met de klas', type: 'e-mail',
    text: `Beste ouders van groep 5,\n\nVolgende week donderdag gaan we met de klas naar het Rijksmuseum in Amsterdam. We gaan met de bus. De bus vertrekt om 8.45 uur bij de school. We zijn om 15.00 uur weer terug.\n\nGeef uw kind een lunchpakket en iets te drinken mee. Snoep is niet nodig. Het uitje is gratis. De school betaalt de bus van de ouderbijdrage.\n\nWij zoeken nog twee ouders die mee willen gaan. Wilt u mee? Stuur mij dan voor vrijdag een e-mail.\n\nIs uw kind ziek op die dag? Bel dan voor 8.30 uur naar school.\n\nMet vriendelijke groet,\nJuf Sandra`,
    questions: [
      { q: 'Hoe laat vertrekt de bus?', a: ['Om 8.45 uur', 'Om 8.30 uur', 'Om 15.00 uur'] },
      { q: 'Wat moet uw kind meenemen?', a: ['Eten en drinken', 'Geld voor de bus', 'Snoep'] },
      { q: 'U wilt meegaan met de klas. Wat moet u doen?', a: ['Voor vrijdag een e-mail sturen', 'Op donderdag voor 8.30 uur bellen', 'Naar het museum komen'] }
    ]
  },
  {
    id: 'l4', title: 'Werkrooster', type: 'rooster',
    text: `Werkrooster week 12\nBakkerij Van Dam\n\nMaandag\nBurak 6.00 tot 14.00 uur\nLinda 10.00 tot 18.00 uur\n\nDinsdag\nBurak vrij\nLinda 6.00 tot 14.00 uur\n\nWoensdag\nBurak 6.00 tot 14.00 uur\nLinda vrij\n\nDonderdag\nBurak 10.00 tot 18.00 uur\nLinda 6.00 tot 14.00 uur\n\nVrijdag\nBurak 6.00 tot 14.00 uur\nLinda 10.00 tot 18.00 uur\n\nLet op\nWil je een dienst ruilen? Regel dat zelf met een collega. Vertel het daarna altijd aan Henk. Ben je ziek? Bel Henk voor 5.30 uur.`,
    questions: [
      { q: 'Op welke dag werkt Burak van 10.00 tot 18.00 uur?', a: ['Donderdag', 'Maandag', 'Vrijdag'] },
      { q: 'Burak wil op woensdag vrij zijn. Wat moet hij doen?', a: ['Ruilen met een collega en het aan Henk vertellen', 'Henk vragen om een nieuw rooster', 'Niet komen en later bellen'] },
      { q: 'Burak is ziek. Wanneer moet hij bellen?', a: ['Voor 5.30 uur', 'Voor 6.00 uur', 'Voor 10.00 uur'] }
    ]
  },
  {
    id: 'l5', title: 'Buurtbarbecue', type: 'folder',
    text: `Buurtvereniging De Gors\nUitnodiging buurtbarbecue\n\nBeste buren,\n\nOp zaterdag 20 juni organiseren wij een barbecue voor de hele buurt. Iedereen is welkom, jong en oud. Het feest is op het grasveld bij de speeltuin in de Bloemstraat. We beginnen om 16.00 uur en stoppen om 21.00 uur.\n\nLeden van de buurtvereniging betalen 5 euro per persoon. Andere buren betalen 8 euro. Kinderen tot 12 jaar eten gratis mee. Er is ook vegetarisch eten en halal vlees.\n\nWilt u komen? Meld u dan voor 13 juni aan bij Petra op nummer 12. U kunt ook een briefje in haar brievenbus doen.\n\nNeem wel zelf een stoel mee.\n\nTot ziens!`,
    questions: [
      { q: 'Waar is de barbecue?', a: ['Op het grasveld bij de speeltuin', 'In het huis van Petra', 'In het buurthuis'] },
      { q: 'Hoeveel betaalt een kind van 8 jaar?', a: ['Niets', '5 euro', '8 euro'] },
      { q: 'Wat moet u zelf meenemen?', a: ['Een stoel', 'Vlees', 'Een bord'] }
    ]
  },
  {
    id: 'l6', title: 'Aanbiedingen in de supermarkt', type: 'advertentie',
    text: `Supermarkt De Molen\nAanbiedingen deze week\nGeldig van maandag tot en met zondag\n\nAppels, 1 kilo, van 2,49 voor 1,79 euro\nMelk, 2 pakken voor 2 euro\nVolkorenbrood, tweede brood gratis\nJonge kaas, 500 gram, 25 procent korting\nKoffie, alle soorten, 1 plus 1 gratis\n\nBij elke 10 euro aan boodschappen krijgt u 1 spaarzegel. Met een volle spaarkaart krijgt u een gratis pan.\n\nOp zondag is de winkel open van 12.00 tot 18.00 uur.\n\nKunt u niet naar de winkel komen? Bestel dan online. Bestelt u voor meer dan 50 euro? Dan bezorgen wij gratis.`,
    questions: [
      { q: 'U neemt twee pakken koffie. Voor hoeveel pakken betaalt u?', a: ['Voor één pak', 'Voor twee pakken', 'Voor geen pak'] },
      { q: 'Wanneer is de winkel op zondag open?', a: ['Van 12.00 tot 18.00 uur', 'Van 8.00 tot 18.00 uur', 'De winkel is op zondag dicht'] },
      { q: 'Wanneer bezorgt de winkel gratis?', a: ['Als u voor meer dan 50 euro bestelt', 'Als u een volle spaarkaart heeft', 'Als u op zondag bestelt'] }
    ]
  },
  {
    id: 'l7', title: 'Storing op het spoor', type: 'bericht',
    text: `Storing tussen Purmerend en Amsterdam Centraal\n\nDoor een kapotte trein rijden er vandaag minder treinen tussen Purmerend en Amsterdam Centraal. Er rijdt maar één trein per uur. De storing duurt waarschijnlijk tot 18.00 uur.\n\nWat kunt u doen?\nReist u naar Amsterdam? Neem dan de bus. Er rijden extra bussen van station Purmerend naar Amsterdam Centraal. U kunt in de bus betalen met uw OV-chipkaart of uw bankpas. U bent ongeveer 30 minuten langer onderweg.\n\nReist u naar Hoorn? Die treinen rijden wel normaal.\n\nKijk voordat u vertrekt in de reisplanner in de app. Daar staat altijd de laatste informatie.`,
    questions: [
      { q: 'Waarom rijden er minder treinen?', a: ['Er is een trein kapot', 'Er is slecht weer', 'Het personeel staakt'] },
      { q: 'Tot hoe laat duurt de storing waarschijnlijk?', a: ['Tot 18.00 uur', 'Tot 8.00 uur', 'Tot morgen'] },
      { q: 'U wilt naar Hoorn. Wat is waar?', a: ['De treinen naar Hoorn rijden normaal', 'U moet de bus nemen', 'Er rijdt één trein per uur naar Hoorn'] }
    ]
  },
  {
    id: 'l8', title: 'Afvalkalender', type: 'folder',
    text: `Afvalkalender wijk Weidevenne\n\nGroene container\nGroente, fruit en tuinafval. Elke twee weken op dinsdag.\n\nGrijze container\nRestafval. Elke twee weken op dinsdag, in de andere week.\n\nBlauwe container\nOud papier en karton. Elke vier weken op vrijdag.\n\nGlas\nBreng lege flessen en potten naar de glasbak bij het winkelcentrum.\n\nGrof afval\nHeeft u een oude bank of kast? Maak een afspraak met de gemeente. Wij halen het grof afval bij u thuis op. U kunt het ook zelf naar de milieustraat brengen.\n\nZet de container op de ophaaldag voor 7.30 uur aan de straat. Haal de container dezelfde dag weer weg.`,
    questions: [
      { q: 'Wat doet u met lege flessen?', a: ['Ik breng ze naar de glasbak', 'Ik doe ze in de grijze container', 'Ik doe ze in de blauwe container'] },
      { q: 'Hoe laat moet de container aan de straat staan?', a: ['Voor 7.30 uur', 'Na 7.30 uur', 'Om 9.00 uur'] },
      { q: 'U heeft een oude bank. Wat kunt u doen?', a: ['Een afspraak maken met de gemeente', 'De bank naast de container zetten', 'De bank in de grijze container doen'] }
    ]
  },
  {
    id: 'l9', title: 'De bibliotheek', type: 'website',
    text: `Bibliotheek Waterland\n\nLid worden\nKinderen tot 18 jaar zijn gratis lid. Volwassenen betalen een bedrag per jaar. U kunt lid worden aan de balie of op onze website. Neem een identiteitsbewijs mee.\n\nLenen\nU mag een boek drie weken lenen. Wilt u het boek langer houden? Verleng het dan via de website of de app. Brengt u het boek te laat terug? Dan betaalt u een boete.\n\nTaalhuis\nWilt u beter Nederlands leren? Kom dan naar het Taalhuis. Op dinsdag van 10.00 tot 12.00 uur en op woensdag van 19.00 tot 21.00 uur kunt u oefenen met een vrijwilliger. Dit is gratis. U hoeft zich niet aan te melden.\n\nOpeningstijden\nMaandag tot en met vrijdag 10.00 tot 18.00 uur\nZaterdag 10.00 tot 16.00 uur\nZondag gesloten`,
    questions: [
      { q: 'Hoe lang mag u een boek lenen?', a: ['Drie weken', 'Twee weken', 'Vier weken'] },
      { q: 'Wat is waar over het Taalhuis?', a: ['Het is gratis', 'U moet zich eerst aanmelden', 'Het is alleen op zaterdag'] },
      { q: 'Wat neemt u mee als u lid wordt?', a: ['Een identiteitsbewijs', 'Een pasfoto', 'Een brief van de gemeente'] }
    ]
  },
  {
    id: 'l10', title: 'Brief over de huur', type: 'brief',
    text: `Beste mevrouw Kaya,\n\nElk jaar kijken wij naar de huur van onze woningen. Vanaf 1 juli wordt uw huur hoger. Uw nieuwe huur is 712 euro per maand. Dat is 28 euro meer dan nu.\n\nBetaalt u de huur met een automatische incasso? Dan hoeft u niets te doen. Wij veranderen het bedrag zelf. Maakt u de huur elke maand zelf over? Verander dan het bedrag in uw bank-app.\n\nBent u het niet eens met de huurverhoging? Dan kunt u voor 1 juli bezwaar maken. Stuur ons een brief of vul het formulier in op onze website.\n\nHeeft u een laag inkomen? Misschien kunt u huurtoeslag krijgen. Kijk hiervoor op de website van de Belastingdienst.\n\nMet vriendelijke groet,\nWoonstichting Waterland`,
    questions: [
      { q: 'Vanaf wanneer betaalt mevrouw Kaya meer huur?', a: ['Vanaf 1 juli', 'Vanaf 1 januari', 'Vanaf volgende week'] },
      { q: 'Mevrouw Kaya maakt de huur elke maand zelf over. Wat moet zij doen?', a: ['Het nieuwe bedrag in haar bank-app zetten', 'Niets', 'Een formulier invullen op de website'] },
      { q: 'Hoeveel huur betaalt mevrouw Kaya nu?', a: ['684 euro per maand', '712 euro per maand', '740 euro per maand'] }
    ]
  },
  {
    id: 'l11', title: 'Badmintonclub zoekt leden', type: 'advertentie',
    text: `Badmintonclub De Shuttle zoekt nieuwe leden!\n\nWil je sporten en nieuwe mensen leren kennen? Kom dan badmintonnen bij De Shuttle. We spelen in sporthal De Beuk.\n\nJeugd van 8 tot 17 jaar\nWoensdag van 16.00 tot 17.30 uur\n\nVolwassenen\nMaandag en donderdag van 20.00 tot 22.00 uur\n\nJe mag drie keer gratis meedoen. Daarna kun je lid worden. De eerste keren kun je een racket van ons lenen. Neem wel sportkleding en schone zaalschoenen mee. Schoenen met zwarte zolen mogen niet in de zaal.\n\nMeer informatie? Mail naar info@deshuttle.nl of kom gewoon een keer langs.`,
    questions: [
      { q: 'Uw dochter is 12 jaar. Wanneer kan zij spelen?', a: ['Op woensdagmiddag', 'Op maandagavond', 'Op donderdagavond'] },
      { q: 'Wat moet u zelf meenemen?', a: ['Sportkleding en zaalschoenen', 'Een racket', 'Geld voor de eerste keer'] },
      { q: 'Wat is waar?', a: ['De eerste drie keer zijn gratis', 'U moet eerst lid worden', 'Alle schoenen mogen in de zaal'] }
    ]
  },
  {
    id: 'l12', title: 'Vacature schoonmaker', type: 'advertentie',
    text: `Vacature\nSchoonmaker, 24 uur per week\n\nWij zoeken een schoonmaker voor een groot kantoor in Purmerend.\n\nWat ga je doen?\nJe maakt de kantoren, de keuken en de toiletten schoon. Je werkt meestal alleen.\n\nWerktijden\nJe werkt vier avonden per week, van 17.00 tot 23.00 uur.\n\nWat vragen wij?\nJe bent betrouwbaar en je werkt netjes. Je spreekt een beetje Nederlands. Ervaring is niet nodig, wij leren je het werk.\n\nWat bieden wij?\nEen contract voor een jaar. Daarna krijg je misschien een vast contract. Je krijgt een goed salaris, vakantiegeld en reiskosten.\n\nInteresse? Stuur voor 30 april een e-mail met je cv naar vacature@schoonbedrijf.nl. Bellen mag ook, vraag dan naar Marco.`,
    questions: [
      { q: 'Hoeveel avonden per week werk je?', a: ['Vier', 'Vijf', 'Drie'] },
      { q: 'Wat is waar?', a: ['Je hoeft geen ervaring te hebben', 'Je moet heel goed Nederlands spreken', 'Je werkt overdag'] },
      { q: 'Je wilt deze baan. Wat kun je doen?', a: ['Een e-mail met je cv sturen', 'Op 30 april langskomen op kantoor', 'Een brief naar de gemeente schrijven'] }
    ]
  },
  {
    id: 'l13', title: 'Openingstijden zwembad', type: 'bord',
    text: `Zwembad De Waterlelie\nOpeningstijden\n\nBanenzwemmen\nMaandag tot en met vrijdag 7.00 tot 9.00 uur\n\nVrij zwemmen\nWoensdag 14.00 tot 17.00 uur\nZaterdag en zondag 10.00 tot 16.00 uur\n\nZwemles voor kinderen\nDinsdag en donderdag 16.00 tot 18.00 uur\n\nVrouwenzwemmen\nVrijdag 19.00 tot 21.00 uur\n\nIn de schoolvakanties zijn er andere tijden. Kijk op onze website.\n\nRegels\nKinderen onder de 10 jaar zonder zwemdiploma mogen alleen samen met een volwassene zwemmen. Douchen voor het zwemmen is verplicht.`,
    questions: [
      { q: 'U wilt vroeg in de ochtend banen zwemmen. Op welke dag kan dat?', a: ['Op dinsdag', 'Op zaterdag', 'Op zondag'] },
      { q: 'Wanneer is het vrouwenzwemmen?', a: ['Op vrijdagavond', 'Op woensdagmiddag', 'Op zaterdagochtend'] },
      { q: 'Uw zoon is 7 jaar en heeft geen zwemdiploma. Wat is waar?', a: ['Hij mag alleen met een volwassene zwemmen', 'Hij mag zonder volwassene zwemmen', 'Hij mag niet in het zwembad komen'] }
    ]
  },
  {
    id: 'l14', title: 'Bericht van de kinderopvang', type: 'e-mail',
    text: `Beste ouders,\n\nVanaf maandag 2 november gaat onze voordeur om 18.30 uur dicht. Haal uw kind dus op tijd op. Komt u later? Dan moet u extra betalen.\n\nHaalt iemand anders uw kind op, bijvoorbeeld opa of een buurvrouw? Vertel dat dan altijd van tevoren aan de pedagogisch medewerker. Wij geven uw kind niet mee aan iemand die wij niet kennen.\n\nIs uw kind ziek? Bel ons dan voor 8.00 uur. Kinderen met koorts mogen niet komen.\n\nOp vrijdag 18 december zijn wij gesloten. Ons team heeft dan een studiedag.\n\nVriendelijke groet,\nTeam Kinderdagverblijf Het Zonnetje`,
    questions: [
      { q: 'Hoe laat gaat de voordeur van het kinderdagverblijf dicht?', a: ['Om 18.30 uur', 'Om 18.00 uur', 'Om 8.00 uur'] },
      { q: 'De buurvrouw haalt uw kind op. Wat moet u doen?', a: ['Het van tevoren aan de medewerker vertellen', 'Niets', 'De buurvrouw een brief meegeven'] },
      { q: 'Wat is waar?', a: ['Op 18 december is het kinderdagverblijf dicht', 'Kinderen met koorts mogen komen', 'U mag later komen zonder extra te betalen'] }
    ]
  },
  {
    id: 'l15', title: 'Herinnering tandarts', type: 'bericht',
    text: `Tandartspraktijk Witte Lach\n\nBeste mevrouw Demir,\n\nDit is een herinnering voor uw controle bij tandarts Visser op donderdag 15 oktober om 14.15 uur.\n\nWilt u 5 minuten eerder komen? Neem ook uw zorgpas mee.\n\nKunt u niet komen? Bel dan minimaal 24 uur van tevoren af via 0299 412 233. Belt u niet af en komt u niet? Dan moet u de afspraak toch betalen.\n\nU hoeft niet op dit bericht te reageren.`,
    questions: [
      { q: 'Wanneer is de afspraak?', a: ['Donderdag 15 oktober om 14.15 uur', 'Donderdag 15 oktober om 14.45 uur', 'Dinsdag 15 oktober om 14.15 uur'] },
      { q: 'Wat moet mevrouw Demir meenemen?', a: ['Haar zorgpas', 'Haar paspoort', 'Geld'] },
      { q: 'Wat gebeurt er als zij niet afbelt en niet komt?', a: ['Zij moet de afspraak betalen', 'Zij krijgt een gratis nieuwe afspraak', 'Er gebeurt niets'] }
    ]
  },
  {
    id: 'l16', title: 'Brief van het energiebedrijf', type: 'brief',
    text: `Beste meneer Öztürk,\n\nElk jaar maken wij uw jaarafrekening. Daarvoor hebben wij de meterstanden van uw gas en stroom nodig.\n\nHeeft u een slimme meter? Dan hoeft u niets te doen. Wij lezen de meter zelf op afstand uit.\n\nHeeft u geen slimme meter? Geef dan voor 15 januari uw meterstanden door. Dat kan in onze app of op onze website. U heeft hiervoor uw klantnummer nodig. Dat staat bovenaan deze brief.\n\nGeeft u de meterstanden niet door? Dan maken wij zelf een schatting. Uw rekening is dan misschien te hoog.\n\nGaat u verhuizen? Geef dat dan minimaal vijf werkdagen van tevoren aan ons door.\n\nMet vriendelijke groet,\nKlantenservice Energie Noord`,
    questions: [
      { q: 'Meneer Öztürk heeft geen slimme meter. Wat moet hij doen?', a: ['Zijn meterstanden doorgeven', 'Een slimme meter kopen', 'Een afspraak maken met een monteur'] },
      { q: 'Waar vindt meneer Öztürk zijn klantnummer?', a: ['Bovenaan de brief', 'Op de meter', 'In de app van zijn bank'] },
      { q: 'Wat gebeurt er als hij niets doorgeeft?', a: ['Het energiebedrijf maakt een schatting', 'Hij krijgt geen rekening', 'Het gas wordt afgesloten'] }
    ]
  }
];

const LUISTEREN = [
  {
    id: 'u1', title: 'Bij de huisarts', setting: 'Telefoongesprek met de assistente van de huisarts',
    lines: [
      { s: 'Assistente', g: 'f', t: 'Huisartsenpraktijk De Linde, goedemorgen. U spreekt met Anouk.' },
      { s: 'Ahmet', g: 'm', t: 'Goedemorgen, met Ahmet Yilmaz. Ik wil graag een afspraak maken met dokter Bakker.' },
      { s: 'Assistente', g: 'f', t: 'Wat zijn uw klachten?' },
      { s: 'Ahmet', g: 'm', t: 'Ik heb al een week veel pijn in mijn rug. Ik kan bijna niet zitten op mijn werk.' },
      { s: 'Assistente', g: 'f', t: 'Dat is vervelend. Dokter Bakker is vandaag helaas vol. Kunt u morgen om 10.15 uur komen?' },
      { s: 'Ahmet', g: 'm', t: 'Morgen om 10.15 uur, ja, dat is goed.' },
      { s: 'Assistente', g: 'f', t: 'Wat is uw geboortedatum?' },
      { s: 'Ahmet', g: 'm', t: '12 maart 1988.' },
      { s: 'Assistente', g: 'f', t: 'Dank u wel. Wilt u ook een lijst meenemen met de medicijnen die u nu gebruikt?' },
      { s: 'Ahmet', g: 'm', t: 'Ja, dat doe ik. Tot morgen.' }
    ],
    questions: [
      { q: 'Waarom belt Ahmet?', a: ['Hij heeft pijn in zijn rug', 'Hij heeft koorts', 'Hij heeft nieuwe medicijnen nodig'] },
      { q: 'Wanneer kan Ahmet komen?', a: ['Morgen om 10.15 uur', 'Vandaag om 10.15 uur', 'Morgen om 11.15 uur'] },
      { q: 'Wat moet Ahmet meenemen?', a: ['Een lijst met zijn medicijnen', 'Zijn zorgpas', 'Een brief van zijn werk'] }
    ]
  },
  {
    id: 'u2', title: 'Bij de apotheek', setting: 'Sevda haalt medicijnen op bij de apotheek',
    lines: [
      { s: 'Apothekersassistente', g: 'f', t: 'Goedemiddag, kan ik u helpen?' },
      { s: 'Sevda', g: 'f', t: 'Goedemiddag. Ik kom medicijnen ophalen voor mijn zoon. De huisarts heeft een recept gestuurd.' },
      { s: 'Apothekersassistente', g: 'f', t: 'Wat is de naam en de geboortedatum van uw zoon?' },
      { s: 'Sevda', g: 'f', t: 'Emir Aydın, 4 juni 2019.' },
      { s: 'Apothekersassistente', g: 'f', t: 'Ja, ik zie het. Het is een drankje tegen het hoesten. Uw zoon moet het drie keer per dag nemen, na het eten.' },
      { s: 'Sevda', g: 'f', t: 'Hoe lang moet hij het nemen?' },
      { s: 'Apothekersassistente', g: 'f', t: 'Een week. Is het na een week niet beter? Bel dan de huisarts.' },
      { s: 'Sevda', g: 'f', t: 'Goed, dank u wel.' }
    ],
    questions: [
      { q: 'Hoe vaak moet Emir het drankje nemen?', a: ['Drie keer per dag', 'Twee keer per dag', 'Eén keer per dag'] },
      { q: 'Wat moet Sevda doen als het na een week niet beter is?', a: ['De huisarts bellen', 'Terug naar de apotheek gaan', 'Een nieuw drankje kopen'] }
    ]
  },
  {
    id: 'u3', title: 'Aan het loket van de gemeente', setting: 'Burak geeft zijn nieuwe adres door bij de gemeente',
    lines: [
      { s: 'Medewerker', g: 'f', t: 'Goedemorgen, welkom bij de gemeente. Heeft u een afspraak?' },
      { s: 'Burak', g: 'm', t: 'Ja, om 9.30 uur. Ik ben verhuisd en ik wil mijn nieuwe adres doorgeven.' },
      { s: 'Medewerker', g: 'f', t: 'Mag ik uw identiteitsbewijs zien?' },
      { s: 'Burak', g: 'm', t: 'Ja, hier is mijn paspoort.' },
      { s: 'Medewerker', g: 'f', t: 'Dank u. Wanneer bent u verhuisd?' },
      { s: 'Burak', g: 'm', t: 'Afgelopen zaterdag. Mijn vrouw geeft haar nieuwe adres zelf online door, met haar DigiD.' },
      { s: 'Medewerker', g: 'f', t: 'Prima. Heeft u een huurcontract bij u?' },
      { s: 'Burak', g: 'm', t: 'Ja, hier is het.' },
      { s: 'Medewerker', g: 'f', t: 'Dank u. Ik zet uw nieuwe adres in het systeem. U krijgt binnen een week een brief met een bevestiging.' }
    ],
    questions: [
      { q: 'Waarom is Burak bij de gemeente?', a: ['Hij wil zijn nieuwe adres doorgeven', 'Hij wil een nieuw paspoort', 'Hij wil een huurcontract tekenen'] },
      { q: 'Hoe geeft de vrouw van Burak haar adres door?', a: ['Online met haar DigiD', 'Aan het loket', 'Met een brief'] },
      { q: 'Wat krijgt Burak binnen een week?', a: ['Een brief met een bevestiging', 'Een nieuw paspoort', 'Een DigiD'] }
    ]
  },
  {
    id: 'u4', title: 'Ziekmelden', setting: 'Fatma belt haar leidinggevende',
    lines: [
      { s: 'Marco', g: 'm', t: 'Met Marco van Bakkerij Van Dam.' },
      { s: 'Fatma', g: 'f', t: 'Hoi Marco, met Fatma. Ik bel om me ziek te melden.' },
      { s: 'Marco', g: 'm', t: 'O, wat vervelend. Wat is er aan de hand?' },
      { s: 'Fatma', g: 'f', t: 'Ik heb hoge koorts en ik ben erg moe. Vannacht was ik ook misselijk.' },
      { s: 'Marco', g: 'm', t: 'Dan moet je zeker thuisblijven. Weet je al hoe lang je thuis moet blijven?' },
      { s: 'Fatma', g: 'f', t: 'Nee, dat weet ik nog niet. Morgen ga ik naar de huisarts.' },
      { s: 'Marco', g: 'm', t: 'Goed. Bel je me morgen na de huisarts? Dan kan ik het rooster aanpassen.' },
      { s: 'Fatma', g: 'f', t: 'Ja, dat doe ik.' },
      { s: 'Marco', g: 'm', t: 'Dan vraag ik Linda voor je dienst van vandaag. Beterschap, Fatma.' },
      { s: 'Fatma', g: 'f', t: 'Dank je wel. Doei.' }
    ],
    questions: [
      { q: 'Wat heeft Fatma?', a: ['Hoge koorts', 'Pijn in haar rug', 'Pijn in haar buik'] },
      { q: 'Wat moet Fatma morgen doen?', a: ['Marco bellen na de huisarts', 'Weer gaan werken', 'Linda bellen'] }
    ]
  },
  {
    id: 'u5', title: 'Afspraak met de juf', setting: 'Mehmet belt de basisschool van zijn dochter',
    lines: [
      { s: 'Juf Ellen', g: 'f', t: 'Basisschool De Regenboog, met juf Ellen.' },
      { s: 'Mehmet', g: 'm', t: 'Goedemiddag, met Mehmet Şahin, de vader van Elif uit groep 6. Ik wil graag een afspraak met u maken.' },
      { s: 'Juf Ellen', g: 'f', t: 'Natuurlijk. Waar wilt u over praten?' },
      { s: 'Mehmet', g: 'm', t: 'Elif vindt rekenen erg moeilijk. Soms huilt ze als ze huiswerk maakt.' },
      { s: 'Juf Ellen', g: 'f', t: 'Goed dat u belt. Ik zie ook dat ze het moeilijk vindt. Kunt u volgende week dinsdag na school komen, om 15.15 uur?' },
      { s: 'Mehmet', g: 'm', t: 'Op dinsdag werk ik tot 17.00 uur. Kan het ook op woensdag?' },
      { s: 'Juf Ellen', g: 'f', t: 'Op woensdag zijn de kinderen om 12.30 uur vrij. Kunt u om 13.00 uur?' },
      { s: 'Mehmet', g: 'm', t: 'Ja, dat is goed. Mag mijn vrouw ook mee?' },
      { s: 'Juf Ellen', g: 'f', t: 'Ja hoor, graag zelfs. Tot woensdag.' }
    ],
    questions: [
      { q: 'Waarom belt Mehmet?', a: ['Elif vindt rekenen moeilijk', 'Elif is ziek', 'Elif wil naar een andere groep'] },
      { q: 'Wanneer is de afspraak?', a: ['Woensdag om 13.00 uur', 'Dinsdag om 15.15 uur', 'Woensdag om 12.30 uur'] }
    ]
  },
  {
    id: 'u6', title: 'Op het station', setting: 'Omroepbericht op het station',
    lines: [
      { s: 'Omroepster', g: 'f', t: 'Attentie, reizigers voor de trein naar Amsterdam Centraal, vertrektijd 14.12 uur.' },
      { s: 'Omroepster', g: 'f', t: 'Deze trein vertrekt vandaag niet van spoor 2, maar van spoor 4.' },
      { s: 'Omroepster', g: 'f', t: 'De trein heeft ongeveer tien minuten vertraging.' },
      { s: 'Omroepster', g: 'f', t: 'Reizigers naar Schiphol stappen over in Amsterdam Sloterdijk.' },
      { s: 'Omroepster', g: 'f', t: 'Onze excuses voor het ongemak.' }
    ],
    questions: [
      { q: 'Van welk spoor vertrekt de trein?', a: ['Spoor 4', 'Spoor 2', 'Spoor 14'] },
      { q: 'Hoe laat vertrekt de trein ongeveer?', a: ['Om 14.22 uur', 'Om 14.12 uur', 'Om 14.02 uur'] },
      { q: 'Wat moeten reizigers naar Schiphol doen?', a: ['Overstappen in Amsterdam Sloterdijk', 'Een trein nemen van spoor 2', 'Wachten op de bus'] }
    ]
  },
  {
    id: 'u7', title: 'Een jas ruilen', setting: 'Hasan is in een kledingwinkel',
    lines: [
      { s: 'Verkoopster', g: 'f', t: 'Goedemiddag, kan ik u helpen?' },
      { s: 'Hasan', g: 'm', t: 'Ja, ik heb vorige week deze jas gekocht. Hij is te klein. Kan ik hem ruilen?' },
      { s: 'Verkoopster', g: 'f', t: 'Heeft u de kassabon nog?' },
      { s: 'Hasan', g: 'm', t: 'Ja, hier is de bon.' },
      { s: 'Verkoopster', g: 'f', t: 'Dank u. Welke maat heeft u nodig?' },
      { s: 'Hasan', g: 'm', t: 'Een maat groter, dus een L.' },
      { s: 'Verkoopster', g: 'f', t: 'Ik kijk even. Sorry, deze jas hebben we niet meer in maat L. Wel in het blauw, in maat L. U kunt ook uw geld terugkrijgen.' },
      { s: 'Hasan', g: 'm', t: 'Blauw vind ik niet mooi. Dan wil ik graag mijn geld terug.' },
      { s: 'Verkoopster', g: 'f', t: 'Dat kan. Ik zet het geld terug op uw bankpas.' }
    ],
    questions: [
      { q: 'Wat is het probleem met de jas?', a: ['Hij is te klein', 'Hij is kapot', 'Hij is te groot'] },
      { q: 'Wat doet Hasan uiteindelijk?', a: ['Hij krijgt zijn geld terug', 'Hij neemt een blauwe jas', 'Hij neemt een jas in maat M'] }
    ]
  },
  {
    id: 'u8', title: 'De buurman', setting: 'Buurman Peter staat bij Ayşe voor de deur',
    lines: [
      { s: 'Peter', g: 'm', t: 'Hallo, ik ben Peter van nummer 14. Mag ik even iets vragen?' },
      { s: 'Ayşe', g: 'f', t: 'Hallo Peter. Ja, natuurlijk. Kom binnen.' },
      { s: 'Peter', g: 'm', t: 'Nee hoor, het is maar kort. Gisteravond hoorde ik tot half één harde muziek. Ik moet heel vroeg op voor mijn werk.' },
      { s: 'Ayşe', g: 'f', t: 'O, sorry! Mijn zoon had vrienden op bezoek. Ik wist niet dat het zo hard was.' },
      { s: 'Peter', g: 'm', t: 'Eén keer is niet erg. Maar na tien uur in de avond wil ik graag slapen.' },
      { s: 'Ayşe', g: 'f', t: 'Dat begrijp ik. Ik zeg het tegen mijn zoon. Het gebeurt niet meer.' },
      { s: 'Peter', g: 'm', t: 'Dank je wel. En zeg het de volgende keer gewoon even als er een feestje is.' },
      { s: 'Ayşe', g: 'f', t: 'Dat doe ik. Nogmaals sorry.' }
    ],
    questions: [
      { q: 'Waarom komt Peter langs?', a: ['Hij had last van harde muziek', 'Hij wil een feestje geven', 'Hij zoekt zijn kat'] },
      { q: 'Wat gaat Ayşe doen?', a: ['Ze praat met haar zoon', 'Ze gaat verhuizen', 'Ze nodigt Peter uit voor een feestje'] }
    ]
  },
  {
    id: 'u9', title: 'Een sollicitatiegesprek', setting: 'Yusuf heeft een sollicitatiegesprek bij een bedrijf',
    lines: [
      { s: 'Mevrouw Jansen', g: 'f', t: 'Goedemorgen, welkom. Gaat u zitten. U solliciteert naar de baan in ons magazijn?' },
      { s: 'Yusuf', g: 'm', t: 'Ja, dat klopt. Dank u wel.' },
      { s: 'Mevrouw Jansen', g: 'f', t: 'Kunt u iets over uzelf vertellen?' },
      { s: 'Yusuf', g: 'm', t: 'Ik ben Yusuf en ik ben 34 jaar. Ik woon nu vier jaar in Purmerend. In Turkije heb ik acht jaar in een magazijn gewerkt.' },
      { s: 'Mevrouw Jansen', g: 'f', t: 'Mooi. Heeft u een heftruckcertificaat?' },
      { s: 'Yusuf', g: 'm', t: 'Nee, nog niet. Maar ik wil het graag halen.' },
      { s: 'Mevrouw Jansen', g: 'f', t: 'Dat is goed. Wij betalen de cursus. Kunt u ook in het weekend werken?' },
      { s: 'Yusuf', g: 'm', t: 'Op zaterdag wel, op zondag liever niet.' },
      { s: 'Mevrouw Jansen', g: 'f', t: 'Prima. U hoort vrijdag van ons.' }
    ],
    questions: [
      { q: 'Hoe lang heeft Yusuf in een magazijn gewerkt?', a: ['Acht jaar', 'Vier jaar', 'Drie jaar'] },
      { q: 'Wat is waar?', a: ['Het bedrijf betaalt de cursus', 'Yusuf heeft al een heftruckcertificaat', 'Yusuf wil graag op zondag werken'] },
      { q: 'Wanneer hoort Yusuf meer?', a: ['Op vrijdag', 'Op zaterdag', 'Op maandag'] }
    ]
  },
  {
    id: 'u10', title: 'Een uitnodiging', setting: 'Saskia belt haar vriend Burak',
    lines: [
      { s: 'Saskia', g: 'f', t: 'Hoi Burak, met Saskia.' },
      { s: 'Burak', g: 'm', t: 'Hoi Saskia, hoe gaat het?' },
      { s: 'Saskia', g: 'f', t: 'Goed! Volgende week zaterdag word ik veertig. Ik geef een feestje bij mij thuis. Kom je ook, met Esra en de kinderen?' },
      { s: 'Burak', g: 'm', t: 'Leuk! Hoe laat begint het?' },
      { s: 'Saskia', g: 'f', t: 'Om drie uur in de middag. Eerst koffie en taart, daarna gaan we barbecueën.' },
      { s: 'Burak', g: 'm', t: 'Wat gezellig. Moeten we iets meenemen?' },
      { s: 'Saskia', g: 'f', t: 'Nee hoor. Maar als je wilt, mag je een salade maken. Jouw Turkse salade is zo lekker.' },
      { s: 'Burak', g: 'm', t: 'Dat doe ik. We komen graag!' }
    ],
    questions: [
      { q: 'Hoe oud wordt Saskia?', a: ['Veertig jaar', 'Dertig jaar', 'Vijftig jaar'] },
      { q: 'Wat neemt Burak mee?', a: ['Een salade', 'Een taart', 'Vlees voor de barbecue'] }
    ]
  },
  {
    id: 'u11', title: 'Omleiding van de bus', setting: 'De buschauffeur doet een mededeling',
    lines: [
      { s: 'Chauffeur', g: 'm', t: 'Goedemiddag dames en heren, hier spreekt uw chauffeur.' },
      { s: 'Chauffeur', g: 'm', t: 'Door werkzaamheden aan de weg rijdt deze bus vandaag niet over de Gorslaan.' },
      { s: 'Chauffeur', g: 'm', t: 'De haltes Gorslaan en Bloemstraat vervallen.' },
      { s: 'Chauffeur', g: 'm', t: 'Wilt u naar de Bloemstraat? Stap dan uit bij de halte Winkelcentrum. Vanaf daar is het vijf minuten lopen.' },
      { s: 'Chauffeur', g: 'm', t: 'De omleiding duurt tot en met vrijdag.' },
      { s: 'Chauffeur', g: 'm', t: 'Excuses voor het ongemak en nog een fijne dag.' }
    ],
    questions: [
      { q: 'Waarom rijdt de bus een andere route?', a: ['Er wordt aan de weg gewerkt', 'Er is een ongeluk gebeurd', 'De bus is kapot'] },
      { q: 'U wilt naar de Bloemstraat. Waar stapt u uit?', a: ['Bij de halte Winkelcentrum', 'Bij de halte Gorslaan', 'Bij de halte Bloemstraat'] },
      { q: 'Tot wanneer duurt de omleiding?', a: ['Tot en met vrijdag', 'Tot vanavond', 'Tot het eind van de maand'] }
    ]
  },
  {
    id: 'u12', title: 'De cv-ketel is kapot', setting: 'Kemal belt de klantenservice voor een monteur',
    lines: [
      { s: 'Medewerker', g: 'f', t: 'Klantenservice Warmtezorg, met Sandra.' },
      { s: 'Kemal', g: 'm', t: 'Goedemorgen, met Kemal Doğan. Mijn cv-ketel doet het niet. Ik heb geen warm water en de verwarming is koud.' },
      { s: 'Medewerker', g: 'f', t: 'Vervelend. Heeft u de ketel al uitgezet en weer aangezet?' },
      { s: 'Kemal', g: 'm', t: 'Ja, twee keer. Het helpt niet.' },
      { s: 'Medewerker', g: 'f', t: 'Dan stuur ik een monteur. Hij kan morgen tussen 8.00 en 12.00 uur komen. Is er dan iemand thuis?' },
      { s: 'Kemal', g: 'm', t: 'Morgenochtend moet ik werken, maar mijn vrouw is thuis.' },
      { s: 'Medewerker', g: 'f', t: 'Prima. De monteur belt een half uur voordat hij komt. Op welk nummer?' },
      { s: 'Kemal', g: 'm', t: 'Op het nummer van mijn vrouw, 06 12345678.' }
    ],
    questions: [
      { q: 'Wat is het probleem?', a: ['Er is geen warm water en de verwarming is koud', 'De ketel maakt veel lawaai', 'Er lekt water uit de ketel'] },
      { q: 'Wanneer komt de monteur?', a: ['Morgenochtend', 'Vanmiddag', 'Morgenmiddag'] },
      { q: 'Wie is thuis als de monteur komt?', a: ['De vrouw van Kemal', 'Kemal', 'De buurman'] }
    ]
  },
  {
    id: 'u13', title: 'Voicemail van de bibliotheek', setting: 'Nadia luistert naar een bericht op haar voicemail',
    lines: [
      { s: 'Medewerker', g: 'f', t: 'Goedemiddag, dit is een bericht voor mevrouw El Amrani van Bibliotheek Waterland.' },
      { s: 'Medewerker', g: 'f', t: 'U heeft een boek gereserveerd. Het boek ligt nu voor u klaar.' },
      { s: 'Medewerker', g: 'f', t: 'U kunt het ophalen bij de balie. Neem uw bibliotheekpas mee.' },
      { s: 'Medewerker', g: 'f', t: 'Het boek blijft een week voor u liggen. Daarna gaat het naar de volgende persoon.' },
      { s: 'Medewerker', g: 'f', t: 'Heeft u vragen? Bel dan naar 0299 123 456. Fijne dag!' }
    ],
    questions: [
      { q: 'Waarom belt de bibliotheek?', a: ['Haar boek ligt klaar', 'Zij heeft een boek te laat teruggebracht', 'Haar pas is niet meer geldig'] },
      { q: 'Hoe lang blijft het boek voor haar liggen?', a: ['Een week', 'Een dag', 'Een maand'] },
      { q: 'Wat moet zij meenemen?', a: ['Haar bibliotheekpas', 'Haar paspoort', 'Geld'] }
    ]
  },
  {
    id: 'u14', title: 'Ophalen bij de kinderopvang', setting: 'Can haalt zijn nichtje op bij het kinderdagverblijf',
    lines: [
      { s: 'Medewerker', g: 'f', t: 'Hallo, bent u de vader van Mila?' },
      { s: 'Can', g: 'm', t: 'Nee, ik ben haar oom, Can. Haar moeder moet langer werken. Ik kom Mila ophalen.' },
      { s: 'Medewerker', g: 'f', t: 'Sorry, maar ik wist niet dat u zou komen. Haar moeder heeft niets gezegd.' },
      { s: 'Can', g: 'm', t: 'O. Heeft ze geen bericht gestuurd?' },
      { s: 'Medewerker', g: 'f', t: 'Nee. Wij geven kinderen alleen mee aan mensen die wij kennen. Mag ik haar moeder even bellen?' },
      { s: 'Can', g: 'm', t: 'Ja natuurlijk, ik wacht wel.' },
      { s: 'Medewerker', g: 'f', t: 'Ik heb haar gesproken. Het is goed, u mag Mila meenemen. Maar de volgende keer moet ze het van tevoren in de app zetten.' },
      { s: 'Can', g: 'm', t: 'Dat zeg ik tegen haar. Dank u wel.' }
    ],
    questions: [
      { q: 'Wie haalt Mila op?', a: ['Haar oom', 'Haar vader', 'Haar opa'] },
      { q: 'Wat doet de medewerker eerst?', a: ['Ze belt de moeder van Mila', 'Ze geeft Mila meteen mee', 'Ze stuurt Can weg'] }
    ]
  },
  {
    id: 'u15', title: 'Het weerbericht', setting: 'Weerbericht op de radio',
    lines: [
      { s: 'Weerman', g: 'm', t: 'Goedemorgen, hier is het weerbericht voor vandaag.' },
      { s: 'Weerman', g: 'm', t: 'Vanochtend is het nog droog en af en toe schijnt de zon.' },
      { s: 'Weerman', g: 'm', t: 'In de middag komt er regen uit het westen. In het noorden kan het ook onweren.' },
      { s: 'Weerman', g: 'm', t: 'Het wordt ongeveer 14 graden en er staat een harde wind.' },
      { s: 'Weerman', g: 'm', t: 'Morgen is het weer droog en zonnig, met 17 graden.' },
      { s: 'Weerman', g: 'm', t: 'Gaat u vanmiddag naar buiten? Neem dan een paraplu mee.' }
    ],
    questions: [
      { q: 'Wanneer gaat het regenen?', a: ['Vanmiddag', 'Vanochtend', 'Morgen'] },
      { q: 'Hoe warm wordt het morgen?', a: ['17 graden', '14 graden', '7 graden'] }
    ]
  },
  {
    id: 'u16', title: 'Pijn aan een tand', setting: 'Zeynep belt de tandarts voor haar dochter',
    lines: [
      { s: 'Assistente', g: 'f', t: 'Tandartspraktijk Witte Lach, goedemiddag.' },
      { s: 'Zeynep', g: 'f', t: 'Goedemiddag, met Zeynep Arslan. Mijn dochter heeft veel pijn aan haar tand. Kan ze vandaag nog komen?' },
      { s: 'Assistente', g: 'f', t: 'Hoe oud is uw dochter?' },
      { s: 'Zeynep', g: 'f', t: 'Ze is negen.' },
      { s: 'Assistente', g: 'f', t: 'Heeft ze ook koorts of een dikke wang?' },
      { s: 'Zeynep', g: 'f', t: 'Nee, ze heeft alleen pijn als ze eet of drinkt.' },
      { s: 'Assistente', g: 'f', t: 'De tandarts heeft vandaag om 16.40 uur nog plek. Kan dat?' },
      { s: 'Zeynep', g: 'f', t: 'Ja, dat lukt. Om drie uur is ze uit school.' },
      { s: 'Assistente', g: 'f', t: 'Goed. Geef haar eventueel paracetamol tegen de pijn. Tot straks.' }
    ],
    questions: [
      { q: 'Wat is het probleem?', a: ['De dochter heeft pijn aan haar tand', 'De dochter heeft koorts', 'De dochter heeft een dikke wang'] },
      { q: 'Hoe laat is de afspraak?', a: ['Om 16.40 uur', 'Om 15.00 uur', 'Om 14.40 uur'] }
    ]
  }
];

const SCHRIJVEN = [
  {
    id: 's1', kind: 'formulier', title: 'Aanmelden bij de bibliotheek',
    prompt: 'U wilt lid worden van de bibliotheek. Vul het formulier in.',
    tr: 'Kütüphaneye üye olmak istiyorsun. Formu doldur.',
    fields: [
      { label: 'Voornaam', hint: 'bijvoorbeeld Burak' },
      { label: 'Achternaam', hint: 'bijvoorbeeld Yilmaz' },
      { label: 'Geboortedatum', hint: 'dag, maand en jaar' },
      { label: 'Adres', hint: 'straat en huisnummer' },
      { label: 'Postcode en woonplaats', hint: 'bijvoorbeeld 1441 AB Purmerend' },
      { label: 'E-mailadres', hint: 'bijvoorbeeld naam@mail.nl' },
      { label: 'Waarom wilt u lid worden?', hint: 'Schrijf een hele zin.', long: true },
      { label: 'Wat voor boeken leest u graag?', hint: 'Schrijf een hele zin.', long: true }
    ],
    points: [],
    model: 'Voornaam\nBurak\nAchternaam\nYilmaz\nGeboortedatum\n15 april 1990\nAdres\nKerkstraat 12\nPostcode en woonplaats\n1441 AB Purmerend\nE-mailadres\nburak.yilmaz@mail.nl\nWaarom wilt u lid worden?\nIk wil beter Nederlands leren. Ik wil ook boeken lenen voor mijn kinderen.\nWat voor boeken leest u graag?\nIk lees graag makkelijke boeken over geschiedenis en over reizen.'
  },
  {
    id: 's2', kind: 'formulier', title: 'Inschrijven bij de huisarts',
    prompt: 'U bent net verhuisd. U wilt zich inschrijven bij een nieuwe huisarts. Vul het formulier in.',
    tr: 'Yeni taşındın ve yeni bir huisarts\'a kaydolmak istiyorsun. Formu doldur.',
    fields: [
      { label: 'Naam', hint: 'voornaam en achternaam' },
      { label: 'Geboortedatum', hint: 'dag, maand en jaar' },
      { label: 'Adres', hint: 'straat, huisnummer en woonplaats' },
      { label: 'Telefoonnummer', hint: 'bijvoorbeeld 06 12345678' },
      { label: 'Zorgverzekeraar', hint: 'de naam van uw verzekering' },
      { label: 'Naam vorige huisarts', hint: 'naam en woonplaats' },
      { label: 'Gebruikt u medicijnen? Welke?', hint: 'Schrijf een hele zin.', long: true },
      { label: 'Waarom kiest u voor deze praktijk?', hint: 'Schrijf een hele zin.', long: true }
    ],
    points: [],
    model: 'Naam\nFatma Kaya\nGeboortedatum\n3 februari 1987\nAdres\nKerkstraat 12, Purmerend\nTelefoonnummer\n06 12345678\nZorgverzekeraar\nZorgverzekering Noord\nNaam vorige huisarts\nDokter Smit in Zaandam\nGebruikt u medicijnen? Welke?\nJa, ik neem elke dag een tablet voor mijn bloeddruk.\nWaarom kiest u voor deze praktijk?\nDe praktijk is dicht bij mijn huis. Ik kan lopend naar de praktijk komen.'
  },
  {
    id: 's3', kind: 'formulier', title: 'Aanmelden voor zwemles',
    prompt: 'Uw kind moet leren zwemmen. U meldt uw kind aan voor zwemles. Vul het formulier in.',
    tr: 'Çocuğunun yüzme öğrenmesi lazım. Onu yüzme kursuna yazdırıyorsun. Formu doldur.',
    fields: [
      { label: 'Naam kind', hint: 'voornaam en achternaam' },
      { label: 'Geboortedatum kind', hint: 'dag, maand en jaar' },
      { label: 'Naam ouder', hint: 'uw voornaam en achternaam' },
      { label: 'Telefoonnummer', hint: 'bijvoorbeeld 06 12345678' },
      { label: 'Welke dag past het best?', hint: 'dinsdag of donderdag' },
      { label: 'Kan uw kind al een beetje zwemmen?', hint: 'Schrijf een hele zin.', long: true },
      { label: 'Heeft uw kind een allergie of ziekte?', hint: 'Schrijf een hele zin.', long: true }
    ],
    points: [],
    model: 'Naam kind\nEmir Aydın\nGeboortedatum kind\n4 juni 2019\nNaam ouder\nSevda Aydın\nTelefoonnummer\n06 23456789\nWelke dag past het best?\nDonderdag\nKan uw kind al een beetje zwemmen?\nNee, hij kan nog niet zwemmen. Maar hij speelt wel graag in het water.\nHeeft uw kind een allergie of ziekte?\nNee, hij heeft geen allergie en hij is gezond.'
  },
  {
    id: 's4', kind: 'formulier', title: 'Melding aan de gemeente',
    prompt: 'Bij u in de straat is een lantaarnpaal kapot. Het is in de avond erg donker. U doet een melding bij de gemeente. Vul het formulier in.',
    tr: 'Sokağındaki bir sokak lambası bozuk, akşamları ortalık zifiri karanlık. Bunu gemeente\'ye bildiriyorsun. Formu doldur.',
    fields: [
      { label: 'Naam', hint: 'voornaam en achternaam' },
      { label: 'Telefoonnummer', hint: 'bijvoorbeeld 06 12345678' },
      { label: 'Waar is het probleem?', hint: 'straat en huisnummer' },
      { label: 'Sinds wanneer is er een probleem?', hint: 'bijvoorbeeld sinds maandag' },
      { label: 'Wat is het probleem?', hint: 'Schrijf een of twee hele zinnen.', long: true },
      { label: 'Wat wilt u dat de gemeente doet?', hint: 'Schrijf een hele zin.', long: true }
    ],
    points: [],
    model: 'Naam\nHasan Demir\nTelefoonnummer\n06 34567890\nWaar is het probleem?\nTegenover Bloemstraat 25 in Purmerend\nSinds wanneer is er een probleem?\nSinds vorige week vrijdag\nWat is het probleem?\nDe lantaarnpaal doet het niet meer. In de avond is het heel donker op straat en dat is gevaarlijk.\nWat wilt u dat de gemeente doet?\nIk wil graag dat de gemeente de lamp snel repareert.'
  },
  {
    id: 's5', kind: 'bericht', title: 'Ziekmelden bij uw werk',
    prompt: 'U bent ziek. U kunt vandaag niet werken. Schrijf een e-mail aan uw leidinggevende, meneer De Boer. Zeg dat u ziek bent. Vertel wat u heeft. Zeg wanneer u denkt dat u weer kunt werken.',
    tr: 'Hastasın, bugün işe gidemiyorsun. Şefin De Boer Bey\'e bir e-posta yaz. Hasta olduğunu söyle ve neyin olduğunu anlat. Ne zaman işe dönebileceğini düşündüğünü de yaz.',
    fields: [],
    points: [
      { label: 'Aanhef', tr: 'Hitapla başla', re: 'beste|hallo|hoi|geachte|lieve|\\bdag\\b' },
      { label: 'Ziek melden', tr: 'Hasta olduğunu söyle', re: 'ziek|niet (komen|werken)|kan niet' },
      { label: 'Klacht', tr: 'Neyin olduğunu yaz', re: 'koorts|pijn|griep|verkou|misselijk|hoest|overgeven|duizelig|moe|keel|buik|hoofd' },
      { label: 'Wanneer weer werken', tr: 'Ne zaman döneceğini yaz', re: 'morgen|overmorgen|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|week|dag(en)?\\b|weer|terug|beter' },
      { label: 'Afsluiting', tr: 'Kapanışla bitir', re: 'groet|groeten|tot|dank|bedankt' }
    ],
    min: 35,
    model: 'Beste meneer De Boer,\n\nIk ben vandaag helaas ziek. Ik heb hoge koorts en hoofdpijn. Vannacht heb ik ook slecht geslapen. Daarom kan ik vandaag niet komen werken. Vanmiddag ga ik naar de huisarts. Ik denk dat ik over twee dagen weer kan werken. Morgen bel ik u om te vertellen hoe het gaat.\n\nMet vriendelijke groet,\nBurak Yilmaz'
  },
  {
    id: 's6', kind: 'bericht', title: 'Briefje aan de buren',
    prompt: 'Uw zoon wordt tien jaar. U geeft zaterdag een feest in de tuin. Schrijf een briefje aan de buren. Vertel wanneer het feest is. Zeg dat er misschien lawaai is. Vertel hoe laat het feest stopt. Geef uw telefoonnummer.',
    tr: 'Oğlun on yaşına giriyor ve cumartesi bahçede parti veriyorsun. Komşulara kısa bir not yaz. Partinin ne zaman olduğunu söyle, biraz gürültü olabileceğini belirt. Saat kaçta biteceğini yaz ve telefon numaranı ver.',
    fields: [],
    points: [
      { label: 'Aanhef', tr: 'Hitapla başla', re: 'beste|hallo|hoi|geachte|lieve|\\bdag\\b' },
      { label: 'Wanneer', tr: 'Ne zaman olduğunu yaz', re: 'zaterdag|vrijdag|zondag|morgen|\\d|volgende week' },
      { label: 'Lawaai', tr: 'Gürültü olabileceğini söyle', re: 'lawaai|geluid|muziek|herrie|druk|hard|overlast|last' },
      { label: 'Eindtijd', tr: 'Saat kaçta biteceğini yaz', re: 'uur|middernacht|eindigt|stopt|afgelopen|klaar|tot (half|\\d|elf|twaalf|tien|negen)' },
      { label: 'Telefoonnummer', tr: 'Numaranı ver', re: '06|\\d{6,}|nummer|bel' },
      { label: 'Afsluiting', tr: 'Kapanışla bitir', re: 'groet|groeten|tot ziens|bedankt|dank|begrip' }
    ],
    min: 35,
    model: 'Beste buren,\n\nAanstaande zaterdag wordt onze zoon Emir tien jaar. Wij geven dan een feest in onze tuin. Het feest begint om 15.00 uur en om 22.00 uur is het afgelopen. Er komen veel kinderen en er is muziek. Misschien is er dus wat lawaai. Is er een probleem? Bel mij dan op 06 12345678.\n\nAlvast bedankt voor uw begrip!\n\nGroeten,\nAyşe en Burak, nummer 8'
  },
  {
    id: 's7', kind: 'bericht', title: 'E-mail aan de juf',
    prompt: 'Uw dochter Elif moet morgen om 10.00 uur naar de tandarts. Schrijf een e-mail aan haar juf, juf Ellen. Vertel waarom Elif er niet is. Zeg hoe laat zij weggaat en wanneer zij terugkomt. Vraag of zij iets moet inhalen.',
    tr: 'Kızın Elif\'in yarın saat 10.00\'da dişçi randevusu var. Öğretmeni juf Ellen\'e bir e-posta yaz. Elif\'in neden okulda olmayacağını anlat. Saat kaçta çıkıp ne zaman döneceğini söyle. Kaçırdığı bir şeyi telafi etmesi gerekiyor mu, onu da sor.',
    fields: [],
    points: [
      { label: 'Aanhef', tr: 'Hitapla başla', re: 'beste|hallo|hoi|geachte|lieve|\\bdag\\b' },
      { label: 'Tandarts', tr: 'Dişçiden bahset', re: 'tandarts' },
      { label: 'Tijd', tr: 'Saati yaz', re: '\\d|uur|ochtend|middag' },
      { label: 'Terugkomen', tr: 'Ne zaman döneceğini yaz', re: 'terug|weer (op|naar) school|daarna|na de afspraak|komt (ze|zij)' },
      { label: 'Vraag', tr: 'Bir soru sor', re: '\\?' },
      { label: 'Afsluiting', tr: 'Kapanışla bitir', re: 'groet|groeten|tot|dank|bedankt' }
    ],
    min: 35,
    model: 'Beste juf Ellen,\n\nMijn dochter Elif uit groep 6 moet morgen naar de tandarts. De afspraak is om 10.00 uur. Ik haal haar om 9.30 uur op school op. Rond 11.00 uur breng ik haar weer terug naar school. Moet Elif nog iets inhalen? Laat het mij maar weten.\n\nMet vriendelijke groet,\nMehmet Şahin'
  },
  {
    id: 's8', kind: 'bericht', title: 'Klacht over de verwarming',
    prompt: 'De verwarming in uw huis is al drie dagen kapot. Het is erg koud. Schrijf een e-mail aan de woningcorporatie. Vertel wat het probleem is. Zeg sinds wanneer. Vraag wanneer er een monteur komt. Zeg wanneer u thuis bent.',
    tr: 'Evdeki kalorifer üç gündür çalışmıyor ve ev buz gibi. Woningcorporatie\'ye bir e-posta yaz. Sorunu ve ne zamandır böyle olduğunu anlat. Monteur\'ün ne zaman geleceğini sor ve ne zaman evde olduğunu söyle.',
    fields: [],
    points: [
      { label: 'Aanhef', tr: 'Hitapla başla', re: 'beste|hallo|geachte|\\bdag\\b' },
      { label: 'Probleem', tr: 'Sorunu anlat', re: 'verwarming|\\bcv|ketel|kachel|radiator' },
      { label: 'Sinds wanneer', tr: 'Ne zamandır böyle olduğunu yaz', re: 'sinds|dagen|week|gisteren|eergisteren|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag' },
      { label: 'Monteur', tr: 'Monteur iste', re: 'monteur|reparat|repareren|maken|iemand' },
      { label: 'Vraag', tr: 'Bir soru sor', re: '\\?' },
      { label: 'Thuis', tr: 'Ne zaman evde olduğunu yaz', re: 'thuis' },
      { label: 'Afsluiting', tr: 'Kapanışla bitir', re: 'groet|groeten|dank|bedankt' }
    ],
    min: 40,
    model: 'Geachte heer of mevrouw,\n\nSinds zaterdag doet de verwarming in mijn huis het niet meer. Dat is nu al drie dagen. De radiatoren blijven koud en het is erg koud in huis. Ik heb twee kleine kinderen en ik maak me zorgen. Wanneer kan er een monteur komen? Ik ben elke dag na 15.00 uur thuis. Op woensdag ben ik de hele dag thuis.\n\nMet vriendelijke groet,\nFatma Kaya\nKerkstraat 12, Purmerend'
  },
  {
    id: 's9', kind: 'bericht', title: 'Reactie op een advertentie',
    prompt: 'U leest een advertentie op internet. Kees verkoopt een damesfiets voor 120 euro. U wilt de fiets graag kopen. Schrijf een e-mail aan Kees. Zeg dat u interesse heeft. Stel een vraag over de fiets. Vraag wanneer u de fiets kunt komen bekijken.',
    tr: 'İnternette bir ilan gördün. Kees 120 euroya bir kadın bisikleti satıyor, sen de almak istiyorsun. Kees\'e bir e-posta yaz. İlgilendiğini söyle ve bisikletle ilgili bir soru sor. Ne zaman gelip bakabileceğini de sor.',
    fields: [],
    points: [
      { label: 'Aanhef', tr: 'Hitapla başla', re: 'beste|hallo|hoi|geachte|\\bdag\\b' },
      { label: 'Interesse', tr: 'İlgilendiğini söyle', re: 'interesse|kopen|graag|wil' },
      { label: 'Vraag over de fiets', tr: 'Bisikletle ilgili bir şey sor', re: 'kapot|rem|licht|lamp|slot|kleur|maat|versnelling|band|nieuw|oud|staat|werkt|doet het|zadel|mand|jaar' },
      { label: 'Bekijken', tr: 'Gelip bakmak istediğini yaz', re: 'bekijken|kijken|langs|afspraak|komen|wanneer' },
      { label: 'Vraag', tr: 'Bir soru sor', re: '\\?' },
      { label: 'Afsluiting', tr: 'Kapanışla bitir', re: 'groet|groeten|tot|dank|bedankt' }
    ],
    min: 35,
    model: 'Beste Kees,\n\nIk heb uw advertentie gelezen. Ik heb interesse in de damesfiets. Ik heb nog wel een vraag. Doen de lampen en de remmen het goed? Ik wil de fiets graag komen bekijken. Kan ik morgenavond om 19.00 uur bij u langskomen? Of past zaterdag beter?\n\nMet vriendelijke groet,\nSevda Aydın'
  },
  {
    id: 's10', kind: 'bericht', title: 'Dienst ruilen met een collega',
    prompt: 'U moet volgende week dinsdag werken van 14.00 tot 22.00 uur. Maar u heeft die dag een afspraak in het ziekenhuis. Schrijf een bericht aan uw collega Linda. Vertel waarom u niet kunt. Vraag of zij met u wil ruilen. Zeg welke dienst u voor haar kunt doen.',
    tr: 'Gelecek hafta salı 14.00 ile 22.00 arası vardiyan var ama o gün hastanede randevun var. İş arkadaşın Linda\'ya mesaj at. Neden gelemeyeceğini anlat ve vardiya değişmek ister mi diye sor. Onun yerine hangi vardiyaya girebileceğini de söyle.',
    fields: [],
    points: [
      { label: 'Aanhef', tr: 'Hitapla başla', re: 'beste|hallo|hoi|lieve|hey|\\bdag\\b' },
      { label: 'Reden', tr: 'Sebebini söyle', re: 'ziekenhuis|afspraak|dokter|arts|omdat|want' },
      { label: 'Ruilen', tr: 'Vardiya değişmeyi teklif et', re: 'ruil|wissel|overnemen|voor mij werken|mijn dienst' },
      { label: 'Andere dienst', tr: 'Hangi vardiyaya girebileceğini yaz', re: 'voor jou|jouw|maandag|woensdag|donderdag|vrijdag|zaterdag|zondag|andere dag' },
      { label: 'Vraag', tr: 'Bir soru sor', re: '\\?' },
      { label: 'Afsluiting', tr: 'Kapanışla bitir', re: 'groet|groeten|\\btot\\b|dank|bedankt|doei|liefs' }
    ],
    min: 35,
    model: 'Hoi Linda,\n\nVolgende week dinsdag moet ik van 14.00 tot 22.00 uur werken. Maar ik heb die middag een afspraak in het ziekenhuis. Wil jij met mij ruilen? Dan kan ik jouw dienst op donderdag doen. Die is ook van 14.00 tot 22.00 uur. Laat je het mij weten?\n\nAlvast bedankt!\nGroetjes,\nFatma'
  },
  {
    id: 's11', kind: 'bericht', title: 'Uitnodiging voor een verjaardag',
    prompt: 'U wordt volgende maand dertig jaar. U geeft een feest. Schrijf een uitnodiging aan uw vrienden. Vertel wanneer en waar het feest is. Zeg wat jullie gaan doen. Vraag of ze laten weten of ze komen.',
    tr: 'Gelecek ay otuz yaşına giriyorsun ve parti veriyorsun. Arkadaşlarına bir davet yaz. Partinin ne zaman ve nerede olduğunu söyle, neler yapacağınızı anlat. Gelip gelmeyeceklerini haber vermelerini iste.',
    fields: [],
    points: [
      { label: 'Aanhef', tr: 'Hitapla başla', re: 'beste|hallo|hoi|lieve|hey|\\bdag\\b' },
      { label: 'Wanneer', tr: 'Ne zaman olduğunu yaz', re: '\\d|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|avond|middag' },
      { label: 'Waar', tr: 'Nerede olduğunu yaz', re: 'bij (mij|ons)|thuis|adres|straat|restaurant|café|cafe|tuin|zaal|in het|in de' },
      { label: 'Activiteit', tr: 'Ne yapacağınızı anlat', re: 'eten|drinken|dansen|muziek|barbecue|taart|spelletjes|vieren|feest' },
      { label: 'Laten weten', tr: 'Haber vermelerini iste', re: 'laat|laten weten|kom je|komen jullie|reageer|stuur|bel|app|\\?' },
      { label: 'Afsluiting', tr: 'Kapanışla bitir', re: 'groet|groeten|\\btot\\b|liefs|doei|hoop' }
    ],
    min: 35,
    model: 'Hallo allemaal,\n\nVolgende maand word ik dertig jaar. Dat wil ik graag met jullie vieren! Het feest is op zaterdag 14 november bij mij thuis, Kerkstraat 12 in Purmerend. We beginnen om 19.00 uur. Er is lekker eten en we gaan dansen. Laten jullie voor 7 november weten of jullie komen?\n\nIk hoop jullie te zien!\nGroetjes,\nBurak'
  },
  {
    id: 's12', kind: 'bericht', title: 'Afmelden bij de gemeente',
    prompt: 'U heeft volgende week maandag om 10.30 uur een afspraak bij de gemeente voor een nieuw paspoort. U kunt niet komen. Schrijf een e-mail aan de gemeente. Zeg dat u niet kunt komen. Vertel waarom. Vraag om een nieuwe afspraak.',
    tr: 'Gelecek hafta pazartesi saat 10.30\'da yeni pasaport için gemeente\'de randevun var ama gidemiyorsun. Gemeente\'ye bir e-posta yaz. Gelemeyeceğini söyle ve nedenini anlat. Yeni bir randevu iste.',
    fields: [],
    points: [
      { label: 'Aanhef', tr: 'Hitapla başla', re: 'beste|geachte|hallo|\\bdag\\b' },
      { label: 'Afmelden', tr: 'Gelemeyeceğini söyle', re: 'niet komen|kan niet|kunnen niet|afmelden|afzeggen|annuleren|verzetten|lukt niet' },
      { label: 'Reden', tr: 'Sebebini söyle', re: 'omdat|want|ziek|werk|moet|helaas' },
      { label: 'Nieuwe afspraak', tr: 'Yeni randevu iste', re: 'nieuwe afspraak|andere afspraak|andere dag|ander moment|andere datum|andere tijd|verzetten|nieuwe datum|nieuwe tijd' },
      { label: 'Afsluiting', tr: 'Kapanışla bitir', re: 'groet|groeten|dank|bedankt' }
    ],
    min: 35,
    model: 'Geachte heer of mevrouw,\n\nIk heb volgende week maandag om 10.30 uur een afspraak voor een nieuw paspoort. Helaas kan ik niet komen, want ik moet die dag onverwacht werken. Mijn collega is ziek. Kan ik een nieuwe afspraak maken? Woensdag of vrijdag in de ochtend past mij het best.\n\nMet vriendelijke groet,\nHasan Demir'
  }
];

const SPREKEN = [
  { id: 'p1', part: 1, prompt: 'Waar woont u en hoe lang woont u daar al?', tr: 'Nerede oturuyorsun, ne zamandır orada yaşıyorsun?', model: 'Ik woon in Purmerend. Ik woon daar al drie jaar. Het is een rustige stad.', tip: 'Kısa ama tam cümle kur. Süreyi söylerken al ... jaar kalıbını kullan, mesela Ik woon hier al drie jaar.' },
  { id: 'p2', part: 1, prompt: 'Wat voor werk doet u? Of wat doet u overdag?', tr: 'Ne iş yapıyorsun? Çalışmıyorsan gün içinde neler yapıyorsun?', model: 'Ik werk in een magazijn in Zaandam. Ik werk vier dagen per week. Op vrijdag ga ik naar Nederlandse les.', tip: 'Çalışmıyorsan da sorun değil. Mesela Ik zorg voor mijn kinderen ya da Ik leer Nederlands diyebilirsin.' },
  { id: 'p3', part: 1, prompt: 'Vertel iets over uw gezin.', tr: 'Biraz ailenden bahset.', model: 'Ik ben getrouwd en ik heb twee kinderen. Mijn zoon is acht jaar en mijn dochter is vijf. Mijn ouders wonen in Turkije.', tip: 'Yaşları söylerken is ... jaar kalıbını kullan. Kaç kişi olduğunuzu ve yaşları söylemen yeter.' },
  { id: 'p4', part: 1, prompt: 'Wat doet u graag in uw vrije tijd?', tr: 'Boş zamanlarında ne yapmayı seversin?', model: 'In mijn vrije tijd wandel ik graag in het park. Ik kook ook graag voor vrienden. In het weekend kijk ik soms een film.', tip: 'graag fiilden sonra gelir, Ik wandel graag gibi. Bir iki örnek vermen yeterli.' },
  { id: 'p5', part: 1, prompt: 'Hoe gaat u naar uw werk of naar school?', tr: 'İşe ya da okula nasıl gidiyorsun?', model: 'Ik ga meestal met de fiets naar mijn werk. Het is ongeveer twintig minuten fietsen. Als het hard regent, neem ik de bus.', tip: 'Ulaşım için met de fiets, met de bus ya da met de trein de. Ne kadar sürdüğünü de eklersen cevabın daha iyi olur.' },
  { id: 'p6', part: 1, prompt: 'Wat eet u meestal als ontbijt?', tr: 'Kahvaltıda genelde ne yersin?', model: 'Als ontbijt eet ik meestal brood met kaas. Ik drink er thee bij. In het weekend eet ik een Turks ontbijt met mijn familie.', tip: 'meestal genelde demek ve cevabı çok doğal yapar. Hafta içiyle hafta sonunu karşılaştırabilirsin.' },
  { id: 'p7', part: 1, prompt: 'Welke talen spreekt u?', tr: 'Hangi dilleri konuşuyorsun?', model: 'Ik spreek Turks, dat is mijn moedertaal. Ik spreek ook een beetje Engels. Nu leer ik Nederlands.', tip: 'een beetje ya da goed gibi kelimelerle seviyeni belirt. Nu leer ik Nederlands cümlesi her zaman işe yarar.' },
  { id: 'p8', part: 1, prompt: 'Wat heeft u afgelopen weekend gedaan?', tr: 'Geçen hafta sonu ne yaptın?', model: 'Afgelopen zaterdag heb ik boodschappen gedaan. Op zondag zijn we naar het strand gegaan. Het was mooi weer.', tip: 'Geçmiş zaman kullan. heb ik ... gedaan ve zijn we ... gegaan kalıplarını ezberle, çok işine yarar.' },
  { id: 'p9', part: 1, prompt: 'Hoe ziet uw huis eruit?', tr: 'Evin nasıl bir yer?', model: 'Ik woon in een appartement op de tweede verdieping. Het heeft drie kamers en een klein balkon. De keuken is nieuw.', tip: 'Kaç oda olduğunu, kaçıncı katta olduğunu ve bir özelliğini söyle. Het heeft ... diye başlayan cümleler en kolayı.' },
  { id: 'p10', part: 1, prompt: 'Wat doet u als u ziek bent?', tr: 'Hastalanınca ne yaparsın?', model: 'Als ik ziek ben, blijf ik thuis. Ik bel mijn werk om me ziek te melden. Als het niet beter wordt, bel ik de huisarts.', tip: 'Als ile başlayan cümlede virgülden hemen sonra fiil gelir, Als ik ziek ben, blijf ik thuis gibi.' },
  { id: 'p11', part: 1, prompt: 'Waarom leert u Nederlands?', tr: 'Neden Hollandaca öğreniyorsun?', model: 'Ik leer Nederlands omdat ik in Nederland woon. Ik wil met mijn buren en collega\'s praten. Ik wil ook Nederlander worden.', tip: 'omdat dersen fiil cümlenin sonuna gider. Bir iki somut sebep yeterli.' },
  { id: 'p12', part: 1, prompt: 'Welk feest vindt u leuk en wat doet u dan?', tr: 'Hangi bayramı ya da kutlamayı seviyorsun, o zaman neler yapıyorsun?', model: 'Ik vind het Suikerfeest erg leuk. Dan bezoek ik mijn familie en vrienden. We eten veel lekkere dingen samen.', tip: 'Dan kelimesinden hemen sonra fiil gelir, Dan bezoek ik gibi. Kendi bayramını anlatabilirsin, hiç sorun değil.' },

  { id: 'p13', part: 2, prompt: 'U bent in de winkel. U wilt een broek ruilen, want hij is te klein. Wat zegt u?', tr: 'Mağazadasın. Aldığın pantolon küçük geldi, değiştirmek istiyorsun. Ne dersin?', model: 'Goedemiddag. Ik heb vorige week deze broek gekocht, maar hij is te klein. Mag ik hem ruilen voor een grotere maat? Hier is de kassabon.', tip: 'Önce selam ver, sonra sorunu söyle, isteğini de soru şeklinde sor. Fişi yani kassabon\'u gösterirsen artı puan.' },
  { id: 'p14', part: 2, prompt: 'U belt de huisarts. U heeft al een week hoofdpijn. U wilt een afspraak maken. Wat zegt u?', tr: 'Huisarts\'ı arıyorsun. Bir haftadır başın ağrıyor ve afspraak almak istiyorsun. Ne dersin?', model: 'Goedemorgen, met Burak Yilmaz. Ik heb al een week veel hoofdpijn. Ik wil graag een afspraak maken met de dokter. Kan dat vandaag of morgen?', tip: 'Telefonda kendini met ... diye tanıt. Şikâyetini ve ne zamandır sürdüğünü kısaca anlat.' },
  { id: 'p15', part: 2, prompt: 'U komt te laat op uw werk, want de trein had vertraging. Wat zegt u tegen uw leidinggevende?', tr: 'Tren rötar yaptı, işe geç kaldın. Şefine ne dersin?', model: 'Sorry dat ik te laat ben. De trein had een half uur vertraging. Ik werk vanmiddag een half uur langer, als dat goed is.', tip: 'Özür dile, sebebini söyle ve bir çözüm öner. Hollandalı şefler çözüm önermeni sever.' },
  { id: 'p16', part: 2, prompt: 'Uw buurman heeft elke avond laat nog harde muziek aan. U wilt dat hij zachter doet. Wat zegt u?', tr: 'Komşun her akşam geç saatte müziği sonuna kadar açıyor. Sesi kısmasını istiyorsun. Ne dersin?', model: 'Hallo, ik ben uw buurman van nummer 10. Ik hoor elke avond laat harde muziek. Ik moet vroeg op voor mijn werk. Wilt u de muziek na tien uur zachter zetten?', tip: 'Kibar ama net ol. Wilt u ... diye başlayan bir soru isteğini yumuşatır.' },
  { id: 'p17', part: 2, prompt: 'U bent op het station. U weet niet van welk spoor de trein naar Amsterdam vertrekt. Wat vraagt u?', tr: 'İstasyondasın ve Amsterdam treninin hangi perondan kalktığını bilmiyorsun. Ne sorarsın?', model: 'Pardon, mag ik iets vragen? Van welk spoor vertrekt de trein naar Amsterdam? En hoe laat gaat de volgende trein?', tip: 'Söze Pardon diye başla. Van welk spoor kalıbını istasyonda çok duyarsın.' },
  { id: 'p18', part: 2, prompt: 'Uw collega is vandaag jarig. Wat zegt u?', tr: 'Bugün iş arkadaşının doğum günü. Ne dersin?', model: 'Gefeliciteerd met je verjaardag! Ik wens je een heel fijne dag. Ga je vanavond iets leuks doen?', tip: 'Burada sihirli kelime Gefeliciteerd. Küçük bir soru sorarsan sohbet devam eder.' },
  { id: 'p19', part: 2, prompt: 'U bent in een restaurant. Uw eten is koud. Wat zegt u tegen de ober?', tr: 'Restorandasın ve yemeğin soğuk gelmiş. Garsona ne dersin?', model: 'Pardon, mijn eten is helaas koud. Kunt u het nog even warm maken? Dank u wel.', tip: 'helaas şikâyetini kibar gösterir. Rica ederken Kunt u ... kalıbını kullan.' },
  { id: 'p20', part: 2, prompt: 'Uw zoon is ziek. Hij kan vandaag niet naar school. U belt de school. Wat zegt u?', tr: 'Oğlun hasta, bugün okula gidemeyecek. Okulu arıyorsun. Ne dersin?', model: 'Goedemorgen, met de moeder van Emir uit groep 4. Emir is ziek, hij heeft koorts. Hij komt vandaag niet naar school. Ik bel morgen weer als hij nog ziek is.', tip: 'Kim olduğunu, çocuğun adını ve sınıfını söyle. Burada okula sabah dersler başlamadan haber verilir.' },
  { id: 'p21', part: 2, prompt: 'U bent op een verjaardag. Iemand biedt u nog een stuk taart aan, maar u wilt niet meer. Wat zegt u?', tr: 'Bir doğum günündesin. Biri sana bir dilim daha pasta uzatıyor ama artık istemiyorsun. Ne dersin?', model: 'Nee, dank je wel. De taart was heel lekker, maar ik heb genoeg gehad.', tip: 'Burada Nee, dank je wel demek hiç ayıp değil. Pastayı övmek de hoş olur.' },
  { id: 'p22', part: 2, prompt: 'U zoekt het gemeentehuis. U vraagt de weg aan iemand op straat. Wat zegt u?', tr: 'Belediye binasını arıyorsun ve sokakta birine yolu soruyorsun. Ne dersin?', model: 'Pardon meneer, weet u waar het gemeentehuis is? Is het ver lopen? Dank u wel voor uw hulp.', tip: 'Tanımadığın insanlara u diye hitap et. Teşekkür etmeyi de unutma.' },

  { id: 'p23', part: 3, prompt: 'Wat vindt u beter, in de stad wonen of in een dorp? Waarom?', tr: 'Sence şehirde yaşamak mı daha iyi, köyde mi? Neden?', model: 'Ik vind wonen in de stad beter. In de stad zijn veel winkels en scholen dicht bij huis. Ik heb geen auto, dus ik vind de bus en de trein belangrijk. Een dorp is wel rustiger, want er is minder verkeer. Maar ik woon toch liever in de stad, omdat er meer werk is.', tip: 'Önce fikrini söyle, sonra want ve omdat ile iki sebep ver. Öbür seçeneğin bir artısını da söylersen artı puan alırsın.' },
  { id: 'p24', part: 3, prompt: 'Gaat u liever met de fiets of met de auto naar uw werk? Waarom?', tr: 'İşe bisikletle mi gitmeyi tercih edersin, arabayla mı? Neden?', model: 'Ik ga liever met de fiets naar mijn werk. Fietsen is gezond, want je beweegt elke dag. Het is ook goedkoop, omdat je geen benzine en parkeergeld betaalt. Als het hard regent, is de auto wel makkelijker. Maar meestal neem ik de fiets.', tip: 'liever tercih anlatır. want\'tan sonra cümle normal devam eder, omdat\'tan sonra fiil sona gider.' },
  { id: 'p25', part: 3, prompt: 'Vindt u het belangrijk dat kinderen sporten? Waarom?', tr: 'Sence çocukların spor yapması önemli mi? Neden?', model: 'Ja, ik vind sporten heel belangrijk voor kinderen. Het is goed voor hun gezondheid, want ze bewegen veel. Ze leren ook samenwerken in een team. Mijn zoon zit op voetbal en daar heeft hij veel vrienden gemaakt. Ik denk dat sport kinderen gelukkiger maakt, omdat ze lekker buiten zijn.', tip: 'Kendi hayatından bir örnek ver. Ik denk dat ile başlayan cümlede fiil sona gider.' },
  { id: 'p26', part: 3, prompt: 'Beschrijf een feest uit uw land. Wat doen mensen dan?', tr: 'Ülkenden bir bayramı anlat. İnsanlar o gün neler yapar?', model: 'In Turkije vieren we het Suikerfeest na de ramadan. Mensen trekken mooie kleren aan en ze bezoeken hun familie. Kinderen krijgen snoep en soms een beetje geld. Ik vind dit feest mooi, omdat de hele familie samen is. Ook hier in Nederland vieren we het met vrienden.', tip: 'Ne zaman, kimlerle ve neler yapıldığını anlat. Sonunda omdat ile kendi fikrini ekle.' },
  { id: 'p27', part: 3, prompt: 'Wat vindt u van het weer in Nederland? Waarom?', tr: 'Hollanda\'nın havası hakkında ne düşünüyorsun? Neden?', model: 'Ik vind het weer in Nederland niet zo fijn. Het regent vaak en er staat veel wind. In de winter is het ook vroeg donker. In mijn land is het in de zomer warmer, want daar schijnt de zon vaker. Maar ik vind de lente hier wel mooi, omdat alles groen wordt.', tip: 'Olumsuz bir fikir söylemen de sorun değil. Karşılaştırma için warmer ve vaker gibi kelimeler kullan.' },
  { id: 'p28', part: 3, prompt: 'Wat vindt u beter, boodschappen doen in de winkel of online? Waarom?', tr: 'Sence alışverişi markette yapmak mı daha iyi, internetten mi? Neden?', model: 'Ik doe mijn boodschappen liever in de winkel. Dan kan ik zelf kijken of het fruit en de groente vers zijn. In de winkel zie ik ook de aanbiedingen. Online bestellen is wel makkelijk, want je hoeft niet te sjouwen. Maar ik vind het ook gezellig om naar de winkel te gaan, omdat ik daar mensen ontmoet.', tip: 'İki seçeneğe de kısaca değin. Sonra maar ile kendi tercihine dön.' },
  { id: 'p29', part: 3, prompt: 'Wat is anders in Nederland dan in uw land? Vertel en leg uit.', tr: 'Hollanda\'da senin ülkene göre farklı olan ne? Anlat ve açıkla.', model: 'In Nederland fietsen veel mensen, ook naar hun werk. In Turkije gaan mensen vaker met de auto of de bus. Ook maken Nederlanders voor bijna alles een afspraak, want ze plannen graag. In mijn land kun je vaak zomaar bij vrienden langsgaan. Ik vind de Nederlandse manier soms moeilijk, omdat ik spontaan bezoek gezellig vind.', tip: 'İki somut farkı karşılaştır. Afspraak kültürü KNM sınavında da sık çıkar.' },
  { id: 'p30', part: 3, prompt: 'Vindt u het goed dat winkels op zondag open zijn? Waarom?', tr: 'Mağazaların pazar günü açık olması sence iyi bir şey mi? Neden?', model: 'Ja, ik vind het goed dat winkels op zondag open zijn. Veel mensen werken door de week en hebben weinig tijd. Op zondag kunnen ze dan rustig boodschappen doen. Maar het is wel jammer voor het personeel, want zij zijn dan niet bij hun familie. Toch vind ik het handig, omdat ik soms op zaterdag moet werken.', tip: 'Ik vind het goed dat diye başla. maar ile bir karşı görüş eklersen cevabın daha güçlü olur.' }
];

if (typeof module !== 'undefined') module.exports = { LEZEN, LUISTEREN, SCHRIJVEN, SPREKEN };
