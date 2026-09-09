import type { Invoice } from "@/lib/types";
import { formatDate } from "@/lib/calc";
import defaultLogoAsset from "@/assets/madeena-logo.png.asset.json";
import defaultWatermarkAsset from "@/assets/madeena-watermark.png.asset.json";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function printDeliveryChallanPdf(invoice: Invoice) {
  const printWindow = window.open("", "_blank", "width=900,height=1200");
  if (!printWindow) {
    throw new Error("Print window was blocked. Please allow pop-ups for this site and try again.");
  }

  try {
    printWindow.document.open();
    printWindow.document.write(buildDeliveryChallanHtml(invoice));
    printWindow.document.close();

    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
    };

    if (printWindow.document.readyState === "complete") {
      window.setTimeout(triggerPrint, 250);
    } else {
      printWindow.addEventListener("load", () => window.setTimeout(triggerPrint, 250), {
        once: true,
      });
    }
  } catch (error) {
    try {
      printWindow.close();
    } catch {
      // noop
    }
    throw error;
  }
}

function buildDeliveryChallanHtml(invoice: Invoice): string {
  const itemsHtml = invoice.items
    .map((item, index) => {
      const quantity = item.quantity ?? 0;
      const unit = (item as any).unit || "NOS";
      const qtyText = quantity ? `${quantity} ${unit}` : "";
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.description)}</td>
        <td class="right">${escapeHtml(qtyText)}</td>
      </tr>`;
    })
    .join("");

  const logoSrc = invoice.company.logoDataUrl || defaultLogoAsset.url;
  const watermarkSrc = invoice.company.watermarkDataUrl || defaultWatermarkAsset.url;
  const logo = `<img class="logo" src="${escapeHtml(logoSrc)}" alt="Logo" />`;
  const watermark = `<div class="watermark"><img src="${escapeHtml(watermarkSrc)}" alt="" /></div>`;
  const signature = invoice.company.signatureDataUrl
    ? `<img class="signature" src="${escapeHtml(invoice.company.signatureDataUrl)}" alt="Signature" />`
    : `<div class="signature-spacer"></div>`;

  const infoRows: Array<{ label: string; value: string }> = [
    { label: "Challan No", value: `DC-${invoice.number}` },
    { label: "Date", value: formatDate(invoice.date) },
    { label: "Invoice Ref", value: invoice.number },
  ];

  if (invoice.transportMode) infoRows.push({ label: "Transport", value: invoice.transportMode });
  if (invoice.packages) infoRows.push({ label: "Packages", value: String(invoice.packages) });
  if (invoice.weight) infoRows.push({ label: "Weight", value: String(invoice.weight) });

  const infoRowsHtml = infoRows
    .map(
      (row) =>
        `<div class="info-row"><span class="info-label">${escapeHtml(row.label)}</span><strong class="info-value">${escapeHtml(row.value)}</strong></div>`,
    )
    .join("");

  // customer holds name/phone/address/gstin; shipTo overrides city/state/pincode
  const deliverCustomer = invoice.customer;
  const locationOverride = invoice.shipTo;
  const deliverToLine = [
    locationOverride?.city ?? deliverCustomer.state,
    locationOverride?.state,
    locationOverride?.pincode,
  ].filter(Boolean).join(", ");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Challan - ${escapeHtml(invoice.number || "Invoice")}</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    html, body { margin: 0; background: #fff; color: #000; font-family: Helvetica, Arial, sans-serif; font-size: 12px; }
    .page { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm; background: #fff; display: flex; flex-direction: column; overflow: hidden; }
    .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 50; mix-blend-mode: multiply; }
    .watermark img { width: 75%; max-width: 160mm; height: auto; object-fit: contain; opacity: .07; }
    .invoice-shell { position: relative; z-index: 1; border: 1px solid #cfd6dd; border-radius: 6px; overflow: hidden; flex: 1 0 auto; display: flex; flex-direction: column; }
    .invoice-body { display: flex; flex-direction: column; flex: 1 0 auto; }
    .top-header { display: flex; align-items: center; gap: 12px; padding: 10px 14px 6px; }
    .top-header-logo, .top-header-spacer { flex: 0 0 90px; width: 90px; height: 60px; display: flex; align-items: center; justify-content: center; }
    .top-header-center { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .tax-invoice-title { display: inline-block; border: 1px solid #1f4e79; padding: 4px 18px; font-size: 15px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #000; }
    .company-name { font-size: clamp(20px, 4vw, 26px); font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .company-tagline { font-size: 12px; font-weight: 400; color: #000; }
    .logo { max-width: 90px; max-height: 60px; width: auto; height: auto; object-fit: contain; }
    .header { background: #d9e6f2; padding: 12px 14px; display: flex; align-items: center; }
    .company-info { display: flex; flex-direction: column; justify-content: center; }
    .meta { margin-top: 2px; color: #000; font-size: 11px; }
    .top-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 8px; }
    .box { border-radius: 5px; padding: 10px; }
    .customer { background: #dceef5; }
    .invoice-meta { background: #f3e6d8; padding: 6px; }
    .info-row { display: grid; grid-template-columns: 110px 1fr; gap: 8px; padding: 4px 10px; align-items: baseline; }
    .info-row:nth-child(odd) { background: #f3e6d8; }
    .info-row:nth-child(even) { background: #ece0d0; }
    .info-label { color: #000; font-weight: 400; }
    .info-value { color: #000; font-weight: 700; word-break: break-word; }
    .label { color: #000; font-size: 10px; letter-spacing: 1px; }
    .customer-name { margin-top: 3px; font-weight: 700; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #dfead7; text-align: left; padding: 6px; border-top: 1px solid #cfd6dd; border-bottom: 1px solid #cfd6dd; font-size: 11px; color: #000; }
    td { padding: 6px; border-bottom: 1px solid #eef2f5; vertical-align: top; font-size: 12px; }
    .right { text-align: right; }
    .bottom { display: flex; justify-content: space-between; align-items: flex-end; padding: 30px 14px 14px; border-top: 1px solid #cfd6dd; margin-top: auto; }
    .signature-box { width: 220px; text-align: center; }
    .signature { height: 64px; max-width: 220px; object-fit: contain; }
    .signature-spacer { height: 64px; }
    .signature-line { border-top: 1px solid #111; padding-top: 4px; margin-top: 40px; }
    @page { size: A4; margin: 10mm; }
    @media print {
      html, body, * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      html, body { width: 210mm; min-height: 297mm; }
      .page { width: auto; min-height: 277mm; margin: 0; padding: 0; }
      .invoice-shell { break-inside: avoid; }
      .watermark { position: absolute; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="invoice-shell">
      <div class="invoice-body">
      <div class="top-header">
        <div class="top-header-logo">${logo}</div>
        <div class="top-header-center">
          <span class="tax-invoice-title">DELIVERY CHALLAN</span>
          <div class="company-name">${escapeHtml(invoice.company.name)}</div>
          <div class="company-tagline">${escapeHtml(invoice.company.companyTagline)}</div>
        </div>
        <div class="top-header-spacer" aria-hidden="true"></div>
      </div>
      <header class="header">
        <div class="company-info">
          <div class="meta">GSTIN: <strong>${escapeHtml(invoice.company.gstin)}</strong></div>
          <div class="meta">${escapeHtml(invoice.company.address)}</div>
          <div class="meta">Phone: ${escapeHtml(invoice.company.phone)}${invoice.company.phone2 ? ` / ${escapeHtml(invoice.company.phone2)}` : ""}${invoice.company.email ? ` &middot; ${escapeHtml(invoice.company.email)}` : ""}</div>
        </div>
      </header>

      <div class="top-grid">
        <div class="box customer">
          <div class="label">DELIVER TO</div>
          <div class="customer-name">${escapeHtml(deliverCustomer.name)}</div>
          ${deliverCustomer.address ? `<div>${escapeHtml(deliverCustomer.address)}</div>` : ""}
          ${deliverToLine ? `<div>${escapeHtml(deliverToLine)}</div>` : ""}
          <div>Phone: ${escapeHtml(deliverCustomer.phone)}</div>
          ${deliverCustomer.gstin ? `<div>GSTIN: ${escapeHtml(deliverCustomer.gstin)}</div>` : ""}
        </div>
        <div class="box invoice-meta" style="padding: 0; overflow: hidden;">
          ${infoRowsHtml}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 60px;">Sl No</th>
            <th>Product Description</th>
            <th class="right" style="width: 120px;">Qty</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="bottom">
        <div class="signature-box">
          <div class="signature-line">Receiver Signature</div>
        </div>
        <div class="signature-box">
          ${signature}
          <div class="signature-line" style="margin-top: 4px;">Authorized Signature<br />For ${escapeHtml(invoice.company.name)}</div>
        </div>
      </div>
      </div>
    </section>
    ${watermark}
  </main>
</body>
</html>`;
}
