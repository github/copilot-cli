"""
TD Content Generator - Gerador de Artigos
Gera artigos fitness no padrão TD-style
"""

import random
from typing import Dict, List, Optional
from content_templates import (
    INTRO_TEMPLATES, DEPENDE_VARIATIONS, MILITARY_TRANSITIONS,
    CTA_TEMPLATES, TOPIC_STRUCTURES, SCIENTIFIC_REFERENCES,
    SIGNATURE_VARIATIONS
)
from td_config import CONTENT_CONFIG, SEO_CONFIG


class TDArticleGenerator:
    """Gerador de artigos no estilo Treinador David"""

    def __init__(self):
        self.config = CONTENT_CONFIG
        self.seo_config = SEO_CONFIG

    def generate_article(
        self,
        topic_type: str,
        title: str,
        custom_params: Optional[Dict] = None
    ) -> Dict[str, str]:
        """
        Gera um artigo completo TD-style

        Args:
            topic_type: Tipo do tópico (treino, nutricao, motivacao, ciencia, transformacao)
            title: Título do artigo
            custom_params: Parâmetros customizados para o artigo

        Returns:
            Dict com título, conteúdo, meta_description, e outros campos
        """
        params = custom_params or {}

        # Seleciona estrutura baseada no tipo
        structure = TOPIC_STRUCTURES.get(topic_type, TOPIC_STRUCTURES['treino'])

        # Gera cada seção
        sections = []

        # 1. Introdução
        intro = self._generate_intro(topic_type, title, params)
        sections.append(intro)

        # 2. Corpo do artigo (seções dinâmicas)
        body_sections = self._generate_body_sections(topic_type, structure, params)
        sections.extend(body_sections)

        # 3. CTA Final
        cta = self._generate_cta(topic_type, params)
        sections.append(cta)

        # 4. Assinatura
        if self.config['include_signature']:
            signature = self._generate_signature()
            sections.append(signature)

        # Monta o conteúdo completo
        content = '\n\n'.join(sections)

        # Gera meta description
        meta_description = self._generate_meta_description(title, topic_type)

        # Retorna artigo completo
        return {
            'title': title,
            'content': content,
            'meta_description': meta_description,
            'category': topic_type,
            'keywords': structure['keywords'],
            'word_count': len(content.split())
        }

    def _generate_intro(self, topic_type: str, title: str, params: Dict) -> str:
        """Gera introdução com hook militar/direto"""
        template = random.choice(INTRO_TEMPLATES)

        # Variáveis para preencher o template
        hook_question = params.get('hook_question', self._create_hook_question(title))
        topic_intro = params.get('topic_intro', self._create_topic_intro(title))
        common_myth = params.get('common_myth', f"você precisa de {self._extract_main_topic(title)}")
        personal_story_hook = params.get('personal_story', "estava exatamente onde você está agora")
        shocking_stat = params.get('shocking_stat', "90% das pessoas nunca alcançam seus objetivos fitness")

        # Preenche o template
        intro = template['template'].format(
            hook_question=hook_question,
            topic_intro=topic_intro,
            common_myth=common_myth,
            personal_story_hook=personal_story_hook,
            shocking_stat=shocking_stat,
            topic=self._extract_main_topic(title)
        )

        return f"# {title}\n\n{intro}"

    def _generate_body_sections(self, topic_type: str, structure: Dict, params: Dict) -> List[str]:
        """Gera seções do corpo do artigo"""
        sections = []
        num_sections = random.randint(self.config['min_sections'], self.config['max_sections'])

        for i in range(num_sections):
            section_title = structure['sections'][i % len(structure['sections'])]

            # Adiciona transição militar (probabilidade configurável)
            if random.random() < self.config['military_transition_probability']:
                transition = random.choice(MILITARY_TRANSITIONS)
                section_content = f"{transition}\n\n"
            else:
                section_content = ""

            # Adiciona uso do "DEPENDE!" (probabilidade configurável)
            if random.random() < self.config['use_depende_probability']:
                depende = self._generate_depende_section(topic_type)
                section_content += depende + "\n\n"

            # Adiciona conteúdo baseado em ciência
            if self.config['include_studies'] and 'Ciência' in section_title:
                study_content = self._add_scientific_reference(topic_type)
                section_content += study_content + "\n\n"

            # Adiciona conteúdo genérico da seção
            section_content += self._generate_section_content(section_title, topic_type, params)

            sections.append(f"## {section_title}\n\n{section_content}")

        return sections

    def _generate_depende_section(self, topic_type: str) -> str:
        """Gera uma seção com uso estratégico do DEPENDE!"""
        variation = random.choice(DEPENDE_VARIATIONS)

        # Preenche variáveis do template
        content = variation['template'].format(
            explanation="Não existe resposta única. Cada corpo é único, cada objetivo é diferente.",
            factor_1="teu nível atual de treino",
            factor_2="tua genética individual",
            factor_3="teu estilo de vida",
            detailed_explanation="Por isso eu sempre digo: contexto é REI.",
            context_explanation="Teu corpo não leu o manual. O que funciona para um pode não funcionar para outro.",
            question="Qual o melhor treino?",
            technical_explanation="E isso não é desculpa para não tentar. É a realidade que te torna mais forte.",
            nutrition_question="Quantas refeições por dia devo fazer?",
            nutrition_context="O que importa é o total de calorias e macros no final do dia. O resto é preferência.",
            emphasis_explanation="Não existe solução cookie-cutter. Existe estratégia personalizada.",
            scientific_context="Múltiplas variáveis influenciam os resultados.",
            option_a="Treino A",
            option_b="Treino B",
            comparison_factors="teus objetivos específicos",
            comparison_explanation="Escolhe baseado no TEU objetivo, não no que está na moda.",
            level_based_explanation="O nível de treino muda completamente a abordagem.",
            provocative_explanation="Mas posso te dar princípios que SEMPRE funcionam."
        )

        return content

    def _add_scientific_reference(self, topic_type: str) -> str:
        """Adiciona referência científica relevante"""
        # Filtra estudos relevantes ao tópico
        relevant_studies = [
            s for s in SCIENTIFIC_REFERENCES
            if topic_type in s['topic'] or 'all' in s['topic']
        ]

        if not relevant_studies:
            relevant_studies = SCIENTIFIC_REFERENCES

        study = random.choice(relevant_studies)

        return f"""**O Que a Ciência Diz:**

Segundo {study['study']}: *"{study['finding']}"*

Traduzindo: {self._translate_science_to_action(study['finding'])}"""

    def _translate_science_to_action(self, finding: str) -> str:
        """Traduz descoberta científica em ação prática"""
        return "isso significa que você precisa ajustar teu treino baseado em evidências, não em achismos."

    def _generate_section_content(self, section_title: str, topic_type: str, params: Dict) -> str:
        """Gera conteúdo para uma seção específica"""
        # Conteúdo placeholder - pode ser expandido com IA ou templates mais específicos
        content_templates = {
            'O Problema': "A maioria das pessoas está fazendo tudo errado. E a indústria fitness adora isso porque podem continuar vendendo soluções mágicas.",
            'A Ciência Por Trás': "Os estudos são claros. Mas ninguém quer fazer o trabalho duro de aplicar a ciência na prática.",
            'O Método TD': "Aqui está a verdade sem filtros: disciplina vence motivação. Todo dia. Toda hora.",
            'Execução Prática': "1. Define teu objetivo\n2. Cria um plano baseado em ciência\n3. Executa com disciplina militar\n4. Ajusta baseado em resultados\n5. Repete",
            'Erros Comuns': "❌ Querer resultados ontem\n❌ Seguir modismos\n❌ Não ter consistência\n❌ Ignorar a nutrição",
            'Progressão': "Resultados vêm com tempo. Não existe atalho. Não existe pílula mágica. Existe trabalho.",
            'default': "Aqui está a verdade que você precisa ouvir, mesmo que não queira."
        }

        return content_templates.get(section_title, content_templates['default'])

    def _generate_cta(self, topic_type: str, params: Dict) -> str:
        """Gera Call-to-Action final"""
        # Seleciona CTA baseado no tipo ou aleatório
        cta_type = params.get('cta_type')

        if cta_type:
            cta = next((c for c in CTA_TEMPLATES if c['type'] == cta_type), None)
        else:
            cta = random.choice(CTA_TEMPLATES)

        if not cta:
            cta = CTA_TEMPLATES[0]

        return f"""---

## {cta['title']}

{cta['content']}

---"""

    def _generate_signature(self) -> str:
        """Gera assinatura do artigo"""
        signature = random.choice(SIGNATURE_VARIATIONS)
        return f"\n\n*{signature}*"

    def _generate_meta_description(self, title: str, topic_type: str) -> str:
        """Gera meta description SEO-friendly"""
        templates = {
            'treino': f"Descobre {title.lower()} com o método militar do Treinador David. Sem enrolação. Resultados reais.",
            'nutricao': f"Guia completo sobre {title.lower()}. Ciência + Prática. Método TD comprovado.",
            'motivacao': f"{title}. Mentalidade militar para resultados extraordinários. Semper Fidelis.",
            'ciencia': f"O que a ciência diz sobre {title.lower()}. Evidências + Aplicação prática TD.",
            'transformacao': f"{title}. História real de transformação. Inspira-te e age."
        }

        description = templates.get(topic_type, templates['treino'])

        # Limita ao tamanho correto
        if len(description) > self.seo_config['meta_description_length']:
            description = description[:self.seo_config['meta_description_length']-3] + "..."

        return description

    def _create_hook_question(self, title: str) -> str:
        """Cria pergunta de hook baseada no título"""
        return f"Quer saber a verdade sobre {title.lower()}?"

    def _create_topic_intro(self, title: str) -> str:
        """Cria introdução do tópico"""
        return f"Vou te mostrar exatamente como dominar {title.lower()} usando o método TD."

    def _extract_main_topic(self, title: str) -> str:
        """Extrai tópico principal do título"""
        # Simplificado - pode ser melhorado com NLP
        words = title.lower().split()
        return ' '.join(words[-3:]) if len(words) > 3 else title.lower()


