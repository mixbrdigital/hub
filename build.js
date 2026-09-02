#!/usr/bin/env node
/* =========================================================
   MIXBR DIGITAL - Build estático
   Lê /produtos/*.json, aplica template.html e gera TUDO
   dentro de /public/ (essa é a pasta que o Cloudflare Pages
   deve apontar como "Build output directory"):

   /public/index.html            (homepage)
   /public/<slug>/index.html     (uma LP por produto)
   /public/sitemap.xml
   /public/robots.txt            (copiado de /static/)
   /public/politica-privacidade/ (copiado de /static/)
   /public/assets/               (copiado de /assets/, compartilhado)

   /public/ é sempre apagada e regenerada do zero a cada build,
   pra nunca sobrar lixo de produto removido/renomeado.
   =========================================================
   Uso: node build.js
   ========================================================= */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DOMINIO = "https://mixbrdigital.com.br";
const PRODUTOS_DIR = path.join(ROOT, "produtos");
const PRODUTOS_ASSETS_DIR = path.join(ROOT, "produtos-assets");
const ASSETS_DIR = path.join(ROOT, "assets");
const STATIC_DIR = path.join(ROOT, "static");
const TEMPLATE_PATH = path.join(ROOT, "template.html");
const HOME_TEMPLATE_PATH = path.join(ROOT, "home-template.html");
const PUBLIC_DIR = path.join(ROOT, "public");

const TIPO_LABELS = { curso: "CURSO ONLINE", ebook: "EBOOK DIGITAL" };

/* ---------- Motor de template minimalista (mustache-like) ---------- */
/* Suporta: {{var}}, {{var.sub}}, {{{var}}} (raw/HTML),
   {{#if var}}...{{/if}}, {{#each array}}...{{this.x}}...{{/each}},
   incluindo #each/#if ANINHADOS (ex: grupo de módulos → módulos). */

