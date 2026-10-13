"""requests.adapters, NetDevOps Lab shim.

HTTPAdapter(max_retries=Retry(...)) is accepted so that the common urllib3 Retry snippet parses and runs,
but it is a NO OP in the lab. Nothing is retried for you. The lab wants you to write an explicit retry loop,
read Retry-After on 429 and back off exponentially on 5xx. See the retry mission in the api chapter.
"""


class BaseAdapter:
    def __init__(self):
        pass

    def send(self, request, stream=False, timeout=None, verify=True, cert=None, proxies=None):
        raise NotImplementedError

    def close(self):
        pass


class HTTPAdapter(BaseAdapter):
    """Accepted for compatibility. max_retries, pool_connections, pool_maxsize and pool_block are stored and ignored.

    Real requests delegates retries to urllib3 here. The lab transport is LAB.http, a synchronous in browser call,
    so this adapter only records what you asked for. Session.get_adapter(url).max_retries lets you inspect it.
    """

    def __init__(self, pool_connections=10, pool_maxsize=10, max_retries=0, pool_block=False):
        super().__init__()
        self.max_retries = max_retries
        self.pool_connections = pool_connections
        self.pool_maxsize = pool_maxsize
        self.pool_block = pool_block
        self.config = {}

    def send(self, request, stream=False, timeout=None, verify=True, cert=None, proxies=None):
        from .sessions import _transport
        return _transport(request, timeout=timeout)

    def __repr__(self):
        return f'<HTTPAdapter max_retries={self.max_retries!r} (no-op in lab)>'
