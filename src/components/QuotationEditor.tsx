import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  FileDown,
  Save,
  Printer,
  FileText,
  Check,
  ArrowRightCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useApp, newId } from "@/lib/store";
import type { Invoice, InvoiceItem, Quotation, QuotationStatus, SupplyType } from "@/lib/types";
import { computeTotals, formatINR, lineTotal, numberToIndianWords } from "@/lib/calc";
import { downloadQuotationPdf, printQuotationPdf } from "@/components/QuotationPdf";
import {
  convertQuotationToInvoice,
  quotationStatusMeta,
  effectiveStatus,
} from "@/lib/quotation-actions";
import { toast } from "sonner";

function blankItem(): InvoiceItem {
  return {
    id: newId(),
    description: "",
    condition: "",
    hsn: "",
    quantity: null,
    unit: "",
    price: null,
    gstPercent: null,
  };
}

function extractGstStateCode(gstin: string | undefined | null): string | null {
  if (!gstin || gstin.length !== 15) return null;
  const code = gstin.slice(0, 2);
  if (!/^\d{2}$/.test(code)) return null;
  const n = parseInt(code, 10);
  if (n < 1 || n > 38) return null;
  return code;
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildBlankQuotation(args: {
  number: string;
  company: Quotation["company"];
  bank: Quotation["bank"];
  defaultGst: number;
  gstMode: Quotation["gstMode"];
  validityDays: number;
  defaultTerms: string;
  defaultNotes: string;
}): Quotation {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: newId(),
    number: args.number,
    date: today,
    validityDate: addDaysISO(today, args.validityDays),
    status: "draft",
    lifecycle: "ACTIVE",
    customer: {
      id: "",
      name: "",
      phone: "",
      gstin: "",
      address: "",
      state: "",
    },
    company: args.company,
    bank: args.bank,
    items: [blankItem()],
    notes: args.defaultNotes,
    terms: args.defaultTerms,
    salesPerson: "",
    paymentTerms: "",
    deliveryTerms: "",
    customerReference: "",
    placeOfSupply: args.company.state,
    gstMode: args.gstMode,
    supplyType: args.gstMode === "IGST" ? "OTHER_STATE" : "WITHIN_STATE",
    supplyTypeManual: false,
    createdAt: new Date().toISOString(),
    ewayBillNumber: "",
    transportMode: "",
    packages: undefined,
    weight: "",
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: args.defaultGst || 18,
    taxOverride: false,
  };
}

