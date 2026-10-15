'use strict';
/* English overlay for chapters csi, script, sdwan, netops, git, their variants, and the quiz and badge entries from missions-net.js and missions-git.js. Format in I18N.md. */
addEn({
  chapters: {
    csi: { title: "Crime Scene Investigation", sub: "A real log analysis scenario" },
    script: { title: "Script Master", sub: "Variables, aliases, automation" },
    git: { title: "Config Management with Git", sub: "Find the commit that caused the outage, fix it, commit it" },
    sdwan: { title: "SD-WAN Branch Case", sub: "TAC-48213, branch IST-BR-07, the jump box behind the ION" },
    netops: { title: "Network Ops Toolkit", sub: "ethtool, conntrack, arp, sysctl, nft, tcpdump, mtr" },
  },
});

addEn({
  missions: {
    c1: {
      title: "Is there an attack",
      story: "The security team suspects an ssh brute force last night. The evidence is in /var/log/auth.log.",
      task: "How many Failed password attempts are there? Submit the number.",
      hint: "`grep -c` tells you how many lines match instead of printing them. The phrase you are looking for is two words, so wrap it in double quotes, otherwise grep treats the second word as a file name. Case matters, the log writes Failed with a capital F.",
      v: [
        {
          title: "Rotated log",
          story: "The security team suspects someone ran an ssh brute force against the jump box last night. But logrotate ran this morning and the current auth.log looks spotless. Yesterday's entries now live in /var/log/auth.log.1. An analyst who forgets the rotated file never sees the attack.",
          task: "How many Failed password lines are in /var/log/auth.log.1? Submit the number.",
          hint: "`grep -c` gives you only the count of matching lines instead of printing them. The phrase contains a space, so double quotes are a must, otherwise the shell splits it into two arguments and grep treats the second word as a file name. Careful, you need the rotated file ending in .1, not the current auth.log.",
        },
        {
          title: "Central syslog",
          story: "The nginx server web01 ships its logs to this machine with rsyslog, and they all pile up under /var/log/remote/web01. The web01 team says sshd was very busy overnight and the CPU hit the ceiling. First job is a rough number, how many failed attempts are there.",
          task: "Submit the number of Failed password attempts in /var/log/remote/web01/auth.log.",
          hint: "`grep -c` returns the number of matching lines, so you do not have to count them one by one. The pattern contains a space, so pass it in quotes. Remote logs are plain text files too, the same tools work as long as you give the right path.",
        },
      ],
    },
    c2: {
      title: "Prime suspect",
      story: "Which IP made the most attempts? That IP gets blocked on the firewall.",
      task: "Submit the IP address with the most failed attempts.",
      hint: "First filter only the Failed password lines with `grep`. The IP is the fourth field from the end on every line, and `$(NF-3)` in `awk` gives you exactly that. Then the `sort`, `uniq -c` and `sort -rn` chain counts each IP and puts the biggest on top. Without sort, uniq only counts repeats that sit next to each other and the result is wrong.",
      v: [
        {
          title: "Yesterday's prime suspect",
          story: "We will find the source of yesterday's brute force and block it on the edge firewall. There is more than one IP, you find the most persistent one. The entries are again in the rotated /var/log/auth.log.1.",
          task: "Submit the IP address that produced the most Failed password lines in auth.log.1.",
          hint: "First filter only the Failed password lines with `grep`. On these lines the IP is the fourth word from the end, and `$(NF-3)` in `awk` gives it to you because NF is the number of the last field. Then `sort` brings identical IPs together, `uniq -c` counts them and `sort -rn` puts the biggest on top. Skip sort and uniq only merges consecutive repeats, so the counts come out wrong.",
        },
        {
          title: "The web01 attacker",
          story: "A deny rule is going into the cloud firewall for web01, but if we block the wrong IP a legitimate customer gets cut off. Pull the address with the most attempts out of the auth log that arrives over rsyslog, and be certain about it.",
          task: "Submit the IP with the most failed attempts in /var/log/remote/web01/auth.log.",
          hint: "Every line ends in the same pattern, from IP port N ssh2. That makes the IP the fourth field from the end, which you grab in `awk` as `$(NF-3)`. Sort the resulting list with `sort`, count with `uniq -c`, and order from largest to smallest with `sort -rn`. The invalid user lines are longer, but counting from the end makes that irrelevant, which is why NF is safer than a fixed number like $11.",
        },
      ],
    },
    c3: {
      title: "Target account",
      story: "Which username did the attackers try the most?",
      task: "Submit the most targeted username.",
      hint: "The username sits right to the left of the word from, which is `$(NF-5)` counting from the end. Pull that field with `awk`, then count with `sort`, `uniq -c` and `sort -rn`. Just writing `grep -c \"for root\"` falls short, you miss the accounts on the invalid user lines.",
      v: [
        {
          title: "The account under fire",
          story: "Which username did the bots hammer in yesterday's attack? This matters for SSH hardening. If the account exists we disable it, if not we write the fail2ban rule accordingly.",
          task: "Submit the most tried username in auth.log.1.",
          hint: "In both patterns the username sits right before the word from, for root from or invalid user admin from. Counting from the end that field is `$(NF-5)`, pull it with `awk`. Then count with `sort`, `uniq -c` and `sort -rn`. Counting only root with `grep -c` is misleading, because you overlook the invalid user lines.",
        },
        {
          title: "Cloud image account",
          story: "web01 was built from a cloud image, and those images have well known default accounts. The attacker may know that too. Find which username was tried the most, and we will add the result to the image hardening checklist.",
          task: "Submit the most targeted username in /var/log/remote/web01/auth.log.",
          hint: "On Failed password lines the username is right to the left of the word from. Counting from the end that is `$(NF-5)`, and `awk` pulls this field from every line. Count with `sort` and `uniq -c`, then order from largest to smallest with `sort -rn`. Do not use a fixed field number, the invalid user lines are two words longer.",
        },
      ],
    },
    c4: {
      title: "The one who got in",
      story: "Bad news. One account failed first, then logged in successfully and tried to become root.",
      task: "Submit this user's name.",
      hint: "`grep -E` enables extended regex and lets you search for two words at once with a pipe, Accepted and sudo. Accepted shows who got in, the sudo lines show who asked for root. The user marked NOT in sudoers is your suspect, grep that name separately to confirm the earlier Failed attempts.",
      v: [
        {
          title: "CI account inside",
          story: "There is a worse finding. One account failed a few times, then logged in successfully and immediately tried to open a root shell. This is no longer an attempt, it is a breach. We lock the account right away.",
          task: "Submit the name of the user in auth.log.1 who got in after failing and then tried to become root with sudo.",
          hint: "`grep -E` enables extended regex, so you can search for two words at once with a pipe, Accepted and sudo. Accepted lines show who got in, sudo lines show who asked for privileges. The line that says NOT in sudoers gives your suspect away, then grep that user separately to confirm the earlier Failed attempts.",
        },
        {
          title: "Repo account",
          story: "Same story on web01, but with a different account. Someone got in after a few failed attempts and tried su to become root. The account owner may be a service that was left with a weak password.",
          task: "Submit the user in the web01 auth.log who failed, then got Accepted, then attempted sudo.",
          hint: "Search for Accepted and sudo at the same time with `grep -E`, the pipe means or in extended regex. A legitimate admin uses sudo too, the difference is the phrase NOT in sudoers. Grep the account you find on its own and check whether Failed password came first from the same IP.",
        },
      ],
    },
    c5: {
      title: "Web scan",
      story: "Looks like the same IP also scanned the web server. In the nginx access.log, field 9 is the HTTP status code.",
      task: "How many 404 responses are in access.log? Submit the number.",
      hint: "`awk '{print $9}'` pulls just the status code field from each line, in combined log format that is field 9. Sorting with `sort` and counting with `uniq -c` tells you how many times each code appears. Writing `grep 404` is risky, the same digits can show up in other fields such as the byte count.",
      v: [
        {
          title: "Login brute force",
          story: "The same attacker did not stop at ssh, it also hammered the login API of the web app. The nginx log was rotated too, it is in /var/log/nginx/access.log.1. In combined log format field 9 is the HTTP status code.",
          task: "How many 401 Unauthorized responses are in access.log.1? Submit the number.",
          hint: "`awk '{print $9}'` pulls just the status code field from each line, in nginx combined format that is field 9 when split on spaces. Then `sort` and `uniq -c` show how many times each code appears. Do not use `grep 401`, it can also match other fields such as size or port and inflate the count.",
        },
        {
          title: "Scanner footprint",
          story: "It looks like a vulnerability scanner hit web01 overnight, probing for wp-login, .env and backup files. Paths that do not exist return 404. The 404 count is a good measure of how hard it was scanned.",
          task: "How many 404 responses are in /var/log/remote/web01/access.log? Submit the number.",
          hint: "In the nginx combined log the status code is field 9, which you pull with `awk` as `$9`. Sorting with `sort` and counting with `uniq -c` gives you the distribution of every code at a glance. A plain `grep 404` can also match in the path or byte field, counting by field is safer.",
        },
      ],
    },
    c6: {
      title: "Server error",
      story: "500s are not a client side problem, they are an application side problem.",
      task: "Submit the client IP address of the requests that returned 500.",
      hint: "`awk` takes a condition and an action together. `$9 == 500` selects only lines whose status code is 500, then print outputs field 1, the client IP. The same IP shows up more than once, so deduplicate with `sort -u`.",
      v: [
        {
          title: "Upstream down",
          story: "502 Bad Gateway means nginx could not reach the application behind it. The problem is not the client, it is the upstream. Last night one endpoint kept returning 502, and the developers want to know which one.",
          task: "Submit the path of the requests in access.log.1 that returned 502.",
          hint: "`awk` can take a condition and an action, the condition `$9 == 502` selects only those lines and the action prints the field you want. In combined format the request path is field 7, field 1 is the client IP. The same path repeats in the result, so deduplicate with `sort -u`.",
        },
        {
          title: "Order failure",
          story: "web01 is throwing 500 Internal Server Errors. A 500 is the application's own error, but if it always comes from the same client, the data that client sends may be triggering it. The developers want the client IP so they can reproduce those requests.",
          task: "Submit the client IP address of the requests in the web01 access.log that returned 500.",
          hint: "Inside `awk` the condition `$9 == 500` selects only lines that returned 500, and the print action after it outputs the field you want. The client IP is field 1 of every line. The same IP appears several times, so reduce it to one line with `sort -u`.",
        },
      ],
    },
    c7: {
      title: "Backdoor",
      story: "The attacker may have dropped a script somewhere. The first place to look is always /tmp. Watch out for hidden directories.",
      task: "Find the .sh file under /tmp, read it, then delete it.",
      hint: "`find` starts from the directory you give it and walks every subdirectory, hidden ones included, and `-name` takes a glob pattern. Quote the pattern so the shell does not expand the star too early. When the file is in another user's directory, permission to delete depends on write access to that directory, so you may need `sudo`.",
      v: [
        {
          title: "Persistence script",
          story: "The jenkins account may have left something behind while it was inside. /tmp is wiped on every reboot, so smart attackers use /var/tmp, which survives a reboot. Watch out for innocent looking hidden directories such as the X11 socket directory.",
          task: "Find the .sh file under /var/tmp, read it, then delete it.",
          hint: "`find` starts from the directory you give it and walks the subdirectories too, and `-name` takes a glob pattern. Quote the pattern, otherwise the shell expands the star in your current directory. The directory holding the file belongs to www-data and does not give you write access, so you will need `sudo` to delete it.",
        },
        {
          title: "Trace on the RAM disk",
          story: "We also need to look at this machine, the central syslog server. /dev/shm is a tmpfs, meaning it lives in RAM, leaves no trace on disk and is writable by everyone. A favorite hiding place for attackers.",
          task: "Find the .sh file under /dev/shm, read its contents and delete it.",
          hint: "Use `find` with `-name` and protect the glob pattern with quotes, otherwise the shell expands it early. find walks hidden directories too, no need for -a like with ls. The script is in www-data's directory, and since delete permission belongs to the directory owner you have to remove it with `sudo`.",
        },
      ],
    },
    s1: {
      title: "Variable",
      story: "When you assign a variable in Bash there are no spaces around the equals sign.",
      task: "Assign Purmerend to the variable SEHIR and print Merhaba Purmerend with echo.",
      hint: "In Bash an assignment is written `NAME=value` with no spaces on either side of the equals sign, add a space and bash thinks the name is a command. When you use the value you put a dollar sign in front of it. Wrapping the echo argument in double quotes keeps text with spaces in one piece and the variable still expands.",
      v: [
        {
          title: "Hub variable",
          story: "Instead of typing the hub name by hand all over your tunnel scripts, you will keep it in a variable. In Bash there are no spaces on either side of the equals sign in an assignment.",
          task: "Assign ams-dc-hub01 to the variable HUB and print Tunnel hedefi ams-dc-hub01 with echo.",
          hint: "The assignment is written as `NAME=value` with no spaces. Leave a space and bash thinks the word HUB is a command and says command not found. When reading the value you put a dollar sign in front, and if you wrap the echo argument in double quotes the variable still expands.",
        },
        {
          title: "Site code",
          story: "You keep retyping the site code in your ticket notes. Put it in a variable and use that everywhere.",
          task: "Assign IST-BR-07 to the variable SITE and print Site kodu IST-BR-07 with echo.",
          hint: "Make an assignment with no spaces like `SITE=IST-BR-07`, put a space next to the equals sign and bash tries to run SITE as a command. Writing `$SITE` inside echo makes the shell replace it with its value. The dash in the value is fine, a space would need quotes.",
        },
      ],
    },
    s2: {
      title: "Quote difference",
      story: "Inside double quotes a variable expands, inside single quotes it does not.",
      task: "Print $HOME inside single quotes with echo, so that $HOME literally shows on screen.",
      hint: "Inside single quotes the shell interprets nothing, the dollar sign stays a plain character. Double quotes expand variables and you see the path of your home directory. Use single quotes when you want to see the expression itself on screen.",
      v: [
        {
          title: "PATH in the docs",
          story: "You are writing an example line into the runbook, and the reader should literally see $PATH on screen, not your PATH value. Inside single quotes the shell expands nothing.",
          task: "Print exactly $PATH with echo, the expression itself should show, not its value.",
          hint: "Every character inside single quotes stays as it is, the dollar sign included. Double quotes expand variables, and then you get a long list of directories on screen. Alternatively you can escape the dollar sign with a backslash, but single quotes are the most readable.",
        },
        {
          title: "Crontab line",
          story: "A colleague will copy from your screen the line to add to crontab. The $HOME and && in the line must stay as they are, otherwise your shell interprets them.",
          task: "Print exactly cd $HOME && ./backup.sh with echo.",
          hint: "Inside single quotes the shell neither expands variables nor interprets operators like &&, the text goes to echo as it is. Without quotes && splits the line in two and the second part runs as a command. Double quotes protect && but expand $HOME.",
        },
      ],
    },
    s3: {
      title: "Command substitution",
      story: "`$(command)` embeds the output of a command inside text.",
      task: "Print Kullanici sayisi N with echo. N should be computed with wc -l < /etc/passwd.",
      hint: "The command inside the dollar sign and parentheses runs first and its output is embedded at that point in the text, this is called command substitution. If `wc -l` reads the file from stdin through the less than sign it prints only the number, without the file name. Wrap the whole text in double quotes so it reaches echo as a single argument.",
      v: [
        {
          title: "Branch inventory",
          story: "Each line of ~/inventory/branches.txt is a branch. Instead of typing the branch count into the report header by hand, embed the command output in the text, so the report stays correct on its own when the file changes.",
          task: "Print Branch sayisi N with echo. N should be computed with wc -l < ~/inventory/branches.txt.",
          hint: "Command substitution, written with a dollar sign and parentheses, runs the inner command and places its output at that point in the text. `wc -l` counts lines, and if you feed the file through stdin with the less than sign it prints only the number without the file name next to it. Wrap it all in double quotes so it stays one piece of text.",
        },
        {
          title: "Error counter",
          story: "You are adding the number of error lines in the nginx error log to the morning report. Instead of typing the number by hand, embed the command output in the sentence. The log is in ~/logs/nginx-error.log.",
          task: "Print Hata sayisi N with echo. N should be computed with grep -c error ~/logs/nginx-error.log.",
          hint: "The command you write inside the dollar sign and parentheses runs first and its output is pasted into the text, this is called command substitution. `grep -c` returns the number of matching lines as a single figure, exactly right for embedding in text. The pattern is lowercase error, warn and notice lines are not counted.",
        },
      ],
    },
    s4: {
      title: "Alias",
      story: "Define aliases for long commands you use often.",
      task: "Define an alias named ports that runs ss -tulpn, and use it.",
      hint: "`alias` binds a name to a command with an equals sign, and since the command contains spaces it must be in single quotes. No spaces on either side of the equals sign. Once defined, just type the alias name, and to make it permanent it goes into .bashrc.",
      v: [
        {
          title: "Log shortcut",
          story: "You check the last lines of syslog dozens of times a day. Instead of typing the long command every time, define a short alias.",
          task: "Define an alias named logs that runs tail -n 20 /var/log/syslog, and use it.",
          hint: "`alias` binds the name to the command with an equals sign, and since the command contains spaces single quotes are a must. Without quotes the alias takes only the first word and the rest become separate arguments. Once defined, run it by typing just the alias name, and if you want it permanent it goes into .bashrc.",
        },
        {
          title: "IP shortcut",
          story: "On the jump box you use `ip -br addr` to see interface addresses in short form, but your fingers get tired every time. Make yourself an alias called myip.",
          task: "Define an alias named myip that runs ip -br addr, and use it.",
          hint: "`alias` binds the name and the command with an equals sign, no spaces next to it. The command is several words, so put it in single quotes. `-br` means brief, each interface shows on one line with its name, state and address.",
        },
      ],
    },
    s5: {
      title: "And, or",
      story: "&& runs if the previous command succeeded, || runs if it failed. The exit code is in $?.",
      task: "Run cd /yok_dizin, and if it fails print dizin yok with echo. On one line.",
      hint: "Every command returns an exit code, 0 means success. `||` runs the right side only if the command on the left fails, `&&` only on success. cd fails when it cannot go into a directory that does not exist, and that is when your message prints.",
      v: [
        {
          title: "Is the disk attached",
          story: "The backup script writes under /mnt/backup, but the USB disk is not always attached. If ls fails, give the user a clear message. || runs when the previous command fails.",
          task: "Run ls /mnt/backup, and if it fails print backup diski takili degil with echo. On one line.",
          hint: "Every command ends with an exit code, 0 means success and anything else means failure. `||` runs the right side only when the command on the left fails, `&&` does the opposite and runs on success. ls on a missing directory returns an exit code like 2, and only then does your message print.",
        },
        {
          title: "Directory first",
          story: "Before the report script writes anything, you want to make sure the report directory exists. If mkdir succeeds, print a confirmation message. && runs if the previous command succeeded.",
          task: "Run mkdir -p ~/reports, and if it succeeds print rapor dizini hazir with echo. On one line.",
          hint: "`&&` runs the command on the right if the exit code of the command on the left is 0, on failure the right side is skipped. `mkdir -p` also creates intermediate directories and does not error if the directory already exists, so running it again is safe. You can check the exit code of the last command with `$?`.",
        },
      ],
    },
    s6: {
      title: "Backup script",
      story: "Cron tries to run backup.sh every night, but the file does not exist. You saw it in syslog.",
      task: "Write ~/scripts/backup.sh with nano. The script should create the ~/backup directory and copy ~/notes.txt into it. Then run it.",
      hint: "The script is two lines, `mkdir -p` makes sure the directory exists and `cp` copies the file. Thanks to -p there is no error if the directory already exists, so cron can run it again every night. Without execute permission, run it with `bash` followed by the file path, running it with ./ first needs `chmod +x`.",
      v: [
        {
          title: "Log archive",
          story: "Every night you want a copy of the nginx access log under ~/archive. First write the script and run it by hand, then hook it into cron.",
          task: "Write ~/scripts/archive.sh with nano. The script should create the ~/archive directory and copy /var/log/nginx/access.log into it. Then run it.",
          hint: "The script is two lines, one makes sure the directory exists with `mkdir -p`, the other copies the file with `cp`. Thanks to -p the script does not fail if the directory already exists, so cron can run it over and over. If you did not grant execute permission you can run it with `bash` followed by the file path, running it with ./ needs `chmod +x`.",
        },
        {
          title: "TAC bundle",
          story: "TAC asks for the same files on every case. Hand the collection job to a script, and as a first step have it copy resolv.conf into the case directory.",
          task: "Write ~/scripts/collect.sh with nano. The script should create the ~/tac/TAC-48213 directory and copy /etc/resolv.conf into it. Then run it.",
          hint: "`mkdir -p` creates two nested directories in one go, creating tac too if it does not exist. Then `cp` copies the source file into the target directory, and the trailing slash on the target makes it clear that it is a directory. Running the script with `bash` does not need execute permission.",
        },
      ],
    },
    s7: {
      title: "Argument",
      story: "Scripts take arguments as $1, $2.",
      task: "Write a script named ~/scripts/selam.sh containing echo \"Selam $1\" and run it with bash ~/scripts/selam.sh Burak.",
      hint: "To create the script in one line, redirect the echo output into the file with the greater than sign. The outer quotes must be single quotes, otherwise $1 expands to nothing in your own shell and never gets written to the file. When you run it, the first word after the script name arrives as $1.",
      v: [
        {
          title: "Site parameter",
          story: "Instead of writing a separate script for every branch, you want one script that takes the site code as an argument. The first argument is read inside the script as $1.",
          task: "Write a script named ~/scripts/site.sh containing echo \"Site $1 kontrol ediliyor\" and run it with bash ~/scripts/site.sh IST-BR-07.",
          hint: "To create the script with one line you can redirect the echo output into the file with the greater than sign. The outer quotes must be single quotes, otherwise $1 expands to nothing in your own shell and never gets written to the file. When you run it, the first word you type after the script name becomes $1.",
        },
        {
          title: "Two arguments",
          story: "Your tunnel check script should take both the tunnel name and the far end. The first argument arrives as $1, the second as $2.",
          task: "Write a script named ~/scripts/tunnel.sh containing echo \"Tunnel $1 hedef $2\" and run it with bash ~/scripts/tunnel.sh Tunnel11 ams-pe1.",
          hint: "When writing the script content to a file with echo, the outer quotes must be single quotes so that $1 and $2 reach the file without being expanded. When you run it, arguments are separated by spaces and their order matters. Inside the script you can check the number of arguments with `$#`.",
        },
      ],
    },
    g1: {
      title: "Repo status",
      story: "Monday night the branch configs were deployed in the change window. After two in the morning the BGP session between branch-ams-01 and the PE started dropping with hold timer expired, up and down every three minutes. The source of truth for the configs is the ~/netconfigs repo. Start by looking at the repo status, what is uncommitted, who left what behind.",
      task: "Enter the netconfigs repo and show the working tree status.",
      hint: "Enter the repo directory with `cd`, git commands search upward from the current directory for .git and say not a git repository outside a repo. `git status` shows which branch you are on and the staged, unstaged and untracked files. Reading this table before starting any work that walks through history, like bisect, should be a habit.",
      v: [
        {
          title: "ACL repo",
          story: "Branch edge ACLs were pushed in Thursday's change window. After one in the morning the IPsec tunnel between edge-izm-02 and the hub went down, IKE_SA_INIT goes through but nothing comes after. The source of truth for the ACLs is the ~/edge-acl repo. Start by looking at the repo status, what is uncommitted, who left what behind.",
          task: "Enter the edge-acl repo and show the working tree status.",
          hint: "Enter the repo directory with `cd`, git commands search upward from the current directory for .git and say not a git repository outside a repo. `git status` shows which branch you are on and the staged, unstaged and untracked files. Reading this table before starting any work that walks through history, like bisect or checkout, should be a habit.",
        },
        {
          title: "Fabric repo",
          story: "Tuesday night in the Amsterdam DC fabric the BGP EVPN session between leaf-02 and spine-01 went down, and the VTEPs behind leaf-02 became unreachable. The NOTIFICATION the leaf sent says peer in wrong AS. The source of truth for the fabric configs is the ~/dc-fabric repo. First look at the repo status.",
          task: "Enter the dc-fabric repo and show the working tree status.",
          hint: "Enter the repo with `cd`, git searches for the .git directory upward from where you are. `git status` lists modified, staged and untracked files separately and tells you the branch. If you see a half finished change, decide what to do with it before you walk through history.",
        },
      ],
    },
    g2: {
      title: "Read the history",
      story: "What got deployed is the snapshot at HEAD. We need to see who committed what before it, and in which order. git log lists every commit with its hash, author, date and message, and with --oneline each one collapses to a single line. You also see the tags, v1.0 is the last stable deploy.",
      task: "List the commit history in one line format.",
      hint: "`git log` lists commits from newest to oldest with hash, author, date and message. `--oneline` collapses each commit to one line with the short hash and the first line of the message. Tags show up next to their commit, and `--author` filters the commits of a single person.",
      v: [
        {
          title: "Who pushed what",
          story: "What got deployed is the snapshot at HEAD. We need to see who committed what before it, and in which order. The v2.3 tag marks the last stable deploy.",
          task: "List the commit history in one line format.",
          hint: "`git log` lists commits from newest to oldest with hash, author, date and message. `--oneline` collapses each commit to one line with the short hash and the first line of the message, ideal for skimming a long history. Tags show up as decorations next to their commit, and `--author` filters the commits of a single person.",
        },
        {
          title: "Fabric history",
          story: "What went into the fabric last? The stable-0915 tag marks the last point, on September 15, when every session was up. See in order who changed what after that.",
          task: "List the commit history in one line format.",
          hint: "Give `git log` the `--oneline` flag and the history comes back compact, with HEAD at the top. Messages that start with the hostname tell you at a glance which device was touched, which is why the convention matters. For the history of a single file you can add the file name at the end.",
        },
      ],
    },
    g3: {
      title: "Who wrote it",
      story: "The outage notes say ping with df-bit at 1472 fails, 1372 passes. So someone touched the MTU on the WAN side of branch-ams-01. git blame shows which commit, which person and what time every line of a file came from. The hash next to the line takes you straight to the guilty commit.",
      task: "Run blame on branch-ams-01.conf and note the hash and name next to the mtu line.",
      hint: "`git blame file` prefixes every line with the short hash, author and date of the commit that last changed it. If you are asking why a line is the way it is, the answer is in that commit's message. On long files you can pass a line range with `-L` to look only at the relevant block.",
      v: [
        {
          title: "Owner of the line",
          story: "According to the outage notes the udp 4500 counter on the ION side is zero, so edge-izm-02 may not be letting NAT-T packets in. git blame shows which commit, which person and what time every line of a file came from. The hash next to the line takes you straight to the guilty commit.",
          task: "Run blame on edge-izm-02.acl and note the hash and name next to the eq 4500 line.",
          hint: "`git blame file` prefixes every line with the short hash, author and date of the commit that last changed it. If you are asking why a line is the way it is, the answer is in that commit's message. On long files you can pass a line range with `-L` to look only at the relevant block.",
        },
        {
          title: "Who set the wrong AS",
          story: "The NOTIFICATION says peer in wrong AS, which means the AS leaf-02 expects for the spine is wrong. Use blame to find who wrote the remote-as line in leaf-02.conf, and with which commit.",
          task: "Run blame on leaf-02.conf and note the hash and name next to the remote-as line.",
          hint: "`git blame` puts the hash, author and date of the commit that last changed each line next to it. If the line itself is wrong, the hash next to it is the commit that brought it in, and then you look at the whole commit with `git show`. Indentation is meaningful in NX-OS, also check which neighbor block the line sits in.",
        },
      ],
    },
    g4: {
      title: "Diff between two commits",
      story: "The v1.0 tag marks the stable deploy on September 16, everything worked that day. Let us see line by line what changed in branch-ams-01.conf from that day to today. git diff compares two commits, and if you add -- file at the end it shows only that file. Minus lines are the old state, plus lines are the new state.",
      task: "Show the diff of branch-ams-01.conf between v1.0 and HEAD.",
      hint: "`git diff` outputs the difference between two commits as a unified diff, and if you add two dashes and a file name at the end only that file is shown. The two dashes tell git that what follows is a path. Minus lines are the old state, plus lines are the new state.",
      v: [
        {
          title: "Since v2.3",
          story: "The v2.3 tag marks the stable deploy on September 30, every tunnel was up that day. Let us see line by line what changed in edge-izm-02.acl from that day to today. Minus lines are the old state, plus lines are the new state.",
          task: "Show the diff of edge-izm-02.acl between v2.3 and HEAD.",
          hint: "`git diff` outputs the difference between two commits as a unified diff, and if you add two dashes and a file name at the end only that file is shown. The two dashes tell git that what follows is a path, not a ref. The range notation written with two dots gives the same result.",
        },
        {
          title: "Since the stable point",
          story: "The stable-0915 tag is the last healthy state of the fabric. See line by line what changed in leaf-02.conf from that day to today. More than one commit may have touched leaf-02, the diff shows the sum of all of them.",
          task: "Show the diff of leaf-02.conf between stable-0915 and HEAD.",
          hint: "`git diff` gives the total difference between two refs, it does not show the commits in between one by one. Putting two dashes and a file name at the end limits the output to that file. Once you see the changed line, blame or bisect tells you which commit brought it in.",
        },
      ],
    },
  },
});

