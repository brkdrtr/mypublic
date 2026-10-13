class Timeout:
    DEFAULT_TIMEOUT = object()

    def __init__(self, total=None, connect=None, read=None):
        self.total = total
        self.connect = connect
        self.read = read

    def __repr__(self):
        return f'Timeout(connect={self.connect}, read={self.read}, total={self.total})'
