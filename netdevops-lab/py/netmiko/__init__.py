"""netmiko shim. ConnectHandler lab cihazinin CLI'sine baglanir, API gercek netmiko ile ayni."""
import re
import ndlab_util
from netmiko.exceptions import (NetmikoTimeoutException, NetmikoAuthenticationException, NetMikoTimeoutException,  # noqa: F401
                                NetMikoAuthenticationException, ConfigInvalidException, ReadTimeout, ConnectionException)

__version__ = '4.4.0'

CLASS_MAPPER_BASE = ['arista_eos', 'cisco_asa', 'cisco_ios', 'cisco_nxos', 'cisco_xe', 'cisco_xr', 'juniper_junos', 'linux',
                     'huawei', 'fortinet', 'paloalto_panos', 'mikrotik_routeros', 'hp_procurve', 'aruba_os', 'dell_os10', 'autodetect']
platforms = sorted(CLASS_MAPPER_BASE)
platforms_str = '\n'.join(platforms)


class BaseConnection(object):
    """SSH oturumu. send_command, send_config_set, find_prompt, save_config, disconnect."""

    def __init__(self, ip='', host='', username='', password=None, secret='', port=None, device_type='', verbose=False,
                 global_delay_factor=1.0, use_keys=False, key_file=None, timeout=100, session_timeout=60, auth_timeout=None,
                 banner_timeout=15, conn_timeout=10, fast_cli=True, session_log=None, read_timeout_override=None, **kwargs):
        self.host = host or ip
        self.ip = ip or host
        self.port = int(port or 22)
        self.username = username
        self.password = password
        self.secret = secret
        self.device_type = device_type
        self.fast_cli = fast_cli
        self._dev = None
        self._in_enable = True
        self._in_config = False
        self.remote_conn = None
        self.establish_connection()

    def establish_connection(self, width=511, height=1000):
        dev = ndlab_util.find_device(self.host)
        if dev is None or self.port != 22:
            raise NetmikoTimeoutException(
                'TCP connection to device failed.\n\nCommon causes of this problem are:\n1. Incorrect hostname or IP address.\n'
                '2. Wrong TCP port.\n3. Intermediate firewall blocking access.\n\nDevice settings: %s %s:%s\n\n' % (self.device_type, self.host, self.port))
        if not ndlab_util.check_login(dev, self.username, self.password if self.password is not None else ''):
            raise NetmikoAuthenticationException(
                'Authentication to device failed.\n\nCommon causes of this problem are:\n1. Invalid username and password\n'
                '2. Incorrect SSH-key file\n3. Connecting to the wrong device\n\nDevice settings: %s %s:%s\n\n' % (self.device_type, self.host, self.port))
        self._dev = dev
        self.remote_conn = self
        self.base_prompt = str(dev.model.hostname)
        return ''

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
        return False

    def _hostname(self):
        return str(self._dev.model.hostname)

    def _alive(self):
        if self._dev is None:
            raise ConnectionException('Connection is closed, call ConnectHandler again')

    def is_alive(self):
        return self._dev is not None

    def find_prompt(self, delay_factor=1.0, pattern=None):
        self._alive()
        if self._in_config:
            return '%s(config)#' % self._hostname()
        return '%s%s' % (self._hostname(), '#' if self._in_enable else '>')

    def check_enable_mode(self, check_string='#'):
        return self._in_enable

    def enable(self, cmd='enable', pattern='ssword', enable_pattern=None, check_state=True, re_flags=re.IGNORECASE):
        self._alive()
        self._in_enable = True
        return ''

    def exit_enable_mode(self, exit_command='disable'):
        self._in_enable = False
        return ''

    def check_config_mode(self, check_string=')#', pattern='', force_regex=False):
        return self._in_config

    def config_mode(self, config_command='configure terminal', pattern='', re_flags=0):
        self._alive()
        self._in_config = True
        return '%s\nEnter configuration commands, one per line.  End with CNTL/Z.\n%s(config)#' % (config_command, self._hostname())

    def exit_config_mode(self, exit_config='end', pattern=r'#.*'):
        self._in_config = False
        return 'end\n%s#' % self._hostname()

    def send_command(self, command_string, expect_string=None, read_timeout=10.0, delay_factor=None, max_loops=None,
                     auto_find_prompt=True, strip_prompt=True, strip_command=True, normalize=True, use_textfsm=False,
                     textfsm_template=None, use_ttp=False, ttp_template=None, use_genie=False, cmd_verify=True, raise_parsing_error=False):
        self._alive()
        if self._in_config:
            r = ndlab_util.to_py(self._dev.configure([command_string]))
            out = r['output']
        else:
            out = str(self._dev.cli(command_string))
        out = out.rstrip('\n')
        if not strip_command:
            out = command_string + '\n' + out
        if not strip_prompt:
            out = out + '\n' + self.find_prompt()
        if use_textfsm:
            parsed = _textfsm(command_string, out, self._hostname())
            if parsed is not None:
                return parsed
            if raise_parsing_error:
                raise ValueError('No TextFSM template found for %s' % command_string)
        return out

    send_command_timing = send_command
    send_command_expect = send_command

    def send_config_set(self, config_commands=None, exit_config_mode=True, read_timeout=None, delay_factor=None, max_loops=None,
                        strip_prompt=False, strip_command=False, config_mode_command=None, cmd_verify=True, enter_config_mode=True,
                        error_pattern='', terminator=r'#', bypass_commands=None):
        self._alive()
        if config_commands is None:
            return ''
        if isinstance(config_commands, str):
            config_commands = [config_commands]
        cmds = [str(c) for c in config_commands]
        out = ''
        if enter_config_mode:
            out += '%s\nEnter configuration commands, one per line.  End with CNTL/Z.\n' % (config_mode_command or 'configure terminal')
            self._in_config = True
        r = ndlab_util.to_py(self._dev.configure(cmds))
        out += r['output']
        if error_pattern and re.search(error_pattern, out):
            raise ConfigInvalidException('Invalid input detected at command: %s\n\n%s' % (cmds, out))
        if exit_config_mode:
            out += self.exit_config_mode()
        return out

    def send_config_from_file(self, config_file=None, **kwargs):
        with open(config_file) as f:
            lines = [l.rstrip('\n') for l in f if l.strip()]
        return self.send_config_set(lines, **kwargs)

    def save_config(self, cmd='write memory', confirm=False, confirm_response=''):
        self._alive()
        out = str(self._dev.cli(cmd)).rstrip('\n')
        return '%s\n%s\n%s#' % (cmd, out, self._hostname())

    def commit(self, *args, **kwargs):
        raise AttributeError('Network device does not support commit')

    def disconnect(self):
        self._dev = None
        self.remote_conn = None

    def cleanup(self, command=''):
        return None

    def write_channel(self, out_data):
        return None

    def read_channel(self):
        return ''


