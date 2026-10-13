"""urllib3, NetDevOps Lab stub. Only enough surface for `from urllib3.util.retry import Retry` and disable_warnings."""
__version__ = '2.2.3'
from . import util, exceptions  # noqa: F401
from .util.retry import Retry  # noqa: F401


def disable_warnings(category=None):
    """Accepted and ignored, the lab has no TLS warnings to silence."""
    return None


class PoolManager:
    def __init__(self, *args, **kwargs):
        pass

    def request(self, *args, **kwargs):
        raise NotImplementedError('urllib3.PoolManager is not simulated, use requests')
