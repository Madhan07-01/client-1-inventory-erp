import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  head: () => ({ meta: [{ title: "Invoice · FastenerERP Billing" }] }),
  component: EditInvoicePage,
});

function EditInvoicePage() {
  const { id } = Route.useParams();
  const invoice = useApp((s) => s.invoices.find((i) => i.id === id));

  if (!invoice) {
    return (
      <AppShell>
        <div className="p-10 text-center">
          <p className="text-muted-foreground mb-4">Invoice not found.</p>
          <Link to="/invoices">
            <Button variant="outline">Back to invoices</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <InvoiceEditor initial={invoice} mode="edit" />
    </AppShell>
  );
}
