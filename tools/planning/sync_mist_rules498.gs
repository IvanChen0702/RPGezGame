/** Sync only the seven approved 498 keys from the published package into MistConfig.
 * Updates existing values too; does not publish or modify players/schedules. */
function syncMistRules498(){
 const keys=['SupplyVisionRadius','AirdropIntervalHours','RoadChestRandomExcludeLegendary','RoadChestLegendaryPercent','RoadChestRandomPercent','RoadChestTrapPercent','ExcludedEquipmentIDs'];
 const pkg=publishedPlanningPackage_(true),source=pkg?.data?.MistConfig||[];
 const rows=keys.map(k=>source.find(r=>r.Key===k));
 if(rows.some(r=>!r))throw Error('正式企劃尚未包含 498 迷霧設定，未修改試算表。');
 const sh=ss_().getSheetByName('MistConfig');if(!sh)throw Error('找不到 MistConfig 工作表。');
 const values=sh.getDataRange().getValues(),headers=values[0],ki=headers.indexOf('Key'),vi=headers.indexOf('Value');
 if(ki<0||vi<0)throw Error('MistConfig 缺少 Key／Value 欄位。');
 const present=new Set(values.slice(1).map(r=>String(r[ki]))),missing=rows.filter(r=>!present.has(r.Key));
 if(missing.length)sh.getRange(sh.getLastRow()+1,1,missing.length,headers.length).setValues(missing.map(r=>headers.map(h=>r[h]??'')));
 const updated=[];for(const row of rows){const index=values.findIndex((r,i)=>i>0&&String(r[ki])===row.Key);if(index>0&&String(values[index][vi])!==String(row.Value)){sh.getRange(index+1,vi+1).setValue(row.Value);updated.push(row.Key);}}
 SpreadsheetApp.flush();return {ok:true,added:missing.map(r=>r.Key),updated,published:false};
}
