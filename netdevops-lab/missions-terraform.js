'use strict';
/* Terraform bolumu. 12 gorev, ~/tf altinda lab provider'i ile r1 ve r2 uzerinde vlan, interface ve modul yonetimi.
   Kontroller LAB.tf.last, terraform.tfstate ve LAB.devices.r1.state() uzerinden gercek durumu dogrular. */

const MTF_DIR = '/home/burak/tf';
const MTF_PROVIDER = 'terraform {\n  required_providers {\n    lab = {\n      source  = "lab/lab"\n      version = "~> 1.0"\n    }\n  }\n}\n\nprovider "lab" {\n  address  = "r1.lab"\n  username = "admin"\n  password = "admin"\n}\n';
const MTF_PROVIDER_WS = 'terraform {\n  required_providers {\n    lab = {\n      source  = "lab/lab"\n      version = "~> 1.0"\n    }\n  }\n}\n\nprovider "lab" {\n  address  = terraform.workspace == "rtm" ? "r2.lab" : "r1.lab"\n  username = "admin"\n  password = "admin"\n}\n';
const MTF_README = '# tf\n\nAmsterdam branch router r1 icin Terraform calisma dizini.\nprovider.tf lab provider\'ini r1.lab adresine baglar.\nKaynaklar main.tf, degiskenler variables.tf, ciktilar outputs.tf.\n';
const MTF_MAIN = {
  1: 'resource "lab_vlan" "guest" {\n  vlan_id = 30\n  name    = "GUEST"\n}\n',
  3: 'resource "lab_vlan" "guest" {\n  vlan_id = 30\n  name    = var.guest_vlan_name\n}\n',
  4: 'resource "lab_vlan" "guest" {\n  vlan_id = 30\n  name    = var.guest_vlan_name\n}\n\nresource "lab_vlan" "site" {\n  for_each = var.site_vlans\n  vlan_id  = tonumber(each.key)\n  name     = each.value\n}\n',
  5: 'resource "lab_vlan" "guest" {\n  vlan_id = 30\n  name    = var.guest_vlan_name\n}\n\nresource "lab_vlan" "site" {\n  for_each = var.site_vlans\n  vlan_id  = tonumber(each.key)\n  name     = each.value\n}\n\nresource "lab_interface" "guest_ap" {\n  name        = "GigabitEthernet3"\n  description = "Guest wifi AP"\n  enabled     = true\n  vlan        = lab_vlan.guest.vlan_id\n}\n',
  7: 'resource "lab_vlan" "guest" {\n  vlan_id = 30\n  name    = var.guest_vlan_name\n}\n\nresource "lab_vlan" "site" {\n  for_each = var.site_vlans\n  vlan_id  = tonumber(each.key)\n  name     = each.value\n}\n\nresource "lab_interface" "guest_ap" {\n  name        = "GigabitEthernet3"\n  description = "Guest wifi AP"\n  enabled     = true\n  vlan        = lab_vlan.guest.vlan_id\n}\n\nmodule "extra" {\n  source = "./modules/vlans"\n  vlans = {\n    "60" = "PRINTERS"\n    "70" = "SIGNAGE"\n  }\n}\n',
  8: 'resource "lab_vlan" "guest" {\n  vlan_id = 30\n  name    = var.guest_vlan_name\n}\n\nresource "lab_vlan" "site" {\n  for_each = var.site_vlans\n  vlan_id  = tonumber(each.key)\n  name     = each.value\n}\n\nresource "lab_interface" "guest_ap" {\n  name        = "GigabitEthernet3"\n  description = "Guest wifi AP"\n  enabled     = true\n  vlan        = lab_vlan.guest.vlan_id\n}\n\nmodule "extra" {\n  source = "./modules/vlans"\n  vlans = {\n    "60" = "PRINTERS"\n    "70" = "SIGNAGE"\n  }\n}\n\nresource "lab_vlan" "mgmt" {\n  vlan_id = 99\n  name    = "MGMT"\n}\n',
  10: 'resource "lab_vlan" "guest_wifi" {\n  vlan_id = 30\n  name    = var.guest_vlan_name\n}\n\nresource "lab_vlan" "site" {\n  for_each = var.site_vlans\n  vlan_id  = tonumber(each.key)\n  name     = each.value\n}\n\nresource "lab_interface" "guest_ap" {\n  name        = "GigabitEthernet3"\n  description = "Guest wifi AP"\n  enabled     = true\n  vlan        = lab_vlan.guest_wifi.vlan_id\n}\n\nmodule "extra" {\n  source = "./modules/vlans"\n  vlans = {\n    "60" = "PRINTERS"\n    "70" = "SIGNAGE"\n  }\n}\n\nresource "lab_vlan" "mgmt" {\n  vlan_id = 99\n  name    = "MGMT"\n}\n',
  11: 'resource "lab_vlan" "guest_wifi" {\n  vlan_id = 30\n  name    = var.guest_vlan_name\n}\n\nresource "lab_vlan" "site" {\n  for_each = var.site_vlans\n  vlan_id  = tonumber(each.key)\n  name     = each.value\n}\n\nresource "lab_interface" "guest_ap" {\n  name        = "GigabitEthernet3"\n  description = "Guest wifi AP"\n  enabled     = true\n  vlan        = lab_vlan.guest_wifi.vlan_id\n}\n\nmodule "extra" {\n  source = "./modules/vlans"\n  vlans = {\n    "60" = "PRINTERS"\n    "70" = "SIGNAGE"\n  }\n}\n\nresource "lab_vlan" "mgmt" {\n  vlan_id = 99\n  name    = "MGMT"\n\n  lifecycle {\n    prevent_destroy = true\n  }\n}\n',
};
const MTF_VARS = {
  3: 'variable "guest_vlan_name" {\n  type        = string\n  description = "Guest wifi vlan adi"\n  default     = "GUEST"\n}\n',
  4: 'variable "guest_vlan_name" {\n  type        = string\n  description = "Guest wifi vlan adi"\n  default     = "GUEST"\n}\n\nvariable "site_vlans" {\n  type        = map(string)\n  description = "Vlan id ve adlari"\n  default = {\n    "40" = "IOT"\n    "50" = "CAMERA"\n  }\n}\n',
};
const MTF_OUT = {
  3: 'output "guest_vlan_id" {\n  value = lab_vlan.guest.id\n}\n',
  6: 'output "guest_vlan_id" {\n  value = lab_vlan.guest.id\n}\n\noutput "hostname" {\n  value = data.lab_device.r1.hostname\n}\n\noutput "bgp_asn" {\n  value = data.lab_device.r1.bgp_asn\n}\n',
  10: 'output "guest_vlan_id" {\n  value = lab_vlan.guest_wifi.id\n}\n\noutput "hostname" {\n  value = data.lab_device.r1.hostname\n}\n\noutput "bgp_asn" {\n  value = data.lab_device.r1.bgp_asn\n}\n',
};
const MTF_TFVARS = 'guest_vlan_name = "GUEST-WIFI"\n';
const MTF_DATA = 'data "lab_device" "r1" {}\n';
const MTF_MODULE = 'variable "vlans" {\n  type        = map(string)\n  description = "Vlan id ve adlari"\n}\n\nresource "lab_vlan" "this" {\n  for_each = var.vlans\n  vlan_id  = tonumber(each.key)\n  name     = each.value\n}\n\noutput "ids" {\n  value = [for v in lab_vlan.this : v.id]\n}\n';
function mtfEnsure(sh, rel, content) {
  const abs = MTF_DIR + '/' + rel; if (sh.node(abs)) return;
  const dir = abs.split('/').slice(0, -1).join('/'); const parts = dir.split('/').filter(Boolean); let cur = sh.root;
  for (const p of parts) { if (!cur.c[p]) cur.c[p] = mkdir({}, 0o755, 'burak'); cur = cur.c[p]; }
  sh.writeFile(abs, content, false, 'nano');
}
function mtfLatest(map, stage) { let best = null; Object.keys(map).map(Number).sort((a, b) => a - b).forEach(k => { if (k <= stage) best = map[k]; }); return best; }
function mtfStage(sh, stage) {
  mtfEnsure(sh, 'provider.tf', stage >= 12 ? MTF_PROVIDER_WS : MTF_PROVIDER); mtfEnsure(sh, 'README.md', MTF_README);
  const m = mtfLatest(MTF_MAIN, stage); if (m) mtfEnsure(sh, 'main.tf', m);
  const v = mtfLatest(MTF_VARS, stage); if (v) mtfEnsure(sh, 'variables.tf', v);
  const o = mtfLatest(MTF_OUT, stage); if (o) mtfEnsure(sh, 'outputs.tf', o);
  if (stage >= 3) mtfEnsure(sh, 'terraform.tfvars', MTF_TFVARS);
  if (stage >= 6) mtfEnsure(sh, 'data.tf', MTF_DATA);
  if (stage >= 7) mtfEnsure(sh, 'modules/vlans/main.tf', MTF_MODULE);
}
function mtfLast() { return (typeof LAB !== 'undefined' && LAB.tf && LAB.tf.last) || null; }
function mtfWorkspace(sh) { const n = sh.node(MTF_DIR + '/.terraform/environment'); return n && n.t === 'f' && n.d.trim() ? n.d.trim() : 'default'; }
function mtfState(sh, ws) { const w = ws || mtfWorkspace(sh); const p = w === 'default' ? MTF_DIR + '/terraform.tfstate' : `${MTF_DIR}/terraform.tfstate.d/${w}/terraform.tfstate`; const n = sh.node(p); if (!n || n.t !== 'f') return null; try { return JSON.parse(n.d); } catch (e) { return null; } }
function mtfInst(st, type, name, key, mod) { if (!st) return null; const r = (st.resources || []).find(x => x.mode === 'managed' && x.type === type && x.name === name && (x.module || null) === (mod || null)); if (!r) return null; return r.instances.find(i => (i.index_key === undefined ? null : i.index_key) === (key === undefined ? null : key)) || null; }
function mtfFile(sh, rel, re) { const n = sh.node(MTF_DIR + '/' + rel); return !!(n && n.t === 'f' && (!re || re.test(n.d))); }
function mtfDev(name) { return LAB.devices && LAB.devices[name] ? LAB.devices[name].state() : null; }
function mtfVlan(name, id) { const st = mtfDev(name); return st && st.vlans ? st.vlans[id] || null : null; }
function mtfPlanZero(l) { return !!(l && l.plan && l.plan.add === 0 && l.plan.change === 0 && l.plan.destroy === 0); }

