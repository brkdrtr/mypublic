'use strict';
/* Komut aciklama motoru. Bir komut satirini parcalara ayirir, her komutu, seceneği, argumani ve operatoru aciklar.
   Veri explain-db*.js dosyalarinda, Object.assign(EXPLAIN_DB, {...}) ile eklenir. Bicim EXPLAIN.md icinde.
   Disariya acilan fonksiyonlar explainLine, explainText, explainHTML, explainRef, explainHint */

const EXPLAIN_DB = {};

const XP_OPS = {
  '|': 'Pipe. Soldaki komutun stdout çıktısı sağdaki komutun stdin girdisi olur',
  '|&': 'Pipe, stdout ve stderr birlikte sağdaki komuta gider',
  '&&': 'Soldaki komut başarılıysa, yani exit code 0 ise sağdakini çalıştır',
  '||': 'Soldaki komut başarısızsa, exit code 0 değilse sağdakini çalıştır',
  ';': 'Komutları sırayla çalıştır, öncekinin sonucuna bakmaz',
  '&': 'Komutu arka planda çalıştırır, terminal hemen geri gelir. jobs ile görürsün',
  ';;': 'case dalının sonu. Eşleşen dalın komutları bitti, case bloğundan çıkılır',
};
const XP_REDIR = {
  '>': 'stdout çıktısını dosyaya yazar. Dosya varsa içeriği silinip üzerine yazılır',
  '>>': 'stdout çıktısını dosyanın sonuna ekler, eski içerik korunur',
  '<': 'Dosyayı komutun stdin girdisi yapar',
  '2>': 'stderr yani hata çıktısını dosyaya yönlendirir',
  '2>>': 'stderr çıktısını dosyanın sonuna ekler',
  '&>': 'stdout ve stderr ikisini birden dosyaya yazar',
  '&>>': 'stdout ve stderr ikisini birden dosyanın sonuna ekler',
  '2>&1': 'stderr çıktısını stdout nereye gidiyorsa oraya yollar. Sıra önemli, önce > dosya sonra 2>&1',
  '1>&2': 'stdout çıktısını stderr\'e yollar, script içinde hata mesajı basmak için',
  '>&2': 'stdout çıktısını stderr\'e yollar, script içinde hata mesajı basmak için',
  '1>': 'stdout çıktısını dosyaya yazar, > ile aynı',
  '<<<': 'Here string. Sağdaki metni komutun stdin girdisi yapar',
  '<<': 'Here document. Bir sonraki satırlardan bitiş kelimesine kadar olan metin stdin olur',
};
const XP_KW = {
  if: 'if, arkasındaki komut başarılıysa yani exit code 0 ise then bloğu çalışır',
  then: 'then, if koşulu doğruysa çalışacak blok başlar',
  elif: 'elif, önceki koşul tutmadıysa bu koşulu dene',
  else: 'else, hiçbir koşul tutmadıysa çalışacak blok',
  fi: 'fi, if bloğunun sonu',
  for: 'for, listedeki her öğe için döngü. for degisken in liste',
  while: 'while, arkasındaki komut başarılı oldukça döngü devam eder',
  until: 'until, arkasındaki komut başarılı olana kadar döngü devam eder',
  do: 'do, döngü gövdesi başlar',
  done: 'done, döngünün sonu',
  case: 'case, değeri desenlerle karşılaştırır. Her desen ) ile biter, blok ;; ile kapanır',
  esac: 'esac, case bloğunun sonu',
  in: 'in, for döngüsünde liste ya da case içinde değer',
  function: 'function, fonksiyon tanımı',
  '{': 'Komut grubu ya da fonksiyon gövdesi başlar',
  '}': 'Komut grubu ya da fonksiyon gövdesi biter',
  '((': 'Aritmetik ifade',
  '[[': 'Gelişmiş test ifadesi, [ komutunun bash hali. Regex için =~ kullanılabilir',
};
/* yorumlayicilar, script adindan sonraki her sey script'in kendi argumani */
const XP_STOP = new Set(['python', 'python3', 'bash', 'sh', 'zsh', 'node', 'perl', 'ruby', 'php']);
const XP_WRAP = new Set(['sudo', 'env', 'nohup', 'time', 'nice', 'xargs', 'watch', 'timeout', 'exec', 'command', 'builtin', 'stdbuf', 'strace', 'ionice', 'doas', 'chroot']);

/* ---------- tokenizer ---------- */

function xpTokenize(line) {
  const toks = [];
  let i = 0; const n = line.length;
  const push = t => toks.push(t);
  while (i < n) {
    const c = line[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '#' ) break;
    /* operatorler */
    const three = line.slice(i, i + 4);
    const m = /^(2>&1|1>&2|&>>|2>>|<<<|>&2|\|\||&&|\|&|;;|>>|&>|2>|1>|<<|[|;&<>])/.exec(three.length < 4 ? line.slice(i) : line.slice(i, i + 4));
    if (m) {
      const op = m[1];
      if (XP_OPS[op]) push({ op, raw: op });
      else push({ redir: op, raw: op });
      i += op.length; continue;
    }
    /* kelime */
    let raw = '', val = '', quoted = false;
    while (i < n) {
      const ch = line[i];
      if (ch === ' ' || ch === '\t') break;
      if (/[|;&<>]/.test(ch) && !(ch === '>' && raw === '' ) ) {
        /* 2>file gibi yapismis yonlendirme, sayi ile basliyorsa */
        break;
      }
      if (ch === '\\' && i + 1 < n) { raw += ch + line[i + 1]; val += line[i + 1]; i += 2; continue; }
      if (ch === "'") { const j = line.indexOf("'", i + 1); const e = j < 0 ? n : j; raw += line.slice(i, e + 1); val += line.slice(i + 1, e); i = e + 1; quoted = true; continue; }
      if (ch === '"') {
        let j = i + 1; let inner = '';
        while (j < n && line[j] !== '"') { if (line[j] === '\\' && j + 1 < n) { inner += line[j + 1]; j += 2; continue; } inner += line[j]; j++; }
        raw += line.slice(i, Math.min(j + 1, n)); val += inner; i = j + 1; quoted = true; continue;
      }
      if (ch === '$' && line[i + 1] === '(') {
        let depth = 0; let j = i;
        for (; j < n; j++) { if (line[j] === '(') depth++; else if (line[j] === ')') { depth--; if (depth === 0) break; } }
        raw += line.slice(i, j + 1); val += line.slice(i, j + 1); i = j + 1; continue;
      }
      if (ch === '`') { const j = line.indexOf('`', i + 1); const e = j < 0 ? n : j; raw += line.slice(i, e + 1); val += line.slice(i, e + 1); i = e + 1; continue; }
      raw += ch; val += ch; i++;
    }
    /* 2>/dev/null gibi, kelime 2 ise ve hemen ardindan > geliyorsa yonlendirmeye birlestir */
    if (/^[12]$/.test(raw) && line[i] === '>' && !quoted) {
      const rest = line.slice(i);
      const mm = /^(>>|>&1|>&2|>)/.exec(rest);
      const op = raw + mm[1];
      push({ redir: op === '2>&1' || op === '1>&2' ? op : op, raw: op });
      i += mm[1].length; continue;
    }
    if (raw) push({ raw, val, quoted });
  }
  return toks;
}

/* ---------- ozel aciklayicilar ---------- */

