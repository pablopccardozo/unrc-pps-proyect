Configuración completa de una Intel NUC como servidor de audio.

## 1 Preparación del USB Bootable

```bash
# Descargar Ubuntu Server 24.04 LTS
# Usar Rufus (Windows) o dd (Linux/Mac) para crear USB booteable

# En Linux/Mac:
sudo dd if=ubuntu-24.04-live-server-amd64.iso of=/dev/sdX bs=4M status=progress
```

## 2 Configuración de BIOS en Intel NUC

Al iniciar, presionar **F2** para entrar al BIOS.
Configuraciones:

| Opción                    | Valor    | Razón                          |
| ------------------------- | -------- | ------------------------------ |
| Secure Boot               | Disabled | Evitar problemas con el Booteo |
| Intel Virtualization      | Enabled  | Para Docker/containers         |
| Wake on LAN               | Enabled  | Para administración remota     |
| Power On after Power Loss | Enabled  | Reinicio automático            |
| Fast Boot                 | Disabled | Para escanear puerto USB       |

## 3 Instalación Mínima de Ubuntu Server

Seguir la guía estándar , pero con estas selecciones **fundamentales**:

- **Paquetes a instalar**: SOLO OpenSSH Server (NO instales Docker ni otros snaps)
- **Storage**: Usa LVM con partición `/boot` de 1GB
- **Usuario**: Crea un usuario con sudo

```bash
# Después del primer boot, actualizar
sudo apt update && sudo apt upgrade -y
```

## Parte 2: Configuraciones del Servidor

### 4. Copiar tu código a la NUC

Desde la **computadora local** (donde está el código en la versión en desarrollo):

```bash
# Opción 1: Usando scp (desde tu PC)
cd /ruta/de/proyecto-en-desarrollo
scp -r server/* gidat@192.168.1.42:~/wmm-audio-server/server/

# Opción 2: Usando rsync (más eficiente)
rsync -avz --progress server/ gidat@192.168.1.42:~/wmm-audio-server/server/

# Opción 3: Si tienes git
git clone <tu-repo> ~/wmm-audio-server
```

