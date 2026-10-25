/* toSimplify Studio — vista Propostas: quadro por estado com arrasto e, em telemóvel, lista + detalhe */
import { useRef, useState } from "react";
import { S, STATUSES, addDays, daysBetween, formatDate, money, moneyShort, todayIso, totals, type Proposal, type Status } from "../store";
import { Icon, StatusPill, confirmDialog, openModal, toast } from "../ui";
import { DocThumb, DocZoom } from "../doc";
import { go, openInStudio, printProposal, useIsMobile } from "../nav";

const ui = { query: "", mobileFilter: "Abertas" };

interface Row { p: Proposal; total: number }
function rows(query: string): Row[] {
  const term = query.trim().toLowerCase();
  return S.data.proposals
    .map((p) => ({ p, total: totals(p).grandTotal }))
    .filter(({ p }) => !term || `${p.ref} ${p.client.company} ${p.subject}`.toLowerCase().includes(term))
    .sort((a, b) => b.p.date.localeCompare(a.p.date) || b.p.ref.localeCompare(a.p.ref));
}
// Dias até expirar (null se não se aplica)
function expiresIn(p: Proposal) {
  if (p.status !== "Enviada") return null;
  return daysBetween(todayIso(), addDays(p.date, p.validityDays));
}
function statusLine(p: Proposal) {
  const since = daysBetween(p.statusDate, todayIso());
  const ago = since == null ? "" : since <= 0 ? "hoje" : since === 1 ? "há 1 dia" : `há ${since} dias`;
  const until = addDays(p.date, p.validityDays);
  if (p.status === "Enviada") {
    const left = expiresIn(p);
    return `Enviada ${ago} · ${left != null && left < 0 ? "expirou a" : "expira a"} ${formatDate(until).slice(0, 5)}`;
  }
  if (p.status === "Rascunho") return `Rascunho · criada a ${formatDate(p.date)}`;
  return `${p.status} ${ago}`;
}
function kpis(list: Row[]) {
  const sum = (st: Status) => list.filter((r) => r.p.status === st).reduce((s, r) => s + r.total, 0);
  const won = list.filter((r) => r.p.status === "Aprovada").length;
  const lost = list.filter((r) => r.p.status === "Recusada").length;
  return { open: sum("Enviada") + sum("Rascunho"), conversion: won + lost ? Math.round((won / (won + lost)) * 100) : null };
}
function changeStatus(id: string, status: Status) {
  const p = S.findProposal(id);
  if (!p || p.status === status) return;
  S.setStatus(id, status);
  toast(`${p.ref} → ${status}`, "success");
}
async function del(p: Proposal) {
  const ok = await confirmDialog({ title: "Eliminar proposta", message: `Eliminar ${p.ref} (${p.client.company || "sem cliente"})? Esta ação não pode ser anulada.`, confirmLabel: "Eliminar", danger: true });
  if (ok) { S.deleteProposal(p.id); toast(`Proposta ${p.ref} eliminada.`, "success"); }
}
function dup(p: Proposal) {
  const copy = S.duplicateProposal(p.id);
  if (copy) toast(`${p.ref} duplicada como ${copy.ref}.`, "success");
}

function SearchBox({ query, setQuery, placeholder, sm }: { query: string; setQuery: (v: string) => void; placeholder: string; sm?: boolean }) {
  return (
    <div className={`search${sm ? " search--sm" : ""}`}><Icon name="search" />
      <input type="search" className="input" placeholder={placeholder} value={query} aria-label="Filtrar propostas" onChange={(e) => setQuery(e.target.value)} />
    </div>
  );
}

