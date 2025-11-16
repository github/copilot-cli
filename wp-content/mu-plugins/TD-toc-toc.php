<?php
/**
 * Plugin Name: TD TOC Automático
 * Description: Adiciona um índice lateral (TOC) automático em posts do TreinadorDavid.com
 * Version: 1.2.0
 * Author: Treinador David
 * Author URI: https://treinadordavid.com
 */

if (!defined('ABSPATH')) exit;

class TD_TOC_Plugin {

    // Todas as categorias onde o TOC deve aparecer
    private $enabled_categories = [
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
        add_filter('the_content', [$this, 'add_ids_to_headings'], 10);
        add_filter('the_content', [$this, 'inject_toc'], 20);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    private function should_have_toc() {
        if (!is_single()) return false;
        foreach ($this->enabled_categories as $cat) {
            if (has_category($cat)) return true;
        }
        return false;
    }

    // Adiciona IDs automáticos nos H2 e H3
    public function add_ids_to_headings($content) {
        if (!$this->should_have_toc()) return $content;

        $content = preg_replace_callback(
            '/<(h[23])(?![^>]*id=)([^>]*)>(.*?)<\/h[23]>/i',
            function($m) {
                $tag = $m[1];
                $attrs = $m[2];
                $text = $m[3];
                $id = $this->generate_id($text);
                return "<{$tag} id=\"{$id}\"{$attrs}>{$text}</{$tag}>";
            },
            $content
        );
        return $content;
    }

    private function generate_id($text) {
        $text = strtolower(strip_tags($text));
        $text = iconv('UTF-8','ASCII//TRANSLIT',$text);
        $text = preg_replace('/[^a-z0-9]+/','-',$text);
        return trim($text,'-');
    }

    // Injeta o wrapper com TOC lateral
    public function inject_toc($content) {
        if (!$this->should_have_toc()) return $content;

        $toc = '
        <div class="td-toc-wrapper">
          <div class="td-toc-main-content">'.$content.'</div>
          <aside class="td-toc-sidebar" role="navigation" aria-label="Índice do artigo">
            <div class="td-toc-container">
              <div class="td-toc-header">
                <span class="td-toc-icon">📋</span>
                <h2 class="td-toc-title">Índice do Conteúdo</h2>
              </div>
              <div class="td-toc-search">
                <input type="text" id="tdTocSearchInput" placeholder="🔍 Buscar no índice...">
              </div>
              <ul class="td-toc-list" id="tdTocList"></ul>
              <div class="td-toc-no-results" id="tdTocNoResults">Nenhum resultado encontrado</div>
            </div>
          </aside>
        </div>';
        return $toc;
    }

    public function enqueue_assets() {
        if (!$this->should_have_toc()) return;
        add_action('wp_head', [$this,'print_styles']);
        add_action('wp_footer', [$this,'print_scripts']);
    }

    // CSS inline
    public function print_styles() { ?>
        <style>
        .td-toc-wrapper{display:grid;grid-template-columns:1fr 320px;gap:40px;max-width:1400px;margin:0 auto;padding:0 20px}
        .td-toc-main-content{min-width:0}
        .td-toc-sidebar{position:sticky;top:20px;max-height:calc(100vh - 40px);overflow-y:auto}
        .td-toc-container{background:#fff;border:2px solid #0EA5E9;border-radius:12px;padding:20px;box-shadow:0 4px 12px rgba(14,165,233,.15)}
        .td-toc-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:15px;border-bottom:2px solid #F8FAFC}
        .td-toc-title{font-family:'Oswald',sans-serif;font-size:16px;font-weight:700;color:#0F172A;margin:0;text-transform:uppercase}
        .td-toc-search input{width:100%;padding:10px;border:2px solid #F8FAFC;border-radius:8px;font-size:14px}
        .td-toc-list{list-style:none;padding:0;margin:0}
        .td-toc-item{margin-bottom:8px}
        .td-toc-link{display:block;padding:10px;color:#0F172A;text-decoration:none;border-radius:6px;transition:.2s;font-family:'Inter',sans-serif}
        .td-toc-link:hover{background:#F8FAFC;color:#0EA5E9;padding-left:16px}
        .td-toc-link.h2{font-weight:600;font-size:15px}
        .td-toc-link.h3{padding-left:24px;font-size:13px;color:#475569}
        .td-toc-no-results{display:none;text-align:center;padding:20px;color:#64748B;font-size:14px;font-style:italic}
        .td-toc-no-results.show{display:block}
        .td-toc-item.hidden{display:none}
        @media(max-width:1024px){
          .td-toc-wrapper{grid-template-columns:1fr}
          .td-toc-sidebar{position:static!important;max-height:none!important;margin-top:40px}
        }
        </style>
    <?php }

    // JS inline
    public function print_scripts() { ?>
        <script>
        document.addEventListener("DOMContentLoaded",function(){
          const tocList=document.getElementById("tdTocList");
          const headings=document.querySelectorAll(".td-toc-main-content h2, .td-toc-main-content h3");
          headings.forEach(h=>{
            const li=document.createElement("li");
            li.className="td-toc-item";
            const a=document.createElement("a");
            a.href="#"+h.id;
            a.textContent=h.textContent;
            a.className="td-toc-link "+h.tagName.toLowerCase();
            li.appendChild(a);
            tocList.appendChild(li);
          });
          const search=document.getElementById("tdTocSearchInput");
          const noResults=document.getElementById("tdTocNoResults");
          search.addEventListener("input",function(){
            const term=this.value.toLowerCase();
            let matches=0;
            tocList.querySelectorAll(".td-toc-item").forEach(item=>{
              const link=item.querySelector("a");
              if(link.textContent.toLowerCase().includes(term)){
                item.classList.remove("hidden");matches++;
              }else{item.classList.add("hidden");}
            });
            noResults.classList.toggle("show",matches===0);
          });
          // Smooth scroll
          document.querySelectorAll(".td-toc-link").forEach(link=>{
            link.addEventListener("click",function(e){
              e.preventDefault();
              document.querySelector(this.getAttribute("href"))
                .scrollIntoView({behavior:"smooth"});
            });
          });
        });
        </script>
    <?php }
}

new TD_TOC_Plugin();
