'use strict';
/* Ingilizce katman, NetDevOps bolumleri python, test, git, api, ci, docker, k8s.
   Bolumler, gorevler, bu dosyalarin ekledigi quiz sorulari ve rozetler. Bicim linux-lab/I18N.md. */
addEn({
  chapters: {
    python: { title: "Network Automation with Python", sub: "Parsing, models, files, CLI, packaging. Real Python 3.14 in the browser" },
  },

  missions: {
    p1: {
      title: "Parsing show ip int brief",
      story: "Every automation job starts in the same place, turning the plain text a device returns into structured data. `show ip interface brief` output has columns, but they are not fixed width, and since `administratively down` is two words a naive split shifts the columns. In this mission you build a list of dicts with str methods and splitlines.",
      task: "Fill in the TODOs in `~/pyws/p1/parse_brief.py`. `parse_brief` should turn each data line into a dict with the keys interface, ip, status, protocol. main prints one line per interface in the form `GigabitEthernet3 unassigned administratively down/down` and finishes with `total 7 up 4 down 3`. Up means status up and protocol up. Then run it with `python3 ~/pyws/p1/parse_brief.py`.",
      hint: "Get the lines with text.splitlines and skip the header with startswith. After `parts = line.split()` the protocol is always `parts[-1]`, and the status is everything between `parts[4]` and `parts[-1]` joined together, that is `\" \".join(parts[4:-1])`. Negative indexes and slices are a lifesaver for columns with a variable number of words. A common mistake is writing `split(\" \")`. With no argument, split treats runs of whitespace as a single separator, `split(\" \")` does not. For documentation see str.split, str.splitlines and Text Sequence Type under Built-in Types on docs.python.org.",
    },
    p2: {
      title: "Regex named groups",
      story: "For output like syslog and `show ip bgp summary`, split is not enough, you need a pattern. In the re module a named group, `(?P<isim>...)`, turns a match straight into a dict and keeps the code readable. For a TAC engineer that means turning a log into a table in minutes.",
      task: "Write the SYSLOG_RE and BGP_RE patterns in `~/pyws/p2/parse_logs.py` with named groups and fill in the parse functions using groupdict. The output, in order, is `syslog 9 lines, 2 with severity 3 or lower`, below it two lines in the form `  Oct 12 03:14:07.221 LINK-3-UPDOWN Interface GigabitEthernet2, changed state to down`, then `mnemonic counts ADJCHANGE=2 CONFIG_I=1 ERRRCV=1 LOGIN_FAILED=1 UPDOWN=4`, `bgp 4 neighbors, 2 established, 2 down` and for the down ones lines like `  10.0.14.4 AS65004 Idle`. Run it.",
      hint: "Use a raw string, r\"...\", otherwise escapes like \\d get lost in the Python string. For syslog use `^(?P<ts>\\w{3} +\\d+ \\d\\d:\\d\\d:\\d\\d(?:\\.\\d+)?) (?P<host>\\S+) %(?P<facility>[A-Z0-9_]+)-(?P<severity>\\d)-(?P<mnemonic>[A-Z0-9_]+): (?P<msg>.*)$`. On a BGP line there are 5 counter columns after neighbor, version and asn, skip them without capturing using `(?:\\s+\\d+){5}`, then come updown and state. re.match anchors at the start of the line, re.search also finds matches in the middle. Header lines do not match and return None, and the walrus pattern `if (m := RE.match(line))` keeps that clean. If the state column is a number the session is established, check it with isdigit. Documentation is the re module, the Regular Expression Syntax and Match Objects sections.",
    },
    p3: {
      title: "Comprehensions and sorted",
      story: "You have the inventory, and the questions are simple but many. Which devices are at which site, who needs an upgrade, who has the longest uptime. Comprehensions turn these questions into readable one line expressions. The key parameter of sorted ties the ordering to whatever field you want, or even a combination of fields.",
      task: "Fill in the by_site, needs_upgrade and longest_uptime functions in `~/pyws/p3/report.py` using comprehensions and sorted, and complete main. The output is one line per site in alphabetical order like `ANK ank-acc-01 ank-core-01`, then `upgrade ank-acc-01 ist-acc-01 izm-wan-01`, `longest ank-acc-01 402, ank-core-01 402, ist-core-01 211` and `models C9200L-48P C9300-48P C9500-24Y4C C9500-48Y4C ION-3000`. Run it.",
      hint: "A dict comprehension is `{site: [...] for site in sites}`, a set comprehension `{d['model'] for d in devices}` drops duplicates. One key is enough for descending uptime and ascending hostname, `key=lambda d: (-d['uptime_days'], d['hostname'])`. Tuples compare left to right, and negating the number is more flexible than reverse=True because you choose the direction of each field separately. operator.itemgetter is a readable alternative to the lambda. A common mistake is using list.sort instead of sorted and expecting a return value, sort returns None. Documentation is the Sorting HOW TO and List Comprehensions in the Data Structures section.",
    },
    p4: {
      title: "The ipaddress module",
      story: "An engineer who does prefix math by hand will get it wrong one day. The ipaddress module gives you correct math for networks, hosts, overlaps and summarization, and saves you from the traps of string comparison. Which prefix covers which in the routing table, the module knows.",
      task: "Fill in the load_routes, covered_by and longest_match functions in `~/pyws/p4/prefixes.py` and complete main. The output is `10.0.0.0/22 covers 10.0.0.0/24 10.0.1.0/24 10.0.2.0/24 10.0.3.0/24`, `collapsed 10.0.0.0/22 10.10.10.0/24 172.16.5.0/24 192.168.100.0/25`, `hosts 10.10.10.0/25 126`, for each host to check either `10.0.2.17 -> 10.0.2.0/24` or `172.16.9.1 -> none`, and the last line `range 10.20.0.0-10.20.1.255 -> 10.20.0.0/23`. Run it.",
      hint: "`ip_network('10.0.0.1/24')` raises ValueError because host bits are set, with `strict=False` it is rounded down to the network address. `r.subnet_of(net)` is the containment test and `ip in net` the membership test. collapse_addresses both removes covered prefixes and merges adjacent blocks, and summarize_address_range turns a range into the smallest number of CIDRs. For longest prefix match take max by prefixlen, with `default=None` for the empty case. num_addresses includes the network and broadcast addresses, so subtract 2 for usable hosts or count over `hosts()`. Documentation is the ipaddress module, the Network objects and Operators sections.",
    },
    p5: {
      title: "dataclass and Enum",
      story: "Data carried around in dicts falls apart after a while, nobody knows which keys exist or what types they hold. A dataclass defines fields and defaults in one place, and __post_init__ validates the data at the door. For fixed sets like interface state, an Enum catches typos at import time, so up and Up never get mixed.",
      task: "In `~/pyws/p5/models.py` write the IfState StrEnum members, the Interface dataclass fields with defaults and the __post_init__ validation, then complete main. The output first shows the invalid records, `skip Vlan5000 vlan 5000 out of range 1..4094` and `skip GigabitEthernet4 mtu 20 out of range 68..9216`, then one line per valid interface in the form `GigabitEthernet2 up 10.0.12.1 mtu 9000 tags p2p,bgp`, with `-` when there is no ip and `-` when there are no tags, and finally `up 3 of 4`. Run it.",
      hint: "Field order matters, fields without defaults must come before fields with defaults, otherwise TypeError. If you write `tags: list[str] = []` the dataclass raises ValueError, because a mutable default would be shared by every instance, use `field(default_factory=list)` for that. Inside __post_init__, `self.state = IfState(self.state)` converts the string to the enum and raises ValueError on an invalid string. A StrEnum member prints its plain value in an f-string, a plain Enum would print IfState.UP. For is_up, the identity comparison `is IfState.UP` is idiomatic. Documentation is the dataclasses module, the Post-init processing and Mutable Default Values sections, and StrEnum in the enum module.",
    },
    p6: {
      title: "TypedDict and Protocol",
      story: "Type hints do not slow Python down and are not enforced at runtime, but they let your editor and tools like mypy warn you. TypedDict describes which keys a dict carries, Protocol describes which methods an object must offer. Thanks to Protocol, netmiko, scrapli or a fake device in a test can all go into the same function without inheritance, it is duck typing written down.",
      task: "In `~/pyws/p6/versions.py` write the VersionRow TypedDict fields, the runtime_checkable DeviceLike Protocol and the collect function, then complete main. The output is `r1 ios-xe 17.09.04a`, `sw1 nx-os 10.2(5)`, `ion1 ion 6.5.3-b1`, `DeviceLike r1 True`, `DeviceLike dict False`, `fields hostname platform version serial`. Run it.",
      hint: "In a Protocol body a method signature with `...` is enough, `def cli(self, command: str) -> str: ...`. To test a Protocol with isinstance the class needs @runtime_checkable, and even then it only checks that the attributes and methods exist, not their signatures. In the TypedDict, serial is not present on every device, so make it optional with `NotRequired[str]`. get_type_hints returns the keys in definition order. A common mistake is asking for list instead of Iterable, the editor then complains when you pass a generator, collections.abc.Iterable is the broader contract. Documentation is the typing module, the Protocols and TypedDict sections.",
    },
    p7: {
      title: "Generators and groupby",
      story: "2400 lines is small, but a real file from a syslog collector runs to millions of lines, and if you load it into memory with readlines the container dies. A generator function streams lines one at a time with yield, and itertools.groupby hands you consecutive lines with the same key as a group. Together they process unlimited logs in constant memory.",
      task: "In `~/pyws/p7/logstream.py` write the read_lines generator and the severity_of function, and in main use groupby to print one line per host in the form `ion1 lines 480 sev<=3 54`, finishing with `total 2400 lines, 5 hosts`. The big.log file is sorted by host. Run it.",
      hint: "Inside `with path.open() as fh`, `for line in fh` is already lazy, hand out each line with `yield line.rstrip()`. groupby only groups consecutive equal keys. If the file were not sorted by host, the same host would show up as several groups, and then you would need sorted first, but that loads everything into memory, which is why a sorted collector export is a design decision. Each group is a single pass iterator, you cannot take its len, so count and sum severity in one loop without converting to a list. Bools can be added, `urgent += sev <= 3`. Documentation is groupby in the itertools module, the Generators section, and the Functional Programming HOWTO.",
    },
    p8: {
      title: "pathlib and glob",
      story: "The config backup directory grows, spreads into subdirectories, and .bak files and READMEs creep in. Instead of joining strings with os.path, pathlib.Path objects, pattern search with rglob, relative_to, stem and stat make file work clean and platform independent.",
      task: "Complete `~/pyws/p8/catalog.py`. Find every .cfg file under configs with rglob, walk them in sorted order and print each in the form `ank/ank-core-01.cfg 190 bytes hostname ank-core-01`. Create the out directory, write `relative_path hostname` per line into out/index.txt, and for each config write `interfaces N` into out/HOST.txt. The last line is `indexed 3 configs in out/`. Run it.",
      hint: "`CONFIGS.rglob('*.cfg')` searches recursively, and .cfg.bak files do not show up because the pattern must match the suffix exactly, `glob('**/*.cfg')` is the same thing. rglob order depends on the filesystem, so sorted is required. `cfg.relative_to(CONFIGS)` is the path relative to configs, `cfg.stem` the name without extension, `cfg.stat().st_size` the size in bytes. `OUT.mkdir(parents=True, exist_ok=True)` does not blow up on the second run. The / operator joins Path objects, and read_text and write_text spare you dealing with open. Documentation is the pathlib module, the Pattern language and Reading and writing files sections, and the glob module.",
    },
    p9: {
      title: "JSON and YAML round trip",
      story: "The inventory lives in YAML, the API wants JSON, and you are the bridge between them. json is in the standard library, yaml comes from pyyaml. Their load and dump functions look alike, but YAML has surprises, like YAML 1.1 treating the word `yes` as a bool, and a round trip shows you those.",
      task: "Complete `~/pyws/p9/convert.py`. Read inventory.yaml with safe_load and print `devices 2 vlans 2` and `snmp enabled True bool`. Write it to inventory.json with indent 2 and sort_keys, read it back, add the device ist-acc-02, write it to inventory_out.yaml with sort_keys False and default_flow_style False, read it again and print `roundtrip devices 3`. Run it.",
      hint: "yaml.load does not work without a Loader and can construct arbitrary Python objects, so use yaml.safe_load for anything that comes from a file. json.dump writes to a file, json.dumps returns a string, and yaml.safe_dump covers both, returning a string when no stream is given. In YAML `enabled: yes` becomes True and `022` can be an octal number, quote it if you want a string. JSON has no comments and no trailing commas, tuples come back as lists and dict keys become strings. default_flow_style=False writes block style, sort_keys=False keeps definition order. Documentation is the json module, Basic Usage section, and for pyyaml the PyYAML Documentation, Loading YAML and Dumping YAML.",
    },
    p10: {
      title: "CSV DictReader and DictWriter",
      story: "The monitoring system exports interface counters as CSV, and management wants a report. The csv module's DictReader turns each row into a dict keyed by the header, and DictWriter writes a clean file with the columns you choose. Values arrive as strings, if you want numbers you convert them yourself.",
      task: "Complete `~/pyws/p10/errors_report.py`. Read interfaces_raw.csv with DictReader, produce a `link down` problem for interfaces that are admin up but oper down, and an `errors` problem for those whose error counters add up to more than zero. Write errors_report.csv with the columns device, interface, problem, errors. For each row written print a line like `ist-core-02 GigabitEthernet1 errors 155`, and finish with `read 8 rows, wrote 5 problems`. Run it.",
      hint: "Open CSV files with `open(path, newline='')`, otherwise line endings get doubled on Windows, something the documentation insists on. DictReader takes the first row as the header, and you do the `int('152')` conversion yourself. With `DictWriter(fh, fieldnames=FIELDS)` do not forget to call writeheader. If the dict has extra keys you need `extrasaction='ignore'`, otherwise ValueError. writerows takes a list. Documentation is the csv module, the DictReader, DictWriter and Dialects and Formatting Parameters sections.",
    },
    p11: {
      title: "Jinja2 config templates",
      story: "Hand written interface config is full of copy paste mistakes. With Jinja2 the structure sits in the template and the data in YAML, and the same engine runs under Ansible. With loops, ifs and filters you generate hundreds of ports from one template, and a custom filter converts CIDR to mask notation.",
      task: "Write the `~/pyws/p11/interfaces.j2` template, and the netmask filter and main in `~/pyws/p11/render.py`. For each interface output `interface NAME`, `description` or `no description` if there is none, switchport mode access and access vlan for access ports, mode trunk and `switchport trunk allowed vlan 10,20,30` for trunks, `ip address 192.168.10.1 255.255.255.0` if there is an ip, `shutdown` if enabled is false and `no shutdown` otherwise, with each block ending in `!`. The output should be written to generated.cfg and printed to the screen. Run it.",
      hint: "Without trim_blocks=True and lstrip_blocks=True in the Environment, every `{% %}` line leaves a blank line behind, which is tiring to read once it lands in a config. StrictUndefined raises an error on a missing variable instead of silently printing nothing. Vlan10 has no mode, so read it with `iface.mode | default('routed')`, and likewise `iface.enabled | default(true)`. The `iface.ip is defined` test asks whether it exists. For a custom filter set env.filters['netmask'] = function, and in the template use `{{ iface.ip | netmask }}`. The join filter joins a list with commas. Documentation is the Jinja2 Template Designer Documentation, List of Builtin Filters and Whitespace Control, and on the Python side ipaddress ip_interface.",
    },
    p12: {
      title: "argparse CLI",
      story: "Once your script spreads through the team it becomes a command line tool. argparse gives you subcommands, type conversion, help output and exit code 2 on usage errors for free. Your job is returning 1 on validation errors and 0 on success, because CI and shell scripts look at the exit code.",
      task: "In `~/pyws/p12/vlantool.py` write the validate function and the list, add and check subcommands. `list` prints a line like `10 users` for each vlan and then `3 vlans`. `add 30 voice` saves it and prints `added 30 voice`, and for an existing or invalid id it writes `error: ...` to stderr and returns 1. `check 5000` prints `invalid 5000 vlan 5000 out of range 1..4094` and exits 1, `check 30` prints `valid 30`. Run list, add 30 voice, check 5000, check 30 and list again, in that order.",
      hint: "`add_subparsers(dest='command', required=True)` makes the subcommand mandatory. Each subparser gets its own arguments with add_argument, type=int does the conversion, and bad input triggers argparse's own error with code 2. Having main return an int and using the `sys.exit(main())` pattern matters for testability. When the argv parameter is None, sys.argv is used, and in a test you pass a list. Error messages go to stderr with `print(..., file=sys.stderr)`, stdout is for data only. The walrus `if error := validate(args.id)` enters the branch only when there is a message. Documentation is the argparse module, Sub-commands and the argparse Tutorial, plus sys.exit.",
    },
    p13: {
      title: "Auditing with logging",
      story: "An engineer who debugs with print either talks too much in production or not at all. The logging module separates levels, format and destination. INFO and above on the console, everything including DEBUG in a file, same code, two handlers. In a TAC case, that kind of log file is exactly what you ask the customer for.",
      task: "In `~/pyws/p13/audit.py` write the setup_logging and check functions. Attach to the netaudit logger a StreamHandler at INFO level writing to stdout and a FileHandler at DEBUG level writing to audit.log. The console format is `%(levelname)s %(message)s`, the file format is FMT. The output should contain `INFO r1 ok`, `WARNING badhost has invalid ip 10.0.0.300` and `INFO audit done, 3 of 4 ok`, and DEBUG lines should appear only in the file. Run it.",
      hint: "The logger level is the first gate and the handler level the second. If the logger is not at DEBUG, the record never reaches the handler, hence `log.setLevel(logging.DEBUG)` plus separate levels on the handlers. StreamHandler writes to stderr by default, pass sys.stdout for the console. Format messages lazily with `log.debug('checking %s %s', name, ip)`, an f-string builds the string even when the level is off. basicConfig configures the root logger and only takes effect on the first call. Do not touch root in library code, get your own logger with `logging.getLogger(__name__)`. If the same handler is added twice, lines are doubled. Documentation is the logging module, the Logging HOWTO and the Logging Cookbook, especially Logging to multiple destinations.",
    },
    p14: {
      title: "Custom exceptions and raise from",
      story: "ValueError comes from everywhere, and you cannot tell which one is your parser's and which is from ipaddress. Your own exception hierarchy lets the caller catch everything with a single except, and raise from keeps the original cause in the chain. The `The above exception was the direct cause` line in a traceback is exactly that chain, which in TAC terms means the root cause.",
      task: "In `~/pyws/p14/errors.py` write ParseError so it carries line_no, complete the parse_interfaces generator with `raise ParseError(...) from exc` on an invalid ip, and in main catch ConfigError and add a note with add_note. The output is `ok GigabitEthernet1 10.0.0.1/24`, `ParseError line 7: bad ip address 10.0.0.300`, `  caused by ValueError ...` and `  note file r1.cfg`. Run it.",
      hint: "Call `super().__init__(message)` in the subclass __init__, otherwise args stays empty and str comes out empty. `raise ParseError(...) from exc` sets __cause__, while `from None` hides the chain, which is sometimes what you want. In an except block the exc variable is deleted when the block ends, so assign it to another name if you need it outside. Since Python 3.11, `exc.add_note(...)` adds context, stored in the __notes__ list. A raise inside a generator blows up at the current step of the consuming for loop, so the earlier ok lines have already been printed. ip_interface raises ValueError on an invalid address and its message goes into the chain unchanged. Documentation is Exception Chaining and User-defined Exceptions in the Errors and Exceptions section, plus BaseException.add_note under Built-in Exceptions.",
    },
    p15: {
      title: "contextmanager and decorators",
      story: "If a device session was opened it must be closed, even on errors. If a command timed out it should be retried, and its duration should be measured. contextlib.contextmanager and decorators exist so these three concerns do not leak into the business logic. Without functools.wraps the wrapped function loses its name and docstring, and in the debugger everything shows up as wrapper.",
      task: "In `~/pyws/p15/session.py` write the session contextmanager and the retry and timed decorators, wrap collect with `@timed` and `@retry(3)`, and open the r2 and sw1 sessions in a single with using ExitStack. The output is `connect r1`, `retry 1 r1 timeout on attempt 1`, `retry 2 r1 timeout on attempt 2`, `collect took N ms`, `r1 uptime is 3 days`, `disconnect r1`, `name collect doc Komutu gonder ve ciktiyi dondur.`, `connect r2`, `connect sw1`, `open r2 sw1`, `disconnect sw1`, `disconnect r2`. Run it.",
      hint: "In a generator written with contextmanager, the part before yield is __enter__ and the part after is __exit__. Put yield inside try finally so the cleanup runs even on errors. The decorator has three layers, `retry(times)` returns a decorator, the decorator returns a wrapper, the wrapper calls the real function, and every layer uses `@functools.wraps(func)`. On the last attempt a bare raise keeps the original traceback. In timed, perf_counter is not the wall clock, it is monotonic and precise. ExitStack pushes a dynamic number of contexts onto a stack with enter_context and closes them in reverse order on exit, which is why sw1 closes first. ParamSpec keeps the wrapper's signature intact for the type checker. Documentation is the contextlib module, contextmanager and ExitStack, the functools module wraps, and PEP 612 ParamSpec.",
    },
    p16: {
      title: "The netaudit package",
      story: "The finale. You bring everything together in one package. netaudit parses the IOS configs in a directory, produces findings according to rules and reports per host. __init__ holds the public API, parse the model, rules the rules, report the format, and __main__ makes it runnable with `python3 -m netaudit`. This structure is one pyproject away from a real tool you can install with pip.",
      task: "Fill in the TODOs in parse.py, rules.py, report.py and __main__.py under `~/pyws/p16/netaudit/`. The output of `cd ~/pyws/p16 && python3 -m netaudit configs` should be a header per host like `ist-core-01 3 findings`, below it lines in descending severity like `  HIGH   telnet_enabled telnet enabled on vty`, and at the end a blank line and `total 6 findings, 3 high`. ist-acc-01 is clean so it should not appear. `--strict` should return 1 when there are findings, and `--version` should print `netaudit 0.1.0`.",
      hint: "In parse_config an unindented line starts a new block and an indented line belongs to the previous block, tell them apart with `raw.startswith(' ')` and skip the `!` lines. Rules are pure functions that take a DeviceConfig and return a list of Finding, and run_rules merges them with a nested comprehension. In report, groupby needs a sort by host first, and within the same key sort by negated severity for descending order, which works because it is an IntEnum, and `f'{f.severity.name:<6}'` left aligns. In __main__, `from netaudit import ...` is an absolute import, and -m works because the package is in the cwd. If you run the file directly with python3 netaudit/__main__.py, sys.path is different and the import fails. Logs go to stderr and the report to stdout, so `> report.txt` stays clean. Documentation is Packages in the Modules section, runpy and the __main__ document, and argparse action='version'.",
    },
  },

  badges: {
    pythonista: { title: "Pythonista", desc: "Finish the Network Automation with Python chapter" },
  },
});

