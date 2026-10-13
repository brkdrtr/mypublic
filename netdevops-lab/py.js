'use strict';
/* Pyodide koprusu. Python senkron calisir, sanal FS ile Pyodide FS arasinda /home/burak senkronlanir. */

const PY = {
  pyodide: null, status: 'idle', msg: '', promise: null, onStatus: null,
  set(status, msg) { this.status = status; this.msg = msg || ''; if (this.onStatus) this.onStatus(status, msg); },
  load() {
    if (this.promise) return this.promise;
    this.promise = (async () => {
      try {
        this.set('loading', 'Python runtime yükleniyor');
        if (typeof loadPyodide !== 'function') {
          await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'pyodide/pyodide.js'; s.onload = res; s.onerror = () => rej(new Error('pyodide.js yüklenemedi')); document.head.appendChild(s); });
        }
        const py = await loadPyodide({ indexURL: 'pyodide/' });
        this.set('loading', 'Paketler yükleniyor, pytest, pyyaml, jinja2, lxml');
        await py.loadPackage(['pytest', 'pyyaml', 'jinja2', 'lxml']);
        py.FS.mkdirTree('/lib/ndlab');
        py.FS.mkdirTree('/home/burak');
        /* shim modulleri */
        for (const [path, url] of Object.entries(LAB.pyFiles)) {
          const src = await fetch(url).then(r => (r.ok ? r.text() : null)).catch(() => null);
          if (src === null) { console.warn('shim yok', url); continue; }
          const abs = '/lib/ndlab/' + path;
          py.FS.mkdirTree(abs.slice(0, abs.lastIndexOf('/')));
          py.FS.writeFile(abs, src);
        }
        py.registerJsModule('ndlab', {
          http: (method, url, headers, body) => {
            let h = headers || {}; if (h && typeof h.toJs === 'function') { h = h.toJs({ dict_converter: Object.fromEntries }); } if (h instanceof Map) h = Object.fromEntries(h);
            const r = LAB.http({ method, url, headers: h, body: body == null ? '' : String(body) });
            return py.toPy({ status: r.status, headers: r.headers, body: r.body, error: r.error || null });
          },
          devices: () => py.toPy(Object.keys(LAB.devices)),
          device: name => LAB.devices[name] || null,
          toJson: obj => JSON.stringify(obj),
        });
        py.runPython(`
import sys, io, os, runpy, json
sys.path.insert(0, '/lib/ndlab')
os.chdir('/home/burak')
os.environ['HOME'] = '/home/burak'
os.environ['USER'] = 'burak'
class _NdIO(io.StringIO):
    def close(self):
        pass
def _nd_env(env):
    import os
    for k in list(os.environ.keys()):
        if k not in ('HOME', 'USER', 'PATH', 'LANG', 'PYTHONPATH') and k not in env:
            del os.environ[k]
    for k, v in env.items():
        os.environ[str(k)] = str(v)
def _nd_run(argv, stdin_text, cwd, env):
    import sys, io, os, runpy, traceback
    os.chdir(cwd)
    _nd_env(env)
    old = (sys.argv, sys.stdin, sys.stdout, sys.stderr)
    out, err = _NdIO(), _NdIO()
    sys.argv = list(argv)
    sys.stdin = io.StringIO(stdin_text or '')
    sys.stdout, sys.stderr = out, err
    code = 0
    try:
        a = list(argv)
        if a[0] == '-c':
            exec(compile(a[1], '<string>', 'exec'), {'__name__': '__main__'})
        elif a[0] == '-m':
            sys.argv = a[1:]
            runpy.run_module(a[1], run_name='__main__', alter_sys=True)
        else:
            sys.argv = a
            runpy.run_path(a[0], run_name='__main__')
    except SystemExit as e:
        if e.code is None:
            code = 0
        elif isinstance(e.code, int):
            code = e.code
        else:
            err.write(str(e.code) + '\\n')
            code = 1
    except BaseException:
        traceback.print_exc(file=err)
        code = 1
    finally:
        sys.argv, sys.stdin, sys.stdout, sys.stderr = old
        for m in [m for m in sys.modules if (getattr(sys.modules[m], '__file__', '') or '').startswith('/home/burak')]:
            del sys.modules[m]
    return (code, out.getvalue(), err.getvalue())

def _nd_pytest(args, cwd, env):
    import sys, io, os, pytest
    os.chdir(cwd)
    _nd_env(env)
    old = (sys.stdout, sys.stderr)
    out = _NdIO()
    sys.stdout, sys.stderr = out, out
    try:
        code = pytest.main(list(args) + ['-p', 'no:cacheprovider'])
    finally:
        sys.stdout, sys.stderr = old
        for m in [m for m in sys.modules if (getattr(sys.modules[m], '__file__', '') or '').startswith('/home/burak')]:
            del sys.modules[m]
    return (int(code), out.getvalue(), '')
`);
        this.pyodide = py;
        this.set('ready', 'Python 3.14 hazır');
      } catch (e) { this.set('error', String(e.message || e)); throw e; }
    })();
    return this.promise;
  },
  /* sanal FS -> Pyodide, /home/burak agaci */
  push(sh) {
    const py = this.pyodide; const FS = py.FS;
    try { FS.chdir('/home/burak'); } catch (e) { /* yok */ }
    const seen = new Set();
    const walk = (node, abs) => {
      seen.add(abs);
      if (node.t === 'd') {
        try { FS.mkdirTree(abs); } catch (e) { /* var */ }
        Object.entries(node.c).forEach(([n, ch]) => walk(ch, abs + '/' + n));
      } else {
        let cur = null; try { cur = FS.readFile(abs, { encoding: 'utf8' }); } catch (e) { cur = null; }
        if (cur !== node.d) FS.writeFile(abs, node.d);
        if ((node.m & 0o111) && typeof FS.chmod === 'function') { try { FS.chmod(abs, node.m); } catch (e) { /* yok */ } }
      }
    };
    const home = sh.node('/home/burak');
    if (home) walk(home, '/home/burak');
    /* sanal tarafta silinmis olanlari Pyodide'den de sil */
    const prune = abs => {
      let st; try { st = FS.stat(abs); } catch (e) { return; }
      if (FS.isDir(st.mode)) {
        for (const n of FS.readdir(abs)) { if (n === '.' || n === '..') continue; const p = abs + '/' + n; if (!seen.has(p)) { this.rmrf(p); } else prune(p); }
      }
    };
    prune('/home/burak');
  },
  rmrf(abs) {
    const FS = this.pyodide.FS;
    let st; try { st = FS.stat(abs); } catch (e) { return; }
    if (FS.isDir(st.mode)) { for (const n of FS.readdir(abs)) { if (n !== '.' && n !== '..') this.rmrf(abs + '/' + n); } FS.rmdir(abs); }
    else FS.unlink(abs);
  },
  /* Pyodide -> sanal FS */
  pull(sh) {
    const FS = this.pyodide.FS;
    const walk = (abs, node) => {
      const names = FS.readdir(abs).filter(n => n !== '.' && n !== '..');
      const present = new Set(names);
      Object.keys(node.c).forEach(n => { if (!present.has(n)) delete node.c[n]; });
      for (const n of names) {
        const p = abs + '/' + n;
        const st = FS.stat(p);
        if (FS.isDir(st.mode)) {
          if (n === '__pycache__' || n === '.pytest_cache') { this.rmrf(p); continue; }
          if (!node.c[n] || node.c[n].t !== 'd') node.c[n] = mkdir({}, 0o755, 'burak');
          walk(p, node.c[n]);
        } else {
          let txt; try { txt = FS.readFile(p, { encoding: 'utf8' }); } catch (e) { continue; }
          if (!node.c[n] || node.c[n].t !== 'f') node.c[n] = mkfile(txt, st.mode & 0o777 || 0o644, 'burak');
          else if (node.c[n].d !== txt) { node.c[n].d = txt; node.c[n].ts = Date.now(); }
        }
      }
    };
    const home = sh.node('/home/burak');
    if (home) walk('/home/burak', home);
  },
  run(sh, argv, stdin, mode) {
    const py = this.pyodide;
    this.push(sh);
    let res;
    try {
      const fn = py.globals.get(mode === 'pytest' ? '_nd_pytest' : '_nd_run');
      const env = py.toPy(Object.assign({}, sh.env || {}));
      const r = mode === 'pytest' ? fn(py.toPy(argv), sh.cwd, env) : fn(py.toPy(argv), stdin || '', sh.cwd, env);
      if (env.destroy) env.destroy();
      res = r.toJs ? r.toJs() : r; if (r.destroy) r.destroy(); fn.destroy && fn.destroy();
    } catch (e) { res = [1, '', 'python: ' + (e.message || e) + '\n']; }
    this.pull(sh);
    const out = { argv, code: res[0], stdout: res[1], stderr: res[2] };
    sh.lastPy = out;
    return out;
  },
};

