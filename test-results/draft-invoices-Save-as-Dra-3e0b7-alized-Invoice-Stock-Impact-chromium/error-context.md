# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: draft-invoices.spec.ts >> Save as Draft E2E Suite >> Tier 2: Boundary & Corner Cases >> B3: Deleting Draft Invoice vs Deleting Finalized Invoice Stock Impact
- Location: tests\draft-invoices.spec.ts:397:5

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.fill: Test timeout of 120000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="e.g. BOLT-M10-50"]')

```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic:
      - generic:
        - complementary:
          - generic:
            - img
            - generic:
              - generic: MADEENA TRADERS
              - generic: An Abdul Munaf Foundation Since 1980
              - generic: Billing Suite
          - navigation:
            - link:
              - /url: /
              - img
              - text: Dashboard
            - link:
              - /url: /customers
              - img
              - text: Customers
            - link:
              - /url: /invoices
              - img
              - text: Invoices
            - link:
              - /url: /inventory
              - img
              - text: Inventory
            - link:
              - /url: /quotations
              - img
              - text: Quotations
            - link:
              - /url: /reports
              - img
              - text: Reports
            - link:
              - /url: /admin-scanner
              - img
              - text: Admin Scanner
            - link:
              - /url: /settings
              - img
              - text: Settings
          - generic: v1.0 · Offline mode
        - generic:
          - banner:
            - generic:
              - generic: MADEENA TRADERS
              - generic: An Abdul Munaf Foundation Since 1980
              - generic: Sat, 25 Jul, 2026
            - button:
              - img
            - button:
              - img
              - generic: Sign out
          - main:
            - generic:
              - generic:
                - tablist:
                  - tab: Stock Ledger
                  - tab [selected]: Product Master
                  - tab: Warehouses & Locations
                - tabpanel:
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - heading [level=2]: Products
                          - paragraph: Manage your product catalogue and specifications.
                        - button:
                          - img
                          - text: Add Product
                      - generic:
                        - generic:
                          - img
                          - textbox:
                            - /placeholder: Search by description or SKU...
                        - generic: No products yet. Add one to get started.
      - region "Notifications alt+T"
  - dialog "Add Product" [ref=e2]:
    - heading "Add Product" [level=2] [ref=e4]
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - text: SKU / Product Code *
          - textbox "e.g. BOLT-M16-35" [active] [ref=e8]
        - generic [ref=e9]:
          - text: Item Type *
          - combobox [ref=e10]:
            - option "Select Item Type" [selected]
            - option "Bolt Nut"
            - option "Bolt Nut Washer Set"
            - option "Only Bolt"
      - generic [ref=e11]:
        - text: Product Description *
        - textbox "e.g. Hex Bolt M16 x 35" [ref=e12]
      - generic [ref=e13]:
        - generic [ref=e14]:
          - text: Size
          - textbox "e.g. M16 x 35" [ref=e15]
        - generic [ref=e16]:
          - text: Finish
          - textbox "e.g. Zinc" [ref=e17]
      - generic [ref=e18]:
        - generic [ref=e19]:
          - text: Grade
          - textbox "e.g. 8.8" [ref=e20]
        - generic [ref=e21]:
          - text: Thread Type
          - combobox [ref=e22]:
            - option "Select Thread Type" [selected]
            - option "Full Thread"
            - option "Half Thread"
      - generic [ref=e24]:
        - text: Thread Length (Optional)
        - textbox "e.g. 25 mm" [ref=e25]
    - generic [ref=e26]:
      - button "Cancel" [ref=e27] [cursor=pointer]
      - button "Save" [ref=e28] [cursor=pointer]
    - button "Close" [ref=e29] [cursor=pointer]:
      - img [ref=e30]
      - generic [ref=e33]: Close
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
  47  |   await page.click('a:has-text("Inventory")');
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
> 74  |   await page.fill('input[placeholder="e.g. BOLT-M10-50"]', sku);
      |              ^ Error: page.fill: Test timeout of 120000ms exceeded.
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
  148 |       await page.fill('[placeholder="7318"]', "7318");
  149 |       await page.locator('tbody tr input[type="number"]').first().fill("10"); // Quantity
  150 |       await page.locator('tbody tr input[type="number"]').nth(1).fill("150"); // Price
  151 | 
  152 |       // Click Save Draft
  153 |       await page.click('button:has-text("Save Draft")');
  154 | 
  155 |       // Assertion T1.4: Verify draft saved indicator/toast is visible
  156 |       const draftSavedIndicator = page.locator('span:has-text("Draft Saved")').first();
  157 |       await expect(draftSavedIndicator).toBeVisible();
  158 | 
  159 |       // Assertion T1.5: Verify invoice number was consumed
  160 |       // Navigate to new invoice page again client-side
  161 |       await navigateToNewInvoice(page);
  162 |       const newInvNumInput = page.locator('label:has-text("Invoice #") + input');
  163 |       const newInvoiceNumber = await newInvNumInput.inputValue();
  164 |       expect(newInvoiceNumber).not.toBe(invoiceNumber); // Assertion T1.6: Next invoice has a new incremented number
  165 |     });
  166 | 
  167 |     test("F3: Auto-navigation after Save", async ({ page }) => {
  168 |       // Feature 3: Auto-navigation after Save
  169 |       await navigateToNewInvoice(page);
  170 |       await page.fill('[placeholder="Customer name"]', "Auto Nav Customer");
  171 | 
  172 |       // Assertion T1.7: Check current URL is /invoices/new
  173 |       expect(page.url()).toContain("/invoices/new");
  174 | 
```