function xpRegex(re, mode) {
  /* mode 'basic' grep, 'ext' grep -E veya awk ve sed -E, 'perl' grep -P */
  const out = []; const warn = [];
  const add = (tok, t) => { if (!out.some(x => x.tok === tok)) out.push({ tok, t }); };
  if (re.startsWith('^')) add('^', 'Satır başı. Desen satırın en başında olmalı');
  if (re.endsWith('$') && !re.endsWith('\\$')) add('$', 'Satır sonu. Desen satırın en sonunda olmalı');
  if (/(^|[^\\])\.(?![*+?]?\w*\])/.test(re)) add('.', 'Herhangi tek bir karakter. Gerçek nokta için \\. yaz');
  if (/\\\./.test(re)) add('\\.', 'Gerçek nokta karakteri, kaçış ile');
  if (/(^|[^\\])\*/.test(re)) add('*', 'Önceki karakter ya da grup sıfır ya da daha fazla kez');
  if (/\.\*/.test(re)) add('.*', 'Herhangi bir şey, boş dahil');
  const plus = /(^|[^\\])\+/.test(re), q = /(^|[^\\])\?/.test(re), bar = /(^|[^\\])\|/.test(re), par = /(^|[^\\])\(/.test(re), brace = /(^|[^\\])\{\d/.test(re);
  if (mode === 'basic') {
    if (/\\\+/.test(re)) add('\\+', 'Önceki karakter bir ya da daha fazla kez, basic regex yazımı');
    if (/\\\|/.test(re)) add('\\|', 'Veya. Basic regex yazımı, -E ile sadece | yeterli');
    if (plus || q || bar || par || brace) warn.push('Basic regex modunda + ? | ( { normal karakter sayılır. Özel anlam için -E ekle ya da \\+ \\| gibi kaçış kullan');
  } else {
    if (plus) add('+', 'Önceki karakter ya da grup bir ya da daha fazla kez');
    if (q) add('?', 'Önceki karakter opsiyonel, sıfır ya da bir kez');
    if (bar) add('|', 'Veya. Sol ya da sağ desen');
    if (par) add('( )', 'Grup. Birlikte tekrar etmek ya da sed içinde \\1 ile geri çağırmak için');
    if (brace) add('{n,m}', 'Önceki öğe n ile m kez arası');
  }
  if (/\[\^/.test(re)) add('[^ ]', 'Köşeli parantez içindekiler dışındaki tek karakter');
  else if (/\[/.test(re) && !/\[\[:/.test(re)) add('[ ]', 'Köşeli parantez içindeki karakterlerden biri, [0-9] rakam, [a-z] küçük harf');
  const cls = re.match(/\[\[:(\w+):\]\]/g);
  if (cls) cls.forEach(c => add(c, ({ '[[:digit:]]': 'Rakam, [0-9] ile aynı', '[[:space:]]': 'Boşluk ya da Tab', '[[:alpha:]]': 'Harf', '[[:upper:]]': 'Büyük harf', '[[:lower:]]': 'Küçük harf', '[[:alnum:]]': 'Harf ya da rakam', '[[:punct:]]': 'Noktalama' })[c] || 'POSIX karakter sınıfı'));
  if (/\\b/.test(re)) add('\\b', 'Kelime sınırı. \\berror\\b sadece tam kelime olarak error');
  if (/\\s/.test(re)) add('\\s', 'Boşluk karakteri');
  if (/\\w/.test(re)) add('\\w', 'Harf, rakam ya da alt çizgi');
  if (/\\d/.test(re)) { add('\\d', 'Rakam'); if (mode !== 'perl') warn.push('\\d sadece grep -P ile çalışır, -E ile [0-9] yaz'); }
  if (/\\[1-9]/.test(re)) add('\\1', 'Birinci gruba uyan metnin aynısı');
  return { items: out, warn };
}

function xpAwk(prog) {
  const out = [];
  const add = (tok, t) => { if (!out.some(x => x.tok === tok)) out.push({ tok, t }); };
  if (/\bBEGIN\s*\{/.test(prog)) add('BEGIN { }', 'İlk satır okunmadan önce bir kez çalışır. Başlık basmak ya da değişken hazırlamak için');
  if (/\bEND\s*\{/.test(prog)) add('END { }', 'Bütün satırlar bittikten sonra bir kez çalışır. Toplam ve rapor basmak için');
  const pre = prog.replace(/\bBEGIN\s*\{[^}]*\}/g, '').replace(/\bEND\s*\{[^}]*\}/g, '').trim();
  const pat = /^([^{]+)\{/.exec(pre);
  if (pat) {
    const p = pat[1].trim();
    if (/^\/.*\/$/.test(p)) add(p, 'Desen. Blok sadece bu regex\'e uyan satırlarda çalışır');
    else if (/^\$\d+\s*~\s*\//.test(p)) add(p, 'Belirli alan regex\'e uyuyorsa çalış. ~ uyar, !~ uymaz demek');
    else if (p) add(p, 'Koşul. Blok sadece bu koşul doğru olan satırlarda çalışır');
  } else if (pre && !pre.includes('{')) add(pre, 'Sadece koşul var, aksiyon yok. awk uyan satırı olduğu gibi basar');
  if (/\{/.test(prog)) add('{ }', 'Aksiyon bloğu. Her uyan satır için içindeki komutlar çalışır');
  if (/\bprintf\b/.test(prog)) add('printf', 'Biçimli yazdırma. %s metin, %d tam sayı, %-10s sola yaslı 10 karakter, \\n satır sonu');
  else if (/\bprint\b/.test(prog)) add('print', 'Yazdırır. print $1, $3 virgül koyarsan alanlar boşlukla ayrılır, virgülsüz yan yana yapışır');
  const fields = [...new Set((prog.match(/\$(\d+|NF|\(NF-\d+\))/g) || []))];
  fields.forEach(f => add(f, f === '$0' ? 'Satırın tamamı' : f === '$NF' ? 'Son alan, NF alan sayısı olduğu için' : /NF-/.test(f) ? `Sondan ${f.match(/NF-(\d+)/)[1]} önceki alan` : `${f.slice(1)}. alan. Alanlar varsayılan olarak boşluk ya da Tab ile ayrılır, -F ile değişir`));
  if (/\bNR\b/.test(prog)) add('NR', 'O ana kadar okunan satır numarası. NR > 1 başlık satırını atlar');
  if (/\bNF\b/.test(prog) && !fields.includes('$NF')) add('NF', 'Satırdaki alan sayısı');
  if (/\bFS\b/.test(prog)) add('FS', 'Alan ayırıcı, -F ile aynı');
  if (/\bOFS\b/.test(prog)) add('OFS', 'Çıktı alan ayırıcı, print $1, $2 arasına konur');
  if (/\w+\[[^\]]+\]\s*\+\+/.test(prog)) add('dizi[anahtar]++', 'İlişkili dizi ile sayaç. Her anahtar için kaç kez görüldüğünü sayar, uniq -c gibi');
  else if (/\+\+/.test(prog)) add('++', 'Değişkeni bir artırır');
  if (/\+=/.test(prog)) add('+=', 'Toplama. sum += $3 her satırda 3. alanı toplama ekler');
  if (/\bfor\s*\(\s*\w+\s+in\s+\w+\s*\)/.test(prog)) add('for (k in dizi)', 'Dizideki her anahtar için döner, END içinde sonuçları basmak için');
  if (/[=!<>]=|[<>]/.test(prog.replace(/->/g, ''))) add('== != < >', 'Karşılaştırma. Metin için tırnak, $1 == "root"');
  if (/~/.test(prog)) add('~', 'Regex eşleşmesi. $1 ~ /^eth/ birinci alan eth ile başlıyorsa');
  [['length', 'Uzunluk, length($0) satır uzunluğu'], ['substr', 'Alt metin, substr($1, 1, 3) ilk 3 karakter'], ['split', 'Metni diziye böler, split($2, a, ":")'], ['tolower', 'Küçük harfe çevirir'], ['toupper', 'Büyük harfe çevirir'], ['gsub', 'Tüm eşleşmeleri değiştirir, gsub(/a/, "b")'], ['sub', 'İlk eşleşmeyi değiştirir'], ['sprintf', 'printf gibi ama sonucu metin olarak döner'], ['int', 'Tam sayıya çevirir'], ['getline', 'Bir sonraki satırı okur'], ['next', 'Bu satırı bırak, sonraki satıra geç']].forEach(([f, t]) => { if (new RegExp('\\b' + f + '\\b').test(prog)) add(f, t); });
  const rx = prog.match(/\/[^/]+\//g);
  if (rx) rx.slice(0, 2).forEach(r => { const e = xpRegex(r.slice(1, -1), 'ext'); e.items.forEach(x => add(x.tok, 'Regex içinde ' + x.t.charAt(0).toLowerCase() + x.t.slice(1))); });
  return out;
}

function xpSed(script, opts) {
  const out = [];
  const add = (tok, t) => out.push({ tok, t });
  const ext = opts.ext;
  const cmds = script.split(/;\s*|\n/).filter(Boolean);
  for (const c of cmds) {
    let rest = c.trim(); let addr = '';
    const am = /^(\d+|\$|\/(?:\\.|[^/])+\/)(\s*,\s*(\d+|\$|\/(?:\\.|[^/])+\/))?/.exec(rest);
    if (am) { addr = am[0]; rest = rest.slice(am[0].length).trim(); }
    if (addr) {
      const one = a => a === '$' ? 'son satır' : /^\d+$/.test(a) ? `${a}. satır` : `${a} desenine uyan satır`;
      const parts = addr.split(/\s*,\s*/);
      add(addr, parts.length > 1 ? `Adres aralığı, ${one(parts[0])} ile ${one(parts[1])} arası` : `Adres, sadece ${one(parts[0])} için uygula`);
    }
    const cmd = rest[0];
    if (cmd === 's') {
      const d = rest[1];
      const segs = []; let cur = ''; let i = 2;
      for (; i < rest.length; i++) { if (rest[i] === '\\' && i + 1 < rest.length) { cur += rest[i] + rest[i + 1]; i++; continue; } if (rest[i] === d) { segs.push(cur); cur = ''; if (segs.length === 2) { i++; break; } continue; } cur += rest[i]; }
      const flags = rest.slice(i);
      add(`s${d}…${d}…${d}${flags}`, `Değiştir komutu. s${d}aranan${d}yeni${d}bayraklar. Ayırıcı olarak ${d === '/' ? '/' : d + ' kullanılmış, path içeren metinlerde / yerine | ya da # rahat eder'}`);
      if (segs[0] !== undefined) { add(segs[0], 'Aranan desen, regex'); xpRegex(segs[0], ext ? 'ext' : 'basic').items.forEach(x => add('  ' + x.tok, x.t)); }
      if (segs[1] !== undefined) add(segs[1] === '' ? '""' : segs[1], 'Yerine konacak metin' + (/&/.test(segs[1]) ? '. & eşleşen metnin kendisi' : '') + (/\\[1-9]/.test(segs[1]) ? '. \\1 birinci grup' : ''));
      for (const f of flags) add(f, ({ g: 'Global, satırdaki tüm eşleşmeler. g yoksa sadece ilki değişir', i: 'Büyük küçük harf duyarsız', I: 'Büyük küçük harf duyarsız', p: 'Değişen satırı bas, -n ile birlikte kullanılır', w: 'Değişen satırı dosyaya yaz' })[f] || (/\d/.test(f) ? `Sadece ${f}. eşleşmeyi değiştir` : 'bayrak'));
    } else if (cmd === 'd') add('d', 'Satırı sil, çıktıya basma');
    else if (cmd === 'p') add('p', opts.n ? 'Satırı bas. -n ile birlikte sadece seçilen satırlar görünür' : 'Satırı bas. -n olmadan her satır zaten basıldığı için seçilenler iki kez görünür');
    else if (cmd === 'i') add('i\\', 'Satırın önüne yeni satır ekle');
    else if (cmd === 'a') add('a\\', 'Satırın arkasına yeni satır ekle');
    else if (cmd === 'c') add('c\\', 'Satırı tamamen değiştir');
    else if (cmd === 'y') add('y/abc/xyz/', 'Karakter karakter çevir, tr gibi');
    else if (cmd === 'q') add('q', 'Bu satırdan sonra çık');
    else if (cmd === '=') add('=', 'Satır numarasını bas');
    else if (cmd) add(rest, 'sed komutu');
  }
  return out;
}

function xpMode(m) {
  const map = { 0: '---', 1: '--x', 2: '-w-', 3: '-wx', 4: 'r--', 5: 'r-x', 6: 'rw-', 7: 'rwx' };
  const word = d => { const s = map[d]; return [s[0] === 'r' ? 'okuma' : '', s[1] === 'w' ? 'yazma' : '', s[2] === 'x' ? 'çalıştırma' : ''].filter(Boolean).join(' ') || 'hiçbir izin'; };
  if (/^[0-7]{3,4}$/.test(m)) {
    const d = m.slice(-3);
    let t = `Sayısal izin. Her rakam r=4 w=2 x=1 toplamı. Sahip ${d[0]} ${map[d[0]]} yani ${word(d[0])}, grup ${d[1]} ${map[d[1]]} yani ${word(d[1])}, diğerleri ${d[2]} ${map[d[2]]} yani ${word(d[2])}`;
    if (m.length === 4) t += `. Baştaki ${m[0]} özel bit, 4 setuid, 2 setgid, 1 sticky`;
    if (d === '777') t += '. Herkese her şey, gerçek sistemde neredeyse hiç doğru değil';
    return t;
  }
  const parts = m.split(',').map(p => {
    const mm = /^([ugoa]*)([+\-=])([rwxXst]*)$/.exec(p);
    if (!mm) return p;
    const who = (mm[1] || 'a').split('').map(c => ({ u: 'sahip', g: 'grup', o: 'diğerleri', a: 'herkes' })[c]).join(' ve ');
    const op = ({ '+': 'ekle', '-': 'kaldır', '=': 'tam olarak bunu yap' })[mm[2]];
    const perm = mm[3].split('').map(c => ({ r: 'okuma', w: 'yazma', x: 'çalıştırma', X: 'dizinlerde çalıştırma', s: 'setuid ya da setgid', t: 'sticky' })[c]).join(' ');
    return `${who} için ${perm} ${op}`;
  });
  const txt = parts.join(', ');
  return 'Sembolik izin. ' + txt.charAt(0).toUpperCase() + txt.slice(1);
}

const XP_FMT = {
  list: (v, u) => { u = u || 'öğe'; const ps = v.split(','); return ps.map(p => /^\d+-\d+$/.test(p) ? `${p.split('-')[0]}. ile ${p.split('-')[1]}. ${u} arası` : /^\d+-$/.test(p) ? `${p.slice(0, -1)}. ${u} ve sonrası` : /^-\d+$/.test(p) ? `baştan ${p.slice(1)}. ${u} dahil` : `${p}.`).join(', ').replace(/(\d+\.)$/, `$1 ${u}`).replace(/^(\d+\.)(, \d+\.)+$/, m => m + ` ${u}`); },
  sortkey: v => { const m = /^(\d+)(?:\.(\d+))?([a-zA-Z]*)(?:,(\d+)(?:\.\d+)?([a-zA-Z]*))?$/.exec(v); if (!m) return 'sıralama anahtarı'; const fl = (m[3] + (m[5] || '')).split('').map(c => ({ n: 'sayısal', r: 'ters', h: 'insan okunur boyut', M: 'ay adı', V: 'versiyon', b: 'baştaki boşluğu yok say', f: 'harf duyarsız' })[c]).filter(Boolean); return `${m[1]}. alandan ${m[4] ? m[4] + '. alana kadar' : 'satır sonuna kadar'} sırala${fl.length ? ', ' + fl.join(' ') : ''}. Tek alan için ${m[1]},${m[1]} yaz yoksa satırın kalanı da karşılaştırılır`; },
  mode: xpMode,
  owner: v => { const [u, g] = v.split(':'); return g !== undefined ? `Sahip ${u || 'aynı kalır'}, grup ${g || 'kullanıcının ana grubu'}` : `Sahip ${u}`; },
  size: v => { const m = /^([+-]?)(\d+)([ckMGb]?)$/.exec(v); if (!m) return 'boyut'; const unit = ({ c: 'byte', k: 'KB', M: 'MB', G: 'GB', b: '512 byte blok', '': '512 byte blok' })[m[3]]; return m[1] === '+' ? `${m[2]} ${unit} üstü` : m[1] === '-' ? `${m[2]} ${unit} altı` : `Tam olarak ${m[2]} ${unit}`; },
  time: v => { const m = /^([+-]?)(\d+)$/.exec(v); if (!m) return 'süre'; return m[1] === '-' ? `Son ${m[2]} birim içinde` : m[1] === '+' ? `${m[2]} birimden daha eski` : `Tam ${m[2]} birim önce`; },
  signal: v => { const t = { 9: 'SIGKILL, süreci anında öldürür, temizlik yapamaz', 15: 'SIGTERM, kibarca kapan der, varsayılan', 1: 'SIGHUP, çoğu daemon config\'i yeniden okur', 2: 'SIGINT, Ctrl+C ile aynı', 3: 'SIGQUIT, çık ve core dump bırak', 19: 'SIGSTOP, süreci dondurur, yakalanamaz', 20: 'SIGTSTP, Ctrl+Z ile aynı', 18: 'SIGCONT, donmuş süreci devam ettirir', 10: 'SIGUSR1, uygulamaya özel', 12: 'SIGUSR2, uygulamaya özel', 0: 'Sinyal göndermez, süreç var mı ve yetkin yeter mi diye test eder' }; const n = { KILL: 9, TERM: 15, HUP: 1, INT: 2, QUIT: 3, STOP: 19, TSTP: 20, CONT: 18, USR1: 10, USR2: 12 }; const k = String(v).toUpperCase().replace(/^SIG/, ''); return t[k] || (n[k] !== undefined ? t[n[k]] : 'sinyal'); },
  regex: v => { const r = xpRegex(v, 'ext'); return 'Regex. ' + r.items.map(x => x.tok + ' ' + x.t.toLowerCase()).join(', '); },
  glob: v => /[*?[]/.test(v) ? `Glob deseni. * herhangi bir şey, ? tek karakter. Tırnak içinde yazılmalı yoksa shell önce kendisi genişletir` : `Tam ad ${v}`,
  dateFmt: v => 'Biçim ' + (v.replace(/^\+/, '').match(/%./g) || []).map(f => f + ' ' + ({ '%Y': 'yıl', '%m': 'ay', '%d': 'gün', '%H': 'saat', '%M': 'dakika', '%S': 'saniye', '%F': 'YYYY-MM-DD', '%T': 'HH:MM:SS', '%s': 'epoch saniye', '%A': 'gün adı', '%B': 'ay adı', '%j': 'yılın günü', '%u': 'haftanın günü', '%Z': 'saat dilimi', '%z': 'UTC farkı' })[f]).join(', '),
  type: v => ({ f: 'Normal dosya', d: 'Dizin', l: 'Symlink', b: 'Blok cihaz', c: 'Karakter cihaz', p: 'Named pipe', s: 'Socket' })[v] || 'tip',
  perm: v => {
    if (/^[0-7]+$/.test(v)) return 'Tam olarak bu izin. ' + xpMode(v);
    const m = /^([-/])([0-7]+)$/.exec(v);
    if (!m) return /^[-/]/.test(v) ? (v[0] === '-' ? 'Bu bitlerin hepsi set olmalı' : 'Bu bitlerden en az biri set olmalı') : xpMode(v);
    const sp = { 4000: 'setuid', 2000: 'setgid', 1000: 'sticky', 6000: 'setuid ve setgid' }[m[2]];
    return (m[1] === '-' ? 'Bu bitlerin hepsi set olmalı' : 'Bu bitlerden en az biri set olmalı') + (sp ? `, ${sp} biti` : `. ${xpMode(m[2].padStart(3, '0'))}`);
  },
};

/* ---------- segment aciklama ---------- */

const xpOwn = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
function xpEntry(name) { return xpOwn(EXPLAIN_DB, name) ? EXPLAIN_DB[name] : null; }
/* Ayni satirda tanimlanan fonksiyon ve alias adlari, greet() { ... }; greet gibi. explainLine her cagrida sifirlar */
let xpLocal = new Map();
/* Daha once gorulen alias tanimlari satirlar arasi kalir, alias logs='...' sonra logs. explain komutu shell'in alias'larini da ekler */
const xpAliasSeen = new Map();
const XP_SPECIAL = { '$?': 'Son komutun exit code\'u. 0 başarılı, diğerleri hata', '$!': 'En son arka plana atılan sürecin PID\'i', '$$': 'Çalışan shell\'in kendi PID\'i', '$#': 'Script ya da fonksiyona verilen argüman sayısı', '$@': 'Tüm argümanlar, çift tırnak içinde her biri ayrı kelime kalır', '$*': 'Tüm argümanlar tek metin olarak', '$0': 'Script\'in ya da shell\'in adı', '$_': 'Önceki komutun son argümanı' };
function xpArgNote(v, label, raw) {
  if (label) return label;
  raw = raw === undefined ? v : raw;
  if (/^'/.test(raw)) return /[$`\\*]/.test(v) ? 'Metin, tek tırnak içinde. $ ve diğer özel karakterler olduğu gibi kalır, değişken açılmaz' : 'Argüman';
  if (XP_SPECIAL[v]) return XP_SPECIAL[v];
  if (v === '{}') return 'Yer tutucu. find -exec ya da xargs -I ile gelen her öğe buraya konur';
  if (/^%(\d+|[+%-])$/.test(v)) return v === '%+' || v === '%%' ? 'En son job' : v === '%-' ? 'Bir önceki job' : `Job numarası, jobs listesindeki ${v.slice(1)} numaralı iş`;
  if (/^%\?./.test(v)) return `Komut satırında ${v.slice(2)} geçen job`;
  if (/^%\w/.test(v)) return `Komutu ${v.slice(1)} ile başlayan job`;
  if (/\$\{\w+:\?\}/.test(v)) return 'Değişken içeren path. Süslü parantez içindeki iki nokta soru işareti, değişken boşsa komutu hata ile durdurur, rm -rf için hayat kurtarır';
  if (/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(v)) return 'MAC adresi';
  if (/^\$[1-9]$/.test(v)) return `${v.slice(1)}. argüman, script ya da fonksiyona verilen`;
  if (/^\$\(\(/.test(v)) return 'Aritmetik genişletme, içerisi sayı olarak hesaplanır';
  if (/^\$\(/.test(v) || /^`/.test(v)) return 'Command substitution. İçteki komutun çıktısı buraya yerleşir';
  if (/^"/.test(raw) && /\$\(|`/.test(v)) return 'Metin, çift tırnak içinde. İçindeki komut çıktıları ve değişkenler yerine konur';
  if (/^"/.test(raw) && /\$\{?\w/.test(v) && /\s|^\$\w+\W|\w\$/.test(v)) return 'Metin, çift tırnak içinde. İçindeki değişkenler değerleriyle değiştirilir';
  if (/^\$\w+$|^\$\{\w+\}$/.test(v)) return 'Değişken, shell değerini yerine koyar';
  if (/^https?:\/\//.test(v)) return 'URL';
  if (/^[\w.-]+@[\w.-]+/.test(v)) return /:/.test(v) ? 'Uzak path. kullanıcı@host, iki noktadan sonra o sunucudaki path' : 'Kullanıcı ve host, kullanıcı@host biçiminde';
  if (/^\d+\.\d+\.\d+\.\d+(\/\d+)?$/.test(v)) return /\//.test(v) ? 'IP adresi ve prefix' : 'IP adresi';
  if (/\s/.test(v)) return 'Argüman';
  if (/\$\{?\w/.test(v) && !/[*?]/.test(v.replace(/\$\{[^}]*\}/g, ''))) return 'Değişken içeren path ya da metin, shell değişkenin değerini yerine koyar';
  if (/[*?]/.test(v)) return 'Glob. Shell eşleşen dosya adlarına genişletir';
  if (/^~/.test(v)) return 'Home dizini altında path';
  if (/^\//.test(v)) return 'Absolute path, kökten başlar';
  if (/^([\w.-]+@)?[\w.-]+:([~/.]|$)/.test(v) && !/^\w+:\/\//.test(v)) return 'Uzak path. Önce host, iki noktadan sonra o sunucudaki path';
  if (/^[\w.\/-]+:[\w.-]+$/.test(v)) return 'Sürüm etiketli ad, iki noktadan sonrası tag';
  if (!/\//.test(v) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/i.test(v) && /\.(com|net|org|io|lab|local|corp|dev|lan|home|internal|arpa|edu|gov|tr|nl|de|uk|eu|cloud|app)(:\d+)?$/i.test(v)) return 'Host adı' + (/:\d+$/.test(v) ? ' ve port' : '');
  if (/\//.test(v) || /\.\w{1,5}$/.test(v)) return 'Relative path, bulunduğun dizine göre';
  if (/^\d+$/.test(v)) return 'Sayı';
  return 'Argüman';
}

function xpSegment(words, out, depth) {
  words = words.slice();
  let i = 0;
  while (i < words.length && /^[A-Za-z_]\w*=/.test(words[i].raw)) {
    const w = words[i]; const k = w.raw.split('=')[0];
    const alone = words.slice(i + 1).every(x => /^[A-Za-z_]\w*=/.test(x.raw));
    let at = alone ? `Değişken ataması. ${k} shell değişkeni olur, $${k} ile okunur. Eşittirin etrafında boşluk olmaz` : `Değişken ataması. ${k} sadece arkasındaki komutun ortamına verilir`;
    if (/=\$\(\(/.test(w.raw)) at += '. Çift parantezli $ ifadesi aritmetik olarak hesaplanır';
    else if (/=\$\(|=`/.test(w.raw)) at += '. Değer, içteki komutun çıktısı olur';
    out.push({ kind: 'assign', tok: w.raw, depth, t: at });
    i++;
  }
  if (i >= words.length) return;
  if (words[i].raw === '!') { out.push({ kind: 'op', tok: '!', depth, t: 'Sonucu tersine çevir, başarılıysa başarısız say' }); i++; }
  if (i >= words.length) return;
  /* shell anahtar kelimeleri, for while if then do done */
  while (i < words.length && xpOwn(XP_KW, words[i].raw) && !(words[i].raw === '[[')) {
    const k = words[i].raw;
    out.push({ kind: 'kw', tok: k, depth, t: XP_KW[k] });
    i++;
    if (k === 'for' && i < words.length) {
      if (/^\(\(/.test(words[i].raw)) { out.push({ kind: 'arg', tok: words.slice(i).map(w => w.raw).join(' '), depth: depth + 1, t: 'C stili döngü, başlangıç, koşul, artış' }); return; }
      out.push({ kind: 'arg', tok: words[i].raw, depth: depth + 1, t: 'Döngü değişkeni, her turda listedeki bir sonraki değeri alır, $' + words[i].raw + ' ile okunur' }); i++;
      if (words[i] && words[i].raw === 'in') { out.push({ kind: 'kw', tok: 'in', depth: depth + 1, t: 'Arkasından liste gelir' }); i++; }
      for (; i < words.length; i++) out.push({ kind: 'arg', tok: words[i].raw, depth: depth + 2, t: xpArgNote(words[i].val, null, words[i].raw) === 'Argüman' ? 'Liste öğesi' : xpArgNote(words[i].val, null, words[i].raw) });
      return;
    }
    if (k === 'case' && i < words.length) { out.push({ kind: 'arg', tok: words[i].raw, depth: depth + 1, t: 'Karşılaştırılacak değer' }); i++; if (words[i] && words[i].raw === 'in') { out.push({ kind: 'kw', tok: 'in', depth: depth + 1, t: 'Arkasından desenler gelir, her biri ) ile biter' }); i++; } if (i < words.length) xpSegment(words.slice(i), out, depth); return; }
    if (k === 'function' && i < words.length) { xpLocal.set(words[i].raw.replace(/\(\)$/, ''), 'fn'); out.push({ kind: 'arg', tok: words[i].raw, depth: depth + 1, t: 'Fonksiyon adı' }); i++; continue; }
  }
  if (i >= words.length) return;
  if (/^\w+\(\)$/.test(words[i].raw)) { xpLocal.set(words[i].raw.slice(0, -2), 'fn'); out.push({ kind: 'kw', tok: words[i].raw, depth, t: 'Fonksiyon tanımı, adı ' + words[i].raw.slice(0, -2) }); i++; xpSegment(words.slice(i), out, depth + 1); return; }
  if (/^[^\s()]+\)$/.test(words[i].raw)) { out.push({ kind: 'kw', tok: words[i].raw, depth, t: 'case deseni. Değer buna uyarsa arkasındaki komutlar çalışır' + (words[i].raw.includes('|') ? ', | veya demek' : '') + (words[i].raw === '*)' ? ', * diğer her şeyi yakalar' : '') }); i++; if (i >= words.length) return; }
  /* anahtar kelimeden sonra gelen atama, while IFS=: read ... */
  if (i > 0 && /^[A-Za-z_]\w*=/.test(words[i].raw)) { xpSegment(words.slice(i), out, depth); return; }
  if (words[words.length - 1].raw === ';;') words = words.slice(0, -1);
  const name = words[i].val.split('/').pop();
  let e = xpEntry(name);
  const man = typeof MANUAL !== 'undefined' ? (MANUAL[name] || (typeof LAB_EXT !== 'undefined' && LAB_EXT.manual && LAB_EXT.manual[name])) : null;
  if (name === '[' || name === '[[') e = e || xpEntry('test');
  const isPath = /\//.test(words[i].val);
  const local = !e && (xpLocal.get(name) || (xpAliasSeen.has(name) ? 'alias' : null));
  if (name === 'alias') words.slice(i + 1).forEach(w => { const m = /^([\w.-]+)=([\s\S]*)$/.exec(w.val); if (m) { xpLocal.set(m[1], 'alias'); xpAliasSeen.set(m[1], m[2]); } });
  const pathT = /^\.\//.test(words[i].val) ? 'Çalıştırılabilir dosya ya da script. ./ bulunduğun dizin demek, çalışması için x izni gerekir' : 'Path ile çağrılan çalıştırılabilir dosya ya da script. Çalışması için x izni gerekir';
  const localT = local === 'fn' ? 'Bu satırda tanımlanan fonksiyonu çağırır. Argümanlar fonksiyon içinde $1, $2 olur' : xpAliasSeen.get(name) ? `Alias. Shell bunu ${xpAliasSeen.get(name)} komutuyla değiştirir` : 'Alias, shell onu asıl komutla değiştirir';
  out.push({ kind: 'cmd', tok: words[i].raw, name, depth, t: e ? e.d : local ? localT : man ? man.d : isPath ? pathT : 'Bu komut için açıklama yok', unknown: !e && !local && !man && !isPath, nodb: !e && !local && !isPath });
  i++;
  if (!e) { for (let n = 1; i < words.length; i++, n++) { const note = xpArgNote(words[i].val, null, words[i].raw); out.push({ kind: 'arg', tok: words[i].raw, depth: depth + 1, t: local && note === 'Argüman' ? `${n}. argüman, ${local === 'fn' ? 'fonksiyon' : 'komut'} içinde $${n} olarak okunur` : note }); } return; }
  /* alt komutlar, ip addr show, git log, systemctl restart */
  let opts = Object.assign({}, e.o || {}); let al = Object.assign({}, e.al || {}); let node = e; let pos = e.pos || []; let sp = e.sp || null; let single = !!e.single;
  const findSub = (nd, w) => { if (!nd.sub) return null; if (xpOwn(nd.sub, w)) return [w, nd.sub[w]]; for (const [k, v] of Object.entries(nd.sub)) if ((v.al2 || []).includes(w)) return [k, v]; return null; };
  /* bazi komutlarda global secenekler alt komuttan once gelir, git -C dir log, ip -br a */
  const optsBefore = [];
  while (i < words.length && node.sub) {
    const w = words[i].val;
    if (w.startsWith('-') && w !== '-') { optsBefore.push(i); i++; const spec = opts[w] || opts[al[w]]; if (spec && spec.a && !w.includes('=')) { optsBefore.push(i); i++; } continue; }
    const s = findSub(node, w);
    if (!s) break;
    const [k, sub] = s;
    out.push({ kind: 'sub', tok: words[i].raw, depth: depth + 1, t: sub.d || `${k} alt komutu` });
    Object.assign(opts, sub.o || {}); Object.assign(al, sub.al || {}); pos = sub.pos || []; sp = sub.sp || sp; single = sub.single || single; node = sub; i++;
  }
  /* once alt komuttan once gelen secenekleri isle */
  const rest = optsBefore.map(j => words[j]).concat(words.slice(i));
  xpArgs(rest, { opts, al, pos, sp, single, name, e: node, root: e }, out, depth + 1);
}

function xpArgs(words, ctx, out, depth) {
  const { opts, al, sp, single, name } = ctx;
  /* a deger alir. ao ise deger istege bagli, sonraki kelime tire ile baslamiyorsa ya da -1 gibi sayiysa deger sayilir */
  /* cmd, secenegin degeri bir komut satiri, bash -c '...', su -c '...'. Icini de acikla */
  const nest = (spec, arg, d) => { if (!spec.cmd || !arg || !/\S/.test(arg)) return; const saved = xpLocal; explainLine(arg).items.forEach(x => out.push(Object.assign({}, x, { depth: x.depth + d + 1 }))); xpLocal = saved; };
  const takes = (spec, j) => spec.a && j < words.length && (!spec.ao || !words[j].val.startsWith('-') || /^-\d+$/.test(words[j].val));
  let pos = ctx.pos.slice();
  /* noopt, komut hic secenek almaz, tire ile baslayan kelime de arguman sayilir, submit -rw------- gibi */
  let endOpts = !!(ctx.e.noopt || ctx.root.noopt); let posIdx = 0;
  const seen = {};
  /* tar ve ps bsd stili, ilk kelime tiresiz harf demeti */
  if (words.length && !words[0].val.startsWith('-')) {
    if (sp === 'tar' && /^[a-zA-Z]+$/.test(words[0].val) && words[0].val.split('').every(c => opts['-' + c])) words[0] = Object.assign({}, words[0], { val: '-' + words[0].val, bundleNoDash: true });
    if (sp === 'ps' && ctx.e.bsd && /^[a-zA-Z]+$/.test(words[0].val) && words[0].val.split('').every(c => ctx.e.bsd[c])) {
      const w = words.shift();
      out.push({ kind: 'opt', tok: w.raw, depth, t: 'BSD stili seçenek, tire olmadan yazılır' });
      w.val.split('').forEach(c => out.push({ kind: 'opt', tok: '  ' + c, depth: depth + 1, t: ctx.e.bsd[c] }));
    }
  }
  const progTaken = { v: false };
  const hasOpt = k => words.some(w => w.val === k || w.val.startsWith(k));
  for (let i = 0; i < words.length; i++) {
    const w = words[i]; const v = w.val;
    if (!endOpts && v === '--') {
      endOpts = true;
      /* ddpos, -- sonrasi farkli bir argüman turu, git diff v1 HEAD -- dosya */
      const dd = ctx.e.ddpos || ctx.root.ddpos;
      if (dd) { pos = [dd]; posIdx = 0; }
      out.push({ kind: 'op', tok: '--', depth, t: 'Seçeneklerin sonu. Bundan sonrası tire ile başlasa bile argüman sayılır' + (dd ? `. Burada arkasından ${dd.replace(/\.\.\.$/, '')} gelir` : '') });
      continue;
    }
    /* find -exec ... \; ve xargs gibi ic ice komutlar */
    if (!endOpts && sp === 'find' && (v === '-exec' || v === '-execdir' || v === '-ok')) {
      const j = words.findIndex((x, k) => k > i && (x.val === ';' || x.val === '+'));
      const end = j < 0 ? words.length : j;
      out.push({ kind: 'opt', tok: w.raw, depth, t: (opts[v] && opts[v].t) || 'Bulunan her dosya için komut çalıştır' });
      const inner = words.slice(i + 1, end).map(x => x.val === '{}' ? Object.assign({}, x, { raw: '{}' }) : x);
      const sub = [];
      xpSegment(inner, sub, depth + 1);
      sub.forEach(x => { if (x.tok === '{}') x.t = 'Bulunan dosyanın adı buraya konur'; });
      out.push(...sub);
      if (j >= 0) out.push({ kind: 'op', tok: words[j].raw, depth: depth + 1, t: words[j].val === '+' ? 'Komutu tüm dosyalarla tek seferde çalıştırır, xargs gibi, hızlıdır' : 'Komutun sonu. Her dosya için ayrı ayrı çalıştırır. Shell yemesin diye \\; yazılır' });
      i = end; continue;
    }
    /* tirnak icinde bosluklu metin secenek olamaz, echo "- madde" */
    if (!endOpts && v.startsWith('-') && v.length > 1 && !(w.quoted && /\s/.test(v)) && !(/^-\d/.test(v) && !ctx.e.num && !opts[v])) {
      /* uzun secenek */
      if (v.startsWith('--')) {
        const [k, val] = v.includes('=') ? [v.slice(0, v.indexOf('=')), v.slice(v.indexOf('=') + 1)] : [v, null];
        const key = opts[k] ? k : al[k] && opts[al[k]] ? al[k] : null;
        const spec = key ? opts[key] : null;
        if (!spec) { out.push({ kind: 'unknown', tok: w.raw, depth, t: `Bu seçenek sözlükte yok. man ${name} ile bak` }); continue; }
        let arg = val;
        if (arg === null && takes(spec, i + 1)) arg = words[++i].val;
        out.push(xpOptItem(w.raw + (val === null && spec.a && arg !== null ? ' ' + words[i].raw : ''), key !== k ? `${k}, ${key} ile aynı` : k, spec, arg, depth));
        nest(spec, arg, depth);
        seen[key] = true; if (spec.ends || spec.end) { endOpts = true; if (spec.posAfter) { pos = spec.posAfter.slice(); posIdx = 0; } else posIdx = Math.max(posIdx, 1); } continue;
      }
      /* tam eslesme, find -name, -maxdepth, ya da db'de birlesik yazilmis bir secenek */
      if (opts[v] || al[v]) {
        const key = opts[v] ? v : al[v];
        const spec = opts[key];
        let arg = null;
        if (takes(spec, i + 1)) arg = words[++i].val;
        out.push(xpOptItem(w.raw + (arg !== null ? ' ' + words[i].raw : ''), key, spec, arg, depth, ctx));
        nest(spec, arg, depth);
        seen[key] = true; if (spec.ends || spec.end) { endOpts = true; if (spec.posAfter) { pos = spec.posAfter.slice(); posIdx = 0; } else posIdx = Math.max(posIdx, 1); } continue;
      }
      /* tek tireli uzun secenek degerle, nslookup -type=mx, gcc -std=c11 */
      if (v.includes('=') && v.indexOf('=') > 2) {
        const k1 = v.slice(0, v.indexOf('=')); const key = opts[k1] ? k1 : al[k1] && opts[al[k1]] ? al[k1] : null;
        if (key) { out.push(xpOptItem(w.raw, key, opts[key], v.slice(v.indexOf('=') + 1), depth, ctx)); seen[key] = true; continue; }
      }
      if (single) { out.push({ kind: 'unknown', tok: w.raw, depth, t: `Bu seçenek sözlükte yok. man ${name} ile bak` }); continue; }
      /* sayi kisayolu, head -5, kill -9 */
      if (/^-\d+$/.test(v) && ctx.e.num) { out.push({ kind: 'opt', tok: w.raw, depth, t: ctx.e.num + (XP_FMT[ctx.e.numf] ? '. ' + XP_FMT[ctx.e.numf](v.slice(1)) : '') }); continue; }
      if (/^-[A-Z]+$/.test(v) && sp === 'kill') { out.push({ kind: 'opt', tok: w.raw, depth, t: 'Gönderilecek sinyal. ' + XP_FMT.signal(v.slice(1)) }); continue; }
      /* harf demeti, -la, -tvf arsiv, -d: */
      const chars = v.slice(1);
      const group = [];
      let ok = true;
      for (let c = 0; c < chars.length; c++) {
        const key = '-' + chars[c];
        const spec = opts[key] || (al[key] && opts[al[key]]);
        if (!spec) { ok = false; group.push({ kind: 'unknown', tok: '  ' + key, depth: depth + 1, t: `Bu seçenek sözlükte yok. man ${name} ile bak` }); continue; }
        if (spec.a) {
          let arg = chars.slice(c + 1);
          let shown = key + arg;
          if (!arg && takes(spec, i + 1)) { arg = words[++i].val; shown = key + ' ' + words[i].raw; }
          if (!arg) arg = null;
          group.push(xpOptItem(shown, key, spec, arg, depth + 1, ctx));
          if (spec.cmd && arg) { const before = out.length; nest(spec, arg, depth + 1); group.push(...out.splice(before)); }
          seen[key] = true;
          if (spec.ends || spec.end) { endOpts = true; if (spec.posAfter) { pos = spec.posAfter.slice(); posIdx = 0; } else posIdx = Math.max(posIdx, 1); }
          break;
        }
        group.push(xpOptItem(key, key, spec, null, depth + 1, ctx));
        seen[key] = true;
      }
      if (group.length === 1) { group[0].depth = depth; group[0].tok = w.raw + (group[0].tok.includes(' ') ? group[0].tok.slice(group[0].tok.indexOf(' ')) : ''); out.push(group[0]); }
      else { out.push({ kind: 'opt', tok: w.raw + (w.bundleNoDash ? '' : ''), depth, t: w.bundleNoDash ? 'Tire olmadan yazılmış seçenek demeti, harf harf aşağıda' : 'Birleşik yazılmış kısa seçenekler, harf harf aşağıda', unknown: !ok }); out.push(...group); }
      continue;
    }
    /* pozisyonel argumanlar ve ozel programlar */
    if (!progTaken.v && sp === 'awk' && !seen['-f']) { progTaken.v = true; posIdx++; out.push({ kind: 'prog', tok: w.raw, depth, t: 'awk programı. Tek tırnak içinde yazılır ki shell $1 gibi ifadeleri bozmasın' }); xpAwk(v).forEach(x => out.push({ kind: 'prog', tok: '  ' + x.tok, depth: depth + 1, t: x.t })); continue; }
    if (!progTaken.v && sp === 'sed' && !seen['-e'] && !seen['-f']) { progTaken.v = true; posIdx++; out.push({ kind: 'prog', tok: w.raw, depth, t: 'sed script. Tek tırnak içinde yazılır' }); xpSed(v, { n: seen['-n'], ext: seen['-E'] || seen['-r'] }).forEach(x => out.push({ kind: 'prog', tok: '  ' + x.tok, depth: depth + 1, t: x.t })); continue; }
    if (!progTaken.v && sp === 'grep' && !seen['-e'] && !seen['-f']) {
      progTaken.v = true; posIdx++;
      const mode = seen['-P'] ? 'perl' : (seen['-E'] || name === 'egrep') ? 'ext' : (seen['-F'] || name === 'fgrep') ? 'fixed' : 'basic';
      out.push({ kind: 'prog', tok: w.raw, depth, t: mode === 'fixed' ? 'Aranan metin, -F ile regex değil düz metin' : `Aranan desen, ${mode === 'basic' ? 'basic regex' : mode === 'ext' ? 'extended regex' : 'Perl regex'}. Özel karakter varsa tek tırnak içinde yaz` });
      if (mode !== 'fixed') { const r = xpRegex(v, mode); r.items.forEach(x => out.push({ kind: 'prog', tok: '  ' + x.tok, depth: depth + 1, t: x.t })); r.warn.forEach(x => out.push({ kind: 'warn', tok: '  ⚠', depth: depth + 1, t: x })); }
      continue;
    }
    if (sp === 'chmod' && posIdx === 0 && (/^[0-7]{3,4}$/.test(v) || /^[ugoa]*[+\-=]/.test(v))) { posIdx++; out.push({ kind: 'arg', tok: w.raw, depth, t: xpMode(v) }); continue; }
    if (sp === 'chown' && posIdx === 0) { posIdx++; out.push({ kind: 'arg', tok: w.raw, depth, t: XP_FMT.owner(v) }); continue; }
    if (sp === 'date' && v.startsWith('+')) { out.push({ kind: 'arg', tok: w.raw, depth, t: XP_FMT.dateFmt(v) }); continue; }
    if (sp === 'dd' && /^\w+=/.test(v)) { const k = v.split('=')[0]; out.push({ kind: 'opt', tok: w.raw, depth, t: (ctx.e.kv && ctx.e.kv[k]) || 'dd parametresi' }); continue; }
    if (sp === 'find' && posIdx === 0 && (v === '!' || v === '(' || v === ')' || v === '-o' || v === '-a')) { /* asagida */ }
    if (sp === 'find' && (v === '!' || v === '\\!')) { out.push({ kind: 'op', tok: w.raw, depth, t: 'Sonraki koşulu tersine çevir, değil' }); continue; }
    if (sp === 'find' && (v === '(' || v === ')')) { out.push({ kind: 'op', tok: w.raw, depth, t: 'Koşulları grupla, \\( \\) diye kaçışla yazılır' }); continue; }
    if (sp === 'tr' && posIdx < 2) { posIdx++; out.push({ kind: 'arg', tok: w.raw, depth, t: (posIdx === 1 ? 'Kaynak karakter kümesi' : 'Hedef karakter kümesi') + (/[a-z]-[a-z]|\[:/.test(v) ? '. a-z aralık, [:upper:] gibi sınıflar kullanılabilir' : '') }); continue; }
    /* anahtar kelime argumanlari, ip route ... via GW dev eth0, tcpdump port 53, dig +short, dig @sunucu, [ a = b ].
       o icinde tiresiz anahtar olarak tanimlanir, a varsa sonraki kelime degeridir, p varsa pozisyonel sayilir */
    if (!endOpts && !w.quoted && (!v.startsWith('-') || v === '-')) {
      const eq = v.indexOf('=');
      const kk = xpOwn(opts, v) ? v : eq > 0 && xpOwn(opts, v.slice(0, eq)) ? v.slice(0, eq) : v.length > 1 && v[0] === '@' && xpOwn(opts, '@') ? '@' : null;
      if (kk) {
        const spec = opts[kk];
        let arg = kk === '@' ? v.slice(1) : kk !== v ? v.slice(eq + 1) : null; let shown = w.raw;
        if (arg === null && takes(spec, i + 1)) { arg = words[++i].val; shown += ' ' + words[i].raw; }
        if (spec.p) posIdx++;
        out.push(xpOptItem(shown, kk, spec, arg, depth, ctx)); seen[kk] = true; continue;
      }
    }
    /* wrap, seceneklerden ve pos etiketli argumanlardan sonrasi baska bir komut, sudo, xargs, timeout 5 komut, ssh host komut */
    if ((sp === 'wrap' || XP_WRAP.has(name)) && ctx.root.wraps !== false && posIdx >= ctx.pos.length) {
      out.push({ kind: 'op', tok: '↳', depth, t: ctx.root.wt || `${name} şu komutu çalıştırır` });
      /* tirnak icinde tek parca verilmis komut, watch -n 1 "ss -tn | wc -l", ssh host 'df -h' */
      if (words.length === i + 1 && w.quoted && /\s/.test(v.trim())) {
        out.push({ kind: 'arg', tok: w.raw, depth: depth + 1, t: 'Tırnak içinde tek parça verilen komut satırı, pipe ve yönlendirmeler de bu komutun parçası' });
        const saved = xpLocal;
        explainLine(v).items.forEach(x => out.push(Object.assign({}, x, { depth: x.depth + depth + 2 })));
        xpLocal = saved;
        return;
      }
      xpSegment(words.slice(i), out, depth + 1);
      return;
    }
    const label = pos.length ? (posIdx < pos.length ? pos[posIdx] : (pos[pos.length - 1].endsWith('...') ? pos[pos.length - 1] : null)) : null;
    posIdx++;
    /* stop, ilk pozisyonel argumandan sonra secenekler biter, python3 script.py --verbose gibi script'in kendi secenekleri */
    if (ctx.e.stop || ctx.root.stop || XP_STOP.has(name)) endOpts = true;
    /* stopAt n, n pozisyonelden sonra secenekler biter, python3 script.py --script-secenegi */
    const stopAt = ctx.e.stopAt !== undefined ? ctx.e.stopAt : ctx.root.stopAt;
    if (stopAt !== undefined && posIdx >= stopAt) endOpts = true;
    out.push({ kind: 'arg', tok: w.raw, depth, t: label ? xpLabel(label, v, w.raw) : xpArgNote(v, null, w.raw) });
    /* tirnak icindeki ifade, tcpdump 'dst port 8443' gibi, anahtar kelimeleri tek tek acikla */
    if (w.quoted && /\s/.test(v.trim()) && Object.keys(opts).some(k => !k.startsWith('-'))) {
      const parts = v.trim().split(/\s+/);
      for (let j = 0; j < parts.length; j++) {
        const k = parts[j];
        if (!xpOwn(opts, k) || k.startsWith('-')) continue;
        const spec = opts[k]; let arg = null; let shown = k;
        if (spec.a && j + 1 < parts.length) { arg = parts[++j]; shown += ' ' + arg; }
        out.push(xpOptItem('  ' + shown, k, spec, arg, depth + 1, ctx));
      }
    }
  }
}

function xpLabel(label, v, raw) {
  const base = label.replace(/\.\.\.$/, '');
  const note = xpArgNote(v, null, raw);
  const low = s => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
  const cap = base.charAt(0).toLocaleUpperCase('tr-TR') + base.slice(1);
  if (note.startsWith(cap + ',')) return note;
  if (note.toLowerCase() === base.toLowerCase()) return cap;
  /* path notu sadece dosya ve dizin bekleyen etiketlerde anlamli, revizyon ya da cevap icin degil */
  if (/^(Relative|Absolute|Home)/.test(note) && !/dosya|dizin|path|script|kaynak|hedef|arşiv|aygıt|bağlama|link|başlangıç|program|anahtar dosyası/i.test(base)) return cap;
  return note === 'Argüman' ? cap : cap + ', ' + low(note);
}

function xpOptItem(tok, key, spec, arg, depth, ctx) {
  let t = spec.t;
  if (arg !== null && arg !== undefined) {
    const f = spec.f && XP_FMT[spec.f];
    let extra = f ? f(arg, spec.u) : '';
    /* v, belirli degerlerin anlami, kubectl -o wide, gnmic --mode stream */
    if (!extra && spec.v) { const k2 = xpOwn(spec.v, arg) ? arg : String(arg).split('=')[0]; if (xpOwn(spec.v, k2)) extra = `${arg}, ${spec.v[k2]}`; }
    if (!extra) {
      if (arg === ':') extra = 'Değer iki nokta';
      else if (arg === ',') extra = 'Değer virgül';
      else if (arg === ' ') extra = 'Değer boşluk';
      else if (arg === '\t' || arg === '\\t') extra = 'Değer Tab';
      else if (XP_SPECIAL[arg]) extra = `${arg} ${XP_SPECIAL[arg].charAt(0).toLowerCase() + XP_SPECIAL[arg].slice(1)}`;
      else if (!/\s/.test(tok.trim())) extra = `Değer ${arg}`;
    }
    if (extra) t += '. ' + extra;
  }
  return { kind: 'opt', tok, name: key, depth, t };
}

/* ---------- ana fonksiyonlar ---------- */

function explainLine(line) {
  const toks = xpTokenize(String(line || '').trim());
  const items = [];
  xpLocal = new Map();
  let seg = [];
  const flush = () => { if (seg.length) xpSegment(seg, items, 0); seg = []; };
  const inCase = /\bcase\b/.test(String(line));
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    /* case icinde wan|mpls) deseni pipe degil, tek desen olarak birlestir */
    if (inCase && t.op === '|' && seg.length && toks[i + 1] && toks[i + 1].raw && !toks[i + 1].op && !toks[i + 1].redir && /\)$|^[^\s()]+$/.test(toks[i + 1].raw) && toks.slice(i + 1).some(x => x.raw && /\)$/.test(x.raw))) {
      const last = seg[seg.length - 1]; const nx = toks[++i];
      seg[seg.length - 1] = { raw: last.raw + '|' + nx.raw, val: last.val + '|' + nx.val, quoted: false };
      continue;
    }
    if (t.op) { flush(); items.push({ kind: 'op', tok: t.op, depth: 0, t: XP_OPS[t.op] }); continue; }
    if (t.redir) {
      const target = /&\d$/.test(t.redir) ? null : toks[i + 1] && !toks[i + 1].op && !toks[i + 1].redir ? toks[++i] : null;
      let tx = XP_REDIR[t.redir] || 'Yönlendirme';
      if (target && target.val === '/dev/null') tx += '. /dev/null çöp kutusudur, yazılan her şey kaybolur';
      flush.call(null);
      items.push({ kind: 'redir', tok: t.redir + (target ? ' ' + target.raw : ''), depth: 0, t: tx });
      continue;
    }
    seg.push(t);
  }
  flush();
  const unknown = items.filter(x => x.kind === 'unknown' || (x.kind === 'cmd' && x.unknown)).map(x => x.tok.trim());
  return { line, items, unknown };
}

/* Yonlendirme parcasi sirada komuttan once gelirse duzgun gorunsun diye flush cagrisi argumansiz yapilir */

function explainText(line) {
  const r = explainLine(line);
  const w = Math.min(28, Math.max(...r.items.map(x => x.tok.length + x.depth * 2), 4));
  return r.items.map(x => {
    const ind = '  '.repeat(x.depth);
    const raw = ind + x.tok;
    const tok = raw.length >= w + 2 ? raw + '  ' : raw.padEnd(w + 2);
    return tok + x.t;
  }).join('\n') + '\n';
}

function xpEsc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function explainHTML(line) {
  const r = explainLine(line);
  return '<div class="xp">' + r.items.map(x => `<div class="xp-row k-${x.kind}${x.unknown ? ' unk' : ''}" style="padding-left:${x.depth * 14}px"><code>${xpEsc(x.tok.trim())}</code><span>${xpEsc(x.t)}</span></div>`).join('') + '</div>';
}

/* Komut referansi, tum secenekler ve ornekler. explain cut ya da sozlukte kullanilir */
function explainRef(name, asHTML) {
  /* alt komut referansi da olur, explainRef('git log') ya da explainRef('ip route') */
  const path = String(name || '').trim().split(/\s+/);
  let e = xpEntry(path[0]);
  for (const w of path.slice(1)) {
    if (!e || !e.sub) return null;
    const hit = xpOwn(e.sub, w) ? e.sub[w] : Object.values(e.sub).find(v => (v.al2 || []).includes(w));
    if (!hit) return null;
    e = Object.assign({ ex: [] }, hit, { d: hit.d || w });
  }
  if (!e) return null;
  const rows = [];
  const optRows = (o, al, prefix) => Object.entries(o || {}).forEach(([k, s]) => { const aliases = Object.entries(al || {}).filter(([, v]) => v === k).map(([a]) => a); rows.push({ k: prefix + k + (s.a ? ' ' + s.a : '') + (aliases.length ? ', ' + aliases.join(', ') : ''), t: s.t }); });
  if (e.num) rows.push({ k: '-N', t: e.num + (e.numf === 'signal' ? '. -9 SIGKILL, -15 SIGTERM, -1 SIGHUP' : '. -5 gibi') });
  optRows(e.o, e.al, '');
  const subs = [];
  if (e.sub) Object.entries(e.sub).forEach(([k, s]) => { subs.push({ k, t: s.d || '' }); });
  if (asHTML) {
    let h = `<div class="xp-ref"><div class="xp-d">${xpEsc(e.d)}</div>`;
    if (subs.length) h += '<div class="xp-h">Alt komutlar</div>' + subs.map(s => `<div class="xp-row"><code>${xpEsc(s.k)}</code><span>${xpEsc(s.t)}</span></div>`).join('');
    if (rows.length) h += '<div class="xp-h">Seçenekler</div>' + rows.map(s => `<div class="xp-row"><code>${xpEsc(s.k)}</code><span>${xpEsc(s.t)}</span></div>`).join('');
    if (e.ex && e.ex.length) h += '<div class="xp-h">Örnekler</div>' + e.ex.map(([c, t]) => `<div class="xp-row"><code class="xp-ex" data-e="${xpEsc(c)}">${xpEsc(c)}</code><span>${xpEsc(t)}</span></div>`).join('');
    if (e.tip) h += `<div class="xp-tip">💡 ${xpEsc(e.tip)}</div>`;
    return h + '</div>';
  }
  let s = `${name}  ${e.d}\n`;
  if (subs.length) s += '\nAlt komutlar\n' + subs.map(x => '  ' + x.k.padEnd(18) + x.t).join('\n') + '\n';
  if (rows.length) { const w = Math.min(26, Math.max(...rows.map(x => x.k.length))); s += '\nSeçenekler\n' + rows.map(x => '  ' + (x.k.length >= w + 2 ? x.k + '  ' : x.k.padEnd(w + 2)) + x.t).join('\n') + '\n'; }
  if (e.ex && e.ex.length) s += '\nÖrnekler\n' + e.ex.map(([c, t]) => `  $ ${c}\n      ${t}`).join('\n') + '\n';
  if (e.tip) s += `\n💡 ${e.tip}\n`;
  return s;
}

/* Ipucu icin, cozumdeki komutlarin ne ise yaradigini ve hangi secenekleri kullanacagini degerleri vermeden anlatir */
function explainHint(solution) {
  const cmds = new Map();
  String(solution || '').split('\n').forEach(line => {
    if (!line.trim() || /^(sudo\s+)?(nano|vim|vi)\b/.test(line.trim())) { const m = /^(?:sudo\s+)?(nano|vim|vi)\b/.exec(line.trim()); if (m) cmds.set(m[1], cmds.get(m[1]) || { d: (xpEntry(m[1]) || {}).d || 'Editör', opts: new Map(), ops: new Set() }); return; }
    const r = explainLine(line);
    let cur = null;
    r.items.forEach(x => {
      if (x.kind === 'cmd') { cur = cmds.get(x.name) || { d: x.t, opts: new Map(), ops: new Set() }; cmds.set(x.name, cur); }
      else if (x.kind === 'opt' && cur && x.name) { const spec = xpOptSpec(x.name, line, x); cur.opts.set(x.name, spec || x.t.split('. ')[0]); }
      else if ((x.kind === 'op' || x.kind === 'redir') && cur) { const k = x.kind === 'redir' ? x.tok.split(' ')[0] : x.tok; if (k !== '↳') cur.ops.add(k); }
    });
  });
  return [...cmds.entries()].map(([name, v]) => ({ name, d: v.d, opts: [...v.opts.entries()].map(([k, t]) => ({ k, t })), ops: [...v.ops] }));
}
function xpOptSpec(key, line, item) { return item.t.split('. ')[0]; }

/* Shell komutu, explain satir ya da explain komut adi */
if (typeof registerExt === 'function') {
  registerExt({
    commands: {
      explain: function (args) {
        const sh = this;
        /* shell tirnaklari zaten cozdu, ham satiri gecmisten al ki awk programi bozulmasin */
        const rawLast = sh.history[sh.history.length - 1] || '';
        let line = /^\s*explain\s+/.test(rawLast) ? rawLast.replace(/^\s*explain\s+/, '') : args.join(' ');
        if (!line) {
          const h = sh.history.slice(0, -1).reverse().find(l => !/^\s*explain\b/.test(l));
          if (!h) return fail('explain: açıklanacak komut yok. explain cut -d: -f1 /etc/passwd ya da explain cut yaz\n');
          line = h;
        }
        if (sh.aliases) Object.entries(sh.aliases).forEach(([k, v]) => xpAliasSeen.set(k, v));
        if (args.length === 1 && xpEntry(args[0])) return ok(explainRef(args[0]));
        /* sadece komut ve alt komutlar verildiyse, docker run, git log, o alt komutun tum secenekleri */
        if (args.length > 1 && args.every(a => /^[\w.-]+$/.test(a))) { const ref = explainRef(args.join(' ')); if (ref) return ok(ref); }
        return ok(`$ ${line}\n` + explainText(line));
      },
    },
    manual: { explain: { d: 'Bir komut satırını parça parça açıklar, ya da bir komutun tüm seçeneklerini listeler', u: ['explain komut satırı', 'explain komut', 'explain   son komutu açıklar'], e: ['explain cut -d: -f1 /etc/passwd', 'explain awk', "explain awk -F: '$3 >= 1000 {print $1}' /etc/passwd", 'explain'] } },
  });
}
