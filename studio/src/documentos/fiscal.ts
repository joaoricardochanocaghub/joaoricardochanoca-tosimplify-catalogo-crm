// Documentos fiscais (demonstração): tipos, séries, ATCUD, hash, QR AT, estados, cobranças e SAF-T.
// Nada aqui tem validade fiscal: o programa não é certificado pela AT.
import { addDaysIso, formatDate, formatMoney, newId, round2, todayIso } from "../lib/format";
import type { ClientRef, Issuer, LineItem, Proposal, Service } from "../lib/model";
import { computeTotals } from "../lib/totals";
import type { Totals } from "../lib/totals";

export type DocType = "FT" | "FR" | "FS" | "NC" | "ND" | "RG" | "PF" | "GT";

interface DocTypeInfo {
  /** Nome por extenso. */
  label: string;
  /** Documento fiscal (recebe ATCUD, hash e QR). */
  fiscal: boolean;
  /** Origem: p = proposta aprovada, i = fatura emitida, r = documento em dívida. */
  source: "p" | "i" | "r";
  /** Fica a aguardar pagamento (tem vencimento e recibos). */
  payable?: boolean;
  /** Já nasce paga (fatura-recibo, simplificada). */
  paid?: boolean;
}

export const DOC_TYPES: Record<DocType, DocTypeInfo> = {
  FT: { label: "Fatura", fiscal: true, source: "p", payable: true },
  FR: { label: "Fatura-recibo", fiscal: true, source: "p", paid: true },
  FS: { label: "Fatura simplificada", fiscal: true, source: "p", paid: true },
  NC: { label: "Nota de crédito", fiscal: true, source: "i" },
  ND: { label: "Nota de débito", fiscal: true, source: "i", payable: true },
  RG: { label: "Recibo", fiscal: true, source: "r" },
  PF: { label: "Fatura pró-forma", fiscal: false, source: "p" },
  GT: { label: "Guia de transporte", fiscal: true, source: "p" },
};
export const DOC_TYPE_IDS = Object.keys(DOC_TYPES) as DocType[];

export const DOC_STATUSES = ["Rascunho", "Emitido", "Pago", "Parcialmente pago", "Vencido", "Anulado"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];
/** Estado guardado; Pago/Parcialmente pago/Vencido são calculados. */
export type StoredStatus = "Rascunho" | "Emitido" | "Anulado";

export const PAYMENT_METHODS = [
  "Transferência bancária",
  "Multibanco",
  "MB WAY",
  "Numerário",
  "Cheque",
  "Cartão",
];

export interface Transport {
  load: string;
  unload: string;
  start: string;
  plate: string;
}

export interface FiscalDoc {
  id: string;
  type: DocType;
  status: StoredStatus;
  date: string;
  dueDate: string;
  client: ClientRef;
  items: LineItem[];
  services: Service[];
  payment: string;
  method: string;
  notes: string;
  reason: string;
  /** Valor recebido (só recibos). */
  amount: number;
  /** Documento de origem (fatura corrigida ou liquidada). */
  refId: string | null;
  /** Referência da proposta de origem. */
  sourceRef: string;
  transport: Transport | null;
  no: string;
  atcud: string;
  hash: string;
  pct?: number;
  series?: string;
  n?: number;
  issuedAt?: string;
  reminders?: string[];
}

export interface FiscalState {
  docs: FiscalDoc[];
  series: Record<string, { code: string; last: number }>;
  autoRem: boolean;
}

// ---------- persistência ----------

export const FISCAL_KEY = "tosimplify_fiscal_v1";

export function loadFiscal(): FiscalState {
  try {
    const v = JSON.parse(localStorage.getItem(FISCAL_KEY) ?? "null");
    if (v && Array.isArray(v.docs)) return { docs: v.docs, series: v.series || {}, autoRem: v.autoRem !== false };
  } catch {
    // dados corrompidos: começa vazio
  }
  return { docs: [], series: {}, autoRem: true };
}

