# 🏋️ WordPress TreinadorDavid.com - Documentação Completa

## 📋 Visão Geral

Este repositório contém a estrutura WordPress completa do site **TreinadorDavid.com**, incluindo tema personalizado, plugins e otimizações de performance e SEO.

### 🎯 Características Principais
- ✅ Tema filho otimizado (Hello Child - Treinador David)
- ✅ Must-Use Plugins personalizados
- ✅ Schema.org markup automático
- ✅ SEO otimizado para artigos de fitness
- ✅ Performance otimizada (WCAG 2.2 AAA)
- ✅ TOC (Table of Contents) automático
- ✅ Fontes locais (Oswald + Inter)
- ✅ Scripts de otimização

---

## 📁 Estrutura de Diretórios

```
2026-website/
├── wp-content/
│   ├── themes/
│   │   └── hello-child-treinadordavid/    # Tema filho personalizado
│   │       ├── assets/                     # CSS e recursos
│   │       ├── fonts/                      # Fontes locais (Oswald, Inter)
│   │       ├── patterns/                   # Block patterns
│   │       ├── functions.php               # Funções do tema
│   │       ├── single.php                  # Template de post único
│   │       └── style.css                   # Estilos do tema
│   │
│   ├── mu-plugins/                         # Must-Use Plugins
│   │   ├── td-core2.php                    # Core principal (WCAG, Schema, Shortcodes)
│   │   ├── TD-toc-toc.php                  # Índice automático
│   │   ├── td-seo-fitness.php              # SEO para fitness
│   │   ├── td-core-titles.php              # Títulos personalizados
│   │   ├── td-fonts-loader.php             # Carregador de fontes
│   │   └── hostinger-auto-updates.php      # Atualizações automáticas
│   │
│   └── treinadordavid-core.css            # CSS otimizado principal
│
├── scripts/                                # Scripts de otimização
│   ├── optimize-images.sh                  # Otimizar imagens
│   ├── optimize-assets.sh                  # Minificar CSS/JS
│   └── check-performance.sh                # Verificar performance
│
├── docs/                                   # Documentação
│   ├── README-PT.md                        # Este arquivo
│   ├── SEO-GUIDE-PT.md                     # Guia de SEO
│   ├── THEME-DOCS-PT.md                    # Documentação do tema
│   └── PLUGINS-DOCS-PT.md                  # Documentação dos plugins
│
└── README.md                               # README principal
```

---

## 🚀 Instalação

### Requisitos
- WordPress 6.2+
- PHP 8.0+
- MySQL 5.7+ ou MariaDB 10.3+
- Tema Hello Elementor (parent theme)

### Passo a Passo

#### 1. Fazer Backup do Site Atual
```bash
# Via WP-CLI
wp db export backup.sql
wp plugin list --format=json > plugins-backup.json
```

#### 2. Instalar Tema Parent
```bash
# Via WP-CLI
wp theme install hello-elementor --activate
```

#### 3. Upload dos Arquivos

**Opção A: Via FTP/SFTP**
1. Conecte-se ao servidor via FTP
2. Navegue até `/wp-content/`
3. Upload das pastas:
   - `themes/hello-child-treinadordavid/`
   - `mu-plugins/`
   - `treinadordavid-core.css`

**Opção B: Via SSH**
```bash
cd /caminho/para/wordpress/wp-content/

# Copiar tema
cp -r /caminho/do/repo/wp-content/themes/hello-child-treinadordavid themes/

# Copiar mu-plugins
cp -r /caminho/do/repo/wp-content/mu-plugins/* mu-plugins/

# Copiar CSS otimizado
cp /caminho/do/repo/wp-content/treinadordavid-core.css .

# Ajustar permissões
chown -R www-data:www-data themes/hello-child-treinadordavid
chown -R www-data:www-data mu-plugins
chmod 644 treinadordavid-core.css
```

