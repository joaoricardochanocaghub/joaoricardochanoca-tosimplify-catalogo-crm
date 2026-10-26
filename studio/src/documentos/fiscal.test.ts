import { describe, expect, it } from "vitest";
import { seedData } from "../lib/model";
import {
  billedFor,
  docFromProposal,
  docStatus,
  hash4,
  issueDoc,
  qrPayload,
  receiptFor,
  receivedFor,
  reminderPlan,
  saftXml,
  sourcesFor,
} from "./fiscal";
import type { FiscalDoc, FiscalState } from "./fiscal";

const data = seedData();
const approved = { ...data.activeProposal, status: "Aprovada" as const };
const issuer = data.issuer;

function emitted(state: FiscalState, doc: FiscalDoc) {
  return issueDoc({ ...state, docs: [doc, ...state.docs] }, doc.id);
}

describe("emissão", () => {
  it("numera por série/ano, gera ATCUD e encadeia o hash", () => {
    let s: FiscalState = { docs: [], series: {}, autoRem: true };
    const a = { ...docFromProposal("FT", approved, issuer), date: "2026-10-10" };
    s = emitted(s, a);
    const b = { ...docFromProposal("FT", approved, issuer), date: "2026-10-11" };
    s = emitted(s, b);
    const [second, first] = s.docs;
    expect(first.no).toBe("FT 2026/1");
    expect(second.no).toBe("FT 2026/2");
    expect(first.atcud).toMatch(/^[A-Z2-9]{8}-1$/);
    expect(second.atcud.split("-")[0]).toBe(first.atcud.split("-")[0]);
    expect(first.hash).toHaveLength(40);
    expect(second.hash).not.toBe(first.hash);
    expect(hash4(first.hash)).toHaveLength(4);
  });

  it("a pró-forma não recebe ATCUD nem hash", () => {
    const s = emitted({ docs: [], series: {}, autoRem: true }, docFromProposal("PF", approved, issuer));
    expect(s.docs[0].no).toMatch(/^PF \d{4}\/1$/);
    expect(s.docs[0].atcud).toBe("");
    expect(s.docs[0].hash).toBe("");
  });
});

describe("pagamentos e estados", () => {
  it("fatura passa a parcialmente paga e depois a paga com recibos", () => {
    let s: FiscalState = { docs: [], series: {}, autoRem: true };
    const ft = { ...docFromProposal("FT", approved, issuer), dueDate: "2099-01-01" };
    s = emitted(s, ft);
    const invoice = s.docs[0];
    expect(docStatus(invoice, s.docs)).toBe("Emitido");

    s = emitted(s, receiptFor(invoice, 1000));
    expect(docStatus(invoice, s.docs)).toBe("Parcialmente pago");

    s = emitted(s, receiptFor(invoice, 105872.25 - 1000));
    expect(docStatus(invoice, s.docs)).toBe("Pago");
    expect(billedFor(approved.ref, s.docs)).toBe(105872.25);
    expect(receivedFor(approved.ref, s.docs)).toBe(105872.25);
    expect(sourcesFor("RG", [approved], s.docs)).toHaveLength(0);
  });

  it("fatura em dívida após o vencimento fica vencida", () => {
    const s = emitted(
      { docs: [], series: {}, autoRem: true },
      { ...docFromProposal("FT", approved, issuer), dueDate: "2026-01-01" },
    );
    expect(docStatus(s.docs[0], s.docs, "2026-02-01")).toBe("Vencido");
  });

  it("sinal de 30% aplica a percentagem a cada linha", () => {
    const d = docFromProposal("FT", approved, issuer, 30);
    expect(d.items[0].desc).toMatch(/^30% · /);
    expect(d.items[0].unitPrice).toBe(24750);
    expect(d.pct).toBe(30);
  });
});

describe("QR, lembretes e SAF-T", () => {
  it("QR no formato AT com IVA a 23% nos campos I7/I8", () => {
    const s = emitted({ docs: [], series: {}, autoRem: true }, docFromProposal("FT", approved, issuer));
    const qr = qrPayload(s.docs[0], issuer);
    expect(qr).toMatch(/^A:217673996\*B:501234560\*C:PT\*D:FT\*E:N\*/);
    expect(qr).toContain("I7:86075.00*I8:19797.25*");
    expect(qr).toContain("O:105872.25*");
  });

  it("calendário de lembretes: 3 dias antes, no dia e de 7 em 7 dias", () => {
    const d = { ...docFromProposal("FT", approved, issuer), dueDate: "2026-10-20" };
    expect(reminderPlan(d, "2026-10-10")).toEqual({ pending: false, date: "2026-10-17" });
    expect(reminderPlan(d, "2026-10-18")).toEqual({ pending: true, date: "2026-10-17" });
    expect(reminderPlan({ ...d, reminders: ["2026-10-18"] }, "2026-10-18")).toEqual({
      pending: false,
      date: "2026-10-20",
    });
    expect(reminderPlan({ ...d, reminders: ["a", "b"] }, "2026-10-28")).toEqual({
      pending: true,
      date: "2026-10-27",
    });
  });

  it("SAF-T inclui só faturas e notas emitidas", () => {
    let s: FiscalState = { docs: [], series: {}, autoRem: true };
    s = emitted(s, docFromProposal("FT", approved, issuer));
    s = emitted(s, docFromProposal("GT", approved, issuer));
    const xml = saftXml(s.docs, issuer, "2026-10-26");
    expect(xml).toContain("<NumberOfEntries>1</NumberOfEntries>");
    expect(xml).toContain("<InvoiceType>FT</InvoiceType>");
    expect(xml).not.toContain("<InvoiceType>GT</InvoiceType>");
  });
});