addEn({
  chapters: {
    test: { title: "Unit and Integration Testing", sub: "pytest for parsers, fixtures, mocks, markers and lab API tests" },
  },

  missions: {
    t1: {
      title: "Your first pytest",
      story: "You wrote the parser and it seems to work. Seems is not enough. pytest finds the `test_` functions in files starting with `test_`, runs the asserts and shows you red. There is a bug in parse_brief.py and your first test will find it. Reading red is as important as seeing green, the failure output tells you which line and which value, all of it.",
      task: "Write the test_row_count and test_admin_down_status tests in `~/tws/t1/test_parse_brief.py` and run `cd ~/tws/t1 && pytest -q`. One test is red, read the output, fix the bug in parse_brief.py and run again. The result should be `2 passed`.",
      hint: "A test function is an ordinary function that uses a plain assert, there is no special assertEqual. In the failure output the lines starting with `E` show the expected and actual values. The bug is `parts[4]` and `parts[5]`, which shift when the status is two words, and the fix is `\" \".join(parts[4:-1])` and `parts[-1]`. pytest adds the test file's directory to sys.path, which is why `from parse_brief import parse_brief` works. `-q` is quiet mode, one dot per test, F for a failure. Documentation is pytest Get Started and How to write and report assertions in tests.",
    },
    t2: {
      title: "Asserts and messages",
      story: "pytest's assert introspection feels like magic, when `assert len(up) == 2` blows up it shows the value len returned, the up list, everything. Adding a message still gives context, so whoever looks at the CI log at three in the morning understands what was expected. bgp.py has a bug that counts the Active state as established.",
      task: "Write the test_active_is_not_established and test_order_preserved tests in `~/tws/t2/test_bgp.py` and add an f-string message to the existing assert. Run with `cd ~/tws/t2 && pytest -x --tb=short`, which stops at the first failure. Read the introspection in the output, fix bgp.py with isdigit and run again for `3 passed`.",
      hint: "The second part of an assert statement is the message, `assert x not in up, f'...{up}'`. pytest rewrites asserts, which is why the intermediate values appear on the `where` and `+` lines. This only works in test files, not in helper modules. `-x` stops at the first error, `--tb=short` shortens the traceback, `--tb=line` shortens it even more. A common mistake is writing `assert(x, 'mesaj')`, a tuple is always True, and pytest warns about it. Documentation is pytest Assertion introspection and How to invoke pytest.",
    },
    t3: {
      title: "parametrize and ids",
      story: "You do not write five functions to run the same test with five values. parametrize turns each value into its own test, shown in the report as something like `test_valid_vlan[users]`, so when one blows up you know which. If you do not give ids, pytest generates them from the values, and reading reserved-1002 beats reading 1002.",
      task: "Add parametrize to the two tests in `~/tws/t3/test_vlan.py`. The valid values are 1, 10, 4094 with ids min, users, max. The invalid ones use pytest.param, 0 as zero, 4095 as above-max, 1002 as reserved-1002, 1005 as reserved-1005. Run with `cd ~/tws/t3 && pytest -v`, you should see `7 passed` and the ids.",
      hint: "In `@pytest.mark.parametrize('vlan_id', [1, 10, 4094], ids=['min', 'users', 'max'])` the first argument is the parameter name and must match the function signature. For several parameters use `'vlan_id, expected'` and a list of tuples. pytest.param gives each value its own id and marks, like `pytest.param(1002, id='reserved-1002', marks=pytest.mark.xfail)`. `-v` prints each test on its own line with its id, and `-k reserved` selects only those ids. Documentation is pytest How to parametrize fixtures and test functions.",
    },
    t4: {
      title: "Fixtures and scope",
      story: "If every test loads the same inventory it is both slow and repetitive. A fixture lets a test ask for what it needs by name, and pytest prepares it. scope chooses its lifetime, function is fresh for every test, module once per file, session for the whole run. A fixture with yield keeps setup and teardown in a single function.",
      task: "Write a module scoped inventory fixture and a function scoped scratch fixture with yield in `~/tws/t4/test_inventory.py`. The tests are already there, and test_loaded_once proves the file is read only once. Run `cd ~/tws/t4 && pytest -v` for `4 passed`.",
      hint: "Put `@pytest.fixture(scope='module')` on top. The function name is the parameter name the test takes, pytest matches them by name. The part before yield is setup, the part after is teardown, and teardown runs even if the test blows up. If a test modifies the object returned by a module scoped fixture, later tests see the modified version, the shared state trap, so it suits read only data. `pytest --setup-show` shows which fixture is set up when, and `--fixtures` lists the available fixtures. Documentation is pytest How to use fixtures and Fixture scopes.",
    },
    t5: {
      title: "conftest and src layout",
      story: "As the project grows, fixtures need to be shared across files and code needs to be separated from tests. conftest.py is a fixture store that pytest discovers automatically, it is never imported. The src layout puts the package under src, and pytest finds it through pythonpath in pyproject, so you do not fall into the trap of accidentally importing an uninstalled package from the cwd.",
      task: "In the `~/tws/t5/` project add the pytest settings to pyproject.toml, pythonpath src, testpaths tests, addopts -q. Write a sample_vlans fixture in `tests/conftest.py` with 10 users, 20 voice, 99 mgmt. Write `tests/test_validate.py` and `tests/test_names.py`, each with one test that uses the fixture and one plain test. Run with `cd ~/tws/t5 && pytest` for `4 passed`.",
      hint: "In pyproject.toml the table is `[tool.pytest.ini_options]`. `pythonpath = [\"src\"]` adds to sys.path, `testpaths = [\"tests\"]` says where to look on a run without arguments, `addopts = \"-q\"` is added to every run. Fixtures in conftest.py are visible to all tests in the same directory and below. If you write an import line for it, pytest loads it twice and you get strange errors. In the src layout, `from vlanlib import valid_vlan` comes from the package __init__. rootdir is the directory containing pyproject, and `pytest --co -q` only collects and lists. Documentation is pytest Configuration, conftest.py local per-directory plugins and Good Integration Practices.",
    },
    t6: {
      title: "tmp_path and monkeypatch",
      story: "Code that writes files and reads the environment is considered hard to test, it is not. tmp_path gives each test a real, empty directory that is deleted automatically. monkeypatch changes an environment variable or a module function for the duration of the test and undoes it afterwards, so global state stays clean. Pinning the timestamp that produces dates is the key to a deterministic test.",
      task: "Write three tests in `~/tws/t6/test_backup.py`. test_backup_writes_file uses tmp_path and monkeypatch to pin the timestamp to 20261013 and verifies the file is written as `r1-20261013.cfg` with the right content. test_settings_from_env uses setenv to set NETLAB_USER to svc-netops and NETLAB_BACKUP_DIR to /srv/bk. test_settings_defaults removes both with delenv and expects the defaults. Run `cd ~/tws/t6 && pytest -v` for `3 passed`.",
      hint: "tmp_path is a pathlib.Path, different for each test, you can create as many directories under it as you like, and pytest cleans up old ones itself. `monkeypatch.setattr(backup, 'timestamp', lambda: '20261013')` replaces the module attribute. The call inside backup_config reads the module global, so it sees the new lambda. Had you bound it to a separate name with `from backup import timestamp`, the patch would not work. setenv and delenv manage os.environ, and `raising=False` avoids an error when deleting a variable that does not exist. Documentation is pytest How to use temporary directories and files and How to monkeypatch/mock modules and environments.",
    },
    t7: {
      title: "unittest.mock and MagicMock",
      story: "get_version opens SSH to the device, and there is no device in the test environment. unittest.mock.patch replaces the connect function with a MagicMock for the duration of the test. A MagicMock answers every attribute and call, you tell it what to return with return_value and which error to raise with side_effect. Then you prove with assert_called_once_with that the code sent the right command to the device.",
      task: "Write three tests in `~/tws/t7/test_collector.py`. test_get_version_parses_output fakes collector.connect with patch, makes cli return SHOW_VERSION, expects `17.09.04a` and asserts the connect, cli and close calls. test_get_version_unknown expects `unknown` for empty output. test_session_closed_on_error gives cli a TimeoutError side_effect, catches it with pytest.raises and verifies close was still called. Run `cd ~/tws/t7 && pytest -v` for `3 passed`.",
      hint: "The patch target is where the name is looked up, `collector.connect`, not where the function is defined, this is the most common mistake. In the `with patch('collector.connect') as mock_connect` block, mock_connect.return_value is the session connect returns, and you set its `.cli.return_value`. `side_effect = TimeoutError('...')` raises that error on the call, and if you give a list it returns the items in order. assert_called_once_with compares the arguments exactly, and you can also inspect them by hand with `call_args`. Because MagicMock accepts everything, a wrong attribute name passes silently, tighten it by passing `spec=Session`. Documentation is unittest.mock, the patch and MagicMock sections, and Where to patch.",
    },
    t8: {
      title: "pytest.raises and match",
      story: "Raising an error is also behavior, and it gets tested. If the expected error does not come inside a pytest.raises block the test fails, and with match you check the message against a regex so you do not catch the wrong ValueError. Through excinfo you reach the exception object and can even check the __cause__ chain.",
      task: "Add three error paths to parse_prefix in `~/tws/t8/prefix.py`, `missing prefix length in TEXT` for a missing `/`, `bad prefix length N` for anything outside 0..32, and `bad network TEXT` from exc when ip_network fails. Write test_missing_length, test_bad_length and test_bad_network_chained, which uses excinfo, in `~/tws/t8/test_prefix.py`. Run `cd ~/tws/t8 && pytest -v` for `4 passed`.",
      hint: "Inside a `with pytest.raises(ValueError, match=r'bad prefix length 33'):` block put only the call that produces the error, and keep asserts outside the block, because the block ends the moment the error is raised and the lines below it never run. match uses re.search, so a full match is not required, escape special characters. With `as excinfo`, `excinfo.value` is the exception object, `excinfo.type` its class, `str(excinfo.value)` the message. Catching a broader class also catches subclasses, if you write Exception everything passes, so keep it narrow. Documentation is pytest How to write and report assertions, the Assertions about expected exceptions section.",
    },
    t9: {
      title: "Markers and selecting with -m",
      story: "Not every test runs every time. skip skips on purpose, skipif ties it to a condition, such as no sockets in the browser, and xfail documents a known bug and warns you with strict once it is fixed. Your own markers, slow and device, must be registered in pyproject, otherwise you get a warning. With `-m` you select by marker expression, fast tests in CI, slow ones at night.",
      task: "Register the slow and device markers in `~/tws/t9/pyproject.toml`. Add skip, skipif, strict xfail, slow and device markers to the TODOs in `~/tws/t9/test_mtu.py`. Run with `cd ~/tws/t9 && pytest -v -m \"not slow\"`. The output should show 1 deselected, at least 1 passed, 1 xfailed and skipped tests, and the socket test is also skipped in the browser.",
      hint: "Use `@pytest.mark.skip(reason=...)` and `@pytest.mark.skipif(sys.platform == 'emscripten', reason=...)`. In Pyodide the platform is emscripten and there are no sockets, so this test is skipped in the browser and runs on a real machine. With `@pytest.mark.xfail(strict=True)`, a test that unexpectedly passes fails instead of reporting XPASS, so you will not forget to remove the marker once the bug is fixed. `-m \"not slow\"` and `-m \"slow or device\"` are boolean expressions, and the quotes are required. An unregistered marker gives PytestUnknownMarkWarning, and with `--strict-markers` it becomes an error. Documentation is pytest How to mark test functions with attributes, Skip and xfail, and Working with custom markers.",
    },
    t10: {
      title: "TDD red green refactor",
      story: "Test driven development, test first, code second. Red, the test is written and you see it fail, the function does not even exist yet. Green, the simplest code that passes the test. Refactor, clean up the code while the tests are green, you have a safety net. You go through this whole cycle for a VLAN name validator.",
      task: "Write valid and invalid names with parametrize in `~/tws/t10/tests/test_vlan_name.py` and run `cd ~/tws/t10 && pytest -q` to see red, an ImportError. Then write the vlan_name_ok function in `~/tws/t10/vlan_name.py`, first green with an if chain, then refactor to a single regex using re.compile and fullmatch. The final run should be `10 passed`.",
      hint: "The rules are 1 to 32 characters, the first character an ASCII letter, the rest letters, digits, underscores and hyphens. In the red phase the error is an ImportError or NameError, and that counts as red too, the test could not be collected. For green, write lines like `if not name or len(name) > 32: return False`, then `name[0].isalpha()`. But `isalpha` also counts non ASCII letters, so `ünite` in the invalid list catches you, the Unicode trap. In the refactor use `re.compile(r'[A-Za-z][A-Za-z0-9_-]{0,31}')` with fullmatch, since match only anchors at the start and does not check the end. Run pytest at every step, staying green after the refactor is the rule. Documentation is the re module, re.fullmatch and Pattern.fullmatch, and pytest How to invoke pytest.",
    },
    t11: {
      title: "Lab API integration test",
      story: "A unit test talks to a fake, an integration test to the real service. In the lab, a GET on `https://api.lab/v1/health` with requests returns 200. But the API is not there in every environment, and the requests shim may not be loaded. A mature test suite knows this, it runs live when the API is reachable, and otherwise either skips or falls back to a fake with the same contract. You separate the two with an integration marker.",
      task: "In `~/tws/t11/tests/conftest.py` write the api_reachable function, an api fixture that returns live or fake, a fake_api fixture that is always fake, and a live_only fixture that skips when there is no access. In `~/tws/t11/tests/test_api.py` write test_health_ok expecting 200 with api, test_device_names expecting `[\"r1\", \"sw1\"]` with fake_api, and test_live_health with the integration marker expecting 200 with live_only. Run `cd ~/tws/t11 && pytest -v` for at least `2 passed`, plus 1 skipped if the API is not there.",
      hint: "In api_reachable try `netapi.health() == 200` and return False on any Exception, an ImportError, a RuntimeError or a connection error all mean unreachable. The fake has the same signature as netapi.http_get and returns an object offering status_code and json. Since the code is written against that contract it does not care, and this is where Protocol pays off. `monkeypatch.setattr(netapi, 'http_get', fake_get)` lasts only for that test. Inside live_only, `pytest.skip(reason)` marks the test SKIPPED, not failed. Later you run only the live tests with `pytest -m integration`. Pyodide has no sockets, the requests shim goes to api.lab through LAB.http, and without the shim the fallback runs. Documentation is pytest Skipping test functions, monkeypatch, and requests Quickstart Response Content.",
    },
    t12: {
      title: "Flaky tests and time",
      story: "At 02.30 at night CI is red, in the morning it is green, and nobody touched anything. A flaky test. The cause is usually a hidden dependency, the clock, random, the network, ordering. maint.py checks the maintenance window with datetime.now, and so does the test, so the test result depends on the wall clock. The fix is making time a parameter, production passes now, the test passes whatever moment it wants.",
      task: "Add a `now: datetime | None = None` parameter to in_maintenance_window in `~/tws/t12/maint.py`, using datetime.now when it is not given. Remove the flaky test in `~/tws/t12/test_maint.py` and use parametrize with fixed datetime values to test 03.00 True, 01.59 False, 02.00 True, 04.00 False and 14.30 False. Run `cd ~/tws/t12 && pytest -v` for `5 passed`.",
      hint: "The `now or datetime.now()` pattern uses the parameter when it is given. A datetime object is never falsy, so this is safe. In the test use fixed moments like `datetime(2026, 10, 13, 3, 0)` and test the boundaries separately, start inclusive, end exclusive. The alternative is faking the `maint.datetime` class with monkeypatch, but since datetime is a C type you cannot patch now alone, you have to wrap the whole class, so parameter injection is cleaner. Tests that wait with time.sleep are flaky too, test the behavior, not the duration. Documentation is the datetime module, and pytest How to monkeypatch, Monkeypatching returned objects.",
    },
  },

  badges: {
    tester: { title: "Test Engineer", desc: "Finish the Unit and Integration Testing chapter" },
  },
});

