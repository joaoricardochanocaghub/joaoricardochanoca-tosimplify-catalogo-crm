/* ToSimplify Studio — vista Clientes: lista + perfil com histórico de propostas (wireframe 1i) */
(function () {
  'use strict';
  const { esc, icon, toast, confirm, statusPill } = window.TS;
  const S = window.TS.store;
  const app = () => window.TS.app;

  let root = null;
  let selectedId = null;
  let editing = false;
  let draft = null;
  let query = '';

  const initial = (name) => (name.trim()[0] || '?').toUpperCase();

  function listHtml() {
    const term = query.trim().toLowerCase();
    const list = S.data.clients
      .filter((c) => !term || `${c.company} ${c.nif} ${c.contact} ${c.sector}`.toLowerCase().includes(term))
      .sort((a, b) => a.company.localeCompare(b.company, 'pt'));
    if (!list.length) return `<p class="muted pick-empty">${S.data.clients.length ? 'Sem resultados.' : 'Ainda não há clientes.'}</p>`;
    return list.map((c) => `<button type="button" class="pick-row${c.id === selectedId ? ' is-selected' : ''}" data-select="${esc(c.id)}"${c.id === selectedId ? ' aria-current="true"' : ''}>
      <span class="avatar">${esc(initial(c.company))}</span>
      <span class="pick-row__text"><strong>${esc(c.company || 'Sem nome')}</strong><small>${esc(c.sector || c.contact)}</small></span>
    </button>`).join('');
  }

  function input(label, key, { type = 'text', full = false } = {}) {
    return `<label class="field${full ? ' field--full' : ''}"><span class="field__label">${esc(label)}</span>
      <input type="${type}" class="input" data-key="${key}" value="${esc(draft[key])}"></label>`;
  }

  function profileHtml(c) {
    if (!c) return '<div class="empty">Selecione um cliente ou crie um novo.</div>';
    if (editing) {
      return `<form class="card stack" data-form>
        <div class="section-head"><h2 class="profile__name">${draft.id && S.data.clients.some((x) => x.id === draft.id) ? 'Editar cliente' : 'Novo cliente'}</h2></div>
        <div class="grid-2">
          ${input('Empresa', 'company', { full: true })}
          ${input('NIF', 'nif')}${input('Setor', 'sector')}
          ${input('Contacto', 'contact')}${input('Email', 'email', { type: 'email' })}
          ${input('Morada', 'address', { full: true })}
        </div>
        <div class="row row--between">
          ${S.data.clients.some((x) => x.id === draft.id) ? `<button type="button" class="btn btn--danger" data-act="delete">${icon('trash', 14)} Eliminar</button>` : '<span></span>'}
          <div class="row"><button type="button" class="btn btn--secondary" data-act="cancel">Cancelar</button>
            <button type="submit" class="btn btn--dark">${icon('save', 14)} Guardar cliente</button></div>
        </div>
      </form>`;
    }
    const props = S.proposalsForClient(c).sort((a, b) => b.date.localeCompare(a.date));
    const approved = props.filter((p) => p.status === 'Aprovada').reduce((s, p) => s + S.totals(p).grandTotal, 0);
    const open = props.filter((p) => ['Rascunho', 'Enviada'].includes(p.status)).reduce((s, p) => s + S.totals(p).grandTotal, 0);
    const meta = [c.nif && `NIF ${c.nif}`, c.address, c.contact].filter(Boolean).join(' · ');
    return `<div class="card stack profile">
      <div class="profile__head">
        <span class="avatar avatar--lg">${esc(initial(c.company))}</span>
        <div><h2 class="profile__name">${esc(c.company || 'Sem nome')}</h2>
          <p class="muted">${esc(meta || 'Sem dados de contacto')}</p>
          ${c.email ? `<a class="profile__mail" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}</div>
      </div>
      <div class="kpis kpis--3">
        <div class="kpi"><span class="kpi__label">Propostas</span><span class="kpi__value">${props.length}</span></div>
        <div class="kpi"><span class="kpi__label">Aprovado</span><span class="kpi__value">${esc(S.moneyShort(approved))}</span></div>
        <div class="kpi"><span class="kpi__label">Em aberto</span><span class="kpi__value">${esc(S.moneyShort(open))}</span></div>
      </div>
      <div class="section-block">
        <div class="section-head"><span class="section-title">Histórico</span></div>
        ${props.length ? `<ul class="history">${props.map((p) => `<li><button type="button" class="history__row" data-open="${esc(p.id)}">
          <span class="mono card__ref">${esc(p.ref)}</span>
          <span class="history__subject">${esc(p.subject || '—')}<small>${esc(S.formatDate(p.date))}</small></span>
          <strong class="mono">${esc(S.money(S.totals(p).grandTotal))}</strong>
          ${statusPill(p.status)}
        </button></li>`).join('')}</ul>` : '<p class="muted">Ainda não há propostas para este cliente.</p>'}
      </div>
      <div class="row row--between">
        <button type="button" class="btn btn--secondary" data-act="edit">${icon('edit', 14)} Editar</button>
        <button type="button" class="btn btn--primary" data-act="new-proposal">${icon('plus')} Nova proposta</button>
      </div>
    </div>`;
  }

  function render() {
    if (!root) return;
    if (selectedId && !S.data.clients.some((c) => c.id === selectedId) && !(editing && draft && draft.id === selectedId)) selectedId = null;
    if (!selectedId && !editing && S.data.clients.length && !app().isMobile) {
      selectedId = [...S.data.clients].sort((a, b) => a.company.localeCompare(b.company, 'pt'))[0].id;
    }
    const sel = editing ? draft : S.data.clients.find((c) => c.id === selectedId);
    const showDetail = app().isMobile && (sel || editing);
    root.innerHTML = `<div class="view">
      <div class="view__head"><div><span class="eyebrow">CRM</span><h1>Clientes <span class="count count--lg">${S.data.clients.length}</span></h1></div></div>
      <div class="master${showDetail ? ' master--detail' : ''}">
        <aside class="master__list">
          <div class="search">${icon('search')}<input type="search" class="input" placeholder="Empresa, NIF…" value="${esc(query)}" data-search aria-label="Procurar cliente"></div>
          <div class="pick-rows" data-rows>${listHtml()}</div>
          <button type="button" class="btn btn--secondary" data-act="new">${icon('userPlus', 14)} Novo cliente</button>
        </aside>
        <section class="master__detail">
          ${app().isMobile ? `<button type="button" class="btn btn--ghost btn--sm" data-act="back">${icon('back', 14)} Clientes</button>` : ''}
          ${profileHtml(sel)}
        </section>
      </div>
    </div>`;
  }

  async function onClick(e) {
    const b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    const d = b.dataset;
    if (d.select) { selectedId = d.select; editing = false; render(); return; }
    if (d.open) { app().openInStudio(d.open); return; }
    const c = S.data.clients.find((x) => x.id === selectedId);
    switch (d.act) {
      case 'new':
        draft = { id: S.uid('cli'), company: '', nif: '', sector: '', contact: '', email: '', address: '' };
        selectedId = draft.id; editing = true; render();
        root.querySelector('[data-key="company"]').focus();
        break;
      case 'edit': draft = { ...c }; editing = true; render(); break;
      case 'cancel': editing = false; draft = null; render(); break;
      case 'back': selectedId = null; editing = false; render(); break;
      case 'delete': {
        const ok = await confirm({ title: 'Eliminar cliente', message: `Eliminar ${draft.company}? As propostas já emitidas mantêm os dados do cliente.`, confirmLabel: 'Eliminar', danger: true });
        if (ok) { editing = false; S.deleteClient(draft.id); toast('Cliente eliminado.', 'success'); }
        break;
      }
      case 'new-proposal': app().newProposal(c); break;
      default: break;
    }
  }
  function onSubmit(e) {
    e.preventDefault();
    if (!draft.company.trim()) { toast('Indique o nome da empresa.', 'error'); return; }
    editing = false;
    const saved = S.saveClient(draft);
    selectedId = saved.id;
    draft = null;
    toast(`${saved.company} guardado.`, 'success');
  }
  function onInput(e) {
    const el = e.target;
    if (el.matches('[data-search]')) { query = el.value; root.querySelector('[data-rows]').innerHTML = listHtml(); return; }
    if (editing && el.dataset.key) draft[el.dataset.key] = el.value;
  }

  const handlers = { click: onClick, submit: onSubmit, input: onInput };

  window.TS.app.register('clientes', {
    mount(el, params) {
      root = el;
      if (params[0]) selectedId = params[0];
      editing = false;
      Object.entries(handlers).forEach(([ev, fn]) => root.addEventListener(ev, fn));
      render();
    },
    unmount() {
      Object.entries(handlers).forEach(([ev, fn]) => root.removeEventListener(ev, fn));
      root = null;
    },
    onChange() { if (!editing) render(); },
    onLayout() { render(); }
  });
})();
