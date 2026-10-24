/* toSimplify Studio — vista Studio: assistente em 5 passos, grelha de Valores e revisão com o A4 */
import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import {
  CATEGORIES, S, VAT_RATES, money, num, lineNet, stepIssues, totals, vatLabel,
  type Item, type Service, type Spec,
} from "../store";
import { Icon, NumInput, PhotoField, StatusPill, openModal, pickDialog, readImage, toast } from "../ui";
import { DocThumb, DocZoom } from "../doc";
import { go, printProposal, studioState } from "../nav";

const STEPS = [
  { n: 1, id: "cliente", label: "Cliente" },
  { n: 2, id: "equipamento", label: "Equipamento" },
  { n: 3, id: "valores", label: "Valores" },
  { n: 4, id: "condicoes", label: "Condições" },
  { n: 5, id: "rever", label: "Rever" },
] as const;
const THUMB_W = 268;

// Estado de interface que sobrevive à troca de passo
const ui = { servicesOpen: true, catFilter: "Tudo" };

// ---------- caminhos de dados ----------
// "@issuer.x" aponta para o emitente; o resto para a proposta ativa
type Bag = Record<string, unknown>;
function target(path: string): [Bag, string] {
  return path.startsWith("@") ? [S.data as unknown as Bag, path.slice(1)] : [S.active as unknown as Bag, path];
}
function getPath(path: string): unknown {
  const [obj, p] = target(path);
  return p.split(".").reduce<unknown>((o, k) => (o == null ? o : (o as Bag)[k]), obj);
}
function setPath(path: string, value: unknown) {
  const [obj, p] = target(path);
  const keys = p.split(".");
  const last = keys.pop() as string;
  (keys.reduce<Bag>((o, k) => o[k] as Bag, obj))[last] = value;
}
type Mode = "" | "num" | "pct" | "int";
function coerce(raw: string, mode: Mode): string | number {
  if (mode === "num") return Math.max(num(raw), 0);
  if (mode === "pct") return Math.min(Math.max(num(raw), 0), 100);
  if (mode === "int") return Math.max(Math.round(num(raw, 1)), 1);
  return raw;
}