addEn({
  chapters: {
    git: { title: "Git Workflow", sub: "From init to pull request in the netauto project" },
  },

  missions: {
    mg1: {
      title: "A repo is born",
      story: "Under ~/netauto there is a small Python network automation package, parsers, inventory, tests. It has never seen version control, and every change overwrites the previous one. The first job is turning the project into a repo with git init. Git records an author on every commit, so setting user.name and user.email is required. With --global they are written to ~/.gitconfig and apply to every repo on this machine.",
      task: "Go into the netauto directory, initialize a repo, and set user.name and user.email with --global.",
      hint: "cd ~/netauto, then git init. For the identity use `git config --global user.name \"Burak Dartar\"` and `git config --global user.email burak@netlab.local`. Verify with cat ~/.gitconfig.",
    },
    mg2: {
      title: "First commit and .gitignore",
      story: "git status shows three things that should never get into the repo. .env holds a device password, .venv is hundreds of megabytes of libraries, and __pycache__ and .pyc files are junk Python generates. A .gitignore file lists these patterns and git never sees them. A directory pattern ends with a slash, an extension pattern uses an asterisk. Then stage everything else with git add . and make the first commit. The commit message should follow the conventional commits format, and the chore prefix is for work that is not a code change.",
      task: "Write a .gitignore that keeps out __pycache__ .venv *.pyc and .env, then stage everything and make the first commit.",
      hint: "In nano .gitignore put four lines, `__pycache__/` `.venv/` `*.pyc` `.env`. Then git add . and `git commit -m \"chore: initial project layout\"`. .env should not appear in git status.",
    },
    mg3: {
      title: "Feature branches and conventional commits",
      story: "You need a new function to parse BGP summary output. New work does not go straight into main, you open a feature branch. git switch -c both creates the branch and switches to it. You will make three commits on the branch. feat is a new feature, fix a bug fix, chore maintenance work. These prefixes make generating a changelog and reviewing easier. There is also a bug in parse_ip_int_brief, the status column should be parts[4] instead of parts[3], fix it with a fix commit. Add rich to requirements.txt, which is a chore.",
      task: "Open a feature/bgp-parser branch and make three separate commits, adding the parse_bgp_summary function with a feat message, the bug with fix, and requirements with chore.",
      hint: "git switch -c feature/bgp-parser. Add the function with nano netauto/parsers.py, then `git commit -am \"feat: add parse_bgp_summary\"`. For the bug use `sed -i 's/\"status\": parts\\[3\\]/\"status\": parts[4]/' netauto/parsers.py` and a fix commit. Then `echo \"rich==13.7.1\" >> requirements.txt` and a chore commit.",
    },
    mg4: {
      title: "History and diffs",
      story: "Looking at what you changed before committing should be a reflex. git diff shows the difference between the working tree and the index, that is changes not yet staged. After git add, git diff comes back empty because the change is now in the index. Then git diff --staged shows the difference between the index and HEAD, exactly what will go into the commit. For history, git log --oneline --graph --all draws every branch with one line per commit and an ASCII graph. Add a parser usage note to the README and commit it with the docs prefix.",
      task: "Add a usage note to README.md, view the difference in two stages with git diff and git diff --staged, make a docs commit, then look at the history with git log --oneline --graph --all.",
      hint: "Add the note with nano README.md. Then git diff, git add README.md, git diff --staged, `git commit -m \"docs: describe parser usage in README\"`, and finally git log --oneline --graph --all.",
    },
    mg5: {
      title: "Fast forward merge",
      story: "The feature is done and goes into main. Switch to main and run git merge feature/bgp-parser. The main branch has not received a single commit since the feature was opened, so the feature is a straight continuation of main. In that case git does not create a merge commit, it moves the main pointer to the tip of the feature, which is called fast-forward. In the output you see Fast-forward and a summary of the changed files. After the merge both branches point to the same commit and the feature can be deleted.",
      task: "Switch to main and merge the feature branch with a fast-forward.",
      hint: "git switch main, then git merge feature/bgp-parser. Use git log --oneline --graph --all to see that both branches are on the same commit.",
    },
    mg6: {
      title: "Resolving a conflict",
      story: "Ayşe added uptime parsing to parse_show_version on the feature/show-version branch. The same morning you wrote serial number parsing in the same spot of the same function and have not committed it yet. First commit your own change to main, then merge Ayşe's branch. When git sees both sides touched the same lines it cannot merge automatically and says CONFLICT. It puts <<<<<<< HEAD, ======= and >>>>>>> markers in the file. The upper block is your version, the lower block is Ayşe's. The right resolution is to keep both parse blocks and delete the marker lines. Then mark it resolved with git add, and git commit completes the merge.",
      task: "Commit the serial change, merge feature/show-version, resolve the conflict with nano so both parsers stay and no markers remain, and finish with add and commit.",
      hint: "git switch main, `git commit -am \"feat: parse serial number in parse_show_version\"`, git merge feature/show-version, git status, clean up the markers with nano netauto/parsers.py keeping both blocks, git add netauto/parsers.py, git commit.",
    },
    mg7: {
      title: "Rebase",
      story: "Mehmet's feature/inventory-yaml branch was opened weeks ago from the first commit, it has two commits and main has moved far ahead in the meantime. If you merge, a big fork shows up in the graph. The alternative is rebase. git rebase main takes the commits on the branch and reapplies them one by one on the tip of main. The result is a straight line. Note that reapplied commits get new hashes, because their parents changed. A hash is computed from the content plus the parent. Compare the hashes with git log --oneline before and after the rebase. This is why rebasing a branch shared with others is dangerous.",
      task: "Switch to the feature/inventory-yaml branch, note the hashes before the rebase, rebase onto main, and look at the new hashes and the straight graph.",
      hint: "git switch feature/inventory-yaml, git log --oneline -3, git rebase main, then git log --oneline --graph --all again. The hashes changed but the messages are the same.",
    },
    mg8: {
      title: "Interactive rebase and squash",
      story: "You want to send one meaningful commit to review instead of two small ones. In real git, git rebase -i main opens an editor listing a pick line for each commit, and if you change the second line to squash the two become one commit. In this lab no editor opens, the command shows you the todo list and explains what it would do. The manual way to get the same result is git reset --soft main. HEAD goes back to main but the index and working tree stay as they are, so all the changes from both commits sit there staged. A single git commit turns them all into one commit.",
      task: "Read the explanation with git rebase -i main, then squash the two commits with reset --soft main and a single feat commit.",
      hint: "git rebase -i main, git reset --soft main, look at the staged changes with git status, `git commit -m \"feat: load inventory from yaml with platform filter\"`, git log --oneline -3.",
    },
    mg9: {
      title: "Hotfix with cherry-pick",
      story: "Production runs the release/1.0 branch, an old version opened from the first commit. When a customer device returns empty show version output, parse_show_version blows up. You will make the fix on main, but you cannot merge all of main into the release, there are untested new parsers there. git cherry-pick takes the change of a single commit and applies it as a new commit on the branch you are on. You can give a hash, or if you write main it takes main's latest commit. The same change then lives on two branches with two different hashes.",
      task: "On main add an empty text guard to parse_show_version and make a fix commit, then switch to release/1.0 and bring that commit over with cherry-pick.",
      hint: "git switch main, add `if not text:` and `return {}` at the start of the function with nano netauto/parsers.py, `git commit -am \"fix: return empty dict for empty show version output\"`, git switch release/1.0, git cherry-pick main, git log --oneline -2.",
    },
    mg10: {
      title: "Tags and semantic versioning",
      story: "Releases are marked with tags, not branches. Semantic versioning says MAJOR.MINOR.PATCH, an incompatible change bumps major, a new feature bumps minor, a bug fix bumps patch. The tip of release/1.0 is v1.0.0, and the new parsers on main are v1.1.0. An annotated tag needs -a and -m, and the tag gets its own author, date and message, like a release note. git show v1.1.0 shows the tag first and then the commit. git describe --tags tells you how far HEAD is from the nearest tag, and if you are exactly on a tag it prints just the tag name.",
      task: "Switch to main, create annotated tags with the tip of release/1.0 as v1.0.0 and the tip of main as v1.1.0, list the tags and run git describe --tags.",
      hint: "git switch main, `git tag -a v1.0.0 -m \"First stable release\" release/1.0`, `git tag -a v1.1.0 -m \"Serial, uptime and BGP parsers\"`, git tag -l, git show v1.1.0, git describe --tags.",
    },
    mg11: {
      title: "Remotes and push",
      story: "The repo still lives only on your disk. With git remote add origin url you define the remote repo, and origin is just an alias. git push -u origin main sends main and sets up the upstream relationship, so later pushes and pulls do not need the branch name. Tags do not go automatically with push, git push --tags is needed separately. After the push a remote tracking branch called origin/main appears, and git log origin/main shows the latest commit the remote knows about. The remote in this lab is fake but it behaves like the real thing.",
      task: "Add the origin remote, push the main and feature/inventory-yaml branches with -u, and push the tags.",
      hint: "`git remote add origin https://github.com/burak/netauto.git`, git remote -v, git push -u origin main, git push -u origin feature/inventory-yaml, git push --tags, git log --oneline origin/main -1.",
    },
    mg12: {
      title: "Clone, pull and force-with-lease",
      story: "Act like a teammate. Clone the remote as ~/netauto-review, add a review note to the README, commit and push. Then go back to ~/netauto and fetch that commit with git pull, it comes in as a fast-forward. Now rebase feature/inventory-yaml onto main again. The branch was pushed before and the rebase changed the hashes, so a plain git push is rejected because the history on the remote is not an ancestor of yours. git push --force-with-lease overwrites the remote, but only if the remote is still at the commit you last saw, and if someone else pushed in the meantime it refuses. A bare --force does not check this, which is why it is not preferred.",
      task: "Clone the remote as netauto-review, push a docs commit from there, pull in netauto, rebase the feature branch and push it with --force-with-lease.",
      hint: "cd ~ and `git clone https://github.com/burak/netauto.git netauto-review`, cd netauto-review, add a line to the README with echo, `git commit -am \"docs: add review checklist\"`, git push. cd ~/netauto, git pull, git switch feature/inventory-yaml, git rebase main, git push says rejected, then git push --force-with-lease.",
    },
    mg13: {
      title: "Recovering with reflog",
      story: "You committed the runner skeleton to main. Then in the wrong window you typed git reset --hard HEAD~1, the commit fell off the branch, the file was deleted from disk, and git log no longer shows it. No panic. Git did not delete the commit, only the pointer moved back. git reflog records every commit HEAD has visited in order, HEAD@{0} is now, HEAD@{1} the one before. You see the lost commit's hash there. With git reset --hard HEAD@{1} or the hash you move main back to it and the file returns. The reflog is local and gets cleaned up over time, so do not put off the recovery.",
      task: "Add runner.py to main and commit it, lose it with reset --hard HEAD~1, then find it with reflog and bring it back.",
      hint: "git switch main, nano netauto/runner.py, git add netauto/runner.py, `git commit -m \"feat: add runner skeleton\"`, git reset --hard HEAD~1, ls netauto, git reflog, git reset --hard HEAD@{1}, git log --oneline -1.",
    },
    mg14: {
      title: "The pull request flow",
      story: "In real life the feature branch is pushed, a pull request is opened on GitHub, the reviewer reads the diff, approves and presses the merge button. Go through the same flow on the command line. git log main..feature/inventory-yaml lists the commits that are on the feature but not on main, exactly what the reviewer reads. git diff main...feature --stat, with three dots, summarizes the difference since the common ancestor. git request-pull produces the classic PR text. Use --no-ff when merging so a merge commit is created even when a fast-forward is possible, that way the graph always shows where the feature started and ended, and reverting it is a single revert.",
      task: "Review the main..feature difference and the request-pull text, switch to main, merge with --no-ff and push.",
      hint: "git log main..feature/inventory-yaml --oneline, git diff main...feature/inventory-yaml --stat, git request-pull main origin feature/inventory-yaml, git switch main, git merge --no-ff feature/inventory-yaml, git push, git log --oneline --graph -5.",
    },
  },

  badges: {
    git: { title: "Git Workflow Master", desc: "Finish the Git Workflow chapter" },
  },
});

