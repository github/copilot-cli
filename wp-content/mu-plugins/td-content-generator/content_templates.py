"""
TD Content Generator - Templates de Conteúdo
Biblioteca de templates para artigos TD-style
"""

# 5 Templates de Introdução
INTRO_TEMPLATES = [
    {
        'name': 'militar_direto',
        'template': """Atenção, recruta!

{hook_question}

Sem rodeios. Sem enrolação. Vou te dar a verdade direta como um soco no estômago.

{topic_intro}"""
    },
    {
        'name': 'pergunta_provocativa',
        'template': """{hook_question}

Se você respondeu sim, então senta que lá vem a verdade.

{topic_intro}

E eu vou te mostrar exatamente como fazer isso."""
    },
    {
        'name': 'confronto_mitos',
        'template': """Deixa eu adivinhar: {common_myth}

ERRADO.

Completamente errado.

{topic_intro}

E hoje você vai aprender a verdade que a indústria fitness não quer que você saiba."""
    },
    {
        'name': 'historia_pessoal',
        'template': """Há alguns anos atrás, eu {personal_story_hook}.

Foi quando eu descobri a verdade sobre {topic}.

{topic_intro}

E hoje vou compartilhar isso com você - sem filtros."""
    },
    {
        'name': 'estatistica_chocante',
        'template': """{shocking_stat}

Assustador, não é?

Mas aqui está a boa notícia: {topic_intro}

Vou te mostrar exatamente como fazer isso. Militarmente."""
    }
]

# 10 Variações do uso de "DEPENDE!"
DEPENDE_VARIATIONS = [
    {
        'context': 'resposta_direta',
        'template': """**DEPENDE!**

E quem te disser o contrário está te enganando.

{explanation}"""
    },
    {
        'context': 'questao_polemica',
        'template': """A resposta? **DEPENDE!**

Depende de {factor_1}. Depende de {factor_2}. Depende de {factor_3}.

{detailed_explanation}"""
    },
    {
        'context': 'desmistificacao',
        'template': """Todos querem uma resposta simples. Mas a verdade é: **DEPENDE!**

{context_explanation}

Entendeu porque não existe bala de prata?"""
    },
    {
        'context': 'tecnica_treino',
        'template': """"{question}"

**DEPENDE!** Do seu nível de treino, da sua genética, da sua nutrição...

{technical_explanation}"""
    },
    {
        'context': 'nutricao',
        'template': """A galera adora perguntar: {nutrition_question}

Minha resposta? **DEPENDE!**

{nutrition_context}

Viu como não é preto no branco?"""
    },
    {
        'context': 'enfatico',
        'template': """**D-E-P-E-N-D-E!**

Grava isso na tua cabeça.

{emphasis_explanation}

Não existe fórmula mágica, recruta."""
    },
    {
        'context': 'cientifico',
        'template': """Os estudos mostram que... **DEPENDE!**

{scientific_context}

A ciência é clara: contexto importa."""
    },
    {
        'context': 'comparativo',
        'template': """"{option_a} ou {option_b}?"

**DEPENDE!** De {comparison_factors}.

{comparison_explanation}

Ambos funcionam - no contexto certo."""
    },
    {
        'context': 'iniciante_avancado',
        'template': """Para iniciantes? **DEPENDE!**
Para avançados? **DEPENDE!**

{level_based_explanation}

Viu como o contexto muda tudo?"""
    },
    {
        'context': 'provocativo',
        'template': """Quer que eu te diga o que fazer?

**DEPENDE!**

Porque eu não te conheço, não conheço teu histórico, não sei teus objetivos.

{provocative_explanation}

Acordou para a realidade?"""
    }
]

# Biblioteca de Transições Militares
MILITARY_TRANSITIONS = [
    "Agora presta atenção, recruta:",
    "Ordem do dia:",
    "Missão clara:",
    "Briefing rápido:",
    "Vamos direto ao ponto:",
    "Sem enrolação:",
    "Firme e forte:",
    "Na disciplina:",
    "Tático e direto:",
    "Foco na missão:",
    "Estratégia definida:",
    "Posição de combate:",
    "Preparado para a batalha?",
    "Vamos para o campo:",
    "Execução perfeita:",
    "Semper Fidelis:",
    "Com honra e disciplina:",
    "Treino de elite:",
    "Operação em andamento:",
    "Comando direto:"
]