class CiscoBaseConnection(BaseConnection):
    pass


class CiscoIosBase(CiscoBaseConnection):
    pass


class CiscoIosSSH(CiscoIosBase):
    pass


class CiscoXeSSH(CiscoIosSSH):
    pass


CLASS_MAPPER = {'cisco_ios': CiscoIosSSH, 'cisco_xe': CiscoXeSSH, 'cisco_ios_telnet': CiscoIosSSH, 'cisco_xe_telnet': CiscoXeSSH}


def ConnectHandler(*args, **kwargs):
    device_type = kwargs.pop('device_type', None)
    if device_type not in CLASS_MAPPER_BASE:
        raise ValueError("Unsupported 'device_type' currently supported platforms are: \n%s" % platforms_str)
    cls = CLASS_MAPPER.get(device_type)
    if cls is None:
        raise ValueError("device_type %s is not a Cisco IOS XE device, the lab only has cisco_xe and cisco_ios devices" % device_type)
    return cls(*args, device_type=device_type, **kwargs)


Netmiko = ConnectHandler


def redispatch(obj, device_type, session_prep=True):
    obj.device_type = device_type
    return obj


def _textfsm(cmd, out, hostname):
    """ntc-templates alan adlariyla kucuk bir TextFSM benzeri ayristirici."""
    c = re.sub(r'\s+', ' ', cmd.strip().lower())
    lines = out.split('\n')
    if re.match(r'^sh(o|ow)? ip int(e|er|erf|erfa|erface)? br(i|ie|ief)?$', c):
        rows = []
        for l in lines[1:]:
            m = re.match(r'^(\S+)\s+(\S+)\s+\S+\s+\S+\s+(up|down|administratively down)\s+(up|down)', l)
            if m:
                rows.append({'interface': m.group(1), 'ip_address': m.group(2), 'status': m.group(3), 'proto': m.group(4)})
        return rows
    if re.match(r'^sh(o|ow)? ver(s|si|sio|sion)?$', c):
        d = {'software_image': 'X86_64_LINUX_IOSD-UNIVERSALK9-M', 'version': '', 'release': 'fc3', 'rommon': 'IOS-XE', 'hostname': hostname,
             'uptime': '', 'uptime_years': '', 'uptime_weeks': '', 'uptime_days': '', 'uptime_hours': '', 'uptime_minutes': '',
             'reload_reason': '', 'running_image': 'packages.conf', 'hardware': [], 'serial': [], 'config_register': '', 'mac_address': [], 'restarted': ''}
        for l in lines:
            m = re.search(r'Version (\S+), RELEASE', l)
            if m:
                d['version'] = m.group(1)
            m = re.match(r'^(\S+) uptime is (.*)$', l)
            if m:
                d['uptime'] = m.group(2)
                for unit in ('years', 'weeks', 'days', 'hours', 'minutes'):
                    mm = re.search(r'(\d+) %s' % unit[:-1], m.group(2))
                    d['uptime_' + unit] = mm.group(1) if mm else ''
            m = re.match(r'^Last reload reason: (.*)$', l)
            if m:
                d['reload_reason'] = m.group(1)
            m = re.match(r'^cisco (\S+) .*processor', l)
            if m:
                d['hardware'].append(m.group(1))
            m = re.match(r'^Processor board ID (\S+)', l)
            if m:
                d['serial'].append(m.group(1))
            m = re.match(r'^Configuration register is (\S+)', l)
            if m:
                d['config_register'] = m.group(1)
        return [d]
    if re.match(r'^sh(o|ow)? vlan( br(i|ie|ief)?)?$', c):
        rows = []
        for l in lines:
            m = re.match(r'^(\d+)\s+(\S+)\s+(active|act/unsup|suspended)\s*(.*)$', l)
            if m:
                rows.append({'vlan_id': m.group(1), 'vlan_name': m.group(2), 'status': m.group(3), 'interfaces': [x.strip() for x in m.group(4).split(',') if x.strip()]})
        return rows
    if re.match(r'^sh(o|ow)? (ip )?bgp sum(m|ma|mar|mary)?$', c):
        rid, las = '', ''
        rows = []
        for l in lines:
            m = re.match(r'^BGP router identifier (\S+), local AS number (\d+)', l)
            if m:
                rid, las = m.group(1), m.group(2)
            m = re.match(r'^(\d+\.\d+\.\d+\.\d+)\s+4\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+?)\s*$', l)
            if m:
                rows.append({'router_id': rid, 'local_as': las, 'bgp_neigh': m.group(1), 'neigh_as': m.group(2), 'msg_rcvd': m.group(3), 'msg_sent': m.group(4),
                             'tbl_ver': m.group(5), 'in_q': m.group(6), 'out_q': m.group(7), 'up_down': m.group(8), 'state_pfxrcd': m.group(9)})
        return rows
    if re.match(r'^sh(o|ow)? int(e|er|erf|erfa|erface|erfaces)? desc(r|ri|rip|ript|ripti|riptio|ription)?$', c):
        rows = []
        for l in lines[1:]:
            m = re.match(r'^(\S+)\s+(up|down|admin down)\s+(up|down)\s*(.*)$', l)
            if m:
                rows.append({'port': m.group(1), 'status': m.group(2), 'protocol': m.group(3), 'descrip': m.group(4)})
        return rows
    return None
