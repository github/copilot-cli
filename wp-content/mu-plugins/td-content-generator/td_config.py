"""
TD Content Generator - Configuração
Cores, fontes e estilos do padrão Treinador David
"""

# Cores TD
TD_COLORS = {
    'primary': '#0EA5E9',      # Azul TD (Sky Blue)
    'dark': '#0B1220',         # Preto/Dark Blue
    'white': '#FFFFFF',        # Branco
    'accent': '#10B981',       # Verde (para CTAs)
    'warning': '#F59E0B',      # Laranja (alertas)
    'text_primary': '#1F2937', # Texto principal
    'text_secondary': '#6B7280' # Texto secundário
}

# Fontes
TD_FONTS = {
    'heading': 'Oswald',       # Títulos
    'body': 'Inter',           # Corpo do texto
    'accent': 'Bebas Neue'     # Destaques/CTAs
}

# Tamanhos de fonte (pixels)
TD_FONT_SIZES = {
    'h1': 48,
    'h2': 36,
    'h3': 28,
    'h4': 24,
    'h5': 20,
    'body': 16,
    'small': 14,
    'cta': 20
}

# Espaçamentos (pixels)
TD_SPACING = {
    'section': 60,
    'paragraph': 24,
    'line_height_heading': 1.2,
    'line_height_body': 1.6,
    'container_padding': 40
}

# Configuração WordPress
WP_CONFIG = {
    'url': 'https://treinadordavid.pt',
    'api_endpoint': '/wp-json/wp/v2',
    'categories': {
        'treino': 'Treino',
        'nutricao': 'Nutrição',
        'motivacao': 'Motivação',
        'ciencia': 'Ciência do Treino',
        'transformacao': 'Transformação'
    },
    'default_author': 'Treinador David',
    'default_status': 'draft'  # 'draft' ou 'publish'
}

# Configuração de SEO
SEO_CONFIG = {
    'meta_description_length': 155,
    'focus_keywords_max': 5,
    'min_word_count': 800,
    'max_word_count': 2000,
    'target_word_count': 1200
}

# Configuração de imagens
IMAGE_CONFIG = {
    'featured_image_width': 1200,
    'featured_image_height': 630,
    'inline_image_width': 800,
    'unsplash_keywords': [
        'fitness',
        'gym',
        'workout',
        'bodybuilding',
        'strength training',
        'military training'
    ]
}

# Elementor shortcodes
ELEMENTOR_TEMPLATES = {
    'cta_box': '[elementor-template id="td-cta-box"]',
    'quote_box': '[elementor-template id="td-quote-box"]',
    'section_divider': '[elementor-template id="td-divider"]',
    'video_container': '[elementor-template id="td-video"]'
}

# Configuração de geração de conteúdo
CONTENT_CONFIG = {
    'use_depende_probability': 0.6,  # 60% de chance de usar "DEPENDE!"
    'military_transition_probability': 0.4,  # 40% de chance de transição militar
    'min_sections': 4,
    'max_sections': 7,
    'include_studies': True,
    'include_signature': True,
    'signature': 'Semper Fidelis - Treinador David'
}
