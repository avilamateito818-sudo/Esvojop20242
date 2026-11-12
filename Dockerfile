# ═══════════════════════════════════════════════════════
# ESVOJOP 2026 · Dockerfile de Producción
# Servidor web ultra-liviano y aislado basado en Nginx Alpine
# ═══════════════════════════════════════════════════════
FROM nginx:1.27-alpine

LABEL maintainer="ESVOJOP Club de Voleibol"
LABEL version="2026.1"
LABEL description="Contenedor oficial aislado para el portal web de ESVOJOP"

# Copiar configuración personalizada y securizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Limpiar directorio html por defecto
RUN rm -rf /usr/share/nginx/html/*

# Copiar el código estático optimizado de la página web
COPY . /usr/share/nginx/html/

# Exponer el puerto interno 80
EXPOSE 80

# Chequeo de salud del contenedor
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

# Arrancar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]