export function saveFiscal(state: FiscalState) {
  try {
    localStorage.setItem(FISCAL_KEY, JSON.stringify(state));
  } catch {
    // sem espaço ou modo privado: os dados ficam só em memória
  }
}

// ---------- totais, dívida e estado ----------

export function docTotals(d: FiscalDoc): Totals {
  return d.type === "RG"
    ? {
        netTotal: d.amount,
        vatRows: [],
        vatTotal: 0,
        grandTotal: d.amount,
        discountTotal: 0,
        itemsNet: d.amount,
        servicesNet: 0,
      }
    : computeTotals(d);
}

/** Emitido e não anulado. */
export const isLive = (d: FiscalDoc) => d.status !== "Rascunho" && d.status !== "Anulado";

export function docDue(d: FiscalDoc, docs: FiscalDoc[]) {
  const total = docTotals(d).grandTotal;
  const credit = docs
    .filter((x) => x.type === "NC" && isLive(x) && x.refId === d.id)
    .reduce((acc, x) => acc + docTotals(x).grandTotal, 0);
  const paid = docs
    .filter((x) => x.type === "RG" && isLive(x) && x.refId === d.id)
    .reduce((acc, x) => acc + x.amount, 0);
  return { total, credit, paid, due: round2(Math.max(total - credit - paid, 0)) };
}

export function docStatus(d: FiscalDoc, docs: FiscalDoc[], today = todayIso()): DocStatus {
  if (!isLive(d)) return d.status;
  const info = DOC_TYPES[d.type];
  if (info.paid) return "Pago";
  if (info.payable) {
    const u = docDue(d, docs);
    if (u.due <= 0.004) return "Pago";
    if (u.paid > 0) return "Parcialmente pago";
    if (d.dueDate && d.dueDate < today) return "Vencido";
  }
  return "Emitido";
}

/** Classe CSS do estado: primeira palavra ("Parcialmente pago" → "Parcialmente"). */
export const statusSlug = (s: string) => s.split(" ")[0];

// ---------- numeração, ATCUD e assinatura ----------

/** Assinatura de demonstração (40 caracteres base64), encadeada com a do documento anterior. */
export function demoHash(input: string): string {
  let a = 5381;
  let b = 52711;
  let out = "";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let round = 0; round < 40; round++) {
    for (let i = 0; i < input.length; i++) {
      a = (Math.imul(a, 33) ^ (input.charCodeAt(i) + round)) >>> 0;
      b = (Math.imul(b, 31) + input.charCodeAt(i) * (round + 1)) >>> 0;
    }
    out += alphabet[((a ^ b) >>> 0) % 64];
  }
  return out;
}

