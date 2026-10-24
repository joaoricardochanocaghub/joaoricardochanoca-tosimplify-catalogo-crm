/* toSimplify Studio — modelo de dados, cálculos e persistência local.
   Esquema v4, compatível com a versão HTML (mesma chave de localStorage). */

export const STORAGE_KEY = "tosimplify_studio_v4";
const LEGACY_KEY = "tosimplify_app_data_v3";
export const STATUSES = ["Rascunho", "Enviada", "Aprovada", "Recusada"] as const;
export type Status = (typeof STATUSES)[number];
export const CATEGORIES = ["Máquina", "Acessório"] as const;
export type Category = (typeof CATEGORIES)[number];
export const VAT_RATES = [23, 13, 6, 0];
export const DEFAULT_VAT = 23;

export interface Spec { id: string; name: string; value: string }
export interface Item { id: string; desc: string; qty: number; unitPrice: number; discount: number; vat: number }
export interface Service { id: string; label: string; amount: number; vat: number }
export interface ClientRef { company: string; nif: string; contact: string; email: string; address: string }
export interface Client extends ClientRef { id: string; sector: string }
export interface CatalogItem {
  id: string; sku: string; name: string; category: Category; description: string;
  photo: string; basePrice: number; vat: number; specs: Spec[];
}
export interface Issuer {
  tradeName: string; tagline: string; holder: string; nif: string; address: string;
  phone: string; email: string; website: string;
}
export interface Rep { name: string; role: string; phone: string; email: string }
export interface Conditions { payment: string; delivery: string; warranty: string; location: string }
export interface Proposal {
  id: string; ref: string; date: string; validityDays: number; badge: string; subject: string;
  status: Status; statusDate: string; context: string; solution: string; nextSteps: string;
  client: ClientRef; machine: { name: string; desc: string; photo: string; specs: Spec[] };
  items: Item[]; services: Service[]; conditions: Conditions; commercialRep: Rep; notes: string;
}
export interface Data {
  version: 4; clients: Client[]; catalog: CatalogItem[]; proposals: Proposal[];
  activeProposal: Proposal; issuer: Issuer;
}

