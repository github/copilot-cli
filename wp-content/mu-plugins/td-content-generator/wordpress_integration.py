"""
TD Content Generator - Integração WordPress
Upload automático de posts para WordPress via REST API
"""

import requests
import base64
import json
from typing import Dict, List, Optional
from td_config import WP_CONFIG, IMAGE_CONFIG


class WordPressPublisher:
    """Gerencia publicação de artigos no WordPress via REST API"""

    def __init__(self, site_url: str = None, username: str = None, password: str = None):
        """
        Inicializa o publisher

        Args:
            site_url: URL do site WordPress (ex: https://treinadordavid.pt)
            username: Usuário WordPress com permissões de publicação
            password: Senha ou Application Password
        """
        self.site_url = site_url or WP_CONFIG['url']
        self.username = username
        self.password = password
        self.api_base = f"{self.site_url}{WP_CONFIG['api_endpoint']}"

        # Credenciais para autenticação
        if username and password:
            credentials = f"{username}:{password}"
            token = base64.b64encode(credentials.encode())
            self.headers = {
                'Authorization': f'Basic {token.decode("utf-8")}',
                'Content-Type': 'application/json'
            }
        else:
            self.headers = {'Content-Type': 'application/json'}

    def publish_article(
        self,
        article: Dict,
        status: str = None,
        featured_image_url: Optional[str] = None,
        categories: Optional[List[str]] = None
    ) -> Dict:
        """
        Publica um artigo no WordPress

        Args:
            article: Dict com título, conteúdo, meta_description, etc
            status: 'draft' ou 'publish'
            featured_image_url: URL da imagem destacada
            categories: Lista de categorias

        Returns:
            Dict com resposta do WordPress (incluindo post_id)
        """
        # Prepara o post
        post_data = self._prepare_post_data(article, status, categories)

        # Envia para WordPress
        try:
            response = requests.post(
                f"{self.api_base}/posts",
                headers=self.headers,
                json=post_data
            )
            response.raise_for_status()

            post_response = response.json()
            post_id = post_response['id']

            # Adiciona featured image se fornecida
            if featured_image_url:
                self._set_featured_image(post_id, featured_image_url)

            # Adiciona meta description
            if article.get('meta_description'):
                self._set_meta_description(post_id, article['meta_description'])

            return {
                'success': True,
                'post_id': post_id,
                'post_url': post_response['link'],
                'message': f"Artigo '{article['title']}' publicado com sucesso!"
            }

        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': str(e),
                'message': f"Erro ao publicar artigo: {str(e)}"
            }

    def _prepare_post_data(
        self,
        article: Dict,
        status: Optional[str],
        categories: Optional[List[str]]
    ) -> Dict:
        """Prepara dados do post para envio"""
        # Converte conteúdo Markdown para HTML (WordPress aceita HTML)
        content_html = self._markdown_to_html(article['content'])

        # Prepara dados
        post_data = {
            'title': article['title'],
            'content': content_html,
            'status': status or WP_CONFIG['default_status'],
            'comment_status': 'open',
            'ping_status': 'open'
        }

        # Adiciona categorias
        if categories:
            category_ids = self._get_category_ids(categories)
            if category_ids:
                post_data['categories'] = category_ids
        elif article.get('category'):
            category_ids = self._get_category_ids([article['category']])
            if category_ids:
                post_data['categories'] = category_ids

        # Adiciona tags/keywords
        if article.get('keywords'):
            tag_ids = self._create_or_get_tags(article['keywords'])
            if tag_ids:
                post_data['tags'] = tag_ids

        return post_data

    def _markdown_to_html(self, markdown_content: str) -> str:
        """
        Converte Markdown para HTML (básico)
        Para conversão completa, usar biblioteca como markdown2 ou mistune
        """
        html = markdown_content

        # Headers
        html = html.replace('# ', '<h1>').replace('\n\n', '</h1>\n\n')
        html = html.replace('## ', '<h2>').replace('\n\n', '</h2>\n\n')
        html = html.replace('### ', '<h3>').replace('\n\n', '</h3>\n\n')

        # Bold
        import re
        html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)

        # Italic
        html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)

        # Links
        html = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', html)

        # Parágrafos
        paragraphs = html.split('\n\n')
        html = '\n\n'.join([f'<p>{p}</p>' if not p.startswith('<') else p for p in paragraphs])

        # Listas
        html = re.sub(r'\n- (.+)', r'\n<li>\1</li>', html)
        html = re.sub(r'(<li>.*</li>)', r'<ul>\1</ul>', html, flags=re.DOTALL)

        return html

    def _get_category_ids(self, category_names: List[str]) -> List[int]:
        """Obtém IDs de categorias do WordPress"""
        try:
            response = requests.get(f"{self.api_base}/categories")
            response.raise_for_status()
            all_categories = response.json()

            category_ids = []
            for cat_name in category_names:
                # Busca categoria existente
                cat_name_lower = cat_name.lower()
                for cat in all_categories:
                    if cat['name'].lower() == cat_name_lower or cat['slug'].lower() == cat_name_lower:
                        category_ids.append(cat['id'])
                        break
                else:
                    # Cria categoria se não existir
                    new_cat_id = self._create_category(cat_name)
                    if new_cat_id:
                        category_ids.append(new_cat_id)

            return category_ids

        except requests.exceptions.RequestException:
            return []

    def _create_category(self, category_name: str) -> Optional[int]:
        """Cria uma nova categoria no WordPress"""
        try:
            response = requests.post(
                f"{self.api_base}/categories",
                headers=self.headers,
                json={'name': category_name}
            )
            response.raise_for_status()
            return response.json()['id']
        except requests.exceptions.RequestException:
            return None

    def _create_or_get_tags(self, tag_names: List[str]) -> List[int]:
        """Cria ou obtém IDs de tags"""
        try:
            response = requests.get(f"{self.api_base}/tags")
            response.raise_for_status()
            all_tags = response.json()

            tag_ids = []
            for tag_name in tag_names:
                # Busca tag existente
                tag_found = False
                for tag in all_tags:
                    if tag['name'].lower() == tag_name.lower():
                        tag_ids.append(tag['id'])
                        tag_found = True
                        break

                # Cria tag se não existir
                if not tag_found:
                    try:
                        response = requests.post(
                            f"{self.api_base}/tags",
                            headers=self.headers,
                            json={'name': tag_name}
                        )
                        response.raise_for_status()
                        tag_ids.append(response.json()['id'])
                    except requests.exceptions.RequestException:
                        pass

            return tag_ids

        except requests.exceptions.RequestException:
            return []

    def _set_featured_image(self, post_id: int, image_url: str) -> bool:
        """Define imagem destacada do post"""
        try:
            # Faz upload da imagem
            media_id = self._upload_media_from_url(image_url)

            if media_id:
                # Associa imagem ao post
                response = requests.post(
                    f"{self.api_base}/posts/{post_id}",
                    headers=self.headers,
                    json={'featured_media': media_id}
                )
                response.raise_for_status()
                return True

            return False

        except requests.exceptions.RequestException:
            return False

    def _upload_media_from_url(self, image_url: str) -> Optional[int]:
        """Faz upload de imagem a partir de URL"""
        try:
            # Baixa a imagem
            img_response = requests.get(image_url)
            img_response.raise_for_status()

            # Prepara headers para upload de mídia
            media_headers = self.headers.copy()
            media_headers['Content-Type'] = 'image/jpeg'
            media_headers['Content-Disposition'] = 'attachment; filename=featured-image.jpg'

            # Upload para WordPress
            response = requests.post(
                f"{self.api_base}/media",
                headers=media_headers,
                data=img_response.content
            )
            response.raise_for_status()

            return response.json()['id']

        except requests.exceptions.RequestException:
            return None

    def _set_meta_description(self, post_id: int, meta_description: str) -> bool:
        """
        Define meta description (requer Yoast SEO ou similar)
        """
        try:
            # Para Yoast SEO
            response = requests.post(
                f"{self.api_base}/posts/{post_id}",
                headers=self.headers,
                json={
                    'yoast_meta': {
                        'yoast_wpseo_metadesc': meta_description
                    }
                }
            )
            # Não falha se Yoast não estiver instalado
            return True

        except requests.exceptions.RequestException:
            return False

    def publish_multiple_articles(
        self,
        articles: List[Dict],
        status: str = 'draft',
        delay_seconds: int = 2
    ) -> List[Dict]:
        """
        Publica múltiplos artigos

        Args:
            articles: Lista de artigos
            status: Status dos posts
            delay_seconds: Delay entre publicações

        Returns:
            Lista de resultados
        """
        import time
        results = []

        for i, article in enumerate(articles):
            print(f"Publicando artigo {i+1}/{len(articles)}: {article['title']}...")

            result = self.publish_article(article, status=status)
            results.append(result)

            if result['success']:
                print(f"✓ Sucesso: {result['post_url']}")
            else:
                print(f"✗ Erro: {result['message']}")

            # Delay entre publicações
            if i < len(articles) - 1:
                time.sleep(delay_seconds)

        return results

    def test_connection(self) -> bool:
        """Testa conexão com WordPress"""
        try:
            response = requests.get(f"{self.api_base}/posts?per_page=1")
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            print(f"Erro ao conectar com WordPress: {e}")
            return False


