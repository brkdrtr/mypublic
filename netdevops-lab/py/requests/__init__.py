"""requests, NetDevOps Lab shim.

A faithful subset of the real requests API running over the lab transport, `import ndlab` then
ndlab.http(method, url, headers, body). Every host the lab knows answers, api.lab, r1.lab RESTCONF and so on.
Unknown hosts raise requests.exceptions.ConnectionError like a failed DNS lookup would.

    import requests
    r = requests.get('https://api.lab/v1/health', timeout=5)
    r.status_code, r.ok, r.headers['content-type'], r.json()
    r.raise_for_status()

Not simulated, real sockets, streaming bodies, proxies, certificates. HTTPAdapter(max_retries=...) is a no op,
write your own retry loop.
"""
__version__ = '2.32.3'
__title__ = 'requests'
__description__ = 'Python HTTP for Humans, NetDevOps Lab shim over LAB.http'
__url__ = 'https://api.lab/v1/docs'
__build__ = 0x023203
__author__ = 'NetDevOps Lab'
__license__ = 'Apache-2.0'

from . import exceptions, utils, packages  # noqa: E402,F401
from .exceptions import (RequestException, ConnectionError, HTTPError, Timeout, ConnectTimeout, ReadTimeout, TooManyRedirects,  # noqa: F401
                         URLRequired, JSONDecodeError, InvalidURL, InvalidSchema, MissingSchema)
from .structures import CaseInsensitiveDict  # noqa: F401
from .status_codes import codes  # noqa: F401
from .models import Request, PreparedRequest, Response  # noqa: F401
from .sessions import Session, session  # noqa: F401
from .api import request, get, head, post, patch, put, delete, options  # noqa: F401
from . import adapters, auth, models, sessions, status_codes, structures  # noqa: F401

__all__ = ['request', 'get', 'head', 'post', 'patch', 'put', 'delete', 'options', 'Session', 'session', 'Request', 'PreparedRequest', 'Response',
           'codes', 'exceptions', 'RequestException', 'ConnectionError', 'HTTPError', 'Timeout', 'ConnectTimeout', 'ReadTimeout', 'TooManyRedirects',
           'URLRequired', 'JSONDecodeError', 'InvalidURL', 'InvalidSchema', 'MissingSchema', 'CaseInsensitiveDict', 'utils', 'auth', 'adapters']
