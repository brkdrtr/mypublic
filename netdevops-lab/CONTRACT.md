# NetDevOps Lab, modul sozlesmesi

Tum dosyalar klasik script, tek global scope. Her dosyada top level const ve function adlari benzersiz on ek tasir
(ornek ND_, nd, SIMD_, simd). Yukleme sirasi index.html'de, ../linux-lab/shell.js, ../linux-lab/ext-git.js,
../linux-lab/ext-vim.js, vendor/js-yaml.min.js, lab.js, sim-*.js, py.js, missions-*.js, app.js.

## Shell (linux-lab/shell.js)
- registerExt({ files: {'/abs/path': node}, commands: {name: fn}, procs, services, manual: {name: {d,u,e}}, onReset: sh => {} })
- Komut fonksiyonu `function (args, stdin) { const sh = this; ... }` seklinde, `this` Shell nesnesidir, arrow function kullanma.
  Donus ok(text) ya da fail(text, code) ya da {out, err, code}.
- Komut fonksiyonu icinde ok(text) ve fail(text) yardimcilari, sh.readFile(path, cmd) -> {data} ya da {err}, sh.writeFile(path, data, append, cmd) -> null ya da hata metni,
  sh.node(abs), sh.resolve(path), sh.cwd, sh.isRoot, sh.history, mkfile(content), mkdir(children)
- Dosya dugumu {t:'f', d:'icerik', m:0o644, o:'burak'} ve {t:'d', c:{}, m, o}
- HOME '/home/burak', USER 'burak'
- Komut cagrisi senkron. Python da senkron calisir, py.js bak.

## LAB (lab.js)
- LAB.devices[name], sim-device.js doldurur. Zorunlu alanlar
  - name, host, platform 'ios-xe', mgmt {ssh:22, netconf:830, restconf:443, gnmi:57400}
  - cli(cmd) -> string. show komutlari ve config girisi icin configure(lines[]) -> {changed:bool, output:string}
  - running() -> string, IOS-XE benzeri running-config
  - state() -> JSON model, salt okunur kopya {hostname, interfaces:{Gi1:{description, ip, mask, enabled, vlan}}, vlans:{10:{name}}, users:[], bgp:{asn, neighbors:[]}, ntp:[]}, mission check'leri bunu okur
  - configure(lines[]) IOS komut satirlarini uygular, `interface GigabitEthernet2`, `description X`, `ip address A M`, `shutdown`, `no shutdown`, `vlan 10`, `name X`, `hostname X`, `username X privilege 15 secret Y`, `ntp server X`, `router bgp N`, `neighbor X remote-as Y`, `no ...` satirlari. Ansible ve Terraform simulatorleri bunu kullanir
  - netconf: { capabilities() -> string[], get(filterXml|null) -> xml string, getConfig(source, filterXml|null) -> xml,
               editConfig(target, configXml, defaultOperation) -> {ok, error}, lock(target), unlock(target),
               commit() -> {ok}, discard(), validate(), closeSession() }  hatalar rpc-error xml stringi olarak doner
  - restconf: { request(method, path, body, headers) -> {status, headers, body} }  path /restconf/data/... ile baslar
  - gnmi: { capabilities() -> obj, get(paths[], encoding) -> obj, set({update:[], replace:[], delete:[]}) -> obj,
            subscribe(paths[], mode, sampleInterval, count) -> obj[] }
  - reset()
- LAB.http(req) -> {status, headers, body}. req {method, url, headers, body}. Servisler LAB.registerHttp(fn) ile eklenir,
  fn(req) null donerse sira sonrakine gecer. sim-device.js r1.lab icin RESTCONF'u buraya da kaydeder,
  sim-api.js api.lab'i kaydeder. curl bu hostlara LAB.http ile cevap verir.
- LAB.registerPy('paket/dosya.py', 'py/paket/dosya.py'). py.js acilista fetch edip Pyodide'de /lib/ndlab altina yazar,
  sys.path'e ekler. Boylece `import ncclient` calisir.

## Python (py.js)
- Pyodide, netdevops-lab/pyodide altinda yerel. Paketler pytest, pyyaml, jinja2, lxml, requests shim degil gercek
  requests yoktur, requests shim'i sim-api agent'i yazar.
- Komutlar python3, python, pytest, pip. Senkron calisir, pipe ve yonlendirme calisir.
- Calismadan once sanal FS /home/burak Pyodide FS'e kopyalanir, sonra geri. Python'un yazdigi dosyalar shell'de gorunur.
- Her calismadan sonra sh.lastPy = {argv, code, stdout, stderr}. Mission check bunu okuyabilir.
- Python icinden JS'e kopru, `import ndlab`. ndlab.http(method, url, headers_dict, body_str) -> dict
  {status, headers, body, error}. ndlab.device(name) -> JS cihaz nesnesi proxy, ndlab.device('r1').cli('show ip int brief').
  ndlab.devices() -> isim listesi.

## Missions
- Format linux-lab/missions.js ile ayni. {id, title, xp, story, task, hint, solution, check(sh, ctx), setup(sh), editorContent?}
- ctx {line, out, submit}. Python gorevlerinde ctx.out python ciktisidir, sh.lastPy de dolu.
- setup(sh) baslangic dosyalarini yazar, sh.writeFile ile. Kullanici dosyayi nano, vim ya da Editor sekmesinden duzenler.
- solution, test harness'in aynen calistiracagi komut satirlari, tek satirlik komutlar. Heredoc yok.
  Dosya duzenleme gereken adimda solution'da `nano dosya` satiri olur ve editorContent o dosyanin icerigidir.
  Birden fazla dosya icin editorContent bir nesne olur, {'app.py': '...', 'tests/test_app.py': '...'}, harness
  `nano yol` satirinda ilgili icerigi yazar. Kullanici gercekte dosyayi Editor sekmesinden, nano ya da vim ile yazar.
- check(sh, ctx) gercek durumu dogrulamali, sh.lastPy.code, sh.lastPy.stdout, sh.readFile ile dosya icerigi,
  LAB.devices.r1.running() ile cihaz config'i, sim durumlari. Sadece komut satirina bakmak yeterli degil.
- Prose kurallari, Turkce anlatim, teknik terimler Ingilizce, em dash, en dash, parantez, iki nokta ve ** yok.
