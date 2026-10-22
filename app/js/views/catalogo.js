/* ToSimplify Studio — vista Catálogo: tabela densa com linhas expansíveis e
   especificações editáveis na própria linha (wireframe 1k) */
(function () {
  'use strict';
  const { esc, icon, toast, confirm } = window.TS;
  const S = window.TS.store;
  const app = () => window.TS.app;

  let root = null;
  let query = '';
  let category = 'Todas';
  const open = new Set();

  const find = (id) => S.data.catalog.find((c) => c.id === id);

  function detailHtml(c) {
    const f = (label, key, { type = 'text', mode = '', full = false } = {}) => `<label class="field${full ? ' field--full' : ''}"><span class="field__label">${esc(label)}</span>
      <input type="${type}" class="input" data-id="${esc(c.id)}" data-key="${key}"${mode ? ` data-type="${mode}" inputmode="decimal"` : ''} value="${esc(c[key])}"></label>`;
    return `<div class="crow__detail">
      <div class="grid-4">
        ${f('SKU', 'sku')}
        <label class="field"><span class="field__label">Categoria</span><select class="select" data-id="${esc(c.id)}" data-key="category">${S.CATEGORIES.map((k) => `<option${k === c.category ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
        ${f('Preço base (€)', 'basePrice', { mode: 'num' })}
        <label class="field"><span class="field__label">IVA</span><select class="select" data-id="${esc(c.id)}" data-key="vat" data-type="num">${S.VAT_RATES.map((r) => `<option value="${r}"${r === c.vat ? ' selected' : ''}>${esc(S.vatLabel(r))}</option>`).join('')}</select></label>
      </div>
      ${f('Nome', 'name', { full: true })}
      <label class="field"><span class="field__label">Descrição</span><textarea class="textarea" rows="2" data-id="${esc(c.id)}" data-key="description">${esc(c.description)}</textarea></label>
      ${window.TS.photoField({ label: 'Foto de destaque', src: c.photo, hint: 'Aparece no topo da proposta, em toda a largura. Formato largo (3:1) fica melhor.', attrs: `data-id="${esc(c.id)}"` })}
      <div class="section-head"><span class="field__label">Especificações (alimentam a ficha técnica da proposta)</span></div>
      <div class="cspecs">${c.specs.map((s) => `<div class="cspec">
        <input class="cell" data-id="${esc(c.id)}" data-spec="${esc(s.id)}" data-key="name" value="${esc(s.name)}" placeholder="Parâmetro" aria-label="Parâmetro">
        <input class="cell cell--strong" data-id="${esc(c.id)}" data-spec="${esc(s.id)}" data-key="value" value="${esc(s.value)}" placeholder="Valor" aria-label="Valor">
        <button type="button" class="btn btn--ghost btn--icon btn--sm" data-act="del-spec" data-id="${esc(c.id)}" data-spec="${esc(s.id)}" aria-label="Remover parâmetro">${icon('x', 14)}</button>
      </div>`).join('')}
        <button type="button" class="cspec cspec--add" data-act="add-spec" data-id="${esc(c.id)}">${icon('plus', 14)} Parâmetro</button>
      </div>
      <div class="row row--between">
        <button type="button" class="btn btn--danger btn--sm" data-act="delete" data-id="${esc(c.id)}">${icon('trash', 14)} Eliminar</button>
        <button type="button" class="btn btn--primary btn--sm" data-act="use" data-id="${esc(c.id)}">${icon('file', 14)} Usar na proposta ativa</button>
      </div>
    </div>`;
  }

  function rowHtml(c) {
    const isOpen = open.has(c.id);
    return `<div class="crow${isOpen ? ' is-open' : ''}" data-row="${esc(c.id)}">
      <button type="button" class="crow__head" data-toggle="${esc(c.id)}" aria-expanded="${isOpen}">
        <span class="crow__sku mono"><span class="crow__caret">${icon('chevron', 12)}</span>${esc(c.sku || '—')}</span>
        <span class="crow__name">${c.photo ? `<img class="crow__thumb" src="${esc(c.photo)}" alt="">` : ''}${esc(c.name || 'Sem nome')}</span>
        <span class="crow__cat hide-sm"><span class="chip">${esc(c.category)}</span></span>
        <span class="crow__specs hide-sm muted">${c.specs.length} parâm.</span>
        <span class="crow__price mono">${esc(S.money(c.basePrice))}</span>
      </button>
      ${isOpen ? detailHtml(c) : ''}
    </div>`;
  }

  function rowsHtml() {
    const term = query.trim().toLowerCase();
    const list = S.data.catalog.filter((c) => (category === 'Todas' || c.category === category)
      && (!term || `${c.sku} ${c.name} ${c.description}`.toLowerCase().includes(term)));
    if (!list.length) return `<p class="empty">${S.data.catalog.length ? 'Sem resultados para este filtro.' : 'O catálogo está vazio. Crie o primeiro item.'}</p>`;
    return list.map(rowHtml).join('');
  }

  function render() {
    if (!root) return;
    root.innerHTML = `<div class="view">
      <div class="view__head"><div><span class="eyebrow">Equipamentos</span><h1>Catálogo <span class="count count--lg">${S.data.catalog.length}</span></h1></div></div>
      <div class="filters">
        <div class="search">${icon('search')}<input type="search" class="input" placeholder="SKU, nome…" value="${esc(query)}" data-search aria-label="Procurar no catálogo"></div>
        <select class="select" data-filter aria-label="Categoria">${['Todas', ...S.CATEGORIES].map((k) => `<option${k === category ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select>
        <button type="button" class="btn btn--dark" data-act="new">${icon('plus')} Item</button>
      </div>
      <div class="ctable">
        <div class="ctable__head"><span>SKU</span><span>Nome</span><span class="hide-sm">Categoria</span><span class="hide-sm">Specs</span><span class="num">Preço</span></div>
        <div data-rows>${rowsHtml()}</div>
      </div>
      <p class="field__hint">As especificações editam-se diretamente na linha e passam para a ficha técnica quando o item é usado numa proposta.</p>
    </div>`;
  }
  // Redesenha só a tabela (mantém o foco na pesquisa)
  function renderRows() { root.querySelector('[data-rows]').innerHTML = rowsHtml(); }
  // Atualiza o cabeçalho da linha sem tocar nos campos em edição
  function refreshHead(id) {
    const c = find(id);
    const row = root.querySelector(`[data-row="${CSS.escape(id)}"]`);
    if (!c || !row) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = rowHtml(c);
    row.querySelector('.crow__head').replaceWith(tmp.querySelector('.crow__head'));
  }

  async function onClick(e) {
    const b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    const d = b.dataset;
    if (d.toggle) {
      if (open.has(d.toggle)) open.delete(d.toggle); else open.add(d.toggle);
      renderRows();
      return;
    }
    const c = d.id ? find(d.id) : null;
    if ('photoRemove' in d && c) { c.photo = ''; S.changed(); return; }
    switch (d.act) {
      case 'new': {
        const item = S.newCatalogItem();
        open.add(item.id);
        query = ''; category = 'Todas';
        render();
        const name = root.querySelector(`[data-id="${CSS.escape(item.id)}"][data-key="sku"]`);
        if (name) name.focus();
        break;
      }
      case 'add-spec':
        c.specs.push(S.newSpec());
        S.changed();
        { const ins = root.querySelectorAll(`[data-id="${CSS.escape(c.id)}"][data-spec][data-key="name"]`); if (ins.length) ins[ins.length - 1].focus(); }
        break;
      case 'del-spec':
        c.specs = c.specs.filter((s) => s.id !== d.spec);
        S.changed();
        break;
      case 'delete': {
        const ok = await confirm({ title: 'Eliminar item', message: `Eliminar ${c.name || c.sku} do catálogo? As propostas já criadas não são alteradas.`, confirmLabel: 'Eliminar', danger: true });
        if (ok) { open.delete(c.id); S.deleteCatalogItem(c.id); toast('Item eliminado do catálogo.', 'success'); }
        break;
      }
      case 'use': {
        S.applyCatalogItem(c.id);
        toast(`${c.name} aplicado à proposta ${S.active.ref}.`, 'success');
        app().go(`studio/${c.category === 'Máquina' ? 2 : 3}`);
        break;
      }
      default: break;
    }
  }
  function onInput(e) {
    const el = e.target;
    if (el.type === 'file') {
      const item = find(el.dataset.id);
      if (e.type === 'change' && item) {
        window.TS.readImage(el.files[0])
          .then((src) => { item.photo = src; S.changed(); toast('Foto atualizada.', 'success'); })
          .catch((err) => toast(err.message, 'error'));
      }
      return;
    }
    if (el.matches('[data-search]')) { query = el.value; renderRows(); return; }
    if (el.matches('[data-filter]')) { category = el.value; renderRows(); return; }
    const c = el.dataset.id && find(el.dataset.id);
    if (!c || !el.dataset.key) return;
    const value = el.dataset.type === 'num' ? Math.max(S.num(el.value), 0) : el.value;
    if (el.dataset.spec) {
      const s = c.specs.find((x) => x.id === el.dataset.spec);
      if (s) s[el.dataset.key] = value;
    } else {
      c[el.dataset.key] = value;
    }
    S.changed('live');
    refreshHead(c.id);
  }

  const handlers = { click: onClick, input: onInput, change: onInput };

  window.TS.app.register('catalogo', {
    mount(el) {
      root = el;
      Object.entries(handlers).forEach(([ev, fn]) => root.addEventListener(ev, fn));
      render();
    },
    unmount() {
      Object.entries(handlers).forEach(([ev, fn]) => root.removeEventListener(ev, fn));
      root = null;
    },
    // Edições de campo atualizam só o cabeçalho da linha; o resto redesenha a tabela
    onChange(kind) { if (root && kind !== 'live') renderRows(); }
  });
})();
