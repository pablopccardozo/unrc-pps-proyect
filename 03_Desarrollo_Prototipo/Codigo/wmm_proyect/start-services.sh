#!/bin/bash
# start-services.sh — Arranque principal de WMM Audio Server
# Diseñado para ejecutarse como servicio systemd (plug-and-play)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== WMM Audio Server - Arranque ==="

# ── 1. Esperar a que la red LAN esté lista (NO requiere internet) ──
echo "Esperando conexión de red LAN..."
MAX_WAIT=60
WAITED=0
while ! ip -4 addr show scope global 2>/dev/null | grep -q inet; do
    sleep 2
    WAITED=$((WAITED + 2))
    if [ "$WAITED" -ge "$MAX_WAIT" ]; then
        echo "❌ Timeout: no se detectó IP de red en ${MAX_WAIT}s"
        exit 1
    fi
done

# ── 2. Detectar IP automáticamente ──
# Prioridad: primera IPv4 global no-loopback encontrada
DETECTED_IP=$(ip -4 addr show scope global 2>/dev/null \
    | grep -oP '(?<=inet\s)\d+(\.\d+){3}' \
    | head -1)

if [ -z "$DETECTED_IP" ]; then
    echo "❌ No se pudo detectar una IP de red"
    exit 1
fi

echo "✅ IP detectada: $DETECTED_IP"

# ── 3. Exportar para que Docker Compose la use ──
export HOST="$DETECTED_IP"

# ── 4. Aplicar reglas QoS (cadena custom, no flush global) ──
echo "Aplicando reglas QoS..."
bash "$SCRIPT_DIR/wmm-qos-setup.sh"

# ── 5. Aplicar redirección HTTPS 443 → 3000 ──
echo "Configurando redirección HTTPS..."
bash "$SCRIPT_DIR/https-port-setup.sh"

# ── 6. Levantar Docker ──
echo "Levantando contenedor..."
cd "$SCRIPT_DIR"
docker compose up -d

echo "=== ✅ Listo! ==="
echo "    mDNS:   https://auditorio.local/"
echo "    IP:     https://$DETECTED_IP/"
echo "    Puerto: https://$DETECTED_IP:3000/"