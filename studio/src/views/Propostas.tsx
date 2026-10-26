import { useMemo, useState } from "react";
import { formatDate, formatMoney } from "../lib/format";
import { PROPOSAL_STATUSES } from "../lib/model";
import type { ProposalStatus } from "../lib/model";
import { computeTotals } from "../lib/totals";
import { useStore } from "../store/StoreProvider";
import { Icon } from "../ui/Icon";
import { useUI } from "../ui/UIProvider";

export function PropostasView({ onOpenStudio }: { onOpenStudio: () => void }) {
  const { data, dirty, newProposal, openProposal, deleteProposal, duplicateProposal, setStatus } = useStore();
  const { toast, confirm } = useUI();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ProposalStatus>("ALL");

  const rows = useMemo(
    () => data.proposals.map((proposal) => ({ proposal, total: computeTotals(proposal).grandTotal })),
    [data.proposals],
  );

  const kpis = useMemo(() => {
    const sumOf = (status: ProposalStatus) =>
      rows.filter((r) => r.proposal.status === status).reduce((acc, r) => acc + r.total, 0);
    const won = rows.filter((r) => r.proposal.status === "Aprovada").length;
    const lost = rows.filter((r) => r.proposal.status === "Recusada").length;
    return {
      open: sumOf("Enviada"),
      openCount: rows.filter((r) => r.proposal.status === "Enviada").length,
      won: sumOf("Aprovada"),
      wonCount: won,
      conversion: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter(
        ({ proposal: p }) =>
          (q === "" ||
            p.client.company.toLowerCase().includes(q) ||
            p.ref.toLowerCase().includes(q) ||
            p.subject.toLowerCase().includes(q)) &&
          (statusFilter === "ALL" || p.status === statusFilter),
      )
      .sort((a, b) => b.proposal.date.localeCompare(a.proposal.date) || b.proposal.ref.localeCompare(a.proposal.ref));
  }, [rows, query, statusFilter]);

  const okToLeave = async () =>
    dirty
      ? confirm({
          title: "Alterações por guardar",
          message:
            "A proposta aberta no Studio tem alterações que ainda não foram guardadas. Se continuar, são perdidas.",
          confirmLabel: "Continuar sem guardar",
          danger: true,
        })
      : true;

  const open = async (id: string, ref: string) => {
    if ((await okToLeave()) && openProposal(id)) {
      onOpenStudio();
      toast(`Proposta ${ref} aberta no Studio.`, "success");
    }
  };

  const create = async () => {
    if (await okToLeave()) {
      newProposal();
      onOpenStudio();
      toast("Nova proposta criada no Studio.", "info");
    }
  };

  const duplicate = (id: string) => {
    const ref = duplicateProposal(id);
    if (ref) toast(`Proposta duplicada como ${ref} (rascunho).`, "success");
  };

  const remove = async (id: string, ref: string) => {
    const ok = await confirm({
      title: "Eliminar proposta",
      message: `Eliminar a proposta ${ref} do histórico? Esta ação não pode ser anulada.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (ok) {
      deleteProposal(id);
      toast(`Proposta ${ref} eliminada.`, "info");
    }
  };

  return (
    <section className="view">
      <div className="view__head">
        <div>
          <span className="eyebrow">Comercial</span>
          <h1>
            Histórico de propostas <span className="count count--lg">{data.proposals.length}</span>
          </h1>
          <p className="muted">Gerir estados, reabrir no Studio, duplicar e eliminar.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={create}>
          <Icon name="plus" /> Nova proposta
        </button>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="kpi__label">Em aberto (enviadas)</span>
          <span className="kpi__value">{formatMoney(kpis.open)}</span>
          <span className="kpi__note">{kpis.openCount} proposta(s) · valores com IVA</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">Aprovadas</span>
          <span className="kpi__value">{formatMoney(kpis.won)}</span>
          <span className="kpi__note">{kpis.wonCount} proposta(s)</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">Taxa de conversão</span>
          <span className="kpi__value">{kpis.conversion === null ? "Sem dados" : `${kpis.conversion}%`}</span>
          <span className="kpi__note">Aprovadas / (aprovadas + recusadas)</span>
        </div>
      </div>

      <div className="filters">
        <div className="search">
          <Icon name="search" size={14} />
          <input
            type="search"
            className="input"
            placeholder="Pesquisar por cliente, referência ou assunto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="select"
          value={statusFilter}
          aria-label="Filtrar por estado"
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | ProposalStatus)}
        >
          <option value="ALL">Todos os estados</option>
          {PROPOSAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">Nenhuma proposta encontrada.</div>
      ) : (
        <div className="cards">
          {filtered.map(({ proposal: p, total }) => (
            <article key={p.id} className="card card--hover">
              <div className="card__top">
                <span className="mono card__ref">{p.ref}</span>
                <select
                  className={`status status--${p.status}`}
                  value={p.status}
                  aria-label={`Estado da proposta ${p.ref}`}
                  onChange={(e) => setStatus(p.id, e.target.value as ProposalStatus)}
                >
                  {PROPOSAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <h3 className="card__title">{p.client.company || "Sem cliente"}</h3>
              <p className="card__text">{p.subject}</p>
              <div className="card__meta">
                <span>{formatDate(p.date)}</span>
                <strong className="mono">{formatMoney(total)}</strong>
              </div>
              <div className="card__actions">
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => open(p.id, p.ref)}>
                  <Icon name="folder" size={14} /> Abrir
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => duplicate(p.id)}
                  title="Duplicar como rascunho"
                >
                  <Icon name="copy" size={14} /> Duplicar
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--sm btn--icon"
                  aria-label={`Eliminar proposta ${p.ref}`}
                  onClick={() => remove(p.id, p.ref)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
