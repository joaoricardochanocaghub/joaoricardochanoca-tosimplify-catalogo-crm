# ToSimplify Studio — versão Lovable (React)

Cópia do código gerado pelo [Lovable](https://lovable.dev) no projeto "Tosimplify Studio"
(`4068fd97-d20d-42ef-86d2-e2d2760338c7`), commit `10535a0`, de 24/10/2026.

- **App publicada:** https://tosimplify-studio.lovable.app
- **Editor:** https://lovable.dev/projects/4068fd97-d20d-42ef-86d2-e2d2760338c7

> **Cópia única, sem sincronização.** As alterações feitas no Lovable não chegam aqui, e as feitas
> aqui não voltam para o Lovable. Para ter sincronização nos dois sentidos, ligue o projeto ao
> GitHub no editor do Lovable (GitHub → Connect), que cria um repositório próprio.

## O que é

Recriação em React + TypeScript (TanStack Start, Tailwind, shadcn/ui) da app HTML em `../app/`,
com o mesmo comportamento e aspeto:

| Ficheiro | Função |
|---|---|
| `src/studio/store.ts` | Modelo de dados, cálculos, IVA, `localStorage` (`tosimplify_studio_v4`), JSON |
| `src/studio/doc.tsx` | Documento A4, miniatura e impressão |
| `src/studio/App.tsx`, `nav.ts` | Cabeçalho, navegação por hash, cópia de segurança |
| `src/studio/views/` | Studio (5 passos), Propostas, Clientes, Catálogo |
| `src/styles.css` | Estilos da app original |
| `src/test/` | Testes (`vitest`) |

Os dados usam a mesma chave e o mesmo esquema da versão HTML: um JSON exportado de uma importa na outra.

## Correr localmente

Requer Node.js 22+ e [bun](https://bun.sh) (o gestor de pacotes que o Lovable usa, com `bun.lock`).

```sh
cd lovable
bun install --frozen-lockfile
bun run dev     # servidor de desenvolvimento
bun run test    # testes (vitest)
bun run build   # build de produção em .output/
```

Com npm 10, `npm install` falha neste projeto (erro interno `edgesOut` causado pelo bloco
`overrides` do `package.json`); use o bun.