// ---------- utilitários ----------
type Obj = Record<string, unknown>;
export function uid(prefix = "id") {
  const c = globalThis.crypto;
  const raw = c && typeof c.randomUUID === "function"
    ? c.randomUUID()
    : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${prefix}-${raw.replace(/-/g, "").slice(0, 10)}`;
}
export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
export const round2 = (v: number) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : v == null ? fallback : String(v));
export const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
// Só aceita imagens embutidas (data URL), endereços http(s) ou ficheiros da própria app em assets/
const photo = (v: unknown) => {
  const t = str(v);
  return /^(data:image\/|https?:\/\/|assets\/[\w./-]+\.(jpe?g|png|webp)$)/i.test(t) ? t : "";
};
const pad2 = (n: number) => String(n).padStart(2, "0");

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function formatDate(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || "";
}
export function addDays(iso: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}
// Diferença em dias inteiros entre duas datas ISO (b - a)
export function daysBetween(aIso: string, bIso: string) {
  const a = Date.parse(`${(aIso || "").slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${(bIso || "").slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

const moneyFmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", useGrouping: "always" } as unknown as Intl.NumberFormatOptions);
export const money = (v: number) => moneyFmt.format(Number.isFinite(v) ? v : 0);
// Formato curto para somatórios de coluna (ex.: 264k €)
export function moneyShort(v: number) {
  if (!Number.isFinite(v) || v === 0) return "0 €";
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}M €`;
  if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3).toLocaleString("pt-PT")}k €`;
  return `${Math.round(v).toLocaleString("pt-PT")} €`;
}
export const percent = (v: number) => `${Number(v).toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%`;
export const vatLabel = (v: number) => (v === 0 ? "Isento" : percent(v));

// ---------- valores por omissão ----------
export const defaultIssuer = (): Issuer => ({
  tradeName: "ToSimplify", tagline: "Soluções Industriais",
  holder: "Cristina Isabel da Silva Rebelo", nif: "217673996",
  address: "Avenida Vitor Gallo n99 4Esq | 2430-172 Marinha Grande",
  phone: "", email: "", website: "",
});
const defaultRep = (): Rep => ({ name: "João Ricardo Chanoca", role: "Consultor Comercial", phone: "", email: "" });
const defaultConditions = (): Conditions => ({ payment: "30% Sinal, 70% Entrega", delivery: "15 Dias", warranty: "24 Meses", location: "DDP" });
const defaultServices = (): Service[] => [
  { id: uid("sv"), label: "Transporte", amount: 0, vat: DEFAULT_VAT },
  { id: uid("sv"), label: "Instalação e arranque", amount: 0, vat: DEFAULT_VAT },
  { id: uid("sv"), label: "Formação operacional", amount: 0, vat: DEFAULT_VAT },
];
const defaultNextSteps = () => [
  "Validação da proposta e esclarecimento de eventuais questões técnicas",
  "Confirmação por escrito (aceite desta proposta ou nota de encomenda)",
  "Pagamento inicial conforme condições comerciais e agendamento da entrega",
  "Entrega, instalação e arranque do equipamento",
].join("\n");
const emptyClient = (): ClientRef => ({ company: "", nif: "", contact: "", email: "", address: "" });
const spec = (name: string, value: string): Spec => ({ id: uid("sp"), name, value });
const blankItem = (): Item => ({ id: uid("it"), desc: "Equipamento principal", qty: 1, unitPrice: 0, discount: 0, vat: DEFAULT_VAT });

const seedClients = (): Client[] => [
  { id: uid("cli"), company: "Mecânica de Precisão do Norte, Lda", nif: "501 234 560", sector: "Usinagem Aeronáutica & Automóvel", contact: "Eng. Fernando Rocha", email: "f.rocha@mecanicanorte.pt", address: "Rua da Indústria, 140 - Maia, Portugal" },
  { id: uid("cli"), company: "Moldes & Injeção Ibérica S.A.", nif: "502 987 650", sector: "Fabrico de Moldes Plásticos", contact: "Dra. Maria João Alves", email: "mjalves@moldesiberica.com", address: "Zona Industrial Leste, Lote 12 - Marinha Grande" },
  { id: uid("cli"), company: "Precision Aero Components", nif: "508 112 230", sector: "Aeroespacial & Defesa", contact: "Eng. Carlos Ramos", email: "c.ramos@precisionaero.pt", address: "Parque Tecnológico Évora, Edifício B" },
];
const seedCatalog = (): CatalogItem[] => [
  { id: uid("cat"), sku: "CNC-VMC-850X", name: "Centro de Usinagem Vertical CNC VMC-850X", category: "Máquina", description: "Centro de maquinação vertical de alta precisão com fuso direct-drive de 12.000 RPM, guiamentos lineares de rolos e trocador automático de 24 ferramentas.", photo: "", basePrice: 82500, vat: 23, specs: [spec("Curso X / Y / Z", "850 x 510 x 510 mm"), spec("Rotação Spindle", "12.000 RPM Direct-Drive"), spec("Potência Fuso", "15 kW / 11 kW"), spec("Comando CNC", 'Fanuc Oi-MF Plus 10.4"'), spec("Capacidade ATC", "24 Ferramentas Arm-Type")] },
  { id: uid("cat"), sku: "CNC-LTH-200", name: "Torno CNC de Alta Precisão LTH-200 com Ferramentas Ativas", category: "Máquina", description: "Torno CNC de barramento inclinado de 45° equipado com torre VDI-30 e eixo C de alta resolução para torneamento e fresagem combinados.", photo: "", basePrice: 74000, vat: 23, specs: [spec("Diâmetro Max Torneável", "320 mm"), spec("Passagem de Barra", '65 mm (Chuck 8")'), spec("Velocidade Fuso", "4.500 RPM"), spec("Torre Ferramentas", "12 Posições BMT45"), spec("Comando CNC", "Siemens Sinumerik 828D")] },
  { id: uid("cat"), sku: "FIX-HYD-40KN", name: "Morsa de Fixação Hidráulica Alta Pressão 40 kN", category: "Acessório", description: "Morsa de elevada rigidez para centro CNC com repetição inferior a 0.002 mm e sistema pneumático-hidráulico de aperto.", photo: "", basePrice: 2650, vat: 23, specs: [spec("Largura Mordente", "150 mm"), spec("Abertura Max", "300 mm"), spec("Força Aperto", "40 kN max")] },
  { id: uid("cat"), sku: "EDM-ONA-QX4-2017-12463", name: "Eletroerosão por Penetração ONA QX4 (2017)", category: "Máquina", description: "Eletroerosão por penetração CNC ONA QX4 de 2017, n.º série 12463, com eixo C, filtragem e limpeza automáticas e 20 elétrodos incluídos. Menos de 20.000 h de trabalho.", photo: "assets/catalogo/ona-qx4-2017.jpg", basePrice: 55000, vat: 23, specs: [spec("Fabricante", "ONA Electroerosión S.A. (Durango, Espanha)"), spec("Ano / N.º série", "2017 / 12463"), spec("Horas de trabalho", "< 20.000 h"), spec("Curso X / Y / Z", "600 / 400 / 400 mm"), spec("Eixo C", "Sim"), spec("Elétrodos incluídos", "20 un."), spec("Filtragem e limpeza", "Automáticas"), spec("Alimentação", "400 V / 50 Hz · 25,8 A · 17,9 kVA"), spec("Poder de corte (Icc)", "25 kA"), spec("Ar comprimido", "6 bar mín."), spec("Peso total", "4.530 kg (máq. 3.600 + gerador 350)")] },
];
const seedProposal = (): Proposal => ({
  id: uid("p"), ref: "TS-2026-089", date: "2026-10-05", validityDays: 30, badge: "PROPOSTA COMERCIAL",
  subject: "Fornecimento de Centro de Usinagem CNC VMC-850X com Refrigeração Interna", status: "Enviada", statusDate: "2026-10-05",
  context: "O cliente pretende reforçar a capacidade de maquinação vertical de alta precisão, com refrigeração interna pelo fuso para operações em cavidades profundas.",
  solution: "Fornecimento, entrega, instalação e arranque de um centro de maquinação vertical VMC-850X com refrigeração interna a 20 bar, incluindo formação operacional de programação CNC.",
  nextSteps: defaultNextSteps(),
  client: { company: "Mecânica de Precisão do Norte, Lda", nif: "501 234 560", contact: "Eng. Fernando Rocha", email: "f.rocha@mecanicanorte.pt", address: "Rua da Indústria, 140 - Maia, Portugal" },
  machine: {
    name: "Centro de Usinagem Vertical CNC VMC-850X",
    desc: "Centro de maquinação vertical de alta precisão com fuso direct-drive de 12.000 RPM, guiamentos lineares de rolos e trocador automático de 24 ferramentas.",
    photo: "",
    specs: [spec("Curso X / Y / Z", "850 x 510 x 510 mm"), spec("Rotação Spindle", "12.000 RPM Direct-Drive"), spec("Potência Fuso", "15 kW / 11 kW"), spec("Comando CNC", 'Fanuc Oi-MF Plus 10.4"'), spec("Capacidade ATC", "24 Ferramentas Arm-Type"), spec("Refrigeração Fuso", "Interna pelo Centro (20 Bar)")],
  },
  items: [
    { id: uid("it"), desc: "Centro CNC VMC-850X Standard Config + Spindle 12k", qty: 1, unitPrice: 82500, discount: 5, vat: 23 },
    { id: uid("it"), desc: "Sistema de Refrigeração Centro do Fuso (CTS 20 Bar)", qty: 1, unitPrice: 4200, discount: 0, vat: 23 },
  ],
  services: [
    { id: uid("sv"), label: "Transporte DDP Instalações do Cliente", amount: 1200, vat: 23 },
    { id: uid("sv"), label: "Nivelamento, Instalação & Arranque", amount: 1500, vat: 23 },
    { id: uid("sv"), label: "Formação Operacional de Programação CNC", amount: 800, vat: 23 },
  ],
  conditions: { payment: "30% Sinal, 70% Contra Entrega DDP", delivery: "15 Dias Após Encomenda", warranty: "24 Meses Peças & Mão de Obra", location: "DDP Maia / Instalações Cliente" },
  commercialRep: defaultRep(),
  notes: "",
});

// ---------- normalização (dados importados ou antigos) ----------
const o = (v: unknown): Obj => (isObj(v) ? v : {});
const normSpec = (v: unknown): Spec => { const t = o(v); return { id: str(t["id"]) || uid("sp"), name: str(t["name"]), value: str(t["value"] ?? t["val"]) }; };
const normItem = (v: unknown): Item => {
  const t = o(v);
  return { id: str(t["id"]) || uid("it"), desc: str(t["desc"]), qty: Math.max(num(t["qty"], 1), 0), unitPrice: Math.max(num(t["unitPrice"]), 0), discount: clamp(num(t["discount"]), 0, 100), vat: clamp(num(t["vat"], DEFAULT_VAT), 0, 100) };
};
const normService = (v: unknown): Service => {
  const t = o(v);
  return { id: str(t["id"]) || uid("sv"), label: str(t["label"]), amount: Math.max(num(t["amount"]), 0), vat: clamp(num(t["vat"], DEFAULT_VAT), 0, 100) };
};
export const normClientRef = (v: unknown): ClientRef => { const t = o(v); return { company: str(t["company"]), nif: str(t["nif"]), contact: str(t["contact"]), email: str(t["email"]), address: str(t["address"]) }; };
const normClient = (v: unknown): Client => { const t = o(v); return { ...normClientRef(t), id: str(t["id"]) || uid("cli"), sector: str(t["sector"]) }; };
const normCatalog = (v: unknown): CatalogItem => {
  const t = o(v);
  const cat = t["category"];
  return {
    id: str(t["id"]) || uid("cat"), sku: str(t["sku"]), name: str(t["name"]),
    category: (CATEGORIES as readonly unknown[]).includes(cat) ? (cat as Category) : "Máquina",
    description: str(t["description"]), photo: photo(t["photo"]), basePrice: Math.max(num(t["basePrice"]), 0),
    vat: clamp(num(t["vat"], DEFAULT_VAT), 0, 100), specs: (Array.isArray(t["specs"]) ? t["specs"] : []).map(normSpec),
  };
};
const normIssuer = (v: unknown): Issuer => {
  const d = defaultIssuer(); const t = o(v);
  const out = {} as Record<keyof Issuer, string>;
  (Object.keys(d) as (keyof Issuer)[]).forEach((k) => { out[k] = str(t[k], d[k]); });
  return out;
};
export function normProposal(v: unknown): Proposal {
  const t = o(v);
  const machine = o(t["machine"]);
  const cond = o(t["conditions"]);
  const rep = o(t["commercialRep"]);
  const dc = defaultConditions(); const dr = defaultRep();
  // Formato v3: o "id" era a referência
  const legacy = typeof t["ref"] !== "string";
  let services: Service[];
  if (Array.isArray(t["services"])) services = t["services"].map(normService);
  else if (isObj(t["additionalCosts"])) {
    const a = t["additionalCosts"];
    services = [
      { id: uid("sv"), label: "Transporte", amount: Math.max(num(a["shipping"]), 0), vat: DEFAULT_VAT },
      { id: uid("sv"), label: "Instalação e arranque", amount: Math.max(num(a["install"]), 0), vat: DEFAULT_VAT },
      { id: uid("sv"), label: "Formação operacional", amount: Math.max(num(a["training"]), 0), vat: DEFAULT_VAT },
    ];
  } else services = defaultServices();
  const items = (Array.isArray(t["items"]) ? t["items"] : []).map(normItem);
  if (!items.length) items.push(blankItem());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str(t["date"])) ? str(t["date"]) : todayIso();
  const status = t["status"];
  return {
    id: legacy ? uid("p") : str(t["id"]) || uid("p"),
    ref: str(legacy ? t["id"] : t["ref"]),
    date,
    validityDays: Math.max(Math.round(num(t["validityDays"], 30)), 1),
    badge: str(t["badge"], "PROPOSTA COMERCIAL"),
    subject: str(t["subject"]),
    status: (STATUSES as readonly unknown[]).includes(status) ? (status as Status) : "Rascunho",
    statusDate: /^\d{4}-\d{2}-\d{2}$/.test(str(t["statusDate"])) ? str(t["statusDate"]) : date,
    context: str(t["context"]), solution: str(t["solution"]), nextSteps: str(t["nextSteps"]),
    client: normClientRef(t["client"]),
    machine: { name: str(machine["name"]), desc: str(machine["desc"]), photo: photo(machine["photo"]), specs: (Array.isArray(machine["specs"]) ? machine["specs"] : []).map(normSpec) },
    items, services,
    conditions: { payment: str(cond["payment"], dc.payment), delivery: str(cond["delivery"], dc.delivery), warranty: str(cond["warranty"], dc.warranty), location: str(cond["location"], dc.location) },
    commercialRep: { name: str(rep["name"], dr.name), role: str(rep["role"], dr.role), phone: str(rep["phone"]), email: str(rep["email"]) },
    notes: str(t["notes"]),
  };
}
export function seedData(): Data {
  const p = seedProposal();
  return { version: 4, clients: seedClients(), catalog: seedCatalog(), proposals: [clone(p)], activeProposal: p, issuer: defaultIssuer() };
}
export function normData(v: unknown, { legacy = false } = {}): Data {
  const t = o(v);
  const seed = seedData();
  const proposals = Array.isArray(t["proposals"]) ? t["proposals"].map(normProposal) : seed.proposals;
  const active = t["activeProposal"] ? normProposal(t["activeProposal"]) : proposals[0] ? clone(proposals[0]) : seed.activeProposal;
  if (legacy) {
    const match = proposals.find((p) => p.ref === active.ref);
    if (match) active.id = match.id;
  }
  return {
    version: 4,
    clients: Array.isArray(t["clients"]) ? t["clients"].map(normClient) : seed.clients,
    catalog: Array.isArray(t["catalog"]) ? t["catalog"].map(normCatalog) : seed.catalog,
    proposals, activeProposal: active, issuer: normIssuer(t["issuer"]),
  };
}

// ---------- cálculos ----------
const lineGross = (it: Item) => round2(Math.max(it.qty, 0) * Math.max(it.unitPrice, 0));
const lineDiscount = (it: Item) => round2((lineGross(it) * clamp(it.discount, 0, 100)) / 100);
export const lineNet = (it: Item) => round2(lineGross(it) - lineDiscount(it));

export interface Totals {
  itemsNet: number; servicesNet: number; discountTotal: number; netTotal: number;
  vatRows: { rate: number; base: number; vat: number }[]; vatTotal: number; grandTotal: number;
}
export function totals(p: Pick<Proposal, "items" | "services">): Totals {
  const byRate = new Map<number, number>();
  const add = (rate: number, base: number) => byRate.set(rate, (byRate.get(rate) || 0) + base);
  let itemsNet = 0; let discountTotal = 0;
  p.items.forEach((it) => { const n = lineNet(it); itemsNet += n; discountTotal += lineDiscount(it); add(it.vat, n); });
  let servicesNet = 0;
  p.services.forEach((s) => { const a = round2(Math.max(s.amount, 0)); servicesNet += a; add(s.vat, a); });
  const vatRows = [...byRate.entries()].filter(([, b]) => b !== 0).sort((a, b) => b[0] - a[0])
    .map(([rate, base]) => ({ rate, base: round2(base), vat: round2((base * rate) / 100) }));
  const netTotal = round2(itemsNet + servicesNet);
  const vatTotal = round2(vatRows.reduce((s, r) => s + r.vat, 0));
  return { itemsNet: round2(itemsNet), servicesNet: round2(servicesNet), discountTotal: round2(discountTotal), netTotal, vatRows, vatTotal, grandTotal: round2(netTotal + vatTotal) };
}

export function nextRef(existing: { ref: string }[], date: string) {
  const year = /^\d{4}/.test(date || "") ? date.slice(0, 4) : todayIso().slice(0, 4);
  const re = new RegExp(`^TS-${year}-(\\d+)$`);
  let max = 0;
  existing.forEach(({ ref }) => { const m = re.exec(ref); if (m) max = Math.max(max, Number(m[1])); });
  return `TS-${year}-${String(max + 1).padStart(3, "0")}`;
}

export type StepId = "cliente" | "equipamento" | "valores" | "condicoes";
// Avisos por passo do assistente (vazio = passo completo)
export function stepIssues(p: Proposal): Record<StepId, string> {
  return {
    cliente: !p.client.company.trim() ? "Falta o cliente" : "",
    equipamento: !p.machine.name.trim() ? "Falta o equipamento" : !p.machine.specs.length ? "Sem especificações" : "",
    valores: p.items.some((x) => !x.unitPrice) ? "Há itens sem preço" : "",
    condicoes: !p.conditions.payment.trim() || !p.conditions.delivery.trim() ? "Faltam condições comerciais" : "",
  };
}

// ---------- estado e persistência ----------
let data: Data | null = null;
let storageError = false;
let saveTimer = 0;
let version = 0;
const listeners = new Set<() => void>();

function load(): Data {
  try {
    const cur = localStorage.getItem(STORAGE_KEY);
    if (cur) return normData(JSON.parse(cur));
    const old = localStorage.getItem(LEGACY_KEY);
    if (old) return normData(JSON.parse(old), { legacy: true });
  } catch (e) { console.error("Falha ao carregar dados locais", e); }
  return seedData();
}
function D(): Data {
  if (!data) {
    data = load();
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", persist);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") persist(); });
    }
  }
  return data;
}
function persist() {
  window.clearTimeout(saveTimer);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(D())); storageError = false; }
  catch (e) { console.error("Falha ao gravar dados locais", e); storageError = true; }
}
function changed() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(persist, 250);
  version += 1;
  listeners.forEach((fn) => fn());
}

