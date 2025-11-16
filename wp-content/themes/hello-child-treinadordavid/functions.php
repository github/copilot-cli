<?php
/**
 * Hello Child – Treinador David (minimal)
 *
 * Minimal child theme functions to avoid duplication with TD Core mu-plugin.
 * - Enqueue parent style only (no td-blocks, no editor.css)
 * - Register small editor helpers if wanted (kept minimal)
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

add_action( 'after_setup_theme', function () {
    add_theme_support( 'align-wide' );
    // DO NOT add_editor_style() — you manage per-post styles inline.
} );

add_action( 'wp_enqueue_scripts', function () {
    // Parent style (Hello)
    $parent_style = get_template_directory() . '/style.css';
    if ( file_exists( $parent_style ) ) {
        wp_enqueue_style( 'hello-parent', get_template_directory_uri() . '/style.css', [], filemtime( $parent_style ) );
    }

    // Do NOT enqueue td-blocks.css here (you deleted it / manage per-post)
    // Optional theme JS (only if present)
    $js_file = get_stylesheet_directory() . '/js/theme.js';
    if ( file_exists( $js_file ) ) {
        wp_enqueue_script( 'td-theme-js', get_stylesheet_directory_uri() . '/js/theme.js', [], filemtime( $js_file ), true );
    }
}, 10 );

/* Optional: editor helpers (register fewer styles) */
add_action( 'init', function () {
    if ( function_exists( 'register_block_style' ) ) {
        register_block_style( 'core/button', [
            'name'  => 'td-contrast',
            'label' => __( 'Contraste (AA)', 'hello-child-treinadordavid' ),
        ] );
    }
} );
add_action( 'init', function() {
    RankMath\Helper::remove_notification( 'auto_post_redirection' );
});