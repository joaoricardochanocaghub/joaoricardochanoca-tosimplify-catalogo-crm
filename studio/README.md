# ToSimplify Studio — React + Vite

Implementação em React + TypeScript do design **ToSimplify Studio** (Claude Design, ficheiro
`ToSimplify Studio.html`). Substitui a PWA em `../app/`.

**Vercel:** o `vercel.json` na raiz faz a build desta pasta e publica-a na raiz do domínio. A PWA
antiga continua acessível em `/app/` (copiada na build). As duas partilham o domínio, por isso
partilham também os dados guardados no browser.

| Separador | O que faz |
|---|---|
| Catálogo | **Gerir catálogo**: lista com pesquisa e filtros, ficha editável no painel, foto (carregada ou por link), inserir na proposta ativa com quantidade e desconto. **Montar proposta**: cartões, proposta ativa ao lado, sugestões de acessórios |
| Clientes | Diretório B2B, validação de NIF, nova proposta pré-preenchida, aplicar à proposta ativa |
| Propostas | KPIs (em aberto, aprovadas, conversão), filtros, abrir no Studio, duplicar, eliminar, mudar estado |
| Studio | Editor por separadores (Geral, Texto, Técnica, Valores, Condições) com aviso do que falta, A4 ao lado e total sempre visível |
| Documentos | FT, FR, FS, NC, ND, RG, pró-forma e GT a partir de propostas aprovadas; séries, ATCUD, hash e QR AT; vistas **Todos**, **Cobranças** (antiguidade, lembretes) e **Por proposta** (sinal/percentagem); SAF-T |

> **Documentos sem validade fiscal.** O programa não é certificado pela AT: ATCUD, hash, QR e SAF-T
> são de demonstração e o rodapé indica "Processado por programa não certificado".

## Correr

Requer Node.js 20+.

```sh
cd studio
npm install
npm run dev        # desenvolvimento
npm test           # testes (vitest)
npm run build      # build estática em dist/ (caminhos relativos, serve em qualquer pasta)
```

## Dados

Guardados no `localStorage` do browser:

| Chave | Conteúdo |
|---|---|
| `tosimplify_studio_v4` | Propostas, clientes, catálogo e emitente. Mesmo esquema da app HTML: o backup JSON de uma importa na outra. O formato v3 (`tosimplify_app_data_v3`) também é lido |
| `tosimplify_fiscal_v1` | Documentos fiscais, séries e preferência de lembretes. Não entra no backup JSON |

## Estrutura

| Pasta / ficheiro | Função |
|---|---|
| `src/lib/` | Modelo de dados, normalização, totais/IVA, NIF, formatação |
| `src/store/StoreProvider.tsx` | Estado global e gravação |
| `src/ui/` | Ícones, modal, avisos/confirmação, campos |
| `src/components/` | Cabeçalho e janela JSON/backup |
| `src/studio/` | Editor, separadores e documento A4 |
| `src/views/` | Propostas e Clientes |
| `src/catalogo/` | Catálogo (gerir e montar proposta) |
| `src/documentos/` | Lógica fiscal (`fiscal.ts`), A4 fiscal, novo documento, vistas |
| `src/styles.css` | Folha de estilos do design, pela mesma ordem de cascata do protótipo |
