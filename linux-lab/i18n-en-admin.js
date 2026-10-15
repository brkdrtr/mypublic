'use strict';
/* English overlay for the pkg, sysadm, remote, jobs and cheat chapters, their variants from variants-admin.js,
   and the QUIZ items and badges defined in missions-sys.js. Format in I18N.md. */
addEn({
  chapters: {
    pkg: { title: 'Package Management', sub: 'apt, dpkg, dnf, configure make install' },
  },
  missions: {
    pk1: {
      title: 'Refresh the list',
      story: 'Before installing anything you refresh the repository lists with apt update. The package database belongs to root, so without sudo apt cannot open the lock file and you get the real error message. Try it without sudo first and learn to recognize that message.',
      task: 'Run apt update first without sudo, then with sudo.',
      hint: '`apt update` downloads the repository lists again and writes them into the package database, which is why it needs root. Without sudo it cannot open the dpkg lock file and asks are you root. Recognizing that message saves time later. update only refreshes the lists and upgrades nothing, upgrading is a separate upgrade step.',
      v: [
        {
          title: 'Where is the lock file',
          story: 'You ssh into the newly built Istanbul branch server. An intern opened a ticket saying apt update does not work. The error message names exactly which file it could not open. Repeat what the intern did, read the message, then do it properly.',
          task: 'Run apt update without sudo, submit the full path of the lock file from the error, then refresh the lists with sudo.',
          hint: '`apt update` writes to the package database, so it wants to lock a file under /var/lib/dpkg, and that file belongs to root. Permission denied and are you root in the error mean a privilege problem, not a network or repository problem. Prefixing the command with `sudo` is enough. Deleting the lock file by hand is never the fix, if another apt is running it corrupts the database.',
        },
        {
          title: 'Pending updates',
          story: 'The security team wants to know which boxes still have an update pending for a newly published SSH vulnerability. If the lists are stale apt cannot know what is upgradable, so refresh the repository lists first. Then apt list --upgradable shows the pending packages.',
          task: 'Refresh the repository lists, list the upgradable packages and submit the name of the SSH server package.',
          hint: '`apt update` downloads the repository lists first, with stale lists new versions never show up. Reading the list does not need root, `apt list` with `--upgradable` prints only packages that have a newer version. The SSH client and server are separate packages, you want the one with server in its name.',
        },
      ],
    },
    pk2: {
      title: 'Search for a package',
      story: 'You need a command line tool that processes JSON but you do not know its name. apt search word searches package names and descriptions, apt show package gives the details.',
      task: 'Search packages for the word json and submit the name of the package you find.',
      hint: '`apt search` looks for your word in package names and short descriptions, that is how you find a tool whose name you do not know. Each package takes two lines in the output, name and version first, description second. Installed ones are marked installed. For details on a candidate use `apt show`.',
      v: [
        {
          title: 'What is filling the disk',
          story: 'The root filesystem on the branch server is 95 percent full and walking it directory by directory with du is slow. A colleague mentions an ncurses disk usage tool you navigate with the arrow keys, but cannot remember its name. apt search looks in descriptions too.',
          task: 'Search packages for the quoted phrase disk usage and submit the package name of the tool you find.',
          hint: '`apt search` matches the pattern against both the package name and the short description. Quoting a two word phrase makes the shell pass it as one argument, so you find descriptions where the words appear together. Without quotes the results get noisier. The first word on the line whose description says disk usage viewer is the package name.',
        },
        {
          title: 'Brute force shield',
          story: 'Every night auth.log fills up with hundreds of Failed password lines from the same IPs. You want a tool that bans an IP automatically after a number of failed attempts. You can guess one word in its name, ban.',
          task: 'Search packages for the word ban and submit the name of the package whose description talks about authentication errors.',
          hint: '`apt search` also works with a short word, any package whose name or description contains it is listed. Very short words can bring unrelated matches, so read the description line and pick the one mentioning authentication errors. To be sure, inspect the candidate with `apt show`.',
        },
      ],
    },
    pk3: {
      title: 'Install htop',
      story: 'Instead of top you want the colorful, interactive htop. It is not installed and running it gives command not found. apt install needs root, without sudo you hit the dpkg lock error. After installing, htop runs, F9 kills, F7 and F8 change nice, q quits.',
      task: 'Install the htop package and run it.',
      hint: '`apt install` downloads and installs the package and writes to the dpkg database, so it needs root. Without sudo you get the dpkg frontend lock error, meaning the install was refused. Once installed the command is in PATH and runs by name. Inside htop q quits, F9 kills, F7 and F8 change nice.',
      v: [
        {
          title: 'Old runbook, old tool',
          story: 'An old runbook you inherited gets user details with finger, but the command is missing on this box, command not found. Install it first, then look at the www-data account that the nginx workers run as. finger is rare these days, you will see its modern replacement in the cheat sheet chapter.',
          task: 'Install the finger package and show the www-data account details with finger.',
          hint: 'command not found usually means the package is not installed, and the lab even suggests which package to install. `apt install` needs root, without sudo you get the lock error. The package name and the command name are not always the same. Here they match, but differences like locate coming from the mlocate package are common.',
        },
        {
          title: 'Who is eating the CPU',
          story: 'The NMS raised a 99 percent CPU alarm for the branch server. You want to look with htop, which is sorted and colorful, instead of top, but it is not installed. Install it, run it and find the PID of the process at the top.',
          task: 'Install the htop package, run it and submit the PID of the process using the most CPU.',
          hint: '`apt install` needs root, so you install with sudo, and afterwards htop is in PATH. By default htop sorts processes by CPU percentage, highest first, so the top row is the heaviest. The PID is the first column, and that number is what kill or renice needs.',
        },
      ],
    },
    pk4: {
      title: 'What is installed',
      story: 'An audit asks for the list of installed packages. apt list --installed gives all of them and you filter with grep. dpkg -l is the low level view of the same information.',
      task: 'Use apt list to check whether nginx is among the installed packages.',
      hint: '`apt list --installed` prints every installed package one per line. The list is long, so pipe it into `grep` to filter. If the line carries the installed tag, the package is installed. `dpkg -l` gives the same information at a lower level, where ii at the start of the line means installed.',
      v: [
        {
          title: 'Is Docker there',
          story: 'The audit form asks whether the branch servers have a container runtime. You do not know the exact package name, only that it contains docker. Filtering the installed package list is enough.',
          task: 'Use apt list to find installed packages containing docker.',
          hint: 'On its own `apt list` lists every package in the repositories, `--installed` keeps only the installed ones. On Ubuntu Docker ships as docker.io, so searching for a fragment with `grep` is easier than guessing the exact name. The installed tag on the line confirms the package is installed.',
        },
        {
          title: 'Is tcpdump ready',
          story: 'Tomorrow night you will capture packets on the WAN side and want to be sure the box has tcpdump. This time skip apt and look at the list from dpkg itself, the lowest layer of the Debian world.',
          task: 'Filter the dpkg -l output to show that the tcpdump package is installed.',
          hint: '`dpkg -l` shows installed packages as a table, ii in the first column means desired state and actual state are both installed. You can filter the list with `grep` or pass the package name to dpkg directly as a pattern. A line starting with rc means the package was removed but its config files remain.',
        },
      ],
    },
    pk5: {
      title: 'Files of a package',
      story: 'What does a package put on disk, and where is its config file. dpkg -L package lists the files of an installed package. You can also ask the other way round, dpkg -S /path/file tells you which package it came from.',
      task: 'List the files of the curl package and submit the full path of the executable.',
      hint: '`dpkg -L` lists every file an installed package put on disk. Executables usually live under /usr/bin or /usr/sbin, config files under /etc. If the package is not installed dpkg says is not installed and you need to install it first.',
      v: [
        {
          title: 'Where is the hdparm config',
          story: 'You want to make disk settings persistent by editing the hdparm config file, but you do not remember its path. In the list of files the package installed, the line under /etc is what you are after.',
          task: 'List the files of the hdparm package and submit the full path of its config file.',
          hint: '`dpkg -L` takes a package name and prints every file that package installed. By Debian convention system wide config files live under /etc, look for that line. Anything under /usr/share/doc is just documentation, not a file you edit.',
        },
        {
          title: 'Who owns this file',
          story: 'On a minimal install ifconfig works and the intern asks which package it comes from. This time you ask in reverse, from file to package. dpkg -S takes a file name or path and tells you the owning package.',
          task: 'Find which package the ifconfig file belongs to and submit the package name.',
          hint: '`dpkg -S` reverses the search direction, going from file to package, and prints the package name at the start of the line. A full path gives a more precise result, with just a name every path ending in that name matches. You need this when removing a tool or installing a missing command on another box.',
        },
      ],
    },
    pk6: {
      title: 'remove and purge',
      story: 'You changed your mind about htop. apt remove removes the package but leaves its config files under /etc, purge deletes everything including the config. For a clean removal use purge.',
      task: 'Remove the htop package together with its config files.',
      hint: '`apt remove` removes the program but leaves the config files under /etc, so a reinstall brings your settings back. `apt purge` deletes everything including config, that is the clean removal. Both need root. After removing, running the command should give command not found.',
      v: [
        {
          title: 'finger has to go',
          story: 'finger did its job, but your security standard says tools that leak user information must not stay on the box. No config traces either.',
          task: 'Remove the finger package together with its config files and confirm the command is gone.',
          hint: '`apt purge` deletes the package and its config files under /etc together, remove keeps the config and leaves an rc line in the dpkg list. Removal also writes to the database, so it needs sudo. Running the command again afterwards is the quickest way to confirm the job is done.',
        },
        {
          title: 'Apache by accident',
          story: 'Someone installed apache2 next to nginx and the two web servers are fighting over port 80. You also do not want Apache leaving config behind under /etc/apache2, it would only confuse people later.',
          task: 'Remove the apache2 package together with its config files and confirm it is no longer in the installed list.',
          hint: 'With a port conflict, removing the extra service is the cleanest fix, and `apt purge` also removes the /etc/apache2 directory. With remove the config files would stay and the old settings would quietly return on the next install. Searching the installed list for apache and getting nothing back completes the check.',
        },
      ],
    },
    pk7: {
      title: 'apt-get for scripts',
      story: 'The mousepad says apt-get. Not wrong, just old. apt is the modern front end built for humans, with a progress bar and color. apt-get has stable output, so it is preferred in scripts and automation, and -y is added to skip the prompts.',
      task: 'Install the tmux package the script way, with apt-get and -y.',
      hint: '`apt-get` is the script friendly ancestor of apt, its output does not change between releases, which is why automation prefers it. `-y` answers yes to every prompt in advance, otherwise the script hangs at the question. It needs root, do not forget sudo.',
      v: [
        {
          title: 'Unattended nmap',
          story: 'A shell step in your Ansible playbook installs nmap on the branch servers and runs at night with nobody watching. You want to try the step by hand in exactly the same form to verify it.',
          task: 'Install the nmap package with apt-get without any confirmation prompt.',
          hint: 'Automation uses `apt-get` because its output is stable across releases. Without `-y` you get the Do you want to continue prompt, and with nobody at the terminal the job waits forever. Root is required so sudo is a must, in a playbook the equivalent is become.',
        },
        {
          title: 'Provision script',
          story: 'You are writing a small first boot script for new branch servers. It should refresh the lists, then install jq, and no step should stop on a prompt. You will run the whole script as root.',
          task: 'Write ~/scripts/provision.sh with nano containing apt-get update and an unattended jq install, then run the script with sudo.',
          hint: 'Inside scripts `apt-get` is preferred because its output is stable. Without `-y` the install step waits for confirmation and the script stops halfway. Running the script with sudo makes every command in it run as root, so you do not need sudo on each line.',
        },
      ],
    },
    pk8: {
      title: 'The other world',
      story: 'The mousepad also lists yum and rpm. Those belong to the RHEL, Fedora, Rocky and Alma family. On modern releases dnf replaced yum, and rpm is the counterpart of dpkg. This box is Ubuntu and has no dnf, but the lab simulates the real output so you can learn it.',
      task: 'Search for htop with dnf and read the note from the lab.',
      hint: '`dnf` is the package manager of the RHEL, Fedora, Rocky and Alma family, the counterpart of apt. `rpm` is the counterpart of dpkg, `-qa` queries all installed packages. Since this box is Ubuntu, the lab simulates real RHEL output and warns you with a note.',
      v: [
        {
          title: 'The yum habit',
          story: 'The runbook of a customer running Rocky Linux still says yum install. On modern RHEL 8 and later, yum is really just a name that points to dnf. Try the command and read the note from the lab.',
          task: 'Try to install the tmux package with yum and read in the note which tool replaces yum.',
          hint: 'On RHEL 8 and later `yum` is a shortcut that redirects to dnf, kept so old scripts do not break. Use dnf in anything new you write, the options are largely the same. This box is Ubuntu, so nothing is actually installed, only the RHEL output is shown.',
        },
        {
          title: 'File list with rpm',
          story: 'Someone asks where the nginx config lives on Rocky. What dpkg -L does on Debian, rpm -ql does on RHEL, q for query, l for list.',
          task: 'List the files of the nginx package with rpm and submit the path of the main config file.',
          hint: '`rpm -q` is query mode, adding `l` lists the package files, `i` gives info, `a` lists all installed packages. It does the same job as `-L` in dpkg. The config file is again under /etc, pick that line from the list.',
        },
      ],
    },
    pk9: {
      title: 'Build from source',
      story: 'A program that is not in the repositories sits as source code in ~/src/hello-2.12. The classic trio, ./configure checks the environment and generates a Makefile, make compiles, sudo make install copies it into the system. The mousepad confused this with the source command, source is something else entirely.',
      task: 'Enter the hello-2.12 directory, run configure and make, then try the program with ./hello.',
      hint: 'Installing from source takes three steps. `./configure` checks the system and generates the Makefile from Makefile.in, the leading ./ means run the script in the current directory. `make` compiles according to the Makefile, and `./hello` runs the built program in place. Skip configure and make says no makefile found.',
      v: [
        {
          title: 'Source in a tarball',
          story: 'The vendor did not put the helper tool for the branch device in a repository, they sent it as hello-2.12.tar.gz under ~/Downloads. Extract the source under ~/build, then build and test it there.',
          task: 'Extract the tarball under ~/build, run configure and make in the hello-2.12 directory, then try the program with ./hello.',
          hint: 'For `tar`, `x` means extract, `z` gzip, `f` file, and `-C` picks the target directory, without it tar extracts into the current directory. Then comes the classic trio, `./configure` generates the Makefile, `make` compiles, `./hello` runs it in place. Type configure without the leading ./ and the shell looks for it in PATH and says command not found.',
        },
        {
          title: 'configure comes first',
          story: 'The intern typed make straight away in ~/src/hello-2.12, got an error and did not understand why. See the same error yourself, understand the cause, then build in the right order.',
          task: 'In the hello-2.12 directory run make first to see the error, then build with configure and make and try ./hello.',
          hint: '`make` reads its instructions from the Makefile, and if the directory only has Makefile.in it says no makefile found. The Makefile is produced by `./configure`, which checks the compiler and libraries and fills in the template. The order never changes, configure first, then make, then try the program.',
        },
      ],
    },
    pk10: {
      title: 'make install',
      story: 'The built program only runs from this directory. make install copies it to /usr/local/bin, which is in PATH, so you can type hello from anywhere. /usr/local belongs to root, so sudo is needed. If you do not want a system directory, ./configure --prefix=$HOME/.local installs into your own.',
      task: 'Install the program into the system and run the hello command regardless of your current directory.',
      hint: '`make install` copies the built program under the prefix set in the Makefile. The default is /usr/local, so the binary goes to /usr/local/bin. That belongs to root, so without sudo you get Permission denied. /usr/local/bin is in PATH, so after installing it runs by name from any directory.',
      v: [
        {
          title: 'Verify with which',
          story: 'You built the vendor tool under ~/build/hello-2.12 and now you will install it into the system. Afterwards use which to confirm which file the command actually runs from, then switch to another directory and try it.',
          task: 'Install hello into the system from ~/build/hello-2.12, switch to /tmp, check its path with which and run the hello command.',
          hint: '`make install` copies under the Makefile prefix, here /usr/local/bin. That belongs to root, so it needs sudo, and trying without sudo gives Permission denied. `which` shows which file a command resolves to in PATH, that is how you tell which one runs when two installs share a name. After installing it runs by name from any directory.',
        },
        {
          title: 'Upgrade the old version',
          story: 'The box already has an old hello 2.10, installed by hand under /usr/local/bin. You will build the new version from the ~/src/hello-2.12 source, install it over the old one, then confirm the hello command now runs the new version.',
          task: 'Run hello first to see the old version, then build and install from ~/src/hello-2.12 and run the hello command again.',
          hint: '`make install` overwrites a file of the same name at the target. Programs installed from source have no version tracking like a package manager does. /usr/local/bin belongs to root, so the install step needs sudo. Running the command before and after and comparing the output proves the upgrade really happened.',
        },
      ],
    },
  },
});