# 20 CTAs de Conversão Variados
CTA_TEMPLATES = [
    {
        'type': 'programa_foca',
        'title': 'Quer Resultados de Verdade?',
        'content': """Se você quer transformar teu corpo como um soldado transforma sua vida no campo de treino, então o **Programa de Foca** é para ti.

Treino militar adaptado. Nutrição estratégica. Mentalidade de elite.

[CLICA AQUI e começa tua transformação](https://treinadordavid.pt/programa-de-foca)"""
    },
    {
        'type': 'consultoria',
        'title': 'Consultoria Personalizada',
        'content': """Chega de seguir programas genéricos que não funcionam para ti.

Consultoria 1-on-1 com o Treinador David. Programa personalizado. Acompanhamento direto.

[AGENDA TUA CONSULTA GRATUITA](https://treinadordavid.pt/consultoria)"""
    },
    {
        'type': 'ebook_gratis',
        'title': 'eBook Grátis: Treino Militar',
        'content': """Baixa GRÁTIS o meu eBook "Treino Militar: 30 Dias de Transformação"

✓ Plano de treino completo
✓ Guia de nutrição tática
✓ Mentalidade de guerreiro

[BAIXA GRÁTIS AGORA](https://treinadordavid.pt/ebook-treino-militar)"""
    },
    {
        'type': 'desafio_30_dias',
        'title': 'Desafio 30 Dias TD',
        'content': """30 dias. 30 treinos. 1 objetivo: TRANSFORMAÇÃO TOTAL.

Entra no Desafio 30 Dias TD e vê o que teu corpo é capaz de fazer.

[ACEITO O DESAFIO](https://treinadordavid.pt/desafio-30-dias)"""
    },
    {
        'type': 'comunidade',
        'title': 'Comunidade TD Elite',
        'content': """Não treina sozinho. Junta-te à Comunidade TD Elite.

Centenas de guerreiros treinando juntos. Suporte 24/7. Motivação diária.

[QUERO FAZER PARTE](https://treinadordavid.pt/comunidade)"""
    },
    {
        'type': 'app_mobile',
        'title': 'App TD Fitness',
        'content': """Leva o Treinador David no teu bolso.

App TD Fitness: Treinos. Nutrição. Tracking. Tudo num lugar só.

[BAIXA O APP GRÁTIS](https://treinadordavid.pt/app)"""
    },
    {
        'type': 'urgencia',
        'title': 'Vagas Limitadas',
        'content': """⚠️ ATENÇÃO: Apenas 20 vagas disponíveis para o próximo grupo.

O Programa de Foca começa em {data_inicio} e as vagas estão acabando.

[GARANTE TUA VAGA AGORA](https://treinadordavid.pt/vagas-limitadas)"""
    },
    {
        'type': 'transformacao',
        'title': 'Vê as Transformações',
        'content': """Não acredita em mim? Acredita nos resultados.

Centenas de transformações reais. Pessoas reais. Resultados reais.

[VER TRANSFORMAÇÕES](https://treinadordavid.pt/transformacoes)"""
    },
    {
        'type': 'newsletter',
        'title': 'Newsletter TD Weekly',
        'content': """Recebe toda semana:
✓ Dicas de treino táticas
✓ Receitas fitness de combate
✓ Mentalidade de guerreiro
✓ Ofertas exclusivas

[INSCREVE-TE GRÁTIS](https://treinadordavid.pt/newsletter)"""
    },
    {
        'type': 'video_gratis',
        'title': 'Vídeo-Aula Gratuita',
        'content': """Assiste AGORA: "Os 5 Erros Que Estão Sabotando Teu Progresso"

Vídeo-aula de 45 minutos. Conteúdo exclusivo. Zero enrolação.

[ASSISTIR AGORA](https://treinadordavid.pt/video-5-erros)"""
    },
    {
        'type': 'quiz',
        'title': 'Descobre Teu Perfil de Treino',
        'content': """Faz o Quiz TD e descobre qual programa de treino é perfeito para ti.

2 minutos. Resultado instantâneo. Programa personalizado.

[FAZER O QUIZ](https://treinadordavid.pt/quiz)"""
    },
    {
        'type': 'masterclass',
        'title': 'Masterclass Gratuita',
        'content': """📅 Masterclass AO VIVO: "Construindo Músculo Depois dos 30"

Data: {data_masterclass}
Hora: 20h (Horário Lisboa)
100% Gratuito

[RESERVA TUA VAGA](https://treinadordavid.pt/masterclass)"""
    },
    {
        'type': 'garantia',
        'title': 'Garantia de 30 Dias',
        'content': """Sem risco. Sem pegadinha.

30 dias de garantia total. Se não ficares satisfeito, devolvo teu dinheiro.

[COMEÇA SEM RISCO](https://treinadordavid.pt/garantia)"""
    },
    {
        'type': 'social_proof',
        'title': '5.000+ Transformações',
        'content': """Mais de 5.000 pessoas já transformaram seus corpos com o método TD.

⭐⭐⭐⭐⭐ 4.9/5.0 - Baseado em 1.247 avaliações

[VER DEPOIMENTOS REAIS](https://treinadordavid.pt/depoimentos)"""
    },
    {
        'type': 'bonus',
        'title': 'Bônus Exclusivos',
        'content': """Entra HOJE e recebe:
🎁 Programa de Mobilidade Militar (€47)
🎁 Guia de Suplementação Tática (€27)
🎁 30 Receitas Fitness de Combate (€17)

TOTAL: €91 em bônus GRÁTIS

[QUERO OS BÔNUS](https://treinadordavid.pt/bonus)"""
    },
    {
        'type': 'case_study',
        'title': 'Case Study: João Pedro',
        'content': """João Pedro, 34 anos, perdeu 18kg em 90 dias.

Lê a história completa de como ele saiu de sedentário para atleta.

[LER CASE STUDY](https://treinadordavid.pt/case-joao-pedro)"""
    },
    {
        'type': 'whatsapp',
        'title': 'Suporte Direto WhatsApp',
        'content': """Tem dúvidas? Fala direto comigo no WhatsApp.

Suporte personalizado. Resposta rápida. Zero burocracia.

[CHAMAR NO WHATSAPP](https://wa.me/351XXXXXXXXX)"""
    },
    {
        'type': 'metodo_td',
        'title': 'Método TD Completo',
        'content': """O sistema completo de treino, nutrição e mentalidade que já transformou milhares.

Treino Militar + Nutrição Tática + Mindset de Elite = RESULTADOS GARANTIDOS

[CONHECER O MÉTODO](https://treinadordavid.pt/metodo-td)"""
    },
    {
        'type': 'comparacao',
        'title': 'TD vs Academias Tradicionais',
        'content': """Personal trainer tradicional: €300-500/mês
Academia convencional: €50-80/mês + Sem resultados

Método TD: Resultados comprovados. Custo-benefício imbatível.

[VER COMPARAÇÃO COMPLETA](https://treinadordavid.pt/comparacao)"""
    },
    {
        'type': 'inicio_rapido',
        'title': 'Começa em 5 Minutos',
        'content': """1. Clica no link
2. Preenche os dados
3. Recebe acesso imediato
4. Começa tua transformação HOJE

[COMEÇAR AGORA](https://treinadordavid.pt/comecar)"""
    }
]

