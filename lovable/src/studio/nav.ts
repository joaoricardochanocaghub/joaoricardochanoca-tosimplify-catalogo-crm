/* toSimplify Studio — navegação por hash e ações partilhadas pelas vistas */
import { useSyncExternalStore } from "react";
import { useRouterState } from "@tanstack/react-router";
import { S, type ClientRef, type Proposal } from "./store";
import { confirmDialog, toast } from "./ui";
import { printProposal as printDoc } from "./doc";

export const VIEWS = ["studio", "propostas", "clientes", "catalogo"] as const;
export type ViewId = (typeof VIEWS)[number];

// Último passo visitado no Studio (o botão Studio do cabeçalho volta a ele)
export const studioState = { lastStep: 1 };

export function parseHash(hash: string): { view: ViewId; params: string[] } {
  const parts = (hash || "").replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const first = parts[0] ?? "";
  const known = (VIEWS as readonly string[]).includes(first);
  return { view: known ? (first as ViewId) : "studio", params: known ? parts.slice(1) : [] };
}

const hashSubs = new Set<() => void>();
let forceTick = 0;
// O router do TanStack já acompanha o hash; usamo-lo como fonte para evitar atualizações cruzadas
export function useHash() {
  const routerHash = useRouterState({ select: (s) => s.location.hash });
  const tick = useSyncExternalStore(
    (f) => { hashSubs.add(f); return () => { hashSubs.delete(f); }; },
    () => forceTick,
    () => 0,
  );
  return `${routerHash}|${tick}`;
}

export function go(path: string) {
  const target = `#/${path}`;
  if (window.location.hash === target) { forceTick += 1; hashSubs.forEach((f) => f()); }
  else window.location.hash = target;
}

const mq = "(max-width: 720px)";
export function useIsMobile() {
  return useSyncExternalStore(
    (f) => { const m = window.matchMedia(mq); m.addEventListener("change", f); return () => m.removeEventListener("change", f); },
    () => window.matchMedia(mq).matches,
    () => false,
  );
}

// Pede confirmação antes de descartar alterações não guardadas na proposta ativa
export async function guardDirty(targetId?: string) {
  if (!S.isDirty() || S.active.id === targetId) return true;
  return confirmDialog({
    title: "Alterações por guardar",
    message: `A proposta ${S.active.ref} tem alterações que ainda não foram guardadas no histórico. Se continuar, são perdidas.`,
    confirmLabel: "Continuar sem guardar", danger: true,
  });
}
export async function newProposal(client?: ClientRef) {
  if (!(await guardDirty())) return;
  const p = S.newProposal(client);
  toast(`Nova proposta ${p.ref}${client ? ` para ${client.company}` : ""}.`, "success");
  go(`studio/${client ? 2 : 1}`);
}
export async function openInStudio(id: string, step?: number) {
  if (!(await guardDirty(id))) return;
  if (S.active.id !== id) S.openProposal(id);
  go(`studio/${step || 5}`);
}
export function printProposal(p: Proposal) { printDoc(p, S.data.issuer); }
