'use strict';
/* Ansible bolumu. 12 gorev, Amsterdam branch router'lari r1 ve r2 uzerinde network automation.
   Kontroller LAB.ansible.last, dosyalar ve LAB.devices.r1.state() uzerinden gercek durumu dogrular. */

const MAN_DIR = '/home/burak/ansible';
const MAN_FILES = {
  'ansible.cfg': '[defaults]\ninventory = inventory.ini\nhost_key_checking = False\nretry_files_enabled = False\n\n[persistent_connection]\ncommand_timeout = 30\n',
  'inventory.ini': '[ios]\nr1 ansible_host=10.0.0.1\nr2 ansible_host=10.0.0.2\n\n[branch:children]\nios\n',
  'group_vars/ios.yml': 'ansible_connection: ansible.netcommon.network_cli\nansible_network_os: cisco.ios.ios\nansible_user: admin\nansible_password: admin\n',
  'group_vars/all.yml': 'site_code: AMS\nntp_server: 10.0.50.10\nvlans:\n  - { id: 10, name: USERS }\n  - { id: 20, name: VOICE }\n  - { id: 30, name: GUEST }\n  - { id: 40, name: IOT }\n',
  'host_vars/r1.yml': 'interfaces:\n  GigabitEthernet2: { description: "Uplink to hub r2", enabled: true }\n  GigabitEthernet3: { description: "Guest wifi AP", enabled: false }\n',
  'host_vars/r2.yml': 'interfaces:\n  GigabitEthernet2: { description: "Downlink to branch r1", enabled: true }\n',
};
function manEnsure(sh, rel, content) {
  const abs = MAN_DIR + '/' + rel; if (sh.node(abs)) return;
  const dir = abs.split('/').slice(0, -1).join('/'); const parts = dir.split('/').filter(Boolean); let cur = sh.root;
  for (const p of parts) { if (!cur.c[p]) cur.c[p] = mkdir({}, 0o755, 'burak'); cur = cur.c[p]; }
  sh.writeFile(abs, content, false, 'nano');
}
function manBase(sh) { Object.entries(MAN_FILES).forEach(([rel, c]) => manEnsure(sh, rel, c)); }
function manLast() { return (typeof LAB !== 'undefined' && LAB.ansible && LAB.ansible.last) || null; }
function manRecapOk(last, host) { const r = last && last.recap && last.recap[host]; return !!(r && r.failed === 0 && r.unreachable === 0 && r.ok > 0); }
function manPlaybookIs(last, name) { return !!(last && last.cmd === 'ansible-playbook' && last.playbook && last.playbook.endsWith('/' + name)); }
function manTask(last, pred) { return !!(last && last.tasks && last.tasks.some(pred)); }
function manFile(sh, rel, re) { const n = sh.node(MAN_DIR + '/' + rel); return !!(n && n.t === 'f' && (!re || re.test(n.d))); }
const MAN_VAULT_IOS = MAN_FILES['group_vars/ios.yml'].split('\n').filter(l => !/^ansible_password/.test(l)).join('\n').replace(/\n*$/, '\n') + 'ansible_password: !vault |\n' + (typeof simanVaultEncrypt === 'function' ? simanVaultEncrypt('admin', 'Lab123') : '').split('\n').filter(Boolean).map(l => '          ' + l).join('\n') + '\n';
function manDev(name) { return LAB.devices && LAB.devices[name] ? LAB.devices[name].state() : null; }

