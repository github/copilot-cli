#!/bin/bash
##############################################################################
# Script de Verificação de Performance - TreinadorDavid.com
# Descrição: Verifica métricas de performance do site
# Autor: Treinador David
# Versão: 1.0.0
##############################################################################

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Análise de Performance - Treinador David${NC}"
echo -e "${GREEN}========================================${NC}\n"

SITE_URL="${1:-https://treinadordavid.com}"

echo -e "${BLUE}Site analisado: $SITE_URL${NC}\n"

# 1. Verificar tamanho de arquivos CSS
echo -e "${YELLOW}[1/5] Verificando tamanho de CSS...${NC}"
if [ -f "./wp-content/treinadordavid-core.css" ]; then
    SIZE=$(du -h ./wp-content/treinadordavid-core.css | cut -f1)
    echo -e "${GREEN}✓ treinadordavid-core.css: $SIZE${NC}"
else
    echo -e "${RED}✗ Arquivo CSS principal não encontrado${NC}"
fi

# 2. Verificar fontes
echo -e "\n${YELLOW}[2/5] Verificando fontes...${NC}"
FONTS_DIR="./wp-content/themes/hello-child-treinadordavid/fonts"
if [ -d "$FONTS_DIR" ]; then
    FONT_COUNT=$(find "$FONTS_DIR" -type f \( -name "*.woff2" -o -name "*.woff" \) | wc -l)
    FONT_SIZE=$(du -sh "$FONTS_DIR" | cut -f1)
    echo -e "${GREEN}✓ Fontes encontradas: $FONT_COUNT arquivos ($FONT_SIZE)${NC}"

    # Listar fontes WOFF2 (formato mais otimizado)
    WOFF2_COUNT=$(find "$FONTS_DIR" -type f -name "*.woff2" | wc -l)
    echo -e "${GREEN}✓ Fontes WOFF2 (otimizadas): $WOFF2_COUNT${NC}"
else
    echo -e "${RED}✗ Diretório de fontes não encontrado${NC}"
fi

# 3. Verificar plugins ativos
echo -e "\n${YELLOW}[3/5] Verificando mu-plugins...${NC}"
MU_PLUGINS_DIR="./wp-content/mu-plugins"
if [ -d "$MU_PLUGINS_DIR" ]; then
    ACTIVE_PLUGINS=$(find "$MU_PLUGINS_DIR" -type f -name "*.php" ! -name "*-off" | wc -l)
    DISABLED_PLUGINS=$(find "$MU_PLUGINS_DIR" -type f -name "*.php-off" | wc -l)
    echo -e "${GREEN}✓ Plugins ativos: $ACTIVE_PLUGINS${NC}"
    echo -e "${YELLOW}  Plugins desativados: $DISABLED_PLUGINS${NC}"

    echo -e "\n  Plugins ativos:"
    find "$MU_PLUGINS_DIR" -type f -name "*.php" ! -name "*-off" -exec basename {} \;
fi

# 4. Verificar imagens
echo -e "\n${YELLOW}[4/5] Verificando imagens...${NC}"
UPLOADS_DIR="./wp-content/uploads"
if [ -d "$UPLOADS_DIR" ]; then
    JPG_COUNT=$(find "$UPLOADS_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" \) 2>/dev/null | wc -l)
    PNG_COUNT=$(find "$UPLOADS_DIR" -type f -name "*.png" 2>/dev/null | wc -l)
    WEBP_COUNT=$(find "$UPLOADS_DIR" -type f -name "*.webp" 2>/dev/null | wc -l)

    echo -e "${GREEN}✓ JPEGs: $JPG_COUNT${NC}"
    echo -e "${GREEN}✓ PNGs: $PNG_COUNT${NC}"
    echo -e "${GREEN}✓ WebPs: $WEBP_COUNT${NC}"

    if [ $WEBP_COUNT -eq 0 ] && [ $((JPG_COUNT + PNG_COUNT)) -gt 0 ]; then
        echo -e "${YELLOW}⚠ Recomendação: Execute ./scripts/optimize-images.sh para criar versões WebP${NC}"
    fi
else
    echo -e "${YELLOW}  Diretório de uploads não encontrado (normal em ambiente dev)${NC}"
fi

# 5. Verificar configurações de tema
echo -e "\n${YELLOW}[5/5] Verificando configurações do tema...${NC}"
THEME_DIR="./wp-content/themes/hello-child-treinadordavid"
if [ -f "$THEME_DIR/functions.php" ]; then
    echo -e "${GREEN}✓ functions.php encontrado${NC}"

    # Verificar se está carregando fontes localmente
    if grep -q "fonts.css" "$THEME_DIR/functions.php" 2>/dev/null; then
        echo -e "${GREEN}✓ Fontes locais configuradas${NC}"
    fi
fi

# Resumo e recomendações
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Resumo e Recomendações${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}Checklist de Performance:${NC}"
echo -e "  □ CSS minificado gerado"
echo -e "  □ Fontes WOFF2 utilizadas"
echo -e "  □ Imagens otimizadas (WebP)"
echo -e "  □ Lazy loading ativado"
echo -e "  □ Cache do navegador configurado"
echo -e "  □ CDN configurado (se aplicável)\n"

echo -e "${YELLOW}Scripts disponíveis:${NC}"
echo -e "  ./scripts/optimize-images.sh  - Otimizar imagens"
echo -e "  ./scripts/optimize-assets.sh  - Minificar CSS/JS"
echo -e "  ./scripts/check-performance.sh - Verificar performance\n"

echo -e "${GREEN}Para testar online:${NC}"
echo -e "  PageSpeed Insights: https://pagespeed.web.dev/analysis?url=$SITE_URL"
echo -e "  GTmetrix: https://gtmetrix.com/?url=$SITE_URL\n"
