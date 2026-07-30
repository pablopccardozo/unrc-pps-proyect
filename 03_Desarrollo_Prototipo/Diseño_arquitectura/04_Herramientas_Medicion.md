# Herramientas de Medición y Monitoreo

## Herramientas Utilizadas en el Proyecto

| Herramienta | Propósito | Dónde se ejecuta |
|-------------|-----------|------------------|
| **Wireshark** | Captura y análisis de paquetes RTP/UDP, verificación de marcado DSCP, medición de latencia y jitter | Servidor (tcpdump) + Cliente (Wireshark) |
| **tcpdump** | Captura de paquetes en el servidor para análisis posterior | Servidor Ubuntu |
| **WebRTC Stats API** | Métricas en tiempo real desde el navegador (jitter, packet loss, RTT) | Cliente (navegador) |
| **Panel de monitoreo** (/monitor.html) | Dashboard con métricas agregadas, alertas de latencia, estado de usuarios | Cualquier dispositivo |
| **LatencyService** (servidor) | Recepción, almacenamiento y reenvío de reportes de latencia | Servidor Node.js |
| **mediasoup trace events** | Monitoreo de bitrate y BWE (Bandwidth Estimation) | Servidor Node.js |
| **chrome://webrtc-internals** | Estadísticas detalladas de WebRTC desde Chrome | Cliente Chrome |
| **ping / iperf3** | Verificación de conectividad y generación de tráfico de fondo | Servidor y clientes |

## Procedimiento de Captura

### En el servidor (captura de tráfico downlink)

```bash
# Capturar todo el tráfico RTP
sudo tcpdump -i eth0 -nn -s 0 -w captura_servidor.pcap udp portrange 2000-2050

# Capturar con filtro DSCP
sudo tcpdump -i eth0 -nn -v udp portrange 2000-2050 and 'ip[1] & 0xfc == 0xb8'
```

### En el cliente WiFi (análisis con Wireshark local)

```bash
# Desde el cliente (si tiene tcpdump)
tcpdump -i wlan0 -nn -s 0 -w captura_cliente.pcap udp portrange 2000-2050
```

## Métricas Extraídas

| Métrica | Fuente | Unidad |
|---------|--------|--------|
| Latencia RTT | WebRTC Stats API | ms |
| Jitter | WebRTC Stats API | ms |
| Packet loss | WebRTC Stats API | % / paquetes |
| DSCP marking | Wireshark (ip.dsfield.dscp) | 0-63 |
| Bitrate | mediasoup trace + WebRTC Stats | kbps |
| Oyentes conectados | RoomService (servidor) | número |
| Alertas de latencia | LatencyService (servidor) | evento |

## Monitoreo en Tiempo Real

El panel `/monitor.html` consolida en un dashboard:
- Lista de oradores con estado de transmisión
- Lista de oyentes conectados
- Latencia promedio, por oyente y por orador
- Alertas visuales por umbral superado (warning ≥ 150 ms, critical ≥ 250 ms)
- IP del servidor y versión
