'use strict';
/* A2 Nederlands. Veri dosyalari vocab.js, grammar.js, content.js, knm.js, lexicon.js, lexicon-en.js, content-en.js */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const DAY = 86400000;
const EN = typeof I18N_EN !== 'undefined' ? I18N_EN : {};

/* ---------- arayuz metinleri ---------- */

const STR = {
  tr: {
    tab_home: 'Bugün', tab_words: 'Kelimeler', tab_practice: 'Pratik', tab_exam: 'Sınav', tab_me: 'Profil',
    back: 'Geri', start: 'Başla', again: 'Tekrar', next: 'Sonraki ›', result: 'Sonuç', check: 'Kontrol et', finish: 'Bitir',
    list_back: 'Listeye dön', listen: '🔊 Dinle',
    who_title: 'Kim çalışıyor?', who_sub: 'Her profilin ilerlemesi ve ayarları ayrı tutulur.', who_add: 'Yeni profil', new_title: 'Yeni profil', new_name: 'İsim', new_icon: 'Simge', new_create: 'Profili oluştur', new_err: 'Bir isim yaz', new_dup: 'Bu isimde bir profil zaten var',
    me_delete: 'Profili sil', me_delete_q: '{name} profili ve tüm ilerlemesi silinecek. Emin misin?', me_voices_all: 'Telefondaki Hollandaca sesler', me_voices_reload: 'Ses listesini yenile', me_voices_help: 'Aynı isimli sesler olabilir, Safari bunları ayırt etmez. Her birini ▶ ile dinle, en anlaşılır olanı yukarıdaki menüden seç.', sp_autostop: 'Susunca kendiliğinden durur',
    exam_left: 'Sınava kalan', exam_today: 'Sınav bugün, succes! 🍀', exam_past: 'Sınav tarihi geçti', exam_set: 'Sınav tarihini Profil\'den gir',
    days: '{n} gün', hello: 'Hoi {name} 👋', home_sub: '{w} kelime çalışıldı · bugünkü plan {d}/{t}',
    plan_title: 'Bugünkü plan', plan_cards: 'Flashcard tekrarı', plan_cards_s: 'Bugün {c} kart · {d} kart sırada',
    plan_lezen: '1 okuma metni', plan_luisteren: '1 dinleme', plan_knm: '5 KNM sorusu', plan_knm_s: 'Bugün {n}/5',
    plan_spreken: '1 Spreken sorusu', plan_spreken_s: 'Kaydet, dinle, kontrol ettir', plan_schrijven: '1 Schrijven görevi', plan_schrijven_s: 'Yaz, düzeltilmiş halini gör',
    skills: 'Beceriler', no_data: 'henüz veri yok', pct_right: '%{p} doğru · {n} soru', tasks_n: '{d}/{t} görev', q_n: '{d}/{t} soru',
    home_note: 'Format A2 inburgeringsexamen\'e göre. Resmi DUO oefenexamens\'leri de mutlaka çöz, link Profil\'de.',
    words_title: '📇 Kelimeler', words_due: '{d} tekrar · {n} yeni', words_srs: 'Spaced repetition. Bildiğin kartlar seyrekleşir, zorlandıkların sık gelir.',
    words_start: 'Kartlara başla', dehet_title: 'De of het', dehet_sub: '60 saniyelik hız oyunu', type_title: 'Yazarak', type_sub: 'Anlamdan Hollandacaya yaz', themes: 'Temalar',
    theme_learn: 'Bu temayı çalış', theme_type: 'Yazarak test',
    m_new: 'yeni', m_perm: 'kalıcı', m_good: 'iyi', m_learning: 'öğreniliyor',
    f_new: '🆕 Yeni kelime', f_rev: '🔁 Tekrar zamanı gelen kelime', f_left: 'Kart {i} / {n}', f_tap: 'Anlamını hatırlıyor musun? Önce düşün, sonra kartı çevir.', f_tap_rev: 'Bunun Hollandacası ne? Önce düşün, sonra kartı çevir.', f_show: 'Kartı çevir 👆', f_word: '🔊 kelime', f_sent: '🔊 cümle',
    f_q: 'Bu kelimeyi biliyor muydun?', f_help: 'Dürüst seç. Bilmediğin kelimeler sık, bildiklerin seyrek karşına çıkar. Böylece günde birkaç dakikayla kelimeler kalıcı olur.', f_ex_hint: 'Cümledeki kelimelere dokun, tek tek anlamını gör.',
    r_again: '❌ Bilmiyordum', r_hard: '😓 Zor hatırladım', r_good: '🙂 Bildim', r_easy: '😎 Çok kolaydı', min1: 'Birazdan tekrar sorulur', d_1: 'Yarın tekrar sorulur', d_n: '{n} gün sonra tekrar sorulur',
    f_done: 'Bugünlük bu kadar', f_done_s: '{n} kart çalıştın. Yarın tekrar gel, streak devam etsin.', f_more: 'Yeni kelime ekle', f_dh: 'De of het oyna',
    dh_intro: '60 saniyede olabildiğince çok ismin artikelini bil. Yanlışta doğrusu gösterilir.', dh_best: 'Rekor {n}', dh_score: '{s} doğru / {t}', dh_again: 'Tekrar oyna',
    dh_tip: '<b>Tip</b><br>-je, -tje, -pje ile biten küçültmeler hep het. Kişiler ve çoğullar hep de. -heid, -ing, -tie ile bitenler de. Kabaca üç kelimeden ikisi de-woord.',
    sec: '{n} sn', ty_prompt: 'Hollandacasını yaz', ty_art: ', artikeliyle', ty_ok: '✅ Doğru, <b>{w}</b>', ty_noart: '🟡 Kelime doğru, artikel eksik. <b>{w}</b>', ty_wrongart: '🟡 Artikel yanlış. <b>{w}</b>', ty_wrong: '❌ Doğrusu <b>{w}</b>', ty_round: 'Yeni tur', ty_res: 'Yanlış yazdıkların tekrar listesine eklendi.',
    q_of: 'Soru {i}/{n}', score: 'Skor {n}',
    practice_title: '🧩 Pratik', s_lezen: 'Okuma', s_luisteren: 'Dinleme', s_schrijven: 'Yazma', s_spreken: 'Konuşma', s_knm: 'Toplum bilgisi · {n} soru', s_gram: '{n} ders + fiil çekimi',
    practice_tip: 'Hollandaca her kelimeye dokununca anlamı çıkar. Cevap şıklarında kelimeye basılı tut.',
    info_lezen: 'Kısa metinler, çoktan seçmeli sorular. Bilmediğin kelimeye dokun, anlamı çıksın.',
    info_luisteren: 'Önce soruları oku, sonra dinle. Bittiğinde metni de görürsün.',
    info_schrijven: 'Form doldur ya da kısa mesaj yaz. Uygulama metnini düzeltip değişiklikleri tek tek gösterir.',
    info_spreken: 'Soruyu dinle, cevabını kaydet, söylediğin metni kontrol ettir, örnek cevapla karşılaştır.',
    sp_part1: 'Kısa cevap', sp_part2: 'Duruma tepki', sp_part3: 'Fikir ve açıklama',
    read_aloud: '🔊 Sesli oku', tap_hint: 'Kelimeye dokun, anlamını gör', not_in_dict: 'sözlükte yok', text: 'Metin',
    right_n: '{r}/{t} doğru', lu_listening: 'Dinleniyor...', lu_again: 'Tekrar dinle', lu_listen: 'Dinle', lu_count: '{n} kez dinlendi', lu_nomore: 'Sınav modunda dinleme hakkın bitti',
    w_form: 'Formulier', w_msg: 'Bericht', w_placeholder: 'Schrijf hier...', w_words: '{n} kelime', w_min: ' · en az {n}',
    w_checking: 'Kontrol ediliyor...', w_fixed: 'Düzeltilmiş halin', w_changes: 'Değişiklikler', w_nochange: 'Düzeltilecek bir şey bulunamadı 👌', w_points: 'İstenen noktalar',
    w_fields_empty: '{n} alan boş', w_fields_ok: 'Tüm alanlar dolu', w_sentence: '{f} tam cümle mi, büyük harfle başlayıp noktayla bitiyor mu',
    w_len: 'Uzunluk {n} kelime, en az {m}', w_model: 'Örnek cevap', w_basic_note: 'Bu temel kontrol. de/het, fiil çekimi, büyük harf gibi bilinen hataları düzeltir. Tam düzeltme için Profil\'den Claude API anahtarı ekle.',
    w_ai_note: 'Claude tarafından düzeltildi', w_score: 'Puan {n}/5', w_empty: 'Önce bir şey yaz 🙂',
    sp_rec_start: 'Kayda başla', sp_ready: 'Kaydın hazır', sp_transcript: 'Söylediğin metin', sp_transcript_ph: 'Konuştuğun metin burada görünür. İstersen kendin de yazabilirsin.',
    sp_sr: 'Konuş, yazıya dökülsün', sp_sr_s: 'Söylediğin Hollandaca metne çevrilir', sp_sr_stop: 'Bitir', sp_listening: 'Dinliyorum, Hollandaca konuş...', sp_rec: 'Sesimi kaydet', sp_rec_s: 'Sonra kendini dinle', sp_rec_stop: 'Kaydı bitir', sp_busy: 'Önce diğer kaydı bitir',
    sp_sr_none: 'Bu cihazda ses tanıma yok. Klavyedeki 🎤 ile dikte et.', sp_sr_denied: 'Ses tanımaya izin verilmedi. Ayarlar › Safari › Mikrofon ve Konuşma Tanıma izinlerini aç ya da klavyedeki 🎤 ile dikte et.', sp_sr_nospeech: 'Ses duyulmadı, tekrar dene', sp_sr_err: 'Ses tanıma durdu, {e}. Klavyedeki 🎤 ile dikte edebilirsin.', sp_rec_empty: 'Kayıt boş geldi. Mikrofon iznini kontrol et.',
    sp_dict_q: 'Ses tanıma çalışmıyorsa ne yapayım?', sp_dict_a: 'Metin kutusuna dokun, klavyede 🌐 ile Nederlands klavyeye geç, sonra 🎤 tuşuna basıp konuş. iPhone söylediğini yazıya döker. Nederlands klavye yoksa Ayarlar › Genel › Klavye › Klavyeler › Yeni Klavye Ekle › Nederlands.',
    sp_model_show: 'Örnek cevabı göster', sp_model_hide: 'Örnek cevabı gizle', sp_check: 'Cevabımı kontrol et', sp_need_text: 'Kontrol için söylediğin metin lazım. Kayıt yap ya da yaz.',
    sp_nomic: 'Mikrofon izni lazım. Ayarlar, Safari, Mikrofon', sp_norec: 'Bu tarayıcı ses kaydını desteklemiyor',
    sp_eval: 'Değerlendirme', sp_answers: 'Soruya cevap veriyor', sp_len: 'Uzunluk {n} kelime, hedef en az {m}', sp_sent: '{n} cümle', sp_conn: 'omdat veya want ile gerekçe', sp_keywords: 'Konuyla ilgili kelimeler', sp_better: 'Daha iyi bir A2 cevabı',
    knm_title: '🏛️ KNM', knm_info: 'Kennis van de Nederlandse Maatschappij. Kurumlar, kurallar, günlük hayat. Her sorudan sonra kısa açıklama gelir.',
    knm_mix: 'Karışık 10', knm_mix_s: 'Rastgele sorular', knm_wrong: 'Hatalarım', knm_n: '{n} soru', knm_nowrong: 'Henüz hata yok 🎉', knm_res: 'Yanlışlar Hatalarım listesine eklendi.', no_q: 'Soru yok.',
    gram_title: '🔧 Grammatica', gram_verbs: 'Fiil çekimi', gram_verbs_s: '{n} fiil, 3 zaman', gram_mix: 'Karışık test', gram_mix_s: 'Tüm derslerden 12 soru', lessons: 'Dersler', gram_go: 'Alıştırmaya başla · {n} soru',
    gram_done: 'Ders tamam ✅', gram_need: '%70 ve üstüyle ders tamamlanır', t_nu: 'şimdiki zaman', t_perf: 'perfectum', t_verl: 'imperfectum',
    exam_title: '📝 Deneme sınavı', exam_info: 'Süreli deneme. Sonuçlar kaydedilir. Geçme çizgisi yaklaşık %70 olarak gösterilir, resmi puanlamayı DUO yapar.',
    ex_knm40: 'KNM tam deneme', ex_knm40_s: '40 soru · 45 dakika', ex_knm20: 'KNM kısa deneme', ex_knm20_s: '20 soru · 22 dakika', ex_lezen: 'Lezen deneme', ex_lezen_s: '5 metin · 25 dakika', ex_lu: 'Luisteren deneme', ex_lu_s: '6 parça · en fazla 2 dinleme',
    ex_hist: 'Geçmiş denemeler', ex_pass: 'Geçme çizgisinin üstündesin', ex_fail: 'Biraz daha pratik, hatalara aşağıdan bak', ex_wrong: 'Yanlışlar', ex_empty: 'boş bırakıldı',
    ex_prev: '‹ Önceki', ex_answered: '{n} cevaplandı', ex_confirm_empty: '{n} soru boş. Yine de bitirilsin mi?', ex_time: 'Süre doldu', ex_confirm: 'Deneme bitirilsin mi?', ex_score: 'Bitir ve puanla', ex_text: 'Tekst {n}', ex_frag: 'Fragment {i}/{n}', ex_plays: '{n}/2 dinleme', ex_read_first: 'Önce soruları oku, sonra dinle.', ex_next_frag: 'Sonraki fragment ›',
    me_title: '⚙️ Profil', me_profile: 'Profil', me_switch: 'değiştir', me_exam_date: 'Sınav tarihi', me_new: 'Günlük yeni kelime', me_goal: 'Günlük kart hedefi', me_tr: 'Çeviriyi göster', me_lang: 'Uygulama dili',
    me_voice: 'Ses', me_rate: 'Konuşma hızı', me_vf: 'Kadın ses', me_vm: 'Erkek ses', me_auto: 'Otomatik, en iyisi', me_test: '🔊 Test et',
    me_voice_q: 'Aktif sesler', q_premium: 'Premium', q_enhanced: 'Enhanced', q_standard: 'Standart',
    me_voice_help: 'En anlaşılır ses için iPhone\'da Ayarlar › Erişilebilirlik › Seslendirilen İçerik › Sesler › Nederlands yolundan <b>Xander</b> ve <b>Claire</b>\'in Enhanced versiyonunu indir. Uygulama indirilen sesi otomatik seçer.',
    me_voice_none: 'Hollandaca ses bulunamadı.', me_voice_found: '{n} Hollandaca ses bulundu.',
    me_ai: 'Claude ile düzeltme', me_ai_help: 'Schrijven ve Spreken cevaplarını Claude düzeltir ve puanlar. Anahtar sadece bu cihazda durur, metinler Anthropic\'e gönderilir. Anahtarı console.anthropic.com\'dan alırsın.',
    me_ai_key: 'API anahtarı', me_ai_save: 'Kaydet', me_ai_test: 'Bağlantıyı test et', me_ai_ok: 'Bağlantı tamam ✅', me_ai_err: 'Hata, {e}', me_ai_removed: 'Anahtar silindi', me_ai_saved: 'Anahtar kaydedildi', me_ai_on: 'Açık', me_ai_off: 'Kapalı, temel kontrol kullanılıyor',
    me_stats: 'İstatistik', me_seen: 'kelime görüldü', me_perm: 'kalıcı kelime', me_streak: '{n} gün', me_streak_l: 'streak', me_exams: 'deneme sınavı',
    me_src: 'Resmi kaynaklar', me_src1: 'inburgeren.nl, DUO sınav bilgisi ve resmi oefenexamens', me_src2: 'IND, naturalisatie için inburgering şartı', me_src_note: 'Kurallar değişebilir. Kayıt olmadan önce DUO ve IND sayfalarına bak.',
    me_backup: 'Yedek', me_backup_note: 'İlerleme sadece bu cihazda duruyor. Arada bir yedek al.', me_exp: 'Yedeği indir', me_imp: 'Yedeği yükle', me_reset: 'Bu profili sıfırla', me_reset_q: '{name} profilinin tüm ilerlemesi silinecek. Emin misin?', me_imp_ok: 'Yedek yüklendi', me_imp_bad: 'Geçersiz dosya',
    ai_err_key: 'API anahtarı geçersiz, temel kontrol kullanıldı', ai_err_net: 'Claude\'a ulaşılamadı, temel kontrol kullanıldı', ai_err_refusal: 'Model bu isteği cevaplamadı',
    fix_art: '{n} bir {a}-woord', fix_verb: '{p} ile fiil {f} olur', fix_cap: 'Cümle büyük harfle başlar', fix_space: 'Fazla boşluk', fix_spell: 'Yazım',
    no_tts: 'Bu cihazda konuşma sentezi yok',
    w_lt_note: 'LanguageTool ile ücretsiz düzeltildi. Yazım ve dilbilgisi hatalarını yakalar ama puan ve geri bildirim vermez. Daha detaylı düzeltme için Profil\'den Claude API anahtarı ekleyebilirsin.', w_lt_fail: 'LanguageTool\'a ulaşılamadı, offline temel kontrol kullanıldı',
    me_lt: 'Ücretsiz LanguageTool düzeltmesi', me_lt_help: 'Anahtar gerekmez. Schrijven ve Spreken metnin languagetool.org\'a gönderilir ve Hollandaca yazım ve dilbilgisi hataları düzeltilir. Claude anahtarı varsa Claude kullanılır.',
  },
  en: {
    tab_home: 'Today', tab_words: 'Words', tab_practice: 'Practice', tab_exam: 'Exam', tab_me: 'Profile',
    back: 'Back', start: 'Start', again: 'Again', next: 'Next ›', result: 'Result', check: 'Check', finish: 'Finish',
    list_back: 'Back to list', listen: '🔊 Listen',
    who_title: 'Who is studying?', who_sub: 'Each profile keeps its own progress and settings.', who_add: 'New profile', new_title: 'New profile', new_name: 'Name', new_icon: 'Icon', new_create: 'Create profile', new_err: 'Enter a name', new_dup: 'A profile with this name already exists',
    me_delete: 'Delete profile', me_delete_q: 'The {name} profile and all its progress will be deleted. Are you sure?', me_voices_all: 'Dutch voices on this phone', me_voices_reload: 'Refresh voice list', me_voices_help: 'There can be voices with the same name, Safari does not tell them apart. Play each with ▶ and pick the clearest one in the menus above.', sp_autostop: 'Stops by itself when you stop talking',
    exam_left: 'Until the exam', exam_today: 'Exam today, succes! 🍀', exam_past: 'Exam date has passed', exam_set: 'Set your exam date in Profile',
    days: '{n} days', hello: 'Hoi {name} 👋', home_sub: '{w} words studied · today\'s plan {d}/{t}',
    plan_title: 'Today\'s plan', plan_cards: 'Flashcard review', plan_cards_s: '{c} cards today · {d} due',
    plan_lezen: '1 reading text', plan_luisteren: '1 listening', plan_knm: '5 KNM questions', plan_knm_s: '{n}/5 today',
    plan_spreken: '1 speaking question', plan_spreken_s: 'Record, listen, get it checked', plan_schrijven: '1 writing task', plan_schrijven_s: 'Write, see the corrected version',
    skills: 'Skills', no_data: 'no data yet', pct_right: '{p}% correct · {n} questions', tasks_n: '{d}/{t} tasks', q_n: '{d}/{t} questions',
    home_note: 'Built on the A2 inburgeringsexamen format. Also do the official DUO practice exams, link in Profile.',
    words_title: '📇 Words', words_due: '{d} due · {n} new', words_srs: 'Spaced repetition. Cards you know come back less often, hard ones more often.',
    words_start: 'Start cards', dehet_title: 'De or het', dehet_sub: '60 second speed game', type_title: 'Typing', type_sub: 'Type the Dutch word', themes: 'Themes',
    theme_learn: 'Study this theme', theme_type: 'Typing test',
    m_new: 'new', m_perm: 'mastered', m_good: 'good', m_learning: 'learning',
    f_new: '🆕 New word', f_rev: '🔁 Word due for review', f_left: 'Card {i} / {n}', f_tap: 'Do you remember what it means? Think first, then flip the card.', f_tap_rev: 'What is this in Dutch? Think first, then flip the card.', f_show: 'Flip the card 👆', f_word: '🔊 word', f_sent: '🔊 sentence',
    f_q: 'Did you know this word?', f_help: 'Be honest. Words you don\'t know come back often, words you know come back rarely. A few minutes a day makes them stick.', f_ex_hint: 'Tap the words in the sentence to see their meaning.',
    r_again: '❌ I didn\'t know', r_hard: '😓 Hard to recall', r_good: '🙂 I knew it', r_easy: '😎 Very easy', min1: 'Asked again in a minute', d_1: 'Asked again tomorrow', d_n: 'Asked again in {n} days',
    f_done: 'All done for today', f_done_s: 'You studied {n} cards. Come back tomorrow to keep your streak.', f_more: 'Add new words', f_dh: 'Play de or het',
    dh_intro: 'Get as many articles right as you can in 60 seconds. Mistakes show the right answer.', dh_best: 'Best {n}', dh_score: '{s} right / {t}', dh_again: 'Play again',
    dh_tip: '<b>Tip</b><br>Diminutives ending in -je, -tje, -pje are always het. People and plurals are always de. Words ending in -heid, -ing, -tie are de. Roughly two out of three nouns are de-words.',
    sec: '{n} s', ty_prompt: 'Type the Dutch word', ty_art: ', with article', ty_ok: '✅ Correct, <b>{w}</b>', ty_noart: '🟡 Word is right, article missing. <b>{w}</b>', ty_wrongart: '🟡 Wrong article. <b>{w}</b>', ty_wrong: '❌ Correct answer <b>{w}</b>', ty_round: 'New round', ty_res: 'Missed words were added back to your review queue.',
    q_of: 'Question {i}/{n}', score: 'Score {n}',
    practice_title: '🧩 Practice', s_lezen: 'Reading', s_luisteren: 'Listening', s_schrijven: 'Writing', s_spreken: 'Speaking', s_knm: 'Dutch society · {n} questions', s_gram: '{n} lessons + verb drills',
    practice_tip: 'Tap any Dutch word to see its meaning. In answer options, press and hold the word.',
    info_lezen: 'Short texts with multiple choice questions. Tap a word you don\'t know to see its meaning.',
    info_luisteren: 'Read the questions first, then listen. When you finish you also see the transcript.',
    info_schrijven: 'Fill in a form or write a short message. The app corrects your text and shows every change.',
    info_spreken: 'Listen to the question, record your answer, get your words checked, compare with a model answer.',
    sp_part1: 'Short answer', sp_part2: 'React to a situation', sp_part3: 'Opinion and explanation',
    read_aloud: '🔊 Read aloud', tap_hint: 'Tap a word to see its meaning', not_in_dict: 'not in dictionary', text: 'Transcript',
    right_n: '{r}/{t} correct', lu_listening: 'Playing...', lu_again: 'Listen again', lu_listen: 'Listen', lu_count: 'played {n} times', lu_nomore: 'No more plays left in exam mode',
    w_form: 'Form', w_msg: 'Message', w_placeholder: 'Schrijf hier...', w_words: '{n} words', w_min: ' · at least {n}',
    w_checking: 'Checking...', w_fixed: 'Your corrected text', w_changes: 'Changes', w_nochange: 'Nothing to fix 👌', w_points: 'Required points',
    w_fields_empty: '{n} fields empty', w_fields_ok: 'All fields filled', w_sentence: '{f} is a full sentence with a capital and a full stop',
    w_len: 'Length {n} words, at least {m}', w_model: 'Model answer', w_basic_note: 'This is the basic check. It fixes known errors like de/het, verb agreement and capitals. For a full correction add a Claude API key in Profile.',
    w_ai_note: 'Corrected by Claude', w_score: 'Score {n}/5', w_empty: 'Write something first 🙂',
    sp_rec_start: 'Start recording', sp_ready: 'Recording ready', sp_transcript: 'What you said', sp_transcript_ph: 'What you say appears here. You can also type.',
    sp_sr: 'Speak, turn it into text', sp_sr_s: 'What you say is written out in Dutch', sp_sr_stop: 'Stop', sp_listening: 'Listening, speak Dutch...', sp_rec: 'Record my voice', sp_rec_s: 'Then listen to yourself', sp_rec_stop: 'Stop recording', sp_busy: 'Finish the other recording first',
    sp_sr_none: 'Speech recognition is not available. Use the 🎤 on your keyboard to dictate.', sp_sr_denied: 'Speech recognition was not allowed. Turn on Microphone and Speech Recognition in Settings › Safari, or use the 🎤 on your keyboard to dictate.', sp_sr_nospeech: 'No speech heard, try again', sp_sr_err: 'Speech recognition stopped, {e}. You can dictate with the 🎤 on your keyboard.', sp_rec_empty: 'The recording was empty. Check the microphone permission.',
    sp_dict_q: 'What if speech recognition does not work?', sp_dict_a: 'Tap the text box, switch to the Dutch keyboard with 🌐, then tap 🎤 and speak. Your iPhone writes out what you say. No Dutch keyboard yet? Settings › General › Keyboard › Keyboards › Add New Keyboard › Dutch.',
    sp_model_show: 'Show model answer', sp_model_hide: 'Hide model answer', sp_check: 'Check my answer', sp_need_text: 'Your spoken text is needed. Record or type it.',
    sp_nomic: 'Microphone permission needed. Settings, Safari, Microphone', sp_norec: 'This browser cannot record audio',
    sp_eval: 'Evaluation', sp_answers: 'Answers the question', sp_len: 'Length {n} words, target at least {m}', sp_sent: '{n} sentences', sp_conn: 'Reason with omdat or want', sp_keywords: 'Words related to the topic', sp_better: 'A better A2 answer',
    knm_title: '🏛️ KNM', knm_info: 'Knowledge of Dutch society. Institutions, rules, daily life. Each question comes with a short explanation.',
    knm_mix: 'Mixed 10', knm_mix_s: 'Random questions', knm_wrong: 'My mistakes', knm_n: '{n} questions', knm_nowrong: 'No mistakes yet 🎉', knm_res: 'Mistakes were added to My mistakes.', no_q: 'No questions.',
    gram_title: '🔧 Grammar', gram_verbs: 'Verb drill', gram_verbs_s: '{n} verbs, 3 tenses', gram_mix: 'Mixed test', gram_mix_s: '12 questions from all lessons', lessons: 'Lessons', gram_go: 'Start exercises · {n} questions',
    gram_done: 'Lesson complete ✅', gram_need: '70% or more completes the lesson', t_nu: 'present', t_perf: 'perfect', t_verl: 'simple past',
    exam_title: '📝 Practice exam', exam_info: 'Timed practice. Results are saved. The pass line is shown at about 70%, DUO does the official scoring.',
    ex_knm40: 'KNM full exam', ex_knm40_s: '40 questions · 45 minutes', ex_knm20: 'KNM short exam', ex_knm20_s: '20 questions · 22 minutes', ex_lezen: 'Reading exam', ex_lezen_s: '5 texts · 25 minutes', ex_lu: 'Listening exam', ex_lu_s: '6 fragments · max 2 plays',
    ex_hist: 'Past exams', ex_pass: 'You are above the pass line', ex_fail: 'A bit more practice, review your mistakes below', ex_wrong: 'Mistakes', ex_empty: 'left blank',
    ex_prev: '‹ Previous', ex_answered: '{n} answered', ex_confirm_empty: '{n} questions are blank. Finish anyway?', ex_time: 'Time is up', ex_confirm: 'Finish the exam?', ex_score: 'Finish and score', ex_text: 'Text {n}', ex_frag: 'Fragment {i}/{n}', ex_plays: '{n}/2 plays', ex_read_first: 'Read the questions first, then listen.', ex_next_frag: 'Next fragment ›',
    me_title: '⚙️ Profile', me_profile: 'Profile', me_switch: 'switch', me_exam_date: 'Exam date', me_new: 'New words per day', me_goal: 'Daily card goal', me_tr: 'Show translations', me_lang: 'App language',
    me_voice: 'Voice', me_rate: 'Speaking rate', me_vf: 'Female voice', me_vm: 'Male voice', me_auto: 'Automatic, best', me_test: '🔊 Test',
    me_voice_q: 'Active voices', q_premium: 'Premium', q_enhanced: 'Enhanced', q_standard: 'Standard',
    me_voice_help: 'For the clearest voice, on iPhone go to Settings › Accessibility › Spoken Content › Voices › Dutch and download the Enhanced version of <b>Xander</b> and <b>Claire</b>. The app picks the downloaded voice automatically.',
    me_voice_none: 'No Dutch voice found.', me_voice_found: '{n} Dutch voices found.',
    me_ai: 'Correction with Claude', me_ai_help: 'Claude corrects and scores your Writing and Speaking answers. The key stays on this device only, texts are sent to Anthropic. Get a key at console.anthropic.com.',
    me_ai_key: 'API key', me_ai_save: 'Save', me_ai_test: 'Test connection', me_ai_ok: 'Connection OK ✅', me_ai_err: 'Error, {e}', me_ai_removed: 'Key removed', me_ai_saved: 'Key saved', me_ai_on: 'On', me_ai_off: 'Off, using the basic check',
    me_stats: 'Stats', me_seen: 'words seen', me_perm: 'words mastered', me_streak: '{n} days', me_streak_l: 'streak', me_exams: 'practice exams',
    me_src: 'Official sources', me_src1: 'inburgeren.nl, DUO exam info and official practice exams', me_src2: 'IND, integration requirement for naturalisation', me_src_note: 'Rules can change. Check the DUO and IND pages before you register.',
    me_backup: 'Backup', me_backup_note: 'Progress is stored on this device only. Make a backup now and then.', me_exp: 'Download backup', me_imp: 'Load backup', me_reset: 'Reset this profile', me_reset_q: 'All progress of {name} will be deleted. Are you sure?', me_imp_ok: 'Backup loaded', me_imp_bad: 'Invalid file',
    ai_err_key: 'Invalid API key, basic check used', ai_err_net: 'Could not reach Claude, basic check used', ai_err_refusal: 'The model declined this request',
    fix_art: '{n} is a {a}-word', fix_verb: 'with {p} the verb is {f}', fix_cap: 'A sentence starts with a capital', fix_space: 'Extra space', fix_spell: 'Spelling',
    no_tts: 'Speech synthesis is not available on this device',
    w_lt_note: 'Corrected for free by LanguageTool. It catches spelling and grammar errors but gives no score or feedback. For a detailed correction you can add a Claude API key in Profile.', w_lt_fail: 'Could not reach LanguageTool, offline basic check used',
    me_lt: 'Free LanguageTool correction', me_lt_help: 'No key needed. Your Writing and Speaking text is sent to languagetool.org and Dutch spelling and grammar errors are fixed. If a Claude key is set, Claude is used instead.',
  },
};

