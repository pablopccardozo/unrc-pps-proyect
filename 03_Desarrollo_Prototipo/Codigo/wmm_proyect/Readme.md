# WMM Audio Server — Documentación Técnica

> **Proyecto de Práctica Profesional**  
> Autor: Pablo Cardozo  
> Versión: 2.0.0

---

## Índice

1. [Descripción General](#1-descripción-general)
2. [Objetivo del Proyecto](#2-objetivo-del-proyecto)
3. [Tecnologías Utilizadas](#3-tecnologías-utilizadas)
4. [Arquitectura de Archivos](#4-arquitectura-de-archivos)
5. [Arquitectura del Software](#5-arquitectura-del-software)
6. [Roles y Flujo de Usuario](#6-roles-y-flujo-de-usuario)
7. [Protocolo de Comunicación (Eventos Socket.IO)](#7-protocolo-de-comunicación-eventos-socketio)
8. [Configuración y Variables de Entorno](#8-configuración-y-variables-de-entorno)
9. [Calidad de Servicio (QoS / WMM)](#9-calidad-de-servicio-qos--wmm)
10. [Despliegue con Docker](#10-despliegue-con-docker)
11. [Despliegue en Producción (Ubuntu Server - Plug & Play)](#11-despliegue-en-producción-ubuntu-server---plug--play)
12. [Ejecución en Desarrollo](#12-ejecución-en-desarrollo)
13. [Consideraciones de Seguridad](#13-consideraciones-de-seguridad)

---

## 1. Descripción General

**WMM Audio Server** es una plataforma de **audioconferencia en tiempo real** orientada a entornos LAN/WiFi, desarrollada como prototipo para una Práctica Profesional universitaria. Permite que uno o varios oradores transmitan audio en vivo a múltiples oyentes con **latencia ultra baja**, haciendo uso de WebRTC (a través de mediasoup como SFU) y priorizando el tráfico de voz mediante **Wi-Fi Multimedia (WMM / IEEE 802.11e)** y marcado DSCP.

El sistema está diseñado para escenarios como auditorios, conferencias o cualquier situación donde se requiera distribución de audio en tiempo real sobre una red inalámbrica local.

---

## 2. Objetivo del Proyecto

- Implementar un servidor SFU (Selective Forwarding Unit) basado en **mediasoup** para enrutamiento eficiente de audio WebRTC.
- Soportar **múltiples oradores simultáneos**, cada uno con su propio productor de audio independiente.
- Permitir a los oyentes consumir el audio de **todos los oradores activos** en paralelo.
- Medir y reportar **latencia en tiempo real** (jitter buffer delay, pérdida de paquetes, jitter).
- Aplicar **QoS con marcado DSCP EF (46)** sobre el tráfico RTP/UDP para priorización a nivel de red.
- Proveer un **panel de monitoreo** en tiempo real del estado de la sesión.

---

## 3. Tecnologías Utilizadas

### Backend (Servidor)

| Tecnología | Versión | Rol |
|---|---|---|
| **Node.js** | ≥ 18.0.0 | Runtime del servidor |
| **Express** | ^4.18.2 | Servidor HTTP / rutas API REST |
| **mediasoup** | ^3.12.5 | SFU WebRTC (Worker, Router, Transport, Producer, Consumer) |
| **Socket.IO** | ^4.6.1 | Señalización en tiempo real (WebSocket) |
| **HTTPS / TLS** | nativo Node | Transporte seguro (requerido por WebRTC) |
| **Winston** | ^3.8.2 | Sistema de logging estructurado |
| **dotenv** | ^16.0.3 | Gestión de variables de entorno |
| **Helmet** | ^7.0.0 | Cabeceras HTTP de seguridad |
| **CORS** | ^2.8.5 | Control de origen cruzado |
| **compression** | ^1.7.4 | Compresión de respuestas HTTP |

### Frontend (Cliente)

| Tecnología | Rol |
|---|---|
| **HTML5 / CSS3 / JavaScript (Vanilla)** | Interfaz de usuario sin frameworks |
| **mediasoup-client** (bundleado) | API WebRTC del lado del cliente |
| **Socket.IO Client** | Señalización desde el navegador |
| **Web Audio API** | Reproducción de audio de múltiples fuentes |
| **Screen Wake Lock API** | Evita suspensión de pantalla durante transmisión |
| **WebRTC Stats API** | Obtención de métricas de red (jitter, packet loss, delay) |
| **Google Fonts (Inter)** | Tipografía |

### Codec de Audio

| Parámetro | Valor |
|---|---|
| Codec | **Opus** (`audio/opus`) |
| Clock Rate | 48000 Hz |
| Canales | 2 (Estéreo) |
| Bitrate | 24 kbps (por defecto), máx 32 kbps |
| Ptime | 20 ms por paquete |
| DTX (Discontinuous Transmission) | Activado |
| FEC (Forward Error Correction) | Activado |

### Infraestructura / DevOps

| Tecnología | Rol |
|---|---|
| **Docker** | Contenerización del servidor |
| **Docker Compose** | Orquestación del contenedor |
| **iptables / DSCP** | Marcado de tráfico para QoS |
| **OpenSSL** | Certificados SSL autofirmados |

---

## 4. Arquitectura de Archivos

```
wmm_proyect/
│
├── docker-compose.yml          # Orquestación del contenedor (network_mode: host)
├── .env                        # Variables de entorno (HOST auto-detectado, PORT, etc.)
├── .dockerignore
├── .gitignore
│
├── install-server.sh           # Script de instalación y configuración completa en Ubuntu Server
├── setup-mdns.sh               # Script de instalación y configuración de Avahi para auditorio.local
├── generate-ssl.sh             # Script para generar certificados SSL con SAN (auditorio.local + IP)
├── start-services.sh           # Arranque robusto: espera red LAN, detecta IP y levanta Docker/QoS
├── network-watch.sh            # Watchdog de red: detecta cambios de IP y recrea el contenedor
├── wmm-qos-setup.sh            # Configuración QoS (marcado DSCP EF en puertos RTP usando cadena custom)
├── https-port-setup.sh         # Redirección de puerto TCP 443 -> 3000 (iptables de forma idempotente)
├── wmm-audio.service           # Servicio systemd para el servidor WMM
├── wmm-network-watch.service   # Servicio systemd para el watchdog de IP
│
└── server/
    ├── Dockerfile              # Build multi-stage (builder + producción, user no-root)
    ├── entrypoint.sh           # Script de entrada del contenedor
    ├── package.json            # Dependencias y scripts npm
    │
    ├── ssl/                    # Certificados TLS (key.pem + cert.pem)
    ├── logs/                   # Logs de la aplicación (montado como volumen)
    │
    ├── src/                    # Código fuente del servidor
    │   ├── index.js            # Punto de entrada: configura HTTPS, Socket.IO e inicializa servicios
    │   │
    │   ├── config/
    │   │   ├── constants.js        # Constantes globales (LATENCY, AUDIO, ROLES, ROOMS, NETWORK)
    │   │   ├── mediasoup-config.js # Configuración de Worker, Router, Transport y Codecs
    │   │   └── server-config.js    # Puerto y host del servidor
    │   │
    │   ├── services/
    │   │   ├── mediasoup-service.js  # Gestión de Worker, Router, Transports, Producers, Consumers
    │   │   ├── room-service.js       # Estado de la sala: oradores, oyentes y sus relaciones
    │   │   ├── latency-service.js    # Recepción, almacenamiento y alertas de reportes de latencia
    │   │   └── auth-service.js       # Validación de clave secreta de acceso
    │   │
    │   ├── controllers/
    │   │   ├── socket-controller.js  # Manejo de todos los eventos Socket.IO (registro, mediasoup, desconexión)
    │   │   └── api-controller.js     # Rutas REST (/login, /api/health, /api/stats)
    │   │
    │   └── utils/
    │       └── logger.js             # Logger con Winston (consola + archivo)
    │
    └── public/                 # Archivos estáticos servidos por Express
        ├── index.html          # Página de inicio / selección de rol
        ├── login.html          # Autenticación del orador (nombre + clave secreta)
        ├── transmision.html    # Interfaz del orador (transmitir audio)
        ├── oyente.html         # Interfaz del oyente (escuchar audio)
        ├── monitor.html        # Panel de monitoreo en tiempo real
        │
        ├── css/
        │   └── main.css        # Estilos globales (variables CSS, componentes)
        │
        ├── assets/             # Imágenes y recursos estáticos
        │
        └── js/
            ├── libs/
            │   └── mediasoup-client.min.js   # Librería mediasoup-client (bundleada)
            │
            ├── common/
            │   ├── socket-client.js          # Wrapper del cliente Socket.IO (singleton)
            │   └── ui-helpers.js             # Utilidades de UI compartidas (status, alertas, paneles)
            │
            ├── speaker/
            │   ├── speaker-app.js            # Controlador principal del orador
            │   ├── audio-service.js          # Acceso al micrófono (getUserMedia)
            │   ├── transport-service.js      # Creación de SendTransport y Producer mediasoup
            │   └── latency-monitor.js        # Monitor de latencia del lado del orador
            │
            └── listener/
                ├── listener-app.js           # Controlador principal del oyente
                ├── consumer-service.js       # Creación de RecvTransport y Consumers mediasoup
                ├── audio-player.js           # Reproducción de múltiples streams de audio (Web Audio API)
                └── latency-measurer.js       # Medición de latencia vía WebRTC Stats y reporte al servidor
```

---

## 5. Arquitectura del Software

### 5.1 Visión General

El sistema sigue una arquitectura **cliente-servidor con SFU (Selective Forwarding Unit)**:

```
[Orador 1] ──WebRTC Send──┐
[Orador 2] ──WebRTC Send──┤
                           ├──► [Servidor Node.js + mediasoup SFU]
[Oyente 1] ──WebRTC Recv──┤         │
[Oyente 2] ──WebRTC Recv──┘         └─► Socket.IO (señalización)
[Monitor]  ──Socket.IO────────────────►
```

La señalización WebRTC (intercambio de capacidades RTP, parámetros DTLS, candidatos ICE) se realiza sobre **Socket.IO**. El tráfico de medios (audio RTP/UDP) fluye directamente a través de mediasoup.

### 5.2 Capas del Servidor

```
┌─────────────────────────────────────────────────┐
│                   index.js                      │
│         (Bootstrap, HTTPS, Socket.IO)           │
├────────────────┬────────────────────────────────┤
│  API REST      │     Socket Controller           │
│ (api-ctrl.js)  │   (socket-controller.js)        │
├────────────────┴────────────────────────────────┤
│   MediasoupService │ RoomService │ LatencyService│
│       auth-service                              │
├─────────────────────────────────────────────────┤
│          Config (constants, mediasoup-config)   │
│          Utils (logger)                         │
└─────────────────────────────────────────────────┘
```

### 5.3 Descripción de Servicios

#### `MediasoupService`
Gestiona el ciclo de vida de todos los objetos mediasoup:
- **Worker**: proceso nativo que maneja el tráfico RTP. Se auto-reinicia si muere.
- **Router**: define los codecs soportados y enruta medios entre transports.
- **WebRtcTransport**: creado por cada participante (orador o oyente). Soporta UDP y TCP.
- **Producer**: creado por cada orador cuando inicia su transmisión de micrófono.
- **Consumer**: creado por cada oyente por cada orador activo que desea escuchar.

Los datos se almacenan en `Map` indexados por `socketId`.

#### `RoomService`
Mantiene el estado lógico de la sala en memoria:
- `speakers`: Map de oradores con nombre, timestamp de ingreso, `hasProducer` e `isPaused`.
- `listeners`: Map de oyentes conectados.
- `speakerListeners`: Map que relaciona cada orador con el conjunto de oyentes que lo consumen.

Provee métodos como `getActiveSpeakers()`, `getAllSpeakersWithStatus()`, `hasActiveTransmission()`, `removeUser()`, etc.

#### `LatencyService`
Recibe reportes de latencia enviados periódicamente por los oyentes (cada 2 segundos). Almacena un historial de los últimos 20 reportes por oyente, calcula promedios y emite alertas cuando la latencia supera el umbral configurado (default: 250 ms). Envía los reportes a la sala de monitoreo y al orador correspondiente.

#### `SocketController`
Punto central de procesamiento de eventos Socket.IO. Maneja:
- Registro de oradores y oyentes (con detección y limpieza de conexiones fantasma)
- Toda la señalización mediasoup (capabilities, transport, produce, consume)
- Eventos de ciclo de vida de transmisión (pausa, reanudación, detención)
- Desconexiones con limpieza de recursos

### 5.4 Flujo de Señalización WebRTC (Orador)

```
Orador                          Servidor
  │── register-speaker ────────►│  RoomService.addSpeaker()
  │◄─ (socket.role = speaker) ──│
  │
  │── getRouterRtpCapabilities ►│  mediasoupService.getRouterRtpCapabilities()
  │◄─ rtpCapabilities ──────────│
  │  (Device.load())
  │
  │── createWebRtcTransport ───►│  mediasoupService.createWebRtcTransport()
  │◄─ {id, ice, dtls, ...} ─────│
  │  (SendTransport creado)
  │
  │── transport-connect ────────►│  transport.connect(dtlsParameters)
  │◄─ ack ──────────────────────│
  │
  │── transport-produce ────────►│  transport.produce(kind, rtpParameters)
  │◄─ {producer.id} ────────────│
  │                              │  RoomService.setSpeakerProducerActive(true)
  │                              │  broadcastSpeakersStatus() → listeners
  │                              │  broadcast "new-producer" → todos
```

### 5.5 Flujo de Señalización WebRTC (Oyente)

```
Oyente                          Servidor
  │── register-listener ────────►│  RoomService.addListener()
  │◄─ speakers-status-update ───│  Estado actual de todos los oradores
  │
  │── getRouterRtpCapabilities ►│
  │◄─ rtpCapabilities ──────────│
  │  (Device.load())
  │
  │── createWebRtcTransport ───►│  createWebRtcTransport() (RecvTransport)
  │◄─ {id, ice, dtls, ...} ─────│
  │
  │── transport-connect ────────►│
  │◄─ ack ──────────────────────│
  │
  │  (por cada orador activo:)
  │── consume {rtpCapabilities, remoteProducerSocketId} ►│
  │◄─ {consumer.id, producerId, kind, rtpParameters} ──│
  │  (Consumer local creado, audio reproducido)
  │
  │── resume-consumer ──────────►│  consumer.resume()
  │
  │── listener-latency-report ──►│  LatencyService.handleLatencyReport()
  │   (cada 2 segundos)          │  → emite a orador y monitor
```

### 5.6 Gestión de Multi-Orador

El sistema soporta múltiples oradores simultáneos. Cada oyente crea **un Consumer independiente por cada orador activo**. El `AudioPlayer` del cliente mezcla los streams mediante la **Web Audio API**, creando nodos `MediaStreamSource` separados conectados al destino de audio del contexto.

Cuando un orador se desconecta, solo se remueve su Consumer/stream del oyente, sin afectar al resto de oradores activos.

### 5.7 Detección de Conexiones Fantasma

Al registrarse un orador, el servidor busca en `RoomService` si ya existe un orador con el mismo nombre asociado a un socket diferente. Si lo encuentra, desconecta el socket anterior (disparando `handleDisconnect` automáticamente) antes de registrar el nuevo. Esto previene entradas duplicadas en el panel de oyentes.

---

## 6. Roles y Flujo de Usuario

### 6.1 Roles

| Rol | Acceso | Descripción |
|---|---|---|
| **Orador** (`speaker`) | `/login.html` → `/transmision.html` | Requiere autenticación con clave secreta. Transmite audio del micrófono. Puede pausar/reanudar sin cerrar sesión. Ve sus oyentes y la latencia de cada uno. |
| **Oyente** (`listener`) | `/oyente.html` | Sin autenticación. Recibe y reproduce el audio de todos los oradores activos. Controla volumen global y por orador. |
| **Monitor** (`monitor`) | `/monitor.html` | Sin autenticación. Panel de solo lectura con métricas en tiempo real: oradores, oyentes, latencia promedio, bitrate y alertas. |

### 6.2 Páginas del Frontend

| Página | Descripción |
|---|---|
| `index.html` | Inicio / selector de rol |
| `login.html` | Autenticación del orador (nombre + `SECRET_KEY`) |
| `transmision.html` | Interfaz de transmisión con visualizador de forma de onda, contador de oyentes y estadísticas de latencia/bitrate |
| `oyente.html` | Interfaz de escucha con lista de oradores y controles de volumen |
| `monitor.html` | Dashboard en tiempo real con métricas y alertas de latencia |

---

## 7. Protocolo de Comunicación (Eventos Socket.IO)

### Eventos del Orador → Servidor

| Evento | Datos | Descripción |
|---|---|---|
| `register-speaker` | `name: string` | Registra el orador en la sala |
| `getRouterRtpCapabilities` | — | Solicita capacidades del router |
| `createWebRtcTransport` | — | Crea transporte de envío |
| `transport-connect` | `{ dtlsParameters }` | Conecta el transporte DTLS |
| `transport-produce` | `{ kind, rtpParameters }` | Crea el productor de audio |
| `speaker-started` | `{ status }` | Notifica inicio/reanudación de transmisión |
| `speaker-paused` | `{ status }` | Notifica pausa de transmisión |
| `speaker-stopped` | — | Notifica detención y cierra el productor |
| `transport-close-producer` | — | Cierra el productor (alternativa a speaker-stopped) |

### Eventos del Oyente → Servidor

| Evento | Datos | Descripción |
|---|---|---|
| `register-listener` | `name: string` | Registra el oyente |
| `getRouterRtpCapabilities` | — | Solicita capacidades del router |
| `createWebRtcTransport` | — | Crea transporte de recepción |
| `transport-connect` | `{ dtlsParameters }` | Conecta el transporte |
| `consume` | `{ rtpCapabilities, remoteProducerSocketId }` | Crea consumer para un orador |
| `resume-consumer` | `{ consumerId }` | Reanuda el consumer |
| `listener-latency-report` | `{ latency, jitter, packetsLost, ... }` | Reporte de métricas de red |

### Eventos Servidor → Clientes

| Evento | Destino | Descripción |
|---|---|---|
| `speakers-status-update` | `listener-room` | Estado completo de todos los oradores |
| `new-producer` | broadcast | Nuevo orador comenzó a transmitir |
| `producer-closed` | broadcast | Orador cerró su productor |
| `producer-paused` | broadcast | Orador pausó su transmisión |
| `producer-resumed` | broadcast | Orador reanudó su transmisión |
| `listeners-update` | orador específico | Lista actualizada de sus oyentes |
| `listener-latency-report` | orador específico | Reporte de latencia de un oyente |
| `latency-report` | `monitor-room` | Reporte de latencia para monitoreo |
| `high-latency-alert` | `monitor-room` | Alerta de latencia > umbral |
| `current-state` | monitor al conectar | Estado completo inicial |
| `user-connected` | `monitor-room` | Nuevo usuario conectado |
| `user-disconnected` | `monitor-room` | Usuario desconectado |

---

## 8. Configuración y Variables de Entorno

El archivo `.env` en la raíz del proyecto (y el `docker-compose.yml`) permiten configurar:

| Variable | Default | Descripción |
|---|---|---|
| `HOST` | *(Auto-detectado)* | IP de red local del servidor. Si está vacío en `.env`, el servidor Node.js la detecta dinámicamente al arrancar para evitar desajustes en los candidatos ICE de mediasoup. |
| `PORT` | `3000` | Puerto HTTPS del servidor |
| `RTC_MIN_PORT` | `2000` | Puerto UDP mínimo para RTP |
| `RTC_MAX_PORT` | `2050` | Puerto UDP máximo para RTP |
| `AUDIO_BITRATE` | `24000` | Bitrate de audio en bps |
| `AUDIO_PTIME` | `20` | Tamaño de paquete en ms |
| `SECRET_KEY` | `WMM_SECRET_2026` | Clave de acceso para oradores |
| `LATENCY_WARNING` | `150` | Umbral de latencia en alerta (ms) |
| `LATENCY_CRITICAL` | `250` | Umbral de latencia crítica (ms) |
| `NODE_ENV` | `production` | Entorno de Node |
| `DEBUG` | `mediasoup:*` | Activa logs detallados de mediasoup |

### Umbrales de Latencia Definidos

| Nivel | Valor |
|---|---|
| Excelente | < 100 ms |
| Bueno | < 150 ms |
| Aceptable | < 200 ms |
| Advertencia | < 250 ms |
| Crítico | ≥ 300 ms |

---

## 9. Calidad de Servicio (QoS / WMM)

El proyecto implementa priorización de tráfico de audio a nivel de red mediante:

- **Wi-Fi Multimedia (WMM / IEEE 802.11e)**: el Access Point prioriza paquetes con DSCP marcado como **EF (Expedited Forwarding, valor 46)**, que corresponde a la cola de mayor prioridad (`AC_VO` - Voice).

- **Script `wmm-qos-setup.sh`**: aplica reglas `iptables` en la tabla `mangle` para marcar automáticamente con DSCP EF todo el tráfico UDP saliente e ingresante en el rango de puertos RTP del servidor (2000–2050).

```bash
# Tráfico de audio saliente del servidor
iptables -t mangle -A OUTPUT -p udp --sport 2000:2050 -j DSCP --set-dscp 46

# Tráfico de audio en modo bridge/router
iptables -t mangle -A FORWARD -p udp --dport 2000:2050 -j DSCP --set-dscp 46
iptables -t mangle -A FORWARD -p udp --sport 2000:2050 -j DSCP --set-dscp 46
```

- **Configuración mediasoup**: el transporte WebRTC está configurado con:
  - `preferUdp: true` — UDP es el protocolo preferido (menor overhead que TCP)
  - `enableRtcpMux: true` — RTP y RTCP comparten el mismo puerto
  - `iceConsentTimeout: 5` — detecta rápidamente pérdidas de conectividad ICE
  - `transport-cc` feedback — control de congestión

---

## 10. Despliegue con Docker

El servidor se conteneriza con un **build multi-stage**:

1. **Stage `builder`** (`node:22-slim`): instala `build-essential`, `python3` y compila las dependencias nativas de mediasoup con `npm install`.
2. **Stage producción** (`node:22-slim`): copia solo `node_modules` compilados y el código fuente. Crea un usuario no-root `mediasoup` para ejecutar el proceso.

### Comandos

```bash
# Construir la imagen
npm run docker:build
# o
docker-compose build

# Iniciar en background
npm run docker:up
# o
docker-compose up -d

# Ver logs en tiempo real
npm run docker:logs
# o
docker-compose logs -f

# Detener
npm run docker:down
```

### Notas importantes del docker-compose

- `network_mode: "host"`: **requerido** para que mediasoup pueda gestionar correctamente los candidatos ICE y para que el Access Point vea la IP real del servidor (necesario para WMM/QoS).
- `cap_add: SYS_NICE`: permite priorización de procesos en tiempo real.
- **Volúmenes**: `ssl/` y `public/` se montan como solo lectura; `logs/` con escritura. El código fuente **no** se monta en producción.
- **Healthcheck**: verifica `GET /api/health` cada 30 segundos.
- **Límites de recursos**: 512 MB de memoria máxima, 256 MB reservado.
- `restart: unless-stopped`: reinicio automático ante fallos.

---

---

## 11. Despliegue en Producción (Ubuntu Server - Plug & Play)

El proyecto está diseñado para funcionar en un **servidor Ubuntu dedicado** de forma totalmente automática y autónoma (plug-and-play). Al conectar el cable de red o encender el servidor, los servicios se configuran, detectan la IP asignada por DHCP y levantan la aplicación en segundos.

### Prerrequisitos en el Servidor Ubuntu
* Ubuntu Server instalado (versión 20.04 LTS o superior recomendada).
* Acceso a internet únicamente para la ejecución inicial del script de instalación (para descargar Docker y dependencias).

### Proceso de Instalación

1. **Copiar los archivos del proyecto al servidor**:
   ```bash
   scp -r wmm_proyect/ usuario@<ip-del-servidor>:/home/usuario/
   ```

2. **Ejecutar el instalador automático**:
   ```bash
   cd /home/usuario/wmm_proyect
   sudo bash install-server.sh
   ```

Este script automatiza los siguientes procesos:
* Instala **Docker, Docker Compose, Avahi Daemon e iptables**.
* Agrega tu usuario al grupo `docker` (para controlarlo sin sudo en el futuro).
* Configura mDNS para que los clientes puedan acceder mediante `https://auditorio.local/` (Avahi).
* Genera certificados SSL válidos con el Subject Alternative Name (SAN) configurado para `auditorio.local` y la IP LAN actual del servidor.
* Genera redirecciones de puerto TCP 443 → 3000 de forma persistente.
* Copia y habilita los servicios de systemd (`wmm-audio.service` y `wmm-network-watch.service`).
* Construye localmente la imagen del servidor Node.js y levanta la aplicación en producción.

### Gestión de Servicios (Systemd)

La aplicación corre en segundo plano como servicios del sistema. Podés controlarlos con:

```bash
# Iniciar los servicios manualmente
sudo systemctl start wmm-audio

# Detener los servicios
sudo systemctl stop wmm-audio

# Ver estado de los servicios
sudo systemctl status wmm-audio
sudo systemctl status wmm-network-watch

# Ver logs en tiempo real
sudo journalctl -u wmm-audio -f
sudo journalctl -u wmm-network-watch -f
```

### Acceso y Soporte para Dispositivos Antiguos
* **Dispositivos Modernos (mDNS habilitado):** Los clientes (iOS, Android 12+, Windows 10+ y Linux) pueden acceder directamente ingresando a **`https://auditorio.local/`**.
* **Dispositivos Legacy (sin mDNS):** En la esquina superior izquierda del panel de monitoreo (`https://auditorio.local/monitor.html`), hay un **bloque de información del servidor** visible para el administrador que muestra la **IP real del servidor** (ej. `192.168.1.150`). En caso de que un dispositivo antiguo no pueda resolver mDNS, el administrador puede proveer esa IP para ingresar directamente vía `https://<IP-DEL-SERVIDOR>/`.

---

## 12. Ejecución en Desarrollo

### Prerrequisitos

- Node.js ≥ 18.0.0
- Python 3 y build-essential (para compilar mediasoup)
- Certificados SSL en `server/ssl/key.pem` y `server/ssl/cert.pem`

### Pasos

```bash
# Instalar dependencias
cd server
npm install

# Ejecutar en modo desarrollo (con nodemon)
npm run dev

# Ejecutar con logs detallados de mediasoup
npm run debug
```

### URLs disponibles

| Ruta | Descripción |
|---|---|
| `https://localhost:3000/` | Página de inicio |
| `https://localhost:3000/login.html` | Acceso del orador |
| `https://localhost:3000/transmision.html` | Interfaz de transmisión |
| `https://localhost:3000/oyente.html` | Interfaz del oyente |
| `https://localhost:3000/monitor.html` | Panel de monitoreo |
| `https://localhost:3000/api/health` | Health check |
| `https://localhost:3000/api/stats` | Estadísticas de la sesión (JSON) |

> ⚠️ **HTTPS es obligatorio**: los navegadores solo permiten acceso al micrófono (`getUserMedia`) y a la API WebRTC en contextos seguros (HTTPS o `localhost`).

---

## 13. Consideraciones de Seguridad

- **Autenticación por clave compartida**: los oradores deben conocer la `SECRET_KEY` para acceder. La validación se realiza en el servidor vía `POST /login`.
- **Sesión en `sessionStorage`**: el nombre del orador se almacena en `sessionStorage` del navegador. Al cerrar la pestaña, la sesión se invalida automáticamente.
- **Usuario no-root en Docker**: el contenedor ejecuta con el usuario `mediasoup` sin privilegios de root.
- **Certificados TLS**: toda la comunicación HTTP y WebSocket está cifrada con TLS (certificados en `server/ssl/`). En producción se deben usar certificados de una CA reconocida o usar los autofirmados con SAN generados por el instalador para evitar advertencias en LAN.
- **Helmet**: cabeceras HTTP de seguridad aplicadas a todas las respuestas Express.
- **Detección de sesiones fantasma**: al reconectar, el servidor identifica y elimina sockets anteriores del mismo orador para evitar duplicados.
- **Limpieza de recursos**: al desconectarse un cliente, se cierran el Producer/Consumer mediasoup y el Transport asociado, liberando memoria y puertos UDP.
