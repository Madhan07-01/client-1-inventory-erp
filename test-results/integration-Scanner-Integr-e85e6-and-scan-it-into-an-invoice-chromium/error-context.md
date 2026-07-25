# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: integration.spec.ts >> Scanner Integration >> should register, create a product, and scan it into an invoice
- Location: tests\integration.spec.ts:4:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('text=Products') to be visible

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - heading "404" [level=1] [ref=e6]
    - heading "Page not found" [level=2] [ref=e7]
    - paragraph [ref=e8]: The page you're looking for doesn't exist or has been moved.
    - link "Go home" [ref=e10] [cursor=pointer]:
      - /url: /
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Scanner Integration", () => {
  4  |   test("should register, create a product, and scan it into an invoice", async ({ page }) => {
  5  |     test.setTimeout(60000); // 1 minute
  6  | 
  7  |     // 1. Navigate to login
  8  |     await page.goto("/auth");
  9  | 
  10 |     // 2. Click Create account tab
  11 |     await page.click('button[role="tab"]:has-text("Create account")');
  12 | 
  13 |     // 3. Fill in registration form
  14 |     const timestamp = Date.now();
  15 |     const testEmail = `test${timestamp}@example.com`;
  16 | 
  17 |     await page.fill("#reg-name", "Test User");
  18 |     await page.fill("#reg-email", testEmail);
  19 |     await page.fill("#reg-password", "Password123!");
  20 |     await page.fill("#reg-confirm", "Password123!");
  21 |     await page.click('form button[type="submit"]');
  22 | 
  23 |     // Wait for navigation to dashboard
  24 |     await expect(page).toHaveURL(/.*8081\/?$/, { timeout: 10000 });
  25 | 
  26 |     // 4. Navigate to Product Master
  27 |     await page.goto("/products");
> 28 |     await page.waitForSelector("text=Products");
     |                ^ Error: page.waitForSelector: Test timeout of 60000ms exceeded.
  29 | 
  30 |     // 5. Add a product (Click 'Add product' or similar button)
  31 |     // The Lovable generated UI usually has a button with text "Add Product" or just a plus icon.
  32 |     // Let's look for "Add Product"
  33 |     await page.click('button:has-text("Add Product")');
  34 | 
  35 |     // Fill product details using placeholder selectors since labels aren't linked via htmlFor
  36 |     await page.getByPlaceholder("e.g. Hex Bolt M10x50 SS").fill("Test Scanner Product");
  37 |     await page.getByPlaceholder("e.g. 7318").fill("1234");
  38 |     // Rate is the second number input
  39 |     await page.locator('input[type="number"]').nth(1).fill("100");
  40 |     // SKU
  41 |     await page.getByPlaceholder("e.g. BOLT-M10-50").fill("SCAN-TEST-001");
  42 | 
  43 |     // Save
  44 |     await page.click('button:has-text("Save")');
  45 | 
  46 |     // Wait for the dialog to close or product to appear
  47 |     await page.waitForTimeout(2000);
  48 | 
  49 |     // 6. Navigate to New Invoice
  50 |     await page.goto("/invoices/new");
  51 | 
  52 |     // Wait for page to load
  53 |     await page.waitForTimeout(2000);
  54 | 
  55 |     // 7. Simulate scanner by dispatching keyboard events rapidly
  56 |     await page.evaluate(() => {
  57 |       const barcode = "SCAN-TEST-001";
  58 |       for (let i = 0; i < barcode.length; i++) {
  59 |         window.dispatchEvent(new KeyboardEvent("keydown", { key: barcode[i], bubbles: true }));
  60 |       }
  61 |       window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  62 |     });
  63 | 
  64 |     // Wait for the invoice table to update
  65 |     await page.waitForTimeout(1000);
  66 | 
  67 |     // 8. Verify the product was added
  68 |     const tableText = await page.locator("body").textContent();
  69 |     expect(tableText).toContain("Test Scanner Product");
  70 | 
  71 |     // 9. Scan again
  72 |     await page.evaluate(() => {
  73 |       const barcode = "SCAN-TEST-001";
  74 |       for (let i = 0; i < barcode.length; i++) {
  75 |         window.dispatchEvent(new KeyboardEvent("keydown", { key: barcode[i], bubbles: true }));
  76 |       }
  77 |       window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  78 |     });
  79 | 
  80 |     await page.waitForTimeout(1000);
  81 |     // Quantity should increment
  82 |     console.log("Scanner integration test completed successfully!");
  83 |   });
  84 | });
  85 | 
```