# TD Content Generator

Sistema completo de geração de artigos fitness no estilo **Treinador David** para WordPress.

## 📋 Características

✅ **Geração automática de artigos TD-style:**
- Abertura com hook militar/direto
- Uso estratégico do "DEPENDE!" como catchphrase
- Seções baseadas em ciência (estudos reais)
- Tom direto, sem enrolação
- Fechamento com call-to-action
- Assinatura "Semper Fidelis - Treinador David"

✅ **Integração WordPress REST API:**
- Upload automático de posts
- Categorização correta
- Meta descriptions SEO
- Featured images automáticas
- Elementor-ready formatting

✅ **Templates de conteúdo:**
- 5 templates de introdução
- 10 variações do uso de "DEPENDE!"
- Biblioteca de transições militares
- 20 CTAs de conversão variados
- Estrutura para diferentes tópicos: treino, nutrição, motivação, ciência, transformação

✅ **Configuração TD:**
- Cores: #0EA5E9 (azul), #0B1220 (dark), #FFFFFF (branco)
- Fontes: Oswald (títulos), Inter (corpo)
- Tamanhos e espaçamentos padrão

## 🚀 Instalação

### 1. Requisitos

- Python 3.7+
- WordPress com REST API habilitada
- Credenciais WordPress (username + Application Password)

### 2. Instalar dependências

```bash
cd wp-content/mu-plugins/td-content-generator
pip install -r requirements.txt
```

### 3. Configurar WordPress Application Password

1. Acesse: WordPress Admin → Usuários → Perfil
2. Role até "Application Passwords"
3. Crie uma nova Application Password
4. Copie a senha gerada (formato: xxxx xxxx xxxx xxxx xxxx xxxx)

## 📖 Uso

### Modo 1: Gerar artigos (apenas gerar, sem publicar)

```bash
python generate_and_publish.py --generate-only
```

Isso irá:
- Gerar 5 artigos de exemplo
- Salvar em `generated_articles.json`

### Modo 2: Gerar e ver preview

```bash
python generate_and_publish.py --generate-only --preview
```

### Modo 3: Gerar e publicar no WordPress

```bash
python generate_and_publish.py \
  --publish \
  --username seu-usuario \
  --password "xxxx xxxx xxxx xxxx xxxx xxxx" \
  --status draft
```

**Opções de status:**
- `draft` - Salva como rascunho (padrão)
- `publish` - Publica diretamente

### Modo 4: Gerar a partir de arquivo de tópicos

Crie um arquivo `topics.json`:

```json
[
  {
    "topic_type": "treino",
    "title": "Como Ganhar Massa Muscular Depois dos 40",
    "custom_params": {
      "hook_question": "Achas que é tarde demais para ganhar músculo?",
      "cta_type": "programa_foca"
    }
  },
  {
    "topic_type": "nutricao",
    "title": "A Verdade Sobre Proteína",
    "custom_params": {
      "cta_type": "ebook_gratis"
    }
  }
]
```

Execute:

```bash
python generate_and_publish.py \
  --batch topics.json \
  --publish \
  --username seu-usuario \
  --password "sua-senha"
```

### Modo 5: Com imagens do Unsplash

```bash
python generate_and_publish.py \
  --publish \
  --username seu-usuario \
  --password "sua-senha" \
  --with-images \
  --unsplash-key sua-chave-unsplash
```

## 📂 Estrutura de Arquivos

```
td-content-generator/
├── README.md                    # Este arquivo
├── requirements.txt             # Dependências Python
├── td_config.py                 # Configurações TD (cores, fontes, etc)
├── content_templates.py         # Templates de conteúdo
├── article_generator.py         # Motor de geração de artigos
├── wordpress_integration.py     # Integração WordPress API
├── generate_and_publish.py      # Script principal
└── __init__.py                  # Pacote Python
```

## 🎨 Tipos de Tópicos

### 1. Treino (`treino`)
Artigos sobre exercícios, técnicas de treino, hipertrofia, força

**Estrutura:**
- Introdução com hook militar
- O Problema (mitos comuns)
- A Ciência Por Trás (estudos)
- O Método TD (solução)
- Execução Prática (passo a passo)
- Erros Comuns (avisos)
- Progressão (próximos passos)
- CTA Final

### 2. Nutrição (`nutricao`)
Artigos sobre dieta, macros, suplementação

**Estrutura:**
- Introdução provocativa
- Mitos da Nutrição
- Ciência da Nutrição (estudos)
- Estratégia Nutricional TD
- Plano Prático
- Suplementação (se necessário)
- Erros Fatais
- CTA Final

### 3. Motivação (`motivacao`)
Artigos sobre mentalidade, disciplina, foco

**Estrutura:**
- História/Situação Real
- O Obstáculo Mental
- Mentalidade Militar
- Estratégias Práticas
- Ação Imediata
- Disciplina vs Motivação
- Compromisso
- CTA Final

### 4. Ciência (`ciencia`)
Artigos baseados em estudos científicos

**Estrutura:**
- Introdução com Questão Científica
- O Que a Ciência Diz
- Estudos Relevantes
- Interpretação Prática
- Aplicação no Treino
- Variáveis Individuais
- Conclusão Científica
- CTA Final

### 5. Transformação (`transformacao`)
Casos de sucesso, antes e depois

