"""ncclient.manager shim. connect() lab cihazina NETCONF oturumu acar, rpc'ler JS motoruna gider."""
import uuid
from lxml import etree

from ncclient.xml_ import BASE_NS_1_0, qualify, to_ele, to_xml, new_ele, sub_ele
from ncclient.operations.rpc import RPCReply, GetReply, RPCError, RaiseMode
from ncclient.transport.errors import SSHError, AuthenticationError
from ncclient.transport import SSHSession
import ndlab_util

OPERATIONS = {'get': 'Get', 'get_config': 'GetConfig', 'edit_config': 'EditConfig', 'copy_config': 'CopyConfig',
              'delete_config': 'DeleteConfig', 'lock': 'Lock', 'unlock': 'Unlock', 'commit': 'Commit',
              'discard_changes': 'DiscardChanges', 'validate': 'Validate', 'close_session': 'CloseSession',
              'kill_session': 'KillSession', 'rpc': 'GenericRPC', 'dispatch': 'GenericRPC', 'get_schema': 'GetSchema'}


def _abbreviate(uri):
    if uri.startswith('urn:ietf:params') and ':netconf:' in uri:
        splitted = uri.split(':')
        if ':capability:' in uri:
            if uri.startswith('urn:ietf:params:netconf:capability:'):
                return [':' + splitted[5], ':' + splitted[5] + ':' + splitted[6]]
        elif ':base:' in uri:
            return [':base', ':base' + ':' + splitted[5]]
    return []


class Capabilities(object):
    """server_capabilities. Uzerinde dongu kurulur, ':candidate' in caps gibi sorgulanir."""

    def __init__(self, capabilities):
        self._dict = {}
        for uri in capabilities:
            self._dict[uri] = _abbreviate(uri)

    def __contains__(self, key):
        if key in self._dict:
            return True
        for abbrs in self._dict.values():
            if key in abbrs:
                return True
        return False

    def __iter__(self):
        return iter(self._dict)

    def __len__(self):
        return len(self._dict)

    def __repr__(self):
        return repr(list(self._dict))

    def add(self, uri):
        self._dict[uri] = _abbreviate(uri)


class _LabSession(SSHSession):
    """JS netconf motoruna baglanan oturum."""

    def __init__(self, dev, host, port, session_id):
        SSHSession.__init__(self, host, port, session_id)
        self._dev = dev
        self._n = 0

    def next_message_id(self):
        self._n += 1
        return 'urn:uuid:%s' % uuid.uuid4()

    def send(self, xml):
        if not self.connected:
            raise SSHError('Session is closed')
        return str(self._dev.netconf.rpc(xml, self.id))

    def close(self):
        if self.connected:
            self._dev.netconf.closeSession(self.id)
            self.connected = False

    @property
    def server_capabilities(self):
        return Capabilities(list(self._dev.netconf.capabilities()))


def _build_filter(spec, capcheck=None):
    """ncclient.operations.util.build_filter ile ayni davranis."""
    if isinstance(spec, tuple):
        type_, criteria = spec
        if type_ == 'xpath':
            ele = new_ele('filter', type=type_)
            if isinstance(criteria, tuple):
                ns, select = criteria
                ele.attrib['select'] = select
                for k, v in ns.items():
                    etree.register_namespace(k, v)
            else:
                ele.attrib['select'] = criteria
            return ele
        if type_ == 'subtree':
            ele = new_ele('filter', type=type_)
            ele.append(to_ele(criteria))
            return ele
        raise ValueError('Invalid filter type %r' % type_)
    ele = to_ele(spec)
    if ele.tag in ('filter', qualify('filter')):
        return ele
    wrap = new_ele('filter', type='subtree')
    wrap.append(ele)
    return wrap


def _datastore_or_url(tag, name):
    node = new_ele(tag)
    if '://' in name:
        sub_ele(node, 'url').text = name
    else:
        sub_ele(node, name)
    return node


class LockContext(object):
    def __init__(self, manager, target):
        self._manager = manager
        self._target = target

    def __enter__(self):
        self._manager.lock(self._target)
        return self

    def __exit__(self, *args):
        self._manager.unlock(self._target)
        return False


