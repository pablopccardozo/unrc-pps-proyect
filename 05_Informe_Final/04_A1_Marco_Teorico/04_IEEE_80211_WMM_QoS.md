## 4.4. Calidad de Servicio en IEEE 802.11: WMM y EDCA

### 4.4.1. El Problema del Acceso al Medio en WiFi

El estándar IEEE 802.11 original define el mecanismo DCF (Distributed Coordination Function), basado en CSMA/CA (Carrier Sense Multiple Access with Collision Avoidance). En DCF, todas las estaciones compiten por el canal con igual probabilidad: antes de transmitir, cada estación sensa el medio y, si está ocupado, espera un tiempo aleatorio (backoff) dentro de una ventana de contención (CW). Este mecanismo es inherentemente probabilístico y no ofrece diferenciación entre tipos de tráfico.

Para aplicaciones de audio en tiempo real, esto es problemático porque:
- Un paquete de voz compite en igualdad de condiciones con una descarga de archivos.
- Las ráfagas de tráfico best-effort pueden saturar el canal, aumentando la latencia y el jitter del audio.
- No existe un mecanismo para dar prioridad a los paquetes más sensibles al retardo.

### 4.4.2. HCF y EDCA (IEEE 802.11e)

El estándar IEEE 802.11e introduce la Hybrid Coordination Function (HCF), que define dos mecanismos de acceso al canal:

**EDCA (Enhanced Distributed Channel Access)**: evolución de DCF que introduce cuatro Categorías de Acceso (AC) con diferentes niveles de prioridad. Cada categoría tiene sus propios parámetros de contención:

| Categoría | AC | CWmin | CWmax | AIFS | TXOP Limit | Uso típico |
|-----------|----|-------|-------|------|------------|------------|
| AC_VO (Voz) | 0 | 3 | 7 | 2 | 1.504 ms | Audio en tiempo real |
| AC_VI (Video) | 1 | 7 | 15 | 2 | 3.008 ms | Video en tiempo real |
| AC_BE (Best Effort) | 2 | 15 | 1023 | 3 | — | Datos sin prioridad |
| AC_BK (Background) | 3 | 15 | 1023 | 7 | — | Tráfico de baja prioridad |

Los parámetros clave que diferencian las categorías son:

- **AIFS (Arbitration Interframe Space)**: tiempo de espera mínimo antes de transmitir. AC_VO tiene el AIFS más pequeño (2 slots), lo que le da ventaja sobre AC_BE (3 slots) y AC_BK (7 slots).
- **CWmin / CWmax**: ventana de contención mínima y máxima. AC_VO tiene las ventanas más pequeñas (3–7), lo que reduce el tiempo de backoff.
- **TXOP (Transmission Opportunity)**: tiempo máximo que una estación puede transmitir sin ceder el canal.

Cuanto menor es AIFS, CWmin y CWmax, mayor es la probabilidad de ganar el acceso al canal. Esto le da al tráfico AC_VO una ventaja estadística significativa sobre las demás categorías. Sin embargo, como señalan Alimenti et al. [3], debido a que los valores de CW se superponen parcialmente entre categorías, existe la posibilidad de que una trama de menor prioridad sea transmitida antes que una de mayor prioridad, lo que refleja la naturaleza probabilística del mecanismo.

**HCCA (HCF Controlled Channel Access)**: mecanismo de acceso controlado por sondeo. El AP actúa como coordinador central y asigna TXOPs a las estaciones basándose en reservas de recursos (TSPEC). Es más determinista que EDCA pero más complejo de implementar y menos difundido. Chen et al. [5] demostraron que, en entornos con tráfico pesado como transmisión HDTV, el modo HCCA ofrece garantías de QoS superiores al mantener una latencia estable independientemente de la carga de la red, a diferencia de EDCA que se degrada significativamente.

### 4.4.3. Wi-Fi Multimedia (WMM)

Wi-Fi Multimedia (WMM) es la implementación comercial y certificada por la Wi-Fi Alliance del mecanismo EDCA. Está presente en prácticamente todos los access points y dispositivos WiFi modernos. Cuando un access point anuncia soporte WMM, las estaciones pueden clasificar su tráfico en las cuatro categorías de acceso.

**Importante**: WMM no es un mecanismo de reserva de recursos ni de garantía de QoS. Es un mecanismo de **priorización estadística**: el tráfico AC_VO tiene mayor probabilidad de ganar el acceso al canal, pero en condiciones de alta congestión puede igualmente sufrir degradación. Como señalan Bankov et al. [2], EDCA solo puede ofrecer garantías de QoS probabilísticas, no deterministas, ya que la capacidad de cumplir con los requisitos de QoS está sujeta a la carga del canal y a la interferencia. Además, Sanguankotchakorn et al. [6] demostraron mediante simulación que EDCA no puede asegurar totalmente los requisitos de QoS bajo alta carga, con un límite de retardo unidireccional de 150 ms para tráfico de voz y una tasa de pérdida máxima del 5%.

