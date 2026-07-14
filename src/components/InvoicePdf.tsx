import type { Invoice } from "@/lib/types";
import { computeTotals, formatDate, formatINRPlain, numberToIndianWords } from "@/lib/calc";
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

function rupee(value: number): string {
  return `Rs. ${formatINRPlain(value)}`;
}

export async function printInvoicePdf(invoice: Invoice) {
  // Keep print fully HTML-based. Blob/PDF iframes are repeatedly blocked by
  // Chrome extensions on Windows with ERR_BLOCKED_BY_CLIENT.
  const printWindow = window.open("", "_blank", "width=900,height=1200");
  if (!printWindow) {
    throw new Error("Print window was blocked. Please allow pop-ups for this site and try again.");
  }

  try {
    printWindow.document.open();
    printWindow.document.write(buildInvoicePrintHtml(invoice));
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

export async function downloadInvoicePdf(invoice: Invoice) {
  const html = buildInvoicePrintHtml(invoice);
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;background:#fff;";
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
    const pageEl = idoc.querySelector(".page") as HTMLElement | null;
    if (!pageEl) throw new Error("Invoice page element not found");

    const imgs = Array.from(idoc.images);
    await Promise.all(
      imgs.map((img) =>
        img.decode().catch(
          () =>
            new Promise<void>((res) => {
              if (img.complete) return res();
              img.addEventListener("load", () => res(), { once: true });
              img.addEventListener("error", () => res(), { once: true });
            }),
        ),
      ),
    );

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      imageTimeout: 0,
      logging: false,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const pxPerMm = canvas.width / pageWidthMm;
    const pageHeightPx = Math.floor(pageHeightMm * pxPerMm);
    const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

    for (let i = 0; i < totalPages; i++) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - i * pageHeightPx);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        i * pageHeightPx,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      );
      const imgData = sliceCanvas.toDataURL("image/png");
      const renderedHeightMm = sliceHeight / pxPerMm;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, renderedHeightMm);
    }

    const safe =
      // eslint-disable-next-line no-control-regex
      (invoice.number || "invoice").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "invoice";
    pdf.save(`${safe}.pdf`);
  } finally {
    iframe.remove();
  }
}

