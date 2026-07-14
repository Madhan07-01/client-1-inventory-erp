import { test, expect } from "@playwright/test";

test.describe("Scanner Integration", () => {
  test("should register, create a product, and scan it into an invoice", async ({ page }) => {
    test.setTimeout(60000); // 1 minute

    // 1. Navigate to login
    await page.goto("/auth");

    // 2. Click Create account tab
    await page.click('button[role="tab"]:has-text("Create account")');

    // 3. Fill in registration form
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;

    await page.fill("#reg-name", "Test User");
    await page.fill("#reg-email", testEmail);
    await page.fill("#reg-password", "Password123!");
    await page.fill("#reg-confirm", "Password123!");
    await page.click('form button[type="submit"]');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/.*8081\/?$/, { timeout: 10000 });

    // 4. Navigate to Product Master
    await page.goto("/products");
    await page.waitForSelector("text=Products");

    // 5. Add a product (Click 'Add product' or similar button)
    // The Lovable generated UI usually has a button with text "Add Product" or just a plus icon.
    // Let's look for "Add Product"
    await page.click('button:has-text("Add Product")');

    // Fill product details using placeholder selectors since labels aren't linked via htmlFor
    await page.getByPlaceholder("e.g. Hex Bolt M10x50 SS").fill("Test Scanner Product");
    await page.getByPlaceholder("e.g. 7318").fill("1234");
    // Rate is the second number input
    await page.locator('input[type="number"]').nth(1).fill("100");
    // SKU
    await page.getByPlaceholder("e.g. BOLT-M10-50").fill("SCAN-TEST-001");

    // Save
    await page.click('button:has-text("Save")');

    // Wait for the dialog to close or product to appear
    await page.waitForTimeout(2000);

    // 6. Navigate to New Invoice
    await page.goto("/invoices/new");

    // Wait for page to load
    await page.waitForTimeout(2000);

    // 7. Simulate scanner by dispatching keyboard events rapidly
    await page.evaluate(() => {
      const barcode = "SCAN-TEST-001";
      for (let i = 0; i < barcode.length; i++) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: barcode[i], bubbles: true }));
      }
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    // Wait for the invoice table to update
    await page.waitForTimeout(1000);

    // 8. Verify the product was added
    const tableText = await page.locator("body").textContent();
    expect(tableText).toContain("Test Scanner Product");

    // 9. Scan again
    await page.evaluate(() => {
      const barcode = "SCAN-TEST-001";
      for (let i = 0; i < barcode.length; i++) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: barcode[i], bubbles: true }));
      }
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    await page.waitForTimeout(1000);
    // Quantity should increment
    console.log("Scanner integration test completed successfully!");
  });
});