addEn({
  chapters: {
    sysadm: { title: 'System Administration', sub: 'cal, timedatectl, modprobe, shutdown, at, ulimit, ln' },
  },
  missions: {
    sa1: {
      title: 'Calendar',
      story: 'You are picking a date for a maintenance window. cal shows this month, cal 2026 the whole year, cal 12 2026 a specific month. Checking the calendar without leaving the terminal is small, but it pays off ten times a day.',
      task: 'Show December 2026 and submit, in English, the weekday that 25 December falls on.',
      hint: '`cal` with no arguments shows this month. With two arguments you give the month first, then the year, and a single argument prints the whole year. The column headers are Su Mo Tu We Th Fr Sa, so the week starts on Sunday. Do not mistake a single argument for a month, typing 12 gets you the calendar of the year 12.',
      v: [
        {
          title: 'Change window',
          story: 'The customer proposed 1 March 2027 for the MPLS to SD-WAN migration but is not sure whether it is a weekday or a weekend. No need to open a calendar app, the terminal is enough.',
          task: 'Show March 2027 and submit, in English, the weekday that 1 March falls on.',
          hint: 'With two arguments `cal` takes the month number first and the year second. Columns start with Su, so the first column is Sunday and the second is Monday. The day is whichever column the 1st sits under.',
        },
        {
          title: 'Leap year',
          story: 'The SLA report calculates monthly uptime in minutes, and the numbers in the February 2028 report do not add up. You suspect the leap year and need to check whether February has 28 or 29 days.',
          task: 'Show February 2028 and submit how many days it has.',
          hint: 'Given a month and a year, `cal` draws that month in full, and the largest number on the last row is the number of days. Years divisible by 4 are usually leap years, except those divisible by 100 but not by 400. Swap the month and year and cal errors out or prints a different calendar.',
        },
      ],
    },
    sa2: {
      title: 'Addresses',
      story: 'The monitoring team wants every IP address and the FQDN of this box. hostname -I with a capital i gives all addresses, hostname -f the fully qualified domain name. The mousepad says hostname -l, there is no such option, try it in the lab and see the error.',
      task: 'Run hostname -I and hostname -f and submit the eth0 address.',
      hint: '`hostname -I` with a capital i prints all IP addresses of the box separated by spaces, the first one is usually the primary interface. `hostname -f` gives the FQDN, the fully qualified domain name. Lowercase `-i` is different, it returns the address the hostname maps to in /etc/hosts, often 127.0.1.1.',
      v: [
        {
          title: 'FQDN needed',
          story: 'When adding this box to the NMS the monitoring team wants the fully qualified name, not the short one, because SNMP and the certificates will be set up against it. You know the short name and want the domain part.',
          task: 'Find the FQDN of the box with hostname and submit it.',
          hint: 'On its own `hostname` gives the short name, `-f` joins the short name with the DNS domain and prints the fully qualified name. For just the domain part use `-d`. Asking the command instead of assembling the FQDN by hand avoids typos.',
        },
        {
          title: 'Docker bridge',
          story: 'The firewall team asked for every address on the box and the list has a 172.17 address they do not recognize. That is the Docker default bridge, containers reach the outside through it. List all addresses and pick out the Docker one.',
          task: 'List all addresses with hostname -I and submit the Docker bridge address.',
          hint: '`hostname -I` lists every address without interface names, compare with `ip -br addr` to see which belongs to which interface. By default Docker assigns the docker0 bridge an address from 172.17.0.0/16. If that block overlaps the corporate network, container traffic goes to the wrong place, which is why the firewall team is asking.',
        },
      ],
    },
    sa3: {
      title: 'Time zone',
      story: 'Logs are written in CEST but the team is in Istanbul and cron times drift. timedatectl shows the clock, time zone and NTP status, and set-timezone changes the zone. It is a system wide setting so it needs root, valid names come from list-timezones.',
      task: 'Set the time zone to Europe/Istanbul.',
      hint: '`timedatectl` shows the clock, time zone and NTP status on one screen. `set-timezone` is a system wide setting so it needs root, and the name must be in Region/City form. `list-timezones` gives the valid names, filter them with grep. Turkey uses Europe/Istanbul, there is no Ankara zone.',
      v: [
        {
          title: 'Dubai branch',
          story: 'The new Dubai branch server was installed with Amsterdam time and the local team keeps converting log times in their heads. Do not look for an Abu Dhabi zone, the tz database uses the major city that represents the region.',
          task: 'Set the time zone to Asia/Dubai and verify with timedatectl.',
          hint: 'First filter the `list-timezones` output with grep to confirm the exact name, the tz database does not include every city and a wrong name gives Invalid time zone. `set-timezone` is a system wide setting so it needs root. Afterwards the Time zone line should show +04.',
        },
        {
          title: 'Everything in UTC',
          story: 'You are merging branch logs from three countries into a single SIEM, and with every box writing its own local time the event order gets scrambled. The team decision is clear, servers run on UTC and people convert to local time.',
          task: 'Set the time zone to UTC.',
          hint: '`timedatectl` with `set-timezone` changes the zone, and UTC exists in the list as a special name. Servers prefer UTC because it has no daylight saving changes and logs from different countries line up on one timeline. The command needs root, without sudo you get Interactive authentication required.',
        },
      ],
    },
    sa4: {
      title: 'Load a module',
      story: 'The USB disk uses vfat and the kernel module is not loaded. lsmod lists loaded modules, modprobe loads a module with its dependencies and needs root. Loading it also brings in the fat and nls modules, lsmod shows that in the Used by column.',
      task: 'Load the vfat module and verify with lsmod that it is loaded.',
      hint: '`modprobe` loads a kernel module along with its dependencies, and since it adds code to the kernel it needs root. `lsmod` lists loaded modules, the Used by column shows which module uses it. insmod does not resolve dependencies, day to day you use modprobe.',
      v: [
        {
          title: 'VLAN tagging',
          story: 'The branch server will connect to the switch over a trunk and you will create 802.1Q VLAN interfaces on eth1. VLAN support lives in the 8021q module, which is not loaded right now.',
          task: 'Load the 8021q module and verify with lsmod that it is loaded.',
          hint: '`modprobe` takes the module name, not a file path or a .ko extension. Loading 8021q also pulls in garp and mrp, which it depends on, and lsmod shows 8021q in their Used by column. Loading needs root, without sudo you get Operation not permitted.',
        },
        {
          title: 'LACP bond',
          story: 'You will combine two uplinks with LACP into one logical interface, on Linux this is called bonding. If the module is not loaded, bond0 cannot be created.',
          task: 'Load the bonding module and verify with lsmod.',
          hint: '`modprobe` resolves dependencies itself and loads whatever bonding needs. Once loaded you see the bonding line in the `lsmod` output. modprobe only loads it for this boot, to make it persistent write the module name into a file under /etc/modules-load.d.',
        },
      ],
    },
    sa5: {
      title: 'Remove a module',
      story: 'rmmod removes a module, but if other modules depend on it you get in use. ip_tables is an example, iptable_filter uses it. vfat has nothing depending on it and comes out. modprobe -r does the same job while handling dependencies.',
      task: 'First try to remove the ip_tables module and see the error, then remove the vfat module.',
      hint: '`rmmod` takes a module out of the kernel, but if another module uses it you get an in use by error listing the users. Those have to be removed first, a module with no users comes out directly. `modprobe -r` does the same job while taking dependencies into account. Both need root.',
      v: [
        {
          title: 'Undo the VLAN',
          story: 'The trunk plan was cancelled and you want to unload the 8021q module. First try removing x_tables by mistake and see how the firewall modules hold on to it, then remove the right module.',
          task: 'Try to remove the x_tables module and read the error, then remove the 8021q module.',
          hint: '`rmmod` will not remove a module other modules are using, the in use by line tells you who uses it. x_tables is the foundation of the iptables stack, forcing it out would bring the firewall down. If nothing uses 8021q it comes out cleanly, while garp and mrp stay loaded.',
        },
        {
          title: 'Remove the bond',
          story: 'The LACP test is over and you will remove the bonding module, this time with modprobe -r. First try removing the conntrack module and see that the NAT and firewall modules hold on to it.',
          task: 'Try to remove the nf_conntrack module with rmmod, then remove the bonding module with modprobe -r.',
          hint: '`modprobe -r` removes the module and, on a real system, also cleans up dependencies nothing uses anymore. nf_conntrack does connection tracking, NAT and the stateful firewall rely on it, so you get in use by. After removal the bonding line should be gone from lsmod.',
        },
      ],
    },
    sa6: {
      title: 'Open file limit',
      story: 'nginx says too many open files. Each process can only open a limited number of files. ulimit -n shows the soft limit of this shell, ulimit -a shows all limits. The soft limit can be raised up to the hard limit, beyond that needs root. The persistent setting is in /etc/security/limits.conf.',
      task: 'Check the open file limit and set it to 4096 for this shell.',
      hint: '`ulimit -n` shows the soft limit on how many files this shell and the processes it starts can open, give it a number to change it. A regular user can raise the soft limit up to the hard limit, anything above needs root. The change only applies to this shell, the persistent setting goes in /etc/security/limits.conf or LimitNOFILE in a systemd unit.',
      v: [
        {
          title: 'nginx wants 65535',
          story: 'On a busy branch portal the nginx workers report too many open files. Before touching the service you will raise the limit to 65535 in this shell to test.',
          task: 'Check the open file limit and set it to 65535 for this shell.',
          hint: 'On its own `ulimit -n` prints the current soft limit, followed by a number it changes it. If the hard limit is above that value, no root is needed. This only affects processes started from this shell, nginx started by systemd needs LimitNOFILE in its unit file.',
        },
        {
          title: 'Up to the ceiling',
          story: 'A log collector opens a large number of files and you want the limit as high as possible. First find out what the ceiling is, try going above it and see the error, then set it exactly to the ceiling.',
          task: 'Check the hard limit, try a value above it, then set the soft limit equal to the hard limit.',
          hint: 'For `ulimit`, `-H` selects the hard limit and `-S` the soft limit, with neither the soft limit changes. A regular user cannot raise the soft limit above the hard limit and gets Operation not permitted. Raising the hard limit is a job for root or limits.conf.',
        },
      ],
    },
    sa7: {
      title: 'Scheduled shutdown',
      story: 'The box will shut down in 10 minutes for disk maintenance and users should be warned. shutdown +10 message both schedules it and sends a wall message. On modern systemd shutdown alone means poweroff, no -h needed. If you change your mind, shutdown -c. In the lab the box does not really go down, but the messages are real.',
      task: 'Schedule the box to shut down in 10 minutes with a message, then cancel it.',
      hint: '`shutdown` takes the time as `+dakika`, a plus sign followed by minutes, as `hh:mm` or as now, and any text after it goes to every session as a wall message. On modern systemd the default is poweroff, `-r` reboots. `shutdown -c` cancels the plan, both need root.',
      v: [
        {
          title: 'Reboot after a kernel update',
          story: 'A new kernel is installed and needs a reboot to take effect. Give users 15 minutes and state the reason in the message. Then the customer asks for a last minute postponement, so cancel the plan.',
          task: 'Schedule the box to reboot in 15 minutes with a message, then cancel it.',
          hint: 'The `-r` option schedules a reboot instead of a poweroff, and `+15` means 15 minutes from now. The quoted text lands on everyone\'s terminal as a wall message, stating the reason avoids needless tickets. `-c` is enough to cancel, and the cancellation is announced to everyone too.',
        },
        {
          title: 'UPS maintenance',
          story: 'The building UPS is going into maintenance and the box has to shut down in 30 minutes. After you schedule it the electricians say the maintenance is postponed, so announce the cancellation to users with a message as well.',
          task: 'Schedule the box to shut down in 30 minutes with a message, then cancel it, also with a message.',
          hint: 'The time `+30` is in minutes, not seconds. On systemd, with no option you get a poweroff, there is no need to add `-h`. `-c` also accepts a message, and announcing the reason for the cancellation is a good habit.',
        },
      ],
    },
    sa8: {
      title: 'One time job',
      story: 'cron is for recurring jobs, for a one off you use at. It reads the command from stdin, with a time like `now + 5 minutes`, `10:30` or `tomorrow`. atq lists the queue, atrm deletes from it. Time does not pass in the lab, so at-tick runs the queue immediately.',
      task: 'Schedule the hello.sh script for 5 minutes from now, check the queue, then trigger it with at-tick.',
      hint: '`at` puts a one time job in the queue and reads the command to run from stdin, which is why you pipe it in with echo. The time is written like `now + 5 minutes`, `10:30` or tomorrow. `atq` shows the queue, `atrm` deletes from it. Time does not pass in the lab, so at-tick runs the queue immediately.',
      v: [
        {
          title: 'Nightly report',
          story: 'The monthly report script ~/scripts/gece-rapor.sh is ready. You want it to run once tonight at `23:30` when the system load is low. Putting it in cron is pointless, it will never run again.',
          task: 'Schedule gece-rapor.sh for `23:30` with at -f, check the queue with atq and trigger it with at-tick.',
          hint: '`at` can also read the commands from a file with `-f` instead of stdin, and the file contents go into the queue as the job. A time on its own means that time today, and if it has passed it rolls over to tomorrow. `atq` shows the job number and time, at-tick fast forwards time in the lab.',
        },
        {
          title: 'Wrong job in the queue',
          story: 'Yesterday someone put the old backup script into the at queue, and that script now writes to the wrong disk. Delete the queued job and schedule the new backup script for one hour from now instead.',
          task: 'Check the queue with atq, delete the old job with atrm, schedule the yeni-yedek.sh script for one hour from now and trigger it with at-tick.',
          hint: '`atq` gives each job number in the first column, `atrm` takes that number and removes the job from the queue. For the new job pipe the command into `at` with echo, the time is written as `now + 1 hour`. Checking the job contents with `at -c` before deleting makes sure you remove the right one.',
        },
      ],
    },
    sa9: {
      title: 'Watch it live',
      story: 'While the disk fills up, use watch instead of typing df over and over. watch -n 2 command refreshes the screen every two seconds, -d highlights what changed, Ctrl+C exits. The lab shows a single frame.',
      task: 'Watch the df -h command with watch at two second intervals.',
      hint: '`watch` reruns your command at a fixed interval and refreshes the screen. `-n` sets the interval in seconds, `-d` highlights what changed between two refreshes. Ctrl+C exits. If the command contains a pipe, quote it, otherwise the pipe is applied to the output of watch.',
      v: [
        {
          title: 'Memory watch',
          story: 'There is a suspected overnight memory leak on the branch server and you want to watch the available value drop. Refreshing every five seconds is enough.',
          task: 'Watch the free -h command with watch at five second intervals.',
          hint: 'For `watch`, `-n` is the refresh interval, two seconds by default. For `free`, `-h` prints values in readable units like Mi and Gi. When hunting a leak, look at the available column shrinking over time rather than the used value.',
        },
        {
          title: 'Load changes',
          story: 'A cron job seems to make the load average jump at the start of every minute. Watch /proc/loadavg once a second with changing digits highlighted, so nothing slips past you.',
          task: 'Watch the cat /proc/loadavg command with watch at one second intervals, highlighting the differences.',
          hint: '`-d` highlights characters that differ from the previous refresh, which helps with fast changing numbers. `-n 1` runs once a second, if the watched command is heavy such a short interval adds load to the system. The first three numbers in /proc/loadavg are the 1, 5 and 15 minute averages.',
        },
      ],
    },
    sa10: {
      title: 'Shortcut file',
      story: 'Instead of typing the long path to the nginx access log every time, put a symbolic link in your home. ln -s target link, the target comes first. ls -l shows the link with an arrow, cat link reads the target. Without -s you get a hard link, a second name for the same inode.',
      task: 'Create a symbolic link named access.log in your home directory pointing to /var/log/nginx/access.log.',
      hint: '`ln -s` creates a symbolic link, the target comes first and then the link name, mixing up the order is the most common mistake. `ls -l` shows the link with an arrow and its target. Without `-s` you get a hard link, and directories cannot be hard linked.',
      v: [
        {
          title: 'Shortcut to the log directory',
          story: 'You are tired of typing the long path under /var/log/nginx on every incident. You want a shortcut not to a single file but to the directory itself, named nginxlogs in your home.',
          task: 'Create a symbolic link named nginxlogs in your home directory pointing to the /var/log/nginx directory and list its contents.',
          hint: 'Symbolic links can point to directories, hard links cannot. The order is always target first, then link name, reverse it and you create a link to a target that does not exist. Adding a trailing / when listing the link with ls shows the contents of the target directory instead of the link itself.',
        },
        {
          title: 'Switch the release',
          story: 'The application keeps each version under /opt/sdwan-portal/releases, and the service always reads the /opt/sdwan-portal/current path. current points to v1.4 right now and you are moving to v1.5. Instead of deleting and recreating the link, overwrite it with a single command.',
          task: 'Point the /opt/sdwan-portal/current link to the /opt/sdwan-portal/releases/v1.5 directory.',
          hint: 'For `ln`, `-s` means symbolic, `-f` removes the existing link and puts the new one in place, and `-n` says do not follow the existing link as a directory if it points to one. Without `-n` the new link lands inside the directory current points to, and current stays unchanged. This pattern turns a deploy rollback into a single command.',
        },
      ],
    },
  },
});

