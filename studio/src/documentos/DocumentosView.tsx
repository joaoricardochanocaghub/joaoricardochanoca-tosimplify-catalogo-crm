// Documentos: vistas Todos (lista + painel), Cobranças (antiguidade + lembretes) e Por proposta.
import { useEffect, useMemo, useState } from "react";
import { formatDate, formatMoney, round2, todayIso } from "../lib/format";
import type { Proposal } from "../lib/model";
import { computeTotals } from "../lib/totals";
import { useStore } from "../store/StoreProvider";
import { printWithTitle, DocZoom } from "../studio/ProposalDoc";
import { Field, NumberInput } from "../ui/fields";
import { Icon } from "../ui/Icon";
import { Modal } from "../ui/Modal";
import { useUI } from "../ui/UIProvider";
import { DocEditor } from "./DocEditor";
import { FiscalDocA4 } from "./FiscalDocA4";
import {
  AGING_BUCKETS,
  DOC_STATUSES,
  DOC_TYPES,
  DOC_TYPE_IDS,
  PAYMENT_METHODS,
  billedFor,
  correctionFor,
  daysBetween,
  docDue,
  docStatus,
  docTotals,
  hash4,
  isLive,
  issueDoc,
  loadFiscal,
  qrPayload,
  receiptFor,
  receivedFor,
  reminderPlan,
  reminderText,
  saftXml,
  saveFiscal,
  statusSlug,
  timeline,
} from "./fiscal";
import type { DocStatus, DocType, FiscalDoc, FiscalState, OpenItem } from "./fiscal";
import { NewDocForm, NewDocModal } from "./NewDocForm";
import { QrCode } from "./QrCode";

type Tab = "docs" | "cob" | "prop";

interface PaymentDraft {
  amt: number;
  date: string;
  method: string;
  auto: boolean;
}

function StatusPill({ s }: { s: DocStatus }) {
  return <span className={`fx-st fx-st--${statusSlug(s)}`}>{s}</span>;
}

