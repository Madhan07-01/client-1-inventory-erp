import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { QuotationEditor } from "@/components/QuotationEditor";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/quotations/$id")({
  head: () => ({ meta: [{ title: "Quotation · Madeena Traders" }] }),
  component: EditQuotationPage,
});

function EditQuotationPage() {
  const { id } = Route.useParams();
  const quotation = useApp((s) => s.quotations.find((q) => q.id === id));

  if (!quotation) {
    return (
      <AppShell>
        <div className="p-10 text-center">
          <p className="text-muted-foreground mb-4">Quotation not found.</p>
          <Link to="/quotations">
            <Button variant="outline">Back to quotations</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <QuotationEditor initial={quotation} mode="edit" />
    </AppShell>
  );
}
