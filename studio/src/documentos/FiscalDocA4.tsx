// Documento fiscal em A4 (fatura, nota, recibo, pró-forma ou guia).
import { formatDate, formatMoney, formatPercent } from "../lib/format";
import type { Issuer } from "../lib/model";
import { lineNet } from "../lib/totals";
import { DocBrand } from "../studio/ProposalDoc";
import { DOC_TYPES, docTotals, hash4, qrPayload } from "./fiscal";
import type { FiscalDoc } from "./fiscal";
import { QrCode } from "./QrCode";

const pct = (v: number) => `${v}%`;

export function FiscalDocA4({ d, docs, issuer }: { d: FiscalDoc; docs: FiscalDoc[]; issuer: Issuer }) {
  const info = DOC_TYPES[d.type];
  const totals = docTotals(d);
  const ref = d.refId ? docs.find((x) => x.id === d.refId) : undefined;
  const draft = d.status === "Rascunho";
  const services = d.services || [];

  return (
    <article className="a4 fx-a4">
      {d.status === "Anulado" && <div className="fx-void">ANULADO</div>}
      {draft && <div className="fx-void fx-void--draft">RASCUNHO</div>}

      <header className="doc-head">
        <DocBrand issuer={issuer} />
        <div className="doc-meta">
          <span className="doc-badge">{info.label.toUpperCase()}</span>
          <div className="doc-ref">{d.no || "Rascunho"}</div>
          <div className="doc-meta__line">
            Data: <strong>{formatDate(d.date)}</strong>
          </div>
          {info.payable && d.dueDate && (
            <div className="doc-meta__line">
              Vencimento: <strong>{formatDate(d.dueDate)}</strong>
            </div>
          )}
          {ref && (
            <div className="doc-meta__line">
              {d.type === "RG" ? "Liquida: " : "Doc. origem: "}
              <strong>{ref.no}</strong>
            </div>
          )}
          {d.sourceRef && (
            <div className="doc-meta__line">
              Proposta: <strong>{d.sourceRef}</strong>
            </div>
          )}
          {d.atcud && (
            <div className="doc-meta__line">
              ATCUD: <strong className="mono">{d.atcud}</strong>
            </div>
          )}
        </div>
      </header>

      <section className="doc-parties">
        <div className="doc-parties__client">
          <span className="doc-eyebrow">Cliente</span>
          <div className="doc-client-name">{d.client.company || "Consumidor final"}</div>
          <div className="doc-line">
            NIF: <strong className="mono">{d.client.nif || "999 999 990"}</strong>
          </div>
          {d.client.address && <div className="doc-line doc-line--muted">{d.client.address}</div>}
        </div>
        {d.type === "GT" && d.transport ? (
          <div className="doc-parties__subject">
            <span className="doc-eyebrow">Transporte</span>
            <div className="doc-line">
              Carga: <strong>{d.transport.load || "—"}</strong>
            </div>
            <div className="doc-line">
              Descarga: <strong>{d.transport.unload || "—"}</strong>
            </div>
            <div className="doc-line">
              Início:{" "}
              <strong>
                {d.transport.start
                  ? `${formatDate(d.transport.start.slice(0, 10))} ${d.transport.start.slice(11, 16)}`
                  : "—"}
              </strong>
            </div>
            <div className="doc-line">
              Viatura: <strong className="mono">{d.transport.plate || "—"}</strong>
            </div>
          </div>
        ) : (
          <div className="doc-parties__subject">
            <span className="doc-eyebrow">{d.type === "RG" ? "Pagamento" : "Condições de pagamento"}</span>
            {d.payment && <div className="doc-line">{d.payment}</div>}
            <div className="doc-line">
              Meio: <strong>{d.method || "—"}</strong>
            </div>
          </div>
        )}
      </section>

      {(d.type === "NC" || d.type === "ND") && (
        <div className="doc-notes">
          <span className="doc-eyebrow">Motivo</span>
          <p>{d.reason || "—"}</p>
        </div>
      )}

      {d.type === "RG" ? (
        <table className="doc-table">
          <thead>
            <tr>
              <th>Documento liquidado</th>
              <th>Data</th>
              <th className="num">Valor do documento</th>
              <th className="num">Valor recebido</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="strong">{ref ? ref.no : "—"}</td>
              <td>{ref ? formatDate(ref.date) : "—"}</td>
              <td className="num mono">{ref ? formatMoney(docTotals(ref).grandTotal) : "—"}</td>
              <td className="num mono strong">{formatMoney(d.amount)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th className="num">Qtd</th>
              <th className="num">Preço unit.</th>
              <th className="num">Desc.</th>
              <th className="num">IVA</th>
              <th className="num">Total líquido</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((it) => (
              <tr key={it.id}>
                <td className="strong">{it.desc || "—"}</td>
                <td className="num mono">{it.qty}</td>
                <td className="num mono">{formatMoney(it.unitPrice)}</td>
                <td className="num mono muted">{it.discount > 0 ? formatPercent(it.discount) : "—"}</td>
                <td className="num mono muted">{pct(it.vat)}</td>
                <td className="num mono strong">{formatMoney(lineNet(it))}</td>
              </tr>
            ))}
            {services.map((s) => (
              <tr key={s.id}>
                <td>{s.label}</td>
                <td className="num mono">1</td>
                <td className="num mono">{formatMoney(s.amount)}</td>
                <td className="num mono muted">—</td>
                <td className="num mono muted">{pct(s.vat)}</td>
                <td className="num mono strong">{formatMoney(s.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="doc-totals-row">
        <div className="doc-totals-note">
          {d.notes && d.notes.trim() && (
            <div className="doc-notes">
              <span className="doc-eyebrow">Observações</span>
              <p>{d.notes}</p>
            </div>
          )}
        </div>
        <div className="doc-totals">
          {d.type !== "RG" && (
            <>
              <div className="doc-totals__sub">
                <span>Total sem IVA</span>
                <span className="mono">{formatMoney(totals.netTotal)}</span>
              </div>
              {totals.vatRows.map((row) => (
                <div key={row.rate}>
                  <span>
                    IVA {pct(row.rate)} <small>(base {formatMoney(row.base)})</small>
                  </span>
                  <span className="mono">{formatMoney(row.vat)}</span>
                </div>
              ))}
            </>
          )}
          <div className="doc-totals__grand">
            <span>{d.type === "NC" ? "TOTAL A CREDITAR" : d.type === "RG" ? "TOTAL RECEBIDO" : "TOTAL C/ IVA"}</span>
            <span className="mono">{formatMoney(totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      <footer className="fx-fiscal">
        {info.fiscal && d.type !== "RG" && d.no && <QrCode text={qrPayload(d, issuer)} />}
        <div className="fx-fiscal__txt">
          {draft && <p>Rascunho — sem numeração nem validade fiscal.</p>}
          {!info.fiscal && <p className="strong">Este documento não serve de fatura.</p>}
          {d.hash && (
            <p>
              <strong className="mono">{hash4(d.hash)}</strong> - Processado por programa não certificado
              (demonstração).
            </p>
          )}
          {d.type === "GT" && !draft && <p>Documento de transporte — deve acompanhar os bens em circulação.</p>}
          {info.payable && !draft && d.dueDate && (
            <p>
              Pagamento até {formatDate(d.dueDate)} por {(d.method || "").toLowerCase()}.
            </p>
          )}
        </div>
      </footer>
    </article>
  );
}
