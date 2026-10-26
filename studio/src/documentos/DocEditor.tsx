// Edição de um rascunho antes de emitir.
import { formatMoney, newId } from "../lib/format";
import type { LineItem } from "../lib/model";
import { Field, NumberInput } from "../ui/fields";
import { Icon } from "../ui/Icon";
import { DOC_TYPES, PAYMENT_METHODS, docDue } from "./fiscal";
import type { FiscalDoc, Transport } from "./fiscal";

interface DocEditorProps {
  d: FiscalDoc;
  docs: FiscalDoc[];
  onChange: (fn: (d: FiscalDoc) => FiscalDoc) => void;
}

function MethodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      {PAYMENT_METHODS.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}

export function DocEditor({ d, docs, onChange }: DocEditorProps) {
  const set = <K extends keyof FiscalDoc>(key: K, value: FiscalDoc[K]) => onChange((x) => ({ ...x, [key]: value }));
  const setTransport = (key: keyof Transport, value: string) =>
    onChange((x) => ({ ...x, transport: x.transport ? { ...x.transport, [key]: value } : x.transport }));
  const setLine = (id: string, key: keyof LineItem, value: string | number) =>
    onChange((x) => ({ ...x, items: x.items.map((it) => (it.id === id ? { ...it, [key]: value } : it)) }));
  const info = DOC_TYPES[d.type];
  const ref = d.refId ? docs.find((x) => x.id === d.refId) : undefined;

  return (
    <div className="stack">
      <div className="grid-2">
        <Field label="Data do documento">
          <input type="date" className="input" value={d.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        {info.payable ? (
          <Field label="Data de vencimento">
            <input type="date" className="input" value={d.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </Field>
        ) : d.type !== "GT" ? (
          <Field label="Meio de pagamento">
            <MethodSelect value={d.method} onChange={(v) => set("method", v)} />
          </Field>
        ) : (
          <div />
        )}
      </div>

      {info.payable && (
        <div className="grid-2">
          <Field label="Meio de pagamento">
            <MethodSelect value={d.method} onChange={(v) => set("method", v)} />
          </Field>
          <Field label="Condições">
            <input type="text" className="input" value={d.payment} onChange={(e) => set("payment", e.target.value)} />
          </Field>
        </div>
      )}

      {(d.type === "NC" || d.type === "ND") && (
        <Field label="Motivo (obrigatório)">
          <input
            type="text"
            className="input"
            value={d.reason}
            placeholder={d.type === "NC" ? "ex.: devolução de material, erro de preço" : "ex.: portes adicionais"}
            onChange={(e) => set("reason", e.target.value)}
          />
        </Field>
      )}

      {d.type === "RG" && (
        <Field
          label="Valor recebido"
          hint={ref ? `Em dívida em ${ref.no}: ${formatMoney(docDue(ref, docs).due)}` : undefined}
        >
          <NumberInput value={d.amount} min={0} onChange={(v) => set("amount", v)} />
        </Field>
      )}

      {d.type === "GT" && d.transport && (
        <>
          <div className="grid-2">
            <Field label="Local de carga">
              <input
                type="text"
                className="input"
                value={d.transport.load}
                onChange={(e) => setTransport("load", e.target.value)}
              />
            </Field>
            <Field label="Local de descarga">
              <input
                type="text"
                className="input"
                value={d.transport.unload}
                onChange={(e) => setTransport("unload", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Início do transporte">
              <input
                type="datetime-local"
                className="input"
                value={d.transport.start}
                onChange={(e) => setTransport("start", e.target.value)}
              />
            </Field>
            <Field label="Matrícula">
              <input
                type="text"
                className="input input--mono"
                value={d.transport.plate}
                placeholder="AA-00-AA"
                onChange={(e) => setTransport("plate", e.target.value.toUpperCase())}
              />
            </Field>
          </div>
        </>
      )}

      {d.type !== "RG" && (
        <div className="fx-lines">
          <div className="fx-lines__head">
            <span className="field__label">Linhas</span>
            {(d.type === "ND" || d.type === "NC") && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() =>
                  onChange((x) => ({
                    ...x,
                    items: [...x.items, { id: newId("it"), desc: "", qty: 1, unitPrice: 0, discount: 0, vat: 23 }],
                  }))
                }
              >
                <Icon name="plus" size={14} /> Linha
              </button>
            )}
          </div>
          {d.items.map((it) => (
            <div key={it.id} className="fx-line">
              <input
                type="text"
                className="input"
                value={it.desc}
                placeholder="Descrição"
                aria-label="Descrição"
                onChange={(e) => setLine(it.id, "desc", e.target.value)}
              />
              <NumberInput value={it.qty} min={0} ariaLabel="Quantidade" onChange={(v) => setLine(it.id, "qty", v)} />
              <NumberInput
                value={it.unitPrice}
                min={0}
                ariaLabel="Preço unitário"
                onChange={(v) => setLine(it.id, "unitPrice", v)}
              />
              <button
                type="button"
                className="btn btn--ghost btn--icon btn--sm"
                aria-label="Remover linha"
                onClick={() => onChange((x) => ({ ...x, items: x.items.filter((y) => y.id !== it.id) }))}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Field label="Observações">
        <textarea className="input" rows={2} value={d.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </div>
  );
}
