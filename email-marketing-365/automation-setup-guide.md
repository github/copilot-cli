# Guia de Setup de Automação - Email Arsenal TD

Guia completo passo a passo para configurar o sistema de 365 emails.

---

## 📋 Pré-requisitos

### Contas Necessárias

✅ **Email Marketing Platform**
- ActiveCampaign (recomendado) OU
- ConvertKit OU
- MailChimp

✅ **Website/Forms**
- WordPress com formulários
- OU Landing pages com captura

✅ **Analytics**
- Google Analytics
- Facebook Pixel (opcional)

✅ **Assets**
- Logo TD
- Header images
- Social icons

---

## 🚀 FASE 1: Setup Inicial (Dia 1)

### Step 1.1: Criar Conta Email Platform

**ActiveCampaign (Recomendado):**

1. Acesse https://activecampaign.com
2. Plano mínimo: Plus ($49/mês para 1,000 contacts)
3. Setup inicial:
   - Nome: Treinador David
   - Website: treinadordavid.pt
   - Timezone: Europe/Lisbon
   - Currency: EUR

### Step 1.2: Configurar Domínio

```bash
# DNS Records necessários (adicionar em registrador de domínio)

# SPF Record
Type: TXT
Name: @
Value: v=spf1 include:servers.mcsv.net ~all

# DKIM Record
Type: TXT
Name: k1._domainkey
Value: [fornecido pela plataforma]

# DMARC Record
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:contato@treinadordavid.pt
```

**Verificação:**
1. Enviar email de teste
2. Verificar em https://mxtoolbox.com
3. Confirmar SPF, DKIM, DMARC passam

### Step 1.3: Importar Templates HTML

1. Navegar para: Settings → Templates
2. Upload `base-template.html`
3. Configurar variáveis:
   - `{{FIRST_NAME}}`
   - `{{SUBJECT}}`
   - `{{PREVIEW_TEXT}}`
   - `{{CONTENT}}`
   - `{{CTA_TEXT}}`
   - `{{CTA_URL}}`
   - `{{PS_TEXT}}`

4. Testar template:
   - Enviar para email pessoal
   - Verificar mobile/desktop
   - Confirmar links funcionam

---

## 🎯 FASE 2: Listas e Segmentação (Dia 1-2)

### Step 2.1: Criar Listas

```
Lista Principal:
- Nome: TD Master List
- Descrição: Todos os leads TD
- Campos customizados:
  * first_name (texto)
  * last_name (texto)
  * phone (texto)
  * goal (seleção: perder-peso, ganhar-musculo, etc)
  * experience_level (seleção: iniciante, intermediario, avancado)
  * lead_source (texto)
  * lead_date (data)
  * last_engagement (data)
```

### Step 2.2: Criar Tags

**Lifecycle Tags:**
```
- lead-new
- lead-warm
- lead-hot
- lead-cold
- customer-active
- customer-churned
```

**Engagement Tags:**
```
- engagement-high (abriu 5+ últimos 7 dias)
- engagement-medium (abriu 2-4 últimos 7 dias)
- engagement-low (abriu 0-1 últimos 7 dias)
- inactive-7days
- inactive-14days
- inactive-30days
- inactive-60days
- inactive-90days
```

**Interest Tags:**
```
- interest-training
- interest-nutrition
- interest-mindset
- interest-weight-loss
- interest-muscle-gain
- interest-performance
```

**Sequence Tags:**
```
- in-welcome-sequence
- in-educational-drip
- in-re-engagement
- in-cart-abandonment
- in-post-purchase
```

**Product Interest:**
```
- product-consultoria
- product-programa-90dias
- product-ebook
- product-desafio-30dias
```

### Step 2.3: Criar Segmentos

