import { test, expect } from "@playwright/test";
import { buildLabelHtml } from "../src/components/ProductLabelPdf";
import type { InventoryStock, ProductMasterEntry } from "../src/lib/types";

const mockBatch: InventoryStock = {
  id: "wh-ledger-123",
  sku: "M10-HEX-50",
  size: "M10 x 50mm",
  brandName: "FastenCo",
  lotNo: "LOT-2026-001",
  finish: "Zinc Plated",
  grade: "8.8",
  thread: "Full Thread",
  category: "New",
  quantity: 100,
  warehouseId: "wh-1",
  locationId: "loc-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockProduct: ProductMasterEntry = {
  id: "prod-123",
  sku: "M10-HEX-50",
  itemType: "HEX BOLT",
  description: "Hexagon Bolt M10x50 Zinc",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

test.describe("ProductLabelPdf - buildLabelHtml Print Styling", () => {
  test("enforces exact @page margin directive (0.33in 0.13in 0.46in 0.11in)", () => {
    const html = buildLabelHtml(mockBatch, mockProduct, "Main Warehouse", "Rack A1");
    expect(html).toContain("@page");
    expect(html).toContain("margin: 0.33in 0.13in 0.46in 0.11in;");
  });

  test("applies 80% label dimension scaling (2.4in x 1.6in)", () => {
    const html = buildLabelHtml(mockBatch, mockProduct, "Main Warehouse", "Rack A1");
    expect(html).toContain("width: 2.4in;");
    expect(html).toContain("height: 1.6in;");
    expect(html).toContain("width: 56px !important;");
    expect(html).toContain("height: 56px !important;");
    expect(html).toContain('width="56"');
    expect(html).toContain('height="56"');
    expect(html).toContain("font-size: 8.8pt;");
    expect(html).toContain("font-size: 7.2pt;");
    expect(html).toContain("font-size: 6.4pt;");
  });

  test("includes vertical stacking rules and removes single-label restrictions", () => {
    const html = buildLabelHtml(mockBatch, mockProduct, "Main Warehouse", "Rack A1");
    expect(html).toContain("break-inside: avoid;");
    expect(html).toContain("page-break-inside: avoid;");
    expect(html).toContain("margin-bottom: 0.125in;");
    // Ensure overflow: hidden and fixed 3in x 2in body dimensions are removed
    expect(html).not.toContain("overflow: hidden;");
    expect(html).not.toContain("width: 3in;");
    expect(html).not.toContain("height: 2in;");
  });

  test("generates valid HTML string with correct product information", () => {
    const html = buildLabelHtml(mockBatch, mockProduct, "Main Warehouse", "Rack A1");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("HEX BOLT");
    expect(html).toContain("M10 x 50mm");
    expect(html).toContain("FastenCo");
    expect(html).toContain("LOT-2026-001");
    expect(html).toContain("Zinc Plated");
    expect(html).toContain("8.8");
    expect(html).toContain("Full Thread");
  });
});