addEn({
  chapters: {
    remote: { title: 'Remote Access and Transfer', sub: 'ssh, ssh-keygen, scp, rsync, sftp, gpg' },
  },
  missions: {
    rm1: {
      title: 'Remote command',
      story: 'There is a backup.lab server holding the nightly backups, registered in ~/.ssh/known_hosts and ~/.ssh/config. The ssh host command form runs the command remotely and brings back the output, without opening an interactive session. For a different port use -p, for a different user user@host.',
      task: 'Run the hostname command on backup.lab.',
      hint: '`ssh` runs everything you type after the host name as a remote command and brings back the output, with no interactive session. For a different user use user@host, for a different port `-p`. With the wrong port you get Connection refused, meaning the server is not listening on that port.',
      v: [
        {
          title: 'How long has web01 been up',
          story: 'You suspect web01.lab rebooted overnight. Instead of logging in and waiting for a prompt, you want the uptime output in a single line.',
          task: 'Run the uptime command on web01.lab.',
          hint: 'With `ssh` the words after the host name become the remote command, and the connection closes by itself when it is done. The up time in the uptime output is the time since the last reboot. If the remote command contains a pipe, quote all of it, otherwise the pipe runs on your own machine.',
        },
        {
          title: 'Edge kernel version',
          story: 'The edge-ist.lab box in Istanbul carries the SD-WAN overlay and the vendor wants the exact kernel version for a kernel bug. You do not need an interactive login.',
          task: 'Run uname -a on edge-ist.lab and confirm the output comes from that box.',
          hint: 'With `ssh` you type the command and its options after the host name as is, `-a` goes to uname, not to ssh. The second field of the uname output is the hostname of the remote box, that is how you know you are on the right one. If the host name does not resolve you get Could not resolve hostname, check /etc/hosts or DNS.',
        },
      ],
    },
    rm2: {
      title: 'Generate a key',
      story: 'Typing a password every time is both tiring and insecure. ssh-keygen generates a key pair, the private key stays with you and the public key is distributed to servers. The modern choice is ed25519, short and fast. -C is the comment field, so you can tell whose key is which.',
      task: 'Generate an ed25519 key pair with the comment burak@linuxlab.',
      hint: '`ssh-keygen` generates a key pair, the private key stays with you under ~/.ssh and the public key with the .pub extension goes to servers. `-t` picks the type, ed25519 is the modern choice. `-C` is the comment field, it tells you in authorized_keys who the key belongs to. Never copy or share the private key.',
      v: [
        {
          title: 'RSA for an old device',
          story: 'The management interface of an old firewall at the branch does not understand ed25519 and only accepts RSA. Generate a 4096 bit RSA key with a comment saying what it is for.',
          task: 'Generate a 4096 bit RSA key pair with the comment burak@legacy-fw.',
          hint: '`-t rsa` picks the type and `-b` is the bit length. Do not go below 3072 for RSA, 4096 is compatible with old devices and secure. Without a file name the key is saved as id_rsa and id_rsa.pub. If a file with that name exists ssh-keygen asks before overwriting, be careful not to clobber your existing key.',
        },
        {
          title: 'Deploy key',
          story: 'The CI pipeline will deploy to the branch servers. Instead of your personal key you want a separate deploy key without a passphrase, in its own file so your personal key is not overwritten.',
          task: 'Generate an ed25519 key with no passphrase and the comment deploy@linuxlab in the file ~/.ssh/deploy_ed25519.',
          hint: '`-f` sets the file the key is saved to, without it you risk overwriting the default id_ed25519. `-N` gives the passphrase on the command line, empty quotes mean no passphrase. Automation needs that, which is exactly why you must protect the file well. The `-C` comment shows the key owner in authorized_keys.',
        },
      ],
    },
    rm3: {
      title: 'Distribute the key',
      story: 'ssh-copy-id appends your public key to ~/.ssh/authorized_keys on the remote server and asks for the password one last time. To do it by hand, append the output of cat ~/.ssh/id_ed25519.pub to that file and set it to 600.',
      task: 'Copy your public key to the backup.lab server.',
      hint: '`ssh-copy-id` appends your public key to ~/.ssh/authorized_keys on the remote server and also sets the file and directory permissions correctly. It asks for the password one last time. By hand you append the contents of the .pub file to that file, then set the file to 600 and the directory to 700.',
      v: [
        {
          title: 'A key for web01',
          story: 'You type a password on every deploy to web01.lab. Distribute your existing key there so it stops asking.',
          task: 'Copy your public key to the web01.lab server and check the authorized_keys file.',
          hint: '`ssh-copy-id` finds the default public key under ~/.ssh and appends it to the remote authorized_keys file, skipping it if it is already there. Only the .pub file goes over, the private key never leaves your machine. To check, cat the remote file over ssh, and you see the key comment at the end of the line.',
        },
        {
          title: 'Distribute the deploy key',
          story: 'You will put the separate deploy key on the NMS server nms.lab, not your personal key. ssh-copy-id picks the personal key by default, so you have to say explicitly which file to send.',
          task: 'Copy the ~/.ssh/deploy_ed25519.pub key to the nms.lab server.',
          hint: '`-i` selects the public key file to send, without it ssh-copy-id uses a default like id_ed25519 or id_rsa. Giving the file name with .pub makes clear what goes over, the private key is never sent. After copying, the comment on the remote authorized_keys line should read deploy@linuxlab.',
        },
      ],
    },
    rm4: {
      title: 'Passwordless login',
      story: 'backup.lab should no longer ask for a password. Try it, if there is no password line in the output you got in with publickey. On the server side auth.log records Accepted publickey.',
      task: 'Run whoami on backup.lab and confirm no password is asked.',
      hint: 'If the key was distributed correctly `ssh` logs in without a password prompt and you see no password line. If it still asks, the remote ~/.ssh permissions or the authorized_keys contents are wrong. On the server side auth.log records whether each login used publickey or password.',
      v: [
        {
          title: 'The proof is in auth.log',
          story: 'The auditor wants proof that web01.lab is accessed with a key, not a password. The server log itself is the best proof, the last line will be your own login a moment ago.',
          task: 'Show the last line of /var/log/auth.log on web01.lab over ssh and confirm the login used publickey.',
          hint: 'You run `tail` as a remote command with `ssh`, `-1` fetches the last line, which is your own login just now. Accepted publickey means a key was used, Accepted password means a password. If you were asked for a password your key is not in authorized_keys, fix that first.',
        },
        {
          title: 'Asks for a password, so distribute',
          story: 'Automation cannot connect to edge-ist.lab because it is asked for a password. Try it first and see the password prompt, then distribute your key there and try again.',
          task: 'Run whoami on edge-ist.lab, and if a password is asked copy your key over and try again.',
          hint: 'Seeing a password line on the first try means your key is not on that server. `ssh-copy-id` appends the public key to the remote authorized_keys, and without a user it connects with your local user name. On the second try the output should be just the user name, with no password line in between.',
        },
      ],
    },
    rm5: {
      title: 'Send a file',
      story: 'scp works like cp, with one side written as `user@host:yol`, where yol is the remote path. Send your notes to the backup server. The colon matters, forget it and scp copies to a local file.',
      task: 'Copy the notes.txt file to the /var/backups directory on the backup.lab server.',
      hint: '`scp` takes a source and a target like cp, and the remote side is written as `host:yol`, host, colon, path. Forget the colon and scp creates a local file and sends nothing. A trailing / on the target makes it clear that it is a directory.',
      v: [
        {
          title: 'Send the config for review',
          story: 'Your senior colleague on web01.lab will look at why the nginx config fails to load. Drop the file into /tmp over there and they will pick it up.',
          task: 'Copy /etc/nginx/nginx.conf to the /tmp directory on web01.lab and confirm over ssh that it is there.',
          hint: 'For `scp` the source is the local file and the target is a remote directory written as `host:yol`. Forget the colon on the target and you get a local file named web01.lab, without even an error. The remote /tmp is world writable, so dropping the file there causes no permission issues.',
        },
        {
          title: 'Latency report to the NMS',
          story: 'You exported the monthly branch latency measurements as CSV, and they are collected under /srv/reports on the NMS server nms.lab. Send the report there.',
          task: 'Copy ~/reports/latency-2026-10.csv to the /srv/reports directory on nms.lab.',
          hint: '`scp` takes source and target in the same order as cp, first the file to send, then `host:dizin`, host, colon, directory. A remote path starting with / is read from the root, otherwise from the remote home. If the target directory does not exist remotely scp does not create it and says No such file or directory.',
        },
      ],
    },
    rm6: {
      title: 'Restore a backup',
      story: 'The reverse direction uses the same logic, the source is remote and the target is local. The old backup notes-2026-10-01.tar.gz is on backup.lab. Download it and look inside with tar tzf before extracting.',
      task: 'Download /var/backups/notes-2026-10-01.tar.gz to /tmp and list its contents.',
      hint: 'The same logic applies in reverse, the source is `host:yol` and the target is a local directory. Looking inside a downloaded archive with `tar tzf` before extracting stops files from spilling into paths you did not expect. t means list, z gzip, f file.',
      v: [
        {
          title: 'web01 log on your desk',
          story: 'There are reports of strange requests on web01.lab. Download the access log to your own machine, grep it there at leisure and leave no traces on the server.',
          task: 'Download /var/log/nginx/access.log from web01.lab as /tmp/web01-access.log and show its 404 lines with grep.',
          hint: 'With `scp`, when the source is remote you write `host:yol` first, then the local target. Give a file name instead of a directory as the target and the download is saved under that name, which avoids collisions when pulling identically named logs from several servers. Then filter the status code with `grep`.',
        },
        {
          title: 'Edge config backup',
          story: 'The FRR and netplan settings on edge-ist.lab were backed up last night. Before making changes, pull the backup into ~/restore and check what is inside without extracting it.',
          task: 'Download /var/backups/edge-config-2026-10-12.tar.gz from edge-ist.lab into ~/restore and list its contents.',
          hint: 'When `scp` downloads a remote file into a local directory, that directory must exist, and the trailing / makes it explicit. For `tar`, `t` lists the archive without extracting, `z` means gzip, `f` takes the file name. If the list shows an absolute path or anything starting with .. stop before extracting.',
        },
      ],
    },
    rm7: {
      title: 'Send a directory',
      story: 'web01.lab is the new web server. You will move the webapp directory there, and a directory needs -r. ~ means the home of the target, so `scp -r dizin host:~/` lands it under the remote home, where dizin is the directory.',
      task: 'Copy the ~/projects/webapp directory to your home directory on the web01.lab server.',
      hint: '`scp` needs `-r` to copy a directory, otherwise it says not a regular file. On the remote side ~ is the home directory of the target user. The source directory itself is copied into the target under the same name.',
      v: [
        {
          title: 'Move the templates to the edge',
          story: 'You prepared the branch config templates under ~/configs/branch-templates. They will be rendered on edge-ist.lab, so send the whole directory to your home there.',
          task: 'Copy the ~/configs/branch-templates directory to your home directory on edge-ist.lab.',
          hint: '`-r` copies the directory with everything in it, forget it and scp says not a regular file and skips the directory. On the target ~ means the home of the remote user, and since it comes after the colon your local shell does not expand it. To check, run ls remotely and see that the files arrived.',
        },
        {
          title: 'Pull the web01 config',
          story: 'You want to diff the nginx settings of web01.lab on your own machine. Download the whole remote /etc/nginx directory as ~/web01-nginx.',
          task: 'Download the /etc/nginx directory from web01.lab as ~/web01-nginx and list its contents.',
          hint: '`-r` works in reverse too, the source is the remote directory and the target a local path. If the target path does not exist the directory is created under that name, if it does the source directory goes inside it as nginx. Knowing this difference saves time when looking for the files. Reviewing the remote config in a local copy removes any risk of changing the server by accident.',
        },
      ],
    },
    rm8: {
      title: 'Deploy with rsync',
      story: 'Sending the whole directory with scp on every deploy is wasteful, rsync only sends what changed. -a preserves permissions and timestamps, -v lists files, -z compresses. --delete removes files from the target that no longer exist in the source, which is why you do a dry run with -n first. A trailing / on the source sends its contents, without / the directory itself.',
      task: 'Sync the contents of webapp to /var/www/html on web01.lab with --delete, dry run first.',
      hint: '`rsync` only sends files that changed. `-a` preserves permissions, ownership and timestamps, `-v` lists what goes over, and `-n` does a dry run that changes nothing. `--delete` removes files on the target that are not in the source, so you read the deleting lines in the dry run output first. A trailing / on the source sends the contents of the directory.',
      v: [
        {
          title: 'Dashboards to the NMS',
          story: 'You keep the Grafana dashboard exports under ~/dashboards, and /var/www/dash on nms.lab is where they are published. An old MPLS dashboard that is no longer used is still there and should go after the sync.',
          task: 'Sync the contents of ~/dashboards to /var/www/dash on nms.lab with --delete, doing a dry run first.',
          hint: 'Add `-n` for the dry run and check that the deleting lines only show files you expect to be removed. Forget the trailing / on the source and the dashboards directory itself is copied into the target, and --delete removes files you did not expect. If the output is clean, run the same command without `-n`.',
        },
        {
          title: 'Mirror of web01',
          story: 'You keep a mirror of the web root of web01.lab on your machine under ~/mirror/web01. This time the direction is reversed, the source is the remote server. The local mirror still has an old banner file long gone from the server, and the sync should clean that up too.',
          task: 'Pull the contents of /var/www/html on web01.lab into ~/mirror/web01 with --delete, doing a dry run first.',
          hint: 'The `rsync` direction is set by the order of source and target, with the remote side first you pull. This time `--delete` removes the extras in the local mirror, do not go for the real run before you see the deleting line in the dry run. The trailing / on the source fetches the contents of html, not the directory itself.',
        },
      ],
    },
    rm9: {
      title: 'sftp',
      story: 'sftp is interactive file transfer over ssh. sftp user@host opens an sftp> prompt where get downloads, put uploads, ls and cd navigate, quit exits. These are sftp session commands, type get in bash and you get command not found. The lab has no prompt, the one line form `sftp host:dosya` downloads a file.',
      task: 'Download /var/backups/README from backup.lab into your home directory with sftp.',
      hint: '`sftp` opens an interactive transfer over ssh, at the sftp> prompt get downloads, put uploads, ls and cd navigate. These are not bash commands. In one line form `sftp host:yol` downloads the file into your current directory, so change to the right directory first.',
      v: [
        {
          title: 'sftp with a batch file',
          story: 'Every morning you pull the same log from web01.lab and type the same commands in interactive sftp. sftp -b reads commands from a file, which makes the job ready to go into cron.',
          task: 'Write ~/web01.batch with nano containing a get line that downloads access.log as web01-access.log, then change to your home and run it with sftp -b.',
          hint: 'For `sftp`, `-b` reads commands line by line from a file, so you write into the file whatever you would type at the prompt. get takes the remote path first and then the local name, a relative local name lands in your current directory. In batch mode sftp stops when a command fails, which prevents silent half done jobs in cron.',
        },
        {
          title: 'Fetch the SLA report',
          story: 'The NMS server nms.lab drops the weekly SLA report under /srv/reports. You want the report in ~/Documents, using the one line form of sftp.',
          task: 'Change to the ~/Documents directory and download /srv/reports/sla-week41.txt from nms.lab with sftp.',
          hint: 'For `sftp` the `host:yol` form downloads a single file without opening a session and puts it in your current directory. That is why you cd into the target directory first, otherwise the file lands wherever you happen to be. A remote path not starting with / is resolved relative to the remote home.',
        },
      ],
    },
    rm10: {
      title: 'Encrypted backup',
      story: 'You will send the report to the backup server, but it must not sit there as plain text. gpg -c encrypts symmetrically, the same passphrase decrypts it, and it produces file.gpg. Real gpg asks for the passphrase in a window, in the lab you pass it with --batch --passphrase. After sending, wipe the local encrypted copy from disk with shred -u, rm only removes the reference.',
      task: 'Encrypt rapor.txt with gpg, send the .gpg file to /var/backups on backup.lab, then destroy the local .gpg file with shred.',
      hint: '`gpg -c` encrypts symmetrically, the same passphrase decrypts it, and it produces file.gpg. `--batch --passphrase` passes the passphrase on the command line, use it carefully in real life because it stays in the history. `shred -u` overwrites the file contents with random data and deletes it, rm only removes the directory entry.',
      v: [
        {
          title: 'Customer config',
          story: 'The running config export of the edge-ist box sits as plain text under ~/exports and contains VPN PSKs. Encrypt it, send the encrypted copy to backup.lab, then wipe the plain text from disk.',
          task: 'Encrypt ~/exports/edge-ist-running.cfg with gpg, send the .gpg file to /var/backups on backup.lab, then destroy the plain text file with shred.',
          hint: '`gpg -c` creates an encrypted copy with the .gpg extension in the same directory and leaves the original alone. rm is not enough to delete the plain text, `shred` overwrites the contents first and `-u` then deletes the file. Do not mix up the order, if you destroy the plain text before seeing the transfer succeed you are left with only the encrypted copy.',
        },
        {
          title: 'Decrypt the PSK',
          story: 'You need the key for the ist-ams tunnel in the encrypted vpn-psk.txt.gpg file on backup.lab, the passphrase is Branch2026. Download it, decrypt it, read it, then permanently destroy the decrypted plain text.',
          task: 'Download the file to /tmp, decrypt it with gpg, read its contents, then destroy the decrypted file with shred.',
          hint: 'Given an encrypted file as argument, `gpg` drops the .gpg extension and writes the plain text next to it, with `-d` it prints to the screen instead. A wrong passphrase gives Bad session key. When you are done, overwrite the plain text with `shred`, because after rm the data stays readable on disk.',
        },
      ],
    },
  },
});