```
Segmento: High Engagement
Condições:
- Tag "engagement-high" existe
- OU Abriu email nos últimos 7 dias >= 3x
- E Não tem tag "customer-active"

Segmento: Leads Quentes
Condições:
- Tag "lead-warm" OU "lead-hot"
- Clicou em link últimos 14 dias >= 1x
- Não tem tag "inactive-*"

Segmento: Inativos 30 dias
Condições:
- Último email aberto há mais de 30 dias
- Não tem tag "customer-active"
- Subscribed = Yes
```

---

## 📧 FASE 3: Welcome Sequence (Dia 2-3) - PRIORIDADE #1

### Step 3.1: Criar Automação Welcome

**ActiveCampaign:**

1. Automations → Create New Automation
2. Nome: "Welcome Sequence - Batalhão TD"
3. Trigger: "Contact subscribes to list: TD Master List"

### Step 3.2: Configurar Trigger

```
Trigger Options:
- List: TD Master List
- Tag to add: in-welcome-sequence
- Start date: Immediate
```

### Step 3.3: Adicionar Emails (14 emails)

```
Email 1: Bem-vindo ao Batalhão TD
├── Delay: None (immediate)
├── Send time: Immediately
├── Template: base-template.html
├── Subject: [A/B/C test 3 variations]
├── Add tag: welcome-day-1-sent
└── Wait: 24 hours

Email 2: Minha História USMC
├── Delay: +24h from previous
├── Send time: 9:00 AM contact timezone
├── Template: base-template.html
├── Condition: Opened Email 1? Yes → Continue, No → Wait 12h then send
├── Add tag: welcome-day-2-sent
└── Wait: 24 hours

Email 3: Por que DEPENDE!
├── Delay: +24h from previous
├── Send time: 9:00 AM
├── Template: base-template.html
├── Add tag: welcome-day-3-sent
└── Wait: 24 hours

[... continuar até Email 14]

Email 12: Convite Consultoria ⭐ (MAIS IMPORTANTE)
├── Delay: +264h from start
├── Send time: 10:00 AM
├── Template: base-template.html
├── CTA: Agendar Consulta Grátis
├── Goal: If clicks CTA → Exit to "Consultation Scheduled" automation
├── Add tag: welcome-day-12-sent, consultation-invited
└── Wait: 24 hours

Email 14: Última Chamada + Oferta
├── Delay: +312h from start
├── Send time: 10:00 AM
├── Template: base-template.html
├── CTA: Oferta Especial 50% OFF
├── Add tag: welcome-completed
├── Remove tag: in-welcome-sequence
└── End: Add to Educational Drip automation
```

### Step 3.4: Branching Logic

```
After Email 12 (Consultation Invite):

IF clicked CTA:
  → Exit Welcome Sequence
  → Add tag "consultation-interested"
  → Enter "Consultation Follow-up" automation
  → Send Calendly link

ELSE IF scheduled consultation:
  → Exit Welcome Sequence
  → Add tag "consultation-scheduled"
  → Enter "Pre-Consultation" automation
  → Remove from all other sequences

ELSE (not interested):
  → Continue to Email 13 & 14
  → Complete Welcome Sequence
  → Enter Educational Drip
```

### Step 3.5: Testing Welcome Sequence

```bash
# Teste completo:
1. Criar contact de teste: test@youremail.com
2. Adicionar à lista
3. Verificar Email 1 chega imediatamente
4. Avançar manualmente +24h (AC tem feature de "fast forward")
5. Verificar Email 2 chega
6. Testar branching: clicar/não clicar CTAs
7. Verificar tags sendo adicionadas corretamente
8. Confirmar exit conditions funcionam
9. Deletar contact de teste e repetir
```

---

## 📚 FASE 4: Educational Drip (Dia 4-7)

### Step 4.1: Criar Automação Educational

```
Automation Name: "Educational Drip - 52 Weeks"
Trigger:
- Tag "in-educational-drip" is added
- OR Welcome Sequence completed
- OR Manually added
```

### Step 4.2: Estrutura (52 Semanas)

