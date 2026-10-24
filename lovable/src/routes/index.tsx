import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { StudioApp } from "@/studio/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "toSimplify Studio — Propostas comerciais" },
      { name: "description", content: "toSimplify Studio: propostas comerciais B2B de equipamento industrial, prontas a imprimir em A4/PDF." },
      { property: "og:title", content: "toSimplify Studio — Propostas comerciais" },
      { property: "og:description", content: "Crie propostas comerciais B2B de equipamento industrial e imprima-as em A4/PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// A app vive no navegador (dados em localStorage): só desenha no cliente
function Index() {
  return (
    <ClientOnly fallback={null}>
      <StudioApp />
    </ClientOnly>
  );
}
