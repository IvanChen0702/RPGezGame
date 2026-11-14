"""Add the four NPC expression choices to a planning workbook without publishing it.

Usage: python tools/update_quest_expressions447.py INPUT.xlsx OUTPUT.xlsx
Requires openpyxl. Never overwrites the input workbook.
"""
from pathlib import Path
import argparse
from openpyxl import load_workbook
from openpyxl.comments import Comment
from openpyxl.worksheet.cell_range import CellRange
from openpyxl.worksheet.datavalidation import DataValidation

EXPRESSIONS = ('basic', 'angry', 'happy', 'shy', 'sly', 'deadpan', 'surprised', 'worried', 'serious')
LABELS = ('一般', '生氣', '開心', '害羞', '狡黠', '無言', '驚訝', '擔心', '認真')


def update(source, destination):
    source, destination = Path(source), Path(destination)
    if source.resolve() == destination.resolve():
        raise ValueError('輸出必須使用新檔名，避免覆蓋原始企劃表')
    workbook = load_workbook(source)
    npcs, dialogues = workbook['QuestNPCs'], workbook['QuestDialogues']
    npc_columns = {cell.value: cell.column for cell in npcs[1]}
    columns = {cell.value: cell.column for cell in dialogues[1]}
    expression_column = columns['Expression']
    for row in range(2, npcs.max_row + 1):
        if npcs.cell(row, npc_columns['NPCID']).value not in ('lily', 'xi', 'kazama', 'yexian'):
            continue
        cell = npcs.cell(row, npc_columns['Expressions'])
        existing = [part.strip() for part in str(cell.value or '').split(',') if part.strip()]
        cell.value = ','.join(dict.fromkeys([*existing, *EXPRESSIONS]))

    # Replace validation only in the Expression column, preserving other columns.
    for validation in list(dialogues.data_validations.dataValidation):
        for area in list(validation.sqref.ranges):
            if not area.min_col <= expression_column <= area.max_col:
                continue
            validation.sqref.remove(area)
            if area.min_col < expression_column:
                validation.sqref.add(CellRange(min_col=area.min_col, max_col=expression_column - 1, min_row=area.min_row, max_row=area.max_row))
            if area.max_col > expression_column:
                validation.sqref.add(CellRange(min_col=expression_column + 1, max_col=area.max_col, min_row=area.min_row, max_row=area.max_row))
        if not validation.sqref:
            dialogues.data_validations.dataValidation.remove(validation)
    validation = DataValidation(type='list', formula1='"' + ','.join(EXPRESSIONS) + '"', allow_blank=True)
    validation.showDropDown = False  # OOXML true hides the dropdown arrow.
    validation.showErrorMessage = True
    validation.errorStyle = 'stop'
    validation.errorTitle = '請選擇支援的表情'
    validation.error = '請使用下拉選單中的九種表情代碼。'
    validation.showInputMessage = True
    validation.promptTitle = 'NPC 表情'
    validation.prompt = '新增：deadpan 無言、surprised 驚訝、worried 擔心、serious 認真。'
    dialogues.add_data_validation(validation)
    validation.add(CellRange(min_col=expression_column, max_col=expression_column, min_row=2, max_row=max(5000, dialogues.max_row + 1000)))
    header = dialogues.cell(1, expression_column)
    note = '\n'.join(f'{key}：{label}' for key, label in zip(EXPRESSIONS, LABELS))
    previous = header.comment.text + '\n\n' if header.comment else ''
    if note not in previous:
        header.comment = Comment(previous + note, 'RPGezGame')
    destination.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(destination)
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input')
    parser.add_argument('output')
    args = parser.parse_args()
    print(update(args.input, args.output))
