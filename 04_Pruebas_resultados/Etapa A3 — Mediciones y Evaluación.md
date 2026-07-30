
# Etapa A3 — Mediciones y Evaluación

## WMM Audio Relay - Práctica Profesional

**Autor:** Pablo Cardozo  
**Versión:** 2.0  
**Fecha:** Julio 2026

---

## Estructura de Archivos

```
04_Pruebas_resultados/
│
├── PROTOCOLO_DETALLADO.md              # Protocolo completo paso a paso (fuente principal)
├── Etapa A3 — Mediciones y Evaluación.md  # Este archivo — resumen ejecutivo
├── Escenario_1.drawio                  # Diagrama topológico
│
├── Capturas_wireshark/                 # Capturas de red (.pcapng / .txt)
│   ├── Escenario_1_baseline/           # Baseline — red limpia
│   ├── Escenario_2_multi_speaker/      # Múltiples oradores simultáneos
│   ├── Escenario_3_red_saturada_wmm/   # Red saturada CON WMM
│   ├── Escenario_4_red_saturada_sin_wmm/   # Red saturada SIN WMM
│   └── Escenario_5_comparacion_navegador/  # DSCP Chrome vs Firefox
│
└── (los datos de mediciones, scripts de análisis, reportes
     y logs se agregarán aquí a medida que se ejecuten las pruebas)
```

> ⚠️ **Nota:** Este directorio es dinámico. A medida que se ejecuten las pruebas se
> agregarán subcarpetas para `datos_mediciones/`, `scripts_analisis/`, `reportes/`
> y `logs_sistema/` según sea necesario. El **PROTOCOLO_DETALLADO.md** es la guía
> principal de ejecución; este archivo es un resumen de navegación rápida.

---

## Escenarios de Prueba

### Escenario 1 — Baseline (Red Limpia)

**Descripción:** Red WiFi sin carga adicional. 1 orador, 2–3 oyentes.  
**Objetivo:** Valores de referencia con WMM activo en condiciones ideales.  
**Banda WiFi:** La seleccionada al inicio (2.4 GHz o 5 GHz).  
**Duración:** 2–3 minutos por prueba (mínimo 3 repeticiones).

### Escenario 2 — Múltiples Oradores Simultáneos

**Descripción:** 2–3 oradores transmitiendo en paralelo, 3–5 oyentes totales.  
**Objetivo:** Evaluar escalabilidad del SFU y throughput agregado.  
**Banda WiFi:** La seleccionada al inicio (2.4 GHz o 5 GHz).  
**Duración:** 3–5 minutos.

### Escenario 3 — Red Saturada con WMM

**Descripción:** Escenario 1 + tráfico competidor (iPerf3, descargas). WMM activo.  
**Objetivo:** Medir beneficio de QoS en red congestionada.  
**Carga WiFi objetivo:** 70–90% de utilización del canal.  
**Banda WiFi:** La seleccionada al inicio (2.4 GHz o 5 GHz).  
**Duración:** 3–5 minutos.

### Escenario 4 — Red Saturada SIN WMM (Grupo de Control)

**Descripción:** Idéntico a Escenario 3, pero con reglas iptables DSCP desactivadas.  
**Objetivo:** Grupo de control para comparación estadística.  
**Banda WiFi:** La seleccionada al inicio (2.4 GHz o 5 GHz) — IDÉNTICA a Escenario 3.  
**Duración:** 3–5 minutos.

### Escenario 5 — Comparación de Marcado DSCP por Navegador

**Descripción:** Mismas condiciones de red saturada que Escenario 3, pero
comparando oradores en Chrome/Chromium vs Firefox.

**Objetivo:** Demostrar que el marcado DSCP en el uplink depende del navegador.
Chrome asigna DSCP EF (0xB8) al audio WebRTC con `priority: 'high'`, Firefox no.
Esto permite cuantificar el impacto real del marcado DSCP origen en la calidad
de uplink bajo congestión.
**Banda WiFi:** La seleccionada al inicio (2.4 GHz o 5 GHz) — IDÉNTICA a Escenarios 3 y 4.

**Procedimiento:**

| Paso | Orador | Captura Wireshark | Condición de red |
|------|--------|-------------------|------------------|
| A | Chrome (EF esperado) | `ip.dsfield.dscp == 46` | Saturada (iPerf) |
| B | Firefox (sin DSCP) | `ip.dsfield.dscp == 0` | Saturada (iPerf) |
| C | Chrome (control) | `ip.dsfield.dscp == 46` | Sin carga |
| D | Firefox (control) | `ip.dsfield.dscp == 0` | Sin carga |

**Métricas:** Latencia, jitter, packet loss del orador (uplink). Comparar A vs B.

**Duración:** 2-3 minutos por prueba, 3 repeticiones por navegador.

---

## Métricas a Recolectar

