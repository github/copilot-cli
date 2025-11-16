#!/usr/bin/env python3
"""
Script to create all 48 landing pages for TD Fitness
Based on the example templates
"""

import os

BASE_DIR = "/home/user/2026-website/mega-landing-pages"

# HTML template function
def create_page(config):
    """Create a complete landing page HTML file"""
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{config['meta_desc']}">
    <title>{config['title']} | TD Fitness - Treinador David</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Oswald:wght@700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../shared-styles.css">
</head>
<body>
    <section class="hero" id="hero">
        <video class="hero-video-bg" autoplay muted loop playsinline>
            <source src="{config['video_src']}" type="video/mp4">
        </video>
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <div class="container">
                <h1 class="hero-headline">
                    {config['headline']}<br>
                    <span class="text-highlight">{config['subheadline']}</span>
                </h1>
                <p class="hero-subheadline">{config['hero_text']}</p>
                <div class="mt-3">
                    <a href="#formulario" class="btn btn-primary btn-large">{config['cta_primary']}</a>
                    <a href="#solucao" class="btn btn-secondary btn-large">{config['cta_secondary']}</a>
                </div>
                <div class="mt-4">
                    <p class="text-uppercase mb-2" style="color: var(--td-white); font-weight: 600;">⏰ {config['countdown_text']}</p>
                    <div id="countdown" class="countdown"></div>
                </div>
            </div>
        </div>
    </section>

    <section class="pain-points" id="problemas">
        <div class="container">
            <h2 class="text-center mb-4">{config['pain_title']}</h2>
            <div class="grid-2">
                {config['pain_points']}
            </div>
        </div>
    </section>

    <section class="section section-dark" id="solucao">
        <div class="container">
            <h2 class="text-center mb-2">{config['solution_title']}</h2>
            <p class="text-center text-highlight mb-4" style="font-size: 1.25rem;">{config['solution_subtitle']}</p>
            <div class="grid-2 mt-4">
                <div>
                    <h3 class="mb-3">O QUE ESTÁ INCLUÍDO:</h3>
                    <ul style="list-style: none; padding: 0;">
                        {config['includes']}
                    </ul>
                </div>
                <div>
                    <div class="card card-blue">
                        {config['methodology']}
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="section" id="beneficios">
        <div class="container">
            <h2 class="text-center mb-4">{config['benefits_title']}</h2>
            <div class="benefits-grid">
                {config['benefits']}
            </div>
        </div>
    </section>

    <section class="section section-light" id="depoimentos">
        <div class="container">
            <h2 class="text-center mb-4">{config['testimonials_title']}</h2>
            <div class="grid-3">
                {config['testimonials']}
            </div>
        </div>
    </section>

    <section class="section section-dark" id="sobre">
        <div class="container">
            <h2 class="text-center mb-4">{config['about_title']}</h2>
            <div class="about-trainer">
                <div>
                    <img src="https://via.placeholder.com/400x500/0B1220/0EA5E9?text=TD" alt="Treinador David" class="trainer-image">
                </div>
                <div>
                    {config['about_content']}
                </div>
            </div>
        </div>
    </section>

    <section class="section" id="faq">
        <div class="container">
            <h2 class="text-center mb-4">PERGUNTAS FREQUENTES</h2>
            <div class="faq-container">
                {config['faqs']}
            </div>
        </div>
    </section>

    <section class="section section-blue" id="investimento">
        <div class="container">
            <h2 class="text-center mb-2">{config['pricing_title']}</h2>
            <p class="text-center mb-4" style="font-size: 1.25rem;">{config['pricing_subtitle']}</p>
            {config['pricing_content']}
            <div class="guarantee mt-4" style="background-color: rgba(255,255,255,0.1);">
                <div class="guarantee-icon">🛡️</div>
                <div class="guarantee-text">
                    <h4 style="color: white; margin-bottom: 0.5rem;">{config['guarantee_title']}</h4>
                    <p style="color: white; opacity: 0.9; margin: 0;">{config['guarantee_text']}</p>
                </div>
            </div>
        </div>
    </section>

    <section class="section section-dark" id="formulario">
        <div class="container container-narrow">
            <h2 class="text-center mb-2">{config['form_title']}</h2>
            <p class="text-center mb-4" style="font-size: 1.125rem;">{config['form_subtitle']}</p>
            <form id="lead-form" class="card" style="max-width: 600px; margin: 0 auto;">
                {config['form_fields']}
                <button type="submit" class="btn btn-primary btn-large btn-block">
                    {config['form_button']}
                </button>
                <p class="text-center mt-2" style="font-size: 0.875rem; color: var(--td-gray-medium);">
                    🔒 {config['form_privacy']}
                </p>
            </form>
        </div>
    </section>

    <section class="section section-blue">
        <div class="container text-center">
            <h2 class="mb-3">{config['final_cta_title']}</h2>
            <p class="mb-4" style="font-size: 1.25rem;">{config['final_cta_text']}</p>
            <a href="#formulario" class="btn btn-dark btn-large">{config['final_cta_button']}</a>
        </div>
    </section>

    <script src="../../shared-scripts.js"></script>
