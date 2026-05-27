/* ── Modal management ─────────────────────────────────────── */
let activeModal = null;

function openModal(id) {
  if (activeModal && activeModal !== id) closeModal(activeModal);
  const el = document.getElementById('modal-' + id);
  if (!el) return;
  el.classList.add('is-open');
  document.body.classList.add('modal-open');
  activeModal = id;
}

function closeModal(id) {
  const target = id || activeModal;
  const el = document.getElementById('modal-' + target);
  if (!el) return;
  el.classList.remove('is-open');
  document.body.classList.remove('modal-open');
  activeModal = null;
}

function openModalWithType(modalId, repairType) {
  const inp = document.getElementById('modal-repair-type');
  if (inp) inp.value = repairType;
  const sel = document.getElementById('b-type');
  if (sel) {
    for (const opt of sel.options) {
      if (opt.value === repairType || opt.text === repairType) { sel.value = opt.value; break; }
    }
  }
  openModal(modalId);
}

// Overlay backdrop close
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay') && activeModal) closeModal();
});

// Escape close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeModal) closeModal();
});

/* ── Smooth scroll helper ─────────────────────────────────── */
function smoothTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top, behavior: 'smooth' });
}

/* ── Burger menu ──────────────────────────────────────────── */
function initBurger() {
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  if (!burger || !nav) return;

  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    nav.classList.toggle('open');
  });

  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      nav.classList.remove('open');
    });
  });
}

/* ── Sticky header ────────────────────────────────────────── */
function initStickyHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── Calculator ───────────────────────────────────────────── */
function calculateEstimate() {
  const areaInput = document.getElementById('calc-area');
  const area = Math.max(15, Math.min(500, parseInt(areaInput?.value) || 60));
  const typeEl = document.querySelector('input[name="repair-type"]:checked');
  const type = typeEl?.value || 'standard';
  const bathroom = document.getElementById('add-bathroom')?.checked;
  const kitchen  = document.getElementById('add-kitchen')?.checked;
  const balcony  = document.getElementById('add-balcony')?.checked;

  const rates = { cosmetic: [2500, 3500], standard: [5000, 7000], designer: [10000, 15000] };
  const [rMin, rMax] = rates[type] || rates.standard;
  let tMin = area * rMin;
  let tMax = area * rMax;
  if (bathroom) { tMin += 80000; tMax += 120000; }
  if (kitchen)  { tMin += 60000; tMax += 100000; }
  if (balcony)  { tMin += 40000; tMax += 70000; }

  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const minEl = document.getElementById('calc-min');
  const maxEl = document.getElementById('calc-max');
  const daysEl = document.getElementById('calc-days');
  if (minEl) minEl.textContent = fmt(tMin);
  if (maxEl) maxEl.textContent = fmt(tMax);

  if (daysEl) {
    const baseDays = { cosmetic: 14, standard: 30, designer: 60 };
    let days = baseDays[type] + Math.max(0, (area - 40) * 0.4);
    if (bathroom) days += 7;
    if (kitchen)  days += 5;
    if (balcony)  days += 3;
    daysEl.textContent = `~${Math.round(days)} дней`;
  }

  // Update slider gradient
  const slider = document.getElementById('calc-area-slider');
  if (slider) {
    const pct = ((area - 15) / (500 - 15)) * 100;
    slider.style.background = `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`;
  }
}

function initCalculator() {
  const slider = document.getElementById('calc-area-slider');
  const input  = document.getElementById('calc-area');
  if (!slider || !input) return;

  slider.addEventListener('input', () => { input.value = slider.value; calculateEstimate(); });
  input.addEventListener('input', () => {
    let v = parseInt(input.value) || 60;
    v = Math.max(15, Math.min(500, v));
    slider.value = v;
    calculateEstimate();
  });

  document.querySelectorAll('input[name="repair-type"]').forEach(r => r.addEventListener('change', calculateEstimate));
  document.querySelectorAll('#add-bathroom, #add-kitchen, #add-balcony').forEach(c => c.addEventListener('change', calculateEstimate));

  calculateEstimate();
}

/* ── Before/After slider ──────────────────────────────────── */
function initBeforeAfterSliders() {
  document.querySelectorAll('.ba-slider').forEach(slider => {
    const handle  = slider.querySelector('.ba-handle');
    const afterEl = slider.querySelector('.ba-after');
    if (!handle || !afterEl) return;

    let dragging = false;
    const setPos = (clientX) => {
      const rect = slider.getBoundingClientRect();
      const pct  = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
      afterEl.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      handle.style.left = `${pct}%`;
      handle.setAttribute('aria-valuenow', Math.round(pct));
    };

    afterEl.style.clipPath = 'inset(0 50% 0 0)';
    handle.style.left = '50%';

    handle.addEventListener('mousedown',  (e) => { dragging = true; e.preventDefault(); });
    window.addEventListener('mouseup',    () => dragging = false);
    window.addEventListener('mousemove',  (e) => { if (dragging) setPos(e.clientX); });

    handle.addEventListener('touchstart', (e) => { dragging = true; }, { passive: true });
    window.addEventListener('touchend',   () => dragging = false);
    window.addEventListener('touchmove',  (e) => { if (dragging) setPos(e.touches[0].clientX); }, { passive: true });

    // Keyboard
    handle.addEventListener('keydown', (e) => {
      const rect = slider.getBoundingClientRect();
      const cur  = parseFloat(handle.style.left) || 50;
      if (e.key === 'ArrowLeft')  setPos(rect.left + (cur - 5)  / 100 * rect.width);
      if (e.key === 'ArrowRight') setPos(rect.left + (cur + 5)  / 100 * rect.width);
    });
    handle.setAttribute('tabindex', '0');
  });
}

