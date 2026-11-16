/** Add to the existing planning Apps Script and run applyMistEnergy478 once.
 * Only edits three MistConfig values. Backs up first; never publishes or resets players.
 * Pause manual sheet editing while applying. No web-app redeployment needed.
 */
function applyMistEnergy478(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(30000))throw Error('其他維護作業執行中');
 try{
  const book=typeof ss_==='function'?ss_():SpreadsheetApp.getActiveSpreadsheet();
  const sheet=book&&book.getSheetByName('MistConfig');if(!sheet)throw Error('缺少 MistConfig');
  const range=sheet.getDataRange(),rows=range.getValues(),formulas=range.getFormulas(),headers=rows[0].map(x=>String(x).trim());
  for(const key of ['Key','Value'])if(headers.filter(x=>x===key).length!==1)throw Error('欄位缺少或重複：'+key);
  const ki=headers.indexOf('Key'),vi=headers.indexOf('Value'),changes=[];
  for(const [key,before,value] of [['EnergyInitial',10,20],['EnergyCap',10,20],['EnergyRecoveryMinutes',60,30]]){
   const matches=rows.map((r,i)=>i>0&&String(r[ki])===key?i:-1).filter(i=>i>0);
   if(matches.length!==1)throw Error('設定缺少或重複：'+key);
   const i=matches[0];if(formulas[i][vi])throw Error('設定含公式，未修改：'+key);
   if(Number(rows[i][vi])===value)continue;
   if(Number(rows[i][vi])!==before)throw Error('設定已有不同修訂，未修改：'+key);
   changes.push({i,key,before:rows[i][vi],value});
  }
  let backup=null;
  if(changes.length){
   backup='_backup478_MistConfig_'+Utilities.formatDate(new Date(),'Asia/Taipei','yyyyMMdd_HHmmss')+'_'+Utilities.getUuid().slice(0,8);
   sheet.copyTo(book).setName(backup);SpreadsheetApp.flush();
   if(JSON.stringify(sheet.getDataRange().getValues())!==JSON.stringify(rows)||JSON.stringify(sheet.getDataRange().getFormulas())!==JSON.stringify(formulas))throw Error('備份期間內容改變，尚未修改');
   for(const p of changes){const cell=sheet.getRange(p.i+1,vi+1);if(cell.getFormula()||cell.getValue()!==p.before)throw Error('寫入前設定已變更：'+p.key);cell.setValue(p.value);}
   SpreadsheetApp.flush();
   for(const p of changes)if(Number(sheet.getRange(p.i+1,vi+1).getValue())!==p.value)throw Error('寫入核對未通過：'+p.key);
  }
  const result={ok:true,updated:changes.length,backup,published:false,note:'初始／上限 20，每 30 分鐘恢復 1 點；已更新者會略過。'};
  console.log(JSON.stringify(result));return result;
 }finally{lock.releaseLock();}
}
