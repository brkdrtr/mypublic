"""urllib3.util.retry.Retry, NetDevOps Lab stub.

The class exists so the well known snippet
    retry = Retry(total=5, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504], allowed_methods=['GET'])
    session.mount('https://', HTTPAdapter(max_retries=retry))
parses and runs. It does NOT retry anything in the lab. The transport is synchronous LAB.http, so the lab
asks you to write the loop yourself, check r.status_code, read r.headers.get('Retry-After') and sleep.
"""


class Retry:
    DEFAULT_ALLOWED_METHODS = frozenset(['HEAD', 'GET', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'])
    RETRY_AFTER_STATUS_CODES = frozenset([413, 429, 503])
    DEFAULT_BACKOFF_MAX = 120

    def __init__(self, total=10, connect=None, read=None, redirect=None, status=None, other=None, allowed_methods=DEFAULT_ALLOWED_METHODS,
                 status_forcelist=None, backoff_factor=0, backoff_max=DEFAULT_BACKOFF_MAX, raise_on_redirect=True, raise_on_status=True,
                 history=None, respect_retry_after_header=True, remove_headers_on_redirect=('Cookie', 'Authorization'), backoff_jitter=0.0, method_whitelist=None):
        self.total = total
        self.connect = connect
        self.read = read
        self.redirect = redirect
        self.status = status
        self.other = other
        self.allowed_methods = allowed_methods if method_whitelist is None else method_whitelist
        self.status_forcelist = set(status_forcelist or [])
        self.backoff_factor = backoff_factor
        self.backoff_max = backoff_max
        self.raise_on_redirect = raise_on_redirect
        self.raise_on_status = raise_on_status
        self.history = tuple(history or ())
        self.respect_retry_after_header = respect_retry_after_header
        self.remove_headers_on_redirect = frozenset(h.lower() for h in remove_headers_on_redirect)
        self.backoff_jitter = backoff_jitter

    def get_backoff_time(self):
        """Reference implementation of urllib3's exponential backoff, useful in your own loop."""
        consecutive = len(self.history)
        if consecutive <= 1:
            return 0
        return min(self.backoff_max, self.backoff_factor * (2 ** (consecutive - 1)))

    def is_retry(self, method, status_code, has_retry_after=False):
        if self.status_forcelist and status_code in self.status_forcelist:
            return True
        return bool(self.total and self.respect_retry_after_header and has_retry_after and status_code in self.RETRY_AFTER_STATUS_CODES)

    def new(self, **kw):
        params = dict(total=self.total, connect=self.connect, read=self.read, redirect=self.redirect, status=self.status, other=self.other,
                      allowed_methods=self.allowed_methods, status_forcelist=self.status_forcelist, backoff_factor=self.backoff_factor,
                      backoff_max=self.backoff_max, raise_on_redirect=self.raise_on_redirect, raise_on_status=self.raise_on_status,
                      history=self.history, respect_retry_after_header=self.respect_retry_after_header, backoff_jitter=self.backoff_jitter)
        params.update(kw)
        return type(self)(**params)

    def __repr__(self):
        return f'Retry(total={self.total}, connect={self.connect}, read={self.read}, redirect={self.redirect}, status={self.status}) [lab stub, no retries]'
