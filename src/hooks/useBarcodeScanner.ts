"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface BarcodeResult {
  rawValue: string;
  format: string;
  timestamp: number;
}

export function useBarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<BarcodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanLoopRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);

  const stopScanner = useCallback(async () => {
    setIsScanning(false);
    if (scanLoopRef.current != null) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScanner = useCallback(async (onDetected?: (value: string) => void) => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
      setIsScanning(true);

      // Native BarcodeDetector (Chrome/Edge/Android) — no extra dep, runs on-device.
      const NativeDetector = (window as any).BarcodeDetector;
      if (!NativeDetector) {
        setError("Live camera decode not supported on this browser — use manual/HID scanner input");
        return;
      }
      try {
        detectorRef.current = new NativeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"] });
      } catch {
        detectorRef.current = new NativeDetector();
      }
      const loop = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          scanLoopRef.current = requestAnimationFrame(loop);
          return;
        }
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          const first = codes?.[0]?.rawValue as string | undefined;
          if (first) {
            setLastResult({ rawValue: first, format: codes[0].format ?? "camera", timestamp: Date.now() });
            onDetected?.(first);
            await stopScanner();
            return;
          }
        } catch {
          // transient decode failure — keep scanning
        }
        scanLoopRef.current = requestAnimationFrame(loop);
      };
      scanLoopRef.current = requestAnimationFrame(loop);
    } catch (err) {
      setError("Camera access denied or not available");
    }
  }, [stopScanner]);

  const scanFromInput = useCallback((value: string) => {
    setLastResult({
      rawValue: value,
      format: "manual",
      timestamp: Date.now(),
    });
    return value;
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return {
    videoRef,
    isScanning,
    lastResult,
    error,
    startScanner,
    stopScanner,
    scanFromInput,
    clearResult: () => setLastResult(null),
  };
}
