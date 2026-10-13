'use strict';
/* YANG Veri Modelleri bolumu. Modul dosyalari setup ile /home/burak/yang altina yazilir, pyang komutu sim-device.js'den gelir. */

const MYY_H = '/home/burak';
const MYY_sub = (c, ...answers) => c.submit != null && answers.some(a => String(c.submit).trim().toLowerCase().replace(/\s+/g, ' ') === String(a).toLowerCase());
const MYY_ran = (c, re) => re.test(c.line);
const MYY_file = (sh, p) => { const n = sh.node(p); return n && n.t === 'f' ? n.d : null; };
const MYY_has = (sh, p, re) => { const d = MYY_file(sh, p); return d != null && (re instanceof RegExp ? re.test(d) : d.includes(re)); };
const MYY_write = (sh, p, d) => { const dir = p.split('/').slice(0, -1).join('/'); if (!sh.node(dir)) sh.run(`mkdir -p ${dir}`); sh.writeFile(p, d, false, 'setup'); };

/* Lab'in kendi kucuk ogretici modulleri. ietf-interfaces, ietf-ip, openconfig-interfaces, Cisco-IOS-XE-native ve lab-acl sim-device.js ile /home/burak/yang altina gelir */
const MYY_MODULES = {
  'lab-auth.yang': `module lab-auth {
  yang-version 1.1;
  namespace "urn:lab:yang:lab-auth";
  prefix la;

  description "choice ve case ornegi. Ayni anda sadece bir case'in verisi bulunabilir.";

  revision 2026-01-10 {
    description "Lab surumu.";
  }

  container authentication {
    leaf username {
      type string;
      mandatory true;
    }
    choice auth-method {
      mandatory true;
      case password {
        leaf password {
          type string;
        }
        leaf password-hash {
          type enumeration {
            enum sha256;
            enum scrypt;
          }
          default "sha256";
        }
      }
      case key {
        leaf key-name {
          type string;
        }
        leaf key-type {
          type enumeration {
            enum rsa;
            enum ecdsa;
            enum ed25519;
          }
        }
      }
      case tacacs {
        leaf-list tacacs-server {
          type string;
          min-elements 1;
        }
        leaf tacacs-key {
          type string;
        }
      }
    }
  }
}
`,
  'lab-syslog.yang': `module lab-syslog {
  yang-version 1.1;
  namespace "urn:lab:yang:lab-syslog";
  prefix ls;

  description "grouping ve uses ornegi. endpoint grouping'i uc yerde yeniden kullanilir.";

  revision 2026-01-10 {
    description "Lab surumu.";
  }

  grouping endpoint {
    description "Bir uzak uc nokta, adres ve port.";
    leaf address {
      type string;
      mandatory true;
    }
    leaf port {
      type uint16;
      default 514;
    }
    leaf vrf {
      type string;
    }
  }

  container syslog {
    list server {
      key "address";
      uses endpoint;
      leaf severity {
        type enumeration {
          enum emergency;
          enum alert;
          enum critical;
          enum error;
          enum warning;
          enum notice;
          enum informational;
          enum debugging;
        }
        default "informational";
      }
    }
    container source {
      uses endpoint;
    }
  }

  container ntp {
    list server {
      key "address";
      uses endpoint {
        refine port {
          default 123;
        }
      }
      leaf prefer {
        type boolean;
        default false;
      }
    }
  }
}
`,
  'lab-qos.yang': `module lab-qos {
  yang-version 1.1;
  namespace "urn:lab:yang:lab-qos";
  prefix lq;

  description "when ve must ornegi. must veriyi dogrular, when node'un var olup olamayacagini belirler.";

  revision 2026-01-10 {
    description "Lab surumu.";
  }

  container policy {
    list class {
      key "name";
      leaf name {
        type string;
      }
      leaf bandwidth {
        type uint32;
        units "kbps";
        mandatory true;
      }
      leaf cir {
        type uint32;
        units "kbps";
        must ". <= ../bandwidth" {
          error-message "cir cannot exceed bandwidth";
          description "Committed rate, interface bandwidth'ini asamaz.";
        }
      }
      leaf shape {
        type boolean;
        default false;
      }
      leaf burst {
        type uint32;
        units "bytes";
        when "../shape = 'true'";
        description "Sadece shaping acikken anlamli.";
      }
    }
  }
}
`,
};
function MYY_setup(sh) {
  /* sim-device.js ~/yang dizinini root sahipli kurar, burak icine yazamaz. Sahipligi duzelt */
  const ydir = sh.node(`${MYY_H}/yang`); if (ydir && ydir.t === 'd') { ydir.o = 'burak'; Object.values(ydir.c).forEach(n => { n.o = 'burak'; }); }
  for (const [name, text] of Object.entries(MYY_MODULES)) {
    const p = `${MYY_H}/yang/${name}`;
    if (!sh.node(p)) MYY_write(sh, p, text);
  }
}
/* pyang bu oturumda bu dosya uzerinde hatasiz kostu mu. Komut satiri pyang icermeli ve exit code 0 olmali */
const MYY_pyangOk = (sh, c, re) => MYY_ran(c, /\bpyang\b/) && re.test(c.line) && sh.lastCode === 0 && !/error/i.test(c.out);