```
Week 1: Fundamentos do Treino
├── Send: Monday 9:00 AM
├── Condition: Is customer? No → Send
├── Add tag: edu-week-01
└── Wait: 7 days

Week 2: Proteína: Quanto, Quando, Como
├── Send: Monday 9:00 AM
├── Add tag: edu-week-02
└── Wait: 7 days

[... continuar 52 semanas]

Week 52: Planejamento 2026
├── Send: Monday 9:00 AM
├── Add tag: edu-week-52, edu-completed
├── Remove tag: in-educational-drip
└── End: Restart sequence OR Move to maintenance
```

### Step 4.3: Segmentação Educational

```
IF customer-active:
  → Skip educational, send customer-specific content

IF high-engagement (opened 80%+ of emails):
  → Tag as "super-fan"
  → Offer advanced content

IF low-engagement (opened <20%):
  → Reduce frequency to biweekly
  → OR Move to re-engagement
```

---

## 💰 FASE 5: Promotional (Dia 8-10)

### Step 5.1: Criar 12 Campanhas Mensais

```
Campanha Janeiro:
- Name: "Janeiro - Novo Ano Nova Versão"
- Send date: Jan 1, 10:00 AM
- Segment: All non-customers
- Subject: [3 A/B variations]
- Goal: Sell Programa 90 Dias
- Success metric: 3-5% conversion

Campanha Fevereiro:
- Name: "Fevereiro - Especial Carnaval Cutting"
- Send date: Feb 1, 10:00 AM
- Segment: All + interest-weight-loss
- Offer: Plano Cutting
- Discount: 20%

[... 12 campanhas, uma por mês]
```

### Step 5.2: Promotional Calendar

```csv
Month,Date,Campaign,Offer,Discount,Segment
Janeiro,01-01,Novo Ano,Programa 90 Dias,30%,All
Fevereiro,02-01,Carnaval Cutting,Plano Cutting,20%,Weight-loss
Março,03-01,Bulking Season,Plano Bulking,20%,Muscle-gain
Abril,04-01,Desafio 30 Dias,Challenge,0% (free),All
Maio,05-01,Dia das Mães,Programa Mulheres,25%,Female
Junho,06-01,Inverno Massa,Bulk Program,20%,Muscle-gain
Julho,07-01,Mid-Year Checkin,Consultoria,40%,Warm leads
Agosto,08-01,Dia dos Pais,Programa 40+,25%,Male 40+
Setembro,09-01,Primavera Cut,Cutting,20%,All
Outubro,10-15,Black Friday Early,All Products,25%,All
Novembro,11-25,Black Friday,All Products,50%,All
Dezembro,12-01,Planejamento 2026,Programa Anual,30%,All
```

---

## 🔄 FASE 6: Engagement/Nurture (Dia 11-14)

### Step 6.1: Configurar 2x/Semana

```
Schedule:
- Segunda-feira: Educational Drip (09:00)
- Quinta-feira: Engagement Email (19:00)
```

### Step 6.2: Rotação de Conteúdo

```
Quinta-feira Semana 1: Motivação
Quinta-feira Semana 2: Dica de Treino
Quinta-feira Semana 3: Nutrição Prática
Quinta-feira Semana 4: História/Case Study
[Repetir ciclo]
```

### Step 6.3: Automation Engagement

```
Automation: "Thursday Engagement Rotation"

Email 1: Motivação - Disciplina vs Motivação
├── Send: Thursday 19:00
├── Segment: High + Medium engagement
├── Add tag: engagement-motivacao-01
└── Wait: 14 days

Email 2: Dica - Técnica Agachamento
├── Send: Thursday 19:00
├── Segment: All
├── Add tag: engagement-dica-01
└── Wait: 14 days

[... rodar ciclo de 26 emails por categoria]
```

---

## 🔁 FASE 7: Re-engagement (Dia 15-17)

### Step 7.1: Automation Inativo 7 Dias

