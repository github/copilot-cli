<?php
/**
 * Plugin Name: TD Content Generator
 * Description: Gerador automático de artigos TD-style com SEO
 * Version: 1.0
 * Author: Treinador David
 */

class TD_Content_Generator {

    private $templates = [
        'erros' => [
            'title_pattern' => '{numero} Erros Que Estão Sabotando Seu {objetivo}',
            'keywords' => ['erros', 'como', 'guia'],
        ],
        'como_fazer' => [
            'title_pattern' => 'Como {acao} em {tempo} (Método Comprovado)',
            'keywords' => ['como', 'passo a passo', 'guia'],
        ],
        'comparacao' => [
            'title_pattern' => '{opcao_a} vs {opcao_b}: Qual é Melhor?',
            'keywords' => ['vs', 'comparação', 'melhor'],
        ],
        'verdade' => [
            'title_pattern' => 'A Verdade Sobre {mito}: Funciona ou é Mentira?',
            'keywords' => ['verdade', 'funciona', 'mito'],
        ],
        'guia' => [
            'title_pattern' => 'Guia Completo de {topico}: Tudo Que Você Precisa Saber',
            'keywords' => ['guia', 'completo', 'iniciantes'],
        ],
    ];

    private $objetivos = [
        'emagrecer' => ['resultado' => 'emagrece', 'cta' => 'group'],
        'ganhar massa' => ['resultado' => 'ganha músculo', 'cta' => 'personal'],
        'definir abdômen' => ['resultado' => 'vê resultados', 'cta' => 'desafio'],
        'melhorar condicionamento' => ['resultado' => 'melhora', 'cta' => 'group'],
    ];

