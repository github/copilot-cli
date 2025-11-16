<?php
/**
 * Plugin Name: TD SEO Fitness Enhancements
 * Description: Melhorias de SEO específicas para artigos de fitness e treino em português
 * Version: 1.0.0
 * Author: Treinador David
 * Author URI: https://treinadordavid.com
 */

if (!defined('ABSPATH')) exit;

class TD_SEO_Fitness {

    private $fitness_categories = [
        'coaching',
        'emagrecer',
        'musculacao',
        'treinos',
        'personal-trainer',
        'exercicios',
        'programas',
        'noticias-fitness'
    ];

    public function __construct() {
        // Schema.org markup para artigos de fitness
        add_action('wp_head', [$this, 'add_fitness_schema'], 6);

        // Meta descriptions otimizadas
        add_filter('get_the_excerpt', [$this, 'optimize_excerpt_seo'], 10, 2);

        // Open Graph para redes sociais
        add_action('wp_head', [$this, 'add_open_graph_tags'], 7);

        // Twitter Cards
        add_action('wp_head', [$this, 'add_twitter_cards'], 8);

        // Breadcrumbs schema
        add_action('wp_head', [$this, 'add_breadcrumb_schema'], 9);
    }

    private function is_fitness_post() {
        if (!is_singular('post')) return false;

        foreach ($this->fitness_categories as $cat) {
            if (has_category($cat)) return true;
        }
        return false;
    }

    /**
     * Adiciona Schema.org específico para artigos de fitness
     */
    public function add_fitness_schema() {
        if (!$this->is_fitness_post()) return;

        global $post;
        $post_id = get_queried_object_id();

        // Dados básicos
        $title = wp_strip_all_tags(get_the_title($post_id));
        $url = esc_url(get_permalink($post_id));
        $excerpt = wp_strip_all_tags(get_the_excerpt($post_id));
        $img = get_the_post_thumbnail_url($post_id, 'full');

        // Autor
        $author_name = get_the_author_meta('display_name', $post->post_author);

        // Categorias (para schema keywords)
        $categories = get_the_category($post_id);
        $keywords = array_map(function($cat) { return $cat->name; }, $categories);

        // Tempo de leitura estimado
        $word_count = str_word_count(strip_tags($post->post_content));
        $reading_time = ceil($word_count / 200); // 200 palavras por minuto

        // Schema HowTo para artigos de treino
        if (has_category('treinos') || has_category('exercicios')) {
            $schema = [
                '@context' => 'https://schema.org',
                '@type' => 'HowTo',
                'name' => $title,
                'description' => $excerpt,
                'image' => $img,
                'totalTime' => 'PT' . $reading_time . 'M',
                'author' => [
                    '@type' => 'Person',
                    'name' => 'Treinador David',
                    'url' => 'https://treinadordavid.com',
                    'jobTitle' => 'Personal Trainer',
                    'affiliation' => [
                        '@type' => 'Organization',
                        'name' => 'CREF 7-016401-G/DF'
                    ]
                ],
                'datePublished' => get_the_date('c', $post_id),
                'dateModified' => get_the_modified_date('c', $post_id)
            ];

            // Adicionar steps se houver H2s numerados
            $steps = $this->extract_howto_steps($post->post_content);
            if (!empty($steps)) {
                $schema['step'] = $steps;
            }

            echo '<script type="application/ld+json">' .
                 wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) .
                 '</script>' . "\n";
        }

