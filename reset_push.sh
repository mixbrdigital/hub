#!/usr/bin/env bash
# Roda o build (gera paginas/, index.html e sitemap.xml a partir dos
# JSONs em /produtos) e envia pro GitHub. O Cloudflare Pages, puxando
# direto do repositório, faz o deploy automático a partir do push.

set -e

echo "→ Rodando build.js..."
node build.js

echo "→ Adicionando arquivos ao git..."
git add -A

MSG="${1:-update: build $(date '+%Y-%m-%d %H:%M')}"
git commit -m "$MSG" || echo "Nada para commitar."

echo "→ Enviando para o GitHub..."
git push

echo "✔ Push concluído. O Cloudflare Pages vai iniciar o deploy automaticamente."
