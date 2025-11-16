<?php
/**
 * Plugin Name: Treinador David Core (Stable AAA) - v2 (Sem TOC)
 * Description: Núcleo estável: WCAG 2.2 AAA, Schema Article+Speakable, Shortcodes (Quick Answer, Science+Card, Q&A+Card, Speakable, Signature, Separator, Audio, Video). CSS externo automático. Sem dark mode. **Removido TOC interno para evitar conflito com plugin de TOC automático.**
 * Version: 2.0.2
 * Author: Treinador David
 * Requires at least: 6.2
 * Requires PHP: 8.0
 */
if (!defined('ABSPATH')) exit;
define('TD_CORE_VER', '2.0.2'); // Versão atualizada
define('TD_CORE_CSS_REL', 'wp-content/treinadordavid-core.css');
define('TD_CORE_CSS_PATH', ABSPATH . TD_CORE_CSS_REL);
define('TD_CORE_CSS_URL', site_url('/' . TD_CORE_CSS_REL));

// Função de verificação (sem alterações)
function td_core_is_off($key = 'td_off') {
    if (!is_user_logged_in()) return false;
    if (!current_user_can('edit_posts')) return false;
    return isset($_GET[$key]) && $_GET[$key] === '1';
}

// Skip link (sem alterações)
add_action('wp_body_open', function () {
    echo '<a href="#main-content" class="td-skip-link">Pular para o conteúdo</a>';
});

// Injeção de ID de conteúdo (sem alterações)
add_filter('the_content', function ($html) {
    if (is_admin()) return $html;
    if (!is_singular('post') || !is_main_query()) return $html;
    if (strpos($html, 'id="main-content"') !== false) return $html;
    return '<span id="main-content" tabindex="-1"></span>' . $html;
}, 1);

// Schema/LD+JSON (sem alterações)
add_action('wp_head', function () {
    if (!is_singular('post') || td_core_is_off()) return;
    $post_id    = get_queried_object_id();
    $title      = wp_strip_all_tags(get_the_title($post_id));
    $url        = esc_url(get_permalink($post_id));
    $img        = get_the_post_thumbnail_url($post_id, 'full');
    $logo_url = '';
    $logo_id  = (int) get_theme_mod('custom_logo');
    if ($logo_id) $logo_url = wp_get_attachment_image_url($logo_id, 'full');
    if (!$logo_url) {
        $site_icon = get_site_icon_url(512);
        if ($site_icon) $logo_url = $site_icon;
    }
    if (!$logo_url) $logo_url = home_url('/wp-content/uploads/treinadordavid-icon.png');
    $schema = array(
        '@context'         => 'https://schema.org',
        '@type'            => 'Article',
        'headline'         => $title,
        'url'              => $url,
        'mainEntityOfPage' => $url,
        'author'           => array('@type' => 'Person', 'name' => 'Treinador David'),
        'publisher'        => array(
            '@type' => 'Organization',
            'name'  => 'Treinador David',
            'logo'  => array(
                '@type'  => 'ImageObject',
                'url'    => $logo_url,
                'width'  => 512,
                'height' => 512
            ),
        ),
        'datePublished'    => get_the_date('c', $post_id),
        'dateModified'     => get_the_modified_date('c', $post_id),
    );
    if ($img) $schema['image'] = array($img);
    global $post;
    if ($post && has_shortcode($post->post_content, 'td_speakable')) {
        $schema['speakable'] = array(
            '@type'       => 'SpeakableSpecification',
            'cssSelector' => array('.td-speakable'),
        );
    }
    echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
}, 5);

