import { describe, expect, it } from "vitest";
import { addDaysIso, formatDate } from "./format";
import { nextRef, normalizeData, normalizeProposal, seedData } from "./model";
import { isValidNif } from "./nif";
import { computeTotals, lineNet } from "./totals";

describe("NIF", () => {
  it("aceita os NIF dos dados de exemplo e do emitente", () => {
    for (const nif of ["501 234 560", "502 987 650", "508 112 230", "217673996"]) {
      expect(isValidNif(nif)).toBe(true);
    }
  });
  it("rejeita dígito de controlo errado ou formato inválido", () => {
    expect(isValidNif("501234561")).toBe(false);
    expect(isValidNif("12345")).toBe(false);
  });
});

describe("totais", () => {
  it("calcula a proposta de exemplo (desconto, serviços e IVA 23%)", () => {
    const t = computeTotals(seedData().activeProposal);
    // 82 500 − 5% = 78 375; + 4 200 = 82 575; serviços 3 500
    expect(t.itemsNet).toBe(82575);
    expect(t.discountTotal).toBe(4125);
    expect(t.servicesNet).toBe(3500);
    expect(t.netTotal).toBe(86075);
    expect(t.vatRows).toEqual([{ rate: 23, base: 86075, vat: 19797.25 }]);
    expect(t.grandTotal).toBe(105872.25);
  });
  it("agrupa o IVA por taxa e ignora bases a zero", () => {
    const t = computeTotals({
      items: [
        { id: "a", desc: "", qty: 2, unitPrice: 10.005, discount: 0, vat: 23 },
        { id: "b", desc: "", qty: 1, unitPrice: 100, discount: 0, vat: 6 },
      ],
      services: [{ id: "s", label: "", amount: 0, vat: 13 }],
    });
    expect(t.vatRows.map((r) => r.rate)).toEqual([23, 6]);
    expect(lineNet({ id: "a", desc: "", qty: 2, unitPrice: 10.005, discount: 0, vat: 23 })).toBe(20.01);
  });
});

describe("modelo", () => {
  it("gera a referência seguinte do ano", () => {
    expect(nextRef([{ ref: "TS-2026-089" }, { ref: "TS-2025-200" }], "2026-11-02")).toBe("TS-2026-090");
    expect(nextRef([], "2027-01-01")).toBe("TS-2027-001");
  });
  it("normaliza o formato v3 (ref em id, custos adicionais)", () => {
    const p = normalizeProposal({ id: "TS-2025-010", additionalCosts: { shipping: "150,5" } });
    expect(p.ref).toBe("TS-2025-010");
    expect(p.services[0]).toMatchObject({ label: "Transporte", amount: 150.5 });
    expect(p.items).toHaveLength(1);
  });
  it("liga a proposta ativa ao histórico no formato v3", () => {
    const d = normalizeData(
      { proposals: [{ id: "TS-1" }], activeProposal: { id: "TS-1" } },
      { legacy: true },
    );
    expect(d.activeProposal.id).toBe(d.proposals[0].id);
  });
  it("datas", () => {
    expect(formatDate("2026-10-05")).toBe("05/10/2026");
    expect(addDaysIso("2026-10-05", 30)).toBe("2026-11-04");
  });
});
