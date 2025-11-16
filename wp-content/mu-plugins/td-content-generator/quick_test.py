#!/usr/bin/env python3
"""
TD Content Generator - Teste Rápido
Testa a geração de artigos sem publicar no WordPress
"""

from article_generator import TDArticleGenerator


def test_article_generation():
    """Testa geração de um artigo"""
    print("="*80)
    print("TD CONTENT GENERATOR - TESTE RÁPIDO")
    print("="*80)
    print()

    generator = TDArticleGenerator()

    # Testa geração de artigo de treino
    print("🔧 Gerando artigo de TREINO...")
    article_treino = generator.generate_article(
        topic_type='treino',
        title='Como Ganhar Massa Muscular Depois dos 40',
        custom_params={
            'hook_question': 'Achas que é tarde demais para ganhar músculo depois dos 40?',
            'cta_type': 'programa_foca'
        }
    )

    print(f"✅ Artigo gerado com sucesso!")
    print(f"   Título: {article_treino['title']}")
    print(f"   Categoria: {article_treino['category']}")
    print(f"   Palavras: {article_treino['word_count']}")
    print(f"   Meta: {article_treino['meta_description'][:80]}...")
    print()

    # Testa geração de artigo de nutrição
    print("🔧 Gerando artigo de NUTRIÇÃO...")
    article_nutricao = generator.generate_article(
        topic_type='nutricao',
        title='A Verdade Sobre Proteína',
        custom_params={
            'cta_type': 'ebook_gratis'
        }
    )

    print(f"✅ Artigo gerado com sucesso!")
    print(f"   Título: {article_nutricao['title']}")
    print(f"   Categoria: {article_nutricao['category']}")
    print(f"   Palavras: {article_nutricao['word_count']}")
    print()

    # Testa geração de artigo de motivação
    print("🔧 Gerando artigo de MOTIVAÇÃO...")
    article_motivacao = generator.generate_article(
        topic_type='motivacao',
        title='Disciplina vs Motivação',
        custom_params={
            'personal_story': 'aprendi que motivação é passageira',
            'cta_type': 'desafio_30_dias'
        }
    )

    print(f"✅ Artigo gerado com sucesso!")
    print(f"   Título: {article_motivacao['title']}")
    print(f"   Categoria: {article_motivacao['category']}")
    print(f"   Palavras: {article_motivacao['word_count']}")
    print()

    # Preview do primeiro artigo
    print("="*80)
    print("PREVIEW DO ARTIGO DE TREINO")
    print("="*80)
    print()
    print(article_treino['content'][:800])
    print()
    print("[... conteúdo continua ...]")
    print()

    print("="*80)
    print("✅ TESTE CONCLUÍDO COM SUCESSO!")
    print("="*80)
    print()
    print("Próximos passos:")
    print("1. Revise os artigos gerados")
    print("2. Configure WordPress credentials")
    print("3. Use generate_and_publish.py para publicar")
    print()


if __name__ == "__main__":
    try:
        test_article_generation()
    except Exception as e:
        print(f"❌ Erro durante o teste: {e}")
        import traceback
        traceback.print_exc()
