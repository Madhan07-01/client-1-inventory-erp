import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApp, newId } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Plus, Trash2 } from "lucide-react";
import type { ProductMasterEntry, Settings } from "@/lib/types";
import defaultLogoAsset from "@/assets/madeena-logo.png.asset.json";
import defaultWatermarkAsset from "@/assets/madeena-watermark.png.asset.json";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Settings · FastenerERP Billing" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useApp((s) => s.settings);
  const replaceSettings = useApp((s) => s.replaceSettings);
  const customers = useApp((s) => s.customers);
  const invoices = useApp((s) => s.invoices);
  const [draft, setDraft] = useState<Settings>(() => structuredCloneSafe(settings));
  const [isDirty, setIsDirty] = useState(false);

  // Resync draft when the store changes externally (e.g. Backup Import) and
  // there are no in-progress edits to clobber.
  useEffect(() => {
    if (!isDirty) {
      setDraft(structuredCloneSafe(settings));
    }
  }, [settings]);

  const patchDraft = (patch: Partial<Settings>) => {
    setIsDirty(true);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const patchCompany = (patch: Partial<Settings["company"]>) => {
    setIsDirty(true);
    setDraft((d) => ({ ...d, company: { ...d.company, ...patch } }));
  };
  const patchBank = (patch: Partial<Settings["bank"]>) => {
    setIsDirty(true);
    setDraft((d) => ({ ...d, bank: { ...d.bank, ...patch } }));
  };

  // Warn on tab close / refresh while dirty.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function validate(next: Settings): string | null {
    const req = (v: string | undefined, label: string) =>
      !v || !v.trim() ? `${label} is required` : null;
    return (
      req(next.company.name, "Company Name") ||
      req(next.company.gstin, "GSTIN") ||
      req(next.company.address, "Address") ||
      req(next.bank.bankName, "Bank Name") ||
      req(next.bank.accountNumber, "Account Number") ||
      req(next.bank.ifsc, "IFSC") ||
      req(next.invoicePrefix, "Invoice Prefix") ||
      (next.invoiceDigits < 3 || next.invoiceDigits > 6
        ? "Invoice Number Digits must be between 3 and 6"
        : null) ||
      (next.nextInvoiceNumber < 1 ? "Next Invoice Number must be at least 1" : null)
    );
  }

  async function doSave(): Promise<boolean> {
    const err = validate(draft);
    if (err) {
      toast.error(err);
      return false;
    }
    replaceSettings(draft);
    // Persist to cloud and wait so the success toast reflects durable storage.
    try {
      const { cloud } = await import("@/lib/cloud");
      await cloud.upsertSettings(draft);
    } catch (e) {
      const msg = (e as { message?: string })?.message || "Failed to save";
      toast.error(`Settings: ${msg}`);
      return false;
    }
    toast.success("Settings saved successfully.");
    setIsDirty(false);
    return true;
  }

  function doDiscard() {
    setDraft(structuredCloneSafe(settings));
    setIsDirty(false);
  }

  function readFile(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onerror = () => rej(r.error);
      r.onload = () => res(String(r.result));
      r.readAsDataURL(file);
    });
  }

  function exportBackup() {
    const data = { settings, customers, invoices };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fastener-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="p-8 space-y-6 max-w-4xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Settings
              {isDirty && (
                <Badge variant="secondary" className="font-normal">
                  Unsaved changes
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Company, bank, and invoice defaults. Saved locally on this device.
            </p>
          </div>
        </div>

        <Section title="Company Information">
          <Grid>
            <TextField
              label="Company Name"
              value={draft.company.name}
              onChange={(v) => patchCompany({ name: v })}
            />
            <TextField
              label="Company Tagline"
              value={draft.company.companyTagline}
              onChange={(v) => patchCompany({ companyTagline: v })}
            />
            <TextField
              label="Phone 1"
              value={draft.company.phone}
              onChange={(v) => patchCompany({ phone: v })}
            />
            <TextField
              label="Phone 2"
              value={draft.company.phone2 ?? ""}
              onChange={(v) => patchCompany({ phone2: v })}
            />
            <TextField
              label="Email"
              value={draft.company.email ?? ""}
              onChange={(v) => patchCompany({ email: v })}
            />
            <TextField
              label="GSTIN"
              value={draft.company.gstin}
              onChange={(v) => patchCompany({ gstin: v.toUpperCase() })}
            />
            <TextField
              label="State"
              value={draft.company.state}
              onChange={(v) => patchCompany({ state: v })}
            />
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Address</Label>
              <textarea
                className="mt-1.5 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm min-h-[80px]"
                value={draft.company.address}
                onChange={(e) => patchCompany({ address: e.target.value })}
              />
            </div>
          </Grid>
        </Section>

        <Section title="Bank Details">
          <Grid>
            <TextField
              label="Bank Name"
              value={draft.bank.bankName}
              onChange={(v) => patchBank({ bankName: v })}
            />
            <TextField
              label="Account Number"
              value={draft.bank.accountNumber}
              onChange={(v) => patchBank({ accountNumber: v })}
            />
            <TextField
              label="IFSC"
              value={draft.bank.ifsc}
              onChange={(v) => patchBank({ ifsc: v.toUpperCase() })}
            />
            <TextField
              label="Branch"
              value={draft.bank.branch}
              onChange={(v) => patchBank({ branch: v })}
            />
          </Grid>
        </Section>

        <Section title="Invoice Defaults">
          <Grid>
            <TextField
              label="Invoice Prefix"
              value={draft.invoicePrefix}
              onChange={(v) => patchDraft({ invoicePrefix: v })}
            />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Default GST %</Label>
              <Input
                type="number"
                value={draft.defaultGstPercent}
                onChange={(e) =>
                  patchDraft({
                    defaultGstPercent: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Next Invoice Number</Label>
              <Input
                type="number"
                value={draft.nextInvoiceNumber}
                onChange={(e) =>
                  patchDraft({
                    nextInvoiceNumber: Number(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Invoice Number Digits</Label>
              <Input
                type="number"
                min={3}
                max={6}
                value={draft.invoiceDigits}
                onChange={(e) =>
                  patchDraft({
                    invoiceDigits: Math.max(3, Math.min(6, Number(e.target.value) || 4)),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Preview: {draft.invoicePrefix}-
                {String(draft.nextInvoiceNumber).padStart(draft.invoiceDigits || 4, "0")}
              </p>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs text-muted-foreground">GST Mode</Label>
              <select
                value={draft.gstMode}
                onChange={(e) => patchDraft({ gstMode: e.target.value as "CGST_SGST" | "IGST" })}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="CGST_SGST">CGST + SGST (intra-state)</option>
                <option value="IGST">IGST (inter-state)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Drives the invoice summary split. New invoices snapshot this value.
              </p>
            </div>
          </Grid>
        </Section>

        <Section title="Quotation Defaults">
          <Grid>
            <TextField
              label="Quotation Prefix"
              value={draft.quotationPrefix}
              onChange={(v) => patchDraft({ quotationPrefix: v })}
            />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Next Quotation Number</Label>
              <Input
                type="number"
                value={draft.nextQuotationNumber}
                onChange={(e) =>
                  patchDraft({
                    nextQuotationNumber: Number(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quotation Number Digits</Label>
              <Input
                type="number"
                min={3}
                max={6}
                value={draft.quotationDigits}
                onChange={(e) =>
                  patchDraft({
                    quotationDigits: Math.max(3, Math.min(6, Number(e.target.value) || 4)),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Preview: {draft.quotationPrefix}-
                {String(draft.nextQuotationNumber).padStart(draft.quotationDigits || 4, "0")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Default Validity (days)</Label>
              <Input
                type="number"
                min={1}
                value={draft.quotationDefaultValidityDays}
                onChange={(e) =>
                  patchDraft({
                    quotationDefaultValidityDays: Math.max(1, Number(e.target.value) || 15),
                  })
                }
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Default Terms &amp; Conditions
              </Label>
              <textarea
                className="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm min-h-[120px]"
                value={draft.quotationDefaultTerms}
                onChange={(e) => patchDraft({ quotationDefaultTerms: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Default Notes</Label>
              <textarea
                className="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm min-h-[80px]"
                value={draft.quotationDefaultNotes}
                onChange={(e) => patchDraft({ quotationDefaultNotes: e.target.value })}
              />
            </div>
          </Grid>
        </Section>

        <Section title="Branding">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ImageField
              label="Company Logo"
              value={draft.company.logoDataUrl}
              onChange={(v) => patchCompany({ logoDataUrl: v })}
              onPick={readFile}
              fallback={defaultLogoAsset.url}
              previewClassName="max-h-36"
            />
            <ImageField
              label="Authorized Signature"
              value={draft.company.signatureDataUrl}
              onChange={(v) => patchCompany({ signatureDataUrl: v })}
              onPick={readFile}
            />
            <ImageField
              label="PDF Watermark"
              value={draft.company.watermarkDataUrl}
              onChange={(v) => patchCompany({ watermarkDataUrl: v })}
              onPick={readFile}
              fallback={defaultWatermarkAsset.url}
            />
          </div>
        </Section>

        <Section title="Backup">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your data is automatically synchronized to the cloud and available on every device you
              sign in to. You can download a JSON snapshot at any time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={exportBackup} variant="outline">
                Export snapshot
              </Button>
            </div>
          </div>
        </Section>

        <div className="sticky bottom-0 -mx-8 px-8 py-3 bg-white/90 backdrop-blur border-t flex items-center justify-end gap-2 z-10">
          {isDirty && (
            <span className="text-xs text-muted-foreground mr-auto">You have unsaved changes</span>
          )}
          <Button variant="ghost" onClick={doDiscard} disabled={!isDirty}>
            Discard
          </Button>
          <Button onClick={doSave} disabled={!isDirty}>
            Save Changes
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function structuredCloneSafe<T>(v: T): T {
  if (typeof structuredClone === "function") return structuredClone(v);
  return JSON.parse(JSON.stringify(v)) as T;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white">
      <div className="px-5 py-4 border-b font-semibold">{title}</div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
  onPick,
  fallback,
  previewClassName,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  onPick: (f: File) => Promise<string>;
  fallback?: string;
  previewClassName?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const displayed = value || fallback;
  const isDefault = !value && !!fallback;
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="border rounded-md p-3 bg-muted/30 min-h-[120px] flex items-center justify-center">
        {displayed ? (
          <img
            src={displayed}
            alt={label}
            className={`${previewClassName ?? "max-h-24"} object-contain`}
          />
        ) : (
          <div className="text-xs text-muted-foreground">No image uploaded</div>
        )}
      </div>
      {isDefault && <div className="text-[11px] text-muted-foreground">Using default image</div>}
      <div className="flex gap-2">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              const v = await onPick(f);
              onChange(v);
            }
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" className="gap-2" onClick={() => ref.current?.click()}>
          <Upload className="h-3.5 w-3.5" />
          Upload
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange("")}>
            {fallback ? "Reset to default" : "Remove"}
          </Button>
        )}
      </div>
    </div>
  );
}
