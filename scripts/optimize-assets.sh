#!/bin/bash
##############################################################################
# Script de Otimização de Assets CSS/JS - TreinadorDavid.com
# Descrição: Minifica arquivos CSS e JavaScript para melhor performance
# Autor: Treinador David
# Versão: 1.0.0
##############################################################################

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Otimizador de Assets - Treinador David${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Verificar se o uglifyjs está instalado
if ! command -v uglifyjs &> /dev/null; then
    echo -e "${YELLOW}uglifyjs não encontrado. Instalando...${NC}"
    npm install -g uglify-js
fi

# Verificar se o csso está instalado
if ! command -v csso &> /dev/null; then
    echo -e "${YELLOW}csso não encontrado. Instalando...${NC}"
    npm install -g csso-cli
fi

THEME_DIR="./wp-content/themes/hello-child-treinadordavid"
MU_PLUGINS_DIR="./wp-content/mu-plugins"

# Criar CSS otimizado para o tema
echo -e "${YELLOW}[1/2] Otimizando CSS...${NC}"

# Gerar CSS minificado do core
cat > /tmp/td-core.css << 'EOF'
:root{--td-blue:#0EA5E9;--td-blue-aa:#0369A1;--td-blue-aaa:#035C8D;--td-text:#0F172A;--td-text-2:#475569;--td-bg:#FFFFFF;--td-bg-2:#F8FAFC;}
html{scroll-behavior:smooth}
body{background:var(--td-bg);color:var(--td-text);line-height:1.7;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0}
h1,h2,h3,h4,h5,h6{font-family:Oswald,Impact,Arial Black,sans-serif;line-height:1.3;margin-top:1.5em;margin-bottom:0.5em}
a{color:var(--td-blue-aaa);text-decoration:underline}
a:hover{color:#0B1220}
:focus-visible{outline:3px solid var(--td-blue-aaa);outline-offset:3px;border-radius:4px}
.td-skip-link{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:-999;background:var(--td-blue-aaa);color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none}
.td-skip-link:focus{left:10px;top:10px;z-index:99999;width:auto;height:auto;overflow:visible}
h2[id],h3[id],h4[id]{scroll-margin-top:120px}
.td-quick-answer{background:#F0F9FF;border-left:5px solid var(--td-blue-aaa);padding:16px;border-radius:8px;margin:16px 0}
.td-speakable{display:block;border-left:4px dashed var(--td-blue-aaa);padding:12px 16px;border-radius:10px;margin:16px 0}
.td-articles-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin:24px 0}
.td-article-card,.td-qa-card{border:3px solid var(--td-blue-aaa);border-radius:12px;padding:16px;background:#fff;transition:transform 0.2s,box-shadow 0.2s}
.td-article-card:hover,.td-qa-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(14,165,233,0.2)}
.td-qa-block,.td-science-block{border:3px solid var(--td-blue-aaa);border-radius:12px;padding:24px;margin:32px 0;background:#F8FAFC}
.td-signature-block{display:flex;align-items:center;gap:16px;padding:16px;border:2px solid var(--td-blue-aaa);border-radius:12px;background:#F8FAFC;margin:32px 0}
.td-signature-logo{width:80px;height:80px;border-radius:50%;border:3px solid var(--td-blue-aaa);object-fit:cover}
.td-video-responsive-embed{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;background:#000;margin:24px 0}
.td-video-responsive-embed video{position:absolute;top:0;left:0;width:100%;height:100%;border:0}
.td-sep{border:0;border-top:3px solid var(--td-blue-aaa);margin:32px 0}
.td-sep-label{text-align:center;margin:32px 0;position:relative}
.td-sep-label span{background:var(--td-bg);padding:0 16px;font-weight:700;color:var(--td-blue-aaa)}
.td-audio-wrap{margin:24px 0}
.td-audio-wrap audio{width:100%;max-width:600px}
EOF

csso /tmp/td-core.css -o ./wp-content/treinadordavid-core.css
echo -e "${GREEN}✓ CSS otimizado criado: wp-content/treinadordavid-core.css${NC}"

# Otimizar JavaScript (se houver)
echo -e "\n${YELLOW}[2/2] Verificando arquivos JavaScript...${NC}"

if [ -d "$THEME_DIR/js" ]; then
    for js_file in "$THEME_DIR/js"/*.js; do
        if [ -f "$js_file" ] && [[ ! "$js_file" =~ \.min\.js$ ]]; then
            output="${js_file%.js}.min.js"
            uglifyjs "$js_file" -c -m -o "$output"
            echo -e "${GREEN}✓ Minificado: $(basename "$js_file")${NC}"
        fi
    done
else
    echo -e "${YELLOW}Nenhum diretório de JavaScript encontrado${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Otimização de Assets Concluída!${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "${GREEN}Próximos passos:${NC}"
echo -e "1. Verifique o arquivo wp-content/treinadordavid-core.css"
echo -e "2. Limpe o cache do WordPress"
echo -e "3. Teste a performance com PageSpeed Insights\n"
