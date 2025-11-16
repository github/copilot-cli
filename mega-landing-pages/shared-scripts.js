/**
 * TD FITNESS - SHARED LANDING PAGE SCRIPTS
 * Countdown Timer, Form Handling, Smooth Scroll, Analytics
 */

// Countdown Timer
class CountdownTimer {
    constructor(elementId, endDate) {
        this.element = document.getElementById(elementId);
        this.endDate = new Date(endDate).getTime();
        this.init();
    }

    init() {
        this.update();
        this.interval = setInterval(() => this.update(), 1000);
    }

    update() {
        const now = new Date().getTime();
        const distance = this.endDate - now;

        if (distance < 0) {
            clearInterval(this.interval);
            this.element.innerHTML = '<p class="text-highlight">OFERTA ENCERRADA!</p>';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        this.element.innerHTML = `
            <div class="countdown-item">
                <span class="countdown-value">${this.pad(days)}</span>
                <span class="countdown-label">Dias</span>
            </div>
            <div class="countdown-item">
                <span class="countdown-value">${this.pad(hours)}</span>
                <span class="countdown-label">Horas</span>
            </div>
            <div class="countdown-item">
                <span class="countdown-value">${this.pad(minutes)}</span>
                <span class="countdown-label">Min</span>
            </div>
            <div class="countdown-item">
                <span class="countdown-value">${this.pad(seconds)}</span>
                <span class="countdown-label">Seg</span>
            </div>
        `;
    }

    pad(num) {
        return num < 10 ? '0' + num : num;
    }
}

// Form Handler
class FormHandler {
    constructor(formId, options = {}) {
        this.form = document.getElementById(formId);
        this.options = {
            redirectUrl: options.redirectUrl || '/obrigado',
            webhookUrl: options.webhookUrl || null,
            ...options
        };
        this.init();
    }

    init() {
        if (!this.form) return;

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);

        // Validation
        if (!this.validate(data)) {
            return;
        }

        // Show loading state
        const submitBtn = this.form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'ENVIANDO...';
        submitBtn.disabled = true;

        try {
            // Send to webhook if configured
            if (this.options.webhookUrl) {
                await this.sendToWebhook(data);
            }

            // Store in localStorage
            this.storeLocally(data);

            // Track event
            this.trackConversion(data);

            // Redirect or show success
            if (this.options.redirectUrl) {
                window.location.href = `${this.options.redirectUrl}?email=${encodeURIComponent(data.email)}`;
            } else {
                this.showSuccess();
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.showError('Erro ao enviar. Tente novamente.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    validate(data) {
        // Name validation
        if (!data.name || data.name.trim().length < 2) {
            this.showError('Por favor, insira seu nome completo.');
            return false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!data.email || !emailRegex.test(data.email)) {
            this.showError('Por favor, insira um email válido.');
            return false;
        }

        // WhatsApp validation (Brazilian format)
        if (data.whatsapp) {
            const phoneRegex = /^[\d\s\(\)\-\+]+$/;
            if (!phoneRegex.test(data.whatsapp) || data.whatsapp.replace(/\D/g, '').length < 10) {
                this.showError('Por favor, insira um WhatsApp válido.');
                return false;
            }
        }

        return true;
    }

    async sendToWebhook(data) {
        if (!this.options.webhookUrl) return;

        const response = await fetch(this.options.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...data,
                timestamp: new Date().toISOString(),
                source: window.location.href,
                userAgent: navigator.userAgent
            })
        });

        if (!response.ok) {
            throw new Error('Webhook failed');
        }

        return response.json();
    }

    storeLocally(data) {
        try {
            const leads = JSON.parse(localStorage.getItem('td_leads') || '[]');
            leads.push({
                ...data,
                timestamp: new Date().toISOString(),
                page: window.location.href
            });
            localStorage.setItem('td_leads', JSON.stringify(leads));
        } catch (error) {
            console.error('LocalStorage error:', error);
        }
    }

    trackConversion(data) {
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'send_to': 'AW-CONVERSION_ID',
                'value': 1.0,
                'currency': 'BRL',
                'event_category': 'Lead',
                'event_label': data.email
            });
        }

        // Facebook Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', 'Lead', {
                content_name: document.title,
                content_category: 'Landing Page',
                value: 1.0,
                currency: 'BRL'
            });
        }

        // Meta Pixel (alternative)
        if (typeof Meta !== 'undefined' && Meta.pixel) {
            Meta.pixel('track', 'Lead');
        }
    }

    showSuccess() {
        const successMsg = document.createElement('div');
        successMsg.className = 'alert alert-success';
        successMsg.innerHTML = `
            <h3>✓ INSCRITO COM SUCESSO!</h3>
            <p>Verifique seu email para próximos passos.</p>
        `;
        this.form.replaceWith(successMsg);
    }

    showError(message) {
        let errorDiv = this.form.querySelector('.form-error');

        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            this.form.insertBefore(errorDiv, this.form.firstChild);
        }

        errorDiv.innerHTML = `
            <p style="color: #EF4444; padding: 1rem; background: #FEE2E2; border-radius: 8px; margin-bottom: 1rem;">
                ⚠ ${message}
            </p>
        `;

        setTimeout(() => {
            errorDiv.style.opacity = '0';
            setTimeout(() => errorDiv.remove(), 300);
        }, 5000);
    }
}

