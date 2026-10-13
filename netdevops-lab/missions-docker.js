'use strict';
/* Docker bolumu. Gorev kontrolleri sim-docker engine durumunu ve Dockerfile icerigini okur, komut satirina bakmaz. */

const MDK_HOME = '/home/burak';
const MDK_DIR = MDK_HOME + '/netauto';
const MDK_APP = `"""netauto, kucuk network automation worker.
Inventory'yi okur, her cihaz icin config audit calistirir, --serve ile job bekler."""
import os
import sys
import time

import yaml

APP = "netauto"
VERSION = "1.0.0"
VALID_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR"}

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
INVENTORY = os.environ.get("INVENTORY", "inventory.yaml")
PORT = int(os.environ.get("PORT", "8080"))
REDIS_HOST = os.environ.get("REDIS_HOST", "")


def load_inventory(path):
    with open(path) as f:
        data = yaml.safe_load(f)
    return data.get("devices", [])


def main():
    if LOG_LEVEL not in VALID_LEVELS:
        print(f"ERROR: LOG_LEVEL {LOG_LEVEL} is not valid, use one of {sorted(VALID_LEVELS)}", file=sys.stderr)
        sys.exit(1)
    print(f"{APP} {VERSION} starting, log level {LOG_LEVEL}")
    if REDIS_HOST:
        print(f"cache backend redis at {REDIS_HOST}:6379")
    try:
        devices = load_inventory(INVENTORY)
    except FileNotFoundError:
        print(f"ERROR: inventory {INVENTORY} not found", file=sys.stderr)
        sys.exit(2)
    print(f"loaded {len(devices)} devices from {INVENTORY}")
    for d in devices:
        print(f"  {d['name']} {d['host']} {d['platform']}")
    print(f"audit complete, {len(devices)} devices checked")
    if "--serve" in sys.argv:
        print(f"serving on port {PORT}, waiting for jobs")
        while True:
            time.sleep(60)


if __name__ == "__main__":
    main()
`;
const MDK_FILES = {
  'app.py': MDK_APP,
  'requirements.txt': 'pyyaml==6.0.2\njinja2==3.1.4\n',
  'inventory.yaml': 'devices:\n  - name: r1\n    host: 10.0.0.1\n    platform: ios-xe\n    ntp: 10.0.50.10\n  - name: r2\n    host: 10.0.0.2\n    platform: ios-xe\n    ntp: 10.0.50.10\n  - name: sw1\n    host: 10.0.0.11\n    platform: ios\n',
  'tests/test_app.py': 'from app import load_inventory\n\n\ndef test_inventory_loads():\n    devices = load_inventory("inventory.yaml")\n    assert len(devices) == 3\n\n\ndef test_first_device():\n    assert load_inventory("inventory.yaml")[0]["name"] == "r1"\n',
  'config/settings.yaml': 'audit:\n  ntp_required: true\n  banner_required: false\nreport:\n  format: text\n',
  'README.md': '# netauto\n\nNetwork automation worker. python3 app.py tek seferlik audit, --serve ile daemon.\n',
};
function mdkSetup(sh) {
  sh.run(`mkdir -p ${MDK_DIR}/tests ${MDK_DIR}/config`);
  for (const [rel, content] of Object.entries(MDK_FILES)) { if (!sh.node(`${MDK_DIR}/${rel}`)) sh.writeFile(`${MDK_DIR}/${rel}`, content, false, 'setup'); }
}
const mdkState = sh => SIMDK_load(sh);
const mdkImage = (sh, tag) => { const st = mdkState(sh); return st.images.find(i => i.repoTags.includes(tag)) || null; };
const mdkCont = (sh, name) => { const st = mdkState(sh); return st.containers.find(c => c.name === name) || null; };
const mdkRunning = (sh, pred) => mdkState(sh).containers.filter(c => c.status === 'running' && pred(c));
const mdkDockerfile = sh => { const n = sh.node(MDK_DIR + '/Dockerfile'); return n && n.t === 'f' ? n.d : ''; };
const mdkInst = sh => mdkDockerfile(sh).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const mdkEnv = (c, k) => (c.env || []).find(e => e.startsWith(k + '='));
const mdkImageOf = (sh, c) => mdkState(sh).images.find(i => i.id === c.imageId);
const mdkIsNetauto = (sh, c) => { const img = mdkImageOf(sh, c); return !!(img && img.lab && img.files && Object.keys(img.files).some(k => k.endsWith('app.py'))); };