```
Trigger:
- Last email opened > 7 days ago
- Has tag "engagement-medium" OR "engagement-low"
- Does NOT have tag "customer-active"

Email 1: "Sentimos sua falta"
├── Delay: None
├── Subject: "{{FIRST_NAME}}, notamos sua ausência..."
├── Add tag: reengagement-7d-sent
└── Wait: 3 days

Email 2: "Ainda interessado?"
├── If opened Email 1: Exit re-engagement
├── Subject: "Tudo bem por aí?"
├── Offer: Melhor conteúdo gratuito
└── End: Back to normal sequence OR Continue to 14d
```

### Step 7.2: Escalating Re-engagement

```
7 dias → 2 emails (suave)
14 dias → 3 emails (direto)
30 dias → 5 emails (agressivo + 30% desconto)
60 dias → 5 emails (muito agressivo + 50% desconto)
90 dias → 5 emails (breakup sequence, opt-out suave)
```

---

## 🛒 FASE 8: Cart Abandonment (Dia 18-19)

### Step 8.1: Webhook Setup

**WordPress/WooCommerce:**

```php
// functions.php
add_action('woocommerce_cart_updated', 'td_track_cart_update');

function td_track_cart_update() {
    $cart_items = WC()->cart->get_cart();
    $email = WC()->customer->get_email();

    // Send to ActiveCampaign
    $data = [
        'email' => $email,
        'cart_value' => WC()->cart->total,
        'cart_items' => json_encode($cart_items)
    ];

    // Webhook to AC
    wp_remote_post('https://trackcmp.net/event', [
        'body' => $data
    ]);
}
```

### Step 8.2: Abandonment Automations

```
Trigger: Event "cart_updated" received + No purchase in 30 minutes

Series 1: Form Abandonment
├── +1h: "Esqueceu algo?"
├── +24h: "Vamos conversar?"
└── +72h: "10% OFF última chance"

Series 2: Pricing Page
├── +2h: "Dúvidas sobre preços?"
├── +24h: "Encontrar plano ideal"
└── +48h: "Parcelamento especial"

Series 3: Checkout
├── +30min: "Algo deu errado?"
├── +4h: "Carrinho expira em 24h"
└── +24h: "URGENTE: Última chance"

Exit condition: Purchase completed
```

---

## 👤 FASE 9: Post-Purchase (Dia 20-21)

### Step 9.1: Trigger on Purchase

```
Webhook: WooCommerce Order Completed
Action:
1. Add tag "customer-active"
2. Add tag "product-[product_name]"
3. Remove from all lead sequences
4. Start Post-Purchase sequence
```

### Step 9.2: Onboarding (Dias 1-7)

```
Day 1: Bem-vindo ao Programa
├── Send: Immediately after purchase
├── Include: Login credentials, Getting started guide
├── Add tag: customer-onboarding-day1
└── Wait: 24h

Day 2: Como Acessar Tudo
├── Video tutorial
├── FAQ link
└── Wait: 24h

[... até Day 7]

Day 7: Primeira Check-in
├── Survey: "Como está indo?"
├── Offer: Agendar call suporte
└── Exit onboarding, enter Weekly Check-ins
```

---

## 📊 FASE 10: Tracking e Analytics (Dia 22-23)

### Step 10.1: Google Analytics Goals

```
Goal 1: Email Signup
- Type: Destination
- URL: /newsletter/obrigado/
- Value: €5

Goal 2: Consultation Scheduled
- Type: Event
- Category: Consultation
- Action: Scheduled
- Value: €50

Goal 3: Product Purchase
- Type: Destination
- URL: /checkout/obrigado/
- Value: [Dynamic]
```

### Step 10.2: UTM Tracking

```
Template UTM para todos os emails:
?utm_source=email
&utm_medium=[sequence-name]
&utm_campaign=[email-id]
&utm_content=[cta-location]

Exemplo:
?utm_source=email
&utm_medium=welcome
&utm_campaign=day-12-consultation
&utm_content=primary-cta
```