</body>
</html>"""

# Helper functions for common HTML elements
def pain_point(icon, title, text):
    return f'''                <div class="pain-point-item">
                    <span class="pain-point-icon">{icon}</span>
                    <div>
                        <h4>{title}</h4>
                        <p>{text}</p>
                    </div>
                </div>'''

def benefit(icon, title, text):
    return f'''                <div class="benefit-card card">
                    <div class="benefit-icon">{icon}</div>
                    <h4>{title}</h4>
                    <p>{text}</p>
                </div>'''

def testimonial(quote, initials, name, role):
    return f'''                <div class="testimonial">
                    <p class="testimonial-quote">"{quote}"</p>
                    <div class="testimonial-author">
                        <div class="testimonial-avatar">{initials}</div>
                        <div>
                            <div class="testimonial-name">{name}</div>
                            <div class="testimonial-role">{role}</div>
                        </div>
                    </div>
                </div>'''

def faq(question, answer):
    return f'''                <div class="faq-item">
                    <div class="faq-question">{question} <span>+</span></div>
                    <div class="faq-answer">{answer}</div>
                </div>'''

def include_item(text):
    return f'                        <li class="mb-2">✓ {text}</li>'

def form_field_text(id, label, placeholder, required=True):
    req = ' required' if required else ''
    return f'''                <div class="form-group">
                    <label for="{id}" class="form-label">{label}{"*" if required else ""}</label>
                    <input type="text" id="{id}" name="{id}" class="form-input"{req} placeholder="{placeholder}">
                </div>'''

def form_field_email(id, label, placeholder="seu@email.com", required=True):
    req = ' required' if required else ''
    return f'''                <div class="form-group">
                    <label for="{id}" class="form-label">{label}{"*" if required else ""}</label>
                    <input type="email" id="{id}" name="{id}" class="form-input"{req} placeholder="{placeholder}">
                </div>'''

def form_field_tel(id, label, placeholder="(11) 99999-9999", required=True):
    req = ' required' if required else ''
    return f'''                <div class="form-group">
                    <label for="{id}" class="form-label">{label}{"*" if required else ""}</label>
                    <input type="tel" id="{id}" name="{id}" class="form-input"{req} placeholder="{placeholder}">
                </div>'''

def form_field_select(id, label, options, required=True):
    req = ' required' if required else ''
    opts = '\n'.join([f'                        <option value="{val}">{text}</option>' for val, text in options])
    return f'''                <div class="form-group">
                    <label for="{id}" class="form-label">{label}{"*" if required else ""}</label>
                    <select id="{id}" name="{id}" class="form-select"{req}>
                        <option value="">Selecione...</option>
{opts}
                    </select>
                </div>'''

def form_field_textarea(id, label, placeholder, required=False):
    req = ' required' if required else ''
    return f'''                <div class="form-group">
                    <label for="{id}" class="form-label">{label}{"*" if required else ""}</label>
                    <textarea id="{id}" name="{id}" class="form-textarea"{req} placeholder="{placeholder}"></textarea>
                </div>'''

# Standard form fields
standard_form = f'''{form_field_text("name", "Nome Completo", "Seu nome")}
{form_field_email("email", "Email")}
{form_field_tel("whatsapp", "WhatsApp")}
{form_field_select("goal", "Objetivo Principal", [
    ("emagrecimento", "Emagrecimento"),
    ("hipertrofia", "Ganhar Massa Muscular"),
    ("forca", "Ganhar Força"),
    ("condicionamento", "Melhorar Condicionamento"),
    ("saude", "Saúde e Qualidade de Vida")
])}
{form_field_textarea("message", "Conte mais sobre você", "Objetivos, limitações, expectativas...")}'''

print("Page generation script ready. Use create_page(config) to generate HTML.")