### 4.4.4. Limitaciones de EDCA/WMM

Diversos estudios han identificado limitaciones fundamentales de EDCA:

1. **Contención intra-categoría**: todos los dispositivos con tráfico AC_VO usan los mismos parámetros de contención (CWmin, CWmax, TXOP). Si múltiples estaciones transmiten voz, compiten entre sí con igual probabilidad, pudiendo degradar el rendimiento de todas. Sanguankotchakorn et al. [6] demostraron que esta contención intra-categoría causa un aumento drástico en el retardo y la pérdida de paquetes a partir de cierto número de estaciones (8 en su simulación), y propusieron un mecanismo adaptativo que ajusta dinámicamente los parámetros de contención según la ocupación de la cola.

2. **Sin preemptión**: EDCA no permite interrumpir una transmisión en curso. Bankov et al. [2] señalan que una transmisión de larga duración puede ocupar el canal hasta ~5 ms, y dado que una estación WiFi heredada no tiene medios para detener una transmisión en curso de otra estación, resulta imposible satisfacer requisitos de latencia del orden de 1 ms para aplicaciones de control de emergencia.

3. **Downlink como cuello de botella**: el AP compite por el canal con las estaciones cliente con la misma probabilidad de acceso, pero generalmente debe transmitir un volumen de datos mucho mayor (tráfico descendente). Sanguankotchakorn et al. [6] identifican que, dado que el AP y las estaciones usan los mismos parámetros EDCA para la misma categoría de acceso, se produce un cuello de botella en el downlink cuando el tráfico descendente es dominante, como ocurre en aplicaciones de audio y video en tiempo real.

### 4.4.5. DiffServ y Marcado DSCP

DiffServ (Differentiated Services, RFC 2474) es un mecanismo de QoS a nivel de red (Capa 3) que clasifica los paquetes IP mediante el campo DSCP (Differentiated Services Code Point) en el encabezado IPv4/IPv6.

Los valores DSCP más relevantes para este proyecto son:

| DSCP | Valor | Significado | Cola WMM |
|------|-------|-------------|----------|
| EF (Expedited Forwarding) | 46 (0xB8) | Baja latencia, baja pérdida | AC_VO |
| AF41–AF43 | 34–36 | Garantía de entrega para video | AC_VI |
| BE (Best Effort) | 0 | Tráfico sin prioridad | AC_BE |

El marcado DSCP se realiza típicamente en el origen del tráfico (la estación o el servidor) mediante políticas de QoS del sistema operativo o reglas de firewall. En el presente proyecto, el servidor Ubuntu aplica reglas `iptables` en la tabla `mangle` para marcar con DSCP EF el tráfico RTP/UDP en el rango de puertos 2000–2050.

### 4.4.6. Correlación DSCP ↔ WMM

El access point WiFi, al recibir un paquete con marcado DSCP EF, lo asigna internamente a la cola AC_VO. La relación entre DSCP y la categoría de acceso WMM está definida en el estándar IEEE 802.11 y es implementada por la mayoría de los access points comerciales. Esto permite que el marcado a nivel IP se traduzca en priorización a nivel de enlace WiFi, cerrando el círculo entre la política de QoS del servidor y la priorización en el medio inalámbrico.

Estudios experimentales han demostrado que, bajo condiciones de congestión, el uso de AC_VO puede reducir la latencia P99 downlink hasta un 76% respecto a AC_BE (de 409 ms a 100 ms), y el jitter de audio de 32 ms a 4 ms [4]. Estos resultados, obtenidos por Hervieu et al. en el estudio conjunto CableLabs/Meta (2024) con 132 casos de prueba sobre una topología WiFi emulada, son particularmente relevantes para este proyecto, ya que demuestran que una correcta configuración de WMM puede marcar la diferencia entre una experiencia inaceptable y una de alta calidad.

El mismo estudio [4] también reveló un hallazgo importante para el diseño de sistemas de audio en tiempo real: cuando el tráfico downlink se prioriza con AC_VO, la latencia uplink (que permanece como best-effort) puede incrementarse como efecto colateral. En las pruebas, la latencia P99 uplink pasó de 141 ms (con downlink AC_BE) a 178 ms (con downlink AC_VO), un aumento del 26%. Sin embargo, este efecto se considera aceptable porque la reducción en la latencia downlink y la mejora en el jitter de audio (de 32 ms a 4 ms) compensan ampliamente el incremento, resultando en una mejor experiencia de usuario global. Este fenómeno de "daño colateral" es relevante para el presente proyecto debido a la asimetría del marcado DSCP entre uplink y downlink.
