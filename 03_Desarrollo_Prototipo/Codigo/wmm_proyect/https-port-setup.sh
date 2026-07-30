#!/bin/bash
# https-port-setup.sh
# Redirige el puerto HTTPS (443) al puerto del servidor Node.js (3000)
# mediante iptables PREROUTING + OUTPUT, y persiste las reglas al reinicio.

HTTPS_PORT=443
APP_PORT=3000

echo "⚙️ Configurando redirección de puerto $HTTPS_PORT → $APP_PORT..."

# ── 1. Aplicar reglas iptables (idempotente: no duplica si ya existen) ────────

# Tráfico entrante desde otras máquinas (PREROUTING)
sudo iptables -t nat -C PREROUTING \
    -p tcp --dport $HTTPS_PORT \
    -j REDIRECT --to-port $APP_PORT 2>/dev/null \
|| sudo iptables -t nat -A PREROUTING \
    -p tcp --dport $HTTPS_PORT \
    -j REDIRECT --to-port $APP_PORT

# Tráfico local (localhost → 443), necesario para conexiones desde el mismo host
sudo iptables -t nat -C OUTPUT \
    -p tcp -o lo --dport $HTTPS_PORT \
    -j REDIRECT --to-port $APP_PORT 2>/dev/null \
|| sudo iptables -t nat -A OUTPUT \
    -p tcp -o lo --dport $HTTPS_PORT \
    -j REDIRECT --to-port $APP_PORT

echo "✅ Reglas de redirección activas:"
sudo iptables -t nat -L -n -v | grep -E "$HTTPS_PORT|$APP_PORT|REDIRECT"

# ── 2. Persistencia ──────────────────────────────────────────────────────────

if command -v netfilter-persistent &>/dev/null; then
    # Método preferido: iptables-persistent (Debian/Ubuntu)
    echo "⚙️ Guardando reglas con netfilter-persistent..."
    sudo netfilter-persistent save
    sudo systemctl enable netfilter-persistent
    echo "✅ Reglas guardadas y servicio habilitado (netfilter-persistent)."

elif command -v iptables-save &>/dev/null; then
    # Fallback: guardar en archivo y crear un servicio systemd que las restaure
    RULES_FILE="/etc/iptables/rules.v4"
    SERVICE_FILE="/etc/systemd/system/iptables-restore.service"

    echo "⚙️ iptables-persistent no encontrado. Usando fallback con systemd..."

    sudo mkdir -p /etc/iptables
    sudo iptables-save | sudo tee "$RULES_FILE" > /dev/null
    echo "   Reglas guardadas en $RULES_FILE"

    # Crear servicio systemd si no existe
    if [ ! -f "$SERVICE_FILE" ]; then
        sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Restaurar reglas iptables al inicio
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/iptables-restore < $RULES_FILE
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
        sudo systemctl daemon-reload
        sudo systemctl enable iptables-restore
        echo "✅ Servicio systemd 'iptables-restore' creado y habilitado."
    else
        # El servicio ya existe: solo actualizar las reglas guardadas
        echo "   Servicio systemd ya existente. Reglas actualizadas en $RULES_FILE."
    fi

else
    echo "⚠️  No se pudo persistir automáticamente."
    echo "   Instalá 'iptables-persistent' con:  sudo apt install iptables-persistent"
fi

echo ""
echo "✅ Redirección 443 → 3000 configurada correctamente."
