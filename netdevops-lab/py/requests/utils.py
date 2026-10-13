"""requests.utils, the handful of helpers people import."""
from urllib.parse import quote, unquote, urlparse, urlunparse
from .sessions import default_headers  # noqa: F401
from .structures import CaseInsensitiveDict  # noqa: F401


def dict_from_cookiejar(cj):
    return dict(cj)


def get_encoding_from_headers(headers):
    ct = headers.get('content-type', '') if headers else ''
    if 'charset=' in ct:
        return ct.split('charset=')[1].split(';')[0].strip()
    if 'text' in ct:
        return 'ISO-8859-1'
    if 'application/json' in ct:
        return 'utf-8'
    return None


def requote_uri(uri):
    return quote(unquote(uri), safe="!#$%&'()*+,/:;=?@[]~")


def urldefragauth(url):
    scheme, netloc, path, params, query, fragment = urlparse(url)
    if not netloc:
        netloc, path = path, netloc
    netloc = netloc.rsplit('@', 1)[-1]
    return urlunparse((scheme, netloc, path, params, query, ''))


def parse_header_links(value):
    links = []
    for val in value.split(','):
        url, *params = val.split(';')
        link = {'url': url.strip('<> \'"')}
        for param in params:
            if '=' in param:
                k, v = param.split('=', 1)
                link[k.strip()] = v.strip('\'" ')
        links.append(link)
    return links
