import { useMemo } from "react";
import qrcode from "qrcode-generator";

/** Código QR (correção M) desenhado localmente; funciona sem ligação à internet. */
export function QrCode({ text }: { text: string }) {
  const src = useMemo(() => {
    try {
      const qr = qrcode(0, "M");
      qr.addData(text);
      qr.make();
      return qr.createDataURL(4, 0);
    } catch {
      return null;
    }
  }, [text]);

  return <div className="fx-qr">{src ? <img src={src} alt="Código QR" /> : <span>QR</span>}</div>;
}
