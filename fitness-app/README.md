# 🏋️ TD Fitness - Aplicativo de Consultoria Fitness

Aplicativo web/mobile (PWA) para consultoria fitness online do Treinador David.

## 📋 Sobre o Projeto

Sistema completo de consultoria fitness que permite:
- ✅ Agendamento de consultorias online
- ✅ Programas de treino personalizados
- ✅ Biblioteca de 900+ exercícios com vídeos
- ✅ Tracking de progresso (peso, medidas, fotos)
- ✅ Chat em tempo real com o treinador
- ✅ Pagamentos via Mercado Pago (PIX, Cartão, Boleto)

## 🚀 Stack Tecnológica

### Frontend
- **Next.js 15+** (App Router)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling com design system customizado
- **React Hook Form + Zod** - Formulários e validação
- **Recharts** - Gráficos de progresso
- **Lucide React** - Ícones

### Backend & Database
- **Supabase** - Database (PostgreSQL), Auth, Storage, Realtime
- **Next.js API Routes** - Serverless functions
- **Row Level Security (RLS)** - Segurança de dados

### Pagamentos & Notificações
- **Mercado Pago** - Gateway de pagamento (PIX, Cartão, Boleto)
- **SendGrid** - Emails transacionais
- **Web Push API** - Notificações (PWA)

### Hospedagem
- **Vercel** - Frontend (Next.js)
- **Supabase** - Database + Storage
- **YouTube Unlisted** - Vídeos de exercícios (MVP)

## 📁 Estrutura de Pastas

```
fitness-app/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rotas de autenticação (login, cadastro)
│   ├── (dashboard)/              # Rotas protegidas do cliente
│   │   ├── dashboard/            # Dashboard principal
│   │   ├── exercicios/           # Biblioteca de exercícios
│   │   ├── treino/               # Sessões de treino
│   │   ├── progresso/            # Tracking de progresso
│   │   └── chat/                 # Chat com treinador
│   ├── admin/                    # Dashboard do treinador
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Endpoints de autenticação
│   │   ├── pagamentos/           # Mercado Pago webhooks
│   │   └── exercicios/           # CRUD de exercícios
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   └── globals.css               # Estilos globais
├── components/
│   ├── ui/                       # Componentes base (Button, Input, etc)
│   └── features/                 # Componentes de features
│       ├── exercise/             # Componentes de exercícios
│       ├── workout/              # Componentes de treino
│       ├── progress/             # Componentes de progresso
│       └── chat/                 # Componentes de chat
├── lib/
│   ├── supabase/                 # Clientes Supabase
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   ├── mercadopago/              # Integração Mercado Pago
│   └── utils.ts                  # Funções utilitárias
├── types/
│   ├── database.ts               # Tipos gerados do Supabase
│   └── index.ts                  # Tipos customizados
├── hooks/                        # Custom React Hooks
├── public/                       # Assets estáticos
│   ├── icons/                    # Ícones PWA
│   └── manifest.json             # PWA manifest
├── middleware.ts                 # Next.js middleware (auth)
├── next.config.js                # Configuração Next.js
├── tailwind.config.ts            # Configuração Tailwind
└── tsconfig.json                 # Configuração TypeScript
```

## 🎨 Design System (Cores)

```css
--td-blue-display: #0EA5E9      /* Azul principal (headers, CTAs) */
--td-blue-text: #0369A1          /* Azul texto */
--td-blue-dark: #0B1220          /* Azul escuro (fundos) */
--td-text-primary: #0F172A       /* Texto principal */
--td-text-secondary: #475569     /* Texto secundário */
--td-bg-white: #FFFFFF           /* Fundo branco */
--td-bg-secondary: #F8FAFC       /* Fundo secundário */
--td-cta-orange: #C2410C         /* Laranja (CTAs de ação) */
--td-success-green: #15803D      /* Verde (sucesso) */
--td-error-red: #B91C1C          /* Vermelho (erros) */
```

**Fontes:**
- Headings: `Oswald` (bold, impactante)
- Body: `Inter` (legibilidade)

## ⚙️ Setup do Projeto

### 1. Pré-requisitos

- Node.js 18+ instalado
- Conta Supabase (grátis)
- Conta Mercado Pago Developers
- Conta Vercel (grátis)

### 2. Instalação

```bash
# Clonar repositório
git clone https://github.com/treinadordavid/2026-website.git
cd 2026-website/fitness-app

# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env.local
```

### 3. Configurar Supabase

#### a) Criar projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New Project"
3. Escolha nome: `td-fitness-app`
4. Escolha senha forte para o database
5. Escolha região: South America (São Paulo)

#### b) Obter credenciais
1. Vá em **Settings → API**
2. Copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret!) → `SUPABASE_SERVICE_ROLE_KEY`

#### c) Criar database schema
1. Vá em **SQL Editor**
2. Cole o conteúdo de `supabase/schema.sql` (vamos criar esse arquivo)
3. Clique em "Run"