const MDK_DF1 = 'FROM python:3.12-slim\nWORKDIR /app\nCOPY . .\nRUN pip install -r requirements.txt\nEXPOSE 8080\nCMD ["python", "app.py", "--serve"]\n';
const MDK_DF4 = 'FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE 8080\nCMD ["python", "app.py", "--serve"]\n';
const MDK_DF6 = 'FROM python:3.12 AS builder\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir --prefix=/install -r requirements.txt\n\nFROM python:3.12-slim\nWORKDIR /app\nCOPY --from=builder /install /usr/local\nCOPY . .\nEXPOSE 8080\nCMD ["python", "app.py", "--serve"]\n';
const MDK_DF7 = 'FROM python:3.12 AS builder\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir --prefix=/install -r requirements.txt\n\nFROM python:3.12-slim\nWORKDIR /app\nCOPY --from=builder /install /usr/local\nCOPY . .\nRUN useradd -m -u 1000 netauto && chown -R netauto /app\nUSER netauto\nEXPOSE 8080\nHEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD test -f /app/app.py || exit 1\nCMD ["python", "app.py", "--serve"]\n';
const MDK_COMPOSE = 'services:\n  app:\n    build: .\n    ports:\n      - "8080:8080"\n    environment:\n      LOG_LEVEL: INFO\n      REDIS_HOST: redis\n    depends_on:\n      - redis\n  redis:\n    image: redis:7\n    volumes:\n      - redis-data:/data\nvolumes:\n  redis-data:\n';

