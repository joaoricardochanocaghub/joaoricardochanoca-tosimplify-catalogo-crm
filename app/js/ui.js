/* ToSimplify Studio — utilitários de interface: escape, ícones, toasts, modais */
(function () {
  'use strict';

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]);

  const ICONS = {
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
    chevron: '<polyline points="9 18 15 12 9 6"/>',
    back: '<polyline points="15 18 9 12 15 6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    expand: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>'
  };
  function icon(name, size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
  }

  // ---------- toasts ----------
  function toast(message, type = 'info') {
    let host = document.querySelector('.toasts');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toasts no-print';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `${icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info')}<span>${esc(message)}</span>`;
    host.appendChild(el);
    window.setTimeout(() => el.remove(), 3600);
  }

  // ---------- modais ----------
  // Abre um modal; devolve { el, close }. onClose é chamado uma vez.
  function modal({ title, iconName, body, footer = '', wide = false, xwide = false, onClose }) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay no-print';
    const titleId = `m-${Math.random().toString(36).slice(2, 8)}`;
    overlay.innerHTML = `
      <div class="modal${wide ? ' modal--wide' : ''}${xwide ? ' modal--xwide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="modal__head">
          <h3 id="${titleId}" class="modal__title">${iconName ? icon(iconName) : ''}${esc(title)}</h3>
          <button type="button" class="btn btn--ghost btn--icon btn--sm" data-close aria-label="Fechar">${icon('x')}</button>
        </div>
        <div class="modal__body">${body}</div>
        ${footer ? `<div class="modal__foot">${footer}</div>` : ''}
      </div>`;
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement;
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      document.body.style.overflow = prevOverflow;
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (onClose) onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
    const focusable = overlay.querySelector('[autofocus], .modal__body input, .modal__foot .btn--primary, .modal__foot .btn--danger-solid');
    (focusable || overlay.querySelector('[data-close]')).focus();
    return { el: overlay, close };
  }

  // Confirmação; resolve true/false
  function confirm({ title, message, confirmLabel = 'Confirmar', danger = false }) {
    return new Promise((resolve) => {
      let result = false;
      const m = modal({
        title, iconName: danger ? 'alert' : 'info',
        body: `<p class="modal__text">${esc(message)}</p>`,
        footer: `<button type="button" class="btn btn--secondary" data-close>Cancelar</button>
                 <button type="button" class="btn ${danger ? 'btn--danger-solid' : 'btn--primary'}" data-ok>${esc(confirmLabel)}</button>`,
        onClose: () => resolve(result)
      });
      m.el.querySelector('[data-ok]').addEventListener('click', () => { result = true; m.close(); });
    });
  }

  // Lista de escolha (clientes, catálogo) com pesquisa
  function pick({ title, iconName, items, emptyText, onPick }) {
    const render = (q) => {
      const term = q.trim().toLowerCase();
      const list = items.filter((i) => !term || `${i.title} ${i.subtitle}`.toLowerCase().includes(term));
      if (!list.length) return `<p class="muted">${esc(items.length ? 'Sem resultados.' : emptyText)}</p>`;
      return `<ul class="pick-list">${list.map((i) => `
        <li><button type="button" class="pick" data-pick="${esc(i.id)}"><span><strong>${esc(i.title)}</strong><small>${esc(i.subtitle)}</small></span>${icon('chevron')}</button></li>`).join('')}</ul>`;
    };
    const m = modal({
      title, iconName, wide: true,
      body: `<div class="search search--modal">${icon('search')}<input type="search" class="input" placeholder="Procurar…" aria-label="Procurar" autofocus></div><div data-list>${render('')}</div>`
    });
    const input = m.el.querySelector('input');
    input.addEventListener('input', () => { m.el.querySelector('[data-list]').innerHTML = render(input.value); });
    m.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (b) { m.close(); onPick(b.dataset.pick); }
    });
  }

  // Lê uma imagem e reduz para JPEG (largura máx. 1400 px) para caber no localStorage
  function readImage(file, maxWidth = 1400, quality = 0.78) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('O ficheiro não é uma imagem.')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')); };
      img.src = url;
    });
  }

  // Campo de foto: pré-visualização + carregar/trocar + remover
  function photoField({ label, src, hint, attrs }) {
    return `<div class="field"><span class="field__label">${esc(label)}</span>
      <div class="photo-field">
        <div class="photo-field__preview${src ? '' : ' is-empty'}">${src ? `<img src="${esc(src)}" alt="">` : icon('upload', 20)}</div>
        <div class="photo-field__actions">
          <label class="btn btn--secondary btn--sm">${icon('upload', 14)} ${src ? 'Trocar foto' : 'Carregar foto'}<input type="file" accept="image/*" hidden data-photo ${attrs}></label>
          ${src ? `<button type="button" class="btn btn--ghost btn--sm" data-photo-remove ${attrs}>${icon('trash', 14)} Remover</button>` : ''}
          ${hint ? `<span class="field__hint">${esc(hint)}</span>` : ''}
        </div>
      </div></div>`;
  }

  // Estado de uma proposta como pastilha
  const statusPill = (status) => `<span class="status status--${esc(status)}">${esc(status)}</span>`;

  window.TS = window.TS || {};
  Object.assign(window.TS, { esc, icon, toast, modal, confirm, pick, statusPill, readImage, photoField });
})();
