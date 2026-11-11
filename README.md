# 🏐 Club de Voleibol ESVOJOP — Tunja, Boyacá (2026)
### Plataforma Web Oficial y Embudo de Captación Deportiva de Alto Rendimiento

Sitio web oficial del **Club de Voleibol ESVOJOP**, diseñado para la formación de atletas desde categorías infantiles hasta mayores en Tunja, Boyacá. Diseñado bajo el estándar de conversión y profesionalismo de [Club Vóley Máster](https://clubvoleymaster.com/).

---

## ⚡ Características Principales

- **Barra Superior de Notificaciones (Top Bar):** Estado de inscripciones temporada 2026, sede oficial y enlaces de contacto directo.
- **Embudo de Conversión "Clase de Cortesía Gratuita":** Acceso rápido para nuevos deportistas y familias.
- **Catálogo Oficial sin Emojis:** Fotografías auténticas del uniforme ESVOJOP, balones de competición FIVB, rodilleras pro y calzado con pedidos directos vía WhatsApp.
- **Formulario AJAX Seguro con Fallback:** Envío asíncrono a través de FormSubmit (`avimateo2@gmail.com`) con trampa anti-spam (*honeypot*) y apertura automática de WhatsApp con datos prellenados ante fallas de conexión.
- **Galería Interactiva:** Visor Lightbox accesible y responsive con navegación por teclado (`Esc`, `←`, `→`).
- **Seguridad:** Blindado mediante directiva CSP (*Content Security Policy*) estricta y protección contra inyecciones XSS.

---

## 🏟️ Sede Oficial de Entrenamiento

- **Lugar:** Polideportivo IRDET (Tunja, Boyacá, Colombia).
- **Días:** Martes y Jueves.
- **Horario:** 5:00 PM – 8:00 PM.
- **Dirección Deportiva:** Lic. Jorge Hercid Pérez Florez (+57 310 343 4293 / `jorpeflo@gmail.com`).

---

## 📁 Estructura del Repositorio

```text
├── index.html                  # Landing principal de alto impacto
├── sobre-nosotros.html         # Historia, filosofía, cuerpo técnico y sede
├── galeria.html                # Galería de momentos y competencias
├── tienda.html                 # Catálogo oficial de equipamiento con precios COP
├── guia.html                   # Manual técnico de elección de implementos
├── contenido-extra.html        # Implementos ampliables y comunidad
├── contacto.html               # Formulario de inscripción y pasos de ingreso
├── css/
│   └── style.css               # Sistema de diseño responsive y variables de color
├── js/
│   ├── main.js                 # Control de interacciones, menú móvil y lightbox
│   └── modules/
│       └── contacto.js         # Lógica AJAX de formulario con fallback a WhatsApp
├── img/                        # Fotografías y vectores SVG del club
└── docs/                       # Documentación técnica y manuales de administración
    ├── MANUAL_ADMINISTRADOR_SIN_ERRORES.md
    ├── PLAN_MVP_PRODUCCION.md
    └── AUDITORIA_TECNICA_SENIOR.md
```

---

## 📖 Documentación para Administradores

Consulta [`docs/MANUAL_ADMINISTRADOR_SIN_ERRORES.md`](docs/MANUAL_ADMINISTRADOR_SIN_ERRORES.md) para saber cómo modificar precios, teléfonos y fotografías sin afectar la lógica de programación.

---

© 2026 ESVOJOP · Club de Voleibol. Formación deportiva de alto nivel.

