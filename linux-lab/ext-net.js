'use strict';
/* Linux Lab network eklentisi. Prisma SD-WAN branch senaryosu.
   Host: linuxlab jump box, branch IST-BR-07, ION 1200 (192.168.1.1) arkasinda.
   eth0 192.168.1.42/24 LAN, eth1 192.168.2.1/24 OT VLAN (forward + NAT), eth2 192.168.100.5/24 DSL backup (table 100 dsl).
   Hub: ams-dc-hub01, subnet 10.50.0.0/16, tunnel MTU 1400. Tum ciktilar birbirine tutarli olacak sekilde tek yerden besleniyor. */

const NET_ION = '192.168.1.1';
const NET_ME = '192.168.1.42';
const NET_STATE = '/var/lib/lab-net/state';
const NET_MTU = 1400;

/* ---------- isim ve adres tablolari ---------- */

const NET_NAMES = {
  '192.168.1.1': 'ion-ist-br07', '192.168.1.42': 'linuxlab', '192.168.1.10': 'ist-pc-10',
  '192.168.2.1': 'linuxlab', '192.168.2.50': 'hmi-01', '192.168.2.51': 'plc-01', '192.168.100.1': 'dsl-modem',
  '10.50.0.10': 'erp.corp.lab', '10.50.0.20': 'files.corp.lab', '10.50.0.30': 'portal.corp.lab', '10.50.0.53': 'ns1.corp.lab', '10.50.0.25': 'mail.corp.lab',
  '10.255.0.1': 'ams-dc-hub01.sdwan', '203.0.113.10': 'vpn.partner.example', '203.0.113.20': 'ike.cloud-lab.example',
};
const NET_SERVICES = { 22: 'ssh', 53: 'domain', 80: 'http', 443: 'https', 8443: 'pcsync-https', 500: 'isakmp', 4500: 'ipsec-nat-t', 25: 'smtp', 502: 'mbap', 102: 'iso-tsap', 2222: '2222', 445: 'microsoft-ds' };

const NET_DNS = {
  'erp.corp.lab': { A: ['10.50.0.10'] },
  'files.corp.lab': { A: ['10.50.0.20'] },
  'portal.corp.lab': { A: ['10.50.0.30'] },
  'ns1.corp.lab': { A: ['10.50.0.53'] },
  'mail.corp.lab': { A: ['10.50.0.25'] },
  'corp.lab': { MX: ['10 mail.corp.lab.'], NS: ['ns1.corp.lab.'], SOA: ['ns1.corp.lab. hostmaster.corp.lab. 2026100901 3600 900 1209600 300'] },
  '10.0.50.10.in-addr.arpa': { PTR: ['erp.corp.lab.'] },
  '20.0.50.10.in-addr.arpa': { PTR: ['files.corp.lab.'] },
  '30.0.50.10.in-addr.arpa': { PTR: ['portal.corp.lab.'] },
};

/* host:port durumu. open, refused, timeout, unreach */
const NET_PORTS = {
  '10.50.0.10': { 8443: 'open' },
  '10.50.0.20': { 80: 'open', 443: 'open', 445: 'open' },
  '10.50.0.30': { 80: 'open', 443: 'open' },
  '10.50.0.53': { 53: 'open' },
  '10.50.0.25': { 25: 'open' },
  '192.168.1.1': { 53: 'open' },
  '192.168.2.50': { 102: 'open', 502: 'open' },
  '192.168.2.51': { 502: 'open' },
  '192.168.100.1': { 80: 'open' },
  '127.0.0.1': { 2222: 'open', 8000: 'open', 5432: 'open' },
};
const NET_DEAD = ['203.0.113.53', '192.168.1.99'];
const NET_NOARP = ['192.168.2.60'];

/* ---------- interface, route, neigh ---------- */

const NET_IFACES = [
  { i: 1, n: 'lo', f: '<LOOPBACK,UP,LOWER_UP>', mtu: 65536, q: 'noqueue', st: 'UNKNOWN', mode: 'DEFAULT', link: 'link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00', a: ['inet 127.0.0.1/8 scope host lo', 'inet6 ::1/128 scope host'], rx: [40221133, 180211, 0, 0, 0, 0], tx: [40221133, 180211, 0, 0, 0, 0] },
  { i: 2, n: 'eth0', f: '<BROADCAST,MULTICAST,UP,LOWER_UP>', mtu: 1500, q: 'fq_codel', st: 'UP', mode: 'DEFAULT', link: 'link/ether 52:54:00:12:34:56 brd ff:ff:ff:ff:ff:ff', a: ['inet 192.168.1.42/24 brd 192.168.1.255 scope global dynamic eth0', 'inet6 fe80::5054:ff:fe12:3456/64 scope link'], rx: [1834920113, 2210488, 0, 0, 0, 4412], tx: [902113870, 1744021, 0, 0, 0, 0] },
  { i: 3, n: 'eth1', f: '<BROADCAST,MULTICAST,UP,LOWER_UP>', mtu: 1500, q: 'fq_codel', st: 'UP', mode: 'DEFAULT', link: 'link/ether 52:54:00:12:34:57 brd ff:ff:ff:ff:ff:ff', a: ['inet 192.168.2.1/24 brd 192.168.2.255 scope global eth1', 'inet6 fe80::5054:ff:fe12:3457/64 scope link'], rx: [412330912, 981203, 1843, 12, 0, 220], tx: [288110334, 744102, 0, 0, 0, 2210] },
  { i: 4, n: 'eth2', f: '<BROADCAST,MULTICAST,UP,LOWER_UP>', mtu: 1492, q: 'fq_codel', st: 'UP', mode: 'DEFAULT', link: 'link/ether 52:54:00:12:34:58 brd ff:ff:ff:ff:ff:ff', a: ['inet 192.168.100.5/24 brd 192.168.100.255 scope global eth2', 'inet6 fe80::5054:ff:fe12:3458/64 scope link'], rx: [90211340, 120330, 0, 0, 0, 0], tx: [44120033, 98012, 0, 0, 0, 0] },
  { i: 5, n: 'docker0', f: '<NO-CARRIER,BROADCAST,MULTICAST,UP>', mtu: 1500, q: 'noqueue', st: 'DOWN', mode: 'DEFAULT', link: 'link/ether 02:42:ac:11:00:01 brd ff:ff:ff:ff:ff:ff', a: ['inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0'], rx: [0, 0, 0, 0, 0, 0], tx: [0, 0, 0, 0, 0, 0] },
  { i: 6, n: 'wg0', f: '<POINTOPOINT,NOARP,UP,LOWER_UP>', mtu: 1420, q: 'noqueue', st: 'UNKNOWN', mode: 'DEFAULT', link: 'link/none', a: ['inet 10.8.0.2/24 scope global wg0'], rx: [12033411, 44102, 0, 0, 0, 0], tx: [9011203, 40211, 0, 0, 0, 0] },
];

/* dst/len, via, dev, src, metin */
const NET_ROUTES = {
  main: [
    { d: '0.0.0.0', l: 0, via: '192.168.1.1', dev: 'eth0', src: '192.168.1.42', t: 'default via 192.168.1.1 dev eth0 proto dhcp src 192.168.1.42 metric 100' },
    { d: '10.8.0.0', l: 24, dev: 'wg0', src: '10.8.0.2', t: '10.8.0.0/24 dev wg0 proto kernel scope link src 10.8.0.2' },
    { d: '10.20.0.0', l: 16, via: '10.8.0.1', dev: 'wg0', src: '10.8.0.2', t: '10.20.0.0/16 via 10.8.0.1 dev wg0' },
    { d: '10.50.0.0', l: 16, via: '192.168.1.1', dev: 'eth0', src: '192.168.1.42', t: '10.50.0.0/16 via 192.168.1.1 dev eth0 proto static metric 50' },
    { d: '172.17.0.0', l: 16, dev: 'docker0', src: '172.17.0.1', t: '172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown' },
    { d: '192.168.1.0', l: 24, dev: 'eth0', src: '192.168.1.42', t: '192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.42 metric 100' },
    { d: '192.168.2.0', l: 24, dev: 'eth1', src: '192.168.2.1', t: '192.168.2.0/24 dev eth1 proto kernel scope link src 192.168.2.1' },
    { d: '192.168.100.0', l: 24, dev: 'eth2', src: '192.168.100.5', t: '192.168.100.0/24 dev eth2 proto kernel scope link src 192.168.100.5' },
  ],
  dsl: [
    { d: '0.0.0.0', l: 0, via: '192.168.100.1', dev: 'eth2', src: '192.168.100.5', t: 'default via 192.168.100.1 dev eth2' },
    { d: '192.168.100.0', l: 24, dev: 'eth2', src: '192.168.100.5', t: '192.168.100.0/24 dev eth2 scope link src 192.168.100.5' },
  ],
};
const NET_TABLES = { 100: 'dsl', dsl: 'dsl', main: 'main', 254: 'main' };
const NET_RULES = ['0:\tfrom all lookup local', '100:\tfrom 192.168.100.5 lookup dsl', '32766:\tfrom all lookup main', '32767:\tfrom all lookup default'];
const NET_LOCAL = ['127.0.0.1', '192.168.1.42', '192.168.2.1', '192.168.100.5', '172.17.0.1', '10.8.0.2'];

const NET_NEIGH = [
  { ip: '192.168.1.1', dev: 'eth0', mac: 'a4:91:b1:00:0a:01', st: 'REACHABLE' },
  { ip: '192.168.1.10', dev: 'eth0', mac: '3c:22:fb:7a:10:22', st: 'STALE' },
  { ip: '192.168.2.50', dev: 'eth1', mac: '00:1c:06:2a:51:0c', st: 'REACHABLE' },
  { ip: '192.168.2.51', dev: 'eth1', mac: '00:1c:06:2a:51:1f', st: 'STALE' },
  { ip: '192.168.2.60', dev: 'eth1', mac: null, st: 'FAILED' },
  { ip: '192.168.100.1', dev: 'eth2', mac: '00:1d:aa:5e:10:01', st: 'REACHABLE' },
];

/* ---------- sertifikalar ---------- */

const NET_CERTS = {
  ca: { subject: 'C = NL, O = ACME Corp, CN = ACME Corp Internal CA', issuer: 'C = NL, O = ACME Corp, CN = ACME Corp Internal CA', nb: 'Jan  1 00:00:00 2020 GMT', na: 'Dec 31 23:59:59 2035 GMT', serial: '01', san: null, fp: 'SHA1 Fingerprint=A1:0B:3C:9D:2E:44:5F:60:71:82:93:A4:B5:C6:D7:E8:F9:0A:1B:2C', pem: 'MIIDqzCCApOgAwIBAgIBATANBgkqhkiG9w0BAQsFADBFMQswCQYDVQQGEwJOTDEScaRoot' },
  erp: { subject: 'CN = erp.corp.lab, O = ACME Corp, C = NL', issuer: 'C = NL, O = ACME Corp, CN = ACME Corp Internal CA', nb: 'Oct  1 00:00:00 2025 GMT', na: 'Sep 30 23:59:59 2026 GMT', serial: '4A2B1C77', san: 'DNS:erp.corp.lab, DNS:erp', fp: 'SHA1 Fingerprint=4A:2B:1C:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77', pem: 'MIIDxzCCAq+gAwIBAgIESisc dzANBgkqhkiG9w0BAQsFADBFMQswCQYDVQQGEwJOTDErpSrv', hosts: ['erp.corp.lab', 'erp'] },
  files: { subject: 'CN = files-old.corp.lab, O = ACME Corp, C = NL', issuer: 'C = NL, O = ACME Corp, CN = ACME Corp Internal CA', nb: 'Mar 15 00:00:00 2026 GMT', na: 'Mar 14 23:59:59 2027 GMT', serial: '5B3C2D88', san: 'DNS:files-old.corp.lab, DNS:nas.corp.lab', fp: 'SHA1 Fingerprint=5B:3C:2D:88:19:2A:3B:4C:5D:6E:7F:80:91:A2:B3:C4:D5:E6:F7:08', pem: 'MIIDyTCCArGgAwIBAgIEWzwtiDANBgkqhkiG9w0BAQsFADBFMQswCQYDVQQGEwJOTDEFilesSrv', hosts: ['files-old.corp.lab', 'nas.corp.lab'] },
  portal: { subject: 'CN = portal.corp.lab, O = ACME Corp, C = NL', issuer: 'C = NL, O = ACME Corp, CN = ACME Corp Internal CA', nb: 'Jul  1 00:00:00 2026 GMT', na: 'Jun 30 23:59:59 2027 GMT', serial: '6C4D3E99', san: 'DNS:portal.corp.lab, DNS:portal', fp: 'SHA1 Fingerprint=6C:4D:3E:99:0A:1B:2C:3D:4E:5F:60:71:82:93:A4:B5:C6:D7:E8:F9', pem: 'MIIDyjCCArKgAwIBAgIEbE0+mTANBgkqhkiG9w0BAQsFADBFMQswCQYDVQQGEwJOTDEPortalSrv', hosts: ['portal.corp.lab', 'portal'] },
  google: { subject: 'CN = www.google.com', issuer: 'C = US, O = Google Trust Services, CN = WR2', nb: 'Sep 15 08:30:00 2026 GMT', na: 'Dec  8 08:29:59 2026 GMT', serial: '7D5E4FAA', san: 'DNS:www.google.com', fp: 'SHA1 Fingerprint=7D:5E:4F:AA:1B:2C:3D:4E:5F:60:71:82:93:A4:B5:C6:D7:E8:F9:0A', pem: 'MIIEhzCCBC2gAwIBAgIQfV5PqjANBgkqhkiG9w0BAQsFADA7MQswCQYDVQQGEwJVUzEGooglePub', hosts: ['www.google.com', 'google.com'] },
};
function netPem(id) {
  const c = NET_CERTS[id];
  const body = (c.pem + 'Q0FDRVJUIFNJTVVMQVRJT04gTGludXggTGFiIGJyYW5jaCBJU1QtQlItMDcgY2VydA').replace(/\s/g, '');
  const rows = [];
  for (let i = 0; i < body.length; i += 64) rows.push(body.slice(i, i + 64));
  return '-----BEGIN CERTIFICATE-----\n' + rows.join('\n') + '\n-----END CERTIFICATE-----\n';
}
function netCertByContent(data) {
  const flat = (data || '').replace(/\s/g, '');
  return Object.keys(NET_CERTS).find(k => flat.includes(NET_CERTS[k].pem.replace(/\s/g, ''))) || null;
}
/* host:port -> sertifika */
function netCertFor(host, port) {
  const ip = netResolve(host) || host;
  if (ip === '10.50.0.10' && port === '8443') return 'erp';
  if (ip === '10.50.0.20' && port === '443') return 'files';
  if (ip === '10.50.0.30' && port === '443') return 'portal';
  if (/google\.com$/.test(host) && port === '443') return 'google';
  return null;
}

/* ---------- capture'lar ---------- */

