/* ═══════════════════════════════════════════════════════════
   ESVOJOP 2026 · PANEL DE ADMINISTRACIÓN Y GESTIÓN EN VIVO
   Arquitectura: Desacoplada, Segura y con Efectos Exclusivos
   Versión: 2.0 Elite Senior
   ═══════════════════════════════════════════════════════════ */

const EsvojopAdmin = (() => {
  'use strict';

  const ADMIN_USER = 'esvojop';
  const ADMIN_PASS = 'esvojop2026';

  const STORAGE_AUTH = 'esvojop_admin_auth';
  const STORAGE_GALLERY = 'esvojop_admin_gallery_v2';
  const STORAGE_DELETED = 'esvojop_admin_deleted_v2';

  let _isAdmin = sessionStorage.getItem(STORAGE_AUTH) === 'true';

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
    renderAdminBadges();
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

    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'esvojopAdminHud';
      hud.className = 'admin-hud reveal';
      hud.innerHTML = `
        <div class="hud-left">
          <span class="hud-logo">🏐 ESVOJOP · ADMIN</span>
          <span class="hud-status"><span class="hud-pulse"></span> Modo Edición</span>
        </div>
        <div class="hud-actions">
          <button class="hud-btn" id="hudAddPhoto" title="Añadir foto a la galería">📸 + Foto</button>
          <button class="hud-btn" id="hudAddCard" title="Añadir tarjeta a contenido">📝 + Tarjeta</button>
          <button class="hud-btn" id="hudBackup" title="Descargar copia de seguridad">💾 Respaldo</button>
          <button class="hud-btn hud-btn-danger" id="hudLogout" title="Cerrar sesión de administrador">🔒 Salir</button>
        </div>
      `;
      document.body.appendChild(hud);

      hud.querySelector('#hudAddPhoto').addEventListener('click', () => openAddPhotoModal());
      hud.querySelector('#hudAddCard').addEventListener('click', () => openAddCardModal());
      hud.querySelector('#hudBackup').addEventListener('click', () => downloadBackup());
      hud.querySelector('#hudLogout').addEventListener('click', () => setAdmin(false));
    }
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

      saveCustomPhoto(photoItem);
      renderCustomPhotoInDOM(photoItem);
      notify('📸 Fotografía añadida exitosamente');
      modal.remove();
    });
  }

  /* ── Guardar y Cargar Fotos en LocalStorage ── */
  function getCustomPhotos() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_GALLERY)) || [];
    } catch {
      return [];
    }
  }

  function saveCustomPhoto(photo) {
    const list = getCustomPhotos();
    list.unshift(photo);
    localStorage.setItem(STORAGE_GALLERY, JSON.stringify(list));
  }

  function renderCustomPhotoInDOM(photo) {
    const galleryGrid = document.querySelector('.gallery-grid');
    if (!galleryGrid) return;

    const item = document.createElement('div');
    item.className = 'gallery-item reveal-scale visible custom-admin-item';
    item.setAttribute('data-category', photo.category);
    item.setAttribute('data-custom-id', photo.id);
    item.innerHTML = `
      <img src="${photo.src}" alt="${photo.title}" loading="lazy">
      <div class="overlay"><span>${photo.title}</span></div>
      <button class="admin-item-delete" title="Eliminar foto">&times;</button>
    `;

    galleryGrid.insertBefore(item, galleryGrid.firstChild);
    attachDeleteAction(item, photo.id, 'photo');
  }

  function loadStoredCustomPhotos() {
    const photos = getCustomPhotos();
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

      const extraGrid = document.querySelector('.extra-grid');
      if (extraGrid) {
        const card = document.createElement('div');
        card.className = 'extra-card reveal visible custom-admin-card';
        card.setAttribute('data-img', cardImg);
        card.innerHTML = `
          <div class="ec-overlay"></div>
          <img src="${cardImg}" alt="${title}" class="ec-img">
          <div class="ec-body">
            <div class="ec-cat">${cat}</div>
            <h4>${title}</h4>
          </div>
          <button class="admin-item-delete" title="Eliminar tarjeta">&times;</button>
        `;
        extraGrid.insertBefore(card, extraGrid.firstChild);
        attachDeleteAction(card, 'extra_' + Date.now(), 'card');
        notify('📝 Tarjeta agregada correctamente');
      } else {
        notify('ℹ️ Las tarjetas se visualizan en la página Contenido Extra');
      }
      modal.remove();
    });
  }

  /* ── Eliminación de Elementos ── */
  function attachDeleteAction(element, id, type) {
    const delBtn = element.querySelector('.admin-item-delete');
    if (!delBtn) return;

    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('🗑️ ¿Estás seguro de que deseas eliminar este elemento del club?')) {
        element.style.transition = 'all 0.3s ease';
        element.style.transform = 'scale(0.8)';
        element.style.opacity = '0';
        setTimeout(() => {
          element.remove();
          if (type === 'photo') {
            const list = getCustomPhotos().filter((p) => p.id !== id);
            localStorage.setItem(STORAGE_GALLERY, JSON.stringify(list));
          }
          notify('🗑️ Elemento eliminado del sitio');
        }, 300);
      }
    });
  }

  /* ── Descargar Copia de Seguridad JSON ── */
  function downloadBackup() {
    const backupData = {
      club: 'ESVOJOP 2026',
      exportDate: new Date().toISOString(),
      photos: getCustomPhotos()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESVOJOP_Copia_Seguridad_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('💾 Copia de respaldo descargada');
  }

  /* ── Botones de Edición y Eliminación en Tarjetas Existentes ── */
  function renderAdminBadges() {
    if (!_isAdmin) {
      document.querySelectorAll('.admin-item-delete').forEach((b) => {
        if (!b.closest('.custom-admin-item')) b.remove();
      });
      return;
    }

    // Botones de eliminar en elementos estáticos
    const targets = document.querySelectorAll('.gallery-item:not(.custom-admin-item)');
    targets.forEach((item, idx) => {
      if (!item.querySelector('.admin-item-delete')) {
        const btn = document.createElement('button');
        btn.className = 'admin-item-delete';
        btn.title = 'Ocultar esta foto';
        btn.innerHTML = '&times;';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('¿Deseas ocultar temporalmente esta fotografía del catálogo?')) {
            item.style.display = 'none';
            notify('Foto ocultada');
          }
        });
        item.appendChild(btn);
      }
    });
  }

  /* ── Inicialización General ── */
  function init() {
    initAdminToggle();
    loadStoredCustomPhotos();

    if (_isAdmin) {
      document.body.classList.add('admin-mode');
      updateHud();
      renderAdminBadges();
    }
  }

  return {
    init,
    isAdmin,
    login: showLoginModal,
    logout: () => setAdmin(false),
    addPhoto: openAddPhotoModal
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  EsvojopAdmin.init();
});
