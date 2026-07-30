# Topología de Red

## Diagrama de Red

```
    ┌─────────────────────────────────────────────────────────────┐
    │                      Servidor Ubuntu                         │
    │  ┌──────────────────────────────────────────────────────┐   │
    │  │           WMM Audio Server (Docker)                   │   │
    │  │  ┌────────────┐  ┌──────────┐  ┌────────────────┐   │   │
    │  │  │ mediasoup   │  │ Socket.IO│  │  API REST      │   │   │
    │  │  │ SFU Worker  │  │ Señaliz. │  │ /api/health    │   │   │
    │  │  │ RTP/UDP    │  │ WS/TCP   │  │ /api/stats     │   │   │
    │  │  │ :2000-2050 │  │ :3000    │  │ POST /login    │   │   │
    │  │  └────────────┘  └──────────┘  └────────────────┘   │   │
    │  │                    iptables DSCP EF                  │   │
    │  │           OUTPUT  →  marca paquetes RTP/UDP          │   │
    │  └──────────────────────────────────────────────────────┘   │
    │                     │  Ethernet (cable)                      │
    └─────────────────────┼───────────────────────────────────────┘
                          │
                    ┌─────┴──────┐
                    │  Switch     │
                    └─────┬──────┘
                          │
                    ┌─────┴──────┐
                    │ Access Point│  (WiFi 5 GHz, WMM habilitado)
                    │   WiFi     │
                    └─────┬──────┘
                          │  ≪ onda radio ≫
                ┌─────────┼──────────┐
                │         │          │
         ┌──────┴──┐ ┌───┴────┐ ┌───┴──────┐
         │ Orador  │ │ Oyente │ │  Monitor  │
         │(Chrome) │ │(Cualq.)│ │(Admin.)   │
         │Browser  │ │Browser │ │Browser    │
         └─────────┘ └────────┘ └───────────┘
```

## Descripción

- **Servidor**: Ubuntu Server (22.04+) conectado por Ethernet al switch.
- **Access Point**: WiFi 5 GHz con WMM habilitado, canal sin congestión externa.
- **Clientes**: Dispositivos con navegador (Chromebooks, smartphones, tablets, notebooks) conectados por WiFi.
- **Rango de puertos RTP**: 2000–2050 UDP (50 puertos, compartidos RTP/RTCP via `enableRtcpMux`).
- **Señalización**: Puerto 3000 TCP (HTTPS + WebSocket Socket.IO).

## Consideraciones de Diseño

1. **Servidor por Ethernet**: el servidor está cableado al AP para evitar doble salto WiFi y garantizar que el marcado DSCP del servidor sea efectivo. Si el servidor estuviera también por WiFi, el marcado iptables no tendría efecto porque el tráfico saldría por la interfaz inalámbrica antes de pasar por la cadena OUTPUT de iptables.

2. **network_mode: host**: Docker se ejecuta en modo host para que mediasoup pueda bindear los puertos UDP reales y el AP vea la IP física del servidor.

3. **Rango de puertos fijo**: 2000-2050 permite aplicar reglas iptables precisas para DSCP sin afectar otro tráfico.
