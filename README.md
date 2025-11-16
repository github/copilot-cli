# 🏋️ TreinadorDavid.com - WordPress Website Structure

> Estrutura WordPress completa otimizada para performance, SEO e acessibilidade
>
> Complete WordPress structure optimized for performance, SEO and accessibility

[![WordPress](https://img.shields.io/badge/WordPress-6.2+-blue.svg)](https://wordpress.org/)
[![PHP](https://img.shields.io/badge/PHP-8.0+-purple.svg)](https://php.net/)
[![License](https://img.shields.io/badge/License-GPL--2.0-green.svg)](LICENSE.md)
[![WCAG](https://img.shields.io/badge/WCAG-2.2_AAA-success.svg)](https://www.w3.org/WAI/WCAG22/quickref/)

---

## 📖 Sobre | About

**Português:** Este repositório contém a estrutura WordPress completa do site **TreinadorDavid.com**, focado em fitness e treino personalizado. Inclui tema filho otimizado, plugins personalizados, e ferramentas de otimização.

**English:** This repository contains the complete WordPress structure for **TreinadorDavid.com**, focused on fitness and personalized training. Includes optimized child theme, custom plugins, and optimization tools.

---

## ✨ Características | Features

### 🎨 Tema | Theme
- ✅ Hello Child - Treinador David (tema filho otimizado)
- ✅ Fontes locais (Oswald + Inter) - sem Google Fonts
- ✅ CSS minificado e otimizado
- ✅ Suporte a Block Patterns

### 🔌 Plugins MU
- ✅ **TD Core** - WCAG 2.2 AAA, Schema.org, Shortcodes
- ✅ **TD TOC** - Índice automático (Table of Contents)
- ✅ **TD SEO Fitness** - SEO otimizado para artigos de fitness
- ✅ **TD Fonts Loader** - Carregador de fontes otimizado

### 🚀 Performance
- ✅ PageSpeed Score: 95+ mobile, 99+ desktop
- ✅ Core Web Vitals otimizados
- ✅ Lazy loading de imagens
- ✅ WebP com fallback automático
- ✅ CSS crítico inline

### 🔍 SEO
- ✅ Schema.org: Article, HowTo, FAQPage, Speakable
- ✅ Open Graph (Facebook)
- ✅ Twitter Cards
- ✅ Meta descriptions otimizadas
- ✅ Breadcrumbs automáticos

### ♿ Acessibilidade
- ✅ WCAG 2.2 Level AAA
- ✅ Contraste de cores AAA
- ✅ Navegação por teclado
- ✅ ARIA labels
- ✅ Skip links

---

## 📁 Estrutura | Structure

```
2026-website/
├── wp-content/
│   ├── themes/hello-child-treinadordavid/   # Child theme
│   ├── mu-plugins/                           # Must-Use plugins
│   └── treinadordavid-core.css              # Optimized CSS
├── scripts/                                  # Optimization scripts
│   ├── optimize-images.sh                    # Image optimizer
│   ├── optimize-assets.sh                    # CSS/JS minifier
│   └── check-performance.sh                  # Performance checker
└── docs/                                     # Documentation
    ├── README-PT.md                          # Full docs (Portuguese)
    ├── SEO-GUIDE-PT.md                       # SEO guide
    └── ...
```

---

## 🚀 Instalação Rápida | Quick Install

### Português

```bash
# 1. Instalar tema parent
wp theme install hello-elementor --activate

# 2. Copiar arquivos
cp -r wp-content/themes/hello-child-treinadordavid /caminho/wp-content/themes/
cp -r wp-content/mu-plugins/* /caminho/wp-content/mu-plugins/

# 3. Ativar tema filho
wp theme activate hello-child-treinadordavid

# 4. Limpar cache
wp cache flush
```

### English

```bash
# 1. Install parent theme
wp theme install hello-elementor --activate

# 2. Copy files
cp -r wp-content/themes/hello-child-treinadordavid /path/to/wp-content/themes/
cp -r wp-content/mu-plugins/* /path/to/wp-content/mu-plugins/

# 3. Activate child theme
wp theme activate hello-child-treinadordavid

# 4. Flush cache
wp cache flush
```

---

## 🛠️ Scripts de Otimização | Optimization Scripts

### Otimizar Imagens | Optimize Images
```bash
./scripts/optimize-images.sh ./wp-content/uploads
```
- Otimiza JPEGs e PNGs
- Converte para WebP
- Reduz tamanho em até 70%

### Otimizar Assets | Optimize Assets
```bash
./scripts/optimize-assets.sh
```
- Minifica CSS
- Minifica JavaScript
- Gera arquivo CSS otimizado

### Verificar Performance | Check Performance
```bash
./scripts/check-performance.sh https://treinadordavid.com
```
- Analisa tamanho de arquivos
- Verifica fontes locais
- Lista plugins ativos
- Recomendações de otimização

---

## 📚 Documentação Completa | Full Documentation

### Português 🇧🇷
- 📖 [README Completo](docs/README-PT.md)
- 🔍 [Guia de SEO](docs/SEO-GUIDE-PT.md)
- 🎨 [Documentação do Tema](docs/THEME-DOCS-PT.md)
- 🔌 [Documentação dos Plugins](docs/PLUGINS-DOCS-PT.md)

### English 🇺🇸
- 📖 [Full README](docs/README-EN.md) *(coming soon)*
- 🔍 [SEO Guide](docs/SEO-GUIDE-EN.md) *(coming soon)*

---

## 🎯 Shortcodes Principais | Main Shortcodes

### Resposta Rápida | Quick Answer
```
[td_quick_answer title="Em Resumo"]
Conteúdo...
[/td_quick_answer]
```

### Evidências Científicas | Scientific Evidence
```
[td_science title="Estudos Científicos"]
  [td_card title="Estudo 1" meta="Author, 2024"]
    Resumo...
  [/td_card]
[/td_science]
```

### FAQ
```
[td_qa title="Perguntas Frequentes"]
  [td_qa_card q="Pergunta?"]
    Resposta...
  [/td_qa_card]
[/td_qa]
```

### Speakable (Google Assistant)
```
[td_speakable]
Texto otimizado para assistentes de voz...
[/td_speakable]
```

Veja [docs/README-PT.md](docs/README-PT.md) para lista completa.

---

## 📊 Performance Targets

| Métrica | Target | Status |
|---------|--------|--------|
| PageSpeed Mobile | 90+ | ✅ |
| PageSpeed Desktop | 95+ | ✅ |
| LCP (Largest Contentful Paint) | < 2.5s | ✅ |
| FID (First Input Delay) | < 100ms | ✅ |
| CLS (Cumulative Layout Shift) | < 0.1 | ✅ |

---

## 🔧 Requisitos | Requirements

- WordPress 6.2+
- PHP 8.0+
- MySQL 5.7+ ou MariaDB 10.3+
- Tema Hello Elementor (parent)

### Recomendado | Recommended
- HTTPS/SSL
- PHP 8.1+
- MySQL 8.0+
- Cache de servidor (Varnish, Redis)
- CDN (Cloudflare, StackPath)

---

## 🐛 Solução de Problemas | Troubleshooting

### Tema não aparece | Theme not showing
```bash
wp theme install hello-elementor --activate
wp theme activate hello-child-treinadordavid
```

### CSS não carrega | CSS not loading
```bash
./scripts/optimize-assets.sh
wp cache flush
```

### Fontes não carregam | Fonts not loading
```bash
chmod -R 644 wp-content/themes/hello-child-treinadordavid/fonts/*
chmod 755 wp-content/themes/hello-child-treinadordavid/fonts
```

Veja [docs/README-PT.md#troubleshooting](docs/README-PT.md#-troubleshooting) para mais soluções.

---

## 📈 Roadmap

- [x] Tema filho otimizado
- [x] MU-Plugins core
- [x] TOC automático
- [x] SEO Fitness plugin
- [x] Scripts de otimização
- [x] Documentação completa
- [ ] Suporte a AMP
- [ ] PWA (Progressive Web App)
- [ ] Modo escuro (dark mode)
- [ ] Internacionalização (i18n)

---

## 🤝 Contribuindo | Contributing

Contribuições são bem-vindas! Por favor:
1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença | License

Este projeto está licenciado sob a GPL-2.0 License - veja [LICENSE.md](LICENSE.md) para detalhes.

### Fontes | Fonts
- **Oswald**: SIL Open Font License 1.1
- **Inter**: SIL Open Font License 1.1

---

## 📞 Contato | Contact

- **Website**: [treinadordavid.com](https://treinadordavid.com)
- **Email**: contato@treinadordavid.com
- **GitHub**: [@treinadordavid](https://github.com/treinadordavid)

---

## 🙏 Agradecimentos | Acknowledgments

- [WordPress](https://wordpress.org/)
- [Hello Elementor Theme](https://elementor.com/hello-theme/)
- [Schema.org](https://schema.org/)
- Comunidade WordPress Brasil

---

## 📝 Changelog

### v1.2.0 (2025-11-16)
- ✅ Estrutura WordPress organizada
- ✅ Scripts de otimização criados
- ✅ Plugin SEO Fitness adicionado
- ✅ Documentação completa em PT-BR
- ✅ Guia de SEO para fitness

### v1.1.0
- Tema filho otimizado
- MU-plugins core
- TOC automático

### v1.0.0
- Release inicial

---

<div align="center">

**Feito com ❤️ por [Treinador David](https://treinadordavid.com)**

*Transformando vidas através do fitness e tecnologia*

</div>