/* ---------- veri hazirligi ---------- */

const WORDS = [];
VOCAB_THEMES.forEach(th => {
  th.words.trim().split('\n').forEach(line => {
    const [nl, tr, ex] = line.split('|').map(s => (s || '').trim());
    if (!nl) return;
    const m = /^(de|het)\s+(.+)$/.exec(nl);
    WORDS.push({ key: th.id + '|' + nl, nl, tr, ex, theme: th.id, art: m ? m[1] : null, bare: m ? m[2] : nl });
  });
});
const NOUNS = WORDS.filter(w => w.art);
const NOUN_ART = new Map();
NOUNS.forEach(w => { const k = w.bare.toLowerCase(); if (!k.includes(' ') && !NOUN_ART.has(k)) NOUN_ART.set(k, w.art); });

const DICT = new Map();
WORDS.forEach(w => { const k = w.bare.toLowerCase(); if (!DICT.has(k)) DICT.set(k, { nl: w.nl, w }); });
VERBS.forEach(v => {
  [v.inf, v.ik, v.jij, v.hij, v.wij, v.pv, v.perf].forEach(f => {
    if (!f) return;
    const first = String(f).split(' ')[0].toLowerCase();
    if (!DICT.has(first)) DICT.set(first, { nl: v.inf, v });
  });
});
function parseLex(src) { const m = new Map(); if (src) src.trim().split('\n').forEach(l => { const i = l.indexOf('|'); if (i > 0) m.set(l.slice(0, i).trim(), l.slice(i + 1).trim()); }); return m; }
const LEX = { tr: parseLex(typeof LEXICON !== 'undefined' ? LEXICON : ''), en: parseLex(typeof LEXICON_EN !== 'undefined' ? LEXICON_EN : '') };
/* Sozlukteki 'anlam · de woord' notlarindan tekil isimlerin artikelini de ogren */
LEX.tr.forEach((gloss, form) => { const m = /·\s*(de|het)\s+([a-zà-ÿ-]+)\s*$/i.exec(gloss); if (m && m[2].toLowerCase() === form && !NOUN_ART.has(form)) NOUN_ART.set(form, m[1].toLowerCase()); });

/* ---------- profil ve durum ---------- */

const DEFAULT_PROFILES = [{ id: 'burak', name: 'Burak', icon: '🧔🏻' }, { id: 'bahu', name: 'Bahu', icon: '👩🏻' }];
const PROFILE_ICONS = ['🧔🏻', '👩🏻', '👨🏻', '🧑🏻', '👧🏻', '👦🏻', '🧕🏻', '👵🏻', '👴🏻', '🙂'];
function readProfiles() { try { const p = JSON.parse(localStorage.getItem('a2.profiles') || 'null'); if (Array.isArray(p) && p.length) return p; } catch (e) { /* yok */ } return DEFAULT_PROFILES.slice(); }
let PROFILES = readProfiles();
function saveProfiles() { lsSet('a2.profiles', JSON.stringify(PROFILES)); }
const DEF = {
  srs: {}, xp: 0, streak: 0, lastDay: null,
  stats: { lezen: [0, 0], luisteren: [0, 0], knm: [0, 0], grammatica: [0, 0], woorden: [0, 0] },
  done: { lezen: [], luisteren: [], schrijven: [], spreken: [], grammar: [] },
  knmWrong: [], exams: [],
  day: { date: null, cards: 0, newCards: 0, lezen: 0, luisteren: 0, knm: 0, spreken: 0, schrijven: 0 },
  set: { examDate: '', newPerDay: 10, goal: 30, rate: 0.9, voiceF: '', voiceM: '', showTr: true, lang: 'tr', lt: true },
};
function deepMerge(a, b) { for (const k of Object.keys(b || {})) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], b[k]); else a[k] = b[k]; } return a; }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* depolama kapali */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* depolama kapali */ } }

/* Eski tek profilli kayit Burak profiline tasinir */
if (lsGet('a2.state.v1') && !lsGet('a2.state.v2.burak')) { lsSet('a2.state.v2.burak', lsGet('a2.state.v1')); lsDel('a2.state.v1'); }

let PROFILE = lsGet('a2.profile');
let S = null;
function stateKey(p) { return 'a2.state.v2.' + p; }
function loadProfile(p) {
  PROFILE = p;
  lsSet('a2.profile', p);
  let raw = null;
  try { raw = JSON.parse(lsGet(stateKey(p)) || 'null'); } catch (e) { raw = null; }
  S = deepMerge(JSON.parse(JSON.stringify(DEF)), raw || {});
}
function save() { if (!PROFILE) return; lsSet(stateKey(PROFILE), JSON.stringify(S)); renderTop(); }
function profName() { const p = PROFILES.find(x => x.id === PROFILE); return p ? p.name : ''; }

function lang() { return S && S.set.lang === 'en' ? 'en' : 'tr'; }
function t(k, vars) {
  let s = (STR[lang()] && STR[lang()][k]) || STR.tr[k] || k;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, v) => (vars[v] != null ? vars[v] : m));
  return s;
}

