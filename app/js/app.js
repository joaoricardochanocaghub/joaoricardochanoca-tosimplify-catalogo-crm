/* ToSimplify Studio — arranque, cabeçalho, navegação (hash router) e ações globais */
(function () {
  'use strict';
  const { esc, icon, toast, modal, confirm } = window.TS;
  const S = window.TS.store;

  const NAV = [
    { id: 'studio', label: 'Studio', icon: 'file' },
    { id: 'propostas', label: 'Propostas', icon: 'folder' },
    { id: 'clientes', label: 'Clientes', icon: 'users' },
    { id: 'catalogo', label: 'Catálogo', icon: 'box' }
  ];

  const views = {};
  let current = { view: 'studio', params: [] };
  let currentView = null;
  const header = document.getElementById('app-header');
  const main = document.getElementById('main');
  const mobileQuery = window.matchMedia('(max-width: 720px)');

  // ---------- navegação ----------
  function parseHash() {
    const parts = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const view = views[parts[0]] ? parts[0] : 'studio';
    return { view, params: views[parts[0]] ? parts.slice(1) : [] };
  }
  function go(path) {
    const target = `#/${path}`;
    if (location.hash === target) route(); else location.hash = target;
  }
  function route() {
    const next = parseHash();
    const sameView = current.view === next.view;
    current = next;
    if (currentView && currentView.unmount) currentView.unmount();
    currentView = views[current.view];
    renderHeader();
    main.innerHTML = '';
    main.dataset.view = current.view;
    currentView.mount(main, current.params);
    if (!sameView) window.scrollTo(0, 0);
  }

  // ---------- cabeçalho ----------
  function renderHeader() {
    const dirty = S.isDirty();
    header.innerHTML = `<div class="app-header__inner">
      <button type="button" class="brand" data-go="studio" aria-label="Ir para o Studio">
        <img class="brand__logo" src="assets/logo.png" alt="ToSimplify"><span class="brand__ver">Studio 4.0</span>
      </button>
      <nav class="nav" aria-label="Navegação principal">
        ${NAV.map((n) => `<button type="button" class="nav__btn${current.view === n.id ? ' is-active' : ''}" data-go="${n.id}"${current.view === n.id ? ' aria-current="page"' : ''}>
          ${icon(n.icon)}<span class="nav__label">${n.label}</span>
          ${n.id === 'propostas' ? `<span class="count">${S.data.proposals.length}</span>` : ''}
          ${n.id === 'studio' && dirty ? '<span class="dirty-dot" title="Alterações por guardar"></span>' : ''}
        </button>`).join('')}
      </nav>
      <div class="app-header__actions">
        ${S.storageError ? `<span class="chip chip--error" title="O navegador recusou gravar os dados">${icon('alert', 12)} Sem gravação local</span>` : ''}
        <button type="button" class="btn btn--secondary hide-sm" data-action="backup">${icon('code')} JSON</button>
        <button type="button" class="btn btn--primary" data-action="new">${icon('plus')}<span>Nova</span></button>
      </div>
    </div>`;
  }
  header.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-go]');
    if (nav) { go(nav.dataset.go === 'studio' ? `studio/${views.studio.lastStep()}` : nav.dataset.go); return; }
    const act = e.target.closest('[data-action]');
    if (!act) return;
    if (act.dataset.action === 'new') newProposal();
    if (act.dataset.action === 'backup') openBackup();
  });

  // ---------- ações partilhadas pelas vistas ----------
  // Pede confirmação antes de descartar alterações não guardadas na proposta ativa
  async function guardDirty(targetId) {
    if (!S.isDirty() || S.active.id === targetId) return true;
    return confirm({
      title: 'Alterações por guardar',
      message: `A proposta ${S.active.ref} tem alterações que ainda não foram guardadas no histórico. Se continuar, são perdidas.`,
      confirmLabel: 'Continuar sem guardar', danger: true
    });
  }
  async function newProposal(client) {
    if (!(await guardDirty())) return;
    const p = S.newProposal(client);
    toast(`Nova proposta ${p.ref}${client ? ` para ${client.company}` : ''}.`, 'success');
    go(`studio/${client ? 2 : 1}`);
  }
  async function openInStudio(id, step) {
    if (!(await guardDirty(id))) return;
    if (S.active.id !== id) S.openProposal(id);
    go(`studio/${step || 5}`);
  }
  function printProposal(p) { window.TS.doc.print(p, S.data.issuer); }

  function openBackup() {
    const m = modal({
      title: 'Cópia de segurança (JSON)', iconName: 'code', wide: true,
      body: `<div class="stack">
        <p class="modal__text">Os dados ficam guardados apenas neste navegador. Exporte regularmente uma cópia em JSON para não os perder ou para os passar para outro dispositivo.</p>
        <div class="row">
          <button type="button" class="btn btn--primary" data-act="export">${icon('download')} Exportar JSON</button>
          <label class="btn btn--secondary">${icon('plus')} Juntar JSON<input type="file" accept="application/json,.json" hidden data-act="merge"></label>
          <label class="btn btn--secondary">${icon('upload')} Importar JSON<input type="file" accept="application/json,.json" hidden data-act="import"></label>
        </div>
        <p class="field__hint"><strong>Juntar</strong> acrescenta clientes, produtos e propostas do ficheiro aos dados atuais, sem apagar nada (ignora os que já existem). <strong>Importar</strong> substitui todos os dados atuais: propostas, clientes, catálogo e emitente.</p>
        <div class="section-block">
          <div class="section-head"><span class="section-title">Dados de demonstração</span></div>
          <button type="button" class="btn btn--danger btn--sm" data-act="reset" style="align-self:flex-start">${icon('trash', 14)} Repor dados de demonstração</button>
        </div>
      </div>`
    });
    m.el.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'export') {
        const blob = new Blob([S.exportBackup()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `tosimplify-studio-${S.todayIso()}.json`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast('Cópia de segurança exportada.', 'success');
      }
      if (act.dataset.act === 'reset') {
        m.close();
        const ok = await confirm({ title: 'Repor dados de demonstração', message: 'Todos os dados atuais são substituídos pelos dados de exemplo. Exporte antes uma cópia se precisar deles.', confirmLabel: 'Repor', danger: true });
        if (ok) { S.resetDemo(); toast('Dados de demonstração repostos.', 'success'); go('studio/1'); }
      }
    });
    m.el.querySelector('[data-act="merge"]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      m.close();
      const ok = await confirm({ title: 'Juntar ficheiro', message: `Acrescentar aos dados atuais os clientes, produtos e propostas de "${file.name}"? Nada é apagado.`, confirmLabel: 'Juntar' });
      if (!ok) return;
      try {
        const n = S.mergeBackup(await file.text());
        const total = n.clientes + n.produtos + n.propostas;
        toast(total ? `Acrescentados: ${n.clientes} cliente(s), ${n.produtos} produto(s), ${n.propostas} proposta(s).` : 'Nada novo: tudo o que está no ficheiro já existia.', total ? 'success' : 'info');
        route();
      } catch (err) {
        console.error(err);
        toast('O ficheiro não é um JSON válido do ToSimplify Studio.', 'error');
      }
    });
    m.el.querySelector('[data-act="import"]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      m.close();
      const ok = await confirm({ title: 'Importar cópia de segurança', message: `Substituir todos os dados atuais pelo conteúdo de "${file.name}"?`, confirmLabel: 'Importar', danger: true });
      if (!ok) return;
      try {
        S.restoreBackup(await file.text());
        toast('Cópia de segurança importada.', 'success');
        route();
      } catch (err) {
        console.error(err);
        toast('O ficheiro não é um JSON válido do ToSimplify Studio.', 'error');
      }
    });
  }

  // Alterações nos dados: atualiza o cabeçalho e deixa a vista decidir o que redesenhar
  S.on((kind) => {
    renderHeader();
    if (currentView && currentView.onChange) currentView.onChange(kind);
  });
  mobileQuery.addEventListener('change', () => { if (currentView && currentView.onLayout) currentView.onLayout(); });

  window.TS.app = {
    register(id, view) { views[id] = view; },
    go, guardDirty, newProposal, openInStudio, printProposal,
    get isMobile() { return mobileQuery.matches; }
  };

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) history.replaceState(null, '', '#/studio/1');
    route();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker não registado', err));
    }
  });
})();