addEn({
  chapters: {
    api: { title: "REST APIs and Python requests", sub: "curl, status codes, auth, pagination, ETag, retry, async jobs" },
  },

  missions: {
    api1: {
      title: "Hello, server",
      story: "The team's new inventory service api.lab has gone live. Before writing any automation, act like a network engineer and look by hand first. curl -i prints both the status line and the response headers, and the body comes back as JSON.",
      task: "Send a request to the health endpoint with `curl -i https://api.lab/v1/health` and examine the status code and the Content-Type header.",
      hint: "-i means include, it shows the headers too. -s silences the progress output, and the two are used together.",
    },
    api2: {
      title: "The language of status codes",
      story: "REST APIs talk through status codes. 2xx is good, 4xx is your fault, 5xx is theirs. Ask for a device that does not exist and try a DELETE without a token, then read what the server says in the message field of the body.",
      task: "First get a 404 with `curl -i https://api.lab/v1/devices/999`, then get a 401 with `curl -i -X DELETE https://api.lab/v1/devices/1`. -X selects the HTTP method.",
      hint: "Two separate commands. Pay attention to the WWW-Authenticate header in the 401 response and the message field in the JSON body, they tell you what you need to do.",
    },
    api3: {
      title: "Parse the JSON",
      story: "Even if the server pretty prints, counting 60 devices by eye is torture. Filter the JSON with python3 in the terminal. jq is not available in this lab, but python3 -c with the json module does the same job. The list endpoint returns the fields page, per_page, total, items and links.",
      task: "Pipe the output of `curl -s 'https://api.lab/v1/devices?per_page=5'` into python3 and print the total value and the hostnames in items.",
      hint: "One line, `curl -s 'https://api.lab/v1/devices?per_page=5' | python3 -c \"import json,sys; d=json.load(sys.stdin); print(d['total']); print([x['hostname'] for x in d['items']])\"`",
    },
    api4: {
      title: "Get a token and use it",
      story: "Write operations require a bearer token. POST /v1/auth/token takes username and password in a JSON body and returns an access_token. Put the token in a shell variable and send it in the Authorization header on the next request. The user is burak, the password lab123.",
      task: "Store the token in the TOKEN variable, then fetch your own profile with `curl -s -H \"Authorization: Bearer $TOKEN\" https://api.lab/v1/me`.",
      hint: "One line, `TOKEN=$(curl -s -X POST -H 'Content-Type: application/json' -d '{\"username\":\"burak\",\"password\":\"lab123\"}' https://api.lab/v1/auth/token | python3 -c \"import json,sys; print(json.load(sys.stdin)['access_token'])\")`",
    },
    api5: {
      title: "First script with requests",
      story: "curl is nice in the shell, but automation lives in Python. The requests library makes HTTP human friendly. A Response object has status_code, headers, text and `json()`. Always set a timeout, a script that hangs will page you at three in the morning.",
      task: "Write ~/apiclient/health.py with nano. Fetch /v1/health with requests.get and timeout=5, and print the status_code, the Content-Type header and the `json()['status']` value on separate lines. Then run it with `python3 ~/apiclient/health.py`.",
      hint: "`r = requests.get('https://api.lab/v1/health', timeout=5)`, then `print(r.status_code)`, `print(r.headers['Content-Type'])` and `print(r.json()['status'])`. The headers dictionary is case insensitive.",
    },
    api6: {
      title: "Session and token",
      story: "Writing the token header by hand on every request breeds errors. requests.Session keeps headers, auth and cookies. Get the token once, put it in Session.headers, and every request after that carries it.",
      task: "Write ~/apiclient/session.py with nano. Get a token with POST /v1/auth/token, create a Session, put the Authorization header on the Session, and print username and role from GET /v1/me on one line in the form `burak netops`. Run it with `python3 ~/apiclient/session.py`.",
      hint: "`s = requests.Session()`, then `s.headers['Authorization'] = 'Bearer ' + token`, then `me = s.get(BASE + '/v1/me', timeout=5).json()` and `print(me['username'], me['role'])`.",
    },
    api7: {
      title: "The pagination loop",
      story: "There are 60 devices, but a page returns at most 50, with a default of 10. A good client keeps walking until links.next is null. links.next comes back as a relative path, join it with the base URL. Today it is 60, next year it will be 600, and the code should stay the same.",
      task: "Write ~/apiclient/pages.py with nano. Start with per_page=25, follow the pages until links.next is null and collect all devices. First print the total count alone on one line, then print a `site sayı` line for each site, that is the site name and its device count. Run it with `python3 ~/apiclient/pages.py`.",
      hint: "Start with `url = '/v1/devices?per_page=25'`, and in a `while url` loop do `d = requests.get(BASE + url, timeout=5).json()`, `items += d['items']`, `url = d['links']['next']`. Use collections.Counter for the counting.",
    },
    api8: {
      title: "Catch the errors",
      story: "A prod script should not die with a traceback on a 404. raise_for_status raises HTTPError on 4xx and 5xx, and e.response holds the server's response. A host that does not exist gives ConnectionError, Timeout is a separate class, and they all derive from RequestException. Print a message based on which error you caught.",
      task: "Write ~/apiclient/errors.py with nano. For /v1/devices/999 catch HTTPError via raise_for_status and print `http 404 not_found`. For `https://nope.lab/v1/health` catch ConnectionError and print `baglanti hatasi nope.lab`, Turkish for connection error, exactly as written. Run it with `python3 ~/apiclient/errors.py`.",
      hint: "In the try block do `r = requests.get(...)` and `r.raise_for_status()`, and with `except requests.exceptions.HTTPError as e` do `print('http', e.response.status_code, e.response.json()['error'])`. For the second request use `except requests.exceptions.ConnectionError`.",
    },
    api9: {
      title: "The DeviceClient module",
      story: "Now gather the repeated code into a class. DeviceClient logs in, holds a Session, walks pages with list, and does get, create and update. Put the module in its own file so the CLI and the tests can import it. Running the script from its own directory makes the import easy, since Python adds the cwd to sys.path.",
      task: "Complete the DeviceClient class in ~/apiclient/client.py with nano, with the methods list, get, create and update. Then use ~/apiclient/use_client.py to create a device named ams-lab-99 with site ams-dc1, model C8000V and mgmt_ip 10.10.9.99, set its status to maintenance and print `id hostname status`. Run it with `cd ~/apiclient && python3 use_client.py`.",
      hint: "create is POST /v1/devices with json=, which returns 201 and the id in the body, and update is PATCH /v1/devices/{id}. Every method should call raise_for_status, and list can be a generator that follows links.next.",
    },
    api10: {
      title: "PUT, ETag and 412",
      story: "PATCH updates partially, PUT replaces the whole resource. If two engineers edit the same device at the same time, the last writer wins and one change is lost. ETag solves this. Send back the ETag from the GET in If-Match, and if the version has changed the server returns 412. api.lab requires If-Match on PUT, and if you do not send it at all you get 428.",
      task: "Write ~/apiclient/etag.py with nano. GET device 1 and keep the ETag header. First try a PUT with the If-Match value \"stale\" and print the status, then send a PUT with the correct ETag that sets description to `edited by burak` and print the status. The output should have 412 and 200 on separate lines. Run it with `python3 ~/apiclient/etag.py`.",
      hint: "`body = r.json()`, then pop the id, links, version, created_at and updated_at fields, set `body['description'] = 'edited by burak'`, and send the PUT with `headers={'If-Match': etag}`. Use a Session for the token.",
    },
    api11: {
      title: "Retry and backoff",
      story: "Within a short window api.lab cuts off the 7th request with 429 and a Retry-After header. /v1/flaky returns 500 on the first call and recovers on the second. Both happen in prod. Do not write a blind loop. On 429 wait as long as Retry-After says, on 5xx apply exponential backoff, at most 5 attempts. The max_retries setting of requests' HTTPAdapter is a no op in this lab, write the loop yourself.",
      task: "Write ~/apiclient/retry.py with nano. The `get_with_retry(session, url, retries=5)` function should wait Retry-After seconds on 429 and retry, and on 5xx retry with a backoff of 0.5, 1, 2 seconds. Fetch /v1/flaky and print `flaky 200`, then fetch /v1/devices?per_page=5 ten times in a row and print `devices ok 10` if all are 200. Run it with `python3 ~/apiclient/retry.py`.",
      hint: "In a `for attempt in range(retries)` loop do `r = session.get(url, timeout=5)`. If it is 429, `time.sleep(int(r.headers.get('Retry-After', '1')))` and continue, if the status is 500 or above, `time.sleep(0.5 * 2 ** attempt)` and continue, otherwise return r.",
    },
    api12: {
      title: "Async jobs and a CLI",
      story: "Long jobs like backups do not answer synchronously. POST /v1/jobs returns 202 Accepted and a Location, you poll the job with GET, and the status moves through queued, running, done. Wrap this in a real CLI with argparse and log every request with logging, so path and status are visible at DEBUG level. The operations team will run this tool from cron, which is why you use logging instead of print.",
      task: "Write ~/apiclient/netcli.py with nano. With argparse it should have the subcommands `list --site X` and `backup --site X --wait`, plus a --log-level option. backup should create a job of type backup with POST /v1/jobs, and with --wait poll every second until it is done and print `job-XXXX done`. Import and use DeviceClient from client.py. Run it with `cd ~/apiclient && python3 netcli.py --log-level DEBUG backup --site ams-dc1 --wait`.",
      hint: "`logging.basicConfig(level=getattr(logging, args.log_level), stream=sys.stderr, force=True)` and `log.debug('%s %s -> %s', method, path, r.status_code)`. For the poll loop, inside `while job['status'] != 'done'` do `time.sleep(1)` and GET /v1/jobs/{id}.",
    },
  },

  badges: {
    api: { title: "API Master", desc: "Finish the REST API chapter" },
  },
});

