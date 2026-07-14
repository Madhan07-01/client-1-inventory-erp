import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { QuotationEditor, buildBlankQuotation } from "@/components/QuotationEditor";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/quotations/new")({
  head: () => ({ meta: [{ title: "New Quotation · Madeena Traders" }] }),
  component: NewQuotationPage,
});

function NewQuotationPage() {
  const settings = useApp((s) => s.settings);
  const nextNumber = useApp((s) => s.nextQuotationNumber);

  const initial = useMemo(
    () =>
      buildBlankQuotation({
        number: nextNumber(),
        company: { ...settings.company },
        bank: { ...settings.bank },
        defaultGst: settings.defaultGstPercent,
        gstMode: settings.gstMode,
        validityDays: settings.quotationDefaultValidityDays,
        defaultTerms: settings.quotationDefaultTerms,
        defaultNotes: settings.quotationDefaultNotes,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <AppShell>
      <QuotationEditor initial={initial} mode="create" />
    </AppShell>
  );
}
