import * as XLSX from 'xlsx';

const data = [
  {
    "Product SKU / Size": "M20/70",
    "Warehouse": "MADEENA MAIN",
    "Location / Rack": "BAY 1",
    "Type": "IN",
    "Quantity": 50,
    "Lot Number": "LOT-001",
    "Brand": "TVS",
    "Supplier": "ABC Fasteners",
    "Purchase Date": "2024-05-01",
    "Purchase Rate": 15.50,
    "Purchase Ref": "INV-8899",
    "Grade": "8.8",
    "Thread": "Half Thread",
    "Finish": "Zinc",
    "Custom Spec 1": "",
    "Hide Spec 1": "No",
    "Custom Spec 2": "",
    "Hide Spec 2": "No",
    "Custom Spec 3": "",
    "Hide Spec 3": "No",
    "Category": "New",
    "Remarks": "Initial Stock"
  },
  {
    "Product SKU / Size": "M20/75",
    "Warehouse": "MADEENA MAIN",
    "Location / Rack": "BAY 1",
    "Type": "IN",
    "Quantity": 100,
    "Lot Number": "LOT-002",
    "Brand": "Unbrako",
    "Supplier": "XYZ Corp",
    "Purchase Date": "2024-05-02",
    "Purchase Rate": 16.20,
    "Purchase Ref": "INV-9900",
    "Grade": "10.9",
    "Thread": "Full Thread",
    "Finish": "HDG",
    "Custom Spec 1": "Special Coating",
    "Hide Spec 1": "Yes",
    "Custom Spec 2": "",
    "Hide Spec 2": "No",
    "Custom Spec 3": "",
    "Hide Spec 3": "No",
    "Category": "Acid",
    "Remarks": "Restock"
  }
];

const ws = XLSX.utils.json_to_sheet(data);

// Adding data validation for Category and Type
// Note: xlsx free version doesn't support writing data validation natively to the file easily,
// but we can generate a basic template that has all the right headers.
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

XLSX.writeFile(wb, "public/Book1- inventory.xlsx");
console.log("Generated public/Book1- inventory.xlsx successfully.");
