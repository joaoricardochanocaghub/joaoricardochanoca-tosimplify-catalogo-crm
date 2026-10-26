// Separadores do editor de proposta: Geral, Texto, Técnica, Valores e Condições.
import { useMemo } from "react";
import { addDaysIso, formatDate, formatMoney, formatPercent, newId } from "../lib/format";
import { DEFAULT_VAT, PROPOSAL_STATUSES } from "../lib/model";
import type { ClientRef, CommercialRep, Conditions, Issuer, LineItem, ProposalStatus, Service, Spec } from "../lib/model";
import { isValidNif } from "../lib/nif";
import { computeTotals, lineNet } from "../lib/totals";
import { useStore } from "../store/StoreProvider";
import { Field, NumberInput, VatSelect } from "../ui/fields";
import { Icon } from "../ui/Icon";
import { useUI } from "../ui/UIProvider";

const NIF_WARNING = "NIF com dígito de controlo inválido.";

export function GeneralTab() {
  const { active, data, updateActive } = useStore();
  const set = <K extends "ref" | "date" | "validityDays" | "status" | "badge" | "subject">(
    key: K,
    value: (typeof active)[K],
  ) => updateActive((p) => ({ ...p, [key]: value }));
  const setClient = (key: keyof ClientRef, value: string) =>
    updateActive((p) => ({ ...p, client: { ...p.client, [key]: value } }));

  const duplicateRef = data.proposals.some(
    (p) => p.id !== active.id && p.ref.trim() !== "" && p.ref === active.ref,
  );
  const validUntil = addDaysIso(active.date, active.validityDays);
  const nif = active.client.nif.trim();

  return (
    <div className="stack">
      <div className="grid-2">
        <Field
          label="Referência"
          hint={duplicateRef ? "Já existe outra proposta com esta referência." : undefined}
          hintTone="warn"
        >
          <input
            type="text"
            className="input input--mono"
            value={active.ref}
            onChange={(e) => set("ref", e.target.value)}
          />
        </Field>
        <Field label="Data de emissão">
          <input type="date" className="input" value={active.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Validade (dias)" hint={validUntil ? `Válida até ${formatDate(validUntil)}` : undefined}>
          <NumberInput value={active.validityDays} min={1} integer onChange={(v) => set("validityDays", v)} />
        </Field>
        <Field label="Estado">
          <select
            className="select"
            value={active.status}
            onChange={(e) => set("status", e.target.value as ProposalStatus)}
          >
            {PROPOSAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Tipo de documento (etiqueta)">
        <input
          type="text"
          className="input"
          value={active.badge}
          placeholder="PROPOSTA COMERCIAL"
          onChange={(e) => set("badge", e.target.value)}
        />
      </Field>
      <Field label="Assunto / título do projeto">
        <input type="text" className="input" value={active.subject} onChange={(e) => set("subject", e.target.value)} />
      </Field>
      <div className="section-block">
        <h3 className="section-title">Cliente destinatário</h3>
        <div className="grid-2">
          <Field label="Empresa / razão social">
            <input
              type="text"
              className="input"
              value={active.client.company}
              onChange={(e) => setClient("company", e.target.value)}
            />
          </Field>
          <Field label="NIF / NIPC" hint={nif && !isValidNif(nif) ? NIF_WARNING : undefined} hintTone="warn">
            <input
              type="text"
              className="input input--mono"
              value={active.client.nif}
              onChange={(e) => setClient("nif", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Pessoa de contacto">
            <input
              type="text"
              className="input"
              value={active.client.contact}
              onChange={(e) => setClient("contact", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="input"
              value={active.client.email}
              onChange={(e) => setClient("email", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Morada / localização">
          <input
            type="text"
            className="input"
            value={active.client.address}
            onChange={(e) => setClient("address", e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

export function TextTab() {
  const { active, updateActive } = useStore();
  return (
    <div className="stack">
      <p className="muted">Secções vazias não aparecem no documento. A numeração ajusta-se automaticamente.</p>
      <Field label="Contexto — situação e necessidade do cliente">
        <textarea
          className="textarea"
          rows={4}
          value={active.context}
          onChange={(e) => updateActive((p) => ({ ...p, context: e.target.value }))}
        />
      </Field>
      <Field label="Solução — o que propomos">
        <textarea
          className="textarea"
          rows={4}
          value={active.solution}
          onChange={(e) => updateActive((p) => ({ ...p, solution: e.target.value }))}
        />
      </Field>
      <Field label="Próximos passos (um por linha)">
        <textarea
          className="textarea"
          rows={5}
          value={active.nextSteps}
          onChange={(e) => updateActive((p) => ({ ...p, nextSteps: e.target.value }))}
        />
      </Field>
    </div>
  );
}

/** Lista editável de parâmetros técnicos (nome + valor). */
export function SpecRows({ specs, onChange }: { specs: Spec[]; onChange: (specs: Spec[]) => void }) {
  const setSpec = (id: string, key: "name" | "value", value: string) =>
    onChange(specs.map((s) => (s.id === id ? { ...s, [key]: value } : s)));
  return (
    <>
      {specs.map((s) => (
        <div key={s.id} className="spec-row">
          <input
            type="text"
            className="input"
            placeholder="Parâmetro"
            aria-label="Parâmetro"
            value={s.name}
            onChange={(e) => setSpec(s.id, "name", e.target.value)}
          />
          <input
            type="text"
            className="input"
            placeholder="Valor"
            aria-label="Valor"
            value={s.value}
            onChange={(e) => setSpec(s.id, "value", e.target.value)}
          />
          <button
            type="button"
            className="btn btn--ghost btn--icon btn--sm"
            aria-label="Remover parâmetro"
            onClick={() => onChange(specs.filter((x) => x.id !== s.id))}
          >
            <Icon name="trash" />
          </button>
        </div>
      ))}
    </>
  );
}

export const blankSpec = (): Spec => ({ id: newId("sp"), name: "", value: "" });

export function TechnicalTab() {
  const { active, updateActive } = useStore();
  const { machine } = active;
  const setMachine = (patch: Partial<typeof machine>) =>
    updateActive((p) => ({ ...p, machine: { ...p.machine, ...patch } }));

  return (
    <div className="stack">
      <Field label="Equipamento principal">
        <input type="text" className="input" value={machine.name} onChange={(e) => setMachine({ name: e.target.value })} />
      </Field>
      <Field label="Descrição e aplicação">
        <textarea
          className="textarea"
          rows={4}
          value={machine.desc}
          onChange={(e) => setMachine({ desc: e.target.value })}
        />
      </Field>
      <div className="section-block">
        <div className="section-head">
          <h3 className="section-title">Parâmetros técnicos</h3>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setMachine({ specs: [...machine.specs, blankSpec()] })}
          >
            <Icon name="plus" size={14} /> Adicionar
          </button>
        </div>
        {machine.specs.length === 0 && <p className="muted">Sem parâmetros. Adicione os dados da ficha técnica.</p>}
        <SpecRows specs={machine.specs} onChange={(specs) => setMachine({ specs })} />
      </div>
    </div>
  );
}

export function ValuesTab() {
  const { active, updateActive } = useStore();
  const { toast } = useUI();
  const totals = useMemo(() => computeTotals(active), [active]);

  const setItem = (id: string, patch: Partial<LineItem>) =>
    updateActive((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const setService = (id: string, patch: Partial<Service>) =>
    updateActive((p) => ({ ...p, services: p.services.map((sv) => (sv.id === id ? { ...sv, ...patch } : sv)) }));

  const addItem = () =>
    updateActive((p) => ({
      ...p,
      items: [
        ...p.items,
        { id: newId("it"), desc: "Novo equipamento / acessório", qty: 1, unitPrice: 0, discount: 0, vat: DEFAULT_VAT },
      ],
    }));

  const removeItem = (id: string) => {
    if (active.items.length <= 1) {
      toast("A proposta tem de conter pelo menos um item.", "error");
      return;
    }
    updateActive((p) => ({ ...p, items: p.items.filter((it) => it.id !== id) }));
  };

  return (
    <div className="stack">
      <div className="section-head">
        <h3 className="section-title">Itens comerciais</h3>
        <button type="button" className="btn btn--secondary btn--sm" onClick={addItem}>
          <Icon name="plus" size={14} /> Novo item
        </button>
      </div>
      {active.items.map((item, index) => (
        <div key={item.id} className="line-card">
          <div className="line-card__head">
            <span className="line-card__title">Item {index + 1}</span>
            <span className="line-card__total">{formatMoney(lineNet(item))}</span>
            <button
              type="button"
              className="btn btn--ghost btn--icon btn--sm"
              aria-label={`Remover item ${index + 1}`}
              onClick={() => removeItem(item.id)}
            >
              <Icon name="trash" />
            </button>
          </div>
          <Field label="Descrição">
            <input
              type="text"
              className="input"
              value={item.desc}
              onChange={(e) => setItem(item.id, { desc: e.target.value })}
            />
          </Field>
          <div className="grid-4">
            <Field label="Qtd">
              <NumberInput value={item.qty} min={0} onChange={(v) => setItem(item.id, { qty: v })} />
            </Field>
            <Field label="Preço unit. (€)">
              <NumberInput value={item.unitPrice} onChange={(v) => setItem(item.id, { unitPrice: v })} />
            </Field>
            <Field label="Desc. (%)">
              <NumberInput value={item.discount} max={100} onChange={(v) => setItem(item.id, { discount: v })} />
            </Field>
            <Field label="IVA">
              <VatSelect value={item.vat} onChange={(v) => setItem(item.id, { vat: v })} />
            </Field>
          </div>
        </div>
      ))}
      <div className="section-block">
        <div className="section-head">
          <h3 className="section-title">Serviços complementares</h3>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() =>
              updateActive((p) => ({
                ...p,
                services: [...p.services, { id: newId("sv"), label: "Novo serviço", amount: 0, vat: DEFAULT_VAT }],
              }))
            }
          >
            <Icon name="plus" size={14} /> Adicionar
          </button>
        </div>
        <p className="muted">Serviços com valor 0 € não aparecem no documento.</p>
        {active.services.map((sv) => (
          <div key={sv.id} className="service-row">
            <input
              type="text"
              className="input"
              aria-label="Descrição do serviço"
              value={sv.label}
              onChange={(e) => setService(sv.id, { label: e.target.value })}
            />
            <NumberInput
              ariaLabel="Valor do serviço (€)"
              value={sv.amount}
              onChange={(v) => setService(sv.id, { amount: v })}
            />
            <VatSelect ariaLabel="IVA do serviço" value={sv.vat} onChange={(v) => setService(sv.id, { vat: v })} />
            <button
              type="button"
              className="btn btn--ghost btn--icon btn--sm"
              aria-label="Remover serviço"
              onClick={() => updateActive((p) => ({ ...p, services: p.services.filter((x) => x.id !== sv.id) }))}
            >
              <Icon name="trash" />
            </button>
          </div>
        ))}
      </div>
      <div className="mini-totals">
        <div>
          <span>Total sem IVA</span>
          <strong>{formatMoney(totals.netTotal)}</strong>
        </div>
        {totals.vatRows.map((row) => (
          <div key={row.rate}>
            <span>IVA {formatPercent(row.rate)}</span>
            <strong>{formatMoney(row.vat)}</strong>
          </div>
        ))}
        <div className="mini-totals__grand">
          <span>Total com IVA</span>
          <strong>{formatMoney(totals.grandTotal)}</strong>
        </div>
      </div>
    </div>
  );
}

export function ConditionsTab() {
  const { active, data, updateActive, setIssuer } = useStore();
  const { issuer } = data;
  const setCond = (key: keyof Conditions, value: string) =>
    updateActive((p) => ({ ...p, conditions: { ...p.conditions, [key]: value } }));
  const setRep = (key: keyof CommercialRep, value: string) =>
    updateActive((p) => ({ ...p, commercialRep: { ...p.commercialRep, [key]: value } }));
  const setIss = (key: keyof Issuer, value: string) => setIssuer({ ...issuer, [key]: value });

  return (
    <div className="stack">
      <Field label="Condições de pagamento">
        <input
          type="text"
          className="input"
          value={active.conditions.payment}
          onChange={(e) => setCond("payment", e.target.value)}
        />
      </Field>
      <Field label="Prazo de entrega estimado">
        <input
          type="text"
          className="input"
          value={active.conditions.delivery}
          onChange={(e) => setCond("delivery", e.target.value)}
        />
      </Field>
      <Field label="Garantia">
        <input
          type="text"
          className="input"
          value={active.conditions.warranty}
          onChange={(e) => setCond("warranty", e.target.value)}
        />
      </Field>
      <Field label="Incoterms / local de entrega">
        <input
          type="text"
          className="input"
          value={active.conditions.location}
          onChange={(e) => setCond("location", e.target.value)}
        />
      </Field>
      <Field label="Observações (opcional, aparece no documento)">
        <textarea
          className="textarea"
          rows={3}
          value={active.notes}
          onChange={(e) => updateActive((p) => ({ ...p, notes: e.target.value }))}
        />
      </Field>
      <div className="section-block">
        <h3 className="section-title">Consultor comercial responsável</h3>
        <div className="grid-2">
          <Field label="Nome">
            <input
              type="text"
              className="input"
              value={active.commercialRep.name}
              onChange={(e) => setRep("name", e.target.value)}
            />
          </Field>
          <Field label="Cargo">
            <input
              type="text"
              className="input"
              value={active.commercialRep.role}
              onChange={(e) => setRep("role", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Telefone">
            <input
              type="text"
              className="input input--mono"
              value={active.commercialRep.phone}
              onChange={(e) => setRep("phone", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="input"
              value={active.commercialRep.email}
              onChange={(e) => setRep("email", e.target.value)}
            />
          </Field>
        </div>
      </div>
      <details className="section-block details">
        <summary className="section-title">Dados do emitente (todas as propostas)</summary>
        <div className="stack details__body">
          <div className="grid-2">
            <Field label="Nome comercial">
              <input
                type="text"
                className="input"
                value={issuer.tradeName}
                onChange={(e) => setIss("tradeName", e.target.value)}
              />
            </Field>
            <Field label="Subtítulo">
              <input
                type="text"
                className="input"
                value={issuer.tagline}
                onChange={(e) => setIss("tagline", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Titular">
              <input
                type="text"
                className="input"
                value={issuer.holder}
                onChange={(e) => setIss("holder", e.target.value)}
              />
            </Field>
            <Field
              label="NIF"
              hint={issuer.nif && !isValidNif(issuer.nif) ? NIF_WARNING : undefined}
              hintTone="warn"
            >
              <input
                type="text"
                className="input input--mono"
                value={issuer.nif}
                onChange={(e) => setIss("nif", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Morada">
            <input
              type="text"
              className="input"
              value={issuer.address}
              onChange={(e) => setIss("address", e.target.value)}
            />
          </Field>
          <div className="grid-3">
            <Field label="Telefone">
              <input
                type="text"
                className="input input--mono"
                value={issuer.phone}
                onChange={(e) => setIss("phone", e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className="input"
                value={issuer.email}
                onChange={(e) => setIss("email", e.target.value)}
              />
            </Field>
            <Field label="Website">
              <input
                type="text"
                className="input"
                value={issuer.website}
                onChange={(e) => setIss("website", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </details>
    </div>
  );
}
