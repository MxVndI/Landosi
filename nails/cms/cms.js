(() => {
  const CONTENT_URL = editMode ? 'api/cms/content' : 'cms/content.json';
  const SAVE_URL = 'api/cms/content';
  const UPLOAD_URL = 'api/cms/upload';
  const SESSION_URL = 'api/cms/session';
  const UNDO_URL = 'api/cms/undo';
  const HISTORY_URL = 'api/cms/history';
  const RESTORE_URL = 'api/cms/restore';
  const ADMIN_PATH_RE = /\/admin\/?$/;
  const editMode = new URLSearchParams(location.search).has('cms') || ADMIN_PATH_RE.test(location.pathname);
  const state = {
    content: { version: 1, items: {} },
    dirty: false,
    selected: null,
    saveButton: null,
    historyButton: null,
    panel: null,
    toast: null,
    fileInput: null,
  };

  const textSelector = [
    'h1', 'h2', 'h3', 'p', 'li', 'strong', 'small', 'em',
    '.eyebrow', '.hero-lead', '.hero-sub', '.logo', '.btn', '.work-badge',
    '.price', '.price-for', '.price-deadline', '.consent-text', '.contact-links span', '.contact-links strong',
    '.footer-brand p', '.footer-nav a', '.faq-item span', '.faq-item p', '.steps b', '.steps span', '.steps strong'
  ].join(',');

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function isInsideCmsUi(el) {
    return Boolean(el.closest?.('.cms-toolbar, .cms-panel, .cms-toast'));
  }

  function visibleText(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function assignKeys() {
    let textIndex = 0;
    document.querySelectorAll(textSelector).forEach(el => {
      if (isInsideCmsUi(el)) return;
      if (el.closest('svg, script, style, noscript, input, textarea, select')) return;
      if (!visibleText(el)) return;
      if (el.matches('.page-grid *, .hero-loop, .contact-loop')) return;
      if (!el.dataset.cmsTextKey) el.dataset.cmsTextKey = `text.${String(++textIndex).padStart(4, '0')}`;
    });

    let imageIndex = 0;
    document.querySelectorAll('img').forEach(el => {
      if (isInsideCmsUi(el)) return;
      if (!el.dataset.cmsImageKey) el.dataset.cmsImageKey = `image.${String(++imageIndex).padStart(4, '0')}`;
    });

    let linkIndex = 0;
    document.querySelectorAll('a[href]').forEach(el => {
      if (isInsideCmsUi(el)) return;
      if (!el.dataset.cmsLinkKey) el.dataset.cmsLinkKey = `link.${String(++linkIndex).padStart(4, '0')}`;
    });
  }

  async function loadContent() {
    try {
      const response = await fetch(`${CONTENT_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('content_unavailable');
      const json = await response.json();
      if (json && typeof json === 'object') state.content = { version: 1, items: {}, ...json };
    } catch {
      state.content = { version: 1, items: {} };
    }
  }

  function applyContent() {
    const items = state.content.items || {};
    const seoTitle = items['seo.title']?.text;
    const seoDescription = items['seo.description']?.text;
    if (typeof seoTitle === 'string' && seoTitle.trim()) document.title = seoTitle.trim();
    if (typeof seoDescription === 'string') ensureMetaDescription().setAttribute('content', seoDescription.trim());
    Object.entries(items).forEach(([key, item]) => {
      if (!item || typeof item !== 'object') return;
      // Support both auto-generated keys (text.0001) and named keys (hero.title)
      // by falling back to item.type when the prefix doesn't match
      const isText  = key.startsWith('text.')  || item.type === 'text';
      const isImage = key.startsWith('image.') || item.type === 'image';
      const isLink  = key.startsWith('link.')  || item.type === 'link';
      if (isText) {
        const el = document.querySelector(`[data-cms-text-key="${CSS.escape(key)}"]`);
        if (el && typeof item.html === 'string') el.innerHTML = item.html;
        if (el && typeof item.text === 'string' && typeof item.html !== 'string') el.textContent = item.text;
      }
      if (isImage) {
        const el = document.querySelector(`[data-cms-image-key="${CSS.escape(key)}"]`);
        if (el && typeof item.src === 'string') el.setAttribute('src', item.src);
        if (el && typeof item.alt === 'string') el.setAttribute('alt', item.alt);
      }
      if (isLink) {
        const el = document.querySelector(`[data-cms-link-key="${CSS.escape(key)}"]`);
        if (el && typeof item.href === 'string') el.setAttribute('href', item.href);
      }
    });
  }

  function markDirty() {
    state.dirty = true;
    if (state.saveButton) state.saveButton.textContent = 'РЎРѕС…СЂР°РЅРёС‚СЊ *';
  }

  function setItem(key, patch) {
    state.content.items ||= {};
    state.content.items[key] = { ...(state.content.items[key] || {}), ...patch };
    markDirty();
  }

  function toast(message) {
    if (!state.toast) return;
    state.toast.textContent = message;
    state.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => state.toast?.classList.remove('show'), 2300);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[char]));
  }

  function formatHistoryDate(value) {
    if (!value) return 'Р±РµР· РґР°С‚С‹';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

  function buildUi() {
    const toolbar = document.createElement('div');
    toolbar.className = 'cms-toolbar';
    toolbar.innerHTML = `
      <strong>Visual CMS v2</strong>
      <button class="cms-save" type="button">РЎРѕС…СЂР°РЅРёС‚СЊ</button>
      <button class="cms-seo" type="button">SEO</button>
      <button class="cms-history" type="button">РСЃС‚РѕСЂРёСЏ</button>
      <button class="cms-help" type="button">РљР°Рє</button>
      <button class="cms-exit" type="button">Р’С‹Р№С‚Рё</button>
    `;

    const panel = document.createElement('aside');
    panel.className = 'cms-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <h3 data-cms-panel-title>Р­Р»РµРјРµРЅС‚</h3>
      <p data-cms-panel-help>РљР»РёРєРЅРё С‚РµРєСЃС‚ Рё РїРёС€Рё РїСЂСЏРјРѕ РЅР° СЃС‚СЂР°РЅРёС†Рµ. РљР»РёРєРЅРё С„РѕС‚РєСѓ вЂ” Р·Р°РіСЂСѓР·РёС€СЊ РЅРѕРІСѓСЋ. РЈ СЃСЃС‹Р»РѕРє РјРѕР¶РЅРѕ РјРµРЅСЏС‚СЊ URL С‚СѓС‚.</p>
      <div class="cms-seo-fields" hidden>
        <label>SEO title<input data-cms-seo-title placeholder="Р—Р°РіРѕР»РѕРІРѕРє РІРєР»Р°РґРєРё / Google"></label>
        <label>SEO description<textarea data-cms-seo-description placeholder="РћРїРёСЃР°РЅРёРµ РґР»СЏ РїРѕРёСЃРєРѕРІРёРєРѕРІ"></textarea></label>
      </div>
      <div class="cms-history-fields" hidden>
        <div class="cms-history-list" data-cms-history-list>Р—Р°РіСЂСѓР¶Р°СЋ РёСЃС‚РѕСЂРёСЋ...</div>
      </div>
      <label class="cms-link-field" hidden>РЎСЃС‹Р»РєР°<input data-cms-href placeholder="https://..."></label>
      <label class="cms-alt-field" hidden>Alt РєР°СЂС‚РёРЅРєРё<input data-cms-alt placeholder="РћРїРёСЃР°РЅРёРµ РєР°СЂС‚РёРЅРєРё"></label>
      <div class="cms-row cms-panel-actions">
        <button type="button" data-cms-apply>РџСЂРёРјРµРЅРёС‚СЊ</button>
        <button class="cms-secondary" type="button" data-cms-clear>РЎР±СЂРѕСЃРёС‚СЊ СЌР»РµРјРµРЅС‚</button>
      </div>
    `;

    const fileInput = document.createElement('input');
    fileInput.id = 'cmsFileInput';
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/webp,image/svg+xml,image/avif';
    fileInput.hidden = true;

    const toastNode = document.createElement('div');
    toastNode.className = 'cms-toast';

    document.body.append(toolbar, panel, fileInput, toastNode);
    state.saveButton = toolbar.querySelector('.cms-save');
    state.historyButton = toolbar.querySelector('.cms-history');
    state.panel = panel;
    state.fileInput = fileInput;
    state.toast = toastNode;

    toolbar.querySelector('.cms-save').addEventListener('click', saveContent);
    toolbar.querySelector('.cms-seo').addEventListener('click', showSeoPanel);
    toolbar.querySelector('.cms-history').addEventListener('click', showHistoryPanel);
    toolbar.querySelector('.cms-help').addEventListener('click', () => toast('РўРµРєСЃС‚: РєР»РёРє Рё РїРµС‡Р°С‚Р°Р№. Р¤РѕС‚Рѕ: РєР»РёРє Рё С„Р°Р№Р». SEO: title/description. РСЃС‚РѕСЂРёСЏ: РѕС‚РєР°С‚ Рє Р»СЋР±РѕР№ РІРµСЂСЃРёРё.'));
    toolbar.querySelector('.cms-exit').addEventListener('click', () => { location.href = '/'; });
    panel.querySelector('[data-cms-apply]').addEventListener('click', applyPanelFields);
    panel.querySelector('[data-cms-clear]').addEventListener('click', clearSelectedOverride);
    panel.querySelector('[data-cms-history-list]').addEventListener('click', event => {
      const restoreButton = event.target.closest('[data-cms-restore]');
      if (restoreButton) restoreHistory(restoreButton.dataset.cmsRestore);
    });
    fileInput.addEventListener('change', handleFileChange);
  }

  function setupEditing() {
    document.body.classList.add('cms-editing');

    document.querySelectorAll('[data-cms-text-key]').forEach(el => {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'true');
      el.addEventListener('focus', () => selectElement(el, 'text'));
      el.addEventListener('input', () => {
        setItem(el.dataset.cmsTextKey, { type: 'text', html: el.innerHTML });
      });
      el.addEventListener('keydown', event => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();
          saveContent();
        }
      });
    });

    document.querySelectorAll('[data-cms-link-key]').forEach(el => {
      el.addEventListener('click', event => {
        if (!document.body.classList.contains('cms-editing')) return;
        event.preventDefault();
        event.stopPropagation();
        selectElement(el, 'link');
      }, true);
    });

    document.querySelectorAll('[data-cms-image-key]').forEach(el => {
      el.addEventListener('click', event => {
        if (!document.body.classList.contains('cms-editing')) return;
        event.preventDefault();
        event.stopPropagation();
        selectElement(el, 'image');
        state.fileInput.value = '';
        state.fileInput.click();
      }, true);
    });

    document.querySelectorAll('.work-card').forEach(card => {
      card.addEventListener('click', event => {
        if (!document.body.classList.contains('cms-editing')) return;
        const link = card.querySelector('[data-cms-link-key]');
        if (!link || event.target.closest('[data-cms-text-key], [data-cms-image-key]')) return;
        event.preventDefault();
        event.stopPropagation();
        selectElement(link, 'link');
      }, true);
    });

    document.addEventListener('click', event => {
      if (!document.body.classList.contains('cms-editing')) return;
      if (isInsideCmsUi(event.target)) return;
      const editable = event.target.closest('[data-cms-text-key], [data-cms-image-key], [data-cms-link-key]');
      if (!editable) return;
      if (editable.dataset.cmsTextKey) selectElement(editable, 'text');
    }, true);

    window.addEventListener('beforeunload', event => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    });

    toast('CMS РІРєР»СЋС‡РµРЅР°: РєР»РёРєР°Р№ С‚РµРєСЃС‚/С„РѕС‚Рѕ/СЃСЃС‹Р»РєРё Рё СЃРѕС…СЂР°РЅСЏР№');
  }

  function selectElement(el, kind) {
    if (state.selected?.el) state.selected.el.classList.remove('cms-selected');
    el.classList.add('cms-selected');
    state.selected = { el, kind };
    renderPanel(el, kind);
  }

  function renderPanel(el, kind) {
    const panel = state.panel;
    if (!panel) return;
    panel.hidden = false;
    panel.dataset.mode = kind;
    panel.querySelector('[data-cms-panel-title]').textContent = 'Р­Р»РµРјРµРЅС‚';
    panel.querySelector('[data-cms-panel-help]').textContent = 'РљР»РёРєРЅРё С‚РµРєСЃС‚ Рё РїРёС€Рё РїСЂСЏРјРѕ РЅР° СЃС‚СЂР°РЅРёС†Рµ. РљР»РёРєРЅРё С„РѕС‚РєСѓ вЂ” Р·Р°РіСЂСѓР·РёС€СЊ РЅРѕРІСѓСЋ. РЈ СЃСЃС‹Р»РѕРє РјРѕР¶РЅРѕ РјРµРЅСЏС‚СЊ URL С‚СѓС‚.';
    const seoFields = panel.querySelector('.cms-seo-fields');
    const hrefField = panel.querySelector('.cms-link-field');
    const hrefInput = panel.querySelector('[data-cms-href]');
    const altField = panel.querySelector('.cms-alt-field');
    const altInput = panel.querySelector('[data-cms-alt]');
    const historyFields = panel.querySelector('.cms-history-fields');
    const applyButton = panel.querySelector('[data-cms-apply]');
    const clearButton = panel.querySelector('[data-cms-clear]');
    applyButton.textContent = 'РџСЂРёРјРµРЅРёС‚СЊ';
    clearButton.hidden = false;
    seoFields.hidden = true;
    historyFields.hidden = true;
    hrefField.hidden = !el.dataset.cmsLinkKey && kind !== 'link';
    altField.hidden = !el.dataset.cmsImageKey && kind !== 'image';
    if (!hrefField.hidden) hrefInput.value = el.getAttribute('href') || '';
    if (!altField.hidden) altInput.value = el.getAttribute('alt') || '';
  }

  function applyPanelFields() {
    if (state.panel?.dataset.mode === 'seo') return applySeoFields();
    if (state.panel?.dataset.mode === 'history') return loadHistoryList();
    const selected = state.selected;
    if (!selected) return;
    const { el } = selected;
    const hrefInput = state.panel.querySelector('[data-cms-href]');
    const altInput = state.panel.querySelector('[data-cms-alt]');
    if (el.dataset.cmsLinkKey && !state.panel.querySelector('.cms-link-field').hidden) {
      const href = hrefInput.value.trim() || '#';
      el.setAttribute('href', href);
      setItem(el.dataset.cmsLinkKey, { type: 'link', href });
    }
    if (el.dataset.cmsImageKey && !state.panel.querySelector('.cms-alt-field').hidden) {
      const alt = altInput.value.trim();
      el.setAttribute('alt', alt);
      setItem(el.dataset.cmsImageKey, { type: 'image', alt });
    }
    toast('РџСЂРёРјРµРЅРµРЅРѕ, РЅРµ Р·Р°Р±СѓРґСЊ СЃРѕС…СЂР°РЅРёС‚СЊ');
  }

  function ensureMetaDescription() {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    return meta;
  }

  function showSeoPanel() {
    if (state.selected?.el) state.selected.el.classList.remove('cms-selected');
    state.selected = null;
    const panel = state.panel;
    panel.hidden = false;
    panel.dataset.mode = 'seo';
    panel.querySelector('[data-cms-panel-title]').textContent = 'SEO';
    panel.querySelector('[data-cms-panel-help]').textContent = 'Р­С‚Рѕ Р·Р°РіРѕР»РѕРІРѕРє РІРєР»Р°РґРєРё Рё РѕРїРёСЃР°РЅРёРµ РґР»СЏ Google/РЇРЅРґРµРєСЃР°. РќР° РґРёР·Р°Р№РЅ СЃС‚СЂР°РЅРёС†С‹ РЅРµ РІР»РёСЏРµС‚.';
    panel.querySelector('.cms-seo-fields').hidden = false;
    panel.querySelector('.cms-history-fields').hidden = true;
    panel.querySelector('.cms-link-field').hidden = true;
    panel.querySelector('.cms-alt-field').hidden = true;
    panel.querySelector('[data-cms-apply]').textContent = 'РџСЂРёРјРµРЅРёС‚СЊ';
    panel.querySelector('[data-cms-clear]').hidden = true;
    panel.querySelector('[data-cms-seo-title]').value = state.content.items?.['seo.title']?.text || document.title || '';
    panel.querySelector('[data-cms-seo-description]').value = state.content.items?.['seo.description']?.text || document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  }

  function applySeoFields() {
    const title = state.panel.querySelector('[data-cms-seo-title]').value.trim();
    const description = state.panel.querySelector('[data-cms-seo-description]').value.trim();
    if (title) document.title = title;
    ensureMetaDescription().setAttribute('content', description);
    setItem('seo.title', { type: 'seo', text: title });
    setItem('seo.description', { type: 'seo', text: description });
    toast('SEO РїСЂРёРјРµРЅРµРЅРѕ, РЅРµ Р·Р°Р±СѓРґСЊ СЃРѕС…СЂР°РЅРёС‚СЊ');
  }

  async function showHistoryPanel() {
    if (state.selected?.el) state.selected.el.classList.remove('cms-selected');
    state.selected = null;
    const panel = state.panel;
    panel.hidden = false;
    panel.dataset.mode = 'history';
    panel.querySelector('[data-cms-panel-title]').textContent = 'РСЃС‚РѕСЂРёСЏ РёР·РјРµРЅРµРЅРёР№';
    panel.querySelector('[data-cms-panel-help]').textContent = 'РљР°Р¶РґРѕРµ СЃРѕС…СЂР°РЅРµРЅРёРµ СЃРѕР·РґР°РµС‚ РІРµСЂСЃРёСЋ. РњРѕР¶РЅРѕ РѕС‚РєР°С‚РёС‚СЊСЃСЏ Рє Р»СЋР±РѕР№ С‚РѕС‡РєРµ, РєР°Рє РІ Git.';
    panel.querySelector('.cms-seo-fields').hidden = true;
    panel.querySelector('.cms-history-fields').hidden = false;
    panel.querySelector('.cms-link-field').hidden = true;
    panel.querySelector('.cms-alt-field').hidden = true;
    panel.querySelector('[data-cms-apply]').textContent = 'РћР±РЅРѕРІРёС‚СЊ';
    panel.querySelector('[data-cms-clear]').hidden = true;
    await loadHistoryList();
  }

  async function loadHistoryList() {
    const list = state.panel.querySelector('[data-cms-history-list]');
    list.innerHTML = '<p class="cms-history-empty">Р—Р°РіСЂСѓР¶Р°СЋ РІРµСЂСЃРёРё...</p>';
    try {
      const response = await fetch(`${HISTORY_URL}?t=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'history_failed');
      const items = Array.isArray(result.items) ? result.items : [];
      if (!items.length) {
        list.innerHTML = '<p class="cms-history-empty">РСЃС‚РѕСЂРёРё РїРѕРєР° РЅРµС‚. РћРЅР° РїРѕСЏРІРёС‚СЃСЏ РїРѕСЃР»Рµ РІС‚РѕСЂРѕРіРѕ СЃРѕС…СЂР°РЅРµРЅРёСЏ.</p>';
        return;
      }
      list.innerHTML = items.map((item, index) => {
        const id = typeof item === 'string' ? item : item.id;
        const date = typeof item === 'string' ? item.replace(/\.json$/, '') : (item.updatedAt || item.savedAt || item.id);
        const itemCount = typeof item === 'object' && Number.isFinite(item.itemCount) ? `${item.itemCount} РїСЂР°РІРѕРє` : 'РІРµСЂСЃРёСЏ';
        return `
          <article class="cms-history-item">
            <div>
              <strong>${index === 0 ? 'РџСЂРµРґС‹РґСѓС‰Р°СЏ РІРµСЂСЃРёСЏ' : `Р’РµСЂСЃРёСЏ ${index + 1}`}</strong>
              <span>${escapeHtml(formatHistoryDate(date))} В· ${escapeHtml(itemCount)}</span>
            </div>
            <button type="button" data-cms-restore="${escapeHtml(id)}">РћС‚РєР°С‚РёС‚СЊ</button>
          </article>
        `;
      }).join('');
    } catch (error) {
      list.innerHTML = `<p class="cms-history-empty">РќРµ Р·Р°РіСЂСѓР·РёР»РѕСЃСЊ: ${escapeHtml(error.message)}</p>`;
    }
  }

  async function restoreHistory(id) {
    if (!id) return;
    if (state.dirty && !confirm('Р•СЃС‚СЊ РЅРµСЃРѕС…СЂР°РЅРµРЅРЅС‹Рµ РїСЂР°РІРєРё. РћС‚РєР°С‚РёС‚СЊ Рё РїРѕС‚РµСЂСЏС‚СЊ РёС…?')) return;
    if (!confirm('РћС‚РєР°С‚РёС‚СЊ СЃР°Р№С‚ Рє РІС‹Р±СЂР°РЅРЅРѕР№ РІРµСЂСЃРёРё? РўРµРєСѓС‰Р°СЏ РІРµСЂСЃРёСЏ С‚РѕР¶Рµ СЃРѕС…СЂР°РЅРёС‚СЃСЏ РІ РёСЃС‚РѕСЂРёРё.')) return;
    document.body.classList.add('cms-saving');
    try {
      const response = await fetch(RESTORE_URL, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'restore_failed');
      state.dirty = false;
      toast('РћС‚РєР°С‚РёР». РћР±РЅРѕРІР»СЏСЋ...');
      setTimeout(() => location.reload(), 450);
    } catch (error) {
      toast(`РќРµ РѕС‚РєР°С‚РёР»РѕСЃСЊ: ${error.message}`);
    } finally {
      document.body.classList.remove('cms-saving');
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    const selected = state.selected;
    if (!file || !selected?.el?.dataset.cmsImageKey) return;
    document.body.classList.add('cms-saving');
    try {
      const dataUrl = await fileToDataUrl(file);
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, dataUrl }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'upload_failed');
      selected.el.setAttribute('src', result.path);
      setItem(selected.el.dataset.cmsImageKey, { type: 'image', src: result.path, alt: selected.el.getAttribute('alt') || '' });
      toast('РљР°СЂС‚РёРЅРєР° Р·Р°РіСЂСѓР¶РµРЅР°');
    } catch (error) {
      toast(`РќРµ Р·Р°РіСЂСѓР·РёР»РѕСЃСЊ: ${error.message}`);
    } finally {
      document.body.classList.remove('cms-saving');
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('read_failed'));
      reader.readAsDataURL(file);
    });
  }

  async function saveContent() {
    document.body.classList.add('cms-saving');
    if (state.saveButton) {
      state.saveButton.disabled = true;
      state.saveButton.textContent = 'РЎРѕС…СЂР°РЅСЏСЋ...';
    }
    try {
      state.content.updatedAt = new Date().toISOString();
      const response = await fetch(SAVE_URL, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.content),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'save_failed');
      state.dirty = false;
      if (state.saveButton) state.saveButton.textContent = 'РЎРѕС…СЂР°РЅРёС‚СЊ';
      toast('РЎРѕС…СЂР°РЅРµРЅРѕ');
    } catch (error) {
      toast(`РќРµ СЃРѕС…СЂР°РЅРёР»РѕСЃСЊ: ${error.message}`);
      if (state.saveButton) state.saveButton.textContent = 'РЎРѕС…СЂР°РЅРёС‚СЊ *';
    } finally {
      if (state.saveButton) state.saveButton.disabled = false;
      document.body.classList.remove('cms-saving');
    }
  }

  async function undoLastSave() {
    if (state.dirty && !confirm('Р•СЃС‚СЊ РЅРµСЃРѕС…СЂР°РЅРµРЅРЅС‹Рµ РїСЂР°РІРєРё. РћС‚РєР°С‚РёС‚СЊ Рє РїСЂРѕС€Р»РѕРјСѓ СЃРѕС…СЂР°РЅРµРЅРёСЋ?')) return;
    document.body.classList.add('cms-saving');
    if (state.undoButton) state.undoButton.disabled = true;
    try {
      const response = await fetch(UNDO_URL, { method: 'POST', credentials: 'same-origin' });
      const result = await response.json().catch(() => ({}));
      if (response.status === 409) {
        toast('РСЃС‚РѕСЂРёРё РїРѕРєР° РЅРµС‚');
        return;
      }
      if (!response.ok || !result.ok) throw new Error(result.error || 'undo_failed');
      state.dirty = false;
      toast('РћС‚РєР°С‚РёР». РћР±РЅРѕРІР»СЏСЋ...');
      setTimeout(() => location.reload(), 450);
    } catch (error) {
      toast(`РќРµ РѕС‚РєР°С‚РёР»РѕСЃСЊ: ${error.message}`);
    } finally {
      if (state.undoButton) state.undoButton.disabled = false;
      document.body.classList.remove('cms-saving');
    }
  }

  function clearSelectedOverride() {
    const selected = state.selected;
    if (!selected?.el) return;
    const keys = [selected.el.dataset.cmsTextKey, selected.el.dataset.cmsImageKey, selected.el.dataset.cmsLinkKey].filter(Boolean);
    keys.forEach(key => delete state.content.items[key]);
    markDirty();
    toast('РћРІРµСЂСЂР°Р№Рґ СѓРґР°Р»РµРЅ. РћР±РЅРѕРІРё СЃС‚СЂР°РЅРёС†Сѓ РїРѕСЃР»Рµ СЃРѕС…СЂР°РЅРµРЅРёСЏ.');
  }

  async function hasEditorAccess() {
    try {
      const response = await fetch(`${SESSION_URL}?t=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' });
      return response.ok;
    } catch {
      return false;
    }
  }

  ready(async () => {
    assignKeys();
    await loadContent();
    applyContent();
    if (editMode) {
      if (!await hasEditorAccess()) {
        if (!ADMIN_PATH_RE.test(location.pathname)) location.href = '/admin';
        return;
      }
      buildUi();
      setupEditing();
    }
  });
})();


