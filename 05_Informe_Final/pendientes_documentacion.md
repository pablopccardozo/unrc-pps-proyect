# Pendientes de Documentación — Informe Final PPS

> Documento de trabajo para registrar hallazgos, limitaciones, y decisiones técnicas
> que deben reflejarse en el informe final.

---

## 1. Dependencia del Navegador para DSCP en Uplink

**Hallazgo:** El marcado DSCP en el uplink (orador → servidor) depende del navegador
que use el orador. El servidor solo marca DSCP en el downlink (servidor → oyente)
via iptables OUTPUT.

**Cómo funciona actualmente:**
- `transport-service.js` setea `priority: 'high'` y `networkPriority: 'high'` en
  los encodings del Producer WebRTC (líneas 93-98)
- En Chrome/Chromium, esto se traduce a DSCP EF (0xB8) en los paquetes RTP salientes
- Firefox y Safari **no** implementan esta traducción
- El servidor NO marca DSCP en INPUT porque el tráfico uplink llega por Ethernet
  desde el AP (medio no compartido, sin contención)

**Impacto:**
- Chrome/Edge/Brave → DSCP EF en uplink → AP prioriza → mejor calidad bajo carga
- Firefox → sin DSCP en uplink → compite con tráfico best-effort en el WiFi
- Safari → probablemente igual que Firefox

**Dónde documentarlo en el informe:**
- Sección 7.3 (Etapa A3 — Mediciones y Evaluación): como escenario de prueba
- Sección 8 (Análisis de Resultados): como factor que afecta la interpretación
- Sección 9 (Conclusiones): como limitación y recomendación

**Referencia cruzada:** Ver Escenario 5 (pruebas) y hallazgo sobre iptables.

---

## 2. Asimetría del Marcado DSCP (Uplink vs Downlink)

**Hallazgo:** Por la topología de red (servidor por Ethernet, clientes por WiFi),
el marcado DSCP tiene un comportamiento asimétrico:
- **Downlink** (servidor → oyentes): marcado por iptables OUTPUT (DSCP EF 46)
- **Uplink** (orador → servidor): depende del navegador del orador

**Implicancia:** En un escenario con Firefox como orador y Chrome como oyente, la
calidad del audio será peor para el orador Firefox cuando la red esté saturada,
pero ese mismo orador Firefox se escuchará bien en los oyentes Chrome (porque el
downlink está marcado por el servidor).

**Dónde documentarlo:**
- Sección 7.2 (Diseño e Implementación): justificar por qué no se marca INPUT
- Sección 8 (Análisis de Resultados): explicar resultados asimétricos si ocurren

---

## 3. Límite de Conexiones Simuláneas (Escalabilidad)

**Hallazgo:** El sistema usa `network_mode: host` en Docker y el rango de puertos
RTP es fijo (2000-2050 = 50 puertos). Considerando que RTP y RTCP comparten
puerto (`enableRtcpMux: true`), cada transporte WebRTC consume 1 puerto UDP.
Con 50 puertos disponibles:
- 1 orador + 49 oyentes → OK
- 3 oradores + 47 oyentes → OK
- Límite teórico: ~50 participantes totales si cada uno necesita un transporte

**NOTA:** En la práctica el límite puede ser menor por la capacidad del AP WiFi.

**Dónde documentarlo:**
- Sección 7.2 (Implementación): parámetros de configuración
- Sección 8 (Análisis de Resultados): discusión sobre escalabilidad

---

## 4. `maxIncomingBitrate` en mediasoup-config

**Decisión:** Se ajustó `maxIncomingBitrate` de 150 kbps a **80 kbps** por
transporte para que funcione como un safety net más ajustado.

**Cálculo:**
- Opus max bitrate: 32 kbps
- Overhead FEC (~50%): 48 kbps
- Margen de seguridad (~33%): ~64 kbps → 80 kbps

**Dónde documentarlo:**
- Sección 7.2 (Implementación): configuración de mediasoup

### `initialAvailableOutgoingBitrate` (1 Mbps)

**Decisión:** Se mantiene en 1 Mbps. Es un valor inicial para el control de
congestión (BWE). El Opus encoder limita su salida a 24-32 kbps
independientemente de este valor, así que no tiene impacto real en audio.

**Dónde documentarlo:**
- Mencionar en Sección 7.2 como nota al pie (no crítico)

---

## 5. Validación de Nombres de Orador

**Hallazgo:** No hay sanitización ni límite de longitud en el nombre del orador
(`register-speaker`). Aunque el frontend usa `escapeHtml()` en el panel del
oyente, el nombre se almacena sin validación en el servidor.

**Riesgo:** Bajo para el entorno de pruebas controlado. En producción, un nombre
malicioso o muy largo podría afectar la UI del monitor/oyentes.

**Dónde documentarlo:**
- Sección 13 (Consideraciones de Seguridad): mencionar como mejora futura
- O en Anexos como detalle de implementación

---

## 6. Screen Wake Lock API

**Hallazgo:** Se usa `navigator.wakeLock.request('screen')` para evitar que la
pantalla se apague durante transmisión/escucha. No todos los navegadores lo
soportan (Safari iOS no, Firefox desktop sí). El código maneja el fallback
silenciosamente con un catch.

**Dónde documentarlo:**
- Sección 7.2 (Implementación): funcionalidades del frontend
- Mencionar como limitación menor

---

## 7. Certificados SSL Autofirmados

**Hallazgo:** Se generan certificados autofirmados con `generate-ssl.sh` que
incluyen SAN para `auditorio.local` y la IP actual. Los navegadores modernos
muestran advertencia de seguridad que el usuario debe aceptar.

**Dónde documentarlo:**
- Sección 7.2 (Implementación): configuración SSL
- No es un problema para el ámbito de la práctica (red local controlada)

---

## 8. Instalación y Primer Uso del Sistema

**Hallazgo:** El script `install-server.sh` automatiza toda la instalación
incluyendo Docker, Avahi, certificados SSL, y servicios systemd. El sistema es
plug-and-play.

**Pendiente:** Verificar que `install-server.sh` funcione correctamente en una
instalación limpia de Ubuntu Server 22.04+.

**Dónde documentarlo:**
- Sección 7.2 (Implementación): proceso de instalación
- Anexos: incluir diagrama de flujo de instalación

---

###### Tags: `#pendiente-documentacion` `#hallazgo-tecnico` `#limitacion` `#decision`
