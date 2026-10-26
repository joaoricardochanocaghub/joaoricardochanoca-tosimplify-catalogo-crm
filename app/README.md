# ToSimplify Studio

PWA em HTML/CSS/JS puro para criar propostas comerciais B2B de equipamento industrial. Implementa os wireframes escolhidos em `project/ToSimplify Wireframes.dc.html`.

| Ecrã | Wireframe | O que faz |
|---|---|---|
| Studio | 1b + 3d + 2g | Assistente em 5 passos (Cliente → Equipamento → Valores → Condições → Rever) com pré-visualização A4 ao lado |
| Valores (passo 3) | 3d | Grelha tipo folha de cálculo, Enter desce como no Excel, arrastar a pega para reordenar, totais sempre visíveis |
| Documento A4 | 2g | Faixa de cabeçalho, secções numeradas, caixa de totais, assinatura e carimbo |
| Propostas | 1e | Quadro por estado, arrastar cartões para mudar o estado, totais por coluna, alerta de validade a expirar |
| Propostas (mobile) | 3i | Lista filtrável e ecrã de detalhe com botões grandes Aprovada / Recusada, sem arrastar |
| Clientes | 1i | Lista e perfil com KPIs e histórico de propostas, editar, nova proposta pré-preenchida |
| Catálogo | 1k | Tabela densa com linhas que expandem e especificações editáveis na linha |

## Executar

Servir a pasta `app/` como estática (o service worker precisa de `http://` ou `https://`):

```bash
cd app
python3 -m http.server 8080
# abrir http://localhost:8080
```

Netlify ou GitHub Pages: publicar a pasta `app/` tal como está. Não há passo de build.

Vercel: a raiz do domínio passou a servir a nova app React (`studio/`). Esta versão continua publicada em `/app/`.

## Dados

- Guardados em `localStorage` com a chave `tosimplify_studio_v4`, o mesmo esquema da versão anterior: os dados existentes carregam sem migração. O formato v3 (`tosimplify_app_data_v3`) também é importado.
- Campo novo `statusDate` em cada proposta (data da última mudança de estado), usado em "Enviada há N dias".
- Botão **JSON** no cabeçalho:
  - **Exportar JSON**: cópia de segurança completa.
  - **Juntar JSON**: acrescenta clientes (por NIF), produtos (por SKU) e propostas de um ficheiro aos dados atuais, sem apagar nada; ignora o que já existe e renumera referências repetidas.
  - **Importar JSON**: substitui todos os dados.

## Estrutura

| Ficheiro | Função |
|---|---|
| `index.html` | Página única, carrega os scripts por ordem |
| `css/app.css` | Tokens da identidade visual, componentes, A4 e regras de impressão |
| `js/store.js` | Modelo de dados, normalização, totais/IVA, persistência |
| `js/ui.js` | Escape de HTML, ícones, toasts, modais |
| `js/doc.js` | Documento A4, miniatura e impressão |
| `js/app.js` | Cabeçalho, router por hash (`#/studio/3`, `#/propostas/:id`…), cópia de segurança |
| `js/views/*.js` | Vistas Studio, Propostas, Clientes e Catálogo |
| `sw.js`, `manifest.webmanifest` | PWA: instalação e uso offline |

O PDF gera-se com **Imprimir / PDF** (no diálogo do navegador, escolher "Guardar como PDF"). Em iOS, "Partilhar PDF" abre o mesmo diálogo, que permite partilhar.