function Board({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
  const list = rows(query);
  const k = kpis(list);
  const dragId = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const end = () => { dragId.current = null; setDragging(null); setOver(null); };
  return (
    <div className="view">
      <div className="view__head">
        <div><span className="eyebrow">Histórico comercial</span><h1>Propostas <span className="count count--lg">{S.data.proposals.length}</span></h1></div>
        <div className="row row--center">
          <span className="muted">Pipeline aberto: <strong className="text-strong mono">{moneyShort(k.open)}</strong>{k.conversion != null && <> · conversão <strong className="text-strong">{k.conversion}%</strong></>}</span>
          <SearchBox query={query} setQuery={setQuery} placeholder="Filtrar por cliente, ref…" sm />
        </div>
      </div>
      <div className="board">
        {STATUSES.map((st) => {
          const col = list.filter((r) => r.p.status === st);
          const sum = col.reduce((s, r) => s + r.total, 0);
          return (
            <section key={st} className={`kcol kcol--${st}${over === st ? " is-over" : ""}`} aria-label={st}
              onDragOver={(e) => { if (!dragId.current) return; e.preventDefault(); if (over !== st) setOver(st); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === st ? null : o)); }}
              onDrop={(e) => { if (!dragId.current) return; e.preventDefault(); const id = dragId.current; end(); changeStatus(id, st); }}>
              <header className="kcol__head"><div><strong>{st}</strong> <span className="muted">{col.length}</span></div>
                <span className="kcol__sum mono" title={money(sum)}>{moneyShort(sum)}</span></header>
              <div className="kcol__cards">
                {col.length ? col.map(({ p, total }) => {
                  const left = expiresIn(p);
                  const warn = left != null && left <= 7;
                  return (
                    <article key={p.id} className={`kcard${warn ? " kcard--warn" : ""}${dragging === p.id ? " is-dragging" : ""}`} draggable tabIndex={0}
                      aria-label={`${p.ref} · ${p.client.company}`}
                      onDragStart={(e) => { dragId.current = p.id; setDragging(p.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", p.id); }}
                      onDragEnd={end}
                      onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; void openInStudio(p.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) void openInStudio(p.id); }}>
                      <div className="kcard__top"><span className="card__ref mono">{p.ref}</span>
                        {warn && left != null && <span className="kcard__flag" title={left < 0 ? "Validade expirada" : `Expira em ${left} dia(s)`}><Icon name="alert" size={12} /> {left < 0 ? "expirou" : `${left}d`}</span>}</div>
                      <div className="kcard__client">{p.client.company || "Sem cliente"}</div>
                      <div className="kcard__foot"><strong className="mono">{money(total)}</strong>
                        <span className="kcard__actions">
                          <button type="button" className="btn btn--ghost btn--icon btn--sm" title="Duplicar" aria-label="Duplicar" onClick={() => dup(p)}><Icon name="copy" size={14} /></button>
                          <button type="button" className="btn btn--ghost btn--icon btn--sm" title="Imprimir / PDF" aria-label="Imprimir / PDF" onClick={() => printProposal(p)}><Icon name="printer" size={14} /></button>
                          <button type="button" className="btn btn--ghost btn--icon btn--sm" title="Eliminar" aria-label="Eliminar" onClick={() => void del(p)}><Icon name="trash" size={14} /></button>
                        </span></div>
                    </article>
                  );
                }) : <p className="kcol__empty">Largue aqui</p>}
              </div>
            </section>
          );
        })}
      </div>
      <p className="field__hint">Arraste um cartão para mudar o estado. Clique para abrir no Studio. Os totais de cada coluna incluem IVA.</p>
    </div>
  );
}