function buildInvoicePrintHtml(invoice: Invoice): string {
  const totals = computeTotals(invoice);
  const showTaxes = totals.gstTotal > 0;
  const isInter = totals.isInterState;

  const itemsHtml = invoice.items
    .map((item, index) => {
      const quantity = item.quantity ?? 0;
      const price = item.price ?? 0;
      const gstPercent = item.gstPercent ?? 0;
      const subtotal = quantity * price;
      const gstAmount = (subtotal * gstPercent) / 100;

      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.description)}</td>
        <td>${escapeHtml(item.hsn || "-")}</td>
        <td class="right">${quantity || ""}</td>
        <td class="right">${price ? escapeHtml(rupee(price)) : ""}</td>
        <td class="right bold">${escapeHtml(rupee(subtotal + gstAmount))}</td>
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

  const dispatch = invoice.dispatchFrom;
  const dispatchLine = dispatch
    ? [dispatch.city, dispatch.state, dispatch.pincode].filter(Boolean).join(", ")
    : "";
  const dispatchValue = dispatch ? [dispatch.address, dispatchLine].filter(Boolean).join(", ") : "";

  const infoRows: Array<{ label: string; value: string }> = [
    { label: "Invoice No", value: invoice.number },
    { label: "Date", value: formatDate(invoice.date) },
  ];
  if (invoice.sourceQuotationNumber) {
    const suffix =
      invoice.sourceQuotationVersion && invoice.sourceQuotationVersion > 1
        ? ` · v${invoice.sourceQuotationVersion}`
        : "";
    infoRows.push({
      label: "Source Quotation",
      value: `${invoice.sourceQuotationNumber}${suffix}`,
    });
  }
  if (dispatchValue) infoRows.push({ label: "Dispatch From", value: dispatchValue });
  if (invoice.ewayBillNumber) infoRows.push({ label: "E-way Bill", value: invoice.ewayBillNumber });
  if (invoice.transportMode) infoRows.push({ label: "Transport", value: invoice.transportMode });
  if (invoice.packages) infoRows.push({ label: "Packages", value: String(invoice.packages) });
  if (invoice.weight) infoRows.push({ label: "Weight", value: String(invoice.weight) });

  const infoRowsHtml = infoRows
    .map(
      (row) =>
        `<div class="info-row"><span class="info-label">${escapeHtml(row.label)}</span><strong class="info-value">${escapeHtml(row.value)}</strong></div>`,
    )
    .join("");

  const ship = invoice.shipTo;
  const shipLine = ship ? [ship.city, ship.state, ship.pincode].filter(Boolean).join(", ") : "";
  const shipToHtml =
    ship && shipLine
      ? `<div class="box customer" style="margin-top:6px;">
        <div class="label">SHIP TO</div>
        <div>${escapeHtml(shipLine)}</div>
      </div>`
      : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(invoice.number || "Invoice")}</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    html, body { margin: 0; background: #fff; color: #000; font-family: Helvetica, Arial, sans-serif; font-size: 12px; }
    .page { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm; background: #fff; display: flex; flex-direction: column; overflow: hidden; }
    .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 50; mix-blend-mode: multiply; }
    .watermark img { width: 75%; max-width: 160mm; height: auto; object-fit: contain; opacity: .07; }
    .invoice-shell { position: relative; z-index: 1; border: 1px solid #cfd6dd; border-radius: 6px; overflow: hidden; flex: 1 0 auto; display: flex; flex-direction: column; }
    .invoice-body { display: flex; flex-direction: column; flex: 1 0 auto; }
    .invoice-body > .bottom { margin-top: auto; }
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
    .invoice-meta .label { padding: 0 4px 4px; }
    .info-row { display: grid; grid-template-columns: 110px 1fr; gap: 8px; padding: 4px 10px; align-items: baseline; }
    .info-row:nth-child(odd) { background: #f3e6d8; }
    .info-row:nth-child(even) { background: #ece0d0; }
    .info-label { color: #000; font-weight: 400; }
    .info-value { color: #000; font-weight: 700; word-break: break-word; }
    .label { color: #000; font-size: 10px; letter-spacing: 1px; }
    .customer-name { margin-top: 3px; font-weight: 700; font-size: 13px; }
    .kv { display: flex; justify-content: space-between; gap: 12px; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #dfead7; text-align: left; padding: 6px; border-top: 1px solid #cfd6dd; border-bottom: 1px solid #cfd6dd; font-size: 11px; color: #000; }
    td { padding: 6px; border-bottom: 1px solid #eef2f5; vertical-align: top; font-size: 12px; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .summary-grid { display: grid; grid-template-columns: 1fr 240px; gap: 8px; padding: 8px; align-items: start; }
    .words { border: 1px solid #cfd6dd; border-radius: 5px; padding: 10px; min-height: 110px; }
    .summary { border-radius: 5px; overflow: hidden; }
    .sum-row, .grand-row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 10px; background: #dfead7; border-bottom: 1px solid #fff; }
    .sum-row.alt { background: #eaf2e1; }
    .grand-row { background: #cfe0bf; font-weight: 700; border-bottom: 0; }
    .bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 12px; border-top: 1px solid #cfd6dd; margin-top: auto; }
    .bank { border: 1px solid #cfd6dd; border-radius: 5px; overflow: hidden; }
    .bank-title { background: #1f4e79; color: #fff; font-weight: 700; padding: 6px 10px; }
    .bank-body { padding: 10px; }
    .signature-box { align-self: end; justify-self: end; width: 220px; text-align: center; }
    .signature { height: 64px; max-width: 220px; object-fit: contain; }
    .signature-spacer { height: 64px; }
    .signature-line { border-top: 1px solid #111; padding-top: 4px; }
    .footer { position: relative; z-index: 1; display: flex; justify-content: space-between; padding-top: 10px; color: #000; font-size: 10px; }
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
          <span class="tax-invoice-title">TAX INVOICE</span>
          <div class="company-name">${escapeHtml(invoice.company.name)}</div>
          <div class="company-tagline">${escapeHtml(invoice.company.companyTagline)}</div>
        </div>
        <div class="top-header-spacer" aria-hidden="true"></div>
      </div>
      <header class="header">
        <div class="company-info">
          <div class="meta">GSTIN: <strong>${escapeHtml(invoice.company.gstin)}</strong></div>
          <div class="meta">${escapeHtml(invoice.company.address)}</div>
          <div class="meta">Phone: ${escapeHtml(invoice.company.phone)}${invoice.company.phone2 ? ` / ${escapeHtml(invoice.company.phone2)}` : ""}${invoice.company.email ? ` · ${escapeHtml(invoice.company.email)}` : ""}</div>
        </div>
      </header>

      <div class="top-grid">
        <div>
        <div class="box customer">
          <div class="label">BILL TO</div>
          <div class="customer-name">${escapeHtml(invoice.customer.name)}</div>
          ${invoice.customer.address ? `<div>${escapeHtml(invoice.customer.address)}</div>` : ""}
          <div>Phone: ${escapeHtml(invoice.customer.phone)}</div>
          <div>GSTIN: ${escapeHtml(invoice.customer.gstin)}</div>
        </div>
        ${shipToHtml}
        </div>
        <div class="box invoice-meta">
          <div class="label">INVOICE</div>
          ${infoRowsHtml}
        </div>
      </div>

      <table>
        <thead>
          <tr><th>SI No</th><th>Product Description</th><th>HSN CODE</th><th class="right">KGS</th><th class="right">Rate</th><th class="right">Amount</th></tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="summary-grid">
        <div class="words">
          <div class="label">AMOUNT IN WORDS</div>
          <p class="bold">${escapeHtml(numberToIndianWords(totals.roundedTotal))}</p>
          ${invoice.notes ? `<div class="label">NOTES</div><p>${escapeHtml(invoice.notes)}</p>` : ""}
        </div>
        <div class="summary">
          <div class="sum-row"><span>Subtotal</span><strong>${escapeHtml(rupee(totals.subtotal))}</strong></div>
          ${showTaxes && !isInter ? `<div class="sum-row alt"><span>CGST @ ${totals.cgstPercent}%</span><strong>${escapeHtml(rupee(totals.cgst))}</strong></div>` : ""}
          ${showTaxes && !isInter ? `<div class="sum-row"><span>SGST @ ${totals.sgstPercent}%</span><strong>${escapeHtml(rupee(totals.sgst))}</strong></div>` : ""}
          ${showTaxes && isInter ? `<div class="sum-row alt"><span>IGST @ ${totals.igstPercent}%</span><strong>${escapeHtml(rupee(totals.igst))}</strong></div>` : ""}
          ${showTaxes ? `<div class="sum-row alt"><span>GST Total</span><strong>${escapeHtml(rupee(totals.gstTotal))}</strong></div>` : ""}
          ${Math.abs(totals.roundedOff) > 0.001 ? `<div class="sum-row"><span>Rounded Off</span><strong>${escapeHtml(rupee(totals.roundedOff))}</strong></div>` : ""}
          <div class="grand-row"><span>Grand Total</span><strong>${escapeHtml(rupee(totals.roundedTotal))}</strong></div>
        </div>
      </div>

      <div class="bottom">
        <div class="bank">
          <div class="bank-title">BANK ACCOUNT DETAILS</div>
          <div class="bank-body">
            <div class="bold">${escapeHtml(invoice.bank.bankName)}</div>
            <div>A/C No : ${escapeHtml(invoice.bank.accountNumber)}</div>
            <div>IFSC Code : ${escapeHtml(invoice.bank.ifsc)}</div>
            ${invoice.bank.branch ? `<div>Branch : ${escapeHtml(invoice.bank.branch)}</div>` : ""}
          </div>
        </div>
        <div class="signature-box">
          <div style="text-align:center;">(Certified that the particulars given above are true and correct)</div>
          ${signature}
          <div class="signature-line">Authorized Signature<br />For ${escapeHtml(invoice.company.name)}</div>
        </div>
      </div>
      </div>
    </section>
    ${watermark}
  </main>
</body>
</html>`;
}
