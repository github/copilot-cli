/**
 * TD Funnels - Sistema de Funis JavaScript
 * Treinador David - Personal Training
 */

'use strict';

// ==========================================
// UTILITIES
// ==========================================

const TDUtils = {
  /**
   * Get element by selector
   */
  qs: (selector) => document.querySelector(selector),

  /**
   * Get all elements by selector
   */
  qsa: (selector) => document.querySelectorAll(selector),

  /**
   * Add event listener
   */
  on: (element, event, handler) => {
    if (element) {
      element.addEventListener(event, handler);
    }
  },

  /**
   * Get URL parameter
   */
  getUrlParam: (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  },

  /**
   * Set local storage
   */
  setStorage: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  },

  /**
   * Get local storage
   */
  getStorage: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return null;
    }
  }
};

// ==========================================
// COUNTDOWN TIMER
// ==========================================

class TDCountdown {
  constructor(elementId, targetDate) {
    this.element = document.getElementById(elementId);
    this.targetDate = new Date(targetDate).getTime();

    if (this.element) {
      this.init();
    }
  }

  init() {
    this.createHTML();
    this.start();
  }

  createHTML() {
    this.element.innerHTML = `
      <div class="td-countdown">
        <div class="td-countdown-item">
          <span class="td-countdown-value" id="days">00</span>
          <span class="td-countdown-label">Dias</span>
        </div>
        <div class="td-countdown-item">
          <span class="td-countdown-value" id="hours">00</span>
          <span class="td-countdown-label">Horas</span>
        </div>
        <div class="td-countdown-item">
          <span class="td-countdown-value" id="minutes">00</span>
          <span class="td-countdown-label">Min</span>
        </div>
        <div class="td-countdown-item">
          <span class="td-countdown-value" id="seconds">00</span>
          <span class="td-countdown-label">Seg</span>
        </div>
      </div>
    `;
  }

  start() {
    this.updateCountdown();
    this.interval = setInterval(() => this.updateCountdown(), 1000);
  }

  updateCountdown() {
    const now = new Date().getTime();
    const distance = this.targetDate - now;

    if (distance < 0) {
      clearInterval(this.interval);
      this.element.innerHTML = '<p class="td-text-center td-text-primary">Oferta Expirada!</p>';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
  }
}

// ==========================================
// QUIZ SYSTEM
// ==========================================

class TDQuiz {
  constructor(quizData, containerId) {
    this.quizData = quizData;
    this.container = document.getElementById(containerId);
    this.currentQuestion = 0;
    this.answers = {};

    if (this.container) {
      this.init();
    }
  }

  init() {
    this.render();
  }