addEn({
  chapters: {
    ci: { title: "CI and CD Pipelines", sub: "GitHub Actions, matrix, secrets, artifacts, deploy gates, GitLab CI, rollback" },
  },

  missions: {
    ci1: {
      title: "First workflow",
      story: "netauto is the parser package the NOC uses. Last week a merge broke the tests and nobody noticed. From now on the tests run automatically on every push. A GitHub Actions workflow is defined in YAML under .github/workflows, and in the lab `ci run` executes it in GitHub log format. There is no git init in this build, the project is ready as plain files.",
      task: "Write ~/netauto/.github/workflows/ci.yml with nano. name CI, on push and pull_request, a job named test. The steps are actions/checkout@v4, actions/setup-python@v5 with python-version 3.12, `pip install pytest pyyaml requests` and `pytest -q`. Then run it with `cd ~/netauto && ci run`.",
      hint: "Under jobs put test, runs-on ubuntu-latest, and in the steps list the uses and run keys. Under with, python-version is written in quotes, because 3.10 as a number is read as 3.1.",
    },
    ci2: {
      title: "Lint and build, ordering with needs",
      story: "The tests run, but broken indentation and 200 character lines eat time in review. Lint should be a separate job running in parallel with test, and build should start only when both are green. The needs key sets up dependencies between jobs, and if one breaks, build never starts.",
      task: "Add a lint job to ci.yml with the steps `python3 -m compileall -q src` and `python3 scripts/lint.py src tests`. The build job should depend on lint and test through needs and run `python3 scripts/build.py`. Use `cd ~/netauto && ci run` to see all three go green.",
      hint: "Writing `needs: [lint, test]` ties it to both jobs at once. The build step produces dist/netauto-1.2.0.tar. make lint and make build do the same job.",
    },
    ci3: {
      title: "Matrix and cache",
      story: "The NOC servers run Python 3.11, developer laptops 3.13. Testing on one version is not enough. strategy.matrix runs the same job separately for each version, and the ${{ matrix.python-version }} expression takes a different value in each copy. actions/cache keeps pip downloads, and with hashFiles in the key the cache is refreshed when requirements.txt changes.",
      task: "Add a matrix to the test job with python-version values 3.11, 3.12 and 3.13, and have setup-python use the matrix value. Add actions/cache@v4 before the install step with path ~/.cache/pip and key `${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}`. Use `cd ~/netauto && ci run` to see three test jobs.",
      hint: "Under strategy put matrix, and under that the python-version list. Expressions do not need quotes in YAML, but the list of values should be quoted. On the first run you see a cache miss, on the second a hit.",
    },
    ci4: {
      title: "Broken test",
      story: "A colleague read the status column with the wrong index in the parser and pushed it. This is exactly what CI is for. First watch the pipeline turn red, read the exit code and the pytest output, then fix the bug and turn it green. Do not try to fix anything before reading the log.",
      task: "First see the failure with `cd ~/netauto && ci run`. Fix the status field in src/netauto/parser.py, the status column is the words between parts[4] and the second to last column, `' '.join(parts[4:-1])`. Then go green with `cd ~/netauto && ci run` again.",
      hint: "The assert line in the pytest output will say NVRAM, meaning the Method column was read. administratively down is two words, so a join is needed.",
    },
    ci5: {
      title: "Main only",
      story: "With the full pipeline running on every push to everyone's feature branch, the runner queue swelled. Limit the push trigger to main, the pull_request trigger already makes sure feature branches are tested when a PR is opened. The branches filter accepts globs, like release/*.",
      task: "Write the on block so push has branches main, plus pull_request. Use `cd ~/netauto && ci run --ref refs/heads/feature/vlan-parser` to see it skipped, then `cd ~/netauto && ci run --ref refs/heads/main` to see it run.",
      hint: "Under on, push and pull_request are each a map, with a branches list under push. If you do not pass --ref the default is refs/heads/main.",
    },
    ci6: {
      title: "Secrets",
      story: "The deploy step will log in to api.lab, and the password does not go in the YAML. On GitHub a secret is defined under the repo Settings, read in the workflow with ${{ secrets.API_PASSWORD }} and masked with asterisks in the log. In the lab, secrets come from the ~/.ci/secrets.env file. Never print a secret with echo, masking is the last line of defense, the first is your own discipline.",
      task: "Add a job named verify-api that depends on lint and test through needs. In the env block set API_USER to burak and API_PASSWORD to `${{ secrets.API_PASSWORD }}`. Its step should be `python3 deploy.py --check` and print auth ok. Run with `cd ~/netauto && ci run`, and check which secrets are loaded with `ci secrets`.",
      hint: "env at the job level is passed to every step. deploy.py --check logs in and reads /v1/me, it never prints the password. The ci secrets command does not show values, only names.",
    },
    ci7: {
      title: "Version via step output",
      story: "The deploy must know which version to install, and that information must come from a single place, src/netauto/version.py. A step writes the value to the $GITHUB_OUTPUT file, later steps read it as steps.id.outputs.name, and the job outputs block carries the value to other jobs as needs.job.outputs.name.",
      task: "Add a step with the id ver to the build job that runs `echo \"version=$(python3 scripts/version.py)\" >> \"$GITHUB_OUTPUT\"`. In the build step print `echo \"building netauto ${{ steps.ver.outputs.version }}\"`. Expose the version value with an outputs block at the job level. Use `cd ~/netauto && ci run` to see the building netauto 1.2.0 line in the log.",
      hint: "outputs sits under the job, at the same level as steps. Use | for a multi line run. In the lab log, outputs version=1.2.0 is printed at the end of the job.",
    },
    ci8: {
      title: "Artifacts",
      story: "The dist/ package the build job produces disappears together with the runner when the job ends. actions/upload-artifact stores it attached to the run, another job downloads it with actions/download-artifact, and it can also be downloaded from the release page. The package checksum is verified in a separate job, so a suspicious build machine gets noticed.",
      task: "Add actions/upload-artifact@v4 at the end of the build job with name dist and path dist/. Write a new job named package-check that depends on build, downloads dist with actions/download-artifact@v4 and verifies the checksum in the SHA256SUMS file. Use `cd ~/netauto && ci run` to see the artifact line in the log.",
      hint: "download-artifact takes name and path under with. For the verification use hashlib.sha256 via python3 -c, the SHA256SUMS format is `hash  dosya`, a hash, two spaces and the file name.",
    },
    ci9: {
      title: "Staging deploy",
      story: "Now it is CD. Every change that lands on main goes out to staging automatically. deploy.py opens a deploy job on api.lab, polls it and prints the environment's new version. The job must run only on main and on push, never on a PR. The version comes from the build job's output, do not keep the version in two places.",
      task: "Add a deploy-staging job with needs build and verify-api, and the if condition `github.ref == 'refs/heads/main' && github.event_name != 'pull_request'`. Put the API_USER and API_PASSWORD secret in env. The step is `python3 deploy.py --env staging --version ${{ needs.build.outputs.version }}`. Use `cd ~/netauto && ci run` to see staging at 1.2.0, and list the job with `api-lab jobs`.",
      hint: "if goes at the job level, aligned with needs. If deploy.py gets a 429 it waits as long as Retry-After says, and in the log you will see the job go queued, running, done. Verify the result with `curl -s https://api.lab/v1/deployments/staging`.",
    },
    ci10: {
      title: "The production gate",
      story: "Going to production automatically makes change management angry. On GitHub, required reviewers are defined on the production environment, and a job that uses that environment waits for approval. In the lab, approval is given by triggering the workflow manually, that is --event workflow_dispatch. For that the on block also needs a workflow_dispatch trigger.",
      task: "Add workflow_dispatch to the on block. Write a deploy-production job with needs deploy-staging and build, environment production, and the step `python3 deploy.py --env production --version ${{ needs.build.outputs.version }}`. First use `cd ~/netauto && ci run` to see the job left waiting, then approve with `cd ~/netauto && ci run --event workflow_dispatch` and see production at 1.2.0.",
      hint: "environment is a single line at the job level, `environment: production`. The if condition on deploy-staging is also true for workflow_dispatch, because the ref is still refs/heads/main.",
    },
    ci11: {
      title: "The GitLab CI equivalent",
      story: "The company keeps some projects on GitLab and wants the same pipeline there too. GitLab CI is a single file, .gitlab-ci.yml. stages sets the order and each job belongs to a stage, before_script runs before every job, only and except are branch filters, and when manual means it is started by hand. gitlab-runner exec shell tries out a single job locally.",
      task: "Write ~/netauto/.gitlab-ci.yml with nano. stages lint, test, build, deploy. A variables block, before_script under default, lint and test jobs, a build job with the dist/ artifact, deploy_staging with only main, and deploy_production with only main and when manual. First run a single job with `cd ~/netauto && gitlab-runner exec shell test`, then the whole pipeline with `cd ~/netauto && ci run .gitlab-ci.yml`.",
      hint: "On GitLab, secrets come in as CI/CD Variables. In the lab ~/.ci/secrets.env goes into the job env and deploy.py reads API_PASSWORD from there. The only list takes branch names, main.",
    },
    ci12: {
      title: "Rollback",
      story: "It is 17.40, and 1.2.0 in production broke a NOC dashboard. No panic, the second half of CD is going back. A separate workflow, triggered manually with workflow_dispatch, takes the target version and environment as inputs, and deploy.py --rollback opens a rollback job on api.lab. The closing notification step with `if: always()` runs even if something failed. The target is 1.1.0, the previous known good version.",
      task: "Write ~/netauto/.github/workflows/rollback.yml with nano. on workflow_dispatch with inputs version, required, and environment, defaulting to production. The rollback job uses environment inputs.environment, and its steps are showing the deployments endpoint with curl, `python3 deploy.py --env ${{ inputs.environment }} --rollback --to ${{ inputs.version }}`, and a notification with `if: always()`. Run it with `cd ~/netauto && ci run .github/workflows/rollback.yml --event workflow_dispatch --input version=1.1.0`.",
      hint: "The inputs block sits under workflow_dispatch, with description and either required or default for each input. Values are reached with ${{ inputs.version }}. Verify the result with `curl -s https://api.lab/v1/deployments/production`, previous should be 1.2.0.",
    },
  },

  badges: {
    ci: { title: "Pipeline Engineer", desc: "Finish the CI and CD chapter" },
  },
});

