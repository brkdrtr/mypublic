"""NetDevOps Lab ortak yardimcilar. Python shim'leri JS cihaz nesnesine buradan ulasir."""
import json

try:
    import ndlab  # Pyodide icinde py.js'in kaydettigi kopru modulu
except ImportError:  # pragma: no cover, gercek makinede calisirsa
    ndlab = None


def device_names():
    if ndlab is None:
        return []
    return list(ndlab.devices())


def find_device(host):
    """host adi ya da IP ile LAB.devices icindeki JS cihaz nesnesini bulur, yoksa None."""
    if ndlab is None or host is None:
        return None
    h = str(host).strip().lower()
    for name in device_names():
        d = ndlab.device(name)
        if d is None:
            continue
        try:
            if h in (str(d.host).lower(), str(d.ip).lower(), str(d.name).lower()):
                return d
        except Exception:
            continue
    return None


def to_py(obj):
    """JS nesnesini JSON uzerinden saf Python'a cevirir."""
    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool, list, dict)):
        return obj
    return json.loads(ndlab.toJson(obj))


def check_login(dev, username, password):
    """Cihazdaki kullanici listesine gore kimlik dogrular."""
    try:
        for u in to_py(dev.model.users):
            if u.get('name') == username and u.get('secret') == password:
                return True
    except Exception:
        pass
    return False