#### d) Configurar Storage
1. Vá em **Storage**
2. Crie bucket `avatars` (público)
3. Crie bucket `progress-photos` (privado)
4. Crie bucket `exercise-videos` (público) - se não usar YouTube

### 4. Configurar Mercado Pago

1. Acesse [developers.mercadopago.com.br](https://developers.mercadopago.com.br)
2. Crie uma aplicação
3. Copie:
   - `Public Key` → `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`
   - `Access Token` → `MERCADO_PAGO_ACCESS_TOKEN`
4. Configure webhook URL: `https://seu-dominio.com/api/pagamentos/webhook`

### 5. Configurar variáveis de ambiente

Edite `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Mercado Pago
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxx
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxx

# SendGrid (emails)
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=contato@treinadordavid.com

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://treinadordavid.com
```

### 6. Rodar em desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000)

## 📦 Deploy em Produção

### Deploy no Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Ou conecte o repositório GitHub diretamente no [Vercel Dashboard](https://vercel.com).

### Configurar variáveis de ambiente no Vercel

1. Vá em **Settings → Environment Variables**
2. Adicione todas as variáveis do `.env.local`
3. Selecione "Production", "Preview", "Development"
4. Clique em "Save"

### Configurar domínio customizado

1. Vá em **Settings → Domains**
2. Adicione `app.treinadordavid.com`
3. Configure DNS no seu provedor:
   ```
   CNAME app.treinadordavid.com → cname.vercel-dns.com
   ```

## 🗄️ Database Schema

O schema completo está em `supabase/schema.sql` e inclui:

**Principais tabelas:**
- `users` - Usuários (clientes + treinador)
- `exercicios` - Biblioteca de exercícios
- `programas_treino` - Programas de treino
- `treinos` - Sessões individuais de treino
- `exercicios_treino` - Exercícios dentro de cada treino
- `registros_treino` - Tracking de execução
- `progresso_usuario` - Peso, medidas, fotos
- `consultorias` - Agendamentos
- `mensagens` - Chat

**Segurança:**
- Row Level Security (RLS) habilitado em todas tabelas
- Clientes só veem seus próprios dados
- Treinador vê dados de todos clientes

## 🔐 Autenticação

### Fluxos implementados:
- ✅ Email + Senha
- ✅ Google OAuth
- ✅ Apple OAuth (iOS)
- ✅ Magic Link (email sem senha)
- ✅ Recuperação de senha

### Proteção de rotas:
- Middleware do Next.js (`middleware.ts`)
- Redirect automático para login se não autenticado
- Redirect para dashboard se já autenticado

## 💳 Pagamentos (Mercado Pago)

### Métodos aceitos:
- PIX (0.99% de taxa)
- Cartão de crédito (4.99% + R$0.40)
- Boleto bancário

### Fluxo:
1. Cliente escolhe plano
2. Redirect para checkout Mercado Pago
3. Webhook confirma pagamento
4. Sistema libera acesso automaticamente

### Webhooks:
```
POST /api/pagamentos/webhook
```

## 💬 Chat em Tempo Real

Implementado com **Supabase Realtime Subscriptions**.

```typescript
// Subscribe to new messages
supabase
  .channel('mensagens')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'mensagens' },
    (payload) => {
      // Handle new message
    }
  )
  .subscribe()
```

## 📱 PWA (Progressive Web App)

### Features:
- ✅ Instalável (Add to Home Screen)
- ✅ Funciona offline (cache de dados críticos)
- ✅ Web Push Notifications (Android)
- ✅ Ícones customizados
- ✅ Splash screen

### Configuração:
- `public/manifest.json` - PWA manifest
- `app/layout.tsx` - Meta tags PWA
- Service Worker (configurar depois)

## 🧪 Testes

```bash
# Rodar testes unitários (quando implementados)
npm run test

# Rodar testes E2E (quando implementados)
npm run test:e2e
```

## 📊 Métricas e Analytics

### Implementar:
- Google Analytics 4
- Hotjar (heatmaps)
- Sentry (error tracking)

## 🔧 Manutenção

### Backup do database
- Supabase faz backup automático diário (plano pago)
- Exportar manualmente: Dashboard → Database → Backups

### Logs
- Vercel: Dashboard → Logs
- Supabase: Dashboard → Logs

## 🚨 Troubleshooting

### Erro: "Supabase client not found"
- Verificar se `.env.local` está configurado
- Verificar se as variáveis estão com `NEXT_PUBLIC_` (se forem usadas no cliente)

### Erro: "CORS error"
- Adicionar domínio em Supabase → Authentication → URL Configuration

### Pagamento não confirma
- Verificar se webhook está configurado corretamente no Mercado Pago
- Verificar logs em `/api/pagamentos/webhook`

## 📞 Suporte

**Treinador David**
- Email: contato@treinadordavid.com
- WhatsApp: +55 61 98151-5220
- Site: https://treinadordavid.com

## 📝 Licença

Propriedade de Treinador David. Todos os direitos reservados.

---

**Desenvolvido com 💪 para transformar vidas através do fitness!**
