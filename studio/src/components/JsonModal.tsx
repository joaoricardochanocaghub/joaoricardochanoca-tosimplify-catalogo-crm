// JSON da proposta ativa (copiar/carregar) e backup completo (descarregar/restaurar).
import { useRef, useState } from "react";
import { todayIso } from "../lib/format";
import { useStore } from "../store/StoreProvider";
import { Icon } from "../ui/Icon";
import { Modal } from "../ui/Modal";
import { useUI } from "../ui/UIProvider";

export function JsonModal({ onClose }: { onClose: () => void }) {
  const { active, importProposal, exportBackup, restoreBackup } = useStore();
  const { toast, confirm } = useUI();
  const [text, setText] = useState(() => JSON.stringify(active, null, 2));
  const fileRef = useRef<HTMLInputElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("JSON copiado para a área de transferência.", "info");
    } catch {
      toast("Não foi possível copiar. Selecione o texto e copie manualmente.", "error");
    }
  };

  const load = () => {
    try {
      importProposal(JSON.parse(text));
      toast("Proposta carregada no editor como nova proposta por guardar.", "success");
      onClose();
    } catch {
      toast("JSON inválido. Verifique a sintaxe.", "error");
    }
  };

  const download = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tosimplify-studio-backup-${todayIso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup descarregado.", "success");
  };

  const restore = async (file: File) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      toast("O ficheiro não é um JSON válido.", "error");
      return;
    }
    const ok = await confirm({
      title: "Restaurar backup",
      message:
        "Isto substitui todas as propostas, clientes, catálogo e dados do emitente atuais pelos do ficheiro.",
      confirmLabel: "Restaurar",
      danger: true,
    });
    if (ok) {
      restoreBackup(parsed);
      toast("Backup restaurado.", "success");
      onClose();
    }
  };

  return (
    <Modal wide title="JSON e backup" icon="code" onClose={onClose}>
      <div className="stack">
        <label className="field">
          <span className="field__label">Proposta ativa (JSON)</span>
          <textarea
            className="textarea textarea--code"
            rows={12}
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="row row--between">
          <button type="button" className="btn btn--secondary" onClick={copy}>
            <Icon name="copy" /> Copiar JSON
          </button>
          <button type="button" className="btn btn--primary" onClick={load}>
            <Icon name="upload" /> Carregar para o editor
          </button>
        </div>
        <div className="section-block">
          <h3 className="section-title">Backup completo</h3>
          <p className="muted">
            Inclui propostas, clientes, catálogo e dados do emitente. Os dados vivem apenas neste browser.
          </p>
          <div className="row">
            <button type="button" className="btn btn--secondary" onClick={download}>
              <Icon name="download" /> Descarregar backup
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" /> Restaurar de ficheiro
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void restore(file);
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