addEn({
  chapters: {
    jobs: { title: 'Job Control and Priority', sub: '&, jobs, fg, bg, nohup, nice, renice, trap' },
  },
  missions: {
    jb1: {
      title: 'Send it to the background',
      story: 'A long running command locks up the terminal. Put & at the end and it runs in the background, the shell gives you the prompt right away and prints the job number and PID. jobs lists the background jobs of this shell, with -l the PID shows too, and the same process appears in ps. The job number belongs to this shell, the PID is system wide.',
      task: 'Start sleep 300 in the background, then view the job list with PIDs using jobs -l.',
      hint: 'With `&` at the end the shell starts the command in the background and returns the prompt immediately, printing the job number in square brackets and the PID next to it. `jobs` lists the background jobs of this shell, `-l` adds the PID. The job number only means something in this shell, the PID is system wide.',
      v: [
        {
          title: 'Let syslog flow in the background',
          story: 'A branch link keeps flapping and you want to watch syslog live without locking up your terminal. Send tail -f to the background so it sits in the job list.',
          task: 'Start tail -f /var/log/syslog in the background and view it with its PID using jobs -l.',
          hint: '`tail -f` follows the file and never ends on its own, so without `&` at the end the terminal is stuck on it. `jobs -l` shows the job number, PID and state, you should see Running. The background tail still writes to the same terminal, if the screen gets noisy bring it forward with fg and stop it with Ctrl+C.',
        },
        {
          title: 'Tunnel ping in the background',
          story: 'You are doing maintenance on the IPsec tunnel to edge-ist.lab and want a continuous ping to 10.50.0.61 to catch any drop. Let the ping run in the background while you keep typing other commands.',
          task: 'Start a continuous ping to 10.50.0.61 in the background and view it with jobs -l.',
          hint: 'Without a count `ping` runs forever, and `&` at the end sends it to the background. With the PID from `jobs -l` you find the same process in ps. Had you given a count with `-c`, ping would finish by itself and drop off the job list.',
        },
      ],
    },
    jb3: {
      title: 'Stop and resume',
      story: 'In a real terminal Ctrl+Z stops the foreground command, bg resumes it in the background, fg brings it to the front. The lab has no Ctrl+Z, kill -STOP %1 has the same effect. %1 is job addressing and works with kill, fg and bg alike.',
      task: 'Stop job number 1, see Stopped with jobs, then resume it in the background with bg.',
      hint: '`kill -STOP` stops a process, the same effect as Ctrl+Z, and `jobs` shows it as Stopped. `bg` resumes a stopped job in the background, `fg` brings it to the front. Job addresses like %1 can be used instead of a PID with kill, bg and fg.',
      v: [
        {
          title: 'Freeze the tail',
          story: 'The background tail -f keeps flooding the screen and you cannot read the output while editing a config. You do not want to kill it, just freeze it and resume later. Address the job by name rather than number.',
          task: 'Stop the tail job by name, see Stopped with jobs, then resume it in the background with bg.',
          hint: 'A job address starts with `%`, followed by a number or the start of the command, `%tail` means the job starting with tail. `-STOP` freezes the process in a way it cannot catch, and `jobs` shows Stopped. `bg` with the same address resumes the job in the background where it left off.',
        },
        {
          title: 'By signal number',
          story: 'The ping output in the background is distracting you. This time send the signal by number instead of name, SIGSTOP is 19 on Linux. List only the stopped jobs, then resume.',
          task: 'Stop the ping job with signal number 19, see only the stopped jobs with jobs -s, then resume it with bg.',
          hint: '`kill` accepts a signal by name or number, `-19` is SIGSTOP on Linux and `kill -l` prints the full list. `jobs -s` shows only Stopped jobs, `-r` only Running ones. Signal numbers can differ between architectures, so names are safer in scripts.',
        },
      ],
    },
    jb4: {
      title: 'Bring it to the front',
      story: 'fg brings a job to the front, the terminal is attached to it and the prompt returns when it ends. In real life you would wait five minutes for sleep 300 or interrupt it with Ctrl+C, the lab treats the job as finished.',
      task: 'Bring the sleep 300 job to the front.',
      hint: '`fg` brings a job to the front and attaches the terminal to it, the prompt does not return until the job ends or you interrupt it with Ctrl+C. With a single job no argument is needed, with several you pick one with %number. A job brought to the front no longer shows up in the jobs list.',
      v: [
        {
          title: 'Bring tail to the front',
          story: 'Your config work is done and now you want to focus on syslog full screen. Bring the background tail -f to the front.',
          task: 'Bring the tail job to the front.',
          hint: '`fg` takes a job address the same way as kill and bg, `%tail` means the job starting with tail. The command brought forward holds the terminal, on a real system you close it with Ctrl+C or stop it again with Ctrl+Z. The lab treats the job as finished once it is in the foreground.',
        },
        {
          title: 'Pick by content',
          story: 'Maintenance is over, you will bring the tunnel ping to the front, check the last results and close it. You remember the IP inside the command, not how it starts, so address the job by content.',
          task: 'Bring the job containing 10.50 to the front.',
          hint: 'A job address starting with `%?` searches for text anywhere in the command, while `%ping` only looks at the start. If several jobs match, the shell says ambiguous job spec and you use the number instead. Once in the foreground, Ctrl+C stops ping and it prints the summary statistics.',
        },
      ],
    },
    jb5: {
      title: 'nohup',
      story: 'A background job gets SIGHUP and dies when the terminal closes. nohup command & ignores that signal and writes the output to nohup.out. Modern alternatives are tmux or systemd-run, but nohup is available everywhere.',
      task: 'Run the hello.sh script in the background with nohup and read the nohup.out file.',
      hint: '`nohup` makes the command ignore the SIGHUP signal, so it does not die when the terminal closes. It writes the output to nohup.out in the current directory. To send it to the background you still need `&` at the end, nohup does not do that itself.',
      v: [
        {
          title: 'Let the export run overnight',
          story: 'The CDR export script runs for hours, and when you drop off the VPN your session goes with it. Start the script with nohup so it keeps running even if the connection goes away, with its output kept in the reports directory.',
          task: 'Change to the ~/reports directory, run the export-cdr.sh script in the background with nohup and read the nohup.out file.',
          hint: 'nohup.out is written to the current directory, so you first cd to where you want the output. The trailing `&` sends the job to the background, `nohup` blocks the SIGHUP that arrives when the terminal closes, these are two different jobs. If the directory is not writable nohup writes to nohup.out in your home instead.',
        },
        {
          title: 'Your own log file',
          story: 'You do not want the tunnel check script output mixed into a generic file like nohup.out, it should go to its own log. Redirect stdout and stderr to a file and nohup.out is no longer needed.',
          task: 'Run the tunnel-check.sh script in the background with nohup, send all of its output to ~/tunnel-check.log, then read the log.',
          hint: '`>` redirects stdout to a file, `2>&1` sends stderr wherever stdout goes. Order matters, first the file, then 2>&1. When stdout already goes to a file, real nohup does not open a nohup.out as well. The `&` at the very end sends it all to the background.',
        },
      ],
    },
    jb6: {
      title: 'Low priority',
      story: 'A big archiving job should not slow the system down. nice -n 10 command starts it with niceness 10. Niceness 19 is the lowest priority, -20 the highest, and negative values need root. You see it with ps -o pid,ni,cmd. $! is the PID of the last background job.',
      task: 'Start sleep 500 in the background with niceness 10 and check the NI column with ps.',
      hint: '`nice` starts a command at a lower priority, `-n` sets the niceness. 19 is the lowest priority, -20 the highest, negative values need root. `ps` with `-o pid,ni,cmd` shows only the columns you ask for, and `$!` is the PID of the last background job.',
      v: [
        {
          title: 'Let the report run slow',
          story: 'The Python script that builds the monthly report lives under /opt/report and hogs the CPU, affecting live traffic. Start the script in the background with niceness 15 so the kernel gives CPU to other work first.',
          task: 'Start python3 /opt/report/build_report.py in the background with niceness 15 and check the NI value with ps.',
          hint: '`nice` goes in front of the command, `-n` gives the niceness, and `&` stays at the very end. The NI column in ps should show 15. nice does not throttle the CPU, it only changes the order of priority under contention, so on an idle system the script still runs at full speed.',
        },
        {
          title: 'Alarm test',
          story: 'To test that the CPU alarm on the NMS works, you will generate artificial load on the box. So production traffic is not affected, the load generator should run at the lowest priority, with the yes output going to /dev/null.',
          task: 'Start the yes command in the background with niceness 19 and its output going to /dev/null, then check the NI value with ps.',
          hint: '19 is the lowest priority, the kernel gives CPU to other processes first, but yes still takes every idle cycle, which is why the alarm fires. `> /dev/null` throws away the endless yes output, otherwise the terminal fills up. `$!` is the last background PID, you pass it to ps with `-p`.',
        },
      ],
    },
    jb7: {
      title: 'renice',
      story: 'renice changes the priority of a running process, renice -n 15 -p PID. A regular user can only increase niceness, meaning lower the priority, undoing that needs root. So you can go from 10 to 15 but not down to 5.',
      task: 'Set the niceness of the sleep 500 process to 15.',
      hint: '`renice` changes the niceness of a running process, `-n` is the new value and `-p` the PID. A regular user can only increase the value, meaning lower the priority, decreasing it needs root. You find the PID with `$!`, `jobs -l` or pgrep.',
      v: [
        {
          title: 'Back off even more',
          story: 'Even at 15 the report script slows down the customer portal. First try lowering it to 10 by mistake and see why the kernel refuses, then set it to 19. Find the PID with pgrep.',
          task: 'Try to set the niceness of the build_report process to 10, read the error, then set it to 19.',
          hint: '`pgrep -f` searches the whole command line and returns the PID, and `$( )` passes that output to renice as an argument. A regular user cannot lower niceness, going from 15 to 10 means raising the priority and you get Permission denied. Increasing it is allowed, you can go up to 19.',
        },
        {
          title: 'Someone else\'s process',
          story: 'A php-fpm worker running as www-data with PID 4242 is eating CPU, but you cannot kill it because the customer portal runs on it. You want to lower its priority to 10. The process is not yours, see what happens when you try with your own privileges.',
          task: 'Set the niceness of process 4242 to 10, first without sudo, then with sudo.',
          hint: 'For a regular user `renice` only works on their own processes, touching another user\'s process needs root and without sudo you get Permission denied. Adding the user column to the `ps -o` list shows up front who owns the process. Lowering the priority instead of killing it gives other work room to breathe without interrupting the service.',
        },
      ],
    },
    jb8: {
      title: 'Kill by name',
      story: 'Kill by name instead of hunting for a PID. killall name needs an exact name match, pkill name matches partially. Both send SIGTERM by default, for a stubborn process use -9.',
      task: 'Kill all sleep processes by name.',
      hint: '`killall` matches processes by their exact name, `pkill` by part of the name. Both send SIGTERM by default, for a stubborn process use `-9`. The match can be broad, so checking with `pgrep -a` first to see who will be hit is a good habit.',
      v: [
        {
          title: 'Only the report dies',
          story: 'The report script is stuck and you will kill it. Something else on the box also runs under python3, an http.server on port 8000. killall python3 would take both down, target only build_report.',
          task: 'Look at the python3 processes with pgrep, then kill only the build_report process with pkill -f.',
          hint: '`pgrep -a` shows matching PIDs with their command lines, so you see in advance who you will hit. `pkill -f` matches the whole command line, not just the name, that is how you target by script name. `killall python3` would kill everything running under the same interpreter.',
        },
        {
          title: 'End the load test',
          story: 'The alarm fired, the test is done. Kill the yes running in the background by name so the CPU graph on the NMS goes back to normal.',
          task: 'Kill all yes processes by name and confirm with jobs that the list is empty.',
          hint: '`killall` needs an exact name match, fine for yes, but with long names an abbreviation does not work. The default signal is SIGTERM, so the process can clean up and exit. No yes line should remain in the jobs output.',
        },
      ],
    },
    jb9: {
      title: 'Tree and memory',
      story: 'pstree shows processes as a parent child tree, with -p the PIDs. Who started whom and what the child processes of a service are, at a glance. pmap PID gives the memory map of a process, how much space each library takes, with the total at the bottom.',
      task: 'Look at the tree with pstree -p, then show the total line of the memory map of process 1024.',
      hint: '`pstree` draws processes as a parent child tree, `-p` adds the PID to each node. `pmap` gives the memory map of a process, and total on the last line is the total virtual memory. The output is long, so `tail -1` keeps just the total.',
      v: [
        {
          title: 'Your own shell',
          story: 'You wonder how much memory your long running session holds. Find your own bash in the tree and look at its extended memory map by PID.',
          task: 'Find the bash PID with pstree -p, then show the last line of pmap -x for that process.',
          hint: '`pstree -p` shows the PID of your shell on the bash node under sshd. `pmap -x` adds RSS and Dirty columns for each mapping, and the last line gives the totals. To see only the totals, pipe the output into `tail -1`.',
        },
        {
          title: 'A root process',
          story: 'The memory use of dockerd, PID 777, looks suspicious. You cannot read the map of a root owned process with your own privileges, try it first, then look the right way.',
          task: 'Try the memory map of process 777 without sudo first, then show its total line with sudo.',
          hint: 'Another user\'s memory map is protected under /proc, so without sudo `pmap` only shows the command line. With sudo you get the full map, and `tail -1` keeps the total on the last line. The tail on the right of the pipe works without root, sudo is only needed for pmap.',
        },
      ],
    },
    jb10: {
      title: 'Cleanup with trap',
      story: 'A script creates a temporary file that must be deleted when it ends, even after an error. trap \'command\' EXIT runs the command as the script exits, INT covers Ctrl+C. trap is accepted on an interactive line too, but its real home is a script. $$ is the PID of the script, the classic choice for temporary file names.',
      task: 'Write ~/scripts/cleanup.sh with nano. It should create the file /tmp/work.$$, and an EXIT trap should delete it and print temizlendi. Run it.',
      hint: '`trap \'komut\' EXIT` runs the command, komut, when the script exits no matter how it ends, the classic way to clean up temporary files. Add INT and it also runs on Ctrl+C. `$$` is the PID of the script and keeps temporary file names from colliding. Write the trap line before creating the temporary file, so it gets cleaned up even if something fails in between.',
      v: [
        {
          title: 'Lock file',
          story: 'The backup script creates /tmp/backup.lock so it never runs twice at once, but when the script dies halfway the lock stays and the next night the backup never starts. The lock must be removed no matter what.',
          task: 'Write ~/scripts/backup-lock.sh with nano. It should create /tmp/backup.lock, and an EXIT trap should delete the lock and print kilit kaldirildi. Run it.',
          hint: 'Put the lock path in a variable, write the `trap` line before creating the lock, then create the lock with touch. Write the trap command in double quotes and the variable expands when the trap is defined, in single quotes it expands at exit time, here both work. After the script ends /tmp/backup.lock should be gone.',
        },
        {
          title: 'Cleanup with a function',
          story: 'Your deploy script creates a temporary working directory and cleaning up takes several steps. Instead of cramming long commands into the trap line, write a cleanup function and hand that to trap.',
          task: 'Write ~/scripts/deploy-tmp.sh with nano. It should create the directory /tmp/deploy.$$, a cleanup function should delete it and print temizlik tamam, and trap EXIT should call cleanup. Run it.',
          hint: 'Define the function before the `trap` line, then give trap just the function name. When deleting the directory with `rm -rf`, quote the variable, so an empty variable never makes you delete the wrong place. `$$` produces a different directory name on every run, so parallel runs do not collide.',
        },
      ],
    },
  },
});

