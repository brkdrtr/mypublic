'use strict';
/* CI ve CD Pipeline bolumu. Kosucu sim-ci.js, durum LAB.ci.last ve SIMC_STATE. Deploy hedefi api.lab, durum SIMA_STORE.
   Proje /home/burak/netauto, setup(sh) ile yazilir. Bu build'de git init desteklenmez, ext-git tek repo ile calisir,
   bu yuzden proje repo'suz duz dosya olarak gelir ve hikayede bu belirtilir. */

const MC_R = '/home/burak/netauto';
const MC_WF = MC_R + '/.github/workflows/ci.yml';
const MC_read = (sh, p) => { const n = sh.node(p); return n && n.t === 'f' ? n.d : null; };
const MC_has = (sh, p, re) => { const d = MC_read(sh, p); return d !== null && (re instanceof RegExp ? re.test(d) : d.includes(re)); };
const MC_last = () => (typeof LAB !== 'undefined' && LAB.ci && LAB.ci.last) || null;
const MC_job = (run, re) => run ? run.jobs.find(j => re.test(j.name) || re.test(j.id)) : null;
const MC_stepOut = (run, re) => run ? run.jobs.some(j => j.steps.some(s => re.test(s.out || ''))) : false;
const MC_write = (sh, rel, text, force) => { const abs = MC_R + '/' + rel; if (force || !sh.node(abs)) { const dir = abs.slice(0, abs.lastIndexOf('/')); if (!sh.node(dir)) sh.run('mkdir -p ' + dir); sh.writeFile(abs, text, false, 'nano'); } };

