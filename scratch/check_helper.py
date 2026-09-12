import openpyxl

wb = openpyxl.load_workbook(r"E:\downloads chrome\sample-inventory.xlsx")
ws = wb.active

for col in ['AO', 'AQ']:
    print(f"Col {col}:", [ws[f"{col}{i}"].value for i in range(1, 6)])
