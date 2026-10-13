"""netmiko.exceptions ile ayni istisna adlari."""


class NetmikoBaseException(Exception):
    pass


class ConnectionException(NetmikoBaseException):
    pass


class NetmikoTimeoutException(ConnectionException):
    pass


class NetmikoAuthenticationException(ConnectionException):
    pass


class ConfigInvalidException(NetmikoBaseException):
    pass


class ReadException(NetmikoBaseException):
    pass


class ReadTimeout(ReadException):
    pass


class WriteException(NetmikoBaseException):
    pass


NetMikoTimeoutException = NetmikoTimeoutException
NetMikoAuthenticationException = NetmikoAuthenticationException
