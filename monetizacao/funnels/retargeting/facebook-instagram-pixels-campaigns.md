# RETARGETING FACEBOOK & INSTAGRAM - TREINADOR DAVID

## PARTE 1: INSTALAÇÃO FACEBOOK PIXEL

### Código Base do Pixel (Instalar no header do WordPress)

```html
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'SEU_PIXEL_ID_AQUI');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=SEU_PIXEL_ID_AQUI&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel Code -->
```

### Eventos Personalizados por Página

**Landing Page - Consultoria Personal:**
```html
<script>
fbq('track', 'ViewContent', {
  content_name: 'Consultoria Personal Training',
  content_category: 'Personal Training',
  value: 497,
  currency: 'BRL'
});
</script>
```

**Landing Page - Programa Group:**
```html
<script>
fbq('track', 'ViewContent', {
  content_name: 'Programa Online Group',
  content_category: 'Group Training',
  value: 97,
  currency: 'BRL'
});
</script>
```

**Landing Page - Desafio 30 Dias:**
```html
<script>
fbq('track', 'ViewContent', {
  content_name: 'Desafio 30 Dias ABS',
  content_category: 'Challenge',
  value: 197,
  currency: 'BRL'
});
</script>
```

**Download Ebook:**
```html
<script>
fbq('track', 'Lead', {
  content_name: 'Ebook 7 Erros Fatais',
  content_category: 'Lead Magnet'
});
</script>
```

**Agendamento Consultoria:**
```html
<script>
fbq('track', 'Schedule', {
  content_name: 'Consultoria Agendada',
  value: 0,
  currency: 'BRL'
});
</script>
```

**Compra - Programa Group:**
```html
<script>
fbq('track', 'Purchase', {
  content_name: 'Programa Group',
  content_type: 'product',
  value: 97,
  currency: 'BRL'
});
</script>
```

**Compra - Consultoria Personal:**
```html
<script>
fbq('track', 'Purchase', {
  content_name: 'Personal Training',
  content_type: 'product',
  value: 497,
  currency: 'BRL'
});
</script>
```

**Compra - Desafio:**
```html
<script>
fbq('track', 'Purchase', {
  content_name: 'Desafio 30 Dias',
  content_type: 'product',
  value: 197,
  currency: 'BRL'
});
</script>
```

---

## PARTE 2: PÚBLICOS PERSONALIZADOS (Custom Audiences)

### 1. Público: Visitantes do Site (30 dias)
**Nome:** Site Visitors - 30 Days
**Regra:** Todas as pessoas que visitaram qualquer página nos últimos 30 dias
**Uso:** Retargeting geral

