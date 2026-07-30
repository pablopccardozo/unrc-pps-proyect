## 5.3. Implementación del Cliente Web

El cliente es una aplicación web progresiva que se ejecuta en el navegador del dispositivo (computadora, tablet o smartphone) sin necesidad de instalación. Está construida con HTML5, CSS3 y JavaScript vanilla, aprovechando las APIs estándar del navegador para comunicación en tiempo real.

### 5.3.1. Flujo de Señalización (Socket.IO)

Todas las páginas comparten un módulo común `socket-client.js` que establece una conexión Socket.IO con el servidor. Esta conexión se utiliza para:

1. **Registro de usuarios**: el cliente envía su nombre y rol (speaker/listener/monitor). El servidor valida, asigna la sala correspondiente y responde con el estado actual.
2. **Intercambio de capacidades WebRTC**: negociación de codecs, creación de transports, conexión DTLS, y establecimiento de producers/consumers.
3. **Notificaciones de estado**: cambios en la lista de oradores, eventos de pausa/reanudación, desconexiones.
4. **Reporte de métricas**: los oyentes envían reportes periódicos de latencia, jitter y pérdida de paquetes.

### 5.3.2. Interfaz del Orador (transmision.html)

El orador accede a través de un login con nombre y clave secreta. Una vez autenticado, la interfaz de transmisión ofrece:

- **Captura de audio**: utiliza `getUserMedia()` para acceder al micrófono del dispositivo. El audio se codifica en Opus (24 kbps por defecto, 20 ms por paquete) y se envía como Producer de mediasoup.
- **Visualización de forma de onda**: muestra la actividad de audio en tiempo real mediante la Web Audio API (AnalyserNode).
- **Contador de oyentes**: el orador puede ver cuántas personas están escuchando su transmisión.
- **Estadísticas de latencia**: recibe reportes periódicos de latencia de cada oyente, permitiendo identificar problemas de red en tiempo real.
- **Control de transmisión**: botones para pausar/reanudar la transmisión sin cerrar la sesión, y para detenerla completamente.
- **Screen Wake Lock**: evita que el dispositivo entre en suspensión durante la transmisión.

### 5.3.3. Interfaz del Oyente (oyente.html)

El oyente ingresa sin autenticación y ve la lista de oradores activos. Al seleccionar un orador:

1. El cliente crea un RecvTransport (transporte de recepción) en mediasoup.
2. Por cada orador activo, solicita la creación de un Consumer.
3. Cada Consumer se conecta a un nodo `MediaStreamSource` independiente en la Web Audio API.
4. Los nodos se mezclan en el destino de audio (`AudioContext.destination`), permitiendo escuchar múltiples oradores simultáneamente.

La interfaz incluye:
- **Lista de oradores**: muestra el nombre, estado (transmitiendo/en pausa) y nivel de actividad de audio de cada orador.
- **Control de volumen individual**: cada orador tiene su propio slider de volumen, implementado con un `GainNode` por flujo.
- **Volumen global**: control maestro sobre todos los flujos.
- **Indicador de latencia**: muestra la latencia medida hacia el servidor.
- **Screen Wake Lock**: evita la suspensión durante la escucha.

**Manejo de múltiples oradores**: el sistema soporta que varios oradores transmitan simultáneamente. Cuando un nuevo orador comienza a transmitir, el servidor emite el evento `new-producer` a todos los oyentes. El cliente crea automáticamente un nuevo Consumer y agrega el flujo a la mezcla. Cuando un orador se desconecta, solo se remueve su Consumer y su nodo de audio, sin afectar al resto.

### 5.3.4. Panel de Monitoreo (monitor.html)

El monitor es un dashboard en tiempo real accesible sin autenticación, diseñado para que el administrador del sistema supervise el estado de la sesión. Muestra:

- **Usuarios conectados**: lista de oradores (con estado de transmisión) y oyentes.
- **Métricas de latencia**: gráfico en tiempo real con la latencia promedio, por oyente y por orador.
- **Alertas de latencia**: cuando un oyente supera los umbrales configurados (warning ≥ 150 ms, critical ≥ 250 ms), se dispara una alerta visual con codificación por colores.
- **Ancho de banda**: bitrate de cada flujo activo.
- **Estado del servidor**: IP detectada, puerto, versión del servicio.
- **Información de red**: muestra la IP del servidor para que el administrador pueda comunicarla a dispositivos que no soporten mDNS.

### 5.3.5. Dependencia del Navegador para DSCP en Uplink

Un hallazgo importante de la implementación es que el marcado DSCP en el uplink (orador → servidor) depende del navegador que utilice el orador:

- **Chrome/Chromium/Edge**: al setear `priority: 'high'` y `networkPriority: 'high'` en los encodings del Producer (configurado en `transport-service.js`), el navegador traduce esto a DSCP EF (0xB8) en los paquetes RTP salientes.
- **Firefox**: no implementa esta traducción. Los paquetes RTP salientes se envían sin marcado DSCP.
- **Safari**: comportamiento similar a Firefox.

Esto crea una **asimetría en la priorización**: un orador que use Chrome obtendrá priorización WMM tanto en el uplink (marcado por el navegador) como en el downlink (marcado por el servidor), mientras que un orador con Firefox solo obtendrá priorización en el downlink.

Esta limitación es inherente a la implementación de WebRTC en cada navegador y no puede resolverse desde el servidor, ya que el tráfico uplink llega por Ethernet (desde el AP) y las reglas iptables del servidor no pueden marcar tráfico que ya ingresó por una interfaz cableada sin afectar otros flujos.

### 5.3.6. Consideraciones de Seguridad en el Cliente

- **Autenticación por clave compartida**: los oradores deben conocer la `SECRET_KEY` para acceder.
- **Sesión en `sessionStorage`**: el nombre del orador se almacena en `sessionStorage` del navegador, que se limpia al cerrar la pestaña.
- **Sanitización de nombres**: aunque el servidor almacena el nombre sin validación, el frontend aplica `escapeHtml()` antes de renderizarlo en el DOM para prevenir XSS.
- **HTTPS obligatorio**: los navegadores solo permiten `getUserMedia()` y WebRTC en contextos seguros (HTTPS o localhost).
