# Guia de SEO para Artigos de Fitness - TreinadorDavid.com

## 📋 Índice
- [Introdução](#introdução)
- [Palavras-chave para Fitness](#palavras-chave-para-fitness)
- [Estrutura de Artigo Otimizada](#estrutura-de-artigo-otimizada)
- [Schema Markup](#schema-markup)
- [Meta Tags e Descrições](#meta-tags-e-descrições)
- [Imagens SEO](#imagens-seo)
- [Links Internos](#links-internos)
- [Checklist Final](#checklist-final)

---

## 🎯 Introdução

Este guia fornece práticas recomendadas de SEO específicas para artigos de fitness e treino em português (Brasil).

### Plugins SEO Ativos
- **TD SEO Fitness Enhancements** (`td-seo-fitness.php`)
- **TD Core** (`td-core2.php`) - Schema Article + Speakable
- **TD TOC** (`TD-toc-toc.php`) - Índice automático

---

## 🔑 Palavras-chave para Fitness

### Categorias Principais
1. **Musculação**
   - treino de musculação
   - exercícios de musculação
   - hipertrofia muscular
   - ganho de massa muscular
   - treino ABC/ABCD

2. **Emagrecimento**
   - como emagrecer rápido
   - dieta para emagrecer
   - treino para perder barriga
   - queima de gordura
   - déficit calórico

3. **Treinos**
   - treino em casa
   - treino funcional
   - treino HIIT
   - treino para iniciantes
   - programa de treino

4. **Personal Trainer**
   - personal trainer online
   - consultoria fitness
   - acompanhamento personalizado

### Formato de Palavras-chave

**Long-tail (cauda longa)** - preferencial:
- ✅ "como fazer treino de perna para hipertrofia"
- ✅ "melhores exercícios para perder barriga em casa"
- ✅ "quanto tempo para ganhar massa muscular"

**Short-tail** - secundário:
- ⚠️ "treino"
- ⚠️ "dieta"
- ⚠️ "musculação"

---

## 📝 Estrutura de Artigo Otimizada

### Título (H1)
- **Comprimento**: 50-60 caracteres
- **Formato**: Incluir palavra-chave principal
- **Exemplos**:
  ```
  ✅ Como Fazer Treino de Perna para Hipertrofia: Guia Completo
  ✅ 10 Exercícios para Perder Barriga em Casa (Sem Equipamento)
  ✅ Dieta para Ganho de Massa Muscular: O Que Comer?
  ```

### Introdução (Primeiro Parágrafo)
- **Comprimento**: 100-150 palavras
- **Conteúdo**:
  - Mencionar palavra-chave principal
  - Explicar o que o leitor aprenderá
  - Usar shortcode `[td_quick_answer]` se aplicável

**Exemplo**:
```
Você quer saber como fazer um treino de perna eficiente para hipertrofia?
Neste guia completo, você aprenderá os melhores exercícios, técnicas e
estratégias para maximizar o ganho de massa muscular nas pernas.
```

### Estrutura de Headings

```
H1: Título Principal (apenas 1 por página)
  H2: Seções Principais (4-6 por artigo)
    H3: Subseções (2-3 por H2)
      H4: Detalhes específicos (use com moderação)
```

**Boas Práticas**:
- ✅ Use palavras-chave em H2 e H3
- ✅ Mantenha hierarquia lógica
- ✅ Máximo de 6 H2s por artigo
- ✅ Use numeração para listas ("1. Exercício", "2. Dieta", etc.)

### Comprimento do Artigo
- **Artigos gerais**: 1.500-2.000 palavras
- **Guias completos**: 2.500-3.500 palavras
- **Artigos de notícias**: 800-1.200 palavras

---

## 🔍 Schema Markup

O plugin `td-seo-fitness.php` adiciona automaticamente:

### 1. Article Schema
```json
{
  "@type": "Article",
  "headline": "Título do artigo",
  "author": {
    "@type": "Person",
    "name": "Treinador David"
  }
}
```

### 2. HowTo Schema (para artigos de treino)
Detectado automaticamente em posts das categorias:
- `treinos`
- `exercicios`

**Para ativar**, use headings numerados:
```
## 1. Aquecimento
## 2. Exercício Principal
## 3. Finalização
```

### 3. FAQPage Schema
Ativado automaticamente ao usar shortcode `[td_qa]`:

```
[td_qa title="Perguntas Frequentes"]
  [td_qa_card q="Quantas vezes por semana devo treinar?"]
    O ideal é treinar 3-5 vezes por semana...
  [/td_qa_card]
[/td_qa]
```

### 4. Speakable Schema
Para conteúdo otimizado para assistentes de voz:

```
[td_speakable]
O treino de perna para hipertrofia deve incluir agachamento,
leg press e cadeira extensora.
[/td_speakable]
```

---

## 🏷️ Meta Tags e Descrições

### Meta Description
- **Comprimento**: 140-155 caracteres
- **Conteúdo**:
  - Incluir palavra-chave principal
  - Call-to-action (CTA)
  - Benefício claro

**Exemplos**:
```
✅ Aprenda como fazer treino de perna para hipertrofia com este guia
completo. Exercícios, técnicas e dicas do Personal Trainer. Leia agora!

✅ Descubra os 10 melhores exercícios para perder barriga em casa.
Sem equipamento, resultados rápidos. Guia do Treinador David.
```

### Open Graph (Facebook)
Configurado automaticamente pelo plugin. Certifique-se de:
- ✅ Imagem destacada: mínimo 1200x630px
- ✅ Formato: JPG ou PNG
- ✅ Tamanho: máximo 1MB

### Twitter Cards
Configurado automaticamente. Para melhor resultado:
- Configure Twitter handle em: Configurações > TD SEO > Twitter Handle

---

## 🖼️ Imagens SEO

### Nome do Arquivo
**Antes de fazer upload**:
```
❌ IMG_1234.jpg
❌ DSC00456.jpg
✅ treino-de-perna-agachamento.jpg
✅ exercicio-perder-barriga-prancha.jpg
```

### Texto Alternativo (Alt Text)
- **Descrição**: Clara e com palavra-chave
- **Comprimento**: 10-15 palavras

**Exemplos**:
```
✅ "Homem fazendo agachamento livre no treino de perna para hipertrofia"
✅ "Mulher executando exercício prancha para perder barriga"
```

### Formato e Tamanho
- **Formato preferido**: WebP (use script `optimize-images.sh`)
- **Fallback**: JPG (85% qualidade)
- **Largura máxima**: 1920px
- **Tamanho**: máximo 200KB por imagem

### Lazy Loading
Habilitado automaticamente no WordPress. Certifique-se de usar:
```html
<img loading="lazy" ... />
```

---

## 🔗 Links Internos

### Estratégia de Links
- **Mínimo**: 3-5 links internos por artigo
- **Máximo**: 10 links internos
- **Anchor text**: Descritivo e natural

### Tipos de Links Internos

1. **Links contextuais** (no corpo do texto):
```
Para melhores resultados, combine com uma
<a href="/dieta-hipertrofia">dieta adequada para hipertrofia</a>.
```

2. **Links relacionados** (fim do artigo):
```
[td_science title="Artigos Relacionados"]
  [td_card title="Como Ganhar Massa Muscular"]
    Guia completo sobre hipertrofia...
  [/td_card]
[/td_science]
```

### Estrutura de Silos
Organize artigos por categoria:

```
Categoria: Musculação
  ├─ Treino de Perna
  ├─ Treino de Costas
  ├─ Treino de Peito
  └─ Dieta para Hipertrofia (link entre todos)

Categoria: Emagrecimento
  ├─ Treino HIIT
  ├─ Dieta Low Carb
  ├─ Exercícios Aeróbicos
  └─ Como Perder Barriga (link entre todos)
```

---

## ✅ Checklist Final

### Antes de Publicar

- [ ] **Título otimizado** (50-60 caracteres, palavra-chave principal)
- [ ] **URL amigável** (slug curto com palavra-chave)
- [ ] **Meta description** (140-155 caracteres)
- [ ] **Imagem destacada** (mínimo 1200x630px, formato WebP ou JPG)
- [ ] **Alt text em todas as imagens**
- [ ] **Mínimo 1.500 palavras**
- [ ] **4-6 headings H2** com palavras-chave
- [ ] **3-5 links internos**
- [ ] **1-2 links externos** para fontes confiáveis
- [ ] **Shortcode [td_quick_answer]** no início (se aplicável)
- [ ] **Shortcode [td_qa]** no final (perguntas frequentes)
- [ ] **Shortcode [td_signature]** ao final do artigo
- [ ] **Categoria principal selecionada**
- [ ] **Tags relevantes** (5-10 tags)

### Após Publicar

- [ ] Testar em PageSpeed Insights
- [ ] Verificar Rich Results Test (Google)
- [ ] Compartilhar nas redes sociais
- [ ] Adicionar ao sitemap
- [ ] Monitorar no Google Search Console

---

## 📊 Ferramentas Úteis

### Análise de SEO
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **Google Search Console**: https://search.google.com/search-console

### Pesquisa de Palavras-chave
- **Google Trends**: https://trends.google.com.br/
- **Answer the Public**: https://answerthepublic.com/
- **Ubersuggest**: https://neilpatel.com/br/ubersuggest/

### Scripts de Otimização
```bash
# Otimizar imagens
./scripts/optimize-images.sh

# Otimizar CSS/JS
./scripts/optimize-assets.sh

# Verificar performance
./scripts/check-performance.sh https://treinadordavid.com
```

---

## 📞 Suporte

Para dúvidas sobre SEO ou otimizações:
- **Site**: https://treinadordavid.com
- **Email**: contato@treinadordavid.com

---

**Última atualização**: Novembro 2025
**Versão**: 1.0.0
**Autor**: Treinador David
