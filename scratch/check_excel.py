import openpyxl

wb = openpyxl.load_workbook(r"E:\downloads chrome\sample-inventory.xlsx")
ws = wb.active

headers = []
for cell in ws[1]:
    headers.append(cell.value)

print("Existing Headers:", headers)
