#!/bin/bash
# network-watch.sh — Monitorea cambios de IP y reinicia el contenedor Docker
# Se ejecuta como servicio systemd separado

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PREV_IP=""

echo "[network-watch] Iniciando monitoreo de IP..."

while true; do
    # Detectar IP: primera IPv4 global (funciona con cualquier interfaz)
    CURRENT_IP=$(ip -4 addr show scope global 2>/dev/null \
        | grep -oP '(?<=inet\s)\d+(\.\d+){3}' \
        | head -1)

    # Si hay IP y es diferente a la anterior
    if [ -n "$CURRENT_IP" ] && [ "$CURRENT_IP" != "$PREV_IP" ]; then

        if [ -n "$PREV_IP" ]; then
            echo "[network-watch] IP cambió: $PREV_IP → $CURRENT_IP. Reiniciando contenedor..."
            
            # Exportar nueva IP para que Docker Compose la use
            export HOST="$CURRENT_IP"
            
            # Recrear el contenedor con la nueva IP (no solo restart)
            cd "$SCRIPT_DIR"
            docker compose up -d

            echo "[network-watch] Contenedor reiniciado con nueva IP: $CURRENT_IP"
        else
            echo "[network-watch] IP inicial detectada: $CURRENT_IP"
        fi

        PREV_IP="$CURRENT_IP"
    fi

    sleep 10  # Verificar cada 10 segundos
done