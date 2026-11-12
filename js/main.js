/* ═══════════════════════════════════════════
   ESVOJOP · CLUB DE VOLEIBOL
   Shared JavaScript & Interactions
   ═══════════════════════════════════════════ */

/* ── Toast Notification System (Global) ── */
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._hide);
  toast._hide = setTimeout(() => toast.classList.remove('show'), 3500);
}

document.addEventListener('DOMContentLoaded', () => {

  /* ── Cursor Glow con requestAnimationFrame (Optimizado) ── */
  const cursor = document.getElementById('cursor');
  if (cursor) {
    let mouseX = 0, mouseY = 0;
    let isMoving = false;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isMoving) {
        requestAnimationFrame(() => {
          cursor.style.left = mouseX + 'px';
          cursor.style.top = mouseY + 'px';
          isMoving = false;
        });
        isMoving = true;
      }
    });
  }

  /* ── Menú Móvil Hamburger ── */
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.querySelectorAll('.nav-links a').forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── Resaltar Enlace Activo en Navegación ── */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });

  /* ── Header Sticky Dynamic Elevation on Scroll ── */
  const siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (window.scrollY > 30) {
            siteHeader.classList.add('scrolled');
          } else {
            siteHeader.classList.remove('scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ── Interactive Hero Court Scanner (Mousemove Lighting Mesh) ── */
  const heroSection = document.querySelector('.hero');
  if (heroSection && window.matchMedia('(pointer: fine)').matches) {
    let heroTicking = false;
    heroSection.addEventListener('mousemove', (e) => {
      if (!heroTicking) {
        requestAnimationFrame(() => {
          const rect = heroSection.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          heroSection.style.setProperty('--scan-x', `${x.toFixed(1)}%`);
          heroSection.style.setProperty('--scan-y', `${y.toFixed(1)}%`);
          heroTicking = false;
        });
        heroTicking = true;
      }
    });
  }

  /* ── Animación Numérica Dinámica (Count-Up) ── */
  function animateCounters() {
    const counters = document.querySelectorAll('[data-count]:not(.counted)');
    counters.forEach((counter) => {
      counter.classList.add('counted');
      const target = parseFloat(counter.getAttribute('data-count')) || 0;
      const prefix = counter.getAttribute('data-prefix') || '';
      const suffix = counter.getAttribute('data-suffix') || '';
      const duration = 1600; // ms
      const startTime = performance.now();

      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing: easeOutCubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(easeProgress * target);
        counter.textContent = `${prefix}${currentVal}${suffix}`;
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          counter.textContent = `${prefix}${target}${suffix}`;
        }
      }
      requestAnimationFrame(update);
    });
  }

  /* ── Animación Scroll Reveal con IntersectionObserver (Múltiples Variantes) ── */
  const revealSelectors = '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-blur, .reveal-stagger';
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Si el elemento contiene contadores o es un contenedor de estadísticas
            if (entry.target.hasAttribute('data-count') || entry.target.querySelector('[data-count]')) {
              animateCounters();
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll(revealSelectors).forEach((el) => observer.observe(el));
  } else {
    // Fallback para navegadores antiguos
    document.querySelectorAll(revealSelectors).forEach((el) => el.classList.add('visible'));
    animateCounters();
  }

  /* ── Filtros del Catálogo Oficial ── */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const products = document.querySelectorAll('.product-card');
  if (filterBtns.length && products.length) {
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        products.forEach((p) => {
          if (filter === 'all' || p.dataset.category === filter) {
            p.style.display = 'block';
          } else {
            p.style.display = 'none';
          }
        });
      });
    });
  }

  /* ── Filtros Interactivos de la Galería ── */
  const galleryFilterBtns = document.querySelectorAll('.gallery-filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');
  if (galleryFilterBtns.length && galleryItems.length) {
    galleryFilterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        galleryFilterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        galleryItems.forEach((item) => {
          if (filter === 'all' || item.dataset.category === filter) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });
  }

  /* ── Pestañas de la Guía de Productos ── */
  const tabs = document.querySelectorAll('.guide-tab');
  const contents = document.querySelectorAll('.guide-content');
  if (tabs.length && contents.length) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        contents.forEach((c) => c.classList.remove('active'));
        const target = document.getElementById(tab.dataset.target);
        if (target) target.classList.add('active');
      });
    });
  }

  /* ── Lightbox Unificado (Galería + Contenido Extra) ── */
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lbClose = document.getElementById('lbClose');
    const lbImg = document.getElementById('lbImg');
    const lbPrev = document.getElementById('lbPrev');
    const lbNext = document.getElementById('lbNext');

    let currentImages = [];
    let currentIdx = 0;

    function openLightboxWithImages(images, idx) {
      if (!images.length) return;
      currentImages = images;
      currentIdx = idx;
      updateLightboxImage();
      lightbox.classList.add('open');
    }

    function updateLightboxImage() {
      if (!currentImages.length) return;
      const item = currentImages[currentIdx];
      lbImg.src = item.src;
      lbImg.alt = item.alt || 'ESVOJOP Voleibol';
    }

    window.changeLightboxImage = function(dir) {
      if (!currentImages.length) return;
      currentIdx = (currentIdx + dir + currentImages.length) % currentImages.length;
      updateLightboxImage();
    };

    lbClose?.addEventListener('click', () => lightbox.classList.remove('open'));
    lightbox.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) lightbox.classList.remove('open');
    });

    lbPrev?.addEventListener('click', () => window.changeLightboxImage(-1));
    lbNext?.addEventListener('click', () => window.changeLightboxImage(1));

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') lightbox.classList.remove('open');
      if (e.key === 'ArrowLeft') window.changeLightboxImage(-1);
      if (e.key === 'ArrowRight') window.changeLightboxImage(1);
    });

    // Galería principal
    const galleryGrid = document.querySelector('.gallery-grid');
    if (galleryGrid) {
      galleryGrid.addEventListener('click', (e) => {
        const item = e.target.closest('.gallery-item');
        if (!item) return;
        const allItems = Array.from(galleryGrid.querySelectorAll('.gallery-item'));
        const images = allItems.map((el) => {
          const img = el.querySelector('img');
          return { src: img ? img.src : '', alt: img ? img.alt : '' };
        });
        const idx = allItems.indexOf(item);
        if (idx !== -1) openLightboxWithImages(images, idx);
      });
    }

    // Contenido extra
    const extraGrid = document.querySelector('.extra-grid');
    if (extraGrid) {
      extraGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.extra-card[data-img]');
        if (!card) return;
        const allCards = Array.from(extraGrid.querySelectorAll('.extra-card[data-img]'));
        const images = allCards.map((el) => {
          const img = el.querySelector('img');
          return { src: el.dataset.img || (img ? img.src : ''), alt: img ? img.alt : '' };
        });
        const idx = allCards.indexOf(card);
        if (idx !== -1) openLightboxWithImages(images, idx);
      });
    }
  }
});
