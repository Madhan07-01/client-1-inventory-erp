import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { newId } from "@/lib/store";
import type { Warehouse, Location } from "@/lib/types";
import { cloud } from "@/lib/cloud";
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
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  MapPin,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/warehouses")({
  head: () => ({
    meta: [{ title: "Warehouses · Madeena Traders" }],
  }),
  component: WarehousesPage,
});

function emptyWarehouse(): Warehouse {
  return { id: "", name: "", code: "", address: "", locations: [] };
}

function emptyLocation(warehouseId: string): Location {
  return { id: "", warehouseId, name: "", code: "", active: true };
}

function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const data = await cloud.fetchWarehouses();
      setWarehouses(data);
    } catch (e) {
      toast.error("Failed to load warehouses");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return warehouses;
    return warehouses.filter((w) =>
      [w.name, w.code, w.address ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [warehouses, query]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveWh() {
    if (!editingWh) return;
    if (!editingWh.name.trim()) {
      toast.error("Warehouse name is required");
      return;
    }
    if (!editingWh.code.trim()) {
      toast.error("Warehouse code is required");
      return;
    }
    try {
      const isNew = !editingWh.id;
      const wh = isNew ? { ...editingWh, id: newId() } : editingWh;
      await cloud.upsertWarehouse(wh);
      toast.success(isNew ? "Warehouse added" : "Warehouse updated");
      setEditingWh(null);
      load();
    } catch (e) {
      toast.error("Failed to save warehouse");
      console.error(e);
    }
  }

  async function handleDeleteWh(wh: Warehouse) {
    if (!confirm(`Delete warehouse "${wh.name}" and all its locations?`)) return;
    try {
      await cloud.deleteWarehouse(wh.id);
      toast.success("Warehouse deleted");
      load();
    } catch (e) {
      toast.error("Failed to delete warehouse");
      console.error(e);
    }
  }

  async function handleSaveLoc() {
    if (!editingLoc) return;
    if (!editingLoc.name.trim()) {
      toast.error("Location name is required");
      return;
    }
    if (!editingLoc.code.trim()) {
      toast.error("Location code is required");
      return;
    }
    try {
      const isNew = !editingLoc.id;
      const loc = isNew ? { ...editingLoc, id: newId() } : editingLoc;
      await cloud.upsertLocation(loc);
      toast.success(isNew ? "Location added" : "Location updated");
      setEditingLoc(null);
      load();
    } catch (e) {
      toast.error("Failed to save location");
      console.error(e);
    }
  }

  async function handleDeleteLoc(loc: Location) {
    if (!confirm(`Delete location "${loc.name}"?`)) return;
    try {
      await cloud.deleteLocation(loc.id);
      toast.success("Location deleted");
      load();
    } catch (e) {
      toast.error("Failed to delete location");
      console.error(e);
    }
  }

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Warehouses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage storage locations and rooms.
            </p>
          </div>
          <Button onClick={() => setEditingWh(emptyWarehouse())} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Warehouse
          </Button>
        </div>

        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search warehouses..."
              className="bg-transparent outline-none text-sm flex-1"
            />
          </div>

          {loading ? (
            <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {warehouses.length === 0
                ? "No warehouses yet. Add one to get started."
                : "No matches for your search."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="px-5 py-3 font-medium w-8"></th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Address</th>
                  <th className="px-5 py-3 font-medium">Locations</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((wh) => {
                  const isExpanded = expanded.has(wh.id);
                  return (
                    <WarehouseRow
                      key={wh.id}
                      wh={wh}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpand(wh.id)}
                      onEditWh={() => setEditingWh({ ...wh })}
                      onDeleteWh={() => handleDeleteWh(wh)}
                      onAddLoc={() => setEditingLoc(emptyLocation(wh.id))}
                      onEditLoc={(loc) => setEditingLoc({ ...loc })}
                      onDeleteLoc={(loc) => handleDeleteLoc(loc)}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Warehouse Dialog */}
      <Dialog open={!!editingWh} onOpenChange={(o) => !o && setEditingWh(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWh?.id ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
          </DialogHeader>
          {editingWh && (
            <div className="space-y-3">
              <Field label="Warehouse Name">
                <Input
                  value={editingWh.name}
                  onChange={(e) => setEditingWh({ ...editingWh, name: e.target.value })}
                  placeholder="e.g. Main Godown"
                />
              </Field>
              <Field label="Code (unique)">
                <Input
                  value={editingWh.code}
                  onChange={(e) =>
                    setEditingWh({
                      ...editingWh,
                      code: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                    })
                  }
                  placeholder="e.g. WH-001"
                />
              </Field>
              <Field label="Address">
                <textarea
                  className="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={editingWh.address ?? ""}
                  onChange={(e) => setEditingWh({ ...editingWh, address: e.target.value })}
                  placeholder="Storage address"
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWh(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWh}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={!!editingLoc} onOpenChange={(o) => !o && setEditingLoc(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingLoc?.id ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          {editingLoc && (
            <div className="space-y-3">
              <Field label="Location Name">
                <Input
                  value={editingLoc.name}
                  onChange={(e) => setEditingLoc({ ...editingLoc, name: e.target.value })}
                  placeholder="e.g. Room A, Rack 1"
                />
              </Field>
              <Field label="Code (unique per warehouse)">
                <Input
                  value={editingLoc.code}
                  onChange={(e) =>
                    setEditingLoc({
                      ...editingLoc,
                      code: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                    })
                  }
                  placeholder="e.g. RM-A"
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLoc(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLoc}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

/* ---- Sub-components ---- */

function WarehouseRow({
  wh,
  isExpanded,
  onToggle,
  onEditWh,
  onDeleteWh,
  onAddLoc,
  onEditLoc,
  onDeleteLoc,
}: {
  wh: Warehouse;
  isExpanded: boolean;
  onToggle: () => void;
  onEditWh: () => void;
  onDeleteWh: () => void;
  onAddLoc: () => void;
  onEditLoc: (loc: Location) => void;
  onDeleteLoc: (loc: Location) => void;
}) {
  return (
    <>
      <tr className="border-b hover:bg-muted/40">
        <td className="px-5 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-5 py-3 font-medium">{wh.name}</td>
        <td className="px-5 py-3 font-mono text-xs">{wh.code}</td>
        <td className="px-5 py-3 text-muted-foreground">{wh.address}</td>
        <td className="px-5 py-3">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {wh.locations.length}
          </span>
        </td>
        <td className="px-5 py-3 text-right">
          <div className="inline-flex gap-1">
            <Button variant="ghost" size="sm" onClick={onAddLoc} title="Add location">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onEditWh}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDeleteWh}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded &&
        wh.locations.map((loc) => (
          <tr key={loc.id} className="border-b bg-muted/20 hover:bg-muted/40">
            <td className="px-5 py-2"></td>
            <td className="px-5 py-2 pl-10 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {loc.name}
              </span>
            </td>
            <td className="px-5 py-2 font-mono text-xs text-muted-foreground">{loc.code}</td>
            <td className="px-5 py-2" colSpan={2}></td>
            <td className="px-5 py-2 text-right">
              <div className="inline-flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEditLoc(loc)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDeleteLoc(loc)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      {isExpanded && wh.locations.length === 0 && (
        <tr className="border-b bg-muted/20">
          <td className="px-5 py-3" colSpan={6}>
            <div className="text-xs text-muted-foreground text-center">
              No locations yet.{" "}
              <button type="button" onClick={onAddLoc} className="text-primary hover:underline">
                Add one
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
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
