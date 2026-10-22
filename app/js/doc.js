/* ToSimplify Studio — documento A4 da proposta (layout 2g: faixa de cabeçalho, secções numeradas, caixa de totais) */
(function () {
  'use strict';
  const { esc } = window.TS;
  const S = window.TS.store;

  function section(num, title, body, chip) {
    return `<section class="doc-section">
      <div class="doc-section__head"><h3><span class="doc-section__num">${num}</span>${esc(title)}</h3>${chip ? `<span class="doc-chip">${esc(chip)}</span>` : ''}</div>
      ${body}
    </section>`;
  }

  function render(p, issuer) {
    const t = S.totals(p);
    const until = S.addDays(p.date, p.validityDays);
    const services = p.services.filter((s) => s.amount > 0);
    const steps = p.nextSteps.split('\n').map((s) => s.trim()).filter(Boolean);
    const hasContext = p.context.trim() !== '';
    const hasSolution = p.solution.trim() !== '' || p.machine.name.trim() !== '' || p.machine.desc.trim() !== '';
    const hasSpecs = p.machine.specs.length > 0;
    let n = 0;
    const issuerLine = [issuer.holder, issuer.nif && `NIF ${issuer.nif}`, issuer.address].filter(Boolean).join(' • ');
    const issuerContact = [issuer.phone, issuer.email, issuer.website].filter(Boolean).join(' • ');
    const repContact = [p.commercialRep.phone, p.commercialRep.email].filter(Boolean).join(' • ');

    const parts = [];
    // Foto de destaque do equipamento, em toda a largura no topo da página
    if (p.machine.photo) {
      parts.push(`<figure class="doc-hero"><img src="${esc(p.machine.photo)}" alt="${esc(p.machine.name)}"></figure>`);
    }
    parts.push(`<header class="doc-head">
      <div class="doc-brand">
        <img class="doc-logo" src="assets/logo.png" alt="${esc(issuer.tradeName)}">
        <div>
          ${issuer.tagline ? `<div class="doc-tagline">${esc(issuer.tagline)}</div>` : ''}
          <div class="doc-issuer">${esc(issuerLine)}</div>
          ${issuerContact ? `<div class="doc-issuer">${esc(issuerContact)}</div>` : ''}
        </div>
      </div>
      <div class="doc-meta">
        <span class="doc-badge">${esc(p.badge || 'PROPOSTA COMERCIAL')}</span>
        <div class="doc-ref">${esc(p.ref || '—')}</div>
        <div class="doc-meta__line">${esc(S.formatDate(p.date))} · <strong>${esc(p.validityDays)} dias</strong>${until ? ` (até ${esc(S.formatDate(until))})` : ''}</div>
      </div>
    </header>`);

    parts.push(`<section class="doc-client">
      <span class="doc-eyebrow">Cliente / destinatário</span>
      <div class="doc-client-name">${esc(p.client.company || '—')}</div>
      <div class="doc-client-lines">
        ${p.client.nif ? `<span>NIF: <strong class="mono">${esc(p.client.nif)}</strong></span>` : ''}
        ${p.client.contact ? `<span>Att: <strong>${esc(p.client.contact)}</strong></span>` : ''}
        ${p.client.email ? `<span>${esc(p.client.email)}</span>` : ''}
        ${p.client.address ? `<span class="doc-line--muted">${esc(p.client.address)}</span>` : ''}
      </div>
    </section>`);

    parts.push(`<h2 class="doc-subject">${esc(p.subject || '—')}</h2>`);

    if (hasContext) parts.push(section(++n, 'Contexto', `<p class="doc-text">${esc(p.context)}</p>`));
    if (hasSolution) {
      parts.push(section(++n, 'Solução', `
        ${p.machine.name ? `<div class="doc-solution-name">${esc(p.machine.name)}</div>` : ''}
        ${p.solution.trim() ? `<p class="doc-text">${esc(p.solution)}</p>` : ''}
        ${p.machine.desc ? `<p class="doc-desc">${esc(p.machine.desc)}</p>` : ''}`));
    }
    if (hasSpecs) {
      parts.push(section(++n, 'Especificações', `<div class="doc-specs">${p.machine.specs.map((s) =>
        `<div class="doc-spec"><span>${esc(s.name)}</span><strong>${esc(s.value)}</strong></div>`).join('')}</div>`, 'Ficha técnica'));
    }

    const itemsTable = `<table class="doc-table">
      <thead><tr><th>Item / descrição</th><th class="num">Qtd</th><th class="num">Preço unit.</th><th class="num">Desc.</th><th class="num">IVA</th><th class="num">Total líquido</th></tr></thead>
      <tbody>${p.items.map((it) => `<tr>
        <td class="strong">${esc(it.desc)}</td>
        <td class="num mono">${esc(it.qty.toLocaleString('pt-PT'))}</td>
        <td class="num mono">${esc(S.money(it.unitPrice))}</td>
        <td class="num mono muted">${it.discount > 0 ? esc(S.percent(it.discount)) : '—'}</td>
        <td class="num mono muted">${esc(S.vatLabel(it.vat))}</td>
        <td class="num mono strong">${esc(S.money(S.lineNet(it)))}</td></tr>`).join('')}</tbody>
    </table>`;
    const servicesTable = services.length ? `<table class="doc-table">
      <thead><tr><th>Serviços complementares</th><th class="num">IVA</th><th class="num">Valor</th></tr></thead>
      <tbody>${services.map((s) => `<tr><td>${esc(s.label)}</td><td class="num mono muted">${esc(S.vatLabel(s.vat))}</td><td class="num mono strong">${esc(S.money(s.amount))}</td></tr>`).join('')}</tbody>
    </table>` : '';
    const totalsBox = `<div class="doc-totals-row">
      <div class="doc-totals-note">
        ${t.discountTotal > 0 ? `<p>Desconto comercial aplicado: <strong>${esc(S.money(t.discountTotal))}</strong></p>` : ''}
        ${p.notes.trim() ? `<div class="doc-notes"><span class="doc-eyebrow">Observações</span><p>${esc(p.notes)}</p></div>` : ''}
      </div>
      <div class="doc-totals">
        <div><span>Equipamentos</span><span class="mono">${esc(S.money(t.itemsNet))}</span></div>
        ${t.servicesNet > 0 ? `<div><span>Serviços</span><span class="mono">${esc(S.money(t.servicesNet))}</span></div>` : ''}
        <div class="doc-totals__sub"><span>Total sem IVA</span><span class="mono">${esc(S.money(t.netTotal))}</span></div>
        ${t.vatRows.map((r) => `<div><span>IVA ${esc(S.vatLabel(r.rate))} <small>(base ${esc(S.money(r.base))})</small></span><span class="mono">${esc(S.money(r.vat))}</span></div>`).join('')}
        <div class="doc-totals__grand"><span>TOTAL C/ IVA</span><span class="mono">${esc(S.money(t.grandTotal))}</span></div>
      </div>
    </div>`;
    parts.push(section(++n, 'Preço', itemsTable + servicesTable + totalsBox));

    const terms = `<div class="doc-terms">
      <div><span class="doc-eyebrow">Condições comerciais</span>
        <p>Pagamento: <strong>${esc(p.conditions.payment || '—')}</strong></p>
        <p>Prazo de entrega: <strong>${esc(p.conditions.delivery || '—')}</strong></p></div>
      <div><span class="doc-eyebrow">Garantia e entrega</span>
        <p>Garantia: <strong>${esc(p.conditions.warranty || '—')}</strong></p>
        <p>Incoterm / local: <strong>${esc(p.conditions.location || '—')}</strong></p></div>
    </div>`;
    const stepsHtml = steps.length === 0 ? '' : steps.length === 1
      ? `<p class="doc-text">${esc(steps[0])}</p>`
      : `<ol class="doc-steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
    parts.push(section(++n, steps.length ? 'Condições e próximos passos' : 'Condições', terms + stepsHtml));

    parts.push(`<footer class="doc-foot">
      <div><span class="doc-eyebrow">Consultor comercial</span>
        <div class="doc-rep-name">${esc(p.commercialRep.name)}</div>
        <div class="doc-line">${esc(p.commercialRep.role)}</div>
        ${repContact ? `<div class="doc-line doc-line--muted mono">${esc(repContact)}</div>` : ''}</div>
      <div class="doc-foot__sign"><div class="doc-sign-line"></div><span class="doc-eyebrow">Aceite do cliente / carimbo</span></div>
    </footer>`);

    return `<article class="a4">${parts.join('')}</article>`;
  }

  // Miniatura escalada do A4 (a largura do contentor define a escala)
  function thumb(p, issuer, width) {
    const scale = width / 794;
    return `<div class="doc-thumb" style="width:${width}px;height:${Math.round(1123 * scale)}px">
      <div class="doc-thumb__inner" style="transform:scale(${scale})">${render(p, issuer)}</div></div>`;
  }

  // Imprime qualquer proposta (não só a ativa) através do contentor de impressão
  function print(p, issuer) {
    const root = document.getElementById('print-root');
    root.innerHTML = render(p, issuer);
    const prevTitle = document.title;
    document.title = `Proposta ${p.ref} - ${issuer.tradeName}`;
    const done = () => { document.title = prevTitle; root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    // Espera pelo logótipo e pela foto de destaque antes de abrir a janela de impressão
    const pending = [...root.querySelectorAll('img')].filter((img) => !img.complete)
      .map((img) => new Promise((res) => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); }));
    Promise.all(pending).then(() => window.setTimeout(() => window.print(), 50));
  }

  window.TS.doc = { render, thumb, print };
})();
