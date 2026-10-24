/* toSimplify Studio — vista Catálogo: tabela densa com linhas expansíveis e especificações editáveis */
import { useState } from "react";
import { CATEGORIES, S, VAT_RATES, money, num, vatLabel, type CatalogItem, type Category } from "../store";
import { Icon, NumInput, PhotoField, confirmDialog, readImage, toast } from "../ui";
import { go } from "../nav";

const ui = { query: "", category: "Todas", open: new Set<string>() };

function Detail({ c, onDeleted }: { c: CatalogItem; onDeleted: () => void }) {
  const set = <K extends keyof CatalogItem>(k: K, v: CatalogItem[K]) => { c[k] = v; S.changed(); };
  const text = (label: string, key: "sku" | "name", full = false) => (
    <label className={`field${full ? " field--full" : ""}`}><span className="field__label">{label}</span>
      <input type="text" className="input" data-key={key} value={c[key]} onChange={(e) => set(key, e.target.value)} /></label>
  );
  return (
    <div className="crow__detail">
      <div className="grid-4">
        {text("SKU", "sku")}
        <label className="field"><span className="field__label">Categoria</span>
          <select className="select" value={c.category} onChange={(e) => set("category", e.target.value as Category)}>{CATEGORIES.map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="field"><span className="field__label">Preço base (€)</span>
          <NumInput value={c.basePrice} onValue={(v) => set("basePrice", Math.max(num(v), 0))} /></label>
        <label className="field"><span className="field__label">IVA</span>
          <select className="select" value={c.vat} onChange={(e) => set("vat", Math.max(num(e.target.value), 0))}>{VAT_RATES.map((r) => <option key={r} value={r}>{vatLabel(r)}</option>)}</select></label>
      </div>
      {text("Nome", "name", true)}
      <label className="field"><span className="field__label">Descrição</span>
        <textarea className="textarea" rows={2} value={c.description} onChange={(e) => set("description", e.target.value)} /></label>
      <PhotoField label="Foto de destaque" src={c.photo} hint="Aparece no topo da proposta, em toda a largura. Formato largo (3:1) fica melhor."
        onFile={(f) => readImage(f).then((src) => { set("photo", src); toast("Foto atualizada.", "success"); }).catch((err: Error) => toast(err.message, "error"))}
        onRemove={() => set("photo", "")} />
      <div className="section-head"><span className="field__label">Especificações (alimentam a ficha técnica da proposta)</span></div>
      <div className="cspecs">
        {c.specs.map((s) => (
          <div className="cspec" key={s.id}>
            <input className="cell" data-spec-name={c.id} value={s.name} placeholder="Parâmetro" aria-label="Parâmetro" onChange={(e) => { s.name = e.target.value; S.changed(); }} />
            <input className="cell cell--strong" value={s.value} placeholder="Valor" aria-label="Valor" onChange={(e) => { s.value = e.target.value; S.changed(); }} />
            <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label="Remover parâmetro" onClick={() => set("specs", c.specs.filter((x) => x.id !== s.id))}><Icon name="x" size={14} /></button>
          </div>
        ))}
        <button type="button" className="cspec cspec--add" onClick={() => {
          c.specs.push(S.newSpec()); S.changed();
          window.setTimeout(() => { const ins = document.querySelectorAll<HTMLInputElement>(`[data-spec-name="${CSS.escape(c.id)}"]`); ins[ins.length - 1]?.focus(); }, 0);
        }}><Icon name="plus" size={14} /> Parâmetro</button>
      </div>
      <div className="row row--between">
        <button type="button" className="btn btn--danger btn--sm" onClick={async () => {
          const ok = await confirmDialog({ title: "Eliminar item", message: `Eliminar ${c.name || c.sku} do catálogo? As propostas já criadas não são alteradas.`, confirmLabel: "Eliminar", danger: true });
          if (ok) { onDeleted(); S.deleteCatalogItem(c.id); toast("Item eliminado do catálogo.", "success"); }
        }}><Icon name="trash" size={14} /> Eliminar</button>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => {
          S.applyCatalogItem(c.id);
          toast(`${c.name} aplicado à proposta ${S.active.ref}.`, "success");
          go(`studio/${c.category === "Máquina" ? 2 : 3}`);
        }}><Icon name="file" size={14} /> Usar na proposta ativa</button>
      </div>
    </div>
  );
}

export function CatalogoView() {
  const [query, setQueryState] = useState(ui.query);
  const [category, setCategoryState] = useState(ui.category);
  const [open, setOpenState] = useState(ui.open);
  const setQuery = (v: string) => { ui.query = v; setQueryState(v); };
  const setCategory = (v: string) => { ui.category = v; setCategoryState(v); };
  const setOpen = (fn: (s: Set<string>) => void) => { const n = new Set(open); fn(n); ui.open = n; setOpenState(n); };

  const term = query.trim().toLowerCase();
  const list = S.data.catalog.filter((c) => (category === "Todas" || c.category === category)
    && (!term || `${c.sku} ${c.name} ${c.description}`.toLowerCase().includes(term)));

  return (
    <div className="view">
      <div className="view__head"><div><span className="eyebrow">Equipamentos</span><h1>Catálogo <span className="count count--lg">{S.data.catalog.length}</span></h1></div></div>
      <div className="filters">
        <div className="search"><Icon name="search" /><input type="search" className="input" placeholder="SKU, nome…" value={query} aria-label="Procurar no catálogo" onChange={(e) => setQuery(e.target.value)} /></div>
        <select className="select" aria-label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)}>{["Todas", ...CATEGORIES].map((k) => <option key={k}>{k}</option>)}</select>
        <button type="button" className="btn btn--dark" onClick={() => {
          const item = S.newCatalogItem();
          setOpen((s) => s.add(item.id));
          setQuery(""); setCategory("Todas");
          window.setTimeout(() => document.querySelector<HTMLInputElement>(`[data-row="${CSS.escape(item.id)}"] [data-key="sku"]`)?.focus(), 0);
        }}><Icon name="plus" /> Item</button>
      </div>
      <div className="ctable">
        <div className="ctable__head"><span>SKU</span><span>Nome</span><span className="hide-sm">Categoria</span><span className="hide-sm">Specs</span><span className="num">Preço</span></div>
        <div>
          {!list.length ? <p className="empty">{S.data.catalog.length ? "Sem resultados para este filtro." : "O catálogo está vazio. Crie o primeiro item."}</p>
            : list.map((c) => {
              const isOpen = open.has(c.id);
              return (
                <div key={c.id} className={`crow${isOpen ? " is-open" : ""}`} data-row={c.id}>
                  <button type="button" className="crow__head" aria-expanded={isOpen} onClick={() => setOpen((s) => { if (s.has(c.id)) s.delete(c.id); else s.add(c.id); })}>
                    <span className="crow__sku mono"><span className="crow__caret"><Icon name="chevron" size={12} /></span>{c.sku || "—"}</span>
                    <span className="crow__name">{c.photo && <img className="crow__thumb" src={c.photo} alt="" />}{c.name || "Sem nome"}</span>
                    <span className="crow__cat hide-sm"><span className="chip">{c.category}</span></span>
                    <span className="crow__specs hide-sm muted">{c.specs.length} parâm.</span>
                    <span className="crow__price mono">{money(c.basePrice)}</span>
                  </button>
                  {isOpen && <Detail c={c} onDeleted={() => setOpen((s) => s.delete(c.id))} />}
                </div>
              );
            })}
        </div>
      </div>
      <p className="field__hint">As especificações editam-se diretamente na linha e passam para a ficha técnica quando o item é usado numa proposta.</p>
    </div>
  );
}