CHAPTERS.push({
  id: 'terraform', icon: '🏗️', title: 'Terraform ile Infrastructure as Code', sub: 'Plan, apply, state, drift ve workspace',
  missions: [
    { id: 't1', title: 'init ve ilk vlan', xp: 25,
      story: "Ansible islemi adim adim anlatir, Terraform ise istenen son durumu. ~/tf altinda provider.tf lab provider'ini r1.lab adresine bagliyor. Kaynaklar main.tf icinde yasayacak. terraform init provider'i kurar, plan ne yapacagini anlatir, henuz cihaza dokunmaz.",
      task: "~/tf dizinine gec. nano ile main.tf yaz, `lab_vlan` tipinde guest adli bir resource olsun, vlan_id 30 ve name GUEST. `terraform init` sonra `terraform plan` calistir. Plan satirinda kac kaynak eklenecek, `submit` ile cevapla.",
      hint: '`resource "lab_vlan" "guest" { vlan_id = 30  name = "GUEST" }` yeterli. Plan ciktisinin sonunda `Plan: 1 to add` yazar, submit 1',
      solution: 'cd ~/tf\nnano main.tf\nterraform init\nterraform plan\nsubmit 1',
      editorContent: { 'main.tf': MTF_MAIN[1] },
      setup: sh => mtfStage(sh, 1),
      check: (sh, c) => { const h = (LAB.tf && LAB.tf.history) || []; return c.submit != null && String(c.submit).trim() === '1' && mtfFile(sh, 'main.tf', /resource\s+"lab_vlan"\s+"guest"/) && mtfFile(sh, '.terraform.lock.hcl') && h.some(x => x.cmd === 'plan' && x.plan && x.plan.add === 1); } },
    { id: 't2', title: 'apply ve cihazda dogrula', xp: 25,
      story: "Plan onaylandi. apply gercek degisikligi yapar, bu lab'da interaktif yes yazilamadigi icin -auto-approve gerekir. Terraform'un iddiasina guvenme, cihaza ssh ile bak.",
      task: "`terraform apply -auto-approve` ile vlan'i olustur. Sonra `ssh admin@r1.lab \"show vlan brief\"` ile vlan 30 GUEST'in cihazda oldugunu gor.",
      hint: 'apply ciktisinda Creation complete ve Apply complete satirlari olmali. state terraform.tfstate dosyasina yazilir',
      solution: 'cd ~/tf\nterraform apply -auto-approve\nssh admin@r1.lab "show vlan brief"',
      setup: sh => mtfStage(sh, 2),
      check: (sh, c) => { const v = mtfVlan('r1', 30); const inst = mtfInst(mtfState(sh), 'lab_vlan', 'guest'); return /^ssh\b/.test(c.line) && /30\s+GUEST/.test(c.out) && !!(v && v.name === 'GUEST') && !!(inst && inst.attributes && String(inst.attributes.vlan_id) === '30'); } },
    { id: 't3', title: 'Variable, tfvars ve output', xp: 35,
      story: "Vlan adini koda gommek yerine degisken yap. variables.tf tanimi, terraform.tfvars degeri tasir ve otomatik yuklenir. output ise apply sonunda isine yarayacak degeri gosterir, vlan id gibi.",
      task: "variables.tf icinde guest_vlan_name adli string bir variable tanimla, default GUEST. main.tf icinde name satiri `var.guest_vlan_name` olsun. terraform.tfvars icine `guest_vlan_name = \"GUEST-WIFI\"` yaz. outputs.tf icinde guest_vlan_id adli output `lab_vlan.guest.id` versin. `terraform apply -auto-approve` ile update in-place gor, sonra `terraform output` calistir.",
      hint: 'Plan ~ update in-place gosterir cunku vlan_id ayni, sadece name degisiyor. output komutu state icindeki ciktilari basar',
      solution: 'cd ~/tf\nnano variables.tf\nnano main.tf\nnano terraform.tfvars\nnano outputs.tf\nterraform apply -auto-approve\nterraform output',
      editorContent: { 'variables.tf': MTF_VARS[3], 'main.tf': MTF_MAIN[3], 'terraform.tfvars': MTF_TFVARS, 'outputs.tf': MTF_OUT[3] },
      setup: sh => mtfStage(sh, 3),
      check: (sh, c) => { const l = mtfLast(); const st = mtfState(sh); const v = mtfVlan('r1', 30); return !!(l && l.cmd === 'output' && st && st.outputs && st.outputs.guest_vlan_id && String(st.outputs.guest_vlan_id.value) === '30' && v && v.name === 'GUEST-WIFI' && mtfFile(sh, 'variables.tf', /variable\s+"guest_vlan_name"/) && mtfFile(sh, 'terraform.tfvars', /guest_vlan_name\s*=\s*"GUEST-WIFI"/) && mtfFile(sh, 'main.tf', /var\.guest_vlan_name/)); } },
    { id: 't4', title: 'for_each ile vlan haritasi', xp: 35,
      story: "IoT ve kamera ekipleri de vlan istiyor. Her vlan icin resource kopyalamak yerine bir map ve for_each. Her instance kendi key'i ile adreslenir, ornek lab_vlan.site[\"40\"].",
      task: "variables.tf icine site_vlans adli `map(string)` tipinde bir variable ekle, default olarak 40 IOT ve 50 CAMERA. main.tf icine `lab_vlan` site resource'u ekle, `for_each = var.site_vlans`, vlan_id `tonumber(each.key)`, name `each.value`. apply et.",
      hint: 'Map key\'leri string oldugu icin tonumber gerekir. Plan iki ayri instance gosterir, lab_vlan.site["40"] ve lab_vlan.site["50"]',
      solution: 'cd ~/tf\nnano variables.tf\nnano main.tf\nterraform apply -auto-approve',
      editorContent: { 'variables.tf': MTF_VARS[4], 'main.tf': MTF_MAIN[4] },
      setup: sh => mtfStage(sh, 4),
      check: (sh, c) => { const st = mtfState(sh); const a = mtfInst(st, 'lab_vlan', 'site', '40'), b = mtfInst(st, 'lab_vlan', 'site', '50'); const v40 = mtfVlan('r1', 40), v50 = mtfVlan('r1', 50); return !!(a && b && v40 && v40.name === 'IOT' && v50 && v50.name === 'CAMERA' && mtfFile(sh, 'main.tf', /for_each\s*=\s*var\.site_vlans/)); } },
    { id: 't5', title: 'Interface ve bagimlilik', xp: 35,
      story: "Guest wifi access point'i GigabitEthernet3 portuna takili, port kapali ve vlan'i yok. lab_interface resource'u ile portu ac, description ver ve guest vlan'ina ata. vlan degerini lab_vlan.guest.vlan_id referansi ile ver, Terraform bagimliligi kendisi cikarir ve siralamayi dogru yapar.",
      task: "main.tf icine guest_ap adli `lab_interface` ekle. name GigabitEthernet3, description `Guest wifi AP`, enabled true, vlan `lab_vlan.guest.vlan_id`. apply et ve `ssh admin@r1.lab \"show ip interface brief\"` ile portun up oldugunu gor.",
      hint: 'Referans kullandigin icin depends_on yazmana gerek yok. apply ciktisinda once vlan sonra interface gelir',
      solution: 'cd ~/tf\nnano main.tf\nterraform apply -auto-approve\nssh admin@r1.lab "show ip interface brief"',
      editorContent: { 'main.tf': MTF_MAIN[5] },
      setup: sh => mtfStage(sh, 5),
      check: (sh, c) => { const st = mtfState(sh); const inst = mtfInst(st, 'lab_interface', 'guest_ap'); const d = mtfDev('r1'); const gi3 = d && d.interfaces && d.interfaces.GigabitEthernet3; return !!(inst && gi3 && gi3.enabled && gi3.vlan === 30 && gi3.description === 'Guest wifi AP' && mtfFile(sh, 'main.tf', /lab_vlan\.guest\.vlan_id/) && (inst.dependencies || []).some(x => /lab_vlan\.guest/.test(x))); } },
    { id: 't6', title: 'Data source', xp: 30,
      story: "Bazi bilgiler cihazdan okunur, yazilmaz. data lab_device cihazin hostname, version, BGP AS ve interface listesini verir. Bunlari output ile gosterebilir ya da baska resource'larda kullanabilirsin.",
      task: "data.tf dosyasina `data \"lab_device\" \"r1\" {}` yaz. outputs.tf icine hostname ve bgp_asn adli iki output ekle, degerleri `data.lab_device.r1.hostname` ve `data.lab_device.r1.bgp_asn`. apply et, `terraform output hostname` ile R1 gor.",
      hint: 'Data source plan sirasinda okunur, apply yalnizca output degisikligi kaydeder',
      solution: 'cd ~/tf\nnano data.tf\nnano outputs.tf\nterraform apply -auto-approve\nterraform output hostname',
      editorContent: { 'data.tf': MTF_DATA, 'outputs.tf': MTF_OUT[6] },
      setup: sh => mtfStage(sh, 6),
      check: (sh, c) => { const st = mtfState(sh); const l = mtfLast(); return !!(st && st.outputs && st.outputs.hostname && st.outputs.hostname.value === 'R1' && st.outputs.bgp_asn && Number(st.outputs.bgp_asn.value) === 65001 && mtfFile(sh, 'data.tf', /data\s+"lab_device"/) && l && l.cmd === 'output' && /R1/.test(c.out)); } },
    { id: 't7', title: 'Module', xp: 40,
      story: "Vlan isi her site'ta tekrar edecek. Bir module, degisken alir, resource yaratir, output verir. Yerel bir dizin yeterli, modules/vlans. Yeni module eklendiginde terraform init tekrar gerekir.",
      task: "modules/vlans/main.tf yaz, vlans adli `map(string)` variable alsin, for_each ile lab_vlan this yaratsin ve ids adli output versin. main.tf icine extra adli module blogu ekle, source `./modules/vlans`, vlans 60 PRINTERS ve 70 SIGNAGE. `terraform init` sonra apply.",
      hint: 'Module icindeki adresler module.extra.lab_vlan.this["60"] bicimindedir. init ciktisinda Initializing modules satirini gor',
      solution: 'cd ~/tf\nnano modules/vlans/main.tf\nnano main.tf\nterraform init\nterraform apply -auto-approve',
      editorContent: { 'modules/vlans/main.tf': MTF_MODULE, 'main.tf': MTF_MAIN[7] },
      setup: sh => mtfStage(sh, 7),
      check: (sh, c) => { const st = mtfState(sh); const a = mtfInst(st, 'lab_vlan', 'this', '60', 'module.extra'); const v60 = mtfVlan('r1', 60), v70 = mtfVlan('r1', 70); return !!(a && v60 && v60.name === 'PRINTERS' && v70 && v70.name === 'SIGNAGE' && mtfFile(sh, 'modules/vlans/main.tf', /for_each/) && mtfFile(sh, 'main.tf', /module\s+"extra"/)); } },
    { id: 't8', title: 'Mevcut vlan\'i import et', xp: 35,
      story: "Vlan 99 MGMT cihazda yillardir var, Terraform'dan once elle girilmis. Yeniden yaratmak yerine state'e al. Once resource blogunu yaz, sonra terraform import adres ve id ile eslestir. Sonraki plan No changes demeli.",
      task: "main.tf icine mgmt adli `lab_vlan` ekle, vlan_id 99 name MGMT. `terraform import lab_vlan.mgmt 99` calistir, sonra `terraform plan` ile hic degisiklik olmadigini dogrula.",
      hint: 'Import yalnizca state\'e yazar, cihaza dokunmaz. Plan 0 to add 0 to change 0 to destroy olmali',
      solution: 'cd ~/tf\nnano main.tf\nterraform import lab_vlan.mgmt 99\nterraform plan',
      editorContent: { 'main.tf': MTF_MAIN[8] },
      setup: sh => mtfStage(sh, 8),
      check: (sh, c) => { const st = mtfState(sh); const inst = mtfInst(st, 'lab_vlan', 'mgmt'); const l = mtfLast(); const h = (LAB.tf && LAB.tf.history) || []; return !!(inst && String(inst.attributes.vlan_id) === '99' && h.some(x => x.cmd === 'import' && x.addr === 'lab_vlan.mgmt' && x.ok) && l && l.cmd === 'plan' && mtfPlanZero(l)); } },
    { id: 't9', title: 'Drift tespiti', xp: 40,
      story: "Birisi gece ssh ile girip guest vlan'inin adini degistirmis. Terraform plan once cihazi okur, state ile karsilastirir ve Objects have changed outside of Terraform notu basar. Sonra konfigurasyona donmek icin update planlar.",
      task: "`terraform plan` calistir, drift notunu ve update in-place satirini oku. Sonra `terraform apply -auto-approve` ile vlan adini koddaki haline dondur.",
      hint: "Plan ciktisinda once `Note: Objects have changed outside of Terraform`, sonra `~ name` satiri gelir. apply sonrasi ssh ile bak",
      solution: 'cd ~/tf\nterraform plan\nterraform apply -auto-approve',
      setup: sh => { mtfStage(sh, 9); if (LAB.devices && LAB.devices.r1) LAB.devices.r1.configure(['vlan 30', 'name HACKED']); },
      check: (sh, c) => { const l = mtfLast(); const h = (LAB.tf && LAB.tf.history) || []; const v = mtfVlan('r1', 30); const st = mtfState(sh); const inst = mtfInst(st, 'lab_vlan', 'guest') || mtfInst(st, 'lab_vlan', 'guest_wifi'); return !!(l && l.cmd === 'apply' && l.ok && v && v.name !== 'HACKED' && inst && inst.attributes.name === v.name && h.some(x => x.cmd === 'plan' && x.drift && x.drift.length)); } },
    { id: 't10', title: 'State komutlari', xp: 35,
      story: "guest adi artik anlamsiz, guest_wifi olsun. Koddaki adi degistirip apply dersen Terraform eskisini silip yenisini yaratir, cihazda kesinti. terraform state mv yalnizca state'teki adresi tasir, cihaza dokunmaz.",
      task: "`terraform state list` ve `terraform state show lab_vlan.guest` ile bak. main.tf ve outputs.tf icinde lab_vlan.guest adini guest_wifi yap. `terraform state mv lab_vlan.guest lab_vlan.guest_wifi` calistir, sonra `terraform plan` ile No changes gor.",
      hint: 'Interface resource\'u da lab_vlan.guest.vlan_id referansi kullaniyor, orayi da guest_wifi yap',
      solution: 'cd ~/tf\nterraform state list\nterraform state show lab_vlan.guest\nnano main.tf\nnano outputs.tf\nterraform state mv lab_vlan.guest lab_vlan.guest_wifi\nterraform plan',
      editorContent: { 'main.tf': MTF_MAIN[10], 'outputs.tf': MTF_OUT[10] },
      setup: sh => mtfStage(sh, 10),
      check: (sh, c) => { const st = mtfState(sh); const l = mtfLast(); const h = (LAB.tf && LAB.tf.history) || []; return !!(mtfInst(st, 'lab_vlan', 'guest_wifi') && !mtfInst(st, 'lab_vlan', 'guest') && mtfFile(sh, 'main.tf', /"lab_vlan"\s+"guest_wifi"/) && h.some(x => x.cmd === 'state' && x.sub === 'mv' && x.ok) && l && l.cmd === 'plan' && mtfPlanZero(l)); } },
    { id: 't11', title: 'prevent_destroy', xp: 35,
      story: "Yonetim vlan'i silinirse branch'e erisim gider. lifecycle prevent_destroy bu resource'u korur, destroy plani icerse Terraform hata verir ve hicbir seye dokunmaz.",
      task: "main.tf icinde mgmt vlan'ina `lifecycle { prevent_destroy = true }` ekle. Sonra `terraform destroy -auto-approve` calistir ve Instance cannot be destroyed hatasini gor. Cihazda vlan 99 durmali.",
      hint: 'Hata tum destroy islemini durdurur, diger vlanlar da silinmez. Gercekten silmek gerekirse lifecycle kaldirilir ya da -target kullanilir',
      solution: 'cd ~/tf\nnano main.tf\nterraform destroy -auto-approve',
      editorContent: { 'main.tf': MTF_MAIN[11] },
      setup: sh => mtfStage(sh, 11),
      check: (sh, c) => { const l = mtfLast(); const v = mtfVlan('r1', 99); return !!(l && l.cmd === 'destroy' && !l.ok && /cannot be destroyed/.test(l.error || '') && v && mtfVlan('r1', 30) && mtfFile(sh, 'main.tf', /prevent_destroy\s*=\s*true/)); } },
    { id: 't12', title: 'Site basina workspace', xp: 50,
      story: "Rotterdam branch'i de ayni tasarimi istiyor, r2 uzerinde. Kodu kopyalamak yerine workspace ac, her workspace kendi state'ini tutar. provider adresi terraform.workspace degerine gore secilsin.",
      task: "provider.tf icinde address satirini `terraform.workspace == \"rtm\" ? \"r2.lab\" : \"r1.lab\"` yap. `terraform workspace new rtm` ile yeni workspace ac, `terraform apply -auto-approve` ile ayni vlan'lari r2 uzerinde yarat. `ssh admin@r2.lab \"show vlan brief\"` ile dogrula.",
      hint: 'Yeni workspace bos state ile baslar, plan her seyi + create gosterir. terraform workspace list ile yildizli olan aktiftir',
      solution: 'cd ~/tf\nnano provider.tf\nterraform workspace new rtm\nterraform apply -auto-approve\nssh admin@r2.lab "show vlan brief"',
      editorContent: { 'provider.tf': MTF_PROVIDER_WS },
      setup: sh => mtfStage(sh, 12),
      check: (sh, c) => { const st = mtfState(sh, 'rtm'); const v = mtfVlan('r2', 30); const inst = st && ((st.resources || []).some(r => r.type === 'lab_vlan' && r.instances.length)); return !!(mtfWorkspace(sh) === 'rtm' && inst && v && mtfVlan('r1', 30) && mtfFile(sh, 'provider.tf', /terraform\.workspace/) && /^ssh\b/.test(c.line) && /30\s+/.test(c.out)); } },
  ],
});

