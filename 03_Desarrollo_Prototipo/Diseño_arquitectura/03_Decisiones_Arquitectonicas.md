# Decisiones Arquitectónicas Fundamentales

## 1. SFU (Selective Forwarding Unit) con mediasoup

**Decisión**: Usar mediasoup como SFU para enrutar flujos de audio.

**Alternativas descartadas**:
| Alternativa | Motivo de descarte |
|-------------|-------------------|
| P2P Mesh | No escala con múltiples oradores (cada orador debe enviar N flujos) |
| MCU (mezcla) | Mayor latencia por transcodificación, mayor consumo de CPU |
| RTP Multicast | No funciona en WiFi (sin soporte multicast fiable) |
| GStreamer | Complejidad de implementación, sin soporte nativo de navegadores |

**Ventaja obtenida**: Mínima latencia (sin transcodificación), escalabilidad horizontal (workers independientes), y framework maduro con API programática.

## 2. network_mode: host en Docker

**Decisión**: Ejecutar el contenedor Docker con `network_mode: "host"`.

**Alternativa descartada**: Bridge mode (NAT de Docker).

**Motivo**: mediasoup necesita bindear puertos UDP reales y anunciar la IP física del servidor como candidato ICE. Con bridge mode, la IP del contenedor (172.17.0.x) no es alcanzable desde los clientes. Además, las reglas iptables de QoS deben aplicarse sobre la interfaz real del host, no sobre docker0.

**Consecuencia**: Se pierde el aislamiento de red del contenedor, pero es un sacrificio necesario para el funcionamiento correcto de WebRTC + QoS.

## 3. WebRTC sobre mediasoup (no ORTC ni WebSocket nativo)

**Decisión**: Usar mediasoup-client + mediasoup-server (WebRTC estándar).

**Alternativa descartada**: WebSocket para todo (audio capturado y enviado como raw por WebSocket).

**Motivo**: WebRTC ofrece codecs optimizados (Opus), control de congestión integrado (GCC/transport-cc), cifrado obligatorio (SRTP), y soporte nativo en navegadores sin plugins.

## 4. Audio Opus como codeco único

**Decisión**: Solo Opus, sin soporte para otros codecs.

**Parámetros**:
- Bitrate: 24 kbps (por defecto), máx 32 kbps
- Ptime: 20 ms
- FEC: activado
- DTX: activado
- Canales: 2 (estéreo)

**Motivo**: Opus es el codec de audio más eficiente para tiempo real, con calidad transparente a 24 kbps y buen comportamiento ante pérdidas (FEC). No se necesita compatibilidad con otros codecs porque el sistema opera en un entorno controlado con navegadores modernos.

## 5. maxIncomingBitrate en 80 kbps

**Decisión**: Limitar el bitrate entrante a 80 kbps por transporte.

**Cálculo**:
- Opus max bitrate: 32 kbps
- Overhead FEC (~50%): 48 kbps
- Overhead RTP/UDP/IP (~40%): ~67 kbps
- Margen de seguridad (~20%): **80 kbps**

**Motivo**: Safety net para evitar que un productor defectuoso o mal configurado consuma ancho de banda excesivo. No afecta la calidad del audio porque el encoder Opus nunca alcanza ese límite.

## 6. Sin autenticación para oyentes y monitores

**Decisión**: Solo los oradores requieren autenticación (clave secreta).

**Motivo**: El sistema está diseñado para un auditorio donde cualquier persona debe poder escuchar sin fricción. El monitor es accesible para que el administrador pueda supervisar sin necesidad de login.

## 7. Frontend vanilla (sin frameworks)

**Decisión**: HTML5 + CSS3 + JavaScript sin React/Vue/Angular.

**Motivo**: La aplicación es lo suficientemente simple (5 páginas, sin estado complejo) como para no justificar el overhead de un framework. El bundle resultante es liviano y carga rápido en dispositivos móviles.

## 8. Marcado DSCP solo en OUTPUT (asimétrico)

**Decisión**: Reglas iptables solo en las cadenas OUTPUT y FORWARD, no en INPUT.

**Motivo**: El servidor está conectado por Ethernet al AP. El tráfico uplink (orador → servidor) llega por cable (sin contención WiFi), donde el marcado DSCP no aporta beneficio. El tráfico downlink (servidor → oyente) sale por Ethernet hacia el AP, que lo transmite por WiFi — ahí el marcado DSCP sí tiene impacto. Marcar INPUT podría afectar tráfico no RTP que ingresa al servidor.

## 9. JavaScript vanilla en frontend (sin TypeScript)

**Decisión**: JavaScript en lugar de TypeScript.

**Motivo**: El frontend es relativamente simple y no justifica la cadena de herramientas de TypeScript. El servidor Node.js también usa JavaScript para consistencia.

## 10. socket-controller.js como orquestador central

**Decisión**: Un solo controlador procesa todos los eventos Socket.IO y delega en los servicios.

**Motivo**: Centraliza la lógica de señalización en un punto, facilitando el mantenimiento y la depuración. Los eventos Socket.IO son ~20, un número manejable para un solo archivo.