/** Código de validação da série (8 caracteres), usado no ATCUD. */
export function seriesCode(): string {
  const alphabet = "BCDFGHJKLMNPQRSTVWXZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

const digitsOnly = (s: string) => (s || "").replace(/\D/g, "");

/** Os 4 caracteres do hash impressos no documento (posições 1, 11, 21 e 31). */
export const hash4 = (h: string) => (h ? h[0] + h[10] + h[20] + h[30] : "");

/** Emite o rascunho: próximo número da série do tipo/ano, ATCUD e hash encadeado. */
export function issueDoc(state: FiscalState, id: string): FiscalState {
  const d = state.docs.find((x) => x.id === id);
  if (!d) return state;
  const info = DOC_TYPES[d.type];
  const key = `${d.type} ${d.date.slice(0, 4)}`;
  const series = state.series[key] || { code: seriesCode(), last: 0 };
  const n = series.last + 1;
  const no = `${key}/${n}`;
  const previous = state.docs
    .filter((x) => x.series === key && x.hash)
    .sort((a, b) => (b.n ?? 0) - (a.n ?? 0))[0];
  const hash = info.fiscal
    ? demoHash(`${d.date};${no};${docTotals(d).grandTotal.toFixed(2)};${previous ? previous.hash : ""}`)
    : "";
  return {
    ...state,
    series: { ...state.series, [key]: { ...series, last: n } },
    docs: state.docs.map((x) =>
      x.id === id
        ? {
            ...x,
            status: "Emitido",
            series: key,
            n,
            no,
            atcud: info.fiscal ? `${series.code}-${n}` : "",
            hash,
            issuedAt: new Date().toISOString(),
          }
        : x,
    ),
  };
}

/** Texto do código QR no formato da AT (Portaria 195/2020). */
export function qrPayload(d: FiscalDoc, issuer: Issuer): string {
  const t = docTotals(d);
  const fields: Record<number, [string, string]> = { 23: ["I7", "I8"], 13: ["I5", "I6"], 6: ["I3", "I4"] };
  let vat = "";
  for (const row of t.vatRows) {
    const k = fields[row.rate];
    if (k) vat += `${k[0]}:${row.base.toFixed(2)}*${k[1]}:${row.vat.toFixed(2)}*`;
    else if (row.rate === 0) vat += `I2:${row.base.toFixed(2)}*`;
  }
  return (
    `A:${digitsOnly(issuer.nif)}*B:${digitsOnly(d.client.nif) || "999999990"}*C:PT*D:${d.type}` +
    `*E:${d.status === "Anulado" ? "A" : "N"}*F:${d.date.replace(/-/g, "")}*G:${d.no}*H:${d.atcud}` +
    `*I1:PT*${vat}N:${t.vatTotal.toFixed(2)}*O:${t.grandTotal.toFixed(2)}*Q:${hash4(d.hash)}*R:0000`
  );
}

// ---------- criação de rascunhos ----------

function baseDoc(type: DocType, client: Partial<ClientRef>): FiscalDoc {
  return {
    id: newId("fx"),
    type,
    status: "Rascunho",
    date: todayIso(),
    dueDate: "",
    client: {
      company: client.company || "",
      nif: client.nif || "",
      address: client.address || "",
      contact: client.contact || "",
      email: client.email || "",
    },
    items: [],
    services: [],
    payment: "",
    method: PAYMENT_METHODS[0],
    notes: "",
    reason: "",
    amount: 0,
    refId: null,
    sourceRef: "",
    transport: null,
    no: "",
    atcud: "",
    hash: "",
  };
}

const blankLine = (): LineItem => ({ id: newId("it"), desc: "", qty: 1, unitPrice: 0, discount: 0, vat: 23 });

/** Fatura, pró-forma ou guia a partir de uma proposta; pct < 100 fatura só essa parte (ex.: sinal). */
export function docFromProposal(type: DocType, p: Proposal, issuer: Issuer, pct = 100): FiscalDoc {
  const d = baseDoc(type, p.client);
  d.items = p.items.map((it) => ({ ...it, id: newId("it") }));
  d.services = (p.services || []).filter((s) => s.amount > 0).map((s) => ({ ...s, id: newId("sv") }));
  d.sourceRef = p.ref;
  d.payment =
    type === "FT" || type === "PF" ? p.conditions?.payment || "" : type === "GT" ? "" : "Pronto pagamento";
  if (type === "FT") d.dueDate = addDaysIso(todayIso(), 30);
  if (type === "GT")
    d.transport = { load: issuer.address || "", unload: p.client.address || "", start: `${todayIso()}T09:00`, plate: "" };
  if (pct && pct < 100 && type !== "GT") {
    // a percentagem aplica-se a cada linha para o IVA ficar certo por taxa
    const f = pct / 100;
    d.items = d.items.map((it) => ({ ...it, desc: `${pct}% · ${it.desc}`, unitPrice: round2(it.unitPrice * f) }));
    d.services = d.services.map((s) => ({ ...s, label: `${pct}% · ${s.label}`, amount: round2(s.amount * f) }));
    d.pct = pct;
    d.notes = `Faturação parcial (${pct}%) da proposta ${p.ref}.`;
  }
  return d;
}

/** Recibo que liquida (total ou parcialmente) um documento em dívida. */
export function receiptFor(source: FiscalDoc, amount: number): FiscalDoc {
  const d = baseDoc("RG", source.client);
  d.refId = source.id;
  d.amount = amount;
  d.method = source.method;
  d.sourceRef = source.sourceRef;
  return d;
}

/** Nota de crédito (copia as linhas) ou de débito (linha em branco, vence a 30 dias). */
export function correctionFor(type: "NC" | "ND", source: FiscalDoc): FiscalDoc {
  const d = baseDoc(type, source.client);
  d.refId = source.id;
  d.sourceRef = source.sourceRef;
  d.method = source.method;
  d.payment = source.payment;
  if (type === "NC") {
    d.items = source.items.map((it) => ({ ...it, id: newId("it") }));
    d.services = (source.services || []).map((s) => ({ ...s, id: newId("sv") }));
  } else {
    d.items = [blankLine()];
    d.dueDate = addDaysIso(todayIso(), 30);
  }
  return d;
}

// ---------- origem de cada tipo de documento ----------

export interface SourceOption {
  id: string;
  title: string;
  sub: string;
  val: number;
  proposal?: Proposal;
  doc?: FiscalDoc;
}

/** Documentos/propostas de onde se pode criar um documento do tipo indicado. */
export function sourcesFor(type: DocType, proposals: Proposal[], docs: FiscalDoc[], proposalId?: string | null): SourceOption[] {
  const info = DOC_TYPES[type];
  const pinned = proposalId ? proposals.find((p) => p.id === proposalId) : undefined;
  const ref = pinned?.ref;
  if (info.source === "p") {
    return proposals
      .filter((p) => (proposalId ? p.id === proposalId : p.status === "Aprovada"))
      .map((p) => ({
        id: p.id,
        title: `${p.ref} · ${p.client.company || "Sem cliente"}`,
        sub: p.subject,
        val: computeTotals(p).grandTotal,
        proposal: p,
      }));
  }
  if (info.source === "i") {
    const allowed: DocType[] = type === "NC" ? ["FT", "FR", "FS", "ND"] : ["FT", "FR", "FS"];
    return docs
      .filter((d) => isLive(d) && (!ref || d.sourceRef === ref) && allowed.includes(d.type))
      .map((d) => ({
        id: d.id,
        title: `${d.no} · ${d.client.company || "Consumidor final"}`,
        sub: DOC_TYPES[d.type].label,
        val: docTotals(d).grandTotal,
        doc: d,
      }));
  }
  return docs
    .filter((d) => isLive(d) && (!ref || d.sourceRef === ref) && DOC_TYPES[d.type].payable && docDue(d, docs).due > 0)
    .map((d) => ({
      id: d.id,
      title: `${d.no} · ${d.client.company || "Consumidor final"}`,
      sub: "Em dívida",
      val: docDue(d, docs).due,
      doc: d,
    }));
}

export function buildFromSource(type: DocType, src: SourceOption, issuer: Issuer, pct: number): FiscalDoc {
  if (src.proposal) return docFromProposal(type, src.proposal, issuer, pct);
  if (type === "RG") return receiptFor(src.doc!, src.val);
  return correctionFor(type as "NC" | "ND", src.doc!);
}

// ---------- por proposta ----------

/** Faturado (com IVA) a partir de uma proposta, líquido de notas de crédito. */
export function billedFor(ref: string, docs: FiscalDoc[]) {
  return round2(
    docs
      .filter((d) => d.sourceRef === ref && isLive(d))
      .reduce((acc, d) => {
        if (["FT", "FR", "FS", "ND"].includes(d.type)) return acc + docTotals(d).grandTotal;
        if (d.type === "NC") return acc - docTotals(d).grandTotal;
        return acc;
      }, 0),
  );
}

/** Recebido a partir de uma proposta (recibos + faturas-recibo/simplificadas). */
export function receivedFor(ref: string, docs: FiscalDoc[]) {
  return round2(
    docs
      .filter((d) => d.sourceRef === ref && isLive(d))
      .reduce((acc, d) => {
        if (d.type === "RG") return acc + d.amount;
        if (["FR", "FS"].includes(d.type)) return acc + docTotals(d).grandTotal;
        return acc;
      }, 0),
  );
}

// ---------- histórico, lembretes e cobranças ----------

export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

export interface TimelineEvent {
  dt: string;
  t: string;
  s: string;
  k: "src" | "main" | "ok" | "warn" | "void" | "late" | "next";
}

export function timeline(d: FiscalDoc, docs: FiscalDoc[], proposals: Proposal[], today = todayIso()): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  if (d.sourceRef) {
    const p = proposals.find((x) => x.ref === d.sourceRef);
    ev.push({
      dt: p ? p.date : d.date,
      t: `Proposta ${d.sourceRef}${p && p.status === "Aprovada" ? " aprovada" : ""}`,
      s: p ? p.client.company || "" : "",
      k: "src",
    });
  }
  if (d.status === "Rascunho") ev.push({ dt: d.date, t: "Rascunho criado", s: "Ainda sem número", k: "src" });
  else ev.push({ dt: (d.issuedAt || d.date).slice(0, 10), t: `${d.no} emitido`, s: DOC_TYPES[d.type].label, k: "main" });

  docs
    .filter(
      (x) =>
        x.id !== d.id &&
        x.status !== "Rascunho" &&
        (x.refId === d.id || x.id === d.refId || (d.sourceRef && x.sourceRef === d.sourceRef && x.type === "GT")),
    )
    .forEach((x) =>
      ev.push({
        dt: x.date,
        t: x.type === "RG" ? `Recebido ${formatMoney(x.amount)}` : `${DOC_TYPES[x.type].label} ${x.no}`,
        s: x.type === "RG" ? `${x.no} · ${x.method}` : x.status === "Anulado" ? "Anulado" : "",
        k: x.status === "Anulado" ? "void" : x.type === "RG" ? "ok" : "main",
      }),
    );

  (d.reminders || []).forEach((r) => ev.push({ dt: r, t: "Lembrete de pagamento enviado", s: "", k: "warn" }));

  if (DOC_TYPES[d.type].payable && d.dueDate && isLive(d)) {
    const due = docDue(d, docs).due;
    if (due > 0.004)
      ev.push({
        dt: d.dueDate,
        t: d.dueDate < today ? "Vencido" : "Vencimento",
        s: `Em dívida ${formatMoney(due)}`,
        k: d.dueDate < today ? "late" : "next",
      });
  }
  if (d.status === "Anulado") ev.push({ dt: today, t: "Documento anulado", s: "", k: "void" });
  return ev.sort((a, b) => (a.dt < b.dt ? -1 : a.dt > b.dt ? 1 : 0));
}

