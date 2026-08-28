# MixBR Digital

Hub estático de landing pages de afiliado (cursos/ebooks), hospedado no
Cloudflare Pages a partir deste repositório.

## Como funciona

- `template.html` — template único usado por **todas** as LPs de produto.
- `home-template.html` — template da página inicial (vitrine dos produtos).
- `produtos/*.json` — um arquivo por produto, com todo o conteúdo da LP
  (preço, módulos, bônus, depoimentos, FAQ, link de checkout, tracking).
- `produtos-assets/<slug>/` — imagens específicas de cada produto (ex:
  `hero-mockup.webp`). São copiadas para dentro da página gerada no build.
- `assets/` — `styles.css` e `script.js` **compartilhados** por todas as LPs.
- `build.js` — lê os JSONs, aplica o template e gera:
  - `paginas/<slug>/index.html` (uma por produto)
  - `index.html` (homepage)
  - `sitemap.xml`
- `paginas/`, `index.html` (raiz) e `sitemap.xml` são **gerados** — não
  edite eles à mão, edite o JSON ou o template e rode o build de novo.

## Adicionar um produto novo

1. Copie `produtos/curso-excel.json` como base e ajuste os campos.
2. Se tiver uma imagem de hero própria, coloque em
   `produtos-assets/<slug>/hero-mockup.webp`.
3. Rode `node build.js` (ou `./reset_push.sh` pra já buildar e subir).
4. Confira em `paginas/<slug>/index.html` antes de fazer push.

## Deploy

```bash
./reset_push.sh "adiciona curso-excel"
```

Isso builda, faz commit e dá push. O Cloudflare Pages, conectado direto
ao repositório, detecta o push e publica automaticamente.

## Pendências / próximos passos

- `seo.googleSiteVerification` já preenchido no Canva (código antigo do
  GitHub Pages); definir se cada LP nova vai ter o próprio código do
  Search Console ou se basta verificar o domínio raiz uma vez.
- **Conversão do Google Ads é por produto** (decidido). O Canva mantém o
  label original real. `curso-excel.json` está com
  `"TODO_CRIAR_LABEL_PROPRIO_NO_GOOGLE_ADS"` como placeholder — crie uma
  ação de conversão própria pra ele no Google Ads e substitua antes de
  publicar, ou a conversão desse produto não vai ser registrada.
