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

  let rawQrSvg = ReactDOMServer.renderToString(
    <QRCodeSVG
      value={qrPayload}
      size={120}
      level="M"
      includeMargin={false}
    />,
  );

  if (!rawQrSvg.includes('xmlns=')) {
    rawQrSvg = rawQrSvg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  const qrBase64 = btoa(unescape(encodeURIComponent(rawQrSvg)));
  const qrImgSrc = `data:image/svg+xml;base64,${qrBase64}`;

  const itemTypeHeader = (product.itemType || "BOLT NUT").toUpperCase();
  const productSize = (batch.size || "").trim();
  const isNew = (batch.category ?? "Acid") === "New";

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
            size: 3in 2in landscape;
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
            width: 3in;
            height: 2in;
            background: white;
            color: #000;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            -webkit-print-color-adjust: exact;
            overflow: hidden;
          }

          @media print {
            html, body {
              width: 3in;
              height: 2in;
            }
            .print-label {
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0.1in !important;
              border: none !important;
            }
          }

          .print-label {
            width: 3in;
            height: 2in;
            margin: 0 auto;
            padding: 0.1in;
            display: flex;
            flex-direction: column;
            background: #fff;
            page-break-after: avoid;
            page-break-before: avoid;
            break-inside: avoid;
          }

          .dotted-lines {
            width: 100%;
            height: 4px;
            border-top: 1px dotted #000;
            border-bottom: 1px dotted #000;
            margin-bottom: 6px;
            flex-shrink: 0;
          }

          .label-content {
            display: flex;
            flex-direction: row;
            flex: 1;
            width: 100%;
            align-items: center;
          }

          .left-section {
            width: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding-right: 4px;
          }

          .right-section {
            width: 50%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding-left: 4px;
          }

          .qr-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 6px;
          }

          .qr-wrapper img {
            display: block;
            width: 70px !important;
            height: 70px !important;
            max-width: 70px;
            max-height: 70px;
            object-fit: contain;
          }

          .qr-border {
            display: inline-block;
            border: 1.5px solid #000;
            padding: 2px;
            line-height: 0;
          }

          .item-type-header {
            text-align: center;
            font-size: 11pt;
            font-weight: 800;
            color: #000;
            text-transform: uppercase;
            margin: 0 0 4px 0;
            line-height: 1.1;
            word-break: break-word;
          }

          .size-header {
            text-align: center;
            font-size: 9pt;
            font-weight: 700;
            color: #111;
            margin: 0;
            line-height: 1.1;
          }

          .specs-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
            line-height: 1.3;
          }

          .specs-table td {
            padding: 1px 0;
            vertical-align: top;
          }

          .specs-table .label-col {
            font-weight: 600;
            width: 45%;
            white-space: nowrap;
          }

          .specs-table .value-col {
            font-weight: 400;
            word-break: break-word;
          }
        </style>
      </head>
      <body>
        <div class="print-label">
          <div class="dotted-lines"></div>
          <div class="label-content">
            <div class="left-section">
              <div class="qr-wrapper">
                ${isNew
                  ? `<div class="qr-border"><img src="${qrImgSrc}" alt="QR Code" width="70" height="70" /></div>`
                  : `<img src="${qrImgSrc}" alt="QR Code" width="70" height="70" />`
                }
              </div>
              <div class="item-type-header">${itemTypeHeader}</div>
              ${productSize ? `<div class="size-header">${productSize}</div>` : ""}
            </div>
            <div class="right-section">
              <table class="specs-table">
                <tr>
                  <td class="label-col">Brand</td>
                  <td class="value-col">${batch.brandName || "—"}</td>
                </tr>
                <tr>
                  <td class="label-col">Lot No</td>
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
                  <td class="label-col">Thread</td>
                  <td class="value-col">${batch.thread || "—"}</td>
                </tr>
                ${batch.customField1 && !batch.hideCustomField1 ? `
                <tr>
                  <td colspan="2" class="value-col" style="padding-top: 2px;">${batch.customField1}</td>
                </tr>` : ""}
                ${batch.customField2 && !batch.hideCustomField2 ? `
                <tr>
                  <td colspan="2" class="value-col">${batch.customField2}</td>
                </tr>` : ""}
                ${batch.customField3 && !batch.hideCustomField3 ? `
                <tr>
                  <td colspan="2" class="value-col">${batch.customField3}</td>
                </tr>` : ""}
              </table>
            </div>
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
    "width=600,height=400,toolbar=no,menubar=no,scrollbars=yes",
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
    "position:fixed;left:-10000px;top:0;width:3in;height:2in;border:0;background:#fff;";
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
    const pageEl = idoc.querySelector(".print-label") as HTMLElement | null;
    if (!pageEl) throw new Error("Label page element not found");

    const canvas = await html2canvas(pageEl, {
      scale: 4,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "in",
      format: [3, 2]
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