const STATUS_OPTIONS: Array<{ value: QuotationStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export function QuotationEditor({
  initial,
  mode,
}: {
  initial: Quotation;
  mode: "create" | "edit";
}) {
  const navigate = useNavigate();
  const settings = useApp((s) => s.settings);
  const customers = useApp((s) => s.customers);
  const saveQuotation = useApp((s) => s.saveQuotation);
  const consumeQuotationNumber = useApp((s) => s.consumeQuotationNumber);
  const addCustomer = useApp((s) => s.addCustomer);
  const upsertProductMaster = useApp((s) => s.upsertProductMaster);

  const [q, setQ] = useState<Quotation>(initial);
  const [saveAsCustomer, setSaveAsCustomer] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setQ(initial);
  }, [initial.id]);

  const totals = useMemo(() => computeTotals(q as unknown as Invoice), [q]);
  const activeProducts = settings.productMaster.filter((p) => p.active);

  const status = effectiveStatus(q);
  const statusMeta = quotationStatusMeta(status);
  const isLocked = status === "converted" || status === "expired" || status === "cancelled";

  useEffect(() => {
    if (q.supplyTypeManual) return;
    const customerCode = extractGstStateCode(q.customer.gstin);
    const companyCode = extractGstStateCode(q.company.gstin);
    if (customerCode === null || companyCode === null) return;
    const next: SupplyType = customerCode === companyCode ? "WITHIN_STATE" : "OTHER_STATE";
    if (next !== q.supplyType) {
      setQ((s) => ({
        ...s,
        supplyType: next,
        gstMode: next === "OTHER_STATE" ? "IGST" : "CGST_SGST",
      }));
    }
  }, [q.supplyTypeManual, q.customer.gstin, q.company.gstin, q.supplyType]);

  function patch(p: Partial<Quotation>) {
    if (isLocked) return;
    setQ((s) => ({ ...s, ...p }));
  }
  function patchCustomer(p: Partial<Quotation["customer"]>) {
    if (isLocked) return;
    setQ((s) => ({ ...s, customer: { ...s.customer, ...p } }));
  }
  function updateItem(id: string, p: Partial<InvoiceItem>) {
    if (isLocked) return;
    setQ((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? { ...it, ...p } : it)),
    }));
  }
  function addRow() {
    if (isLocked) return;
    setQ((s) => ({ ...s, items: [...s.items, blankItem()] }));
  }
  function deleteRow(id: string) {
    if (isLocked) return;
    setQ((s) => ({
      ...s,
      items: s.items.length > 1 ? s.items.filter((it) => it.id !== id) : s.items,
    }));
  }
  function applyProductByDescription(itemId: string, desc: string) {
    const match = activeProducts.find(
      (p) => p.description.trim().toLowerCase() === desc.trim().toLowerCase(),
    );
    if (!match) return;
    const p: Partial<InvoiceItem> = {
      description: match.description,
      hsn: match.hsn,
      gstPercent: match.gstPercent,
    };
    if (match.defaultRate != null) p.price = match.defaultRate;
    updateItem(itemId, p);
  }

  function ensureSaved(extra?: Partial<Quotation>): Quotation {
    let final = q;
    if (extra) final = { ...final, ...extra };
    for (const it of final.items) {
      if (it.description.trim() && it.hsn.trim()) {
        upsertProductMaster({
          description: it.description,
          hsn: it.hsn,
          gstPercent: it.gstPercent ?? 0,
          defaultRate: it.price ?? undefined,
        });
      }
    }
    if (saveAsCustomer && final.customer.name.trim()) {
      const id = newId();
      const c = { ...final.customer, id };
      addCustomer(c);
      final = { ...final, customer: c };
    }
    saveQuotation(final);
    return final;
  }

  function handleSave(asDraft = false) {
    if (isLocked) return;
    if (!q.customer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (mode === "create") {
      const initialNum = `${settings.quotationPrefix}-${String(settings.nextQuotationNumber).padStart(settings.quotationDigits || 4, "0")}`;
      if (q.number === initialNum) consumeQuotationNumber();
    }
    const final = ensureSaved({ isDraft: asDraft });
    if (asDraft) setDraftSavedAt(Date.now());
    else toast.success("Quotation saved");
    if (mode === "create") {
      navigate({ to: "/quotations/$id", params: { id: final.id } });
    }
  }

  useEffect(() => {
    if (draftSavedAt == null) return;
    const t = window.setTimeout(() => setDraftSavedAt(null), 2500);
    return () => window.clearTimeout(t);
  }, [draftSavedAt]);

  async function handleExport() {
    if (!q.customer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    let final = q;
    if (!isLocked) {
      if (mode === "create") {
        const initialNum = `${settings.quotationPrefix}-${String(settings.nextQuotationNumber).padStart(settings.quotationDigits || 4, "0")}`;
        if (q.number === initialNum) consumeQuotationNumber();
      }
      final = ensureSaved({ isDraft: false });
    }
    await downloadQuotationPdf(final);
    if (mode === "create") navigate({ to: "/quotations/$id", params: { id: final.id } });
  }

  async function handlePrint() {
    if (!q.customer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    let final = q;
    if (!isLocked) {
      if (mode === "create") {
        const initialNum = `${settings.quotationPrefix}-${String(settings.nextQuotationNumber).padStart(settings.quotationDigits || 4, "0")}`;
        if (q.number === initialNum) consumeQuotationNumber();
      }
      final = ensureSaved({ isDraft: false });
    }
    await printQuotationPdf(final);
    if (mode === "create") navigate({ to: "/quotations/$id", params: { id: final.id } });
  }

  async function performConvert(openInvoice: boolean) {
    if (q.status === "converted" || q.convertedInvoiceId) {
      toast.error(`Already converted — invoice ${q.convertedInvoiceNumber ?? ""}`);
      return;
    }
    try {
      const st = useApp.getState();
      const { invoice, quotation } = convertQuotationToInvoice(q, st);
      st.saveInvoice(invoice);
      st.saveQuotation(quotation);
      setQ(quotation);
      if (openInvoice) {
        toast.success(`Converted to ${invoice.number}`);
        navigate({ to: "/invoices/$id", params: { id: invoice.id } });
      } else {
        toast.success(`Converted — invoice ${invoice.number} created`);
      }
    } catch (e) {
      const msg = (e as { message?: string })?.message || "Conversion failed";
      toast.error(msg);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        handleSave(false);
      } else if (k === "p") {
        e.preventDefault();
        handlePrint();
      } else if (k === "n") {
        e.preventDefault();
        navigate({ to: "/quotations/new" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="p-8 space-y-8 max-w-[1100px]">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {mode === "create" ? "New Quotation" : `Edit ${q.number}`}
            <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Live totals · pre-sales quotation.</p>
          {status === "converted" && q.convertedInvoiceNumber && (
            <div className="mt-2 text-sm px-3 py-2 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-900">
              Converted to invoice <strong>{q.convertedInvoiceNumber}</strong> — this quotation is
              read-only.
            </div>
          )}
          {status === "expired" && (
            <div className="mt-2 text-sm px-3 py-2 rounded-md border border-orange-300 bg-orange-50 text-orange-900">
              This quotation has passed its validity date and is read-only.
            </div>
          )}
          {status === "cancelled" && (
            <div className="mt-2 text-sm px-3 py-2 rounded-md border border-neutral-300 bg-neutral-100 text-neutral-800">
              This quotation was cancelled and is read-only.
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {!isLocked && !q.convertedInvoiceId && mode === "edit" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" title="Convert to Invoice">
                  <ArrowRightCircle className="h-4 w-4" />
                  Convert
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Convert this quotation into an Invoice?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A new invoice will be created with all details from this quotation. The
                    quotation will be marked as Converted and become read-only.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button variant="outline" onClick={() => performConvert(false)}>
                    Convert &amp; Keep Open
                  </Button>
                  <AlertDialogAction onClick={() => performConvert(true)}>
                    Convert &amp; Open Invoice
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              disabled={isLocked}
              onClick={() => handleSave(true)}
              className="gap-2"
              title="Save Draft"
            >
              <FileText className="h-4 w-4" />
              Save Draft
            </Button>
            {draftSavedAt != null && (
              <span
                key={draftSavedAt}
                className="flex items-center gap-1 text-sm font-medium text-emerald-600 animate-scale-in"
              >
                <Check className="h-4 w-4" />
                Draft Saved
              </span>
            )}
          </div>
          <Button
            variant="outline"
            disabled={isLocked}
            onClick={() => handleSave(false)}
            className="gap-2"
            title="Ctrl+S"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2" title="Ctrl+P">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Company + Customer + Quotation info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Section title="Company" tint="var(--surface-header)">
          <div className="text-sm">
            <div className="font-semibold">{q.company.name}</div>
            <div className="text-muted-foreground">{q.company.address}</div>
            <div className="text-muted-foreground">Ph: {q.company.phone}</div>
            <div className="text-muted-foreground">GSTIN: {q.company.gstin}</div>
          </div>
        </Section>
        <Section title="Customer" tint="var(--surface-customer)">
          <div className="space-y-2">
            <select
              className="w-full text-sm border rounded-md px-2 py-1.5 bg-white"
              value={q.customer.id}
              disabled={isLocked}
              onChange={(e) => {
                if (e.target.value === "__new") {
                  patchCustomer({
                    id: "",
                    name: "",
                    phone: "",
                    gstin: "",
                    address: "",
                    state: "",
                  });
                  return;
                }
                const c = customers.find((x) => x.id === e.target.value);
                if (c) patch({ customer: { ...c }, placeOfSupply: c.state || q.placeOfSupply });
              }}
            >
              <option value="__new">— Enter manually —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Customer name"
              disabled={isLocked}
              value={q.customer.name}
              onChange={(e) => patchCustomer({ name: e.target.value })}
            />
            <Input
              placeholder="Phone"
              disabled={isLocked}
              value={q.customer.phone}
              onChange={(e) => patchCustomer({ phone: e.target.value })}
            />
            <Input
              placeholder="GSTIN"
              disabled={isLocked}
              value={q.customer.gstin}
              onChange={(e) => patchCustomer({ gstin: e.target.value.toUpperCase() })}
            />
            <Input
              placeholder="State (place of supply)"
              disabled={isLocked}
              value={q.customer.state ?? ""}
              onChange={(e) => {
                patchCustomer({ state: e.target.value });
                patch({ placeOfSupply: e.target.value });
              }}
            />
            <textarea
              placeholder="Address"
              disabled={isLocked}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={q.customer.address}
              onChange={(e) => patchCustomer({ address: e.target.value })}
            />
            {!q.customer.id && !isLocked && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={saveAsCustomer}
                  onChange={(e) => setSaveAsCustomer(e.target.checked)}
                />
                Save as new customer
              </label>
            )}
          </div>
        </Section>
        <Section title="Quotation" tint="var(--surface-invoice)">
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Quotation #</Label>
              <Input
                value={q.number}
                disabled={isLocked}
                onChange={(e) => patch({ number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={q.date}
                  disabled={isLocked}
                  onChange={(e) => patch({ date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valid Until</Label>
                <Input
                  type="date"
                  value={q.validityDate ?? ""}
                  disabled={isLocked}
                  onChange={(e) => patch({ validityDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <select
                className="w-full text-sm border rounded-md px-2 py-1.5 bg-white"
                value={q.status}
                disabled={isLocked || q.status === "converted"}
                onChange={(e) => {
                  const next = e.target.value as QuotationStatus;
                  patch({ status: next });
                }}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                {q.status === "converted" && <option value="converted">Converted</option>}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sales Person</Label>
              <Input
                value={q.salesPerson ?? ""}
                disabled={isLocked}
                onChange={(e) => patch({ salesPerson: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Payment Terms</Label>
              <Input
                value={q.paymentTerms ?? ""}
                disabled={isLocked}
                onChange={(e) => patch({ paymentTerms: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Delivery Terms</Label>
              <Input
                value={q.deliveryTerms ?? ""}
                disabled={isLocked}
                onChange={(e) => patch({ deliveryTerms: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Customer Reference</Label>
              <Input
                value={q.customerReference ?? ""}
                disabled={isLocked}
                onChange={(e) => patch({ customerReference: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Supply Type</Label>
              <div className="flex items-center gap-2">
                <select
                  value={q.supplyType ?? "WITHIN_STATE"}
                  disabled={isLocked}
                  onChange={(e) =>
                    patch({
                      supplyType: e.target.value as SupplyType,
                      supplyTypeManual: true,
                      gstMode: e.target.value === "OTHER_STATE" ? "IGST" : "CGST_SGST",
                    })
                  }
                  className="flex-1 text-sm border rounded-md px-2 py-1.5 bg-white"
                >
                  <option value="WITHIN_STATE">Within State</option>
                  <option value="OTHER_STATE">Other State</option>
                </select>
                <label className="text-xs flex items-center gap-1 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!q.supplyTypeManual}
                    disabled={isLocked}
                    onChange={(e) => patch({ supplyTypeManual: !e.target.checked })}
                  />
                  Auto
                </label>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Items */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-5 py-3 border-b flex justify-between items-center">
          <h2 className="font-semibold">Items</h2>
          <Button size="sm" onClick={addRow} className="gap-2" disabled={isLocked}>
            <Plus className="h-4 w-4" /> Add Row
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-summary)] text-left">
              <tr>
                <th className="px-3 py-2 font-medium w-10">#</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium w-24">HSN CODE</th>
                <th className="px-3 py-2 font-medium w-28 text-right">KGS</th>
                <th className="px-3 py-2 font-medium w-28 text-right">Price</th>
                <th className="px-3 py-2 font-medium w-28 text-right">Amount</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {q.items.map((it, i) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-1">
                    <Input
                      list="quotation-product-list"
                      disabled={isLocked}
                      value={it.description}
                      onChange={(e) => {
                        updateItem(it.id, { description: e.target.value });
                        applyProductByDescription(it.id, e.target.value);
                      }}
                      placeholder="e.g. m10 SS bolt"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      value={it.hsn}
                      disabled={isLocked}
                      onChange={(e) => updateItem(it.id, { hsn: e.target.value })}
                      placeholder="7318"
                    />
                  </td>
                  <td className="px-2 py-1 w-28">
                    <Input
                      type="number"
                      className="text-right"
                      disabled={isLocked}
                      value={it.quantity ?? ""}
                      placeholder="0"
                      onChange={(e) =>
                        updateItem(it.id, {
                          quantity: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1 w-28">
                    <Input
                      type="number"
                      className="text-right"
                      disabled={isLocked}
                      value={it.price ?? ""}
                      placeholder="0"
                      onChange={(e) =>
                        updateItem(it.id, {
                          price: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatINR(lineTotal(it))}
                  </td>
                  <td className="px-2 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRow(it.id)}
                      disabled={isLocked || q.items.length === 1}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="quotation-product-list">
            {activeProducts.map((p) => (
              <option key={p.id} value={p.description} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Tax Details */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold bg-[var(--surface-summary)] flex items-center justify-between">
          <span>Tax Details</span>
          <label className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
            <input
              type="checkbox"
              checked={!!q.taxOverride}
              disabled={isLocked}
              onChange={(e) => patch({ taxOverride: e.target.checked })}
            />
            Override Tax
          </label>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">Taxable Amount</Label>
            <Input value={formatINR(totals.taxableAmount)} readOnly className="bg-muted/40" />
          </div>
          {totals.isInterState ? (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">IGST %</Label>
                <Input
                  type="number"
                  value={q.igstPercent ?? 18}
                  disabled={isLocked}
                  onChange={(e) => patch({ igstPercent: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">IGST Amount</Label>
                <Input
                  type="number"
                  value={
                    q.taxOverride
                      ? (q.igstAmountOverride ?? Number(totals.igst.toFixed(2)))
                      : Number(totals.igst.toFixed(2))
                  }
                  readOnly={!q.taxOverride}
                  className={!q.taxOverride ? "bg-muted/40" : ""}
                  disabled={isLocked}
                  onChange={(e) => patch({ igstAmountOverride: Number(e.target.value) || 0 })}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">CGST %</Label>
                <Input
                  type="number"
                  value={q.cgstPercent ?? 9}
                  disabled={isLocked}
                  onChange={(e) => patch({ cgstPercent: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">CGST Amount</Label>
                <Input
                  type="number"
                  value={
                    q.taxOverride
                      ? (q.cgstAmountOverride ?? Number(totals.cgst.toFixed(2)))
                      : Number(totals.cgst.toFixed(2))
                  }
                  readOnly={!q.taxOverride}
                  className={!q.taxOverride ? "bg-muted/40" : ""}
                  disabled={isLocked}
                  onChange={(e) => patch({ cgstAmountOverride: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SGST %</Label>
                <Input
                  type="number"
                  value={q.sgstPercent ?? 9}
                  disabled={isLocked}
                  onChange={(e) => patch({ sgstPercent: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SGST Amount</Label>
                <Input
                  type="number"
                  value={
                    q.taxOverride
                      ? (q.sgstAmountOverride ?? Number(totals.sgst.toFixed(2)))
                      : Number(totals.sgst.toFixed(2))
                  }
                  readOnly={!q.taxOverride}
                  className={!q.taxOverride ? "bg-muted/40" : ""}
                  disabled={isLocked}
                  onChange={(e) => patch({ sgstAmountOverride: Number(e.target.value) || 0 })}
                />
              </div>
            </>
          )}
          <div className="md:col-start-3">
            <Label className="text-xs text-muted-foreground">Total GST</Label>
            <Input
              value={formatINR(totals.gstTotal)}
              readOnly
              className="bg-muted/40 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Bank + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Bank Details" tint="white">
          <div className="text-sm">
            <div className="font-semibold">{q.bank.bankName}</div>
            <div>Acc: {q.bank.accountNumber}</div>
            <div>IFSC: {q.bank.ifsc}</div>
            {q.bank.branch && <div>{q.bank.branch}</div>}
          </div>
        </Section>
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="px-5 py-3 border-b font-semibold bg-[var(--surface-summary)]">
            Summary
          </div>
          <div className="p-5 space-y-2 text-sm">
            <Row label="Subtotal" value={formatINR(totals.subtotal)} />
            {totals.gstTotal > 0 && (
              <>
                {totals.isInterState ? (
                  <Row label={`IGST @ ${totals.igstPercent}%`} value={formatINR(totals.igst)} />
                ) : (
                  <>
                    <Row label={`CGST @ ${totals.cgstPercent}%`} value={formatINR(totals.cgst)} />
                    <Row label={`SGST @ ${totals.sgstPercent}%`} value={formatINR(totals.sgst)} />
                  </>
                )}
                <Row label="GST Total" value={formatINR(totals.gstTotal)} />
              </>
            )}
            {Math.abs(totals.roundedOff) > 0.001 && (
              <Row label="Rounded Off" value={formatINR(totals.roundedOff)} />
            )}
            <div className="h-px bg-border my-2" />
            <Row label="Grand Total" value={formatINR(totals.roundedTotal)} bold />
            <div className="text-xs text-muted-foreground italic">
              {numberToIndianWords(totals.roundedTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold bg-[var(--surface-summary)]">
          Terms &amp; Conditions
        </div>
        <div className="p-5">
          <textarea
            className="w-full min-h-[120px] rounded-md border bg-transparent px-3 py-2 text-sm"
            disabled={isLocked}
            value={q.terms ?? ""}
            placeholder="Terms displayed on the quotation PDF"
            onChange={(e) => patch({ terms: e.target.value })}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold bg-[var(--surface-summary)]">Notes</div>
        <div className="p-5">
          <textarea
            className="w-full min-h-[80px] rounded-md border bg-transparent px-3 py-2 text-sm"
            disabled={isLocked}
            value={q.notes ?? ""}
            placeholder="Internal or customer-facing notes"
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  tint,
  children,
}: {
  title: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="px-5 py-3 border-b font-semibold" style={{ background: tint }}>
        {title}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${bold ? "font-bold text-base" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
