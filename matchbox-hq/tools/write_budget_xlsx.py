#!/usr/bin/env python3
"""Writes Kaadepetis_Budget.xlsx from the live ledger and budget state."""
import json, os, sys
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = lambda n: json.load(open(os.path.join(ROOT, 'state', n + '.json')))
ledger, budget = S('ledger'), S('budget')

OLIVE = 'FF565C38'; MUSTARD = 'FF9C7328'; CREAM = 'FFF2E9D8'; CORK = 'FFC39A63'
head = Font(bold=True, color='FFFFFFFF', size=11)
thin = Border(*[Side(style='thin', color='FFD8C7B0')]*4)

wb = Workbook()

def style_header(ws, row, fill):
    for c in ws[row]:
        if c.value is not None:
            c.font = head; c.fill = PatternFill('solid', fgColor=fill)
            c.alignment = Alignment(vertical='center')

# ── Ledger ──────────────────────────────────────────────────────────
ws = wb.active; ws.title = 'Ledger'
ws.append(['Date', 'In / Out', 'Amount (Rs)', 'Reason', 'Entered by', 'Balance after'])
style_header(ws, 1, OLIVE)
added = sum(e['amount'] for e in ledger['entries'] if e['type'] == 'in')
spent = sum(e['amount'] for e in ledger['entries'] if e['type'] == 'out')
run = ledger['opening']
rows = list(reversed(ledger['entries']))          # oldest first so the balance builds
out = []
for e in rows:
    run += e['amount'] if e['type'] == 'in' else -e['amount']
    out.append([e['date'][:10], 'IN' if e['type'] == 'in' else 'OUT',
                e['amount'], e['reason'], e.get('by', 'founder'), run])
for r in reversed(out):                            # newest first for reading
    ws.append(r)
if not out:
    ws.append(['—', '—', 0, 'Nothing spent yet. Opening capital Rs %s.' % f"{ledger['opening']:,}",
               '—', ledger['opening']])
for w, col in zip([13, 10, 14, 52, 13, 15], 'ABCDEF'):
    ws.column_dimensions[col].width = w
for row in ws.iter_rows(min_row=2):
    for c in row:
        c.border = thin
        if c.column_letter in ('C', 'F'): c.number_format = '#,##0'

# ── Summary ─────────────────────────────────────────────────────────
ws2 = wb.create_sheet('Summary')
ws2.append(['What', 'Amount (Rs)'])
style_header(ws2, 1, MUSTARD)
for label, val in [('Opening capital', ledger['opening']), ('Money added since', added),
                   ('Actually spent', spent), ('Still in pocket', ledger['opening'] + added - spent)]:
    ws2.append([label, val])
ws2.append([])
ws2.append(['Planned (not yet spent)', 'Amount (Rs)'])
style_header(ws2, ws2.max_row, CORK)
for l in budget['lines']:
    ws2.append([l['item'], l['planned']])
ws2.append(['TOTAL PLANNED', sum(l['planned'] for l in budget['lines'])])
ws2['A%d' % ws2.max_row].font = Font(bold=True)
ws2.column_dimensions['A'].width = 42; ws2.column_dimensions['B'].width = 16
for row in ws2.iter_rows(min_row=2):
    for c in row:
        if c.column_letter == 'B' and isinstance(c.value, (int, float)): c.number_format = '#,##0'

# ── Unit economics ──────────────────────────────────────────────────
ws3 = wb.create_sheet('Unit economics')
ws3.append(['Per box', 'Low', 'Mid', 'High', 'Note'])
style_header(ws3, 1, OLIVE)
for r in [['Plain match tray', 4.0, 4.5, 5.0, 'Bought in bulk once, reused every drop'],
          ['Printed outer box', 8.0, 11.0, 15.0, 'New artwork each drop'],
          ['Inbound freight share', 1.5, 2.5, 3.0, 'Flat cost spread over the tray order'],
          ['LANDED COST', 13.5, 18.0, 23.0, 'What one box costs before delivery'],
          [], ['Sell at Rs 99', '', '', '', ''],
          ['Instagram, hand-delivered', 85.5, 78.0, 73.0, 'Best channel by far'],
          ['Cafe wholesale at Rs 60', 46.5, 30.0, 25.0, ''],
          ['Website + Pune rider', 35.5, 18.7, 13.0, 'Rider costs about Rs 45'],
          [], ['Break-even boxes at Rs 99', 171, 204, 265, 'Of a 300-box Drop 01'],
          ['Drop 02 (trays already paid)', '', 11.0, '', 'Break-even falls to 73 boxes']]:
    ws3.append(r)
ws3.column_dimensions['A'].width = 30; ws3.column_dimensions['E'].width = 44
for col in 'BCD': ws3.column_dimensions[col].width = 10
for row in ws3.iter_rows(min_row=2):
    for c in row:
        if c.column_letter in 'BCD' and isinstance(c.value, (int, float)): c.number_format = '#,##0.00'
ws3['A5'].font = Font(bold=True); ws3['A11'].font = Font(bold=True)

path = os.path.join(ROOT, 'vendors', 'Kaadepetis_Budget.xlsx')
wb.save(path)
print('wrote', path, '| entries:', len(ledger['entries']))
