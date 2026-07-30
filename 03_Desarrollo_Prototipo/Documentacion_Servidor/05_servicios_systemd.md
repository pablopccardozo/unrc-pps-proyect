# Servicios systemd

systemd es el sistema de inicio de Ubuntu Server. Es el primer proceso que arranca cuando el servidor se enciende (PID 1) y es responsable de levantar todos los servicios del sistema en el orden correcto.

## Los Dos Servicios del Proyecto

### 1. `wmm-audio.service`

**Ubicación:** `/etc/systemd/system/wmm-audio.service`

```ini
[Unit]
Description=WMM Audio Server
After=network-online.target docker.service avahi-daemon.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/gidat/wmm_proyect
ExecStart=/bin/bash /home/gidat/wmm_proyect/start-services.sh
ExecStop=/usr/bin/docker compose -f /home/gidat/wmm_proyect/docker-compose.yml down
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
```

**Qué hace:** Ejecuta `start-services.sh` que:
1. Espera a que la red tenga IP asignada (hasta 120 segundos)
2. Detecta la IP automáticamente
3. Aplica reglas QoS (iptables DSCP EF)
4. Configura redirección 443 → 3000
5. Levanta el contenedor Docker

**Características:**
- `Type=oneshot` + `RemainAfterExit=yes`: ejecuta el script y termina, pero systemd considera el servicio activo mientras el contenedor Docker siga corriendo.
- `After=`: garantiza que Docker, Avahi y la red estén listos antes de arrancar.
- `TimeoutStartSec=120`: da margen para que la red se levante (DHCP lento, etc.)

### 2. `wmm-network-watch.service`

**Ubicación:** `/etc/systemd/system/wmm-network-watch.service`

```ini
[Unit]
Description=WMM Audio Server - Network IP Watchdog
After=wmm-audio.service
Requires=wmm-audio.service

[Service]
Type=simple
WorkingDirectory=/home/gidat/wmm_proyect
ExecStart=/bin/bash /home/gidat/wmm_proyect/network-watch.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Qué hace:** Ejecuta `network-watch.sh`, un loop infinito que monitorea la IP de red cada 10 segundos. Si detecta un cambio de IP (por ejemplo, al conectar el servidor a otra red), reconstruye la imagen Docker para que mediasoup actualice los candidatos ICE.

**Características:**
- `Type=simple`: el script queda corriendo en segundo plano permanentemente.
- `Restart=always`: si el script falla, systemd lo reinicia automáticamente.
- `Requires=wmm-audio.service`: solo arranca después de que el servicio principal esté activo.

## Instalación de los Servicios

```bash
# Copiar archivos .service
sudo cp ~/wmm_proyect/wmm-audio.service /etc/systemd/system/
sudo cp ~/wmm_proyect/wmm-network-watch.service /etc/systemd/system/

# Recargar systemd
sudo systemctl daemon-reload

# Habilitar (arranque automático al encender)
sudo systemctl enable wmm-audio.service
sudo systemctl enable wmm-network-watch.service

# Iniciar ahora
sudo systemctl start wmm-audio.service
sudo systemctl start wmm-network-watch.service
```

## Gestión de los Servicios

```bash
# Ver estado
sudo systemctl status wmm-audio.service
sudo systemctl status wmm-network-watch.service

# Ver logs en tiempo real
sudo journalctl -u wmm-audio.service -f
sudo journalctl -u wmm-network-watch.service -f

# Detener
sudo systemctl stop wmm-audio.service
sudo systemctl stop wmm-network-watch.service

# Recargar después de editar un .service
sudo systemctl daemon-reload
```

## Secuencia de Arranque

```
Servidor se enciende
        ↓
systemd arranca (PID 1)
        ↓
    ┌───────────────────────────────────┐
    │  docker.service     (Docker daemon)│
    │  avahi-daemon.service (mDNS)       │
    │  network-online.target (red lista) │
    └───────────────────────────────────┘
        ↓ (todos listos)
    wmm-audio.service
    → Espera IP real
    → Aplica reglas QoS (iptables)
    → Levanta contenedor Docker
        ↓
    wmm-network-watch.service
    → Monitorea cambios de IP
    → Si cambia → re-crea el contenedor
        ↓
    ✅ https://auditorio.local/ disponible
```
