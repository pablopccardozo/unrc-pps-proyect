## 5.2. Implementación del Servidor

### 5.2.1. Configuración de mediasoup

La configuración del SFU se define en `mediasoup-config.js`, que exporta tres bloques de configuración:

**Códecs soportados**: se configuró un único codec de audio Opus con las siguientes características:

| Parámetro | Valor |
|-----------|-------|
| MIME type | `audio/opus` |
| Clock rate | 48000 Hz |
| Canales | 2 (estéreo) |
| RTCP feedback | `transport-cc`, `nack` |

El feedback `transport-cc` permite al control de congestión del lado del servidor ajustar dinámicamente el bitrate de los flujos basándose en las condiciones de la red.

**Transportes WebRTC**: los parámetros de los transportes se definieron considerando las características del entorno LAN:

```javascript
const webRtcTransportOptions = {
    listenIps: [{ ip: '0.0.0.0', announcedIp: '<IP detectada>' }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    listenPortRange: { min: 2000, max: 2050 },
    initialAvailableOutgoingBitrate: 1000000,  // 1 Mbps
    maxIncomingBitrate: 80000,                  // 80 kbps
    iceConsentTimeout: 5,
    enableRtcpMux: true
};
```

La decisión más relevante es el valor de `maxIncomingBitrate` en 80 kbps. Este valor funciona como un safety net por transporte, calculado de la siguiente forma:
- Bitrate máximo de Opus: 32 kbps
- Overhead de FEC (~50%): 48 kbps
- Overhead RTP/UDP/IP (~40%): ~67 kbps
- Margen de seguridad (~20%): **80 kbps**

El valor de `initialAvailableOutgoingBitrate` se mantiene en 1 Mbps para el control de congestión (BWE), aunque el encoder Opus limita su salida a 24-32 kbps independientemente de este valor.

**Worker**: se ejecuta con nivel de log `warn` y el mismo rango de puertos RTP definido para los transportes. En caso de falla del worker (evento `died`), el servicio intenta un reinicio automático tras 2 segundos.

### 5.2.2. Contenerización con Docker

El servidor se despliega como un contenedor Docker utilizando un **build multi-stage** optimizado para reducir el tamaño de la imagen final:

1. **Etapa builder** (`node:22-slim`): instala `build-essential`, `python3` y `git` para compilar las dependencias nativas de mediasoup (que incluyen binarios en C++). Ejecuta `npm install` y limpia la caché.

2. **Etapa de producción** (`node:22-slim`): copia únicamente los `node_modules` compilados y el código fuente. Crea un usuario no-root `mediasoup` para ejecutar el proceso, minimizando la superficie de ataque.

La imagen resultante incluye solo lo necesario para el runtime: Node.js, las dependencias compiladas, el código de la aplicación, y `curl` para healthcheck. El tamaño final es significativamente menor que si se incluyeran las herramientas de compilación.

El `docker-compose.yml` configura el servicio con los siguientes aspectos destacados:

- **`network_mode: "host"`**: el contenedor comparte la pila de red del host. Esto es **obligatorio** por dos razones: (a) mediasoup necesita enlazar sockets UDP en puertos específicos y anunciar la IP real del servidor como candidato ICE, y (b) las reglas iptables de marcado DSCP se aplican sobre las interfaces de red del host, no sobre una interfaz virtual docker0.

- **Límites de recursos**: 512 MB de memoria máxima, 256 MB reservados. En pruebas, el consumo real del contenedor oscila entre 80 y 150 MB con 5-10 participantes simultáneos.

- **Healthcheck**: verifica `GET /api/health` cada 30 segundos, con 3 reintentos y un período de inicio de 10 segundos.

- **Persistencia**: los certificados SSL y los archivos estáticos se montan como volúmenes de solo lectura; los logs se montan con escritura.

- **Reinicio automático**: `restart: unless-stopped` asegura que el contenedor se recupere ante fallos del sistema o del proceso.

### 5.2.3. Configuración de QoS con iptables y DSCP

El script `wmm-qos-setup.sh` configura las reglas de marcado DSCP en el servidor Ubuntu:

```bash
# Crear cadena custom
iptables -t mangle -N WMM_QOS

# Enganchar en OUTPUT y FORWARD
iptables -t mangle -A OUTPUT -j WMM_QOS
iptables -t mangle -A FORWARD -j WMM_QOS

# Marcar tráfico RTP/UDP con DSCP EF (46)
iptables -t mangle -A WMM_QOS -p udp --sport 2000:2050 -j DSCP --set-dscp 46
iptables -t mangle -A WMM_QOS -p udp --dport 2000:2050 -j DSCP --set-dscp 46
```

El diseño utiliza una **cadena custom** (`WMM_QOS`) en la tabla `mangle` por dos razones:
- **Idempotencia**: el script puede ejecutarse múltiples veces sin duplicar reglas. Si la cadena ya existe, se limpia (`-F`) y se recrea.
- **Aislación**: las reglas de QoS están encapsuladas en su propia cadena, separadas de otras posibles reglas de iptables.

Las reglas marcan con DSCP EF (valor 46, que corresponde a Expedited Forwarding) tanto el tráfico saliente (`--sport`) como el entrante (`--dport`) en el rango de puertos RTP (2000–2050). El access point WiFi, al recibir un paquete con DSCP EF, lo asigna a la cola de mayor prioridad (AC_VO - Voice), reduciendo la latencia y el jitter en el medio inalámbrico.

**Importante**: el marcado se aplica sobre las cadenas `OUTPUT` y `FORWARD`, pero no sobre `INPUT`. Esto se debe a la topología de red del laboratorio: el servidor está conectado por Ethernet al access point. El tráfico de uplink (orador → servidor) llega por el cable Ethernet, un medio sin contención donde el marcado DSCP no es necesario. El tráfico de downlink (servidor → oyente) sale por Ethernet hacia el AP, que luego lo transmite por WiFi. Es en este tramo inalámbrico donde la priorización WMM tiene impacto, y por eso se marca a la salida del servidor.

### 5.2.4. Sistema de Logging

Se implementó un sistema de logging estructurado con Winston que escribe en dos destinos simultáneamente:
- **Consola**: salida estándar con formato colorizado (útil para `docker logs`).
- **Archivo**: `logs/wmm-audio.log` con rotación diaria.

Los niveles de log utilizados son: `error`, `warn`, `info`, `debug`. En producción se utiliza `info` como nivel por defecto; en desarrollo se puede activar `debug` para obtener trazas detalladas de mediasoup.

### 5.2.5. Automatización del Despliegue (Plug & Play)

El script `install-server.sh` automatiza la instalación completa en un servidor Ubuntu limpio:

1. Instalación de Docker, Docker Compose, Avahi Daemon e iptables.
2. Generación de certificados SSL autofirmados con SAN para `auditorio.local` y la IP actual.
3. Creación de la regla de redirección de puerto (443 → 3000) mediante iptables.
4. Instalación y habilitación de los servicios systemd (`wmm-audio.service` y `wmm-network-watch.service`).
5. Build local de la imagen Docker y arranque de la aplicación.

Adicionalmente, el servicio `wmm-network-watch.service` monitorea cambios en la IP de red del servidor (por renovación DHCP o cambio de red). Si la IP cambia, detiene el contenedor, regenera los certificados SSL con la nueva IP, y lo recrea para que mediasoup actualice sus candidatos ICE.
