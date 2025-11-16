<?php
/**
 * Plugin Name: TD Fonts Loader
 * Description: Loads Inter and Oswald fonts locally for Treinador David.
 * Author: Treinador David
 * Version: 1.0
 */

add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style(
        'td-fonts',
        get_stylesheet_directory_uri() . '/fonts/fonts.css',
        [],
        filemtime(get_stylesheet_directory() . '/fonts/fonts.css')
    );
});

