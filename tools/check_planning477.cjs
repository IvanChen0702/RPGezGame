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
let f=fixture(),before=structuredClone(f.book.sheets.QuestObjectives.rows);
assert.equal(f.c.previewPlanningCorrections477().dialoguesToUpdate,44);assert.equal(f.writes,0);
let r=f.c.applyPlanningCorrections477();assert.equal(r.updatedDialogues,44);assert.equal(r.addedFlagKeys,3);assert.equal(r.backups.length,2);assert.deepEqual(f.book.sheets.QuestObjectives.rows,before);
assert.equal(f.book.sheets.QuestDialogues.formulas['2,4'],'=UNCHANGED()');
assert.equal(f.book.sheets.QuestDialogues.rows.at(-1)[0],'keep');
const count=f.writes;assert.equal(f.c.applyPlanningCorrections477().dialoguesAlreadyUpdated,44);assert.equal(f.writes,count);
for(const mutate of [
 f=>f.book.sheets.QuestDialogues.rows[1][0]='designer edit',
 f=>f.book.sheets.QuestDialogues.rows.push([...f.book.sheets.QuestDialogues.rows[1]]),
 f=>f.book.sheets.QuestDialogues.rows.splice(1,1),
 f=>f.book.sheets.QuestDialogues.formulas['2,1']='=TEXT()',
 f=>f.book.sheets.QuestObjectives.rows[1][0]=999,
 f=>f.book.sheets.QuestObjectives.rows.push([...f.book.sheets.QuestObjectives.rows[1]]),
 f=>f.book.sheets.MistConfig.rows.push([999,'custom','FlagScoreMinutes'])
]){f=fixture();mutate(f);assert.throws(()=>f.c.applyPlanningCorrections477());assert.equal(f.writes,0);assert.equal(Object.keys(f.book.sheets).length,3);assert.equal(f.released,1);}
f=fixture();f.failAt=10;assert.throws(()=>f.c.applyPlanningCorrections477(),/simulated timeout/);assert.equal(f.writes,9);assert.equal(f.released,1);
f.failAt=0;r=f.c.applyPlanningCorrections477();assert.equal(r.updatedDialogues,35);assert.equal(r.dialoguesAlreadyUpdated,44);assert.equal(f.c.previewPlanningCorrections477().dialoguesToUpdate,0);
console.log('PASS: preview read-only, reordered rows/columns, 44 exact text updates, 3 config keys, backups, untouched cells/formulas/conditions, conflict aborts, repeat and interrupted retry, lock release');