export function reminderText(d: FiscalDoc, docs: FiscalDoc[], issuer: Issuer, today = todayIso()): string {
  const due = docDue(d, docs).due;
  const late = d.dueDate && d.dueDate < today;
  const dueLine = d.dueDate
    ? late
      ? `, com vencimento ultrapassado desde ${formatDate(d.dueDate)}.`
      : `, com vencimento a ${formatDate(d.dueDate)}.`
    : ".";
  return (
    `Assunto: Lembrete de pagamento — ${d.no}\n\n` +
    `Exmos. Senhores ${d.client.company || ""},\n\n` +
    `Vimos por este meio lembrar que o documento ${d.no}, emitido a ${formatDate(d.date)}, ` +
    `tem um valor em dívida de ${formatMoney(due)}${dueLine}\n\n` +
    `Meio de pagamento: ${d.method || "Transferência bancária"}.\n` +
    "Caso o pagamento já tenha sido efetuado, por favor ignore esta mensagem e aceite os nossos agradecimentos.\n\n" +
    "Com os melhores cumprimentos,\n" +
    [issuer.tradeName, issuer.phone, issuer.email].filter(Boolean).join(" · ")
  );
}

/**
 * Calendário de lembretes: 3 dias antes do vencimento, no dia e de 7 em 7 dias depois.
 * pending = há um lembrete por enviar desde `date`; caso contrário `date` é o próximo.
 */