CHAPTERS.push({
  id: 'docker', icon: '🐳', title: 'Docker ve Container', sub: 'Dockerfile, image, container, registry, compose',
  missions: [
    { id: 'dk1', title: 'İlk Dockerfile', xp: 30,
      story: "netauto, ekibin inventory audit worker'ı. Şimdiye kadar herkesin laptop'unda farklı Python sürümüyle koşuyordu ve her hafta biri `bende çalışıyor` diyordu. Artık bir container image'ı olacak. Kaynak kod ~/netauto altında, app.py ve requirements.txt hazır.",
      task: "~/netauto içinde bir Dockerfile yaz. Base image `python:3.12-slim` olsun, WORKDIR /app, kodu COPY ile al, requirements.txt'i pip ile kur ve CMD olarak `python app.py --serve` çalışsın. Sonra `docker build -t netauto:1.0.0 .` ile build et.",
      hint: "`FROM python:3.12-slim`, `WORKDIR /app`, `COPY . .`, `RUN pip install -r requirements.txt`, `CMD [\"python\", \"app.py\", \"--serve\"]`. Build komutunu ~/netauto içinde çalıştır, sondaki nokta build context demek.",
      solution: 'cd ~/netauto\nnano Dockerfile\ndocker build -t netauto:1.0.0 .',
      editorContent: { Dockerfile: MDK_DF1 },
      setup: mdkSetup,
      check: sh => { const img = mdkImage(sh, 'netauto:1.0.0'); if (!img || !img.lab) return false; const cmd = (img.config.Cmd || []).join(' '); return /^python:3\.12/.test(img.base || '') && /app\.py/.test(cmd) && img.config.WorkingDir === '/app' && !!img.files['app/app.py'] && !!img.pipInstalled; } },
    { id: 'dk2', title: 'Port ve environment', xp: 30,
      story: "Image hazır ama image tek başına hiçbir şey yapmaz, container çalışır. netauto 8080 portunda job bekler ve log seviyesini LOG_LEVEL environment variable'ından okur. Ekip ilk denemede DEBUG seviyesi istiyor.",
      task: "`netauto:1.0.0` image'ından netauto adında, arka planda çalışan bir container başlat. Host 8080 portunu container 8080'e map et ve LOG_LEVEL=DEBUG environment variable'ını ver. `docker ps` ile çalıştığını gör.",
      hint: "`docker run -d --name netauto -p 8080:8080 -e LOG_LEVEL=DEBUG netauto:1.0.0` yeter. -d detach, -p host ve container portu, -e key eşittir value.",
      solution: 'docker run -d --name netauto -p 8080:8080 -e LOG_LEVEL=DEBUG netauto:1.0.0\ndocker ps',
      setup: sh => { mdkSetup(sh); if (!mdkImage(sh, 'netauto:1.0.0')) { if (!sh.node(MDK_DIR + '/Dockerfile')) sh.writeFile(MDK_DIR + '/Dockerfile', MDK_DF1, false, 'setup'); sh.run(`cd ${MDK_DIR} && docker build -q -t netauto:1.0.0 .`); } },
      check: sh => { const c = mdkCont(sh, 'netauto'); if (!c || c.status !== 'running') return false; const b = c.ports['8080/tcp']; return !!(b && b[0].HostPort === '8080') && mdkEnv(c, 'LOG_LEVEL') === 'LOG_LEVEL=DEBUG' && mdkIsNetauto(sh, c); } },
    { id: 'dk3', title: 'Log ve exec', xp: 25,
      story: "Container çalışıyor ama içinde ne oluyor? Uygulama stdout'a yazdığı her satır container log'una düşer. Bazen de içeri girip environment'a ya da dosyalara bakmak gerekir. Bu iki refleks her debug seansının başlangıcı.",
      task: "netauto container'ının log'larını oku, sonra container içinde `env` komutunu çalıştırıp LOG_LEVEL'ın gerçekten DEBUG olduğunu gör. `ls /app` ile kodun container içindeki yerini de kontrol et.",
      hint: "docker logs netauto, docker exec netauto env, docker exec netauto ls /app. exec çalışan bir container ister.",
      solution: 'docker logs netauto\ndocker exec netauto env\ndocker exec netauto ls /app',
      setup: sh => { mdkSetup(sh); if (!mdkCont(sh, 'netauto')) { if (!mdkImage(sh, 'netauto:1.0.0')) { if (!sh.node(MDK_DIR + '/Dockerfile')) sh.writeFile(MDK_DIR + '/Dockerfile', MDK_DF1, false, 'setup'); sh.run(`cd ${MDK_DIR} && docker build -q -t netauto:1.0.0 .`); } sh.run('docker run -d --name netauto -p 8080:8080 -e LOG_LEVEL=DEBUG netauto:1.0.0'); } },
      check: sh => { const st = mdkState(sh); const c = mdkCont(sh, 'netauto'); return !!c && st.audit.logs.includes('netauto') && st.audit.exec.includes('netauto') && c.logs.some(l => /starting/.test(l.t)); } },
    { id: 'dk4', title: 'Layer cache sırası', xp: 40,
      story: "Her app.py değişikliğinde build iki dakika sürüyor çünkü pip install yeniden koşuyor. Sebep Dockerfile sırası. COPY . . satırı pip'ten önce olunca kod değişince o katman ve sonrası cache'den düşer. Önce requirements.txt kopyalanır, pip kurulur, kod en sona kalır.",
      task: "Dockerfile'ı düzenle, önce sadece requirements.txt COPY edilsin, ardından RUN pip install --no-cache-dir, kod en sonda COPY edilsin. Build et, sonra app.py'ye bir yorum satırı ekleyip tekrar build et. İkinci build'de pip adımı CACHED görünmeli.",
      hint: "Sıra FROM, WORKDIR, `COPY requirements.txt .`, `RUN pip install --no-cache-dir -r requirements.txt`, `COPY . .`, CMD. Değişiklik için `echo \"# cache test\" >> app.py` yeter.",
      solution: 'cd ~/netauto\nnano Dockerfile\ndocker build -t netauto:1.0.0 .\necho "# cache test" >> app.py\ndocker build -t netauto:1.0.0 .',
      editorContent: { Dockerfile: MDK_DF4 },
      setup: mdkSetup,
      check: sh => { const inst = mdkInst(sh); const iReq = inst.findIndex(l => /^COPY\s+(\.\/)?requirements\.txt/i.test(l)); const iPip = inst.findIndex(l => /^RUN\s+.*pip3?\s+install/i.test(l)); const iAll = inst.findIndex(l => /^COPY\s+\.\s+/i.test(l)); if (!(iReq >= 0 && iPip > iReq && iAll > iPip)) return false; const lb = mdkState(sh).lastBuild; if (!lb || !lb.tags.includes('netauto:1.0.0')) return false; const pip = lb.steps.find(s => /pip3?\s+install/.test(s.inst)); const copyAll = lb.steps.find(s => /^COPY\s+\.\s+/.test(s.inst)); return !!(pip && pip.cached && copyAll && !copyAll.cached); } },
    { id: 'dk5', title: '.dockerignore', xp: 30,
      story: "Build context'e bakınca .git dizini, __pycache__ ve test dosyaları da image'a giriyor. Context büyüdükçe build yavaşlar, image şişer, üstüne bir de .git içindeki geçmiş registry'ye gider. Git'in .gitignore'u gibi Docker'ın .dockerignore'u var.",
      task: "~/netauto içine bir .dockerignore yaz. .git, tests, __pycache__, *.md ve *.log context dışında kalsın. Sonra tekrar build et ve `docker exec` ile /app içinde tests dizininin artık olmadığını doğrula.",
      hint: "Satır satır pattern, örnek .git, tests, __pycache__, *.md, *.log. Build sonrası `docker rm -f netauto`, `docker run -d --name netauto -p 8080:8080 netauto:1.0.0`, `docker exec netauto ls /app`.",
      solution: 'cd ~/netauto\nnano .dockerignore\ndocker build -t netauto:1.0.0 .\ndocker rm -f netauto\ndocker run -d --name netauto -p 8080:8080 netauto:1.0.0\ndocker exec netauto ls /app',
      editorContent: { '.dockerignore': '.git\ntests\n__pycache__\n*.md\n*.log\n' },
      setup: sh => { mdkSetup(sh); sh.run(`mkdir -p ${MDK_DIR}/.git ${MDK_DIR}/__pycache__`); if (!sh.node(MDK_DIR + '/.git/HEAD')) sh.writeFile(MDK_DIR + '/.git/HEAD', 'ref: refs/heads/main\n', false, 'setup'); if (!sh.node(MDK_DIR + '/__pycache__/app.cpython-312.pyc')) sh.writeFile(MDK_DIR + '/__pycache__/app.cpython-312.pyc', 'PYC\u0000binary\n', false, 'setup'); if (!sh.node(MDK_DIR + '/debug.log')) sh.writeFile(MDK_DIR + '/debug.log', 'old debug output\n', false, 'setup'); },
      check: sh => { const n = sh.node(MDK_DIR + '/.dockerignore'); if (!n || n.t !== 'f') return false; const pats = n.d.split('\n').map(l => l.trim()).filter(Boolean); if (!pats.some(p => /^\.git\/?$/.test(p)) || !pats.some(p => /tests/.test(p)) || !pats.some(p => /__pycache__/.test(p))) return false; const img = mdkImage(sh, 'netauto:1.0.0'); return !!img && !Object.keys(img.files).some(k => /^app\/(tests\/|\.git\/|__pycache__)/.test(k)) && !!img.files['app/app.py']; } },
    { id: 'dk6', title: 'Multi-stage ve image diyeti', xp: 45,
      story: "Bir bağımlılık derleme için gcc istiyor, biri de bu yüzden base image'ı `python:3.12`'ye çevirmiş. Image 1GB'ı geçti, registry'ye push 10 dakika. Çözüm multi-stage build, derleme işi şişman bir builder stage'de olsun, final image slim base üstüne sadece kurulu paketleri alsın.",
      task: "Dockerfile'ı iki stage yap. İlk stage `python:3.12` AS builder, requirements'ı `pip install --no-cache-dir --prefix=/install` ile kursun. İkinci stage `python:3.12-slim`, `COPY --from=builder /install /usr/local` ile paketleri alsın, kodu kopyalasın. `netauto:1.1.0` olarak build et ve `docker images` ile boyutları karşılaştır.",
      hint: "İki FROM satırı, ilkinde AS builder. Final stage'de COPY --from=builder /install /usr/local. Boyut 200MB'ın altında kalmalı, `python:3.12` base kullanan tek stage 1GB üstü olurdu.",
      solution: 'cd ~/netauto\nnano Dockerfile\ndocker build -t netauto:1.1.0 .\ndocker images',
      editorContent: { Dockerfile: MDK_DF6 },
      setup: mdkSetup,
      check: sh => { const img = mdkImage(sh, 'netauto:1.1.0'); if (!img || !img.lab) return false; const df = img.dockerfile || ''; const froms = df.split('\n').filter(l => /^\s*FROM\s/i.test(l)); return froms.length >= 2 && /COPY\s+--from=/i.test(df) && /^python:3\.1\d-slim/.test(img.base || '') && img.size < 250000000 && /--no-cache-dir/.test(df) && !!img.files['app/app.py']; } },
    { id: 'dk7', title: 'Root olmayan USER ve HEALTHCHECK', xp: 40,
      story: "Security review'dan iki madde döndü. Birincisi container root olarak çalışıyor, bir açıkta host'a sıçrama riski. İkincisi orchestrator container'ın sağlıklı olup olmadığını bilmiyor, process ayakta ama uygulama donmuş olabilir. Her ikisi de Dockerfile'da çözülür.",
      task: "Dockerfile'a RUN useradd -m netauto ve USER netauto ekle, ayrıca bir HEALTHCHECK tanımla. `netauto:1.2.0` olarak build et, eski netauto container'ını kaldırıp bu image'dan yeniden başlat. `docker ps` çıktısında healthy görene kadar birkaç kez bak, `docker exec netauto whoami` root dönmemeli.",
      hint: "`RUN useradd -m netauto && chown -R netauto /app` ardından `USER netauto`. Healthcheck için `HEALTHCHECK --interval=30s --timeout=3s CMD test -f /app/app.py || exit 1` satırı. USER satırı CMD'den önce olmalı.",
      solution: 'cd ~/netauto\nnano Dockerfile\ndocker build -t netauto:1.2.0 .\ndocker rm -f netauto\ndocker run -d --name netauto -p 8080:8080 netauto:1.2.0\ndocker ps\ndocker exec netauto whoami\ndocker ps',
      editorContent: { Dockerfile: MDK_DF7 },
      setup: mdkSetup,
      check: sh => { const img = mdkImage(sh, 'netauto:1.2.0'); if (!img || !img.lab) return false; const u = (img.config.User || '').split(':')[0]; if (!u || u === 'root' || u === '0') return false; const hc = img.config.Healthcheck; if (!hc || !hc.Test || hc.Test[0] === 'NONE') return false; const c = mdkCont(sh, 'netauto'); return !!c && c.status === 'running' && c.imageId === img.id && c.health === 'healthy'; } },
    { id: 'dk8', title: "Registry'ye push", xp: 35,
      story: "Image laptop'ta kaldığı sürece kimse kullanamaz. Ekibin kendi registry'si registry.lab, kullanıcı adı burak, parola ekip vault'unda, lab için netops123. Push etmek için image'ı registry adıyla etiketlemek gerekir, docker tag bunun için var.",
      task: "registry.lab'a login ol, `netauto:1.2.0` image'ını `registry.lab/netauto:1.0.0` olarak etiketle ve push et. Ardından `curl -s https://registry.lab/v2/netauto/tags/list` ile registry'de göründüğünü doğrula.",
      hint: "`docker login registry.lab -u burak -p netops123`, `docker tag netauto:1.2.0 registry.lab/netauto:1.0.0`, `docker push registry.lab/netauto:1.0.0`. Login olmadan push no basic auth credentials der.",
      solution: 'docker login registry.lab -u burak -p netops123\ndocker tag netauto:1.2.0 registry.lab/netauto:1.0.0\ndocker push registry.lab/netauto:1.0.0\ncurl -s https://registry.lab/v2/netauto/tags/list',
      setup: sh => { mdkSetup(sh); if (!mdkImage(sh, 'netauto:1.2.0')) { sh.writeFile(MDK_DIR + '/Dockerfile', MDK_DF7, false, 'setup'); sh.run(`cd ${MDK_DIR} && docker build -q -t netauto:1.2.0 .`); } },
      check: sh => { const st = mdkState(sh); const rec = st.registry['registry.lab/netauto:1.0.0']; return !!rec && !!rec.lab && !!(rec.files && rec.files['app/app.py']) && !!st.auth['registry.lab']; } },
    { id: 'dk9', title: 'Volume ile config ve veri', xp: 35,
      story: "netauto audit raporlarını /app/data altına yazıyor ve container silinince raporlar gidiyor. Ayrıca her ortam için farklı config/settings.yaml lazım, image'ı yeniden build etmeden. Named volume kalıcı veri için, bind mount host'taki dosyayı içeri vermek için.",
      task: "netauto-data adında bir volume oluştur. netauto-vol adında yeni bir container başlat, netauto-data volume'unu /app/data'ya, host'taki ~/netauto/config dizinini de read-only olarak /app/config'e bağla. `docker inspect` ile Mounts bölümünü incele.",
      hint: "`docker volume create netauto-data`, sonra `docker run -d --name netauto-vol -v netauto-data:/app/data -v ~/netauto/config:/app/config:ro netauto:1.2.0`. Bind mount için path mutlak olmalı, ~ ile başlayan path de olur.",
      solution: 'docker volume create netauto-data\ndocker run -d --name netauto-vol -v netauto-data:/app/data -v ~/netauto/config:/app/config:ro netauto:1.2.0\ndocker inspect --format "{{json .Mounts}}" netauto-vol',
      setup: sh => { mdkSetup(sh); if (!mdkImage(sh, 'netauto:1.2.0')) { sh.writeFile(MDK_DIR + '/Dockerfile', MDK_DF7, false, 'setup'); sh.run(`cd ${MDK_DIR} && docker build -q -t netauto:1.2.0 .`); } },
      check: sh => { const st = mdkState(sh); if (!st.volumes.some(v => v.name === 'netauto-data')) return false; const c = st.containers.find(x => x.status === 'running' && x.mounts.some(m => m.Type === 'volume' && m.Name === 'netauto-data' && m.Destination === '/app/data') && x.mounts.some(m => m.Type === 'bind' && m.Source === MDK_DIR + '/config' && m.Destination === '/app/config' && !m.RW)); return !!c && mdkIsNetauto(sh, c); } },
    { id: 'dk10', title: 'İki container bir network', xp: 40,
      story: "netauto job kuyruğu için Redis kullanacak. Redis de bir container olacak ama default bridge network'te container'lar birbirini isimle bulamaz, IP ezberlemek de yol değil. Kullanıcı tanımlı bir network'te Docker'ın DNS'i container adını çözer.",
      task: "netauto-net adında bir network oluştur. redis adında bir `redis:7` container'ını bu network'te başlat. Sonra netauto-app adıyla netauto image'ını aynı network'te, REDIS_HOST=redis environment'ı ile başlat. `docker exec netauto-app ping -c 1 redis` ile isim çözümlemesini kanıtla ve log'larda cache backend satırını gör.",
      hint: "`docker network create netauto-net`, `docker run -d --name redis --network netauto-net redis:7`, `docker run -d --name netauto-app --network netauto-net -e REDIS_HOST=redis netauto:1.2.0`.",
      solution: 'docker network create netauto-net\ndocker run -d --name redis --network netauto-net redis:7\ndocker run -d --name netauto-app --network netauto-net -e REDIS_HOST=redis netauto:1.2.0\ndocker exec netauto-app ping -c 1 redis\ndocker logs netauto-app',
      setup: sh => { mdkSetup(sh); if (!mdkImage(sh, 'netauto:1.2.0')) { sh.writeFile(MDK_DIR + '/Dockerfile', MDK_DF7, false, 'setup'); sh.run(`cd ${MDK_DIR} && docker build -q -t netauto:1.2.0 .`); } },
      check: sh => { const st = mdkState(sh); const net = st.networks.find(n => n.name === 'netauto-net'); if (!net) return false; const redis = st.containers.find(c => c.status === 'running' && c.network === 'netauto-net' && /^redis/.test(c.image)); const app = st.containers.find(c => c.status === 'running' && c.network === 'netauto-net' && mdkEnv(c, 'REDIS_HOST') === 'REDIS_HOST=redis' && mdkIsNetauto(sh, c)); return !!redis && !!app && redis.name === 'redis' && app.logs.some(l => /cache backend redis at redis:6379/.test(l.t)); } },
    { id: 'dk11', title: 'Compose ile app ve redis', xp: 45,
      story: "İki container'ı elle başlatmak her seferinde beş komut, üstüne network ve volume. Ekip arkadaşının da aynı ortamı tek komutla kaldırması lazım. Docker Compose bu tarifi bir YAML dosyasına yazar, `docker compose up -d` gerisini halleder.",
      task: "~/netauto içine bir compose.yaml yaz. app servisi bu dizinden build edilsin, 8080 portunu yayınlasın, LOG_LEVEL ve REDIS_HOST=redis environment'ı alsın ve redis servisine depends_on ile bağlansın. redis servisi `redis:7` image'ını kullansın ve verisini bir named volume'da tutsun. Önceki netauto container'larını kaldırıp `docker compose up -d` ile ayağa kaldır, `docker compose ps` ile bak.",
      hint: "services altında app ve redis. app için `build: .` ve `ports` altında `\"8080:8080\"`. Portu önce boşalt, `docker rm -f netauto netauto-app redis`. Compose container'ları netauto-app-1 ve netauto-redis-1 adını alır.",
      solution: 'cd ~/netauto\nnano compose.yaml\ndocker rm -f netauto netauto-app redis netauto-vol\ndocker compose up -d\ndocker compose ps',
      editorContent: { 'compose.yaml': MDK_COMPOSE },
      setup: sh => { mdkSetup(sh); if (!sh.node(MDK_DIR + '/Dockerfile')) sh.writeFile(MDK_DIR + '/Dockerfile', MDK_DF7, false, 'setup'); },
      check: sh => { const st = mdkState(sh); const app = st.containers.find(c => c.compose && c.compose.service === 'app' && c.status === 'running'); const redis = st.containers.find(c => c.compose && c.compose.service === 'redis' && c.status === 'running' && /^redis/.test(c.image)); if (!app || !redis) return false; if (app.compose.project !== redis.compose.project) return false; const net = st.networks.find(n => n.name === app.compose.project + '_default'); return !!net && mdkEnv(app, 'REDIS_HOST') === 'REDIS_HOST=redis' && !!app.ports['8080/tcp'] && mdkIsNetauto(sh, app) && redis.mounts.some(m => m.Type === 'volume'); } },
    { id: 'dk12', title: 'Exit code 1', xp: 40,
      story: "Gece deploy edilen netauto-prod container'ı sabah çalışmıyor. `docker ps` boş, kimse bir şey görmüyor. Çalışmayan container'lar listeden düşer ama silinmez, -a ile görünür. Exit code ve log'lar neden çıktığını söyler, inspect ise nasıl başlatıldığını.",
      task: "netauto-prod container'ının neden durduğunu bul. `docker ps -a`, `docker logs netauto-prod` ve `docker inspect` ile exit code'a ve environment'a bak. Hatalı değeri tespit et, container'ı kaldır ve aynı isimle doğru environment ile yeniden başlat. Sonunda netauto-prod çalışır durumda olmalı.",
      hint: "`docker inspect --format '{{.State.ExitCode}} {{.Config.Env}}' netauto-prod`. Uygulama geçerli LOG_LEVEL değerlerini log'da yazıyor. `docker rm netauto-prod` sonra `docker run -d --name netauto-prod -p 8081:8080 -e LOG_LEVEL=INFO netauto:1.2.0`.",
      solution: 'docker ps -a\ndocker logs netauto-prod\ndocker inspect --format "{{.State.ExitCode}} {{.Config.Env}}" netauto-prod\ndocker rm netauto-prod\ndocker run -d --name netauto-prod -p 8081:8080 -e LOG_LEVEL=INFO netauto:1.2.0\ndocker ps',
      setup: sh => { mdkSetup(sh); if (!mdkImage(sh, 'netauto:1.2.0')) { sh.writeFile(MDK_DIR + '/Dockerfile', MDK_DF7, false, 'setup'); sh.run(`cd ${MDK_DIR} && docker build -q -t netauto:1.2.0 .`); } if (!mdkCont(sh, 'netauto-prod')) sh.run('docker run -d --name netauto-prod -p 8081:8080 -e LOG_LEVEL=verbose netauto:1.2.0'); const st = mdkState(sh); st.audit.logs = st.audit.logs.filter(n => n !== 'netauto-prod'); SIMDK_save(sh, st); },
      check: sh => { const st = mdkState(sh); const c = mdkCont(sh, 'netauto-prod'); if (!c || c.status !== 'running' || c.exitCode !== 0) return false; const lv = (mdkEnv(c, 'LOG_LEVEL') || 'LOG_LEVEL=INFO').split('=')[1]; return ['DEBUG', 'INFO', 'WARNING', 'ERROR'].includes(lv) && mdkIsNetauto(sh, c) && st.audit.logs.includes('netauto-prod'); } },
  ],
});