class Manager(object):
    """NETCONF oturumu. with manager.connect(...) as m: m.get_config(...)"""

    def __init__(self, session, device_handler=None, timeout=30):
        self._session = session
        self._async_mode = False
        self._timeout = timeout
        self._raise_mode = RaiseMode.ALL
        self._huge_tree = False
        self._device_handler = device_handler

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close_session()
        return False

    @property
    def session(self):
        return self._session

    @property
    def session_id(self):
        return str(self._session.id)

    @property
    def connected(self):
        return self._session.connected

    @property
    def client_capabilities(self):
        return Capabilities(['urn:ietf:params:netconf:base:1.0', 'urn:ietf:params:netconf:base:1.1'])

    @property
    def server_capabilities(self):
        return self._session.server_capabilities

    def _get(self, name, default):
        return getattr(self, name, default)

    timeout = property(lambda self: self._timeout, lambda self, v: setattr(self, '_timeout', v))
    async_mode = property(lambda self: self._async_mode, lambda self, v: setattr(self, '_async_mode', v))
    raise_mode = property(lambda self: self._raise_mode, lambda self, v: setattr(self, '_raise_mode', v))
    huge_tree = property(lambda self: self._huge_tree, lambda self, v: setattr(self, '_huge_tree', v))

    def _send(self, op, reply_cls=RPCReply):
        rpc = etree.Element(qualify('rpc'), {'message-id': self._session.next_message_id()})
        rpc.append(op)
        raw = self._session.send(etree.tostring(rpc, encoding='unicode'))
        reply = reply_cls(raw)
        reply.parse()
        if reply.error is not None:
            if self._raise_mode == RaiseMode.ALL or (self._raise_mode == RaiseMode.ERRORS and reply.error.severity == 'error'):
                if len(reply.errors) > 1:
                    raise RPCError(to_ele(reply.errors[0].xml), errs=reply.errors)
                raise reply.error
        return reply

    def get(self, filter=None, with_defaults=None):
        node = new_ele('get')
        if filter is not None:
            node.append(_build_filter(filter))
        if with_defaults is not None:
            sub_ele(node, 'with-defaults').text = with_defaults
        return self._send(node, GetReply)

    def get_config(self, source, filter=None, with_defaults=None):
        node = new_ele('get-config')
        node.append(_datastore_or_url('source', source))
        if filter is not None:
            node.append(_build_filter(filter))
        if with_defaults is not None:
            sub_ele(node, 'with-defaults').text = with_defaults
        return self._send(node, GetReply)

    def edit_config(self, config, format='xml', target='candidate', default_operation=None, test_option=None, error_option=None):
        node = new_ele('edit-config')
        node.append(_datastore_or_url('target', target))
        if error_option is not None:
            sub_ele(node, 'error-option').text = error_option
        if test_option is not None:
            sub_ele(node, 'test-option').text = test_option
        if default_operation is not None:
            sub_ele(node, 'default-operation').text = default_operation
        if format == 'xml':
            cfg = to_ele(config)
            if cfg.tag not in ('config', qualify('config')):
                wrap = new_ele('config')
                wrap.append(cfg)
                cfg = wrap
            node.append(cfg)
        elif format == 'text':
            cfg = sub_ele(node, 'config-text')
            sub_ele(cfg, 'configuration-text').text = config
        else:
            raise ValueError('unsupported format %r' % format)
        return self._send(node)

    def copy_config(self, source, target):
        node = new_ele('copy-config')
        node.append(_datastore_or_url('target', target))
        node.append(_datastore_or_url('source', source))
        return self._send(node)

    def delete_config(self, target):
        node = new_ele('delete-config')
        node.append(_datastore_or_url('target', target))
        return self._send(node)

    def lock(self, target='candidate'):
        node = new_ele('lock')
        node.append(_datastore_or_url('target', target))
        return self._send(node)

    def unlock(self, target='candidate'):
        node = new_ele('unlock')
        node.append(_datastore_or_url('target', target))
        return self._send(node)

    def locked(self, target):
        return LockContext(self, target)

    def commit(self, confirmed=False, timeout=None, persist=None, persist_id=None):
        node = new_ele('commit')
        if confirmed:
            sub_ele(node, 'confirmed')
            if timeout is not None:
                sub_ele(node, 'confirm-timeout').text = str(timeout)
        return self._send(node)

    def discard_changes(self):
        return self._send(new_ele('discard-changes'))

    def validate(self, source='candidate'):
        node = new_ele('validate')
        if etree.iselement(source) or (isinstance(source, str) and source.strip().startswith('<')):
            src = sub_ele(node, 'source')
            cfg = to_ele(source)
            if cfg.tag not in ('config', qualify('config')):
                wrap = new_ele('config')
                wrap.append(cfg)
                cfg = wrap
            src.append(cfg)
        else:
            node.append(_datastore_or_url('source', source))
        return self._send(node)

    def close_session(self):
        if not self._session.connected:
            return None
        node = new_ele('close-session')
        try:
            reply = self._send(node)
        finally:
            self._session.close()
        return reply

    def kill_session(self, session_id):
        node = new_ele('kill-session')
        sub_ele(node, 'session-id').text = str(session_id)
        return self._send(node)

    def get_schema(self, identifier, version=None, format=None):
        node = etree.Element('{urn:ietf:params:xml:ns:yang:ietf-netconf-monitoring}get-schema')
        etree.SubElement(node, '{urn:ietf:params:xml:ns:yang:ietf-netconf-monitoring}identifier').text = identifier
        return self._send(node, GetReply)

    def rpc(self, rpc_command, source=None, filter=None):
        return self.dispatch(rpc_command, source, filter)

    def dispatch(self, rpc_command, source=None, filter=None):
        node = to_ele(rpc_command)
        if source is not None:
            node.append(_datastore_or_url('source', source))
        if filter is not None:
            node.append(_build_filter(filter))
        return self._send(node)

    def scp(self):
        raise NotImplementedError('scp bu lab\'da yok')

    def __getattr__(self, name):
        if name in OPERATIONS:
            raise AttributeError(name)
        raise AttributeError("'Manager' object has no attribute '%s'" % name)


def connect_ssh(*args, **kwds):
    host = kwds.get('host') or (args[0] if args else None)
    port = int(kwds.get('port', 830))
    username = kwds.get('username')
    password = kwds.get('password')
    timeout = kwds.get('timeout', 30)
    device_params = kwds.get('device_params') or {}
    if host is None:
        raise SSHError('host is required')
    dev = ndlab_util.find_device(host)
    if dev is None or port != 830:
        raise SSHError('Could not open socket to %s:%s' % (host, port))
    if username is None:
        import os
        username = os.environ.get('USER', 'burak')
    res = dev.netconf.openSession(username, password if password is not None else '', '10.0.0.100')
    if not res.ok:
        raise AuthenticationError('Authentication failed, user %s' % username)
    session = _LabSession(dev, host, port, int(res.sessionId))
    m = Manager(session, device_params.get('name'), timeout=timeout)
    return m


def connect(*args, **kwds):
    if 'host' in kwds or args:
        return connect_ssh(*args, **kwds)
    raise SSHError('host is required')


connect_ioproc = connect_ssh
