/**
 * Optional integration helper for the EXISTING planning spreadsheet.
 * Does not publish planning, change dialogue values or write player data.
 * The currently deployed Apps Script was not supplied; merge its Expression
 * enum validation with these same nine values before the next publication.
 */
function installQuestExpressionOptions447() {
  const options = ['basic', 'angry', 'happy', 'shy', 'sly', 'deadpan', 'surprised', 'worried', 'serious'];
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const dialogues = book.getSheetByName('QuestDialogues');
  const npcs = book.getSheetByName('QuestNPCs');
  if (!dialogues || !npcs) throw new Error('QUEST_SHEETS_MISSING');
  const headers = dialogues.getRange(1, 1, 1, dialogues.getLastColumn()).getValues()[0];
  const expression = headers.indexOf('Expression') + 1;
  const npcRows = npcs.getDataRange().getValues();
  const npcId = npcRows[0].indexOf('NPCID'), expressions = npcRows[0].indexOf('Expressions');
  if (!expression || npcId < 0 || expressions < 0) throw new Error('QUEST_EXPRESSION_COLUMNS_MISSING');
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(options, true).setAllowInvalid(false)
    .setHelpText('deadpan 無言、surprised 驚訝、worried 擔心、serious 認真').build();
  if (dialogues.getMaxRows() > 1) dialogues.getRange(2, expression, dialogues.getMaxRows() - 1, 1).setDataValidation(rule);
  for (let i = 1; i < npcRows.length; i++) {
    if (!['lily', 'xi', 'kazama', 'yexian'].includes(npcRows[i][npcId])) continue;
    const old = String(npcRows[i][expressions] || '').split(',').map(x => x.trim()).filter(Boolean);
    npcs.getRange(i + 1, expressions + 1).setValue([...new Set(old.concat(options))].join(','));
  }
}