CHAPTERS.push({
  id: 'ansible', icon: '🅰️', title: 'Ansible ile Network Automation', sub: 'Inventory, playbook, idempotency, vault ve audit',
  missions: [
    { id: 'a1', title: 'Inventory ve ping', xp: 20,
      story: "Amsterdam branch'inde iki router var, r1 branch router ve r2 hub tarafi. Elle ssh ile dolasmak yerine Ansible ile konusacaksin. Her sey inventory ile baslar, ~/ansible altinda ansible.cfg, inventory.ini ve group_vars hazir.",
      task: "~/ansible dizinine gec. `ansible-inventory --graph` ile grup agacini gor, sonra `ansible all -m ping` ile iki router'a da ulas.",
      hint: 'cd ~/ansible && ansible-inventory --graph && ansible all -m ping. ansible.cfg inventory dosyasini zaten gosteriyor, -i gerekmez',
      solution: 'cd ~/ansible\nansible-inventory --graph\nansible all -m ping',
      setup: sh => manBase(sh),
      check: (sh, c) => { const l = manLast(); return !!(l && l.cmd === 'ansible' && l.module === 'ping' && l.results && l.results.r1 && l.results.r1.ping === 'pong' && l.results.r2 && l.results.r2.ping === 'pong'); } },
    { id: 'a2', title: 'Ad hoc ios_command', xp: 20,
      story: "Playbook yazmadan once hizli bir soru sormak istiyorsun. Ad hoc komut tam bunun icin var, tek modul, tek satir. cisco.ios.ios_command modulu show komutlarini network_cli uzerinden kosar.",
      task: "ios grubuna ad hoc `cisco.ios.ios_command` ile `show ip interface brief` gonder, ciktida her iki router'in interface listesini gor.",
      hint: 'ansible ios -m cisco.ios.ios_command -a "commands=\'show ip interface brief\'"',
      solution: 'cd ~/ansible\nansible ios -m cisco.ios.ios_command -a "commands=\'show ip interface brief\'"',
      setup: sh => manBase(sh),
      check: (sh, c) => { const l = manLast(); return !!(l && l.cmd === 'ansible' && l.module === 'ios_command' && l.results && l.results.r1 && Array.isArray(l.results.r1.stdout) && /GigabitEthernet1/.test(l.results.r1.stdout[0] || '') && l.results.r2 && !l.results.r2.failed); } },
    { id: 'a3', title: 'Ilk playbook, facts ve debug', xp: 30,
      story: "Simdi tekrar kullanilabilir bir sey yaz. cisco.ios.ios_facts cihazdan hostname, version ve interface bilgisini toplar, ansible_net_ ile baslayan degiskenlere koyar. debug ile gormek ilk adim.",
      task: "nano ile ~/ansible/facts.yml yaz. ios grubunda gather_facts kapali olsun, bir task ios_facts calistirsin, ikinci task debug ile `{{ ansible_net_hostname }}` ve `{{ ansible_net_version }}` yazdirsin. Sonra `ansible-playbook facts.yml` ile kos.",
      hint: "tasks altinda once cisco.ios.ios_facts, sonra ansible.builtin.debug ile msg. Degiskenler facts task'indan sonra gelir",
      solution: 'cd ~/ansible\nnano facts.yml\nansible-playbook facts.yml',
      editorContent: { 'facts.yml': '---\n- name: Gather facts from branch routers\n  hosts: ios\n  gather_facts: false\n  tasks:\n    - name: Collect IOS facts\n      cisco.ios.ios_facts:\n\n    - name: Show hostname and version\n      ansible.builtin.debug:\n        msg: "{{ ansible_net_hostname }} runs IOS-XE {{ ansible_net_version }}"\n' },
      setup: sh => manBase(sh),
      check: (sh, c) => { const l = manLast(); return manPlaybookIs(l, 'facts.yml') && manRecapOk(l, 'r1') && manRecapOk(l, 'r2') && manTask(l, t => t.module === 'ios_facts' && t.status === 'ok') && manTask(l, t => t.module === 'debug' && t.host === 'r1' && /R1/.test(JSON.stringify(t.result)) && /17\.09/.test(JSON.stringify(t.result))); } },
    { id: 'a4', title: 'Degiskenler ve Jinja template', xp: 35,
      story: "Interface description'lari her branch'te ayni kurala uymali. group_vars/all.yml site kodunu, host_vars/r1.yml ve host_vars/r2.yml her router'in interface listesini tutuyor. Jinja2 template bu veriden config uretir, loop ve if ile.",
      task: "nano ile ~/ansible/templates/interfaces.j2 yaz. interfaces sozlugu uzerinde for ile donsun, her interface icin `interface AD`, `description SITE_CODE AD description` ve enabled degilse `shutdown` satiri ciksin. Sonra render.yml ile template modulunu delegate_to localhost olarak kos, cikti build/r1.cfg ve build/r2.cfg olsun.",
      hint: "`{% for name, i in interfaces.items() %}` ile basla, `{% endfor %}` ile bitir. template modulunde src interfaces.j2, dest `build/{{ inventory_hostname }}.cfg`, delegate_to localhost. build dizinini file modulu ile olustur",
      solution: 'cd ~/ansible\nnano templates/interfaces.j2\nnano render.yml\nansible-playbook render.yml',
      editorContent: {
        'templates/interfaces.j2': '! {{ ansible_managed }} for {{ inventory_hostname | upper }} site {{ site_code }}\n{% for name, i in interfaces.items() %}\ninterface {{ name }}\n description {{ site_code }} {{ i.description }}\n{% if i.enabled %}\n no shutdown\n{% else %}\n shutdown\n{% endif %}\n!\n{% endfor %}\n',
        'render.yml': '---\n- name: Render interface configs\n  hosts: ios\n  gather_facts: false\n  tasks:\n    - name: Create build directory\n      ansible.builtin.file:\n        path: build\n        state: directory\n        mode: "0755"\n      delegate_to: localhost\n      run_once: true\n\n    - name: Render interface template\n      ansible.builtin.template:\n        src: interfaces.j2\n        dest: "build/{{ inventory_hostname }}.cfg"\n        mode: "0644"\n      delegate_to: localhost\n',
      },
      setup: sh => manBase(sh),
      check: (sh, c) => { const l = manLast(); return manFile(sh, 'templates/interfaces.j2', /\{%\s*for\b/) && manFile(sh, 'build/r1.cfg', /interface GigabitEthernet2\n description AMS Uplink to hub r2/) && manFile(sh, 'build/r1.cfg', /GigabitEthernet3[\s\S]*shutdown/) && manFile(sh, 'build/r2.cfg', /Downlink to branch r1/) && manTask(l, t => t.module === 'template' && t.status !== 'failed'); } },
    { id: 'a5', title: 'ios_config ve idempotency', xp: 35,
      story: "Guest wifi icin vlan 30 lazim. cisco.ios.ios_config satirlari running-config ile karsilastirir, yalnizca eksik olani gonderir. Ikinci calistirmada changed=0 gormek, otomasyonun guvenli oldugunun kaniti.",
      task: "nano ile ~/ansible/vlans.yml yaz, ios_config ile parents `vlan 30` altina `name GUEST` satirini koysun. Playbook'u iki kez calistir. Ilkinde changed=1, ikincisinde changed=0 gormelisin.",
      hint: 'cisco.ios.ios_config altinda lines listesi ve parents. Ayni komutu ikinci kez kosunca RECAP changed=0 olmali',
      solution: 'cd ~/ansible\nnano vlans.yml\nansible-playbook vlans.yml\nansible-playbook vlans.yml',
      editorContent: { 'vlans.yml': '---\n- name: Guest vlan on branch routers\n  hosts: ios\n  gather_facts: false\n  tasks:\n    - name: Ensure vlan 30 GUEST exists\n      cisco.ios.ios_config:\n        lines:\n          - name GUEST\n        parents: vlan 30\n' },
      setup: sh => manBase(sh),
      check: (sh, c) => { const l = manLast(); const st = manDev('r1'); const hist = (LAB.ansible && LAB.ansible.history) || []; const prev = hist.slice(0, -1).reverse().find(h => manPlaybookIs(h, 'vlans.yml')); return manPlaybookIs(l, 'vlans.yml') && !!(st && st.vlans && st.vlans[30] && st.vlans[30].name === 'GUEST') && manRecapOk(l, 'r1') && l.recap.r1.changed === 0 && !!(prev && prev.recap && prev.recap.r1 && prev.recap.r1.changed > 0); } },
    { id: 'a6', title: 'when ve loop', xp: 35,
      story: "Vlan listesi group_vars/all.yml icinde. Her vlan icin ayri task yazmak yerine loop ile don. VOICE vlan'i telefon ekibi yonetiyor, ona dokunma, when ile atla.",
      task: "~/ansible/vlans.yml dosyasini guncelle. ios_config task'i `loop: \"{{ vlans }}\"` ile donsun, parents `vlan {{ item.id }}`, lines `name {{ item.name }}`. `when: item.name != 'VOICE'` ile VOICE atlansin. Calistir ve r1 uzerinde vlan 40 IOT olustugunu gor.",
      hint: "loop ile item.id ve item.name kullan. when satirinda jinja suslu parantez olmaz, duz ifade yaz",
      solution: 'cd ~/ansible\nnano vlans.yml\nansible-playbook vlans.yml',
      editorContent: { 'vlans.yml': '---\n- name: Branch vlans from group_vars\n  hosts: ios\n  gather_facts: false\n  tasks:\n    - name: Ensure data vlans exist\n      cisco.ios.ios_config:\n        lines:\n          - "name {{ item.name }}"\n        parents: "vlan {{ item.id }}"\n      loop: "{{ vlans }}"\n      when: item.name != \'VOICE\'\n' },
      setup: sh => manBase(sh),
      check: (sh, c) => { const l = manLast(); const st = manDev('r1'); return manPlaybookIs(l, 'vlans.yml') && manRecapOk(l, 'r1') && !!(st && st.vlans[40] && st.vlans[40].name === 'IOT' && st.vlans[30] && st.vlans[30].name === 'GUEST') && manTask(l, t => t.module === 'ios_config' && t.item !== null && t.status === 'skipped' && /VOICE/.test(t.item)) && manTask(l, t => t.module === 'ios_config' && t.item !== null && /IOT/.test(t.item) && t.status !== 'failed'); } },
    { id: 'a7', title: 'register ve assert ile compliance', xp: 40,
      story: "Guvenlik ekibi her router'da ntp server 10.0.0.53 tanimli mi ve IOS-XE 17.9 ya da ustu mu diye soruyor. Cevabi elle degil, playbook ile kanitla. register sonucu saklar, assert kurali dogrular.",
      task: "nano ile ~/ansible/compliance.yml yaz. ios_facts calissin, ios_command ile `show running-config | include ntp` register edilsin, assert ile `'ntp server 10.0.0.53' in ntp_out.stdout[0]` ve `ansible_net_version is version('17.9', '>=')` kontrol edilsin. Calistir, All assertions passed gor.",
      hint: "`register: ntp_out` sonra assert that listesi. Iki kosul da string olarak tirnak icinde yazilir",
      solution: 'cd ~/ansible\nnano compliance.yml\nansible-playbook compliance.yml',
      editorContent: { 'compliance.yml': '---\n- name: Branch compliance check\n  hosts: ios\n  gather_facts: false\n  tasks:\n    - name: Collect facts\n      cisco.ios.ios_facts:\n\n    - name: Read ntp lines\n      cisco.ios.ios_command:\n        commands:\n          - show running-config | include ntp\n      register: ntp_out\n\n    - name: Verify ntp and version\n      ansible.builtin.assert:\n        that:\n          - "\'ntp server 10.0.0.53\' in ntp_out.stdout[0]"\n          - "ansible_net_version is version(\'17.9\', \'>=\')"\n        fail_msg: "{{ inventory_hostname }} is not compliant"\n        success_msg: "{{ inventory_hostname }} is compliant"\n' },
      setup: sh => manBase(sh),
      check: (sh, c) => { const l = manLast(); return manPlaybookIs(l, 'compliance.yml') && manRecapOk(l, 'r1') && manRecapOk(l, 'r2') && manTask(l, t => t.module === 'ios_command' && t.status === 'ok') && manTask(l, t => t.module === 'assert' && t.host === 'r1' && t.status === 'ok') && manFile(sh, 'compliance.yml', /register:/) && manFile(sh, 'compliance.yml', /assert/); } },
    { id: 'a8', title: 'Handler ile kaydet', xp: 35,
      story: "Config degisti ama startup-config'e yazilmadi, router reboot olursa gider. Her task'tan sonra write memory yapmak israf. Handler yalnizca bir sey degistiginde, play sonunda bir kez calisir.",
      task: "nano ile ~/ansible/ntp.yml yaz. ios_config ile `ntp server {{ ntp_server }}` satirini eklesin ve `notify: Save config` desin. handlers altinda Save config adli handler ios_config `save_when: always` ile calissin. Playbook'u kos, RUNNING HANDLER satirini gor.",
      hint: 'tasks altinda notify, play seviyesinde handlers listesi. Handler adi notify ile birebir ayni olmali',
      solution: 'cd ~/ansible\nnano ntp.yml\nansible-playbook ntp.yml',
      editorContent: { 'ntp.yml': '---\n- name: Branch ntp with handler\n  hosts: ios\n  gather_facts: false\n  tasks:\n    - name: Ensure site ntp server\n      cisco.ios.ios_config:\n        lines:\n          - "ntp server {{ ntp_server }}"\n      notify: Save config\n\n  handlers:\n    - name: Save config\n      cisco.ios.ios_config:\n        save_when: always\n' },
      setup: sh => manBase(sh),
      check: (sh, c) => { const l = manLast(); const st = manDev('r1'); const ntp = st ? (st.ntp || []).map(x => (typeof x === 'string' ? x : x.ip)) : []; return manPlaybookIs(l, 'ntp.yml') && manRecapOk(l, 'r1') && ntp.includes('10.0.50.10') && manTask(l, t => t.handler && t.module === 'ios_config' && t.host === 'r1' && t.status === 'changed'); } },
    { id: 'a9', title: 'Role ile refactor', xp: 40,
      story: "Playbook'lar buyuyor, ntp ve vlan isleri her site'ta tekrar edecek. Role, task, handler, default ve template'i bir pakette toplar. ansible-galaxy init iskeleti kurar, sen icini doldurursun.",
      task: "`ansible-galaxy init roles/ios_base` ile iskelet kur. roles/ios_base/defaults/main.yml icine `base_ntp: 10.0.50.10` yaz, roles/ios_base/tasks/main.yml icine ntp server ekleyen bir ios_config task'i koy ve Save config handler'ini roles/ios_base/handlers/main.yml icine tasi. site.yml ios grubunda `roles: [ios_base]` ile role'u cagirsin. Calistir.",
      hint: 'Role icindeki task adlari ciktida role adi ile birlikte `ios_base : Task adi` olarak gorunur. defaults/main.yml degiskeni task icinde `{{ base_ntp }}` ile kullan',
      solution: 'cd ~/ansible\nansible-galaxy init roles/ios_base\nnano roles/ios_base/defaults/main.yml\nnano roles/ios_base/tasks/main.yml\nnano roles/ios_base/handlers/main.yml\nnano site.yml\nansible-playbook site.yml',
      editorContent: {
        'roles/ios_base/defaults/main.yml': '---\n# defaults file for ios_base\nbase_ntp: 10.0.50.10\n',
        'roles/ios_base/tasks/main.yml': '---\n# tasks file for ios_base\n- name: Ensure base ntp server\n  cisco.ios.ios_config:\n    lines:\n      - "ntp server {{ base_ntp }}"\n  notify: Save config\n',
        'roles/ios_base/handlers/main.yml': '---\n# handlers file for ios_base\n- name: Save config\n  cisco.ios.ios_config:\n    save_when: always\n',
        'site.yml': '---\n- name: Branch baseline with roles\n  hosts: ios\n  gather_facts: false\n  roles:\n    - ios_base\n',
      },
      setup: sh => manBase(sh),
      check: (sh, c) => { const l = manLast(); return manPlaybookIs(l, 'site.yml') && manRecapOk(l, 'r1') && manFile(sh, 'roles/ios_base/tasks/main.yml', /ios_config/) && manFile(sh, 'roles/ios_base/defaults/main.yml', /base_ntp/) && manFile(sh, 'site.yml', /roles:/) && manTask(l, t => /^ios_base : /.test(t.name) && t.status !== 'failed'); } },
    { id: 'a10', title: 'Vault ile parola', xp: 40,
      story: "group_vars/ios.yml icinde ansible_password acik yaziyor ve bu dosya git'e gidecek. Olmaz. ansible-vault encrypt_string degeri sifreler, playbook calisirken parola dosyasi ile cozulur. Bu lab'da interaktif prompt olmadigi icin --vault-password-file kullanilir.",
      task: "`echo Lab123 > ~/ansible/vault.pass` ile parola dosyasi olustur. `ansible-vault encrypt_string --vault-password-file vault.pass 'admin' --name ansible_password` ciktisini al ve group_vars/ios.yml icindeki acik ansible_password satiri yerine koy. ansible.cfg defaults altina `vault_password_file = vault.pass` ekle ki her calistirmada bayrak yazman gerekmesin. Sonra `ansible-playbook facts.yml` ile dogrula.",
      hint: "group_vars/ios.yml icinde `ansible_password: !vault |` ile baslayan blok olmali, satirlar girintili. Parola dosyasi olmadan calistirirsan Attempting to decrypt hatasi alirsin, --vault-password-file vault.pass bayragi da ise yarar",
      solution: 'cd ~/ansible\necho Lab123 > vault.pass\nansible-vault encrypt_string --vault-password-file vault.pass \'admin\' --name ansible_password\nnano group_vars/ios.yml\nnano ansible.cfg\nansible-playbook facts.yml',
      editorContent: { 'group_vars/ios.yml': MAN_VAULT_IOS, 'ansible.cfg': MAN_FILES['ansible.cfg'].replace('retry_files_enabled = False\n', 'retry_files_enabled = False\nvault_password_file = vault.pass\n') },
      setup: sh => { manBase(sh); manEnsure(sh, 'facts.yml', '---\n- name: Gather facts from branch routers\n  hosts: ios\n  gather_facts: false\n  tasks:\n    - name: Collect IOS facts\n      cisco.ios.ios_facts:\n\n    - name: Show hostname and version\n      ansible.builtin.debug:\n        msg: "{{ ansible_net_hostname }} runs IOS-XE {{ ansible_net_version }}"\n'); },
      check: (sh, c) => { const l = manLast(); return manFile(sh, 'group_vars/ios.yml', /\$ANSIBLE_VAULT;1\.1;AES256/) && !manFile(sh, 'group_vars/ios.yml', /^ansible_password:\s*admin\s*$/m) && manFile(sh, 'vault.pass', /Lab123/) && !!(l && l.cmd === 'ansible-playbook' && ((l.args || []).some(a => /vault-password-file|vault-id/.test(a)) || manFile(sh, 'ansible.cfg', /vault_password_file\s*=/)) && manRecapOk(l, 'r1') && manRecapOk(l, 'r2')); } },
    { id: 'a11', title: 'Check, diff, tags ve limit', xp: 40,
      story: "Kamera ekibi vlan 50 istiyor ama change window pazartesi. Bugun yalnizca ne degisecegini gormek istiyorsun. --check hicbir sey degistirmez, --diff config farkini unified diff olarak gosterir. -t ile sadece ilgili task'lar, -l ile sadece bir host kosar.",
      task: "~/ansible/vlans.yml icine `tags: [vlans]` etiketli bir task olarak vlan 50 CAMERA ekle. Sonra `ansible-playbook vlans.yml --check --diff -t vlans -l r1` ile sadece r1 icin farki gor. Cihazda vlan 50 olusmamali.",
      hint: 'Task seviyesinde tags listesi. --check ile changed gorunur ama cihaz degismez, ssh admin@r1.lab "show vlan brief" ile dogrula',
      solution: 'cd ~/ansible\nnano vlans.yml\nansible-playbook vlans.yml --check --diff -t vlans -l r1',
      editorContent: { 'vlans.yml': '---\n- name: Branch vlans from group_vars\n  hosts: ios\n  gather_facts: false\n  tasks:\n    - name: Ensure data vlans exist\n      cisco.ios.ios_config:\n        lines:\n          - "name {{ item.name }}"\n        parents: "vlan {{ item.id }}"\n      loop: "{{ vlans }}"\n      when: item.name != \'VOICE\'\n      tags: [vlans]\n\n    - name: Camera vlan requested for monday\n      cisco.ios.ios_config:\n        lines:\n          - name CAMERA\n        parents: vlan 50\n      tags: [vlans]\n' },
      setup: sh => manBase(sh),
      check: (sh, c) => { const l = manLast(); const st = manDev('r1'); return !!(l && manPlaybookIs(l, 'vlans.yml') && l.check && l.diff && l.limit === 'r1' && (l.tags || []).includes('vlans') && st && !st.vlans[50] && manTask(l, t => t.host === 'r1' && t.status === 'changed' && t.check) && !manTask(l, t => t.host === 'r2') && /\+ ?name CAMERA/.test(c.out)); } },
    { id: 'a12', title: 'Audit raporu', xp: 50,
      story: "Ay sonu. Yonetim her branch router icin bir rapor istiyor, hostname, version, vlan listesi ve interface durumu. Hepsini bir playbook toplasin, raporu controller'da reports dizinine yazsin. Cihazdan oku, localhost'a yaz, delegate_to tam bu is icin.",
      task: "nano ile ~/ansible/audit.yml yaz. ios_facts `gather_network_resources: [vlans]` ile vlan listesini alsin, ios_command ile `show ip interface brief` register edilsin, file modulu reports dizinini olustursun ve copy modulu content ile reports/HOSTNAME.txt dosyasina hostname, version, vlan adlari ve interface ciktisini yazsin, delegate_to localhost. Calistir, `cat reports/r1.txt` ile bak.",
      hint: "copy content icinde cok satirli string icin | kullan. Vlan adlari `ansible_network_resources.vlans | map(attribute='name') | join(', ')` ile gelir",
      solution: 'cd ~/ansible\nnano audit.yml\nansible-playbook audit.yml\ncat reports/r1.txt',
      editorContent: { 'audit.yml': '---\n- name: Monthly branch audit\n  hosts: ios\n  gather_facts: false\n  tasks:\n    - name: Collect facts and vlans\n      cisco.ios.ios_facts:\n        gather_network_resources:\n          - vlans\n\n    - name: Interface status\n      cisco.ios.ios_command:\n        commands:\n          - show ip interface brief\n      register: intf\n\n    - name: Create reports directory\n      ansible.builtin.file:\n        path: reports\n        state: directory\n        mode: "0755"\n      delegate_to: localhost\n      run_once: true\n\n    - name: Write report\n      ansible.builtin.copy:\n        dest: "reports/{{ inventory_hostname }}.txt"\n        mode: "0644"\n        content: |\n          Audit report for {{ ansible_net_hostname }} site {{ site_code }}\n          Version: {{ ansible_net_version }}\n          Vlans: {{ ansible_network_resources.vlans | map(attribute=\'name\') | join(\', \') }}\n          Interfaces:\n          {{ intf.stdout[0] }}\n      delegate_to: localhost\n' },
      setup: sh => manBase(sh),
      check: (sh, c) => { const l = manLast(); return manFile(sh, 'reports/r1.txt', /R1/) && manFile(sh, 'reports/r1.txt', /17\.09/) && manFile(sh, 'reports/r1.txt', /GigabitEthernet1/) && manFile(sh, 'reports/r1.txt', /GUEST|USERS|MGMT/) && manFile(sh, 'reports/r2.txt', /R2/) && manPlaybookIs(l, 'audit.yml') && manRecapOk(l, 'r1') && manRecapOk(l, 'r2') && manTask(l, t => t.module === 'copy' && t.status !== 'failed'); } },
  ],
});

QUIZ.push(
  { q: "Ansible'da idempotency ne demektir?", a: ['Ayni playbook ikinci kez kosunca degisiklik yapmaz, changed=0 doner', 'Playbook her seferinde cihazi sifirlar', 'Tasklar paralel calisir', 'Hata olunca otomatik geri alir'], c: 0 },
  { q: 'ansible_connection: ansible.netcommon.network_cli ne saglar?', a: ["Modullerin router'a ssh CLI ile konusmasini, Python cihazda calismaz", "Router'a Python kurulmasini", 'NETCONF uzerinden baglantiyi', 'REST API ile baglantiyi'], c: 0 },
  { q: 'cisco.ios.ios_config parents parametresi ne ise yarar?', a: ['Satirlarin hangi blok altinda kontrol edilip gonderilecegini belirler, ornek interface ya da vlan', 'Playbook dosyasinin ust dizinini gosterir', "Handler'in hangi task'tan sonra calisacagini soyler", 'Role bagimliliklarini tanimlar'], c: 0 },
  { q: 'register ne yapar?', a: ["Task sonucunu bir degiskene kaydeder, stdout ve changed gibi alanlari sonra kullanirsin", 'Yeni bir host ekler', 'Degiskeni vault ile sifreler', "Task'i tekrar calistirir"], c: 0 },
  { q: 'Handler ne zaman calisir?', a: ["Notify eden task changed dondugunde, play sonunda bir kez", 'Her task sonrasi', 'Play basinda', 'Yalnizca --check ile'], c: 0 },
  { q: '--check ile --diff birlikte ne gosterir?', a: ['Cihaz degismeden, uygulanacak config farkini unified diff olarak', "Yalnizca syntax hatalarini", "Inventory'deki farklari", 'Son iki calistirma arasindaki farki'], c: 0 },
  { q: 'group_vars/all.yml ile host_vars/r1.yml ayni degiskeni tanimlarsa hangisi kazanir?', a: ['host_vars, host degiskeni grup degiskenini ezer', 'group_vars, grup daha kapsamlidir', 'Alfabetik olarak once gelen', 'Ansible hata verir'], c: 0 },
  { q: 'when: item.name != "VOICE" satirinda neden {{ }} kullanilmaz?', a: ['when zaten bir Jinja ifadesidir, suslu parantez gereksizdir ve uyari uretir', 'YAML suslu parantezi desteklemez', 'when yalnizca boolean degisken alir', "Sadece loop icinde yasaktir"], c: 0 },
  { q: 'ansible-vault encrypt_string ciktisi nereye konur?', a: ['Bir YAML degiskeninin degeri olarak, !vault etiketi ile', 'inventory.ini icine', 'ansible.cfg icine', 'Playbook adi olarak'], c: 0 },
  { q: 'delegate_to: localhost ile ne elde edersin?', a: ["Task hedef host icin degil controller uzerinde kosar, rapor yazmak gibi isler icin", 'Task tum hostlarda ayni anda kosar', 'Task atlanir', "Task root olarak kosar"], c: 0 },
);

BADGES.push({ id: 'ansible', icon: '🅰️', title: 'Playbook Ustasi', desc: 'Ansible bolumunu bitir', test: s => CHAPTERS.find(c => c.id === 'ansible').missions.every(m => s.done.includes(m.id)) });
