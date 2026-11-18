/** Run once after installing maintenance482. Does not publish or touch player saves. */
function removeRetiredMode482() {
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try {
  const ss=typeof ss_==='function'?ss_():SpreadsheetApp.getActiveSpreadsheet();
  const source=ss.getSheetByName('BoxingSeasons_SCHEMA');
  let rewards=ss.getSheetByName('MistRankRewards');
  if(!rewards||rewards.getLastRow()<2){
   if(!source)throw Error('缺少 MistRankRewards，請先從目前發布企劃取得獎勵設定。');
   const rows=source.getDataRange().getValues(),header=rows[0].map(String),at=header.indexOf('SeasonID');
   const row=rows.find((r,i)=>i>0&&r[at]==='2026-W42');if(!row)throw Error('找不到目前沿用的獎勵設定，未執行清理。');
   const indices=header.map((k,i)=>k.indexOf('Rank')===0?i:-1).filter(i=>i>=0);
   if(!indices.length)throw Error('獎勵欄位不存在，未執行清理。');
   if(!rewards)rewards=ss.insertSheet('MistRankRewards');
   rewards.getRange(1,1,2,indices.length).setValues([indices.map(i=>header[i]),indices.map(i=>row[i])]);rewards.setFrozenRows(1);
  }
  const deletedSheets=[],deletedTriggers=[];
  for(const t of ScriptApp.getProjectTriggers())if(/boxing/i.test(t.getHandlerFunction())){deletedTriggers.push(t.getHandlerFunction());ScriptApp.deleteTrigger(t);}
  for(const sh of ss.getSheets())if(/boxing/i.test(sh.getName())){deletedSheets.push(sh.getName());ss.deleteSheet(sh);}
  const config=ss.getSheetByName('GameConfig');
  if(config){const rows=config.getDataRange().getValues(),ki=rows[0].indexOf('Key');if(ki<0)throw Error('GameConfig 缺少 Key');for(let i=rows.length-1;i>0;i--)if(/boxing/i.test(String(rows[i][ki])))config.deleteRow(i+1);}
  const mist=ss.getSheetByName('MistConfig');if(mist){const rows=mist.getDataRange().getValues(),ki=rows[0].indexOf('Key'),vi=rows[0].indexOf('Value');for(let i=1;i<rows.length;i++)if(rows[i][ki]==='RewardTemplate')mist.getRange(i+1,vi+1).setValue('MistRankRewards');}
  const props=PropertiesService.getScriptProperties();for(const k of Object.keys(props.getProperties()))if(/boxing/i.test(k))props.deleteProperty(k);
  SpreadsheetApp.flush();
  return {ok:true,deletedSheets,deletedTriggers,published:false,note:'僅能刪除目前執行者的觸發器；其他擁有者須各執行一次。完成後可移除這個一次性函式。'};
 } finally {lock.releaseLock();}
}