// ---------- campos ----------
function Field({ label, path, type = "text", textarea = false, rows = 3, full = false, hint = "", mode = "", placeholder = "" }:
  { label: string; path: string; type?: string; textarea?: boolean; rows?: number; full?: boolean; hint?: string; mode?: Mode; placeholder?: string }) {
  const v = getPath(path);
  const set = (raw: string) => { setPath(path, coerce(raw, mode)); S.changed(); };
  const ph = placeholder || undefined;
  return (
    <label className={`field${full ? " field--full" : ""}`}><span className="field__label">{label}</span>
      {textarea
        ? <textarea className="textarea" rows={rows} placeholder={ph} value={String(v ?? "")} onChange={(e) => set(e.target.value)} />
        : mode
          ? <NumInput value={Number(v)} onValue={set} placeholder={ph} />
          : <input type={type} className="input" placeholder={ph} value={String(v ?? "")} onChange={(e) => set(e.target.value)} />}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}
const VatSelect = ({ value, onChange, col }: { value: number; onChange: (v: number) => void; col: number }) => (
  <select className="cell" data-col={col} aria-label="IVA" value={value} onChange={(e) => onChange(num(e.target.value))}>
    {VAT_RATES.map((r) => <option key={r} value={r}>{vatLabel(r)}</option>)}
  </select>
);

function Toolbar() {
  const p = S.active;
  const dirty = S.isDirty();
  return (
    <div className="studio-bar">
      <div className="studio-bar__id">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => go("propostas")}><Icon name="back" size={14} /> Propostas</button>
        <strong className="mono">{p.ref || "Sem referência"}</strong>
        <StatusPill status={p.status} />
        <span className={`studio-bar__state ${dirty ? "is-dirty" : ""}`}>{dirty ? "Alterações por guardar" : <><Icon name="check" size={12} /> Guardado</>}</span>
      </div>
      <div className="row">
        <button type="button" className="btn btn--secondary" onClick={save}><Icon name="save" /> Guardar</button>
        <button type="button" className="btn btn--primary" onClick={() => printProposal(S.active)}><Icon name="printer" /> Imprimir / PDF</button>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const issues = stepIssues(S.active) as Record<string, string>;
  return (
    <ol className="stepper" aria-label="Passos da proposta">
      {STEPS.map((s, i) => {
        const issue = issues[s.id] || "";
        const cls = s.n === step ? "is-current" : s.n < 5 && !issue ? "is-done" : "";
        return [
          i ? <li key={`sep${s.n}`} className="stepper__sep" aria-hidden="true" /> : null,
          <li key={s.id}>
            <button type="button" className={`stepper__btn ${cls}`} aria-current={s.n === step ? "step" : undefined} title={issue} onClick={() => goStep(s.n)}>
              <span className="stepper__num">{s.n < 5 && !issue && s.n !== step ? <Icon name="check" size={12} /> : s.n}</span>{s.label}
              {issue && <span className="stepper__flag" aria-label={issue} />}
            </button>
          </li>,
        ];
      })}
    </ol>
  );
}

function StepNav({ step }: { step: number }) {
  return (
    <div className="wizard__nav">
      {step > 1 ? <button type="button" className="btn btn--secondary" onClick={() => goStep(step - 1)}><Icon name="back" size={14} /> Voltar</button> : <span />}
      <span className="wizard__count">Passo {step} de 5</span>
      {step < 5 ? <button type="button" className="btn btn--dark" onClick={() => goStep(step + 1)}>Seguinte <Icon name="chevron" size={14} /></button> : <span />}
    </div>
  );
}

// ---------- passo 1: cliente ----------
function StepCliente() {
  const [q, setQ] = useState("");
  const p = S.active;
  const term = q.trim().toLowerCase();
  const sel = p.client.company.trim().toLowerCase();
  const list = S.data.clients.filter((c) => !term || `${c.company} ${c.nif} ${c.contact} ${c.sector}`.toLowerCase().includes(term));
  const known = S.data.clients.some((c) => c.company.trim().toLowerCase() === sel);
  return (
    <>
      <h2 className="wizard__q">Para que cliente é a proposta?</h2>
      <div className="search"><Icon name="search" /><input type="search" className="input" placeholder="Procurar cliente, NIF, contacto…" aria-label="Procurar cliente" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="pick-rows">
        {!list.length
          ? <p className="muted pick-empty">{S.data.clients.length ? "Sem resultados." : "Ainda não há clientes. Preencha os dados abaixo e guarde-o na base."}</p>
          : list.map((c) => {
            const on = c.company.trim().toLowerCase() === sel;
            return (
              <button key={c.id} type="button" className={`pick-row${on ? " is-selected" : ""}`} aria-pressed={on} onClick={() => {
                const name = S.applyClient(c.id);
                if (name) toast(`${name} aplicado à proposta.`, "success");
              }}>
                <span className="avatar">{(c.company.trim()[0] || "?").toUpperCase()}</span>
                <span className="pick-row__text"><strong>{c.company}</strong><small>{[c.contact, c.sector].filter(Boolean).join(" · ")}</small></span>
                {on && <span className="pick-row__check"><Icon name="check" /></span>}
              </button>
            );
          })}
      </div>
      <div className="section-block">
        <div className="section-head"><span className="section-title">Cliente nesta proposta</span>
          {!known && p.client.company.trim() && (
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => {
              const c = S.saveClient({ ...S.active.client, sector: "" });
              toast(`${c.company} guardado na base de clientes.`, "success");
            }}><Icon name="userPlus" size={14} /> Guardar na base de clientes</button>
          )}</div>
        <div className="grid-2">
          <Field label="Empresa" path="client.company" /><Field label="NIF" path="client.nif" />
          <Field label="Contacto" path="client.contact" /><Field label="Email" path="client.email" type="email" />
          <Field label="Morada" path="client.address" full />
        </div>
      </div>
      <div className="section-block">
        <div className="section-head"><span className="section-title">Dados da proposta</span></div>
        <div className="grid-3">
          <Field label="Referência" path="ref" />
          <Field label="Data" path="date" type="date" />
          <Field label="Validade (dias)" path="validityDays" mode="int" />
          <Field label="Assunto" path="subject" full />
        </div>
      </div>
    </>
  );
}

