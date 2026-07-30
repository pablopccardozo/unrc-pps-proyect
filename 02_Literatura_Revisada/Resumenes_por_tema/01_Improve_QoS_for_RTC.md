# Mejorar la Calidad de Servicio (QoS) para tráfico de audio/video en tiempo real sobre redes Wi-Fi (802.11e)

## Paper Adaptive Channel Access Mechanism for Real Time Traffic Over IEEE 802.11e Wi-Fi Network

### Problema que aborda

El mecanismo EDCA del estándar 802.11e (base de WMM) no garantiza QoS en presencia de tráfico elevado, "especialmente para aplicaciones de voz y video en tiempo real".

### Causa del problema

En EDCA todos los dispositivos con la misma categoría de acceso (AC) usan los mismos parámetros (CWmin, CWmax, TXOP), por lo tanto el AP puede capturar el canal con la misma probabilidad que las demas estaciones y dado que por lo general en aplicaciones de voz y video el trafico descendente es mayor, se producirán abundantes colisiones provocando una degradacion en el rendimiento cuando todas las estaciones tengan tráfico de voz. En consecuencia se encuentra un cuello de botella en el downlink.

### Solución propuesta

Un mecanismo de acceso al canal adaptativo que modifica dinámicamente los parámetros de contención (específicamente CWmax de las categorías de menor prioridad) basándose en la ocupación promedio de la cola (Q_avg) de las categorías de alta prioridad (Voz AC[0] y Video AC[1]).

### Resultados 

La propuesta logra mejoras significativas para trafico multimedia elevado:

* ***Reducción de retardo:*** Hasta 0.75 segundos menos para video y 0.5 segundos para voz.

* ***Reducción de pérdida de paquetes:*** Entre un 7% y un 15%.

* ***Aumento de throughput:*** Mejoras de hasta el 50% para video y 15% para voz.

