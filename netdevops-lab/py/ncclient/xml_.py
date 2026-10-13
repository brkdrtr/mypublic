"""XML yardimcilari, ncclient.xml_ ile ayni adlar."""
from lxml import etree

BASE_NS_1_0 = 'urn:ietf:params:xml:ns:netconf:base:1.0'
NETCONF_MONITORING_NS = 'urn:ietf:params:xml:ns:yang:ietf-netconf-monitoring'
NETCONF_NOTIFICATION_NS = 'urn:ietf:params:xml:ns:netconf:notification:1.0'
CISCO_CPI_1_0 = 'http://www.cisco.com/cpi_10/schema'
NXOS_1_0 = 'http://www.cisco.com/nxos:1.0'
JUNIPER_1_1 = 'http://xml.juniper.net/xnm/1.1/xnm'
TAILF_AAA_1_1 = 'http://tail-f.com/ns/aaa/1.1'


def qualify(tag, ns=BASE_NS_1_0):
    if ns is None:
        return tag
    return '{%s}%s' % (ns, tag)


def to_xml(ele, encoding='UTF-8', pretty_print=False):
    xml = etree.tostring(ele, encoding=encoding, pretty_print=pretty_print).decode(encoding)
    return xml if xml.startswith('<?xml') else '<?xml version="1.0" encoding="%s"?>%s' % (encoding, xml)


def to_ele(x, huge_tree=False):
    if etree.iselement(x):
        return x
    if isinstance(x, bytes):
        return etree.fromstring(x)
    return etree.fromstring(x.encode('UTF-8'))


def parse_root(raw):
    fp = raw if hasattr(raw, 'read') else None
    ele = etree.fromstring(raw.encode('UTF-8')) if fp is None else etree.parse(fp).getroot()
    return ele.tag, ele.attrib


def validated_element(x, tags=None, attrs=None):
    ele = to_ele(x)
    if tags:
        if isinstance(tags, str):
            tags = [tags]
        if ele.tag not in tags:
            raise XMLError('Element [%s] does not meet requirement' % ele.tag)
    return ele


def new_ele(tag, attrs=None, **extra):
    return etree.Element(qualify(tag), dict(attrs or {}), **extra)


def new_ele_ns(tag, ns, attrs=None, **extra):
    return etree.Element(qualify(tag, ns), dict(attrs or {}), **extra)


def sub_ele(parent, tag, attrs=None, **extra):
    return etree.SubElement(parent, qualify(tag), dict(attrs or {}), **extra)


def sub_ele_ns(parent, tag, ns, attrs=None, **extra):
    return etree.SubElement(parent, qualify(tag, ns), dict(attrs or {}), **extra)


class XMLError(Exception):
    pass
