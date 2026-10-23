/* ToSimplify Studio — modelo de dados, cálculos e persistência local.
   Esquema v4, compatível com a versão anterior da app (mesma chave de localStorage). */
(function () {
  'use strict';

  const STORAGE_KEY = 'tosimplify_studio_v4';
  const LEGACY_KEY = 'tosimplify_app_data_v3';
  const STATUSES = ['Rascunho', 'Enviada', 'Aprovada', 'Recusada'];
  const CATEGORIES = ['Máquina', 'Acessório'];
  const VAT_RATES = [23, 13, 6, 0];
  const DEFAULT_VAT = 23;

  // ---------- utilitários ----------
  function uid(prefix = 'id') {
    const c = globalThis.crypto;
    const raw = c && typeof c.randomUUID === 'function'
      ? c.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    return `${prefix}-${raw.replace(/-/g, '').slice(0, 10)}`;
  }
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
  const str = (v, fallback = '') => (typeof v === 'string' ? v : v == null ? fallback : String(v));
  const num = (v, fallback = 0) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
  };
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  // Só aceita imagens embutidas (data URL), endereços http(s) ou ficheiros da própria app em assets/
  const photo = (v) => { const t = str(v); return /^(data:image\/|https?:\/\/|assets\/[\w./-]+\.(jpe?g|png|webp)$)/i.test(t) ? t : ''; };
  const pad2 = (n) => String(n).padStart(2, '0');

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || '');
  }
  function addDays(iso, days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
    const d = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return '';
    d.setUTCDate(d.getUTCDate() + Math.round(days));
    return d.toISOString().slice(0, 10);
  }
  // Diferença em dias inteiros entre duas datas ISO (b - a)
  function daysBetween(aIso, bIso) {
    const a = Date.parse(`${(aIso || '').slice(0, 10)}T00:00:00Z`);
    const b = Date.parse(`${(bIso || '').slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  const moneyFmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  const money = (v) => moneyFmt.format(Number.isFinite(v) ? v : 0);
  // Formato curto para somatórios de coluna (ex.: 264k €)
  function moneyShort(v) {
    if (!Number.isFinite(v) || v === 0) return '0 €';
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}M €`;
    if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3).toLocaleString('pt-PT')}k €`;
    return `${Math.round(v).toLocaleString('pt-PT')} €`;
  }
  const percent = (v) => `${Number(v).toLocaleString('pt-PT', { maximumFractionDigits: 2 })}%`;
  const vatLabel = (v) => (v === 0 ? 'Isento' : percent(v));

  // ---------- valores por omissão ----------
  const defaultIssuer = () => ({
    tradeName: 'ToSimplify', tagline: 'Soluções Industriais',
    holder: 'Cristina Isabel da Silva Rebelo', nif: '217673996',
    address: 'Avenida Vitor Gallo n99 4Esq | 2430-172 Marinha Grande',
    phone: '', email: '', website: ''
  });
  const defaultRep = () => ({ name: 'João Ricardo Chanoca', role: 'Consultor Comercial', phone: '', email: '' });
  const defaultConditions = () => ({ payment: '30% Sinal, 70% Entrega', delivery: '15 Dias', warranty: '24 Meses', location: 'DDP' });
  const defaultServices = () => [
    { id: uid('sv'), label: 'Transporte', amount: 0, vat: DEFAULT_VAT },
    { id: uid('sv'), label: 'Instalação e arranque', amount: 0, vat: DEFAULT_VAT },
    { id: uid('sv'), label: 'Formação operacional', amount: 0, vat: DEFAULT_VAT }
  ];
  const defaultNextSteps = () => [
    'Validação da proposta e esclarecimento de eventuais questões técnicas',
    'Confirmação por escrito (aceite desta proposta ou nota de encomenda)',
    'Pagamento inicial conforme condições comerciais e agendamento da entrega',
    'Entrega, instalação e arranque do equipamento'
  ].join('\n');
  const emptyClient = () => ({ company: '', nif: '', contact: '', email: '', address: '' });
  const spec = (name, value) => ({ id: uid('sp'), name, value });
  const blankItem = () => ({ id: uid('it'), desc: 'Equipamento principal', qty: 1, unitPrice: 0, discount: 0, vat: DEFAULT_VAT });

  const seedClients = () => [
    { id: uid('cli'), company: 'Mecânica de Precisão do Norte, Lda', nif: '501 234 560', sector: 'Usinagem Aeronáutica & Automóvel', contact: 'Eng. Fernando Rocha', email: 'f.rocha@mecanicanorte.pt', address: 'Rua da Indústria, 140 - Maia, Portugal' },
    { id: uid('cli'), company: 'Moldes & Injeção Ibérica S.A.', nif: '502 987 650', sector: 'Fabrico de Moldes Plásticos', contact: 'Dra. Maria João Alves', email: 'mjalves@moldesiberica.com', address: 'Zona Industrial Leste, Lote 12 - Marinha Grande' },
    { id: uid('cli'), company: 'Precision Aero Components', nif: '508 112 230', sector: 'Aeroespacial & Defesa', contact: 'Eng. Carlos Ramos', email: 'c.ramos@precisionaero.pt', address: 'Parque Tecnológico Évora, Edifício B' }
  ];
  const seedCatalog = () => [
    { id: uid('cat'), sku: 'CNC-VMC-850X', name: 'Centro de Usinagem Vertical CNC VMC-850X', category: 'Máquina', description: 'Centro de maquinação vertical de alta precisão com fuso direct-drive de 12.000 RPM, guiamentos lineares de rolos e trocador automático de 24 ferramentas.', basePrice: 82500, vat: 23, specs: [spec('Curso X / Y / Z', '850 x 510 x 510 mm'), spec('Rotação Spindle', '12.000 RPM Direct-Drive'), spec('Potência Fuso', '15 kW / 11 kW'), spec('Comando CNC', 'Fanuc Oi-MF Plus 10.4"'), spec('Capacidade ATC', '24 Ferramentas Arm-Type')] },
    { id: uid('cat'), sku: 'CNC-LTH-200', name: 'Torno CNC de Alta Precisão LTH-200 com Ferramentas Ativas', category: 'Máquina', description: 'Torno CNC de barramento inclinado de 45° equipado com torre VDI-30 e eixo C de alta resolução para torneamento e fresagem combinados.', basePrice: 74000, vat: 23, specs: [spec('Diâmetro Max Torneável', '320 mm'), spec('Passagem de Barra', '65 mm (Chuck 8")'), spec('Velocidade Fuso', '4.500 RPM'), spec('Torre Ferramentas', '12 Posições BMT45'), spec('Comando CNC', 'Siemens Sinumerik 828D')] },
    { id: uid('cat'), sku: 'FIX-HYD-40KN', name: 'Morsa de Fixação Hidráulica Alta Pressão 40 kN', category: 'Acessório', description: 'Morsa de elevada rigidez para centro CNC com repetição inferior a 0.002 mm e sistema pneumático-hidráulico de aperto.', basePrice: 2650, vat: 23, specs: [spec('Largura Mordente', '150 mm'), spec('Abertura Max', '300 mm'), spec('Força Aperto', '40 kN max')] },
    { id: uid('cat'), sku: 'EDM-ONA-QX4-2017-12463', name: 'Eletroerosão por Penetração ONA QX4 (2017)', category: 'Máquina', description: 'Eletroerosão por penetração CNC ONA QX4 de 2017, n.º série 12463, com eixo C, filtragem e limpeza automáticas e 20 elétrodos incluídos. Menos de 20.000 h de trabalho.', photo: 'assets/catalogo/ona-qx4-2017.jpg', basePrice: 55000, vat: 23, specs: [spec('Fabricante', 'ONA Electroerosión S.A. (Durango, Espanha)'), spec('Ano / N.º série', '2017 / 12463'), spec('Horas de trabalho', '< 20.000 h'), spec('Curso X / Y / Z', '600 / 400 / 400 mm'), spec('Eixo C', 'Sim'), spec('Elétrodos incluídos', '20 un.'), spec('Filtragem e limpeza', 'Automáticas'), spec('Alimentação', '400 V / 50 Hz · 25,8 A · 17,9 kVA'), spec('Poder de corte (Icc)', '25 kA'), spec('Ar comprimido', '6 bar mín.'), spec('Peso total', '4.530 kg (máq. 3.600 + gerador 350)')] }
  ];
  const seedProposal = () => ({
    id: uid('p'), ref: 'TS-2026-089', date: '2026-10-05', validityDays: 30, badge: 'PROPOSTA COMERCIAL',
    subject: 'Fornecimento de Centro de Usinagem CNC VMC-850X com Refrigeração Interna', status: 'Enviada', statusDate: '2026-10-05',
    context: 'O cliente pretende reforçar a capacidade de maquinação vertical de alta precisão, com refrigeração interna pelo fuso para operações em cavidades profundas.',
    solution: 'Fornecimento, entrega, instalação e arranque de um centro de maquinação vertical VMC-850X com refrigeração interna a 20 bar, incluindo formação operacional de programação CNC.',
    nextSteps: defaultNextSteps(),
    client: { company: 'Mecânica de Precisão do Norte, Lda', nif: '501 234 560', contact: 'Eng. Fernando Rocha', email: 'f.rocha@mecanicanorte.pt', address: 'Rua da Indústria, 140 - Maia, Portugal' },
    machine: {
      name: 'Centro de Usinagem Vertical CNC VMC-850X',
      desc: 'Centro de maquinação vertical de alta precisão com fuso direct-drive de 12.000 RPM, guiamentos lineares de rolos e trocador automático de 24 ferramentas.',
      specs: [spec('Curso X / Y / Z', '850 x 510 x 510 mm'), spec('Rotação Spindle', '12.000 RPM Direct-Drive'), spec('Potência Fuso', '15 kW / 11 kW'), spec('Comando CNC', 'Fanuc Oi-MF Plus 10.4"'), spec('Capacidade ATC', '24 Ferramentas Arm-Type'), spec('Refrigeração Fuso', 'Interna pelo Centro (20 Bar)')]
    },
    items: [
      { id: uid('it'), desc: 'Centro CNC VMC-850X Standard Config + Spindle 12k', qty: 1, unitPrice: 82500, discount: 5, vat: 23 },
      { id: uid('it'), desc: 'Sistema de Refrigeração Centro do Fuso (CTS 20 Bar)', qty: 1, unitPrice: 4200, discount: 0, vat: 23 }
    ],
    services: [
      { id: uid('sv'), label: 'Transporte DDP Instalações do Cliente', amount: 1200, vat: 23 },
      { id: uid('sv'), label: 'Nivelamento, Instalação & Arranque', amount: 1500, vat: 23 },
      { id: uid('sv'), label: 'Formação Operacional de Programação CNC', amount: 800, vat: 23 }
    ],
    conditions: { payment: '30% Sinal, 70% Contra Entrega DDP', delivery: '15 Dias Após Encomenda', warranty: '24 Meses Peças & Mão de Obra', location: 'DDP Maia / Instalações Cliente' },
    commercialRep: defaultRep(),
    notes: ''
  });

  // ---------- normalização (dados importados ou antigos) ----------
  const normSpec = (v) => { const t = isObj(v) ? v : {}; return { id: str(t.id) || uid('sp'), name: str(t.name), value: str(t.value ?? t.val) }; };
  const normItem = (v) => {
    const t = isObj(v) ? v : {};
    return { id: str(t.id) || uid('it'), desc: str(t.desc), qty: Math.max(num(t.qty, 1), 0), unitPrice: Math.max(num(t.unitPrice), 0), discount: clamp(num(t.discount), 0, 100), vat: clamp(num(t.vat, DEFAULT_VAT), 0, 100) };
  };
  const normService = (v) => {
    const t = isObj(v) ? v : {};
    return { id: str(t.id) || uid('sv'), label: str(t.label), amount: Math.max(num(t.amount), 0), vat: clamp(num(t.vat, DEFAULT_VAT), 0, 100) };
  };
  const normClientRef = (v) => { const t = isObj(v) ? v : {}; return { company: str(t.company), nif: str(t.nif), contact: str(t.contact), email: str(t.email), address: str(t.address) }; };
  const normClient = (v) => { const t = isObj(v) ? v : {}; return { ...normClientRef(t), id: str(t.id) || uid('cli'), sector: str(t.sector) }; };
  const normCatalog = (v) => {
    const t = isObj(v) ? v : {};
    return {
      id: str(t.id) || uid('cat'), sku: str(t.sku), name: str(t.name),
      category: CATEGORIES.includes(t.category) ? t.category : 'Máquina',
      description: str(t.description), photo: photo(t.photo), basePrice: Math.max(num(t.basePrice), 0),
      vat: clamp(num(t.vat, DEFAULT_VAT), 0, 100), specs: (Array.isArray(t.specs) ? t.specs : []).map(normSpec)
    };
  };
  const normIssuer = (v) => {
    const d = defaultIssuer(); const t = isObj(v) ? v : {};
    const out = {};
    Object.keys(d).forEach((k) => { out[k] = str(t[k], d[k]); });
    return out;
  };
  function normProposal(v) {
    const t = isObj(v) ? v : {};
    const machine = isObj(t.machine) ? t.machine : {};
    const cond = isObj(t.conditions) ? t.conditions : {};
    const rep = isObj(t.commercialRep) ? t.commercialRep : {};
    const dc = defaultConditions(); const dr = defaultRep();
    // Formato v3: o "id" era a referência
    const legacy = typeof t.ref !== 'string';
    let services;
    if (Array.isArray(t.services)) services = t.services.map(normService);
    else if (isObj(t.additionalCosts)) {
      const a = t.additionalCosts;
      services = [
        { id: uid('sv'), label: 'Transporte', amount: Math.max(num(a.shipping), 0), vat: DEFAULT_VAT },
        { id: uid('sv'), label: 'Instalação e arranque', amount: Math.max(num(a.install), 0), vat: DEFAULT_VAT },
        { id: uid('sv'), label: 'Formação operacional', amount: Math.max(num(a.training), 0), vat: DEFAULT_VAT }
      ];
    } else services = defaultServices();
    const items = (Array.isArray(t.items) ? t.items : []).map(normItem);
    if (!items.length) items.push(blankItem());
    const date = /^\d{4}-\d{2}-\d{2}$/.test(str(t.date)) ? str(t.date) : todayIso();
    return {
      id: legacy ? uid('p') : (str(t.id) || uid('p')),
      ref: str(legacy ? t.id : t.ref),
      date,
      validityDays: Math.max(Math.round(num(t.validityDays, 30)), 1),
      badge: str(t.badge, 'PROPOSTA COMERCIAL'),
      subject: str(t.subject),
      status: STATUSES.includes(t.status) ? t.status : 'Rascunho',
      statusDate: /^\d{4}-\d{2}-\d{2}$/.test(str(t.statusDate)) ? str(t.statusDate) : date,
      context: str(t.context), solution: str(t.solution), nextSteps: str(t.nextSteps),
      client: normClientRef(t.client),
      machine: { name: str(machine.name), desc: str(machine.desc), photo: photo(machine.photo), specs: (Array.isArray(machine.specs) ? machine.specs : []).map(normSpec) },
      items, services,
      conditions: { payment: str(cond.payment, dc.payment), delivery: str(cond.delivery, dc.delivery), warranty: str(cond.warranty, dc.warranty), location: str(cond.location, dc.location) },
      commercialRep: { name: str(rep.name, dr.name), role: str(rep.role, dr.role), phone: str(rep.phone), email: str(rep.email) },
      notes: str(t.notes)
    };
  }
  function seedData() {
    const p = seedProposal();
    return { version: 4, clients: seedClients(), catalog: seedCatalog(), proposals: [clone(p)], activeProposal: p, issuer: defaultIssuer() };
  }
  function normData(v, { legacy = false } = {}) {
    const t = isObj(v) ? v : {};
    const seed = seedData();
    const proposals = Array.isArray(t.proposals) ? t.proposals.map(normProposal) : seed.proposals;
    const active = t.activeProposal ? normProposal(t.activeProposal) : (proposals[0] ? clone(proposals[0]) : seed.activeProposal);
    if (legacy) {
      const match = proposals.find((p) => p.ref === active.ref);
      if (match) active.id = match.id;
    }
    return {
      version: 4,
      clients: Array.isArray(t.clients) ? t.clients.map(normClient) : seed.clients,
      catalog: Array.isArray(t.catalog) ? t.catalog.map(normCatalog) : seed.catalog,
      proposals, activeProposal: active, issuer: normIssuer(t.issuer)
    };
  }

  // ---------- cálculos ----------
  const lineGross = (it) => round2(Math.max(it.qty, 0) * Math.max(it.unitPrice, 0));
  const lineDiscount = (it) => round2(lineGross(it) * clamp(it.discount, 0, 100) / 100);
  const lineNet = (it) => round2(lineGross(it) - lineDiscount(it));

  function totals(p) {
    const byRate = new Map();
    const add = (rate, base) => byRate.set(rate, (byRate.get(rate) || 0) + base);
    let itemsNet = 0; let discountTotal = 0;
    p.items.forEach((it) => { const n = lineNet(it); itemsNet += n; discountTotal += lineDiscount(it); add(it.vat, n); });
    let servicesNet = 0;
    p.services.forEach((s) => { const a = round2(Math.max(s.amount, 0)); servicesNet += a; add(s.vat, a); });
    const vatRows = [...byRate.entries()].filter(([, b]) => b !== 0).sort((a, b) => b[0] - a[0])
      .map(([rate, base]) => ({ rate, base: round2(base), vat: round2(base * rate / 100) }));
    const netTotal = round2(itemsNet + servicesNet);
    const vatTotal = round2(vatRows.reduce((s, r) => s + r.vat, 0));
    return { itemsNet: round2(itemsNet), servicesNet: round2(servicesNet), discountTotal: round2(discountTotal), netTotal, vatRows, vatTotal, grandTotal: round2(netTotal + vatTotal) };
  }

  function nextRef(existing, date) {
    const year = /^\d{4}/.test(date || '') ? date.slice(0, 4) : todayIso().slice(0, 4);
    const re = new RegExp(`^TS-${year}-(\\d+)$`);
    let max = 0;
    existing.forEach(({ ref }) => { const m = re.exec(ref); if (m) max = Math.max(max, Number(m[1])); });
    return `TS-${year}-${String(max + 1).padStart(3, '0')}`;
  }

  // Avisos por passo do assistente (vazio = passo completo)
  function stepIssues(p) {
    return {
      cliente: !p.client.company.trim() ? 'Falta o cliente' : '',
      equipamento: !p.machine.name.trim() ? 'Falta o equipamento' : !p.machine.specs.length ? 'Sem especificações' : '',
      valores: p.items.some((x) => !x.unitPrice) ? 'Há itens sem preço' : '',
      condicoes: !p.conditions.payment.trim() || !p.conditions.delivery.trim() ? 'Faltam condições comerciais' : ''
    };
  }

  // ---------- estado e persistência ----------
  let data = load();
  let storageError = false;
  let saveTimer = 0;
  const listeners = new Set();

  function load() {
    try {
      const cur = localStorage.getItem(STORAGE_KEY);
      if (cur) return normData(JSON.parse(cur));
      const old = localStorage.getItem(LEGACY_KEY);
      if (old) return normData(JSON.parse(old), { legacy: true });
    } catch (e) { console.error('Falha ao carregar dados locais', e); }
    return seedData();
  }
  function persist() {
    window.clearTimeout(saveTimer);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); storageError = false; }
    catch (e) { console.error('Falha ao gravar dados locais', e); storageError = true; }
  }
  // kind: 'live' (edição de campo, sem redesenhar formulários) ou 'full'
  function changed(kind = 'full') {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persist, 250);
    listeners.forEach((fn) => fn(kind));
  }
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });

  const findProposal = (id) => data.proposals.find((p) => p.id === id);

  function isDirty() {
    const saved = findProposal(data.activeProposal.id);
    return !saved || JSON.stringify(saved) !== JSON.stringify(data.activeProposal);
  }

  function createProposal(client) {
    const date = todayIso();
    return {
      id: uid('p'), ref: nextRef(data.proposals, date), date, validityDays: 30, badge: 'PROPOSTA COMERCIAL',
      subject: 'Fornecimento de Equipamento Industrial', status: 'Rascunho', statusDate: date,
      context: '', solution: '', nextSteps: defaultNextSteps(),
      client: client ? normClientRef(client) : emptyClient(),
      machine: { name: '', desc: '', photo: '', specs: [] },
      items: [blankItem()], services: defaultServices(), conditions: defaultConditions(),
      commercialRep: clone(data.activeProposal ? data.activeProposal.commercialRep : defaultRep()), notes: ''
    };
  }

  const api = {
    STATUSES, CATEGORIES, VAT_RATES, DEFAULT_VAT,
    uid, clone, round2, num, todayIso, formatDate, addDays, daysBetween, money, moneyShort, percent, vatLabel,
    lineNet, totals, stepIssues,
    get data() { return data; },
    get active() { return data.activeProposal; },
    get storageError() { return storageError; },
    isDirty,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    changed,
    findProposal,

    // Guarda a proposta ativa no histórico
    saveActive() {
      const p = clone(data.activeProposal);
      const idx = data.proposals.findIndex((x) => x.id === p.id);
      const duplicateRef = data.proposals.some((x) => x.id !== p.id && x.ref.trim() === p.ref.trim());
      if (idx >= 0) data.proposals[idx] = p; else data.proposals.unshift(p);
      changed();
      return { created: idx < 0, duplicateRef };
    },
    newProposal(client) {
      data.activeProposal = createProposal(client);
      changed();
      return data.activeProposal;
    },
    openProposal(id) {
      const p = findProposal(id);
      if (!p) return false;
      data.activeProposal = clone(p);
      changed();
      return true;
    },
    duplicateProposal(id) {
      const src = findProposal(id);
      if (!src) return null;
      const date = todayIso();
      const copy = clone(src);
      Object.assign(copy, { id: uid('p'), ref: nextRef(data.proposals, date), date, status: 'Rascunho', statusDate: date });
      ['items', 'services'].forEach((k) => copy[k].forEach((x) => { x.id = uid(k === 'items' ? 'it' : 'sv'); }));
      copy.machine.specs.forEach((s) => { s.id = uid('sp'); });
      data.proposals.unshift(copy);
      changed();
      return copy;
    },
    deleteProposal(id) {
      data.proposals = data.proposals.filter((p) => p.id !== id);
      if (data.activeProposal.id === id) data.activeProposal = createProposal();
      changed();
    },
    setStatus(id, status) {
      if (!STATUSES.includes(status)) return;
      const date = todayIso();
      const p = findProposal(id);
      if (p) { p.status = status; p.statusDate = date; }
      if (data.activeProposal.id === id) { data.activeProposal.status = status; data.activeProposal.statusDate = date; }
      changed();
    },

    // Aplica um cliente da base à proposta ativa
    applyClient(clientId) {
      const c = data.clients.find((x) => x.id === clientId);
      if (!c) return null;
      data.activeProposal.client = normClientRef(c);
      changed();
      return c.company;
    },
    // Aplica um item do catálogo: máquinas preenchem a solução e a ficha técnica; acessórios só acrescentam linha
    applyCatalogItem(catId) {
      const c = data.catalog.find((x) => x.id === catId);
      if (!c) return null;
      const p = data.activeProposal;
      const line = { id: uid('it'), desc: c.name, qty: 1, unitPrice: c.basePrice, discount: 0, vat: c.vat };
      if (c.category === 'Máquina') {
        p.machine = { name: c.name, desc: c.description, photo: c.photo, specs: c.specs.map((s) => ({ ...s, id: uid('sp') })) };
        const placeholder = p.items.length === 1 && !p.items[0].unitPrice;
        if (placeholder) p.items = [line]; else p.items.push(line);
        if (!p.subject.trim() || p.subject === 'Fornecimento de Equipamento Industrial') p.subject = `Fornecimento de ${c.name}`;
      } else {
        p.items.push(line);
      }
      changed();
      return c;
    },

    // Clientes
    saveClient(client) {
      const c = normClient(client);
      const idx = data.clients.findIndex((x) => x.id === c.id);
      if (idx >= 0) data.clients[idx] = c; else data.clients.push(c);
      changed();
      return c;
    },
    deleteClient(id) { data.clients = data.clients.filter((c) => c.id !== id); changed(); },
    proposalsForClient(c) {
      const nif = (c.nif || '').replace(/\s/g, '');
      const name = (c.company || '').trim().toLowerCase();
      return data.proposals.filter((p) => {
        const pn = (p.client.nif || '').replace(/\s/g, '');
        return (nif && pn === nif) || (name && p.client.company.trim().toLowerCase() === name);
      });
    },

    // Catálogo
    newCatalogItem() {
      const c = normCatalog({ id: uid('cat'), name: 'Novo item', category: 'Máquina', vat: DEFAULT_VAT });
      data.catalog.unshift(c);
      changed();
      return c;
    },
    deleteCatalogItem(id) { data.catalog = data.catalog.filter((c) => c.id !== id); changed(); },

    // Cópia de segurança
    exportBackup() { persist(); return JSON.stringify(data, null, 2); },
    restoreBackup(text) {
      const parsed = JSON.parse(text);
      data = normData(parsed, { legacy: !('version' in (parsed || {})) });
      persist();
      changed();
    },
    // Junta um ficheiro aos dados atuais sem apagar nada; devolve o que foi acrescentado
    mergeBackup(text) {
      const src = JSON.parse(text);
      if (!isObj(src)) throw new Error('Formato inválido');
      const added = { clientes: 0, produtos: 0, propostas: 0 };
      const key = (v) => str(v).replace(/\s/g, '').toLowerCase();
      (Array.isArray(src.clients) ? src.clients : []).map(normClient).forEach((c) => {
        const dup = data.clients.some((x) => (key(c.nif) ? key(x.nif) === key(c.nif) : key(x.company) === key(c.company)));
        if (!dup && c.company.trim()) { data.clients.push(c); added.clientes += 1; }
      });
      (Array.isArray(src.catalog) ? src.catalog : []).map(normCatalog).forEach((c) => {
        const dup = data.catalog.some((x) => (key(c.sku) ? key(x.sku) === key(c.sku) : key(x.name) === key(c.name)));
        if (!dup && (c.sku.trim() || c.name.trim())) { data.catalog.push(c); added.produtos += 1; }
      });
      (Array.isArray(src.proposals) ? src.proposals : []).map(normProposal).forEach((p) => {
        if (data.proposals.some((x) => x.id === p.id)) return;
        if (!p.ref.trim() || data.proposals.some((x) => x.ref.trim() === p.ref.trim())) p.ref = nextRef(data.proposals, p.date);
        data.proposals.unshift(p);
        added.propostas += 1;
      });
      persist();
      changed();
      return added;
    },
    resetDemo() { data = seedData(); persist(); changed(); },
    newSpec: (name = '', value = '') => ({ id: uid('sp'), name, value }),
    newItem: () => ({ id: uid('it'), desc: '', qty: 1, unitPrice: 0, discount: 0, vat: DEFAULT_VAT }),
    newService: () => ({ id: uid('sv'), label: '', amount: 0, vat: DEFAULT_VAT })
  };

  window.TS = window.TS || {};
  window.TS.store = api;
})();
