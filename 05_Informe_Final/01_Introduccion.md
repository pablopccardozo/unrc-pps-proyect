# 1. Introducción

## 1.1. Contexto del Proyecto

La transmisión de audio en tiempo real sobre redes inalámbricas presenta desafíos técnicos significativos. A diferencia del audio bajo demanda, las comunicaciones en vivo requieren que los paquetes de audio lleguen al destino con una latencia predecible y mínima, tolerando pérdidas muy reducidas para mantener la inteligibilidad del habla. En entornos LAN/WiFi, factores como la contención del medio compartido, las colisiones y el algoritmo de backoff del estándar IEEE 802.11 introducen variabilidad en los tiempos de entrega (jitter) que pueden degradar severamente la experiencia del usuario.

En este contexto, el Laboratorio de Investigación y Desarrollo Aplicado a las Telecomunicaciones (GIDAT) de la Universidad Nacional de Río Cuarto (UNRC) promueve proyectos que integran tecnologías de red, sistemas embebidos y comunicaciones multimedia para resolver problemas del mundo real. El presente proyecto de Práctica Profesional Supervisada (PPS) se enmarca dentro de las líneas de investigación del GIDAT en redes de comunicaciones, calidad de servicio (QoS) y aplicaciones multimedia en tiempo real.

## 1.2. Justificación Social

Este proyecto surge de una necesidad concreta: proporcionar una herramienta de apoyo para personas con disminución auditiva en entornos educativos y de conferencia. En un auditorio o aula, una persona con dificultades auditivas puede beneficiarse de un sistema que transmita el audio del orador directamente a su dispositivo móvil o computadora personal, evitando los problemas de acústica, distancia y ruido ambiente que dificultan la comprensión del habla.

La solución propuesta apunta a ser de bajo costo, fácil de desplegar y basada en tecnologías abiertas y estándares, maximizando así su accesibilidad y potencial de adopción en instituciones educativas, centros culturales y espacios comunitarios.

## 1.3. Problemática Técnica

Las redes inalámbricas basadas en el estándar IEEE 802.11 fueron diseñadas originalmente para tráfico de datos best-effort, donde la pérdida de paquetes se resuelve con retransmisiones y el buffering en receptor no afecta la experiencia del usuario. Sin embargo, el audio en tiempo real impone restricciones mucho más estrictas:

- **Latencia**: el tiempo entre que el orador habla y el oyente escucha debe mantenerse por debajo de los 150 ms para una conversación natural, y por debajo de los 250 ms para una experiencia aceptable en modo unidireccional (disertación).
- **Jitter**: la variación en el tiempo de llegada de los paquetes debe ser absorbida por un jitter buffer, pero buffers grandes incrementan la latencia. Existe un compromiso inevitable entre ambos.
- **Pérdida de paquetes**: tasas superiores al 2-3% afectan la inteligibilidad del habla, especialmente cuando las pérdidas son consecutivas (ráfagas).
- **Contención del medio WiFi**: al ser un medio compartido, el aumento en el número de estaciones activas incrementa la probabilidad de colisiones y el tiempo de acceso al canal.

Para mitigar estos problemas, el estándar IEEE 802.11e introdujo Wi-Fi Multimedia (WMM), un mecanismo de QoS que define cuatro categorías de acceso (AC) con prioridades diferenciadas. La categoría AC_VO (Voice) está diseñada para tráfico de voz con requisitos estrictos de latencia, y se activa mediante el marcado DSCP (Differentiated Services Code Point) de los paquetes en la capa de red.

El presente trabajo aborda el diseño, implementación y evaluación de un sistema de distribución de audio en tiempo real que aprovecha estos mecanismos de QoS, combinando tecnologías modernas como WebRTC, el SFU mediasoup y Docker, para determinar si es posible lograr una calidad de servicio aceptable en un entorno WiFi controlado.

## 1.4. Estructura del Informe

El informe se organiza de la siguiente manera: la Sección 2 presenta los objetivos del proyecto. La Sección 3 describe la institución donde se desarrolló la práctica. La Sección 4 desarrolla el marco teórico y las tecnologías empleadas. La Sección 5 detalla el diseño e implementación del sistema. La Sección 6 presenta la metodología de pruebas y los resultados obtenidos. La Sección 7 analiza los resultados. Finalmente, la Sección 8 expone las conclusiones y trabajos futuros.
