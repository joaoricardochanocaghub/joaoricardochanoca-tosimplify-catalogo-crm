import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { newId } from "../lib/format";
import type { Client } from "../lib/model";
import { isValidNif } from "../lib/nif";
import { useStore } from "../store/StoreProvider";
import { Field } from "../ui/fields";
import { Icon } from "../ui/Icon";
import { Modal } from "../ui/Modal";
import { useUI } from "../ui/UIProvider";

const EMPTY_CLIENT: Omit<Client, "id"> = {
  company: "",
  nif: "",
  sector: "",
  contact: "",
  email: "",
  address: "",
};

export function ClientesView({ onOpenStudio }: { onOpenStudio: () => void }) {
  const { data, dirty, upsertClient, deleteClient, applyClient, newProposal } = useStore();
  const { toast, confirm } = useUI();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Client | "new" | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.clients.filter(
      (c) =>
        q === "" ||
        c.company.toLowerCase().includes(q) ||
        c.nif.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        c.contact.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q),
    );
  }, [data.clients, query]);

  const startProposal = async (c: Client) => {
    if (
      dirty &&
      !(await confirm({
        title: "Alterações por guardar",
        message: "A proposta aberta no Studio tem alterações por guardar. Se criar uma nova proposta, são perdidas.",
        confirmLabel: "Criar sem guardar",
        danger: true,
      }))
    )
      return;
    newProposal({ company: c.company, nif: c.nif, contact: c.contact, email: c.email, address: c.address });
    onOpenStudio();
    toast(`Nova proposta para ${c.company}.`, "success");
  };

  const applyToActive = (c: Client) => {
    applyClient(c.id);
    onOpenStudio();
    toast(`${c.company} aplicado à proposta ativa.`, "success");
  };

  const remove = async (c: Client) => {
    const ok = await confirm({
      title: "Eliminar cliente",
      message: `Eliminar ${c.company} do diretório? As propostas já criadas não são afetadas.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (ok) {
      deleteClient(c.id);
      toast("Cliente eliminado.", "info");
    }
  };

  return (
    <section className="view">
      <div className="view__head">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>Diretório de clientes industriais</h1>
          <p className="muted">Base de dados B2B para emissão rápida de propostas.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing("new")}>
          <Icon name="userPlus" /> Adicionar cliente
        </button>
      </div>

      <div className="filters">
        <div className="search">
          <Icon name="search" size={14} />
          <input
            type="search"
            className="input"
            placeholder="Pesquisar por empresa, NIF, contacto ou setor..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">Nenhum cliente encontrado.</div>
      ) : (
        <div className="cards">
          {filtered.map((c) => (
            <article key={c.id} className="card card--hover">
              {c.sector && <span className="chip">{c.sector}</span>}
              <h3 className="card__title">{c.company}</h3>
              <p className="mono card__text">NIF: {c.nif || "—"}</p>
              <p className="card__text">
                {c.contact || "—"}
                {c.email && <> · {c.email}</>}
              </p>
              {c.address && <p className="card__text muted">{c.address}</p>}
              <div className="card__actions">
                <button type="button" className="btn btn--primary btn--sm" onClick={() => startProposal(c)}>
                  <Icon name="file" size={14} /> Nova proposta
                </button>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => applyToActive(c)}>
                  Aplicar à ativa
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon btn--sm"
                  aria-label={`Editar ${c.company}`}
                  onClick={() => setEditing(c)}
                >
                  <Icon name="edit" size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--icon btn--sm"
                  aria-label={`Eliminar ${c.company}`}
                  onClick={() => remove(c)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <ClientModal
          client={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            upsertClient(c);
            setEditing(null);
            toast(editing === "new" ? "Cliente adicionado." : "Cliente atualizado.", "success");
          }}
        />
      )}
    </section>
  );
}

function ClientModal({
  client,
  onClose,
  onSave,
}: {
  client: Client | null;
  onClose: () => void;
  onSave: (client: Client) => void;
}) {
  const [form, setForm] = useState<Omit<Client, "id">>(client ? { ...client } : EMPTY_CLIENT);
  const set = (key: keyof Omit<Client, "id">, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const nif = form.nif.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ ...form, id: client?.id ?? newId("cli") });
  };

  return (
    <Modal
      title={client ? "Editar cliente" : "Novo cliente industrial"}
      icon="userPlus"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="client-form" className="btn btn--primary">
            Guardar cliente
          </button>
        </>
      }
    >
      <form id="client-form" className="stack" onSubmit={submit}>
        <Field label="Empresa / razão social">
          <input
            type="text"
            className="input"
            required
            autoFocus
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
          />
        </Field>
        <div className="grid-2">
          <Field
            label="NIF"
            hint={nif && !isValidNif(nif) ? "NIF com dígito de controlo inválido." : undefined}
            hintTone="warn"
          >
            <input
              type="text"
              className="input input--mono"
              value={form.nif}
              onChange={(e) => set("nif", e.target.value)}
            />
          </Field>
          <Field label="Setor">
            <input
              type="text"
              className="input"
              placeholder="Usinagem CNC"
              value={form.sector}
              onChange={(e) => set("sector", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Pessoa de contacto">
            <input
              type="text"
              className="input"
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
        <Field label="Morada completa">
          <input type="text" className="input" value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