def generate_multiple_articles(topics: List[Dict], output_format: str = 'dict') -> List[Dict]:
    """
    Gera múltiplos artigos de uma vez

    Args:
        topics: Lista de dicts com topic_type, title e custom_params
        output_format: 'dict' ou 'json'

    Returns:
        Lista de artigos gerados
    """
    generator = TDArticleGenerator()
    articles = []

    for topic in topics:
        article = generator.generate_article(
            topic_type=topic.get('topic_type', 'treino'),
            title=topic.get('title', 'Artigo TD'),
            custom_params=topic.get('custom_params', {})
        )
        articles.append(article)

    return articles


# Exemplos de uso
if __name__ == "__main__":
    generator = TDArticleGenerator()

    # Exemplo 1: Artigo de treino
    article1 = generator.generate_article(
        topic_type='treino',
        title='Como Ganhar Massa Muscular Depois dos 40',
        custom_params={
            'hook_question': 'Achas que é tarde demais para ganhar músculo depois dos 40?',
            'cta_type': 'programa_foca'
        }
    )

    print("=" * 80)
    print(article1['title'])
    print("=" * 80)
    print(f"Palavras: {article1['word_count']}")
    print(f"Meta: {article1['meta_description']}")
    print("=" * 80)
    print(article1['content'][:500] + "...")
