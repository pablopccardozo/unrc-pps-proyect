# 4. Marco Teórico y Tecnologías

> *Corresponde a la Etapa A1 del plan de trabajo.*

## 4.1. Conceptos de Audio en Tiempo Real

El audio en tiempo real sobre redes de paquetes impone requisitos más estrictos que cualquier otro tipo de tráfico multimedia. A diferencia de la reproducción de un archivo pregrabado —donde un buffer grande puede absorber variaciones sin afectar la experiencia—, en una comunicación en vivo el tiempo de tránsito de los paquetes impacta directamente en la naturalidad de la interacción.

### 4.1.1. Latencia

La latencia extremo a extremo es el tiempo que transcurre desde que el orador genera el sonido hasta que el oyente lo escucha. Se compone de múltiples factores:

- **Latencia de captura**: tiempo de muestreo y codificación del audio en el dispositivo del orador.
- **Latencia de red**: tiempo de propagación y transmisión de los paquetes a través de la red (incluye el buffering en switches y access points).
- **Latencia de procesamiento**: tiempo de encolado, reordenamiento y decodificación en el dispositivo del oyente.
- **Jitter buffer**: retardo intencional agregado para absorber la variabilidad en el tiempo de llegada de los paquetes.

Para aplicaciones de voz en tiempo real, la recomendación UIT-T G.114 [1] establece los siguientes umbrales:

| Latencia | Calidad |
|----------|---------|
| < 100 ms | Excelente |
| 100–150 ms | Buena |
| 150–250 ms | Aceptable |
| 250–400 ms | Degradada |
| > 400 ms | Inaceptable |

Estos umbrales son consistentes con los reportados por la literatura especializada para aplicaciones de tiempo real en redes WiFi. Bankov et al. [2] presentan una tabla de requisitos para diversas aplicaciones RTA (Real-Time Applications), donde la voz en tiempo real requiere una latencia menor a 150 ms y una tasa de pérdida de paquetes inferior a 10⁻². Asimismo, Alimenti et al. [3] señalan que el límite superior aceptable para comunicaciones de voz es de 150 ms de retardo unidireccional, más allá del cual la inteligibilidad del habla se ve afectada.

En el presente proyecto se adoptaron umbrales más restrictivos (excelente < 100 ms, crítico ≥ 300 ms), considerando que el sistema opera en un entorno LAN controlado y que el objetivo es maximizar la inteligibilidad del habla para personas con disminución auditiva.

### 4.1.2. Jitter

El jitter es la variación en el tiempo de llegada de los paquetes. En redes WiFi, el jitter es inherentemente mayor que en redes cableadas debido a la contención del medio, las retransmisiones por errores de trama y los períodos de backoff del algoritmo CSMA/CA.

Para compensar el jitter, los sistemas de audio en tiempo real implementan un *jitter buffer* del lado del receptor: un buffer de tamaño configurable que retiene los paquetes el tiempo suficiente para que los más rezagados lleguen antes de ser reproducidos. La desventaja es que incrementa la latencia general.

En este proyecto, el jitter buffer está configurado en 20 ms (equivalente a un paquete Opus) en el servidor mediasoup y se monitorea desde los clientes mediante la API WebRTC Stats, reportando periódicamente el jitter medido. El estudio de Hervieu et al. [4] (CableLabs/Meta, 2024) establece que un jitter de audio superior a 30 ms se considera problemático para aplicaciones de tiempo real, y demuestra que la priorización WMM con AC_VO puede reducirlo de 32 ms a únicamente 4 ms en condiciones de congestión de red.

### 4.1.3. Pérdida de Paquetes

La pérdida de paquetes en redes WiFi puede ocurrir por:

- **Colisiones**: dos estaciones transmiten simultáneamente en el mismo canal.
- **Interferencia**: fuentes externas en la misma banda de frecuencia.
- **Atenuación**: degradación de la señal por distancia u obstáculos.
- **Overflow de buffers**: saturación en el access point o en el servidor.

Para mitigar el impacto de las pérdidas, el codec Opus utilizado en este proyecto incorpora dos mecanismos:

- **FEC (Forward Error Correction)**: envía información redundante que permite reconstruir paquetes perdidos a costa de un mayor ancho de banda.
- **DTX (Discontinuous Transmission)**: deja de transmitir durante los silencios, reduciendo el consumo de ancho de banda y la contención en el medio.

Los umbrales de calidad establecidos para este proyecto consideran una pérdida de paquetes aceptable por debajo del 2%, consistente con los estándares de la industria para voz sobre IP.
