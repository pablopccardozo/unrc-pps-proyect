#!/bin/bash
# generate-ssl.sh — Genera certificados SSL autofirmados con SAN para auditorio.local
# Ejecutar cuando se necesiten nuevos certificados (expiran en 365 días)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SSL_DIR="$SCRIPT_DIR/server/ssl"

echo "=== Generando certificados SSL ==="

mkdir -p "$SSL_DIR"

# Detectar IP actual para incluirla como SAN
CURRENT_IP=$(ip -4 addr show scope global 2>/dev/null \
    | grep -oP '(?<=inet\s)\d+(\.\d+){3}' \
    | head -1)

# Construir SANs
SAN="DNS:auditorio.local,DNS:localhost"
if [ -n "$CURRENT_IP" ]; then
    SAN="$SAN,IP:$CURRENT_IP"
    echo "   Incluyendo IP actual: $CURRENT_IP"
fi

openssl req -x509 -newkey rsa:4096 \
    -keyout "$SSL_DIR/key.pem" \
    -out "$SSL_DIR/cert.pem" \
    -days 365 -nodes \
    -subj "/CN=auditorio.local" \
    -addext "subjectAltName=$SAN"

echo ""
echo "✅ Certificados generados en $SSL_DIR/"
echo "   CN: auditorio.local"
echo "   SANs: $SAN"
echo "   Validez: 365 días"
echo ""
echo "   Verificar con: openssl x509 -in $SSL_DIR/cert.pem -text -noout | grep -A1 'Alternative'"
