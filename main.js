/* ============================================================
   PORTFOLIO — main.js
   ============================================================ */

/* ---- Sticky header ---- */
(function () {
  const header = document.getElementById('header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ---- Burger menu ---- */
(function () {
  const btn = document.getElementById('burgerBtn');
  const nav = document.getElementById('nav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }));
})();

/* ---- Intersection observer: fade-in ---- */
(function () {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.section, .hero').forEach(el => el.classList.add('visible'));
    return;
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        obs.unobserve(en.target);
      }
    });
  }, { threshold: 0.06 });

  document.querySelectorAll('.section, .hero').forEach(el => obs.observe(el));
})();

/* ---- Smooth scroll ---- */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ---- Modal helpers ---- */
const modalStack = [];

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  if (!modalStack.includes(id)) modalStack.push(id);
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  const idx = modalStack.indexOf(id);
  if (idx > -1) modalStack.splice(idx, 1);
  if (modalStack.length === 0) document.body.style.overflow = '';
}

/* Close on backdrop */
document.querySelectorAll('.modal-backdrop').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) closeModal(el.id); });
});

/* Close on Escape */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalStack.length > 0) {
    closeModal(modalStack[modalStack.length - 1]);
  }
});

/* Wire close buttons */
const closePairs = [['contactClose', 'contactModal']];
closePairs.forEach(([btnId, modalId]) => {
  const btn = document.getElementById(btnId);
  if (btn) btn.addEventListener('click', () => closeModal(modalId));
});

/* ---- Contact modal open ---- */
window.openContact = function (serviceName) {
  const sel = document.getElementById('mService');
  if (sel && serviceName) {
    for (const opt of sel.options) {
      if (opt.value === serviceName || opt.text === serviceName) {
        sel.value = opt.value;
        break;
      }
    }
  }

  const form    = document.getElementById('contactForm');
  const success = document.getElementById('modalSuccess');
  if (form)    form.hidden    = false;
  if (success) success.hidden = true;

  openModal('contactModal');
};

['headerContactBtn', 'heroContactBtn'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', () => openContact(''));
});

/* ---- Modal form submit ---- */
window.submitContactModal = function (e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('[type=submit]');
  submitBtn.textContent = 'Отправляем…';
  submitBtn.disabled = true;

  setTimeout(() => {
    form.hidden = true;
    document.getElementById('modalSuccess').hidden = false;
    form.reset();
    submitBtn.textContent = 'Отправить заявку';
    submitBtn.disabled = false;
  }, 900);
};

/* ---- Inline form submit ---- */
window.submitContactForm = function (e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('[type=submit]');
  submitBtn.textContent = 'Отправляем…';
  submitBtn.disabled = true;

  setTimeout(() => {
    form.hidden = true;
    document.getElementById('contactSuccess').hidden = false;
    form.reset();
    submitBtn.textContent = 'Отправить заявку';
    submitBtn.disabled = false;
  }, 900);
};