// ---------- passo 2: equipamento ----------
function applyCatalog(id: string) {
  const c = S.applyCatalogItem(id);
  if (c) toast(c.category === "Máquina" ? `${c.name}: solução, ficha técnica e linha de valores preenchidas.` : `${c.name} acrescentado aos valores.`, "success");
}
function SpecRow({ s, onDel }: { s: Spec; onDel: () => void }) {
  return (
    <div className="spec-row">
      <input className="input" value={s.name} placeholder="Parâmetro" aria-label="Parâmetro" onChange={(e) => { s.name = e.target.value; S.changed(); }} />
      <input className="input" value={s.value} placeholder="Valor" aria-label="Valor" onChange={(e) => { s.value = e.target.value; S.changed(); }} />
      <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label="Remover parâmetro" onClick={onDel}><Icon name="trash" size={14} /></button>
    </div>
  );
}
function StepEquipamento() {
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState(ui.catFilter);
  const specsRef = useRef<HTMLDivElement>(null);
  const term = q.trim().toLowerCase();
  const machine = S.active.machine.name.trim();
  const list = S.data.catalog.filter((c) => (catFilter === "Tudo" || c.category === catFilter)
    && (!term || `${c.sku} ${c.name} ${c.description}`.toLowerCase().includes(term)));
  const specs = S.active.machine.specs;
  return (
    <>
      <h2 className="wizard__q">Que equipamento vai propor?</h2>
      <div className="row row--center">
        <div className="search"><Icon name="search" /><input type="search" className="input" placeholder="Procurar no catálogo…" aria-label="Procurar no catálogo" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="seg" role="group" aria-label="Categoria">
          {["Tudo", ...CATEGORIES].map((c) => (
            <button key={c} type="button" className={`seg__btn${catFilter === c ? " is-active" : ""}`} onClick={() => { ui.catFilter = c; setCatFilter(c); }}>{c}</button>
          ))}
        </div>
      </div>
      <div className="pick-rows">
        {!list.length
          ? <p className="muted pick-empty">{S.data.catalog.length ? "Sem resultados." : "O catálogo está vazio. Adicione itens na vista Catálogo."}</p>
          : list.map((c) => {
            const on = c.category === "Máquina" && c.name.trim() === machine;
            const inLines = S.active.items.some((it) => it.desc.trim() === c.name.trim());
            return (
              <button key={c.id} type="button" className={`pick-row${on ? " is-selected" : ""}`} onClick={() => applyCatalog(c.id)}>
                <span className="tile"><Icon name="box" size={18} /></span>
                <span className="pick-row__text"><strong>{c.name}</strong><small><span className="mono">{c.sku}</span> · {c.category} · {money(c.basePrice)}</small></span>
                {on ? <span className="pick-row__check"><Icon name="check" /></span> : inLines ? <span className="chip">Na proposta</span> : <span className="pick-row__add"><Icon name="plus" size={14} /></span>}
              </button>
            );
          })}
      </div>
      <p className="field__hint">Uma máquina preenche a solução, a ficha técnica e uma linha em Valores. Um acessório só acrescenta uma linha em Valores.</p>
      <div className="section-block">
        <div className="section-head"><span className="section-title">Equipamento nesta proposta</span></div>
        <Field label="Nome do equipamento" path="machine.name" />
        <Field label="Descrição técnica" path="machine.desc" textarea rows={2} />
        <PhotoField label="Foto de destaque (topo do documento)" src={S.active.machine.photo}
          hint="Vem do catálogo ao escolher a máquina. Formato largo (3:1) fica melhor."
          onFile={(f) => readImage(f).then((src) => { S.active.machine.photo = src; S.changed(); toast("Foto de destaque atualizada.", "success"); }).catch((err: Error) => toast(err.message, "error"))}
          onRemove={() => { S.active.machine.photo = ""; S.changed(); }} />
        <div className="section-head"><span className="field__label">Especificações</span>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => {
            specs.push(S.newSpec()); S.changed();
            window.setTimeout(() => { const ins = specsRef.current?.querySelectorAll<HTMLInputElement>(".spec-row input:first-child"); ins?.[ins.length - 1]?.focus(); }, 0);
          }}><Icon name="plus" size={14} /> Parâmetro</button></div>
        <div className="stack stack--tight" ref={specsRef}>
          {!specs.length
            ? <p className="field__hint">Sem especificações. Escolha um equipamento do catálogo ou adicione parâmetros.</p>
            : specs.map((s) => <SpecRow key={s.id} s={s} onDel={() => { S.active.machine.specs = specs.filter((x) => x.id !== s.id); S.changed(); }} />)}
        </div>
      </div>
      <div className="section-block">
        <div className="section-head"><span className="section-title">Texto da proposta</span></div>
        <Field label="Contexto" path="context" textarea rows={3} placeholder="Necessidade do cliente e enquadramento do projeto." />
        <Field label="Solução" path="solution" textarea rows={3} placeholder="O que propomos fornecer e porquê." />
      </div>
    </>
  );
}