// Smooth Scroll
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// FAQ Accordion
function initFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            const answer = item.querySelector('.faq-answer');
            const isOpen = item.classList.contains('active');

            // Close all
            document.querySelectorAll('.faq-item').forEach(i => {
                i.classList.remove('active');
                i.querySelector('.faq-answer').style.display = 'none';
            });

            // Open clicked if it was closed
            if (!isOpen) {
                item.classList.add('active');
                answer.style.display = 'block';
            }
        });
    });
}

// Scroll Animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.card, .benefit-card, .testimonial, .pricing-card').forEach(el => {
        observer.observe(el);
    });
}

// Video Background
function initVideoBackground() {
    const video = document.querySelector('.hero-video-bg');
    if (video) {
        video.play().catch(err => {
            console.log('Video autoplay failed:', err);
        });
    }
}

// CTA Click Tracking
function trackCTAClicks() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ctaText = btn.textContent.trim();
            const ctaPosition = btn.closest('section')?.id || 'unknown';

            // Google Analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'cta_click', {
                    'event_category': 'CTA',
                    'event_label': ctaText,
                    'value': ctaPosition
                });
            }

            // Facebook Pixel
            if (typeof fbq !== 'undefined') {
                fbq('trackCustom', 'CTAClick', {
                    button_text: ctaText,
                    position: ctaPosition
                });
            }
        });
    });
}

// WhatsApp Link Handler
function initWhatsAppLinks() {
    document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(link => {
        link.addEventListener('click', () => {
            // Track WhatsApp clicks
            if (typeof gtag !== 'undefined') {
                gtag('event', 'whatsapp_click', {
                    'event_category': 'Contact',
                    'event_label': 'WhatsApp'
                });
            }
        });
    });
}

// Exit Intent Popup
function initExitIntent(callback) {
    let shown = false;

    document.addEventListener('mouseout', (e) => {
        if (shown) return;
        if (e.clientY < 0) {
            shown = true;
            callback();
        }
    });
}

// Session Timer
function trackSessionTime() {
    const startTime = Date.now();

    window.addEventListener('beforeunload', () => {
        const sessionTime = Math.round((Date.now() - startTime) / 1000);

        if (typeof gtag !== 'undefined') {
            gtag('event', 'session_time', {
                'event_category': 'Engagement',
                'value': sessionTime
            });
        }
    });
}

// Scroll Depth Tracking
function trackScrollDepth() {
    let maxScroll = 0;
    const milestones = [25, 50, 75, 100];
    const tracked = new Set();

    window.addEventListener('scroll', () => {
        const scrollPercent = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );

        if (scrollPercent > maxScroll) {
            maxScroll = scrollPercent;
        }

        milestones.forEach(milestone => {
            if (scrollPercent >= milestone && !tracked.has(milestone)) {
                tracked.add(milestone);

                if (typeof gtag !== 'undefined') {
                    gtag('event', 'scroll_depth', {
                        'event_category': 'Engagement',
                        'event_label': `${milestone}%`,
                        'value': milestone
                    });
                }
            }
        });
    });
}

// Initialize everything on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initSmoothScroll();
    initFAQ();
    initScrollAnimations();
    initVideoBackground();
    trackCTAClicks();
    initWhatsAppLinks();
    trackSessionTime();
    trackScrollDepth();

    // Initialize countdown if element exists
    const countdownEl = document.getElementById('countdown');
    if (countdownEl) {
        // Set countdown to 3 days from now
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 3);
        new CountdownTimer('countdown', endDate);
    }

    // Initialize form if element exists
    const leadForm = document.getElementById('lead-form');
    if (leadForm) {
        new FormHandler('lead-form', {
            webhookUrl: 'https://hooks.zapier.com/hooks/catch/YOUR_WEBHOOK_ID/', // Configure this
            redirectUrl: '/obrigado'
        });
    }
});

// Export for use in other scripts
window.TD = {
    CountdownTimer,
    FormHandler,
    initExitIntent,
    trackCTAClicks,
    initWhatsAppLinks
};
