"""requests.auth, HTTPBasicAuth and friends. An auth object is a callable that mutates the PreparedRequest."""
import base64


def _basic_auth_str(username, password):
    if isinstance(username, str):
        username = username.encode('latin1')
    if isinstance(password, str):
        password = password.encode('latin1')
    return 'Basic ' + base64.b64encode(b':'.join((username, password))).strip().decode('ascii')


class AuthBase:
    """Base class that all auth implementations derive from."""

    def __call__(self, r):
        raise NotImplementedError('Auth hooks must be callable.')


class HTTPBasicAuth(AuthBase):
    """Attaches HTTP Basic Authentication to the given Request object."""

    def __init__(self, username, password):
        self.username = username
        self.password = password

    def __eq__(self, other):
        return all([self.username == getattr(other, 'username', None), self.password == getattr(other, 'password', None)])

    def __ne__(self, other):
        return not self == other

    def __call__(self, r):
        r.headers['Authorization'] = _basic_auth_str(self.username, self.password)
        return r


class HTTPProxyAuth(HTTPBasicAuth):
    def __call__(self, r):
        r.headers['Proxy-Authorization'] = _basic_auth_str(self.username, self.password)
        return r


class HTTPDigestAuth(AuthBase):
    """Digest auth is not simulated in the lab, it sends a Basic header so the call still works."""

    def __init__(self, username, password):
        self.username = username
        self.password = password

    def __call__(self, r):
        r.headers['Authorization'] = _basic_auth_str(self.username, self.password)
        return r
