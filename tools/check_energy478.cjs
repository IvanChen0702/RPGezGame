const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('tools/planning/auto_corrections477.gs','utf8');
let spec;
{const c={};vm.createContext(c);vm.runInContext(source+';globalThis.spec=PLANNING_CORRECTIONS477',c);spec=JSON.parse(JSON.stringify(c.spec));}
function fixture(){
 let writes=0,released=0,failAt=0;
 class Sheet{
  constructor(name,rows){this.name=name;this.rows=structuredClone(rows);this.formulas={};}
  getName(){return this.name;}setName(n){delete book.sheets[this.name];this.name=n;book.sheets[n]=this;return this;}
  copyTo(){const n=new Sheet('Copy '+this.name,this.rows);book.sheets[n.name]=n;return n;}
  getDataRange(){return this.getRange(1,1,this.rows.length,this.rows[0].length);}
  getMaxRows(){return 1000;}insertRowsAfter(){}
  getRange(row,col,n=1,m=1){const sh=this;return {
   getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>sh.rows[row+i-1]?.[col+j-1]??'')),
   getFormulas:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>sh.formulas[(row+i)+','+(col+j)]||'')),
   getValue:()=>sh.rows[row-1][col-1],getFormula:()=>sh.formulas[row+','+col]||'',
   setValue(v){if(failAt&&writes+1===failAt)throw Error('simulated timeout');writes++;sh.rows[row-1][col-1]=v;},
   setValues(values){writes++;values.forEach((r,i)=>{sh.rows[row+i-1]||=[];r.forEach((v,j)=>sh.rows[row+i-1][col+j-1]=v);});}
  };}
 }
 const book={sheets:{},getId:()=> 'test-book',getName:()=> 'test planning',getSheetByName(n){return this.sheets[n];}};
 const rows=(headers,list)=>[headers,...list.map(r=>headers.map(h=>r[h]??''))];
 book.sheets.QuestDialogues=new Sheet('QuestDialogues',rows(['Text','QuestID','DialogueID','Expression'],[...spec.dialogues].reverse().map(r=>({...r,Text:r.before,Expression:'basic'})).concat([{DialogueID:'untouched',QuestID:'other',Text:'keep',Expression:'happy'}])));
 book.sheets.QuestObjectives=new Sheet('QuestObjectives',rows(['Quantity','MinEnhance','QuestID','ObjectiveID','Type','TargetID','Slot','Enabled'],spec.objectives));
 book.sheets.MistConfig=new Sheet('MistConfig',[['Value','Description','Key'],[true,'unchanged','Enabled']]);
 book.sheets.QuestDialogues.formulas['2,4']='=UNCHANGED()';
 const c={ss_:()=>book,SpreadsheetApp:{flush(){}},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){released++;}})},Utilities:{formatDate:()=> 'date',getUuid:()=> 'unique-'+Object.keys(book.sheets).length},console:{log(){},error(){}}};
 vm.createContext(c);vm.runInContext(source,c);
 return {c,book,get writes(){return writes;},get released(){return released;},set failAt(n){failAt=n;}};
}

const energySource=fs.readFileSync('tools/planning/auto_energy478.gs','utf8');
const setup=()=>{const f=fixture();f.book.sheets.MistConfig.rows=[['Key','Value','Description'],['EnergyCap',10,'keep'],['EnergyRecoveryMinutes',60,'keep'],['EnergyInitial',10,'keep']];vm.runInContext(energySource,f.c);return f;};
let f=setup();assert.equal(f.c.applyMistEnergy478().updated,3);assert.equal(f.c.applyMistEnergy478().updated,0);
assert.deepEqual(f.book.sheets.MistConfig.rows.map(r=>r[1]),['Value',20,30,20]);
f=setup();f.book.sheets.MistConfig.rows[1][1]=40;assert.throws(()=>f.c.applyMistEnergy478());assert.equal(f.writes,0);
f=setup();f.failAt=2;assert.throws(()=>f.c.applyMistEnergy478());f.failAt=0;assert.equal(f.c.applyMistEnergy478().updated,2);
console.log('Energy478 sheet helper: backup, exact three values, conflict abort, repeat and interrupted retry passed');
