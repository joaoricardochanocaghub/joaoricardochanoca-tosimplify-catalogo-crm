// Avisos (toasts) e diálogo de confirmação partilhados por toda a app.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

export type ToastType = "info" | "success" | "error";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface UIValue {
  toast: (message: string, type?: ToastType) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const UIContext = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, message, type }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3600);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <UIContext.Provider value={value}>
      {children}
      <div className="toasts no-print" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role="status">
            <Icon name={t.type === "error" ? "alert" : t.type === "success" ? "check" : "info"} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      {pending && (
        <Modal
          title={pending.title}
          icon="alert"
          onClose={() => close(false)}
          footer={
            <>
              <button type="button" className="btn btn--secondary" onClick={() => close(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className={`btn ${pending.danger ? "btn--danger-solid" : "btn--primary"}`}
                onClick={() => close(true)}
                autoFocus
              >
                {pending.confirmLabel ?? "Confirmar"}
              </button>
            </>
          }
        >
          <p className="modal__text">{pending.message}</p>
        </Modal>
      )}
    </UIContext.Provider>
  );
}

export function useUI(): UIValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI tem de ser usado dentro de <UIProvider>");
  return ctx;
}
