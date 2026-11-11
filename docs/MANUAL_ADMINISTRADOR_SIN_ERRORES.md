# 🛡️ MANUAL TÉCNICO DEL ADMINISTRADOR — ESVOJOP 2026
## Guía para Modificar Contenidos Sin Romper la Lógica ni Sobrescribir Códigos
**Rol:** Desarrollador Senior / Tech Lead  
**Dirigido a:** Administrador del Sitio Web y Equipo Directivo de ESVOJOP  
**Versión:** 1.0 (Producción Certificada)

---

## 📌 1. ESTRUCTURA LIMPIA: DÓNDE TRABAJAR

| Carpeta / Archivo | Propósito | ¿Se debe editar? |
|---|---|:---:|
| `c:\Users\avima\ESVOJOP2026\voleibol\` | **SITIO WEB ACTIVO EN PRODUCCIÓN** | ✅ **SÍ** (Aquí se hacen todos los cambios). |
| `PLAN_MVP_PRODUCCION.md` | Hoja de ruta y especificaciones del proyecto | ℹ️ Solo lectura / Seguimiento. |
| `MANUAL_ADMINISTRADOR_SIN_ERRORES.md` | Guía de mantenimiento seguro | ℹ️ Consulta técnica. |

> 💡 **Nota de Arquitectura:** Se han purgado todas las carpetas temporales y antiguas. Todo el proyecto activo se encuentra concentrado única y exclusivamente en `voleibol/`, eliminando cualquier riesgo de confusión de versiones.

---

## 🔒 2. CÓMO EVITAR QUE SE SOBREESCRIBA O SE DAÑE EL CÓDIGO

Para garantizar que un cambio de texto o imagen **nunca rompa la funcionalidad** del sitio web, se implementaron 3 capas de protección técnica:

### Capa 1: Desacoplamiento entre Lógica y Contenido
El código JavaScript (`main.js` y `contacto.js`) **no depende del texto visible**. 
- Si cambias el precio de un uniforme de `$110.000` a `$125.000`, la web **no se rompe**.
- Si cambias el nombre del entrenador, el horario o el teléfono, el formulario y los botones siguen funcionando al 100%.

### Capa 2: Regla para Editar HTML con Seguridad
Al editar cualquier archivo `.html`, modifica **únicamente el contenido que está entre las etiquetas**:
```html
<!-- CORRECTO: Modificas solo el texto visible -->
<h4>Uniforme Completo ESVOJOP</h4>
<div class="price">$110.000 COP</div>

<!-- ❌ INCORRECTO: Borrar o alterar clases, IDs o etiquetas -->
<h4 class="product-title">  <-- Si borras la clase, se daña el diseño
<form id="form-contacto">   <-- Si borras el ID, el formulario deja de enviar
```

### Capa 3: Control de Versiones Git (Tu Red de Seguridad Inmediata)
El proyecto cuenta con **Git** inicializado en la raíz. Cada cambio queda registrado.
Si un administrador comete un error, borra código sin querer o descuadra la pantalla, **puede recuperarlo en 2 segundos** con un solo comando en la terminal:

```bash
# 1. Ver qué archivos se modificaron:
git status

# 2. Ver exactamente qué líneas cambiaron:
git diff

# 3. REVERTIR CUALQUIER ERROR Y DEJAR TODO PERFECTO OTRA VEZ:
git restore .
```

---

## 📝 3. GUÍA PRÁCTICA: CÓMO HACER CAMBIOS FRECUENTES

### A. ¿Cómo cambiar el número de WhatsApp o Teléfono?
El número oficial del profesor Jorge (+57 310 343 4293) se encuentra en la cabecera `.top-bar` y en los enlaces WhatsApp:
1. Abre el archivo HTML deseado en `voleibol/`.
2. Busca: `573103434293`.
3. Si cambias de número, reemplaza únicamente los dígitos en `https://wa.me/57TUNUEVONUMERO`.

### B. ¿Cómo actualizar los Precios en el Catálogo (`tienda.html`)?
1. Abre [`voleibol/tienda.html`](file:///c:/Users/avima/ESVOJOP2026/voleibol/tienda.html).
2. Busca la tarjeta del producto (ejemplo: `<div class="price">$110.000 COP</div>`).
3. Modifica el número. Guarda el archivo (`Ctrl + S`).

### C. ¿Cómo agregar o cambiar una foto en la Galería (`galeria.html`)?
1. Guarda la nueva foto dentro de `voleibol/img/fotos/imagines/`.
2. Abre [`voleibol/galeria.html`](file:///c:/Users/avima/ESVOJOP2026/voleibol/galeria.html).
3. Busca el bloque `<div class="gallery-item reveal">` y actualiza la ruta `src` y el texto de `<span>`:
```html
<div class="gallery-item reveal">
  <img src="img/fotos/imagines/TU_NUEVA_FOTO.jpeg" alt="Descripción deportiva" loading="lazy">
  <div class="overlay"><span>Descripción que aparece al pasar el cursor</span></div>
</div>
```
El visor ampliado (*Lightbox*) lo detectará automáticamente sin necesidad de tocar JavaScript.

### D. ¿Cómo cambiar el correo de destino de los formularios?
Los formularios envían a `avimateo2@gmail.com` a través de FormSubmit.
Si deseas cambiar el correo de destino, edita la línea en `index.html` y `contacto.html`:
```html
<form action="https://formsubmit.co/TU_NUEVO_CORREO@gmail.com" method="POST" id="form-contacto">
```

---

## 🛑 4. LO QUE NUNCA SE DEBE TOCAR

1. **`voleibol/css/style.css`**: No modificar los nombres de las clases CSS fundamentales (`.site-header`, `.top-bar`, `.trial-section`, `.product-card`, `.lightbox`).
2. **`voleibol/js/main.js`**: Contiene la lógica del visor Lightbox, menú hamburguesa accesible, filtros y animaciones.
3. **`voleibol/js/modules/contacto.js`**: Contiene el envío seguro por AJAX con protección anti-spam. Si este archivo se altera, los formularios podrían fallar.
4. **La directiva `<meta http-equiv="Content-Security-Policy">`**: Es el escudo que previene inyecciones maliciosas y ataques de suplantación.

---

## 🚀 5. CERTIFICACIÓN DE CALIDAD DE PRODUCCIÓN

- [x] Respaldo de seguridad original aislado y protegido.
- [x] Control de versiones Git activo para reversión inmediata ante errores humanos.
- [x] Lógica desacoplada de contenidos (cero riesgo de rotura por edición de textos).
- [x] Fallback automático a WhatsApp si el servidor de correo se desconecta.
- [x] 0 errores de sintaxis o consola validados.