CHAPTERS.push({
  id: 'yang', icon: '📐', title: 'YANG Veri Modelleri', sub: 'pyang tree, augment, choice, must, model karsilastirma',
  missions: [
    { id: 'y1', title: 'Ağaca bak', xp: 20,
      story: "Model driven programmability'nin tamamı tek bir soruya dayanır, cihaz hangi veriyi hangi yapıda kabul ediyor. Cevap YANG modülünde yazar. Modülü ham haliyle okumak yorucudur, `pyang -f tree` modülü bir ağaç olarak çizer. `~/yang/` altında RFC 8343 ietf-interfaces modülünün tam kopyası var, dosya adındaki `@2018-02-20` revision tarihidir.",
      task: "`pyang -f tree ~/yang/ietf-interfaces@2018-02-20.yang` çalıştır. `interfaces` container'ı altındaki `interface` listesinin key leaf'i hangisi, adını `submit` ile gönder.",
      hint: "Tree çıktısında list satırları `*` ile biter ve key köşeli parantez içinde yazılır. Key, bir list entry'sini eşsiz kılan leaf'tir, NETCONF ve RESTCONF istekleri entry'yi bu key ile adresler. Tree notasyonu RFC 8340'ta tanımlıdır.",
      solution: 'pyang -f tree ~/yang/ietf-interfaces@2018-02-20.yang\nsubmit name',
      setup: MYY_setup,
      check: (sh, c) => MYY_sub(c, 'name') },
    { id: 'y2', title: 'Semboller', xp: 25,
      story: "Tree çıktısı küçük bir alfabe kullanır. `rw` config datası, `ro` config false yani salt okunur state datası. `?` opsiyonel node, `*` list ya da leaf-list, `!` presence container. Satır başındaki `x` deprecated node demektir, `{if-mib}?` ise o node'un bir feature'a bağlı olduğunu söyler. Key leaf'ler asla `?` taşımaz çünkü key zorunludur, `mandatory true` olan leaf'ler de taşımaz. RFC 8343 NMDA modelinde state leaf'leri `interface` listesinin içinde `ro` olarak durur, eski `interfaces-state` ağacı deprecated olduğu için `x--ro` görünür.",
      task: "`interfaces` container'ı altındaki `interface` listesinde key olmadığı halde `?` işareti taşımayan ve `rw` olan, yani config tarafında mandatory olan leaf'i bul ve adını `submit` et.",
      hint: "Tree'de `+--rw name` ve `+--rw type` satırlarına bak, `description?` ve `enabled?` opsiyonel. RFC 7950 bölüm 7.6.5 mandatory statement'ı anlatır, mandatory leaf bir entry oluşturulurken gönderilmek zorundadır. Bu yüzden ietf-interfaces ile interface yaratan her edit-config `type` leaf'ini taşır.",
      solution: 'pyang -f tree ~/yang/ietf-interfaces@2018-02-20.yang\nsubmit type',
      setup: MYY_setup,
      check: (sh, c) => MYY_sub(c, 'type') },
    { id: 'y3', title: 'Yapı taşları', xp: 40,
      story: "YANG'ın dört temel node'u var. `container` tek bir düğüm, `list` key ile adreslenen tekrarlı entry'ler, `leaf` tek değer, `leaf-list` değer dizisi. Tipler built-in olabilir, uint16 string boolean gibi, ya da `typedef` ile kendin adlandırırsın. `enumeration` sabit bir isim kümesi tanımlar. Bu dört yapı ile bir VLAN modeli yazabilirsin. pyang hata bulursa dosya adı ve satır numarasıyla söyler, exit code 1 olur.",
      task: "`~/yang/lab-vlan.yang` dosyasını yaz. Modül adı `lab-vlan`, namespace `urn:lab:yang:lab-vlan`, prefix `lv`. `vlan-id` adlı typedef uint16 olsun ve range `1..4094`. `vlans` container'ı içinde key'i `id` olan `vlan` listesi, `id` tipi vlan-id, `name` string, `state` enumeration active ve suspended, `ports` bir leaf-list string. Sonra `pyang -f tree ~/yang/lab-vlan.yang` ile hatasız çizdir.",
      hint: "Her statement süslü parantezle açılır ve noktalı virgülle biter. range typedef'in type bloğu içine yazılır, `type uint16 { range \"1..4094\"; }`. Modül adı dosya adıyla aynı olmalı yoksa pyang uyarır. RFC 7950 bölüm 7.5 container, 7.8 list, 7.6 leaf, 7.7 leaf-list, 7.3 typedef ve 9.6 enumeration'ı anlatır.",
      solution: 'nano ~/yang/lab-vlan.yang\npyang -f tree ~/yang/lab-vlan.yang',
      setup: MYY_setup,
      editorContent: `module lab-vlan {
  yang-version 1.1;
  namespace "urn:lab:yang:lab-vlan";
  prefix lv;

  description "VLAN veri modeli, lab calismasi.";

  revision 2026-01-10 {
    description "Ilk surum.";
  }

  typedef vlan-id {
    type uint16 {
      range "1..4094";
    }
    description "IEEE 802.1Q VLAN numarasi.";
  }

  container vlans {
    list vlan {
      key "id";
      leaf id {
        type vlan-id;
      }
      leaf name {
        type string;
      }
      leaf state {
        type enumeration {
          enum active;
          enum suspended;
        }
        default "active";
      }
      leaf-list ports {
        type string;
      }
    }
  }
}
`,
      check: (sh, c) => {
        const p = `${MYY_H}/yang/lab-vlan.yang`;
        return MYY_has(sh, p, /module\s+lab-vlan\s*\{/) && MYY_has(sh, p, /namespace\s+"urn:lab:yang:lab-vlan"/) && MYY_has(sh, p, /typedef\s+vlan-id\s*\{[\s\S]*?type\s+uint16\s*\{[\s\S]*?range\s+"1\.\.4094"/)
          && MYY_has(sh, p, /container\s+vlans\s*\{[\s\S]*list\s+vlan\s*\{[\s\S]*key\s+"id"/) && MYY_has(sh, p, /leaf\s+id\s*\{\s*type\s+vlan-id/) && MYY_has(sh, p, /leaf-list\s+ports\s*\{\s*type\s+string/)
          && MYY_has(sh, p, /leaf\s+state\s*\{[\s\S]*?enumeration\s*\{[\s\S]*?enum\s+active[\s\S]*?enum\s+suspended/) && MYY_pyangOk(sh, c, /lab-vlan\.yang/) && /\+--rw vlans/.test(c.out) && /ports\*/.test(c.out);
      } },
    { id: 'y4', title: 'choice ve case', xp: 30,
      story: "Bazı ayarlar birbirini dışlar. Bir kullanıcı ya parola ile ya SSH key ile ya da TACACS ile doğrulanır, aynı anda ikisi değil. YANG bunu `choice` ile ifade eder, her alternatif bir `case`. Veride sadece bir case'in node'ları bulunabilir, başka bir case'in node'u yazılınca öncekiler silinir. Tree'de choice parantez içinde, case iki nokta ile gösterilir. `~/yang/lab-auth.yang` dosyasına bak, lab'ın kendi `lab-acl.yang` modülündeki `source` choice'u da aynı kalıptır.",
      task: "`pyang -f tree ~/yang/lab-auth.yang` çalıştır ve modülü oku. `password` leaf'i ile `tacacs-server` leaf-list'i aynı instance'ta aynı anda var olabilir mi, `evet` ya da `hayır` olarak `submit` et.",
      hint: "RFC 7950 bölüm 7.9 choice statement'ı anlatır. choice'un kendisi veride görünmez, sadece seçilen case'in child node'ları görünür. Bu yüzden NETCONF edit-config ile bir case'in node'unu yazmak diğer case'i implicit olarak siler, RFC 7950 bölüm 7.9.6.",
      solution: 'pyang -f tree ~/yang/lab-auth.yang\nsubmit hayır',
      setup: MYY_setup,
      check: (sh, c) => MYY_sub(c, 'hayır', 'hayir', 'no') },
    { id: 'y5', title: 'grouping ve uses', xp: 30,
      story: "Aynı leaf kümesini üç yerde yazmak hem hata hem bakım yükü. `grouping` bir node şablonu tanımlar, `uses` o şablonu olduğu yere açar. Grouping kendi başına veride görünmez, sadece uses edildiği yerde ağaca dahil olur. `refine` ile açıldığı yerde default gibi küçük ayarlar değiştirilebilir. OpenConfig modelleri neredeyse tamamen grouping ve uses ile yazılır. `~/yang/lab-syslog.yang` dosyasında `endpoint` grouping'i var.",
      task: "`pyang -f tree ~/yang/lab-syslog.yang` çalıştır. `endpoint` grouping'i ağaçta kaç kez açılmış, sayıyı `submit` et.",
      hint: "Tree'de `address` ya da `port` leaf'ini say, grouping kaç kez uses edildiyse o kadar görürsün. Modülde `grep -c uses` de aynı sayıyı verir. RFC 7950 bölüm 7.12 grouping ve 7.13 uses, refine ise 7.13.2'de anlatılır.",
      solution: 'pyang -f tree ~/yang/lab-syslog.yang\nsubmit 3',
      setup: MYY_setup,
      check: (sh, c) => MYY_sub(c, '3') },
    { id: 'y6', title: 'augment', xp: 35,
      story: "ietf-interfaces modülü IP adresinden habersizdir, bu kasıtlı. RFC 8344 ietf-ip modülü `augment` ile hedef yola `ipv4` ve `ipv6` container'larını ekler. Böylece modüller birbirine dokunmadan büyür. ietf-ip başka modülleri import ettiği için pyang'a `-p ~/yang` ile arama yolu vermen gerekir, yoksa import çözülemez ve hata alırsın. Tree çıktısı augment bloklarını hedef yoluyla birlikte ayrı bir başlık altında gösterir, prefix `if` import satırından gelir.",
      task: "`pyang -p ~/yang -f tree ~/yang/ietf-ip.yang` çalıştır. `ipv4` container'ının eklendiği ilk augment hedef yolunu, tree'de yazıldığı gibi prefix'leriyle `submit` et.",
      hint: "Çıktıda `augment /if:interfaces/if:interface:` satırına bak, iki nokta öncesini gönder. `!` işareti presence container demektir, ipv4 container'ının varlığı tek başına IPv4'ü açar. RFC 7950 bölüm 7.17 augment, 7.5.1 presence container. NETCONF XML'de bu node ietf-ip namespace'i altında gelir, bu yüzden lxml ile parse ederken `ip` prefix'i ayrıca tanımlanır.",
      solution: 'pyang -p ~/yang -f tree ~/yang/ietf-ip.yang\nsubmit /if:interfaces/if:interface',
      setup: MYY_setup,
      check: (sh, c) => c.submit != null && String(c.submit).trim().replace(/:$/, '').replace(/if:/g, '').replace(/\/+$/, '') === '/interfaces/interface' },
    { id: 'y7', title: 'when ve must', xp: 30,
      story: "Tip kısıtı tek başına yetmez, bazı kurallar node'lar arasıdır. `must` bir XPath ifadesiyle veriyi doğrular, ifade false dönerse sunucu edit-config'i reddeder ve `error-message` metnini rpc-error içinde döner. `when` ise bir node'un var olup olamayacağını belirler, koşul sağlanmıyorsa node veride bulunamaz. `~/yang/lab-qos.yang` dosyasında ikisi de var.",
      task: "`~/yang/lab-qos.yang` modülünü oku. `cir` leaf'ine `bandwidth` değerinden büyük bir değer yazılırsa cihazın döneceği error-message metnini aynen `submit` et.",
      hint: "must bloğunun içindeki error-message satırına bak, tırnaklar olmadan gönder. RFC 7950 bölüm 7.5.3 must ve 7.21.5 when'i anlatır. NETCONF tarafında bu ihlal RFC 6241 bölüm 4.3'teki rpc-error olarak, error-tag operation-failed ve error-message ile gelir.",
      solution: 'pyang -f tree ~/yang/lab-qos.yang\ncat ~/yang/lab-qos.yang\nsubmit cir cannot exceed bandwidth',
      setup: MYY_setup,
      check: (sh, c) => MYY_sub(c, 'cir cannot exceed bandwidth') },
    { id: 'y8', title: 'Üç model, bir interface', xp: 35,
      story: "Aynı GigabitEthernet2 interface'i cihazda üç farklı modelle adreslenebilir. Native model `Cisco-IOS-XE-native` CLI'ı birebir yansıtır, her şeyi kapsar ama sadece Cisco'da çalışır. IETF `ietf-interfaces` vendor bağımsızdır ama kapsamı dardır. OpenConfig operatörlerin yazdığı modeldir, her list entry'sinde `config` ve `state` container ikilisi bulunur, intended ve applied ayrımı buradan gelir. `~/yang/` altında üçünün de kopyası var, openconfig-interfaces import ettiği yardımcı modüllerle birlikte gelir.",
      task: "`pyang -f tree --tree-depth 4 ~/yang/openconfig-interfaces.yang` ve `pyang -f tree ~/yang/Cisco-IOS-XE-native.yang` ile iki modeli çiz, ietf-interfaces ağacını hatırla. OpenConfig modelinde interface description leaf'inin tam yolunu, kökten başlayarak, `submit` et.",
      hint: "Yol container ve list adlarını eğik çizgiyle birleştirir, `/interfaces/interface/config/description` gibi. OpenConfig'te writable her leaf `config` altında, aynı leaf'in cihazda uygulanan hali `state` altında bulunur. IETF'te description doğrudan `interface` altındadır, native'de `native/interface/GigabitEthernet/description`. Hangi modeli seçeceğin bir mimari karardır, çok vendor varsa OpenConfig ya da IETF, tek vendor ve tam kapsam gerekirse native.",
      solution: 'pyang -f tree --tree-depth 4 ~/yang/openconfig-interfaces.yang\npyang -f tree ~/yang/Cisco-IOS-XE-native.yang\nsubmit /interfaces/interface/config/description',
      setup: MYY_setup,
      check: (sh, c) => c.submit != null && String(c.submit).trim().replace(/oc-if:/g, '').replace(/^\/+|\/+$/g, '') === 'interfaces/interface/config/description' },
    { id: 'y9', title: 'lab-acl modülünü genişlet', xp: 50,
      story: "Lab'ın kendi `lab-acl.yang` modülü `~/yang/` altında, pyang ile hatasız geçiyor. Şimdi onu genişleteceksin. Bir ACL'in hangi interface'lere uygulandığını tutmak için ietf-interfaces modülünün `interface-ref` typedef'ini kullanacaksın, bu da `import` gerektirir. Ayrıca her ACL'e bir açıklama ve her entry'ye kaynak port ekleyeceksin, kaynak port sadece tcp ve udp için anlamlı olduğundan `when` ile koşula bağlanacak. Yazım hatası yaparsan pyang satır numarasıyla söyler.",
      task: "`~/yang/lab-acl.yang` dosyasını düzenle. `import ietf-interfaces { prefix if; }` ekle. `acl` listesine `remark` adlı string leaf ekle, length `1..100`. Yine `acl` listesine `applied-to` adlı leaf-list ekle, tipi `if:interface-ref`. `entry` listesine `src-port` leaf'i ekle, tipi `inet:port-number`, `when \"../protocol = 'tcp' or ../protocol = 'udp'\"` koşuluyla. `pyang -f tree ~/yang/lab-acl.yang` hatasız çalışmalı ve üç yeni node ağaçta görünmeli.",
      hint: "import satırları modülün başına, namespace ve prefix'ten sonra gelir. Import edilen modül `~/yang` altında bulunduğu için pyang onu dosyanın kendi dizininde arar. when ifadesi leaf bloğunun içine `when \"../protocol = 'tcp' or ../protocol = 'udp'\";` olarak yazılır, `..` bir üst node'u yani entry'yi işaret eder. RFC 7950 bölüm 7.1.5 import, 7.7 leaf-list, 9.4.4 length, 7.21.5 when. leafref'ler tree'de `-> yol` olarak gösterilir.",
      solution: 'nano ~/yang/lab-acl.yang\npyang -f tree ~/yang/lab-acl.yang',
      setup: MYY_setup,
      editorContent: `module lab-acl {
  yang-version 1.1;
  namespace "urn:lab:acl";
  prefix lacl;

  import ietf-inet-types {
    prefix inet;
  }

  import ietf-interfaces {
    prefix if;
  }

  organization
    "NetDevOps Lab";

  contact
    "burak@lab.local";

  description
    "Kucuk bir access list modeli. Lab icinde pyang ile okunur,
     tree ciktisi incelenir ve gorevlerde yeni leaf ve list eklenir.";

  revision 2026-01-10 {
    description
      "Ilk surum";
  }

  typedef acl-action {
    type enumeration {
      enum permit {
        description
          "Trafige izin ver";
      }
      enum deny {
        description
          "Trafigi dusur";
      }
    }
    description
      "Bir ACL satirinin eylemi";
  }

  container acls {
    description
      "Cihazdaki tum access list tanimlari";

    list acl {
      key "name";
      description
        "Tek bir access list";

      leaf name {
        type string {
          length "1..64";
        }
        description
          "ACL adi";
      }

      leaf type {
        type enumeration {
          enum ipv4 {
            description
              "IPv4 ACL";
          }
          enum ipv6 {
            description
              "IPv6 ACL";
          }
        }
        default ipv4;
        description
          "ACL tipi";
      }

      leaf remark {
        type string {
          length "1..100";
        }
        description
          "ACL aciklamasi";
      }

      leaf-list applied-to {
        type if:interface-ref;
        description
          "Bu ACL'in uygulandigi interface'ler";
      }

      list entry {
        key "seq";
        ordered-by user;
        description
          "ACL satiri, seq degerine gore islenir";

        leaf seq {
          type uint16 {
            range "1..65535";
          }
          description
            "Sira numarasi";
        }

        leaf action {
          type acl-action;
          mandatory true;
          description
            "permit ya da deny";
        }

        choice source {
          description
            "Kaynak secimi";
          case any {
            leaf any {
              type empty;
              description
                "Herhangi bir kaynak";
            }
          }
          case prefix {
            leaf src-prefix {
              type inet:ipv4-prefix;
              description
                "Kaynak prefix, ornek 10.0.0.0/24";
            }
          }
        }

        leaf dst-prefix {
          type inet:ipv4-prefix;
          description
            "Hedef prefix, bos ise any";
        }

        leaf protocol {
          type enumeration {
            enum ip;
            enum tcp;
            enum udp;
            enum icmp;
          }
          default ip;
          description
            "IP protokolu";
        }

        leaf src-port {
          type inet:port-number;
          when "../protocol = 'tcp' or ../protocol = 'udp'";
          description
            "Kaynak port, sadece tcp ve udp icin";
        }

        leaf dst-port {
          type inet:port-number;
          description
            "Hedef port, sadece tcp ve udp icin";
        }

        leaf log {
          type empty;
          description
            "Eslesmeleri logla";
        }

        container statistics {
          config false;
          description
            "Salt okunur sayaclar";
          leaf matched-packets {
            type uint64;
            description
              "Eslesen paket sayisi";
          }
          leaf matched-octets {
            type uint64;
            description
              "Eslesen byte sayisi";
          }
        }
      }
    }
  }

  rpc clear-acl-counters {
    description
      "Bir ACL'in sayaclarini sifirlar";
    input {
      leaf acl-name {
        type leafref {
          path "/lacl:acls/lacl:acl/lacl:name";
        }
        mandatory true;
        description
          "Sifirlanacak ACL";
      }
    }
    output {
      leaf cleared-entries {
        type uint32;
        description
          "Sifirlanan satir sayisi";
      }
    }
  }
}
`,
      check: (sh, c) => {
        const p = `${MYY_H}/yang/lab-acl.yang`;
        return MYY_has(sh, p, /import\s+ietf-interfaces\s*\{\s*prefix\s+if\s*;/) && MYY_has(sh, p, /leaf\s+remark\s*\{[\s\S]*?type\s+string\s*\{[\s\S]*?length\s+"1\.\.100"/)
          && MYY_has(sh, p, /leaf-list\s+applied-to\s*\{[\s\S]*?type\s+if:interface-ref/) && MYY_has(sh, p, /leaf\s+src-port\s*\{[\s\S]*?type\s+inet:port-number[\s\S]*?when\s+"[^"]*tcp[^"]*udp[^"]*"/)
          && MYY_has(sh, p, /container\s+acls/) && MYY_has(sh, p, /rpc\s+clear-acl-counters/)
          && MYY_pyangOk(sh, c, /lab-acl\.yang/) && /remark\?/.test(c.out) && /applied-to\*/.test(c.out) && /src-port\?/.test(c.out);
      } },
    { id: 'y10', title: 'Yoldan protokole', xp: 40,
      story: "Modeldeki tek bir yol üç protokolde üç biçime dönüşür. `/interfaces/interface[name=GigabitEthernet2]/description` yolu NETCONF'ta namespace'li iç içe XML olur, `<interfaces xmlns=\"urn:ietf:params:xml:ns:yang:ietf-interfaces\"><interface><name>GigabitEthernet2</name><description/></interface></interfaces>`. RESTCONF'ta URL olur, modül adı iki nokta ile başa gelir, list key eşittir ile yazılır ve özel karakterler yüzde kodlanır. gNMI'da ise path element'leri köşeli parantezli key'lerle yazılır, `/interfaces/interface[name=GigabitEthernet2]/config/description`. Modeli bilen, üç protokolü de bilir.",
      task: "ietf-interfaces modülünde GigabitEthernet2 interface'inin description leaf'ini hedefleyen RESTCONF data resource yolunu, `/restconf/data` ile başlayarak `submit` et.",
      hint: "RFC 8040 bölüm 3.5.3 yol kurallarını anlatır. İlk node modül adıyla nitelenir `ietf-interfaces:interfaces`, list entry `interface=GigabitEthernet2` olur, leaf sona eklenir. Key içinde eğik çizgi olsaydı `%2F` olarak kodlanırdı, bu yüzden GigabitEthernet1/0/1 gibi isimlerde encoding şart. gNMI'da aynı şey RFC yerine gNMI spesifikasyonunun path encoding bölümünde tanımlıdır.",
      solution: 'pyang -f tree --tree-depth 3 ~/yang/ietf-interfaces@2018-02-20.yang\nsubmit /restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet2/description',
      setup: MYY_setup,
      check: (sh, c) => c.submit != null && String(c.submit).trim().replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') === '/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet2/description' },
  ],
});

QUIZ.push(
  { q: "pyang -f tree çıktısında `ro` ne anlama gelir?", a: ['config false, salt okunur state datası', 'read only erişim hakkı olan kullanıcı', 'Root container', 'Remote operation'], c: 0 },
  { q: "Tree çıktısında bir leaf'in sonunda `?` yoksa bu ne demektir?", a: ['Leaf mandatory ya da key, yazarken gönderilmek zorunda', 'Leaf deprecated', 'Leaf config false', "Leaf'in default'u var"], c: 0 },
  { q: 'YANG list ile leaf-list arasındaki fark nedir?', a: ["list key'li yapısal entry'ler tutar, leaf-list sadece değer dizisidir", 'leaf-list daha hızlıdır', "list sadece config'te olur", 'Fark yoktur'], c: 0 },
  { q: "choice içindeki iki farklı case'in node'ları aynı anda veride bulunabilir mi?", a: ["Hayır, yeni case'in node'u yazılınca diğer case silinir", 'Evet, her zaman', 'Sadece config false ise', 'Sadece presence container ise'], c: 0 },
  { q: 'grouping tek başına veride görünür mü?', a: ["Hayır, sadece uses edildiği yerde ağaca açılır", 'Evet, kendi container\'ı olur', 'Sadece config false ise', 'Sadece augment edilince'], c: 0 },
  { q: 'ietf-ip modülü ietf-interfaces modülüne IPv4 adresini nasıl ekler?', a: ['augment statement ile, ietf-interfaces değişmez', 'ietf-interfaces modülünü düzenleyerek', 'import ile kopyalayarak', 'RESTCONF ile'], c: 0 },
  { q: 'must ile when arasındaki fark nedir?', a: ["must veriyi doğrular ve ihlalde hata döner, when node'un var olup olamayacağını belirler", 'İkisi aynı', 'when sadece state datasında kullanılır', "must sadece typedef'te olur"], c: 0 },
  { q: "OpenConfig modellerinin ayırt edici yapısı nedir?", a: ["Her list entry'sinde config ve state container ikilisi", 'Sadece XML desteklemesi', "Vendor'a özel olması", "Key kullanmaması"], c: 0 },
  { q: "RESTCONF URL'inde `interface=GigabitEthernet1%2F0%2F1` neyi ifade eder?", a: ["Key değeri GigabitEthernet1/0/1, eğik çizgi yüzde kodlanmış", 'Üç ayrı interface', "Bir query parametresi", 'Hatalı URL'], c: 0 },
  { q: 'YANG tree notasyonu hangi RFC\'de tanımlıdır?', a: ['RFC 8340', 'RFC 6241', 'RFC 8040', 'RFC 2616'], c: 0 },
);

BADGES.push({ id: 'yang', icon: '📐', title: 'Model Okuyucu', desc: 'YANG Veri Modelleri bölümünü bitir', test: st => CHAPTERS.find(c => c.id === 'yang').missions.every(m => st.done.includes(m.id)) });
