<?php
/*
Plugin Name: TD Core – Titles & Breadcrumbs
Description: Garante H1 e Rank Math breadcrumbs em single posts, com suporte a Elementor Canvas e fallback universal.
Author: Treinador David
Version: 1.0.0
*/

if ( ! defined('ABSPATH') ) exit;

/**
 * Flag global para evitar duplicação de H1
 */
$td_h1_printed = false;

/**
 * 1) Hook para Elementor Canvas: antes do conteúdo
 */
add_action('elementor/page_templates/canvas/before_content', function () {
    global $td_h1_printed;
    
    if ( ! is_single() || get_post_type() !== 'post' ) return;
    if ( $td_h1_printed ) return; // Evita duplicar
    
    // Breadcrumbs primeiro (opcional, com nav)
    if ( function_exists('rank_math_the_breadcrumbs') ) {
        echo '<nav class="td-breadcrumbs" aria-label="breadcrumb">';
        rank_math_the_breadcrumbs();
        echo '</nav>';
    }
    
    // H1 do post
    echo '<h1 class="entry-title">' . esc_html( get_the_title() ) . '</h1>';
    
    $td_h1_printed = true;
}, 5);

/**
 * 2) Fallback universal via the_content (para quando NÃO é Canvas)
 */
add_filter('the_content', function ($content) {
    global $td_h1_printed;
    
    if ( ! is_single() || get_post_type() !== 'post' ) return $content;
    if ( $td_h1_printed ) return $content; // Já foi impresso
    
    // Monta breadcrumbs (se existir Rank Math) + H1
    $prefix = '';
    
    if ( function_exists('rank_math_the_breadcrumbs') ) {
        ob_start();
        echo '<nav class="td-breadcrumbs" aria-label="breadcrumb">';
        rank_math_the_breadcrumbs();
        echo '</nav>';
        $prefix .= ob_get_clean();
    }
    
    $prefix .= '<h1 class="entry-title">' . esc_html( get_the_title() ) . '</h1>';
    
    $td_h1_printed = true;
    
    // Insere no topo do conteúdo
    return $prefix . $content;
}, 5);

/**
 * 3) Remover H1 padrão do tema (se houver)
 */
add_filter('hello_elementor_page_title', '__return_false');