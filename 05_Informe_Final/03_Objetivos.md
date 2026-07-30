# 3. Objetivos

## 3.1. Objetivo General

Diseñar, implementar y evaluar un sistema de distribución de audio en tiempo real sobre redes inalámbricas Wi-Fi, utilizando un servidor SFU basado en mediasoup y mecanismos de calidad de servicio (QoS) con marcado DSCP y WMM (IEEE 802.11e), con el fin de determinar si es posible mantener una latencia, jitter y tasa de pérdida de paquetes dentro de rangos aceptables para la inteligibilidad del habla en un entorno de red local controlado.

## 3.2. Objetivos Específicos

1. **Diseñar e implementar un servidor SFU de audio** utilizando mediasoup como núcleo de enrutamiento WebRTC, con capacidad para manejar múltiples oradores y oyentes simultáneamente en una misma sala virtual.

2. **Aplicar mecanismos de QoS a nivel de red** mediante el marcado DSCP EF (Expedited Forwarding, valor 46) sobre el tráfico RTP/UDP del servidor, utilizando reglas iptables, y evaluar el impacto del WMM en la priorización del tráfico de audio en el access point Wi-Fi.

3. **Implementar un sistema de monitoreo en tiempo real** que permita visualizar métricas de calidad del enlace (latencia, jitter, pérdida de paquetes, bitrate) tanto desde el lado del servidor como desde los clientes oyentes.

4. **Diseñar y ejecutar una batería de escenarios de prueba** que permitan evaluar el comportamiento del sistema bajo distintas condiciones de carga de red, cantidad de participantes y configuración de QoS (activado vs. desactivado).

5. **Medir y analizar las métricas de calidad de servicio** obtenidas en cada escenario, comparando los resultados con y sin priorización WMM, y contrastándolos con los umbrales definidos para audio en tiempo real (latencia &lt; 150 ms, jitter &lt; 30 ms, pérdida &lt; 2%).

6. **Evaluar la escalabilidad del sistema** determinando el número máximo de oyentes que pueden recibir audio de forma estable dentro de los límites de recursos del servidor y la capacidad del access point Wi-Fi.

7. **Documentar las limitaciones y hallazgos técnicos** del sistema propuesto, incluyendo la asimetría del marcado DSCP entre uplink y downlink, la dependencia del navegador para la priorización en el cliente, y las restricciones de puertos RTP en el rango configurado.
