# Arquitectura del Sistema — WMM Audio Server

## Visión General

El sistema implementa una arquitectura **cliente-servidor con SFU (Selective Forwarding Unit)** para distribución de audio en tiempo real sobre redes WiFi.

```
┌──────────────────────────────────────────────────────────────────┐
│                     WMM Audio Server                              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                    index.js                              │     │
│  │          (Bootstrap: HTTPS + Socket.IO)                  │     │
│  ├───────────────────────┬─────────────────────────────────┤     │
│  │    API REST           │    Socket Controller             │     │
│  │  - POST /login        │  - ~20 eventos Socket.IO        │     │
│  │  - GET /api/health    │  - Registro, señalización,      │     │
│  │  - GET /api/stats     │    notificaciones               │     │
│  ├───────────────────────┴─────────────────────────────────┤     │
│  │                    Servicios Core                        │     │
│  │                                                          │     │
│  │  ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐  │     │
│  │  │ MediasoupService │ │ RoomService  │ │ LatencySvc   │  │     │
│  │  │ - Worker Mgr    │ │ - Speakers   │ │ - Reportes   │  │     │
│  │  │ - Router        │ │ - Listeners  │ │ - Alertas    │  │     │
│  │  │ - Transports    │ │ - GhostConn  │ │ - Historial  │  │     │
│  │  │ - Producers     │ │              │ │              │  │     │
│  │  │ - Consumers     │ │              │ │              │  │     │
│  │  └─────────────────┘ └──────────────┘ └──────────────┘  │     │
│  ├─────────────────────────────────────────────────────────┤     │
│  │  AuthService  │  Config  │  Logger                       │     │
│  └─────────────────────────────────────────────────────────┘     │
│                          │                                        │
│                    ┌─────┴──────┐                                 │
│                    │  iptables  │  ← DSCP EF (46)                │
│                    │  QoS/WMM   │                                 │
│                    └─────┬──────┘                                 │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                 Ethernet  │  (cable al AP)
                           │
                    ┌──────┴──────┐
                    │  AP WiFi    │  ← WMM/EDCA convierte DSCP EF
                    │ 2.4/5 GHz   │     en prioridad AC_VO
                    └──────┬──────┘
                           │
               ┌───────────┼───────────┐
               │           │           │
         ┌─────┴───┐ ┌────┴────┐ ┌────┴────┐
         │ Orador  │ │ Oyente  │ │ Monitor │
         │ Send    │ │ Recv    │ │ Solo    │
         │ WebRTC  │ │ WebRTC  │ │ Socket  │
         └─────────┘ └─────────┘ └─────────┘
```

## Canales de Comunicación

| Canal | Protocolo | Puerto | Función |
|-------|-----------|--------|---------|
| Señalización | Socket.IO (WebSocket over HTTPS) | 3000 TCP | Registro, negociación WebRTC, notificaciones |
| Medios | RTP/UDP (mediasoup) | 2000–2050 UDP | Audio Opus, flujo principal |
| Control | RTCP (mismo puerto que RTP) | 2000–2050 UDP | Estadísticas, feedback de congestión |
| API REST | HTTPS | 3000 TCP | Login, healthcheck, stats |

## Componentes del Servidor

### MediasoupService
- Gestiona el ciclo de vida de Worker (proceso C++), Router, WebRtcTransport, Producer y Consumer.
- El Worker se auto-reinicia si falla (evento `died`).
- Los transports se almacenan en Maps indexados por `socketId`.
- `maxIncomingBitrate`: 80 kbps (safety net para audio Opus).
- Preferencia UDP habilitada, RTCP mux activado.

### RoomService
- Mantiene estado de la sala: oradores (nombre, productor activo, pausa) y oyentes.
- Relación orador → oyentes para notificaciones individuales.
- Detección de conexiones fantasma: si un orador se reconecta, elimina el socket anterior.

### LatencyService
- Recibe reportes cada 2 segundos desde los oyentes.
- Almacena historial (últimos 20 reportes), calcula promedios.
- Emite alertas al monitor cuando se superan umbrales (warning: 150 ms, critical: 250 ms).

### SocketController
- Procesa ~20 eventos Socket.IO.
- Orquesta la interacción entre servicios: registro → MediasoupService para transports → RoomService para estado → broadcast de cambios.

## Cliente Web

- HTML5 + CSS3 + JavaScript vanilla (sin frameworks).
- 5 páginas: index, login, transmisión (speaker), oyente, monitor.
- APIs del navegador: getUserMedia, Web Audio API (mezcla multi-stream), WebRTC Stats, Screen Wake Lock.
- Service Worker para funcionalidad PWA (instalable en el dispositivo).
