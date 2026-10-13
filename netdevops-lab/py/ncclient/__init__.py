"""ncclient shim. Gercek ncclient API'si ile ayni sekilde kullanilir, NETCONF trafigi
lab icindeki simule cihaza gider. Gercek cihazda ayni kod ncclient ile calisir."""
__version__ = '0.6.15'


class NCClientError(Exception):
    pass


from ncclient import manager  # noqa: E402,F401
from ncclient import operations  # noqa: E402,F401
from ncclient import transport  # noqa: E402,F401
from ncclient import xml_  # noqa: E402,F401
