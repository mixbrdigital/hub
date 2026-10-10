/* MixBR Digital - build da vitrine
   Le cursos.json + index-template.html e gera public/index.html.
   Copia tambem img, politica-privacidade, termos, robots.txt e assets (se existirem).
   Uso: node build.js
   Previa com dados de exemplo (NAO publica): DEMO=1 node build.js  -> gera preview-demo.html */

const fs = require("fs");
const path = require("path");

const OUT = "public";
const DEMO = process.env.DEMO === "1";

const dados = JSON.parse(fs.readFileSync("cursos.json", "utf8"));
const template = fs.readFileSync("index-template.html", "utf8");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n, d) => Number(n).toFixed(d).replace(".", ",");
const fmtInt = (n) => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// dados de exemplo, so para a previa (DEMO=1)
const EXEMPLO = [
  { nota: 4.8, avaliacoes: 1230, parcelas: 12, valorParcela: 19.7, precoOriginal: 497, selo: "Certificado reconhecido" },
  { nota: 4.7, avaliacoes: 860, parcelas: 12, valorParcela: 14.9, precoOriginal: null, selo: "Garantia de 7 dias" },
  { nota: 4.9, avaliacoes: 312, parcelas: 10, valorParcela: 27.9, precoOriginal: 397, selo: "Certificado reconhecido" },
];

let contador = 0;

function card(c, i) {
  if (DEMO) c = { ...c, ...EXEMPLO[i % EXEMPLO.length] };

  const temHot = Boolean(c.hotlink);
  const href = temHot ? esc(c.hotlink) : "#";
  const attrs = temHot
    ? ' target="_blank" rel="sponsored nofollow noopener"'
    : ' data-hotlink-pendente="true"';

  let capaOk = false;
  if (c.capa) {
    capaOk = fs.existsSync(path.join("img", c.capa));
    if (!capaOk && !DEMO) console.warn("! capa nao encontrada em img/:", c.capa);
  }
  const eager = contador++ < 3 ? "eager" : "lazy";
  const capa = capaOk
    ? `<img src="/img/${esc(c.capa)}" alt="Curso ${esc(c.nome)}" loading="${eager}" decoding="async">`
    : `<div class="capa-vazia"><div class="mark">✦</div><h3>${esc(c.nome)}</h3></div>`;

  // icone de cartao (usa a cor do texto do .ico)
  const ICO_CARTAO = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>';

  const info = [];
  if (c.nota) {
    const aval = c.avaliacoes ? ` <span class="aval">(${fmtInt(c.avaliacoes)})</span>` : "";
    info.push(`<div class="linha nota"><span class="ico estrela">★</span><span>${fmt(c.nota, 1)}${aval}</span></div>`);
  }
  if (c.parcelas && c.valorParcela) {
    const de = c.precoOriginal ? ` <s>R$ ${fmt(c.precoOriginal, 2)}</s>` : "";
    info.push(`<div class="linha preco"><span class="ico">${ICO_CARTAO}</span><span><strong>${c.parcelas}x de R$ ${fmt(c.valorParcela, 2)}</strong>${de}</span></div>`);
  }
  if (c.selo) info.push(`<div class="linha selo"><span class="ico">✓</span><span>${esc(c.selo)}</span></div>`);

  return `        <a class="card" href="${href}"${attrs} aria-label="Ver curso ${esc(c.nome)}">${capa}<div class="info">${info.join("")}</div><span class="btn">Ver curso →</span></a>`;
}

let indice = 0;
const nav = dados.grupos
  .map((g) => `        <a class="chip" href="#${esc(g.id)}">${esc(g.nav)}</a>`)
  .join("\n");

// limite de cursos por secao (campo "maxPorGrupo" no cursos.json; sem o campo, mostra todos).
// Vale a ordem do JSON: os primeiros da lista entram, o resto fica de fora.
const MAX = Number(dados.maxPorGrupo) > 0 ? Number(dados.maxPorGrupo) : Infinity;
const exibidos = [];

const grupos = dados.grupos
  .map((g) => {
    const todos = dados.cursos.filter((c) => c.grupo === g.id);
    const lista = todos.slice(0, MAX);
    if (todos.length > lista.length) {
      console.log(`> ${g.id}: ${todos.length} cursos, mostrando ${lista.length}. Fora da pagina: ${todos.slice(MAX).map((c) => c.nome).join(", ")}`);
    }
    exibidos.push(...lista);
    if (!lista.length) return "";
    const cards = lista.map((c) => card(c, indice++)).join("\n");
    return `      <section class="grupo" id="${esc(g.id)}">
        <h2 class="grupo-titulo">${esc(g.titulo)}</h2>
        <p class="grupo-sub">${esc(g.sub)}</p>
        <div class="grid">
${cards}
        </div>
      </section>
`;
  })
  .join("\n");

// noindex automatico enquanto faltar hotlink em algum curso
const faltaHotlink = exibidos.some((c) => !c.hotlink);
const robots = faltaHotlink || DEMO ? '<meta name="robots" content="noindex,nofollow">' : "";

const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const hoje = new Date();
const conferido = dados.conferidoEm
  ? `Valores e avaliações conferidos em ${esc(dados.conferidoEm)}.`
  : `Atualizado em ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}.`;

// avaliacao da INSTITUICAO (ex.: perfil no Google), mostrada uma vez no topo, nunca como nota de um curso
const av = dados.avaliacaoInstituicao;
const avaliacaoHtml =
  av && av.nota
    ? `<li class="trust-av">${av.nome ? esc(av.nome) : "Instituição avaliada"}: ${fmt(av.nota, 1)} no ${esc(av.fonte || "Google")}${av.avaliacoes ? ` (${fmtInt(av.avaliacoes)} avaliações)` : ""}</li>`
    : "";

const html = template
  .replace("{{ROBOTS}}", robots)
  .replace("{{AVALIACAO}}", avaliacaoHtml)
  .replace("{{NAV}}", nav)
  .replace("{{GRUPOS}}", grupos)
  .replace("{{CONFERIDO}}", conferido);

if (DEMO) {
  fs.writeFileSync("preview-demo.html", html);
  console.log("previa gerada: preview-demo.html (dados de EXEMPLO, nao publique)");
  process.exit(0);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
fs.writeFileSync(path.join(OUT, "index.html"), html);
console.log("gerado: public/index.html (" + exibidos.length + " cursos na pagina)" + (faltaHotlink ? " [noindex: faltam hotlinks]" : ""));

for (const item of ["robots.txt", "img", "politica-privacidade", "termos", "assets"]) {
  if (fs.existsSync(item)) {
    fs.cpSync(item, path.join(OUT, item), { recursive: true });
    console.log("copiado:", item);
  }
}
