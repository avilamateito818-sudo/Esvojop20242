/* ═══════════════════════════════════════════════════════════
   ESVOJOP 2026 · SISTEMA LIVE CMS & GESTIÓN DE ADMINISTRADOR
   Arquitectura: Desacoplada, Persistente (LocalStorage)
   Sin sobreescritura de código (Non-Destructive Runtime Layer)
   Versión: 3.0 Senior Elite
   ═══════════════════════════════════════════════════════════ */

const EsvojopAdmin = (() => {
  'use strict';

  /* ── Constantes y Almacenamiento Seguro ── */
  const ADMIN_USER = 'esvojop';
  const ADMIN_PASS = 'esvojop2026';

  const STORAGE_AUTH = 'esvojop_admin_auth';
  const STORAGE_EDITS = 'esvojop_cms_edits_v3';       // { [key]: innerHTML }
  const STORAGE_HIDDEN = 'esvojop_cms_hidden_v3';     // [ key, ... ]
  const STORAGE_IMAGES = 'esvojop_cms_images_v3';     // { [key]: srcBase64OrUrl }
  const STORAGE_GALLERY = 'esvojop_admin_gallery_v2'; // [ photoObj, ... ]
  const STORAGE_CARDS = 'esvojop_admin_cards_v2';     // [ cardObj, ... ]

  let _isAdmin = sessionStorage.getItem(STORAGE_AUTH) === 'true';
  let _isTextEditMode = false;
  let _isDeleteMode = false;
  let _isImgEditMode = false;

  function isAdmin() {
    return _isAdmin;
  }

  /* ── Notificaciones Toast ── */
  function notify(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
    } else {
      let toast = document.querySelector('.toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
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
      console.error('Error guardando en localStorage:', e);
    }
  }

  /* ── Identificador de Página Actual ── */
  function getPageId() {
    const path = window.location.pathname;
    const file = path.split('/').pop().replace(/\.html$/i, '') || 'index';
    return file.toLowerCase();
  }

  /* ── Generador y Asignador de Claves Únicas CMS ── */
  function assignCmsKeys() {
    const pageId = getPageId();

    // 1. Textos y títulos editables
    const textSelector = 'h1, h2, h3, h4, h5, h6, p, .btn, .stat-number, .stat-label, .section-tag, .badge, .subtitle, .card-title, .lead, .price, .hero-tag, .hero-lead, .hero-title, .ec-cat';
    const textEls = document.querySelectorAll(textSelector);
    textEls.forEach((el, idx) => {
      if (!el.getAttribute('data-cms-key')) {
        const idPart = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}_${idx}`;
        el.setAttribute('data-cms-key', `${pageId}::text::${idPart}`);
      }
    });

    // 2. Elementos contenedores removibles (tarjetas, testimonios, fotos, pasos de guía)
    const itemSelector = '.gallery-item, .extra-card, .store-card, .product-card, .team-card, .contact-card, .timeline-item, .schedule-card, .feature-card, .review-card, .guia-card, .guia-step, .faq-item, .stat-card';
    const itemEls = document.querySelectorAll(itemSelector);
    itemEls.forEach((el, idx) => {
      if (!el.getAttribute('data-cms-key')) {
        const idPart = el.id ? `#${el.id}` : `item_${idx}`;
        el.setAttribute('data-cms-key', `${pageId}::item::${idPart}`);
      }
    });

    // 3. Imágenes reemplazables
    const imgSelector = 'main img, .hero img, .gallery-grid img, .store-grid img, .extra-grid img, .contact-card img';
    const imgEls = document.querySelectorAll(imgSelector);
    imgEls.forEach((el, idx) => {
      if (!el.getAttribute('data-cms-key')) {
        const idPart = el.id ? `#${el.id}` : `img_${idx}`;
        el.setAttribute('data-cms-key', `${pageId}::img::${idPart}`);
      }
    });
  }

  /* ── Aplicar Cambios Persistidos en el DOM (Al Cargar la Página) ── */
  function applyPersistedChanges() {
    const pageId = getPageId();

    // 1. Aplicar textos editados
    const edits = getStored(STORAGE_EDITS, {});
    Object.keys(edits).forEach((key) => {
      if (key.startsWith(pageId + '::')) {
        const el = document.querySelector(`[data-cms-key="${key.replace(/"/g, '\\"')}"]`);
        if (el) {
          el.innerHTML = edits[key];
          el.setAttribute('data-cms-edited', 'true');
        }
      }
    });

    // 2. Ocultar elementos quitados
    const hiddenList = getStored(STORAGE_HIDDEN, []);
    hiddenList.forEach((key) => {
      if (key.startsWith(pageId + '::')) {
        const el = document.querySelector(`[data-cms-key="${key.replace(/"/g, '\\"')}"]`);
        if (el) {
          el.style.display = 'none';
          el.setAttribute('data-cms-hidden', 'true');
        }
      }
    });

    // 3. Aplicar imágenes reemplazadas
    const images = getStored(STORAGE_IMAGES, {});
    Object.keys(images).forEach((key) => {
      if (key.startsWith(pageId + '::')) {
        const el = document.querySelector(`[data-cms-key="${key.replace(/"/g, '\\"')}"]`);
        if (el && el.tagName === 'IMG') {
          el.src = images[key];
          el.setAttribute('data-cms-img-custom', 'true');
        }
      }
    });

    // 4. Cargar fotos personalizadas de galería y tarjetas
    loadStoredCustomPhotos();
    loadStoredCustomCards();
  }

  /* ── Motor de Edición de Textos en Vivo ── */
  function toggleTextEditMode(forceState) {
    _isTextEditMode = typeof forceState === 'boolean' ? forceState : !_isTextEditMode;
    document.body.classList.toggle('admin-editing-texts', _isTextEditMode);

    const editableEls = document.querySelectorAll('[data-cms-key*="::text::"]');
    editableEls.forEach((el) => {
      if (_isTextEditMode) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('data-cms-editable', 'true');
        if (!el._hasCmsListener) {
          el._hasCmsListener = true;
          el.addEventListener('focus', () => {
            el._originalHtml = el.innerHTML;
          });
          el.addEventListener('blur', () => {
            const currentHtml = el.innerHTML.trim();
            if (currentHtml !== el._originalHtml) {
              const key = el.getAttribute('data-cms-key');
              const edits = getStored(STORAGE_EDITS, {});
              edits[key] = currentHtml;
              setStored(STORAGE_EDITS, edits);

              el.classList.add('cms-saved-flash');
              setTimeout(() => el.classList.remove('cms-saved-flash'), 800);
              notify('💾 Cambio de texto guardado');
              updateHud();
            }
          });
          el.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              el.blur();
            } else if (e.key === 'Enter' && !el.tagName.match(/^(P|DIV|LI)$/i)) {
              e.preventDefault();
              el.blur();
            }
          });
        }
      } else {
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-cms-editable');
      }
    });

    if (_isTextEditMode) {
      notify('✏️ Modo Edición Activo: Haz clic en cualquier texto para modificarlo');
    } else {
      notify('✏️ Modo Edición desactivado');
    }
    updateHud();
  }

  /* ── Motor para Quitar / Ocultar Elementos ── */
  function toggleDeleteMode(forceState) {
    _isDeleteMode = typeof forceState === 'boolean' ? forceState : !_isDeleteMode;
    document.body.classList.toggle('admin-delete-mode', _isDeleteMode);

    const items = document.querySelectorAll('[data-cms-key*="::item::"]');
    items.forEach((item) => {
      let badge = item.querySelector('.admin-delete-badge');
      if (_isDeleteMode) {
        if (!badge && item.style.display !== 'none') {
          badge = document.createElement('button');
          badge.className = 'admin-delete-badge';
          badge.title = 'Quitar este elemento';
          badge.innerHTML = '&times;';
          badge.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (confirm('🗑️ ¿Deseas quitar este elemento del sitio?\n(Podrás recuperarlo en cualquier momento desde "Restaurar" en el panel).')) {
              item.style.transition = 'all 0.35s ease';
              item.style.transform = 'scale(0.85) translateY(-10px)';
              item.style.opacity = '0';
              setTimeout(() => {
                item.style.display = 'none';
                item.setAttribute('data-cms-hidden', 'true');
                const key = item.getAttribute('data-cms-key');
                const hiddenList = getStored(STORAGE_HIDDEN, []);
                if (!hiddenList.includes(key)) {
                  hiddenList.push(key);
                  setStored(STORAGE_HIDDEN, hiddenList);
                }
                notify('🗑️ Elemento quitado y guardado');
                updateHud();
              }, 350);
            }
          });
          item.style.position = item.style.position || 'relative';
          item.appendChild(badge);
        }
      } else {
        if (badge) badge.remove();
      }
    });

    if (_isDeleteMode) {
      notify('🗑️ Modo Quitar Activo: Haz clic en la ✕ roja del elemento que deseas ocultar');
    } else {
      notify('🗑️ Modo Quitar desactivado');
    }
    updateHud();
  }

  /* ── Motor para Cambiar Imágenes en Vivo ── */
  function toggleImgEditMode(forceState) {
    _isImgEditMode = typeof forceState === 'boolean' ? forceState : !_isImgEditMode;
    document.body.classList.toggle('admin-img-edit-mode', _isImgEditMode);

    const images = document.querySelectorAll('[data-cms-key*="::img::"]');
    images.forEach((img) => {
      let parent = img.parentElement;
      if (!parent) return;

      let badge = parent.querySelector('.admin-img-badge');
      if (_isImgEditMode) {
        if (!badge) {
          badge = document.createElement('button');
          badge.className = 'admin-img-badge';
          badge.title = 'Cambiar esta imagen';
          badge.innerHTML = '📷 Cambiar';
          badge.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            openChangeImageModal(img);
          });
          if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
          }
          parent.appendChild(badge);
        }
      } else {
        if (badge) badge.remove();
      }
    });

    if (_isImgEditMode) {
      notify('📷 Modo Imágenes Activo: Haz clic en "📷 Cambiar" sobre cualquier foto');
    } else {
      notify('📷 Modo Imágenes desactivado');
    }
    updateHud();
  }

  /* ── Modal para Cambiar Imagen ── */
  function openChangeImageModal(imgEl) {
    const currentSrc = imgEl.src;
    const formHtml = `
      <form class="ac-form" id="changeImgForm">
        <div class="ac-preview-box" style="margin-bottom: 1rem;">
          <img id="imgModalPreview" src="${currentSrc}" alt="Vista previa actual">
        </div>
        <div class="ac-field">
          <label for="imgModalFile">Subir Nueva Foto desde tu Dispositivo (JPG, PNG)</label>
          <input type="file" id="imgModalFile" accept="image/*" class="ac-input ac-file-input">
        </div>
        <div class="ac-field">
          <label for="imgModalUrl">O escribir URL externa / ruta local</label>
          <input type="text" id="imgModalUrl" placeholder="https://ejemplo.com/foto.jpg" class="ac-input">
        </div>
        <div class="ac-actions">
          <button type="submit" class="btn btn-secondary btn-shine btn-block">💾 Guardar Nueva Foto</button>
        </div>
      </form>
    `;

    const modal = createModal('Cambiar <span>Fotografía</span>', formHtml);
    const form = modal.querySelector('#changeImgForm');
    const fileInput = modal.querySelector('#imgModalFile');
    const urlInput = modal.querySelector('#imgModalUrl');
    const preview = modal.querySelector('#imgModalPreview');
    let chosenSrc = '';

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          chosenSrc = e.target.result;
          preview.src = chosenSrc;
        };
        reader.readAsDataURL(file);
      }
    });

    urlInput.addEventListener('input', () => {
      const val = urlInput.value.trim();
      if (val) {
        chosenSrc = val;
        preview.src = chosenSrc;
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!chosenSrc) {
        alert('Por favor selecciona una imagen o introduce un enlace.');
        return;
      }

      imgEl.src = chosenSrc;
      const key = imgEl.getAttribute('data-cms-key');
      const imgMap = getStored(STORAGE_IMAGES, {});
      imgMap[key] = chosenSrc;
      setStored(STORAGE_IMAGES, imgMap);

      notify('📷 Imagen actualizada y guardada');
      modal.remove();
      updateHud();
    });
  }

  /* ── Modal Gestor de Cambios y Restauración ── */
  function openChangesManagerModal() {
    const pageId = getPageId();
    const edits = getStored(STORAGE_EDITS, {});
    const hidden = getStored(STORAGE_HIDDEN, []);
    const images = getStored(STORAGE_IMAGES, {});
    const photos = getStored(STORAGE_GALLERY, []);
    const cards = getStored(STORAGE_CARDS, []);

    const pageEditsCount = Object.keys(edits).filter((k) => k.startsWith(pageId + '::')).length;
    const pageHiddenCount = hidden.filter((k) => k.startsWith(pageId + '::')).length;
    const pageImagesCount = Object.keys(images).filter((k) => k.startsWith(pageId + '::')).length;

    const contentHtml = `
      <div style="display:flex; flex-direction:column; gap:1.2rem;">
        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,215,0,0.15); border-radius:12px; padding:1rem;">
          <h4 style="color:var(--yellow); margin:0 0 0.6rem 0; font-size:0.95rem; text-transform:uppercase; letter-spacing:0.05em;">
            Resumen en Página: <span style="color:#fff;">${pageId.toUpperCase()}</span>
          </h4>
          <ul style="list-style:none; padding:0; margin:0; font-size:0.88rem; color:var(--text-light); display:flex; flex-direction:column; gap:0.4rem;">
            <li>📝 <strong>${pageEditsCount}</strong> textos modificados</li>
            <li>🗑️ <strong>${pageHiddenCount}</strong> elementos quitados</li>
            <li>📷 <strong>${pageImagesCount}</strong> imágenes personalizadas</li>
            <li>📸 <strong>${photos.length}</strong> fotos creadas en galería</li>
            <li>📇 <strong>${cards.length}</strong> tarjetas creadas en contenido</li>
          </ul>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.6rem;">
          <button id="btnRestoreHidden" class="hud-btn" style="width:100%; justify-content:center; padding:0.6rem;">
            ↩️ Restaurar Elementos Quitados de esta Página (${pageHiddenCount})
          </button>
          <button id="btnRestoreTexts" class="hud-btn" style="width:100%; justify-content:center; padding:0.6rem;">
            🔄 Restaurar Textos Originales de esta Página (${pageEditsCount})
          </button>
          <button id="btnRestoreImages" class="hud-btn" style="width:100%; justify-content:center; padding:0.6rem;">
            🔄 Restaurar Fotos Originales de esta Página (${pageImagesCount})
          </button>
          <button id="btnResetAll" class="hud-btn hud-btn-danger" style="width:100%; justify-content:center; padding:0.6rem; margin-top:0.4rem;">
            ⚠️ Restablecer TODO el Sitio a Fábrica (Borrar personalizaciones)
          </button>
        </div>

        <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:0.4rem 0;">

        <div style="display:flex; gap:0.6rem;">
          <button id="btnExportJSON" class="btn btn-secondary btn-block" style="font-size:0.8rem; padding:0.6rem;">
            💾 Descargar Respaldo JSON
          </button>
          <label class="btn btn-primary btn-block" style="font-size:0.8rem; padding:0.6rem; text-align:center; cursor:pointer;">
            📥 Importar Respaldo
            <input type="file" id="btnImportJSON" accept=".json" style="display:none;">
          </label>
        </div>
      </div>
    `;

    const modal = createModal('Centro de <span>Restauración & Cambios</span>', contentHtml);

    // Restaurar elementos quitados de esta página
    modal.querySelector('#btnRestoreHidden').addEventListener('click', () => {
      const remainingHidden = hidden.filter((k) => !k.startsWith(pageId + '::'));
      setStored(STORAGE_HIDDEN, remainingHidden);
      document.querySelectorAll(`[data-cms-key*="${pageId}::item::"]`).forEach((el) => {
        el.style.display = '';
        el.removeAttribute('data-cms-hidden');
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      notify('↩️ Elementos quitados restaurados en esta página');
      modal.remove();
      updateHud();
    });

    // Restaurar textos de esta página
    modal.querySelector('#btnRestoreTexts').addEventListener('click', () => {
      if (confirm('¿Restaurar todos los textos modificados en esta página a sus valores originales?')) {
        const remainingEdits = {};
        Object.keys(edits).forEach((k) => {
          if (!k.startsWith(pageId + '::')) remainingEdits[k] = edits[k];
        });
        setStored(STORAGE_EDITS, remainingEdits);
        notify('🔄 Textos restaurados. Recargando página...');
        setTimeout(() => window.location.reload(), 600);
      }
    });

    // Restaurar imágenes de esta página
    modal.querySelector('#btnRestoreImages').addEventListener('click', () => {
      if (confirm('¿Restaurar las imágenes de esta página a las predeterminadas?')) {
        const remainingImages = {};
        Object.keys(images).forEach((k) => {
          if (!k.startsWith(pageId + '::')) remainingImages[k] = images[k];
        });
        setStored(STORAGE_IMAGES, remainingImages);
        notify('🔄 Imágenes restauradas. Recargando página...');
        setTimeout(() => window.location.reload(), 600);
      }
    });

    // Restablecer TODO a fábrica
    modal.querySelector('#btnResetAll').addEventListener('click', () => {
      if (confirm('⚠️ ¿Estás COMPLETAMENTE seguro de eliminar todas las personalizaciones, textos editados, elementos quitados y fotos cargadas?\n\nEsta acción restablece el sitio al código original de fábrica.')) {
        localStorage.removeItem(STORAGE_EDITS);
        localStorage.removeItem(STORAGE_HIDDEN);
        localStorage.removeItem(STORAGE_IMAGES);
        localStorage.removeItem(STORAGE_GALLERY);
        localStorage.removeItem(STORAGE_CARDS);
        notify('♻️ Sitio restablecido a su estado original de fábrica');
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
            if (data.edits) setStored(STORAGE_EDITS, data.edits);
            if (data.hidden) setStored(STORAGE_HIDDEN, data.hidden);
            if (data.images) setStored(STORAGE_IMAGES, data.images);
            if (data.photos) setStored(STORAGE_GALLERY, data.photos);
            if (data.cards) setStored(STORAGE_CARDS, data.cards);
            notify('📥 Respaldo importado exitosamente. Actualizando sitio...');
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
      edits: getStored(STORAGE_EDITS, {}),
      hidden: getStored(STORAGE_HIDDEN, []),
      images: getStored(STORAGE_IMAGES, {}),
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
      if (_isTextEditMode) toggleTextEditMode(false);
      if (_isDeleteMode) toggleDeleteMode(false);
      if (_isImgEditMode) toggleImgEditMode(false);
      notify('🔒 Sesión de Administrador cerrada');
    }

    updateHud();
    updateToggleIcon();
  }

  /* ── Modal Base con Efecto Frosted Glass ── */
  function createModal(titleHtml, contentHtml) {
    const existing = document.querySelector('.ac-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'ac-modal';
    overlay.innerHTML = `
      <div class="ac-modal-box">
        <div class="ac-modal-glow"></div>
        <button class="ac-modal-close" aria-label="Cerrar modal">&times;</button>
        <div class="ac-modal-header">
          <div class="live-status-beacon" style="margin-bottom:0.6rem;">
            <span class="beacon-dot-wrap">
              <span class="beacon-pulse"></span>
              <span class="beacon-dot"></span>
            </span>
            <span>Seguridad ESVOJOP 2026</span>
          </div>
          <h3 class="ac-title">${titleHtml}</h3>
        </div>
        <div class="ac-modal-body">
          ${contentHtml}
        </div>
      </div>
    `;

    overlay.querySelector('.ac-modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const escListener = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escListener);
      }
    };
    document.addEventListener('keydown', escListener);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    return overlay;
  }

  /* ── Modal de Inicio de Sesión Administrador ── */
  function showLoginModal() {
    const formHtml = `
      <form class="ac-form" id="adminLoginForm">
        <div class="ac-field">
          <label for="adm-user">Usuario del Club</label>
          <input type="text" id="adm-user" name="username" value="esvojop" readonly class="ac-input ac-readonly">
        </div>
        <div class="ac-field">
          <label for="adm-pass">Clave de Acceso</label>
          <div class="ac-pass-wrap">
            <input type="password" id="adm-pass" name="password" placeholder="Ingresa la contraseña..." required autofocus class="ac-input">
            <button type="button" class="ac-eye-btn" aria-label="Ver u ocultar contraseña">👁️</button>
          </div>
        </div>
        <div class="ac-actions">
          <button type="submit" class="btn btn-secondary btn-shine btn-block">⚡ Desbloquear Panel</button>
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
        modal.remove();
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
    const edits = getStored(STORAGE_EDITS, {});
    const hidden = getStored(STORAGE_HIDDEN, []);
    const images = getStored(STORAGE_IMAGES, {});
    const totalChanges = Object.keys(edits).length + hidden.length + Object.keys(images).length;

    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'esvojopAdminHud';
      hud.className = 'admin-hud reveal';
      document.body.appendChild(hud);
    }

    hud.innerHTML = `
      <div class="hud-left">
        <span class="hud-logo">🏐 ESVOJOP · LIVE CMS</span>
        <span class="hud-status"><span class="hud-pulse"></span> Modo Edición</span>
      </div>
      <div class="hud-actions">
        <button class="hud-btn ${_isTextEditMode ? 'admin-hud-btn-active' : ''}" id="hudToggleTexts" title="Activar/desactivar edición de textos en tiempo real">
          ✏️ Textos
        </button>
        <button class="hud-btn ${_isDeleteMode ? 'admin-hud-btn-active' : ''}" id="hudToggleDelete" title="Quitar o restaurar elementos visuales">
          🗑️ Quitar
        </button>
        <button class="hud-btn ${_isImgEditMode ? 'admin-hud-btn-active' : ''}" id="hudToggleImgs" title="Cambiar fotos e imágenes">
          📷 Fotos
        </button>
        <button class="hud-btn" id="hudAddPhoto" title="Añadir foto nueva a la galería">
          📸 + Galería
        </button>
        <button class="hud-btn" id="hudAddCard" title="Añadir tarjeta a contenido">
          📝 + Tarjeta
        </button>
        <button class="hud-btn" id="hudChangesMgr" title="Centro de restauración y control de cambios">
          ⏪ Cambios (${totalChanges})
        </button>
        <button class="hud-btn hud-btn-danger" id="hudLogout" title="Cerrar sesión de administrador">
          🔒 Salir
        </button>
      </div>
    `;

    hud.querySelector('#hudToggleTexts').addEventListener('click', () => toggleTextEditMode());
    hud.querySelector('#hudToggleDelete').addEventListener('click', () => toggleDeleteMode());
    hud.querySelector('#hudToggleImgs').addEventListener('click', () => toggleImgEditMode());
    hud.querySelector('#hudAddPhoto').addEventListener('click', () => openAddPhotoModal());
    hud.querySelector('#hudAddCard').addEventListener('click', () => openAddCardModal());
    hud.querySelector('#hudChangesMgr').addEventListener('click', () => openChangesManagerModal());
    hud.querySelector('#hudLogout').addEventListener('click', () => setAdmin(false));
  }

  /* ── Botón de Acceso en el Footer (Toggle) ── */
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
    toggle.setAttribute('aria-label', 'Acceso Administrador');
    toggle.title = _isAdmin ? 'Modo Administrador Activo' : 'Acceso Administrador';
    toggle.textContent = _isAdmin ? '🔓' : '🔒';

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
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

  /* ── Gestión de Contenido: Añadir Foto a la Galería ── */
  function openAddPhotoModal() {
    const formHtml = `
      <form class="ac-form" id="addPhotoForm">
        <div class="ac-field">
          <label for="photo-title">Título o Descripción de la Fotografía</label>
          <input type="text" id="photo-title" name="title" placeholder="Ej: Torneo Departamental de Menores Tunja" required class="ac-input">
        </div>
        <div class="ac-field">
          <label for="photo-cat">Categoría Deportiva</label>
          <select id="photo-cat" name="category" class="ac-input" style="cursor:pointer;">
            <option value="partidos">🏆 Partidos & Torneos</option>
            <option value="entrenamientos">🏐 Entrenamientos IRDET</option>
            <option value="comunidad">🤝 Comunidad & Equipo</option>
          </select>
        </div>
        <div class="ac-field">
          <label for="photo-file">Seleccionar Fotografía (JPG, PNG)</label>
          <input type="file" id="photo-file" accept="image/*" required class="ac-input ac-file-input">
        </div>
        <div class="ac-preview-box" id="photoPreviewBox" style="display:none;">
          <img id="photoPreviewImg" alt="Vista previa">
        </div>
        <div class="ac-actions">
          <button type="submit" class="btn btn-secondary btn-shine btn-block">🚀 Publicar en Galería</button>
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
      modal.remove();
      updateHud();
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
    item.setAttribute('data-cms-key', `${getPageId()}::custom_photo::${photo.id}`);
    item.innerHTML = `
      <img src="${photo.src}" alt="${photo.title}" loading="lazy">
      <div class="overlay"><span>${photo.title}</span></div>
      <button class="admin-item-delete" title="Eliminar foto">&times;</button>
    `;

    galleryGrid.insertBefore(item, galleryGrid.firstChild);
    attachCustomDelete(item, photo.id, STORAGE_GALLERY);
  }

  function loadStoredCustomPhotos() {
    const photos = getStored(STORAGE_GALLERY, []);
    photos.forEach((p) => renderCustomPhotoInDOM(p));
  }

  /* ── Modal de Añadir Tarjeta (Contenido Extra) ── */
  function openAddCardModal() {
    const formHtml = `
      <form class="ac-form" id="addCardForm">
        <div class="ac-field">
          <label for="card-title">Título del Implemento o Noticia</label>
          <input type="text" id="card-title" name="title" placeholder="Ej: Nueva Rodillera de Competición" required class="ac-input">
        </div>
        <div class="ac-field">
          <label for="card-cat">Subtítulo / Categoría</label>
          <input type="text" id="card-cat" name="cat" placeholder="Ej: Indumentaria Oficial" required class="ac-input">
        </div>
        <div class="ac-field">
          <label for="card-file">Imagen Opcional</label>
          <input type="file" id="card-file" accept="image/*" class="ac-input ac-file-input">
        </div>
        <div class="ac-actions">
          <button type="submit" class="btn btn-secondary btn-shine btn-block">✨ Guardar Tarjeta</button>
        </div>
      </form>
    `;

    const modal = createModal('Nueva <span>Tarjeta de Contenido</span>', formHtml);
    const form = modal.querySelector('#addCardForm');
    const fileInput = modal.querySelector('#card-file');
    let cardImg = 'img/fotos/imagines/WhatsApp%20Image%202026-04-20%20at%204.32.25%20PM.jpeg';

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          cardImg = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = modal.querySelector('#card-title').value.trim();
      const cat = modal.querySelector('#card-cat').value.trim();

      const cardObj = {
        id: 'card_' + Date.now(),
        title,
        cat,
        img: cardImg,
        date: new Date().toLocaleDateString('es-CO')
      };

      const list = getStored(STORAGE_CARDS, []);
      list.unshift(cardObj);
      setStored(STORAGE_CARDS, list);

      renderCustomCardInDOM(cardObj);
      notify('📝 Tarjeta guardada exitosamente');
      modal.remove();
      updateHud();
    });
  }

  function renderCustomCardInDOM(card) {
    const extraGrid = document.querySelector('.extra-grid');
    if (!extraGrid) return;

    if (extraGrid.querySelector(`[data-custom-id="${card.id}"]`)) return;

    const el = document.createElement('div');
    el.className = 'extra-card reveal visible custom-admin-card';
    el.setAttribute('data-custom-id', card.id);
    el.setAttribute('data-img', card.img);
    el.setAttribute('data-cms-key', `${getPageId()}::custom_card::${card.id}`);
    el.innerHTML = `
      <div class="ec-overlay"></div>
      <img src="${card.img}" alt="${card.title}" class="ec-img">
      <div class="ec-body">
        <div class="ec-cat">${card.cat}</div>
        <h4>${card.title}</h4>
      </div>
      <button class="admin-item-delete" title="Eliminar tarjeta">&times;</button>
    `;

    extraGrid.insertBefore(el, extraGrid.firstChild);
    attachCustomDelete(el, card.id, STORAGE_CARDS);
  }

  function loadStoredCustomCards() {
    const cards = getStored(STORAGE_CARDS, []);
    cards.forEach((c) => renderCustomCardInDOM(c));
  }

  function attachCustomDelete(element, id, storageKey) {
    const delBtn = element.querySelector('.admin-item-delete');
    if (!delBtn) return;

    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('🗑️ ¿Estás seguro de que deseas eliminar este elemento personalizado?')) {
        element.style.transition = 'all 0.3s ease';
        element.style.transform = 'scale(0.8)';
        element.style.opacity = '0';
        setTimeout(() => {
          element.remove();
          const list = getStored(storageKey, []).filter((item) => item.id !== id);
          setStored(storageKey, list);
          notify('🗑️ Elemento eliminado del almacenamiento');
          updateHud();
        }, 300);
      }
    });
  }

  /* ── Inicialización General ── */
  function init() {
    assignCmsKeys();
    applyPersistedChanges();
    initAdminToggle();

    if (_isAdmin) {
      document.body.classList.add('admin-mode');
      updateHud();
    }
  }

  return {
    init,
    isAdmin,
    login: showLoginModal,
    logout: () => setAdmin(false),
    toggleTexts: toggleTextEditMode,
    toggleDelete: toggleDeleteMode,
    toggleImages: toggleImgEditMode,
    openManager: openChangesManagerModal,
    addPhoto: openAddPhotoModal,
    addCard: openAddCardModal,
    backup: downloadBackup
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  EsvojopAdmin.init();
});
