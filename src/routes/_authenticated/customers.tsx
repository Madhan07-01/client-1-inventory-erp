import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useApp, newId } from "@/lib/store";
import type { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [{ title: "Customers · FastenerERP Billing" }],
  }),
  component: CustomersPage,
});

function emptyCustomer(): Customer {
  return { id: "", name: "", phone: "", gstin: "", address: "", state: "" };
}

function CustomersPage() {
  const customers = useApp((s) => s.customers);
  const addCustomer = useApp((s) => s.addCustomer);
  const updateCustomer = useApp((s) => s.updateCustomer);
  const deleteCustomer = useApp((s) => s.deleteCustomer);

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.phone, c.gstin, c.address].join(" ").toLowerCase().includes(q),
    );
  }, [customers, query]);

  function handleSave() {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (editing.id) {
      updateCustomer(editing);
      toast.success("Customer updated");
    } else {
      addCustomer({ ...editing, id: newId() });
      toast.success("Customer added");
    }
    setEditing(null);
  }

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage the people and businesses you bill.
            </p>
          </div>
          <Button onClick={() => setEditing(emptyCustomer())} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>

        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers..."
              className="bg-transparent outline-none text-sm flex-1"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {customers.length === 0 ? "No customers yet." : "No matches for your search."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">GSTIN</th>
                  <th className="px-5 py-3 font-medium">Address</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-5 py-3">{c.phone}</td>
                    <td className="px-5 py-3 font-mono text-xs">{c.gstin}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.address}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing({ ...c })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete ${c.name}?`)) {
                              deleteCustomer(c.id);
                              toast.success("Customer deleted");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Customer Name">
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <Field label="Phone Number">
                <Input
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </Field>
              <Field label="GSTIN">
                <Input
                  value={editing.gstin}
                  onChange={(e) => setEditing({ ...editing, gstin: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="State">
                <Input
                  value={editing.state ?? ""}
                  onChange={(e) => setEditing({ ...editing, state: e.target.value })}
                />
              </Field>
              <Field label="Address">
                <textarea
                  className="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={editing.address}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