addEn({
  missions: {
    g5: {
      title: "Set it aside",
      story: "We will use git bisect to pin down the guilty commit, but at every step bisect checks out an old snapshot into the working tree. You have a half finished NTP change in branch-rtm-02.conf, a checkout would overwrite it, and git will not allow that anyway. git stash takes the changes aside and cleans the working tree, and when you are done git stash pop brings them back.",
      task: "Stash the uncommitted changes so the working tree is clean.",
      hint: "`git stash` saves staged and unstaged changes onto a stack and returns the files to their HEAD state, which makes checkout safe. Untracked files do not go into the stash by default. When you are done, `git stash pop` gives you your change back.",
      v: [
        {
          title: "Half done work aside",
          story: "We will use git bisect to pin down the guilty commit, but at every step bisect checks out an old snapshot into the working tree. You have a half finished change in edge-ank-03.acl for a second jump host, a checkout would overwrite it, and git will not allow that anyway. Stash the change.",
          task: "Stash the uncommitted changes so the working tree is clean.",
          hint: "`git stash` saves staged and unstaged changes onto a stack and returns the files to their HEAD state. Untracked files do not go into the stash by default, and they do not block bisect either. When you are done, `git stash pop` gives you your change back, and `git stash list` shows what is on the stack.",
        },
        {
          title: "The syslog work can wait",
          story: "The working tree must be clean before you start bisect. You have a half finished line in leaf-03.conf for the new syslog collector. Set it aside without deleting it, you will bring it back when bisect is done.",
          task: "Stash the uncommitted changes so the working tree is clean.",
          hint: "`git stash` saves your changes and returns the file to its HEAD state, which makes checkout safe. With `-m` you can give the stash a description, useful once several stashes pile up. Afterwards `git status` should say working tree clean, the untracked notes file can stay where it is.",
        },
      ],
    },
    g6: {
      title: "Find the culprit with bisect",
      story: "We have a good point, v1.0. The bad point is HEAD. There are six commits in between, so instead of opening each one, do a binary search. Run git bisect start, then mark HEAD bad with git bisect bad and the tag good with git bisect good v1.0. git checks out the commit in the middle. At every step run ./check-policy.sh, if it says OK answer git bisect good, if it says FAIL answer git bisect bad. In three steps git tells you the first bad commit. The same method finishes a thousand commits in ten steps.",
      task: "Use bisect to find the first bad commit that caused the outage.",
      hint: "Bisect does a binary search, every answer halves the candidate range. `git bisect bad` without an argument marks HEAD, while `git bisect good` takes a tag or hash. At every step answer good or bad based on the `./check-policy.sh` output, and the lazy way is to let `git bisect run` drive the script automatically.",
      v: [
        {
          title: "Culprit by bisect",
          story: "The good point is v2.3, the bad point is HEAD, with five commits in between. Run git bisect start, mark HEAD as bad and v2.3 as good. git checks out the commit in the middle. At every step run ./check-acl.sh, if it says OK answer good, if it says FAIL answer bad. In a few steps git tells you the first bad commit.",
          task: "Use bisect to find the first bad commit that took the tunnel down.",
          hint: "Bisect does a binary search, every answer halves the candidate range, which is why even a thousand commits take only ten steps. `git bisect bad` without an argument marks the currently checked out commit, which is HEAD at the start, while `git bisect good` takes a tag or hash. Decide at every step from the script output, a single wrong good or bad ruins the whole result.",
        },
        {
          title: "Bisect run",
          story: "This time you will not run the script by hand at every step. Set up the range in one line by giving git bisect start the bad ref first and then the good one, then use git bisect run to have git itself run check-fabric.sh at every step. If the script exits 0 the commit counts as good, anything else counts as bad.",
          task: "Use bisect run to find the first bad commit that took the session down.",
          hint: "`git bisect start` can take two arguments, the first is the bad ref and the second the good ref, so you do not have to mark them separately. `git bisect run` runs the command you give it at every step and decides automatically from the exit code, 0 means good, 1 through 127 means bad. If the script's exit code is wrong, run blames the wrong commit, so it is a good idea to try the script once by hand first.",
        },
      ],
    },
    g7: {
      title: "Inspect the bad commit",
      story: "The culprit is known. Once bisect is done, return to main with git bisect reset, because HEAD is still detached on an old snapshot. Then read that commit's message and diff with git show. The message says GRE overhead, but the change was made to the physical WAN interface, not to Tunnel0. Tunnel0 already has ip mtu 1400, and with 1400 on the physical link the 1500 byte BGP updates from the PE get dropped, hold timer expired.",
      task: "Leave bisect and show the bad commit with git show.",
      hint: "`git bisect reset` returns to the branch you were on before bisect and ends the detached HEAD state. `git show` displays a commit's message and diff together, and takes the hash bisect gave you or a relative ref like HEAD~4 as its argument. Forget the reset and the commit you make ends up on a detached HEAD.",
      v: [
        {
          title: "Inspect the commit",
          story: "The culprit is known. First return to main with git bisect reset, HEAD is still detached on an old snapshot. Then read that commit's message and diff with git show. The message talks about cutting NAT-T noise from the internet, but because edge-izm-02 sits behind CGNAT the hub tunnel was already flowing over 4500. The deny line cut the tunnel itself.",
          task: "Leave bisect and show the bad commit with git show.",
          hint: "`git bisect reset` returns to the branch you were on before bisect and ends the detached HEAD state. `git show` displays a commit's author, date, message and diff together, and as an argument you can give it the hash bisect reported or a ref relative to HEAD. Forget the reset and the commit you make ends up on a detached HEAD.",
        },
        {
          title: "In the shadow of BFD",
          story: "bisect run has finished. First return to the branch with git bisect reset, then open the guilty commit with git show. The commit message talks about enabling BFD and most of the diff really is BFD, but one more line changed in between. That line is the one that slipped through review.",
          task: "Leave bisect and show the bad commit with git show.",
          hint: "`git bisect reset` brings HEAD back to the branch you were on before bisect started. `git show hash` gives the full diff of the commit, compare what the message says with what the diff does. Putting more than one logical change in a commit is exactly how mistakes like this slip through review.",
        },
      ],
    },
    g8: {
      title: "Fix the line",
      story: "The fix is one line, mtu 1400 under GigabitEthernet0/0/0 goes back to mtu 1500. Careful, if you run git checkout v1.0 -- branch-ams-01.conf you also roll back the syslog collector change Ayşe added later. So fix only the relevant line, with nano or with sed -i, whichever you prefer. git revert 2c7d4f0 also works, it directly produces an inverse commit.",
      task: "Set the WAN interface mtu in branch-ams-01.conf to 1500, do not touch the syslog line.",
      hint: "You can open the file with `nano` and fix the line, or change it in place with `sed -i`, where -i writes over the file. `git checkout v1.0 -- file` rewinds the whole file and also wipes the syslog change added later. `git revert` produces the inverse of the bad commit as a new commit.",
      v: [
        {
          title: "Fix the ACL line",
          story: "The fix is one line, the deny line goes back to its old permit form. Careful, if you run git checkout v2.3 -- edge-izm-02.acl you also roll back the SNMP collector line Ayşe added later. Fix only the relevant line, with nano or with sed -i.",
          task: "Change the deny udp eq 4500 line in edge-izm-02.acl to permit udp host 198.51.100.10 host 203.0.113.66 eq 4500, do not touch the SNMP lines.",
          hint: "You can open the file with `nano` and fix the line by hand, or change it in place with `sed -i`, where -i writes the change over the file. Rolling the whole file back to the tagged version looks easy, but it also wipes the later legitimate changes. Do not forget to put the source address back too, leave it as any and the ACL is wider than it needs to be.",
        },
        {
          title: "Fix the AS number",
          story: "The fix is one line, remote-as 65001 for the spine goes back to 65100. The BFD lines are correct, leave them. Also do not touch the VLAN 130 and VNI 10130 lines Mehmet added later, and since git revert would roll back the whole commit it would rip out BFD too.",
          task: "Change the remote-as 65001 line in leaf-02.conf to remote-as 65100, do not touch the BFD and VLAN 130 lines.",
          hint: "You can open the file with `nano` and fix the number, or change it in place with `sed -i`. This commit did two things at once and revert would undo both, here we only want to fix the faulty line. In NX-OS indentation defines the block structure, keep the leading spaces on the line.",
        },
      ],
    },
    g9: {
      title: "Restore the stash",
      story: "Bisect is done, the working tree now holds only your fix. Bring back the NTP change you set aside. git stash pop applies the top stash and removes it from the list, git stash apply applies it but keeps it in the list. git stash list shows what has piled up.",
      task: "Bring the stashed change back into the working tree.",
      hint: "`git stash pop` applies the top stash to the working tree and removes it from the list, `git stash apply` applies it but keeps it in the list. If there is a conflict the stash is not dropped, you have to resolve the conflict first. `git stash list` shows what has piled up on the stack.",
      v: [
        {
          title: "Jump host line back",
          story: "Bisect is done, the working tree holds only your fix. Bring back the second jump host line you set aside.",
          task: "Bring the stashed change back into the working tree.",
          hint: "`git stash pop` applies the top stash to the working tree and removes it from the list, `git stash apply` applies it but keeps it in the list. If pop hits a conflict on the same lines the stash is not dropped, you have to resolve the conflict first. `git stash list` shows how many entries are on the stack.",
        },
        {
          title: "Syslog line back",
          story: "The fabric fix is ready in the working tree. Bring back the leaf-03 syslog change you set aside, but first check what is in the stash list.",
          task: "Look at the stash list, then bring the stashed change back into the working tree.",
          hint: "`git stash list` shows every entry named stash@{n}, newest on top. `git stash pop` applies the top one and drops it, if you want a specific entry you pass its name as an argument. After the pop `git status` should show two modified files, one is the fix and the other the syslog line.",
        },
      ],
    },
    g10: {
      title: "Who did it",
      story: "Writing the postmortem, you need to know who made the change. Not to blame anyone, but to know who to call into review for the next MTU change. The Author line is in the bisect output and in git show, and you can pull just the name with git log --format.",
      task: "Send the author of the bad commit with submit.",
      hint: "`git log -1` shows a single commit, and if you add a hash at the end it starts from that commit. `--format=%an` reduces the output to just the author name, %ae gives the email. Submit the answer as first and last name.",
      v: [
        {
          title: "Who joins the review",
          story: "The postmortem needs to say who made the change, not to blame anyone, but to know who to call into review for the next ACL change. The Author line is in the bisect output and in git show, and you can also pull just the name with git log --format.",
          task: "Send the author of the bad commit with submit.",
          hint: "`git log -1` shows a single commit, and if you add a hash at the end it starts from that commit. `--format=%an` reduces the output to just the author name, %ae gives the email and %s the subject. Submit the answer as first and last name.",
        },
        {
          title: "Fabric postmortem",
          story: "The fabric postmortem needs the author of the commit that introduced the remote-as error. The goal is to know who to call as a second pair of eyes on the next BGP change.",
          task: "Send the author of the bad commit with submit.",
          hint: "`git log -1 --format=%an hash` prints just the author name, and with %ae you get the email too. `git show hash` also shows the Author line, but the format option is cleaner in scripts. If you cannot type a name with Turkish characters, you can submit the email address instead.",
        },
      ],
    },
    g11: {
      title: "Commit the fix",
      story: "The fix is in the working tree but the repo does not know about it, and if the repo does not know, Monday's deploy will not either. Stage only branch-ams-01.conf, your NTP work is not finished yet, keep it out. The commit message should follow the repo convention, start with the hostname and say what you fixed and why. Then try git push and see what the lab says.",
      task: "Commit the branch-ams-01.conf fix with a meaningful message.",
      hint: "`git add file` puts only that file in the index, while `git add .` would also pull the NTP change restored from the stash into the commit. Give the message in quotes with `git commit -m`, start it with the hostname and include the word mtu. `git push` fails in this lab because there is no network, but the local history is still yours.",
      v: [
        {
          title: "Commit and push the fix",
          story: "The fix is in the working tree but the repo does not know about it, and if the repo does not know, Thursday's deploy will not either. Stage only edge-izm-02.acl, your jump host work is not finished yet, keep it out. The commit message should follow the repo convention, start with the hostname and say what you fixed and why. Then send it to the remote with git push.",
          task: "Commit the edge-izm-02.acl fix with a meaningful message and push it.",
          hint: "`git add file` puts only that file in the index, while `git add .` would also pull the jump host change restored from the stash into the commit. `git commit -m` takes the message in quotes, mention NAT-T or 4500 so whoever reads it six months from now understands what happened. `git push` sends the commit to the upstream branch.",
        },
        {
          title: "Fabric fix",
          story: "Commit the leaf-02 fix. Only leaf-02.conf gets staged, the leaf-03 syslog work is a separate change. The message should start with the hostname and describe the AS fix, then push.",
          task: "Commit the leaf-02.conf fix with a meaningful message and push it.",
          hint: "If you give `git add` only leaf-02.conf, only that file enters the index, check what is staged with `git status` before you commit. Mention remote-as or 65100 in the `git commit -m` message so someone hunting a BGP issue can find it in the log. `git push` sends the local commit to the branch on the remote.",
        },
      ],
    },
    sd1: {
      title: "Ticket assigned",
      story: "TAC-48213 has been assigned to you. You are on linuxlab, the jump box behind the ION 1200 in the Istanbul branch. The ticket text is under ~/tickets, and the ION event log has been pulled from the portal into /var/log/sdwan. First understand what happened, then get your hands dirty.",
      task: "Read the ticket, then submit the code of the event in the ION event log where the secure fabric link to the hub went down.",
      hint: "Read the ticket with `cat`, then filter the down events in the log with `grep DOWN`. You will see both a BFD and a VPNLINK event in the same minute, BFD is the detection mechanism and VPNLINK is the secure fabric link itself. The code you want starts with NETWORK_ and says the link went down.",
      v: [
        {
          title: "Port level outage",
          story: "TAC-48377 has been assigned to you. Same branch IST-BR-07, same jump box linuxlab, but a different morning. The ticket is under ~/tickets, and the ION event log has been pulled from the portal into /var/log/sdwan. In a failure events arrive as a chain, first the port goes down, then BFD, then the vpnlink, and finally the path switch. The root cause is the first link in the chain.",
          task: "Read the ticket, then submit the code of the event in the ION event log showing that the INET-1 physical port went down.",
          hint: "Read the ticket with `cat`, then list every down event in the log with `grep DOWN`. You will see several different codes within the same seconds, BFD and VPNLINK are consequences of the physical outage. The code starting with DEVICEHW describes the hardware, meaning the port level, and the timestamp shows it came first in the chain.",
        },
        {
          title: "LAN side peering",
          story: "TAC-48544 came in, IST-BR-07 again. This time the complaint is about the nightly backups and alarm mails. The ticket is under ~/tickets, the ION event log under /var/log/sdwan. Overnight there was activity both in the WAN fabric and on the LAN side, so you need to tell which event describes what.",
          task: "Read the ticket and submit the code of the event in the ION log where the BGP adjacency with core-sw01 on the LAN side went down.",
          hint: "`grep DOWN` brings up every down event in the log. Some of them are vpnlink, meaning WAN fabric events, and one is peering, meaning the routing adjacency on the LAN side of the ION. The peer_name field on the line tells you which device it is about, and the code is an uppercase name starting with PEERING.",
        },
      ],
    },
    sd2: {
      title: "Is the path back",
      story: "According to the log the INET-1 vpnlink came UP five minutes later and the erp-https path switched back onto INET-1. The user is still complaining, but first verify basic reachability with your own eyes. The hub subnet is 10.50.0.0/16, the ERP server is 10.50.0.10.",
      task: "Send 3 ping packets to the ERP server 10.50.0.10 and confirm they come back without loss.",
      hint: "`ping -c 3` sends three packets and stops, without -c ping on Linux runs forever. 0% packet loss shows the L3 path and the tunnel are working. If you like, check with `traceroute` how many hops the packet takes through the ION and the hub.",
      v: [
        {
          title: "Is the SMB server up",
          story: "According to the ticket the jump box cannot connect to the files.corp.lab SMB share. Before moving to the port level, verify basic reachability, if ICMP gets through then routing and the tunnel are working. files.corp.lab is on the hub side, at 10.50.0.20.",
          task: "Send 3 ping packets to files.corp.lab and confirm they come back without loss.",
          hint: "`ping -c` limits the number of packets sent, on Linux ping does not stop on its own. If you give a name it is resolved through DNS first, so you test the resolver as well. 0% packet loss shows the L3 path is healthy, but it does not prove a TCP port is open.",
        },
        {
          title: "Path to the mail server",
          story: "The alarm mails are not reaching mail.corp.lab. First check whether you can reach the server itself. The mail relay at the hub is at 10.50.0.25.",
          task: "Send a 3 packet ping to mail.corp.lab and confirm there is no packet loss.",
          hint: "`ping -c 3` sends three packets and stops, without -c ping waits for Ctrl+C. ICMP getting through shows routing and the SD-WAN tunnel are working. SMTP is a separate TCP port, a successful ping does not mean 25 is open.",
        },
      ],
    },
    sd3: {
      title: "MTU hunt",
      story: "The ticket says small files go through, large uploads hang. Every network engineer who hears that sentence thinks the same thing, MTU. Because of IPsec tunnel overhead the path MTU from the ION to the hub is not 1500. The jump box's eth0 believes it is 1500. Set the DF bit and send a large packet, and the first bottleneck on the path tells you the real MTU over ICMP.",
      task: "Use ping with DF set to send a 1472 byte payload, and submit the mtu value from the Frag needed message that comes back. You can also confirm it with tracepath.",
      hint: "`ping -M do` sets the DF bit, so routers on the path cannot fragment the packet. `-s 1472` plus the 28 bytes of IP and ICMP header makes exactly 1500 bytes. If the path has a smaller MTU, the first bottleneck reports the real MTU with a Frag needed message, and `tracepath` finds the same value without needing root.",
      v: [
        {
          title: "Largest payload",
          story: "The path MTU of the secure fabric to the hub is not 1500 because of IPsec overhead. This time, instead of looking at a single ping, find the limit yourself by narrowing the payload. With DF set fragmentation is forbidden, a packet that does not fit comes back and one that fits goes through.",
          task: "Find the largest ICMP payload that passes to 10.50.0.10 without loss using a DF set ping, and submit it.",
          hint: "`ping -M do` sets the DF bit, `-s` sets the ICMP payload size and `-c` limits the packet count. Start at 1472 and shrink the payload if you get Frag needed. The largest value that passes is the path MTU minus 28, because 20 bytes of IP and 8 bytes of ICMP header are added on top of the payload.",
        },
        {
          title: "PPPoE line",
          story: "When INET-1 fails, traffic moves to DSL-2 and large backup uploads hang there. The jump box's eth2 leg is connected to the DSL modem, and the line is PPPoE. PPPoE adds an 8 byte header to every frame, which is why the MTU on such lines cannot be 1500. Does the jump box know that? Ask it with a DF set ping.",
          task: "Ping dsl-modem 192.168.100.1 with DF set and a 1472 byte payload, and submit the mtu value from the error that comes back.",
          hint: "`ping -M do` sets the DF bit, and `-s 1472` brings the payload up to a 1500 byte packet. If you get a local error before the packet even leaves the kernel, the limit is on your own interface, not a Frag needed from a remote router. You can see the same value in the mtu field of the interface with `ip link show`.",
        },
      ],
    },
    sd4: {
      title: "The capture speaks",
      story: "The night shift took a capture on eth0 while the upload was hanging, /var/log/captures/files-mtu.pcap. Read it with tcpdump. Look at the mss value in the SYN and SYN-ACK, then count how many times the 1448 byte segment was retransmitted with the same seq number. There is no ICMP need to frag message either, so this is a PMTUD blackhole. The fix is an MSS clamp on the ION or the jump box. The right MSS is the path MTU minus 40 bytes of IP and TCP header.",
      task: "Read the capture file with tcpdump and submit the MSS clamp value that should be applied for this tunnel.",
      hint: "`tcpdump -n -r` reads a saved capture without name resolution. An mss of 1460 in the SYN shows both sides believe the MTU is 1500, and the 1448 byte segment repeating with the same seq shows large packets get lost on the way. The MSS is the path MTU minus 20 bytes of IP header and 20 bytes of TCP header.",
      v: [
        {
          title: "ICMP never arrives",
          story: "hmi-01 hangs while uploading a batch report to the partner over SFTP. The night shift took a capture on eth1, /var/log/captures/TAC-48377/partner-sftp.pcap. The partner-ext IPsec tunnel has a low MTU, and the jump box tells hmi-01 about it with ICMP need to frag. But hmi-01's Windows firewall drops ICMP, so the same 1448 byte segment goes out again and again. The permanent fix is an MSS clamp on the tunnel.",
          task: "Read the capture with tcpdump and, starting from the mtu value in the ICMP message, submit the MSS clamp value that should be applied.",
          hint: "`tcpdump -r` reads a saved capture file, and `-n` turns off name resolution so IPs and ports show raw. The mtu value on the ICMP line is the largest IP packet the path can carry. MSS covers only the TCP payload, so subtract 20 bytes of IP header and 20 bytes of TCP header from the MTU.",
        },
        {
          title: "SPAN capture",
          story: "Branch IT set up SPAN on core-sw01 and mirrored the port of the backup server bkp01 to the jump box's eth0. The capture is /var/log/captures/TAC-48544/dsl-backup.pcap, taken while INET-1 was down and traffic was on the DSL-2 fabric. The ION tells bkp01 over ICMP that the packet is too big, but bkp01 is not listening and keeps resending the same segment. An MSS clamp will be configured on the ION for the DSL-2 path.",
          task: "Read the capture and, based on the mtu value in the ICMP message, submit the correct MSS clamp value for the DSL-2 path.",
          hint: "Read the file without name resolution using `tcpdump -n -r`. The 1448 byte segments repeating with the same seq range are retransmits, and the ICMP line between them gives the real MTU of the path. Compare it with the DSL-2 path mtu value in the ION event log, then subtract 40 bytes of IP and TCP header.",
        },
      ],
    },
    sd5: {
      title: "Policy routing suspicion",
      story: "The jump box has a DSL backup line on eth2 and policy based routing is configured. For a moment you wondered, could hub traffic be leaving through the DSL table by mistake? Look at the rules with ip rule, the table names in /etc/iproute2/rt_tables, and the second table with ip route show table. Then ask the kernel directly which route it picks for 10.50.0.10.",
      task: "Use ip rule and ip route get to find which gateway hub traffic leaves through, and submit the gateway IP.",
      hint: "`ip rule` lists in priority order which route table traffic consults, and `/etc/iproute2/rt_tables` maps the numbers to names. `ip route show table` followed by 100 shows the contents of the second table. `ip route get` tells you the path the kernel actually picks for that destination, the answer is the address after the word via.",
      v: [
        {
          title: "Vendor VPN path",
          story: "The partner company connects for remote support from the 10.20.0.0/16 subnet. TAC asked you to confirm where this traffic leaves the jump box. Look at ip rule, rt_tables and the route tables, then ask the kernel directly.",
          task: "Use ip route get to find the gateway IP that traffic to 10.20.0.15 leaves through, and submit it.",
          hint: "`ip rule` lists in order which traffic consults which route table, and `/etc/iproute2/rt_tables` maps table numbers to names. `ip route get` shows, without any guesswork, the route the kernel actually picks for that destination. The answer is the address after the word via, and the dev field tells you which interface the packet leaves on.",
        },
        {
          title: "Source based routing",
          story: "The probe script that monitors the ION's DSL-2 health goes to the hub from the jump box's eth2 address, the source 192.168.100.5. When the source address changes, policy routing kicks in and a completely different table is consulted. Confirm the probe really leaves through the DSL modem.",
          task: "Use ip route get to find the gateway for traffic from source 192.168.100.5 to 10.50.0.10, and submit it.",
          hint: "The from 192.168.100.5 line in `ip rule` says this source consults the dsl table. If you give `ip route get` the source address with the from parameter, you see the decision the kernel makes including policy routing. Leave out from and the main table is used, which leads you to the wrong answer.",
        },
      ],
    },
  },
});