export function reminderPlan(d: FiscalDoc, today = todayIso()): { pending: boolean; date: string } | null {
  if (!d.dueDate) return null;
  const schedule = [addDaysIso(d.dueDate, -3), d.dueDate];
  let k = 7;
  while (schedule[schedule.length - 1] <= today) {
    schedule.push(addDaysIso(d.dueDate, k));
    k += 7;
  }
  const sent = (d.reminders || []).length;
  const dueCount = schedule.filter((x) => x <= today).length;
  return sent < dueCount
    ? { pending: true, date: schedule[sent] }
    : { pending: false, date: schedule[Math.min(sent, schedule.length - 1)] };
}

export interface OpenItem {
  d: FiscalDoc;
  s: DocStatus;
  du: number;
  /** Dias após o vencimento (negativo = ainda a vencer; -1 sem vencimento). */
  days: number;
}

export const AGING_BUCKETS: { l: string; c: string; f: (x: OpenItem) => boolean }[] = [
  { l: "A vencer", c: "#7fb6d3", f: (x) => x.days <= 0 },
  { l: "1–30 dias", c: "#ffa800", f: (x) => x.days >= 1 && x.days <= 30 },
  { l: "31–60 dias", c: "#ff8a5c", f: (x) => x.days >= 31 && x.days <= 60 },
  { l: "+60 dias", c: "#ff5c4a", f: (x) => x.days > 60 },
];

