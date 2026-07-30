
**Escenario 1 — Baseline (red limpia, sin carga)** Red WiFi sin tráfico competidor. Un solo orador, 2–3 oyentes. Establece los valores de referencia para latencia, jitter y packet loss cuando WMM/QoS está funcionando en condiciones ideales. Todos los valores deberían estar en zona "Excelente/Bueno" (< 150 ms).

**Escenario 2 — Múltiples oradores simultáneos** 2–3 oradores transmitiendo en paralelo, con 3–5 oyentes cada uno. Evalúa el comportamiento del SFU bajo carga real y cómo escala el sistema. Útil para medir throughput agregado y si la mezcla de streams en Web Audio API introduce delay adicional.

**Escenario 3 — Red saturada (tu idea con iPerf)** Generás tráfico competidor con iPerf3 o descargas simultáneas desde varios dispositivos para llevar el canal WiFi a ~70–90% de utilización. Medís los mismos parámetros que en Escenario 1. Acá se ve el **impacto real de WMM**: comparás con y sin el script `wmm-qos-setup.sh` activo. Este es el escenario más importante para la práctica.

**Escenario 4 — Red saturada SIN QoS (grupo de control)** Idéntico al Escenario 3, pero con las reglas iptables de DSCP desactivadas. Sirve como contrafactual para demostrar el beneficio de WMM. Sin la priorización, los paquetes de audio compiten en igualdad con el tráfico bulk y deberías ver degradación medible.

---

**Escenario 5 — Comparación de marcado DSCP según navegador del orador**
*Demostrar que el marcado DSCP en el uplink depende del navegador.*

**Motivación:** El servidor solo marca DSCP en el downlink (iptables OUTPUT).
El uplink depende de que el navegador del orador traduzca `priority: 'high'`
a DSCP EF en los paquetes RTP salientes. Chrome lo hace, Firefox no.
Este escenario demuestra el impacto medible.

**Setup:**
- Red saturada con iPerf3 al 70-90% (mismas condiciones que Escenario 3)
- WMM/QoS activo en el servidor (iptables)
- 1 orador por vez, 2 oyentes fijos (usando Chrome para aislar la variable)

**Procedimiento:**

| Paso | Orador | Qué se mide |
|------|--------|-------------|
| A | Chrome/Chromium | Latencia, jitter, packet loss del orador |
| B | Firefox | Latencia, jitter, packet loss del orador |
| C | Chrome (control) | Captura Wireshark: verificar DSCP EF (0xB8) en IP headers |
| D | Firefox (control) | Captura Wireshark: verificar DSCP 0 (Best Effort) en IP headers |

**Métrica clave:** Diferencia de packet loss y latencia entre Chrome y Firefox
bajo la misma carga de red. Si la diferencia es significativa, confirma que
el marcado DSCP del navegador en uplink tiene impacto real.

**Duración:** 2-3 minutos por prueba, 3 repeticiones por navegador.
**Filtro Wireshark para verificar DSCP:** `ip.dsfield.dscp == 46` (EF)
**Filtro para best-effort:** `ip.dsfield.dscp == 0`