addEn({
  missions: {
    sd6: {
      title: "Firewall dig",
      story: "Routing is clean, the path is UP, but erp.corp.lab 8443 still does not open. There is a note in the ticket, a hardening script was run last night. On Linux the first suspect is netfilter. Read the chains with iptables -L -n -v, the pkts column tells you which rule is eating traffic. Watch out for custom chains, OUTPUT and FORWARD may be jumping into one.",
      task: "Submit the name of the chain that holds the rule dropping traffic to port 8443.",
      hint: "`iptables -L` lists the chains, `-n` turns off name resolution and `-v` shows the packet and byte counters. Even reading the firewall needs root, so `sudo` is a must. Find the DROP line, the chain it belongs to is written in the Chain header above it, OUTPUT and FORWARD only jump there.",
      v: [
        {
          title: "Cutover leftover",
          story: "Routing is clean, files.corp.lab answers ping, but SMB, port 445, does not open. The ticket says a cutover script was run last night. Read the chains with iptables, the pkts column tells you which rule is eating traffic. OUTPUT and FORWARD may be jumping into a custom chain.",
          task: "Submit the name of the chain that holds the rule dropping traffic to port 445.",
          hint: "`iptables -L` lists the chains, `-n` turns off name and port resolution and `-v` adds the packet and byte counters. Even reading the firewall needs root, so you need `sudo`. Find the DROP line, the chain it belongs to is written in the Chain header above it. Without -n you see the service name instead of the port number.",
        },
        {
          title: "Egress hardening",
          story: "mail.corp.lab answers ping, but the alarm mails still do not go out. The ticket note says egress hardening was done last week. Blocking outbound SMTP against spam bots is a common step, but forget to exempt the internal relay and you cut off your own alarms.",
          task: "Submit the name of the chain that holds the rule dropping traffic to port 25.",
          hint: "`iptables -L` with `-n` and `-v` shows every chain with its counters, and it needs root. Without -n iptables writes 25 as smtp, both mean the same thing. Follow the jump target in the OUTPUT chain, the DROP line is under that custom chain. `iptables -S` gives the same rules in the command form they were added with.",
        },
      ],
    },
    sd7: {
      title: "Drop or reject",
      story: "You have seen the rule, now match it to the symptom. A DROP rule silently swallows the SYN, the other side sees nothing and the client hits a timeout. With REJECT you would see Connection refused. Try connecting to 8443 with nc, do you get timed out or refused?",
      task: "Test port 8443 on 10.50.0.10 with nc and see that it times out. Try port 443 as well for comparison.",
      hint: "`nc -z` only attempts a TCP connection without sending data, and `-v` prints the result. timed out points to a DROP on the path, refused means the host was reached but nothing is listening on the port. Testing 8443 and 443 side by side makes the difference clear.",
      v: [
        {
          title: "SMB timeout",
          story: "You have seen the rule, now match it to the symptom. DROP silently swallows the SYN and the client hits a timeout. A closed port or a REJECT returns Connection refused right away. Putting 445 and 139 side by side makes the difference clear.",
          task: "Test port 445 on 10.50.0.20 with nc and see that it times out. Try port 139 as well for comparison.",
          hint: "`nc -z` only tries to set up a TCP connection without sending data, and `-v` prints the result. timed out shows there is a DROP on the path, refused means the host was reached but nothing is listening on that port. This distinction answers the question of firewall versus service.",
        },
        {
          title: "SMTP timeout",
          story: "Match the EGRESS-SMTP rule to the symptom. The relay also listens on the 587 submission port, try that too for comparison. One will time out, the other will say something different.",
          task: "Test port 25 on 10.50.0.25 with nc and see that it times out. Try port 587 as well for comparison.",
          hint: "`nc -zv` only attempts a TCP handshake to the target and prints the result. A timed out answer says the SYN was silently dropped somewhere, which is a typical DROP rule. If 587 answers differently in this setup, the problem is not the relay but the filter in between.",
        },
      ],
    },
    sd8: {
      title: "Remove the rule",
      story: "You talked to branch IT, HUB-BLOCK was forgotten and never removed after the cutover. Change approval has come in. Delete the rule, then confirm with nc that 8443 now says succeeded. With iptables you can delete by rule number or by the full spec, and if you prefer nft, first find the handle number with nft -a list ruleset.",
      task: "Delete the DROP rule in the HUB-BLOCK chain and test 8443 again with nc.",
      hint: "`iptables -D` takes the chain name followed by either the rule number or the exact spec used when adding it, and since HUB-BLOCK has a single rule its number is 1. If you prefer nftables, `nft -a list ruleset` shows the handle numbers and you delete with `nft delete rule`. Then confirm with `nc -zv` that 8443 says succeeded.",
      v: [
        {
          title: "Remove CUTOVER-HOLD",
          story: "Branch IT approved, CUTOVER-HOLD was forgotten and never removed after the cutover. Delete the rule and confirm that 445 now says succeeded. With iptables you can delete by rule number or by the full spec.",
          task: "Delete the DROP rule in the CUTOVER-HOLD chain and test 445 again with nc.",
          hint: "`iptables -D` deletes a rule from a chain, after the chain name you give either the rule number or the exact spec used when adding it. The chain has a single rule so its number is 1, and you need root too. Then repeat the test with `nc -zv`, you should see succeeded instead of timed out.",
        },
        {
          title: "Delete with nft",
          story: "Selin approved, SMTP to the internal relay must be allowed again. This time work from the nftables side, iptables writes to nf_tables in the background anyway. nft rules are deleted by handle number.",
          task: "Delete the DROP rule in the EGRESS-SMTP chain with nft by its handle number, then test 25 again with nc.",
          hint: "`nft -a list ruleset` appends the handle number to every rule, without -a handles are not shown. The delete command `nft delete rule` needs the family, table, chain and handle number. After deleting, check with `nc -zv` that port 25 says succeeded.",
        },
      ],
    },
    sd9: {
      title: "Where does DNS go",
      story: "ERP opens now, but the erp-agent service still says could not resolve. /etc/resolv.conf points to the ION and dig erp.corp.lab answers fine. So the agent is not using the system resolver. Both journalctl -u erp-agent and /var/log/captures/dns.pcap tell the same story, some queries go to a server that never answers.",
      task: "Find the wrong DNS server IP that erp-agent queries, in the capture or in the agent config, and submit it.",
      hint: "Read dns.pcap with `tcpdump -n -r` and use the `port 53` filter so only DNS is left. The destination of the queries that are resent with the same query ID and never get an answer is the server you are looking for. `grep -r` finds the override line in the config under /opt/erp-agent, and you confirm with `dig` by querying that server directly that it does not answer.",
      v: [
        {
          title: "Overridden DNS",
          story: "historian-sync still says could not resolve. The system resolver points to the ION and dig files.corp.lab answers fine. So the service uses its own DNS. journalctl -u historian-sync, the config under /opt/historian-sync and /var/log/captures/TAC-48377/historian-dns.pcap all tell the same story.",
          task: "Find the unresponsive DNS server IP that historian-sync queries, and submit it.",
          hint: "Read the capture with `tcpdump -r`, and if you add a `port 53` filter at the end only DNS packets remain. Look at the destination of the queries that never get an answer and are resent with the same query ID. `grep -r` scans a directory recursively and finds the override line in the config, and you confirm with `dig` by querying that server directly that it does not answer.",
        },
        {
          title: "Retired DC",
          story: "The nightly backup jobs fail with could not resolve. bkp-agent carries its own nameserver setting and ignores the system resolver. The ticket note says the old branch DC was retired, that is a clue. Look at the service log, the config under /opt/bkp-agent and /var/log/captures/TAC-48544/bkp-dns.pcap.",
          task: "Find the unresponsive DNS server IP that bkp-agent queries, and submit it.",
          hint: "`journalctl -u` fetches the log of a specific service, and bkp-agent itself writes which nameserver it uses. Read the capture with `tcpdump -n -r` and the `port 53` filter, the unanswered queries should all go to the same address. Find that line in the config with `grep -r` and you prove where it comes from too.",
        },
      ],
    },
    sd10: {
      title: "Cert check",
      story: "The user reportedly gets a certificate warning when opening ERP in the browser. Now that the firewall is open, you can watch the handshake yourself with openssl s_client. The Verify return code line tells the whole story. If you like, also check the files under /opt/app/certs with openssl x509, there is a separate surprise for files.corp.lab too.",
      task: "Do a TLS handshake to erp.corp.lab 8443 with openssl s_client and submit the Verify return code number.",
      hint: "`openssl s_client -connect` takes host and port joined by a colon as a single argument, and `-servername` sends SNI and makes name verification possible. If the Verify return code at the end of the output is 0 there is no problem, any other number comes with a description of the reason. You can also read the validity dates in a file with `openssl x509 -noout -dates`.",
      v: [
        {
          title: "Wrong name",
          story: "The ticket says the browser warns when files.corp.lab is opened over HTTPS. Has the certificate expired, does the name not match, or is the CA untrusted? Do the handshake yourself with openssl s_client, the Verify return code line gives the answer. You can also see the names inside the certificate with openssl x509.",
          task: "Do a handshake to files.corp.lab 443 with openssl s_client and submit the Verify return code number.",
          hint: "`openssl s_client -connect` takes host and port joined by a colon as a single argument. `-servername` sends SNI and tells openssl which name to verify against, leave it out and the name check may be skipped. If the Verify return code at the end of the output is 0 all is well, any other number comes with a description of the problem.",
        },
        {
          title: "Is the certificate innocent",
          story: "Users say they get a certificate warning for portal.corp.lab. First either clear the server side or blame it. If verify succeeds in the handshake, the problem is most likely on the client side, a missing CA or a proxy in the middle.",
          task: "Do a handshake to portal.corp.lab 443 with openssl s_client and submit the Verify return code number.",
          hint: "With `openssl s_client -connect` you do the TLS handshake by hand, and `-servername` is needed for SNI and hostname verification. A Verify return code of 0 means the certificate's validity period, name and chain are all correct. To double check, you can also read the dates in the file with `openssl x509` and `-noout -dates`.",
        },
      ],
    },
    sd11: {
      title: "IKE negotiation",
      story: "Last item, the new cloud-lab IPsec tunnel on the jump box never came up. strongSwan runs here. Use ipsec statusall to see which SA is ESTABLISHED and which is CONNECTING, then look at what the peer said in its IKE_SA_INIT response with journalctl -u strongswan. /etc/ipsec.conf and /opt/cloud-lab/onboarding.txt explain why.",
      task: "Submit the name of the IKE notify error the peer returned for cloud-lab.",
      hint: "`ipsec statusall` connects to charon over a socket, so it needs `sudo`, and it shows which SA is ESTABLISHED and which is CONNECTING. The strongswan unit log from `journalctl -u` contains the peer's IKE_SA_INIT response, and the notify error is an uppercase name with underscores. Compare the ike line in ipsec.conf with the accepted proposal in the onboarding document.",
      v: [
        {
          title: "DR tunnel",
          story: "Last item, the new dr-site IPsec tunnel does not come up. Its definition is in /etc/ipsec.d/dr-site.conf. The proposals match this time, IKE_SA_INIT goes through, the problem is in the next step, IKE_AUTH. Look at the SA state with ipsec statusall and the peer's response with journalctl -u strongswan. The PSK note in the ticket and /opt/dr-site/onboarding.txt explain the cause.",
          task: "Submit the name of the IKE notify error the peer returned for dr-site.",
          hint: "`ipsec statusall` connects to charon over a socket, which is why it needs `sudo`. `journalctl -u` fetches the strongswan unit log, and you can filter the peer's error notifications with `grep -i notify`, but the log also has cloud-lab lines left over from TAC-48213, so watch the date and the conn name. An error that arrives in IKE_AUTH after IKE_SA_INIT succeeded usually points to authentication, meaning the PSK or the ID.",
        },
        {
          title: "Up but no traffic",
          story: "The HMI vendor's remote maintenance tunnel ot-vendor shows ESTABLISHED at the IKE level, but there is no CHILD_SA under it, meaning the IPsec SA that would carry the traffic was never set up. The proposals match, the peer objects to something else. The definition is in /etc/ipsec.d/ot-vendor.conf, compare the statusall output, the strongswan log and /opt/ot-vendor/onboarding.txt.",
          task: "Submit the name of the notify error the peer returned when rejecting the CHILD_SA setup.",
          hint: "In the `ipsec statusall` output, when run with sudo, ot-vendor has an ESTABLISHED line but no INSTALLED line, which shows the IKE_SA came up but the CHILD_SA did not. Read the notify messages in the strongswan unit log with `journalctl -u`, and do not mix in the old cloud-lab lines. The traffic selectors come from leftsubnet and rightsubnet in the conn definition and must exactly match what the peer allows.",
        },
      ],
    },
    sd12: {
      title: "Root cause",
      story: "Time to close the ticket. The path flap was real, but it recovered in five minutes. The large upload problem is MTU and a missing MSS clamp. The agent's DNS problem is an old resolver in its config. The cert has expired, that is the application team's job. IPsec has a proposal mismatch. So what was the real reason ERP was completely unreachable from the jump box and the OT VLAN?",
      task: "Submit the root cause of the ERP 8443 access outage in one word.",
      hint: "Think about what the hardening script left behind, ping went through but 8443 timed out. The layer silently dropping the packet is Linux netfilter. iptables, firewall or the chain name are accepted.",
      v: [
        {
          title: "Root cause",
          story: "Time to close the ticket. INET-1 dropped at the port level and came back in twenty minutes. The partner SFTP problem is tunnel MTU and a missing MSS clamp. The historian-sync config has an old DNS override. The files certificate has a name mismatch, and the dr-site PSK is outdated. So what was the real reason the jump box and the historian could never reach the SMB share?",
          task: "Submit the root cause of the files.corp.lab 445 access outage in one word.",
          hint: "Think about what the cutover script left behind, ping went through but 445 timed out. The layer silently dropping the packet is Linux netfilter. iptables, firewall or the chain name are accepted.",
        },
        {
          title: "Why the backup failed",
          story: "You are closing TAC-48544. Overnight the WAN fabric moved to DSL-2, where the path MTU is small and bkp01 ignores ICMP, which slowed the uploads. EGRESS-SMTP cut off the alarm mails, the ot-vendor tunnel has a traffic selector mismatch, and the portal certificate is clean. But what was the real reason the backup jobs failed with could not resolve before they even started?",
          task: "Submit the root cause of the nightly backup job failures in one word.",
          hint: "bkp-agent could not resolve the file server's name, so it failed before connecting. The agent used the address of a retired server from its config instead of the system resolver. dns, resolver or nameserver are accepted.",
        },
      ],
    },
    no1: {
      title: "Duplex mismatch",
      story: "They say the HMI in the OT VLAN is slow. eth1 connects to an old OT switch, and the switch side was hard set to 100 full. When autoneg faces a port without autoneg, our side falls back to half through parallel detection. Check the link state with ethtool.",
      task: "Find the Duplex value of the eth1 interface with ethtool and submit it.",
      hint: "Given an interface name, `ethtool` shows Speed, Duplex and the autoneg state. If Link partner advertised auto-negotiation is No, the far port is hard set, and in that case parallel detection finds the speed but picks half for duplex. Supported link modes is the card's capability, the Duplex line is the actual current state.",
      v: [
        {
          title: "DSL leg",
          story: "The LAN port of the DSL modem is gigabit, but things are slow on the jump box's eth2 leg. If one of the four pairs in the cable is broken, gigabit cannot come up and the link drops to 100, this is called downshift. Check with ethtool what speed the link actually came up at.",
          task: "Find the Speed value of the eth2 interface with ethtool and submit it.",
          hint: "Given an interface name, `ethtool` shows the link settings, meaning Speed, Duplex and autoneg. Supported link modes says what the card can support, Speed says what it is running at right now, do not mix them up. You can confirm the result with the igb messages in `sudo dmesg`.",
        },
        {
          title: "Speed dropped too",
          story: "Because of a failure the OT switch was replaced with an old spare and the port was hard set. When the far side does not do autoneg, our side catches the speed through parallel detection but drops duplex to half. The HMI team says everything is even slower than before.",
          task: "Find the Speed value of the eth1 interface with ethtool and submit it.",
          hint: "`ethtool eth1` shows the current Speed and Duplex of the link. If Link partner advertised auto-negotiation is No, the far port is hard set, and parallel detection can find the speed but cannot know the duplex, so it picks half. Advertised link modes is our offer, not the actual result.",
        },
      ],
    },
    no2: {
      title: "CRC counter",
      story: "A duplex mismatch shows up in the counters. The half side sees late collisions, the full side sees CRC errors and runts. Read the driver statistics.",
      task: "Submit the rx_crc_errors value for eth1.",
      hint: "`ethtool -S` lists the driver's raw NIC counters, and since the output is long, filter it with `grep crc`. In a duplex mismatch the full duplex side sees CRC errors and runts, the half duplex side sees late collisions. The same total also appears in the RX errors column for eth1 in the `ip -s link` output.",
      v: [
        {
          title: "Cable fault",
          story: "If there is a downshift, the cable problem shows in the counters too. Frames arriving over the broken pair fail their checksum and are counted as CRC errors. Read the driver statistics.",
          task: "Submit the rx_crc_errors value for eth2.",
          hint: "`ethtool -S` lists the raw NIC counters kept by the driver, and since the output is long, filtering with `grep crc` is handy. The same error total also shows in the RX errors column for eth2 in the `ip -s link` output. The counter accumulates since boot, so look twice a few minutes apart to see it increase.",
        },
        {
          title: "Late collision",
          story: "The half duplex side cannot send and receive at the same time, so collisions start while the far side talks full duplex. A collision detected after the first 64 bytes is called a late collision, and it is almost always a sign of duplex mismatch.",
          task: "Submit the tx_late_collisions value for eth1.",
          hint: "`ethtool -S eth1` gives the NIC counters, filter the relevant line with `grep late`. Late collisions are only counted on the half duplex side, the full duplex side sees the same problem as CRC errors and runts. The collsns column in `ip -s link` is total collisions, the late ones are a subset of it.",
        },
      ],
    },
    no3: {
      title: "ARP table",
      story: "There should be one more device in the OT VLAN, but nobody can reach it. In the ARP table an entry that gets no reply shows as incomplete, while ip neigh says FAILED.",
      task: "Submit the IP address of the incomplete entry in the ARP table.",
      hint: "`arp -an` lists the ARP cache without name resolution, and `<incomplete>` is a neighbor that never answered the ARP request. Its modern equivalent `ip neigh` shows the same entry as FAILED. Trying to reach such a device at L3 is pointless, the problem is at L2 or in the device itself.",
      v: [
        {
          title: "New historian",
          story: "A new collector called historian-02 was added to the OT VLAN, but nobody can reach it. If a device does not answer ARP it does not even exist at L2, you never get up to the IP layer. In the ARP table an entry that gets no reply shows as incomplete, and as FAILED in ip neigh. 192.168.2.60 is already recorded in the inventory as a decommissioned PLC, that one is an old ghost.",
          task: "Submit the IP address of the new device showing incomplete in the ARP table, historian-02.",
          hint: "`arp -an` lists the ARP cache, `-n` turns off name resolution and `-a` gives the BSD style one line format. Its modern equivalent `ip neigh` shows the same entry as FAILED. incomplete means the ARP request went out but no reply came back, so the problem is the cable, the VLAN or the device itself.",
        },
        {
          title: "Ghost of a retired server",
          story: "Something is still trying to talk to the old branch DC. The jump box asks ARP for that address but gets no reply, because the server has been physically removed. The ARP table shows this clearly.",
          task: "Submit the IP address of the entry showing incomplete on eth0 in the ARP table.",
          hint: "`arp -an` shows each entry on one line with IP, MAC and interface, and `<incomplete>` is a neighbor whose MAC could not be learned. `ip neigh` gives the same table with states like FAILED, REACHABLE or STALE. The old PLC entry in the OT VLAN is incomplete too, so use the on eth0 part to pick out the one on the LAN side.",
        },
      ],
    },
    no4: {
      title: "Is forwarding on",
      story: "The jump box acts as the router for the OT VLAN, forwarding packets from eth1 to eth0 and NATing them. For this to work, ip_forward must be enabled in the kernel. Read it with sysctl, it is the same thing as the file under /proc/sys.",
      task: "Submit the value of net.ipv4.ip_forward.",
      hint: "`sysctl` reads a kernel parameter by its dotted name, its counterpart is a file under /proc/sys where the dots map to directory separators. If ip_forward is 1 the kernel moves packets between interfaces, if it is 0 it does not act as a router. The persistent value lives in `/etc/sysctl.conf`.",
      v: [
        {
          title: "Runtime versus config",
          story: "Since the cutover night the OT VLAN cannot reach the hub. On a Linux box acting as a router, the first thing to check is whether the kernel is allowed to forward packets. Read the running value with sysctl, then compare it with /etc/sysctl.conf, the two do not always have to match.",
          task: "Submit the value of net.ipv4.ip_forward.",
          hint: "`sysctl` reads kernel parameters by dotted name, under the hood it looks at the file under /proc/sys, with the dots mapping to directory separators. 1 means forwarding is on, 0 means off. `/etc/sysctl.conf` is applied only at boot, so if it says 1 and the running value is 0, someone turned it off at runtime with `sysctl -w`.",
        },
        {
          title: "Full table",
          story: "New connections dropped randomly overnight, and there are nf_conntrack table full messages in sudo dmesg. When the conntrack table is full the kernel cannot open an entry for a new flow and drops the packet. Someone may have lowered the table size during hardening.",
          task: "Read the value of net.netfilter.nf_conntrack_max with sysctl and submit it.",
          hint: "`sysctl` reads the parameter by its dotted name, its counterpart is a file under /proc/sys/net/netfilter. nf_conntrack_count is the current number of entries and max is the upper limit, if the two are equal the table is full. Confirm the diagnosis by finding the table full messages with `sudo dmesg`.",
        },
      ],
    },
    no5: {
      title: "Enable PLPMTUD",
      story: "Lesson from the MTU story, if you want the kernel to shrink the MSS on its own on paths with an ICMP blackhole, you enable tcp_mtu_probing. For persistence it goes in /etc/sysctl.conf, for right now use sysctl -w. Writing needs root.",
      task: "Set the net.ipv4.tcp_mtu_probing parameter to 1.",
      hint: "`sysctl -w` changes the parameter instantly in the running kernel, name and value are written with an equals sign and no spaces. Writing a kernel setting needs root, without `sudo` you get permission denied. A change made with -w is lost on reboot, for persistence edit sysctl.conf and load it with `sysctl -p`.",
      v: [
        {
          title: "Turn forwarding on",
          story: "ip_forward is off, that is why the OT VLAN cannot reach the hub. The cutover script turned forwarding off temporarily and forgot to turn it back on, sysctl.conf is already correct. Fix it in the running kernel without waiting for a reboot. Writing a kernel setting needs root.",
          task: "Set the net.ipv4.ip_forward parameter to 1.",
          hint: "`sysctl -w` changes the parameter instantly in the running kernel, name and value are written with an equals sign and no spaces. Writing a kernel setting needs root privileges, without `sudo` you get permission denied. A change made with -w is lost on reboot, the persistent value comes from sysctl.conf and can be reloaded with `sysctl -p`.",
        },
        {
          title: "Grow the table",
          story: "Change approval has come in, the conntrack table will be sized for the jump box's load. The target value is 262144. Writing a kernel setting needs root.",
          task: "Set the net.netfilter.nf_conntrack_max parameter to 262144.",
          hint: "`sysctl -w` writes the value instantly to the running kernel and needs root, so run it with `sudo`. The value must be just the number, no unit. Every conntrack entry takes a few hundred bytes of RAM, so instead of blindly raising max you have to balance it against memory.",
        },
      ],
    },
    no6: {
      title: "Conntrack table",
      story: "The conntrack table shows NATed flows and their states. A flow whose dst address changes in the reply tuple has been NATed. UNREPLIED means the packet went out but no reply ever came back. Reading the table needs root.",
      task: "Submit the dst address of the flow in UNREPLIED state in the conntrack table.",
      hint: "`conntrack -L` lists the flows the kernel tracks, each line shows the original direction first and then the expected reply direction. UNREPLIED means the packet went out but nothing ever came back. Reading it needs `sudo`, filter with `grep UNREPLIED` and read the first dst field.",
      v: [
        {
          title: "Clock drifting",
          story: "The jump box clock has drifted by minutes and log correlation is broken. chrony queries an external NTP server but does not seem to get an answer. The conntrack table clearly shows whether a flow got a reply. Reading it needs root.",
          task: "Submit the dst address of the NTP flow in UNREPLIED state in the conntrack table.",
          hint: "`conntrack -L` lists every flow the kernel tracks, each line shows the original direction first and then the expected reply direction. The UNREPLIED mark means the packet went out but nothing came back from the other side. You will see more than one UNREPLIED line, NTP uses udp 123, so check the dport field and read the first dst field of the right flow.",
        },
        {
          title: "Half open SYN",
          story: "The alarm mails were not going out. The conntrack table shows TCP flows with their states. If SYN_SENT and UNREPLIED appear together, the SYN went out but the SYN-ACK never came back.",
          task: "Submit the dst address of the TCP flow stuck in SYN_SENT state in the conntrack table.",
          hint: "`sudo conntrack -L` lists the flows, and TCP lines also have a state field. UNREPLIED alone only says no reply came and shows up on UDP lines too, while SYN_SENT shows a TCP connection stuck in the three way handshake. The dport field tells you which service was targeted, and the first dst field gives the destination address.",
        },
      ],
    },
  },
});

