# Despliegue del Proyecto en el Servidor

## 1. Transferencia de Archivos

Desde la computadora local (donde está el código fuente):

```bash
# Opción 1: rsync (recomendada, más eficiente)
rsync -avz --progress ./wmm_proyect/ gidat@auditorio.local:~/wmm_proyect/

# Opción 2: scp
scp -r ./wmm_proyect/ gidat@auditorio.local:~/

# Opción 3: git (si está en un repositorio)
git clone <url-del-repo> ~/wmm_proyect
```

En este proyecto se utilizó la opción 1 (rsync).

## 2. Verificar Permisos de Ejecutables

Dentro de la carpeta del proyecto en el servidor (`~/wmm_proyect/`):

```bash
cd ~/wmm_proyect
ls -l *.sh
```

Todos los scripts `.sh` deben tener permiso de ejecución (`-rwxr-xr-x`). Si falta:

```bash
chmod +x wmm-qos-setup.sh install-server.sh start-services.sh \
         network-watch.sh https-port-setup.sh generate-ssl.sh setup-mdns.sh
```

## 3. Instalación Automática

Ejecutar el instalador que automatiza todo el proceso:

```bash
cd ~/wmm_proyect
sudo bash install-server.sh
```

Este script realiza:
1. Instalación de Docker, Avahi e iptables (si no están)
2. Configuración de mDNS para `auditorio.local`
3. Generación de certificados SSL con SAN
4. Redirección de puerto 443 → 3000
5. Copia y habilitación de servicios systemd
6. Build local de la imagen Docker
7. Arranque de la aplicación

## 4. Instalación Manual Paso a Paso

Si se prefiere instalar manualmente (por ejemplo, para depurar):

```bash
# 1. Aplicar QoS
sudo bash wmm-qos-setup.sh

# 2. Redirección HTTPS
sudo bash https-port-setup.sh

# 3. Construir y levantar contenedor
docker compose build
docker compose up -d

# 4. Copiar servicios systemd
sudo cp wmm-audio.service /etc/systemd/system/
sudo cp wmm-network-watch.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable wmm-audio.service
sudo systemctl enable wmm-network-watch.service
```