const MC_FILES = {
  'pyproject.toml': `[project]
name = "netauto"
version = "1.2.0"
description = "NOC icin show komutu parser'lari ve inventory yardimcilari"
requires-python = ">=3.11"
dependencies = ["requests", "pyyaml"]

[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]
`,
  'requirements.txt': `pytest
requests
pyyaml
`,
  'README.md': `# netauto

Network automation ekibinin ortak Python paketi. NOC'un kullandigi show komutu parser'lari burada yasar.

- src/netauto/parser.py, show ip interface brief ve show version parser'lari
- src/netauto/version.py, paket surumu, deploy bu degeri kullanir
- tests/, pytest testleri
- scripts/lint.py, scripts/build.py, kucuk lint ve paketleme araclari
- deploy.py, api.lab uzerinde deploy ve rollback job'u acar
- Makefile, make test, make lint, make build

Not, bu lab build'inde git init yok, proje repo'suz duz dosya olarak gelir. CI runner dosyalari workspace olarak kullanir.
`,
  'Makefile': `.PHONY: test lint build clean

test:
\tpytest -q

lint:
\tpython3 -m compileall -q src
\tpython3 scripts/lint.py src

build:
\tpython3 scripts/build.py

clean:
\trm -rf dist
`,
  'src/netauto/__init__.py': `"""netauto, NOC parser'lari ve yardimcilar."""
from .version import VERSION

__all__ = ['VERSION']
`,
  'src/netauto/version.py': `VERSION = '1.2.0'
`,
  'src/netauto/parser.py': `"""show komutu parser'lari. Girdi duz metin, cikti dict listesi."""


def parse_brief(text):
    """show ip interface brief ciktisini satir satir ayristirir."""
    rows = []
    for line in text.splitlines()[1:]:
        parts = line.split()
        if len(parts) < 6:
            continue
        rows.append({
            'interface': parts[0],
            'ip': parts[1],
            'status': ' '.join(parts[4:-1]),
            'protocol': parts[-1],
        })
    return rows


def up_interfaces(rows):
    """Hem status hem protocol up olan interface adlari."""
    return [r['interface'] for r in rows if r['status'] == 'up' and r['protocol'] == 'up']


def parse_version(text):
    """show version icinden hostname, model ve surumu ceker."""
    info = {}
    for line in text.splitlines():
        if line.startswith('Cisco IOS XE Software, Version'):
            info['version'] = line.split('Version')[-1].strip()
        elif ' uptime is ' in line:
            info['hostname'] = line.split(' uptime is ')[0].strip()
        elif line.startswith('cisco ') and 'processor' in line:
            info['model'] = line.split()[1]
    return info
`,
  'tests/test_parser.py': `from netauto.parser import parse_brief, parse_version, up_interfaces

BRIEF = """Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet1       10.0.0.1        YES NVRAM  up                    up
GigabitEthernet2       unassigned      YES unset  administratively down down
GigabitEthernet3       10.0.3.1        YES manual up                    down
"""

VERSION = """Cisco IOS XE Software, Version 17.09.04a
r1 uptime is 3 days, 4 hours, 12 minutes
cisco C8000V (VXE) processor (revision VXE) with 2071741K/3075K bytes of memory.
"""


def test_parse_brief_rows():
    rows = parse_brief(BRIEF)
    assert len(rows) == 3
    assert rows[0]['interface'] == 'GigabitEthernet1'


def test_parse_brief_status():
    rows = parse_brief(BRIEF)
    assert rows[0]['status'] == 'up'
    assert rows[1]['status'] == 'administratively down'
    assert rows[2]['protocol'] == 'down'


def test_up_interfaces():
    assert up_interfaces(parse_brief(BRIEF)) == ['GigabitEthernet1']


def test_parse_version():
    info = parse_version(VERSION)
    assert info['hostname'] == 'r1'
    assert info['model'] == 'C8000V'
    assert info['version'] == '17.09.04a'
`,
  'scripts/lint.py': `"""Minik lint. Trailing whitespace, tab, 120 karakterden uzun satir ve kutuphane kodunda print hata sayilir.
Kullanim, python3 scripts/lint.py src [tests]"""
import pathlib
import sys


def check_file(path):
    problems = []
    for lineno, line in enumerate(path.read_text().splitlines(), 1):
        if line != line.rstrip():
            problems.append((lineno, 'W291 trailing whitespace'))
        if '\\t' in line:
            problems.append((lineno, 'W191 tab indentation'))
        if len(line) > 120:
            problems.append((lineno, 'E501 line too long'))
        if line.lstrip().startswith('print(') and 'src' in path.parts:
            problems.append((lineno, 'T201 print in library code, use logging'))
    return problems


def main(paths):
    total = 0
    files = 0
    for root in paths:
        for f in sorted(pathlib.Path(root).rglob('*.py')):
            files += 1
            for lineno, msg in check_file(f):
                print(f'{f}:{lineno}: {msg}')
                total += 1
    print(f'lint: {files} file(s), {total} problem(s)')
    return 1 if total else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:] or ['src']))
`,
  'scripts/build.py': `"""Paketi dist/ altina tar olarak koyar ve SHA256SUMS yazar."""
import hashlib
import pathlib
import sys
import tarfile

sys.path.insert(0, 'src')
from netauto.version import VERSION  # noqa: E402

dist = pathlib.Path('dist')
dist.mkdir(exist_ok=True)
out = dist / f'netauto-{VERSION}.tar'
with tarfile.open(out, 'w') as tar:
    for p in sorted(pathlib.Path('src').rglob('*.py')):
        tar.add(p)
    tar.add('pyproject.toml')
digest = hashlib.sha256(out.read_bytes()).hexdigest()
(dist / 'SHA256SUMS').write_text(f'{digest}  {out.name}\\n')
print(f'built {out} ({out.stat().st_size} bytes) sha256 {digest[:12]}')
`,
  'scripts/version.py': `"""Paket surumunu basar, CI step output icin."""
import sys

sys.path.insert(0, 'src')
from netauto.version import VERSION  # noqa: E402

print(VERSION)
`,
  'deploy.py': `#!/usr/bin/env python3
"""netauto deploy araci. api.lab uzerinde deploy ya da rollback job'u acar ve bitene kadar bekler.

Ornekler
  python3 deploy.py --check
  python3 deploy.py --env staging
  python3 deploy.py --env production --version 1.2.0
  python3 deploy.py --env production --rollback --to 1.1.0

Kimlik API_USER ve API_PASSWORD environment variable'larindan okunur. CI'da secrets ile gelir, asla koda yazilmaz.
"""
import argparse
import os
import sys
import time

import requests

BASE = os.environ.get('API_URL', 'https://api.lab')


def request(session, method, path, **kw):
    """429'da Retry-After kadar bekler, 5xx'te ustel backoff uygular, 4xx'te HTTPError firlatir."""
    last = None
    for attempt in range(6):
        r = session.request(method, BASE + path, timeout=5, **kw)
        last = r
        if r.status_code == 429:
            time.sleep(int(r.headers.get('Retry-After', '1')))
            continue
        if r.status_code >= 500:
            time.sleep(0.5 * 2 ** attempt)
            continue
        r.raise_for_status()
        return r
    raise SystemExit(f'{method} {path} failed after retries, last status {last.status_code}')


def login(session):
    user = os.environ.get('API_USER', 'burak')
    password = os.environ.get('API_PASSWORD')
    if not password:
        print('API_PASSWORD environment variable yok. CI icin env bloguna API_PASSWORD: \${{ secrets.API_PASSWORD }} ekle', file=sys.stderr)
        sys.exit(2)
    tok = request(session, 'POST', '/v1/auth/token', json={'username': user, 'password': password}).json()['access_token']
    session.headers['Authorization'] = 'Bearer ' + tok
    return user


def read_version():
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(here, 'src'))
    from netauto.version import VERSION
    return VERSION


def main():
    p = argparse.ArgumentParser(prog='deploy.py', description='netauto deploy ve rollback')
    p.add_argument('--env', choices=['staging', 'production'])
    p.add_argument('--version', help='deploy edilecek surum, varsayilan src/netauto/version.py')
    p.add_argument('--rollback', action='store_true')
    p.add_argument('--to', help='rollback hedef surumu')
    p.add_argument('--check', action='store_true', help='sadece kimlik dogrula')
    a = p.parse_args()
    s = requests.Session()
    user = login(s)
    if a.check:
        me = request(s, 'GET', '/v1/me').json()
        print(f"auth ok as {me['username']} role {me['role']}")
        return 0
    if not a.env:
        p.error('--env staging ya da --env production gerekli')
    if a.rollback:
        if not a.to:
            p.error('--rollback icin --to <version> gerekli')
        job_type, version = 'rollback', a.to
    else:
        job_type, version = 'deploy', a.version or read_version()
    print(f'{job_type} {version} to {a.env} requested by {user}')
    job = request(s, 'POST', '/v1/jobs', json={'type': job_type, 'params': {'env': a.env, 'version': version}}).json()
    print(f"job {job['id']} {job['status']}")
    while job['status'] not in ('done', 'failed', 'cancelled'):
        time.sleep(0.5)
        job = request(s, 'GET', f"/v1/jobs/{job['id']}").json()
        print(f"job {job['id']} {job['status']}")
    if job['status'] != 'done':
        print(f"job {job['id']} ended with {job['status']}", file=sys.stderr)
        return 1
    after = request(s, 'GET', f'/v1/deployments/{a.env}').json()
    print(f"{job_type} {version} to {a.env} done, {a.env} now {after['version']}, previous {after.get('previous')}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
`,
};
const MC_SECRETS = `# CI secrets, GitHub'da Settings > Secrets, GitLab'da CI/CD Variables karsiligi. Bu dosya repo'ya girmez.
API_PASSWORD=lab123
SLACK_WEBHOOK=https://hooks.lab/services/T0NETOPS/B0CI/x9z8y7
`;
const MC_PARSER_BROKEN = MC_FILES['src/netauto/parser.py'].replace("'status': ' '.join(parts[4:-1]),", "'status': parts[3],");

