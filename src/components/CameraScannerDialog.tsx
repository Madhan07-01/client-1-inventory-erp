import { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, StopCircle, SwitchCamera, Flashlight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CameraScannerDialogProps {
  onScan: (barcode: string) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

export function CameraScannerDialog({ onScan, trigger, disabled }: CameraScannerDialogProps) {
  const [open, setOpen] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "invoice-camera-scanner";

  // Stop scanner safely
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      if (html5QrCodeRef.current.isScanning) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {
          // ignore errors on stop
        }
      }
      try {
        html5QrCodeRef.current.clear();
      } catch (e) {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
  };

  const startScanner = async (cameraId?: string) => {
    setIsInitializing(true);
    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128]
      });
    }

    const qrCodeScanner = html5QrCodeRef.current;
    if (qrCodeScanner.isScanning) {
      await qrCodeScanner.stop();
    }

    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setAvailableCameras(devices);
        
        let targetCameraId = cameraId;
        if (!targetCameraId) {
          // Prefer back camera
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes("back") || 
            d.label.toLowerCase().includes("rear") || 
            d.label.toLowerCase().includes("environment")
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
          async (decodedText) => {
            // Success callback
            await stopScanner();
            setOpen(false);
            onScan(decodedText);
          },
          (errorMessage) => {
            // ignore scan errors (it errors on every frame that doesn't have a barcode)
          }
        );
      } else {
        toast.error("No cameras found on this device.");
        setOpen(false);
      }
    } catch (e) {
      toast.error("Camera access denied or failed to initialize.");
      setOpen(false);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout;

    if (open) {
      timer = setTimeout(() => {
        if (mounted) startScanner();
      }, 100);
    } else {
      stopScanner();
    }
    
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      stopScanner();
    };
  }, [open]);

  const cycleCamera = () => {
    if (availableCameras.length < 2 || !selectedCameraId) return;
    const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    startScanner(availableCameras[nextIndex].id);
  };

  const toggleFlash = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: !isFlashlightOn }]
        });
        setIsFlashlightOn(!isFlashlightOn);
      } catch (e) {
        toast.error("Flashlight not supported on this camera.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2" disabled={disabled}>
            <Camera className="w-4 h-4" /> Scan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR / Barcode</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 items-center">
          <div className="relative w-full max-w-[300px] aspect-square rounded overflow-hidden border-2 border-dashed flex items-center justify-center bg-muted/30">
            <div id={scannerContainerId} className="w-full h-full" />
            
            {isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <span className="text-sm font-medium animate-pulse">Initializing Camera...</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-2 mt-2">
            {availableCameras.length > 1 && (
              <Button variant="outline" size="sm" onClick={cycleCamera} className="gap-2">
                <SwitchCamera className="w-4 h-4" /> Switch
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={toggleFlash} className="gap-2">
              <Flashlight className="w-4 h-4" /> Flash
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setOpen(false)} className="gap-2">
              <StopCircle className="w-4 h-4" /> Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
