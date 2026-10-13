"""pygnmi.client shim. gNMIclient, gNMIException ve telemetryParser gercek paketle ayni sekilde kullanilir."""
import json
import ndlab_util


class gNMIException(Exception):
    def __init__(self, message, orig_exc=None):
        super().__init__(message)
        self.orig_exc = orig_exc


def _rpc_error(code, message):
    return '<_InactiveRpcError of RPC that terminated with:\n\tstatus = StatusCode.%s\n\tdetails = "%s"\n>' % (code.upper().replace('INVALIDARGUMENT', 'INVALID_ARGUMENT'), message)


def telemetryParser(in_message=None, debug=False):
    """Gercek pygnmi'de protobuf mesajini dict'e cevirir. Lab'da mesajlar zaten dict gelir."""
    if in_message is None:
        return {}
    if isinstance(in_message, dict):
        return in_message
    return ndlab_util.to_py(in_message)


class gNMIclient(object):
    """with gNMIclient(target=('r1.lab', 57400), username='admin', password='admin', insecure=True) as gc: ..."""

    def __init__(self, target, username=None, password=None, debug=False, insecure=False, path_cert=None,
                 path_key=None, path_root=None, override=None, skip_verify=False, gnmi_timeout=5,
                 grpc_options=None, show_diff=None, token=None, no_qos_marking=False, **kwargs):
        if isinstance(target, str):
            host, _, port = target.rpartition(':')
            target = (host or port, int(port) if host else 57400)
        self.__target = (str(target[0]), int(target[1]) if len(target) > 1 else 57400)
        self.__username = username
        self.__password = password
        self.__insecure = insecure or skip_verify or bool(path_root)
        self.__timeout = gnmi_timeout
        self.__show_diff = show_diff
        self._dev = None
        self.__connected = False

    def __enter__(self):
        return self.connect()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False

    def connect(self, timeout=None):
        host, port = self.__target
        dev = ndlab_util.find_device(host)
        if dev is None:
            raise gNMIException('Failed to connect to %s:%s, name resolution failed or host unreachable' % (host, port))
        if port != 57400:
            raise gNMIException('Failed to connect to %s:%s, connection refused' % (host, port))
        if not self.__insecure:
            raise gNMIException('Failed to setup gRPC channel to %s:%s, TLS certificate verification failed. Use insecure=True or skip_verify=True in the lab' % (host, port))
        if not ndlab_util.check_login(dev, self.__username, self.__password):
            raise gNMIException(_rpc_error('UNAUTHENTICATED', 'Invalid username or password'))
        self._dev = dev
        self.__connected = True
        return self

    def close(self):
        self.__connected = False

    def _check(self):
        if not self.__connected:
            raise gNMIException('Client is not connected, use with gNMIclient(...) as gc or call connect()')

    def capabilities(self):
        self._check()
        r = ndlab_util.to_py(self._dev.gnmi.capabilities())
        return {'supported_models': r['supported_models'], 'supported_encodings': r['supported_encodings'], 'gnmi_version': r['gNMI_version']}

    def get(self, prefix='', path=None, target=None, datatype='all', encoding='json'):
        self._check()
        if path is None:
            path = ['/']
        if isinstance(path, str):
            path = [path]
        paths = [(prefix.rstrip('/') + '/' + p.lstrip('/')) if prefix else p for p in path]
        r = ndlab_util.to_py(self._dev.gnmi.get(json.dumps(paths), encoding, datatype))
        if r.get('error'):
            raise gNMIException('GetRequest failed: %s' % _rpc_error(r['error']['code'], r['error']['message']))
        return r

    def set(self, delete=None, replace=None, update=None, encoding='json', update_ext=None, target=None, extension=None):
        self._check()
        req = {'delete': [], 'replace': [], 'update': []}
        for p in delete or []:
            req['delete'].append(p)
        for kind, items in (('replace', replace), ('update', update)):
            for item in items or []:
                if isinstance(item, (list, tuple)):
                    p, v = item[0], item[1] if len(item) > 1 else None
                else:
                    p, v = item.get('path'), item.get('val', item.get('value'))
                req[kind].append([p, v])
        r = ndlab_util.to_py(self._dev.gnmi.set(json.dumps(req), encoding))
        if r.get('error'):
            raise gNMIException('SetRequest failed: %s' % _rpc_error(r['error']['code'], r['error']['message']))
        return r

    def subscribe2(self, subscribe, target=None, extension=None):
        """Abonelik, dict listesi doner. Gercek pygnmi'de sonsuz akis, lab'da mode once gibi sinirli."""
        self._check()
        mode = str(subscribe.get('mode', 'stream')).lower()
        encoding = subscribe.get('encoding', 'json')
        subs = subscribe.get('subscription') or []
        if not subs:
            raise gNMIException('SubscribeRequest failed: subscription list is empty')
        results = []
        for s in subs:
            paths = s.get('path')
            if isinstance(paths, str):
                paths = [paths]
            smode = str(s.get('mode', 'sample')).lower() if mode == 'stream' else mode
            interval = s.get('sample_interval', 10000000000)
            count = int(s.get('count', subscribe.get('count', 3)))
            r = ndlab_util.to_py(self._dev.gnmi.subscribe(json.dumps(paths), smode, interval, count, encoding))
            if isinstance(r, dict) and r.get('error'):
                raise gNMIException('SubscribeRequest failed: %s' % _rpc_error(r['error']['code'], r['error']['message']))
            results.extend(r)
        return iter(results)

    def subscribe(self, subscribe=None, poll=None, aliases=None, timeout=0.0):
        return self.subscribe2(subscribe or {})

    subscribe_stream = subscribe2
    subscribe_once = subscribe2
    subscribe_poll = subscribe2
