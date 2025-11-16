<?php
// Minimal single.php for Hello Child (Treinador David)
// Purpose: reliable <main id="main-content"> wrapper and call the_content() so Gutenberg posts render correctly.
if ( ! defined( 'ABSPATH' ) ) { exit; }
get_header();
?>
<div id="site-content" class="site-content" style="background:transparent;">
  <div class="site-inner" style="max-width:1200px;margin:0 auto;padding:24px;">
    <main id="main-content" role="main" tabindex="-1" style="max-width:1000px;margin:0 auto;">
      <?php
      if ( have_posts() ) :
        while ( have_posts() ) : the_post();
          the_content();
          wp_link_pages( array(
            'before' => '<nav class="page-links" aria-label="Página do artigo">',
            'after'  => '</nav>',
          ) );
        endwhile;
      else :
        get_template_part( 'template-parts/content', 'none' );
      endif;
      ?>
    </main>
  </div>
</div>
<?php get_footer();