// ---------- passo 3: valores ----------
function StepValores() {
  const [servicesOpen, setServicesOpenState] = useState(ui.servicesOpen);
  const setServicesOpen = (v: boolean) => { ui.servicesOpen = v; setServicesOpenState(v); };
  const gridRef = useRef<HTMLDivElement>(null);
  const [gripId, setGripId] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null);
  const p = S.active;
  const t = totals(p);
  const hidden = p.services.filter((s) => !(s.amount > 0)).length;

  const focusRowCell = (kind: string, id: string, col: string | number = 0) => {
    window.setTimeout(() => {
      const row = gridRef.current?.querySelector(`[data-rows="${kind}"] [data-row="${CSS.escape(id)}"]`);
      if (!row) return;
      const el = row.querySelector<HTMLInputElement>(`[data-col="${col}"]`) || row.querySelector("input");
      if (el) { el.focus(); el.select?.(); }
    }, 0);
  };
  const addRow = (kind: "items" | "services") => {
    if (kind === "items") { const row = S.newItem(); p.items.push(row); S.changed(); focusRowCell(kind, row.id); return row; }
    const row = S.newService(); p.services.push(row);
    setServicesOpen(true); S.changed(); focusRowCell(kind, row.id); return row;
  };
  const del = (kind: "items" | "services", id: string) => {
    if (kind === "items") {
      if (p.items.length === 1) { toast("A proposta precisa de pelo menos uma linha.", "error"); return; }
      p.items = p.items.filter((x) => x.id !== id);
    } else p.services = p.services.filter((x) => x.id !== id);
    S.changed();
  };
  // Enter/Shift+Enter movem na vertical como no Excel
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (e.key !== "Enter" || !el.classList.contains("cell") || el.tagName === "SELECT") return;
    e.preventDefault();
    const group = el.closest<HTMLElement>("[data-rows]");
    if (!group) return;
    const rows = [...group.querySelectorAll(".vgrid__row")];
    const rowEl = el.closest(".vgrid__row");
    const idx = rows.indexOf(rowEl as Element) + (e.shiftKey ? -1 : 1);
    const col = el.dataset["col"] ?? "0";
    const kind = group.dataset["rows"] as "items" | "services";
    if (idx >= rows.length) { const row = addRow(kind); focusRowCell(kind, row.id, col); return; }
    if (idx < 0) return;
    const next = rows[idx]?.querySelector<HTMLInputElement>(`[data-col="${col}"]`);
    if (next) { next.focus(); next.select?.(); }
  };
  const setItem = (it: Item, key: keyof Item, v: string | number) => { (it as unknown as Bag)[key] = v; S.changed(); };
  const setSvc = (s: Service, key: keyof Service, v: string | number) => { (s as unknown as Bag)[key] = v; S.changed(); };

  // Reordenar linhas por arrasto da pega
  const onDragOver = (e: DragEvent<HTMLDivElement>, id: string) => {
    if (!dragId.current) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const after = e.clientY >= r.top + r.height / 2;
    if (!drop || drop.id !== id || drop.after !== after) setDrop({ id, after });
  };
  const onDrop = (e: DragEvent<HTMLDivElement>, id: string) => {
    if (!dragId.current) return;
    e.preventDefault();
    const items = p.items;
    const from = items.findIndex((x) => x.id === dragId.current);
    const [moved] = items.splice(from, 1);
    if (moved) {
      let to = items.findIndex((x) => x.id === id);
      if (to < 0) to = items.length; else if (drop?.after) to += 1;
      items.splice(to, 0, moved);
    }
    dragId.current = null; setDrop(null); setGripId(null);
    S.changed();
  };
  const onDragEnd = () => { dragId.current = null; setDrop(null); setGripId(null); };

  return (
    <>
      <div className="section-head">
        <h2 className="wizard__q">3 · Valores</h2>
        <div className="row">
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => pickDialog({
            title: "Inserir do catálogo", iconName: "box", emptyText: "O catálogo está vazio. Adicione itens na vista Catálogo.",
            items: S.data.catalog.map((c) => ({ id: c.id, title: c.name, subtitle: `${c.sku} · ${c.category} · ${money(c.basePrice)}` })),
            onPick: applyCatalog,
          })}><Icon name="box" size={14} /> Do catálogo</button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => addRow("items")}><Icon name="plus" size={14} /> Linha</button>
        </div>
      </div>
      <div className="vgrid" role="table" aria-label="Itens e serviços" ref={gridRef} onKeyDown={onKeyDown}>
        <div className="vgrid__row vgrid__head" role="row">
          <span /><span>Item / descrição</span><span className="num">Qtd</span><span className="num">Preço unit.</span><span className="num">Desc. %</span><span>IVA</span><span className="num">Total líq.</span><span />
        </div>
        <div data-rows="items">
          {p.items.map((it) => {
            const cls = ["vgrid__row", dragId.current === it.id ? "is-dragging" : "", drop?.id === it.id ? (drop.after ? "is-drop-after" : "is-drop-before") : ""].filter(Boolean).join(" ");
            return (
              <div key={it.id} className={cls} data-row={it.id} draggable={gripId === it.id}
                onDragStart={(e) => { if (gripId !== it.id) return; dragId.current = it.id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", it.id); setDrop(null); }}
                onDragOver={(e) => onDragOver(e, it.id)} onDrop={(e) => onDrop(e, it.id)} onDragEnd={onDragEnd}>
                <span className="vgrid__grip" title="Arrastar para reordenar" onPointerDown={() => setGripId(it.id)}><Icon name="grip" size={14} /></span>
                <input className="cell" data-col={0} value={it.desc} placeholder="Descrição" aria-label="Descrição" onChange={(e) => setItem(it, "desc", e.target.value)} />
                <NumInput className="cell num" data-col={1} aria-label="Quantidade" value={it.qty} onValue={(v) => setItem(it, "qty", coerce(v, "num"))} />
                <NumInput className="cell num" data-col={2} aria-label="Preço unitário" value={it.unitPrice} onValue={(v) => setItem(it, "unitPrice", coerce(v, "num"))} />
                <NumInput className="cell num" data-col={3} aria-label="Desconto (%)" value={it.discount} onValue={(v) => setItem(it, "discount", coerce(v, "pct"))} />
                <VatSelect col={4} value={it.vat} onChange={(v) => setItem(it, "vat", v)} />
                <span className="vgrid__total mono">{money(lineNet(it))}</span>
                <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label="Remover linha" onClick={() => del("items", it.id)}><Icon name="trash" size={14} /></button>
              </div>
            );
          })}
        </div>
        <button type="button" className="vgrid__group" aria-expanded={servicesOpen} onClick={() => setServicesOpen(!servicesOpen)}>
          <span>Serviços complementares <span className="muted">{hidden ? `(${hidden} a 0 € ocultos no PDF)` : ""}</span></span>
          <span className={`vgrid__caret${servicesOpen ? " is-open" : ""}`}><Icon name="chevron" size={14} /></span>
        </button>
        {servicesOpen && (
          <>
            <div data-rows="services">
              {p.services.map((s) => (
                <div key={s.id} className={`vgrid__row vgrid__row--svc${s.amount > 0 ? "" : " is-hidden-pdf"}`} data-row={s.id}>
                  <span />
                  <input className="cell" data-col={0} value={s.label} placeholder="Serviço" aria-label="Serviço" onChange={(e) => setSvc(s, "label", e.target.value)} />
                  <span /><span /><span />
                  <VatSelect col={4} value={s.vat} onChange={(v) => setSvc(s, "vat", v)} />
                  <NumInput className="cell num" data-col={5} aria-label="Valor" value={s.amount} onValue={(v) => setSvc(s, "amount", coerce(v, "num"))} />
                  <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label="Remover serviço" onClick={() => del("services", s.id)}><Icon name="trash" size={14} /></button>
                </div>
              ))}
            </div>
            <button type="button" className="vgrid__add" onClick={() => addRow("services")}><Icon name="plus" size={14} /> Serviço</button>
          </>
        )}
      </div>
      <div className="totals-bar">
        <span>s/ IVA <strong className="mono">{money(t.netTotal)}</strong></span>
        <span>IVA <strong className="mono">{money(t.vatTotal)}</strong></span>
        {t.discountTotal > 0 && <span className="hide-sm">Desc. <strong className="mono">{money(t.discountTotal)}</strong></span>}
        <span className="totals-bar__grand">Total c/ IVA <strong className="mono">{money(t.grandTotal)}</strong></span>
      </div>
      <p className="field__hint">Enter desce para a linha seguinte, como no Excel; Tab avança para a célula seguinte. Enter na última linha cria uma linha nova.</p>
      <Field label="Observações (aparecem junto aos totais)" path="notes" textarea rows={2} />
    </>
  );
}

