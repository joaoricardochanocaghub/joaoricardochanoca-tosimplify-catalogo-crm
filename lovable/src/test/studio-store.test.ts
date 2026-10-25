import { describe, expect, it } from "vitest";
import { lineNet, money, nextRef, normProposal, totals } from "@/studio/store";

describe("regras de cálculo", () => {
  it("total da linha = qtd × preço × (1 − desc/100), 2 casas", () => {
    expect(lineNet({ id: "a", desc: "", qty: 1, unitPrice: 82500, discount: 5, vat: 23 })).toBe(78375);
    expect(lineNet({ id: "b", desc: "", qty: 3, unitPrice: 10.005, discount: 0, vat: 23 })).toBe(30.02);
  });
  it("IVA agrupado por taxa sobre linhas e serviços", () => {
    const t = totals({
      items: [
        { id: "a", desc: "", qty: 1, unitPrice: 100, discount: 0, vat: 23 },
        { id: "b", desc: "", qty: 1, unitPrice: 50, discount: 0, vat: 6 },
      ],
      services: [{ id: "s", label: "", amount: 100, vat: 23 }],
    });
    expect(t.vatRows).toEqual([{ rate: 23, base: 200, vat: 46 }, { rate: 6, base: 50, vat: 3 }]);
    expect(t.grandTotal).toBe(299);
  });
  it("formato monetário pt-PT EUR", () => {
    expect(money(82500).replace(/\s/g, " ")).toBe("82 500,00 €");
  });
  it("referências TS-AAAA-NNN sequenciais", () => {
    expect(nextRef([{ ref: "TS-2026-089" }, { ref: "TS-2025-200" }], "2026-11-01")).toBe("TS-2026-090");
  });
  it("proposta v3 (id era a referência) importa com ref preservada", () => {
    expect(normProposal({ id: "TS-2025-010", additionalCosts: { shipping: 300 } }).ref).toBe("TS-2025-010");
  });
});