|Métrica|Fuente Principal|Fuente Secundaria|Target (Voz en Tiempo Real)|
|---|---|---|---|
|**End-to-End Packet Delay**|`/monitor.html` (LatencyService)|Wireshark RTP Streams|< 150 ms|
|**Jitter**|Wireshark RTP Analysis|WebRTC Stats API|< 30 ms|
|**Packet Loss Rate**|Wireshark RTP Streams|WebRTC Stats (`packetsLost`)|< 5%|
|**Throughput Audio**|`/api/stats` del servidor|Wireshark (bytes/s)|~24 kbps por stream|
|**Tamaño de Cola Promedio**|`tc -s qdisc` en servidor|`ss -i` sockets UDP|N/A (registrar)|
|**Utilización del Canal WiFi**|`iw dev` / panel AP|N/A|70–90% (Esc. 3 y 4)|

---

## Herramientas Requeridas

### Software

- **Wireshark** ≥ 3.6 (con soporte RTP analysis)
- **iPerf3** (generador de tráfico)
- **tshark** (análisis CLI de capturas)
- **Python 3.8+** con pandas, matplotlib, openpyxl
- **tc** (traffic control, incluido en iproute2)
- **ss** (socket statistics, parte de iproute2)

### Hardware Mínimo

- 1 servidor con stack WMM Audio Relay
- 2–3 dispositivos como oradores
- 2–5 dispositivos como oyentes
- 1–2 dispositivos generadores de carga (iPerf3 client)
- 1 dispositivo capturando tráfico (puede ser el servidor)

---

## Protocolo Rápido de Ejecución

1. **Preparación:**
    
    - Levantar servidor con `docker-compose up -d`
    - Aplicar QoS: `sudo ./wmm-qos-setup.sh`
    - Verificar con: `sudo iptables -t mangle -L -v -n`
2. **Captura base (Escenario 1):**
    
    - Iniciar Wireshark: filtro `udp.port >= 2000 && udp.port <= 2050`
    - Conectar 1 orador + 2 oyentes
    - Transmitir 2 minutos
    - Guardar captura en `capturas_wireshark/escenario_1_baseline/`
3. **Red saturada con QoS (Escenario 3):**
    
    - Mantener sesión de audio activa
    - Lanzar iPerf3: `iperf3 -c <servidor> -u -b 20M -P 3 -t 180`
    - Capturar 3 minutos
    - Guardar captura
4. **Red saturada SIN QoS (Escenario 4):**
    
    - Limpiar reglas: `sudo iptables -t mangle -F`
    - Repetir paso 3 exactamente
    - Guardar captura
5. **Análisis:**
    
    - Exportar estadísticas RTP desde Wireshark
    - Ejecutar scripts de análisis
    - Completar plantillas Excel

---

## Filtros Útiles de Wireshark

### Captura

```
udp.port >= 2000 && udp.port <= 2050
```

### Display (RTP específico)

```
rtp
```

### Análisis de un stream específico

1. _Telephony → RTP → RTP Streams_
2. Seleccionar stream → _Analyze_
3. Ver gráficos de jitter, delta y packet loss

### Exportar estadísticas

_Statistics → RTP → Stream Analysis → Save As CSV_

---

## Comandos de Utilidad

### Ver reglas DSCP activas

```bash
sudo iptables -t mangle -L -v -n | grep -E "DSCP|2000:2050"
```

### Monitorear colas de red en tiempo real

```bash
watch -n 1 "tc -s qdisc show dev wlan0"
```

### Ver sockets UDP del servidor

```bash
ss -unp | grep -E "200[0-9]|20[1-4][0-9]|2050"
```

### Extraer estadísticas básicas de captura (tshark)

```bash
tshark -r captura.pcapng -q -z rtp,streams
```

### Verificar utilización WiFi (en servidor)

```bash
iw dev wlan0 survey dump | grep -A 5 "in use"
```

### Verificar marcado DSCP en captura (Escenario 5)

```bash
# Ver paquetes con DSCP EF (46) — Chrome
tshark -r captura.pcapng -Y "ip.dsfield.dscp == 46" -T fields -e ip.src -e ip.dst -e udp.port

# Ver paquetes SIN DSCP (0) — Firefox
tshark -r captura.pcapng -Y "ip.dsfield.dscp == 0" -T fields -e ip.src -e ip.dst -e udp.port

# Estadísticas comparativas
tshark -r captura_chrome.pcapng -q -z rtp,streams
tshark -r captura_firefox.pcapng -q -z rtp,streams
```

---

## Notas Importantes

- **Repetir cada escenario mínimo 3 veces** para validez estadística.
- **Sincronizar timestamps** entre capturas Wireshark y logs del servidor.
- **Documentar condiciones ambientales:** número de dispositivos en la red, distancia al AP, etc.
- **No cambiar configuración del servidor** entre Escenario 3 y 4 (solo las reglas iptables).
- **Guardar TODAS las capturas** incluso si una prueba "sale mal" (útil para análisis de fallas).

---

## Contacto

Dudas o issues con el protocolo: contactar a Pablo Cardozo.

---

**Última actualización:** Julio 2026