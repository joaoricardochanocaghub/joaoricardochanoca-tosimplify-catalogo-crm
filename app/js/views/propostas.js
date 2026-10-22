/* ToSimplify Studio — vista Propostas: quadro por estado com arrasto (wireframe 1e)
   e, em mobile, lista + ecrã de detalhe com botões de resultado (3i) */
(function () {
  'use strict';
  const { esc, icon, toast, confirm, modal, statusPill } = window.TS;
  const S = window.TS.store;
  const doc = window.TS.doc;
  const app = () => window.TS.app;

  let root = null;
  let detailId = null;
  let query = '';
  let mobileFilter = 'Abertas';
  let dragId = null;

  // ---------- dados derivados ----------
  function rows() {
    const term = query.trim().toLowerCase();
    return S.data.proposals
      .map((p) => ({ p, total: S.totals(p).grandTotal }))
      .filter(({ p }) => !term || `${p.ref} ${p.client.company} ${p.subject}`.toLowerCase().includes(term))
      .sort((a, b) => b.p.date.localeCompare(a.p.date) || b.p.ref.localeCompare(a.p.ref));
  }
  // Dias até expirar (null se não se aplica)
  function expiresIn(p) {
    if (p.status !== 'Enviada') return null;
    return S.daysBetween(S.todayIso(), S.addDays(p.date, p.validityDays));
  }
  function statusLine(p) {
    const since = S.daysBetween(p.statusDate, S.todayIso());
    const ago = since == null ? '' : since <= 0 ? 'hoje' : since === 1 ? 'há 1 dia' : `há ${since} dias`;
    const until = S.addDays(p.date, p.validityDays);
    if (p.status === 'Enviada') {
      const left = expiresIn(p);
      return `Enviada ${ago} · ${left != null && left < 0 ? 'expirou a' : 'expira a'} ${S.formatDate(until).slice(0, 5)}`;
    }
    if (p.status === 'Rascunho') return `Rascunho · criada a ${S.formatDate(p.date)}`;
    return `${p.status} ${ago}`;
  }
  const kpis = (list) => {
    const sum = (st) => list.filter((r) => r.p.status === st).reduce((s, r) => s + r.total, 0);
    const won = list.filter((r) => r.p.status === 'Aprovada').length;
    const lost = list.filter((r) => r.p.status === 'Recusada').length;
    return { open: sum('Enviada') + sum('Rascunho'), conversion: won + lost ? Math.round(won / (won + lost) * 100) : null };
  };

  // ---------- quadro (desktop) ----------
  function card({ p, total }) {
    const left = expiresIn(p);
    const warn = left != null && left <= 7;
    return `<article class="kcard${warn ? ' kcard--warn' : ''}" draggable="true" data-id="${esc(p.id)}" tabindex="0" aria-label="${esc(`${p.ref} · ${p.client.company}`)}">
      <div class="kcard__top"><span class="card__ref mono">${esc(p.ref)}</span>
        ${warn ? `<span class="kcard__flag" title="${left < 0 ? 'Validade expirada' : `Expira em ${left} dia(s)`}">${icon('alert', 12)} ${left < 0 ? 'expirou' : `${left}d`}</span>` : ''}</div>
      <div class="kcard__client">${esc(p.client.company || 'Sem cliente')}</div>
      <div class="kcard__foot"><strong class="mono">${esc(S.money(total))}</strong>
        <span class="kcard__actions">
          <button type="button" class="btn btn--ghost btn--icon btn--sm" data-act="dup" data-id="${esc(p.id)}" title="Duplicar" aria-label="Duplicar">${icon('copy', 14)}</button>
          <button type="button" class="btn btn--ghost btn--icon btn--sm" data-act="print" data-id="${esc(p.id)}" title="Imprimir / PDF" aria-label="Imprimir / PDF">${icon('printer', 14)}</button>
          <button type="button" class="btn btn--ghost btn--icon btn--sm" data-act="del" data-id="${esc(p.id)}" title="Eliminar" aria-label="Eliminar">${icon('trash', 14)}</button>
        </span></div>
    </article>`;
  }
  function board() {
    const list = rows();
    const k = kpis(list);
    return `<div class="view">
      <div class="view__head">
        <div><span class="eyebrow">Histórico comercial</span><h1>Propostas <span class="count count--lg">${S.data.proposals.length}</span></h1></div>
        <div class="row row--center">
          <span class="muted">Pipeline aberto: <strong class="text-strong mono">${esc(S.moneyShort(k.open))}</strong>${k.conversion != null ? ` · conversão <strong class="text-strong">${k.conversion}%</strong>` : ''}</span>
          <div class="search search--sm">${icon('search')}<input type="search" class="input" placeholder="Filtrar por cliente, ref…" value="${esc(query)}" data-search aria-label="Filtrar propostas"></div>
        </div>
      </div>
      <div class="board" data-board>${S.STATUSES.map((st) => {
        const col = list.filter((r) => r.p.status === st);
        const sum = col.reduce((s, r) => s + r.total, 0);
        return `<section class="kcol kcol--${esc(st)}" data-status="${esc(st)}" aria-label="${esc(st)}">
          <header class="kcol__head"><div><strong>${esc(st)}</strong> <span class="muted">${col.length}</span></div>
            <span class="kcol__sum mono" title="${esc(S.money(sum))}">${esc(S.moneyShort(sum))}</span></header>
          <div class="kcol__cards">${col.map(card).join('') || '<p class="kcol__empty">Largue aqui</p>'}</div>
        </section>`;
      }).join('')}</div>
      <p class="field__hint">Arraste um cartão para mudar o estado. Clique para abrir no Studio. Os totais de cada coluna incluem IVA.</p>
    </div>`;
  }

  // ---------- lista (mobile) ----------
  function mobileList() {
    const all = rows();
    const filters = ['Abertas', ...S.STATUSES];
    const match = (r) => (mobileFilter === 'Abertas' ? ['Rascunho', 'Enviada'].includes(r.p.status) : r.p.status === mobileFilter);
    const list = all.filter(match);
    const sum = list.reduce((s, r) => s + r.total, 0);
    return `<div class="view mlist">
      <div class="view__head"><div><span class="eyebrow">Histórico comercial</span><h1>Propostas</h1></div></div>
      <div class="search">${icon('search')}<input type="search" class="input" placeholder="Cliente, ref…" value="${esc(query)}" data-search aria-label="Filtrar propostas"></div>
      <div class="chips-scroll" role="group" aria-label="Estado">${filters.map((f) =>
        `<button type="button" class="seg__btn${mobileFilter === f ? ' is-active' : ''}" data-filter="${esc(f)}">${esc(f)}</button>`).join('')}</div>
      <p class="muted">${list.length} · ${esc(S.moneyShort(sum))}</p>
      <div class="stack stack--tight">${list.map(({ p, total }) => `
        <button type="button" class="mcard" data-open="${esc(p.id)}">
          <span class="mcard__top"><span class="card__ref mono">${esc(p.ref)}</span>${statusPill(p.status)}</span>
          <span class="mcard__client">${esc(p.client.company || 'Sem cliente')}</span>
          <strong class="mono">${esc(S.money(total))}</strong>
        </button>`).join('') || '<p class="empty">Sem propostas neste estado.</p>'}</div>
    </div>`;
  }

  // ---------- detalhe (3i) ----------
  function detail(p) {
    const total = S.totals(p).grandTotal;
    const outcome = (st, cls) => `<button type="button" class="btn btn--xl ${p.status === st ? 'btn--dark' : cls}" data-status="${st}" aria-pressed="${p.status === st}">
      ${p.status === st ? icon('check', 16) : ''}${st}</button>`;
    return `<div class="view detail">
      <button type="button" class="btn btn--ghost btn--sm detail__back" data-act="back">${icon('back', 14)} Propostas</button>
      <div class="card detail__card">
        <span class="card__ref mono">${esc(p.ref)}</span>
        <h1 class="detail__client">${esc(p.client.company || 'Sem cliente')}</h1>
        <strong class="detail__total mono">${esc(S.money(total))}</strong>
        <span class="muted">${esc(statusLine(p))}</span>
        <button type="button" class="detail__thumb" data-act="preview" aria-label="Ver documento">${doc.thumb(p, S.data.issuer, 200)}</button>
        <span class="field__label">${p.status === 'Rascunho' ? 'Próximo passo' : 'Resultado'}</span>
        ${p.status === 'Rascunho'
          ? `<button type="button" class="btn btn--xl btn--primary" data-status="Enviada">${icon('send', 16)} Marcar enviada</button>`
          : `<div class="grid-2">${outcome('Aprovada', 'btn--primary')}${outcome('Recusada', 'btn--secondary')}</div>
             ${p.status !== 'Enviada' ? '<button type="button" class="btn btn--ghost btn--sm" data-status="Enviada">Repor como Enviada</button>' : ''}`}
        <button type="button" class="btn btn--secondary btn--lg" data-act="print" data-id="${esc(p.id)}">${icon('share', 16)} Partilhar PDF</button>
        <button type="button" class="btn btn--ghost" data-act="studio" data-id="${esc(p.id)}">${icon('edit', 14)} Abrir no Studio</button>
      </div>
    </div>`;
  }

  // ---------- desenho ----------
  function render() {
    if (!root) return;
    const focusSearch = document.activeElement && document.activeElement.matches('[data-search]');
    const caret = focusSearch ? document.activeElement.selectionStart : 0;
    if (detailId) {
      const p = S.findProposal(detailId);
      root.innerHTML = p ? detail(p) : '<div class="empty">Proposta não encontrada.</div>';
      return;
    }
    root.innerHTML = app().isMobile ? mobileList() : board();
    if (focusSearch) {
      const s = root.querySelector('[data-search]');
      s.focus();
      s.setSelectionRange(caret, caret);
    }
  }

  // ---------- ações ----------
  async function act(name, id) {
    const p = S.findProposal(id);
    if (name === 'back') { app().go('propostas'); return; }
    if (name === 'studio') { app().openInStudio(id); return; }
    if (!p && name !== 'preview') return;
    if (name === 'dup') {
      const copy = S.duplicateProposal(id);
      toast(`${p.ref} duplicada como ${copy.ref}.`, 'success');
    }
    if (name === 'print') app().printProposal(p);
    if (name === 'del') {
      const ok = await confirm({ title: 'Eliminar proposta', message: `Eliminar ${p.ref} (${p.client.company || 'sem cliente'})? Esta ação não pode ser anulada.`, confirmLabel: 'Eliminar', danger: true });
      if (ok) { S.deleteProposal(id); toast(`Proposta ${p.ref} eliminada.`, 'success'); }
    }
    if (name === 'preview') {
      const cur = S.findProposal(detailId);
      const m = modal({ title: cur.ref, iconName: 'file', xwide: true, body: `<div class="doc-wrap doc-wrap--modal"><div class="doc-zoom">${doc.render(cur, S.data.issuer)}</div></div>` });
      const wrap = m.el.querySelector('.doc-wrap');
      wrap.querySelector('.doc-zoom').style.zoom = Math.min(1, (wrap.clientWidth - 2) / 794);
    }
  }
  function changeStatus(id, status) {
    const p = S.findProposal(id);
    if (!p || p.status === status) return;
    S.setStatus(id, status);
    toast(`${p.ref} → ${status}`, 'success');
  }

  function onClick(e) {
    const b = e.target.closest('button, .kcard');
    if (!b || !root.contains(b)) return;
    const d = b.dataset;
    if (d.act) { act(d.act, d.id); return; }
    if (d.filter) { mobileFilter = d.filter; render(); return; }
    if (d.open) { app().go(`propostas/${encodeURIComponent(d.open)}`); return; }
    if (d.status && detailId) { changeStatus(detailId, d.status); return; }
    if (b.classList.contains('kcard')) app().openInStudio(d.id);
  }
  function onKeyDown(e) {
    if (e.key === 'Enter' && e.target.classList.contains('kcard')) app().openInStudio(e.target.dataset.id);
  }
  function onInput(e) {
    if (e.target.matches('[data-search]')) { query = e.target.value; render(); }
  }
  function onDragStart(e) {
    const c = e.target.closest && e.target.closest('.kcard');
    if (!c) return;
    dragId = c.dataset.id;
    c.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  }
  function onDragOver(e) {
    if (!dragId) return;
    const col = e.target.closest('.kcol');
    if (!col) return;
    e.preventDefault();
    root.querySelectorAll('.kcol.is-over').forEach((c) => { if (c !== col) c.classList.remove('is-over'); });
    col.classList.add('is-over');
  }
  function onDragLeave(e) {
    const col = e.target.closest('.kcol');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('is-over');
  }
  function onDrop(e) {
    const col = e.target.closest('.kcol');
    if (!dragId || !col) return;
    e.preventDefault();
    const id = dragId;
    dragId = null;
    changeStatus(id, col.dataset.status);
    render();
  }
  function onDragEnd() {
    dragId = null;
    if (root) root.querySelectorAll('.is-dragging, .is-over').forEach((el) => el.classList.remove('is-dragging', 'is-over'));
  }

  const handlers = { click: onClick, keydown: onKeyDown, input: onInput, dragstart: onDragStart, dragover: onDragOver, dragleave: onDragLeave, drop: onDrop, dragend: onDragEnd };

  window.TS.app.register('propostas', {
    mount(el, params) {
      root = el;
      detailId = params[0] || null;
      Object.entries(handlers).forEach(([ev, fn]) => root.addEventListener(ev, fn));
      render();
    },
    unmount() {
      Object.entries(handlers).forEach(([ev, fn]) => root.removeEventListener(ev, fn));
      root = null;
    },
    onChange() { render(); },
    onLayout() { render(); }
  });
})();
