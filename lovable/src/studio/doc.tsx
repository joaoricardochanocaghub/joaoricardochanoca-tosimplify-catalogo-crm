/* toSimplify Studio — documento A4 da proposta (faixa de cabeçalho, secções numeradas, caixa de totais) */
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { addDays, formatDate, lineNet, money, percent, totals, vatLabel, type Issuer, type Proposal } from "./store";

export const LOGO_SRC = "/assets/logo.png";

function Section({ num, title, chip, children }: { num: number; title: string; chip?: string; children: ReactNode }) {
  return (
    <section className="doc-section">
      <div className="doc-section__head"><h3><span className="doc-section__num">{num}</span>{title}</h3>{chip && <span className="doc-chip">{chip}</span>}</div>
      {children}
    </section>
  );
}

export function A4Doc({ p, issuer }: { p: Proposal; issuer: Issuer }) {
  const t = totals(p);
  const until = addDays(p.date, p.validityDays);
  const services = p.services.filter((s) => s.amount > 0);
  const steps = p.nextSteps.split("\n").map((s) => s.trim()).filter(Boolean);
  const hasContext = p.context.trim() !== "";
  const hasSolution = p.solution.trim() !== "" || p.machine.name.trim() !== "" || p.machine.desc.trim() !== "";
  const hasSpecs = p.machine.specs.length > 0;
  let n = 0;
  const issuerLine = [issuer.holder, issuer.nif && `NIF ${issuer.nif}`, issuer.address].filter(Boolean).join(" • ");
  const issuerContact = [issuer.phone, issuer.email, issuer.website].filter(Boolean).join(" • ");
  const repContact = [p.commercialRep.phone, p.commercialRep.email].filter(Boolean).join(" • ");

  return (
    <article className="a4">
      {p.machine.photo && <figure className="doc-hero"><img src={p.machine.photo} alt={p.machine.name} /></figure>}
      <header className="doc-head">
        <div className="doc-brand">
          <img className="doc-logo" src={LOGO_SRC} alt={issuer.tradeName} />
          <div>
            {issuer.tagline && <div className="doc-tagline">{issuer.tagline}</div>}
            <div className="doc-issuer">{issuerLine}</div>
            {issuerContact && <div className="doc-issuer">{issuerContact}</div>}
          </div>
        </div>
        <div className="doc-meta">
          <span className="doc-badge">{p.badge || "PROPOSTA COMERCIAL"}</span>
          <div className="doc-ref">{p.ref || "—"}</div>
          <div className="doc-meta__line">{formatDate(p.date)} · <strong>{p.validityDays} dias</strong>{until ? ` (até ${formatDate(until)})` : ""}</div>
        </div>
      </header>

      <section className="doc-client">
        <span className="doc-eyebrow">Cliente / destinatário</span>
        <div className="doc-client-name">{p.client.company || "—"}</div>
        <div className="doc-client-lines">
          {p.client.nif && <span>NIF: <strong className="mono">{p.client.nif}</strong></span>}
          {p.client.contact && <span>Att: <strong>{p.client.contact}</strong></span>}
          {p.client.email && <span>{p.client.email}</span>}
          {p.client.address && <span className="doc-line--muted">{p.client.address}</span>}
        </div>
      </section>

      <h2 className="doc-subject">{p.subject || "—"}</h2>

      {hasContext && <Section num={++n} title="Contexto"><p className="doc-text">{p.context}</p></Section>}
      {hasSolution && (
        <Section num={++n} title="Solução">
          {p.machine.name && <div className="doc-solution-name">{p.machine.name}</div>}
          {p.solution.trim() && <p className="doc-text">{p.solution}</p>}
          {p.machine.desc && <p className="doc-desc">{p.machine.desc}</p>}
        </Section>
      )}
      {hasSpecs && (
        <Section num={++n} title="Especificações" chip="Ficha técnica">
          <div className="doc-specs">{p.machine.specs.map((s) => (
            <div className="doc-spec" key={s.id}><span>{s.name}</span><strong>{s.value}</strong></div>
          ))}</div>
        </Section>
      )}
      <Section num={++n} title="Preço">
        <table className="doc-table">
          <thead><tr><th>Item / descrição</th><th className="num">Qtd</th><th className="num">Preço unit.</th><th className="num">Desc.</th><th className="num">IVA</th><th className="num">Total líquido</th></tr></thead>
          <tbody>{p.items.map((it) => (
            <tr key={it.id}>
              <td className="strong">{it.desc}</td>
              <td className="num mono">{it.qty.toLocaleString("pt-PT")}</td>
              <td className="num mono">{money(it.unitPrice)}</td>
              <td className="num mono muted">{it.discount > 0 ? percent(it.discount) : "—"}</td>
              <td className="num mono muted">{vatLabel(it.vat)}</td>
              <td className="num mono strong">{money(lineNet(it))}</td>
            </tr>
          ))}</tbody>
        </table>
        {services.length > 0 && (
          <table className="doc-table">
            <thead><tr><th>Serviços complementares</th><th className="num">IVA</th><th className="num">Valor</th></tr></thead>
            <tbody>{services.map((s) => (
              <tr key={s.id}><td>{s.label}</td><td className="num mono muted">{vatLabel(s.vat)}</td><td className="num mono strong">{money(s.amount)}</td></tr>
            ))}</tbody>
          </table>
        )}
        <div className="doc-totals-row">
          <div className="doc-totals-note">
            {t.discountTotal > 0 && <p>Desconto comercial aplicado: <strong>{money(t.discountTotal)}</strong></p>}
            {p.notes.trim() && <div className="doc-notes"><span className="doc-eyebrow">Observações</span><p>{p.notes}</p></div>}
          </div>
          <div className="doc-totals">
            <div><span>Equipamentos</span><span className="mono">{money(t.itemsNet)}</span></div>
            {t.servicesNet > 0 && <div><span>Serviços</span><span className="mono">{money(t.servicesNet)}</span></div>}
            <div className="doc-totals__sub"><span>Total sem IVA</span><span className="mono">{money(t.netTotal)}</span></div>
            {t.vatRows.map((r) => (
              <div key={r.rate}><span>IVA {vatLabel(r.rate)} <small>(base {money(r.base)})</small></span><span className="mono">{money(r.vat)}</span></div>
            ))}
            <div className="doc-totals__grand"><span>TOTAL C/ IVA</span><span className="mono">{money(t.grandTotal)}</span></div>
          </div>
        </div>
      </Section>
      <Section num={++n} title={steps.length ? "Condições e próximos passos" : "Condições"}>
        <div className="doc-terms">
          <div><span className="doc-eyebrow">Condições comerciais</span>
            <p>Pagamento: <strong>{p.conditions.payment || "—"}</strong></p>
            <p>Prazo de entrega: <strong>{p.conditions.delivery || "—"}</strong></p></div>
          <div><span className="doc-eyebrow">Garantia e entrega</span>
            <p>Garantia: <strong>{p.conditions.warranty || "—"}</strong></p>
            <p>Incoterm / local: <strong>{p.conditions.location || "—"}</strong></p></div>
        </div>
        {steps.length === 1 && <p className="doc-text">{steps[0]}</p>}
        {steps.length > 1 && <ol className="doc-steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
      </Section>
      <footer className="doc-foot">
        <div><span className="doc-eyebrow">Consultor comercial</span>
          <div className="doc-rep-name">{p.commercialRep.name}</div>
          <div className="doc-line">{p.commercialRep.role}</div>
          {repContact && <div className="doc-line doc-line--muted mono">{repContact}</div>}</div>
        <div className="doc-foot__sign"><div className="doc-sign-line" /><span className="doc-eyebrow">Aceite do cliente / carimbo</span></div>
      </footer>
    </article>
  );
}

// Miniatura escalada do A4 (a largura define a escala)
export function DocThumb({ p, issuer, width }: { p: Proposal; issuer: Issuer; width: number }) {
  const scale = width / 794;
  return (
    <div className="doc-thumb" style={{ width, height: Math.round(1123 * scale) }}>
      <div className="doc-thumb__inner" style={{ transform: `scale(${scale})` }}><A4Doc p={p} issuer={issuer} /></div>
    </div>
  );
}

// A4 escalado ao espaço disponível (passo Rever e modal)
export function DocZoom({ p, issuer, modal = false }: { p: Proposal; issuer: Issuer; modal?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setZoom(Math.min(1, (el.clientWidth - (modal ? 2 : 0)) / 794));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [modal]);
  return (
    <div className={`doc-wrap${modal ? " doc-wrap--modal" : ""}`} ref={ref}>
      <div className="doc-zoom" style={{ zoom }}><A4Doc p={p} issuer={issuer} /></div>
    </div>
  );
}

// ---------- impressão ----------
let printing: { p: Proposal; issuer: Issuer } | null = null;
const printSubs = new Set<() => void>();
const setPrinting = (v: typeof printing) => { printing = v; printSubs.forEach((f) => f()); };

// Imprime qualquer proposta (não só a ativa) através do contentor de impressão
export function printProposal(p: Proposal, issuer: Issuer) {
  setPrinting({ p: JSON.parse(JSON.stringify(p)) as Proposal, issuer: { ...issuer } });
}

export function PrintHost() {
  const job = useSyncExternalStore((f) => { printSubs.add(f); return () => { printSubs.delete(f); }; }, () => printing, () => null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!job || !ref.current) return;
    const prevTitle = document.title;
    document.title = `Proposta ${job.p.ref} - ${job.issuer.tradeName}`;
    const done = () => { document.title = prevTitle; setPrinting(null); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    // Espera pelo logótipo e pela foto de destaque antes de abrir a janela de impressão
    const pending = [...ref.current.querySelectorAll("img")].filter((img) => !img.complete)
      .map((img) => new Promise((res) => { img.addEventListener("load", res, { once: true }); img.addEventListener("error", res, { once: true }); }));
    let cancelled = false;
    void Promise.all(pending).then(() => window.setTimeout(() => { if (!cancelled) window.print(); }, 50));
    return () => { cancelled = true; };
  }, [job]);
  if (!job) return null;
  return createPortal(<div id="print-root" ref={ref}><A4Doc p={job.p} issuer={job.issuer} /></div>, document.body);
}
