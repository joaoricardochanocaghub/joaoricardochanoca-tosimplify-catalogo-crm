// Modelo de dados do Studio. Esquema igual ao da app HTML (chave tosimplify_studio_v4):
// um backup JSON exportado de uma versão importa na outra.
import { clamp, newId, todayIso } from "./format";

export const VAT_RATES = [23, 13, 6, 0];
export const DEFAULT_VAT = 23;
export const PROPOSAL_STATUSES = ["Rascunho", "Enviada", "Aprovada", "Recusada"] as const;
export const CATALOG_CATEGORIES = ["Máquina", "Acessório"] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export interface Spec {
  id: string;
  name: string;
  value: string;
}

export interface LineItem {
  id: string;
  desc: string;
  qty: number;
  unitPrice: number;
  discount: number;
  vat: number;
}

export interface Service {
  id: string;
  label: string;
  amount: number;
  vat: number;
}

export interface ClientRef {
  company: string;
  nif: string;
  contact: string;
  email: string;
  address: string;
}

export interface Client extends ClientRef {
  id: string;
  sector: string;
}

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  category: CatalogCategory;
  description: string;
  image?: string;
  basePrice: number;
  vat: number;
  specs: Spec[];
}

export interface Machine {
  name: string;
  desc: string;
  image?: string;
  specs: Spec[];
}

export interface Conditions {
  payment: string;
  delivery: string;
  warranty: string;
  location: string;
}

