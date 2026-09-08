# MixBR Digital

Hub estático de **presells** de afiliado (cursos/ebooks), hospedado no
Cloudflare Pages a partir deste repositório.

Cada produto tem uma única página: uma presell enxuta em `/p/<slug>/` que
qualifica o visitante (vindo de tráfego pago) e encaminha pro site oficial
do produtor. O hub **não hospeda sales pages completas** — isso é
responsabilidade do produtor/Hotmart.

## Estrutura

**Fonte (versionado, você edita):**
- `template-presell.html` — template único usado por **todas** as presells.
- `home-template.html` — template da página inicial (vitrine dos produtos).
- `produtos/*.json` — um arquivo por produto, com todo o conteúdo da
  presell (textos, preço pra exibir na home, link oficial do produtor,
  tracking do Google Ads).
- `produtos-assets/<slug>/` — imagem(ns) específica(s) de cada produto
  (ex: `hero-mockup.webp`). São copiadas pra dentro da presell gerada.
- `assets/` — CSS/JS **compartilhados**:
  - `presell.css` / `presell.js` — usados por todas as presells.
  - `home.css` — usado só pela homepage.
- `static/` — arquivos que vão pro site sem passar por template
  (`robots.txt`, `politica-privacidade/`, `termos/`).
- `build.js` — lê tudo acima e gera o site final.

**Gerado (NÃO editar à mão, nem commitar — está no `.gitignore`):**
- `public/` — é isso que o Cloudflare Pages publica. Contém:
  - `public/index.html` (homepage)
  - `public/p/<slug>/index.html` (presell de cada produto, + imagem local)
  - `public/assets/` (cópia de `/assets`)
  - `public/robots.txt`, `public/politica-privacidade/`, `public/termos/`
    (cópia de `/static`)
  - `public/sitemap.xml`

A cada build, `public/` é **apagada e recriada do zero** — assim nunca
sobra página de produto removido/renomeado.

> **Sobre `template.html` (sales page completa):** o `build.js` sabe gerar
> uma página de vendas completa por produto (campo `paginaCompleta` no
> JSON diferente de `false`), mas esse recurso não está em uso hoje —
> nenhum produto usa. Por isso `template.html`, o `styles.css` e o
> `script.js` antigos foram removidos do repositório, e o `build.js` só
> tenta ler `template.html` se algum produto realmente precisar dele. Se
> um dia quiser reativar essa página completa, vai precisar recriar esses
> três arquivos.

## Adicionar um produto novo

1. Copie `produtos/curso-portugues-concursos.json` como base e ajuste os
   campos (todos dentro do bloco `"presell"`, mais `slug`, `nome`,
   `produtor`, `plataforma`, `tema`, `hero.lead`, `oferta.precoAtual`).
2. Sempre inclua `"paginaCompleta": false` — é isso que faz o produto
   gerar só a presell, sem tentar montar sales page completa.
3. Coloque a imagem de capa em `produtos-assets/<slug>/hero-mockup.webp`
   e referencie o nome exato do arquivo em `presell.heroImagem`.
4. Rode `node build.js` e confira em `public/p/<slug>/index.html` antes
   de subir.

## Deploy

```bash
./reset_push.sh "adiciona novo-produto"
```

Isso builda localmente (só pra você conferir), faz commit **do
código-fonte** (o `public/` não entra no commit) e dá push. O Cloudflare
Pages, conectado direto ao repositório, detecta o push e roda o próprio
build lá:

- **Build command:** `node build.js`
- **Build output directory:** `public`

## Presell (`/p/<slug>/`) — modelo pra tráfego pago frio

A presell é uma página-ponte entre o anúncio e o site oficial do
produtor — não tenta vender, só qualifica e encaminha.

**Regras que o modelo segue:**
- CTA único, direto pro site oficial do produtor
  (`presell.paginaOficial` — o **hotlink** do Hotmart com seu `ref=`,
  nunca o link de checkout direto).
