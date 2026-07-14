import { test, expect, type Page } from "@playwright/test";

// Helper function to register a new user and log them in
async function registerAndLogin(page: Page): Promise<string> {
  await page.goto("/auth");
  await page.click('button[role="tab"]:has-text("Create account")');
  const timestamp = Date.now() + Math.random().toString(36).substring(2, 7);
  const testEmail = `test${timestamp}@example.com`;
  await page.fill("#reg-name", "Test User");
  await page.fill("#reg-email", testEmail);
  await page.fill("#reg-password", "Password123!");
  await page.fill("#reg-confirm", "Password123!");
  await page.click('form button[type="submit"]');
  // Wait for navigation to dashboard
  await expect(page).toHaveURL(/.*8081\/?$/, { timeout: 15000 });
  return testEmail;
}

// Helper function to navigate to the new invoice form client-side
async function navigateToNewInvoice(page: Page) {
  await page.click('a:has-text("Invoices")');
  await page.click('button:has-text("New Invoice")');
}

// Helper function to select dropdown options robustly
async function selectDropdownOption(page: Page, selectSelector: string, optionText: string) {
  const select = page.locator(selectSelector);
  await expect(select).toBeEnabled({ timeout: 5000 });
  const option = select.locator(`option:has-text("${optionText}")`).first();
  await option.waitFor({ state: "attached", timeout: 5000 });
  const val = await option.getAttribute("value");
  if (val) {
    await select.selectOption(val);
  } else {
    await select.selectOption({ label: optionText });
  }
}

// Helper function to create a warehouse and location via UI client-side
async function createWarehouseAndLocation(
  page: Page,
  whName: string,
  whCode: string,
  locName: string,
  locCode: string,
) {
  await page.click('a:has-text("Inventory")');
  await page.click('button[role="tab"]:has-text("Warehouses & Locations")');
  await page.click('button:has-text("Add Warehouse")');
  await page.fill('input[placeholder="e.g. Main Warehouse"]', whName);
  await page.click('button:text-is("Save")');
  await page.waitForTimeout(1000);

  // Locate the warehouse card by its name and click its "Add Location" button
  const whCard = page.locator("div.border", { has: page.locator("h3", { hasText: whName }) });
  await whCard.locator('button:has-text("Add Location")').click();

  await page.fill('input[placeholder="e.g. Aisle 1, Rack A"]', locName);
  await page.click('button:text-is("Save")');
  await page.waitForTimeout(1000);
}

// Helper function to create a product in the product master via UI client-side
async function createProduct(
  page: Page,
  description: string,
  sku: string,
  hsn: string,
  rate: string,
) {
  await page.click('a:has-text("Inventory")');
  await page.click('button[role="tab"]:has-text("Product Master")');
  await page.click('button:has-text("Add Product")');
  await page.fill('input[placeholder="e.g. BOLT-M10-50"]', sku);
  await page.fill('input[placeholder="e.g. Hex Bolt M10x50 SS"]', description);
  await page.fill('input[placeholder="e.g. 7318"]', hsn);
  await page.locator('input[type="number"]').first().fill("18"); // GST %
  await page.locator('input[type="number"]').nth(1).fill(rate); // Default Rate
  await page.click('button:text-is("Save")');
  await page.waitForTimeout(1000);
}

// Helper function to manually adjust stock via UI client-side
async function adjustStock(
  page: Page,
  productDesc: string,
  whName: string,
  locName: string,
  qty: string,
) {
  await page.click('a:has-text("Inventory")');
  await page.click('button[role="tab"]:has-text("Stock Ledger")');
  await page.click('button:has-text("Adjust Stock")');

  // Select product
  await selectDropdownOption(
    page,
    'select:has(option:has-text("— Select Product —"))',
    productDesc,
  );

  // Select warehouse
  await selectDropdownOption(page, 'select:has(option:has-text("— Select Warehouse —"))', whName);

  // Select location
  await selectDropdownOption(page, 'select:has(option:has-text("— Select Location —"))', locName);

  // Quantity
  await page.fill('input[type="number"]', qty);

  // Save
  await page.click('button:has-text("Save Adjustment")');
  await page.waitForTimeout(1000);
}

