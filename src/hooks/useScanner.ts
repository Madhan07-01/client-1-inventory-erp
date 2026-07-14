import { useEffect, useRef } from "react";

interface UseScannerProps {
  onScan: (barcode: string) => void;
  // Maximum time between keystrokes in ms. Humans usually type > 80ms, scanners usually < 30ms.
  timeBeforeScanTest?: number;
  // Whether to ignore scans when the user is focused on an input/textarea.
  ignoreWhenFocused?: boolean;
}

export function useScanner({
  onScan,
  timeBeforeScanTest = 50,
  ignoreWhenFocused = true,
}: UseScannerProps) {
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the user is focused on an input field
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT" ||
          (activeElement as HTMLElement).isContentEditable);

      if (ignoreWhenFocused && isInputFocused) {
        return; // Let normal typing happen
      }

      // Ignore modifiers
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const currentTime = new Date().getTime();

      // If it's the Enter key and we have a buffer, trigger the scan
      if (e.key === "Enter") {
        if (barcodeBuffer.current.length > 0) {
          const scannedCode = barcodeBuffer.current;
          barcodeBuffer.current = "";
          lastKeyTime.current = null;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          // Prevent the enter key from submitting forms if we caught a scan
          e.preventDefault();
          onScan(scannedCode);
        }
        return;
      }

      // If the key is a printable character
      if (e.key.length === 1) {
        // If it's been too long since the last keypress, reset the buffer
        if (
          lastKeyTime.current !== null &&
          currentTime - lastKeyTime.current > timeBeforeScanTest
        ) {
          barcodeBuffer.current = "";
        }

        barcodeBuffer.current += e.key;
        lastKeyTime.current = currentTime;

        // Clear the buffer if we don't get an Enter key soon
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          barcodeBuffer.current = "";
          lastKeyTime.current = null;
        }, timeBeforeScanTest * 2);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onScan, timeBeforeScanTest, ignoreWhenFocused]);
}
