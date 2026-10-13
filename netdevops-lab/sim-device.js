'use strict';
/* NetDevOps Lab cihaz simulatoru. r1 ve r2, IOS-XE benzeri iki router.
   Tek model, dort kapi. CLI, configure(), NETCONF, RESTCONF ve gNMI hepsi ayni
   SIMD model nesnesini okur ve yazar. Boylece ncclient ile yapilan degisiklik
   ssh show komutunda ve RESTCONF GET'te gorunur.
   Butun top level adlar SIMD_ ya da simd on eki tasir. Sozlesme CONTRACT.md */

/* ---------- genel yardimcilar ---------- */

const SIMD_NS = {
  nc: 'urn:ietf:params:xml:ns:netconf:base:1.0',
  'ietf-interfaces': 'urn:ietf:params:xml:ns:yang:ietf-interfaces',
  'ietf-ip': 'urn:ietf:params:xml:ns:yang:ietf-ip',
  'iana-if-type': 'urn:ietf:params:xml:ns:yang:iana-if-type',
  'ietf-yang-types': 'urn:ietf:params:xml:ns:yang:ietf-yang-types',
  'ietf-inet-types': 'urn:ietf:params:xml:ns:yang:ietf-inet-types',
  'Cisco-IOS-XE-native': 'http://cisco.com/ns/yang/Cisco-IOS-XE-native',
  'Cisco-IOS-XE-bgp': 'http://cisco.com/ns/yang/Cisco-IOS-XE-bgp',
  'Cisco-IOS-XE-vlan': 'http://cisco.com/ns/yang/Cisco-IOS-XE-vlan',
  'Cisco-IOS-XE-ntp': 'http://cisco.com/ns/yang/Cisco-IOS-XE-ntp',
  'Cisco-IOS-XE-logging': 'http://cisco.com/ns/yang/Cisco-IOS-XE-logging',
  'Cisco-IOS-XE-snmp': 'http://cisco.com/ns/yang/Cisco-IOS-XE-snmp',
  'Cisco-IOS-XE-rpc': 'http://cisco.com/ns/yang/Cisco-IOS-XE-rpc',
  'openconfig-interfaces': 'http://openconfig.net/yang/interfaces',
  'openconfig-if-ip': 'http://openconfig.net/yang/interfaces/ip',
  'openconfig-if-ethernet': 'http://openconfig.net/yang/interfaces/ethernet',
  'openconfig-system': 'http://openconfig.net/yang/system',
  'openconfig-network-instance': 'http://openconfig.net/yang/network-instance',
  'openconfig-bgp': 'http://openconfig.net/yang/bgp',
  'lab-acl': 'urn:lab:acl',
};
const SIMD_MODULE_REV = {
  'ietf-interfaces': '2018-02-20', 'ietf-ip': '2018-02-22', 'iana-if-type': '2017-01-19', 'ietf-yang-types': '2013-07-15', 'ietf-inet-types': '2013-07-15',
  'Cisco-IOS-XE-native': '2023-07-01', 'Cisco-IOS-XE-bgp': '2023-07-01', 'Cisco-IOS-XE-vlan': '2023-03-01', 'Cisco-IOS-XE-ntp': '2023-03-01', 'Cisco-IOS-XE-logging': '2023-03-01', 'Cisco-IOS-XE-snmp': '2023-03-01', 'Cisco-IOS-XE-rpc': '2023-03-01',
  'openconfig-interfaces': '2023-02-06', 'openconfig-if-ip': '2023-04-12', 'openconfig-if-ethernet': '2023-03-10', 'openconfig-system': '2023-03-02', 'openconfig-network-instance': '2023-04-25', 'openconfig-bgp': '2023-03-31', 'lab-acl': '2026-01-10',
};

function simdClone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
function simdPad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }
function simdLpad(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }
function simdIsIp(s) { return typeof s === 'string' && /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(s); }
function simdIsMask(s) {
  if (!simdIsIp(s)) return false;
  const bits = s.split('.').map(Number).map(n => n.toString(2).padStart(8, '0')).join('');
  return /^1*0*$/.test(bits);
}
function simdMaskToLen(m) { return simdIsIp(m) ? m.split('.').map(Number).reduce((a, n) => a + n.toString(2).split('1').length - 1, 0) : null; }
function simdLenToMask(len) { len = Number(len); const bits = '1'.repeat(len) + '0'.repeat(32 - len); return [0, 8, 16, 24].map(i => parseInt(bits.slice(i, i + 8), 2)).join('.'); }
function simdXmlEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function simdNowIso() { return new Date().toISOString().replace(/\.\d+Z$/, 'Z'); }
/* IOS tarzi saat, ornek 10:12:33.412 UTC Mon Oct 13 2026 */
function simdIosClock(d) {
  d = d || new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}.${String(d.getUTCMilliseconds()).padStart(3, '0')} UTC ${days[d.getUTCDay()]} ${mons[d.getUTCMonth()]} ${d.getUTCDate()} ${d.getUTCFullYear()}`;
}
/* Interface adi normalize, gi2, Gi 2, GigabitEthernet2, lo0, Loopback 0 */
function simdIfName(s) {
  if (!s) return null;
  const m = /^\s*([A-Za-z-]+)\s*([0-9][0-9/.]*)\s*$/.exec(s);
  if (!m) return null;
  const t = m[1].toLowerCase(), n = m[2];
  if ('gigabitethernet'.startsWith(t) && t.length >= 2 && !'ge'.startsWith(t)) return 'GigabitEthernet' + n;
  if (t === 'gi' || t === 'g' || t === 'ge' || t === 'gig') return 'GigabitEthernet' + n;
  if ('loopback'.startsWith(t)) return 'Loopback' + n;
  if ('vlan'.startsWith(t) && t.length >= 1) return 'Vlan' + n;
  if ('tunnel'.startsWith(t) && t.length >= 2) return 'Tunnel' + n;
  return null;
}
function simdIfType(name) { return /^Loopback/.test(name) ? 'softwareLoopback' : /^Vlan/.test(name) ? 'l3ipvlan' : /^Tunnel/.test(name) ? 'tunnel' : 'ethernetCsmacd'; }
function simdIfOrder(a, b) {
  const rank = n => /^Loopback/.test(n) ? 0 : /^GigabitEthernet/.test(n) ? 1 : /^Vlan/.test(n) ? 2 : 3;
  const num = n => parseFloat(n.replace(/^[A-Za-z-]+/, '')) || 0;
  return rank(a) - rank(b) || num(a) - num(b) || a.localeCompare(b);
}
function simdSortedIfs(model) { return Object.keys(model.interfaces).sort(simdIfOrder); }
/* show komutlari ifindex sirasi, fiziksel portlar once, Loopback sonra */
function simdOperIfs(model) { const rank = n => /^GigabitEthernet/.test(n) ? 0 : /^Tunnel/.test(n) ? 1 : /^Vlan/.test(n) ? 2 : 3; const num = n => parseFloat(n.replace(/^[A-Za-z-]+/, '')) || 0; return Object.keys(model.interfaces).sort((a, b) => rank(a) - rank(b) || num(a) - num(b)); }
function simdIfIndex(name) { const n = parseInt(name.replace(/^[A-Za-z-]+/, ''), 10) || 0; return /^Loopback/.test(name) ? 8 + n : /^Vlan/.test(name) ? 20 + n : n; }
function simdMac(dev, name) { const i = simdIfIndex(name); return `0050.56${dev.macSeed}.${String(1200 + i).padStart(4, '0')}`; }
function simdMacColon(dev, name) { return simdMac(dev, name).replace(/\./g, '').replace(/(..)(?=.)/g, '$1:'); }

/* ---------- baslangic modelleri ---------- */

function simdInitialR1() {
  return {
    hostname: 'R1', domain: 'lab.local',
    interfaces: {
      GigabitEthernet1: { description: 'MGMT', ip: '10.0.0.1', mask: '255.255.255.0', enabled: true, link: true, vlan: null },
      GigabitEthernet2: { description: 'TO-R2', ip: '10.1.12.1', mask: '255.255.255.252', enabled: true, link: true, vlan: null },
      GigabitEthernet3: { description: 'UNUSED', ip: null, mask: null, enabled: false, link: false, vlan: null },
      GigabitEthernet4: { description: '', ip: null, mask: null, enabled: false, link: false, vlan: null },
      Loopback0: { description: '', ip: '1.1.1.1', mask: '255.255.255.255', enabled: true, link: true, vlan: null },
    },
    vlans: { 10: { name: 'USERS' }, 20: { name: 'VOICE' }, 99: { name: 'MGMT' } },
    users: [{ name: 'admin', privilege: 15, secret: 'admin' }],
    bgp: { asn: 65001, routerId: '1.1.1.1', logNeighborChanges: true, neighbors: [{ ip: '10.1.12.2', remoteAs: 65002, description: 'R2', shutdown: false }], networks: [{ ip: '1.1.1.1', mask: '255.255.255.255' }] },
    ntp: [{ ip: '10.0.0.53', prefer: false }],
    snmp: [{ community: 'public', mode: 'RO' }],
    logging: ['10.0.0.100'],
    banner: '',
  };
}
function simdInitialR2() {
  return {
    hostname: 'R2', domain: 'lab.local',
    interfaces: {
      GigabitEthernet1: { description: 'MGMT', ip: '10.0.0.2', mask: '255.255.255.0', enabled: true, link: true, vlan: null },
      GigabitEthernet2: { description: 'TO-R1', ip: '10.1.12.2', mask: '255.255.255.252', enabled: true, link: true, vlan: null },
      Loopback0: { description: '', ip: '2.2.2.2', mask: '255.255.255.255', enabled: true, link: true, vlan: null },
    },
    vlans: {},
    users: [{ name: 'admin', privilege: 15, secret: 'admin' }],
    bgp: { asn: 65002, routerId: '2.2.2.2', logNeighborChanges: true, neighbors: [{ ip: '10.1.12.1', remoteAs: 65001, description: 'R1', shutdown: false }], networks: [{ ip: '2.2.2.2', mask: '255.255.255.255' }] },
    ntp: [{ ip: '10.0.0.53', prefer: false }],
    snmp: [],
    logging: [],
    banner: '',
  };
}

/* ---------- operasyonel durum ---------- */

function simdOper(iface) { return !!(iface.enabled && iface.link !== false); }
/* Sayaclar zamana gore buyur, abonelik ornekleri arasinda fark gorunur. offsetSec ile ileri sarilir */
function simdCounters(dev, name, offsetSec) {
  const iface = dev.model.interfaces[name];
  const idx = simdIfIndex(name);
  const t = (Date.now() - dev.t0) / 1000 + (offsetSec || 0) + (dev.counterOffset || 0) + 3 * 86400 + 4 * 3600 + 12 * 60;
  if (!iface || !simdOper(iface)) return { inOctets: 0, inPkts: 0, outOctets: 0, outPkts: 0, inErrors: 0, inDiscards: 0, outErrors: 0, outDiscards: 0, inBcast: 0, inMcast: 0, outBcast: 0, outMcast: 0 };
  const rate = /^Loopback/.test(name) ? 0.2 : idx === 1 ? 3.1 : 2.3;
  const inPkts = Math.floor(t * rate) + idx * 1000;
  const outPkts = Math.floor(t * rate * 0.8) + idx * 700;
  return {
    inOctets: inPkts * 118 + idx * 7, inPkts, outOctets: outPkts * 102 + idx * 3, outPkts,
    inErrors: 0, inDiscards: 0, outErrors: 0, outDiscards: 0,
    inBcast: Math.floor(inPkts / 40), inMcast: Math.floor(inPkts / 25), outBcast: Math.floor(outPkts / 60), outMcast: Math.floor(outPkts / 30),
  };
}
function simdUptime(dev) {
  const s = Math.floor((Date.now() - dev.t0) / 1000) + 3 * 86400 + 4 * 3600 + 12 * 60;
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return { s, d, h, m, text: `${d} day${d === 1 ? '' : 's'}, ${h} hour${h === 1 ? '' : 's'}, ${m} minute${m === 1 ? '' : 's'}`, short: `${d}d${String(h).padStart(2, '0')}h` };
}

/* ---------- running-config ---------- */

function simdRunning(dev, model) {
  const m = model || dev.model;
  const L = [];
  L.push('Building configuration...', '', 'Current configuration : BYTES bytes', '!', `! Last configuration change at ${simdIosClock(new Date(dev.lastChange))} by admin`, '!',
    'version 17.9', 'service timestamps debug datetime msec', 'service timestamps log datetime msec', 'service call-home',
    'platform qfp utilization monitor load 80', 'platform punt-keepalive disable-kernel-core', 'platform console serial', '!',
    `hostname ${m.hostname}`, '!', 'boot-start-marker', 'boot system bootflash:packages.conf', 'boot-end-marker', '!', '!',
    'no aaa new-model', '!', `ip domain name ${m.domain}`, '!', 'login on-success log', '!', 'subscriber templating', '!', 'multilink bundle-name authenticated', '!');
  if (Object.keys(m.vlans).length) {
    Object.keys(m.vlans).map(Number).sort((a, b) => a - b).forEach(id => { L.push(`vlan ${id}`); if (m.vlans[id].name) L.push(` name ${m.vlans[id].name}`); L.push('!'); });
  }
  m.users.forEach(u => L.push(`username ${u.name} privilege ${u.privilege} secret 9 $9$${simdHash(u.secret)}`));
  L.push('!', 'redundancy', '!');
  if (m.banner) L.push(`banner motd ^C${m.banner}^C`, '!');
  simdSortedIfs(m).forEach(n => {
    const i = m.interfaces[n];
    L.push(`interface ${n}`);
    if (i.description) L.push(` description ${i.description}`);
    if (i.vlan && !/^Loopback/.test(n)) L.push(' switchport mode access', ` switchport access vlan ${i.vlan}`);
    if (i.ip) L.push(` ip address ${i.ip} ${i.mask}`); else L.push(' no ip address');
    if (!i.enabled) L.push(' shutdown');
    if (/^GigabitEthernet/.test(n)) { L.push(' negotiation auto'); if (n === 'GigabitEthernet1') L.push(' no mop enabled', ' no mop sysid'); }
    L.push('!');
  });
  if (m.bgp && m.bgp.asn) {
    L.push(`router bgp ${m.bgp.asn}`);
    if (m.bgp.routerId) L.push(` bgp router-id ${m.bgp.routerId}`);
    if (m.bgp.logNeighborChanges) L.push(' bgp log-neighbor-changes');
    m.bgp.neighbors.forEach(nb => { L.push(` neighbor ${nb.ip} remote-as ${nb.remoteAs}`); if (nb.description) L.push(` neighbor ${nb.ip} description ${nb.description}`); if (nb.shutdown) L.push(` neighbor ${nb.ip} shutdown`); });
    if (m.bgp.networks && m.bgp.networks.length) { L.push(' !', ' address-family ipv4'); m.bgp.networks.forEach(nw => L.push(`  network ${nw.ip} mask ${nw.mask}`)); m.bgp.neighbors.forEach(nb => L.push(`  neighbor ${nb.ip} activate`)); L.push(' exit-address-family'); }
    L.push('!');
  }
  L.push('ip forward-protocol nd', 'ip http server', 'ip http authentication local', 'ip http secure-server', '!', 'ip ssh version 2', '!');
  m.snmp.forEach(c => L.push(`snmp-server community ${c.community} ${c.mode}`));
  m.logging.forEach(h => L.push(`logging host ${h}`));
  if (m.snmp.length || m.logging.length) L.push('!');
  L.push('control-plane', '!', 'line con 0', ' stopbits 1', 'line vty 0 4', ' login local', ' transport input ssh', '!');
  m.ntp.forEach(n => L.push(`ntp server ${n.ip}${n.prefer ? ' prefer' : ''}`));
  L.push('netconf-yang', 'restconf', 'gnxi', 'gnxi secure-server', 'gnxi secure-port 57400', '!', 'end', '');
  const text = L.join('\n');
  return text.replace('BYTES', String(text.length - 60));
}
/* salt gorunum icin sahte hash, secret kelimesine gore sabit */
function simdHash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } const al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./'; let o = ''; for (let i = 0; i < 43; i++) { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; o += al[h % 64]; } return o; }

/* ---------- IOS cikti filtreleri, | include | exclude | section | begin ---------- */

function simdPipeFilter(text, pipes) {
  let lines = text.split('\n');
  for (const p of pipes) {
    const mm = /^\s*(\S+)\s*(.*)$/.exec(p); if (!mm) continue;
    const kw = mm[1].toLowerCase(), arg = mm[2].trim();
    let re; try { re = new RegExp(arg); } catch (e) { re = new RegExp(arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); }
    if ('include'.startsWith(kw) && kw.length >= 1 && kw[0] === 'i') lines = lines.filter(l => re.test(l));
    else if ('exclude'.startsWith(kw) && kw[0] === 'e') lines = lines.filter(l => !re.test(l));
    else if ('begin'.startsWith(kw) && kw[0] === 'b') { const i = lines.findIndex(l => re.test(l)); lines = i < 0 ? [] : lines.slice(i); }
    else if ('section'.startsWith(kw) && kw[0] === 's') {
      const out = []; let inSec = false;
      for (const l of lines) {
        const top = !/^\s/.test(l);
        if (top) inSec = re.test(l);
        else if (!inSec && re.test(l)) { out.push(l); continue; }
        if (inSec) out.push(l);
      }
      lines = out;
    } else if ('count'.startsWith(kw) && kw[0] === 'c') lines = [`Number of lines which match regexp = ${lines.filter(l => re.test(l)).length}`];
    else return `% Invalid input detected at '^' marker.\n`;
  }
  return lines.join('\n');
}

/* ---------- show komutlari ---------- */

function simdShowVersion(dev) {
  const m = dev.model, up = simdUptime(dev);
  return [
    'Cisco IOS XE Software, Version 17.09.04a',
    'Cisco IOS Software [Cupertino], Virtual XE Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 17.9.4a, RELEASE SOFTWARE (fc3)',
    'Technical Support: http://www.cisco.com/techsupport',
    'Copyright (c) 1986-2023 by Cisco Systems, Inc.',
    'Compiled Fri 20-Oct-23 10:30 by mcpre', '', '',
    'Cisco IOS-XE software, Copyright (c) 2005-2023 by cisco Systems, Inc.',
    'All rights reserved.  Certain components of Cisco IOS-XE software are',
    'licensed under the GNU General Public License ("GPL") Version 2.0.  The',
    'software code licensed under GPL Version 2.0 is free software that comes',
    'with ABSOLUTELY NO WARRANTY.  You can redistribute and/or modify such',
    'GPL code under the terms of GPL Version 2.0.  For more details, see the',
    'documentation or "License Notice" file accompanying the IOS-XE software,',
    'or the applicable URL provided on the flyer accompanying the IOS-XE',
    'software.', '', '', 'ROM: IOS-XE ROMMON', '',
    `${m.hostname} uptime is ${up.text}`,
    `Uptime for this control processor is ${up.text}`,
    'System returned to ROM by reload',
    'System image file is "bootflash:packages.conf"',
    'Last reload reason: reload', '', '', '',
    'This product contains cryptographic features and is subject to United',
    'States and local country laws governing import, export, transfer and',
    'use. Delivery of Cisco cryptographic products does not imply',
    'third-party authority to import, export, distribute or use encryption.',
    'Importers, exporters, distributors and users are responsible for',
    'compliance with U.S. and local country laws. By using this product you',
    'agree to comply with applicable laws and regulations. If you are unable',
    'to comply with U.S. and local laws, return this product immediately.', '',
    'A summary of U.S. laws governing Cisco cryptographic products may be found at:',
    'http://www.cisco.com/wwl/export/crypto/tool/stqrg.html', '',
    'If you require further assistance please contact us by sending email to',
    'export@cisco.com.', '',
    'License Level: ax', 'License Type: N/A(Smart License Enabled)', 'Next reload license Level: ax', '',
    'The current throughput level is 1000 kbps', '', '',
    'Smart Licensing Status: Smart Licensing Using Policy', '',
    'cisco C8000V (VXE) processor (revision VXE) with 2190795K/3075K bytes of memory.',
    `Processor board ID ${dev.serial}`,
    'Router operating mode: Autonomous',
    `${Object.keys(m.interfaces).filter(n => /^GigabitEthernet/.test(n)).length} Gigabit Ethernet interfaces`,
    '32768K bytes of non-volatile configuration memory.',
    '8113280K bytes of physical memory.',
    '6188032K bytes of virtual hard disk at bootflash:.', '',
    'Configuration register is 0x2102', '',
  ].join('\n');
}
function simdShowIpIntBrief(dev) {
  const m = dev.model;
  const rows = ['Interface              IP-Address      OK? Method Status                Protocol'];
  simdOperIfs(m).forEach(n => {
    const i = m.interfaces[n];
    const status = !i.enabled ? 'administratively down' : simdOper(i) ? 'up' : 'down';
    const proto = simdOper(i) ? 'up' : 'down';
    rows.push(`${simdPad(n, 23)}${simdPad(i.ip || 'unassigned', 16)}YES ${simdPad(i.ip ? 'NVRAM' : 'unset', 7)}${simdPad(status, 22)}${proto}    `);
  });
  return rows.join('\n') + '\n';
}
function simdShowInterface(dev, name) {
  const m = dev.model, i = m.interfaces[name];
  const c = simdCounters(dev, name);
  const oper = simdOper(i);
  const lo = /^Loopback/.test(name);
  const status = !i.enabled ? 'administratively down' : oper ? 'up' : 'down';
  const L = [`${name} is ${status}, line protocol is ${oper ? 'up' : 'down'} `];
  if (lo) L.push('  Hardware is Loopback'); else L.push(`  Hardware is vNIC, address is ${simdMac(dev, name)} (bia ${simdMac(dev, name)})`);
  if (i.description) L.push(`  Description: ${i.description}`);
  if (i.ip) L.push(`  Internet address is ${i.ip}/${simdMaskToLen(i.mask)}`);
  L.push(lo ? '  MTU 1514 bytes, BW 8000000 Kbit/sec, DLY 5000 usec, ' : '  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec, ',
    '     reliability 255/255, txload 1/255, rxload 1/255',
    lo ? '  Encapsulation LOOPBACK, loopback not set' : '  Encapsulation ARPA, loopback not set',
    '  Keepalive set (10 sec)');
  if (!lo) L.push('  Full Duplex, 1000Mbps, link type is auto, media type is Virtual', '  output flow-control is unsupported, input flow-control is unsupported', '  ARP type: ARPA, ARP Timeout 04:00:00');
  L.push('  Last input 00:00:01, output 00:00:00, output hang never',
    '  Last clearing of "show interface" counters never',
    '  Input queue: 0/375/0/0 (size/max/drops/flushes); Total output drops: 0',
    '  Queueing strategy: fifo', '  Output queue: 0/40 (size/max)',
    `  5 minute input rate ${oper ? 2000 : 0} bits/sec, ${oper ? 3 : 0} packets/sec`,
    `  5 minute output rate ${oper ? 1000 : 0} bits/sec, ${oper ? 2 : 0} packets/sec`,
    `     ${c.inPkts} packets input, ${c.inOctets} bytes, 0 no buffer`,
    `     Received ${c.inBcast} broadcasts (0 IP multicasts)`,
    '     0 runts, 0 giants, 0 throttles ',
    `     ${c.inErrors} input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored`,
    `     0 watchdog, ${c.inMcast} multicast, 0 pause input`,
    `     ${c.outPkts} packets output, ${c.outOctets} bytes, 0 underruns`,
    `     Output ${c.outBcast} broadcasts (0 IP multicasts)`,
    `     ${c.outErrors} output errors, 0 collisions, ${i.enabled ? 1 : 2} interface resets`,
    '     0 unknown protocol drops', '     0 babbles, 0 late collision, 0 deferred',
    '     0 lost carrier, 0 no carrier, 0 pause output',
    '     0 output buffer failures, 0 output buffers swapped out');
  return L.join('\n') + '\n';
}
function simdShowInterfacesDescription(dev) {
  const m = dev.model; const rows = ['Interface                      Status         Protocol Description'];
  simdOperIfs(m).forEach(n => { const i = m.interfaces[n]; rows.push(`${simdPad(n, 31)}${simdPad(!i.enabled ? 'admin down' : simdOper(i) ? 'up' : 'down', 15)}${simdPad(simdOper(i) ? 'up' : 'down', 9)}${i.description || ''}`); });
  return rows.join('\n') + '\n';
}
function simdShowVlanBrief(dev) {
  const m = dev.model;
  const rows = ['VLAN Name                             Status    Ports', '---- -------------------------------- --------- -------------------------------'];
  const ports = id => Object.keys(m.interfaces).filter(n => m.interfaces[n].vlan === id).map(n => n.replace('GigabitEthernet', 'Gi')).join(', ');
  const all = [[1, 'default']].concat(Object.keys(m.vlans).map(Number).sort((a, b) => a - b).map(id => [id, m.vlans[id].name || `VLAN${String(id).padStart(4, '0')}`]));
  all.forEach(([id, name]) => rows.push(`${simdPad(id, 5)}${simdPad(name, 33)}${simdPad('active', 10)}${ports(id)}`));
  [[1002, 'fddi-default'], [1003, 'token-ring-default'], [1004, 'fddinet-default'], [1005, 'trnet-default']].forEach(([id, name]) => rows.push(`${simdPad(id, 5)}${simdPad(name, 33)}act/unsup `));
  return rows.join('\n') + '\n';
}
function simdShowBgpSummary(dev) {
  const m = dev.model; if (!m.bgp || !m.bgp.asn) return '% BGP not active\n';
  const up = simdUptime(dev);
  const L = [`BGP router identifier ${m.bgp.routerId || '0.0.0.0'}, local AS number ${m.bgp.asn}`,
    'BGP table version is 12, main routing table version 12', '5 network entries using 1240 bytes of memory', '6 path entries using 816 bytes of memory',
    '3/3 BGP path/bestpath attribute entries using 888 bytes of memory', '1 BGP AS-PATH entries using 24 bytes of memory',
    '0 BGP route-map cache entries using 0 bytes of memory', '0 BGP filter-list cache entries using 0 bytes of memory',
    'BGP using 2968 total bytes of memory', 'BGP activity 5/0 prefixes, 6/0 paths, scan interval 60 secs', '5 networks peaked at 10:14:22 Oct 10 2026 UTC (3d04h ago)', '',
    'Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd'];
  m.bgp.neighbors.forEach(nb => {
    const peerUp = !nb.shutdown && dev.peerUp(nb);
    const msgs = Math.floor(up.s / 60) + 10;
    L.push(`${simdPad(nb.ip, 16)}4 ${simdLpad(nb.remoteAs, 12)} ${simdLpad(peerUp ? msgs : 0, 7)} ${simdLpad(peerUp ? msgs - 3 : 0, 7)} ${simdLpad(peerUp ? 12 : 1, 8)} ${simdLpad(0, 4)} ${simdLpad(0, 4)} ${simdPad(peerUp ? up.short : 'never', 8)} ${simdLpad(peerUp ? 3 : nb.shutdown ? 'Idle (Admin)' : 'Active', 11)}`);
  });
  return L.join('\n') + '\n';
}
function simdShowNtp(dev) {
  const m = dev.model;
  const L = ['  address         ref clock       st   when   poll reach  delay  offset   disp'];
  m.ntp.forEach((n, k) => L.push(`${k === 0 ? '*~' : ' ~'}${simdPad(n.ip, 16)}${simdPad(k === 0 ? '.GPS.' : '10.0.0.53', 16)} ${simdLpad(k === 0 ? 1 : 2, 2)} ${simdLpad(42 + k * 7, 6)} ${simdLpad(64, 6)} ${simdLpad(k === 0 ? 377 : 0, 5)} ${simdLpad(k === 0 ? '0.512' : '0.000', 6)} ${simdLpad(k === 0 ? '0.103' : '0.000', 7)} ${simdLpad(k === 0 ? '1.234' : '15937', 6)}`));
  L.push(' * sys.peer, # selected, + candidate, - outlyer, x falseticker, ~ configured');
  return L.join('\n') + '\n';
}
function simdShowUsers(dev) {
  return `    Line       User       Host(s)              Idle       Location\n*  2 vty 0     admin      idle                 00:00:00 10.0.0.100\n\n  Interface    User               Mode         Idle     Peer Address\n`;
}
function simdShowNcSessions(dev) {
  const s = Object.entries(dev.nc.sessions);
  const L = ['R: Global-lock on running datastore', 'C: Global-lock on candidate datastore', 'S: Global-lock on startup datastore', '', `Number of sessions : ${s.length}`, '',
    'session-id  transport    username              source-host            global-lock', '-------------------------------------------------------------------------------'];
  s.forEach(([id, ses]) => { const lk = [dev.nc.locks.running == id ? 'R' : '', dev.nc.locks.candidate == id ? 'C' : ''].join(''); L.push(`${simdPad(id, 12)}${simdPad('netconf-ssh', 13)}${simdPad(ses.user, 22)}${simdPad(ses.host, 23)}${lk || 'None'}`); });
  return L.join('\n') + '\n';
}
function simdShowYangProc() {
  return ['confd            : Running', 'nesd             : Running', 'syncfd           : Running', 'ncsshd           : Running', 'dmiauthd         : Running', 'nginx            : Running', 'ndbmand          : Running', 'pubd             : Running', 'gnmib            : Running'].join('\n') + '\n';
}
function simdShowIpRoute(dev) {
  const m = dev.model;
  const L = ['Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP', '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area ', '       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2', '       E1 - OSPF external type 1, E2 - OSPF external type 2, m - OMP', '       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2', '       ia - IS-IS inter area, * - candidate default, U - per-user static route', '       o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP', '       a - application route', '       + - replicated route, % - next hop override, p - overrides from PfR', '', 'Gateway of last resort is not set', ''];
  const routes = [];
  simdSortedIfs(m).forEach(n => { const i = m.interfaces[n]; if (!i.ip || !simdOper(i)) return; const len = simdMaskToLen(i.mask); const net = simdNetwork(i.ip, i.mask); routes.push({ code: 'C', prefix: net, len, text: `is directly connected, ${n}` }); if (len < 32) routes.push({ code: 'L', prefix: i.ip, len: 32, text: `is directly connected, ${n}` }); });
  m.bgp.neighbors.forEach(nb => { if (nb.shutdown || !dev.peerUp(nb)) return; const other = Object.values(LAB.devices).find(d => d !== dev && Object.values(d.model.interfaces).some(i => i.ip === nb.ip)); if (!other) return; simdSortedIfs(other.model).forEach(n => { const i = other.model.interfaces[n]; if (!i.ip || !simdOper(i) || i.ip === nb.ip) return; const len = simdMaskToLen(i.mask); const net = simdNetwork(i.ip, i.mask); if (routes.some(r => r.prefix === net && r.len === len)) return; routes.push({ code: 'B', prefix: net, len, text: `[20/0] via ${nb.ip}, ${simdUptime(dev).short}` }); }); });
  const major = ip => { const a = Number(ip.split('.')[0]); const p = ip.split('.'); return a < 128 ? [`${p[0]}.0.0.0`, 8] : a < 192 ? [`${p[0]}.${p[1]}.0.0`, 16] : [`${p[0]}.${p[1]}.${p[2]}.0`, 24]; };
  const ipNum = ip => ip.split('.').reduce((a, x) => a * 256 + Number(x), 0);
  const groups = {};
  routes.forEach(r => { const [mj, ml] = major(r.prefix); (groups[mj] = groups[mj] || { ml, rs: [] }).rs.push(r); });
  Object.keys(groups).sort((a, b) => ipNum(a) - ipNum(b)).forEach(mj => {
    const g = groups[mj]; g.rs.sort((a, b) => ipNum(a.prefix) - ipNum(b.prefix) || a.len - b.len);
    const masks = new Set(g.rs.map(r => r.len));
    L.push(`      ${mj}/${g.ml} is ${masks.size > 1 ? 'variably subnetted' : 'subnetted'}, ${g.rs.length} subnet${g.rs.length > 1 ? 's' : ''}${masks.size > 1 ? `, ${masks.size} masks` : ''}`);
    g.rs.forEach(r => L.push(`${r.code}        ${r.prefix}/${r.len} ${r.text}`));
  });
  return L.join('\n') + '\n';
}
function simdNetwork(ip, mask) { const a = ip.split('.').map(Number), b = mask.split('.').map(Number); return a.map((x, i) => x & b[i]).join('.'); }
function simdPing(dev, target) {
  const m = dev.model;
  const reachable = Object.values(m.interfaces).some(i => i.ip === target && simdOper(i)) || m.bgp.neighbors.some(nb => nb.ip === target && dev.peerUp(nb)) || ['10.0.0.53', '10.0.0.100', '10.0.0.1', '10.0.0.2', '1.1.1.1', '2.2.2.2'].includes(target);
  return `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:\n${reachable ? '!!!!!' : '.....'}\nSuccess rate is ${reachable ? '100 percent (5/5), round-trip min/avg/max = 1/1/2 ms' : '0 percent (0/5)'}\n`;
}

/* exec komut tablosu, kisaltma destekli */
function simdAbbrev(tok, word) { return word.startsWith(tok.toLowerCase()); }
function simdMatchTokens(toks, pat) {
  if (toks.length < pat.length) return false;
  for (let i = 0; i < pat.length; i++) { if (!simdAbbrev(toks[i], pat[i])) return false; }
  return true;
}
const SIMD_EXEC = [
  { pat: ['show', 'version'], fn: dev => simdShowVersion(dev) },
  { pat: ['show', 'ip', 'interface', 'brief'], fn: dev => simdShowIpIntBrief(dev) },
  { pat: ['show', 'interfaces', 'description'], fn: dev => simdShowInterfacesDescription(dev) },
  { pat: ['show', 'interfaces'], fn: (dev, rest) => { if (!rest.length) return simdOperIfs(dev.model).map(n => simdShowInterface(dev, n)).join(''); const n = simdIfName(rest.join(' ')); if (!n || !dev.model.interfaces[n]) return `% Invalid input detected at '^' marker.\n`; return simdShowInterface(dev, n); } },
  { pat: ['show', 'running-config', 'interface'], fn: (dev, rest) => { const n = simdIfName(rest.join(' ')); if (!n || !dev.model.interfaces[n]) return `% Invalid input detected at '^' marker.\n`; const run = simdRunning(dev); const sec = simdPipeFilter(run, [`section ^interface ${n}$`]); return `Building configuration...\n\nCurrent configuration : ${sec.length + 10} bytes\n${sec}\nend\n`; } },
  { pat: ['show', 'running-config'], fn: dev => simdRunning(dev) },
  { pat: ['show', 'startup-config'], fn: dev => dev.startup || simdRunning(dev) },
  { pat: ['show', 'vlan', 'brief'], fn: dev => simdShowVlanBrief(dev) },
  { pat: ['show', 'vlan'], fn: dev => simdShowVlanBrief(dev) },
  { pat: ['show', 'ip', 'bgp', 'summary'], fn: dev => simdShowBgpSummary(dev) },
  { pat: ['show', 'bgp', 'summary'], fn: dev => simdShowBgpSummary(dev) },
  { pat: ['show', 'ip', 'route'], fn: dev => simdShowIpRoute(dev) },
  { pat: ['show', 'ntp', 'associations'], fn: dev => simdShowNtp(dev) },
  { pat: ['show', 'ntp', 'status'], fn: dev => `Clock is synchronized, stratum 2, reference is ${dev.model.ntp[0] ? dev.model.ntp[0].ip : '0.0.0.0'}\nnominal freq is 250.0000 Hz, actual freq is 250.0000 Hz, precision is 2**10\nntp uptime is ${simdUptime(dev).s * 100} (1/100 of seconds), resolution is 4000\nreference time is EA3F1A2B.3C4D5E6F (${simdIosClock()})\nclock offset is 0.1030 msec, root delay is 0.51 msec\n` },
  { pat: ['show', 'users'], fn: dev => simdShowUsers(dev) },
  { pat: ['show', 'netconf-yang', 'sessions'], fn: dev => simdShowNcSessions(dev) },
  { pat: ['show', 'netconf-yang', 'datastores'], fn: dev => `Datastore Name             : running\nGlobally Locked By Session : ${dev.nc.locks.running || 'None'}\nGlobally Locked Time       : ${dev.nc.locks.running ? simdNowIso() : 'None'}\n\nDatastore Name             : candidate\nGlobally Locked By Session : ${dev.nc.locks.candidate || 'None'}\nGlobally Locked Time       : ${dev.nc.locks.candidate ? simdNowIso() : 'None'}\n` },
  { pat: ['show', 'platform', 'software', 'yang-management', 'process'], fn: () => simdShowYangProc() },
  { pat: ['show', 'clock'], fn: () => `*${simdIosClock()}\n` },
  { pat: ['show', 'inventory'], fn: dev => `NAME: "Chassis", DESCR: "Cisco C8000V Chassis"\nPID: C8000V            , VID: V00  , SN: ${dev.serial}\n\n` },
  { pat: ['show', 'hosts'], fn: dev => `Default domain is ${dev.model.domain}\nName/address lookup uses domain service\nName servers are 255.255.255.255\n` },
  { pat: ['show', 'logging'], fn: dev => `Syslog logging: enabled (0 messages dropped, 0 messages rate-limited, 0 flushes, 0 overruns, xml disabled, filtering disabled)\n\n${dev.model.logging.map(h => `    Logging to ${h}  (udp port 514, audit disabled,\n          link up),\n          ${Math.floor(simdUptime(dev).s / 300)} message lines logged`).join('\n')}\n\nLog Buffer (4096 bytes):\n${dev.log.slice(-8).join('\n')}\n` },
  { pat: ['show', 'cdp', 'neighbors'], fn: dev => `Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge\n                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone, \n                  D - Remote, C - CVTA, M - Two-port Mac Relay \n\nDevice ID        Local Intrfce     Holdtme    Capability  Platform  Port ID\n${dev.name === 'r1' ? 'R2' : 'R1'}.lab.local     Gig 2             142             R    C8000V    Gig 2\n\nTotal cdp entries displayed : 1\n` },
  { pat: ['write', 'memory'], fn: dev => { dev.startup = simdRunning(dev); return 'Building configuration...\n[OK]\n'; } },
  { pat: ['write'], fn: dev => { dev.startup = simdRunning(dev); return 'Building configuration...\n[OK]\n'; } },
  { pat: ['copy', 'running-config', 'startup-config'], fn: dev => { dev.startup = simdRunning(dev); return `Destination filename [startup-config]? \nBuilding configuration...\n[OK]\n`; } },
  { pat: ['ping'], fn: (dev, rest) => rest[0] ? simdPing(dev, rest[0]) : '% Incomplete command.\n' },
  { pat: ['terminal', 'length'], fn: () => '' },
  { pat: ['terminal', 'width'], fn: () => '' },
  { pat: ['enable'], fn: () => '' },
  { pat: ['exit'], fn: () => '' },
  { pat: ['logout'], fn: () => '' },
  { pat: ['end'], fn: () => '' },
];
const SIMD_SHOW_LIST = 'show version, show ip interface brief, show interfaces [GigabitEthernetN], show interfaces description, show running-config [| section X | include X], show vlan brief, show ip bgp summary, show ip route, show ntp associations, show users, show netconf-yang sessions, show platform software yang-management process, show clock, show logging, ping A.B.C.D, write memory';

function simdCli(dev, cmd) {
  cmd = String(cmd || '').trim();
  if (!cmd) return '';
  const raw = cmd.split('|'); const parts = [raw[0]];
  for (let i = 1; i < raw.length; i++) { if (/^\s*(i(n(c(l(u(d(e)?)?)?)?)?)?|e(x(c(l(u(d(e)?)?)?)?)?)?|s(e(c(t(i(o(n)?)?)?)?)?)?|b(e(g(i(n)?)?)?)?|c(o(u(n(t)?)?)?)?)(\s|$)/.test(raw[i])) parts.push(raw[i]); else parts[parts.length - 1] += '|' + raw[i]; }
  const base = parts[0].trim(); const pipes = parts.slice(1);
  if (/^conf(igure)?(\s+t(erminal)?)?$/i.test(base)) return `Enter configuration commands, one per line.  End with CNTL/Z.\n% Bu lab'da interaktif config modu yok. configure() ya da netmiko send_config_set kullan\n`;
  const toks = base.split(/\s+/);
  if (toks[0].toLowerCase() === 'do') toks.shift();
  for (const e of SIMD_EXEC) {
    if (simdMatchTokens(toks, e.pat)) {
      let out = e.fn(dev, toks.slice(e.pat.length));
      if (pipes.length) out = simdPipeFilter(out, pipes);
      return out;
    }
  }
  dev.log.push(`*${simdIosClock().slice(0, 12)}: %PARSER-5-CFGLOG_LOGGEDCMD: User:admin  logged command:${cmd}`);
  if (simdAbbrev(toks[0], 'show')) {
    const col = base.indexOf(toks[1] || '') ;
    return `${' '.repeat(Math.max(col, 0) + dev.model.hostname.length + 1)}^\n% Invalid input detected at '^' marker.\n\nBu lab'da desteklenen komutlar, ${SIMD_SHOW_LIST}\n`;
  }
  return `Translating "${toks[0]}"...domain server (255.255.255.255)\n% Unknown command or computer name, or unable to find computer address\n\nBu lab'da desteklenen komutlar, ${SIMD_SHOW_LIST}\n`;
}

/* ---------- configure(lines) ---------- */

function simdConfigure(dev, lines, modelOverride) {
  if (typeof lines === 'string') lines = lines.split('\n');
  if (lines && typeof lines.toJs === 'function') lines = lines.toJs();
  lines = Array.from(lines || []).map(String);
  const m = modelOverride || dev.model;
  const out = []; let changed = false; let errors = 0;
  let mode = 'config'; let ctx = null;
  const prompt = () => `${m.hostname}(${mode})#`;
  const invalid = (raw, col) => { errors++; out.push(' '.repeat(prompt().length + (col || 0)) + '^', "% Invalid input detected at '^' marker.", ''); };
  const touch = () => { changed = true; dev.lastChange = Date.now(); };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('!')) continue;
    out.push(prompt() + line);
    const t = line.split(/\s+/); const kw = t[0].toLowerCase();
    const no = kw === 'no';
    const w = no ? t.slice(1) : t; const k = (w[0] || '').toLowerCase();
    const rest = (n) => w.slice(n).join(' ');
    if (/^(end|exit|conf(igure)?|wr(ite)?|do|copy)$/.test(kw) || /^configure\s+terminal$/i.test(line) || /^conf\s+t$/i.test(line)) {
      if (kw === 'exit') { if (mode === 'config-router-af') { mode = 'config-router'; } else if (mode !== 'config') { mode = 'config'; ctx = null; } }
      else if (kw === 'end') { mode = 'config'; ctx = null; }
      else if (kw === 'do') { const r = simdCli(dev, rest(1)); out.push(...r.replace(/\n$/, '').split('\n')); }
      else if (kw === 'wr' || kw === 'write' || kw === 'copy') { dev.startup = simdRunning(dev, m); out.push('Building configuration...', '[OK]'); }
      continue;
    }
    if (mode === 'config-if') {
      const i = m.interfaces[ctx];
      if (k === 'description') { if (no) i.description = ''; else { if (!w[1]) { out.push('% Incomplete command.', ''); errors++; continue; } i.description = rest(1); } touch(); continue; }
      if (k === 'ip' && (w[1] || '').toLowerCase() === 'address') {
        if (no) { i.ip = null; i.mask = null; touch(); continue; }
        if (!w[2] || !w[3]) { out.push('% Incomplete command.', ''); errors++; continue; }
        if (!simdIsIp(w[2])) { invalid(raw, line.indexOf(w[2])); continue; }
        if (!simdIsMask(w[3])) { out.push('% Bad mask 0x' + w[3] + ' for address ' + w[2], ''); errors++; continue; }
        const other = Object.keys(m.interfaces).find(n => n !== ctx && m.interfaces[n].ip && simdNetwork(m.interfaces[n].ip, m.interfaces[n].mask) === simdNetwork(w[2], w[3]) && m.interfaces[n].mask === w[3] && w[3] !== '255.255.255.255');
        if (other) { out.push(`% ${simdNetwork(w[2], w[3])} overlaps with ${other}`, ''); errors++; continue; }
        i.ip = w[2]; i.mask = w[3]; touch(); continue;
      }
      if (k === 'shutdown') { i.enabled = no; touch(); dev.log.push(`*${simdIosClock().slice(0, 12)}: %LINK-${no ? '3-UPDOWN' : '5-CHANGED'}: Interface ${ctx}, changed state to ${no ? 'up' : 'administratively down'}`); continue; }
      if (k === 'switchport') {
        if (/^Loopback/.test(ctx)) { out.push('% Command rejected: Loopback interface does not support switchport', ''); errors++; continue; }
        if ((w[1] || '').toLowerCase() === 'access' && (w[2] || '').toLowerCase() === 'vlan') { if (no) i.vlan = null; else { const id = parseInt(w[3], 10); if (!(id >= 1 && id <= 4094)) { invalid(raw, line.indexOf(w[3] || '')); continue; } i.vlan = id; if (!m.vlans[id]) m.vlans[id] = { name: `VLAN${String(id).padStart(4, '0')}` }; } touch(); continue; }
        if ((w[1] || '').toLowerCase() === 'mode') { touch(); continue; }
        if (w.length === 1) { if (no) i.vlan = null; touch(); continue; }
        invalid(raw, line.indexOf(w[1])); continue;
      }
      if (['negotiation', 'mop', 'cdp', 'speed', 'duplex', 'mtu', 'ip', 'ipv6', 'load-interval', 'spanning-tree', 'keepalive', 'logging', 'bandwidth', 'delay', 'vrf', 'encapsulation', 'service-policy', 'standby', 'ip', 'arp', 'carrier-delay'].includes(k)) { if (k === 'ip' && !/^(mtu|ospf|helper-address|nat|access-group|redirects|proxy-arp|unreachables|route-cache|verify|pim|igmp|directed-broadcast|tcp|rip|flow|virtual-reassembly)$/i.test(w[1] || '')) { invalid(raw, line.indexOf(w[1] || '')); continue; } touch(); continue; }
      if (k === 'interface' || k === 'vlan' || k === 'router' || k === 'hostname' || k === 'username' || k === 'ntp' || k === 'snmp-server' || k === 'logging' || k === 'banner' || k === 'line' || k === 'default') { mode = 'config'; ctx = null; /* IOS global komutlari if modunda da kabul eder */ }
      else { invalid(raw, 0); continue; }
    }
    if (mode === 'config-vlan') {
      if (k === 'name') { if (no) delete m.vlans[ctx].name; else { if (!w[1]) { out.push('% Incomplete command.', ''); errors++; continue; } m.vlans[ctx].name = rest(1); } touch(); continue; }
      if (k === 'state' || k === 'mtu' || k === 'shutdown') { touch(); continue; }
      if (k === 'vlan' || k === 'interface' || k === 'router' || k === 'hostname' || k === 'username' || k === 'ntp' || k === 'snmp-server' || k === 'logging') { mode = 'config'; ctx = null; }
      else { invalid(raw, 0); continue; }
    }
    if (mode === 'config-router' || mode === 'config-router-af') {
      const b = m.bgp;
      if (k === 'bgp') {
        if ((w[1] || '').toLowerCase() === 'router-id') { if (no) b.routerId = null; else { if (!simdIsIp(w[2] || '')) { invalid(raw, line.indexOf(w[2] || '') || line.length); continue; } b.routerId = w[2]; } touch(); continue; }
        if ((w[1] || '').toLowerCase() === 'log-neighbor-changes') { b.logNeighborChanges = !no; touch(); continue; }
        if (/^(bestpath|default|graceful-restart|listen|always-compare-med|deterministic-med|cluster-id|confederation|dampening|maxas-limit|router-id|timers|update-delay|additional-paths)$/i.test(w[1] || '')) { touch(); continue; }
        invalid(raw, line.indexOf(w[1] || '') || line.length); continue;
      }
      if (k === 'neighbor') {
        const ip = w[1];
        if (!ip || !simdIsIp(ip)) { invalid(raw, line.indexOf(ip || '') || line.length); continue; }
        let nb = b.neighbors.find(x => x.ip === ip);
        const sub = (w[2] || '').toLowerCase();
        if (no && (!sub || sub === 'remote-as')) { b.neighbors = b.neighbors.filter(x => x.ip !== ip); touch(); continue; }
        if (sub === 'remote-as') { const as = parseInt(w[3], 10); if (!(as >= 1 && as <= 4294967295)) { invalid(raw, line.indexOf(w[3] || '') || line.length); continue; } if (nb) nb.remoteAs = as; else b.neighbors.push({ ip, remoteAs: as, description: '', shutdown: false }); touch(); continue; }
        if (!nb) { out.push(`% Specify remote-as or peer-group commands first`, ''); errors++; continue; }
        if (sub === 'description') { nb.description = no ? '' : w.slice(3).join(' '); touch(); continue; }
        if (sub === 'shutdown') { nb.shutdown = !no; touch(); continue; }
        if (/^(activate|update-source|ebgp-multihop|password|timers|send-community|next-hop-self|soft-reconfiguration|route-map|prefix-list|default-originate|maximum-prefix|fall-over|ttl-security|version|local-as|advertisement-interval)$/.test(sub)) { touch(); continue; }
        invalid(raw, line.indexOf(w[2] || '') || line.length); continue;
      }
      if (k === 'network') {
        const ip = w[1]; const maskIdx = w.findIndex(x => x.toLowerCase() === 'mask'); const mask = maskIdx > 0 ? w[maskIdx + 1] : '255.255.255.0';
        if (!simdIsIp(ip || '')) { invalid(raw, line.indexOf(ip || '') || line.length); continue; }
        if (no) b.networks = b.networks.filter(n => !(n.ip === ip && n.mask === mask)); else if (!b.networks.some(n => n.ip === ip && n.mask === mask)) b.networks.push({ ip, mask });
        touch(); continue;
      }
      if (k === 'address-family') { mode = 'config-router-af'; continue; }
      if (k === 'exit-address-family') { mode = 'config-router'; continue; }
      if (/^(timers|redistribute|maximum-paths|distance|aggregate-address|synchronization|auto-summary|default-information|bgp)$/.test(k)) { touch(); continue; }
      if (k === 'interface' || k === 'vlan' || k === 'router' || k === 'hostname' || k === 'username' || k === 'ntp' || k === 'snmp-server' || k === 'logging') { mode = 'config'; ctx = null; }
      else { invalid(raw, 0); continue; }
    }
    if (mode === 'config-line') {
      if (/^(login|transport|exec-timeout|password|logging|privilege|length|width|stopbits|access-class|session-timeout|absolute-timeout|escape-character)$/.test(k)) { touch(); continue; }
      if (k === 'interface' || k === 'vlan' || k === 'router' || k === 'hostname' || k === 'username' || k === 'ntp' || k === 'line' || k === 'snmp-server' || k === 'logging') { mode = 'config'; ctx = null; }
      else { invalid(raw, 0); continue; }
    }
    /* global config */
    if (k === 'hostname') { if (no) m.hostname = 'Router'; else { if (!w[1]) { out.push('% Incomplete command.', ''); errors++; continue; } if (!/^[A-Za-z][A-Za-z0-9_.-]{0,62}$/.test(w[1])) { invalid(raw, line.indexOf(w[1])); continue; } m.hostname = w[1]; } touch(); continue; }
    if (k === 'interface') {
      const n = simdIfName(rest(1));
      if (!n) { invalid(raw, line.indexOf(w[1] || '') || line.length); continue; }
      if (no) { if (!m.interfaces[n]) { invalid(raw, line.indexOf(w[1])); continue; } if (/^GigabitEthernet/.test(n)) { out.push('% Command rejected: physical interface cannot be removed', ''); errors++; continue; } delete m.interfaces[n]; touch(); continue; }
      if (!m.interfaces[n]) {
        if (/^GigabitEthernet/.test(n)) { invalid(raw, line.indexOf(w[1])); continue; }
        m.interfaces[n] = { description: '', ip: null, mask: null, enabled: true, link: true, vlan: null }; touch();
        dev.log.push(`*${simdIosClock().slice(0, 12)}: %LINEPROTO-5-UPDOWN: Line protocol on Interface ${n}, changed state to up`);
      }
      mode = 'config-if'; ctx = n; continue;
    }
    if (k === 'default' && (w[1] || '').toLowerCase() === 'interface') { const n = simdIfName(w.slice(2).join(' ')); if (!n || !m.interfaces[n]) { invalid(raw, line.indexOf(w[2] || '') || line.length); continue; } Object.assign(m.interfaces[n], { description: '', ip: null, mask: null, enabled: true, vlan: null }); out.push(`Interface ${n} set to default configuration`); touch(); continue; }
    if (k === 'vlan') {
      const id = parseInt(w[1], 10);
      if (!(id >= 1 && id <= 4094)) { if (/^(internal|dot1q|configuration|database)$/i.test(w[1] || '')) { touch(); continue; } invalid(raw, line.indexOf(w[1] || '') || line.length); continue; }
      if (no) { delete m.vlans[id]; Object.values(m.interfaces).forEach(i => { if (i.vlan === id) i.vlan = null; }); touch(); continue; }
      if (!m.vlans[id]) { m.vlans[id] = { name: `VLAN${String(id).padStart(4, '0')}` }; touch(); }
      mode = 'config-vlan'; ctx = id; continue;
    }
    if (k === 'username') {
      const name = w[1]; if (!name) { out.push('% Incomplete command.', ''); errors++; continue; }
      if (no) { m.users = m.users.filter(u => u.name !== name); touch(); continue; }
      let priv = 1, secret = null;
      for (let i = 2; i < w.length; i++) { const x = w[i].toLowerCase(); if (x === 'privilege') priv = parseInt(w[++i], 10); else if (x === 'secret' || x === 'password') { if (/^[05789]$/.test(w[i + 1] || '') && w[i + 2]) i++; secret = w[++i]; } else { invalid(raw, line.indexOf(w[i])); priv = -1; break; } }
      if (priv === -1) continue;
      if (!(priv >= 0 && priv <= 15)) { invalid(raw, line.indexOf('privilege') + 10); continue; }
      const u = m.users.find(x => x.name === name); if (u) { u.privilege = priv; if (secret) u.secret = secret; } else m.users.push({ name, privilege: priv, secret: secret || '' });
      touch(); continue;
    }
    if (k === 'ntp') {
      if ((w[1] || '').toLowerCase() === 'server') { const ip = w[2]; if (!ip) { out.push('% Incomplete command.', ''); errors++; continue; } if (no) { m.ntp = m.ntp.filter(n => n.ip !== ip); touch(); continue; } if (!simdIsIp(ip) && !/^[a-z0-9.-]+$/i.test(ip)) { invalid(raw, line.indexOf(ip)); continue; } const ex = m.ntp.find(n => n.ip === ip); const prefer = w.slice(3).some(x => x.toLowerCase() === 'prefer'); if (ex) ex.prefer = prefer; else m.ntp.push({ ip, prefer }); touch(); continue; }
      if (/^(source|authenticate|authentication-key|trusted-key|update-calendar|master|logging|access-group)$/i.test(w[1] || '')) { touch(); continue; }
      invalid(raw, line.indexOf(w[1] || '') || line.length); continue;
    }
    if (k === 'router') {
      if ((w[1] || '').toLowerCase() !== 'bgp') { if (/^(ospf|eigrp|rip|isis|ospfv3)$/i.test(w[1] || '')) { mode = 'config-router'; touch(); continue; } invalid(raw, line.indexOf(w[1] || '') || line.length); continue; }
      const as = parseInt(w[2], 10);
      if (!(as >= 1 && as <= 4294967295)) { invalid(raw, line.indexOf(w[2] || '') || line.length); continue; }
      if (no) { if (m.bgp.asn === as) m.bgp = { asn: null, routerId: null, logNeighborChanges: false, neighbors: [], networks: [] }; touch(); continue; }
      if (m.bgp.asn && m.bgp.asn !== as) { out.push(`% BGP is already running; AS is ${m.bgp.asn}`, ''); errors++; continue; }
      if (!m.bgp.asn) { m.bgp = { asn: as, routerId: null, logNeighborChanges: true, neighbors: [], networks: [] }; touch(); }
      mode = 'config-router'; continue;
    }
    if (k === 'snmp-server') {
      if ((w[1] || '').toLowerCase() === 'community') { const c = w[2]; if (!c) { out.push('% Incomplete command.', ''); errors++; continue; } if (no) { m.snmp = m.snmp.filter(x => x.community !== c); touch(); continue; } const md = (w[3] || 'RO').toUpperCase(); if (md !== 'RO' && md !== 'RW') { invalid(raw, line.indexOf(w[3])); continue; } const ex = m.snmp.find(x => x.community === c); if (ex) ex.mode = md; else m.snmp.push({ community: c, mode: md }); touch(); continue; }
      if (/^(location|contact|host|enable|group|user|view|trap-source|chassis-id|ifindex|source-interface)$/i.test(w[1] || '')) { touch(); continue; }
      invalid(raw, line.indexOf(w[1] || '') || line.length); continue;
    }
    if (k === 'logging') {
      let host = (w[1] || '').toLowerCase() === 'host' ? w[2] : w[1];
      if (/^(buffered|console|monitor|trap|source-interface|origin-id|facility|synchronous|on|persistent|history|rate-limit|discriminator)$/i.test(w[1] || '')) { touch(); continue; }
      if (!host) { out.push('% Incomplete command.', ''); errors++; continue; }
      if (!simdIsIp(host)) { invalid(raw, line.indexOf(host)); continue; }
      if (no) m.logging = m.logging.filter(h => h !== host); else if (!m.logging.includes(host)) m.logging.push(host);
      touch(); continue;
    }
    if (k === 'ip' && /^domain(-name)?$/i.test(w[1] || '')) { const nm = (w[1].toLowerCase() === 'domain' && (w[2] || '').toLowerCase() === 'name') ? w[3] : w[2]; if (no) m.domain = ''; else { if (!nm) { out.push('% Incomplete command.', ''); errors++; continue; } m.domain = nm; } touch(); continue; }
    if (k === 'banner') { const txt = rest(2); const dl = txt[0]; m.banner = no ? '' : (dl && txt.lastIndexOf(dl) > 0 ? txt.slice(1, txt.lastIndexOf(dl)) : txt); touch(); continue; }
    if (k === 'line') { mode = 'config-line'; ctx = null; continue; }
    if (/^(ip|ipv6|service|netconf-yang|restconf|gnxi|aaa|enable|crypto|archive|clock|boot|platform|login|subscriber|multilink|redundancy|control-plane|spanning-tree|lldp|cdp|errdisable|vtp|ntp|access-list|route-map|prefix-list|class-map|policy-map|track|event|license|call-home|diagnostic|memory|cts|flow|sampler|vrf|key|alias|exception|file|parser|no)$/.test(k)) { touch(); continue; }
    invalid(raw, 0);
  }
  return { changed, output: out.join('\n') + (out.length ? '\n' : ''), errors };
}

/* ---------- YANG benzeri sema ----------
   Dugum: 'tip' bir leaf, {k:'leaf-list', t} , {k:'container', c, presence, ro}, {k:'list', keys, c, ro}
   Anahtar adinda on ek varsa (ietf-ip:ipv4) o dugum baska modulden augment, XML'de kendi xmlns'ini alir */
function simdC(c, o) { return Object.assign({ k: 'container', c }, o || {}); }
function simdL(keys, c, o) { return Object.assign({ k: 'list', keys, c }, o || {}); }
function simdLL(t) { return { k: 'leaf-list', t }; }
function simdSpec(x) { return typeof x === 'string' ? { k: 'leaf', t: x } : x; }
function simdLocal(name) { const i = name.indexOf(':'); return i < 0 ? name : name.slice(i + 1); }
function simdModOf(name) { const i = name.indexOf(':'); return i < 0 ? null : name.slice(0, i); }
/* cocuk sema arama, name 'ipv4' ya da 'ietf-ip:ipv4'; root duzeyinde modul zorunlu ya da ns ile cozulur */
function simdChildSpec(spec, name, ns) {
  if (!spec || !spec.c) return null;
  const local = simdLocal(name); let mod = simdModOf(name);
  if (!mod && ns) mod = simdNsToModule(ns);
  const keys = Object.keys(spec.c);
  let hit = null;
  for (const key of keys) {
    if (simdLocal(key) !== local) continue;
    const km = simdModOf(key);
    if (spec.root && mod && km !== mod) continue;
    if (mod && km && km !== mod && keys.some(k2 => k2 !== key && simdLocal(k2) === local)) continue;
    if (spec.root && !mod && !hit && !/^openconfig-/.test(km || '')) { hit = key; continue; }
    if (spec.root && !mod && /^openconfig-/.test(km || '')) { hit = key; break; }
    hit = key; break;
  }
  return hit ? { key: hit, spec: simdSpec(spec.c[hit]) } : null;
}
function simdNsToModule(ns) { for (const [m, u] of Object.entries(SIMD_NS)) if (u === ns) return m; return null; }

const SIMD_COUNTERS_IETF = { 'discontinuity-time': 'date', 'in-octets': 'counter64', 'in-unicast-pkts': 'counter64', 'in-broadcast-pkts': 'counter64', 'in-multicast-pkts': 'counter64', 'in-discards': 'uint32', 'in-errors': 'uint32', 'in-unknown-protos': 'uint32', 'out-octets': 'counter64', 'out-unicast-pkts': 'counter64', 'out-broadcast-pkts': 'counter64', 'out-multicast-pkts': 'counter64', 'out-discards': 'uint32', 'out-errors': 'uint32' };
const SIMD_COUNTERS_OC = { 'in-octets': 'counter64', 'in-pkts': 'counter64', 'in-unicast-pkts': 'counter64', 'in-broadcast-pkts': 'counter64', 'in-multicast-pkts': 'counter64', 'in-errors': 'counter64', 'in-discards': 'counter64', 'out-octets': 'counter64', 'out-pkts': 'counter64', 'out-unicast-pkts': 'counter64', 'out-broadcast-pkts': 'counter64', 'out-multicast-pkts': 'counter64', 'out-discards': 'counter64', 'out-errors': 'counter64', 'last-clear': 'uint64' };
const SIMD_IF_STATE_OC = { name: 'string', type: 'identityref', mtu: 'uint16', description: 'string', enabled: 'boolean', ifindex: 'uint32', 'admin-status': 'enumeration', 'oper-status': 'enumeration', 'last-change': 'uint64', logical: 'boolean', management: 'boolean', cpu: 'boolean', counters: simdC(SIMD_COUNTERS_OC) };

const SIMD_ROOT_SPEC = { k: 'container', root: true, c: {
  'ietf-interfaces:interfaces': simdC({
    interface: simdL(['name'], {
      name: 'string', description: 'string', type: 'identityref', enabled: 'boolean',
      'ietf-ip:ipv4': simdC({ address: simdL(['ip'], { ip: 'ipv4', netmask: 'mask', 'prefix-length': 'prefix' }) }, { presence: true }),
      'ietf-ip:ipv6': simdC({ address: simdL(['ip'], { ip: 'string', 'prefix-length': 'uint8' }) }, { presence: true }),
    }),
  }),
  'ietf-interfaces:interfaces-state': simdC({
    interface: simdL(['name'], { name: 'string', type: 'identityref', 'admin-status': 'enumeration', 'oper-status': 'enumeration', 'last-change': 'date', 'if-index': 'int32', 'phys-address': 'string', speed: 'uint64', statistics: simdC(SIMD_COUNTERS_IETF) }),
  }, { ro: true }),
  'Cisco-IOS-XE-native:native': simdC({
    version: 'string', hostname: 'string',
    username: simdL(['name'], { name: 'string', privilege: 'uint8', secret: simdC({ encryption: 'enumeration', secret: 'string' }) }),
    interface: simdC({
      GigabitEthernet: simdL(['name'], { name: 'string', description: 'string', shutdown: 'empty', ip: simdC({ address: simdC({ primary: simdC({ address: 'ipv4', mask: 'mask' }) }) }), 'Cisco-IOS-XE-ethernet:negotiation': simdC({ auto: 'boolean' }) }),
      Loopback: simdL(['name'], { name: 'uint32', description: 'string', shutdown: 'empty', ip: simdC({ address: simdC({ primary: simdC({ address: 'ipv4', mask: 'mask' }) }) }) }),
      Vlan: simdL(['name'], { name: 'uint16', description: 'string', shutdown: 'empty', ip: simdC({ address: simdC({ primary: simdC({ address: 'ipv4', mask: 'mask' }) }) }) }),
    }),
    vlan: simdC({ 'Cisco-IOS-XE-vlan:vlan-list': simdL(['id'], { id: 'uint16', name: 'string' }) }),
    router: simdC({ 'Cisco-IOS-XE-bgp:bgp': simdL(['id'], { id: 'uint32', bgp: simdC({ 'router-id': 'ipv4', 'log-neighbor-changes': 'boolean' }), neighbor: simdL(['id'], { id: 'ipv4', 'remote-as': 'uint32', description: 'string', shutdown: 'empty' }) }) }),
    ntp: simdC({ 'Cisco-IOS-XE-ntp:server': simdC({ 'server-list': simdL(['ip-address'], { 'ip-address': 'host', prefer: 'empty' }) }) }),
    logging: simdC({ 'Cisco-IOS-XE-logging:host': simdC({ 'ipv4-host-list': simdL(['ipv4-host'], { 'ipv4-host': 'ipv4' }) }) }),
    'snmp-server': simdC({ 'Cisco-IOS-XE-snmp:community': simdL(['name'], { name: 'string', RO: 'empty', RW: 'empty' }) }),
    banner: simdC({ motd: simdC({ banner: 'string' }) }),
  }),
  'openconfig-interfaces:interfaces': simdC({
    interface: simdL(['name'], {
      name: 'string',
      config: simdC({ name: 'string', type: 'identityref', mtu: 'uint16', description: 'string', enabled: 'boolean' }),
      state: simdC(SIMD_IF_STATE_OC, { ro: true }),
      subinterfaces: simdC({ subinterface: simdL(['index'], {
        index: 'uint32', config: simdC({ index: 'uint32', description: 'string', enabled: 'boolean' }), state: simdC({ index: 'uint32', description: 'string', enabled: 'boolean', 'admin-status': 'enumeration', 'oper-status': 'enumeration' }, { ro: true }),
        'openconfig-if-ip:ipv4': simdC({ addresses: simdC({ address: simdL(['ip'], { ip: 'ipv4', config: simdC({ ip: 'ipv4', 'prefix-length': 'prefix' }), state: simdC({ ip: 'ipv4', 'prefix-length': 'prefix', origin: 'enumeration' }, { ro: true }) }) }) }),
      }) }),
    }),
  }),
  'openconfig-system:system': simdC({
    config: simdC({ hostname: 'string', 'domain-name': 'string' }),
    state: simdC({ hostname: 'string', 'domain-name': 'string', 'current-datetime': 'date', 'boot-time': 'uint64', 'up-time': 'uint64', 'software-version': 'string' }, { ro: true }),
    ntp: simdC({ config: simdC({ enabled: 'boolean' }), state: simdC({ enabled: 'boolean' }, { ro: true }), servers: simdC({ server: simdL(['address'], { address: 'host', config: simdC({ address: 'host', port: 'uint16', prefer: 'boolean' }), state: simdC({ address: 'host', port: 'uint16', prefer: 'boolean', stratum: 'uint8', 'root-delay': 'uint32', 'poll-interval': 'uint32' }, { ro: true }) }) }) }),
    aaa: simdC({ authentication: simdC({ users: simdC({ user: simdL(['username'], { username: 'string', config: simdC({ username: 'string', role: 'string' }), state: simdC({ username: 'string', role: 'string' }, { ro: true }) }) }) }) }),
  }),
  'openconfig-network-instance:network-instances': simdC({
    'network-instance': simdL(['name'], {
      name: 'string', config: simdC({ name: 'string', type: 'identityref', enabled: 'boolean' }), state: simdC({ name: 'string', type: 'identityref', enabled: 'boolean' }, { ro: true }),
      protocols: simdC({ protocol: simdL(['identifier', 'name'], {
        identifier: 'identityref', name: 'string', config: simdC({ identifier: 'identityref', name: 'string', enabled: 'boolean' }), state: simdC({ identifier: 'identityref', name: 'string', enabled: 'boolean' }, { ro: true }),
        bgp: simdC({
          global: simdC({ config: simdC({ as: 'uint32', 'router-id': 'ipv4' }), state: simdC({ as: 'uint32', 'router-id': 'ipv4', 'total-paths': 'uint32', 'total-prefixes': 'uint32' }, { ro: true }) }),
          neighbors: simdC({ neighbor: simdL(['neighbor-address'], {
            'neighbor-address': 'ipv4', config: simdC({ 'neighbor-address': 'ipv4', 'peer-as': 'uint32', description: 'string', enabled: 'boolean' }),
            state: simdC({ 'neighbor-address': 'ipv4', 'peer-as': 'uint32', description: 'string', enabled: 'boolean', 'session-state': 'enumeration', 'established-transitions': 'counter64', 'last-established': 'uint64', messages: simdC({ sent: simdC({ UPDATE: 'counter64', NOTIFICATION: 'counter64' }), received: simdC({ UPDATE: 'counter64', NOTIFICATION: 'counter64' }) }) }, { ro: true }),
          }) }),
        }),
      }) }),
    }),
  }),
} };

/* ---------- model -> veri agaci ---------- */
function simdIfTypeId(name) { return 'iana-if-type:' + simdIfType(name); }
function simdLastChange(dev) { return new Date(dev.lastChange).toISOString().replace(/\.\d+Z$/, '.000+00:00'); }
function simdProjectIetf(dev, m, withState) {
  const out = {};
  out['ietf-interfaces:interfaces'] = { interface: simdSortedIfs(m).map(n => {
    const i = m.interfaces[n];
    const e = { name: n };
    if (i.description) e.description = i.description;
    e.type = simdIfTypeId(n); e.enabled = !!i.enabled;
    e['ietf-ip:ipv4'] = i.ip ? { address: [{ ip: i.ip, netmask: i.mask }] } : {};
    e['ietf-ip:ipv6'] = {};
    return e;
  }) };
  if (withState) out['ietf-interfaces:interfaces-state'] = { interface: simdSortedIfs(m).map(n => {
    const i = m.interfaces[n]; const c = simdCounters(dev, n);
    return { name: n, type: simdIfTypeId(n), 'admin-status': i.enabled ? 'up' : 'down', 'oper-status': simdOper(i) ? 'up' : 'down', 'last-change': simdLastChange(dev), 'if-index': simdIfIndex(n), 'phys-address': simdMacColon(dev, n), speed: /^Loopback/.test(n) ? 8000000000 : 1000000000,
      statistics: { 'discontinuity-time': new Date(dev.t0).toISOString().replace(/\.\d+Z$/, '+00:00'), 'in-octets': c.inOctets, 'in-unicast-pkts': c.inPkts - c.inBcast - c.inMcast, 'in-broadcast-pkts': c.inBcast, 'in-multicast-pkts': c.inMcast, 'in-discards': c.inDiscards, 'in-errors': c.inErrors, 'in-unknown-protos': 0, 'out-octets': c.outOctets, 'out-unicast-pkts': c.outPkts - c.outBcast - c.outMcast, 'out-broadcast-pkts': c.outBcast, 'out-multicast-pkts': c.outMcast, 'out-discards': c.outDiscards, 'out-errors': c.outErrors } };
  }) };
  return out;
}
function simdProjectNative(dev, m) {
  const ifc = (n, i) => { const e = { name: /^GigabitEthernet/.test(n) ? n.replace('GigabitEthernet', '') : parseInt(n.replace(/^[A-Za-z-]+/, ''), 10) }; if (i.description) e.description = i.description; if (!i.enabled) e.shutdown = true; e.ip = i.ip ? { address: { primary: { address: i.ip, mask: i.mask } } } : {}; if (/^GigabitEthernet/.test(n)) e['Cisco-IOS-XE-ethernet:negotiation'] = { auto: true }; return e; };
  const names = simdSortedIfs(m);
  const native = {
    version: '17.9', hostname: m.hostname,
    username: m.users.map(u => ({ name: u.name, privilege: u.privilege, secret: { encryption: '9', secret: '$9$' + simdHash(u.secret) } })),
    interface: {
      GigabitEthernet: names.filter(n => /^GigabitEthernet/.test(n)).map(n => ifc(n, m.interfaces[n])),
      Loopback: names.filter(n => /^Loopback/.test(n)).map(n => ifc(n, m.interfaces[n])),
      Vlan: names.filter(n => /^Vlan/.test(n)).map(n => ifc(n, m.interfaces[n])),
    },
    vlan: { 'Cisco-IOS-XE-vlan:vlan-list': Object.keys(m.vlans).map(Number).sort((a, b) => a - b).map(id => Object.assign({ id }, m.vlans[id].name ? { name: m.vlans[id].name } : {})) },
    router: { 'Cisco-IOS-XE-bgp:bgp': m.bgp && m.bgp.asn ? [{ id: m.bgp.asn, bgp: Object.assign({}, m.bgp.routerId ? { 'router-id': m.bgp.routerId } : {}, { 'log-neighbor-changes': !!m.bgp.logNeighborChanges }), neighbor: m.bgp.neighbors.map(nb => Object.assign({ id: nb.ip, 'remote-as': nb.remoteAs }, nb.description ? { description: nb.description } : {}, nb.shutdown ? { shutdown: true } : {})) }] : [] },
    ntp: { 'Cisco-IOS-XE-ntp:server': { 'server-list': m.ntp.map(n => Object.assign({ 'ip-address': n.ip }, n.prefer ? { prefer: true } : {})) } },
    logging: { 'Cisco-IOS-XE-logging:host': { 'ipv4-host-list': m.logging.map(h => ({ 'ipv4-host': h })) } },
    'snmp-server': { 'Cisco-IOS-XE-snmp:community': m.snmp.map(c => Object.assign({ name: c.community }, c.mode === 'RW' ? { RW: true } : { RO: true })) },
  };
  if (m.banner) native.banner = { motd: { banner: m.banner } };
  return { 'Cisco-IOS-XE-native:native': native };
}
function simdProjectOc(dev, m, withState) {
  const ifs = simdSortedIfs(m).map(n => {
    const i = m.interfaces[n]; const c = simdCounters(dev, n);
    const cfg = { name: n, type: simdIfTypeId(n), mtu: /^Loopback/.test(n) ? 1514 : 1500 }; if (i.description) cfg.description = i.description; cfg.enabled = !!i.enabled;
    const e = { name: n, config: cfg };
    if (withState) e.state = Object.assign({}, cfg, { ifindex: simdIfIndex(n), 'admin-status': i.enabled ? 'UP' : 'DOWN', 'oper-status': simdOper(i) ? 'UP' : 'DOWN', 'last-change': dev.lastChange * 1000000, logical: /^Loopback|^Vlan/.test(n), management: n === 'GigabitEthernet1', cpu: false,
      counters: { 'in-octets': c.inOctets, 'in-pkts': c.inPkts, 'in-unicast-pkts': c.inPkts - c.inBcast - c.inMcast, 'in-broadcast-pkts': c.inBcast, 'in-multicast-pkts': c.inMcast, 'in-errors': c.inErrors, 'in-discards': c.inDiscards, 'out-octets': c.outOctets, 'out-pkts': c.outPkts, 'out-unicast-pkts': c.outPkts - c.outBcast - c.outMcast, 'out-broadcast-pkts': c.outBcast, 'out-multicast-pkts': c.outMcast, 'out-discards': c.outDiscards, 'out-errors': c.outErrors, 'last-clear': dev.t0 * 1000000 } });
    const sub = { index: 0, config: { index: 0 } };
    if (withState) sub.state = { index: 0, 'admin-status': i.enabled ? 'UP' : 'DOWN', 'oper-status': simdOper(i) ? 'UP' : 'DOWN' };
    if (i.ip) { const a = { ip: i.ip, config: { ip: i.ip, 'prefix-length': simdMaskToLen(i.mask) } }; if (withState) a.state = { ip: i.ip, 'prefix-length': simdMaskToLen(i.mask), origin: 'STATIC' }; sub['openconfig-if-ip:ipv4'] = { addresses: { address: [a] } }; }
    e.subinterfaces = { subinterface: [sub] };
    return e;
  });
  const sys = { config: { hostname: m.hostname, 'domain-name': m.domain } };
  if (withState) sys.state = { hostname: m.hostname, 'domain-name': m.domain, 'current-datetime': simdNowIso(), 'boot-time': (dev.t0 - simdUptime(dev).s * 1000) * 1000000, 'up-time': simdUptime(dev).s * 1000000000, 'software-version': '17.09.04a' };
  sys.ntp = { config: { enabled: m.ntp.length > 0 }, servers: { server: m.ntp.map((n, k) => { const s = { address: n.ip, config: { address: n.ip, port: 123, prefer: !!n.prefer } }; if (withState) s.state = { address: n.ip, port: 123, prefer: !!n.prefer, stratum: k === 0 ? 1 : 2, 'root-delay': 512, 'poll-interval': 64 }; return s; }) } };
  if (withState) sys.ntp.state = { enabled: m.ntp.length > 0 };
  sys.aaa = { authentication: { users: { user: m.users.map(u => { const e = { username: u.name, config: { username: u.name, role: u.privilege >= 15 ? 'SYSTEM_ROLE_ADMIN' : 'SYSTEM_ROLE_OPERATOR' } }; if (withState) e.state = simdClone(e.config); return e; }) } } };
  const ni = { name: 'default', config: { name: 'default', type: 'openconfig-network-instance-types:DEFAULT_INSTANCE', enabled: true }, protocols: { protocol: [] } };
  if (withState) ni.state = simdClone(ni.config);
  if (m.bgp && m.bgp.asn) {
    const p = { identifier: 'openconfig-policy-types:BGP', name: 'BGP', config: { identifier: 'openconfig-policy-types:BGP', name: 'BGP', enabled: true }, bgp: { global: { config: Object.assign({ as: m.bgp.asn }, m.bgp.routerId ? { 'router-id': m.bgp.routerId } : {}) }, neighbors: { neighbor: m.bgp.neighbors.map(nb => {
      const e = { 'neighbor-address': nb.ip, config: Object.assign({ 'neighbor-address': nb.ip, 'peer-as': nb.remoteAs }, nb.description ? { description: nb.description } : {}, { enabled: !nb.shutdown }) };
      if (withState) { const up = !nb.shutdown && dev.peerUp(nb); const msgs = Math.floor(simdUptime(dev).s / 60) + 10; e.state = Object.assign({}, e.config, { 'session-state': up ? 'ESTABLISHED' : nb.shutdown ? 'IDLE' : 'ACTIVE', 'established-transitions': up ? 1 : 0, 'last-established': up ? dev.t0 * 1000000 : 0, messages: { sent: { UPDATE: up ? 3 : 0, NOTIFICATION: 0 }, received: { UPDATE: up ? msgs : 0, NOTIFICATION: 0 } } }); }
      return e; }) } } };
    if (withState) { p.state = simdClone(p.config); p.bgp.global.state = Object.assign({}, p.bgp.global.config, { 'total-paths': 6, 'total-prefixes': 5 }); }
    ni.protocols.protocol.push(p);
  }
  return { 'openconfig-interfaces:interfaces': { interface: ifs }, 'openconfig-system:system': sys, 'openconfig-network-instance:network-instances': { 'network-instance': [ni] } };
}
function simdProjectAll(dev, m, withState) { return Object.assign({}, simdProjectIetf(dev, m, withState), simdProjectNative(dev, m), simdProjectOc(dev, m, withState)); }

/* ---------- veri agaci -> model. Hata nesnesi {tag, message, path} ya da null ---------- */
function simdErr(tag, message, path) { return { tag, message, path: path || '' }; }
function simdEnsureIf(m, name, path, allowCreate) {
  if (!name) return simdErr('missing-element', 'interface name is missing', path);
  const full = simdIfName(name) || name;
  if (!m.interfaces[full]) {
    if (/^GigabitEthernet/.test(full) || !/^(Loopback|Vlan|Tunnel)\d+$/.test(full)) return simdErr('invalid-value', `"${name}" is not a valid value.`, path);
    if (!allowCreate) return simdErr('data-missing', `interface ${full} does not exist`, path);
    m.interfaces[full] = { description: '', ip: null, mask: null, enabled: true, link: true, vlan: null };
  }
  return full;
}
function simdSetIp(m, full, ip, mask, path) {
  if (ip == null) { m.interfaces[full].ip = null; m.interfaces[full].mask = null; return null; }
  if (!simdIsIp(ip)) return simdErr('invalid-value', `"${ip}" is not a valid value.`, path);
  if (!simdIsMask(mask || '')) return simdErr('invalid-value', `"${mask}" is not a valid value.`, path);
  const other = Object.keys(m.interfaces).find(n => n !== full && m.interfaces[n].ip && mask !== '255.255.255.255' && m.interfaces[n].mask === mask && simdNetwork(m.interfaces[n].ip, mask) === simdNetwork(ip, mask));
  if (other) return simdErr('invalid-value', `${simdNetwork(ip, mask)} overlaps with ${other}`, path);
  m.interfaces[full].ip = ip; m.interfaces[full].mask = mask; return null;
}
function simdPruneIfs(m, keep) {
  Object.keys(m.interfaces).forEach(n => { if (keep.has(n)) return; if (/^GigabitEthernet/.test(n)) Object.assign(m.interfaces[n], { description: '', ip: null, mask: null, enabled: true, vlan: null }); else delete m.interfaces[n]; });
}
function simdUnprojectIetf(m, data) {
  const root = data['ietf-interfaces:interfaces']; if (!root) return null;
  const keep = new Set();
  for (const e of root.interface || []) {
    const p = `/ietf-interfaces:interfaces/interface[name='${e.name}']`;
    const full = simdEnsureIf(m, e.name, p, true); if (typeof full !== 'string') return full;
    keep.add(full);
    const i = m.interfaces[full];
    if (e.type && simdLocal(e.type) !== simdIfType(full)) return simdErr('invalid-value', `"${e.type}" is not a valid value.`, p + '/type');
    i.description = e.description || '';
    i.enabled = e.enabled === undefined ? true : !!e.enabled;
    const v4 = e['ietf-ip:ipv4'];
    const a = v4 && v4.address && v4.address[0];
    if (a) { const mask = a.netmask || (a['prefix-length'] != null ? simdLenToMask(a['prefix-length']) : null); if (!mask) return simdErr('missing-element', 'subnet is mandatory, give netmask or prefix-length', p + '/ietf-ip:ipv4/address'); const err = simdSetIp(m, full, a.ip, mask, p + '/ietf-ip:ipv4/address'); if (err) return err; }
    else simdSetIp(m, full, null);
  }
  simdPruneIfs(m, keep);
  return null;
}
function simdUnprojectNative(m, data) {
  const n = data['Cisco-IOS-XE-native:native']; if (!n) return null;
  const P = '/Cisco-IOS-XE-native:native';
  m.hostname = n.hostname || 'Router';
  if (n.username) m.users = n.username.map(u => { const old = m.users.find(x => x.name === u.name); const sec = u.secret && u.secret.secret; return { name: u.name, privilege: u.privilege == null ? (old ? old.privilege : 1) : u.privilege, secret: sec && !/^\$9\$/.test(sec) ? sec : (old ? old.secret : '') }; });
  const keep = new Set();
  const ifs = n.interface || {};
  for (const [type, list] of Object.entries(ifs)) {
    for (const e of list || []) {
      const p = `${P}/interface/${type}[name='${e.name}']`;
      const full = simdEnsureIf(m, type + e.name, p, true); if (typeof full !== 'string') return full;
      keep.add(full);
      const i = m.interfaces[full];
      i.description = e.description || '';
      i.enabled = !e.shutdown;
      const pr = e.ip && e.ip.address && e.ip.address.primary;
      if (pr && pr.address) { const err = simdSetIp(m, full, pr.address, pr.mask, p + '/ip/address/primary'); if (err) return err; } else simdSetIp(m, full, null);
    }
  }
  simdPruneIfs(m, keep);
  const vl = n.vlan && n.vlan['Cisco-IOS-XE-vlan:vlan-list'];
  if (vl) { m.vlans = {}; vl.forEach(v => { if (!(v.id >= 1 && v.id <= 4094)) return; m.vlans[v.id] = v.name ? { name: v.name } : {}; }); }
  const bl = n.router && n.router['Cisco-IOS-XE-bgp:bgp'];
  if (bl) {
    if (!bl.length) m.bgp = { asn: null, routerId: null, logNeighborChanges: false, neighbors: [], networks: [] };
    else { const b = bl[0]; if (bl.length > 1) return simdErr('operation-failed', 'only one BGP process is allowed', P + '/router/bgp'); m.bgp = { asn: b.id, routerId: (b.bgp && b.bgp['router-id']) || null, logNeighborChanges: !!(b.bgp && b.bgp['log-neighbor-changes']), neighbors: (b.neighbor || []).map(nb => { if (nb['remote-as'] == null) return null; return { ip: nb.id, remoteAs: nb['remote-as'], description: nb.description || '', shutdown: !!nb.shutdown }; }).filter(Boolean), networks: (m.bgp && m.bgp.networks) || [] }; }
  }
  const nl = n.ntp && n.ntp['Cisco-IOS-XE-ntp:server'] && n.ntp['Cisco-IOS-XE-ntp:server']['server-list'];
  if (nl) m.ntp = nl.map(s => ({ ip: s['ip-address'], prefer: !!s.prefer }));
  const ll = n.logging && n.logging['Cisco-IOS-XE-logging:host'] && n.logging['Cisco-IOS-XE-logging:host']['ipv4-host-list'];
  if (ll) m.logging = ll.map(h => h['ipv4-host']);
  const sl = n['snmp-server'] && n['snmp-server']['Cisco-IOS-XE-snmp:community'];
  if (sl) m.snmp = sl.map(c => ({ community: c.name, mode: c.RW ? 'RW' : 'RO' }));
  m.banner = (n.banner && n.banner.motd && n.banner.motd.banner) || '';
  return null;
}
function simdUnprojectOc(m, data) {
  const ifr = data['openconfig-interfaces:interfaces'];
  if (ifr) {
    const keep = new Set();
    for (const e of ifr.interface || []) {
      const p = `/openconfig-interfaces:interfaces/interface[name='${e.name}']`;
      const full = simdEnsureIf(m, e.name, p, true); if (typeof full !== 'string') return full;
      keep.add(full);
      const i = m.interfaces[full]; const c = e.config || {};
      if (c.name && simdIfName(c.name) !== full) return simdErr('invalid-value', `config/name "${c.name}" does not match list key "${e.name}"`, p + '/config/name');
      i.description = c.description || '';
      i.enabled = c.enabled === undefined ? true : !!c.enabled;
      const sub = e.subinterfaces && e.subinterfaces.subinterface && e.subinterfaces.subinterface.find(s => String(s.index) === '0');
      const addr = sub && sub['openconfig-if-ip:ipv4'] && sub['openconfig-if-ip:ipv4'].addresses && sub['openconfig-if-ip:ipv4'].addresses.address && sub['openconfig-if-ip:ipv4'].addresses.address[0];
      if (addr) { const cfg = addr.config || {}; const len = cfg['prefix-length']; if (len == null || len < 0 || len > 32) return simdErr('invalid-value', `prefix-length "${len}" is not a valid value.`, p); const err = simdSetIp(m, full, cfg.ip || addr.ip, simdLenToMask(len), p + '/subinterfaces'); if (err) return err; }
      else simdSetIp(m, full, null);
    }
    simdPruneIfs(m, keep);
  }
  const sys = data['openconfig-system:system'];
  if (sys) {
    if (sys.config) { if (sys.config.hostname != null) { if (!/^[A-Za-z][A-Za-z0-9_.-]{0,62}$/.test(sys.config.hostname)) return simdErr('invalid-value', `"${sys.config.hostname}" is not a valid value.`, '/openconfig-system:system/config/hostname'); m.hostname = sys.config.hostname; } if (sys.config['domain-name'] != null) m.domain = sys.config['domain-name']; }
    const srv = sys.ntp && sys.ntp.servers && sys.ntp.servers.server;
    if (srv) m.ntp = srv.map(s => ({ ip: s.address, prefer: !!(s.config && s.config.prefer) }));
  }
  const nis = data['openconfig-network-instance:network-instances'];
  if (nis) {
    const ni = (nis['network-instance'] || []).find(x => x.name === 'default');
    const prot = ni && ni.protocols && (ni.protocols.protocol || []).find(x => simdLocal(x.identifier || '') === 'BGP');
    if (!prot || !prot.bgp || !prot.bgp.global || !prot.bgp.global.config || prot.bgp.global.config.as == null) m.bgp = { asn: null, routerId: null, logNeighborChanges: false, neighbors: [], networks: [] };
    else {
      const g = prot.bgp.global.config;
      m.bgp = { asn: g.as, routerId: g['router-id'] || null, logNeighborChanges: true, networks: (m.bgp && m.bgp.networks) || [], neighbors: ((prot.bgp.neighbors && prot.bgp.neighbors.neighbor) || []).map(nb => { const c = nb.config || {}; return { ip: nb['neighbor-address'], remoteAs: c['peer-as'] == null ? 0 : c['peer-as'], description: c.description || '', shutdown: c.enabled === false }; }) };
      const bad = m.bgp.neighbors.find(nb => !nb.remoteAs); if (bad) return simdErr('missing-element', `peer-as is mandatory for neighbor ${bad.ip}`, '/openconfig-network-instance:network-instances');
    }
  }
  return null;
}
/* touched: degisen root anahtarlari. Model klon uzerinde yazilir, hata yoksa gercek modele kopyalanir */
function simdUnproject(dev, model, data, touched) {
  const work = simdClone(model);
  const has = k => touched.some(t => t === k || simdLocal(t) === simdLocal(k) && (simdModOf(t) || simdModOf(k)) === simdModOf(k));
  let err = null;
  if (!err && (has('ietf-interfaces:interfaces'))) err = simdUnprojectIetf(work, data);
  if (!err && has('Cisco-IOS-XE-native:native')) err = simdUnprojectNative(work, data);
  if (!err && (has('openconfig-interfaces:interfaces') || has('openconfig-system:system') || has('openconfig-network-instance:network-instances'))) {
    const sub = {}; touched.forEach(t => { if (/^openconfig-/.test(t)) sub[t] = data[t]; }); err = simdUnprojectOc(work, sub);
  }
  if (err) return err;
  Object.keys(work).forEach(k => { model[k] = work[k]; });
  dev.lastChange = Date.now();
  return null;
}

/* ---------- deger tipleri ---------- */
const SIMD_INT_TYPES = { uint8: [0, 255], uint16: [0, 65535], uint32: [0, 4294967295], int32: [-2147483648, 2147483647], prefix: [0, 32], uint64: [0, Number.MAX_SAFE_INTEGER], counter64: [0, Number.MAX_SAFE_INTEGER] };
function simdIs64(t) { return t === 'uint64' || t === 'counter64'; }
/* metin ya da JSON degerini tipe gore dogrular ve normalize eder. {value} ya da {error} */
function simdParseValue(t, raw) {
  if (t === 'empty') { if (raw === true || raw === '' || raw === null || (Array.isArray(raw) && raw.length === 1 && raw[0] === null)) return { value: true }; return { error: `"${raw}" is not a valid value.` }; }
  if (t === 'boolean') { if (raw === true || raw === 'true') return { value: true }; if (raw === false || raw === 'false') return { value: false }; return { error: `"${raw}" is not a valid value.` }; }
  if (SIMD_INT_TYPES[t]) { const s = String(raw).trim(); if (!/^-?\d+$/.test(s)) return { error: `"${raw}" is not a valid value.` }; const n = Number(s); const [lo, hi] = SIMD_INT_TYPES[t]; if (n < lo || n > hi) return { error: `"${raw}" is out of range.` }; return { value: n }; }
  if (typeof raw !== 'string' && typeof raw !== 'number') return { error: `"${JSON.stringify(raw)}" is not a valid value.` };
  const s = String(raw);
  if (t === 'ipv4') return simdIsIp(s) ? { value: s } : { error: `"${s}" is not a valid value.` };
  if (t === 'mask') return simdIsMask(s) ? { value: s } : { error: `"${s}" is not a valid value.` };
  if (t === 'host') return (simdIsIp(s) || /^[A-Za-z0-9.-]+$/.test(s)) ? { value: s } : { error: `"${s}" is not a valid value.` };
  if (t === 'identityref') { const m = /^(?:[A-Za-z0-9-]+:)?([A-Za-z0-9_-]+)$/.exec(s); if (!m) return { error: `"${s}" is not a valid value.` }; const local = m[1]; const known = { ethernetCsmacd: 'iana-if-type', softwareLoopback: 'iana-if-type', l3ipvlan: 'iana-if-type', tunnel: 'iana-if-type', BGP: 'openconfig-policy-types', DEFAULT_INSTANCE: 'openconfig-network-instance-types' }; return { value: (known[local] || simdModOf(s) || 'iana-if-type') + ':' + local }; }
  return { value: s };
}
/* JSON kodlama, RFC 7951. 64 bit sayilar string, empty [null] */
function simdJsonValue(t, v, enc) { if (t === 'empty') return [null]; if (simdIs64(t) && enc !== 'json') return String(v); return v; }
function simdXmlValue(t, v) { if (t === 'identityref' && typeof v === 'string' && v.includes(':')) { const mod = simdModOf(v); const pfx = { 'iana-if-type': 'ianaift', 'openconfig-policy-types': 'oc-pol-types', 'openconfig-network-instance-types': 'oc-ni-types' }[mod] || mod; return { attrs: ` xmlns:${pfx}="${SIMD_NS[mod] || 'http://openconfig.net/yang/' + mod}"`, text: pfx + ':' + simdLocal(v) }; } return { attrs: '', text: String(v) }; }

/* ---------- yol cozumleme ---------- */
/* segs: [{name, keys:{k:v}|null}] -> imlec. create true ise ara dugumler olusturulur */
function simdResolve(rootData, segs, opts) {
  opts = opts || {};
  let spec = SIMD_ROOT_SPEC, data = rootData, pathSoFar = '';
  let cur = { spec, value: rootData, parent: null, key: null, path: '' };
  for (let si = 0; si < segs.length; si++) {
    const seg = segs[si];
    const ch = simdChildSpec(spec, seg.name, seg.ns);
    if (!ch) return { error: simdErr('unknown-element', `unknown element: ${simdLocal(seg.name)} in ${pathSoFar || '/'}`, pathSoFar), seg };
    const cs = ch.spec;
    pathSoFar += '/' + (si === 0 ? ch.key : simdLocal(ch.key));
    if (cs.k === 'list') {
      let list = data ? data[ch.key] : undefined;
      if (!seg.keys || !Object.keys(seg.keys).length) {
        if (si !== segs.length - 1 && !opts.allowWildcard) return { error: simdErr('missing-element', `missing key for list ${simdLocal(ch.key)}`, pathSoFar) };
        cur = { spec: cs, value: list, parent: data, key: ch.key, path: pathSoFar, isList: true, listSpec: cs };
        spec = cs; data = undefined; continue;
      }
      if (opts.create && data && !list) { list = data[ch.key] = []; }
      const kv = cs.keys.map(k => seg.keys[k] !== undefined ? seg.keys[k] : seg.keys[simdLocal(k)]);
      if (kv.some(v => v === undefined)) return { error: simdErr('missing-element', `missing key for list ${simdLocal(ch.key)}`, pathSoFar) };
      pathSoFar += '[' + cs.keys.map((k, i) => `${k}=${kv[i]}`).join('][') + ']';
      let idx = list ? list.findIndex(e => cs.keys.every((k, i) => simdKeyEq(e[k], kv[i]))) : -1;
      if (idx < 0 && opts.create && list) { const e = {}; cs.keys.forEach((k, i) => { const pv = simdParseValue(simdSpec(cs.c[k]).t, kv[i]); e[k] = pv.error ? kv[i] : pv.value; }); list.push(e); idx = list.length - 1; }
      cur = { spec: cs, value: idx >= 0 ? list[idx] : undefined, parent: list, key: idx, path: pathSoFar, isEntry: true, keyVals: kv, container: data, containerKey: ch.key };
      spec = cs; data = cur.value;
    } else {
      let v = data ? data[ch.key] : undefined;
      if (opts.create && data && v === undefined && cs.k === 'container') v = data[ch.key] = {};
      cur = { spec: cs, value: v, parent: data, key: ch.key, path: pathSoFar };
      spec = cs; data = cs.k === 'container' ? v : undefined;
    }
  }
  return cur;
}
function simdKeyEq(a, b) { return String(a) === String(b) || simdLocal(String(a)) === simdLocal(String(b)); }
/* joker destekli gezinti, gNMI icin. donus [{segs(concrete), spec, value, key}] */
function simdWalk(rootData, segs) {
  const out = [];
  const rec = (spec, data, i, concrete) => {
    if (i === segs.length) { out.push({ segs: concrete, spec, value: data }); return; }
    const seg = segs[i];
    const ch = simdChildSpec(spec, seg.name, seg.ns);
    if (!ch) throw simdErr('unknown-element', `unknown element: ${simdLocal(seg.name)}`, concrete.map(s => s.name).join('/'));
    const cs = ch.spec; const v = data ? data[ch.key] : undefined;
    if (cs.k === 'list') {
      const list = v || [];
      const want = seg.keys || {};
      const wild = !Object.keys(want).length || Object.values(want).some(x => x === '*');
      for (const e of list) {
        const okk = cs.keys.every(k => { const w = want[k] !== undefined ? want[k] : want[simdLocal(k)]; return w === undefined || w === '*' || simdKeyEq(e[k], w); });
        if (!okk) continue;
        const keys = {}; cs.keys.forEach(k => { const kt = simdSpec(cs.c[k]).t; keys[k] = kt === 'identityref' && typeof e[k] === 'string' ? simdLocal(e[k]) : e[k]; });
        rec(cs, e, i + 1, concrete.concat([{ name: simdLocal(ch.key), keys }]));
      }
      if (!wild && !list.length && i === segs.length - 1) { /* bos liste, veri yok */ }
    } else {
      if (v === undefined && i < segs.length - 1) { /* ara dugum yok, atla */ }
      rec(cs, v, i + 1, concrete.concat([{ name: simdLocal(ch.key), keys: null }]));
    }
  };
  rec(SIMD_ROOT_SPEC, rootData, 0, []);
  return out;
}

/* ---------- JSON govde -> veri agaci, dogrulamali ---------- */
function simdFromJson(spec, raw, path) {
  if (spec.k === 'leaf') { const r = simdParseValue(spec.t, raw); if (r.error) throw simdErr('invalid-value', r.error, path); return r.value; }
  if (spec.k === 'leaf-list') { const arr = Array.isArray(raw) ? raw : [raw]; return arr.map(x => { const r = simdParseValue(spec.t, x); if (r.error) throw simdErr('invalid-value', r.error, path); return r.value; }); }
  if (spec.k === 'list') {
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.map(e => { if (!e || typeof e !== 'object' || Array.isArray(e)) throw simdErr('malformed-message', `list entry must be an object at ${path}`, path); const o = simdFromJson({ k: 'container', c: spec.c }, e, path); spec.keys.forEach(k => { if (o[k] === undefined) throw simdErr('missing-element', `missing key "${k}" in list ${simdLocal(path.split('/').pop())}`, path); }); return o; });
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) { if (spec.presence && (raw === null || (Array.isArray(raw) && !raw.length))) return {}; throw simdErr('malformed-message', `expected object at ${path}`, path); }
  const out = {};
  for (const [name, val] of Object.entries(raw)) {
    const ch = simdChildSpec(spec, name);
    if (!ch) throw simdErr('unknown-element', `unknown element: ${simdLocal(name)} in ${path}`, path);
    out[ch.key] = simdFromJson(ch.spec, val, path + '/' + simdLocal(ch.key));
  }
  return out;
}
/* veri agaci -> JSON, modul on ekleri root ya da augment sinirinda */
function simdToJson(spec, value, enc, depth) {
  if (spec.k === 'leaf') return simdJsonValue(spec.t, value, enc);
  if (spec.k === 'leaf-list') return (value || []).map(v => simdJsonValue(spec.t, v, enc));
  if (spec.k === 'list') return (value || []).map(e => simdToJson({ k: 'container', c: spec.c, keys: spec.keys }, e, enc, depth));
  const out = {};
  if (depth !== undefined && depth <= 0) { if (spec.keys) spec.keys.forEach(k => { out[k] = simdJsonValue(simdSpec(spec.c[k]).t, value[k], enc); }); return out; }
  for (const [key, cs0] of Object.entries(spec.c)) {
    if (!value || value[key] === undefined) continue;
    const cs = simdSpec(cs0);
    out[key] = simdToJson(cs, value[key], enc, depth === undefined ? undefined : depth - 1);
  }
  return out;
}
/* alan secimi, fields=name;enabled ya da config(name;enabled) */
function simdFields(obj, expr) {
  if (!expr) return obj;
  const parse = s => { const out = []; let depth = 0, cur = ''; for (const ch of s) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ';' && depth === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out.map(x => { const m = /^([^(/]+)(?:\/(.*)|\((.*)\))?$/.exec(x.trim()); return m ? { name: m[1], sub: m[2] || m[3] || null } : { name: x.trim(), sub: null }; }); };
  const apply = (o, items) => {
    if (Array.isArray(o)) return o.map(e => apply(e, items));
    if (!o || typeof o !== 'object') return o;
    const out = {};
    for (const it of items) { const key = Object.keys(o).find(k => k === it.name || simdLocal(k) === it.name); if (key === undefined) continue; out[key] = it.sub ? apply(o[key], parse(it.sub)) : o[key]; }
    return out;
  };
  return apply(obj, parse(expr));
}
/* config disi dugumleri at */
function simdStripState(spec, value) {
  if (spec.ro) return undefined;
  if (spec.k === 'leaf' || spec.k === 'leaf-list') return value;
  if (spec.k === 'list') return (value || []).map(e => simdStripState({ k: 'container', c: spec.c }, e));
  const out = {};
  for (const [key, cs0] of Object.entries(spec.c)) { if (!value || value[key] === undefined) continue; const cs = simdSpec(cs0); if (cs.ro) continue; out[key] = simdStripState(cs, value[key]); }
  return out;
}
function simdOnlyState(spec, value, inherited) {
  if (spec.k === 'leaf' || spec.k === 'leaf-list') return (inherited || spec.ro) ? value : undefined;
  if (spec.k === 'list') { const arr = (value || []).map(e => simdOnlyState({ k: 'container', c: spec.c, keys: spec.keys }, e, inherited || spec.ro)).filter(e => e && Object.keys(e).some(k => !spec.keys.includes(k))); return arr; }
  const out = {}; let any = false;
  for (const [key, cs0] of Object.entries(spec.c)) { if (!value || value[key] === undefined) continue; const cs = simdSpec(cs0); const r = simdOnlyState(cs, value[key], inherited || spec.ro); if (r === undefined) continue; if (cs.k === 'list' && !r.length) continue; if (cs.k === 'container' && !Object.keys(r).length && !inherited && !cs.ro) continue; out[key] = r; any = true; }
  if (spec.keys && any) spec.keys.forEach(k => { if (value[k] !== undefined) out[k] = value[k]; });
  return any || inherited || spec.ro ? out : undefined;
}

/* ---------- birlestirme ---------- */
function simdMerge(spec, target, src) {
  if (spec.k === 'leaf' || spec.k === 'leaf-list') return src;
  if (spec.k === 'list') {
    const out = (target || []).slice();
    for (const e of src || []) { const i = out.findIndex(x => spec.keys.every(k => simdKeyEq(x[k], e[k]))); if (i < 0) out.push(e); else out[i] = simdMerge({ k: 'container', c: spec.c }, out[i], e); }
    return out;
  }
  const out = Object.assign({}, target || {});
  for (const [key, v] of Object.entries(src || {})) { const cs = simdSpec(spec.c[key]); out[key] = cs ? simdMerge(cs, out[key], v) : v; }
  return out;
}

/* ---------- XML ---------- */
function simdParseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const pe = doc.getElementsByTagName('parsererror');
  if (pe.length || !doc.documentElement) { const msg = pe.length ? (pe[0].textContent || '').split('\n').filter(l => l.trim()).slice(0, 2).join(' ').trim() : 'empty document'; return { error: msg }; }
  return { doc, root: doc.documentElement };
}
function simdChildren(el) { return Array.from(el.childNodes).filter(n => n.nodeType === 1); }
function simdText(el) { return Array.from(el.childNodes).filter(n => n.nodeType === 3 || n.nodeType === 4).map(n => n.nodeValue).join('').trim(); }
function simdOpAttr(el) { return el.getAttributeNS(SIMD_NS.nc, 'operation') || el.getAttribute('nc:operation') || el.getAttribute('operation') || null; }
const SIMD_OP = typeof Symbol !== 'undefined' ? Symbol('simd-op') : '__simdOp';
const SIMD_LEAFOPS = typeof Symbol !== 'undefined' ? Symbol('simd-leafops') : '__simdLeafOps';
/* XML eleman -> veri agaci. Tasiyici container/list entry nesnelerine operation bilgisi islenir */
function simdFromXml(spec, el, path) {
  if (spec.k === 'leaf') { const t = simdText(el); const r = simdParseValue(spec.t, spec.t === 'empty' ? '' : t); if (r.error) throw simdErr('invalid-value', r.error, path); return r.value; }
  const out = {};
  const op = simdOpAttr(el); if (op) { if (!/^(merge|replace|create|delete|remove)$/.test(op)) throw simdErr('bad-attribute', `bad value "${op}" for operation`, path); out[SIMD_OP] = op; }
  for (const c of simdChildren(el)) {
    const ch = simdChildSpec(spec, c.localName, c.namespaceURI);
    if (!ch) throw simdErr('unknown-element', `unknown element: ${c.localName} in ${path}`, path, c.localName);
    const cs = ch.spec; const p = path + '/' + simdLocal(ch.key);
    if (cs.k === 'leaf') { out[ch.key] = simdFromXml(cs, c, p); const lop = simdOpAttr(c); if (lop) { out[SIMD_LEAFOPS] = out[SIMD_LEAFOPS] || {}; out[SIMD_LEAFOPS][ch.key] = lop; } }
    else if (cs.k === 'leaf-list') { const r = simdParseValue(cs.t, simdText(c)); if (r.error) throw simdErr('invalid-value', r.error, p); (out[ch.key] = out[ch.key] || []).push(r.value); }
    else if (cs.k === 'list') { const e = simdFromXml({ k: 'container', c: cs.c }, c, p); cs.keys.forEach(k => { if (e[k] === undefined) throw simdErr('missing-element', `missing key "${k}" in list ${simdLocal(ch.key)}`, p); }); (out[ch.key] = out[ch.key] || []).push(e); }
    else out[ch.key] = simdMerge(cs, out[ch.key], simdFromXml(cs, c, p));
  }
  return out;
}
/* veri agaci -> XML metni */
function simdToXml(key, spec, value, parentMod, indent) {
  const local = simdLocal(key); const mod = simdModOf(key) || parentMod;
  const ns = mod !== parentMod && SIMD_NS[mod] ? ` xmlns="${SIMD_NS[mod]}"` : '';
  const pad = '  '.repeat(indent);
  if (spec.k === 'leaf') { if (spec.t === 'empty') return `${pad}<${local}${ns}/>\n`; const xv = simdXmlValue(spec.t, value); return `${pad}<${local}${ns}${xv.attrs}>${simdXmlEsc(xv.text)}</${local}>\n`; }
  if (spec.k === 'leaf-list') return (value || []).map(v => `${pad}<${local}${ns}>${simdXmlEsc(v)}</${local}>\n`).join('');
  if (spec.k === 'list') return (value || []).map(e => simdToXml(key, { k: 'container', c: spec.c }, e, parentMod, indent)).join('');
  let inner = '';
  for (const [ck, cs0] of Object.entries(spec.c)) { if (!value || value[ck] === undefined) continue; inner += simdToXml(ck, simdSpec(cs0), value[ck], mod, indent + 1); }
  if (!inner) return `${pad}<${local}${ns}/>\n`;
  return `${pad}<${local}${ns}>\n${inner}${pad}</${local}>\n`;
}
function simdRootsToXml(data, indent) { let s = ''; for (const [k, v] of Object.entries(data)) { if (v === undefined) continue; s += simdToXml(k, simdSpec(SIMD_ROOT_SPEC.c[k]), v, null, indent); } return s; }

/* ---------- subtree filter, RFC 6241 6.2 ---------- */
function simdFilterLevel(spec, data, felems) {
  if (data === undefined || data === null) return undefined;
  const out = {}; let any = false; let hasContain = false;
  const groups = [];
  for (const f of felems) {
    const ch = simdChildSpec(spec, f.localName, f.namespaceURI);
    if (!ch) continue;
    const kids = simdChildren(f); const txt = simdText(f);
    if (!kids.length && txt && (ch.spec.k === 'leaf' || ch.spec.k === 'leaf-list')) {
      /* icerik eslesmesi */
      const v = data[ch.key];
      if (v === undefined) return undefined;
      if (ch.spec.k === 'leaf-list') { if (!v.some(x => String(x) === txt)) return undefined; out[ch.key] = [txt]; }
      else { if (!simdKeyEq(v, txt)) return undefined; out[ch.key] = v; }
      any = true;
    } else groups.push({ ch, f, kids });
  }
  for (const { ch, f, kids } of groups) {
    hasContain = true;
    const cs = ch.spec; const v = data[ch.key];
    if (v === undefined) continue;
    if (!kids.length) { out[ch.key] = cs.k === 'list' && out[ch.key] ? out[ch.key].concat(simdClone(v)) : simdClone(v); any = true; continue; }
    if (cs.k === 'list') {
      const res = [];
      for (const e of v) { const r = simdFilterLevel({ k: 'container', c: cs.c }, e, kids); if (r !== undefined) { cs.keys.forEach(k => { if (e[k] !== undefined) r[k] = e[k]; }); res.push(r); } }
      if (res.length) { out[ch.key] = (out[ch.key] || []); res.forEach(r => { const i = out[ch.key].findIndex(x => cs.keys.every(k => simdKeyEq(x[k], r[k]))); if (i < 0) out[ch.key].push(r); else out[ch.key][i] = simdMerge({ k: 'container', c: cs.c }, out[ch.key][i], r); }); any = true; }
    } else if (cs.k === 'container') {
      const r = simdFilterLevel(cs, v, kids);
      if (r !== undefined) { out[ch.key] = simdMerge(cs, out[ch.key], r); any = true; }
    }
  }
  if (!hasContain) return any ? simdClone(data) : (felems.length ? undefined : simdClone(data));
  if (!any) { const onlyContent = felems.length && !groups.length; return onlyContent ? simdClone(data) : undefined; }
  if (spec.keys) spec.keys.forEach(k => { if (data[k] !== undefined) out[k] = data[k]; });
  return out;
}
function simdApplyFilter(rootData, filterEl) {
  const kids = filterEl ? simdChildren(filterEl) : [];
  if (!kids.length) return rootData;
  const r = simdFilterLevel(SIMD_ROOT_SPEC, rootData, kids);
  return r || {};
}

/* ---------- edit-config uygulama ---------- */
function simdApplyEdit(spec, target, src, defOp, path) {
  /* target: mevcut dugum (container nesnesi), src: islemli yeni veri */
  const leafOps = src[SIMD_LEAFOPS] || {};
  for (const key of Object.keys(src)) {
    const cs = simdSpec(spec.c[key]); const p = path + '/' + simdLocal(key);
    const v = src[key];
    if (cs.k === 'leaf' || cs.k === 'leaf-list') {
      const op = leafOps[key] || defOp;
      if (op === 'delete') { if (target[key] === undefined) throw simdErr('data-missing', 'Data does not exist; cannot delete resource', p); delete target[key]; }
      else if (op === 'remove') delete target[key];
      else if (op === 'create') { if (target[key] !== undefined) throw simdErr('data-exists', 'Data already exists; cannot create new resource', p); target[key] = v; }
      else if (op === 'none') { /* sadece gezinti */ }
      else target[key] = v;
      continue;
    }
    if (cs.k === 'list') {
      target[key] = target[key] || [];
      for (const e of v) {
        const op = e[SIMD_OP] || defOp;
        const ep = p + '[' + cs.keys.map(k => `${k}='${e[k]}'`).join('][') + ']';
        const i = target[key].findIndex(x => cs.keys.every(k => simdKeyEq(x[k], e[k])));
        if (op === 'delete') { if (i < 0) throw simdErr('data-missing', 'Data does not exist; cannot delete resource', ep); target[key].splice(i, 1); continue; }
        if (op === 'remove') { if (i >= 0) target[key].splice(i, 1); continue; }
        if (op === 'create') { if (i >= 0) throw simdErr('data-exists', 'Data already exists; cannot create new resource', ep); target[key].push(simdClone(e)); continue; }
        if (op === 'replace') { const ne = simdClone(e); if (i >= 0) target[key][i] = ne; else target[key].push(ne); continue; }
        if (op === 'none') { if (i < 0) { if (simdHasOps(e)) throw simdErr('data-missing', 'Data does not exist', ep); continue; } simdApplyEdit({ k: 'container', c: cs.c }, target[key][i], e, 'none', ep); continue; }
        /* merge */
        if (i < 0) { const ne = {}; cs.keys.forEach(k => { ne[k] = e[k]; }); target[key].push(ne); simdApplyEdit({ k: 'container', c: cs.c }, ne, e, 'merge', ep); }
        else simdApplyEdit({ k: 'container', c: cs.c }, target[key][i], e, 'merge', ep);
      }
      if (!target[key].length && defOp !== 'none') { /* bos liste kalabilir */ }
      continue;
    }
    /* container */
    const op = v[SIMD_OP] || defOp;
    if (op === 'delete') { if (target[key] === undefined) throw simdErr('data-missing', 'Data does not exist; cannot delete resource', p); delete target[key]; continue; }
    if (op === 'remove') { delete target[key]; continue; }
    if (op === 'create') { if (target[key] !== undefined && (cs.presence || Object.keys(target[key]).length)) throw simdErr('data-exists', 'Data already exists; cannot create new resource', p); target[key] = simdClone(v); continue; }
    if (op === 'replace') { target[key] = simdClone(v); continue; }
    if (op === 'none') { if (target[key] === undefined) { if (simdHasOps(v)) throw simdErr('data-missing', 'Data does not exist', p); continue; } simdApplyEdit(cs, target[key], v, 'none', p); continue; }
    if (target[key] === undefined) target[key] = {};
    simdApplyEdit(cs, target[key], v, 'merge', p);
  }
}
function simdHasOps(node) {
  if (!node || typeof node !== 'object') return false;
  if (node[SIMD_OP] || (node[SIMD_LEAFOPS] && Object.keys(node[SIMD_LEAFOPS]).length)) return true;
  return Object.values(node).some(v => Array.isArray(v) ? v.some(simdHasOps) : simdHasOps(v));
}

/* ---------- NETCONF ---------- */
const SIMD_NC_CAPS = [
  'urn:ietf:params:netconf:base:1.0', 'urn:ietf:params:netconf:base:1.1',
  'urn:ietf:params:netconf:capability:writable-running:1.0', 'urn:ietf:params:netconf:capability:candidate:1.0',
  'urn:ietf:params:netconf:capability:rollback-on-error:1.0', 'urn:ietf:params:netconf:capability:validate:1.0', 'urn:ietf:params:netconf:capability:validate:1.1',
  'urn:ietf:params:netconf:capability:xpath:1.0', 'urn:ietf:params:netconf:capability:notification:1.0', 'urn:ietf:params:netconf:capability:interleave:1.0',
  'urn:ietf:params:netconf:capability:with-defaults:1.0?basic-mode=explicit&also-supported=report-all-tagged,report-all',
  'urn:ietf:params:netconf:capability:yang-library:1.0?revision=2019-01-04&module-set-id=7a6c1b2d3e4f',
  'http://tail-f.com/ns/netconf/actions/1.0',
];
function simdModuleCaps() {
  const feats = { 'ietf-interfaces': 'arbitrary-names,pre-provisioning,if-mib', 'ietf-ip': 'ipv6-privacy-autoconf,ipv4-non-contiguous-netmasks' };
  return Object.keys(SIMD_MODULE_REV).map(m => `${SIMD_NS[m]}?module=${m}&revision=${SIMD_MODULE_REV[m]}${feats[m] ? '&features=' + feats[m] : ''}`);
}
function simdRpcError(err, extra) {
  const type = err.tag === 'malformed-message' || err.tag === 'lock-denied' || err.tag === 'missing-attribute' || err.tag === 'bad-attribute' ? 'protocol' : 'application';
  let s = `<rpc-error xmlns="${SIMD_NS.nc}">\n  <error-type>${type}</error-type>\n  <error-tag>${err.tag}</error-tag>\n  <error-severity>error</error-severity>\n`;
  if (err.path) s += `  <error-path>${simdXmlEsc(err.path)}</error-path>\n`;
  s += `  <error-message xml:lang="en">${simdXmlEsc(err.message)}</error-message>\n`;
  if (extra) s += `  <error-info>${extra}</error-info>\n`;
  return s + '</rpc-error>\n';
}
function simdNetconfEngine(dev) {
  const nc = dev.nc;
  const sidOf = sid => (sid == null || sid === '' ? 0 : Number(sid));
  const checkLock = (target, sid) => { const holder = nc.locks[target]; if (holder != null && holder !== sidOf(sid)) return simdErr('lock-denied', `Lock failed, lock is already held by session ${holder}`); return null; };
  const modelFor = target => target === 'candidate' ? (dev.candidate || (dev.candidate = simdClone(dev.model))) : dev.model;
  const api = {
    capabilities() { return SIMD_NC_CAPS.concat(simdModuleCaps()); },
    openSession(user, pass, host) { const u = dev.model.users.find(x => x.name === user); if (!u || u.secret !== pass) return { ok: false, error: 'Authentication failed' }; const id = nc.nextId++; nc.sessions[id] = { user, host: host || '10.0.0.100', since: Date.now() }; return { ok: true, sessionId: id }; },
    closeSession(sid) { const id = sidOf(sid); Object.keys(nc.locks).forEach(t => { if (nc.locks[t] === id) nc.locks[t] = null; }); delete nc.sessions[id]; return { ok: true }; },
    killSession(sid) { return api.closeSession(sid); },
    get(filterXml, sid) { return api._retrieve(dev.model, filterXml, true); },
    getConfig(source, filterXml, sid) { source = source || 'running'; if (source === 'startup') return api._retrieve(dev.model, filterXml, false); if (source !== 'running' && source !== 'candidate') return simdRpcError(simdErr('invalid-value', `unknown datastore ${source}`)); return api._retrieve(source === 'candidate' && dev.candidate ? dev.candidate : dev.model, filterXml, false); },
    _retrieve(model, filterXml, withState) {
      let data = simdProjectAll(dev, model, withState);
      if (!withState) { const cfg = {}; for (const [k, v] of Object.entries(data)) { const r = simdStripState(simdSpec(SIMD_ROOT_SPEC.c[k]), v); if (r !== undefined) cfg[k] = r; } data = cfg; }
      if (filterXml) {
        if (typeof filterXml !== 'string') filterXml = String(filterXml);
        const px = simdParseXml(filterXml.trim());
        if (px.error) return simdRpcError(simdErr('malformed-message', 'XML parse error: ' + px.error));
        let fel = px.root;
        if (fel.localName !== 'filter') { const wrap = px.doc.createElementNS(SIMD_NS.nc, 'filter'); wrap.appendChild(fel); fel = wrap; }
        const type = fel.getAttribute('type');
        if (type === 'xpath') { const sel = fel.getAttribute('select') || ''; data = simdXpathFilter(data, sel); }
        else data = simdApplyFilter(data, fel);
      }
      const inner = simdRootsToXml(data, 1);
      return `<data xmlns="${SIMD_NS.nc}" xmlns:nc="${SIMD_NS.nc}">\n${inner}</data>\n`;
    },
    editConfig(target, configXml, defaultOperation, sid, opts) {
      target = target || 'running'; defaultOperation = defaultOperation || 'merge';
      if (target !== 'running' && target !== 'candidate') return { ok: false, error: simdRpcError(simdErr('invalid-value', `unknown datastore ${target}`)) };
      if (!/^(merge|replace|none)$/.test(defaultOperation)) return { ok: false, error: simdRpcError(simdErr('invalid-value', `bad default-operation "${defaultOperation}"`)) };
      const lk = checkLock(target, sid); if (lk) return { ok: false, error: simdRpcError(lk, `<session-id>${nc.locks[target]}</session-id>`) };
      if (target === 'running' && nc.locks.candidate != null && nc.locks.candidate !== sidOf(sid) && dev.candidate) { /* izin ver, IOS-XE da izin verir */ }
      const px = simdParseXml(String(configXml || '').trim());
      if (px.error) return { ok: false, error: simdRpcError(simdErr('malformed-message', 'XML parse error: ' + px.error)) };
      let roots = px.root.localName === 'config' ? simdChildren(px.root) : [px.root];
      const model = modelFor(target);
      const data = simdProjectAll(dev, model, false);
      const touched = [];
      try {
        const src = {};
        for (const r of roots) {
          const ch = simdChildSpec(SIMD_ROOT_SPEC, r.localName, r.namespaceURI);
          if (!ch) throw simdErr('unknown-element', `unknown element: ${r.localName}`, '/' + r.localName, r.localName);
          const parsed = simdFromXml(ch.spec, r, '/' + ch.key);
          if (src[ch.key]) src[ch.key] = simdMerge(ch.spec, src[ch.key], parsed); else src[ch.key] = parsed;
          if (!touched.includes(ch.key)) touched.push(ch.key);
        }
        simdApplyEdit(SIMD_ROOT_SPEC, data, src, defaultOperation, '');
        if (opts && opts.testOnly) return { ok: true };
        const err = simdUnproject(dev, model, data, touched);
        if (err) return { ok: false, error: simdRpcError(err) };
      } catch (e) {
        if (e && e.tag) return { ok: false, error: simdRpcError(e, e.tag === 'unknown-element' && e.path ? `<bad-element>${simdXmlEsc(e.path.split('/').pop().split('[')[0])}</bad-element>` : '') };
        throw e;
      }
      if (target === 'running') dev.log.push(`*${simdIosClock().slice(0, 12)}: %DMI-5-CONFIG_I: R0/0: dmiauthd: Configured from NETCONF/RESTCONF by admin, transaction-id ${nc.txn++}`);
      return { ok: true };
    },
    lock(target, sid) { target = target || 'running'; if (!(target in nc.locks)) return { ok: false, error: simdRpcError(simdErr('invalid-value', `unknown datastore ${target}`)) }; const h = nc.locks[target]; if (h != null && h !== sidOf(sid)) return { ok: false, error: simdRpcError(simdErr('lock-denied', `Lock failed, lock is already held by session ${h}`), `<session-id>${h}</session-id>`) }; if (h === sidOf(sid)) return { ok: false, error: simdRpcError(simdErr('lock-denied', 'Lock failed, lock is already held'), `<session-id>${h}</session-id>`) }; if (target === 'candidate' && dev.candidate && nc.candidateDirtyBy != null && nc.candidateDirtyBy !== sidOf(sid)) return { ok: false, error: simdRpcError(simdErr('lock-denied', 'Lock failed, candidate has uncommitted changes'), `<session-id>0</session-id>`) }; nc.locks[target] = sidOf(sid); return { ok: true }; },
    unlock(target, sid) { target = target || 'running'; const h = nc.locks[target]; if (h == null) return { ok: false, error: simdRpcError(simdErr('operation-failed', 'Unlock failed, lock is not active')) }; if (h !== sidOf(sid)) return { ok: false, error: simdRpcError(simdErr('lock-denied', `Unlock failed, lock is held by session ${h}`), `<session-id>${h}</session-id>`) }; nc.locks[target] = null; return { ok: true }; },
    commit(sid) { const lk = checkLock('running', sid); if (lk) return { ok: false, error: simdRpcError(lk, `<session-id>${nc.locks.running}</session-id>`) }; if (dev.candidate) { Object.keys(dev.candidate).forEach(k => { dev.model[k] = dev.candidate[k]; }); dev.candidate = null; dev.lastChange = Date.now(); dev.log.push(`*${simdIosClock().slice(0, 12)}: %DMI-5-CONFIG_I: R0/0: dmiauthd: Configured from NETCONF/RESTCONF by admin, transaction-id ${nc.txn++}`); } return { ok: true }; },
    discard(sid) { dev.candidate = null; return { ok: true }; },
    discardChanges(sid) { return api.discard(sid); },
    validate(source, sid) {
      source = source || 'candidate';
      const m = source === 'candidate' ? (dev.candidate || dev.model) : source === 'running' ? dev.model : null;
      if (!m) {
        /* inline config */
        const px = simdParseXml(String(source).trim()); if (px.error) return { ok: false, error: simdRpcError(simdErr('malformed-message', 'XML parse error: ' + px.error)) };
        const r = api.editConfig('candidate', source, 'merge', sid, { testOnly: true }); return r;
      }
      for (const [n, i] of Object.entries(m.interfaces)) { if (i.ip && (!simdIsIp(i.ip) || !simdIsMask(i.mask || ''))) return { ok: false, error: simdRpcError(simdErr('invalid-value', `"${i.ip} ${i.mask}" is not a valid value.`, `/native/interface/${n}`)) }; }
      for (const nb of m.bgp.neighbors) { if (!simdIsIp(nb.ip)) return { ok: false, error: simdRpcError(simdErr('invalid-value', `"${nb.ip}" is not a valid value.`, '/native/router/bgp')) }; }
      return { ok: true };
    },
    copyConfig(target, source, sid) { if (target === 'startup' && source === 'running') { dev.startup = simdRunning(dev); return { ok: true }; } return { ok: false, error: simdRpcError(simdErr('operation-not-supported', `copy-config ${source} to ${target} is not supported`)) }; },
    /* ham rpc, ncclient shim ve ssh -s netconf icin. Tam rpc-reply dondurur */
    rpc(xml, sid) {
      const px = simdParseXml(String(xml || '').trim());
      const reply = (body, mid) => `<?xml version="1.0" encoding="UTF-8"?>\n<rpc-reply xmlns="${SIMD_NS.nc}" message-id="${simdXmlEsc(mid || '1')}">\n${body}</rpc-reply>`;
      if (px.error) return reply(simdRpcError(simdErr('malformed-message', 'XML parse error: ' + px.error)), '1');
      let root = px.root;
      const mid = root.getAttribute('message-id') || '1';
      const ops = root.localName === 'rpc' ? simdChildren(root) : [root];
      if (!ops.length) return reply(simdRpcError(simdErr('malformed-message', 'rpc has no operation')), mid);
      const op = ops[0]; const name = op.localName;
      const child = n => simdChildren(op).find(c => c.localName === n);
      const dsName = el => { const c = el && simdChildren(el)[0]; return c ? c.localName : null; };
      const res = r => r.ok ? reply('<ok/>\n', mid) : reply(r.error, mid);
      const ser = new XMLSerializer();
      if (name === 'get' || name === 'get-config') {
        const f = child('filter'); const fx = f ? ser.serializeToString(f) : null;
        const src = name === 'get' ? null : dsName(child('source'));
        const out = name === 'get' ? api.get(fx, sid) : api.getConfig(src || 'running', fx, sid);
        return reply(out, mid);
      }
      if (name === 'edit-config') {
        const tgt = dsName(child('target')) || 'running'; const dop = child('default-operation'); const cfg = child('config');
        if (!cfg) return reply(simdRpcError(simdErr('missing-element', 'missing config element', '/rpc/edit-config'), '<bad-element>config</bad-element>'), mid);
        const to = child('test-option'); const r = api.editConfig(tgt, ser.serializeToString(cfg), dop ? simdText(dop) : 'merge', sid, to && simdText(to) === 'test-only' ? { testOnly: true } : null);
        return res(r);
      }
      if (name === 'lock') return res(api.lock(dsName(child('target')), sid));
      if (name === 'unlock') return res(api.unlock(dsName(child('target')), sid));
      if (name === 'commit') return res(api.commit(sid));
      if (name === 'discard-changes') return res(api.discard(sid));
      if (name === 'validate') { const s = child('source'); const inner = s && simdChildren(s)[0]; if (inner && inner.localName === 'config') return res(api.validate(ser.serializeToString(inner), sid)); return res(api.validate(dsName(s) || 'candidate', sid)); }
      if (name === 'close-session') return res(api.closeSession(sid));
      if (name === 'kill-session') { const s = child('session-id'); return res(api.closeSession(s ? simdText(s) : sid)); }
      if (name === 'copy-config') return res(api.copyConfig(dsName(child('target')), dsName(child('source')), sid));
      if (name === 'save-config' && (op.namespaceURI === SIMD_NS['Cisco-IOS-XE-rpc'] || op.namespaceURI === 'http://cisco.com/yang/cisco-ia' || !op.namespaceURI)) { dev.startup = simdRunning(dev); return reply(`<result xmlns="${op.namespaceURI || SIMD_NS['Cisco-IOS-XE-rpc']}">Save running-config successful</result>\n`, mid); }
      if (name === 'get-schema') { const id = child('identifier'); const nm = id ? simdText(id) : ''; const y = SIMD_YANG_FILES[nm + '.yang'] || SIMD_YANG_FILES[Object.keys(SIMD_YANG_FILES).find(f => f.startsWith(nm + '@')) || '']; if (!y) return reply(simdRpcError(simdErr('invalid-value', `module ${nm} not found`)), mid); return reply(`<data xmlns="urn:ietf:params:xml:ns:yang:ietf-netconf-monitoring"><![CDATA[${y}]]></data>\n`, mid); }
      return reply(simdRpcError(simdErr('operation-not-supported', `operation ${name} is not supported`), `<bad-element>${simdXmlEsc(name)}</bad-element>`), mid);
    },
  };
  return api;
}
/* basit xpath filtresi, /if:interfaces/if:interface[if:name='Gi2']/if:description benzeri yollar */
function simdXpathFilter(data, sel) {
  const segs = [];
  const re = /\/([A-Za-z0-9_:-]+)((?:\[[^\]]*\])*)/g; let m;
  while ((m = re.exec(sel))) { const keys = {}; const kre = /\[(?:[A-Za-z0-9_-]+:)?([A-Za-z0-9_-]+)\s*=\s*['"]([^'"]*)['"]\]/g; let km; while ((km = kre.exec(m[2]))) keys[km[1]] = km[2]; segs.push({ name: m[1].includes(':') ? m[1].split(':')[1] : m[1], keys: Object.keys(keys).length ? keys : null, pfx: m[1].includes(':') ? m[1].split(':')[0] : null }); }
  if (!segs.length) return data;
  /* ilk segmentte modul secimi, on ek ipucu */
  const pfxMod = { if: 'ietf-interfaces', ip: 'ietf-ip', ios: 'Cisco-IOS-XE-native', native: 'Cisco-IOS-XE-native', oc: 'openconfig-interfaces', 'oc-if': 'openconfig-interfaces', 'oc-sys': 'openconfig-system' };
  if (segs[0].pfx && pfxMod[segs[0].pfx]) segs[0].name = pfxMod[segs[0].pfx] + ':' + segs[0].name;
  let hits; try { hits = simdWalk(data, segs); } catch (e) { return {}; }
  const out = {};
  for (const h of hits) {
    let node = out; let spec = SIMD_ROOT_SPEC; let cur = data;
    for (let i = 0; i < h.segs.length; i++) {
      const s = h.segs[i]; const ch = simdChildSpec(spec, i === 0 ? segs[0].name : s.name); const cs = ch.spec;
      const last = i === h.segs.length - 1;
      if (cs.k === 'list') { node[ch.key] = node[ch.key] || []; const e = cur[ch.key].find(x => cs.keys.every(k => simdKeyEq(x[k], s.keys[k]))); let ne = node[ch.key].find(x => cs.keys.every(k => simdKeyEq(x[k], s.keys[k]))); if (!ne) { ne = {}; cs.keys.forEach(k => { ne[k] = e[k]; }); node[ch.key].push(ne); } if (last) Object.assign(ne, simdClone(e)); node = ne; cur = e; }
      else if (cs.k === 'container') { if (last) node[ch.key] = simdClone(cur[ch.key]); else node[ch.key] = node[ch.key] || {}; node = node[ch.key]; cur = cur[ch.key] || {}; }
      else node[ch.key] = cur[ch.key];
      spec = cs;
    }
  }
  return out;
}

/* ---------- RESTCONF ---------- */
const SIMD_RC_JSON = 'application/yang-data+json', SIMD_RC_XML = 'application/yang-data+xml';
function simdRcErrors(status, tag, message, type, fmt, path) {
  const e = { 'error-type': type || 'application', 'error-tag': tag };
  if (path) e['error-path'] = path;
  e['error-message'] = message;
  if (fmt === 'xml') return { status, headers: { 'content-type': SIMD_RC_XML }, body: `<errors xmlns="urn:ietf:params:xml:ns:yang:ietf-restconf">\n  <error>\n    <error-type>${e['error-type']}</error-type>\n    <error-tag>${tag}</error-tag>\n${path ? `    <error-path>${simdXmlEsc(path)}</error-path>\n` : ''}    <error-message>${simdXmlEsc(message)}</error-message>\n  </error>\n</errors>\n` };
  return { status, headers: { 'content-type': SIMD_RC_JSON }, body: JSON.stringify({ 'ietf-restconf:errors': { error: [e] } }, null, 2) + '\n' };
}
const SIMD_RC_TAG_STATUS = { 'unknown-element': 400, 'invalid-value': 400, 'missing-element': 400, 'malformed-message': 400, 'data-exists': 409, 'data-missing': 404, 'operation-failed': 500, 'lock-denied': 409, 'operation-not-supported': 501, 'bad-attribute': 400 };
function simdParseRcPath(p) {
  const segs = [];
  for (const raw of p.split('/').filter(Boolean)) {
    const i = raw.indexOf('=');
    const name = decodeURIComponent(i < 0 ? raw : raw.slice(0, i));
    const keys = i < 0 ? null : raw.slice(i + 1).split(',').map(x => decodeURIComponent(x));
    segs.push({ name, keyList: keys });
  }
  return segs;
}
function simdRestconfEngine(dev) {
  const baseHeaders = () => ({ server: 'nginx', 'cache-control': 'private, no-cache, must-revalidate, proxy-revalidate', pragma: 'no-cache', date: new Date().toUTCString() });
  function request(method, path, body, headers) {
    method = String(method || 'GET').toUpperCase();
    const h = {}; Object.entries(headers || {}).forEach(([k, v]) => { h[String(k).toLowerCase()] = String(v); });
    let query = {}; const qi = path.indexOf('?'); if (qi >= 0) { query = Object.fromEntries(new URLSearchParams(path.slice(qi + 1)).entries()); path = path.slice(0, qi); }
    const accept = h.accept || '';
    const fmt = /yang-data\+xml|application\/xml|text\/xml/.test(accept) && !/yang-data\+json/.test(accept) ? 'xml' : 'json';
    const wrap = r => { r.headers = Object.assign(baseHeaders(), r.headers || {}); return r; };
    if (path === '/.well-known/host-meta') return wrap({ status: 200, headers: { 'content-type': 'application/xrd+xml' }, body: `<XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>\n    <Link rel='restconf' href='/restconf'/>\n</XRD>\n` });
    if (!path.startsWith('/restconf')) return wrap({ status: 404, headers: { 'content-type': 'text/html' }, body: '<html>\r\n<head><title>404 Not Found</title></head>\r\n<body>\r\n<center><h1>404 Not Found</h1></center>\r\n<hr><center>nginx</center>\r\n</body>\r\n</html>\r\n' });
    /* kimlik */
    const auth = h.authorization || '';
    let user = null;
    if (/^basic /i.test(auth)) { try { const dec = atob(auth.slice(6).trim()); const i = dec.indexOf(':'); const u = dec.slice(0, i), p = dec.slice(i + 1); const acc = dev.model.users.find(x => x.name === u); if (acc && acc.secret === p && acc.privilege >= 15) user = u; } catch (e) { user = null; } }
    if (!user) return wrap({ status: 401, headers: { 'content-type': fmt === 'xml' ? SIMD_RC_XML : SIMD_RC_JSON, 'www-authenticate': 'Basic realm="restconf", charset="UTF-8"' }, body: simdRcErrors(401, 'access-denied', 'Unauthorized', 'protocol', fmt).body });
    /* icerik tipi pazarligi */
    if (accept && !/yang-data\+json|yang-data\+xml|\*\/\*|application\/\*|yang\.data/.test(accept)) return wrap(simdRcErrors(406, 'invalid-value', `Not Acceptable, supported media types are ${SIMD_RC_JSON} and ${SIMD_RC_XML}`, 'protocol', 'json'));
    const hasBody = body != null && String(body).length > 0;
    let bodyFmt = null;
    if (['PUT', 'POST', 'PATCH'].includes(method)) {
      const ct = h['content-type'] || '';
      if (hasBody && !ct) return wrap(simdRcErrors(415, 'invalid-value', 'Content-Type header is missing, use application/yang-data+json or application/yang-data+xml', 'protocol', fmt));
      if (hasBody && !/yang-data\+json|yang-data\+xml/.test(ct)) return wrap(simdRcErrors(415, 'invalid-value', `Unsupported Media Type ${ct.split(';')[0]}, use application/yang-data+json or application/yang-data+xml`, 'protocol', fmt));
      bodyFmt = /xml/.test(ct) ? 'xml' : 'json';
    }
    const ok = (status, data, extraHeaders) => {
      if (data === undefined) return wrap({ status, headers: Object.assign({ 'content-type': fmt === 'xml' ? SIMD_RC_XML : SIMD_RC_JSON }, extraHeaders || {}), body: '' });
      return wrap({ status, headers: Object.assign({ 'content-type': fmt === 'xml' ? SIMD_RC_XML : SIMD_RC_JSON }, extraHeaders || {}), body: fmt === 'xml' ? data.xml : JSON.stringify(data.json, null, 2) + '\n' });
    };
    const fail = e => wrap(simdRcErrors(SIMD_RC_TAG_STATUS[e.tag] || 400, e.tag, e.message, e.type || 'application', fmt, e.path || undefined));
    if (path === '/restconf' || path === '/restconf/') return ok(200, { json: { 'ietf-restconf:restconf': { data: {}, operations: {}, 'yang-library-version': '2016-06-21' } }, xml: `<restconf xmlns="urn:ietf:params:xml:ns:yang:ietf-restconf">\n  <data/>\n  <operations/>\n  <yang-library-version>2016-06-21</yang-library-version>\n</restconf>\n` });
    if (path === '/restconf/yang-library-version') return ok(200, { json: { 'ietf-restconf:yang-library-version': '2016-06-21' }, xml: `<yang-library-version xmlns="urn:ietf:params:xml:ns:yang:ietf-restconf">2016-06-21</yang-library-version>\n` });
    if (path.startsWith('/restconf/operations')) {
      const opn = path.replace(/^\/restconf\/operations\/?/, '');
      if (!opn) return ok(200, { json: { 'ietf-restconf:operations': { 'Cisco-IOS-XE-rpc:save-config': [null], 'Cisco-IOS-XE-rpc:default': [null], 'Cisco-IOS-XE-rpc:reload': [null], 'cisco-ia:save-config': [null], 'cisco-ia:sync-from': [null] } }, xml: `<operations xmlns="urn:ietf:params:xml:ns:yang:ietf-restconf">\n  <save-config xmlns="${SIMD_NS['Cisco-IOS-XE-rpc']}"/>\n</operations>\n` });
      if (method !== 'POST') return wrap(simdRcErrors(405, 'operation-not-supported', `Method ${method} not allowed on an operation resource, use POST`, 'protocol', fmt));
      if (opn === 'Cisco-IOS-XE-rpc:save-config' || opn === 'cisco-ia:save-config') { dev.startup = simdRunning(dev); const pfx = opn.split(':')[0]; return ok(200, { json: { [pfx + ':output']: { result: 'Save running-config successful' } }, xml: `<output xmlns="${pfx === 'cisco-ia' ? 'http://cisco.com/yang/cisco-ia' : SIMD_NS['Cisco-IOS-XE-rpc']}">\n  <result>Save running-config successful</result>\n</output>\n` }); }
      if (opn === 'Cisco-IOS-XE-rpc:reload') return ok(200, { json: { 'Cisco-IOS-XE-rpc:output': { result: 'Reload scheduled in 0 minutes, lab devices never really go down' } }, xml: `<output xmlns="${SIMD_NS['Cisco-IOS-XE-rpc']}">\n  <result>Reload scheduled</result>\n</output>\n` });
      return wrap(simdRcErrors(404, 'invalid-value', 'uri keypath not found', 'application', fmt));
    }
    if (path.startsWith('/restconf/data')) {
      const sub = path.replace(/^\/restconf\/data\/?/, '');
      const segs = simdParseRcPath(sub);
      /* anahtar listelerini sema ile eslestir */
      const withState = (query.content || 'all') !== 'config';
      const data = simdProjectAll(dev, dev.model, withState);
      const resolveSegs = segs2 => {
        let spec = SIMD_ROOT_SPEC; const out = [];
        for (const s of segs2) { const ch = simdChildSpec(spec, s.name); if (!ch) { out.push({ name: s.name, keys: null }); break; } const cs = ch.spec; let keys = null; if (cs.k === 'list' && s.keyList) { keys = {}; cs.keys.forEach((k, i) => { if (s.keyList[i] !== undefined) keys[k] = s.keyList[i]; }); } out.push({ name: s.name, keys }); spec = cs; }
        return out;
      };
      if (!segs.length) {
        if (method !== 'GET' && method !== 'HEAD') return wrap(simdRcErrors(405, 'operation-not-supported', 'Method not allowed on the datastore resource', 'protocol', fmt));
        const json = {}; Object.entries(data).forEach(([k, v]) => { json[k] = simdToJson(simdSpec(SIMD_ROOT_SPEC.c[k]), v, 'json_ietf', query.depth ? Number(query.depth) : undefined); });
        return ok(200, { json: { 'ietf-restconf:data': json }, xml: `<data xmlns="urn:ietf:params:xml:ns:yang:ietf-restconf">\n${simdRootsToXml(data, 1)}</data>\n` });
      }
      if (!segs[0].name.includes(':')) return wrap(simdRcErrors(400, 'invalid-value', `uri keypath not found, the first node must be module qualified, for example ietf-interfaces:${segs[0].name}`, 'application', fmt));
      const rsegs = resolveSegs(segs);
      const cur = simdResolve(data, rsegs, { create: false });
      if (cur.error) { if (cur.error.tag === 'unknown-element') return wrap(simdRcErrors(400, 'invalid-value', 'uri keypath not found', 'application', fmt)); return fail(cur.error); }
      const topMod = simdModOf(rsegs[0].name) || simdModOf(cur.key || '');
      const modOfKey = () => { let mod = simdModOf(rsegs[0].name); let spec = SIMD_ROOT_SPEC; for (const s of rsegs) { const ch = simdChildSpec(spec, s.name); if (!ch) break; if (simdModOf(ch.key)) mod = simdModOf(ch.key); spec = ch.spec; } return mod; };
      const leafName = simdLocal(cur.isEntry ? cur.containerKey : cur.key);
      const render = (value, status) => {
        const d = query.depth ? Number(query.depth) : undefined;
        let v = value;
        if (query.content === 'nonconfig') v = simdOnlyState(cur.spec, v, false); else if (query.content === 'config') v = simdStripState(cur.spec, v);
        let json = simdToJson(cur.isEntry ? { k: 'container', c: cur.spec.c, keys: cur.spec.keys } : cur.spec, v, 'json_ietf', d);
        if (query.fields) json = simdFields(json, query.fields);
        const key = `${modOfKey()}:${leafName}`;
        const xml = simdToXml(`${modOfKey()}:${leafName}`, cur.isEntry ? { k: 'container', c: cur.spec.c } : cur.spec, v, null, 0);
        return ok(status, { json: { [key]: json }, xml });
      };
      if (method === 'GET' || method === 'HEAD') {
        if (cur.value === undefined) return wrap(simdRcErrors(404, 'invalid-value', 'uri keypath not found', 'application', fmt));
        const r = render(cur.value, 200); if (method === 'HEAD') r.body = ''; return r;
      }
      if (method === 'OPTIONS') return wrap({ status: 200, headers: { allow: 'DELETE, GET, HEAD, PATCH, POST, PUT, OPTIONS', 'accept-patch': SIMD_RC_JSON + ', ' + SIMD_RC_XML }, body: '' });
      if (!['PUT', 'POST', 'PATCH', 'DELETE'].includes(method)) return wrap(simdRcErrors(405, 'operation-not-supported', `Method ${method} not allowed`, 'protocol', fmt));
      if (cur.spec.ro || rsegs.some(s => /interfaces-state/.test(s.name))) return wrap(simdRcErrors(405, 'operation-not-supported', 'resource is read only', 'protocol', fmt));
      if (dev.nc.locks.running != null) return wrap(simdRcErrors(409, 'lock-denied', `running datastore is locked by NETCONF session ${dev.nc.locks.running}`, 'protocol', fmt));
      const touched = [simdLocal(rsegs[0].name) === 'interfaces' || true ? rsegs[0].name : rsegs[0].name];
      const commit = () => { const err = simdUnproject(dev, dev.model, data, touched); if (err) return fail(err); dev.log.push(`*${simdIosClock().slice(0, 12)}: %DMI-5-CONFIG_I: R0/0: dmiauthd: Configured from NETCONF/RESTCONF by ${user}, transaction-id ${dev.nc.txn++}`); return null; };
      if (method === 'DELETE') {
        if (cur.value === undefined) return wrap(simdRcErrors(404, 'invalid-value', 'uri keypath not found', 'application', fmt));
        if (cur.isEntry) cur.parent.splice(cur.key, 1); else if (cur.isList) cur.parent[cur.key] = []; else delete cur.parent[cur.key];
        const e = commit(); if (e) return e;
        return ok(204, undefined);
      }
      /* govde cozumle */
      let parsed; /* {key, value, spec} */
      const parseBody = (specForBody, allowChildOf) => {
        if (!hasBody) throw simdErr('malformed-message', 'request body is empty');
        if (bodyFmt === 'xml') {
          const px = simdParseXml(String(body).trim()); if (px.error) throw simdErr('malformed-message', 'XML parse error: ' + px.error);
          const el = px.root;
          if (allowChildOf) { const ch = simdChildSpec(allowChildOf, el.localName, el.namespaceURI); if (!ch) throw simdErr('unknown-element', `unknown element: ${el.localName}`); const v = ch.spec.k === 'list' ? [simdFromXml({ k: 'container', c: ch.spec.c }, el, '/' + ch.key)] : simdFromXml(ch.spec, el, '/' + ch.key); if (ch.spec.k === 'list') ch.spec.keys.forEach(k => { if (v[0][k] === undefined) throw simdErr('missing-element', `missing key "${k}"`); }); return { key: ch.key, value: v, spec: ch.spec }; }
          if (el.localName !== leafName) throw simdErr('invalid-value', `body element "${el.localName}" does not match the target resource "${leafName}"`);
          const v = specForBody.k === 'leaf' ? simdFromXml(specForBody, el, '/' + leafName) : simdFromXml(cur.isEntry ? { k: 'container', c: specForBody.c } : specForBody, el, '/' + leafName);
          return { key: leafName, value: v, spec: specForBody };
        }
        let obj; try { obj = JSON.parse(String(body)); } catch (e) { throw simdErr('malformed-message', 'syntax error: ' + (e.message || 'bad json').replace(/^JSON\.parse: /, '')); }
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw simdErr('malformed-message', 'syntax error: the body must be a JSON object with one module qualified top node');
        const keys = Object.keys(obj); if (keys.length !== 1) throw simdErr('malformed-message', 'the body must contain exactly one top level node');
        const k0 = keys[0]; let v0 = obj[k0];
        if (allowChildOf) { const ch = simdChildSpec(allowChildOf, k0); if (!ch) throw simdErr('unknown-element', `unknown element: ${simdLocal(k0)}`); const v = simdFromJson(ch.spec, v0, '/' + simdLocal(ch.key)); return { key: ch.key, value: v, spec: ch.spec }; }
        if (simdLocal(k0) !== leafName) throw simdErr('invalid-value', `body node "${k0}" does not match the target resource "${leafName}"`);
        if (cur.isEntry) { if (Array.isArray(v0)) { if (v0.length !== 1) throw simdErr('invalid-value', 'exactly one list entry expected'); v0 = v0[0]; } const v = simdFromJson({ k: 'container', c: specForBody.c }, v0, '/' + leafName); specForBody.keys.forEach((k, i) => { if (v[k] === undefined) v[k] = simdParseValue(simdSpec(specForBody.c[k]).t, cur.keyVals[i]).value; else if (!simdKeyEq(v[k], cur.keyVals[i])) throw simdErr('invalid-value', `key "${k}" in body (${v[k]}) does not match the uri (${cur.keyVals[i]})`); }); return { key: leafName, value: v, spec: specForBody }; }
        return { key: leafName, value: simdFromJson(specForBody, v0, '/' + leafName), spec: specForBody };
      };
      try {
        if (method === 'POST') {
          if (cur.value === undefined) return wrap(simdRcErrors(404, 'invalid-value', 'uri keypath not found', 'application', fmt));
          if (cur.spec.k === 'leaf' || cur.spec.k === 'leaf-list') return wrap(simdRcErrors(405, 'operation-not-supported', 'POST is not allowed on a leaf, use PUT or PATCH on the parent', 'protocol', fmt));
          const target = cur.isList ? null : cur.value;
          if (cur.isList) return wrap(simdRcErrors(405, 'operation-not-supported', 'POST to a list without key is not allowed, POST to the parent container instead', 'protocol', fmt));
          parsed = parseBody(null, cur.isEntry ? { k: 'container', c: cur.spec.c } : cur.spec);
          let loc;
          if (parsed.spec.k === 'list') {
            const e = parsed.value[0]; const list = target[parsed.key] = target[parsed.key] || [];
            if (list.some(x => parsed.spec.keys.every(k => simdKeyEq(x[k], e[k])))) return wrap(simdRcErrors(409, 'data-exists', `object already exists: ${cur.path}/${simdLocal(parsed.key)}[${parsed.spec.keys.map(k => `${k}='${e[k]}'`).join('][')}]`, 'application', fmt));
            list.push(e); loc = `${simdLocal(parsed.key)}=${parsed.spec.keys.map(k => encodeURIComponent(e[k])).join(',')}`;
          } else if (parsed.spec.k === 'leaf-list') { target[parsed.key] = (target[parsed.key] || []).concat(parsed.value); loc = simdLocal(parsed.key); }
          else {
            if (target[parsed.key] !== undefined && (parsed.spec.k === 'leaf' || parsed.spec.presence || Object.keys(target[parsed.key]).length)) return wrap(simdRcErrors(409, 'data-exists', `object already exists: ${cur.path}/${simdLocal(parsed.key)}`, 'application', fmt));
            target[parsed.key] = parsed.value; loc = simdLocal(parsed.key);
          }
          const e = commit(); if (e) return e;
          return ok(201, undefined, { location: `https://${dev.host}${path.replace(/\/$/, '')}/${loc}` });
        }
        if (method === 'PUT') {
          parsed = parseBody(cur.spec);
          const existed = cur.value !== undefined;
          if (cur.isEntry) { if (existed) cur.parent[cur.key] = parsed.value; else { const c2 = simdResolve(data, rsegs, { create: true }); c2.parent[c2.key] = parsed.value; } }
          else if (cur.isList) cur.parent[cur.key] = parsed.value;
          else { const c2 = existed ? cur : simdResolve(data, rsegs.slice(0, -1), { create: true }); if (existed) cur.parent[cur.key] = parsed.value; else { const chk = simdChildSpec(c2.spec, rsegs[rsegs.length - 1].name); const holder = c2.isEntry || c2.spec.k === 'container' ? c2.value : null; if (!holder) return wrap(simdRcErrors(404, 'invalid-value', 'uri keypath not found', 'application', fmt)); holder[chk.key] = parsed.value; } }
          const e = commit(); if (e) return e;
          return ok(existed ? 204 : 201, undefined, existed ? {} : { location: `https://${dev.host}${path}` });
        }
        if (method === 'PATCH') {
          if (cur.value === undefined) return wrap(simdRcErrors(404, 'invalid-value', 'uri keypath not found', 'application', fmt));
          parsed = parseBody(cur.spec);
          if (cur.isEntry) cur.parent[cur.key] = simdMerge({ k: 'container', c: cur.spec.c }, cur.value, parsed.value);
          else cur.parent[cur.key] = simdMerge(cur.spec, cur.value, parsed.value);
          const e = commit(); if (e) return e;
          return ok(204, undefined);
        }
      } catch (e) { if (e && e.tag) return fail(e); throw e; }
    }
    return wrap(simdRcErrors(404, 'invalid-value', 'uri keypath not found', 'application', fmt));
  }
  return { request };
}

/* ---------- gNMI ---------- */
function simdParseGnmiPath(p) {
  p = String(p || '').trim();
  let origin = null; const om = /^([A-Za-z0-9_-]+):\/(.*)$/.exec(p); if (om) { origin = om[1]; p = '/' + om[2]; }
  if (!p.startsWith('/')) p = '/' + p;
  const segs = []; let i = 1;
  while (i < p.length) {
    let name = ''; while (i < p.length && p[i] !== '/' && p[i] !== '[') name += p[i++];
    const keys = {};
    while (p[i] === '[') { let j = i + 1, k = '', v = '', inV = false; while (j < p.length && (p[j] !== ']' || p[j - 1] === '\\')) { if (!inV && p[j] === '=') { inV = true; j++; continue; } if (inV) v += p[j]; else k += p[j]; j++; } keys[k.trim()] = v.replace(/\\\]/g, ']'); i = j + 1; }
    if (name) { if (name.includes(':') && !segs.length) { /* modul on eki */ } segs.push({ name, keys: Object.keys(keys).length ? keys : null }); }
    if (p[i] === '/') i++;
  }
  return { origin, segs };
}
function simdGnmiPathStr(segs) { return segs.map(s => s.name + (s.keys ? Object.entries(s.keys).map(([k, v]) => `[${k}=${v}]`).join('') : '')).join('/'); }
function simdGnmiEngine(dev) {
  const ns = () => Date.now() * 1000000;
  const models = ['openconfig-interfaces', 'openconfig-if-ip', 'openconfig-if-ethernet', 'openconfig-system', 'openconfig-network-instance', 'openconfig-bgp', 'ietf-interfaces', 'Cisco-IOS-XE-native', 'lab-acl'].map(m => ({ name: m, organization: /^openconfig/.test(m) ? 'OpenConfig working group' : /^Cisco/.test(m) ? 'Cisco Systems, Inc.' : /^ietf/.test(m) ? 'IETF NETMOD (NETCONF Data Modeling Language) Working Group' : 'NetDevOps Lab', version: SIMD_MODULE_REV[m] }));
  const encOf = e => { e = String(e || 'json_ietf').toLowerCase(); if (e !== 'json' && e !== 'json_ietf') throw simdGnmiErr('Unimplemented', `unsupported encoding ${e.toUpperCase()}, use JSON or JSON_IETF`); return e; };
  function toVal(spec, value, enc) {
    if (spec.k === 'leaf') return simdJsonValue(spec.t, value, enc);
    if (spec.k === 'list') return simdToJson(spec, value, enc);
    return simdToJson(spec, value, enc);
  }
  function collect(paths, enc, datatype, offsetSec) {
    dev.counterOffset = offsetSec || 0;
    let data; try { data = simdProjectAll(dev, dev.model, true); } finally { dev.counterOffset = 0; }
    const out = [];
    for (const p of paths) {
      const { segs } = simdParseGnmiPath(p);
      let hits; try { hits = simdWalk(data, segs); } catch (e) { if (e && e.tag) throw simdGnmiErr('InvalidArgument', e.message + ': ' + p); throw e; }
      const ups = [];
      for (const h of hits) {
        if (h.value === undefined) continue;
        let v = h.value; const isEntry = h.spec.k === 'list';
        const spec = isEntry ? { k: 'container', c: h.spec.c, keys: h.spec.keys } : h.spec;
        if (datatype === 'config') v = simdStripState(spec, v); else if (datatype === 'state' || datatype === 'operational') v = simdOnlyState(spec, v, rootIsState(segs));
        if (v === undefined || (spec.k === 'container' && v && !Object.keys(v).length && spec.k !== 'leaf')) continue;
        ups.push({ path: simdGnmiPathStr(h.segs), val: toVal(spec, v, enc) });
      }
      out.push({ timestamp: ns() + (offsetSec || 0) * 1000000000, prefix: null, alias: null, atomic: false, update: ups });
    }
    return out;
  }
  const rootIsState = segs => segs.some(s => s.name === 'state');
  const api = {
    capabilities() { return { supported_models: models.map(m => ({ name: m.name, organization: m.organization, version: m.version })), supported_encodings: ['JSON', 'JSON_IETF'], gNMI_version: '0.7.0' }; },
    get(paths, encoding, datatype) {
      try {
        if (typeof paths === 'string') paths = paths.trim().startsWith('[') ? JSON.parse(paths) : [paths];
        if (paths && typeof paths.toJs === 'function') paths = paths.toJs();
        paths = Array.from(paths || []);
        if (!paths.length) throw simdGnmiErr('InvalidArgument', 'no path given');
        const enc = encOf(encoding);
        return { notification: collect(paths, enc, String(datatype || 'all').toLowerCase()) };
      } catch (e) { if (e && e.gnmi) return { error: e }; throw e; }
    },
    set(req, encoding) {
      try {
        if (typeof req === 'string') req = JSON.parse(req);
        if (req && typeof req.toJs === 'function') req = req.toJs({ dict_converter: Object.fromEntries });
        req = req || {};
        const enc = encOf(encoding);
        const data = simdProjectAll(dev, dev.model, false);
        const touched = []; const resp = [];
        const touch = segs => { const ch = simdChildSpec(SIMD_ROOT_SPEC, segs[0].name); if (ch && !touched.includes(ch.key)) touched.push(ch.key); };
        const norm = item => Array.isArray(item) ? { path: item[0], value: item[1] } : (typeof item === 'string' ? { path: item } : item);
        for (const d of req.delete || []) {
          const { segs } = simdParseGnmiPath(typeof d === 'string' ? d : d.path);
          const cur = simdResolve(data, segs); if (cur.error) throw simdGnmiErr('InvalidArgument', cur.error.message);
          if (cur.value !== undefined) { if (cur.isEntry) cur.parent.splice(cur.key, 1); else if (cur.isList) cur.parent[cur.key] = []; else delete cur.parent[cur.key]; }
          touch(segs); resp.push({ path: simdGnmiPathStr(segs), op: 'DELETE' });
        }
        for (const kind of ['replace', 'update']) {
          for (const raw of req[kind] || []) {
            const it = norm(raw); const { segs } = simdParseGnmiPath(it.path);
            if (!segs.length) throw simdGnmiErr('InvalidArgument', 'empty path');
            const cur = simdResolve(data, segs, { create: true }); if (cur.error) throw simdGnmiErr('InvalidArgument', cur.error.message);
            if (cur.spec.ro) throw simdGnmiErr('InvalidArgument', `path ${it.path} is read only`);
            let val = it.value; if (typeof val === 'string' && cur.spec.k !== 'leaf') { try { val = JSON.parse(val); } catch (e) { throw simdGnmiErr('InvalidArgument', `value for ${it.path} must be a JSON object`); } }
            if (cur.spec.k === 'leaf') { if (val && typeof val === 'object' && !Array.isArray(val)) { const ks = Object.keys(val); if (ks.length === 1 && simdLocal(ks[0]) === simdLocal(cur.key)) val = val[ks[0]]; } if (typeof val === 'string' && cur.spec.t !== 'string' && cur.spec.t !== 'identityref' && cur.spec.t !== 'enumeration' && cur.spec.t !== 'host' && cur.spec.t !== 'ipv4' && cur.spec.t !== 'mask') { try { val = JSON.parse(val); } catch (e) { /* metin kalsin */ } } }
            let parsedVal;
            try { parsedVal = simdFromJson(cur.isEntry ? { k: 'container', c: cur.spec.c } : cur.spec, val, '/' + simdGnmiPathStr(segs)); } catch (e) { if (e && e.tag) throw simdGnmiErr('InvalidArgument', e.message); throw e; }
            if (cur.isEntry) { cur.spec.keys.forEach((k, i) => { if (parsedVal[k] === undefined) parsedVal[k] = simdParseValue(simdSpec(cur.spec.c[k]).t, cur.keyVals[i]).value; }); if (kind === 'replace') cur.parent[cur.key] = parsedVal; else cur.parent[cur.key] = simdMerge({ k: 'container', c: cur.spec.c }, cur.value, parsedVal); }
            else if (kind === 'replace' || cur.spec.k === 'leaf') cur.parent[cur.key] = parsedVal;
            else cur.parent[cur.key] = simdMerge(cur.spec, cur.value, parsedVal);
            touch(segs); resp.push({ path: simdGnmiPathStr(segs), op: kind.toUpperCase() });
          }
        }
        if (!resp.length) throw simdGnmiErr('InvalidArgument', 'SetRequest has no update, replace or delete');
        const err = simdUnproject(dev, dev.model, data, touched);
        if (err) throw simdGnmiErr('InvalidArgument', err.message + (err.path ? ' at ' + err.path : ''));
        dev.log.push(`*${simdIosClock().slice(0, 12)}: %DMI-5-CONFIG_I: R0/0: dmiauthd: Configured from NETCONF/RESTCONF by admin, transaction-id ${dev.nc.txn++}`);
        return { timestamp: ns(), prefix: null, response: resp };
      } catch (e) { if (e && e.gnmi) return { error: e }; throw e; }
    },
    subscribe(paths, mode, sampleInterval, count, encoding) {
      try {
        if (typeof paths === 'string') paths = paths.trim().startsWith('[') ? JSON.parse(paths) : [paths];
        if (paths && typeof paths.toJs === 'function') paths = paths.toJs();
        paths = Array.from(paths || []);
        mode = String(mode || 'once').toLowerCase(); const enc = encOf(encoding);
        const intervalSec = Math.max(1, Number(sampleInterval || 10000000000) / 1000000000);
        count = Math.max(1, Number(count || 3));
        const notifs = [];
        const push = (nl, off) => { const ups = []; nl.forEach(n => ups.push(...n.update)); if (ups.length) notifs.push({ update: { timestamp: ns() + (off || 0) * 1000000000, prefix: null, update: ups } }); };
        push(collect(paths, enc, 'all', 0), 0);
        notifs.push({ sync_response: true });
        if (mode === 'once' || mode === 'poll') return notifs;
        if (mode === 'sample' || mode === 'stream') { for (let i = 1; i < count; i++) push(collect(paths, enc, 'all', i * intervalSec), i * intervalSec); return notifs; }
        if (mode === 'on_change' || mode === 'on-change' || mode === 'onchange') {
          /* sentetik degisiklik, GigabitEthernet2 link flap */
          const ifn = Object.keys(dev.model.interfaces).find(n => n === 'GigabitEthernet2') || Object.keys(dev.model.interfaces)[0];
          const i = dev.model.interfaces[ifn]; const wasLink = i.link;
          i.link = false; dev.lastChange = Date.now();
          const down = collect(paths, enc, 'all', 7); i.link = wasLink;
          const up = collect(paths, enc, 'all', 12);
          const diff = (a, b) => { const ups = []; b.forEach((n, k) => n.update.forEach(u => { const prev = (a[k] || { update: [] }).update.find(x => x.path === u.path); if (!prev || JSON.stringify(prev.val) !== JSON.stringify(u.val)) ups.push(u); })); return ups; };
          const base = collect(paths, enc, 'all', 0);
          const d1 = diff(base, down); if (d1.length) notifs.push({ update: { timestamp: ns() + 7000000000, prefix: null, update: d1 } });
          const d2 = diff(down, up); if (d2.length) notifs.push({ update: { timestamp: ns() + 12000000000, prefix: null, update: d2 } });
          return notifs.slice(0, Math.max(2, count + 1));
        }
        throw simdGnmiErr('InvalidArgument', `unknown subscription mode ${mode}`);
      } catch (e) { if (e && e.gnmi) return { error: e }; throw e; }
    },
  };
  return api;
}
function simdGnmiErr(code, message) { return { gnmi: true, code, message, details: `rpc error: code = ${code} desc = ${message}` }; }

/* ---------- cihaz nesnesi ---------- */
function simdMakeDevice(name, host, ip, initial, macSeed, serial) {
  const dev = {
    name, host, ip, platform: 'ios-xe', mgmt: { ssh: 22, netconf: 830, restconf: 443, gnmi: 57400 },
    model: initial(), candidate: null, nc: { sessions: {}, nextId: 22, locks: { running: null, candidate: null }, txn: 1001, candidateDirtyBy: null },
    t0: Date.now(), lastChange: Date.now() - 2 * 3600 * 1000, log: [], startup: null, macSeed, serial, counterOffset: 0,
  };
  dev.log.push(`*${simdIosClock(new Date(dev.t0 - 3 * 86400000)).slice(0, 12)}: %SYS-5-RESTART: System restarted --`, `*${simdIosClock(new Date(dev.t0 - 3 * 86400000 + 60000)).slice(0, 12)}: %LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet1, changed state to up`, `*${simdIosClock(new Date(dev.t0 - 3 * 86400000 + 90000)).slice(0, 12)}: %BGP-5-ADJCHANGE: neighbor ${initial().bgp.neighbors[0].ip} Up `);
  /* BGP komsusu karsi cihazda karsilikli tanimli ve interface'ler up ise session kurulu sayilir */
  dev.peerUp = nb => {
    const other = Object.values(LAB.devices).find(d => d !== dev && d.model && Object.values(d.model.interfaces).some(i => i.ip === nb.ip && simdOper(i)));
    if (!other) return false;
    const mineIps = Object.values(dev.model.interfaces).filter(i => simdOper(i)).map(i => i.ip);
    const back = other.model.bgp.neighbors.find(x => mineIps.includes(x.ip));
    return !!(back && !back.shutdown && back.remoteAs === dev.model.bgp.asn && nb.remoteAs === other.model.bgp.asn);
  };
  dev.cli = cmd => simdCli(dev, cmd);
  dev.configure = lines => { const r = simdConfigure(dev, lines); return { changed: r.changed, output: r.output, errors: r.errors }; };
  dev.running = () => simdRunning(dev);
  dev.state = () => {
    const m = dev.model; const s = { hostname: m.hostname, domain: m.domain, interfaces: {}, vlans: simdClone(m.vlans), users: m.users.map(u => ({ name: u.name, privilege: u.privilege })), bgp: { asn: m.bgp.asn, routerId: m.bgp.routerId, neighbors: m.bgp.neighbors.map(nb => ({ ip: nb.ip, remoteAs: nb.remoteAs, description: nb.description, shutdown: !!nb.shutdown, up: !nb.shutdown && dev.peerUp(nb) })), networks: simdClone(m.bgp.networks || []) }, ntp: m.ntp.map(n => n.ip), snmp: simdClone(m.snmp), logging: m.logging.slice(), banner: m.banner, netconfSessions: Object.keys(dev.nc.sessions).length, locks: simdClone(dev.nc.locks), candidatePending: !!dev.candidate, saved: dev.startup !== null && dev.startup === simdRunning(dev) };
    simdSortedIfs(m).forEach(n => { const i = m.interfaces[n]; s.interfaces[n] = { description: i.description, ip: i.ip, mask: i.mask, prefixLength: i.ip ? simdMaskToLen(i.mask) : null, enabled: !!i.enabled, vlan: i.vlan, oper: simdOper(i) ? 'up' : 'down' }; });
    return s;
  };
  dev.netconf = simdNetconfEngine(dev);
  dev.restconf = simdRestconfEngine(dev);
  dev.gnmi = simdGnmiEngine(dev);
  dev.reset = () => { dev.model = initial(); dev.candidate = null; dev.nc.sessions = {}; dev.nc.nextId = 22; dev.nc.locks.running = null; dev.nc.locks.candidate = null; dev.nc.txn = 1001; dev.startup = null; dev.lastChange = Date.now() - 2 * 3600 * 1000; dev.log = dev.log.slice(0, 3); };
  return dev;
}
LAB.devices.r1 = simdMakeDevice('r1', 'r1.lab', '10.0.0.1', simdInitialR1, 'ab', '9ABCDEF1234');
LAB.devices.r2 = simdMakeDevice('r2', 'r2.lab', '10.0.0.2', simdInitialR2, 'cd', '9ABCDEF5678');
function simdDeviceByHost(h) { h = String(h || '').toLowerCase(); return Object.values(LAB.devices).find(d => d.host === h || d.ip === h || d.name === h || (d.model && d.model.hostname.toLowerCase() === h) || h === d.name + '.lab.local') || null; }

/* RESTCONF'u curl icin LAB.http'ye bagla */
LAB.registerHttp(req => {
  const dev = simdDeviceByHost(req.host);
  if (!dev) return null;
  const qs = new URLSearchParams(req.query || {}).toString();
  const r = dev.restconf.request(req.method, req.path + (qs ? '?' + qs : ''), req.body, req.headers);
  return { status: r.status, headers: r.headers, body: r.body };
});

/* ---------- ssh ---------- */
const SIMD_OLD_SSH = COMMANDS.ssh;
function simdSsh(args, stdin) {
  const sh = this;
  let port = 22, user = null, target = null, subsystem = false; const cmd = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (target === null) {
      if (a === '-p') port = parseInt(args[++i], 10);
      else if (a.startsWith('-p') && a.length > 2) port = parseInt(a.slice(2), 10);
      else if (a === '-l') user = args[++i];
      else if (['-o', '-i', '-J', '-F', '-b', '-c', '-D', '-E', '-e', '-I', '-L', '-m', '-O', '-Q', '-R', '-S', '-W', '-w'].includes(a)) i++;
      else if (a === '-s') subsystem = true;
      else if (a.startsWith('-')) { /* -t -q -v -N -T vb. */ }
      else target = a;
    } else if (a === '-s') subsystem = true;
    else cmd.push(a);
  }
  if (!target) return fail('usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [-B bind_interface] [-b bind_address]\n           [-c cipher_spec] [-D [bind_address:]port] [-E log_file]\n           [-e escape_char] [-F configfile] [-I pkcs11] [-i identity_file]\n           [-J destination] [-L address] [-l login_name] [-m mac_spec]\n           [-O ctl_cmd] [-o option] [-P tag] [-p port] [-R address]\n           [-S ctl_path] [-W host:port] [-w local_tun[:remote_tun]]\n           destination [command [argument ...]]', 255);
  const at = target.lastIndexOf('@'); if (at >= 0) { user = target.slice(0, at); target = target.slice(at + 1); }
  const dev = simdDeviceByHost(target);
  if (!dev) return SIMD_OLD_SSH.call(sh, args, stdin);
  if (!user) user = USER;
  const acc = dev.model.users.find(u => u.name === user);
  if (port !== 22 && port !== 830) return fail(`ssh: connect to host ${target} port ${port}: Connection refused`, 255);
  if (!acc) return fail(`${user}@${target}: Permission denied (publickey,password).`, 255);
  if (port === 830 || (subsystem && cmd[0] === 'netconf')) {
    if (port !== 830) return fail(`Request for subsystem 'netconf' failed on channel 0\n`, 255);
    const caps = dev.netconf.capabilities();
    const ses = dev.netconf.openSession(user, acc.secret, '10.0.0.100');
    let out = `<?xml version="1.0" encoding="UTF-8"?>\n<hello xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">\n<capabilities>\n${caps.map(c => `<capability>${simdXmlEsc(c)}</capability>`).join('\n')}\n</capabilities>\n<session-id>${ses.sessionId}</session-id></hello>]]>]]>\n`;
    if (stdin && stdin.trim()) {
      const chunks = stdin.split(']]>]]>').map(s => s.trim()).filter(Boolean);
      for (const ch of chunks) {
        if (/<hello[\s>]/.test(ch)) continue;
        const reply = dev.netconf.rpc(ch, ses.sessionId);
        out += reply + (reply.endsWith('\n') ? '' : '\n') + ']]>]]>\n';
        if (/<close-session/.test(ch)) break;
      }
      dev.netconf.closeSession(ses.sessionId);
      return ok(out);
    }
    dev.netconf.closeSession(ses.sessionId);
    return { out, err: `\nNot. NETCONF subsystem'i acildi, sunucu hello mesajini gonderdi. Gercek cihazda bu noktada client da kendi hello'sunu ve rpc'lerini yazar, bu lab'da tek satirlik shell interaktif oturum tutamaz. Bir rpc gondermek icin stdin kullan, ornek\n  cat rpc.xml | ssh -p 830 admin@r1.lab -s netconf\nya da python3 ile ncclient kullan.\n`, code: 0 };
  }
  if (!cmd.length) {
    const banner = dev.model.banner ? dev.model.banner + '\n' : '';
    return ok(`${banner}\n${dev.model.hostname}#\n\nNot. Bu lab'in shell'i tek satirlik calisir, interaktif ssh oturumu acilamaz. Komutu argüman olarak ver, ornek\n  ssh ${user}@${target} "show ip interface brief"\n  ssh ${user}@${target} "show running-config | section bgp"\n`);
  }
  const line = cmd.join(' ');
  if (/^conf(igure)?(\s+t(erminal)?)?$/i.test(line)) return fail(`${dev.model.hostname}#${line}\nEnter configuration commands, one per line.  End with CNTL/Z.\n% Not. Interaktif config modu bu lab'da yok. Degisiklik icin netmiko send_config_set, ncclient edit-config, curl RESTCONF ya da gnmic set kullan\n`);
  const out = dev.cli(line);
  return ok(out.endsWith('\n') || !out ? out : out + '\n');
}

/* ---------- gnmic ---------- */
function simdGnmicParse(args) {
  const o = { address: null, username: null, password: null, insecure: false, skipVerify: false, encoding: 'json', format: 'json', cmd: null, paths: [], type: 'ALL', updatePath: [], updateValue: [], updateFile: [], replacePath: [], replaceValue: [], replaceFile: [], updates: [], replaces: [], deletes: [], mode: 'stream', streamMode: 'sample', sampleInterval: '10s', max: 3, updatesOnly: false, help: false, unknown: [] };
  const take = (i, name) => { const a = args[i]; const eq = a.indexOf('='); if (eq > 0 && a.startsWith('--')) return [a.slice(eq + 1), i]; return [args[i + 1], i + 1]; };
  for (let i = 0; i < args.length; i++) {
    let a = args[i]; const key = a.startsWith('--') && a.includes('=') ? a.slice(0, a.indexOf('=')) : a;
    let v;
    switch (key) {
      case '-a': case '--address': [v, i] = take(i); o.address = v; break;
      case '-u': case '--username': [v, i] = take(i); o.username = v; break;
      case '-p': case '--password': [v, i] = take(i); o.password = v; break;
      case '--insecure': o.insecure = true; break;
      case '--skip-verify': o.skipVerify = true; break;
      case '-e': case '--encoding': [v, i] = take(i); o.encoding = v; break;
      case '--format': [v, i] = take(i); o.format = v; break;
      case '--path': [v, i] = take(i); o.paths.push(v); break;
      case '-t': case '--type': [v, i] = take(i); o.type = v; break;
      case '--update-path': [v, i] = take(i); o.updatePath.push(v); break;
      case '--update-value': [v, i] = take(i); o.updateValue.push(v); break;
      case '--update-file': [v, i] = take(i); o.updateFile.push(v); break;
      case '--update': [v, i] = take(i); o.updates.push(v); break;
      case '--replace-path': [v, i] = take(i); o.replacePath.push(v); break;
      case '--replace-value': [v, i] = take(i); o.replaceValue.push(v); break;
      case '--replace-file': [v, i] = take(i); o.replaceFile.push(v); break;
      case '--replace': [v, i] = take(i); o.replaces.push(v); break;
      case '--delete': [v, i] = take(i); o.deletes.push(v); break;
      case '--mode': [v, i] = take(i); o.mode = v; break;
      case '--stream-mode': [v, i] = take(i); o.streamMode = v; break;
      case '-i': case '--sample-interval': [v, i] = take(i); o.sampleInterval = v; break;
      case '--max': case '-n': [v, i] = take(i); o.max = parseInt(v, 10) || 3; break;
      case '--updates-only': o.updatesOnly = true; break;
      case '-h': case '--help': o.help = true; break;
      case '--timeout': case '--log-file': case '--qos': case '--name': case '--heartbeat-interval': case '--target': case '--prefix': case '--tls-ca': case '--tls-cert': case '--tls-key': case '--config': case '--retry': [v, i] = take(i); break;
      case '-d': case '--debug': case '--log': case '--no-prefix': case '--gzip': case '--print-proto': case '--raw-input': break;
      default:
        if (a.startsWith('-')) o.unknown.push(a); else if (!o.cmd) o.cmd = a; else o.unknown.push(a);
    }
  }
  return o;
}
const SIMD_GNMIC_HELP = `gNMI CLI client that provides full support for Capabilities, Get, Set and Subscribe RPCs with collector capabilities.

Usage:
  gnmic [command]

Available Commands:
  capabilities query targets gnmi capabilities
  get          run gnmi get on targets
  set          run gnmi set on targets
  subscribe    subscribe to gnmi updates on targets
  version      show gnmic version

Flags:
  -a, --address strings     comma separated gnmi targets addresses
  -d, --debug               debug mode
  -e, --encoding string     one of [json, bytes, proto, ascii, json_ietf]. Case insensitive (default "json")
      --format string       output format, one of [json, protojson, prototext, event, flat]
  -h, --help                help for gnmic
      --insecure            insecure connection
  -p, --password string     password
      --skip-verify         skip verify tls connection
  -u, --username string     username

Use "gnmic [command] --help" for more information about a command.
`;
function simdGnmic(args, stdin) {
  const sh = this;
  const o = simdGnmicParse(args);
  const sub = { cap: 'capabilities', capabilities: 'capabilities', get: 'get', set: 'set', sub: 'subscribe', subscribe: 'subscribe', version: 'version', help: 'help' }[o.cmd || 'help'];
  if (o.help || !sub || sub === 'help') return ok(SIMD_GNMIC_HELP);
  if (sub === 'version') return ok('version : 0.38.2\n commit : lab\n   date : 2025-01-15T00:00:00Z\n gitURL : https://github.com/openconfig/gnmic\n   docs : https://gnmic.openconfig.net\n');
  if (o.unknown.length) return fail(`Error: unknown flag: ${o.unknown[0]}\n`);
  if (!o.address) return fail('Error: no target address specified, use --address or -a\n');
  const hp = /^(?:\[([^\]]+)\]|([^:]+))(?::(\d+))?$/.exec(o.address);
  const host = hp ? (hp[1] || hp[2]) : o.address; const port = hp && hp[3] ? parseInt(hp[3], 10) : 57400;
  const src = `${host}:${port}`;
  const dev = simdDeviceByHost(host);
  const gerr = (msg, what) => fail(`target "${src}" ${what || sub + ' request'} failed: ${msg}\nError: one or more requests failed\n`);
  if (!dev) return gerr(`rpc error: code = Unavailable desc = connection error: desc = "transport: Error while dialing: dial tcp: lookup ${host}: no such host"`);
  if (port !== 57400) return gerr(`rpc error: code = Unavailable desc = connection error: desc = "transport: Error while dialing: dial tcp ${dev.ip}:${port}: connect: connection refused"`);
  if (!o.insecure && !o.skipVerify) return gerr(`rpc error: code = Unavailable desc = connection error: desc = "transport: authentication handshake failed: tls: failed to verify certificate: x509: certificate signed by unknown authority"`);
  const acc = dev.model.users.find(u => u.name === o.username);
  if (!acc || acc.secret !== o.password) return gerr(`rpc error: code = Unauthenticated desc = ${!o.username ? 'missing username' : 'Invalid username or password'}`);
  const enc = (o.encoding || 'json').toLowerCase();
  if (enc !== 'json' && enc !== 'json_ietf') return gerr(`rpc error: code = Unimplemented desc = unsupported encoding ${enc.toUpperCase()}`);
  const iso = ts => new Date(Math.floor(ts / 1000000)).toISOString().replace('Z', '000000Z').replace(/\.(\d{3})000000Z/, '.$1000000Z');
  const strip = p => p.replace(/\[[^\]]*\]/g, '');
  const fmtNotif = n => ({ source: src, timestamp: n.timestamp, time: iso(n.timestamp), updates: n.update.map(u => ({ Path: u.path, values: { [strip(u.path)]: u.val } })) });
  const J = x => JSON.stringify(x, null, 2) + '\n';
  const flat = n => n.update.map(u => `${u.path}: ${typeof u.val === 'object' ? JSON.stringify(u.val) : u.val}`).join('\n') + '\n';
  if (sub === 'capabilities') {
    const c = dev.gnmi.capabilities();
    return ok(`gNMI version: ${c.gNMI_version}\nsupported models:\n${c.supported_models.map(m => `  - ${m.name}, ${m.organization}, ${m.version}`).join('\n')}\nsupported encodings:\n${c.supported_encodings.map(e => `  - ${e}`).join('\n')}\n`);
  }
  if (sub === 'get') {
    if (!o.paths.length) return fail('Error: no path specified, use --path\n');
    const r = dev.gnmi.get(o.paths, enc, o.type);
    if (r.error) return gerr(r.error.details);
    if (o.format === 'flat') return ok(r.notification.map(flat).join(''));
    return ok(J(r.notification.map(fmtNotif)));
  }
  if (sub === 'set') {
    const req = { update: [], replace: [], delete: o.deletes.slice() };
    const readFile = f => { const r = sh.readFile(f, 'gnmic'); if (r.err) throw new Error(`Error: failed reading file ${f}: open ${f}: no such file or directory`); return r.data; };
    try {
      o.updatePath.forEach((p, i) => { if (o.updateValue[i] !== undefined) req.update.push([p, o.updateValue[i]]); else if (o.updateFile[i - o.updateValue.length] !== undefined) req.update.push([p, readFile(o.updateFile[i - o.updateValue.length])]); else throw new Error('Error: missing --update-value or --update-file for --update-path ' + p); });
      o.replacePath.forEach((p, i) => { if (o.replaceValue[i] !== undefined) req.replace.push([p, o.replaceValue[i]]); else if (o.replaceFile[i - o.replaceValue.length] !== undefined) req.replace.push([p, readFile(o.replaceFile[i - o.replaceValue.length])]); else throw new Error('Error: missing --replace-value or --replace-file for --replace-path ' + p); });
      const typed = (parts, flag) => { if (parts.length !== 3) throw new Error(`Error: invalid --${flag} flag format, expected path:::type:::value, got "${parts.join(':::')}"`); let v = parts[2]; if (/^json/i.test(parts[1])) { try { v = JSON.parse(v); } catch (e) { /* duz metin */ } } return [parts[0], v]; };
      o.updates.forEach(u => req.update.push(typed(u.split(':::'), 'update')));
      o.replaces.forEach(u => req.replace.push(typed(u.split(':::'), 'replace')));
    } catch (e) { return fail(e.message + '\n'); }
    if (!req.update.length && !req.replace.length && !req.delete.length) return fail('Error: no update, replace or delete specified\n');
    const r = dev.gnmi.set(req, enc);
    if (r.error) return gerr(r.error.details);
    return ok(J({ source: src, timestamp: r.timestamp, time: iso(r.timestamp), results: r.response.map(x => ({ operation: x.op, path: x.path })) }));
  }
  if (sub === 'subscribe') {
    if (!o.paths.length) return fail('Error: no path specified, use --path\n');
    const mode = (o.mode || 'stream').toLowerCase();
    let m = mode === 'once' ? 'once' : mode === 'poll' ? 'poll' : (o.streamMode || 'sample').toLowerCase().replace('-', '_');
    if (m === 'target_defined') m = 'sample';
    const im = /^(\d+)(ms|s|m|h)?$/.exec(o.sampleInterval || '10s'); const mult = { ms: 1e6, s: 1e9, m: 6e10, h: 3.6e12 }[(im && im[2]) || 's']; const interval = im ? parseInt(im[1], 10) * mult : 1e10;
    const r = dev.gnmi.subscribe(o.paths, m, interval, o.max, enc);
    if (r.error) return gerr(r.error.details);
    const subName = `default-${Math.floor(Date.now() / 1000)}`;
    let out = '';
    for (const n of r) {
      if (n.sync_response) { if (!o.updatesOnly) out += J({ source: src, 'subscription-name': subName, timestamp: Date.now() * 1000000, time: iso(Date.now() * 1000000), 'sync-response': true }); continue; }
      if (o.format === 'flat') out += flat(n.update); else out += J(Object.assign({ source: src, 'subscription-name': subName }, fmtNotif(n.update)));
    }
    if (mode !== 'once') out += `\n${mode === 'poll' ? 'poll' : 'stream'} subscription ended after ${r.filter(x => x.update).length} notifications, bu lab'da subscribe --max ile sinirli calisir, gercek gnmic Ctrl+C'ye kadar dinler\n`;
    return ok(out);
  }
  return ok(SIMD_GNMIC_HELP);
}

/* ---------- lab komutu ---------- */
const SIMD_PREV_LAB = LAB_EXT.commands.lab || null;
function simdLab(args, stdin) {
  const sh = this;
  const sub = args[0] || '';
  if (sub === 'devices' || sub === 'device' || sub === 'dev') {
    const rows = [['NAME', 'HOST', 'IP', 'PLATFORM', 'HOSTNAME', 'SSH', 'NETCONF', 'RESTCONF', 'GNMI', 'STATE']];
    Object.values(LAB.devices).forEach(d => rows.push([d.name, d.host, d.ip, d.platform, d.model.hostname, String(d.mgmt.ssh), String(d.mgmt.netconf), String(d.mgmt.restconf), String(d.mgmt.gnmi), (d.candidate ? 'candidate pending' : 'running') + (d.nc.locks.running != null ? ', locked' : '')]));
    const w = rows[0].map((_, i) => Math.max(...rows.map(r => r[i].length)));
    const table = rows.map(r => r.map((c, i) => simdPad(c, w[i] + 2)).join('').trimEnd()).join('\n');
    return ok(`${table}\n\nKullanici admin, parola admin. SSH, NETCONF, RESTCONF ve gNMI hepsi ayni cihaz modelini okur, biriyle yapilan degisiklik digerinde gorunur.\nOrnekler\n  ssh admin@r1.lab "show ip interface brief"\n  curl -k -u admin:admin -H "Accept: application/yang-data+json" https://r1.lab/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet2\n  gnmic -a r1.lab:57400 -u admin -p admin --insecure get --path /interfaces/interface[name=GigabitEthernet2]/state/oper-status\n  ssh -p 830 admin@r1.lab -s netconf\n  ls ~/yang && pyang -f tree ~/yang/ietf-interfaces@2018-02-20.yang\n`);
  }
  if (sub === 'reset' && (args[1] === 'devices' || args[1] === 'device')) { Object.values(LAB.devices).forEach(d => d.reset()); return ok('r1 ve r2 baslangic konfigurasyonuna dondu\n'); }
  if (SIMD_PREV_LAB) return SIMD_PREV_LAB.call(sh, args, stdin);
  return ok('lab devices        cihazlari, adreslerini ve acik servisleri listeler\nlab reset devices  r1 ve r2 cihazlarini baslangic konfigurasyonuna dondurur\n');
}

/* ---------- pyang, YANG parser ---------- */
function simdYangParse(text, file) {
  let i = 0, line = 1; const n = text.length;
  const errors = [];
  const peek = () => text[i];
  const skipWs = () => {
    for (;;) {
      while (i < n && /\s/.test(text[i])) { if (text[i] === '\n') line++; i++; }
      if (text.startsWith('//', i)) { while (i < n && text[i] !== '\n') i++; continue; }
      if (text.startsWith('/*', i)) { const j = text.indexOf('*/', i + 2); const end = j < 0 ? n : j + 2; for (let k = i; k < end; k++) if (text[k] === '\n') line++; i = end; continue; }
      break;
    }
  };
  const readQuoted = (startLine, startCol) => {
    const q = text[i]; i++; let s = '';
    if (q === '"') {
      while (i < n && text[i] !== '"') { if (text[i] === '\\' && i + 1 < n) { const c = text[i + 1]; s += c === 'n' ? '\n' : c === 't' ? '\t' : c === '"' ? '"' : c === '\\' ? '\\' : '\\' + c; i += 2; continue; } if (text[i] === '\n') line++; s += text[i++]; }
      if (i >= n) { errors.push({ line: startLine, msg: 'unterminated string' }); return s; }
      i++;
      /* satir basi bosluklarini acilis tirnagina gore kirp */
      const lines = s.split('\n');
      if (lines.length > 1) { for (let k = 1; k < lines.length; k++) { let l = lines[k]; let cut = 0; while (cut < startCol + 1 && cut < l.length && (l[cut] === ' ' || l[cut] === '\t')) cut++; lines[k] = l.slice(cut).replace(/[ \t]+$/, ''); } lines[0] = lines[0].replace(/[ \t]+$/, ''); s = lines.join('\n'); }
      return s;
    }
    while (i < n && text[i] !== "'") { if (text[i] === '\n') line++; s += text[i++]; }
    if (i >= n) { errors.push({ line: startLine, msg: 'unterminated string' }); return s; }
    i++; return s;
  };
  const colOf = () => { const ls = text.lastIndexOf('\n', i - 1); return i - ls - 1; };
  const readArg = () => {
    if (peek() === '"' || peek() === "'") {
      let s = readQuoted(line, colOf()); let save;
      for (;;) { save = [i, line]; skipWs(); if (peek() === '+') { i++; skipWs(); if (peek() === '"' || peek() === "'") { s += readQuoted(line, colOf()); continue; } errors.push({ line, msg: 'expected string after +' }); } i = save[0]; line = save[1]; break; }
      return s;
    }
    let s = '';
    while (i < n && !/[\s;{}]/.test(text[i]) && !text.startsWith('//', i) && !text.startsWith('/*', i)) s += text[i++];
    return s;
  };
  const parseBlock = (parent) => {
    const out = [];
    for (;;) {
      skipWs();
      if (i >= n) { if (parent) errors.push({ line, msg: 'unexpected end of file, expected "}"' }); return out; }
      if (peek() === '}') { if (!parent) { errors.push({ line, msg: 'unexpected "}"' }); i++; continue; } i++; return out; }
      const stLine = line;
      let kw = '';
      while (i < n && /[A-Za-z0-9_.:-]/.test(text[i])) kw += text[i++];
      if (!kw) { errors.push({ line, msg: `syntax error: illegal keyword: ${text[i]}` }); i++; continue; }
      skipWs();
      let arg = null;
      if (peek() !== ';' && peek() !== '{' && peek() !== '}' && i < n) arg = readArg();
      skipWs();
      const st = { kw, arg, subs: [], line: stLine, file };
      if (peek() === ';') { i++; }
      else if (peek() === '{') { i++; st.subs = parseBlock(st); }
      else { errors.push({ line, msg: `syntax error: expected ";" or "{"` }); if (i < n) i++; }
      out.push(st);
    }
  };
  const top = parseBlock(null);
  return { stmts: top, errors };
}

const SIMD_YANG_KW = new Set(['action', 'anydata', 'anyxml', 'argument', 'augment', 'base', 'belongs-to', 'bit', 'case', 'choice', 'config', 'contact', 'container', 'default', 'description', 'deviate', 'deviation', 'enum', 'error-app-tag', 'error-message', 'extension', 'feature', 'fraction-digits', 'grouping', 'identity', 'if-feature', 'import', 'include', 'input', 'key', 'leaf', 'leaf-list', 'length', 'list', 'mandatory', 'max-elements', 'min-elements', 'modifier', 'module', 'must', 'namespace', 'notification', 'ordered-by', 'organization', 'output', 'path', 'pattern', 'position', 'prefix', 'presence', 'range', 'reference', 'refine', 'require-instance', 'revision', 'revision-date', 'rpc', 'status', 'submodule', 'type', 'typedef', 'unique', 'units', 'uses', 'value', 'when', 'yang-version', 'yin-element']);
const SIMD_YANG_DATA = ['container', 'list', 'leaf', 'leaf-list', 'choice', 'anydata', 'anyxml', 'uses'];
const SIMD_YANG_BODY = ['extension', 'feature', 'identity', 'typedef', 'grouping', 'augment', 'rpc', 'notification', 'deviation', 'container', 'list', 'leaf', 'leaf-list', 'choice', 'anydata', 'anyxml', 'uses'];
const SIMD_YANG_META = ['description', 'reference', 'status'];
const SIMD_YANG_GRAMMAR = {
  module: ['yang-version', 'namespace', 'prefix', 'import', 'include', 'organization', 'contact', 'description', 'reference', 'revision'].concat(SIMD_YANG_BODY),
  submodule: ['yang-version', 'belongs-to', 'import', 'include', 'organization', 'contact', 'description', 'reference', 'revision'].concat(SIMD_YANG_BODY),
  import: ['prefix', 'revision-date', 'description', 'reference'], include: ['revision-date', 'description', 'reference'], 'belongs-to': ['prefix'],
  revision: ['description', 'reference'], extension: ['argument', 'description', 'reference', 'status'], argument: ['yin-element'],
  feature: ['if-feature', 'status', 'description', 'reference'], identity: ['if-feature', 'base', 'status', 'description', 'reference'],
  typedef: ['type', 'units', 'default', 'status', 'description', 'reference'],
  type: ['fraction-digits', 'range', 'length', 'pattern', 'enum', 'bit', 'path', 'require-instance', 'base', 'type'],
  range: ['error-message', 'error-app-tag', 'description', 'reference'], length: ['error-message', 'error-app-tag', 'description', 'reference'], pattern: ['modifier', 'error-message', 'error-app-tag', 'description', 'reference'],
  enum: ['if-feature', 'value', 'status', 'description', 'reference'], bit: ['if-feature', 'position', 'status', 'description', 'reference'],
  grouping: ['status', 'description', 'reference', 'typedef', 'grouping', 'action', 'notification'].concat(SIMD_YANG_DATA),
  container: ['when', 'if-feature', 'must', 'presence', 'config', 'status', 'description', 'reference', 'typedef', 'grouping', 'action', 'notification'].concat(SIMD_YANG_DATA),
  leaf: ['when', 'if-feature', 'type', 'units', 'must', 'default', 'config', 'mandatory', 'status', 'description', 'reference'],
  'leaf-list': ['when', 'if-feature', 'type', 'units', 'must', 'default', 'config', 'min-elements', 'max-elements', 'ordered-by', 'status', 'description', 'reference'],
  list: ['when', 'if-feature', 'must', 'key', 'unique', 'config', 'min-elements', 'max-elements', 'ordered-by', 'status', 'description', 'reference', 'typedef', 'grouping', 'action', 'notification'].concat(SIMD_YANG_DATA),
  choice: ['when', 'if-feature', 'default', 'config', 'mandatory', 'status', 'description', 'reference', 'case', 'container', 'list', 'leaf', 'leaf-list', 'choice', 'anydata', 'anyxml'],
  case: ['when', 'if-feature', 'status', 'description', 'reference'].concat(SIMD_YANG_DATA),
  anydata: ['when', 'if-feature', 'must', 'config', 'mandatory', 'status', 'description', 'reference'], anyxml: ['when', 'if-feature', 'must', 'config', 'mandatory', 'status', 'description', 'reference'],
  uses: ['when', 'if-feature', 'status', 'description', 'reference', 'refine', 'augment'],
  refine: ['if-feature', 'must', 'presence', 'default', 'config', 'mandatory', 'min-elements', 'max-elements', 'description', 'reference'],
  augment: ['when', 'if-feature', 'status', 'description', 'reference', 'case', 'action', 'notification'].concat(SIMD_YANG_DATA),
  rpc: ['if-feature', 'status', 'description', 'reference', 'typedef', 'grouping', 'input', 'output'], action: ['if-feature', 'status', 'description', 'reference', 'typedef', 'grouping', 'input', 'output'],
  input: ['must', 'typedef', 'grouping'].concat(SIMD_YANG_DATA), output: ['must', 'typedef', 'grouping'].concat(SIMD_YANG_DATA),
  notification: ['if-feature', 'must', 'status', 'description', 'reference', 'typedef', 'grouping'].concat(SIMD_YANG_DATA),
  must: ['error-message', 'error-app-tag', 'description', 'reference'], deviation: ['description', 'reference', 'deviate'], deviate: ['type', 'units', 'must', 'unique', 'default', 'config', 'mandatory', 'min-elements', 'max-elements'],
};
const SIMD_YANG_BUILTIN = new Set(['binary', 'bits', 'boolean', 'decimal64', 'empty', 'enumeration', 'identityref', 'instance-identifier', 'int8', 'int16', 'int32', 'int64', 'leafref', 'string', 'uint8', 'uint16', 'uint32', 'uint64', 'union']);
const SIMD_YANG_BOOL_KW = new Set(['config', 'mandatory', 'require-instance', 'yin-element']);

/* modul yukleyici, arama yolu sanal FS */
function simdYangLoader(sh, dirs) {
  const cache = {};
  const findFile = name => {
    for (const d of dirs) {
      const node = sh.node(d); if (!node || node.t !== 'd') continue;
      const names = Object.keys(node.c).filter(f => f === name + '.yang' || (f.startsWith(name + '@') && f.endsWith('.yang'))).sort().reverse();
      if (names.length) return (d === '/' ? '' : d) + '/' + names[0];
    }
    return null;
  };
  const loadPath = (abs, display) => {
    if (cache[abs]) return cache[abs];
    const r = sh.readFile(abs, 'pyang'); if (r.err) return null;
    const parsed = simdYangParse(r.data, display || abs);
    const top = parsed.stmts.find(s => s.kw === 'module' || s.kw === 'submodule') || null;
    const mod = { file: display || abs, abs, stmt: top, parseErrors: parsed.errors, name: top ? top.arg : null };
    if (top) { mod.prefix = (top.subs.find(s => s.kw === 'prefix') || {}).arg || null; mod.ns = (top.subs.find(s => s.kw === 'namespace') || {}).arg || null; mod.imports = {}; top.subs.filter(s => s.kw === 'import').forEach(im => { const p = im.subs.find(s => s.kw === 'prefix'); if (p) mod.imports[p.arg] = im.arg; }); }
    cache[abs] = mod; if (mod.name) cache['name:' + mod.name] = mod;
    return mod;
  };
  const loadName = name => { if (cache['name:' + name]) return cache['name:' + name]; const f = findFile(name); if (!f) return null; return loadPath(f, f.replace(/^.*\//, '')); };
  return { loadPath, loadName, cache };
}

/* ---------- dogrulama ---------- */
function simdYangValidate(mod, loader, errs, lint) {
  const file = mod.file; const top = mod.stmt;
  const err = (line, msg) => errs.push({ file, line, level: 'error', msg });
  const warn = (line, msg) => errs.push({ file, line, level: 'warning', msg });
  mod.parseErrors.forEach(e => err(e.line, e.msg));
  if (!top) { if (!mod.parseErrors.length) err(1, 'unexpected keyword "' + ((mod.stmt || {}).kw || 'eof') + '", expected "module" or "submodule"'); return; }
  const base = file.replace(/^.*\//, '').replace(/\.yang$/, '').replace(/@.*$/, '');
  if (top.arg !== base) warn(top.line, `unexpected modulename "${top.arg}" in ${file.replace(/^.*\//, '')}, should be "${base}"`);
  const reportedPrefix = new Set();
  const prefixes = new Set([mod.prefix].filter(Boolean).concat(Object.keys(mod.imports || {})));
  /* baslik */
  if (top.kw === 'module') {
    for (const need of ['namespace', 'prefix']) {
      if (!top.subs.some(s => s.kw === need)) {
        const hdr = ['yang-version', 'namespace', 'prefix'];
        const first = top.subs.find(s => !hdr.includes(s.kw));
        if (first) err(first.line, `unexpected keyword "${first.kw}", expected "${need}"`); else err(top.line, `expected keyword "${need}" as child to "module"`);
      }
    }
  }
  /* import cozumleme */
  top.subs.filter(s => s.kw === 'import' || s.kw === 'include').forEach(im => { if (!loader.loadName(im.arg)) err(im.line, `module "${im.arg}" not found in search path`); });
  const typedefs = [];
  const collectTypedefs = (st, scope) => { st.subs.filter(s => s.kw === 'typedef').forEach(t => scope.push(t.arg)); };
  collectTypedefs(top, typedefs);
  const groupings = new Set(); const walkG = st => { st.subs.forEach(s => { if (s.kw === 'grouping') groupings.add(s.arg); if (s.subs.length) walkG(s); }); }; walkG(top);
  const walk = (st, parentKw, scopeTypes) => {
    const allowed = SIMD_YANG_GRAMMAR[parentKw];
    const localTypes = scopeTypes.slice(); collectTypedefs(st, localTypes);
    for (const s of st.subs) {
      if (s.kw.includes(':')) {
        const pfx = s.kw.split(':')[0];
        if (!prefixes.has(pfx)) { if (!reportedPrefix.has(pfx)) { err(s.line, `prefix "${pfx}" is not defined (reported only once)`); reportedPrefix.add(pfx); } continue; }
        const target = pfx === mod.prefix ? mod : loader.loadName(mod.imports[pfx]);
        if (target && target.stmt && !target.stmt.subs.some(x => x.kw === 'extension' && x.arg === s.kw.split(':')[1])) err(s.line, `extension "${s.kw.split(':')[1]}" is not defined in module ${target.name}`);
        continue;
      }
      if (!SIMD_YANG_KW.has(s.kw) || (allowed && !allowed.includes(s.kw))) { err(s.line, `unexpected keyword "${s.kw}"`); continue; }
      if (SIMD_YANG_BOOL_KW.has(s.kw) && s.arg !== 'true' && s.arg !== 'false') err(s.line, `bad value "${s.arg}" (should be boolean)`);
      if (s.kw === 'status' && !['current', 'deprecated', 'obsolete'].includes(s.arg)) err(s.line, `bad value "${s.arg}" (should be current, deprecated or obsolete)`);
      if ((s.kw === 'leaf' || s.kw === 'leaf-list' || s.kw === 'typedef') && !s.subs.some(x => x.kw === 'type')) err(s.line, `expected keyword "type" as child to "${s.kw}"`);
      if (s.kw === 'type') {
        const t = s.arg || '';
        if (t.includes(':')) { const pfx = t.split(':')[0]; if (!prefixes.has(pfx)) { if (!reportedPrefix.has(pfx)) { err(s.line, `prefix "${pfx}" is not defined (reported only once)`); reportedPrefix.add(pfx); } } else if (pfx !== mod.prefix) { const tm = loader.loadName(mod.imports[pfx]); if (tm && tm.stmt && !tm.stmt.subs.some(x => x.kw === 'typedef' && x.arg === t.split(':')[1])) err(s.line, `type "${t}" not found in module "${tm.name}"`); } else if (!localTypes.includes(t.split(':')[1])) err(s.line, `type "${t}" not found in module "${mod.name}"`); }
        else if (!SIMD_YANG_BUILTIN.has(t) && !localTypes.includes(t)) err(s.line, `type "${t}" not found in module "${mod.name}"`);
        if (t === 'leafref' && !s.subs.some(x => x.kw === 'path')) err(s.line, 'expected keyword "path" as child to "type"');
      }
      if (s.kw === 'uses') { const g = s.arg || ''; const local = g.includes(':') ? (g.split(':')[0] === mod.prefix ? g.split(':')[1] : null) : g; if (local !== null && !groupings.has(local)) err(s.line, `grouping "${g}" not found in module "${mod.name}"`); if (local === null && g.includes(':')) { const pfx = g.split(':')[0]; if (!prefixes.has(pfx)) { if (!reportedPrefix.has(pfx)) { err(s.line, `prefix "${pfx}" is not defined (reported only once)`); reportedPrefix.add(pfx); } } else { const tm = loader.loadName(mod.imports[pfx]); if (tm && tm.stmt) { const gs = new Set(); const w2 = st2 => st2.subs.forEach(x => { if (x.kw === 'grouping') gs.add(x.arg); if (x.subs.length) w2(x); }); w2(tm.stmt); if (!gs.has(g.split(':')[1])) err(s.line, `grouping "${g}" not found in module "${tm.name}"`); } } } }
      if (s.kw === 'list') {
        const key = s.subs.find(x => x.kw === 'key');
        const cfg = s.subs.find(x => x.kw === 'config');
        if (key) { key.arg.split(/\s+/).filter(Boolean).forEach(k => { if (!s.subs.some(x => x.kw === 'leaf' && x.arg === k) && !s.subs.some(x => x.kw === 'uses')) err(key.line, `the key "${k}" does not reference an existing leaf`); }); }
        else if (!(cfg && cfg.arg === 'false') && !st.subs.some(x => x.kw === 'config' && x.arg === 'false') && parentKw !== 'notification' && parentKw !== 'input' && parentKw !== 'output' && parentKw !== 'grouping') { /* grouping icinde anahtar yoksa sessiz */ if (parentKw !== 'grouping') err(s.line, 'the list needs at least one key'); }
      }
      if (s.subs.length) walk(s, s.kw, localTypes);
    }
  };
  walk(top, top.kw, typedefs);
  if (lint) simdYangLint(mod, errs);
}
function simdYangLint(mod, errs) {
  const file = mod.file; const top = mod.stmt;
  const err = (line, msg) => errs.push({ file, line, level: 'error', msg });
  const warn = (line, msg) => errs.push({ file, line, level: 'warning', msg });
  if (!top.arg.includes('-')) warn(top.line, 'RFC 8407: 4.1: no module name prefix string used');
  const req = { module: [['contact', '4.8'], ['organization', '4.8'], ['description', '4.8'], ['revision', '4.8']], revision: [['description', '4.8'], ['reference', '4.8']], extension: [['description', '4.14']], feature: [['description', '4.14']], identity: [['description', '4.14']], typedef: [['description', '4.13,4.14']], grouping: [['description', '4.14']], augment: [['description', '4.14']], rpc: [['description', '4.14']], action: [['description', '4.14']], notification: [['description', '4.14']], container: [['description', '4.14']], leaf: [['description', '4.14']], 'leaf-list': [['description', '4.14']], list: [['description', '4.14']], choice: [['description', '4.14']], anyxml: [['description', '4.14']], anydata: [['description', '4.14']] };
  const rec = { enum: [['description', '4.11.3,4.14']], bit: [['description', '4.11.3,4.14']] };
  const walk = st => {
    (req[st.kw] || []).forEach(([sub, sec]) => { if (!st.subs.some(x => x.kw === sub)) err(st.line, `RFC 8407: ${sec}: statement "${st.kw}" must have a "${sub}" substatement`); });
    (rec[st.kw] || []).forEach(([sub, sec]) => { if (!st.subs.some(x => x.kw === sub)) warn(st.line, `RFC 8407: ${sec}: statement "${st.kw}" should have a "${sub}" substatement`); });
    st.subs.forEach(walk);
  };
  walk(top);
  const mandatoryIn = st => st.subs.some(x => (x.kw === 'mandatory' && x.arg === 'true') || (x.kw === 'min-elements' && Number(x.arg) > 0)) || st.subs.some(x => ['container', 'leaf', 'leaf-list', 'choice'].includes(x.kw) && !(x.kw === 'container' && x.subs.some(y => y.kw === 'presence')) && (x.kw === 'container' || x.kw === 'choice' ? mandatoryIn(x) : x.subs.some(y => (y.kw === 'mandatory' && y.arg === 'true') || (y.kw === 'min-elements' && Number(y.arg) > 0))));
  top.subs.filter(s => ['container', 'list', 'leaf', 'leaf-list', 'choice'].includes(s.kw)).forEach(s => { if (!(s.kw === 'container' && s.subs.some(y => y.kw === 'presence')) && mandatoryIn(s)) err(s.line, `RFC 8407: 4.10: top-level node ${s.arg} must not be mandatory`); });
  const r = mod.text || ''; r.split('\n').forEach((l, i) => { if (l.length > 70) warn(i + 1, `line length ${l.length} exceeds 70 characters`); });
}

/* ---------- sema agaci kurma ---------- */
function simdYangBuild(mod, loader, errs, printedNames) {
  const err = (line, msg, file) => errs.push({ file: file || mod.file, line, level: 'error', msg });
  const groupingScope = []; /* [{name->stmt}] */
  const collectGroupings = st => { const m = {}; st.subs.filter(s => s.kw === 'grouping').forEach(g => { m[g.arg] = g; }); return m; };
  const findGrouping = (name, ctxMod) => {
    if (name.includes(':')) { const pfx = name.split(':')[0]; const local = name.split(':')[1]; if (pfx === ctxMod.prefix) name = local; else { const tm = loader.loadName(ctxMod.imports[pfx]); if (!tm || !tm.stmt) return null; const all = {}; const w = st => st.subs.forEach(s => { if (s.kw === 'grouping') all[s.arg] = s; if (s.subs.length) w(s); }); w(tm.stmt); return all[local] ? { stmt: all[local], mod: tm } : null; } }
    for (let i = groupingScope.length - 1; i >= 0; i--) if (groupingScope[i][name]) return { stmt: groupingScope[i][name], mod: ctxMod };
    return null;
  };
  const mk = (st, ctxMod, config, parent) => ({ kw: st.kw, name: st.arg, mod: ctxMod, config, status: (st.subs.find(s => s.kw === 'status') || {}).arg || 'current', children: [], st, line: st.line, parent });
  const buildChildren = (st, ctxMod, config, parent, isChoice) => {
    const out = [];
    groupingScope.push(collectGroupings(st));
    for (const s of st.subs) {
      if (s.kw === 'uses') {
        const g = findGrouping(s.arg, ctxMod);
        if (!g) continue;
        const kids = buildChildren(g.stmt, g.mod === ctxMod ? ctxMod : Object.assign({}, g.mod, { prefix: ctxMod.prefix, name: ctxMod.name, _usesOf: ctxMod }), config, parent, false);
        kids.forEach(k => { k.mod = ctxMod; });
        /* refine ve uses icindeki augment */
        for (const r of s.subs) {
          if (r.kw === 'refine') { const t = simdYangFindRel(kids, r.arg); if (t) r.subs.forEach(x => { if (x.kw === 'mandatory') t.mandatory = x.arg === 'true'; if (x.kw === 'config') simdYangSetConfig(t, x.arg === 'true'); if (x.kw === 'presence') t.presence = true; if (x.kw === 'description') t.desc = x.arg; }); }
          if (r.kw === 'augment') { const t = simdYangFindRel(kids, r.arg); if (t) { const ac = buildChildren(r, ctxMod, t.config, t, t.kw === 'choice'); ac.forEach(c => { c.augmentFeatures = r.subs.filter(x => x.kw === 'if-feature').map(x => x.arg); }); t.children.push(...ac); } }
        }
        out.push(...kids); continue;
      }
      if (!['container', 'list', 'leaf', 'leaf-list', 'choice', 'case', 'anydata', 'anyxml'].includes(s.kw)) continue;
      let cfg = config; const c = s.subs.find(x => x.kw === 'config'); if (c) cfg = c.arg === 'true' && config !== false ? true : (c.arg === 'false' ? false : cfg);
      const node = mk(s, ctxMod, cfg, parent);
      node.features = s.subs.filter(x => x.kw === 'if-feature').map(x => x.arg);
      if (s.kw === 'leaf' || s.kw === 'leaf-list') { const t = s.subs.find(x => x.kw === 'type'); node.type = t ? t.arg : ''; if (t && t.arg === 'leafref') { const p = t.subs.find(x => x.kw === 'path'); node.leafrefPath = p ? p.arg : null; } const m = s.subs.find(x => x.kw === 'mandatory'); node.mandatory = !!(m && m.arg === 'true'); }
      if (s.kw === 'anydata' || s.kw === 'anyxml') { const m = s.subs.find(x => x.kw === 'mandatory'); node.mandatory = !!(m && m.arg === 'true'); node.type = `<${s.kw}>`; }
      if (s.kw === 'container') node.presence = s.subs.some(x => x.kw === 'presence');
      if (s.kw === 'list') { const k = s.subs.find(x => x.kw === 'key'); node.keys = k ? k.arg.trim().split(/\s+/) : null; }
      if (s.kw === 'choice') { const m = s.subs.find(x => x.kw === 'mandatory'); node.mandatory = !!(m && m.arg === 'true'); }
      if (isChoice && s.kw !== 'case' && s.kw !== 'choice') {
        /* kisa yol case */
        const cs = { kw: 'case', name: s.arg, mod: ctxMod, config: cfg, status: node.status, children: [node], st: s, line: s.line, parent, implicit: true };
        node.parent = cs;
        if (['container', 'list'].includes(s.kw) || s.kw === 'choice') node.children = buildChildren(s, ctxMod, cfg, node, s.kw === 'choice');
        if (node.keys) node.children.forEach(ch => { if (node.keys.includes(ch.name)) ch.isKey = true; });
        out.push(cs); continue;
      }
      if (['container', 'list', 'case', 'choice'].includes(s.kw)) node.children = buildChildren(s, ctxMod, cfg, node, s.kw === 'choice');
      if (node.keys) node.children.forEach(ch => { if (node.keys.includes(ch.name)) ch.isKey = true; });
      out.push(node);
    }
    groupingScope.pop();
    return out;
  };
  const top = mod.stmt;
  groupingScope.push(collectGroupings(top));
  const tree = { mod, data: buildChildren(top, mod, true, null, false), rpcs: [], notifs: [], augments: [] };
  mod._tree = tree;
  for (const s of top.subs) {
    if (s.kw === 'rpc') {
      const node = mk(s, mod, true, null); node.features = s.subs.filter(x => x.kw === 'if-feature').map(x => x.arg);
      const inp = s.subs.find(x => x.kw === 'input'); const outp = s.subs.find(x => x.kw === 'output');
      const ni = { kw: 'input', name: 'input', mod, config: true, status: 'current', children: inp ? buildChildren(inp, mod, true, null, false) : [], line: s.line };
      const no = { kw: 'output', name: 'output', mod, config: false, status: 'current', children: outp ? buildChildren(outp, mod, false, null, false) : [], line: s.line };
      node.children = [ni, no]; tree.rpcs.push(node);
    }
    if (s.kw === 'notification') { const node = mk(s, mod, false, null); node.children = buildChildren(s, mod, false, node, false); tree.notifs.push(node); }
  }
  groupingScope.pop();
  /* augment'ler */
  for (const a of top.subs.filter(s => s.kw === 'augment')) {
    const path = (a.arg || '').trim();
    const segs = path.split('/').filter(Boolean).map(p => ({ pfx: p.includes(':') ? p.split(':')[0] : null, name: p.includes(':') ? p.split(':')[1] : p }));
    if (!segs.length) continue;
    const pfx = segs[0].pfx; const targetModName = pfx && pfx !== mod.prefix ? mod.imports[pfx] : mod.name;
    const tm = targetModName === mod.name ? mod : loader.loadName(targetModName);
    if (!tm || !tm.stmt) continue;
    const ttree = tm === mod ? tree : (tm._tree || (tm._tree = simdYangBuild(tm, loader, [], printedNames)));
    let nodes = ttree.data; let target = null;
    for (const sg of segs) {
      target = nodes.find(n => n.name === sg.name) || null;
      if (!target) { nodes.filter(n => n.kw === 'choice').forEach(ch => { if (target) return; ch.children.forEach(cs => { const h = cs.children.find(n => n.name === sg.name); if (h && !target) target = h; }); }); }
      if (!target) break;
      nodes = target.children;
    }
    if (!target) { err(a.line, `node ${targetModName}::${segs[segs.length - 1].name} is not found`); continue; }
    groupingScope.push(collectGroupings(top));
    const kids = buildChildren(a, mod, target.config, target, target.kw === 'choice');
    groupingScope.pop();
    const af = a.subs.filter(x => x.kw === 'if-feature').map(x => x.arg);
    kids.forEach(k => { k.augmentFeatures = af; k.mod = mod; });
    if (tm === mod || printedNames.includes(tm.name)) { target.children.push(...kids); if (tm !== mod) { const mark = n => { n.foreign = true; n.mod = mod; (n.children || []).forEach(mark); }; kids.forEach(mark); } }
    else tree.augments.push({ path, children: kids, targetKw: target.kw, targetConfig: target.config });
  }
  return tree;
}
function simdYangFindRel(kids, path) {
  const segs = path.split('/').filter(Boolean).map(p => p.includes(':') ? p.split(':')[1] : p);
  let nodes = kids; let t = null;
  for (const s of segs) { t = nodes.find(n => n.name === s) || null; if (!t) { for (const ch of nodes.filter(n => n.kw === 'choice')) { for (const cs of ch.children) { const h = cs.children.find(n => n.name === s); if (h) { t = h; break; } } if (t) break; } } if (!t) return null; nodes = t.children; }
  return t;
}
function simdYangSetConfig(node, cfg) { node.config = cfg; node.children.forEach(c => simdYangSetConfig(c, cfg)); }

/* ---------- tree cikti, pyang plugins/tree.py algoritmasi ---------- */
function simdYangTree(tree, opts) {
  const mod = tree.mod; const depth0 = opts.depth == null ? null : opts.depth;
  const out = [];
  const width = chs => { let w = 0; for (const ch of chs) { let nlen; if (ch.kw === 'choice' || ch.kw === 'case') nlen = 3 + width(ch.children); else nlen = (ch.foreign ? ch.mod.prefix.length + 1 : 0) + ch.name.length; if (nlen > w) w = nlen; } return w; };
  const typename = s => { if (s.kw === 'leaf' || s.kw === 'leaf-list') { if (s.type === 'leafref' && s.leafrefPath) { const target = []; let cur = s.mod.prefix; for (const name of s.leafrefPath.split('/')) { let p, n; if (!name.includes(':')) { p = cur; n = name; } else { [p, n] = [name.slice(0, name.indexOf(':')), name.slice(name.indexOf(':') + 1)]; } if (p === cur) target.push(n); else { target.push(p + ':' + n); cur = p; } } return '-> ' + target.join('/'); } return s.type || ''; } if (s.kw === 'anydata') return '<anydata>'; if (s.kw === 'anyxml') return '<anyxml>'; return ''; };
  const flags = (s, mode) => { if (mode === 'input') return '-w'; if (s.kw === 'rpc' || s.kw === 'action') return '-x'; if (s.kw === 'notification') return '-n'; if (s.config === true) return 'rw'; if (s.config === false || mode === 'output' || mode === 'notification') return 'ro'; return '--'; };
  const status = s => s.status === 'deprecated' ? 'x' : s.status === 'obsolete' ? 'o' : '+';
  const printChildren = (chs, prefix, mode, depth, w) => {
    if (depth === 0) { if (chs.length) out.push(prefix + '     ...'); return; }
    if (!w) w = width(chs);
    chs.forEach((ch, idx) => {
      if ((ch.kw === 'input' || ch.kw === 'output') && !ch.children.length) return;
      const last = chs[chs.length - 1];
      const np = (ch === last || (last.kw === 'output' && !last.children.length)) ? prefix + '   ' : prefix + '  |';
      let m = mode; if (ch.kw === 'input') m = 'input'; else if (ch.kw === 'output') m = 'output';
      printNode(ch, np, m, depth, w);
    });
  };
  const printNode = (s, prefix, mode, depth, w) => {
    let line = `${prefix.slice(0, -1)}${status(s)}--`;
    let name = s.foreign ? s.mod.prefix + ':' + s.name : s.name;
    const fl = flags(s, mode);
    if (s.kw === 'list') { name += '*'; line += fl + ' ' + name; }
    else if (s.kw === 'container') { if (s.presence) name += '!'; line += fl + ' ' + name; }
    else if (s.kw === 'choice') line += fl + ' (' + name + ')' + (s.mandatory ? '' : '?');
    else if (s.kw === 'case') line += ':(' + name + ')';
    else if (s.kw === 'input' || s.kw === 'output' || s.kw === 'rpc' || s.kw === 'action' || s.kw === 'notification') line += fl + ' ' + name;
    else {
      if (s.kw === 'leaf-list') name += '*';
      else if ((s.kw === 'leaf' && !s.isKey) || s.kw === 'anydata' || s.kw === 'anyxml') { if (!s.mandatory) name += '?'; }
      const t = typename(s);
      if (t === '') line += `${fl} ${name}`; else line += `${fl} ${simdPad(name, w + 1)}   ${t}`;
    }
    if (s.kw === 'list') line += s.keys ? ` [${s.keys.join(' ')}]` : ' []';
    const feats = (s.features || []).slice(); (s.augmentFeatures || []).forEach(f => { if (!feats.includes(f)) feats.push(f); });
    if (feats.length) line += ` {${feats.join(',')}}?`;
    out.push(line);
    if (s.children && s.kw !== 'uses') {
      const d = depth == null ? null : depth - 1;
      if (s.kw === 'choice' || s.kw === 'case') printChildren(s.children, prefix, mode, d, w - 3);
      else printChildren(s.children, prefix, mode, d, 0);
    }
  };
  let printedHeader = false;
  const header = () => { if (!printedHeader) { out.push(`${mod.stmt.kw}: ${mod.name}${mod.stmt.kw === 'submodule' ? ' (belongs-to ' + ((mod.stmt.subs.find(s => s.kw === 'belongs-to') || {}).arg || '') + ')' : ''}`); printedHeader = true; } };
  if (tree.data.length) { header(); printChildren(tree.data, '', 'data', depth0, 0); }
  if (tree.augments.length) { header(); out.push(''); for (const a of tree.augments) { out.push(`  augment ${a.path}:`); let mode = 'augment'; if (a.targetKw === 'input') mode = 'input'; else if (a.targetKw === 'output') mode = 'output'; else if (a.targetKw === 'notification') mode = 'notification'; printChildren(a.children, '  ', mode, depth0, 0); } }
  if (tree.rpcs.length) { header(); out.push('', '  rpcs:'); printChildren(tree.rpcs, '  ', 'rpc', depth0, 0); }
  if (tree.notifs.length) { header(); out.push('', '  notifications:'); printChildren(tree.notifs, '  ', 'notification', depth0, 0); }
  return out.length ? out.join('\n') + '\n' : '';
}

/* ---------- yin ---------- */
const SIMD_YIN_ARG = { action: 'name', anydata: 'name', anyxml: 'name', argument: 'name', augment: 'target-node', base: 'name', 'belongs-to': 'module', bit: 'name', case: 'name', choice: 'name', config: 'value', contact: '!text', container: 'name', default: 'value', description: '!text', deviate: 'value', deviation: 'target-node', enum: 'name', 'error-app-tag': 'value', 'error-message': '!value', extension: 'name', feature: 'name', 'fraction-digits': 'value', grouping: 'name', identity: 'name', 'if-feature': 'name', import: 'module', include: 'module', key: 'value', leaf: 'name', 'leaf-list': 'name', length: 'value', list: 'name', mandatory: 'value', 'max-elements': 'value', 'min-elements': 'value', modifier: 'value', module: 'name', must: 'condition', namespace: 'uri', notification: 'name', 'ordered-by': 'value', organization: '!text', path: 'value', pattern: 'value', position: 'value', prefix: 'value', presence: 'value', range: 'value', reference: '!text', refine: 'target-node', 'require-instance': 'value', revision: 'date', 'revision-date': 'date', rpc: 'name', status: 'value', submodule: 'name', type: 'name', typedef: 'name', unique: 'tag', units: 'name', uses: 'name', value: 'value', when: 'condition', 'yang-version': 'value', 'yin-element': 'value' };
function simdYangYin(mod, loader) {
  const top = mod.stmt; const L = ['<?xml version="1.0" encoding="UTF-8"?>'];
  const nsDecl = [`xmlns="urn:ietf:params:xml:ns:yang:yin:1"`];
  if (mod.prefix && mod.ns) nsDecl.push(`xmlns:${mod.prefix}="${simdXmlEsc(mod.ns)}"`);
  Object.entries(mod.imports || {}).forEach(([p, m]) => { const im = loader.loadName(m); if (im && im.ns) nsDecl.push(`xmlns:${p}="${simdXmlEsc(im.ns)}"`); });
  L.push(`<${top.kw} name="${simdXmlEsc(top.arg)}"`); nsDecl.forEach((d, i) => L.push(`        ${d}${i === nsDecl.length - 1 ? '>' : ''}`));
  const emit = (st, ind) => {
    const kind = SIMD_YIN_ARG[st.kw]; const tag = st.kw;
    if (st.arg === null || kind === undefined) { if (st.subs.length) { L.push(`${ind}<${tag}>`); st.subs.forEach(s => emit(s, ind + '  ')); L.push(`${ind}</${tag}>`); } else L.push(`${ind}<${tag}/>`); return; }
    if (kind.startsWith('!')) { const en = kind.slice(1); L.push(`${ind}<${tag}>`); const txt = simdXmlEsc(st.arg).split('\n').join('\n' + ind + '  '); L.push(`${ind}  <${en}>${txt}</${en}>`); st.subs.forEach(s => emit(s, ind + '  ')); L.push(`${ind}</${tag}>`); return; }
    if (!st.subs.length) L.push(`${ind}<${tag} ${kind}="${simdXmlEsc(st.arg)}"/>`);
    else { L.push(`${ind}<${tag} ${kind}="${simdXmlEsc(st.arg)}">`); st.subs.forEach(s => emit(s, ind + '  ')); L.push(`${ind}</${tag}>`); }
  };
  top.subs.forEach(s => emit(s, '  '));
  L.push(`</${top.kw}>`);
  return L.join('\n') + '\n';
}

/* ---------- pyang komutu ---------- */
const SIMD_PYANG_USAGE = 'Usage: pyang [options] [<filename>...]\n\nValidates the YANG module in <filename> (or stdin), and all its dependencies.\n';
const SIMD_PYANG_HELP = SIMD_PYANG_USAGE + `
Options:
  -h, --help            Show this help message and exit
  -v, --version         Show version number and exit
  -e, --list-errors     Print a listing of all error and warning codes and exit.
  -p PATH, --path=PATH  :-separated search path for yin and yang modules
  --lint                Validate the module(s) according to RFC 8407.
  --ietf                Validate the module(s) like lint, but with IETF specific rules.
  -f FORMAT, --format=FORMAT
                        Convert to FORMAT.  Supported formats are: tree, yin, yang
  -o OUTFILE, --output=OUTFILE
                        Write the output to OUTFILE instead of stdout.

Tree output specific options:
  --tree-depth=TREE_DEPTH
                        Number of levels to print
  --tree-line-length=TREE_LINE_LENGTH
                        Maximum line length
`;
function simdPyang(args, stdin) {
  const sh = this;
  const o = { format: null, depth: null, paths: [], lint: false, files: [], out: null, strict: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const val = () => { if (a.includes('=')) return a.slice(a.indexOf('=') + 1); return args[++i]; };
    const key = a.startsWith('--') && a.includes('=') ? a.slice(0, a.indexOf('=')) : a;
    if (key === '-h' || key === '--help') return ok(SIMD_PYANG_HELP);
    if (key === '-v' || key === '--version') return ok('pyang 2.6.1\n');
    if (key === '-f' || key === '--format') o.format = val();
    else if (key.startsWith('-f') && key.length > 2 && !key.startsWith('--')) o.format = key.slice(2);
    else if (key === '-p' || key === '--path') o.paths.push(...String(val()).split(':'));
    else if (key.startsWith('-p') && key.length > 2 && !key.startsWith('--')) o.paths.push(...key.slice(2).split(':'));
    else if (key === '--tree-depth') o.depth = parseInt(val(), 10);
    else if (key === '--tree-line-length' || key === '--tree-path' || key === '-o' || key === '--output' || key === '-W' || key === '-E' || key === '--max-line-length' || key === '--plugindir' || key === '--deviation-module' || key === '-F' || key === '--features') { const v = val(); if (key === '-o' || key === '--output') o.out = v; }
    else if (key === '--lint' || key === '--ietf') o.lint = true;
    else if (key === '--strict') o.strict = true;
    else if (key === '-e' || key === '--list-errors') return ok('Error tags and their meanings are listed in the real pyang, this lab emulates a subset\n');
    else if (key === '--canonical' || key === '-V' || key === '--verbose' || key === '--no-path-recurse' || key === '--trim-yin' || key === '--keep-comments' || key === '--tree-print-groupings' || key === '--tree-no-expand-uses' || key === '--tree-module-name-prefix' || key === '--tree-print-yang-data' || key === '--ignore-errors' || key === '--check-update-from-path' || key === '--print-error-code' || key === '--yang-canonical' || key === '--yang-remove-unused-imports') { /* yok say */ }
    else if (a.startsWith('-')) return { out: '', err: `${SIMD_PYANG_USAGE}\npyang: error: no such option: ${a}\n`, code: 2 };
    else o.files.push(a);
  }
  if (o.format && !['tree', 'yin', 'yang', 'name', 'depend'].includes(o.format)) return { out: '', err: `${SIMD_PYANG_USAGE}\npyang: error: unknown output format "${o.format}"\n`, code: 2 };
  if (!o.files.length) return { out: '', err: 'pyang: error: no input file given, bu lab stdin\'den modul okumaz\n', code: 1 };
  const dirs = [];
  const addDir = d => { if (!dirs.includes(d)) dirs.push(d); };
  o.paths.filter(Boolean).forEach(p => addDir(sh.resolve(p)));
  addDir(sh.cwd);
  o.files.forEach(f => addDir(sh.resolve(f).replace(/\/[^/]*$/, '') || '/'));
  const loader = simdYangLoader(sh, dirs);
  const errs = []; const mods = [];
  for (const f of o.files) {
    const abs = sh.resolve(f);
    const r = sh.readFile(abs, 'pyang');
    if (r.err) return { out: '', err: `error ${f}: [Errno 2] No such file or directory: '${f}'\n`, code: 1 };
    const m = loader.loadPath(abs, f); m.text = r.data; mods.push(m);
    if (!m.stmt) { errs.push(...m.parseErrors.map(e => ({ file: f, line: e.line, level: 'error', msg: e.msg }))); if (!m.parseErrors.length) errs.push({ file: f, line: 1, level: 'error', msg: 'unexpected keyword "' + ((m.parseErrors[0] || {}).kw || ((simdYangParse(r.data, f).stmts[0] || {}).kw || 'eof')) + '", expected "module" or "submodule"' }); }
  }
  mods.filter(m => m.stmt).forEach(m => simdYangValidate(m, loader, errs, o.lint));
  const printed = mods.filter(m => m.stmt).map(m => m.name);
  let out = '';
  if (o.format === 'tree') mods.filter(m => m.stmt).forEach(m => { if (!m._tree) m._tree = simdYangBuild(m, loader, errs, printed); });
  if (o.format === 'tree' || o.format === 'yin' || o.format === 'yang' || o.format === 'name' || o.format === 'depend') {
    let prevPrinted = false;
    mods.filter(m => m.stmt).forEach((m, i) => {
      if (o.format === 'tree') { const txt = simdYangTree(m._tree, { depth: o.depth }); if (i > 0 && prevPrinted) out += '\n'; out += txt; prevPrinted = txt.length > 0; return; }
      else if (o.format === 'yin') out += simdYangYin(m, loader);
      else if (o.format === 'yang') out += m.text;
      else if (o.format === 'name') out += m.name + '\n';
      else if (o.format === 'depend') out += `${m.name} : ${Object.values(m.imports || {}).join(' ')}\n`;
    });
  }
  const seen = new Set();
  const lines = errs.filter(e => { const k = `${e.file}:${e.line}:${e.msg}`; if (seen.has(k)) return false; seen.add(k); return true; }).map((e, idx) => ({ e, idx })).sort((a, b) => (a.e.file === b.e.file ? 0 : a.e.file < b.e.file ? -1 : 1) || a.e.line - b.e.line || a.idx - b.idx).map(({ e }) => `${e.file}:${e.line}: ${e.level}: ${e.msg}`);
  const hasError = errs.some(e => e.level === 'error') || (o.strict && errs.length > 0);
  if (o.out) { const er = sh.writeFile(o.out, out, false, 'pyang'); if (er) return fail(er); out = ''; }
  return { out, err: lines.length ? lines.join('\n') + '\n' : '', code: hasError ? 1 : 0 };
}

/* ---------- /home/burak/yang altina kurulan YANG dosyalari ---------- */
const SIMD_YANG_FILES = {
  "ietf-interfaces@2018-02-20.yang": "module ietf-interfaces {\n  yang-version 1.1;\n  namespace \"urn:ietf:params:xml:ns:yang:ietf-interfaces\";\n  prefix if;\n\n  import ietf-yang-types {\n    prefix yang;\n  }\n\n  organization\n    \"IETF NETMOD (Network Modeling) Working Group\";\n\n  contact\n    \"WG Web:   <https://datatracker.ietf.org/wg/netmod/>\n     WG List:  <mailto:netmod@ietf.org>\n\n     Editor:   Martin Bjorklund\n               <mailto:mbj@tail-f.com>\";\n\n  description\n    \"This module contains a collection of YANG definitions for\n     managing network interfaces.\n\n     Copyright (c) 2018 IETF Trust and the persons identified as\n     authors of the code.  All rights reserved.\n\n     Redistribution and use in source and binary forms, with or\n     without modification, is permitted pursuant to, and subject\n     to the license terms contained in, the Simplified BSD License\n     set forth in Section 4.c of the IETF Trust's Legal Provisions\n     Relating to IETF Documents\n     (https://trustee.ietf.org/license-info).\n\n     This version of this YANG module is part of RFC 8343; see\n     the RFC itself for full legal notices.\";\n\n  revision 2018-02-20 {\n    description\n      \"Updated to support NMDA.\";\n    reference\n      \"RFC 8343: A YANG Data Model for Interface Management\";\n  }\n\n  revision 2014-05-08 {\n    description\n      \"Initial revision.\";\n    reference\n      \"RFC 7223: A YANG Data Model for Interface Management\";\n  }\n\n  /*\n   * Typedefs\n   */\n\n  typedef interface-ref {\n    type leafref {\n      path \"/if:interfaces/if:interface/if:name\";\n    }\n    description\n      \"This type is used by data models that need to reference\n       interfaces.\";\n  }\n\n  /*\n   * Identities\n   */\n\n  identity interface-type {\n    description\n      \"Base identity from which specific interface types are\n       derived.\";\n  }\n\n  /*\n   * Features\n   */\n\n  feature arbitrary-names {\n    description\n      \"This feature indicates that the device allows user-controlled\n       interfaces to be named arbitrarily.\";\n  }\n  feature pre-provisioning {\n    description\n      \"This feature indicates that the device supports\n       pre-provisioning of interface configuration, i.e., it is\n       possible to configure an interface whose physical interface\n       hardware is not present on the device.\";\n  }\n  feature if-mib {\n    description\n      \"This feature indicates that the device implements\n       the IF-MIB.\";\n    reference\n      \"RFC 2863: The Interfaces Group MIB\";\n  }\n\n  /*\n   * Data nodes\n   */\n\n  container interfaces {\n    description\n      \"Interface parameters.\";\n\n    list interface {\n      key \"name\";\n\n      description\n        \"The list of interfaces on the device.\n\n         The status of an interface is available in this list in the\n         operational state.  If the configuration of a\n         system-controlled interface cannot be used by the system\n         (e.g., the interface hardware present does not match the\n         interface type), then the configuration is not applied to\n         the system-controlled interface shown in the operational\n         state.  If the configuration of a user-controlled interface\n         cannot be used by the system, the configured interface is\n         not instantiated in the operational state.\n\n         System-controlled interfaces created by the system are\n         always present in this list in the operational state,\n         whether or not they are configured.\";\n\n     leaf name {\n        type string;\n        description\n          \"The name of the interface.\n\n           A device MAY restrict the allowed values for this leaf,\n           possibly depending on the type of the interface.\n           For system-controlled interfaces, this leaf is the\n           device-specific name of the interface.\n\n           If a client tries to create configuration for a\n           system-controlled interface that is not present in the\n           operational state, the server MAY reject the request if\n           the implementation does not support pre-provisioning of\n           interfaces or if the name refers to an interface that can\n           never exist in the system.  A Network Configuration\n           Protocol (NETCONF) server MUST reply with an rpc-error\n           with the error-tag 'invalid-value' in this case.\n\n           If the device supports pre-provisioning of interface\n           configuration, the 'pre-provisioning' feature is\n           advertised.\n\n           If the device allows arbitrarily named user-controlled\n           interfaces, the 'arbitrary-names' feature is advertised.\n\n           When a configured user-controlled interface is created by\n           the system, it is instantiated with the same name in the\n           operational state.\n\n           A server implementation MAY map this leaf to the ifName\n           MIB object.  Such an implementation needs to use some\n           mechanism to handle the differences in size and characters\n           allowed between this leaf and ifName.  The definition of\n           such a mechanism is outside the scope of this document.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifName\";\n      }\n\n      leaf description {\n        type string;\n        description\n          \"A textual description of the interface.\n\n           A server implementation MAY map this leaf to the ifAlias\n           MIB object.  Such an implementation needs to use some\n           mechanism to handle the differences in size and characters\n           allowed between this leaf and ifAlias.  The definition of\n           such a mechanism is outside the scope of this document.\n\n           Since ifAlias is defined to be stored in non-volatile\n           storage, the MIB implementation MUST map ifAlias to the\n           value of 'description' in the persistently stored\n           configuration.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifAlias\";\n      }\n\n      leaf type {\n        type identityref {\n          base interface-type;\n        }\n        mandatory true;\n        description\n          \"The type of the interface.\n\n           When an interface entry is created, a server MAY\n           initialize the type leaf with a valid value, e.g., if it\n           is possible to derive the type from the name of the\n           interface.\n\n           If a client tries to set the type of an interface to a\n           value that can never be used by the system, e.g., if the\n           type is not supported or if the type does not match the\n           name of the interface, the server MUST reject the request.\n           A NETCONF server MUST reply with an rpc-error with the\n           error-tag 'invalid-value' in this case.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifType\";\n      }\n\n      leaf enabled {\n        type boolean;\n        default \"true\";\n        description\n          \"This leaf contains the configured, desired state of the\n           interface.\n\n           Systems that implement the IF-MIB use the value of this\n           leaf in the intended configuration to set\n           IF-MIB.ifAdminStatus to 'up' or 'down' after an ifEntry\n           has been initialized, as described in RFC 2863.\n\n           Changes in this leaf in the intended configuration are\n           reflected in ifAdminStatus.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifAdminStatus\";\n      }\n\n      leaf link-up-down-trap-enable {\n        if-feature if-mib;\n        type enumeration {\n          enum enabled {\n            value 1;\n            description\n              \"The device will generate linkUp/linkDown SNMP\n               notifications for this interface.\";\n          }\n          enum disabled {\n            value 2;\n            description\n              \"The device will not generate linkUp/linkDown SNMP\n               notifications for this interface.\";\n          }\n        }\n        description\n          \"Controls whether linkUp/linkDown SNMP notifications\n           should be generated for this interface.\n\n           If this node is not configured, the value 'enabled' is\n           operationally used by the server for interfaces that do\n           not operate on top of any other interface (i.e., there are\n           no 'lower-layer-if' entries), and 'disabled' otherwise.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB -\n                     ifLinkUpDownTrapEnable\";\n      }\n\n      leaf admin-status {\n        if-feature if-mib;\n        type enumeration {\n          enum up {\n            value 1;\n            description\n              \"Ready to pass packets.\";\n          }\n          enum down {\n            value 2;\n            description\n              \"Not ready to pass packets and not in some test mode.\";\n          }\n          enum testing {\n            value 3;\n            description\n              \"In some test mode.\";\n          }\n        }\n        config false;\n        mandatory true;\n        description\n          \"The desired state of the interface.\n\n           This leaf has the same read semantics as ifAdminStatus.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifAdminStatus\";\n      }\n\n      leaf oper-status {\n        type enumeration {\n          enum up {\n            value 1;\n            description\n              \"Ready to pass packets.\";\n          }\n          enum down {\n            value 2;\n\n            description\n              \"The interface does not pass any packets.\";\n          }\n          enum testing {\n            value 3;\n            description\n              \"In some test mode.  No operational packets can\n               be passed.\";\n          }\n          enum unknown {\n            value 4;\n            description\n              \"Status cannot be determined for some reason.\";\n          }\n          enum dormant {\n            value 5;\n            description\n              \"Waiting for some external event.\";\n          }\n          enum not-present {\n            value 6;\n            description\n              \"Some component (typically hardware) is missing.\";\n          }\n          enum lower-layer-down {\n            value 7;\n            description\n              \"Down due to state of lower-layer interface(s).\";\n          }\n        }\n        config false;\n        mandatory true;\n        description\n          \"The current operational state of the interface.\n\n           This leaf has the same semantics as ifOperStatus.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifOperStatus\";\n      }\n\n      leaf last-change {\n        type yang:date-and-time;\n        config false;\n        description\n          \"The time the interface entered its current operational\n           state.  If the current state was entered prior to the\n           last re-initialization of the local network management\n           subsystem, then this node is not present.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifLastChange\";\n      }\n\n      leaf if-index {\n        if-feature if-mib;\n        type int32 {\n          range \"1..2147483647\";\n        }\n        config false;\n        mandatory true;\n        description\n          \"The ifIndex value for the ifEntry represented by this\n           interface.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifIndex\";\n      }\n\n      leaf phys-address {\n        type yang:phys-address;\n        config false;\n        description\n          \"The interface's address at its protocol sub-layer.  For\n           example, for an 802.x interface, this object normally\n           contains a Media Access Control (MAC) address.  The\n           interface's media-specific modules must define the bit\n           and byte ordering and the format of the value of this\n           object.  For interfaces that do not have such an address\n           (e.g., a serial line), this node is not present.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifPhysAddress\";\n      }\n\n      leaf-list higher-layer-if {\n        type interface-ref;\n        config false;\n        description\n          \"A list of references to interfaces layered on top of this\n           interface.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifStackTable\";\n      }\n\n      leaf-list lower-layer-if {\n        type interface-ref;\n        config false;\n\n        description\n          \"A list of references to interfaces layered underneath this\n           interface.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifStackTable\";\n      }\n\n      leaf speed {\n        type yang:gauge64;\n        units \"bits/second\";\n        config false;\n        description\n            \"An estimate of the interface's current bandwidth in bits\n             per second.  For interfaces that do not vary in\n             bandwidth or for those where no accurate estimation can\n             be made, this node should contain the nominal bandwidth.\n             For interfaces that have no concept of bandwidth, this\n             node is not present.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB -\n                     ifSpeed, ifHighSpeed\";\n      }\n\n      container statistics {\n        config false;\n        description\n          \"A collection of interface-related statistics objects.\";\n\n        leaf discontinuity-time {\n          type yang:date-and-time;\n          mandatory true;\n          description\n            \"The time on the most recent occasion at which any one or\n             more of this interface's counters suffered a\n             discontinuity.  If no such discontinuities have occurred\n             since the last re-initialization of the local management\n             subsystem, then this node contains the time the local\n             management subsystem re-initialized itself.\";\n        }\n\n        leaf in-octets {\n          type yang:counter64;\n          description\n            \"The total number of octets received on the interface,\n             including framing characters.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifHCInOctets\";\n        }\n\n        leaf in-unicast-pkts {\n          type yang:counter64;\n          description\n            \"The number of packets, delivered by this sub-layer to a\n             higher (sub-)layer, that were not addressed to a\n             multicast or broadcast address at this sub-layer.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifHCInUcastPkts\";\n        }\n\n        leaf in-broadcast-pkts {\n          type yang:counter64;\n          description\n            \"The number of packets, delivered by this sub-layer to a\n             higher (sub-)layer, that were addressed to a broadcast\n             address at this sub-layer.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB -\n                       ifHCInBroadcastPkts\";\n        }\n\n        leaf in-multicast-pkts {\n          type yang:counter64;\n          description\n            \"The number of packets, delivered by this sub-layer to a\n             higher (sub-)layer, that were addressed to a multicast\n             address at this sub-layer.  For a MAC-layer protocol,\n             this includes both Group and Functional addresses.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB -\n                       ifHCInMulticastPkts\";\n        }\n\n        leaf in-discards {\n          type yang:counter32;\n          description\n            \"The number of inbound packets that were chosen to be\n             discarded even though no errors had been detected to\n             prevent their being deliverable to a higher-layer\n             protocol.  One possible reason for discarding such a\n             packet could be to free up buffer space.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifInDiscards\";\n        }\n\n        leaf in-errors {\n          type yang:counter32;\n          description\n            \"For packet-oriented interfaces, the number of inbound\n             packets that contained errors preventing them from being\n             deliverable to a higher-layer protocol.  For character-\n             oriented or fixed-length interfaces, the number of\n             inbound transmission units that contained errors\n             preventing them from being deliverable to a higher-layer\n             protocol.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifInErrors\";\n        }\n\n        leaf in-unknown-protos {\n          type yang:counter32;\n\n          description\n            \"For packet-oriented interfaces, the number of packets\n             received via the interface that were discarded because\n             of an unknown or unsupported protocol.  For\n             character-oriented or fixed-length interfaces that\n             support protocol multiplexing, the number of\n             transmission units received via the interface that were\n             discarded because of an unknown or unsupported protocol.\n             For any interface that does not support protocol\n             multiplexing, this counter is not present.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifInUnknownProtos\";\n        }\n\n        leaf out-octets {\n          type yang:counter64;\n          description\n            \"The total number of octets transmitted out of the\n             interface, including framing characters.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifHCOutOctets\";\n        }\n\n        leaf out-unicast-pkts {\n          type yang:counter64;\n          description\n            \"The total number of packets that higher-level protocols\n             requested be transmitted and that were not addressed\n             to a multicast or broadcast address at this sub-layer,\n             including those that were discarded or not sent.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifHCOutUcastPkts\";\n        }\n\n        leaf out-broadcast-pkts {\n          type yang:counter64;\n          description\n            \"The total number of packets that higher-level protocols\n             requested be transmitted and that were addressed to a\n             broadcast address at this sub-layer, including those\n             that were discarded or not sent.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB -\n                       ifHCOutBroadcastPkts\";\n        }\n\n        leaf out-multicast-pkts {\n          type yang:counter64;\n          description\n            \"The total number of packets that higher-level protocols\n             requested be transmitted and that were addressed to a\n             multicast address at this sub-layer, including those\n             that were discarded or not sent.  For a MAC-layer\n             protocol, this includes both Group and Functional\n             addresses.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB -\n                       ifHCOutMulticastPkts\";\n        }\n\n        leaf out-discards {\n          type yang:counter32;\n          description\n            \"The number of outbound packets that were chosen to be\n             discarded even though no errors had been detected to\n             prevent their being transmitted.  One possible reason\n             for discarding such a packet could be to free up buffer\n             space.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifOutDiscards\";\n        }\n\n        leaf out-errors {\n          type yang:counter32;\n          description\n            \"For packet-oriented interfaces, the number of outbound\n             packets that could not be transmitted because of errors.\n             For character-oriented or fixed-length interfaces, the\n             number of outbound transmission units that could not be\n             transmitted because of errors.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifOutErrors\";\n        }\n      }\n\n    }\n  }\n\n  /*\n   * Legacy typedefs\n   */\n\n  typedef interface-state-ref {\n    type leafref {\n      path \"/if:interfaces-state/if:interface/if:name\";\n    }\n    status deprecated;\n    description\n      \"This type is used by data models that need to reference\n       the operationally present interfaces.\";\n  }\n\n  /*\n   * Legacy operational state data nodes\n   */\n\n  container interfaces-state {\n    config false;\n    status deprecated;\n    description\n      \"Data nodes for the operational state of interfaces.\";\n\n    list interface {\n      key \"name\";\n      status deprecated;\n\n      description\n        \"The list of interfaces on the device.\n\n         System-controlled interfaces created by the system are\n         always present in this list, whether or not they are\n         configured.\";\n\n      leaf name {\n        type string;\n        status deprecated;\n        description\n          \"The name of the interface.\n\n           A server implementation MAY map this leaf to the ifName\n           MIB object.  Such an implementation needs to use some\n           mechanism to handle the differences in size and characters\n           allowed between this leaf and ifName.  The definition of\n           such a mechanism is outside the scope of this document.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifName\";\n      }\n\n      leaf type {\n        type identityref {\n          base interface-type;\n        }\n        mandatory true;\n        status deprecated;\n        description\n          \"The type of the interface.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifType\";\n      }\n\n      leaf admin-status {\n        if-feature if-mib;\n        type enumeration {\n          enum up {\n            value 1;\n            description\n              \"Ready to pass packets.\";\n          }\n          enum down {\n            value 2;\n            description\n              \"Not ready to pass packets and not in some test mode.\";\n          }\n          enum testing {\n            value 3;\n            description\n              \"In some test mode.\";\n          }\n        }\n        mandatory true;\n        status deprecated;\n        description\n          \"The desired state of the interface.\n\n           This leaf has the same read semantics as ifAdminStatus.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifAdminStatus\";\n      }\n\n      leaf oper-status {\n        type enumeration {\n          enum up {\n            value 1;\n            description\n              \"Ready to pass packets.\";\n          }\n          enum down {\n            value 2;\n            description\n              \"The interface does not pass any packets.\";\n          }\n          enum testing {\n            value 3;\n            description\n              \"In some test mode.  No operational packets can\n               be passed.\";\n          }\n          enum unknown {\n            value 4;\n            description\n              \"Status cannot be determined for some reason.\";\n          }\n          enum dormant {\n            value 5;\n            description\n              \"Waiting for some external event.\";\n          }\n          enum not-present {\n            value 6;\n            description\n              \"Some component (typically hardware) is missing.\";\n          }\n          enum lower-layer-down {\n            value 7;\n            description\n              \"Down due to state of lower-layer interface(s).\";\n          }\n        }\n        mandatory true;\n        status deprecated;\n        description\n          \"The current operational state of the interface.\n\n           This leaf has the same semantics as ifOperStatus.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifOperStatus\";\n      }\n\n      leaf last-change {\n        type yang:date-and-time;\n        status deprecated;\n        description\n          \"The time the interface entered its current operational\n           state.  If the current state was entered prior to the\n           last re-initialization of the local network management\n           subsystem, then this node is not present.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifLastChange\";\n      }\n\n      leaf if-index {\n        if-feature if-mib;\n        type int32 {\n          range \"1..2147483647\";\n        }\n        mandatory true;\n        status deprecated;\n        description\n          \"The ifIndex value for the ifEntry represented by this\n           interface.\";\n\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifIndex\";\n      }\n\n      leaf phys-address {\n        type yang:phys-address;\n        status deprecated;\n        description\n          \"The interface's address at its protocol sub-layer.  For\n           example, for an 802.x interface, this object normally\n           contains a Media Access Control (MAC) address.  The\n           interface's media-specific modules must define the bit\n           and byte ordering and the format of the value of this\n           object.  For interfaces that do not have such an address\n           (e.g., a serial line), this node is not present.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifPhysAddress\";\n      }\n\n      leaf-list higher-layer-if {\n        type interface-state-ref;\n        status deprecated;\n        description\n          \"A list of references to interfaces layered on top of this\n           interface.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifStackTable\";\n      }\n\n      leaf-list lower-layer-if {\n        type interface-state-ref;\n        status deprecated;\n        description\n          \"A list of references to interfaces layered underneath this\n           interface.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifStackTable\";\n      }\n\n      leaf speed {\n        type yang:gauge64;\n        units \"bits/second\";\n        status deprecated;\n        description\n            \"An estimate of the interface's current bandwidth in bits\n             per second.  For interfaces that do not vary in\n             bandwidth or for those where no accurate estimation can\n\n             be made, this node should contain the nominal bandwidth.\n             For interfaces that have no concept of bandwidth, this\n             node is not present.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB -\n                     ifSpeed, ifHighSpeed\";\n      }\n\n      container statistics {\n        status deprecated;\n        description\n          \"A collection of interface-related statistics objects.\";\n\n        leaf discontinuity-time {\n          type yang:date-and-time;\n          mandatory true;\n          status deprecated;\n          description\n            \"The time on the most recent occasion at which any one or\n             more of this interface's counters suffered a\n             discontinuity.  If no such discontinuities have occurred\n             since the last re-initialization of the local management\n             subsystem, then this node contains the time the local\n             management subsystem re-initialized itself.\";\n        }\n\n        leaf in-octets {\n          type yang:counter64;\n          status deprecated;\n          description\n            \"The total number of octets received on the interface,\n             including framing characters.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifHCInOctets\";\n        }\n\n        leaf in-unicast-pkts {\n          type yang:counter64;\n          status deprecated;\n          description\n            \"The number of packets, delivered by this sub-layer to a\n             higher (sub-)layer, that were not addressed to a\n             multicast or broadcast address at this sub-layer.\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifHCInUcastPkts\";\n        }\n\n        leaf in-broadcast-pkts {\n          type yang:counter64;\n          status deprecated;\n          description\n            \"The number of packets, delivered by this sub-layer to a\n             higher (sub-)layer, that were addressed to a broadcast\n             address at this sub-layer.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB -\n                       ifHCInBroadcastPkts\";\n        }\n\n        leaf in-multicast-pkts {\n          type yang:counter64;\n          status deprecated;\n          description\n            \"The number of packets, delivered by this sub-layer to a\n             higher (sub-)layer, that were addressed to a multicast\n             address at this sub-layer.  For a MAC-layer protocol,\n             this includes both Group and Functional addresses.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB -\n                       ifHCInMulticastPkts\";\n        }\n\n        leaf in-discards {\n          type yang:counter32;\n          status deprecated;\n\n          description\n            \"The number of inbound packets that were chosen to be\n             discarded even though no errors had been detected to\n             prevent their being deliverable to a higher-layer\n             protocol.  One possible reason for discarding such a\n             packet could be to free up buffer space.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifInDiscards\";\n        }\n\n        leaf in-errors {\n          type yang:counter32;\n          status deprecated;\n          description\n            \"For packet-oriented interfaces, the number of inbound\n             packets that contained errors preventing them from being\n             deliverable to a higher-layer protocol.  For character-\n             oriented or fixed-length interfaces, the number of\n             inbound transmission units that contained errors\n             preventing them from being deliverable to a higher-layer\n             protocol.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifInErrors\";\n        }\n\n        leaf in-unknown-protos {\n          type yang:counter32;\n          status deprecated;\n          description\n            \"For packet-oriented interfaces, the number of packets\n             received via the interface that were discarded because\n             of an unknown or unsupported protocol.  For\n             character-oriented or fixed-length interfaces that\n             support protocol multiplexing, the number of\n             transmission units received via the interface that were\n             discarded because of an unknown or unsupported protocol.\n             For any interface that does not support protocol\n             multiplexing, this counter is not present.\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifInUnknownProtos\";\n        }\n\n        leaf out-octets {\n          type yang:counter64;\n          status deprecated;\n          description\n            \"The total number of octets transmitted out of the\n             interface, including framing characters.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifHCOutOctets\";\n        }\n\n        leaf out-unicast-pkts {\n          type yang:counter64;\n          status deprecated;\n          description\n            \"The total number of packets that higher-level protocols\n             requested be transmitted and that were not addressed\n             to a multicast or broadcast address at this sub-layer,\n             including those that were discarded or not sent.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifHCOutUcastPkts\";\n        }\n\n        leaf out-broadcast-pkts {\n          type yang:counter64;\n          status deprecated;\n\n          description\n            \"The total number of packets that higher-level protocols\n             requested be transmitted and that were addressed to a\n             broadcast address at this sub-layer, including those\n             that were discarded or not sent.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB -\n                       ifHCOutBroadcastPkts\";\n        }\n\n        leaf out-multicast-pkts {\n          type yang:counter64;\n          status deprecated;\n          description\n            \"The total number of packets that higher-level protocols\n             requested be transmitted and that were addressed to a\n             multicast address at this sub-layer, including those\n             that were discarded or not sent.  For a MAC-layer\n             protocol, this includes both Group and Functional\n             addresses.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB -\n                       ifHCOutMulticastPkts\";\n        }\n\n        leaf out-discards {\n          type yang:counter32;\n          status deprecated;\n          description\n            \"The number of outbound packets that were chosen to be\n             discarded even though no errors had been detected to\n             prevent their being transmitted.  One possible reason\n             for discarding such a packet could be to free up buffer\n             space.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifOutDiscards\";\n        }\n\n        leaf out-errors {\n          type yang:counter32;\n          status deprecated;\n          description\n            \"For packet-oriented interfaces, the number of outbound\n             packets that could not be transmitted because of errors.\n             For character-oriented or fixed-length interfaces, the\n             number of outbound transmission units that could not be\n             transmitted because of errors.\n\n             Discontinuities in the value of this counter can occur\n             at re-initialization of the management system and at\n             other times as indicated by the value of\n             'discontinuity-time'.\";\n          reference\n            \"RFC 2863: The Interfaces Group MIB - ifOutErrors\";\n        }\n      }\n    }\n  }\n}\n",
  "ietf-ip.yang": "module ietf-ip {\n  yang-version 1.1;\n  namespace \"urn:ietf:params:xml:ns:yang:ietf-ip\";\n  prefix ip;\n\n  import ietf-interfaces {\n    prefix if;\n  }\n  import ietf-inet-types {\n    prefix inet;\n  }\n  import ietf-yang-types {\n    prefix yang;\n  }\n\n  organization\n    \"IETF NETMOD (Network Modeling) Working Group\";\n\n  contact\n    \"WG Web:   <https://datatracker.ietf.org/wg/netmod/>\n     WG List:  <mailto:netmod@ietf.org>\";\n\n  description\n    \"This module contains a collection of YANG definitions for\n     MANAGING IP implementations.  Lab copy, trimmed to the IPv4\n     configuration subtree and a small IPv6 subtree so that\n     pyang output stays short. The deprecated interfaces-state\n     augment is kept so that the x-- marker can be seen.\n\n     Copyright (c) 2018 IETF Trust and the persons identified as\n     authors of the code.  All rights reserved.\";\n\n  revision 2018-02-22 {\n    description\n      \"Updated to support NMDA.\";\n    reference\n      \"RFC 8344: A YANG Data Model for IP Management\";\n  }\n\n  feature ipv4-non-contiguous-netmasks {\n    description\n      \"Indicates support for configuring non-contiguous\n       subnet masks.\";\n  }\n\n  feature ipv6-privacy-autoconf {\n    description\n      \"Indicates support for IPv6 Privacy Extensions for Stateless\n       Address Autoconfiguration.\";\n    reference\n      \"RFC 4941: Privacy Extensions for Stateless Address\n                 Autoconfiguration in IPv6\";\n  }\n\n  typedef ip-address-origin {\n    type enumeration {\n      enum other {\n        description\n          \"None of the following.\";\n      }\n      enum static {\n        description\n          \"Indicates that the address has been statically\n           configured -- for example, using the Network Configuration\n           Protocol (NETCONF) or a command line interface.\";\n      }\n      enum dhcp {\n        description\n          \"Indicates an address that has been assigned to this\n           system by a DHCP server.\";\n      }\n      enum link-layer {\n        description\n          \"Indicates an address created by IPv6 stateless\n           autoconfiguration that embeds a link-layer address in its\n           interface identifier.\";\n      }\n      enum random {\n        description\n          \"Indicates an address chosen by the system at\n           random, e.g., an IPv4 address within 169.254/16, a\n           temporary address as described in RFC 4941.\";\n      }\n    }\n    description\n      \"The origin of an address.\";\n  }\n\n  typedef neighbor-origin {\n    type enumeration {\n      enum other {\n        description\n          \"None of the following.\";\n      }\n      enum static {\n        description\n          \"Indicates that the mapping has been statically\n           configured -- for example, using NETCONF or a command line\n           interface.\";\n      }\n      enum dynamic {\n        description\n          \"Indicates that the mapping has been dynamically resolved\n           using, for example, IPv4 ARP or the IPv6 Neighbor\n           Discovery protocol.\";\n      }\n    }\n    description\n      \"The origin of a neighbor entry.\";\n  }\n\n  augment \"/if:interfaces/if:interface\" {\n    description\n      \"IP parameters on interfaces.\n\n       If an interface is not capable of running IP, the server\n       must not allow the client to configure these parameters.\";\n    container ipv4 {\n      presence\n        \"Enables IPv4 unless the 'enabled' leaf\n         (which defaults to 'true') is set to 'false'\";\n      description\n        \"Parameters for the IPv4 address family.\";\n      leaf enabled {\n        type boolean;\n        default true;\n        description\n          \"Controls whether IPv4 is enabled or disabled on this\n           interface.  When IPv4 is enabled, this interface is\n           connected to an IPv4 stack, and the interface can send\n           and receive IPv4 packets.\";\n      }\n      leaf forwarding {\n        type boolean;\n        default false;\n        description\n          \"Controls IPv4 packet forwarding of datagrams received by,\n           but not addressed to, this interface.  IPv4 routers\n           forward datagrams.  IPv4 hosts do not (except those\n           source-routed via the host).\";\n      }\n      leaf mtu {\n        type uint16 {\n          range \"68..max\";\n        }\n        units \"octets\";\n        description\n          \"The size, in octets, of the largest IPv4 packet that the\n           interface will send and receive.\";\n        reference\n          \"RFC 791: Internet Protocol\";\n      }\n      list address {\n        key \"ip\";\n        description\n          \"The list of IPv4 addresses on the interface.\";\n        leaf ip {\n          type inet:ipv4-address-no-zone;\n          description\n            \"The IPv4 address on the interface.\";\n        }\n        choice subnet {\n          mandatory true;\n          description\n            \"The subnet can be specified as a prefix length or,\n             if the server supports non-contiguous netmasks, as\n             a netmask.\";\n          leaf prefix-length {\n            type uint8 {\n              range \"0..32\";\n            }\n            description\n              \"The length of the subnet prefix.\";\n          }\n          leaf netmask {\n            if-feature \"ipv4-non-contiguous-netmasks\";\n            type yang:dotted-quad;\n            description\n              \"The subnet specified as a netmask.\";\n          }\n        }\n        leaf origin {\n          type ip-address-origin;\n          config false;\n          description\n            \"The origin of this address.\";\n        }\n      }\n      list neighbor {\n        key \"ip\";\n        description\n          \"A list of mappings from IPv4 addresses to\n           link-layer addresses.\n\n           Entries in this list in the intended configuration are\n           used as static entries in the ARP Cache.\";\n        reference\n          \"RFC 826: An Ethernet Address Resolution Protocol\";\n        leaf ip {\n          type inet:ipv4-address-no-zone;\n          description\n            \"The IPv4 address of the neighbor node.\";\n        }\n        leaf link-layer-address {\n          type yang:phys-address;\n          mandatory true;\n          description\n            \"The link-layer address of the neighbor node.\";\n        }\n        leaf origin {\n          type neighbor-origin;\n          config false;\n          description\n            \"The origin of this neighbor entry.\";\n        }\n      }\n    }\n    container ipv6 {\n      presence\n        \"Enables IPv6 unless the 'enabled' leaf\n         (which defaults to 'true') is set to 'false'\";\n      description\n        \"Parameters for the IPv6 address family.\";\n      leaf enabled {\n        type boolean;\n        default true;\n        description\n          \"Controls whether IPv6 is enabled or disabled on this\n           interface.  When IPv6 is enabled, this interface is\n           connected to an IPv6 stack, and the interface can send\n           and receive IPv6 packets.\";\n      }\n      leaf forwarding {\n        type boolean;\n        default false;\n        description\n          \"Controls IPv6 packet forwarding of datagrams received by,\n           but not addressed to, this interface.  IPv6 routers\n           forward datagrams.  IPv6 hosts do not (except those\n           source-routed via the host).\";\n      }\n      leaf mtu {\n        type uint32 {\n          range \"1280..max\";\n        }\n        units \"octets\";\n        description\n          \"The size, in octets, of the largest IPv6 packet that the\n           interface will send and receive.\";\n        reference\n          \"RFC 8200: Internet Protocol, Version 6 (IPv6)\n                     Specification\n                     Section 5\";\n      }\n      list address {\n        key \"ip\";\n        description\n          \"The list of IPv6 addresses on the interface.\";\n        leaf ip {\n          type inet:ipv6-address-no-zone;\n          description\n            \"The IPv6 address on the interface.\";\n        }\n        leaf prefix-length {\n          type uint8 {\n            range \"0..128\";\n          }\n          mandatory true;\n          description\n            \"The length of the subnet prefix.\";\n        }\n        leaf origin {\n          type ip-address-origin;\n          config false;\n          description\n            \"The origin of this address.\";\n        }\n      }\n      leaf dup-addr-detect-transmits {\n        type uint32;\n        default 1;\n        description\n          \"The number of consecutive Neighbor Solicitation messages\n           sent while performing Duplicate Address Detection on a\n           tentative address.\";\n        reference\n          \"RFC 4862: IPv6 Stateless Address Autoconfiguration\";\n      }\n    }\n  }\n\n  /*\n   * Legacy operational state data nodes\n   */\n\n  augment \"/if:interfaces-state/if:interface\" {\n    status deprecated;\n    description\n      \"Data nodes for the operational state of IP on interfaces.\";\n    container ipv4 {\n      presence\n        \"Present if IPv4 is enabled on this interface\";\n      config false;\n      status deprecated;\n      description\n        \"Interface-specific parameters for the IPv4 address family.\";\n      leaf forwarding {\n        type boolean;\n        status deprecated;\n        description\n          \"Indicates whether IPv4 packet forwarding is enabled or\n           disabled on this interface.\";\n      }\n      leaf mtu {\n        type uint16 {\n          range \"68..max\";\n        }\n        units \"octets\";\n        status deprecated;\n        description\n          \"The size, in octets, of the largest IPv4 packet that the\n           interface will send and receive.\";\n        reference\n          \"RFC 791: Internet Protocol\";\n      }\n      list address {\n        key \"ip\";\n        status deprecated;\n        description\n          \"The list of IPv4 addresses on the interface.\";\n        leaf ip {\n          type inet:ipv4-address-no-zone;\n          status deprecated;\n          description\n            \"The IPv4 address on the interface.\";\n        }\n        choice subnet {\n          status deprecated;\n          description\n            \"The subnet can be specified as a prefix length or,\n             if the server supports non-contiguous netmasks, as\n             a netmask.\";\n          leaf prefix-length {\n            type uint8 {\n              range \"0..32\";\n            }\n            status deprecated;\n            description\n              \"The length of the subnet prefix.\";\n          }\n          leaf netmask {\n            if-feature \"ipv4-non-contiguous-netmasks\";\n            type yang:dotted-quad;\n            status deprecated;\n            description\n              \"The subnet specified as a netmask.\";\n          }\n        }\n        leaf origin {\n          type ip-address-origin;\n          status deprecated;\n          description\n            \"The origin of this address.\";\n        }\n      }\n    }\n  }\n}\n",
  "ietf-yang-types.yang": "module ietf-yang-types {\n\n  namespace \"urn:ietf:params:xml:ns:yang:ietf-yang-types\";\n  prefix \"yang\";\n\n  organization\n   \"IETF NETMOD (NETCONF Data Modeling Language) Working Group\";\n\n  contact\n   \"WG Web:   <http://tools.ietf.org/wg/netmod/>\n    WG List:  <mailto:netmod@ietf.org>\";\n\n  description\n   \"This module contains a collection of generally useful derived\n    YANG data types. Lab copy, trimmed to the typedefs used by the\n    other modules in this directory.\n\n    Copyright (c) 2013 IETF Trust and the persons identified as\n    authors of the code.  All rights reserved.\";\n\n  revision 2013-07-15 {\n    description\n     \"This revision adds the following new data types:\n      - yang-identifier\n      - hex-string\n      - uuid\n      - dotted-quad\";\n    reference\n     \"RFC 6991: Common YANG Data Types\";\n  }\n\n  typedef counter32 {\n    type uint32;\n    description\n     \"The counter32 type represents a non-negative integer\n      that monotonically increases until it reaches a\n      maximum value of 2^32-1 (4294967295 decimal), when it\n      wraps around and starts increasing again from zero.\";\n    reference\n     \"RFC 2578: Structure of Management Information Version 2 (SMIv2)\";\n  }\n\n  typedef zero-based-counter32 {\n    type yang:counter32;\n    default \"0\";\n    description\n     \"The zero-based-counter32 type represents a counter32\n      that has the defined 'initial' value zero.\";\n    reference\n     \"RFC 4502: Remote Network Monitoring Management Information\n                Base Version 2\";\n  }\n\n  typedef counter64 {\n    type uint64;\n    description\n     \"The counter64 type represents a non-negative integer\n      that monotonically increases until it reaches a\n      maximum value of 2^64-1 (18446744073709551615 decimal),\n      when it wraps around and starts increasing again from zero.\";\n    reference\n     \"RFC 2578: Structure of Management Information Version 2 (SMIv2)\";\n  }\n\n  typedef gauge32 {\n    type uint32;\n    description\n     \"The gauge32 type represents a non-negative integer, which\n      may increase or decrease, but shall never exceed a maximum\n      value, nor fall below a minimum value.\";\n    reference\n     \"RFC 2578: Structure of Management Information Version 2 (SMIv2)\";\n  }\n\n  typedef gauge64 {\n    type uint64;\n    description\n     \"The gauge64 type represents a non-negative integer, which\n      may increase or decrease, but shall never exceed a maximum\n      value, nor fall below a minimum value.\";\n    reference\n     \"RFC 2856: Textual Conventions for Additional High Capacity\n                Data Types\";\n  }\n\n  typedef date-and-time {\n    type string {\n      pattern '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?'\n            + '(Z|[\\+\\-]\\d{2}:\\d{2})';\n    }\n    description\n     \"The date-and-time type is a profile of the ISO 8601\n      standard for representation of dates and times using the\n      Gregorian calendar.\";\n    reference\n     \"RFC 3339: Date and Time on the Internet: Timestamps\";\n  }\n\n  typedef timeticks {\n    type uint32;\n    description\n     \"The timeticks type represents a non-negative integer that\n      represents the time, modulo 2^32 (4294967296 decimal), in\n      hundredths of a second between two epochs.\";\n    reference\n     \"RFC 2578: Structure of Management Information Version 2 (SMIv2)\";\n  }\n\n  typedef phys-address {\n    type string {\n      pattern '([0-9a-fA-F]{2}(:[0-9a-fA-F]{2})*)?';\n    }\n    description\n     \"Represents media- or physical-level addresses represented\n      as a sequence octets, each octet represented by two hexadecimal\n      numbers.  Octets are separated by colons.\";\n    reference\n     \"RFC 2579: Textual Conventions for SMIv2\";\n  }\n\n  typedef mac-address {\n    type string {\n      pattern '[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5}';\n    }\n    description\n     \"The mac-address type represents an IEEE 802 MAC address.\n      The canonical representation uses lowercase characters.\";\n    reference\n     \"IEEE 802: IEEE Standard for Local and Metropolitan Area\n                Networks: Overview and Architecture\";\n  }\n\n  typedef hex-string {\n    type string {\n      pattern '([0-9a-fA-F]{2}(:[0-9a-fA-F]{2})*)?';\n    }\n    description\n     \"A hexadecimal string with octets represented as hex digits\n      separated by colons.  The canonical representation uses\n      lowercase characters.\";\n  }\n\n  typedef uuid {\n    type string {\n      pattern '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-'\n            + '[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';\n    }\n    description\n     \"A Universally Unique IDentifier in the string representation\n      defined in RFC 4122.\";\n    reference\n     \"RFC 4122: A Universally Unique IDentifier (UUID) URN\n                Namespace\";\n  }\n\n  typedef dotted-quad {\n    type string {\n      pattern\n        '(([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.){3}'\n        + '([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])';\n    }\n    description\n     \"An unsigned 32-bit number expressed in the dotted-quad\n      notation, i.e., four octets written as decimal numbers\n      and separated with the '.' (full stop) character.\";\n  }\n\n  typedef yang-identifier {\n    type string {\n      length \"1..max\";\n      pattern '[a-zA-Z_][a-zA-Z0-9\\-_.]*';\n      pattern '.|..|[^xX].*|.[^mM].*|..[^lL].*';\n    }\n    description\n      \"A YANG identifier string as defined by the 'identifier'\n       rule in Section 12 of RFC 6020.\";\n    reference\n      \"RFC 6020: YANG - A Data Modeling Language for the Network\n                 Configuration Protocol (NETCONF)\";\n  }\n}\n",
  "ietf-inet-types.yang": "module ietf-inet-types {\n\n  namespace \"urn:ietf:params:xml:ns:yang:ietf-inet-types\";\n  prefix \"inet\";\n\n  organization\n   \"IETF NETMOD (NETCONF Data Modeling Language) Working Group\";\n\n  contact\n   \"WG Web:   <http://tools.ietf.org/wg/netmod/>\n    WG List:  <mailto:netmod@ietf.org>\";\n\n  description\n   \"This module contains a collection of generally useful derived\n    YANG data types for Internet addresses and related things.\n    Lab copy, trimmed to the typedefs used by the other modules\n    in this directory.\n\n    Copyright (c) 2013 IETF Trust and the persons identified as\n    authors of the code.  All rights reserved.\";\n\n  revision 2013-07-15 {\n    description\n     \"This revision adds the following new data types:\n      - ip-address-no-zone\n      - ipv4-address-no-zone\n      - ipv6-address-no-zone\";\n    reference\n     \"RFC 6991: Common YANG Data Types\";\n  }\n\n  typedef ip-version {\n    type enumeration {\n      enum unknown {\n        value \"0\";\n        description\n         \"An unknown or unspecified version of the Internet\n          protocol.\";\n      }\n      enum ipv4 {\n        value \"1\";\n        description\n         \"The IPv4 protocol as defined in RFC 791.\";\n      }\n      enum ipv6 {\n        value \"2\";\n        description\n         \"The IPv6 protocol as defined in RFC 2460.\";\n      }\n    }\n    description\n     \"This value represents the version of the IP protocol.\";\n    reference\n     \"RFC 2578: Structure of Management Information Version 2 (SMIv2)\";\n  }\n\n  typedef port-number {\n    type uint16 {\n      range \"0..65535\";\n    }\n    description\n     \"The port-number type represents a 16-bit port number of an\n      Internet transport-layer protocol such as UDP, TCP, DCCP, or\n      SCTP.\";\n    reference\n     \"RFC  768: User Datagram Protocol\n      RFC  793: Transmission Control Protocol\";\n  }\n\n  typedef as-number {\n    type uint32;\n    description\n     \"The as-number type represents autonomous system numbers\n      which identify an Autonomous System (AS).  An AS is a set\n      of routers under a single technical administration, using\n      an interior gateway protocol and common metrics to route\n      packets within the AS, and using an exterior gateway\n      protocol to route packets to other ASes.\";\n    reference\n     \"RFC 1930: Guidelines for creation, selection, and registration\n                of an Autonomous System (AS)\n      RFC 4271: A Border Gateway Protocol 4 (BGP-4)\";\n  }\n\n  typedef ip-address {\n    type union {\n      type inet:ipv4-address;\n      type inet:ipv6-address;\n    }\n    description\n     \"The ip-address type represents an IP address and is IP\n      version neutral.  The format of the textual representation\n      implies the IP version.  This type supports scoped addresses\n      by allowing zone index in the address format.\";\n    reference\n     \"RFC 4007: IPv6 Scoped Address Architecture\";\n  }\n\n  typedef ipv4-address {\n    type string {\n      pattern\n        '(([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.){3}'\n      +  '([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])'\n      + '(%[\\p{N}\\p{L}]+)?';\n    }\n    description\n      \"The ipv4-address type represents an IPv4 address in\n       dotted-quad notation.  The IPv4 address may include a zone\n       index, separated by a % sign.\";\n  }\n\n  typedef ipv6-address {\n    type string {\n      pattern '((:|[0-9a-fA-F]{0,4}):)([0-9a-fA-F]{0,4}:){0,5}'\n            + '((([0-9a-fA-F]{0,4}:)?(:|[0-9a-fA-F]{0,4}))|'\n            + '(((25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\\.){3}'\n            + '(25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])))'\n            + '(%[\\p{N}\\p{L}]+)?';\n      pattern '(([^:]+:){6}(([^:]+:[^:]+)|(.*\\..*)))|'\n            + '((([^:]+:)*[^:]+)?::(([^:]+:)*[^:]+)?)'\n            + '(%.+)?';\n    }\n    description\n     \"The ipv6-address type represents an IPv6 address in full,\n      mixed, shortened, and shortened-mixed notation.  The IPv6\n      address may include a zone index, separated by a % sign.\";\n    reference\n     \"RFC 4291: IP Version 6 Addressing Architecture\n      RFC 4007: IPv6 Scoped Address Architecture\n      RFC 5952: A Recommendation for IPv6 Address Text\n                Representation\";\n  }\n\n  typedef ip-address-no-zone {\n    type union {\n      type inet:ipv4-address-no-zone;\n      type inet:ipv6-address-no-zone;\n    }\n    description\n     \"The ip-address-no-zone type represents an IP address and is\n      IP version neutral.  The format of the textual representation\n      implies the IP version.  This type does not support scoped\n      addresses since it does not allow zone identifiers in the\n      address format.\";\n    reference\n     \"RFC 4007: IPv6 Scoped Address Architecture\";\n  }\n\n  typedef ipv4-address-no-zone {\n    type inet:ipv4-address {\n      pattern '[0-9\\.]*';\n    }\n    description\n      \"An IPv4 address without a zone index.  This type, derived from\n       ipv4-address, may be used in situations where the zone is\n       known from the context and hence no zone index is needed.\";\n  }\n\n  typedef ipv6-address-no-zone {\n    type inet:ipv6-address {\n      pattern '[0-9a-fA-F:\\.]*';\n    }\n    description\n      \"An IPv6 address without a zone index.  This type, derived from\n       ipv6-address, may be used in situations where the zone is\n       known from the context and hence no zone index is needed.\";\n    reference\n     \"RFC 4291: IP Version 6 Addressing Architecture\n      RFC 4007: IPv6 Scoped Address Architecture\n      RFC 5952: A Recommendation for IPv6 Address Text\n                Representation\";\n  }\n\n  typedef ip-prefix {\n    type union {\n      type inet:ipv4-prefix;\n      type inet:ipv6-prefix;\n    }\n    description\n     \"The ip-prefix type represents an IP prefix and is IP\n      version neutral.  The format of the textual representations\n      implies the IP version.\";\n  }\n\n  typedef ipv4-prefix {\n    type string {\n      pattern\n         '(([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.){3}'\n       +  '([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])'\n       + '/(([0-9])|([1-2][0-9])|(3[0-2]))';\n    }\n    description\n     \"The ipv4-prefix type represents an IPv4 address prefix.\n      The prefix length is given by the number following the\n      slash character and must be less than or equal to 32.\";\n  }\n\n  typedef ipv6-prefix {\n    type string {\n      pattern '((:|[0-9a-fA-F]{0,4}):)([0-9a-fA-F]{0,4}:){0,5}'\n            + '((([0-9a-fA-F]{0,4}:)?(:|[0-9a-fA-F]{0,4}))|'\n            + '(((25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\\.){3}'\n            + '(25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])))'\n            + '(/(([0-9])|([0-9]{2})|(1[0-1][0-9])|(12[0-8])))';\n      pattern '(([^:]+:){6}(([^:]+:[^:]+)|(.*\\..*)))|'\n            + '((([^:]+:)*[^:]+)?::(([^:]+:)*[^:]+)?)'\n            + '(/.+)';\n    }\n    description\n     \"The ipv6-prefix type represents an IPv6 address prefix.\n      The prefix length is given by the number following the\n      slash character and must be less than or equal to 128.\";\n    reference\n     \"RFC 4291: IP Version 6 Addressing Architecture\n      RFC 5952: A Recommendation for IPv6 Address Text\n                Representation\";\n  }\n\n  typedef domain-name {\n    type string {\n      pattern\n        '((([a-zA-Z0-9_]([a-zA-Z0-9\\-_]){0,61})?[a-zA-Z0-9]\\.)*'\n      +  '([a-zA-Z0-9_]([a-zA-Z0-9\\-_]){0,61})?[a-zA-Z0-9]\\.?)'\n      + '|\\.';\n      length \"1..253\";\n    }\n    description\n     \"The domain-name type represents a DNS domain name.  The\n      name SHOULD be fully qualified whenever possible.\";\n    reference\n     \"RFC 1034: Domain Names - Concepts and Facilities\n      RFC 1123: Requirements for Internet Hosts -- Application\n                and Support\";\n  }\n\n  typedef host {\n    type union {\n      type inet:ip-address;\n      type inet:domain-name;\n    }\n    description\n     \"The host type represents either an IP address or a DNS\n      domain name.\";\n  }\n\n  typedef uri {\n    type string;\n    description\n     \"The uri type represents a Uniform Resource Identifier\n      (URI) as defined by STD 66.\";\n    reference\n     \"RFC 3986: Uniform Resource Identifier (URI): Generic Syntax\";\n  }\n}\n",
  "openconfig-interfaces.yang": "module openconfig-interfaces {\n\n  yang-version \"1\";\n\n  // namespace\n  namespace \"http://openconfig.net/yang/interfaces\";\n\n  prefix \"oc-if\";\n\n  // import some basic types\n  import openconfig-yang-types { prefix oc-yang; }\n  import openconfig-types { prefix oc-types; }\n  import openconfig-extensions { prefix oc-ext; }\n  import ietf-interfaces { prefix ietf-if; }\n\n  // meta\n  organization \"OpenConfig working group\";\n\n  contact\n    \"OpenConfig working group\n    netopenconfig@googlegroups.com\";\n\n  description\n    \"Model for managing network interfaces and subinterfaces.  This\n    module also defines convenience types / groupings for other\n    models to create references to interfaces:\n\n      base-interface-ref (type) -  reference to a base interface\n      interface-ref (grouping) -  container for reference to a\n        interface + subinterface\n      interface-ref-state (grouping) - container for read-only\n        (opstate) reference to interface + subinterface\n\n    This model reuses data items defined in the IETF YANG model for\n    interfaces described by RFC 7223 with an alternate structure\n    (particularly for operational state data) and with\n    additional configuration items.\n\n    Lab copy, trimmed to the interface list, the common config and\n    state containers, the counters and the subinterface list.\";\n\n  oc-ext:openconfig-version \"3.7.2\";\n\n  revision \"2024-04-04\" {\n    description\n      \"Update description for interface-ref-common.\";\n    reference \"3.7.2\";\n  }\n\n  revision \"2023-02-06\" {\n    description\n      \"Add in-pkts and out-pkts to counters.\";\n    reference \"3.5.0\";\n  }\n\n  // OpenConfig specific extensions for module metadata.\n  oc-ext:regexp-posix;\n  oc-ext:catalog-organization \"openconfig\";\n  oc-ext:origin \"openconfig\";\n\n  // typedef statements\n\n  typedef base-interface-ref {\n    type leafref {\n      path \"/oc-if:interfaces/oc-if:interface/oc-if:name\";\n    }\n    description\n      \"Reusable type for by-name reference to a base interface.\n      This type may be used in cases where ability to reference\n      a subinterface is not required.\";\n  }\n\n  typedef interface-id {\n    type string;\n    description\n      \"User-defined identifier for an interface, generally used to\n      name a interface reference.  The id can be arbitrary but a\n      useful convention is to use a combination of base interface\n      name and subinterface index.\";\n  }\n\n  // grouping statements\n\n  grouping interface-ref-common {\n    description\n      \"Reference leafrefs to interface / subinterface\";\n\n    leaf interface {\n      type leafref {\n        path \"/oc-if:interfaces/oc-if:interface/oc-if:name\";\n      }\n      description\n        \"Reference to a base interface.  If a reference to a\n        subinterface is required, this leaf must be specified\n        to indicate the base interface.\";\n    }\n\n    leaf subinterface {\n      type leafref {\n        path \"/oc-if:interfaces/\" +\n          \"oc-if:interface[oc-if:name=current()/../interface]/\" +\n          \"oc-if:subinterfaces/oc-if:subinterface/oc-if:index\";\n      }\n      description\n        \"Reference to a subinterface -- this requires the base\n        interface to be specified using the interface leaf in\n        this container.  If only a reference to a base interface\n        is requuired, this leaf should not be set.\";\n    }\n  }\n\n  grouping interface-ref {\n    description\n      \"Reusable definition for a reference to an interface or\n      subinterface\";\n\n    container interface-ref {\n      description\n        \"Reference to an interface or subinterface\";\n\n      container config {\n        description\n          \"Configured reference to interface / subinterface\";\n        oc-ext:telemetry-on-change;\n\n        uses interface-ref-common;\n      }\n\n      container state {\n        config false;\n        description\n          \"Operational state for interface-ref\";\n\n        uses interface-ref-common;\n      }\n    }\n  }\n\n  grouping interface-common-config {\n    description\n      \"Configuration data data nodes common to physical interfaces\n      and subinterfaces\";\n\n    leaf description {\n      type string;\n      description\n        \"A textual description of the interface.\n\n        A server implementation MAY map this leaf to the ifAlias\n        MIB object.  Such an implementation needs to use some\n        mechanism to handle the differences in size and characters\n        allowed between this leaf and ifAlias.  The definition of\n        such a mechanism is outside the scope of this document.\n\n        Since ifAlias is defined to be stored in non-volatile\n        storage, the MIB implementation MUST map ifAlias to the\n        value of 'description' in the persistently stored\n        datastore.\n\n        Specifically, if the device supports ':startup', when\n        ifAlias is read the device MUST return the value of\n        'description' in the 'startup' datastore, and when it is\n        written, it MUST be written to the 'running' and 'startup'\n        datastores.  Note that it is up to the implementation to\n\n        decide whether to modify this single leaf in 'startup' or\n        perform an implicit copy-config from 'running' to\n        'startup'.\n\n        If the device does not support ':startup', ifAlias MUST\n        be mapped to the 'description' leaf in the 'running'\n        datastore.\";\n      reference\n        \"RFC 2863: The Interfaces Group MIB - ifAlias\";\n    }\n\n    leaf enabled {\n      type boolean;\n      default \"true\";\n      description\n        \"This leaf contains the configured, desired state of the\n        interface.\n\n        Systems that implement the IF-MIB use the value of this\n        leaf in the 'running' datastore to set\n        IF-MIB.ifAdminStatus to 'up' or 'down' after an ifEntry\n        has been initialized, as described in RFC 2863.\n\n        Changes in this leaf in the 'running' datastore are\n        reflected in ifAdminStatus, but if ifAdminStatus is\n        changed over SNMP, this leaf is not affected.\";\n      reference\n        \"RFC 2863: The Interfaces Group MIB - ifAdminStatus\";\n    }\n  }\n\n  grouping interface-phys-config {\n    description\n      \"Configuration data for physical interfaces\";\n\n    leaf name {\n      type string;\n      description\n        \"The name of the interface.\n\n        A device MAY restrict the allowed values for this leaf,\n        possibly depending on the type of the interface.\n        For system-controlled interfaces, this leaf is the\n        device-specific name of the interface.  The 'config false'\n        list interfaces/interface[name]/state contains the currently\n        existing interfaces on the device.\n\n        If a client tries to create configuration for a\n        system-controlled interface that is not present in the\n        corresponding state list, the server MAY reject\n        the request if the implementation does not support\n        pre-provisioning of interfaces or if the name refers to\n        an interface that can never exist in the system.  A\n        NETCONF server MUST reply with an rpc-error with the\n        error-tag 'invalid-value' in this case.\n\n        The IETF model in RFC 7223 provides YANG features for the\n        following (i.e., pre-provisioning and arbitrary-names),\n        however they are omitted here:\n\n          If the device supports pre-provisioning of interface\n          configuration, the 'pre-provisioning' feature is\n          advertised.\n\n          If the device allows arbitrarily named user-controlled\n          interfaces, the 'arbitrary-names' feature is advertised.\n\n        When a configured user-controlled interface is created by\n        the system, it is instantiated with the same name in the\n        /interfaces/interface[name]/state list.\";\n    }\n\n    leaf type {\n      type identityref {\n        base ietf-if:interface-type;\n      }\n      mandatory true;\n      description\n        \"The type of the interface.\n\n        When an interface entry is created, a server MAY\n        initialize the type leaf with a valid value, e.g., if it\n        is possible to derive the type from the name of the\n        interface.\n\n        If a client tries to set the type of an interface to a\n        value that can never be used by the system, e.g., if the\n        type is not supported or if the type does not match the\n        name of the interface, the server MUST reject the request.\n        A NETCONF server MUST reply with an rpc-error with the\n        error-tag 'invalid-value' in this case.\";\n      reference\n        \"RFC 2863: The Interfaces Group MIB - ifType\";\n    }\n\n    leaf mtu {\n      type uint16;\n      description\n        \"Set the max transmission unit size in octets\n        for the physical interface.  If this is not set, the mtu is\n        set to the operational default -- e.g., 1514 bytes on an\n        Ethernet interface.\";\n    }\n\n    uses interface-common-config;\n  }\n\n  grouping interface-phys-holdtime-config {\n    description\n      \"Configuration data for interface hold-time settings --\n      applies to physical interfaces.\";\n\n    leaf up {\n      type uint32;\n      units milliseconds;\n      default 0;\n      description\n        \"Dampens advertisement when the interface\n        transitions from down to up.  A zero value means dampening\n        is turned off, i.e., immediate notification.\";\n    }\n\n    leaf down {\n      type uint32;\n      units milliseconds;\n      default 0;\n      description\n        \"Dampens advertisement when the interface transitions from\n        up to down.  A zero value means dampening is turned off,\n        i.e., immediate notification.\";\n    }\n  }\n\n  grouping interface-common-state {\n    description\n      \"Operational state data (in addition to intended configuration)\n      at the global level for this interface\";\n\n    leaf ifindex {\n      type uint32;\n      description\n        \"System assigned number for each interface.  Corresponds to\n        ifIndex object in SNMP Interface MIB\";\n      reference\n        \"RFC 2863 - The Interfaces Group MIB\";\n    }\n\n    leaf admin-status {\n      type enumeration {\n        enum UP {\n          description\n            \"Ready to pass packets.\";\n        }\n        enum DOWN {\n          description\n            \"Not ready to pass packets and not in some test mode.\";\n        }\n        enum TESTING {\n          //TODO: This is generally not supported as a configured\n          //admin state, though it's in the standard interfaces MIB.\n          //Consider removing it.\n          description\n            \"In some test mode.\";\n        }\n      }\n      //TODO:consider converting to an identity to have the\n      //flexibility to remove some values defined by RFC 7223 that\n      //are not used or not implemented consistently.\n      mandatory true;\n      description\n        \"The desired state of the interface.  In RFC 7223 this leaf\n        has the same read semantics as ifAdminStatus.  Here, it\n        reflects the administrative state as set by enabling or\n        disabling the interface.\";\n      reference\n        \"RFC 2863: The Interfaces Group MIB - ifAdminStatus\";\n    }\n\n    leaf oper-status {\n      type enumeration {\n        enum UP {\n          value 1;\n          description\n            \"Ready to pass packets.\";\n        }\n        enum DOWN {\n          value 2;\n          description\n            \"The interface does not pass any packets.\";\n        }\n        enum TESTING {\n          value 3;\n          description\n            \"In some test mode.  No operational packets can\n             be passed.\";\n        }\n        enum UNKNOWN {\n          value 4;\n          description\n            \"Status cannot be determined for some reason.\";\n        }\n        enum DORMANT {\n          value 5;\n          description\n            \"Waiting for some external event.\";\n        }\n        enum NOT_PRESENT {\n          value 6;\n          description\n            \"Some component (typically hardware) is missing.\";\n        }\n        enum LOWER_LAYER_DOWN {\n          value 7;\n          description\n            \"Down due to state of lower-layer interface(s).\";\n        }\n      }\n      //TODO:consider converting to an identity to have the\n      //flexibility to remove some values defined by RFC 7223 that\n      //are not used or not implemented consistently.\n      mandatory true;\n      description\n        \"The current operational state of the interface.\n\n         This leaf has the same semantics as ifOperStatus.\";\n      reference\n        \"RFC 2863: The Interfaces Group MIB - ifOperStatus\";\n    }\n\n    leaf last-change {\n      type oc-types:timeticks64;\n      units nanoseconds;\n      description\n        \"This timestamp indicates the absolute time of the last\n        state change of the interface (e.g., up-to-down transition).\n        This is different than the SNMP ifLastChange object in the\n        standard interface MIB in that it is not relative to the\n        system boot time (i.e,. sysUpTime).\n\n        The value is the timestamp in nanoseconds relative to\n        the Unix Epoch (Jan 1, 1970 00:00:00 UTC).\";\n    }\n\n    leaf logical {\n      type boolean;\n      description\n        \"When set to true, the interface is a logical interface\n        which does not have an associated physical port or\n        channel on the system.\";\n    }\n\n    leaf management {\n      type boolean;\n      description\n        \"When set to true, the interface is a dedicated\n        management interface that is not connected to dataplane\n        interfaces.  It may be used to connect the system to an\n        out-of-band management network, for example.\";\n    }\n\n    leaf cpu {\n      type boolean;\n      description\n        \"When set to true, the interface is for traffic\n        that is handled by the system CPU, sometimes also called the\n        control plane interface.  On systems that represent the CPU\n        interface as an Ethernet interface, for example, this leaf\n        should be used to distinguish the CPU interface from dataplane\n        interfaces.\";\n    }\n  }\n\n  grouping interface-counters-state {\n    description\n      \"Operational state representing interface counters\n      and statistics.  Some of these are adapted from RFC 7223\";\n\n    container counters {\n      description\n        \"A collection of interface-related statistics objects.\";\n\n      leaf in-octets {\n        type oc-yang:counter64;\n        description\n          \"The total number of octets received on the interface,\n          including framing characters.\n\n          Discontinuities in the value of this counter can occur\n          at re-initialization of the management system, and at\n          other times as indicated by the value of\n          'discontinuity-time'.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifHCInOctets\";\n      }\n\n      leaf in-pkts {\n        type oc-yang:counter64;\n        description\n          \"The total number of packets received on the interface,\n          including all unicast, multicast, broadcast and bad packets\n          etc.\";\n        reference\n          \"RFC 2819: Remote Network Monitoring Management Information\n          Base - etherStatsPkts\";\n      }\n\n      leaf in-unicast-pkts {\n        type oc-yang:counter64;\n        description\n          \"The number of packets, delivered by this sub-layer to a\n          higher (sub-)layer, that were not addressed to a\n          multicast or broadcast address at this sub-layer.\n\n          Discontinuities in the value of this counter can occur\n          at re-initialization of the management system, and at\n          other times as indicated by the value of\n          'discontinuity-time'.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifHCInUcastPkts\";\n      }\n\n      leaf in-broadcast-pkts {\n        type oc-yang:counter64;\n        description\n          \"The number of packets, delivered by this sub-layer to a\n          higher (sub-)layer, that were addressed to a broadcast\n          address at this sub-layer.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB -\n          ifHCInBroadcastPkts\";\n      }\n\n      leaf in-multicast-pkts {\n        type oc-yang:counter64;\n        description\n          \"The number of packets, delivered by this sub-layer to a\n          higher (sub-)layer, that were addressed to a multicast\n          address at this sub-layer.  For a MAC-layer protocol,\n          this includes both Group and Functional addresses.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB -\n          ifHCInMulticastPkts\";\n      }\n\n      leaf in-errors {\n        type oc-yang:counter64;\n        description\n          \"For packet-oriented interfaces, the number of inbound\n          packets that contained errors preventing them from being\n          deliverable to a higher-layer protocol.  For character-\n          oriented or fixed-length interfaces, the number of\n          inbound transmission units that contained errors\n          preventing them from being deliverable to a higher-layer\n          protocol.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifInErrors\";\n      }\n\n      leaf in-discards {\n        type oc-yang:counter64;\n        description\n          \"The number of inbound packets that were chosen to be\n          discarded even though no errors had been detected to\n          prevent their being deliverable to a higher-layer\n          protocol.  One possible reason for discarding such a\n          packet could be to free up buffer space.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifInDiscards\";\n      }\n\n      leaf out-octets {\n        type oc-yang:counter64;\n        description\n          \"The total number of octets transmitted out of the\n          interface, including framing characters.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifHCOutOctets\";\n      }\n\n      leaf out-pkts {\n        type oc-yang:counter64;\n        description\n          \"The total number of packets transmitted out of the\n          interface, including all unicast, multicast, broadcast,\n          and bad packets etc.\";\n        reference\n          \"RFC 2819: Remote Network Monitoring Management Information\n          Base - etherStatsPkts\";\n      }\n\n      leaf out-unicast-pkts {\n        type oc-yang:counter64;\n        description\n          \"The total number of packets that higher-level protocols\n          requested be transmitted, and that were not addressed\n          to a multicast or broadcast address at this sub-layer,\n          including those that were discarded or not sent.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifHCOutUcastPkts\";\n      }\n\n      leaf out-broadcast-pkts {\n        type oc-yang:counter64;\n        description\n          \"The total number of packets that higher-level protocols\n          requested be transmitted, and that were addressed to a\n          broadcast address at this sub-layer, including those\n          that were discarded or not sent.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB -\n          ifHCOutBroadcastPkts\";\n      }\n\n      leaf out-multicast-pkts {\n        type oc-yang:counter64;\n        description\n          \"The total number of packets that higher-level protocols\n          requested be transmitted, and that were addressed to a\n          multicast address at this sub-layer, including those\n          that were discarded or not sent.  For a MAC-layer\n          protocol, this includes both Group and Functional\n          addresses.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB -\n          ifHCOutMulticastPkts\";\n      }\n\n      leaf out-discards {\n        type oc-yang:counter64;\n        description\n          \"The number of outbound packets that were chosen to be\n          discarded even though no errors had been detected to\n          prevent their being transmitted.  One possible reason\n          for discarding such a packet could be to free up buffer\n          space.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifOutDiscards\";\n      }\n\n      leaf out-errors {\n        type oc-yang:counter64;\n        description\n          \"For packet-oriented interfaces, the number of outbound\n          packets that could not be transmitted because of errors.\n          For character-oriented or fixed-length interfaces, the\n          number of outbound transmission units that could not be\n          transmitted because of errors.\";\n        reference\n          \"RFC 2863: The Interfaces Group MIB - ifOutErrors\";\n      }\n\n      leaf last-clear {\n        type oc-types:timeticks64;\n        description\n          \"Timestamp of the last time the interface counters were\n          cleared.\n\n          The value is the timestamp in nanoseconds relative to\n          the Unix Epoch (Jan 1, 1970 00:00:00 UTC).\";\n      }\n\n      leaf carrier-transitions {\n        type oc-yang:counter64;\n        status deprecated;\n        description\n          \"Number of times the interface state has transitioned\n          between up and down since the time the device restarted\n          or the last-clear time, whichever is most recent.\";\n      }\n    }\n  }\n\n  // data definition statements\n\n  grouping subinterfaces-top {\n    description\n      \"Subinterface data for logical interfaces associated with a\n      given interface\";\n\n    container subinterfaces {\n      description\n        \"Enclosing container for the list of subinterfaces associated\n        with a physical interface\";\n\n      list subinterface {\n        key \"index\";\n\n        description\n          \"The list of subinterfaces (logical interfaces) associated\n          with a physical interface\";\n\n        leaf index {\n          type leafref {\n            path \"../config/index\";\n          }\n          description\n            \"The index number of the subinterface -- used to address\n            the logical interface\";\n        }\n\n        container config {\n          description\n            \"Configurable items at the subinterface level\";\n\n          leaf index {\n            type uint32;\n            default 0;\n            description\n              \"The index of the subinterface, or logical interface number.\n              On systems with no support for subinterfaces, or not using\n              subinterfaces, this value should default to 0, i.e., the\n              default subinterface.\";\n          }\n\n          uses interface-common-config;\n        }\n\n        container state {\n\n          config false;\n          description\n            \"Operational state data for logical interfaces\";\n\n          leaf index {\n            type uint32;\n            default 0;\n            description\n              \"The index of the subinterface, or logical interface number.\n              On systems with no support for subinterfaces, or not using\n              subinterfaces, this value should default to 0, i.e., the\n              default subinterface.\";\n          }\n\n          uses interface-common-config;\n          uses interface-common-state;\n          uses interface-counters-state;\n        }\n      }\n    }\n  }\n\n  grouping interfaces-top {\n    description\n      \"Top-level grouping for interface configuration and\n      operational state data\";\n\n    container interfaces {\n      description\n        \"Top level container for interfaces, including configuration\n        and state data.\";\n\n      list interface {\n        key \"name\";\n\n        description\n          \"The list of named interfaces on the device.\";\n\n        leaf name {\n          type leafref {\n            path \"../config/name\";\n          }\n          description\n            \"References the configured name of the interface\";\n        }\n\n        container config {\n          description\n            \"Configurable items at the global, physical interface\n            level\";\n\n          uses interface-phys-config;\n        }\n\n        container state {\n\n          config false;\n          description\n            \"Operational state data at the global interface level\";\n\n          uses interface-phys-config;\n          uses interface-common-state;\n          uses interface-counters-state;\n        }\n\n        uses subinterfaces-top;\n      }\n    }\n  }\n\n  uses interfaces-top;\n}\n",
  "openconfig-extensions.yang": "module openconfig-extensions {\n\n  yang-version \"1\";\n\n  // namespace\n  namespace \"http://openconfig.net/yang/openconfig-ext\";\n\n  prefix \"oc-ext\";\n\n  // meta\n  organization \"OpenConfig working group\";\n\n  contact\n    \"OpenConfig working group\n    www.openconfig.net\";\n\n  description\n    \"This module provides extensions to the YANG language to allow\n    OpenConfig specific functionality and meta-data to be defined.\n    Lab copy, trimmed.\";\n\n  revision \"2022-10-05\" {\n    description\n      \"Add tag extension.\";\n    reference \"0.5.1\";\n  }\n\n  extension openconfig-version {\n    argument \"semver\" {\n      yin-element false;\n    }\n    description\n      \"The OpenConfig version number for the module. This is\n      expressed as a semantic version number of the form:\n        x.y.z\";\n  }\n\n  extension openconfig-hashed-value {\n    description\n      \"This extension provides an annotation on schema nodes to\n      indicate that the corresponding value should be stored and\n      reported in hashed form.\";\n  }\n\n  extension regexp-posix {\n    description\n      \"This extension indicates that the regular expressions included\n      within the YANG module specified are conformant with the POSIX\n      regular expression format rather than the W3C standard that is\n      specified by RFC6020 and RFC7950.\";\n  }\n\n  extension catalog-organization {\n    argument \"org\" {\n      yin-element false;\n    }\n    description\n      \"This extension specifies the organization name that should be\n      used within the module catalogue on the device for the specified\n      YANG module.\";\n  }\n\n  extension origin {\n    argument \"origin\" {\n      yin-element false;\n    }\n    description\n      \"This extension specifies the origin that the YANG module\n      corresponds to, as described in the openconfig-origin\n      module.\";\n  }\n\n  extension telemetry-on-change {\n    description\n      \"The telemetry-on-change annotation is specified in the context\n      of a particular subtree (container, or list) or leaf within the\n      YANG schema. Where specified, the value indicates that the leaf\n      should be exported when it changes, rather than at a periodic\n      interval.\";\n  }\n\n  extension tag {\n    argument \"tag\" {\n      yin-element false;\n    }\n    description\n      \"This extension specifies a tag that can be used to\n      categorise the YANG module. Multiple tags may be specified.\";\n  }\n}\n",
  "openconfig-yang-types.yang": "module openconfig-yang-types {\n\n  yang-version \"1\";\n\n  namespace \"http://openconfig.net/yang/types/yang\";\n  prefix \"oc-yang\";\n\n  import openconfig-extensions { prefix \"oc-ext\"; }\n\n  organization\n    \"OpenConfig working group\";\n\n  contact\n    \"OpenConfig working group\n    www.openconfig.net\";\n\n  description\n    \"This module contains a set of extension types to the\n    YANG builtin types that are used across multiple\n    OpenConfig models. Lab copy, trimmed.\";\n\n  oc-ext:openconfig-version \"1.0.0\";\n\n  revision \"2024-05-30\" {\n    description\n      \"Clarify the counter type behaviour on reset.\";\n    reference \"1.0.0\";\n  }\n\n  typedef counter32 {\n    type uint32;\n    description\n      \"A 32-bit counter. A counter value is a monotonically increasing\n      value which is used to express a count of a number of\n      occurrences of a particular event or entity.\";\n  }\n\n  typedef counter64 {\n    type uint64;\n    description\n      \"A 64-bit counter. A counter value is a monotonically increasing\n      value which is used to express a count of a number of\n      occurrences of a particular event or entity. When a counter64\n      reaches its maximum value, it wraps around to 0.\";\n  }\n\n  typedef date-and-time {\n    type string {\n      pattern '[0-9]{4}\\-(0[1-9]|1[0-2])\\-(0[1-9]|[12][0-9]|3[01])T'\n            + '(0[0-9]|1[0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])(\\.[0-9]+)?'\n            + '(Z|(\\+|-)(0[0-9]|1[0-9]|2[0-3]):(0[0-9]|[1-5][0-9]))';\n    }\n    description\n      \"A date and time, expressed in the format described in RFC3339.\";\n    reference\n      \"RFC 3339 - Date and Time on the Internet: Timestamps\";\n  }\n\n  typedef mac-address {\n    type string {\n      pattern '[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5}';\n    }\n    description\n      \"An IEEE 802 MAC address.\";\n  }\n}\n",
  "openconfig-types.yang": "module openconfig-types {\n  yang-version \"1\";\n\n  namespace \"http://openconfig.net/yang/openconfig-types\";\n\n  prefix \"oc-types\";\n\n  import openconfig-extensions { prefix oc-ext; }\n\n  organization \"OpenConfig working group\";\n\n  contact\n    \"OpenConfig working group\n    netopenconfig@googlegroups.com\";\n\n  description\n    \"This module contains a set of general type definitions that\n    are used across OpenConfig models. Lab copy, trimmed.\";\n\n  oc-ext:openconfig-version \"1.0.0\";\n\n  revision \"2024-01-31\" {\n    description\n      \"Add decimal64 type for precision counters.\";\n    reference \"1.0.0\";\n  }\n\n  typedef percentage {\n    type uint8 {\n      range \"0..100\";\n    }\n    description\n      \"Integer indicating a percentage value\";\n  }\n\n  typedef timeticks64 {\n    type uint64;\n    units \"nanoseconds\";\n    description\n      \"The timeticks64 represents the time, modulo 2^64 in\n      nanoseconds between two epochs. The leaf using this\n      type must define the epochs that tests are relative to.\";\n  }\n\n  typedef ieeefloat32 {\n    type binary {\n      length \"4\";\n    }\n    description\n      \"An IEEE 32-bit floating point number. The format of this number\n      is of the form:\n        1-bit  sign\n        8-bit  exponent\n        23-bit fraction\";\n  }\n}\n",
  "Cisco-IOS-XE-native.yang": "module Cisco-IOS-XE-native {\n  namespace \"http://cisco.com/ns/yang/Cisco-IOS-XE-native\";\n  prefix ios;\n\n  import ietf-inet-types {\n    prefix inet;\n  }\n\n  organization\n    \"Cisco Systems, Inc.\";\n\n  contact\n    \"Cisco Systems, Inc.\n     Customer Service\n\n     Postal: 170 W Tasman Drive\n     San Jose, CA 95134\n\n     Tel: +1 1800 553-NETS\n\n     E-mail: cs-yang@cisco.com\";\n\n  description\n    \"Cisco XE Native Common Module. This is a lab excerpt. The\n     real module is tens of thousands of lines and is split across\n     many augmenting modules such as Cisco-IOS-XE-bgp,\n     Cisco-IOS-XE-vlan and Cisco-IOS-XE-ntp. Here the parts that the\n     lab devices support are folded into one file so that pyang -f\n     tree shows the whole native subtree the simulator understands.\n     Copyright (c) 2016-2023 by Cisco Systems, Inc.\n     All rights reserved.\";\n\n  revision 2023-07-01 {\n    description\n      \"Lab excerpt based on the 17.9 native model\";\n  }\n\n  typedef interface-name {\n    type string {\n      pattern \"(GigabitEthernet|TenGigabitEthernet|Loopback|Vlan|Tunnel|Port-channel)[0-9/.]+\";\n    }\n    description\n      \"Interface name with the type spelled out, for example GigabitEthernet1\";\n  }\n\n  grouping ip-address-config {\n    description\n      \"ip address A.B.C.D M.M.M.M\";\n    container address {\n      description\n        \"Set the IP address of an interface\";\n      container primary {\n        description\n          \"Primary IP address\";\n        leaf address {\n          type inet:ipv4-address;\n          description\n            \"IP address\";\n        }\n        leaf mask {\n          type inet:ipv4-address;\n          description\n            \"IP subnet mask\";\n        }\n      }\n      list secondary {\n        key \"address\";\n        description\n          \"Secondary IP addresses\";\n        leaf address {\n          type inet:ipv4-address;\n        }\n        leaf mask {\n          type inet:ipv4-address;\n        }\n        leaf secondary {\n          type empty;\n        }\n      }\n    }\n  }\n\n  grouping interface-common {\n    description\n      \"Statements that every interface type shares\";\n    leaf description {\n      type string {\n        length \"1..200\";\n      }\n      description\n        \"Interface specific description\";\n    }\n    leaf shutdown {\n      type empty;\n      description\n        \"Shutdown the selected interface\";\n    }\n    container ip {\n      description\n        \"Interface Internet Protocol config commands\";\n      uses ip-address-config;\n    }\n  }\n\n  container native {\n    description\n      \"The native container holds every IOS configuration command\";\n\n    leaf version {\n      type string;\n      description\n        \"IOS version string, for example 17.9\";\n    }\n\n    leaf hostname {\n      type string;\n      description\n        \"Set system's network name\";\n    }\n\n    list username {\n      key \"name\";\n      description\n        \"Establish User Name Authentication\";\n      leaf name {\n        type string;\n      }\n      leaf privilege {\n        type uint8 {\n          range \"0..15\";\n        }\n        description\n          \"Set user privilege level\";\n      }\n      container secret {\n        description\n          \"Specify the secret for the user\";\n        leaf encryption {\n          type enumeration {\n            enum \"0\";\n            enum \"5\";\n            enum \"8\";\n            enum \"9\";\n          }\n        }\n        leaf secret {\n          type string;\n        }\n      }\n    }\n\n    container interface {\n      description\n        \"Configure an interface\";\n      list GigabitEthernet {\n        key \"name\";\n        description\n          \"GigabitEthernet IEEE 802.3z\";\n        leaf name {\n          type string {\n            pattern \"[0-9]+(/[0-9]+)*(\\\\.[0-9]+)?\";\n          }\n          description\n            \"Interface number, for example 2 for GigabitEthernet2\";\n        }\n        uses interface-common;\n        container negotiation {\n          description\n            \"Select autonegotiation mode\";\n          leaf auto {\n            type boolean;\n          }\n        }\n      }\n      list Loopback {\n        key \"name\";\n        description\n          \"Loopback interface\";\n        leaf name {\n          type uint32;\n        }\n        uses interface-common;\n      }\n    }\n\n    container vlan {\n      description\n        \"Vlan commands\";\n      list vlan-list {\n        key \"id\";\n        description\n          \"ISL VLAN IDs 1-4094\";\n        leaf id {\n          type uint16 {\n            range \"1..4094\";\n          }\n        }\n        leaf name {\n          type string {\n            length \"1..32\";\n          }\n          description\n            \"Ascii name of the VLAN\";\n        }\n      }\n    }\n\n    container router {\n      description\n        \"Enable a routing process\";\n      list bgp {\n        key \"id\";\n        description\n          \"Border Gateway Protocol (BGP)\";\n        leaf id {\n          type inet:as-number;\n          description\n            \"Autonomous system number\";\n        }\n        container bgp {\n          description\n            \"BGP specific commands\";\n          leaf router-id {\n            type inet:ipv4-address;\n            description\n              \"Override configured router identifier\";\n          }\n          leaf log-neighbor-changes {\n            type boolean;\n            description\n              \"Log neighbor up/down and reset reason\";\n          }\n        }\n        list neighbor {\n          key \"id\";\n          description\n            \"Specify a neighbor router\";\n          leaf id {\n            type inet:ip-address;\n          }\n          leaf remote-as {\n            type inet:as-number;\n            description\n              \"Specify a BGP neighbor\";\n          }\n          leaf description {\n            type string {\n              length \"1..80\";\n            }\n            description\n              \"Neighbor specific description\";\n          }\n          leaf shutdown {\n            type empty;\n            description\n              \"Administratively shut down this neighbor\";\n          }\n        }\n      }\n    }\n\n    container ntp {\n      description\n        \"Configure NTP\";\n      container server {\n        description\n          \"Configure NTP server\";\n        list server-list {\n          key \"ip-address\";\n          leaf ip-address {\n            type inet:host;\n            description\n              \"IP address or hostname of the NTP server\";\n          }\n          leaf prefer {\n            type empty;\n            description\n              \"Prefer this peer when possible\";\n          }\n        }\n      }\n    }\n\n    container logging {\n      description\n        \"Modify message logging facilities\";\n      container host {\n        description\n          \"Set syslog server IP address and parameters\";\n        list ipv4-host-list {\n          key \"ipv4-host\";\n          leaf ipv4-host {\n            type inet:ipv4-address;\n          }\n        }\n      }\n    }\n\n    container banner {\n      description\n        \"Define a login banner\";\n      container motd {\n        description\n          \"Set Message of the Day banner\";\n        leaf banner {\n          type string;\n        }\n      }\n    }\n\n    container snmp-server {\n      description\n        \"Modify SNMP engine parameters\";\n      list community {\n        key \"name\";\n        description\n          \"Enable SNMP; set community string and access privs\";\n        leaf name {\n          type string;\n        }\n        leaf RO {\n          type empty;\n          description\n            \"Read-only access with this community string\";\n        }\n        leaf RW {\n          type empty;\n          description\n            \"Read-write access with this community string\";\n        }\n      }\n    }\n  }\n}\n",
  "lab-acl.yang": "module lab-acl {\n  yang-version 1.1;\n  namespace \"urn:lab:acl\";\n  prefix lacl;\n\n  import ietf-inet-types {\n    prefix inet;\n  }\n\n  organization\n    \"NetDevOps Lab\";\n\n  contact\n    \"burak@lab.local\";\n\n  description\n    \"Kucuk bir access list modeli. Lab icinde pyang ile okunur,\n     tree ciktisi incelenir ve gorevlerde yeni leaf ve list eklenir.\";\n\n  revision 2026-01-10 {\n    description\n      \"Ilk surum\";\n  }\n\n  typedef acl-action {\n    type enumeration {\n      enum permit {\n        description\n          \"Trafige izin ver\";\n      }\n      enum deny {\n        description\n          \"Trafigi dusur\";\n      }\n    }\n    description\n      \"Bir ACL satirinin eylemi\";\n  }\n\n  container acls {\n    description\n      \"Cihazdaki tum access list tanimlari\";\n\n    list acl {\n      key \"name\";\n      description\n        \"Tek bir access list\";\n\n      leaf name {\n        type string {\n          length \"1..64\";\n        }\n        description\n          \"ACL adi\";\n      }\n\n      leaf type {\n        type enumeration {\n          enum ipv4 {\n            description\n              \"IPv4 ACL\";\n          }\n          enum ipv6 {\n            description\n              \"IPv6 ACL\";\n          }\n        }\n        default ipv4;\n        description\n          \"ACL tipi\";\n      }\n\n      list entry {\n        key \"seq\";\n        ordered-by user;\n        description\n          \"ACL satiri, seq degerine gore islenir\";\n\n        leaf seq {\n          type uint16 {\n            range \"1..65535\";\n          }\n          description\n            \"Sira numarasi\";\n        }\n\n        leaf action {\n          type acl-action;\n          mandatory true;\n          description\n            \"permit ya da deny\";\n        }\n\n        choice source {\n          description\n            \"Kaynak secimi\";\n          case any {\n            leaf any {\n              type empty;\n              description\n                \"Herhangi bir kaynak\";\n            }\n          }\n          case prefix {\n            leaf src-prefix {\n              type inet:ipv4-prefix;\n              description\n                \"Kaynak prefix, ornek 10.0.0.0/24\";\n            }\n          }\n        }\n\n        leaf dst-prefix {\n          type inet:ipv4-prefix;\n          description\n            \"Hedef prefix, bos ise any\";\n        }\n\n        leaf protocol {\n          type enumeration {\n            enum ip;\n            enum tcp;\n            enum udp;\n            enum icmp;\n          }\n          default ip;\n          description\n            \"IP protokolu\";\n        }\n\n        leaf dst-port {\n          type inet:port-number;\n          description\n            \"Hedef port, sadece tcp ve udp icin\";\n        }\n\n        leaf log {\n          type empty;\n          description\n            \"Eslesmeleri logla\";\n        }\n\n        container statistics {\n          config false;\n          description\n            \"Salt okunur sayaclar\";\n          leaf matched-packets {\n            type uint64;\n            description\n              \"Eslesen paket sayisi\";\n          }\n          leaf matched-octets {\n            type uint64;\n            description\n              \"Eslesen byte sayisi\";\n          }\n        }\n      }\n    }\n  }\n\n  rpc clear-acl-counters {\n    description\n      \"Bir ACL'in sayaclarini sifirlar\";\n    input {\n      leaf acl-name {\n        type leafref {\n          path \"/lacl:acls/lacl:acl/lacl:name\";\n        }\n        mandatory true;\n        description\n          \"Sifirlanacak ACL\";\n      }\n    }\n    output {\n      leaf cleared-entries {\n        type uint32;\n        description\n          \"Sifirlanan satir sayisi\";\n      }\n    }\n  }\n}\n",
};
const SIMD_YANG_README = `NetDevOps Lab YANG modulleri

ietf-interfaces@2018-02-20.yang   RFC 8343, tam modul
ietf-ip.yang                      RFC 8344, kisaltilmis kopya
ietf-yang-types.yang              RFC 6991, kullanilan typedef'ler
ietf-inet-types.yang              RFC 6991, kullanilan typedef'ler
openconfig-interfaces.yang        OpenConfig, kisaltilmis kopya
openconfig-extensions.yang        OpenConfig yardimci modul
openconfig-yang-types.yang        OpenConfig yardimci modul
openconfig-types.yang             OpenConfig yardimci modul
Cisco-IOS-XE-native.yang          Cisco native modelinden lab alintisi
lab-acl.yang                      Lab'in kendi kucuk ACL modeli, gorevlerde genisletilir

Ornekler
  pyang -f tree ietf-interfaces@2018-02-20.yang
  pyang -f tree --tree-depth 3 openconfig-interfaces.yang
  pyang -p ~/yang -f tree ietf-ip.yang
  pyang --lint lab-acl.yang
  pyang -f yin lab-acl.yang | head -30
`;

/* ---------- kayit ---------- */
function simdFiles() {
  const files = [{ path: '/home/burak/yang', node: mkdir({}, 0o755, 'burak') }, { path: '/home/burak/netconf', node: mkdir({}, 0o755, 'burak') }];
  Object.entries(SIMD_YANG_FILES).forEach(([name, text]) => files.push({ path: '/home/burak/yang/' + name, node: mkfile(text, 0o644, 'burak') }));
  files.push({ path: '/home/burak/yang/README', node: mkfile(SIMD_YANG_README, 0o644, 'burak') });
  files.push({ path: '/home/burak/netconf/get-interfaces.xml', node: mkfile(`<rpc message-id="101" xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">\n  <get-config>\n    <source><running/></source>\n    <filter>\n      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">\n        <interface>\n          <name>GigabitEthernet2</name>\n        </interface>\n      </interfaces>\n    </filter>\n  </get-config>\n</rpc>\n]]>]]>\n`, 0o644, 'burak') });
  files.push({ path: '/home/burak/.ssh/known_hosts', node: mkfile('r1.lab,10.0.0.1 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDLabR1KeyR1KeyR1KeyR1KeyR1KeyR1KeyR1KeyR1KeyR1KeyR1Key\nr2.lab,10.0.0.2 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDLabR2KeyR2KeyR2KeyR2KeyR2KeyR2KeyR2KeyR2KeyR2KeyR2Key\n', 0o600, 'burak') });
  return files;
}
const SIMD_MANUAL = {
  gnmic: { d: 'gNMI istemcisi. Cihazin openconfig modellerinden veri ceker, yazar ve telemetry aboneligi acar. Lab cihazlari r1.lab ve r2.lab port 57400, kullanici admin, parola admin, sertifika olmadigi icin insecure bayragi gerekir', u: ['gnmic -a HOST:57400 -u admin -p admin --insecure capabilities', 'gnmic -a HOST:57400 -u admin -p admin --insecure get --path YOL [--encoding json_ietf] [--type config|state]', 'gnmic ... set --update-path YOL --update-value DEGER', 'gnmic ... set --replace-path YOL --replace-file dosya.json', 'gnmic ... set --delete YOL', 'gnmic ... subscribe --path YOL --mode once', 'gnmic ... subscribe --path YOL --mode stream --stream-mode sample --sample-interval 5s --max 3', 'gnmic ... subscribe --path YOL --mode stream --stream-mode on-change'], e: ['gnmic -a r1.lab:57400 -u admin -p admin --insecure capabilities', 'gnmic -a r1.lab:57400 -u admin -p admin --insecure get --path /interfaces/interface[name=GigabitEthernet2]/config/description', 'gnmic -a r1.lab:57400 -u admin -p admin --insecure get --path "/interfaces/interface[name=*]/state/oper-status"', 'gnmic -a r1.lab:57400 -u admin -p admin --insecure -e json_ietf set --update-path /interfaces/interface[name=GigabitEthernet2]/config/description --update-value "LINK TO R2"', 'gnmic -a r1.lab:57400 -u admin -p admin --insecure get --path /system/config/hostname', 'gnmic -a r1.lab:57400 -u admin -p admin --insecure subscribe --path /interfaces/interface[name=GigabitEthernet1]/state/counters --mode stream --stream-mode sample --sample-interval 5s --max 3'] },
  pyang: { d: 'YANG modul dogrulayici ve tree formatlayici. Modul dosyasini okur, import edilen modulleri arama yolunda bulur, hata ve uyarilari satir numarasiyla basar. Modeller ~/yang altinda', u: ['pyang modul.yang', 'pyang -f tree modul.yang', 'pyang -f tree --tree-depth N modul.yang', 'pyang -p ARAMA_YOLU -f tree modul.yang', 'pyang --lint modul.yang', 'pyang -f yin modul.yang'], e: ['pyang -f tree ~/yang/ietf-interfaces@2018-02-20.yang', 'pyang -f tree --tree-depth 3 ~/yang/openconfig-interfaces.yang', 'pyang -p ~/yang -f tree ~/yang/ietf-ip.yang', 'pyang --lint ~/yang/lab-acl.yang', 'cd ~/yang && pyang -f tree ietf-interfaces@2018-02-20.yang ietf-ip.yang'] },
  ssh: { d: 'Uzak makineye baglanir. Lab cihazlari r1.lab, 10.0.0.1, r2.lab ve 10.0.0.2 icin kullanici admin. Shell tek satirlik oldugu icin interaktif oturum yok, komutu argüman olarak ver. Port 830 ile netconf subsystem acilir, hello mesaji basilir, stdin ile rpc gonderilebilir', u: ['ssh KULLANICI@HOST "komut"', 'ssh -p 830 KULLANICI@HOST -s netconf', 'cat rpc.xml | ssh -p 830 KULLANICI@HOST -s netconf'], e: ['ssh admin@r1.lab "show ip interface brief"', 'ssh admin@10.0.0.1 show version', 'ssh admin@r1.lab "show running-config | section bgp"', 'ssh -p 830 admin@r1.lab -s netconf', 'cat ~/netconf/get-interfaces.xml | ssh -p 830 admin@r1.lab -s netconf'] },
  lab: { d: 'Lab yardimcisi. devices alt komutu cihazlari, adreslerini ve acik servisleri listeler, reset devices cihazlari baslangic durumuna dondurur', u: ['lab devices', 'lab reset devices'], e: ['lab devices', 'lab reset devices'] },
};
registerExt({
  files: simdFiles(),
  commands: { ssh: simdSsh, gnmic: simdGnmic, pyang: simdPyang, lab: simdLab },
  manual: SIMD_MANUAL,
  onReset: sh => { Object.values(LAB.devices).forEach(d => d.reset()); simdFiles().forEach(f => { if (!sh.node(f.path)) sh.install(f.path, f.node); }); },
});
/* COMMANDS.ssh sarmalandi, LAB_EXT oncelikli olsun diye yerlesik komut siliniyor */
delete COMMANDS.ssh;

/* ---------- Python shim'leri ---------- */
LAB.registerPy('ndlab_util.py', 'py/ndlab_util.py');
LAB.registerPy('ncclient/__init__.py', 'py/ncclient/__init__.py');
LAB.registerPy('ncclient/manager.py', 'py/ncclient/manager.py');
LAB.registerPy('ncclient/xml_.py', 'py/ncclient/xml_.py');
LAB.registerPy('ncclient/operations/__init__.py', 'py/ncclient/operations/__init__.py');
LAB.registerPy('ncclient/operations/rpc.py', 'py/ncclient/operations/rpc.py');
LAB.registerPy('ncclient/transport/__init__.py', 'py/ncclient/transport/__init__.py');
LAB.registerPy('ncclient/transport/errors.py', 'py/ncclient/transport/errors.py');
LAB.registerPy('pygnmi/__init__.py', 'py/pygnmi/__init__.py');
LAB.registerPy('pygnmi/client.py', 'py/pygnmi/client.py');
LAB.registerPy('netmiko/__init__.py', 'py/netmiko/__init__.py');
LAB.registerPy('netmiko/exceptions.py', 'py/netmiko/exceptions.py');
LAB.registerPy('netmiko/ssh_exception.py', 'py/netmiko/ssh_exception.py');