QUIZ.push(
  { q: 'terraform plan ne yapar?', a: ['State ve cihazi okur, konfigurasyonla karsilastirir, yapilacak degisiklikleri listeler, cihaza dokunmaz', 'Degisiklikleri hemen uygular', 'State dosyasini siler', 'Provider indirir'], c: 0 },
  { q: 'Plan ciktisinda -/+ isareti ne demektir?', a: ['Kaynak silinip yeniden yaratilacak, replace', 'Kaynak yerinde guncellenecek', 'Kaynak yalnizca okunacak', 'Kaynak import edilecek'], c: 0 },
  { q: 'terraform.tfstate dosyasinin rolu nedir?', a: ['Terraform\'un yonettigi kaynaklarin son bilinen halini tutar, plan bununla karsilastirir', 'Degisken degerlerini tutar', 'Provider kodunu icerir', 'Log dosyasidir'], c: 0 },
  { q: 'for_each ile count arasindaki temel fark?', a: ['for_each map ya da set key ile adresler, count sira numarasi ile. Ortadan eleman silince count kaydirir', 'count daha hizlidir', 'for_each yalnizca module icin kullanilir', 'Fark yoktur'], c: 0 },
  { q: 'Drift nedir?', a: ['Cihazin gercek durumunun state\'ten sapmasi, ornek elle yapilan degisiklik', 'Provider surum farki', 'Iki workspace arasindaki fark', 'Plan dosyasinin eskimesi'], c: 0 },
  { q: 'terraform import ne yapar?', a: ['Cihazda zaten var olan kaynagi state\'e alir, cihaza dokunmaz', 'Baska bir repo\'dan kod indirir', 'Provider kurar', 'Kaynagi cihazda yaratir'], c: 0 },
  { q: 'terraform state mv ne icin kullanilir?', a: ['Kaynagin state adresini degistirmek icin, cihazda silip yaratma olmaz', 'State dosyasini baska dizine kopyalamak icin', 'Kaynagi baska cihaza tasimak icin', 'Workspace degistirmek icin'], c: 0 },
  { q: 'lifecycle prevent_destroy ne saglar?', a: ['Kaynagi silecek her plan hata ile durur', 'Kaynak yalnizca bir kez yaratilir', 'Kaynak her apply\'da yeniden yaratilir', 'Kaynak import edilemez'], c: 0 },
  { q: 'terraform.tfvars dosyasi nasil yuklenir?', a: ['Otomatik, komut satirinda belirtmek gerekmez', 'Yalnizca -var-file ile', 'Yalnizca TF_VAR_ ile', 'init sirasinda'], c: 0 },
  { q: 'Workspace ne saglar?', a: ['Ayni kod icin ayri state dosyalari, ornek site basina bir workspace', 'Ayni state icin ayri kod', 'Paralel apply', 'Provider izolasyonu'], c: 0 },
);

BADGES.push({ id: 'terraform', icon: '🏗️', title: 'State Ustasi', desc: 'Terraform bolumunu bitir', test: s => CHAPTERS.find(c => c.id === 'terraform').missions.every(m => s.done.includes(m.id)) });
