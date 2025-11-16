#!/bin/bash
##############################################################################
# Script de Otimização de Imagens - TreinadorDavid.com
# Descrição: Otimiza imagens JPEG, PNG e WebP para melhor performance
# Autor: Treinador David
# Versão: 1.0.0
##############################################################################

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Otimizador de Imagens - Treinador David${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Verificar se as ferramentas estão instaladas
command -v jpegoptim >/dev/null 2>&1 || {
    echo -e "${YELLOW}jpegoptim não encontrado. Instalando...${NC}";
    sudo apt-get update && sudo apt-get install -y jpegoptim;
}

command -v optipng >/dev/null 2>&1 || {
    echo -e "${YELLOW}optipng não encontrado. Instalando...${NC}";
    sudo apt-get update && sudo apt-get install -y optipng;
}

command -v cwebp >/dev/null 2>&1 || {
    echo -e "${YELLOW}webp não encontrado. Instalando...${NC}";
    sudo apt-get update && sudo apt-get install -y webp;
}

# Diretório de uploads do WordPress
UPLOAD_DIR="${1:-./wp-content/uploads}"

if [ ! -d "$UPLOAD_DIR" ]; then
    echo -e "${RED}Erro: Diretório $UPLOAD_DIR não encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}Otimizando imagens em: $UPLOAD_DIR${NC}\n"

# Contador
COUNT_JPG=0
COUNT_PNG=0
COUNT_WEBP=0

# Otimizar JPEGs
echo -e "${YELLOW}[1/3] Otimizando arquivos JPEG...${NC}"
while IFS= read -r -d '' file; do
    jpegoptim --strip-all --max=85 "$file"
    ((COUNT_JPG++))
done < <(find "$UPLOAD_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) -print0)

# Otimizar PNGs
echo -e "\n${YELLOW}[2/3] Otimizando arquivos PNG...${NC}"
while IFS= read -r -d '' file; do
    optipng -o5 -quiet "$file"
    ((COUNT_PNG++))
done < <(find "$UPLOAD_DIR" -type f -iname "*.png" -print0)

# Converter para WebP
echo -e "\n${YELLOW}[3/3] Convertendo para WebP...${NC}"
while IFS= read -r -d '' file; do
    output="${file%.*}.webp"
    if [ ! -f "$output" ]; then
        cwebp -q 85 "$file" -o "$output" -quiet
        ((COUNT_WEBP++))
    fi
done < <(find "$UPLOAD_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) -print0)

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Otimização Concluída!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "JPEGs otimizados: ${COUNT_JPG}"
echo -e "PNGs otimizados: ${COUNT_PNG}"
echo -e "WebPs criados: ${COUNT_WEBP}\n"
echo -e "${GREEN}Dica:${NC} Configure seu servidor para servir WebP quando disponível"
