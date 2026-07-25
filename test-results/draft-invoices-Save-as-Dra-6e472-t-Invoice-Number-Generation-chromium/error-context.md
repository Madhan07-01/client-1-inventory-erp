# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: draft-invoices.spec.ts >> Save as Draft E2E Suite >> Tier 4: Real-World Application Scenarios >> Scenario 3: Concurrent Invoice Number Generation
- Location: tests\draft-invoices.spec.ts:816:5

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for locator('label:has-text("Show drafts")')
    - locator resolved to <label class="flex items-center gap-2 text-xs text-muted-foreground">…</label>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="" data-title="">Update invoice counter: Could not find the 'head'…</div> from <section tabindex="-1" aria-live="polite" aria-atomic="false" aria-relevant="additions text" aria-label="Notifications alt+T">…</section> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <li tabindex="0" data-index="2" data-type="error" data-styled="true" data-front="false" data-mounted="true" data-swiped="false" data-visible="true" data-sonner-toast="" data-promise="false" data-removed="false" data-swiping="false" data-expanded="true" data-y-position="top" data-swipe-out="false" data-rich-colors="true" data-x-position="right" data-dismissible="true" class="group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:s…>…</li> from <section tabindex="-1" aria-live="polite" aria-atomic="false" aria-relevant="additions text" aria-label="Notifications alt+T">…</section> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    208 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <li tabindex="0" data-index="2" data-type="error" data-styled="true" data-front="false" data-mounted="true" data-swiped="false" data-visible="true" data-sonner-toast="" data-promise="false" data-removed="false" data-swiping="false" data-expanded="true" data-y-position="top" data-swipe-out="false" data-rich-colors="true" data-x-position="right" data-dismissible="true" class="group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:s…>…</li> from <section tabindex="-1" aria-live="polite" aria-atomic="false" aria-relevant="additions text" aria-label="Notifications alt+T">…</section> subtree intercepts pointer events
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - complementary [ref=e5]:
      - generic [ref=e6]:
        - img "logo" [ref=e7]
        - generic [ref=e8]:
          - generic [ref=e9]: MADEENA TRADERS
          - generic [ref=e10]: An Abdul Munaf Foundation Since 1980
          - generic [ref=e11]: Billing Suite
      - navigation [ref=e12]:
        - link "Dashboard" [ref=e13] [cursor=pointer]:
          - /url: /
          - img [ref=e14]
          - text: Dashboard
        - link "Customers" [ref=e19] [cursor=pointer]:
          - /url: /customers
          - img [ref=e20]
          - text: Customers
        - link "Invoices" [ref=e25] [cursor=pointer]:
          - /url: /invoices
          - img [ref=e26]
          - text: Invoices
        - link "Inventory" [ref=e29] [cursor=pointer]:
          - /url: /inventory
          - img [ref=e30]
          - text: Inventory
        - link "Quotations" [ref=e32] [cursor=pointer]:
          - /url: /quotations
          - img [ref=e33]
          - text: Quotations
        - link "Reports" [ref=e38] [cursor=pointer]:
          - /url: /reports
          - img [ref=e39]
          - text: Reports
        - link "Admin Scanner" [ref=e40] [cursor=pointer]:
          - /url: /admin-scanner
          - img [ref=e41]
          - text: Admin Scanner
        - link "Settings" [ref=e44] [cursor=pointer]:
          - /url: /settings
          - img [ref=e45]
          - text: Settings
      - generic [ref=e48]: v1.0 · Offline mode
    - generic [ref=e49]:
      - banner [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e52]: MADEENA TRADERS
          - generic [ref=e53]: An Abdul Munaf Foundation Since 1980
          - generic [ref=e54]: Sat, 25 Jul, 2026
        - button "Notifications, 2 unread" [ref=e55] [cursor=pointer]:
          - img
          - generic [ref=e56]: "2"
        - button "Sign out" [ref=e57] [cursor=pointer]:
          - img
          - generic [ref=e58]: Sign out
      - main [ref=e59]:
        - generic [ref=e60]:
          - generic [ref=e61]:
            - generic [ref=e62]:
              - heading "Invoices" [level=1] [ref=e63]
              - paragraph [ref=e64]: Generate, review, and export your bills.
            - button "New Invoice" [ref=e65] [cursor=pointer]:
              - img
              - text: New Invoice
          - generic [ref=e66]:
            - generic [ref=e67]:
              - generic [ref=e68]:
                - img [ref=e69]
                - textbox "Search invoice number or customer..." [ref=e72]
              - generic [ref=e73]:
                - checkbox "Show cancelled" [ref=e74]
                - text: Show cancelled
              - generic [ref=e75]:
                - checkbox "Show drafts" [ref=e76]
                - text: Show drafts
            - table [ref=e77]:
              - rowgroup [ref=e78]:
                - 'row "Invoice # Customer Date Total Actions" [ref=e79]':
                  - 'columnheader "Invoice #" [ref=e80]'
                  - columnheader "Customer" [ref=e81]
                  - columnheader "Date" [ref=e82]
                  - columnheader "Total" [ref=e83]
                  - columnheader "Actions" [ref=e84]
              - rowgroup [ref=e85]:
                - row "INV-0002 Concurrent Final Customer 25 Jul 2026 ₹0.00" [ref=e86]:
                  - cell "INV-0002" [ref=e87]:
                    - link "INV-0002" [ref=e88] [cursor=pointer]:
                      - /url: /invoices/c09b88ed-4fa7-4bd3-ac1e-2411c5d4ec0c
                  - cell "Concurrent Final Customer" [ref=e89]
                  - cell "25 Jul 2026" [ref=e90]
                  - cell "₹0.00" [ref=e91]
                  - cell [ref=e92]:
                    - generic [ref=e93]:
                      - button "Edit" [ref=e94] [cursor=pointer]:
                        - img
                      - button "Print" [ref=e95] [cursor=pointer]:
                        - img
                      - button "Cancel invoice" [ref=e96] [cursor=pointer]:
                        - img
                      - button "Delete" [ref=e97] [cursor=pointer]:
                        - img
            - button "Load Older Invoices" [ref=e99] [cursor=pointer]
  - region "Notifications alt+T":
    - list:
      - listitem [ref=e100]:
        - img [ref=e102]
        - generic [ref=e105]: "Update invoice counter: Could not find the 'head' column of 'company_settings' in the schema cache"
      - listitem [ref=e106]:
        - img [ref=e108]
        - generic [ref=e111]: Invoice saved
      - listitem [ref=e112]:
        - img [ref=e114]
        - generic [ref=e117]: "Update invoice counter: Could not find the 'head' column of 'company_settings' in the schema cache"