    private $ctas = [
        'group' => [
            'text' => 'Quer estrutura e comunidade para alcançar esse objetivo? Conheça o Programa Online Group.',
            'link' => '/programa-online-group',
            'button' => 'ENTRAR NO PELOTÃO - R$ 97/mês',
        ],
        'personal' => [
            'text' => 'Quer programa 100% personalizado para esse objetivo? Agende consultoria gratuita.',
            'link' => '/consultoria-personal-training',
            'button' => 'AGENDAR CONSULTORIA GRATUITA',
        ],
        'desafio' => [
            'text' => 'Quer resultados rápidos com programa intensivo de 30 dias? Aceite o desafio.',
            'link' => '/desafio-30-dias-abs',
            'button' => 'ACEITAR DESAFIO - R$ 197',
        ],
    ];

    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('wp_ajax_generate_article', [$this, 'generate_article_ajax']);
    }

    public function add_admin_menu() {
        add_menu_page(
            'TD Content Generator',
            'TD Generator',
            'manage_options',
            'td-content-generator',
            [$this, 'render_admin_page'],
            'dashicons-edit',
            30
        );
    }

    public function render_admin_page() {
        ?>
        <div class="wrap">
            <h1>TD Content Generator</h1>
            <form id="td-generator-form">
                <table class="form-table">
                    <tr>
                        <th>Template</th>
                        <td>
                            <select name="template" id="template">
                                <option value="erros">X Erros Que Sabotam</option>
                                <option value="como_fazer">Como Fazer X em Y</option>
                                <option value="comparacao">X vs Y</option>
                                <option value="verdade">Verdade Sobre X</option>
                                <option value="guia">Guia Completo</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>Objetivo</th>
                        <td>
                            <select name="objetivo" id="objetivo">
                                <option value="emagrecer">Emagrecer</option>
                                <option value="ganhar massa">Ganhar Massa</option>
                                <option value="definir abdômen">Definir Abdômen</option>
                                <option value="melhorar condicionamento">Condicionamento</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>Keyword Principal</th>
                        <td><input type="text" name="keyword" id="keyword" class="regular-text" /></td>
                    </tr>
                </table>
                <p class="submit">
                    <button type="submit" class="button button-primary">Gerar Artigo</button>
                </p>
            </form>
            <div id="result"></div>
        </div>
        <script>
        jQuery(document).ready(function($) {
            $('#td-generator-form').on('submit', function(e) {
                e.preventDefault();
                $.post(ajaxurl, {
                    action: 'generate_article',
                    data: $(this).serialize()
                }, function(response) {
                    $('#result').html(response);
                });
            });
        });
        </script>
        <?php
    }

    public function generate_article_ajax() {
        parse_str($_POST['data'], $data);

        $article = $this->generate_article(
            $data['template'],
            $data['objetivo'],
            $data['keyword']
        );

        // Criar post no WordPress
        $post_id = wp_insert_post([
            'post_title' => $article['title'],
            'post_content' => $article['content'],
            'post_status' => 'draft',
            'post_type' => 'post',
            'post_category' => [1], // Ajustar categoria
        ]);

        // Adicionar SEO meta (Yoast/RankMath)
        update_post_meta($post_id, '_yoast_wpseo_title', $article['seo_title']);
        update_post_meta($post_id, '_yoast_wpseo_metadesc', $article['seo_description']);
        update_post_meta($post_id, '_yoast_wpseo_focuskw', $data['keyword']);

        echo "Artigo criado com sucesso! <a href='" . get_edit_post_link($post_id) . "'>Editar</a>";
        wp_die();
    }

    private function generate_article($template, $objetivo, $keyword) {
        $obj_data = $this->objetivos[$objetivo];
        $cta_data = $this->ctas[$obj_data['cta']];

        // Título
        $title = $this->fill_template_title($template, $objetivo, $keyword);

        // Conteúdo
        $content = $this->build_article_content($template, $objetivo, $keyword, $cta_data);

        return [
            'title' => $title,
            'content' => $content,
            'seo_title' => substr($title, 0, 60),
            'seo_description' => $this->generate_meta_description($title, $objetivo),
        ];
    }

    private function fill_template_title($template, $objetivo, $keyword) {
        $patterns = [
            'erros' => "7 Erros Fatais Que Estão Sabotando Seu $objetivo",
            'como_fazer' => "Como $keyword em 60 Dias (Método Comprovado)",
            'comparacao' => "$keyword: Qual é Melhor Para $objetivo?",
            'verdade' => "A Verdade Sobre $keyword: Funciona Mesmo?",
            'guia' => "Guia Completo de $keyword Para $objetivo",
        ];

        return $patterns[$template] ?? $keyword;
    }

    private function build_article_content($template, $objetivo, $keyword, $cta) {
        $intro = $this->generate_intro($objetivo);
        $body = $this->generate_body($template, $objetivo, $keyword);
        $conclusion = $this->generate_conclusion($objetivo, $cta);

        return "
        <div class='td-article'>
            <div class='intro'>$intro</div>
            <div class='body'>$body</div>
            <div class='conclusion'>$conclusion</div>
            <div class='signature'>
                <p style='font-family: Oswald; font-size: 18px; color: #0EA5E9;'>
                    Semper Fidelis<br>— Treinador David
                </p>
            </div>
        </div>
        ";
    }

    private function generate_intro($objetivo) {
        return "
        <p>Você treina mas não consegue " . $this->objetivos[$objetivo]['resultado'] . "?</p>
        <p><strong>DEPENDE!</strong></p>
        <p>Provavelmente está cometendo erros que sabotam seus resultados.</p>
        <p>(Vejo isso TODO DIA na academia)</p>
        ";
    }

    private function generate_body($template, $objetivo, $keyword) {
        // Aqui você pode expandir com conteúdo específico para cada template
        // Por simplicidade, exemplo básico:
        return "
        <h2>O QUE VOCÊ PRECISA SABER</h2>
        <p>Conteúdo sobre $keyword e como isso afeta $objetivo...</p>

        <h2>ERRO COMUM #1</h2>
        <p>Primeiro erro que as pessoas cometem...</p>

        <h2>COMO CORRIGIR</h2>
        <p>Passo a passo para resolver...</p>

        <h2>RESULTADO ESPERADO</h2>
        <p>O que você pode esperar fazendo certo...</p>
        ";
    }

    private function generate_conclusion($objetivo, $cta) {
        return "
        <p><strong>DEPENDE! De você aplicar o que aprendeu.</strong></p>
        <p>{$cta['text']}</p>
        <p style='text-align: center;'>
            <a href='{$cta['link']}' class='button-cta' style='background: #0EA5E9; color: #FFFFFF; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Oswald; font-size: 18px;'>
                {$cta['button']}
            </a>
        </p>
        ";
    }

    private function generate_meta_description($title, $objetivo) {
        return "Descubra como " . $objetivo . ". Método testado por 30 anos. Ex-USMC. Zero enrolação, só resultados. Leia agora.";
    }
}

new TD_Content_Generator();
