import openpyxl

wb = openpyxl.load_workbook(r"E:\downloads chrome\sample-inventory.xlsx")
ws = wb.active

print("Data Validations:")
for dv in ws.data_validations.dataValidation:
    print(dv.sqref, dv.formula1)