function MC_project(sh, opts) {
  opts = opts || {};
  if (!sh.node(MC_R)) sh.run('mkdir -p ' + MC_R);
  Object.entries(MC_FILES).forEach(([rel, text]) => MC_write(sh, rel, text, opts.force));
  if (!sh.node(MC_R + '/.github/workflows')) sh.run('mkdir -p ' + MC_R + '/.github/workflows');
  if (!sh.node('/home/burak/.ci/secrets.env')) { sh.run('mkdir -p ~/.ci'); sh.writeFile('/home/burak/.ci/secrets.env', MC_SECRETS, false, 'nano'); }
  if (opts.workflow && !sh.node(MC_WF)) sh.writeFile(MC_WF, opts.workflow, false, 'nano');
  if (typeof SIMA_STORE !== 'undefined') { SIMA_STORE.rl.times = []; SIMA_STORE.rl.enabled = true; }
}

/* workflow asamalari, her gorev bir oncekinin ustune koyar */
const MC_WF1 = `name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: pip install pytest pyyaml requests
      - name: Run tests
        run: pytest -q
`;
const MC_WF2 = `name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Compile check
        run: python3 -m compileall -q src
      - name: Lint
        run: python3 scripts/lint.py src tests

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: pip install pytest pyyaml requests
      - name: Run tests
        run: pytest -q

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build package
        run: python3 scripts/build.py
`;
const MC_WF3 = `name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Compile check
        run: python3 -m compileall -q src
      - name: Lint
        run: python3 scripts/lint.py src tests

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12', '3.13']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python-version }}
      - uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: \${{ runner.os }}-pip-\${{ hashFiles('requirements.txt') }}
          restore-keys: |
            \${{ runner.os }}-pip-
      - name: Install dependencies
        run: pip install pytest pyyaml requests
      - name: Run tests
        run: pytest -q

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build package
        run: python3 scripts/build.py
`;
const MC_WF5 = MC_WF3.replace('on: [push, pull_request]\n', `on:
  push:
    branches: [main]
  pull_request:
`);
const MC_WF6 = MC_WF5 + `
  verify-api:
    needs: [lint, test]
    runs-on: ubuntu-latest
    env:
      API_USER: burak
      API_PASSWORD: \${{ secrets.API_PASSWORD }}
    steps:
      - uses: actions/checkout@v4
      - name: Check api.lab credentials
        run: python3 deploy.py --check
`;
const MC_WF7 = MC_WF6.replace(`  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build package
        run: python3 scripts/build.py
`, `  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    outputs:
      version: \${{ steps.ver.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - name: Read version
        id: ver
        run: echo "version=$(python3 scripts/version.py)" >> "$GITHUB_OUTPUT"
      - name: Build package
        run: |
          echo "building netauto \${{ steps.ver.outputs.version }}"
          python3 scripts/build.py
`);
const MC_WF8 = MC_WF7.replace(`          python3 scripts/build.py
`, `          python3 scripts/build.py
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  package-check:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist
      - name: Verify checksum
        run: python3 -c "import hashlib, pathlib; d = pathlib.Path('dist'); line = (d / 'SHA256SUMS').read_text().split(); print('ok' if hashlib.sha256((d / line[1]).read_bytes()).hexdigest() == line[0] else 'mismatch')"
`);
const MC_WF9 = MC_WF8 + `
  deploy-staging:
    needs: [build, verify-api]
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    env:
      API_USER: burak
      API_PASSWORD: \${{ secrets.API_PASSWORD }}
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: python3 deploy.py --env staging --version \${{ needs.build.outputs.version }}
`;
const MC_WF10 = MC_WF9.replace(`on:
  push:
    branches: [main]
  pull_request:
`, `on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
`) + `
  deploy-production:
    needs: [deploy-staging, build]
    environment: production
    runs-on: ubuntu-latest
    env:
      API_USER: burak
      API_PASSWORD: \${{ secrets.API_PASSWORD }}
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: python3 deploy.py --env production --version \${{ needs.build.outputs.version }}
`;
const MC_GITLAB = `stages: [lint, test, build, deploy]

variables:
  PIP_DISABLE_PIP_VERSION_CHECK: "1"
  API_USER: burak

default:
  before_script:
    - python3 --version
    - pip install pytest pyyaml requests

lint:
  stage: lint
  script:
    - python3 -m compileall -q src
    - python3 scripts/lint.py src tests

test:
  stage: test
  script:
    - pytest -q

build:
  stage: build
  script:
    - python3 scripts/build.py
  artifacts:
    paths:
      - dist/

deploy_staging:
  stage: deploy
  script:
    - python3 deploy.py --env staging
  only:
    - main

deploy_production:
  stage: deploy
  script:
    - python3 deploy.py --env production
  only:
    - main
  when: manual
`;
const MC_ROLLBACK = `name: Rollback
on:
  workflow_dispatch:
    inputs:
      version:
        description: Geri donulecek surum
        required: true
      environment:
        description: Hedef ortam
        default: production

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: \${{ inputs.environment }}
    env:
      API_USER: burak
      API_PASSWORD: \${{ secrets.API_PASSWORD }}
    steps:
      - uses: actions/checkout@v4
      - name: Show current deployment
        run: curl -s https://api.lab/v1/deployments/\${{ inputs.environment }}
      - name: Roll back
        run: python3 deploy.py --env \${{ inputs.environment }} --rollback --to \${{ inputs.version }}
      - name: Notify
        if: always()
        run: echo "rollback of \${{ inputs.environment }} to \${{ inputs.version }} finished with \${{ job.status }}"
`;

