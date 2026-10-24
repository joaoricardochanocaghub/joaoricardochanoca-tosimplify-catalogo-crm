/* toSimplify Studio — utilitários de interface: ícones, toasts, modais, foto */
import { useEffect, useRef, useState, useSyncExternalStore, type InputHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";

const ICONS: Record<string, string> = {
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  chevron: '<polyline points="9 18 15 12 9 6"/>',
  back: '<polyline points="15 18 9 12 15 6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  expand: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
};

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  // Conteúdo SVG estático e constante (sem dados do utilizador)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? "" }} />
  );
}

// ---------- pequeno store genérico ----------
function createList<T>() {
  let items: T[] = [];
  const subs = new Set<() => void>();
  return {
    get: () => items,
    set(next: T[]) { items = next; subs.forEach((f) => f()); },
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
  };
}
const noItems: never[] = [];

// ---------- toasts ----------
type ToastType = "info" | "success" | "error";
interface ToastItem { id: number; message: string; type: ToastType }
const toasts = createList<ToastItem>();
let toastSeq = 0;
export function toast(message: string, type: ToastType = "info") {
  const id = ++toastSeq;
  toasts.set([...toasts.get(), { id, message, type }]);
  window.setTimeout(() => toasts.set(toasts.get().filter((t) => t.id !== id)), 3600);
}
function ToastHost() {
  const list = useSyncExternalStore(toasts.subscribe, toasts.get, () => noItems);
  if (!list.length) return null;
  return createPortal(
    <div className="toasts no-print" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <Icon name={t.type === "error" ? "alert" : t.type === "success" ? "check" : "info"} />
          <span>{t.message}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}

// ---------- modais ----------
export interface ModalOpts {
  title: string; iconName?: string; wide?: boolean; xwide?: boolean;
  body: (close: () => void) => ReactNode;
  footer?: (close: () => void) => ReactNode;
  onClose?: () => void;
}
interface ModalItem extends ModalOpts { id: number; close: () => void }
const modals = createList<ModalItem>();
let modalSeq = 0;

export function openModal(opts: ModalOpts) {
  const id = ++modalSeq;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    modals.set(modals.get().filter((m) => m.id !== id));
    opts.onClose?.();
  };
  modals.set([...modals.get(), { ...opts, id, close }]);
  return { close };
}

function ModalView({ m }: { m: ModalItem }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") m.close(); };
    document.addEventListener("keydown", onKey);
    const el = ref.current;
    const focusable = el?.querySelector<HTMLElement>("[autofocus], .modal__body input, .modal__foot .btn--primary, .modal__foot .btn--danger-solid")
      ?? el?.querySelector<HTMLElement>("[data-close]");
    focusable?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const titleId = `m-${m.id}`;
  return (
    <div className="overlay no-print" ref={ref} onMouseDown={(e) => { if (e.target === e.currentTarget) m.close(); }}>
      <div className={`modal${m.wide ? " modal--wide" : ""}${m.xwide ? " modal--xwide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal__head">
          <h3 id={titleId} className="modal__title">{m.iconName && <Icon name={m.iconName} />}{m.title}</h3>
          <button type="button" className="btn btn--ghost btn--icon btn--sm" data-close aria-label="Fechar" onClick={m.close}><Icon name="x" /></button>
        </div>
        <div className="modal__body">{m.body(m.close)}</div>
        {m.footer && <div className="modal__foot">{m.footer(m.close)}</div>}
      </div>
    </div>
  );
}
function ModalHost() {
  const list = useSyncExternalStore(modals.subscribe, modals.get, () => noItems);
  if (!list.length) return null;
  return createPortal(<>{list.map((m) => <ModalView key={m.id} m={m} />)}</>, document.body);
}

// Confirmação; resolve true/false
export function confirmDialog({ title, message, confirmLabel = "Confirmar", danger = false }: { title: string; message: string; confirmLabel?: string; danger?: boolean }) {
  return new Promise<boolean>((resolve) => {
    let result = false;
    openModal({
      title, iconName: danger ? "alert" : "info",
      body: () => <p className="modal__text">{message}</p>,
      footer: (close) => (
        <>
          <button type="button" className="btn btn--secondary" data-close onClick={close}>Cancelar</button>
          <button type="button" className={`btn ${danger ? "btn--danger-solid" : "btn--primary"}`} onClick={() => { result = true; close(); }}>{confirmLabel}</button>
        </>
      ),
      onClose: () => resolve(result),
    });
  });
}

// Lista de escolha com pesquisa
interface PickItem { id: string; title: string; subtitle: string }
function PickBody({ items, emptyText, onPick }: { items: PickItem[]; emptyText: string; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const list = items.filter((i) => !term || `${i.title} ${i.subtitle}`.toLowerCase().includes(term));
  return (
    <>
      <div className="search search--modal"><Icon name="search" />
        <input type="search" className="input" placeholder="Procurar…" aria-label="Procurar" autoFocus value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div>
        {!list.length ? <p className="muted">{items.length ? "Sem resultados." : emptyText}</p> : (
          <ul className="pick-list">{list.map((i) => (
            <li key={i.id}><button type="button" className="pick" onClick={() => onPick(i.id)}>
              <span><strong>{i.title}</strong><small>{i.subtitle}</small></span><Icon name="chevron" />
            </button></li>
          ))}</ul>
        )}
      </div>
    </>
  );
}
export function pickDialog({ title, iconName, items, emptyText, onPick }: { title: string; iconName: string; items: PickItem[]; emptyText: string; onPick: (id: string) => void }) {
  openModal({
    title, iconName, wide: true,
    body: (close) => <PickBody items={items} emptyText={emptyText} onPick={(id) => { close(); onPick(id); }} />,
  });
}

// Lê uma imagem e reduz para JPEG (largura máx. 1400 px) para caber no localStorage
export function readImage(file: File | undefined, maxWidth = 1400, quality = 0.78) {
  return new Promise<string>((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error("O ficheiro não é uma imagem.")); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem.")); return; }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem.")); };
    img.src = url;
  });
}

// Campo de foto: pré-visualização + carregar/trocar + remover
export function PhotoField({ label, src, hint, onFile, onRemove }: { label: string; src: string; hint?: string; onFile: (f: File | undefined) => void; onRemove: () => void }) {
  return (
    <div className="field"><span className="field__label">{label}</span>
      <div className="photo-field">
        <div className={`photo-field__preview${src ? "" : " is-empty"}`}>{src ? <img src={src} alt="" /> : <Icon name="upload" size={20} />}</div>
        <div className="photo-field__actions">
          <label className="btn btn--secondary btn--sm"><Icon name="upload" size={14} /> {src ? "Trocar foto" : "Carregar foto"}
            <input type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {src && <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}><Icon name="trash" size={14} /> Remover</button>}
          {hint && <span className="field__hint">{hint}</span>}
        </div>
      </div>
    </div>
  );
}

export const StatusPill = ({ status }: { status: string }) => <span className={`status status--${status}`}>{status}</span>;

// Campo de texto que mantém o texto digitado (ex.: "1,5") enquanto tem foco
export function NumInput({ value, onValue, className = "input", ...rest }: { value: number; onValue: (raw: string) => void; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(String(value)); }, [value]);
  return (
    <input {...rest} className={className} inputMode="decimal" value={text}
      onFocus={(e) => { focused.current = true; rest.onFocus?.(e); }}
      onBlur={(e) => { focused.current = false; setText(String(value)); rest.onBlur?.(e); }}
      onChange={(e) => { setText(e.target.value); onValue(e.target.value); }} />
  );
}

export function UiHosts() {
  return <><ToastHost /><ModalHost /></>;
}
