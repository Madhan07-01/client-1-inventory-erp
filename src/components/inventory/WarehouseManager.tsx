import { useState } from "react";
import { useApp, newId } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { Warehouse, Location } from "@/lib/types";

export function WarehouseManager() {
  const warehouses = useApp((s) => s.warehouses);
  const upsertWarehouse = useApp((s) => s.upsertWarehouse);
  const deleteWarehouse = useApp((s) => s.deleteWarehouse);
  const upsertLocation = useApp((s) => s.upsertLocation);
  const deleteLocation = useApp((s) => s.deleteLocation);

  const [whDialogOpen, setWhDialogOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Partial<Warehouse> | null>(null);

  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Partial<Location> | null>(null);
  const [activeWhIdForLoc, setActiveWhIdForLoc] = useState<string | null>(null);

  function handleSaveWarehouse(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWh?.name) {
      toast.error("Name is required.");
      return;
    }
    const isNew = !editingWh.id;
    const generatedCode =
      editingWh.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 6) +
      "-" +
      Math.floor(1000 + Math.random() * 9000);
    const wh: Warehouse = {
      id: editingWh.id || newId(),
      name: editingWh.name,
      code: editingWh.code || generatedCode,
      address: editingWh.address || "",
      locations: editingWh.locations || [],
    };
    upsertWarehouse(wh);
    toast.success(isNew ? "Warehouse added" : "Warehouse updated");
    setWhDialogOpen(false);
  }

  function handleSaveLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLoc?.name || !activeWhIdForLoc) {
      toast.error("Name is required.");
      return;
    }
    const isNew = !editingLoc.id;
    const generatedCode =
      editingLoc.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 6) +
      "-" +
      Math.floor(1000 + Math.random() * 9000);
    const loc: Location = {
      id: editingLoc.id || newId(),
      warehouseId: activeWhIdForLoc,
      name: editingLoc.name,
      code: editingLoc.code || generatedCode,
      active: editingLoc.active ?? true,
    };
    upsertLocation(loc);
    toast.success(isNew ? "Location added" : "Location updated");
    setLocDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Warehouses & Locations</h2>
        <Button
          onClick={() => {
            setEditingWh({});
            setWhDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Warehouse
        </Button>
      </div>

      <div className="grid gap-6">
        {warehouses.map((wh) => (
          <div key={wh.id} className="border rounded-xl bg-card shadow-sm overflow-hidden">
            <div className="bg-muted/50 px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{wh.name}</h3>
                {wh.address && (
                  <div className="text-sm text-muted-foreground">Address: {wh.address}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingWh(wh);
                    setWhDialogOpen(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (confirm("Delete this warehouse and all its locations?")) {
                      deleteWarehouse(wh.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Locations
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveWhIdForLoc(wh.id);
                    setEditingLoc({});
                    setLocDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="w-3 h-3" />
                  Add Location
                </Button>
              </div>

              {wh.locations.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  No locations defined for this warehouse.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider">
                      <tr>
                        <th className="px-4 py-2 rounded-l-md">Name</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2 text-right rounded-r-md">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wh.locations.map((loc) => (
                        <tr key={loc.id} className="border-b last:border-0 hover:bg-muted/10">
                          <td className="px-4 py-3 font-medium">{loc.name}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                                loc.active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {loc.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setActiveWhIdForLoc(wh.id);
                                  setEditingLoc(loc);
                                  setLocDialogOpen(true);
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm("Delete this location?")) {
                                    deleteLocation(wh.id, loc.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}

        {warehouses.length === 0 && (
          <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground">
            No warehouses configured. Start by adding one.
          </div>
        )}
      </div>

      <Dialog open={whDialogOpen} onOpenChange={setWhDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWh?.id ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveWarehouse} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                autoFocus
                value={editingWh?.name || ""}
                onChange={(e) => setEditingWh({ ...editingWh, name: e.target.value })}
                placeholder="e.g. Main Warehouse"
              />
            </div>
            <div className="space-y-2">
              <Label>Address (Optional)</Label>
              <Input
                value={editingWh?.address || ""}
                onChange={(e) => setEditingWh({ ...editingWh, address: e.target.value })}
                placeholder="Warehouse address"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWhDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={locDialogOpen} onOpenChange={setLocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLoc?.id ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveLocation} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                autoFocus
                value={editingLoc?.name || ""}
                onChange={(e) => setEditingLoc({ ...editingLoc, name: e.target.value })}
                placeholder="e.g. Aisle 1, Rack A"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="loc-active"
                checked={editingLoc?.active ?? true}
                onChange={(e) => setEditingLoc({ ...editingLoc, active: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <Label htmlFor="loc-active" className="cursor-pointer">
                Active Location
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLocDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