#### 4. Ativar Tema Filho
```bash
# Via WP-CLI
wp theme activate hello-child-treinadordavid

# Ou via WordPress Admin
# Aparência > Temas > Hello Child - Treinador David > Ativar
```

#### 5. Verificar Plugins MU
```bash
# Via WP-CLI
wp plugin list --status=must-use

# Deve listar:
# - td-core2
# - TD-toc-toc
# - td-seo-fitness
# - td-core-titles
# - td-fonts-loader
```

#### 6. Limpar Cache
```bash
# Via WP-CLI
wp cache flush

# Se usar plugin de cache (ex: WP Super Cache, W3 Total Cache)
wp super-cache flush
# ou
wp w3-total-cache flush all
```

---

## ⚙️ Configuração

### 1. Configurações do Tema

Vá em **Aparência > Personalizar**:

- **Identidade do Site**
  - Logo: Upload do logo (formato PNG, 512x512px)
  - Ícone do site: 512x512px
  - Cores personalizadas já configuradas via CSS

- **Menus**
  - Criar menu principal
  - Criar menu footer (se necessário)

### 2. Configurações de Categorias

Certifique-se de ter estas categorias criadas:
- `coaching`
- `emagrecer`
- `musculacao`
- `treinos`
- `personal-trainer`
- `exercicios`
- `programas`
- `noticias-fitness`

```bash
# Criar categorias via WP-CLI
wp term create category "Coaching" --slug=coaching
wp term create category "Emagrecer" --slug=emagrecer
wp term create category "Musculação" --slug=musculacao
wp term create category "Treinos" --slug=treinos
wp term create category "Personal Trainer" --slug=personal-trainer
wp term create category "Exercícios" --slug=exercicios
wp term create category "Programas" --slug=programas
wp term create category "Notícias Fitness" --slug=noticias-fitness
```

### 3. Configurações de Permalinks

```bash
# Definir estrutura de permalinks
wp rewrite structure '/%postname%/'
wp rewrite flush
```

### 4. Configurações de Mídia

Recomendado:
- **Tamanho máximo de upload**: 10MB
- **Tamanhos de imagem**:
  - Thumbnail: 150x150 (cortado)
  - Médio: 768x0
  - Grande: 1920x0
  - Full: Original

---

## 🎨 Uso do Tema

### Shortcodes Disponíveis

#### 1. Resposta Rápida
```
[td_quick_answer title="Resposta Rápida"]
Conteúdo da resposta aqui...
[/td_quick_answer]
```

#### 2. Conteúdo Speakable (Google Assistant)
```
[td_speakable]
Texto otimizado para assistentes de voz...
[/td_speakable]
```

#### 3. Bloco de Evidências Científicas
```
[td_science title="Evidência Científica"]
  [td_card title="Estudo 1" meta="Smith et al., 2023" ref="PubMed ID: 12345"]
    Resumo do estudo...
  [/td_card]

  [td_card title="Estudo 2" meta="Jones et al., 2024" ref="DOI: 10.1234/xyz"]
    Resumo do segundo estudo...
  [/td_card]
[/td_science]
```

#### 4. Perguntas e Respostas
```
[td_qa title="Perguntas Frequentes"]
  [td_qa_card q="Quantas vezes devo treinar?" badge="Frequência"]
    O ideal é treinar 3-5 vezes por semana...
  [/td_qa_card]

  [td_qa_card q="Quanto tempo para ver resultados?" badge="Resultados"]
    Os primeiros resultados aparecem em 4-6 semanas...
  [/td_qa_card]
[/td_qa]
```

#### 5. Assinatura
```
[td_signature]
```

#### 6. Separador
```
[td_sep]
<!-- ou com label -->
[td_sep label="Continue lendo"]
```

#### 7. Áudio
```
[td_audio src="https://site.com/audio.mp3"]
```

#### 8. Vídeo
```
[td_video src="https://site.com/video.mp4" caption="Demonstração do exercício"]
```