addEn({
  chapters: {
    cheat: { title: 'Fact check the cheat sheet', sub: 'Everything on the mousepad that is wrong or outdated' },
  },
  missions: {
    cs1: {
      title: 'What source is not',
      story: 'The mousepad says source file means compile from source code. Wrong. source runs a file inside the current shell, so its variables and functions stay in your shell, and . file is the same thing. Compiling from source is ./configure && make && sudo make install, you did that in the Package chapter.',
      task: 'Source the ~/scripts/vars.sh file and print the APP variable with echo.',
      hint: '`source dosya` runs the file, dosya, inside the current shell without starting a new one, so the variables and functions it defines stay in your shell. In real bash the short form written with a dot does the same. `bash dosya` starts a subshell instead, and the variables disappear with it. None of this has anything to do with compiling source code.',
      v: [
        {
          title: 'Reload bashrc',
          story: 'The mousepad claims a change to ~/.bashrc requires logging out and back in. Not needed, source loads it into the same shell right away. A BRANCH_ID variable was added to ~/.bashrc but your open shell does not know about it yet.',
          task: 'Print the BRANCH_ID variable with echo and see that it is empty, source the ~/.bashrc file and print it again.',
          hint: 'The mousepad says log out and back in, but ~/.bashrc is only read when a shell starts, and `source` runs it again in the current shell. Variables, aliases and functions arrive instantly, no need to end the session. Type `bash ~/.bashrc` and the change stays in a subshell, so you still see nothing.',
        },
        {
          title: 'Are bash and source the same',
          story: 'The mousepad claims bash file and source file are the same thing. They are not. ~/scripts/proxy.env exports the corporate proxy settings, try both and see the difference for yourself.',
          task: 'First run proxy.env with bash and check the https_proxy variable, then source it and check again.',
          hint: 'The mousepad thinks they are the same, but `bash dosya` starts a new subshell, and exported variables vanish when that subshell exits. `source` runs the file in your shell, so the variable stays. Files that set environment variables are always sourced, never executed.',
        },
      ],
    },
    cs2: {
      title: 'net-tools is outdated',
      story: 'The mousepad says ifconfig and netstat -pnltu. Both come from the net-tools package, deprecated since 2009 and missing on new installs. The modern equivalents are ip addr and ss -tulpn. Run the old ones in the lab, read the warning, then get the same information with the new ones.',
      task: 'Run ifconfig and netstat -tulpn, then get the same information with ip -br addr and ss -tulpn.',
      hint: '`ifconfig` and `netstat` come from net-tools, which has not been developed for years and is not shipped on new installs. Their replacements come from iproute2, `ip addr` for addresses, with `-br` for a one line summary, and `ss` for sockets. For ss, `-t` means TCP, `-u` UDP, `-l` listening, `-p` process, `-n` numeric output.',
      v: [
        {
          title: 'arp is outdated too',
          story: 'The mousepad says arp -a for the ARP table. arp is also part of the net-tools family, the modern equivalent is ip neigh. A device on the eth1 side is not answering, find out which one with both tools.',
          task: 'See the old output with arp -an, then get the same table with ip neigh and find the neighbor in FAILED state.',
          hint: 'The mousepad says `arp -a`, which comes from net-tools and is deprecated. The right tool is `ip neigh`, whose state column shows values like REACHABLE, STALE and FAILED. A line shown as incomplete by arp and FAILED by ip neigh means the ARP request got no reply, usually a cable, VLAN or powered off device.',
        },
        {
          title: 'Routing table',
          story: 'The mousepad says netstat -rn for the routing table. It works, but it is from net-tools, the modern equivalent is ip route. Find out which next hop the traffic to the 10.50.0.0/16 lab servers goes to.',
          task: 'See the old table with netstat -rn, then get the same table with ip route and read the next hop on the 10.50.0.0/16 line.',
          hint: 'The mousepad says `netstat -rn`, an old net-tools tool. The right one is `ip route`, which shows prefixes in CIDR form and the next hop after via, so you do not have to convert the Genmask column from netstat in your head. The address after the word via is the next hop, dev is the interface the traffic leaves through.',
        },
      ],
    },
    cs3: {
      title: 'get and put',
      story: 'The mousepad lists get, put and quit as if they were Linux commands. They are not. They work inside an sftp or ftp session, at the sftp> prompt. Type get in bash and you get command not found. The one line equivalent is scp.',
      task: 'Type get README in bash and see the error, then download the same file from backup.lab into /tmp with scp.',
      hint: 'get, put and quit are commands inside an sftp or ftp session, bash does not know them and says command not found. To download in one line from bash use `scp`, the source is `host:yol`, host, colon, path, and the target a local directory. To upload, the direction is reversed.',
      v: [
        {
          title: 'Not put either',
          story: 'The mousepad says put file uploads a file to the server. put also only lives inside an sftp session. You will drop the handover note into /tmp on web01.lab.',
          task: 'Type put ~/handover-ist.txt in bash and see the error, then send the file to the /tmp directory on web01.lab with scp.',
          hint: 'The mousepad writes `put` as if it were a Linux command, but it only works at the sftp> prompt and gives command not found in bash. To upload in one line from bash use `scp`, the local file first, then `host:yol`. Forget the colon on the target and the file is just copied locally.',
        },
        {
          title: 'Not mget either',
          story: 'The mousepad says mget downloads several files, that too is a command belonging to an sftp or ftp session. You will pull the whole nginx log directory from web01.lab into /tmp/web01-logs.',
          task: 'Type mget in bash and see the error, then download the /var/log/nginx directory from web01.lab as /tmp/web01-logs with scp.',
          hint: 'The mousepad thinks `mget` is a bash command, but it only works inside an sftp or ftp session. To fetch everything in a directory at once from bash, use `scp` with `-r`. If the target path does not exist the directory is created under that name, if it does the source directory goes inside it.',
        },
      ],
    },
    cs4: {
      title: 'ip address add is incomplete',
      story: 'The mousepad says ip address add ip. Incomplete. The kernel has to know which interface gets the address, so dev is mandatory, and without a prefix you get a /32 and no subnet route. The correct form is sudo ip addr add 10.0.0.5/24 dev eth1. It needs root.',
      task: 'Try the mousepad version, read the error, then add the address 10.0.0.5/24 to eth1 the right way.',
      hint: '`ip addr add` adds an address to an interface, and `dev` is mandatory because the kernel must know which interface the address belongs to. Without a prefix you get a /32 and no route is created for that subnet. Interface configuration needs root.',
      v: [
        {
          title: 'A /32 on loopback',
          story: 'The mousepad says ip address add ip, with no dev. This time you add 10.255.0.1 to loopback for management, and here a /32 is deliberately correct, you want a single host address like a router ID. But dev is still required.',
          task: 'Try it without dev like the mousepad, read the error, then add the address 10.255.0.1/32 to lo the right way.',
          hint: 'The mousepad form lacks `dev`, so the kernel cannot tell which interface to bind the address to and says dev argument is required. Loopback addresses represent a single host, so a /32 is the right choice here, while a physical interface usually wants the subnet prefix. The command needs root.',
        },
        {
          title: 'ip address del is incomplete too',
          story: 'Someone added 192.168.2.50/24 to eth1 by mistake, but that address belongs to a device on the same segment and shows up as a duplicate in ARP. The mousepad says ip address del ip to remove it, the same gap as with add.',
          task: 'Try to delete it without dev like the mousepad, read the error, then remove the address from eth1 the right way.',
          hint: 'The mousepad delete command also lacks `dev`. The same address can exist on more than one interface, so the kernel wants to know which one to delete it from. Writing the prefix exactly as it was added is the safest. It needs root, then confirm the address is gone with ip addr show.',
        },
      ],
    },
    cs5: {
      title: '766 is odd',
      story: 'The mousepad says chmod 766. Technically valid but odd, group and others can write but not execute, and without x on a directory nobody can enter it. The patterns you actually see are 755 for scripts and directories, 644 for plain files, 600 for private files, 700 for private directories. 777 is not a fix, it is a confession.',
      task: 'First give ~/lab/deploy.sh mode 766, read the note from the lab, then set it to 755.',
      hint: 'In numeric mode each `chmod` digit stands for owner, group and others in that order, with r worth 4, w 2 and x 1. 766 gives group and others write but not execute, which is not a sensible combination. Use 755 for scripts and directories, 644 for plain files, 600 for private files. Verify the result with `ls -l`.',
      v: [
        {
          title: '777 is not a fix',
          story: 'The mousepad says if the upload directory does not work, chmod 777 it. That is not a fix, it is a confession. Everyone can write and execute, an attacker drops a script and runs it. Try 777 on ~/lab/www/uploads, read the note from the lab, then bring it back to a sane mode.',
          task: 'First give the ~/lab/www/uploads directory mode 777, read the note, then set it to 755 and verify with ls -ld.',
          hint: 'The mousepad suggests 777 for permission problems, but that gives everyone write and execute. On a directory 755 gives the owner everything and leaves the rest only listing and entering, if the web server needs to write, the right way is to set the owner or group. `ls -ld` shows the permissions of the directory itself, without -d it lists the contents.',
        },
        {
          title: 'A private key cannot be 644',
          story: 'The mousepad claims chmod 644 is enough for a private key file. It is not, ssh rejects a private key others can read with the UNPROTECTED PRIVATE KEY FILE warning. ~/.ssh/branch_rsa is currently 644.',
          task: 'Check the permissions of ~/.ssh/branch_rsa with ls -l, then set them so only the owner can read and write it.',
          hint: 'The mousepad says 644, but that gives group and others read access. ssh requires a private key to be readable only by its owner and refuses to use the file otherwise. 600 gives the owner read and write and everyone else nothing. The public key with the .pub extension can stay 644, while the ~/.ssh directory should be 700.',
        },
      ],
    },
    cs6: {
      title: 'Shutdown time',
      story: 'The mousepad says `shutdown hh:mm`. On old systems that alone did not work, you needed -h or -r. Modern systemd shutdown powers off by default, so `shutdown 23:30` is enough, `shutdown -r +5` reboots and `shutdown -c` cancels. -h is still accepted but not needed.',
      task: 'Schedule the box for `23:30`, then cancel it.',
      hint: 'On modern systemd `shutdown` without options powers off. The time is written as `hh:mm`, and a time that has already passed is scheduled for the next day. `-r` reboots, `-c` cancels the plan. On old SysV systems -h or -r was mandatory, the mousepad was written for that era.',
      v: [
        {
          title: '+5 is not seconds',
          story: 'The mousepad says shutdown +5 means five seconds from now. Wrong, a number given with + is in minutes. Schedule the reboot after a kernel update, look at the scheduled time in the output, then cancel it.',
          task: 'Schedule the box to reboot in 5 minutes, check the time in the output, then cancel it.',
          hint: 'The mousepad thinks +5 is seconds, but `shutdown` takes a + time in minutes, and the scheduled for line in the output shows that clearly. There is no option for seconds, to shut down immediately use now. `-r` means reboot, `-c` cancel.',
        },
        {
          title: 'kill does not cancel it',
          story: 'The mousepad says kill the shutdown process to cancel a scheduled shutdown. On systemd the plan is held by logind, there is no shutdown process to kill, and you cancel with shutdown -c. Schedule it, look at the file holding the plan, then cancel it the right way.',
          task: 'Schedule the box for `22:15`, read the plan file with sudo, then cancel it.',
          hint: 'The mousepad suggests kill, but on a modern system the plan lives in systemd-logind and is written to /run/systemd/shutdown/scheduled, you will not find a process to kill in ps. `shutdown -c` removes the plan and announces the cancellation to everyone. The plan file belongs to root, so reading it needs sudo.',
        },
      ],
    },
    cs7: {
      title: 'Shortcuts',
      story: 'The bash shortcuts on the mousepad are mixed up. Ctrl+G does not exit the history, it only cancels the search. Ctrl+O runs the found command and fetches the next one, not something you use day to day. Ctrl+Q does not quit the application, it resumes a screen frozen by Ctrl+S. The real list is Ctrl+C stop, Ctrl+Z suspend, Ctrl+D exit, Ctrl+L clear, Ctrl+R search history, Ctrl+A start of line, Ctrl+E end of line, Ctrl+U delete to start, Ctrl+K delete to end, Ctrl+W delete word, Ctrl+Y paste, Alt+. last argument, !! last command, !$ last argument.',
      task: 'Submit the shortcut that searches backward through the command history.',
      hint: 'Ctrl+R opens a backward history search, bringing up the latest matching command as you type, and pressing Ctrl+R again goes to the one before. Enter runs it, Ctrl+G or Esc leaves the search. The mousepad description of Ctrl+G as exiting the history is wrong, it only cancels the search.',
      v: [
        {
          title: 'Frozen screen',
          story: 'A colleague\'s terminal froze and nothing they type shows up. They probably hit Ctrl+S by accident, which stops terminal output. The mousepad says Ctrl+Q quits the application, so they are afraid to touch that shortcut.',
          task: 'Submit the shortcut that resumes terminal output stopped by Ctrl+S.',
          hint: 'The mousepad thinks Ctrl+Q quits the application, but in a terminal Ctrl+S sends XOFF and stops output, and Ctrl+Q sends XON and resumes it. Whatever you typed while frozen is not lost, it all appears at once after Ctrl+Q. Submit it in the Ctrl+letter form.',
        },
        {
          title: '!$ is not the last command',
          story: 'The mousepad says !$ repeats the last command. Wrong, the last command is !!, and !$ is the last argument of the last command. You will create a directory for a new case and step into it right away, without typing the long path twice.',
          task: 'Create the ~/lab/tac/case-48213 directory with mkdir -p, then enter it with !$ without retyping the path.',
          hint: 'The mousepad thinks !$ is the last command, but the whole last command comes from !! and its last argument from !$. Bash expands !$ before running the line and prints the expanded version, so you see what actually ran. Alt+. pastes the same argument into the line interactively.',
        },
      ],
    },
    cs8: {
      title: 'No finger',
      story: 'The mousepad says finger. It is not installed on most servers, and not on this box either. The standard tools for user information are id, getent passwd name, w and last. You can install it with apt if you want, but make id and getent your habit.',
      task: 'Try finger burak and see the error, then get the same information with id and getent passwd.',
      hint: '`finger` is not installed on most servers, and installing it is discouraged for security reasons. For user information `id` gives the uid, gid and groups, `getent passwd isim` gives the account line for the name, isim. getent looks not only at /etc/passwd but also at sources like LDAP, which makes it more accurate than grepping the file.',
      v: [
        {
          title: 'who is not everyone',
          story: 'The mousepad claims who shows every account on the system. who only shows sessions that are logged in right now. The database team asks for the home directory of the postgres account, which never logs in.',
          task: 'Run who and see that postgres is not listed, then find the postgres account with getent and submit its home directory.',
          hint: 'The mousepad thinks who is an account list, but who only shows active sessions and service accounts never appear there. `getent passwd` queries the account database, and the sixth field of the colon separated line is the home directory. To see all accounts run getent without a name.',
        },
        {
          title: 'finger does not show groups',
          story: 'The mousepad says type finger to see a user\'s groups. Even when installed, finger does not show group membership. You need to check which groups www-data, the nginx worker user, belongs to, and whether it is in adm so it can read logs.',
          task: 'Try finger www-data, then show the groups of www-data with id.',
          hint: 'The mousepad recommends finger for group information, but finger only gives the name, home, shell and login details, and on most boxes it is not even installed. `id` shows the uid, primary gid and all supplementary groups on one line, `groups` only the group names. If adm is missing from the output, www-data cannot read logs owned by the adm group.',
        },
      ],
    },
    cs9: {
      title: 'Capital i',
      story: 'The mousepad says hostname -l. There is no such option and hostname errors out. For IP addresses it is a capital i, hostname -I. Lowercase -i gives the single address the hostname maps to, usually 127.0.1.1.',
      task: 'Try hostname -l and see the error, then get the addresses with hostname -I.',
      hint: '`hostname` options are case sensitive. Capital `-I` gives all IP addresses, lowercase `-i` the address the hostname resolves to, and there is no `-l` option, you get an invalid option error. The usage lines in the error message list the valid options.',
      v: [
        {
          title: 'The lowercase i trap',
          story: 'The mousepad says hostname -i for all IPs, with a lowercase i. Lowercase i gives the address the hostname maps to in /etc/hosts, usually 127.0.1.1. The VPN team asks for the WireGuard tunnel address of the box, the tunnel is in the 10.8.0.0/24 block.',
          task: 'See what hostname -i returns, then get all addresses with hostname -I and submit the WireGuard tunnel address.',
          hint: 'The mousepad wrote lowercase `-i`, but that gives the single address the hostname resolves to, which on Debian and Ubuntu is often 127.0.1.1. The right one is capital `-I`, which lists every address on the box. The tunnel address is the one starting with 10.8.0, to be sure check the wg0 line with ip -br addr.',
        },
        {
          title: '-a is not addresses',
          story: 'Another line on the mousepad says hostname -a gives all addresses. -a gives alias names, not addresses. The firewall team asks how many IPv4 addresses the box has.',
          task: 'See what hostname -a returns, then get the addresses with hostname -I and submit how many there are.',
          hint: 'The mousepad thinks `-a` means addresses, but the a stands for alias and it returns the alias names from /etc/hosts. For addresses the right option is capital `-I`, then count the space separated list, or pipe the output into `wc -w` to count it for you. Instead of guessing option letters, checking the usage list in the error message is the safest.',
        },
      ],
    },
    cs10: {
      title: 'ls | xargs wc',
      story: 'The mousepad says ls | xargs wc. It is easy to read that as a directory size, but it counts the contents of the files in the directory, not the directory. On top of that it breaks on file names with spaces, because xargs splits on whitespace. The right way is wc *, or the safe form find . -type f -print0 | xargs -0 wc.',
      task: 'In the ~/lab/wc directory run ls | xargs wc and see the error, then get the correct result with wc *.',
      hint: '`ls | xargs komut` splits the ls output on whitespace and turns it into arguments for the command, komut, so a file name containing a space becomes two separate arguments and the command runs on files that do not exist. `wc *` lets the shell expand the glob, and each file name stays a single argument. The safe pipeline is `find -print0` with `xargs -0`, using the null character as separator.',
      v: [
        {
          title: 'The danger of xargs rm',
          story: 'The mousepad says ls *.log | xargs rm to delete old logs. ~/lab/oldlogs has a log with a space in its name, xargs splits it in two and cannot delete it. Worse, if one of the split pieces matches another file name, the wrong file gets deleted.',
          task: 'Run the mousepad command in ~/lab/oldlogs and see the leftover file, then delete all .log files with find -print0 and xargs -0.',
          hint: 'The mousepad command splits the ls output on whitespace, so old report.log becomes two arguments and is not deleted. For `find`, `-print0` separates names with the null character and `xargs -0` splits on null, so names containing spaces and newlines survive intact. When deleting, it is a good habit to try the same pipeline with echo instead of rm first.',
        },
        {
          title: 'find | xargs grep',
          story: 'The mousepad says `find . -name "*.conf" | xargs grep listen` for searching configs. ~/lab/confs has a config with a space in its name, and port 8443 is right there, the mousepad command misses it.',
          task: 'Run the mousepad command in ~/lab/confs, notice the missed file, then find the listen lines with a method that handles names with spaces.',
          hint: 'In the mousepad pipeline xargs splits the name site a.conf in two, grep says No such file and the 8443 line never shows up. With `-exec grep listen {} +` find passes the file names as arguments itself, so nothing gets split, and the trailing + groups many files into a single grep call. `-print0` with `xargs -0` gives the same safety.',
        },
      ],
    },
    cs11: {
      title: 'locate comes back empty',
      story: 'The mousepad says locate file, but locate does not work on its own. It needs the mlocate package, and then sudo updatedb has to build the database. locate does not search the disk, it looks at that database, which is why it is much faster than find but does not know about new files until updatedb runs.',
      task: 'Find the sshd_config file with locate. First see the command missing error, then the missing database error, and fix both.',
      hint: '`locate` does not scan the disk, it queries the database produced by updatedb, which is why it is so much faster than find. On Ubuntu the command comes with the mlocate package, and after installing you have to build the database once with `updatedb`, a step that needs root. The database is normally refreshed nightly by cron, so it cannot see files created in between.',
      v: [
        {
          title: 'The new file does not show up',
          story: 'The mousepad claims locate searches in real time. It does not, it looks at the database as of its last refresh. You are about to write the WAN failover note and locate will not find it.',
          task: 'Create the ~/lab/wan-failover.md file, search for it with locate and see that it is not found, refresh the database and search again.',
          hint: 'The mousepad thinks locate is a live search, but it only knows the files that existed at the last `updatedb`. updatedb scans the whole filesystem, rewrites the database and needs root. If you need to find a file you just created right away, use find.',
        },
        {
          title: 'The deleted file is still there',
          story: 'The mousepad claims every file locate finds exists on disk. Not so, with a stale database it also shows files deleted long ago. The old tunnel config ~/lab/old-tunnel.conf was deleted yesterday but locate still lists it.',
          task: 'Search for old-tunnel.conf with locate, confirm with ls that the file really is gone, then tell locate to show only files that exist.',
          hint: 'The mousepad claim holds when the database is up to date, but with a stale one locate also lists deleted files. `-e` checks each result on disk and prints only those that exist. The lasting fix is to run `updatedb` as root to refresh the database.',
        },
      ],
    },
    cs12: {
      title: 'A single space',
      story: 'The mousepad lists rm -rf with no warning. Typing rm -rf /tmp/x/ your finger slips and it becomes rm -rf /tmp/x /, where the second argument is the root directory. Real rm stops this with preserve-root, but not if you say --no-preserve-root. For paths with variables write `rm -rf "${DIR:?}"/x` instead of `rm -rf "$DIR"/x`, if DIR is empty the command fails instead of deleting. Try it safely in the lab, never on a real system.',
      task: 'Run the rm -rf /tmp/x / command and read the protection message.',
      hint: 'In `rm -rf /tmp/x /` the space turns / into a separate argument that targets the root directory. Real rm blocks this with its preserve-root protection, but globs like `/*` and --no-preserve-root get around it. For paths with variables the `${DIR:?}` form stops the command before it runs if the variable is empty.',
      v: [
        {
          title: 'Empty variable',
          story: 'The cleanup line on the mousepad is `rm -rf $BUILD_DIR/cache`. If BUILD_DIR is not set the line becomes `rm -rf /cache`, so a misspelled variable name can end with deleting from the root. Try the safe form and see that the command stops without running while the variable is empty.',
          task: 'Confirm with echo that BUILD_DIR is empty, then try to delete the cache directory with the protected form and read the error.',
          hint: 'The mousepad writes the variable bare, if it is empty the path slides to the root and rm does not notice. With `${BUILD_DIR:?}` the shell errors out and never runs the command if the variable is empty or unset. Putting the variable in double quotes also keeps values with spaces from being split.',
        },
        {
          title: 'Script without an argument',
          story: 'A script snippet on the mousepad does `CACHE_DIR=$1` followed by `rm -rf $CACHE_DIR/*`. If someone runs it without an argument the line becomes `rm -rf /*` and not even preserve-root protects you. ~/scripts/clean-cache.sh is the fixed version, run it without an argument first to see the protection, then with the right argument.',
          task: 'Run the clean-cache.sh script without an argument first and read the error, then run it with the ~/lab/cache argument and see the directory emptied.',
          hint: 'The bare variable on the mousepad stays empty when no argument is given and the path becomes `/*`. The glob turns everything in the root into separate arguments, so preserve-root never kicks in. The `${CACHE_DIR:?mesaj}` form prints the message, mesaj, and stops the script if the variable is empty. Saying in the message what the user should pass makes the error explain itself.',
        },
      ],
    },
  },
});

