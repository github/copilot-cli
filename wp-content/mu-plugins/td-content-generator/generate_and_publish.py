#!/usr/bin/env python3
"""
TD Content Generator - Script Principal
Gera e publica artigos TD-style no WordPress

Uso:
    python generate_and_publish.py --generate-only
    python generate_and_publish.py --publish --username admin --password app-password
    python generate_and_publish.py --batch articles.json
"""

import argparse
import json
import os
from typing import List, Dict
from article_generator import TDArticleGenerator, generate_multiple_articles
from wordpress_integration import WordPressPublisher, UnsplashImageFetcher


def generate_sample_articles() -> List[Dict]:
    """Gera artigos de exemplo para demonstração"""
    sample_topics = [
        {
            'topic_type': 'treino',
            'title': 'Como Ganhar Massa Muscular Depois dos 40',
            'custom_params': {
                'hook_question': 'Achas que é tarde demais para ganhar músculo depois dos 40?',
                'cta_type': 'programa_foca'
            }
        },
        {
            'topic_type': 'nutricao',
            'title': 'A Verdade Sobre Proteína: Quanto Precisas Realmente',
            'custom_params': {
                'hook_question': 'Quantas gramas de proteína por dia?',
                'cta_type': 'ebook_gratis'
            }
        },
        {
            'topic_type': 'motivacao',
            'title': 'Disciplina vs Motivação: O Que Realmente Funciona',
            'custom_params': {
                'personal_story': 'aprendi que motivação é passageira, mas disciplina é eterna',
                'cta_type': 'desafio_30_dias'
            }
        },
        {
            'topic_type': 'ciencia',
            'title': 'Frequência de Treino: O Que a Ciência Realmente Diz',
            'custom_params': {
                'cta_type': 'consultoria'
            }
        },
        {
            'topic_type': 'transformacao',
            'title': 'De 100kg a 75kg: A Transformação de Miguel Santos',
            'custom_params': {
                'cta_type': 'transformacao'
            }
        }
    ]

    return generate_multiple_articles(sample_topics)