### Step 10.3: Dashboard Setup

**Google Data Studio:**

1. Conectar ActiveCampaign + GA
2. Métricas principais:
   - Email sent/opened/clicked
   - Conversion rate por sequência
   - Revenue per email
   - List growth rate
   - Churn rate
3. Atualização: Diária

---

## 🔧 FASE 11: Maintenance e Otimização (Contínua)

### Weekly Tasks

```
Segunda-feira:
- Revisar performance última semana
- A/B test results
- Ajustar subject lines underperforming

Quarta-feira:
- Checar inbox deliverability
- Responder replies
- Update content calendar

Sexta-feira:
- Preparar emails próxima semana
- Agendar campanhas
- Backup de automações
```

### Monthly Tasks

```
First Monday:
- Enviar Promotional Campaign
- Revisar métricas do mês anterior
- Ajustar segmentação
- Limpar lista (hard bounces, spam)

Last Friday:
- Planejar próximo mês
- Criar novos emails se necessário
- Update calendar
```

### Quarterly Review

```
Métricas Q1, Q2, Q3, Q4:
- Overall list health
- Engagement trends
- Revenue attribution
- Churn analysis
- Ajustes estratégicos
```

---

## 📋 Checklist Final de Launch

### Pre-Launch (1 semana antes)

- [ ] Todos templates importados e testados
- [ ] Welcome Sequence completa configurada
- [ ] Educational Drip primeiras 4 semanas prontas
- [ ] Promotional Janeiro agendado
- [ ] Listas e tags criadas
- [ ] Segmentos configurados
- [ ] Tracking implementado (GA, pixels)
- [ ] Domain authentication completo (SPF, DKIM, DMARC)
- [ ] Enviados emails de teste para 10+ dispositivos
- [ ] Unsubscribe links testados
- [ ] Legal compliance (GDPR, CAN-SPAM) OK
- [ ] Backup de todas automações

### Launch Day

- [ ] Monitor inbox deliverability
- [ ] Checar primeiros opens/clicks
- [ ] Responder replies rapidamente
- [ ] Watch for spam complaints
- [ ] Monitor bounce rate
- [ ] Ajustar se necessário

### Post-Launch (Primeira Semana)

- [ ] Daily performance review
- [ ] A/B test analysis
- [ ] Subscriber feedback
- [ ] Deliverability check
- [ ] Refinar automações

---

## 🚨 Troubleshooting

### Problema: Emails indo para spam

**Soluções:**
1. Verificar SPF/DKIM/DMARC
2. Reduzir frequência de envios
3. Melhorar engagement (remove inativos)
4. Testar subject lines em spam checkers
5. Evitar palavras spam ("grátis", "clique aqui", etc)

### Problema: Baixa taxa de abertura (<15%)

**Soluções:**
1. A/B test subject lines
2. Melhor send time
3. Limpar lista (remove inativos)
4. Personalizar mais (usar {{FIRST_NAME}})
5. Segmentar melhor

### Problema: Alta taxa de unsubscribe (>3%)

**Soluções:**
1. Reduzir frequência
2. Melhorar relevância (segmentação)
3. Dar opções de preferências
4. Entregar mais valor
5. Expectativas claras no signup

### Problema: Automação não dispara

**Soluções:**
1. Verificar trigger conditions
2. Checar tags/campos corretos
3. Confirmar contact atende critérios
4. Ver logs de automação
5. Testar com contact de teste

---

## 📞 Suporte

**ActiveCampaign Support:**
- Chat: https://activecampaign.com/support
- Phone: Available on Plus+ plans
- Knowledge Base: https://help.activecampaign.com

**Treinador David Support:**
- Email: suporte@treinadordavid.pt
- WhatsApp: +351 912 345 678
- Documentation: https://docs.treinadordavid.pt

---

**Semper Fidelis - Email Arsenal TD** 📧

**Versão:** 1.0.0
**Última Atualização:** 2024-11-16