export interface CommercialRep {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface Proposal {
  id: string;
  ref: string;
  date: string;
  validityDays: number;
  badge: string;
  subject: string;
  status: ProposalStatus;
  context: string;
  solution: string;
  nextSteps: string;
  client: ClientRef;
  machine: Machine;
  items: LineItem[];
  services: Service[];
  conditions: Conditions;
  commercialRep: CommercialRep;
  notes: string;
}

export interface Issuer {
  tradeName: string;
  tagline: string;
  holder: string;
  nif: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export interface StudioData {
  version: 4;
  clients: Client[];
  catalog: CatalogItem[];
  proposals: Proposal[];
  activeProposal: Proposal;
  issuer: Issuer;
}

// ---------- valores por defeito ----------

export const emptyClientRef = (): ClientRef => ({
  company: "",
  nif: "",
  contact: "",
  email: "",
  address: "",
});

export const defaultServices = (): Service[] => [
  { id: newId("sv"), label: "Transporte", amount: 0, vat: DEFAULT_VAT },
  { id: newId("sv"), label: "Instalação e arranque", amount: 0, vat: DEFAULT_VAT },
  { id: newId("sv"), label: "Formação operacional", amount: 0, vat: DEFAULT_VAT },
];

export const defaultConditions = (): Conditions => ({
  payment: "30% Sinal, 70% Entrega",
  delivery: "15 Dias",
  warranty: "24 Meses",
  location: "DDP",
});

export const defaultNextSteps = (): string =>
  [
    "Validação da proposta e esclarecimento de eventuais questões técnicas",
    "Confirmação por escrito (aceite desta proposta ou nota de encomenda)",
    "Pagamento inicial conforme condições comerciais e agendamento da entrega",
    "Entrega, instalação e arranque do equipamento",
  ].join("\n");

export const defaultRep = (): CommercialRep => ({
  name: "João Ricardo Chanoca",
  role: "Consultor Comercial",
  phone: "",
  email: "",
});

export const defaultIssuer = (): Issuer => ({
  tradeName: "ToSimplify",
  tagline: "Soluções Industriais",
  holder: "Cristina Isabel da Silva Rebelo",
  nif: "217673996",
  address: "Avenida Vitor Gallo n99 4Esq | 2430-172 Marinha Grande",
  phone: "",
  email: "",
  website: "",
});

export const blankItem = (desc = "Equipamento principal"): LineItem => ({
  id: newId("it"),
  desc,
  qty: 1,
  unitPrice: 0,
  discount: 0,
  vat: DEFAULT_VAT,
});

export const blankCatalogItem = (): CatalogItem => ({
  id: newId("cat"),
  sku: "",
  name: "",
  category: "Máquina",
  description: "",
  basePrice: 0,
  vat: DEFAULT_VAT,
  specs: [],
});

/** Próxima referência TS-AAAA-NNN do ano da data indicada. */
export function nextRef(proposals: Pick<Proposal, "ref">[], date: string): string {
  const year = /^\d{4}/.test(date) ? date.slice(0, 4) : todayIso().slice(0, 4);
  const pattern = new RegExp(`^TS-${year}-(\\d+)$`);
  let max = 0;
  for (const { ref } of proposals) {
    const m = pattern.exec(ref);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `TS-${year}-${String(max + 1).padStart(3, "0")}`;
}

export function createProposal({
  existing,
  rep,
  client,
}: {
  existing: Proposal[];
  rep?: CommercialRep;
  client?: ClientRef;
}): Proposal {
  const date = todayIso();
  return {
    id: newId("p"),
    ref: nextRef(existing, date),
    date,
    validityDays: 30,
    badge: "PROPOSTA COMERCIAL",
    subject: "Fornecimento de Equipamento Industrial",
    status: "Rascunho",
    context: "",
    solution: "",
    nextSteps: defaultNextSteps(),
    client: client ? { ...client } : emptyClientRef(),
    machine: { name: "", desc: "", specs: [] },
    items: [blankItem()],
    services: defaultServices(),
    conditions: defaultConditions(),
    commercialRep: rep ? { ...rep } : defaultRep(),
    notes: "",
  };
}

// ---------- dados de exemplo ----------

const spec = (name: string, value: string): Spec => ({ id: newId("sp"), name, value });

const seedClients = (): Client[] => [
  {
    id: newId("cli"),
    company: "Mecânica de Precisão do Norte, Lda",
    nif: "501 234 560",
    sector: "Usinagem Aeronáutica & Automóvel",
    contact: "Eng. Fernando Rocha",
    email: "f.rocha@mecanicanorte.pt",
    address: "Rua da Indústria, 140 - Maia, Portugal",
  },
  {
    id: newId("cli"),
    company: "Moldes & Injeção Ibérica S.A.",
    nif: "502 987 650",
    sector: "Fabrico de Moldes Plásticos",
    contact: "Dra. Maria João Alves",
    email: "mjalves@moldesiberica.com",
    address: "Zona Industrial Leste, Lote 12 - Marinha Grande",
  },
  {
    id: newId("cli"),
    company: "Precision Aero Components",
    nif: "508 112 230",
    sector: "Aeroespacial & Defesa",
    contact: "Eng. Carlos Ramos",
    email: "c.ramos@precisionaero.pt",
    address: "Parque Tecnológico Évora, Edifício B",
  },
];

const seedCatalog = (): CatalogItem[] => [
  {
    id: newId("cat"),
    sku: "CNC-VMC-850X",
    name: "Centro de Usinagem Vertical CNC VMC-850X",
    category: "Máquina",
    description:
      "Centro de maquinação vertical de alta precisão com fuso direct-drive de 12.000 RPM, guiamentos lineares de rolos e trocador automático de 24 ferramentas.",
    basePrice: 82500,
    vat: 23,
    specs: [
      spec("Curso X / Y / Z", "850 x 510 x 510 mm"),
      spec("Rotação Spindle", "12.000 RPM Direct-Drive"),
      spec("Potência Fuso", "15 kW / 11 kW"),
      spec("Comando CNC", 'Fanuc Oi-MF Plus 10.4"'),
      spec("Capacidade ATC", "24 Ferramentas Arm-Type"),
    ],
  },
  {
    id: newId("cat"),
    sku: "CNC-LTH-200",
    name: "Torno CNC de Alta Precisão LTH-200 com Ferramentas Ativas",
    category: "Máquina",
    description:
      "Torno CNC de barramento inclinado de 45° equipado com torre VDI-30 e eixo C de alta resolução para torneamento e fresagem combinados.",
    basePrice: 74000,
    vat: 23,
    specs: [
      spec("Diâmetro Max Torneável", "320 mm"),
      spec("Passagem de Barra", '65 mm (Chuck 8")'),
      spec("Velocidade Fuso", "4.500 RPM"),
      spec("Torre Ferramentas", "12 Posições BMT45"),
      spec("Comando CNC", "Siemens Sinumerik 828D"),
    ],
  },
  {
    id: newId("cat"),
    sku: "FIX-HYD-40KN",
    name: "Morsa de Fixação Hidráulica Alta Pressão 40 kN",
    category: "Acessório",
    description:
      "Morsa de elevada rigidez para centro CNC com repetição inferior a 0.002 mm e sistema pneumático-hidráulico de aperto.",
    basePrice: 2650,
    vat: 23,
    specs: [
      spec("Largura Mordente", "150 mm"),
      spec("Abertura Max", "300 mm"),
      spec("Força Aperto", "40 kN max"),
    ],
  },
];

const seedProposal = (): Proposal => ({
  id: newId("p"),
  ref: "TS-2026-089",
  date: "2026-10-05",
  validityDays: 30,
  badge: "PROPOSTA COMERCIAL",
  subject: "Fornecimento de Centro de Usinagem CNC VMC-850X com Refrigeração Interna",
  status: "Enviada",
  context:
    "O cliente pretende reforçar a capacidade de maquinação vertical de alta precisão, com refrigeração interna pelo fuso para operações em cavidades profundas.",
  solution:
    "Fornecimento, entrega, instalação e arranque de um centro de maquinação vertical VMC-850X com refrigeração interna a 20 bar, incluindo formação operacional de programação CNC.",
  nextSteps: defaultNextSteps(),
  client: {
    company: "Mecânica de Precisão do Norte, Lda",
    nif: "501 234 560",
    contact: "Eng. Fernando Rocha",
    email: "f.rocha@mecanicanorte.pt",
    address: "Rua da Indústria, 140 - Maia, Portugal",
  },
  machine: {
    name: "Centro de Usinagem Vertical CNC VMC-850X",
    desc: "Centro de maquinação vertical de alta precisão com fuso direct-drive de 12.000 RPM, guiamentos lineares de rolos e trocador automático de 24 ferramentas.",
    specs: [
      spec("Curso X / Y / Z", "850 x 510 x 510 mm"),
      spec("Rotação Spindle", "12.000 RPM Direct-Drive"),
      spec("Potência Fuso", "15 kW / 11 kW"),
      spec("Comando CNC", 'Fanuc Oi-MF Plus 10.4"'),
      spec("Capacidade ATC", "24 Ferramentas Arm-Type"),
      spec("Refrigeração Fuso", "Interna pelo Centro (20 Bar)"),
    ],
  },
  items: [
    {
      id: newId("it"),
      desc: "Centro CNC VMC-850X Standard Config + Spindle 12k",
      qty: 1,
      unitPrice: 82500,
      discount: 5,
      vat: 23,
    },
    {
      id: newId("it"),
      desc: "Sistema de Refrigeração Centro do Fuso (CTS 20 Bar)",
      qty: 1,
      unitPrice: 4200,
      discount: 0,
      vat: 23,
    },
  ],
  services: [
    { id: newId("sv"), label: "Transporte DDP Instalações do Cliente", amount: 1200, vat: 23 },
    { id: newId("sv"), label: "Nivelamento, Instalação & Arranque", amount: 1500, vat: 23 },
    { id: newId("sv"), label: "Formação Operacional de Programação CNC", amount: 800, vat: 23 },
  ],
  conditions: {
    payment: "30% Sinal, 70% Contra Entrega DDP",
    delivery: "15 Dias Após Encomenda",
    warranty: "24 Meses Peças & Mão de Obra",
    location: "DDP Maia / Instalações Cliente",
  },
  commercialRep: defaultRep(),
  notes: "",
});

export function seedData(): StudioData {
  const proposal = seedProposal();
  return {
    version: 4,
    clients: seedClients(),
    catalog: seedCatalog(),
    proposals: [structuredClone(proposal)],
    activeProposal: proposal,
    issuer: defaultIssuer(),
  };
}

// ---------- normalização (dados guardados ou importados) ----------

type Loose = Record<string, unknown>;

const isObj = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : v == null ? fallback : String(v);
const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

function normSpec(v: unknown): Spec {
  const o = isObj(v) ? v : {};
  return { id: str(o.id) || newId("sp"), name: str(o.name), value: str(o.value ?? o.val) };
}

function normItem(v: unknown): LineItem {
  const o = isObj(v) ? v : {};
  return {
    id: str(o.id) || newId("it"),
    desc: str(o.desc),
    qty: Math.max(num(o.qty, 1), 0),
    unitPrice: Math.max(num(o.unitPrice), 0),
    discount: clamp(num(o.discount), 0, 100),
    vat: clamp(num(o.vat, DEFAULT_VAT), 0, 100),
  };
}

function normService(v: unknown): Service {
  const o = isObj(v) ? v : {};
  return {
    id: str(o.id) || newId("sv"),
    label: str(o.label),
    amount: Math.max(num(o.amount), 0),
    vat: clamp(num(o.vat, DEFAULT_VAT), 0, 100),
  };
}

function normClientRef(v: unknown): ClientRef {
  const o = isObj(v) ? v : {};
  return {
    company: str(o.company),
    nif: str(o.nif),
    contact: str(o.contact),
    email: str(o.email),
    address: str(o.address),
  };
}

function normClient(v: unknown): Client {
  const o = isObj(v) ? v : {};
  return { ...normClientRef(o), id: str(o.id) || newId("cli"), sector: str(o.sector) };
}

function normCatalogItem(v: unknown): CatalogItem {
  const o = isObj(v) ? v : {};
  const category = (CATALOG_CATEGORIES as readonly unknown[]).includes(o.category)
    ? (o.category as CatalogCategory)
    : "Máquina";
  return {
    id: str(o.id) || newId("cat"),
    sku: str(o.sku),
    name: str(o.name),
    category,
    description: str(o.description),
    image: str(o.image),
    basePrice: Math.max(num(o.basePrice), 0),
    vat: clamp(num(o.vat, DEFAULT_VAT), 0, 100),
    specs: (Array.isArray(o.specs) ? o.specs : []).map(normSpec),
  };
}

function normIssuer(v: unknown): Issuer {
  const d = defaultIssuer();
  const o = isObj(v) ? v : {};
  return {
    tradeName: str(o.tradeName, d.tradeName),
    tagline: str(o.tagline, d.tagline),
    holder: str(o.holder, d.holder),
    nif: str(o.nif, d.nif),
    address: str(o.address, d.address),
    phone: str(o.phone, d.phone),
    email: str(o.email, d.email),
    website: str(o.website, d.website),
  };
}

export function normalizeProposal(v: unknown): Proposal {
  const o = isObj(v) ? v : {};
  const machine = isObj(o.machine) ? o.machine : {};
  const cond = isObj(o.conditions) ? o.conditions : {};
  const rep = isObj(o.commercialRep) ? o.commercialRep : {};
  const dc = defaultConditions();
  const dr = defaultRep();
  // formato v3: a referência estava em "id"
  const legacy = typeof o.ref !== "string";
  const id = legacy ? newId("p") : str(o.id) || newId("p");
  const ref = str(legacy ? o.id : o.ref);

  let services: Service[];
  if (Array.isArray(o.services)) services = o.services.map(normService);
  else if (isObj(o.additionalCosts)) {
    const ac = o.additionalCosts;
    services = [
      { id: newId("sv"), label: "Transporte", amount: Math.max(num(ac.shipping), 0), vat: DEFAULT_VAT },
      { id: newId("sv"), label: "Instalação e arranque", amount: Math.max(num(ac.install), 0), vat: DEFAULT_VAT },
      { id: newId("sv"), label: "Formação operacional", amount: Math.max(num(ac.training), 0), vat: DEFAULT_VAT },
    ];
  } else services = defaultServices();

  const items = (Array.isArray(o.items) ? o.items : []).map(normItem);
  if (items.length === 0) items.push(blankItem());

  return {
    id,
    ref,
    date: /^\d{4}-\d{2}-\d{2}$/.test(str(o.date)) ? str(o.date) : new Date().toISOString().slice(0, 10),
    validityDays: Math.max(Math.round(num(o.validityDays, 30)), 1),
    badge: str(o.badge, "PROPOSTA COMERCIAL"),
    subject: str(o.subject),
    status: (PROPOSAL_STATUSES as readonly unknown[]).includes(o.status)
      ? (o.status as ProposalStatus)
      : "Rascunho",
    context: str(o.context),
    solution: str(o.solution),
    nextSteps: str(o.nextSteps),
    client: normClientRef(o.client),
    machine: {
      name: str(machine.name),
      desc: str(machine.desc),
      image: str(machine.image),
      specs: (Array.isArray(machine.specs) ? machine.specs : []).map(normSpec),
    },
    items,
    services,
    conditions: {
      payment: str(cond.payment, dc.payment),
      delivery: str(cond.delivery, dc.delivery),
      warranty: str(cond.warranty, dc.warranty),
      location: str(cond.location, dc.location),
    },
    commercialRep: {
      name: str(rep.name, dr.name),
      role: str(rep.role, dr.role),
      phone: str(rep.phone),
      email: str(rep.email),
    },
    notes: str(o.notes),
  };
}

export function normalizeData(v: unknown, { legacy = false } = {}): StudioData {
  const o = isObj(v) ? v : {};
  const seed = seedData();
  const clients = Array.isArray(o.clients) ? o.clients.map(normClient) : seed.clients;
  const catalog = Array.isArray(o.catalog) ? o.catalog.map(normCatalogItem) : seed.catalog;
  const proposals = Array.isArray(o.proposals) ? o.proposals.map(normalizeProposal) : seed.proposals;
  const active = o.activeProposal
    ? normalizeProposal(o.activeProposal)
    : (proposals[0] ?? seed.activeProposal);
  if (legacy) {
    // no v3 a proposta ativa liga-se ao histórico pela referência
    const match = proposals.find((p) => p.ref === active.ref);
    if (match) active.id = match.id;
  }
  return {
    version: 4,
    clients,
    catalog,
    proposals,
    activeProposal: active,
    issuer: normIssuer(o.issuer),
  };
}

// ---------- persistência ----------

export const STORAGE_KEY = "tosimplify_studio_v4";
const LEGACY_KEY = "tosimplify_app_data_v3";

export function loadData(): StudioData {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalizeData(JSON.parse(current));
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return normalizeData(JSON.parse(legacy), { legacy: true });
  } catch (err) {
    console.error("Falha ao carregar dados locais", err);
  }
  return seedData();
}

/** Devolve false quando o browser recusa gravar (quota, modo privado). */
export function saveData(data: StudioData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("Falha ao gravar dados locais", err);
    return false;
  }
}
