'use strict';
/* English explanations for KNM, grammar, writing and speaking */
const EN_CONTENT = {
  knmThemes: {
    werk: "Work and income",
    omgang: "Manners and social norms",
    wonen: "Housing",
    gezondheid: "Health and care",
    geschiedenis: "History and geography",
    instanties: "Institutions",
    staat: "Government and the rule of law",
    onderwijs: "Education and parenting"
  },
  knm: {
    k1: { q: "Ali has had a fever for three days. What does he do?", ex: "For anything that is not an emergency, your first stop is the huisarts. You call first and make an afspraak." },
    k2: { q: "Fatma has had pain in her knee for months. She wants to see a specialist at the hospital. What does she have to do first?", ex: "You cannot go straight to a specialist. You first need a verwijzing, a referral, from your huisarts. The huisarts works like a gatekeeper here, called a poortwachter." },
    k3: { q: "Mark sees a man lying on the ground in the street who is no longer breathing. What does Mark do?", ex: "If someone's life is in danger, call 112 right away. 112 is the emergency number for the ambulance, police and fire brigade." },
    k4: { q: "It is Saturday evening. Samira's little son has a high fever and it is not getting better. It is not life threatening. Who does Samira call?", ex: "In the evening, at night or at the weekend, for something urgent but not life threatening, you call the huisartsenpost. You do not just walk in, you always phone first." },
    k5: { q: "Karim recently moved to the Netherlands and is registered with the gemeente. Does he need health insurance?", ex: "Everyone who lives or works in the Netherlands must take out a basisverzekering. If you do not, you will get a fine." },
    k6: { q: "Esra is 35 years old. She is having a test at the hospital. What is true?", ex: "If you are over 18, you pay the first part of your yearly healthcare costs yourself. This is called the eigen risico. The government sets the amount every year." },
    k7: { q: "Peter goes to his huisarts for a consultation. Does this come out of his eigen risico?", ex: "A visit to the huisarts does not count towards your eigen risico, the insurance pays for it. So never avoid the huisarts because of money." },
    k8: { q: "Hasan is 40 years old. He goes to the dentist for a check up. What is true?", ex: "Dental check ups for adults are not in the basispakket. You can take out an aanvullende verzekering, extra insurance, for this." },
    k9: { q: "Leila's daughter is 10 years old. She goes to the dentist for a check up. Who pays for this?", ex: "The basisverzekering covers dental costs for children under 18. You pay no premium for a child either, but you do need to add them to your insurance." },
    k10: { q: "Sanne has a two month old baby. Where does she have the baby's growth checked?", ex: "The consultatiebureau follows the height, weight and development of children from 0 to 4 years old and also gives the vaccinations. It is all free." },
    k11: { q: "Yasmin gets an invitation to have her baby vaccinated. What is true?", ex: "The vaccinations in the Rijksvaccinatieprogramma are free. They are not compulsory, but they are strongly recommended." },
    k12: { q: "Tom got a prescription from the huisarts. Where does he get his medicine?", ex: "You get prescription medicine at the apotheek, the pharmacy. The drogist and the supermarket only sell simple medicine without a prescription." },
    k13: { q: "Maria has a low income. She finds her health insurance very expensive. What can she do?", ex: "If your income is low, you can get zorgtoeslag to help with the premium. You apply to Dienst Toeslagen, which many people still call the Belastingdienst." },
    k14: { q: "Jasmijn turns five in March. What is true?", ex: "In the Netherlands school is compulsory from age 5. This is called leerplicht. Most children already start basisschool at 4." },
    k15: { q: "Ibrahim turns four next month. What is he then allowed to do?", ex: "Children can start in groep 1 of the basisschool at age 4. Basisschool has 8 groepen and most children finish at 12." },
    k16: { q: "Dennis is 17 and does not have a diploma yet. He wants to quit school and work full time. Is that allowed?", ex: "There is leerplicht until 16, and after that kwalificatieplicht until 18. You have to keep studying until you have a havo, vwo or at least an mbo 2 diploma." },
    k17: { q: "The Öztürk family wants to fly to Turkey a week before the summer holiday. What is true?", ex: "Leave outside the school holidays needs approval from the school director, who only gives it in special cases. A cheap ticket is not a valid reason. If you go without permission, the leerplichtambtenaar can give you a fine." },
    k18: { q: "Noah's school is organising a parents' evening. What happens on such an evening?", ex: "At an ouderavond parents get information about the school and the class. Staying in touch with the school is considered very important for parents here." },
    k19: { q: "Lina gets an invitation for a 10 minute talk with her son's teacher. What is that?", ex: "A 10-minutengesprek is a short meeting where you talk with the teacher about how your child is doing at school. Parents are expected to go." },
    k20: { q: "Amal's daughter is two and a half. The consultatiebureau says she needs extra help with language. What can Amal do?", ex: "VVE is a programme that supports young children's language and development through play. The gemeente usually helps pay for it." },
    k21: { q: "Kim and Ruben both work. Their son goes to daycare three days a week. Where do they apply for kinderopvangtoeslag?", ex: "You apply for kinderopvangtoeslag at Dienst Toeslagen, which many people still call the Belastingdienst. Usually both parents need to be working or studying." },
    k22: { q: "Mustafa is 19 and goes to hbo. He needs money for his studies. Where does he apply for studiefinanciering?", ex: "DUO gives studiefinanciering. DUO also organises the inburgering exams." },
    k23: { q: "Sara is in groep 8. Who gives the advice for secondary school?", ex: "In groep 8 the basisschool gives a schooladvies based on the child's level. The types of middelbare school are vmbo, havo and vwo." },
    k24: { q: "Bram has got his vwo diploma. Where can he study now?", ex: "Vwo is the highest level and prepares you for university. Havo usually leads to hbo, and vmbo leads to mbo." },
    k25: { q: "The school asks for an ouderbijdrage for the school trip. What is true?", ex: "The ouderbijdrage is voluntary. The school cannot exclude your child from a trip or activity because you did not pay." },
    k26: { q: "Dirk's son does not listen. Dirk wants to smack him. What is true?", ex: "Hitting a child is forbidden in the Netherlands. If you are struggling, you can get support from the consultatiebureau or the gemeente." },
    k27: { q: "Jan has lost his job. Where does he apply for WW benefit?", ex: "If you lose your job, you apply for WW at UWV. WW is a temporary payment for a limited period." },
    k28: { q: "Petra gets WW benefit. What does she have to do?", ex: "If you get WW, you must actively look for work and report your applications to UWV. If you do not follow the rules, your WW can be stopped." },
    k29: { q: "Nadia has no work and no more WW. She has no money to live on. Where does she apply for bijstand?", ex: "If you have no income to live on, you apply for bijstand at the gemeente where you live. While on bijstand you are also expected to look for work." },
    k30: { q: "Ahmed has a new job with a probation period. What is true?", ex: "During the proeftijd both the employer and the employee can end the contract right away. The proeftijd must be written in the contract and can last two months at most." },
    k31: { q: "Lisa gets a payslip from her employer every month. What is on it?", ex: "Your loonstrook shows your gross salary, the tax and premium deductions and your net salary. It is a good idea to keep it and check it." },
    k32: { q: "Sevgi is 30 and works in a factory. Her boss wants to pay her less than the minimum wage. Is that allowed?", ex: "The Netherlands has a legal minimumloon, and the government updates it regularly. From age 21 everyone must get at least the full minimumloon." },
    k33: { q: "It is May. Kees gets extra money from his employer. What is this usually?", ex: "Every year you get vakantiegeld of at least 8 percent of your gross salary. Most employers pay it in May or June." },
    k34: { q: "Fatih is sick and cannot work. When does he call in sick?", ex: "If you are sick, tell your employer on the same day, before work starts. Usually you have to phone, so check your company's rules." },
    k35: { q: "An acquaintance offers Omar work without a contract and without a payslip. He gets paid in cash. What is true?", ex: "Zwart werken, working off the books, is forbidden. No tax is paid and you have no protection at all if you get sick or lose the work." },
    k36: { q: "Linda has a conflict with her employer about her pay. She wants help and advice. What can she join?", ex: "A vakbond, a trade union, defends workers' rights and gives legal support to its members. The vakbond also negotiates collective agreements with employers, called a cao." },
    k37: { q: "The factory where Ali works is very unsafe. The boss does nothing about it. Where can Ali report this?", ex: "The Nederlandse Arbeidsinspectie checks safety and working conditions at workplaces. You can report unsafe work, illegal work and exploitation there." },
    k38: { q: "Anna and Mark do the same work at the same company. Mark gets paid more because he is a man. Is that allowed?", ex: "In the Netherlands the law says men and women must be treated equally. Paying someone differently for the same work because of their gender is forbidden." },
    k39: { q: "Henk has reached the AOW age. Which institution pays his AOW?", ex: "AOW is the state pension and the SVB pays it. The AOW age changes over time in line with life expectancy." },
    k40: { q: "Olga is coming to live in the Netherlands. She is staying longer than four months. Within how much time must she register with the gemeente?", ex: "If you come to the Netherlands and will stay longer than four months, you register with the gemeente within 5 days. Your registration goes into the BRP, and this is also how you get your BSN." },
    k41: { q: "The Kaya family is moving to another address within Purmerend. What do they have to do?", ex: "You report your new address to the gemeente between 4 weeks before and 5 days after the move. A correct address matters for tax, toeslagen and your voting pass." },
    k42: { q: "Murat wants to do his tax return online and see his details at the government. What does he need?", ex: "With DigiD you prove who you are on government websites. Never share your DigiD details with anyone." },
    k43: { q: "Sara gets a letter from the Belastingdienst. She has to file an income tax return. When does that usually need to be done?", ex: "You usually file the return for the previous year by 1 May. If you cannot make it, you can ask the Belastingdienst for more time." },
    k44: { q: "Jan's bike has been stolen. There is no danger. Which number can he call?", ex: "For non emergencies you call the police on 0900 8844. For a stolen bike you can also do the aangifte, the police report, online." },
    k45: { q: "Sanne is worried. She often hears the neighbour hitting his wife and children. Where can she ask for advice?", ex: "Veilig Thuis gives advice and support about domestic violence and child abuse. If there is danger right now, call 112 directly." },
    k46: { q: "Yusuf wants to extend his residence permit. Which institution does he go to?", ex: "The IND handles residence permits and citizenship. You need to apply for an extension in time, before your permit expires." },
    k47: { q: "Yusuf has passed his inburgering exam and wants to become Dutch. Where does he submit his application for naturalisation?", ex: "You apply for naturalisatie at the gemeente where you live, and the IND reviews the file. If it is approved, you are invited to a citizenship ceremony." },
    k48: { q: "Anouk has had a baby. Which institution pays her child benefit?", ex: "The SVB pays kinderbijslag until the child turns 18. It does not depend on your income and is paid every three months." },
    k49: { q: "Ali has a problem with his landlord. He does not know his rights and has little money. Where can he get free legal advice?", ex: "The Juridisch Loket gives free information and advice on legal questions. If needed, they refer you to a suitable lawyer." },
    k50: { q: "Derya has a low income and rents a home. She needs help paying the rent. Where does she apply for huurtoeslag?", ex: "Dienst Toeslagen gives huurtoeslag, and many people still call it the Belastingdienst. If your income or rent changes, you must report it right away." },
    k51: { q: "Meryem's daughter is 9 years old. She gets an invitation for a vaccination. Where does she usually get that vaccination?", ex: "The GGD is the public health service in your region. The GGD also gives vaccinations to school age children." },
    k52: { q: "Kees feels a government body has treated him unfairly. His complaint to that body did not help. Where can he go now?", ex: "First you complain to the organisation itself. If that does not work, you go to the Nationale ombudsman, who looks at how the government treats citizens." },
    k53: { q: "Joost reads article 1 of the Grondwet. What is this article about?", ex: "Article 1 of the Grondwet says that everyone in the same situation is treated equally. Discrimination because of religion, belief, political opinion, race or gender is forbidden." },
    k54: { q: "An employer does not want to hire Fatima because she wears a headscarf. What is true?", ex: "Discrimination based on religion is forbidden. You can report it to an antidiscriminatievoorziening, the College voor de Rechten van de Mens or the police." },
    k55: { q: "Thomas and Erik are two men. They want to marry each other. What is true?", ex: "In 2001 the Netherlands became the first country in the world to legalise same sex marriage. Same sex couples have the same rights in marriage." },
    k56: { q: "Lotte writes in the newspaper that she disagrees with the government. Is that allowed?", ex: "In the Netherlands freedom of speech is protected by the Grondwet. Everyone may criticise the government and say what they think openly." },
    k57: { q: "Rob calls on people online to use violence against a group of people. What is true?", ex: "Freedom of speech has limits too. Calling for violence, making threats or stirring up hatred against a group is a crime." },
    k58: { q: "Ilse asks what separation of church and state means. What is the right answer?", ex: "The state does not interfere with religious organisations, and religious organisations do not run the state. Everyone is free to follow any religion or none at all." },
    k59: { q: "Mehmet is watching the news about the Tweede Kamer. How many seats does the Tweede Kamer have?", ex: "The Tweede Kamer has 150 members who are elected directly by the people. It makes laws and keeps a check on the government." },
    k60: { q: "How often are there normally elections for the Tweede Kamer?", ex: "Normally there is an election every four years. If the government falls, the election can be held earlier." },
    k61: { q: "What does the Eerste Kamer do?", ex: "The Eerste Kamer has 75 members and has the final vote on laws passed by the Tweede Kamer. Its members are not chosen by the people but by the members of the Provinciale Staten." },
    k62: { q: "Aylin is 30 and only has Turkish nationality. She has lived legally in the Netherlands for six years. Can she vote for the gemeenteraad?", ex: "Even without Dutch citizenship, you can vote in gemeenteraad elections after 5 years of legal residence. Only Dutch citizens can vote in Tweede Kamer elections." },
    k63: { q: "Who is the head of state of the Netherlands?", ex: "The Netherlands is a constitutional monarchy and the head of state is King Willem-Alexander. The king signs laws, but the ministers carry the political responsibility." },
    k64: { q: "Pieter has to appear before a judge. What is true about judges in the Netherlands?", ex: "The Netherlands is a state under the rule of law and the courts are independent. The government cannot tell a judge how to decide." },
    k65: { q: "A friend from Turkey asks Burak what the capital of the Netherlands is. What does Burak say?", ex: "The capital is Amsterdam. But the government and parliament are in Den Haag." },
    k66: { q: "In which city do the government and parliament work?", ex: "The government, the Tweede Kamer and the Eerste Kamer are in Den Haag. The king's working palace is in Den Haag too." },
    k67: { q: "How many provinces does the Netherlands have?", ex: "The Netherlands has 12 provincies. Each provincie has an elected council called the Provinciale Staten." },
    k68: { q: "Burak lives in Purmerend. In which province is Purmerend?", ex: "Purmerend is in Noord-Holland. The capital of Noord-Holland is Haarlem, and Amsterdam is in this provincie too." },
    k69: { q: "Why were the Deltawerken built?", ex: "They were built after the great flood of 1953, the watersnoodramp, to protect the southwest from the sea. The Deltawerken are made up of huge dams and barriers." },
    k70: { q: "What is true about the Netherlands as a country?", ex: "A large part of the Netherlands lies below sea level. That is why the dijken, the dikes, and the waterschappen, the water boards, are so important." },
    k71: { q: "In the Second World War the Netherlands was occupied by Germany. From when until when?", ex: "Germany occupied the Netherlands in May 1940. The whole country was liberated on 5 May 1945." },
    k72: { q: "On 4 May at 8 pm many people in the Netherlands are silent for two minutes. Why?", ex: "4 May is Dodenherdenking, the day of remembrance. People remember those who died in the Second World War, in later wars and on peacekeeping missions." },
    k73: { q: "What do Dutch people celebrate on 5 May?", ex: "5 May is Bevrijdingsdag, Liberation Day. People celebrate freedom and there are festivals in many cities." },
    k74: { q: "Who was Anne Frank?", ex: "During the war Anne Frank hid with her family in a secret annex in Amsterdam called the Achterhuis, and she kept a diary. After they were caught she died in a concentration camp. Her diary became famous all over the world." },
    k75: { q: "In the seventeenth century the Netherlands was a rich trading nation. What do we call that period?", ex: "The 17th century is called the Gouden Eeuw, the Golden Age. Trade, science and art flourished, with painters like Rembrandt." },
    k76: { q: "What is true about the VOC?", ex: "The VOC was a huge company founded in 1602 that traded spices in Asia. That period also has a dark side, with colonialism and slavery. The abolition of slavery is remembered every year on 1 July with Keti Koti." },
    k77: { q: "Selin wants to visit her Dutch colleague at home. What is the best thing to do?", ex: "In the Netherlands people usually make an afspraak before visiting someone. Turning up at the door unannounced is often not appreciated." },
    k78: { q: "Murat has an appointment at the gemeente at 10 am. What time does he arrive?", ex: "Being on time is very important in the Netherlands. You arrive exactly on time or a few minutes early." },
    k79: { q: "Lisa knows she will be ten minutes late for an appointment with a friend. What is usual?", ex: "If you are going to be late, send a message or call in advance. Being late without letting someone know can be seen as disrespectful." },
    k80: { q: "It is Esther's birthday and she is having a party. Burak comes in and also sees her husband and her parents. What does he do?", ex: "In the Netherlands you also congratulate the other family members on a birthday. For example, you say gefeliciteerd met je vrouw to her husband." },
    k81: { q: "Ayşe gives a present to her Dutch friend. What does the friend usually do?", ex: "In the Netherlands a present is usually opened right away, in front of the giver. Then the person says thank you." },
    k82: { q: "Emre's manager tells him directly that his report is not good. What is true?", ex: "Dutch people usually speak openly and directly. It is not meant to be rude, it is meant to be clear." },
    k83: { q: "Rachid has a job interview. How does he greet the employer?", ex: "At formal introductions you shake hands, make eye contact and say your name. The three kisses are more for family and close friends." },
    k84: { q: "Tim goes out to eat with his colleagues. What is very normal in the Netherlands?", ex: "In the Netherlands it is very common for everyone to pay for themselves, often called going Dutch. If someone clearly invited you, they pay." },
    k85: { q: "On 27 April many people wear orange clothes and there are vrijmarkten, street markets, everywhere. What are they celebrating?", ex: "27 April is Koningsdag, the birthday of King Willem-Alexander. If 27 April falls on a Sunday, it is celebrated the day before." },
    k86: { q: "On 5 December many children in the Netherlands get presents. Which celebration is that?", ex: "Sinterklaas is a traditional children's celebration on the evening of 5 December. Families give each other presents and poems." },
    k87: { q: "Hakan's new manager is a woman. What is true?", ex: "In the Netherlands men and women are equal and can do the same jobs. You show a female manager the same respect as a male manager." },
    k88: { q: "On the first day, Ingrid asks a new colleague how much he earns. What is true?", ex: "Topics like salary, age and religion are usually seen as private in the Netherlands. Asking someone you just met about them is not really appreciated." },
    k89: { q: "Ahmed's roof is leaking. His landlord does not repair it, not even after letters and phone calls. Where can Ahmed go?", ex: "The Huurcommissie is an independent body that handles disputes about rent and maintenance between tenants and landlords. You first have to inform your landlord in writing." },
    k90: { q: "Ilse rents a social housing home. She thinks her rent increase is too high. What can she do?", ex: "You can object to a rent increase by making a bezwaar to your landlord. If you cannot agree, you go to the Huurcommissie, but you keep paying the rent in the meantime." },
    k91: { q: "Mehmet has empty glass jars. What does he do with them?", ex: "In the Netherlands rubbish is sorted, and glass goes in the glasbak. You can find the rules in the gemeente's afvalkalender." },
    k92: { q: "Leyla lives in a flat. She wants to vacuum and turn on the washing machine at 11 pm. What is sensible?", ex: "After 10 pm neighbours expect quiet. If you plan something noisy like a party, it is polite to tell the neighbours in advance." },
    k93: { q: "The Yıldız family has just moved to a new street. What do many people in the Netherlands do then?", ex: "When you move into a new home, it is very common to introduce yourself to the neighbours. If you get along well with your neighbours, problems are also easier to solve." },
    k94: { q: "Karim wants a social housing home. What is true?", ex: "For a sociale huurwoning you have to register with the system in your region, for example WoningNet. In many cities the waiting time can be years." },
    k95: { q: "Sanne rents a house. She is going to move. What does she have to do?", ex: "You have to end your rental contract on time and in writing. The opzegtermijn, the notice period, is usually at least one month." },
    k96: { q: "Ali rents a home from a woningcorporatie. The boiler is broken. Who usually has to have the boiler repaired?", ex: "Big repairs and installations like the boiler are usually the landlord's responsibility. Small jobs like changing a light bulb are for the tenant." },
    k97: { q: "Ömer is cycling home in the dark. What must his bike have?", ex: "In the dark a white or yellow light at the front and a red light at the back are required. If you ride without lights, the police can give you a fine." },
    k98: { q: "Jesse is cycling to school. He wants to type a message on the phone in his hand. Is that allowed?", ex: "Holding a phone in your hand while cycling is forbidden. If you are caught, you get a fine." },
    k99: { q: "The Bakker family has an old cupboard that needs to go. What do they do?", ex: "For grof afval, bulky waste, you make an appointment with the gemeente to have it collected, or you take it to the milieustraat. If you leave it on the street, you can get a fine." },
    k100: { q: "Rick accidentally kicks a ball through the neighbours' window. Which insurance usually pays for the damage?", ex: "The aansprakelijkheidsverzekering, liability insurance, pays for damage you cause to others. It is not compulsory, but it is very common and cheap in the Netherlands." }
  },
  grammar: {
    dehet: {
      title: "De or het?",
      body: "<p>Dutch has two words for the, the lidwoord <b>de</b> and <b>het</b>. About two thirds of all nouns are <b>de-woorden</b>. So if you are not sure, say <b>de</b> and you will be right most of the time.</p>" +
        "<p>These are <b>het-woorden</b></p>" +
        "<ul>" +
        "<li>Every diminutive, <i>het meisje, het broodje, het kaartje</i></li>" +
        "<li>Nouns made from verbs, <i>het eten, het werken</i></li>" +
        "<li>Names of languages, <i>het Nederlands, het Turks</i></li>" +
        "<li>Most words starting with <b>ge-</b> and <b>be-</b>, <i>het gesprek, het bedrijf</i></li>" +
        "<li>Words ending in -um and -ment, <i>het museum, het appartement</i></li>" +
        "</ul>" +
        "<p>These are <b>de-woorden</b></p>" +
        "<ul>" +
        "<li>All plurals, without exception, <i>de huizen, de kinderen</i></li>" +
        "<li>Most people and jobs, <i>de man, de leraar</i></li>" +
        "<li>Words ending in -ing, -heid and -tie, <i>de woning, de gezondheid, de informatie</i></li>" +
        "</ul>" +
        "<p>De or het also affects the words for this and that. For a de-woord nearby use <b>deze</b>, far away use <b>die</b>. For a het-woord nearby use <b>dit</b>, far away use <b>dat</b>. In the plural it is always <b>deze</b> and <b>die</b>.</p>" +
        "<p><i>deze stoel, die tafel, dit huis, dat boek, deze boeken</i></p>" +
        "<p>English only has one word for the, so the safest way is to learn every new noun together with its article. Do not just learn <i>huis</i>, learn <i>het huis</i>.</p>",
      ex: [
        "huis is a het-woord, so het.",
        "trein is a de-woord.",
        "Diminutives ending in -je always take het.",
        "Plural nouns always take de.",
        "Words ending in -ment are het-woorden.",
        "Words ending in -tie are de-woorden.",
        "Words ending in -ing are de-woorden.",
        "Names of languages take het.",
        "Most words starting with ge- are het-woorden.",
        "stoel is a de-woord and it is nearby, so deze.",
        "huis is a het-woord and it is far away, so dat.",
        "boek is a het-woord and it is nearby, so dit.",
        "man is a de-woord and he is far away, so die.",
        "In the plural, use deze for things nearby."
      ]
    },
    tegenwoordig: {
      title: "Present tense",
      body: "<p>For the present tense, start by finding the stem of the verb. You usually get the stem by taking <b>-en</b> off the infinitive, the infinitief. With <b>ik</b> you use exactly this stem.</p>" +
        "<ul>" +
        "<li><b>ik</b> werk</li>" +
        "<li><b>jij, u, hij, zij</b> werkt, so stem plus <b>t</b></li>" +
        "<li><b>wij, jullie, zij</b> werken, so the infinitive itself</li>" +
        "</ul>" +
        "<p>Spelling points to watch</p>" +
        "<ul>" +
        "<li>A long vowel is written double so it stays long. <i>wonen, ik woon</i>. <i>slapen, ik slaap</i>.</li>" +
        "<li>A double consonant becomes single. <i>bellen, ik bel</i>. <i>zitten, ik zit</i>.</li>" +
        "<li>At the end of the stem v becomes f and z becomes s. <i>leven, ik leef</i>. <i>lezen, ik lees</i>.</li>" +
        "<li>If the stem already ends in t, you do not add another t. <i>hij zit, hij praat</i>.</li>" +
        "<li>There are also short verbs. <i>gaan, ik ga, hij gaat</i>. <i>doen, ik doe</i>. <i>zien, ik zie</i>.</li>" +
        "</ul>" +
        "<p>Now a very important rule. When <b>jij</b> comes after the verb, in a question or an inverted sentence, the final <b>t drops</b>.</p>" +
        "<p><i>Jij werkt.</i> but <i>Werk jij morgen?</i> and <i>Morgen werk jij.</i></p>" +
        "<p>This only applies to jij and je. <i>Werkt hij?</i> and <i>Werkt u?</i> stay the same.</p>" +
        "<p>Learn these two irregular verbs by heart from the start</p>" +
        "<ul>" +
        "<li><b>zijn</b> ik ben, jij bent, hij is, wij zijn</li>" +
        "<li><b>hebben</b> ik heb, jij hebt, hij heeft, wij hebben</li>" +
        "</ul>",
      ex: [
        "With ik you use just the stem, and the stem of wonen is woon.",
        "With hij it is stem plus t, werkt.",
        "With wij you use the infinitive.",
        "jij comes after the verb, so the t drops, Werk jij.",
        "jij comes before the verb, so it is stem plus t.",
        "The stem of gaan is ga, ik ga.",
        "hebben is irregular, with hij and zij it is heeft.",
        "At the end of the stem z becomes s, ik lees.",
        "The stem already ends in t, so no extra t is added.",
        "A double consonant becomes single in the stem, ik bel.",
        "With jullie you use the infinitive.",
        "With u it is always stem plus t, even in a question. Wat drinkt u?",
        "zijn is irregular, ik ben.",
        "In an inverted sentence the t drops with jij, so ben and not bent."
      ]
    },
    woordvolgorde: {
      title: "Word order",
      body: "<p>In a Dutch main clause the conjugated verb, the persoonsvorm, is <b>always in second place</b>. In short, the verb comes second.</p>" +
        "<p><i>Ik werk vandaag.</i></p>" +
        "<p>If you start the sentence with a time, a place or something else instead of the subject, the verb still stays in second place and the subject moves behind the verb. In Dutch this is called inversie.</p>" +
        "<ul>" +
        "<li><i>Vandaag <b>werk ik</b> niet.</i></li>" +
        "<li><i>Morgen <b>ga ik</b> naar Amsterdam.</i></li>" +
        "<li><i>In het weekend <b>slapen wij</b> lang.</i></li>" +
        "</ul>" +
        "<p>If there is a second verb in the sentence, an infinitive or a participle, it goes to the <b>very end</b>.</p>" +
        "<ul>" +
        "<li><i>Ik wil morgen koffie <b>drinken</b>.</i></li>" +
        "<li><i>Ik heb gisteren <b>gewerkt</b>.</i></li>" +
        "</ul>" +
        "<p>Information in the middle usually follows this order, first time, then manner, and last place.</p>" +
        "<p><i>Ik ga morgen met de trein naar Amsterdam.</i></p>" +
        "<p>In questions</p>" +
        "<ul>" +
        "<li>A yes or no question starts with the verb. <i>Woon je in Purmerend?</i></li>" +
        "<li>After a question word the verb comes right away. <i>Waar woon je? Wanneer begint de les?</i></li>" +
        "</ul>" +
        "<p>Remember, when jij comes after the verb the t drops. <i>Werk jij?</i></p>",
      ex: [
        "The sentence starts with a time word. The verb stays in second place and the subject moves behind it.",
        "vandaag is in first place, the verb second, then the subject.",
        "A yes or no question starts with the verb, and the t drops when je comes after it.",
        "After the question word, first the verb and then the subject.",
        "The sentence starts with in het weekend, and the verb stays in second place.",
        "The order is time first, then manner, and place last.",
        "The second verb goes to the end as an infinitive.",
        "The conjugated verb heb is in second place and the subject follows it.",
        "The conjugated verb comes after the question word, and de les is singular, so begint.",
        "The sentence starts with a time, so the verb stays in second place.",
        "Na het eten is in first place, the verb second, then the subject.",
        "The verb comes after the question word, and since jij comes after it the t drops."
      ]
    },
    bijzin: {
      title: "Subordinate clauses",
      body: "<p>Some conjunctions start a bijzin, a subordinate clause. In a bijzin the conjugated verb goes to the <b>very end</b>. It feels unusual at first, but with practice it becomes natural.</p>" +
        "<p>Conjunctions that send the verb to the end</p>" +
        "<ul>" +
        "<li><b>omdat</b> because. <i>Ik blijf thuis omdat ik ziek <b>ben</b>.</i></li>" +
        "<li><b>dat</b> that. <i>Ik denk dat hij morgen <b>komt</b>.</i></li>" +
        "<li><b>als</b> if, when. <i>Als het <b>regent</b>, neem ik de bus.</i></li>" +
        "<li><b>wanneer</b> when. <i>Wanneer ik thuis <b>ben</b>, drink ik thee.</i></li>" +
        "<li><b>of</b> whether. <i>Ik weet niet of de winkel open <b>is</b>.</i></li>" +
        "</ul>" +
        "<p>In indirect questions with a question word the verb also moves to the end. <i>Weet jij wanneer de bus <b>vertrekt</b>?</i></p>" +
        "<p>If the bijzin comes first, the main clause starts straight away with the verb. <i>Als het regent, <b>neem ik</b> de bus.</i></p>" +
        "<p>Conjunctions that do not change the word order</p>" +
        "<ul>" +
        "<li><b>want</b> because. <i>Ik blijf thuis, want ik <b>ben</b> ziek.</i></li>" +
        "<li><b>maar</b> but. <i>Ik wil komen, maar ik <b>heb</b> geen tijd.</i></li>" +
        "<li><b>en</b> and, <b>of</b> or.</li>" +
        "<li><b>dus</b> so. <i>Het regent, dus ik neem de bus.</i> Here <i>dus neem ik</i> is also fine, both are correct.</li>" +
        "</ul>" +
        "<p>Here is the key point. <b>omdat</b> and <b>want</b> both mean because, but the word order is different. omdat sends the verb to the end, want leaves it alone.</p>",
      ex: [
        "omdat starts a bijzin, so the verb goes to the end.",
        "want does not change the order, so it is normal main clause order.",
        "With dat the verb goes to the end.",
        "The bijzin comes first, so the main clause starts with the verb.",
        "maar does not change the order.",
        "Here of starts a bijzin, so the verb goes to the end.",
        "The bijzin comes first, so the main clause starts with the verb.",
        "Normal word order follows. With omdat the verb would go to the end.",
        "The verb is not at the end, so want.",
        "The verb is at the end, so omdat.",
        "With omdat the verb goes to the end.",
        "In an indirect question the verb also goes to the end."
      ]
    },
    perfectum: {
      title: "The perfectum for the past",
      body: "<p>When you talk about the past in speech, you mostly use the <b>perfectum</b>. The formula is simple, <b>hebben</b> or <b>zijn</b> plus the participle, the past participle, at the end of the sentence.</p>" +
        "<p><i>Ik <b>heb</b> gisteren <b>gewerkt</b>. Wij <b>zijn</b> naar Amsterdam <b>gegaan</b>.</i></p>" +
        "<p>For regular verbs the participle is <b>ge + stem + t or d</b>. <b>'t kofschip</b> tells you which one. If the stem ends in t, k, f, s, ch or p you add <b>t</b>, otherwise <b>d</b>.</p>" +
        "<ul>" +
        "<li><i>werken, gewerkt</i> and <i>fietsen, gefietst</i></li>" +
        "<li><i>wonen, gewoond</i> and <i>leren, geleerd</i></li>" +
        "<li>If the stem already ends in t or d, nothing is added. <i>praten, gepraat</i>. <i>antwoorden, geantwoord</i>.</li>" +
        "<li>If the infinitive has v or z, you add d. <i>verhuizen, verhuisd</i>. <i>leven, geleefd</i>.</li>" +
        "</ul>" +
        "<p>Verbs starting with <b>be-, ge-, ver-, her-, ont-, er-</b> do not get an extra ge-. <i>betalen, betaald</i>. <i>vergeten, vergeten</i>.</p>" +
        "<p>Common irregular ones are <i>geweest, gehad, gegaan, gekomen, gedaan, gegeten, gedronken, gelezen, geschreven, gezien</i>. You need to learn these by heart.</p>" +
        "<p>Verbs with <b>zijn</b> usually describe going somewhere or a change. <i>gaan, komen, blijven, worden, beginnen, vertrekken, verhuizen, opstaan, aankomen</i> and of course <i>zijn</i>. For example <i>Ik ben ziek geweest.</i> Most other verbs go with <b>hebben</b>.</p>",
      ex: [
        "werken takes hebben.",
        "gaan means going somewhere, so zijn.",
        "werk ends in k, and k is in 't kofschip, so t.",
        "woon ends in n, and n is not in 't kofschip, so d.",
        "fiets ends in s, so t.",
        "schrijven is irregular, the participle is geschreven.",
        "eten is irregular, the participle is gegeten.",
        "Verbs starting with be- do not take ge-.",
        "Verbs starting with ver- do not take ge-.",
        "verhuizen describes a change, so it takes zijn.",
        "beginnen takes zijn.",
        "zien is irregular, the participle is gezien.",
        "The perfectum of zijn is also made with zijn, is geweest.",
        "The stem already ends in t, so nothing is added."
      ]
    },
    imperfectum: {
      title: "Imperfectum, the narrative past",
      body: "<p>The <b>imperfectum</b> is used when telling a story or describing a situation or habit in the past. <i>Vroeger woonde ik in Turkije.</i></p>" +
        "<p>For regular verbs you add <b>-te</b> or <b>-de</b> to the stem in the singular, and <b>-ten</b> or <b>-den</b> in the plural. Here <b>'t kofschip</b> decides again.</p>" +
        "<ul>" +
        "<li><i>werken, ik werkte, wij werkten</i></li>" +
        "<li><i>fietsen, ik fietste, wij fietsten</i></li>" +
        "<li><i>wonen, ik woonde, wij woonden</i></li>" +
        "<li><i>bellen, ik belde, wij belden</i></li>" +
        "<li><i>spelen, ik speelde, wij speelden</i></li>" +
        "</ul>" +
        "<p>The irregular verbs you will meet most often</p>" +
        "<ul>" +
        "<li><b>zijn</b> ik was, wij waren</li>" +
        "<li><b>hebben</b> ik had, wij hadden</li>" +
        "<li><b>gaan</b> ik ging, wij gingen</li>" +
        "<li><b>komen</b> ik kwam, wij kwamen</li>" +
        "<li><b>doen</b> ik deed, <b>zien</b> ik zag, <b>eten</b> ik at</li>" +
        "<li><b>kunnen</b> ik kon, <b>willen</b> ik wilde, <b>moeten</b> ik moest, <b>mogen</b> ik mocht</li>" +
        "<li><b>kopen</b> ik kocht, <b>denken</b> ik dacht, <b>brengen</b> ik bracht</li>" +
        "</ul>" +
        "<p>In the imperfectum ik, jij and hij use the same form, with no extra t. <i>ik was, jij was, hij was</i>. In the plural irregular verbs usually just add <b>-en</b>. <i>kwam, kwamen</i>. <i>at, aten</i>.</p>",
      ex: [
        "woon ends in n, so -de.",
        "werk ends in k, and k is in 't kofschip, so -te.",
        "zijn is was in the singular.",
        "zijn is waren in the plural.",
        "hebben is had in the singular.",
        "gaan is irregular, ik ging.",
        "komen is irregular, kwam in the singular.",
        "kopen is irregular, kochten in the plural.",
        "fiets ends in s, so -te.",
        "bel ends in l, so -de.",
        "The subject is plural and spelen is regular, so -den.",
        "eten is irregular, ik at.",
        "doen is irregular, jij deed."
      ]
    },
    scheidbaar: {
      title: "Separable verbs",
      body: "<p>Some verbs start with a prefix that can split off, for example <b>op, mee, af, uit, aan, in, terug</b>. The stress is on this prefix. <i>opbellen, meenemen, opstaan, afspreken, uitnodigen, aankomen, invullen, ophalen</i>.</p>" +
        "<p>In a main clause the conjugated verb stays in second place, and the prefix breaks off and goes to the <b>end of the sentence</b>.</p>" +
        "<ul>" +
        "<li><i>Ik <b>bel</b> mijn moeder <b>op</b>.</i></li>" +
        "<li><i>Ik <b>sta</b> om zeven uur <b>op</b>.</i></li>" +
        "<li><i><b>Neem</b> je paraplu <b>mee</b>.</i></li>" +
        "</ul>" +
        "<p>With a modal verb the verb does not split. It goes to the end as one word in the infinitive. <i>Ik moet de dokter <b>opbellen</b>.</i></p>" +
        "<p>In a bijzin the verb is also written as one word at the end. <i>Ik ben moe omdat ik elke dag vroeg <b>opsta</b>.</i></p>" +
        "<p>In the perfectum <b>ge</b> goes between the prefix and the stem.</p>" +
        "<ul>" +
        "<li><i>opbellen, opgebeld</i></li>" +
        "<li><i>meenemen, meegenomen</i></li>" +
        "<li><i>afspreken, afgesproken</i></li>" +
        "<li><i>uitnodigen, uitgenodigd</i></li>" +
        "<li><i>invullen, ingevuld</i></li>" +
        "<li><i>opstaan, ik ben opgestaan</i></li>" +
        "<li><i>aankomen, de trein is aangekomen</i></li>" +
        "</ul>" +
        "<p>Watch out, prefixes like <b>be-, ver-, ont-</b> never split off. <i>Ik betaal de rekening. Ik vertel een verhaal.</i></p>",
      ex: [
        "In a main clause the prefix goes to the end and the verb stays in second place.",
        "In opstaan the prefix op goes to the end.",
        "In a command the prefix mee also goes to the end.",
        "With a modal verb the infinitive is one word at the end.",
        "ge goes between the prefix and the stem, ingevuld.",
        "spreken is irregular, af plus gesproken.",
        "op plus gestaan, and it takes zijn.",
        "uit plus genodigd, uitgenodigd.",
        "In aankomen the prefix aan goes to the end.",
        "ophalen splits in a main clause, haal in second place and op at the end.",
        "In a bijzin the verb is one word at the end.",
        "With a modal verb the infinitive is one word at the end.",
        "op plus gebeld, opgebeld."
      ]
    },
    modaal: {
      title: "Modal verbs",
      body: "<p>Modal verbs are rarely used alone, they take another verb with them. That second verb is in the <b>infinitive</b> and stands at the <b>end of the sentence</b>.</p>" +
        "<ul>" +
        "<li><b>kunnen</b> can, to be able to. <i>Ik kan goed koken.</i></li>" +
        "<li><b>willen</b> to want. <i>Hij wil een nieuwe fiets kopen.</i></li>" +
        "<li><b>moeten</b> must, to have to. <i>Ik moet morgen werken.</i></li>" +
        "<li><b>mogen</b> may, to be allowed to. <i>Mag ik hier parkeren?</i></li>" +
        "</ul>" +
        "<p>Conjugation</p>" +
        "<ul>" +
        "<li>ik kan, jij kunt, hij kan, wij kunnen</li>" +
        "<li>ik wil, jij wilt, hij wil, wij willen</li>" +
        "<li>ik moet, jij moet, hij moet, wij moeten</li>" +
        "<li>ik mag, jij mag, hij mag, wij mogen</li>" +
        "</ul>" +
        "<p>Watch out, <b>hij kan, hij wil, hij mag</b> have no t. In a question where jij comes after the verb it becomes <i>Kun jij</i> and <i>Wil jij</i>.</p>" +
        "<p>To ask for something politely you say <i>Ik wil graag een kopje koffie</i> or <i>Mag ik de rekening?</i></p>" +
        "<p>To say something is not necessary, use <b>niet hoeven te</b>. <i>Je hoeft morgen niet te komen.</i> <i>Je mag niet roken</i> means it is forbidden, so do not mix them up.</p>",
      ex: [
        "With ik it is kan.",
        "With hij it is wil, without a t.",
        "With wij you use the infinitive form, moeten.",
        "With ik it is mag, used to ask for permission.",
        "With mogen, jij also takes mag, without a t.",
        "The second verb is in the infinitive at the end.",
        "The second verb is in the infinitive at the end.",
        "When jij comes after the verb the t drops, so kun and not kunt.",
        "verplicht means compulsory, so moet.",
        "The subject is plural, so mogen.",
        "The second verb is in the infinitive at the end.",
        "With kan the second verb comes in the infinitive.",
        "With jullie you use the infinitive form, willen."
      ]
    },
    meervoud: {
      title: "Making plurals",
      body: "<p>Dutch makes plurals in two ways, with <b>-en</b> or <b>-s</b>. And remember, all plurals take <b>de</b>.</p>" +
        "<p><b>-en</b> is used for most words. <i>boek, boeken</i>. <i>fiets, fietsen</i>.</p>" +
        "<p><b>-s</b> is used for these words</p>" +
        "<ul>" +
        "<li>Words ending in -el, -em, -en, -er. <i>tafel, tafels</i>. <i>kamer, kamers</i>.</li>" +
        "<li>Words ending in -je. <i>meisje, meisjes</i>.</li>" +
        "<li>Words ending in a, o, u, i, y get an apostrophe. <i>auto, auto's</i>. <i>baby, baby's</i>.</li>" +
        "</ul>" +
        "<p>Spelling points</p>" +
        "<ul>" +
        "<li>A double long vowel becomes single when -en is added. <i>boom, bomen</i>. <i>straat, straten</i>.</li>" +
        "<li>After a short vowel the consonant is doubled. <i>bus, bussen</i>. <i>bed, bedden</i>.</li>" +
        "<li>f sometimes becomes v, and s sometimes becomes z. <i>brief, brieven</i>. <i>huis, huizen</i>.</li>" +
        "</ul>" +
        "<p>Irregular ones</p>" +
        "<ul>" +
        "<li><i>kind, kinderen</i></li>" +
        "<li><i>ei, eieren</i></li>" +
        "<li><i>stad, steden</i></li>" +
        "<li><i>dag, dagen</i> and <i>weg, wegen</i>, here the consonant is not doubled</li>" +
        "</ul>" +
        "<p>Note that after a number <i>uur</i> and <i>euro</i> usually stay singular. <i>drie uur, tien euro</i>.</p>",
      ex: [
        "Most words take -en.",
        "The double vowel becomes single when -en is added, bomen.",
        "After a short vowel the consonant is doubled, bussen.",
        "kind is irregular, kinderen.",
        "Here f becomes v, brieven.",
        "Here s becomes z, huizen.",
        "Words ending in -er take -s, kamers.",
        "Words ending in o take -s with an apostrophe, auto's.",
        "Words ending in -je take -s, meisjes.",
        "nacht takes -en, nachten.",
        "fiets takes -en, fietsen.",
        "ei is irregular, eieren.",
        "The double vowel becomes single when -en is added, straten.",
        "After a short vowel the consonant is doubled, bedden."
      ]
    },
    bijvoeglijk: {
      title: "Adjectives and the -e ending",
      body: "<p>When an adjective comes before a noun, it usually gets an <b>-e</b> at the end.</p>" +
        "<ul>" +
        "<li><i>de grote stad</i></li>" +
        "<li><i>het grote huis</i></li>" +
        "<li><i>een grote stad</i></li>" +
        "<li><i>grote huizen</i></li>" +
        "</ul>" +
        "<p><b>There is only one exception</b>. If the noun is a singular <b>het-woord</b> and has <b>een</b> or <b>geen</b> before it, or no article at all, the adjective gets <b>no -e</b>.</p>" +
        "<ul>" +
        "<li><i>een groot huis</i></li>" +
        "<li><i>geen groot huis</i></li>" +
        "<li><i>mooi weer, koud water</i></li>" +
        "</ul>" +
        "<p>If the adjective comes after the verb, it gets no ending at all. <i>Het huis is groot. De stad is mooi.</i></p>" +
        "<p>Spelling points</p>" +
        "<ul>" +
        "<li>A double long vowel becomes single. <i>groot, grote</i>. <i>duur, dure</i>.</li>" +
        "<li>After a short vowel the consonant is doubled. <i>dik, dikke</i>. <i>wit, witte</i>.</li>" +
        "<li>f sometimes becomes v, and s sometimes becomes z. <i>lief, lieve</i>. <i>vies, vieze</i>.</li>" +
        "</ul>" +
        "<p>Here is a quick test. Is the noun a singular het-woord with een, geen or nothing before it? If yes, no ending. In every other case, -e. This is another reason why learning every noun with de or het really pays off.</p>",
      ex: [
        "huis is a het-woord with een before it, so no -e.",
        "There is het before it, so -e.",
        "auto is a de-woord, so it gets -e even with een.",
        "The adjective comes after the verb, so no ending.",
        "weer is a het-woord with no article, so no -e.",
        "baan is a de-woord, so -e.",
        "bed is a het-woord with een before it, so no -e.",
        "In the plural there is always -e.",
        "boek is a het-woord with een before it, so no -e.",
        "Plural, so -e, and s becomes z.",
        "Plural, so -e, and f becomes v.",
        "restaurant is a het-woord with een before it, so no -e.",
        "water is a het-woord with no article, so no -e.",
        "There is het before it, so -e."
      ]
    },
    negatie: {
      title: "Negation, geen or niet?",
      body: "<p>Dutch has two words for negation, <b>geen</b> and <b>niet</b>.</p>" +
        "<p><b>geen</b> makes a noun negative. It is used with nouns that have <b>een</b> before them or no article at all.</p>" +
        "<ul>" +
        "<li><i>Ik heb een auto. Ik heb <b>geen</b> auto.</i></li>" +
        "<li><i>Ik drink koffie. Ik drink <b>geen</b> koffie.</i></li>" +
        "<li><i>Ik heb <b>geen</b> tijd. Er is <b>geen</b> melk.</i></li>" +
        "</ul>" +
        "<p><b>niet</b> is for everything else.</p>" +
        "<ul>" +
        "<li>A verb. <i>Ik werk vandaag <b>niet</b>.</i></li>" +
        "<li>An adjective. <i>Het is <b>niet</b> duur.</i></li>" +
        "<li>A noun with a word like de, het or mijn before it. <i>Ik zie de bus <b>niet</b>. Dat is <b>niet</b> mijn tas.</i></li>" +
        "</ul>" +
        "<p>Where does niet go?</p>" +
        "<ul>" +
        "<li>Usually at the end of the sentence. <i>Ik begrijp het <b>niet</b>.</i></li>" +
        "<li>Before an adjective or a preposition. <i>Ik ben <b>niet</b> ziek. Ik ga <b>niet</b> naar school.</i></li>" +
        "<li>Before the second verb at the end. <i>Ik heb de brief <b>niet</b> gelezen.</i></li>" +
        "</ul>" +
        "<p>Think of it roughly like this. English <i>no</i> and <i>not any</i> are usually geen, and <i>not</i> is usually niet.</p>",
      ex: [
        "een auto becomes geen auto in the negative.",
        "The verb is negative, so niet.",
        "A noun without an article, so geen.",
        "The adjective is negative, so niet.",
        "A noun with de before it, so niet.",
        "A plural noun without an article, so geen.",
        "A noun with mijn before it, so niet.",
        "A plural noun without an article, so geen.",
        "The verb is negative, and niet comes before the preposition.",
        "A noun without an article, so geen.",
        "The verb is negative, and niet comes before the participle at the end.",
        "The adjective is negative, so niet.",
        "A noun without an article, so geen.",
        "honger is a noun, so geen."
      ]
    },
    vergelijken: {
      title: "Comparing",
      body: "<p>To compare, you add <b>-er</b> to the adjective, followed by <b>dan</b>.</p>" +
        "<p><i>Amsterdam is <b>groter dan</b> Purmerend.</i></p>" +
        "<p>For the superlative you add <b>-st</b>. <i>Dit is het grootste huis. Dit huis is het grootst.</i></p>" +
        "<ul>" +
        "<li><i>klein, kleiner, kleinst</i></li>" +
        "<li><i>snel, sneller, snelst</i></li>" +
        "<li><i>groot, groter, grootst</i>, the long vowel becomes single</li>" +
        "<li><i>dik, dikker, dikst</i>, the consonant is doubled</li>" +
        "<li>Adjectives ending in -r get <b>-der</b>. <i>duur, duurder</i>. <i>lekker, lekkerder</i>.</li>" +
        "<li>Long adjectives also take -er, you do not say meer moeilijk. <i>moeilijk, moeilijker</i>.</li>" +
        "</ul>" +
        "<p>Irregular ones</p>" +
        "<ul>" +
        "<li><i>goed, beter, best</i></li>" +
        "<li><i>veel, meer, meest</i></li>" +
        "<li><i>weinig, minder, minst</i></li>" +
        "<li><i>graag, liever, liefst</i></li>" +
        "</ul>" +
        "<p>For equality use <b>even ... als</b> or <b>zo ... als</b>. <i>Zij is even oud als haar man.</i></p>" +
        "<p>Before a noun the comparative form can also take -e. <i>een groter huis, de grootste stad</i>.</p>" +
        "<p>Remember, <b>dan</b> for comparing and <b>als</b> for equality. English <i>bigger than</i> becomes <i>groter dan</i>.</p>",
      ex: [
        "groot plus -er, and the long vowel becomes single.",
        "oud plus -er, ouder.",
        "After a short vowel the consonant is doubled, sneller.",
        "Adjectives ending in -r take -der.",
        "goed is irregular, beter.",
        "Superlative before a noun, -ste.",
        "graag is irregular, liever.",
        "veel is irregular, meaning the most it is meeste.",
        "weinig is irregular, minder.",
        "For equality you use als.",
        "For comparing you use dan.",
        "Superlative with het, mooist.",
        "Long adjectives also take -er, you do not say meer moeilijk."
      ]
    },
    voornaamwoorden: {
      title: "Pronouns",
      body: "<p>Each person has three forms. The subject form, the object form and the possessive.</p>" +
        "<ul>" +
        "<li><b>ik</b>, mij or me, mijn</li>" +
        "<li><b>jij</b> or je, jou or je, jouw or je</li>" +
        "<li><b>u</b>, u, uw. The formal, polite form.</li>" +
        "<li><b>hij</b>, hem, zijn</li>" +
        "<li><b>zij</b> or ze, haar, haar</li>" +
        "<li><b>het</b>, het, zijn</li>" +
        "<li><b>wij</b> or we, ons, ons or onze</li>" +
        "<li><b>jullie</b>, jullie, jullie</li>" +
        "<li><b>zij</b> or ze, hen or hun or ze, hun</li>" +
        "</ul>" +
        "<p>Examples</p>" +
        "<ul>" +
        "<li><i>Ik zie <b>hem</b>. Dat is <b>zijn</b> fiets.</i></li>" +
        "<li><i>Kun je <b>mij</b> helpen?</i></li>" +
        "<li><i>Is dit <b>jouw</b> jas? Ik geef <b>jou</b> een cadeau.</i></li>" +
        "<li><i>Wat is <b>uw</b> naam?</i></li>" +
        "</ul>" +
        "<p><b>ons</b> or <b>onze</b>? Use <b>ons</b> before a singular het-woord, and <b>onze</b> before a de-woord or a plural.</p>" +
        "<p><i>ons huis, onze auto, onze kinderen</i></p>" +
        "<p>Watch out, <b>jou</b> is the object form and <b>jouw</b> is the possessive. In formal letters, at the doctor and at the gemeente you usually hear <b>u</b> and <b>uw</b>.</p>",
      ex: [
        "The possessive form, mijn.",
        "The object form, mij.",
        "huis is a singular het-woord, so ons.",
        "auto is a de-woord, so onze.",
        "In formal speech the possessive form is uw.",
        "The object form for a woman is haar.",
        "The object form for a man is hem.",
        "Ahmet is a man, so the possessive form is zijn.",
        "The possessive form, jouw.",
        "The object form, jou.",
        "In the plural the possessive form is hun.",
        "The subject form, jullie.",
        "After a preposition comes the object form, ons.",
        "Before a plural, onze."
      ]
    },
    voorzetsels: {
      title: "Prepositions",
      body: "<p>Dutch prepositions often do not match English ones word for word, so it helps to learn them in fixed combinations. These are the most important ones.</p>" +
        "<ul>" +
        "<li><b>in</b> in. Cities, countries, months, years, seasons. <i>in Purmerend, in de winkel, in mei, in 2020, in de zomer, in het weekend</i></li>" +
        "<li><b>op</b> on. Days and some places. <i>op tafel, op maandag, op 3 mei, op school, op het werk</i></li>" +
        "<li><b>aan</b> on, against, at the side of. <i>aan de muur, aan tafel zitten</i></li>" +
        "<li><b>naar</b> to, towards a place. <i>naar Amsterdam, naar huis, naar de dokter</i></li>" +
        "<li><b>bij</b> at someone's place, at a shop or company. <i>bij de bakker, bij mijn moeder, Ik werk bij een bedrijf.</i></li>" +
        "<li><b>met</b> with, by. <i>met de bus, met mijn vrouw</i></li>" +
        "<li><b>voor</b> for or in front of. <i>voor jou, voor het huis</i></li>" +
        "<li><b>om</b> at, for clock times. <i>om 9 uur, om half drie</i></li>" +
        "</ul>" +
        "<p>A short summary for time. Clock time takes <b>om</b>, days and dates take <b>op</b>, and months, years, seasons and the weekend take <b>in</b>.</p>" +
        "<p>Going somewhere and being there are different. <i>Ik ga <b>naar</b> de huisarts</i> describes going there. <i>Ik ben <b>bij</b> de huisarts</i> means you are there. <i>Ik heb een afspraak <b>bij</b> de huisarts</i> also uses bij.</p>",
      ex: [
        "For clock times you use om.",
        "For days you use op.",
        "For the weekend you say in het weekend.",
        "With city names you use in.",
        "If you are going somewhere, naar.",
        "At a shop or at someone's place you use bij.",
        "If you travel by a means of transport, met.",
        "For school you say op school.",
        "For someone, so voor.",
        "With seasons you use in.",
        "If something is on top of something, op.",
        "Sitting at the table to eat is aan tafel zitten.",
        "An appointment is at someone's place, so bij.",
        "With dates you use op."
      ]
    },
    er: {
      title: "The word er",
      body: "<p><b>er</b> is a small word, but you will see it everywhere. These are its three most important uses for A2.</p>" +
        "<p><b>1. er is and er zijn</b>, like English <i>there is</i> and <i>there are</i>. Use <b>er is</b> for singular and <b>er zijn</b> for plural.</p>" +
        "<ul>" +
        "<li><i>Er is een supermarkt in de buurt.</i></li>" +
        "<li><i>Er zijn veel fietsen in Nederland.</i></li>" +
        "<li><i>Er is geen melk meer.</i></li>" +
        "<li><i>Wat is er aan de hand?</i></li>" +
        "</ul>" +
        "<p><b>2. With a number or amount</b>. er is used so you do not repeat the noun. The noun is left out, but er must be there.</p>" +
        "<ul>" +
        "<li><i>Hoeveel kinderen heb je? Ik heb <b>er</b> twee.</i></li>" +
        "<li><i>Heb je nog eieren? Ja, ik heb <b>er</b> nog zes.</i></li>" +
        "<li><i>Heb je een auto? Nee, ik heb <b>er</b> geen.</i></li>" +
        "</ul>" +
        "<p><b>3. For a place</b>, replacing a place mentioned before. So it means <i>there</i>.</p>" +
        "<ul>" +
        "<li><i>Ben je al in Utrecht geweest? Ja, ik ben <b>er</b> vorig jaar geweest.</i></li>" +
        "<li><i>Woon je in Purmerend? Ja, ik woon <b>er</b> al vijf jaar.</i></li>" +
        "</ul>" +
        "<p>English has no direct match for the second use, so it is often forgotten. <i>Ik heb twee</i> is wrong, <i>Ik heb er twee</i> is right.</p>",
      ex: [
        "To say there is, use er is.",
        "The noun is plural, er zijn.",
        "The noun is singular, er is.",
        "With a number, er replaces the noun.",
        "With an amount, er replaces the noun.",
        "A noun without an article, so geen.",
        "er stands for the place mentioned before.",
        "With a number, er is used.",
        "To say there are, use er zijn.",
        "The noun is singular, er is.",
        "A fixed expression, wat is er aan de hand, meaning what is going on.",
        "With a number, er replaces the noun.",
        "er stands for the place mentioned before."
      ]
    }
  },
  schrijven: {
    s1: { tr: "You want to become a member of the library. Fill in the form.", points: [] },
    s2: { tr: "You have just moved and want to register with a new huisarts. Fill in the form.", points: [] },
    s3: { tr: "Your child needs to learn to swim. You are signing your child up for swimming lessons. Fill in the form.", points: [] },
    s4: { tr: "A street light in your street is broken and it is pitch dark in the evening. You report this to the gemeente. Fill in the form.", points: [] },
    s5: {
      tr: "You are sick and cannot go to work today. Write an email to your manager, Mr De Boer. Say that you are sick and explain what is wrong. Also write when you think you can go back to work.",
      points: ["Start with a greeting", "Say that you are sick", "Write what is wrong", "Write when you will be back", "End with a closing"]
    },
    s6: {
      tr: "Your son is turning ten and you are having a party in the garden on Saturday. Write a short note to the neighbours. Say when the party is and mention that it may be a bit noisy. Write what time it will end and give your phone number.",
      points: ["Start with a greeting", "Write when it is", "Say that it may be noisy", "Write what time it ends", "Give your number", "End with a closing"]
    },
    s7: {
      tr: "Your daughter Elif has a dentist appointment tomorrow at 10.00. Write an email to her teacher, juf Ellen. Explain why Elif will not be at school. Say what time she will leave and when she will come back. Also ask whether she needs to catch up on anything.",
      points: ["Start with a greeting", "Mention the dentist", "Write the time", "Write when she will be back", "Ask a question", "End with a closing"]
    },
    s8: {
      tr: "The heating at home has not worked for three days and the house is freezing. Write an email to the woningcorporatie. Explain the problem and how long it has been going on. Ask when the monteur will come and say when you are at home.",
      points: ["Start with a greeting", "Explain the problem", "Write how long it has been like this", "Ask for a monteur", "Ask a question", "Write when you are at home", "End with a closing"]
    },
    s9: {
      tr: "You saw an advert online. Kees is selling a women's bike for 120 euros and you want to buy it. Write an email to Kees. Say that you are interested and ask a question about the bike. Also ask when you can come and see it.",
      points: ["Start with a greeting", "Say that you are interested", "Ask something about the bike", "Write that you want to come and see it", "Ask a question", "End with a closing"]
    },
    s10: {
      tr: "Next Tuesday you have a shift from 14.00 to 22.00, but you have a hospital appointment that day. Send a message to your colleague Linda. Explain why you cannot come and ask if she wants to swap shifts. Also say which shift you can do for her instead.",
      points: ["Start with a greeting", "Give the reason", "Offer to swap shifts", "Write which shift you can do", "Ask a question", "End with a closing"]
    },
    s11: {
      tr: "You are turning thirty next month and you are having a party. Write an invitation to your friends. Say when and where the party is and what you will do. Ask them to let you know if they are coming.",
      points: ["Start with a greeting", "Write when it is", "Write where it is", "Describe what you will do", "Ask them to let you know", "End with a closing"]
    },
    s12: {
      tr: "Next Monday at 10.30 you have an appointment at the gemeente for a new passport, but you cannot go. Write an email to the gemeente. Say that you cannot come and explain why. Ask for a new appointment.",
      points: ["Start with a greeting", "Say that you cannot come", "Give the reason", "Ask for a new appointment", "End with a closing"]
    }
  },
  spreken: {
    p1: { tr: "Where do you live and how long have you lived there?", tip: "Keep it short but use full sentences. For how long, use the pattern al ... jaar, for example Ik woon hier al drie jaar." },
    p2: { tr: "What work do you do? Or what do you do during the day?", tip: "It is fine if you do not work. You can say Ik zorg voor mijn kinderen or Ik leer Nederlands, for example." },
    p3: { tr: "Tell me something about your family.", tip: "For ages use the pattern is ... jaar. Saying how many of you there are and their ages is enough." },
    p4: { tr: "What do you like to do in your free time?", tip: "graag comes after the verb, as in Ik wandel graag. One or two examples are enough." },
    p5: { tr: "How do you get to work or school?", tip: "For transport say met de fiets, met de bus or met de trein. Adding how long it takes makes your answer better." },
    p6: { tr: "What do you usually eat for breakfast?", tip: "meestal means usually and makes your answer sound very natural. You can compare weekdays with the weekend." },
    p7: { tr: "Which languages do you speak?", tip: "Show your level with words like een beetje or goed. The sentence Nu leer ik Nederlands always works." },
    p8: { tr: "What did you do last weekend?", tip: "Use the past tense. Learn the patterns heb ik ... gedaan and zijn we ... gegaan by heart, they are very useful." },
    p9: { tr: "What does your home look like?", tip: "Say how many rooms there are, which floor it is on and one feature. Sentences starting with Het heeft ... are the easiest." },
    p10: { tr: "What do you do when you are sick?", tip: "In a sentence starting with Als, the verb comes right after the comma, as in Als ik ziek ben, blijf ik thuis." },
    p11: { tr: "Why are you learning Dutch?", tip: "After omdat the verb goes to the end of the sentence. One or two concrete reasons are enough." },
    p12: { tr: "Which celebration do you like and what do you do then?", tip: "The verb comes right after Dan, as in Dan bezoek ik. You can talk about your own celebration, that is completely fine." },
    p13: { tr: "You are in a shop. You want to exchange a pair of trousers because they are too small. What do you say?", tip: "First greet, then say the problem and ask your request as a question. Showing the receipt, the kassabon, earns you extra points." },
    p14: { tr: "You call the huisarts. You have had a headache for a week. You want to make an appointment. What do you say?", tip: "On the phone introduce yourself with met ... and your name. Briefly describe your complaint and how long you have had it." },
    p15: { tr: "You are late for work because the train was delayed. What do you say to your manager?", tip: "Apologise, give the reason and suggest a solution. Dutch managers like it when you offer a solution." },
    p16: { tr: "Your neighbour plays loud music late every evening. You want him to turn it down. What do you say?", tip: "Be polite but clear. A question starting with Wilt u ... softens your request." },
    p17: { tr: "You are at the station. You do not know which platform the train to Amsterdam leaves from. What do you ask?", tip: "Start with Pardon. You will hear the phrase Van welk spoor a lot at the station." },
    p18: { tr: "It is your colleague's birthday today. What do you say?", tip: "The magic word here is Gefeliciteerd. If you ask a small question, the conversation keeps going." },
    p19: { tr: "You are in a restaurant. Your food is cold. What do you say to the waiter?", tip: "helaas makes your complaint sound polite. When asking for something, use the pattern Kunt u ..." },
    p20: { tr: "Your son is sick. He cannot go to school today. You call the school. What do you say?", tip: "Say who you are and your child's name and class. Here you let the school know in the morning before lessons start." },
    p21: { tr: "You are at a birthday party. Someone offers you another piece of cake, but you do not want any more. What do you say?", tip: "Saying Nee, dank je wel is not rude at all here. Praising the cake is a nice touch." },
    p22: { tr: "You are looking for the town hall. You ask someone in the street for directions. What do you say?", tip: "Address people you do not know with u. And do not forget to say thank you." },
    p23: { tr: "What do you think is better, living in a city or in a village? Why?", tip: "First give your opinion, then two reasons with want and omdat. Mentioning one advantage of the other option earns extra points." },
    p24: { tr: "Do you prefer to go to work by bike or by car? Why?", tip: "liever expresses a preference. After want the sentence continues normally, after omdat the verb goes to the end." },
    p25: { tr: "Do you think it is important for children to do sports? Why?", tip: "Give an example from your own life. In a sentence starting with Ik denk dat the verb goes to the end." },
    p26: { tr: "Describe a celebration from your country. What do people do then?", tip: "Say when it is, who you celebrate with and what people do. At the end add your own opinion with omdat." },
    p27: { tr: "What do you think of the weather in the Netherlands? Why?", tip: "It is fine to give a negative opinion. For comparing use words like warmer and vaker." },
    p28: { tr: "What do you think is better, grocery shopping in a shop or online? Why?", tip: "Briefly mention both options. Then use maar to come back to your own preference." },
    p29: { tr: "What is different in the Netherlands compared to your country? Tell and explain.", tip: "Compare two concrete differences. The afspraak culture also comes up often in the KNM exam." },
    p30: { tr: "Do you think it is good that shops are open on Sundays? Why?", tip: "Start with Ik vind het goed dat. Adding a counterpoint with maar makes your answer stronger." }
  },
};
if (typeof module !== 'undefined') module.exports = { EN_CONTENT };
