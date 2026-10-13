from ncclient import NCClientError


class TransportError(NCClientError):
    pass


class SessionCloseError(TransportError):
    pass


class SSHError(TransportError):
    pass


class AuthenticationError(TransportError):
    pass


class PermissionError(TransportError):
    pass


class SSHUnknownHostError(SSHError):
    def __init__(self, host, fingerprint):
        SSHError.__init__(self, 'Unknown host key [%s] for [%s]' % (fingerprint, host))
        self.host = host
        self.fingerprint = fingerprint
