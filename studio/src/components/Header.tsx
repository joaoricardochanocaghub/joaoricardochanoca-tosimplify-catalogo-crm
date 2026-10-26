import logo from "../assets/logo.png";
import { Icon } from "../ui/Icon";

export type ViewId = "catalogo" | "clientes" | "propostas" | "studio" | "documentos";

export const NAV_ITEMS: { id: ViewId; label: string }[] = [
  { id: "catalogo", label: "Catálogo" },
  { id: "clientes", label: "Clientes" },
  { id: "propostas", label: "Propostas" },
  { id: "studio", label: "Studio" },
  { id: "documentos", label: "Documentos" },
];

interface HeaderProps {
  view: ViewId;
  onView: (view: ViewId) => void;
  dirty: boolean;
  storageError: boolean;
  onSave: () => void;
  onJson: () => void;
  onPrint: () => void;
}

export function Header({ view, onView, dirty, storageError, onSave, onJson, onPrint }: HeaderProps) {
  return (
    <header className="app-header no-print">
      <div className="app-header__inner">
        <button type="button" className="brand" onClick={() => onView("studio")} aria-label="Ir para o Studio">
          <img className="brand__logo" src={logo} alt="ToSimplify" />
        </button>
        <nav className="nav" aria-label="Navegação principal" style={{ width: 461, maxWidth: "100%", height: 36 }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav__btn${view === item.id ? " is-active" : ""}`}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => onView(item.id)}
            >
              <span className="nav__label">{item.label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="btn btn--ghost" onClick={onJson} title="JSON e backup">
          <Icon name="code" />
          <span className="hide-sm">JSON</span>
        </button>
        <div className="app-header__actions">
          {storageError && (
            <span className="chip chip--error" title="O browser recusou gravar os dados. Exporte um backup.">
              <Icon name="alert" size={14} /> Sem gravação local
            </span>
          )}
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onSave}
            title="Guardar no histórico"
            aria-label="Guardar"
          >
            <Icon name="save" />
            {dirty && <span className="dirty-dot" aria-label="Alterações por guardar" />}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onPrint}
            title="Imprimir / PDF"
            aria-label="Imprimir / PDF"
          >
            <Icon name="printer" />
          </button>
        </div>
      </div>
    </header>
  );
}
