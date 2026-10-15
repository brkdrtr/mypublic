'use strict';
/* Ingilizce katman, temel bolumler nav, files, read, pipe, perm, proc, net.
   Gorevler, varyantlar, missions.js icindeki quiz sorulari ve rozetler. Bicim I18N.md. */
addEn({
  chapters: {
    nav: { title: "Navigation", sub: "Find your way around the filesystem" },
    files: { title: "File Operations", sub: "Create, copy, move, delete" },
    read: { title: "Reading Time", sub: "cat, head, tail, wc, nano" },
    pipe: { title: "Pipe Magic", sub: "grep, sort, uniq, cut, tr" },
    perm: { title: "Permissions and Root", sub: "chmod, sudo, ownership" },
    proc: { title: "Process Hunter", sub: "ps, top, kill, systemctl" },
    net: { title: "Network Detective", sub: "ip, ss, ping, dig, hosts" },
  },

  missions: {
    /* ---------- nav ---------- */
    nav1: {
      title: "Where am I",
      story: "You just woke up on a server. The first question is always the same, which directory am I in?",
      task: "Print your current directory.",
      hint: "`pwd` stands for print working directory and prints the absolute path of the directory the shell is in right now. The prompt sometimes shows only an abbreviation, so when you write scripts or land on a new server, `pwd` tells you the real path. No flags needed.",
      v: [
        {
          title: "On the backup server",
          story: "The nightly backup job blew up and the on-call colleague dropped you on the branch backup server over ssh. Do not type a single rm until you know where you are.",
          task: "Print the full path of your current directory.",
          hint: "`pwd` prints the absolute path of where the shell is right now. Directories with the same name can exist in different places, so instead of guessing from the prompt you confirm with `pwd`. If the output starts with / it is an absolute path.",
        },
        {
          title: "Where did the script leave you",
          story: "You ran the SD-WAN TAC log collection script with source. When a sourced script does a cd internally, your own shell stays in that directory too.",
          task: "Print which directory you are in right now.",
          hint: "`pwd` stands for print working directory and needs no flags. A sourced script runs inside your own shell, so its cd moves you as well, which does not happen with a script run normally. Confirm your location with `pwd` first so you do not copy logs to the wrong place.",
        },
      ],
    },
    nav2: {
      title: "Look around",
      story: "Let us see what is in this directory.",
      task: "List the contents of the directory.",
      hint: "`ls` stands for list and shows the files and directories in your current directory. Without an argument it lists whatever `pwd` points to, give it a path and it looks there instead. Hidden files whose names start with a dot do not show up with plain `ls`, you will see that in the next mission.",
      v: [
        {
          title: "Where are the archives",
          story: "You are on the backup server and you were told the ION config archives live in this directory. Let us see what is there.",
          task: "List your current directory and submit the date of the newest ion-ist-br07 archive as YYYY-MM-DD.",
          hint: "`ls` with no argument lists your current directory. The file names contain dates, so alphabetical order is also chronological order and the newest one is at the end of the list. Send the answer with submit.",
        },
        {
          title: "Log directory",
          story: "TAC wants the flow export file from you. You are in the log collection directory but you do not know the exact file name.",
          task: "List your current directory and submit the full name of the file with the .csv extension.",
          hint: "`ls` with no argument lists where you are. The extension is just part of the name, Linux does not behave differently based on it. You will see a single .csv file in the list, submit its name exactly as shown.",
        },
      ],
    },
    nav3: {
      title: "Hidden file hunt",
      story: "On Linux, files whose names start with a dot are hidden files. Plain ls does not show them. Someone left you a note in your home directory.",
      task: "List everything including hidden files, then read the hidden note.",
      hint: "`ls -a` stands for all and also shows hidden files whose names start with a dot. On Linux hiding comes only from the name, so to read the file you just need `cat` and the full name including the leading dot. Forget the dot and you get No such file or directory.",
      v: [
        {
          title: "Forgotten token",
          story: "The contractor left a token file under /opt/app during a deploy, but plain ls shows only certs. The file name must start with a dot.",
          task: "List /opt/app including hidden files, then read the token file.",
          hint: "`ls -a` stands for all and also lists hidden files whose names start with a dot, plain `ls` skips them. You will see a hidden file related to the deploy. When reading it with `cat`, write the full path with the leading dot, without the dot the file is not found.",
        },
        {
          title: "Old VPN profile",
          story: "A backup of the branch's old FortiClient profile is stashed under Documents. The security team wants to know which gateway it points to.",
          task: "List ~/Documents including hidden files and read the hidden VPN backup.",
          hint: "`ls -a` also shows hidden files, and on Linux a hidden file is simply one whose name starts with a dot. Find the name with `ls -a ~/Documents`, then read it with `cat`. The Tab key completes the dot too and saves you from typos.",
        },
      ],
    },
    nav4: {
      title: "Dive into projects",
      story: "There is a directory called projects in your home directory.",
      task: "Change into the projects directory.",
      hint: "`cd` stands for change directory. A name like projects that does not start with / is a relative path and is resolved from where you are. Make sure you are in home first, from any other directory the same name will not be found.",
      v: [
        {
          title: "Ticket directory",
          story: "You opened a new ssh session and you are in your home directory. Your TAC case files live in the tickets directory under home.",
          task: "Change into the tickets directory.",
          hint: "`cd` stands for change directory. A name that does not start with / is a relative path resolved from where you are, so from home tickets means ~/tickets. From any other directory the same command gives No such file or directory.",
        },
        {
          title: "Go down one level",
          story: "You are in /var/log right now. The nginx access and error logs are one directory below.",
          task: "Change into the nginx directory using a relative path, do not type a path starting with /.",
          hint: "If you give `cd` only a directory name, it looks under where you are, this is called a relative path. Inside /var/log, nginx means /var/log/nginx. Put a / in front and it starts from root, and since there is no /nginx you get an error.",
        },
      ],
    },
    nav5: {
      title: "Go deeper",
      story: "There is a webapp inside projects. Go in and list its files.",
      task: "Enter the webapp directory and see what is inside.",
      hint: "`cd` can go down several levels at once, you separate the intermediate directories with /. ~ is short for your home directory, so a path starting with ~ goes to the same place wherever you are. Once there, look inside with `ls`.",
      v: [
        {
          title: "Automation repo",
          story: "The Ansible playbooks written for branch onboarding are under ~/projects/sdwan-automation/playbooks. You will go in and see what is there.",
          task: "Enter the playbooks directory with a single command and list its contents.",
          hint: "`cd` goes down several levels at once, you separate the intermediate directories with /. ~ is short for your home directory, so you end up in the same place wherever you are. Once there, look inside with `ls`.",
        },
        {
          title: "Branch config directory",
          story: "Exported configs of the ION 1200 device are kept under /opt/sdwan/configs/ist-br07. You want to see what is there before the change.",
          task: "Enter the ist-br07 config directory with a single command and list its contents.",
          hint: "A path starting with / is absolute and takes you to the same place wherever you are. With `cd` you put / between directories and reach the bottom in one step. Then look at the files with `ls`.",
        },
      ],
    },
    nav6: {
      title: "Back home",
      story: "Wherever you are, one command takes you back to your home directory. The tilde, ~, means home directory.",
      task: "Go back to your home directory.",
      hint: "`cd` with no argument or `cd ~` takes you to your home directory, because ~ is shorthand for the $HOME variable. However lost you get, this is the fastest way back. `cd -` goes to the previous directory, not home, do not mix them up.",
      v: [
        {
          title: "After the sshd config",
          story: "You were looking at sshd_config inside /etc/ssh. Now you will go back to your home directory where your own scripts live.",
          task: "Go back to your home directory.",
          hint: "`cd` with no argument or `cd ~` takes you to your home directory, ~ is really shorthand for the $HOME variable. No need to type the long path. `cd -` goes to the previous directory, not home, do not mix them up.",
        },
        {
          title: "Return and verify",
          story: "You got lost in the nginx logs. Go back to your home directory and prove you are really there.",
          task: "Go back to your home directory, then verify with pwd.",
          hint: "`cd ~` goes to your home directory because the shell replaces ~ with the value of $HOME. Then `pwd` prints the absolute path, you should see /home/burak. This two step check is a good habit in scripts so you never run rm in the wrong directory.",
        },
      ],
    },
    nav7: {
      title: "Absolute path",
      story: "Logs live under /var/log. A path that starts from the root directory, meaning with /, is called an absolute path.",
      task: "Go to the /var/log directory.",
      hint: "A path starting with / is an absolute path, it starts at the root directory and always goes to the same place no matter where you are. Forget the leading / and try to go relative, and it searches under your current directory and you get No such file or directory.",
      v: [
        {
          title: "sshd config directory",
          story: "For ssh connection problems the first place to look is the sshd config directory. Config files live under /etc.",
          task: "Go to the /etc/ssh directory using an absolute path.",
          hint: "A path starting with / is an absolute path, it starts at the root directory and does not depend on where you are. If you write etc/ssh it becomes relative and searches under your current directory. Do not forget the leading / on the path you give `cd`.",
        },
        {
          title: "ION event log directory",
          story: "Event logs from the SD-WAN ION device are collected on the jump box under /var/log/sdwan.",
          task: "Go to the /var/log/sdwan directory.",
          hint: "An absolute path starts with / and always points to the same place, so with `cd` you get there from anywhere. The leading / is the root directory. Complete the path with Tab and you will not make typos.",
        },
      ],
    },
    nav8: {
      title: "Long listing",
      story: "ls -l shows the permissions, owner, size and date of every file. Bread and butter for a sysadmin.",
      task: "List /var/log in long format with human readable sizes.",
      hint: "`ls -l` gives a long listing, each line shows permissions, owner, group, size and date. `-h` stands for human readable and shows sizes in K and M instead of bytes. You can combine them behind a single dash as `-lh`, without a path it lists the current directory.",
      v: [
        {
          title: "How big are the captures",
          story: "TAC wants you to attach the packet captures to the case, but there is an upload limit. Check the file sizes first.",
          task: "List /var/log/captures in long format with human readable sizes.",
          hint: "`ls -l` gives a long listing, each line shows permissions, owner, size and date. `-h` stands for human readable and shows sizes in K and M instead of bytes. Combine both flags behind a single dash and put the path after them.",
        },
        {
          title: "Key permission check",
          story: "The audit checklist requires private key files to be readable only by their owner. You will check erp.key under /opt/app/certs.",
          task: "List /opt/app/certs in long format with human readable sizes and submit the permission string of erp.key.",
          hint: "The first column of an `ls -l` line is the permission string, the first character is the file type, then come owner, group and others in groups of three. `-h` makes sizes readable. Submit the ten character first column of the erp.key line exactly as shown.",
        },
      ],
    },
    nav9: {
      title: "Tree",
      story: "Want to see the whole structure of a directory at a glance?",
      task: "Show the projects tree in your home directory.",
      hint: "`tree` draws a directory and its subdirectories as a tree. Without a path it starts where you are, and at the bottom it counts how many directories and files there are. Add `-a` if you also want to see hidden files.",
      v: [
        {
          title: "App directory layout",
          story: "The application team is asking about the certificate layout under /opt/app. Show the whole structure at a glance.",
          task: "Show the /opt/app tree.",
          hint: "`tree` starts from the directory you give and draws the subdirectories as an indented tree, counting directories and files at the bottom. It does not show hidden files, those need `-a`. Give /opt/app as the path.",
        },
        {
          title: "Source code tree",
          story: "You are going to build GNU hello from source. Where are configure and Makefile.in, which subdirectory holds the source file, see the layout first.",
          task: "Show the ~/src/hello-2.12 tree.",
          hint: "`tree` draws the directory layout in one command, faster than entering directories one by one with ls. Files in subdirectories appear indented, you will see that hello.c is under src. ~ is short for your home directory.",
        },
      ],
    },

    /* ---------- files ---------- */
    f1: {
      title: "Workshop",
      story: "Make yourself a space to work in.",
      task: "Create a directory named lab in your home directory.",
      hint: "`mkdir` stands for make directory and creates a new directory with the name you give. If you write `~/lab` it is created under home wherever you are. If a directory with that name already exists you get File exists.",
      v: [
        {
          title: "Case workspace",
          story: "TAC-48213 has been opened, the IST-BR-07 branch has no access to ERP. Create a working directory to keep your notes and captures in one place.",
          task: "Create a directory named tac in your home directory.",
          hint: "`mkdir` stands for make directory and creates a new directory with the name you give. Prefix it with ~/ and it is created under home wherever you are. If a directory with that name exists you get File exists, which is not a problem.",
        },
        {
          title: "Audit folder",
          story: "You are going to run a security audit on the branch jump box. You need a separate directory so findings do not get mixed up with system files.",
          task: "Create a directory named audit in your home directory.",
          hint: "`mkdir` creates a new directory, and if you give ~/audit as the path it is created under home regardless of where you are. If you write only the directory name it is created inside your current directory, which is why ~/ matters.",
        },
      ],
    },
    f2: {
      title: "Blank page",
      story: "The fastest way to create an empty file is touch.",
      task: "Create the file notlar.txt inside lab.",
      hint: "`touch` creates an empty file if it does not exist, and if it does, only updates its timestamp. It never touches the content, so it is safe on existing files. The directory in the path must already exist, touch does not create intermediate directories.",
      v: [
        {
          title: "Case note",
          story: "You keep a note file for every TAC case, named after the case number.",
          task: "Create the file case-48213.txt inside tac.",
          hint: "`touch` creates an empty file if it does not exist, and if it does, only updates its timestamp without touching the content. Start the path with ~/tac and it does not matter where you are. touch does not create intermediate directories, the tac directory must already exist.",
        },
        {
          title: "Findings file",
          story: "You will collect the audit findings in a single text file.",
          task: "Create the file findings.txt inside audit.",
          hint: "`touch` is the fastest way to create an empty file, and if the file exists it does not wipe it. Give the full path so the file lands in the right directory. If the directory does not exist you get No such file or directory, touch does not create directories.",
        },
      ],
    },
    f3: {
      title: "First line",
      story: "You can redirect echo output to a file with >. Careful, > empties the file and writes it from scratch.",
      task: "Write `merhaba linux` into notlar.txt.",
      hint: "`echo` prints text to the screen, and `>` sends that output to a file instead of the screen. `>` empties the file first, whatever was in it is gone. Put the text in quotes so the spaces stay inside a single argument.",
      v: [
        {
          title: "Symptom",
          story: "The first line of a case note is always the symptom. That is the first thing the TAC engineer should see when opening the file.",
          task: "Write `symptom erp 8443 timeout` into case-48213.txt.",
          hint: "`echo` prints text to output, and `>` redirects that output to a file instead of the screen. `>` empties the file first, whatever was in it is gone. Put the text in quotes so text with spaces stays in one piece.",
        },
        {
          title: "First finding",
          story: "The first audit finding is about sshd settings. You will write it to the file and save it.",
          task: "Write `sshd port 2222 root login kapali` into findings.txt.",
          hint: "You redirect the text produced by `echo` into a file with `>`, nothing appears on screen. A single `>` writes the file from scratch, which is exactly right for the first line. Check the result with `cat` afterwards.",
        },
      ],
    },
    f4: {
      title: "Append",
      story: ">> appends to the end of the file instead. Every script that writes logs uses it.",
      task: "Append `pipe guzeldir` to notlar.txt as the second line. The first line must not be deleted.",
      hint: "`>>` means append, it adds to the end of the file and leaves existing lines alone. Use a single `>` and you wipe the first line, the most common mistake in scripts that write logs. echo adds a newline at the end of each line by itself.",
      v: [
        {
          title: "Next step",
          story: "You will add the next check step under the symptom. The symptom line must not be deleted.",
          task: "Append the line `next check iptables HUB-BLOCK` to the end of case-48213.txt.",
          hint: "`>>` means append, it adds to the end of the file and leaves existing lines alone. A single `>` here would wipe the symptom line. echo ends every line with a newline, so the new text lands on its own line.",
        },
        {
          title: "Second finding",
          story: "You also saw that the nginx service is failed. Add it to the findings list and keep the first finding.",
          task: "Append the line `nginx failed listen 80q` to the end of findings.txt.",
          hint: "Two greater than signs, `>>`, write to the end of the file, while a single `>` wipes everything and writes from scratch. Log and findings files always use `>>`. If you check the result with `cat` you should see two lines.",
        },
      ],
    },
    f5: {
      title: "Take a backup",
      story: "Taking a backup before you touch a file is a good habit.",
      task: "Copy notlar.txt into the same directory under the name yedek.txt.",
      hint: "`cp` takes a source and a destination and copies the source under the destination name. If the destination is an existing directory, the file goes inside it with the same name. If the destination file already exists cp overwrites it without asking, `-i` asks first.",
      v: [
        {
          title: "Backup of the note",
          story: "You will back up the case note before a big edit.",
          task: "Copy case-48213.txt into the same directory under the name case-48213.bak.",
          hint: "`cp` takes the source first and the destination second. If the destination is an existing directory the file goes inside it with the same name, here you are giving a new file name. If the destination file already exists cp overwrites it without asking.",
        },
        {
          title: "Config backup",
          story: "Before you touch sshd_config you will copy the original into the audit directory. Backing up before a change is the golden rule.",
          task: "Copy /etc/ssh/sshd_config into ~/audit under the name sshd_config.orig.",
          hint: "`cp` takes a source and a destination, and as long as the source is readable you can copy it even if root owns it. The copy is owned by your user. Since you give a file name in the destination, the copy is named sshd_config.orig.",
        },
      ],
    },
    f6: {
      title: "Rename",
      story: "Linux has no separate rename command, mv both moves and renames.",
      task: "Rename yedek.txt to arsiv.txt.",
      hint: "`mv` both moves and renames, if you give a different name in the same directory only the name changes. If the destination file exists it is overwritten. No copy is left behind, the old name is gone.",
      v: [
        {
          title: "Add a version",
          story: "Keeping the backup with a version number is easier to read. You will rename the .bak file.",
          task: "Rename case-48213.bak to case-48213-v1.txt.",
          hint: "When you give `mv` a new name in the same directory it only renames, no copy is left. The old name is gone. If a file with the target name exists it is overwritten without asking, be careful.",
        },
        {
          title: "Dated backup",
          story: "The audit report requires backups to carry a date. Rename the .orig file with the audit date.",
          task: "Rename sshd_config.orig to sshd_config.2026-10-10.",
          hint: "Linux has no separate rename command, `mv` takes the old and the new name. Since it stays in the same directory the file is not moved, only its name changes. After the operation the old name no longer exists.",
        },
      ],
    },
    f7: {
      title: "Delete the past",
      story: "rm does not send anything to a trash bin. Once it is gone, it is gone.",
      task: "Delete arsiv.txt.",
      hint: "`rm` deletes the file, there is no trash bin and no undo. Before you type the path, make sure it is the right file with `ls`. Plain rm is not enough to delete a directory, you will see that later.",
      v: [
        {
          title: "Delete the old version",
          story: "You no longer need the v1 copy. Delete only that one, the main case note must stay.",
          task: "Delete case-48213-v1.txt and keep case-48213.txt.",
          hint: "`rm` deletes the file irreversibly, there is no trash bin. The two file names are very similar, check with `ls ~/tac` before typing the full name. Completing with Tab reduces the risk of deleting the wrong file.",
        },
        {
          title: "Swap leftover",
          story: "When the editor crashed it left a hidden swap file next to findings.txt, named .findings.txt.swp. Clean it up and do not touch the real file.",
          task: "Delete the file ~/audit/.findings.txt.swp.",
          hint: "`rm` deletes the file you give and there is no undo. The file starts with a dot so it does not appear in plain ls, see its name with `ls -a ~/audit` first. Mix it up with findings.txt and all your findings are gone.",
        },
      ],
    },
    f8: {
      title: "Deep structure",
      story: "Plain mkdir fails if the intermediate directories do not exist. A single flag fixes that.",
      task: "Create the structure ~/lab/proje/src/utils with a single command.",
      hint: "`mkdir -p` stands for parents and also creates every missing intermediate directory in the path, in order. Without -p, if an intermediate directory is missing you get No such file or directory. If the directory already exists -p does not complain, which is why scripts love it.",
      v: [
        {
          title: "Capture directories",
          story: "You want to store captures by month and site. None of the intermediate directories exist yet.",
          task: "Create the structure ~/tac/captures/2026-10/ist-br07 with a single command.",
          hint: "`mkdir -p` stands for parents and creates every missing intermediate directory in the path, in order. Without -p, if captures does not exist you get No such file or directory. If the directory already exists -p does not complain.",
        },
        {
          title: "Config tree",
          story: "For the audit you will collect system configs while keeping their original paths, for example etc/nginx.",
          task: "Create the structure ~/audit/configs/etc/nginx with a single command.",
          hint: "`mkdir` normally creates only the last directory and fails if the intermediate ones are missing. The `-p` parents flag creates configs and etc automatically too. Scripts prefer -p because it also passes silently if the directory exists.",
        },
      ],
    },
    f9: {
      title: "Bulk copy",
      story: "With the * wildcard you can target several files at once.",
      task: "Copy all .txt files in the data directory into ~/lab/proje.",
      hint: "The shell expands the `*` wildcard, it replaces it with every matching file name before the command runs. `*.txt` means every file ending in .txt. With multiple sources the last argument must be a directory, otherwise cp fails.",
      v: [
        {
          title: "Collect the captures",
          story: "There are several pcap files and a README under /var/log/captures. TAC wants only the pcap files.",
          task: "Copy all .pcap files in /var/log/captures into ~/tac/captures.",
          hint: "The shell expands the `*` wildcard, every matching file name is written into the command before cp runs. `*.pcap` means files ending in .pcap, which is why README.txt is not included. With multiple sources the last argument must be a directory.",
        },
        {
          title: "Collect the certificates",
          story: "The audit needs copies of the certificates under /opt/app/certs, but private keys are never copied.",
          task: "Copy all .crt files in /opt/app/certs into ~/audit/configs, the .key file must not come along.",
          hint: "The `*.crt` wildcard matches only files ending in .crt, so erp.key stays out. The shell expands the matches and hands them to cp, the last argument is the destination directory. Had you typed `*` you would have tried to copy the key too.",
        },
      ],
    },
    f10: {
      title: "Directory cleanup",
      story: "Plain rm is not enough to delete a directory that has content.",
      task: "Delete the ~/lab/proje directory along with its contents.",
      hint: "`rm -r` stands for recursive and deletes the directory together with everything inside. Plain rm on a directory says Is a directory. Add `-f` and it never asks, read the path twice before typing `rm -rf`.",
      v: [
        {
          title: "Case closed",
          story: "The TAC case is solved and the captures have been uploaded. Remove the captures directory along with its contents, the case note stays.",
          task: "Delete the ~/tac/captures directory along with its contents.",
          hint: "`rm -r` stands for recursive and deletes the directory with its subdirectories and files. Plain rm on a directory says Is a directory. Read the path twice, if you type ~/tac the case note goes too.",
        },
        {
          title: "Clean up the copies",
          story: "The audit report has been sent. The collected config copies are no longer needed, but findings.txt stays in the archive.",
          task: "Delete the ~/audit/configs directory along with its contents.",
          hint: "Deleting a directory with content needs `-r`, recursive, on `rm`, which removes everything inside from the bottom up. Adding `-f` means it never asks and shows no errors either, do not use it unless you really need it. Target only configs.",
        },
      ],
    },

    /* ---------- read ---------- */
    r1: {
      title: "Hostname",
      story: "The name of this machine is written in a file.",
      task: "Read the /etc/hostname file.",
      hint: "`cat` prints the file content to the terminal as is. It is ideal for small config files, with a log of thousands of lines the screen just scrolls away, use `head`, `tail` or `less` there.",
      v: [
        {
          title: "Which resolver",
          story: "Names do not resolve at the branch. First find out which DNS server the system asks.",
          task: "Read /etc/resolv.conf and submit the nameserver address.",
          hint: "`cat` prints the file as is, ideal for short config files like resolv.conf. The line starting with nameserver holds the IP address of the resolver. Submit only the address.",
        },
        {
          title: "Time zone",
          story: "Log times look one hour off compared with the branch clock in Istanbul. Which timezone is the jump box running in?",
          task: "Read /etc/timezone and submit the value inside.",
          hint: "`cat` prints the file content, and /etc/timezone is a one line file. The value is in Region/City format, submit it exactly as is. When comparing logs, timezone differences are the most common source of confusion.",
        },
      ],
    },
    r2: {
      title: "First five",
      story: "Do not read a huge log from start to finish, look at the top first.",
      task: "Show the first 5 lines of /var/log/syslog.",
      hint: "`head` shows the beginning of a file, 10 lines by default. `-n 5` tells it how many lines you want, the short form `-5` works too. Looking at the top of a big log first to understand its format is a good habit.",
      v: [
        {
          title: "ION log format",
          story: "The ION event log is in key=value format. Look at the top to see the format before you start analysing.",
          task: "Show the first 4 lines of /var/log/sdwan/ion-events.log.",
          hint: "`head` prints the beginning of a file, 10 lines by default. `-n 4` says how many lines you want, the short form is `-4`. Looking at a few lines first to learn the fields makes the later grep and cut steps easier.",
        },
        {
          title: "strongSwan startup",
          story: "The IPsec tunnel will not come up. The beginning of the strongSwan log shows which configs the daemon loaded.",
          task: "Show the first 7 lines of /var/log/strongswan.log.",
          hint: "`head -n 7` prints the first seven lines of the file and stops. Daemon startup messages are at the top of the log, so this is where you see the loaded secrets and configuration lines. Without -n you get 10 lines.",
        },
      ],
    },
    r3: {
      title: "Breaking news",
      story: "New events are written to the end of the log.",
      task: "Show the last 3 lines of /var/log/syslog.",
      hint: "`tail` shows the last lines of a file, 10 by default. `-n 3` means the last three lines. New events are written to the end of the log, so this is the first place to look during an outage, add `-f` to follow it live.",
      v: [
        {
          title: "What is the agent saying",
          story: "The erp-agent service cannot sync. The end of the log tells you what happened last.",
          task: "Show the last 2 lines of /var/log/erp-agent.log.",
          hint: "`tail` reads from the end of the file, `-n 2` means the last two lines. New entries are always appended at the end, so the current error shows up here. If the problem is live, follow it with `-f`.",
        },
        {
          title: "Latest ION events",
          story: "A latency alarm fired on the DSL line, did it clear? Look at the latest events.",
          task: "Show the last 4 lines of /var/log/sdwan/ion-events.log.",
          hint: "`tail -n 4` prints the last four lines. ION events are written chronologically, so the alarm and the CLEAR event that closes it appear at the end. Without -n you get the last 10 lines.",
        },
      ],
    },
    r4: {
      title: "How many users",
      story: "Every line in /etc/passwd is a user account.",
      task: "Find how many lines /etc/passwd has and send it with submit.",
      hint: "`wc` stands for word count and counts lines, words and bytes. `-l` gives only the line count. Every line in /etc/passwd is one account, so the line count is the account count. The output also shows the file name next to the number, submit only the number.",
      v: [
        {
          title: "How many branches",
          story: "Every line in the Prisma SD-WAN inventory export is one branch. You need the total for the license renewal.",
          task: "Find how many lines /opt/sdwan/inventory/branches.txt has and submit it.",
          hint: "`wc` stands for word count, `-l` gives only the line count. Every line is one branch, so the line count is the branch count. The output also shows the file name next to the number, submit only the number.",
        },
        {
          title: "How many requests",
          story: "Every line in the nginx access.log is one HTTP request. They want the total request count for this morning for the capacity report.",
          task: "Find how many lines /var/log/nginx/access.log has and submit it.",
          hint: "`wc -l` counts newline characters, which gives you the line count. In an access log every request is one line, so this is the request count. Without a flag it prints lines, words and bytes all at once.",
        },
      ],
    },
    r5: {
      title: "Line numbers",
      story: "Error messages usually give a line number. Reading the file with numbers makes your job easier.",
      task: "Read the nginx config file /etc/nginx/nginx.conf with line numbers.",
      hint: "`cat -n` puts a number at the start of every line. When nginx -t or journalctl reports an error it usually gives a file name and line number, so with numbered output you go straight to that line. Blank lines are counted too.",
      v: [
        {
          title: "IPsec config line",
          story: "The strongSwan log says it does not like the proposal of the cloud-lab tunnel. You will find that line in the config and send its number to TAC.",
          task: "Read /etc/ipsec.conf with line numbers and submit the line number of the ike= line in the cloud-lab block.",
          hint: "`cat -n` puts a number at the start of every line, blank lines are counted too. There are two ike= lines in the file, pick the one under the conn cloud-lab header. Submit the number.",
        },
        {
          title: "Netplan line",
          story: "The MTU of the DSL backup interface is set to 1492. You need to put the line number in the change request.",
          task: "Read /etc/netplan/01-config.yaml with line numbers and submit the line number of the mtu line.",
          hint: "`cat -n` prints the lines numbered, and since indentation matters in YAML it is a safe way to read the file without breaking it. Submit the number at the start of the line containing mtu.",
        },
      ],
    },
    r6: {
      title: "Editor",
      story: "In real life you edit files with an editor. nano is the friendliest one.",
      task: "Open ~/lab/notlar.txt with nano, add the line `nano calisiyor` at the end and save.",
      hint: "`nano` is a simple editor that runs in the terminal, you open the file and edit it as you type. In real nano Ctrl+O saves and Ctrl+X exits, in the lab there is a Save button. If the file does not exist nano creates it when you save.",
      v: [
        {
          title: "Case update",
          story: "You promised the customer the time of the next update, so you should write it in the case note too.",
          task: "Open ~/tac/case-48213.txt with nano, add the line `next update 14.00 burak` at the end and save.",
          hint: "`nano` is a simple editor that runs inside the terminal, when you open a file the cursor is at the top, you move to the bottom and type the new line. In real nano Ctrl+O saves and Ctrl+X exits, in the lab there is a Save button. If you exit without saving the change is lost.",
        },
        {
          title: "RCA note",
          story: "You were asked to add the root cause of the incident to the Q3 report.",
          task: "Open ~/Documents/rapor.txt with nano, add the line `RCA TAC-48213 iptables HUB-BLOCK` at the end and save.",
          hint: "`nano` opens the file, you move to the end with the arrow keys and type the new line. Saving in real nano is Ctrl+O then Enter, in the lab it is the Save button. Be careful not to delete existing lines, only add.",
        },
      ],
    },

    /* ---------- pipe ---------- */
    p1: {
      title: "Error hunt",
      story: "grep searches for a pattern in text. It is the number one tool for log analysis.",
      task: "Find the lines containing Failed in /var/log/syslog.",
      hint: "`grep` takes a pattern and a file and prints the lines containing the pattern as is. By default it is case sensitive, Failed and failed are different. If the pattern contains a space put it in quotes, otherwise the shell treats it as two separate arguments.",
      v: [
        {
          title: "Timeout hunt",
          story: "erp-agent says it cannot resolve DNS. Pull out the lines with timeouts from the log.",
          task: "Find the lines containing timed out in /var/log/erp-agent.log.",
          hint: "`grep` takes a pattern and a file and prints the lines containing the pattern as is. The pattern has a space, so without quotes the shell treats it as two separate arguments and grep looks for a file named out. grep is case sensitive by default.",
        },
        {
          title: "Collision",
          story: "The HMI on the OT VLAN keeps dropping intermittently. Check the kernel log for a duplex problem on eth1.",
          task: "Find the lines containing collision in /var/log/kern.log.",
          hint: "`grep` scans the file line by line, prints the lines containing the pattern and drops the rest. The pattern can be part of a word, typing collision brings up the late collision lines. Late collisions on a half duplex link are the classic sign of a duplex mismatch.",
        },
      ],
    },
    p2: {
      title: "Case insensitive",
      story: "Logs contain error, Error and ERROR. grep is case sensitive by default.",
      task: "Find the number of lines in syslog containing error, case insensitive, and submit it.",
      hint: "`grep -i` means ignore case and catches error, Error and ERROR alike. `-c` means count, it prints how many lines matched instead of the lines themselves. You can combine them as `-ic`. -c counts lines, a line with two matches still counts once.",
      v: [
        {
          title: "Flow timeout count",
          story: "Three different modules write the flow log and each spells timeout differently, TIMEOUT, Timeout and timeout.",
          task: "Find the number of lines in /var/log/sdwan/flow-ist07.log containing timeout, case insensitive, and submit it.",
          hint: "`grep -i` means ignore case and disregards upper and lower case. `-c` means count and prints the number of matching lines instead of the lines. You can combine them as `-ic`, without -i you only count the lowercase lines.",
        },
        {
          title: "Denied count",
          story: "In the portal-proxy error log, rejected requests show up as denied, Denied and DENIED. The security team wants to know how many lines there are.",
          task: "Find the number of lines in /var/log/nginx/portal-proxy.error.log containing denied, case insensitive, and submit it.",
          hint: "With `-i` grep ignores case, and with `-c` it counts the matching lines instead of listing them. -c counts lines, a line with the word twice still counts once. Other words like forbidden are not counted.",
        },
      ],
    },
    p3: {
      title: "First pipe",
      story: "The pipe, |, turns the output of one command into the input of the next. It is the heart of the Linux philosophy.",
      task: "Count the TODO lines in notes.txt using a pipe.",
      hint: "The pipe `|` makes the output of the command on the left the input of the one on the right, no temporary file needed. `grep` filters the matching lines, `wc -l` counts the lines it receives. You do not give wc a file name because it reads its input from the pipe.",
      v: [
        {
          title: "How many path switches",
          story: "The customer wants to know how many times ERP changed path during the day. Every switch in the ION log is a NETWORK_PATH_SWITCH line.",
          task: "Count the PATH_SWITCH lines in ion-events.log using a pipe.",
          hint: "The pipe `|` makes the output of the command on the left the input of the one on the right. `grep` filters the lines containing PATH_SWITCH, `wc -l` counts the lines it receives. You do not give wc a file name, it reads its input from the pipe.",
        },
        {
          title: "How many items",
          story: "In the TAC-48213 ticket the symptoms and notes are written as items starting with a dash. How many items are there in total?",
          task: "Count the lines starting with a dash in ~/tickets/TAC-48213.txt using a pipe.",
          hint: "`grep '^-'` selects lines with a dash at the start, ^ means start of line, without it dashes in the middle of lines match too. The quotes keep the shell away from the ^ and - characters. `|` hands those lines to `wc -l`, which prints the line count.",
        },
      ],
    },
    p4: {
      title: "Cut a field",
      story: "Fields in /etc/passwd are separated by colons. The first field is the username.",
      task: "List only the usernames from /etc/passwd.",
      hint: "`cut` splits a line into fields. `-d` sets the delimiter, and since /etc/passwd fields are separated by colons you need `-d:`. `-f1` selects the first field, the username. Without -d cut looks for Tab and prints the whole line.",
      v: [
        {
          title: "Group names",
          story: "/etc/group lines are also separated by colons, and the first field is the group name. List only the group names for the audit.",
          task: "List only the group names from /etc/group.",
          hint: "`cut` splits a line into fields. `-d:` says the delimiter is a colon, `-f1` selects the first field, the group name. Without -d cut looks for Tab, and when it finds none it prints the whole line.",
        },
        {
          title: "Home directories",
          story: "The disk is about to fill up and you want to see where each account's home directory is. In /etc/passwd the sixth field is the home directory.",
          task: "List only the home directories from /etc/passwd.",
          hint: "`cut -d:` splits fields on colons, `-f6` takes the sixth field. Fields are counted from the left starting at one, in the order name, password, uid, gid, gecos, home, shell. Give the wrong number and you see the shell or gecos field instead.",
        },
      ],
    },
    p5: {
      title: "Unique shells",
      story: "Which shells are in use on the system? The last field is the login shell.",
      task: "Produce the list of unique shells in the passwd file.",
      hint: "`cut -d: -f7` takes the seventh field, the login shell, from every line. `sort` brings identical values together, and `uniq` collapses only adjacent duplicates. Skip sort and uniq misses duplicates with other values in between, so the list comes out dirty.",
      v: [
        {
          title: "Circuit types",
          story: "~/data/vpnlinks.txt holds site, circuit and status on each line, with fields separated by colons. They want a unique list of the circuit types we use.",
          task: "Produce the list of unique circuits in vpnlinks.txt.",
          hint: "`cut -d: -f2` takes the second field, the circuit name, from every line. `sort` brings identical values together, and `uniq` collapses only adjacent duplicates. Skip sort and duplicates with other values in between stay separate.",
        },
        {
          title: "Status code list",
          story: "You want a unique list of the HTTP status codes returned in access.log. Fields are separated by spaces, and the ninth field is the status code.",
          task: "Produce the list of unique status codes in access.log.",
          hint: "`cut -d' '` sets the delimiter to a space, without quotes around the space the shell swallows it. `-f9` cuts the ninth field, the status code. Then `sort` puts identical codes next to each other and `uniq` collapses the duplicates.",
        },
      ],
    },
    p6: {
      title: "Count them",
      story: "uniq -c counts how many times each line repeats. But sort comes first, uniq only sees adjacent duplicates.",
      task: "Find the most frequent fruit in ~/data/fruits.txt and submit it exactly as written in the file.",
      hint: "`sort` brings identical lines together, and `uniq -c` writes in front of each group how many times it repeats. The final `sort -rn` sorts by those counts, `-n` is numeric so 10 is greater than 9, `-r` is reverse so the largest is on top. Forget the first sort and uniq counts non adjacent duplicates separately.",
      v: [
        {
          title: "Top talker",
          story: "The WAN link is filling up. The source IP of every flow from the NetFlow export was written line by line to ~/data/talkers.txt.",
          task: "Find the most frequent IP address in talkers.txt and submit it.",
          hint: "`sort` brings identical IPs together, and `uniq -c` writes in front of each group how many times it appears. Then `sort -rn` sorts by those counts, `-n` is a numeric comparison, `-r` is reverse so the largest is on top. Forget the first sort and uniq counts scattered duplicates separately.",
        },
        {
          title: "Most frequent event",
          story: "Which event code shows up most often in the ION event log? Fields are separated by spaces, and the fifth field looks like code=...",
          task: "Find the most frequent event code in ion-events.log and submit it.",
          hint: "`cut -d' ' -f5` cuts the fifth field, the code field, from every line. `sort` and `uniq -c` group and count identical codes, `sort -rn` orders them by count from largest to smallest. Submit the code on the top line, you can leave out the code= part.",
        },
      ],
    },
    p7: {
      title: "Leaderboard",
      story: "scores.txt has names and scores.",
      task: "Sort by score from highest to lowest and show the top 3.",
      hint: "`sort -k2` sorts by the second field, fields are separated by whitespace by default. `-n` does a numeric comparison, otherwise 100 comes before 99 alphabetically. `-r` flips it to highest first, and `head -3` keeps only the first three lines.",
      v: [
        {
          title: "Slowest tunnels",
          story: "~/data/latency.txt holds a tunnel name and its latency in ms on each line. You need the top three that may be breaching the SLA.",
          task: "Sort by latency from highest to lowest and show the top 3.",
          hint: "`sort -k2` sorts by the second field, fields are separated by whitespace by default. `-n` compares numerically, otherwise 148 comes before 21 alphabetically and the order breaks. `-r` flips it to highest first, `head -3` keeps the first three lines.",
        },
        {
          title: "Lowest uptime",
          story: "~/data/uptime.csv is comma separated, and the third field is the monthly uptime percentage. Show the three worst sites for the review meeting.",
          task: "Sort by uptime from lowest to highest and show the top 3.",
          hint: "`sort -t,` sets the field delimiter to a comma, `-k3` sorts by the third field. `-n` compares the decimal numbers numerically, and since you want lowest first there is no `-r` here. `head -3` keeps the first three lines, the three worst sites.",
        },
      ],
    },
    p8: {
      title: "Shout",
      story: "tr translates characters.",
      task: "Print linux with echo and convert all of it to uppercase with tr.",
      hint: "`tr` translates characters from stdin from the first set to the second set, it takes no file name, so you pipe into it with echo. `a-z` is the lowercase range and `A-Z` the uppercase range, characters at the same position are mapped. To delete characters you use `-d`.",
      v: [
        {
          title: "Site name format",
          story: "In the Prisma SD-WAN portal site names are stored in uppercase. The list you have is lowercase.",
          task: "Print ist-br-07 with echo and convert all of it to uppercase with tr.",
          hint: "`tr` reads from stdin and takes no file name, so you pipe into it with echo. The first set `a-z` is lowercase letters, the second set `A-Z` is uppercase, characters at the same position are mapped to each other. Dashes and digits are not in the sets, so they stay as they are.",
        },
        {
          title: "MAC format",
          story: "You are entering a reservation on the Windows DHCP server and it wants the MAC address with dashes instead of colons. The address is `52:54:00:12:34:56`.",
          task: "Print the MAC address with echo and convert the colons to dashes with tr.",
          hint: "`tr` replaces each character in the first set with its counterpart in the second set, here two single character sets are enough, a colon and a dash. It takes its input from a pipe, you do not give it a file. To delete instead you would use `-d`.",
        },
      ],
    },
    p9: {
      title: "Save the report",
      story: "Redirect the output of the pipe chain to a file so you can send it to a teammate.",
      task: "Write the case insensitive error lines from syslog to the file ~/lab/errors.txt.",
      hint: "`grep -i` searches without caring about case, and `>` writes the output that would go to the screen into a file. When you redirect you see nothing on screen, that is normal, check the result with `cat`. If the target directory does not exist the shell cannot open the file and fails.",
      v: [
        {
          title: "Save the IKE errors",
          story: "TAC wants you to attach the proposal errors of the cloud-lab tunnel to the case as a separate file.",
          task: "Write the lines containing NO_PROPOSAL in strongswan.log to the file ~/tac/ike-fail.txt.",
          hint: "`grep` selects the matching lines, and `>` writes the output that would go to the screen into a file. When you redirect you see nothing on screen, that is normal, check the result with `cat`. If the target directory does not exist the shell cannot open the file.",
        },
        {
          title: "Critical event report",
          story: "The manager only wants to see the critical ION events. You will prepare the report as a file.",
          task: "Write the CRITICAL lines in ion-events.log to the file ~/audit/critical.txt.",
          hint: "`grep CRITICAL` keeps only the lines containing sev=CRITICAL, and you must type it in uppercase because grep is case sensitive. `>` redirects the output to a file and overwrites it if it exists. To append you would have used `>>`.",
        },
      ],
    },
    p10: {
      title: "Play with CSV",
      story: "cities.csv is comma separated. The first line is the header.",
      task: "List only the names of the NL cities.",
      hint: "`grep \",NL,\"` keeps only the lines whose country field is NL, searching with the commas avoids random matches in other fields. `cut -d, -f1` uses the comma as delimiter and cuts the first field, the city name. The header line does not contain ,NL, so it drops out on its own.",
      v: [
        {
          title: "Turkey branches",
          story: "~/data/branches.csv is comma separated and the first line is the header. The Turkey operations team wants its own branch list.",
          task: "List only the site names of the TR branches.",
          hint: "`grep \",TR,\"` keeps the lines whose country field is TR, searching with the commas stops the letters TR from matching in another field. `cut -d,` sets the delimiter to a comma, `-f1` cuts the first field, the site name. The header line has no ,TR, so it drops out on its own.",
        },
        {
          title: "Sites with LTE backup",
          story: "~/data/circuits.csv is the circuit inventory, with the fields circuit_id, site, type and provider. You will find which sites have LTE backup.",
          task: "List the site names of the circuits whose type is LTE.",
          hint: "`grep \",LTE,\"` selects the lines whose type field is LTE, the commas on both sides make the field match exactly. `cut -d, -f2` splits on commas and takes the second field, the site name. With -f1 you would see the circuit numbers.",
        },
      ],
    },

    /* ---------- perm ---------- */
    pm1: {
      title: "Script that will not run",
      story: "There is a script at ~/scripts/hello.sh. Try to run it.",
      task: "Try to run the script with ./, then check its permissions with ls -l.",
      hint: "./ means run the file in the current directory, Linux does not find a file by name if it is not in PATH. If you get Permission denied, check with `ls -l`, if there is no x in the rw-r--r-- of the first column the file cannot be executed. Do not forget to change into the script's directory first.",
      v: [
        {
          title: "Link check script",
          story: "A colleague copied the WAN check script under ~/tools. Try to run it.",
          task: "Change into ~/tools, try to run link_check.sh with ./, then check its permissions with ls -l.",
          hint: "./ means run the file in the current directory, Linux does not find a file by its name alone if it is not in PATH. When Permission denied shows up, check with `ls -l`, if there is no x in the first column the file cannot be executed. Copying a file does not always carry over the execute permission.",
        },
        {
          title: "Rotate script",
          story: "There is a new script under ~/scripts that rotates the nginx logs, but cron fails every time.",
          task: "Change into ~/scripts, try to run rotate_logs.sh with ./, then check its permission with ls -l.",
          hint: "First `cd` into the script's directory so ./ points to the right place. A Permission denied error tells you the file was found but cannot be executed. In the `ls -l` line you will see there is no x in rw-r--r--.",
        },
      ],
    },
    pm2: {
      title: "Execute permission",
      story: "For a file to run, it needs x, the execute permission.",
      task: "Give hello.sh execute permission and run it.",
      hint: "`chmod +x` adds the execute bit, and if you do not specify a letter it applies to owner, group and others alike. After that you can call the script by its path. Without execute permission, running it with `bash script.sh` is another way, but the right fix is to grant the permission.",
      v: [
        {
          title: "Make it executable",
          story: "link_check.sh has no execute permission. Grant it and see the WAN status.",
          task: "Give link_check.sh execute permission and run it.",
          hint: "`chmod +x` adds the execute bit, and if you do not say who gets it, owner, group and others all do. Then you call the script by its path. `bash file` also works, but cron and other tools expect the execute bit.",
        },
        {
          title: "Get it ready for cron",
          story: "Cron calls rotate_logs.sh directly by its path, and without execute permission it fails every night.",
          task: "Give rotate_logs.sh execute permission and run it.",
          hint: "`chmod +x` adds the execute permission and leaves the other permissions alone. Cron calls the script by its path, not with bash, so the x bit is required. When you run it you should see the rotate message.",
        },
      ],
    },
    pm3: {
      title: "Octal permission",
      story: "r=4, w=2, x=1. The order is owner, group, others. 600 means only the owner can read and write.",
      task: "Make ~/notes.txt readable and writable only by you.",
      hint: "In octal permissions each digit is for one class, in the order owner, group, others. r=4, w=2, x=1 are added up, 6 means rw, 0 means nothing. Write 600 and only the owner can read and write, group and others are completely shut out.",
      v: [
        {
          title: "PSK file",
          story: "~/.vpn/ist-br07.psk holds a pre-shared key and everyone can read it. That is an audit finding.",
          task: "Make ~/.vpn/ist-br07.psk readable and writable only by you.",
          hint: "In octal permissions each digit is for one class, in the order owner, group, others. r=4, w=2, x=1 are added up, 6 means rw, 0 means nothing. Give 6 to the owner and 0 to the other two, that is the standard for secret keys.",
        },
        {
          title: "Team script",
          story: "You and the network group will run ion_backup.sh, nobody else should even see it.",
          task: "Set an octal permission on ~/tools/ion_backup.sh so the owner has full rights, the group can read and execute, and others have no permission at all.",
          hint: "Each digit is the sum of r=4, w=2, x=1. For the owner rwx is 4+2+1=7, for the group r-x is 4+1=5, for others 0. You give these three digits to `chmod` in order, using numbers instead of letters sets all permissions clearly in one go.",
        },
      ],
    },
    pm4: {
      title: "Restricted area",
      story: "/etc/shadow holds password hashes. A normal user cannot read it.",
      task: "Read /etc/shadow. Then think about why you cannot.",
      hint: "/etc/shadow holds password hashes and nobody but root can read it, as a normal user `cat` gives Permission denied. Look with `ls -l /etc/shadow` and you will see others have no permission at all. This is not a bug, it is security by design.",
      v: [
        {
          title: "IPsec secrets",
          story: "/etc/ipsec.secrets holds the tunnel PSKs. A normal user must not be able to read it.",
          task: "Read /etc/ipsec.secrets. Then think about why you cannot.",
          hint: "The file is owned by root with permission 600, so others have no permission at all and `cat` gives Permission denied. You can see this with `ls -l /etc/ipsec.secrets`. This is not a bug, it is the design that keeps PSKs from leaking.",
        },
        {
          title: "API key",
          story: "The automation team put the ION API token in /etc/ssl/private/ion-api.key. Can you access it as a normal user?",
          task: "Read /etc/ssl/private/ion-api.key. Then think about why you cannot.",
          hint: "`cat` tries to open the file as your user, and if the file is owned by root and others have no read permission you get Permission denied. Check the permissions with `ls -l`, the last three characters are for others. Key and token files should always be locked down like this.",
        },
      ],
    },
    pm5: {
      title: "Superpower",
      story: "sudo runs a command with root privileges. With great power comes great responsibility.",
      task: "Read /etc/shadow with sudo and submit the FLAG value inside.",
      hint: "`sudo` runs the command after it with root privileges, asks for a password and logs every use to auth.log. You read a file you have no read permission on with `sudo cat`. Use it only when needed, prefixing every command with sudo is a bad habit.",
      v: [
        {
          title: "cloud-lab PSK",
          story: "You are debugging the cloud-lab tunnel together with the other side and need to confirm the PSK is correct.",
          task: "Read /etc/ipsec.secrets with sudo and submit the PSK value of peer 203.0.113.20 without quotes.",
          hint: "`sudo` runs the command after it with root privileges, and root skips permission checks. Each line contains the local IP, the remote IP and the PSK, take the quoted value on the 203.0.113.20 line. sudo use is written to auth.log, it leaves a trail.",
        },
        {
          title: "Token rotation",
          story: "The token is about to be rotated and you need to record the old one in the change ticket.",
          task: "Read /etc/ssl/private/ion-api.key with sudo and submit the token value.",
          hint: "`sudo cat` reads the file as root, this is how you see content a normal user cannot. Submit the value after the equals sign on the token= line. Use sudo only when you really need it.",
        },
      ],
    },
    pm6: {
      title: "Who am I",
      story: "whoami normally returns your username. What happens with sudo?",
      task: "Run sudo whoami.",
      hint: "`whoami` tells you which user you are running commands as right now. Put sudo in front and the command runs as root, so the answer is root. This is how you check in a script whether you are root.",
      v: [
        {
          title: "UID zero",
          story: "Scripts usually tell whether they are root by looking at the UID, not the username. root always has UID 0.",
          task: "Run id -u with sudo.",
          hint: "`id -u` prints only the effective user ID as a number. sudo runs the command as root, so you see 0, without sudo you would see 1000. Root checks in scripts use this number.",
        },
        {
          title: "Before and after",
          story: "See side by side how sudo changes your identity. First yourself, then with sudo.",
          task: "Run whoami first, then sudo whoami.",
          hint: "`whoami` prints which user is running the command right now, the first time you see burak. Put sudo in front and the same command runs as root and returns root. The identity changes only for that single command, your shell stays burak.",
        },
      ],
    },
    pm7: {
      title: "Groups",
      story: "The id command shows a user's uid, gid and groups. Being in the sudo group is what lets you use sudo.",
      task: "Check your groups with id. Are you in the docker group? Submit yes or no.",
      hint: "`id` prints the uid, gid and groups fields. If you see a group name in the groups list you benefit from that group's permissions, the docker group means access to the docker socket. Look at the names next to the numbers, the numbers are group IDs.",
      v: [
        {
          title: "developers group",
          story: "The /srv/projects directory belongs to the developers group and the group has write permission. To write there you need to be in that group.",
          task: "Check your groups with id. Are you in the developers group? Submit yes or no.",
          hint: "`id` prints the uid, gid and groups fields. Look at the names next to the numbers in the groups list, if developers is there you are a member. If you were just added to a group, the change only shows up after a new login.",
        },
        {
          title: "Can deploy use sudo",
          story: "You saw in auth.log that the deploy account tried to become root. Is this account in the sudo group?",
          task: "Check the groups of the deploy user with id. Is deploy in the sudo group? Submit yes or no.",
          hint: "If `id` gets a username as an argument it prints that account's details, not yours. If sudo is not in the groups list the account cannot use sudo, and the user NOT in sudoers line in auth.log says the same. Submit only yes or no.",
        },
      ],
    },

    /* ---------- proc ---------- */
    pr1: {
      title: "Who is running",
      story: "The server is slow. First look at what is running.",
      task: "List all processes.",
      hint: "`ps aux` lists every process on the system. a adds other users' processes, u adds the user and CPU, memory columns, x adds daemons not attached to a terminal. Plain `ps` shows only the processes in your terminal, which is misleading on a server.",
      v: [
        {
          title: "Who does the agent run as",
          story: "You need to know which user erp-agent runs as, the file permissions will be set accordingly.",
          task: "List all processes and submit the user of the erp-agent process.",
          hint: "`ps aux` lists all processes, a adds other users, u adds the user column, x adds daemons not attached to a terminal. The first column is USER. If the output is long you can filter it with `| grep erp-agent`.",
        },
        {
          title: "charon PID",
          story: "The IKE daemon of strongSwan is charon. You are asked to note its PID for debugging.",
          task: "List all processes and submit the PID of the charon process.",
          hint: "In `ps aux` output the second column is the PID. The x in aux matters, charon is a daemon not attached to a terminal and is invisible without x. You can keep only the relevant line with `| grep charon`.",
        },
      ],
    },
    pr2: {
      title: "CPU monster",
      story: "Something is eating almost all of the CPU.",
      task: "Find the process using the most CPU with top and submit its PID.",
      hint: "`top` sorts processes by CPU usage, the biggest consumer sits at the top. The first column is the PID, the number you use when killing it. Real top updates live and you quit with q, here you see a single snapshot.",
      v: [
        {
          title: "Stuck resync",
          story: "The load on the jump box is very high. Something is maxing out the CPU.",
          task: "Find the process using the most CPU with top and submit its PID.",
          hint: "`top` sorts processes by CPU usage, the biggest consumer sits at the top. The first column is the PID, the number you use when killing it. If two processes are close in the %CPU column, read the numbers carefully.",
        },
        {
          title: "Runaway vacuum",
          story: "The postgres instance holding the flow database slowed down, and the server's CPU graph hit the ceiling.",
          task: "Find the process using the most CPU with top and submit its PID.",
          hint: "`top` puts the biggest CPU consumer at the top, sorting by the %CPU column. The COMMAND column tells you what the process is, the PID column gives its number. Real top updates live and you quit with q, here you have a snapshot.",
        },
      ],
    },
    pr3: {
      title: "Stop the miner",
      story: "The cryptominer is running as the www-data user. It is not your process, so a plain kill may not be enough.",
      task: "Kill the cryptominer process.",
      hint: "`kill PID` sends SIGTERM to the process, which asks it to shut down cleanly. Only root can kill another user's process, if you get Operation not permitted put sudo in front. For a stubborn process that ignores SIGTERM, `kill -9`, SIGKILL, is the last resort.",
      v: [
        {
          title: "Stop resync.py",
          story: "resync.py is stuck in an infinite loop and runs as the erp user. It is not your process.",
          task: "Kill the resync.py process.",
          hint: "`kill PID` sends SIGTERM to the process, which asks it to shut down cleanly. The process belongs to the erp user, and only root can kill another user's process, if you get Operation not permitted put sudo in front. You found the PID earlier with top or ps aux.",
        },
        {
          title: "Stop the vacuum",
          story: "The DBA approved it, you can kill the runaway autovacuum worker. It runs as the postgres user.",
          task: "Kill the autovacuum worker process.",
          hint: "`kill` sends SIGTERM by default, giving the process a chance to clean up and exit. Touching a process of the postgres user requires root, hence sudo. Use `kill -9`, SIGKILL, only if SIGTERM does not work, on a database process it can corrupt data.",
        },
      ],
    },
    pr4: {
      title: "Service status",
      story: "People say the website will not open. Check the nginx service.",
      task: "Check the status of the nginx service.",
      hint: "`systemctl status` shows whether a service is loaded, active or failed, along with its latest log lines. The service name is the unit name, you can leave out the .service suffix. If the Active line says failed, the next step is to look at the logs.",
      v: [
        {
          title: "Tunnel service",
          story: "They say the new cloud-lab IPsec tunnel never came up. First check whether the strongSwan service is up.",
          task: "Check the status of the strongswan service.",
          hint: "`systemctl status` shows whether a unit is loaded, active or failed, you can leave out the .service suffix. Here you will see active running, which only tells you the daemon is up. Whether the tunnel came up is something the logs tell you.",
        },
        {
          title: "Agent service",
          story: "erp-agent is not syncing. First make it clear whether the service is running or stopped.",
          task: "Check the status of the erp-agent service.",
          hint: "`systemctl status` shows the service state and where its unit file lives. Seeing running on the Active line does not mean the application works correctly, the process may be up but unable to do its job. The next step is always the service logs.",
        },
      ],
    },
    pr5: {
      title: "Check the log",
      story: "The service is in a failed state. The service log tells you why.",
      task: "Read the nginx logs and submit the faulty line number.",
      hint: "Give `journalctl` the `-u` flag and a unit name and it shows only that service's logs, -u stands for unit. When nginx reports a config error, the message ends with the file path, a colon and the line number. That number is the line you will fix in the next mission.",
      v: [
        {
          title: "Proposal rejected",
          story: "strongSwan is up but cloud-lab will not come up. Which peer is rejecting the proposal you offer?",
          task: "Read the strongswan logs and submit the IP address of the peer that returns NO_PROPOSAL_CHOSEN.",
          hint: "Give `journalctl` a unit name with `-u` and you get only that service's logs. The line starting with received packet from, right above the NO_PROPOSAL_CHOSEN line, tells you which IP the reply came from. Submit only the IP, not the port in square brackets.",
        },
        {
          title: "Wrong resolver",
          story: "erp-agent is up but cannot resolve erp.corp.lab. Which DNS server is it asking?",
          task: "Read the erp-agent logs and submit the resolver IP address it uses.",
          hint: "`journalctl` with the `-u` flag filters the logs of a single unit and drops the rest of the system noise. The using resolver line says the agent uses an address from its own config rather than the system resolver. Submit that address.",
        },
      ],
    },
    pr6: {
      title: "Fix it",
      story: "The config file says listen 80q. A classic slip of the finger. The file is owned by root.",
      task: "Fix the error in nginx.conf and restart the service. The service must be active.",
      hint: "`sed -i` edits the file in place, and `s/old/new/` replaces the first match on each line. The file is owned by root, so sudo is required. `sudo nginx -t` tests the config without breaking the service, do not restart until you see syntax is ok, otherwise the service fails again.",
      v: [
        {
          title: "Proxy port typo",
          story: "A second server block for the portal was added to nginx and the service went down. A capital letter O was typed instead of a zero in the port number.",
          task: "Find the faulty line with nginx -t, fix the port to 8081 and restart the service. The service must be active.",
          hint: "`sudo nginx -t` tests the config without breaking the service and tells you the faulty line. `sed -i` edits the file in place, `s/old/new/` replaces the first match, and since root owns the file sudo is required. Do not restart until the test says syntax is ok, otherwise the service fails again.",
        },
        {
          title: "Missing curly brace",
          story: "Someone deleted the closing curly brace at the end of the file while adding a server block for the status page. nginx says the config ends halfway.",
          task: "See the error with nginx -t, add the missing closing brace at the end of the file and restart the service. The service must be active.",
          hint: "If `sudo nginx -t` says unexpected end of file, a block was opened but never closed. The file is owned by root, and `sudo echo` with `>>` does not work because your own shell does the redirect, instead append the echo output with `sudo tee -a`, where `-a` means append. Restart after the test reports syntax is ok.",
        },
      ],
    },
    pr7: {
      title: "Proof",
      story: "Saying I fixed it is not enough, test it.",
      task: "Fetch the web page from localhost with curl.",
      hint: "`curl` sends an HTTP request to the URL and prints the returned body to the terminal. Even if the service looks active, this is the only way to prove it really answers. If you get Connection refused the service is not listening on the port, check with `systemctl status` first.",
      v: [
        {
          title: "Status page",
          story: "Branch IT wants to make sure the status page they will show on their screens is served. The page is branch-status.html in the web root.",
          task: "Fetch the branch-status.html page from localhost with curl.",
          hint: "`curl` sends an HTTP GET to the URL and prints the returned body to the terminal. You put the path at the end of the URL, nginx looks for it under /var/www/html. If you get Connection refused the service is not listening on the port, run `systemctl status nginx` first.",
        },
        {
          title: "Headers only",
          story: "The monitoring check does not care about the body, it only looks at the HTTP status code. Test it the same way.",
          task: "Send a request to localhost with curl asking only for the headers and see 200 OK.",
          hint: "`curl -I` sends a HEAD request and prints only the response headers instead of the body. HTTP/1.1 200 OK on the first line proves the service answers, and the Server line tells you which software answered. On big pages it saves time and keeps the output readable.",
        },
      ],
    },

    /* ---------- net ---------- */
    n1: {
      title: "My IP address",
      story: "A network engineer's first reflex is to look at the interfaces.",
      task: "Submit the IPv4 address of the eth0 interface without the prefix.",
      hint: "`ip a`, short for `ip addr`, lists the addresses of every interface. The inet line is IPv4, the inet6 line is IPv6, and the /24 at the end of the address is the prefix length. Submit only the address, not the prefix.",
      v: [
        {
          title: "OT VLAN address",
          story: "The HMIs on the OT VLAN use the jump box as their gateway. The jump box address on that VLAN is on eth1.",
          task: "Submit the IPv4 address of the eth1 interface without the prefix.",
          hint: "`ip a`, short for `ip addr`, prints the interface addresses, add `show eth1` and you get only that interface. The line starting with inet is the IPv4 address, the /24 at the end is the prefix length. Leave out the /24 when you submit.",
        },
        {
          title: "WireGuard address",
          story: "You are connected to the partner lab over a WireGuard tunnel. The other side is asking for your tunnel IP.",
          task: "Submit the IPv4 address of the wg0 interface without the prefix.",
          hint: "Add `-br`, brief, to `ip a` and it shows every interface on one line with its name, state and addresses. The /24 part of the address on the wg0 line is the prefix, drop it when you submit. Seeing link/none instead of link/ether on tunnel interfaces is normal.",
        },
      ],
    },
    n2: {
      title: "Default gateway",
      story: "Which door do packets use to get out to the internet?",
      task: "Submit the default gateway address.",
      hint: "`ip route`, or `ip r`, prints the kernel routing table. The line starting with default is the default route, and the address after via is the default gateway. What comes after dev tells you which interface the packets leave through.",
      v: [
        {
          title: "Backup gateway",
          story: "Traffic leaving over the DSL backup line uses a separate routing table through policy based routing, named dsl. What is the default gateway in that table?",
          task: "Submit the default gateway address in the dsl routing table.",
          hint: "`ip rule` shows which source looks up which table. Add `table` and the table name after `ip route show` and you get only that table's routes, plain `ip route` shows the main table and you will not see this route. On the default line, the address after via is the gateway.",
        },
        {
          title: "Tunnel next hop",
          story: "Packets for the partner lab's 10.20.0.0/16 network are sent to the far end of the tunnel. Which address is that next hop?",
          task: "Submit the next hop address of the 10.20.0.0/16 route.",
          hint: "`ip r` prints the main routing table. Each line starts with a prefix, the address after via is the next hop, and what comes after dev is the outgoing interface. Find the 10.20.0.0/16 line and submit what follows via.",
        },
      ],
    },
    n3: {
      title: "Tunnel route",
      story: "The corporate network 10.20.0.0/16 is reached through a VPN tunnel.",
      task: "Which interface does 10.20.0.0/16 go through? Submit the interface name.",
      hint: "Every line of `ip route` output gives a prefix and where to send it. The name after the word dev is the outgoing interface. Pipe the output into `grep` and only the line for the prefix you care about remains.",
      v: [
        {
          title: "OT VLAN route",
          story: "Which door does the 192.168.2.0/24 traffic to the HMIs use to leave the jump box?",
          task: "Which interface does 192.168.2.0/24 go through? Submit the interface name.",
          hint: "Filter the `ip r` output with `grep 192.168.2` and only that prefix's line remains, grep searches for the pattern in the lines coming from the pipe. The name after the word dev is the outgoing interface. proto kernel means the network is directly connected.",
        },
        {
          title: "Container network",
          story: "Docker containers use 172.17.0.0/16 and they say they cannot get out.",
          task: "Which interface does 172.17.0.0/16 go through? Submit the interface name.",
          hint: "Pipe the `ip r` output into `grep` searching for 172.17 and only the container network line remains from the route table. The name after dev is the interface, and linkdown at the end of the line means that interface has no carrier right now, in other words no container is running. Submit only the interface name.",
        },
      ],
    },
    n4: {
      title: "Ping",
      story: "A reachability test. On real Linux ping keeps going forever, giving it a count is a good habit.",
      task: "Ping 8.8.8.8 with 3 packets.",
      hint: "`ping` sends ICMP echo requests to the target and counts the replies. `-c 3` means count, it stops after three packets and prints a summary. On real Linux without -c ping runs until Ctrl+C, which inside a script means getting stuck.",
      v: [
        {
          title: "Hub portal",
          story: "You will measure latency from the branch to the portal.corp.lab server at the hub, the address is 10.50.0.30.",
          task: "Ping 10.50.0.30 with 5 packets.",
          hint: "`ping` sends ICMP echo requests and counts the replies. `-c 5` means count, it stops after five packets and prints a summary. The received count and the rtt avg value in the summary give a first idea of the SD-WAN path quality.",
        },
        {
          title: "HMI reachability",
          story: "The OT team says they cannot reach hmi-01. The name is defined in /etc/hosts, test it by name.",
          task: "Ping the hostname hmi-01 with 2 packets.",
          hint: "`ping` takes an IP or a name as target, if you give a name it is first resolved through /etc/hosts and DNS. `-c 2` sends two packets and stops. The first line of the output also shows which IP the name resolved to.",
        },
      ],
    },
    n5: {
      title: "Which port",
      story: "You cannot connect with ssh. Maybe sshd is not listening on the default port.",
      task: "Submit the TCP port the sshd process is listening on.",
      hint: "`ss` gives socket statistics. `-t` is TCP, `-u` is UDP, `-l` shows only listening sockets, `-n` shows ports as numbers instead of names, `-p` shows which process owns the socket. In the Local Address column the number after the colon is the port.",
      v: [
        {
          title: "Database port",
          story: "They cannot connect to the flow database. Which port is postgres listening on?",
          task: "Submit the TCP port the postgres process is listening on.",
          hint: "`ss` lists sockets. `-t` is TCP, `-l` only listening ones, `-n` shows the port as a number instead of a name, `-p` shows which process owns the socket. In the Local Address column the number after the colon is the port, and 127.0.0.1 means it is reachable only from localhost.",
        },
        {
          title: "Metrics port",
          story: "Prometheus cannot scrape the erp-agent metrics endpoint. Which port is the agent listening on?",
          task: "Submit the TCP port the erp-agent process is listening on.",
          hint: "For `ss`, `-t` means TCP, `-l` listen, `-n` numeric, `-p` process, and they can be combined behind a single dash. Find the erp-agent line in the Process column, in Local Address the number after the colon is the port. Without -n some ports show up as service names and get confusing.",
        },
      ],
    },
    n6: {
      title: "Config check",
      story: "You saw the running state, now check whether the config file says the same thing.",
      task: "Find the Port line in /etc/ssh/sshd_config with grep.",
      hint: "The running state and the config may not agree, the config could have been changed without restarting the service. `grep Port` finds the line containing Port in the file, and since grep is case sensitive, typing port will not match. Do not confuse the commented #Port with the real setting.",
      v: [
        {
          title: "postgresql.conf",
          story: "The running state says 5432. Does the config file say the same, or did someone change it and forget to restart?",
          task: "Find the port line in /etc/postgresql/16/main/postgresql.conf with grep.",
          hint: "`grep port` prints every line containing port in the file, and since grep is case sensitive, typing Port will not match. A line starting with # is a comment and has no effect, the real setting is the line without #. If the config and the running state differ, the service was not restarted.",
        },
        {
          title: "Agent metrics config",
          story: "ss showed 9100. Check whether the agent's metrics config says the same address.",
          task: "Find the metrics_listen line in /etc/erp-agent/metrics.conf with grep.",
          hint: "`grep metrics_listen` returns only the line containing that key. The address and port in the value should match the Local Address in the ss output. A service listening on 127.0.0.1 cannot be scraped from outside, if that is the problem the config has to change.",
        },
      ],
    },
    n7: {
      title: "Local DNS",
      story: "intranet.local does not resolve and the DNS team is on holiday. The temporary fix is /etc/hosts. The file is owned by root, and sudo echo with > does not work because your own shell does the redirect.",
      task: "Add the line 10.10.10.10 intranet.local to /etc/hosts and verify with getent hosts intranet.local.",
      hint: "/etc/hosts is owned by root, and `sudo echo ... >> /etc/hosts` does not work because the redirect is done by your shell, not by sudo. `tee -a` appends stdin to the end of the file, and since it runs with sudo it has write permission, forget -a and tee overwrites the file. `getent hosts` follows the system resolver order, including /etc/hosts.",
      v: [
        {
          title: "NMS entry",
          story: "The new NMS server nms.ist07.local is not in DNS yet, but monitoring will connect by that name. The temporary fix is /etc/hosts.",
          task: "Add the line 10.50.0.44 nms.ist07.local to /etc/hosts and verify with getent hosts nms.ist07.local.",
          hint: "/etc/hosts is owned by root, and `sudo echo ... >> /etc/hosts` does not work because the redirect is done by your shell, not by sudo. Pipe the echo output into `sudo tee -a` and root writes the file, `-a` means append, forget it and tee overwrites the file. `getent hosts` follows the system resolver order including /etc/hosts, dig does not.",
        },
        {
          title: "Partner CRM",
          story: "The partner's CRM server crm.partner.local is reachable only through the tunnel and is not in public DNS. Its address is 172.31.10.5.",
          task: "Add the line 172.31.10.5 crm.partner.local to /etc/hosts and verify with getent hosts crm.partner.local.",
          hint: "`tee -a` both prints stdin to the screen and appends it to the end of the file, run with sudo it writes with root privileges. Without -a tee empties the file and the localhost lines are gone. Use `getent hosts` to verify, because dig does not look at /etc/hosts.",
        },
      ],
    },
    n8: {
      title: "DNS query",
      story: "dig asks the DNS server directly.",
      task: "Get the A record for github.com in short format.",
      hint: "`dig` asks the DNS server from the resolver file directly and never looks at /etc/hosts. `+short` prints only the answer records and drops the header and sections. To ask a specific server you add `@ip`.",
      v: [
        {
          title: "ERP record",
          story: "erp-agent cannot resolve erp.corp.lab. Does the system resolver give the right answer?",
          task: "Get the A record for erp.corp.lab in short format.",
          hint: "`dig` asks the DNS server in /etc/resolv.conf directly and does not look at /etc/hosts. `+short` drops the header and sections and prints only the answer. If an answer comes back, the system resolver is fine and the problem is in the agent's own resolver setting.",
        },
        {
          title: "Mail server",
          story: "The scanner at the branch cannot send scan to mail. Which one is the mail server of the corp.lab domain?",
          task: "Get the MX record for corp.lab in short format.",
          hint: "`dig` takes the record type after the name, MX means mail exchanger, and the default type is A. `+short` prints only the answer, and an MX answer shows the priority first, then the server name. Leave out the type and you look up the A record and never see the mail server.",
        },
      ],
    },
  },

  quiz: {
    "Hidden file'ları da listeleyen komut hangisi?": { q: "Which command also lists hidden files?", a: ["ls -a", "ls -h", "ls -r", "ls -g"] },
    "cd - ne yapar?": { q: "What does cd - do?", a: ["Returns to the previous directory", "Goes to the root directory", "Goes up one directory", "Throws an error"] },
    "> ile >> arasındaki fark nedir?": { q: "What is the difference between > and >>?", a: ["> overwrites, >> appends to the end", "> appends to the end, >> overwrites", "They are the same", ">> redirects stderr"] },
    "chmod 754 dosya sonrası group hangi permission'lara sahip olur?": { q: "After chmod 754 file, which permissions does the group have?", a: ["r-x", "rwx", "r--", "rw-"] },
    "chmod 640 için others ne yapabilir?": { q: "With chmod 640, what can others do?", a: ["Nothing", "Read", "Read and write", "Execute"] },
    "uniq neden genelde sort ile birlikte kullanılır?": { q: "Why is uniq usually used together with sort?", a: ["uniq only catches adjacent duplicates", "uniq also sorts", "uniq fails without sort", "For performance"] },
    "grep -v ne yapar?": { q: "What does grep -v do?", a: ["Shows the lines that do not match", "Gives verbose output", "Shows the version", "Searches case insensitively"] },
    "Bir dosyanın son 20 satırını canlı takip etmek için?": { q: "How do you follow the last 20 lines of a file live?", a: ["tail -n 20 -f dosya", "head -f 20 dosya", "cat -20 dosya", "less +20 dosya"] },
    "echo \"x\" | sudo tee -a /etc/hosts neden çalışır da sudo echo \"x\" >> /etc/hosts çalışmaz?": { q: "Why does echo \"x\" | sudo tee -a /etc/hosts work while sudo echo \"x\" >> /etc/hosts does not?", a: ["The redirect is done by your shell, not by sudo", "tee is faster", "echo does not run as root", ">> is forbidden with sudo"] },
    "kill -9 hangi signal'i gönderir?": { q: "Which signal does kill -9 send?", a: ["SIGKILL", "SIGTERM", "SIGHUP", "SIGINT"] },
    "kill PID default olarak hangi signal'i gönderir?": { q: "Which signal does kill PID send by default?", a: ["SIGTERM", "SIGKILL", "SIGSTOP", "SIGQUIT"] },
    "Listen eden TCP port'larını ve process'lerini gösteren modern komut?": { q: "Which modern command shows listening TCP ports and their processes?", a: ["ss -tlnp", "ip link", "ping -l", "route -n"] },
    "$? variable'ı neyi tutar?": { q: "What does the $? variable hold?", a: ["The exit code of the last command", "The active PID", "The number of arguments", "The user ID"] },
    "Başarılı bir komutun exit code'u nedir?": { q: "What is the exit code of a successful command?", a: ["0", "1", "-1", "255"] },
    "cut -d: -f1 /etc/passwd ne listeler?": { q: "What does `cut -d: -f1 /etc/passwd` list?", a: ["Usernames", "Passwords", "Home directories", "Shells"] },
    "find / -type d -name \"log\" ne arar?": { q: "What does find / -type d -name \"log\" search for?", a: ["Directories named log", "Files that contain the word log", "Files with a log extension", "It deletes log files"] },
    "Servisi restart etmek için?": { q: "How do you restart a service?", a: ["sudo systemctl restart nginx", "nginx --restart", "service-restart nginx", "kill nginx && nginx"] },
    "Bir servisin log'larını okumak için?": { q: "How do you read the logs of a service?", a: ["journalctl -u servis", "cat /var/servis", "systemctl log servis", "dmesg servis"] },
    "mkdir -p a/b/c ne yapar?": { q: "What does mkdir -p a/b/c do?", a: ["Also creates the missing intermediate directories", "Creates only the c directory", "Preserves permissions", "Throws an error"] },
    "rm -rf dizin neden tehlikelidir?": { q: "Why is rm -rf dir dangerous?", a: ["It deletes without asking and with no way back", "It shuts down the system", "It sends files to the trash", "It requires root"] },
    "Tek tırnak ile çift tırnak farkı?": { q: "What is the difference between single and double quotes?", a: ["Variables do not expand inside single quotes", "Variables do not expand inside double quotes", "There is no difference", "Single quotes are only for numbers"] },
    "Bash'te doğru variable ataması hangisi?": { q: "Which is a correct variable assignment in Bash?", a: ["AD=burak", "AD = burak", "$AD=burak", "set AD burak"] },
    "ip route output'unda default via 192.168.1.1 ne demek?": { q: "What does default via 192.168.1.1 mean in ip route output?", a: ["The default gateway is 192.168.1.1", "The DNS server is 192.168.1.1", "Your own IP address", "A DHCP pool"] },
    "/etc/hosts dosyasına dig komutu bakar mı?": { q: "Does the dig command look at /etc/hosts?", a: ["No, dig asks the DNS server directly", "Yes, it always checks it first", "Only when run as root", "Only for IPv6"] },
    "awk '{print $1}' access.log ne verir?": { q: "What does awk '{print $1}' access.log return?", a: ["The first field of every line", "The first line", "The first character of the file", "The line count"] },
    "sed 's/a/b/g' dosyadaki g flag'i ne yapar?": { q: "In sed 's/a/b/g' file, what does the g flag do?", a: ["Replaces every match on the line", "Saves the file", "Makes it case insensitive", "Uses a global variable"] },
    "sed -i ne yapar?": { q: "What does sed -i do?", a: ["Edits the file in place", "Searches case insensitively", "Asks interactively", "Only displays the result"] },
    "2>/dev/null ne işe yarar?": { q: "What is 2>/dev/null for?", a: ["Throws stderr away", "Throws stdout away", "Deletes the file", "Runs it twice"] },
    "wc -l < dosya ile wc -l dosya farkı?": { q: "What is the difference between wc -l < file and wc -l file?", a: ["The first one does not print the file name", "The first one counts words", "No difference, both give the same output", "The first one throws an error"] },
    "ps aux output'unda %CPU sütunu neyi gösterir?": { q: "What does the %CPU column in ps aux output show?", a: ["The CPU usage percentage of the process", "The number of cores", "The priority value", "The amount of memory"] },
    "Bir script'in ilk satırındaki #!/bin/bash ne denir?": { q: "What is the #!/bin/bash on the first line of a script called?", a: ["Shebang", "Hashtag", "Header", "Bang path comment"] },
    "Script içinde $1 neyi temsil eder?": { q: "What does $1 represent inside a script?", a: ["The first argument", "The output of the last command", "The script name", "The PID"] },
    "ls -l output'unda ilk karakter d ise?": { q: "In ls -l output, what does a d as the first character mean?", a: ["It is a directory", "It is a deleted file", "It is a device file", "It is a default file"] },
    "Symbolic link oluşturan komut?": { q: "Which command creates a symbolic link?", a: ["ln -s hedef link", "link -s hedef", "cp -l hedef", "mklink hedef"] },
    "df -h ve du -sh farkı?": { q: "What is the difference between df -h and du -sh?", a: ["df shows filesystem usage, du shows directory size", "They are the same", "df counts files, du counts disks", "du is only for root"] },
    "Bir process'in PID'sini adından bulmak için?": { q: "How do you find a process PID from its name?", a: ["pgrep isim", "pid isim", "whereis isim", "which isim"] },
    "Hangi directory geçici dosyalar içindir ve genelde herkes yazabilir?": { q: "Which directory is meant for temporary files and is usually writable by everyone?", a: ["/tmp", "/etc", "/bin", "/root"] },
    "/var/log neyi barındırır?": { q: "What does /var/log contain?", a: ["Log files", "User home directories", "Executable files", "Config files"] },
    "Config dosyaları genelde nerede durur?": { q: "Where do config files usually live?", a: ["/etc", "/var", "/usr/bin", "/home"] },
    "curl -I ne yapar?": { q: "What does curl -I do?", a: ["Fetches only the HTTP headers", "Downloads the file", "Interactive mode", "Uses IPv6"] },
  },

  badges: {
    first: { title: "First Step", desc: "Complete your first mission" },
    ten: { title: "Warm-up Lap", desc: "Complete 10 missions" },
    thirty: { title: "In Orbit", desc: "Complete 30 missions" },
    all: { title: "Root", desc: "Complete every mission" },
    nohint: { title: "No Hints", desc: "Finish 10 missions without viewing a hint" },
    cmd100: { title: "Keyboard Warrior", desc: "Run 100 commands" },
    cmd500: { title: "Terminal Addict", desc: "Run 500 commands" },
    quiz: { title: "Sharpshooter", desc: "Score 10/10 on the quiz" },
    streak3: { title: "Consistent", desc: "Practice 3 days in a row" },
    streak7: { title: "Weekly Streak", desc: "Practice 7 days in a row" },
    csi: { title: "Detective", desc: "Finish the Crime Scene Investigation chapter" },
    net: { title: "Network Hound", desc: "Finish the Network Detective chapter" },
    cow: { title: "Moo", desc: "Find the secret command" },
  },
});
