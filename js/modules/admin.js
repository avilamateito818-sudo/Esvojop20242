/* ═══════════════════════════════════════════════════════════
   ESVOJOP 2026 · SISTEMA LIVE CMS & GESTIÓN DE ADMINISTRADOR
   Arquitectura: Desacoplada, Persistente (LocalStorage)
   Sin sobreescritura de código (Non-Destructive Runtime Layer)
   Normativa: Accesibilidad WCAG 2.1 AA / W3C & Touch Targets >= 44px
   Versión: 4.0 Senior Elite (Compresión WebP/JPEG, SHA-256,
            Cobertura Total, Vista Previa y Restauración Selectiva)
   ═══════════════════════════════════════════════════════════ */

const EsvojopAdmin = (() => {
  'use strict';

  /* ── Constantes, Seguridad y Almacenamiento ── */
  const ADMIN_PASS_HASH = 'c7f558fec614b0fc0d9a6c39f4f2e284727fdb18de07bf677d93ebc57e4d7313';
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_MS = 30000;
  const STORAGE_QUOTA_KB = 5120; // ~5 MB estándar de localStorage

  const STORAGE_AUTH = 'esvojop_admin_auth';
  const STORAGE_LOCKOUT = 'esvojop_admin_lockout';
  const STORAGE_BLOCK_EDITS = 'esvojop_cms_blocks_v1';   // { [blockKey]: { title, badge, highlight, desc, img, btnText, btnHref } }
  const STORAGE_CUSTOM_ITEMS = 'esvojop_cms_items_v2';   // [ { id, pageId, targetSelector, category, title, badge, highlight, desc, img, btnText, btnHref, date }, ... ]
  const STORAGE_HIDDEN = 'esvojop_cms_hidden_v3';       // [ string | { key, label, pageId }, ... ]
  const STORAGE_GALLERY = 'esvojop_admin_gallery_v2';   // [ photoObj, ... ]
  const STORAGE_CARDS = 'esvojop_admin_cards_v2';       // [ cardObj, ... ]

  const BLOCK_SELECTOR = [
    '.top-bar',
    '.hero-content',
    '.stat-box',
    '.trial-card',
    '.cat-box',
    '.met-item',
    '.gallery-item',
    '.extra-card',
    '.store-card',
    '.product-card',
    '.team-card',
    '.contact-card',
    '.timeline-item',
    '.schedule-card',
    '.feature-card',
    '.review-card',
    '.guia-card',
    '.guia-step',
    '.phil-card',
    '.pos-card',
    '.cert-card',
    '.guide-item',
    '.step-card',
    '.loc-card',
    '.faq-item',
    '.stat-card',
    '.coach-card',
    '.category-card',
    '.card:not(.product-card)'
  ].join(', ');

  const NON_DELETABLE_CLASSES = ['top-bar', 'hero-content'];

  const GRID_CONFIGS = [
    { selector: '.gallery-grid', label: 'Galería', kind: 'gallery' },
    { selector: '.product-grid', label: 'Tienda / Productos', kind: 'product' },
    { selector: '.extra-grid', label: 'Contenido Extra', kind: 'extra' },
    { selector: '.cat-grid-modern', label: 'Categorías', kind: 'category' },
    { selector: '.met-grid', label: 'Metodología', kind: 'met' },
    { selector: '.contact-grid', label: 'Contacto', kind: 'contact' },
    { selector: '.grid-3', label: 'Tarjetas', kind: 'card' }
  ];

  let _isAdmin = sessionStorage.getItem(STORAGE_AUTH) === 'true';
  let _isPreview = false;
  let _failedAttempts = 0;
  let _lastFocusedTrigger = null;

  function isAdmin() {
    return _isAdmin;
  }

  /* ── SHA-256 Puro JS (Compatible con HTTP LAN, localhost, HTTPS y file://) ── */
  function sha256Hex(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const maxWord = Math.pow(2, 32);
    let result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;

    let hash = sha256Hex.h = sha256Hex.h || [];
    const k = sha256Hex.k = sha256Hex.k || [];
    let primeCounter = k.length;
    const isComposite = {};

    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    const bytes = new TextEncoder ? Array.from(new TextEncoder().encode(ascii)) : ascii.split('').map((c) => c.charCodeAt(0));
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);

    for (let i = 0; i < bytes.length; i++) {
      const j = bytes[i];
      if (j > 255) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength | 0;

    const hashCopy = hash.slice(0, 8);
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = hashCopy.slice(0);

      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const a = hashCopy[0];
        const e = hashCopy[4];
        const temp1 = hashCopy[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hashCopy[5]) ^ (~e & hashCopy[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0);
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hashCopy[1]) ^ (a & hashCopy[2]) ^ (hashCopy[1] & hashCopy[2]));

        hashCopy.unshift((temp1 + temp2) | 0);
        hashCopy[4] = (hashCopy[4] + temp1) | 0;
        hashCopy.pop();
      }
      for (let i = 0; i < 8; i++) {
        hashCopy[i] = (hashCopy[i] + oldHash[i]) | 0;
      }
    }

    for (let i = 0; i < 8; i++) {
      for (let j = 3; j + 1; j--) {
        const b = (hashCopy[i] >> (j * 8)) & 255;
        result += ((b < 16) ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  /* ── Compresión Automática de Imágenes (<canvas> Máx 1200px) ── */
  function compressImageFile(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Archivo de imagen no válido'));
        return;
      }

      // SVG se lee directo sin rasterizar
      if (file.type === 'image/svg+xml') {
        const svgReader = new FileReader();
        svgReader.onload = (ev) => resolve(ev.target.result);
        svgReader.onerror = () => reject(new Error('Error leyendo SVG'));
        svgReader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la fotografía'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Formato de imagen incompatible'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          let out = canvas.toDataURL('image/webp', quality);
          if (!out.startsWith('data:image/webp')) {
            out = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(out);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ── Cálculo de Espacio Utilizado en LocalStorage ── */
  function getStorageUsageInfo() {
    let totalBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('esvojop_')) {
          const v = localStorage.getItem(k) || '';
          totalBytes += (k.length + v.length) * 2;
        }
      }
    } catch {
      totalBytes = 0;
    }
    const usedKB = Math.round(totalBytes / 1024);
    const percent = Math.min(100, Math.round((usedKB / STORAGE_QUOTA_KB) * 100));
    return { usedKB, maxKB: STORAGE_QUOTA_KB, percent };
  }

  /* ── Notificaciones Toast Accesibles ── */
  function notify(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
    } else {
      let toast = document.querySelector('.toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(toast._hide);
      toast._hide = setTimeout(() => toast.classList.remove('show'), 3500);
    }
  }

  /* ── Utilidades Seguras de Almacenamiento ── */
  function getStored(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  function setStored(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        notify('⚠️ Memoria llena: elimina fotos antiguas o descarga un respaldo JSON');
      } else {
        console.error('Error guardando en almacenamiento local:', e);
      }
      return false;
    }
  }

  function normalizeHiddenEntry(entry) {
    if (typeof entry === 'string') {
      const pageId = entry.split('::')[0] || 'index';
      return { key: entry, label: entry, pageId };
    }
    return entry;
  }

  function getHiddenList() {
    return getStored(STORAGE_HIDDEN, []).map(normalizeHiddenEntry);
  }

  /* ── Identificador de Página Actual ── */
  function getPageId() {
    const path = window.location.pathname;
    const file = path.split('/').pop().replace(/\.html$/i, '') || 'index';
    return file.toLowerCase();
  }

  /* ── Generador Determinístico de Claves de Bloque CMS ── */
  function getBlockKey(el) {
    if (el.getAttribute('data-cms-block-id')) {
      return el.getAttribute('data-cms-block-id');
    }
    const pageId = getPageId();
    if (el.id) {
      const k = `${pageId}::id::${el.id}`;
      el.setAttribute('data-cms-block-id', k);
      return k;
    }

    const firstCls = el.className && typeof el.className === 'string'
      ? el.className.split(/\s+/).filter((c) => c && !c.startsWith('reveal') && !c.startsWith('admin-'))[0]
      : '';
    const query = el.tagName.toLowerCase() + (firstCls ? '.' + firstCls : '');
    const allSame = document.querySelectorAll(query);
    let idx = 0;
    for (let i = 0; i < allSame.length; i++) {
      if (allSame[i] === el) {
        idx = i;
        break;
      }
    }
    const k = `${pageId}::block::${firstCls || el.tagName.toLowerCase()}_${idx}`;
    el.setAttribute('data-cms-block-id', k);
    return k;
  }

  function getBlockReadableLabel(el) {
    const t = el.querySelector('h1, h2, h3, h4, h5, .trial-title, .card-title, .overlay span, .tb-badge');
    if (t && t.textContent.trim()) return t.textContent.trim().slice(0, 48);
    const p = el.querySelector('p');
    if (p && p.textContent.trim()) return p.textContent.trim().slice(0, 48);
    return 'Bloque del sitio';
  }

  /* ── Asignar Identificadores a Todos los Bloques y Tarjetas ── */
  function indexAllBlocks() {
    document.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
      getBlockKey(el);
    });
  }

  /* ── Aplicar Datos Editados a un Elemento del DOM ── */
  function applyDataToBlockEl(el, data) {
    const t = el.querySelector('h1, h2, h3, h4, h5, .trial-title, .stat-num, .card-title, .section-title, .ec-body h4, .overlay span');
    if (t && data.title) t.textContent = data.title;

    const b = el.querySelector('.badge, .trial-badge, .cat-box-badge, .tb-badge, .hero-tag, .ec-cat, .category, .section-tag, .subtitle, .tip');
    if (b && data.badge) b.textContent = data.badge;

    const h = el.querySelector('.price, .cat-box-age, .trial-price-tag, .stat-label');
    if (h && data.highlight) h.textContent = data.highlight;

    const d = el.querySelector('p, .lead, .card-text');
    if (d && data.desc) d.textContent = data.desc;

    const i = el.querySelector('img');
    if (i && data.img) i.src = data.img;

    const l = el.querySelector('a.btn, .btn, .top-bar a[href^="https://wa.me"]');
    if (l && data.btnText) {
      l.textContent = data.btnText;
      if (data.btnHref) l.setAttribute('href', data.btnHref);
    }
    el.setAttribute('data-cms-edited', 'true');
  }

  /* ── Aplicar Cambios Persistidos en el DOM (Al Cargar la Página) ── */
  function applyPersistedChanges() {
    const pageId = getPageId();

    // 1. Renderizar primero elementos personalizados ("colocar más cosas", fotos y tarjetas)
    renderStoredCustomItems();
    loadStoredCustomPhotos();
    loadStoredCustomCards();

    // 2. Aplicar ediciones de bloques (incluye los bloques recién renderizados)
    const blockEdits = getStored(STORAGE_BLOCK_EDITS, {});
    Object.keys(blockEdits).forEach((key) => {
      if (key.startsWith(pageId + '::')) {
        const el = document.querySelector(`[data-cms-block-id="${key.replace(/"/g, '\\"')}"]`);
        if (el) applyDataToBlockEl(el, blockEdits[key]);
      }
    });

    // 3. Ocultar elementos marcados como quitados
    const hiddenList = getHiddenList();
    hiddenList.forEach((entry) => {
      if (entry.key.startsWith(pageId + '::')) {
        const el = document.querySelector(`[data-cms-block-id="${entry.key.replace(/"/g, '\\"')}"]`);
        if (el) {
          el.style.display = 'none';
          el.setAttribute('data-cms-hidden', 'true');
        }
      }
    });
  }

  /* ── Renderizar Botones Visibles de Edición [✏️ Editar] y [🗑️ Quitar] ── */
  function renderBlockToolbars() {
    if (!_isAdmin) {
      document.querySelectorAll('.admin-block-toolbar, .admin-add-container').forEach((t) => t.remove());
      return;
    }

    document.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
      if (el.querySelector(':scope > .admin-block-toolbar')) return;

      const key = getBlockKey(el);
      const isNonDeletable = NON_DELETABLE_CLASSES.some((c) => el.classList.contains(c));
      const toolbar = document.createElement('div');
      toolbar.className = isNonDeletable ? 'admin-block-toolbar admin-block-toolbar--compact' : 'admin-block-toolbar';
      toolbar.setAttribute('role', 'toolbar');
      toolbar.setAttribute('aria-label', 'Controles de administrador');

      toolbar.innerHTML = `
        <button type="button" class="admin-btn-edit" aria-label="Editar contenido de este bloque" title="Editar">
          <span aria-hidden="true">✏️</span> Editar
        </button>
        ${isNonDeletable ? '' : `
        <button type="button" class="admin-btn-del" aria-label="Quitar este elemento del sitio" title="Quitar">
          <span aria-hidden="true">&times;</span>
        </button>`}
      `;

      if (!el.classList.contains('top-bar') && window.getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
      }

      toolbar.querySelector('.admin-btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        _lastFocusedTrigger = e.currentTarget;
        openBlockEditorModal(el);
      });

      const delBtn = toolbar.querySelector('.admin-btn-del');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          deleteBlockItem(el, key);
        });
      }

      el.appendChild(toolbar);
    });

    renderAddMoreButtons();
  }

  /* ── Botones "➕ Colocar más cosas aquí" en Todas las Cuadrículas Reales ── */
  function renderAddMoreButtons() {
    if (!_isAdmin) return;

    GRID_CONFIGS.forEach((cfg) => {
      const containers = document.querySelectorAll(cfg.selector);
      containers.forEach((container, idx) => {
        const marker = `${cfg.selector}__${idx}`;
        if (container.parentNode.querySelector(`.admin-add-container[data-for="${marker}"]`)) return;

        const wrap = document.createElement('div');
        wrap.className = 'admin-add-container';
        wrap.setAttribute('data-for', marker);
        wrap.innerHTML = `
          <button type="button" class="admin-btn-add-item" aria-label="Colocar más cosas en ${cfg.label}">
            <span aria-hidden="true">➕</span> Colocar más en ${cfg.label}
          </button>
        `;

        wrap.querySelector('.admin-btn-add-item').addEventListener('click', (e) => {
          e.preventDefault();
          _lastFocusedTrigger = e.currentTarget;
          openBlockEditorModal(null, true, cfg.selector, cfg.kind);
        });

        if (container.nextSibling) {
          container.parentNode.insertBefore(wrap, container.nextSibling);
        } else {
          container.parentNode.appendChild(wrap);
        }
      });
    });
  }

  /* ── Modal Accesible para Editar Contenido o Colocar Más Cosas ── */
  function openBlockEditorModal(blockEl, isNew = false, targetSelector = null, gridKind = 'extra') {
    let currentTitle = '';
    let currentBadge = '';
    let currentHighlight = '';
    let currentDesc = '';
    let currentImg = '';
    let currentBtn = '';
    let currentHref = '';
    let currentCategory = 'ropa';

    let hasTitle = true;
    let hasBadge = true;
    let hasHighlight = isNew && (gridKind === 'product' || gridKind === 'category');
    let hasDesc = true;
    let hasImg = isNew || false;
    let hasBtn = isNew && (gridKind === 'product' || gridKind === 'category');

    if (blockEl && !isNew) {
      const titleEl = blockEl.querySelector('h1, h2, h3, h4, h5, .trial-title, .stat-num, .card-title, .section-title, .ec-body h4, .overlay span');
      if (titleEl) currentTitle = titleEl.textContent.trim();
      else hasTitle = false;

      const badgeEl = blockEl.querySelector('.badge, .trial-badge, .cat-box-badge, .tb-badge, .hero-tag, .ec-cat, .category, .section-tag, .subtitle, .tip');
      if (badgeEl) currentBadge = badgeEl.textContent.trim();
      else hasBadge = false;

      const highEl = blockEl.querySelector('.price, .cat-box-age, .trial-price-tag, .stat-label');
      if (highEl) {
        currentHighlight = highEl.textContent.trim();
        hasHighlight = true;
      }

      const descEl = blockEl.querySelector('p, .lead, .card-text');
      if (descEl) currentDesc = descEl.textContent.trim();
      else hasDesc = false;

      const imgEl = blockEl.querySelector('img');
      if (imgEl) {
        currentImg = imgEl.src;
        hasImg = true;
      }

      const linkEl = blockEl.querySelector('a.btn, .btn, .top-bar a[href^="https://wa.me"]');
      if (linkEl) {
        currentBtn = linkEl.textContent.trim();
        currentHref = linkEl.getAttribute('href') || '';
        hasBtn = true;
      }
    }

    const modalTitle = isNew ? 'Colocar <span>Nuevo Elemento</span>' : 'Editar <span>Contenido</span>';

    const formHtml = `
      <form class="ac-form" id="blockEditorForm" role="form" aria-label="Formulario de edición de contenido">
        ${hasTitle ? `
        <div class="ac-field">
          <label for="cms-field-title">Título o Encabezado Principal</label>
          <input type="text" id="cms-field-title" name="title" value="${escapeHtml(currentTitle)}" placeholder="Ej: Camiseta Oficial / Torneo Departamental" required class="ac-input" autofocus>
        </div>` : ''}

        ${hasBadge ? `
        <div class="ac-field">
          <label for="cms-field-badge">Etiqueta, Subtítulo o Categoría</label>
          <input type="text" id="cms-field-badge" name="badge" value="${escapeHtml(currentBadge)}" placeholder="Ej: Oficial ESVOJOP · 2026" class="ac-input">
        </div>` : ''}

        ${hasHighlight ? `
        <div class="ac-field">
          <label for="cms-field-highlight">Precio, Edad o Dato Destacado</label>
          <input type="text" id="cms-field-highlight" name="highlight" value="${escapeHtml(currentHighlight)}" placeholder="Ej: $85.000 COP o 12 a 16 Años" class="ac-input">
        </div>` : ''}

        ${isNew && gridKind === 'product' ? `
        <div class="ac-field">
          <label for="cms-field-cat-filter">Filtro de Tienda</label>
          <select id="cms-field-cat-filter" class="ac-input" style="cursor:pointer; min-height:44px;">
            <option value="ropa">👕 Uniformes & Ropa</option>
            <option value="balones">🏐 Balones</option>
            <option value="calzado">👟 Calzado</option>
            <option value="accesorios">🦵 Accesorios</option>
          </select>
        </div>` : ''}

        ${isNew && gridKind === 'gallery' ? `
        <div class="ac-field">
          <label for="cms-field-cat-filter">Categoría de Galería</label>
          <select id="cms-field-cat-filter" class="ac-input" style="cursor:pointer; min-height:44px;">
            <option value="partidos">🏆 Partidos & Torneos</option>
            <option value="entrenamientos">🏐 Entrenamientos IRDET</option>
            <option value="comunidad">🤝 Comunidad & Equipo</option>
          </select>
        </div>` : ''}

        ${hasDesc ? `
        <div class="ac-field">
          <label for="cms-field-desc">Descripción o Texto</label>
          <textarea id="cms-field-desc" name="desc" rows="3" placeholder="Escribe la descripción detallada..." class="ac-input" style="resize:vertical;">${escapeHtml(currentDesc)}</textarea>
        </div>` : ''}

        ${hasImg ? `
        <div class="ac-field">
          <label for="cms-field-file">Fotografía (Comprimida automáticamente para ahorrar espacio)</label>
          <input type="file" id="cms-field-file" accept="image/*" class="ac-input ac-file-input">
          <input type="text" id="cms-field-url" placeholder="O pega un enlace URL (https://...)" value="${escapeHtml(currentImg)}" class="ac-input" style="margin-top:0.4rem; font-size:0.85rem;">
        </div>
        <div class="ac-preview-box" id="cmsImgPreviewBox" style="${currentImg ? 'display:block;' : 'display:none;'} margin-top:0.3rem;">
          <img id="cmsImgPreview" src="${currentImg || ''}" alt="Vista previa de imagen">
        </div>` : ''}

        ${hasBtn ? `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem;">
          <div class="ac-field">
            <label for="cms-field-btn">Texto del Botón</label>
            <input type="text" id="cms-field-btn" name="btnText" value="${escapeHtml(currentBtn)}" placeholder="Ej: Pedir por WhatsApp" class="ac-input">
          </div>
          <div class="ac-field">
            <label for="cms-field-href">Enlace / WhatsApp</label>
            <input type="text" id="cms-field-href" name="btnHref" value="${escapeHtml(currentHref)}" placeholder="https://wa.me/573103434293..." class="ac-input">
          </div>
        </div>` : ''}

        <div class="ac-actions" style="margin-top:0.8rem; display:flex; gap:0.6rem;">
          <button type="submit" class="btn btn-secondary btn-shine btn-block" style="min-height:44px;">
            💾 Guardar en la Página
          </button>
          <button type="button" class="btn btn-outline ac-btn-cancel" style="min-height:44px;">
            ✕ Cancelar
          </button>
        </div>
      </form>
    `;

    const modal = createModal(modalTitle, formHtml);
    const form = modal.querySelector('#blockEditorForm');
    const fileInput = modal.querySelector('#cms-field-file');
    const urlInput = modal.querySelector('#cms-field-url');
    const previewBox = modal.querySelector('#cmsImgPreviewBox');
    const previewImg = modal.querySelector('#cmsImgPreview');
    const cancelBtn = modal.querySelector('.ac-btn-cancel');

    let chosenImgSrc = currentImg;

    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        try {
          notify('⚙️ Optimizando imagen...');
          chosenImgSrc = await compressImageFile(file);
          previewImg.src = chosenImgSrc;
          previewBox.style.display = 'block';
          if (urlInput) urlInput.value = '';
          notify('✅ Imagen optimizada lista para guardar');
        } catch (err) {
          alert(err.message || 'No se pudo procesar la imagen');
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', () => {
        const val = urlInput.value.trim();
        if (val) {
          chosenImgSrc = val;
          previewImg.src = chosenImgSrc;
          previewBox.style.display = 'block';
        }
      });
    }

    cancelBtn.addEventListener('click', () => closeModalWithFocus(modal));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const newTitle = modal.querySelector('#cms-field-title')?.value.trim() || '';
      const newBadge = modal.querySelector('#cms-field-badge')?.value.trim() || '';
      const newHighlight = modal.querySelector('#cms-field-highlight')?.value.trim() || '';
      const newDesc = modal.querySelector('#cms-field-desc')?.value.trim() || '';
      const newBtnText = modal.querySelector('#cms-field-btn')?.value.trim() || '';
      const newBtnHref = modal.querySelector('#cms-field-href')?.value.trim() || '';
      const filterCat = modal.querySelector('#cms-field-cat-filter')?.value || currentCategory;

      if (isNew) {
        const newItem = {
          id: 'custom_item_' + Date.now(),
          pageId: getPageId(),
          targetSelector,
          kind: gridKind,
          category: filterCat,
          title: newTitle,
          badge: newBadge,
          highlight: newHighlight,
          desc: newDesc,
          img: chosenImgSrc || 'img/fotos/imagines/WhatsApp%20Image%202026-04-20%20at%204.32.25%20PM.jpeg',
          btnText: newBtnText,
          btnHref: newBtnHref,
          date: new Date().toLocaleDateString('es-CO')
        };

        const list = getStored(STORAGE_CUSTOM_ITEMS, []);
        list.unshift(newItem);
        if (!setStored(STORAGE_CUSTOM_ITEMS, list)) return;

        renderSingleCustomItem(newItem);
        notify('✨ Nuevo elemento colocado y guardado');
      } else if (blockEl) {
        const edits = getStored(STORAGE_BLOCK_EDITS, {});
        const key = getBlockKey(blockEl);
        edits[key] = {
          title: newTitle,
          badge: newBadge,
          highlight: newHighlight,
          desc: newDesc,
          img: chosenImgSrc,
          btnText: newBtnText,
          btnHref: newBtnHref
        };
        if (!setStored(STORAGE_BLOCK_EDITS, edits)) return;

        applyDataToBlockEl(blockEl, edits[key]);
        blockEl.classList.add('cms-saved-flash');
        setTimeout(() => blockEl.classList.remove('cms-saved-flash'), 800);
        notify('💾 Cambios guardados con éxito en la página');
      }

      closeModalWithFocus(modal);
      updateHud();
      renderBlockToolbars();
    });
  }

  /* ── Quitar / Ocultar Bloque Accesiblemente ── */
  function deleteBlockItem(el, key) {
    const label = getBlockReadableLabel(el);
    if (confirm(`🗑️ ¿Deseas quitar "${label}" de la página?\n(Puedes restaurarlo individualmente desde "Cambios" cuando quieras).`)) {
      el.style.transition = 'all 0.35s ease';
      el.style.transform = 'scale(0.85) translateY(-10px)';
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.display = 'none';
        el.setAttribute('data-cms-hidden', 'true');

        const hiddenList = getHiddenList();
        if (!hiddenList.some((item) => item.key === key)) {
          hiddenList.push({ key, label, pageId: getPageId() });
          setStored(STORAGE_HIDDEN, hiddenList);
        }
        notify('🗑️ Elemento quitado y guardado');
        updateHud();
      }, 350);
    }
  }

  /* ── Renderizar Elementos Personalizados con Plantillas Nativas ── */
  function buildCustomItemElement(item) {
    const el = document.createElement('div');
    el.setAttribute('data-custom-item-id', item.id);
    el.setAttribute('data-cms-block-id', `${getPageId()}::custom_item::${item.id}`);

    const safeTitle = escapeHtml(item.title);
    const safeBadge = escapeHtml(item.badge);
    const safeHighlight = escapeHtml(item.highlight);
    const safeDesc = escapeHtml(item.desc);
    const safeBtn = escapeHtml(item.btnText);
    const safeHref = escapeHtml(item.btnHref || '#');

    if (item.kind === 'gallery') {
      el.className = 'gallery-item reveal-scale visible custom-cms-block';
      el.setAttribute('data-category', item.category || 'partidos');
      el.innerHTML = `
        <img src="${item.img}" alt="${safeTitle}" loading="lazy">
        <div class="overlay"><span>${safeTitle}</span></div>
      `;
    } else if (item.kind === 'product') {
      el.className = 'card product-card reveal visible custom-cms-block';
      el.setAttribute('data-category', item.category || 'ropa');
      el.innerHTML = `
        <div class="img-wrap">
          <img src="${item.img}" alt="${safeTitle}" loading="lazy">
          ${safeBadge ? `<span class="badge">${safeBadge}</span>` : ''}
        </div>
        <div class="info">
          <h4>${safeTitle}</h4>
          ${safeDesc ? `<div class="category">${safeDesc}</div>` : ''}
          ${safeHighlight ? `<div class="price">${safeHighlight}</div>` : ''}
          ${safeBtn ? `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="margin-top:0.75rem;display:flex;align-items:center;justify-content:center;gap:0.4rem;text-decoration:none;">${safeBtn}</a>` : ''}
        </div>
      `;
    } else if (item.kind === 'category') {
      el.className = 'cat-box reveal-scale visible custom-cms-block';
      el.innerHTML = `
        ${safeBadge ? `<span class="cat-box-badge">${safeBadge}</span>` : ''}
        <div class="cat-box-img-wrap">
          <img src="${item.img}" alt="${safeTitle}" class="cat-box-img" loading="lazy">
        </div>
        <div class="cat-box-body">
          ${safeHighlight ? `<div class="cat-box-age">${safeHighlight}</div>` : ''}
          <h3>${safeTitle}</h3>
          ${safeDesc ? `<p style="font-size:0.85rem;color:var(--gray);line-height:1.6;">${safeDesc}</p>` : ''}
          ${safeBtn ? `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">${safeBtn}</a>` : ''}
        </div>
      `;
    } else if (item.kind === 'met') {
      el.className = 'met-item reveal-scale visible custom-cms-block';
      el.innerHTML = `
        <div class="met-icon">🏐</div>
        <h4>${safeTitle}</h4>
        ${safeDesc ? `<p>${safeDesc}</p>` : ''}
      `;
    } else {
      el.className = 'extra-card reveal visible custom-cms-block';
      el.innerHTML = `
        <div class="ec-overlay"></div>
        <img src="${item.img}" alt="${safeTitle}" class="ec-img" loading="lazy">
        <div class="ec-body">
          ${safeBadge ? `<div class="ec-cat">${safeBadge}</div>` : ''}
          <h4>${safeTitle}</h4>
          ${safeDesc ? `<p style="color:var(--gray-light); font-size:0.85rem; margin-top:0.4rem;">${safeDesc}</p>` : ''}
          ${safeBtn ? `<a href="${safeHref}" class="btn btn-secondary btn-sm" style="margin-top:0.6rem; display:inline-block;">${safeBtn}</a>` : ''}
        </div>
      `;
    }
    return el;
  }

  function renderSingleCustomItem(item) {
    if (item.pageId !== getPageId()) return;
    const targetContainer = document.querySelector(item.targetSelector);
    if (!targetContainer) return;
    if (targetContainer.querySelector(`[data-custom-item-id="${item.id}"]`)) return;

    const el = buildCustomItemElement(item);
    targetContainer.insertBefore(el, targetContainer.firstChild);
    if (_isAdmin) renderBlockToolbars();
  }

  function renderStoredCustomItems() {
    const list = getStored(STORAGE_CUSTOM_ITEMS, []);
    list.forEach((item) => renderSingleCustomItem(item));
  }

  /* ── Modo Vista Previa Visitante ── */
  function togglePreviewMode(force) {
    _isPreview = typeof force === 'boolean' ? force : !_isPreview;
    document.body.classList.toggle('admin-preview-mode', _isPreview);
    notify(_isPreview ? '👁️ Vista Previa: viendo la página como visitante' : '✏️ Volviste al Modo Edición');
    updateHud();
  }

  /* ── Modal Base Accesible (WCAG 2.1 AA / W3C) ── */
  function createModal(titleHtml, contentHtml) {
    const existing = document.querySelector('.ac-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'ac-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'acModalMainTitle');

    overlay.innerHTML = `
      <div class="ac-modal-box">
        <div class="ac-modal-glow" aria-hidden="true"></div>
        <button type="button" class="ac-modal-close" aria-label="Cerrar ventana emergente" title="Cerrar (Esc)">&times;</button>
        <div class="ac-modal-header">
          <div class="live-status-beacon" style="margin-bottom:0.6rem;">
            <span class="beacon-dot-wrap" aria-hidden="true">
              <span class="beacon-pulse"></span>
              <span class="beacon-dot"></span>
            </span>
            <span>Seguridad & Edición ESVOJOP 2026</span>
          </div>
          <h3 class="ac-title" id="acModalMainTitle">${titleHtml}</h3>
        </div>
        <div class="ac-modal-body">
          ${contentHtml}
        </div>
      </div>
    `;

    overlay.querySelector('.ac-modal-close').addEventListener('click', () => closeModalWithFocus(overlay));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModalWithFocus(overlay);
    });

    const escListener = (e) => {
      if (e.key === 'Escape') {
        closeModalWithFocus(overlay);
        document.removeEventListener('keydown', escListener);
      }
    };
    document.addEventListener('keydown', escListener);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    setTimeout(() => {
      const firstInput = overlay.querySelector('input:not([type="hidden"]):not([readonly]), textarea, button.btn-secondary');
      if (firstInput) firstInput.focus();
    }, 100);

    return overlay;
  }

  function closeModalWithFocus(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    setTimeout(() => {
      modalEl.remove();
      if (_lastFocusedTrigger && typeof _lastFocusedTrigger.focus === 'function') {
        _lastFocusedTrigger.focus();
      }
    }, 250);
  }

  /* ── Modal de Inicio de Sesión Administrador con SHA-256 + Lockout ── */
  function showLoginModal() {
    const formHtml = `
      <form class="ac-form" id="adminLoginForm" role="form" aria-label="Formulario de inicio de sesión de administrador">
        <div class="ac-field">
          <label for="adm-user">Usuario Oficial del Club</label>
          <input type="text" id="adm-user" name="username" value="esvojop" readonly class="ac-input ac-readonly">
        </div>
        <div class="ac-field">
          <label for="adm-pass">Clave de Acceso</label>
          <div class="ac-pass-wrap">
            <input type="password" id="adm-pass" name="password" placeholder="Ingresa la contraseña..." required autofocus class="ac-input" style="min-height:44px;">
            <button type="button" class="ac-eye-btn" aria-label="Ver u ocultar contraseña" style="min-height:44px; min-width:44px;">👁️</button>
          </div>
        </div>
        <div class="ac-actions">
          <button type="submit" class="btn btn-secondary btn-shine btn-block" style="min-height:44px;">⚡ Desbloquear Panel</button>
        </div>
        <div class="ac-hint">Acceso restringido para el cuerpo directivo de ESVOJOP.</div>
      </form>
    `;

    const modal = createModal('Acceso <span>Administrador</span>', formHtml);
    const form = modal.querySelector('#adminLoginForm');
    const eyeBtn = modal.querySelector('.ac-eye-btn');
    const passInput = modal.querySelector('#adm-pass');

    eyeBtn.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      eyeBtn.textContent = isPass ? '🙈' : '👁️';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const lockUntil = parseInt(sessionStorage.getItem(STORAGE_LOCKOUT) || '0', 10);
      const now = Date.now();
      let err = form.querySelector('.ac-error-msg');
      const showError = (msg) => {
        if (!err) {
          err = document.createElement('p');
          err.className = 'ac-error-msg';
          form.insertBefore(err, form.querySelector('.ac-actions'));
        }
        err.textContent = msg;
      };

      if (lockUntil > now) {
        const secs = Math.ceil((lockUntil - now) / 1000);
        showError(`⏳ Demasiados intentos fallidos. Espera ${secs}s para reintentar.`);
        return;
      }

      const val = passInput.value.trim();
      if (sha256Hex(val) === ADMIN_PASS_HASH) {
        _failedAttempts = 0;
        sessionStorage.removeItem(STORAGE_LOCKOUT);
        setAdmin(true);
        closeModalWithFocus(modal);
      } else {
        _failedAttempts++;
        passInput.classList.add('ac-input-error');
        passInput.value = '';
        passInput.focus();
        if (_failedAttempts >= MAX_LOGIN_ATTEMPTS) {
          sessionStorage.setItem(STORAGE_LOCKOUT, String(Date.now() + LOCKOUT_MS));
          _failedAttempts = 0;
          showError('🔒 Bloqueo temporal de 30s por múltiples intentos fallidos.');
        } else {
          showError(`❌ Contraseña incorrecta (${MAX_LOGIN_ATTEMPTS - _failedAttempts} intentos restantes).`);
        }
      }
    });
  }

  /* ── Barra de Control Flotante Exclusiva (Admin HUD Bar) ── */
  function updateHud() {
    let hud = document.getElementById('esvojopAdminHud');
    if (!_isAdmin) {
      if (hud) hud.remove();
      return;
    }

    const blockEdits = getStored(STORAGE_BLOCK_EDITS, {});
    const customItems = getStored(STORAGE_CUSTOM_ITEMS, []);
    const hidden = getHiddenList();
    const totalChanges = Object.keys(blockEdits).length + customItems.length + hidden.length;

    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'esvojopAdminHud';
      hud.className = 'admin-hud reveal';
      hud.setAttribute('role', 'region');
      hud.setAttribute('aria-label', 'Barra de herramientas de administrador');
      document.body.appendChild(hud);
    }

    if (_isPreview) {
      hud.innerHTML = `
        <div class="hud-left">
          <span class="hud-logo">👁️ VISTA PREVIA VISITANTE</span>
        </div>
        <div class="hud-actions">
          <button type="button" class="hud-btn admin-hud-btn-active" id="hudPreviewToggle" style="min-height:44px;">
            ✏️ Volver a Editar
          </button>
        </div>
      `;
      hud.querySelector('#hudPreviewToggle').addEventListener('click', () => togglePreviewMode(false));
      return;
    }

    hud.innerHTML = `
      <div class="hud-left">
        <span class="hud-logo">🏐 ESVOJOP · ADMIN</span>
        <span class="hud-status"><span class="hud-pulse" aria-hidden="true"></span> Modo Edición</span>
      </div>
      <div class="hud-actions" role="toolbar" aria-label="Herramientas globales">
        <button type="button" class="hud-btn" id="hudPreviewToggle" title="Ver la página exactamente como visitante">
          <span aria-hidden="true">👁️</span> Vista Previa
        </button>
        <button type="button" class="hud-btn" id="hudAddPhoto" title="Añadir fotografía a la galería">
          <span aria-hidden="true">📸</span> + Galería
        </button>
        <button type="button" class="hud-btn" id="hudChangesMgr" title="Centro de restauración y control de cambios">
          <span aria-hidden="true">⏪</span> Cambios (${totalChanges})
        </button>
        <button type="button" class="hud-btn" id="hudBackup" title="Descargar copia de seguridad JSON">
          <span aria-hidden="true">💾</span> Respaldo
        </button>
        <button type="button" class="hud-btn hud-btn-danger" id="hudLogout" title="Cerrar sesión de administrador">
          <span aria-hidden="true">🔒</span> Salir
        </button>
      </div>
    `;

    hud.querySelector('#hudPreviewToggle').addEventListener('click', () => togglePreviewMode(true));
    hud.querySelector('#hudAddPhoto').addEventListener('click', (e) => {
      _lastFocusedTrigger = e.currentTarget;
      openAddPhotoModal();
    });
    hud.querySelector('#hudChangesMgr').addEventListener('click', (e) => {
      _lastFocusedTrigger = e.currentTarget;
      openChangesManagerModal();
    });
    hud.querySelector('#hudBackup').addEventListener('click', () => downloadBackup());
    hud.querySelector('#hudLogout').addEventListener('click', () => setAdmin(false));
  }

  /* ── Modal Gestor de Cambios, Medidor de Memoria y Restauración Selectiva ── */
  function openChangesManagerModal() {
    const pageId = getPageId();
    const blockEdits = getStored(STORAGE_BLOCK_EDITS, {});
    const customItems = getStored(STORAGE_CUSTOM_ITEMS, []);
    const hidden = getHiddenList();
    const usage = getStorageUsageInfo();

    const pageEditsKeys = Object.keys(blockEdits).filter((k) => k.startsWith(pageId + '::'));
    const pageHiddenItems = hidden.filter((h) => h.key.startsWith(pageId + '::'));
    const pageCustomItems = customItems.filter((i) => i.pageId === pageId);

    const hiddenRowsHtml = pageHiddenItems.length > 0
      ? pageHiddenItems.map((h) => `
          <div class="cms-restore-row">
            <span>🗑️ ${escapeHtml(h.label)}</span>
            <button type="button" class="hud-btn cms-restore-one-hidden" data-key="${escapeHtml(h.key)}" style="min-height:36px; padding:0.25rem 0.7rem;">↩️ Mostrar</button>
          </div>`).join('')
      : '<p style="font-size:0.8rem; color:var(--gray); margin:0;">No hay elementos quitados en esta página.</p>';

    const editedRowsHtml = pageEditsKeys.length > 0
      ? pageEditsKeys.map((k) => {
          const titleLabel = blockEdits[k]?.title || k.split('::').pop();
          return `
          <div class="cms-restore-row">
            <span>✏️ ${escapeHtml(String(titleLabel).slice(0, 42))}</span>
            <button type="button" class="hud-btn cms-restore-one-edit" data-key="${escapeHtml(k)}" style="min-height:36px; padding:0.25rem 0.7rem;">🔄 Revertir</button>
          </div>`;
        }).join('')
      : '<p style="font-size:0.8rem; color:var(--gray); margin:0;">No hay textos/fotos editados en esta página.</p>';

    const contentHtml = `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <div class="cms-summary-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <span style="font-size:0.82rem; font-weight:700; color:var(--yellow);">MEMORIA DE CAMBIOS (${usage.usedKB} KB / ${usage.maxKB} KB)</span>
            <span style="font-size:0.8rem; font-weight:700; color:#00e676;">${usage.percent}%</span>
          </div>
          <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden;">
            <div style="width:${usage.percent}%; height:100%; background:${usage.percent > 80 ? '#ff5252' : 'linear-gradient(90deg, #00e676, var(--yellow))'}; transition:width 0.3s ease;"></div>
          </div>
          <div style="margin-top:0.7rem; font-size:0.8rem; color:var(--gray-light); display:flex; gap:0.8rem; flex-wrap:wrap;">
            <span>✏️ ${pageEditsKeys.length} editados</span>
            <span>🗑️ ${pageHiddenItems.length} quitados</span>
            <span>➕ ${pageCustomItems.length} nuevos</span>
          </div>
        </div>

        <div class="cms-restore-section">
          <h4 style="font-size:0.82rem; text-transform:uppercase; color:var(--yellow); margin:0 0 0.5rem 0;">Elementos Quitados (Restaurar Uno por Uno)</h4>
          <div class="cms-restore-list">${hiddenRowsHtml}</div>
        </div>

        <div class="cms-restore-section">
          <h4 style="font-size:0.82rem; text-transform:uppercase; color:var(--yellow); margin:0 0 0.5rem 0;">Bloques Editados en ${pageId.toUpperCase()}</h4>
          <div class="cms-restore-list">${editedRowsHtml}</div>
        </div>

        <div style="display:flex; gap:0.6rem; flex-wrap:wrap;">
          <button type="button" id="btnExportJSON" class="btn btn-secondary btn-block" style="flex:1; font-size:0.8rem; padding:0.65rem; min-height:44px;">
            💾 Respaldo JSON
          </button>
          <label class="btn btn-primary btn-block" style="flex:1; font-size:0.8rem; padding:0.65rem; min-height:44px; text-align:center; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            📥 Importar JSON
            <input type="file" id="btnImportJSON" accept=".json" style="display:none;">
          </label>
        </div>

        <button type="button" id="btnResetAll" class="hud-btn hud-btn-danger" style="width:100%; justify-content:center; padding:0.65rem; min-height:44px;">
          ⚠️ Restablecer Todo el Sitio a Fábrica
        </button>
      </div>
    `;

    const modal = createModal('Centro de <span>Cambios & Memoria</span>', contentHtml);

    // Restaurar individualmente un elemento quitado
    modal.querySelectorAll('.cms-restore-one-hidden').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        const remaining = getHiddenList().filter((h) => h.key !== key);
        setStored(STORAGE_HIDDEN, remaining);
        const el = document.querySelector(`[data-cms-block-id="${key.replace(/"/g, '\\"')}"]`);
        if (el) {
          el.style.display = '';
          el.removeAttribute('data-cms-hidden');
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
        notify('↩️ Elemento restaurado');
        closeModalWithFocus(modal);
        updateHud();
        renderBlockToolbars();
      });
    });

    // Revertir individualmente un bloque editado
    modal.querySelectorAll('.cms-restore-one-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        const edits = getStored(STORAGE_BLOCK_EDITS, {});
        delete edits[key];
        setStored(STORAGE_BLOCK_EDITS, edits);
        notify('🔄 Cambio revertido. Actualizando vista...');
        setTimeout(() => window.location.reload(), 500);
      });
    });

    // Reset total
    modal.querySelector('#btnResetAll').addEventListener('click', () => {
      if (confirm('⚠️ ¿Estás seguro de borrar todas las modificaciones, elementos colocados y fotos agregadas?\n\nEsto devuelve el sitio al estado original de fábrica.')) {
        localStorage.removeItem(STORAGE_BLOCK_EDITS);
        localStorage.removeItem(STORAGE_CUSTOM_ITEMS);
        localStorage.removeItem(STORAGE_HIDDEN);
        localStorage.removeItem(STORAGE_GALLERY);
        localStorage.removeItem(STORAGE_CARDS);
        notify('♻️ Sitio restablecido a su estado de fábrica');
        setTimeout(() => window.location.reload(), 700);
      }
    });

    modal.querySelector('#btnExportJSON').addEventListener('click', () => downloadBackup());

    modal.querySelector('#btnImportJSON').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const data = JSON.parse(ev.target.result);
            if (data.blockEdits) setStored(STORAGE_BLOCK_EDITS, data.blockEdits);
            if (data.customItems) setStored(STORAGE_CUSTOM_ITEMS, data.customItems);
            if (data.hidden) setStored(STORAGE_HIDDEN, data.hidden);
            if (data.photos) setStored(STORAGE_GALLERY, data.photos);
            if (data.cards) setStored(STORAGE_CARDS, data.cards);
            notify('📥 Respaldo importado. Recargando sitio...');
            setTimeout(() => window.location.reload(), 700);
          } catch {
            alert('❌ Archivo de respaldo no válido.');
          }
        };
        reader.readAsText(file);
      }
    });
  }

  /* ── Descargar Copia de Seguridad JSON ── */
  function downloadBackup() {
    const backupData = {
      club: 'ESVOJOP 2026',
      exportDate: new Date().toISOString(),
      blockEdits: getStored(STORAGE_BLOCK_EDITS, {}),
      customItems: getStored(STORAGE_CUSTOM_ITEMS, []),
      hidden: getHiddenList(),
      photos: getStored(STORAGE_GALLERY, []),
      cards: getStored(STORAGE_CARDS, [])
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESVOJOP_Copia_Completa_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('💾 Copia de respaldo descargada');
  }

  /* ── Modal de Añadir Fotografía a Galería con Compresión ── */
  function openAddPhotoModal() {
    const formHtml = `
      <form class="ac-form" id="addPhotoForm" role="form" aria-label="Añadir foto a galería">
        <div class="ac-field">
          <label for="photo-title">Título o Descripción de la Fotografía</label>
          <input type="text" id="photo-title" name="title" placeholder="Ej: Torneo Departamental de Menores Tunja" required class="ac-input" autofocus>
        </div>
        <div class="ac-field">
          <label for="photo-cat">Categoría Deportiva</label>
          <select id="photo-cat" name="category" class="ac-input" style="cursor:pointer; min-height:44px;">
            <option value="partidos">🏆 Partidos & Torneos</option>
            <option value="entrenamientos">🏐 Entrenamientos IRDET</option>
            <option value="comunidad">🤝 Comunidad & Equipo</option>
          </select>
        </div>
        <div class="ac-field">
          <label for="photo-file">Seleccionar Fotografía (Se optimiza automáticamente)</label>
          <input type="file" id="photo-file" accept="image/*" required class="ac-input ac-file-input">
        </div>
        <div class="ac-preview-box" id="photoPreviewBox" style="display:none;">
          <img id="photoPreviewImg" alt="Vista previa">
        </div>
        <div class="ac-actions" style="margin-top:0.8rem;">
          <button type="submit" class="btn btn-secondary btn-shine btn-block" style="min-height:44px;">
            🚀 Publicar en Galería
          </button>
        </div>
      </form>
    `;

    const modal = createModal('Añadir Foto a <span>Galería</span>', formHtml);
    const form = modal.querySelector('#addPhotoForm');
    const fileInput = modal.querySelector('#photo-file');
    const previewBox = modal.querySelector('#photoPreviewBox');
    const previewImg = modal.querySelector('#photoPreviewImg');

    let compressedUrl = '';

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        notify('⚙️ Comprimiendo fotografía...');
        compressedUrl = await compressImageFile(file);
        previewImg.src = compressedUrl;
        previewBox.style.display = 'block';
        notify('✅ Fotografía lista y optimizada');
      } catch (err) {
        alert(err.message || 'No se pudo procesar la fotografía');
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = modal.querySelector('#photo-title').value.trim();
      const category = modal.querySelector('#photo-cat').value;

      if (!compressedUrl) {
        alert('Por favor selecciona una imagen válida.');
        return;
      }

      const photoItem = {
        id: 'photo_' + Date.now(),
        title,
        category,
        src: compressedUrl,
        date: new Date().toLocaleDateString('es-CO')
      };

      const list = getStored(STORAGE_GALLERY, []);
      list.unshift(photoItem);
      if (!setStored(STORAGE_GALLERY, list)) return;

      renderCustomPhotoInDOM(photoItem);
      notify('📸 Fotografía guardada y publicada en la galería');
      closeModalWithFocus(modal);
      updateHud();
      renderBlockToolbars();
    });
  }

  function renderCustomPhotoInDOM(photo) {
    const galleryGrid = document.querySelector('.gallery-grid');
    if (!galleryGrid) return;
    if (galleryGrid.querySelector(`[data-custom-id="${photo.id}"]`)) return;

    const item = document.createElement('div');
    item.className = 'gallery-item reveal-scale visible custom-admin-item';
    item.setAttribute('data-category', photo.category);
    item.setAttribute('data-custom-id', photo.id);
    item.setAttribute('data-cms-block-id', `${getPageId()}::custom_photo::${photo.id}`);
    item.innerHTML = `
      <img src="${photo.src}" alt="${escapeHtml(photo.title)}" loading="lazy">
      <div class="overlay"><span>${escapeHtml(photo.title)}</span></div>
    `;

    galleryGrid.insertBefore(item, galleryGrid.firstChild);
    if (_isAdmin) renderBlockToolbars();
  }

  function loadStoredCustomPhotos() {
    const photos = getStored(STORAGE_GALLERY, []);
    photos.forEach((p) => renderCustomPhotoInDOM(p));
  }

  function loadStoredCustomCards() {
    const cards = getStored(STORAGE_CARDS, []);
    const extraGrid = document.querySelector('.extra-grid');
    if (!extraGrid) return;

    cards.forEach((card) => {
      if (extraGrid.querySelector(`[data-custom-id="${card.id}"]`)) return;

      const el = document.createElement('div');
      el.className = 'extra-card reveal visible custom-admin-card';
      el.setAttribute('data-custom-id', card.id);
      el.setAttribute('data-img', card.img);
      el.setAttribute('data-cms-block-id', `${getPageId()}::custom_card::${card.id}`);
      el.innerHTML = `
        <div class="ec-overlay"></div>
        <img src="${card.img}" alt="${escapeHtml(card.title)}" class="ec-img" loading="lazy">
        <div class="ec-body">
          <div class="ec-cat">${escapeHtml(card.cat)}</div>
          <h4>${escapeHtml(card.title)}</h4>
        </div>
      `;

      extraGrid.insertBefore(el, extraGrid.firstChild);
    });

    if (_isAdmin) renderBlockToolbars();
  }

  /* ── Autenticación y Estado ── */
  function setAdmin(state) {
    _isAdmin = state;
    _isPreview = false;
    document.body.classList.remove('admin-preview-mode');

    if (state) {
      sessionStorage.setItem(STORAGE_AUTH, 'true');
      document.body.classList.add('admin-mode');
      notify('🔓 Modo Administrador Activo · ESVOJOP Elite');
    } else {
      sessionStorage.removeItem(STORAGE_AUTH);
      document.body.classList.remove('admin-mode');
      notify('🔒 Sesión de Administrador cerrada');
    }

    updateHud();
    updateToggleIcon();
    renderBlockToolbars();
  }

  /* ── Botón Discreto de Acceso en el Footer (Toggle) ── */
  function updateToggleIcon() {
    const toggle = document.querySelector('.admin-toggle');
    if (toggle) {
      toggle.textContent = _isAdmin ? '🔓' : '🔒';
      toggle.title = _isAdmin ? 'Modo Administrador Activo (Clic para salir)' : 'Acceso Administrador ESVOJOP';
    }
  }

  function initAdminToggle() {
    if (document.querySelector('.admin-toggle')) return;

    const toggle = document.createElement('button');
    toggle.className = 'admin-toggle';
    toggle.setAttribute('type', 'button');
    toggle.setAttribute('aria-label', 'Acceso al panel de administración');
    toggle.title = _isAdmin ? 'Modo Administrador Activo' : 'Acceso Administrador';
    toggle.textContent = _isAdmin ? '🔓' : '🔒';

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      _lastFocusedTrigger = e.currentTarget;
      if (_isAdmin) {
        setAdmin(false);
      } else {
        showLoginModal();
      }
    });

    const footer = document.querySelector('footer');
    if (footer) {
      const social = footer.querySelector('.social') || footer;
      social.appendChild(toggle);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── Inicialización General ── */
  function init() {
    indexAllBlocks();
    applyPersistedChanges();
    initAdminToggle();

    if (_isAdmin) {
      document.body.classList.add('admin-mode');
      updateHud();
      renderBlockToolbars();
    }
  }

  return {
    init,
    isAdmin,
    login: showLoginModal,
    logout: () => setAdmin(false),
    togglePreview: togglePreviewMode,
    openEditor: openBlockEditorModal,
    openManager: openChangesManagerModal,
    addPhoto: openAddPhotoModal,
    backup: downloadBackup
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  EsvojopAdmin.init();
});
