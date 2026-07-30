#!/bin/bash
set -e  # Salir si hay error

echo "========================================="
echo "🚀 Iniciando servidor de Audio WMM"
echo "========================================="

# Verificar variables de entorno
echo "📋 Configuración:"
echo "   • HOST: ${HOST:-192.168.1.4}"
echo "   • PORT: ${PORT:-3000}"
echo "   • RTC Ports: ${RTC_MIN_PORT:-2000}-${RTC_MAX_PORT:-2050}"
echo "   • Node Environment: ${NODE_ENV:-production}"
echo "   • Audio Bitrate: ${AUDIO_BITRATE:-24000} kbps"

# Verificar que los certificados SSL existen
if [ ! -f /app/ssl/key.pem ] || [ ! -f /app/ssl/cert.pem ]; then
    echo "❌ Error: Certificados SSL no encontrados en /app/ssl/"
    echo "   Por favor, genera los certificados con:"
    echo "   openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes"
    exit 1
fi

# Verificar que podemos escribir en logs
if [ ! -w /app/logs ]; then
    echo "⚠️  No se puede escribir en /app/logs, creando directorio..."
    mkdir -p /app/logs 2>/dev/null || sudo mkdir -p /app/logs
    chmod 755 /app/logs 2>/dev/null || true
fi

echo "✅ Configuración completada, iniciando aplicación..."
echo "========================================="

# Ejecutar el comando original
exec "$@"