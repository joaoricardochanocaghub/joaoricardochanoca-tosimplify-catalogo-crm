// Cálculo de totais e IVA por taxa, arredondado ao cêntimo linha a linha.
import { clamp, round2 } from "./format";
import type { LineItem, Service } from "./model";

export interface VatRow {
  rate: number;
  base: number;
  vat: number;
}

export interface Totals {
  itemsNet: number;
  servicesNet: number;
  discountTotal: number;
  netTotal: number;
  vatRows: VatRow[];
  vatTotal: number;
  grandTotal: number;
}

const lineGross = (item: LineItem) => round2(item.qty * item.unitPrice);
const lineDiscount = (item: LineItem) => round2((lineGross(item) * clamp(item.discount, 0, 100)) / 100);

/** Total líquido da linha (quantidade × preço − desconto). */
export const lineNet = (item: LineItem) => round2(lineGross(item) - lineDiscount(item));

export function computeTotals(doc: { items: LineItem[]; services: Service[] }): Totals {
  const byRate = new Map<number, number>();
  const addTo = (rate: number, value: number) => byRate.set(rate, (byRate.get(rate) ?? 0) + value);

  let itemsNet = 0;
  let discountTotal = 0;
  for (const item of doc.items) {
    const net = lineNet(item);
    itemsNet += net;
    discountTotal += lineDiscount(item);
    addTo(item.vat, net);
  }
  let servicesNet = 0;
  for (const service of doc.services) {
    const amount = round2(Math.max(service.amount, 0));
    servicesNet += amount;
    addTo(service.vat, amount);
  }

  const vatRows = [...byRate.entries()]
    .filter(([, base]) => base !== 0)
    .sort((a, b) => b[0] - a[0])
    .map(([rate, base]) => ({ rate, base: round2(base), vat: round2((base * rate) / 100) }));
  const netTotal = round2(itemsNet + servicesNet);
  const vatTotal = round2(vatRows.reduce((acc, r) => acc + r.vat, 0));

  return {
    itemsNet: round2(itemsNet),
    servicesNet: round2(servicesNet),
    discountTotal: round2(discountTotal),
    netTotal,
    vatRows,
    vatTotal,
    grandTotal: round2(netTotal + vatTotal),
  };
}
