/** Foto do equipamento, ou um quadro "Sem foto" com o SKU. */
export function Photo({ src, sku, size }: { src?: string; sku?: string; size?: "sm" }) {
  const className = `cx-photo${size ? ` cx-photo--${size}` : ""}`;
  return src ? (
    <img className={className} src={src} alt="" />
  ) : (
    <div className={`${className} cx-photo--empty`}>
      <span className="mono">Sem foto{sku ? ` · ${sku}` : ""}</span>
    </div>
  );
}

/** Lê uma imagem do computador e reduz para 900 px no lado maior (JPEG 85%, fundo branco). */
export function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * k);
        canvas.height = Math.round(img.height * k);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível"));
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
