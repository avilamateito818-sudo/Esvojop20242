document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form[action*="formsubmit"]');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Si el honeypot fue llenado (bot), abortar silenciosamente
    const honey = this.querySelector('input[name="_honey"]');
    if (honey && honey.value) return;

    const data = Object.fromEntries(new FormData(this).entries());
    data._captcha = 'false';
    data._template = 'table';

    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Enviando mensaje...';

    const endpoint = this.getAttribute('action').replace('formsubmit.co/', 'formsubmit.co/ajax/');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error('Error en el servidor');

      const json = await res.json();
      if (json.success === 'true' || json.success === true) {
        if (typeof showToast === 'function') {
          showToast('¡Mensaje enviado con éxito! Te contactaremos pronto.');
        } else {
          alert('¡Mensaje enviado con éxito! Te contactaremos pronto.');
        }
        this.reset();
      } else {
        throw new Error(json.message || 'Error en respuesta');
      }
    } catch (err) {
      console.warn('FormSubmit AJAX fallback:', err);
      const fallbackMsg = `Hola Profesor Jorge, intenté enviar mis datos por la web de ESVOJOP:
Nombre: ${data.name || ''}
Edad: ${data.age || ''}
Teléfono: ${data.phone || ''}
Correo: ${data.email || ''}
Asunto: ${data.subject || ''}
Mensaje: ${data.message || ''}`;

      const waUrl = `https://wa.me/573103434293?text=${encodeURIComponent(fallbackMsg)}`;

      if (typeof showToast === 'function') {
        showToast('Problema de conexión con el servidor. Abriendo WhatsApp para enviar tus datos directamente...');
      } else {
        alert('Problema de conexión con el servidor. Abriendo WhatsApp para enviar tus datos directamente...');
      }

      setTimeout(() => {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }, 1500);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
});
