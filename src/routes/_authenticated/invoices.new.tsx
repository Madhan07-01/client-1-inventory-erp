import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { InvoiceEditor, buildBlankInvoice } from "@/components/InvoiceEditor";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/invoices/new")({
  head: () => ({ meta: [{ title: "New Invoice · FastenerERP Billing" }] }),
  component: NewInvoicePage,
});

function NewInvoicePage() {
  const settings = useApp((s) => s.settings);
  const nextNumber = useApp((s) => s.nextInvoiceNumber);

  const initial = useMemo(
    () =>
      buildBlankInvoice({
        number: nextNumber(),
        company: { ...settings.company },
        bank: { ...settings.bank },
        defaultGst: settings.defaultGstPercent,
        gstMode: settings.gstMode,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <AppShell>
      <InvoiceEditor initial={initial} mode="create" />
    </AppShell>
  );
}
