/* =========================================================
   MIXBR DIGITAL — Presell (script enxuto)
   O clique no CTA aqui É a conversão medida no Google Ads
   (decisão explícita: sem integração Hotmart ↔ Ads configurada
   ainda, o clique pra página do produtor é o melhor proxy que
   temos hoje). Também disparamos "click_visit_producer" como
   evento informativo à parte, pra distinguir de uma conversão
   de venda de verdade quando essa integração existir.
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

    link.addEventListener("click", (event) => {
      if (typeof window.gtag === "function") {
        // Evento informativo — separado da conversão, pra podermos
        // diferenciar volume de clique de venda real no futuro.
        window.gtag("event", "click_visit_producer", {
          produto: CONFIG.produtoSlug || "unknown"
        });
      }

      if (typeof window.gtag !== "function" || !CONFIG.googleAdsId || !CONFIG.googleAdsConversionLabel) {
        return; // sem tag configurada — navega normalmente
      }

      // Segura a navegação só o tempo mínimo pra garantir que a conversão
      // seja registrada antes do usuário sair pro site do produtor.
      const destinationUrl = link.href;
      event.preventDefault();

      let hasNavigated = false;
      function goToDestination() {
        if (hasNavigated) return;
        hasNavigated = true;
        window.open(destinationUrl, "_blank", "noopener");
      }

      window.gtag("event", "conversion", {
        send_to: `${CONFIG.googleAdsId}/${CONFIG.googleAdsConversionLabel}`,
        event_callback: goToDestination
      });

      // Timeout de segurança: se o gtag não carregar ou o callback não
      // disparar (bloqueador de anúncios, rede lenta), navega assim mesmo.
      setTimeout(goToDestination, 400);
    });
  });

  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
});

