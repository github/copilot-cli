# Sistema de Funis de Conversão TD
**Treinador David - Personal Training**

Sistema completo de funis de conversão otimizado para Personal Training e fitness.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Funis Implementados](#funis-implementados)
4. [Instalação](#instalação)
5. [Configuração](#configuração)
6. [Integrações](#integrações)
7. [Tracking e Analytics](#tracking-e-analytics)
8. [Customização](#customização)
9. [Performance](#performance)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Sistema de 3 funis completos de conversão:

### 1. Landing Page Principal - Personal Training
- Hero section com vídeo de fundo militar
- Seção "DEPENDE!" explicando abordagem personalizada
- Depoimentos em cards estilo militar
- Formulário de captura estratégico
- Countdown timer para urgência
- Badge "30 anos de experiência + USMC Veteran"

### 2. Funil Consultoria Online
- Quiz interativo (6 perguntas)
- Thank you page com vídeo de boas-vindas
- Sequência de 3 emails automatizados
- Página de agendamento Calendly

### 3. Funil eBook Gratuito
- Lead magnet: "7 Erros que Matam seus Resultados"
- Opt-in page minimalista
- Delivery page com upsell suave

---

## 📁 Estrutura de Arquivos

```
landing-pages/
├── css/
│   └── td-funnels.css          # CSS global (mobile-first, classes reutilizáveis)
├── js/
│   └── td-funnels.js           # JavaScript (countdown, quiz, tracking, validação)
├── images/                      # Imagens (a adicionar)
├── personal-training/
│   └── index.html              # Landing page principal
├── consultoria/
│   ├── quiz.html               # Quiz interativo
│   ├── obrigado.html           # Thank you page
│   ├── agendar.html            # Página agendamento Calendly
│   └── email-sequence.md       # Sequência de 3 emails
├── ebook/
│   ├── index.html              # Opt-in page
│   └── download.html           # Delivery page com upsell
└── README.md                   # Este arquivo

elementor-templates/
├── hero-section-example.json   # Hero section para Elementor
├── README.md                   # Guia de importação
└── [outros templates]          # A adicionar conforme necessário
```

---

## 🎨 Funis Implementados

### FUNIL 1: Personal Training (Landing Page Principal)

**Objetivo:** Capturar leads qualificados para consultoria gratuita

**Elementos:**
- ✅ Hero section com vídeo militar de fundo
- ✅ Badge "30 anos + USMC Veteran" com animação pulse
- ✅ Seção "DEPENDE!" em destaque
- ✅ Grid de 6 benefícios em cards militares
- ✅ 4 depoimentos reais com fotos
- ✅ Formulário de captura com 5 campos
- ✅ Countdown timer (7 dias)
- ✅ Tracking de scroll depth
- ✅ Mobile-first responsive

**Métricas Esperadas:**
- Taxa de conversão: 15-25%
- Tempo médio na página: 2-3 minutos
- Scroll depth 75%+: 40-50%

**URL:** `/personal-training/`

---

### FUNIL 2: Consultoria Online

**Etapa 1: Quiz Interativo**
- 6 perguntas sobre perfil fitness
- Barra de progresso visual
- Animações de transição
- Salva respostas em localStorage
- Redirecionamento automático

**URL:** `/consultoria/quiz/`

**Etapa 2: Thank You Page**
- Vídeo de boas-vindas (YouTube embed)
- Tracking de visualização de vídeo
- Próximos passos claros
- CTA para agendamento
- Pixel de conversão

**URL:** `/consultoria/obrigado/`

**Etapa 3: Sequência de 3 Emails**

| Email | Timing | Assunto | Objetivo |
|-------|--------|---------|----------|
| #1 | Imediato | Nutrição Tática | Educação + valor |
| #2 | +24h | 5 Erros no Treino | Identificar problemas |
| #3 | +48h | Músculo 40+ | CTA forte para consulta |

**Etapa 4: Agendamento**
- Integração Calendly
- 3 benefícios destacados
- Sem pressão de venda
- Tracking de agendamentos

**URL:** `/consultoria/agendar/`

**Métricas Esperadas:**
- Taxa de conclusão quiz: 70-80%
- Open rate emails: 25-35%
- Click rate emails: 5-10%
- Taxa de agendamento: 10-15%

---

### FUNIL 3: eBook Gratuito

**Etapa 1: Opt-in Page**
- Lead magnet claro
- Preview do eBook (cover image)
- Lista de benefícios (6 itens)
- Social proof (3 depoimentos)
- Formulário minimalista (nome + email)
- CTA destacado

**URL:** `/ebook/`

**Etapa 2: Delivery Page**
- Download direto do PDF
- Confirmação via email
- Upsell suave para consultoria
- Comparação eBook vs Consultoria
- Próximos passos (sequência de emails)

**URL:** `/ebook/download/`

**Métricas Esperadas:**
- Taxa de opt-in: 40-60%
- Taxa de download: 90-95%
- Upsell para consultoria: 5-10%

---

## 🚀 Instalação

### 1. Upload de Arquivos

```bash
# Via FTP/SFTP
/wp-content/themes/seu-tema/landing-pages/

# Ou via WordPress
Appearance → Theme File Editor
```

### 2. Incluir CSS Global

**Opção A: No tema (header.php)**
```html
<link rel="stylesheet" href="<?php echo get_template_directory_uri(); ?>/landing-pages/css/td-funnels.css">
```

**Opção B: Via Elementor**
Elementor → Custom CSS → Copiar conteúdo de `td-funnels.css`

### 3. Incluir JavaScript

**No footer.php (antes de `</body>`):**
```html
<script src="<?php echo get_template_directory_uri(); ?>/landing-pages/js/td-funnels.js"></script>
```

### 4. Criar Páginas no WordPress

1. Páginas → Adicionar Nova
2. Título: "Personal Training"
3. Permalink: `/personal-training/`
4. Template: Página Em Branco (ou Elementor Canvas)
5. Copiar conteúdo HTML de `personal-training/index.html`
6. Repetir para outras páginas

---

## ⚙️ Configuração

### 1. Tracking IDs

Editar cada arquivo HTML e atualizar:

```javascript
// Facebook Pixel
window.TD_FB_PIXEL_ID = 'SEU_PIXEL_ID_AQUI';

// Google Analytics
window.TD_GA_TRACKING_ID = 'UA-XXXXXXXXX-X';

// Google Ads Conversion
window.TD_GA_CONVERSION_ID = 'AW-XXXXXXXXX';
```

### 2. URLs e Links

**Formulários:**
```html
action="https://treinadordavid.pt/wp-json/td/v1/lead-capture"
data-redirect="/personal-training/obrigado/"
```

**CTAs:**
- Atualizar todos os links de botões
- Verificar âncoras (#captura-form)
- Confirmar URLs de redirecionamento

### 3. Vídeos

**Hero Background:**
```html
<source src="URL_SEU_VIDEO_MP4" type="video/mp4">
```

**Vídeo de Boas-Vindas:**
```html
src="https://www.youtube.com/embed/SEU_VIDEO_ID"
```

### 4. Imagens

Substituir placeholders:
- Logo: `your-logo.png`
- Hero fallback: `hero-fallback.jpg`
- eBook cover: `ebook-cover.jpg`
- Avatares: usar https://i.pravatar.cc ou fotos reais

### 5. Countdown Timer

**Configurar data alvo:**
```javascript
// Em personal-training/index.html
const targetDate = new Date('2024-12-31 23:59:59');
new TDFunnels.Countdown('hero-countdown', targetDate);
```

---

## 🔗 Integrações

### Calendly

1. Criar conta em https://calendly.com
2. Configurar tipo de evento: "Consulta Gratuita - 30min"
3. Copiar URL do evento
4. Atualizar em `consultoria/agendar.html`:

```html
data-url="https://calendly.com/SEU_USUARIO/consulta-gratuita"
```

### Email Marketing

**Opções suportadas:**
- MailChimp
- ActiveCampaign
- ConvertKit
- GetResponse

**Configuração:**
1. Criar lista "Leads - Consultoria"
2. Criar automação com 3 emails
3. Copiar conteúdo de `consultoria/email-sequence.md`
4. Configurar triggers:
   - Email 1: Imediato após opt-in
   - Email 2: +24h
   - Email 3: +48h

### WordPress REST API

**Criar endpoint custom para captura:**

```php
// functions.php
add_action('rest_api_init', function() {
  register_rest_route('td/v1', '/lead-capture', [
    'methods' => 'POST',
    'callback' => 'td_handle_lead_capture'
  ]);
});

function td_handle_lead_capture($request) {
  $params = $request->get_params();

  // Salvar no banco
  // Enviar para email marketing
  // Retornar sucesso

  return ['success' => true, 'message' => 'Lead captured'];
}
```

---

## 📊 Tracking e Analytics

### Eventos Rastreados Automaticamente

1. **Page Views** - Todas as páginas
2. **Scroll Depth** - 25%, 50%, 75%, 100%
3. **Form Submissions** - Todos os formulários
4. **Video Play** - Vídeos hero e welcome
5. **Button Clicks** - CTAs principais
6. **Quiz Completion** - Fim do quiz
7. **eBook Downloads** - Cliques de download

### Google Analytics Goals

Configurar em GA:

| Goal | Type | Details |
|------|------|---------|
| Lead PT | Destination | `/personal-training/obrigado/` |
| Quiz Complete | Event | Category: Quiz, Action: Complete |
| Consulta Agendada | Event | Category: Calendly, Action: Scheduled |
| eBook Opt-in | Destination | `/ebook/download/` |

### Facebook Pixel Events

```javascript
// Lead capture
fbq('track', 'Lead');

// Quiz complete
fbq('trackCustom', 'QuizComplete');

// Page view (automático)
fbq('track', 'PageView');
```

### Dashboard Recomendado

**Google Data Studio:**
1. Conectar GA + FB Ads
2. Métricas principais:
   - Visitantes por funil
   - Taxa de conversão
   - Custo por lead
   - ROI por canal
3. Template: https://datastudio.google.com/...

---

## 🎨 Customização

### Cores

Editar em `css/td-funnels.css`:

```css
:root {
  --td-primary: #0EA5E9;    /* Azul TD */
  --td-dark: #0B1220;       /* Dark */
  --td-accent: #10B981;     /* Verde */
}
```

### Fontes

**Atual:**
- Headings: Oswald
- Body: Inter
- Accent: Bebas Neue

**Para trocar:**
1. Google Fonts → Selecionar nova fonte
2. Copiar link
3. Adicionar em `<head>`
4. Atualizar CSS:

```css
:root {
  --font-heading: 'SuaFonte', sans-serif;
}
```

### Textos e Copy

Todos os textos estão inline no HTML para fácil edição.

**Principais seções para customizar:**
- Hero titles
- Benefícios (grid de 6)
- Depoimentos (4)
- CTAs
- Formulários (labels, placeholders)

### Animações

**Classes disponíveis:**
- `.td-fade-in` - Fade in simples
- `.td-slide-in-left` - Slide da esquerda
- `.td-slide-in-right` - Slide da direita
- `.td-pulse` - Pulso contínuo

**Adicionar a elementos:**
```html
<div class="td-fade-in">Conteúdo</div>
```

---

## ⚡ Performance

### Checklist de Otimização

- [ ] **Imagens:** Otimizadas <200KB, formato WebP
- [ ] **Vídeos:** YouTube/Vimeo (não hospedar no WP)
- [ ] **CSS:** Minificado em produção
- [ ] **JS:** Minificado em produção
- [ ] **Lazy Load:** Ativado para imagens
- [ ] **Cache:** WP Rocket ou W3 Total Cache
- [ ] **CDN:** Cloudflare configurado
- [ ] **GZIP:** Ativado no servidor

### Metas de Performance

- **First Contentful Paint:** <1.5s
- **Time to Interactive:** <3s
- **Total Page Size:** <2MB
- **PageSpeed Score:** >90 (mobile e desktop)

### Ferramentas de Teste

- Google PageSpeed Insights
- GTmetrix
- WebPageTest
- Chrome DevTools (Lighthouse)

---

## 🐛 Troubleshooting

### Countdown não aparece

**Problema:** Timer não renderiza
**Solução:**
```javascript
// Verificar se elemento existe
console.log(document.getElementById('hero-countdown'));

// Verificar data target
console.log(new Date(targetDate));
```

### Formulário não envia

**Problema:** Submissão falha
**Soluções:**
1. Verificar URL do endpoint
2. Checar CORS no servidor
3. Testar com Postman
4. Ver console do navegador (F12)

### Quiz não avança

**Problema:** Respostas não salvam
**Solução:**
```javascript
// Verificar localStorage
console.log(localStorage.getItem('td_quiz_answers'));

// Limpar e testar novamente
localStorage.clear();
```

### Pixels não disparam

**Problema:** Eventos não rastreiam
**Soluções:**
1. FB Pixel Helper (Chrome extension)
2. GA Debugger (Chrome extension)
3. Verificar IDs corretos
4. Testar em modo incógnito

### CSS não aplica

**Problema:** Estilos não carregam
**Soluções:**
1. Verificar caminho do arquivo
2. Limpar cache do navegador
3. Hard refresh (Ctrl+Shift+R)
4. Verificar prioridade CSS (specificity)

### Mobile quebrado

**Problema:** Layout ruim em mobile
**Soluções:**
1. Usar DevTools responsive mode
2. Testar em dispositivo real
3. Verificar media queries
4. Ajustar breakpoints

---

## 📞 Suporte e Contato

**Email:** suporte@treinadordavid.pt
**WhatsApp:** +351 912 345 678
**Website:** https://treinadordavid.pt

---

## 📝 Licença e Uso

Sistema proprietário desenvolvido para Treinador David.

**Uso Permitido:**
- ✅ Uso interno no site treinadordavid.pt
- ✅ Modificações e customizações
- ✅ Testes e desenvolvimento

**Uso Proibido:**
- ❌ Revenda ou distribuição
- ❌ Uso em outros domínios sem licença
- ❌ Remoção de créditos

---

## 🚀 Roadmap Futuro

### Fase 2 (Próximo Trimestre)
- [ ] A/B testing de headlines
- [ ] Quiz dinâmico com IA
- [ ] Chatbot de suporte
- [ ] Webinar funnel
- [ ] Upsell para curso online

### Fase 3 (Futuro)
- [ ] App mobile integration
- [ ] Membership area
- [ ] Affiliate program
- [ ] Gamification

---

**Última Atualização:** 2024-11-16
**Versão:** 1.0.0
**Desenvolvido por:** Treinador David Team

**Semper Fidelis** 💪