function netPkt(t, proto, src, sport, dst, dport, rest) { return { t, proto, src, sport, dst, dport, rest }; }
const NET_CAPS = {
  '/var/log/captures/files-mtu.pcap': { link: 'EN10MB (Ethernet)', pk: [
    netPkt('10:21:03.412311', 'tcp', '192.168.1.42', 51234, '10.50.0.20', 80, 'Flags [S], seq 2811594121, win 64240, options [mss 1460,sackOK,TS val 881220 ecr 0,nop,wscale 7], length 0'),
    netPkt('10:21:03.456820', 'tcp', '10.50.0.20', 80, '192.168.1.42', 51234, 'Flags [S.], seq 1049822731, ack 2811594122, win 65160, options [mss 1460,sackOK,TS val 3312 ecr 881220,nop,wscale 7], length 0'),
    netPkt('10:21:03.456901', 'tcp', '192.168.1.42', 51234, '10.50.0.20', 80, 'Flags [.], ack 1, win 502, options [nop,nop,TS val 881264 ecr 3312], length 0'),
    netPkt('10:21:03.457310', 'tcp', '192.168.1.42', 51234, '10.50.0.20', 80, 'Flags [P.], seq 1:201, ack 1, win 502, options [nop,nop,TS val 881264 ecr 3312], length 200: HTTP: POST /upload/q3-report.zip HTTP/1.1'),
    netPkt('10:21:03.501900', 'tcp', '10.50.0.20', 80, '192.168.1.42', 51234, 'Flags [.], ack 201, win 506, options [nop,nop,TS val 3356 ecr 881264], length 0'),
    netPkt('10:21:03.502210', 'tcp', '192.168.1.42', 51234, '10.50.0.20', 80, 'Flags [.], seq 201:1649, ack 1, win 502, options [nop,nop,TS val 881309 ecr 3356], length 1448: HTTP'),
    netPkt('10:21:03.502330', 'tcp', '192.168.1.42', 51234, '10.50.0.20', 80, 'Flags [.], seq 1649:3097, ack 1, win 502, options [nop,nop,TS val 881309 ecr 3356], length 1448: HTTP'),
    netPkt('10:21:03.710114', 'tcp', '192.168.1.42', 51234, '10.50.0.20', 80, 'Flags [.], seq 201:1649, ack 1, win 502, options [nop,nop,TS val 881517 ecr 3356], length 1448: HTTP'),
    netPkt('10:21:04.126902', 'tcp', '192.168.1.42', 51234, '10.50.0.20', 80, 'Flags [.], seq 201:1649, ack 1, win 502, options [nop,nop,TS val 881934 ecr 3356], length 1448: HTTP'),
    netPkt('10:21:04.958811', 'tcp', '192.168.1.42', 51234, '10.50.0.20', 80, 'Flags [.], seq 201:1649, ack 1, win 502, options [nop,nop,TS val 882766 ecr 3356], length 1448: HTTP'),
    netPkt('10:21:06.622903', 'tcp', '192.168.1.42', 51234, '10.50.0.20', 80, 'Flags [.], seq 201:1649, ack 1, win 502, options [nop,nop,TS val 884430 ecr 3356], length 1448: HTTP'),
    netPkt('10:21:09.950120', 'tcp', '192.168.1.42', 51234, '10.50.0.20', 80, 'Flags [.], seq 201:1649, ack 1, win 502, options [nop,nop,TS val 887757 ecr 3356], length 1448: HTTP'),
    netPkt('10:21:12.003310', 'tcp', '192.168.1.42', 51235, '10.50.0.20', 80, 'Flags [S], seq 3391001822, win 64240, options [mss 1460,sackOK,TS val 889810 ecr 0,nop,wscale 7], length 0'),
    netPkt('10:21:12.047411', 'tcp', '10.50.0.20', 80, '192.168.1.42', 51235, 'Flags [S.], seq 2201937104, ack 3391001823, win 65160, options [mss 1460,sackOK,TS val 11902 ecr 889810,nop,wscale 7], length 0'),
    netPkt('10:21:12.047500', 'tcp', '192.168.1.42', 51235, '10.50.0.20', 80, 'Flags [.], ack 1, win 502, options [nop,nop,TS val 889854 ecr 11902], length 0'),
    netPkt('10:21:12.047820', 'tcp', '192.168.1.42', 51235, '10.50.0.20', 80, 'Flags [P.], seq 1:521, ack 1, win 502, options [nop,nop,TS val 889854 ecr 11902], length 520: HTTP: POST /upload/small.txt HTTP/1.1'),
    netPkt('10:21:12.092001', 'tcp', '10.50.0.20', 80, '192.168.1.42', 51235, 'Flags [P.], seq 1:188, ack 521, win 506, options [nop,nop,TS val 11946 ecr 889854], length 187: HTTP: HTTP/1.1 201 Created'),
  ] },
  '/var/log/captures/dns.pcap': { link: 'EN10MB (Ethernet)', pk: [
    netPkt('09:14:02.101223', 'udp', '192.168.1.42', 41022, '192.168.1.1', 53, '51201+ A? portal.corp.lab. (33)'),
    netPkt('09:14:02.103501', 'udp', '192.168.1.1', 53, '192.168.1.42', 41022, '51201 1/0/0 A 10.50.0.30 (49)'),
    netPkt('09:14:05.220114', 'udp', '192.168.1.42', 58834, '203.0.113.53', 53, '9321+ A? erp.corp.lab. (30)'),
    netPkt('09:14:08.221030', 'udp', '192.168.1.42', 58834, '203.0.113.53', 53, '9321+ A? erp.corp.lab. (30)'),
    netPkt('09:14:10.004412', 'udp', '192.168.1.10', 52010, '192.168.1.1', 53, '2210+ A? erp.corp.lab. (30)'),
    netPkt('09:14:10.006900', 'udp', '192.168.1.1', 53, '192.168.1.10', 52010, '2210 1/0/0 A 10.50.0.10 (46)'),
    netPkt('09:14:11.222117', 'udp', '192.168.1.42', 58834, '203.0.113.53', 53, '9321+ A? erp.corp.lab. (30)'),
    netPkt('09:14:12.555001', 'udp', '192.168.1.42', 33109, '192.168.1.1', 53, '7742+ AAAA? files.corp.lab. (32)'),
    netPkt('09:14:12.557210', 'udp', '192.168.1.1', 53, '192.168.1.42', 33109, '7742 0/1/0 (87)'),
    netPkt('09:14:12.557500', 'udp', '192.168.1.42', 33109, '192.168.1.1', 53, '7743+ A? files.corp.lab. (32)'),
    netPkt('09:14:12.559800', 'udp', '192.168.1.1', 53, '192.168.1.42', 33109, '7743 1/0/0 A 10.50.0.20 (48)'),
    netPkt('09:14:20.880004', 'udp', '192.168.1.42', 44871, '192.168.1.1', 53, '6100+ A? paloaltonetworks.com. (38)'),
    netPkt('09:14:20.922310', 'udp', '192.168.1.1', 53, '192.168.1.42', 44871, '6100 1/0/0 A 34.107.151.202 (54)'),
  ] },
  '/var/log/captures/otlab-syn.pcap': { link: 'EN10MB (Ethernet)', pk: [
    netPkt('11:02:40.100211', 'arp', '192.168.2.50', 0, '192.168.2.1', 0, 'Request who-has 192.168.2.1 tell 192.168.2.50, length 46'),
    netPkt('11:02:40.100330', 'arp', '192.168.2.1', 0, '192.168.2.50', 0, 'Reply 192.168.2.1 is-at 52:54:00:12:34:57, length 28'),
    netPkt('11:02:40.101002', 'tcp', '192.168.2.50', 49210, '10.50.0.10', 8443, 'Flags [S], seq 1839920114, win 29200, options [mss 1460,sackOK,TS val 55120 ecr 0,nop,wscale 6], length 0'),
    netPkt('11:02:41.112310', 'tcp', '192.168.2.50', 49210, '10.50.0.10', 8443, 'Flags [S], seq 1839920114, win 29200, options [mss 1460,sackOK,TS val 56131 ecr 0,nop,wscale 6], length 0'),
    netPkt('11:02:42.004120', 'tcp', '192.168.2.50', 49188, '10.50.0.30', 443, 'Flags [P.], seq 7731:7812, ack 20011, win 501, options [nop,nop,TS val 57023 ecr 90412], length 81'),
    netPkt('11:02:42.049877', 'tcp', '10.50.0.30', 443, '192.168.2.50', 49188, 'Flags [.], ack 7812, win 506, options [nop,nop,TS val 90458 ecr 57023], length 0'),
    netPkt('11:02:43.128411', 'tcp', '192.168.2.50', 49210, '10.50.0.10', 8443, 'Flags [S], seq 1839920114, win 29200, options [mss 1460,sackOK,TS val 58147 ecr 0,nop,wscale 6], length 0'),
    netPkt('11:02:45.001209', 'icmp', '192.168.2.51', 0, '192.168.2.1', 0, 'echo request, id 1201, seq 1, length 64'),
    netPkt('11:02:45.001301', 'icmp', '192.168.2.1', 0, '192.168.2.51', 0, 'echo reply, id 1201, seq 1, length 64'),
    netPkt('11:02:47.160902', 'tcp', '192.168.2.50', 49210, '10.50.0.10', 8443, 'Flags [S], seq 1839920114, win 29200, options [mss 1460,sackOK,TS val 62180 ecr 0,nop,wscale 6], length 0'),
  ] },
};
const NET_LIVE = {
  eth0: [
    netPkt('11:30:01.004120', 'tcp', '192.168.1.10', 51000, '192.168.1.42', 2222, 'Flags [P.], seq 100:148, ack 1, win 501, length 48'),
    netPkt('11:30:01.004301', 'tcp', '192.168.1.42', 2222, '192.168.1.10', 51000, 'Flags [.], ack 148, win 506, length 0'),
    netPkt('11:30:01.220114', 'udp', '192.168.1.42', 40211, '192.168.1.1', 53, '1201+ A? portal.corp.lab. (33)'),
  ],
  eth1: [
    netPkt('11:30:02.100211', 'tcp', '192.168.2.50', 49188, '10.50.0.30', 443, 'Flags [P.], seq 1:82, ack 1, win 501, length 81'),
    netPkt('11:30:02.145877', 'tcp', '10.50.0.30', 443, '192.168.2.50', 49188, 'Flags [.], ack 82, win 506, length 0'),
    netPkt('11:30:03.001209', 'icmp', '192.168.2.51', 0, '192.168.2.1', 0, 'echo request, id 1202, seq 7, length 64'),
  ],
};

/* ---------- log metinleri ---------- */

const NET_ION_LOG = [
  '2026-10-09T22:00:01Z site=IST-BR-07 element=ion-ist-br07 sev=INFO code=NETWORK_VPNLINK_UP vpnlink="ion-ist-br07:DSL-2 <-> ams-dc-hub01:INET-1" info="secure fabric link up, path mtu=1400"',
  '2026-10-09T22:00:01Z site=IST-BR-07 element=ion-ist-br07 sev=INFO code=NETWORK_VPNLINK_UP vpnlink="ion-ist-br07:INET-1 <-> ams-dc-hub01:INET-1" info="secure fabric link up, path mtu=1400"',
  '2026-10-10T05:58:12Z site=IST-BR-07 element=ion-ist-br07 sev=CRITICAL code=NETWORK_VPNBFD_DOWN vpnlink="ion-ist-br07:INET-1 <-> ams-dc-hub01:INET-1" info="BFD session timeout, 3 consecutive misses"',
  '2026-10-10T05:58:14Z site=IST-BR-07 element=ion-ist-br07 sev=CRITICAL code=NETWORK_VPNLINK_DOWN vpnlink="ion-ist-br07:INET-1 <-> ams-dc-hub01:INET-1" info="secure fabric link down"',
  '2026-10-10T05:58:15Z site=IST-BR-07 element=ion-ist-br07 sev=INFO code=NETWORK_PATH_SWITCH app=erp-https from="INET-1 vpn" to="DSL-2 vpn" info="active path unavailable"',
  '2026-10-10T05:58:15Z site=IST-BR-07 element=ion-ist-br07 sev=INFO code=NETWORK_PATH_SWITCH app=file-transfer from="INET-1 vpn" to="DSL-2 vpn" info="active path unavailable"',
  '2026-10-10T06:03:41Z site=IST-BR-07 element=ion-ist-br07 sev=INFO code=NETWORK_VPNBFD_UP vpnlink="ion-ist-br07:INET-1 <-> ams-dc-hub01:INET-1" info="BFD session established"',
  '2026-10-10T06:03:42Z site=IST-BR-07 element=ion-ist-br07 sev=INFO code=NETWORK_VPNLINK_UP vpnlink="ion-ist-br07:INET-1 <-> ams-dc-hub01:INET-1" info="secure fabric link up, path mtu=1400"',
  '2026-10-10T06:03:43Z site=IST-BR-07 element=ion-ist-br07 sev=INFO code=NETWORK_PATH_SWITCH app=erp-https from="DSL-2 vpn" to="INET-1 vpn" info="preferred path restored"',
  '2026-10-10T06:03:43Z site=IST-BR-07 element=ion-ist-br07 sev=INFO code=NETWORK_PATH_SWITCH app=file-transfer from="DSL-2 vpn" to="INET-1 vpn" info="preferred path restored"',
  '2026-10-10T07:12:30Z site=IST-BR-07 element=ion-ist-br07 sev=MINOR code=NETWORK_VPNLINK_LATENCY_HIGH vpnlink="ion-ist-br07:DSL-2 <-> ams-dc-hub01:INET-1" info="latency 148 ms above threshold 120 ms"',
  '2026-10-10T07:13:30Z site=IST-BR-07 element=ion-ist-br07 sev=INFO code=NETWORK_VPNLINK_LATENCY_HIGH_CLEAR vpnlink="ion-ist-br07:DSL-2 <-> ams-dc-hub01:INET-1"',
].join('\n') + '\n';

const NET_SWAN_LOG = [
  'Oct 10 06:00:02 linuxlab systemd[1]: Starting strongSwan IPsec IKEv1/IKEv2 daemon using ipsec.conf...',
  'Oct 10 06:00:02 linuxlab charon[1210]: 00[DMN] Starting IKE charon daemon (strongSwan 5.9.13, Linux 6.8.0-45-generic, x86_64)',
  'Oct 10 06:00:02 linuxlab charon[1210]: 00[CFG] loaded IKE secret for %any 203.0.113.10',
  'Oct 10 06:00:02 linuxlab charon[1210]: 00[CFG] loaded IKE secret for %any 203.0.113.20',
  "Oct 10 06:00:02 linuxlab charon[1210]: 00[CFG] added configuration 'partner-ext'",
  "Oct 10 06:00:02 linuxlab charon[1210]: 00[CFG] added configuration 'cloud-lab'",
  'Oct 10 06:00:02 linuxlab systemd[1]: Started strongSwan IPsec IKEv1/IKEv2 daemon using ipsec.conf.',
  'Oct 10 06:00:03 linuxlab charon[1210]: 05[IKE] initiating IKE_SA partner-ext[1] to 203.0.113.10',
  'Oct 10 06:00:03 linuxlab charon[1210]: 05[NET] sending packet: from 192.168.1.42[500] to 203.0.113.10[500] (496 bytes)',
  'Oct 10 06:00:03 linuxlab charon[1210]: 06[NET] received packet: from 203.0.113.10[500] to 192.168.1.42[500] (472 bytes)',
  'Oct 10 06:00:03 linuxlab charon[1210]: 06[IKE] local host is behind NAT, sending keep alives',
  'Oct 10 06:00:03 linuxlab charon[1210]: 06[IKE] IKE_SA partner-ext[1] established between 192.168.1.42[branch-ist07.example.net]...203.0.113.10[vpn.partner.example]',
  'Oct 10 06:00:03 linuxlab charon[1210]: 06[IKE] CHILD_SA partner-ext{1} established with SPIs c1a2b3d4_i e5f6a7b8_o and TS 192.168.2.0/24 === 172.31.10.0/24',
  'Oct 10 06:00:04 linuxlab charon[1210]: 07[IKE] initiating IKE_SA cloud-lab[2] to 203.0.113.20',
  'Oct 10 06:00:04 linuxlab charon[1210]: 07[ENC] generating IKE_SA_INIT request 0 [ SA KE No N(NATD_S_IP) N(NATD_D_IP) N(FRAG_SUP) N(HASH_ALG) N(REDIR_SUP) ]',
  'Oct 10 06:00:04 linuxlab charon[1210]: 07[NET] sending packet: from 192.168.1.42[500] to 203.0.113.20[500] (464 bytes)',
  'Oct 10 06:00:04 linuxlab charon[1210]: 08[NET] received packet: from 203.0.113.20[500] to 192.168.1.42[500] (36 bytes)',
  'Oct 10 06:00:04 linuxlab charon[1210]: 08[ENC] parsed IKE_SA_INIT response 0 [ N(NO_PROP) ]',
  'Oct 10 06:00:04 linuxlab charon[1210]: 08[IKE] received NO_PROPOSAL_CHOSEN notify error',
  'Oct 10 06:00:04 linuxlab charon[1210]: 08[CFG] configured proposals: IKE:AES_CBC_128/HMAC_SHA1_96/PRF_HMAC_SHA1/MODP_1024',
  'Oct 10 06:00:04 linuxlab charon[1210]: 08[IKE] peer requires AES_GCM_16_256/PRF_HMAC_SHA2_256/ECP_256, see /opt/cloud-lab/onboarding.txt',
  'Oct 10 06:00:34 linuxlab charon[1210]: 09[IKE] initiating IKE_SA cloud-lab[3] to 203.0.113.20',
  'Oct 10 06:00:34 linuxlab charon[1210]: 10[IKE] received NO_PROPOSAL_CHOSEN notify error',
  'Oct 10 06:01:04 linuxlab charon[1210]: 11[IKE] initiating IKE_SA cloud-lab[4] to 203.0.113.20',
  'Oct 10 06:01:04 linuxlab charon[1210]: 12[IKE] received NO_PROPOSAL_CHOSEN notify error',
  'Oct 10 10:00:03 linuxlab charon[1210]: 13[IKE] sending DPD request',
  'Oct 10 10:00:03 linuxlab charon[1210]: 14[IKE] IKE_SA partner-ext[1] rekeying scheduled in 2 hours',
].join('\n') + '\n';

