# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: draft-invoices.spec.ts >> Save as Draft E2E Suite >> Tier 4: Real-World Application Scenarios >> Scenario 5: Edit Draft and Finalize stock impacts
- Location: tests\draft-invoices.spec.ts:906:5

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for locator('a:has-text("Inventory")')
    2 × waiting for" http://localhost:8081/" navigation to finish...

```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | 
  3   | // Helper function to register a new user and log them in
  4   | async function registerAndLogin(page: Page): Promise<string> {
  5   |   await page.goto("/auth");
  6   |   await page.click('button[role="tab"]:has-text("Create account")');
  7   |   const timestamp = Date.now() + Math.random().toString(36).substring(2, 7);
  8   |   const testEmail = `test${timestamp}@example.com`;
  9   |   await page.fill("#reg-name", "Test User");
  10  |   await page.fill("#reg-email", testEmail);
  11  |   await page.fill("#reg-password", "Password123!");
  12  |   await page.fill("#reg-confirm", "Password123!");
  13  |   await page.click('form button[type="submit"]');
  14  |   // Wait for navigation to dashboard
  15  |   await expect(page).toHaveURL(/.*8081\/?$/, { timeout: 15000 });
  16  |   return testEmail;
  17  | }
  18  | 
  19  | // Helper function to navigate to the new invoice form client-side
  20  | async function navigateToNewInvoice(page: Page) {
  21  |   await page.click('a:has-text("Invoices")');
  22  |   await page.click('button:has-text("New Invoice")');
  23  | }
  24  | 
  25  | // Helper function to select dropdown options robustly
  26  | async function selectDropdownOption(page: Page, selectSelector: string, optionText: string) {
  27  |   const select = page.locator(selectSelector);
  28  |   await expect(select).toBeEnabled({ timeout: 5000 });
  29  |   const option = select.locator(`option:has-text("${optionText}")`).first();
  30  |   await option.waitFor({ state: "attached", timeout: 5000 });
  31  |   const val = await option.getAttribute("value");
  32  |   if (val) {
  33  |     await select.selectOption(val);
  34  |   } else {
  35  |     await select.selectOption({ label: optionText });
  36  |   }
  37  | }
  38  | 
  39  | // Helper function to create a warehouse and location via UI client-side
  40  | async function createWarehouseAndLocation(
  41  |   page: Page,
  42  |   whName: string,
  43  |   whCode: string,
  44  |   locName: string,
  45  |   locCode: string,
  46  | ) {
> 47  |   await page.click('a:has-text("Inventory")');
      |              ^ Error: page.click: Test timeout of 120000ms exceeded.
  48  |   await page.click('button[role="tab"]:has-text("Warehouses & Locations")');
  49  |   await page.click('button:has-text("Add Warehouse")');
  50  |   await page.fill('input[placeholder="e.g. Main Warehouse"]', whName);
  51  |   await page.click('button:text-is("Save")');
  52  |   await page.waitForTimeout(1000);
  53  | 
  54  |   // Locate the warehouse card by its name and click its "Add Location" button
  55  |   const whCard = page.locator("div.border", { has: page.locator("h3", { hasText: whName }) });
  56  |   await whCard.locator('button:has-text("Add Location")').click();
  57  | 
  58  |   await page.fill('input[placeholder="e.g. Aisle 1, Rack A"]', locName);
  59  |   await page.click('button:text-is("Save")');
  60  |   await page.waitForTimeout(1000);
  61  | }
  62  | 
  63  | // Helper function to create a product in the product master via UI client-side
  64  | async function createProduct(
  65  |   page: Page,
  66  |   description: string,
  67  |   sku: string,
  68  |   hsn: string,
  69  |   rate: string,
  70  | ) {
  71  |   await page.click('a:has-text("Inventory")');
  72  |   await page.click('button[role="tab"]:has-text("Product Master")');
  73  |   await page.click('button:has-text("Add Product")');
  74  |   await page.fill('input[placeholder="e.g. BOLT-M10-50"]', sku);
  75  |   await page.fill('input[placeholder="e.g. Hex Bolt M10x50 SS"]', description);
  76  |   await page.fill('input[placeholder="e.g. 7318"]', hsn);
  77  |   await page.locator('input[type="number"]').first().fill("18"); // GST %
  78  |   await page.locator('input[type="number"]').nth(1).fill(rate); // Default Rate
  79  |   await page.click('button:text-is("Save")');
  80  |   await page.waitForTimeout(1000);
  81  | }
  82  | 
  83  | // Helper function to manually adjust stock via UI client-side
  84  | async function adjustStock(
  85  |   page: Page,
  86  |   productDesc: string,
  87  |   whName: string,
  88  |   locName: string,
  89  |   qty: string,
  90  | ) {
  91  |   await page.click('a:has-text("Inventory")');
  92  |   await page.click('button[role="tab"]:has-text("Stock Ledger")');
  93  |   await page.click('button:has-text("Adjust Stock")');
  94  | 
  95  |   // Select product
  96  |   await selectDropdownOption(
  97  |     page,
  98  |     'select:has(option:has-text("— Select Product —"))',
  99  |     productDesc,
  100 |   );
  101 | 
  102 |   // Select warehouse
  103 |   await selectDropdownOption(page, 'select:has(option:has-text("— Select Warehouse —"))', whName);
  104 | 
  105 |   // Select location
  106 |   await selectDropdownOption(page, 'select:has(option:has-text("— Select Location —"))', locName);
  107 | 
  108 |   // Quantity
  109 |   await page.fill('input[type="number"]', qty);
  110 | 
  111 |   // Save
  112 |   await page.click('button:has-text("Save Adjustment")');
  113 |   await page.waitForTimeout(1000);
  114 | }
  115 | 
  116 | test.describe("Save as Draft E2E Suite", () => {
  117 |   test.setTimeout(120000); // Allow sufficient time for all workflows
  118 | 
  119 |   test.beforeEach(async ({ page }) => {
  120 |     await registerAndLogin(page);
  121 |   });
  122 | 
  123 |   // ==========================================
  124 |   // TIER 1: FEATURE COVERAGE (Happy Paths)
  125 |   // At least 35 assertions across 7 features
  126 |   // ==========================================
  127 |   test.describe("Tier 1: Feature Coverage", () => {
  128 |     test("F1 & F2: Save Draft Button, Form Saving & Invoice Number Consumption", async ({
  129 |       page,
  130 |     }) => {
  131 |       // Feature 1: Save Draft Button & Form Saving
  132 |       // Feature 2: Invoice Number Consumption
  133 | 
  134 |       await navigateToNewInvoice(page);
  135 | 
  136 |       // Assertion T1.1: Verify "Save Draft" button is visible
  137 |       const saveDraftBtn = page.locator('button:has-text("Save Draft")');
  138 |       await expect(saveDraftBtn).toBeVisible();
  139 | 
  140 |       // Assertion T1.2: Verify pre-assigned invoice number exists and has correct prefix
  141 |       const invNumInput = page.locator('label:has-text("Invoice #") + input');
  142 |       const invoiceNumber = await invNumInput.inputValue();
  143 |       expect(invoiceNumber).toMatch(/^INV-/); // Assertion T1.3
  144 | 
  145 |       // Fill in invoice details
  146 |       await page.fill('[placeholder="Customer name"]', "Happy Customer");
  147 |       await page.fill('[placeholder="e.g. m10 SS bolt"]', "Test Item F1");
```