/* Icerik cevirileri, Ingilizce yoksa Turkceye duser */
const enOf = (sec, id) => (lang() === 'en' && EN[sec] && EN[sec][id]) || null;
const L10N = {
  word: w => (lang() === 'en' && EN.vocab && EN.vocab[w.nl]) || w.tr,
  verb: v => (lang() === 'en' && EN.verbs && EN.verbs[v.inf]) || v.tr,
  theme: th => (lang() === 'en' && EN.themes && EN.themes[th.id]) || th.title,
  knmQ: q => (lang() === 'en' ? (enOf('knm', q.id) || {}).q : q.tr) || '',
  knmEx: q => (enOf('knm', q.id) || {}).ex || q.ex || '',
  knmTheme: k => (lang() === 'en' ? (EN.knmThemes && EN.knmThemes[k]) : (typeof KNM_THEMES_TR !== 'undefined' && KNM_THEMES_TR[k])) || '',
  gTitle: g => (enOf('grammar', g.id) || {}).title || g.title,
  gBody: g => (enOf('grammar', g.id) || {}).body || g.body,
  gEx: (g, i) => ((enOf('grammar', g.id) || {}).ex || [])[i] || (g.drills[i] && g.drills[i].ex) || '',
  wTr: x => (enOf('schrijven', x.id) || {}).tr || x.tr,
  wPoint: (x, i) => ((enOf('schrijven', x.id) || {}).points || [])[i] || (x.points[i] && x.points[i].tr) || '',
  sTr: x => (enOf('spreken', x.id) || {}).tr || x.tr,
  sTip: x => (enOf('spreken', x.id) || {}).tip || x.tip || '',
  lex: k => LEX[lang()].get(k) || LEX.tr.get(k),
};

function dstr(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function rollDay() { const td = dstr(); if (S.day.date !== td) S.day = { date: td, cards: 0, newCards: 0, lezen: 0, luisteren: 0, knm: 0, spreken: 0, schrijven: 0 }; }
function activity(xp = 0) {
  rollDay();
  const td = dstr();
  if (S.lastDay !== td) {
    const y = dstr(new Date(Date.now() - DAY));
    S.streak = S.lastDay === y ? S.streak + 1 : 1;
    S.lastDay = td;
  }
  S.xp += xp;
}
function stat(k, ok) { S.stats[k] = S.stats[k] || [0, 0]; S.stats[k][1]++; if (ok) S.stats[k][0]++; }

function renderTop() {
  if (!S) return;
  const p = PROFILES.find(x => x.id === PROFILE);
  $('#who').textContent = p ? p.icon + ' ' + p.name : '';
  $('#streak').textContent = '🔥 ' + S.streak;
  $('#xp').textContent = S.xp + ' XP';
  const labels = { home: 'tab_home', words: 'tab_words', practice: 'tab_practice', exam: 'tab_exam', me: 'tab_me' };
  $$('#tabs button').forEach(b => { b.querySelector('em').textContent = t(labels[b.dataset.t]); });
  document.documentElement.lang = lang();
}
function toast(msg, ms = 2400) { const el = $('#toast'); el.innerHTML = msg; el.classList.remove('hidden'); clearTimeout(toast.tm); toast.tm = setTimeout(() => el.classList.add('hidden'), ms); }
function vib(p) { if (navigator.vibrate) navigator.vibrate(p); }

/* ---------- ses ---------- */

const TTS = {
  voices: [],
  load() {
    if (!('speechSynthesis' in window)) return;
    const seen = new Set();
    this.voices = speechSynthesis.getVoices().filter(v => /^nl/i.test(v.lang)).filter(v => { const k = this.id(v); if (seen.has(k)) return false; seen.add(k); return true; });
  },
  /* Safari ayni adla birden fazla ses verebiliyor, kimlik voiceURI ve dil ile kurulur */
  id(v) { return (v.voiceURI || v.name) + '|' + v.lang; },
  label(v) {
    const same = this.voices.filter(x => x.name === v.name && x.lang === v.lang);
    const n = same.length > 1 ? ' #' + (same.indexOf(v) + 1) : '';
    return v.name + n + ' · ' + v.lang + ' · ' + this.qualityLabel(v);
  },
  quality(v) {
    const id = (v.voiceURI || '') + ' ' + v.name;
    if (/premium/i.test(id)) return 3;
    if (/enhanced|verbeterd|gelişmiş|neural|natural|online|-super|\.super/i.test(id)) return 2;
    if (/compact/i.test(id)) return 1;
    return 1;
  },
  qualityLabel(v) { return v ? t(['', 'q_standard', 'q_enhanced', 'q_premium'][this.quality(v)]) : ''; },
  gender(v) {
    if (/claire|ellen|fleur|lotte|anna|femke|sara|colette|fenna|lisa|female|vrouw/i.test(v.name)) return 'f';
    if (/xander|frank|daan|ruben|maarten|arnaud|male|man\b/i.test(v.name)) return 'm';
    return '';
  },
  score(v, g) {
    let s = this.quality(v) * 10;
    if (/nl[-_]NL/i.test(v.lang)) s += 12;
    if (this.gender(v) === g) s += 4; else if (this.gender(v)) s -= 2;
    if (v.localService) s += 1;
    return s;
  },
  pick(g) {
    if (!this.voices.length) this.load();
    const want = g === 'm' ? S.set.voiceM : S.set.voiceF;
    const chosen = this.voices.find(x => this.id(x) === want) || this.voices.find(x => x.name === want);
    if (chosen) return chosen;
    const best = gg => this.voices.slice().sort((a, b) => this.score(b, gg) - this.score(a, gg))[0] || null;
    const m = best('m'), f = best('f');
    /* Kadin ses sadece gercekten kadin, nl-NL ve erkek ses kadar kaliteliyse kullanilir. Yoksa anlasilirlik icin erkek ses */
    if (g === 'f') return f && this.gender(f) === 'f' && /nl[-_]NL/i.test(f.lang) && this.quality(f) >= (m ? this.quality(m) : 0) ? f : (m || f);
    return m || f;
  },
  /* Uzun metni cumlelere boler. iOS uzun parcalarda sesi kesebiliyor, kisa parcalar da daha anlasilir */
  chunks(text) { return String(text).replace(/\n+/g, '. ').replace(/\.\s*\./g, '.').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => /[A-Za-zÀ-ÿ0-9]/.test(s)); },
  speak(text, g = 'f', onend) {
    if (!('speechSynthesis' in window)) { toast(t('no_tts')); if (onend) onend(); return; }
    this.stop();
    this._run(this.chunks(text).map(c => ({ t: c, g })), null, onend);
  },
  _run(items, onLine, onDone) {
    let i = 0;
    const token = {};
    this._token = token;
    const next = () => {
      if (this._token !== token) return;
      if (i >= items.length) { if (onDone) onDone(); return; }
      const it = items[i];
      if (onLine && it.line != null) onLine(it.line);
      i++;
      const u = new SpeechSynthesisUtterance(it.t);
      const v = this.pick(it.g);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'nl-NL';
      u.rate = S.set.rate;
      u.pitch = 1;
      u.onend = () => setTimeout(next, it.pause || 120);
      u.onerror = () => setTimeout(next, 50);
      speechSynthesis.speak(u);
    };
    next();
    return () => { if (this._token === token) this.stop(); };
  },
  seq(lines, onLine, onDone) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const items = [];
    lines.forEach((l, li) => { this.chunks(l.t).forEach((c, ci) => items.push({ t: c, g: l.g, line: ci === 0 ? li : null, pause: 120 })); if (items.length) items[items.length - 1].pause = 450; });
    return this._run(items, onLine, onDone);
  },
  stop() { this._token = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); },
};
if ('speechSynthesis' in window) { TTS.load(); speechSynthesis.onvoiceschanged = () => TTS.load(); document.addEventListener('visibilitychange', () => { if (!document.hidden) TTS.load(); }); }

/* ---------- Claude ile duzeltme ---------- */

const AI = {
  MODEL: 'claude-opus-5-5',
  SDK: './vendor/anthropic-sdk-0.127.0.mjs',
  key() { return lsGet('a2.apikey') || ''; },
  async client() {
    if (!this._cls) { const mod = await import(this.SDK); this._cls = mod.default || mod.Anthropic; }
    return new this._cls({ apiKey: this.key(), dangerouslyAllowBrowser: true, maxRetries: 1 });
  },
  explainLang() { return lang() === 'en' ? 'English' : 'Turkish, written the way Turkish people living in the Netherlands naturally talk, casual and clear, Dutch grammar terms may stay in Dutch'; },
  async ask(system, user, schema) {
    const client = await this.client();
    const res = await client.beta.messages.create({
      model: this.MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      system,
      messages: [{ role: 'user', content: user }],
    });
    if (res.stop_reason === 'refusal') throw new Error(t('ai_err_refusal'));
    const txt = (res.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    return JSON.parse(txt);
  },
  errMsg(e) {
    const st = e && e.status;
    if (st === 401 || st === 403) return t('ai_err_key');
    if (!st) return t('ai_err_net');
    return (e && e.message) || String(e);
  },
  CHANGE: { type: 'object', additionalProperties: false, required: ['from', 'to', 'why'], properties: { from: { type: 'string' }, to: { type: 'string' }, why: { type: 'string' } } },
  writing(task, text) {
    const schema = {
      type: 'object', additionalProperties: false,
      required: ['corrected_text', 'changes', 'points', 'score', 'feedback'],
      properties: {
        corrected_text: { type: 'string' },
        changes: { type: 'array', items: this.CHANGE },
        points: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['point', 'covered'], properties: { point: { type: 'string' }, covered: { type: 'boolean' } } } },
        score: { type: 'integer' },
        feedback: { type: 'string' },
      },
    };
    const system = `You are an experienced NT2 teacher who grades the Schrijven part of the Dutch inburgeringsexamen at level A2. The learner is an adult whose native language is Turkish.
Correct the learner's Dutch text with the smallest possible changes so it becomes correct, natural A2 Dutch. Keep the learner's own words, ideas and structure. Do not rewrite into a higher level and do not add new content, except a missing greeting or closing line when the task needs one.
corrected_text is the full corrected learner text with the original line breaks. For a form, return only the filled-in values, one per line, in the same order as the learner gave them.
changes lists every change, from is the original fragment, to is the corrected fragment, why is a short explanation in ${this.explainLang()}.
points checks every required point of the task, written in ${this.explainLang()}.
score is 1 to 5 where 3 means it would likely pass A2.
feedback is two or three short sentences in ${this.explainLang()} on what went well and the most important thing to improve.`;
    const user = `Task\n${task.prompt}\n\nRequired points\n${(task.points || []).map(p => '- ' + p.label).join('\n') || '- fill in every field correctly'}\n\nLearner text\n${text}`;
    return this.ask(system, user, schema);
  },
  speaking(item, text) {
    const schema = {
      type: 'object', additionalProperties: false,
      required: ['corrected_text', 'changes', 'answers_question', 'score', 'feedback', 'better_answer'],
      properties: {
        corrected_text: { type: 'string' },
        changes: { type: 'array', items: this.CHANGE },
        answers_question: { type: 'boolean' },
        score: { type: 'integer' },
        feedback: { type: 'string' },
        better_answer: { type: 'string' },
      },
    };
    const system = `You are an experienced NT2 examiner for the Spreken part of the Dutch inburgeringsexamen at level A2. The learner is an adult whose native language is Turkish. The text is a speech-to-text transcript or a typed version of what the learner said, so ignore punctuation and capitalisation problems that only come from transcription.
Judge whether the answer really answers the question, is long enough for the task, and is understandable. Correct grammar and word choice with the smallest possible changes.
corrected_text is the corrected answer. changes lists each change with a short why in ${this.explainLang()}.
answers_question tells if the content fits the question.
score is 1 to 5 where 3 means it would likely pass A2.
feedback is two or three short sentences in ${this.explainLang()}.
better_answer is a natural A2 answer in Dutch that stays close to the learner's own ideas.`;
    const user = `Exam part ${item.part}\nQuestion\n${item.prompt}\n\nLearner answer\n${text}`;
    return this.ask(system, user, schema);
  },
};

/* ---------- LanguageTool, anahtarsiz ucretsiz duzeltme ---------- */