addEn({
  chapters: {
    docker: { title: "Docker and Containers", sub: "Dockerfile, image, container, registry, compose" },
    k8s: { title: "Kubernetes Orchestration", sub: "Deployment, Service, ConfigMap, probes, rollout, HPA" },
  },

  missions: {
    dk1: {
      title: "First Dockerfile",
      story: "netauto is the team's inventory audit worker. Until now it ran on everyone's laptop with a different Python version, and every week someone said `bende çalışıyor`, it works on my machine. Now it gets a container image. The source code is under ~/netauto, and app.py and requirements.txt are ready.",
      task: "Write a Dockerfile in ~/netauto. The base image should be `python:3.12-slim`, WORKDIR /app, bring in the code with COPY, install requirements.txt with pip, and the CMD should run `python app.py --serve`. Then build it with `docker build -t netauto:1.0.0 .`.",
      hint: "`FROM python:3.12-slim`, `WORKDIR /app`, `COPY . .`, `RUN pip install -r requirements.txt`, `CMD [\"python\", \"app.py\", \"--serve\"]`. Run the build command inside ~/netauto, the trailing dot means the build context.",
    },
    dk2: {
      title: "Ports and environment",
      story: "The image is ready, but an image on its own does nothing, a container is what runs. netauto waits for jobs on port 8080 and reads its log level from the LOG_LEVEL environment variable. The team wants DEBUG level for the first try.",
      task: "Start a container named netauto in the background from the `netauto:1.0.0` image. Map host port 8080 to container port 8080 and pass the environment variable LOG_LEVEL=DEBUG. Check that it is running with `docker ps`.",
      hint: "`docker run -d --name netauto -p 8080:8080 -e LOG_LEVEL=DEBUG netauto:1.0.0` is enough. -d is detach, -p takes the host and container port, -e takes key equals value.",
    },
    dk3: {
      title: "Logs and exec",
      story: "The container is running, but what is happening inside? Every line the application writes to stdout ends up in the container log. Sometimes you also need to go inside and look at the environment or the files. These two reflexes start every debug session.",
      task: "Read the logs of the netauto container, then run the `env` command inside the container to see that LOG_LEVEL really is DEBUG. Also check where the code lives inside the container with `ls /app`.",
      hint: "docker logs netauto, docker exec netauto env, docker exec netauto ls /app. exec needs a running container.",
    },
    dk4: {
      title: "Layer cache order",
      story: "Every change to app.py makes the build take two minutes because pip install runs again. The cause is the Dockerfile order. When the COPY . . line comes before pip, a code change invalidates that layer and everything after it from the cache. requirements.txt is copied first, pip installs, and the code comes last.",
      task: "Edit the Dockerfile so only requirements.txt is copied first, followed by RUN pip install --no-cache-dir, with the code copied at the very end. Build it, then add a comment line to app.py and build again. On the second build the pip step should show CACHED.",
      hint: "The order is FROM, WORKDIR, `COPY requirements.txt .`, `RUN pip install --no-cache-dir -r requirements.txt`, `COPY . .`, CMD. For the change, `echo \"# cache test\" >> app.py` is enough.",
    },
    dk5: {
      title: ".dockerignore",
      story: "Looking at the build context, the .git directory, __pycache__ and the test files all end up in the image. As the context grows the build slows down, the image bloats, and on top of that the history in .git goes to the registry. Just like git has .gitignore, Docker has .dockerignore.",
      task: "Write a .dockerignore in ~/netauto. .git, tests, __pycache__, *.md and *.log should stay out of the context. Then build again and verify with `docker exec` that the tests directory is no longer in /app.",
      hint: "One pattern per line, for example .git, tests, __pycache__, *.md, *.log. After the build run `docker rm -f netauto`, `docker run -d --name netauto -p 8080:8080 netauto:1.0.0`, `docker exec netauto ls /app`.",
    },
    dk6: {
      title: "Multi-stage and an image diet",
      story: "One dependency needs gcc to compile, so someone switched the base image to `python:3.12`. The image went past 1GB and a push to the registry takes 10 minutes. The fix is a multi-stage build, the compiling happens in a fat builder stage and the final image takes only the installed packages on top of a slim base.",
      task: "Turn the Dockerfile into two stages. The first stage is `python:3.12` AS builder and installs the requirements with `pip install --no-cache-dir --prefix=/install`. The second stage is `python:3.12-slim`, takes the packages with `COPY --from=builder /install /usr/local` and copies the code. Build it as `netauto:1.1.0` and compare sizes with `docker images`.",
      hint: "Two FROM lines, the first with AS builder. In the final stage COPY --from=builder /install /usr/local. The size should stay under 200MB, a single stage on the `python:3.12` base would be over 1GB.",
    },
    dk7: {
      title: "Non root USER and HEALTHCHECK",
      story: "Two items came back from security review. First, the container runs as root, which risks an escape to the host through a vulnerability. Second, the orchestrator does not know whether the container is healthy, the process may be up while the application is frozen. Both are fixed in the Dockerfile.",
      task: "Add RUN useradd -m netauto and USER netauto to the Dockerfile, and define a HEALTHCHECK. Build it as `netauto:1.2.0`, remove the old netauto container and start it again from this image. Check `docker ps` a few times until you see healthy, and `docker exec netauto whoami` should not return root.",
      hint: "`RUN useradd -m netauto && chown -R netauto /app` followed by `USER netauto`. For the healthcheck use the line `HEALTHCHECK --interval=30s --timeout=3s CMD test -f /app/app.py || exit 1`. The USER line must come before CMD.",
    },
    dk8: {
      title: "Push to a registry",
      story: "As long as the image stays on a laptop nobody can use it. The team's own registry is registry.lab, the user name is burak, the password is in the team vault, and for the lab it is netops123. To push you need to tag the image with the registry name, which is what docker tag is for.",
      task: "Log in to registry.lab, tag the `netauto:1.2.0` image as `registry.lab/netauto:1.0.0` and push it. Then verify it shows up in the registry with `curl -s https://registry.lab/v2/netauto/tags/list`.",
      hint: "`docker login registry.lab -u burak -p netops123`, `docker tag netauto:1.2.0 registry.lab/netauto:1.0.0`, `docker push registry.lab/netauto:1.0.0`. Pushing without logging in says no basic auth credentials.",
    },
    dk9: {
      title: "Config and data with volumes",
      story: "netauto writes its audit reports under /app/data, and when the container is deleted the reports are gone. Each environment also needs a different config/settings.yaml without rebuilding the image. A named volume is for persistent data, a bind mount is for handing a file from the host into the container.",
      task: "Create a volume named netauto-data. Start a new container named netauto-vol, mounting the netauto-data volume at /app/data and the host directory ~/netauto/config read only at /app/config. Examine the Mounts section with `docker inspect`.",
      hint: "`docker volume create netauto-data`, then `docker run -d --name netauto-vol -v netauto-data:/app/data -v ~/netauto/config:/app/config:ro netauto:1.2.0`. For a bind mount the path must be absolute, a path starting with ~ also works.",
    },
    dk10: {
      title: "Two containers, one network",
      story: "netauto will use Redis for its job queue. Redis will be a container too, but on the default bridge network containers cannot find each other by name, and memorizing IPs is no way to live. On a user defined network, Docker's DNS resolves container names.",
      task: "Create a network named netauto-net. Start a `redis:7` container named redis on this network. Then start the netauto image as netauto-app on the same network with the environment REDIS_HOST=redis. Prove name resolution with `docker exec netauto-app ping -c 1 redis` and see the cache backend line in the logs.",
      hint: "`docker network create netauto-net`, `docker run -d --name redis --network netauto-net redis:7`, `docker run -d --name netauto-app --network netauto-net -e REDIS_HOST=redis netauto:1.2.0`.",
    },
    dk11: {
      title: "App and redis with Compose",
      story: "Starting two containers by hand is five commands every time, plus the network and volume. A teammate also needs to bring up the same environment with one command. Docker Compose writes this recipe into a YAML file, and `docker compose up -d` handles the rest.",
      task: "Write a compose.yaml in ~/netauto. The app service should be built from this directory, publish port 8080, get LOG_LEVEL and REDIS_HOST=redis as environment, and depend on the redis service with depends_on. The redis service should use the `redis:7` image and keep its data in a named volume. Remove the earlier netauto containers, bring it up with `docker compose up -d` and check with `docker compose ps`.",
      hint: "Under services put app and redis. For app use `build: .` and `\"8080:8080\"` under `ports`. Free the port first with `docker rm -f netauto netauto-app redis`. Compose names the containers netauto-app-1 and netauto-redis-1.",
    },
    dk12: {
      title: "Exit code 1",
      story: "The netauto-prod container deployed last night is not running this morning. `docker ps` is empty and nobody sees anything. Stopped containers drop off the list but are not deleted, they show up with -a. The exit code and the logs tell you why it exited, and inspect tells you how it was started.",
      task: "Find out why the netauto-prod container stopped. Look at the exit code and the environment with `docker ps -a`, `docker logs netauto-prod` and `docker inspect`. Identify the bad value, remove the container and start it again with the same name and the correct environment. At the end netauto-prod should be running.",
      hint: "`docker inspect --format '{{.State.ExitCode}} {{.Config.Env}}' netauto-prod`. The application writes the valid LOG_LEVEL values to the log. `docker rm netauto-prod`, then `docker run -d --name netauto-prod -p 8081:8080 -e LOG_LEVEL=INFO netauto:1.2.0`.",
    },

    k1: {
      title: "Context and namespace",
      story: "The team has a small kind cluster named netops with two nodes. Your kubeconfig has three contexts and one of them is production. Last month a colleague who typed `kubectl delete` in the wrong context taught everyone a lesson. The first job is knowing where you are.",
      task: "List the contexts, switch to the kind-netops context and make netops the default namespace of this context. Then get to know the cluster with `kubectl get ns` and `kubectl get nodes`.",
      hint: "`kubectl config get-contexts`, `kubectl config use-context kind-netops`, `kubectl config set-context --current --namespace=netops`. The line with the asterisk is the active context.",
    },
    k2: {
      title: "First Deployment",
      story: "You do not create pods by hand, you write a Deployment. A Deployment describes the desired state, the controller creates a ReplicaSet, and the ReplicaSet keeps the pods running. For the first try, a simple nginx for the team's documentation site.",
      task: "In ~/k8s/web.yaml write a Deployment named web in the netops namespace. 2 replicas, the label `app: web`, the image `nginx:1.27` and containerPort 80. Apply it with `kubectl apply -f` and see the three layers with `kubectl get deploy,rs,pods`.",
      hint: "apiVersion apps/v1, kind Deployment. Under spec put replicas, selector matchLabels and template. The template metadata labels must match the selector, otherwise the API rejects it. The pods move from ContainerCreating to Running within a few commands.",
    },
    k3: {
      title: "describe and scale",
      story: "Traffic went up and two nginx pods are not enough. First see what is going on, then grow. `kubectl describe` tells a resource's story, with its events at the bottom. Scale only changes the number, the controller does the rest.",
      task: "See which node each pod is on with `kubectl get pods -o wide`, and read the strategy and events with `kubectl describe deployment web`. Then scale web to 4 replicas and wait for all of them to be ready with `kubectl rollout status deployment/web`.",
      hint: "`kubectl scale deployment web --replicas=4`. In the describe output look at the RollingUpdateStrategy and NewReplicaSet lines.",
    },
    k4: {
      title: "Hunting for endpoints",
      story: "Someone wrote a Service for web, but `curl web` from inside the cluster times out. A Service connects to pods by label selector, not by IP. If the selector matches no pod, the Service looks up but nobody is behind it. `kubectl get endpoints` gives that away.",
      task: "Check whether there are pods behind the Service with `kubectl get endpoints web`, and compare the selector with the pod labels using `kubectl describe svc web`. Fix the selector in ~/k8s/web-svc.yaml, apply it again and watch the endpoint list fill up.",
      hint: "The pod label is `app: web`, and the Service selector has a typo. Compare with `kubectl get pods --show-labels`. Fix it and run `kubectl apply -f ~/k8s/web-svc.yaml`.",
    },
    k5: {
      title: "ConfigMap and Secret",
      story: "Now it is netauto's turn, the image you pushed to registry.lab in the docker chapter. Settings like the log level are not baked into the image, they come from a ConfigMap. Things like the Redis password live in a Secret. Both are injected into the container as environment variables.",
      task: "In the netops namespace create a ConfigMap named netauto-config containing LOG_LEVEL=DEBUG and INVENTORY=inventory.yaml, and a Secret named netauto-secret containing REDIS_PASSWORD. Then write the netauto Deployment in ~/k8s/netauto.yaml with the image `registry.lab/netauto:1.0.0`, the ConfigMap through envFrom, and the Secret as the REDIS_PASSWORD env through secretKeyRef. Apply it and see the log level DEBUG line in the pod log.",
      hint: "`kubectl create configmap netauto-config --from-literal=LOG_LEVEL=DEBUG --from-literal=INVENTORY=inventory.yaml`, `kubectl create secret generic netauto-secret --from-literal=REDIS_PASSWORD=r3d1s-s3cret`. In the Deployment use envFrom configMapRef name netauto-config, and env valueFrom secretKeyRef name netauto-secret key REDIS_PASSWORD. For the log use `kubectl logs deploy/netauto`.",
    },
    k6: {
      title: "ImagePullBackOff",
      story: "A colleague created the netauto-api Deployment, but the pods never become Running. The STATUS column shows ErrImagePull, then ImagePullBackOff. The kubelet cannot pull the image, because the tag is wrong, the registry is unreachable, or the image was never pushed. The events give the definitive answer.",
      task: "See the state with `kubectl get pods -l app=netauto-api` and read the error message in the Events section with `kubectl describe pod`. Find the real tag in registry.lab and fix the Deployment with `kubectl set image`. Watch until the pods are Running.",
      hint: "For the registry tag list use `curl -s https://registry.lab/v2/netauto/tags/list`. The fix is `kubectl set image deployment/netauto-api netauto=registry.lab/netauto:1.0.0`. For describe, take the pod name from the `kubectl get pods` output or use `kubectl describe pod -l app=netauto-api`.",
    },
    k7: {
      title: "CrashLoopBackOff",
      story: "The netauto-worker pod keeps restarting, the RESTARTS counter climbs and STATUS is CrashLoopBackOff. The image is right, the container starts and exits immediately. In this situation `kubectl logs` shows the new container, and the real clue is in the log of the previous container that crashed.",
      task: "See the restart count with `kubectl get pods -l app=netauto-worker`. Read the last lines of the crashed container with `kubectl logs --previous` and figure out what the application does not like. Fix the Deployment's environment with `kubectl set env` and get the pod to stay Running.",
      hint: "For the pod name use `kubectl get pods -l app=netauto-worker -o name`. Use `kubectl logs --previous deploy/netauto-worker` or the pod name. The fix is `kubectl set env deployment/netauto-worker LOG_LEVEL=INFO`.",
    },
    k8: {
      title: "Pending pods and resources",
      story: "The netauto-batch pod is stuck in Pending and has never been assigned to a node. To place a pod, the scheduler looks at the requests values, and if no node has that much free CPU and memory the pod waits. In this small cluster the worker node has 4 CPUs, and someone asked for 8.",
      task: "Read the FailedScheduling event with `kubectl describe pod -l app=netauto-batch`. Bring the requests and limits in ~/k8s/netauto-batch.yaml down to reasonable values, for example cpu 250m and memory 128Mi, with limits cpu 500m and memory 256Mi. Apply it and see the pod Running.",
      hint: "The event message says `Insufficient cpu`. Set the cpu value under requests to `\"250m\"`, and the limits must not be smaller than the requests. Then run `kubectl apply -f ~/k8s/netauto-batch.yaml`.",
    },
    k9: {
      title: "Readiness and liveness",
      story: "The netauto pod looks Running, but while the application loads the inventory it cannot take traffic for a few seconds, and sometimes it hangs and freezes. A readiness probe takes a pod that is not ready out of the Service, a liveness probe restarts a frozen container. netauto serves a /healthz endpoint on port 8080.",
      task: "Add a readinessProbe and a livenessProbe to the container in ~/k8s/netauto.yaml, both doing an httpGet on the /healthz path at port 8080. Apply it, wait for the pods' READY column to show 1/1, and see the Liveness and Readiness lines in the `kubectl describe pod` output.",
      hint: "Under containers add readinessProbe httpGet path /healthz port 8080 initialDelaySeconds 3 periodSeconds 5. livenessProbe is the same, with initialDelaySeconds 10. A wrong path returns 404 and the pod never becomes READY.",
    },
    k10: {
      title: "Rolling update and rollback",
      story: "A new version is going out. A Deployment does a RollingUpdate by default, gradually replacing old pods with new ones. With maxUnavailable 0 you never lose capacity. This time the new tag does not exist in the registry, the rollout will get stuck halfway and you will learn to roll back.",
      task: "Add a RollingUpdate strategy with maxSurge 1 and maxUnavailable 0 to ~/k8s/netauto.yaml, set the image tag to 1.1.0 and apply it. See the stuck rollout with `kubectl rollout status` and the old and new pods side by side with `kubectl get pods`. Roll back with `kubectl rollout history` and then `kubectl rollout undo`, and verify the rollout completes.",
      hint: "Under spec add strategy type RollingUpdate, rollingUpdate maxSurge 1 maxUnavailable 0. `kubectl rollout status deployment/netauto --timeout=30s` hangs. `kubectl rollout undo deployment/netauto` goes back to the previous revision, and `kubectl rollout history deployment/netauto` gives the revision list.",
    },
    k11: {
      title: "HorizontalPodAutoscaler",
      story: "During month end audits netauto's CPU hits the ceiling, and at night it sits idle. Instead of fiddling with the replica count by hand, an HPA adds pods when CPU usage goes above the target and removes them when it drops. For the HPA to measure, the container must have cpu requests defined, and netauto does.",
      task: "Create an HPA for the netauto Deployment with at least 2 and at most 5 replicas and a 50 percent CPU target. Generate synthetic load with `kubectl hpa-load start`, watch with `kubectl get hpa` and `kubectl top pods` over a few commands, and see the replica count go up.",
      hint: "`kubectl autoscale deployment netauto --min=2 --max=5 --cpu-percent=50`. Metrics advance one period with each kubectl command, so repeat `kubectl get hpa` three or four times. Finish with `kubectl hpa-load stop`.",
    },
    k12: {
      title: "Production release",
      story: "Every piece is ready, now for the real release. A ClusterIP Service in front of netauto, an Ingress exposing it on the host netauto.lab, and a CronJob that backs up the audit data every night at 02.00. All in a single YAML file, three documents, one apply.",
      task: "Write three documents in ~/k8s/release.yaml. A Service named netauto with the selector `app: netauto`, forwarding port 80 to 8080. An Ingress with ingressClassName nginx that routes the host netauto.lab to port 80 of the netauto Service. A CronJob named netauto-backup that takes a backup with busybox every night at 02.00. Apply it, verify the endpoint and the ingress, then trigger the CronJob by hand with `kubectl create job --from=cronjob/netauto-backup backup-test` and read its log.",
      hint: "Put --- between the documents. The CronJob schedule is `\"0 2 * * *\"`, and under jobTemplate spec template spec go restartPolicy OnFailure and the busybox container. For the Ingress, rules host netauto.lab, http paths path / pathType Prefix backend service name netauto port number 80.",
    },
  },
});