function getValue(obj, keyPath) {
  if (keyPath === "this") return obj;
  if (keyPath.startsWith("this.")) keyPath = keyPath.slice(5);
  return keyPath.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Encontra o {{/each}} ou {{/if}} que fecha o bloco aberto em `openIdx`,
// contando aberturas/fechamentos do MESMO tipo de tag pra lidar com aninhamento.
function findBlockEnd(str, fromIdx, openTagRe, closeTag) {
  let depth = 1;
  let pos = fromIdx;
  while (pos < str.length) {
    openTagRe.lastIndex = pos;
    const openMatch = openTagRe.exec(str);
    const closeIdx = str.indexOf(closeTag, pos);
    if (closeIdx === -1) return -1; // malformado
    if (openMatch && openMatch.index < closeIdx) {
      depth++;
      pos = openMatch.index + openMatch[0].length;
    } else {
      depth--;
      if (depth === 0) return closeIdx;
      pos = closeIdx + closeTag.length;
    }
  }
  return -1;
}

function processEachBlocks(str, data) {
  const openRe = /\{\{#each\s+([\w.]+)\}\}/;
  let result = "";
  let rest = str;
  while (true) {
    const m = rest.match(openRe);
    if (!m) {
      result += rest;
      break;
    }
    const keyPath = m[1];
    const afterOpenIdx = m.index + m[0].length;
    const scanRe = /\{\{#each\s+[\w.]+\}\}/g;
    const closeIdx = findBlockEnd(rest, afterOpenIdx, scanRe, "{{/each}}");
    if (closeIdx === -1) {
      result += rest; // malformado — não trava o build
      break;
    }
    result += rest.slice(0, m.index);
    const innerBlock = rest.slice(afterOpenIdx, closeIdx);
    const arr = getValue(data, keyPath);
    if (Array.isArray(arr)) {
      arr.forEach((item, idx) => {
        const itemBlock = innerBlock.replace(/\{\{comma\}\}/g, idx < arr.length - 1 ? "," : "");
        result += render(itemBlock, item);
      });
    }
    rest = rest.slice(closeIdx + "{{/each}}".length);
  }
  return result;
}

function processIfBlocks(str, data) {
  const openRe = /\{\{#if\s+([\w.]+)\}\}/;
  let result = "";
  let rest = str;
  while (true) {
    const m = rest.match(openRe);
    if (!m) {
      result += rest;
      break;
    }
    const keyPath = m[1];
    const afterOpenIdx = m.index + m[0].length;
    const scanRe = /\{\{#if\s+[\w.]+\}\}/g;
    const closeIdx = findBlockEnd(rest, afterOpenIdx, scanRe, "{{/if}}");
    if (closeIdx === -1) {
      result += rest;
      break;
    }
    result += rest.slice(0, m.index);
    const innerBlock = rest.slice(afterOpenIdx, closeIdx);
    const val = getValue(data, keyPath);
    if (val) result += render(innerBlock, data);
    rest = rest.slice(closeIdx + "{{/if}}".length);
  }
  return result;
}

function render(templateStr, data) {
  let out = templateStr;
  out = processEachBlocks(out, data);
  out = processIfBlocks(out, data);

  // {{{var}}} raw (sem escape, permite HTML como <em>, <strong>, <br>)
  out = out.replace(/\{\{\{([\w.]+)\}\}\}/g, (_, keyPath) => getValue(data, keyPath) ?? "");

  // {{var}} com escape
  out = out.replace(/\{\{([\w.]+)\}\}/g, (_, keyPath) => {
    const val = getValue(data, keyPath);
    return val == null ? "" : escapeHtml(String(val));
  });

  return out;
}

/* ---------- Utilitário: copiar pasta inteira recursivamente ---------- */

function copiarPasta(origem, destino) {
  if (!fs.existsSync(origem)) return;
  fs.mkdirSync(destino, { recursive: true });
  for (const entrada of fs.readdirSync(origem, { withFileTypes: true })) {
    const from = path.join(origem, entrada.name);
    const to = path.join(destino, entrada.name);
    if (entrada.isDirectory()) {
      copiarPasta(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

/* ---------- Carrega produtos ---------- */

function carregarProdutos() {
  const arquivos = fs.readdirSync(PRODUTOS_DIR).filter((f) => f.endsWith(".json"));
  return arquivos
    .map((f) => JSON.parse(fs.readFileSync(path.join(PRODUTOS_DIR, f), "utf8")))
    .filter((p) => p.ativo !== false)
    .map((p) => enriquecerProduto(p));
}

function enriquecerProduto(p) {
  const urlCanonica = `${DOMINIO}/${p.slug}/`;
  const corHex = (p.tema?.corDestaque || "#1fbf7a").replace("#", "");
  const depoimentosComInicial = (p.depoimentos || []).map((d) => ({
    ...d,
    inicial: d.nome ? d.nome.trim().charAt(0).toUpperCase() : "?",
    estrelas: d.estrelas || "★★★★★"
  }));

  if (!p.marcaCurta) {
    throw new Error(`Produto "${p.slug}" não tem "marcaCurta" definida no JSON — campo obrigatório.`);
  }

  // Schema.org gerado via JSON.stringify (escapa aspas/HTML corretamente,
  // ao contrário de templating de texto puro).
  const schemaCourse = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: p.nome,
    description: p.seo?.schemaDescription || p.seo?.description,
    provider: { "@type": "Organization", name: p.produtor },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      ...(p.cargaHorariaISO ? { courseWorkload: p.cargaHorariaISO } : {})
    },
    offers: {
      "@type": "Offer",
      price: `${p.oferta.precoAtual}.00`,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: urlCanonica
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: p.avaliacao.media,
      reviewCount: p.avaliacao.quantidade,
      bestRating: "5",
      worstRating: "1"
    }
  };

  const schemaFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (p.faq || []).map((f) => ({
      "@type": "Question",
      name: f.pergunta,
      acceptedAnswer: { "@type": "Answer", text: f.resposta.replace(/<\/?strong>/g, "") }
    }))
  };

  return {
    ...p,
    urlCanonica,
    caminhoAssets: "../assets", // de /public/<slug>/ para /public/assets/
    nomeCurto: p.nomeCurto || p.nome,
    tipoLabel: TIPO_LABELS[p.tipo] || "PRODUTO ONLINE",
    tema: { ...p.tema, corDestaqueHex: corHex, corFundo: p.tema?.corFundo || "#111111" },
    depoimentos: depoimentosComInicial,
    schemaCourseJson: `<script type="application/ld+json">\n${JSON.stringify(schemaCourse, null, 2)}\n</script>`,
    schemaFaqJson: `<script type="application/ld+json">\n${JSON.stringify(schemaFaq, null, 2)}\n</script>`
  };
}

/* ---------- Gera as páginas de produto ---------- */

function gerarPaginasProdutos(produtos) {
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

  produtos.forEach((produto) => {
    const dirSaida = path.join(PUBLIC_DIR, produto.slug);
    fs.mkdirSync(dirSaida, { recursive: true });

    // Copia os assets locais do produto (ex: hero-mockup.webp) de
    // /produtos-assets/<slug>/ para dentro da pasta gerada.
    copiarPasta(path.join(PRODUTOS_ASSETS_DIR, produto.slug), dirSaida);

    const html = render(template, produto);
    fs.writeFileSync(path.join(dirSaida, "index.html"), html, "utf8");
    console.log(`✔ /public/${produto.slug}/index.html`);
  });
}

/* ---------- Gera a homepage (vitrine) ---------- */

function gerarHomepage(produtos) {
  if (!fs.existsSync(HOME_TEMPLATE_PATH)) {
    console.warn("⚠ home-template.html não encontrado — pulei a geração da homepage.");
    return;
  }
  const homeTemplate = fs.readFileSync(HOME_TEMPLATE_PATH, "utf8");
  const html = render(homeTemplate, { produtos, totalProdutos: produtos.length });
  fs.writeFileSync(path.join(PUBLIC_DIR, "index.html"), html, "utf8");
  console.log("✔ /public/index.html (homepage)");
}

/* ---------- Gera o sitemap.xml ---------- */

function gerarSitemap(produtos) {
  const hoje = new Date().toISOString().slice(0, 10);
  const urls = [
    `  <url><loc>${DOMINIO}/</loc><lastmod>${hoje}</lastmod><priority>1.0</priority></url>`,
    `  <url><loc>${DOMINIO}/politica-privacidade/</loc><lastmod>${hoje}</lastmod><priority>0.3</priority></url>`,
    ...produtos.map(
      (p) => `  <url><loc>${p.urlCanonica}</loc><lastmod>${hoje}</lastmod><priority>0.8</priority></url>`
    )
  ].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");
  console.log("✔ /public/sitemap.xml");
}

/* ---------- Main ---------- */

function main() {
  // Limpa /public/ do zero pra nunca sobrar produto removido/renomeado.
  fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  // Copia arquivos compartilhados e estáticos.
  copiarPasta(ASSETS_DIR, path.join(PUBLIC_DIR, "assets"));
  copiarPasta(STATIC_DIR, PUBLIC_DIR);
  console.log("✔ /public/assets + arquivos estáticos copiados");

  const produtos = carregarProdutos();
  if (produtos.length === 0) {
    console.warn("⚠ Nenhum produto ativo encontrado em /produtos.");
    return;
  }
  gerarPaginasProdutos(produtos);
  gerarHomepage(produtos);
  gerarSitemap(produtos);
  console.log(`\nBuild concluído: ${produtos.length} produto(s).`);
}

main();
