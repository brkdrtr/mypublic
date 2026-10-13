"""requests.exceptions, NetDevOps Lab shim. Same class names and hierarchy as the real library."""
from json import JSONDecodeError as _JSONDecodeError


class RequestException(IOError):
    """Base for everything requests raises. .request and .response may be set."""

    def __init__(self, *args, **kwargs):
        self.response = kwargs.pop('response', None)
        self.request = kwargs.pop('request', None)
        if self.response is not None and self.request is None and getattr(self.response, 'request', None) is not None:
            self.request = self.response.request
        super().__init__(*args, **kwargs)


class InvalidJSONError(RequestException):
    pass


class JSONDecodeError(InvalidJSONError, _JSONDecodeError):
    def __init__(self, *args, **kwargs):
        _JSONDecodeError.__init__(self, *args)
        InvalidJSONError.__init__(self, *self.args, **kwargs)


class HTTPError(RequestException):
    """Raised by Response.raise_for_status for 4xx and 5xx. e.response is the Response."""


class ConnectionError(RequestException):
    """Host could not be resolved or reached. In the lab, any host LAB.http does not know."""


class ProxyError(ConnectionError):
    pass


class SSLError(ConnectionError):
    pass


class Timeout(RequestException):
    """Request timed out. The lab answers synchronously so this is never raised, but code can catch it."""


class ConnectTimeout(ConnectionError, Timeout):
    pass


class ReadTimeout(Timeout):
    pass


class URLRequired(RequestException):
    pass


class TooManyRedirects(RequestException):
    pass


class MissingSchema(RequestException, ValueError):
    pass


class InvalidSchema(RequestException, ValueError):
    pass


class InvalidURL(RequestException, ValueError):
    pass


class InvalidHeader(RequestException, ValueError):
    pass


class ChunkedEncodingError(RequestException):
    pass


class ContentDecodingError(RequestException):
    pass


class StreamConsumedError(RequestException, TypeError):
    pass


class RetryError(RequestException):
    pass


class UnrewindableBodyError(RequestException):
    pass


class RequestsWarning(Warning):
    pass