        // FAQPage schema se houver Q&A
        if (has_shortcode($post->post_content, 'td_qa')) {
            $faq_schema = [
                '@context' => 'https://schema.org',
                '@type' => 'FAQPage',
                'mainEntity' => $this->extract_faq_from_content($post->post_content)
            ];

            if (!empty($faq_schema['mainEntity'])) {
                echo '<script type="application/ld+json">' .
                     wp_json_encode($faq_schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) .
                     '</script>' . "\n";
            }
        }
    }

    /**
     * Extrai steps para HowTo schema
     */
    private function extract_howto_steps($content) {
        $steps = [];

        // Procurar por H2s ou H3s que parecem passos
        preg_match_all('/<h[23][^>]*>(.*?)<\/h[23]>/i', $content, $matches);

        if (!empty($matches[1])) {
            $position = 1;
            foreach ($matches[1] as $heading) {
                $clean_heading = wp_strip_all_tags($heading);

                // Verificar se parece um passo (contém número ou palavras-chave)
                if (preg_match('/^\d+|passo|etapa|como|faça/i', $clean_heading)) {
                    $steps[] = [
                        '@type' => 'HowToStep',
                        'position' => $position++,
                        'name' => $clean_heading,
                        'text' => $clean_heading
                    ];
                }
            }
        }

        return $steps;
    }

    /**
     * Extrai FAQs do conteúdo
     */
    private function extract_faq_from_content($content) {
        $faqs = [];

        // Procurar padrões de pergunta/resposta
        // Formato: qualquer texto com "?" seguido de parágrafo
        preg_match_all('/<h[3-4][^>]*>(.*?\?)<\/h[3-4]>\s*<p>(.*?)<\/p>/is', $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $question = wp_strip_all_tags($match[1]);
            $answer = wp_strip_all_tags($match[2]);

            $faqs[] = [
                '@type' => 'Question',
                'name' => $question,
                'acceptedAnswer' => [
                    '@type' => 'Answer',
                    'text' => $answer
                ]
            ];
        }

        return $faqs;
    }

    /**
     * Otimiza excerpt para SEO
     */
    public function optimize_excerpt_seo($excerpt, $post = null) {
        if (!$post) {
            $post = get_post();
        }

        if (!$excerpt && $post) {
            $excerpt = wp_trim_words($post->post_content, 30, '...');
        }

        // Limitar a 155 caracteres (ideal para meta description)
        if (strlen($excerpt) > 155) {
            $excerpt = substr($excerpt, 0, 152) . '...';
        }

        return $excerpt;
    }

    /**
     * Open Graph tags para redes sociais
     */
    public function add_open_graph_tags() {
        if (!is_singular('post')) return;

        $post_id = get_queried_object_id();
        $title = get_the_title($post_id);
        $excerpt = get_the_excerpt($post_id);
        $url = get_permalink($post_id);
        $img = get_the_post_thumbnail_url($post_id, 'large');

        echo '<meta property="og:type" content="article" />' . "\n";
        echo '<meta property="og:title" content="' . esc_attr($title) . '" />' . "\n";
        echo '<meta property="og:description" content="' . esc_attr($excerpt) . '" />' . "\n";
        echo '<meta property="og:url" content="' . esc_url($url) . '" />' . "\n";
        echo '<meta property="og:site_name" content="Treinador David" />' . "\n";
        echo '<meta property="og:locale" content="pt_BR" />' . "\n";

        if ($img) {
            echo '<meta property="og:image" content="' . esc_url($img) . '" />' . "\n";
            echo '<meta property="og:image:width" content="1200" />' . "\n";
            echo '<meta property="og:image:height" content="630" />' . "\n";
        }

        // Article tags
        echo '<meta property="article:published_time" content="' . get_the_date('c', $post_id) . '" />' . "\n";
        echo '<meta property="article:modified_time" content="' . get_the_modified_date('c', $post_id) . '" />' . "\n";
        echo '<meta property="article:author" content="Treinador David" />' . "\n";

        // Tags
        $tags = get_the_tags($post_id);
        if ($tags) {
            foreach ($tags as $tag) {
                echo '<meta property="article:tag" content="' . esc_attr($tag->name) . '" />' . "\n";
            }
        }
    }

    /**
     * Twitter Card tags
     */
    public function add_twitter_cards() {
        if (!is_singular('post')) return;

        $post_id = get_queried_object_id();
        $title = get_the_title($post_id);
        $excerpt = get_the_excerpt($post_id);
        $img = get_the_post_thumbnail_url($post_id, 'large');

        echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
        echo '<meta name="twitter:title" content="' . esc_attr($title) . '" />' . "\n";
        echo '<meta name="twitter:description" content="' . esc_attr($excerpt) . '" />' . "\n";

        if ($img) {
            echo '<meta name="twitter:image" content="' . esc_url($img) . '" />' . "\n";
        }

        // Se houver Twitter handle configurado
        $twitter_handle = get_option('td_twitter_handle', '');
        if ($twitter_handle) {
            echo '<meta name="twitter:site" content="' . esc_attr($twitter_handle) . '" />' . "\n";
            echo '<meta name="twitter:creator" content="' . esc_attr($twitter_handle) . '" />' . "\n";
        }
    }

    /**
     * Breadcrumb Schema
     */
    public function add_breadcrumb_schema() {
        if (!is_singular('post')) return;

        $post_id = get_queried_object_id();
        $categories = get_the_category($post_id);

        if (empty($categories)) return;

        $main_category = $categories[0];

        $breadcrumb = [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => [
                [
                    '@type' => 'ListItem',
                    'position' => 1,
                    'name' => 'Home',
                    'item' => home_url('/')
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 2,
                    'name' => $main_category->name,
                    'item' => get_category_link($main_category->term_id)
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 3,
                    'name' => get_the_title($post_id),
                    'item' => get_permalink($post_id)
                ]
            ]
        ];

        echo '<script type="application/ld+json">' .
             wp_json_encode($breadcrumb, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) .
             '</script>' . "\n";
    }
}

// Inicializar
new TD_SEO_Fitness();
