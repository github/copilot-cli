# Elementor Templates - TD Funnels

Templates prontos para importar no Elementor Pro

## 📦 Arquivos Incluídos

- `hero-section.json` - Hero section com vídeo de fundo
- `depende-section.json` - Seção "DEPENDE!" característical do TD
- `testimonial-cards.json` - Cards de depoimentos estilo militar
- `lead-capture-form.json` - Formulário de captura estratégico
- `countdown-timer.json` - Timer de urgência
- `cta-boxes.json` - Boxes de call-to-action

## 🔧 Como Importar no Elementor

### Método 1: Importar Template Completo

1. WordPress Admin → Templates → Saved Templates
2. Clicar em "Import Templates"
3. Selecionar arquivo .json
4. Clicar em "Import Now"
5. Template estará disponível na biblioteca

### Método 2: Importar Seções Individuais

1. Editar página com Elementor
2. Clicar no ícone de pasta (My Templates)
3. Tab "Saved"
4. Importar arquivo .json específico
5. Arrastar template para a página

## 🎨 Customização

### Cores TD (Já Configuradas)

```css
--td-primary: #0EA5E9  (Azul TD)
--td-dark: #0B1220     (Preto/Dark Blue)
--td-white: #FFFFFF    (Branco)
--td-accent: #10B981   (Verde CTAs)
```

### Fontes TD (Já Configuradas)

- **Headings:** Oswald, 700 weight
- **Body:** Inter, 400/600 weights
- **Accent:** Bebas Neue

### Como Editar

1. **Textos:** Clique direto no texto para editar
2. **Cores:** Aba Style → Color → Usar cores globais TD
3. **Espaçamentos:** Aba Advanced → Padding/Margin
4. **Responsive:** Usar ícone de dispositivo (desktop/tablet/mobile)

## 🔗 Integrações Necessárias

### Formulários

Os formulários precisam ser conectados a:

**Opção 1: Elementor Forms + Webhook**
1. Elementor → Form → Actions After Submit
2. Webhook URL: `https://treinadordavid.pt/wp-json/td/v1/lead-capture`

**Opção 2: Elementor Forms + Email Marketing**
- MailChimp
- ActiveCampaign
- ConvertKit

### Pixels de Conversão

Adicionar em: WordPress Admin → Elementor → Settings → Custom Code

```html
<!-- Facebook Pixel -->
<script>
!function(f,b,e,v,n,t,s){...}
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>

<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('config', 'YOUR_GA_ID');
</script>
```

### Calendly

1. Instalar widget Calendly
2. Adicionar URL: `https://calendly.com/seu-usuario/consulta`
3. Configurar em botão/link

## 📱 Mobile Optimization

Todos os templates são mobile-first. Para ajustar:

1. Clicar no ícone do dispositivo (bottom bar)
2. Escolher: Desktop / Tablet / Mobile
3. Ajustar elementos específicos para cada tela
4. Ocultar elementos em mobile: Advanced → Responsive → Hide On Mobile

## ⚡ Performance

### Otimização de Velocidade

1. **Lazy Load:** Ativado por padrão em imagens
2. **Minify CSS/JS:** Elementor → Settings → Features → Minify
3. **Cache:** Usar WP Rocket ou W3 Total Cache
4. **CDN:** Cloudflare (grátis)

### Checklist de Performance

- [ ] Imagens otimizadas (<200KB cada)
- [ ] Vídeos hospedados no YouTube/Vimeo (não WordPress)
- [ ] Lazy load ativado
- [ ] Cache configurado
- [ ] CDN configurado
- [ ] CSS/JS minificados

## 🎯 Tracking de Conversões

### Eventos para Rastrear

1. **Page View:** Automático (GA + FB Pixel)
2. **Scroll Depth:** 25%, 50%, 75%, 100%
3. **Form Submit:** Lead capture, opt-ins
4. **Button Clicks:** CTAs principais
5. **Video Play:** Hero videos, welcome videos

### Como Configurar

Usar Custom Code em cada template:

```javascript
// Track button click
document.querySelector('.td-btn-primary').addEventListener('click', function() {
  gtag('event', 'click', {'event_category': 'CTA', 'event_label': 'Consulta Gratuita'});
  fbq('track', 'Lead');
});
```

## 🛠️ Troubleshooting

### Template não importa

**Solução:**
1. Verificar versão Elementor Pro (mínimo 3.0)
2. Aumentar PHP memory_limit (mínimo 256MB)
3. Verificar permissões de arquivo

### Fontes não aparecem

**Solução:**
1. Elementor → Custom Fonts
2. Upload Oswald + Bebas Neue
3. Ou usar Google Fonts integration

### Cores não aplicam

**Solução:**
1. Elementor → Site Settings → Global Colors
2. Configurar cores TD
3. Reaplicar nos elementos

### Formulário não envia

**Solução:**
1. Verificar Actions After Submit
2. Testar email/webhook
3. Checar logs de erro
4. Verificar plugin de spam (recaptcha)

## 📞 Suporte

Problemas com templates?

- Email: suporte@treinadordavid.pt
- WhatsApp: +351 912 345 678
- Documentação: https://docs.treinadordavid.pt

---

**Semper Fidelis - Treinador David** 💪