function MobileList({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
  const [filter, setFilterState] = useState(ui.mobileFilter);
  const setFilter = (f: string) => { ui.mobileFilter = f; setFilterState(f); };
  const filters = ["Abertas", ...STATUSES];
  const list = rows(query).filter((r) => (filter === "Abertas" ? ["Rascunho", "Enviada"].includes(r.p.status) : r.p.status === filter));
  const sum = list.reduce((s, r) => s + r.total, 0);
  return (
    <div className="view mlist">
      <div className="view__head"><div><span className="eyebrow">Histórico comercial</span><h1>Propostas</h1></div></div>
      <SearchBox query={query} setQuery={setQuery} placeholder="Cliente, ref…" />
      <div className="chips-scroll" role="group" aria-label="Estado">
        {filters.map((f) => <button key={f} type="button" className={`seg__btn${filter === f ? " is-active" : ""}`} onClick={() => setFilter(f)}>{f}</button>)}
      </div>
      <p className="muted">{list.length} · {moneyShort(sum)}</p>
      <div className="stack stack--tight">
        {list.length ? list.map(({ p, total }) => (
          <button key={p.id} type="button" className="mcard" onClick={() => go(`propostas/${encodeURIComponent(p.id)}`)}>
            <span className="mcard__top"><span className="card__ref mono">{p.ref}</span><StatusPill status={p.status} /></span>
            <span className="mcard__client">{p.client.company || "Sem cliente"}</span>
            <strong className="mono">{money(total)}</strong>
          </button>
        )) : <p className="empty">Sem propostas neste estado.</p>}
      </div>
    </div>
  );
}

function Detail({ p }: { p: Proposal }) {
  const total = totals(p).grandTotal;
  const outcome = (st: Status, cls: string) => (
    <button type="button" className={`btn btn--xl ${p.status === st ? "btn--dark" : cls}`} aria-pressed={p.status === st} onClick={() => changeStatus(p.id, st)}>
      {p.status === st && <Icon name="check" size={16} />}{st}</button>
  );
  return (
    <div className="view detail">
      <button type="button" className="btn btn--ghost btn--sm detail__back" onClick={() => go("propostas")}><Icon name="back" size={14} /> Propostas</button>
      <div className="card detail__card">
        <span className="card__ref mono">{p.ref}</span>
        <h1 className="detail__client">{p.client.company || "Sem cliente"}</h1>
        <strong className="detail__total mono">{money(total)}</strong>
        <span className="muted">{statusLine(p)}</span>
        <button type="button" className="detail__thumb" aria-label="Ver documento" onClick={() => openModal({
          title: p.ref, iconName: "file", xwide: true,
          body: () => { const cur = S.findProposal(p.id) ?? p; return <DocZoom p={cur} issuer={S.data.issuer} modal />; },
        })}><DocThumb p={p} issuer={S.data.issuer} width={200} /></button>
        <span className="field__label">{p.status === "Rascunho" ? "Próximo passo" : "Resultado"}</span>
        {p.status === "Rascunho"
          ? <button type="button" className="btn btn--xl btn--primary" onClick={() => changeStatus(p.id, "Enviada")}><Icon name="send" size={16} /> Marcar enviada</button>
          : <>
            <div className="grid-2">{outcome("Aprovada", "btn--primary")}{outcome("Recusada", "btn--secondary")}</div>
            {p.status !== "Enviada" && <button type="button" className="btn btn--ghost btn--sm" onClick={() => changeStatus(p.id, "Enviada")}>Repor como Enviada</button>}
          </>}
        <button type="button" className="btn btn--secondary btn--lg" onClick={() => printProposal(p)}><Icon name="share" size={16} /> Partilhar PDF</button>
        <button type="button" className="btn btn--ghost" onClick={() => void openInStudio(p.id)}><Icon name="edit" size={14} /> Abrir no Studio</button>
      </div>
    </div>
  );
}

export function PropostasView({ params }: { params: string[] }) {
  const isMobile = useIsMobile();
  const [query, setQueryState] = useState(ui.query);
  const setQuery = (v: string) => { ui.query = v; setQueryState(v); };
  const detailId = params[0];
  if (detailId) {
    const p = S.findProposal(detailId);
    return p ? <Detail p={p} /> : <div className="empty">Proposta não encontrada.</div>;
  }
  return isMobile ? <MobileList query={query} setQuery={setQuery} /> : <Board query={query} setQuery={setQuery} />;
}
