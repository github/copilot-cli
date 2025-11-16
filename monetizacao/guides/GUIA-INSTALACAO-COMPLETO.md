# GUIA DE INSTALAÇÃO COMPLETO - SISTEMA DE MONETIZAÇÃO TD

## ⚡ INSTALAÇÃO RÁPIDA (2-4 HORAS)

### REQUISITOS
- WordPress 6.0+
- Elementor Pro (licença ativa)
- PHP 7.4+
- Email marketing (ActiveCampaign, ConvertKit ou Mailchimp)
- WhatsApp Business API (via ManyChat)
- Facebook Business Manager

---

## PASSO 1: LANDING PAGES (30 MIN)

**1.1 Importar Templates Elementor**
1. WordPress Admin → Elementor → My Templates
2. Import Templates
3. Selecionar cada arquivo JSON em `/monetizacao/landing-pages/elementor-json/`
4. Importar todos os 5:
   - 01-consultoria-personal-training.json
   - 02-programa-online-group.json
   - 03-ebook-gratuito-lead-magnet.json
   - 04-desafio-30-dias-abs.json
   - 05-pagina-obrigado.json

**1.2 Criar Páginas**
1. Pages → Add New
2. Nomear: "Consultoria Personal Training"
3. Edit with Elementor
4. Insert → My Templates → Selecionar template importado
5. Insert
6. Ajustar:
   - Substituir placeholders (emails, links)
   - Adicionar imagens reais
   - Configurar formulários (email destino)
7. Publish
8. Repetir para as outras 4 páginas

**1.3 Configurar URLs Amigáveis**
- /consultoria-personal-training
- /programa-online-group
- /ebook-gratis
- /desafio-30-dias-abs
- /obrigado

---

## PASSO 2: PÁGINAS ESSENCIAIS (30 MIN)

**2.1 Criar com base nos arquivos MD**
1. Sobre: `/monetizacao/essential-pages/pagina-sobre-mim.md`
2. Programas: `/monetizacao/essential-pages/pagina-programas.md`
3. Depoimentos: `/monetizacao/essential-pages/pagina-depoimentos.md`
4. Contato: `/monetizacao/essential-pages/pagina-contato.md`

**2.2 Usar Elementor ou Editor Gutenberg**
- Copiar conteúdo dos arquivos MD
- Formatar com blocos/widgets
- Adicionar imagens
- Configurar formulários

---

## PASSO 3: QUIZ INTERATIVO (15 MIN)

**3.1 Upload do Quiz**
1. Criar página "Quiz"
2. Adicionar bloco HTML personalizado
3. Copiar código de `/monetizacao/funnels/quiz/quiz-qualificacao.html`
4. Colar no bloco
5. Publish

**3.2 Integração (Opcional)**
- Criar endpoint WordPress: `/wp-json/td/v1/quiz-submission`
- Plugin em `/mu-plugins/` para receber dados
- Enviar para CRM via webhook

---

## PASSO 4: EMAIL MARKETING (1 HORA)

**4.1 Plataforma (ActiveCampaign exemplo)**
1. Criar 3 Automations:
   - Sequência Ebook (7 dias)
   - Follow-up Consultoria
   - Onboarding Programa Group

**4.2 Importar Sequências**
1. Abrir `/monetizacao/funnels/email-sequences/`
2. Copiar emails de cada arquivo MD
3. Criar automação na plataforma
4. Configurar triggers:
   - Ebook: Tag "Lead Ebook"
   - Consultoria: Tag "Consultoria Agendada"
   - Group: Tag "Membro Ativo"

**4.3 Configurar Formulários**
- Integrar formulários Elementor com ActiveCampaign
- Plugin: "Elementor Pro Forms - ActiveCampaign"
- Ou via Zapier/Make

---

## PASSO 5: WHATSAPP AUTOMAÇÃO (45 MIN)

**5.1 ManyChat Setup**
1. Criar conta ManyChat
2. Conectar WhatsApp Business
3. Importar Flows de `/monetizacao/funnels/whatsapp/flows-automacao-whatsapp.md`
4. Configurar keywords:
   - "dieta", "nutrição" → Flow Nutrição
   - "preço", "valor" → Flow Preço
   - etc.

**5.2 Testar Flows**
- Enviar mensagens de teste
- Verificar respostas automáticas
- Ajustar conforme necessário

---

## PASSO 6: FACEBOOK PIXEL + RETARGETING (45 MIN)

**6.1 Instalar Pixel**
1. Copiar código de `/monetizacao/funnels/retargeting/facebook-instagram-pixels-campaigns.md`
2. WordPress → Tema → Editar functions.php
3. OU usar plugin "Insert Headers and Footers"
4. Colar código Pixel no <head>