class UnsplashImageFetcher:
    """Busca imagens do Unsplash para featured images"""

    def __init__(self, access_key: Optional[str] = None):
        self.access_key = access_key
        self.base_url = "https://api.unsplash.com"

    def get_random_image(self, query: str = 'fitness') -> Optional[str]:
        """Obtém URL de imagem aleatória do Unsplash"""
        if not self.access_key:
            # Retorna URL de placeholder se não tiver API key
            return f"https://source.unsplash.com/1200x630/?{query}"

        try:
            response = requests.get(
                f"{self.base_url}/photos/random",
                params={
                    'query': query,
                    'orientation': 'landscape',
                    'client_id': self.access_key
                }
            )
            response.raise_for_status()
            return response.json()['urls']['regular']

        except requests.exceptions.RequestException:
            return f"https://source.unsplash.com/1200x630/?{query}"


# Exemplo de uso
if __name__ == "__main__":
    # Configura publisher
    publisher = WordPressPublisher(
        site_url="https://treinadordavid.pt",
        username="admin",
        password="your-application-password"
    )

    # Testa conexão
    if publisher.test_connection():
        print("✓ Conexão com WordPress OK")

        # Exemplo de artigo
        sample_article = {
            'title': 'Teste de Artigo TD',
            'content': '# Introdução\n\nEste é um teste...',
            'meta_description': 'Artigo de teste do sistema TD',
            'category': 'treino',
            'keywords': ['treino', 'fitness', 'musculação']
        }

        # Publica
        result = publisher.publish_article(sample_article, status='draft')
        print(result)
    else:
        print("✗ Falha ao conectar com WordPress")
