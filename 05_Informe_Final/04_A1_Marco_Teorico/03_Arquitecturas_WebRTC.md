## 4.3. Arquitecturas WebRTC para Distribución Multimedia

Existen tres arquitecturas fundamentales para distribuir flujos multimedia en WebRTC, cada una con diferentes compromisos entre eficiencia, escalabilidad y complejidad.

### 4.3.1. P2P (Peer-to-Peer) con Mesh

En una arquitectura mesh, cada participante envía su flujo multimedia a todos los demás participantes. Para *n* participantes, cada uno debe enviar *n-1* flujos y recibir otros *n-1*.

**Ventajas**: simple de implementar, no requiere servidor de medios, latencia mínima (sin relay).

**Desventajas**: el ancho de banda requerido crece linealmente con el número de participantes. Para aplicaciones con múltiples oradores, el cliente debe codificar y enviar *n* flujos simultáneos, lo que lo hace inviable más allá de 3-4 participantes.

### 4.3.2. MCU (Multipoint Control Unit)

En una arquitectura MCU, todos los participantes envían su flujo a un servidor central que mezcla, transcodifica y genera un único flujo compuesto que redistribuye a todos.

**Ventajas**: el cliente envía y recibe un único flujo, independientemente del número de participantes. Compatibilidad con clientes legacy.

**Desventajas**: el servidor debe transcodificar todo el tráfico, lo que requiere alta capacidad de cómputo. Introduce latencia adicional por el proceso de mezcla. Es la arquitectura menos eficiente en términos de recursos de servidor.

### 4.3.3. SFU (Selective Forwarding Unit) — Arquitectura Elegida

En una arquitectura SFU, los participantes envían su flujo al servidor, y el servidor reenvía (sin transcodificar) cada flujo a los participantes que deben recibirlo. El servidor funciona como un "router" de paquetes RTP.

**Ventajas**:
- **Eficiencia**: el servidor no transcodifica, solo reenvía paquetes. El consumo de CPU es mínimo comparado con MCU.
- **Baja latencia**: al no haber mezcla ni transcodificación, la latencia agregada por el SFU es del orden de microsegundos.
- **Escalabilidad**: el servidor escala horizontalmente agregando workers. Cada worker es un proceso independiente que maneja un subconjunto de transports.
- **Flexibilidad**: cada oyente puede recibir audio de todos los oradores o de un subconjunto.

**Desventajas**:
- El cliente debe manejar múltiples flujos de recepción. Sin embargo, el audio tiene un costo de procesamiento mucho menor que el video, y el uso de la Web Audio API permite mezclar múltiples fuentes eficientemente.

### 4.3.4. Justificación de la Elección (SFU)

Para este proyecto, la arquitectura SFU es la opción natural por las siguientes razones:

1. **Múltiples oradores simultáneos**: el sistema soporta que varios oradores transmitan a la vez. En una arquitectura mesh, un orador con *n* oyentes debería enviar *n* flujos, lo que no escala. Con SFU, cada orador envía un único flujo y el servidor lo replica a los *n* oyentes.

2. **Audio de ultra baja latencia**: al no requerir transcodificación, el SFU introduce una latencia despreciable, conservando las propiedades temporales del flujo original.

3. **Eficiencia del servidor**: mediasoup, el SFU utilizado, está implementado en C++ (con bindings para Node.js) y optimizado para manejar cientos de flujos RTP concurrentes con mínima sobrecarga.

4. **Recursos del laboratorio**: el servidor está en una red LAN con recursos acotados. SFU maximiza la cantidad de participantes posibles con el hardware disponible.

La elección de mediasoup como SFU se fundamenta en su madurez, su rendimiento (implementación nativa en C++), su modelo de workers independientes (un worker por núcleo de CPU) y su flexibilidad para configurar transports, producers y consumers mediante una API programática desde Node.js.
