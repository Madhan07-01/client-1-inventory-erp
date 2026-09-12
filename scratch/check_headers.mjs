import * as XLSX from "xlsx";

function getHeaders() {
  const workbook = XLSX.readFile('Book1- inventory.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const headers = [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = { c: C, r: range.s.r };
    const cellRef = XLSX.utils.encode_cell(cellAddress);
    const cell = sheet[cellRef];
    if (cell && cell.v) {
      headers.push(cell.v);
    }
  }
  
  console.log("Headers:", headers);
  
  // Also print the first 2 rows of data to see formatting
  const data = XLSX.utils.sheet_to_json(sheet).slice(0, 2);
  console.log("Sample Data:", data);
}

getHeaders();
