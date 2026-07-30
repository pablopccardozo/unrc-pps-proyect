#!/bin/bash
# wmm-qos-setup.sh — Configuración de QoS con DSCP EF para tráfico de audio

echo "⚙️ Configurando QoS para WMM Audio Server..."

# Crear cadena custom si no existe, o limpiarla si ya existe
sudo iptables -t mangle -N WMM_QOS 2>/dev/null || sudo iptables -t mangle -F WMM_QOS

# Asegurar que la cadena está enganchada en OUTPUT y FORWARD
sudo iptables -t mangle -C OUTPUT -j WMM_QOS 2>/dev/null \
    || sudo iptables -t mangle -A OUTPUT -j WMM_QOS
sudo iptables -t mangle -C FORWARD -j WMM_QOS 2>/dev/null \
    || sudo iptables -t mangle -A FORWARD -j WMM_QOS

# Reglas de marcado DSCP EF (46) para puertos RTP
sudo iptables -t mangle -A WMM_QOS -p udp --sport 2000:2050 -j DSCP --set-dscp 46
sudo iptables -t mangle -A WMM_QOS -p udp --dport 2000:2050 -j DSCP --set-dscp 46

# Verificar reglas aplicadas
echo "✅ Reglas de QoS activas:"
sudo iptables -t mangle -L WMM_QOS -n -v

echo "✅ QoS configurado correctamente"