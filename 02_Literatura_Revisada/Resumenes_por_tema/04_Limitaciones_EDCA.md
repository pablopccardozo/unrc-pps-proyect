# Limitaciones de EDCA

Las aplicaciones en Tiempo Real (RTA: Real-Time Applications) como control remoto, realidad virtual y audio profesional tienen requisitos extremos de latencia (<1ms a 100ms) y pérdida de paquetes (<10⁻⁵ a 10⁻²). El mecanismo de acceso al canal por defecto en Wi-Fi, EDCA (WMM), solo puede ofrecer garantías de Calidad de Servicio (QoS) probabilísticas, lo que es insuficiente para estas RTA, especialmente en redes congestionadas.

## Límite Fundamental:

En EDCA, una estación (STA) no cuenta con un mecanismo para interrumpir (preempt) una transmisión de larga duración de otra STA (el cuello de botella para baja latencia extrema). Si un paquete RTA llega cuando el canal está ocupado por una transmisión larga (hasta ~5ms), no hay forma de cumplir con un límite de latencia de por ejemplo 1ms.

### RTA y Requisitos Cuantitativos

* Video en tiempo real: 3-10 ms de latencia, PLR < 10⁻⁷.

* Juegos en línea: ~10 ms de latencia, PER < 0.1%.

* Control supervisorio: 10-100 ms de latencia, PLR < 10⁻⁹ a 10⁻⁵.

* **"<150ms para voz"**. (mi caso)