```

# Test source

```ts
  737 |       const locCode = "LOC-SC2";
  738 |       const prodDesc = "Scenario 2 Product";
  739 |       const prodSku = "SKU-SC2";
  740 | 
  741 |       // 1. Create warehouse/location and product with 50 units initial stock
  742 |       await createWarehouseAndLocation(page, whName, whCode, locName, locCode);
  743 |       await createProduct(page, prodDesc, prodSku, "7318", "150");
  744 |       await adjustStock(page, prodDesc, whName, locName, "50");
  745 | 
  746 |       // 2. Create Draft invoice for 10 units
  747 |       await navigateToNewInvoice(page);
  748 |       await page.fill('[placeholder="Customer name"]', "Warehouse Draft Customer");
  749 |       await selectDropdownOption(
  750 |         page,
  751 |         'select:has(option:has-text("— Select Warehouse —"))',
  752 |         whName,
  753 |       );
  754 |       await selectDropdownOption(
  755 |         page,
  756 |         'select:has(option:has-text("— Select Location —"))',
  757 |         locName,
  758 |       );
  759 |       await page.fill('[placeholder="e.g. m10 SS bolt"]', prodDesc);
  760 |       await page.locator('tbody tr input[type="number"]').first().fill("10");
  761 |       await page.locator('tbody tr input[type="number"]').nth(1).fill("150");
  762 |       await page.click('button:has-text("Save Draft")');
  763 |       await page.waitForURL(/.*\/invoices\/?$/);
  764 | 
  765 |       // 3. Verify stock is still 50
  766 |       await page.click('a:has-text("Inventory")');
  767 |       await expect(page.locator(`tr:has(td:text("${prodDesc}")) span`)).toHaveText("50");
  768 | 
  769 |       // 4. Create final invoice for 15 units
  770 |       await navigateToNewInvoice(page);
  771 |       await page.fill('[placeholder="Customer name"]', "Warehouse Final Customer");
  772 |       await selectDropdownOption(
  773 |         page,
  774 |         'select:has(option:has-text("— Select Warehouse —"))',
  775 |         whName,
  776 |       );
  777 |       await selectDropdownOption(
  778 |         page,
  779 |         'select:has(option:has-text("— Select Location —"))',
  780 |         locName,
  781 |       );
  782 |       await page.fill('[placeholder="e.g. m10 SS bolt"]', prodDesc);
  783 |       await page.locator('tbody tr input[type="number"]').first().fill("15");
  784 |       await page.locator('tbody tr input[type="number"]').nth(1).fill("150");
  785 |       await page.click('button:text-is("Save")');
  786 |       await page.waitForURL(/.*\/invoices\/?$/);
  787 | 
  788 |       // 5. Verify stock becomes 35
  789 |       await page.click('a:has-text("Inventory")');
  790 |       await expect(page.locator(`tr:has(td:text("${prodDesc}")) span`)).toHaveText("35");
  791 | 
  792 |       // 6. Delete draft and verify stock remains 35
  793 |       await page.click('a:has-text("Invoices")');
  794 |       await page.click('label:has-text("Show drafts")');
  795 |       await page
  796 |         .locator('tr:has(td:text("Warehouse Draft Customer")) button[title="Delete"]')
  797 |         .click();
  798 |       await page.click('button:has-text("Delete")');
  799 |       await page.waitForTimeout(1000);
  800 | 
  801 |       await page.click('a:has-text("Inventory")');
  802 |       await expect(page.locator(`tr:has(td:text("${prodDesc}")) span`)).toHaveText("35");
  803 | 
  804 |       // 7. Delete final and verify stock reverts to 50
  805 |       await page.click('a:has-text("Invoices")');
  806 |       await page
  807 |         .locator('tr:has(td:text("Warehouse Final Customer")) button[title="Delete"]')
  808 |         .click();
  809 |       await page.click('button:has-text("Delete")');
  810 |       await page.waitForTimeout(1000);
  811 | 
  812 |       await page.click('a:has-text("Inventory")');
  813 |       await expect(page.locator(`tr:has(td:text("${prodDesc}")) span`)).toHaveText("50");
  814 |     });
  815 | 
  816 |     test("Scenario 3: Concurrent Invoice Number Generation", async ({ page }) => {
  817 |       // 1. Create a draft invoice
  818 |       await navigateToNewInvoice(page);
  819 |       const draftNum = await page.locator('label:has-text("Invoice #") + input').inputValue();
  820 |       await page.fill('[placeholder="Customer name"]', "Concurrent Draft Customer");
  821 |       await page.click('button:has-text("Save Draft")');
  822 |       await page.waitForURL(/.*\/invoices\/?$/);
  823 | 
  824 |       // 2. Go to New Invoice page again immediately
  825 |       await navigateToNewInvoice(page);
  826 |       const nextNum = await page.locator('label:has-text("Invoice #") + input').inputValue();
  827 | 
  828 |       // Verify the next number is incremented and not clashing
  829 |       expect(nextNum).not.toBe(draftNum);
  830 | 
  831 |       // 3. Save as Finalized Invoice
  832 |       await page.fill('[placeholder="Customer name"]', "Concurrent Final Customer");
  833 |       await page.click('button:text-is("Save")');
  834 |       await page.waitForURL(/.*\/invoices\/?$/);
  835 | 
  836 |       // 4. Verify both invoices exist in list
> 837 |       await page.click('label:has-text("Show drafts")');
      |                  ^ Error: page.click: Test timeout of 120000ms exceeded.
  838 |       await expect(page.locator(`a:has-text("${draftNum}")`)).toBeVisible();
  839 |       await expect(page.locator(`a:has-text("${nextNum}")`)).toBeVisible();
  840 |     });
  841 | 
  842 |     test("Scenario 4: Financial Metrics Verification", async ({ page }) => {
  843 |       // 1. Read initial metrics
  844 |       await page.click('a:has-text("Dashboard")');
  845 |       const getMetricVal = async (label: string) => {
  846 |         const val = page.locator(
  847 |           `div:has(> div:text-is("${label}")) > div.text-2xl, div:has-text("${label}") + div, div:has-text("${label}") >> xpath=../div[contains(@class, "text-2xl")]`,
  848 |         );
  849 |         const text = await val.innerText();
  850 |         return parseFloat(text.replace(/[^0-9.]/g, "")) || 0;
  851 |       };
  852 | 
  853 |       const initialCount = await getMetricVal("Total Invoices");
  854 |       const initialRev = await getMetricVal("Total Revenue");
  855 | 
  856 |       // 2. Create Draft with 5000 revenue
  857 |       await navigateToNewInvoice(page);
  858 |       const draftNum = await page.locator('label:has-text("Invoice #") + input').inputValue();
  859 |       await page.fill('[placeholder="Customer name"]', "Financial Test Customer 1");
  860 |       await page.fill('[placeholder="e.g. m10 SS bolt"]', "Metric Item");
  861 |       await page.fill('[placeholder="7318"]', "7318");
  862 |       await page.locator('tbody tr input[type="number"]').first().fill("5");
  863 |       await page.locator('tbody tr input[type="number"]').nth(1).fill("1000"); // Total = 5000 (excluding GST)
  864 |       await page.click('button:has-text("Save Draft")');
  865 |       await page.waitForURL(/.*\/invoices\/?$/);
  866 | 
  867 |       // 3. Verify metrics are unchanged
  868 |       await page.click('a:has-text("Dashboard")');
  869 |       expect(await getMetricVal("Total Invoices")).toBe(initialCount);
  870 |       expect(await getMetricVal("Total Revenue")).toBe(initialRev);
  871 | 
  872 |       // 4. Create Final Invoice with 2000 revenue (Total = 2000)
  873 |       await navigateToNewInvoice(page);
  874 |       await page.fill('[placeholder="Customer name"]', "Financial Test Customer 2");
  875 |       await page.fill('[placeholder="e.g. m10 SS bolt"]', "Metric Item");
  876 |       await page.fill('[placeholder="7318"]', "7318");
  877 |       await page.locator('tbody tr input[type="number"]').first().fill("2");
  878 |       await page.locator('tbody tr input[type="number"]').nth(1).fill("1000");
  879 |       await page.click('button:text-is("Save")');
  880 |       await page.waitForURL(/.*\/invoices\/?$/);
  881 | 
  882 |       // 5. Verify metrics incremented by Final Invoice amount (approx 2000 taxable + GST)
  883 |       await page.click('a:has-text("Dashboard")');
  884 |       const finalCount = await getMetricVal("Total Invoices");
  885 |       const finalRev = await getMetricVal("Total Revenue");
  886 | 
  887 |       expect(finalCount).toBe(initialCount + 1);
  888 |       expect(finalRev).toBeGreaterThan(initialRev);
  889 | 
  890 |       // 6. Finalize the draft invoice
  891 |       await page.click('a:has-text("Invoices")');
  892 |       await page.click('label:has-text("Show drafts")');
  893 |       await page.locator(`tr:has(a:text("${draftNum}")) button[title="Edit"]`).click();
  894 |       await page.click('button:text-is("Save")');
  895 |       await page.waitForURL(/.*\/invoices\/?$/);
  896 | 
  897 |       // 7. Verify metrics incremented by Draft Invoice amount
  898 |       await page.click('a:has-text("Dashboard")');
  899 |       const lastCount = await getMetricVal("Total Invoices");
  900 |       const lastRev = await getMetricVal("Total Revenue");
  901 | 
  902 |       expect(lastCount).toBe(finalCount + 1);
  903 |       expect(lastRev).toBeGreaterThan(finalRev);
  904 |     });
  905 | 
  906 |     test("Scenario 5: Edit Draft and Finalize stock impacts", async ({ page }) => {
  907 |       const whName = "Scenario 5 WH";
  908 |       const whCode = "WH-SC5";
  909 |       const locName = "Scenario 5 LOC";
  910 |       const locCode = "LOC-SC5";
  911 |       const prodDesc = "Scenario 5 Product";
  912 |       const prodSku = "SKU-SC5";
  913 | 
  914 |       // 1. Create warehouse/location and product with 100 units initial stock
  915 |       await createWarehouseAndLocation(page, whName, whCode, locName, locCode);
  916 |       await createProduct(page, prodDesc, prodSku, "7318", "100");
  917 |       await adjustStock(page, prodDesc, whName, locName, "100");
  918 | 
  919 |       // 2. Create Draft invoice for 10 units
  920 |       await navigateToNewInvoice(page);
  921 |       const invoiceNumber = await page.locator('label:has-text("Invoice #") + input').inputValue();
  922 |       await page.fill('[placeholder="Customer name"]', "Scenario 5 Customer");
  923 |       await selectDropdownOption(
  924 |         page,
  925 |         'select:has(option:has-text("— Select Warehouse —"))',
  926 |         whName,
  927 |       );
  928 |       await selectDropdownOption(
  929 |         page,
  930 |         'select:has(option:has-text("— Select Location —"))',
  931 |         locName,
  932 |       );
  933 |       await page.fill('[placeholder="e.g. m10 SS bolt"]', prodDesc);
  934 |       await page.locator('tbody tr input[type="number"]').first().fill("10");
  935 |       await page.locator('tbody tr input[type="number"]').nth(1).fill("100");
  936 |       await page.click('button:has-text("Save Draft")');
  937 |       await page.waitForURL(/.*\/invoices\/?$/);
```