// ---------- passo 4: condições ----------
function StepCondicoes() {
  return (
    <>
      <h2 className="wizard__q">Em que condições?</h2>
      <div className="grid-2">
        <Field label="Condições de pagamento" path="conditions.payment" />
        <Field label="Prazo de entrega" path="conditions.delivery" />
        <Field label="Garantia" path="conditions.warranty" />
        <Field label="Incoterm / local de entrega" path="conditions.location" />
      </div>
      <Field label="Próximos passos (um por linha)" path="nextSteps" textarea rows={5} />
      <div className="section-block">
        <div className="section-head"><span className="section-title">Consultor comercial</span></div>
        <div className="grid-2">
          <Field label="Nome" path="commercialRep.name" /><Field label="Função" path="commercialRep.role" />
          <Field label="Telefone" path="commercialRep.phone" type="tel" /><Field label="Email" path="commercialRep.email" type="email" />
        </div>
      </div>
      <details className="details section-block">
        <summary className="section-title">Dados do emitente (todas as propostas)</summary>
        <div className="details__body grid-2">
          <Field label="Nome comercial" path="@issuer.tradeName" /><Field label="Slogan" path="@issuer.tagline" />
          <Field label="Titular" path="@issuer.holder" /><Field label="NIF" path="@issuer.nif" />
          <Field label="Morada" path="@issuer.address" full />
          <Field label="Telefone" path="@issuer.phone" type="tel" /><Field label="Email" path="@issuer.email" type="email" />
          <Field label="Website" path="@issuer.website" full />
        </div>
      </details>
    </>
  );
}

