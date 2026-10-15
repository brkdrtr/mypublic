'use strict';
/* sim-k8s. Kubernetes cluster simulasyonu, kubectl ve k, kind ve minikube stub.
   Cluster durumu /var/lib/lab-k8s/state.json icinde JSON olarak durur, registerExt onReset ile sifirlanir.
   Her kubectl komutu bir tick ilerletir, pod yasam dongusu tick'lerle akar. Imaj dogrulamasi sim-docker'in
   SIMDK_imageKnown ve SIMDK_imageRecord fonksiyonlarini kullanir. Dis arayuz: SIMK8_load(sh), SIMK8_save(sh, st),
   SIMK8_find(st, kind, ns, name), SIMK8_list(st, kind, ns). */

const SIMK8_STATE = '/var/lib/lab-k8s/state.json';
const SIMK8_EPOCH = Date.parse('2026-10-13T08:00:00Z');
const SIMK8_TICK_MS = 10000;
const SIMK8_KINDS = [
  { kind: 'Namespace', plural: 'namespaces', singular: 'namespace', short: ['ns'], group: '', version: 'v1', namespaced: false },
  { kind: 'Node', plural: 'nodes', singular: 'node', short: ['no'], group: '', version: 'v1', namespaced: false },
  { kind: 'Pod', plural: 'pods', singular: 'pod', short: ['po'], group: '', version: 'v1', namespaced: true },
  { kind: 'Service', plural: 'services', singular: 'service', short: ['svc'], group: '', version: 'v1', namespaced: true },
  { kind: 'ConfigMap', plural: 'configmaps', singular: 'configmap', short: ['cm'], group: '', version: 'v1', namespaced: true },
  { kind: 'Secret', plural: 'secrets', singular: 'secret', short: [], group: '', version: 'v1', namespaced: true },
  { kind: 'ServiceAccount', plural: 'serviceaccounts', singular: 'serviceaccount', short: ['sa'], group: '', version: 'v1', namespaced: true },
  { kind: 'Endpoints', plural: 'endpoints', singular: 'endpoints', short: ['ep'], group: '', version: 'v1', namespaced: true },
  { kind: 'Event', plural: 'events', singular: 'event', short: ['ev'], group: '', version: 'v1', namespaced: true },
  { kind: 'PersistentVolumeClaim', plural: 'persistentvolumeclaims', singular: 'persistentvolumeclaim', short: ['pvc'], group: '', version: 'v1', namespaced: true },
  { kind: 'Deployment', plural: 'deployments', singular: 'deployment', short: ['deploy'], group: 'apps', version: 'v1', namespaced: true },
  { kind: 'ReplicaSet', plural: 'replicasets', singular: 'replicaset', short: ['rs'], group: 'apps', version: 'v1', namespaced: true },
  { kind: 'DaemonSet', plural: 'daemonsets', singular: 'daemonset', short: ['ds'], group: 'apps', version: 'v1', namespaced: true },
  { kind: 'StatefulSet', plural: 'statefulsets', singular: 'statefulset', short: ['sts'], group: 'apps', version: 'v1', namespaced: true },
  { kind: 'Job', plural: 'jobs', singular: 'job', short: [], group: 'batch', version: 'v1', namespaced: true },
  { kind: 'CronJob', plural: 'cronjobs', singular: 'cronjob', short: ['cj'], group: 'batch', version: 'v1', namespaced: true },
  { kind: 'Ingress', plural: 'ingresses', singular: 'ingress', short: ['ing'], group: 'networking.k8s.io', version: 'v1', namespaced: true },
  { kind: 'NetworkPolicy', plural: 'networkpolicies', singular: 'networkpolicy', short: ['netpol'], group: 'networking.k8s.io', version: 'v1', namespaced: true },
  { kind: 'HorizontalPodAutoscaler', plural: 'horizontalpodautoscalers', singular: 'horizontalpodautoscaler', short: ['hpa'], group: 'autoscaling', version: 'v2', namespaced: true },
  { kind: 'StorageClass', plural: 'storageclasses', singular: 'storageclass', short: ['sc'], group: 'storage.k8s.io', version: 'v1', namespaced: false },
  { kind: 'Role', plural: 'roles', singular: 'role', short: [], group: 'rbac.authorization.k8s.io', version: 'v1', namespaced: true },
  { kind: 'RoleBinding', plural: 'rolebindings', singular: 'rolebinding', short: [], group: 'rbac.authorization.k8s.io', version: 'v1', namespaced: true },
  { kind: 'ClusterRole', plural: 'clusterroles', singular: 'clusterrole', short: [], group: 'rbac.authorization.k8s.io', version: 'v1', namespaced: false },
];
const SIMK8_NODES = [
  { name: 'netops-control-plane', ip: '172.18.0.2', roles: 'control-plane', cpu: 4000, mem: 8 * 1024 * 1024 * 1024, pods: 110, taint: true },
  { name: 'netops-worker', ip: '172.18.0.3', roles: '<none>', cpu: 4000, mem: 8 * 1024 * 1024 * 1024, pods: 110, taint: false },
];
const SIMK8_VERSION = 'v1.31.2';

function simk8Kind(name) {
  if (!name) return null;
  let n = String(name).toLowerCase();
  if (n.includes('.')) { const first = n.split('.')[0]; const grp = n.slice(first.length + 1); const k = SIMK8_KINDS.find(k => [k.plural, k.singular, k.kind.toLowerCase(), ...k.short].includes(first) && (grp === k.group || grp === `${k.version}.${k.group}` || (k.group === '' && grp === 'v1'))); if (k) return k; n = first; }
  return SIMK8_KINDS.find(k => k.plural === n || k.singular === n || k.kind.toLowerCase() === n || k.short.includes(n)) || null;
}
function simk8ApiVersion(k) { return k.group ? `${k.group}/${k.version}` : k.version; }
function simk8Hash(s) { return typeof simdkHash === 'function' ? simdkHash(s) : String(s).split('').reduce((h, c) => ((h * 31 + c.charCodeAt(0)) >>> 0), 7).toString(16).padStart(8, '0').repeat(8); }
const SIMK8_ALPHA = 'bcdfghjklmnpqrstvwxz2456789';
function simk8Suffix(seed, n) { const h = simk8Hash(seed); let out = ''; for (let i = 0; i < n; i++) out += SIMK8_ALPHA[parseInt(h.slice(i * 2, i * 2 + 2), 16) % SIMK8_ALPHA.length]; return out; }
function simk8Rand(n) { let out = ''; for (let i = 0; i < n; i++) out += SIMK8_ALPHA[Math.floor(Math.random() * SIMK8_ALPHA.length)]; return out; }
function simk8Uid() { const h = (typeof simdkRand === 'function' ? simdkRand(32) : simk8Hash(String(Math.random())).slice(0, 32)); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`; }
function simk8Now(st) { return SIMK8_EPOCH + st.tick * SIMK8_TICK_MS; }
function simk8Iso(st, tick) { return new Date(SIMK8_EPOCH + tick * SIMK8_TICK_MS).toISOString().replace(/\.\d+Z$/, 'Z'); }
function simk8Human(st, tick) { const d = new Date(SIMK8_EPOCH + tick * SIMK8_TICK_MS); return d.toUTCString().replace('GMT', '+0000').replace(/^(\w+), (\d+) (\w+) (\d+) /, '$1, $2 $3 $4 '); }
function simk8Age(st, tick) {
  const s = Math.max(0, (st.tick - tick) * SIMK8_TICK_MS / 1000);
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 && m < 10 ? `${m}m${Math.round(s % 60)}s` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 && h < 10 ? `${h}h${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 365) return h % 24 && d < 10 ? `${d}d${h % 24}h` : `${d}d`;
  return `${Math.floor(d / 365)}y`;
}
function simk8Table(rows) { return typeof simdkTable === 'function' ? simdkTable(rows, 6, 3) : rows.map(r => r.join('   ')).join('\n') + '\n'; }
function simk8Clone(o) { return JSON.parse(JSON.stringify(o)); }
function simk8Quantity(q) {
  if (q == null) return 0;
  const s = String(q).trim();
  const m = /^(\d+(?:\.\d+)?)(m|k|Ki|M|Mi|G|Gi|T|Ti)?$/.exec(s);
  if (!m) return parseFloat(s) || 0;
  const n = parseFloat(m[1]);
  const mult = { m: 0.001, k: 1e3, Ki: 1024, M: 1e6, Mi: 1024 * 1024, G: 1e9, Gi: 1024 ** 3, T: 1e12, Ti: 1024 ** 4 }[m[2] || ''] || 1;
  return n * mult;
}
function simk8Mi(bytes) { return `${Math.round(bytes / (1024 * 1024))}Mi`; }
function simk8Milli(cpuCores) { return `${Math.round(cpuCores * 1000)}m`; }