const NET_AGENT_LOG = [
  'Oct 10 09:14:05 linuxlab erp-agent[1402]: INFO  loading config /opt/erp-agent/agent.conf',
  'Oct 10 09:14:05 linuxlab erp-agent[1402]: INFO  using resolver 203.0.113.53 (config override, system resolver ignored)',
  'Oct 10 09:14:08 linuxlab erp-agent[1402]: WARN  resolve erp.corp.lab via 203.0.113.53 timed out (3000 ms), attempt 1/3',
  'Oct 10 09:14:11 linuxlab erp-agent[1402]: WARN  resolve erp.corp.lab via 203.0.113.53 timed out (3000 ms), attempt 2/3',
  'Oct 10 09:14:14 linuxlab erp-agent[1402]: WARN  resolve erp.corp.lab via 203.0.113.53 timed out (3000 ms), attempt 3/3',
  'Oct 10 09:14:14 linuxlab erp-agent[1402]: ERROR sync failed: could not resolve erp.corp.lab',
  'Oct 10 09:19:14 linuxlab erp-agent[1402]: ERROR sync failed: could not resolve erp.corp.lab',
].join('\n') + '\n';

const NET_DMESG = [
  '[    8.112044] igb 0000:03:00.0 eth0: igb: eth0 NIC Link is Up 1000 Mbps Full Duplex, Flow Control: RX/TX',
  '[    8.330912] igb 0000:03:00.1 eth1: igb: eth1 NIC Link is Up 100 Mbps Half Duplex, Flow Control: None',
  '[    8.551200] igb 0000:04:00.0 eth2: igb: eth2 NIC Link is Up 100 Mbps Full Duplex, Flow Control: RX/TX',
  '[   12.441000] eth0: link up, 1000Mbps, full-duplex',
  '[  302.118771] IPv4: ip_forward enabled by sysctl',
  '[ 3121.004120] eth1: late collision detected, check duplex setting on link partner',
  '[ 3488.220114] eth1: late collision detected, check duplex setting on link partner',
].join('\n') + '\n';

/* ---------- dosyalar ---------- */

function netFiles() {
  const f = (path, content, mode, owner) => ({ path, node: mkfile(content, mode === undefined ? 0o644 : mode, owner || 'root') });
  const pcapStub = name => 'ÔÃ²¡ pcap capture ' + name + ' (binary, tcpdump -r ile oku)\n';
  return [
    f('/etc/hosts', '127.0.0.1\tlocalhost\n127.0.1.1\tlinuxlab\n::1\tlocalhost ip6-localhost\n\n# branch IST-BR-07\n192.168.1.1\tion-ist-br07\n192.168.1.10\tist-pc-10\n192.168.2.50\thmi-01\n192.168.2.51\tplc-01\n192.168.100.1\tdsl-modem\n10.50.0.30\tportal.corp.lab portal\n'),
    f('/etc/resolv.conf', '# ION ist-br07 DNS service, corp.lab icin ns1.corp.lab (10.50.0.53) adresine forward eder\nnameserver 192.168.1.1\nsearch corp.lab\noptions timeout:2 attempts:2\n'),
    f('/etc/iproute2/rt_tables', '#\n# reserved values\n#\n255\tlocal\n254\tmain\n253\tdefault\n0\tunspec\n#\n# local\n#\n100\tdsl\n'),
    f('/etc/netplan/01-config.yaml', [
      'network:', '  version: 2', '  renderer: networkd', '  ethernets:',
      '    eth0:', '      dhcp4: true', '      dhcp4-overrides:', '        route-metric: 100', '      routes:', '        - to: 10.50.0.0/16', '          via: 192.168.1.1', '          metric: 50',
      '    eth1:', '      addresses: [192.168.2.1/24]', '      # OT VLAN, hmi-01 ve plc-01 buradan hub\'a NAT ile cikar',
      '    eth2:', '      addresses: [192.168.100.5/24]', '      mtu: 1492', '      routes:', '        - to: default', '          via: 192.168.100.1', '          table: 100',
      '      routing-policy:', '        - from: 192.168.100.5', '          table: 100', '',
    ].join('\n')),
    f('/etc/iptables/rules.v4', [
      '# Generated by iptables-save v1.8.10 on Thu Oct  9 23:41:12 2026', '# hardening 2026-10-09 ozan: ERP migration, remove HUB-BLOCK after cutover',
      '*filter', ':INPUT ACCEPT [0:0]', ':FORWARD ACCEPT [0:0]', ':OUTPUT ACCEPT [0:0]', ':HUB-BLOCK - [0:0]',
      '-A INPUT -i lo -j ACCEPT', '-A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT', '-A INPUT -p tcp -m tcp --dport 2222 -j ACCEPT',
      '-A INPUT -p udp -m udp --dport 500 -j ACCEPT', '-A INPUT -p udp -m udp --dport 4500 -j ACCEPT', '-A INPUT -p esp -j ACCEPT',
      '-A FORWARD -j HUB-BLOCK', '-A FORWARD -i eth1 -o eth0 -j ACCEPT', '-A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT',
      '-A OUTPUT -j HUB-BLOCK', '-A HUB-BLOCK -d 10.50.0.0/16 -p tcp -m tcp --dport 8443 -j DROP', 'COMMIT',
      '*nat', ':PREROUTING ACCEPT [0:0]', ':INPUT ACCEPT [0:0]', ':OUTPUT ACCEPT [0:0]', ':POSTROUTING ACCEPT [0:0]',
      '-A POSTROUTING -s 192.168.2.0/24 -o eth0 -j MASQUERADE', 'COMMIT', '# Completed on Thu Oct  9 23:41:12 2026', '',
    ].join('\n'), 0o600),
    f('/etc/ipsec.conf', [
      'config setup', '    charondebug="ike 1, cfg 1, net 1"', '', 'conn %default', '    keyexchange=ikev2', '    dpdaction=restart', '    dpddelay=30s', '    authby=secret', '',
      'conn partner-ext', '    left=192.168.1.42', '    leftid=@branch-ist07.example.net', '    leftsubnet=192.168.2.0/24', '    right=203.0.113.10', '    rightid=@vpn.partner.example', '    rightsubnet=172.31.10.0/24',
      '    ike=aes256gcm16-prfsha256-ecp256!', '    esp=aes256gcm16-ecp256!', '    auto=start', '',
      'conn cloud-lab', '    left=192.168.1.42', '    leftid=@branch-ist07.example.net', '    leftsubnet=192.168.2.0/24', '    right=203.0.113.20', '    rightsubnet=10.70.0.0/16',
      '    # 2019 template\'inden kopyalandi', '    ike=aes128-sha1-modp1024!', '    esp=aes128-sha1!', '    auto=start', '',
    ].join('\n')),
    f('/etc/ipsec.secrets', '192.168.1.42 203.0.113.10 : PSK "p4rtn3r-ext-2024"\n192.168.1.42 203.0.113.20 : PSK "cl0ud-lab-0nb0ard"\n', 0o600),
    f('/etc/sysctl.conf', '# branch jump box\nnet.ipv4.ip_forward=1\nnet.ipv4.conf.all.rp_filter=1\nnet.ipv4.tcp_mtu_probing=0\n'),
    f('/etc/ssl/certs/acme-internal-ca.pem', netPem('ca')),
    f('/opt/app/certs/erp.crt', netPem('erp')),
    f('/opt/app/certs/files.crt', netPem('files')),
    f('/opt/app/certs/portal.crt', netPem('portal')),
    f('/opt/app/certs/erp.key', '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7\n-----END PRIVATE KEY-----\n', 0o600),
    f('/opt/erp-agent/agent.conf', '# erp-agent configuration, branch IST-BR-07\nserver = erp.corp.lab\nport = 8443\ntls_verify = true\n# resolver override, MPLS doneminden kalan eski ISP DNS, SD-WAN cutover sonrasi kaldirilacak\nresolver = 203.0.113.53\nsync_interval = 300\n'),
    f('/opt/cloud-lab/onboarding.txt', 'cloud-lab IPsec onboarding\n==========================\nPeer: 203.0.113.20 (IKEv2 only)\nAccepted IKE proposal: aes256gcm16-prfsha256-ecp256\nAccepted ESP proposal: aes256gcm16-ecp256\nNot accepted: sha1, modp1024, 3des, aes-cbc without PFS\nRemote subnet: 10.70.0.0/16\n'),
    f('/var/log/sdwan/ion-events.log', NET_ION_LOG),
    f('/var/log/strongswan.log', NET_SWAN_LOG),
    f('/var/log/erp-agent.log', NET_AGENT_LOG),
    f('/var/log/captures/README.txt', 'Branch IST-BR-07 capture notlari\nfiles-mtu.pcap   linuxlab eth0, tcpdump -i eth0 host 10.50.0.20, buyuk upload donerken\ndns.pcap         linuxlab eth0, tcpdump -i eth0 port 53\notlab-syn.pcap   linuxlab eth1, tcpdump -i eth1 host 192.168.2.50, HMI ERP\'ye baglanamazken\n'),
    f('/var/log/captures/files-mtu.pcap', pcapStub('files-mtu')),
    f('/var/log/captures/dns.pcap', pcapStub('dns')),
    f('/var/log/captures/otlab-syn.pcap', pcapStub('otlab-syn')),
    f('/proc/sys/net/ipv4/ip_forward', '1\n'),
    f('/proc/sys/net/ipv4/tcp_mtu_probing', '0\n'),
    f('/proc/sys/net/ipv4/tcp_syn_retries', '6\n'),
    f('/proc/sys/net/ipv4/conf/all/rp_filter', '1\n'),
    f('/proc/sys/net/netfilter/nf_conntrack_max', '65536\n'),
    f('/proc/sys/net/core/rmem_max', '212992\n'),
    f(NET_STATE, 'hubblock=1\n', 0o600),
    f('/home/burak/tickets/TAC-48213.txt', [
      'Case: TAC-48213   Severity: 2   Site: IST-BR-07 (Istanbul branch)',
      'Opened: 2026-10-10 08:05 CEST by branch IT (ozan)',
      'Element: ion-ist-br07 (ION 1200)   Hub: ams-dc-hub01 (ION 3200)   Hub subnet: 10.50.0.0/16',
      '',
      'Symptom',
      '- 07:58 civari ERP ve file transfer koptu, bes dakika sonra kismen geldi',
      '- Jump box linuxlab uzerinden erp.corp.lab:8443 hala acilmiyor',
      '- files.corp.lab\'a buyuk upload\'lar donuyor, kucuk dosyalar gidiyor',
      '- erp-agent servisi "could not resolve" hatasi veriyor',
      '- OT VLAN\'daki hmi-01 (192.168.2.50) de ERP\'ye ulasamiyor',
      '',
      'Notes',
      '- Dun gece hardening script\'i kosuldu (ozan)',
      '- Yeni cloud-lab IPsec tunnel\'i hic kalkmadi',
      '',
      'Attachments: /var/log/sdwan/ion-events.log, /var/log/captures/',
      '',
    ].join('\n'), 0o644, 'burak'),
  ];
}

/* ---------- durum ---------- */

function netState(sh) {
  const n = sh.node(NET_STATE);
  const st = { hubblock: true };
  if (n && n.t === 'f') lines(n.d).forEach(l => { const [k, v] = l.split('='); if (k === 'hubblock') st.hubblock = v === '1'; });
  return st;
}
function netSetState(sh, st) {
  const n = sh.node(NET_STATE);
  const d = `hubblock=${st.hubblock ? 1 : 0}\n`;
  if (n && n.t === 'f') n.d = d; else sh.install(NET_STATE, mkfile(d, 0o600, 'root'));
}

/* ---------- cozumleme ---------- */

