"""requests.sessions, Session over the lab transport ndlab.http(method, url, headers, body)."""
import datetime
import time
from urllib.parse import urlsplit, urljoin

from .models import Request, PreparedRequest, Response
from .structures import CaseInsensitiveDict
from .status_codes import REASONS
from .exceptions import ConnectionError, TooManyRedirects
from .adapters import HTTPAdapter
from . import __version__ as _version

try:
    import ndlab as _ndlab
except ImportError:  # outside the lab, nothing answers
    _ndlab = None


def _to_js_dict(d):
    """Hands the header dict to JS as a plain object. py.js expects headers.toJs() to be iterable, which is
    not true on every Pyodide build, so the conversion is done here with dict_converter."""
    try:
        import js
        from pyodide.ffi import to_js
        return to_js(d, dict_converter=js.Object.fromEntries)
    except Exception:
        return d


def default_headers():
    return CaseInsensitiveDict({'User-Agent': f'python-requests/{_version}', 'Accept-Encoding': 'gzip, deflate', 'Accept': '*/*', 'Connection': 'keep-alive'})


def merge_setting(request_setting, session_setting):
    if session_setting is None:
        return request_setting
    if request_setting is None:
        return session_setting
    if not (hasattr(session_setting, 'items') and hasattr(request_setting, 'items')):
        return request_setting
    merged = CaseInsensitiveDict(session_setting) if isinstance(session_setting, CaseInsensitiveDict) else dict(session_setting)
    merged.update(request_setting)
    for k in [k for k, v in request_setting.items() if v is None]:
        del merged[k]
    return merged


def _transport(prepared, timeout=None):
    """One round trip through LAB.http. Raises ConnectionError when the host is unknown to the lab."""
    if _ndlab is None:
        raise ConnectionError(f"HTTPSConnectionPool(host='{urlsplit(prepared.url).hostname}', port=443): no lab transport available", request=prepared)
    headers = {k: (v.decode('latin1') if isinstance(v, bytes) else str(v)) for k, v in prepared.headers.items()}
    body = prepared.body
    if isinstance(body, bytes):
        body = body.decode('utf8', 'replace')
    start = time.perf_counter()
    raw = _ndlab.http(prepared.method, prepared.url, _to_js_dict(headers), body if body is not None else '')
    if hasattr(raw, 'to_py'):
        raw = raw.to_py()
    elapsed = time.perf_counter() - start
    error = raw.get('error') if isinstance(raw, dict) else getattr(raw, 'error', None)
    if error or not raw.get('status'):
        parts = urlsplit(prepared.url)
        port = parts.port or (443 if parts.scheme == 'https' else 80)
        raise ConnectionError(f"HTTPSConnectionPool(host='{parts.hostname}', port={port}): Max retries exceeded with url: {prepared.path_url} (Caused by NameResolutionError(\"Failed to resolve '{parts.hostname}' ({error or 'no route'})\"))", request=prepared)
    r = Response()
    r.status_code = int(raw['status'])
    r.headers = CaseInsensitiveDict(dict(raw.get('headers') or {}))
    body_text = raw.get('body') or ''
    r._content = body_text.encode('utf8') if isinstance(body_text, str) else bytes(body_text)
    r.url = prepared.url
    r.reason = REASONS.get(r.status_code, '')
    r.request = prepared
    r.elapsed = datetime.timedelta(seconds=elapsed)
    ct = r.headers.get('content-type', '')
    if 'charset=' in ct:
        r.encoding = ct.split('charset=')[1].split(';')[0].strip()
    return r


