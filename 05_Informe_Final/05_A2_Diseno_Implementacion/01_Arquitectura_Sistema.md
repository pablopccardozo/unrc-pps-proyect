# 5. Diseño e Implementación del Sistema

> *Corresponde a la Etapa A2 del plan de trabajo.*

## 5.1. Arquitectura del Sistema

### 5.1.1. Visión General

El sistema sigue una arquitectura **cliente-servidor con SFU (Selective Forwarding Unit)**, donde el servidor actúa como punto central de enrutamiento de flujos de audio WebRTC. A diferencia de una arquitectura mesh (donde cada cliente envía su audio a todos los demás) o MCU (donde el servidor mezcla y transcodifica), el SFU simplemente reenvía los paquetes RTP sin modificarlos, minimizando la latencia y el consumo de CPU.

```
[Orador 1] ──WebRTC Send──┐
[Orador 2] ──WebRTC Send──┤
                           ├──► [Servidor Node.js + mediasoup SFU]
[Oyente 1] ──WebRTC Recv──┤         │
[Oyente 2] ──WebRTC Recv──┘         └─► Socket.IO (señalización)
[Monitor]  ──Socket.IO────────────────►
```

El servidor expone dos canales de comunicación diferenciados:

- **Señalización** (Socket.IO sobre WebSocket/TCP): maneja el registro de usuarios, intercambio de capacidades WebRTC, creación de transports, y notificaciones de estado. Este canal no tiene requisitos estrictos de latencia.
- **Tráfico de medios** (RTP/UDP directo entre cliente y servidor): transporta los flujos de audio codificados en Opus. Este canal es sensible a la latencia y al jitter, y es sobre el que se aplican las políticas de QoS.

### 5.1.2. Capas del Servidor

El servidor está organizado en capas con responsabilidades bien definidas:

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

**Capa de entrada (index.js)**: punto de arranque del servidor. Configura el servidor HTTPS con los certificados SSL, inicializa Socket.IO sobre el mismo puerto, e instancia los servicios. Soporta detección automática de la IP de red local si no se provee explícitamente.

**Capa de API REST (api-controller.js)**: rutas livianas para funcionalidades que no requieren tiempo real:
- `POST /login`: validación de la clave secreta para oradores
- `GET /api/health`: healthcheck para Docker
- `GET /api/stats`: estadísticas de la sesión en formato JSON

**Capa de señalización (socket-controller.js)**: el componente más complejo del servidor. Maneja ~20 eventos Socket.IO que cubren todo el ciclo de vida de una sesión: registro, creación de transports, producción y consumo de audio, pausa/reanudación, reporte de latencia y desconexión.

**Capa de servicios**: contiene la lógica de negocio del sistema.

### 5.1.3. Servicios del Servidor

#### MediasoupService

Gestiona el ciclo de vida de todos los objetos de mediasoup. Su método `initialize()` crea un Worker (proceso nativo en C++ que maneja el tráfico RTP) y un Router (define los codecs y enruta los flujos). El Worker incluye auto-reinicio en caso de falla mediante el evento `died`.

Las estructuras de datos principales son `Map` indexados por `socketId`:
- `transports`: almacena los WebRtcTransport de cada participante
- `producers`: productores de audio de los oradores
- `consumers`: consumidores creados para cada oyente por cada orador

Los métodos clave son:
- `createWebRtcTransport(socketId)`: crea un transporte con los parámetros definidos en `mediasoup-config.js`, incluyendo el rango de puertos UDP (2000–2050), preferencia por UDP, y límite de bitrate entrante (80 kbps).
- `connectTransport()`: establece la sesión DTLS entre el cliente y mediasoup.
- `createProducer()` / `createConsumer()`: crean los flujos de producción y consumo de audio.

#### RoomService

Mantiene el estado lógico de la sala en memoria:
- `speakers`: `Map` con nombre, timestamp, estado del productor y pausa.
- `listeners`: `Map` de oyentes conectados.
- `speakerListeners`: `Map` que relaciona cada orador con sus oyentes.

Provee métodos para obtener oradores activos, verificar si hay transmisión en curso, y limpiar recursos al desconectarse un usuario. Incluye detección de conexiones fantasma (ghost connections): si un orador se reconecta con el mismo nombre desde otro dispositivo, el servidor desconecta el socket anterior antes de registrar el nuevo, previniendo entradas duplicadas.

#### LatencyService

Recibe reportes periódicos de latencia enviados por los oyentes cada 2 segundos. Mantiene un historial de los últimos 20 reportes por oyente, calcula promedios y emite alertas cuando se superan los umbrales configurados (warning: 150 ms, critical: 250 ms). Los reportes se reenvían al orador correspondiente y al panel de monitoreo.

#### AuthService

Validación de la clave secreta compartida (`SECRET_KEY`). Los oradores deben autenticarse mediante `POST /login` antes de acceder a la sala de transmisión. La clave se compara por hash seguro.

### 5.1.4. Frontend Web

El cliente es una aplicación web de página única (SPA) liviana sin frameworks, compuesta por cinco páginas HTML:

| Página | Rol | Autenticación |
|--------|-----|---------------|
| `index.html` | Selector de rol (orador/oyente/monitor) | No |
| `login.html` | Ingreso de nombre y clave para oradores | Clave compartida |
| `transmision.html` | Interfaz del orador con micrófono | Sí (requiere login) |
| `oyente.html` | Interfaz del oyente con lista de oradores | No |
| `monitor.html` | Dashboard de monitoreo en tiempo real | No |

El frontend utiliza JavaScript vanilla con las siguientes APIs del navegador:
- **mediasoup-client**: biblioteca bundleada que implementa el cliente WebRTC
- **Socket.IO Client**: señalización en tiempo real
- **Web Audio API**: mezcla de múltiples streams de audio (un nodo `MediaStreamSource` por orador)
- **Screen Wake Lock API**: evita que la pantalla se apague durante la transmisión
- **WebRTC Stats API**: obtención de métricas de red (jitter, packet loss, RTT)

No se utiliza ningún framework frontend (React, Vue, etc.) para mantener la aplicación liviana y facilitar su carga en dispositivos con recursos limitados.
