/* =========================================================
   MIXBR DIGITAL — Presell (script enxuto)
   Importante: o clique aqui NÃO é uma venda — é só a saída
   pro site do produtor. Por isso disparamos um evento próprio
   ("click_visit_producer"), nunca a tag de "conversion" do
   Google Ads. A conversão de verdade só deve ser contada
   quando a compra acontecer de fato (integração Hotmart ↔
   Google Ads, ou conversão de importação, fora desta página).
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const CONFIG = window.__PRODUTO_TRACKING__ || {};

  if (CONFIG.googleAdsId) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.googleAdsId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", CONFIG.googleAdsId);
  }

  // Preserva UTMs/gclid/fbclid da URL de entrada pro link do produtor,
  // pra fechar o funil: Google Ads → entrada na presell → clique → produtor.
  const currentParams = new URLSearchParams(window.location.search);
  const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];

  function appendTrackingParams(rawUrl) {
    try {
      const url = new URL(rawUrl);
      trackingParams.forEach((param) => {
        const val = currentParams.get(param);
        if (val) url.searchParams.set(param, val);
      });
      return url.toString();
    } catch (e) {
      return rawUrl;
    }
  }

  document.querySelectorAll(".js-goto-producer").forEach((link) => {
    link.href = appendTrackingParams(link.href);
    link.addEventListener("click", () => {
      if (typeof window.gtag === "function") {
        // Evento próprio — métrica intermediária, não a venda.
        window.gtag("event", "click_visit_producer", {
          produto: CONFIG.produtoSlug || "unknown"
        });
      }
    });
  });

  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
});
