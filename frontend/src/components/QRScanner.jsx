import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const scannedRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (scannerRef.current) return;

    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minEdge * 0.7),
            height: Math.floor(minEdge * 0.7)
          };
        }
      },
      (decodedText) => {
        if (scannedRef.current) return;
        scannedRef.current = true;
        // Don't call stop() here to avoid race conditions with unmount cleanup.
        // Just trigger the onScan prop and let the parent unmount this component.
        onScanRef.current(decodedText);
      },
      (error) => {
        // ignore stream errors, they happen on every frame without a QR code
      }
    ).catch((err) => {
      console.error("Camera start failed", err);
      setErrorMsg("Failed to start camera. Please ensure you have granted camera permissions.");
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear();
          scannerRef.current = null;
        }).catch(e => {
          console.error("Failed to stop scanner", e);
          scannerRef.current = null;
        });
      }
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="brutal-card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-main)', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--accent-red)', color: 'white', border: '3px solid black', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
        >
          <X strokeWidth={3} size={20} />
        </button>
        <h2 style={{ textAlign: 'center', fontFamily: 'var(--font-family)', fontWeight: 900, marginTop: '10px' }}>SCAN TO CLAIM</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Scan the venue QR code</p>
        {errorMsg && (
          <div style={{ padding: '10px', background: 'var(--accent-red)', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            {errorMsg}
          </div>
        )}
        <div id="qr-reader" style={{ width: "100%", minHeight: "300px", border: "4px solid black", background: "white" }}></div>
      </div>
    </div>
  );
}