function netResolve(host, sh) {
  if (!host) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  if (host === 'localhost' || host === 'linuxlab') return '127.0.0.1';
  if (sh) {
    const hf = (sh.node('/etc/hosts') || { d: '' }).d;
    const hm = lines(hf).map(l => l.replace(/#.*/, '').trim().split(/\s+/)).find(p => p.slice(1).includes(host));
    if (hm) return hm[0];
  }
  const fq = NET_DNS[host] ? host : NET_DNS[host + '.corp.lab'] ? host + '.corp.lab' : null;
  if (fq && NET_DNS[fq].A) return NET_DNS[fq].A[0];
  const rev = Object.keys(NET_NAMES).find(ip => NET_NAMES[ip] === host);
  if (rev) return rev;
  const pub = { 'google.com': '142.250.179.206', 'www.google.com': '142.250.179.206', 'example.com': '93.184.215.14', 'github.com': '140.82.121.4', 'paloaltonetworks.com': '34.107.151.202' };
  if (pub[host]) return pub[host];
  if (host.endsWith('.local') || host.endsWith('.corp.lab')) return null;
  if (/\./.test(host)) return '93.184.215.14';
  return null;
}
function netIsHub(ip) { return /^10\.50\./.test(ip) || ip === '10.255.0.1'; }
function netPortState(sh, ip, port) {
  if (NET_NOARP.includes(ip)) return 'unreach';
  if (NET_DEAD.includes(ip)) return 'timeout';
  if (ip === '10.50.0.10' && port === 8443 && netState(sh).hubblock) return 'timeout';
  if (ip === '127.0.0.1' && port === 80) return sh.services.nginx === 'active' ? 'open' : 'refused';
  const t = NET_PORTS[ip];
  if (t) return t[port] || 'refused';
  if (/^(10\.50\.|192\.168\.(1|2|100)\.)/.test(ip)) return 'refused';
  if (ip === '10.255.0.1') return 'refused';
  return 'timeout';
}
function netIpToInt(ip) { return ip.split('.').reduce((a, b) => (a << 8) + Number(b), 0) >>> 0; }
function netInNet(ip, net, len) { if (!len) return true; const m = len === 32 ? 0xffffffff : (~0 << (32 - len)) >>> 0; return ((netIpToInt(ip) & m) >>> 0) === ((netIpToInt(net) & m) >>> 0); }
function netLookup(ip, table) {
  const rs = NET_ROUTES[table] || NET_ROUTES.main;
  let best = null;
  for (const r of rs) if (netInNet(ip, r.d, r.l) && (!best || r.l > best.l)) best = r;
  return best;
}
function netRtt(ip) {
  if (ip.startsWith('127.')) return 0.04;
  if (netIsHub(ip)) return 44;
  if (/^192\.168\.(1|2|100)\./.test(ip)) return 0.5;
  if (/^10\.(8|20)\./.test(ip)) return 9;
  return 11;
}
function netTtl(ip) { if (ip.startsWith('127.') || /^192\.168\./.test(ip)) return 64; if (netIsHub(ip)) return 61; return 117; }
function netJitter(base) { return +(base + Math.random() * base * 0.08).toFixed(base < 1 ? 3 : 1); }

/* ---------- ip ---------- */

const NET_OLD = { ip: COMMANDS.ip, ping: COMMANDS.ping, traceroute: COMMANDS.traceroute, dig: COMMANDS.dig, curl: COMMANDS.curl, journalctl: COMMANDS.journalctl, ss: COMMANDS.ss };

function netIpAddr(ifs, stats, brief) {
  if (brief) return ok(join(ifs.map(x => `${x.n.padEnd(16)}${x.st.padEnd(16)}${x.a.map(a => a.split(' ')[1]).join(' ')}`)));
  const out = [];
  for (const x of ifs) {
    out.push(`${x.i}: ${x.n}: ${x.f} mtu ${x.mtu} qdisc ${x.q} state ${x.st} group default qlen 1000`);
    out.push('    ' + x.link);
    x.a.forEach(a => out.push('    ' + a + (a.startsWith('inet6') ? '\n       valid_lft forever preferred_lft forever' : '')));
    if (stats) netStats(out, x);
  }
  return ok(join(out));
}
function netStats(out, x) {
  const row = a => a.map((v, i) => String(v).padStart(i === 0 ? 11 : 8)).join('');
  out.push('    RX:  bytes packets errors dropped  missed   mcast', '    ' + row(x.rx).slice(1), '    TX:  bytes packets errors dropped carrier collsns', '    ' + row(x.tx).slice(1));
}
function netIpLink(ifs, stats, brief) {
  if (brief) return ok(join(ifs.map(x => `${x.n.padEnd(16)}${x.st.padEnd(16)}${x.link.split(' ')[1] || ''} ${x.f}`)));
  const out = [];
  for (const x of ifs) {
    out.push(`${x.i}: ${x.n}: ${x.f} mtu ${x.mtu} qdisc ${x.q} state ${x.st} mode DEFAULT group default qlen 1000`, '    ' + x.link);
    if (stats) netStats(out, x);
  }
  return ok(join(out));
}
function netRouteGet(args) {
  const dst = args[0];
  const fi = args.indexOf('from');
  const from = fi >= 0 ? args[fi + 1] : null;
  if (!dst) return fail('Usage: ip route get ADDRESS [ from ADDRESS ]');
  const ip = netResolve(dst, this);
  if (!ip) return fail(`Error: any valid prefix is expected rather than "${dst}".`);
  if (NET_LOCAL.includes(ip)) return ok(`local ${ip} dev lo src ${ip} uid 1000 \n    cache <local> \n`);
  const table = from === '192.168.100.5' ? 'dsl' : 'main';
  const r = netLookup(ip, table);
  if (!r) return fail('RTNETLINK answers: Network is unreachable');
  let l = ip + (r.via ? ` via ${r.via}` : '') + ` dev ${r.dev}` + (table !== 'main' ? ` table ${table}` : '') + ` src ${from || r.src} uid 1000 `;
  return ok(l + '\n    cache \n');
}
COMMANDS.ip = function (args) {
  let stats = false; let brief = false;
  while (args.length && args[0].startsWith('-')) {
    const o = args.shift();
    if (o === '-s' || o === '-stats' || o === '-statistics') stats = true;
    else if (o === '-br' || o === '-brief') brief = true;
    else if (o === '-6') return ok('');
  }
  const sub = args[0] || '';
  const rest = args.slice(1);
  const devOf = a => { const i = a.findIndex(x => x === 'dev' || x === 'show' || x === 'list' || x === 'ls' || x === 's'); const cand = a.filter((x, k) => k > i && !['dev', 'show', 'list', 'ls', 's'].includes(x))[0]; return cand || (i < 0 ? a[0] : null); };
  if (['a', 'addr', 'address'].includes(sub)) {
    if (rest.some(x => ['add', 'del', 'flush'].includes(x))) return this.isRoot ? fail('ip: bu lab\'da adres değişikliği simüle edilmiyor, okuma komutlarına odaklan') : fail('RTNETLINK answers: Operation not permitted');
    const dev = devOf(rest);
    const ifs = dev ? NET_IFACES.filter(x => x.n === dev) : NET_IFACES;
    if (dev && !ifs.length) return fail(`Device "${dev}" does not exist.`);
    return netIpAddr(ifs, stats, brief);
  }
  if (['l', 'link'].includes(sub)) {
    if (rest[0] === 'set') return this.isRoot ? fail('ip: bu lab\'da link değişikliği simüle edilmiyor') : fail('RTNETLINK answers: Operation not permitted');
    const dev = devOf(rest);
    const ifs = dev ? NET_IFACES.filter(x => x.n === dev) : NET_IFACES;
    if (dev && !ifs.length) return fail(`Device "${dev}" does not exist.`);
    return netIpLink(ifs, stats, brief);
  }
  if (['r', 'ro', 'route'].includes(sub)) {
    if (rest[0] === 'get' || rest[0] === 'g') return netRouteGet.call(this, rest.slice(1));
    if (['add', 'del', 'delete', 'replace', 'flush', 'change'].includes(rest[0])) return this.isRoot ? fail('ip: bu lab\'da route değişikliği simüle edilmiyor') : fail('RTNETLINK answers: Operation not permitted');
    const ti = rest.indexOf('table');
    let table = 'main';
    if (ti >= 0) {
      const t = rest[ti + 1];
      if (t === 'all') return ok(join([...NET_ROUTES.main.map(r => r.t), ...NET_ROUTES.dsl.map(r => r.t + ' table dsl')]));
      if (t === 'local') return ok(join(NET_LOCAL.map(ip => `local ${ip} dev ${ip === '127.0.0.1' ? 'lo' : 'eth0'} proto kernel scope host src ${ip}`)));
      if (!NET_TABLES[t]) return fail(`Error: argument "${t}" is wrong: table id value is invalid`);
      table = NET_TABLES[t];
    }
    let rs = NET_ROUTES[table];
    const di = rest.indexOf('dev');
    if (di >= 0) rs = rs.filter(r => r.dev === rest[di + 1]);
    if (rest[0] && /^\d/.test(rest[0]) && !['show', 'list', 'ls'].includes(rest[0])) return fail(`Command "${rest[0]}" is unknown, try "ip route help".`);
    return ok(join(rs.map(r => r.t)));
  }
  if (['ru', 'rule'].includes(sub)) {
    if (['add', 'del', 'delete', 'flush'].includes(rest[0])) return this.isRoot ? fail('ip: bu lab\'da rule değişikliği simüle edilmiyor') : fail('RTNETLINK answers: Operation not permitted');
    return ok(join(NET_RULES));
  }
  if (['n', 'neigh', 'neighbour', 'neighbor'].includes(sub)) {
    if (['add', 'del', 'flush', 'replace'].includes(rest[0])) return this.isRoot ? fail('ip: bu lab\'da neighbour değişikliği simüle edilmiyor') : fail('RTNETLINK answers: Operation not permitted');
    const di = rest.indexOf('dev');
    const ns = di >= 0 ? NET_NEIGH.filter(n => n.dev === rest[di + 1]) : NET_NEIGH;
    return ok(join(ns.map(n => `${n.ip} dev ${n.dev} ${n.mac ? 'lladdr ' + n.mac + ' ' : ''}${n.st}`)));
  }
  if (sub === '-V' || sub === 'help' || sub === '') return ok('Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }\nwhere  OBJECT := { address | link | route | rule | neigh }\n       OPTIONS := { -s[tatistics] | -br[ief] }\n');
  return NET_OLD.ip.call(this, args);
};

/* ---------- ping, tracepath, traceroute, mtr ---------- */

COMMANDS.ping = function (args) {
  const { flags, vals, rest } = parseOpts(args, 'cWsMiwI');
  const host = rest[0];
  if (!host) return fail('ping: usage error: Destination address required', 2);
  const count = Math.min(parseInt(vals.c || '4', 10) || 4, 10);
  const size = vals.s !== undefined ? parseInt(vals.s, 10) : 56;
  const df = vals.M === 'do' || vals.M === 'probe';
  const ip = netResolve(host, this);
  if (!ip) return fail(`ping: ${host}: Name or service not known`, 2);
  const head = `PING ${host} (${ip}) ${size}(${size + 28}) bytes of data.`;
  const tail = (tx, rx, err) => ['', `--- ${host} ping statistics ---`, `${tx} packets transmitted, ${rx} received, ${err ? '+' + err + ' errors, ' : ''}${Math.round((tx - rx) / tx * 100)}% packet loss, time ${(tx - 1) * 1001 + 1}ms`];
  const out = [head];
  const r = netLookup(ip, 'main');
  const localMtu = (NET_IFACES.find(x => x.n === (r ? r.dev : 'eth0')) || { mtu: 1500 }).mtu;
  if (df && size + 28 > localMtu) return fail(`ping: local error: message too long, mtu=${localMtu}`, 1);
  if (df && netIsHub(ip) && size + 28 > NET_MTU) {
    for (let i = 1; i <= count; i++) out.push(`From ${NET_ION} icmp_seq=${i} Frag needed and DF set (mtu = ${NET_MTU})`);
    out.push(...tail(count, 0, count));
    return { out: join(out), err: '', code: 1 };
  }
  if (NET_NOARP.includes(ip)) {
    for (let i = 1; i <= count; i++) out.push(`From 192.168.2.1 icmp_seq=${i} Destination Host Unreachable`);
    out.push(...tail(count, 0, count));
    return { out: join(out), err: '', code: 1 };
  }
  if (NET_DEAD.includes(ip) || /^10\.99\./.test(ip)) { out.push(...tail(count, 0, 0)); return { out: join(out), err: '', code: 1 }; }
  const base = netRtt(ip); const times = [];
  for (let i = 1; i <= count; i++) { const t = netJitter(base); times.push(t); out.push(`${size + 8} bytes from ${ip}: icmp_seq=${i} ttl=${netTtl(ip)} time=${t} ms`); }
  const min = Math.min(...times), max = Math.max(...times), avg = times.reduce((a, b) => a + b, 0) / times.length;
  out.push(...tail(count, count, 0), `rtt min/avg/max/mdev = ${min.toFixed(3)}/${avg.toFixed(3)}/${max.toFixed(3)}/${(max - min).toFixed(3)} ms`);
  if (!vals.c) out.push('', "[Gerçek Linux'ta ping durmaz, Ctrl+C gerekir. Burada 4 paketle sınırlı. Bundan sonra -c kullan]");
  void flags;
  return ok(join(out));
};

function netHops(ip, sh) {
  const name = x => NET_NAMES[x] || x;
  if (netIsHub(ip)) return [{ ip: NET_ION, n: name(NET_ION), ms: 0.5 }, { ip: '10.255.0.1', n: name('10.255.0.1'), ms: 43.8 }, { ip, n: name(ip), ms: 44.2 }].filter((h, i, a) => i === a.length - 1 || h.ip !== ip);
  if (/^192\.168\.(1|2|100)\./.test(ip) || ip.startsWith('127.')) return [{ ip, n: name(ip), ms: 0.4 }];
  if (/^10\.(8|20)\./.test(ip)) return [{ ip: '10.8.0.1', n: '10.8.0.1', ms: 8.9 }, { ip, n: name(ip), ms: 9.2 }];
  const dead = NET_DEAD.includes(ip);
  return [{ ip: NET_ION, n: name(NET_ION), ms: 0.5 }, { ip: '10.10.0.1', n: '10.10.0.1', ms: 6.2 }, { ip: '80.249.208.1', n: 'ae1-ams-ix.isp.nl', ms: 8.9, loss: 60 }, { ip: null, n: '???', ms: 0, loss: 100 }, { ip, n: name(ip), ms: 11.2, loss: dead ? 100 : 0 }];
}
COMMANDS.tracepath = function (args) {
  const { rest } = parseOpts(args, 'lmp');
  const host = rest[0];
  if (!host) return fail('Usage: tracepath [-n] [-b] [-l pktlen] [-m max_hops] [-p port] destination');
  const ip = netResolve(host, this);
  if (!ip) return fail(`tracepath: ${host}: Name or service not known`, 1);
  const num = args.includes('-n');
  const hops = netHops(ip, this);
  const out = [' 1?: [LOCALHOST]                      pmtu 1500'];
  let pmtu = 1500;
  hops.forEach((h, i) => {
    const label = num || !h.n ? (h.ip || 'no reply') : `${h.n} (${h.ip})`;
    if (h.loss === 100 && h.ip === null) { out.push(` ${i + 1}:  no reply`); return; }
    if (i === 0 && netIsHub(ip)) { out.push(` ${i + 1}:  ${label.padEnd(50)} ${h.ms.toFixed(3)}ms`); out.push(` ${i + 1}:  ${label.padEnd(50)} ${(h.ms - 0.03).toFixed(3)}ms pmtu ${NET_MTU}`); pmtu = NET_MTU; return; }
    out.push(` ${i + 1}:  ${label.padEnd(50)} ${h.ms.toFixed(3)}ms${i === hops.length - 1 && h.loss !== 100 ? ' reached' : ''}`);
  });
  if (NET_DEAD.includes(ip)) out.push('     Too many hops: pmtu ' + pmtu, '     Resume: pmtu ' + pmtu);
  else out.push(`     Resume: pmtu ${pmtu} hops ${hops.length} back ${hops.length}`);
  return ok(join(out));
};
COMMANDS.traceroute = function (args) {
  const num = args.includes('-n');
  const host = args.filter(a => !a.startsWith('-'))[0];
  if (!host) return fail('Usage: traceroute [-n] host');
  const ip = netResolve(host, this);
  if (!ip) return fail(`traceroute: unknown host ${host}`);
  if (!netIsHub(ip) && !/^192\.168\.(1|2|100)\./.test(ip) && !NET_DEAD.includes(ip)) return NET_OLD.traceroute.call(this, args);
  const out = [`traceroute to ${host} (${ip}), 30 hops max, 60 byte packets`];
  netHops(ip, this).forEach((h, i) => {
    if (h.loss === 100) { out.push(`${String(i + 1).padStart(2)}  * * *`); return; }
    const label = num ? h.ip : `${h.n} (${h.ip})`;
    out.push(`${String(i + 1).padStart(2)}  ${label}  ${h.ms.toFixed(3)} ms  ${(h.ms - 0.02).toFixed(3)} ms  ${(h.ms - 0.04).toFixed(3)} ms`);
  });
  return ok(join(out));
};
COMMANDS.mtr = function (args) {
  const { flags, vals, rest } = parseOpts(args, 'cips');
  const host = rest[0];
  if (!host) return fail('mtr: usage: mtr -r -c N hedef');
  if (!flags.has('r') && !flags.has('--report') && !flags.has('w') && !flags.has('--report-wide')) return fail('mtr: bu lab\'da interaktif ekran yok, report modu kullan: mtr -r -c 5 hedef');
  const ip = netResolve(host, this);
  if (!ip) return fail(`mtr: Failed to resolve host: ${host}: Name or service not known`);
  const n = Math.min(parseInt(vals.c || '10', 10) || 10, 10);
  const num = flags.has('n');
  const out = ['Start: 2026-10-10T10:30:00+0200', 'HOST: linuxlab                    Loss%   Snt   Last   Avg  Best  Wrst StDev'];
  netHops(ip, this).forEach((h, i) => {
    const label = (num || !h.n ? (h.ip || '???') : h.n).padEnd(24);
    const loss = h.loss || 0;
    const f = v => v.toFixed(1).padStart(6);
    if (loss === 100) out.push(`  ${i + 1}.|-- ${label} 100.0 ${String(n).padStart(5)}${f(0)}${f(0)}${f(0)}${f(0)}${f(0)}`);
    else out.push(`  ${i + 1}.|-- ${label} ${(loss.toFixed(1) + '%').padStart(5)} ${String(n).padStart(5)}${f(h.ms)}${f(h.ms + 0.1)}${f(h.ms - 0.1)}${f(h.ms + 0.4)}${f(0.2)}`);
  });
  return ok(join(out));
};

/* ---------- tcpdump ---------- */

function netPktLine(p, num) {
  const h = ip => num ? ip : (NET_NAMES[ip] || ip);
  const pt = port => num ? port : (NET_SERVICES[port] || port);
  if (p.proto === 'arp') return `${p.t} ARP, ${p.rest}`;
  if (p.proto === 'icmp') return `${p.t} IP ${h(p.src)} > ${h(p.dst)}: ICMP ${p.rest}`;
  return `${p.t} IP ${h(p.src)}.${pt(p.sport)} > ${h(p.dst)}.${pt(p.dport)}: ${p.rest}`;
}
/* BPF benzeri filtre: host, src host, dst host, port, src port, dst port, net, tcp, udp, icmp, arp, ip, and, or, not, parantez */
function netFilter(expr, sh) {
  const toks = expr.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return () => true;
  let i = 0;
  const err = () => { throw new Error('syntax error in filter expression: syntax error'); };
  const prim = () => {
    let t = toks[i++];
    if (t === undefined) err();
    if (t === '(') { const e = orExpr(); if (toks[i++] !== ')') err(); return e; }
    if (t === 'not' || t === '!') { const e = prim(); return p => !e(p); }
    let dir = null;
    if (t === 'src' || t === 'dst') { dir = t; t = toks[i++]; if (t === undefined || ['and', 'or', ')'].includes(t)) { dir = null; i--; t = toks[i - 1]; } }
    if (t === 'host') {
      const v = toks[i++]; if (!v) err();
      const ip = netResolve(v, sh) || v;
      return p => (dir !== 'dst' && p.src === ip) || (dir !== 'src' && p.dst === ip);
    }
    if (t === 'port') {
      const v = parseInt(toks[i++], 10); if (isNaN(v)) err();
      return p => (p.proto === 'tcp' || p.proto === 'udp') && ((dir !== 'dst' && p.sport === v) || (dir !== 'src' && p.dport === v));
    }
    if (t === 'net') {
      const v = toks[i++]; if (!v) err();
      const [n, l] = v.split('/');
      return p => (dir !== 'dst' && netInNet(p.src, n, Number(l || 32))) || (dir !== 'src' && netInNet(p.dst, n, Number(l || 32)));
    }
    if (dir && /^\d+\.\d+\.\d+\.\d+$/.test(t)) { const ip = t; return p => (dir !== 'dst' && p.src === ip) || (dir !== 'src' && p.dst === ip); }
    if (['tcp', 'udp', 'icmp', 'arp'].includes(t)) return p => p.proto === t;
    if (t === 'ip') return p => p.proto !== 'arp';
    err();
  };
  const andExpr = () => { let l = prim(); while (toks[i] === 'and' || toks[i] === '&&') { i++; const r = prim(); const ll = l; l = p => ll(p) && r(p); } return l; };
  const orExpr = () => { let l = andExpr(); while (toks[i] === 'or' || toks[i] === '||') { i++; const r = andExpr(); const ll = l; l = p => ll(p) || r(p); } return l; };
  const fn = orExpr();
  if (i < toks.length) err();
  return fn;
}
function netTcpdump(args) {
  const { flags, vals, rest } = parseOpts(args, 'rciwsFG');
  const num = flags.has('n');
  const count = vals.c ? parseInt(vals.c, 10) : Infinity;
  if (vals.w) return fail('tcpdump: -w ile dosyaya yazma bu lab\'da yok, hazır capture\'lar /var/log/captures altında');
  let fn;
  try { fn = netFilter(rest.join(' '), this); } catch (e) { return fail('tcpdump: ' + e.message); }
  if (vals.r) {
    const abs = this.resolve(vals.r);
    const n = this.node(abs);
    if (!n) return fail(`tcpdump: ${vals.r}: No such file or directory`);
    if (!this.canRead(n)) return fail(`tcpdump: ${vals.r}: Permission denied`);
    const cap = NET_CAPS[abs];
    if (!cap) return fail(`tcpdump: unknown file format\n💡 Bu dosya bir capture değil. Hazır capture\'lar: ${Object.keys(NET_CAPS).join(' ')}`);
    const pk = cap.pk.filter(fn).slice(0, count);
    return { out: join(pk.map(p => netPktLine(p, num))), err: `reading from file ${vals.r}, link-type ${cap.link}, snapshot length 262144\n`, code: 0 };
  }
  const dev = vals.i || 'eth0';
  if (!this.isRoot) return fail(`tcpdump: ${dev}: You don't have permission to capture on that device\n(socket: Operation not permitted)\n💡 Canlı capture root ister. Bu lab'da asıl iş hazır capture okumak, tcpdump -n -r /var/log/captures/dosya.pcap`);
  if (!NET_IFACES.some(x => x.n === dev) && dev !== 'any') return fail(`tcpdump: ${dev}: No such device exists\n(SIOCGIFHWADDR: No such device)`);
  const src = NET_LIVE[dev] || NET_LIVE.eth0;
  const pk = src.filter(fn).slice(0, count);
  const trailer = `\n^C\n${pk.length} packets captured\n${pk.length} packets received by filter\n0 packets dropped by kernel\n[Canlı capture bu lab'da ${src.length} paketle sınırlı, Ctrl+C simüle edildi. Hazır capture'lar /var/log/captures altında]\n`;
  return { out: join(pk.map(p => netPktLine(p, num))) + trailer, err: `tcpdump: verbose output suppressed, use -v[v]... for full protocol decode\nlistening on ${dev}, link-type EN10MB (Ethernet), snapshot length 262144 bytes\n`, code: 0 };
}

/* ---------- iptables, nft ---------- */

function netIptables(args) {
  if (!this.isRoot) return fail('iptables v1.8.10 (nf_tables): Permission denied (you must be root)\n💡 Firewall okumak bile root ister, sudo iptables -L -n -v');
  const ti = args.indexOf('-t');
  const table = ti >= 0 ? args[ti + 1] : 'filter';
  const a = ti < 0 ? args.slice() : args.filter((x, k) => !(k === ti || k === ti + 1));
  const st = netState(this);
  const num = a.includes('-n');
  const verbose = a.includes('-v');
  if (!['filter', 'nat', 'mangle', 'raw'].includes(table)) return fail(`iptables v1.8.10 (nf_tables): table '${table}' does not exist\nPerhaps iptables or your kernel needs to be upgraded.`, 3);
  const any = num ? '0.0.0.0/0' : 'anywhere';
  const hub = num ? '10.50.0.0/16' : '10.50.0.0/16';
  const row = (pk, by, target, prot, inn, out, src, dst, extra) => (verbose ? `${String(pk).padStart(5)} ${String(by).padStart(5)} ` : '') + `${target.padEnd(10)} ${prot.padEnd(5)} --  ${verbose ? inn.padEnd(6) + ' ' + out.padEnd(7) + ' ' : ''}${src.padEnd(20)} ${dst.padEnd(20)} ${extra || ''}`.replace(/\s+$/, '');
  const head = verbose ? ' pkts bytes target     prot opt in     out     source               destination' : 'target     prot opt source               destination';
  const dump = chains => {
    const out = [];
    for (const c of chains) { out.push(c.title, head, ...c.rows, ''); }
    out.pop();
    return out;
  };
  if (a.includes('-S')) {
    if (table === 'nat') return ok('-P PREROUTING ACCEPT\n-P INPUT ACCEPT\n-P OUTPUT ACCEPT\n-P POSTROUTING ACCEPT\n-A POSTROUTING -s 192.168.2.0/24 -o eth0 -j MASQUERADE\n');
    return ok(['-P INPUT ACCEPT', '-P FORWARD ACCEPT', '-P OUTPUT ACCEPT', '-N HUB-BLOCK', '-A INPUT -i lo -j ACCEPT', '-A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT', '-A INPUT -p tcp -m tcp --dport 2222 -j ACCEPT', '-A INPUT -p udp -m udp --dport 500 -j ACCEPT', '-A INPUT -p udp -m udp --dport 4500 -j ACCEPT', '-A INPUT -p esp -j ACCEPT', '-A FORWARD -j HUB-BLOCK', '-A FORWARD -i eth1 -o eth0 -j ACCEPT', '-A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT', '-A OUTPUT -j HUB-BLOCK'].concat(st.hubblock ? ['-A HUB-BLOCK -d 10.50.0.0/16 -p tcp -m tcp --dport 8443 -j DROP'] : []).join('\n') + '\n');
  }
  if (a.includes('-L')) {
    const li = a.indexOf('-L'); const chain = a[li + 1] && !a[li + 1].startsWith('-') ? a[li + 1] : null;
    let chains;
    if (table === 'nat') chains = [
      { n: 'PREROUTING', title: 'Chain PREROUTING (policy ACCEPT 9812 packets, 702K bytes)', rows: [] },
      { n: 'INPUT', title: 'Chain INPUT (policy ACCEPT 7201 packets, 540K bytes)', rows: [] },
      { n: 'OUTPUT', title: 'Chain OUTPUT (policy ACCEPT 3310 packets, 221K bytes)', rows: [] },
      { n: 'POSTROUTING', title: 'Chain POSTROUTING (policy ACCEPT 3310 packets, 221K bytes)', rows: [row(2611, '184K', 'MASQUERADE', 'all', '*', 'eth0', '192.168.2.0/24', any)] },
    ];
    else if (table === 'filter') chains = [
      { n: 'INPUT', title: 'Chain INPUT (policy ACCEPT 18422 packets, 9120K bytes)', rows: [row(1402, '98K', 'ACCEPT', 'all', 'lo', '*', any, any), row(90211, '61M', 'ACCEPT', 'all', '*', '*', any, any, 'ctstate RELATED,ESTABLISHED'), row(312, '18K', 'ACCEPT', 'tcp', '*', '*', any, any, 'tcp dpt:2222'), row(88, 5280, 'ACCEPT', 'udp', '*', '*', any, any, 'udp dpt:500'), row(4120, '512K', 'ACCEPT', 'udp', '*', '*', any, any, 'udp dpt:4500'), row(0, 0, 'ACCEPT', 'esp', '*', '*', any, any)] },
      { n: 'FORWARD', title: 'Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)', rows: [row(2210, '144K', 'HUB-BLOCK', 'all', '*', '*', any, any), row(1830, '121K', 'ACCEPT', 'all', 'eth1', 'eth0', any, any), row(2905, '2011K', 'ACCEPT', 'all', '*', '*', any, any, 'ctstate RELATED,ESTABLISHED')] },
      { n: 'OUTPUT', title: 'Chain OUTPUT (policy ACCEPT 14402 packets, 1920K bytes)', rows: [row(14520, '1931K', 'HUB-BLOCK', 'all', '*', '*', any, any)] },
      { n: 'HUB-BLOCK', title: 'Chain HUB-BLOCK (2 references)', rows: st.hubblock ? [row(184, 11040, 'DROP', 'tcp', '*', '*', any, hub, 'tcp dpt:8443')] : [] },
    ];
    else chains = [{ n: 'PREROUTING', title: 'Chain PREROUTING (policy ACCEPT 0 packets, 0 bytes)', rows: [] }];
    if (chain) { chains = chains.filter(c => c.n === chain); if (!chains.length) return fail('iptables: No chain/target/match by that name.'); }
    return ok(join(dump(chains)));
  }
  if (a.includes('-D') || a.includes('-F') || a.includes('-X')) {
    if (table !== 'filter') return fail('iptables: Bad rule (does a matching rule exist in that chain?).');
    const fi = a.indexOf('-F');
    if (fi >= 0) { const c = a[fi + 1]; if (c && c !== 'HUB-BLOCK') return ok(''); if (c === 'HUB-BLOCK' || !c) { st.hubblock = false; netSetState(this, st); } return ok(''); }
    if (a.includes('-X')) return st.hubblock ? fail('iptables: Directory not empty.') : fail('iptables: Too many links.');
    const di = a.indexOf('-D'); const chain = a[di + 1]; const spec = a.slice(di + 2);
    if (!chain || chain.startsWith('-')) return fail('iptables v1.8.10 (nf_tables): -D requires a chain and a rule number or specification');
    if (!['INPUT', 'FORWARD', 'OUTPUT', 'HUB-BLOCK'].includes(chain)) return fail('iptables: No chain/target/match by that name.');
    if (chain !== 'HUB-BLOCK') return fail(`iptables: Bad rule (does a matching rule exist in that chain?).\n💡 DROP rule'u HUB-BLOCK chain'inde, OUTPUT ve FORWARD sadece oraya jump ediyor`);
    if (!st.hubblock) return fail(spec.length === 1 && /^\d+$/.test(spec[0]) ? 'iptables: Index of deletion too big.' : 'iptables: Bad rule (does a matching rule exist in that chain?).');
    if (spec.length === 1 && /^\d+$/.test(spec[0])) { if (spec[0] !== '1') return fail('iptables: Index of deletion too big.'); st.hubblock = false; netSetState(this, st); return ok(''); }
    const s = spec.join(' ');
    const okSpec = /(^|\s)(-d|--destination)\s+10\.50\.0\.0\/16(\s|$)/.test(s) && /(^|\s)(-p|--protocol)\s+tcp(\s|$)/.test(s) && /(^|\s)(--dport|--destination-port)\s+8443(\s|$)/.test(s) && /(^|\s)(-j|--jump)\s+DROP(\s|$)/.test(s) && !/(-s|--source|-i|-o|--sport)\s/.test(s);
    if (!okSpec) return fail('iptables: Bad rule (does a matching rule exist in that chain?).');
    st.hubblock = false; netSetState(this, st); return ok('');
  }
  if (a.some(x => ['-A', '-I', '-N', '-P', '-R'].includes(x))) return fail('iptables: bu lab\'da sadece -L, -S, -D, -F destekleniyor');
  return fail('iptables v1.8.10 (nf_tables): no command specified\nTry `iptables -h\' or \'iptables --help\' for more information.', 2);
}
function netNft(args) {
  if (!this.isRoot) return fail('nft: Operation not permitted\n💡 nft list ruleset root ister, sudo kullan');
  const a = args.filter(x => x !== '-a' && x !== '--handle');
  const handles = args.includes('-a') || args.includes('--handle');
  const st = netState(this);
  const h = n => handles ? ` # handle ${n}` : '';
  if (a[0] === 'list' && (a[1] === 'ruleset' || (a[1] === 'table' && a[2] === 'ip'))) {
    const filter = [
      'table ip filter {', '\tchain INPUT {', '\t\ttype filter hook input priority filter; policy accept;',
      `\t\tiif "lo" accept${h(1)}`, `\t\tct state related,established accept${h(2)}`, `\t\ttcp dport 2222 accept${h(3)}`, `\t\tudp dport 500 accept${h(4)}`, `\t\tudp dport 4500 accept${h(5)}`, `\t\tmeta l4proto esp accept${h(6)}`, '\t}', '',
      '\tchain FORWARD {', '\t\ttype filter hook forward priority filter; policy accept;', `\t\tjump HUB-BLOCK${h(8)}`, `\t\tiif "eth1" oif "eth0" accept${h(9)}`, `\t\tct state related,established accept${h(10)}`, '\t}', '',
      '\tchain OUTPUT {', '\t\ttype filter hook output priority filter; policy accept;', `\t\tjump HUB-BLOCK${h(11)}`, '\t}', '',
      '\tchain HUB-BLOCK {'].concat(st.hubblock ? [`\t\tip daddr 10.50.0.0/16 tcp dport 8443 counter packets 184 bytes 11040 drop${h(7)}`] : []).concat(['\t}', '}']);
    const nat = ['table ip nat {', '\tchain PREROUTING {', '\t\ttype nat hook prerouting priority dstnat; policy accept;', '\t}', '', '\tchain POSTROUTING {', '\t\ttype nat hook postrouting priority srcnat; policy accept;', `\t\tip saddr 192.168.2.0/24 oif "eth0" masquerade${h(12)}`, '\t}', '}'];
    if (a[1] === 'table') { if (a[3] === 'filter') return ok(join(filter)); if (a[3] === 'nat') return ok(join(nat)); return fail('Error: No such file or directory'); }
    return ok(join(filter.concat([''], nat)));
  }
  if (a[0] === 'delete' && a[1] === 'rule') {
    const m = /^ip filter HUB-BLOCK handle (\d+)$/.exec(a.slice(2).join(' '));
    if (!m) return fail('Error: Could not process rule: No such file or directory\n💡 Sözdizimi: nft delete rule ip filter HUB-BLOCK handle N, handle için nft -a list ruleset');
    if (m[1] !== '7' || !st.hubblock) return fail('Error: Could not process rule: No such file or directory');
    st.hubblock = false; netSetState(this, st); return ok('');
  }
  if (a[0] === 'flush' && a[1] === 'chain' && a.slice(2).join(' ') === 'ip filter HUB-BLOCK') { st.hubblock = false; netSetState(this, st); return ok(''); }
  if (a[0] === 'list') return fail('Error: syntax error, unexpected end of file\n💡 nft list ruleset ya da nft list table ip filter');
  return fail('nft: bu lab\'da list ruleset, list table, delete rule ve flush chain destekleniyor');
}

/* ---------- nc, telnet ---------- */

function netNc(args) {
  const { flags, vals, rest } = parseOpts(args, 'wpsq');
  const host = rest[0]; const port = parseInt(rest[1], 10);
  if (!host || !port) return fail('usage: nc [-zvu] [-w timeout] host port');
  const ip = netResolve(host, this);
  if (!ip) return fail(`nc: getaddrinfo for host "${host}" port ${port}: Name or service not known`);
  const udp = flags.has('u');
  const proto = udp ? 'udp' : 'tcp';
  const s = netPortState(this, ip, port);
  const svc = NET_SERVICES[port] || '*';
  if (s === 'unreach') return fail(`nc: connect to ${ip} port ${port} (${proto}) failed: No route to host`);
  if (udp) return ok(`Connection to ${host} ${port} port [udp/${svc}] succeeded!\n`);
  if (s === 'timeout') return fail(`nc: connect to ${ip} port ${port} (tcp) failed: Connection timed out`);
  if (s === 'refused') return fail(`nc: connect to ${ip} port ${port} (tcp) failed: Connection refused`);
  const line = `Connection to ${host} ${port} port [tcp/${svc}] succeeded!\n`;
  if (flags.has('z')) return ok(line);
  return ok(line + '[interaktif oturum bu lab\'da yok, port taraması için -z kullan]\n');
}
function netTelnet(args) {
  const rest = args.filter(a => !a.startsWith('-'));
  const host = rest[0]; const port = parseInt(rest[1] || '23', 10);
  if (!host) return fail('telnet: usage: telnet host [port]');
  const ip = netResolve(host, this);
  if (!ip) return fail(`telnet: could not resolve ${host}/${port}: Name or service not known`);
  const s = netPortState(this, ip, port);
  const head = `Trying ${ip}...\n`;
  if (s === 'open') return ok(head + `Connected to ${host}.\nEscape character is '^]'.\nConnection closed by foreign host.\n[bağlantı açıldı ve kapandı, bu lab'da interaktif oturum yok]\n`);
  const why = s === 'refused' ? 'Connection refused' : s === 'unreach' ? 'No route to host' : 'Connection timed out';
  return { out: head, err: `telnet: Unable to connect to remote host: ${why}\n`, code: 1 };
}

/* ---------- conntrack, arp, sysctl, ethtool, dmesg ---------- */

function netConntrack(args) {
  if (!this.isRoot) return fail('conntrack v1.4.7 (conntrack-tools): Operation failed: sorry, you must be root or get CAP_NET_ADMIN capability to do this');
  const { vals, rest } = parseOpts(args, 'pdsL');
  if (!args.includes('-L') && !args.includes('--dump') && !args.includes('-C')) return fail('conntrack: bu lab\'da conntrack -L [-p proto] [-d ip] [-s ip] ve conntrack -C destekleniyor');
  if (args.includes('-C')) return ok('7\n');
  const rows = [
    ['tcp', 6, 431999, 'ESTABLISHED', '192.168.1.10', '192.168.1.42', 51000, 2222, '192.168.1.42', '192.168.1.10', 2222, 51000, '[ASSURED]'],
    ['tcp', 6, 431990, 'ESTABLISHED', '192.168.2.50', '10.50.0.30', 49188, 443, '10.50.0.30', '192.168.1.42', 443, 49188, '[ASSURED]'],
    ['udp', 17, 28, null, '192.168.1.42', '192.168.1.1', 41022, 53, '192.168.1.1', '192.168.1.42', 53, 41022, ''],
    ['udp', 17, 22, null, '192.168.1.42', '203.0.113.53', 58834, 53, '203.0.113.53', '192.168.1.42', 53, 58834, '[UNREPLIED]'],
    ['udp', 17, 179, null, '192.168.1.42', '203.0.113.10', 4500, 4500, '203.0.113.10', '192.168.1.42', 4500, 4500, '[ASSURED]'],
    ['udp', 17, 29, null, '192.168.1.42', '203.0.113.20', 500, 500, '203.0.113.20', '192.168.1.42', 500, 500, ''],
    ['icmp', 1, 29, null, '192.168.1.42', '10.50.0.10', null, null, '10.50.0.10', '192.168.1.42', null, null, ''],
  ].filter(r => (!vals.p || r[0] === vals.p) && (!vals.d || r[5] === vals.d) && (!vals.s || r[4] === vals.s));
  const out = rows.map(r => {
    if (r[0] === 'icmp') return `icmp     1 ${r[2]} src=${r[4]} dst=${r[5]} type=8 code=0 id=2201 src=${r[8]} dst=${r[9]} type=0 code=0 id=2201 mark=0 use=1`;
    const unrep = r[12] === '[UNREPLIED]';
    return `${r[0].padEnd(8)} ${r[1]} ${r[2]} ${r[3] ? r[3] + ' ' : ''}src=${r[4]} dst=${r[5]} sport=${r[6]} dport=${r[7]} ${unrep ? '[UNREPLIED] ' : ''}src=${r[8]} dst=${r[9]} sport=${r[10]} dport=${r[11]} ${r[12] && !unrep ? r[12] + ' ' : ''}mark=0 use=1`;
  });
  void rest;
  return { out: join(out), err: `conntrack v1.4.7 (conntrack-tools): ${out.length} flow entries have been shown.\n`, code: 0 };
}
function netArp(args) {
  const { flags, vals } = parseOpts(args, 'i');
  const ns = vals.i ? NET_NEIGH.filter(n => n.dev === vals.i) : NET_NEIGH;
  if (flags.has('d') || flags.has('s')) return this.isRoot ? fail('arp: bu lab\'da ARP tablosu değişikliği simüle edilmiyor') : fail('SIOCDARP(dontpub): Operation not permitted');
  const nm = n => flags.has('n') ? '?' : (NET_NAMES[n.ip] && NET_NAMES[n.ip] !== 'linuxlab' ? NET_NAMES[n.ip].split('.')[0] : '?');
  if (flags.has('a')) return ok(join(ns.map(n => `${nm(n)} (${n.ip}) at ${n.mac ? n.mac + ' [ether]' : '<incomplete>'} on ${n.dev}`)));
  const out = ['Address                  HWtype  HWaddress           Flags Mask            Iface'];
  ns.forEach(n => out.push(`${(flags.has('n') ? n.ip : (NET_NAMES[n.ip] && NET_NAMES[n.ip] !== 'linuxlab' ? NET_NAMES[n.ip].split('.')[0] : n.ip)).padEnd(25)}${n.mac ? 'ether   ' + n.mac + '   C                     ' : '        (incomplete)                              '}${n.dev}`));
  return ok(join(out));
}
function netSysctl(args) {
  const { flags, rest } = parseOpts(args, '');
  const keyPath = k => '/proc/sys/' + k.replace(/\./g, '/');
  if (flags.has('a') || flags.has('A')) {
    const out = [];
    const walk = (abs, pre) => { const d = this.node(abs); if (!d || d.t !== 'd') return; Object.keys(d.c).sort().forEach(k => { const n = d.c[k]; if (n.t === 'd') walk(abs + '/' + k, pre + k + '.'); else out.push(`${pre}${k} = ${n.d.trim()}`); }); };
    walk('/proc/sys', '');
    return ok(join(out));
  }
  if (flags.has('p')) {
    if (!this.isRoot) return fail('sysctl: permission denied on key "net.ipv4.ip_forward"');
    const f = this.readFile('/etc/sysctl.conf', 'sysctl'); if (f.err) return fail(f.err);
    const out = [];
    for (const l of lines(f.data)) { const m = /^\s*([\w.]+)\s*=\s*(\S+)/.exec(l); if (!m) continue; const n = this.node(keyPath(m[1])); if (n) { n.d = m[2] + '\n'; out.push(`${m[1]} = ${m[2]}`); } }
    return ok(join(out));
  }
  if (!rest.length) return fail('sysctl: usage: sysctl [-w] key[=value] | sysctl -a');
  const out = []; let err = '';
  for (const r of rest) {
    const eq = r.indexOf('=');
    const key = eq >= 0 ? r.slice(0, eq) : r;
    const n = this.node(keyPath(key));
    if (!n || n.t !== 'f') { err += `sysctl: cannot stat ${keyPath(key)}: No such file or directory\n`; continue; }
    if (eq >= 0) {
      if (!this.isRoot) { err += `sysctl: permission denied on key "${key}"\n`; continue; }
      const v = r.slice(eq + 1);
      if (!/^\d+$/.test(v)) { err += `sysctl: setting key "${key}": Invalid argument\n`; continue; }
      n.d = v + '\n';
      out.push(`${key} = ${v}`);
    } else out.push(flags.has('n') ? n.d.trim() : `${key} = ${n.d.trim()}`);
  }
  return { out: join(out), err, code: err ? 1 : 0 };
}
const NET_ETH = {
  eth0: { speed: '1000Mb/s', duplex: 'Full', partner: 'Yes', bus: '0000:03:00.0', st: { rx_packets: 2210488, tx_packets: 1744021, rx_bytes: 1834920113, tx_bytes: 902113870, rx_errors: 0, tx_errors: 0, rx_dropped: 0, tx_dropped: 0, multicast: 4412, collisions: 0, rx_crc_errors: 0, rx_align_errors: 0, rx_missed_errors: 0, tx_late_collisions: 0, tx_carrier_errors: 0 } },
  eth1: { speed: '100Mb/s', duplex: 'Half', partner: 'No', bus: '0000:03:00.1', st: { rx_packets: 981203, tx_packets: 744102, rx_bytes: 412330912, tx_bytes: 288110334, rx_errors: 1843, tx_errors: 0, rx_dropped: 12, tx_dropped: 0, multicast: 220, collisions: 2210, rx_crc_errors: 1843, rx_align_errors: 97, rx_missed_errors: 0, tx_late_collisions: 118, tx_carrier_errors: 0 } },
  eth2: { speed: '100Mb/s', duplex: 'Full', partner: 'Yes', bus: '0000:04:00.0', st: { rx_packets: 120330, tx_packets: 98012, rx_bytes: 90211340, tx_bytes: 44120033, rx_errors: 0, tx_errors: 0, rx_dropped: 0, tx_dropped: 0, multicast: 0, collisions: 0, rx_crc_errors: 0, rx_align_errors: 0, rx_missed_errors: 0, tx_late_collisions: 0, tx_carrier_errors: 0 } },
};
function netEthtool(args) {
  const { flags, rest } = parseOpts(args, '');
  const dev = rest[0];
  if (!dev) return fail('ethtool: bad command line argument(s)\nFor more information run ethtool -h');
  const e = NET_ETH[dev];
  if (!e) return fail(NET_IFACES.some(x => x.n === dev) ? `ethtool: ${dev}: Operation not supported` : `Cannot get device settings: No such device`);
  if (flags.has('S')) return ok(`NIC statistics:\n` + join(Object.entries(e.st).map(([k, v]) => `     ${k}: ${v}`)));
  if (flags.has('i')) return ok(`driver: igb\nversion: 6.8.0-45-generic\nfirmware-version: 1.63, 0x80000f0a\nexpansion-rom-version: \nbus-info: ${e.bus}\nsupports-statistics: yes\nsupports-test: yes\nsupports-eeprom-access: yes\nsupports-register-dump: yes\nsupports-priv-flags: yes\n`);
  if (flags.has('s')) return this.isRoot ? fail('ethtool: bu lab\'da link ayarı değişikliği simüle edilmiyor, gerçekte ethtool -s eth1 speed 100 duplex full autoneg off') : fail('Cannot set new settings: Operation not permitted\n  not setting speed\n  not setting duplex');
  return ok([`Settings for ${dev}:`, '\tSupported ports: [ TP ]', '\tSupported link modes:   10baseT/Half 10baseT/Full', '\t                        100baseT/Half 100baseT/Full', '\t                        1000baseT/Full', '\tSupported pause frame use: Symmetric', '\tSupports auto-negotiation: Yes', '\tSupported FEC modes: Not reported',
    '\tAdvertised link modes:  10baseT/Half 10baseT/Full', '\t                        100baseT/Half 100baseT/Full', '\t                        1000baseT/Full', '\tAdvertised pause frame use: Symmetric', '\tAdvertised auto-negotiation: Yes', '\tAdvertised FEC modes: Not reported',
    `\tLink partner advertised auto-negotiation: ${e.partner}`, `\tSpeed: ${e.speed}`, `\tDuplex: ${e.duplex}`, '\tAuto-negotiation: on', '\tPort: Twisted Pair', '\tPHYAD: 1', '\tTransceiver: internal', '\tMDI-X: off (auto)', '\tSupports Wake-on: pumbg', '\tWake-on: d', '\tCurrent message level: 0x00000007 (7)', '\t\t\t       drv probe link', '\tLink detected: yes'].join('\n') + '\n');
}
function netDmesg(args) {
  if (!this.isRoot) return fail('dmesg: read kernel buffer failed: Operation not permitted\n💡 Ubuntu\'da kernel.dmesg_restrict=1, sudo dmesg');
  void args;
  return ok(NET_DMESG);
}

/* ---------- ipsec, swanctl ---------- */

function netIpsec(args) {
  const sub = args[0];
  if (!sub || sub === '--help') return ok('Usage: ipsec command [arguments]\n  status | statusall | up conn | down conn | restart\n');
  if (this.services.strongswan !== 'active') return fail('connecting to \'unix:///var/run/charon.ctl\' failed: No such file or directory\nfailed to connect to stroke socket \'unix:///var/run/charon.ctl\'\n💡 strongswan servisi çalışmıyor, systemctl status strongswan');
  if (!this.isRoot) return fail('connecting to \'unix:///var/run/charon.ctl\' failed: Permission denied\nfailed to connect to stroke socket \'unix:///var/run/charon.ctl\'\n💡 charon socket\'i root ister, sudo ipsec statusall');
  if (sub === 'status' || sub === 'statusall') {
    const all = sub === 'statusall';
    const out = [];
    if (all) out.push('Status of IKE charon daemon (strongSwan 5.9.13, Linux 6.8.0-45-generic, x86_64):', '  uptime: 4 hours, since Oct 10 06:00:02 2026', '  malloc: sbrk 2703360, mmap 0, used 1203456, free 1499904', '  worker threads: 11 of 16 idle, 5/0/0/0 working, job queue: 0/0/0/0, scheduled: 4', '  loaded plugins: charon aes des rc2 sha2 sha1 md5 random nonce x509 revocation constraints pubkey pkcs1 pkcs7 pkcs8 pkcs12 pgp dnskey sshkey pem openssl gcm curve25519 xcbc cmac hmac kdf attr kernel-netlink resolve socket-default stroke vici updown eap-mschapv2 xauth-generic counters', 'Listening IP addresses:', '  192.168.1.42', '  192.168.2.1', '  192.168.100.5', 'Connections:',
      ' partner-ext:  192.168.1.42...203.0.113.10  IKEv2, dpddelay=30s', ' partner-ext:   local:  [branch-ist07.example.net] uses pre-shared key authentication', ' partner-ext:   remote: [vpn.partner.example] uses pre-shared key authentication', ' partner-ext:   child:  192.168.2.0/24 === 172.31.10.0/24 TUNNEL, dpdaction=restart',
      '   cloud-lab:  192.168.1.42...203.0.113.20  IKEv2, dpddelay=30s', '   cloud-lab:   local:  [branch-ist07.example.net] uses pre-shared key authentication', '   cloud-lab:   remote: [203.0.113.20] uses pre-shared key authentication', '   cloud-lab:   child:  192.168.2.0/24 === 10.70.0.0/16 TUNNEL, dpdaction=restart');
    out.push('Security Associations (2 up, 1 connecting):',
      '   cloud-lab[9]: CONNECTING, 192.168.1.42[%any]...203.0.113.20[%any]',
      '   cloud-lab[9]: IKEv2 SPIs: 7a1c3e5f90b2d4e6_i* 0000000000000000_r',
      '   cloud-lab[9]: Tasks active: IKE_VERSION IKE_INIT IKE_NATD IKE_CERT_PRE IKE_AUTH IKE_CERT_POST IKE_CONFIG CHILD_CREATE IKE_AUTH_LIFETIME IKE_MOBIKE',
      ' partner-ext[1]: ESTABLISHED 4 hours ago, 192.168.1.42[branch-ist07.example.net]...203.0.113.10[vpn.partner.example]',
      ' partner-ext[1]: IKEv2 SPIs: 3f9a2b7c1d4e5f60_i* 9c0d1e2f3a4b5c6d_r, pre-shared key reauthentication in 2 hours',
      ' partner-ext[1]: IKE proposal: AES_GCM_16_256/PRF_HMAC_SHA2_256/ECP_256',
      ' partner-ext{1}:  INSTALLED, TUNNEL, reqid 1, ESP in UDP SPIs: c1a2b3d4_i e5f6a7b8_o',
      ' partner-ext{1}:  AES_GCM_16_256, 1203456 bytes_i (9120 pkts, 3s ago), 2210880 bytes_o (10120 pkts, 3s ago), rekeying in 31 minutes',
      ' partner-ext{1}:   192.168.2.0/24 === 172.31.10.0/24');
    return ok(join(out));
  }
  if (sub === 'up' || sub === 'down' || sub === 'restart' || sub === 'reload' || sub === 'rereadsecrets') {
    if (args[1] === 'cloud-lab' && sub === 'up') return fail('initiating IKE_SA cloud-lab[10] to 203.0.113.20\ngenerating IKE_SA_INIT request 0 [ SA KE No N(NATD_S_IP) N(NATD_D_IP) N(FRAG_SUP) N(HASH_ALG) N(REDIR_SUP) ]\nsending packet: from 192.168.1.42[500] to 203.0.113.20[500] (464 bytes)\nreceived packet: from 203.0.113.20[500] to 192.168.1.42[500] (36 bytes)\nparsed IKE_SA_INIT response 0 [ N(NO_PROP) ]\nreceived NO_PROPOSAL_CHOSEN notify error\nestablishing connection \'cloud-lab\' failed');
    if (sub === 'up' && args[1] === 'partner-ext') return ok('connection \'partner-ext\' established successfully\n');
    if ((sub === 'up' || sub === 'down') && !['cloud-lab', 'partner-ext'].includes(args[1] || '')) return fail(`no config named '${args[1] || ''}'`);
    return ok('');
  }
  return fail(`ipsec: unknown command "${sub}"`);
}
function netSwanctl(args) {
  if (!this.isRoot) return fail('connecting to \'unix:///var/run/charon.vici\' failed: Permission denied\nfailed to connect to stroke socket \'unix:///var/run/charon.vici\'\n💡 sudo swanctl -l');
  if (this.services.strongswan !== 'active') return fail('connecting to \'unix:///var/run/charon.vici\' failed: No such file or directory');
  if (args.includes('-l') || args.includes('--list-sas')) return ok(['partner-ext: #1, ESTABLISHED, IKEv2, 3f9a2b7c1d4e5f60_i* 9c0d1e2f3a4b5c6d_r', '  local  \'branch-ist07.example.net\' @ 192.168.1.42[4500]', '  remote \'vpn.partner.example\' @ 203.0.113.10[4500]', '  AES_GCM_16-256/PRF_HMAC_SHA2_256/ECP_256', '  established 14402s ago, reauth in 7198s', '  partner-ext: #1, reqid 1, INSTALLED, TUNNEL-in-UDP, ESP:AES_GCM_16-256', '    installed 1402s ago, rekeying in 1860s, expires in 2198s', '    in  c1a2b3d4,  1203456 bytes,  9120 packets,     3s ago', '    out e5f6a7b8,  2210880 bytes, 10120 packets,     3s ago', '    local  192.168.2.0/24', '    remote 172.31.10.0/24', 'cloud-lab: #9, CONNECTING, IKEv2, 7a1c3e5f90b2d4e6_i* 0000000000000000_r', '  local  \'%any\' @ 192.168.1.42[500]', '  remote \'%any\' @ 203.0.113.20[500]', '  established 0s ago'].join('\n') + '\n');
  if (args.includes('-L') || args.includes('--list-conns')) return ok('partner-ext: IKEv2, no reauthentication, rekeying every 14400s\n  local:  192.168.1.42\n  remote: 203.0.113.10\n  local pre-shared key authentication:\n    id: branch-ist07.example.net\n  remote pre-shared key authentication:\n    id: vpn.partner.example\n  partner-ext: TUNNEL, rekeying every 3600s\n    local:  192.168.2.0/24\n    remote: 172.31.10.0/24\ncloud-lab: IKEv2, no reauthentication, rekeying every 14400s\n  local:  192.168.1.42\n  remote: 203.0.113.20\n  cloud-lab: TUNNEL, rekeying every 3600s\n    local:  192.168.2.0/24\n    remote: 10.70.0.0/16\n');
  return fail('swanctl: bu lab\'da -l ve -L destekleniyor');
}

/* ---------- openssl ---------- */

function netOpenssl(args) {
  const sub = args[0];
  if (sub === 'version') return ok('OpenSSL 3.0.13 30 Jan 2024 (Library: OpenSSL 3.0.13 30 Jan 2024)\n');
  if (sub === 's_client') {
    const ci = args.indexOf('-connect');
    if (ci < 0 || !args[ci + 1]) return fail('s_client: Use -help for summary.\n💡 openssl s_client -connect host:port -servername host');
    const [host, port = '443'] = args[ci + 1].split(':');
    const si = args.indexOf('-servername'); const sni = si >= 0 ? args[si + 1] : null;
    const vi = args.indexOf('-verify_hostname'); const vh = vi >= 0 ? args[vi + 1] : null;
    const ip = netResolve(host, this);
    if (!ip) return fail(`Could not resolve hostname\nconnect:errno=22`);
    const ps = netPortState(this, ip, parseInt(port, 10));
    if (ps === 'timeout') return fail('connect: Connection timed out\nconnect:errno=110');
    if (ps === 'refused') return fail('connect: Connection refused\nconnect:errno=111');
    if (ps === 'unreach') return fail('connect: No route to host\nconnect:errno=113');
    const id = netCertFor(host, port);
    if (!id) return fail(`CONNECTED(00000003)\n40B7A2F1D37F0000:error:0A00010B:SSL routines:ssl3_get_record:wrong version number:../ssl/record/ssl3_record.c:355:\n---\nno peer certificate available\n---\nNo client certificate CA names sent\n---\nSSL handshake has read 5 bytes and written 318 bytes\n`);
    const c = NET_CERTS[id];
    const checkHost = vh || sni || (/^\d+\.\d+\.\d+\.\d+$/.test(host) ? null : host);
    let code = 0; let msg = 'ok';
    if (id === 'erp') { code = 10; msg = 'certificate has expired'; }
    else if (checkHost && c.hosts && !c.hosts.includes(checkHost)) { code = 62; msg = 'hostname mismatch'; }
    const out = ['CONNECTED(00000003)', `depth=1 ${c.issuer}`, 'verify return:1', `depth=0 ${c.subject}`];
    if (code === 10) out.push('verify error:num=10:certificate has expired', `notAfter=${c.na}`, 'verify return:1');
    if (code === 62) out.push('verify error:num=62:hostname mismatch', 'verify return:1');
    out.push('---', 'Certificate chain', ` 0 s:${c.subject}`, `   i:${c.issuer}`, '   a:PKEY: rsaEncryption, 2048 (bit); sigalg: RSA-SHA256', `   v:NotBefore: ${c.nb}; NotAfter: ${c.na}`, '---', 'Server certificate');
    out.push(...lines(netPem(id)).slice(0, 2), '...(kısaltıldı)', '-----END CERTIFICATE-----');
    out.push(`subject=${c.subject}`, `issuer=${c.issuer}`, '---', 'No client certificate CA names sent', 'Peer signing digest: SHA256', 'Peer signature type: RSA-PSS', 'Server Temp Key: X25519, 253 bits', '---', 'SSL handshake has read 1823 bytes and written 393 bytes', `Verification${code ? ' error' : ''}: ${msg === 'ok' ? 'OK' : msg}`, '---', 'New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384', 'Server public key is 2048 bit', 'Secure Renegotiation IS NOT supported', 'No ALPN negotiated', 'Early data was not sent', `Verify return code: ${code} (${msg})`, '---', '[s_client stdin bekler, bu lab\'da oturum kapatıldı]');
    return ok(join(out));
  }
  if (sub === 'x509') {
    const ii = args.indexOf('-in');
    const f = ii >= 0 ? args[ii + 1] : null;
    if (!f) return fail('x509: bu lab\'da stdin yok, -in dosya kullan');
    const r = this.readFile(f, 'openssl');
    if (r.err) return fail(`Could not open file or uri for loading certificate from ${f}: No such file or directory\nUnable to load certificate`);
    const id = netCertByContent(r.data);
    if (!id) return fail('Could not read certificate from ' + f + '\n40B7A2F1D37F0000:error:0480006C:PEM routines:get_name:no start line:../crypto/pem/pem_lib.c:745:Expecting: TRUSTED CERTIFICATE\nUnable to load certificate');
    const c = NET_CERTS[id];
    const out = [];
    const has = x => args.includes(x);
    if (has('-serial')) out.push(`serial=${c.serial}`);
    if (has('-subject')) out.push(`subject=${c.subject}`);
    if (has('-issuer')) out.push(`issuer=${c.issuer}`);
    if (has('-dates') || has('-startdate')) out.push(`notBefore=${c.nb}`);
    if (has('-dates') || has('-enddate')) out.push(`notAfter=${c.na}`);
    if (has('-fingerprint')) out.push(c.fp);
    const ei = args.indexOf('-ext');
    if (ei >= 0 && /subjectAltName/i.test(args[ei + 1] || '')) out.push('X509v3 Subject Alternative Name: ', '    ' + (c.san || '<EMPTY>'));
    if (has('-text')) out.push('Certificate:', '    Data:', '        Version: 3 (0x2)', `        Serial Number: ${c.serial} (0x${c.serial.toLowerCase()})`, '        Signature Algorithm: sha256WithRSAEncryption', `        Issuer: ${c.issuer}`, '        Validity', `            Not Before: ${c.nb}`, `            Not After : ${c.na}`, `        Subject: ${c.subject}`, '        Subject Public Key Info:', '            Public Key Algorithm: rsaEncryption', '                Public-Key: (2048 bit)', '        X509v3 extensions:', '            X509v3 Subject Alternative Name: ', `                ${c.san || '<EMPTY>'}`, '            X509v3 Extended Key Usage: ', '                TLS Web Server Authentication', '            X509v3 Basic Constraints: ', `                CA:${id === 'ca' ? 'TRUE' : 'FALSE'}`);
    const ck = args.indexOf('-checkend');
    if (ck >= 0) {
      const secs = parseInt(args[ck + 1], 10) || 0;
      const exp = new Date(c.na.replace(/\s+/g, ' ')).getTime();
      const expired = exp - Date.now() < secs * 1000;
      out.push(expired ? 'Certificate will expire' : 'Certificate will not expire');
      return { out: join(out), err: '', code: expired ? 1 : 0 };
    }
    if (!has('-noout')) out.push(...lines(netPem(id)));
    return ok(join(out));
  }
  if (sub === 'rand') return ok(Array.from({ length: parseInt(args[args.length - 1], 10) || 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('') + '\n');
  return fail(`openssl: bu lab'da s_client, x509, version destekleniyor${sub ? ', ' + sub + ' yok' : ''}`);
}

/* ---------- dig ---------- */

function netResolvServer(sh) {
  const f = sh.node('/etc/resolv.conf');
  const l = f ? lines(f.d).find(x => /^\s*nameserver\s+\S+/.test(x)) : null;
  return l ? l.trim().split(/\s+/)[1] : NET_ION;
}
function netSearchDomain(sh) {
  const f = sh.node('/etc/resolv.conf');
  const l = f ? lines(f.d).find(x => /^\s*(search|domain)\s+\S+/.test(x)) : null;
  return l ? l.trim().split(/\s+/)[1] : null;
}
COMMANDS.dig = function (args) {
  const opts = args.filter(a => a.startsWith('+'));
  const at = (args.find(a => a.startsWith('@')) || '').slice(1);
  const plain = args.filter(a => !a.startsWith('+') && !a.startsWith('@'));
  let type = 'A'; let name = null; let rev = false;
  for (let i = 0; i < plain.length; i++) {
    const a = plain[i];
    if (a === '-t') { type = (plain[++i] || 'A').toUpperCase(); continue; }
    if (a === '-x') { rev = true; name = plain[++i]; continue; }
    if (a === '-p' || a === '-b') { i++; continue; }
    if (/^(A|AAAA|MX|NS|SOA|PTR|TXT|CNAME|ANY)$/i.test(a) && name) { type = a.toUpperCase(); continue; }
    if (!name) name = a;
  }
  const short = opts.includes('+short');
  const trace = opts.includes('+trace');
  if (!name) name = '.';
  if (rev) { if (!/^\d+\.\d+\.\d+\.\d+$/.test(name)) return fail(`dig: '${name}' is not a legal IP address`); name = name.split('.').reverse().join('.') + '.in-addr.arpa'; type = 'PTR'; }
  const server = at ? (netResolve(at, this) || at) : netResolvServer(this);
  const sd = netSearchDomain(this);
  let q = name.replace(/\.$/, '');
  if (!q.includes('.') && sd && NET_DNS[q + '.' + sd]) q = q + '.' + sd;
  const corp = /(^|\.)corp\.lab$/.test(q) || /in-addr\.arpa$/.test(q);
  const knowsCorp = [NET_ION, '10.50.0.53'].includes(server);
  if (NET_DEAD.includes(server) || (!/^(192\.168\.1\.1|10\.50\.0\.53|8\.8\.8\.8|8\.8\.4\.4|1\.1\.1\.1|9\.9\.9\.9|127\.0\.0\.53)$/.test(server))) {
    return { out: `;; communications error to ${server}#53: timed out\n;; communications error to ${server}#53: timed out\n;; communications error to ${server}#53: timed out\n\n; <<>> DiG 9.18.28 <<>> ${args.join(' ')}\n;; global options: +cmd\n;; no servers could be reached\n`, err: '', code: 9 };
  }
  if (trace) {
    const out = [`; <<>> DiG 9.18.28 <<>> +trace ${q}`, ';; global options: +cmd', '.\t\t\t86400\tIN\tNS\ta.root-servers.net.', '.\t\t\t86400\tIN\tNS\tb.root-servers.net.', '.\t\t\t86400\tIN\tNS\tk.root-servers.net.', `;; Received 525 bytes from ${server}#53(${server}) in 2 ms`, ''];
    if (corp) {
      out.push('lab.\t\t\t86400\tIN\tSOA\ta.root-servers.net. nstld.verisign-grs.com. 2026101001 1800 900 604800 86400', ';; Received 123 bytes from 198.41.0.4#53(a.root-servers.net) in 30 ms', '', `;; Not: corp.lab root'tan delegate edilmiş bir zone değil. Internal zone, sadece ns1.corp.lab (10.50.0.53) ve onu forward eden ION (${NET_ION}) bilir. dig @${NET_ION} ${q}`);
      return ok(join(out));
    }
    const tld = q.split('.').pop(); const ip = netResolve(q, this) || '93.184.215.14';
    out.push(`${tld}.\t\t\t172800\tIN\tNS\ta.gtld-servers.net.`, `${tld}.\t\t\t172800\tIN\tNS\tb.gtld-servers.net.`, ';; Received 1170 bytes from 198.41.0.4#53(a.root-servers.net) in 30 ms', '', `${q}.\t\t172800\tIN\tNS\tns1.${q.split('.').slice(-2).join('.')}.`, ';; Received 280 bytes from 192.5.6.30#53(a.gtld-servers.net) in 28 ms', '', `${q}.\t\t300\tIN\tA\t${ip}`, `;; Received 56 bytes from 93.184.216.1#53(ns1.${q.split('.').slice(-2).join('.')}) in 25 ms`);
    return ok(join(out));
  }
  let answers = []; let status = 'NOERROR'; let extra = [];
  if (corp) {
    if (knowsCorp) {
      const rec = NET_DNS[q];
      if (!rec) status = 'NXDOMAIN';
      else if (rec[type]) answers = rec[type].map(v => `${q}.\t\t${type === 'A' || type === 'PTR' ? 300 : 3600}\tIN\t${type}\t${v}`);
      if (type === 'MX' && rec && rec.MX) extra = ['mail.corp.lab.\t\t3600\tIN\tA\t10.50.0.25'];
    } else status = 'NXDOMAIN';
  } else {
    if (q.endsWith('.local')) status = 'NXDOMAIN';
    else if (type === 'A') { const r = NET_OLD.dig.call(this, [q, '+short']); const ip = (r.out || '').trim(); if (ip) answers = [`${q}.\t\t300\tIN\tA\t${ip}`]; else status = 'NXDOMAIN'; }
    else if (type === 'MX' && /\.(com|net|org)$/.test(q)) answers = [`${q}.\t\t3600\tIN\tMX\t10 mail.${q}.`];
    else if (type === 'NS') answers = [`${q}.\t\t172800\tIN\tNS\tns1.${q}.`];
  }
  if (short) return ok(join(answers.map(a => a.split('\t').pop())));
  const flags = 'qr' + (status === 'NOERROR' && server === '10.50.0.53' && corp ? ' aa' : '') + ' rd ra';
  const out = [`; <<>> DiG 9.18.28 <<>> ${args.join(' ')}`, ';; global options: +cmd', ';; Got answer:', `;; ->>HEADER<<- opcode: QUERY, status: ${status}, id: ${Math.floor(Math.random() * 60000) + 1000}`, `;; flags: ${flags}; QUERY: 1, ANSWER: ${answers.length}, AUTHORITY: ${status === 'NXDOMAIN' ? 1 : 0}, ADDITIONAL: ${1 + extra.length}`, '', ';; QUESTION SECTION:', `;${q}.\t\t\tIN\t${type}`, ''];
  if (answers.length) out.push(';; ANSWER SECTION:', ...answers, '');
  if (extra.length) out.push(';; ADDITIONAL SECTION:', ...extra, '');
  if (status === 'NXDOMAIN') out.push(';; AUTHORITY SECTION:', corp ? 'corp.lab.\t\t300\tIN\tSOA\tns1.corp.lab. hostmaster.corp.lab. 2026100901 3600 900 1209600 300' : '.\t\t\t86400\tIN\tSOA\ta.root-servers.net. nstld.verisign-grs.com. 2026101001 1800 900 604800 86400', '');
  if (q.endsWith('.local')) out.push(`;; Not: dig /etc/hosts dosyasina bakmaz, DNS sunucusuna sorar. getent hosts ${q} dene.`);
  if (corp && !knowsCorp) out.push(`;; Not: ${server} public bir resolver, corp.lab internal zone'unu bilmez. dig @${NET_ION} ${q}`);
  out.push(`;; Query time: ${server === NET_ION ? 2 : server === '10.50.0.53' ? 44 : 12} msec`, `;; SERVER: ${server}#53(${server}) (UDP)`, ';; WHEN: Fri Oct 10 09:14:02 CEST 2026', `;; MSG SIZE  rcvd: ${40 + q.length + answers.length * 16}`);
  return ok(join(out));
};

/* ---------- curl ---------- */

COMMANDS.curl = function (args) {
  const { flags, rest } = parseOpts(args, 'oXHdwm');
  const url = rest[0];
  if (!url) return NET_OLD.curl.call(this, args);
  const m = /^(?:(https?):\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url);
  if (!m) return NET_OLD.curl.call(this, args);
  const [, scheme = 'http', host, portS, path = '/'] = m;
  const ip = netResolve(host, this);
  const corp = /corp\.lab$/.test(host) || (ip && /^10\.50\./.test(ip));
  if (!corp) return NET_OLD.curl.call(this, args);
  if (!ip) return fail(`curl: (6) Could not resolve host: ${host}`, 6);
  const port = parseInt(portS || (scheme === 'https' ? '443' : '80'), 10);
  const ps = netPortState(this, ip, port);
  const insecure = flags.has('k') || flags.has('--insecure');
  const head = flags.has('I');
  if (ps === 'timeout') return fail(`curl: (28) Failed to connect to ${host} port ${port} after 130000 ms: Connection timed out`, 28);
  if (ps === 'refused') return fail(`curl: (7) Failed to connect to ${host} port ${port} after 2 ms: Couldn't connect to server`, 7);
  if (ps === 'unreach') return fail(`curl: (7) Failed to connect to ${host} port ${port} after 3000 ms: No route to host`, 7);
  const certId = netCertFor(host, String(port));
  if (scheme === 'https' || port === 8443 || (port === 443 && scheme !== 'http')) {
    if (!certId) return fail(`curl: (35) error:0A00010B:SSL routines::wrong version number`, 35);
    const c = NET_CERTS[certId];
    if (!insecure) {
      if (certId === 'erp') return fail('curl: (60) SSL certificate problem: certificate has expired\nMore details here: https://curl.se/docs/sslcerts.html\n\ncurl failed to verify the legitimacy of the server and therefore could not\nestablish a secure connection to it. To learn more about this situation and\nhow to fix it, please visit the webpage mentioned above.', 60);
      if (!/^\d+\.\d+\.\d+\.\d+$/.test(host) && c.hosts && !c.hosts.includes(host)) return fail(`curl: (60) SSL: no alternative certificate subject name matches target host name '${host}'\nMore details here: https://curl.se/docs/sslcerts.html`, 60);
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return fail(`curl: (60) SSL: certificate subject name '${c.subject.split(',')[0].replace('CN = ', '')}' does not match target host name '${host}'\nMore details here: https://curl.se/docs/sslcerts.html`, 60);
    }
    if (certId === 'erp') return ok(head ? 'HTTP/1.1 200 OK\nServer: nginx/1.24.0\nContent-Type: application/json\nContent-Length: 48\n' : '{"status":"ok","app":"erp","version":"12.4.1","site":"ams-dc"}\n');
    if (certId === 'files') return ok(head ? 'HTTP/1.1 200 OK\nServer: Apache/2.4.58\nContent-Type: text/html\n' : '<html><head><title>files.corp.lab</title></head><body><h1>ACME file drop</h1><form action="/upload" method="post"></form></body></html>\n');
    return ok(head ? 'HTTP/1.1 200 OK\nServer: nginx/1.24.0\nContent-Type: text/html\nStrict-Transport-Security: max-age=31536000\n' : '<html><head><title>ACME Portal</title></head><body><h1>Welcome to ACME portal</h1></body></html>\n');
  }
  if (port === 8443) return ok(head ? 'HTTP/1.1 400 Bad Request\nServer: nginx/1.24.0\n' : '<html><head><title>400 The plain HTTP request was sent to HTTPS port</title></head></html>\n');
  if (ip === '10.50.0.20') return ok(head ? 'HTTP/1.1 200 OK\nServer: Apache/2.4.58\nContent-Type: text/html\n' : (path.startsWith('/upload') ? 'HTTP/1.1 201 Created\n' : '<html><head><title>files.corp.lab</title></head><body><h1>ACME file drop</h1><p>POST /upload/&lt;dosya&gt;</p></body></html>\n'));
  return ok(head ? 'HTTP/1.1 301 Moved Permanently\nLocation: https://portal.corp.lab/\n' : '<html><head><title>301 Moved Permanently</title></head><body>Moved to https://portal.corp.lab/</body></html>\n');
};

/* ---------- journalctl, ss ---------- */

COMMANDS.journalctl = function (args) {
  const ui = args.indexOf('-u');
  const unit = ui >= 0 ? svcName(args[ui + 1]) : null;
  const ni = args.indexOf('-n'); const n = ni >= 0 ? parseInt(args[ni + 1], 10) : null;
  const cut = s => n ? join(lines(s).slice(-n)) : s;
  if (['strongswan', 'charon', 'ipsec', 'strongswan-starter'].includes(unit)) return ok(cut(NET_SWAN_LOG));
  if (unit === 'erp-agent') return ok(cut(NET_AGENT_LOG));
  if (args.includes('-k') || args.includes('--dmesg')) return this.isRoot ? ok(NET_DMESG) : fail('No journal files were opened due to insufficient permissions.');
  return NET_OLD.journalctl.call(this, args);
};
COMMANDS.ss = function (args) {
  const r = NET_OLD.ss.call(this, args);
  const extra = 'udp   UNCONN 0      0            0.0.0.0:500      0.0.0.0:*     users:(("charon",pid=1210))\nudp   UNCONN 0      0            0.0.0.0:4500     0.0.0.0:*     users:(("charon",pid=1210))\ntcp   LISTEN 0      128        127.0.0.1:9100     0.0.0.0:*     users:(("erp-agent",pid=1402))\ntcp   ESTAB  0      0       192.168.1.42:4500 203.0.113.10:4500 users:(("charon",pid=1210))\n';
  const ls = lines(r.out);
  return ok(join([ls[0]].concat(lines(extra), ls.slice(1))));
};

/* ---------- kayit ---------- */

const NET_MANUAL = {
  tcpdump: { d: 'Paket yakalar ya da hazır capture dosyasını okur. Bu lab\'da canlı capture sınırlı, asıl iş -r', u: ['tcpdump -n -r dosya.pcap [filtre]', '-n isim çözmez, -c N ilk N paket', 'filtre: host X, src host X, dst host X, port N, dst port N, net X/Y, tcp, udp, icmp, arp, and, or, not'], e: ['tcpdump -n -r /var/log/captures/files-mtu.pcap', "tcpdump -n -r /var/log/captures/otlab-syn.pcap 'dst port 8443'", 'tcpdump -n -c 5 -r /var/log/captures/dns.pcap port 53'] },
  tracepath: { d: 'Hedefe giden yolu ve path MTU\'yu bulur, root istemez', u: ['tracepath [-n] hedef'], e: ['tracepath 10.50.0.10', 'tracepath -n erp.corp.lab'] },
  mtr: { d: 'traceroute ve ping birleşimi, hop bazlı loss ve latency raporu', u: ['mtr -r -c N hedef', '-r report modu, -n isim çözmez', 'Ara hop\'ta loss var ama son hop temizse ICMP rate limit, gerçek loss değil'], e: ['mtr -r -c 5 10.50.0.10', 'mtr -r -n -c 5 203.0.113.20'] },
  openssl: { d: 'TLS ve sertifika aracı', u: ['openssl s_client -connect host:port -servername host', 'openssl x509 -in dosya.crt -noout -dates -subject -issuer', 'openssl x509 -in dosya.crt -noout -ext subjectAltName', 'openssl x509 -in dosya.crt -noout -checkend 2592000'], e: ['openssl s_client -connect erp.corp.lab:8443 -servername erp.corp.lab', 'openssl x509 -in /opt/app/certs/erp.crt -noout -dates'] },
  iptables: { d: 'Netfilter firewall kuralları, root ister', u: ['sudo iptables -L -n -v', 'sudo iptables -t nat -L -n', 'sudo iptables -S', 'sudo iptables -D CHAIN N', 'sudo iptables -D CHAIN -d x.x.x.x/y -p tcp --dport N -j DROP'], e: ['sudo iptables -L -n -v', 'sudo iptables -D HUB-BLOCK 1'] },
  nft: { d: 'nftables ruleset, iptables\'ın modern hali', u: ['sudo nft list ruleset', 'sudo nft -a list ruleset  handle numaralarıyla', 'sudo nft delete rule ip filter CHAIN handle N'], e: ['sudo nft -a list ruleset', 'sudo nft delete rule ip filter HUB-BLOCK handle 7'] },
  nc: { d: 'netcat, port açık mı testi', u: ['nc -zv host port', '-z sadece bağlan, -v ayrıntı, -u udp, -w saniye timeout', 'timed out genelde drop, refused ise servis yok ya da reject'], e: ['nc -zv 10.50.0.10 8443', 'nc -zvu 192.168.1.1 53'] },
  telnet: { d: 'Eski ama hâlâ işe yarayan port testi', u: ['telnet host port'], e: ['telnet 10.50.0.20 80'] },
  ipsec: { d: 'strongSwan IKE daemon kontrolü, root ister', u: ['sudo ipsec statusall', 'sudo ipsec status', 'sudo ipsec up conn'], e: ['sudo ipsec statusall', 'journalctl -u strongswan'] },
  swanctl: { d: 'strongSwan vici arayüzü, SA ve connection listesi', u: ['sudo swanctl -l  aktif SA\'lar', 'sudo swanctl -L  connection tanımları'], e: ['sudo swanctl -l'] },
  conntrack: { d: 'Kernel connection tracking tablosu, NAT ve state görünür, root ister', u: ['sudo conntrack -L [-p tcp|udp] [-d ip] [-s ip]', 'sudo conntrack -C  entry sayısı', 'UNREPLIED cevap gelmeyen flow'], e: ['sudo conntrack -L', 'sudo conntrack -L -p udp'] },
  arp: { d: 'ARP tablosu. Modern karşılığı ip neigh', u: ['arp -an', 'arp -a', '<incomplete> ARP cevabı gelmemiş demek'], e: ['arp -an', 'arp -an -i eth1'] },
  sysctl: { d: 'Kernel parametrelerini okur ve yazar, /proc/sys altının arayüzü', u: ['sysctl key', 'sudo sysctl -w key=value', 'sysctl -a', 'sudo sysctl -p  /etc/sysctl.conf yükler'], e: ['sysctl net.ipv4.ip_forward', 'sudo sysctl -w net.ipv4.tcp_mtu_probing=1'] },
  ethtool: { d: 'NIC link ayarları ve driver istatistikleri', u: ['ethtool ethX  speed, duplex, autoneg', 'ethtool -S ethX  sayaçlar, crc, collision', 'ethtool -i ethX  driver'], e: ['ethtool eth1', 'ethtool -S eth1 | grep -i crc'] },
  dmesg: { d: 'Kernel ring buffer, link up down ve driver mesajları', u: ['sudo dmesg', 'sudo dmesg | grep eth1'], e: ['sudo dmesg | grep -i duplex'] },
};
MANUAL.ip.u.push('ip rule, ip route show table 100, ip route get hedef, ip -s link, ip -br addr');
MANUAL.ip.e.push('ip route get 10.50.0.10', 'ip -s link show eth1');
MANUAL.ping.u.push('ping -M do -s boyut hedef  DF set, fragment yasak, MTU avı için');
MANUAL.ping.e.push('ping -M do -s 1472 -c 2 10.50.0.10');
MANUAL.dig.u.push('dig @server isim, dig isim MX, dig -x ip, dig +trace isim');
MANUAL.dig.e.push('dig @192.168.1.1 erp.corp.lab', 'dig corp.lab MX');
MANUAL.curl.u.push('-k sertifika doğrulamasını atlar, -v ayrıntı');
MANUAL.curl.e.push('curl -I https://portal.corp.lab/', 'curl -k https://erp.corp.lab:8443/');
MANUAL.journalctl.e.push('journalctl -u strongswan', 'journalctl -u erp-agent');

registerExt({
  files: netFiles(),
  commands: { tcpdump: netTcpdump, tracepath: COMMANDS.tracepath, iptables: netIptables, nft: netNft, nc: netNc, netcat: netNc, telnet: netTelnet, conntrack: netConntrack, arp: netArp, sysctl: netSysctl, ethtool: netEthtool, ipsec: netIpsec, swanctl: netSwanctl, openssl: netOpenssl, dmesg: netDmesg },
  procs: [
    { pid: 1210, user: 'root', cpu: 0.1, mem: 0.9, cmd: '/usr/lib/ipsec/charon' },
    { pid: 1402, user: 'erp', cpu: 0.3, mem: 1.2, cmd: '/opt/erp-agent/bin/erp-agent --config /opt/erp-agent/agent.conf' },
  ],
  services: { strongswan: 'active', 'erp-agent': 'active' },
  manual: NET_MANUAL,
  onReset: sh => { netFiles().forEach(f => sh.install(f.path, f.node)); },
});
delete COMMANDS.tracepath;
