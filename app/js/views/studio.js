/* ToSimplify Studio — vista Studio: assistente em 5 passos (wireframe 1b),
   grelha de Valores tipo folha de cálculo (3d) e revisão com o A4 (2g) */
(function () {
  'use strict';
  const { esc, icon, toast, modal, pick, statusPill } = window.TS;
  const S = window.TS.store;
  const doc = window.TS.doc;
  const app = () => window.TS.app;

  const STEPS = [
    { n: 1, id: 'cliente', label: 'Cliente' },
    { n: 2, id: 'equipamento', label: 'Equipamento' },
    { n: 3, id: 'valores', label: 'Valores' },
    { n: 4, id: 'condicoes', label: 'Condições' },
    { n: 5, id: 'rever', label: 'Rever' }
  ];
  const THUMB_W = 268;

  let root = null;
  let step = 1;
  let lastStep = 1;
  let servicesOpen = true;
  let catFilter = 'Tudo';
  let liveFrame = 0;

  // ---------- caminhos de dados ----------
  // "@issuer.x" aponta para o emitente; o resto para a proposta ativa
  function target(path) {
    return path.startsWith('@') ? [S.data, path.slice(1)] : [S.active, path];
  }
  function getPath(path) {
    const [obj, p] = target(path);
    return p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }
  function setPath(path, value) {
    const [obj, p] = target(path);
    const keys = p.split('.');
    const last = keys.pop();
    keys.reduce((o, k) => o[k], obj)[last] = value;
  }
  function listOf(name) { return name === 'specs' ? S.active.machine.specs : S.active[name]; }
  function coerce(el) {
    const t = el.dataset.type;
    if (t === 'num') return Math.max(S.num(el.value), 0);
    if (t === 'pct') return Math.min(Math.max(S.num(el.value), 0), 100);
    if (t === 'int') return Math.max(Math.round(S.num(el.value, 1)), 1);
    return el.value;
  }

  // ---------- campos ----------
  function field(label, path, { type = 'text', textarea = false, rows = 3, full = false, hint = '', mode = '', placeholder = '' } = {}) {
    const v = getPath(path);
    const attrs = `class="${textarea ? 'textarea' : 'input'}" data-bind="${esc(path)}"${mode ? ` data-type="${mode}" inputmode="decimal"` : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}`;
    const control = textarea
      ? `<textarea ${attrs} rows="${rows}">${esc(v)}</textarea>`
      : `<input type="${type}" ${attrs} value="${esc(v)}">`;
    return `<label class="field${full ? ' field--full' : ''}"><span class="field__label">${esc(label)}</span>${control}${hint ? `<span class="field__hint">${esc(hint)}</span>` : ''}</label>`;
  }
  const vatOptions = (sel) => S.VAT_RATES.map((r) => `<option value="${r}"${r === sel ? ' selected' : ''}>${esc(S.vatLabel(r))}</option>`).join('');

  // ---------- cabeçalho do Studio e passos ----------
  function toolbar() {
    const p = S.active;
    const dirty = S.isDirty();
    return `<div class="studio-bar">
      <div class="studio-bar__id">
        <button type="button" class="btn btn--ghost btn--sm" data-act="to-board">${icon('back', 14)} Propostas</button>
        <strong class="mono">${esc(p.ref || 'Sem referência')}</strong>
        ${statusPill(p.status)}
        <span class="studio-bar__state ${dirty ? 'is-dirty' : ''}" data-live="state">${dirty ? 'Alterações por guardar' : `${icon('check', 12)} Guardado`}</span>
      </div>
      <div class="row">
        <button type="button" class="btn btn--secondary" data-act="save">${icon('save')} Guardar</button>
        <button type="button" class="btn btn--primary" data-act="print">${icon('printer')} Imprimir / PDF</button>
      </div>
    </div>`;
  }
  function stepper() {
    const issues = S.stepIssues(S.active);
    return `<ol class="stepper" aria-label="Passos da proposta">${STEPS.map((s, i) => {
      const issue = issues[s.id] || '';
      const cls = s.n === step ? 'is-current' : (s.n < 5 && !issue ? 'is-done' : '');
      return `${i ? '<li class="stepper__sep" aria-hidden="true"></li>' : ''}<li>
        <button type="button" class="stepper__btn ${cls}" data-step="${s.n}"${s.n === step ? ' aria-current="step"' : ''} title="${esc(issue)}">
          <span class="stepper__num">${s.n < 5 && !issue && s.n !== step ? icon('check', 12) : s.n}</span>${esc(s.label)}
          ${issue ? `<span class="stepper__flag" aria-label="${esc(issue)}"></span>` : ''}
        </button></li>`;
    }).join('')}</ol>`;
  }
  function stepNav() {
    return `<div class="wizard__nav">
      ${step > 1 ? `<button type="button" class="btn btn--secondary" data-step="${step - 1}">${icon('back', 14)} Voltar</button>` : '<span></span>'}
      <span class="wizard__count">Passo ${step} de 5</span>
      ${step < 5 ? `<button type="button" class="btn btn--dark" data-step="${step + 1}">Seguinte ${icon('chevron', 14)}</button>` : '<span></span>'}
    </div>`;
  }

  // ---------- passo 1: cliente ----------
  function clientRows(q) {
    const term = (q || '').trim().toLowerCase();
    const sel = S.active.client.company.trim().toLowerCase();
    const list = S.data.clients.filter((c) => !term || `${c.company} ${c.nif} ${c.contact} ${c.sector}`.toLowerCase().includes(term));
    if (!list.length) return `<p class="muted pick-empty">${S.data.clients.length ? 'Sem resultados.' : 'Ainda não há clientes. Preencha os dados abaixo e guarde-o na base.'}</p>`;
    return list.map((c) => {
      const on = c.company.trim().toLowerCase() === sel;
      return `<button type="button" class="pick-row${on ? ' is-selected' : ''}" data-client="${esc(c.id)}" aria-pressed="${on}">
        <span class="avatar">${esc((c.company.trim()[0] || '?').toUpperCase())}</span>
        <span class="pick-row__text"><strong>${esc(c.company)}</strong><small>${esc([c.contact, c.sector].filter(Boolean).join(' · '))}</small></span>
        ${on ? `<span class="pick-row__check">${icon('check')}</span>` : ''}
      </button>`;
    }).join('');
  }
  function stepCliente() {
    const p = S.active;
    const known = S.data.clients.some((c) => c.company.trim().toLowerCase() === p.client.company.trim().toLowerCase());
    return `<h2 class="wizard__q">Para que cliente é a proposta?</h2>
      <div class="search">${icon('search')}<input type="search" class="input" placeholder="Procurar cliente, NIF, contacto…" data-search="clients" aria-label="Procurar cliente"></div>
      <div class="pick-rows" data-rows="clients">${clientRows('')}</div>
      <div class="section-block">
        <div class="section-head"><span class="section-title">Cliente nesta proposta</span>
          ${!known && p.client.company.trim() ? `<button type="button" class="btn btn--secondary btn--sm" data-act="save-client">${icon('userPlus', 14)} Guardar na base de clientes</button>` : ''}</div>
        <div class="grid-2">
          ${field('Empresa', 'client.company')}${field('NIF', 'client.nif')}
          ${field('Contacto', 'client.contact')}${field('Email', 'client.email', { type: 'email' })}
          ${field('Morada', 'client.address', { full: true })}
        </div>
      </div>
      <div class="section-block">
        <div class="section-head"><span class="section-title">Dados da proposta</span></div>
        <div class="grid-3">
          ${field('Referência', 'ref')}
          ${field('Data', 'date', { type: 'date' })}
          ${field('Validade (dias)', 'validityDays', { mode: 'int' })}
          ${field('Assunto', 'subject', { full: true })}
        </div>
      </div>`;
  }

  // ---------- passo 2: equipamento ----------
  function catalogRows(q) {
    const term = (q || '').trim().toLowerCase();
    const machine = S.active.machine.name.trim();
    const list = S.data.catalog.filter((c) => (catFilter === 'Tudo' || c.category === catFilter)
      && (!term || `${c.sku} ${c.name} ${c.description}`.toLowerCase().includes(term)));
    if (!list.length) return `<p class="muted pick-empty">${S.data.catalog.length ? 'Sem resultados.' : 'O catálogo está vazio. Adicione itens na vista Catálogo.'}</p>`;
    return list.map((c) => {
      const on = c.category === 'Máquina' && c.name.trim() === machine;
      const inLines = S.active.items.some((it) => it.desc.trim() === c.name.trim());
      return `<button type="button" class="pick-row${on ? ' is-selected' : ''}" data-cat="${esc(c.id)}">
        <span class="tile">${icon('box', 18)}</span>
        <span class="pick-row__text"><strong>${esc(c.name)}</strong><small><span class="mono">${esc(c.sku)}</span> · ${esc(c.category)} · ${esc(S.money(c.basePrice))}</small></span>
        ${on ? `<span class="pick-row__check">${icon('check')}</span>` : inLines ? '<span class="chip">Na proposta</span>' : `<span class="pick-row__add">${icon('plus', 14)}</span>`}
      </button>`;
    }).join('');
  }
  function specRows() {
    const specs = S.active.machine.specs;
    if (!specs.length) return '<p class="field__hint">Sem especificações. Escolha um equipamento do catálogo ou adicione parâmetros.</p>';
    return specs.map((s) => `<div class="spec-row" data-row="${esc(s.id)}">
      <input class="input" data-list="specs" data-id="${esc(s.id)}" data-key="name" value="${esc(s.name)}" placeholder="Parâmetro" aria-label="Parâmetro">
      <input class="input" data-list="specs" data-id="${esc(s.id)}" data-key="value" value="${esc(s.value)}" placeholder="Valor" aria-label="Valor">
      <button type="button" class="btn btn--ghost btn--icon btn--sm" data-del="specs" data-id="${esc(s.id)}" aria-label="Remover parâmetro">${icon('trash', 14)}</button>
    </div>`).join('');
  }
  function stepEquipamento() {
    return `<h2 class="wizard__q">Que equipamento vai propor?</h2>
      <div class="row row--center">
        <div class="search">${icon('search')}<input type="search" class="input" placeholder="Procurar no catálogo…" data-search="catalog" aria-label="Procurar no catálogo"></div>
        <div class="seg" role="group" aria-label="Categoria">${['Tudo', ...S.CATEGORIES].map((c) =>
          `<button type="button" class="seg__btn${catFilter === c ? ' is-active' : ''}" data-catfilter="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      </div>
      <div class="pick-rows" data-rows="catalog">${catalogRows('')}</div>
      <p class="field__hint">Uma máquina preenche a solução, a ficha técnica e uma linha em Valores. Um acessório só acrescenta uma linha em Valores.</p>
      <div class="section-block">
        <div class="section-head"><span class="section-title">Equipamento nesta proposta</span></div>
        ${field('Nome do equipamento', 'machine.name')}
        ${field('Descrição técnica', 'machine.desc', { textarea: true, rows: 2 })}
        ${window.TS.photoField({ label: 'Foto de destaque (topo do documento)', src: S.active.machine.photo, hint: 'Vem do catálogo ao escolher a máquina. Formato largo (3:1) fica melhor.', attrs: 'data-target="machine"' })}
        <div class="section-head"><span class="field__label">Especificações</span>
          <button type="button" class="btn btn--secondary btn--sm" data-add="specs">${icon('plus', 14)} Parâmetro</button></div>
        <div class="stack stack--tight" data-rows="specs">${specRows()}</div>
      </div>
      <div class="section-block">
        <div class="section-head"><span class="section-title">Texto da proposta</span></div>
        ${field('Contexto', 'context', { textarea: true, rows: 3, placeholder: 'Necessidade do cliente e enquadramento do projeto.' })}
        ${field('Solução', 'solution', { textarea: true, rows: 3, placeholder: 'O que propomos fornecer e porquê.' })}
      </div>`;
  }

  // ---------- passo 3: valores (3d) ----------
  function itemRow(it) {
    return `<div class="vgrid__row" data-row="${esc(it.id)}" data-kind="items">
      <span class="vgrid__grip" data-grip title="Arrastar para reordenar">${icon('grip', 14)}</span>
      <input class="cell" data-col="0" data-list="items" data-id="${esc(it.id)}" data-key="desc" value="${esc(it.desc)}" placeholder="Descrição" aria-label="Descrição">
      <input class="cell num" data-col="1" data-list="items" data-id="${esc(it.id)}" data-key="qty" data-type="num" inputmode="decimal" value="${esc(it.qty)}" aria-label="Quantidade">
      <input class="cell num" data-col="2" data-list="items" data-id="${esc(it.id)}" data-key="unitPrice" data-type="num" inputmode="decimal" value="${esc(it.unitPrice)}" aria-label="Preço unitário">
      <input class="cell num" data-col="3" data-list="items" data-id="${esc(it.id)}" data-key="discount" data-type="pct" inputmode="decimal" value="${esc(it.discount)}" aria-label="Desconto (%)">
      <select class="cell" data-col="4" data-list="items" data-id="${esc(it.id)}" data-key="vat" data-type="num" aria-label="IVA">${vatOptions(it.vat)}</select>
      <span class="vgrid__total mono" data-line-total="${esc(it.id)}">${esc(S.money(S.lineNet(it)))}</span>
      <button type="button" class="btn btn--ghost btn--icon btn--sm" data-del="items" data-id="${esc(it.id)}" aria-label="Remover linha">${icon('trash', 14)}</button>
    </div>`;
  }
  function serviceRow(s) {
    return `<div class="vgrid__row vgrid__row--svc${s.amount > 0 ? '' : ' is-hidden-pdf'}" data-row="${esc(s.id)}" data-kind="services">
      <span></span>
      <input class="cell" data-col="0" data-list="services" data-id="${esc(s.id)}" data-key="label" value="${esc(s.label)}" placeholder="Serviço" aria-label="Serviço">
      <span></span><span></span><span></span>
      <select class="cell" data-col="4" data-list="services" data-id="${esc(s.id)}" data-key="vat" data-type="num" aria-label="IVA">${vatOptions(s.vat)}</select>
      <input class="cell num" data-col="5" data-list="services" data-id="${esc(s.id)}" data-key="amount" data-type="num" inputmode="decimal" value="${esc(s.amount)}" aria-label="Valor">
      <button type="button" class="btn btn--ghost btn--icon btn--sm" data-del="services" data-id="${esc(s.id)}" aria-label="Remover serviço">${icon('trash', 14)}</button>
    </div>`;
  }
  function totalsBar() {
    const t = S.totals(S.active);
    return `<span>s/ IVA <strong class="mono">${esc(S.money(t.netTotal))}</strong></span>
      <span>IVA <strong class="mono">${esc(S.money(t.vatTotal))}</strong></span>
      ${t.discountTotal > 0 ? `<span class="hide-sm">Desc. <strong class="mono">${esc(S.money(t.discountTotal))}</strong></span>` : ''}
      <span class="totals-bar__grand">Total c/ IVA <strong class="mono">${esc(S.money(t.grandTotal))}</strong></span>`;
  }
  function hiddenServices() { return S.active.services.filter((s) => !(s.amount > 0)).length; }
  function stepValores() {
    const p = S.active;
    const hidden = hiddenServices();
    return `<div class="section-head">
        <h2 class="wizard__q">3 · Valores</h2>
        <div class="row">
          <button type="button" class="btn btn--secondary btn--sm" data-act="from-catalog">${icon('box', 14)} Do catálogo</button>
          <button type="button" class="btn btn--secondary btn--sm" data-add="items">${icon('plus', 14)} Linha</button>
        </div>
      </div>
      <div class="vgrid" role="table" aria-label="Itens e serviços">
        <div class="vgrid__row vgrid__head" role="row">
          <span></span><span>Item / descrição</span><span class="num">Qtd</span><span class="num">Preço unit.</span><span class="num">Desc. %</span><span>IVA</span><span class="num">Total líq.</span><span></span>
        </div>
        <div data-rows="items">${p.items.map(itemRow).join('')}</div>
        <button type="button" class="vgrid__group" data-act="toggle-services" aria-expanded="${servicesOpen}">
          <span>Serviços complementares <span class="muted" data-live="hidden-svc">${hidden ? `(${hidden} a 0 € ocultos no PDF)` : ''}</span></span>
          <span class="vgrid__caret${servicesOpen ? ' is-open' : ''}">${icon('chevron', 14)}</span>
        </button>
        ${servicesOpen ? `<div data-rows="services">${p.services.map(serviceRow).join('')}</div>
          <button type="button" class="vgrid__add" data-add="services">${icon('plus', 14)} Serviço</button>` : ''}
      </div>
      <div class="totals-bar" data-live="totals-bar">${totalsBar()}</div>
      <p class="field__hint">Enter desce para a linha seguinte, como no Excel; Tab avança para a célula seguinte. Enter na última linha cria uma linha nova.</p>
      ${field('Observações (aparecem junto aos totais)', 'notes', { textarea: true, rows: 2 })}`;
  }

  // ---------- passo 4: condições ----------
  function stepCondicoes() {
    return `<h2 class="wizard__q">Em que condições?</h2>
      <div class="grid-2">
        ${field('Condições de pagamento', 'conditions.payment')}
        ${field('Prazo de entrega', 'conditions.delivery')}
        ${field('Garantia', 'conditions.warranty')}
        ${field('Incoterm / local de entrega', 'conditions.location')}
      </div>
      ${field('Próximos passos (um por linha)', 'nextSteps', { textarea: true, rows: 5 })}
      <div class="section-block">
        <div class="section-head"><span class="section-title">Consultor comercial</span></div>
        <div class="grid-2">
          ${field('Nome', 'commercialRep.name')}${field('Função', 'commercialRep.role')}
          ${field('Telefone', 'commercialRep.phone', { type: 'tel' })}${field('Email', 'commercialRep.email', { type: 'email' })}
        </div>
      </div>
      <details class="details section-block">
        <summary class="section-title">Dados do emitente (todas as propostas)</summary>
        <div class="details__body grid-2">
          ${field('Nome comercial', '@issuer.tradeName')}${field('Slogan', '@issuer.tagline')}
          ${field('Titular', '@issuer.holder')}${field('NIF', '@issuer.nif')}
          ${field('Morada', '@issuer.address', { full: true })}
          ${field('Telefone', '@issuer.phone', { type: 'tel' })}${field('Email', '@issuer.email', { type: 'email' })}
          ${field('Website', '@issuer.website', { full: true })}
        </div>
      </details>`;
  }

  // ---------- passo 5: rever ----------
  function stepRever() {
    const p = S.active;
    const issues = S.stepIssues(p);
    const checks = STEPS.slice(0, 4).map((s) => {
      const issue = issues[s.id];
      return `<li class="check ${issue ? 'is-warn' : 'is-ok'}">${icon(issue ? 'alert' : 'check', 14)}
        <span>${esc(s.label)}${issue ? ` — ${esc(issue)}` : ''}</span>
        ${issue ? `<button type="button" class="btn btn--ghost btn--sm" data-step="${s.n}">Corrigir</button>` : ''}</li>`;
    }).join('');
    const t = S.totals(p);
    return `<div class="review">
      <div class="review__head">
        <div><h2 class="wizard__q">Rever e enviar</h2>
          <p class="muted">${esc(p.client.company || 'Sem cliente')} · <strong class="mono">${esc(S.money(t.grandTotal))}</strong> c/ IVA</p></div>
        <div class="row">
          <button type="button" class="btn btn--secondary" data-act="save">${icon('save')} Guardar rascunho</button>
          <button type="button" class="btn btn--secondary" data-act="print">${icon('printer')} Imprimir / PDF</button>
          ${p.status === 'Rascunho' ? `<button type="button" class="btn btn--dark" data-act="mark-sent">${icon('send', 14)} Marcar enviada</button>` : ''}
        </div>
      </div>
      <ul class="checklist">${checks}</ul>
      <div class="doc-wrap" data-live="doc"><div class="doc-zoom">${doc.render(p, S.data.issuer)}</div></div>
    </div>`;
  }

  // ---------- pré-visualização lateral ----------
  function aside() {
    const t = S.totals(S.active);
    return `<aside class="wizard__aside" aria-label="Pré-visualização">
      <button type="button" class="preview" data-act="expand" aria-label="Expandir pré-visualização">
        <span class="preview__label">Pré-visualização ${icon('expand', 13)}</span>
        <span data-live="thumb">${doc.thumb(S.active, S.data.issuer, THUMB_W)}</span>
      </button>
      <div class="mini-totals" data-live="mini-totals">${miniTotals(t)}</div>
    </aside>`;
  }
  function miniTotals(t) {
    return `<div><span>Total s/ IVA</span><strong>${esc(S.money(t.netTotal))}</strong></div>
      <div><span>IVA</span><strong>${esc(S.money(t.vatTotal))}</strong></div>
      <div class="mini-totals__grand"><span>Total c/ IVA</span><strong>${esc(S.money(t.grandTotal))}</strong></div>`;
  }

  // ---------- desenho ----------
  const BODIES = { 1: stepCliente, 2: stepEquipamento, 3: stepValores, 4: stepCondicoes, 5: stepRever };
  function render() {
    const scrollY = window.scrollY;
    root.innerHTML = `<div class="view studio">
      ${toolbar()}
      ${stepper()}
      <div class="wizard${step === 5 ? ' wizard--review' : step === 3 ? ' wizard--valores' : ''}">
        <section class="wizard__main card" data-step-body="${step}">
          ${BODIES[step]()}
          ${stepNav()}
        </section>
        ${step === 5 ? '' : aside()}
      </div>
    </div>`;
    window.scrollTo(0, scrollY);
    fitDoc();
  }
  // Escala o A4 ao espaço disponível no passo Rever
  function fitDoc() {
    const wrap = root.querySelector('.doc-wrap');
    if (!wrap) return;
    const zoom = Math.min(1, wrap.clientWidth / 794);
    wrap.querySelector('.doc-zoom').style.zoom = zoom;
  }

  // Atualização leve durante a escrita (sem redesenhar formulários)
  function live() {
    cancelAnimationFrame(liveFrame);
    liveFrame = requestAnimationFrame(() => {
      if (!root) return;
      const p = S.active;
      const t = S.totals(p);
      const q = (sel) => root.querySelector(`[data-live="${sel}"]`);
      const dirty = S.isDirty();
      const state = q('state');
      if (state) { state.className = `studio-bar__state ${dirty ? 'is-dirty' : ''}`; state.innerHTML = dirty ? 'Alterações por guardar' : `${icon('check', 12)} Guardado`; }
      const st = root.querySelector('.stepper');
      if (st) st.outerHTML = stepper();
      if (q('thumb')) q('thumb').innerHTML = doc.thumb(p, S.data.issuer, THUMB_W);
      if (q('mini-totals')) q('mini-totals').innerHTML = miniTotals(t);
      if (q('totals-bar')) q('totals-bar').innerHTML = totalsBar();
      if (q('hidden-svc')) { const h = hiddenServices(); q('hidden-svc').textContent = h ? `(${h} a 0 € ocultos no PDF)` : ''; }
      root.querySelectorAll('[data-line-total]').forEach((el) => {
        const it = p.items.find((x) => x.id === el.dataset.lineTotal);
        if (it) el.textContent = S.money(S.lineNet(it));
      });
      root.querySelectorAll('.vgrid__row--svc').forEach((row) => {
        const s = p.services.find((x) => x.id === row.dataset.row);
        if (s) row.classList.toggle('is-hidden-pdf', !(s.amount > 0));
      });
      if (q('doc')) { q('doc').querySelector('.doc-zoom').innerHTML = doc.render(p, S.data.issuer); }
    });
  }

  function goStep(n) {
    app().go(`studio/${Math.min(Math.max(n, 1), 5)}`);
  }

  // ---------- ações ----------
  function save() {
    const { created, duplicateRef } = S.saveActive();
    toast(created ? `Proposta ${S.active.ref} guardada no histórico.` : `Proposta ${S.active.ref} atualizada.`, 'success');
    if (duplicateRef) toast(`Atenção: já existe outra proposta com a referência ${S.active.ref}.`, 'error');
  }
  function focusRowCell(kind, id, col = 0) {
    const row = root.querySelector(`[data-rows="${kind}"] [data-row="${CSS.escape(id)}"]`);
    if (!row) return;
    const el = row.querySelector(`[data-col="${col}"]`) || row.querySelector('input');
    if (el) { el.focus(); if (el.select) el.select(); }
  }
  function addRow(kind) {
    const list = listOf(kind);
    const row = kind === 'items' ? S.newItem() : kind === 'services' ? S.newService() : S.newSpec();
    list.push(row);
    if (kind === 'services') servicesOpen = true;
    S.changed();
    focusRowCell(kind, row.id);
  }
  function pickCatalog() {
    pick({
      title: 'Inserir do catálogo', iconName: 'box', emptyText: 'O catálogo está vazio. Adicione itens na vista Catálogo.',
      items: S.data.catalog.map((c) => ({ id: c.id, title: c.name, subtitle: `${c.sku} · ${c.category} · ${S.money(c.basePrice)}` })),
      onPick: applyCatalog
    });
  }
  function applyCatalog(id) {
    const c = S.applyCatalogItem(id);
    if (c) toast(c.category === 'Máquina' ? `${c.name}: solução, ficha técnica e linha de valores preenchidas.` : `${c.name} acrescentado aos valores.`, 'success');
  }
  function openPreview() {
    const m = modal({
      title: `Pré-visualização · ${S.active.ref}`, iconName: 'file', xwide: true,
      body: `<div class="doc-wrap doc-wrap--modal"><div class="doc-zoom">${doc.render(S.active, S.data.issuer)}</div></div>`,
      footer: `<button type="button" class="btn btn--secondary" data-close>Fechar</button>
        <button type="button" class="btn btn--primary" data-print>${icon('printer')} Imprimir / PDF</button>`
    });
    const wrap = m.el.querySelector('.doc-wrap');
    wrap.querySelector('.doc-zoom').style.zoom = Math.min(1, (wrap.clientWidth - 2) / 794);
    m.el.querySelector('[data-print]').addEventListener('click', () => { m.close(); app().printProposal(S.active); });
  }

  async function onClick(e) {
    const el = e.target.closest('button, [data-step]');
    if (!el || !root.contains(el)) return;
    const d = el.dataset;
    if (d.step) { goStep(Number(d.step)); return; }
    if (d.client) {
      const name = S.applyClient(d.client);
      if (name) toast(`${name} aplicado à proposta.`, 'success');
      return;
    }
    if (d.cat) { applyCatalog(d.cat); return; }
    if (d.catfilter) {
      catFilter = d.catfilter;
      root.querySelectorAll('[data-catfilter]').forEach((b) => b.classList.toggle('is-active', b.dataset.catfilter === catFilter));
      const s = root.querySelector('[data-search="catalog"]');
      root.querySelector('[data-rows="catalog"]').innerHTML = catalogRows(s ? s.value : '');
      return;
    }
    if (d.add) { addRow(d.add); return; }
    if (d.del) {
      const list = listOf(d.del);
      if (d.del === 'items' && list.length === 1) { toast('A proposta precisa de pelo menos uma linha.', 'error'); return; }
      const idx = list.findIndex((x) => x.id === d.id);
      if (idx >= 0) list.splice(idx, 1);
      S.changed();
      return;
    }
    if ('photoRemove' in d) { S.active.machine.photo = ''; S.changed(); return; }
    switch (d.act) {
      case 'to-board': app().go('propostas'); break;
      case 'save': save(); break;
      case 'print': app().printProposal(S.active); break;
      case 'expand': openPreview(); break;
      case 'from-catalog': pickCatalog(); break;
      case 'toggle-services': servicesOpen = !servicesOpen; render(); break;
      case 'save-client': {
        const c = S.saveClient({ ...S.active.client, sector: '' });
        toast(`${c.company} guardado na base de clientes.`, 'success');
        break;
      }
      case 'mark-sent': {
        S.setStatus(S.active.id, 'Enviada');
        S.saveActive();
        toast(`Proposta ${S.active.ref} marcada como enviada.`, 'success');
        app().go('propostas');
        break;
      }
      default: break;
    }
  }

  function onInput(e) {
    const el = e.target;
    if (el.type === 'file') {
      if (e.type === 'change' && 'photo' in el.dataset) {
        window.TS.readImage(el.files[0])
          .then((src) => { S.active.machine.photo = src; S.changed(); toast('Foto de destaque atualizada.', 'success'); })
          .catch((err) => toast(err.message, 'error'));
      }
      return;
    }
    if (el.dataset.search) {
      const rows = root.querySelector(`[data-rows="${el.dataset.search}"]`);
      rows.innerHTML = el.dataset.search === 'clients' ? clientRows(el.value) : catalogRows(el.value);
      return;
    }
    if (el.dataset.bind) {
      setPath(el.dataset.bind, coerce(el));
      S.changed('live');
      return;
    }
    if (el.dataset.list) {
      const row = listOf(el.dataset.list).find((x) => x.id === el.dataset.id);
      if (!row) return;
      row[el.dataset.key] = coerce(el);
      S.changed('live');
    }
  }
  // Ao sair de um campo do cliente, a lista de seleção reflete o cliente escolhido
  function onFocusOut(e) {
    const el = e.target;
    if (el.dataset && el.dataset.bind === 'client.company') {
      const rows = root.querySelector('[data-rows="clients"]');
      const s = root.querySelector('[data-search="clients"]');
      if (rows) rows.innerHTML = clientRows(s ? s.value : '');
    }
  }

  // Enter/Shift+Enter movem na vertical como no Excel
  function onKeyDown(e) {
    const el = e.target;
    if (e.key !== 'Enter' || !el.classList.contains('cell') || el.tagName === 'SELECT') return;
    e.preventDefault();
    const group = el.closest('[data-rows]');
    const rows = [...group.querySelectorAll('.vgrid__row')];
    const rowEl = el.closest('.vgrid__row');
    const idx = rows.indexOf(rowEl) + (e.shiftKey ? -1 : 1);
    const col = el.dataset.col;
    if (idx >= rows.length) {
      const kind = group.dataset.rows;
      addRow(kind);
      focusRowCell(kind, listOf(kind).slice(-1)[0].id, col);
      return;
    }
    if (idx < 0) return;
    const next = rows[idx].querySelector(`[data-col="${col}"]`);
    if (next) { next.focus(); if (next.select) next.select(); }
  }

  // Reordenar linhas de valores por arrasto da pega
  let dragId = null;
  function onPointerDown(e) {
    const grip = e.target.closest('[data-grip]');
    if (grip) grip.closest('.vgrid__row').draggable = true;
  }
  function onDragStart(e) {
    const row = e.target.closest && e.target.closest('.vgrid__row[draggable="true"]');
    if (!row) return;
    dragId = row.dataset.row;
    row.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  }
  function onDragOver(e) {
    if (!dragId) return;
    const row = e.target.closest('[data-rows="items"] .vgrid__row');
    if (!row) return;
    e.preventDefault();
    root.querySelectorAll('.is-drop-before, .is-drop-after').forEach((r) => r.classList.remove('is-drop-before', 'is-drop-after'));
    const r = row.getBoundingClientRect();
    row.classList.add(e.clientY < r.top + r.height / 2 ? 'is-drop-before' : 'is-drop-after');
  }
  function onDrop(e) {
    if (!dragId) return;
    const row = e.target.closest('[data-rows="items"] .vgrid__row');
    if (!row) return;
    e.preventDefault();
    const items = S.active.items;
    const from = items.findIndex((x) => x.id === dragId);
    const [moved] = items.splice(from, 1);
    let to = items.findIndex((x) => x.id === row.dataset.row);
    if (to < 0) to = items.length; else if (row.classList.contains('is-drop-after')) to += 1;
    items.splice(to, 0, moved);
    dragId = null;
    S.changed();
  }
  function onDragEnd() {
    dragId = null;
    if (!root) return;
    root.querySelectorAll('.vgrid__row').forEach((r) => { r.draggable = false; r.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after'); });
  }

  const handlers = { click: onClick, input: onInput, change: onInput, keydown: onKeyDown, focusout: onFocusOut, pointerdown: onPointerDown, dragstart: onDragStart, dragover: onDragOver, drop: onDrop, dragend: onDragEnd };
  const onResize = () => fitDoc();

  window.TS.app.register('studio', {
    lastStep: () => lastStep,
    mount(el, params) {
      root = el;
      step = Math.min(Math.max(parseInt(params[0], 10) || lastStep, 1), 5);
      lastStep = step;
      Object.entries(handlers).forEach(([ev, fn]) => root.addEventListener(ev, fn));
      window.addEventListener('resize', onResize);
      render();
    },
    unmount() {
      Object.entries(handlers).forEach(([ev, fn]) => root.removeEventListener(ev, fn));
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(liveFrame);
      root = null;
    },
    onChange(kind) {
      if (!root) return;
      if (kind === 'live') live(); else render();
    },
    onLayout() { if (root) fitDoc(); }
  });
})();