const LT = {
  URL: 'https://api.languagetool.org/v2/check',
  on() { return S.set.lt !== false; },
  async check(text) {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 9000);
    try {
      const r = await fetch(this.URL, { method: 'POST', body: new URLSearchParams({ text, language: 'nl' }), signal: ctrl.signal, headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('LanguageTool ' + r.status);
      const j = await r.json();
      return this.apply(text, j.matches || []);
    } finally { clearTimeout(tm); }
  },
  /* Eslesmeleri sondan basa uygular, boylece onceki konumlar kaymaz */
  apply(text, matches) {
    const ms = matches.filter(m => m.replacements && m.replacements.length && typeof m.offset === 'number').sort((a, b) => b.offset - a.offset);
    let s = text; let lastStart = Infinity; const changes = [];
    for (const m of ms) {
      if (m.offset + m.length > lastStart) continue;
      const from = text.substr(m.offset, m.length);
      const to = m.replacements[0].value;
      if (from === to) continue;
      s = s.slice(0, m.offset) + to + s.slice(m.offset + m.length);
      changes.unshift({ from, to, why: m.message || '' });
      lastStart = m.offset;
    }
    return { fixed: s, changes };
  },
};

/* LanguageTool varsa once onu, sonra yerel kurallari uygular */
async function smartFix(text) {
  let lt = null, ltErr = false;
  if (LT.on()) { try { lt = await LT.check(text); } catch (e) { ltErr = true; } }
  const fx = autoFix(lt ? lt.fixed : text);
  return { fixed: fx.fixed, changes: (lt ? lt.changes : []).concat(fx.changes), source: lt ? 'lt' : 'rules', ltErr };
}

/* ---------- temel kural tabanli duzeltme ---------- */

const SPELL = { alstublift: 'alstublieft', alsjeblift: 'alsjeblieft', vriendelike: 'vriendelijke', groetes: 'groeten', morge: 'morgen', afsprak: 'afspraak', mischien: 'misschien', misschein: 'misschien', huisart: 'huisarts', wanner: 'wanneer', omdad: 'omdat', telefon: 'telefoon', dokter: 'dokter', bedant: 'bedankt' };

function autoFix(text) {
  const changes = [];
  let s = String(text || '');
  const add = (from, to, why) => { if (from !== to) changes.push({ from, to, why }); };
  s = s.replace(/[ \t]{2,}/g, () => { add('␣␣', '␣', t('fix_space')); return ' '; });
  s = s.replace(/[A-Za-zÀ-ÿ]+/g, w => { const k = w.toLowerCase(); if (SPELL[k] && SPELL[k] !== k) { const to = w[0] === w[0].toUpperCase() ? SPELL[k][0].toUpperCase() + SPELL[k].slice(1) : SPELL[k]; add(w, to, t('fix_spell')); return to; } return w; });
  s = s.replace(/\b(de|het)\s+([a-zà-ÿ-]+)/gi, (m, art, noun) => {
    const want = NOUN_ART.get(noun.toLowerCase());
    if (!want || want === art.toLowerCase()) return m;
    const fixedArt = art[0] === art[0].toUpperCase() ? want[0].toUpperCase() + want.slice(1) : want;
    const to = fixedArt + ' ' + noun;
    add(m, to, t('fix_art', { n: noun, a: want }));
    return to;
  });
  const verbs = VERBS.filter(v => !/\s/.test(v.ik));
  const agree = (wrongKey, rightKey, re) => {
    verbs.forEach(v => {
      const wrong = v[wrongKey], right = v[rightKey];
      if (!wrong || wrong === right) return;
      const rx = new RegExp('\\b(' + re + ')\\s+' + wrong + '\\b', 'gi');
      s = s.replace(rx, (m, p) => { const to = p + ' ' + right; add(m, to, t('fix_verb', { p: p.toLowerCase(), f: right })); return to; });
    });
  };
  agree('hij', 'ik', 'ik');
  agree('wij', 'ik', 'ik');
  agree('ik', 'jij', 'jij');
  agree('ik', 'hij', 'hij');
  agree('wij', 'hij', 'hij');
  agree('hij', 'wij', 'wij|we');
  s = s.replace(/(^|[.!?]\s+|\n\s*)([a-zà-ÿ])([A-Za-zà-ÿ]*)/g, (m, pre, ch, rest) => { add(ch + rest, ch.toUpperCase() + rest, t('fix_cap')); return pre + ch.toUpperCase() + rest; });
  return { fixed: s, changes };
}

/* Kelime bazli fark, LCS */
function diffHTML(a, b) {
  const A = String(a).split(/(\s+)/), B = String(b).split(/(\s+)/);
  const n = A.length, m = B.length;
  if (n * m > 400000) return esc(b);
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, out = '';
  const isWs = x => /^\s*$/.test(x);
  while (i < n && j < m) {
    if (A[i] === B[j]) { out += esc(A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { if (!isWs(A[i])) out += `<s class="del">${esc(A[i])}</s>`; i++; }
    else { out += isWs(B[j]) ? esc(B[j]) : `<b class="ins">${esc(B[j])}</b>`; j++; }
  }
  while (i < n) { if (!isWs(A[i])) out += `<s class="del">${esc(A[i])}</s>`; i++; }
  while (j < m) { out += isWs(B[j]) ? esc(B[j]) : `<b class="ins">${esc(B[j])}</b>`; j++; }
  return out;
}

function changesHTML(changes) {
  if (!changes || !changes.length) return `<p class="muted">${esc(t('w_nochange'))}</p>`;
  return '<ul class="changes">' + changes.map(c => `<li><s class="del">${esc(c.from)}</s> → <b class="ins">${esc(c.to)}</b>${c.why ? `<div class="small muted">${esc(c.why)}</div>` : ''}</li>`).join('') + '</ul>';
}

/* ---------- navigasyon ---------- */

let tab = 'home';
const stack = [];
let timers = [];
function stopTimers() { timers.forEach(clearInterval); timers = []; if (window._stopSeq) { window._stopSeq(); window._stopSeq = null; } stopRecording(); stopSR(); hidePop(); }
function open(fn, ...args) { TTS.stop(); stopTimers(); stack.push([fn, args]); fn(...args); $('#main').scrollTop = 0; }
function back() { TTS.stop(); stopTimers(); stack.pop(); const top = stack[stack.length - 1]; if (top) top[0](...top[1]); else switchTab(tab); $('#main').scrollTop = 0; }
function switchTab(tb) {
  tab = tb; stack.length = 0; TTS.stop(); stopTimers();
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tb));
  ({ home: Home, words: Words, practice: Practice, exam: Exam, me: Me })[tb]();
  $('#main').scrollTop = 0;
}
function view(html) { $('#main').innerHTML = html; const b = $('#main .back'); if (b) b.onclick = back; }
const backBtn = label => `<button class="back">‹ ${esc(label || t('back'))}</button>`;

/* ---------- SRS ---------- */

function dueWords() { const now = Date.now(); return WORDS.filter(w => S.srs[w.key] && S.srs[w.key].due <= now); }
function newWords(themes) { return WORDS.filter(w => !S.srs[w.key] && (!themes || themes.includes(w.theme))); }
function nextIv(c, q) {
  if (q === 0) return 0;
  const reps = c ? c.reps : 0;
  if (reps === 0) return [1, 1, 4][q - 1];
  if (reps === 1) return [2, 3, 6][q - 1];
  return Math.max(1, Math.round(c.iv * c.ef * [0.6, 1, 1.3][q - 1]));
}
function grade(w, q) {
  const now = Date.now();
  const c = S.srs[w.key] || { ef: 2.5, iv: 0, reps: 0, lapses: 0, due: now };
  if (q === 0) { c.reps = 0; c.lapses++; c.iv = 0; c.ef = Math.max(1.3, c.ef - 0.2); c.due = now + 60 * 1000; }
  else {
    c.iv = nextIv(c, q);
    c.ef = Math.max(1.3, c.ef + (q === 1 ? -0.15 : q === 3 ? 0.15 : 0));
    c.reps++;
    c.due = now + c.iv * DAY;
  }
  S.srs[w.key] = c;
}
function maturity(w) { const c = S.srs[w.key]; if (!c) return t('m_new'); if (c.iv >= 21) return t('m_perm'); if (c.iv >= 4) return t('m_good'); return t('m_learning'); }

/* ---------- profil secimi ---------- */

function Who() {
  $('#app').classList.add('picking');
  let h = `<div class="who-screen"><div class="flag big"><i></i><i></i><i></i></div><h2>${esc(t('who_title'))}</h2><p class="muted">${esc(t('who_sub'))}</p><div class="who-grid">`;
  PROFILES.forEach(p => {
    let st = null; try { st = JSON.parse(lsGet(stateKey(p.id)) || 'null'); } catch (e) { st = null; }
    h += `<button class="who-btn" data-p="${p.id}"><span class="e">${p.icon}</span><b>${p.name}</b><span class="small muted">${st ? (st.xp || 0) + ' XP · 🔥 ' + (st.streak || 0) : '&nbsp;'}</span></button>`;
  });
  h += `<button class="who-btn add" id="who-add"><span class="e">➕</span><b>${esc(t('who_add'))}</b><span class="small muted">&nbsp;</span></button>`;
  h += '</div></div>';
  view(h);
  $$('.who-btn[data-p]').forEach(b => b.onclick = () => { loadProfile(b.dataset.p); $('#app').classList.remove('picking'); renderTop(); switchTab('home'); });
  $('#who-add').onclick = NewProfile;
}

function NewProfile() {
  $('#app').classList.add('picking');
  let icon = PROFILE_ICONS.find(i => !PROFILES.some(p => p.icon === i)) || PROFILE_ICONS[0];
  let lg = lang();
  const draw = () => {
    let h = `<button class="back" id="np-back">‹ ${esc(t('back'))}</button><h2>${esc(t('new_title'))}</h2><div class="card">`;
    h += `<div class="field"><label>${esc(t('new_name'))}</label><input id="np-name" class="text-in" maxlength="20" autocapitalize="words" autocomplete="off"></div>`;
    h += `<div class="field"><label>${esc(t('new_icon'))}</label><div class="chips">${PROFILE_ICONS.map(i => `<button class="chip icon ${i === icon ? 'on' : ''}" data-i="${i}">${i}</button>`).join('')}</div></div>`;
    h += `<div class="field"><label>${esc(t('me_lang'))}</label><div class="seg mini"><button data-l="tr" class="${lg === 'tr' ? 'on' : ''}">Türkçe</button><button data-l="en" class="${lg === 'en' ? 'on' : ''}">English</button></div></div>`;
    h += `<button class="btn block" id="np-create">${esc(t('new_create'))}</button></div>`;
    const keep = $('#np-name') ? $('#np-name').value : '';
    $('#main').innerHTML = h;
    $('#np-name').value = keep;
    $('#np-back').onclick = Who;
    $$('.chip.icon').forEach(b => b.onclick = () => { icon = b.dataset.i; draw(); });
    $$('[data-l]').forEach(b => b.onclick = () => { lg = b.dataset.l; draw(); });
    $('#np-create').onclick = () => {
      const name = $('#np-name').value.trim();
      if (!name) { toast(t('new_err')); $('#np-name').focus(); return; }
      if (PROFILES.some(p => p.name.toLowerCase() === name.toLowerCase())) { toast(t('new_dup')); return; }
      const id = 'p' + Date.now().toString(36);
      PROFILES.push({ id, name, icon });
      saveProfiles();
      loadProfile(id);
      S.set.lang = lg;
      save();
      $('#app').classList.remove('picking');
      renderTop(); switchTab('home');
    };
  };
  draw();
}

/* ---------- ANA SAYFA ---------- */

function daysToExam() { if (!S.set.examDate) return null; return Math.ceil((new Date(S.set.examDate + 'T09:00') - Date.now()) / DAY); }
function acc(k) { const s = S.stats[k] || [0, 0]; return s[1] ? Math.round(s[0] / s[1] * 100) : null; }

function Home() {
  rollDay();
  const dte = daysToExam();
  const due = dueWords().length;
  const learned = Object.keys(S.srs).length;
  const plan = [
    { ok: S.day.cards > 0 && (S.day.cards >= S.set.goal || due === 0), t: t('plan_cards'), s: t('plan_cards_s', { c: S.day.cards, d: due }), go: () => open(Flash, null) },
    { ok: S.day.lezen > 0, t: t('plan_lezen'), s: 'Lezen', go: () => open(PickNext, 'lezen') },
    { ok: S.day.luisteren > 0, t: t('plan_luisteren'), s: 'Luisteren', go: () => open(PickNext, 'luisteren') },
    { ok: S.day.knm >= 5, t: t('plan_knm'), s: t('plan_knm_s', { n: Math.min(5, S.day.knm) }), go: () => open(KnmQuiz, null, 5) },
    { ok: S.day.spreken > 0, t: t('plan_spreken'), s: t('plan_spreken_s'), go: () => open(PickNext, 'spreken') },
    { ok: S.day.schrijven > 0, t: t('plan_schrijven'), s: t('plan_schrijven_s'), go: () => open(PickNext, 'schrijven') },
  ];
  const doneN = plan.filter(p => p.ok).length;
  const top = dte === null ? t('exam_set') : dte > 0 ? t('exam_left') : dte === 0 ? t('exam_today') : t('exam_past');
  let h = `<div class="card hero"><div class="muted">${esc(top)}</div><div class="big">${dte !== null && dte > 0 ? esc(t('days', { n: dte })) : esc(t('hello', { name: profName() }))}</div><div class="muted" style="margin-top:6px">${esc(t('home_sub', { w: learned, d: doneN, t: plan.length }))}</div></div>`;
  h += `<div class="card"><div style="font-weight:800;margin-bottom:4px">${esc(t('plan_title'))}</div>`;
  plan.forEach((p, i) => { h += `<div class="plan ${p.ok ? 'ok' : ''}"><span class="ck">${p.ok ? '✓' : ''}</span><div><div style="font-weight:600">${esc(p.t)}</div><div class="small muted">${esc(p.s)}</div></div><button class="btn sm go" data-i="${i}">${esc(p.ok ? t('again') : t('start'))}</button></div>`; });
  h += `</div><h3>${esc(t('skills'))}</h3><div class="grid2">`;
  [['lezen', '📖 Lezen'], ['luisteren', '🎧 Luisteren'], ['knm', '🏛️ KNM'], ['grammatica', '🔧 Grammatica']].forEach(([k, l]) => {
    const a = acc(k);
    h += `<div class="tile"><div class="t">${l}</div><div class="s">${a === null ? esc(t('no_data')) : esc(t('pct_right', { p: a, n: S.stats[k][1] }))}</div><div class="bar"><div style="width:${a || 0}%"></div></div></div>`;
  });
  h += `<div class="tile"><div class="t">✍️ Schrijven</div><div class="s">${esc(t('tasks_n', { d: S.done.schrijven.length, t: SCHRIJVEN.length }))}</div><div class="bar"><div style="width:${S.done.schrijven.length / SCHRIJVEN.length * 100}%"></div></div></div>`;
  h += `<div class="tile"><div class="t">🗣️ Spreken</div><div class="s">${esc(t('q_n', { d: S.done.spreken.length, t: SPREKEN.length }))}</div><div class="bar"><div style="width:${S.done.spreken.length / SPREKEN.length * 100}%"></div></div></div></div>`;
  h += `<p class="small muted" style="margin-top:16px">${esc(t('home_note'))}</p>`;
  view(h);
  $$('.plan .go').forEach(b => b.onclick = () => plan[+b.dataset.i].go());
}

function PickNext(kind) {
  const src = { lezen: LEZEN, luisteren: LUISTEREN, schrijven: SCHRIJVEN, spreken: SPREKEN }[kind];
  const item = src.find(x => !S.done[kind].includes(x.id)) || pick(src, 1)[0];
  stack.pop();
  open({ lezen: Lezen, luisteren: Luisteren, schrijven: Schrijven, spreken: Spreken }[kind], item.id);
}

/* ---------- KELIMELER ---------- */

function Words() {
  rollDay();
  const due = dueWords().length;
  const nw = Math.min(newWords().length, Math.max(0, S.set.newPerDay - S.day.newCards));
  let h = `<h2>${esc(t('words_title'))}</h2><div class="card"><div style="font-weight:800;font-size:20px">${esc(t('words_due', { d: due, n: nw }))}</div><div class="small muted">${esc(t('words_srs'))}</div><div class="row" style="margin-top:12px"><button class="btn" id="w-start">${esc(t('words_start'))}</button><button class="btn alt" id="w-rev">${lang() === 'en' ? 'EN' : 'TR'} → NL</button></div></div>`;
  h += `<div class="grid2"><button class="tile" id="w-dehet"><div class="e">⚡</div><div class="t">${esc(t('dehet_title'))}</div><div class="s">${esc(t('dehet_sub'))}</div></button><button class="tile" id="w-type"><div class="e">⌨️</div><div class="t">${esc(t('type_title'))}</div><div class="s">${esc(t('type_sub'))}</div></button></div><h3>${esc(t('themes'))}</h3>`;
  VOCAB_THEMES.forEach(th => {
    const ws = WORDS.filter(w => w.theme === th.id);
    const seen = ws.filter(w => S.srs[w.key]).length;
    h += `<button class="list-item" data-th="${th.id}"><span class="ic">${th.icon}</span><span style="flex:1;min-width:0"><span class="t">${esc(L10N.theme(th))}</span><div class="bar"><div style="width:${seen / ws.length * 100}%"></div></div></span><span class="r">${seen}/${ws.length}</span></button>`;
  });
  view(h);
  $('#w-start').onclick = () => open(Flash, null);
  $('#w-rev').onclick = () => open(Flash, null, true);
  $('#w-dehet').onclick = () => open(DeHet);
  $('#w-type').onclick = () => open(TypeQuiz, null);
  $$('[data-th]').forEach(b => b.onclick = () => open(Theme, b.dataset.th));
}

function Theme(id) {
  const th = VOCAB_THEMES.find(x => x.id === id);
  const ws = WORDS.filter(w => w.theme === id);
  let h = backBtn(t('tab_words')) + `<h2>${th.icon} ${esc(L10N.theme(th))}</h2><div class="row"><button class="btn" id="t-learn">${esc(t('theme_learn'))}</button><button class="btn alt" id="t-type">${esc(t('theme_type'))}</button></div><div class="card" style="margin-top:12px">`;
  ws.forEach((w, i) => { h += `<div class="wordrow"><button class="spk" data-i="${i}" aria-label="speak">🔊</button><div><div class="nl">${esc(w.nl)}</div><div class="small muted">${esc(L10N.word(w))}</div></div><span class="lvl">${esc(maturity(w))}</span></div>`; });
  h += '</div>';
  view(h);
  $$('.wordrow .spk').forEach(b => b.onclick = () => { const w = ws[+b.dataset.i]; TTS.speak(w.nl + '. ' + (w.ex || '')); });
  $('#t-learn').onclick = () => open(Flash, [id]);
  $('#t-type').onclick = () => open(TypeQuiz, [id]);
}

function buildQueue(themes) {
  const now = Date.now();
  const due = WORDS.filter(w => S.srs[w.key] && S.srs[w.key].due <= now && (!themes || themes.includes(w.theme)));
  const room = themes ? 15 : Math.max(0, S.set.newPerDay - S.day.newCards);
  return shuffle(due).concat(newWords(themes).slice(0, room));
}

function Flash(themes, reverse) {
  rollDay();
  const queue = buildQueue(themes);
  let cur = null; let shown = false; let count = 0;
  const next = () => {
    cur = queue.shift(); shown = false;
    if (!cur) {
      view(backBtn() + `<div class="card center" style="padding:28px"><div style="font-size:48px">🎉</div><h2>${esc(t('f_done'))}</h2><p class="muted">${esc(t('f_done_s', { n: count }))}</p><div class="row" style="justify-content:center"><button class="btn" id="f-more">${esc(t('f_more'))}</button><button class="btn alt" id="f-dh">${esc(t('f_dh'))}</button></div></div>`);
      $('#f-more').onclick = () => { S.day.newCards = Math.max(0, S.day.newCards - 10); save(); stack.pop(); open(Flash, themes, reverse); };
      $('#f-dh').onclick = () => { stack.pop(); open(DeHet); };
      return;
    }
    draw();
  };
  const draw = () => {
    const w = cur;
    const isNew = !S.srs[w.key];
    const total = count + queue.length + 1;
    const nlHTML = `<div class="w">${w.art ? `<span class="art ${w.art}">${w.art}</span> ` : ''}${esc(w.bare)}</div>`;
    const front = reverse ? `<div class="tr" style="margin:0">${esc(L10N.word(w))}</div>` : nlHTML;
    const backSide = reverse ? `<div style="margin-top:12px">${nlHTML}</div>` : `<div class="tr">${esc(L10N.word(w))}</div>`;
    const exTr = w.ex && typeof VOCAB_EX !== 'undefined' && VOCAB_EX[w.ex] ? VOCAB_EX[w.ex][lang()] : '';
    let h = backBtn() + `<div class="qhead"><span>${esc(isNew ? t('f_new') : t('f_rev'))}</span><span>${esc(t('f_left', { i: count + 1, n: total }))}</span></div><div class="bar" style="margin:-2px 0 12px"><div style="width:${count / total * 100}%"></div></div>`;
    h += `<div class="card flash ${shown ? 'open' : ''}" id="f-card"><div class="f-spk"><button class="spk" id="f-say" aria-label="speak">🔊</button></div>${front}`;
    if (shown) {
      h += backSide;
      if (w.ex) h += `<div class="ex-box"><div class="ex-nl">${tw(w.ex)} <button class="spk mini" id="f-ex" aria-label="speak">🔊</button></div>${exTr ? `<div class="ex-tr">${esc(exTr)}</div>` : ''}</div><div class="small muted" style="margin-top:6px">${esc(t('f_ex_hint'))}</div>`;
    } else h += `<div class="muted" style="margin-top:18px;max-width:280px">${esc(reverse ? t('f_tap_rev') : t('f_tap'))}</div>`;
    h += '</div>';
    if (shown) {
      const c = S.srs[w.key];
      const when = q => { if (q === 0) return t('min1'); const n = nextIv(c, q); return n === 1 ? t('d_1') : t('d_n', { n }); };
      h += `<div class="rate-q">${esc(t('f_q'))}</div><div class="rate">`;
      [['r0', 'r_again'], ['r1', 'r_hard'], ['r2', 'r_good'], ['r3', 'r_easy']].forEach(([cls, key], q) => { h += `<button class="${cls}" data-q="${q}"><b>${esc(t(key))}</b><small>${esc(when(q))}</small></button>`; });
      h += `</div>`;
      if (Object.keys(S.srs).length < 40) h += `<p class="small muted center" style="margin-top:12px">${esc(t('f_help'))}</p>`;
    } else h += `<button class="btn block" id="f-show">${esc(t('f_show'))}</button>`;
    view(h);
    if (!reverse && !shown) TTS.speak(w.nl);
    const reveal = () => { if (shown) return; shown = true; draw(); if (reverse) TTS.speak(w.nl); };
    $('#f-card').onclick = e => { if (!e.target.closest('.wd') && !e.target.closest('.spk')) reveal(); };
    const fs = $('#f-show'); if (fs) fs.onclick = reveal;
    $('#f-say').onclick = e => { e.stopPropagation(); TTS.speak(w.nl); };
    const fe = $('#f-ex'); if (fe) fe.onclick = e => { e.stopPropagation(); TTS.speak(w.ex); };
    $$('.rate button').forEach(b => b.onclick = () => {
      const q = +b.dataset.q;
      if (!S.srs[w.key]) S.day.newCards++;
      grade(w, q);
      stat('woorden', q > 0);
      S.day.cards++; count++;
      activity(q > 0 ? 2 : 1);
      if (q === 0) queue.splice(Math.min(3, queue.length), 0, w);
      save();
      next();
    });
  };
  next();
}

function DeHet() {
  let score = 0, total = 0, time = 60, best = +(lsGet('a2.dehet.' + PROFILE) || 0);
  let cur = null; let running = false;
  const start = () => {
    stopTimers();
    running = true; score = 0; total = 0; time = 60;
    const endAt = Date.now() + 60000;
    timers.push(setInterval(() => { time = Math.max(0, Math.round((endAt - Date.now()) / 1000)); const el = $('#dh-time'); if (el) el.textContent = t('sec', { n: time }); if (time <= 0 && running) end(); }, 250));
    next();
  };
  const next = () => {
    cur = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    view(backBtn() + `<div class="qhead"><span id="dh-time" class="timer">${esc(t('sec', { n: time }))}</span><span>${score}/${total}</span></div><div class="card flash" style="min-height:200px"><div class="w">${esc(cur.bare)}</div><div class="muted" style="margin-top:8px">${esc(L10N.word(cur))}</div></div><div class="big-choice"><button class="de" data-a="de">de</button><button class="het" data-a="het">het</button></div>`);
    $$('.big-choice button').forEach(b => b.onclick = () => {
      if (!running) return;
      total++;
      const ok = b.dataset.a === cur.art;
      if (ok) { score++; vib(10); } else { vib([30, 30, 30]); toast(`❌ <b>${cur.art} ${esc(cur.bare)}</b>`, 1200); }
      stat('woorden', ok);
      next();
    });
  };
  const end = () => {
    running = false; stopTimers();
    if (score > best) { best = score; lsSet('a2.dehet.' + PROFILE, String(best)); }
    activity(score); save();
    view(backBtn() + `<div class="card center" style="padding:24px"><div style="font-size:44px">⚡</div><h2>${esc(t('dh_score', { s: score, t: total }))}</h2><p class="muted">${esc(t('dh_best', { n: best }))}</p><button class="btn" id="dh-again">${esc(t('dh_again'))}</button></div><div class="card small">${t('dh_tip')}</div>`);
    $('#dh-again').onclick = start;
  };
  view(backBtn() + `<h2>⚡ ${esc(t('dehet_title'))}</h2><div class="card"><p>${esc(t('dh_intro'))}</p><p class="muted">${esc(t('dh_best', { n: best }))}</p><button class="btn block" id="dh-go">${esc(t('start'))}</button></div>`);
  $('#dh-go').onclick = start;
}

function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.!?,]/g, '').replace(/\s+/g, ' ').trim(); }