/* Shell komutlari. Pyodide hazir degilse kullaniciya bekle der */
(function () {
  const notReady = () => PY.status === 'error' ? fail(`python3: Python runtime yüklenemedi, ${PY.msg}\n`) : fail('python3: Python runtime hâlâ yükleniyor, birkaç saniye sonra tekrar dene\n');
  const pyCmd = function (args, stdin) { const sh = this;
    if (!PY.pyodide) { PY.load().catch(() => {}); return notReady(); }
    if (!args.length) return fail('python3: etkileşimli REPL bu lab\'da yok. python3 dosya.py, python3 -c "kod" ya da python3 -m modul kullan\n');
    if (args[0] === '--version' || args[0] === '-V') return ok('Python 3.14.2\n');
    if (args[0] === '-m' && args[1] === 'pytest') { const r = PY.run(sh, args.slice(2), stdin, 'pytest'); return { out: r.stdout, err: r.stderr, code: r.code }; }
    if (args[0] !== '-c' && args[0] !== '-m') {
      const abs = sh.resolve(args[0]);
      if (!sh.node(abs)) return fail(`python3: can't open file '${args[0]}': [Errno 2] No such file or directory\n`);
      args = [abs].concat(args.slice(1));
    }
    const r = PY.run(sh, args, stdin, 'run');
    return { out: r.stdout, err: r.stderr, code: r.code };
  };
  const pytestCmd = function (args, stdin) { const sh = this;
    if (!PY.pyodide) { PY.load().catch(() => {}); return notReady(); }
    const r = PY.run(sh, args, stdin, 'pytest');
    return { out: r.stdout, err: r.stderr, code: r.code };
  };
  const pipCmd = function (args) {
    const have = ['pytest', 'pyyaml', 'jinja2', 'lxml', 'requests', 'ncclient', 'pygnmi', 'netmiko'];
    if (args[0] === 'install') {
      let p = args.slice(1).filter(a => !a.startsWith('-'));
      const ri = args.indexOf('-r'); if (ri >= 0 && args[ri + 1]) { const rf = this.readFile(args[ri + 1], 'pip'); const txt = rf && rf.data; if (txt == null) return fail(`ERROR: Could not open requirements file: [Errno 2] No such file or directory: '${args[ri + 1]}'\n`); p = p.filter(x => x !== args[ri + 1]).concat(txt.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))); }
      return ok(p.map(x => have.includes(x.toLowerCase().split(/[=<>]/)[0]) ? `Requirement already satisfied: ${x}` : `ERROR: Bu lab çevrimdışı, ${x} paketi kurulamaz. Hazır paketler ${have.join(', ')}`).join('\n') + '\n'); }
    if (args[0] === 'list' || args[0] === 'freeze') return ok(have.map(x => x + '==lab').join('\n') + '\n');
    return ok('Usage: pip install <paket>, pip list\n');
  };
  registerExt({
    commands: { python3: pyCmd, python: pyCmd, pytest: pytestCmd, pip: pipCmd, pip3: pipCmd },
    manual: {
      python3: { d: 'Python 3 yorumlayıcısı, gerçek Python 3.14 tarayıcıda çalışır', u: ['python3 dosya.py [arg...]', 'python3 -c "kod"', 'python3 -m modul'], e: ['python3 app.py', 'python3 -c "print(2**10)"', 'python3 -m json.tool data.json'] },
      pytest: { d: 'Test çalıştırıcı, test_*.py dosyalarını bulur ve koşar', u: ['pytest [-q] [-v] [-k ifade] [dosya]', 'pytest -x', 'pytest --tb=short'], e: ['pytest -q', 'pytest tests/test_parse.py -v', 'pytest -k "vlan and not slow"'] },
      pip: { d: 'Paket yöneticisi, bu lab çevrimdışı, hazır paketler listelenir', u: ['pip install paket', 'pip list'], e: ['pip list'] },
    },
  });
})();
