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

  const stopScanner = useCallback(async () => {
    setIsScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
      }
    } catch (err) {
      setError("Camera access denied or not available");
    }
  }, []);

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
