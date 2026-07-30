
## Paso 1 — Configurar Wireshark para captura útil:

Capturar solo el tráfico RTP en los puertos del sistema.
#### Filtro de display en Wireshark:

```
udp.port >= 2000 && udp.port <= 2050
```

Para análisis de jitter y packet loss en RTP específicamente, activar el decodificador: _Analyze → Decode As → RTP_. Luego ir a _Telephony → RTP → RTP Streams_ para ver estadísticas por stream automáticamente.

## Paso 2 — Configurar iPerf3 para saturación controlada:

En el dispositivo servidor de carga:

```bash
iperf3 -s  # modo servidor
```

En los clientes que generan carga:

```bash
# Saturación UDP (más realista para WiFi)
iperf3 -c <IP_servidor> -u -b 20M -t 60

# Con múltiples flujos paralelos para saturar mejor
iperf3 -c <IP_servidor> -u -b 10M -P 4 -t 60
```

Ajustar el bitrate (`-b`) según tu AP. Arrancá con 10–20 Mbps y observá en el AP o con `iwconfig`/`iw dev` la utilización real del canal.

## Paso 3 — Fuentes de métricas disponibles:

Las métricas vienen de tres capas y conviene correlacionarlas:

|Métrica|Fuente|
|---|---|
|Packet loss, jitter (red)|Wireshark → RTP Streams|
|E2E delay percibido|`/monitor.html` del sistema (LatencyService)|
|Jitter buffer delay, packets lost|`listener-latency-report` (WebRTC Stats API)|
|Throughput del stream|`/api/stats` del servidor|
|Tamaño de cola / buffer del SO|`ss -i` o `tc -s qdisc` en el servidor|

### Paso 4 — Medir tamaño de cola (queue size):

En el servidor Linux, durante una prueba activa:

```bash
# Ver colas de red y estadísticas del qdisc
tc -s qdisc show dev <interfaz_wifi>

# Ver buffers de socket en tiempo real
watch -n 1 "ss -unp | grep -E '200[0-9]|20[1-4][0-9]|2050'"
```

