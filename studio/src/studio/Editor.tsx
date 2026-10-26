import { useState } from "react";
import type { Proposal } from "../lib/model";
import { useStore } from "../store/StoreProvider";
import { Icon } from "../ui/Icon";
import { ConditionsTab, GeneralTab, TechnicalTab, TextTab, ValuesTab } from "./tabs";

type TabId = "geral" | "texto" | "tecnica" | "valores" | "condicoes";

const TABS: { id: TabId; label: string }[] = [
  { id: "geral", label: "Geral" },
  { id: "texto", label: "Texto" },
  { id: "tecnica", label: "Técnica" },
  { id: "valores", label: "Valores" },
  { id: "condicoes", label: "Condições" },
];

/** O que falta preencher em cada separador (texto vazio = nada a assinalar). */
export function missingByTab(p: Proposal): Record<TabId, string> {
  return {
    geral: !p.client.company.trim() ? "Falta o cliente" : "",
    texto: !p.context.trim() ? "Falta o contexto" : "",
    tecnica: !p.machine.name.trim()
      ? "Falta o equipamento"
      : p.machine.specs.length === 0
        ? "Sem especificações"
        : "",
    valores: p.items.some((it) => !it.unitPrice) ? "Há itens sem preço" : "",
    condicoes: "",
  };
}

interface EditorProps {
  onPickClient: () => void;
  onPickCatalog: () => void;
}

export function Editor({ onPickClient, onPickCatalog }: EditorProps) {
  const { dirty, active } = useStore();
  const [tab, setTab] = useState<TabId>("geral");
  const missing = missingByTab(active);

  return (
    <aside className="editor no-print" aria-label="Editor de proposta">
      <div className="editor__head">
        <div className="editor__title">
          <span className={`dot${dirty ? " dot--dirty" : ""}`} aria-hidden="true" />
          <h2>Editor de proposta</h2>
        </div>
        <div className="editor__quick">
          <button type="button" className="btn btn--secondary btn--sm" onClick={onPickClient}>
            <Icon name="userPlus" size={14} /> Cliente
          </button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onPickCatalog}>
            <Icon name="box" size={14} /> Equipamento
          </button>
        </div>
      </div>
      {dirty && <p className="editor__dirty">Alterações por guardar no histórico.</p>}
      <div className="tabs" role="tablist" aria-label="Secções da proposta">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tabs__btn${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
            title={missing[t.id] || undefined}
          >
            {t.label}
            {missing[t.id] && <span className="tabs__flag" aria-label={missing[t.id]} />}
          </button>
        ))}
      </div>
      <div className="editor__body" role="tabpanel">
        {tab === "geral" && <GeneralTab />}
        {tab === "texto" && <TextTab />}
        {tab === "tecnica" && <TechnicalTab />}
        {tab === "valores" && <ValuesTab />}
        {tab === "condicoes" && <ConditionsTab />}
      </div>
    </aside>
  );
}
