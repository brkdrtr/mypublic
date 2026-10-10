'use strict';
/* Linux Lab, her gorevin cozumu gercekten gorevi tamamliyor mu. node tests/linux.test.js */
const path=require('path');const {Shell}=require(path.join(__dirname,'../linux-lab/shell.js'));
global.Shell=Shell;
const {CHAPTERS,QUIZ,BADGES}=require(path.join(__dirname,'../linux-lab/missions.js'));
const sh=new Shell(); let fails=0;
for(const c of CHAPTERS) for(const m of c.missions){
  if(m.setup) m.setup(sh);
  let passed=false;
  for(const line of m.solution.split('\n')){
    if(line.startsWith('nano ')){
      if(m.id==='r6') sh.writeFile('/home/burak/lab/notlar.txt', sh.node('/home/burak/lab/notlar.txt').d+'nano calisiyor\n');
      if(m.id==='s6') sh.writeFile('/home/burak/scripts/backup.sh','mkdir -p ~/backup\ncp ~/notes.txt ~/backup/\n');
      if(m.check(sh,{line:'nano',out:'',submit:null})) passed=true; continue;
    }
    const r=sh.run(line); const out=r.chunks.filter(x=>x.cls!=='err').map(x=>x.text).join('');
    if(m.check(sh,{line,out,submit:r.ui.submit??null})) passed=true;
  }
  if(!passed){fails++;console.log('FAIL',m.id);}
}
console.log("fails",fails,"quiz",QUIZ.length,"badges",BADGES.length);process.exit(fails?1:0);
