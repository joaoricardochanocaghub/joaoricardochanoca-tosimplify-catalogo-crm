/* toSimplify Studio — cabeçalho, router por hash e cópia de segurança */
import { useEffect, useRef, useSyncExternalStore } from "react";
import { S, todayIso } from "./store";
import { Icon, UiHosts, confirmDialog, openModal, toast } from "./ui";
import { LOGO_SRC, PrintHost } from "./doc";
import { go, newProposal, parseHash, studioState, useHash, type ViewId } from "./nav";
import { StudioView } from "./views/Studio";
import { PropostasView } from "./views/Propostas";
import { ClientesView } from "./views/Clientes";
import { CatalogoView } from "./views/Catalogo";

const NAV: { id: ViewId; label: string; icon: string }[] = [
  { id: "studio", label: "Studio", icon: "file" },
  { id: "propostas", label: "Propostas", icon: "folder" },
  { id: "clientes", label: "Clientes", icon: "users" },
  { id: "catalogo", label: "Catálogo", icon: "box" },
];

function openBackup() {
  const readFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ""; return f; };
  openModal({
    title: "Cópia de segurança (JSON)", iconName: "code", wide: true,
    body: (close) => (
      <div className="stack">
        <p className="modal__text">Os dados ficam guardados apenas neste navegador. Exporte regularmente uma cópia em JSON para não os perder ou para os passar para outro dispositivo.</p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={() => {
            const blob = new Blob([S.exportBackup()], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `tosimplify-studio-${todayIso()}.json`;
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            toast("Cópia de segurança exportada.", "success");
          }}><Icon name="download" /> Exportar JSON</button>
          <label className="btn btn--secondary"><Icon name="plus" /> Juntar JSON
            <input type="file" accept="application/json,.json" hidden onChange={async (e) => {
              const file = readFile(e);
              if (!file) return;
              close();
              const ok = await confirmDialog({ title: "Juntar ficheiro", message: `Acrescentar aos dados atuais os clientes, produtos e propostas de "${file.name}"? Nada é apagado.`, confirmLabel: "Juntar" });
              if (!ok) return;
              try {
                const n = S.mergeBackup(await file.text());
                const total = n.clientes + n.produtos + n.propostas;
                toast(total ? `Acrescentados: ${n.clientes} cliente(s), ${n.produtos} produto(s), ${n.propostas} proposta(s).` : "Nada novo: tudo o que está no ficheiro já existia.", total ? "success" : "info");
              } catch (err) {
                console.error(err);
                toast("O ficheiro não é um JSON válido do toSimplify Studio.", "error");
              }
            }} />
          </label>
          <label className="btn btn--secondary"><Icon name="upload" /> Importar JSON
            <input type="file" accept="application/json,.json" hidden onChange={async (e) => {
              const file = readFile(e);
              if (!file) return;
              close();
              const ok = await confirmDialog({ title: "Importar cópia de segurança", message: `Substituir todos os dados atuais pelo conteúdo de "${file.name}"?`, confirmLabel: "Importar", danger: true });
              if (!ok) return;
              try {
                S.restoreBackup(await file.text());
                toast("Cópia de segurança importada.", "success");
              } catch (err) {
                console.error(err);
                toast("O ficheiro não é um JSON válido do toSimplify Studio.", "error");
              }
            }} />
          </label>
        </div>
        <p className="field__hint"><strong>Juntar</strong> acrescenta clientes, produtos e propostas do ficheiro aos dados atuais, sem apagar nada (ignora os que já existem). <strong>Importar</strong> substitui todos os dados atuais: propostas, clientes, catálogo e emitente.</p>
        <div className="section-block">
          <div className="section-head"><span className="section-title">Dados de demonstração</span></div>
          <button type="button" className="btn btn--danger btn--sm" style={{ alignSelf: "flex-start" }} onClick={async () => {
            close();
            const ok = await confirmDialog({ title: "Repor dados de demonstração", message: "Todos os dados atuais são substituídos pelos dados de exemplo. Exporte antes uma cópia se precisar deles.", confirmLabel: "Repor", danger: true });
            if (ok) { S.resetDemo(); toast("Dados de demonstração repostos.", "success"); go("studio/1"); }
          }}><Icon name="trash" size={14} /> Repor dados de demonstração</button>
        </div>
      </div>
    ),
  });
}

function Header({ view }: { view: ViewId }) {
  const dirty = S.isDirty();
  return (
    <header className="app-header no-print">
      <div className="app-header__inner">
        <button type="button" className="brand" aria-label="Ir para o Studio" onClick={() => go(`studio/${studioState.lastStep}`)}>
          <img className="brand__logo" src={LOGO_SRC} alt="toSimplify" /><span className="brand__ver">Studio 4.0</span>
        </button>
        <nav className="nav" aria-label="Navegação principal">
          {NAV.map((n) => (
            <button key={n.id} type="button" className={`nav__btn${view === n.id ? " is-active" : ""}`} aria-current={view === n.id ? "page" : undefined}
              onClick={() => go(n.id === "studio" ? `studio/${studioState.lastStep}` : n.id)}>
              <Icon name={n.icon} /><span className="nav__label">{n.label}</span>
              {n.id === "propostas" && <span className="count">{S.data.proposals.length}</span>}
              {n.id === "studio" && dirty && <span className="dirty-dot" title="Alterações por guardar" />}
            </button>
          ))}
        </nav>
        <div className="app-header__actions">
          {S.storageError && <span className="chip chip--error" title="O navegador recusou gravar os dados"><Icon name="alert" size={12} /> Sem gravação local</span>}
          <button type="button" className="btn btn--secondary hide-sm" onClick={openBackup}><Icon name="code" /> JSON</button>
          <button type="button" className="btn btn--primary" onClick={() => void newProposal()}><Icon name="plus" /><span>Nova</span></button>
        </div>
      </div>
    </header>
  );
}

export function StudioApp() {
  // Qualquer alteração aos dados redesenha a app (os componentes leem o estado mutável do store)
  useSyncExternalStore(S.subscribe, () => S.version, () => 0);
  const hash = useHash();
  const { view, params } = parseHash(window.location.hash || "#/studio/1");
  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(window.history.state, "", "#/studio/1");
  }, []);
  const prevView = useRef(view);
  useEffect(() => {
    if (prevView.current !== view) window.scrollTo(0, 0);
    prevView.current = view;
  }, [view]);

  return (
    <>
      <Header view={view} />
      <main className="main no-print" data-view={view}>
        {view === "studio" && <StudioView key={hash} params={params} />}
        {view === "propostas" && <PropostasView params={params} />}
        {view === "clientes" && <ClientesView params={params} />}
        {view === "catalogo" && <CatalogoView />}
      </main>
      <UiHosts />
      <PrintHost />
    </>
  );
}
