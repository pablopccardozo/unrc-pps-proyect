## systemd

**systemd** es el **sistema de inicio** de Ubuntu Server. Es el primer proceso que arranca cuando la NUC se enciende (PID 1) y es el responsable de levantar todos los demás servicios del sistema en el orden correcto: red, Docker, bases de datos, y cualquier servicio personalizado.

Los archivos `.service` son la forma de decirle a systemd **qué programas ejecutar, cuándo, en qué orden y qué hacer si fallan**. Es por eso que se debieron crear 2 archivos de este tipo para que cada vez que la NUC se apague o reinicie, no se necesite de alguien que se conecte por SSH y ejecutar manualmente los comandos para levantar el servidor. De esta manera, se cumple con los requerimientos de un sistema plug-and-play.

Con los archivos `.service` logramos que la NUC sea completamente autónoma: **se enciende, espera la red, y levanta todo automaticamente**.

### Los dos servicios creados

##### 1. `wmm-audio-server.service`

**Ubicación:** `/etc/systemd/system/wmm-audio-server.service`

```ini
[Unit]
Description=WMM Audio Server
After=network-online.target docker.service avahi-daemon.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
# Esperar explícitamente a que eno1 o wlo2 tengan IP antes de arrancar
ExecStartPre=/bin/bash -c 'until ip -4 addr show eno1 2>/dev/null | grep -q inet || ip -4 addr show wlo2 2>/dev/null | gre>
ExecStart=/home/gidat/wmm-audio-server/start-services.sh
ExecStop=/usr/bin/docker compose -f /home/gidat/wmm-audio-server/docker-compose.yml down
User=root
WorkingDirectory=/home/gidat/wmm-audio-server

[Install]
WantedBy=multi-user.target

```

La sección `[Unit]` define el nombre del servicio y su **posición en la cadena de arranque**. Las directivas clave son:

- `After=` — le dice a systemd que este servicio debe arrancar **después** de que la red esté online (`network-online.target`), Docker esté corriendo (`docker.service`) y Avahi esté listo (`avahi-daemon.service`). Sin esto, el contenedor intentaría arrancar antes de tener red y fallaría.
- `Wants=` — declara una dependencia débil con `network-online.target`: systemd intentará levantarlo, pero si no puede, igual continúa. Combinado con `After=` garantiza el orden sin hacer el arranque frágil.

La sección `[Service]` define **cómo se ejecuta** el servicio:

- `Type=oneshot` — indica que el servicio ejecuta un script y termina (no es un proceso que queda corriendo permanentemente como un daemon). systemd lo considera activo mientras Docker tenga el contenedor levantado.
- `RemainAfterExit=yes` — le dice a systemd que considere el servicio como **activo** incluso después de que el script `start-wmm.sh` termina. Sin esto, systemd pensaría que el servicio cayó cuando en realidad el contenedor Docker sigue corriendo normalmente.
- `ExecStartPre=` — comando que se ejecuta **antes** del arranque principal. En este caso es un loop que espera hasta que la interfaz de red (`eno1` o `wlo2`) tenga una IP asignada. Esto resuelve el problema de que la NUC arranque antes de conectarse al WiFi: el servicio simplemente espera sin fallar.
- `ExecStart=` — el comando principal: ejecuta `start-wmm.sh` que aplica las reglas QoS y levanta el contenedor Docker.
- `ExecStop=` — lo que se ejecuta cuando se detiene el servicio con `systemctl stop wmm-audio`. Baja el contenedor Docker limpiamente.
- `User=root` — necesario porque tanto `iptables` (QoS) como Docker requieren permisos de administrador.


La sección `[Install]` define **en qué momento del boot** se activa el servicio. `multi-user.target` es el nivel de arranque normal de Ubuntu Server (red activa, sin interfaz gráfica), que es exactamente el contexto donde necesitamos que corra WMM Audio Relay.

---

##### 2. `wmm-network-watch.service`

**Ubicación:** `/etc/systemd/system/wmm-network-watch.service`

```ini
[Unit]
Description=Reinicia el Servidor de Audio cuando cambia la IP
After=network-online.target

[Service]
Type=simple
ExecStart=/home/gidat/wmm-audio-server/network-watch.sh
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
```

Este servicio resuelve un problema diferente: **qué pasa cuando la NUC ya está corriendo y cambia de red** (por ejemplo, se desconecta de un router y se conecta a otro en un auditorio diferente).

Las diferencias respecto al primero:

- `Type=simple` — a diferencia de `oneshot`, este servicio es un proceso que **queda corriendo permanentemente** en segundo plano. El script `network-watch.sh` es un loop infinito que monitorea la IP cada 10 segundos.
- `Restart=always` — si el script falla o se cierra por cualquier motivo, systemd lo **reinicia automáticamente**. Esto lo hace resiliente ante errores inesperados.
- `RestartSec=5` — espera 5 segundos antes de reintentar, para no entrar en un loop de reinicios instantáneos si hay un error persistente.

Lo que hace `network-watch.sh` internamente es comparar la IP actual con la IP anterior cada 10 segundos. Cuando detecta un cambio, ejecuta `docker compose restart` para que el contenedor se reinicie y `server-config.js` detecte la nueva IP correctamente.

---
### Recargar, activar e iniciar servicios una vez creados

```bash
# Recargar
sudo systemctl daemon-reload
# Activar
sudo systemctl enable wmm-audio-server.service
sudo systemctl enable wmm-network-watch.service
# Iniciar
sudo systemctl start wmm-audio-server.service
sudo systemctl start wmm-network-watch.service
```

---
#### Comandos para gestionar estos servicios

```bash
# Activar para que arranquen solos al encender la NUC
sudo systemctl enable wmm-audio-server.service
sudo systemctl enable wmm-network-watch.service

# Iniciar manualmente (sin reiniciar la NUC)
sudo systemctl start wmm-audio-server.service
sudo systemctl start wmm-network-watch.service

# Ver estado y últimos logs
sudo systemctl status wmm-audio-server.service
sudo systemctl status wmm-network-watch.service

# Ver logs completos en tiempo real
sudo journalctl -u wmm-audio-server.service -f
sudo journalctl -u wmm-network-watch.service -f

# Detener
sudo systemctl stop wmm-audio-server.service

# Recargar después de editar un .service
sudo systemctl daemon-reload
```

---

#### Resultado final en el arranque de la NUC

```
NUC se enciende
        ↓
systemd arranca (PID 1)
        ↓
    ┌───────────────────────────────────┐
    │  docker.service     (Docker)      │  ← prerrequisitos
    │  avahi-daemon.service (mDNS)      │
    │  network-online.target (red)      │
    └───────────────────────────────────┘
        ↓ (todos listos)
    wmm-audio.service
    → Espera IP real en eno1 o wlo2
    → Aplica reglas QoS (iptables)
    → Levanta contenedor Docker
        ↓
    wmm-network-watch.service
    → Queda monitoreando cambios de IP
    → Si cambia → reinicia el contenedor
        ↓
✅ https://auditorio.local:3000/ disponible
```