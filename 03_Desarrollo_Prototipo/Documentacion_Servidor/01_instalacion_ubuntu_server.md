# Instalación del Servidor Ubuntu

Guía de instalación mínima de Ubuntu Server para la Intel NUC utilizada como servidor de audio.

## 1. Preparación del USB Booteable

```bash
# Descargar Ubuntu Server 24.04 LTS
# Usar Rufus (Windows) o dd (Linux/Mac) para crear USB booteable

# En Linux/Mac:
sudo dd if=ubuntu-24.04-live-server-amd64.iso of=/dev/sdX bs=4M status=progress
```

## 2. Configuración de BIOS en Intel NUC

Al iniciar, presionar **F2** para entrar al BIOS:

| Opción | Valor | Razón |
|--------|-------|-------|
| Secure Boot | Disabled | Evitar problemas con el booteo |
| Intel Virtualization | Enabled | Para Docker/containers |
| Wake on LAN | Enabled | Administración remota |
| Power On after Power Loss | Enabled | Reinicio automático ante cortes |
| Fast Boot | Disabled | Para escanear puerto USB |

## 3. Instalación de Ubuntu Server

Durante la instalación estándar, seleccionar:

- **Paquetes**: SOLO OpenSSH Server (no instalar Docker ni otros snaps)
- **Storage**: Usar LVM con partición `/boot` de 1 GB
- **Usuario**: Crear un usuario con sudo (ej: `gidat`)

```bash
# Después del primer boot, actualizar
sudo apt update && sudo apt upgrade -y
```

## 4. Verificación Post-Instalación

```bash
# Verificar hostname
hostnamectl

# Verificar IP asignada
ip addr show scope global

# Verificar conectividad
ping -c 3 8.8.8.8
```
