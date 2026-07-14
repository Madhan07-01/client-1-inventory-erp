import * as ReactDOMServer from "react-dom/server";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import type { ProductMasterEntry, Settings } from "@/lib/types";

/**
 * Generates an HTML string for a single product label, optimized for a
 * typical thermal barcode label printer (e.g. 50mm x 25mm).
 */
function buildLabelHtml(product: ProductMasterEntry, company: Settings["company"]) {
  // We use ReactDOMServer to render the React components to static HTML
  const barcodeSvgString = ReactDOMServer.renderToString(
    <Barcode
      value={product.sku || product.description}
      format="CODE128"
      width={1.2}
      height={30}
      fontSize={10}
      margin={0}
      displayValue={true}
    />,
  );

  const qrSvgString = ReactDOMServer.renderToString(
    <QRCodeSVG
      value={product.sku || product.description}
      size={50}
      level="M"
      includeMargin={false}
    />,
  );

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Label - ${product.sku}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          /* Label size setup: 50mm x 25mm is common for product labels */
          @page {
            size: 50mm 25mm;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 2mm;
            width: 46mm;
            height: 21mm;
            box-sizing: border-box;
            font-family: 'Inter', sans-serif;
            background: white;
            color: black;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .company {
            font-size: 6pt;
            font-weight: 700;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 1mm;
          }
          
          .desc {
            font-size: 5pt;
            font-weight: 500;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 2mm;
          }
          
          .code-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex: 1;
          }
          
          .barcode-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            overflow: hidden;
          }
          
          .qr-container {
            width: 15mm;
            height: 15mm;
            display: flex;
            justify-content: flex-end;
            align-items: center;
          }
          
          svg {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div class="company">${company.name || "Madeena Traders"}</div>
        <div class="desc">${product.description}</div>
        <div class="code-row">
          <div class="barcode-container">
            ${barcodeSvgString}
          </div>
          <div class="qr-container">
            ${qrSvgString}
          </div>
        </div>
      </body>
    </html>
  `;
}

export function printProductLabel(product: ProductMasterEntry, company: Settings["company"]) {
  if (!product.sku) {
    alert("This product needs an SKU before printing a label.");
    return;
  }

  const html = buildLabelHtml(product, company);

  // Use popup approach (bypasses adblockers/PDF previewer bugs)
  const popup = window.open(
    "",
    "_blank",
    "width=400,height=300,toolbar=no,menubar=no,scrollbars=no",
  );
  if (!popup) {
    alert("Popup blocked. Please allow popups to print labels.");
    return;
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();

  // Wait for images/fonts to load before calling print
  setTimeout(() => {
    popup.focus();
    popup.print();
    // Close the popup after printing completes or is cancelled
    setTimeout(() => {
      popup.close();
    }, 100);
  }, 250);
}