### 2. Público: Leitores de Artigos
**Nome:** Blog Readers - Engajados
**Regra:** Visitaram /artigos/* OU /blog/* E tempo no site > 60 segundos
**Uso:** Warm audience para ofertas de conteúdo

### 3. Público: Visualizou Landing Page - Personal
**Nome:** LP Personal Training Viewers
**Regra:** URL contém "/consultoria-personal-training"
**Uso:** Retargeting específico para Personal

### 4. Público: Visualizou Landing Page - Group
**Nome:** LP Group Viewers
**Regra:** URL contém "/programa-online-group"
**Uso:** Retargeting para Group

### 5. Público: Baixou Ebook (Não Comprou)
**Nome:** Ebook Downloads - Não Clientes
**Regra:** Evento "Lead" disparado + NÃO disparou evento "Purchase"
**Uso:** Nutrir leads quentes

### 6. Público: Abandonou Carrinho/Formulário
**Nome:** Checkout Abandoners
**Regra:** Iniciou checkout MAS não completou compra (15 dias)
**Uso:** Recuperação de carrinho

### 7. Público: Clientes Ativos
**Nome:** Active Customers
**Regra:** Evento "Purchase" nos últimos 60 dias
**Uso:** EXCLUIR de campanhas de aquisição, incluir em upsell

### 8. Público: Ex-Clientes
**Nome:** Past Customers (60+ days)
**Regra:** Evento "Purchase" entre 60-365 dias atrás
**Uso:** Reativação

### 9. Público: Assistiu Vídeo (75%+)
**Nome:** Video Viewers 75%
**Regra:** Assistiu 75% ou mais de qualquer vídeo
**Uso:** Público quente para conversão

### 10. Público: Engajou Instagram/Facebook
**Nome:** Social Engagers
**Regra:** Interagiu com posts, stories, salvou conteúdo (90 dias)
**Uso:** Warm audience

---

## PARTE 3: CAMPANHAS DE RETARGETING

### CAMPANHA 1: Visitantes do Site (Topo de Funil)

**Objetivo:** Brand Awareness + Engagement
**Público:** Site Visitors - 30 Days (EXCETO Active Customers)
**Budget:** R$ 300/mês
**Placement:** Feed + Stories IG/FB

**Criativos (Carrossel 3-5 cards):**

**Card 1:**
- Imagem: Treinador David em pose forte
- Texto: "Visitou meu site. Não me conhece ainda? Ex-USMC, 30 anos transformando corpos."
- CTA: Saiba Mais

**Card 2:**
- Vídeo: Depoimento cliente (30 seg)
- Texto: "Isso funciona? Veja o que dizem quem já treina comigo."
- CTA: Ver Depoimentos

**Card 3:**
- Imagem: Before/After dramático
- Texto: "Resultados reais. Sem photoshop. Sem mentira. DEPENDE de você agir."
- CTA: Conhecer Programas

**Texto do Anúncio:**
```
Você visitou meu site. Significa que quer mudar seu corpo.

Questão é: Vai fazer algo a respeito?

Ou vai continuar "pesquisando"?

30 anos treinando pessoas. Ex-Marines. Zero enrolação.

Escolha seu programa:
→ Personal 1-on-1
→ Programa Group
→ Desafio 30 Dias

DEPENDE! De você clicar.

#TreinadorDavid #Fitness #Disciplina
```

---

### CAMPANHA 2: Baixou Ebook → Vender Programa Group

**Objetivo:** Conversão
**Público:** Ebook Downloads - Não Clientes
**Budget:** R$ 500/mês
**Placement:** Feed + Stories + Messenger

**Criativo 1 (Vídeo 30 seg):**
- TD falando direto para câmera
- Script: "Baixou meu ebook. Aplicou? Ou só leu e guardou? Teoria sem ação = ZERO. Entre pro Programa Group. R$ 97/mês. Treinos prontos, comunidade, resultados. Pare de procrastinar."

**Criativo 2 (Imagem Estática):**
- Mockup do grupo WhatsApp com mensagens de membros
- Texto overlay: "850+ pessoas treinando juntas. Falta você."
- Botão: "Entrar no Pelotão - R$ 97/mês"

**Criativo 3 (Carrossel Comparação):**
- Card 1: "Sozinho: Sem estrutura, sem motivação, sem resultados"
- Card 2: "No Group: Treinos semanais + Comunidade + Lives"
- Card 3: "R$ 97/mês = R$ 3,20/dia. Menos que um café."
- Card 4: "Escolha: Continuar igual ou transformar?"

**Texto do Anúncio:**
```
Você baixou meu ebook "7 Erros Fatais".

Identificou seus erros?

Agora vem a parte difícil: CORRIGIR.

E pra isso você precisa de:
✓ Estrutura (treinos planejados)
✓ Accountability (comunidade)
✓ Orientação (lives semanais)

É exatamente isso que o Programa Online Group oferece.

R$ 97/mês. Menos que suplemento que você toma e não funciona.

Invista no que REALMENTE funciona.

[ENTRAR NO PELOTÃO]

DEPENDE! De você escolher ação sobre teoria.
```

**Sequência Multi-Touch:**
- Dia 1-3: Mostrar Criativo 1 (vídeo)
- Dia 4-7: Mostrar Criativo 2 (social proof)
- Dia 8-14: Mostrar Criativo 3 (comparação + preço)

---

### CAMPANHA 3: Visualizou LP Personal → Agendar Consultoria

**Objetivo:** Lead Generation (Agendamentos)
**Público:** LP Personal Training Viewers (EXCETO quem já agendou)
**Budget:** R$ 400/mês
**Placement:** Feed + Stories + Messenger

**Criativo 1 (Vídeo Depoimento Cliente Personal):**
- Cliente real contando experiência
- Resultados em 90 dias
- Menciona "atenção individual" e "programa personalizado"
- CTA: "Agende Consultoria Gratuita"

**Criativo 2 (Imagem: TD + Cliente Treinando):**
- Foto de sessão 1-on-1
- Texto overlay: "Atenção 100% Individual. WhatsApp Direto Comigo. Zero Genérico."
- Botão: "Agendar Consultoria"

**Texto do Anúncio:**
```
Você visitou a página do Personal Training 1-on-1.

Significa que quer resultado MÁXIMO.

Personal Training comigo não é pra todo mundo.

É pra quem:
✓ Quer programa 100% personalizado
✓ Precisa de atenção individual
✓ Está disposto a investir R$ 497/mês
✓ Quer resultados no menor tempo possível

Se você é essa pessoa, vamos conversar.

Consultoria GRATUITA de 50 minutos.

Vou avaliar sua situação e montar plano personalizado.

Sem compromisso. Sem pressão.

Apenas 3 vagas/mês.

[AGENDAR AGORA]

DEPENDE! De você dar o primeiro passo.
```

---

### CAMPANHA 4: Abandonou Checkout → Recuperação

**Objetivo:** Conversão (Recuperar vendas)
**Público:** Checkout Abandoners
**Budget:** R$ 200/mês
**Placement:** Feed + Stories + Messenger

**Criativo 1 (Urgência):**
- Imagem: Relógio + "Sua vaga expira em 24h"
- Cores: Vermelho + Preto
- CTA: "Completar Inscrição"

**Criativo 2 (Desconto 10%):**
- "Volte agora e ganhe 10% OFF"
- Cupom: VOLTEI10
- Válido por 48h

**Texto do Anúncio:**
```
Você quase garantiu sua vaga...

MAS não completou a inscrição.

O que aconteceu?

( ) Dúvida sobre o programa?
( ) Preço?
( ) Timing?

Se for DÚVIDA: Responda este anúncio. Tiro todas.

Se for PREÇO: Use cupom VOLTEI10 (10% OFF válido 48h)

Se for TIMING: Sem problema. Volta quando puder.

Mas se é só procrastinação...

PARE.

Essa vaga pode não estar disponível amanhã.

[COMPLETAR INSCRIÇÃO - 10% OFF]

DEPENDE! De você decidir AGORA.
```

**Frequência:** 3x em 7 dias (não mais que isso para não irritar)

---

### CAMPANHA 5: Ex-Clientes → Reativação

**Objetivo:** Conversão (Reativar cancelados)
**Público:** Past Customers (60+ days)
**Budget:** R$ 300/mês
**Placement:** Feed + Messenger

**Criativo 1 (Nostalgia):**
- Imagem: "Lembra dos seus resultados?"
- Before/After genérico
- CTA: "Voltar a Treinar"

**Criativo 2 (Novidade):**
- "Novidades desde que você saiu:"
- Lista de updates do programa
- CTA: "Ver Novidades"

**Texto do Anúncio:**
```
Você já foi do pelotão.

Treinava comigo. Tinha resultados.

Mas parou. (Sem julgamento - vida acontece)

Pergunta:

Você manteve os resultados que tinha conseguido?

Se SIM: Parabéns! Missão cumprida.

Se NÃO: Hora de voltar.

OFERTA ESPECIAL PARA EX-ALUNOS:

→ 30% OFF no primeiro mês de volta
→ Cupom: BEMDEVOLTA30
→ Válido até [DATA]

Seus dados ainda estão salvos.
Seu progresso anterior também.

É só voltar e continuar de onde parou.

[REATIVAR AGORA]

DEPENDE! De você escolher voltar.
```

---

### CAMPANHA 6: Lookalike Audiences (Aquisição Fria)

**Objetivo:** Aquisição novos leads
**Público:** Lookalike 1% de "Ebook Downloads" + Interesses: Fitness, Musculação, Dieta
**Budget:** R$ 600/mês
**Placement:** Feed + Stories IG/FB + Reels

**Criativo 1 (Hook forte - Vídeo 15 seg):**
- TD: "Você está treinando mas não emagrece? Erro #1..."
- Corte para problema
- CTA: "Baixe ebook grátis"

**Criativo 2 (Before/After Impactante):**
- Transformação real
- Tempo: "90 dias"
- Método: "Disciplina Militar TD"
- CTA: "Saiba Como"

**Criativo 3 (Teste Social - UGC Style):**
- Screenshot de depoimento
- Vídeo de cliente falando
- Mais autêntico, menos produzido

**Texto do Anúncio:**
```
Se você treina mas não vê resultado...

Está cometendo um dos 7 ERROS FATAIS.

Download GRÁTIS: Ebook "7 Erros que Sabotam Seu Físico"

Descubra:
✓ Por que você treina mas não emagrece
✓ O erro #1 que impede ganho de massa
✓ Como corrigir em menos de 30 dias

30 anos de experiência USMC + Personal Training.

Zero enrolação. Só o que funciona.

[BAIXAR EBOOK GRÁTIS]

DEPENDE! De você querer a verdade.

#TreinadorDavid #Fitness #EmagrecerComSaude
```

---

## PARTE 4: BUDGET MENSAL SUGERIDO

| Campanha | Budget/Mês | Objetivo | ROI Esperado |
|----------|------------|----------|--------------|
| 1. Visitantes Site | R$ 300 | Brand Awareness | Indireto |
| 2. Ebook → Group | R$ 500 | Conversão | 5:1 |
| 3. LP Personal → Consultoria | R$ 400 | Leads | 3:1 |
| 4. Recuperação Carrinho | R$ 200 | Conversão | 8:1 |
| 5. Reativação Ex-Clientes | R$ 300 | Conversão | 6:1 |
| 6. Lookalike Cold | R$ 600 | Aquisição | 2:1 |
| **TOTAL** | **R$ 2.300/mês** | - | **3-4:1 médio** |

---

## PARTE 5: MÉTRICAS PARA ACOMPANHAR

**KPIs Principais:**

1. **CPM (Cost Per Mille):** Meta: R$ 15-30
2. **CTR (Click-Through Rate):** Meta: >2%
3. **CPC (Cost Per Click):** Meta: R$ 1-3
4. **CPL (Cost Per Lead):** Meta: R$ 15-30
5. **CPA (Cost Per Acquisition):** Meta: R$ 100-200
6. **ROAS (Return on Ad Spend):** Meta: >3

**Análise Semanal:**

- Segunda: Review resultados semana anterior
- Quarta: Ajustes de budget baseado em performance
- Sexta: Teste de novos criativos

**Análise Mensal:**

- Campanhas com ROAS <2 → Pausar ou otimizar
- Campanhas com ROAS >5 → Aumentar budget
- Atualizar públicos personalizados
- Criar novos testes A/B

---

## PARTE 6: TESTES A/B RECOMENDADOS

### Teste 1: Vídeo vs Imagem Estática
- 50% budget em vídeo
- 50% em imagem
- Rodar 7 dias
- Escalar o vencedor

### Teste 2: Texto Longo vs Curto
- Versão A: 300+ palavras (storytelling)
- Versão B: <100 palavras (direto ao ponto)

### Teste 3: CTA Diferentes
- "Baixar Agora" vs "Sim, Quero" vs "Começar Hoje"

### Teste 4: Social Proof vs Autoridade
- Depoimentos clientes vs Credenciais TD (USMC, 30 anos)

### Teste 5: Preço Upfront vs Oculto
- Mostrar R$ 97/mês logo vs Esconder até landing page

---

## INSTRUÇÕES DE IMPLEMENTAÇÃO

1. **Instalar Pixel:** Código no <head> do WordPress (via plugin ou direto no tema)

2. **Verificar Eventos:** Facebook Events Manager → Testar cada evento

3. **Criar Públicos:** Ads Manager → Audiences → Criar Custom Audiences

4. **Configurar Campanhas:**
   - Uma campanha por objetivo
   - 2-3 ad sets por campanha (diferentes públicos)
   - 3-5 criativos por ad set

5. **Configurar Conversions API (Avançado):**
   - Integração server-side para tracking mais preciso
   - Plugin: "Facebook Conversions API" ou usar Zapier

6. **UTM Tracking:**
   - Todos os links com UTM parameters
   - Formato: ?utm_source=facebook&utm_medium=retargeting&utm_campaign=ebook-to-group

7. **Integração com CRM:**
   - Leads do Facebook → ActiveCampaign/HubSpot
   - Via Zapier ou integração nativa

**Próximos Passos:**

→ Semana 1: Instalar pixel + criar públicos
→ Semana 2: Lançar Campanha 6 (Cold) + Campanha 2 (Ebook)
→ Semana 3: Adicionar Campanhas 1, 3
→ Semana 4: Adicionar Campanhas 4, 5
→ Mês 2: Otimizar baseado em dados
