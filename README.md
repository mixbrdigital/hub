# MixBR Digital

Hub estático de landing pages de afiliado (cursos/ebooks), hospedado no
Cloudflare Pages a partir deste repositório.

## Estrutura

**Fonte (versionado, você edita):**
- `template.html` — template único usado por **todas** as LPs de produto.
- `home-template.html` — template da página inicial (vitrine dos produtos).
- `produtos/*.json` — um arquivo por produto, com todo o conteúdo da LP
  (preço, módulos, bônus, depoimentos, FAQ, link de checkout, tracking).
- `produtos-assets/<slug>/` — imagens específicas de cada produto (ex:
  `hero-mockup.webp`). São copiadas para dentro da LP gerada no build.
- `assets/` — `styles.css` e `script.js` **compartilhados** por todas as LPs.
- `static/` — arquivos que vão pro site sem passar por template
  (`robots.txt`, `politica-privacidade/index.html`).
- `build.js` — lê tudo acima e gera o site final.

**Gerado (NÃO editar à mão, nem commitar — está no `.gitignore`):**
- `public/` — é isso que o Cloudflare Pages publica. Contém:
  - `public/index.html` (homepage)
  - `public/<slug>/index.html` (uma por produto, + a imagem local dele)
  - `public/assets/` (cópia de `/assets`)
  - `public/robots.txt`, `public/politica-privacidade/` (cópia de `/static`)
  - `public/sitemap.xml`

A cada build, `public/` é **apagada e recriada do zero** — assim nunca
sobra página de produto removido/renomeado.

## Adicionar um produto novo

1. Copie `produtos/curso-excel.json` como base e ajuste os campos.
2. Se tiver uma imagem de hero própria, coloque em
   `produtos-assets/<slug>/hero-mockup.webp`.
3. Rode `node build.js` (ou `./reset_push.sh` pra já buildar e subir).
4. Confira em `public/<slug>/index.html` antes de fazer push.

## Deploy

```bash
./reset_push.sh "adiciona curso-excel"
```

Isso builda localmente (só pra você conferir), faz commit **do código-fonte**
(o `public/` não entra no commit) e dá push. O Cloudflare Pages, conectado
direto ao repositório, detecta o push e roda o próprio build lá:

- **Build command:** `node build.js`
- **Build output directory:** `public`

## Presell (/p/&lt;slug&gt;/) — modelo pra tráfego pago frio

Além da sales page completa, o hub também gera uma **presell** enxuta pra
cada produto que tiver o bloco `"presell"` no JSON. É uma página-ponte
entre o anúncio e o site oficial do produtor — não tenta vender, só
qualifica e encaminha.

**Regras que o modelo segue:**
- CTA único, direto pro site oficial do produtor (`presell.paginaOficial`
  — o hotlink com seu `ref=`, não o link de checkout).
- CSS/JS dedicados e minúsculos (`assets/presell.css`, `assets/presell.js`)
  — não carrega o `styles.css`/`script.js` grandes da sales page.
- `noindex,nofollow` sempre ativo — não deve competir no orgânico com a
  própria sales page do produto, nem ser vista como conteúdo fino
  duplicado. Por isso também **não entra no `sitemap.xml`**.
- Sem menu, sem links pra outros produtos, sem redes sociais — só o
  necessário pra informar e cumprir a Política/Termos/Contato.
- O clique no CTA dispara um evento próprio (`click_visit_producer`),
  **nunca** a tag de "conversion" do Google Ads — isso é métrica
  intermediária, não venda. A conversão de verdade só deve ser contada
  quando a compra acontecer (integração Hotmart ↔ Google Ads).

**No Google Ads:** o anúncio deve apontar pra
`mixbrdigital.com.br/p/<slug>/` (seu domínio, sempre — nunca o link de
afiliado direto no destino do anúncio, isso é motivo comum de reprovação).

**Pra adicionar presell a um produto**, inclua no JSON:
```json
"presell": {
  "title": "...", "description": "...",
  "h1": "...", "paragrafo": "...",
  "pontos": ["...", "...", "..."],
  "ctaTexto": "VER O TREINAMENTO NO SITE DO PRODUTOR",
  "paginaOficial": "https://dominio-do-produtor.com/produto?ref=SEU_ID",
  "emailContato": "contato@mixbrdigital.com.br"
}
```
Produto sem esse bloco simplesmente não gera presell — só a sales page.

## Deploy manual (Cloudflare Pages)

1. Workers & Pages → Create → Pages → Connect to Git.
2. Repositório: `mixbrdigital/hub`, branch `main`.
3. Build command: `node build.js` — Output directory: `public`.
4. Environment variable `NODE_VERSION` = `20` (ou `22`), se o build
   reclamar de versão do Node.
5. Depois do primeiro deploy: Custom domains → adicionar
   `mixbrdigital.com.br`.

## Pendências / próximos passos

- **E-mail de contato da presell é placeholder** (`contato@mixbrdigital.com.br`
  em `produtos/excel-power-bi.json` → `presell.emailContato`). Confirme
  se essa caixa existe e recebe e-mail antes de publicar — é exigência
  de transparência (ponto 7), não pode ficar quebrado.
- `seo.googleSiteVerification` já preenchido no Canva (código antigo do
  GitHub Pages); definir se cada LP nova vai ter o próprio código do
  Search Console ou se basta verificar o domínio raiz uma vez.
- **Conversão do Google Ads é por produto** (decidido). O Canva mantém o
  label original real. `curso-excel.json` está com
  `"TODO_CRIAR_LABEL_PROPRIO_NO_GOOGLE_ADS"` como placeholder — crie uma
  ação de conversão própria pra ele no Google Ads e substitua antes de
  publicar, ou a conversão desse produto não vai ser registrada.