const findProposal = (id: string) => D().proposals.find((p) => p.id === id);

function createProposal(client?: ClientRef): Proposal {
  const date = todayIso();
  const d = D();
  return {
    id: uid("p"), ref: nextRef(d.proposals, date), date, validityDays: 30, badge: "PROPOSTA COMERCIAL",
    subject: "Fornecimento de Equipamento Industrial", status: "Rascunho", statusDate: date,
    context: "", solution: "", nextSteps: defaultNextSteps(),
    client: client ? normClientRef(client) : emptyClient(),
    machine: { name: "", desc: "", photo: "", specs: [] },
    items: [blankItem()], services: defaultServices(), conditions: defaultConditions(),
    commercialRep: clone(d.activeProposal ? d.activeProposal.commercialRep : defaultRep()), notes: "",
  };
}

export const S = {
  get data() { return D(); },
  get active() { return D().activeProposal; },
  get storageError() { return storageError; },
  get version() { return version; },
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  changed,
  findProposal,
  isDirty() {
    const saved = findProposal(D().activeProposal.id);
    return !saved || JSON.stringify(saved) !== JSON.stringify(D().activeProposal);
  },

  // Guarda a proposta ativa no histórico
  saveActive() {
    const d = D();
    const p = clone(d.activeProposal);
    const idx = d.proposals.findIndex((x) => x.id === p.id);
    const duplicateRef = d.proposals.some((x) => x.id !== p.id && x.ref.trim() === p.ref.trim());
    if (idx >= 0) d.proposals[idx] = p; else d.proposals.unshift(p);
    changed();
    return { created: idx < 0, duplicateRef };
  },
  newProposal(client?: ClientRef) {
    D().activeProposal = createProposal(client);
    changed();
    return D().activeProposal;
  },
  openProposal(id: string) {
    const p = findProposal(id);
    if (!p) return false;
    D().activeProposal = clone(p);
    changed();
    return true;
  },
  duplicateProposal(id: string) {
    const d = D();
    const src = findProposal(id);
    if (!src) return null;
    const date = todayIso();
    const copy = clone(src);
    Object.assign(copy, { id: uid("p"), ref: nextRef(d.proposals, date), date, status: "Rascunho", statusDate: date });
    copy.items.forEach((x) => { x.id = uid("it"); });
    copy.services.forEach((x) => { x.id = uid("sv"); });
    copy.machine.specs.forEach((s) => { s.id = uid("sp"); });
    d.proposals.unshift(copy);
    changed();
    return copy;
  },
  deleteProposal(id: string) {
    const d = D();
    d.proposals = d.proposals.filter((p) => p.id !== id);
    if (d.activeProposal.id === id) d.activeProposal = createProposal();
    changed();
  },
  setStatus(id: string, status: Status) {
    if (!STATUSES.includes(status)) return;
    const d = D();
    const date = todayIso();
    const p = findProposal(id);
    if (p) { p.status = status; p.statusDate = date; }
    if (d.activeProposal.id === id) { d.activeProposal.status = status; d.activeProposal.statusDate = date; }
    changed();
  },

  // Aplica um cliente da base à proposta ativa
  applyClient(clientId: string) {
    const c = D().clients.find((x) => x.id === clientId);
    if (!c) return null;
    D().activeProposal.client = normClientRef(c);
    changed();
    return c.company;
  },
  // Máquinas preenchem a solução e a ficha técnica; acessórios só acrescentam linha
  applyCatalogItem(catId: string) {
    const c = D().catalog.find((x) => x.id === catId);
    if (!c) return null;
    const p = D().activeProposal;
    const line: Item = { id: uid("it"), desc: c.name, qty: 1, unitPrice: c.basePrice, discount: 0, vat: c.vat };
    if (c.category === "Máquina") {
      p.machine = { name: c.name, desc: c.description, photo: c.photo, specs: c.specs.map((s) => ({ ...s, id: uid("sp") })) };
      const first = p.items[0];
      const placeholder = p.items.length === 1 && first !== undefined && !first.unitPrice;
      if (placeholder) p.items = [line]; else p.items.push(line);
      if (!p.subject.trim() || p.subject === "Fornecimento de Equipamento Industrial") p.subject = `Fornecimento de ${c.name}`;
    } else {
      p.items.push(line);
    }
    changed();
    return c;
  },

  // Clientes
  saveClient(client: unknown) {
    const d = D();
    const c = normClient(client);
    const idx = d.clients.findIndex((x) => x.id === c.id);
    if (idx >= 0) d.clients[idx] = c; else d.clients.push(c);
    changed();
    return c;
  },
  deleteClient(id: string) { D().clients = D().clients.filter((c) => c.id !== id); changed(); },
  proposalsForClient(c: ClientRef) {
    const nif = (c.nif || "").replace(/\s/g, "");
    const name = (c.company || "").trim().toLowerCase();
    return D().proposals.filter((p) => {
      const pn = (p.client.nif || "").replace(/\s/g, "");
      return (nif && pn === nif) || (name && p.client.company.trim().toLowerCase() === name);
    });
  },

  // Catálogo
  newCatalogItem() {
    const c = normCatalog({ id: uid("cat"), name: "Novo item", category: "Máquina", vat: DEFAULT_VAT });
    D().catalog.unshift(c);
    changed();
    return c;
  },
  deleteCatalogItem(id: string) { D().catalog = D().catalog.filter((c) => c.id !== id); changed(); },

  // Cópia de segurança
  exportBackup() { persist(); return JSON.stringify(D(), null, 2); },
  restoreBackup(text: string) {
    const parsed: unknown = JSON.parse(text);
    data = normData(parsed, { legacy: !(isObj(parsed) && "version" in parsed) });
    persist();
    changed();
  },
  // Junta um ficheiro aos dados atuais sem apagar nada; devolve o que foi acrescentado
  mergeBackup(text: string) {
    const src: unknown = JSON.parse(text);
    if (!isObj(src)) throw new Error("Formato inválido");
    const d = D();
    const added = { clientes: 0, produtos: 0, propostas: 0 };
    const key = (v: unknown) => str(v).replace(/\s/g, "").toLowerCase();
    (Array.isArray(src["clients"]) ? src["clients"] : []).map(normClient).forEach((c) => {
      const dup = d.clients.some((x) => (key(c.nif) ? key(x.nif) === key(c.nif) : key(x.company) === key(c.company)));
      if (!dup && c.company.trim()) { d.clients.push(c); added.clientes += 1; }
    });
    (Array.isArray(src["catalog"]) ? src["catalog"] : []).map(normCatalog).forEach((c) => {
      const dup = d.catalog.some((x) => (key(c.sku) ? key(x.sku) === key(c.sku) : key(x.name) === key(c.name)));
      if (!dup && (c.sku.trim() || c.name.trim())) { d.catalog.push(c); added.produtos += 1; }
    });
    (Array.isArray(src["proposals"]) ? src["proposals"] : []).map(normProposal).forEach((p) => {
      if (d.proposals.some((x) => x.id === p.id)) return;
      if (!p.ref.trim() || d.proposals.some((x) => x.ref.trim() === p.ref.trim())) p.ref = nextRef(d.proposals, p.date);
      d.proposals.unshift(p);
      added.propostas += 1;
    });
    persist();
    changed();
    return added;
  },
  resetDemo() { data = seedData(); persist(); changed(); },
  newSpec: (name = "", value = ""): Spec => ({ id: uid("sp"), name, value }),
  newItem: (): Item => ({ id: uid("it"), desc: "", qty: 1, unitPrice: 0, discount: 0, vat: DEFAULT_VAT }),
  newService: (): Service => ({ id: uid("sv"), label: "", amount: 0, vat: DEFAULT_VAT }),
};
