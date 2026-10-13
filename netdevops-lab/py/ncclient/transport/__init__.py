from ncclient.transport.errors import (TransportError, SessionCloseError, SSHError,  # noqa: F401
                                       AuthenticationError, SSHUnknownHostError, PermissionError)


class Session(object):
    """Oturum nesnesi, sadece bilgi tasir."""

    def __init__(self, host, port, session_id):
        self.host = host
        self.port = port
        self.id = session_id
        self.connected = True


class SSHSession(Session):
    pass
