## 4.2. WebRTC (Web Real-Time Communication)

WebRTC es un conjunto de protocolos y APIs estandarizados por el W3C y la IETF que permite la comunicación en tiempo real entre navegadores y aplicaciones sin necesidad de plugins externos. Su adopción masiva en los últimos años lo ha convertido en la tecnología de referencia para videoconferencias, streaming en vivo y comunicaciones multimedia en general.

### 4.2.1. Protocolos de Transporte

WebRTC utiliza los siguientes protocolos para la transmisión de medios:

**RTP (Real-time Transport Protocol, RFC 3550)**: transporta los flujos de audio y video sobre UDP. Cada paquete RTP contiene un encabezado con información de secuencia, timestamp de muestreo y tipo de payload, permitiendo al receptor reordenar los paquetes y reconstruir la temporización original.

**RTCP (RTP Control Protocol)**: opera en paralelo con RTP y proporciona información sobre la calidad de la transmisión: pérdida de paquetes, jitter, RTT (Round-Trip Time). En este proyecto, mediasoup utiliza RTCP para el feedback de control de congestión (transport-cc).

**SRTP/SRTCP (Secure RTP)**: versión cifrada de RTP/RTCP. Todo el tráfico de medios en WebRTC viaja cifrado obligatoriamente mediante AES, garantizando confidencialidad e integridad.

**STUN/TURN**: protocolos auxiliares para el establecimiento de conectividad. STUN (Session Traversal Utilities for NAT, RFC 5389) permite descubrir la dirección IP pública detrás de un NAT. TURN (Traversal Using Relays around NAT, RFC 5766) es un mecanismo de retransmisión cuando la conexión directa no es posible. En el entorno LAN de este proyecto, STUN es suficiente y TURN no es necesario.

### 4.2.2. Señalización con Socket.IO

WebRTC requiere un canal de señalización externo para intercambiar:

- Capacidades multimedia (códecs soportados, perfiles).
- Parámetros DTLS para el establecimiento de la capa de seguridad.
- Candidatos ICE (direcciones IP y puertos para la conectividad).
- Metadatos de sesión (identidad del usuario, roles, estado).

En este proyecto, la señalización se implementa mediante **Socket.IO**, una librería que abstrae WebSocket con capacidades de reintento automático, salas y broadcast. A diferencia del tráfico de medios que fluye directamente entre pares (o entre cliente y SFU), la señalización viaja por una conexión TCP persistente y no tiene requisitos estrictos de latencia.

Los eventos de señalización definidos en el sistema cubren el registro de oradores y oyentes, la creación de transports WebRTC, la conexión DTLS, la creación de producers y consumers, y el reporte periódico de métricas de latencia desde los oyentes.
