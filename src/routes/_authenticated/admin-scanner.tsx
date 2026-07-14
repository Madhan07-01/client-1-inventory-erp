import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { useScanner } from "@/hooks/useScanner";
import type { ProductMasterEntry, InventoryTransaction, InventoryStock } from "@/lib/types";
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
  ScanBarcode, ShieldCheck, Box, Tag, Ruler, Settings2, Shield, Layers, 
  Camera, Keyboard, SwitchCamera, Flashlight, StopCircle, Pencil, ArrowRightLeft, Database
} from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export const Route = createFileRoute("/_authenticated/admin-scanner")({
  component: AdminScannerPage,
});

type ScannerMode = "CAMERA" | "EXTERNAL" | "MANUAL";

type EditableProduct = {
  id: string;
  sku: string;
  description: string;
  hsn: string;
  gstPercent: number;
  defaultRate: number | undefined;
  active: boolean;
  lotNo?: string;
  goodsFrom?: string;
  size?: string;
  tread?: string;
  grade?: string;
  finish?: string;
  head?: string;
};

function AdminScannerPage() {
  const products = useApp((s) => s.settings.productMaster);
  const inventoryStock = useApp((s) => s.inventoryStock);
  const insertInventoryTransaction = useApp((s) => s.insertInventoryTransaction);
  const upsertProduct = useApp((s) => s.upsertProductMaster);
  
  const [scannerMode, setScannerMode] = useState<ScannerMode>("CAMERA");
  const [scannedProduct, setScannedProduct] = useState<ProductMasterEntry | null>(null);

  // CRUD Modals
  const [isStockAdjustmentOpen, setIsStockAdjustmentOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"IN" | "OUT">("IN");
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");

  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(null);

  // Camera specific state
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Manual Mode state
  const [manualInput, setManualInput] = useState("");

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader";

  const liveStockQuantity = useMemo(() => {
    if (!scannedProduct) return 0;
    return inventoryStock
      .filter((s) => s.productId === scannedProduct.id)
      .reduce((sum, s) => sum + s.quantity, 0);
  }, [scannedProduct, inventoryStock]);

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsScannerRunning(false);
  };

  const processScanResult = useCallback((barcode: string) => {
    const match = products.find(
      (p) => p.sku === barcode || p.barcodeValue === barcode || p.qrValue === barcode,
    );
    if (match) {
      setScannedProduct(match);
      toast.success(`Scanned: ${match.description}`);
      stopCameraScanner();
    } else {
      setScannedProduct(null);
      toast.error(`No product found for barcode: ${barcode}`);
      stopCameraScanner(); // Stop scanning to prevent error spam
    }
  }, [products]);

  useScanner({
    onScan: (barcode) => {
      if (scannerMode === "EXTERNAL" && !scannedProduct && !editingProduct && !isStockAdjustmentOpen) {
        processScanResult(barcode);
      }
    },
    ignoreWhenFocused: true
  });

  const startCameraScanner = async (cameraId?: string) => {
    setCameraError(null);
    
    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      });
    }

    const qrCodeScanner = html5QrCodeRef.current;
    
    if (qrCodeScanner.isScanning) {
      await qrCodeScanner.stop();
    }

    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        setAvailableCameras(devices);
        
        let targetCameraId = cameraId;
        if (!targetCameraId) {
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes("back") || 
            d.label.toLowerCase().includes("environment") ||
            d.label.toLowerCase().includes("rear")
          );
          targetCameraId = backCamera ? backCamera.id : devices[0].id;
        }
        
        setSelectedCameraId(targetCameraId);
        
        await qrCodeScanner.start(
          targetCameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
             processScanResult(decodedText);
          },
          (errorMessage) => {
             // Ignore background frame errors
          }
        );
        setIsScannerRunning(true);
        setIsFlashlightOn(false);
      } else {
        setCameraError("No cameras detected on this device.");
      }
    } catch (err: any) {
      // Format error for HTTPS/Permission issues
      let msg = err?.message || "Camera access was denied or is not supported.";
      if (typeof msg === "string" && msg.toLowerCase().includes("https")) {
        msg = "Camera access requires a secure HTTPS connection or localhost.";
      }
      setCameraError(msg);
    }
  };

  const switchCamera = () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCameraId = availableCameras[nextIndex].id;
    startCameraScanner(nextCameraId);
  };

  const toggleFlashlight = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: !isFlashlightOn }]
        });
        setIsFlashlightOn(!isFlashlightOn);
      } catch (e) {
        toast.error("Flashlight not supported on this camera");
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCameraScanner();
      if (html5QrCodeRef.current) {
         html5QrCodeRef.current.clear();
      }
    };
  }, []);

  // When changing modes, ensure camera is stopped
  useEffect(() => {
    if (scannerMode !== "CAMERA") {
      stopCameraScanner();
    }
  }, [scannerMode]);

  // Stock Adjustment
  const handleStockAdjustment = () => {
    if (!scannedProduct) return;
    const qty = parseFloat(adjustmentQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid positive quantity");
      return;
    }

    // Default to main warehouse / standard location
    const txn: InventoryTransaction = {
      productId: scannedProduct.id,
      warehouseId: "MAIN",
      locationId: "DEFAULT",
      quantityChange: adjustmentType === "IN" ? qty : -qty,
      transactionType: adjustmentType,
      notes: adjustmentNote || `Adjusted via Admin Scanner`,
    };

    insertInventoryTransaction(txn);
    toast.success(`Stock ${adjustmentType === "IN" ? "Added" : "Deducted"} successfully!`);
    setIsStockAdjustmentOpen(false);
    setAdjustmentQty("");
    setAdjustmentNote("");
  };

  // Edit Product
  const openEdit = () => {
    if (!scannedProduct) return;
    setEditingProduct({
      id: scannedProduct.id,
      sku: scannedProduct.sku ?? "",
      description: scannedProduct.description,
      hsn: scannedProduct.hsn,
      gstPercent: scannedProduct.gstPercent,
      defaultRate: scannedProduct.defaultRate,
      active: scannedProduct.active ?? true,
      lotNo: scannedProduct.lotNo ?? "",
      goodsFrom: scannedProduct.goodsFrom ?? "",
      size: scannedProduct.size ?? "",
      tread: scannedProduct.tread ?? "",
      grade: scannedProduct.grade ?? "",
      finish: scannedProduct.finish ?? "",
      head: scannedProduct.head ?? "",
    });
  };

  const saveProductEdit = () => {
    if (!editingProduct) return;
    if (!editingProduct.description.trim()) {
      toast.error("Product description is required");
      return;
    }
    const sku = editingProduct.sku.trim() || undefined;
    upsertProduct({
      id: editingProduct.id, // Important to pass ID for update
      sku,
      description: editingProduct.description.trim(),
      hsn: editingProduct.hsn.trim(),
      gstPercent: editingProduct.gstPercent,
      defaultRate: editingProduct.defaultRate,
      barcodeValue: sku,
      qrValue: sku,
      lotNo: editingProduct.lotNo?.trim() || undefined,
      goodsFrom: editingProduct.goodsFrom?.trim() || undefined,
      size: editingProduct.size?.trim() || undefined,
      tread: editingProduct.tread?.trim() || undefined,
      grade: editingProduct.grade?.trim() || undefined,
      finish: editingProduct.finish?.trim() || undefined,
      head: editingProduct.head?.trim() || undefined,
    });
    
    // Update local scanned product state to reflect changes
    setScannedProduct((prev) => {
      if (!prev) return null;
      return { ...prev, ...editingProduct };
    });
    
    toast.success("Product updated");
    setEditingProduct(null);
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            Admin Scanner
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            Scan a product QR code to retrieve secure administrative inventory information and live stock.
          </p>
        </div>

        <div className="flex bg-muted/30 p-1 rounded-lg max-w-md">
          <Button 
            variant={scannerMode === "CAMERA" ? "default" : "ghost"} 
            onClick={() => { setScannerMode("CAMERA"); setScannedProduct(null); }}
            className="flex-1 text-xs md:text-sm"
          >
            <Camera className="w-4 h-4 mr-2" /> Camera
          </Button>
          <Button 
            variant={scannerMode === "EXTERNAL" ? "default" : "ghost"} 
            onClick={() => { setScannerMode("EXTERNAL"); setScannedProduct(null); }}
            className="flex-1 text-xs md:text-sm"
          >
            <ScanBarcode className="w-4 h-4 mr-2" /> External
          </Button>
          <Button 
            variant={scannerMode === "MANUAL" ? "default" : "ghost"} 
            onClick={() => { setScannerMode("MANUAL"); setScannedProduct(null); }}
            className="flex-1 text-xs md:text-sm"
          >
            <Keyboard className="w-4 h-4 mr-2" /> Manual
          </Button>
        </div>

        {!scannedProduct ? (
          <>
            {scannerMode === "CAMERA" && (
              <div className="border-2 border-dashed rounded-xl p-4 md:p-10 flex flex-col items-center justify-center text-center bg-muted/10 relative">
                <div id={scannerContainerId} className={`w-full max-w-[350px] mx-auto overflow-hidden rounded-lg ${isScannerRunning ? "bg-black" : ""}`} />
                
                {!isScannerRunning ? (
                  <div className="py-8">
                    <Camera className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Scan with Camera</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                      Camera access is required to scan product QR codes.
                    </p>
                    {cameraError && (
                      <div className="text-red-500 text-sm mb-4 max-w-sm mx-auto p-3 bg-red-50 rounded-md">
                        {cameraError}
                      </div>
                    )}
                    <Button onClick={() => startCameraScanner(selectedCameraId)}>
                      {cameraError ? "Try Again" : "Allow Camera Access"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {availableCameras.length > 1 && (
                      <Button variant="outline" size="sm" onClick={switchCamera}>
                        <SwitchCamera className="w-4 h-4 mr-2" /> Switch Camera
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={toggleFlashlight}>
                      <Flashlight className={`w-4 h-4 mr-2 ${isFlashlightOn ? 'text-yellow-500' : ''}`} /> Flashlight
                    </Button>
                    <Button variant="destructive" size="sm" onClick={stopCameraScanner}>
                      <StopCircle className="w-4 h-4 mr-2" /> Stop Camera
                    </Button>
                  </div>
                )}
                {isScannerRunning && (
                  <div className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
                    Position the product QR code inside the frame. Searching for QR code...
                  </div>
                )}
              </div>
            )}

            {scannerMode === "EXTERNAL" && (
              <div className="border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center text-center bg-muted/10">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <ScanBarcode className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ready for external scanner input.</h3>
                <p className="text-muted-foreground max-w-sm">
                  Connect your USB or Bluetooth scanner, then scan a product QR code. The details will appear automatically.
                </p>
              </div>
            )}

            {scannerMode === "MANUAL" && (
              <div className="border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center bg-muted/10">
                <Keyboard className="w-12 h-12 text-primary/50 mb-6" />
                <h3 className="text-xl font-semibold mb-4">Enter Code Manually</h3>
                <form className="flex w-full max-w-md items-center space-x-2" onSubmit={(e) => { 
                  e.preventDefault(); 
                  if (manualInput.trim()) processScanResult(manualInput.trim()); 
                }}>
                  <Input 
                    type="text" 
                    placeholder="Enter or paste QR value / Product ID" 
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit">Find Product</Button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-primary/5 px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Scan Successful
                </div>
                <h2 className="text-2xl font-bold">{scannedProduct.description}</h2>
                <div className="text-sm text-muted-foreground mt-1 font-mono">
                  SKU / Code: {scannedProduct.sku || "N/A"}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white px-4 py-2 rounded-lg border shadow-sm flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                   <div className="flex items-center gap-2">
                     <Database className="w-4 h-4 text-primary" />
                     <span className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">Live Stock</span>
                   </div>
                   <span className={`text-xl font-bold ${liveStockQuantity > 0 ? "text-green-600" : "text-red-500"}`}>
                     {liveStockQuantity}
                   </span>
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                  <Button className="flex-1 sm:flex-none" variant="outline" onClick={() => {
                    setScannedProduct(null);
                    if (scannerMode === "CAMERA") {
                      startCameraScanner(selectedCameraId);
                    }
                  }}>
                    Scan Another
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  Secure Admin Details
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsStockAdjustmentOpen(true)}>
                    <ArrowRightLeft className="w-4 h-4 mr-2" /> Adjust Stock
                  </Button>
                  <Button variant="outline" size="sm" onClick={openEdit}>
                    <Pencil className="w-4 h-4 mr-2" /> Edit Master
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <DetailCard icon={Box} label="Lot No" value={scannedProduct.lotNo} />
                <DetailCard icon={Tag} label="Goods From" value={scannedProduct.goodsFrom} />
                <DetailCard icon={Ruler} label="Size" value={scannedProduct.size} />
                <DetailCard icon={Settings2} label="Tread" value={scannedProduct.tread} />
                <DetailCard icon={ShieldCheck} label="Grade" value={scannedProduct.grade} />
                <DetailCard icon={Layers} label="Finish (HDG)" value={scannedProduct.finish} />
                <DetailCard icon={Box} label="Head" value={scannedProduct.head} />
              </div>
            </div>

            <div className="bg-muted/30 px-6 py-4 border-t">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                Standard Billing Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">HSN</span>
                  <span className="font-medium">{scannedProduct.hsn || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">GST %</span>
                  <span className="font-medium">{scannedProduct.gstPercent}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Default Rate</span>
                  <span className="font-medium">
                    {scannedProduct.defaultRate != null ? `₹${scannedProduct.defaultRate}` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase mt-0.5 ${
                      scannedProduct.active
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {scannedProduct.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stock Adjustment Dialog */}
        <Dialog open={isStockAdjustmentOpen} onOpenChange={setIsStockAdjustmentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Live Stock</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Button 
                  variant={adjustmentType === "IN" ? "default" : "outline"} 
                  className={`flex-1 ${adjustmentType === "IN" ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={() => setAdjustmentType("IN")}
                >
                  Stock IN
                </Button>
                <Button 
                  variant={adjustmentType === "OUT" ? "default" : "outline"}
                  className={`flex-1 ${adjustmentType === "OUT" ? "bg-red-600 hover:bg-red-700" : ""}`}
                  onClick={() => setAdjustmentType("OUT")}
                >
                  Stock OUT
                </Button>
              </div>

              <Field label="Quantity">
                <Input 
                  type="number" 
                  min="0"
                  step="any"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder="e.g. 50"
                  autoFocus
                />
              </Field>

              <Field label="Reason / Notes (Optional)">
                <Input 
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="e.g. Received new batch"
                />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStockAdjustmentOpen(false)}>Cancel</Button>
              <Button onClick={handleStockAdjustment}>Apply Adjustment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={!!editingProduct} onOpenChange={(o) => !o && setEditingProduct(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product Master</DialogTitle>
            </DialogHeader>
            {editingProduct && (
              <div className="space-y-3">
                <Field label="SKU / Product Code">
                  <Input
                    value={editingProduct.sku}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        sku: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                      })
                    }
                  />
                </Field>
                <Field label="Description">
                  <Input
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </Field>
                <Field label="HSN Code">
                  <Input
                    value={editingProduct.hsn}
                    onChange={(e) => setEditingProduct({ ...editingProduct, hsn: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="GST %">
                    <Input
                      type="number"
                      value={editingProduct.gstPercent}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          gstPercent: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </Field>
                  <Field label="Default Rate (₹)">
                    <Input
                      type="number"
                      value={editingProduct.defaultRate ?? ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          defaultRate: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </Field>
                </div>

                <div className="pt-4 mt-4 border-t border-dashed">
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                    Admin Details (Optional)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Lot No">
                      <Input
                        value={editingProduct.lotNo}
                        onChange={(e) => setEditingProduct({ ...editingProduct, lotNo: e.target.value })}
                      />
                    </Field>
                    <Field label="Goods From">
                      <Input
                        value={editingProduct.goodsFrom}
                        onChange={(e) => setEditingProduct({ ...editingProduct, goodsFrom: e.target.value })}
                      />
                    </Field>
                    <Field label="Size">
                      <Input
                        value={editingProduct.size}
                        onChange={(e) => setEditingProduct({ ...editingProduct, size: e.target.value })}
                      />
                    </Field>
                    <Field label="Tread (half/full/long)">
                      <Input
                        value={editingProduct.tread}
                        onChange={(e) => setEditingProduct({ ...editingProduct, tread: e.target.value })}
                      />
                    </Field>
                    <Field label="Grade">
                      <Input
                        value={editingProduct.grade}
                        onChange={(e) => setEditingProduct({ ...editingProduct, grade: e.target.value })}
                      />
                    </Field>
                    <Field label="Finish (HDG)">
                      <Input
                        value={editingProduct.finish}
                        onChange={(e) => setEditingProduct({ ...editingProduct, finish: e.target.value })}
                      />
                    </Field>
                    <Field label="Head">
                      <Input
                        value={editingProduct.head}
                        onChange={(e) => setEditingProduct({ ...editingProduct, head: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
              <Button onClick={saveProductEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppShell>
  );
}

function DetailCard({
  icon: Icon,
  label,
  value,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="bg-muted/10 p-4 rounded-lg border border-muted/50 flex flex-col justify-between">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-semibold text-base sm:text-lg break-words line-clamp-2">
        {value || <span className="text-muted-foreground/50 italic font-normal text-sm">Not set</span>}
      </div>
    </div>
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