function TypeQuiz(themes) {
  const pool = WORDS.filter(w => !themes || themes.includes(w.theme));
  const seen = pool.filter(w => S.srs[w.key]);
  const items = pick(seen.length >= 10 ? seen : pool, Math.min(10, pool.length));
  const N = items.length;
  let i = 0, score = 0;
  const draw = feedback => {
    const w = items[i];
    let h = backBtn() + `<div class="qhead"><span>${esc(t('q_of', { i: i + 1, n: N }))}</span><span>${esc(t('score', { n: score }))}</span></div><div class="card"><div class="muted small">${esc(t('ty_prompt') + (w.art ? t('ty_art') : ''))}</div><div style="font-size:24px;font-weight:800;margin:6px 0 12px">${esc(L10N.word(w))}</div>`;
    h += `<input id="ty-in" class="text-in" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="${w.art ? 'de ... / het ...' : ''}" ${feedback ? 'disabled' : ''}>`;
    if (feedback) h += `<div class="ex" style="margin-top:10px">${feedback}</div><button class="btn block" id="ty-next" style="margin-top:10px">${esc(i === N - 1 ? t('result') : t('next'))}</button>`;
    else h += `<button class="btn block" id="ty-check" style="margin-top:10px">${esc(t('check'))}</button>`;
    h += '</div>';
    view(h);
    const inp = $('#ty-in');
    if (!feedback) {
      inp.focus();
      const check = () => {
        const a = norm(inp.value), want = norm(w.nl);
        const ok = a === want;
        let msg;
        if (ok) { score++; msg = t('ty_ok', { w: esc(w.nl) }); vib(10); }
        else if (w.art && a === norm(w.bare)) msg = t('ty_noart', { w: esc(w.nl) });
        else if (w.art && a.replace(/^(de|het) /, '') === norm(w.bare)) msg = t('ty_wrongart', { w: esc(w.nl) });
        else msg = t('ty_wrong', { w: esc(w.nl) });
        stat('woorden', ok);
        if (S.srs[w.key] && !ok) S.srs[w.key].due = Date.now();
        save();
        TTS.speak(w.nl);
        draw(msg);
      };
      $('#ty-check').onclick = check;
      inp.onkeydown = e => { if (e.key === 'Enter') check(); };
    } else {
      $('#ty-next').onclick = () => {
        i++;
        if (i < N) return draw();
        activity(score * 2); save();
        view(backBtn() + `<div class="card center" style="padding:24px"><h2>${score}/${N}</h2><p class="muted">${esc(t('ty_res'))}</p><button class="btn" id="ty-again">${esc(t('ty_round'))}</button></div>`);
        $('#ty-again').onclick = () => { stack.pop(); open(TypeQuiz, themes); };
      };
    }
  };
  draw();
}

/* ---------- PRATIK ---------- */

function Practice() {
  const prog = (k, src) => `${S.done[k].length}/${src.length}`;
  let h = `<h2>${esc(t('practice_title'))}</h2><div class="grid2">`;
  h += `<button class="tile" data-go="lezen"><div class="e">📖</div><div class="t">Lezen</div><div class="s">${esc(t('s_lezen'))} · ${prog('lezen', LEZEN)}</div></button>`;
  h += `<button class="tile" data-go="luisteren"><div class="e">🎧</div><div class="t">Luisteren</div><div class="s">${esc(t('s_luisteren'))} · ${prog('luisteren', LUISTEREN)}</div></button>`;
  h += `<button class="tile" data-go="schrijven"><div class="e">✍️</div><div class="t">Schrijven</div><div class="s">${esc(t('s_schrijven'))} · ${prog('schrijven', SCHRIJVEN)}</div></button>`;
  h += `<button class="tile" data-go="spreken"><div class="e">🗣️</div><div class="t">Spreken</div><div class="s">${esc(t('s_spreken'))} · ${prog('spreken', SPREKEN)}</div></button>`;
  h += `<button class="tile" data-go="knm"><div class="e">🏛️</div><div class="t">KNM</div><div class="s">${esc(t('s_knm', { n: KNM.length }))}</div></button>`;
  h += `<button class="tile" data-go="gram"><div class="e">🔧</div><div class="t">Grammatica</div><div class="s">${esc(t('s_gram', { n: GRAMMAR.length }))}</div></button>`;
  h += `</div><p class="small muted" style="margin-top:14px">${esc(t('practice_tip'))}</p>`;
  view(h);
  $$('[data-go]').forEach(b => b.onclick = () => { const k = b.dataset.go; if (k === 'knm') open(KnmHome); else if (k === 'gram') open(GramHome); else open(SkillList, k); });
}

const SKILL = {
  lezen: { title: '📖 Lezen', src: () => LEZEN, open: id => open(Lezen, id), sub: x => x.type, info: 'info_lezen' },
  luisteren: { title: '🎧 Luisteren', src: () => LUISTEREN, open: id => open(Luisteren, id), sub: x => x.setting, info: 'info_luisteren' },
  schrijven: { title: '✍️ Schrijven', src: () => SCHRIJVEN, open: id => open(Schrijven, id), sub: x => (x.kind === 'formulier' ? t('w_form') : t('w_msg')), info: 'info_schrijven' },
  spreken: { title: '🗣️ Spreken', src: () => SPREKEN, open: id => open(Spreken, id), sub: x => 'Deel ' + x.part + ' · ' + t('sp_part' + x.part), info: 'info_spreken' },
};

function SkillList(k) {
  const sk = SKILL[k];
  let h = backBtn(t('tab_practice')) + `<h2>${sk.title}</h2><p class="small muted">${esc(t(sk.info))}</p>`;
  sk.src().forEach(x => {
    const d = S.done[k].includes(x.id);
    h += `<button class="list-item ${d ? 'done' : ''}" data-id="${x.id}"><span class="ic">${d ? '✅' : '•'}</span><span style="min-width:0"><div class="t">${esc(x.title || x.prompt)}</div><div class="s">${esc(sk.sub(x))}</div></span></button>`;
  });
  view(h);
  $$('[data-id]').forEach(b => b.onclick = () => sk.open(b.dataset.id));
}

/* Coktan secmeli blok */
function mcBlock(container, questions, opts = {}) {
  const prepared = questions.map(q => { const order = shuffle(q.a.map((_, i) => i)); return { ...q, opts: order.map(i => q.a[i]), c: order.indexOf(0) }; });
  const answers = new Array(prepared.length).fill(null);
  let checked = false;
  const draw = () => {
    let h = '';
    prepared.forEach((q, qi) => {
      h += `<div class="card"><div class="q">${qi + 1}. ${tw(q.q)}</div>`;
      q.opts.forEach((o, oi) => {
        let cls = '';
        if (checked) { if (oi === q.c) cls = 'right'; else if (answers[qi] === oi) cls = 'wrong'; }
        else if (answers[qi] === oi) cls = 'sel';
        h += `<button class="opt ${cls}" data-q="${qi}" data-o="${oi}">${tw(o)}</button>`;
      });
      h += '</div>';
    });
    if (!checked) h += `<button class="btn block" id="mc-check" ${answers.some(a => a === null) ? 'disabled' : ''}>${esc(t('check'))}</button>`;
    container.innerHTML = h;
    container.querySelectorAll('.opt').forEach(b => b.onclick = () => { if (checked) return; answers[+b.dataset.q] = +b.dataset.o; draw(); });
    const c = container.querySelector('#mc-check');
    if (c) c.onclick = () => {
      checked = true;
      const right = prepared.filter((q, i) => answers[i] === q.c).length;
      draw();
      if (opts.onDone) opts.onDone(right, prepared.length, prepared.map((q, i) => answers[i] === q.c));
    };
  };
  draw();
}