- `noindex,nofollow` sempre ativo — não compete no orgânico, não entra
  no `sitemap.xml`.
- Sem menu, sem links pra outros produtos — só o necessário pra informar
  e cumprir Política/Termos/Contato no rodapé.
- O clique no CTA dispara **duas** coisas via `presell.js`:
  1. Um evento informativo (`click_visit_producer`), sempre.
  2. A conversão de verdade do Google Ads (`gtag('event','conversion',...)`
     usando `tracking.googleAdsConversionLabel`) — **decisão tomada**: sem
     integração Hotmart ↔ Google Ads configurada, contamos o clique como
     a conversão mensurável disponível hoje.
- O link abre em **nova aba** (`window.open`, respeitando o
  `target="_blank"`) — a presell nunca "some" da aba original.
- Seções da presell (métricas, recomendação, tags, "o que aprende",
  estrutura numerada, bônus, faixa de dor) são todas **opcionais** — só
  aparecem se o campo correspondente existir no JSON. Produto sem
  determinado dado real não deve ter o dado inventado.
- **Sitelinks do Google Ads** apontam pras âncoras já existentes no HTML:
  `#o-que-aprende`, `#estrutura`, `#bonus` (se o produto tiver),
  `#acessar`.

**No Google Ads:** o anúncio deve apontar pra
`mixbrdigital.com.br/p/<slug>/` (seu domínio, sempre — nunca o link de
afiliado direto no destino do anúncio, isso é motivo comum de reprovação).

**Campos do bloco `"presell"`** (veja `produtos/curso-portugues-concursos.json`
como referência completa — a maioria é opcional):
```json
"presell": {
  "title": "...", "description": "...",
  "h1": "...", "paragrafo": "...",
  "heroImagem": "hero-mockup.webp",
  "seloTexto": "Foco em prova",
  "metrics": ["...", "..."],
  "recomendacao": "...",
  "pontos": ["...", "..."],
  "ctaTexto": "...",
  "dorTexto": "...",
  "tags": ["...", "..."],
  "cardsKicker": "...", "cardsTitulo": "...", "cardsTexto": "...",
  "cards": [{"titulo": "...", "texto": "..."}],
  "estruturaKicker": "...", "estruturaTitulo": "...", "estruturaTexto": "...",
  "estrutura": [{"titulo": "...", "texto": "..."}],
  "bonus": {"kicker": "...", "titulo": "...", "texto": "..."},
  "finalTitulo": "...", "finalTexto": "...",
  "paginaOficial": "https://go.hotmart.com/SEU_ID?redirectionUrl=...",
  "emailContato": "contato@mixbrdigital.com.br"
}
```

## Deploy manual (Cloudflare Pages) — primeira configuração

1. Workers & Pages → Create → Pages → Connect to Git.
2. Repositório: `mixbrdigital/hub`, branch `main`.
3. Build command: `node build.js` — Output directory: `public`.
4. Environment variable `NODE_VERSION` = `20` (ou `22`), se o build
   reclamar de versão do Node.
5. Depois do primeiro deploy: Custom domains → adicionar
   `mixbrdigital.com.br`.

## Se o site parar de atualizar depois de um push

Já aconteceu do build quebrar **silenciosamente** no Cloudflare (ex:
arquivo que o `build.js` esperava foi apagado do repo), fazendo o site
continuar servindo a última versão que builda com sucesso, mesmo depois
de vários pushes corretos. Se uma mudança não aparecer no ar depois do
deploy:

1. Confira **Workers & Pages → seu projeto → Deployments** — o deploy
   mais recente terminou com "Success" ou falhou?
2. Se falhou, abre o log de build e lê o erro — geralmente aponta o
   arquivo/campo que está faltando.
3. Rodar `node build.js` local **antes** de cada push pega a maioria
   desses erros de antemão.