// Carregamento do CSS (sem alterações)
add_action('wp_enqueue_scripts', function () {
    if (td_core_is_off('td_off_css')) return;
    if (file_exists(TD_CORE_CSS_PATH)) {
        wp_enqueue_style('td-core-external', TD_CORE_CSS_URL, array(), TD_CORE_VER, 'all');
        return;
    }
    wp_register_style('td-core-inline', false, array(), TD_CORE_VER, 'all');
    wp_enqueue_style('td-core-inline');
    $css = '
:root{--td-blue:#0EA5E9;--td-blue-aa:#0369A1;--td-blue-aaa:#035C8D;--td-text:#0F172A;--td-text-2:#475569;--td-bg:#FFFFFF;--td-bg-2:#F8FAFC;}
html{scroll-behavior:smooth}
body{background:var(--td-bg);color:var(--td-text);line-height:1.7;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0}
h1,h2,h3,h4,h5,h6{font-family:Oswald,Impact,Arial Black,sans-serif;line-height:1.3}
a{color:var(--td-blue-aaa);text-decoration:underline}
a:hover{color:#0B1220}
:focus-visible{outline:3px solid var(--td-blue-aaa);outline-offset:3px;border-radius:4px}
.td-skip-link{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:-999;background:var(--td-blue-aaa);color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none}
.td-skip-link:focus{left:10px;top:10px;z-index:99999;width:auto;height:auto;overflow:visible}
h2[id],h3[id],h4[id]{scroll-margin-top:120px}
.rail{position:sticky;top:95px;border:3px solid var(--td-blue-aaa);border-radius:12px;padding:16px;background:#fff}
.td-toc-top{position:sticky;top:60px;border-bottom:3px solid var(--td-blue-aaa);padding:8px 16px;background:#fff;border-radius:8px}
.td-quick-answer{background:#F0F9FF;border-left:5px solid var(--td-blue-aaa);padding:16px;border-radius:8px;margin:16px 0}
.td-speakable{display:block;border-left:4px dashed var(--td-blue-aaa);padding:12px 16px;border-radius:10px;margin:16px 0}
.td-articles-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
.td-article-card,.td-qa-card{border:3px solid var(--td-blue-aaa);border-radius:12px;padding:16px;background:#fff}
.td-qa-block{border:3px solid var(--td-blue-aaa);border-radius:12px;padding:16px;margin:24px 0}
.td-signature-block{display:flex;align-items:center;gap:16px;padding:16px;border:2px solid var(--td-blue-aaa);border-radius:12px;background:#F8FAFC}
.td-signature-logo{width:80px;height:80px;border-radius:50%;border:3px solid var(--td-blue-aaa)}
.td-video-responsive-embed{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;background:#000}
.td-video-responsive-embed video{position:absolute;top:0;left:0;width:100%;height:100%;border:0}
';
    wp_add_inline_style('td-core-inline', $css);
});

// --- INÍCIO DA REMOÇÃO DO TOC ---
// Todo o código do `global $td_toc_headings;` até `add_action('wp_footer', ...)`
// foi removido para evitar conflito com o plugin TD_TOC_Plugin.
// --- FIM DA REMOÇÃO DO TOC ---

// Shortcode: Quick Answer (sem alterações)
add_shortcode('td_quick_answer', function ($atts, $content = null) {
    $a = shortcode_atts(array('title' => ''), $atts, 'td_quick_answer');
    $out = '<aside class="td-quick-answer" role="region" aria-label="Resposta rápida">';
    if (!empty($a['title'])) $out .= '<h4>'.esc_html($a['title']).'</h4>';
    $out .= wp_kses_post(do_shortcode($content));
    $out .= '</aside>';
    return $out;
});

// Shortcode: Speakable (sem alterações)
add_shortcode('td_speakable', function ($atts, $content = null) {
    return '<div class="td-speakable">'.wp_kses_post(do_shortcode($content)).'</div>';
});

// Shortcode: Science Block (sem alterações)
// Este é o shortcode que o seu post `corrigido.txt` usa.
add_shortcode('td_science', function ($atts, $content = null) {
    $a = shortcode_atts(array('title'=>'Evidência Científica','cta_url'=>'','cta_label'=>''), $atts, 'td_science');
    $out = '<aside class="td-science-block" role="region" aria-label="'.esc_attr($a['title']).'">';
    if (!empty($a['title'])) $out .= '<h3>'.esc_html($a['title']).'</h3>';
    // Esta linha é a chave: ele cria o grid automaticamente.
    $out .= '<div class="td-articles-grid">'.do_shortcode(wp_kses_post($content)).'</div>';
    if (!empty($a['cta_url']) && !empty($a['cta_label'])) {
        $out .= '<p class="td-science-cta"><a href="'.esc_url($a['cta_url']).'" rel="noopener" target="_blank">'.esc_html($a['cta_label']).'</a></p>';
    }
    $out .= '</aside>'; return $out;
});

// Shortcode: Article Card (sem alterações)
add_shortcode('td_card', function ($atts, $content = null) {
    $a = shortcode_atts(array('title'=>'','meta'=>'','ref'=>''), $atts, 'td_card');
    $aria = !empty($a['title']) ? ' aria-label="Artigo: '.esc_attr($a['title']).'"' : '';
    $out  = '<div class="td-article-card" role="article" tabindex="0"'.$aria.'>';
    if (!empty($a['title'])) $out .= '<h4>'.esc_html($a['title']).'</h4>';
    if (!empty($a['meta']))  $out .= '<p class="td-article-meta">'.esc_html($a['meta']).'</p>';
    if (!empty($a['ref']))   $out .= '<p class="td-article-reference">'.esc_html($a['ref']).'</p>';
    $summary = trim(do_shortcode(wp_kses_post($content)));
    if (!empty($summary)) {
        if (strpos(trim($summary), '<ul>') === 0) {
            $summary = str_replace('<ul>', '<ul class="td-article-list">', $summary);
            $out    .= $summary;
        } else {
            $out    .= '<div class="td-article-summary">'.$summary.'</div>';
        }
    }
    $out .= '</div>'; return $out;
});

// Shortcode: Q&A Block (sem alterações)
add_shortcode('td_qa', function ($atts, $content = null) {
    $a = shortcode_atts(array('title'=>'Q&A do Treinador','cta_url'=>'','cta_label'=>''), $atts, 'td_qa');
    $out = '<aside class="td-qa-block" role="region" aria-label="'.esc_attr($a['title']).'">';
    if (!empty($a['title'])) $out .= '<h3>'.esc_html($a['title']).'</h3>';
    $out .= '<div class="td-qa-grid">'.do_shortcode(wp_kses_post($content)).'</div>';
    if (!empty($a['cta_url']) && !empty($a['cta_label'])) {
        $out .= '<p style="text-align:center;margin-top:16px"><a class="td-qa-cta" href="'.esc_url($a['cta_url']).'">'.esc_html($a['cta_label']).'</a></p>';
    }
    $out .= '</aside>'; return $out;
});

// Shortcode: Q&A Card (sem alterações)
add_shortcode('td_qa_card', function ($atts, $content = null) {
    $a = shortcode_atts(array('q'=>'Pergunta','badge'=>'Dúvida'), $atts, 'td_qa_card');
    $aria = ' aria-label="Q&A: '.esc_attr($a['q']).'"';
    $out  = '<div class="td-qa-card" role="article" tabindex="0"'.$aria.'>';
    if (!empty($a['badge'])) $out .= '<span class="td-qa-badge">'.esc_html($a['badge']).'</span>';
    $out .= '<h4 class="td-qa-q">'.esc_html($a['q']).'</h4>';
    $out .= '<p class="td-qa-a">'.wp_kses_post(do_shortcode($content)).'</p>';
    $out .= '</div>'; return $out;
});

// Shortcode: Signature (sem alterações)
add_shortcode('td_signature', function () {
    $logo = '';
    $logo_id = (int) get_theme_mod('custom_logo');
    if ($logo_id) $logo = wp_get_attachment_image_url($logo_id, 'full');
    if (!$logo) {
        $site_icon = get_site_icon_url(128);
        if ($site_icon) $logo = $site_icon;
    }
    if (!$logo) $logo = home_url('/wp-content/uploads/treinadordavid-icon.png');
    return '<div class="td-signature-block"><img src="'.esc_url($logo).'" alt="Treinador David Logo" class="td-signature-logo" width="80" height="80" loading="lazy"/><div class="td-signature-text"><strong>Treinador David</strong><br><span>Personal Trainer | CREF 7-016401-G/DF</span></div></div>';
});

// Shortcode: Separator (sem alterações)
add_shortcode('td_sep', function ($atts) {
    $a = shortcode_atts(array('label'=>''), $atts, 'td_sep');
    if (empty($a['label'])) return '<hr class="td-sep" aria-hidden="true">';
    return '<div class="td-sep-label" role="separator"><span>'.esc_html($a['label']).'</span></div>';
});

// Shortcode: Audio (sem alterações)
add_shortcode('td_audio', function ($atts) {
    $a = shortcode_atts(array('src'=>''), $atts, 'td_audio');
    if (empty($a['src'])) return '';
    return '<figure class="td-audio-wrap"><audio controls src="'.esc_url($a['src']).'" preload="metadata">Seu navegador não suporta o elemento <code>audio</code>.</audio></figure>';
});

// Shortcode: Video (sem alterações)
add_shortcode('td_video', function ($atts) {
    $a = shortcode_atts(array('src'=>'','caption'=>'','tracks'=>''), $atts, 'td_video');
    if (empty($a['src'])) return '';
    $tracks_html = '';
    if (!empty($a['tracks'])) {
        $list = array_map('trim', explode(',', $a['tracks']));
        foreach ($list as $t) {
            $parts = array_map('trim', explode('|', $t));
            $src   = $parts[0] ?? '';
            $kind  = $parts[1] ?? 'captions';
            $lang  = $parts[2] ?? '';
            $label = $parts[3] ?? '';
            if ($src) {
                $tracks_html .= '<track src="'.esc_url($src).'" kind="'.esc_attr($kind).'"'.($lang?' srclang="'.esc_attr($lang).'"':'').($label?' label="'.esc_attr($label).'"':'').' />';
            }
        }
    }
    $out  = '<figure class="td-video-wrap"><div class="td-video-responsive-embed">';
    $out .= '<video controls preload="metadata" width="1600" height="900" playsinline>';
    $out .= '<source src="'.esc_url($a['src']).'" type="video/mp4" />';
    $out .= $tracks_html;
    $out .= 'Seu navegador não suporta o elemento <code>video</code>.</video>';
    $out .= '</div>';
    if (!empty($a['caption'])) $out .= '<figcaption>'.esc_html($a['caption']).'</figcaption>';
    $out .= '</figure>'; return $out;
});

// Filtro KSES (sem alterações)
add_filter('wp_kses_allowed_html', function ($allowed, $context) {
    if ($context === 'post') {
        $allowed['figure']     = array('class' => array());
        $allowed['figcaption'] = array('class' => array());
        $allowed['audio']      = array('src' => array(), 'controls' => array(), 'preload' => array(), 'loop' => array(), 'autoplay' => array(), 'muted' => array());
        $allowed['video']      = array('src' => array(), 'controls' => array(), 'preload' => array(), 'loop' => array(), 'autoplay' => array(), 'muted' => array(), 'width' => array(), 'height' => array(), 'poster' => array(), 'playsinline' => array());
        $allowed['source']     = array('src' => array(), 'type' => array());
        $allowed['track']      = array('src' => array(), 'kind' => array(), 'srclang' => array(), 'label' => array(), 'default' => array());
    }
    return $allowed;
}, 10, 2);

// --- O SCRIPT JS DO FOOTER PARA O TOC FOI REMOVIDO ---