CHAPTERS.push({
  id: 'ci', icon: '🚦', title: 'CI ve CD Pipeline', sub: 'GitHub Actions, matrix, secrets, artifacts, deploy gate, GitLab CI, rollback',
  missions: [
    { id: 'ci1', title: 'İlk workflow', xp: 30,
      story: "netauto, NOC'un kullandığı parser paketin. Geçen hafta bir merge testleri kırdı ve kimse fark etmedi. Artık her push'ta testler otomatik koşacak. GitHub Actions workflow'u .github/workflows altında YAML ile tanımlanır, lab'da `ci run` onu GitHub log formatında çalıştırır. Bu build'de git init yok, proje duz dosya olarak hazır.",
      task: "nano ile ~/netauto/.github/workflows/ci.yml yaz. name CI, on push ve pull_request, test adında bir job. Adımlar actions/checkout@v4, actions/setup-python@v5 python-version 3.12, `pip install pytest pyyaml requests` ve `pytest -q`. Sonra `cd ~/netauto && ci run` ile çalıştır.",
      hint: "jobs altında test, runs-on ubuntu-latest, steps listesinde uses ve run anahtarları. with altında python-version tırnak içinde yazılır, 3.10 sayı olarak 3.1 okunur.",
      solution: 'nano ~/netauto/.github/workflows/ci.yml\ncd ~/netauto && ci run',
      setup: sh => MC_project(sh),
      editorContent: { '~/netauto/.github/workflows/ci.yml': MC_WF1 },
      check: (sh, c) => { const r = MC_last(); const j = MC_job(r, /^test\b/); return !!r && r.kind === 'github' && r.status === 'success' && !!j && j.status === 'success' && j.steps.some(s => s.uses && s.uses.startsWith('actions/checkout')) && j.steps.some(s => s.uses && s.uses.startsWith('actions/setup-python')) && j.steps.some(s => s.run && /pytest/.test(s.run) && /passed/.test(s.out)) && MC_has(sh, MC_WF, /pull_request/); } },
    { id: 'ci2', title: 'Lint ve build, needs ile sıra', xp: 40,
      story: "Testler koşuyor ama bozuk indent ve 200 karakterlik satırlar review'da zaman yiyor. Lint ayrı bir job olsun ve test ile paralel koşsun, build ikisi de yeşilse başlasın. needs anahtarı job'lar arası bağımlılığı kurar, biri kırılırsa build hiç başlamaz.",
      task: "ci.yml'e lint job'u ekle, adımları `python3 -m compileall -q src` ve `python3 scripts/lint.py src tests`. build job'u needs ile lint ve test'e bağlı olsun ve `python3 scripts/build.py` çalıştırsın. `cd ~/netauto && ci run` ile üçünün de yeşil olduğunu gör.",
      hint: "`needs: [lint, test]` yazımı iki job'a birden bağlar. build adımı dist/netauto-1.2.0.tar üretir. make lint ve make build da aynı işi yapar.",
      solution: 'nano ~/netauto/.github/workflows/ci.yml\ncd ~/netauto && ci run',
      setup: sh => MC_project(sh, { workflow: MC_WF1 }),
      editorContent: { '~/netauto/.github/workflows/ci.yml': MC_WF2 },
      check: (sh, c) => { const r = MC_last(); if (!r || r.status !== 'success') return false; const lint = MC_job(r, /^lint$/), test = MC_job(r, /^test\b/), build = MC_job(r, /^build$/); return !!lint && !!test && !!build && lint.status === 'success' && build.status === 'success' && build.needs.includes('lint') && build.needs.includes('test') && r.jobs.indexOf(build) > r.jobs.indexOf(lint) && lint.steps.some(s => /lint\.py/.test(s.run || '')) && !!sh.node(MC_R + '/dist/netauto-1.2.0.tar'); } },
    { id: 'ci3', title: 'Matrix ve cache', xp: 45,
      story: "NOC sunucuları Python 3.11, geliştirici laptop'ları 3.13. Tek sürümde test etmek yetmez. strategy.matrix aynı job'u her sürüm için ayrı koşturur, ${{ matrix.python-version }} ifadesi her kopyada farklı değer alır. actions/cache pip indirmelerini saklar, key içinde hashFiles ile requirements.txt değişince cache de yenilenir.",
      task: "test job'una python-version 3.11, 3.12 ve 3.13 değerleriyle matrix ekle, setup-python matrix değerini kullansın. Install adımından önce actions/cache@v4 ekle, path ~/.cache/pip, key `${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}`. `cd ~/netauto && ci run` ile üç test job'unu gör.",
      hint: "strategy altında matrix, onun altında python-version listesi. İfadeler YAML'da tırnak gerektirmez ama değer listesi tırnaklı olmalı. İlk koşumda cache miss, ikincisinde hit görürsün.",
      solution: 'nano ~/netauto/.github/workflows/ci.yml\ncd ~/netauto && ci run',
      setup: sh => MC_project(sh, { workflow: MC_WF2 }),
      editorContent: { '~/netauto/.github/workflows/ci.yml': MC_WF3 },
      check: (sh, c) => { const r = MC_last(); if (!r || r.status !== 'success') return false; const tests = r.jobs.filter(j => j.id === 'test'); return tests.length === 3 && ['3.11', '3.12', '3.13'].every(v => tests.some(j => j.status === 'success' && j.matrix && String(j.matrix['python-version']) === v && j.steps.some(s => s.uses && s.uses.startsWith('actions/setup-python') && s.with && String(s.with['python-version']) === v))) && tests.every(j => j.steps.some(s => s.uses && s.uses.startsWith('actions/cache') && s.with && /^Linux-pip-[0-9a-f]{16,}$/.test(String(s.with.key)))) && MC_has(sh, MC_WF, /hashFiles\(/); } },
    { id: 'ci4', title: 'Kırık test', xp: 40,
      story: "Bir arkadaşın parser'da status sütununu yanlış indeksle okudu ve push etti. CI tam da bunun için var. Önce pipeline'ın kırmızıya döndüğünü gör, exit code'u ve pytest çıktısını oku, sonra hatayı düzelt ve yeşile çevir. Log'u okumadan düzeltmeye kalkma.",
      task: "Önce `cd ~/netauto && ci run` ile hatayı gör. src/netauto/parser.py içindeki status alanını düzelt, status sütunu parts[4] ile sondan bir önceki sütun arasındaki kelimelerdir, `' '.join(parts[4:-1])`. Sonra tekrar `cd ~/netauto && ci run` ile yeşil al.",
      hint: "pytest çıktısındaki assert satırı sana NVRAM diyecek, yani Method sütunu okunmuş. administratively down iki kelime olduğu için join gerekir.",
      solution: 'cd ~/netauto && ci run\nnano ~/netauto/src/netauto/parser.py\ncd ~/netauto && ci run',
      setup: sh => { MC_project(sh, { workflow: MC_WF3 }); MC_write(sh, 'src/netauto/parser.py', MC_PARSER_BROKEN, true); },
      editorContent: { '~/netauto/src/netauto/parser.py': MC_FILES['src/netauto/parser.py'] },
      check: (sh, c) => { const r = MC_last(); const runs = (LAB.ci && LAB.ci.runs) || []; const failed = runs.some(x => x.kind === 'github' && x.status === 'failure' && x.jobs.some(j => j.id === 'test' && j.status === 'failure' && j.steps.some(s => /failed/.test(s.out || '')))); return !!r && r.status === 'success' && failed && r.jobs.filter(j => j.id === 'test').every(j => j.status === 'success') && MC_has(sh, MC_R + '/src/netauto/parser.py', /parts\[4:-1\]/) && !MC_has(sh, MC_R + '/src/netauto/parser.py', /parts\[3\],/); } },
    { id: 'ci5', title: 'Sadece main', xp: 35,
      story: "Herkesin feature branch'inde her push'ta tam pipeline koşunca runner kuyruğu şişti. Push tetikleyicisini main ile sınırla, pull_request tetikleyicisi feature branch'lerin PR açıldığında test edilmesini zaten sağlar. branches filtresi glob kabul eder, release/* gibi.",
      task: "on bloğunu push için branches main ve pull_request olacak şekilde yaz. `cd ~/netauto && ci run --ref refs/heads/feature/vlan-parser` ile atlandığını, sonra `cd ~/netauto && ci run --ref refs/heads/main` ile koştuğunu gör.",
      hint: "on altında push ve pull_request birer map olur, push altında branches listesi. --ref vermezsen varsayılan refs/heads/main.",
      solution: 'nano ~/netauto/.github/workflows/ci.yml\ncd ~/netauto && ci run --ref refs/heads/feature/vlan-parser\ncd ~/netauto && ci run --ref refs/heads/main',
      setup: sh => MC_project(sh, { workflow: MC_WF3 }),
      editorContent: { '~/netauto/.github/workflows/ci.yml': MC_WF5 },
      check: (sh, c) => { const r = MC_last(); const runs = (LAB.ci && LAB.ci.runs) || []; return !!r && r.status === 'success' && r.ref === 'refs/heads/main' && runs.some(x => x.status === 'skipped' && /feature\//.test(x.ref) && x.event === 'push') && MC_has(sh, MC_WF, /branches:\s*(\[\s*['"]?main['"]?\s*\]|\n\s*-\s*['"]?main['"]?)/) && MC_has(sh, MC_WF, /pull_request/); } },
    { id: 'ci6', title: 'Secrets', xp: 45,
      story: "Deploy adımı api.lab'a login olacak ve şifre YAML'a yazılmaz. GitHub'da repo Settings altında secret tanımlanır, workflow'da ${{ secrets.API_PASSWORD }} ile okunur ve log'da yıldızlarla maskelenir. Lab'da secret'lar ~/.ci/secrets.env dosyasından gelir. Secret'ı asla echo ile basma, maskeleme son savunma hattı, ilk savunma senin disiplinin.",
      task: "verify-api adında bir job ekle, lint ve test'e needs ile bağlı. env bloğunda API_USER burak ve API_PASSWORD `${{ secrets.API_PASSWORD }}`. Adımı `python3 deploy.py --check` olsun ve auth ok çıktısını ver. `cd ~/netauto && ci run` ile koş, `ci secrets` ile hangi secret'ların yüklü olduğuna bak.",
      hint: "Job seviyesinde env tüm adımlara geçer. deploy.py --check login olup /v1/me okur, şifreyi hiç basmaz. ci secrets komutu değerleri göstermez, sadece adları.",
      solution: 'nano ~/netauto/.github/workflows/ci.yml\ncd ~/netauto && ci run',
      setup: sh => MC_project(sh, { workflow: MC_WF5 }),
      editorContent: { '~/netauto/.github/workflows/ci.yml': MC_WF6 },
      check: (sh, c) => { const r = MC_last(); const j = MC_job(r, /verify/); const wf = MC_read(sh, MC_WF) || ''; return !!r && r.status === 'success' && !!j && j.status === 'success' && j.steps.some(s => /auth ok as (burak|\*\*\*) role netops/.test(s.out || '')) && /secrets\.API_PASSWORD/.test(wf) && !/echo[^\n]*(API_PASSWORD|secrets\.)/.test(wf) && !r.jobs.some(x => x.steps.some(s => /lab123/.test(s.out || ''))); } },
    { id: 'ci7', title: 'Step output ile sürüm', xp: 40,
      story: "Deploy hangi sürümü yükleyeceğini bilmeli ve bu bilgi tek yerden gelmeli, src/netauto/version.py. Bir adım değeri $GITHUB_OUTPUT dosyasına yazar, sonraki adımlar steps.id.outputs.ad ile okur, job outputs bloğu değeri diğer job'lara needs.job.outputs.ad olarak taşır.",
      task: "build job'una id'si ver olan bir adım ekle, `echo \"version=$(python3 scripts/version.py)\" >> \"$GITHUB_OUTPUT\"` çalıştırsın. Build adımında `echo \"building netauto ${{ steps.ver.outputs.version }}\"` bas. Job seviyesinde outputs bloğu ile version değerini dışarı ver. `cd ~/netauto && ci run` ile log'da building netauto 1.2.0 satırını gör.",
      hint: "outputs job'un altında, steps ile aynı seviyede. Çok satırlı run için | kullan. Lab log'unda job sonunda outputs version=1.2.0 yazar.",
      solution: 'nano ~/netauto/.github/workflows/ci.yml\ncd ~/netauto && ci run',
      setup: sh => MC_project(sh, { workflow: MC_WF6 }),
      editorContent: { '~/netauto/.github/workflows/ci.yml': MC_WF7 },
      check: (sh, c) => { const r = MC_last(); const b = MC_job(r, /^build$/); return !!r && r.status === 'success' && !!b && b.status === 'success' && b.outputs && b.outputs.version === '1.2.0' && b.steps.some(s => s.id === 'ver' && s.outputs && s.outputs.version === '1.2.0') && b.steps.some(s => /building netauto 1\.2\.0/.test(s.out || '')) && MC_has(sh, MC_WF, /GITHUB_OUTPUT/) && MC_has(sh, MC_WF, /steps\.ver\.outputs\.version/); } },
    { id: 'ci8', title: 'Artifact', xp: 40,
      story: "Build job'unun ürettiği dist/ paketi job bitince runner ile birlikte yok olur. actions/upload-artifact onu run'a bağlı olarak saklar, başka bir job actions/download-artifact ile indirir, release sayfasından da indirilebilir. Paket checksum'ı ayrı bir job'da doğrulanır ki build makinesi şüpheliyse fark edilsin.",
      task: "build job'unun sonuna actions/upload-artifact@v4 ekle, name dist, path dist/. package-check adında build'e bağlı yeni bir job yaz, actions/download-artifact@v4 ile dist'i indirsin ve SHA256SUMS dosyasındaki checksum'ı doğrulasın. `cd ~/netauto && ci run` ile artifact satırını log'da gör.",
      hint: "download-artifact with altında name ve path alır. Doğrulama için python3 -c ile hashlib.sha256 kullan, SHA256SUMS formatı `hash  dosya`.",
      solution: 'nano ~/netauto/.github/workflows/ci.yml\ncd ~/netauto && ci run',
      setup: sh => MC_project(sh, { workflow: MC_WF7 }),
      editorContent: { '~/netauto/.github/workflows/ci.yml': MC_WF8 },
      check: (sh, c) => { const r = MC_last(); const pc = MC_job(r, /package/); return !!r && r.status === 'success' && r.artifacts.some(a => a.name === 'dist' && a.files.includes('dist/netauto-1.2.0.tar') && a.files.includes('dist/SHA256SUMS')) && !!pc && pc.status === 'success' && pc.needs.includes('build') && pc.steps.some(s => s.uses && s.uses.startsWith('actions/download-artifact')) && pc.steps.some(s => /^ok$/m.test(s.out || '')); } },
    { id: 'ci9', title: 'Staging deploy', xp: 50,
      story: "Artık CD. main'e giren her değişiklik staging'e otomatik çıkar. deploy.py api.lab'da deploy job'u açar, pollar ve ortamın yeni sürümünü basar. Job yalnız main üzerinde ve push ile koşmalı, PR'da asla. Sürüm build job'unun output'undan gelir, iki yerde sürüm tutma.",
      task: "deploy-staging job'u ekle, needs build ve verify-api, if koşulu `github.ref == 'refs/heads/main' && github.event_name != 'pull_request'`. env'de API_USER ve API_PASSWORD secret'ı. Adım `python3 deploy.py --env staging --version ${{ needs.build.outputs.version }}`. `cd ~/netauto && ci run` ile staging'in 1.2.0 olduğunu gör, `api-lab jobs` ile job'u listele.",
      hint: "if job seviyesinde, needs ile aynı hizada. deploy.py 429 alırsa Retry-After kadar bekler, log'da job queued, running, done sırasını göreceksin. `curl -s https://api.lab/v1/deployments/staging` ile sonucu doğrula.",
      solution: 'nano ~/netauto/.github/workflows/ci.yml\ncd ~/netauto && ci run',
      setup: sh => MC_project(sh, { workflow: MC_WF8 }),
      editorContent: { '~/netauto/.github/workflows/ci.yml': MC_WF9 },
      check: (sh, c) => { const r = MC_last(); const d = MC_job(r, /deploy-staging/); const st = SIMA_STORE.deployments.staging; return !!r && r.status === 'success' && !!d && d.status === 'success' && d.needs.includes('build') && d.steps.some(s => /deploy 1\.2\.0 to staging done/.test(s.out || '')) && st.version === '1.2.0' && SIMA_STORE.jobs.some(j => j.type === 'deploy' && j.params.env === 'staging' && j.params.version === '1.2.0' && j.status === 'done') && MC_has(sh, MC_WF, /refs\/heads\/main/); } },
    { id: 'ci10', title: 'Production kapısı', xp: 55,
      story: "Production'a otomatik çıkmak change management'ı kızdırır. GitHub'da environment production üzerinde required reviewers tanımlanır, job o environment'ı kullanınca onay bekler. Lab'da onay, workflow'u elle tetiklemekle verilir, yani --event workflow_dispatch. Bunun için on bloğunda workflow_dispatch tetikleyicisi de olmalı.",
      task: "on bloğuna workflow_dispatch ekle. deploy-production job'u yaz, needs deploy-staging ve build, environment production, adım `python3 deploy.py --env production --version ${{ needs.build.outputs.version }}`. Önce `cd ~/netauto && ci run` ile job'un waiting kaldığını gör, sonra `cd ~/netauto && ci run --event workflow_dispatch` ile onayla ve production'ın 1.2.0 olduğunu gör.",
      hint: "environment job seviyesinde tek satır, `environment: production`. deploy-staging'deki if koşulu workflow_dispatch'te de doğru çünkü ref yine refs/heads/main.",
      solution: 'nano ~/netauto/.github/workflows/ci.yml\ncd ~/netauto && ci run\ncd ~/netauto && ci run --event workflow_dispatch',
      setup: sh => MC_project(sh, { workflow: MC_WF9 }),
      editorContent: { '~/netauto/.github/workflows/ci.yml': MC_WF10 },
      check: (sh, c) => { const r = MC_last(); const runs = (LAB.ci && LAB.ci.runs) || []; const p = MC_job(r, /deploy-production/); const waited = runs.some(x => x.event === 'push' && x.jobs.some(j => /production/.test(j.id) && j.status === 'waiting')); return !!r && r.event === 'workflow_dispatch' && r.status === 'success' && waited && !!p && p.status === 'success' && p.environment === 'production' && SIMA_STORE.deployments.production.version === '1.2.0' && SIMA_STORE.jobs.some(j => j.type === 'deploy' && j.params.env === 'production' && j.status === 'done') && MC_has(sh, MC_WF, /workflow_dispatch/) && MC_has(sh, MC_WF, /environment:\s*production/); } },
    { id: 'ci11', title: 'GitLab CI karşılığı', xp: 45,
      story: "Şirket bazı projeleri GitLab'da tutuyor ve aynı pipeline'ı orada da istiyorlar. GitLab CI tek dosya, .gitlab-ci.yml. stages sırayı belirler, her job bir stage'e aittir, before_script tüm job'lardan önce koşar, only ve except branch filtresidir, when manual elle başlatılır. gitlab-runner exec shell ile tek job yerelde denenir.",
      task: "nano ile ~/netauto/.gitlab-ci.yml yaz. stages lint, test, build, deploy. variables bloğu, default altında before_script, lint ve test job'ları, build job'u dist/ artifact'ı ile, deploy_staging only main, deploy_production only main ve when manual. Önce `cd ~/netauto && gitlab-runner exec shell test` ile tek job'u, sonra `cd ~/netauto && ci run .gitlab-ci.yml` ile tüm pipeline'ı koş.",
      hint: "GitLab'da secret'lar CI/CD Variables olarak gelir, lab'da ~/.ci/secrets.env job env'ine girer, deploy.py API_PASSWORD'ü oradan okur. only listesi branch adı alır, main.",
      solution: 'nano ~/netauto/.gitlab-ci.yml\ncd ~/netauto && gitlab-runner exec shell test\ncd ~/netauto && ci run .gitlab-ci.yml',
      setup: sh => MC_project(sh, { workflow: MC_WF10 }),
      editorContent: { '~/netauto/.gitlab-ci.yml': MC_GITLAB },
      check: (sh, c) => { const r = MC_last(); const runs = (LAB.ci && LAB.ci.runs) || []; const gl = MC_read(sh, MC_R + '/.gitlab-ci.yml') || ''; if (!r || r.kind !== 'gitlab' || r.event !== 'push' || r.status !== 'success') return false; const names = r.jobs.map(j => j.name); const ok = ['lint', 'test', 'build', 'deploy_staging'].every(n => { const j = r.jobs.find(x => x.name === n); return j && j.status === 'success'; }); const prod = r.jobs.find(j => /production/.test(j.name)); return ok && names.indexOf('lint') < names.indexOf('test') && names.indexOf('test') < names.indexOf('build') && !!prod && prod.status === 'manual' && runs.some(x => x.kind === 'gitlab' && x.event === 'exec' && x.jobs.some(j => j.name === 'test' && j.status === 'success')) && /stages:/.test(gl) && /before_script:/.test(gl) && /only:/.test(gl) && /when:\s*manual/.test(gl) && SIMA_STORE.jobs.some(j => j.type === 'deploy' && j.params.env === 'staging' && j.status === 'done'); } },
    { id: 'ci12', title: 'Rollback', xp: 60,
      story: "Saat 17.40, production'daki 1.2.0 bir NOC dashboard'unu kırdı. Panik yok, CD'nin ikinci yarısı geri dönüştür. Ayrı bir workflow, workflow_dispatch ile elle tetiklenir, inputs ile hedef sürüm ve ortam alınır, deploy.py --rollback api.lab'da rollback job'u açar. `if: always()` ile biten bildirim adımı başarısız olsa bile koşar. Hedef 1.1.0, önceki bilinen iyi sürüm.",
      task: "nano ile ~/netauto/.github/workflows/rollback.yml yaz. on workflow_dispatch inputs version zorunlu ve environment varsayılan production. rollback job'u environment inputs.environment, adımlar deployments endpoint'ini curl ile gösterme, `python3 deploy.py --env ${{ inputs.environment }} --rollback --to ${{ inputs.version }}` ve `if: always()` ile bildirim. `cd ~/netauto && ci run .github/workflows/rollback.yml --event workflow_dispatch --input version=1.1.0` ile koş.",
      hint: "inputs bloğu workflow_dispatch'in altında, her input için description, required ya da default. Değerlere ${{ inputs.version }} ile ulaşılır. Sonucu `curl -s https://api.lab/v1/deployments/production` ile doğrula, previous 1.2.0 olmalı.",
      solution: 'nano ~/netauto/.github/workflows/rollback.yml\ncd ~/netauto && ci run .github/workflows/rollback.yml --event workflow_dispatch --input version=1.1.0',
      setup: sh => { MC_project(sh, { workflow: MC_WF10 }); const p = SIMA_STORE.deployments.production; if (p.version !== '1.2.0') { p.previous = p.version; p.version = '1.2.0'; p.history.push('1.2.0'); p.deployed_at = LAB.util.now(); p.deployed_by = 'ci'; } },
      editorContent: { '~/netauto/.github/workflows/rollback.yml': MC_ROLLBACK },
      check: (sh, c) => { const r = MC_last(); const j = MC_job(r, /rollback/); const p = SIMA_STORE.deployments.production; return !!r && /rollback\.yml$/.test(r.file) && r.event === 'workflow_dispatch' && r.inputs && r.inputs.version === '1.1.0' && r.status === 'success' && !!j && j.status === 'success' && j.environment === 'production' && j.steps.some(s => /rollback 1\.1\.0 to production done/.test(s.out || '')) && j.steps.some(s => /finished with success/.test(s.out || '')) && p.version === '1.1.0' && p.previous === '1.2.0' && SIMA_STORE.jobs.some(x => x.type === 'rollback' && x.params.env === 'production' && x.params.version === '1.1.0' && x.status === 'done') && MC_has(sh, MC_R + '/.github/workflows/rollback.yml', /always\(\)/); } },
  ],
});

QUIZ.push(
  { q: 'GitHub Actions\'ta needs anahtarı ne yapar?', a: ['Job\'u başka job\'ların bitmesine bağlar, biri kırılırsa atlanır', 'Gerekli Python paketlerini kurar', 'Secret tanımlar', 'Runner tipini seçer'], c: 0 },
  { q: 'strategy.matrix ile ne olur?', a: ['Aynı job her kombinasyon için ayrı koşar', 'Job\'lar sırayla koşar', 'Testler paralel thread\'lerde koşar', 'Cache otomatik açılır'], c: 0 },
  { q: 'Bir adımın değerini sonraki adıma aktarmanın doğru yolu?', a: ['$GITHUB_OUTPUT dosyasına yazıp steps.id.outputs.ad ile okumak', 'Global değişken export etmek', 'Dosyaya yazıp cat ile okumak', 'echo ile basmak yeterli'], c: 0 },
  { q: 'secrets.X log\'da nasıl görünür?', a: ['*** olarak maskelenir', 'Açık metin', 'Base64', 'Hiç görünmez, adım atlanır'], c: 0 },
  { q: 'Job\'da `environment: production` ve required reviewers tanımlıysa job ne yapar?', a: ['Onay gelene kadar bekler', 'Hemen koşar', 'Atlanır', 'Sadece main\'de koşar'], c: 0 },
  { q: '`if: always()` olan adım ne zaman koşar?', a: ['Önceki adımlar kırılsa bile', 'Sadece başarıda', 'Sadece hatada', 'Hiçbir zaman'], c: 0 },
  { q: 'GitLab CI\'da stages ne belirler?', a: ['Job\'ların koşma sırasını, aynı stage paralel', 'Runner sayısını', 'Branch filtresini', 'Artifact süresini'], c: 0 },
  { q: 'actions/cache key içinde hashFiles ne sağlar?', a: ['Bağımlılık dosyası değişince cache yenilenir', 'Cache şifrelenir', 'Cache tüm repo\'lara açılır', 'Hiçbir şey, zorunlu alan'], c: 0 },
);

BADGES.push({ id: 'ci', icon: '🚦', title: 'Pipeline Mühendisi', desc: 'CI ve CD bölümünü bitir', test: s => CHAPTERS.find(c => c.id === 'ci').missions.every(m => s.done.includes(m.id)) });
