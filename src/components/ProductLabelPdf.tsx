import * as ReactDOMServer from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import type { ProductMasterEntry, InventoryStock, Settings } from "@/lib/types";

/**
 * Generates an HTML string for a printable QR product specification label,
 * scaled to occupy ~90% of the printable A4 page in a single page layout.
 */
function buildLabelHtml(
  batch: InventoryStock,
  product: ProductMasterEntry,
  warehouseName: string,
  locationName: string,
  _company?: Settings["company"]
) {
  // Store only the Warehouse Ledger ID in the QR
  const qrPayload = batch.id || "";

  const qrSvgString = ReactDOMServer.renderToString(
    <QRCodeSVG
      value={qrPayload}
      size={250}
      level="M"
      includeMargin={false}
    />,
  );

  const itemTypeHeader = (product.itemType || "BOLT NUT WASHER SET").toUpperCase();
  const productSize = (batch.size || product.size || "").trim();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Print Label - ${product.sku || product.description}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          
          * {
            box-sizing: border-box;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: auto;
            background: white;
            color: #000;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            -webkit-print-color-adjust: exact;
          }

          @media print {
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: auto;
            }
            .page-break {
              display: none;
            }
            .print-label {
              width: 90% !important;
              max-width: none !important;
              min-height: 90vh !important;
              margin: auto !important;
              padding: 24px !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
              break-inside: avoid !important;
            }
          }

          .print-label {
            width: 90%;
            max-width: none;
            min-height: 90vh;
            margin: 20px auto;
            padding: 28px;
            border: 2.5px solid #000;
            border-radius: 8px;
            background: #fff;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            page-break-after: avoid;
            page-break-before: avoid;
            break-inside: avoid;
          }

          .item-type-header {
            text-align: center;
            font-size: 30px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-top: 0;
            margin-bottom: ${productSize ? "8px" : "20px"};
            color: #000;
            text-transform: uppercase;
          }

          .size-header {
            text-align: center;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.3px;
            margin-bottom: 16px;
            color: #111;
          }

          .qr-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 12px 0 24px 0;
          }

          .qr-wrapper svg {
            display: block;
            margin: 0 auto;
            width: 250px;
            height: 250px;
          }

          .divider {
            border-top: 2px dashed #000;
            margin: 20px 0 24px 0;
          }

          .specs-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 17px;
            line-height: 1.8;
          }

          .specs-table td {
            padding: 8px 6px;
            vertical-align: top;
          }

          .specs-table .label-col {
            font-weight: 700;
            width: 200px;
            white-space: nowrap;
          }

          .specs-table .separator-col {
            width: 30px;
            text-align: center;
            font-weight: 700;
          }

          .specs-table .value-col {
            font-weight: 600;
            word-break: break-word;
          }
        </style>
      </head>
      <body>
        <div class="print-label">
          <div class="item-type-header">${itemTypeHeader}</div>
          ${productSize ? `<div class="size-header">Size : ${productSize}</div>` : ""}
          
          <div class="qr-wrapper">
            ${qrSvgString}
          </div>

          <div class="divider"></div>

          <table class="specs-table">
            <tr>
              <td class="label-col">SKU</td>
              <td class="separator-col">:</td>
              <td class="value-col">${product.sku || "—"}</td>
            </tr>
            <tr>
              <td class="label-col">Description</td>
              <td class="separator-col">:</td>
              <td class="value-col">${product.description || "—"}</td>
            </tr>
            <tr>
              <td class="label-col">Brand</td>
              <td class="separator-col">:</td>
              <td class="value-col">${batch.brandName || product.brandName || "—"}</td>
            </tr>
            <tr>
              <td class="label-col">Lot Number</td>
              <td class="separator-col">:</td>
              <td class="value-col">${batch.lotNo || "—"}</td>
            </tr>
            <tr>
              <td class="label-col">Warehouse</td>
              <td class="separator-col">:</td>
              <td class="value-col">${warehouseName} ${locationName ? `(${locationName})` : ""}</td>
            </tr>
            <tr>
              <td class="label-col">Current Stock</td>
              <td class="separator-col">:</td>
              <td class="value-col">${batch.quantity}</td>
            </tr>
            <tr>
              <td class="label-col">Finish</td>
              <td class="separator-col">:</td>
              <td class="value-col">${batch.finish || "—"}</td>
            </tr>
            <tr>
              <td class="label-col">Grade</td>
              <td class="separator-col">:</td>
              <td class="value-col">${batch.grade || "—"}</td>
            </tr>
            <tr>
              <td class="label-col">Thread Type</td>
              <td class="separator-col">:</td>
              <td class="value-col">${batch.thread || "—"}</td>
            </tr>
            <tr>
              <td class="label-col">Print Date</td>
              <td class="separator-col">:</td>
              <td class="value-col">${new Date().toLocaleDateString("en-IN")}</td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;
}

export function printProductLabel(
  batch: InventoryStock,
  product: ProductMasterEntry,
  warehouseName: string,
  locationName: string,
  company?: Settings["company"]
) {
  if (!product.sku) {
    alert("This product needs an SKU before printing a label.");
    return;
  }

  const html = buildLabelHtml(batch, product, warehouseName, locationName, company);

  const popup = window.open(
    "",
    "_blank",
    "width=800,height=1000,toolbar=no,menubar=no,scrollbars=yes",
  );
  if (!popup) {
    alert("Popup blocked. Please allow popups to print labels.");
    return;
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();

  setTimeout(() => {
    popup.focus();
    popup.print();
    setTimeout(() => {
      popup.close();
    }, 100);
  }, 300);
}
