#!/bin/bash
# setup-mdns.sh — Instala y configura Avahi para publicar auditorio.local
# Ejecutar UNA VEZ en el servidor Ubuntu (requiere sudo)
set -e

HOSTNAME_MDNS="auditorio"

echo "=== Configuración de mDNS (Avahi) ==="

# ── 1. Instalar Avahi ──
echo "Instalando avahi-daemon..."
sudo apt-get update -qq
sudo apt-get install -y avahi-daemon avahi-utils

# ── 2. Configurar hostname del sistema ──
echo "Configurando hostname: $HOSTNAME_MDNS"
sudo hostnamectl set-hostname "$HOSTNAME_MDNS"

# ── 3. Configurar Avahi ──
sudo tee /etc/avahi/avahi-daemon.conf > /dev/null <<EOF
[server]
host-name=$HOSTNAME_MDNS
domain-name=local
use-ipv4=yes
use-ipv6=no
ratelimit-interval-usec=1000000
ratelimit-burst=1000

[wide-area]
enable-wide-area=no

[publish]
publish-addresses=yes
publish-hinfo=no
publish-workstation=no
publish-domain=yes

[reflector]
enable-reflector=no

[rlimits]
EOF

# ── 4. Publicar servicio HTTPS como servicio Avahi (opcional pero útil) ──
sudo mkdir -p /etc/avahi/services
sudo tee /etc/avahi/services/wmm-audio.service > /dev/null <<EOF
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name>WMM Audio Server</name>
  <service>
    <type>_https._tcp</type>
    <port>443</port>
    <txt-record>path=/</txt-record>
  </service>
</service-group>
EOF

# ── 5. Habilitar y arrancar Avahi ──
sudo systemctl enable avahi-daemon
sudo systemctl restart avahi-daemon

echo ""
echo "✅ mDNS configurado correctamente"
echo "   Los clientes pueden acceder a: https://$HOSTNAME_MDNS.local/"
echo ""
echo "   Verificá con: avahi-resolve -n $HOSTNAME_MDNS.local"
