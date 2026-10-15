'use strict';
/* Komut aciklama motoru. Bir komut satirini parcalara ayirir, her komutu, seceneği, argumani ve operatoru aciklar.
   Veri explain-db*.js dosyalarinda, Object.assign(EXPLAIN_DB, {...}) ile eklenir. Bicim EXPLAIN.md icinde.
   Disariya acilan fonksiyonlar explainLine, explainText, explainHTML, explainRef, explainHint */

const EXPLAIN_DB = {};

/* Dil. LAB_LANG shell.js icinde, explain.js tek basina yuklenirse Turkce kalir. xs Turkce ve Ingilizce metinden aktif olani doner */
function xs(tr, en) { return typeof LAB_LANG !== 'undefined' && LAB_LANG === 'en' && en != null ? en : tr; }
/* [tr, en] ciftlerinden getter'li harita, okundugu anda aktif dil gelir */
function xpLocMap(pairs) { const o = {}; for (const [k, [tr, en]] of Object.entries(pairs)) Object.defineProperty(o, k, { get: () => xs(tr, en), enumerable: true }); return o; }
/* Ingilizce sozluk katmani, i18n-core.js explain.js'den sonra yuklenebilir, o yuzden her seferinde bakilir */
function xpEnX(name) { return typeof LAB_LANG !== 'undefined' && LAB_LANG === 'en' && typeof I18N_EN !== 'undefined' && I18N_EN && I18N_EN.x && Object.prototype.hasOwnProperty.call(I18N_EN.x, name) ? I18N_EN.x[name] : null; }
const XP_ARG = () => xs('Argüman', 'Argument');

