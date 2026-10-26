import { useCallback, useMemo, useState } from "react";
import { CatalogoView } from "./catalogo/CatalogoView";
import { Header } from "./components/Header";
import type { ViewId } from "./components/Header";
import { JsonModal } from "./components/JsonModal";
import { DocumentosView } from "./documentos/DocumentosView";
import { formatMoney } from "./lib/format";
import { useStore } from "./store/StoreProvider";
import { printWithTitle } from "./studio/ProposalDoc";
import { StudioView } from "./studio/StudioView";
import { PickerModal } from "./ui/PickerModal";
import { useUI } from "./ui/UIProvider";
import { ClientesView } from "./views/Clientes";
import { PropostasView } from "./views/Propostas";

type Dialog = "pick-client" | "pick-catalog" | "json" | null;

export function App() {
  const { data, active, dirty, storageError, saveActive, applyClient, applyCatalogItem } = useStore();
  const { toast } = useUI();
  const [view, setView] = useState<ViewId>("studio");
  const [dialog, setDialog] = useState<Dialog>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  const openStudio = useCallback(() => setView("studio"), []);

  const save = () => {
    const { created, duplicateRef } = saveActive();
    toast(
      created ? `Proposta ${active.ref} guardada no histórico.` : `Proposta ${active.ref} atualizada.`,
      "success",
    );
    if (duplicateRef) toast(`Atenção: já existe outra proposta com a referência ${active.ref}.`, "error");
  };

  // Imprime sempre a proposta: muda para o Studio antes, se for preciso
  const print = () => {
    const run = () => printWithTitle(`Proposta ${active.ref} - ${data.issuer.tradeName}`);
    if (view === "studio") run();
    else {
      setView("studio");
      window.setTimeout(run, 150);
    }
  };

  const clientItems = useMemo(
    () =>
      data.clients.map((c) => ({
        id: c.id,
        title: c.company,
        subtitle: [c.contact, c.sector].filter(Boolean).join(" · "),
      })),
    [data.clients],
  );
  const catalogItems = useMemo(
    () =>
      data.catalog.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: `${c.category} · ${formatMoney(c.basePrice)}`,
      })),
    [data.catalog],
  );

  return (
    <>
      <Header
        view={view}
        onView={setView}
        dirty={dirty}
        storageError={storageError}
        onSave={save}
        onJson={() => setDialog("json")}
        onPrint={print}
      />
      <main className="main">
        {view === "studio" && (
          <StudioView onPickClient={() => setDialog("pick-client")} onPickCatalog={() => setDialog("pick-catalog")} />
        )}
        {view === "propostas" && <PropostasView onOpenStudio={openStudio} />}
        {view === "clientes" && <ClientesView onOpenStudio={openStudio} />}
        {view === "catalogo" && <CatalogoView onOpenStudio={openStudio} />}
        {view === "documentos" && <DocumentosView />}
      </main>

      {dialog === "pick-client" && (
        <PickerModal
          title="Selecionar cliente"
          icon="users"
          items={clientItems}
          emptyText="Ainda não há clientes. Adicione-os na vista Clientes."
          onClose={closeDialog}
          onPick={(id) => {
            const name = applyClient(id);
            closeDialog();
            if (name) toast(`${name} aplicado à proposta.`, "success");
          }}
        />
      )}
      {dialog === "pick-catalog" && (
        <PickerModal
          title="Selecionar equipamento do catálogo"
          icon="box"
          items={catalogItems}
          emptyText="O catálogo está vazio. Adicione itens na vista Catálogo."
          onClose={closeDialog}
          onPick={(id) => {
            const msg = applyCatalogItem(id);
            closeDialog();
            if (msg) toast(msg, "success");
          }}
        />
      )}
      {dialog === "json" && <JsonModal onClose={closeDialog} />}
    </>
  );
}