### Exemplo de Artigo Completo

```
<!-- Título H1: automático do WordPress -->

<!-- Introdução -->
<p>Neste artigo você aprenderá...</p>

[td_quick_answer title="Em Resumo"]
Os principais pontos deste artigo são...
[/td_quick_answer]

<!-- Conteúdo principal -->
<h2>1. Primeiro Tópico</h2>
<p>Conteúdo...</p>

[td_speakable]
Informação importante otimizada para voz...
[/td_speakable]

<h2>2. Segundo Tópico</h2>
<p>Conteúdo...</p>

<!-- Evidências científicas -->
[td_science title="O Que Dizem os Estudos"]
  [td_card title="Efeitos do Treino de Força" meta="Schoenfeld et al., 2023"]
    Resumo do estudo científico...
  [/td_card]
[/td_science]

<!-- FAQ -->
[td_qa title="Dúvidas Comuns"]
  [td_qa_card q="Como começar?"]
    Resposta...
  [/td_qa_card]
[/td_qa]

<!-- Assinatura -->
[td_signature]
```

---

## 🛠️ Scripts de Otimização

### 1. Otimizar Imagens

```bash
cd /caminho/do/repo
./scripts/optimize-images.sh /caminho/para/wp-content/uploads
```

**O que faz:**
- Otimiza JPEGs com jpegoptim
- Otimiza PNGs com optipng
- Converte para WebP
- Reduz tamanho sem perda significativa de qualidade

### 2. Otimizar Assets (CSS/JS)

```bash
./scripts/optimize-assets.sh
```

**O que faz:**
- Gera CSS minificado em `wp-content/treinadordavid-core.css`
- Minifica arquivos JavaScript (se houver)
- Reduz tamanho total dos assets

### 3. Verificar Performance

```bash
./scripts/check-performance.sh https://treinadordavid.com
```

**O que verifica:**
- Tamanho de CSS
- Fontes locais
- Plugins ativos
- Imagens (JPG, PNG, WebP)
- Configurações do tema

---

## 📊 Performance e Otimizações

### Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Otimizações Implementadas

#### 1. CSS
- ✅ CSS inline crítico
- ✅ CSS minificado
- ✅ Carregamento assíncrono de fontes
- ✅ Variáveis CSS para cores

#### 2. Fontes
- ✅ Fontes locais (sem Google Fonts)
- ✅ WOFF2 format (melhor compressão)
- ✅ Font-display: swap
- ✅ Preload de fontes críticas

#### 3. Imagens
- ✅ Lazy loading nativo
- ✅ WebP com fallback
- ✅ Responsive images (srcset)
- ✅ Alt text obrigatório

#### 4. JavaScript
- ✅ Sem jQuery no frontend
- ✅ JavaScript vanilla
- ✅ Defer/async quando possível
- ✅ Minificação

#### 5. Acessibilidade (WCAG 2.2 AAA)
- ✅ Contraste de cores AAA
- ✅ Skip links
- ✅ ARIA labels
- ✅ Navegação por teclado
- ✅ Focus visible

---

## 🔍 SEO

### Recursos SEO Automáticos

#### 1. Schema.org Markup
- **Article** - Todos os posts
- **HowTo** - Posts de treinos/exercícios
- **FAQPage** - Posts com Q&A
- **Speakable** - Conteúdo para voz
- **Breadcrumb** - Navegação

#### 2. Open Graph (Facebook)
- og:type
- og:title
- og:description
- og:image (1200x630)
- og:locale (pt_BR)

#### 3. Twitter Cards
- summary_large_image
- twitter:title
- twitter:description
- twitter:image

#### 4. Meta Tags
- Meta description otimizada
- Canonical URLs
- Robots meta

### Guia Completo
Veja [docs/SEO-GUIDE-PT.md](SEO-GUIDE-PT.md) para guia detalhado de SEO.

---