const XP_OPS = xpLocMap({
  '|': ['Pipe. Soldaki komutun stdout çıktısı sağdaki komutun stdin girdisi olur', 'Pipe. The stdout of the left command becomes the stdin of the right command'],
  '|&': ['Pipe, stdout ve stderr birlikte sağdaki komuta gider', 'Pipe, stdout and stderr both go to the right command'],
  '&&': ['Soldaki komut başarılıysa, yani exit code 0 ise sağdakini çalıştır', 'Run the right side only if the left command succeeds, meaning exit code 0'],
  '||': ['Soldaki komut başarısızsa, exit code 0 değilse sağdakini çalıştır', 'Run the right side only if the left command fails, meaning a non zero exit code'],
  ';': ['Komutları sırayla çalıştır, öncekinin sonucuna bakmaz', 'Run the commands in order, ignoring the result of the previous one'],
  '&': ['Komutu arka planda çalıştırır, terminal hemen geri gelir. jobs ile görürsün', 'Runs the command in the background, the terminal returns right away. See it with jobs'],
  ';;': ['case dalının sonu. Eşleşen dalın komutları bitti, case bloğundan çıkılır', 'End of a case branch. The commands of the matching branch are done and the case block exits'],
});
const XP_REDIR = xpLocMap({
  '>': ['stdout çıktısını dosyaya yazar. Dosya varsa içeriği silinip üzerine yazılır', 'Writes stdout to a file. If the file exists its content is wiped and overwritten'],
  '>>': ['stdout çıktısını dosyanın sonuna ekler, eski içerik korunur', 'Appends stdout to the end of the file, the old content stays'],
  '<': ['Dosyayı komutun stdin girdisi yapar', 'Makes the file the stdin of the command'],
  '2>': ['stderr yani hata çıktısını dosyaya yönlendirir', 'Redirects stderr, the error output, to a file'],
  '2>>': ['stderr çıktısını dosyanın sonuna ekler', 'Appends stderr to the end of the file'],
  '&>': ['stdout ve stderr ikisini birden dosyaya yazar', 'Writes both stdout and stderr to the file'],
  '&>>': ['stdout ve stderr ikisini birden dosyanın sonuna ekler', 'Appends both stdout and stderr to the end of the file'],
  '2>&1': ['stderr çıktısını stdout nereye gidiyorsa oraya yollar. Sıra önemli, önce > dosya sonra 2>&1', 'Sends stderr wherever stdout is going. Order matters, first > file then 2>&1'],
  '1>&2': ['stdout çıktısını stderr\'e yollar, script içinde hata mesajı basmak için', 'Sends stdout to stderr, used in scripts to print error messages'],
  '>&2': ['stdout çıktısını stderr\'e yollar, script içinde hata mesajı basmak için', 'Sends stdout to stderr, used in scripts to print error messages'],
  '1>': ['stdout çıktısını dosyaya yazar, > ile aynı', 'Writes stdout to a file, same as >'],
  '<<<': ['Here string. Sağdaki metni komutun stdin girdisi yapar', 'Here string. Makes the text on the right the stdin of the command'],
  '<<': ['Here document. Bir sonraki satırlardan bitiş kelimesine kadar olan metin stdin olur', 'Here document. The text from the next lines up to the end word becomes stdin'],
});
const XP_KW = xpLocMap({
  if: ['if, arkasındaki komut başarılıysa yani exit code 0 ise then bloğu çalışır', 'if, runs the then block when the command after it succeeds, meaning exit code 0'],
  then: ['then, if koşulu doğruysa çalışacak blok başlar', 'then, starts the block that runs when the if condition is true'],
  elif: ['elif, önceki koşul tutmadıysa bu koşulu dene', 'elif, tries this condition when the previous one did not match'],
  else: ['else, hiçbir koşul tutmadıysa çalışacak blok', 'else, the block that runs when no condition matched'],
  fi: ['fi, if bloğunun sonu', 'fi, end of the if block'],
  for: ['for, listedeki her öğe için döngü. for degisken in liste', 'for, loops over each item in a list. for variable in list'],
  while: ['while, arkasındaki komut başarılı oldukça döngü devam eder', 'while, the loop goes on as long as the command after it succeeds'],
  until: ['until, arkasındaki komut başarılı olana kadar döngü devam eder', 'until, the loop goes on until the command after it succeeds'],
  do: ['do, döngü gövdesi başlar', 'do, starts the loop body'],
  done: ['done, döngünün sonu', 'done, end of the loop'],
  case: ['case, değeri desenlerle karşılaştırır. Her desen ) ile biter, blok ;; ile kapanır', 'case, compares a value against patterns. Each pattern ends with ) and each block closes with ;;'],
  esac: ['esac, case bloğunun sonu', 'esac, end of the case block'],
  in: ['in, for döngüsünde liste ya da case içinde değer', 'in, the list in a for loop or the value in a case'],
  function: ['function, fonksiyon tanımı', 'function, a function definition'],
  '{': ['Komut grubu ya da fonksiyon gövdesi başlar', 'Starts a command group or function body'],
  '}': ['Komut grubu ya da fonksiyon gövdesi biter', 'Ends a command group or function body'],
  '((': ['Aritmetik ifade', 'Arithmetic expression'],
  '[[': ['Gelişmiş test ifadesi, [ komutunun bash hali. Regex için =~ kullanılabilir', 'Extended test expression, the bash version of the [ command. =~ can be used for regex'],
});
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
  if (re.startsWith('^')) add('^', xs('Satır başı. Desen satırın en başında olmalı', 'Start of line. The pattern must be at the very start of the line'));
  if (re.endsWith('$') && !re.endsWith('\\$')) add('$', xs('Satır sonu. Desen satırın en sonunda olmalı', 'End of line. The pattern must be at the very end of the line'));
  if (/(^|[^\\])\.(?![*+?]?\w*\])/.test(re)) add('.', xs('Herhangi tek bir karakter. Gerçek nokta için \\. yaz', 'Any single character. For a literal dot write \\.'));
  if (/\\\./.test(re)) add('\\.', xs('Gerçek nokta karakteri, kaçış ile', 'A literal dot, escaped'));
  if (/(^|[^\\])\*/.test(re)) add('*', xs('Önceki karakter ya da grup sıfır ya da daha fazla kez', 'The previous character or group zero or more times'));
  if (/\.\*/.test(re)) add('.*', xs('Herhangi bir şey, boş dahil', 'Anything, including nothing'));
  const plus = /(^|[^\\])\+/.test(re), q = /(^|[^\\])\?/.test(re), bar = /(^|[^\\])\|/.test(re), par = /(^|[^\\])\(/.test(re), brace = /(^|[^\\])\{\d/.test(re);
  if (mode === 'basic') {
    if (/\\\+/.test(re)) add('\\+', xs('Önceki karakter bir ya da daha fazla kez, basic regex yazımı', 'The previous character one or more times, basic regex syntax'));
    if (/\\\|/.test(re)) add('\\|', xs('Veya. Basic regex yazımı, -E ile sadece | yeterli', 'Or. Basic regex syntax, with -E a plain | is enough'));
    if (plus || q || bar || par || brace) warn.push(xs('Basic regex modunda + ? | ( { normal karakter sayılır. Özel anlam için -E ekle ya da \\+ \\| gibi kaçış kullan', 'In basic regex mode + ? | ( { are ordinary characters. For their special meaning add -E or escape them like \\+ \\|'));
  } else {
    if (plus) add('+', xs('Önceki karakter ya da grup bir ya da daha fazla kez', 'The previous character or group one or more times'));
    if (q) add('?', xs('Önceki karakter opsiyonel, sıfır ya da bir kez', 'The previous character is optional, zero or one time'));
    if (bar) add('|', xs('Veya. Sol ya da sağ desen', 'Or. The left or the right pattern'));
    if (par) add('( )', xs('Grup. Birlikte tekrar etmek ya da sed içinde \\1 ile geri çağırmak için', 'Group. To repeat things together or to recall them with \\1 in sed'));
    if (brace) add('{n,m}', xs('Önceki öğe n ile m kez arası', 'The previous item between n and m times'));
  }
  if (/\[\^/.test(re)) add('[^ ]', xs('Köşeli parantez içindekiler dışındaki tek karakter', 'One character that is not inside the brackets'));
  else if (/\[/.test(re) && !/\[\[:/.test(re)) add('[ ]', xs('Köşeli parantez içindeki karakterlerden biri, [0-9] rakam, [a-z] küçük harf', 'One of the characters inside the brackets, [0-9] a digit, [a-z] a lowercase letter'));
  const cls = re.match(/\[\[:(\w+):\]\]/g);
  if (cls) cls.forEach(c => add(c, xs(({ '[[:digit:]]': 'Rakam, [0-9] ile aynı', '[[:space:]]': 'Boşluk ya da Tab', '[[:alpha:]]': 'Harf', '[[:upper:]]': 'Büyük harf', '[[:lower:]]': 'Küçük harf', '[[:alnum:]]': 'Harf ya da rakam', '[[:punct:]]': 'Noktalama' })[c] || 'POSIX karakter sınıfı', ({ '[[:digit:]]': 'A digit, same as [0-9]', '[[:space:]]': 'A space or Tab', '[[:alpha:]]': 'A letter', '[[:upper:]]': 'An uppercase letter', '[[:lower:]]': 'A lowercase letter', '[[:alnum:]]': 'A letter or digit', '[[:punct:]]': 'Punctuation' })[c] || 'POSIX character class')));
  if (/\\b/.test(re)) add('\\b', xs('Kelime sınırı. \\berror\\b sadece tam kelime olarak error', 'Word boundary. \\berror\\b matches error only as a whole word'));
  if (/\\s/.test(re)) add('\\s', xs('Boşluk karakteri', 'A whitespace character'));
  if (/\\w/.test(re)) add('\\w', xs('Harf, rakam ya da alt çizgi', 'A letter, digit or underscore'));
  if (/\\d/.test(re)) { add('\\d', xs('Rakam', 'A digit')); if (mode !== 'perl') warn.push(xs('\\d sadece grep -P ile çalışır, -E ile [0-9] yaz', '\\d only works with grep -P, with -E write [0-9]')); }
  if (/\\[1-9]/.test(re)) add('\\1', xs('Birinci gruba uyan metnin aynısı', 'The same text that matched the first group'));
  return { items: out, warn };
}

function xpAwk(prog) {
  const out = [];
  const add = (tok, t) => { if (!out.some(x => x.tok === tok)) out.push({ tok, t }); };
  if (/\bBEGIN\s*\{/.test(prog)) add('BEGIN { }', xs('İlk satır okunmadan önce bir kez çalışır. Başlık basmak ya da değişken hazırlamak için', 'Runs once before the first line is read. To print a header or set up variables'));
  if (/\bEND\s*\{/.test(prog)) add('END { }', xs('Bütün satırlar bittikten sonra bir kez çalışır. Toplam ve rapor basmak için', 'Runs once after all lines are done. To print totals and reports'));
  const pre = prog.replace(/\bBEGIN\s*\{[^}]*\}/g, '').replace(/\bEND\s*\{[^}]*\}/g, '').trim();
  const pat = /^([^{]+)\{/.exec(pre);
  if (pat) {
    const p = pat[1].trim();
    if (/^\/.*\/$/.test(p)) add(p, xs('Desen. Blok sadece bu regex\'e uyan satırlarda çalışır', 'Pattern. The block runs only on lines that match this regex'));
    else if (/^\$\d+\s*~\s*\//.test(p)) add(p, xs('Belirli alan regex\'e uyuyorsa çalış. ~ uyar, !~ uymaz demek', 'Run when a given field matches the regex. ~ means matches, !~ means does not match'));
    else if (p) add(p, xs('Koşul. Blok sadece bu koşul doğru olan satırlarda çalışır', 'Condition. The block runs only on lines where this condition is true'));
  } else if (pre && !pre.includes('{')) add(pre, xs('Sadece koşul var, aksiyon yok. awk uyan satırı olduğu gibi basar', 'Only a condition, no action. awk prints matching lines as they are'));
  if (/\{/.test(prog)) add('{ }', xs('Aksiyon bloğu. Her uyan satır için içindeki komutlar çalışır', 'Action block. Its commands run for every matching line'));
  if (/\bprintf\b/.test(prog)) add('printf', xs('Biçimli yazdırma. %s metin, %d tam sayı, %-10s sola yaslı 10 karakter, \\n satır sonu', 'Formatted printing. %s text, %d integer, %-10s left aligned in 10 characters, \\n newline'));
  else if (/\bprint\b/.test(prog)) add('print', xs('Yazdırır. print $1, $3 virgül koyarsan alanlar boşlukla ayrılır, virgülsüz yan yana yapışır', 'Prints. In print $1, $3 the comma separates the fields with a space, without a comma they stick together'));
  const fields = [...new Set((prog.match(/\$(\d+|NF|\(NF-\d+\))/g) || []))];
  fields.forEach(f => add(f, f === '$0' ? xs('Satırın tamamı', 'The whole line') : f === '$NF' ? xs('Son alan, NF alan sayısı olduğu için', 'The last field, since NF is the number of fields') : /NF-/.test(f) ? xs(`Sondan ${f.match(/NF-(\d+)/)[1]} önceki alan`, `The field ${f.match(/NF-(\d+)/)[1]} before the last one`) : xs(`${f.slice(1)}. alan. Alanlar varsayılan olarak boşluk ya da Tab ile ayrılır, -F ile değişir`, `Field ${f.slice(1)}. Fields are separated by spaces or Tabs by default, -F changes that`)));
  if (/\bNR\b/.test(prog)) add('NR', xs('O ana kadar okunan satır numarası. NR > 1 başlık satırını atlar', 'The number of the line read so far. NR > 1 skips the header line'));
  if (/\bNF\b/.test(prog) && !fields.includes('$NF')) add('NF', xs('Satırdaki alan sayısı', 'Number of fields on the line'));
  if (/\bFS\b/.test(prog)) add('FS', xs('Alan ayırıcı, -F ile aynı', 'Field separator, same as -F'));
  if (/\bOFS\b/.test(prog)) add('OFS', xs('Çıktı alan ayırıcı, print $1, $2 arasına konur', 'Output field separator, placed between the fields in print $1, $2'));
  if (/\w+\[[^\]]+\]\s*\+\+/.test(prog)) add(xs('dizi[anahtar]++', 'array[key]++'), xs('İlişkili dizi ile sayaç. Her anahtar için kaç kez görüldüğünü sayar, uniq -c gibi', 'Counter with an associative array. Counts how many times each key was seen, like uniq -c'));
  else if (/\+\+/.test(prog)) add('++', xs('Değişkeni bir artırır', 'Increments the variable by one'));
  if (/\+=/.test(prog)) add('+=', xs('Toplama. sum += $3 her satırda 3. alanı toplama ekler', 'Addition. sum += $3 adds the third field to the sum on every line'));
  if (/\bfor\s*\(\s*\w+\s+in\s+\w+\s*\)/.test(prog)) add(xs('for (k in dizi)', 'for (k in array)'), xs('Dizideki her anahtar için döner, END içinde sonuçları basmak için', 'Loops over every key in the array, used in END to print the results'));
  if (/[=!<>]=|[<>]/.test(prog.replace(/->/g, ''))) add('== != < >', xs('Karşılaştırma. Metin için tırnak, $1 == "root"', 'Comparison. Quote text, $1 == "root"'));
  if (/~/.test(prog)) add('~', xs('Regex eşleşmesi. $1 ~ /^eth/ birinci alan eth ile başlıyorsa', 'Regex match. $1 ~ /^eth/ is true when the first field starts with eth'));
  [['length', 'Uzunluk, length($0) satır uzunluğu', 'Length, length($0) is the line length'], ['substr', 'Alt metin, substr($1, 1, 3) ilk 3 karakter', 'Substring, substr($1, 1, 3) is the first 3 characters'], ['split', 'Metni diziye böler, split($2, a, ":")', 'Splits text into an array, split($2, a, ":")'], ['tolower', 'Küçük harfe çevirir', 'Converts to lowercase'], ['toupper', 'Büyük harfe çevirir', 'Converts to uppercase'], ['gsub', 'Tüm eşleşmeleri değiştirir, gsub(/a/, "b")', 'Replaces every match, gsub(/a/, "b")'], ['sub', 'İlk eşleşmeyi değiştirir', 'Replaces the first match'], ['sprintf', 'printf gibi ama sonucu metin olarak döner', 'Like printf but returns the result as text'], ['int', 'Tam sayıya çevirir', 'Converts to an integer'], ['getline', 'Bir sonraki satırı okur', 'Reads the next line'], ['next', 'Bu satırı bırak, sonraki satıra geç', 'Leave this line and move on to the next one']].forEach(([f, t, en]) => { if (new RegExp('\\b' + f + '\\b').test(prog)) add(f, xs(t, en)); });
  const rx = prog.match(/\/[^/]+\//g);
  if (rx) rx.slice(0, 2).forEach(r => { const e = xpRegex(r.slice(1, -1), 'ext'); e.items.forEach(x => add(x.tok, xs('Regex içinde ', 'Inside the regex, ') + x.t.charAt(0).toLowerCase() + x.t.slice(1))); });
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
      const one = a => a === '$' ? xs('son satır', 'the last line') : /^\d+$/.test(a) ? xs(`${a}. satır`, `line ${a}`) : xs(`${a} desenine uyan satır`, `lines matching ${a}`);
      const parts = addr.split(/\s*,\s*/);
      add(addr, parts.length > 1 ? xs(`Adres aralığı, ${one(parts[0])} ile ${one(parts[1])} arası`, `Address range, from ${one(parts[0])} to ${one(parts[1])}`) : xs(`Adres, sadece ${one(parts[0])} için uygula`, `Address, apply only to ${one(parts[0])}`));
    }
    const cmd = rest[0];
    if (cmd === 's') {
      const d = rest[1];
      const segs = []; let cur = ''; let i = 2;
      for (; i < rest.length; i++) { if (rest[i] === '\\' && i + 1 < rest.length) { cur += rest[i] + rest[i + 1]; i++; continue; } if (rest[i] === d) { segs.push(cur); cur = ''; if (segs.length === 2) { i++; break; } continue; } cur += rest[i]; }
      const flags = rest.slice(i);
      add(`s${d}…${d}…${d}${flags}`, xs(`Değiştir komutu. s${d}aranan${d}yeni${d}bayraklar. Ayırıcı olarak ${d === '/' ? '/' : d + ' kullanılmış, path içeren metinlerde / yerine | ya da # rahat eder'}`, `Substitute command. s${d}search${d}new${d}flags. The delimiter is ${d === '/' ? '/' : d + ', for text with paths | or # is easier than /'}`));
      if (segs[0] !== undefined) { add(segs[0], xs('Aranan desen, regex', 'Search pattern, regex')); xpRegex(segs[0], ext ? 'ext' : 'basic').items.forEach(x => add('  ' + x.tok, x.t)); }
      if (segs[1] !== undefined) add(segs[1] === '' ? '""' : segs[1], xs('Yerine konacak metin', 'Replacement text') + (/&/.test(segs[1]) ? xs('. & eşleşen metnin kendisi', '. & is the matched text itself') : '') + (/\\[1-9]/.test(segs[1]) ? xs('. \\1 birinci grup', '. \\1 is the first group') : ''));
      for (const f of flags) add(f, xs(({ g: 'Global, satırdaki tüm eşleşmeler. g yoksa sadece ilki değişir', i: 'Büyük küçük harf duyarsız', I: 'Büyük küçük harf duyarsız', p: 'Değişen satırı bas, -n ile birlikte kullanılır', w: 'Değişen satırı dosyaya yaz' })[f] || (/\d/.test(f) ? `Sadece ${f}. eşleşmeyi değiştir` : 'bayrak'), ({ g: 'Global, every match on the line. Without g only the first one changes', i: 'Case insensitive', I: 'Case insensitive', p: 'Print the changed line, used together with -n', w: 'Write the changed line to a file' })[f] || (/\d/.test(f) ? `Replace only match number ${f}` : 'flag')));
    } else if (cmd === 'd') add('d', xs('Satırı sil, çıktıya basma', 'Delete the line, do not print it'));
    else if (cmd === 'p') add('p', opts.n ? xs('Satırı bas. -n ile birlikte sadece seçilen satırlar görünür', 'Print the line. Together with -n only the selected lines show') : xs('Satırı bas. -n olmadan her satır zaten basıldığı için seçilenler iki kez görünür', 'Print the line. Without -n every line is printed anyway, so the selected ones show twice'));
    else if (cmd === 'i') add('i\\', xs('Satırın önüne yeni satır ekle', 'Insert a new line before the line'));
    else if (cmd === 'a') add('a\\', xs('Satırın arkasına yeni satır ekle', 'Append a new line after the line'));
    else if (cmd === 'c') add('c\\', xs('Satırı tamamen değiştir', 'Replace the line entirely'));
    else if (cmd === 'y') add('y/abc/xyz/', xs('Karakter karakter çevir, tr gibi', 'Translate character by character, like tr'));
    else if (cmd === 'q') add('q', xs('Bu satırdan sonra çık', 'Quit after this line'));
    else if (cmd === '=') add('=', xs('Satır numarasını bas', 'Print the line number'));
    else if (cmd) add(rest, xs('sed komutu', 'sed command'));
  }
  return out;
}

function xpMode(m) { return xpIsEn() ? xpModeEn(m) : xpModeTr(m); }
function xpModeTr(m) {
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
const xpIsEn = () => typeof LAB_LANG !== 'undefined' && LAB_LANG === 'en';
function xpModeEn(m) {
  const map = { 0: '---', 1: '--x', 2: '-w-', 3: '-wx', 4: 'r--', 5: 'r-x', 6: 'rw-', 7: 'rwx' };
  const word = d => { const s = map[d]; return [s[0] === 'r' ? 'read' : '', s[1] === 'w' ? 'write' : '', s[2] === 'x' ? 'execute' : ''].filter(Boolean).join(' ') || 'no permission'; };
  if (/^[0-7]{3,4}$/.test(m)) {
    const d = m.slice(-3);
    let t = `Numeric mode. Each digit is a sum of r=4 w=2 x=1. Owner ${d[0]} ${map[d[0]]} meaning ${word(d[0])}, group ${d[1]} ${map[d[1]]} meaning ${word(d[1])}, others ${d[2]} ${map[d[2]]} meaning ${word(d[2])}`;
    if (m.length === 4) t += `. The leading ${m[0]} is a special bit, 4 setuid, 2 setgid, 1 sticky`;
    if (d === '777') t += '. Everything for everyone, almost never right on a real system';
    return t;
  }
  const parts = m.split(',').map(p => {
    const mm = /^([ugoa]*)([+\-=])([rwxXst]*)$/.exec(p);
    if (!mm) return p;
    const who = (mm[1] || 'a').split('').map(c => ({ u: 'owner', g: 'group', o: 'others', a: 'everyone' })[c]).join(' and ');
    const op = ({ '+': 'add', '-': 'remove', '=': 'set exactly' })[mm[2]];
    const perm = mm[3].split('').map(c => ({ r: 'read', w: 'write', x: 'execute', X: 'execute on directories', s: 'setuid or setgid', t: 'sticky' })[c]).join(' ');
    return `${op} ${perm} for ${who}`;
  });
  const txt = parts.join(', ');
  return 'Symbolic mode. ' + txt.charAt(0).toUpperCase() + txt.slice(1);
}

const XP_FMT_TR = {
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
/* Ingilizce bicimleyiciler. Birim sozlukte Turkce kaldiysa Ingilizceye cevrilir */
const XP_UNIT_EN = { 'öğe': 'item', alan: 'field', karakter: 'character', byte: 'byte', 'gün': 'day', 'sütun': 'column', 'satır': 'line' };
const XP_FMT_EN = {
  list: (v, u) => {
    u = XP_UNIT_EN[u] || u || 'item';
    const ps = v.split(',');
    const one = ps.length === 1 && /^\d+$/.test(ps[0]);
    const body = ps.map(p => /^\d+-\d+$/.test(p) ? `${p.split('-')[0]} to ${p.split('-')[1]}` : /^\d+-$/.test(p) ? `${p.slice(0, -1)} onward` : /^-\d+$/.test(p) ? `up to ${p.slice(1)}` : p).join(', ');
    const lab = one || /s$/.test(u) ? u : u + 's';
    return lab.charAt(0).toUpperCase() + lab.slice(1) + ' ' + body;
  },
  sortkey: v => { const m = /^(\d+)(?:\.(\d+))?([a-zA-Z]*)(?:,(\d+)(?:\.\d+)?([a-zA-Z]*))?$/.exec(v); if (!m) return 'sort key'; const fl = (m[3] + (m[5] || '')).split('').map(c => ({ n: 'numeric', r: 'reverse', h: 'human readable sizes', M: 'month names', V: 'versions', b: 'ignore leading blanks', f: 'case insensitive' })[c]).filter(Boolean); return `Sort from field ${m[1]} ${m[4] ? 'to field ' + m[4] : 'to the end of the line'}${fl.length ? ', ' + fl.join(' ') : ''}. For a single field write ${m[1]},${m[1]}, otherwise the rest of the line is compared too`; },
  mode: xpModeEn,
  owner: v => { const [u, g] = v.split(':'); return g !== undefined ? `Owner ${u || 'unchanged'}, group ${g || 'the primary group of the user'}` : `Owner ${u}`; },
  size: v => { const m = /^([+-]?)(\d+)([ckMGb]?)$/.exec(v); if (!m) return 'size'; const unit = ({ c: 'bytes', k: 'KB', M: 'MB', G: 'GB', b: '512 byte blocks', '': '512 byte blocks' })[m[3]]; return m[1] === '+' ? `More than ${m[2]} ${unit}` : m[1] === '-' ? `Less than ${m[2]} ${unit}` : `Exactly ${m[2]} ${unit}`; },
  time: v => { const m = /^([+-]?)(\d+)$/.exec(v); if (!m) return 'time'; return m[1] === '-' ? `Within the last ${m[2]} units` : m[1] === '+' ? `Older than ${m[2]} units` : `Exactly ${m[2]} units ago`; },
  signal: v => { const t = { 9: 'SIGKILL, kills the process instantly, it cannot clean up', 15: 'SIGTERM, politely asks it to exit, the default', 1: 'SIGHUP, most daemons reread their config', 2: 'SIGINT, same as Ctrl+C', 3: 'SIGQUIT, quit and leave a core dump', 19: 'SIGSTOP, freezes the process, cannot be caught', 20: 'SIGTSTP, same as Ctrl+Z', 18: 'SIGCONT, resumes a frozen process', 10: 'SIGUSR1, application specific', 12: 'SIGUSR2, application specific', 0: 'Sends no signal, tests whether the process exists and you have permission' }; const n = { KILL: 9, TERM: 15, HUP: 1, INT: 2, QUIT: 3, STOP: 19, TSTP: 20, CONT: 18, USR1: 10, USR2: 12 }; const k = String(v).toUpperCase().replace(/^SIG/, ''); return t[k] || (n[k] !== undefined ? t[n[k]] : 'signal'); },
  regex: v => { const r = xpRegex(v, 'ext'); return 'Regex. ' + r.items.map(x => x.tok + ' ' + x.t.toLowerCase()).join(', '); },
  glob: v => /[*?[]/.test(v) ? 'Glob pattern. * matches anything, ? one character. Quote it, otherwise the shell expands it first' : `Exact name ${v}`,
  dateFmt: v => 'Format ' + (v.replace(/^\+/, '').match(/%./g) || []).map(f => f + ' ' + ({ '%Y': 'year', '%m': 'month', '%d': 'day', '%H': 'hour', '%M': 'minute', '%S': 'second', '%F': 'YYYY-MM-DD', '%T': 'HH:MM:SS', '%s': 'epoch seconds', '%A': 'weekday name', '%B': 'month name', '%j': 'day of the year', '%u': 'day of the week', '%Z': 'time zone', '%z': 'UTC offset' })[f]).join(', '),
  type: v => ({ f: 'Regular file', d: 'Directory', l: 'Symlink', b: 'Block device', c: 'Character device', p: 'Named pipe', s: 'Socket' })[v] || 'type',
  perm: v => {
    if (/^[0-7]+$/.test(v)) return 'Exactly this mode. ' + xpModeEn(v);
    const m = /^([-/])([0-7]+)$/.exec(v);
    if (!m) return /^[-/]/.test(v) ? (v[0] === '-' ? 'All of these bits must be set' : 'At least one of these bits must be set') : xpModeEn(v);
    const sp = { 4000: 'setuid', 2000: 'setgid', 1000: 'sticky', 6000: 'setuid and setgid' }[m[2]];
    return (m[1] === '-' ? 'All of these bits must be set' : 'At least one of these bits must be set') + (sp ? `, the ${sp} bit` : `. ${xpModeEn(m[2].padStart(3, '0'))}`);
  },
};
/* XP_FMT[ad] okundugu anda aktif dilin bicimleyicisini verir */
const XP_FMT = {};
Object.keys(XP_FMT_TR).forEach(k => Object.defineProperty(XP_FMT, k, { get: () => (xpIsEn() ? XP_FMT_EN : XP_FMT_TR)[k], enumerable: true }));

/* ---------- segment aciklama ---------- */

const xpOwn = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
/* Ingilizce modda I18N_EN.x[ad] varsa girdi locX ile Ingilizce metinlerle birlestirilir. num ve ddpos locX'te yok, burada */
function xpEntry(name) {
  if (!xpOwn(EXPLAIN_DB, name)) return null;
  const e = EXPLAIN_DB[name];
  const en = xpEnX(name);
  if (!en || typeof locX !== 'function') return e;
  const out = locX(e, en);
  ['num', 'ddpos'].forEach(k => { if (e[k] && typeof en[k] === 'string') out[k] = en[k]; });
  return out;
}
/* Ayni satirda tanimlanan fonksiyon ve alias adlari, greet() { ... }; greet gibi. explainLine her cagrida sifirlar */
let xpLocal = new Map();
/* Daha once gorulen alias tanimlari satirlar arasi kalir, alias logs='...' sonra logs. explain komutu shell'in alias'larini da ekler */
const xpAliasSeen = new Map();
const XP_SPECIAL = xpLocMap({ '$?': ['Son komutun exit code\'u. 0 başarılı, diğerleri hata', 'Exit code of the last command. 0 is success, anything else is an error'], '$!': ['En son arka plana atılan sürecin PID\'i', 'PID of the most recent background process'], '$$': ['Çalışan shell\'in kendi PID\'i', 'PID of the running shell itself'], '$#': ['Script ya da fonksiyona verilen argüman sayısı', 'Number of arguments passed to the script or function'], '$@': ['Tüm argümanlar, çift tırnak içinde her biri ayrı kelime kalır', 'All arguments, inside double quotes each one stays a separate word'], '$*': ['Tüm argümanlar tek metin olarak', 'All arguments as a single string'], '$0': ['Script\'in ya da shell\'in adı', 'Name of the script or the shell'], '$_': ['Önceki komutun son argümanı', 'Last argument of the previous command'] });
function xpArgNote(v, label, raw) {
  if (label) return label;
  raw = raw === undefined ? v : raw;
  if (/^'/.test(raw)) return /[$`\\*]/.test(v) ? xs('Metin, tek tırnak içinde. $ ve diğer özel karakterler olduğu gibi kalır, değişken açılmaz', 'Text, in single quotes. $ and other special characters stay as they are, variables are not expanded') : XP_ARG();
  if (XP_SPECIAL[v]) return XP_SPECIAL[v];
  if (v === '{}') return xs('Yer tutucu. find -exec ya da xargs -I ile gelen her öğe buraya konur', 'Placeholder. Each item from find -exec or xargs -I goes here');
  if (/^%(\d+|[+%-])$/.test(v)) return v === '%+' || v === '%%' ? xs('En son job', 'The most recent job') : v === '%-' ? xs('Bir önceki job', 'The previous job') : xs(`Job numarası, jobs listesindeki ${v.slice(1)} numaralı iş`, `Job number, job ${v.slice(1)} in the jobs list`);
  if (/^%\?./.test(v)) return xs(`Komut satırında ${v.slice(2)} geçen job`, `The job whose command line contains ${v.slice(2)}`);
  if (/^%\w/.test(v)) return xs(`Komutu ${v.slice(1)} ile başlayan job`, `The job whose command starts with ${v.slice(1)}`);
  if (/\$\{\w+:\?\}/.test(v)) return xs('Değişken içeren path. Süslü parantez içindeki iki nokta soru işareti, değişken boşsa komutu hata ile durdurur, rm -rf için hayat kurtarır', 'Path with a variable. The colon and question mark inside the braces stop the command with an error if the variable is empty, a lifesaver for rm -rf');
  if (/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(v)) return xs('MAC adresi', 'MAC address');
  if (/^\$[1-9]$/.test(v)) return xs(`${v.slice(1)}. argüman, script ya da fonksiyona verilen`, `Argument ${v.slice(1)} passed to the script or function`);
  if (/^\$\(\(/.test(v)) return xs('Aritmetik genişletme, içerisi sayı olarak hesaplanır', 'Arithmetic expansion, the inside is evaluated as a number');
  if (/^\$\(/.test(v) || /^`/.test(v)) return xs('Command substitution. İçteki komutun çıktısı buraya yerleşir', 'Command substitution. The output of the inner command goes here');
  if (/^"/.test(raw) && /\$\(|`/.test(v)) return xs('Metin, çift tırnak içinde. İçindeki komut çıktıları ve değişkenler yerine konur', 'Text, in double quotes. Command outputs and variables inside it are substituted');
  if (/^"/.test(raw) && /\$\{?\w/.test(v) && /\s|^\$\w+\W|\w\$/.test(v)) return xs('Metin, çift tırnak içinde. İçindeki değişkenler değerleriyle değiştirilir', 'Text, in double quotes. Variables inside it are replaced with their values');
  if (/^\$\w+$|^\$\{\w+\}$/.test(v)) return xs('Değişken, shell değerini yerine koyar', 'Variable, the shell substitutes its value');
  if (/^https?:\/\//.test(v)) return 'URL';
  if (/^[\w.-]+@[\w.-]+/.test(v)) return /:/.test(v) ? xs('Uzak path. kullanıcı@host, iki noktadan sonra o sunucudaki path', 'Remote path. user@host, after the colon comes the path on that server') : xs('Kullanıcı ve host, kullanıcı@host biçiminde', 'User and host, in user@host form');
  if (/^\d+\.\d+\.\d+\.\d+(\/\d+)?$/.test(v)) return /\//.test(v) ? xs('IP adresi ve prefix', 'IP address and prefix') : xs('IP adresi', 'IP address');
  if (/\s/.test(v)) return XP_ARG();
  if (/\$\{?\w/.test(v) && !/[*?]/.test(v.replace(/\$\{[^}]*\}/g, ''))) return xs('Değişken içeren path ya da metin, shell değişkenin değerini yerine koyar', 'Path or text with a variable, the shell substitutes its value');
  if (/[*?]/.test(v)) return xs('Glob. Shell eşleşen dosya adlarına genişletir', 'Glob. The shell expands it to matching file names');
  if (/^~/.test(v)) return xs('Home dizini altında path', 'Home directory path');
  if (/^\//.test(v)) return xs('Absolute path, kökten başlar', 'Absolute path, starts at the root');
  if (/^([\w.-]+@)?[\w.-]+:([~/.]|$)/.test(v) && !/^\w+:\/\//.test(v)) return xs('Uzak path. Önce host, iki noktadan sonra o sunucudaki path', 'Remote path. Host first, after the colon comes the path on that server');
  if (/^[\w.\/-]+:[\w.-]+$/.test(v)) return xs('Sürüm etiketli ad, iki noktadan sonrası tag', 'Name with a version tag, the part after the colon is the tag');
  if (!/\//.test(v) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/i.test(v) && /\.(com|net|org|io|lab|local|corp|dev|lan|home|internal|arpa|edu|gov|tr|nl|de|uk|eu|cloud|app)(:\d+)?$/i.test(v)) return xs('Host adı', 'Host name') + (/:\d+$/.test(v) ? xs(' ve port', ' and port') : '');
  if (/\//.test(v) || /\.\w{1,5}$/.test(v)) return xs('Relative path, bulunduğun dizine göre', 'Relative path, relative to the current directory');
  if (/^\d+$/.test(v)) return xs('Sayı', 'Number');
  return XP_ARG();
}

function xpSegment(words, out, depth) {
  words = words.slice();
  let i = 0;
  while (i < words.length && /^[A-Za-z_]\w*=/.test(words[i].raw)) {
    const w = words[i]; const k = w.raw.split('=')[0];
    const alone = words.slice(i + 1).every(x => /^[A-Za-z_]\w*=/.test(x.raw));
    let at = alone ? xs(`Değişken ataması. ${k} shell değişkeni olur, $${k} ile okunur. Eşittirin etrafında boşluk olmaz`, `Variable assignment. ${k} becomes a shell variable, read it with $${k}. No spaces around the equals sign`) : xs(`Değişken ataması. ${k} sadece arkasındaki komutun ortamına verilir`, `Variable assignment. ${k} is passed only to the environment of the command after it`);
    if (/=\$\(\(/.test(w.raw)) at += xs('. Çift parantezli $ ifadesi aritmetik olarak hesaplanır', '. The double parenthesis $ expression is evaluated as arithmetic');
    else if (/=\$\(|=`/.test(w.raw)) at += xs('. Değer, içteki komutun çıktısı olur', '. The value becomes the output of the inner command');
    out.push({ kind: 'assign', tok: w.raw, depth, t: at });
    i++;
  }
  if (i >= words.length) return;
  if (words[i].raw === '!') { out.push({ kind: 'op', tok: '!', depth, t: xs('Sonucu tersine çevir, başarılıysa başarısız say', 'Inverts the result, success counts as failure') }); i++; }
  if (i >= words.length) return;
  /* shell anahtar kelimeleri, for while if then do done */
  while (i < words.length && xpOwn(XP_KW, words[i].raw) && !(words[i].raw === '[[')) {
    const k = words[i].raw;
    out.push({ kind: 'kw', tok: k, depth, t: XP_KW[k] });
    i++;
    if (k === 'for' && i < words.length) {
      if (/^\(\(/.test(words[i].raw)) { out.push({ kind: 'arg', tok: words.slice(i).map(w => w.raw).join(' '), depth: depth + 1, t: xs('C stili döngü, başlangıç, koşul, artış', 'C style loop, start, condition, step') }); return; }
      out.push({ kind: 'arg', tok: words[i].raw, depth: depth + 1, t: xs('Döngü değişkeni, her turda listedeki bir sonraki değeri alır, $' + words[i].raw + ' ile okunur', 'Loop variable, takes the next value from the list on each pass, read it with $' + words[i].raw) }); i++;
      if (words[i] && words[i].raw === 'in') { out.push({ kind: 'kw', tok: 'in', depth: depth + 1, t: xs('Arkasından liste gelir', 'The list follows') }); i++; }
      for (; i < words.length; i++) out.push({ kind: 'arg', tok: words[i].raw, depth: depth + 2, t: xpArgNote(words[i].val, null, words[i].raw) === XP_ARG() ? xs('Liste öğesi', 'List item') : xpArgNote(words[i].val, null, words[i].raw) });
      return;
    }
    if (k === 'case' && i < words.length) { out.push({ kind: 'arg', tok: words[i].raw, depth: depth + 1, t: xs('Karşılaştırılacak değer', 'Value to compare') }); i++; if (words[i] && words[i].raw === 'in') { out.push({ kind: 'kw', tok: 'in', depth: depth + 1, t: xs('Arkasından desenler gelir, her biri ) ile biter', 'Patterns follow, each one ends with )') }); i++; } if (i < words.length) xpSegment(words.slice(i), out, depth); return; }
    if (k === 'function' && i < words.length) { xpLocal.set(words[i].raw.replace(/\(\)$/, ''), 'fn'); out.push({ kind: 'arg', tok: words[i].raw, depth: depth + 1, t: xs('Fonksiyon adı', 'Function name') }); i++; continue; }
  }
  if (i >= words.length) return;
  if (/^\w+\(\)$/.test(words[i].raw)) { xpLocal.set(words[i].raw.slice(0, -2), 'fn'); out.push({ kind: 'kw', tok: words[i].raw, depth, t: xs('Fonksiyon tanımı, adı ', 'Function definition, named ') + words[i].raw.slice(0, -2) }); i++; xpSegment(words.slice(i), out, depth + 1); return; }
  if (/^[^\s()]+\)$/.test(words[i].raw)) { out.push({ kind: 'kw', tok: words[i].raw, depth, t: xs('case deseni. Değer buna uyarsa arkasındaki komutlar çalışır', 'case pattern. If the value matches, the commands after it run') + (words[i].raw.includes('|') ? xs(', | veya demek', ', | means or') : '') + (words[i].raw === '*)' ? xs(', * diğer her şeyi yakalar', ', * catches everything else') : '') }); i++; if (i >= words.length) return; }
  /* anahtar kelimeden sonra gelen atama, while IFS=: read ... */
  if (i > 0 && /^[A-Za-z_]\w*=/.test(words[i].raw)) { xpSegment(words.slice(i), out, depth); return; }
  if (words[words.length - 1].raw === ';;') words = words.slice(0, -1);
  const name = words[i].val.split('/').pop();
  let e = xpEntry(name);
  const man = typeof MANUAL !== 'undefined' ? (MANUAL[name] || (typeof LAB_EXT !== 'undefined' && LAB_EXT.manual && LAB_EXT.manual[name])) : null;
  const manEn = man && xpEnX(name);
  if (name === '[' || name === '[[') e = e || xpEntry('test');
  const isPath = /\//.test(words[i].val);
  const local = !e && (xpLocal.get(name) || (xpAliasSeen.has(name) ? 'alias' : null));
  if (name === 'alias') words.slice(i + 1).forEach(w => { const m = /^([\w.-]+)=([\s\S]*)$/.exec(w.val); if (m) { xpLocal.set(m[1], 'alias'); xpAliasSeen.set(m[1], m[2]); } });
  const pathT = /^\.\//.test(words[i].val) ? xs('Çalıştırılabilir dosya ya da script. ./ bulunduğun dizin demek, çalışması için x izni gerekir', 'Executable file or script. ./ means the current directory, it needs the x permission to run') : xs('Path ile çağrılan çalıştırılabilir dosya ya da script. Çalışması için x izni gerekir', 'Executable file or script called by path. It needs the x permission to run');
  const localT = local === 'fn' ? xs('Bu satırda tanımlanan fonksiyonu çağırır. Argümanlar fonksiyon içinde $1, $2 olur', 'Calls the function defined on this line. The arguments become $1, $2 inside the function') : xpAliasSeen.get(name) ? xs(`Alias. Shell bunu ${xpAliasSeen.get(name)} komutuyla değiştirir`, `Alias. The shell replaces it with ${xpAliasSeen.get(name)}`) : xs('Alias, shell onu asıl komutla değiştirir', 'Alias, the shell replaces it with the real command');
  out.push({ kind: 'cmd', tok: words[i].raw, name, depth, t: e ? e.d : local ? localT : man ? (manEn && typeof manEn.d === 'string' ? manEn.d : man.d) : isPath ? pathT : xs('Bu komut için açıklama yok', 'No explanation for this command'), unknown: !e && !local && !man && !isPath, nodb: !e && !local && !isPath });
  i++;
  if (!e) { for (let n = 1; i < words.length; i++, n++) { const note = xpArgNote(words[i].val, null, words[i].raw); out.push({ kind: 'arg', tok: words[i].raw, depth: depth + 1, t: local && note === XP_ARG() ? xs(`${n}. argüman, ${local === 'fn' ? 'fonksiyon' : 'komut'} içinde $${n} olarak okunur`, `Argument ${n}, read as $${n} inside the ${local === 'fn' ? 'function' : 'command'}`) : note }); } return; }
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
    out.push({ kind: 'sub', tok: words[i].raw, depth: depth + 1, t: sub.d || xs(`${k} alt komutu`, `${k} subcommand`) });
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
      out.push({ kind: 'opt', tok: w.raw, depth, t: xs('BSD stili seçenek, tire olmadan yazılır', 'BSD style options, written without a dash') });
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
      out.push({ kind: 'op', tok: '--', depth, t: xs('Seçeneklerin sonu. Bundan sonrası tire ile başlasa bile argüman sayılır', 'End of options. Everything after it counts as an argument even if it starts with a dash') + (dd ? xs(`. Burada arkasından ${dd.replace(/\.\.\.$/, '')} gelir`, `. Here ${dd.replace(/\.\.\.$/, '')} follows`) : '') });
      continue;
    }
    /* find -exec ... \; ve xargs gibi ic ice komutlar */
    if (!endOpts && sp === 'find' && (v === '-exec' || v === '-execdir' || v === '-ok')) {
      const j = words.findIndex((x, k) => k > i && (x.val === ';' || x.val === '+'));
      const end = j < 0 ? words.length : j;
      out.push({ kind: 'opt', tok: w.raw, depth, t: (opts[v] && opts[v].t) || xs('Bulunan her dosya için komut çalıştır', 'Run a command for each file found') });
      const inner = words.slice(i + 1, end).map(x => x.val === '{}' ? Object.assign({}, x, { raw: '{}' }) : x);
      const sub = [];
      xpSegment(inner, sub, depth + 1);
      sub.forEach(x => { if (x.tok === '{}') x.t = xs('Bulunan dosyanın adı buraya konur', 'The name of the found file goes here'); });
      out.push(...sub);
      if (j >= 0) out.push({ kind: 'op', tok: words[j].raw, depth: depth + 1, t: words[j].val === '+' ? xs('Komutu tüm dosyalarla tek seferde çalıştırır, xargs gibi, hızlıdır', 'Runs the command once with all the files, like xargs, so it is fast') : xs('Komutun sonu. Her dosya için ayrı ayrı çalıştırır. Shell yemesin diye \\; yazılır', 'End of the command. Runs it separately for each file. Written as \\; so the shell leaves it alone') });
      i = end; continue;
    }
    /* tirnak icinde bosluklu metin secenek olamaz, echo "- madde" */
    if (!endOpts && v.startsWith('-') && v.length > 1 && !(w.quoted && /\s/.test(v)) && !(/^-\d/.test(v) && !ctx.e.num && !opts[v])) {
      /* uzun secenek */
      if (v.startsWith('--')) {
        const [k, val] = v.includes('=') ? [v.slice(0, v.indexOf('=')), v.slice(v.indexOf('=') + 1)] : [v, null];
        const key = opts[k] ? k : al[k] && opts[al[k]] ? al[k] : null;
        const spec = key ? opts[key] : null;
        if (!spec) { out.push({ kind: 'unknown', tok: w.raw, depth, t: xs(`Bu seçenek sözlükte yok. man ${name} ile bak`, `This option is not in the dictionary. Check man ${name}`) }); continue; }
        let arg = val;
        if (arg === null && takes(spec, i + 1)) arg = words[++i].val;
        out.push(xpOptItem(w.raw + (val === null && spec.a && arg !== null ? ' ' + words[i].raw : ''), key !== k ? xs(`${k}, ${key} ile aynı`, `${k}, same as ${key}`) : k, spec, arg, depth));
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
      if (single) { out.push({ kind: 'unknown', tok: w.raw, depth, t: xs(`Bu seçenek sözlükte yok. man ${name} ile bak`, `This option is not in the dictionary. Check man ${name}`) }); continue; }
      /* sayi kisayolu, head -5, kill -9 */
      if (/^-\d+$/.test(v) && ctx.e.num) { out.push({ kind: 'opt', tok: w.raw, depth, t: ctx.e.num + (XP_FMT[ctx.e.numf] ? '. ' + XP_FMT[ctx.e.numf](v.slice(1)) : '') }); continue; }
      if (/^-[A-Z]+$/.test(v) && sp === 'kill') { out.push({ kind: 'opt', tok: w.raw, depth, t: xs('Gönderilecek sinyal. ', 'Signal to send. ') + XP_FMT.signal(v.slice(1)) }); continue; }
      /* harf demeti, -la, -tvf arsiv, -d: */
      const chars = v.slice(1);
      const group = [];
      let ok = true;
      for (let c = 0; c < chars.length; c++) {
        const key = '-' + chars[c];
        const spec = opts[key] || (al[key] && opts[al[key]]);
        if (!spec) { ok = false; group.push({ kind: 'unknown', tok: '  ' + key, depth: depth + 1, t: xs(`Bu seçenek sözlükte yok. man ${name} ile bak`, `This option is not in the dictionary. Check man ${name}`) }); continue; }
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
      else { out.push({ kind: 'opt', tok: w.raw + (w.bundleNoDash ? '' : ''), depth, t: w.bundleNoDash ? xs('Tire olmadan yazılmış seçenek demeti, harf harf aşağıda', 'Option bundle written without a dash, letter by letter below') : xs('Birleşik yazılmış kısa seçenekler, harf harf aşağıda', 'Combined short options, letter by letter below'), unknown: !ok }); out.push(...group); }
      continue;
    }
    /* pozisyonel argumanlar ve ozel programlar */
    if (!progTaken.v && sp === 'awk' && !seen['-f']) { progTaken.v = true; posIdx++; out.push({ kind: 'prog', tok: w.raw, depth, t: xs('awk programı. Tek tırnak içinde yazılır ki shell $1 gibi ifadeleri bozmasın', 'awk program. Written in single quotes so the shell does not mangle expressions like $1') }); xpAwk(v).forEach(x => out.push({ kind: 'prog', tok: '  ' + x.tok, depth: depth + 1, t: x.t })); continue; }
    if (!progTaken.v && sp === 'sed' && !seen['-e'] && !seen['-f']) { progTaken.v = true; posIdx++; out.push({ kind: 'prog', tok: w.raw, depth, t: xs('sed script. Tek tırnak içinde yazılır', 'sed script. Written in single quotes') }); xpSed(v, { n: seen['-n'], ext: seen['-E'] || seen['-r'] }).forEach(x => out.push({ kind: 'prog', tok: '  ' + x.tok, depth: depth + 1, t: x.t })); continue; }
    if (!progTaken.v && sp === 'grep' && !seen['-e'] && !seen['-f']) {
      progTaken.v = true; posIdx++;
      const mode = seen['-P'] ? 'perl' : (seen['-E'] || name === 'egrep') ? 'ext' : (seen['-F'] || name === 'fgrep') ? 'fixed' : 'basic';
      out.push({ kind: 'prog', tok: w.raw, depth, t: mode === 'fixed' ? xs('Aranan metin, -F ile regex değil düz metin', 'Search text, with -F it is plain text, not a regex') : xs(`Aranan desen, ${mode === 'basic' ? 'basic regex' : mode === 'ext' ? 'extended regex' : 'Perl regex'}. Özel karakter varsa tek tırnak içinde yaz`, `Search pattern, ${mode === 'basic' ? 'basic regex' : mode === 'ext' ? 'extended regex' : 'Perl regex'}. If it has special characters write it in single quotes`) });
      if (mode !== 'fixed') { const r = xpRegex(v, mode); r.items.forEach(x => out.push({ kind: 'prog', tok: '  ' + x.tok, depth: depth + 1, t: x.t })); r.warn.forEach(x => out.push({ kind: 'warn', tok: '  ⚠', depth: depth + 1, t: x })); }
      continue;
    }
    if (sp === 'chmod' && posIdx === 0 && (/^[0-7]{3,4}$/.test(v) || /^[ugoa]*[+\-=]/.test(v))) { posIdx++; out.push({ kind: 'arg', tok: w.raw, depth, t: xpMode(v) }); continue; }
    if (sp === 'chown' && posIdx === 0) { posIdx++; out.push({ kind: 'arg', tok: w.raw, depth, t: XP_FMT.owner(v) }); continue; }
    if (sp === 'date' && v.startsWith('+')) { out.push({ kind: 'arg', tok: w.raw, depth, t: XP_FMT.dateFmt(v) }); continue; }
    if (sp === 'dd' && /^\w+=/.test(v)) { const k = v.split('=')[0]; out.push({ kind: 'opt', tok: w.raw, depth, t: (ctx.e.kv && ctx.e.kv[k]) || xs('dd parametresi', 'dd parameter') }); continue; }
    if (sp === 'find' && posIdx === 0 && (v === '!' || v === '(' || v === ')' || v === '-o' || v === '-a')) { /* asagida */ }
    if (sp === 'find' && (v === '!' || v === '\\!')) { out.push({ kind: 'op', tok: w.raw, depth, t: xs('Sonraki koşulu tersine çevir, değil', 'Negates the next condition, not') }); continue; }
    if (sp === 'find' && (v === '(' || v === ')')) { out.push({ kind: 'op', tok: w.raw, depth, t: xs('Koşulları grupla, \\( \\) diye kaçışla yazılır', 'Groups conditions, written escaped as \\( \\)') }); continue; }
    if (sp === 'tr' && posIdx < 2) { posIdx++; out.push({ kind: 'arg', tok: w.raw, depth, t: (posIdx === 1 ? xs('Kaynak karakter kümesi', 'Source character set') : xs('Hedef karakter kümesi', 'Target character set')) + (/[a-z]-[a-z]|\[:/.test(v) ? xs('. a-z aralık, [:upper:] gibi sınıflar kullanılabilir', '. a-z is a range, classes like [:upper:] work too') : '') }); continue; }
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
      out.push({ kind: 'op', tok: '↳', depth, t: ctx.root.wt || xs(`${name} şu komutu çalıştırır`, `${name} runs this command`) });
      /* tirnak icinde tek parca verilmis komut, watch -n 1 "ss -tn | wc -l", ssh host 'df -h' */
      if (words.length === i + 1 && w.quoted && /\s/.test(v.trim())) {
        out.push({ kind: 'arg', tok: w.raw, depth: depth + 1, t: xs('Tırnak içinde tek parça verilen komut satırı, pipe ve yönlendirmeler de bu komutun parçası', 'A command line given as one quoted piece, its pipes and redirects belong to this command') });
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
  const en = xpIsEn();
  const cap = base.charAt(0).toLocaleUpperCase(en ? 'en-US' : 'tr-TR') + base.slice(1);
  if (note.startsWith(cap + ',')) return note;
  if (note.toLowerCase() === base.toLowerCase()) return cap;
  /* path notu sadece dosya ve dizin bekleyen etiketlerde anlamli, revizyon ya da cevap icin degil. Ingilizce modda etiket iki dilde de olabilir */
  const pathy = en ? /dosya|dizin|path|script|kaynak|hedef|arşiv|aygıt|bağlama|link|başlangıç|program|anahtar dosyası|file|dir|folder|source|target|dest|archive|device|mount|start|key/i : /dosya|dizin|path|script|kaynak|hedef|arşiv|aygıt|bağlama|link|başlangıç|program|anahtar dosyası/i;
  if (/^(Relative|Absolute|Home)/.test(note) && !pathy.test(base)) return cap;
  return note === XP_ARG() ? cap : cap + ', ' + low(note);
}

function xpOptItem(tok, key, spec, arg, depth, ctx) {
  let t = spec.t;
  if (arg !== null && arg !== undefined) {
    const f = spec.f && XP_FMT[spec.f];
    let extra = f ? f(arg, spec.u) : '';
    /* v, belirli degerlerin anlami, kubectl -o wide, gnmic --mode stream */
    if (!extra && spec.v) { const k2 = xpOwn(spec.v, arg) ? arg : String(arg).split('=')[0]; if (xpOwn(spec.v, k2)) extra = `${arg}, ${spec.v[k2]}`; }
    if (!extra) {
      if (arg === ':') extra = xs('Değer iki nokta', 'The value is a colon');
      else if (arg === ',') extra = xs('Değer virgül', 'The value is a comma');
      else if (arg === ' ') extra = xs('Değer boşluk', 'The value is a space');
      else if (arg === '\t' || arg === '\\t') extra = xs('Değer Tab', 'The value is a Tab');
      else if (XP_SPECIAL[arg]) extra = `${arg} ${XP_SPECIAL[arg].charAt(0).toLowerCase() + XP_SPECIAL[arg].slice(1)}`;
      else if (!/\s/.test(tok.trim())) extra = xs(`Değer ${arg}`, `Value ${arg}`);
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
      let tx = XP_REDIR[t.redir] || xs('Yönlendirme', 'Redirection');
      if (target && target.val === '/dev/null') tx += xs('. /dev/null çöp kutusudur, yazılan her şey kaybolur', '. /dev/null is the trash can, everything written there is lost');
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
  if (e.num) rows.push({ k: '-N', t: e.num + (e.numf === 'signal' ? '. -9 SIGKILL, -15 SIGTERM, -1 SIGHUP' : xs('. -5 gibi', '. like -5')) });
  optRows(e.o, e.al, '');
  const subs = [];
  if (e.sub) Object.entries(e.sub).forEach(([k, s]) => { subs.push({ k, t: s.d || '' }); });
  if (asHTML) {
    let h = `<div class="xp-ref"><div class="xp-d">${xpEsc(e.d)}</div>`;
    if (subs.length) h += `<div class="xp-h">${xs('Alt komutlar', 'Subcommands')}</div>` + subs.map(s => `<div class="xp-row"><code>${xpEsc(s.k)}</code><span>${xpEsc(s.t)}</span></div>`).join('');
    if (rows.length) h += `<div class="xp-h">${xs('Seçenekler', 'Options')}</div>` + rows.map(s => `<div class="xp-row"><code>${xpEsc(s.k)}</code><span>${xpEsc(s.t)}</span></div>`).join('');
    if (e.ex && e.ex.length) h += `<div class="xp-h">${xs('Örnekler', 'Examples')}</div>` + e.ex.map(([c, t]) => `<div class="xp-row"><code class="xp-ex" data-e="${xpEsc(c)}">${xpEsc(c)}</code><span>${xpEsc(t)}</span></div>`).join('');
    if (e.tip) h += `<div class="xp-tip">💡 ${xpEsc(e.tip)}</div>`;
    return h + '</div>';
  }
  let s = `${name}  ${e.d}\n`;
  if (subs.length) s += '\n' + xs('Alt komutlar', 'Subcommands') + '\n' + subs.map(x => '  ' + x.k.padEnd(18) + x.t).join('\n') + '\n';
  if (rows.length) { const w = Math.min(26, Math.max(...rows.map(x => x.k.length))); s += '\n' + xs('Seçenekler', 'Options') + '\n' + rows.map(x => '  ' + (x.k.length >= w + 2 ? x.k + '  ' : x.k.padEnd(w + 2)) + x.t).join('\n') + '\n'; }
  if (e.ex && e.ex.length) s += '\n' + xs('Örnekler', 'Examples') + '\n' + e.ex.map(([c, t]) => `  $ ${c}\n      ${t}`).join('\n') + '\n';
  if (e.tip) s += `\n💡 ${e.tip}\n`;
  return s;
}

/* Ipucu icin, cozumdeki komutlarin ne ise yaradigini ve hangi secenekleri kullanacagini degerleri vermeden anlatir */
function explainHint(solution) {
  const cmds = new Map();
  String(solution || '').split('\n').forEach(line => {
    if (!line.trim() || /^(sudo\s+)?(nano|vim|vi)\b/.test(line.trim())) { const m = /^(?:sudo\s+)?(nano|vim|vi)\b/.exec(line.trim()); if (m) cmds.set(m[1], cmds.get(m[1]) || { d: (xpEntry(m[1]) || {}).d || xs('Editör', 'Editor'), opts: new Map(), ops: new Set() }); return; }
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
          if (!h) return fail('explain: ' + xs('açıklanacak komut yok. explain cut -d: -f1 /etc/passwd ya da explain cut yaz\n', 'nothing to explain. Type explain cut -d: -f1 /etc/passwd or explain cut\n'));
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