addEn({
  quiz: {
    /* api */
    "HTTP 401 ile 403 arasındaki fark nedir?": { q: "What is the difference between HTTP 401 and 403?", a: ["401 means no credentials or invalid ones, 403 means valid credentials but no permission", "They are the same", "401 is a server error, 403 a client error", "403 means the token has expired"] },
    "PATCH ile PUT arasındaki fark?": { q: "What is the difference between PATCH and PUT?", a: ["PATCH updates partially, PUT replaces the whole resource", "PUT creates a new resource, PATCH deletes", "PATCH takes no body", "There is no difference"] },
    "If-Match header'ı ne işe yarar?": { q: "What is the If-Match header for?", a: ["If the ETag does not match the server returns 412, preventing lost updates", "It sets the cache lifetime", "It says the body is JSON", "It selects the pagination page"] },
    "429 cevabında hangi header kaç saniye bekleneceğini söyler?": { q: "In a 429 response, which header says how many seconds to wait?", a: ["Retry-After", "X-Timeout", "Cache-Control", "Expires"] },
    "requests'te raise_for_status ne zaman exception fırlatır?": { q: "When does raise_for_status in requests raise an exception?", a: ["When the status is 4xx or 5xx", "Always", "Only on 500", "When the JSON is malformed"] },
    "Async bir job oluşturan POST genellikle hangi status ile döner?": { q: "Which status does a POST that creates an async job usually return?", a: ["202 Accepted", "200 OK", "201 Created", "204 No Content"] },
    "requests.Session kullanmanın temel faydası?": { q: "What is the main benefit of using requests.Session?", a: ["Headers, auth and cookies are kept across requests", "Requests go out in parallel", "JSON is validated automatically", "Retries happen automatically"] },
    "Üstel backoff ne demek?": { q: "What does exponential backoff mean?", a: ["The wait time multiplies with every attempt", "The same time is waited on every attempt", "It retries without waiting at all", "A queue is kept on the server side"] },
    /* ci */
    "GitHub Actions'ta needs anahtarı ne yapar?": { q: "What does the needs key do in GitHub Actions?", a: ["It makes a job wait for other jobs to finish, and skips it if one breaks", "It installs the required Python packages", "It defines a secret", "It selects the runner type"] },
    "strategy.matrix ile ne olur?": { q: "What happens with strategy.matrix?", a: ["The same job runs separately for each combination", "Jobs run one after another", "Tests run in parallel threads", "Caching is turned on automatically"] },
    "Bir adımın değerini sonraki adıma aktarmanın doğru yolu?": { q: "What is the right way to pass a value from one step to the next?", a: ["Write it to the $GITHUB_OUTPUT file and read it with steps.id.outputs.name", "Export a global variable", "Write it to a file and read it with cat", "Printing it with echo is enough"] },
    "secrets.X log'da nasıl görünür?": { q: "How does secrets.X appear in the log?", a: ["Masked as `***`", "In plain text", "As Base64", "It never appears, the step is skipped"] },
    "Job'da `environment: production` ve required reviewers tanımlıysa job ne yapar?": { q: "If a job has `environment: production` with required reviewers defined, what does the job do?", a: ["It waits until approval comes", "It runs immediately", "It is skipped", "It runs only on main"] },
    "`if: always()` olan adım ne zaman koşar?": { q: "When does a step with `if: always()` run?", a: ["Even if earlier steps failed", "Only on success", "Only on failure", "Never"] },
    "GitLab CI'da stages ne belirler?": { q: "What do stages define in GitLab CI?", a: ["The order in which jobs run, jobs in the same stage run in parallel", "The number of runners", "The branch filter", "The artifact lifetime"] },
    "actions/cache key içinde hashFiles ne sağlar?": { q: "What does hashFiles in the actions/cache key give you?", a: ["The cache is refreshed when the dependency file changes", "The cache is encrypted", "The cache is opened to all repos", "Nothing, it is a required field"] },
    /* docker */
    "Dockerfile'da hangi talimat sırası pip install katmanının cache'den gelmesini sağlar?": { q: "Which instruction order in a Dockerfile lets the pip install layer come from the cache?", a: ["COPY requirements.txt, RUN pip install, then COPY . .", "COPY . . then RUN pip install", "RUN pip install then COPY requirements.txt", "Order does not matter, BuildKit caches everything"] },
    "docker run -p 8080:80 ne anlama gelir?": { q: "What does `docker run -p 8080:80` mean?", a: ["Host port 8080 goes to container port 80", "Container port 8080 goes to host port 80", "It opens both ports on the host", "It allows only localhost to reach 80"] },
    "Exited (1) durumundaki bir container'ın neden çıktığını ilk nereden anlarsın?": { q: "Where do you first look to see why a container in the Exited 1 state exited?", a: ["In stdout and stderr through docker logs", "In the docker images output", "With docker network inspect", "With docker volume ls"] },
    "Multi-stage build'in ana faydası nedir?": { q: "What is the main benefit of a multi-stage build?", a: ["Build tools do not end up in the final image, so the image is smaller", "The container starts faster", "Several CMDs can run", "No registry login is needed"] },
    "Kullanıcı tanımlı bir bridge network'te container'lar birbirine nasıl ulaşır?": { q: "How do containers on a user defined bridge network reach each other?", a: ["Container names are resolved through DNS", "Only by IP", "Only with --link", "They cannot, host networking is required"] },
    "docker push registry.lab/netauto:1.0.0 için önce ne gerekir?": { q: "What is needed first for `docker push registry.lab/netauto:1.0.0`?", a: ["The image tagged with that name and a docker login", "docker compose up", "The container must be running", "docker system prune"] },
    ".dockerignore ne yapar?": { q: "What does .dockerignore do?", a: ["It filters which files go into the build context", "It deletes files inside the container", "It compresses image layers", "It hides tags in the registry"] },
    "HEALTHCHECK başarısız olunca docker ps STATUS sütununda ne görünür?": { q: "What shows up in the docker ps STATUS column when the HEALTHCHECK fails?", a: ["`(unhealthy)`", "`Exited (1)`", "Restarting", "Paused"] },
    /* git */
    "git switch -c feature/x ne yapar?": { q: "What does git switch -c feature/x do?", a: ["Creates the feature/x branch and switches to it", "Deletes the feature/x branch", "Merges feature/x into main", "Pulls feature/x from the remote"] },
    "Fast-forward merge ne zaman olur?": { q: "When does a fast-forward merge happen?", a: ["When the target branch is a direct ancestor of the branch being merged, the pointer just moves forward", "Every merge is a fast-forward", "Only when there is a conflict", "Only with --no-ff"] },
    "Conflict markerları <<<<<<< HEAD ve >>>>>>> branch ne anlatır?": { q: "What do the conflict markers <<<<<<< HEAD and >>>>>>> branch tell you?", a: ["The upper block is your branch's version, the lower block the merged branch's", "The file is corrupted and must be rewritten", "Git fixed the file automatically", "They are informational only and can be committed"] },
    "Rebase sonrası commit hash'leri neden değişir?": { q: "Why do commit hashes change after a rebase?", a: ["A hash is computed from the content and the parent, when the parent changes the hash changes", "Git generates a hash on every command", "The messages are deleted", "Not because the date changed, it is random"] },
    "git reset --soft main ne yapar?": { q: "What does git reset --soft main do?", a: ["Moves HEAD to main, leaving the index and working tree as they are", "Deletes all changes", "Deletes the main branch", "Resets the remote"] },
    "git cherry-pick ne işe yarar?": { q: "What is git cherry-pick for?", a: ["It applies the change of a single commit to your current branch as a new commit", "It joins two branches", "It picks the best commit and deletes the others", "It creates a tag"] },
    "Annotated tag ile lightweight tag farkı?": { q: "What is the difference between an annotated tag and a lightweight tag?", a: ["An annotated tag is an object with its own author, date and message, a lightweight tag is just a pointer", "There is no difference", "A lightweight tag cannot be pushed", "An annotated tag exists only on main"] },
    "Rebase sonrası git push neden reddedilir?": { q: "Why is git push rejected after a rebase?", a: ["The history on the remote is not an ancestor of the local branch, non-fast-forward", "There is no network", "A tag is missing", "No upstream is set"] },
    "--force-with-lease ile --force farkı?": { q: "What is the difference between --force-with-lease and --force?", a: ["force-with-lease overwrites only if the remote is at the commit you last saw, and refuses if someone else pushed", "They are the same", "force-with-lease is only for tags", "force is safer"] },
    "git reset --hard ile kaybolan commit nasıl bulunur?": { q: "How do you find a commit lost with git reset --hard?", a: ["With git reflog, every commit HEAD visited is listed there", "You cannot, it is gone", "It always shows up with git log --all", "It can only be recovered from the remote"] },
    /* k8s */
    "Bir Deployment pod'larını doğrudan kim yaratır?": { q: "Who directly creates the pods of a Deployment?", a: ["The ReplicaSet the Deployment creates", "kubelet", "Service", "Scheduler"] },
    "kubectl get endpoints web çıktısı <none> ise ilk şüphe?": { q: "If kubectl get endpoints web shows <none>, what is the first suspect?", a: ["The Service selector does not match the pod labels", "The nodes are NotReady", "The image could not be pulled", "The namespace does not exist"] },
    "CrashLoopBackOff pod'unda çöken container'ın log'unu nasıl okursun?": { q: "How do you read the log of the crashed container in a CrashLoopBackOff pod?", a: ["kubectl logs --previous pod", "kubectl describe node", "kubectl get events -A", "kubectl top pod"] },
    "Pod Pending ve event'te Insufficient cpu yazıyorsa?": { q: "What if a pod is Pending and the event says Insufficient cpu?", a: ["The requests value exceeds the free capacity of the node", "The image tag is wrong", "A ConfigMap is missing", "There is no Service"] },
    "Readiness probe başarısız olunca ne olur?": { q: "What happens when a readiness probe fails?", a: ["The pod is removed from the Service endpoints, the container is not restarted", "The container is restarted", "The pod is deleted", "The node is cordoned"] },
    "maxUnavailable 0 ve maxSurge 1 ne demek?": { q: "What do maxUnavailable 0 and maxSurge 1 mean?", a: ["Capacity does not drop during the rollout, one extra pod is started", "The rollout replaces all pods at once", "No new pods are started at all", "The old pods are deleted first"] },
    "kubectl rollout undo ne yapar?": { q: "What does kubectl rollout undo do?", a: ["Reverts the Deployment template to the previous revision", "Deletes the pods", "Deletes the namespace", "Pulls the image from the registry"] },
    "HPA'nın CPU yüzdesi hesaplayabilmesi için container'da ne tanımlı olmalı?": { q: "What must be defined on the container for an HPA to compute a CPU percentage?", a: ["resources.requests.cpu", "livenessProbe", "hostPort", "nodeSelector"] },
    "Secret içindeki değerler kubectl get -o yaml çıktısında nasıl görünür?": { q: "How do the values in a Secret appear in kubectl get -o yaml output?", a: ["base64 encoded", "In plain text", "Encrypted and unreadable", "They do not appear at all"] },
    "kubectl config set-context --current --namespace=netops ne yapar?": { q: "What does kubectl config set-context --current --namespace=netops do?", a: ["Changes the default namespace of the active context", "Creates the netops namespace", "Changes the cluster", "Deletes a context"] },
    /* python */
    "`'administratively down down'.split()` kaç eleman döner?": { q: "How many elements does `'administratively down down'.split()` return?", a: ["3", "2", "1", "It raises an error"] },
    "Regex'te `(?P<host>\\S+)` ne yapar?": { q: "What does `(?P<host>\\S+)` do in a regex?", a: ["Captures a named group called host", "Searches for the word host", "Captures whitespace", "Marks the start of the line"] },
    "`sorted(devs, key=lambda d: (-d[\"uptime\"], d[\"name\"]))` ne sıralar?": { q: "What does `sorted(devs, key=lambda d: (-d[\"uptime\"], d[\"name\"]))` sort by?", a: ["Uptime descending, name ascending on ties", "Uptime ascending, name descending", "Name only", "Uptime ascending only"] },
    "`ip_network(\"10.0.0.1/24\")` neden ValueError verir?": { q: "Why does `ip_network(\"10.0.0.1/24\")` raise ValueError?", a: ["Host bits are set, strict=False is needed", "Prefix 24 is invalid", "It expects IPv6", "It does not accept strings"] },
    "dataclass'ta `tags: list[str] = []` yazınca ne olur?": { q: "What happens when you write `tags: list[str] = []` in a dataclass?", a: ["ValueError, default_factory is needed", "Each instance gets its own list", "It silently becomes None", "It is converted to a tuple"] },
    "Protocol ile isinstance kullanmak için ne gerekir?": { q: "What is needed to use isinstance with a Protocol?", a: ["The @runtime_checkable decorator", "The class must inherit from Protocol", "ABC register", "Nothing, it always works"] },
    "itertools.groupby doğru sonuç için girişten ne bekler?": { q: "What does itertools.groupby expect from its input to give correct results?", a: ["That it is sorted or grouped by the key", "That it is a list", "Unique elements", "A numeric key"] },
    "`Path(\"configs\").rglob(\"*.cfg\")` hangi dosyaları getirmez?": { q: "Which files does `Path(\"configs\").rglob(\"*.cfg\")` not return?", a: ["Files with another suffix like x.cfg.bak", ".cfg files in subdirectories", "Names in uppercase", "Those in hidden directories"] },
    "YAML 1.1'de `enabled: yes` safe_load ile ne olur?": { q: "In YAML 1.1, what does `enabled: yes` become with safe_load?", a: ["True, a bool", "The string `\"yes\"`", "None", "An error"] },
    "csv dosyasını open ederken neden newline=\"\" verilir?": { q: "Why do you pass newline=\"\" when opening a csv file?", a: ["So line endings are not doubled", "To make it faster", "To force UTF-8", "To skip the header"] },
    "Jinja2'de StrictUndefined ne yapar?": { q: "What does StrictUndefined do in Jinja2?", a: ["Raises an error on an undefined variable", "Prints an empty string", "Prints None", "Logs a warning"] },
    "`raise ParseError(...) from exc` ne set eder?": { q: "What does `raise ParseError(...) from exc` set?", a: ["The cause chain through __cause__", "__context__ is deleted", "The traceback is deleted", "The exception is swallowed"] },
    /* test */
    "pytest hangi fonksiyonları test olarak toplar?": { q: "Which functions does pytest collect as tests?", a: ["Functions starting with test_ in files starting with test_", "Every function in every .py file", "Only unittest.TestCase classes", "The main function"] },
    "`assert x == 2, \"mesaj\"` ile `assert(x == 2, \"mesaj\")` arasındaki fark?": { q: "What is the difference between `assert x == 2, \"mesaj\"` and `assert(x == 2, \"mesaj\")`?", a: ["The second is a tuple, so it is always True and the test never fails", "There is no difference", "The second is faster", "The first is a syntax error"] },
    "parametrize ile 4 değer verilen bir test raporda kaç test sayılır?": { q: "A test given 4 values with parametrize counts as how many tests in the report?", a: ["4", "1", "2", "5"] },
    "scope=\"module\" fixture ne zaman kurulur?": { q: "When is a scope=\"module\" fixture set up?", a: ["Once per file", "For every test", "Once per run", "Never"] },
    "conftest.py içindeki fixture testlerde nasıl kullanılır?": { q: "How is a fixture in conftest.py used in tests?", a: ["Without importing, by parameter name", "With from conftest import", "With pytest.use", "It cannot be used"] },
    "pyproject.toml içinde `pythonpath = [\"src\"]` ne yapar?": { q: "What does `pythonpath = [\"src\"]` in pyproject.toml do?", a: ["Adds the src directory to sys.path", "Looks for tests under src", "Installs src as a package", "Nothing"] },
    "tmp_path fixture ne verir?": { q: "What does the tmp_path fixture provide?", a: ["A temporary pathlib.Path directory unique to each test", "The fixed /tmp directory", "A string", "A fake in memory filesystem"] },
    "patch hedefi hangi isim olmalı?": { q: "Which name should the patch target be?", a: ["The name in the module where the function is used", "The name in the module where the function is defined", "The function itself", "Any of them works"] },
    "pytest.raises bloğunda beklenen hata atılmazsa?": { q: "What if the expected error is not raised inside a pytest.raises block?", a: ["The test fails", "The test passes", "The test is skipped", "A warning is printed"] },
    "`pytest -m \"not slow\"` ne yapar?": { q: "What does `pytest -m \"not slow\"` do?", a: ["Deselects the tests marked slow", "Runs only the slow tests", "Speeds up the slow tests", "Lists the markers"] },
    "`xfail(strict=True)` testi beklenmedik şekilde geçerse?": { q: "What if an `xfail(strict=True)` test unexpectedly passes?", a: ["It counts as a failure", "It passes as XPASS", "It is skipped", "It is run again"] },
    "datetime.now kullanan bir testi deterministik yapmanın temiz yolu?": { q: "What is the clean way to make a test that uses datetime.now deterministic?", a: ["Pass the time to the function as a parameter", "Wait with time.sleep", "Do not run the test at night", "Use print instead of assert"] },
  },
});
