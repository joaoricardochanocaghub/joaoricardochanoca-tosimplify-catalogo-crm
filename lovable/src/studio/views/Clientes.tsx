/* toSimplify Studio — vista Clientes: lista + perfil com histórico de propostas */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { S, formatDate, money, moneyShort, totals, uid, type Client } from "../store";
import { Icon, StatusPill, confirmDialog, toast } from "../ui";
import { newProposal, openInStudio, useIsMobile } from "../nav";

const initial = (name: string) => (name.trim()[0] || "?").toUpperCase();
const ui = { selectedId: null as string | null, query: "" };

export function ClientesView({ params }: { params: string[] }) {
  const isMobile = useIsMobile();
  const [selectedId, setSelectedState] = useState<string | null>(params[0] ?? ui.selectedId);
  const setSelected = (id: string | null) => { ui.selectedId = id; setSelectedState(id); };
  const [query, setQueryState] = useState(ui.query);
  const setQuery = (v: string) => { ui.query = v; setQueryState(v); };
  const [draft, setDraft] = useState<Client | null>(null);
  const editing = draft !== null;
  const formRef = useRef<HTMLFormElement>(null);
  const focusCompany = useRef(false);
  useEffect(() => {
    if (focusCompany.current) { focusCompany.current = false; formRef.current?.querySelector<HTMLInputElement>('[data-key="company"]')?.focus(); }
  });

  const clients = S.data.clients;
  const sorted = [...clients].sort((a, b) => a.company.localeCompare(b.company, "pt"));
  let sel = selectedId;
  if (sel && !clients.some((c) => c.id === sel) && !(draft && draft.id === sel)) sel = null;
  if (!sel && !editing && clients.length && !isMobile) sel = sorted[0]?.id ?? null;
  const current = editing ? draft : clients.find((c) => c.id === sel) ?? null;
  const showDetail = isMobile && !!current;

  const term = query.trim().toLowerCase();
  const list = sorted.filter((c) => !term || `${c.company} ${c.nif} ${c.contact} ${c.sector}`.toLowerCase().includes(term));
  const exists = (id: string) => clients.some((x) => x.id === id);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.company.trim()) { toast("Indique o nome da empresa.", "error"); return; }
    const saved = S.saveClient(draft);
    setDraft(null);
    setSelected(saved.id);
    toast(`${saved.company} guardado.`, "success");
  };
  const input = (label: string, key: keyof Client, { type = "text", full = false } = {}) => (
    <label className={`field${full ? " field--full" : ""}`}><span className="field__label">{label}</span>
      <input type={type} className="input" data-key={key} value={draft?.[key] ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))} /></label>
  );

  let profile;
  if (!current) profile = <div className="empty">Selecione um cliente ou crie um novo.</div>;
  else if (editing && draft) {
    profile = (
      <form className="card stack" ref={formRef} onSubmit={onSubmit}>
        <div className="section-head"><h2 className="profile__name">{exists(draft.id) ? "Editar cliente" : "Novo cliente"}</h2></div>
        <div className="grid-2">
          {input("Empresa", "company", { full: true })}
          {input("NIF", "nif")}{input("Setor", "sector")}
          {input("Contacto", "contact")}{input("Email", "email", { type: "email" })}
          {input("Morada", "address", { full: true })}
        </div>
        <div className="row row--between">
          {exists(draft.id) ? (
            <button type="button" className="btn btn--danger" onClick={async () => {
              const ok = await confirmDialog({ title: "Eliminar cliente", message: `Eliminar ${draft.company}? As propostas já emitidas mantêm os dados do cliente.`, confirmLabel: "Eliminar", danger: true });
              if (ok) { setDraft(null); S.deleteClient(draft.id); toast("Cliente eliminado.", "success"); }
            }}><Icon name="trash" size={14} /> Eliminar</button>
          ) : <span />}
          <div className="row"><button type="button" className="btn btn--secondary" onClick={() => setDraft(null)}>Cancelar</button>
            <button type="submit" className="btn btn--dark"><Icon name="save" size={14} /> Guardar cliente</button></div>
        </div>
      </form>
    );
  } else {
    const c = current;
    const props = S.proposalsForClient(c).sort((a, b) => b.date.localeCompare(a.date));
    const approved = props.filter((p) => p.status === "Aprovada").reduce((s, p) => s + totals(p).grandTotal, 0);
    const open = props.filter((p) => ["Rascunho", "Enviada"].includes(p.status)).reduce((s, p) => s + totals(p).grandTotal, 0);
    const meta = [c.nif && `NIF ${c.nif}`, c.address, c.contact].filter(Boolean).join(" · ");
    profile = (
      <div className="card stack profile">
        <div className="profile__head">
          <span className="avatar avatar--lg">{initial(c.company)}</span>
          <div><h2 className="profile__name">{c.company || "Sem nome"}</h2>
            <p className="muted">{meta || "Sem dados de contacto"}</p>
            {c.email && <a className="profile__mail" href={`mailto:${c.email}`}>{c.email}</a>}</div>
        </div>
        <div className="kpis kpis--3">
          <div className="kpi"><span className="kpi__label">Propostas</span><span className="kpi__value">{props.length}</span></div>
          <div className="kpi"><span className="kpi__label">Aprovado</span><span className="kpi__value">{moneyShort(approved)}</span></div>
          <div className="kpi"><span className="kpi__label">Em aberto</span><span className="kpi__value">{moneyShort(open)}</span></div>
        </div>
        <div className="section-block">
          <div className="section-head"><span className="section-title">Histórico</span></div>
          {props.length ? (
            <ul className="history">{props.map((p) => (
              <li key={p.id}><button type="button" className="history__row" onClick={() => void openInStudio(p.id)}>
                <span className="mono card__ref">{p.ref}</span>
                <span className="history__subject">{p.subject || "—"}<small>{formatDate(p.date)}</small></span>
                <strong className="mono">{money(totals(p).grandTotal)}</strong>
                <StatusPill status={p.status} />
              </button></li>
            ))}</ul>
          ) : <p className="muted">Ainda não há propostas para este cliente.</p>}
        </div>
        <div className="row row--between">
          <button type="button" className="btn btn--secondary" onClick={() => setDraft({ ...c })}><Icon name="edit" size={14} /> Editar</button>
          <button type="button" className="btn btn--primary" onClick={() => void newProposal(c)}><Icon name="plus" /> Nova proposta</button>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="view__head"><div><span className="eyebrow">CRM</span><h1>Clientes <span className="count count--lg">{clients.length}</span></h1></div></div>
      <div className={`master${showDetail ? " master--detail" : ""}`}>
        <aside className="master__list">
          <div className="search"><Icon name="search" /><input type="search" className="input" placeholder="Empresa, NIF…" value={query} aria-label="Procurar cliente" onChange={(e) => setQuery(e.target.value)} /></div>
          <div className="pick-rows">
            {!list.length ? <p className="muted pick-empty">{clients.length ? "Sem resultados." : "Ainda não há clientes."}</p>
              : list.map((c) => (
                <button key={c.id} type="button" className={`pick-row${c.id === sel ? " is-selected" : ""}`} aria-current={c.id === sel ? "true" : undefined}
                  onClick={() => { setSelected(c.id); setDraft(null); }}>
                  <span className="avatar">{initial(c.company)}</span>
                  <span className="pick-row__text"><strong>{c.company || "Sem nome"}</strong><small>{c.sector || c.contact}</small></span>
                </button>
              ))}
          </div>
          <button type="button" className="btn btn--secondary" onClick={() => {
            const d: Client = { id: uid("cli"), company: "", nif: "", sector: "", contact: "", email: "", address: "" };
            setDraft(d); setSelected(d.id); focusCompany.current = true;
          }}><Icon name="userPlus" size={14} /> Novo cliente</button>
        </aside>
        <section className="master__detail">
          {isMobile && <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setSelected(null); setDraft(null); }}><Icon name="back" size={14} /> Clientes</button>}
          {profile}
        </section>
      </div>
    </div>
  );
}
