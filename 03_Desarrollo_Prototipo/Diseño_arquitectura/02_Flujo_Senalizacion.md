# Flujo de Señalización WebRTC

## Registro del Orador

```
Orador (Browser)                   Servidor WMM Audio
       │                                  │
       │── register-speaker {name} ──────►│  RoomService.addSpeaker()
       │◄─ "socket.role = speaker" ───────│
       │                                  │  ¿Existe otro socket con mismo nombre?
       │                                  │  └─ Sí → handleDisconnect() del anterior
       │                                  │
       │── getRouterRtpCapabilities ──────►│
       │◄─ rtpCapabilities ───────────────│
       │  Device.load(rtpCapabilities)    │
       │                                  │
       │── createWebRtcTransport ────────►│  MediasoupService.createWebRtcTransport()
       │◄─ {id, iceParams, iceCandidates, │  (SendTransport)
       │     dtlsParameters} ─────────────│
       │                                  │
       │── transport-connect ────────────►│  transport.connect(dtlsParams)
       │  {dtlsParameters}               │
       │◄─ ack ──────────────────────────│
       │                                  │
       │── transport-produce ────────────►│  transport.produce(kind, rtpParams)
       │  {kind, rtpParameters}          │
       │◄─ {producer.id} ────────────────│
       │                                  │  RoomService.setSpeakerProducerActive(true)
       │                                  │  broadcast "speakers-status-update"
       │                                  │  broadcast "new-producer"
```

## Registro del Oyente

```
Oyente (Browser)                    Servidor WMM Audio
       │                                  │
       │── register-listener {name} ─────►│  RoomService.addListener()
       │◄─ speakers-status-update ────────│  Estado actual de todos los oradores
       │◄─ "socket.role = listener" ──────│
       │                                  │
       │── getRouterRtpCapabilities ──────►│
       │◄─ rtpCapabilities ───────────────│
       │                                  │
       │── createWebRtcTransport ────────►│  (RecvTransport)
       │◄─ {id, iceParams, ...} ─────────│
       │                                  │
       │── transport-connect ────────────►│
       │◄─ ack ──────────────────────────│
       │                                  │
       │  (por cada orador activo:)       │
       │── consume {rtpCapabilities,     ►│  transport.consume()
       │     remoteProducerSocketId}      │
       │◄─ consumer.id, producerId,       │
       │     kind, rtpParameters ─────────│
       │                                  │
       │── resume-consumer {consumerId}  ►│  consumer.resume()
       │◄─ ack ──────────────────────────│
       │                                  │
       │  (cada 2 segundos)               │
       │── listener-latency-report ──────►│  LatencyService.handleLatencyReport()
       │  {latency, jitter, packetsLost,  │  → reenvía a orador y monitor
       │   rtt}                           │
```

## Eventos del Servidor → Clientes

| Evento | Destino | Disparador |
|--------|---------|------------|
| `speakers-status-update` | Sala oyentes | Cambio en lista de oradores |
| `new-producer` | Broadcast | Nuevo orador comenzó a transmitir |
| `producer-closed` | Broadcast | Orador cerró su productor |
| `producer-paused` | Broadcast | Orador pausó transmisión |
| `producer-resumed` | Broadcast | Orador reanudó transmisión |
| `listeners-update` | Orador específico | Cambio en sus oyentes |
| `listener-latency-report` | Orador específico | Reporte de latencia de un oyente |
| `latency-report` | Sala monitor | Reporte agregado de latencia |
| `high-latency-alert` | Sala monitor | Latencia > umbral configurado |
| `user-connected` | Sala monitor | Nuevo usuario (cualquier rol) |
| `user-disconnected` | Sala monitor | Usuario desconectado |
| `current-state` | Monitor | Estado completo al conectar |
