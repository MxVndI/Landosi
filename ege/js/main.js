/* ── Modals ─────────────────────────────────────────────── */
function openModal(id) {
  // Close ALL other open modals first — no stacking
  document.querySelectorAll('.modal-overlay.open').forEach(el => {
    el.classList.remove('open');
  });
  const el = document.getElementById('modal-' + id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById('modal-' + id);
  if (!el) return;
  el.classList.remove('open');
  // Only restore scroll if no other modal is open
  if (!document.querySelector('.modal-overlay.open')) {
    document.body.style.overflow = '';
  }
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    const id = e.target.id.replace('modal-', '');
    closeModal(id);
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(el => {
      closeModal(el.id.replace('modal-', ''));
    });
  }
});

/* ── LK Tabs ─────────────────────────────────────────────── */
function switchTab(tab, btn) {
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('regForm');
  const tabs = document.querySelectorAll('.lk-tab');

  if (tab === 'login') {
    loginForm.style.display = '';
    regForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    regForm.style.display = '';
  }

  tabs.forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    tabs.forEach((t, i) => { if (i === (tab === 'reg' ? 1 : 0)) t.classList.add('active'); });
  }
}

/* ── Burger menu ─────────────────────────────────────────── */
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger?.addEventListener('click', () => {
  nav.classList.toggle('open');
  document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
});
nav?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    nav.classList.remove('open');
    document.body.style.overflow = '';
  });
});

/* ── Sticky header shadow ───────────────────────────────── */
window.addEventListener('scroll', () => {
  const h = document.getElementById('header');
  if (h) h.style.boxShadow = window.scrollY > 10 ? '0 4px 32px rgba(0,0,0,.3)' : '';
}, { passive: true });

/* ── Smooth scroll for nav links ────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ── Counter animation ──────────────────────────────────── */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  if (isNaN(target)) return;
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * ease) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObs.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.counter').forEach(el => counterObs.observe(el));

/* ── Form submission → /api/lead ───────────────────────── */
async function submitLead(e, formId) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type="submit"]');
  const successEl = document.getElementById(formId + 'Success') ||
                    form.querySelector('.form-success');

  const data = Object.fromEntries(new FormData(form));
  data.source = formId;
  data.page = location.href;
  data.timestamp = new Date().toISOString();

  const prevText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Отправляем...';

  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      form.style.display = 'none';
      if (successEl) successEl.style.display = '';
      else {
        btn.disabled = false;
        btn.textContent = '✓ Заявка отправлена!';
        btn.style.background = '#27a745';
      }
    } else {
      throw new Error('server_error');
    }
  } catch {
    btn.disabled = false;
    btn.textContent = prevText;
    alert('Ошибка отправки. Позвоните нам: +7 (495) 123-45-67');
  }
}

/* ── Animate sections on scroll ────────────────────────── */
const fadeObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'none';
      fadeObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(
  '.step-card,.subject-card,.teacher-card,.review-card,.price-card,.lms-features li'
).forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity .45s ease, transform .45s ease';
  fadeObs.observe(el);
});

/* ── Phone mask ─────────────────────────────────────────── */
document.querySelectorAll('input[type="tel"]').forEach(input => {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '');
    if (v.startsWith('8')) v = '7' + v.slice(1);
    if (v.startsWith('7') && v.length > 1) {
      v = '+7 (' + v.slice(1, 4) + ') ' + v.slice(4, 7) + '-' + v.slice(7, 9) + '-' + v.slice(9, 11);
    } else if (v.length) {
      v = '+' + v;
    }
    input.value = v.trim().replace(/[\s()-]+$/, '');
  });
});

/* ── LMS progress bars animate ──────────────────────────── */
const barObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.lms-progress-bar > div').forEach(bar => {
        const w = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => { bar.style.width = w; }, 100);
      });
      barObs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
const lmsBlock = document.querySelector('.lms-progress-block');
if (lmsBlock) barObs.observe(lmsBlock);