// ---------- SAF-T (demonstração) ----------

export function saftXml(docs: FiscalDoc[], issuer: Issuer, today = todayIso()): string {
  const esc = (s: unknown) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const issued = docs.filter((d) => d.no && DOC_TYPES[d.type].fiscal);
  const invoices = issued.filter((d) => !["RG", "GT"].includes(d.type));
  const year = today.slice(0, 4);
  const body = invoices
    .map((d) => {
      const t = docTotals(d);
      return [
        "      <Invoice>",
        `        <InvoiceNo>${esc(d.no)}</InvoiceNo>`,
        `        <ATCUD>${esc(d.atcud)}</ATCUD>`,
        `        <DocumentStatus><InvoiceStatus>${d.status === "Anulado" ? "A" : "N"}</InvoiceStatus></DocumentStatus>`,
        `        <Hash>${esc(d.hash)}</Hash>`,
        `        <InvoiceDate>${d.date}</InvoiceDate>`,
        `        <InvoiceType>${d.type}</InvoiceType>`,
        `        <CustomerTaxID>${esc(digitsOnly(d.client.nif) || "999999990")}</CustomerTaxID>`,
        `        <DocumentTotals><TaxPayable>${t.vatTotal.toFixed(2)}</TaxPayable><NetTotal>${t.netTotal.toFixed(2)}</NetTotal><GrossTotal>${t.grandTotal.toFixed(2)}</GrossTotal></DocumentTotals>`,
        "      </Invoice>",
      ].join("\n");
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<!-- DEMONSTRAÇÃO — ficheiro gerado por programa não certificado. Não submeter à AT. -->",
    '<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01">',
    "  <Header>",
    "    <AuditFileVersion>1.04_01</AuditFileVersion>",
    `    <TaxRegistrationNumber>${esc(digitsOnly(issuer.nif))}</TaxRegistrationNumber>`,
    `    <CompanyName>${esc(issuer.holder || issuer.tradeName)}</CompanyName>`,
    `    <FiscalYear>${year}</FiscalYear>`,
    `    <StartDate>${year}-01-01</StartDate>`,
    `    <EndDate>${today}</EndDate>`,
    "    <ProductID>ToSimplify Studio/Demonstração</ProductID>",
    "  </Header>",
    "  <SourceDocuments>",
    "    <SalesInvoices>",
    `      <NumberOfEntries>${invoices.length}</NumberOfEntries>`,
    body,
    "    </SalesInvoices>",
    "  </SourceDocuments>",
    "</AuditFile>",
    "",
  ].join("\n");
}
