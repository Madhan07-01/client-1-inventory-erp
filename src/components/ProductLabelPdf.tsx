import React from "react";
import * as ReactDOMServer from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import type { ProductMasterEntry, InventoryStock, Settings } from "@/lib/types";

/**
 * Generates an HTML string for a printable QR product specification label,
 * scaled to occupy a 4x6 inch paper with two labels (top and bottom) separated by a cutting line.
 */
export function buildLabelHtml(
  batch: InventoryStock,
  product: ProductMasterEntry,
  warehouseName: string,
  locationName: string,
  _company?: Settings["company"]
) {
  // Store only the Warehouse Ledger ID in the QR
  const qrPayload = batch.id || "";

  const isAcid = String(batch.category || "").trim().toLowerCase() === "acid";

  let rawQrSvg = "";
  try {
    rawQrSvg = ReactDOMServer.renderToString(
      React.createElement(QRCodeSVG, {
        value: qrPayload,
        size: 160,
        level: "M",
        marginSize: 0, // Control margin entirely via CSS padding for sharper control
      })
    );
  } catch (_err) {
    rawQrSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#000"/></svg>';
  }

  if (!rawQrSvg.includes('xmlns=')) {
    rawQrSvg = rawQrSvg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  const qrBase64 = btoa(unescape(encodeURIComponent(rawQrSvg)));
  const qrImgSrc = `data:image/svg+xml;base64,${qrBase64}`;

  const skuHeader = (product.sku || product.description || "").toUpperCase();

  let threadDisplay = (batch.thread || "-").trim();
  if (threadDisplay.toLowerCase() === "half" || threadDisplay.toLowerCase() === "full") {
    threadDisplay += " Thread";
  }

  const labelContentHtml = `
    <div class="solid-line"></div>
    <div class="label-content">
      <div class="left-section">
        <div class="qr-wrapper">
          <img src="${qrImgSrc}" alt="QR Code" />
        </div>
        <div class="item-type-header">${skuHeader}</div>
      </div>
      <div class="right-section">
        <table class="specs-table">
          <tr>
            <td class="label-col">Brand</td>
            <td class="value-col">${batch.brandName || "—"}</td>
          </tr>
          <tr>
            <td class="label-col">Lot Number</td>
            <td class="value-col">${batch.lotNo || "—"}</td>
          </tr>
          <tr>
            <td class="label-col">Finish</td>
            <td class="value-col">${batch.finish || "—"}</td>
          </tr>
          <tr>
            <td class="label-col">Grade</td>
            <td class="value-col">${batch.grade || "—"}</td>
          </tr>
          <tr>
            <td class="label-col">Thread Type</td>
            <td class="value-col">${threadDisplay}</td>
          </tr>
          ${batch.customField1 && !batch.hideCustomField1 ? `
          <tr>
            <td colspan="2" class="custom-spec">${batch.customField1}</td>
          </tr>` : ""}
          ${batch.customField2 && !batch.hideCustomField2 ? `
          <tr>
            <td colspan="2" class="custom-spec">${batch.customField2}</td>
          </tr>` : ""}
          ${batch.customField3 && !batch.hideCustomField3 ? `
          <tr>
            <td colspan="2" class="custom-spec">${batch.customField3}</td>
          </tr>` : ""}
        </table>
      </div>
    </div>
    <div class="solid-line"></div>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Print Label - ${product.sku || product.description}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          
          * {
            box-sizing: border-box;
          }

          @page {
            size: 6in 4in;
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: white;
            color: #000;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            -webkit-print-color-adjust: exact;
          }

          .page-container {
            width: 6in;
            height: 4in;
            display: flex;
            flex-direction: row;
            position: relative;
            background: #fff;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .cutting-line {
            position: absolute;
            top: 0;
            left: 3in;
            height: 4in;
            border-left: 1px dashed #666;
            z-index: 10;
          }

          .label-half {
            width: 3in;
            height: 4in;
            padding: 0.1in 0.12in;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }

          .solid-line {
            width: 100%;
            height: 2px;
            background-color: #000;
            flex-shrink: 0;
          }

          .label-content {
            display: flex;
            flex-direction: row;
            width: 100%;
            height: 1.75in;
            align-items: center;
            justify-content: center;
            padding: 5px 0;
            gap: 10px;
            overflow: hidden;
          }

          .left-section {
            width: 40%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .right-section {
            width: 60%;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .qr-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 4px;
          }

          .qr-wrapper img {
            display: block;
            width: 1.1in !important;
            height: 1.1in !important;
            max-width: 1.1in;
            max-height: 1.1in;
            object-fit: contain;
            ${isAcid ? "padding: 2px; border: 1px solid #000; border-radius: 0;" : "padding: 0; border: none;"}
            background-color: white;
          }

          .item-type-header {
            text-align: center;
            font-size: 12pt;
            font-weight: 800;
            color: #111;
            text-transform: uppercase;
            margin: 0 0 2px 0;
            line-height: 1.1;
            word-break: break-word;
            letter-spacing: -0.2px;
          }

          .size-header {
            text-align: center;
            font-size: 11pt;
            font-weight: 700;
            color: #222;
            margin: 0;
            line-height: 1.1;
          }

          .specs-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
            line-height: 1.25;
          }

          .specs-table td {
            padding: 1px 0;
            vertical-align: top;
          }

          .specs-table .label-col {
            font-weight: 700;
            width: 45%;
            white-space: nowrap;
            color: #111;
          }

          .specs-table .value-col {
            font-weight: 600;
            word-break: break-word;
            color: #222;
          }
            
          .custom-spec {
            font-weight: 700;
            padding-top: 2px !important;
            color: #111;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <div class="cutting-line"></div>
          
          <!-- Top Label -->
          <div class="label-half">
            ${labelContentHtml}
          </div>
          
          <!-- Bottom Label -->
          <div class="label-half">
            ${labelContentHtml}
          </div>
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
    "width=600,height=600,toolbar=no,menubar=no,scrollbars=yes",
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

export async function downloadProductLabel(
  batch: InventoryStock,
  product: ProductMasterEntry,
  warehouseName: string,
  locationName: string,
  company?: Settings["company"]
) {
  if (!product.sku) {
    alert("This product needs an SKU before downloading a label.");
    return;
  }

  const html = buildLabelHtml(batch, product, warehouseName, locationName, company);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:6in;height:4in;border:0;background:#fff;";
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
      iframe.addEventListener("error", () => reject(new Error("iframe load failed")), {
        once: true,
      });
      const doc = iframe.contentDocument;
      if (!doc) {
        reject(new Error("iframe document unavailable"));
        return;
      }
      doc.open();
      doc.write(html);
      doc.close();
    });

    const idoc = iframe.contentDocument!;
    const pageEl = idoc.querySelector(".page-container") as HTMLElement | null;
    if (!pageEl) throw new Error("Label page element not found");

    const canvas = await html2canvas(pageEl, {
      scale: 3,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "in",
      format: [6, 4]
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    
    const safeName = (product.sku || "label").replace(/[^a-zA-Z0-9-]/g, "_");
    pdf.save(`label_${safeName}.pdf`);
  } catch (error) {
    console.error("Failed to generate Label PDF:", error);
    alert("Failed to generate PDF. See console for details.");
  } finally {
    document.body.removeChild(iframe);
  }
}