/* Hollandaca metni dokunulabilir kelimelere boler */
const WORD_RE = /([A-Za-zÀ-ÿĀ-ſ][A-Za-zÀ-ÿĀ-ſ'-]*)/;
function tw(text) {
  return String(text == null ? '' : text).split(WORD_RE).map((part, i) => {
    if (i % 2 === 0) return esc(part);
    const k = part.toLowerCase().replace(/'s$/, '').replace(/-$/, '');
    return `<span class="wd" data-w="${esc(k)}">${esc(part)}</span>`;
  }).join('');
}
function lookup(k) {
  if (!k) return null;
  const d = DICT.get(k);
  if (d) return { nl: d.nl, tr: d.w ? L10N.word(d.w) : L10N.verb(d.v) };
  const lx = L10N.lex(k);
  if (lx) return { nl: k, tr: lx };
  if (k.includes('-')) { const parts = k.split('-').map(lookup).filter(Boolean); if (parts.length) return { nl: k, tr: parts.map(x => x.tr.split(' · ')[0]).join(' + ') }; }
  return null;
}
function showPop(html) { const p = $('#pop'); p.innerHTML = html; p.classList.remove('hidden'); clearTimeout(showPop.tm); showPop.tm = setTimeout(hidePop, 3500); }
function hidePop() { const p = $('#pop'); if (p) p.classList.add('hidden'); }

function afterNav(el, r, total, next) {
  el.innerHTML = `<div class="card center"><div style="font-size:36px">${r === total ? '🌟' : r >= total / 2 ? '👍' : '💪'}</div><div style="font-weight:800;font-size:20px">${esc(t('right_n', { r, t: total }))}</div><div class="row" style="justify-content:center;margin-top:10px"><button class="btn alt" id="an-back">${esc(t('list_back'))}</button>${next ? `<button class="btn" id="an-next">${esc(t('next'))}</button>` : ''}</div></div>`;
  $('#an-back').onclick = back;
  if (next) $('#an-next').onclick = next;
  el.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function Lezen(id) {
  const x = LEZEN.find(l => l.id === id);
  const idx = LEZEN.indexOf(x);
  view(backBtn('Lezen') + `<div class="card doc"><div class="type">${esc(x.type)}</div><div style="font-weight:800;font-size:18px;margin:4px 0 8px">${tw(x.title)}</div><div class="reading">${tw(x.text)}</div><div class="row" style="margin-top:10px"><button class="spk" id="lz-say">${esc(t('read_aloud'))}</button><span class="small muted">${esc(t('tap_hint'))}</span></div></div><div id="lz-q"></div><div id="lz-after"></div>`);
  $('#lz-say').onclick = () => TTS.speak(x.text);
  mcBlock($('#lz-q'), x.questions, { onDone: (r, total, res) => {
    res.forEach(ok => stat('lezen', ok));
    if (!S.done.lezen.includes(x.id)) S.done.lezen.push(x.id);
    rollDay(); S.day.lezen++; activity(r * 5); save();
    afterNav($('#lz-after'), r, total, LEZEN[idx + 1] && (() => { stack.pop(); open(Lezen, LEZEN[idx + 1].id); }));
  } });
}

function Luisteren(id) {
  const x = LUISTEREN.find(l => l.id === id);
  const idx = LUISTEREN.indexOf(x);
  let plays = 0; let playing = false;
  view(backBtn('Luisteren') + `<div class="card" id="lu-head"></div><div id="lu-q"></div><div id="lu-tr"></div><div id="lu-after"></div>`);
  const drawHead = () => {
    $('#lu-head').innerHTML = `<div style="font-weight:800;font-size:18px">${tw(x.title)}</div><div class="muted small">${tw(x.setting)}</div><div class="player" style="margin-top:12px"><button class="play" id="lu-play">${playing ? '■' : '▶'}</button><div><div style="font-weight:700">${esc(playing ? t('lu_listening') : plays ? t('lu_again') : t('lu_listen'))}</div><div class="small muted">${esc(t('lu_count', { n: plays }))}</div></div></div>`;
    $('#lu-play').onclick = () => {
      if (playing) { if (window._stopSeq) window._stopSeq(); window._stopSeq = null; playing = false; drawHead(); return; }
      plays++; playing = true; drawHead();
      window._stopSeq = TTS.seq(x.lines, li => { $$('#lu-tr .line').forEach((el, j) => el.classList.toggle('now', li === j)); }, () => { playing = false; if ($('#lu-head')) drawHead(); });
    };
  };
  drawHead();
  mcBlock($('#lu-q'), x.questions, { onDone: (r, total, res) => {
    res.forEach(ok => stat('luisteren', ok));
    if (!S.done.luisteren.includes(x.id)) S.done.luisteren.push(x.id);
    rollDay(); S.day.luisteren++; activity(r * 5); save();
    let h = `<h3>${esc(t('text'))}</h3>`;
    x.lines.forEach((l, i) => { h += `<div class="line ${l.g}" data-i="${i}"><div class="who">${esc(l.s)}</div>${tw(l.t)}</div>`; });
    $('#lu-tr').innerHTML = h;
    $$('#lu-tr .line').forEach(el => el.onclick = e => { if (e.target.closest('.wd')) return; const l = x.lines[+el.dataset.i]; TTS.speak(l.t, l.g); });
    afterNav($('#lu-after'), r, total, LUISTEREN[idx + 1] && (() => { stack.pop(); open(Luisteren, LUISTEREN[idx + 1].id); }));
  } });
}

function wc(s) { return (s || '').split(/\s+/).filter(Boolean).length; }
function chk(ok, label) { return `<div class="check ${ok ? 'ok' : 'no'}"><span class="d">${ok ? '✓' : '✕'}</span><span>${label}</span></div>`; }
function scoreBadge(n) { n = Math.max(1, Math.min(5, Math.round(n || 1))); return `<span class="score s${n}">${esc(t('w_score', { n }))}</span>`; }

function Schrijven(id) {
  const x = SCHRIJVEN.find(s => s.id === id);
  const idx = SCHRIJVEN.indexOf(x);
  const draftKey = 'a2.draft.' + PROFILE + '.' + id;
  let draft = {};
  try { draft = JSON.parse(lsGet(draftKey) || '{}'); } catch (e) { draft = {}; }
  const hasFields = !!(x.fields && x.fields.length);
  let h = backBtn('Schrijven') + `<div class="card"><div class="small muted">${esc(x.kind === 'formulier' ? t('w_form') : t('w_msg'))}</div><div style="font-weight:800;font-size:18px">${tw(x.title)}</div><p>${tw(x.prompt)}</p>${S.set.showTr ? `<p class="small muted">${esc(L10N.wTr(x))}</p>` : ''}</div><div class="card">`;
  if (hasFields) x.fields.forEach((f, i) => { h += `<div class="field"><label>${tw(f.label)}</label>${f.long ? `<textarea rows="3" data-f="${i}" placeholder="${esc(f.hint || '')}">${esc(draft['f' + i] || '')}</textarea>` : `<input data-f="${i}" placeholder="${esc(f.hint || '')}" value="${esc(draft['f' + i] || '')}">`}</div>`; });
  else h += `<textarea class="answer" id="sc-text" placeholder="${esc(t('w_placeholder'))}" autocapitalize="sentences">${esc(draft.text || '')}</textarea>`;
  h += `<div class="small muted" id="sc-count"></div><button class="btn block" id="sc-check" style="margin-top:10px">${esc(t('check'))}</button></div><div id="sc-res"></div>`;
  view(h);
  const fieldEls = () => $$('[data-f]');
  const answerText = () => (hasFields ? fieldEls().map(el => el.value).join('\n') : ($('#sc-text').value || ''));
  const promptText = () => (hasFields ? x.fields.map((f, i) => f.label + ' = ' + (fieldEls()[i].value || '')).join('\n') : answerText());
  const persistDraft = () => { const d = {}; fieldEls().forEach(el => { d['f' + el.dataset.f] = el.value; }); if (!hasFields) d.text = $('#sc-text').value; lsSet(draftKey, JSON.stringify(d)); };
  const upd = () => { $('#sc-count').textContent = t('w_words', { n: wc(answerText()) }) + (x.min ? t('w_min', { n: x.min }) : ''); persistDraft(); };
  $$('#main textarea, #main input').forEach(el => el.oninput = upd);
  upd();
  $('#sc-check').onclick = async () => {
    const text = answerText();
    if (!text.trim()) { toast(t('w_empty')); return; }
    const res = $('#sc-res');
    const btn = $('#sc-check');
    btn.disabled = true;
    res.innerHTML = `<div class="card center muted">⏳ ${esc(t('w_checking'))}</div>`;
    let ai = null, aiErr = null;
    if (AI.key()) { try { ai = await AI.writing(x, promptText()); } catch (e) { aiErr = AI.errMsg(e); } }
    btn.disabled = false;
    let r = '';
    if (ai) {
      r += `<div class="card"><div class="row"><b>${esc(t('w_fixed'))}</b><span style="margin-left:auto">${scoreBadge(ai.score)}</span></div><div class="diff">${diffHTML(text, ai.corrected_text || text)}</div><div class="small muted" style="margin-top:6px">🤖 ${esc(t('w_ai_note'))}</div></div>`;
      r += `<div class="card"><b>${esc(t('w_changes'))}</b>${changesHTML(ai.changes)}</div>`;
      if (ai.points && ai.points.length) r += `<div class="card"><b>${esc(t('w_points'))}</b>${ai.points.map(p => chk(p.covered, esc(p.point))).join('')}</div>`;
      if (ai.feedback) r += `<div class="card ex">💬 ${esc(ai.feedback)}</div>`;
    } else {
      const fx = await smartFix(text);
      if (!$('#sc-res')) return;
      let checks = '';
      if (hasFields) {
        const vals = fieldEls().map(el => el.value.trim());
        const empty = vals.filter(v => !v).length;
        checks += chk(empty === 0, esc(empty ? t('w_fields_empty', { n: empty }) : t('w_fields_ok')));
        x.fields.forEach((f, i) => { if (f.long) { const v = vals[i]; const okS = /^[A-ZÀ-Ý]/.test(v) && /[.!?]$/.test(v) && wc(v) >= 4; checks += chk(okS, esc(t('w_sentence', { f: f.label }))); } });
      }
      (x.points || []).forEach((p, i) => { let ok = false; try { ok = new RegExp(p.re, 'i').test(fx.fixed); } catch (e) { ok = false; } checks += chk(ok, `${esc(p.label)} · ${esc(L10N.wPoint(x, i))}`); });
      if (x.min) checks += chk(wc(text) >= x.min, esc(t('w_len', { n: wc(text), m: x.min })));
      if (aiErr) r += `<div class="card ex">⚠️ ${esc(aiErr)}</div>`;
      if (fx.ltErr) r += `<div class="card ex">⚠️ ${esc(t('w_lt_fail'))}</div>`;
      r += `<div class="card"><b>${esc(t('w_fixed'))}</b><div class="diff">${diffHTML(text, fx.fixed)}</div>${fx.source === 'lt' ? '<div class="small muted" style="margin-top:6px">🧰 LanguageTool</div>' : ''}</div>`;
      r += `<div class="card"><b>${esc(t('w_changes'))}</b>${changesHTML(fx.changes)}</div>`;
      r += `<div class="card"><b>${esc(t('w_points'))}</b>${checks}<p class="small muted">${esc(fx.source === 'lt' ? t('w_lt_note') : t('w_basic_note'))}</p></div>`;
    }
    r += `<div class="card"><div class="row"><b>${esc(t('w_model'))}</b><button class="spk" id="sc-say" style="margin-left:auto">🔊</button></div><div class="model" style="margin-top:8px">${tw(x.model)}</div></div>`;
    r += `<div class="row" style="justify-content:center"><button class="btn alt" id="sc-back">${esc(t('list_back'))}</button>${SCHRIJVEN[idx + 1] ? `<button class="btn" id="sc-next">${esc(t('next'))}</button>` : ''}</div>`;
    res.innerHTML = r;
    $('#sc-say').onclick = () => TTS.speak(x.model);
    $('#sc-back').onclick = back;
    const n = $('#sc-next'); if (n) n.onclick = () => { stack.pop(); open(Schrijven, SCHRIJVEN[idx + 1].id); };
    if (!S.done.schrijven.includes(x.id)) S.done.schrijven.push(x.id);
    rollDay(); S.day.schrijven++; activity(ai ? (ai.score || 3) * 4 : 10); save();
    res.scrollIntoView({ behavior: 'smooth' });
  };
}

/* Kayit ve ses tanima */
let rec = null;
let srInst = null, srTimer = null;
function stopSR() { clearTimeout(srTimer); if (srInst) { const r = srInst; srInst = null; r.onend = null; try { r.abort(); } catch (e) { /* yok */ } } }
function stopRecording() {
  if (!rec) return;
  const r = rec; rec = null;
  if (r.mr && r.mr.state === 'recording') { r.mr.onstop = null; try { r.mr.stop(); } catch (e) { /* yok */ } }
  if (r.stream) r.stream.getTracks().forEach(tr => tr.stop());
  if (r.sr) { try { r.sr.stop(); } catch (e) { /* yok */ } }
}

const STOP_NL = new Set('de het een en of maar want omdat dat die dit deze ik je jij u hij zij ze wij we jullie mijn mij me zijn haar ons onze is ben bent was heb hebt heeft hebben in op aan van voor met naar bij om te er niet geen ook dan als wat wie waar hoe wel nog al heel veel graag ja nee'.split(' '));
function contentWords(s) { return new Set((String(s).toLowerCase().match(/[a-zà-ÿ]+/g) || []).filter(w => w.length > 2 && !STOP_NL.has(w))); }

function basicSpeakEval(x, text, fx) {
  const words = wc(text);
  const target = x.part === 3 ? 25 : x.part === 2 ? 8 : 12;
  const sentences = text.split(/[.!?]+|\n/).filter(s => wc(s) >= 2).length || (words ? 1 : 0);
  const kw = contentWords(x.prompt + ' ' + x.model);
  let overlap = 0; contentWords(text).forEach(w => { if (kw.has(w)) overlap++; });
  const answers = overlap >= (x.part === 2 ? 1 : 2);
  const conn = x.part !== 3 || /\b(omdat|want)\b/i.test(text);
  fx = fx || autoFix(text);
  const substantial = words >= target / 2;
  const score = 1 + (words >= target ? 1 : substantial ? 0.5 : 0) + (answers ? 1.5 : 0) + (x.part === 3 && conn && substantial ? 0.5 : 0) + (substantial ? (fx.changes.length <= 1 ? 1 : fx.changes.length <= 3 ? 0.5 : 0) : 0) + (x.part !== 3 && words >= target ? 0.5 : 0);
  return { score: Math.round(Math.min(5, score)), words, target, sentences, answers, conn, fx };
}

function Spreken(id) {
  const x = SPREKEN.find(s => s.id === id);
  const idx = SPREKEN.indexOf(x);
  let audioURL = null; let showModel = false; let secs = 0; let transcript = ''; let resultHTML = '';
  let listening = false;
  const limit = x.part === 3 ? 60 : 30;
  const SRC = window.SpeechRecognition || window.webkitSpeechRecognition;
  const draw = () => {
    const recording = !!(rec && rec.mr && rec.mr.state === 'recording');
    let h = backBtn('Spreken') + `<div class="card"><div class="small muted">Deel ${x.part} · ${esc(t('sp_part' + x.part))}</div><div style="font-weight:800;font-size:19px;margin:6px 0">${tw(x.prompt)}</div>${S.set.showTr ? `<div class="small muted">${esc(L10N.sTr(x))}</div>` : ''}<div class="row" style="margin-top:10px"><button class="spk" id="sp-say">${esc(t('listen'))}</button></div></div>`;
    h += `<div class="card"><div class="sp-actions">`;
    if (SRC) h += `<button class="sp-btn ${listening ? 'on' : ''}" id="sp-sr"><span class="e">${listening ? '■' : '🗣️'}</span><b>${esc(listening ? t('sp_sr_stop') : t('sp_sr'))}</b><small>${esc(t('sp_sr_s'))}</small></button>`;
    h += `<button class="sp-btn rec2 ${recording ? 'on' : ''}" id="sp-rec"><span class="e">${recording ? '■' : '🎙️'}</span><b>${esc(recording ? t('sp_rec_stop') : t('sp_rec'))}</b><small>${esc(recording ? secs + ' / ' + limit + ' s' : t('sp_rec_s'))}</small></button>`;
    h += `</div>`;
    if (listening) h += `<div class="sp-live">🎙️ ${esc(t('sp_listening'))}<div class="small muted" style="font-weight:400">${esc(t('sp_autostop'))}</div></div>`;
    if (audioURL) h += `<audio controls playsinline src="${audioURL}" style="width:100%;margin-top:10px"></audio>`;
    h += `<div class="field" style="margin-top:12px"><label>${esc(t('sp_transcript'))}</label><textarea id="sp-text" rows="4" lang="nl" autocapitalize="sentences" placeholder="${esc(t('sp_transcript_ph'))}">${esc(transcript)}</textarea></div>`;
    h += `<details class="small muted" style="margin-bottom:10px"><summary>${esc(t('sp_dict_q'))}</summary><p>${esc(t('sp_dict_a'))}</p></details>`;
    h += `<button class="btn block" id="sp-check">${esc(t('sp_check'))}</button>`;
    if (L10N.sTip(x)) h += `<p class="small muted">💡 ${esc(L10N.sTip(x))}</p>`;
    h += `</div><div id="sp-res">${resultHTML}</div>`;
    h += `<button class="btn ${showModel ? 'alt' : ''} block" id="sp-model">${esc(showModel ? t('sp_model_hide') : t('sp_model_show'))}</button>`;
    if (showModel) h += `<div class="card" style="margin-top:10px"><div class="row"><b>${esc(t('w_model'))}</b><button class="spk" id="sp-msay" style="margin-left:auto">🔊</button></div><div class="model" style="margin-top:8px">${tw(x.model)}</div></div>`;
    h += `<div class="row" style="justify-content:center;margin-top:12px"><button class="btn alt" id="sp-back">${esc(t('list_back'))}</button>${SPREKEN[idx + 1] ? `<button class="btn" id="sp-next">${esc(t('next'))}</button>` : ''}</div>`;
    view(h);
    $('#sp-say').onclick = () => TTS.speak(x.prompt, 'm');
    const srb = $('#sp-sr'); if (srb) srb.onclick = toggleSR;
    $('#sp-rec').onclick = toggleRec;
    $('#sp-text').oninput = e => { transcript = e.target.value; };
    $('#sp-check').onclick = evaluate;
    $('#sp-model').onclick = () => { showModel = !showModel; draw(); };
    const ms = $('#sp-msay'); if (ms) ms.onclick = () => TTS.speak(x.model, 'f');
    bindResult();
    $('#sp-back').onclick = back;
    const nx = $('#sp-next'); if (nx) nx.onclick = () => { stack.pop(); open(Spreken, SPREKEN[idx + 1].id); };
  };
  let better = '';
  const bindResult = () => { const bs = $('#sp-bsay'); if (bs) bs.onclick = () => TTS.speak(better, 'f'); };
  const evaluate = async () => {
    const text = ($('#sp-text').value || '').trim();
    transcript = text;
    if (!text) { toast(t('sp_need_text'), 3200); return; }
    const res = $('#sp-res');
    const btn = $('#sp-check');
    btn.disabled = true;
    res.innerHTML = `<div class="card center muted">⏳ ${esc(t('w_checking'))}</div>`;
    let ai = null, aiErr = null;
    if (AI.key()) { try { ai = await AI.speaking(x, text); } catch (e) { aiErr = AI.errMsg(e); } }
    if (!$('#sp-res')) return;
    btn.disabled = false;
    let r = '';
    if (ai) {
      better = ai.better_answer || '';
      r += `<div class="card"><div class="row"><b>${esc(t('sp_eval'))}</b><span style="margin-left:auto">${scoreBadge(ai.score)}</span></div>${chk(ai.answers_question, esc(t('sp_answers')))}<div class="diff" style="margin-top:8px">${diffHTML(text, ai.corrected_text || text)}</div><div class="small muted" style="margin-top:6px">🤖 ${esc(t('w_ai_note'))}</div></div>`;
      r += `<div class="card"><b>${esc(t('w_changes'))}</b>${changesHTML(ai.changes)}</div>`;
      if (ai.feedback) r += `<div class="card ex">💬 ${esc(ai.feedback)}</div>`;
      if (better) r += `<div class="card"><div class="row"><b>${esc(t('sp_better'))}</b><button class="spk" id="sp-bsay" style="margin-left:auto">🔊</button></div><div class="model" style="margin-top:8px">${tw(better)}</div></div>`;
    } else {
      const sfx = await smartFix(text);
      if (!$('#sp-res')) return;
      const b = basicSpeakEval(x, text, sfx);
      if (aiErr) r += `<div class="card ex">⚠️ ${esc(aiErr)}</div>`;
      if (sfx.ltErr) r += `<div class="card ex">⚠️ ${esc(t('w_lt_fail'))}</div>`;
      r += `<div class="card"><div class="row"><b>${esc(t('sp_eval'))}</b><span style="margin-left:auto">${scoreBadge(b.score)}</span></div>`;
      r += chk(b.answers, esc(t('sp_keywords')));
      r += chk(b.words >= b.target, esc(t('sp_len', { n: b.words, m: b.target })));
      r += chk(b.sentences >= (x.part === 2 ? 1 : 2), esc(t('sp_sent', { n: b.sentences })));
      if (x.part === 3) r += chk(b.conn, esc(t('sp_conn')));
      r += `<div class="diff" style="margin-top:8px">${diffHTML(text, b.fx.fixed)}</div></div>`;
      r += `<div class="card"><b>${esc(t('w_changes'))}</b>${changesHTML(b.fx.changes)}<p class="small muted">${esc(sfx.source === 'lt' ? t('w_lt_note') : t('w_basic_note'))}</p></div>`;
    }
    resultHTML = r;
    res.innerHTML = r;
    bindResult();
    if (!S.done.spreken.includes(x.id)) S.done.spreken.push(x.id);
    rollDay(); S.day.spreken++; activity(ai ? (ai.score || 3) * 3 : 8); save();
    res.scrollIntoView({ behavior: 'smooth' });
  };
  /* Konusmayi yaziya doker. Kayit ile ayni anda calismaz, iOS mikrofonu ikisine birden vermiyor */
  const toggleSR = () => {
    if (listening) { if (srInst) { try { srInst.stop(); } catch (e) { /* yok */ } } return; }
    if (rec) return toast(t('sp_busy'));
    TTS.stop();
    let sr;
    try { sr = new SRC(); } catch (e) { toast(t('sp_sr_none'), 4000); return; }
    sr.lang = 'nl-NL'; sr.interimResults = true; sr.continuous = true; sr.maxAlternatives = 1;
    const base = transcript.trim() ? transcript.trim() + ' ' : '';
    let finalText = '';
    /* Konusma bitince kendiliginden dur. Hic ses gelmezse 8 sn, son kelimeden sonra 2,5 sn sessizlik */
    let quiet = null;
    const autoStop = ms => { clearTimeout(quiet); quiet = setTimeout(() => { try { sr.stop(); } catch (e) { /* yok */ } }, ms); };
    autoStop(8000);
    sr.onresult = e => {
      autoStop(2500);
      let interim = '';
      finalText = '';
      for (let i = 0; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalText += r[0].transcript + ' '; else interim += r[0].transcript; }
      transcript = (base + finalText + interim).replace(/\s+/g, ' ').trim();
      const ta = $('#sp-text'); if (ta) ta.value = transcript;
    };
    sr.onerror = e => {
      const code = e && e.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') toast(t('sp_sr_denied'), 5000);
      else if (code === 'no-speech') toast(t('sp_sr_nospeech'), 3000);
      else if (code !== 'aborted') toast(t('sp_sr_err', { e: code || '?' }), 4000);
    };
    sr.onend = () => { clearTimeout(quiet); listening = false; srInst = null; clearTimeout(srTimer); if ($('#sp-text')) draw(); };
    try { sr.start(); } catch (e) { toast(t('sp_sr_denied'), 5000); return; }
    srInst = sr; listening = true;
    srTimer = setTimeout(() => { try { sr.stop(); } catch (e) { /* yok */ } }, limit * 1000);
    draw();
  };
  /* Sadece kendini dinlemek icin ses kaydi */
  const toggleRec = async () => {
    if (rec && rec.mr && rec.mr.state === 'recording') { rec.mr.stop(); return; }
    if (listening) return toast(t('sp_busy'));
    TTS.stop();
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast(t('sp_norec')); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast(t('sp_nomic'), 4000); return; }
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
    let mr;
    try { mr = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(tr => tr.stop()); toast(t('sp_norec')); return; }
    const chunks = [];
    const me = { mr, stream };
    rec = me;
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(tr => tr.stop());
      timers.forEach(clearInterval); timers = [];
      if (rec === me) rec = null;
      if (chunks.length) { if (audioURL) URL.revokeObjectURL(audioURL); audioURL = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || type || 'audio/mp4' })); }
      else toast(t('sp_rec_empty'), 4000);
      if ($('#sp-rec')) draw();
    };
    secs = 0;
    mr.start(1000);
    draw();
    timers.push(setInterval(() => { secs++; const el = $('#sp-rec small'); if (el) el.textContent = secs + ' / ' + limit + ' s'; if (secs >= limit && rec === me && mr.state === 'recording') mr.stop(); }, 1000));
  };
  draw();
}

/* ---------- KNM ---------- */

