"""requests.packages, re-exports the lab urllib3 shim so `from requests.packages.urllib3.util.retry import Retry` parses."""
import sys
import urllib3

for mod in list(sys.modules):
    if mod == 'urllib3' or mod.startswith('urllib3.'):
        sys.modules['requests.packages.' + mod] = sys.modules[mod]
