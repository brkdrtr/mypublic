"""requests.models, Request, PreparedRequest and Response for the lab transport."""
import datetime
import json as _json
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl

from .structures import CaseInsensitiveDict
from .status_codes import REASONS
from .exceptions import HTTPError, MissingSchema, InvalidSchema, InvalidURL, JSONDecodeError

DEFAULT_REDIRECT_LIMIT = 30


def _encode_params(data):
    if data is None:
        return None
    if isinstance(data, (str, bytes)):
        return data
    if hasattr(data, 'read'):
        return data.read()
    if hasattr(data, 'items'):
        items = []
        for k, vs in data.items():
            if vs is None:
                continue
            if isinstance(vs, (list, tuple)):
                for v in vs:
                    if v is not None:
                        items.append((k, v))
            else:
                items.append((k, vs))
        return urlencode(items, doseq=True)
    try:
        return urlencode(list(data), doseq=True)
    except TypeError:
        return str(data)


class RequestEncodingMixin:
    pass


class Request:
    """A user created Request, prepare() turns it into a PreparedRequest."""

    def __init__(self, method=None, url=None, headers=None, files=None, data=None, params=None, auth=None, cookies=None, hooks=None, json=None):
        self.method = method
        self.url = url
        self.headers = headers if headers is not None else {}
        self.files = files
        self.data = data if data is not None else {}
        self.json = json
        self.params = params if params is not None else {}
        self.auth = auth
        self.cookies = cookies
        self.hooks = hooks or {}

    def __repr__(self):
        return f'<Request [{self.method}]>'

    def prepare(self):
        p = PreparedRequest()
        p.prepare(method=self.method, url=self.url, headers=self.headers, files=self.files, data=self.data, json=self.json, params=self.params, auth=self.auth, cookies=self.cookies, hooks=self.hooks)
        return p


class PreparedRequest:
    def __init__(self):
        self.method = None
        self.url = None
        self.headers = None
        self.body = None
        self.hooks = {}
        self._body_position = None

    def prepare(self, method=None, url=None, headers=None, files=None, data=None, params=None, auth=None, cookies=None, hooks=None, json=None):
        self.prepare_method(method)
        self.prepare_url(url, params)
        self.prepare_headers(headers)
        self.prepare_cookies(cookies)
        self.prepare_body(data, files, json)
        self.prepare_auth(auth, url)
        self.hooks = hooks or {}

    def __repr__(self):
        return f'<PreparedRequest [{self.method}]>'

    def copy(self):
        p = PreparedRequest()
        p.method = self.method
        p.url = self.url
        p.headers = self.headers.copy() if self.headers is not None else None
        p.body = self.body
        p.hooks = self.hooks
        return p

    def prepare_method(self, method):
        self.method = method.upper() if method else method

    def prepare_url(self, url, params):
        if isinstance(url, bytes):
            url = url.decode('utf8')
        url = str(url).lstrip()
        if ':' in url and not url.lower().startswith('http'):
            self.url = url
            return
        parts = urlsplit(url)
        if not parts.scheme:
            raise MissingSchema(f"Invalid URL {url!r}: No scheme supplied. Perhaps you meant https://{url}?")
        if parts.scheme not in ('http', 'https'):
            raise InvalidSchema(f"No connection adapters were found for {url!r}")
        if not parts.netloc:
            raise InvalidURL(f"Invalid URL {url!r}: No host supplied")
        query = parts.query
        enc = _encode_params(params)
        if enc:
            query = f'{query}&{enc}' if query else enc
        self.url = urlunsplit((parts.scheme, parts.netloc, parts.path or '/', query, parts.fragment))

    def prepare_headers(self, headers):
        self.headers = CaseInsensitiveDict()
        if headers:
            for k, v in headers.items():
                if v is None:
                    continue
                self.headers[str(k)] = v if isinstance(v, (str, bytes)) else str(v)

    def prepare_cookies(self, cookies):
        if cookies:
            items = cookies.items() if hasattr(cookies, 'items') else cookies
            self.headers['Cookie'] = '; '.join(f'{k}={v}' for k, v in items)

    def prepare_body(self, data, files, json=None):
        body = None
        content_type = None
        if json is not None and not data and not files:
            body = _json.dumps(json, allow_nan=False)
            content_type = 'application/json'
        elif files:
            parts = []
            for name, f in (files.items() if hasattr(files, 'items') else files):
                fname, content = (f[0], f[1]) if isinstance(f, (list, tuple)) else (name, f)
                if hasattr(content, 'read'):
                    content = content.read()
                if isinstance(content, bytes):
                    content = content.decode('utf8', 'replace')
                parts.append(f'--labboundary\r\nContent-Disposition: form-data; name="{name}"; filename="{fname}"\r\n\r\n{content}\r\n')
            if data and hasattr(data, 'items'):
                for k, v in data.items():
                    parts.append(f'--labboundary\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n')
            body = ''.join(parts) + '--labboundary--\r\n'
            content_type = 'multipart/form-data; boundary=labboundary'
        elif data is not None and data != {} and data != []:
            body = _encode_params(data)
            if not isinstance(data, (str, bytes)) and not hasattr(data, 'read'):
                content_type = 'application/x-www-form-urlencoded'
        self.body = body
        if content_type and 'content-type' not in self.headers:
            self.headers['Content-Type'] = content_type
        if body is not None:
            length = len(body.encode('utf8') if isinstance(body, str) else body)
            self.headers['Content-Length'] = str(length)

    def prepare_auth(self, auth, url=''):
        if auth is None:
            return
        if isinstance(auth, (tuple, list)) and len(auth) == 2:
            from .auth import HTTPBasicAuth
            auth = HTTPBasicAuth(*auth)
        r = auth(self)
        if r is not None:
            self.__dict__.update(r.__dict__)

    @property
    def path_url(self):
        parts = urlsplit(self.url)
        return (parts.path or '/') + (('?' + parts.query) if parts.query else '')