function KnmHome() {
  let h = backBtn(t('tab_practice')) + `<h2>${esc(t('knm_title'))}</h2><p class="small muted">${esc(t('knm_info'))}</p>`;
  h += `<div class="grid2"><button class="tile" id="k-mix"><div class="e">🎲</div><div class="t">${esc(t('knm_mix'))}</div><div class="s">${esc(t('knm_mix_s'))}</div></button><button class="tile" id="k-wrong"><div class="e">🔁</div><div class="t">${esc(t('knm_wrong'))}</div><div class="s">${esc(t('knm_n', { n: S.knmWrong.length }))}</div></button></div><h3>${esc(t('themes'))}</h3>`;
  Object.entries(KNM_THEMES).forEach(([k, name]) => {
    h += `<button class="list-item" data-k="${k}"><span style="min-width:0"><div class="t">${esc(name)}</div><div class="s">${esc(L10N.knmTheme(k))}</div></span><span class="r">${esc(t('knm_n', { n: KNM.filter(q => q.theme === k).length }))}</span></button>`;
  });
  view(h);
  $('#k-mix').onclick = () => open(KnmQuiz, null, 10);
  $('#k-wrong').onclick = () => { if (!S.knmWrong.length) { toast(t('knm_nowrong')); return; } open(KnmQuiz, 'wrong', Math.min(10, S.knmWrong.length)); };
  $$('[data-k]').forEach(b => b.onclick = () => open(KnmQuiz, b.dataset.k, 10));
}

function KnmQuiz(theme, n) {
  const pool = theme === 'wrong' ? KNM.filter(q => S.knmWrong.includes(q.id)) : theme ? KNM.filter(q => q.theme === theme) : KNM;
  const qs = pick(pool, n);
  let i = 0, right = 0;
  if (!qs.length) { view(backBtn() + `<div class="card">${esc(t('no_q'))}</div>`); return; }
  const draw = () => {
    const q = qs[i];
    const order = shuffle(q.a.map((_, j) => j));
    let answered = false;
    let h = backBtn() + `<div class="qhead"><span>${i + 1}/${qs.length} · ${esc(KNM_THEMES[q.theme] || '')}</span><span>✓ ${right}</span></div><div class="card"><div class="q">${tw(q.q)}</div>${S.set.showTr && L10N.knmQ(q) ? `<div class="qtr">${esc(L10N.knmQ(q))}</div>` : ''}`;
    order.forEach(j => { h += `<button class="opt" data-j="${j}">${tw(q.a[j])}</button>`; });
    h += '<div id="kq-ex"></div></div><div id="kq-next"></div>';
    view(h);
    $$('.opt').forEach(b => b.onclick = () => {
      if (answered) return; answered = true;
      const ok = +b.dataset.j === 0;
      $$('.opt').forEach(o => { if (+o.dataset.j === 0) o.classList.add('right'); });
      if (!ok) { b.classList.add('wrong'); vib([30, 30, 30]); if (!S.knmWrong.includes(q.id)) S.knmWrong.push(q.id); }
      else { right++; vib(10); if (theme === 'wrong') S.knmWrong = S.knmWrong.filter(x => x !== q.id); }
      stat('knm', ok); rollDay(); S.day.knm++; activity(ok ? 3 : 1); save();
      const ex = L10N.knmEx(q);
      $('#kq-ex').innerHTML = ex ? `<div class="ex">💡 ${esc(ex)}</div>` : '';
      $('#kq-next').innerHTML = `<button class="btn block">${esc(i === qs.length - 1 ? t('result') : t('next'))}</button>`;
      $('#kq-next button').onclick = () => { i++; if (i < qs.length) draw(); else result(); };
    });
  };
  const result = () => {
    view(backBtn() + `<div class="card center" style="padding:24px"><div style="font-size:40px">${right / qs.length >= 0.7 ? '🏛️' : '📚'}</div><h2>${right}/${qs.length}</h2><p class="muted">${esc(t('knm_res'))}</p><button class="btn" id="kq-again">${esc(t('ty_round'))}</button></div>`);
    $('#kq-again').onclick = () => { stack.pop(); open(KnmQuiz, theme, n); };
  };
  draw();
}

/* ---------- GRAMER ---------- */

function GramHome() {
  let h = backBtn(t('tab_practice')) + `<h2>${esc(t('gram_title'))}</h2>`;
  h += `<div class="grid2"><button class="tile" id="g-verbs"><div class="e">🔁</div><div class="t">${esc(t('gram_verbs'))}</div><div class="s">${esc(t('gram_verbs_s', { n: VERBS.length }))}</div></button><button class="tile" id="g-mix"><div class="e">🎲</div><div class="t">${esc(t('gram_mix'))}</div><div class="s">${esc(t('gram_mix_s'))}</div></button></div><h3>${esc(t('lessons'))}</h3>`;
  GRAMMAR.forEach(g => { const d = S.done.grammar.includes(g.id); h += `<button class="list-item ${d ? 'done' : ''}" data-g="${g.id}"><span class="ic">${g.icon || '📘'}</span><span class="t">${esc(L10N.gTitle(g))}</span><span class="r">${g.drills.length}</span></button>`; });
  view(h);
  $('#g-verbs').onclick = () => open(VerbDrill);
  $('#g-mix').onclick = () => open(GramDrill, null);
  $$('[data-g]').forEach(b => b.onclick = () => open(GramLesson, b.dataset.g));
}

function GramLesson(id) {
  const g = GRAMMAR.find(x => x.id === id);
  view(backBtn('Grammatica') + `<h2>${g.icon || '📘'} ${esc(L10N.gTitle(g))}</h2><div class="card lesson">${L10N.gBody(g)}</div><button class="btn block" id="gl-go">${esc(t('gram_go', { n: g.drills.length }))}</button>`);
  $('#gl-go').onclick = () => open(GramDrill, id);
}

function GramDrill(id) {
  const g = id ? GRAMMAR.find(x => x.id === id) : null;
  const all = g ? g.drills.map((d, i) => ({ d, g, i })) : GRAMMAR.flatMap(gg => gg.drills.map((d, i) => ({ d, g: gg, i })));
  const items = g ? shuffle(all) : pick(all, 12);
  let k = 0, right = 0;
  const draw = () => {
    const { d, g: gg, i: di } = items[k];
    const order = shuffle(d.a.map((_, j) => j));
    let answered = false;
    let h = backBtn() + `<div class="qhead"><span>${k + 1}/${items.length}</span><span>✓ ${right}</span></div><div class="card"><div class="q" style="font-size:20px">${tw(d.q).replace(/_{2,}/g, '<span class="gap"></span>')}</div><div style="height:8px"></div>`;
    order.forEach(j => { h += `<button class="opt" data-j="${j}">${tw(d.a[j])}</button>`; });
    h += '<div id="gd-ex"></div></div><div id="gd-next"></div>';
    view(h);
    $$('.opt').forEach(b => b.onclick = () => {
      if (answered) return; answered = true;
      const ok = +b.dataset.j === 0;
      $$('.opt').forEach(o => { if (+o.dataset.j === 0) o.classList.add('right'); });
      if (!ok) { b.classList.add('wrong'); vib([30, 30, 30]); } else { right++; vib(10); }
      stat('grammatica', ok); activity(ok ? 2 : 1); save();
      const full = d.q.replace(/_{2,}/, d.a[0]);
      TTS.speak(full);
      const ex = L10N.gEx(gg, di);
      $('#gd-ex').innerHTML = `<div class="ex">${ok ? '✅' : '❌'} <b>${tw(full)}</b>${ex ? '<br>' + esc(ex) : ''}</div>`;
      $('#gd-next').innerHTML = `<button class="btn block">${esc(k === items.length - 1 ? t('result') : t('next'))}</button>`;
      $('#gd-next button').onclick = () => { k++; if (k < items.length) draw(); else done(); };
    });
  };
  const done = () => {
    const passed = right / items.length >= 0.7;
    if (g && passed && !S.done.grammar.includes(g.id)) S.done.grammar.push(g.id);
    save();
    view(backBtn() + `<div class="card center" style="padding:24px"><h2>${right}/${items.length}</h2><p class="muted">${esc(passed ? t('gram_done') : t('gram_need'))}</p><button class="btn" id="gd-again">${esc(t('again'))}</button></div>`);
    $('#gd-again').onclick = () => { stack.pop(); open(GramDrill, id); };
  };
  draw();
}

const PERS = ['ik', 'jij', 'hij', 'wij'];
const AUX = { hebben: { ik: 'heb', jij: 'hebt', hij: 'heeft', wij: 'hebben' }, zijn: { ik: 'ben', jij: 'bent', hij: 'is', wij: 'zijn' } };
const PAST_PL = { was: 'waren', had: 'hadden', kon: 'konden', wou: 'wilden', wilde: 'wilden', mocht: 'mochten', moest: 'moesten', zou: 'zouden', ging: 'gingen', kwam: 'kwamen', deed: 'deden', at: 'aten', las: 'lazen', zag: 'zagen', gaf: 'gaven', nam: 'namen', sprak: 'spraken', schreef: 'schreven', dronk: 'dronken', kocht: 'kochten', bracht: 'brachten', dacht: 'dachten', vond: 'vonden', begon: 'begonnen', bleef: 'bleven', werd: 'werden', wist: 'wisten', sliep: 'sliepen', liep: 'liepen', reed: 'reden', vloog: 'vlogen', stond: 'stonden', zat: 'zaten', lag: 'lagen', hielp: 'hielpen', hield: 'hielden', kreeg: 'kregen', trok: 'trokken', zocht: 'zochten', vroeg: 'vroegen', zei: 'zeiden' };
function pluralPast(pv) { const sep = pv.split(' '); const base = sep[0]; const pl = PAST_PL[base] || (/(te|de)$/.test(base) ? base + 'n' : base + 'en'); return [pl].concat(sep.slice(1)).join(' '); }
function verbForm(v, tense, p) {
  if (tense === 'nu') return v[p];
  if (tense === 'perf') return AUX[v.aux][p] + ' ' + v.perf;
  return p === 'wij' ? pluralPast(v.pv) : v.pv;
}

function VerbDrill() {
  const tenses = ['nu', 'perf', 'verl'];
  let i = 0, right = 0;
  const total = 12;
  const draw = () => {
    const v = VERBS[Math.floor(Math.random() * VERBS.length)];
    const tn = tenses[Math.floor(Math.random() * tenses.length)];
    const p = PERS[Math.floor(Math.random() * 4)];
    const correct = verbForm(v, tn, p);
    const wrongs = new Set();
    PERS.filter(x => x !== p).forEach(x => wrongs.add(verbForm(v, tn, x)));
    if (tn === 'perf') wrongs.add(AUX[v.aux === 'hebben' ? 'zijn' : 'hebben'][p] + ' ' + v.perf);
    if (tn !== 'nu') wrongs.add(v[p]);
    if (tn === 'nu') wrongs.add(v.inf);
    if (tn === 'verl') wrongs.add(verbForm(v, 'perf', p));
    const opts = shuffle([correct].concat(pick([...wrongs].filter(w => w && w !== correct), 3)));
    let answered = false;
    let h = backBtn() + `<div class="qhead"><span>${i + 1}/${total}</span><span>✓ ${right}</span></div><div class="card center"><div class="muted">${esc(L10N.verb(v))}</div><div style="font-size:28px;font-weight:800">${esc(v.inf)}</div><div class="chips" style="justify-content:center;margin-top:8px"><span class="chip on">${esc(t('t_' + tn))}</span><span class="chip">${p}</span></div></div>`;
    opts.forEach(o => { h += `<button class="opt" data-o="${esc(o)}">${tw(p + ' ' + o)}</button>`; });
    h += '<div id="vd-next"></div>';
    view(h);
    $$('.opt').forEach(b => b.onclick = () => {
      if (answered) return; answered = true;
      const ok = b.dataset.o === correct;
      $$('.opt').forEach(o => { if (o.dataset.o === correct) o.classList.add('right'); });
      if (!ok) b.classList.add('wrong'); else right++;
      vib(ok ? 10 : [30, 30, 30]);
      stat('grammatica', ok); activity(ok ? 2 : 1); save();
      TTS.speak(p + ' ' + correct);
      $('#vd-next').innerHTML = `<button class="btn block">${esc(i === total - 1 ? t('result') : t('next'))}</button>`;
      $('#vd-next button').onclick = () => {
        i++;
        if (i < total) return draw();
        view(backBtn() + `<div class="card center" style="padding:24px"><h2>${right}/${total}</h2><button class="btn" id="vd-again">${esc(t('again'))}</button></div>`);
        $('#vd-again').onclick = () => { stack.pop(); open(VerbDrill); };
      };
    });
  };
  draw();
}

/* ---------- SINAV ---------- */

function Exam() {
  let h = `<h2>${esc(t('exam_title'))}</h2><p class="small muted">${esc(t('exam_info'))}</p>`;
  [['knm', '🏛️', 'ex_knm40'], ['knm20', '🏛️', 'ex_knm20'], ['lezen', '📖', 'ex_lezen'], ['luisteren', '🎧', 'ex_lu']].forEach(([k, ic, key]) => {
    h += `<button class="list-item" data-x="${k}"><span class="ic">${ic}</span><span><div class="t">${esc(t(key))}</div><div class="s">${esc(t(key + '_s'))}</div></span></button>`;
  });
  if (S.exams.length) {
    h += `<h3>${esc(t('ex_hist'))}</h3><div class="card">`;
    S.exams.slice(-12).reverse().forEach(e => { const pct = Math.round(e.r / e.t * 100); h += `<div class="wordrow"><div><div class="nl">${esc(e.key ? t(e.key) : e.name)}</div><div class="small muted">${esc(e.date)}</div></div><span class="lvl" style="color:${pct >= 70 ? 'var(--good)' : 'var(--bad)'};font-weight:700">${e.r}/${e.t} · ${pct}%</span></div>`; });
    h += '</div>';
  }
  view(h);
  $$('[data-x]').forEach(b => b.onclick = () => {
    const k = b.dataset.x;
    if (k === 'knm') open(ExamMC, 'ex_knm40', pick(KNM, 40), 45 * 60);
    if (k === 'knm20') open(ExamMC, 'ex_knm20', pick(KNM, 20), 22 * 60);
    if (k === 'lezen') open(ExamLezen);
    if (k === 'luisteren') open(ExamLuisteren);
  });
}

function startClock(sec, onTick, onEnd) {
  const end = Date.now() + sec * 1000;
  const tick = () => { const left = Math.max(0, Math.round((end - Date.now()) / 1000)); onTick(left); if (left <= 0) { stopTimers(); onEnd(); } };
  timers.push(setInterval(tick, 1000));
  tick();
}
const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function finishExam(key, r, total, review) {
  stopTimers();
  S.exams.push({ key, r, t: total, date: new Date().toLocaleDateString(lang() === 'en' ? 'en-GB' : 'tr-TR') });
  activity(r * 3); save();
  const pct = Math.round(r / total * 100);
  stack.length = Math.max(0, stack.length - 1);
  view(backBtn(t('tab_exam')) + `<div class="card center" style="padding:24px"><div style="font-size:44px">${pct >= 70 ? '🎉' : '📚'}</div><h2>${r}/${total} · ${pct}%</h2><p class="muted">${esc(pct >= 70 ? t('ex_pass') : t('ex_fail'))}</p></div>${review || ''}`);
}
function wrongCard(q, given) {
  const ex = q.ex ? L10N.knmEx(q) : '';
  return `<div class="card"><div class="q">${tw(q.q)}</div><div class="small" style="color:var(--good)">✓ ${tw(q.a[0])}</div>${given != null ? `<div class="small" style="color:var(--bad)">✕ ${tw(q.a[given])}</div>` : `<div class="small muted">${esc(t('ex_empty'))}</div>`}${ex ? `<div class="ex">${esc(ex)}</div>` : ''}</div>`;
}

function ExamMC(key, qs, sec) {
  const answers = new Array(qs.length).fill(null);
  const orders = qs.map(q => shuffle(q.a.map((_, j) => j)));
  let i = 0; let finished = false; let clock = '';
  const finish = () => {
    if (finished) return; finished = true;
    let r = 0; let rev = `<h3>${esc(t('ex_wrong'))}</h3>`;
    qs.forEach((q, k) => {
      const ok = answers[k] === 0;
      stat('knm', ok);
      if (ok) r++;
      else { if (!S.knmWrong.includes(q.id)) S.knmWrong.push(q.id); rev += wrongCard(q, answers[k]); }
    });
    finishExam(key, r, qs.length, r === qs.length ? '' : rev);
  };
  const draw = () => {
    const q = qs[i];
    let h = backBtn(t('tab_exam')) + `<div class="qhead"><span>${i + 1}/${qs.length}</span><span class="timer" id="ex-clock">${clock}</span></div><div class="card"><div class="q">${tw(q.q)}</div>`;
    orders[i].forEach(j => { h += `<button class="opt ${answers[i] === j ? 'sel' : ''}" data-j="${j}">${tw(q.a[j])}</button>`; });
    h += `</div><div class="row" style="justify-content:space-between"><button class="btn alt" id="ex-prev" ${i === 0 ? 'disabled' : ''}>${esc(t('ex_prev'))}</button><span class="small muted">${esc(t('ex_answered', { n: answers.filter(a => a !== null).length }))}</span>${i < qs.length - 1 ? `<button class="btn" id="ex-next">${esc(t('next'))}</button>` : `<button class="btn" id="ex-end">${esc(t('finish'))}</button>`}</div>`;
    view(h);
    $$('.opt').forEach(b => b.onclick = () => { answers[i] = +b.dataset.j; $$('.opt').forEach(o => o.classList.toggle('sel', o === b)); });
    $('#ex-prev').onclick = () => { if (i > 0) { i--; draw(); } };
    const n = $('#ex-next'); if (n) n.onclick = () => { i++; draw(); };
    const e = $('#ex-end'); if (e) e.onclick = () => { const empty = answers.filter(a => a === null).length; if (!empty || confirm(t('ex_confirm_empty', { n: empty }))) finish(); };
  };
  draw();
  startClock(sec, left => { clock = '⏱ ' + mmss(left); const c = $('#ex-clock'); if (c) c.textContent = clock; }, () => { toast(t('ex_time')); finish(); });
}