addEn({
  quiz: {
    'useradd ile açılan hesaba home directory açtıran seçenek?': { q: 'Which useradd option creates a home directory for the new account?', a: ['-m', '-h', '-d', '-s'] },
    'usermod -G yerine usermod -aG neden kullanılır?': { q: 'Why use usermod -aG instead of usermod -G?', a: ['-a keeps the existing groups, -G alone replaces the list', '-a requires root', '-G only changes the primary group', 'They are the same'] },
    'passwd -S çıktısında L ne demek?': { q: 'What does L mean in the passwd -S output?', a: ['The account is locked', 'Logged in', 'Long password', 'Local account'] },
    'tar tzf arsiv.tar.gz ne yapar?': { q: 'What does tar tzf arsiv.tar.gz do?', a: ['Lists the archive contents without extracting', 'Extracts the archive', 'Creates an archive', 'Tests the archive and deletes it'] },
    'tar xzf arsiv.tgz -C /tmp/x içindeki -C ne yapar?': { q: 'What does -C do in tar xzf arsiv.tgz -C /tmp/x?', a: ['Sets the target directory', 'Turns off compression', 'Verifies a checksum', 'Deletes the files'] },
    'gzip dosya komutundan sonra ne olur?': { q: 'What happens after running gzip file?', a: ['file.gz is created and the original is deleted', 'file.gz is created and the original stays', 'It only prints to the screen', 'It fails with an error'] },
    'apt install paket neden sudo olmadan çalışmaz?': { q: 'Why does apt install package not work without sudo?', a: ['The dpkg lock file belongs to root', 'apt is only installed for root', 'The package repository is closed', 'It works, no problem'] },
    'apt purge ile apt remove farkı?': { q: 'What is the difference between apt purge and apt remove?', a: ['purge also deletes the config files', 'remove is faster', 'purge only cleans the cache', 'There is no difference'] },
    'Modern RHEL ve Fedora üzerinde yum yerine ne kullanılır?': { q: 'What replaces yum on modern RHEL and Fedora?', a: ['dnf', 'apt', 'pacman', 'snap'] },
    'Kaynaktan kurulumun klasik sırası?': { q: 'What is the classic order for installing from source?', a: ['./configure, make, sudo make install', 'source, make, install', 'make, ./configure, install', 'apt source, make'] },
    'source dosya ne yapar?': { q: 'What does source file do?', a: ['Runs the file inside the current shell', 'Compiles from source code', 'Downloads the file', 'Backs up the file'] },
    'Modern systemd sisteminde sudo shutdown now ne yapar?': { q: 'What does sudo shutdown now do on a modern systemd system?', a: ['Shuts down immediately, no -h needed', 'Fails, -h is required', 'Only sends a warning', 'Reboots'] },
    'Planlı bir shutdown nasıl iptal edilir?': { q: 'How do you cancel a scheduled shutdown?', a: ['sudo shutdown -c', 'sudo shutdown --stop', 'sudo reboot -c', 'kill shutdown'] },
    'Bir komutu terminal kapansa da çalışır bırakmanın klasik yolu?': { q: 'What is the classic way to keep a command running after the terminal closes?', a: ['nohup command &', 'command &&', 'sleep command', 'bg command'] },
    'Sıradan kullanıcı renice ile ne yapabilir?': { q: 'What can a regular user do with renice?', a: ['Only increase niceness, which lowers the priority', 'Change the priority freely', 'Only change root processes', 'Nothing'] },
    'Ctrl+Q ne yapar?': { q: 'What does Ctrl+Q do?', a: ['Resumes terminal output stopped by Ctrl+S', 'Quits the application', 'Turns off command history', 'Deletes the line'] },
    'Bash\'te !$ neyi verir?': { q: 'What does !$ give you in Bash?', a: ['The last argument of the last command', 'The whole last command', 'The last exit code', 'The PID of the last process'] },
    'ifconfig ve netstat yerine modern araçlar?': { q: 'Which modern tools replace ifconfig and netstat?', a: ['ip and ss', 'ping and dig', 'nmap and nc', 'route and arp'] },
    'locate neden yeni oluşturulan dosyayı bulamaz?': { q: 'Why can locate not find a newly created file?', a: ['Its database is not updated until updatedb runs', 'locate only searches under /etc', 'New files are hidden', 'locate requires root'] },
    'ssh-copy-id ne yapar?': { q: 'What does ssh-copy-id do?', a: ['Appends the public key to the remote authorized_keys file', 'Sends the private key to the server', 'Saves the password', 'Generates a new key'] },
  },
  badges: {
    sysadmin: { title: 'Sysadmin', desc: 'Finish the Users and Groups, Hardware and Disks, Package Management and System Administration chapters' },
    mousepad: { title: 'Mousepad Detective', desc: 'Finish the Fact check the cheat sheet chapter' },
  },
});