def save_articles_to_json(articles: List[Dict], filename: str = 'generated_articles.json'):
    """Salva artigos gerados em arquivo JSON"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    print(f"✓ Artigos salvos em: {filename}")


def load_articles_from_json(filename: str) -> List[Dict]:
    """Carrega artigos de arquivo JSON"""
    with open(filename, 'r', encoding='utf-8') as f:
        return json.load(f)


def preview_article(article: Dict):
    """Mostra preview de um artigo"""
    print("\n" + "="*80)
    print(f"TÍTULO: {article['title']}")
    print("="*80)
    print(f"CATEGORIA: {article['category']}")
    print(f"PALAVRAS: {article['word_count']}")
    print(f"META: {article['meta_description']}")
    print("="*80)
    print("PREVIEW DO CONTEÚDO:")
    print(article['content'][:500] + "...")
    print("="*80 + "\n")


def main():
    parser = argparse.ArgumentParser(description='TD Content Generator - Gera e publica artigos TD-style')

    # Modos de operação
    parser.add_argument('--generate-only', action='store_true',
                        help='Apenas gera artigos sem publicar')
    parser.add_argument('--publish', action='store_true',
                        help='Publica artigos no WordPress')
    parser.add_argument('--preview', action='store_true',
                        help='Mostra preview dos artigos gerados')

    # Configurações de geração
    parser.add_argument('--batch', type=str,
                        help='Arquivo JSON com lista de tópicos para gerar')
    parser.add_argument('--count', type=int, default=5,
                        help='Número de artigos de exemplo a gerar (padrão: 5)')
    parser.add_argument('--output', type=str, default='generated_articles.json',
                        help='Arquivo de saída para artigos gerados')

    # Configurações WordPress
    parser.add_argument('--site-url', type=str,
                        help='URL do site WordPress (padrão: do config)')
    parser.add_argument('--username', type=str,
                        help='Usuário WordPress')
    parser.add_argument('--password', type=str,
                        help='Senha/Application Password WordPress')
    parser.add_argument('--status', type=str, choices=['draft', 'publish'],
                        default='draft', help='Status dos posts (padrão: draft)')

    # Configurações de imagens
    parser.add_argument('--with-images', action='store_true',
                        help='Adiciona imagens destacadas (featured images)')
    parser.add_argument('--unsplash-key', type=str,
                        help='Chave API do Unsplash')

    args = parser.parse_args()

    # Se nenhum modo especificado, mostra ajuda
    if not (args.generate_only or args.publish or args.preview):
        parser.print_help()
        return

    # ===== GERAÇÃO DE ARTIGOS =====
    articles = []

    if args.batch:
        # Carrega tópicos de arquivo JSON
        print(f"Carregando tópicos de: {args.batch}")
        with open(args.batch, 'r', encoding='utf-8') as f:
            topics = json.load(f)
        articles = generate_multiple_articles(topics)
    else:
        # Gera artigos de exemplo
        print(f"Gerando {args.count} artigos de exemplo...")
        sample_articles = generate_sample_articles()
        articles = sample_articles[:args.count]

    print(f"✓ {len(articles)} artigos gerados com sucesso!")

    # ===== PREVIEW =====
    if args.preview:
        for article in articles:
            preview_article(article)

    # ===== SALVAR ARTIGOS =====
    if args.generate_only or args.output:
        save_articles_to_json(articles, args.output)

    # ===== PUBLICAÇÃO NO WORDPRESS =====
    if args.publish:
        if not args.username or not args.password:
            print("❌ Erro: --username e --password são obrigatórios para publicação")
            return

        print("\nIniciando publicação no WordPress...")

        publisher = WordPressPublisher(
            site_url=args.site_url,
            username=args.username,
            password=args.password
        )

        # Testa conexão
        if not publisher.test_connection():
            print("❌ Erro: Não foi possível conectar ao WordPress")
            return

        print("✓ Conexão com WordPress OK")

        # Busca imagens se solicitado
        image_fetcher = None
        if args.with_images:
            image_fetcher = UnsplashImageFetcher(args.unsplash_key)

        # Publica cada artigo
        results = []
        for i, article in enumerate(articles):
            print(f"\nPublicando artigo {i+1}/{len(articles)}: {article['title']}...")

            # Busca imagem se necessário
            featured_image_url = None
            if image_fetcher:
                featured_image_url = image_fetcher.get_random_image(
                    query=article.get('category', 'fitness')
                )

            # Publica
            result = publisher.publish_article(
                article,
                status=args.status,
                featured_image_url=featured_image_url
            )

            results.append(result)

            if result['success']:
                print(f"✓ Sucesso: {result['post_url']}")
            else:
                print(f"✗ Erro: {result['message']}")

        # Resumo
        print("\n" + "="*80)
        print("RESUMO DA PUBLICAÇÃO")
        print("="*80)
        successful = sum(1 for r in results if r['success'])
        print(f"Total de artigos: {len(results)}")
        print(f"Publicados com sucesso: {successful}")
        print(f"Falharam: {len(results) - successful}")
        print("="*80)

        # Salva log
        with open('publication_log.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print("✓ Log de publicação salvo em: publication_log.json")


def generate_topics_template():
    """Gera arquivo template de tópicos"""
    template = [
        {
            "topic_type": "treino",
            "title": "Seu Título Aqui",
            "custom_params": {
                "hook_question": "Sua pergunta de hook aqui?",
                "cta_type": "programa_foca"
            }
        }
    ]

    with open('topics_template.json', 'w', encoding='utf-8') as f:
        json.dump(template, f, ensure_ascii=False, indent=2)

    print("✓ Template de tópicos criado: topics_template.json")


if __name__ == "__main__":
    # Se executado sem argumentos, mostra exemplo de uso
    import sys
    if len(sys.argv) == 1:
        print("""
TD Content Generator - Sistema de Geração de Artigos TD-style
============================================================

EXEMPLOS DE USO:

1. Gerar 5 artigos de exemplo (apenas gerar):
   python generate_and_publish.py --generate-only

2. Gerar e ver preview:
   python generate_and_publish.py --generate-only --preview

3. Gerar e publicar no WordPress como rascunho:
   python generate_and_publish.py --publish --username admin --password sua-senha

4. Gerar e publicar direto (publicado):
   python generate_and_publish.py --publish --username admin --password sua-senha --status publish

5. Gerar a partir de arquivo de tópicos:
   python generate_and_publish.py --batch topics.json --publish --username admin --password sua-senha

6. Gerar com imagens do Unsplash:
   python generate_and_publish.py --publish --username admin --password sua-senha --with-images --unsplash-key sua-chave

CRIAR TEMPLATE DE TÓPICOS:
   Crie um arquivo topics.json com esta estrutura:
   [
     {
       "topic_type": "treino",
       "title": "Como Ganhar Massa Muscular",
       "custom_params": {
         "hook_question": "Quer ganhar músculo rápido?",
         "cta_type": "programa_foca"
       }
     }
   ]

TIPOS DE TÓPICOS:
   - treino
   - nutricao
   - motivacao
   - ciencia
   - transformacao

TIPOS DE CTA:
   - programa_foca
   - consultoria
   - ebook_gratis
   - desafio_30_dias
   - comunidade
   - app_mobile
   - (ver content_templates.py para lista completa)

Para ajuda completa: python generate_and_publish.py --help
        """)
    else:
        main()