## 🐛 Troubleshooting

### Problema: Tema não aparece

**Solução:**
```bash
# Verificar se o tema parent está instalado
wp theme list

# Instalar Hello Elementor se necessário
wp theme install hello-elementor --activate
wp theme activate hello-child-treinadordavid
```

### Problema: CSS não carrega

**Solução:**
```bash
# Verificar se o arquivo CSS existe
ls -lh wp-content/treinadordavid-core.css

# Recriar CSS
./scripts/optimize-assets.sh

# Limpar cache
wp cache flush
```

### Problema: Fontes não carregam

**Solução:**
```bash
# Verificar permissões
chmod -R 644 wp-content/themes/hello-child-treinadordavid/fonts/*
chmod 755 wp-content/themes/hello-child-treinadordavid/fonts

# Verificar se arquivos existem
ls -lh wp-content/themes/hello-child-treinadordavid/fonts/
```

### Problema: MU-Plugins não ativam

**Solução:**
```bash
# Verificar diretório
ls -lh wp-content/mu-plugins/

# Verificar permissões
chmod -R 644 wp-content/mu-plugins/*.php
chmod 755 wp-content/mu-plugins

# Listar plugins
wp plugin list --status=must-use
```

### Problema: TOC não aparece

**Solução:**
1. Verificar se o post está em uma das categorias habilitadas
2. Verificar se há H2 ou H3 no conteúdo
3. Limpar cache do navegador

```bash
# Verificar categorias do post
wp post term list POST_ID category --format=csv

# Adicionar categoria se necessário
wp post term add POST_ID category treinos
```

---

## 📈 Monitoramento

### Ferramentas Recomendadas

#### Performance
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **GTmetrix**: https://gtmetrix.com/
- **WebPageTest**: https://www.webpagetest.org/

#### SEO
- **Google Search Console**: https://search.google.com/search-console
- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **Bing Webmaster Tools**: https://www.bing.com/webmasters

#### Acessibilidade
- **WAVE**: https://wave.webaim.org/
- **axe DevTools**: Extensão de navegador
- **Lighthouse**: Chrome DevTools

---

## 🔐 Segurança

### Práticas Recomendadas

1. **Atualizações**
   - WordPress sempre atualizado
   - Plugins atualizados
   - PHP atualizado (8.0+)

2. **Backups**
   ```bash
   # Backup diário recomendado
   wp db export backup-$(date +%Y%m%d).sql
   tar -czf files-backup-$(date +%Y%m%d).tar.gz wp-content/
   ```

3. **Permissões de Arquivo**
   ```bash
   # Permissões corretas
   find wp-content -type d -exec chmod 755 {} \;
   find wp-content -type f -exec chmod 644 {} \;
   ```

4. **SSL/HTTPS**
   - Certificado SSL ativo
   - HSTS habilitado
   - Redirect HTTP → HTTPS

---

## 📞 Suporte e Contato

- **Website**: https://treinadordavid.com
- **Email**: contato@treinadordavid.com
- **GitHub Issues**: [Criar issue](https://github.com/treinadordavid/2026-website/issues)

---

## 📄 Licença

- **Tema**: GPL-2.0-or-later
- **Plugins**: GPL-2.0-or-later
- **Fontes**:
  - Oswald: SIL Open Font License 1.1
  - Inter: SIL Open Font License 1.1

---

## 📝 Changelog

### Versão 1.2.0 (2025-11-16)
- ✅ Estrutura WordPress organizada
- ✅ Scripts de otimização criados
- ✅ Plugin SEO Fitness adicionado
- ✅ Documentação completa em PT-BR
- ✅ Guia de SEO para fitness

### Versão 1.1.0
- Tema filho otimizado
- MU-plugins core
- TOC automático

### Versão 1.0.0
- Release inicial

---

**Última atualização**: 16 de Novembro de 2025
**Versão**: 1.2.0
**Autor**: Treinador David
