/* =========================================================
   MIXBR DIGITAL - Script compartilhado de todas as LPs
   A config de cada produto vem de window.__PRODUTO_TRACKING__,
   injetada pelo build.js a partir do JSON do produto.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const CONFIG = window.__PRODUTO_TRACKING__ || {};

  // Google Ads Tag
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

  function trackEvent(eventName, params = {}) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, { produto: CONFIG.produtoSlug || "unknown", ...params });
    }
  }

  // Preservação de UTMs e Parâmetros de URL
  // Nota: "sck" NÃO entra aqui de propósito — cada botão já tem um sck fixo
  // por posição (lp-header, lp-hero, lp-mid-cta, lp-oferta, lp-mobile-sticky)
  // definido direto no HTML, para sabermos qual CTA converteu na Hotmart.
  // Se "sck" entrasse na lista abaixo, um sck vindo da URL de entrada
  // sobrescreveria essa identificação por posição.
  const currentParams = new URLSearchParams(window.location.search);
  const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];

  function appendTrackingParams(rawUrl) {
    try {
      const url = new URL(rawUrl);
      trackingParams.forEach(param => {
        const val = currentParams.get(param);
        if (val) {
          url.searchParams.set(param, val);
        }
      });
      return url.toString();
    } catch (e) {
      return rawUrl;
    }
  }

  // Atualiza links de compra
  const buyLinks = document.querySelectorAll(".js-buy");

  buyLinks.forEach(link => {
    link.href = appendTrackingParams(link.href);
    link.addEventListener("click", (event) => {
      const destinationUrl = link.href;

      // Impede a navegação imediata para garantir que a conversão seja
      // registrada no Google Ads antes do usuário sair para a Hotmart.
      event.preventDefault();

      let hasNavigated = false;
      function goToDestination() {
        if (hasNavigated) return;
        hasNavigated = true;
        window.location.href = destinationUrl;
      }

      if (typeof window.gtag === "function" && CONFIG.googleAdsId && CONFIG.googleAdsConversionLabel) {
        window.gtag("event", "conversion", {
          send_to: `${CONFIG.googleAdsId}/${CONFIG.googleAdsConversionLabel}`,
          event_callback: goToDestination
        });
      }

      trackEvent("click_buy_button", {
        destination: "hotmart_checkout",
        cta_position: link.dataset.ctaPosition || "unknown"
      });

      // Timeout de segurança: caso o gtag não carregue ou o event_callback
      // nunca dispare (bloqueador de anúncios, rede lenta, etc.), navega
      // de qualquer forma após 400ms para não travar a compra do usuário.
      setTimeout(goToDestination, 400);
    });
  });

  // Rastreia clique no link "Ver todas as avaliações na Hotmart"
  document.querySelectorAll(".js-reviews-link").forEach(link => {
    link.addEventListener("click", () => {
      trackEvent("click_view_reviews", { destination: "hotmart_reviews" });
    });
  });

  // Rolagem suave
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId.length > 1) {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  // Ano Atual
  document.querySelectorAll("[data-current-year]").forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  /* =======================================================
     YOUTUBE EMBED PROTEGIDO (API)
     ======================================================= */
  if (CONFIG.youtubeVideoId) {
    let player;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = function () {
      player = new YT.Player("ytplayer", {
        videoId: CONFIG.youtubeVideoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          showinfo: 0,
          fs: 1,
          iv_load_policy: 3
        },
        events: { onStateChange: onPlayerStateChange }
      });
    };

    // Quando o vídeo termina, restaura a capa customizada em vez de deixar
    // o YouTube exibir sugestões de "próximos vídeos" do canal de origem.
    function onPlayerStateChange(event) {
      const overlay = document.getElementById("videoOverlay");
      if (event.data === YT.PlayerState.ENDED && overlay) {
        if (player && typeof player.stopVideo === "function") {
          player.stopVideo();
        }
        overlay.classList.remove("is-hidden");
      }
    }

    const overlay = document.getElementById("videoOverlay");
    if (overlay) {
      overlay.addEventListener("click", () => {
        if (player && typeof player.playVideo === "function") {
          player.playVideo();
          overlay.classList.add("is-hidden");
        }
      });
    }
  }
});