function ExamLezen() {
  const texts = pick(LEZEN, 5);
  let finished = false;
  let h = backBtn(t('tab_exam')) + `<div class="qhead"><span>${esc(t('ex_lezen'))}</span><span class="timer" id="ex-clock"></span></div>`;
  texts.forEach((x, k) => { h += `<div class="card doc"><div class="type">${esc(t('ex_text', { n: k + 1 }))} · ${esc(x.type)}</div><div style="font-weight:800;margin:4px 0 8px">${tw(x.title)}</div><div class="reading">${tw(x.text)}</div></div><div id="exl-${k}"></div>`; });
  h += `<button class="btn block" id="exl-end">${esc(t('ex_score'))}</button>`;
  view(h);
  const all = [];
  texts.forEach((x, k) => {
    const el = $('#exl-' + k);
    const qs = x.questions.map(q => ({ q, order: shuffle(q.a.map((_, j) => j)), ans: null }));
    all.push(...qs);
    el.innerHTML = qs.map((o, qi) => `<div class="card"><div class="q">${tw(o.q.q)}</div>${o.order.map(j => `<button class="opt" data-qi="${qi}" data-j="${j}">${tw(o.q.a[j])}</button>`).join('')}</div>`).join('');
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => { qs[+b.dataset.qi].ans = +b.dataset.j; el.querySelectorAll(`.opt[data-qi="${b.dataset.qi}"]`).forEach(o => o.classList.toggle('sel', o === b)); });
  });
  const finish = () => {
    if (finished) return; finished = true;
    let r = 0; let rev = `<h3>${esc(t('ex_wrong'))}</h3>`;
    all.forEach(o => { const ok = o.ans === 0; stat('lezen', ok); if (ok) r++; else rev += wrongCard(o.q, o.ans); });
    finishExam('ex_lezen', r, all.length, r === all.length ? '' : rev);
  };
  $('#exl-end').onclick = () => { if (confirm(t('ex_confirm'))) finish(); };
  startClock(25 * 60, left => { const c = $('#ex-clock'); if (c) c.textContent = '⏱ ' + mmss(left); }, () => { toast(t('ex_time')); finish(); });
}

function ExamLuisteren() {
  const items = pick(LUISTEREN, 6);
  let k = 0; const results = [];
  const run = () => {
    const x = items[k];
    let plays = 0; let playing = false;
    const qs = x.questions.map(q => ({ q, order: shuffle(q.a.map((_, j) => j)), ans: null }));
    const draw = () => {
      let h = backBtn(t('tab_exam')) + `<div class="qhead"><span>${esc(t('ex_frag', { i: k + 1, n: items.length }))}</span><span>${esc(t('ex_plays', { n: plays }))}</span></div><div class="card"><div class="muted small">${tw(x.setting)}</div><div class="player" style="margin-top:10px"><button class="play" id="el-play" ${plays >= 2 && !playing ? 'disabled' : ''}>${playing ? '■' : '▶'}</button><div class="small muted">${esc(t('ex_read_first'))}</div></div></div>`;
      h += qs.map((o, qi) => `<div class="card"><div class="q">${tw(o.q.q)}</div>${o.order.map(j => `<button class="opt ${o.ans === j ? 'sel' : ''}" data-qi="${qi}" data-j="${j}">${tw(o.q.a[j])}</button>`).join('')}</div>`).join('');
      h += `<button class="btn block" id="el-next">${esc(k === items.length - 1 ? t('finish') : t('ex_next_frag'))}</button>`;
      view(h);
      $('#el-play').onclick = () => {
        if (playing) { if (window._stopSeq) window._stopSeq(); window._stopSeq = null; playing = false; draw(); return; }
        if (plays >= 2) { toast(t('lu_nomore')); return; }
        plays++; playing = true; draw();
        window._stopSeq = TTS.seq(x.lines, null, () => { playing = false; if ($('#el-play')) draw(); });
      };
      $$('.opt').forEach(b => b.onclick = () => { qs[+b.dataset.qi].ans = +b.dataset.j; $$(`.opt[data-qi="${b.dataset.qi}"]`).forEach(o => o.classList.toggle('sel', o === b)); });
      $('#el-next').onclick = () => {
        TTS.stop(); if (window._stopSeq) { window._stopSeq(); window._stopSeq = null; }
        results.push(...qs);
        k++;
        if (k < items.length) return run();
        let r = 0; let rev = `<h3>${esc(t('ex_wrong'))}</h3>`;
        results.forEach(o => { const ok = o.ans === 0; stat('luisteren', ok); if (ok) r++; else rev += wrongCard(o.q, o.ans); });
        finishExam('ex_lu', r, results.length, r === results.length ? '' : rev);
      };
    };
    draw();
  };
  run();
}

/* ---------- PROFIL ---------- */

function Me() {
  TTS.load();
  const vOpt = sel => `<option value="">${esc(t('me_auto'))}</option>` + TTS.voices.map(v => `<option ${TTS.id(v) === sel || (sel && !TTS.voices.some(x => TTS.id(x) === sel) && v.name === sel) ? 'selected' : ''} value="${esc(TTS.id(v))}">${esc(TTS.label(v))}</option>`).join('');
  const vf = TTS.pick('f'), vm = TTS.pick('m');
  const best = Math.max(vf ? TTS.quality(vf) : 0, vm ? TTS.quality(vm) : 0);
  const prof = PROFILES.find(p => p.id === PROFILE) || {};
  let h = `<h2>${esc(t('me_title'))}</h2><div class="card">`;
  h += `<div class="setting"><span>${esc(t('me_profile'))}</span><button class="btn sm alt" id="s-who">${esc(prof.icon + ' ' + profName())} · ${esc(t('me_switch'))}</button></div>`;
  h += `<div class="setting"><span>${esc(t('me_lang'))}</span><div class="seg mini"><button data-l="tr" class="${lang() === 'tr' ? 'on' : ''}">Türkçe</button><button data-l="en" class="${lang() === 'en' ? 'on' : ''}">English</button></div></div>`;
  h += `<div class="setting"><span>${esc(t('me_exam_date'))}</span><input type="date" id="s-date" value="${esc(S.set.examDate)}"></div>`;
  h += `<div class="setting"><span>${esc(t('me_new'))}</span><select id="s-new">${[5, 10, 15, 20, 30].map(n => `<option ${n === S.set.newPerDay ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
  h += `<div class="setting"><span>${esc(t('me_goal'))}</span><select id="s-goal">${[15, 30, 50, 80].map(n => `<option ${n === S.set.goal ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
  h += `<div class="setting"><span>${esc(t('me_tr'))}</span><input type="checkbox" id="s-tr" ${S.set.showTr ? 'checked' : ''}></div></div>`;
  h += `<h3>${esc(t('me_voice'))}</h3><div class="card">`;
  h += `<div class="setting"><span>${esc(t('me_voice_q'))}</span><span class="small" id="s-vq" style="text-align:right">♀ ${esc(vf ? vf.name + ' · ' + TTS.qualityLabel(vf) : '-')}<br>♂ ${esc(vm ? vm.name + ' · ' + TTS.qualityLabel(vm) : '-')}</span></div>`;
  h += `<div class="setting"><span>${esc(t('me_rate'))}</span><select id="s-rate">${[0.7, 0.8, 0.9, 1, 1.1].map(n => `<option ${n === S.set.rate ? 'selected' : ''} value="${n}">${n}x</option>`).join('')}</select></div>`;
  h += `<div class="setting"><span>${esc(t('me_vf'))}</span><select id="s-vf">${vOpt(S.set.voiceF)}</select></div>`;
  h += `<div class="setting"><span>${esc(t('me_vm'))}</span><select id="s-vm">${vOpt(S.set.voiceM)}</select></div>`;
  h += `<div class="row" style="margin-top:8px"><button class="btn sm alt" id="s-test">${esc(t('me_test'))}</button></div>`;
  h += `<p class="small muted">${esc(TTS.voices.length ? t('me_voice_found', { n: TTS.voices.length }) : t('me_voice_none'))}</p>`;
  h += `<div class="small ${best >= 2 ? 'muted' : 'ex'}">${t('me_voice_help')}</div>`;
  h += `<details class="small" style="margin-top:10px"><summary>${esc(t('me_voices_all'))}</summary><p class="muted">${esc(t('me_voices_help'))}</p><div class="voice-list">${TTS.voices.length ? TTS.voices.map((v, i) => `<div class="${v === vf || v === vm ? 'on' : ''}"><button class="spk mini" data-vi="${i}">▶</button> ${esc(TTS.label(v))}${TTS.gender(v) ? ' · ' + (TTS.gender(v) === 'f' ? '♀' : '♂') : ''}<br><span class="muted">${esc(v.voiceURI || '')}</span></div>`).join('') : esc(t('me_voice_none'))}</div><button class="btn sm alt" id="s-vreload" style="margin-top:8px">${esc(t('me_voices_reload'))}</button></details></div>`;
  h += `<h3>${esc(t('me_lt'))}</h3><div class="card"><div class="setting"><span>${esc(t('me_lt'))}</span><input type="checkbox" id="s-lt" ${S.set.lt !== false ? 'checked' : ''}></div><p class="small muted">${esc(t('me_lt_help'))}</p></div>`;
  h += `<h3>${esc(t('me_ai'))}</h3><div class="card"><p class="small muted" style="margin-top:0">${esc(t('me_ai_help'))}</p>`;
  h += `<div class="setting"><span>${esc(t('me_ai_key'))}</span><span class="small ${AI.key() ? '' : 'muted'}" id="s-ai-state">${esc(AI.key() ? t('me_ai_on') : t('me_ai_off'))}</span></div>`;
  h += `<input id="s-key" class="text-in" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="sk-ant-..." value="${esc(AI.key())}"><div class="row" style="margin-top:8px"><button class="btn sm" id="s-key-save">${esc(t('me_ai_save'))}</button><button class="btn sm alt" id="s-key-test">${esc(t('me_ai_test'))}</button></div></div>`;
  const learned = Object.values(S.srs).filter(c => c.iv >= 21).length;
  h += `<h3>${esc(t('me_stats'))}</h3><div class="grid2"><div class="tile"><div class="t">${Object.keys(S.srs).length}/${WORDS.length}</div><div class="s">${esc(t('me_seen'))}</div></div><div class="tile"><div class="t">${learned}</div><div class="s">${esc(t('me_perm'))}</div></div><div class="tile"><div class="t">${esc(t('me_streak', { n: S.streak }))}</div><div class="s">${esc(t('me_streak_l'))}</div></div><div class="tile"><div class="t">${S.exams.length}</div><div class="s">${esc(t('me_exams'))}</div></div></div>`;
  h += `<h3>${esc(t('me_src'))}</h3><div class="card small"><p><a href="https://www.inburgeren.nl" target="_blank" rel="noopener">${esc(t('me_src1'))}</a></p><p><a href="https://ind.nl/nl/inburgering-voor-naturalisatie" target="_blank" rel="noopener">${esc(t('me_src2'))}</a></p><p class="muted">${esc(t('me_src_note'))}</p></div>`;
  h += `<h3>${esc(t('me_backup'))}</h3><div class="card"><p class="small muted">${esc(t('me_backup_note'))}</p><div class="row"><button class="btn sm alt" id="s-exp">${esc(t('me_exp'))}</button><label class="btn sm alt">${esc(t('me_imp'))}<input type="file" id="s-imp" accept="application/json,.json" style="display:none"></label><button class="btn sm alt" id="s-reset" style="color:var(--bad)">${esc(t('me_reset'))}</button>${PROFILES.length > 1 ? `<button class="btn sm alt" id="s-del" style="color:var(--bad)">${esc(t('me_delete'))}</button>` : ''}</div></div>`;
  view(h);
  $('#s-who').onclick = () => { TTS.stop(); Who(); };
  $$('[data-l]').forEach(b => b.onclick = () => { S.set.lang = b.dataset.l; save(); Me(); });
  $('#s-date').onchange = e => { S.set.examDate = e.target.value; save(); };
  $('#s-new').onchange = e => { S.set.newPerDay = +e.target.value; save(); };
  $('#s-goal').onchange = e => { S.set.goal = +e.target.value; save(); };
  $('#s-tr').onchange = e => { S.set.showTr = e.target.checked; save(); };
  $('#s-lt').onchange = e => { S.set.lt = e.target.checked; save(); };
  $('#s-rate').onchange = e => { S.set.rate = +e.target.value; save(); };
  $('#s-vf').onchange = e => { S.set.voiceF = e.target.value; save(); Me(); };
  $('#s-vm').onchange = e => { S.set.voiceM = e.target.value; save(); Me(); };
  $('#s-test').onclick = () => { window._stopSeq = TTS.seq([{ t: 'Goedemorgen, hoe gaat het met u?', g: 'f' }, { t: 'Goed, dank u wel. En met u?', g: 'm' }]); };
  $('#s-key-save').onclick = () => { const v = $('#s-key').value.trim(); if (v) { lsSet('a2.apikey', v); toast(t('me_ai_saved')); } else { lsDel('a2.apikey'); toast(t('me_ai_removed')); } Me(); };
  $('#s-key-test').onclick = async () => {
    const v = $('#s-key').value.trim(); if (v) lsSet('a2.apikey', v);
    if (!AI.key()) return;
    const b = $('#s-key-test'); b.disabled = true;
    try {
      const r = await AI.ask('Reply with a JSON object.', 'Say ok.', { type: 'object', additionalProperties: false, required: ['ok'], properties: { ok: { type: 'boolean' } } });
      toast(r && 'ok' in r ? t('me_ai_ok') : t('me_ai_err', { e: '?' }));
    } catch (e) { toast(t('me_ai_err', { e: AI.errMsg(e) }), 4000); }
    if ($('#s-key-test')) { $('#s-key-test').disabled = false; $('#s-ai-state').textContent = AI.key() ? t('me_ai_on') : t('me_ai_off'); }
  };
  $('#s-exp').onclick = () => {
    const blob = new Blob([JSON.stringify({ profile: PROFILE, state: S })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'a2-' + PROFILE + '-' + dstr() + '.json'; document.body.appendChild(a); a.click(); a.remove();
  };
  $('#s-imp').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(txt => {
      try { const d = JSON.parse(txt); const st = d.state || d; if (!st.srs) throw new Error('x'); S = deepMerge(JSON.parse(JSON.stringify(DEF)), st); save(); toast(t('me_imp_ok')); Me(); }
      catch (err) { toast(t('me_imp_bad')); }
    });
  };
  const vr = $('#s-vreload'); if (vr) vr.onclick = () => { TTS.load(); Me(); const d = $('#main details'); if (d) d.open = true; };
  $$('[data-vi]').forEach(b => b.onclick = () => {
    const v = TTS.voices[+b.dataset.vi]; if (!v) return;
    TTS.stop();
    const u = new SpeechSynthesisUtterance('Goedemiddag. Ik ben ' + v.name + '. Hoe gaat het met u?');
    u.voice = v; u.lang = v.lang; u.rate = S.set.rate;
    speechSynthesis.speak(u);
  });
  const del = $('#s-del'); if (del) del.onclick = () => {
    if (!confirm(t('me_delete_q', { name: profName() }))) return;
    const gone = PROFILE;
    Object.keys(localStorage).filter(k => k === stateKey(gone) || k === 'a2.dehet.' + gone || k.startsWith('a2.draft.' + gone + '.')).forEach(lsDel);
    PROFILES = PROFILES.filter(p => p.id !== gone);
    saveProfiles();
    PROFILE = null; lsDel('a2.profile');
    Who();
  };
  $('#s-reset').onclick = () => { if (confirm(t('me_reset_q', { name: profName() }))) { lsDel(stateKey(PROFILE)); lsDel('a2.dehet.' + PROFILE); loadProfile(PROFILE); save(); switchTab('home'); } };
}

/* ---------- kelime cevirisi ---------- */

function showWord(el) {
  const d = lookup(el.dataset.w);
  showPop(d ? `<b>${esc(el.textContent)}</b> · ${esc(d.tr)}` : `<b>${esc(el.textContent)}</b> · ${esc(t('not_in_dict'))}`);
  TTS.speak(el.textContent);
}
let pressTimer = null, pressFired = false, pressX = 0, pressY = 0;
document.addEventListener('pointerdown', e => {
  const w = e.target.closest('.wd');
  pressFired = false;
  clearTimeout(pressTimer);
  if (!w || !w.closest('.opt')) return;
  pressX = e.clientX; pressY = e.clientY;
  pressTimer = setTimeout(() => { pressFired = true; showWord(w); vib(10); }, 450);
});
document.addEventListener('pointermove', e => { if (Math.abs(e.clientX - pressX) + Math.abs(e.clientY - pressY) > 10) clearTimeout(pressTimer); });
['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => clearTimeout(pressTimer)));
document.addEventListener('click', e => {
  if (pressFired) { pressFired = false; e.stopPropagation(); e.preventDefault(); return; }
  const w = e.target.closest('.wd');
  if (w) {
    const opt = w.closest('.opt');
    const answered = opt && !!opt.parentElement.querySelector('.opt.right');
    if (!opt || answered) { e.stopPropagation(); e.preventDefault(); showWord(w); return; }
  }
  if (!e.target.closest('#pop')) hidePop();
}, true);
document.addEventListener('contextmenu', e => { if (e.target.closest('.opt')) e.preventDefault(); });

/* ---------- baslat ---------- */

$$('#tabs button').forEach(b => b.onclick = () => { if (PROFILE && S) { $('#app').classList.remove('picking'); switchTab(b.dataset.t); } });
$('#who').onclick = () => { if (PROFILE) { TTS.stop(); stopTimers(); Who(); } };
if (PROFILE && PROFILES.some(p => p.id === PROFILE)) { loadProfile(PROFILE); renderTop(); switchTab('home'); }
else { PROFILE = null; S = deepMerge(JSON.parse(JSON.stringify(DEF)), {}); Who(); }
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