# Estruturas para diferentes tópicos
TOPIC_STRUCTURES = {
    'treino': {
        'sections': [
            'Introdução com hook militar',
            'O Problema (mitos comuns)',
            'A Ciência Por Trás (estudos)',
            'O Método TD (solução)',
            'Execução Prática (passo a passo)',
            'Erros Comuns (avisos)',
            'Progressão (próximos passos)',
            'CTA Final'
        ],
        'keywords': ['treino', 'exercício', 'músculo', 'força', 'hipertrofia']
    },
    'nutricao': {
        'sections': [
            'Introdução provocativa',
            'Mitos da Nutrição',
            'Ciência da Nutrição (estudos)',
            'Estratégia Nutricional TD',
            'Plano Prático',
            'Suplementação (se necessário)',
            'Erros Fatais',
            'CTA Final'
        ],
        'keywords': ['nutrição', 'dieta', 'proteína', 'calorias', 'macros']
    },
    'motivacao': {
        'sections': [
            'História/Situação Real',
            'O Obstáculo Mental',
            'Mentalidade Militar',
            'Estratégias Práticas',
            'Ação Imediata',
            'Disciplina vs Motivação',
            'Compromisso',
            'CTA Final'
        ],
        'keywords': ['motivação', 'disciplina', 'mentalidade', 'foco', 'persistência']
    },
    'ciencia': {
        'sections': [
            'Introdução com Questão Científica',
            'O Que a Ciência Diz',
            'Estudos Relevantes',
            'Interpretação Prática',
            'Aplicação no Treino',
            'Variáveis Individuais',
            'Conclusão Científica',
            'CTA Final'
        ],
        'keywords': ['estudo', 'pesquisa', 'ciência', 'evidência', 'dados']
    },
    'transformacao': {
        'sections': [
            'A História (antes)',
            'O Ponto de Virada',
            'O Processo',
            'Obstáculos Vencidos',
            'Resultados',
            'Lições Aprendidas',
            'Como Você Pode Fazer Também',
            'CTA Final'
        ],
        'keywords': ['transformação', 'resultado', 'antes e depois', 'mudança', 'progresso']
    }
}

