'use strict';
/* English overlay for the bash, vim, users, hw and arch chapters, their variants, and the QUIZ items from missions-script.js. Format in I18N.md */
addEn({
  chapters: {
    bash: { title: "Bash Scripting", sub: "if, for, while, case, function, cron" },
    vim: { title: "Vim Basics", sub: "Servers rarely have nano, vim is everywhere" },
    users: { title: "Users and Groups", sub: "useradd, usermod, passwd, chown, id" },
    hw: { title: "Hardware and Disks", sub: "lscpu, lsblk, dmidecode, fdisk, mount, du" },
    arch: { title: "Archiving and Compression", sub: "tar, gzip, zcat, zip, unzip" },
  },
  missions: {
    /* ---------- bash ---------- */
    b1: {
      title: "Your first if",
      story: "Scripts need to make decisions. Here you use if to check whether a file exists. It also works on a single line, and the spaces on both sides of the square brackets are mandatory.",
      task: "On a single line, use if to print `var` if ~/notes.txt exists and `yok` if it does not.",
      hint: "`if` looks at the exit code of a command. `[ ]` is really the `test` command, and `-f` returns 0 when the path exists and is a regular file. On a single line you need `;` before `then`, `else` and `fi`. The most common mistake is forgetting the space inside the bracket, if you write `[-f` bash treats it as a command name.",
      v: [
        {
          title: "Does the directory exist",
          story: "You are about to pull logs from the ION device for a TAC case. The script must first check that the target directory exists, otherwise the logs are written into the void. Use the `-f` test for files and `-d` for directories.",
          task: "On a single line, use if to print `hazir` if the /srv/ion-logs directory exists and `eksik` if it does not.",
          hint: "`[ -d path ]` returns 0 when the path exists and is a directory. `-f` does not help here because a directory is not a regular file. Put `;` before `then`, `else` and `fi`. The spaces inside the square brackets are mandatory, if you write `[-d` bash treats it as a command name.",
        },
        {
          title: "Empty or not",
          story: "The branch router writes its WAN errors to /var/log/branch/wan.err. If the file is empty the line is clean, if it has any lines you need to raise an alarm. The `-s` test is true when the file exists and its size is greater than zero.",
          task: "On a single line, use if to print `alarm` if /var/log/branch/wan.err is not empty and `temiz` if it is empty.",
          hint: "`[ -s file ]` returns 0 when the file exists and holds at least one byte. `-e` only checks existence, so it would also be true for an empty file. Inside a one line if, do not forget the `;` before `then`, `else` and `fi`. If you look at the file with `cat` first, you will see why the output turns out the way it does.",
        },
      ],
    },
    b2: {
      title: "for loop",
      story: "If you need to do the same thing to three files, you do not write it three times, you loop with for.",
      task: "For every .txt file in the data directory, print `name: N satır`, the file name followed by its line count. Use wc -l for N.",
      hint: "`for f in ~/data/*.txt` expands the glob into a list of files, and on each pass `$f` holds one file path. Use `wc -l` for the line count. If you feed the file on stdin with `< $f`, wc prints only the number and does not repeat the file name. `$( )` embeds the output of a command inside echo.",
      v: [
        {
          title: "Count the logs",
          story: "Logs pulled from the SD-WAN edge device sit under /var/log/edge-pull. The TAC engineer wants the line count of each file to see which one has ballooned.",
          task: "For every .log file under /var/log/edge-pull, print `file: N satır`, the file name followed by its line count. Use wc -l for N.",
          hint: "`for f in /var/log/edge-pull/*.log` expands the glob into a list of files, and on each pass `$f` holds the full path. `wc -l < $f` reads the file from stdin, so it prints only the number and not the file name again. Embed the number in echo with `$( )`.",
        },
        {
          title: "Count the configs",
          story: "Each branch router config lives under ~/branch-configs as a .cfg file. Before the change you want a quick view of which config is longer.",
          task: "For every .cfg file in ~/branch-configs, print `file: N satır`, the file name followed by its line count. Use wc -l for N.",
          hint: "Loop over the `~/branch-configs/*.cfg` glob with `for`, on each pass `$f` is one file. When `wc -l` gets the file name as an argument it prints the name next to the number, with `<` you get only the number. If the glob matches nothing, bash leaves the pattern as is, so check the directory name.",
        },
      ],
    },
    b3: {
      title: "Counter",
      story: "Arithmetic is done with `$(( ))`. Let us run a counter with while.",
      task: "Write a while loop that counts from 1 to 5, one number per line.",
      hint: "`while` keeps looping as long as the condition returns 0, and `[ $i -le 5 ]` is a less than or equal test. You increment the counter with `$((i+1))`, `$(( ))` is bash integer arithmetic. If you forget to increment, the loop runs forever, the lab cuts it off after 10000 iterations.",
      v: [
        {
          title: "Countdown",
          story: "Before a planned reboot of the branch router you want to print a warning that counts down from five, leaving a chance to abort with Ctrl+C.",
          task: "Write a while loop that counts down from 5 to 1, one number per line.",
          hint: "`while` loops as long as the condition stays true, for a countdown `-ge 1`, greater than or equal, does the job. Decrease the counter by one on each pass with `$(( ))`. If you forget to decrease it, the condition stays true and the loop never ends.",
        },
        {
          title: "Retry loop",
          story: "An API call to the hub sometimes fails on the first attempt. The script should try at most three times and log each attempt as `deneme N`.",
          task: "Write a while loop that runs from 1 to 3 and prints `deneme N` on each line, where N is the attempt number.",
          hint: "`while [ $i -le 3 ]` loops until the counter passes three, `-le` means less than or equal. Inside echo you combine the `$i` variable with text, and double quotes keep text with spaces as a single argument. Do not forget to increment the counter with `$(( ))`.",
        },
      ],
    },
    b4: {
      title: "Read line by line",
      story: "To process a file line by line you combine read with while. The file is fed in after done with <.",
      task: "Read ~/data/scores.txt line by line and print everyone with a score of 90 or more in the form `name top`.",
      hint: "`while read name score` splits each line on whitespace, putting the first word into name and the rest into score. You feed the file after `done` with `<`, so the loop reads it on stdin. `[ $score -ge 90 ] && echo` is a short if, echo runs only when the test succeeds.",
      v: [
        {
          title: "Slow sites",
          story: "Every morning the NOC writes the latency from each branch to the hub into ~/data/latency.txt, one site and its milliseconds per line. You will pick out the sites above 100 ms and open tickets for them.",
          task: "Read ~/data/latency.txt line by line and print every site with latency greater than 100 in the form `site yavas`.",
          hint: "`while read site ms` splits each line on whitespace, putting the first word into site and the second into ms. Feed the file after `done` with `<`. Use `-gt` for greater than, if you write `>` bash takes it as a redirection and creates a file named 100.",
        },
        {
          title: "Filling disks",
          story: "The monitoring agent dumps the usage percentage of every mount point into ~/data/disk.txt. You will raise a warning for every mount at 80 percent or more.",
          task: "Read ~/data/disk.txt line by line and print every mount at 80 or more in the form `mount dolu`.",
          hint: "`read mp pct` splits the two fields of a line into two variables, and with `done < file` the file becomes the loop stdin. Use `-ge` for greater than or equal, not `-gt`, so that exactly 80 is included. A short if written with `&&` skips the echo when the test fails.",
        },
      ],
    },
    b5: {
      title: "case",
      story: "For multi way branching, case is cleaner than a chain of ifs. Every branch ends with ;;.",
      task: "Write a case for the variable SVC=nginx. Print `web` for nginx, `remote` for sshd and `other` for anything else.",
      hint: "`case $SVC in` compares the variable against the patterns in order, each pattern ends with `)` and each branch closes with `;;`. `*)` is the default branch that runs when no pattern matches, it goes last. The block ends with `esac`, which is case spelled backwards.",
      v: [
        {
          title: "Classify the port",
          story: "You are writing a small case that turns the destination port from a firewall log into plain words. Later the script will go inside a loop.",
          task: "Write a case for the variable PORT=443. Print `ssh` for 22, `http` for 80, `https` for 443 and `bilinmiyor` for anything else.",
          hint: "`case $PORT in` compares the value against the patterns in order, each pattern ends with `)` and each branch closes with `;;`. `*)` is the default branch, put it last, otherwise the patterns after it never get a turn. The block closes with `esac`.",
        },
        {
          title: "Link role",
          story: "The branch has three uplinks. wan and mpls are primary, lte is the backup. You will apply a different QoS profile depending on which link is active.",
          task: "Write a case for the variable LINK=lte. Print `primary` for wan or mpls, `backup` for lte and `down` for anything else.",
          hint: "In a case pattern `|` means or, it groups two values into one branch. Every branch ends with `;;`, and `*)` runs when no pattern matches. case runs the first matching branch and exits, it never falls through to the branches below.",
        },
      ],
    },
    b6: {
      title: "Function",
      story: "Put repeated logic into a function. Arguments arrive as $1, $2 and so on.",
      task: "Define a function called greet that prints the given name as `Hoi, isim!`, then call it with greet Burak.",
      hint: "A function is defined as `name() { commands; }`, you need spaces inside the braces and a `;` before the closing one. Arguments passed to the function arrive inside as `$1`, `$2`. You can separate the definition and the call on the same line with `;`.",
      v: [
        {
          title: "Alarm function",
          story: "You keep typing the same alarm line by hand all over your monitoring scripts. You will move it into a function and pass the link name as an argument.",
          task: "Define a function called alarm that prints the given link name in the form `ALARM: link down`, then call it with alarm wan1.",
          hint: "A function is defined as `name() { commands; }`, you need spaces just inside the braces and a `;` before the closing one. The first word you pass when calling it becomes `$1` inside. Put the echo text in double quotes so that `$1` expands, single quotes print the variable literally.",
        },
        {
          title: "Function with two arguments",
          story: "You want a helper function that logs tunnel setup. The site name and the hub name arrive as two separate arguments.",
          task: "Define a function called tunnel that takes two arguments and prints `tunnel site hub up`, then call it with tunnel ist-br-07 ams-hub.",
          hint: "Inside the function the first argument is `$1`, the second is `$2`, and the total count is `$#`. You can separate the definition and the call on the same line with `;`. Separate arguments with spaces, if you add a comma it becomes part of the value.",
        },
      ],
    },
    b7: {
      title: "Exit code",
      story: "If a command fails, the script should not carry on. $? is the exit code of the last command, 0 means success.",
      task: "Run ping -c 1 192.168.1.99, then print `host down` if the exit code is not 0. On a single line, using if.",
      hint: "`$?` holds the exit code of the command that just ran, 0 is success and anything else is an error. ping returns 1 when it gets no reply, which is why you check with `[ $? -ne 0 ]`. If you put another command in between, `$?` gives that command's result, so check right after.",
      v: [
        {
          title: "Was there an OOM",
          story: "A process died overnight. If syslog has an Out of memory entry, the kernel killed it. grep returns 0 when it finds a match and 1 when it does not, and the script will decide based on that exit code.",
          task: "Use grep to search /var/log/syslog for `Out of memory` and send its output to /dev/null. Then print `oom var` if the exit code is 0. On a single line, using if.",
          hint: "`grep` returns 0 when it finds a match and 1 when it does not, and `$?` carries that value to the next command. You throw the output away with `> /dev/null` because you only care about the exit code. If you run another command in between, `$?` switches to its result, so check right after.",
        },
        {
          title: "Hub reachability",
          story: "IST-BR-07 seems unable to reach the hub tunnel IP 10.99.7.1 over the overlay. The script should detect this from the ping exit code.",
          task: "Run ping -c 1 10.99.7.1, then print `hub unreachable` if the exit code is not 0. On a single line, using if.",
          hint: "`ping -c 1` sends a single packet and returns 1 if no reply comes back. `$?` is the exit code of the last command, and `[ $? -ne 0 ]` is true when it is not zero. Without -c, ping on real Linux never stops and the script hangs there.",
        },
      ],
    },
    b8: {
      title: "Health check script",
      story: "Now put it all together. Write a script that pings every host it is given and reports the result.",
      task: "Write ~/scripts/check.sh with nano. For each argument it should run ping -c 1 host and print `host UP` on success or `host DOWN` otherwise. Then run it with bash ~/scripts/check.sh 127.0.0.1 192.168.1.99.",
      hint: "`for h in \"$@\"` walks through every argument given to the script, and the quoted `$@` does not split arguments that contain spaces. `if ping -c 1 $h > /dev/null` tests the ping exit code directly, `-c 1` sends one packet and `> /dev/null` hides the ping output. After saving the script in nano, run it with `bash` and the arguments.",
      v: [
        {
          title: "Disk alarm script",
          story: "The monitoring agent is not running on the branch server and you need a stopgap. ~/data/usage.txt holds the usage percentage of every mount point. The threshold will be passed as an argument, and every mount over it gets an ALERT.",
          task: "Write ~/scripts/diskalert.sh with nano. The first argument is the threshold. It should read ~/data/usage.txt line by line and print `ALERT mount pct%` for mounts at or above the threshold and `OK mount` for the rest. Then run it with bash ~/scripts/diskalert.sh 80.",
          hint: "Inside the script `$1` is the first argument, for readability copy it into a variable like `limit=$1`. `while read mp pct; do ... done < file` splits every line into two fields, and `if [ $pct -ge $limit ]` does the threshold check. If you run the script without an argument, limit stays empty and the test fails.",
        },
        {
          title: "Service check script",
          story: "The sdwan-agent service on the branch server keeps dropping now and then. You will write a script that checks each given service name and reports the result.",
          task: "Write ~/scripts/svccheck.sh with nano. For each argument it should run systemctl is-active and print `service RUNNING` if it is active or `service STOPPED` otherwise. Then run it with bash ~/scripts/svccheck.sh cron sdwan-agent.",
          hint: "`for s in \"$@\"` walks through the arguments in order. `systemctl is-active` returns 0 when the service is active and non zero otherwise, so it works directly as an `if` condition. Hide its output with `> /dev/null`, otherwise active and failed lines get mixed into your report.",
        },
      ],
    },
    b9: {
      title: "Log cleaner",
      story: "A real sysadmin script. Find the empty files in a directory, count them, delete them.",
      task: "~/lab/tmp holds 3 empty files and 1 non empty file. Write ~/scripts/clean.sh with nano. It should delete the empty files and finish by printing `N dosya silindi`, where N is the number of deleted files. Run it.",
      hint: "`[ ! -s \"$f\" ]` is true when the file is empty, `-s` means size greater than zero and `!` negates it. Use `n=$((n+1))` for the counter and print the total with `echo` once the loop ends. Quote the `$f` variable, with a file name containing spaces rm would hit the wrong files.",
      v: [
        {
          title: "Log rotate",
          story: "The application does not rotate its own logs and the .log files under ~/lab/rotate keep growing. Until logrotate is installed you will write a simple rotate script. Every .log file becomes .log.1 and a fresh empty log takes its place.",
          task: "Write ~/scripts/rotate.sh with nano. It should move every .log file in ~/lab/rotate to .log.1, create an empty .log in its place and finish by printing `N log döndürüldü`, where N is the number of rotated logs. Run it.",
          hint: "`for f in ~/lab/rotate/*.log` only walks files with the .log extension and leaves the others alone. `mv \"$f\" \"$f.1\"` moves the file, then `touch \"$f\"` creates an empty file with the same name. Use `n=$((n+1))` for the counter and print the total with echo after the loop.",
        },
        {
          title: "Incident collector",
          story: "TAC wants the logs that contain errors. There are a few logs under ~/lab/applogs, and only the ones containing ERROR should be copied to ~/lab/incident.",
          task: "Write ~/scripts/collect.sh with nano. It should create the ~/lab/incident directory, copy every file in ~/lab/applogs that contains ERROR into it and finish by printing `N dosya kopyalandı`, where N is the number of copied files. Run it.",
          hint: "`if grep ERROR \"$f\" > /dev/null` uses the grep exit code as the condition, it returns 0 when there is a match. If you do not send the output to /dev/null, the matching lines spill onto the screen. Create the target directory before the loop with `mkdir -p`, -p does not complain if the directory already exists.",
        },
      ],
    },
    b10: {
      title: "crontab",
      story: "To run the script every night you use cron. It is edited with crontab -e, five time fields followed by the command. Time does not flow in the lab, the cron-tick command simulates one cron minute.",
      task: "Use crontab -e to add a line that runs bash ~/scripts/backup.sh every day at 02.30, then verify it with crontab -l.",
      hint: "A cron line starts with five time fields, minute, hour, day of month, month and day of week, followed by the command. For 02.30 you put 30 in the minute field and 2 in the hour field. `crontab -e` opens the editor, `crontab -l` shows the saved line.",
      v: [
        {
          title: "Every 15 minutes",
          story: "Your WAN check script is ready, now it should run on its own every quarter hour. In cron a step value is written as `*/N`.",
          task: "Use crontab -e to add a line that runs bash ~/scripts/wan-check.sh every 15 minutes, then verify it with crontab -l.",
          hint: "A cron line has five fields, minute, hour, day of month, month and day of week, followed by the command. Putting `*/15` in the minute field means minutes 0, 15, 30 and 45. If you put it in the hour field it runs every 15 hours, so mind the field order.",
        },
        {
          title: "Weekday evenings",
          story: "The log rotate script should only run on weekdays at the end of the working day, at 18.45. In the day of week field 1 is Monday and 5 is Friday.",
          task: "Use crontab -e to add a line that runs bash ~/scripts/logrotate.sh at 18.45 every day from Monday to Friday, then verify it with crontab -l.",
          hint: "The first field is the minute, the second the hour, the fifth the day of week. A range of days is written as `1-5`, and both 0 and 7 mean Sunday. A classic mistake is reading 18.45 the wrong way round and putting 18 in the minute field.",
        },
      ],
    },
    b11: {
      title: "Trigger cron",
      story: "Is the cron line right? Instead of waiting, trigger it with the lab's cron-tick command and a CRON entry lands in syslog.",
      task: "Run cron-tick, then use grep to find the CRON line in syslog.",
      hint: "`cron-tick` simulates one cron minute in the lab and runs every line in the crontab once. Real cron writes every run to syslog with the CRON tag, you filter it with `grep CRON /var/log/syslog`. Looking at the last lines with `tail` shows the newest entry.",
      v: [
        {
          title: "Trigger the WAN check",
          story: "The WAN check line is in the crontab. Instead of waiting a quarter hour you will trigger it with cron-tick and look at its syslog entry and the alarm file the script writes.",
          task: "Run cron-tick, then use grep to find the CRON line in syslog that mentions wan-check.",
          hint: "`cron-tick` runs every line in the crontab once and logs it to syslog with the CRON tag. If you grep for the script name you only see the lines for that job. Then check ~/lab/wan-alerts.log to confirm the script really ran.",
        },
        {
          title: "Trigger the rotate",
          story: "The log rotate line is in the crontab but you do not want to wait for the evening. You will run it with cron-tick and check the syslog entry and the app.log.1 file under ~/lab.",
          task: "Run cron-tick, then show the last of the CRON lines in syslog using grep and tail.",
          hint: "`cron-tick` simulates one cron minute. Pipe the lines you filtered with `grep CRON` into `tail -1` with `|` to see the newest entry. If the entry is there but app.log.1 is not, the problem is inside the script, not in cron.",
        },
      ],
    },
    b12: {
      title: "Argument check",
      story: "A good script prints usage information and exits when called without arguments. $# is the number of arguments.",
      task: "Write ~/scripts/usage.sh with nano. With no arguments it should print `usage: usage.sh <host>` and exit with exit 1, otherwise it should print `checking $1`. Run it first without arguments, then with one argument.",
      hint: "`$#` is the number of arguments given to the script, and `[ $# -eq 0 ]` is true when there are none. Exit with `exit 1` after the usage message, a non zero exit code tells the caller something went wrong. Without `exit` the script carries on and runs with an empty `$1`.",
      v: [
        {
          title: "Restart script",
          story: "Someone on the team ran the restart script without an argument and it called systemctl with an empty service name. Unless there is exactly one argument, it should print usage information and exit.",
          task: "Write ~/scripts/restart.sh with nano. If the argument count is not 1 it should print `usage: restart.sh <service>` and exit with exit 1, otherwise it should print `restarting $1`. Run it first without arguments, then with nginx as the argument.",
          hint: "`$#` is the number of arguments, and `[ $# -ne 1 ]` is true unless there is exactly one, so it also catches extra arguments. Write `exit 1` after the usage message so the script does not carry on. A non zero exit code tells the calling script that something went wrong.",
        },
        {
          title: "Two arguments required",
          story: "The tunnel script needs a site name and a hub name. Called with only one argument it produces a half finished config, and you are going to prevent that.",
          task: "Write ~/scripts/tunnel.sh with nano. If there are fewer than 2 arguments it should print `usage: tunnel.sh <site> <hub>` and exit with exit 1, otherwise it should print `tunnel $1 $2 kuruluyor`. Run it first with just ist-br-07, then with ist-br-07 ams-hub.",
          hint: "`[ $# -lt 2 ]` is true when there are fewer than two arguments, `-lt` means less than. Without `exit 1` the script prints usage and then carries on with an empty `$2`. Put the angle brackets of the usage line inside double quotes, unquoted `<` is a redirection.",
        },
      ],
    },

    /* ---------- vim ---------- */
    v1: {
      title: "Escape",
      story: "Getting into Vim and not being able to get out is a classic story. Press Esc to return to normal mode and use `:q!` to quit without saving.",
      task: "Open ~/notes.txt with vim and quit without saving.",
      hint: "Vim opens in normal mode, and `:` opens the command line. `:q!` discards changes and quits, the exclamation mark means force. If you type only `:q` and the file has changed, vim refuses to quit with error E37.",
      v: [
        {
          title: "Look and leave",
          story: "You only need to look at the branch device site config, no changes. Open the file in Vim, read the value and quit without touching anything.",
          task: "Open ~/lab/ion-site.conf with vim, quit without saving and submit the wan_mtu value.",
          hint: "Vim opens in normal mode, you can move between lines with the arrow keys or `j`. `:q!` quits without saving anything, the exclamation mark means force. Once you are out, send the value with `submit`.",
        },
        {
          title: "Undo the accident",
          story: "You opened the route list and hit dd by mistake, one line is gone. If you quit without saving, the copy on disk stays intact.",
          task: "Open ~/lab/routes.bak with vim, delete the first line with dd, then quit without saving. The file must remain unchanged.",
          hint: "`dd` only deletes the line in the buffer, the disk does not change until you `:w`. If you type `:q` while there are changes, vim refuses to quit with E37. `:q!` discards the buffer and quits.",
        },
      ],
    },
    v2: {
      title: "Insert mode",
      story: "Vim is a modal editor. In normal mode letters are commands, to type you switch to insert mode with i. You go back with Esc and save and quit with `:wq`.",
      task: "Open ~/lab/vim.txt with vim, type `vim calisiyor`, save and quit.",
      hint: "In normal mode `i` switches to insert mode at the cursor, from then on every letter you type goes into the text. Press `Esc` to return to normal mode, then `:wq` saves and quits. If you forget Esc and type `:wq`, those characters go into the file as text.",
      v: [
        {
          title: "Write the MOTD",
          story: "You want everyone who logs in to the branch server to see the maintenance note. You will write the note into ~/lab/motd.txt with vim.",
          task: "Open ~/lab/motd.txt with vim, type `IST-BR-07 bakimda`, save and quit.",
          hint: "In normal mode `i` switches to insert mode, and INSERT appears at the bottom of the screen. After typing, press `Esc` to return to normal mode, `:wq` saves and quits. A `:wq` typed without pressing Esc goes into the text as characters.",
        },
        {
          title: "Append to the line",
          story: "The login banner is in ~/lab/banner.txt. You want to add the NOC details at the end of the line, and instead of moving the cursor there by hand you will enter insert mode right at the end of the line.",
          task: "Open ~/lab/banner.txt with vim, use A to append `, NOC 7x24 izliyor` to the end of the line, save and quit.",
          hint: "`A` moves the cursor to the end of the line and enters insert mode, while `I` goes to the first non blank character. If you used `i`, the text would go where the cursor is, at the start of the line. When done, Esc and `:wq`.",
        },
      ],
    },
    v3: {
      title: "Delete a line",
      story: "dd deletes the line you are on. You move down and up with j and k.",
      task: "In ~/lab/list.txt, delete the second line with dd and save.",
      hint: "`j` moves one line down and `k` one line up. `dd` cuts the line under the cursor into a register, and you can paste it back with `p` if you want. A count prefix works too, `3dd` deletes three lines.",
      v: [
        {
          title: "Remove the test rule",
          story: "~/lab/acl.txt still has a deny rule left over from last week's test, on the third line. You will delete it without touching the other rules.",
          task: "In ~/lab/acl.txt, delete the third line with dd and save.",
          hint: "`j` moves down one line per press, for the third line press it twice or type `2j`. `dd` deletes the line you are on. If you deleted the wrong line, `u` undoes it.",
        },
        {
          title: "Old peer",
          story: "The first line of ~/lab/peers.txt still holds an old BGP peer that has been shut down. When Vim opens the file, the cursor is already on the first line.",
          task: "Delete the first line of ~/lab/peers.txt with dd and save.",
          hint: "When Vim opens, the cursor is on the first line, so `dd` deletes it without any movement. To be sure, you can jump to the top with `gg` first. Then save with `:wq`.",
        },
      ],
    },
    v4: {
      title: "Append at the end",
      story: "G jumps to the end of the file, o opens a new line below and enters insert mode.",
      task: "Add a `delta` line to the end of ~/lab/list.txt and save.",
      hint: "`G` jumps to the last line of the file, `gg` goes back to the top. `o` opens an empty line below the current one and goes straight into insert mode, `O` opens one above. After typing, Esc and `:wq`.",
      v: [
        {
          title: "Add to the IP list",
          story: "The new web server went live at 10.50.0.42 and needs to be added to the end of ~/lab/allowed_ips.txt.",
          task: "Add a `10.50.0.42` line to the end of ~/lab/allowed_ips.txt and save.",
          hint: "`G` jumps to the last line, `o` opens a new line below and enters insert mode. If you only use `i`, the text gets stuck to the start of the last line. When done, Esc and `:wq`.",
        },
        {
          title: "hosts entry",
          story: "The DNS record has not propagated yet, so you will temporarily add web02.lab to /etc/hosts. The file is owned by root.",
          task: "Use sudo vim to add the line `10.50.0.42 web02.lab` to the end of /etc/hosts and save.",
          hint: "If you do not open a root owned file with `sudo vim`, `:wq` fails with a readonly error. `G` goes to the last line, `o` opens a line below and enters insert mode. The IP comes first and then the hostname, reversed the lookup does not work.",
        },
      ],
    },
    v5: {
      title: "Find and replace",
      story: "To replace across the whole file use `:%s/old/new/g`. Same logic as sed, inside vim.",
      task: "Change every `10.0.0.` address in ~/lab/hosts.txt to `10.1.0.` and save.",
      hint: "In `:%s/old/new/g`, `%` means all lines and `g` means every match on a line. Without g only the first match on each line changes. The pattern is a regex where a dot matches any character, escape it as `\\.` for an exact match.",
      v: [
        {
          title: "Hub migration",
          story: "The Amsterdam hub is going into maintenance and all tunnels move to the Frankfurt hub. Every occurrence of ams-hub in ~/lab/tunnels.txt must become fra-hub.",
          task: "Change every `ams-hub` in ~/lab/tunnels.txt to `fra-hub` and save.",
          hint: "In `:%s/old/new/g`, `%` means all lines and the trailing `g` means every match on a line. Without % only the line under the cursor changes. To see the result, look through the file with `gg` before saving.",
        },
        {
          title: "Change the port",
          story: "The portal application is moving from 8080 to 8443. The port appears on three different lines in ~/lab/app.conf, twice on one of them.",
          task: "Change every `8080` in ~/lab/app.conf to `8443` and save.",
          hint: "`:%s/8080/8443/g` replaces across the whole file. Without the trailing `g`, a port that appears twice on one line only changes in the first spot and the second stays. Vim tells you on the bottom line how many lines it changed.",
        },
      ],
    },
    v6: {
      title: "Copy and paste",
      story: "yy copies a line, p pastes it below. u undoes the last change.",
      task: "Copy the first line of ~/lab/list.txt with yy, go to the end of the file with G, paste with p and save.",
      hint: "`yy` copies the line, vim calls this yank. `p` pastes below the cursor, `P` above. First go to the first line with `gg`, and after copying go to the last line with `G`.",
      v: [
        {
          title: "Copy the VLAN",
          story: "The voice VLAN is on the second line of ~/lab/vlans.txt. A copy of that line should also sit at the end of the list, as a template for the second switch.",
          task: "Copy the second line of ~/lab/vlans.txt with yy, go to the end with G, paste with p and save.",
          hint: "Move down to the second line with `j`, `yy` copies it. `G` goes to the last line, and `p` pastes the copy below the cursor. If you use `P`, it lands above the last line and the order breaks.",
        },
        {
          title: "Clone an interface",
          story: "You will add a third LAN interface to ~/lab/interfaces.txt. The fastest way is to copy the last line, paste it below and change only the numbers.",
          task: "Copy the last line of ~/lab/interfaces.txt with yy, paste it below with p, change every 2 to 3 on the pasted line and save.",
          hint: "`G` goes to the last line, `yy` copies it, `p` pastes it below and the cursor moves to the new line. `:s/2/3/g` written without the percent sign only works on the current line, so the other lines stay intact. If you write `:%s`, the original eth2 line gets changed too.",
        },
      ],
    },
    v7: {
      title: "Search",
      story: "/word searches, n jumps to the next match. You can delete the line you found with dd.",
      task: "In ~/lab/hosts.txt, find the line containing `db` with /, delete it with dd and save.",
      hint: "`/word` followed by Enter searches forward and moves the cursor to the first match, `n` goes to the next match and `N` to the previous one. On the line you found, `dd` deletes it. If the word appears on more than one line, make sure you are on the right one.",
      v: [
        {
          title: "Remove the intern",
          story: "The ~/lab/users.txt access list still has the line of an intern whose term has ended. You do not know the line number, so you will search for it.",
          task: "In ~/lab/users.txt, find the line containing `stajyer` with /, delete it with dd and save.",
          hint: "After typing `/stajyer` and pressing Enter, the cursor goes to the first match. `dd` deletes that line. Search is case sensitive, if you type Stajyer it will not find it.",
        },
        {
          title: "Second match",
          story: "lte appears on two lines of ~/lab/routes.txt. The first is the legitimate route for the 172.16 network, the second is a default route added by mistake. Only the second one goes.",
          task: "Search for `lte` in ~/lab/routes.txt, move to the second match with n, delete that line with dd and save.",
          hint: "`/lte` takes you to the first match, and `n` repeats the same search forward. If you press `dd` on the first match, the legitimate route is gone. Before deleting, check which line the cursor is on, and if it is wrong undo with `u`.",
        },
      ],
    },
    v8: {
      title: "Fix the config",
      story: "A real scenario. Fix the error in the nginx config line with vim. The file is owned by root.",
      task: "Open /etc/nginx/nginx.conf with sudo vim, change the line `listen 80q;` to `listen 80;`, save, then test with sudo nginx -t.",
      hint: "The file is owned by root, if you do not open it with `sudo vim` you get a readonly error when saving. `/80q` takes you to the broken line, `:s/80q/80/` replaces only on the current line, or you can delete the single letter with `x`. After saving, `sudo nginx -t` loads the config and tests the syntax, always run it before restarting the service.",
      v: [
        {
          title: "Missing brace",
          story: "While the portal site server block was being edited, its closing brace was deleted, and nginx -t says it expects a closing brace at the end of the file. You will add the missing line with vim, the file is owned by root.",
          task: "Open /etc/nginx/nginx.conf with sudo vim, add a `    }` line below the `index index.html;` line, save, then test with sudo nginx -t.",
          hint: "Find the line with `/index index`, `o` opens a new line below and enters insert mode, then type four spaces and the closing brace. The number of opening and closing braces must match, nginx -t checks this. If you open the file without sudo, you cannot save it.",
        },
        {
          title: "Extra brace",
          story: "Someone pasting a block into the config left an extra closing brace at the end of the file, and nginx -t says the braces are unbalanced. Deleting the last line is enough.",
          task: "Open /etc/nginx/nginx.conf with sudo vim, delete the extra `}` line at the end of the file, save, then test with sudo nginx -t.",
          hint: "`G` jumps to the last line and `dd` deletes it. Before deleting, make sure the line just above it is the brace that closes the http block. After saving, `sudo nginx -t` should say syntax is ok.",
        },
      ],
    },

    /* ---------- users ---------- */
    u1: {
      title: "Who are you, who is here",
      story: "A new intern is joining the team and you will create an account for them. First look at your own identity. The id command shows your uid, gid and the groups you belong to, and if you give it a user name it shows that user. Being in the sudo group means being able to use sudo.",
      task: "Show your own id information, then the id information of the deploy user.",
      hint: "`id` without arguments shows your own uid, gid and groups, with a user name it shows that user. If sudo appears in the groups part, that account can use sudo. If the account does not exist you get `no such user`, which is also a good way to catch a typo.",
      v: [
        {
          title: "Service account",
          story: "The DB team is asking which uid the postgres account runs as, they will set the ownership of the backup files accordingly. Service accounts usually get a uid below 1000.",
          task: "Show your own id information, then the id information of the postgres user.",
          hint: "`id user` shows that account's uid, primary group and supplementary groups on one line. `id` without arguments shows you, so look at yourself first for comparison. uids below 1000 are reserved for system and service accounts.",
        },
        {
          title: "Just the uid",
          story: "A script needs the uid of www-data as a number. Instead of parsing the whole line you will use the id options that return a single field.",
          task: "First list your own groups by name, then show only the uid number of the www-data user.",
          hint: "`id -nG` gives the groups by name instead of number, and `-G` gives all groups. `id -u user` prints only the uid number, ideal for capturing into a variable in a script. Without -n, -G returns a list of numbers.",
        },
      ],
    },
    u2: {
      title: "Account record",
      story: "Every account is one line in /etc/passwd. The fields are separated by colons, user name, x, uid, gid, comment, home directory and login shell. getent passwd name fetches the same line through NSS and also works for LDAP users, which is why it is preferred over grep.",
      task: "Show the passwd record of the deploy user with getent and submit its login shell.",
      hint: "`getent passwd name` fetches the record through NSS, so besides the local file it also finds LDAP and SSSD users. The line has seven colon separated fields, and the last one is the login shell. Reading /etc/passwd with grep only shows local users.",
      v: [
        {
          title: "Where is home",
          story: "The postgres account home directory is not under the usual /home. The backup script has to know this directory, and you will read it from the passwd record.",
          task: "Show the passwd record of the postgres user with getent and submit its home directory.",
          hint: "`getent passwd name` returns seven colon separated fields, and the sixth field is the home directory. Count the fields in order, name, x, uid, gid, comment, home, shell. Reading /etc/passwd with grep does not show LDAP users, getent does.",
        },
        {
          title: "Account that cannot log in",
          story: "A security audit asks whether anyone can log in interactively with the www-data account. The answer is in the login shell field.",
          task: "Show the passwd record of the www-data user with getent and submit its login shell.",
          hint: "The last field of the `getent passwd www-data` line is the login shell. /usr/sbin/nologin means the account cannot open an interactive session, which is standard for service accounts. Read the line by splitting it at the colons.",
        },
      ],
    },
    u3: {
      title: "An account for the intern",
      story: "The intern's name is ali. useradd is a bare bones tool, on Debian it does not create a home directory and it gives /bin/sh as the shell. That is why -m and -s /bin/bash almost always go together. The friendly Debian alternative, adduser, asks about everything and sets it all up. Creating an account requires root.",
      task: "Create a user named ali with a home directory and /bin/bash as the shell.",
      hint: "`useradd` is bare bones on Debian, without `-m` no home directory is created and without `-s` the shell is /bin/sh. So give both, and run the command with sudo. Then check the home and shell fields with `getent passwd`.",
      v: [
        {
          title: "NOC intern",
          story: "An intern named Selin is starting at the NOC. Her account will be selin and she needs a home directory and a bash shell. You will also put her name in the comment field so it shows who she is in the passwd record.",
          task: "Create a user named selin with a home directory, /bin/bash as the shell and `Selin Stajyer` in the comment field.",
          hint: "In `useradd`, `-m` creates the home directory, `-s` sets the login shell and `-c` writes the comment, the fifth field. Put the comment in double quotes because it contains a space, otherwise the second word is taken as the user name. Creating an account requires root.",
        },
        {
          title: "Fixed uid",
          story: "Emre, a contractor engineer, must have the same uid on two servers that share files over NFS, otherwise file ownership gets mixed up. On the other server he was given uid 2001.",
          task: "Create a user named emre with uid 2001, a home directory and /bin/bash as the shell.",
          hint: "`-u 2001` sets the uid by hand, otherwise useradd picks the next free uid and it will not match across servers. `-m` and `-s /bin/bash` are still needed. Then verify the uid with `id emre`.",
        },
      ],
    },
    u4: {
      title: "Set a password",
      story: "An account created with useradd starts out locked, and the password field in /etc/shadow is an exclamation mark. You set a password with passwd. The real passwd asks for the password twice without echoing it, the lab has no prompt, so the command prints the same flow and accepts lab123. passwd -S shows the account status on one line, P usable, L locked, NP no password.",
      task: "Set a password for ali, then confirm with passwd -S that the status is P.",
      hint: "`passwd user` needs root to change someone else's password, so run it with sudo. `-S` shows the account status on one line, P usable password, L locked, NP no password. An account created with useradd starts as L and becomes P once it has a password.",
      v: [
        {
          title: "A password for Selin",
          story: "The selin account was created locked, and you will set a password so she can log in on her first day. Then you will confirm the account status on one line.",
          task: "Set a password for selin, then confirm with passwd -S that the status is P.",
          hint: "`passwd user` needs sudo because it changes someone else's password. `-S` gives the status in the second field of its output, P usable password, L locked. If you also run -S before setting the password you will see L, which makes the difference clear.",
        },
        {
          title: "Password from a script",
          story: "The emre account is created by a provisioning script, where interactive passwd cannot be used. chpasswd reads user and password pairs from stdin.",
          task: "Pipe the line `emre:Branch2026` from echo into sudo chpasswd, then confirm with passwd -S that the status is P.",
          hint: "`chpasswd` expects a user and a password on each line, separated by a colon, and requires root. You pass the echo output to `sudo chpasswd` with `|`. Because the password sits on the command line it ends up in history, in real life read it from a file.",
        },
      ],
    },
    u5: {
      title: "Team group",
      story: "You want only the devops team to touch the deployment files. First create the group, then add ali. usermod -aG is critical, -a means append. Without -a, -G replaces all of the user's supplementary groups with the list you give, and things like sudo membership vanish.",
      task: "Create a group called devops and add ali to it.",
      hint: "`groupadd` adds the new group to /etc/group. In `usermod -aG group user`, `-a` means append and `-G` is the supplementary group list. If you forget -a, the user's existing supplementary groups are removed and only the group you gave remains.",
      v: [
        {
          title: "NOC group",
          story: "You want only the NOC team to be able to write to the NOC report directory. First you will create the noc group, then put selin in it.",
          task: "Create a group called noc and add selin to it.",
          hint: "`groupadd` adds the group to /etc/group, and usermod does not recognise a group that does not exist. For `usermod`, `-a` means append and `-G` supplementary group, and the order is group first, then user. Afterwards `id` should show noc in the groups part for selin.",
        },
        {
          title: "Fixed gid",
          story: "The netops group was created with gid 3000 on the other servers, and shared directories need the same gid. You will create the group with that gid and add emre.",
          task: "Create the netops group with gid 3000 and add emre to it.",
          hint: "`groupadd -g 3000` sets the gid by hand, otherwise the next free gid is picked and it will not match across servers. Add the member with `usermod -aG`, without -a the user's other supplementary groups are removed. Check the gid and the member with `getent group netops`.",
        },
      ],
    },
    u6: {
      title: "The append difference",
      story: "ali should now be able to use sudo too. There is a trap here. If you type usermod -G sudo ali, the devops membership is removed, because -G rewrites the list from scratch. The right way is -aG. If you leave out -a, the lab tells you which groups were dropped, a real system does it silently.",
      task: "Add ali to the sudo group as well, without losing the devops membership.",
      hint: "`-G` on its own rewrites the supplementary group list from scratch, used together with `-a` it appends to the existing list. So when adding sudo you must use `-aG` too, otherwise the devops membership is lost. `groups ali` should show both groups together.",
      v: [
        {
          title: "Permission to read logs",
          story: "selin should be able to read syslog and auth.log. On Debian the way to do that is the adm group. But her noc membership must not be lost.",
          task: "Add selin to the adm group as well, without losing the noc membership.",
          hint: "When `usermod` gets `-aG`, the group is appended to the existing list. Without -a, `-G` rewrites the list and the noc membership is gone. Afterwards `groups` should show both groups together for selin.",
        },
        {
          title: "Docker access",
          story: "emre will manage the lab containers and needs to join the docker group. His netops membership must stay in place.",
          task: "Add emre to the docker group as well, without losing the netops membership.",
          hint: "`-aG` adds on top of the existing supplementary groups, while `-G` alone replaces the list with the group you give. Membership in the docker group is effectively root access, so be careful who you grant it to. Then check both groups with `id emre`.",
        },
      ],
    },
    u7: {
      title: "Handing over ownership",
      story: "You are handing the ~/proje directory over to ali and the devops team. The `chown user:group` form changes both owner and group in one go, and -R descends into subdirectories. If only the group changes, chgrp or `chown :group` is enough. Giving a file to someone else requires root.",
      task: "Make ali the owner and devops the group of the ~/proje directory and everything in it.",
      hint: "`chown user:group` changes owner and group in one go. `-R` descends into every file inside the directory, without it only the directory itself changes. Giving a file to another user requires root, so run it with sudo.",
      v: [
        {
          title: "Report directory",
          story: "The /srv/noc-reports directory is owned by root and the NOC team cannot write into it. You will hand the directory and its contents over to selin and the noc group.",
          task: "Make selin the owner and noc the group of the /srv/noc-reports directory and everything in it.",
          hint: "`chown user:group` changes both at once. Without `-R` only the directory changes and the report files inside stay with root. Giving a root owned file to someone else requires sudo.",
        },
        {
          title: "Group only",
          story: "The ~/sdwan-lab directory is yours and you stay the owner. You will only change the group so the netops team can access it too.",
          task: "Set the group of the ~/sdwan-lab directory and everything in it to netops, keeping burak as the owner.",
          hint: "If you leave the user part empty, as in `chown :group`, only the group changes, which is the same as `chgrp`. `-R` applies it to the files underneath as well. If you also write a user name, you give away the ownership.",
        },
      ],
    },
    u8: {
      title: "Lock the account",
      story: "The intern's term is over but their files are still needed, so locking the account is safer than deleting it. passwd -l puts an exclamation mark in front of the password hash, login becomes impossible, and the files and uid stay in place. usermod -L does the same. To unlock, -u.",
      task: "Lock the ali account and confirm the L status with passwd -S.",
      hint: "`passwd -l` puts an exclamation mark in front of the hash in the shadow file, so password login becomes impossible while the account, uid and files stay in place. It requires root. With `passwd -S` you should see L in the second field, and `-u` unlocks it.",
      v: [
        {
          title: "Lock with usermod",
          story: "selin's internship is over but her reports will be reviewed, so the account will not be deleted, only locked. This time you will lock it with usermod.",
          task: "Lock the selin account with usermod and confirm the L status with passwd -S.",
          hint: "`usermod -L` does the same as passwd -l, it puts an exclamation mark in front of the hash in shadow. To unlock, `-U`. Locking only blocks password login, if there is an SSH key it has to be removed separately.",
        },
        {
          title: "Verify with shadow",
          story: "emre's contract has been suspended and you will lock his account. This time you will verify by looking at the shadow record itself.",
          task: "Lock the emre account with passwd, then use getent shadow to see the exclamation mark in his record.",
          hint: "`passwd -l` adds an exclamation mark in front of the hash. `getent shadow` fetches the user's shadow line, and if the second field starts with an exclamation mark the account is locked. The shadow file is readable only by root, so getent needs sudo too.",
        },
      ],
    },
    u9: {
      title: "Who logged in",
      story: "An audit question came in, who last logged in to this box and when, and when was it last rebooted. w shows who is logged in right now and what they are running, while last shows the login and reboot history from the wtmp file. last reboot lists only the boot records.",
      task: "Run w and last reboot, and submit the day of the most recent boot.",
      hint: "`w` shows who is logged in right now and what they are running. `last` reads /var/log/wtmp, and `last reboot` lists only the boot records. The line that says still running is the current boot, and the date is on that line.",
      v: [
        {
          title: "Where did deploy log in from",
          story: "auth.log shows password attempts for the deploy account. The security team wants to know which IP the last successful login for this account came from.",
          task: "Use last to show only the login history of the deploy user and submit the IP address it came from.",
          hint: "`last user` filters the wtmp records for that user. The third column is the address the connection came from. Without a limit such as `last -n 5` you get the whole history.",
        },
        {
          title: "Boot time",
          story: "Monitoring claims the box restarted during the night. You want the exact time of the last boot in the quickest way possible.",
          task: "Show the last boot time with who -b and submit the hour and minute.",
          hint: "`who -b` gives only the last system boot line, while `last reboot` shows the whole boot history. Read the time together with the date on that line. uptime also tells you how long the box has been up, but then you have to work out the start time yourself.",
        },
      ],
    },
    u10: {
      title: "Delete the account",
      story: "Legal has approved it, ali's account will be removed completely. userdel on its own leaves the home directory behind, with -r the home directory and mail spool go too. Backing up the files before deleting is a sysadmin reflex.",
      task: "Delete the ali account together with its home directory.",
      hint: "`userdel` removes the account from the passwd, shadow and group files but leaves the home directory. `-r` removes the home directory and mail spool as well. There is no way back, take a backup first.",
      v: [
        {
          title: "Delete the intern",
          story: "Legal has approved it, the selin account will be removed completely together with its home directory.",
          task: "Delete the selin account together with its home directory.",
          hint: "`userdel -r` removes the account from the passwd, shadow and group files and also removes the home directory and mail spool. Without -r, /home/selin stays behind as an orphaned directory. Afterwards `getent passwd selin` should return nothing.",
        },
        {
          title: "Delete the account, keep the files",
          story: "emre's contract has ended and his account will be removed. But legal will review the files in his home directory, so the directory must not be deleted.",
          task: "Delete the emre account but keep the /home/emre directory, then check the directory with ls -ld.",
          hint: "`userdel` on its own only deletes the account and does not touch the home directory. If you add `-r` the files go too and there is no way back. `ls -ld` shows the directory itself, and on a real system the owner column now shows a uid instead of a name.",
        },
      ],
    },

    /* ---------- hw ---------- */
    hw1: {
      title: "Processor",
      story: "You just took delivery of a new virtual machine and will write a hardware summary into the technical documentation. lscpu shows the CPU model, core count, cache sizes and hypervisor on one screen. The same information in raw form is in /proc/cpuinfo.",
      task: "Look at the processor with lscpu and submit the core count.",
      hint: "`lscpu` gives a CPU summary, and the `CPU(s)` line is the number of logical CPUs the kernel sees. The thread and core lines explain how that number comes about. The same information is in raw form in the processor lines of /proc/cpuinfo.",
      v: [
        {
          title: "Hypervisor",
          story: "The licensing team wants to know whether this server is physical or virtual, and if virtual, which hypervisor it runs on. lscpu shows that too.",
          task: "Look at the processor with lscpu and submit the hypervisor vendor value.",
          hint: "The Virtualization features section of the `lscpu` output has a Hypervisor vendor line. On a physical machine this line does not appear at all. The same clue shows up as the word hypervisor in the flags line of /proc/cpuinfo.",
        },
        {
          title: "L3 cache",
          story: "Before the performance test the application team wants the L3 cache size, they will pick their tuning parameters based on it.",
          task: "Look at the processor with lscpu and submit the L3 cache size.",
          hint: "`lscpu` lists the L1d, L1i, L2 and L3 lines in the Caches section. L3 is the last level cache shared by all cores, and its instance count is usually the number of sockets. Give the value together with its unit.",
        },
      ],
    },
    hw2: {
      title: "Memory",
      story: "For total RAM free -h is enough, but the exact value the kernel sees is in /proc/meminfo, the MemTotal line in kilobytes. The application team wants the exact value.",
      task: "Submit the MemTotal value from /proc/meminfo in kB.",
      hint: "/proc/meminfo holds the kernel memory counters in kB, and you filter the line you want with `grep`. MemTotal is the total RAM the kernel can use, slightly less than the physical modules because the kernel reserves some for itself. `free -h` shows the same data in readable units but rounds it.",
      v: [
        {
          title: "Swap size",
          story: "The database team is asking for the total size of the swap space, they will estimate the OOM risk. The exact value is in /proc/meminfo.",
          task: "Submit the SwapTotal value from /proc/meminfo in kB.",
          hint: "`grep Swap /proc/meminfo` filters the swap related lines. SwapTotal is the total configured space, SwapFree is what is still free. The value is in kB, send it as is without converting the unit.",
        },
        {
          title: "Really free memory",
          story: "Monitoring alarms because MemFree is low, but Linux uses free RAM for cache. The amount actually available to new applications is on the MemAvailable line.",
          task: "Submit the MemAvailable value from /proc/meminfo in kB.",
          hint: "`grep Mem /proc/meminfo` returns the MemTotal, MemFree and MemAvailable lines. MemFree is RAM that has never been touched, MemAvailable is the usable amount including cache that can be reclaimed. Putting the alarm threshold on MemFree is a classic mistake.",
        },
      ],
    },
    hw3: {
      title: "Disks",
      story: "lsblk shows block devices as a tree, which disk, which partition, which mount point. -f adds the filesystem type, label and UUID, and when writing fstab you take the UUID from here. A USB disk that is plugged in but not mounted shows up too.",
      task: "List the disks with lsblk -f and submit the filesystem type of the partition mounted on /data.",
      hint: "`lsblk` draws block devices as a tree of disks and partitions. `-f` adds the FSTYPE, LABEL and UUID columns. Find the mount point in question in the MOUNTPOINTS column and look at the FSTYPE value on the same line.",
      v: [
        {
          title: "USB disk type",
          story: "The USB disk that came in from the field is plugged in but not mounted. Before mounting it you want to know which filesystem it was formatted with.",
          task: "List the disks with lsblk -f and submit the filesystem type of the sdc1 partition.",
          hint: "`lsblk -f` also shows unmounted partitions with their FSTYPE and LABEL. On the sdc1 line MOUNTPOINTS is empty, but FSTYPE is filled in. vfat means FAT32, compatible with Windows.",
        },
        {
          title: "UUID for fstab",
          story: "You will put the /data disk into fstab by UUID rather than device name, because when the disk order changes sdb can become sdc.",
          task: "List the disks with lsblk -f and submit the UUID of the partition mounted on /data.",
          hint: "`lsblk -f` adds the UUID column, find the /data line through the MOUNTPOINTS column. The UUID is assigned when the filesystem is created and stays the same even if the device name changes. Copy the value in full, including the hyphens.",
        },
      ],
    },
    hw4: {
      title: "BIOS tables",
      story: "Things like how many RAM slots there are and at what speed are read from the SMBIOS tables, not from the kernel. dmidecode is the tool for that, and it requires root because it reads /dev/mem. With -t you pick only the table you want, memory, system, bios, processor.",
      task: "Read the memory table with dmidecode and submit the Size value of the installed module.",
      hint: "`dmidecode` reads the SMBIOS tables and needs sudo because it accesses /dev/mem. `-t memory` shows only the memory tables, and the Memory Device block describes the installed module. Do not confuse it with Maximum Capacity in the Physical Memory Array block.",
      v: [
        {
          title: "Who is the manufacturer",
          story: "You need to enter the hardware manufacturer of every server into the inventory system. On a virtual machine this field gives away the hypervisor.",
          task: "Read the system table with dmidecode and submit the Manufacturer value.",
          hint: "`dmidecode -t system` gives the System Information block, and the Manufacturer and Product Name lines tell you the vendor and model. Reading SMBIOS needs sudo. On a physical server you would see Dell or HPE here.",
        },
        {
          title: "BIOS version",
          story: "A kernel bug shows up only on certain BIOSes. You will find out who made this machine's BIOS.",
          task: "Read the bios table with dmidecode and submit the Vendor value.",
          hint: "`dmidecode -t bios` shows the BIOS Information block, with Vendor, Version and Release Date lines. For a single field you can also use keywords such as `-s bios-version`. Without sudo /dev/mem cannot be read.",
        },
      ],
    },
    hw5: {
      title: "PCI and USB",
      story: "Which driver the network card uses is answered with lspci -k, there is a Kernel driver in use line under every device. lsusb lists USB devices, and -tv shows as a tree what is plugged into which port.",
      task: "Run lspci -k and lsusb -tv, and submit the kernel driver used by the Ethernet controller.",
      hint: "`lspci -k` writes the kernel driver in use under every PCI device. Look at the Kernel driver in use value under the Ethernet controller line. `lsusb -tv` shows USB devices as a port tree together with their drivers.",
      v: [
        {
          title: "Disk controller",
          story: "With a disk performance issue, the first question is which driver the SATA controller uses. lspci -k writes that under every device.",
          task: "Run lspci -k and submit the kernel driver used by the SATA controller.",
          hint: "`lspci -k` adds a Kernel driver in use line under every PCI device. Find the SATA controller line and look at the driver name right below it. You can narrow the output with `grep -A2 SATA`.",
        },
        {
          title: "USB disk identity",
          story: "You will record the brand of the USB disk that came in from the field in the inventory. lsusb gives the manufacturer name along with the vendor and product ID.",
          task: "Run lsusb and lsusb -tv, and submit the manufacturer of the Mass Storage device.",
          hint: "`lsusb` gives the ID and manufacturer name on each line, and the root hub lines are Linux Foundation. `-tv` shows in tree view which class and driver sit on which port, and usb-storage points to the disk. Read the manufacturer name from the first words after the ID.",
        },
      ],
    },
    hw6: {
      title: "Disk speed",
      story: "The database team says the disk is slow. hdparm -tT runs a simple read test, T for cached reads and t for real disk reads. Raw disk access requires root. -i gives the disk identity, model and firmware. When you suspect bad blocks badblocks -s is used, for SSDs smartctl is more meaningful.",
      task: "Run a read speed test on /dev/sda.",
      hint: "`hdparm -tT` runs two read tests, `-T` reads through the cache and `-t` does real reads from the disk. It needs sudo because it accesses the raw disk device. The test is a snapshot, run it a few times and look at the average.",
      v: [
        {
          title: "Data disk speed",
          story: "The database lives on /data, which means on the sdb disk. For the slowness complaint you will measure the actual data disk, not the root disk.",
          task: "Run a real disk read speed test on /dev/sdb.",
          hint: "`hdparm -t` bypasses the cache and measures the read speed from the disk, `-T` gives only the cache speed. Give the right device name and measure whichever disk /data is on. Raw disk access needs sudo.",
        },
        {
          title: "Disk model",
          story: "The supplier wants the disk model and firmware version. hdparm can also read the identity information the disk reports about itself.",
          task: "Read the identity information of /dev/sda with hdparm and submit the Model value.",
          hint: "`hdparm -i` shows the Model, FwRev and SerialNo fields the disk reports about itself. `-I` is a more detailed dump. It needs sudo because it accesses the raw device.",
        },
      ],
    },
    hw7: {
      title: "Partition table",
      story: "fdisk -l lists the partition table of every disk, disk size, sectors and disklabel type. gpt is modern, dos is the old MBR. If you open fdisk interactively with a device argument you can create partitions, pressing w on the wrong disk is a disaster, so look with -l first.",
      task: "List the partition tables with fdisk and submit the disklabel type of /dev/sda.",
      hint: "`fdisk -l` lists the partition table of every disk and needs sudo because it reads the raw disk. Each disk block has a Disklabel type line that says gpt or dos, and dos means the old MBR. Without -l fdisk opens interactively, and pressing w on the wrong disk is a disaster.",
      v: [
        {
          title: "Data disk table",
          story: "Before replacing the /data disk with a new 2 TB one you need to know the current partition table type. MBR cannot address anything beyond 2 TB.",
          task: "Use fdisk to list the partition table of /dev/sdb only and submit its disklabel type.",
          hint: "`fdisk -l /dev/sdb` lists only that disk, without a device you get all of them. On the Disklabel type line dos means the old MBR and gpt the modern table. Reading needs sudo too.",
        },
        {
          title: "USB partition type",
          story: "The USB disk must also open on Windows machines. The type code in the partition table tells you whether it will.",
          task: "List the partition table of /dev/sdc with fdisk and submit the Type value of the sdc1 partition.",
          hint: "`fdisk -l /dev/sdc` shows the Id and Type columns on the partition line. In dos tables Id is a single hex code and Type is its readable name. Without sudo the disk cannot be opened.",
        },
      ],
    },
    hw8: {
      title: "Space hunt",
      story: "The root disk is over 80 percent. df -hT shows this with filesystem types, and df -i shows inode usage, if you cannot create files while the disk looks free, the inodes have run out. For where the space is going, du -h --max-depth=1 sums it up per directory, and for single large files use find -size.",
      task: "Use find to locate the file larger than 20 KB under /var/log and submit its full path.",
      hint: "`df -hT` shows which filesystem is filling up, and `du -h --max-depth=1` shows where the space goes per directory. `find path -size +20k` finds the single large file, `+` means greater than and `k` means kilobytes. If you forget the unit, find counts 512 byte blocks and the result is confusing.",
      v: [
        {
          title: "Bloated debug log",
          story: "The SD-WAN agent under /opt was left in debug mode and one log file has ballooned. You will find which file it is and report it to TAC.",
          task: "Use find to locate the file larger than 30 KB under /opt/ion-agent and submit its full path.",
          hint: "First use `du -h --max-depth=1` to see which subdirectory is large. `find path -size +30k` lists files larger than 30 kilobytes, `+` means greater than and `k` kilobytes. If you forget the unit letter, find counts 512 byte blocks.",
        },
        {
          title: "Home quota",
          story: "Your home quota is almost full. There must be a large firmware file forgotten under ~/Downloads, and you will find it.",
          task: "Use find to locate the file larger than 40 KB under ~/Downloads and submit its full path.",
          hint: "`du -sh` shows the directory total and `--max-depth=1` the breakdown by subdirectory. Giving `find` the `-size +40k` test lists files larger than 40 kilobytes, `+` means greater than. When you submit, write the full path instead of ~.",
        },
      ],
    },
    hw9: {
      title: "Mount the USB disk",
      story: "The weekly backup is on a USB disk that shows up as /dev/sdc1 but is not mounted. mount works in the form device then mount point, and it requires root because it is a system wide operation. mount without arguments and findmnt list what is mounted.",
      task: "Mount the /dev/sdc1 partition on /mnt and list its contents.",
      hint: "`mount device target` attaches the partition to a directory and needs sudo because it is a system wide operation. The target directory must already exist. Then look at the contents with `ls` and at the mount with `findmnt`.",
      v: [
        {
          title: "Mount under media",
          story: "Desktop distributions mount removable disks under /media, and you will keep that convention. The target directory does not exist yet.",
          task: "Create the /media/usb directory, mount the /dev/sdc1 partition there and list its contents.",
          hint: "`mount` does not work without an existing target directory, so create it first with `mkdir -p`, and since /media is owned by root you need sudo. Then mount it with `mount device dir`. `findmnt /media/usb` confirms the mount.",
        },
        {
          title: "Mount read only",
          story: "The USB disk is evidence in an incident investigation, not a single byte may be written to it. You will mount the disk read only.",
          task: "Mount the /dev/sdc1 partition on /mnt read only and confirm with findmnt that it is ro.",
          hint: "`mount -o ro` mounts read only, and the kernel refuses to write to the disk. Multiple -o options are joined with commas. In `findmnt /mnt` you should see ro in the OPTIONS column.",
        },
      ],
    },
    hw10: {
      title: "Safe removal",
      story: "Unmount before removing the disk. The classic mistake is running umount while you are inside the mount point, and you get target is busy. lsof /mnt shows who is holding it, and once you cd out, umount works.",
      task: "Go into /mnt, see why umount refuses, then step out and unmount the disk properly.",
      hint: "If a shell has its cwd inside the mount point, the kernel considers the disk busy and umount says `target is busy`. Once you `cd` out, umount works. To see who else is holding it, use `lsof` or `fuser -m`.",
      v: [
        {
          title: "Busy disk",
          story: "A shell left over from an earlier session is still sitting in /media/usb. When you try to remove the disk, the kernel will consider it busy.",
          task: "You are now inside /media/usb. See why umount refuses, then step out and unmount the disk properly.",
          hint: "Check where you are with `pwd`, any process whose cwd is on the mount point keeps the disk busy. Once you leave with `cd /`, `umount` works. You can give umount the mount point instead of the device.",
        },
        {
          title: "Unmount by device name",
          story: "The disk is mounted on /mnt and you are inside it. This time you will give umount the device name instead of the mount point.",
          task: "You are now inside /mnt. Give umount /dev/sdc1, see the refusal, go back home and try again.",
          hint: "`umount` accepts the device name as well as the mount point, both resolve to the same mount. If the shell cwd is on the mount point you get target is busy. Step out with `cd ~` and try again, `lsof /mnt` shows who is holding it.",
        },
      ],
    },

    /* ---------- arch ---------- */
    ar1: {
      title: "Pack it up",
      story: "You will put the data directory into an archive as a single file. The tar letters are classic, c create, v verbose, f file. The archive name comes right after f, and the order matters. `tar cvf archive.tar dir` does no compression, only packing.",
      task: "In your home directory, pack the data directory as data.tar.",
      hint: "`tar` takes letter options, `c` creates an archive, `v` prints each file and `f` names the archive file. The archive name must come right after f, followed by the directory to pack. Change to your home directory first to use a relative path, so the paths inside the archive stay short.",
      v: [
        {
          title: "Capture bundle",
          story: "The packet captures you took for the TAC case are under ~/captures. You will upload them all to the case as a single file.",
          task: "In your home directory, pack the captures directory as captures.tar.",
          hint: "For `tar`, `c` means create, `v` print the files and `f` name the archive. The archive name comes right after f, followed by the directory to pack. If you change to your home directory first, the paths in the archive start with captures and do not carry the full path.",
        },
        {
          title: "nginx logs",
          story: "The web team wants a copy of the nginx logs. You will put the nginx directory under /var/log into an archive in /tmp.",
          task: "Pack the nginx directory under /var/log as /tmp/nginx-logs.tar.",
          hint: "First change to the parent directory with `cd /var/log`, then give the directory by its relative name so the paths in the archive start with nginx. You can give the archive name as a full path, after `f` it points into /tmp. /var/log is owned by root but readable, and /tmp is writable by everyone.",
        },
      ],
    },
    ar2: {
      title: "Look inside first",
      story: "Before extracting an archive, list its contents, t means list. This line is missing from your Mousepad notes, but it is the most important habit, an unknown tar file can scatter hundreds of files into your current directory.",
      task: "List the contents of data.tar without extracting it.",
      hint: "`tar t` lists the contents without extracting, and `f` again names the archive. Adding `v` also shows permissions, owner and size. Listing an unknown archive before extracting shows where its files will land.",
      v: [
        {
          title: "Vendor bundle",
          story: "TAC sent you a diagnostic bundle called ~/Downloads/ion-diag.tar. You will not extract it without knowing what it contains.",
          task: "List the contents of the ion-diag.tar archive without extracting it.",
          hint: "`tar tf archive` only lists and writes no files. Do not confuse it with `x`, x extracts. If the list starts with diag, everything unpacks into a single directory and does not scatter.",
        },
        {
          title: "Detailed listing",
          story: "Before extracting /tmp/nginx-logs.tar you want to see who owns the files and how big they are.",
          task: "List the nginx-logs.tar archive in detail and submit the owner of the files.",
          hint: "`tar tvf` adds permissions, owner and group, size and date to the listing, `v` means verbose. The owner column separates user and group with a slash. If you extract root owned files as a regular user, ownership passes to you.",
        },
      ],
    },
    ar3: {
      title: "Compress",
      story: "tar packs, gzip compresses. gzip file deletes the original and adds .gz, with -k the original is kept. To decompress use gunzip or gzip -d. zcat prints the contents to the screen without decompressing the file, perfect for the .gz versions of logs.",
      task: "Compress data.tar with gzip.",
      hint: "`gzip file` compresses the file, adds `.gz` and deletes the original. To keep the original you need `-k`. To decompress, `gunzip` or `gzip -d`.",
      v: [
        {
          title: "Keep the original",
          story: "You will upload ion-diag.tar to the TAC portal compressed, but you also want to keep the original tar, you will keep working on it.",
          task: "Compress ion-diag.tar with gzip without deleting the original.",
          hint: "By default `gzip` deletes the original and leaves a .gz in its place. `-k` means keep, the original file is preserved. Then compare the sizes of the two files with `ls -l`.",
        },
        {
          title: "Compress the debug log",
          story: "~/lab/sdwan-debug.log is taking up space. You will compress it and check the ratio, the original is not needed.",
          task: "Compress sdwan-debug.log with gzip, with verbose output.",
          hint: "`gzip -v` prints the compression ratio for each file. Since you did not give -k, the original is deleted and a .gz is left in its place. Text logs usually shrink by more than 80 percent.",
        },
      ],
    },
    ar4: {
      title: "In one go",
      story: "You combine the two steps with z, `tar czvf archive.tar.gz dir`. tar czf and tar zxvf from your Mousepad notes follow the same idea, the letter order does not matter, f just has to come right before the archive name. When you give an absolute path, tar strips the leading /, so that extracting does not overwrite the system.",
      task: "Archive the /etc/nginx directory as ~/etc-nginx.tar.gz with a single gzip command.",
      hint: "`z` runs the tar output through gzip, so the letters c, z, v and f pack and compress in one command. f goes last, followed immediately by the archive name. When you give an absolute path tar strips the leading /, the warning is normal.",
      v: [
        {
          title: "SSH config backup",
          story: "Before changing the sshd settings you will take a compressed backup of the /etc/ssh directory. A wrong setting could lock you out of the box.",
          task: "Archive the /etc/ssh directory as ~/ssh-config.tar.gz with a single gzip command.",
          hint: "If you give `z` together with `c`, tar runs its output through gzip and no separate gzip step is needed. `f` must be last, followed immediately by the archive name. With an absolute path tar strips the leading /, and that warning is normal.",
        },
        {
          title: "Web root backup",
          story: "Before updating the website content you will back up the /var/www/html directory. The archive should use the short .tgz extension.",
          task: "Archive the /var/www/html directory as ~/www-backup.tgz with a single gzip command.",
          hint: "`.tgz` and `.tar.gz` are the same thing, the extension is just a name. Compression comes from the `z` letter, not the extension, if you forget z you get a file named .tgz that is not compressed. f goes last, followed immediately by the archive name.",
        },
      ],
    },
    ar5: {
      title: "Extract elsewhere",
      story: "To extract an archive into a target directory instead of the current one, use -C. Extracting the config under /tmp/restore rather than over /etc and comparing is the safe way. Do not forget to list it with tar tzf first.",
      task: "Extract the etc-nginx.tar.gz archive into the /tmp/restore directory.",
      hint: "`x` extracts the archive, `z` decompresses gzip and `-C dir` sets the target directory. The target directory must already exist, otherwise tar fails. Without -C the files are extracted into your current directory.",
      v: [
        {
          title: "Compare the SSH backup",
          story: "Something went wrong after the sshd_config change. You will extract the backup under /tmp/ssh-restore, not over /etc, and examine the difference.",
          task: "Extract the ssh-config.tar.gz archive into the /tmp/ssh-restore directory.",
          hint: "`x` extracts, `z` decompresses gzip and `-C dir` sets the target. If the target directory does not exist tar fails, so create it first with `mkdir -p`. Then you can compare /etc/ssh/sshd_config with your extracted copy using `diff`.",
        },
        {
          title: "Extract a single file",
          story: "You do not need the whole web backup, you only want to see the old version of index.html.",
          task: "Extract only the var/www/html/index.html file from the www-backup.tgz archive into the /tmp/www-check directory.",
          hint: "If you put a path from the archive at the end of the tar command, only that member is extracted. The path must match how it appears in the archive, without the leading /, so if unsure look first with `tar tzf`. `-C` sets the target directory, and the directory must already exist.",
        },
      ],
    },
    ar6: {
      title: "Exclude",
      story: "You will archive the projects directory, but the README.md files should stay out. Files matched by --exclude pattern are skipped, and you can give it more than once. Changing to home with -C ~ and giving projects as a relative path keeps the paths inside the archive clean.",
      task: "Archive the projects directory as ~/projects.tgz, excluding .md files.",
      hint: "`--exclude=\"pattern\"` skips files matching the pattern, and the quotes stop the shell from expanding the pattern itself. `-C ~` changes to home first, so the relative directory you give enters the archive with a short path. Then use `tar tzf` to check that the unwanted files really stayed out.",
      v: [
        {
          title: "Exclude core dumps",
          story: "You will send the site logs to TAC, but ~/sitelogs contains .core crash dumps, each of them large. They must not go into the archive.",
          task: "Archive the sitelogs directory as ~/sitelogs.tgz, excluding .core files.",
          hint: "`--exclude=\"*.core\"` skips files matching the pattern, and the quotes stop the shell from expanding the asterisk itself. `-C ~` changes to home, then you give the directory by its relative name. Then use `tar tzf` to check that the .core files really stayed out.",
        },
        {
          title: "Exclude secrets and cache",
          story: "You will send the netbox-scripts directory to a colleague. It contains a .env file holding an API token and Python cache files, and neither should go.",
          task: "Archive the netbox-scripts directory as ~/netbox-scripts.tgz, excluding .env and .pyc files.",
          hint: "`--exclude` can be given more than once, each with its own pattern. Give the hidden file by its exact name and the cache files with a wildcard pattern. Putting a secret into an archive is the most common leak, so check the archive with `tar tzf` before sending it.",
        },
      ],
    },
    ar7: {
      title: "Read without extracting",
      story: "logrotate keeps old logs as .gz. To search inside them you do not need to decompress, zcat prints to the screen and you pipe it into grep. zgrep does the same in one command.",
      task: "Find the ERROR line in ~/old.log.gz without decompressing it.",
      hint: "`zcat` prints the compressed file to stdout without decompressing it and leaves no extracted copy on disk. Pipe the output into `grep` with `|` to filter the line you want. If you use `gunzip`, the file is decompressed for good and the .gz is gone.",
      v: [
        {
          title: "Look for link down",
          story: "Yesterday's WAN log was compressed by logrotate as ~/wan1.log.gz. You need to find the moment the link went down, without decompressing the file.",
          task: "Find the line containing `link down` in ~/wan1.log.gz without decompressing it.",
          hint: "`zcat` prints the compressed file to stdout without decompressing it and leaves no extracted copy on disk. Pipe the output into grep with `|`. Quote the phrase because it contains a space, otherwise grep takes the second word as a file name.",
        },
        {
          title: "Count the attempts",
          story: "Last week's auth log was archived as ~/auth.log.2.gz. You will count how many failed password attempts there were.",
          task: "Count the Failed password lines in ~/auth.log.2.gz without decompressing it.",
          hint: "`zcat` dumps the contents to stdout, and `grep -c` gives the number of matching lines instead of listing them. The pattern contains a space, so quotes are required. Had you used `gunzip`, the archive would have been decompressed for good.",
        },
      ],
    },
    ar8: {
      title: "zip for Windows",
      story: "Accounting cannot open tar.gz, they want zip. `zip -r archive.zip dir`, without -r it does not go into the directory. If you give a relative path, the paths in the archive stay short.",
      task: "Zip the webapp directory inside projects as ~/webapp.zip.",
      hint: "`zip -r archive.zip dir` descends into the directory recursively, without `-r` only an empty directory entry is added. First `cd` into the parent directory so the paths in the archive stay short. zip takes the archive name as its first argument, like f in tar.",
      v: [
        {
          title: "Report folder",
          story: "Management wants the Q3 uptime reports as a zip, they cannot open tar.gz on Windows. The reports are under ~/reports/q3.",
          task: "Zip the q3 directory inside reports as ~/q3.zip.",
          hint: "`zip -r` descends into the directory recursively, without -r only an empty directory entry is added. First change to the parent directory with `cd ~/reports`, so the paths in the archive start with q3. In zip the first argument is the archive name, the rest are what gets added.",
        },
        {
          title: "Selected files",
          story: "Accounting only wants the September and October invoice exports, the other files in ~/lab/exports are not going.",
          task: "Zip the fatura-09.csv and fatura-10.csv files in ~/lab/exports as ~/faturalar.zip.",
          hint: "When you give individual files you do not need `-r`, zip adds every file that comes after the archive name. First `cd` into the directory so the archive contains only the file names. Then you can check the contents with `unzip -l`.",
        },
      ],
    },
    ar9: {
      title: "unzip",
      story: "unzip -l lists, plain unzip extracts into the current directory, and with -d you give a target directory. It is the zip counterpart of t and -C in tar.",
      task: "List the contents of webapp.zip, then extract it into the /tmp/wa directory.",
      hint: "`unzip -l` lists the archive without extracting it. `-d dir` sets the target directory and creates it if needed. Without -d everything is extracted into your current directory.",
      v: [
        {
          title: "Open the reports",
          story: "You will extract q3.zip under /tmp to check it. Make it a habit to look at what is inside first.",
          task: "List the contents of q3.zip, then extract it into the /tmp/q3 directory.",
          hint: "`unzip -l` lists the archive without extracting it. `-d dir` sets the target, and if the directory does not exist unzip creates it. Without -d everything is extracted into your current directory.",
        },
        {
          title: "Vendor docs",
          story: "Along with the new firmware the vendor sent ~/Downloads/ion-docs.zip. You will look at the contents and extract it into an ion-docs directory under your home.",
          task: "List the contents of ion-docs.zip, then extract it into the ~/ion-docs directory.",
          hint: "Look first with `unzip -l` to see whether the archive keeps its files inside a top level directory or flat. `-d ~/ion-docs` gives the target directory and creates it if needed. If you extract a flat archive without -d, the files scatter across Downloads.",
        },
      ],
    },
  },
  quiz: {
    "Bash'te $# neyi verir?": { q: "What does $# give you in Bash?", a: ["The number of arguments", "The last exit code", "The script PID", "The line number"] },
    "[ -s dosya ] ne test eder?": { q: "What does `[ -s file ]` test?", a: ["The file exists and is not empty", "The file is a symlink", "The file is writable", "The file is a socket"] },
    "while read l; do ...; done < dosya ne yapar?": { q: "What does `while read l; do ...; done < file` do?", a: ["Reads the file line by line", "Writes to the file", "Copies the file", "Enters an infinite loop"] },
    "$((5 % 2)) sonucu nedir?": { q: "What is the result of `$((5 % 2))`?", a: ["1", "2", "2.5", "0"] },
    "Fonksiyondan değer döndürmek için?": { q: "How do you return a value from a function?", a: ["return N gives an exit code, use echo for text", "yield", "export", "send"] },
    "crontab satırı 0 3 * * 1 ne zaman çalışır?": { q: "When does the crontab line `0 3 * * 1` run?", a: ["Every Monday at 03.00", "Every day at 03.00", "On the 1st of every month at 03.00", "At the top of every hour"] },
    "Vim'de kaydetmeden çıkmak için?": { q: "How do you quit Vim without saving?", a: ["`:q!`", "`:wq`", "ZZ", "`:x`"] },
    "Vim'de bulunduğun satırı silen komut?": { q: "Which Vim command deletes the current line?", a: ["dd", "x", "D", "rm"] },
    "Vim'de dosyanın tamamında değiştirme?": { q: "How do you replace across the whole file in Vim?", a: ["`:%s/a/b/g`", "`:s/a/b/`", "/a/b", "`:replace a b`"] },
    "Vim'de yazmaya başlamak için hangi tuş insert moda geçirir?": { q: "Which key switches Vim to insert mode so you can start typing?", a: ["i", "w", "e", "Enter"] },
  },
});
