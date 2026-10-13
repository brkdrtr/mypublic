class HTTPError(Exception):
    pass


class MaxRetryError(HTTPError):
    def __init__(self, pool=None, url=None, reason=None):
        self.reason = reason
        self.url = url
        super().__init__(f'Max retries exceeded with url: {url} (Caused by {reason!r})')


class InsecureRequestWarning(Warning):
    pass


class ProtocolError(HTTPError):
    pass


class ReadTimeoutError(HTTPError):
    pass