**Estrutura:**
- A História (antes)
- O Ponto de Virada
- O Processo
- Obstáculos Vencidos
- Resultados
- Lições Aprendidas
- Como Você Pode Fazer Também
- CTA Final

## 🎯 Tipos de CTA (Call-to-Action)

| Tipo | Descrição |
|------|-----------|
| `programa_foca` | Programa de Foca principal |
| `consultoria` | Consultoria 1-on-1 |
| `ebook_gratis` | eBook gratuito |
| `desafio_30_dias` | Desafio 30 Dias TD |
| `comunidade` | Comunidade TD Elite |
| `app_mobile` | App TD Fitness |
| `urgencia` | Vagas limitadas |
| `transformacao` | Galeria de transformações |
| `newsletter` | Newsletter semanal |
| `video_gratis` | Vídeo-aula gratuita |
| `quiz` | Quiz de perfil de treino |
| `masterclass` | Masterclass ao vivo |
| `garantia` | Garantia de 30 dias |
| `social_proof` | Depoimentos sociais |
| `bonus` | Bônus exclusivos |
| `case_study` | Estudo de caso |
| `whatsapp` | Suporte WhatsApp |
| `metodo_td` | Método TD completo |
| `comparacao` | Comparação TD vs outros |
| `inicio_rapido` | Começar em 5 minutos |

## ⚙️ Configuração Avançada

### Editar `td_config.py`

```python
# Cores TD
TD_COLORS = {
    'primary': '#0EA5E9',
    'dark': '#0B1220',
    'white': '#FFFFFF',
    # ...
}

# Probabilidades de uso
CONTENT_CONFIG = {
    'use_depende_probability': 0.6,  # 60% de usar "DEPENDE!"
    'military_transition_probability': 0.4,  # 40% de transição militar
    'min_sections': 4,
    'max_sections': 7,
    'include_studies': True,
    'include_signature': True
}
```

### Adicionar novos templates

Edite `content_templates.py`:

```python
# Adicionar nova introdução
INTRO_TEMPLATES.append({
    'name': 'seu_estilo',
    'template': """Seu template aqui com {variaveis}"""
})

# Adicionar novo CTA
CTA_TEMPLATES.append({
    'type': 'novo_cta',
    'title': 'Título do CTA',
    'content': 'Conteúdo do CTA...'
})
```

## 🔧 Troubleshooting

### Erro: "Não foi possível conectar ao WordPress"

**Solução:**
1. Verifique se REST API está habilitada
2. Teste manualmente: `curl https://seu-site.com/wp-json/wp/v2/posts`
3. Verifique firewall/segurança

### Erro: "401 Unauthorized"

**Solução:**
1. Verifique Application Password
2. Certifique-se de usar username correto
3. Tente gerar nova Application Password

### Artigos não estão formatados corretamente

**Solução:**
1. O sistema usa conversão básica Markdown → HTML
2. Para melhor conversão, instale: `pip install markdown2`
3. Edite `wordpress_integration.py` para usar `markdown2`

### Imagens não aparecem

**Solução:**
1. Verifique se `--with-images` está habilitado
2. Forneça `--unsplash-key` válida
3. Ou use URLs diretas de imagens

## 📊 Exemplos de Uso

### Exemplo 1: Gerar 10 artigos de treino

```bash
python generate_and_publish.py \
  --generate-only \
  --count 10 \
  --output artigos_treino.json
```

### Exemplo 2: Publicar artigos específicos

```bash
# 1. Criar topics.json com seus artigos
# 2. Executar:
python generate_and_publish.py \
  --batch topics.json \
  --publish \
  --username admin \
  --password "xxxx xxxx xxxx" \
  --status publish \
  --with-images
```

### Exemplo 3: Teste local (sem publicar)

```bash
python generate_and_publish.py \
  --generate-only \
  --preview \
  --count 3
```

## 🎓 Uso Programático

Você também pode usar o sistema diretamente em Python:

```python
from article_generator import TDArticleGenerator
from wordpress_integration import WordPressPublisher

# Gerar artigo
generator = TDArticleGenerator()
article = generator.generate_article(
    topic_type='treino',
    title='Treino Para Hipertrofia',
    custom_params={
        'hook_question': 'Quer ganhar massa muscular rápido?',
        'cta_type': 'programa_foca'
    }
)

# Publicar
publisher = WordPressPublisher(
    username='admin',
    password='sua-senha'
)
result = publisher.publish_article(article, status='draft')
print(result)
```

## 🔐 Segurança

### Application Passwords

✅ **SEMPRE use Application Passwords**, nunca a senha principal

### Credenciais

✅ **NUNCA** commite credenciais no Git
✅ Use variáveis de ambiente:

```bash
export WP_USERNAME="admin"
export WP_PASSWORD="xxxx xxxx xxxx"

python generate_and_publish.py \
  --publish \
  --username $WP_USERNAME \
  --password $WP_PASSWORD
```

### Arquivo .env

Crie `.env`:
```
WP_USERNAME=admin
WP_PASSWORD=xxxx xxxx xxxx
UNSPLASH_KEY=sua-chave
```

Use com `python-dotenv`:
```bash
pip install python-dotenv
```

## 📝 Licença

Sistema proprietário - Treinador David © 2024

## 🤝 Suporte

Para questões ou suporte:
- Email: suporte@treinadordavid.pt
- WhatsApp: [Link]

---

**Semper Fidelis - Treinador David** 💪