/* ---------- durum ---------- */
function simk8Obj(st, kind, ns, name, spec, extra) {
  const k = simk8Kind(kind);
  const o = { apiVersion: simk8ApiVersion(k), kind: k.kind, metadata: { name, uid: simk8Uid(), resourceVersion: String(1000 + st.objects.length * 7), creationTimestamp: null, labels: {}, annotations: {}, _ct: st.tick }, spec: spec || {} };
  if (k.namespaced) o.metadata.namespace = ns;
  Object.assign(o, extra || {});
  st.objects.push(o);
  return o;
}
function SIMK8_find(st, kind, ns, name) {
  const k = simk8Kind(kind); if (!k) return null;
  return st.objects.find(o => o.kind === k.kind && o.metadata.name === name && (!k.namespaced || o.metadata.namespace === ns)) || null;
}
function SIMK8_list(st, kind, ns) {
  const k = simk8Kind(kind); if (!k) return [];
  return st.objects.filter(o => o.kind === k.kind && (!k.namespaced || ns === '*' || o.metadata.namespace === ns));
}
function simk8Event(st, obj, type, reason, message, from) {
  const key = `${obj.kind}/${obj.metadata.namespace || ''}/${obj.metadata.name}/${reason}/${message}`;
  const ex = st.events.find(e => e.key === key);
  if (ex) { ex.count++; ex.last = st.tick; return ex; }
  const e = { key, type, reason, message, kind: obj.kind, name: obj.metadata.name, ns: obj.metadata.namespace || '', from: from || 'kubelet', count: 1, first: st.tick, last: st.tick, uid: obj.metadata.uid };
  st.events.push(e);
  if (st.events.length > 400) st.events.splice(0, st.events.length - 400);
  return e;
}
function simk8Fresh() {
  const st = { tick: 0, objects: [], events: [], context: 'kind-netops', contexts: { 'kind-netops': { cluster: 'kind-netops', user: 'kind-netops', namespace: 'default' }, 'minikube': { cluster: 'minikube', user: 'minikube', namespace: 'default' }, 'prod-eks': { cluster: 'arn:aws:eks:eu-west-1:482915:cluster/netops-prod', user: 'netops-prod-admin', namespace: 'netops' } }, hpaLoad: false, hpaLoadSince: null, revisions: {}, portForwards: [], ipNext: 5, svcNext: 20, nodePortNext: 30080, audit: { logs: [], describe: [], exec: [], events: [] } };
  const T = -25920; /* 3 gun once */
  ['default', 'kube-system', 'kube-public', 'kube-node-lease', 'netops', 'ingress-nginx', 'local-path-storage'].forEach((n, i) => { const o = simk8Obj(st, 'Namespace', null, n, { finalizers: ['kubernetes'] }, { status: { phase: 'Active' } }); o.metadata._ct = n === 'netops' ? -8640 : T; o.metadata.labels = { 'kubernetes.io/metadata.name': n }; if (n === 'netops') o.metadata.labels.team = 'netops'; });
  SIMK8_NODES.forEach(n => { const o = simk8Obj(st, 'Node', null, n.name, { podCIDR: n.name.endsWith('worker') ? '10.244.1.0/24' : '10.244.0.0/24', providerID: `kind://docker/netops/${n.name}` }, { status: {} }); o.metadata._ct = T; o.metadata.labels = { 'beta.kubernetes.io/arch': 'amd64', 'beta.kubernetes.io/os': 'linux', 'kubernetes.io/arch': 'amd64', 'kubernetes.io/hostname': n.name, 'kubernetes.io/os': 'linux' }; if (n.taint) { o.metadata.labels['node-role.kubernetes.io/control-plane'] = ''; o.spec.taints = [{ key: 'node-role.kubernetes.io/control-plane', effect: 'NoSchedule' }]; } o._node = n; });
  const sys = (kind, name, ns, image, extra) => { const o = simk8Obj(st, kind, ns, name, {}, extra || {}); o.metadata._ct = T; o._sys = true; o._image = image; return o; };
  /* kube-system */
  const cdHash = simk8Suffix('coredns-template', 10);
  const cd = sys('Deployment', 'coredns', 'kube-system', 'registry.k8s.io/coredns/coredns:v1.11.3');
  cd.metadata.labels = { 'k8s-app': 'kube-dns' }; cd.metadata.annotations = { 'deployment.kubernetes.io/revision': '1' };
  cd.spec = { replicas: 2, selector: { matchLabels: { 'k8s-app': 'kube-dns' } }, strategy: { type: 'RollingUpdate', rollingUpdate: { maxSurge: '25%', maxUnavailable: 1 } }, template: { metadata: { labels: { 'k8s-app': 'kube-dns' } }, spec: { containers: [{ name: 'coredns', image: 'registry.k8s.io/coredns/coredns:v1.11.3', args: ['-conf', '/etc/coredns/Corefile'], ports: [{ containerPort: 53, name: 'dns', protocol: 'UDP' }, { containerPort: 53, name: 'dns-tcp', protocol: 'TCP' }, { containerPort: 9153, name: 'metrics', protocol: 'TCP' }], resources: { limits: { memory: '170Mi' }, requests: { cpu: '100m', memory: '70Mi' } } }], serviceAccountName: 'coredns', priorityClassName: 'system-cluster-critical', tolerations: [{ key: 'node-role.kubernetes.io/control-plane', effect: 'NoSchedule' }] } } };
  cd.metadata.generation = 1;
  const cdRs = sys('ReplicaSet', `coredns-${cdHash}`, 'kube-system', cd._image);
  cdRs.metadata.labels = { 'k8s-app': 'kube-dns', 'pod-template-hash': cdHash }; cdRs.metadata.ownerReferences = [{ apiVersion: 'apps/v1', kind: 'Deployment', name: 'coredns', uid: cd.metadata.uid, controller: true, blockOwnerDeletion: true }];
  cdRs.spec = { replicas: 2, selector: { matchLabels: { 'k8s-app': 'kube-dns', 'pod-template-hash': cdHash } }, template: simk8Clone(cd.spec.template) }; cdRs.spec.template.metadata.labels['pod-template-hash'] = cdHash; cdRs._hash = cdHash; cdRs.metadata.annotations = { 'deployment.kubernetes.io/revision': '1' };
  for (let i = 0; i < 2; i++) { const p = sys('Pod', `coredns-${cdHash}-${simk8Suffix('coredns' + i, 5)}`, 'kube-system', cd._image); p.metadata.labels = { 'k8s-app': 'kube-dns', 'pod-template-hash': cdHash }; p.metadata.ownerReferences = [{ apiVersion: 'apps/v1', kind: 'ReplicaSet', name: cdRs.metadata.name, uid: cdRs.metadata.uid, controller: true, blockOwnerDeletion: true }]; p.spec = simk8Clone(cdRs.spec.template.spec); p.spec.nodeName = 'netops-control-plane'; p._p = { startTick: T, node: 'netops-control-plane', ip: `10.244.0.${3 + i}`, restarts: 0, sys: true, cpu: 2, mem: 14 }; }
  const dsPods = [['kindnet', 'docker.io/kindest/kindnetd:v20240813-c6f155d6', { app: 'kindnet', 'k8s-app': 'kindnet' }, '10.244.0.1', 1, 9], ['kube-proxy', 'registry.k8s.io/kube-proxy:v1.31.2', { 'k8s-app': 'kube-proxy' }, '10.244.0.1', 1, 12]];
  for (const [name, image, labels] of dsPods) {
    const ds = sys('DaemonSet', name, 'kube-system', image); ds.metadata.labels = labels; ds.spec = { selector: { matchLabels: labels }, template: { metadata: { labels }, spec: { containers: [{ name, image }], tolerations: [{ operator: 'Exists' }] } }, updateStrategy: { type: 'RollingUpdate', rollingUpdate: { maxSurge: 0, maxUnavailable: 1 } } };
    SIMK8_NODES.forEach((n, i) => { const p = sys('Pod', `${name}-${simk8Suffix(name + n.name, 5)}`, 'kube-system', image); p.metadata.labels = Object.assign({ 'controller-revision-hash': simk8Suffix(name + 'rev', 10), 'pod-template-generation': '1' }, labels); p.metadata.ownerReferences = [{ apiVersion: 'apps/v1', kind: 'DaemonSet', name, uid: ds.metadata.uid, controller: true, blockOwnerDeletion: true }]; p.spec = { containers: [{ name, image }], nodeName: n.name, tolerations: [{ operator: 'Exists' }] }; p._p = { startTick: T, node: n.name, ip: n.ip, restarts: 0, sys: true, hostNet: true, cpu: name === 'kindnet' ? 1 : 1, mem: name === 'kindnet' ? 9 : 12 }; });
  }
  [['etcd', 'registry.k8s.io/etcd:3.5.15-0', 24, 52], ['kube-apiserver', 'registry.k8s.io/kube-apiserver:v1.31.2', 58, 243], ['kube-controller-manager', 'registry.k8s.io/kube-controller-manager:v1.31.2', 21, 48], ['kube-scheduler', 'registry.k8s.io/kube-scheduler:v1.31.2', 5, 20]].forEach(([name, image, cpu, mem]) => {
    const p = sys('Pod', `${name}-netops-control-plane`, 'kube-system', image); p.metadata.labels = { component: name, tier: 'control-plane' }; p.metadata.annotations = { 'kubernetes.io/config.hash': simk8Hash(name).slice(0, 32), 'kubernetes.io/config.mirror': simk8Hash(name).slice(0, 32), 'kubernetes.io/config.source': 'file' }; p.metadata.ownerReferences = [{ apiVersion: 'v1', kind: 'Node', name: 'netops-control-plane', uid: SIMK8_find(st, 'Node', null, 'netops-control-plane').metadata.uid, controller: true }]; p.spec = { containers: [{ name, image, resources: { requests: { cpu: name === 'kube-apiserver' ? '250m' : (name === 'etcd' ? '100m' : (name === 'kube-controller-manager' ? '200m' : '100m')), memory: name === 'etcd' ? '100Mi' : undefined } } }], nodeName: 'netops-control-plane', hostNetwork: true, priorityClassName: 'system-node-critical' }; p._p = { startTick: T, node: 'netops-control-plane', ip: '172.18.0.2', restarts: 0, sys: true, hostNet: true, cpu, mem };
  });
  const lpHash = simk8Suffix('local-path', 10);
  const lp = sys('Deployment', 'local-path-provisioner', 'local-path-storage', 'docker.io/kindest/local-path-provisioner:v20240813-c6f155d6'); lp.metadata.labels = { app: 'local-path-provisioner' }; lp.spec = { replicas: 1, selector: { matchLabels: { app: 'local-path-provisioner' } }, strategy: { type: 'RollingUpdate', rollingUpdate: { maxSurge: '25%', maxUnavailable: '25%' } }, template: { metadata: { labels: { app: 'local-path-provisioner' } }, spec: { containers: [{ name: 'local-path-provisioner', image: lp._image }], serviceAccountName: 'local-path-provisioner-service-account', tolerations: [{ key: 'node-role.kubernetes.io/control-plane', effect: 'NoSchedule' }] } } }; lp.metadata.generation = 1; lp.metadata.annotations = { 'deployment.kubernetes.io/revision': '1' };
  const lpRs = sys('ReplicaSet', `local-path-provisioner-${lpHash}`, 'local-path-storage', lp._image); lpRs.metadata.labels = { app: 'local-path-provisioner', 'pod-template-hash': lpHash }; lpRs.metadata.ownerReferences = [{ apiVersion: 'apps/v1', kind: 'Deployment', name: 'local-path-provisioner', uid: lp.metadata.uid, controller: true, blockOwnerDeletion: true }]; lpRs.spec = { replicas: 1, selector: { matchLabels: { app: 'local-path-provisioner', 'pod-template-hash': lpHash } }, template: simk8Clone(lp.spec.template) }; lpRs.spec.template.metadata.labels['pod-template-hash'] = lpHash; lpRs._hash = lpHash;
  const lpPod = sys('Pod', `local-path-provisioner-${lpHash}-${simk8Suffix('lp', 5)}`, 'local-path-storage', lp._image); lpPod.metadata.labels = { app: 'local-path-provisioner', 'pod-template-hash': lpHash }; lpPod.metadata.ownerReferences = [{ apiVersion: 'apps/v1', kind: 'ReplicaSet', name: lpRs.metadata.name, uid: lpRs.metadata.uid, controller: true, blockOwnerDeletion: true }]; lpPod.spec = simk8Clone(lpRs.spec.template.spec); lpPod.spec.nodeName = 'netops-control-plane'; lpPod._p = { startTick: T, node: 'netops-control-plane', ip: '10.244.0.2', restarts: 0, sys: true, cpu: 1, mem: 7 };
  /* ingress-nginx controller */
  const inHash = simk8Suffix('ingress-nginx', 10);
  const ing = sys('Deployment', 'ingress-nginx-controller', 'ingress-nginx', 'registry.k8s.io/ingress-nginx/controller:v1.11.3'); ing.metadata.labels = { 'app.kubernetes.io/component': 'controller', 'app.kubernetes.io/instance': 'ingress-nginx', 'app.kubernetes.io/name': 'ingress-nginx' }; ing.spec = { replicas: 1, selector: { matchLabels: { 'app.kubernetes.io/component': 'controller', 'app.kubernetes.io/instance': 'ingress-nginx', 'app.kubernetes.io/name': 'ingress-nginx' } }, strategy: { type: 'RollingUpdate', rollingUpdate: { maxSurge: '25%', maxUnavailable: '25%' } }, template: { metadata: { labels: { 'app.kubernetes.io/component': 'controller', 'app.kubernetes.io/instance': 'ingress-nginx', 'app.kubernetes.io/name': 'ingress-nginx' } }, spec: { containers: [{ name: 'controller', image: ing._image, ports: [{ containerPort: 80, name: 'http', hostPort: 80 }, { containerPort: 443, name: 'https', hostPort: 443 }], resources: { requests: { cpu: '100m', memory: '90Mi' } } }], nodeSelector: { 'ingress-ready': 'true' }, tolerations: [{ key: 'node-role.kubernetes.io/control-plane', effect: 'NoSchedule' }] } } }; ing.metadata.generation = 1; ing.metadata.annotations = { 'deployment.kubernetes.io/revision': '1' };
  const ingRs = sys('ReplicaSet', `ingress-nginx-controller-${inHash}`, 'ingress-nginx', ing._image); ingRs.metadata.labels = Object.assign({ 'pod-template-hash': inHash }, ing.spec.selector.matchLabels); ingRs.metadata.ownerReferences = [{ apiVersion: 'apps/v1', kind: 'Deployment', name: ing.metadata.name, uid: ing.metadata.uid, controller: true, blockOwnerDeletion: true }]; ingRs.spec = { replicas: 1, selector: { matchLabels: Object.assign({ 'pod-template-hash': inHash }, ing.spec.selector.matchLabels) }, template: simk8Clone(ing.spec.template) }; ingRs.spec.template.metadata.labels['pod-template-hash'] = inHash; ingRs._hash = inHash;
  const ingPod = sys('Pod', `ingress-nginx-controller-${inHash}-${simk8Suffix('ingp', 5)}`, 'ingress-nginx', ing._image); ingPod.metadata.labels = Object.assign({ 'pod-template-hash': inHash }, ing.spec.selector.matchLabels); ingPod.metadata.ownerReferences = [{ apiVersion: 'apps/v1', kind: 'ReplicaSet', name: ingRs.metadata.name, uid: ingRs.metadata.uid, controller: true, blockOwnerDeletion: true }]; ingPod.spec = simk8Clone(ingRs.spec.template.spec); ingPod.spec.nodeName = 'netops-control-plane'; ingPod._p = { startTick: T, node: 'netops-control-plane', ip: '10.244.0.6', restarts: 0, sys: true, cpu: 3, mem: 88 };
  const ingSvc = sys('Service', 'ingress-nginx-controller', 'ingress-nginx', null); ingSvc.metadata.labels = simk8Clone(ing.metadata.labels); ingSvc.spec = { type: 'NodePort', clusterIP: '10.96.112.41', clusterIPs: ['10.96.112.41'], selector: simk8Clone(ing.spec.selector.matchLabels), ports: [{ name: 'http', port: 80, targetPort: 'http', protocol: 'TCP', nodePort: 31080, appProtocol: 'http' }, { name: 'https', port: 443, targetPort: 'https', protocol: 'TCP', nodePort: 31443, appProtocol: 'https' }], ipFamilies: ['IPv4'], ipFamilyPolicy: 'SingleStack', sessionAffinity: 'None', externalTrafficPolicy: 'Local', internalTrafficPolicy: 'Cluster' }; ingSvc.status = { loadBalancer: {} };
  const dns = sys('Service', 'kube-dns', 'kube-system', null); dns.metadata.labels = { 'k8s-app': 'kube-dns', 'kubernetes.io/cluster-service': 'true', 'kubernetes.io/name': 'CoreDNS' }; dns.metadata.annotations = { 'prometheus.io/port': '9153', 'prometheus.io/scrape': 'true' }; dns.spec = { type: 'ClusterIP', clusterIP: '10.96.0.10', clusterIPs: ['10.96.0.10'], selector: { 'k8s-app': 'kube-dns' }, ports: [{ name: 'dns', port: 53, targetPort: 53, protocol: 'UDP' }, { name: 'dns-tcp', port: 53, targetPort: 53, protocol: 'TCP' }, { name: 'metrics', port: 9153, targetPort: 9153, protocol: 'TCP' }], ipFamilies: ['IPv4'], ipFamilyPolicy: 'SingleStack', sessionAffinity: 'None', internalTrafficPolicy: 'Cluster' }; dns.status = { loadBalancer: {} };
  const k8sSvc = sys('Service', 'kubernetes', 'default', null); k8sSvc.metadata.labels = { component: 'apiserver', provider: 'kubernetes' }; k8sSvc.spec = { type: 'ClusterIP', clusterIP: '10.96.0.1', clusterIPs: ['10.96.0.1'], ports: [{ name: 'https', port: 443, targetPort: 6443, protocol: 'TCP' }], ipFamilies: ['IPv4'], ipFamilyPolicy: 'SingleStack', sessionAffinity: 'None', internalTrafficPolicy: 'Cluster' }; k8sSvc.status = { loadBalancer: {} }; k8sSvc._endpoints = '172.18.0.2:6443';
  const cm = sys('ConfigMap', 'coredns', 'kube-system', null); cm.data = { Corefile: '.:53 {\n    errors\n    health {\n       lameduck 5s\n    }\n    ready\n    kubernetes cluster.local in-addr.arpa ip6.arpa {\n       pods insecure\n       fallthrough in-addr.arpa ip6.arpa\n       ttl 30\n    }\n    prometheus :9153\n    forward . /etc/resolv.conf {\n       max_concurrent 1000\n    }\n    cache 30\n    loop\n    reload\n    loadbalance\n}\n' };
  const kp = sys('ConfigMap', 'kube-proxy', 'kube-system', null); kp.data = { 'config.conf': 'apiVersion: kubeproxy.config.k8s.io/v1alpha1\nkind: KubeProxyConfiguration\nmode: iptables\nclusterCIDR: 10.244.0.0/16\n', 'kubeconfig.conf': 'apiVersion: v1\nkind: Config\nclusters:\n- cluster:\n    server: https://netops-control-plane:6443\n  name: default\n' };
  ['default', 'kube-system', 'netops', 'kube-public', 'kube-node-lease', 'ingress-nginx', 'local-path-storage'].forEach(ns => { const sa = sys('ServiceAccount', 'default', ns, null); sa.metadata._ct = ns === 'netops' ? -8640 : T; });
  ['coredns', 'kube-proxy', 'kindnet'].forEach(n => sys('ServiceAccount', n, 'kube-system', null));
  const sc = sys('StorageClass', 'standard', null, null); sc.metadata.annotations = { 'storageclass.kubernetes.io/is-default-class': 'true' }; sc.provisioner = 'rancher.io/local-path'; sc.reclaimPolicy = 'Delete'; sc.volumeBindingMode = 'WaitForFirstConsumer';
  const kr = sys('ConfigMap', 'kube-root-ca.crt', 'default', null); kr.data = { 'ca.crt': '-----BEGIN CERTIFICATE-----\nMIIDBTCCAe2gAwIBAgIIJ3t...lab...\n-----END CERTIFICATE-----\n' };
  const kr2 = sys('ConfigMap', 'kube-root-ca.crt', 'netops', null); kr2.data = simk8Clone(kr.data); kr2.metadata._ct = -8640;
  simk8Reconcile(null, st);
  return st;
}
function SIMK8_load(sh) {
  const n = sh.node(SIMK8_STATE);
  if (n && n.t === 'f') { try { const st = JSON.parse(n.d); if (st && st.objects) return st; } catch (e) { /* bozuk */ } }
  const st = simk8Fresh();
  SIMK8_save(sh, st);
  return st;
}
function SIMK8_save(sh, st) {
  const n = sh.node(SIMK8_STATE);
  if (n && n.t === 'f') n.d = JSON.stringify(st); else sh.install(SIMK8_STATE, mkfile(JSON.stringify(st), 0o600, 'root'));
}
function simk8CurrentNs(st) { return (st.contexts[st.context] || {}).namespace || 'default'; }
function simk8Owner(st, o) { const r = (o.metadata.ownerReferences || [])[0]; if (!r) return null; return st.objects.find(x => x.metadata.uid === r.uid) || null; }
function simk8Owned(st, o, kind) { return st.objects.filter(x => x.kind === kind && (x.metadata.ownerReferences || []).some(r => r.uid === o.metadata.uid)); }
function simk8SelectorMatch(sel, labels) {
  if (!sel) return false;
  const ml = sel.matchLabels || sel;
  if (sel.matchLabels || !sel.matchExpressions) { for (const [k, v] of Object.entries(ml)) if ((labels || {})[k] !== v) return false; }
  for (const e of (sel.matchExpressions || [])) { const v = (labels || {})[e.key]; if (e.operator === 'In' && !(e.values || []).includes(v)) return false; if (e.operator === 'NotIn' && (e.values || []).includes(v)) return false; if (e.operator === 'Exists' && v === undefined) return false; if (e.operator === 'DoesNotExist' && v !== undefined) return false; }
  return true;
}
function simk8LabelSel(expr, labels) {
  /* -l app=web,tier!=db,env in (a,b),!foo */
  if (!expr) return true;
  const parts = []; let cur = ''; let depth = 0;
  for (const ch of expr) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { parts.push(cur); cur = ''; } else cur += ch; }
  parts.push(cur);
  for (let p of parts) {
    p = p.trim(); if (!p) continue; let m;
    if ((m = /^(\S+)\s+notin\s+\((.*)\)$/.exec(p))) { if (m[2].split(',').map(x => x.trim()).includes((labels || {})[m[1]])) return false; continue; }
    if ((m = /^(\S+)\s+in\s+\((.*)\)$/.exec(p))) { if (!m[2].split(',').map(x => x.trim()).includes((labels || {})[m[1]])) return false; continue; }
    if ((m = /^([^!=]+)!=(.*)$/.exec(p))) { if ((labels || {})[m[1].trim()] === m[2].trim()) return false; continue; }
    if ((m = /^([^!=]+)==?(.*)$/.exec(p))) { if ((labels || {})[m[1].trim()] !== m[2].trim()) return false; continue; }
    if (p.startsWith('!')) { if ((labels || {})[p.slice(1)] !== undefined) return false; continue; }
    if ((labels || {})[p] === undefined) return false;
  }
  return true;
}
function simk8ImageKnown(sh, image) {
  if (!image) return false;
  if (/^(registry\.k8s\.io|docker\.io\/kindest|quay\.io|ghcr\.io)\//.test(image)) return true;
  if (typeof SIMDK_imageKnown === 'function' && sh) return SIMDK_imageKnown(sh, image);
  return true;
}
function simk8IsLabApp(image) { return /^registry\.lab\/netauto|^netauto:/.test(image || ''); }
function simk8Containers(pod) { return (pod.spec && pod.spec.containers) || []; }

/* ---------- reconcile ---------- */
function simk8Pct(v, total) { if (typeof v === 'string' && v.endsWith('%')) return Math.round(parseInt(v, 10) / 100 * total * 1000) / 1000; return parseInt(v, 10) || 0; }
function simk8TemplateHash(tpl) { return simk8Suffix('tpl:' + JSON.stringify(tpl), 10); }
function simk8PodRequests(pod) {
  let cpu = 0, mem = 0;
  simk8Containers(pod).forEach(c => { const r = (c.resources || {}).requests || {}; cpu += simk8Quantity(r.cpu); mem += simk8Quantity(r.memory); });
  return { cpu, mem };
}
function simk8NewPod(st, rs, tplOverride) {
  const tpl = tplOverride || rs.spec.template;
  const name = rs.kind === 'Job' ? `${rs.metadata.name}-${simk8Rand(5)}` : `${rs.metadata.name}-${simk8Rand(5)}`;
  const p = simk8Obj(st, 'Pod', rs.metadata.namespace, name, simk8Clone(tpl.spec || {}));
  p.metadata.labels = simk8Clone((tpl.metadata || {}).labels || {});
  if (rs.kind === 'Job') { p.metadata.labels['batch.kubernetes.io/controller-uid'] = rs.metadata.uid; p.metadata.labels['batch.kubernetes.io/job-name'] = rs.metadata.name; p.metadata.labels['controller-uid'] = rs.metadata.uid; p.metadata.labels['job-name'] = rs.metadata.name; }
  p.metadata.annotations = simk8Clone((tpl.metadata || {}).annotations || {});
  p.metadata.generateName = rs.metadata.name + '-';
  p.metadata.ownerReferences = [{ apiVersion: rs.apiVersion, kind: rs.kind, name: rs.metadata.name, uid: rs.metadata.uid, controller: true, blockOwnerDeletion: true }];
  p._p = { startTick: null, node: null, ip: null, restarts: 0, created: st.tick };
  simk8Event(st, p, 'Normal', rs.kind === 'Job' ? 'SuccessfulCreate' : 'SuccessfulCreate', `Created pod: ${name}`, rs.kind === 'Job' ? 'job-controller' : 'replicaset-controller');
  simk8Event(st, rs, 'Normal', 'SuccessfulCreate', `Created pod: ${name}`, rs.kind === 'Job' ? 'job-controller' : 'replicaset-controller');
  return p;
}
function simk8Schedule(sh, st, p) {
  const req = simk8PodRequests(p);
  const tolerates = (p.spec.tolerations || []).some(t => t.operator === 'Exists' || t.key === 'node-role.kubernetes.io/control-plane');
  const nodes = SIMK8_NODES.filter(n => !n.taint || tolerates);
  const fits = [];
  const reasons = [];
  for (const n of SIMK8_NODES) {
    if (n.taint && !tolerates) { reasons.push(`1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }`); continue; }
    if (p.spec.nodeSelector && Object.entries(p.spec.nodeSelector).some(([k, v]) => { const no = SIMK8_find(st, 'Node', null, n.name); return (no.metadata.labels || {})[k] !== v; })) { reasons.push(`1 node(s) didn't match Pod's node affinity/selector`); continue; }
    const others = st.objects.filter(o => o.kind === 'Pod' && o !== p && o._p && o._p.node === n.name && !simk8PodDone(o));
    const used = others.reduce((a, o) => { const r = simk8PodRequests(o); a.cpu += r.cpu; a.mem += r.mem; return a; }, { cpu: 0, mem: 0 });
    const cpuOk = used.cpu + req.cpu <= n.cpu / 1000; const memOk = used.mem + req.mem <= n.mem;
    if (!cpuOk) reasons.push('1 Insufficient cpu');
    if (!memOk) reasons.push('1 Insufficient memory');
    if (cpuOk && memOk) fits.push(n);
  }
  void nodes;
  if (!fits.length) {
    const agg = {}; reasons.forEach(r => { const k = r.replace(/^1 /, ''); agg[k] = (agg[k] || 0) + 1; });
    const msg = `0/${SIMK8_NODES.length} nodes are available: ${Object.entries(agg).map(([k, v]) => `${v} ${k}`).join(', ')}. preemption: 0/${SIMK8_NODES.length} nodes are available: ${Object.keys(agg).some(k => /Insufficient/.test(k)) ? `${SIMK8_NODES.length} No preemption victims found for incoming pod` : `${SIMK8_NODES.length} Preemption is not helpful for scheduling`}.`;
    simk8Event(st, p, 'Warning', 'FailedScheduling', msg, 'default-scheduler');
    p._p.unschedulable = msg;
    return false;
  }
  const n = fits.find(x => !x.taint) || fits[0];
  p._p.node = n.name; p.spec.nodeName = n.name; p._p.startTick = st.tick; p._p.unschedulable = null;
  p._p.ip = p.spec.hostNetwork ? n.ip : `10.244.${n.name.endsWith('worker') ? 1 : 0}.${st.ipNext++}`;
  if (st.ipNext > 250) st.ipNext = 5;
  simk8Event(st, p, 'Normal', 'Scheduled', `Successfully assigned ${p.metadata.namespace}/${p.metadata.name} to ${n.name}`, 'default-scheduler');
  return true;
}
function simk8PodDone(p) { const s = p._p || {}; return s.phase === 'Succeeded' || s.phase === 'Failed'; }
/* Pod'un anlik goruntusunu hesaplar, {phase, status, ready, total, restarts, readyBool, containers:[{name, state, ready, restarts, reason, message}]} */
function simk8PodView(sh, st, p) {
  const s = p._p || {}; const conts = simk8Containers(p); const total = Math.max(1, conts.length);
  if (s.sys) return { phase: 'Running', status: 'Running', ready: total, total, restarts: s.restarts || 0, readyBool: true, containers: conts.map(c => ({ name: c.name, image: c.image, state: 'Running', ready: true, restarts: 0 })), since: s.startTick };
  if (p.metadata._deleting) return { phase: 'Running', status: 'Terminating', ready: 0, total, restarts: s.restarts || 0, readyBool: false, containers: conts.map(c => ({ name: c.name, image: c.image, state: 'Terminated', ready: false, restarts: 0 })) };
  if (s.node === null || s.node === undefined) return { phase: 'Pending', status: 'Pending', ready: 0, total, restarts: 0, readyBool: false, containers: conts.map(c => ({ name: c.name, image: c.image, state: 'Waiting', reason: 'ContainerCreating', ready: false, restarts: 0 })), pending: true };
  const age = st.tick - s.startTick - 1;
  const isJob = (p.metadata.ownerReferences || []).some(r => r.kind === 'Job') || p.spec.restartPolicy === 'Never' || p.spec.restartPolicy === 'OnFailure';
  const views = conts.map(c => {
    const v = { name: c.name, image: c.image, state: 'Waiting', reason: 'ContainerCreating', ready: false, restarts: 0 };
    const imageOk = simk8ImageKnown(sh, c.image);
    const lab = simk8IsLabApp(c.image);
    const cfgErr = simk8ConfigError(st, p, c);
    const env = simk8ContainerEnv(st, p, c);
    const crash = (c.command && /^crash$/.test(c.command[0] || '')) || (c.args && c.args[0] === 'crash') || env.CRASH === '1' || env.CRASH === 'true';
    let labRun = null;
    if (lab && imageOk && !crash && typeof SIMDK_imageRecord === 'function' && sh) { const rec = SIMDK_imageRecord(sh, c.image); if (rec && rec.files) { const argv = (c.command || (rec.config && rec.config.Entrypoint) || []).concat(c.args || (c.command ? [] : (rec.config && rec.config.Cmd) || [])); const script = argv.find(x => /\.py$/.test(x)); const wd = (rec.config && rec.config.WorkingDir) || '/app'; const src = script ? (rec.files[(wd + '/' + script).replace(/^\//, '').replace(/\/+/g, '/')] !== undefined ? rec.files[(wd + '/' + script).replace(/^\//, '').replace(/\/+/g, '/')] : rec.files[script.replace(/^\//, '')]) : undefined; if (script) labRun = SIMDK_runProgram(src, rec.files, Object.assign({ __WORKDIR: wd }, env), argv.slice(argv.indexOf(script))); } }
    const labCrash = labRun && labRun.exit !== null && labRun.exit !== 0;
    if (age < 1) { return v; }
    delete v.reason;
    if (!imageOk) { v.state = 'Waiting'; v.reason = age < 2 ? 'ErrImagePull' : 'ImagePullBackOff'; v.message = age < 2 ? `rpc error: code = NotFound desc = failed to pull and unpack image "${simk8FullImage(c.image)}": failed to resolve reference "${simk8FullImage(c.image)}": ${simk8FullImage(c.image)}: not found` : `Back-off pulling image "${c.image}"`; return v; }
    if (cfgErr) { v.state = 'Waiting'; v.reason = 'CreateContainerConfigError'; v.message = cfgErr; return v; }
    if (crash || labCrash) {
      const exitCode = labCrash ? labRun.exit : 1;
      if (age === 1) { v.state = 'Running'; v.ready = !simk8HasReadiness(c); return v; }
      if (age === 2) { v.state = 'Terminated'; v.reason = 'Error'; v.exitCode = exitCode; v.restarts = 1; return v; }
      v.state = 'Waiting'; v.reason = 'CrashLoopBackOff'; v.exitCode = exitCode; v.restarts = 1 + Math.floor((age - 2) / 2); v.message = `back-off ${Math.min(300, 10 * Math.pow(2, v.restarts - 1))}s restarting failed container=${c.name} pod=${p.metadata.name}_${p.metadata.namespace}(${p.metadata.uid})`;
      v.lastExit = exitCode; return v;
    }
    if (isJob) { if (age >= 3) { v.state = 'Terminated'; v.reason = 'Completed'; v.exitCode = 0; return v; } v.state = 'Running'; v.ready = true; return v; }
    v.state = 'Running';
    const liveFail = simk8ProbeFails(c, c.livenessProbe);
    const readyFail = simk8ProbeFails(c, c.readinessProbe);
    if (liveFail && age >= 3) { v.restarts = Math.floor((age - 3) / 3) + 1; v.liveFail = true; v.ready = false; if ((age - 3) % 3 === 0) { v.state = 'Running'; } return v; }
    if (c.readinessProbe) v.ready = !readyFail && age >= 2; else v.ready = true;
    return v;
  });
  const restarts = Math.max(0, ...views.map(v => v.restarts || 0));
  let status = 'Running'; let phase = 'Running';
  const w = views.find(v => v.state === 'Waiting'); const t = views.find(v => v.state === 'Terminated');
  if (views.every(v => v.state === 'Terminated' && v.reason === 'Completed')) { status = 'Completed'; phase = 'Succeeded'; }
  else if (w && w.reason === 'ContainerCreating') { status = 'ContainerCreating'; phase = 'Pending'; }
  else if (w) { status = w.reason; phase = (w.reason === 'ErrImagePull' || w.reason === 'ImagePullBackOff' || w.reason === 'CreateContainerConfigError') ? 'Pending' : 'Running'; }
  else if (t && t.reason === 'Error') { status = 'Error'; phase = isJob ? 'Failed' : 'Running'; }
  const readyN = views.filter(v => v.ready).length;
  if (p._p) { p._p.phase = phase; p._p.lastStatus = status; if (status === 'CrashLoopBackOff' || status === 'Error') p._p.lastRestartTick = s.startTick + 2 + (restarts - 1) * 2; else if (views.some(v => v.liveFail)) p._p.lastRestartTick = s.startTick + 3 + (restarts - 1) * 3; }
  return { phase, status, ready: readyN, total, restarts, readyBool: readyN === total && status === 'Running', containers: views, since: s.startTick, labRun: views.length ? null : null };
}
function simk8FullImage(img) { if (/^[\w.-]+\.[a-z]+\//.test(img) || img.startsWith('localhost')) return img; const parts = img.split('/'); if (parts.length === 1) return `docker.io/library/${img}`; return `docker.io/${img}`; }
function simk8HasReadiness(c) { return !!c.readinessProbe; }
function simk8ProbeFails(c, probe) {
  if (!probe) return false;
  const lab = simk8IsLabApp(c.image); const nginx = /^nginx/.test(c.image); const port = (c.ports || []).map(x => x.containerPort);
  if (probe.httpGet) {
    const path = probe.httpGet.path || '/'; const pport = probe.httpGet.port;
    const portOk = typeof pport === 'string' && !/^\d+$/.test(pport) ? (c.ports || []).some(x => x.name === pport) : (lab ? String(pport) === '8080' || !port.length || port.includes(parseInt(pport, 10)) : (nginx ? String(pport) === '80' : port.includes(parseInt(pport, 10))));
    if (!portOk) return true;
    if (lab) return !/^\/(healthz|ready|health|livez|readyz|)?$/.test(path);
    if (nginx) return !/^\/(index\.html)?$/.test(path);
    return true;
  }
  if (probe.tcpSocket) { const pp = probe.tcpSocket.port; if (lab) return String(pp) !== '8080'; if (nginx) return String(pp) !== '80'; if (/^redis/.test(c.image)) return String(pp) !== '6379'; if (/^postgres/.test(c.image)) return String(pp) !== '5432'; return !port.includes(parseInt(pp, 10)); }
  if (probe.exec) { const cmd = (probe.exec.command || []).join(' '); return /false|exit 1/.test(cmd); }
  if (probe.grpc) return !lab;
  return false;
}
function simk8ConfigError(st, p, c) {
  const ns = p.metadata.namespace;
  for (const ef of (c.envFrom || [])) {
    if (ef.configMapRef && !SIMK8_find(st, 'ConfigMap', ns, ef.configMapRef.name) && !ef.configMapRef.optional) return `configmap "${ef.configMapRef.name}" not found`;
    if (ef.secretRef && !SIMK8_find(st, 'Secret', ns, ef.secretRef.name) && !ef.secretRef.optional) return `secret "${ef.secretRef.name}" not found`;
  }
  for (const e of (c.env || [])) {
    const vf = e.valueFrom || {};
    if (vf.configMapKeyRef) { const cm = SIMK8_find(st, 'ConfigMap', ns, vf.configMapKeyRef.name); if (!cm && !vf.configMapKeyRef.optional) return `configmap "${vf.configMapKeyRef.name}" not found`; if (cm && (cm.data || {})[vf.configMapKeyRef.key] === undefined && !vf.configMapKeyRef.optional) return `couldn't find key ${vf.configMapKeyRef.key} in ConfigMap ${ns}/${vf.configMapKeyRef.name}`; }
    if (vf.secretKeyRef) { const sec = SIMK8_find(st, 'Secret', ns, vf.secretKeyRef.name); if (!sec && !vf.secretKeyRef.optional) return `secret "${vf.secretKeyRef.name}" not found`; if (sec && (sec.data || {})[vf.secretKeyRef.key] === undefined && (sec.stringData || {})[vf.secretKeyRef.key] === undefined && !vf.secretKeyRef.optional) return `couldn't find key ${vf.secretKeyRef.key} in Secret ${ns}/${vf.secretKeyRef.name}`; }
  }
  for (const v of (p.spec.volumes || [])) {
    if (v.configMap && !SIMK8_find(st, 'ConfigMap', ns, v.configMap.name) && !v.configMap.optional) return `configmap "${v.configMap.name}" not found`;
    if (v.secret && !SIMK8_find(st, 'Secret', ns, v.secret.secretName) && !v.secret.optional) return `secret "${v.secret.secretName}" not found`;
  }
  return null;
}
function simk8B64d(s) { try { return typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('utf8'); } catch (e) { return s; } }
function simk8B64e(s) { try { return typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64'); } catch (e) { return s; } }
function simk8ContainerEnv(st, p, c) {
  const env = {}; const ns = p.metadata.namespace;
  for (const ef of (c.envFrom || [])) {
    if (ef.configMapRef) { const cm = SIMK8_find(st, 'ConfigMap', ns, ef.configMapRef.name); if (cm) Object.entries(cm.data || {}).forEach(([k, v]) => { env[(ef.prefix || '') + k] = String(v); }); }
    if (ef.secretRef) { const sec = SIMK8_find(st, 'Secret', ns, ef.secretRef.name); if (sec) { Object.entries(sec.data || {}).forEach(([k, v]) => { env[(ef.prefix || '') + k] = simk8B64d(v); }); Object.entries(sec.stringData || {}).forEach(([k, v]) => { env[(ef.prefix || '') + k] = String(v); }); } }
  }
  for (const e of (c.env || [])) {
    if (e.value !== undefined) { env[e.name] = String(e.value); continue; }
    const vf = e.valueFrom || {};
    if (vf.configMapKeyRef) { const cm = SIMK8_find(st, 'ConfigMap', ns, vf.configMapKeyRef.name); if (cm && (cm.data || {})[vf.configMapKeyRef.key] !== undefined) env[e.name] = String(cm.data[vf.configMapKeyRef.key]); }
    if (vf.secretKeyRef) { const sec = SIMK8_find(st, 'Secret', ns, vf.secretKeyRef.name); if (sec) { if ((sec.data || {})[vf.secretKeyRef.key] !== undefined) env[e.name] = simk8B64d(sec.data[vf.secretKeyRef.key]); else if ((sec.stringData || {})[vf.secretKeyRef.key] !== undefined) env[e.name] = String(sec.stringData[vf.secretKeyRef.key]); } }
    if (vf.fieldRef) { const f = vf.fieldRef.fieldPath; env[e.name] = f === 'metadata.name' ? p.metadata.name : (f === 'metadata.namespace' ? ns : (f === 'status.podIP' ? (p._p && p._p.ip) || '' : (f === 'spec.nodeName' ? (p._p && p._p.node) || '' : ''))); }
  }
  return env;
}
function simk8PodLogs(sh, st, p, c) {
  const v = simk8PodView(sh, st, p);
  const cv = v.containers.find(x => x.name === c.name) || v.containers[0];
  const env = simk8ContainerEnv(st, p, c);
  const lines = [];
  const lab = simk8IsLabApp(c.image);
  if (lab && typeof SIMDK_imageRecord === 'function') {
    const rec = SIMDK_imageRecord(sh, c.image);
    if (rec && rec.files) {
      const argv = (c.command || (rec.config && rec.config.Entrypoint) || []).concat(c.args || (c.command ? [] : (rec.config && rec.config.Cmd) || []));
      const script = argv.find(x => /\.py$/.test(x)); const wd = (rec.config && rec.config.WorkingDir) || '/app';
      if (script) { const key = (wd + '/' + script).replace(/^\//, '').replace(/\/+/g, '/'); const src = rec.files[key] !== undefined ? rec.files[key] : rec.files[script.replace(/^\//, '')]; const r = SIMDK_runProgram(src, rec.files, Object.assign({ __WORKDIR: wd }, env), argv.slice(argv.indexOf(script))); r.lines.forEach(l => lines.push(l.t)); if (env.CRASH === '1') lines.push('fatal: CRASH=1 set, exiting'); return lines; }
    }
  }
  if (c.command && c.command[0] === 'crash') { lines.push('panic: simulated crash: service exited with code 1'); return lines; }
  if (env.CRASH === '1' || env.CRASH === 'true') { lines.push(`${c.name} starting`, 'fatal: CRASH=1 set, exiting'); return lines; }
  if (/^nginx/.test(c.image)) { lines.push('/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration', '/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/', '/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh', '10-listen-on-ipv6-by-default.sh: info: Getting the checksum of /etc/nginx/conf.d/default.conf', '10-listen-on-ipv6-by-default.sh: info: Enabled listen on IPv6 in /etc/nginx/conf.d/default.conf', '/docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh', '/docker-entrypoint.sh: Launching /docker-entrypoint.d/30-tune-worker-processes.sh', '/docker-entrypoint.sh: Configuration complete; ready for start up', `${simk8Iso(st, v.since || 0).replace('T', ' ').slice(0, 19)} [notice] 1#1: using the "epoll" event method`, `${simk8Iso(st, v.since || 0).replace('T', ' ').slice(0, 19)} [notice] 1#1: nginx/1.27.2`, `${simk8Iso(st, v.since || 0).replace('T', ' ').slice(0, 19)} [notice] 1#1: start worker processes`); if (c.livenessProbe || c.readinessProbe) { for (let i = 0; i < Math.min(6, st.tick - (v.since || 0)); i++) { const fail = simk8ProbeFails(c, c.readinessProbe || c.livenessProbe); const path = ((c.readinessProbe || c.livenessProbe).httpGet || {}).path || '/'; lines.push(`10.244.1.1 - - [${simk8Iso(st, (v.since || 0) + i).replace('T', ':').slice(0, 19)} +0000] "GET ${path} HTTP/1.1" ${fail ? 404 : 200} ${fail ? 153 : 615} "-" "kube-probe/1.31"`); } } return lines; }
  if (/^redis/.test(c.image)) { const ts = simk8Iso(st, v.since || 0); lines.push(`1:C ${ts} * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo`, `1:C ${ts} * Redis version=7.4.1, bits=64, commit=00000000, modified=0, pid=1, just started`, `1:M ${ts} * Running mode=standalone, port=6379.`, `1:M ${ts} * Server initialized`, `1:M ${ts} * Ready to accept connections tcp`); return lines; }
  if (/^postgres/.test(c.image)) { if (!env.POSTGRES_PASSWORD) { lines.push('Error: Database is uninitialized and superuser password is not specified.', '       You must specify POSTGRES_PASSWORD to a non-empty value for the', '       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".'); return lines; } lines.push('PostgreSQL init process complete; ready for start up.', 'LOG:  database system is ready to accept connections'); return lines; }
  if (/^(busybox|alpine|ubuntu)/.test(c.image)) { const cmd = (c.command || []).concat(c.args || []).join(' '); const m = /echo\s+["']?([^"';]+)["']?/.exec(cmd); if (m) { const n = /sleep/.test(cmd) ? Math.min(5, st.tick - (v.since || 0) + 1) : 1; for (let i = 0; i < n; i++) lines.push(m[1].trim()); } else if (/date/.test(cmd)) lines.push(simk8Human(st, v.since || 0)); else if (/backup|tar|pg_dump|rsync|cp /.test(cmd)) lines.push(`backup started ${simk8Iso(st, v.since || 0)}`, 'archiving /data to /backup/netauto-' + simk8Iso(st, v.since || 0).slice(0, 10) + '.tar.gz', 'backup complete, 3 files, 12kB'); return lines; }
  if (cv && (cv.reason === 'ImagePullBackOff' || cv.reason === 'ErrImagePull' || cv.reason === 'ContainerCreating' || cv.reason === 'CreateContainerConfigError')) return null;
  lines.push(`${c.name} started`);
  return lines;
}
function simk8Reconcile(sh, st) {
  /* Deployment -> ReplicaSet */
  for (const d of st.objects.filter(o => o.kind === 'Deployment')) {
    if (d._sys) continue;
    d.metadata.generation = d.metadata.generation || 1;
    const rss = simk8Owned(st, d, 'ReplicaSet');
    const hash = simk8TemplateHash(d.spec.template);
    let newRs = rss.find(r => r._hash === hash);
    const key = `${d.metadata.namespace}/${d.metadata.name}`;
    st.revisions[key] = st.revisions[key] || [];
    if (!newRs) {
      const rev = (st.revisions[key].length ? Math.max(...st.revisions[key].map(r => r.rev)) : 0) + 1;
      newRs = simk8Obj(st, 'ReplicaSet', d.metadata.namespace, `${d.metadata.name}-${hash}`, { replicas: 0, selector: { matchLabels: Object.assign({}, (d.spec.selector || {}).matchLabels || {}, { 'pod-template-hash': hash }) }, template: simk8Clone(d.spec.template) });
      newRs.spec.template.metadata = newRs.spec.template.metadata || {}; newRs.spec.template.metadata.labels = Object.assign({}, newRs.spec.template.metadata.labels || {}, { 'pod-template-hash': hash });
      newRs.metadata.labels = Object.assign({}, (d.spec.template.metadata || {}).labels || {}, { 'pod-template-hash': hash });
      newRs.metadata.annotations = { 'deployment.kubernetes.io/desired-replicas': String(d.spec.replicas), 'deployment.kubernetes.io/max-replicas': String(d.spec.replicas + 1), 'deployment.kubernetes.io/revision': String(rev) };
      if ((d.metadata.annotations || {})['kubernetes.io/change-cause']) newRs.metadata.annotations['kubernetes.io/change-cause'] = d.metadata.annotations['kubernetes.io/change-cause'];
      newRs.metadata.ownerReferences = [{ apiVersion: 'apps/v1', kind: 'Deployment', name: d.metadata.name, uid: d.metadata.uid, controller: true, blockOwnerDeletion: true }];
      newRs._hash = hash; newRs._rev = rev;
      st.revisions[key].push({ rev, template: simk8Clone(d.spec.template), cause: (d.metadata.annotations || {})['kubernetes.io/change-cause'] || null, rs: newRs.metadata.name });
      d.metadata.annotations = d.metadata.annotations || {}; d.metadata.annotations['deployment.kubernetes.io/revision'] = String(rev);
      d._rolloutStart = st.tick;
      rss.push(newRs);
    } else if (newRs._rev && String(newRs._rev) !== (d.metadata.annotations || {})['deployment.kubernetes.io/revision']) {
      /* undo ile eski rs'e donus, revizyon numarasi artar */
      const rev = Math.max(...st.revisions[key].map(r => r.rev)) + 1;
      newRs._rev = rev; newRs.metadata.annotations['deployment.kubernetes.io/revision'] = String(rev);
      const old = st.revisions[key].find(r => r.rs === newRs.metadata.name); if (old) old.rev = rev;
      d.metadata.annotations = d.metadata.annotations || {}; d.metadata.annotations['deployment.kubernetes.io/revision'] = String(rev);
      d._rolloutStart = st.tick;
    }
    const olds = rss.filter(r => r !== newRs);
    const replicas = d.spec.replicas == null ? 1 : d.spec.replicas;
    const strat = d.spec.strategy || { type: 'RollingUpdate' };
    const ru = strat.rollingUpdate || {};
    let surge = simk8Pct(ru.maxSurge == null ? '25%' : ru.maxSurge, replicas); let unavail = simk8Pct(ru.maxUnavailable == null ? '25%' : ru.maxUnavailable, replicas);
    surge = Math.ceil(surge); unavail = Math.floor(unavail); if (surge === 0 && unavail === 0) unavail = 1;
    const podsOf = r => simk8Owned(st, r, 'Pod').filter(p => !p.metadata._deleting);
    const readyOf = r => podsOf(r).filter(p => simk8PodView(sh, st, p).readyBool).length;
    const wasOld = olds.reduce((n, r) => n + r.spec.replicas, 0);
    if (strat.type === 'Recreate') {
      if (wasOld > 0) { olds.forEach(r => { if (r.spec.replicas) { r.spec.replicas = 0; simk8Event(st, d, 'Normal', 'ScalingReplicaSet', `Scaled down replica set ${r.metadata.name} to 0 from ${wasOld}`, 'deployment-controller'); } }); }
      else if (olds.every(r => podsOf(r).length === 0) && newRs.spec.replicas !== replicas) { const from = newRs.spec.replicas; newRs.spec.replicas = replicas; simk8Event(st, d, 'Normal', 'ScalingReplicaSet', `Scaled ${replicas > from ? 'up' : 'down'} replica set ${newRs.metadata.name} to ${replicas} from ${from}`, 'deployment-controller'); }
    } else {
      const total = rss.reduce((n, r) => n + r.spec.replicas, 0);
      const maxTotal = replicas + surge;
      if (newRs.spec.replicas < replicas) {
        const target = Math.min(replicas, newRs.spec.replicas + Math.max(0, maxTotal - total));
        if (target > newRs.spec.replicas) { const from = newRs.spec.replicas; newRs.spec.replicas = target; simk8Event(st, d, 'Normal', 'ScalingReplicaSet', `Scaled up replica set ${newRs.metadata.name} to ${target}${from ? ` from ${from}` : ''}`, 'deployment-controller'); }
      } else if (newRs.spec.replicas > replicas) { const from = newRs.spec.replicas; newRs.spec.replicas = replicas; simk8Event(st, d, 'Normal', 'ScalingReplicaSet', `Scaled down replica set ${newRs.metadata.name} to ${replicas} from ${from}`, 'deployment-controller'); }
      /* eski rs'leri azalt */
      const totalAvail = rss.reduce((n, r) => n + readyOf(r), 0);
      const minAvail = replicas - unavail;
      let canScaleDown = Math.max(0, totalAvail - minAvail);
      /* once hazir olmayan eski pod'lar */
      for (const r of olds) {
        if (!r.spec.replicas) continue;
        const notReady = podsOf(r).length - readyOf(r);
        let down = Math.min(r.spec.replicas, notReady + canScaleDown);
        if (down <= 0) continue;
        canScaleDown -= Math.max(0, down - notReady);
        const from = r.spec.replicas; r.spec.replicas = Math.max(0, r.spec.replicas - down);
        simk8Event(st, d, 'Normal', 'ScalingReplicaSet', `Scaled down replica set ${r.metadata.name} to ${r.spec.replicas} from ${from}`, 'deployment-controller');
      }
    }
    /* eski bos rs'leri sakla, revision history limit 10 */
    const emptyOld = olds.filter(r => r.spec.replicas === 0 && podsOf(r).length === 0).sort((a, b) => (a._rev || 0) - (b._rev || 0));
    while (emptyOld.length > (d.spec.revisionHistoryLimit == null ? 10 : d.spec.revisionHistoryLimit)) { const r = emptyOld.shift(); st.objects.splice(st.objects.indexOf(r), 1); st.revisions[key] = st.revisions[key].filter(x => x.rs !== r.metadata.name); }
    /* status */
    const all = rss.flatMap(podsOf); const ready = all.filter(p => simk8PodView(sh, st, p).readyBool).length;
    d.status = { observedGeneration: d.metadata.generation, replicas: all.length, updatedReplicas: podsOf(newRs).length, readyReplicas: ready, availableReplicas: ready, unavailableReplicas: Math.max(0, replicas - ready) || undefined, conditions: [
      { type: 'Available', status: ready >= replicas - unavail && (replicas === 0 || ready > 0) ? 'True' : 'False', lastUpdateTime: simk8Iso(st, st.tick), lastTransitionTime: simk8Iso(st, d.metadata._ct), reason: ready >= replicas - unavail && (replicas === 0 || ready > 0) ? 'MinimumReplicasAvailable' : 'MinimumReplicasUnavailable', message: ready >= replicas - unavail && (replicas === 0 || ready > 0) ? 'Deployment has minimum availability.' : 'Deployment does not have minimum availability.' },
      { type: 'Progressing', status: st.tick - (d._rolloutStart || d.metadata._ct) > 60 && ready < replicas ? 'False' : 'True', lastUpdateTime: simk8Iso(st, st.tick), lastTransitionTime: simk8Iso(st, d._rolloutStart || d.metadata._ct), reason: ready >= replicas && podsOf(newRs).length === replicas && olds.every(r => podsOf(r).length === 0) ? 'NewReplicaSetAvailable' : (st.tick - (d._rolloutStart || d.metadata._ct) > 60 && ready < replicas ? 'ProgressDeadlineExceeded' : 'ReplicaSetUpdated'), message: ready >= replicas && podsOf(newRs).length === replicas && olds.every(r => podsOf(r).length === 0) ? `ReplicaSet "${newRs.metadata.name}" has successfully progressed.` : (st.tick - (d._rolloutStart || d.metadata._ct) > 60 && ready < replicas ? `ReplicaSet "${newRs.metadata.name}" has timed out progressing.` : `ReplicaSet "${newRs.metadata.name}" is progressing.`) },
    ] };
    if (!d.status.unavailableReplicas) delete d.status.unavailableReplicas;
  }
  /* ReplicaSet -> Pod */
  for (const r of st.objects.filter(o => o.kind === 'ReplicaSet')) {
    if (r._sys) continue;
    const pods = simk8Owned(st, r, 'Pod').filter(p => !p.metadata._deleting);
    const want = r.spec.replicas == null ? 1 : r.spec.replicas;
    while (simk8Owned(st, r, 'Pod').filter(p => !p.metadata._deleting).length < want) simk8NewPod(st, r);
    if (pods.length > want) {
      const sorted = pods.slice().sort((a, b) => { const va = simk8PodView(sh, st, a), vb = simk8PodView(sh, st, b); if (va.readyBool !== vb.readyBool) return va.readyBool ? 1 : -1; return b.metadata._ct - a.metadata._ct; });
      sorted.slice(0, pods.length - want).forEach(p => { simk8Event(st, r, 'Normal', 'SuccessfulDelete', `Deleted pod: ${p.metadata.name}`, 'replicaset-controller'); st.objects.splice(st.objects.indexOf(p), 1); });
    }
    const cur = simk8Owned(st, r, 'Pod').filter(p => !p.metadata._deleting);
    const ready = cur.filter(p => simk8PodView(sh, st, p).readyBool).length;
    r.status = { replicas: cur.length, fullyLabeledReplicas: cur.length, readyReplicas: ready, availableReplicas: ready, observedGeneration: r.metadata.generation || 1 };
  }
  /* Job -> Pod */
  for (const j of st.objects.filter(o => o.kind === 'Job')) {
    const pods = simk8Owned(st, j, 'Pod');
    if (!pods.length && !j._done) { const p = simk8NewPod(st, j); p.spec.restartPolicy = p.spec.restartPolicy || 'Never'; }
    const views = simk8Owned(st, j, 'Pod').map(p => simk8PodView(sh, st, p));
    const succeeded = views.filter(v => v.phase === 'Succeeded').length; const failed = views.filter(v => v.status === 'Error' || v.status === 'CrashLoopBackOff').length; const active = views.filter(v => v.phase !== 'Succeeded' && v.phase !== 'Failed' && v.status !== 'CrashLoopBackOff').length;
    j.status = { startTime: simk8Iso(st, j.metadata._ct), active: active || undefined, succeeded: succeeded || undefined, failed: failed || undefined, ready: views.filter(v => v.readyBool).length, uncountedTerminatedPods: {} };
    if (succeeded >= (j.spec.completions || 1)) { j._done = true; j.status.completionTime = simk8Iso(st, Math.max(j.metadata._ct + 3, ...simk8Owned(st, j, 'Pod').map(p => (p._p.startTick || p.metadata._ct) + 3))); j.status.conditions = [{ type: 'Complete', status: 'True', lastProbeTime: j.status.completionTime, lastTransitionTime: j.status.completionTime, reason: '', message: '' }]; delete j.status.active; if (!j._completedEvent) { simk8Event(st, j, 'Normal', 'Completed', 'Job completed', 'job-controller'); j._completedEvent = true; } }
    else if (failed >= (j.spec.backoffLimit == null ? 6 : j.spec.backoffLimit) + 1 && views.length) { j.status.conditions = [{ type: 'Failed', status: 'True', reason: 'BackoffLimitExceeded', message: 'Job has reached the specified backoff limit' }]; }
    Object.keys(j.status).forEach(k => { if (j.status[k] === undefined) delete j.status[k]; });
  }
  /* CronJob status */
  for (const cj of st.objects.filter(o => o.kind === 'CronJob')) { const jobs = simk8Owned(st, cj, 'Job'); cj.status = { active: jobs.filter(j => !j._done).map(j => ({ apiVersion: 'batch/v1', kind: 'Job', name: j.metadata.name, namespace: j.metadata.namespace, uid: j.metadata.uid })), lastScheduleTime: cj._lastSchedule != null ? simk8Iso(st, cj._lastSchedule) : undefined }; if (!cj.status.active.length) delete cj.status.active; if (!cj.status.lastScheduleTime) delete cj.status.lastScheduleTime; }
  /* Pod'lar */
  for (const p of st.objects.filter(o => o.kind === 'Pod')) {
    if (p._p && p._p.sys) continue;
    if (p.metadata._deleting) { if (st.tick - p.metadata._deleting >= 1) st.objects.splice(st.objects.indexOf(p), 1); continue; }
    if (!p._p) p._p = { startTick: null, node: null, ip: null, restarts: 0, created: st.tick };
    if (p._p.node == null) { if (!simk8Schedule(sh, st, p)) continue; }
    const v = simk8PodView(sh, st, p);
    const age = st.tick - p._p.startTick - 1;
    for (const c of simk8Containers(p)) {
      const cv = v.containers.find(x => x.name === c.name) || {};
      if (age <= 0 && !p._p[`pull_${c.name}`]) { simk8Event(st, p, 'Normal', 'Pulling', `Pulling image "${c.image}"`); p._p[`pull_${c.name}`] = true; }
      if (age >= 1) {
        if (cv.reason === 'ErrImagePull' || cv.reason === 'ImagePullBackOff') { simk8Event(st, p, 'Warning', 'Failed', `Failed to pull image "${c.image}": ${cv.reason === 'ErrImagePull' ? cv.message : `rpc error: code = NotFound desc = failed to pull and unpack image "${simk8FullImage(c.image)}": failed to resolve reference "${simk8FullImage(c.image)}": ${simk8FullImage(c.image)}: not found`}`); simk8Event(st, p, 'Warning', 'Failed', 'Error: ErrImagePull'); if (age >= 2) { simk8Event(st, p, 'Normal', 'BackOff', `Back-off pulling image "${c.image}"`); simk8Event(st, p, 'Warning', 'Failed', 'Error: ImagePullBackOff'); } continue; }
        if (!p._p[`pulled_${c.name}`]) { simk8Event(st, p, 'Normal', 'Pulled', simk8ImageKnown(sh, c.image) && /registry\.lab|:latest$/.test(c.image) && !p._p.cached ? `Successfully pulled image "${c.image}" in ${(1.2 + Math.random() * 2).toFixed(3)}s (${(1.2 + Math.random() * 2).toFixed(3)}s including waiting). Image size: ${simk8IsLabApp(c.image) ? '141MB' : '72MB'}.` : `Container image "${c.image}" already present on machine`); p._p[`pulled_${c.name}`] = true; }
        if (cv.reason === 'CreateContainerConfigError') { simk8Event(st, p, 'Warning', 'Failed', `Error: ${cv.message}`); continue; }
        if (!p._p[`created_${c.name}`]) { simk8Event(st, p, 'Normal', 'Created', `Created container ${c.name}`); simk8Event(st, p, 'Normal', 'Started', `Started container ${c.name}`); p._p[`created_${c.name}`] = true; }
        if (cv.reason === 'CrashLoopBackOff' || cv.reason === 'Error') { const e = simk8Event(st, p, 'Warning', 'BackOff', `Back-off restarting failed container ${c.name} in pod ${p.metadata.name}_${p.metadata.namespace}(${p.metadata.uid})`); void e; if (cv.restarts > (p._p[`restarts_${c.name}`] || 0)) { p._p[`restarts_${c.name}`] = cv.restarts; simk8Event(st, p, 'Normal', 'Pulled', `Container image "${c.image}" already present on machine`); simk8Event(st, p, 'Normal', 'Created', `Created container ${c.name}`); simk8Event(st, p, 'Normal', 'Started', `Started container ${c.name}`); } }
        if (cv.liveFail) { const path = (c.livenessProbe.httpGet || {}).path || '/'; simk8Event(st, p, 'Warning', 'Unhealthy', c.livenessProbe.httpGet ? `Liveness probe failed: HTTP probe failed with statuscode: 404` : (c.livenessProbe.tcpSocket ? `Liveness probe failed: dial tcp ${p._p.ip}:${c.livenessProbe.tcpSocket.port}: connect: connection refused` : 'Liveness probe failed: command failed')); simk8Event(st, p, 'Normal', 'Killing', `Container ${c.name} failed liveness probe, will be restarted`); void path; }
        if (c.readinessProbe && simk8ProbeFails(c, c.readinessProbe) && age >= 2) simk8Event(st, p, 'Warning', 'Unhealthy', c.readinessProbe.httpGet ? `Readiness probe failed: HTTP probe failed with statuscode: 404` : (c.readinessProbe.tcpSocket ? `Readiness probe failed: dial tcp ${p._p.ip}:${c.readinessProbe.tcpSocket.port}: connect: connection refused` : 'Readiness probe failed: command failed'));
      }
    }
  }
  /* Service */
  for (const s of st.objects.filter(o => o.kind === 'Service')) {
    s.spec = s.spec || {}; s.spec.type = s.spec.type || 'ClusterIP';
    if (!s.spec.clusterIP && s.spec.type !== 'ExternalName') { s.spec.clusterIP = `10.96.${(st.svcNext >> 8) & 255}.${st.svcNext & 255}`; st.svcNext += 1 + (parseInt(simk8Hash(s.metadata.name).slice(0, 2), 16) % 40); s.spec.clusterIPs = [s.spec.clusterIP]; }
    if (!s.spec.ipFamilies) { s.spec.ipFamilies = ['IPv4']; s.spec.ipFamilyPolicy = 'SingleStack'; s.spec.sessionAffinity = s.spec.sessionAffinity || 'None'; s.spec.internalTrafficPolicy = s.spec.internalTrafficPolicy || 'Cluster'; }
    (s.spec.ports || []).forEach(p => { p.protocol = p.protocol || 'TCP'; if (p.targetPort == null) p.targetPort = p.port; if ((s.spec.type === 'NodePort' || s.spec.type === 'LoadBalancer') && !p.nodePort) p.nodePort = st.nodePortNext++; if (s.spec.type === 'ClusterIP') delete p.nodePort; });
    s.status = s.status || { loadBalancer: {} };
    if (s.spec.type === 'LoadBalancer' && !s.status.loadBalancer.ingress && st.tick - s.metadata._ct >= 1) s.status.loadBalancer.ingress = [{ ip: '172.18.255.' + (200 + st.objects.indexOf(s) % 50) }];
    if (s._sys) continue;
    const ns = s.metadata.namespace;
    const pods = s.spec.selector ? st.objects.filter(o => o.kind === 'Pod' && o.metadata.namespace === ns && simk8SelectorMatch(s.spec.selector, o.metadata.labels) && !o.metadata._deleting) : [];
    const ready = pods.filter(p => simk8PodView(sh, st, p).readyBool);
    const notReady = pods.filter(p => !simk8PodView(sh, st, p).readyBool && simk8PodView(sh, st, p).phase !== 'Succeeded');
    s._endpoints = ready.map(p => ({ ip: p._p.ip, pod: p.metadata.name, node: p._p.node }));
    s._notReady = notReady.map(p => ({ ip: p._p && p._p.ip, pod: p.metadata.name, node: p._p && p._p.node }));
  }
  /* HPA */
  for (const h of st.objects.filter(o => o.kind === 'HorizontalPodAutoscaler')) {
    const ref = h.spec.scaleTargetRef || {};
    const target = SIMK8_find(st, ref.kind || 'Deployment', h.metadata.namespace, ref.name);
    h.status = h.status || { currentReplicas: 0, desiredReplicas: 0, conditions: [] };
    if (!target) { h.status.conditions = [{ type: 'AbleToScale', status: 'False', reason: 'FailedGetScale', message: `the HPA controller was unable to get the target's current scale: ${(ref.kind || 'deployments').toLowerCase()}s.apps "${ref.name}" not found` }]; h._cpu = null; continue; }
    const metric = (h.spec.metrics || [{ type: 'Resource', resource: { name: 'cpu', target: { type: 'Utilization', averageUtilization: h.spec.targetCPUUtilizationPercentage || 80 } } }])[0];
    const goal = metric.resource && metric.resource.target ? metric.resource.target.averageUtilization : 80;
    const pods = simk8Owned(st, target, 'ReplicaSet').flatMap(r => simk8Owned(st, r, 'Pod'));
    const reqCpu = simk8PodRequests({ spec: (target.spec.template || {}).spec || {} }).cpu;
    const hasReq = reqCpu > 0 && pods.some(p => simk8PodRequests(p).cpu > 0);
    const cur = target.spec.replicas == null ? 1 : target.spec.replicas;
    h.status.currentReplicas = cur;
    if (!hasReq) { h._cpu = null; h.status.desiredReplicas = cur; h.status.conditions = [{ type: 'AbleToScale', status: 'True', reason: 'SucceededGetScale', message: "the HPA controller was able to get the target's current scale" }, { type: 'ScalingActive', status: 'False', reason: 'FailedGetResourceMetric', message: 'the HPA was unable to compute the replica count: failed to get cpu utilization: missing request for cpu in container ' + ((simk8Containers({ spec: target.spec.template.spec })[0] || {}).name || 'app') + ' of Pod ' + (pods[0] ? pods[0].metadata.name : '') }]; h.metadata._warned = true; continue; }
    const loadOn = st.hpaLoad && st.tick - (st.hpaLoadSince || 0) >= 1;
    const perPodUse = loadOn ? Math.min(reqCpu * 1.9, reqCpu * (3.4 * (h.spec.minReplicas || 1) / Math.max(1, cur))) : reqCpu * 0.04;
    const util = Math.round(perPodUse / reqCpu * 100);
    h._cpu = util; h._perPod = perPodUse;
    let desired = Math.ceil(cur * util / goal);
    desired = Math.max(h.spec.minReplicas || 1, Math.min(h.spec.maxReplicas, desired));
    if (desired > cur) { if (st.tick - (h._lastScale || -99) >= 1) { desired = Math.min(desired, cur * 2, cur + 2); target.spec.replicas = desired; h._lastScale = st.tick; simk8Event(st, h, 'Normal', 'SuccessfulRescale', `New size: ${desired}; reason: cpu resource utilization (percentage of request) above target`, 'horizontal-pod-autoscaler'); simk8Event(st, target, 'Normal', 'ScalingReplicaSet', `Scaled up replica set ${target.metadata.name} to ${desired}`, 'deployment-controller'); } }
    else if (desired < cur) { if (!loadOn && st.tick - (st.hpaLoadStop || 0) >= 4 && st.tick - (h._lastScale || -99) >= 2) { target.spec.replicas = desired; h._lastScale = st.tick; simk8Event(st, h, 'Normal', 'SuccessfulRescale', `New size: ${desired}; reason: All metrics below target`, 'horizontal-pod-autoscaler'); } else desired = cur; }
    h.status.desiredReplicas = desired;
    h.status.currentMetrics = [{ type: 'Resource', resource: { name: 'cpu', current: { averageUtilization: util, averageValue: `${Math.round(perPodUse * 1000)}m` } } }];
    h.status.conditions = [{ type: 'AbleToScale', status: 'True', reason: 'ReadyForNewScale', message: 'recommended size matches current size' }, { type: 'ScalingActive', status: 'True', reason: 'ValidMetricFound', message: 'the HPA was able to successfully calculate a replica count from cpu resource utilization (percentage of request)' }, { type: 'ScalingLimited', status: desired >= h.spec.maxReplicas ? 'True' : 'False', reason: desired >= h.spec.maxReplicas ? 'TooManyReplicas' : 'DesiredWithinRange', message: desired >= h.spec.maxReplicas ? 'the desired replica count is more than the maximum replica count' : 'the desired count is within the acceptable range' }];
  }
  /* Ingress adresi */
  for (const i of st.objects.filter(o => o.kind === 'Ingress')) { if (st.tick - i.metadata._ct >= 1) i.status = { loadBalancer: { ingress: [{ hostname: 'localhost' }] } }; else i.status = { loadBalancer: {} }; }
  /* Pod status alanlari */
  for (const p of st.objects.filter(o => o.kind === 'Pod')) { const v = simk8PodView(sh, st, p); p.status = simk8PodStatus(st, p, v); }
}
function simk8PodStatus(st, p, v) {
  const s = p._p || {};
  const cs = v.containers.map(c => {
    const state = {};
    if (c.state === 'Running') state.running = { startedAt: simk8Iso(st, (s.startTick || st.tick) + 1 + (c.restarts || 0) * 2) };
    else if (c.state === 'Terminated') state.terminated = { exitCode: c.exitCode == null ? 1 : c.exitCode, reason: c.reason, startedAt: simk8Iso(st, (s.startTick || st.tick) + 1), finishedAt: simk8Iso(st, (s.startTick || st.tick) + (c.reason === 'Completed' ? 3 : 2)), containerID: `containerd://${simk8Hash(p.metadata.name + c.name)}` };
    else state.waiting = Object.assign({ reason: c.reason }, c.message ? { message: c.message } : {});
    const out = { name: c.name, image: c.image, imageID: c.state === 'Waiting' && c.reason !== 'CrashLoopBackOff' ? '' : `${simk8FullImage(c.image).split(':')[0]}@sha256:${simk8Hash('img' + c.image)}`, ready: !!c.ready, restartCount: c.restarts || 0, started: c.state === 'Running', state };
    if (c.reason === 'CrashLoopBackOff' || (c.restarts || 0) > 0) out.lastState = { terminated: { exitCode: c.lastExit == null ? (c.exitCode == null ? 1 : c.exitCode) : c.lastExit, reason: c.liveFail ? 'Completed' : 'Error', startedAt: simk8Iso(st, (s.startTick || st.tick) + 1), finishedAt: simk8Iso(st, (s.startTick || st.tick) + 2), containerID: `containerd://${simk8Hash(p.metadata.name + c.name + 'prev')}` } };
    if (c.state === 'Running' || c.state === 'Terminated') out.containerID = `containerd://${simk8Hash(p.metadata.name + c.name + (c.restarts || 0))}`;
    return out;
  });
  const cond = (type, status, reason) => Object.assign({ type, status, lastProbeTime: null, lastTransitionTime: simk8Iso(st, s.startTick == null ? p.metadata._ct : s.startTick) }, reason ? { reason } : {});
  const scheduled = s.node != null;
  const out = { phase: v.phase, conditions: scheduled ? [cond('PodReadyToStartContainers', v.status === 'ContainerCreating' ? 'False' : 'True'), cond('Initialized', 'True'), cond('Ready', v.readyBool ? 'True' : 'False', v.readyBool ? undefined : 'ContainersNotReady'), cond('ContainersReady', v.readyBool ? 'True' : 'False', v.readyBool ? undefined : 'ContainersNotReady'), cond('PodScheduled', 'True')] : [cond('PodScheduled', 'False', 'Unschedulable')], hostIP: scheduled ? (SIMK8_NODES.find(n => n.name === s.node) || {}).ip : undefined, podIP: scheduled && s.ip ? s.ip : undefined, podIPs: scheduled && s.ip ? [{ ip: s.ip }] : undefined, startTime: scheduled ? simk8Iso(st, s.startTick) : undefined, containerStatuses: scheduled ? cs : undefined, qosClass: simk8Qos(p) };
  if (!scheduled && s.unschedulable) out.conditions[0].message = s.unschedulable;
  if (v.status === 'Terminating') out.phase = 'Running';
  Object.keys(out).forEach(k => { if (out[k] === undefined) delete out[k]; });
  return out;
}
function simk8Qos(p) {
  const cs = simk8Containers(p); if (!cs.length) return 'BestEffort';
  const hasReq = cs.some(c => c.resources && c.resources.requests); const hasLim = cs.some(c => c.resources && c.resources.limits);
  if (!hasReq && !hasLim) return 'BestEffort';
  const guaranteed = cs.every(c => { const r = (c.resources || {}).requests || {}; const l = (c.resources || {}).limits || {}; return l.cpu && l.memory && (!r.cpu || r.cpu === l.cpu) && (!r.memory || r.memory === l.memory); });
  return guaranteed ? 'Guaranteed' : 'Burstable';
}

/* ---------- cikti bicimleri ---------- */
function simk8Export(st, o) {
  const out = simk8Clone(o);
  const strip = x => { if (Array.isArray(x)) x.forEach(strip); else if (x && typeof x === 'object') Object.keys(x).forEach(k => { if (k.startsWith('_')) delete x[k]; else strip(x[k]); }); };
  out.metadata.creationTimestamp = simk8Iso(st, o.metadata._ct);
  strip(out);
  if (out.kind === 'Pod') { if (o._p && o._p.node) out.spec.nodeName = o._p.node; out.spec.restartPolicy = out.spec.restartPolicy || 'Always'; out.spec.dnsPolicy = out.spec.dnsPolicy || 'ClusterFirst'; out.spec.serviceAccountName = out.spec.serviceAccountName || 'default'; out.spec.serviceAccount = out.spec.serviceAccountName; out.spec.terminationGracePeriodSeconds = out.spec.terminationGracePeriodSeconds == null ? 30 : out.spec.terminationGracePeriodSeconds; out.spec.schedulerName = 'default-scheduler'; out.spec.enableServiceLinks = true; out.spec.preemptionPolicy = 'PreemptLowerPriority'; out.spec.priority = 0; out.spec.securityContext = out.spec.securityContext || {}; out.spec.tolerations = out.spec.tolerations || [{ effect: 'NoExecute', key: 'node.kubernetes.io/not-ready', operator: 'Exists', tolerationSeconds: 300 }, { effect: 'NoExecute', key: 'node.kubernetes.io/unreachable', operator: 'Exists', tolerationSeconds: 300 }]; (out.spec.containers || []).forEach(c => { c.imagePullPolicy = c.imagePullPolicy || (/:latest$|^[^:]+$/.test(c.image) ? 'Always' : 'IfNotPresent'); c.terminationMessagePath = '/dev/termination-log'; c.terminationMessagePolicy = 'File'; c.resources = c.resources || {}; }); }
  if (out.kind === 'Deployment') { out.spec.progressDeadlineSeconds = out.spec.progressDeadlineSeconds == null ? 600 : out.spec.progressDeadlineSeconds; out.spec.revisionHistoryLimit = out.spec.revisionHistoryLimit == null ? 10 : out.spec.revisionHistoryLimit; out.spec.strategy = out.spec.strategy || { type: 'RollingUpdate', rollingUpdate: { maxSurge: '25%', maxUnavailable: '25%' } }; if (out.spec.strategy.type !== 'Recreate' && !out.spec.strategy.rollingUpdate) out.spec.strategy.rollingUpdate = { maxSurge: '25%', maxUnavailable: '25%' }; out.spec.replicas = out.spec.replicas == null ? 1 : out.spec.replicas; (out.spec.template.spec.containers || []).forEach(c => { c.imagePullPolicy = c.imagePullPolicy || (/:latest$|^[^:]+$/.test(c.image) ? 'Always' : 'IfNotPresent'); c.resources = c.resources || {}; c.terminationMessagePath = '/dev/termination-log'; c.terminationMessagePolicy = 'File'; }); out.spec.template.spec.restartPolicy = out.spec.template.spec.restartPolicy || 'Always'; out.spec.template.spec.dnsPolicy = out.spec.template.spec.dnsPolicy || 'ClusterFirst'; out.spec.template.spec.schedulerName = 'default-scheduler'; out.spec.template.spec.securityContext = out.spec.template.spec.securityContext || {}; out.spec.template.spec.terminationGracePeriodSeconds = out.spec.template.spec.terminationGracePeriodSeconds == null ? 30 : out.spec.template.spec.terminationGracePeriodSeconds; }
  if (out.kind === 'Service' && o._endpoints !== undefined) { /* status zaten var */ }
  if (out.kind === 'Namespace') out.spec = { finalizers: ['kubernetes'] };
  if (out.kind === 'Node') { const n = o._node || SIMK8_NODES.find(x => x.name === o.metadata.name); out.status = { addresses: [{ type: 'InternalIP', address: n.ip }, { type: 'Hostname', address: n.name }], allocatable: { cpu: '4', 'ephemeral-storage': '61202244Ki', hugepages_2Mi: '0', memory: '8120456Ki', pods: '110' }, capacity: { cpu: '4', 'ephemeral-storage': '61202244Ki', memory: '8120456Ki', pods: '110' }, conditions: [{ type: 'MemoryPressure', status: 'False', reason: 'KubeletHasSufficientMemory', message: 'kubelet has sufficient memory available' }, { type: 'DiskPressure', status: 'False', reason: 'KubeletHasNoDiskPressure', message: 'kubelet has no disk pressure' }, { type: 'PIDPressure', status: 'False', reason: 'KubeletHasSufficientPID', message: 'kubelet has sufficient PID available' }, { type: 'Ready', status: 'True', reason: 'KubeletReady', message: 'kubelet is posting ready status' }], nodeInfo: { architecture: 'amd64', bootID: simk8Hash('boot' + n.name).slice(0, 36), containerRuntimeVersion: 'containerd://1.7.18', kernelVersion: '6.8.0-45-generic', kubeProxyVersion: SIMK8_VERSION, kubeletVersion: SIMK8_VERSION, machineID: simk8Hash('mid' + n.name).slice(0, 32), operatingSystem: 'linux', osImage: 'Debian GNU/Linux 12 (bookworm)', systemUUID: simk8Hash('sys' + n.name).slice(0, 36) } }; }
  if (out.kind === 'Secret') { out.type = out.type || 'Opaque'; if (out.stringData) { out.data = out.data || {}; Object.entries(out.stringData).forEach(([k, v]) => { out.data[k] = simk8B64e(String(v)); }); delete out.stringData; } }
  if (out.kind === 'Endpoints') { /* sentetik */ }
  if (out.kind === 'ReplicaSet') { out.metadata.generation = out.metadata.generation || 1; }
  if (out.kind === 'Job') { out.spec.backoffLimit = out.spec.backoffLimit == null ? 6 : out.spec.backoffLimit; out.spec.completions = out.spec.completions == null ? 1 : out.spec.completions; out.spec.parallelism = out.spec.parallelism == null ? 1 : out.spec.parallelism; out.spec.completionMode = 'NonIndexed'; out.spec.suspend = false; }
  if (out.kind === 'CronJob') { out.spec.concurrencyPolicy = out.spec.concurrencyPolicy || 'Allow'; out.spec.failedJobsHistoryLimit = out.spec.failedJobsHistoryLimit == null ? 1 : out.spec.failedJobsHistoryLimit; out.spec.successfulJobsHistoryLimit = out.spec.successfulJobsHistoryLimit == null ? 3 : out.spec.successfulJobsHistoryLimit; out.spec.suspend = !!out.spec.suspend; }
  if (out.kind === 'ServiceAccount') { delete out.spec; }
  if (out.kind === 'ConfigMap') { delete out.spec; }
  if (out.kind === 'Secret') { delete out.spec; }
  if (out.kind === 'HorizontalPodAutoscaler') { if (!out.spec.metrics && out.spec.targetCPUUtilizationPercentage) { out.spec.metrics = [{ type: 'Resource', resource: { name: 'cpu', target: { type: 'Utilization', averageUtilization: out.spec.targetCPUUtilizationPercentage } } }]; delete out.spec.targetCPUUtilizationPercentage; } out.spec.minReplicas = out.spec.minReplicas == null ? 1 : out.spec.minReplicas; }
  if (out.metadata.labels && !Object.keys(out.metadata.labels).length) delete out.metadata.labels;
  if (out.metadata.annotations && !Object.keys(out.metadata.annotations).length) delete out.metadata.annotations;
  return out;
}
function simk8Endpoints(st, s) {
  const o = { apiVersion: 'v1', kind: 'Endpoints', metadata: { name: s.metadata.name, namespace: s.metadata.namespace, uid: simk8Hash('ep' + s.metadata.uid).slice(0, 36), creationTimestamp: simk8Iso(st, s.metadata._ct), labels: Object.assign({}, s.metadata.labels || {}), annotations: { 'endpoints.kubernetes.io/last-change-trigger-time': simk8Iso(st, st.tick) }, _ct: s.metadata._ct } };
  const ports = (s.spec.ports || []).map(p => ({ name: p.name, port: typeof p.targetPort === 'number' ? p.targetPort : (parseInt(p.targetPort, 10) || p.port), protocol: p.protocol || 'TCP' }));
  const eps = typeof s._endpoints === 'string' ? [{ ip: s._endpoints.split(':')[0] }] : (s._endpoints || []);
  if (eps.length || (s._notReady || []).length) o.subsets = [{ addresses: eps.length ? eps.map(e => Object.assign({ ip: e.ip, nodeName: e.node }, e.pod ? { targetRef: { kind: 'Pod', name: e.pod, namespace: s.metadata.namespace } } : {})) : undefined, notReadyAddresses: (s._notReady || []).length ? s._notReady.filter(e => e.ip).map(e => ({ ip: e.ip, nodeName: e.node, targetRef: { kind: 'Pod', name: e.pod, namespace: s.metadata.namespace } })) : undefined, ports: typeof s._endpoints === 'string' ? [{ name: 'https', port: 6443, protocol: 'TCP' }] : ports }];
  if (o.subsets) { if (!o.subsets[0].addresses) delete o.subsets[0].addresses; if (!o.subsets[0].notReadyAddresses) delete o.subsets[0].notReadyAddresses; }
  return o;
}
function simk8EpText(st, s) {
  if (typeof s._endpoints === 'string') return s._endpoints;
  const eps = (s._endpoints || []); if (!eps.length) return '<none>';
  const ports = (s.spec.ports || []).map(p => typeof p.targetPort === 'number' ? p.targetPort : (parseInt(p.targetPort, 10) || p.port));
  const all = eps.flatMap(e => ports.map(p => `${e.ip}:${p}`));
  return all.length > 3 ? all.slice(0, 3).join(',') + ` + ${all.length - 3} more...` : all.join(',');
}
function simk8Ports(s) { return (s.spec.ports || []).map(p => `${p.port}${p.nodePort ? ':' + p.nodePort : ''}/${p.protocol || 'TCP'}`).join(',') || '<none>'; }
function simk8Sel(sel) { if (!sel) return '<none>'; const ml = sel.matchLabels || sel; const parts = Object.entries(ml).map(([k, v]) => `${k}=${v}`); (sel.matchExpressions || []).forEach(e => parts.push(`${e.key} ${e.operator.toLowerCase()} (${(e.values || []).join(',')})`)); return parts.join(',') || '<none>'; }
function simk8Labels(l) { const e = Object.entries(l || {}); return e.length ? e.map(([k, v]) => `${k}=${v}`).join(',') : '<none>'; }
/* get satirlari. donus {header:[], row:[]} */
function simk8Row(sh, st, o, wide) {
  const age = simk8Age(st, o.metadata._ct);
  switch (o.kind) {
    case 'Pod': { const v = simk8PodView(sh, st, o); const rst = v.restarts ? `${v.restarts} (${simk8Age(st, o._p.lastRestartTick == null ? st.tick : o._p.lastRestartTick)} ago)` : '0'; const h = ['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE']; const r = [o.metadata.name, `${v.ready}/${v.total}`, v.status, rst, age]; if (wide) { h.push('IP', 'NODE', 'NOMINATED NODE', 'READINESS GATES'); r.push((o._p && o._p.ip) || '<none>', (o._p && o._p.node) || '<none>', '<none>', '<none>'); } return { h, r }; }
    case 'Deployment': { const s = o.status || {}; const rep = o.spec.replicas == null ? 1 : o.spec.replicas; const h = ['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE']; const r = [o.metadata.name, `${s.readyReplicas || 0}/${rep}`, String(s.updatedReplicas || 0), String(s.availableReplicas || 0), age]; if (wide) { const cs = simk8Containers({ spec: o.spec.template.spec }); h.push('CONTAINERS', 'IMAGES', 'SELECTOR'); r.push(cs.map(c => c.name).join(','), cs.map(c => c.image).join(','), simk8Sel(o.spec.selector)); } return { h, r }; }
    case 'ReplicaSet': { const s = o.status || {}; const h = ['NAME', 'DESIRED', 'CURRENT', 'READY', 'AGE']; const r = [o.metadata.name, String(o.spec.replicas == null ? 1 : o.spec.replicas), String(s.replicas || 0), String(s.readyReplicas || 0), age]; if (wide) { const cs = simk8Containers({ spec: o.spec.template.spec }); h.push('CONTAINERS', 'IMAGES', 'SELECTOR'); r.push(cs.map(c => c.name).join(','), cs.map(c => c.image).join(','), simk8Sel(o.spec.selector)); } return { h, r }; }
    case 'DaemonSet': { const h = ['NAME', 'DESIRED', 'CURRENT', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'NODE SELECTOR', 'AGE']; const n = SIMK8_NODES.length; const r = [o.metadata.name, String(n), String(n), String(n), String(n), String(n), simk8Labels((o.spec.template.spec || {}).nodeSelector) === '<none>' ? '<none>' : simk8Labels(o.spec.template.spec.nodeSelector), age]; if (wide) { const cs = simk8Containers({ spec: o.spec.template.spec }); h.push('CONTAINERS', 'IMAGES', 'SELECTOR'); r.push(cs.map(c => c.name).join(','), cs.map(c => c.image).join(','), simk8Sel(o.spec.selector)); } return { h, r }; }
    case 'StatefulSet': { const h = ['NAME', 'READY', 'AGE']; const r = [o.metadata.name, `0/${o.spec.replicas || 1}`, age]; return { h, r }; }
    case 'Service': { const ext = o.spec.type === 'LoadBalancer' ? ((o.status && o.status.loadBalancer && o.status.loadBalancer.ingress) ? o.status.loadBalancer.ingress[0].ip : '<pending>') : (o.spec.type === 'ExternalName' ? o.spec.externalName : '<none>'); const h = ['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE']; const r = [o.metadata.name, o.spec.type, o.spec.clusterIP || '<none>', ext, simk8Ports(o), age]; if (wide) { h.push('SELECTOR'); r.push(simk8Labels(o.spec.selector)); } return { h, r }; }
    case 'Endpoints': return { h: ['NAME', 'ENDPOINTS', 'AGE'], r: [o.metadata.name, simk8EpText(st, o), age] };
    case 'Namespace': return { h: ['NAME', 'STATUS', 'AGE'], r: [o.metadata.name, (o.status || {}).phase || 'Active', age] };
    case 'Node': { const n = o._node || SIMK8_NODES.find(x => x.name === o.metadata.name); const h = ['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION']; const r = [o.metadata.name, 'Ready', n.roles, age, SIMK8_VERSION]; if (wide) { h.push('INTERNAL-IP', 'EXTERNAL-IP', 'OS-IMAGE', 'KERNEL-VERSION', 'CONTAINER-RUNTIME'); r.push(n.ip, '<none>', 'Debian GNU/Linux 12 (bookworm)', '6.8.0-45-generic', 'containerd://1.7.18'); } return { h, r }; }
    case 'ConfigMap': return { h: ['NAME', 'DATA', 'AGE'], r: [o.metadata.name, String(Object.keys(o.data || {}).length + Object.keys(o.binaryData || {}).length), age] };
    case 'Secret': return { h: ['NAME', 'TYPE', 'DATA', 'AGE'], r: [o.metadata.name, o.type || 'Opaque', String(Object.keys(o.data || {}).length + Object.keys(o.stringData || {}).length), age] };
    case 'ServiceAccount': return { h: ['NAME', 'SECRETS', 'AGE'], r: [o.metadata.name, '0', age] };
    case 'Ingress': { const hosts = (o.spec.rules || []).map(r => r.host || '*').join(','); const addr = o.status && o.status.loadBalancer && o.status.loadBalancer.ingress ? o.status.loadBalancer.ingress.map(i => i.hostname || i.ip).join(',') : ''; return { h: ['NAME', 'CLASS', 'HOSTS', 'ADDRESS', 'PORTS', 'AGE'], r: [o.metadata.name, o.spec.ingressClassName || ((o.metadata.annotations || {})['kubernetes.io/ingress.class'] ? o.metadata.annotations['kubernetes.io/ingress.class'] : '<none>'), hosts || '*', addr, o.spec.tls ? '80, 443' : '80', age] }; }
    case 'HorizontalPodAutoscaler': { const ref = o.spec.scaleTargetRef || {}; const goal = (o.spec.metrics && o.spec.metrics[0] && o.spec.metrics[0].resource && o.spec.metrics[0].resource.target.averageUtilization) || o.spec.targetCPUUtilizationPercentage || 80; const h = ['NAME', 'REFERENCE', 'TARGETS', 'MINPODS', 'MAXPODS', 'REPLICAS', 'AGE']; const r = [o.metadata.name, `${ref.kind}/${ref.name}`, `cpu: ${o._cpu == null ? '<unknown>' : o._cpu + '%'}/${goal}%`, String(o.spec.minReplicas == null ? 1 : o.spec.minReplicas), String(o.spec.maxReplicas), String((o.status || {}).currentReplicas || 0), age]; return { h, r }; }
    case 'Job': { const s = o.status || {}; const done = (s.conditions || []).find(c => c.type === 'Complete' && c.status === 'True'); const failed = (s.conditions || []).find(c => c.type === 'Failed' && c.status === 'True'); const dur = s.completionTime ? simk8Age({ tick: Math.round((Date.parse(s.completionTime) - SIMK8_EPOCH) / SIMK8_TICK_MS) }, o.metadata._ct) : simk8Age(st, o.metadata._ct); const h = ['NAME', 'STATUS', 'COMPLETIONS', 'DURATION', 'AGE']; const r = [o.metadata.name, done ? 'Complete' : (failed ? 'Failed' : 'Running'), `${s.succeeded || 0}/${o.spec.completions || 1}`, dur, age]; if (wide) { const cs = simk8Containers({ spec: o.spec.template.spec }); h.push('CONTAINERS', 'IMAGES', 'SELECTOR'); r.push(cs.map(c => c.name).join(','), cs.map(c => c.image).join(','), `batch.kubernetes.io/controller-uid=${o.metadata.uid}`); } return { h, r }; }
    case 'CronJob': { const h = ['NAME', 'SCHEDULE', 'TIMEZONE', 'SUSPEND', 'ACTIVE', 'LAST SCHEDULE', 'AGE']; const r = [o.metadata.name, o.spec.schedule, o.spec.timeZone || '<none>', String(!!o.spec.suspend ? 'True' : 'False'), String(((o.status || {}).active || []).length), o._lastSchedule != null ? simk8Age(st, o._lastSchedule) : '<none>', age]; if (wide) { const cs = simk8Containers({ spec: o.spec.jobTemplate.spec.template.spec }); h.push('CONTAINERS', 'IMAGES', 'SELECTOR'); r.push(cs.map(c => c.name).join(','), cs.map(c => c.image).join(','), '<none>'); } return { h, r }; }
    case 'StorageClass': return { h: ['NAME', 'PROVISIONER', 'RECLAIMPOLICY', 'VOLUMEBINDINGMODE', 'ALLOWVOLUMEEXPANSION', 'AGE'], r: [o.metadata.name + ' (default)', o.provisioner, o.reclaimPolicy, o.volumeBindingMode, 'false', age] };
    case 'PersistentVolumeClaim': return { h: ['NAME', 'STATUS', 'VOLUME', 'CAPACITY', 'ACCESS MODES', 'STORAGECLASS', 'VOLUMEATTRIBUTESCLASS', 'AGE'], r: [o.metadata.name, 'Pending', '', '', '', o.spec.storageClassName || 'standard', '<unset>', age] };
    case 'NetworkPolicy': return { h: ['NAME', 'POD-SELECTOR', 'AGE'], r: [o.metadata.name, simk8Labels((o.spec.podSelector || {}).matchLabels), age] };
    case 'Role': case 'ClusterRole': return { h: ['NAME', 'CREATED AT'], r: [o.metadata.name, simk8Iso(st, o.metadata._ct)] };
    case 'RoleBinding': return { h: ['NAME', 'ROLE', 'AGE'], r: [o.metadata.name, `${(o.roleRef || {}).kind}/${(o.roleRef || {}).name}`, age] };
    default: return { h: ['NAME', 'AGE'], r: [o.metadata.name, age] };
  }
}
function simk8EventRows(st, evs, showNs) {
  const h = ['LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE']; if (showNs) h.unshift('NAMESPACE');
  const rows = [h];
  evs.forEach(e => { const r = [e.count > 1 ? `${simk8Age(st, e.last)} (x${e.count} over ${simk8Age(st, e.first)})` : simk8Age(st, e.last), e.type, e.reason, `${e.kind.toLowerCase()}/${e.name}`, e.message]; if (showNs) r.unshift(e.ns); rows.push(r); });
  return rows;
}
/* ---------- describe ---------- */
function simk8Kv(k, v, w = 18) { return `${(k + ':').padEnd(w)}${v}\n`; }
function simk8Multi(k, lines, w = 18) { if (!lines.length) return simk8Kv(k, '<none>', w); return lines.map((l, i) => (i === 0 ? (k + ':').padEnd(w) : ''.padEnd(w)) + l + '\n').join(''); }
function simk8EventsSection(st, evs) {
  if (!evs.length) return 'Events:          <none>\n';
  const rows = [['Type', 'Reason', 'Age', 'From', 'Message'], ['----', '------', '---', '----', '-------']];
  evs.forEach(e => rows.push([e.type, e.reason, e.count > 1 ? `${simk8Age(st, e.last)} (x${e.count} over ${simk8Age(st, e.first)})` : simk8Age(st, e.last), e.from, e.message]));
  return 'Events:\n' + simk8Table(rows).split('\n').filter(Boolean).map(l => '  ' + l).join('\n') + '\n';
}
function simk8ObjEvents(st, o) { return st.events.filter(e => e.uid === o.metadata.uid).sort((a, b) => a.first - b.first); }
function simk8DescribeContainer(st, p, c, cv, indent) {
  const I = ' '.repeat(indent); let out = `${I}${c.name}:\n`;
  const kv = (k, v) => `${I}  ${(k + ':').padEnd(16)}${v}\n`;
  if (cv.state !== 'Waiting' || cv.reason === 'CrashLoopBackOff') out += kv('Container ID', `containerd://${simk8Hash(p.metadata.name + c.name + (cv.restarts || 0))}`); else out += kv('Container ID', '');
  out += kv('Image', c.image);
  out += kv('Image ID', cv.state === 'Waiting' && cv.reason !== 'CrashLoopBackOff' ? '' : `${simk8FullImage(c.image).split(':')[0]}@sha256:${simk8Hash('img' + c.image)}`);
  const ports = c.ports || [];
  out += kv(ports.length > 1 ? 'Ports' : 'Port', ports.length ? ports.map(x => `${x.containerPort}/${x.protocol || 'TCP'}`).join(', ') : '<none>');
  out += kv(ports.length > 1 ? 'Host Ports' : 'Host Port', ports.length ? ports.map(x => `${x.hostPort || 0}/${x.protocol || 'TCP'}`).join(', ') : '<none>');
  if (c.command) out += `${I}  Command:\n` + c.command.map(x => `${I}    ${x}\n`).join('');
  if (c.args) out += `${I}  Args:\n` + c.args.map(x => `${I}    ${x}\n`).join('');
  const s = p._p || {};
  if (cv.state === 'Running') { out += kv('State', 'Running'); out += kv('  Started', simk8Human(st, (s.startTick || st.tick) + 1 + (cv.restarts || 0) * 2)); }
  else if (cv.state === 'Terminated') { out += kv('State', 'Terminated'); out += kv('  Reason', cv.reason); out += kv('  Exit Code', String(cv.exitCode == null ? 1 : cv.exitCode)); out += kv('  Started', simk8Human(st, (s.startTick || st.tick) + 1)); out += kv('  Finished', simk8Human(st, (s.startTick || st.tick) + 2)); }
  else { out += kv('State', 'Waiting'); out += kv('  Reason', cv.reason); }
  if ((cv.restarts || 0) > 0 || cv.reason === 'CrashLoopBackOff') { out += kv('Last State', 'Terminated'); out += kv('  Reason', cv.liveFail ? 'Completed' : 'Error'); out += kv('  Exit Code', String(cv.lastExit == null ? (cv.exitCode == null ? 1 : cv.exitCode) : cv.lastExit)); out += kv('  Started', simk8Human(st, (s.startTick || st.tick) + 1)); out += kv('  Finished', simk8Human(st, (s.startTick || st.tick) + 2)); }
  out += kv('Ready', cv.ready ? 'True' : 'False');
  out += kv('Restart Count', String(cv.restarts || 0));
  const res = c.resources || {};
  if (res.limits) { out += `${I}  Limits:\n` + Object.entries(res.limits).map(([k, v]) => `${I}    ${(k + ':').padEnd(8)}${v}\n`).join(''); }
  if (res.requests) { out += `${I}  Requests:\n` + Object.entries(res.requests).map(([k, v]) => `${I}    ${(k + ':').padEnd(8)}${v}\n`).join(''); }
  const probe = (name, pr) => { if (!pr) return ''; let d = ''; if (pr.httpGet) d = `http-get http://:${pr.httpGet.port}${pr.httpGet.path || '/'}`; else if (pr.tcpSocket) d = `tcp-socket :${pr.tcpSocket.port}`; else if (pr.exec) d = `exec [${(pr.exec.command || []).join(' ')}]`; else if (pr.grpc) d = `grpc <pod>:${pr.grpc.port}`; return kv(name, `${d} delay=${pr.initialDelaySeconds || 0}s timeout=${pr.timeoutSeconds || 1}s period=${pr.periodSeconds || 10}s #success=${pr.successThreshold || 1} #failure=${pr.failureThreshold || 3}`); };
  out += probe('Liveness', c.livenessProbe); out += probe('Readiness', c.readinessProbe); out += probe('Startup', c.startupProbe);
  const envFrom = (c.envFrom || []).map(e => e.configMapRef ? `${e.configMapRef.name}  ConfigMap  Optional: ${!!e.configMapRef.optional}` : `${e.secretRef.name}  Secret  Optional: ${!!e.secretRef.optional}`);
  if (envFrom.length) out += `${I}  Environment Variables from:\n` + envFrom.map(e => `${I}    ${e}\n`).join('');
  const envs = (c.env || []).map(e => { if (e.value !== undefined) return `${e.name}:  ${e.value}`; const vf = e.valueFrom || {}; if (vf.configMapKeyRef) return `${e.name}:  <set to the key '${vf.configMapKeyRef.key}' of config map '${vf.configMapKeyRef.name}'>  Optional: ${!!vf.configMapKeyRef.optional}`; if (vf.secretKeyRef) return `${e.name}:  <set to the key '${vf.secretKeyRef.key}' in secret '${vf.secretKeyRef.name}'>  Optional: ${!!vf.secretKeyRef.optional}`; if (vf.fieldRef) return `${e.name}:  ${p.metadata.name} (v1:${vf.fieldRef.fieldPath})`; return `${e.name}:  `; });
  out += envs.length ? `${I}  Environment:\n` + envs.map(e => `${I}    ${e}\n`).join('') : kv('Environment', '<none>');
  const mounts = (c.volumeMounts || []).map(m => `${m.mountPath} from ${m.name} (${m.readOnly ? 'ro' : 'rw'})`);
  mounts.push(`/var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-${simk8Suffix('sa' + p.metadata.uid, 5)} (ro)`);
  out += `${I}  Mounts:\n` + mounts.map(m => `${I}    ${m}\n`).join('');
  return out;
}
function simk8Describe(sh, st, o) {
  const m = o.metadata; let out = '';
  const W = { Pod: 18, Deployment: 24, Service: 26, Node: 20, HorizontalPodAutoscaler: 20, CronJob: 30, ServiceAccount: 21, Job: 18, ReplicaSet: 18, Ingress: 18 }[o.kind] || 18;
  const K = (k, v) => simk8Kv(k, v, Math.max(W, k.length + 2));
  const M = (k, lines) => simk8Multi(k, lines, Math.max(W, k.length + 2));
  const labelLines = Object.entries(m.labels || {}).map(([k, v]) => `${k}=${v}`);
  const annLines = Object.entries(m.annotations || {}).filter(([k]) => k !== 'kubectl.kubernetes.io/last-applied-configuration').map(([k, v]) => `${k}: ${String(v).length > 60 ? String(v).slice(0, 57) + '...' : v}`);
  if (o.kind === 'Pod') {
    const v = simk8PodView(sh, st, o); const s = o._p || {};
    out += K('Name', m.name) + K('Namespace', m.namespace) + K('Priority', '0');
    if (o.spec.priorityClassName) out += K('Priority Class Name', o.spec.priorityClassName);
    out += K('Service Account', o.spec.serviceAccountName || 'default');
    out += K('Node', s.node ? `${s.node}/${(SIMK8_NODES.find(n => n.name === s.node) || {}).ip}` : '<none>');
    if (s.node) out += K('Start Time', simk8Human(st, s.startTick));
    out += M('Labels', labelLines) + M('Annotations', annLines);
    out += K('Status', v.status === 'Terminating' ? 'Terminating (lasts 5s)' : v.phase);
    if (v.status === 'Terminating') out += K('Termination Grace Period', '30s');
    out += K('IP', s.ip || '');
    out += 'IPs:\n' + (s.ip ? `  IP:           ${s.ip}\n` : '  IP:           \n');
    const owner = simk8Owner(st, o); if (owner) out += K('Controlled By', `${owner.kind}/${owner.metadata.name}`);
    out += 'Containers:\n';
    simk8Containers(o).forEach(c => { out += simk8DescribeContainer(st, o, c, v.containers.find(x => x.name === c.name) || {}, 2); });
    if (s.node) { const cond = o.status.conditions; out += 'Conditions:\n  Type                        Status\n' + cond.map(c => `  ${c.type.padEnd(28)}${c.status} \n`).join(''); }
    else out += 'Conditions:\n  Type           Status\n  PodScheduled   False \n';
    const vols = (o.spec.volumes || []).map(vv => { if (vv.configMap) return `  ${vv.name}:\n    Type:      ConfigMap (a volume populated by a ConfigMap)\n    Name:      ${vv.configMap.name}\n    Optional:  ${!!vv.configMap.optional}\n`; if (vv.secret) return `  ${vv.name}:\n    Type:        Secret (a volume populated by a Secret)\n    SecretName:  ${vv.secret.secretName}\n    Optional:    ${!!vv.secret.optional}\n`; if (vv.emptyDir) return `  ${vv.name}:\n    Type:       EmptyDir (a temporary directory that shares a pod's lifetime)\n    Medium:     \n    SizeLimit:  <unset>\n`; if (vv.persistentVolumeClaim) return `  ${vv.name}:\n    Type:       PersistentVolumeClaim (a reference to a PersistentVolumeClaim in the same namespace)\n    ClaimName:  ${vv.persistentVolumeClaim.claimName}\n    ReadOnly:   false\n`; if (vv.hostPath) return `  ${vv.name}:\n    Type:          HostPath (bare host directory volume)\n    Path:          ${vv.hostPath.path}\n    HostPathType:  ${vv.hostPath.type || ''}\n`; return `  ${vv.name}:\n    Type:  ${Object.keys(vv).filter(k => k !== 'name')[0] || 'unknown'}\n`; });
    vols.push(`  kube-api-access-${simk8Suffix('sa' + m.uid, 5)}:\n    Type:                    Projected (a volume that contains injected data from multiple sources)\n    TokenExpirationSeconds:  3607\n    ConfigMapName:           kube-root-ca.crt\n    ConfigMapOptional:       <nil>\n    DownwardAPI:             true\n`);
    out += 'Volumes:\n' + vols.join('');
    out += K('QoS Class', simk8Qos(o));
    out += M('Node-Selectors', Object.entries(o.spec.nodeSelector || {}).map(([k, vv]) => `${k}=${vv}`));
    out += M('Tolerations', (o.spec.tolerations && o.spec.tolerations.length ? o.spec.tolerations.map(t => `${t.key || ''}${t.operator === 'Exists' ? ' op=Exists' : ''}${t.effect ? ':' + t.effect : ''}${t.tolerationSeconds ? ' for ' + t.tolerationSeconds + 's' : ''}`) : []).concat(['node.kubernetes.io/not-ready:NoExecute op=Exists for 300s', 'node.kubernetes.io/unreachable:NoExecute op=Exists for 300s']));
    out += simk8EventsSection(st, simk8ObjEvents(st, o));
    return out;
  }
  if (o.kind === 'Deployment') {
    const s = o.status || {}; const rep = o.spec.replicas == null ? 1 : o.spec.replicas;
    out += K('Name', m.name) + K('Namespace', m.namespace) + K('CreationTimestamp', simk8Human(st, m._ct)) + M('Labels', labelLines) + M('Annotations', annLines);
    out += K('Selector', simk8Sel(o.spec.selector));
    out += K('Replicas', `${rep} desired | ${s.updatedReplicas || 0} updated | ${s.replicas || 0} total | ${s.availableReplicas || 0} available | ${s.unavailableReplicas || 0} unavailable`);
    const strat = o.spec.strategy || { type: 'RollingUpdate' };
    out += K('StrategyType', strat.type || 'RollingUpdate') + K('MinReadySeconds', String(o.spec.minReadySeconds || 0));
    if ((strat.type || 'RollingUpdate') === 'RollingUpdate') { const ru = strat.rollingUpdate || {}; out += K('RollingUpdateStrategy', `${ru.maxUnavailable == null ? '25%' : ru.maxUnavailable} max unavailable, ${ru.maxSurge == null ? '25%' : ru.maxSurge} max surge`); }
    out += 'Pod Template:\n' + simk8Multi('  Labels', Object.entries((o.spec.template.metadata || {}).labels || {}).map(([k, v]) => `${k}=${v}`), 9);
    if ((o.spec.template.metadata || {}).annotations) out += simk8Multi('  Annotations', Object.entries(o.spec.template.metadata.annotations).map(([k, v]) => `${k}: ${v}`), 15);
    if (o.spec.template.spec.serviceAccountName) out += `  Service Account:  ${o.spec.template.spec.serviceAccountName}\n`;
    out += '  Containers:\n';
    simk8Containers({ spec: o.spec.template.spec }).forEach(c => { let cc = `   ${c.name}:\n`; const kv = (k, v) => `    ${(k + ':').padEnd(15)}${v}\n`; cc += kv('Image', c.image); const ports = c.ports || []; cc += kv(ports.length > 1 ? 'Ports' : 'Port', ports.length ? ports.map(x => `${x.containerPort}/${x.protocol || 'TCP'}`).join(', ') : '<none>'); cc += kv(ports.length > 1 ? 'Host Ports' : 'Host Port', ports.length ? ports.map(x => `0/${x.protocol || 'TCP'}`).join(', ') : '<none>'); if (c.command) cc += '    Command:\n' + c.command.map(x => `      ${x}\n`).join(''); if (c.args) cc += '    Args:\n' + c.args.map(x => `      ${x}\n`).join(''); const res = c.resources || {}; if (res.limits) cc += '    Limits:\n' + Object.entries(res.limits).map(([k, v]) => `      ${(k + ':').padEnd(8)}${v}\n`).join(''); if (res.requests) cc += '    Requests:\n' + Object.entries(res.requests).map(([k, v]) => `      ${(k + ':').padEnd(8)}${v}\n`).join(''); const probe = (name, pr) => { if (!pr) return ''; let d = ''; if (pr.httpGet) d = `http-get http://:${pr.httpGet.port}${pr.httpGet.path || '/'}`; else if (pr.tcpSocket) d = `tcp-socket :${pr.tcpSocket.port}`; else if (pr.exec) d = `exec [${(pr.exec.command || []).join(' ')}]`; return kv(name, `${d} delay=${pr.initialDelaySeconds || 0}s timeout=${pr.timeoutSeconds || 1}s period=${pr.periodSeconds || 10}s #success=${pr.successThreshold || 1} #failure=${pr.failureThreshold || 3}`); }; cc += probe('Liveness', c.livenessProbe) + probe('Readiness', c.readinessProbe); const envFrom = (c.envFrom || []).map(e => e.configMapRef ? `${e.configMapRef.name}  ConfigMap  Optional: ${!!e.configMapRef.optional}` : `${e.secretRef.name}  Secret  Optional: ${!!e.secretRef.optional}`); if (envFrom.length) cc += '    Environment Variables from:\n' + envFrom.map(e => `      ${e}\n`).join(''); const envs = (c.env || []).map(e => e.value !== undefined ? `${e.name}:  ${e.value}` : (e.valueFrom && e.valueFrom.configMapKeyRef ? `${e.name}:  <set to the key '${e.valueFrom.configMapKeyRef.key}' of config map '${e.valueFrom.configMapKeyRef.name}'>  Optional: false` : (e.valueFrom && e.valueFrom.secretKeyRef ? `${e.name}:  <set to the key '${e.valueFrom.secretKeyRef.key}' in secret '${e.valueFrom.secretKeyRef.name}'>  Optional: false` : `${e.name}:  `))); cc += envs.length ? '    Environment:\n' + envs.map(e => `      ${e}\n`).join('') : kv('Environment', '<none>'); const mounts = (c.volumeMounts || []).map(mm => `${mm.mountPath} from ${mm.name} (${mm.readOnly ? 'ro' : 'rw'})`); cc += mounts.length ? '    Mounts:\n' + mounts.map(mm => `      ${mm}\n`).join('') : kv('Mounts', '<none>'); out += cc; });
    const vols = (o.spec.template.spec.volumes || []);
    out += vols.length ? '  Volumes:\n' + vols.map(vv => `   ${vv.name}:\n    Type:      ${vv.configMap ? 'ConfigMap (a volume populated by a ConfigMap)' : (vv.secret ? 'Secret (a volume populated by a Secret)' : (vv.emptyDir ? "EmptyDir (a temporary directory that shares a pod's lifetime)" : 'Volume'))}\n${vv.configMap ? `    Name:      ${vv.configMap.name}\n    Optional:  false\n` : (vv.secret ? `    SecretName:  ${vv.secret.secretName}\n    Optional:    false\n` : '')}`).join('') : '  Volumes:         <none>\n';
    out += `  Node-Selectors:  ${simk8Labels(o.spec.template.spec.nodeSelector)}\n  Tolerations:     ${(o.spec.template.spec.tolerations || []).map(t => `${t.key || ''}${t.operator === 'Exists' ? ' op=Exists' : ''}${t.effect ? ':' + t.effect : ''}`).join('\n                   ') || '<none>'}\n`;
    out += 'Conditions:\n  Type           Status  Reason\n  ----           ------  ------\n' + (s.conditions || []).map(c => `  ${c.type.padEnd(15)}${c.status.padEnd(8)}${c.reason}\n`).join('');
    const rss = simk8Owned(st, o, 'ReplicaSet'); const hash = simk8TemplateHash(o.spec.template); const newRs = rss.find(r => r._hash === hash); const olds = rss.filter(r => r !== newRs);
    out += K('OldReplicaSets', olds.length ? olds.map(r => `${r.metadata.name} (${(r.status || {}).replicas || 0}/${r.spec.replicas} replicas created)`).join(', ') : '<none>');
    out += K('NewReplicaSet', newRs ? `${newRs.metadata.name} (${(newRs.status || {}).replicas || 0}/${newRs.spec.replicas} replicas created)` : '<none>');
    out += simk8EventsSection(st, simk8ObjEvents(st, o));
    return out;
  }
  if (o.kind === 'ReplicaSet') {
    const s = o.status || {}; const owner = simk8Owner(st, o);
    out += K('Name', m.name) + K('Namespace', m.namespace) + K('Selector', simk8Sel(o.spec.selector)) + M('Labels', labelLines) + M('Annotations', annLines);
    if (owner) out += K('Controlled By', `${owner.kind}/${owner.metadata.name}`);
    out += K('Replicas', `${s.replicas || 0} current / ${o.spec.replicas} desired`);
    const pods = simk8Owned(st, o, 'Pod').map(p => simk8PodView(sh, st, p));
    out += K('Pods Status', `${pods.filter(p => p.phase === 'Running').length} Running / ${pods.filter(p => p.phase === 'Pending').length} Waiting / ${pods.filter(p => p.phase === 'Succeeded').length} Succeeded / ${pods.filter(p => p.phase === 'Failed').length} Failed`);
    out += 'Pod Template:\n' + simk8Multi('  Labels', Object.entries((o.spec.template.metadata || {}).labels || {}).map(([k, v]) => `${k}=${v}`), 9) + '  Containers:\n' + simk8Containers({ spec: o.spec.template.spec }).map(c => `   ${c.name}:\n    Image:         ${c.image}\n    Port:          ${(c.ports || []).map(x => `${x.containerPort}/${x.protocol || 'TCP'}`).join(', ') || '<none>'}\n    Host Port:     ${(c.ports || []).length ? '0/TCP' : '<none>'}\n    Environment:   ${(c.env || []).length ? '' : '<none>'}\n${(c.env || []).map(e => `      ${e.name}:  ${e.value !== undefined ? e.value : ''}\n`).join('')}    Mounts:        <none>\n`).join('') + '  Volumes:         <none>\n  Node-Selectors:  <none>\n  Tolerations:     <none>\n';
    out += simk8EventsSection(st, simk8ObjEvents(st, o));
    return out;
  }
  if (o.kind === 'Service') {
    out += K('Name', m.name) + K('Namespace', m.namespace) + M('Labels', labelLines) + M('Annotations', annLines);
    out += K('Selector', simk8Labels(o.spec.selector)) + K('Type', o.spec.type) + K('IP Family Policy', 'SingleStack') + K('IP Families', 'IPv4') + K('IP', o.spec.clusterIP || 'None') + K('IPs', o.spec.clusterIP || 'None');
    if (o.spec.type === 'LoadBalancer') out += K('LoadBalancer Ingress', o.status && o.status.loadBalancer.ingress ? o.status.loadBalancer.ingress[0].ip : '<pending>');
    (o.spec.ports || []).forEach(p => { out += K('Port', `${p.name || '<unset>'}  ${p.port}/${p.protocol || 'TCP'}`); out += K('TargetPort', `${p.targetPort}/${p.protocol || 'TCP'}`); if (p.nodePort) out += K('NodePort', `${p.name || '<unset>'}  ${p.nodePort}/${p.protocol || 'TCP'}`); out += K('Endpoints', simk8EpText(st, o) === '<none>' ? '<none>' : (o._endpoints || []).map(e => `${e.ip}:${typeof p.targetPort === 'number' ? p.targetPort : (parseInt(p.targetPort, 10) || p.port)}`).join(',')); });
    out += K('Session Affinity', o.spec.sessionAffinity || 'None');
    if (o.spec.type === 'NodePort' || o.spec.type === 'LoadBalancer') out += K('External Traffic Policy', o.spec.externalTrafficPolicy || 'Cluster');
    out += K('Internal Traffic Policy', 'Cluster');
    out += simk8EventsSection(st, simk8ObjEvents(st, o)).replace('Events:          <none>', 'Events:                   <none>');
    return out;
  }
  if (o.kind === 'Node') {
    const n = o._node || SIMK8_NODES.find(x => x.name === m.name);
    const pods = st.objects.filter(p => p.kind === 'Pod' && p._p && p._p.node === m.name && !simk8PodDone(p));
    const req = pods.reduce((a, p) => { const r = simk8PodRequests(p); a.cpu += r.cpu; a.mem += r.mem; return a; }, { cpu: 0, mem: 0 });
    out += K('Name', m.name) + K('Roles', n.roles) + M('Labels', labelLines) + M('Annotations', ['kubeadm.alpha.kubernetes.io/cri-socket: unix:///run/containerd/containerd.sock', 'node.alpha.kubernetes.io/ttl: 0', 'volumes.kubernetes.io/controller-managed-attach-detach: true']);
    out += K('CreationTimestamp', simk8Human(st, m._ct)) + M('Taints', (o.spec.taints || []).map(t => `${t.key}:${t.effect}`)) + K('Unschedulable', 'false');
    out += 'Conditions:\n  Type             Status  LastHeartbeatTime                 LastTransitionTime                Reason                       Message\n  ----             ------  -----------------                 ------------------                ------                       -------\n' + [['MemoryPressure', 'False', 'KubeletHasSufficientMemory', 'kubelet has sufficient memory available'], ['DiskPressure', 'False', 'KubeletHasNoDiskPressure', 'kubelet has no disk pressure'], ['PIDPressure', 'False', 'KubeletHasSufficientPID', 'kubelet has sufficient PID available'], ['Ready', 'True', 'KubeletReady', 'kubelet is posting ready status']].map(c => `  ${c[0].padEnd(17)}${c[1].padEnd(8)}${simk8Human(st, st.tick).padEnd(34)}${simk8Human(st, m._ct).padEnd(34)}${c[2].padEnd(29)}${c[3]}\n`).join('');
    out += `Addresses:\n  InternalIP:  ${n.ip}\n  Hostname:    ${n.name}\nCapacity:\n  cpu:                4\n  ephemeral-storage:  61202244Ki\n  hugepages-2Mi:      0\n  memory:             8120456Ki\n  pods:               110\nAllocatable:\n  cpu:                4\n  ephemeral-storage:  61202244Ki\n  hugepages-2Mi:      0\n  memory:             8120456Ki\n  pods:               110\nSystem Info:\n  Machine ID:                 ${simk8Hash('mid' + n.name).slice(0, 32)}\n  System UUID:                ${simk8Hash('sys' + n.name).slice(0, 36)}\n  Boot ID:                    ${simk8Hash('boot' + n.name).slice(0, 36)}\n  Kernel Version:             6.8.0-45-generic\n  OS Image:                   Debian GNU/Linux 12 (bookworm)\n  Operating System:           linux\n  Architecture:               amd64\n  Container Runtime Version:  containerd://1.7.18\n  Kubelet Version:            ${SIMK8_VERSION}\n  Kube-Proxy Version:         ${SIMK8_VERSION}\nPodCIDR:                      ${o.spec.podCIDR}\nPodCIDRs:                     ${o.spec.podCIDR}\nProviderID:                   ${o.spec.providerID}\n`;
    const rows = [['Namespace', 'Name', 'CPU Requests', 'CPU Limits', 'Memory Requests', 'Memory Limits', 'Age'], ['---------', '----', '------------', '----------', '---------------', '-------------', '---']];
    pods.forEach(p => { const r = simk8PodRequests(p); const lim = simk8Containers(p).reduce((a, c) => { const l = (c.resources || {}).limits || {}; a.cpu += simk8Quantity(l.cpu); a.mem += simk8Quantity(l.memory); return a; }, { cpu: 0, mem: 0 }); rows.push([p.metadata.namespace, p.metadata.name, `${simk8Milli(r.cpu)} (${Math.round(r.cpu / 4 * 100)}%)`, `${simk8Milli(lim.cpu)} (${Math.round(lim.cpu / 4 * 100)}%)`, `${simk8Mi(r.mem)} (${Math.round(r.mem / n.mem * 100)}%)`, `${simk8Mi(lim.mem)} (${Math.round(lim.mem / n.mem * 100)}%)`, simk8Age(st, p.metadata._ct)]); });
    out += `Non-terminated Pods:          (${pods.length} in total)\n` + simk8Table(rows).split('\n').filter(Boolean).map(l => '  ' + l).join('\n') + '\n';
    out += `Allocated resources:\n  (Total limits may be over 100 percent, i.e., overcommitted.)\n  Resource           Requests      Limits\n  --------           --------      ------\n  cpu                ${simk8Milli(req.cpu)} (${Math.round(req.cpu / 4 * 100)}%)`.padEnd(0) + `   0 (0%)\n  memory             ${simk8Mi(req.mem)} (${Math.round(req.mem / n.mem * 100)}%)   0 (0%)\n  ephemeral-storage  0 (0%)        0 (0%)\n  hugepages-2Mi      0 (0%)        0 (0%)\n`;
    out += 'Events:              <none>\n';
    return out;
  }
  if (o.kind === 'ConfigMap' || o.kind === 'Secret') {
    out += K('Name', m.name) + K('Namespace', m.namespace) + M('Labels', labelLines) + M('Annotations', annLines);
    if (o.kind === 'Secret') { out += '\n' + K('Type', o.type || 'Opaque') + '\nData\n====\n' + Object.entries(Object.assign({}, o.data || {}, o.stringData || {})).map(([k, v]) => `${k}:  ${o.stringData && o.stringData[k] !== undefined ? String(v).length : simk8B64d(v).length} bytes\n`).join(''); return out; }
    out += '\nData\n====\n' + Object.entries(o.data || {}).map(([k, v]) => `${k}:\n----\n${v}\n${String(v).endsWith('\n') ? '' : '\n'}`).join('') + '\nBinaryData\n====\n\n' + simk8EventsSection(st, []).replace('Events:          <none>', 'Events:  <none>');
    return out;
  }
  if (o.kind === 'Namespace') { out += K('Name', m.name) + M('Labels', labelLines) + M('Annotations', annLines) + K('Status', 'Active') + '\nNo resource quota.\n\nNo LimitRange resource.\n'; return out; }
  if (o.kind === 'Ingress') {
    out += K('Name', m.name) + M('Labels', labelLines) + K('Namespace', m.namespace) + K('Address', o.status && o.status.loadBalancer.ingress ? 'localhost' : '') + K('Ingress Class', o.spec.ingressClassName || '<none>') + K('Default backend', o.spec.defaultBackend ? `${o.spec.defaultBackend.service.name}:${o.spec.defaultBackend.service.port.number || o.spec.defaultBackend.service.port.name}` : '<default>') + 'Rules:\n  Host        Path  Backends\n  ----        ----  --------\n';
    (o.spec.rules || []).forEach(r => { out += `  ${(r.host || '*').padEnd(12)}\n`; ((r.http || {}).paths || []).forEach(p => { const svc = SIMK8_find(st, 'Service', m.namespace, p.backend.service.name); const ep = svc ? simk8EpText(st, svc) : '<error: services "' + p.backend.service.name + '" not found>'; out += `              ${(p.path || '/').padEnd(6)}${p.backend.service.name}:${p.backend.service.port.number || p.backend.service.port.name} (${ep})\n`; }); });
    out += M('Annotations', annLines) + simk8EventsSection(st, simk8ObjEvents(st, o).concat(st.tick - m._ct >= 1 ? [{ type: 'Normal', reason: 'Sync', last: m._ct + 1, first: m._ct + 1, count: 1, from: 'nginx-ingress-controller', message: 'Scheduled for sync' }] : []));
    return out;
  }
  if (o.kind === 'HorizontalPodAutoscaler') {
    const ref = o.spec.scaleTargetRef || {}; const goal = (o.spec.metrics && o.spec.metrics[0] && o.spec.metrics[0].resource && o.spec.metrics[0].resource.target.averageUtilization) || o.spec.targetCPUUtilizationPercentage || 80;
    out += K('Name', m.name) + K('Namespace', m.namespace) + M('Labels', labelLines) + M('Annotations', annLines) + K('CreationTimestamp', simk8Human(st, m._ct)) + K('Reference', `${ref.kind}/${ref.name}`);
    out += `Metrics:                                               ( current / target )\n  resource cpu on pods  (as a percentage of request):  ${o._cpu == null ? '<unknown>' : o._cpu + '%'} (${o._perPod ? Math.round(o._perPod * 1000) + 'm' : '<unknown>'}) / ${goal}%\n`;
    out += K('Min replicas', String(o.spec.minReplicas || 1)) + K('Max replicas', String(o.spec.maxReplicas)) + K(`${ref.kind} pods`, `${(o.status || {}).currentReplicas || 0} current / ${(o.status || {}).desiredReplicas || 0} desired`);
    out += 'Conditions:\n  Type            Status  Reason                   Message\n  ----            ------  ------                   -------\n' + ((o.status || {}).conditions || []).map(c => `  ${c.type.padEnd(16)}${c.status.padEnd(8)}${c.reason.padEnd(25)}${c.message}\n`).join('');
    out += simk8EventsSection(st, simk8ObjEvents(st, o));
    return out;
  }
  if (o.kind === 'Job') {
    const s = o.status || {}; const owner = simk8Owner(st, o);
    out += K('Name', m.name) + K('Namespace', m.namespace) + K('Selector', `batch.kubernetes.io/controller-uid=${m.uid}`) + M('Labels', labelLines) + M('Annotations', annLines);
    if (owner) out += K('Controlled By', `${owner.kind}/${owner.metadata.name}`);
    out += K('Parallelism', String(o.spec.parallelism || 1)) + K('Completions', String(o.spec.completions || 1)) + K('Completion Mode', 'NonIndexed') + K('Suspend', 'false') + K('Backoff Limit', String(o.spec.backoffLimit == null ? 6 : o.spec.backoffLimit)) + K('Start Time', simk8Human(st, m._ct));
    if (s.completionTime) { out += K('Completed At', simk8Human(st, Math.round((Date.parse(s.completionTime) - SIMK8_EPOCH) / SIMK8_TICK_MS))); out += K('Duration', simk8Age({ tick: Math.round((Date.parse(s.completionTime) - SIMK8_EPOCH) / SIMK8_TICK_MS) }, m._ct)); }
    out += K('Pods Statuses', `${s.active || 0} Active (${s.ready || 0} Ready) / ${s.succeeded || 0} Succeeded / ${s.failed || 0} Failed`);
    out += 'Pod Template:\n' + simk8Multi('  Labels', [`batch.kubernetes.io/controller-uid=${m.uid}`, `batch.kubernetes.io/job-name=${m.name}`, `controller-uid=${m.uid}`, `job-name=${m.name}`], 9) + '  Containers:\n' + simk8Containers({ spec: o.spec.template.spec }).map(c => `   ${c.name}:\n    Image:      ${c.image}\n    Port:       <none>\n    Host Port:  <none>\n${c.command ? '    Command:\n' + c.command.map(x => `      ${x}\n`).join('') : ''}${c.args ? '    Args:\n' + c.args.map(x => `      ${x}\n`).join('') : ''}    Environment:  <none>\n    Mounts:       <none>\n`).join('') + '  Volumes:         <none>\n  Node-Selectors:  <none>\n  Tolerations:     <none>\n';
    out += simk8EventsSection(st, simk8ObjEvents(st, o));
    return out;
  }
  if (o.kind === 'CronJob') {
    out += K('Name', m.name) + K('Namespace', m.namespace) + M('Labels', labelLines) + M('Annotations', annLines) + K('Schedule', o.spec.schedule) + K('Concurrency Policy', o.spec.concurrencyPolicy || 'Allow') + K('Suspend', String(!!o.spec.suspend ? 'True' : 'False')) + K('Successful Job History Limit', String(o.spec.successfulJobsHistoryLimit == null ? 3 : o.spec.successfulJobsHistoryLimit)) + K('Failed Job History Limit', String(o.spec.failedJobsHistoryLimit == null ? 1 : o.spec.failedJobsHistoryLimit)) + K('Starting Deadline Seconds', o.spec.startingDeadlineSeconds ? o.spec.startingDeadlineSeconds + 's' : '<unset>') + K('Selector', '<unset>') + K('Parallelism', '<unset>') + K('Completions', '<unset>');
    out += 'Pod Template:\n  Labels:  <none>\n  Containers:\n' + simk8Containers({ spec: o.spec.jobTemplate.spec.template.spec }).map(c => `   ${c.name}:\n    Image:      ${c.image}\n    Port:       <none>\n    Host Port:  <none>\n${c.command ? '    Command:\n' + c.command.map(x => `      ${x}\n`).join('') : ''}${c.args ? '    Args:\n' + c.args.map(x => `      ${x}\n`).join('') : ''}    Environment:  <none>\n    Mounts:       <none>\n`).join('') + '  Volumes:         <none>\n  Node-Selectors:  <none>\n  Tolerations:     <none>\n';
    const jobs = simk8Owned(st, o, 'Job');
    out += K('Last Schedule Time', o._lastSchedule != null ? simk8Human(st, o._lastSchedule) : '<unset>') + K('Active Jobs', jobs.filter(j => !j._done).map(j => j.metadata.name).join(', ') || '<none>');
    out += simk8EventsSection(st, simk8ObjEvents(st, o));
    return out;
  }
  if (o.kind === 'ServiceAccount') { out += K('Name', m.name) + K('Namespace', m.namespace) + M('Labels', labelLines) + M('Annotations', annLines) + K('Image pull secrets', '<none>') + K('Mountable secrets', '<none>') + K('Tokens', '<none>') + 'Events:              <none>\n'; return out; }
  if (o.kind === 'Endpoints') { out += K('Name', m.name) + K('Namespace', m.namespace) + M('Labels', labelLines) + M('Annotations', annLines) + 'Subsets:\n' + (simk8EpText(st, o) === '<none>' ? '' : `  Addresses:          ${(o._endpoints || []).map(e => e.ip).join(',')}\n  NotReadyAddresses:  ${(o._notReady || []).map(e => e.ip).filter(Boolean).join(',') || '<none>'}\n  Ports:\n    Name     Port  Protocol\n    ----     ----  --------\n` + (o.spec.ports || []).map(p => `    ${(p.name || '<unset>').padEnd(9)}${String(typeof p.targetPort === 'number' ? p.targetPort : p.port).padEnd(6)}${p.protocol || 'TCP'}\n`).join('')) + '\nEvents:  <none>\n'; return out; }
  /* genel */
  out += K('Name', m.name); if (m.namespace) out += K('Namespace', m.namespace); out += M('Labels', labelLines) + M('Annotations', annLines);
  out += 'API Version:  ' + o.apiVersion + '\nKind:         ' + o.kind + '\n';
  if (o.spec) out += 'Spec:\n' + jsyaml.dump(o.spec).split('\n').filter(Boolean).map(l => '  ' + l).join('\n') + '\n';
  out += simk8EventsSection(st, simk8ObjEvents(st, o));
  return out;
}
/* ---------- jsonpath ---------- */
function simk8JsonPath(tpl, obj) {
  const toks = []; let i = 0;
  while (i < tpl.length) { if (tpl[i] === '{') { const j = tpl.indexOf('}', i); if (j < 0) throw new Error('unterminated jsonpath'); toks.push({ e: tpl.slice(i + 1, j).trim() }); i = j + 1; } else { let j = tpl.indexOf('{', i); if (j < 0) j = tpl.length; toks.push({ t: tpl.slice(i, j) }); i = j; } }
  const evalPath = (expr, ctx) => {
    if (/^"[^"]*"$/.test(expr) || /^'[^']*'$/.test(expr)) return [expr.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t')];
    if (expr === '@' || expr === '') return [ctx];
    let cur = [ctx];
    const path = expr.replace(/^\$/, '').replace(/^@/, '');
    const re = /\.\.?([\w/-]+(?:\\\.[\w/-]+)*)|\[(\d+|\*|'[^']*'|"[^"]*"|\?\(@\.([\w.]+)==['"]?([^'"\]]*)['"]?\))\]|\[\]|\['([^']+)'\]/g; let m;
    while ((m = re.exec(path))) {
      if (m[1] !== undefined) { const key = m[1].replace(/\\\./g, '.'); if (path[m.index + 1] === '.') { const rec = []; const walk = x => { if (x && typeof x === 'object') { if (!Array.isArray(x) && x[key] !== undefined) rec.push(x[key]); Object.values(x).forEach(walk); } }; cur.forEach(walk); cur = rec; } else cur = cur.flatMap(x => x == null ? [] : (Array.isArray(x) ? x.map(y => y == null ? undefined : y[key]) : [x[key]])).filter(x => x !== undefined); }
      else if (m[2] !== undefined) { const idx = m[2]; if (idx === '*') cur = cur.flatMap(x => Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.values(x) : [])); else if (/^\d+$/.test(idx)) cur = cur.flatMap(x => Array.isArray(x) ? [x[parseInt(idx, 10)]] : []).filter(x => x !== undefined); else if (m[3] !== undefined) { const k = m[3]; const v = m[4]; cur = cur.flatMap(x => Array.isArray(x) ? x.filter(y => String(k.split('.').reduce((a, b) => a == null ? a : a[b], y)) === v) : []); } else { const k = idx.slice(1, -1); cur = cur.flatMap(x => x == null ? [] : [x[k]]).filter(x => x !== undefined); } }
      else if (m[5] !== undefined) cur = cur.flatMap(x => x == null ? [] : [x[m[5]]]).filter(x => x !== undefined);
    }
    return cur;
  };
  const fmt = v => v === null ? 'null' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
  let out = ''; let k = 0;
  const render = (toksList, ctx) => { let s = ''; for (let q = 0; q < toksList.length; q++) { const t = toksList[q]; if (t.t !== undefined) { s += t.t; continue; } const rm = /^range\s+(.*)$/.exec(t.e); if (rm) { let depth = 1; let e = q + 1; for (; e < toksList.length; e++) { if (toksList[e].e !== undefined && /^range\b/.test(toksList[e].e)) depth++; if (toksList[e].e === 'end') { depth--; if (!depth) break; } } const body = toksList.slice(q + 1, e); const items = evalPath(rm[1], ctx); items.forEach(it => { s += render(body, it); }); q = e; continue; } if (t.e === 'end') continue; s += evalPath(t.e, ctx).map(fmt).join(' '); } return s; };
  void k; out = render(toks, obj);
  return out;
}
function simk8Yaml(o) { return jsyaml.dump(o, { lineWidth: -1, noRefs: true, sortKeys: true, quotingType: '"' }); }

/* ---------- komut yardimcilari ---------- */
function simk8Args(args, valued, boolShort) {
  const flags = new Set(); const vals = {}; const rest = []; const multi = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { rest.push('--', ...args.slice(i + 1)); break; }
    if (a.startsWith('--')) { const eq = a.indexOf('='); const k = eq > 0 ? a.slice(2, eq) : a.slice(2); if (valued.includes(k)) { const v = eq > 0 ? a.slice(eq + 1) : args[++i]; vals[k] = v; (multi[k] = multi[k] || []).push(v); } else flags.add(k); continue; }
    if (a.startsWith('-') && a.length > 1) { const ch = a[1]; if (valued.includes(ch) && !(boolShort || []).includes(ch)) { const v = a.length > 2 ? a.slice(2) : args[++i]; vals[ch] = v; (multi[ch] = multi[ch] || []).push(v); } else for (let j = 1; j < a.length; j++) flags.add(a[j]); continue; }
    rest.push(a);
  }
  return { flags, vals, rest, multi, has: (...k) => k.some(x => flags.has(x)), val: (...k) => { for (const x of k) if (vals[x] !== undefined) return vals[x]; return undefined; }, all: (...k) => k.flatMap(x => multi[x] || []) };
}
function simk8Err(msg, code) { return fail(msg, code == null ? 1 : code); }
function simk8NotFound(k, name) { return simk8Err(`Error from server (NotFound): ${k.plural}${k.group ? '.' + k.group : ''} "${name}" not found`); }
function simk8NoType(name) { return simk8Err(`error: the server doesn't have a resource type "${name}"`); }
function simk8ResName(st, o) { const k = simk8Kind(o.kind); return `${k.singular}${k.group ? '.' + k.group : ''}/${o.metadata.name}`; }
function simk8Ns(st, a) { return a.has('A', 'all-namespaces') ? '*' : (a.val('n', 'namespace') || simk8CurrentNs(st)); }
function simk8ReadDocs(sh, file) {
  if (file === '-') return { docs: [], err: lt('error: lab, stdin ile apply desteklenmiyor, dosya ver', 'error: lab, apply from stdin is not supported, give a file') };
  const abs = sh.resolve(file); const n = sh.node(abs);
  if (!n) return { err: `error: the path "${file}" does not exist` };
  if (n.t === 'd') { const docs = []; for (const [name, ch] of Object.entries(n.c)) { if (ch.t === 'f' && /\.ya?ml$|\.json$/.test(name)) { const r = simk8ReadDocs(sh, abs + '/' + name); if (r.err) return r; docs.push(...r.docs); } } return { docs }; }
  let docs;
  try { docs = /\.json$/.test(abs) ? [JSON.parse(n.d)] : jsyaml.loadAll(n.d); } catch (e) { const line = (e.mark && e.mark.line != null) ? e.mark.line + 1 : null; return { err: `error: error parsing ${file}: error converting YAML to JSON: yaml: ${line ? `line ${line}: ` : ''}${(e.reason || e.message || '').split('\n')[0]}` }; }
  const flat = []; docs.forEach(d => { if (d && d.kind === 'List' && Array.isArray(d.items)) flat.push(...d.items); else flat.push(d); });
  return { docs: flat.filter(d => d != null).map(d => ({ doc: d, file })) };
}
/* dogrulama, hata string ya da null */
function simk8Validate(st, d, file) {
  if (typeof d !== 'object' || Array.isArray(d)) return `error: error validating "${file}": error validating data: invalid object to validate; if you choose to ignore these errors, turn validation off with --validate=false`;
  if (!d.kind) return `error: error validating "${file}": error validating data: kind not set; if you choose to ignore these errors, turn validation off with --validate=false`;
  if (!d.apiVersion) return `error: error validating "${file}": error validating data: apiVersion not set; if you choose to ignore these errors, turn validation off with --validate=false`;
  const k = SIMK8_KINDS.find(x => x.kind === d.kind);
  const name = d.metadata && d.metadata.name ? d.metadata.name : '';
  if (!k) return `error: resource mapping not found for name: "${name}" namespace: "${(d.metadata || {}).namespace || ''}" from "${file}": no matches for kind "${d.kind}" in version "${d.apiVersion}"\nensure CRDs are installed first`;
  if (d.apiVersion !== simk8ApiVersion(k) && !(k.kind === 'HorizontalPodAutoscaler' && d.apiVersion === 'autoscaling/v1')) return `error: resource mapping not found for name: "${name}" namespace: "${(d.metadata || {}).namespace || ''}" from "${file}": no matches for kind "${d.kind}" in version "${d.apiVersion}"\nensure CRDs are installed first`;
  if (!d.metadata || !d.metadata.name) return `error: error validating "${file}": error validating data: ValidationError(${d.kind}.metadata): missing required field "name" in io.k8s.apimachinery.pkg.apis.meta.v1.ObjectMeta; if you choose to ignore these errors, turn validation off with --validate=false`;
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/.test(d.metadata.name)) return `The ${d.kind} "${d.metadata.name}" is invalid: metadata.name: Invalid value: "${d.metadata.name}": a lowercase RFC 1123 subdomain must consist of lower case alphanumeric characters, '-' or '.', and must start and end with an alphanumeric character (e.g. 'example.com', regex used for validation is '[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*')`;
  const V = (path, field, type) => `error: error validating "${file}": error validating data: ValidationError(${path}): missing required field "${field}" in ${type}; if you choose to ignore these errors, turn validation off with --validate=false`;
  const U = (path, field, type) => `error: error validating "${file}": error validating data: ValidationError(${path}): unknown field "${field}" in ${type}; if you choose to ignore these errors, turn validation off with --validate=false`;
  const podSpec = (ps, path) => {
    if (!ps) return V(path.replace(/\.spec$/, ''), 'spec', 'io.k8s.api.core.v1.PodTemplateSpec');
    if (!ps.containers || !Array.isArray(ps.containers) || !ps.containers.length) return V(path, 'containers', 'io.k8s.api.core.v1.PodSpec');
    for (let i = 0; i < ps.containers.length; i++) { const c = ps.containers[i]; if (!c.name) return V(`${path}.containers[${i}]`, 'name', 'io.k8s.api.core.v1.Container'); if (!c.image) return `The ${d.kind} "${d.metadata.name}" is invalid: ${path.replace(/^\w+\./, '')}.containers[${i}].image: Required value`; for (const f of Object.keys(c)) if (!['name', 'image', 'command', 'args', 'env', 'envFrom', 'ports', 'resources', 'volumeMounts', 'livenessProbe', 'readinessProbe', 'startupProbe', 'imagePullPolicy', 'workingDir', 'securityContext', 'lifecycle', 'stdin', 'tty', 'terminationMessagePath', 'terminationMessagePolicy'].includes(f)) return U(`${path}.containers[${i}]`, f, 'io.k8s.api.core.v1.Container'); if (c.ports) for (const p of c.ports) if (p.containerPort == null) return V(`${path}.containers[${i}].ports[0]`, 'containerPort', 'io.k8s.api.core.v1.ContainerPort'); }
    for (const f of Object.keys(ps)) if (!['containers', 'initContainers', 'volumes', 'restartPolicy', 'nodeSelector', 'serviceAccountName', 'serviceAccount', 'tolerations', 'affinity', 'hostNetwork', 'dnsPolicy', 'imagePullSecrets', 'securityContext', 'terminationGracePeriodSeconds', 'nodeName', 'priorityClassName', 'schedulerName', 'hostname', 'subdomain', 'automountServiceAccountToken', 'enableServiceLinks', 'topologySpreadConstraints', 'shareProcessNamespace', 'runtimeClassName', 'preemptionPolicy', 'priority', 'activeDeadlineSeconds'].includes(f)) return U(path, f, 'io.k8s.api.core.v1.PodSpec');
    return null;
  };
  const s = d.spec;
  switch (d.kind) {
    case 'Deployment': case 'ReplicaSet': case 'StatefulSet': case 'DaemonSet': {
      if (!s) return V(d.kind, 'spec', `io.k8s.api.apps.v1.${d.kind}`);
      if (!s.selector) return V(`${d.kind}.spec`, 'selector', `io.k8s.api.apps.v1.${d.kind}Spec`);
      if (!s.template) return V(`${d.kind}.spec`, 'template', `io.k8s.api.apps.v1.${d.kind}Spec`);
      for (const f of Object.keys(s)) if (!['replicas', 'selector', 'template', 'strategy', 'minReadySeconds', 'revisionHistoryLimit', 'paused', 'progressDeadlineSeconds', 'updateStrategy', 'serviceName', 'podManagementPolicy', 'volumeClaimTemplates'].includes(f)) return U(`${d.kind}.spec`, f, `io.k8s.api.apps.v1.${d.kind}Spec`);
      if (s.replicas != null && (typeof s.replicas !== 'number' || !Number.isInteger(s.replicas))) return `error: error validating "${file}": error validating data: ValidationError(${d.kind}.spec.replicas): invalid type for io.k8s.api.apps.v1.${d.kind}Spec.replicas: got "string", expected "integer"; if you choose to ignore these errors, turn validation off with --validate=false`;
      const pe = podSpec(s.template.spec, `${d.kind}.spec.template.spec`); if (pe) return pe;
      const tl = ((s.template.metadata || {}).labels) || {};
      if (!simk8SelectorMatch(s.selector, tl) && d.kind !== 'DaemonSet') return `The ${d.kind} "${d.metadata.name}" is invalid: spec.template.metadata.labels: Invalid value: map[string]string{${Object.entries(tl).map(([k, v]) => `"${k}":"${v}"`).join(', ')}}: \`selector\` does not match template \`labels\``;
      if (s.strategy && s.strategy.type && !['RollingUpdate', 'Recreate'].includes(s.strategy.type)) return `The Deployment "${d.metadata.name}" is invalid: spec.strategy.type: Unsupported value: "${s.strategy.type}": supported values: "Recreate", "RollingUpdate"`;
      return null;
    }
    case 'Pod': { if (!s) return V('Pod', 'spec', 'io.k8s.api.core.v1.Pod'); return podSpec(s, 'Pod.spec'); }
    case 'Service': {
      if (!s) return V('Service', 'spec', 'io.k8s.api.core.v1.Service');
      if (s.type && !['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'].includes(s.type)) return `The Service "${d.metadata.name}" is invalid: spec.type: Unsupported value: "${s.type}": supported values: "ClusterIP", "ExternalName", "LoadBalancer", "NodePort"`;
      if ((!s.ports || !s.ports.length) && s.type !== 'ExternalName') return `The Service "${d.metadata.name}" is invalid: spec.ports: Required value`;
      for (let i = 0; i < (s.ports || []).length; i++) { if (s.ports[i].port == null) return V(`Service.spec.ports[${i}]`, 'port', 'io.k8s.api.core.v1.ServicePort'); if ((s.ports || []).length > 1 && !s.ports[i].name) return `The Service "${d.metadata.name}" is invalid: spec.ports[${i}].name: Required value`; }
      for (const f of Object.keys(s)) if (!['type', 'selector', 'ports', 'clusterIP', 'clusterIPs', 'externalName', 'sessionAffinity', 'externalTrafficPolicy', 'internalTrafficPolicy', 'ipFamilies', 'ipFamilyPolicy', 'loadBalancerIP', 'externalIPs', 'publishNotReadyAddresses', 'healthCheckNodePort', 'allocateLoadBalancerNodePorts', 'loadBalancerClass'].includes(f)) return U('Service.spec', f, 'io.k8s.api.core.v1.ServiceSpec');
      return null;
    }
    case 'Ingress': { if (!s) return V('Ingress', 'spec', 'io.k8s.api.networking.v1.Ingress'); if (!s.rules && !s.defaultBackend) return `The Ingress "${d.metadata.name}" is invalid: spec: Invalid value: []networking.IngressRule(nil): either \`defaultBackend\` or \`rules\` must be specified`; for (const r of (s.rules || [])) for (const p of ((r.http || {}).paths || [])) { if (!p.pathType) return `The Ingress "${d.metadata.name}" is invalid: spec.rules[0].http.paths[0].pathType: Required value: pathType must be specified`; if (!p.backend || !p.backend.service || !p.backend.service.name) return V('Ingress.spec.rules[0].http.paths[0].backend', 'service', 'io.k8s.api.networking.v1.IngressBackend'); if (!p.backend.service.port) return `The Ingress "${d.metadata.name}" is invalid: spec.rules[0].http.paths[0].backend.service.port: Required value`; } return null; }
    case 'HorizontalPodAutoscaler': { if (!s) return V('HorizontalPodAutoscaler', 'spec', 'io.k8s.api.autoscaling.v2.HorizontalPodAutoscaler'); if (!s.scaleTargetRef) return V('HorizontalPodAutoscaler.spec', 'scaleTargetRef', 'io.k8s.api.autoscaling.v2.HorizontalPodAutoscalerSpec'); if (s.maxReplicas == null) return V('HorizontalPodAutoscaler.spec', 'maxReplicas', 'io.k8s.api.autoscaling.v2.HorizontalPodAutoscalerSpec'); if (s.minReplicas != null && s.minReplicas > s.maxReplicas) return `The HorizontalPodAutoscaler "${d.metadata.name}" is invalid: spec.maxReplicas: Invalid value: ${s.maxReplicas}: must be greater than or equal to \`minReplicas\``; return null; }
    case 'Job': { if (!s) return V('Job', 'spec', 'io.k8s.api.batch.v1.Job'); if (!s.template) return V('Job.spec', 'template', 'io.k8s.api.batch.v1.JobSpec'); const pe = podSpec(s.template.spec, 'Job.spec.template.spec'); if (pe) return pe; if (!s.template.spec.restartPolicy || s.template.spec.restartPolicy === 'Always') return `The Job "${d.metadata.name}" is invalid: spec.template.spec.restartPolicy: Required value: valid values: "OnFailure", "Never"`; return null; }
    case 'CronJob': { if (!s) return V('CronJob', 'spec', 'io.k8s.api.batch.v1.CronJob'); if (!s.schedule) return V('CronJob.spec', 'schedule', 'io.k8s.api.batch.v1.CronJobSpec'); if (!/^(@(yearly|annually|monthly|weekly|daily|midnight|hourly)|(\S+\s+){4}\S+)$/.test(String(s.schedule).trim())) return `The CronJob "${d.metadata.name}" is invalid: spec.schedule: Invalid value: "${s.schedule}": expected exactly 5 fields, found ${String(s.schedule).trim().split(/\s+/).length}: [${String(s.schedule).trim().split(/\s+/).join(' ')}]`; if (!s.jobTemplate) return V('CronJob.spec', 'jobTemplate', 'io.k8s.api.batch.v1.CronJobSpec'); if (!s.jobTemplate.spec || !s.jobTemplate.spec.template) return V('CronJob.spec.jobTemplate.spec', 'template', 'io.k8s.api.batch.v1.JobSpec'); const pe = podSpec(s.jobTemplate.spec.template.spec, 'CronJob.spec.jobTemplate.spec.template.spec'); if (pe) return pe; if (!s.jobTemplate.spec.template.spec.restartPolicy || s.jobTemplate.spec.template.spec.restartPolicy === 'Always') return `The CronJob "${d.metadata.name}" is invalid: spec.jobTemplate.spec.template.spec.restartPolicy: Required value: valid values: "OnFailure", "Never"`; return null; }
    case 'ConfigMap': { if (d.data && Object.values(d.data).some(v => typeof v === 'object' && v !== null)) return `error: error validating "${file}": error validating data: ValidationError(ConfigMap.data): invalid type for io.k8s.api.core.v1.ConfigMap.data: got "map", expected "string"; if you choose to ignore these errors, turn validation off with --validate=false`; return null; }
    case 'Secret': { if (d.data) for (const [k, v] of Object.entries(d.data)) if (!/^[A-Za-z0-9+/=\s]*$/.test(String(v))) return `Error from server (BadRequest): error when creating "${file}": Secret in version "v1" cannot be handled as a Secret: illegal base64 data at input byte ${String(v).search(/[^A-Za-z0-9+/=\s]/)}\n💡 ` + lt('data altindaki degerler base64 olmali, duz metin icin stringData kullan', 'values under data must be base64, use stringData for plain text'); return null; }
    default: return null;
  }
}
function simk8ApplyOne(sh, st, d, file, nsFlag, mode, verb) {
  const err = simk8Validate(st, d, file); if (err) return { err };
  const k = SIMK8_KINDS.find(x => x.kind === d.kind);
  const ns = k.namespaced ? (d.metadata.namespace || nsFlag || simk8CurrentNs(st)) : null;
  if (k.namespaced && !SIMK8_find(st, 'Namespace', null, ns)) return { err: `Error from server (NotFound): error when creating "${file}": namespaces "${ns}" not found` };
  const existing = SIMK8_find(st, k.kind, ns, d.metadata.name);
  const name = simk8ResName(st, { kind: k.kind, metadata: { name: d.metadata.name } });
  const dry = mode === 'client' ? ' (dry run)' : (mode === 'server' ? ' (server dry run)' : '');
  if (existing && verb === 'create') return { err: `Error from server (AlreadyExists): error when creating "${file}": ${k.plural}${k.group ? '.' + k.group : ''} "${d.metadata.name}" already exists` };
  const incoming = simk8Clone(d);
  if (incoming.kind === 'Secret' && incoming.stringData) { incoming.data = incoming.data || {}; Object.entries(incoming.stringData).forEach(([kk, v]) => { incoming.data[kk] = simk8B64e(String(v)); }); delete incoming.stringData; }
  if (incoming.kind === 'ConfigMap' && incoming.data) Object.keys(incoming.data).forEach(kk => { incoming.data[kk] = String(incoming.data[kk]); });
  if (incoming.kind === 'HorizontalPodAutoscaler' && incoming.apiVersion === 'autoscaling/v1') { incoming.apiVersion = 'autoscaling/v2'; if (incoming.spec.targetCPUUtilizationPercentage) { incoming.spec.metrics = [{ type: 'Resource', resource: { name: 'cpu', target: { type: 'Utilization', averageUtilization: incoming.spec.targetCPUUtilizationPercentage } } }]; delete incoming.spec.targetCPUUtilizationPercentage; } }
  if (existing) {
    if (existing._sys && !/^(ConfigMap)$/.test(k.kind)) return { err: `Error from server (Forbidden): error when applying patch:\n${k.plural} "${d.metadata.name}" is forbidden: ` + lt('lab, sistem nesnesi degistirilemez', 'lab, a system object cannot be changed') };
    if (k.kind === 'Deployment' && JSON.stringify((existing.spec.selector || {})) !== JSON.stringify(incoming.spec.selector || {})) return { err: `The Deployment "${d.metadata.name}" is invalid: spec.selector: Invalid value: v1.LabelSelector{MatchLabels:map[string]string{${Object.entries((incoming.spec.selector || {}).matchLabels || {}).map(([a, b]) => `"${a}":"${b}"`).join(', ')}}, MatchExpressions:[]v1.LabelSelectorRequirement(nil)}: field is immutable` };
    if (k.kind === 'Job' && JSON.stringify(existing.spec.template) !== JSON.stringify(incoming.spec.template)) return { err: `The Job "${d.metadata.name}" is invalid: spec.template: Invalid value: core.PodTemplateSpec{...}: field is immutable` };
    if (k.kind === 'Service' && incoming.spec.clusterIP && incoming.spec.clusterIP !== existing.spec.clusterIP && incoming.spec.clusterIP !== 'None') return { err: `The Service "${d.metadata.name}" is invalid: spec.clusterIPs[0]: Invalid value: []string{"${incoming.spec.clusterIP}"}: may not change once set` };
    const cmp = o => JSON.stringify({ spec: o.spec, data: o.data, stringData: o.stringData, type: o.type, labels: (o.metadata || {}).labels || {}, ann: Object.fromEntries(Object.entries((o.metadata || {}).annotations || {}).filter(([kk]) => !/^(deployment\.kubernetes\.io|kubectl\.kubernetes\.io)/.test(kk))) });
    const before = cmp(existing); const after = cmp(incoming);
    const changed = before !== after;
    if (mode) return { out: `${name} ${changed ? 'configured' : 'unchanged'}${dry}`, changed, obj: existing };
    if (!changed) return { out: `${name} unchanged`, changed: false, obj: existing };
    if (k.kind === 'Deployment' && JSON.stringify(existing.spec.template) !== JSON.stringify(incoming.spec.template)) existing.metadata.generation = (existing.metadata.generation || 1) + 1;
    if (k.kind === 'Deployment' && existing.spec.replicas !== incoming.spec.replicas) existing.metadata.generation = (existing.metadata.generation || 1) + 1;
    const keepAnn = Object.fromEntries(Object.entries(existing.metadata.annotations || {}).filter(([kk]) => /^deployment\.kubernetes\.io/.test(kk)));
    if (k.kind === 'Service') { const keep = existing.spec; incoming.spec.clusterIP = incoming.spec.clusterIP || keep.clusterIP; incoming.spec.clusterIPs = keep.clusterIPs; incoming.spec.ipFamilies = keep.ipFamilies; incoming.spec.ipFamilyPolicy = keep.ipFamilyPolicy; incoming.spec.sessionAffinity = incoming.spec.sessionAffinity || keep.sessionAffinity; incoming.spec.internalTrafficPolicy = incoming.spec.internalTrafficPolicy || keep.internalTrafficPolicy; (incoming.spec.ports || []).forEach(np => { const op = (keep.ports || []).find(x => x.port === np.port && (x.protocol || 'TCP') === (np.protocol || 'TCP')); if (op && op.nodePort && !np.nodePort && (incoming.spec.type === 'NodePort' || incoming.spec.type === 'LoadBalancer')) np.nodePort = op.nodePort; }); }
    existing.spec = incoming.spec; if (incoming.data !== undefined) existing.data = incoming.data; else delete existing.data; if (incoming.type) existing.type = incoming.type;
    existing.metadata.labels = incoming.metadata.labels || {};
    existing.metadata.annotations = Object.assign({}, keepAnn, incoming.metadata.annotations || {}, verb === 'apply' ? { 'kubectl.kubernetes.io/last-applied-configuration': JSON.stringify(d) + '\n' } : {});
    existing.metadata.resourceVersion = String(parseInt(existing.metadata.resourceVersion, 10) + 1 + Math.floor(Math.random() * 5));
    if (k.kind === 'Service') { delete existing._endpoints; }
    return { out: `${name} configured`, changed: true, obj: existing };
  }
  if (mode) return { out: `${name} created${dry}`, changed: true, obj: incoming };
  const o = simk8Obj(st, k.kind, ns, d.metadata.name, incoming.spec || {}, {});
  if (incoming.data !== undefined) o.data = incoming.data; if (incoming.type) o.type = incoming.type; if (incoming.binaryData) o.binaryData = incoming.binaryData;
  if (k.kind === 'Secret') o.type = o.type || 'Opaque';
  if (k.kind === 'StorageClass') { o.provisioner = incoming.provisioner; o.reclaimPolicy = incoming.reclaimPolicy || 'Delete'; o.volumeBindingMode = incoming.volumeBindingMode || 'Immediate'; }
  if (k.kind === 'RoleBinding') { o.roleRef = incoming.roleRef; o.subjects = incoming.subjects; }
  if (k.kind === 'Role' || k.kind === 'ClusterRole') o.rules = incoming.rules;
  o.metadata.labels = incoming.metadata.labels || {};
  o.metadata.annotations = Object.assign({}, incoming.metadata.annotations || {}, verb === 'apply' ? { 'kubectl.kubernetes.io/last-applied-configuration': JSON.stringify(d) + '\n' } : {});
  if (k.kind === 'Namespace') { o.status = { phase: 'Active' }; o.metadata.labels['kubernetes.io/metadata.name'] = o.metadata.name; const sa = simk8Obj(st, 'ServiceAccount', o.metadata.name, 'default', {}, {}); sa._sys = true; }
  if (k.kind === 'Deployment') { o.metadata.generation = 1; o.spec.replicas = o.spec.replicas == null ? 1 : o.spec.replicas; }
  if (k.kind === 'Pod') { o._p = { startTick: null, node: null, ip: null, restarts: 0, created: st.tick }; }
  if (k.kind === 'Job') { o.metadata.labels['batch.kubernetes.io/controller-uid'] = o.metadata.uid; o.metadata.labels['batch.kubernetes.io/job-name'] = o.metadata.name; o.metadata.labels['controller-uid'] = o.metadata.uid; o.metadata.labels['job-name'] = o.metadata.name; }
  return { out: `${name} created`, changed: true, obj: o };
}
/* kaynak secimi, 'deploy web', 'deploy/web', 'pods,svc', 'all' */
function simk8Select(st, a, rest, ns) {
  const specs = []; let names = [];
  if (!rest.length) return { err: 'error: You must specify the type of resource to get. Use "kubectl api-resources" for a complete list of supported resources.\n\nerror: Required resource not specified.\nUse "kubectl explain <resource>" for a detailed description of that resource (e.g. kubectl explain pods).\nSee \'kubectl get -h\' for help and examples' };
  const first = rest[0];
  if (first.includes('/') && !first.includes(',')) { rest.forEach(r => { const [t, n] = r.split('/'); const k = simk8Kind(t); if (!k) { specs.push({ err: t }); return; } specs.push({ k, name: n }); }); }
  else { const types = first === 'all' ? ['pods', 'services', 'daemonsets', 'deployments', 'replicasets', 'statefulsets', 'jobs', 'cronjobs', 'horizontalpodautoscalers'] : first.split(','); names = rest.slice(1); types.forEach(t => { const k = simk8Kind(t); if (!k) { specs.push({ err: t }); return; } if (names.length) names.forEach(n => specs.push({ k, name: n })); else specs.push({ k, name: null, all: first === 'all' }); }); }
  const bad = specs.find(s => s.err); if (bad) return { err: `error: the server doesn't have a resource type "${bad.err}"` };
  const items = []; const errs = [];
  for (const s of specs) {
    if (s.name) { const o = SIMK8_find(st, s.k.kind, ns === '*' ? simk8CurrentNs(st) : ns, s.name) || (s.k.kind === 'Endpoints' ? (() => { const svc = SIMK8_find(st, 'Service', ns === '*' ? simk8CurrentNs(st) : ns, s.name); return svc ? Object.assign({}, svc, { kind: 'Endpoints', _svc: svc }) : null; })() : null); if (!o) errs.push(`Error from server (NotFound): ${s.k.plural}${s.k.group ? '.' + s.k.group : ''} "${s.name}" not found`); else items.push(o); }
    else { let list = s.k.kind === 'Endpoints' ? SIMK8_list(st, 'Service', ns).map(svc => Object.assign({}, svc, { kind: 'Endpoints', _svc: svc })) : (s.k.kind === 'Event' ? [] : SIMK8_list(st, s.k.kind, ns)); if (a.val('l', 'selector')) list = list.filter(o => simk8LabelSel(a.val('l', 'selector'), o.metadata.labels)); if (a.val('field-selector')) { const fs = a.val('field-selector'); list = list.filter(o => fs.split(',').every(f => { const m = /^([\w.]+)(!=|=)(.*)$/.exec(f); if (!m) return true; const v = m[1] === 'status.phase' ? (o.status || {}).phase : (m[1] === 'metadata.name' ? o.metadata.name : (m[1] === 'spec.nodeName' ? (o._p || {}).node : m[1].split('.').reduce((x, y) => x == null ? x : x[y], o))); return m[2] === '=' ? String(v) === m[3] : String(v) !== m[3]; })); } items.push(...list); if (!list.length && !s.all) items.emptyKind = (items.emptyKind || []).concat(s.k); }
  }
  return { items, errs, specs };
}
function simk8ProbeOut(sh, st, items, a, ns, showKindPrefix) {
  const wide = a.val('o', 'output') === 'wide';
  const showLabels = a.has('show-labels');
  const groups = []; items.forEach(o => { let g = groups.find(x => x.kind === o.kind); if (!g) { g = { kind: o.kind, rows: [] }; groups.push(g); } g.rows.push(o); });
  const multi = groups.length > 1 || showKindPrefix;
  let out = '';
  const sortBy = a.val('sort-by');
  groups.forEach((g, gi) => {
    let list = g.rows;
    if (sortBy) { const p = sortBy.replace(/^\{|\}$/g, '').replace(/^\./, ''); list = list.slice().sort((x, y) => { const vx = p.split('.').reduce((o, k) => o == null ? o : o[k], simk8Export(st, x)); const vy = p.split('.').reduce((o, k) => o == null ? o : o[k], simk8Export(st, y)); return vx < vy ? -1 : (vx > vy ? 1 : 0); }); }
    const rows = []; let header = null;
    list.forEach(o => { const k = simk8Kind(o.kind); const { h, r } = simk8Row(sh, st, o, wide); if (ns === '*' && k.namespaced) { h.unshift('NAMESPACE'); r.unshift(o.metadata.namespace); } if (multi) r[ns === '*' && k.namespaced ? 1 : 0] = `${k.singular}${k.group && k.kind !== 'Deployment' && k.kind !== 'ReplicaSet' ? '.' + k.group : (k.group ? '.' + k.group : '')}/${o.metadata.name}`; if (showLabels) { h.push('LABELS'); r.push(simk8Labels(o.metadata.labels)); } header = h; rows.push(r); });
    if (!header) return;
    out += (gi > 0 ? '\n' : '') + simk8Table([header].concat(rows));
  });
  return out;
}

/* ---------- kubectl ---------- */
const SIMK8_VALUED = ['n', 'namespace', 'o', 'output', 'l', 'selector', 'f', 'filename', 'c', 'container', 'replicas', 'image', 'dry-run', 'grace-period', 'tail', 'since', 'from-literal', 'from-file', 'from-env-file', 'port', 'target-port', 'type', 'to-revision', 'min', 'max', 'cpu-percent', 'schedule', 'from', 'restart', 'env', 'sort-by', 'field-selector', 'timeout', 'for', 'context', 'cluster', 'user', 'resource-version', 'limit', 'revision', 'p', 'patch', 'overwrite', 'name', 'command', 'k', 'kustomize', 'template', 'custom-columns', 'cascade', 'chunk-size', 'address', 'protocol', 'external-name', 'cluster-ip', 'labels', 'annotations', 'serviceaccount', 'ttl', 'types', 'requests', 'limits', 'rule', 'class', 'tcp', 'docker-server', 'docker-username', 'docker-password', 'api-group', 'since-time', 'max-log-requests', 'pod-running-timeout', 'cpu', 'memory', 'hostport', 'generator', 'requests', 'env-file'];
const SIMK8_USAGE = `kubectl controls the Kubernetes cluster manager.

 Find more information at: https://kubernetes.io/docs/reference/kubectl/

Basic Commands (Beginner):
  create          Create a resource from a file or from stdin
  expose          Take a replication controller, service, deployment or pod and expose it as a new Kubernetes service
  run             Run a particular image on the cluster
  set             Set specific features on objects

Basic Commands (Intermediate):
  explain         Get documentation for a resource
  get             Display one or many resources
  edit            Edit a resource on the server
  delete          Delete resources by file names, stdin, resources and names, or by resources and label selector

Deploy Commands:
  rollout         Manage the rollout of a resource
  scale           Set a new size for a deployment, replica set, or replication controller
  autoscale       Auto-scale a deployment, replica set, stateful set, or replication controller

Cluster Management Commands:
  cluster-info    Display cluster information
  top             Display resource (CPU/memory) usage
  cordon          Mark node as unschedulable
  uncordon        Mark node as schedulable
  drain           Drain node in preparation for maintenance
  taint           Update the taints on one or more nodes

Troubleshooting and Debugging Commands:
  describe        Show details of a specific resource or group of resources
  logs            Print the logs for a container in a pod
  attach          Attach to a running container
  exec            Execute a command in a container
  port-forward    Forward one or more local ports to a pod
  proxy           Run a proxy to the Kubernetes API server
  cp              Copy files and directories to and from containers
  auth            Inspect authorization
  debug           Create debugging sessions for troubleshooting workloads and nodes
  events          List events

Advanced Commands:
  diff            Diff the live version against a would-be applied version
  apply           Apply a configuration to a resource by file name or stdin
  patch           Update fields of a resource
  replace         Replace a resource by file name or stdin
  wait            Experimental: Wait for a specific condition on one or many resources
  kustomize       Build a kustomization target from a directory or URL

Settings Commands:
  label           Update the labels on a resource
  annotate        Update the annotations on a resource
  completion      Output shell completion code for the specified shell (bash, zsh, fish, or powershell)

Other Commands:
  api-resources   Print the supported API resources on the server
  api-versions    Print the supported API versions on the server, in the form of "group/version"
  config          Modify kubeconfig files
  plugin          Provides utilities for interacting with plugins
  version         Print the client and server version information

Lab Commands:
  hpa-load        start|stop|status, HPA icin sentetik CPU yuku

Usage:
  kubectl [flags] [options]

Use "kubectl <command> --help" for more information about a given command.
Use "kubectl options" for a list of global command-line options (applies to all commands).
`;
function simk8Command(args, stdin) {
  const sh = this;
  args = args.flatMap(a => /\n/.test(a) ? a.split(/\s+/).filter(Boolean) : [a]);
  const st = SIMK8_load(sh);
  st.tick++;
  if (st.context === 'prod-eks' && !(args[0] === 'config')) { SIMK8_save(sh, st); return simk8Err('E1013 16:02:11.418273   48211 memcache.go:265] couldn\'t get current server API group list: Get "https://A1B2C3D4E5.gr7.eu-west-1.eks.amazonaws.com/api?timeout=32s": dial tcp: lookup A1B2C3D4E5.gr7.eu-west-1.eks.amazonaws.com: no such host\nUnable to connect to the server: dial tcp: lookup A1B2C3D4E5.gr7.eu-west-1.eks.amazonaws.com: no such host\n💡 ' + lt('Bu lab\'da prod cluster\'a erişim yok, kubectl config use-context kind-netops ile geri dön', 'There is no access to the prod cluster in this lab, go back with kubectl config use-context kind-netops')); }
  if (st.context === 'minikube' && !(args[0] === 'config')) { SIMK8_save(sh, st); return simk8Err('E1013 16:02:11.418273   48211 memcache.go:265] couldn\'t get current server API group list: Get "https://192.168.49.2:8443/api?timeout=32s": dial tcp 192.168.49.2:8443: connect: no route to host\nUnable to connect to the server: dial tcp 192.168.49.2:8443: connect: no route to host\n💡 ' + lt('minikube context\'i bu lab\'da kapalı, kubectl config use-context kind-netops kullan', 'the minikube context is disabled in this lab, use kubectl config use-context kind-netops')); }
  simk8Reconcile(sh, st);
  let r;
  try { r = simk8Dispatch(sh, st, args, stdin); } catch (e) { r = simk8Err(lt(`kubectl: lab iç hata, ${e.message}`, `kubectl: internal lab error, ${e.message}`)); if (typeof console !== 'undefined' && console.error) console.error(e); }
  simk8Reconcile(sh, st);
  SIMK8_save(sh, st);
  return r || ok();
}
function simk8OutputObjs(sh, st, objs, fmt, isList) {
  const exp = objs.map(o => o.kind === 'Endpoints' && o._svc ? simk8Endpoints(st, o._svc) : simk8Export(st, o));
  const doc = isList || exp.length !== 1 ? { apiVersion: 'v1', items: exp, kind: 'List', metadata: { resourceVersion: '' } } : exp[0];
  if (fmt === 'json') return JSON.stringify(doc, null, 4) + '\n';
  if (fmt === 'yaml') return simk8Yaml(doc);
  if (fmt === 'name') return exp.map(o => `${simk8Kind(o.kind).singular}${simk8Kind(o.kind).group ? '.' + simk8Kind(o.kind).group : ''}/${o.metadata.name}`).join('\n') + (exp.length ? '\n' : '');
  if (fmt.startsWith('jsonpath=') || fmt.startsWith('jsonpath-as-json=') || fmt.startsWith('go-template=') || fmt.startsWith('template=')) { const tpl = fmt.slice(fmt.indexOf('=') + 1).replace(/^['"]|['"]$/g, ''); try { return simk8JsonPath(tpl.replace(/\{\{\s*([^}]*?)\s*\}\}/g, '{$1}'), doc); } catch (e) { return null; } }
  if (fmt.startsWith('custom-columns=')) { const cols = fmt.slice(15).split(',').map(c => { const [h, p] = c.split(':'); return { h, p: p.replace(/^\./, '') }; }); const rows = [cols.map(c => c.h)]; exp.forEach(o => rows.push(cols.map(c => { const v = simk8JsonPath(`{.${c.p}}`, o); return v === '' ? '<none>' : v; }))); return simk8Table(rows); }
  return null;
}
function simk8Dispatch(sh, st, args, stdin) {
  const verb = args[0]; const a = simk8Args(args.slice(1), SIMK8_VALUED, verb === 'logs' ? ['f'] : (verb === 'exec' || verb === 'attach' || verb === 'run' ? ['c'] : []));
  if (verb === 'logs') { /* -c konteyner */ const ci = args.indexOf('-c'); if (ci > 0 && args[ci + 1]) { a.vals.c = args[ci + 1]; a.rest.splice(a.rest.indexOf(args[ci + 1]), 1); } }
  if (verb === 'exec' || verb === 'run') { const ci = args.indexOf('-c'); if (ci > 0 && args[ci + 1] && verb === 'exec') { a.vals.c = args[ci + 1]; a.rest.splice(a.rest.indexOf(args[ci + 1]), 1); } }
  const ns = simk8Ns(st, a);
  const nsExact = a.val('n', 'namespace') || simk8CurrentNs(st);
  if (!verb || verb === '--help' || verb === 'help' || verb === 'options') return ok(SIMK8_USAGE);
  if (a.has('help', 'h') && verb !== 'hpa-load') return ok(lt(`lab: kubectl ${verb} için yardım kısa, man kubectl yaz\n`, `lab: help for kubectl ${verb} is short, type man kubectl\n`));
  if (a.val('n', 'namespace') && !SIMK8_find(st, 'Namespace', null, a.val('n', 'namespace')) && !['config', 'create', 'apply', 'api-resources', 'version', 'cluster-info', 'explain', 'delete'].includes(verb)) { if (verb === 'get' && (!a.val('o', 'output') || a.val('o', 'output') === 'wide')) return ok(`No resources found in ${a.val('n', 'namespace')} namespace.\n`); return simk8Err(`Error from server (NotFound): namespaces "${a.val('n', 'namespace')}" not found`); }
  switch (verb) {
    case 'version': { if (a.has('client')) return ok(`Client Version: ${SIMK8_VERSION}\nKustomize Version: v5.4.2\n`); return ok(`Client Version: ${SIMK8_VERSION}\nKustomize Version: v5.4.2\nServer Version: ${SIMK8_VERSION}\n`); }
    case 'cluster-info': return ok('Kubernetes control plane is running at https://127.0.0.1:41347\nCoreDNS is running at https://127.0.0.1:41347/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy\n\nTo further debug and diagnose cluster problems, use \'kubectl cluster-info dump\'.\n');
    case 'api-versions': return ok(['admissionregistration.k8s.io/v1', 'apiextensions.k8s.io/v1', 'apiregistration.k8s.io/v1', 'apps/v1', 'authentication.k8s.io/v1', 'authorization.k8s.io/v1', 'autoscaling/v1', 'autoscaling/v2', 'batch/v1', 'certificates.k8s.io/v1', 'coordination.k8s.io/v1', 'discovery.k8s.io/v1', 'events.k8s.io/v1', 'flowcontrol.apiserver.k8s.io/v1', 'networking.k8s.io/v1', 'node.k8s.io/v1', 'policy/v1', 'rbac.authorization.k8s.io/v1', 'scheduling.k8s.io/v1', 'storage.k8s.io/v1', 'v1'].join('\n') + '\n');
    case 'api-resources': { const rows = [['NAME', 'SHORTNAMES', 'APIVERSION', 'NAMESPACED', 'KIND']]; SIMK8_KINDS.slice().sort((x, y) => (x.group + x.plural).localeCompare(y.group + y.plural)).forEach(k => { if (a.val('api-group') !== undefined && a.val('api-group') !== k.group) return; if (a.has('namespaced') && !k.namespaced) return; rows.push([k.plural, k.short.join(','), simk8ApiVersion(k), String(k.namespaced), k.kind]); }); return ok(simk8Table(rows)); }
    case 'config': return simk8Config(sh, st, a, args.slice(1));
    case 'apply': case 'create': case 'replace': {
      if (verb === 'create' && !a.val('f', 'filename') && !a.val('k', 'kustomize')) return simk8CreateImperative(sh, st, a, args.slice(1), ns);
      const files = a.all('f', 'filename'); if (a.val('k', 'kustomize')) return simk8Err(lt('error: lab, kustomize bu lab\'da yok, kubectl apply -f dizin kullan', 'error: lab, kustomize is not available in this lab, use kubectl apply -f directory'));
      if (!files.length) return simk8Err(`error: must specify one of -f and -k`);
      const mode = a.val('dry-run'); if (mode && !['client', 'server', 'none'].includes(mode)) return simk8Err(`error: Invalid dry-run value (${mode}). Must be "none", "server", or "client".`);
      const dm = mode === 'none' ? null : mode;
      let out = ''; let errs = ''; const made = [];
      for (const f of files) {
        const r = simk8ReadDocs(sh, f); if (r.err) return simk8Err(r.err);
        if (!r.docs.length) return simk8Err(`error: no objects passed to ${verb}`);
        for (const { doc, file } of r.docs) {
          const res = simk8ApplyOne(sh, st, doc, file, a.val('n', 'namespace'), dm, verb === 'replace' ? 'apply' : verb);
          if (res.err) { errs += res.err + '\n'; continue; }
          out += res.out + '\n'; made.push(res.obj);
          if (a.has('record') && res.obj && res.obj.metadata) { res.obj.metadata.annotations = res.obj.metadata.annotations || {}; res.obj.metadata.annotations['kubernetes.io/change-cause'] = `kubectl ${args.join(' ')}`; }
        }
      }
      if (!dm) simk8Reconcile(sh, st);
      const fmt = a.val('o', 'output');
      if (fmt && made.length) { const txt = simk8OutputObjs(sh, st, made, fmt, false); if (txt !== null) return { out: txt, err: errs, code: errs ? 1 : 0 }; }
      return { out, err: errs, code: errs ? 1 : 0 };
    }
    case 'get': {
      const sel = simk8Select(st, a, a.rest, ns);
      if (sel.err) return simk8Err(sel.err);
      if (a.rest[0] === 'events' || a.rest[0] === 'ev' || a.rest[0] === 'events.events.k8s.io') { let evs = st.events.filter(e => ns === '*' || e.ns === ns); if (a.val('field-selector')) { const fs = a.val('field-selector'); evs = evs.filter(e => fs.split(',').every(f => { const m = /^([\w.]+)=(.*)$/.exec(f); if (!m) return true; if (m[1] === 'involvedObject.name') return e.name === m[2]; if (m[1] === 'involvedObject.kind') return e.kind === m[2]; if (m[1] === 'type') return e.type === m[2]; if (m[1] === 'reason') return e.reason === m[2]; return true; })); } evs = evs.slice().sort((x, y) => x.last - y.last); if (a.val('sort-by')) evs.sort((x, y) => x.last - y.last); if (a.has('w', 'watch')) return ok(simk8Table(simk8EventRows(st, evs, ns === '*')) + lt('lab: watch simüle edilmiyor, anlık liste gösterildi\n', 'lab: watch is not simulated, the current list is shown\n')); if (!evs.length) return ok(ns === '*' ? 'No resources found\n' : `No resources found in ${ns} namespace.\n`); return ok(simk8Table(simk8EventRows(st, evs, ns === '*'))); }
      let { items, errs } = sel;
      items = items.filter(o => o.kind !== 'Event');
      const fmt = a.val('o', 'output') || '';
      if (errs.length && !items.length) return simk8Err(errs.join('\n'));
      if (fmt && fmt !== 'wide') { const named = sel.specs.some(s => s.name); const txt = simk8OutputObjs(sh, st, items, fmt, !named || items.length !== 1); if (txt === null) return simk8Err(`error: unable to match a printer suitable for the output format "${fmt}", allowed formats are: custom-columns,custom-columns-file,go-template,go-template-file,json,jsonpath,jsonpath-as-json,jsonpath-file,name,template,templatefile,wide,yaml`); return { out: txt + (fmt.startsWith('jsonpath') && !txt.endsWith('\n') ? '' : ''), err: errs.join('\n') + (errs.length ? '\n' : ''), code: errs.length ? 1 : 0 }; }
      if (a.rest.some(x => /^(pod|po|pods)$/.test(x)) || a.rest[0] === 'all') { st.audit.get = (st.audit.get || 0) + 1; }
      if (!items.length) { const k = sel.specs[0] && sel.specs[0].k; void k; return { out: '', err: (ns === '*' ? 'No resources found\n' : `No resources found in ${ns} namespace.\n`) + errs.join('\n') + (errs.length ? '\n' : ''), code: errs.length ? 1 : 0 }; }
      let out = simk8ProbeOut(sh, st, items, a, ns, a.rest[0] === 'all' || (a.rest[0] || '').includes(','));
      if (a.has('w', 'watch')) out += lt('lab: watch simüle edilmiyor, anlık liste gösterildi. Her kubectl komutu cluster saatini ilerletir\n', 'lab: watch is not simulated, the current list is shown. Every kubectl command advances the cluster clock\n');
      return { out, err: errs.join('\n') + (errs.length ? '\n' : ''), code: errs.length ? 1 : 0 };
    }
    case 'describe': {
      const sel = simk8Select(st, a, a.rest, ns);
      if (sel.err) return simk8Err(sel.err);
      let out = ''; const items = sel.items.filter(o => o.kind !== 'Event');
      if (!items.length && !sel.errs.length) return simk8Err(`No resources found in ${ns} namespace.`);
      if (!items.length) return simk8Err(sel.errs.join('\n'));
      items.forEach((o, i) => { if (o.kind === 'Endpoints' && o._svc) { out += (i ? '\n\n' : '') + simk8Describe(sh, st, Object.assign({}, o._svc, { kind: 'Endpoints' })); return; } st.audit.describe.push(`${o.kind}/${o.metadata.name}`); out += (i ? '\n\n' : '') + simk8Describe(sh, st, o); });
      return { out, err: sel.errs.join('\n') + (sel.errs.length ? '\n' : ''), code: sel.errs.length ? 1 : 0 };
    }
    case 'delete': {
      const files = a.all('f', 'filename'); let targets = [];
      if (files.length) { for (const f of files) { const r = simk8ReadDocs(sh, f); if (r.err) return simk8Err(r.err); for (const { doc } of r.docs) { if (!doc || !doc.kind || !doc.metadata) continue; const k = SIMK8_KINDS.find(x => x.kind === doc.kind); if (!k) return simk8Err(`error: unable to recognize "${f}": no matches for kind "${doc.kind}" in version "${doc.apiVersion}"`); const o = SIMK8_find(st, k.kind, k.namespaced ? (doc.metadata.namespace || nsExact) : null, doc.metadata.name); if (!o) { targets.push({ missing: `Error from server (NotFound): error when deleting "${f}": ${k.plural}${k.group ? '.' + k.group : ''} "${doc.metadata.name}" not found` }); continue; } targets.push({ o }); } } }
      else { if (a.has('all') && a.rest.length === 1) { const sel = simk8Select(st, a, a.rest, nsExact); if (sel.err) return simk8Err(sel.err); targets = sel.items.map(o => ({ o })); if (!targets.length) return ok(`No resources found\n`); } else { if (a.rest.length < 2 && !a.rest[0].includes('/') && !a.val('l', 'selector')) return simk8Err(`error: resource(s) were provided, but no name was specified`); const sel = simk8Select(st, a, a.rest, nsExact); if (sel.err) return simk8Err(sel.err); if (a.val('l', 'selector') && !sel.items.length) return ok(`No resources found\n`); targets = sel.items.map(o => ({ o })).concat(sel.errs.map(e => ({ missing: e }))); } }
      let out = ''; let err = '';
      const dry = a.val('dry-run') && a.val('dry-run') !== 'none';
      for (const t of targets) {
        if (t.missing) { err += t.missing + '\n'; continue; }
        const o = t.o; const k = simk8Kind(o.kind);
        if (o.kind === 'Endpoints') { err += `Error from server (Forbidden): endpoints "${o.metadata.name}" is forbidden: ` + lt('lab, endpoints service ile yönetilir\n', 'lab, endpoints are managed by the service\n'); continue; }
        if (o.kind === 'Namespace' && ['default', 'kube-system', 'kube-public', 'kube-node-lease'].includes(o.metadata.name)) { err += `Error from server (Forbidden): namespaces "${o.metadata.name}" is forbidden: this namespace may not be deleted\n`; continue; }
        if (o._sys && o.kind !== 'Pod') { err += `Error from server (Forbidden): ${k.plural} "${o.metadata.name}" is forbidden: ` + lt('lab, sistem nesnesi silinemez\n', 'lab, a system object cannot be deleted\n'); continue; }
        out += `${k.singular}${k.group ? '.' + k.group : ''} "${o.metadata.name}" ${dry ? 'deleted (dry run)' : (a.val('grace-period') === '0' && a.has('force') ? 'force deleted' : 'deleted')}\n`;
        if (a.val('grace-period') === '0' && a.has('force')) out = `Warning: Immediate deletion does not wait for confirmation that the running resource has been terminated. The resource may continue to run on the cluster indefinitely.\n` + out;
        if (dry) continue;
        simk8DeleteObj(st, o, a.val('cascade') === 'orphan');
      }
      simk8Reconcile(sh, st);
      return { out, err, code: err ? 1 : 0 };
    }
    case 'logs': {
      const target = a.rest[0]; if (!target) return simk8Err('error: expected \'logs [-f] [-p] (POD | TYPE/NAME) [-c CONTAINER]\'.\nPOD or TYPE/NAME is a required argument for the logs command\nSee \'kubectl logs -h\' for help and examples');
      let pod = null; let pre = '';
      if (target.includes('/')) { const [t, n] = target.split('/'); const k = simk8Kind(t); if (!k) return simk8NoType(t); const o = SIMK8_find(st, k.kind, nsExact, n); if (!o) return simk8NotFound(k, n); if (k.kind === 'Pod') pod = o; else { const pods = k.kind === 'Deployment' ? simk8Owned(st, o, 'ReplicaSet').flatMap(r => simk8Owned(st, r, 'Pod')) : simk8Owned(st, o, 'Pod'); if (!pods.length) return simk8Err(`error: no pods found for ${k.singular}/${n}`); pod = pods.sort((x, y) => x.metadata._ct - y.metadata._ct)[0]; if (pods.length > 1) pre = `Found ${pods.length} pods, using pod/${pod.metadata.name}\n`; } }
      else { pod = SIMK8_find(st, 'Pod', nsExact, target); if (!pod) { const sel = a.val('l', 'selector') ? SIMK8_list(st, 'Pod', nsExact).filter(p => simk8LabelSel(a.val('l', 'selector'), p.metadata.labels)) : []; if (sel.length) pod = sel[0]; else return simk8Err(`error: error from server (NotFound): pods "${target}" not found in namespace "${nsExact}"`); } }
      if (a.val('l', 'selector') && !target.includes('/')) { /* secici ile */ }
      const conts = simk8Containers(pod);
      let c = conts[0];
      if (a.vals.c) { c = conts.find(x => x.name === a.vals.c); if (!c) return simk8Err(`error: container ${a.vals.c} is not valid for pod ${pod.metadata.name}`); }
      else if (conts.length > 1 && !a.has('all-containers')) return simk8Err(`error: a container name must be specified for pod ${pod.metadata.name}, choose one of: [${conts.map(x => x.name).join(' ')}]`);
      const v = simk8PodView(sh, st, pod); const cv = v.containers.find(x => x.name === c.name) || {};
      st.audit.logs.push(`${pod.metadata.name}${a.has('p', 'previous') ? ':previous' : ''}`);
      if (a.has('p', 'previous')) { if (!(cv.restarts > 0) && cv.reason !== 'CrashLoopBackOff') return simk8Err(`Error from server (BadRequest): previous terminated container "${c.name}" in pod "${pod.metadata.name}" not found`); const lines = simk8PodLogs(sh, st, pod, c) || []; return ok(pre + lines.join('\n') + (lines.length ? '\n' : '')); }
      if (cv.reason === 'ContainerCreating' || cv.reason === 'ErrImagePull' || cv.reason === 'ImagePullBackOff' || cv.reason === 'CreateContainerConfigError' || v.pending) return simk8Err(`Error from server (BadRequest): container "${c.name}" in pod "${pod.metadata.name}" is waiting to start: ${v.pending ? 'ContainerCreating' : (cv.reason === 'ErrImagePull' || cv.reason === 'ImagePullBackOff' ? 'trying and failing to pull image' : (cv.reason === 'CreateContainerConfigError' ? 'CreateContainerConfigError' : 'ContainerCreating'))}`);
      const lines = simk8PodLogs(sh, st, pod, c) || [];
      let logs = lines; const t = a.val('tail'); if (t !== undefined && t !== '-1') logs = logs.slice(-parseInt(t, 10));
      let out = logs.join('\n') + (logs.length ? '\n' : '');
      if (a.has('timestamps')) out = logs.map((l, i) => `${simk8Iso(st, (v.since || 0) + 1).replace('Z', `.${String(100000 + i * 1733).slice(1)}000Z`)} ${l}`).join('\n') + (logs.length ? '\n' : '');
      if (a.has('f', 'follow')) out += lt(`lab: canlı log takibi simüle edilmiyor, ${pod.metadata.name} ${v.status}, son loglar gösterildi\n`, `lab: live log following is not simulated, ${pod.metadata.name} ${v.status}, the latest logs are shown\n`);
      return ok(pre + out);
    }
    case 'exec': case 'attach': {
      const dd = a.rest.indexOf('--'); const before = dd >= 0 ? a.rest.slice(0, dd) : a.rest; let cmd = dd >= 0 ? a.rest.slice(dd + 1) : [];
      const target = before[0]; if (!target) return simk8Err('error: you must specify at least one command for the container\nSee \'kubectl exec -h\' for help and examples');
      if (!cmd.length && before.length > 1) { cmd = before.slice(1); }
      let pod;
      if (target.includes('/')) { const [t, n] = target.split('/'); const k = simk8Kind(t); if (!k) return simk8NoType(t); const o = SIMK8_find(st, k.kind, nsExact, n); if (!o) return simk8NotFound(k, n); pod = k.kind === 'Pod' ? o : (k.kind === 'Deployment' ? simk8Owned(st, o, 'ReplicaSet').flatMap(r => simk8Owned(st, r, 'Pod'))[0] : simk8Owned(st, o, 'Pod')[0]); if (!pod) return simk8Err(`error: no pods found for ${k.singular}/${n}`); }
      else { pod = SIMK8_find(st, 'Pod', nsExact, target); if (!pod) return simk8Err(`Error from server (NotFound): pods "${target}" not found`); }
      if (!cmd.length) return simk8Err('error: you must specify at least one command for the container\nSee \'kubectl exec -h\' for help and examples');
      const conts = simk8Containers(pod); let c = conts[0];
      if (a.vals.c) { c = conts.find(x => x.name === a.vals.c); if (!c) return simk8Err(`error: container ${a.vals.c} is not valid for pod ${pod.metadata.name}`); }
      else if (conts.length > 1) return { out: '', err: `Defaulted container "${c.name}" out of: ${conts.map(x => x.name).join(', ')}\n`, code: 0, _cont: true };
      const v = simk8PodView(sh, st, pod); const cv = v.containers.find(x => x.name === c.name) || {};
      if (v.pending) return simk8Err(`Error from server (BadRequest): pod ${pod.metadata.name} does not have a host assigned`);
      if (cv.state !== 'Running') return simk8Err(`error: unable to upgrade connection: container not found ("${c.name}")`);
      st.audit.exec.push(pod.metadata.name);
      if ((a.has('i') || a.has('t')) && cmd.length === 1 && /^(sh|bash|\/bin\/sh|\/bin\/bash|ash)$/.test(cmd[0])) return ok(lt(`lab: etkileşimli shell simüle edilmiyor. Tek komut çalıştır, örnek kubectl exec ${pod.metadata.name} -- env ya da kubectl exec ${pod.metadata.name} -- sh -c "ls /app && env"\n`, `lab: an interactive shell is not simulated. Run a single command, for example kubectl exec ${pod.metadata.name} -- env or kubectl exec ${pod.metadata.name} -- sh -c "ls /app && env"\n`));
      const env = Object.assign({ KUBERNETES_SERVICE_HOST: '10.96.0.1', KUBERNETES_SERVICE_PORT: '443', KUBERNETES_PORT: 'tcp://10.96.0.1:443', HOSTNAME: pod.metadata.name }, simk8ContainerEnv(st, pod, c));
      SIMK8_list(st, 'Service', pod.metadata.namespace).forEach(s => { const up = s.metadata.name.toUpperCase().replace(/-/g, '_'); if (s.spec.clusterIP && s.spec.clusterIP !== 'None') { env[`${up}_SERVICE_HOST`] = s.spec.clusterIP; env[`${up}_SERVICE_PORT`] = String((s.spec.ports || [{ port: 80 }])[0].port); } });
      const rec = typeof SIMDK_imageRecord === 'function' ? SIMDK_imageRecord(sh, c.image) : null;
      const fakeC = { id: simk8Hash(pod.metadata.name).slice(0, 64), name: pod.metadata.name, hostname: pod.metadata.name, env: Object.entries(env).map(([k, vv]) => `${k}=${vv}`), ip: pod._p.ip, network: 'k8s', status: 'running', cmd: (c.command || []).concat(c.args || []), entrypoint: c.command ? [] : undefined, mounts: [], workdir: c.workingDir, imageId: rec ? rec.id : '' };
      const fakeImg = rec || { repoTags: [c.image], os: /alpine/.test(c.image) ? 'alpine' : (/busybox/.test(c.image) ? 'busybox' : 'debian'), config: { Env: [], WorkingDir: '/', User: '' }, files: {}, context: null };
      const peers = SIMK8_list(st, 'Service', pod.metadata.namespace).map(s => ({ name: s.metadata.name, ip: s.spec.clusterIP, status: 'running', network: 'k8s', imageId: '' }));
      const fakeSt = { containers: peers.concat([fakeC]), images: rec ? [rec] : [], volumes: [] };
      if (typeof simdkExecIn !== 'function') return simk8Err(lt('lab: docker sim yok', 'lab: the docker simulator is not loaded'));
      const r = simdkExecIn(sh, fakeSt, fakeC, fakeImg, cmd, {});
      r.err = (r.err || '').replace(/host shell'inde.*çalıştı/, "host shell'inde çalıştı, pod filesystem'i simüle ediliyor").replace(/the container filesystem is simulated, (.*) ran in the host shell.*/, 'the pod filesystem is simulated, $1 ran in the host shell');
      if (r.code === 126 && r.notFound) return { out: '', err: `OCI runtime exec failed: exec failed: unable to start container process: exec: "${cmd[0]}": executable file not found in $PATH: unknown\ncommand terminated with exit code 126\n`, code: 126 };
      if (r.code) r.err += `command terminated with exit code ${r.code}\n`;
      return r;
    }
    default: return simk8Dispatch2(sh, st, verb, a, args, stdin, ns, nsExact);
  }
}
function simk8DeleteObj(st, o, orphan) {
  const kill = x => { const i = st.objects.indexOf(x); if (i >= 0) st.objects.splice(i, 1); };
  if (o.kind === 'Namespace') { st.objects.filter(x => x.metadata.namespace === o.metadata.name).forEach(kill); st.events = st.events.filter(e => e.ns !== o.metadata.name); kill(o); return; }
  if (!orphan) { st.objects.filter(x => (x.metadata.ownerReferences || []).some(r => r.uid === o.metadata.uid)).forEach(ch => simk8DeleteObj(st, ch, false)); }
  else { st.objects.filter(x => (x.metadata.ownerReferences || []).some(r => r.uid === o.metadata.uid)).forEach(ch => { ch.metadata.ownerReferences = []; }); }
  if (o.kind === 'Deployment') delete st.revisions[`${o.metadata.namespace}/${o.metadata.name}`];
  st.events = st.events.filter(e => e.uid !== o.metadata.uid);
  kill(o);
}

function simk8ResolveOne(st, a, rest, nsExact, allowedKinds) {
  /* 'deployment web' ya da 'deployment/web' */
  let t, n;
  if (rest[0] && rest[0].includes('/')) { [t, n] = rest[0].split('/'); } else { t = rest[0]; n = rest[1]; }
  const k = simk8Kind(t); if (!k) return { err: `error: the server doesn't have a resource type "${t || ''}"` };
  if (!n) return { err: `error: resource(s) were provided, but no name was specified` };
  if (allowedKinds && !allowedKinds.includes(k.kind)) return { err: `error: no kind "${k.kind}" is registered for version "${simk8ApiVersion(k)}" in scheme\n💡 ` + lt(`Bu komut ${allowedKinds.join(', ')} için çalışır`, `This command works for ${allowedKinds.join(', ')}`) };
  const o = SIMK8_find(st, k.kind, nsExact, n);
  if (!o) return { err: `Error from server (NotFound): ${k.plural}${k.group ? '.' + k.group : ''} "${n}" not found` };
  return { o, k };
}
function simk8Config(sh, st, a, rawArgs) {
  const sub = a.rest[0];
  const ctxLine = () => Object.entries(st.contexts).map(([name, c]) => [st.context === name ? '*' : '', name, c.cluster, c.user, c.namespace || '']);
  if (sub === 'get-contexts') return ok(simk8Table([['CURRENT', 'NAME', 'CLUSTER', 'AUTHINFO', 'NAMESPACE']].concat(ctxLine())));
  if (sub === 'current-context') return ok(st.context + '\n');
  if (sub === 'use-context') { const n = a.rest[1]; if (!n) return simk8Err('error: you must specify a context name'); if (!st.contexts[n]) return simk8Err(`error: no context exists with the name: "${n}"`); st.context = n; return ok(`Switched to context "${n}".\n`); }
  if (sub === 'set-context') { let n = a.rest[1]; if (a.has('current')) n = st.context; if (!n) return simk8Err('error: you must specify a non-empty context name or --current'); st.contexts[n] = st.contexts[n] || { cluster: n, user: n, namespace: 'default' }; const nsv = a.val('namespace', 'n'); if (nsv !== undefined) { if (!SIMK8_find(st, 'Namespace', null, nsv) && st.context === 'kind-netops') { st.contexts[n].namespace = nsv; return ok(`Context "${n}" modified.\n💡 ` + lt(`${nsv} namespace'i cluster'da yok, kubectl komutları "No resources found in ${nsv} namespace" diyecek\n`, `the ${nsv} namespace does not exist in the cluster, kubectl commands will say "No resources found in ${nsv} namespace"\n`)); } st.contexts[n].namespace = nsv; } if (a.val('cluster')) st.contexts[n].cluster = a.val('cluster'); if (a.val('user')) st.contexts[n].user = a.val('user'); return ok(`Context "${n}" modified.\n`); }
  if (sub === 'view') { if (a.has('minify') || a.val('o', 'output') === 'jsonpath={..namespace}') { if (a.val('o', 'output')) return ok((st.contexts[st.context].namespace || 'default') + '\n'); } return ok(`apiVersion: v1\nclusters:\n${Object.entries(st.contexts).map(([n, c]) => `- cluster:\n    certificate-authority-data: DATA+OMITTED\n    server: ${n === 'kind-netops' ? 'https://127.0.0.1:41347' : (n === 'minikube' ? 'https://192.168.49.2:8443' : 'https://A1B2C3D4E5.gr7.eu-west-1.eks.amazonaws.com')}\n  name: ${c.cluster}\n`).join('')}contexts:\n${Object.entries(st.contexts).map(([n, c]) => `- context:\n    cluster: ${c.cluster}\n    namespace: ${c.namespace || 'default'}\n    user: ${c.user}\n  name: ${n}\n`).join('')}current-context: ${st.context}\nkind: Config\npreferences: {}\nusers:\n${Object.values(st.contexts).map(c => `- name: ${c.user}\n  user:\n    client-certificate-data: DATA+OMITTED\n    client-key-data: DATA+OMITTED\n`).join('')}`); }
  if (sub === 'get-clusters') return ok('NAME\n' + Object.values(st.contexts).map(c => c.cluster).join('\n') + '\n');
  if (sub === 'delete-context') { const n = a.rest[1]; if (!st.contexts[n]) return simk8Err(`error: cannot delete context ${n}, not in /home/burak/.kube/config`); if (n === st.context) return simk8Err(lt(`error: lab, aktif context silinemez`, 'error: lab, the active context cannot be deleted')); delete st.contexts[n]; return ok(`deleted context ${n} from /home/burak/.kube/config\n`); }
  if (sub === 'rename-context') { const [, o, n] = a.rest; if (!st.contexts[o]) return simk8Err(`error: cannot rename the context "${o}", it's not in /home/burak/.kube/config`); st.contexts[n] = st.contexts[o]; delete st.contexts[o]; if (st.context === o) st.context = n; return ok(`Context "${o}" renamed to "${n}".\n`); }
  return simk8Err(`error: unknown command "${sub || ''}" for "kubectl config"\n\nAvailable Commands:\n  current-context  Display the current-context\n  delete-context   Delete the specified context from the kubeconfig\n  get-clusters     Display clusters defined in the kubeconfig\n  get-contexts     Describe one or many contexts\n  rename-context   Rename a context from the kubeconfig file\n  set-context      Set a context entry in kubeconfig\n  use-context      Set the current-context in a kubeconfig file\n  view             Display merged kubeconfig settings or a specified kubeconfig file`);
}
function simk8CreateImperative(sh, st, a, rawArgs, ns) {
  const sub = a.rest[0]; const name = a.rest[1];
  const nsExact = a.val('n', 'namespace') || simk8CurrentNs(st);
  const dm = a.val('dry-run') && a.val('dry-run') !== 'none' ? a.val('dry-run') : null;
  const finish = (doc) => { const r = simk8ApplyOne(sh, st, doc, 'STDIN', a.val('n', 'namespace'), dm, 'create'); if (r.err) return simk8Err(r.err); const fmt = a.val('o', 'output'); if (fmt) { const txt = simk8OutputObjs(sh, st, [dm ? Object.assign({ metadata: Object.assign({ _ct: st.tick, uid: undefined }, doc.metadata) }, doc, { metadata: Object.assign({ _ct: st.tick }, doc.metadata, { creationTimestamp: null }) }) : r.obj], fmt, false); if (txt !== null) return ok(dm ? txt.replace(/\n  _ct: \d+/g, '').replace(/\n  resourceVersion: ""/g, '') : txt); } simk8Reconcile(sh, st); return ok(r.out + '\n'); };
  const lit = a.all('from-literal'); const ff = a.all('from-file'); const fe = a.all('from-env-file');
  const data = {};
  for (const l of lit) { const i = l.indexOf('='); if (i < 0) return simk8Err(`error: invalid literal source ${l}, expected key=value`); data[l.slice(0, i)] = l.slice(i + 1); }
  for (const f of ff) { let key, path; const i = f.indexOf('='); if (i > 0) { key = f.slice(0, i); path = f.slice(i + 1); } else { path = f; key = f.split('/').pop(); } const r = sh.readFile(path, 'kubectl'); if (r.err) return simk8Err(`error: error reading ${sh.resolve(path)}: no such file or directory`); data[key] = r.data; }
  for (const f of fe) { const r = sh.readFile(f, 'kubectl'); if (r.err) return simk8Err(`error: error reading ${sh.resolve(f)}: no such file or directory`); r.data.split('\n').forEach(l => { const m = /^\s*([\w.-]+)=(.*)$/.exec(l); if (m) data[m[1]] = m[2]; }); }
  if (sub === 'namespace' || sub === 'ns') { if (!name) return simk8Err('error: exactly one NAME is required, got 0'); return finish({ apiVersion: 'v1', kind: 'Namespace', metadata: { name } }); }
  if (sub === 'configmap' || sub === 'cm') { if (!name) return simk8Err('error: exactly one NAME is required, got 0'); return finish({ apiVersion: 'v1', kind: 'ConfigMap', metadata: { name, namespace: nsExact }, data }); }
  if (sub === 'secret') { const t = a.rest[1]; const n2 = a.rest[2]; if (t !== 'generic' && t !== 'tls' && t !== 'docker-registry') return simk8Err(`error: unknown command "${t || ''}" for "kubectl create secret"\n\nAvailable Commands:\n  docker-registry  Create a secret for use with a Docker registry\n  generic          Create a secret from a local file, directory, or literal value\n  tls              Create a TLS secret`); if (!n2) return simk8Err('error: exactly one NAME is required, got 0'); if (t === 'docker-registry') return finish({ apiVersion: 'v1', kind: 'Secret', metadata: { name: n2, namespace: nsExact }, type: 'kubernetes.io/dockerconfigjson', stringData: { '.dockerconfigjson': JSON.stringify({ auths: { [a.val('docker-server') || 'https://index.docker.io/v1/']: { username: a.val('docker-username') || '', password: a.val('docker-password') || '', auth: simk8B64e(`${a.val('docker-username') || ''}:${a.val('docker-password') || ''}`) } } }) } }); if (t === 'tls') return finish({ apiVersion: 'v1', kind: 'Secret', metadata: { name: n2, namespace: nsExact }, type: 'kubernetes.io/tls', stringData: { 'tls.crt': '-----BEGIN CERTIFICATE-----\nlab\n-----END CERTIFICATE-----\n', 'tls.key': '-----BEGIN PRIVATE KEY-----\nlab\n-----END PRIVATE KEY-----\n' } }); return finish({ apiVersion: 'v1', kind: 'Secret', metadata: { name: n2, namespace: nsExact }, type: a.val('type') || 'Opaque', stringData: data }); }
  if (sub === 'deployment' || sub === 'deploy') { if (!name) return simk8Err('error: NAME is required for create deployment'); const img = a.val('image'); if (!img) return simk8Err('error: required flag(s) "image" not set'); const cname = img.split('/').pop().split(':')[0].replace(/[^a-z0-9-]/g, '-'); const c = { name: cname, image: img, resources: {} }; if (a.val('port')) c.ports = [{ containerPort: parseInt(a.val('port'), 10) }]; const dd = a.rest.indexOf('--'); if (dd >= 0) c.command = a.rest.slice(dd + 1); return finish({ apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name, namespace: nsExact, labels: { app: name } }, spec: { replicas: parseInt(a.val('replicas') || '1', 10), selector: { matchLabels: { app: name } }, template: { metadata: { labels: { app: name } }, spec: { containers: [c] } } } }); }
  if (sub === 'service' || sub === 'svc') { const t = a.rest[1]; const n2 = a.rest[2]; const types = { clusterip: 'ClusterIP', nodeport: 'NodePort', loadbalancer: 'LoadBalancer', externalname: 'ExternalName' }; if (!types[t]) return simk8Err(`error: unknown command "${t || ''}" for "kubectl create service"`); if (!n2) return simk8Err('error: NAME is required for create service'); const ports = a.all('tcp').map(p => { const [port, tp] = p.split(':'); return { name: `${port}-${tp || port}`, port: parseInt(port, 10), targetPort: parseInt(tp || port, 10), protocol: 'TCP' }; }); return finish({ apiVersion: 'v1', kind: 'Service', metadata: { name: n2, namespace: nsExact, labels: { app: n2 } }, spec: Object.assign({ type: types[t], selector: { app: n2 }, ports: ports.length ? ports : [{ port: 80, targetPort: 80, protocol: 'TCP', name: '80-80' }] }, t === 'externalname' ? { externalName: a.val('external-name'), ports: [] } : {}) }); }
  if (sub === 'serviceaccount' || sub === 'sa') { if (!name) return simk8Err('error: exactly one NAME is required, got 0'); return finish({ apiVersion: 'v1', kind: 'ServiceAccount', metadata: { name, namespace: nsExact } }); }
  if (sub === 'job') { if (!name) return simk8Err('error: NAME is required for create job'); const from = a.val('from'); if (from) { const [t, cn] = from.split('/'); if (simk8Kind(t) && simk8Kind(t).kind === 'CronJob') { const cj = SIMK8_find(st, 'CronJob', nsExact, cn); if (!cj) return simk8Err(`Error from server (NotFound): cronjobs.batch "${cn}" not found`); const r = finish({ apiVersion: 'batch/v1', kind: 'Job', metadata: { name, namespace: nsExact, annotations: { 'cronjob.kubernetes.io/instantiate': 'manual' } }, spec: simk8Clone(cj.spec.jobTemplate.spec) }); const j = SIMK8_find(st, 'Job', nsExact, name); if (j) { j.metadata.ownerReferences = [{ apiVersion: 'batch/v1', kind: 'CronJob', name: cj.metadata.name, uid: cj.metadata.uid, controller: true, blockOwnerDeletion: true }]; cj._lastSchedule = st.tick; simk8Event(st, cj, 'Normal', 'SuccessfulCreate', `Created job ${name}`, 'cronjob-controller'); } return r; } return simk8Err(`error: unknown object type "${t}"`); } const img = a.val('image'); if (!img) return simk8Err('error: --image or --from must be specified'); const dd = a.rest.indexOf('--'); return finish({ apiVersion: 'batch/v1', kind: 'Job', metadata: { name, namespace: nsExact }, spec: { template: { metadata: { name }, spec: { containers: [{ name, image: img, command: dd >= 0 ? a.rest.slice(dd + 1) : undefined, resources: {} }], restartPolicy: 'Never' } } } }); }
  if (sub === 'cronjob' || sub === 'cj') { if (!name) return simk8Err('error: NAME is required for create cronjob'); const img = a.val('image'); const sch = a.val('schedule'); if (!img) return simk8Err('error: required flag(s) "image" not set'); if (!sch) return simk8Err('error: required flag(s) "schedule" not set'); const dd = a.rest.indexOf('--'); return finish({ apiVersion: 'batch/v1', kind: 'CronJob', metadata: { name, namespace: nsExact }, spec: { schedule: sch, jobTemplate: { metadata: { name }, spec: { template: { spec: { containers: [{ name, image: img, command: dd >= 0 ? a.rest.slice(dd + 1) : undefined, resources: {} }], restartPolicy: a.val('restart') || 'OnFailure' } } } } } }); }
  if (sub === 'ingress' || sub === 'ing') { if (!name) return simk8Err('error: NAME is required for create ingress'); const rules = a.all('rule').map(r => { const [hostPath, svcPort] = r.split('='); const [host, path] = hostPath.split('/'); const [svc, port] = svcPort.split(':'); return { host, http: { paths: [{ path: '/' + (path || ''), pathType: 'Prefix', backend: { service: { name: svc, port: { number: parseInt(port, 10) } } } }] } }; }); return finish({ apiVersion: 'networking.k8s.io/v1', kind: 'Ingress', metadata: { name, namespace: nsExact }, spec: Object.assign({ rules }, a.val('class') ? { ingressClassName: a.val('class') } : {}) }); }
  if (sub === 'quota' || sub === 'role' || sub === 'rolebinding' || sub === 'clusterrole' || sub === 'clusterrolebinding' || sub === 'priorityclass' || sub === 'poddisruptionbudget' || sub === 'token') return simk8Err(lt(`error: lab, kubectl create ${sub} bu lab'da yok, yaml ile apply et`, `error: lab, kubectl create ${sub} is not available in this lab, apply it with yaml`));
  return simk8Err(`error: unknown command "${sub || ''}" for "kubectl create"\n\nAvailable Commands:\n  configmap        Create a config map from a local file, directory or literal value\n  cronjob          Create a cron job with the specified name\n  deployment       Create a deployment with the specified name\n  ingress          Create an ingress with the specified name\n  job              Create a job with the specified name\n  namespace        Create a namespace with the specified name\n  secret           Create a secret using a specified subcommand\n  service          Create a service using a specified subcommand\n  serviceaccount   Create a service account with the specified name\n\nError: must specify one of -f and -k`);
}
function simk8ExplainText(path) {
  const E = {
    pod: ['KIND:       Pod\nVERSION:    v1\n\nDESCRIPTION:\n    Pod is a collection of containers that can run on a host. This resource is\n    created by clients and scheduled onto hosts.', [['apiVersion', '<string>'], ['kind', '<string>'], ['metadata', '<ObjectMeta>'], ['spec', '<PodSpec>'], ['status', '<PodStatus>']]],
    'pod.spec': ['KIND:       Pod\nVERSION:    v1\n\nFIELD: spec <PodSpec>\n\nDESCRIPTION:\n    Specification of the desired behavior of the pod.', [['containers', '<[]Container> -required-'], ['dnsPolicy', '<string>'], ['initContainers', '<[]Container>'], ['nodeName', '<string>'], ['nodeSelector', '<map[string]string>'], ['restartPolicy', '<string>'], ['serviceAccountName', '<string>'], ['tolerations', '<[]Toleration>'], ['volumes', '<[]Volume>']]],
    'pod.spec.containers': ['KIND:       Pod\nVERSION:    v1\n\nFIELD: containers <[]Container>\n\nDESCRIPTION:\n    List of containers belonging to the pod. Containers cannot currently be\n    added or removed. There must be at least one container in a Pod. Cannot be\n    updated.', [['args', '<[]string>'], ['command', '<[]string>'], ['env', '<[]EnvVar>'], ['envFrom', '<[]EnvFromSource>'], ['image', '<string>'], ['imagePullPolicy', '<string>'], ['livenessProbe', '<Probe>'], ['name', '<string> -required-'], ['ports', '<[]ContainerPort>'], ['readinessProbe', '<Probe>'], ['resources', '<ResourceRequirements>'], ['volumeMounts', '<[]VolumeMount>']]],
    'pod.spec.containers.resources': ['KIND:       Pod\nVERSION:    v1\n\nFIELD: resources <ResourceRequirements>\n\nDESCRIPTION:\n    Compute Resources required by this container. Cannot be updated.', [['claims', '<[]ResourceClaim>'], ['limits', '<map[string]Quantity>'], ['requests', '<map[string]Quantity>']]],
    'pod.spec.containers.livenessProbe': ['KIND:       Pod\nVERSION:    v1\n\nFIELD: livenessProbe <Probe>\n\nDESCRIPTION:\n    Periodic probe of container liveness. Container will be restarted if the\n    probe fails. Cannot be updated.', [['exec', '<ExecAction>'], ['failureThreshold', '<integer>'], ['httpGet', '<HTTPGetAction>'], ['initialDelaySeconds', '<integer>'], ['periodSeconds', '<integer>'], ['successThreshold', '<integer>'], ['tcpSocket', '<TCPSocketAction>'], ['timeoutSeconds', '<integer>']]],
    deployment: ['GROUP:      apps\nKIND:       Deployment\nVERSION:    v1\n\nDESCRIPTION:\n    Deployment enables declarative updates for Pods and ReplicaSets.', [['apiVersion', '<string>'], ['kind', '<string>'], ['metadata', '<ObjectMeta>'], ['spec', '<DeploymentSpec>'], ['status', '<DeploymentStatus>']]],
    'deployment.spec': ['GROUP:      apps\nKIND:       Deployment\nVERSION:    v1\n\nFIELD: spec <DeploymentSpec>\n\nDESCRIPTION:\n    Specification of the desired behavior of the Deployment.', [['minReadySeconds', '<integer>'], ['paused', '<boolean>'], ['progressDeadlineSeconds', '<integer>'], ['replicas', '<integer>'], ['revisionHistoryLimit', '<integer>'], ['selector', '<LabelSelector> -required-'], ['strategy', '<DeploymentStrategy>'], ['template', '<PodTemplateSpec> -required-']]],
    'deployment.spec.strategy': ['GROUP:      apps\nKIND:       Deployment\nVERSION:    v1\n\nFIELD: strategy <DeploymentStrategy>\n\nDESCRIPTION:\n    The deployment strategy to use to replace existing pods with new ones.', [['rollingUpdate', '<RollingUpdateDeployment>'], ['type', '<string>\n    Type of deployment. Can be "Recreate" or "RollingUpdate". Default is\n    RollingUpdate.\n    \n    Possible enum values:\n     - `"Recreate"` Kill all existing pods before creating new ones.\n     - `"RollingUpdate"` Replace the old ReplicaSets by new one using rolling\n    update i.e gradually scale down the old ReplicaSets and scale up the new\n    one.']]],
    'deployment.spec.strategy.rollingUpdate': ['GROUP:      apps\nKIND:       Deployment\nVERSION:    v1\n\nFIELD: rollingUpdate <RollingUpdateDeployment>\n\nDESCRIPTION:\n    Rolling update config params. Present only if DeploymentStrategyType =\n    RollingUpdate.', [['maxSurge', '<IntOrString>\n    The maximum number of pods that can be scheduled above the desired number of\n    pods. Value can be an absolute number (ex: 5) or a percentage of desired\n    pods (ex: 10%). This can not be 0 if MaxUnavailable is 0. Defaults to 25%.'], ['maxUnavailable', '<IntOrString>\n    The maximum number of pods that can be unavailable during the update. Value\n    can be an absolute number (ex: 5) or a percentage of desired pods (ex: 10%).\n    This can not be 0 if MaxSurge is 0. Defaults to 25%.']]],
    'deployment.spec.template': ['GROUP:      apps\nKIND:       Deployment\nVERSION:    v1\n\nFIELD: template <PodTemplateSpec>\n\nDESCRIPTION:\n    Template describes the pods that will be created. The only allowed\n    template.spec.restartPolicy value is "Always".', [['metadata', '<ObjectMeta>'], ['spec', '<PodSpec>']]],
    service: ['KIND:       Service\nVERSION:    v1\n\nDESCRIPTION:\n    Service is a named abstraction of software service (for example, mysql)\n    consisting of local port (for example 3306) that the proxy listens on, and\n    the selector that determines which pods will answer requests sent through\n    the proxy.', [['apiVersion', '<string>'], ['kind', '<string>'], ['metadata', '<ObjectMeta>'], ['spec', '<ServiceSpec>'], ['status', '<ServiceStatus>']]],
    'service.spec': ['KIND:       Service\nVERSION:    v1\n\nFIELD: spec <ServiceSpec>\n\nDESCRIPTION:\n    Spec defines the behavior of a service.', [['clusterIP', '<string>'], ['externalName', '<string>'], ['ports', '<[]ServicePort>'], ['selector', '<map[string]string>\n    Route service traffic to pods with label keys and values matching this\n    selector.'], ['sessionAffinity', '<string>'], ['type', '<string>\n    type determines how the Service is exposed. Defaults to ClusterIP.\n    \n    Possible enum values:\n     - `"ClusterIP"` means a service will only be accessible inside the cluster,\n    via the cluster IP.\n     - `"ExternalName"` means a service consists of only a reference to an\n    external name that kubedns or equivalent will return as a CNAME record.\n     - `"LoadBalancer"` means a service will be exposed via an external load\n    balancer (if the cloud provider supports it).\n     - `"NodePort"` means a service will be exposed on one port of every node.']]],
    configmap: ['KIND:       ConfigMap\nVERSION:    v1\n\nDESCRIPTION:\n    ConfigMap holds configuration data for pods to consume.', [['apiVersion', '<string>'], ['binaryData', '<map[string]string>'], ['data', '<map[string]string>'], ['immutable', '<boolean>'], ['kind', '<string>'], ['metadata', '<ObjectMeta>']]],
    secret: ['KIND:       Secret\nVERSION:    v1\n\nDESCRIPTION:\n    Secret holds secret data of a certain type. The total bytes of the values in\n    the Data field must be less than MaxSecretSize bytes.', [['apiVersion', '<string>'], ['data', '<map[string]string>'], ['immutable', '<boolean>'], ['kind', '<string>'], ['metadata', '<ObjectMeta>'], ['stringData', '<map[string]string>'], ['type', '<string>']]],
    ingress: ['GROUP:      networking.k8s.io\nKIND:       Ingress\nVERSION:    v1\n\nDESCRIPTION:\n    Ingress is a collection of rules that allow inbound connections to reach the\n    endpoints defined by a backend.', [['apiVersion', '<string>'], ['kind', '<string>'], ['metadata', '<ObjectMeta>'], ['spec', '<IngressSpec>'], ['status', '<IngressStatus>']]],
    horizontalpodautoscaler: ['GROUP:      autoscaling\nKIND:       HorizontalPodAutoscaler\nVERSION:    v2\n\nDESCRIPTION:\n    HorizontalPodAutoscaler is the configuration for a horizontal pod\n    autoscaler, which automatically manages the replica count of any resource\n    implementing the scale subresource based on the metrics specified.', [['apiVersion', '<string>'], ['kind', '<string>'], ['metadata', '<ObjectMeta>'], ['spec', '<HorizontalPodAutoscalerSpec>'], ['status', '<HorizontalPodAutoscalerStatus>']]],
    cronjob: ['GROUP:      batch\nKIND:       CronJob\nVERSION:    v1\n\nDESCRIPTION:\n    CronJob represents the configuration of a single cron job.', [['apiVersion', '<string>'], ['kind', '<string>'], ['metadata', '<ObjectMeta>'], ['spec', '<CronJobSpec>'], ['status', '<CronJobStatus>']]],
    'cronjob.spec': ['GROUP:      batch\nKIND:       CronJob\nVERSION:    v1\n\nFIELD: spec <CronJobSpec>\n\nDESCRIPTION:\n    Specification of the desired behavior of a cron job, including the\n    schedule.', [['concurrencyPolicy', '<string>'], ['failedJobsHistoryLimit', '<integer>'], ['jobTemplate', '<JobTemplateSpec> -required-'], ['schedule', '<string> -required-\n    The schedule in Cron format, see https://en.wikipedia.org/wiki/Cron.'], ['startingDeadlineSeconds', '<integer>'], ['successfulJobsHistoryLimit', '<integer>'], ['suspend', '<boolean>'], ['timeZone', '<string>']]],
    job: ['GROUP:      batch\nKIND:       Job\nVERSION:    v1\n\nDESCRIPTION:\n    Job represents the configuration of a single job.', [['apiVersion', '<string>'], ['kind', '<string>'], ['metadata', '<ObjectMeta>'], ['spec', '<JobSpec>'], ['status', '<JobStatus>']]],
    namespace: ['KIND:       Namespace\nVERSION:    v1\n\nDESCRIPTION:\n    Namespace provides a scope for Names. Use of multiple namespaces is\n    optional.', [['apiVersion', '<string>'], ['kind', '<string>'], ['metadata', '<ObjectMeta>'], ['spec', '<NamespaceSpec>'], ['status', '<NamespaceStatus>']]],
  };
  const parts = path.toLowerCase().split('.'); const k = simk8Kind(parts[0]); if (!k) return null;
  const key = [k.singular].concat(parts.slice(1)).join('.');
  const e = E[key] || E[Object.keys(E).find(x => x.toLowerCase() === key.toLowerCase())];
  if (!e) { if (parts.length === 1) return `GROUP:      ${k.group}\nKIND:       ${k.kind}\nVERSION:    ${k.version}\n\nDESCRIPTION:\n    ${k.kind} resource.\n\nFIELDS:\n  apiVersion\t<string>\n  kind\t<string>\n  metadata\t<ObjectMeta>\n  spec\t<${k.kind}Spec>\n  status\t<${k.kind}Status>\n`; return `error: field "${parts.slice(1).join('.')}" does not exist\n💡 ` + lt('lab explain sadece temel alanlari biliyor', 'the lab explain only knows the basic fields'); }
  return e[0] + '\n\nFIELDS:\n' + e[1].map(([n, t]) => `  ${n}\t${t}\n`).join('\n') + '\n';
}

function simk8Dispatch2(sh, st, verb, a, args, stdin, ns, nsExact) {
  switch (verb) {
    case 'scale': {
      const rep = a.val('replicas'); if (rep === undefined) return simk8Err('error: required flag(s) "replicas" not set');
      if (!/^\d+$/.test(rep)) return simk8Err(`error: invalid argument "${rep}" for "--replicas" flag: strconv.ParseInt: parsing "${rep}": invalid syntax`);
      let out = ''; const specs = a.rest[0] && a.rest[0].includes('/') ? a.rest.map(r => [r]) : a.rest.slice(1).map(n => [a.rest[0], n]);
      if (!specs.length) return simk8Err('error: resource(s) were provided, but no name was specified');
      for (const sp of specs) { const r = simk8ResolveOne(st, a, sp, nsExact, ['Deployment', 'ReplicaSet', 'StatefulSet']); if (r.err) return simk8Err(r.err); if (r.o._sys) return simk8Err('Error from server (Forbidden): ' + lt('lab, sistem nesnesi', 'lab, system object')); if (r.o.kind === 'Deployment' && r.o.spec.replicas !== parseInt(rep, 10)) r.o.metadata.generation = (r.o.metadata.generation || 1) + 1; r.o.spec.replicas = parseInt(rep, 10); out += `${simk8ResName(st, r.o)} scaled\n`; }
      return ok(out);
    }
    case 'autoscale': {
      const r = simk8ResolveOne(st, a, a.rest, nsExact, ['Deployment', 'ReplicaSet', 'StatefulSet']); if (r.err) return simk8Err(r.err);
      const max = a.val('max'); if (max === undefined) return simk8Err('error: required flag(s) "max" not set');
      const name = a.val('name') || r.o.metadata.name;
      if (SIMK8_find(st, 'HorizontalPodAutoscaler', nsExact, name)) return simk8Err(`Error from server (AlreadyExists): horizontalpodautoscalers.autoscaling "${name}" already exists`);
      const h = simk8Obj(st, 'HorizontalPodAutoscaler', nsExact, name, { scaleTargetRef: { apiVersion: r.o.apiVersion, kind: r.o.kind, name: r.o.metadata.name }, minReplicas: parseInt(a.val('min') || '1', 10), maxReplicas: parseInt(max, 10), metrics: [{ type: 'Resource', resource: { name: 'cpu', target: { type: 'Utilization', averageUtilization: parseInt(a.val('cpu-percent') || '80', 10) } } }] }, {});
      return ok(`horizontalpodautoscaler.autoscaling/${h.metadata.name} autoscaled\n`);
    }
    case 'expose': {
      const r = simk8ResolveOne(st, a, a.rest, nsExact, ['Deployment', 'Pod', 'ReplicaSet', 'Service']); if (r.err) return simk8Err(r.err);
      const name = a.val('name') || r.o.metadata.name;
      if (SIMK8_find(st, 'Service', nsExact, name)) return simk8Err(`Error from server (AlreadyExists): services "${name}" already exists`);
      const port = a.val('port'); const tpl = r.o.kind === 'Deployment' || r.o.kind === 'ReplicaSet' ? r.o.spec.template : r.o;
      const cports = simk8Containers({ spec: tpl.spec }).flatMap(c => c.ports || []);
      if (!port && !cports.length) return simk8Err(`error: couldn't find port via --port flag or introspection\nSee 'kubectl expose -h' for help and examples`);
      const selector = r.o.kind === 'Deployment' || r.o.kind === 'ReplicaSet' ? r.o.spec.selector.matchLabels : (r.o.kind === 'Service' ? r.o.spec.selector : r.o.metadata.labels);
      const ports = port ? [{ port: parseInt(port, 10), targetPort: a.val('target-port') ? (/^\d+$/.test(a.val('target-port')) ? parseInt(a.val('target-port'), 10) : a.val('target-port')) : parseInt(port, 10), protocol: (a.val('protocol') || 'TCP').toUpperCase() }] : cports.map(p => ({ name: cports.length > 1 ? `port-${p.containerPort}` : undefined, port: p.containerPort, targetPort: p.containerPort, protocol: p.protocol || 'TCP' }));
      const doc = { apiVersion: 'v1', kind: 'Service', metadata: { name, namespace: nsExact, labels: simk8Clone(r.o.metadata.labels || {}) }, spec: { type: a.val('type') || 'ClusterIP', selector: simk8Clone(selector || {}), ports } };
      const dm = a.val('dry-run') && a.val('dry-run') !== 'none' ? a.val('dry-run') : null;
      if (a.val('o', 'output') && dm) { const txt = simk8OutputObjs(sh, st, [Object.assign({ metadata: Object.assign({ _ct: st.tick }, doc.metadata) }, doc)], a.val('o', 'output'), false); if (txt !== null) return ok(txt); }
      const res = simk8ApplyOne(sh, st, doc, 'STDIN', nsExact, dm, 'create'); if (res.err) return simk8Err(res.err);
      return ok(`service/${name} exposed${dm ? (dm === 'client' ? ' (dry run)' : ' (server dry run)') : ''}\n`);
    }
    case 'run': {
      const name = a.rest[0]; if (!name) return simk8Err('error: NAME is required for run\nSee \'kubectl run -h\' for help and examples');
      const img = a.val('image'); if (!img) return simk8Err('error: --image is required');
      const dd = a.rest.indexOf('--'); const cmd = dd >= 0 ? a.rest.slice(dd + 1) : [];
      const c = { name, image: img, resources: {} };
      if (cmd.length) { if (a.has('command')) c.command = cmd; else c.args = cmd; }
      if (a.val('port')) c.ports = [{ containerPort: parseInt(a.val('port'), 10) }];
      a.all('env').forEach(e => { const i = e.indexOf('='); c.env = (c.env || []).concat([{ name: e.slice(0, i), value: e.slice(i + 1) }]); });
      const labels = { run: name }; (a.val('labels') || '').split(',').filter(Boolean).forEach(l => { const [k, v] = l.split('='); labels[k] = v; });
      const doc = { apiVersion: 'v1', kind: 'Pod', metadata: { name, namespace: nsExact, labels }, spec: { containers: [c], restartPolicy: a.val('restart') || 'Always', dnsPolicy: 'ClusterFirst' } };
      const dm = a.val('dry-run') && a.val('dry-run') !== 'none' ? a.val('dry-run') : null;
      if (a.val('o', 'output') && dm) { const txt = simk8OutputObjs(sh, st, [Object.assign({ metadata: Object.assign({ _ct: st.tick }, doc.metadata) }, doc)], a.val('o', 'output'), false); if (txt !== null) return ok(txt); }
      const res = simk8ApplyOne(sh, st, doc, 'STDIN', nsExact, dm, 'create'); if (res.err) return simk8Err(res.err);
      if (dm) return ok(`pod/${name} created${dm === 'client' ? ' (dry run)' : ' (server dry run)'}\n`);
      if (a.has('rm') && a.has('i', 't') && cmd.length) { /* tek seferlik komut */ simk8Reconcile(sh, st); const p = res.obj; p._p.node = 'netops-worker'; p._p.startTick = st.tick - 1; p._p.ip = `10.244.1.${st.ipNext++}`; const peers = SIMK8_list(st, 'Service', nsExact).map(s => ({ name: s.metadata.name, ip: s.spec.clusterIP, status: 'running', network: 'k8s', imageId: '' })); const fakeSt = { containers: peers, images: [], volumes: [] }; const fakeC = { id: simk8Hash(name).slice(0, 64), name, hostname: name, env: Object.entries(simk8ContainerEnv(st, p, c)).map(([k, v]) => `${k}=${v}`), ip: p._p.ip, network: 'k8s', status: 'running', cmd, mounts: [], imageId: '' }; const fakeImg = { repoTags: [img], os: /alpine/.test(img) ? 'alpine' : (/busybox/.test(img) ? 'busybox' : 'debian'), config: { Env: [], WorkingDir: '/', User: '' }, files: {}, context: null }; const r = typeof simdkExecIn === 'function' ? simdkExecIn(sh, fakeSt, fakeC, fakeImg, cmd, {}) : { out: '', err: '', code: 0 }; simk8DeleteObj(st, p); r.out += `pod "${name}" deleted\n`; if (!simk8ImageKnown(sh, img)) return simk8Err(`Error from server (BadRequest): container "${name}" in pod "${name}" is waiting to start: trying and failing to pull image\npod "${name}" deleted\npod ${nsExact}/${name} terminated (ImagePullBackOff)`); return r; }
      return ok(`pod/${name} created\n`);
    }
    case 'rollout': {
      const sub = a.rest[0]; const r = simk8ResolveOne(st, a, a.rest.slice(1), nsExact, ['Deployment', 'DaemonSet', 'StatefulSet']);
      if (!sub) return simk8Err(lt('error: lab, rollout alt komutu ver, status history undo restart pause resume', 'error: lab, give a rollout subcommand, status history undo restart pause resume'));
      if (r.err) return simk8Err(r.err);
      const d = r.o; const key = `${d.metadata.namespace}/${d.metadata.name}`;
      if (d.kind !== 'Deployment') return simk8Err(lt(`error: lab, rollout bu lab'da yalnız Deployment için çalışır`, 'error: lab, rollout only works for Deployment in this lab'));
      if (sub === 'status') {
        const lines = []; const rep = d.spec.replicas == null ? 1 : d.spec.replicas;
        let done = false;
        for (let i = 0; i < 12 && !done; i++) {
          if (i > 0) { st.tick++; simk8Reconcile(sh, st); }
          const s = d.status; const rss = simk8Owned(st, d, 'ReplicaSet'); const hash = simk8TemplateHash(d.spec.template); const newRs = rss.find(x => x._hash === hash);
          const oldPods = rss.filter(x => x !== newRs).reduce((n, x) => n + simk8Owned(st, x, 'Pod').length, 0);
          const line = s.updatedReplicas < rep ? `Waiting for deployment "${d.metadata.name}" rollout to finish: ${s.updatedReplicas} out of ${rep} new replicas have been updated...` : (oldPods > 0 ? `Waiting for deployment "${d.metadata.name}" rollout to finish: ${oldPods} old replicas are pending termination...` : (s.availableReplicas < rep ? `Waiting for deployment "${d.metadata.name}" rollout to finish: ${s.availableReplicas} of ${rep} updated replicas are available...` : null));
          if (line === null) { lines.push(`deployment "${d.metadata.name}" successfully rolled out`); done = true; break; }
          if (lines[lines.length - 1] !== line) lines.push(line);
          if (a.val('timeout') && i >= 2) break;
        }
        if (!done) { if (d.status.conditions.some(c => c.type === 'Progressing' && c.status === 'False')) return { out: '', err: lines.join('\n') + '\n' + `error: deployment "${d.metadata.name}" exceeded its progress deadline\n`, code: 1 }; return { out: '', err: lines.join('\n') + '\n' + 'error: timed out waiting for the condition\n💡 ' + lt('rollout ilerlemiyor, kubectl get pods ve kubectl describe pod ile pod durumuna bak\n', 'the rollout is not progressing, check the pods with kubectl get pods and kubectl describe pod\n'), code: 1 }; }
        return ok(lines.join('\n') + '\n');
      }
      if (sub === 'history') {
        const revs = (st.revisions[key] || []).slice().sort((x, y) => x.rev - y.rev);
        const rv = a.val('revision');
        if (rv) { const rr = revs.find(x => String(x.rev) === rv); if (!rr) return simk8Err(`error: unable to find the specified revision`); const t = rr.template; return ok(`deployment.apps/${d.metadata.name} with revision #${rv}\n\nPod Template:\n  Labels:\t${Object.entries((t.metadata || {}).labels || {}).map(([k, v]) => `${k}=${v}`).join('\n\t')}\n\tpod-template-hash=${simk8TemplateHash(t)}\n${rr.cause ? `  Annotations:\tkubernetes.io/change-cause: ${rr.cause}\n` : ''}  Containers:\n${simk8Containers({ spec: t.spec }).map(c => `   ${c.name}:\n    Image:\t${c.image}\n    Port:\t${(c.ports || []).map(p => `${p.containerPort}/${p.protocol || 'TCP'}`).join(', ') || '<none>'}\n    Host Port:\t${(c.ports || []).length ? '0/TCP' : '<none>'}\n    Environment:\t${(c.env || []).length ? '' : '<none>'}\n${(c.env || []).map(e => `      ${e.name}:\t${e.value !== undefined ? e.value : ''}\n`).join('')}    Mounts:\t<none>\n`).join('')}  Volumes:\t<none>\n  Node-Selectors:\t<none>\n  Tolerations:\t<none>\n`); }
        return ok(`deployment.apps/${d.metadata.name} \nREVISION  CHANGE-CAUSE\n` + revs.map(x => `${String(x.rev).padEnd(10)}${x.cause || '<none>'}`).join('\n') + '\n');
      }
      if (sub === 'undo') {
        const revs = (st.revisions[key] || []).slice().sort((x, y) => x.rev - y.rev);
        const curRev = parseInt((d.metadata.annotations || {})['deployment.kubernetes.io/revision'] || '1', 10);
        let target;
        if (a.val('to-revision')) { target = revs.find(x => String(x.rev) === a.val('to-revision')); if (!target) return simk8Err(`error: unable to find specified revision ${a.val('to-revision')} in history`); if (target.rev === curRev) return ok(`deployment.apps/${d.metadata.name} skipped rollback (current template already matches revision ${curRev})\n`); }
        else { const prev = revs.filter(x => x.rev < curRev); if (!prev.length) return simk8Err(`error: no rollout history found for deployment "${d.metadata.name}"`); target = prev[prev.length - 1]; }
        d.spec.template = simk8Clone(target.template); d.metadata.generation = (d.metadata.generation || 1) + 1;
        d.metadata.annotations = d.metadata.annotations || {}; d.metadata.annotations['deployment.kubernetes.io/revision'] = String(Math.max(...revs.map(x => x.rev)) + 1);
        simk8Event(st, d, 'Normal', 'DeploymentRollback', `Rolled back deployment "${d.metadata.name}" to revision ${target.rev}`, 'deployment-controller');
        simk8Reconcile(sh, st);
        return ok(`deployment.apps/${d.metadata.name} rolled back\n`);
      }
      if (sub === 'restart') { d.spec.template.metadata = d.spec.template.metadata || {}; d.spec.template.metadata.annotations = Object.assign({}, d.spec.template.metadata.annotations || {}, { 'kubectl.kubernetes.io/restartedAt': simk8Iso(st, st.tick) }); d.metadata.generation = (d.metadata.generation || 1) + 1; simk8Reconcile(sh, st); return ok(`deployment.apps/${d.metadata.name} restarted\n`); }
      if (sub === 'pause') { d.spec.paused = true; return ok(`deployment.apps/${d.metadata.name} paused\n`); }
      if (sub === 'resume') { delete d.spec.paused; return ok(`deployment.apps/${d.metadata.name} resumed\n`); }
      return simk8Err(`error: unknown command "${sub}" for "kubectl rollout"\n\nAvailable Commands:\n  history     View rollout history\n  pause       Mark the provided resource as paused\n  restart     Restart a resource\n  resume      Resume a paused resource\n  status      Show the status of the rollout\n  undo        Undo a previous rollout`);
    }
    case 'set': {
      const sub = a.rest[0];
      if (sub === 'image') {
        const specs = a.rest.slice(1).filter(x => !x.includes('=')); const pairs = a.rest.slice(1).filter(x => x.includes('='));
        if (!pairs.length) return simk8Err('error: at least one image update is required\nSee \'kubectl set image -h\' for help and examples');
        const r = simk8ResolveOne(st, a, specs, nsExact, ['Deployment', 'Pod', 'ReplicaSet', 'DaemonSet', 'StatefulSet', 'Job', 'CronJob']); if (r.err) return simk8Err(r.err);
        const tplSpec = r.o.kind === 'Pod' ? r.o.spec : (r.o.kind === 'CronJob' ? r.o.spec.jobTemplate.spec.template.spec : r.o.spec.template.spec);
        let changed = false;
        for (const p of pairs) { const [cn, img] = p.split('='); let hit = false; simk8Containers({ spec: tplSpec }).forEach(c => { if (cn === '*' || c.name === cn) { hit = true; if (c.image !== img) { c.image = img; changed = true; } } }); if (!hit) return simk8Err(`error: unable to find container named "${cn}"`); }
        if (r.o.kind === 'Deployment' && changed) { r.o.metadata.generation = (r.o.metadata.generation || 1) + 1; if (a.has('record')) { r.o.metadata.annotations = r.o.metadata.annotations || {}; r.o.metadata.annotations['kubernetes.io/change-cause'] = `kubectl ${args.join(' ')}`; } }
        if (a.val('dry-run') && a.val('dry-run') !== 'none') return ok(`${simk8ResName(st, r.o)} image updated (${a.val('dry-run') === 'client' ? 'dry run' : 'server dry run'})\n`);
        simk8Reconcile(sh, st);
        return ok(`${simk8ResName(st, r.o)} image updated\n`);
      }
      if (sub === 'env') {
        const specs = a.rest.slice(1).filter(x => !x.includes('=') && !x.endsWith('-')); const pairs = a.rest.slice(1).filter(x => x.includes('=') || x.endsWith('-'));
        const r = simk8ResolveOne(st, a, specs, nsExact, ['Deployment', 'Pod', 'ReplicaSet', 'DaemonSet', 'StatefulSet']); if (r.err) return simk8Err(r.err);
        const tplSpec = r.o.kind === 'Pod' ? r.o.spec : r.o.spec.template.spec;
        if (a.has('list')) { let out = ''; simk8Containers({ spec: tplSpec }).forEach(c => { out += `# ${r.o.kind} ${r.o.metadata.name}, container ${c.name}\n` + (c.env || []).map(e => `${e.name}=${e.value !== undefined ? e.value : ''}`).join('\n') + ((c.env || []).length ? '\n' : ''); }); return ok(out); }
        if (!pairs.length && !a.val('from')) return simk8Err('error: at least one environment variable must be provided');
        simk8Containers({ spec: tplSpec }).forEach(c => { if (a.val('c', 'container') && c.name !== a.val('c', 'container')) return; c.env = c.env || []; if (a.val('from')) { const [k, n] = a.val('from').split('/'); c.envFrom = (c.envFrom || []).concat([simk8Kind(k).kind === 'Secret' ? { secretRef: { name: n } } : { configMapRef: { name: n } }]); } pairs.forEach(p => { if (p.endsWith('-')) { c.env = c.env.filter(e => e.name !== p.slice(0, -1)); return; } const i = p.indexOf('='); const name = p.slice(0, i); const val = p.slice(i + 1); const ex = c.env.find(e => e.name === name); if (ex) { ex.value = val; delete ex.valueFrom; } else c.env.push({ name, value: val }); }); });
        if (r.o.kind === 'Deployment') r.o.metadata.generation = (r.o.metadata.generation || 1) + 1;
        simk8Reconcile(sh, st);
        return ok(`${simk8ResName(st, r.o)} env updated\n`);
      }
      if (sub === 'resources') {
        const r = simk8ResolveOne(st, a, a.rest.slice(1), nsExact, ['Deployment', 'Pod', 'ReplicaSet', 'DaemonSet', 'StatefulSet']); if (r.err) return simk8Err(r.err);
        const tplSpec = r.o.kind === 'Pod' ? r.o.spec : r.o.spec.template.spec;
        const parse = s => Object.fromEntries((s || '').split(',').filter(Boolean).map(x => x.split('=')));
        simk8Containers({ spec: tplSpec }).forEach(c => { if (a.val('c', 'container') && c.name !== a.val('c', 'container')) return; c.resources = c.resources || {}; if (a.val('requests')) c.resources.requests = Object.assign({}, c.resources.requests || {}, parse(a.val('requests'))); if (a.val('limits')) c.resources.limits = Object.assign({}, c.resources.limits || {}, parse(a.val('limits'))); });
        if (r.o.kind === 'Deployment') r.o.metadata.generation = (r.o.metadata.generation || 1) + 1;
        simk8Reconcile(sh, st);
        return ok(`${simk8ResName(st, r.o)} resource requirements updated\n`);
      }
      return simk8Err(`error: unknown command "${sub || ''}" for "kubectl set"\n\nAvailable Commands:\n  env            Update environment variables on a pod template\n  image          Update the image of a pod template\n  resources      Update resource requests/limits on objects with pod templates\n  selector       Set the selector on a resource\n  serviceaccount Update the service account of a resource\n  subject        Update the user, group, or service account in a role binding or cluster role binding`);
    }
    case 'label': case 'annotate': {
      const isLabel = verb === 'label';
      const pairs = a.rest.filter((x, i) => i > 0 && (x.includes('=') || x.endsWith('-'))); const specs = a.rest.filter((x, i) => !(i > 0 && (x.includes('=') || x.endsWith('-'))));
      if (!pairs.length) return simk8Err(`error: at least one ${isLabel ? 'label' : 'annotation'} update is required`);
      const sel = a.val('l', 'selector') || a.has('all') ? simk8Select(st, a, specs.slice(0, 1), nsExact) : simk8Select(st, a, specs, nsExact);
      if (sel.err) return simk8Err(sel.err);
      if (sel.errs.length && !sel.items.length) return simk8Err(sel.errs.join('\n'));
      let out = ''; let err = '';
      for (const o of sel.items) {
        const bag = isLabel ? (o.metadata.labels = o.metadata.labels || {}) : (o.metadata.annotations = o.metadata.annotations || {});
        let changed = false;
        for (const p of pairs) { if (p.endsWith('-')) { const k = p.slice(0, -1); if (bag[k] === undefined) { err += `error: ${isLabel ? 'label' : 'annotation'} "${k}" not found.\n`; continue; } delete bag[k]; changed = true; continue; } const i = p.indexOf('='); const k = p.slice(0, i); const v = p.slice(i + 1); if (bag[k] !== undefined && bag[k] !== v && !a.has('overwrite')) { err += `error: '${k}' already has a value (${bag[k]}), and --overwrite is false\n`; continue; } if (isLabel && !/^([a-z0-9.-]+\/)?[A-Za-z0-9]([-A-Za-z0-9_.]*[A-Za-z0-9])?$/.test(k)) { err += `The ${o.kind} "${o.metadata.name}" is invalid: metadata.labels: Invalid value: "${k}": name part must consist of alphanumeric characters, '-', '_' or '.', and must start and end with an alphanumeric character\n`; continue; } if (bag[k] !== v) changed = true; bag[k] = v; }
        if (!isLabel && o.kind === 'Deployment' && pairs.some(p => p.startsWith('kubernetes.io/change-cause='))) { const key = `${o.metadata.namespace}/${o.metadata.name}`; const revs = st.revisions[key] || []; const cur = revs.find(x => String(x.rev) === (o.metadata.annotations['deployment.kubernetes.io/revision'] || '1')); if (cur) cur.cause = o.metadata.annotations['kubernetes.io/change-cause']; }
        out += `${simk8ResName(st, o)} ${changed ? (isLabel ? 'labeled' : 'annotated') : 'not ' + (isLabel ? 'labeled' : 'annotated')}\n`;
      }
      return { out, err: err + sel.errs.join('\n') + (sel.errs.length ? '\n' : ''), code: err || sel.errs.length ? 1 : 0 };
    }
    case 'top': {
      const what = a.rest[0];
      if (what === 'node' || what === 'nodes' || what === 'no') { const rows = [['NAME', 'CPU(cores)', 'CPU%', 'MEMORY(bytes)', 'MEMORY%']]; SIMK8_NODES.forEach(n => { const pods = st.objects.filter(p => p.kind === 'Pod' && p._p && p._p.node === n.name && !simk8PodDone(p)); let cpu = n.taint ? 95 : 48; let mem = n.taint ? 612 : 318; pods.forEach(p => { const u = simk8PodUsage(sh, st, p); cpu += u.cpu; mem += u.mem; }); rows.push([n.name, `${Math.round(cpu)}m`, `${Math.round(cpu / 4000 * 100)}%`, `${Math.round(mem)}Mi`, `${Math.round(mem / 7930 * 100)}%`]); }); return ok(simk8Table(rows)); }
      if (what === 'pod' || what === 'pods' || what === 'po') { let pods = SIMK8_list(st, 'Pod', ns).filter(p => !a.rest[1] || p.metadata.name === a.rest[1]); if (a.val('l', 'selector')) pods = pods.filter(p => simk8LabelSel(a.val('l', 'selector'), p.metadata.labels)); if (a.rest[1] && !pods.length) return simk8Err(`Error from server (NotFound): pods "${a.rest[1]}" not found`); pods = pods.filter(p => simk8PodView(sh, st, p).phase === 'Running' || (p._p && p._p.sys)); if (!pods.length) return simk8Err(`error: Metrics not available for pod ${nsExact}/${a.rest[1] || ''}, age: 2s`.replace(/\/, age/, ', age')); const rows = [['NAME', 'CPU(cores)', 'MEMORY(bytes)']]; if (ns === '*') rows[0].unshift('NAMESPACE'); if (a.has('containers')) rows[0].splice(ns === '*' ? 1 : 0, 1, 'POD', 'NAME'); const sortBy = a.val('sort-by'); const list = pods.map(p => ({ p, u: simk8PodUsage(sh, st, p) })); if (sortBy === 'cpu') list.sort((x, y) => y.u.cpu - x.u.cpu); if (sortBy === 'memory') list.sort((x, y) => y.u.mem - x.u.mem); list.forEach(({ p, u }) => { if (a.has('containers')) { simk8Containers(p).forEach(c => { const r = [p.metadata.name, c.name, `${Math.round(u.cpu / simk8Containers(p).length)}m`, `${Math.round(u.mem / simk8Containers(p).length)}Mi`]; if (ns === '*') r.unshift(p.metadata.namespace); rows.push(r); }); return; } const r = [p.metadata.name, `${Math.round(u.cpu)}m`, `${Math.round(u.mem)}Mi`]; if (ns === '*') r.unshift(p.metadata.namespace); rows.push(r); }); return ok(simk8Table(rows)); }
      return simk8Err(`error: unknown command "${what || ''}" for "kubectl top"\n\nAvailable Commands:\n  node        Display resource (CPU/memory) usage of nodes\n  pod         Display resource (CPU/memory) usage of pods`);
    }
    case 'explain': { const p = a.rest[0]; if (!p) return simk8Err('error: You must specify the type of resource to explain. Use "kubectl api-resources" for a complete list of supported resources.\n\nerror: Required resource not specified.'); const t = simk8ExplainText(p); if (t === null) return simk8Err(`error: the server doesn't have a resource type "${p.split('.')[0]}"`); if (t.startsWith('error:')) return simk8Err(t); return ok(t.replace(/\t/g, '\t')); }
    case 'events': { let evs = st.events.filter(e => ns === '*' || e.ns === ns); if (a.val('for')) { const [t, n] = a.val('for').split('/'); const k = simk8Kind(t); evs = evs.filter(e => k && e.kind === k.kind && e.name === n); } if (a.val('types')) evs = evs.filter(e => a.val('types').split(',').map(x => x.toLowerCase()).includes(e.type.toLowerCase())); evs = evs.slice().sort((x, y) => x.last - y.last); st.audit.events.push(ns); if (!evs.length) return ok(ns === '*' ? 'No events found.\n' : `No events found in ${ns} namespace.\n`); if (a.val('o', 'output') === 'yaml' || a.val('o', 'output') === 'json') { const items = evs.map(e => ({ apiVersion: 'v1', kind: 'Event', metadata: { name: `${e.name}.${simk8Hash(e.key).slice(0, 16)}`, namespace: e.ns, creationTimestamp: simk8Iso(st, e.first) }, involvedObject: { kind: e.kind, name: e.name, namespace: e.ns, uid: e.uid }, reason: e.reason, message: e.message, type: e.type, count: e.count, firstTimestamp: simk8Iso(st, e.first), lastTimestamp: simk8Iso(st, e.last), source: { component: e.from } })); const doc = { apiVersion: 'v1', kind: 'List', items, metadata: { resourceVersion: '' } }; return ok(a.val('o', 'output') === 'json' ? JSON.stringify(doc, null, 4) + '\n' : simk8Yaml(doc)); } return ok(simk8Table(simk8EventRows(st, evs, ns === '*'))); }
    case 'port-forward': {
      const target = a.rest[0]; const maps = a.rest.slice(1).filter(x => /^\d+(:\d+)?$/.test(x));
      if (!target || !maps.length) return simk8Err('error: TYPE/NAME and list of ports are required for port-forward\nSee \'kubectl port-forward -h\' for help and examples');
      let o; let k;
      if (target.includes('/')) { const [t, n] = target.split('/'); k = simk8Kind(t); if (!k) return simk8NoType(t); o = SIMK8_find(st, k.kind, nsExact, n); if (!o) return simk8NotFound(k, n); } else { k = simk8Kind('pod'); o = SIMK8_find(st, 'Pod', nsExact, target); if (!o) return simk8NotFound(k, target); }
      let pod = o; let remotePortMap = null;
      if (o.kind === 'Service') { const eps = o._endpoints || []; if (!eps.length) return simk8Err(`error: unable to forward port because pod is not running. Current status=Pending\n💡 ` + lt(`Service'in endpoint'i yok, kubectl get endpoints ${o.metadata.name} ile bak`, `The Service has no endpoints, check with kubectl get endpoints ${o.metadata.name}`)); pod = SIMK8_find(st, 'Pod', nsExact, eps[0].pod); remotePortMap = (o.spec.ports || []); }
      else if (o.kind === 'Deployment') { const pods = simk8Owned(st, o, 'ReplicaSet').flatMap(r => simk8Owned(st, r, 'Pod')); if (!pods.length) return simk8Err(`error: no pods found for deployment/${o.metadata.name}`); pod = pods[0]; }
      const v = simk8PodView(sh, st, pod); if (v.phase !== 'Running') return simk8Err(`error: unable to forward port because pod is not running. Current status=${v.phase}`);
      let out = '';
      maps.forEach(m => { let [local, remote] = m.split(':'); remote = remote || local; if (remotePortMap) { const sp = remotePortMap.find(p => String(p.port) === remote || p.name === remote); if (sp) remote = String(typeof sp.targetPort === 'number' ? sp.targetPort : (parseInt(sp.targetPort, 10) || sp.port)); } st.portForwards = st.portForwards.filter(f => f.local !== local); st.portForwards.push({ local, remote, pod: pod.metadata.name, ns: nsExact, image: (simk8Containers(pod)[0] || {}).image }); out += `Forwarding from 127.0.0.1:${local} -> ${remote}\nForwarding from [::1]:${local} -> ${remote}\n`; });
      out += lt(`lab: port-forward arka planda kaldı, curl http://localhost:${maps[0].split(':')[0]}/ ile dene\n`, `lab: port-forward stays in the background, try curl http://localhost:${maps[0].split(':')[0]}/\n`);
      return ok(out);
    }
    case 'cp': { const [src, dst] = a.rest; if (!src || !dst) return simk8Err('error: source and destination are required\nSee \'kubectl cp -h\' for help and examples'); const m = /^(?:([^/:]+)\/)?([^:]+):(.+)$/.exec(src) || /^(?:([^/:]+)\/)?([^:]+):(.+)$/.exec(dst); if (!m) return simk8Err('error: one of src or dest must be a remote file specification'); const pod = SIMK8_find(st, 'Pod', m[1] || nsExact, m[2]); if (!pod) return simk8Err(`error: pods "${m[2]}" not found`); const v = simk8PodView(sh, st, pod); if (v.phase !== 'Running') return simk8Err(`error: cannot exec into a container in a completed pod; current phase is ${v.phase}`); if (/:/.test(src)) { const rec = typeof SIMDK_imageRecord === 'function' ? SIMDK_imageRecord(sh, simk8Containers(pod)[0].image) : null; const f = rec && rec.files ? rec.files[m[3].replace(/^\//, '')] : undefined; if (f === undefined) return simk8Err(`tar: ${m[3].replace(/^\//, '')}: Cannot stat: No such file or directory\ntar: Exiting with failure status due to previous errors\nerror: exit status 2`); const e = sh.writeFile(dst, f, false, 'kubectl'); return e ? simk8Err(e) : ok(); } const r = sh.readFile(src, 'kubectl'); if (r.err) return simk8Err(`error: ${sh.resolve(src)} doesn't exist in local filesystem`); return ok(lt(`lab: ${src} dosyası ${pod.metadata.name}:${m[3]} içine kopyalandı gibi, pod filesystem'i simüle ediliyor\n`, `lab: ${src} counts as copied into ${pod.metadata.name}:${m[3]}, the pod filesystem is simulated\n`)); }
    case 'diff': {
      const files = a.all('f', 'filename'); if (!files.length) return simk8Err('error: must specify -f');
      let out = ''; let diffFound = false;
      for (const f of files) { const r = simk8ReadDocs(sh, f); if (r.err) return simk8Err(r.err); for (const { doc, file } of r.docs) { const ve = simk8Validate(st, doc, file); if (ve) return simk8Err(ve); const k = SIMK8_KINDS.find(x => x.kind === doc.kind); const dns = k.namespaced ? (doc.metadata.namespace || nsExact) : ''; const live = SIMK8_find(st, k.kind, dns || null, doc.metadata.name); const id = `${simk8ApiVersion(k).replace('/', '.')}.${k.kind}.${dns}.${doc.metadata.name}`; const liveTxt = live ? simk8Yaml(simk8Export(st, live)) : ''; const merged = live ? simk8Clone(simk8Export(st, live)) : null; if (merged) { merged.spec = Object.assign({}, doc.spec); if (doc.data !== undefined) merged.data = doc.data; merged.metadata.labels = doc.metadata.labels || merged.metadata.labels; if (doc.spec && doc.spec.replicas == null && live.spec.replicas != null && doc.kind === 'Deployment') merged.spec.replicas = live.spec.replicas; merged.metadata.generation = (live.metadata.generation || 1) + (JSON.stringify(live.spec) !== JSON.stringify(doc.spec) ? 1 : 0); } const mergedTxt = merged ? simk8Yaml(merged) : simk8Yaml(Object.assign({}, doc, { metadata: Object.assign({ namespace: dns || undefined }, doc.metadata) })); if (liveTxt === mergedTxt) continue; diffFound = true; const A = liveTxt.split('\n').filter((x, i, arr) => x || i < arr.length - 1); const B = mergedTxt.split('\n').filter((x, i, arr) => x || i < arr.length - 1); out += `diff -u -N /tmp/LIVE-${simk8Hash('live').slice(0, 10)}/${id} /tmp/MERGED-${simk8Hash('merged').slice(0, 10)}/${id}\n--- /tmp/LIVE-${simk8Hash('live').slice(0, 10)}/${id}\t${simk8Iso(st, st.tick).replace('T', ' ').replace('Z', '.000000000 +0000')}\n+++ /tmp/MERGED-${simk8Hash('merged').slice(0, 10)}/${id}\t${simk8Iso(st, st.tick).replace('T', ' ').replace('Z', '.000000000 +0000')}\n`; if (typeof gitOps === 'function' && typeof gitHunks === 'function') gitHunks(gitOps(A, B)).forEach(h => { out += h.join('\n') + '\n'; }); else out += A.map(l => '-' + l).join('\n') + '\n' + B.map(l => '+' + l).join('\n') + '\n'; } }
      return { out, err: '', code: diffFound ? 1 : 0 };
    }
    case 'patch': {
      const r = simk8ResolveOne(st, a, a.rest, nsExact); if (r.err) return simk8Err(r.err);
      const p = a.val('p', 'patch'); if (!p) return simk8Err('error: must specify -p to patch');
      let patch; try { patch = /^\s*\{/.test(p) ? JSON.parse(p) : jsyaml.load(p); } catch (e) { return simk8Err(`error: unable to parse "${p}": ${e.message.split('\n')[0]}`); }
      if (a.val('type') === 'json') return simk8Err(lt('error: lab, json patch yok, merge patch kullan', 'error: lab, no json patch, use a merge patch'));
      const merge = (dst, src) => { for (const [k, v] of Object.entries(src)) { if (v === null) delete dst[k]; else if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) merge(dst[k], v); else if (Array.isArray(v) && Array.isArray(dst[k]) && v.every(x => x && x.name) && dst[k].every(x => x && x.name)) { v.forEach(item => { const ex = dst[k].find(x => x.name === item.name); if (ex) merge(ex, item); else dst[k].push(item); }); } else dst[k] = v; } };
      const before = JSON.stringify([r.o.spec, r.o.data, r.o.metadata.labels, r.o.metadata.annotations]);
      merge(r.o, patch);
      const after = JSON.stringify([r.o.spec, r.o.data, r.o.metadata.labels, r.o.metadata.annotations]);
      if (r.o.kind === 'Deployment' && before !== after) r.o.metadata.generation = (r.o.metadata.generation || 1) + 1;
      simk8Reconcile(sh, st);
      return ok(`${simk8ResName(st, r.o)} patched${before === after ? ' (no change)' : ''}\n`);
    }
    case 'edit': return simk8Err(lt(`error: lab, kubectl edit etkileşimli editör açar, bu lab'da yok. kubectl get ${a.rest.join(' ')} -o yaml > dosya.yaml, düzenle, kubectl apply -f dosya.yaml`, `error: lab, kubectl edit opens an interactive editor, which this lab does not have. Run kubectl get ${a.rest.join(' ')} -o yaml > file.yaml, edit it, then kubectl apply -f file.yaml`));
    case 'wait': {
      const cond = a.val('for'); if (!cond) return simk8Err('error: required flag(s) "for" not set');
      const sel = simk8Select(st, a, a.rest, nsExact); if (sel.err) return simk8Err(sel.err); if (sel.errs.length) return simk8Err(sel.errs.join('\n'));
      let out = ''; const timeout = Math.min(30, Math.max(1, Math.round(parseInt((a.val('timeout') || '60s').replace(/s$/, ''), 10) / 10)));
      for (const o of sel.items) {
        let done = false;
        for (let i = 0; i < timeout && !done; i++) {
          if (i > 0) { st.tick++; simk8Reconcile(sh, st); }
          if (cond === 'delete') { done = !st.objects.includes(o); continue; }
          const m = /^condition=(\w+)(?:=(\w+))?$/i.exec(cond) || /^jsonpath=/.exec(cond);
          if (!m) return simk8Err(`error: unrecognized condition: "${cond}"`);
          if (m[0].startsWith('jsonpath')) { const [path, want] = cond.slice(9).split('='); const v = simk8JsonPath(path.startsWith('{') ? path : `{${path}}`, simk8Export(st, o)); done = want === undefined ? v !== '' : v === want.replace(/^['"]|['"]$/g, ''); continue; }
          const want = (m[2] || 'true').toLowerCase();
          const conds = o.kind === 'Pod' ? (o.status || {}).conditions || [] : (o.status || {}).conditions || [];
          const c = conds.find(x => x.type.toLowerCase() === m[1].toLowerCase());
          done = !!c && c.status.toLowerCase() === want;
        }
        if (!done) return { out, err: `error: timed out waiting for the condition on ${simk8ResName(st, o)}\n`, code: 1 };
        out += `${simk8ResName(st, o)} condition met\n`;
      }
      return ok(out);
    }
    case 'cordon': case 'uncordon': case 'drain': case 'taint': { const n = SIMK8_find(st, 'Node', null, a.rest[0]); if (!n) return simk8Err(`Error from server (NotFound): nodes "${a.rest[0] || ''}" not found`); if (verb === 'taint') { const t = a.rest[1] || ''; if (t.endsWith('-')) { n.spec.taints = (n.spec.taints || []).filter(x => x.key !== t.slice(0, -1).split(':')[0]); return ok(`node/${n.metadata.name} untainted\n`); } const m = /^([^=:]+)(?:=([^:]*))?:(\w+)$/.exec(t); if (!m) return simk8Err(`error: invalid taint "${t}"`); n.spec.taints = (n.spec.taints || []).filter(x => x.key !== m[1]).concat([{ key: m[1], value: m[2], effect: m[3] }]); const nd = SIMK8_NODES.find(x => x.name === n.metadata.name); if (nd) nd.taint = m[3] === 'NoSchedule'; return ok(`node/${n.metadata.name} tainted\n`); } if (verb === 'cordon') { n.spec.unschedulable = true; return ok(`node/${n.metadata.name} cordoned\n`); } if (verb === 'uncordon') { delete n.spec.unschedulable; return ok(`node/${n.metadata.name} uncordoned\n`); } return ok(`node/${n.metadata.name} cordoned\n` + lt("lab: drain simüle edilmiyor, pod'lar yerinde kaldı\n", 'lab: drain is not simulated, the pods stayed in place\n')); }
    case 'auth': { if (a.rest[0] === 'can-i') return ok('yes\n'); if (a.rest[0] === 'whoami') return ok('ATTRIBUTE   VALUE\nUsername    kubernetes-admin\nGroups      [kubeadm:cluster-admins system:authenticated]\n'); return simk8Err(lt('error: lab, kubectl auth can-i ve whoami destekleniyor', 'error: lab, kubectl auth can-i and whoami are supported')); }
    case 'proxy': return ok('Starting to serve on 127.0.0.1:8001\n' + lt('lab: proxy arka planda kaldı gibi, bu lab\'da API erişimi yok\n', 'lab: the proxy counts as running in the background, there is no API access in this lab\n'));
    case 'attach': case 'debug': return simk8Err(lt(`error: lab, kubectl ${verb} bu lab'da yok, kubectl exec ve kubectl logs kullan`, `error: lab, kubectl ${verb} is not available in this lab, use kubectl exec and kubectl logs`));
    case 'kustomize': return simk8Err(lt('error: lab, kustomize bu lab\'da yok', 'error: lab, kustomize is not available in this lab'));
    case 'completion': case 'plugin': return ok('');
    case 'hpa-load': {
      const sub = a.rest[0];
      if (sub === 'start') { st.hpaLoad = true; st.hpaLoadSince = st.tick; return ok(lt('lab: sentetik yük başladı, pod CPU kullanımı yükseliyor. kubectl top pods ve kubectl get hpa ile izle, her kubectl komutu bir ölçüm periyodu ilerletir\n', 'lab: synthetic load started, pod CPU usage is rising. Watch with kubectl top pods and kubectl get hpa, each kubectl command advances one metrics period\n')); }
      if (sub === 'stop') { st.hpaLoad = false; st.hpaLoadStop = st.tick; return ok(lt('lab: sentetik yük durdu, HPA stabilizasyon penceresinden sonra replica sayısını düşürür\n', 'lab: synthetic load stopped, the HPA lowers the replica count after its stabilization window\n')); }
      if (sub === 'status') return ok(`lab: hpa-load ${st.hpaLoad ? lt('açık', 'on') : lt('kapalı', 'off')}\n`);
      return ok('Usage: kubectl hpa-load start|stop|status\n' + lt('Lab yardımcısı, HPA görevinde pod CPU yükünü yapay olarak yükseltir\n', 'Lab helper, it raises pod CPU load artificially for the HPA mission\n'));
    }
    default: return simk8Err(`error: unknown command "${verb}" for "kubectl"\n\nDid you mean this?\n\t${['get', 'set', 'create', 'delete', 'describe', 'apply', 'logs', 'exec', 'scale', 'rollout', 'top', 'config'].sort((x, y) => simk8Lev(x, verb) - simk8Lev(y, verb))[0]}`);
  }
}
function simk8Lev(a, b) { const m = []; for (let i = 0; i <= a.length; i++) { m[i] = [i]; for (let j = 1; j <= b.length; j++) m[i][j] = i === 0 ? j : Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); } return m[a.length][b.length]; }
function simk8PodUsage(sh, st, p) {
  if (p._p && p._p.sys) return { cpu: p._p.cpu || 1, mem: p._p.mem || 8 };
  const req = simk8PodRequests(p);
  const hpa = st.objects.find(h => h.kind === 'HorizontalPodAutoscaler' && h.metadata.namespace === p.metadata.namespace && simk8Owner(st, simk8Owner(st, p) || { metadata: {} }) && SIMK8_find(st, 'Deployment', p.metadata.namespace, (h.spec.scaleTargetRef || {}).name) === simk8Owner(st, simk8Owner(st, p) || { metadata: {} }));
  const loadOn = st.hpaLoad && st.tick - (st.hpaLoadSince || 0) >= 1;
  const base = simk8Containers(p).reduce((n, c) => n + (simk8IsLabApp(c.image) ? 2 : (/nginx/.test(c.image) ? 1 : (/redis/.test(c.image) ? 2 : (/postgres/.test(c.image) ? 4 : 1)))), 0);
  const cpu = hpa && hpa._perPod ? hpa._perPod * 1000 : (loadOn && req.cpu ? req.cpu * 1000 * 1.9 : base + (parseInt(p.metadata.uid.slice(0, 2), 16) % 3));
  const mem = simk8Containers(p).reduce((n, c) => n + (simk8IsLabApp(c.image) ? 24 : (/nginx/.test(c.image) ? 4 : (/redis/.test(c.image) ? 9 : (/postgres/.test(c.image) ? 41 : 2)))), 0) + (parseInt(p.metadata.uid.slice(2, 4), 16) % 4);
  return { cpu, mem };
}
function simk8Kind2(args) { const sub = args[0]; const sub2 = args[1]; if (!sub || sub === '--help') return ok('kind creates and manages local Kubernetes clusters using Docker container \'nodes\'\n\nUsage:\n  kind [command]\n\nAvailable Commands:\n  build       Build one of [node-image]\n  create      Creates one of [cluster]\n  delete      Deletes one of [cluster]\n  get         Gets one of [clusters, nodes, kubeconfig]\n  load        Loads images into nodes\n  version     Prints the kind CLI version\n'); if (sub === 'version') return ok('kind v0.24.0 go1.22.6 linux/amd64\n'); if (sub === 'get' && sub2 === 'clusters') return ok('netops\n'); if (sub === 'get' && sub2 === 'nodes') return ok('netops-control-plane\nnetops-worker\n'); if (sub === 'get' && sub2 === 'kubeconfig') return ok('apiVersion: v1\nclusters:\n- cluster:\n    certificate-authority-data: DATA+OMITTED\n    server: https://127.0.0.1:41347\n  name: kind-netops\ncontexts:\n- context:\n    cluster: kind-netops\n    user: kind-netops\n  name: kind-netops\ncurrent-context: kind-netops\nkind: Config\n'); if (sub === 'create') return fail('ERROR: failed to create cluster: node(s) already exist for a cluster with the name "netops"\n💡 ' + lt('Lab cluster\'ı zaten çalışıyor, kubectl get nodes ile bak', 'The lab cluster is already running, check with kubectl get nodes')); if (sub === 'delete') return fail(lt('lab: cluster silme bu lab\'da kapalı, Profil sekmesinden filesystem sıfırlanınca cluster da sıfırlanır', 'lab: deleting the cluster is disabled in this lab, resetting the filesystem from the Profile tab also resets the cluster')); if (sub === 'load') { const sh = this; if (sub2 !== 'docker-image' || !args[2]) return fail(lt('ERROR: lab, kind load docker-image IMAJ:TAG kullan', 'ERROR: lab, use kind load docker-image IMAGE:TAG')); const st = typeof SIMDK_load === 'function' ? SIMDK_load(sh) : null; if (!st) return fail(lt('lab: docker sim yok', 'lab: the docker simulator is not loaded')); let out = ''; for (const ref of args.slice(2).filter(x => !x.startsWith('-'))) { const img = simdkFindImage(st, ref); if (!img) return fail(`ERROR: image: "${ref}" not present locally`); const r = simdkRef(ref); const key = `${r.repo}:${r.tag}`; if (!st.kindLoaded.includes(key)) st.kindLoaded.push(key); out += `Image: "${ref}" with ID "sha256:${img.id}" not yet present on node "netops-worker", loading...\nImage: "${ref}" with ID "sha256:${img.id}" not yet present on node "netops-control-plane", loading...\n`; } SIMDK_save(sh, st); return ok(out); } if (sub === 'export') return ok(lt('lab: kind export logs bu lab\'da yok\n', 'lab: kind export logs is not available in this lab\n')); return fail(`Error: unknown command "${sub}" for "kind"`); }
function simk8Minikube(args) { const sub = args[0]; if (sub === 'status') return ok('minikube\ntype: Control Plane\nhost: Running\nkubelet: Running\napiserver: Running\nkubeconfig: Configured\n\n' + lt('lab: bu lab\'ın aktif cluster\'ı kind-netops, kubectl config get-contexts ile bak\n', 'lab: the active cluster of this lab is kind-netops, check with kubectl config get-contexts\n')); if (sub === 'start') return ok('😄  minikube v1.34.0 on Ubuntu 24.04\n✨  Using the docker driver based on existing profile\n👍  Starting "minikube" primary control-plane node in "minikube" cluster\n🏃  Updating the running docker "minikube" container ...\n🔎  Verifying Kubernetes components...\n🏄  Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default\n' + lt('lab: bu lab\'da cluster zaten çalışıyor, kubectl config use-context kind-netops ile lab cluster\'ını kullan\n', 'lab: a cluster is already running in this lab, use the lab cluster with kubectl config use-context kind-netops\n')); if (sub === 'stop' || sub === 'delete') return ok(lt(`lab: minikube ${sub} bu lab'da kapalı, cluster çalışmaya devam ediyor\n`, `lab: minikube ${sub} is disabled in this lab, the cluster keeps running\n`)); if (sub === 'version') return ok('minikube version: v1.34.0\ncommit: 210b148df93a80eb872ecbeb7e35281b3c582c61\n'); if (sub === 'ip') return ok('192.168.49.2\n'); if (sub === 'dashboard' || sub === 'tunnel' || sub === 'service') return ok(lt(`lab: minikube ${sub} bu lab'da yok\n`, `lab: minikube ${sub} is not available in this lab\n`)); if (sub === 'addons') return ok(lt('lab: addons listesi, ingress enabled, metrics-server enabled\n', 'lab: addons list, ingress enabled, metrics-server enabled\n')); return ok('minikube provisions and manages local Kubernetes clusters optimized for development workflows.\n\nBasic Commands:\n  start            Starts a local Kubernetes cluster\n  status           Gets the status of a local Kubernetes cluster\n  stop             Stops a running local Kubernetes cluster\n  delete           Deletes a local Kubernetes cluster\n'); }

/* port-forward sonrasi curl localhost:PORT */
if (typeof LAB !== 'undefined' && LAB.registerHttp) {
  LAB.registerHttp(req => {
    if (req.host !== 'localhost' && req.host !== '127.0.0.1') return null;
    const sh = typeof SIMDK_lastSh !== 'undefined' && SIMDK_lastSh ? SIMDK_lastSh : (typeof SIMK8_lastSh !== 'undefined' ? SIMK8_lastSh : null);
    if (!sh) return null;
    const st = SIMK8_load(sh);
    const port = req.port || (req.protocol === 'https' ? '443' : '80');
    const f = st.portForwards.find(x => x.local === port);
    if (!f) return null;
    if (/nginx/.test(f.image || '')) return { status: req.path === '/' || req.path === '/index.html' ? 200 : 404, headers: { server: 'nginx/1.27.2', 'content-type': 'text/html' }, body: req.path === '/' || req.path === '/index.html' ? '<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, the nginx web server is successfully installed and\nworking. Further configuration is required.</p>\n</body>\n</html>\n' : '<html>\r\n<head><title>404 Not Found</title></head>\r\n<body>\r\n<center><h1>404 Not Found</h1></center>\r\n<hr><center>nginx/1.27.2</center>\r\n</body>\r\n</html>\r\n' };
    if (simk8IsLabApp(f.image)) { if (req.path === '/healthz' || req.path === '/ready' || req.path === '/livez') return { status: 200, body: { status: 'ok', version: '1.0.0', pod: f.pod } }; if (req.path === '/') return { status: 200, body: { service: 'netauto', version: '1.0.0', pod: f.pod, endpoints: ['/healthz', '/devices', '/metrics'] } }; if (req.path === '/devices') return { status: 200, body: { devices: ['r1', 'r2', 'sw1'] } }; if (req.path === '/metrics') return { status: 200, headers: { 'content-type': 'text/plain' }, body: `# HELP netauto_devices_total Devices in inventory\n# TYPE netauto_devices_total gauge\nnetauto_devices_total 3\n# HELP netauto_audit_runs_total Audit runs\n# TYPE netauto_audit_runs_total counter\nnetauto_audit_runs_total ${st.tick}\n` }; return { status: 404, body: { error: 'not found' } }; }
    return { status: 200, headers: { 'content-type': 'text/plain' }, body: lt(`lab: ${f.pod} port ${f.remote} yanıt verdi\n`, `lab: ${f.pod} port ${f.remote} responded\n`) };
  });
}
let SIMK8_lastSh = null;
function simk8Entry(args, stdin) { SIMK8_lastSh = this; if (typeof SIMDK_lastSh !== 'undefined') SIMDK_lastSh = this; return simk8Command.call(this, args, stdin); }
registerExt({
  files: [{ path: SIMK8_STATE, node: mkfile(JSON.stringify(simk8Fresh()), 0o600, 'root') }, { path: '/home/burak/.kube', node: mkdir({}, 0o700, 'burak') }, { path: '/home/burak/.kube/config', node: mkfile('apiVersion: v1\nkind: Config\ncurrent-context: kind-netops\ncontexts:\n- name: kind-netops\n  context:\n    cluster: kind-netops\n    user: kind-netops\n- name: minikube\n  context:\n    cluster: minikube\n    user: minikube\n- name: prod-eks\n  context:\n    cluster: arn:aws:eks:eu-west-1:482915:cluster/netops-prod\n    user: netops-prod-admin\n    namespace: netops\nclusters:\n- name: kind-netops\n  cluster:\n    server: https://127.0.0.1:41347\n    certificate-authority-data: DATA+OMITTED\nusers:\n- name: kind-netops\n  user:\n    client-certificate-data: DATA+OMITTED\n    client-key-data: DATA+OMITTED\n', 0o600, 'burak') }],
  commands: { kubectl: simk8Entry, k: simk8Entry, kind: simk8Kind2, minikube: simk8Minikube },
  manual: {
    kubectl: { d: 'Kubernetes CLI. Lab cluster\'ı kind-netops, 2 node, namespace\'ler default kube-system netops. Her komut cluster saatini bir tick ilerletir, pod\'lar tick\'lerle Pending ContainerCreating Running\'e geçer', u: ['kubectl get pods|deploy|svc|all [-n ns] [-A] [-o wide|yaml|json|jsonpath=...] [-l k=v] [--show-labels]', 'kubectl apply -f dosya.yaml [--dry-run=client|server]', 'kubectl describe pod|deploy|svc ad', 'kubectl logs [-f] [--previous] [-c konteyner] pod|deploy/ad', 'kubectl exec [-it] pod -- komut', 'kubectl scale deploy ad --replicas=N', 'kubectl rollout status|history|undo|restart deploy/ad', 'kubectl set image deploy/ad konteyner=imaj:tag', 'kubectl delete -f dosya | pod ad [--grace-period=0 --force]', 'kubectl top pods|nodes', 'kubectl get endpoints, kubectl get events, kubectl events --for pod/ad', 'kubectl config get-contexts|use-context|current-context|set-context --current --namespace=ns', 'kubectl explain deployment.spec.strategy', 'kubectl hpa-load start|stop, lab yardımcısı'], e: ['kubectl get pods -n netops -o wide', 'kubectl apply -f deploy.yaml', 'kubectl describe pod web-7d9f8b6c4-abcde', 'kubectl logs --previous web-7d9f8b6c4-abcde', 'kubectl set image deployment/web web=registry.lab/netauto:1.0.0', 'kubectl rollout undo deployment/web'] },
    kind: { d: 'Kubernetes in Docker. Lab cluster\'ı netops zaten çalışıyor, kind load docker-image ile yerel imajı node\'lara yükler', u: ['kind get clusters', 'kind get nodes', 'kind load docker-image imaj:tag'], e: ['kind get clusters', 'kind load docker-image netauto:1.0.0'] },
    k: { d: 'kubectl kısayolu', u: ['k get pods'], e: ['k get all -n netops'] },
  },
  onReset: sh => { sh.install(SIMK8_STATE, mkfile(JSON.stringify(simk8Fresh()), 0o600, 'root')); },
});
if (typeof module !== 'undefined') module.exports = { SIMK8_load, SIMK8_save, SIMK8_find, SIMK8_list, simk8PodView };