/* ── Before/After tabs ────────────────────────────────────── */
function initBaTabs() {
  const tabs   = document.querySelectorAll('.ba-tab-btn');
  const slides = document.querySelectorAll('.ba-slide');
  if (!tabs.length) return;

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      slides.forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      slides[i]?.classList.add('active');
      initBeforeAfterSliders();
    });
  });
}

/* ── Reviews carousel ─────────────────────────────────────── */
function initReviewsCarousel() {
  const track  = document.getElementById('reviews-track');
  const prevBtn = document.getElementById('reviews-prev');
  const nextBtn = document.getElementById('reviews-next');
  const dotsWrap = document.getElementById('reviews-dots');
  if (!track) return;

  const cards = track.querySelectorAll('.review-card');
  let cur = 0;

  function getVisible() {
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640)  return 2;
    return 1;
  }

  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    const pages = Math.ceil(cards.length / getVisible());
    for (let i = 0; i < pages; i++) {
      const dot = document.createElement('button');
      dot.className = 'reviews-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Страница ${i + 1}`);
      dot.addEventListener('click', () => goTo(i * getVisible()));
      dotsWrap.appendChild(dot);
    }
  }

  function updateDots() {
    if (!dotsWrap) return;
    const dots = dotsWrap.querySelectorAll('.reviews-dot');
    const pageIdx = Math.floor(cur / getVisible());
    dots.forEach((d, i) => d.classList.toggle('active', i === pageIdx));
  }

  function goTo(idx) {
    const vis = getVisible();
    const maxIdx = Math.max(0, cards.length - vis);
    cur = Math.max(0, Math.min(idx, maxIdx));
    const cardW = cards[0]?.getBoundingClientRect().width || 0;
    const gap = 24;
    track.style.transform = `translateX(-${cur * (cardW + gap)}px)`;
    updateDots();
  }

  prevBtn?.addEventListener('click', () => goTo(cur - getVisible()));
  nextBtn?.addEventListener('click', () => goTo(cur + getVisible()));
  window.addEventListener('resize', () => { goTo(0); buildDots(); });

  buildDots();
  goTo(0);
}

/* ── FAQ accordion ────────────────────────────────────────── */
function initFaq() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ── Gallery filter ───────────────────────────────────────── */
function initGalleryFilter() {
  document.querySelectorAll('.gallery-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('.gallery-item').forEach(item => {
        if (filter === 'all' || item.dataset.cat === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });
}

/* ── Lead form submission ─────────────────────────────────── */
function initLeadForm(formId, source) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    // Merge repair_type_select into repair_type if needed
    if (!data.repair_type && data.repair_type_select) data.repair_type = data.repair_type_select;
    data.source = source;

    const btn = form.querySelector('[type=submit]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Отправляем…';

    try {
      const r = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await r.json();
      if (result.ok) {
        form.innerHTML = `
          <div class="form-success">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#C07830" stroke-width="1.8" stroke-linecap="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <h3>Заявка принята!</h3>
            <p>Наш менеджер свяжется с вами в течение 15 минут.<br>Или позвоните сами: <a href="tel:+74959876543">+7 (495) 987-65-43</a></p>
          </div>`;
      } else {
        throw new Error('server');
      }
    } catch {
      btn.disabled = false;
      btn.textContent = originalText;
      alert('Ошибка отправки. Позвоните нам: +7 (495) 987-65-43');
    }
  });
}

/* ── Phone mask ───────────────────────────────────────────── */
function initPhoneMask() {
  document.querySelectorAll('input[type=tel]').forEach(inp => {
    inp.addEventListener('input', () => {
      let v = inp.value.replace(/\D/g, '');
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (!v.startsWith('7') && v.length > 0) v = '7' + v;
      let res = '+7';
      if (v.length > 1) res += ' (' + v.slice(1, 4);
      if (v.length >= 4) res += ') ' + v.slice(4, 7);
      if (v.length >= 7) res += '-' + v.slice(7, 9);
      if (v.length >= 9) res += '-' + v.slice(9, 11);
      inp.value = res;
    });
  });
}

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initBurger();
  initStickyHeader();
  initCalculator();
  initBeforeAfterSliders();
  initBaTabs();
  initFaq();
  initReviewsCarousel();
  initGalleryFilter();
  initPhoneMask();
  initLeadForm('form-booking',  'modal-booking');
  initLeadForm('form-contacts', 'contacts-section');
});