**6.2 Criar Custom Audiences**
1. Facebook Ads Manager → Audiences
2. Criar públicos conforme guia:
   - Site Visitors 30 Days
   - Ebook Downloads
   - LP Viewers
   - etc.

**6.3 Criar Campanhas**
1. Seguir estrutura do guia
2. Começar com 2-3 campanhas:
   - Lookalike Cold (aquisição)
   - Ebook → Group (conversão)
   - Recuperação Carrinho

---

## PASSO 7: ANALYTICS + DASHBOARD (30 MIN)

**7.1 Google Analytics 4**
1. Criar propriedade GA4
2. Copiar Measurement ID
3. Instalar via plugin ou código manual
4. Usar código de `/monetizacao/tracking-analytics/ga4-facebook-pixel-setup.php`

**7.2 Dashboard**
1. Upload `/monetizacao/tracking-analytics/dashboard/dashboard.html`
2. Criar página WordPress "Dashboard"
3. Embed via iframe OU
4. Usar plugin "Code Snippets" para adicionar

**7.3 Integrar Dados Reais**
- GA4 API para dados reais
- OU manter mock para visualização

---

## PASSO 8: CONTEÚDO AUTOMÁTICO (30 MIN)

**8.1 Instalar Plugin Gerador**
1. Upload `/monetizacao/content-system/generator/content-generator.php`
2. Para `/wp-content/mu-plugins/`
3. Ativar automaticamente (mu-plugins)

**8.2 Gerar Primeiros Artigos**
1. WordPress Admin → TD Generator
2. Selecionar template
3. Escolher objetivo
4. Keyword
5. Gerar
6. Revisar rascunho
7. Publicar

**8.3 Templates**
- Usar `/monetizacao/content-system/templates/template-master-artigos.md`
- 50 títulos prontos
- Expandir com variações

---

## PASSO 9: REDES SOCIAIS (30 MIN)

**9.1 Agendar Posts**
1. Abrir `/monetizacao/automation/social-media/30-dias-posts-instagram-facebook.md`
2. Usar Later, Buffer ou Meta Business Suite
3. Agendar 30 dias de conteúdo
4. Criar designs no Canva (template TD)

**9.2 Automação DM**
- ManyChat para Instagram
- Respostas automáticas
- Keywords → Flows

---

## PASSO 10: TESTES FINAIS (30 MIN)

**10.1 Checklist de Testes**
☐ Todas landing pages carregam corretamente
☐ Formulários enviam emails
☐ Formulários integram com CRM
☐ Quiz funciona e redireciona
☐ Pixel disparando eventos (verificar Facebook Events Manager)
☐ GA4 rastreando pageviews
☐ WhatsApp automação respondendo
☐ Emails sendo enviados nas sequências
☐ Links de pagamento funcionando
☐ Mobile responsivo (testar em celular)

**10.2 Teste Jornada Completa**
1. Visitar site como usuário novo
2. Baixar ebook
3. Verificar email recebido
4. Clicar links nos emails
5. Agendar consultoria (teste)
6. Verificar automação WhatsApp
7. Simular compra (não completar)
8. Verificar retargeting aparecendo

---

## TROUBLESHOOTING COMUM

**Problema: Formulários não enviam**
- Verificar SMTP configurado (plugin "WP Mail SMTP")
- Testar email delivery
- Verificar integração API com CRM

**Problema: Pixel não rastreia**
- Verificar Pixel ID correto
- Testar com Facebook Pixel Helper (extensão Chrome)
- Verificar eventos personalizados nas páginas corretas

**Problema: WhatsApp não responde**
- Verificar ManyChat conectado
- Keywords configuradas corretamente (case sensitive?)
- Horário de atendimento ativo

**Problema: Sequências de email não disparam**
- Verificar triggers corretos
- Tags aplicadas ao lead?
- Automação ativa (não pausada)?

---

## PRÓXIMOS PASSOS (Pós-Instalação)

**Semana 1:**
- Monitorar métricas diariamente
- Ajustar textos baseado em feedback
- Testar variações de CTAs

**Semana 2-4:**
- Criar 10-20 artigos usando gerador
- Coletar primeiros depoimentos
- Otimizar campanhas Facebook (pausar baixo ROAS)

**Mês 2:**
- A/B testing landing pages
- Expandir sequências de email
- Adicionar novos flows WhatsApp
- Criar webinar/masterclass (novo funil)

---

## SUPORTE

**Documentação:**
- Todos os arquivos em `/monetizacao/`
- Comentários em código PHP
- Markdown com instruções

**Recursos Externos:**
- Elementor Docs: docs.elementor.com
- ActiveCampaign: help.activecampaign.com
- ManyChat: help.manychat.com
- Facebook Ads: facebook.com/business/help

**DEPENDE! De você implementar corretamente.**

**Semper Fidelis**
— Sistema Completo TD
