/** Paste alongside the existing maintenance script, run once before the next
 * planning publish. Reads only the six approved roadside chest keys from the current
 * published package and adds missing Sheet rows. Does not publish or change
 * existing designer values, players, credentials, schedules or other sheets. */
function syncMistRoadChests492(){
 const keys=['RoadChestCap','RoadChestRespawnMinutes','RoadChestLegendaryPercent','RoadChestRandomPercent','RoadChestTrapPercent','RoadChestTrapHpPercent'];
 const pkg=publishedPlanningPackage_(true),source=pkg?.data?.MistConfig||[];
 const rows=keys.map(k=>source.find(r=>r.Key===k));
 if(rows.some(r=>!r))throw Error('正式企劃尚未包含 492 路邊寶箱設定，未修改試算表。');
 const sh=ss_().getSheetByName('MistConfig');if(!sh)throw Error('找不到 MistConfig 工作表。');
 const values=sh.getDataRange().getValues(),headers=values[0],ki=headers.indexOf('Key'),vi=headers.indexOf('Value');
 if(ki<0||vi<0)throw Error('MistConfig 缺少 Key／Value 欄位。');
 const present=new Set(values.slice(1).map(r=>String(r[ki]))),missing=rows.filter(r=>!present.has(r.Key));
 if(missing.length)sh.getRange(sh.getLastRow()+1,1,missing.length,headers.length).setValues(missing.map(r=>headers.map(h=>r[h]??'')));
 SpreadsheetApp.flush();return {ok:true,added:missing.map(r=>r.Key),published:false};
}
