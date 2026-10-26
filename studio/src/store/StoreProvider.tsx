// Estado global do Studio: propostas, clientes, catálogo e emitente, gravados em localStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { newId, todayIso } from "../lib/format";
import {
  createProposal,
  loadData,
  nextRef,
  normalizeData,
  normalizeProposal,
  saveData,
} from "../lib/model";
import type {
  CatalogItem,
  Client,
  ClientRef,
  Issuer,
  LineItem,
  Proposal,
  ProposalStatus,
  StudioData,
} from "../lib/model";

export interface StoreValue {
  data: StudioData;
  active: Proposal;
  /** A proposta ativa difere da versão guardada no histórico (ou ainda não foi guardada). */
  dirty: boolean;
  storageError: boolean;
  updateActive: (fn: (p: Proposal) => Proposal) => void;
  newProposal: (client?: ClientRef) => void;
  openProposal: (id: string) => boolean;
  saveActive: () => { created: boolean; duplicateRef: boolean };
  deleteProposal: (id: string) => void;
  duplicateProposal: (id: string) => string | null;
  setStatus: (id: string, status: ProposalStatus) => void;
  importProposal: (raw: unknown) => void;
  upsertClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  applyClient: (id: string) => string | null;
  upsertCatalogItem: (item: CatalogItem) => void;
  deleteCatalogItem: (id: string) => void;
  applyCatalogItem: (id: string, opts?: { qty?: number; discount?: number }) => string | null;
  setIssuer: (issuer: Issuer) => void;
  exportBackup: () => string;
  restoreBackup: (raw: unknown) => void;
}

