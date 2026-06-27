import React, { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X } from "lucide-react";

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    // We delay slightly to ensure the DOM element is ready for the scanner
    const timer = setTimeout(() => {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      html5QrcodeScanner.render(
        (decodedText) => {
          // Prevent multiple scans
          html5QrcodeScanner.clear();
          onScan(decodedText);
        },
        (error) => {
          // ignore stream errors, they happen on every frame without a QR code
        }
      );
      
      scannerRef.current = html5QrcodeScanner;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
      }
    };
  }, [onScan]);

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
        <div id="qr-reader" style={{ width: "100%", border: "4px solid black", background: "white" }}></div>
      </div>
    </div>
  );
}
