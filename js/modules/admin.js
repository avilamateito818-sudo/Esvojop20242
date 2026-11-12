/* ═══════════════════════════════════════════════════════════
   ESVOJOP 2026 · SISTEMA LIVE CMS & GESTIÓN DE ADMINISTRADOR
   Arquitectura: Desacoplada, Persistente (LocalStorage)
   Sin sobreescritura de código (Non-Destructive Runtime Layer)
   Normativa: Accesibilidad WCAG 2.1 AA / W3C & Touch Targets >= 44px
   Versión: 3.5 Senior Elite
   ═══════════════════════════════════════════════════════════ */

const EsvojopAdmin = (() => {
  'use strict';

  /* ── Constantes y Almacenamiento Seguro ── */
  const ADMIN_USER = 'esvojop';
  const ADMIN_PASS = 'esvojop2026';

  const STORAGE_AUTH = 'esvojop_admin_auth';
  const STORAGE_BLOCK_EDITS = 'esvojop_cms_blocks_v1';   // { [blockKey]: { title, badge, desc, img, btnText, btnHref } }
  const STORAGE_CUSTOM_ITEMS = 'esvojop_cms_items_v2';   // [ { id, targetSelector, title, badge, desc, img, btnText, btnHref, date }, ... ]
  const STORAGE_HIDDEN = 'esvojop_cms_hidden_v3';       // [ key, ... ]
  const STORAGE_GALLERY = 'esvojop_admin_gallery_v2';   // [ photoObj, ... ]
  const STORAGE_CARDS = 'esvojop_admin_cards_v2';       // [ cardObj, ... ]

  let _isAdmin = sessionStorage.getItem(STORAGE_AUTH) === 'true';
  let _lastFocusedTrigger = null;

  function isAdmin() {
    return _isAdmin;
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

  /* ── Utilidades de Almacenamiento ── */
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
    } catch (e) {
      console.error('Error guardando en almacenamiento seguro:', e);
    }
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

    // Calcular ruta de índice relativa
    let idx = 0;
    const allSame = document.querySelectorAll(el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''));
    for (let i = 0; i < allSame.length; i++) {
      if (allSame[i] === el) {
        idx = i;
        break;
      }
    }
    const k = `${pageId}::block::${el.tagName.toLowerCase()}_${idx}`;
    el.setAttribute('data-cms-block-id', k);
    return k;
  }

  /* ── Asignar Identificadores a Todos los Bloques y Tarjetas ── */
  function indexAllBlocks() {
    const selector = [
      'section[id]',
      '.trial-card',
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
      '.faq-item',
      '.stat-card',
      '.coach-card',
      '.category-card',
      '.hero-content'
    ].join(', ');

    document.querySelectorAll(selector).forEach((el) => {
      getBlockKey(el);
    });
  }

  /* ── Aplicar Cambios Persistidos en el DOM (Al Cargar la Página) ── */
  function applyPersistedChanges() {
    const pageId = getPageId();

    // 1. Aplicar ediciones de bloques (títulos, descripciones, fotos, botones)
    const blockEdits = getStored(STORAGE_BLOCK_EDITS, {});
    Object.keys(blockEdits).forEach((key) => {
      if (key.startsWith(pageId + '::')) {
        const el = document.querySelector(`[data-cms-block-id="${key.replace(/"/g, '\\"')}"]`);
        if (el) {
          const data = blockEdits[key];
          const t = el.querySelector('h1, h2, h3, h4, h5, .trial-title, .card-title, .section-title, .ec-body h4');
          if (t && data.title) t.textContent = data.title;

          const b = el.querySelector('.badge, .trial-badge, .section-tag, .ec-cat, .subtitle');
          if (b && data.badge) b.textContent = data.badge;

          const d = el.querySelector('p, .lead, .card-text');
          if (d && data.desc) d.textContent = data.desc;

          const i = el.querySelector('img');
          if (i && data.img) i.src = data.img;

          const l = el.querySelector('a.btn, .btn');
          if (l && data.btnText) {
            l.textContent = data.btnText;
            if (data.btnHref) l.setAttribute('href', data.btnHref);
          }
          el.setAttribute('data-cms-edited', 'true');
        }
      }
    });

    // 2. Ocultar elementos marcados como quitados
    const hiddenList = getStored(STORAGE_HIDDEN, []);
    hiddenList.forEach((key) => {
      if (key.startsWith(pageId + '::')) {
        const el = document.querySelector(`[data-cms-block-id="${key.replace(/"/g, '\\"')}"]`);
        if (el) {
          el.style.display = 'none';
          el.setAttribute('data-cms-hidden', 'true');
        }
      }
    });

    // 3. Renderizar elementos nuevos ("colocar más cosas")
    renderStoredCustomItems();

    // 4. Renderizar fotos de galería y tarjetas heredadas
    loadStoredCustomPhotos();
    loadStoredCustomCards();
  }

  /* ── Renderizar Botones Visibles de Edición [✏️ Editar] y [🗑️ Quitar] ── */
  function renderBlockToolbars() {
    // Si no es admin, limpiar toolbars
    if (!_isAdmin) {
      document.querySelectorAll('.admin-block-toolbar, .admin-add-container').forEach((t) => t.remove());
      return;
    }

    const selector = [
      '.trial-card',
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
      '.faq-item',
      '.stat-card',
      '.coach-card',
      '.category-card'
    ].join(', ');

    document.querySelectorAll(selector).forEach((el) => {
      if (el.querySelector(':scope > .admin-block-toolbar')) return;

      const key = getBlockKey(el);
      const toolbar = document.createElement('div');
      toolbar.className = 'admin-block-toolbar';
      toolbar.setAttribute('role', 'toolbar');
      toolbar.setAttribute('aria-label', 'Controles de administrador');

      toolbar.innerHTML = `
        <button type="button" class="admin-btn-edit" aria-label="Editar contenido de este bloque" title="Editar">
          <span aria-hidden="true">✏️</span> Editar
        </button>
        <button type="button" class="admin-btn-del" aria-label="Quitar este elemento del sitio" title="Quitar">
          <span aria-hidden="true">&times;</span>
        </button>
      `;

      // Posicionar en relación al elemento contenedor
      const computedPos = window.getComputedStyle(el).position;
      if (computedPos === 'static') {
        el.style.position = 'relative';
      }

      toolbar.querySelector('.admin-btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        _lastFocusedTrigger = e.currentTarget;
        openBlockEditorModal(el);
      });

      toolbar.querySelector('.admin-btn-del').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        deleteBlockItem(el, key);
      });

      el.appendChild(toolbar);
    });

    // Añadir botones de "Colocar más cosas aquí" en cuadrículas y secciones
    renderAddMoreButtons();
  }

  /* ── Botones "➕ Colocar más cosas aquí" en Secciones y Cuadrículas ── */
  function renderAddMoreButtons() {
    if (!_isAdmin) return;

    const gridSelectors = [
      '.gallery-grid',
      '.extra-grid',
      '.store-grid',
      '#categorias .container',
      '#beneficios .container',
      '.contact-grid'
    ];

    gridSelectors.forEach((sel) => {
      const container = document.querySelector(sel);
      if (container && !container.parentNode.querySelector(`.admin-add-container[data-for="${sel}"]`)) {
        const wrap = document.createElement('div');
        wrap.className = 'admin-add-container';
        wrap.setAttribute('data-for', sel);
        wrap.innerHTML = `
          <button type="button" class="admin-btn-add-item" aria-label="Colocar más cosas en esta sección">
            <span aria-hidden="true">➕</span> Colocar más cosas aquí
          </button>
        `;

        wrap.querySelector('.admin-btn-add-item').addEventListener('click', (e) => {
          e.preventDefault();
          _lastFocusedTrigger = e.currentTarget;
          openBlockEditorModal(null, true, sel);
        });

        // Insertar justo después o dentro del contenedor
        if (container.nextSibling) {
          container.parentNode.insertBefore(wrap, container.nextSibling);
        } else {
          container.parentNode.appendChild(wrap);
        }
      }
    });
  }

  /* ── Modal Accesible para Editar Contenido o Colocar Más Cosas ── */
  function openBlockEditorModal(blockEl, isNew = false, targetSelector = null) {
    let currentTitle = '';
    let currentBadge = '';
    let currentDesc = '';
    let currentImg = '';
    let currentBtn = '';
    let currentHref = '';

    if (blockEl && !isNew) {
      const titleEl = blockEl.querySelector('h1, h2, h3, h4, h5, .trial-title, .card-title, .section-title, .ec-body h4');
      if (titleEl) currentTitle = titleEl.textContent.trim();

      const badgeEl = blockEl.querySelector('.badge, .trial-badge, .section-tag, .ec-cat, .subtitle');
      if (badgeEl) currentBadge = badgeEl.textContent.trim();

      const descEl = blockEl.querySelector('p, .lead, .card-text');
      if (descEl) currentDesc = descEl.textContent.trim();

      const imgEl = blockEl.querySelector('img');
      if (imgEl) currentImg = imgEl.src;

      const linkEl = blockEl.querySelector('a.btn, .btn');
      if (linkEl) {
        currentBtn = linkEl.textContent.trim();
        currentHref = linkEl.getAttribute('href') || '';
      }
    }

    const modalTitle = isNew ? 'Colocar <span>Más Cosas</span>' : 'Editar <span>Contenido</span>';

    const formHtml = `
      <form class="ac-form" id="blockEditorForm" role="form" aria-label="Formulario de edición de contenido">
        <div class="ac-field">
          <label for="cms-field-title">Título o Encabezado Principal</label>
          <input type="text" id="cms-field-title" name="title" value="${escapeHtml(currentTitle)}" placeholder="Ej: Torneo Internacional / Nueva Clase" required class="ac-input" autofocus>
        </div>

        <div class="ac-field">
          <label for="cms-field-badge">Etiqueta, Subtítulo o Categoría (Opcional)</label>
          <input type="text" id="cms-field-badge" name="badge" value="${escapeHtml(currentBadge)}" placeholder="Ej: Competición Oficial · 2026" class="ac-input">
        </div>

        <div class="ac-field">
          <label for="cms-field-desc">Descripción, Párrafo o Información</label>
          <textarea id="cms-field-desc" name="desc" rows="4" placeholder="Escribe el texto detallado..." class="ac-input" style="resize:vertical;">${escapeHtml(currentDesc)}</textarea>
        </div>

        <div class="ac-field">
          <label for="cms-field-file">Fotografía o Imagen (Subir desde dispositivo o cambiar)</label>
          <input type="file" id="cms-field-file" accept="image/*" class="ac-input ac-file-input">
          <input type="text" id="cms-field-url" placeholder="O introduce una URL externa (https://...)" value="${escapeHtml(currentImg)}" class="ac-input" style="margin-top:0.4rem; font-size:0.85rem;">
        </div>

        <div class="ac-preview-box" id="cmsImgPreviewBox" style="${currentImg ? 'display:block;' : 'display:none;'} margin-top:0.3rem;">
          <img id="cmsImgPreview" src="${currentImg || ''}" alt="Vista previa de imagen">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem;">
          <div class="ac-field">
            <label for="cms-field-btn">Texto de Botón (Opcional)</label>
            <input type="text" id="cms-field-btn" name="btnText" value="${escapeHtml(currentBtn)}" placeholder="Ej: Más Información" class="ac-input">
          </div>
          <div class="ac-field">
            <label for="cms-field-href">Enlace / WhatsApp / URL</label>
            <input type="text" id="cms-field-href" name="btnHref" value="${escapeHtml(currentHref)}" placeholder="https://wa.me/... o #seccion" class="ac-input">
          </div>
        </div>

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

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          chosenImgSrc = e.target.result;
          previewImg.src = chosenImgSrc;
          previewBox.style.display = 'block';
          urlInput.value = '';
        };
        reader.readAsDataURL(file);
      }
    });

    urlInput.addEventListener('input', () => {
      const val = urlInput.value.trim();
      if (val) {
        chosenImgSrc = val;
        previewImg.src = chosenImgSrc;
        previewBox.style.display = 'block';
      }
    });

    cancelBtn.addEventListener('click', () => {
      closeModalWithFocus(modal);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const newTitle = modal.querySelector('#cms-field-title').value.trim();
      const newBadge = modal.querySelector('#cms-field-badge').value.trim();
      const newDesc = modal.querySelector('#cms-field-desc').value.trim();
      const newBtnText = modal.querySelector('#cms-field-btn').value.trim();
      const newBtnHref = modal.querySelector('#cms-field-href').value.trim();

      if (isNew) {
        // Crear nuevo elemento ("Colocar más cosas")
        const newItem = {
          id: 'custom_item_' + Date.now(),
          pageId: getPageId(),
          targetSelector,
          title: newTitle,
          badge: newBadge,
          desc: newDesc,
          img: chosenImgSrc || 'img/fotos/imagines/WhatsApp%20Image%202026-04-20%20at%204.32.25%20PM.jpeg',
          btnText: newBtnText,
          btnHref: newBtnHref,
          date: new Date().toLocaleDateString('es-CO')
        };

        const list = getStored(STORAGE_CUSTOM_ITEMS, []);
        list.unshift(newItem);
        setStored(STORAGE_CUSTOM_ITEMS, list);

        renderSingleCustomItem(newItem);
        notify('✨ Nuevo elemento colocado y guardado en la página');
      } else if (blockEl) {
        // Actualizar elemento existente
        const titleEl = blockEl.querySelector('h1, h2, h3, h4, h5, .trial-title, .card-title, .section-title, .ec-body h4');
        if (titleEl) titleEl.textContent = newTitle;

        const badgeEl = blockEl.querySelector('.badge, .trial-badge, .section-tag, .ec-cat, .subtitle');
        if (badgeEl) badgeEl.textContent = newBadge;

        const descEl = blockEl.querySelector('p, .lead, .card-text');
        if (descEl) descEl.textContent = newDesc;

        const imgEl = blockEl.querySelector('img');
        if (imgEl && chosenImgSrc) imgEl.src = chosenImgSrc;

        const linkEl = blockEl.querySelector('a.btn, .btn');
        if (linkEl && newBtnText) {
          linkEl.textContent = newBtnText;
          if (newBtnHref) linkEl.setAttribute('href', newBtnHref);
        }

        // Guardar persistente
        const key = getBlockKey(blockEl);
        const edits = getStored(STORAGE_BLOCK_EDITS, {});
        edits[key] = {
          title: newTitle,
          badge: newBadge,
          desc: newDesc,
          img: chosenImgSrc,
          btnText: newBtnText,
          btnHref: newBtnHref
        };
        setStored(STORAGE_BLOCK_EDITS, edits);

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
    if (confirm('🗑️ ¿Deseas quitar este elemento de la página?\n(Podrás restaurarlo en cualquier momento desde "Restaurar" en la barra de administrador sin alterar el código).')) {
      el.style.transition = 'all 0.35s ease';
      el.style.transform = 'scale(0.85) translateY(-10px)';
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.display = 'none';
        el.setAttribute('data-cms-hidden', 'true');

        const hiddenList = getStored(STORAGE_HIDDEN, []);
        if (!hiddenList.includes(key)) {
          hiddenList.push(key);
          setStored(STORAGE_HIDDEN, hiddenList);
        }
        notify('🗑️ Elemento quitado y guardado');
        updateHud();
      }, 350);
    }
  }

  /* ── Renderizar Elementos Personalizados Guardados ── */
  function renderSingleCustomItem(item) {
    if (item.pageId !== getPageId()) return;

    const targetContainer = document.querySelector(item.targetSelector);
    if (!targetContainer) return;

    if (targetContainer.querySelector(`[data-custom-item-id="${item.id}"]`)) return;

    const el = document.createElement('div');
    el.className = 'extra-card reveal visible custom-cms-block';
    el.setAttribute('data-custom-item-id', item.id);
    el.setAttribute('data-cms-block-id', `${getPageId()}::custom_item::${item.id}`);

    el.innerHTML = `
      <div class="ec-overlay"></div>
      <img src="${item.img}" alt="${escapeHtml(item.title)}" class="ec-img" loading="lazy">
      <div class="ec-body">
        ${item.badge ? `<div class="ec-cat">${escapeHtml(item.badge)}</div>` : ''}
        <h4>${escapeHtml(item.title)}</h4>
        ${item.desc ? `<p style="color:var(--gray-light); font-size:0.85rem; margin-top:0.4rem;">${escapeHtml(item.desc)}</p>` : ''}
        ${item.btnText ? `<a href="${escapeHtml(item.btnHref || '#')}" class="btn btn-secondary btn-sm" style="margin-top:0.6rem; display:inline-block;">${escapeHtml(item.btnText)}</a>` : ''}
      </div>
    `;

    targetContainer.insertBefore(el, targetContainer.firstChild);

    // Si está en modo admin, adjuntar controles inmediatamente
    if (_isAdmin) {
      renderBlockToolbars();
    }
  }

  function renderStoredCustomItems() {
    const list = getStored(STORAGE_CUSTOM_ITEMS, []);
    list.forEach((item) => renderSingleCustomItem(item));
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

    // Focalizar primer elemento interactivo
    setTimeout(() => {
      const firstInput = overlay.querySelector('input:not([type="hidden"]), textarea, button.btn-secondary');
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

  /* ── Modal de Inicio de Sesión Administrador ── */
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
      const val = passInput.value.trim();
      if (val === ADMIN_PASS) {
        setAdmin(true);
        closeModalWithFocus(modal);
      } else {
        passInput.classList.add('ac-input-error');
        passInput.value = '';
        passInput.focus();
        let err = form.querySelector('.ac-error-msg');
        if (!err) {
          err = document.createElement('p');
          err.className = 'ac-error-msg';
          form.insertBefore(err, form.querySelector('.ac-actions'));
        }
        err.textContent = '❌ Contraseña incorrecta. Inténtalo nuevamente.';
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

    const pageId = getPageId();
    const blockEdits = getStored(STORAGE_BLOCK_EDITS, {});
    const customItems = getStored(STORAGE_CUSTOM_ITEMS, []);
    const hidden = getStored(STORAGE_HIDDEN, []);
    const totalChanges = Object.keys(blockEdits).length + customItems.length + hidden.length;

    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'esvojopAdminHud';
      hud.className = 'admin-hud reveal';
      hud.setAttribute('role', 'region');
      hud.setAttribute('aria-label', 'Barra de herramientas de administrador');
      document.body.appendChild(hud);
    }

    hud.innerHTML = `
      <div class="hud-left">
        <span class="hud-logo">🏐 ESVOJOP · ADMIN</span>
        <span class="hud-status"><span class="hud-pulse" aria-hidden="true"></span> Modo Edición</span>
      </div>
      <div class="hud-actions" role="toolbar" aria-label="Herramientas globales">
        <button type="button" class="hud-btn" id="hudAddAnywhere" title="Colocar más cosas en la página">
          <span aria-hidden="true">➕</span> Colocar Cosas
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

    hud.querySelector('#hudAddAnywhere').addEventListener('click', (e) => {
      _lastFocusedTrigger = e.currentTarget;
      const firstGrid = document.querySelector('.gallery-grid, .extra-grid, .store-grid, .container');
      const sel = firstGrid ? (firstGrid.className.split(' ')[0] ? '.' + firstGrid.className.split(' ')[0] : 'body') : 'body';
      openBlockEditorModal(null, true, sel);
    });

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

  /* ── Modal Gestor de Cambios y Restauración ── */
  function openChangesManagerModal() {
    const pageId = getPageId();
    const blockEdits = getStored(STORAGE_BLOCK_EDITS, {});
    const customItems = getStored(STORAGE_CUSTOM_ITEMS, []);
    const hidden = getStored(STORAGE_HIDDEN, []);

    const pageEditsCount = Object.keys(blockEdits).filter((k) => k.startsWith(pageId + '::')).length;
    const pageHiddenCount = hidden.filter((k) => k.startsWith(pageId + '::')).length;
    const pageCustomCount = customItems.filter((i) => i.pageId === pageId).length;

    const contentHtml = `
      <div style="display:flex; flex-direction:column; gap:1.2rem;">
        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,215,0,0.15); border-radius:12px; padding:1rem;">
          <h4 style="color:var(--yellow); margin:0 0 0.6rem 0; font-size:0.95rem; text-transform:uppercase; letter-spacing:0.05em;">
            Personalizaciones en: <span style="color:#fff;">${pageId.toUpperCase()}</span>
          </h4>
          <ul style="list-style:none; padding:0; margin:0; font-size:0.88rem; color:var(--text-light); display:flex; flex-direction:column; gap:0.4rem;">
            <li>✏️ <strong>${pageEditsCount}</strong> bloques modificados (textos y fotos)</li>
            <li>🗑️ <strong>${pageHiddenCount}</strong> elementos quitados u ocultos</li>
            <li>➕ <strong>${pageCustomCount}</strong> elementos nuevos colocados</li>
          </ul>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.6rem;">
          <button type="button" id="btnRestoreHidden" class="hud-btn" style="width:100%; justify-content:center; padding:0.7rem; min-height:44px;">
            ↩️ Restaurar Elementos Quitados (${pageHiddenCount})
          </button>
          <button type="button" id="btnRestoreEdits" class="hud-btn" style="width:100%; justify-content:center; padding:0.7rem; min-height:44px;">
            🔄 Restaurar Textos y Fotos Originales (${pageEditsCount})
          </button>
          <button type="button" id="btnResetAll" class="hud-btn hud-btn-danger" style="width:100%; justify-content:center; padding:0.7rem; margin-top:0.4rem; min-height:44px;">
            ⚠️ Restablecer Todo el Sitio a Fábrica
          </button>
        </div>

        <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:0.4rem 0;">

        <div style="display:flex; gap:0.6rem;">
          <button type="button" id="btnExportJSON" class="btn btn-secondary btn-block" style="font-size:0.8rem; padding:0.65rem; min-height:44px;">
            💾 Descargar Respaldo JSON
          </button>
          <label class="btn btn-primary btn-block" style="font-size:0.8rem; padding:0.65rem; min-height:44px; text-align:center; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            📥 Importar Respaldo
            <input type="file" id="btnImportJSON" accept=".json" style="display:none;">
          </label>
        </div>
      </div>
    `;

    const modal = createModal('Centro de <span>Restauración & Cambios</span>', contentHtml);

    // Restaurar quitados
    modal.querySelector('#btnRestoreHidden').addEventListener('click', () => {
      const remainingHidden = hidden.filter((k) => !k.startsWith(pageId + '::'));
      setStored(STORAGE_HIDDEN, remainingHidden);
      document.querySelectorAll(`[data-cms-block-id*="${pageId}::"]`).forEach((el) => {
        el.style.display = '';
        el.removeAttribute('data-cms-hidden');
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      notify('↩️ Elementos quitados restaurados exitosamente');
      closeModalWithFocus(modal);
      updateHud();
      renderBlockToolbars();
    });

    // Restaurar ediciones de esta página
    modal.querySelector('#btnRestoreEdits').addEventListener('click', () => {
      if (confirm('¿Deseas restaurar todos los textos y fotos modificados en esta página a los originales del sitio?')) {
        const remainingEdits = {};
        Object.keys(blockEdits).forEach((k) => {
          if (!k.startsWith(pageId + '::')) remainingEdits[k] = blockEdits[k];
        });
        setStored(STORAGE_BLOCK_EDITS, remainingEdits);
        notify('🔄 Contenido restaurado. Actualizando página...');
        setTimeout(() => window.location.reload(), 600);
      }
    });

    // Reset total
    modal.querySelector('#btnResetAll').addEventListener('click', () => {
      if (confirm('⚠️ ¿Estás completamente seguro de borrar todas las modificaciones, elementos colocados y fotos agregadas?\n\nEsta acción restablece el sitio al código original de fábrica.')) {
        localStorage.removeItem(STORAGE_BLOCK_EDITS);
        localStorage.removeItem(STORAGE_CUSTOM_ITEMS);
        localStorage.removeItem(STORAGE_HIDDEN);
        localStorage.removeItem(STORAGE_GALLERY);
        localStorage.removeItem(STORAGE_CARDS);
        notify('♻️ Sitio restablecido a su estado de fábrica');
        setTimeout(() => window.location.reload(), 800);
      }
    });

    // Exportar JSON
    modal.querySelector('#btnExportJSON').addEventListener('click', () => {
      downloadBackup();
    });

    // Importar JSON
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
            notify('📥 Respaldo importado exitosamente. Recargando sitio...');
            setTimeout(() => window.location.reload(), 800);
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
      hidden: getStored(STORAGE_HIDDEN, []),
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

  /* ── Modal de Añadir Fotografía a Galería ── */
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
          <label for="photo-file">Seleccionar Fotografía desde tu Dispositivo</label>
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

    let base64Url = '';

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          base64Url = ev.target.result;
          previewImg.src = base64Url;
          previewBox.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = modal.querySelector('#photo-title').value.trim();
      const category = modal.querySelector('#photo-cat').value;

      if (!base64Url) {
        alert('Por favor selecciona una imagen válida.');
        return;
      }

      const photoItem = {
        id: 'photo_' + Date.now(),
        title,
        category,
        src: base64Url,
        date: new Date().toLocaleDateString('es-CO')
      };

      const list = getStored(STORAGE_GALLERY, []);
      list.unshift(photoItem);
      setStored(STORAGE_GALLERY, list);

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
    openEditor: openBlockEditorModal,
    openManager: openChangesManagerModal,
    addPhoto: openAddPhotoModal,
    backup: downloadBackup
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  EsvojopAdmin.init();
});
