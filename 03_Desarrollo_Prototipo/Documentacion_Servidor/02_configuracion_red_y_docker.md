# Configuración de Red y Docker

## 1. Instalar Docker y Docker Compose

```bash
# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y ca-certificates curl gnupg

# Agregar repositorio oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker y Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Agregar usuario al grupo docker (evitar sudo)
sudo usermod -aG docker $USER
newgrp docker
```

## 2. Optimizaciones de Red para WebRTC

```bash
# Aumentar buffers de red y optimizar para baja latencia
sudo tee -a /etc/sysctl.conf <<'EOF'
# WebRTC/mediasoup optimizations
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_low_latency = 1
EOF

sudo sysctl -p
```

## 3. mDNS para auditorio.local

mDNS (Multicast DNS) permite que cualquier dispositivo en la red local resuelva `auditorio.local` sin configurar DNS.

### Instalar Avahi

```bash
sudo apt install -y avahi-daemon avahi-utils
sudo systemctl enable avahi-daemon
sudo systemctl start avahi-daemon
```

### Configurar hostname

```bash
# Establecer el hostname
sudo hostnamectl set-hostname auditorio

# Verificar
hostname  # debe mostrar: auditorio

# Reiniciar Avahi
sudo systemctl restart avahi-daemon

# Verificar que use el nombre correcto
sudo systemctl status avahi-daemon | grep "Host name"
```

Debe mostrar: `Host name is auditorio.local`

## 4. Redirección de Puerto 443 → 3000

Para acceder al servidor sin especificar el puerto:

```bash
# Aplicar redirección (en puerto de enrutamiento PREROUTING)
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 3000

# Persistir reglas
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```
