// Escolha do tipo e da origem de um novo documento, com faturação por percentagem (sinal).
import { useState } from "react";
import { clamp, formatMoney, round2 } from "../lib/format";
import type { Issuer, Proposal } from "../lib/model";
import { computeTotals } from "../lib/totals";
import { Field, NumberInput } from "../ui/fields";
import { Icon } from "../ui/Icon";
import { Modal } from "../ui/Modal";
import { DOC_TYPES, DOC_TYPE_IDS, billedFor, buildFromSource, sourcesFor } from "./fiscal";
import type { DocType, FiscalDoc } from "./fiscal";

type PctMode = "100" | "30" | "x";

interface NewDocFormProps {
  proposals: Proposal[];
  docs: FiscalDoc[];
  issuer: Issuer;
  /** Proposta já escolhida (vista "Por proposta"). */
  proposalId?: string | null;
  onCancel: () => void;
  onCreate: (doc: FiscalDoc) => void;
}

export function NewDocForm({ proposals, docs, issuer, proposalId, onCancel, onCreate }: NewDocFormProps) {
  const pinned = proposalId ? proposals.find((p) => p.id === proposalId) : undefined;
  // numa proposta já faturada, o passo seguinte mais provável é o recibo
  const preferred: DocType = pinned && billedFor(pinned.ref, docs) > 0 ? "RG" : "FT";
  const [type, setType] = useState<DocType>(() =>
    sourcesFor(preferred, proposals, docs, proposalId).length ? preferred : "FT",
  );
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pctMode, setPctMode] = useState<PctMode>("100");
  const [pctOther, setPctOther] = useState(50);

  const info = DOC_TYPES[type];
  const sources = sourcesFor(type, proposals, docs, proposalId);
  const current = sources.find((s) => s.id === pickedId) ?? sources[0];
  const canPct = info.source === "p" && type !== "GT";
  const pct = canPct ? (pctMode === "100" ? 100 : pctMode === "30" ? 30 : clamp(Math.round(pctOther), 1, 100)) : 100;
  const totals = current?.proposal ? computeTotals(current.proposal) : null;
  const billedPct = pinned
    ? Math.round((billedFor(pinned.ref, docs) / Math.max(computeTotals(pinned).grandTotal, 0.01)) * 100)
    : 0;
  const emptyText =
    info.source === "p"
      ? "Não há propostas aprovadas. Marque uma proposta como Aprovada em Propostas."
      : info.source === "i"
        ? "Não há faturas emitidas para corrigir."
        : "Não há documentos em dívida.";

  return (
    <div className="stack fx-new">
      {pinned && (
        <div className="fx-origin">
          <span className="cx-k">Origem</span>
          <span className="mono strong" style={{ color: "var(--blue)" }}>
            {pinned.ref}
          </span>
          <strong>{pinned.client.company || "Sem cliente"}</strong>
          <span className="muted" style={{ fontSize: 12 }}>
            {`${pinned.status} · ${billedPct > 0 ? `${billedPct}% já faturado` : "ainda sem faturação"}`}
          </span>
        </div>
      )}

      <span className="field__label">Tipo de documento</span>
      <div className="fx-types">
        {DOC_TYPE_IDS.map((t) => {
          const off = sourcesFor(t, proposals, docs, proposalId).length === 0;
          return (
            <button
              key={t}
              type="button"
              disabled={off}
              className={`fx-type${t === type ? " is-active" : ""}${off ? " is-off" : ""}`}
              onClick={() => {
                setType(t);
                setPickedId(null);
              }}
            >
              <span className="mono fx-type__code">{t}</span>
              <span>{DOC_TYPES[t].label}</span>
              {off && (
                <small>
                  {DOC_TYPES[t].source === "p" ? "sem proposta" : DOC_TYPES[t].source === "i" ? "sem fatura" : "sem dívida"}
                </small>
              )}
            </button>
          );
        })}
      </div>

      {(!pinned || sources.length > 1) && (
        <>
          <span className="field__label">
            {info.source === "p"
              ? "Proposta a converter"
              : info.source === "i"
                ? "Documento a corrigir"
                : "Documento a liquidar"}
          </span>
          {sources.length === 0 ? (
            <div className="empty">{emptyText}</div>
          ) : (
            <div className="fx-picks">
              {sources.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`fx-pick${current && current.id === s.id ? " is-active" : ""}`}
                  onClick={() => setPickedId(s.id)}
                >
                  <span>
                    <strong>{s.title}</strong>
                    <small>{s.sub}</small>
                  </span>
                  <span className="mono">{formatMoney(s.val)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {canPct && current && totals && (
        <>
          <span className="field__label">Valor a faturar</span>
          <div className="cx-seg">
            {(
              [
                ["100", "100%"],
                ["30", "Sinal 30%"],
                ["x", "Outro %"],
              ] as const
            ).map(([v, label]) => (
              <button key={v} type="button" className={pctMode === v ? "is-active" : ""} onClick={() => setPctMode(v)}>
                {label}
              </button>
            ))}
          </div>
          {pctMode === "x" && (
            <Field label="Percentagem">
              <NumberInput value={pctOther} min={1} max={100} onChange={setPctOther} />
            </Field>
          )}
          <div className="fx-sum">
            <div>
              <span>{`Incidência (${pct}%)`}</span>
              <span className="mono strong">{formatMoney(round2((totals.netTotal * pct) / 100))}</span>
            </div>
            <div>
              <span>IVA</span>
              <span className="mono strong">{formatMoney(round2((totals.vatTotal * pct) / 100))}</span>
            </div>
            <div className="fx-sum__total">
              <span>Total</span>
              <span className="mono">{formatMoney(round2((totals.grandTotal * pct) / 100))}</span>
            </div>
          </div>
        </>
      )}

      <div className="fx-new__foot">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!current}
          onClick={() => current && onCreate(buildFromSource(type, current, issuer, pct))}
        >
          <Icon name="plus" /> {`Criar rascunho ${type}`}
        </button>
      </div>
    </div>
  );
}

export function NewDocModal(props: Omit<NewDocFormProps, "onCancel" | "proposalId"> & { onClose: () => void }) {
  const { onClose, ...rest } = props;
  return (
    <Modal title="Novo documento" icon="file" wide onClose={onClose}>
      <NewDocForm {...rest} onCancel={onClose} />
    </Modal>
  );
}
