// Documento A4 da proposta (pré-visualização e impressão).
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import logo from "../assets/logo.png";
import { addDaysIso, formatDate, formatMoney, formatPercent } from "../lib/format";
import type { Issuer, Proposal } from "../lib/model";
import { computeTotals, lineNet } from "../lib/totals";

/** Largura do A4 em px a 96 dpi; a pré-visualização encolhe para caber no painel. */
const A4_WIDTH = 794;

export const vatLabel = (rate: number) => (rate === 0 ? "Isento" : formatPercent(rate));

/** Cabeçalho comum (logótipo + emitente) aos documentos A4. */
export function issuerLines(issuer: Issuer) {
  return {
    main: [issuer.holder, issuer.nif && `NIF ${issuer.nif}`, issuer.address].filter(Boolean).join(" • "),
    contacts: [issuer.phone, issuer.email, issuer.website].filter(Boolean).join(" • "),
  };
}

export function DocBrand({ issuer }: { issuer: Issuer }) {
  const lines = issuerLines(issuer);
  return (
    <div className="doc-brand">
      <img className="doc-logo" src={logo} alt={issuer.tradeName} />
      <div className="doc-issuer-block">
        {issuer.tagline && <div className="doc-tagline">{issuer.tagline}</div>}
        <div className="doc-issuer">{lines.main}</div>
        {lines.contacts && <div className="doc-issuer">{lines.contacts}</div>}
      </div>
    </div>
  );
}

function DocSection({
  number,
  title,
  chip,
  children,
}: {
  number: number;
  title: string;
  chip?: string;
  children: ReactNode;
}) {
  return (
    <section className="doc-section">
      <div className="doc-section__head">
        <h3>
          <span className="doc-section__num">{number}</span>
          {title}
        </h3>
        {chip && <span className="doc-chip">{chip}</span>}
      </div>
      {children}
    </section>
  );
}

