// Modo "Montar proposta": cartões do catálogo e a proposta ativa sempre visível ao lado.
import { useState } from "react";
import { formatMoney, formatPercent } from "../lib/format";
import { CATALOG_CATEGORIES } from "../lib/model";
import type { CatalogItem, LineItem } from "../lib/model";
import { computeTotals, lineNet } from "../lib/totals";
import { useStore } from "../store/StoreProvider";
import { Icon } from "../ui/Icon";
import { useUI } from "../ui/UIProvider";
import { Photo } from "./Photo";

export type CategoryFilter = "Todos" | CatalogItem["category"];
export const CATEGORY_FILTERS: CategoryFilter[] = ["Todos", ...CATALOG_CATEGORIES];
export const filterLabel = (c: CategoryFilter) =>
  c === "Todos" ? "Todos" : c === "Máquina" ? "Máquinas" : "Acessórios";

export function matchesCatalog(item: CatalogItem, filter: CategoryFilter, query: string) {
  const q = query.trim().toLowerCase();
  return (
    (filter === "Todos" || item.category === filter) &&
    (!q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q))
  );
}

export function BuildMode({ onOpenStudio }: { onOpenStudio: () => void }) {
  const { data, active, updateActive, applyCatalogItem } = useStore();
  const { toast } = useUI();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("Todos");

  const count = (c: CategoryFilter) =>
    c === "Todos" ? data.catalog.length : data.catalog.filter((m) => m.category === c).length;
  const rows = data.catalog.filter((m) => matchesCatalog(m, filter, query));
  // a ligação entre catálogo e proposta é feita pelo nome do item
  const lineFor = (m: CatalogItem) => active.items.find((x) => x.desc === m.name);

  const setQty = (id: string, qty: number) =>
    updateActive((p) => ({
      ...p,
      items: qty <= 0 ? p.items.filter((x) => x.id !== id) : p.items.map((x) => (x.id === id ? { ...x, qty } : x)),
    }));

  const add = (m: CatalogItem) => {
    const msg = applyCatalogItem(m.id);
    if (msg) toast(msg, "success");
  };

  // sem regras de compatibilidade: sugere acessórios que ainda não estão na proposta
  const suggestions = active.machine.name
    ? data.catalog.filter((m) => m.category === "Acessório" && !lineFor(m)).slice(0, 3)
    : [];
  const totals = computeTotals(active);
  const lines = active.items.filter((x) => x.desc || x.unitPrice);

  const stepper = (line: LineItem, small?: boolean) => (
    <div className={`cx-step${small ? " cx-step--sm" : ""}`}>
      <button type="button" aria-label="Diminuir" onClick={() => setQty(line.id, line.qty - 1)}>
        {line.qty <= 1 ? "×" : "−"}
      </button>
      <span className="mono">{line.qty}</span>
      <button type="button" aria-label="Aumentar" onClick={() => setQty(line.id, line.qty + 1)}>
        +
      </button>
    </div>
  );

  return (
    <div className="cb">
      <div className="cb-main">
        <div className="cb-bar">
          <div className="search">
            <Icon name="search" size={14} />
            <input
              type="search"
              className="input"
              placeholder="Pesquisar equipamento ou SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="fx-chips cb-chips">
            {CATEGORY_FILTERS.map((c) => (
              <button key={c} type="button" className={c === filter ? "is-active" : ""} onClick={() => setFilter(c)}>
                {filterLabel(c)} {count(c)}
              </button>
            ))}
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="cb-sug">
            <div className="cb-sug__t">
              <span>Complete a proposta</span>
              <strong>{`Acessórios para ${active.machine.name}`}</strong>
            </div>
            {suggestions.map((m) => (
              <button key={m.id} type="button" onClick={() => add(m)}>
                <b>+</b>
                {m.name}
                <span className="mono">{formatMoney(m.basePrice)}</span>
              </button>
            ))}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="empty">Nenhum item corresponde à pesquisa.</div>
        ) : (
          <div className="cb-grid">
            {rows.map((m) => {
              const line = lineFor(m);
              return (
                <article key={m.id} className={`cb-card${line ? " is-in" : ""}`}>
                  <Photo src={m.image} sku={m.sku} />
                  <div className="cb-card__body">
                    <div className="cb-card__top">
                      <span className="mono strong">{m.sku || "—"}</span>
                      <span className="chip">{m.category}</span>
                    </div>
                    <h3>{m.name}</h3>
                    <div className="cb-card__specs">
                      {m.specs.slice(0, 2).map((s) => (
                        <span key={s.id}>{`${s.name}: ${s.value}`}</span>
                      ))}
                    </div>
                    <div className="cb-card__foot">
                      <span className="mono cb-card__price">{formatMoney(m.basePrice)}</span>
                      {line ? (
                        stepper(line)
                      ) : (
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => add(m)}>
                          + Adicionar
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <aside className="cb-tray">
        <div className="cb-tray__head">
          <span className="eyebrow">Proposta ativa</span>
          <strong className="mono">{active.ref || "Sem referência"}</strong>
          <span className="muted">{active.client.company || "Sem cliente"}</span>
        </div>
        <div className="cb-lines">
          {lines.length === 0 ? (
            <div className="cx-empty" style={{ padding: 24 }}>
              Ainda sem itens. Adicione equipamentos do catálogo.
            </div>
          ) : (
            lines.map((x) => (
              <div key={x.id} className="cb-line">
                <div className="cb-line__main">
                  <strong>{x.desc || "Sem descrição"}</strong>
                  <small className="mono">
                    {formatMoney(x.unitPrice) + (x.discount > 0 ? ` · −${formatPercent(x.discount)}` : "")}
                  </small>
                </div>
                {stepper(x, true)}
                <span className="mono strong cb-line__tot">{formatMoney(lineNet(x))}</span>
              </div>
            ))
          )}
        </div>
        <div className="cb-tot">
          <div>
            <span>Total s/ IVA</span>
            <span className="mono">{formatMoney(totals.netTotal)}</span>
          </div>
          <div>
            <span>IVA</span>
            <span className="mono">{formatMoney(totals.vatTotal)}</span>
          </div>
          <div className="cb-tot__g">
            <span>Total c/ IVA</span>
            <span className="mono">{formatMoney(totals.grandTotal)}</span>
          </div>
        </div>
        <button type="button" className="btn btn--primary" onClick={onOpenStudio}>
          Abrir no Studio
        </button>
      </aside>
    </div>
  );
}