class Response:
    """The server's answer. status_code, headers, text, content, json(), ok, raise_for_status(), elapsed, url, reason."""

    __attrs__ = ['_content', 'status_code', 'headers', 'url', 'history', 'encoding', 'reason', 'cookies', 'elapsed', 'request']

    def __init__(self):
        self._content = b''
        self._content_consumed = True
        self.status_code = None
        self.headers = CaseInsensitiveDict()
        self.raw = None
        self.url = None
        self.encoding = 'utf-8'
        self.history = []
        self.reason = None
        self.cookies = {}
        self.elapsed = datetime.timedelta(0)
        self.request = None
        self.connection = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def __repr__(self):
        return f'<Response [{self.status_code}]>'

    def __bool__(self):
        return self.ok

    def __nonzero__(self):
        return self.ok

    def __iter__(self):
        return self.iter_content(128)

    @property
    def ok(self):
        try:
            self.raise_for_status()
        except HTTPError:
            return False
        return True

    @property
    def is_redirect(self):
        return 'location' in self.headers and self.status_code in (301, 302, 303, 307, 308)

    @property
    def is_permanent_redirect(self):
        return 'location' in self.headers and self.status_code in (301, 308)

    @property
    def next(self):
        return None

    @property
    def apparent_encoding(self):
        return 'utf-8'

    def iter_content(self, chunk_size=1, decode_unicode=False):
        data = self.content
        if chunk_size is None:
            chunk_size = len(data) or 1
        for i in range(0, len(data), chunk_size):
            chunk = data[i:i + chunk_size]
            yield chunk.decode(self.encoding or 'utf-8') if decode_unicode else chunk

    def iter_lines(self, chunk_size=512, decode_unicode=False, delimiter=None):
        text = self.text if decode_unicode else self.content
        lines = text.split(delimiter) if delimiter else text.splitlines()
        for line in lines:
            yield line

    @property
    def content(self):
        return self._content

    @property
    def text(self):
        if not self.content:
            return ''
        return self.content.decode(self.encoding or 'utf-8', errors='replace')

    def json(self, **kwargs):
        try:
            return _json.loads(self.text, **kwargs)
        except _json.JSONDecodeError as e:
            raise JSONDecodeError(e.msg, e.doc, e.pos)

    @property
    def links(self):
        header = self.headers.get('link')
        resolved = {}
        if header:
            for part in header.split(','):
                segs = part.split(';')
                url = segs[0].strip().strip('<>')
                link = {'url': url}
                for seg in segs[1:]:
                    if '=' in seg:
                        k, v = seg.strip().split('=', 1)
                        link[k.strip()] = v.strip().strip('"')
                resolved[link.get('rel') or url] = link
        return resolved

    def raise_for_status(self):
        http_error_msg = ''
        reason = self.reason or REASONS.get(self.status_code, '')
        if 400 <= self.status_code < 500:
            http_error_msg = f'{self.status_code} Client Error: {reason} for url: {self.url}'
        elif 500 <= self.status_code < 600:
            http_error_msg = f'{self.status_code} Server Error: {reason} for url: {self.url}'
        if http_error_msg:
            raise HTTPError(http_error_msg, response=self)

    def close(self):
        pass