export function ProposalDoc({ proposal: p, issuer }: { proposal: Proposal; issuer: Issuer }) {
  const totals = useMemo(() => computeTotals(p), [p]);
  const validUntil = addDaysIso(p.date, p.validityDays);
  const services = p.services.filter((s) => s.amount > 0);
  const steps = p.nextSteps
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const hasContext = p.context.trim() !== "";
  const hasSolution = p.solution.trim() !== "" || p.machine.name.trim() !== "" || p.machine.desc.trim() !== "";
  const hasSpecs = p.machine.specs.length > 0;
  const hasSteps = steps.length > 0;

  // numeração das secções só conta as que aparecem
  let n = 0;
  const num = {
    context: hasContext ? ++n : 0,
    solution: hasSolution ? ++n : 0,
    specs: hasSpecs ? ++n : 0,
    price: ++n,
    steps: hasSteps ? ++n : 0,
  };
  const repContacts = [p.commercialRep.phone, p.commercialRep.email].filter(Boolean).join(" • ");

  return (
    <article className="a4">
      <header className="doc-head">
        <DocBrand issuer={issuer} />
        <div className="doc-meta">
          <span className="doc-badge">{p.badge || "PROPOSTA COMERCIAL"}</span>
          <div className="doc-ref">{p.ref}</div>
          <div className="doc-meta__line">
            Data: <strong>{formatDate(p.date)}</strong>
          </div>
          <div className="doc-meta__line">
            Validade: <strong>{p.validityDays} dias</strong>
            {validUntil && <> (até {formatDate(validUntil)})</>}
          </div>
        </div>
      </header>

      <section className="doc-parties">
        <div className="doc-parties__client">
          <span className="doc-eyebrow">Cliente / destinatário</span>
          <div className="doc-client-name">{p.client.company || "—"}</div>
          {p.client.nif && (
            <div className="doc-line">
              NIF: <strong className="mono">{p.client.nif}</strong>
            </div>
          )}
          {p.client.contact && (
            <div className="doc-line">
              Att: <strong>{p.client.contact}</strong>
            </div>
          )}
          {p.client.email && <div className="doc-line">{p.client.email}</div>}
          {p.client.address && <div className="doc-line doc-line--muted">{p.client.address}</div>}
        </div>
        <div className="doc-parties__subject">
          <span className="doc-eyebrow">Assunto do projeto</span>
          <div className="doc-subject">{p.subject || "—"}</div>
        </div>
      </section>

      {hasContext && (
        <DocSection number={num.context} title="Contexto">
          <p className="doc-text">{p.context}</p>
        </DocSection>
      )}

      {hasSolution && (
        <DocSection number={num.solution} title="Solução">
          {p.machine.image && <img className="doc-machine-img" src={p.machine.image} alt={p.machine.name} />}
          {p.machine.name && <div className="doc-solution-name">{p.machine.name}</div>}
          {p.solution.trim() && <p className="doc-text">{p.solution}</p>}
          {p.machine.desc && <p className="doc-desc">{p.machine.desc}</p>}
        </DocSection>
      )}

      {hasSpecs && (
        <DocSection number={num.specs} title="Especificações" chip="Ficha técnica">
          <div className="doc-specs">
            {p.machine.specs.map((s) => (
              <div key={s.id} className="doc-spec">
                <span>{s.name}</span>
                <strong>{s.value}</strong>
              </div>
            ))}
          </div>
        </DocSection>
      )}

      <DocSection number={num.price} title="Preço e condições">
        <table className="doc-table">
          <thead>
            <tr>
              <th>Item / descrição</th>
              <th className="num">Qtd</th>
              <th className="num">Preço unit.</th>
              <th className="num">Desc.</th>
              <th className="num">IVA</th>
              <th className="num">Total líquido</th>
            </tr>
          </thead>
          <tbody>
            {p.items.map((it) => (
              <tr key={it.id}>
                <td className="strong">{it.desc}</td>
                <td className="num mono">{it.qty}</td>
                <td className="num mono">{formatMoney(it.unitPrice)}</td>
                <td className="num mono muted">{it.discount > 0 ? formatPercent(it.discount) : "—"}</td>
                <td className="num mono muted">{vatLabel(it.vat)}</td>
                <td className="num mono strong">{formatMoney(lineNet(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {services.length > 0 && (
          <table className="doc-table doc-table--services">
            <thead>
              <tr>
                <th>Serviços complementares</th>
                <th className="num">IVA</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>{s.label}</td>
                  <td className="num mono muted">{vatLabel(s.vat)}</td>
                  <td className="num mono strong">{formatMoney(s.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="doc-totals-row">
          <div className="doc-totals-note">
            {totals.discountTotal > 0 && (
              <p>
                Desconto comercial aplicado: <strong>{formatMoney(totals.discountTotal)}</strong>
              </p>
            )}
            {p.notes.trim() && (
              <div className="doc-notes">
                <span className="doc-eyebrow">Observações</span>
                <p>{p.notes}</p>
              </div>
            )}
          </div>
          <div className="doc-totals">
            <div>
              <span>Equipamentos</span>
              <span className="mono">{formatMoney(totals.itemsNet)}</span>
            </div>
            {totals.servicesNet > 0 && (
              <div>
                <span>Serviços</span>
                <span className="mono">{formatMoney(totals.servicesNet)}</span>
              </div>
            )}
            <div className="doc-totals__sub">
              <span>Total sem IVA</span>
              <span className="mono">{formatMoney(totals.netTotal)}</span>
            </div>
            {totals.vatRows.map((row) => (
              <div key={row.rate}>
                <span>
                  IVA {vatLabel(row.rate)} <small>(base {formatMoney(row.base)})</small>
                </span>
                <span className="mono">{formatMoney(row.vat)}</span>
              </div>
            ))}
            <div className="doc-totals__grand">
              <span>TOTAL C/ IVA</span>
              <span className="mono">{formatMoney(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="doc-terms">
          <div>
            <span className="doc-eyebrow">Condições comerciais</span>
            <p>
              Pagamento: <strong>{p.conditions.payment || "—"}</strong>
            </p>
            <p>
              Prazo de entrega: <strong>{p.conditions.delivery || "—"}</strong>
            </p>
          </div>
          <div>
            <span className="doc-eyebrow">Garantia e entrega</span>
            <p>
              Garantia: <strong>{p.conditions.warranty || "—"}</strong>
            </p>
            <p>
              Incoterm / local: <strong>{p.conditions.location || "—"}</strong>
            </p>
          </div>
        </div>
      </DocSection>

      {hasSteps && (
        <DocSection number={num.steps} title="Próximos passos">
          {steps.length === 1 ? (
            <p className="doc-text">{steps[0]}</p>
          ) : (
            <ol className="doc-steps">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
        </DocSection>
      )}

      <footer className="doc-foot">
        <div className="doc-foot__rep">
          <span className="doc-eyebrow">Consultor comercial</span>
          <div className="doc-rep-name">{p.commercialRep.name}</div>
          <div className="doc-line">{p.commercialRep.role}</div>
          {repContacts && <div className="doc-line doc-line--muted mono">{repContacts}</div>}
        </div>
        <div className="doc-foot__sign">
          <div className="doc-sign-line" />
          <span className="doc-eyebrow">Aceite do cliente / carimbo</span>
        </div>
      </footer>
    </article>
  );
}

/** Encolhe o A4 para a largura disponível (nunca amplia). */
export function DocZoom({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setZoom(Math.min(1, el.clientWidth / A4_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="doc-wrap" ref={wrapRef}>
      <div className="doc-zoom" style={{ zoom }}>
        {children}
      </div>
    </div>
  );
}

/** Imprime a página com um título de documento próprio (nome sugerido do PDF). */
export function printWithTitle(title: string) {
  const previous = document.title;
  document.title = title;
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
