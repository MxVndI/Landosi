/* ============================================================
   NAIL STUDIO — main.js
   ============================================================ */

/* ---- Sticky header shadow ---- */
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
  }));
})();

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

window.closeAllModals = function () {
  [...modalStack].forEach(closeModal);
};

/* Close on backdrop click */
document.querySelectorAll('.modal-backdrop').forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el) closeModal(el.id);
  });
});

/* Close on Escape */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalStack.length > 0) {
    closeModal(modalStack[modalStack.length - 1]);
  }
});

/* Wire close buttons */
const closePairs = [
  ['bookingClose', 'bookingModal'],
  ['galleryClose', 'galleryModal'],
  ['priceClose',   'priceModal'],
  ['mastersClose', 'mastersModal'],
  ['reviewsClose', 'reviewsModal'],
  ['certClose',    'certModal'],
];
closePairs.forEach(([btnId, modalId]) => {
  const btn = document.getElementById(btnId);
  if (btn) btn.addEventListener('click', () => closeModal(modalId));
});

/* ---- Booking modal ---- */
window.openBooking = function (serviceName) {
  // FIX #3: close any other open modals first so booking always appears on top
  [...modalStack].forEach(id => { if (id !== 'bookingModal') closeModal(id); });

  const sel = document.getElementById('bService');
  if (sel) {
    sel.value = '';
    if (serviceName) {
      for (const opt of sel.options) {
        if (opt.value === serviceName || opt.text === serviceName) {
          sel.value = opt.value; break;
        }
      }
    }
  }

  // FIX #2: reset to form view — show form + left panel, hide success
  const form    = document.getElementById('bookingForm');
  const success = document.getElementById('bookingSuccess');
  const left    = document.querySelector('.modal-booking__left');
  if (form)    form.style.display    = '';
  if (success) success.style.display = 'none';
  if (left)    left.style.display    = '';

  openModal('bookingModal');
};

['headerBookBtn', 'heroBookBtn', 'contactsBookBtn'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', () => openBooking(''));
});

window.submitBooking = function (e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  if (!name || !phone) return;

  const submitBtn = form.querySelector('[type=submit]');
  submitBtn.textContent = 'Отправляем…';
  submitBtn.disabled = true;

  setTimeout(() => {
    // FIX #2: hide the left info panel so success takes the full width
    const left = document.querySelector('.modal-booking__left');
    if (left) left.style.display = 'none';

    form.style.display = 'none';
    document.getElementById('bookingSuccess').style.display = '';
    form.reset();
    submitBtn.textContent = 'Отправить заявку';
    submitBtn.disabled = false;
  }, 900);
};

/* ---- Gallery modal ---- */
// FIX #1: gallery images are now pre-rendered in HTML with data-cms-image-key
// so CMS can edit them. No dynamic generation needed — just open the modal.

const allWorksBtn = document.getElementById('allWorksBtn');
if (allWorksBtn) allWorksBtn.addEventListener('click', () => openModal('galleryModal'));

/* hero "Смотреть работы" scrolls to works section */
const heroWorksBtn = document.getElementById('heroWorksBtn');
if (heroWorksBtn) heroWorksBtn.addEventListener('click', () => {
  const sec = document.getElementById('works');
  if (sec) sec.scrollIntoView({ behavior: 'smooth' });
});

/* clicking a work-item opens full gallery */
document.querySelectorAll('.work-item').forEach(item => {
  item.addEventListener('click', () => openModal('galleryModal'));
});

/* ---- Full price modal ---- */
const fullPriceBtn = document.getElementById('fullPriceBtn');
if (fullPriceBtn) fullPriceBtn.addEventListener('click', () => openModal('priceModal'));

/* ---- All masters modal ---- */
const allMastersBtn = document.getElementById('allMastersBtn');
if (allMastersBtn) allMastersBtn.addEventListener('click', () => openModal('mastersModal'));

/* ---- All reviews modal ---- */
const allReviewsBtn = document.getElementById('allReviewsBtn');
if (allReviewsBtn) allReviewsBtn.addEventListener('click', () => openModal('reviewsModal'));

/* ---- Certificate lightbox ---- */
window.openCert = function (card) {
  const img = card.querySelector('.cert-card__img');
  const modal = document.getElementById('certModalImg');
  if (img && modal) modal.src = img.src;
  openModal('certModal');
};

/* ---- Smooth scroll for nav links ---- */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ---- Intersection observer: fade-in sections ---- */
(function () {
  if (!('IntersectionObserver' in window)) return;
  const style = document.createElement('style');
  style.textContent = `
    .section, .hero { opacity: 0; transform: translateY(24px); transition: opacity .55s ease, transform .55s ease; }
    .section.visible, .hero.visible { opacity: 1; transform: none; }
  `;
  document.head.appendChild(style);

  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); } });
  }, { threshold: 0.07 });

  document.querySelectorAll('.section, .hero').forEach(el => obs.observe(el));
})();

/* ---- Phone input mask ---- */
(function () {
  const ph = document.getElementById('bPhone');
  if (!ph) return;
  ph.addEventListener('input', () => {
    let v = ph.value.replace(/\D/g, '');
    if (v.startsWith('8')) v = '7' + v.slice(1);
    if (!v.startsWith('7')) v = '7' + v;
    v = v.slice(0, 11);
    let out = '+7';
    if (v.length > 1) out += ' (' + v.slice(1, 4);
    if (v.length > 4) out += ') ' + v.slice(4, 7);
    if (v.length > 7) out += '-' + v.slice(7, 9);
    if (v.length > 9) out += '-' + v.slice(9, 11);
    ph.value = out;
  });
})();
