#!/bin/bash
# install-server.sh — Script de instalación completa para Ubuntu Server
# Ejecutar UNA VEZ en el servidor destino con sudo
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_USER="${SUDO_USER:-$(whoami)}"
INSTALL_DIR="$SCRIPT_DIR"

echo "============================================"
echo "  WMM Audio Server — Instalación Completa"
echo "============================================"
echo ""
echo "  Directorio: $INSTALL_DIR"
echo "  Usuario:    $INSTALL_USER"
echo ""

# ── 1. Verificar que se ejecuta como root ──
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script requiere sudo. Ejecutar con: sudo bash install-server.sh"
    exit 1
fi

# ── 2. Instalar dependencias del sistema ──
echo "── Instalando dependencias del sistema ──"
apt-get update -qq
apt-get install -y docker.io docker-compose-v2 avahi-daemon avahi-utils iptables

# Habilitar Docker
systemctl enable docker
systemctl start docker

# Agregar usuario al grupo docker
usermod -aG docker "$INSTALL_USER"

# ── 3. Configurar mDNS (Avahi) ──
echo "── Configurando mDNS (auditorio.local) ──"
bash "$INSTALL_DIR/setup-mdns.sh"

# ── 4. Generar certificados SSL ──
echo "── Generando certificados SSL ──"
if [ ! -f "$INSTALL_DIR/server/ssl/cert.pem" ]; then
    bash "$INSTALL_DIR/generate-ssl.sh"
else
    echo "   Certificados ya existen. Salteando."
    echo "   Para regenerar: bash generate-ssl.sh"
fi

# ── 5. Hacer ejecutables los scripts ──
echo "── Configurando permisos ──"
chmod +x "$INSTALL_DIR/start-services.sh"
chmod +x "$INSTALL_DIR/network-watch.sh"
chmod +x "$INSTALL_DIR/wmm-qos-setup.sh"
chmod +x "$INSTALL_DIR/https-port-setup.sh"
chmod +x "$INSTALL_DIR/setup-mdns.sh"
chmod +x "$INSTALL_DIR/generate-ssl.sh"

# ── 6. Instalar servicios systemd ──
echo "── Instalando servicios systemd ──"

# Actualizar paths en los .service para que apunten a este directorio
sed -i "s|/home/gidat/wmm_proyect|$INSTALL_DIR|g" "$INSTALL_DIR/wmm-audio.service"
sed -i "s|/home/gidat/wmm_proyect|$INSTALL_DIR|g" "$INSTALL_DIR/wmm-network-watch.service"

cp "$INSTALL_DIR/wmm-audio.service" /etc/systemd/system/
cp "$INSTALL_DIR/wmm-network-watch.service" /etc/systemd/system/

systemctl daemon-reload
systemctl enable wmm-audio.service
systemctl enable wmm-network-watch.service

# ── 7. Construir la imagen Docker ──
echo "── Construyendo imagen Docker ──"
cd "$INSTALL_DIR"
docker compose build

# ── 8. Configurar redirección HTTPS ──
echo "── Configurando redirección HTTPS ──"
bash "$INSTALL_DIR/https-port-setup.sh"

echo ""
echo "============================================"
echo "  ✅ Instalación completada"
echo "============================================"
echo ""
echo "  El servidor se iniciará automáticamente"
echo "  al encender o conectar la red."
echo ""
echo "  Para iniciar ahora:"
echo "    sudo systemctl start wmm-audio"
echo ""
echo "  Acceso:"
echo "    https://auditorio.local/"
echo ""
echo "  Logs:"
echo "    sudo journalctl -u wmm-audio -f"
echo "    sudo journalctl -u wmm-network-watch -f"
echo ""
echo "  ⚠️  Cerrá sesión y volvé a entrar para"
echo "     usar docker sin sudo (grupo docker)"
echo ""