addEn({
  missions: {
    no7: {
      title: "Reading nft",
      story: "On a modern kernel iptables actually writes on top of nf_tables, and nft list ruleset shows you the same rules in their native form. The nat table has a masquerade rule for the OT VLAN.",
      task: "Submit the source network that masquerade is applied to in the nft ruleset, including the prefix.",
      hint: "`nft list ruleset` shows every table in native nftables syntax and needs root. In the POSTROUTING chain of the nat table, the masquerade line starting with ip saddr tells you who gets NATed. Write the answer as the network address together with the prefix length.",
      v: [
        {
          title: "Container NAT",
          story: "A few docker containers run on the jump box and get NATed on the way out. Docker does this by adding its own masquerade rule to the nat table. There is one more next to the OT VLAN rule.",
          task: "Submit the source network that masquerade is applied to for the docker bridge in the nft ruleset, including the prefix.",
          hint: "`nft list ruleset` shows every table in native syntax, and even reading it needs root. The POSTROUTING chain of the nat table has two masquerade lines starting with ip saddr. Docker's rule NATs traffic leaving the bridge, and you can confirm the network from the docker0 address in the `ip -br addr` output.",
        },
        {
          title: "WireGuard clients",
          story: "Admins who connect remotely come into the jump box over WireGuard and leave from here NATed. This masquerade rule was added last week.",
          task: "Submit the source network that masquerade is applied to for WireGuard clients in the nft ruleset, including the prefix.",
          hint: "`nft list ruleset` runs as root and shows the POSTROUTING rules in the nat table. There is more than one masquerade, match the one belonging to WireGuard against the subnet of the wg0 interface, which `ip -br addr` gives you. Write the answer as the network address together with the prefix length.",
        },
      ],
    },
    no8: {
      title: "tcpdump filter",
      story: "otlab-syn.pcap was taken on eth1, it has the HMI's SYNs to ERP mixed with other traffic. Filter only the packets you care about with a BPF filter. Linux retransmits a SYN at 1, 2 and 4 second intervals, so watch the timestamps too.",
      task: "Submit the total number of SYN packets to port 8443 in the capture.",
      hint: "`tcpdump -r` reads the capture file, and the BPF expression you add at the end filters packets, `dst port 8443` keeps only those with destination port 8443. Wrapping the filter in single quotes turns several words into one argument. SYNs repeating with the same seq are retransmits, and each one counts as a separate packet.",
      v: [
        {
          title: "SMB SYNs",
          story: "historian-syn.pcap was taken on eth1 while the historian could not connect to the SMB share. It also has ARP, ping and other TCP traffic. Filter only the packets you care about with a BPF filter. SYN retransmits come at doubling intervals, look at the timestamps too.",
          task: "Submit the total number of SYN packets to port 445 in the capture.",
          hint: "`tcpdump -r` reads the file, and the BPF expression you write at the end filters packets, `dst port 445` keeps only those with destination port 445. Wrapping the filter in single quotes is a good habit, several words go as one argument. The SYN and RST to 139 are a separate attempt, do not count them.",
        },
        {
          title: "Alarm SYNs",
          story: "alarm-smtp.pcap was taken on the jump box's eth0. The alarm mailer first tries 25, and when that fails it waits five minutes and tries again. DNS and 587 traffic are mixed in as well.",
          task: "Submit the total number of SYN packets to port 25 in the capture.",
          hint: "Read the file with `tcpdump -n -r` and give it the `dst port 25` filter. If you write only port 25 you get every packet with 25 as source or destination, adding dst keeps only the destination direction. The handshake to 587 succeeds, do not count it, add up all the SYNs from the two separate attempts to 25.",
        },
      ],
    },
    no9: {
      title: "Reading mtr",
      story: "Many people panic when they see 60 percent loss on an intermediate hop in an mtr report. If the hop itself rate limits its ICMP replies, the loss shows only on that line and does not carry over to the following hops. Real loss continues on every line after that hop.",
      task: "Run a 5 packet mtr report to 203.0.113.20 and submit the Loss percentage on the last hop as a whole number.",
      hint: "`mtr -r` runs in report mode and prints a single report when done, `-c` sets how many packets go to each hop. If loss on an intermediate hop does not carry over to the following lines, it is ICMP rate limiting, not real loss. The last line is the target itself, that is the value you really need to look at.",
      v: [
        {
          title: "Is it really dead",
          story: "198.51.100.53, the server historian-sync uses, was not answering. Examine the path hop by hop with mtr. Loss on an intermediate hop is usually due to ICMP rate limiting and does not carry over to the following hops. But if the last hop shows loss too, the target really is not answering.",
          task: "Run a 5 packet mtr report to 198.51.100.53 and submit the Loss percentage on the last hop as a whole number.",
          hint: "`mtr -r` is report mode, instead of updating the screen live it prints a single report when done, and `-c` sets how many packets go to each hop. Read the Loss column from top to bottom, loss on an intermediate hop that does not last until the final line is irrelevant. The last line is the target itself, the real answer is the value there.",
        },
        {
          title: "Where latency jumps",
          story: "You wonder where the path to the mail relay slows down. mtr also gives latency for every hop. On the branch LAN it is under a millisecond, and when you cross the SD-WAN fabric to the hub you expect a jump as if you had changed continents.",
          task: "Run a 5 packet mtr report to mail.corp.lab and submit the IP address of the hop where latency first jumps.",
          hint: "`mtr -r -c 5` sends five packets to each hop and gives the average latency in the Avg column. Add `-n` and you see IPs instead of names, which is handier for the answer. The jump is usually where the tunnel starts, the following hops just carry that latency along.",
        },
      ],
    },
    no10: {
      title: "Second route table",
      story: "On a multi homed host, a separate route table and a source based rule are used for the second uplink. Table 100 is defined for the DSL backup, its name is in the rt_tables file.",
      task: "Submit the gateway address of the default route in table 100.",
      hint: "`ip route show table` followed by a name or number lists the contents of that route table, without table you only see main. Table names come from the `/etc/iproute2/rt_tables` file, 100 and dsl are the same table. The answer is the address on the default via line.",
      v: [
        {
          title: "Management table",
          story: "Replies to management traffic coming into the jump box over WireGuard must go back through the same tunnel, otherwise you get asymmetric routing and rp_filter drops the packet. For this a separate route table and a source based rule were defined, its name is in the rt_tables file.",
          task: "Submit the gateway address of the default route in the mgmt table.",
          hint: "`cat /etc/iproute2/rt_tables` maps table numbers to names, and `ip rule` shows which source address consults which table. List that table's contents with `ip route show table` followed by its name or number. Without table you only see main, and the route you want is not there.",
        },
        {
          title: "OT policy route",
          story: "Traffic from the OT VLAN must pass through a separate OT firewall before it goes to the hub, an IEC 62443 requirement. The jump box does this with policy routing, OT traffic entering on eth1 consults a separate table.",
          task: "Submit the gateway address of the default route in the ot table.",
          hint: "The from 192.168.2.0/24 iif eth1 line in the `ip rule` output tells you which table OT traffic is sent to. List that table by name or number with `ip route show table`. The iif condition selects only packets entering on eth1, traffic the jump box generates itself does not match this rule.",
        },
      ],
    },
  },
  quiz: {
    "ping -M do -s 1472 sonrası Frag needed and DF set (mtu = 1400) ne anlatır?": {
      q: "After ping -M do -s 1472 you get Frag needed and DF set with mtu = 1400. What does that tell you?",
      a: ["A hop on the path cannot fragment anything above 1400 bytes, the path MTU is 1400", "The target host is down", "DNS could not be resolved", "Ping needs root privileges"],
    },
    "Path MTU 1400 ise TCP MSS clamp değeri kaç olmalı?": {
      q: "If the path MTU is 1400, what should the TCP MSS clamp value be?",
      a: ["1360", "1400", "1460", "1372"],
    },
    "nc -zv ile Connection timed out alıyorsun, en olası sebep?": {
      q: "nc -zv gives you Connection timed out. What is the most likely cause?",
      a: ["A DROP rule or a routing problem on the path", "The service is not listening on that port", "The hostname could not be resolved", "The port is already open"],
    },
    "Connection refused ne demek?": {
      q: "What does Connection refused mean?",
      a: ["The host is reachable but nothing listens on that port, or there is a REJECT", "The firewall silently dropped it", "There is an MTU problem", "No ARP reply came back"],
    },
    "tcpdump -r dosya ne yapar?": {
      q: "What does tcpdump -r file do?",
      a: ["Reads a saved capture file", "Resets the interface", "Takes a live capture", "Writes to a file"],
    },
    "ip rule çıktısındaki from 192.168.100.5 lookup dsl satırı ne anlatır?": {
      q: "What does the line from 192.168.100.5 lookup dsl in the ip rule output mean?",
      a: ["Packets from this source address consult the dsl route table", "The DSL interface is down", "The default gateway is 192.168.100.5", "The DNS server is dsl"],
    },
    "conntrack tablosunda [UNREPLIED] ne demek?": {
      q: "What does [UNREPLIED] mean in the conntrack table?",
      a: ["The flow was opened but no packet ever came back from the other side", "The flow was not NATed", "The flow is closed", "The flow is encrypted"],
    },
    "strongSwan log'unda NO_PROPOSAL_CHOSEN ne demek?": {
      q: "What does NO_PROPOSAL_CHOSEN mean in the strongSwan log?",
      a: ["The peer did not accept our IKE or ESP proposal", "The PSK is wrong", "The peer is unreachable", "The certificate has expired"],
    },
    "openssl s_client çıktısında Verify return code: 10 ne demek?": {
      q: "What does Verify return code 10 mean in the openssl s_client output?",
      a: ["Certificate has expired", "Hostname mismatch", "Self signed certificate", "Handshake ok"],
    },
    "ethtool eth1 Duplex: Half gösteriyor, karşı taraf elle 100 full. Sonuç?": {
      q: "ethtool eth1 shows Duplex Half, and the far side is hard set to 100 full. What is the result?",
      a: ["Duplex mismatch, collisions and CRC errors", "The link never comes up", "The speed becomes 1000", "No problem at all"],
    },
    "git bisect ne yapar?": {
      q: "What does git bisect do?",
      a: ["Finds the first bad commit with a binary search between a good and a bad commit", "Merges branches", "Splits a file in two", "Syncs with the remote"],
    },
    "git blame dosya ne gösterir?": {
      q: "What does git blame file show?",
      a: ["Which commit and which person wrote each line", "Syntax errors in the file", "Who deleted the file", "Only the last commit message"],
    },
    "git stash ne işe yarar?": {
      q: "What is git stash for?",
      a: ["It sets uncommitted changes aside and cleans the working tree", "It deletes the last commit", "It creates a new branch", "It pushes to the remote"],
    },
    "HEAD~2 neyi ifade eder?": {
      q: "What does HEAD~2 refer to?",
      a: ["The commit two before HEAD", "Two commits after it", "The second branch", "The release two tags back"],
    },
    "git diff v1.0 HEAD -- dosya ne yapar?": {
      q: "What does git diff v1.0 HEAD -- file do?",
      a: ["Shows the difference of only that file between the two commits", "Restores the file to its v1.0 state", "Deletes the v1.0 tag", "Stages the file"],
    },
    "git add ile git commit arasındaki fark?": {
      q: "What is the difference between git add and git commit?",
      a: ["add puts the change in the index, commit records the index permanently", "Both do the same thing", "add sends it to the remote", "commit deletes the file"],
    },
    "Working tree'de değişiklik varken git checkout neden reddedilir?": {
      q: "Why is git checkout refused when there are changes in the working tree?",
      a: ["Checkout could overwrite the change, you need to commit or stash first", "Git always refuses", "Only root can check out", "Because there is no network"],
    },
    "git revert ile git reset --hard farkı?": {
      q: "What is the difference between git revert and git reset --hard?",
      a: ["revert keeps history and produces an inverse commit, reset rewinds history", "Both delete history", "revert is only for the remote", "There is no difference"],
    },
  },
  badges: {
    git: { title: "Bisect Master", desc: "Finish the Git chapter" },
  },
});
