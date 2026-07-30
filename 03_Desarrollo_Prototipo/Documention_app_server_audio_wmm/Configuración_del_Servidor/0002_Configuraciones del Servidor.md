## 1 — Instalar Docker y Docker Compose

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

# Agregar tu usuario al grupo docker (para no necesitar sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### 2 — Configuración básica de red para WebRTC

```bash
# Aumentar buffers de red
sudo tee -a /etc/sysctl.conf <<'EOF'
# WebRTC/Mediasoup optimizations
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_low_latency = 1
EOF

sudo sysctl -p
```

### 3 — mDNS para el nombre `auditorio.local`

**mDNS (Multicast DNS)** permite que cualquier dispositivo en la red local resuelva `auditorio.local` sin configurar ningún servidor DNS. Android, iOS, Windows 10+, macOS y Linux lo soportan nativamente.

##### Instalar Avahi en el servidor

```bash
sudo apt install -y avahi-daemon avahi-utils
sudo systemctl enable avahi-daemon
sudo systemctl start avahi-daemon
```

##### Configurar el nombre del host

```bash
# Establecer el hostname de la NUC
sudo hostnamectl set-hostname auditorio

# Verificar
hostname  # debe mostrar: auditorio
```

reiniciarlo:

```bash
sudo systemctl restart avahi-daemon
```

Verificar que use el nombre correcto:

```bash
sudo systemctl status avahi-daemon | grep "Host name"
```

Debe mostrar:

```
Host name is auditorio.local
```
