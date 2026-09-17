/* =========================================================
   MIXBR DIGITAL — Presell (script enxuto)
   Sem tag/label do Google Ads aqui — a conversão agora é
   medida direto pela Hotmart. Mantemos só o repasse de
   utm_*/gclid/fbclid da URL de entrada pro link do produtor,
   pra não perder atribuição na ponta da Hotmart.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
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
  });

  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
});