const StoreContext = createContext<StoreValue | null>(null);
const clone = <T,>(v: T): T => structuredClone(v);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StudioData>(() => loadData());
  const [storageError, setStorageError] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  // gravação com atraso curto, e imediata ao sair da página
  useEffect(() => {
    const timer = window.setTimeout(() => setStorageError(!saveData(dataRef.current)), 250);
    return () => window.clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    const flush = () => {
      saveData(dataRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const updateActive = useCallback((fn: (p: Proposal) => Proposal) => {
    setData((d) => ({ ...d, activeProposal: fn(d.activeProposal) }));
  }, []);

  const newProposal = useCallback((client?: ClientRef) => {
    setData((d) => ({
      ...d,
      activeProposal: createProposal({
        existing: d.proposals,
        rep: d.activeProposal.commercialRep,
        client,
      }),
    }));
  }, []);

  const openProposal = useCallback((id: string) => {
    const found = dataRef.current.proposals.find((p) => p.id === id);
    if (!found) return false;
    setData((d) => ({ ...d, activeProposal: clone(found) }));
    return true;
  }, []);

  const saveActive = useCallback(() => {
    const current = dataRef.current;
    const active = current.activeProposal;
    const exists = current.proposals.some((p) => p.id === active.id);
    const duplicateRef = current.proposals.some(
      (p) => p.id !== active.id && p.ref.trim() !== "" && p.ref === active.ref,
    );
    setData((d) => {
      const snapshot = clone(d.activeProposal);
      const inHistory = d.proposals.some((p) => p.id === snapshot.id);
      return {
        ...d,
        proposals: inHistory
          ? d.proposals.map((p) => (p.id === snapshot.id ? snapshot : p))
          : [snapshot, ...d.proposals],
      };
    });
    return { created: !exists, duplicateRef };
  }, []);

  const deleteProposal = useCallback((id: string) => {
    setData((d) => ({ ...d, proposals: d.proposals.filter((p) => p.id !== id) }));
  }, []);

  const duplicateProposal = useCallback((id: string) => {
    const source = dataRef.current.proposals.find((p) => p.id === id);
    if (!source) return null;
    const date = todayIso();
    const ref = nextRef(dataRef.current.proposals, date);
    const copy: Proposal = {
      ...clone(source),
      id: newId("p"),
      ref,
      date,
      status: "Rascunho",
      items: source.items.map((it) => ({ ...it, id: newId("it") })),
      services: source.services.map((sv) => ({ ...sv, id: newId("sv") })),
      machine: {
        ...source.machine,
        specs: source.machine.specs.map((sp) => ({ ...sp, id: newId("sp") })),
      },
    };
    setData((d) => ({ ...d, proposals: [copy, ...d.proposals] }));
    return ref;
  }, []);

  const setStatus = useCallback((id: string, status: ProposalStatus) => {
    setData((d) => ({
      ...d,
      proposals: d.proposals.map((p) => (p.id === id ? { ...p, status } : p)),
      activeProposal: d.activeProposal.id === id ? { ...d.activeProposal, status } : d.activeProposal,
    }));
  }, []);

  const importProposal = useCallback((raw: unknown) => {
    const proposal = normalizeProposal(raw);
    setData((d) => ({ ...d, activeProposal: { ...proposal, id: newId("p") } }));
  }, []);

  const upsertClient = useCallback((client: Client) => {
    setData((d) => ({
      ...d,
      clients: d.clients.some((c) => c.id === client.id)
        ? d.clients.map((c) => (c.id === client.id ? client : c))
        : [client, ...d.clients],
    }));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setData((d) => ({ ...d, clients: d.clients.filter((c) => c.id !== id) }));
  }, []);

  const applyClient = useCallback((id: string) => {
    const client = dataRef.current.clients.find((c) => c.id === id);
    if (!client) return null;
    setData((d) => ({
      ...d,
      activeProposal: {
        ...d.activeProposal,
        client: {
          company: client.company,
          nif: client.nif,
          contact: client.contact,
          email: client.email,
          address: client.address,
        },
      },
    }));
    return client.company;
  }, []);

  const upsertCatalogItem = useCallback((item: CatalogItem) => {
    setData((d) => ({
      ...d,
      catalog: d.catalog.some((c) => c.id === item.id)
        ? d.catalog.map((c) => (c.id === item.id ? item : c))
        : [item, ...d.catalog],
    }));
  }, []);

  const deleteCatalogItem = useCallback((id: string) => {
    setData((d) => ({ ...d, catalog: d.catalog.filter((c) => c.id !== id) }));
  }, []);

  // Insere um item do catálogo na proposta ativa. Uma Máquina passa também a equipamento principal.
  const applyCatalogItem = useCallback((id: string, opts?: { qty?: number; discount?: number }) => {
    const item = dataRef.current.catalog.find((c) => c.id === id);
    if (!item) return null;
    setData((d) => {
      const p = d.activeProposal;
      const line: LineItem = {
        id: newId("it"),
        desc: item.name,
        qty: opts?.qty || 1,
        unitPrice: item.basePrice,
        discount: opts?.discount || 0,
        vat: item.vat,
      };
      // a linha vazia de uma proposta nova é substituída em vez de ficar acumulada
      const onlyPlaceholder =
        p.items.length === 1 && p.items[0].unitPrice === 0 && p.items[0].discount === 0;
      const items = onlyPlaceholder ? [line] : [...p.items, line];
      const machine =
        item.category === "Máquina"
          ? {
              name: item.name,
              desc: item.description,
              image: item.image || "",
              specs: item.specs.map((sp) => ({ ...sp, id: newId("sp") })),
            }
          : p.machine;
      return { ...d, activeProposal: { ...p, items, machine } };
    });
    return item.category === "Máquina"
      ? `${item.sku || item.name} definido como equipamento principal e adicionado aos itens.`
      : `${item.sku || item.name} adicionado aos itens.`;
  }, []);

  const setIssuer = useCallback((issuer: Issuer) => {
    setData((d) => ({ ...d, issuer }));
  }, []);

  const exportBackup = useCallback(() => JSON.stringify(dataRef.current, null, 2), []);

  const restoreBackup = useCallback((raw: unknown) => {
    setData(normalizeData(raw));
  }, []);

  const dirty = useMemo(() => {
    const saved = data.proposals.find((p) => p.id === data.activeProposal.id);
    return !saved || JSON.stringify(saved) !== JSON.stringify(data.activeProposal);
  }, [data.proposals, data.activeProposal]);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      active: data.activeProposal,
      dirty,
      storageError,
      updateActive,
      newProposal,
      openProposal,
      saveActive,
      deleteProposal,
      duplicateProposal,
      setStatus,
      importProposal,
      upsertClient,
      deleteClient,
      applyClient,
      upsertCatalogItem,
      deleteCatalogItem,
      applyCatalogItem,
      setIssuer,
      exportBackup,
      restoreBackup,
    }),
    [
      data,
      dirty,
      storageError,
      updateActive,
      newProposal,
      openProposal,
      saveActive,
      deleteProposal,
      duplicateProposal,
      setStatus,
      importProposal,
      upsertClient,
      deleteClient,
      applyClient,
      upsertCatalogItem,
      deleteCatalogItem,
      applyCatalogItem,
      setIssuer,
      exportBackup,
      restoreBackup,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore tem de ser usado dentro de <StoreProvider>");
  return ctx;
}
