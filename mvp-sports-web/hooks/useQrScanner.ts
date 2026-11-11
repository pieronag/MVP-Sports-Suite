"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Html5Qrcode } from "html5-qrcode";

// Escáner de QR para recepción: cámara en vivo (html5-qrcode) y, si el navegador no permite la cámara en vivo
// (sin HTTPS, iOS antiguo), foto con la cámara nativa. Entrega solo el texto leído; qué hacer con él lo decide la pantalla.
// Necesita en la pantalla: <div id="qr-reader" /> dentro del visor, <div id="qr-reader-hidden" hidden /> y
// <input id="native-camera-input" type="file" accept="image/*" capture="environment" onChange={onNativeCapture} hidden />.
export function useQrScanner(onCode: (text: string) => void, onPhotoError: (title: string, message: string) => void) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"prompt" | "granted" | "denied" | "unknown">("unknown");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try { if (scannerRef.current.isScanning) await scannerRef.current.stop(); }
      catch (e) { console.warn("Error al detener el escáner:", e); }
      scannerRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const startCamera = () => {
    setIsCameraOpen(true);
    setCameraError(null);
    // El visor (#qr-reader) se monta con el modal: se espera un instante antes de iniciar
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 30, qrbox: (w, h) => { const size = Math.floor(Math.min(w, h) * 0.8); return { width: size, height: size }; } },
          (text) => { void stopCamera(); onCode(text); },
          () => {},
        );
      } catch {
        // Sin cámara en vivo: se ofrece la foto con la cámara nativa
        console.warn("Cámara en vivo no disponible; se usa la cámara nativa.");
        await stopCamera();
        (document.getElementById("native-camera-input") as HTMLInputElement | null)?.click();
      }
    }, 300);
  };

  const onNativeCapture = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a sacar la misma foto
    if (!file) return;
    try {
      onCode(await new Html5Qrcode("qr-reader-hidden").scanFile(file, true));
    } catch {
      onPhotoError("Error de escaneo", "No se detectó un código QR. Intenta tomar la foto más cerca, enfocada y con buena iluminación.");
    }
  };

  // Al salir de la pantalla, la cámara se apaga
  useEffect(() => () => { if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {}); }, []);

  // Estado del permiso de cámara (para avisar si está bloqueado)
  useEffect(() => {
    if (!navigator.permissions?.query) return;
    navigator.permissions.query({ name: "camera" as PermissionName })
      .then((r) => { setCameraPermission(r.state as typeof cameraPermission); r.onchange = () => setCameraPermission(r.state as typeof cameraPermission); })
      .catch(() => setCameraPermission("unknown"));
  }, []);

  return { isCameraOpen, cameraError, cameraPermission, startCamera, stopCamera, onNativeCapture };
}
