<?php
/**
 * Plugin Name: TD Analytics & Tracking
 * Description: Google Analytics 4 + Facebook Pixel + Dashboard integrado
 * Version: 1.0
 */

class TD_Analytics_Tracking {

    private $ga4_id = 'G-XXXXXXXXXX'; // Substituir
    private $fb_pixel_id = 'XXXXXXXXXXX'; // Substituir

    public function __construct() {
        add_action('wp_head', [$this, 'add_ga4_code']);
        add_action('wp_head', [$this, 'add_facebook_pixel']);
        add_action('wp_footer', [$this, 'add_custom_events']);
        add_shortcode('td_dashboard', [$this, 'render_dashboard']);
    }

    public function add_ga4_code() {
        ?>
        <!-- Google Analytics 4 -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo $this->ga4_id; ?>"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '<?php echo $this->ga4_id; ?>', {
            'custom_map': {
              'dimension1': 'program_type',
              'dimension2': 'customer_stage',
              'metric1': 'conversion_value'
            }
          });
        </script>
        <?php
    }

    public function add_facebook_pixel() {
        ?>
        <!-- Facebook Pixel Code -->
        <script>
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '<?php echo $this->fb_pixel_id; ?>');
        fbq('track', 'PageView');
        </script>
        <noscript><img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=<?php echo $this->fb_pixel_id; ?>&ev=PageView&noscript=1"
        /></noscript>
        <?php
    }

    public function add_custom_events() {
        global $post;
        if (!$post) return;

        $events = [];

        // Landing Pages específicas
        if (strpos($post->post_name, 'consultoria-personal') !== false) {
            $events[] = "gtag('event', 'view_personal_page', {value: 497, currency: 'BRL'});";
            $events[] = "fbq('track', 'ViewContent', {content_name: 'Personal Training', value: 497, currency: 'BRL'});";
        }

        if (strpos($post->post_name, 'programa-group') !== false) {
            $events[] = "gtag('event', 'view_group_page', {value: 97, currency: 'BRL'});";
            $events[] = "fbq('track', 'ViewContent', {content_name: 'Programa Group', value: 97, currency: 'BRL'});";
        }

        if (strpos($post->post_name, 'desafio-30-dias') !== false) {
            $events[] = "gtag('event', 'view_challenge_page', {value: 197, currency: 'BRL'});";
            $events[] = "fbq('track', 'ViewContent', {content_name: 'Desafio 30 Dias', value: 197, currency: 'BRL'});";
        }

        if (!empty($events)) {
            echo "<script>\n" . implode("\n", $events) . "\n</script>";
        }
    }

    public function render_dashboard() {
        ob_start();
        include dirname(__FILE__) . '/dashboard-template.php';
        return ob_get_clean();
    }
}

new TD_Analytics_Tracking();
