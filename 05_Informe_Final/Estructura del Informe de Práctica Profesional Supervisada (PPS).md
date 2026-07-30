**Alumno:** Pablo Cardozo

**Título:** Evaluación de la capacidad y calidad de servicio (QoS) de un sistema de distribución de audio en tiempo real sobre redes inalámbricas Wi-fi

**Proyecto:** NearVocie

**Institución:** GIDAT - UNRC

---

## 1. Portada

* Logo UNRC / Facultad de Ingeniería.

* Título completo del proyecto: "Evaluación de la capacidad y calidad de servicio (QoS) de un sistema de distribución de audio en tiempo real sobre redes inalámbricas Wi-fi".

* Datos del alumno y DNI.
* Datos de los tutores (Ivana Cruz y Fernando Corteggiano).
* Fecha de presentación.
* Institución (GIDAT)
* Periodo.

## 2. Resumen (Se redacta al final)

* Breve descripción del problema (distribución de audio para personas con disminución auditiva), la solución implementada (Uso de **mediasoup** como SFU (Selective Forwarding Unit) y **WebRTC** para audio de ultra baja latencia + Docker + Priorización mediante **DSCP EF (46)** y **WMM (IEEE 802.11e)** en redes Wi-Fi) y los resultados principales de la evaluación de QoS.

## 3. Índice de Contenidos

## 4. Introducción

* Contexto del proyecto: Importancia de la transmisión de audio en tiempo real.
* Justificación social: El uso de la tecnología para ayudar a poblaciones con disminución auditiva.
* Problemática técnica: Desafíos de latencia y jitter en redes 802.11.

## 5. Objetivos  (Extraídos del Plan de Trabajo)

* Objetivo General.
* Objetivos Específicos.

## 6. Descripción de la Institución

* Descripción del GIDAT (Grupo de Investigación y Desarrollo Aplicado a las Telecomunicaciones).
* Líneas de investigación relacionadas con el proyecto (Redes, Multimedia, IIoT).

## 7. Desarrollo de las Tareas Realizadas (Dividido según las etapas del plan)

### 7.1. Etapa A1: Marco Teórico y Tecnologías

* Conceptos de Audio en Tiempo Real.
* **WebRTC:** Protocolos de transporte (RTP/UDP) y señalización (Socket.IO).
* **Arquitecturas WebRTC:** P2P vs MCU vs **SFU** (por qué se eligió SFU).
* **Estándar IEEE 802.11** y **Calidad de Servicio (QoS).**
* Wi-Fi Multimedia (WMM) y sus categorías de acceso.
* **Calidad de Servicio:** Diferenciación de servicios (DiffServ) y colas de acceso Wi-Fi (AC_VO).
* Tecnología de Contenedores (Docker) aplicada a servicios de red. Ventajas de la contenerización y el uso de `network_mode: host`

### 7.2. Etapa A2: Diseño e Implementación del Sistema

   * Arquitectura Cliente-Servidor propuesta.
   * Configuración del entorno Docker (Imágenes, contenedores para el servidor de audio).
   * Configuración de la red inalámbrica y parámetros de QoS/WMM en los equipos.
   * Descripción de la aplicación móvil utilizada como cliente.

### 7.3. Etapa A3: Mediciones y Evaluación (El "corazón" del informe)

* Metodología de las pruebas. Descripción y justificación de escenarios de pruebas.
* Herramientas de medición utilizadas (ej. iPerf, Wireshark, etc.).
* Resultados obtenidos: Presentación de métricas de Latencia, Jitter, Pérdida de paquetes y Ancho de Banda.
* Optimización: Ajustes realizados tras las primeras pruebas.

## 8. Análisis de Resultados

* Comparación de los resultados con los requisitos de un sistema de audio funcional.
* Discusión sobre cómo el uso de WMM y Docker afectó (positiva o negativamente) al sistema.
* Interpretación de las curvas de latencia.
* Comparación del rendimiento del sistema con QoS activado vs desactivado.
* Evaluación de la escalabilidad (número máximo de oyentes estables).

## 9. Conclusiones

* Eficacia de la arquitectura SFU para distribución de audio.
* Cumplimiento de objetivos.
* Aporte personal y profesional de la práctica.
* Impacto de la solución propuesta.

## 10. Bibliografía y Referencias

## 11. Anexos

* Glosario de términos.
* Capturas de configuración de Docker o scripts utilizados.
* Hojas de datos de los equipos (si aplica).
