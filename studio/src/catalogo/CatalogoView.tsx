// Catálogo: lista pesquisável + ficha do item editável no próprio painel, e modo "Montar proposta".
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { formatMoney, newId, round2 } from "../lib/format";
import { CATALOG_CATEGORIES, blankCatalogItem } from "../lib/model";
import type { CatalogCategory, CatalogItem } from "../lib/model";
import { useStore } from "../store/StoreProvider";
import { SpecRows, blankSpec } from "../studio/tabs";
import { Field, NumberInput, VatSelect } from "../ui/fields";
import { Icon } from "../ui/Icon";
import { useUI } from "../ui/UIProvider";
import { BuildMode, CATEGORY_FILTERS, filterLabel, matchesCatalog } from "./BuildMode";
import type { CategoryFilter } from "./BuildMode";
import { Photo, shrinkImage } from "./Photo";

type Mode = "gerir" | "montar";

export function CatalogoView({ onOpenStudio }: { onOpenStudio: () => void }) {
  const { data, active, upsertCatalogItem, deleteCatalogItem, applyCatalogItem } = useStore();
  const { toast, confirm } = useUI();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("Todos");
  const [selectedId, setSelectedId] = useState<string | null>(() => data.catalog[0]?.id ?? null);
  const [draft, setDraft] = useState<CatalogItem | null>(null);
  const [qty, setQty] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [photoUrl, setPhotoUrl] = useState("");
  const [mode, setMode] = useState<Mode>("gerir");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQty(1);
    setDiscount(0);
  }, [selectedId]);

  const current = data.catalog.find((m) => m.id === selectedId) ?? null;
  const count = (c: CategoryFilter) =>
    c === "Todos" ? data.catalog.length : data.catalog.filter((m) => m.category === c).length;
  const rows = data.catalog.filter((m) => matchesCatalog(m, filter, query));
  const qtyInActive = (m: CatalogItem) =>
    active.items.filter((x) => x.desc === m.name).reduce((acc, x) => acc + x.qty, 0);
  const usedIn = (m: CatalogItem) => data.proposals.filter((p) => p.items.some((x) => x.desc === m.name)).length;
  const lineTotal = current ? round2(current.basePrice * qty * (1 - discount / 100)) : 0;
  const isNew = !!draft && !data.catalog.some((m) => m.id === draft.id);

  const startEdit = (m: CatalogItem) => {
    setDraft(structuredClone(m));
    // um link externo volta ao campo; uma foto carregada (data:) não
    setPhotoUrl(m.image && !m.image.startsWith("data:") ? m.image : "");
  };
  const setField = <K extends keyof CatalogItem>(key: K, value: CatalogItem[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) return toast("Indique o nome do item.", "error");
    upsertCatalogItem(draft);
    setSelectedId(draft.id);
    toast(isNew ? "Item adicionado ao catálogo." : "Item atualizado.", "success");
    setDraft(null);
  };

  const remove = async () => {
    const item = draft ?? current;
    if (!item) return;
    const ok = await confirm({
      title: "Eliminar do catálogo",
      message: `Eliminar ${item.sku || item.name} do catálogo? As propostas já criadas não são afetadas.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    deleteCatalogItem(item.id);
    setSelectedId(data.catalog.find((x) => x.id !== item.id)?.id ?? null);
    setDraft(null);
    toast("Item eliminado do catálogo.", "info");
  };

  const duplicate = () => {
    if (!current) return;
    const copy: CatalogItem = {
      ...structuredClone(current),
      id: newId("cat"),
      sku: current.sku ? `${current.sku}-COPIA` : "",
      name: `${current.name} (cópia)`,
      specs: current.specs.map((s) => ({ ...s, id: newId("sp") })),
    };
    upsertCatalogItem(copy);
    setSelectedId(copy.id);
    startEdit(copy);
    toast("Item duplicado — reveja e guarde.", "info");
  };

  const insert = () => {
    if (!current) return;
    const msg = applyCatalogItem(current.id, { qty, discount });
    if (msg) toast(msg, "success");
  };

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setField("image", await shrinkImage(file));
      setPhotoUrl("");
    } catch {
      toast("Não foi possível ler a imagem.", "error");
    }
  };

  const useLink = () => {
    const url = photoUrl.trim();
    if (!/^https?:\/\//i.test(url)) return toast("Indique um link começado por http:// ou https://.", "error");
    setField("image", url);
  };

  const inActive = current ? qtyInActive(current) : 0;
  const used = current ? usedIn(current) : 0;

  return (
    <section className="view">
      <div className="view__head" style={{ width: 1154, maxWidth: "100%", height: 74 }}>
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1>Equipamentos industriais</h1>
          <p className="muted">Máquinas CNC e acessórios para inserção direta em propostas.</p>
        </div>
        <div className="row" style={{ alignItems: "center" }}>
          <div className="fx-tabs">
            {(
              [
                ["gerir", "Gerir catálogo"],
                ["montar", "Montar proposta"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={mode === value ? "is-active" : ""}
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "gerir" && (
            <button type="button" className="btn btn--primary" onClick={() => startEdit(blankCatalogItem())}>
              <Icon name="plus" /> Novo item
            </button>
          )}
        </div>
      </div>

      {mode === "montar" ? (
        <BuildMode onOpenStudio={onOpenStudio} />
      ) : (
        <div className="cx">
          <aside className="cx-list">
            <div className="cx-list__head">
              <div className="search">
                <Icon name="search" size={14} />
                <input
                  type="search"
                  className="input"
                  placeholder="Pesquisar por nome ou SKU…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="cx-seg">
                {CATEGORY_FILTERS.map((c) => (
                  <button key={c} type="button" className={c === filter ? "is-active" : ""} onClick={() => setFilter(c)}>
                    {filterLabel(c)}
                    <span className="mono">{count(c)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="cx-rows">
              {rows.length === 0 ? (
                <div className="cx-empty">
                  {data.catalog.length ? "Nenhum item corresponde à pesquisa." : "O catálogo está vazio."}
                </div>
              ) : (
                rows.map((m) => {
                  const k = qtyInActive(m);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`cx-row${m.id === selectedId && !(draft && isNew) ? " is-active" : ""}`}
                      onClick={() => {
                        setSelectedId(m.id);
                        setDraft(null);
                      }}
                    >
                      <Photo src={m.image} size="sm" />
                      <span className="cx-row__main">
                        <span className="cx-row__name">{m.name || "Sem nome"}</span>
                        <span className="cx-row__sub">
                          <span className="mono strong">{m.sku || "—"}</span> · {m.category}
                        </span>
                      </span>
                      <span className="cx-row__side">
                        <span className="mono strong cx-price">{formatMoney(m.basePrice)}</span>
                        {k > 0 && <span className="cx-badge">{`Na proposta ×${k}`}</span>}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="cx-detail">
            {draft ? (
              <>
                <div className="cx-body">
                  <div className="cx-top">
                    <span className="eyebrow">{isNew ? "Novo item" : "Editar item"}</span>
                    <span className="cx-k">As propostas já criadas não são afetadas.</span>
                  </div>
                  <div className="cx-photo-edit">
                    <Photo src={draft.image} sku={draft.sku} />
                    <div className="cx-photo-edit__ctl">
                      <span className="field__label">Foto do equipamento</span>
                      <div className="row">
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => fileRef.current?.click()}
                        >
                          <Icon name="plus" size={14} /> Carregar do computador
                        </button>
                        {draft.image && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => {
                              setField("image", "");
                              setPhotoUrl("");
                            }}
                          >
                            Remover foto
                          </button>
                        )}
                      </div>
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
                      <div className="cx-url">
                        <input
                          type="url"
                          className="input"
                          placeholder="ou cole um link https://…"
                          value={photoUrl}
                          onChange={(e) => setPhotoUrl(e.target.value)}
                        />
                        <button type="button" className="btn btn--secondary btn--sm" onClick={useLink}>
                          Usar link
                        </button>
                      </div>
                      <span className="field__hint">
                        {draft.category === "Máquina"
                          ? "Aparece na proposta impressa quando este item é inserido como equipamento principal."
                          : "Visível no catálogo. Só as fotos de máquinas aparecem na proposta impressa."}
                      </span>
                    </div>
                  </div>
                  <div className="grid-3">
                    <Field label="Referência (SKU)">
                      <input
                        type="text"
                        className="input input--mono"
                        value={draft.sku}
                        onChange={(e) => setField("sku", e.target.value)}
                      />
                    </Field>
                    <Field label="Categoria">
                      <select
                        className="select"
                        value={draft.category}
                        onChange={(e) => setField("category", e.target.value as CatalogCategory)}
                      >
                        {CATALOG_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid-2">
                      <Field label="Preço base (€)">
                        <NumberInput value={draft.basePrice} onChange={(v) => setField("basePrice", v)} />
                      </Field>
                      <Field label="IVA">
                        <VatSelect value={draft.vat} onChange={(v) => setField("vat", v)} />
                      </Field>
                    </div>
                  </div>
                  <Field label="Nome">
                    <input
                      type="text"
                      className="input"
                      value={draft.name}
                      placeholder="Nome do equipamento"
                      onChange={(e) => setField("name", e.target.value)}
                    />
                  </Field>
                  <Field label="Descrição">
                    <textarea
                      className="textarea"
                      rows={3}
                      value={draft.description}
                      onChange={(e) => setField("description", e.target.value)}
                    />
                  </Field>
                  <div className="section-block">
                    <div className="section-head">
                      <h3 className="section-title">Parâmetros técnicos</h3>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setField("specs", [...draft.specs, blankSpec()])}
                      >
                        <Icon name="plus" size={14} /> Adicionar
                      </button>
                    </div>
                    <SpecRows specs={draft.specs} onChange={(specs) => setField("specs", specs)} />
                  </div>
                </div>
                <div className="cx-foot">
                  {!isNew && (
                    <button type="button" className="btn btn--danger" onClick={remove}>
                      Eliminar
                    </button>
                  )}
                  <span style={{ marginLeft: "auto" }} />
                  <button type="button" className="btn btn--secondary" onClick={() => setDraft(null)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn--primary" onClick={save}>
                    Guardar item
                  </button>
                </div>
              </>
            ) : current ? (
              <>
                <div className="cx-body">
                  <div className="cx-top">
                    <div className="cx-meta">
                      <span className="mono strong" style={{ color: "var(--blue)" }}>
                        {current.sku || "Sem referência"}
                      </span>
                      <span className="chip">{current.category}</span>
                      <span>
                        {used
                          ? `Usado em ${used}${used === 1 ? " proposta" : " propostas"}`
                          : "Ainda não usado em propostas"}
                      </span>
                    </div>
                    <div className="row">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={duplicate}>
                        Duplicar
                      </button>
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => startEdit(current)}>
                        <Icon name="edit" size={14} /> Editar
                      </button>
                    </div>
                  </div>
                  <div className="cx-hero">
                    <Photo src={current.image} sku={current.sku} />
                    <div>
                      <h2>{current.name}</h2>
                      <p className="muted">{current.description}</p>
                    </div>
                  </div>
                  {current.specs.length > 0 && (
                    <div className="stack" style={{ gap: 8 }}>
                      <h3 className="section-title">Parâmetros técnicos</h3>
                      <div className="cx-specs">
                        {current.specs.map((s) => (
                          <div key={s.id} className="cx-spec">
                            <span>{s.name}</span>
                            <strong className="mono">{s.value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="cx-foot">
                  <div className="cx-foot__price">
                    <span className="cx-k">Preço base (s/ IVA)</span>
                    <span className="mono cx-big">{formatMoney(current.basePrice)}</span>
                  </div>
                  <div className="cx-f">
                    <span className="cx-k">Qtd.</span>
                    <div className="cx-step">
                      <button type="button" aria-label="Diminuir" onClick={() => setQty((v) => Math.max(1, v - 1))}>
                        −
                      </button>
                      <span className="mono">{qty}</span>
                      <button type="button" aria-label="Aumentar" onClick={() => setQty((v) => v + 1)}>
                        +
                      </button>
                    </div>
                  </div>
                  <div className="cx-f cx-disc">
                    <span className="cx-k">Desconto %</span>
                    <NumberInput value={discount} min={0} max={100} ariaLabel="Desconto" onChange={setDiscount} />
                  </div>
                  <div className="cx-f" style={{ alignItems: "flex-end", minWidth: 110 }}>
                    <span className="cx-k">Total da linha</span>
                    <span className="mono strong">{formatMoney(lineTotal)}</span>
                  </div>
                  <div className="cx-ins">
                    <button type="button" className="btn btn--primary" onClick={insert}>
                      <Icon name="plus" size={14} /> {`Inserir em ${active.ref}`}
                    </button>
                    <small>{inActive ? `Já está na proposta (×${inActive})` : "Ainda não está na proposta"}</small>
                  </div>
                </div>
              </>
            ) : (
              <div className="cx-empty">Selecione um item do catálogo.</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
