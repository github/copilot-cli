"""
TD Content Generator
Sistema completo de geração de artigos TD-style para WordPress

Autor: Treinador David
Versão: 1.0.0
"""

__version__ = '1.0.0'
__author__ = 'Treinador David'

from .article_generator import TDArticleGenerator, generate_multiple_articles
from .wordpress_integration import WordPressPublisher, UnsplashImageFetcher
from .td_config import TD_COLORS, TD_FONTS, WP_CONFIG

__all__ = [
    'TDArticleGenerator',
    'generate_multiple_articles',
    'WordPressPublisher',
    'UnsplashImageFetcher',
    'TD_COLORS',
    'TD_FONTS',
    'WP_CONFIG'
]