# Biblioteca de estudos/citações científicas
SCIENTIFIC_REFERENCES = [
    {
        'topic': 'hipertrofia',
        'study': 'Schoenfeld et al., 2017',
        'finding': 'A hipertrofia muscular pode ser alcançada com uma ampla faixa de repetições (6-20), desde que o treino seja realizado próximo à falha muscular.'
    },
    {
        'topic': 'proteina',
        'study': 'Morton et al., 2018',
        'finding': 'A ingestão ideal de proteína para maximizar ganhos de massa muscular é aproximadamente 1.6g/kg de peso corporal por dia.'
    },
    {
        'topic': 'frequencia_treino',
        'study': 'Schoenfeld et al., 2019',
        'finding': 'Treinar cada grupo muscular 2x por semana resulta em maiores ganhos de massa muscular comparado a 1x por semana.'
    },
    {
        'topic': 'cardio_musculo',
        'study': 'Wilson et al., 2012',
        'finding': 'O efeito de interferência do cardio no ganho muscular é minimizado quando feito em sessões separadas do treino de força.'
    },
    {
        'topic': 'descanso',
        'study': 'Schoenfeld et al., 2016',
        'finding': 'Intervalos de descanso mais longos (2-3 minutos) promovem maiores ganhos de força e massa muscular comparados a intervalos curtos.'
    },
    {
        'topic': 'tempo_sob_tensao',
        'study': 'Burd et al., 2012',
        'finding': 'O tempo sob tensão por si só não é o fator determinante para hipertrofia; a carga e proximidade da falha são mais importantes.'
    },
    {
        'topic': 'jejum',
        'study': 'Tinsley & La Bounty, 2015',
        'finding': 'O jejum intermitente pode ser eficaz para perda de gordura, mas não oferece vantagens metabólicas superiores à restrição calórica contínua.'
    },
    {
        'topic': 'suplementos_creatina',
        'study': 'Kreider et al., 2017',
        'finding': 'A creatina monohidratada é o suplemento mais eficaz para aumentar força e massa muscular, com dosagem de 3-5g/dia.'
    }
]

# Frases de assinatura
SIGNATURE_VARIATIONS = [
    "Semper Fidelis - Treinador David",
    "Sempre Fiel ao Processo - Treinador David",
    "Disciplina é Liberdade - Treinador David",
    "Treino. Disciplina. Resultados. - Treinador David",
    "Semper Fi - TD"
]