export function DocumentosView() {
  const { data } = useStore();
  const { toast, confirm } = useUI();
  const [state, setState] = useState<FiscalState>(loadFiscal);
  const [selectedId, setSelectedId] = useState<string | null>(() => loadFiscal().docs[0]?.id ?? null);
  const [tab, setTab] = useState<Tab>("docs");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | DocType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | DocStatus>("ALL");
  const [showNew, setShowNew] = useState(false);
  const [payment, setPayment] = useState<PaymentDraft | null>(null);
  const [reminder, setReminder] = useState<{ id: string; txt: string } | null>(null);
  const [drawerFor, setDrawerFor] = useState<string | null>(null);

  useEffect(() => saveFiscal(state), [state]);

  const docs = state.docs;
  const today = todayIso();
  const issuer = data.issuer;
  const current = docs.find((d) => d.id === selectedId) ?? null;

  const update = (id: string, fn: (d: FiscalDoc) => FiscalDoc) =>
    setState((s) => ({ ...s, docs: s.docs.map((d) => (d.id === id ? fn(d) : d)) }));
  const add = (d: FiscalDoc) => {
    setState((s) => ({ ...s, docs: [d, ...s.docs] }));
    setSelectedId(d.id);
  };

  const rows = useMemo(
    () => docs.map((d) => ({ d, s: docStatus(d, docs, today), t: docTotals(d).grandTotal })),
    [docs, today],
  );

  const kpis = useMemo(() => {
    let billed = 0;
    let receivable = 0;
    let overdue = 0;
    let overdueCount = 0;
    let received30 = 0;
    for (const { d, s, t } of rows) {
      if (!isLive(d)) continue;
      if (["FT", "FR", "FS", "ND"].includes(d.type)) billed += t;
      if (d.type === "NC") billed -= t;
      if (DOC_TYPES[d.type].payable) {
        const due = docDue(d, docs).due;
        receivable += due;
        if (s === "Vencido") {
          overdue += due;
          overdueCount++;
        }
      }
      if (daysBetween(d.date, today) <= 30) {
        if (d.type === "RG") received30 += d.amount;
        else if (["FR", "FS"].includes(d.type)) received30 += t;
      }
    }
    return { billed, receivable, overdue, overdueCount, received30 };
  }, [rows, docs, today]);

  const list = rows.filter(({ d, s }) => {
    const q = query.trim().toLowerCase();
    return (
      (typeFilter === "ALL" || d.type === typeFilter) &&
      (statusFilter === "ALL" || s === statusFilter) &&
      (!q ||
        (d.no || "").toLowerCase().includes(q) ||
        (d.client.company || "").toLowerCase().includes(q) ||
        (d.sourceRef || "").toLowerCase().includes(q))
    );
  });

  const emit = async (d: FiscalDoc) => {
    const info = DOC_TYPES[d.type];
    if ((d.type === "NC" || d.type === "ND") && !d.reason.trim()) return toast("Indique o motivo da nota.", "error");
    if (d.type === "RG") {
      const ref = docs.find((x) => x.id === d.refId);
      const due = ref ? docDue(ref, docs).due : 0;
      if (!(d.amount > 0)) return toast("Indique o valor recebido.", "error");
      if (d.amount > due + 0.004) return toast(`O valor excede o montante em dívida (${formatMoney(due)}).`, "error");
    } else if (d.type !== "GT" && docTotals(d).grandTotal <= 0) return toast("O documento não tem valor.", "error");
    if (!d.date) return toast("Indique a data do documento.", "error");
    const ok = await confirm({
      title: `Emitir ${info.label.toLowerCase()}`,
      message: `Ao emitir, o documento recebe o próximo número da série${
        info.fiscal ? ", ATCUD e assinatura" : ""
      }. Depois já não pode ser editado nem eliminado — apenas anulado.`,
      confirmLabel: "Emitir",
    });
    if (!ok) return;
    setState((s) => issueDoc(s, d.id));
    toast("Documento emitido.", "success");
  };

  const cancelDoc = async (d: FiscalDoc) => {
    if (docs.some((x) => x.refId === d.id && isLive(x)))
      return toast(`Anule primeiro os recibos e notas associados a ${d.no}.`, "error");
    const ok = await confirm({
      title: `Anular ${d.no}`,
      message:
        "O documento fica marcado como anulado e mantém o número na série. Esta ação não pode ser revertida.",
      confirmLabel: "Anular",
      danger: true,
    });
    if (ok) {
      update(d.id, (x) => ({ ...x, status: "Anulado" }));
      toast(`${d.no} anulado.`, "info");
    }
  };

  const removeDraft = async (d: FiscalDoc) => {
    const ok = await confirm({
      title: "Eliminar rascunho",
      message: "Eliminar este rascunho? Ainda não tem numeração.",
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (ok) {
      setState((s) => ({ ...s, docs: s.docs.filter((x) => x.id !== d.id) }));
      setSelectedId(null);
    }
  };

  const currentStatus = current ? docStatus(current, docs, today) : null;
  const currentDue = current && DOC_TYPES[current.type].payable && isLive(current) ? docDue(current, docs) : null;
  const currentTotals = current ? docTotals(current) : null;

  // formulário de pagamento pré-preenchido com o valor em dívida; só se repõe ao mudar de
  // documento ou quando a dívida muda (não a cada edição do formulário)
  useEffect(() => {
    setPayment(
      current && currentDue && currentDue.due > 0
        ? { amt: currentDue.due, date: today, method: current.method || PAYMENT_METHODS[0], auto: true }
        : null,
    );
  }, [selectedId, currentDue?.due]);

  const confirmPayment = () => {
    if (!payment || !current || !currentDue) return;
    if (!(payment.amt > 0)) return toast("Indique o valor recebido.", "error");
    if (payment.amt > currentDue.due + 0.004)
      return toast(`O valor excede o montante em dívida (${formatMoney(currentDue.due)}).`, "error");
    const receipt: FiscalDoc = {
      ...receiptFor(current, round2(payment.amt)),
      date: payment.date || today,
      method: payment.method,
    };
    if (payment.auto) {
      setState((s) => issueDoc({ ...s, docs: [receipt, ...s.docs] }, receipt.id));
      toast("Pagamento registado — recibo emitido.", "success");
    } else {
      add(receipt);
      toast("Rascunho de recibo criado. Reveja e emita.", "info");
    }
  };

  const openReminder = (d: FiscalDoc) => setReminder({ id: d.id, txt: reminderText(d, docs, issuer, today) });
  const reminderDoc = reminder ? docs.find((x) => x.id === reminder.id) : undefined;

  const copyReminder = async () => {
    if (!reminder) return;
    try {
      await navigator.clipboard.writeText(reminder.txt);
      toast("Texto copiado.", "success");
    } catch {
      toast("Não foi possível copiar. Selecione o texto e copie manualmente.", "error");
    }
  };

  const mailReminder = () => {
    if (!reminder || !reminderDoc) return;
    const lines = reminder.txt.split("\n");
    const subject = lines[0].replace(/^Assunto:\s*/, "");
    const body = lines.slice(2).join("\n");
    window.location.href = `mailto:${encodeURIComponent(reminderDoc.client.email || "")}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  const logReminder = () => {
    if (!reminder) return;
    update(reminder.id, (x) => ({ ...x, reminders: [...(x.reminders || []), today] }));
    setReminder(null);
    toast("Envio do lembrete registado.", "success");
  };

  const exportSaft = () => {
    if (!docs.some((d) => d.no && DOC_TYPES[d.type].fiscal))
      return toast("Não há documentos emitidos para exportar.", "error");
    const blob = new Blob([saftXml(docs, issuer, today)], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `SAF-T_PT_${today}_demonstracao.xml`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("SAF-T de demonstração descarregado — não válido para submissão à AT.", "info");
  };

  // ---- cobranças ----
  const open: OpenItem[] = rows
    .filter(({ d }) => isLive(d) && DOC_TYPES[d.type].payable)
    .map(({ d, s }) => ({ d, s, du: docDue(d, docs).due, days: d.dueDate ? daysBetween(d.dueDate, today) : -1 }))
    .filter((x) => x.du > 0.004)
    .sort((a, b) => b.days - a.days);
  const openTotal = round2(open.reduce((acc, x) => acc + x.du, 0));
  const pending = state.autoRem ? open.filter((x) => reminderPlan(x.d, today)?.pending) : [];
  const buckets = AGING_BUCKETS.map((b) => {
    const items = open.filter(b.f);
    return { ...b, items, sum: round2(items.reduce((acc, x) => acc + x.du, 0)) };
  });

  // ---- por proposta ----
  const chainProposals = data.proposals.filter(
    (p) => p.status === "Aprovada" || docs.some((d) => d.sourceRef === p.ref),
  );
  const stepKind = (d: FiscalDoc) => {
    const s = docStatus(d, docs, today);
    if (d.status === "Rascunho") return "next";
    if (s === "Pago" || d.type === "RG" || (d.type === "GT" && d.status === "Emitido")) return "done";
    if (s === "Vencido") return "late";
    if (s === "Anulado") return "void";
    return "open";
  };

  const facts: [string, string][] = current
    ? current.type === "RG"
      ? [
          ["Data", formatDate(current.date)],
          ["Valor", formatMoney(current.amount)],
          ["Meio", current.method || "—"],
        ]
      : [
          ["Emissão", formatDate(current.date)],
          ...(DOC_TYPES[current.type].payable
            ? ([["Vencimento", current.dueDate ? formatDate(current.dueDate) : "—"]] as [string, string][])
            : []),
          ["Incidência", formatMoney(currentTotals!.netTotal)],
          ["IVA", formatMoney(currentTotals!.vatTotal)],
        ]
    : [];
  const events = current ? timeline(current, docs, data.proposals, today) : [];

  const onCreated = (d: FiscalDoc) => {
    add(d);
    setTab("docs");
    toast("Rascunho criado. Reveja e emita.", "info");
  };

  return (
    <section className="view fx-view">
      <div className="view__head no-print">
        <div>
          <span className="eyebrow">Faturação</span>
          <h1>
            Documentos <span className="count count--lg">{docs.length}</span>
          </h1>
          <p className="muted">Faturas, notas, recibos e guias emitidos a partir de propostas aprovadas.</p>
        </div>
        <div className="fx-tabs">
          {(
            [
              ["docs", "Todos"],
              ["cob", "Cobranças"],
              ["prop", "Por proposta"],
            ] as const
          ).map(([value, label]) => (
            <button key={value} type="button" className={tab === value ? "is-active" : ""} onClick={() => setTab(value)}>
              {label}
              {value === "cob" && (pending.length || open.length) > 0 && (
                <span
                  className="fx-tabs__n"
                  title={pending.length ? "Lembretes para enviar" : "Documentos em aberto"}
                >
                  {pending.length || open.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={exportSaft}
            title="Ficheiro de demonstração — não válido para a AT"
          >
            Exportar SAF-T
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setShowNew(true)}>
            <Icon name="plus" /> Novo documento
          </button>
        </div>
      </div>

      {tab === "docs" && (
        <>
          <div className="kpis fx-kpis no-print">
            <div className="kpi">
              <span className="kpi__label">Faturado</span>
              <span className="kpi__value">{formatMoney(kpis.billed)}</span>
              <span className="kpi__note">Com IVA · líquido de notas de crédito</span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Por receber</span>
              <span className="kpi__value">{formatMoney(kpis.receivable)}</span>
              <span className="kpi__note">Faturas e notas de débito em aberto</span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Vencido</span>
              <span className="kpi__value">{formatMoney(kpis.overdue)}</span>
              <span className="kpi__note">{kpis.overdueCount} documento(s) após vencimento</span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Recebido · 30 dias</span>
              <span className="kpi__value">{formatMoney(kpis.received30)}</span>
              <span className="kpi__note">Recibos e faturas-recibo</span>
            </div>
          </div>

          <div className="filters no-print">
            <div className="search">
              <Icon name="search" size={14} />
              <input
                type="search"
                className="input"
                placeholder="Pesquisar por número, cliente ou proposta..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="select"
              value={typeFilter}
              aria-label="Filtrar por tipo"
              onChange={(e) => setTypeFilter(e.target.value as "ALL" | DocType)}
            >
              <option value="ALL">Todos os tipos</option>
              {DOC_TYPE_IDS.map((t) => (
                <option key={t} value={t}>{`${t} · ${DOC_TYPES[t].label}`}</option>
              ))}
            </select>
            <select
              className="select"
              value={statusFilter}
              aria-label="Filtrar por estado"
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | DocStatus)}
            >
              <option value="ALL">Todos os estados</option>
              {DOC_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {docs.length === 0 ? (
            <div className="empty no-print">
              Ainda não há documentos. Use <strong>Novo documento</strong> para converter uma proposta aprovada.
            </div>
          ) : (
            <div className="fx">
              <div className="fx-list no-print">
                {list.length === 0 ? (
                  <div className="fx-list__empty">Nenhum documento encontrado.</div>
                ) : (
                  list.map(({ d, s, t }) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`fx-row${current && current.id === d.id ? " is-active" : ""}`}
                      onClick={() => setSelectedId(d.id)}
                    >
                      <span className="mono fx-row__type">{d.type}</span>
                      <span className="fx-row__main">
                        <span className="fx-row__no mono">{d.no || "Rascunho"}</span>
                        <span className="fx-row__sub">
                          {`${d.client.company || "Consumidor final"} · ${formatDate(d.date)}`}
                        </span>
                      </span>
                      <span className="fx-row__side">
                        <span className="mono strong">
                          {d.type === "GT" ? "—" : formatMoney(d.type === "NC" ? -t : t)}
                        </span>
                        <StatusPill s={s} />
                      </span>
                    </button>
                  ))
                )}
              </div>

              {current && currentStatus ? (
                <div className="fx-side">
                  <div className="fx-panel no-print">
                    <div className="fx-panel__head">
                      <div className="stack" style={{ gap: 4 }}>
                        <div className="row" style={{ alignItems: "center" }}>
                          <span className="eyebrow">{DOC_TYPES[current.type].label}</span>
                          <StatusPill s={currentStatus} />
                        </div>
                        <h2 className="mono">{current.no || "Rascunho"}</h2>
                        <span className="muted" style={{ fontSize: 13 }}>
                          {current.client.company || "Consumidor final"}
                          {current.sourceRef && (
                            <>
                              {" · a partir de "}
                              <strong className="mono">{current.sourceRef}</strong>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="row">
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => printWithTitle(`${current.no || "Rascunho"} - ${issuer.tradeName}`)}
                        >
                          <Icon name="printer" size={14} /> PDF
                        </button>
                        {currentDue && currentDue.due > 0 && current.no && (
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => openReminder(current)}
                          >
                            Lembrete
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="fx-facts">
                      {facts.map(([k, v]) => (
                        <div key={k}>
                          <span>{k}</span>
                          <strong className="mono">{v}</strong>
                        </div>
                      ))}
                    </div>

                    {currentDue && (
                      <div className="fx-due">
                        <span>
                          Total <strong className="mono">{formatMoney(currentDue.total)}</strong>
                        </span>
                        {currentDue.credit > 0 && (
                          <span>
                            Creditado <strong className="mono">{formatMoney(currentDue.credit)}</strong>
                          </span>
                        )}
                        <span>
                          Recebido <strong className="mono">{formatMoney(currentDue.paid)}</strong>
                        </span>
                        <span>
                          Em dívida <strong className="mono">{formatMoney(currentDue.due)}</strong>
                        </span>
                      </div>
                    )}

                    {current.status === "Rascunho" && (
                      <DocEditor d={current} docs={docs} onChange={(fn) => update(current.id, fn)} />
                    )}

                    {current.status !== "Rascunho" && (
                      <div className={`fx-split${payment ? "" : " fx-split--one"}`}>
                        <div className="fx-tl">
                          <span className="field__label">Histórico</span>
                          {events.map((ev, i) => (
                            <div key={i} className="fx-tl__ev">
                              <span className={`fx-tl__dot fx-tl__dot--${ev.k}`} />
                              <div>
                                <strong>{ev.t}</strong>
                                <small>{[formatDate(ev.dt), ev.s].filter(Boolean).join(" · ")}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                        {payment && (
                          <div className="fx-pay">
                            <strong>Registar pagamento</strong>
                            <div className="grid-2">
                              <Field label="Valor">
                                <NumberInput
                                  value={payment.amt}
                                  min={0}
                                  onChange={(v) => setPayment((p) => (p ? { ...p, amt: v } : p))}
                                />
                              </Field>
                              <Field label="Data">
                                <input
                                  type="date"
                                  className="input"
                                  value={payment.date}
                                  onChange={(e) => setPayment((p) => (p ? { ...p, date: e.target.value } : p))}
                                />
                              </Field>
                            </div>
                            <div className="fx-chips">
                              {PAYMENT_METHODS.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  className={payment.method === m ? "is-active" : ""}
                                  onClick={() => setPayment((p) => (p ? { ...p, method: m } : p))}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                            <label className="fx-check">
                              <input
                                type="checkbox"
                                checked={payment.auto}
                                onChange={(e) => setPayment((p) => (p ? { ...p, auto: e.target.checked } : p))}
                              />
                              Emitir recibo RG automaticamente
                            </label>
                            <button type="button" className="btn btn--primary" onClick={confirmPayment}>
                              Confirmar pagamento
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {current.no && DOC_TYPES[current.type].fiscal && (
                      <div className="fx-fisc">
                        {current.type !== "RG" && <QrCode text={qrPayload(current, issuer)} />}
                        <div className="fx-fisc__grid">
                          <div>
                            <span>ATCUD</span>
                            <strong className="mono">{current.atcud || "—"}</strong>
                          </div>
                          <div>
                            <span>Código (hash)</span>
                            <strong className="mono">{hash4(current.hash) || "—"}</strong>
                          </div>
                          <div>
                            <span>Série</span>
                            <strong className="mono">{current.series || "—"}</strong>
                          </div>
                        </div>
                        {isLive(current) && ["FT", "FR", "FS", "ND"].includes(current.type) && (
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => add(correctionFor("NC", current))}
                          >
                            Emitir nota de crédito
                          </button>
                        )}
                      </div>
                    )}

                    <div className="fx-actions">
                      {current.status === "Rascunho" && (
                        <button type="button" className="btn btn--primary" onClick={() => emit(current)}>
                          <Icon name="check" /> Emitir
                        </button>
                      )}
                      {isLive(current) && ["FT", "FR", "FS"].includes(current.type) && (
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={() => add(correctionFor("ND", current))}
                        >
                          Nota de débito
                        </button>
                      )}
                      {isLive(current) && (
                        <button type="button" className="btn btn--danger" onClick={() => cancelDoc(current)}>
                          Anular
                        </button>
                      )}
                      {current.status === "Rascunho" && (
                        <button
                          type="button"
                          className="btn btn--danger btn--icon"
                          aria-label="Eliminar rascunho"
                          title="Eliminar rascunho"
                          onClick={() => removeDraft(current)}
                        >
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </div>
                  <DocZoom>
                    <FiscalDocA4 d={current} docs={docs} issuer={issuer} />
                  </DocZoom>
                </div>
              ) : (
                <div className="empty no-print">Selecione um documento.</div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "cob" && (
        <div className="stack no-print" style={{ gap: 16 }}>
          <div className="fx-band">
            <div className="fx-band__tot">
              <span>Por receber</span>
              <strong className="mono">{formatMoney(openTotal)}</strong>
              <small>{`${open.length} documento(s) em aberto`}</small>
            </div>
            <div className="fx-band__aging">
              <div className="fx-aging">
                {openTotal > 0 ? (
                  buckets.map((b) => b.sum > 0 && <span key={b.l} style={{ flex: b.sum, background: b.c }} />)
                ) : (
                  <span style={{ flex: 1, background: "transparent" }} />
                )}
              </div>
              <div className="fx-band__keys">
                {buckets.map((b) => (
                  <div key={b.l}>
                    <span>
                      <i style={{ background: b.c }} />
                      {b.l}
                    </span>
                    <strong className="mono">{formatMoney(b.sum)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {open.length === 0 ? (
            <div className="empty">Não há valores por receber.</div>
          ) : (
            <div className="fx-bks">
              {buckets.map((b) => (
                <div key={b.l} className="fx-bk" style={{ borderTopColor: b.c }}>
                  <div className="fx-bk__head">
                    <strong>{b.l}</strong>
                    <span className="mono">{b.items.length}</span>
                  </div>
                  {b.items.length === 0 && <span className="fx-bk__none">Nenhum documento.</span>}
                  {b.items.map(({ d, du, days }) => {
                    const sent = d.reminders || [];
                    const late = days > 0;
                    const plan = state.autoRem ? reminderPlan(d, today) : null;
                    return (
                      <div key={d.id} className="fx-card">
                        <div className="fx-card__top">
                          <span className="mono strong" style={{ color: "var(--blue)" }}>
                            {d.no}
                          </span>
                          <span className={`fx-card__due${late ? " is-late" : ""}`}>
                            {!d.dueDate
                              ? "sem vencimento"
                              : days < 0
                                ? `em ${-days} dias`
                                : days === 0
                                  ? "vence hoje"
                                  : `${days} dias`}
                          </span>
                        </div>
                        <strong className="fx-card__cli">{d.client.company || "Consumidor final"}</strong>
                        <span className="mono fx-card__amt">{formatMoney(du)}</span>
                        <small>
                          {sent.length
                            ? `${sent.length} lembrete(s) · último ${formatDate(sent[sent.length - 1])}`
                            : "Sem lembretes enviados"}
                        </small>
                        {plan && (
                          <span className={`fx-remtag${plan.pending ? " is-due" : ""}`}>
                            {plan.pending
                              ? `Lembrete para enviar · desde ${formatDate(plan.date)}`
                              : `Próximo lembrete ${formatDate(plan.date)}`}
                          </span>
                        )}
                        <div className="row">
                          <button
                            type="button"
                            className={`btn btn--sm ${late || plan?.pending ? "btn--primary" : "btn--secondary"}`}
                            style={{ flex: 1 }}
                            onClick={() => openReminder(d)}
                          >
                            {sent.length ? `Enviar ${sent.length + 1}.º lembrete` : "Lembrar"}
                          </button>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => {
                              setSelectedId(d.id);
                              setTab("docs");
                            }}
                          >
                            Pago
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          <div className="fx-rem">
            <button
              type="button"
              role="switch"
              aria-checked={state.autoRem}
              aria-label="Lembretes automáticos"
              className={`fx-switch${state.autoRem ? " is-on" : ""}`}
              onClick={() => setState((s) => ({ ...s, autoRem: !s.autoRem }))}
            >
              <i />
            </button>
            <div className="fx-rem__txt">
              <strong>{state.autoRem ? "Lembretes automáticos ativos" : "Lembretes automáticos desativados"}</strong>
              <span>
                {state.autoRem
                  ? `Calendário: 3 dias antes, no dia e a cada 7 dias após o vencimento · ${
                      pending.length ? `${pending.length} lembrete(s) para enviar hoje` : "nada para enviar hoje"
                    }. O envio é feito por si (email ou cópia do texto).`
                  : "Ative para a app indicar quando enviar cada lembrete."}
              </span>
            </div>
            {state.autoRem && pending.length > 0 && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => openReminder(pending[0].d)}>
                {`Enviar pendentes (${pending.length})`}
              </button>
            )}
          </div>
        </div>
      )}

      {tab === "prop" && (
        <div className={`fx-prop no-print${drawerFor ? " has-drawer" : ""}`}>
          <div className="stack" style={{ gap: 14 }}>
            {chainProposals.length === 0 ? (
              <div className="empty">Não há propostas aprovadas. Marque uma proposta como Aprovada em Propostas.</div>
            ) : (
              chainProposals.map((p) => (
                <ProposalChain
                  key={p.id}
                  proposal={p}
                  docs={docs}
                  active={drawerFor === p.id}
                  stepKind={stepKind}
                  isLate={(d) => docStatus(d, docs, today) === "Vencido"}
                  onOpenDoc={(id) => {
                    setSelectedId(id);
                    setTab("docs");
                  }}
                  onAdd={() => setDrawerFor(p.id)}
                />
              ))
            )}
          </div>
          {drawerFor && (
            <aside className="fx-drawer">
              <div className="fx-drawer__head">
                <strong>Novo documento</strong>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon btn--sm"
                  aria-label="Fechar"
                  onClick={() => setDrawerFor(null)}
                >
                  <Icon name="x" />
                </button>
              </div>
              <NewDocForm
                key={drawerFor}
                proposals={data.proposals}
                docs={docs}
                issuer={issuer}
                proposalId={drawerFor}
                onCancel={() => setDrawerFor(null)}
                onCreate={(d) => {
                  setDrawerFor(null);
                  onCreated(d);
                }}
              />
            </aside>
          )}
        </div>
      )}

      {showNew && (
        <NewDocModal
          proposals={data.proposals}
          docs={docs}
          issuer={issuer}
          onClose={() => setShowNew(false)}
          onCreate={(d) => {
            setShowNew(false);
            onCreated(d);
          }}
        />
      )}

      {reminder && reminderDoc && (
        <Modal
          title={`Lembrete de pagamento · ${reminderDoc.no}`}
          icon="file"
          wide
          onClose={() => setReminder(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={copyReminder}>
                Copiar texto
              </button>
              <button type="button" className="btn btn--secondary" onClick={mailReminder}>
                Abrir no email
              </button>
              <button type="button" className="btn btn--primary" onClick={logReminder}>
                Registar envio
              </button>
            </>
          }
        >
          <div className="stack">
            <span className="field__hint">
              {reminderDoc.client.email
                ? `Para: ${reminderDoc.client.email}`
                : "O cliente não tem email registado — copie o texto e envie pelo meio habitual."}
            </span>
            <textarea
              className="textarea"
              rows={14}
              value={reminder.txt}
              onChange={(e) => setReminder((r) => (r ? { ...r, txt: e.target.value } : r))}
            />
          </div>
        </Modal>
      )}
    </section>
  );
}

/** Sequência proposta → documentos, com o progresso recebido/faturado. */
function ProposalChain({
  proposal: p,
  docs,
  active,
  stepKind,
  isLate,
  onOpenDoc,
  onAdd,
}: {
  proposal: Proposal;
  docs: FiscalDoc[];
  active: boolean;
  stepKind: (d: FiscalDoc) => string;
  isLate: (d: FiscalDoc) => boolean;
  onOpenDoc: (id: string) => void;
  onAdd: () => void;
}) {
  const total = computeTotals(p).grandTotal;
  const billed = billedFor(p.ref, docs);
  const received = receivedFor(p.ref, docs);
  const chain = docs.filter((d) => d.sourceRef === p.ref).sort((a, b) => (a.date < b.date ? -1 : 1));
  const late = chain.some(isLate);
  const label =
    received >= total - 0.01
      ? "Liquidado"
      : late
        ? "Com valores vencidos"
        : billed <= 0
          ? "Ainda não faturado"
          : `${Math.round((received / total) * 100)}% recebido · ${Math.round((billed / total) * 100)}% faturado`;

  return (
    <div className={`fx-chain${active ? " is-active" : ""}`}>
      <div className="fx-chain__head">
        <div className="stack" style={{ gap: 2 }}>
          <span className="mono strong" style={{ color: "var(--blue)", fontSize: 12 }}>
            {p.ref}
          </span>
          <strong style={{ fontSize: 15 }}>{p.client.company || "Sem cliente"}</strong>
          <span className="muted" style={{ fontSize: 12 }}>
            {p.subject}
          </span>
        </div>
        <div className="stack" style={{ gap: 2, alignItems: "flex-end" }}>
          <strong className="mono" style={{ fontSize: 16 }}>
            {formatMoney(total)}
          </strong>
          <span className="muted" style={{ fontSize: 12 }}>
            {label}
          </span>
        </div>
      </div>
      <div className="fx-steps">
        <span className="fx-step fx-step--src">
          <span className="mono">{p.ref.replace(/^TS-\d{4}-/, "TS-")}</span>
        </span>
        {chain.map((d) => (
          <FragmentStep key={d.id} d={d} kind={stepKind(d)} onClick={() => onOpenDoc(d.id)} />
        ))}
        <i className="fx-step__ln" />
        <button type="button" className="fx-step fx-step--add" onClick={onAdd}>
          + Documento
        </button>
      </div>
      <div className="fx-prog">
        <span style={{ width: `${Math.min((received / total) * 100, 100)}%`, background: "var(--ok)" }} />
        <span
          style={{
            width: `${Math.max(Math.min(((billed - received) / total) * 100, 100), 0)}%`,
            background: "var(--amber)",
          }}
        />
      </div>
    </div>
  );
}

function FragmentStep({ d, kind, onClick }: { d: FiscalDoc; kind: string; onClick: () => void }) {
  return (
    <>
      <i className="fx-step__ln" />
      <button type="button" className={`fx-step fx-step--${kind}`} title={DOC_TYPES[d.type].label} onClick={onClick}>
        <span className="mono">{d.no ? d.no.replace(/ \d{4}\//, " ") : d.type}</span>
        <small>
          {d.status === "Rascunho" ? "rascunho" : d.type === "RG" ? formatMoney(d.amount) : DOC_TYPES[d.type].label}
        </small>
      </button>
    </>
  );
}
