# ═══════════════════════════════════════════════════════
# ESVOJOP 2026 · Dockerfile de Producción
# Servidor web ultra-liviano y aislado basado en Nginx Alpine
# ═══════════════════════════════════════════════════════
FROM nginx:1.27-alpine

LABEL maintainer="ESVOJOP Club de Voleibol"
LABEL version="2026.2"
LABEL description="Contenedor oficial aislado y endurecido para el portal web de ESVOJOP"

# Copiar configuración personalizada y securizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Limpiar directorio html por defecto y copiar únicamente activos web públicos
RUN rm -rf /usr/share/nginx/html/*
WORKDIR /usr/share/nginx/html
COPY *.html robots.txt ./
COPY css ./css
COPY js ./js
COPY img ./img

# Exponer el puerto interno 80
EXPOSE 80

# Chequeo de salud del contenedor
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

# Arrancar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
