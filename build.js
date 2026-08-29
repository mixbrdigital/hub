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
   {{#if var}}...{{/if}}, {{#each array}}...{{this.x}}...{{/each}} */

function getValue(obj, keyPath) {
  if (keyPath === "this") return obj;
  return keyPath.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function renderEach(block, array) {
  return array
    .map((item, i) => {
      let out = block;
      out = out.replace(/\{\{#if\s+this\.([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, inner) =>
        getValue(item, key) ? inner : ""
      );
      out = out.replace(/\{\{\{this\.([\w.]+)\}\}\}/g, (_, key) => getValue(item, key) ?? "");
      out = out.replace(/\{\{this\.([\w.]+)\}\}/g, (_, key) => escapeHtml(getValue(item, key) ?? ""));
      out = out.replace(/\{\{this\}\}/g, () => escapeHtml(typeof item === "string" ? item : ""));
      out = out.replace(/\{\{comma\}\}/g, i < array.length - 1 ? "," : "");
      return out;
    })
    .join("");
}

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function render(templateStr, data) {
  let out = templateStr;

  out = out.replace(/\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, keyPath, block) => {
    const arr = getValue(data, keyPath);
    if (!Array.isArray(arr) || arr.length === 0) return "";
    return renderEach(block, arr);
  });

  out = out.replace(/\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, keyPath, inner) => {
    const val = getValue(data, keyPath);
    return val ? inner : "";
  });

  out = out.replace(/\{\{\{([\w.]+)\}\}\}/g, (_, keyPath) => getValue(data, keyPath) ?? "");

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
    inicial: d.nome ? d.nome.trim().charAt(0).toUpperCase() : "?"
  }));

  return {
    ...p,
    urlCanonica,
    caminhoAssets: "../assets", // de /public/<slug>/ para /public/assets/
    marcaCurta: p.marcaCurta || p.nome.split(" ").slice(0, 2).join(" ").toUpperCase(),
    tipoLabel: TIPO_LABELS[p.tipo] || "PRODUTO ONLINE",
    tema: { ...p.tema, corDestaqueHex: corHex },
    depoimentos: depoimentosComInicial
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