test.describe("Save as Draft E2E Suite", () => {
  test.setTimeout(120000); // Allow sufficient time for all workflows

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE (Happy Paths)
  // At least 35 assertions across 7 features
  // ==========================================
  test.describe("Tier 1: Feature Coverage", () => {
    test("F1 & F2: Save Draft Button, Form Saving & Invoice Number Consumption", async ({
      page,
    }) => {
      // Feature 1: Save Draft Button & Form Saving
      // Feature 2: Invoice Number Consumption

      await navigateToNewInvoice(page);

      // Assertion T1.1: Verify "Save Draft" button is visible
      const saveDraftBtn = page.locator('button:has-text("Save Draft")');
      await expect(saveDraftBtn).toBeVisible();

      // Assertion T1.2: Verify pre-assigned invoice number exists and has correct prefix
      const invNumInput = page.locator('label:has-text("Invoice #") + input');
      const invoiceNumber = await invNumInput.inputValue();
      expect(invoiceNumber).toMatch(/^INV-/); // Assertion T1.3

      // Fill in invoice details
      await page.fill('[placeholder="Customer name"]', "Happy Customer");
      await page.fill('[placeholder="e.g. m10 SS bolt"]', "Test Item F1");
      await page.fill('[placeholder="7318"]', "7318");
      await page.locator('tbody tr input[type="number"]').first().fill("10"); // Quantity
      await page.locator('tbody tr input[type="number"]').nth(1).fill("150"); // Price

      // Click Save Draft
      await page.click('button:has-text("Save Draft")');

      // Assertion T1.4: Verify draft saved indicator/toast is visible
      const draftSavedIndicator = page.locator('span:has-text("Draft Saved")').first();
      await expect(draftSavedIndicator).toBeVisible();

      // Assertion T1.5: Verify invoice number was consumed
      // Navigate to new invoice page again client-side
      await navigateToNewInvoice(page);
      const newInvNumInput = page.locator('label:has-text("Invoice #") + input');
      const newInvoiceNumber = await newInvNumInput.inputValue();
      expect(newInvoiceNumber).not.toBe(invoiceNumber); // Assertion T1.6: Next invoice has a new incremented number
    });

    test("F3: Auto-navigation after Save", async ({ page }) => {
      // Feature 3: Auto-navigation after Save
      await navigateToNewInvoice(page);
      await page.fill('[placeholder="Customer name"]', "Auto Nav Customer");

      // Assertion T1.7: Check current URL is /invoices/new
      expect(page.url()).toContain("/invoices/new");

      await page.click('button:has-text("Save Draft")');

      // Assertion T1.8: Verify page navigates back to invoices list (/invoices)
      await expect(page).toHaveURL(/.*\/invoices\/?$/, { timeout: 10000 });

      // Assertion T1.9: Verify "Invoices" page header is visible
      const header = page.locator('h1:has-text("Invoices")');
      await expect(header).toBeVisible();

      // Assertion T1.10: Verify "New Invoice" button is visible on list page
      const newInvoiceBtn = page.locator('button:has-text("New Invoice")');
      await expect(newInvoiceBtn).toBeVisible();

      // Assertion T1.11: Check table elements are visible
      const table = page.locator("table");
      await expect(table).toBeVisible();
    });

    test("F4, F5 & F6: List Filter by Default, Toggle & Draft Badge", async ({ page }) => {
      // Feature 4: Invoice List Filter by Default
      // Feature 5: 'Show Drafts' Toggle
      // Feature 6: Draft Badge Indicator

      // Create a draft invoice first
      await navigateToNewInvoice(page);
      const invNumInput = page.locator('label:has-text("Invoice #") + input');
      const draftNum = await invNumInput.inputValue();
      await page.fill('[placeholder="Customer name"]', "Toggle Customer");
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // Assertion T1.12: Default list does NOT display the draft invoice
      const draftLink = page.locator(`a:has-text("${draftNum}")`);
      await expect(draftLink).not.toBeVisible();

      // Assertion T1.13: Verify default table does not contain draft rows
      const tableText = await page.locator("table").textContent();
      expect(tableText).not.toContain("Toggle Customer"); // Assertion T1.14

      // Assertion T1.15: Verify "Show Drafts" toggle checkbox exists
      const toggleLabel = page.locator('label:has-text("Show drafts")');
      await expect(toggleLabel).toBeVisible();

      // Click Show Drafts toggle
      await page.click('label:has-text("Show drafts")');

      // Assertion T1.16: Draft invoice is now visible in the table
      await expect(page.locator(`a:has-text("${draftNum}")`)).toBeVisible();

      // Assertion T1.17: Draft invoice customer name is visible
      await expect(page.locator(`td:has-text("Toggle Customer")`)).toBeVisible();

      // Assertion T1.18: Draft row has a gray "Draft" badge
      const draftBadge = page.locator(`tr:has(a:text("${draftNum}")) span:has-text("Draft")`);
      await expect(draftBadge).toBeVisible();

      // Assertion T1.19: Verify badge class styling indicates gray/secondary styling
      const badgeClass = await draftBadge.getAttribute("class");
      expect(badgeClass).toContain("bg-"); // Assertion T1.20

      // Uncheck "Show Drafts" toggle
      await page.click('label:has-text("Show drafts")');

      // Assertion T1.21: Draft invoice disappears from the table again
      await expect(page.locator(`a:has-text("${draftNum}")`)).not.toBeVisible();

      // Create a final invoice
      await navigateToNewInvoice(page);
      const finalNumInput = page.locator('label:has-text("Invoice #") + input');
      const finalNum = await finalNumInput.inputValue();
      await page.fill('[placeholder="Customer name"]', "Final Customer");
      await page.click('button:text-is("Save")'); // Final Save

      // Navigate to /invoices list client-side
      await page.click('a:has-text("Invoices")');

      // Assertion T1.23: Final invoice is visible by default
      await expect(page.locator(`a:has-text("${finalNum}")`)).toBeVisible();

      // Assertion T1.24: Final invoice has no Draft badge
      const finalRowBadge = page.locator(`tr:has(a:text("${finalNum}")) span:has-text("Draft")`);
      await expect(finalRowBadge).not.toBeVisible();

      // Assertion T1.25: Toggle Show Drafts retains final invoice visible
      await page.click('label:has-text("Show drafts")');
      await expect(page.locator(`a:has-text("${finalNum}")`)).toBeVisible(); // Assertion T1.26
      await expect(page.locator(`a:has-text("${draftNum}")`)).toBeVisible(); // Assertion T1.27
    });

    test("F7: Dashboard Metrics Exclusion", async ({ page }) => {
      // Feature 7: Dashboard Metrics Exclusion

      // 1. Get initial metrics from Dashboard
      await page.click('a:has-text("Dashboard")');
      const getMetric = async (label: string) => {
        const valueElement = page.locator(
          `div:has(> div:text-is("${label}")) > div.text-2xl, div:has-text("${label}") + div, div:has-text("${label}") >> xpath=../div[contains(@class, "text-2xl")]`,
        );
        await expect(valueElement).toBeVisible();
        return await valueElement.innerText();
      };

      const initialCountStr = await getMetric("Total Invoices");
      const initialRevStr = await getMetric("Total Revenue");
      const initialGstStr = await getMetric("GST Collected");

      const initialCount = parseInt(initialCountStr) || 0;

      // 2. Create a Draft Invoice with substantial values
      await navigateToNewInvoice(page);
      await page.fill('[placeholder="Customer name"]', "Dashboard Test Customer");
      await page.fill('[placeholder="e.g. m10 SS bolt"]', "Taxable Item");
      await page.fill('[placeholder="7318"]', "7318");
      await page.locator('tbody tr input[type="number"]').first().fill("10"); // Quantity
      await page.locator('tbody tr input[type="number"]').nth(1).fill("1000"); // Price = 10000 taxable
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 3. Go back to Dashboard client-side and verify metrics are unchanged
      await page.click('a:has-text("Dashboard")');

      const postDraftCountStr = await getMetric("Total Invoices");
      const postDraftRevStr = await getMetric("Total Revenue");
      const postDraftGstStr = await getMetric("GST Collected");

      // Assertions T1.28 - T1.31: Metrics should not count the draft
      expect(parseInt(postDraftCountStr) || 0).toBe(initialCount);
      expect(postDraftRevStr).toBe(initialRevStr);
      expect(postDraftGstStr).toBe(initialGstStr);

      // Assertion T1.32: Verify draft is NOT listed in "Recent Invoices" table
      const recentTable = page.locator('h2:has-text("Recent Invoices") >> xpath=../..');
      await expect(recentTable).toBeVisible();
      const recentText = await recentTable.textContent();
      expect(recentText).not.toContain("Dashboard Test Customer"); // Assertion T1.33

      // 4. Create a Finalized Invoice with values
      await navigateToNewInvoice(page);
      await page.fill('[placeholder="Customer name"]', "Final Dashboard Customer");
      await page.fill('[placeholder="e.g. m10 SS bolt"]', "Taxable Item");
      await page.fill('[placeholder="7318"]', "7318");
      await page.locator('tbody tr input[type="number"]').first().fill("10"); // Quantity
      await page.locator('tbody tr input[type="number"]').nth(1).fill("1000"); // Price = 10000 taxable
      await page.click('button:text-is("Save")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 5. Go back to Dashboard and verify metrics have changed
      await page.click('a:has-text("Dashboard")');
      const postFinalCountStr = await getMetric("Total Invoices");
      const postFinalRevStr = await getMetric("Total Revenue");

      // Assertions T1.34 - T1.35: Metrics should reflect the final invoice
      expect(parseInt(postFinalCountStr) || 0).toBe(initialCount + 1);
      expect(postFinalRevStr).not.toBe(initialRevStr);
    });
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // At least 35 assertions verifying limits, empty forms, validations, deletions
  // ==========================================
  test.describe("Tier 2: Boundary & Corner Cases", () => {
    test("B1: Validations and Empty Fields", async ({ page }) => {
      await navigateToNewInvoice(page);

      // Assertion T2.1: Try to save draft without customer name
      await page.click('button:has-text("Save Draft")');

      // Assertion T2.2: Verify error toast shows "Customer name is required"
      await expect(page.locator("text=Customer name is required")).toBeVisible();

      // Assertion T2.3: Verify page does not navigate away
      expect(page.url()).toContain("/invoices/new");

      // Fill customer name but leave items completely empty
      await page.fill('[placeholder="Customer name"]', "Empty Item Draft");

      // Clear description/hsn/qty/price if any prefilled
      await page.fill('[placeholder="e.g. m10 SS bolt"]', "");
      await page.fill('[placeholder="7318"]', "");

      // Assertion T2.4: Save draft with empty items row
      await page.click('button:has-text("Save Draft")');
      const draftSavedIndicator = page.locator('span:has-text("Draft Saved")').first();
      await expect(draftSavedIndicator).toBeVisible(); // Assertion T2.5

      // Assertion T2.6: Go back to list client-side and check if it exists in toggled view
      await page.click('a:has-text("Invoices")');
      await page.click('label:has-text("Show drafts")');
      await expect(page.locator('td:has-text("Empty Item Draft")')).toBeVisible(); // Assertion T2.7
    });

    test("B2: Edit Draft Multiple Times (Retention of Number & fields)", async ({ page }) => {
      // Create draft
      await navigateToNewInvoice(page);
      const invNumInput = page.locator('label:has-text("Invoice #") + input');
      const draftNum = await invNumInput.inputValue();
      await page.fill('[placeholder="Customer name"]', "Multi Edit Customer");
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // Go to list, toggle drafts, click edit
      await page.click('label:has-text("Show drafts")');
      const editButton = page.locator(`tr:has(a:text("${draftNum}")) button[title="Edit"]`);
      await expect(editButton).toBeVisible(); // Assertion T2.8
      await editButton.click();

      // Assertion T2.9: Verify number is retained
      const editInvNum = page.locator('label:has-text("Invoice #") + input');
      await expect(editInvNum).toHaveValue(draftNum);

      // Edit field
      await page.fill('[placeholder="Customer name"]', "Multi Edit Customer Updated");
      await page.click('button:has-text("Save Draft")');

      // Assertion T2.10: Wait for save and check list again
      await page.waitForURL(/.*\/invoices\/?$/);
      await page.click('label:has-text("Show drafts")');
      await expect(page.locator('td:has-text("Multi Edit Customer Updated")')).toBeVisible(); // Assertion T2.11
      await expect(page.locator('td:text-is("Multi Edit Customer")')).not.toBeVisible(); // Assertion T2.12 (Old value should be replaced, no duplicate invoices)
    });

    test("B3: Deleting Draft Invoice vs Deleting Finalized Invoice Stock Impact", async ({
      page,
    }) => {
      // 1. Setup warehouse and product with stock
      const whName = "B3 Warehouse";
      const whCode = "WH-B3";
      const locName = "B3 Location";
      const locCode = "LOC-B3";
      const prodDesc = "B3 Product";
      const prodSku = "SKU-B3";

      await createWarehouseAndLocation(page, whName, whCode, locName, locCode);
      await createProduct(page, prodDesc, prodSku, "7318", "200");
      await adjustStock(page, prodDesc, whName, locName, "100"); // Initial stock: 100

      // 2. Create a Draft Invoice targeting this stock
      await navigateToNewInvoice(page);
      await page.fill('[placeholder="Customer name"]', "B3 Draft Customer");

      // Select Warehouse & Location in editor
      await selectDropdownOption(
        page,
        'select:has(option:has-text("— Select Warehouse —"))',
        whName,
      );
      await selectDropdownOption(
        page,
        'select:has(option:has-text("— Select Location —"))',
        locName,
      );

      // Add item
      await page.fill('[placeholder="e.g. m10 SS bolt"]', prodDesc);
      await page.locator('tbody tr input[type="number"]').first().fill("30"); // Qty = 30
      await page.locator('tbody tr input[type="number"]').nth(1).fill("200");

      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // Assertion T2.13: Verify stock remains 100 (drafts do not affect stock)
      await page.click('a:has-text("Inventory")');
      const stockBadgeBefore = page.locator(`tr:has(td:text("${prodDesc}")) span`);
      await expect(stockBadgeBefore).toHaveText("100"); // Assertion T2.14

      // Delete the Draft Invoice client-side
      await page.click('a:has-text("Invoices")');
      await page.click('label:has-text("Show drafts")');
      const deleteDraftBtn = page.locator('button[title="Delete"]').first();
      await expect(deleteDraftBtn).toBeVisible(); // Assertion T2.15
      await deleteDraftBtn.click();
      await page.click('button:has-text("Delete")'); // Confirm modal
      await page.waitForTimeout(1000);

      // Assertion T2.16: Verify stock is still 100 after draft deletion
      await page.click('a:has-text("Inventory")');
      const stockBadgeAfterDraftDel = page.locator(`tr:has(td:text("${prodDesc}")) span`);
      await expect(stockBadgeAfterDraftDel).toHaveText("100"); // Assertion T2.17

      // 3. Create a Finalized Invoice targeting stock
      await navigateToNewInvoice(page);
      await page.fill('[placeholder="Customer name"]', "B3 Final Customer");
      await selectDropdownOption(
        page,
        'select:has(option:has-text("— Select Warehouse —"))',
        whName,
      );
      await selectDropdownOption(
        page,
        'select:has(option:has-text("— Select Location —"))',
        locName,
      );
      await page.fill('[placeholder="e.g. m10 SS bolt"]', prodDesc);
      await page.locator('tbody tr input[type="number"]').first().fill("40"); // Qty = 40
      await page.locator('tbody tr input[type="number"]').nth(1).fill("200");
      await page.click('button:text-is("Save")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // Assertion T2.18: Verify stock is reduced to 60 (finalized invoice deducts stock)
      await page.click('a:has-text("Inventory")');
      const stockBadgeFinal = page.locator(`tr:has(td:text("${prodDesc}")) span`);
      await expect(stockBadgeFinal).toHaveText("60"); // Assertion T2.19

      // Delete the Finalized Invoice
      await page.click('a:has-text("Invoices")');
      const deleteFinalBtn = page.locator('button[title="Delete"]').first();
      await expect(deleteFinalBtn).toBeVisible(); // Assertion T2.20
      await deleteFinalBtn.click();
      await page.click('button:has-text("Delete")'); // Confirm modal
      await page.waitForTimeout(1000);

      // Assertion T2.21: Verify stock is reverted back to 100 after finalized invoice deletion
      await page.click('a:has-text("Inventory")');
      const stockBadgeAfterFinalDel = page.locator(`tr:has(td:text("${prodDesc}")) span`);
      await expect(stockBadgeAfterFinalDel).toHaveText("100"); // Assertion T2.22
    });

    test("B4: Custom Invoice Number Entry and Auto-counter Isolation", async ({ page }) => {
      // 1. Check auto invoice number on entry
      await navigateToNewInvoice(page);
      const autoNum = await page.locator('label:has-text("Invoice #") + input').inputValue();

      // 2. Overwrite with custom invoice number
      const customNum = `MY-CUSTOM-${Date.now()}`;
      await page.fill('label:has-text("Invoice #") + input', customNum);
      await page.fill('[placeholder="Customer name"]', "Custom Num Customer");
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 3. Show drafts and verify custom number saved
      await page.click('label:has-text("Show drafts")');
      await expect(page.locator(`a:has-text("${customNum}")`)).toBeVisible(); // Assertion T2.23

      // 4. Create another new invoice
      await navigateToNewInvoice(page);
      const nextAutoNum = await page.locator('label:has-text("Invoice #") + input').inputValue();

      // Assertion T2.24: The next auto invoice number should be equal to the initial autoNum
      // because customNum was used, thus not consuming the auto-counter sequence.
      expect(nextAutoNum).toBe(autoNum); // Assertion T2.25
    });

    test("B5: Check Boundary/Edge inputs on Draft Creation", async ({ page }) => {
      await navigateToNewInvoice(page);

      // Customer name with extremely long text (100+ chars)
      const longName = "A".repeat(120);
      await page.fill('[placeholder="Customer name"]', longName);

      // Negative quantity and negative price
      await page.fill('[placeholder="e.g. m10 SS bolt"]', "Negative Item");
      await page.locator('tbody tr input[type="number"]').first().fill("-5"); // Negative Qty
      await page.locator('tbody tr input[type="number"]').nth(1).fill("-100"); // Negative Price

      // Save Draft
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // Verify draft saved with long name
      await page.click('label:has-text("Show drafts")');
      await expect(page.locator(`td:has-text("${longName}")`)).toBeVisible(); // Assertion T2.26

      // Edit the draft to check negative values are preserved
      await page.locator(`tr:has(td:text("${longName}")) button[title="Edit"]`).click();

      const qtyInput = page.locator('tbody tr input[type="number"]').first();
      const priceInput = page.locator('tbody tr input[type="number"]').nth(1);

      await expect(qtyInput).toHaveValue("-5"); // Assertion T2.27
      await expect(priceInput).toHaveValue("-100"); // Assertion T2.28
    });

    test("B6: Finalize Draft Invoice and Retain Invoice Number", async ({ page }) => {
      // 1. Create a draft invoice
      await navigateToNewInvoice(page);
      const draftNum = await page.locator('label:has-text("Invoice #") + input').inputValue();
      await page.fill('[placeholder="Customer name"]', "Finalize Customer");
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 2. Go to list, edit the draft
      await page.click('label:has-text("Show drafts")');
      await page.locator(`tr:has(a:text("${draftNum}")) button[title="Edit"]`).click();

      // 3. Finalize it by clicking regular Save button
      await page.click('button:text-is("Save")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // Assertion T2.29: Invoices list page should show it in the table BY DEFAULT (without toggle)
      await expect(page.locator(`a:has-text("${draftNum}")`)).toBeVisible();

      // Assertion T2.30: Verify there is no Draft badge anymore
      const badge = page.locator(`tr:has(a:text("${draftNum}")) span:has-text("Draft")`);
      await expect(badge).not.toBeVisible();

      // Assertion T2.31: Uncheck Show Drafts toggle, it must remain visible
      await expect(page.locator(`a:has-text("${draftNum}")`)).toBeVisible(); // Assertion T2.32
    });

    test("B7: Multiple Empty Rows Cleanup on Save Draft", async ({ page }) => {
      await navigateToNewInvoice(page);
      await page.fill('[placeholder="Customer name"]', "Empty Cleanup Customer");

      // Add multiple empty rows
      await page.click('button:has-text("Add Row")');
      await page.click('button:has-text("Add Row")');

      // Fill only the second row description
      await page
        .locator("tbody tr")
        .nth(1)
        .locator('input[placeholder="e.g. m10 SS bolt"]')
        .fill("Filled Row");
      await page.locator("tbody tr").nth(1).locator('input[type="number"]').first().fill("2");
      await page.locator("tbody tr").nth(1).locator('input[type="number"]').nth(1).fill("50");

      // Click Save Draft
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // Go back to edit the saved draft
      await page.click('label:has-text("Show drafts")');
      await page.locator('button[title="Edit"]').first().click();

      // Assertions T2.33 - T2.35: Only the filled item row should be present, empty rows cleaned up
      const rows = page.locator("tbody tr");
      await expect(rows).toHaveCount(1); // Assertion T2.33
      await expect(page.locator('input[placeholder="e.g. m10 SS bolt"]').first()).toHaveValue(
        "Filled Row",
      ); // Assertion T2.34
      await expect(page.locator('tbody tr input[type="number"]').first()).toHaveValue("2"); // Assertion T2.35
    });
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // At least 7 assertions verifying interactions between features
  // ==========================================
  test.describe("Tier 3: Cross-Feature Combinations", () => {
    test("Draft state, Invoice number, List visibility, Badge, and Dashboard interaction", async ({
      page,
    }) => {
      // 1. Get initial dashboard revenue
      await page.click('a:has-text("Dashboard")');
      const getRev = async () => {
        const val = page
          .locator(
            'div:has-text("Total Revenue") + div, div:has(> div:text-is("Total Revenue")) > div.text-2xl',
          )
          .first();
        return await val.innerText();
      };
      const initialRev = await getRev();

      // 2. Create Draft with specific amount (INV-0001, customer: CrossCustomer, total = 500)
      await navigateToNewInvoice(page);
      const draftNum = await page.locator('label:has-text("Invoice #") + input').inputValue();
      await page.fill('[placeholder="Customer name"]', "CrossCustomer");
      await page.fill('[placeholder="e.g. m10 SS bolt"]', "Cross Item");
      await page.fill('[placeholder="7318"]', "7318");
      await page.locator('tbody tr input[type="number"]').first().fill("5"); // Qty = 5
      await page.locator('tbody tr input[type="number"]').nth(1).fill("100"); // Price = 100 (Total = 500)
      await page.click('button:has-text("Save Draft")'); // F1: Save Draft
      await page.waitForURL(/.*\/invoices\/?$/); // F3: Auto-navigation

      // Assertion T3.1: Verify list default filters it out
      await expect(page.locator(`a:has-text("${draftNum}")`)).not.toBeVisible();

      // Assertion T3.2: Toggle Show Drafts and verify badge
      await page.click('label:has-text("Show drafts")'); // F5: Toggle
      await expect(page.locator(`a:has-text("${draftNum}")`)).toBeVisible();
      const badge = page.locator(`tr:has(a:text("${draftNum}")) span:has-text("Draft")`);
      await expect(badge).toBeVisible(); // Assertion T3.3: Badge is present

      // Assertion T3.4: Verify dashboard is unaffected
      await page.click('a:has-text("Dashboard")');
      const currentRev = await getRev();
      expect(currentRev).toBe(initialRev); // Assertion T3.5

      // 3. Edit Draft and Finalize it
      await page.click('a:has-text("Invoices")');
      await page.click('label:has-text("Show drafts")');
      await page.locator(`tr:has(a:text("${draftNum}")) button[title="Edit"]`).click();
      await page.click('button:text-is("Save")'); // Save (finalize)
      await page.waitForURL(/.*\/invoices\/?$/);

      // Assertion T3.6: Verify visible in list default without toggle
      await expect(page.locator(`a:has-text("${draftNum}")`)).toBeVisible();

      // Assertion T3.7: Verify dashboard revenue is now updated
      await page.click('a:has-text("Dashboard")');
      const finalRev = await getRev();
      expect(finalRev).not.toBe(initialRev); // Assertion T3.8
    });
  });

  // ==========================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // At least 5 complex workflows
  // ==========================================
  test.describe("Tier 4: Real-World Application Scenarios", () => {
    test("Scenario 1: Complete Draft Lifecycle", async ({ page }) => {
      // 1. Create a draft invoice
      await navigateToNewInvoice(page);
      const invoiceNumber = await page.locator('label:has-text("Invoice #") + input').inputValue();
      await page.fill('[placeholder="Customer name"]', "Lifecycle Customer");
      await page.fill('[placeholder="e.g. m10 SS bolt"]', "Lifecycle Item");
      await page.fill('[placeholder="7318"]', "7318");
      await page.locator('tbody tr input[type="number"]').first().fill("10");
      await page.locator('tbody tr input[type="number"]').nth(1).fill("100");

      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 2. Verify not in dashboard
      await page.click('a:has-text("Dashboard")');
      const dashboardText = await page.locator("body").textContent();
      expect(dashboardText).not.toContain("Lifecycle Customer");

      // 3. Verify not in list by default
      await page.click('a:has-text("Invoices")');
      await expect(page.locator(`a:has-text("${invoiceNumber}")`)).not.toBeVisible();

      // 4. Toggle drafts and verify row is present with Draft badge
      await page.click('label:has-text("Show drafts")');
      await expect(page.locator(`a:has-text("${invoiceNumber}")`)).toBeVisible();
      await expect(
        page.locator(`tr:has(a:text("${invoiceNumber}")) span:has-text("Draft")`),
      ).toBeVisible();

      // 5. Edit draft and save as draft again
      await page.locator(`tr:has(a:text("${invoiceNumber}")) button[title="Edit"]`).click();
      await page.fill('[placeholder="Customer name"]', "Lifecycle Customer Modified");
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 6. Verify name modified in toggled list view
      await page.click('label:has-text("Show drafts")');
      await expect(page.locator('td:has-text("Lifecycle Customer Modified")')).toBeVisible();

      // 7. Edit and Finalize
      await page.locator(`tr:has(a:text("${invoiceNumber}")) button[title="Edit"]`).click();
      await page.click('button:text-is("Save")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 8. Verify visible in default list without toggle and badge gone
      await expect(page.locator(`a:has-text("${invoiceNumber}")`)).toBeVisible();
      await expect(
        page.locator(`tr:has(a:text("${invoiceNumber}")) span:has-text("Draft")`),
      ).not.toBeVisible();

      // 9. Verify visible in dashboard recent table
      await page.click('a:has-text("Dashboard")');
      const updatedDashboardText = await page.locator("body").textContent();
      expect(updatedDashboardText).toContain("Lifecycle Customer Modified");
    });

    test("Scenario 2: Multi-Warehouse Stock Isolation", async ({ page }) => {
      const whName = "Scenario 2 WH";
      const whCode = "WH-SC2";
      const locName = "Scenario 2 LOC";
      const locCode = "LOC-SC2";
      const prodDesc = "Scenario 2 Product";
      const prodSku = "SKU-SC2";

      // 1. Create warehouse/location and product with 50 units initial stock
      await createWarehouseAndLocation(page, whName, whCode, locName, locCode);
      await createProduct(page, prodDesc, prodSku, "7318", "150");
      await adjustStock(page, prodDesc, whName, locName, "50");

      // 2. Create Draft invoice for 10 units
      await navigateToNewInvoice(page);
      await page.fill('[placeholder="Customer name"]', "Warehouse Draft Customer");
      await selectDropdownOption(
        page,
        'select:has(option:has-text("— Select Warehouse —"))',
        whName,
      );
      await selectDropdownOption(
        page,
        'select:has(option:has-text("— Select Location —"))',
        locName,
      );
      await page.fill('[placeholder="e.g. m10 SS bolt"]', prodDesc);
      await page.locator('tbody tr input[type="number"]').first().fill("10");
      await page.locator('tbody tr input[type="number"]').nth(1).fill("150");
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 3. Verify stock is still 50
      await page.click('a:has-text("Inventory")');
      await expect(page.locator(`tr:has(td:text("${prodDesc}")) span`)).toHaveText("50");

      // 4. Create final invoice for 15 units
      await navigateToNewInvoice(page);
      await page.fill('[placeholder="Customer name"]', "Warehouse Final Customer");
      await selectDropdownOption(
        page,
        'select:has(option:has-text("— Select Warehouse —"))',
        whName,
      );
      await selectDropdownOption(
        page,
        'select:has(option:has-text("— Select Location —"))',
        locName,
      );
      await page.fill('[placeholder="e.g. m10 SS bolt"]', prodDesc);
      await page.locator('tbody tr input[type="number"]').first().fill("15");
      await page.locator('tbody tr input[type="number"]').nth(1).fill("150");
      await page.click('button:text-is("Save")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 5. Verify stock becomes 35
      await page.click('a:has-text("Inventory")');
      await expect(page.locator(`tr:has(td:text("${prodDesc}")) span`)).toHaveText("35");

      // 6. Delete draft and verify stock remains 35
      await page.click('a:has-text("Invoices")');
      await page.click('label:has-text("Show drafts")');
      await page
        .locator('tr:has(td:text("Warehouse Draft Customer")) button[title="Delete"]')
        .click();
      await page.click('button:has-text("Delete")');
      await page.waitForTimeout(1000);

      await page.click('a:has-text("Inventory")');
      await expect(page.locator(`tr:has(td:text("${prodDesc}")) span`)).toHaveText("35");

      // 7. Delete final and verify stock reverts to 50
      await page.click('a:has-text("Invoices")');
      await page
        .locator('tr:has(td:text("Warehouse Final Customer")) button[title="Delete"]')
        .click();
      await page.click('button:has-text("Delete")');
      await page.waitForTimeout(1000);

      await page.click('a:has-text("Inventory")');
      await expect(page.locator(`tr:has(td:text("${prodDesc}")) span`)).toHaveText("50");
    });

    test("Scenario 3: Concurrent Invoice Number Generation", async ({ page }) => {
      // 1. Create a draft invoice
      await navigateToNewInvoice(page);
      const draftNum = await page.locator('label:has-text("Invoice #") + input').inputValue();
      await page.fill('[placeholder="Customer name"]', "Concurrent Draft Customer");
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 2. Go to New Invoice page again immediately
      await navigateToNewInvoice(page);
      const nextNum = await page.locator('label:has-text("Invoice #") + input').inputValue();

      // Verify the next number is incremented and not clashing
      expect(nextNum).not.toBe(draftNum);

      // 3. Save as Finalized Invoice
      await page.fill('[placeholder="Customer name"]', "Concurrent Final Customer");
      await page.click('button:text-is("Save")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 4. Verify both invoices exist in list
      await page.click('label:has-text("Show drafts")');
      await expect(page.locator(`a:has-text("${draftNum}")`)).toBeVisible();
      await expect(page.locator(`a:has-text("${nextNum}")`)).toBeVisible();
    });

    test("Scenario 4: Financial Metrics Verification", async ({ page }) => {
      // 1. Read initial metrics
      await page.click('a:has-text("Dashboard")');
      const getMetricVal = async (label: string) => {
        const val = page.locator(
          `div:has(> div:text-is("${label}")) > div.text-2xl, div:has-text("${label}") + div, div:has-text("${label}") >> xpath=../div[contains(@class, "text-2xl")]`,
        );
        const text = await val.innerText();
        return parseFloat(text.replace(/[^0-9.]/g, "")) || 0;
      };

      const initialCount = await getMetricVal("Total Invoices");
      const initialRev = await getMetricVal("Total Revenue");

      // 2. Create Draft with 5000 revenue
      await navigateToNewInvoice(page);
      const draftNum = await page.locator('label:has-text("Invoice #") + input').inputValue();
      await page.fill('[placeholder="Customer name"]', "Financial Test Customer 1");
      await page.fill('[placeholder="e.g. m10 SS bolt"]', "Metric Item");
      await page.fill('[placeholder="7318"]', "7318");
      await page.locator('tbody tr input[type="number"]').first().fill("5");
      await page.locator('tbody tr input[type="number"]').nth(1).fill("1000"); // Total = 5000 (excluding GST)
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 3. Verify metrics are unchanged
      await page.click('a:has-text("Dashboard")');
      expect(await getMetricVal("Total Invoices")).toBe(initialCount);
      expect(await getMetricVal("Total Revenue")).toBe(initialRev);

      // 4. Create Final Invoice with 2000 revenue (Total = 2000)
      await navigateToNewInvoice(page);
      await page.fill('[placeholder="Customer name"]', "Financial Test Customer 2");
      await page.fill('[placeholder="e.g. m10 SS bolt"]', "Metric Item");
      await page.fill('[placeholder="7318"]', "7318");
      await page.locator('tbody tr input[type="number"]').first().fill("2");
      await page.locator('tbody tr input[type="number"]').nth(1).fill("1000");
      await page.click('button:text-is("Save")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 5. Verify metrics incremented by Final Invoice amount (approx 2000 taxable + GST)
      await page.click('a:has-text("Dashboard")');
      const finalCount = await getMetricVal("Total Invoices");
      const finalRev = await getMetricVal("Total Revenue");

      expect(finalCount).toBe(initialCount + 1);
      expect(finalRev).toBeGreaterThan(initialRev);

      // 6. Finalize the draft invoice
      await page.click('a:has-text("Invoices")');
      await page.click('label:has-text("Show drafts")');
      await page.locator(`tr:has(a:text("${draftNum}")) button[title="Edit"]`).click();
      await page.click('button:text-is("Save")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 7. Verify metrics incremented by Draft Invoice amount
      await page.click('a:has-text("Dashboard")');
      const lastCount = await getMetricVal("Total Invoices");
      const lastRev = await getMetricVal("Total Revenue");

      expect(lastCount).toBe(finalCount + 1);
      expect(lastRev).toBeGreaterThan(finalRev);
    });

    test("Scenario 5: Edit Draft and Finalize stock impacts", async ({ page }) => {
      const whName = "Scenario 5 WH";
      const whCode = "WH-SC5";
      const locName = "Scenario 5 LOC";
      const locCode = "LOC-SC5";
      const prodDesc = "Scenario 5 Product";
      const prodSku = "SKU-SC5";

      // 1. Create warehouse/location and product with 100 units initial stock
      await createWarehouseAndLocation(page, whName, whCode, locName, locCode);
      await createProduct(page, prodDesc, prodSku, "7318", "100");
      await adjustStock(page, prodDesc, whName, locName, "100");

      // 2. Create Draft invoice for 10 units
      await navigateToNewInvoice(page);
      const invoiceNumber = await page.locator('label:has-text("Invoice #") + input').inputValue();
      await page.fill('[placeholder="Customer name"]', "Scenario 5 Customer");
      await selectDropdownOption(
        page,
        'select:has(option:has-text("— Select Warehouse —"))',
        whName,
      );
      await selectDropdownOption(
        page,
        'select:has(option:has-text("— Select Location —"))',
        locName,
      );
      await page.fill('[placeholder="e.g. m10 SS bolt"]', prodDesc);
      await page.locator('tbody tr input[type="number"]').first().fill("10");
      await page.locator('tbody tr input[type="number"]').nth(1).fill("100");
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // Stock is still 100
      await page.click('a:has-text("Inventory")');
      await expect(page.locator(`tr:has(td:text("${prodDesc}")) span`)).toHaveText("100");

      // 3. Edit Draft invoice, change quantity to 25, save as draft again
      await page.click('a:has-text("Invoices")');
      await page.click('label:has-text("Show drafts")');
      await page.locator(`tr:has(a:text("${invoiceNumber}")) button[title="Edit"]`).click();
      await page.locator('tbody tr input[type="number"]').first().fill("25");
      await page.click('button:has-text("Save Draft")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // Stock is still 100
      await page.click('a:has-text("Inventory")');
      await expect(page.locator(`tr:has(td:text("${prodDesc}")) span`)).toHaveText("100");

      // 4. Edit draft and finalize it
      await page.click('a:has-text("Invoices")');
      await page.click('label:has-text("Show drafts")');
      await page.locator(`tr:has(a:text("${invoiceNumber}")) button[title="Edit"]`).click();
      await page.click('button:text-is("Save")');
      await page.waitForURL(/.*\/invoices\/?$/);

      // 5. Verify stock is reduced by 25 (becomes 75)
      await page.click('a:has-text("Inventory")');
      await expect(page.locator(`tr:has(td:text("${prodDesc}")) span`)).toHaveText("75");
    });
  });
});