// ---------- passo 5: rever ----------
function StepRever() {
  const p = S.active;
  const issues = stepIssues(p) as Record<string, string>;
  const t = totals(p);
  return (
    <div className="review">
      <div className="review__head">
        <div><h2 className="wizard__q">Rever e enviar</h2>
          <p className="muted">{p.client.company || "Sem cliente"} · <strong className="mono">{money(t.grandTotal)}</strong> c/ IVA</p></div>
        <div className="row">
          <button type="button" className="btn btn--secondary" onClick={save}><Icon name="save" /> Guardar rascunho</button>
          <button type="button" className="btn btn--secondary" onClick={() => printProposal(S.active)}><Icon name="printer" /> Imprimir / PDF</button>
          {p.status === "Rascunho" && (
            <button type="button" className="btn btn--dark" onClick={() => {
              S.setStatus(S.active.id, "Enviada");
              S.saveActive();
              toast(`Proposta ${S.active.ref} marcada como enviada.`, "success");
              go("propostas");
            }}><Icon name="send" size={14} /> Marcar enviada</button>
          )}
        </div>
      </div>
      <ul className="checklist">
        {STEPS.slice(0, 4).map((s) => {
          const issue = issues[s.id];
          return (
            <li key={s.id} className={`check ${issue ? "is-warn" : "is-ok"}`}><Icon name={issue ? "alert" : "check"} size={14} />
              <span>{s.label}{issue ? ` — ${issue}` : ""}</span>
              {issue && <button type="button" className="btn btn--ghost btn--sm" onClick={() => goStep(s.n)}>Corrigir</button>}
            </li>
          );
        })}
      </ul>
      <DocZoom p={p} issuer={S.data.issuer} />
    </div>
  );
}