  render() {
    const question = this.quizData.questions[this.currentQuestion];
    const progress = ((this.currentQuestion + 1) / this.quizData.questions.length) * 100;

    this.container.innerHTML = `
      <div class="td-quiz-container td-fade-in">
        <div class="td-quiz-progress">
          <div class="td-quiz-progress-bar" style="width: ${progress}%"></div>
        </div>

        <div class="td-quiz-question">
          <h2 class="td-h2 td-mb-md">
            Questão ${this.currentQuestion + 1} de ${this.quizData.questions.length}
          </h2>

          <h3 class="td-h3 td-mb-lg">${question.question}</h3>

          <div class="td-quiz-options">
            ${question.options.map((option, index) => `
              <div class="td-quiz-option" data-value="${option.value}">
                <strong>${option.label}</strong>
                ${option.description ? `<p class="td-text-secondary td-mt-xs">${option.description}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.attachOptionListeners();
  }

  attachOptionListeners() {
    const options = this.container.querySelectorAll('.td-quiz-option');
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        const value = e.currentTarget.dataset.value;
        this.selectOption(value);
      });
    });
  }

  selectOption(value) {
    const question = this.quizData.questions[this.currentQuestion];
    this.answers[question.id] = value;

    // Save to localStorage
    TDUtils.setStorage('td_quiz_answers', this.answers);

    // Move to next question or finish
    setTimeout(() => {
      if (this.currentQuestion < this.quizData.questions.length - 1) {
        this.currentQuestion++;
        this.render();
      } else {
        this.finish();
      }
    }, 300);
  }

  finish() {
    // Track quiz completion
    TDTracking.trackEvent('Quiz', 'Complete', 'Consultoria');

    // Redirect to next step
    const redirectUrl = this.quizData.redirectUrl || '/consultoria/obrigado/';
    window.location.href = redirectUrl;
  }
}

// ==========================================
// FORM VALIDATION
// ==========================================

class TDFormValidator {
  constructor(formId) {
    this.form = document.getElementById(formId);

    if (this.form) {
      this.init();
    }
  }

  init() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  handleSubmit(e) {
    e.preventDefault();

    // Clear previous errors
    this.clearErrors();

    // Validate
    if (this.validate()) {
      // Track form submission
      const formType = this.form.dataset.formType || 'Lead Capture';
      TDTracking.trackEvent('Form', 'Submit', formType);

      // Submit form
      this.submitForm();
    }
  }

  validate() {
    let isValid = true;
    const requiredFields = this.form.querySelectorAll('[required]');

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        this.showError(field, 'Este campo é obrigatório');
        isValid = false;
      } else if (field.type === 'email' && !this.isValidEmail(field.value)) {
        this.showError(field, 'Email inválido');
        isValid = false;
      }
    });

    return isValid;
  }

  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  showError(field, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'td-error-message';
    errorDiv.style.color = 'var(--td-warning)';
    errorDiv.style.fontSize = 'var(--text-sm)';
    errorDiv.style.marginTop = 'var(--spacing-xs)';
    errorDiv.textContent = message;

    field.style.borderColor = 'var(--td-warning)';
    field.parentElement.appendChild(errorDiv);
  }

  clearErrors() {
    const errors = this.form.querySelectorAll('.td-error-message');
    errors.forEach(error => error.remove());

    const fields = this.form.querySelectorAll('input, textarea, select');
    fields.forEach(field => {
      field.style.borderColor = '';
    });
  }

  async submitForm() {
    const formData = new FormData(this.form);
    const submitButton = this.form.querySelector('[type="submit"]');

    // Show loading state
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Enviando...';
    submitButton.disabled = true;

    try {
      // Submit to WordPress or external service
      const response = await fetch(this.form.action, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        // Redirect to thank you page
        const redirectUrl = this.form.dataset.redirect || '/obrigado/';
        window.location.href = redirectUrl;
      } else {
        throw new Error('Erro no envio');
      }
    } catch (error) {
      alert('Erro ao enviar formulário. Por favor, tente novamente.');
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  }
}

// ==========================================
// CONVERSION TRACKING
// ==========================================

const TDTracking = {
  /**
   * Initialize Facebook Pixel
   */
  initFacebookPixel: (pixelId) => {
    if (!pixelId) return;

    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');

    fbq('init', pixelId);
    fbq('track', 'PageView');
  },

  /**
   * Initialize Google Analytics
   */
  initGoogleAnalytics: (trackingId) => {
    if (!trackingId) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', trackingId);

    window.gtag = gtag;
  },

  /**
   * Track custom event
   */
  trackEvent: (category, action, label, value) => {
    // Google Analytics
    if (window.gtag) {
      gtag('event', action, {
        'event_category': category,
        'event_label': label,
        'value': value
      });
    }

    // Facebook Pixel
    if (window.fbq) {
      fbq('trackCustom', action, {
        category: category,
        label: label,
        value: value
      });
    }

    console.log('Event tracked:', category, action, label, value);
  },

  /**
   * Track conversion
   */
  trackConversion: (type, value) => {
    // Facebook Pixel
    if (window.fbq) {
      fbq('track', type, { value: value, currency: 'EUR' });
    }

    // Google Analytics
    if (window.gtag) {
      gtag('event', 'conversion', {
        'send_to': window.TD_GA_CONVERSION_ID,
        'value': value,
        'currency': 'EUR'
      });
    }

    console.log('Conversion tracked:', type, value);
  }
};

// ==========================================
// SMOOTH SCROLL
// ==========================================

const TDSmoothScroll = {
  init: () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
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
};

// ==========================================
// VIDEO PLAYER
// ==========================================

class TDVideoPlayer {
  constructor(videoId) {
    this.video = document.getElementById(videoId);

    if (this.video) {
      this.init();
    }
  }

  init() {
    // Track video play
    this.video.addEventListener('play', () => {
      TDTracking.trackEvent('Video', 'Play', this.video.dataset.videoName);
    });

    // Track 25%, 50%, 75%, 100% completion
    this.video.addEventListener('timeupdate', () => {
      const percent = (this.video.currentTime / this.video.duration) * 100;

      if (percent >= 25 && !this.tracked25) {
        TDTracking.trackEvent('Video', '25% Complete', this.video.dataset.videoName);
        this.tracked25 = true;
      }
      if (percent >= 50 && !this.tracked50) {
        TDTracking.trackEvent('Video', '50% Complete', this.video.dataset.videoName);
        this.tracked50 = true;
      }
      if (percent >= 75 && !this.tracked75) {
        TDTracking.trackEvent('Video', '75% Complete', this.video.dataset.videoName);
        this.tracked75 = true;
      }
    });

    this.video.addEventListener('ended', () => {
      TDTracking.trackEvent('Video', '100% Complete', this.video.dataset.videoName);
    });
  }
}

// ==========================================
// LAZY LOAD IMAGES
// ==========================================

const TDLazyLoad = {
  init: () => {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }
};

// ==========================================
// CALENDLY INTEGRATION
// ==========================================

const TDCalendly = {
  open: (url) => {
    if (window.Calendly) {
      Calendly.initPopupWidget({ url: url });
      TDTracking.trackEvent('Calendly', 'Open', url);
    } else {
      window.open(url, '_blank');
    }
  },

  loadScript: () => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.href = 'https://assets.calendly.com/assets/external/widget.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
};

// ==========================================
// INITIALIZE ON DOM READY
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize smooth scroll
  TDSmoothScroll.init();

  // Initialize lazy load
  TDLazyLoad.init();

  // Load Calendly if needed
  if (document.querySelector('[data-calendly-url]')) {
    TDCalendly.loadScript();
  }

  // Initialize tracking
  if (window.TD_FB_PIXEL_ID) {
    TDTracking.initFacebookPixel(window.TD_FB_PIXEL_ID);
  }

  if (window.TD_GA_TRACKING_ID) {
    TDTracking.initGoogleAnalytics(window.TD_GA_TRACKING_ID);
  }
});

// ==========================================
// EXPORT FOR GLOBAL USE
// ==========================================

window.TDFunnels = {
  Countdown: TDCountdown,
  Quiz: TDQuiz,
  FormValidator: TDFormValidator,
  Tracking: TDTracking,
  VideoPlayer: TDVideoPlayer,
  Calendly: TDCalendly,
  Utils: TDUtils
};