QUIZ.push(
  { q: 'Dockerfile\'da hangi talimat sırası pip install katmanının cache\'den gelmesini sağlar?', a: ['COPY requirements.txt, RUN pip install, sonra COPY . .', 'COPY . . sonra RUN pip install', 'RUN pip install sonra COPY requirements.txt', 'Sıra önemsiz, BuildKit hepsini cache\'ler'], c: 0 },
  { q: 'docker run -p 8080:80 ne anlama gelir?', a: ['Host 8080 portu container 80 portuna gider', 'Container 8080 portu host 80 portuna gider', 'İki portu da host\'ta açar', 'Sadece localhost\'tan 80\'e izin verir'], c: 0 },
  { q: 'Exited (1) durumundaki bir container\'ın neden çıktığını ilk nereden anlarsın?', a: ['docker logs ile stdout ve stderr\'den', 'docker images çıktısından', 'docker network inspect ile', 'docker volume ls ile'], c: 0 },
  { q: 'Multi-stage build\'in ana faydası nedir?', a: ['Derleme araçları final image\'a girmez, image küçülür', 'Container daha hızlı başlar', 'Birden fazla CMD çalıştırılabilir', 'Registry login gerekmez'], c: 0 },
  { q: 'Kullanıcı tanımlı bir bridge network\'te container\'lar birbirine nasıl ulaşır?', a: ['Container adı DNS ile çözülür', 'Sadece IP ile', 'Sadece --link ile', 'Ulaşamaz, host network gerekir'], c: 0 },
  { q: 'docker push registry.lab/netauto:1.0.0 için önce ne gerekir?', a: ['Image\'ın o isimle tag\'lenmesi ve docker login', 'docker compose up', 'Container\'ın çalışıyor olması', 'docker system prune'], c: 0 },
  { q: '.dockerignore ne yapar?', a: ['Build context\'e girecek dosyaları filtreler', 'Container içinde dosya siler', 'Image katmanlarını sıkıştırır', 'Registry\'de tag gizler'], c: 0 },
  { q: 'HEALTHCHECK başarısız olunca docker ps STATUS sütununda ne görünür?', a: ['(unhealthy)', 'Exited (1)', 'Restarting', 'Paused'], c: 0 },
);