function openPreview() {
  openModal({
    title: `Pré-visualização · ${S.active.ref}`, iconName: "file", xwide: true,
    body: () => <DocZoom p={S.active} issuer={S.data.issuer} modal />,
    footer: (close) => (
      <>
        <button type="button" className="btn btn--secondary" data-close onClick={close}>Fechar</button>
        <button type="button" className="btn btn--primary" onClick={() => { close(); printProposal(S.active); }}><Icon name="printer" /> Imprimir / PDF</button>
      </>
    ),
  });
}

function Aside() {
  const t = totals(S.active);
  return (
    <aside className="wizard__aside" aria-label="Pré-visualização">
      <button type="button" className="preview" aria-label="Expandir pré-visualização" onClick={openPreview}>
        <span className="preview__label">Pré-visualização <Icon name="expand" size={13} /></span>
        <span><DocThumb p={S.active} issuer={S.data.issuer} width={THUMB_W} /></span>
      </button>
      <div className="mini-totals">
        <div><span>Total s/ IVA</span><strong>{money(t.netTotal)}</strong></div>
        <div><span>IVA</span><strong>{money(t.vatTotal)}</strong></div>
        <div className="mini-totals__grand"><span>Total c/ IVA</span><strong>{money(t.grandTotal)}</strong></div>
      </div>
    </aside>
  );
}

function goStep(n: number) { go(`studio/${Math.min(Math.max(n, 1), 5)}`); }
function save() {
  const { created, duplicateRef } = S.saveActive();
  toast(created ? `Proposta ${S.active.ref} guardada no histórico.` : `Proposta ${S.active.ref} atualizada.`, "success");
  if (duplicateRef) toast(`Atenção: já existe outra proposta com a referência ${S.active.ref}.`, "error");
}

export function StudioView({ params }: { params: string[] }) {
  const step = Math.min(Math.max(parseInt(params[0] ?? "", 10) || studioState.lastStep, 1), 5);
  studioState.lastStep = step;
  return (
    <div className="view studio">
      <Toolbar />
      <Stepper step={step} />
      <div className={`wizard${step === 5 ? " wizard--review" : step === 3 ? " wizard--valores" : ""}`}>
        <section className="wizard__main card" data-step-body={step}>
          {step === 1 && <StepCliente />}
          {step === 2 && <StepEquipamento />}
          {step === 3 && <StepValores />}
          {step === 4 && <StepCondicoes />}
          {step === 5 && <StepRever />}
          <StepNav step={step} />
        </section>
        {step !== 5 && <Aside />}
      </div>
    </div>
  );
}
