"""rpc-reply ve rpc-error nesneleri, ncclient.operations.rpc ile ayni alanlar."""
from lxml import etree
from ncclient import NCClientError
from ncclient.xml_ import BASE_NS_1_0, qualify, to_ele, to_xml


class OperationError(NCClientError):
    pass


class TimeoutExpiredError(NCClientError):
    pass


class MissingCapabilityError(NCClientError):
    pass


class RaiseMode(object):
    NONE = 0
    ERRORS = 1
    ALL = 2


class RPCError(OperationError):
    """Sunucudan donen <rpc-error>. str() mesaji verir, .tag .severity .path .info alanlari var."""
    tag_to_attr = {qualify('error-type'): '_type', qualify('error-tag'): '_tag', qualify('error-app-tag'): '_app_tag',
                   qualify('error-severity'): '_severity', qualify('error-info'): '_info', qualify('error-path'): '_path',
                   qualify('error-message'): '_message'}

    def __init__(self, raw, errs=None):
        self._raw = raw
        if errs is None:
            self._errlist = None
            for attr in RPCError.tag_to_attr.values():
                setattr(self, attr, None)
            for subele in raw:
                attr = RPCError.tag_to_attr.get(subele.tag, None)
                if attr is not None:
                    setattr(self, attr, subele.text if attr != '_info' else etree.tostring(subele, encoding='unicode'))
            if self.message is not None:
                OperationError.__init__(self, self.message)
            else:
                OperationError.__init__(self, self.to_dict())
        else:
            self._errlist = errs
            OperationError.__init__(self, ', '.join([str(e) for e in errs]))

    def to_dict(self):
        return dict([(attr[1:], getattr(self, attr)) for attr in RPCError.tag_to_attr.values()])

    @property
    def xml(self):
        return etree.tostring(self._raw, encoding='unicode')

    @property
    def type(self):
        return self._type

    @property
    def tag(self):
        return self._tag

    @property
    def app_tag(self):
        return self._app_tag

    @property
    def severity(self):
        return self._severity

    @property
    def path(self):
        return self._path

    @property
    def message(self):
        return self._message

    @property
    def info(self):
        return self._info

    @property
    def errlist(self):
        return self._errlist


class RPCReply(object):
    """<rpc-reply>. .xml ham metin, .ok basari, .errors rpc-error listesi, .error ilki."""
    ERROR_CLS = RPCError

    def __init__(self, raw, huge_tree=False, parsing_error_transform=None):
        self._raw = raw
        self._parsing_error_transform = parsing_error_transform
        self._parsed = False
        self._root = None
        self._errors = []
        self._huge_tree = huge_tree

    def __repr__(self):
        return self._raw

    def __str__(self):
        return self._raw

    def parse(self):
        if self._parsed:
            return
        root = self._root = to_ele(self._raw)
        ok = root.find(qualify('ok'))
        if ok is None:
            error = root.find(qualify('rpc-error'))
            if error is not None:
                for err in root.getiterator(error.tag) if hasattr(root, 'getiterator') else root.iter(error.tag):
                    self._errors.append(self.ERROR_CLS(err))
        self._parsing_hook(root)
        self._parsed = True

    def _parsing_hook(self, root):
        pass

    @property
    def xml(self):
        return self._raw

    @property
    def ok(self):
        return not self.errors

    @property
    def error(self):
        if self.errors:
            return self.errors[0]
        return None

    @property
    def errors(self):
        if not self._parsed:
            self.parse()
        return self._errors


class GetReply(RPCReply):
    """get ve get-config cevabi, .data_ele lxml elemani, .data_xml metin, .data ayni eleman."""

    def _parsing_hook(self, root):
        self._data = None
        if not self._errors:
            self._data = root.find(qualify('data'))

    @property
    def data_ele(self):
        if not self._parsed:
            self.parse()
        return self._data

    @property
    def data_xml(self):
        if not self._parsed:
            self.parse()
        return to_xml(self._data) if self._data is not None else None

    data = data_ele


class RPC(object):
    """Ham rpc gonderimi, Manager.rpc ve dispatch bunu kullanir."""
    REPLY_CLS = RPCReply

    def __init__(self, session, device_handler=None, async_mode=False, timeout=30, raise_mode=RaiseMode.NONE, huge_tree=False):
        self._session = session
        self._raise_mode = raise_mode
        self._timeout = timeout

    def _request(self, op):
        rpc = etree.Element(qualify('rpc'), {'message-id': self._session.next_message_id()})
        rpc.append(to_ele(op))
        raw = self._session.send(etree.tostring(rpc, encoding='unicode'))
        reply = self.REPLY_CLS(raw)
        reply.parse()
        if reply.error is not None:
            if self._raise_mode == RaiseMode.ALL or (self._raise_mode == RaiseMode.ERRORS and reply.error.severity == 'error'):
                raise reply.error
        return reply

    def request(self, op):
        return self._request(op)