class Session:
    """Keeps headers, auth, params and cookies across requests. Use it for a token you obtained once."""

    __attrs__ = ['headers', 'cookies', 'auth', 'proxies', 'hooks', 'params', 'verify', 'cert', 'adapters', 'stream', 'trust_env', 'max_redirects']

    def __init__(self):
        self.headers = default_headers()
        self.auth = None
        self.proxies = {}
        self.hooks = {'response': []}
        self.params = {}
        self.stream = False
        self.verify = True
        self.cert = None
        self.max_redirects = 30
        self.trust_env = True
        self.cookies = {}
        self.adapters = {}
        self.mount('https://', HTTPAdapter())
        self.mount('http://', HTTPAdapter())

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def prepare_request(self, request):
        headers = merge_setting(request.headers, self.headers)
        p = PreparedRequest()
        p.prepare(method=request.method.upper(), url=request.url, files=request.files, data=request.data, json=request.json,
                  headers=headers, params=merge_setting(request.params, self.params), auth=request.auth if request.auth is not None else self.auth,
                  cookies=merge_setting(request.cookies, self.cookies), hooks=request.hooks)
        return p

    def request(self, method, url, params=None, data=None, headers=None, cookies=None, files=None, auth=None, timeout=None,
                allow_redirects=True, proxies=None, hooks=None, stream=None, verify=None, cert=None, json=None):
        req = Request(method=method.upper(), url=url, headers=headers, files=files, data=data or {}, json=json, params=params or {}, auth=auth, cookies=cookies, hooks=hooks)
        prep = self.prepare_request(req)
        return self.send(prep, timeout=timeout, allow_redirects=allow_redirects, verify=verify if verify is not None else self.verify, stream=stream)

    def send(self, request, **kwargs):
        timeout = kwargs.get('timeout')
        allow_redirects = kwargs.get('allow_redirects', True)
        adapter = self.get_adapter(url=request.url)
        r = adapter.send(request, timeout=timeout)
        for hook in self.hooks.get('response', []) or []:
            out = hook(r)
            if out is not None:
                r = out
        hops = 0
        while allow_redirects and r.is_redirect:
            hops += 1
            if hops > self.max_redirects:
                raise TooManyRedirects(f'Exceeded {self.max_redirects} redirects.', response=r)
            nxt = request.copy()
            nxt.url = urljoin(r.url, r.headers['location'])
            if r.status_code in (301, 302, 303) and request.method != 'HEAD':
                nxt.method = 'GET'
                nxt.body = None
                for h in ('Content-Length', 'Content-Type'):
                    nxt.headers.pop(h, None)
            prev = r
            r = adapter.send(nxt, timeout=timeout)
            r.history = prev.history + [prev]
            request = nxt
        for k, v in self.cookies.items():
            r.cookies.setdefault(k, v)
        return r

    def get(self, url, **kwargs):
        kwargs.setdefault('allow_redirects', True)
        return self.request('GET', url, **kwargs)

    def options(self, url, **kwargs):
        kwargs.setdefault('allow_redirects', True)
        return self.request('OPTIONS', url, **kwargs)

    def head(self, url, **kwargs):
        kwargs.setdefault('allow_redirects', False)
        return self.request('HEAD', url, **kwargs)

    def post(self, url, data=None, json=None, **kwargs):
        return self.request('POST', url, data=data, json=json, **kwargs)

    def put(self, url, data=None, **kwargs):
        return self.request('PUT', url, data=data, **kwargs)

    def patch(self, url, data=None, **kwargs):
        return self.request('PATCH', url, data=data, **kwargs)

    def delete(self, url, **kwargs):
        return self.request('DELETE', url, **kwargs)

    def get_adapter(self, url):
        for prefix, adapter in self.adapters.items():
            if url.lower().startswith(prefix.lower()):
                return adapter
        return HTTPAdapter()

    def mount(self, prefix, adapter):
        """Registers an adapter for a URL prefix. Accepted for compatibility, retries configured on it do nothing in the lab."""
        self.adapters[prefix] = adapter

    def close(self):
        for a in self.adapters.values():
            a.close()

    def merge_environment_settings(self, url, proxies, stream, verify, cert):
        return {'proxies': proxies, 'stream': stream, 'verify': verify, 'cert': cert}


def session():
    return Session()
