## 4.5. Contenerización con Docker

Docker es una plataforma de virtualización a nivel de sistema operativo que permite empaquetar aplicaciones y sus dependencias en contenedores ligeros y portables. A diferencia de las máquinas virtuales tradicionales, los contenedores comparten el kernel del sistema anfitrión, lo que reduce drásticamente el overhead de recursos.

### 4.5.1. Ventajas para el Proyecto

La contenerización del servidor de audio aporta los siguientes beneficios:

- **Reproducibilidad**: el entorno de ejecución (Node.js, dependencias del sistema, configuración de red) queda definido en el Dockerfile, eliminando el problema de "en mi máquina funciona".
- **Aislamiento**: el servidor de audio se ejecuta en un entorno aislado que no interfiere con otros servicios del sistema.
- **Portabilidad**: la misma imagen Docker puede ejecutarse en cualquier máquina con Docker instalado, facilitando el despliegue en diferentes servidores.
- **Seguridad**: el contenedor se ejecuta con un usuario no-root (`mediasoup`), limitando el impacto de potenciales vulnerabilidades.

### 4.5.2. Build Multi-Stage

El Dockerfile del proyecto utiliza un build multi-stage:

1. **Stage `builder`** (basado en `node:22-slim`): instala las herramientas de compilación necesarias (`build-essential`, `python3`) y compila las dependencias nativas de mediasoup mediante `npm install`.
2. **Stage de producción** (basado en `node:22-slim`): copia únicamente los `node_modules` ya compilados y el código fuente. No incluye las herramientas de compilación, reduciendo significativamente el tamaño final de la imagen.

### 4.5.3. network_mode: host

Una decisión arquitectónica clave es el uso de `network_mode: "host"` en Docker Compose. En este modo, el contenedor comparte la pila de red del host directamente, sin pasar por el NAT de Docker. Esto es **requerido** por dos razones:

1. **Candidatos ICE de mediasoup**: mediasoup necesita enlazar sockets UDP en puertos específicos y conocer la IP real del servidor para generar candidatos ICE válidos. Con el modo bridge predeterminado de Docker, la IP del contenedor es privada (ej. 172.17.0.x) y no es alcanzable desde los clientes.

2. **WMM / DSCP**: las reglas iptables que marcan DSCP se aplican a nivel del host. Si el tráfico RTP pasara por el NAT de Docker, el marcado podría no aplicarse correctamente porque los paquetes atravesarían una interfaz virtual (docker0) antes de salir por la interfaz física.

### 4.5.4. Recursos y Healthcheck

El contenedor está configurado con límites de recursos:
- Memoria máxima: 512 MB
- Memoria reservada: 256 MB
- `cap_add: SYS_NICE`: permite priorización de procesos en tiempo real dentro del contenedor

Además, incluye un healthcheck que verifica periódicamente el endpoint `/api/health` del servidor, permitiendo a Docker detectar y reiniciar automáticamente el contenedor si el servicio deja de responder.

### 4.5.5. Servicios systemd

Para garantizar la operación autónoma del sistema (plug-and-play), el proyecto incluye dos servicios systemd:

- **`wmm-audio.service`**: gestiona el ciclo de vida del contenedor Docker. Se inicia automáticamente al encender el servidor.
- **`wmm-network-watch.service`**: watchdog que monitorea cambios en la IP de red del servidor. Si la IP cambia (por renovación DHCP, cambio de red, etc.), detiene y recrea el contenedor para que mediasoup actualice sus candidatos ICE, y regenera los certificados SSL con la nueva IP.
