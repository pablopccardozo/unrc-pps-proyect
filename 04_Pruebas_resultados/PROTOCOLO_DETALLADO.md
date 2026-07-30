# Protocolo Detallado de Pruebas — WMM Audio Server

> **Proyecto:** NearVoice — Evaluación de QoS en distribución de audio WiFi  
> **Autor:** Pablo Cardozo  
> **Versión:** 2.0  
> **Última actualización:** Julio 2026

---

## Índice

1. [Topología de Red](#1-topología-de-red)
2. [Requerimientos de Hardware y Software](#2-requerimientos-de-hardware-y-software)
3. [Checklist Pre-vuelo](#3-checklist-pre-vuelo)
4. [Escenario 1 — Baseline (Red Limpia)](#4-escenario-1--baseline-red-limpia)
5. [Escenario 2 — Múltiples Oradores Simultáneos](#5-escenario-2--múltiples-oradores-simultáneos)
6. [Escenario 3 — Red Saturada con WMM](#6-escenario-3--red-saturada-con-wmm)
7. [Escenario 4 — Red Saturada SIN WMM](#7-escenario-4--red-saturada-sin-wmm)
8. [Escenario 5 — Comparación DSCP por Navegador](#8-escenario-5--comparación-dscp-por-navegador)
9. [Anexo A — Planilla de Registro de Métricas](#anexo-a--planilla-de-registro-de-métricas)
10. [Anexo B — Resolución de Problemas Comunes](#anexo-b--resolución-de-problemas-comunes)

---

## 1. Topología de Red

### Diagrama de Conexión

```
                         ┌──────────────────────┐
                         │    SERVIDOR WMM       │
                         │  (Node.js + mediasoup)│
                         │  + iPerf3 server      │
                         │  + tshark captura     │
                         │  + wmm-qos-setup.sh   │
                         │  IP: 192.168.x.x      │
                         └──────────┬───────────┘
                                    │ Cable Ethernet
                                    │ (100/1000 Mbps)
                         ┌──────────┴───────────┐
                         │   ACCESS POINT WiFi   │
                         │  (WMM habilitado)     │
                         │  Canal: [elegir]      │
                         │  Banda: 2.4GHz/5GHz   │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
             ┌──────┴──────┐  ┌────┴────┐   ┌──────┴──────┐
             │ ORADOR(es)  │  │ OYENTE  │   │ CARGA iPerf │
             │ Chrome/Fx   │  │ Chrome  │   │ iPerf3 cli  │
             │ WiFi        │  │ WiFi    │   │ WiFi        │
             └─────────────┘  └─────────┘   └─────────────┘
```

### Flujo de Tráfico

| Dirección | Tipo | Priorización |
|-----------|------|--------------|
| Orador → Servidor | Audio RTP/UDP (WebRTC) | Cliente marca DSCP EF según navegador |
| Servidor → Oyente | Audio RTP/UDP (WebRTC) | Servidor marca DSCP EF (iptables OUTPUT) |
| Carga iPerf → Servidor | Tráfico UDP bulk | Sin marca (Best Effort) |
| Servidor → Carga iPerf | Tráfico UDP bulk | Sin marca (Best Effort) |

---

## 2. Requerimientos de Hardware y Software

### 2.1 Servidor WMM

| Recurso | Especificación |
|---------|---------------|
| SO | Ubuntu Server 22.04+ |
| RAM | ≥ 4 GB (512 MB para el contenedor) |
| Almacenamiento | ≥ 10 GB libres |
| Red | 1 puerto Ethernet (conectado al AP) |

**Software necesario:**
```
- Docker + Docker Compose (instalados por install-server.sh)
- iPerf3           → sudo apt install iperf3
- tshark           → sudo apt install tshark
- Wireshark (opcional, para análisis post-captura)
- tc + ss          → incluidos en iproute2 (vienen con Ubuntu)
```

### 2.2 Dispositivo Orador (× 2-3)

| Recurso | Especificación |
|---------|---------------|
| Tipo | Notebook / Smartphone / Tablet |
| SO | Cualquiera con navegador moderno |
| Micrófono | Integrado o externo |
| Conexión | WiFi (misma red que el AP) |

**Software necesario:**
```
- Chrome / Chromium  (versión ≥ 100)
- Firefox            (solo para Escenario 5)
- Navegación a: https://auditorio.local/  o  https://<IP_SERVIDOR>/
```

⚠️ **Importante:** Los navegadores requieren **HTTPS** para acceder al micrófono.
El certificado es autofirmado → aceptar advertencia de seguridad.

### 2.3 Dispositivo Oyente (× 2-5)

| Recurso | Especificación |
|---------|---------------|
| Tipo | Notebook / Smartphone / Tablet |
| Conexión | WiFi (misma red que el AP) |

**Software necesario:**
```
- Chrome / Chromium
- Navegación a: https://auditorio.local/oyente.html
```

### 2.4 Dispositivo de Carga (× 1-2)

| Recurso | Especificación |
|---------|---------------|
| Tipo | Notebook preferentemente |
| Conexión | WiFi |

**Software necesario:**
```
- iPerf3 → sudo apt install iperf3  (Linux)
         → brew install iperf3       (macOS)
         → Descargar de iperf.fr     (Windows)
```

---

## 3. Checklist Pre-vuelo

Antes de arrancar las pruebas, verificar esto en orden:

### 3.1 En el Servidor

```bash
# 1. Verificar que el servidor está corriendo
curl -k https://localhost:3000/api/health
# → Debe responder: {"status":"ok", ...}

# 2. Verificar que las reglas DSCP están activas
sudo iptables -t mangle -L WMM_QOS -n -v
# → Debe mostrar reglas UDP con DSCP igual 0x2e
# → Si está vacío: sudo bash wmm-qos-setup.sh

# 3. Verificar conectividad WiFi de los clientes
# Desde un cliente, hacer ping al servidor:
ping <IP_SERVIDOR>
# → Debe responder

# 4. Verificar iPerf3 server
iperf3 -s &
# → Debe mostrar: "Server listening on 5201"

# 5. Verificar que Wireshark/tshark puede capturar
sudo tshark -D
# → Lista interfaces disponibles (ej. eth0, wlan0)
# → Identificar cuál es la interfaz Ethernet (donde está el tráfico)

# 6. Crear directorio para guardar capturas
mkdir -p ~/capturas_pruebas/{escenario_1,escenario_2,escenario_3,escenario_4,escenario_5}
```

### 3.2 En los Clientes

- [ ] Conectados al WiFi del AP
- [ ] Chrome instalado (todos)
- [ ] Firefox instalado (para Escenario 5)
- [ ] Pueden cargar `https://auditorio.local/` (o `https://<IP_SERVIDOR>/`)
- [ ] Aceptaron la advertencia del certificado SSL autofirmado
- [ ] Volumen del dispositivo al 80% (evitar distorsión)

### 3.3 En el Dispositivo de Carga

- [ ] iPerf3 instalado
- [ ] Conectado al WiFi
- [ ] Puede hacer ping al servidor

---

## 4. Escenario 1 — Baseline (Red Limpia)

### Objetivo

Establecer los valores de **referencia** de latencia, jitter y packet loss
cuando la red WiFi **no tiene tráfico competidor** y WMM está activo.

### Condición de Red

- **Carga WiFi:** 0% adicional (solo el audio de la prueba)
- **WMM:** ✅ Activo (`wmm-qos-setup.sh` aplicado)
- **Oradores:** 1
- **Oyentes:** 2-3
- **Duración:** 2 minutos por repetición
- **Repeticiones:** 5 (para tener significancia estadística)

### Dispositivos Necesarios

| Rol | Cantidad | Browser |
|-----|----------|---------|
| Orador | 1 | Chrome |
| Oyente | 2-3 | Chrome |
| Captura | 1 (el servidor) | tshark |

### Paso a Paso

```
PASO 1 — Preparar captura en el servidor
┌─────────────────────────────────────────────────────────────┐
│ IMPORTANTE: Identificá primero la interfaz de red correcta  │
│                                                             │
│   ip a  → buscá la interfaz Ethernet (ej. eth0, eno1, ens) │
│                                                             │
│ La interfaz correcta es la que tiene la IP del servidor     │
│ y está conectada al AP por cable.                           │
└─────────────────────────────────────────────────────────────┘

Comando:
  sudo tshark -i <INTERFAZ_ETH> -f "udp portrange 2000-2050" \
    -w ~/capturas_pruebas/escenario_1/baseline_rep1.pcapng &

  # ── Explicación ─────────────────────────────────────────────
  # -i <INTERFAZ> : interfaz de red a capturar
  # -f "..."      : filtro de captura (solo tráfico RTP)
  # -w archivo    : guardar a archivo
  # &             : ejecutar en segundo plano
  # ────────────────────────────────────────────────────────────

Alternativa usando Wireshark GUI (si preferís interfaz gráfica):
  # En el servidor con escritorio, o por VNC:
  # Abrí Wireshark → seleccioná interfaz Ethernet
  # Filtro de captura: udp portrange 2000-2050
  # Iniciar captura
```

```
PASO 2 — Activar WMM (si no está)
  sudo bash /home/<usuario>/wmm_proyect/wmm-qos-setup.sh

  Verificar:
  sudo iptables -t mangle -L WMM_QOS -n -v
  # → Deberías ver algo como:
  #   pkts bytes target     prot opt in out source   destination
  #      0     0 DSCP       udp  --  *  *  0.0.0.0/0 0.0.0.0/0  udp spt:2000:2050 DSCP set 0x2e
  #      0     0 DSCP       udp  --  *  *  0.0.0.0/0 0.0.0.0/0  udp dpt:2000:2050 DSCP set 0x2e
```

```
PASO 3 — Conectar oyentes
  En cada dispositivo oyente:
  1. Abrir Chrome → https://auditorio.local/oyente.html
     (o https://<IP_SERVIDOR>/oyente.html)
  2. Ingresar nombre: "Oyente_1", "Oyente_2", "Oyente_3"
  3. NO apretar "Conectar al Auditorio" todavía

  En el monitor:
  - Abrir https://auditorio.local/monitor.html
  - Ingresar clave: WMM_SECRET_2026
  - Verificar que el panel muestra "0 oyentes"
```

```
PASO 4 — Conectar y transmitir orador
  1. En el dispositivo orador:
     - Abrir Chrome → https://auditorio.local/login.html
     - Nombre: "Orador_1"
     - Clave: WMM_SECRET_2026
     - Click en "Iniciar Transmisión"
     - Permitir acceso al micrófono
     - Verificar: aparece "🔴 TRANSMITIENDO EN VIVO"

  2. Verificar en el monitor:
     - "Oradores Activos: 1"
     - "Oyentes Conectados: 0" (todavía)
```

```
PASO 5 — Conectar oyentes y empezar a escuchar
  En cada oyente:
  1. Click en "🎧 Conectar al Auditorio"
  2. Verificar: aparece "🔊 ESCUCHANDO AUDITORIO"
  
  En el monitor:
  - "Oyentes Conectados" debe mostrar 2-3
  - Cada oyente debe aparecer listado bajo "Orador_1"
  - Las latencias deben empezar a aparecer (< 100ms)
```

```
PASO 6 — Capturar datos (2 minutos)
  1. Hablar en voz alta, constante, cerca del micrófono
     (Leer un texto, contar números, lo que sea consistente)
  
  2. Cronometrar 2 minutos exactos
  
  3. Mientras se ejecuta, tomar NOTAS MANUALES:
     - Latencia promedio en el monitor (anotar valor cada 30s)
     - Cantidad de oyentes conectados
     - ¿Se escucha bien? (opinión subjetiva: 1-Excelente a 5-Pésimo)
```

```
PASO 7 — Detener y guardar
  1. Detener captura tshark:
     sudo pkill -SIGINT tshark
     # Esperar 2 segundos a que escriba el archivo
  
  2. Verificar que el archivo .pcapng se creó:
     ls -lh ~/capturas_pruebas/escenario_1/
     # Debe mostrar baseline_rep1.pcapng con tamaño > 0

  3. Detener transmisión del orador:
     - Click en "Cerrar Sesión"

  4. Desconectar oyentes:
     - Click en "Salir del Auditorio"

  5. COMPLETAR PLANILLA DE MÉTRICAS
     (Ver Anexo A)
```

```
PASO 8 — Repetir
  Repetir PASOS 1 a 7 cuatro veces más (total 5 repeticiones).
  Nombrar archivos como:
    baseline_rep1.pcapng
    baseline_rep2.pcapng
    ...
    baseline_rep5.pcapng
```

### Qué Medir y Cómo Extraerlo

#### A. Desde Wireshark (análisis post-captura)

```bash
# Análisis RTP básico del archivo capturado
tshark -r ~/capturas_pruebas/escenario_1/baseline_rep1.pcapng -q -z rtp,streams
```

Esto muestra una tabla como:

```
===========================================================
RTP Streams
===========================================================
  192.168.1.100:2000  → 192.168.1.50:40000  [dynamic]  SSRC=0x1234
    Payload: PCMU/8000 (0)
    Packets: 6000    Lost: 2 (0.03%)
    Max Delta: 30ms  Max Jitter: 8ms  Mean Jitter: 3ms
  192.168.1.100:2001  → 192.168.1.51:40001  [dynamic]  SSRC=0x5678
    Packets: 6000    Lost: 0 (0.00%)
    Max Delta: 25ms  Max Jitter: 5ms  Mean Jitter: 2ms
===========================================================
```

**Métricas a registrar de Wireshark:**

| Métrica | Dónde encontrarla |
|---------|------------------|
| Packet Loss Rate (%) | Columna `Lost` → `Lost / Packets * 100` |
| Mean Jitter (ms) | Columna `Mean Jitter` |
| Max Jitter (ms) | Columna `Max Jitter` |
| Cantidad de paquetes | Columna `Packets` |

Para análisis más detallado de un stream específico:

```bash
# Análisis detallado (más métricas)
tshark -r ~/capturas_pruebas/escenario_1/baseline_rep1.pcapng \
  -q -z rtp,streams -z rtp,summary
```

#### B. Desde el Monitor Web (tiempo real)

Durante la ejecución, en el panel de monitoreo:

| Métrica | Dónde verla |
|---------|------------|
| Latencia Promedio (ms) | Tarjeta "Latencia Promedio" |
| Peor Latencia (ms) | Tarjeta "Peor Latencia" |
| Oradores Activos | Tarjeta "Oradores Activos" |
| Oyentes Conectados | Tarjeta "Oyentes Conectados" |

**Anotar cada 30 segundos** los valores en la planilla.

#### C. Desde WebRTC Stats API (oyente)

Cada oyente envía reportes cada 2 segundos al servidor. Se pueden ver
en los logs del servidor:

```bash
docker logs server-rtc 2>&1 | grep "latency-report"
```

#### D. Métricas Subjetivas (MOS Estimado)

| Puntaje | Calidad | Descripción |
|---------|---------|-------------|
| 5 | Excelente | Sin pérdidas, claridad total |
| 4 | Buena | Pérdidas imperceptibles |
| 3 | Aceptable | Pérdidas notables pero comprensible |
| 2 | Pobre | Difícil de entender |
| 1 | Mala | Ininteligible |

### Valores Esperados

| Métrica | Objetivo | Rango Bueno |
|---------|----------|-------------|
| Latencia promedio | < 150 ms | < 100 ms |
| Jitter promedio | < 30 ms | < 15 ms |
| Packet Loss | < 5% | < 1% |
| MOS | ≥ 4.0 | ≥ 4.5 |

---

## 5. Escenario 2 — Múltiples Oradores Simultáneos

### Objetivo

Evaluar cómo se comporta el SFU cuando **2-3 oradores transmiten en paralelo**
a 3-5 oyentes. Medir throughput agregado, latencia acumulada, y si la mezcla
de streams en Web Audio API introduce delay adicional.

### Condición de Red

- **Carga WiFi:** 0% adicional
- **WMM:** ✅ Activo
- **Oradores:** 2-3 (cada uno con Chrome)
- **Oyentes:** 3-5
- **Duración:** 3-5 minutos
- **Repeticiones:** 3

### Dispositivos Necesarios

| Rol | Cantidad | Browser |
|-----|----------|---------|
| Orador | 2-3 | Chrome (distintos dispositivos) |
| Oyente | 3-5 | Chrome |
| Captura | 1 (servidor) | tshark |

### Paso a Paso

```
PASO 1 — Iniciar captura
  sudo tshark -i <INTERFAZ_ETH> -f "udp portrange 2000-2050" \
    -w ~/capturas_pruebas/escenario_2/multispeaker_rep1.pcapng &
```

```
PASO 2 — Conectar oyentes (todos)
  En cada oyente:
  - Abrir Chrome → /oyente.html
  - NO conectar todavía
```

```
PASO 3 — Registrar y transmitir ORADOR_1
  - Login como "Orador_1"
  - Iniciar transmisión
  - Verificar en monitor: 1 orador activo
```

```
PASO 4 — Registrar ORADOR_2 (sin transmitir todavía)
  En un segundo dispositivo:
  - Login como "Orador_2"
  - Todavía NO iniciar transmisión
```

```
PASO 5 — Registrar ORADOR_3 (sin transmitir todavía)
  En un tercer dispositivo:
  - Login como "Orador_3"
  - Todavía NO iniciar transmisión
```

```
PASO 6 — Conectar oyentes
  Todos los oyentes click en "🎧 Conectar al Auditorio"
  
  Verificar en monitor:
  - 3 oradores registrados
  - 1 transmisión activa (Orador_1)
  - 3-5 oyentes
```

```
PASO 7 — Iniciar transmisiones escalonadas
  T=0s    → Orador_1 hablando (ya está)
  T=30s   → Orador_2 inicia transmisión
  T=60s   → Orador_3 inicia transmisión
  T=90s   → Los 3 oradores hablan SIMULTÁNEAMENTE
  T=180s  → Orador_2 detiene transmisión
  T=210s  → Orador_3 detiene transmisión
  T=240s  → Orador_1 detiene transmisión
  
  Mientras hablan:
  - Cada orador habla A UN VOLUMEN CONSTANTE
  - Leer texto diferente cada uno (para distinguir en análisis)
  - Anotar latencia promedio en monitor cada 30s
```

```
PASO 8 — Detener y guardar
  sudo pkill -SIGINT tshark
  ls -lh ~/capturas_pruebas/escenario_2/
  
  COMPLETAR PLANILLA DE MÉTRICAS
```

### Qué Medir y Cómo Extraerlo

**Además de las métricas del Escenario 1**, acá medimos:

| Métrica | Dónde | Cómo |
|---------|-------|------|
| Throughput agregado | Wireshark | Sumar bytes/s de todos los streams RTP |
| Throughput por orador | `/api/stats` | `curl -k https://localhost:3000/api/stats` |
| Latencia por orador | Monitor | Ver si la latencia sube al agregar un nuevo orador |
| Cantidad de consumers por oyente | Monitor | Contar listeners por speaker |
| Delay de mezcla en Web Audio API | Subjetivo | ¿Se escuchan todos los oradores a la vez sin eco? |

```bash
# Para calcular throughput del archivo de captura:
tshark -r ~/capturas_pruebas/escenario_2/multispeaker_rep1.pcapng \
  -Y "rtp" -T fields -e frame.time_relative -e frame.len \
  | awk '{if(NR>1) print $1, $2}' > ~/capturas_pruebas/escenario_2/throughput_data.txt

# Esto genera datos para graficar throughput en el tiempo
```

### Valores Esperados

| Métrica | Esperado |
|---------|----------|
| Latencia con 3 oradores | < 150 ms (similar a Escenario 1) |
| Throughput agregado (3 streams) | ~72-96 kbps (24-32 kbps × 3) |
| Packet loss | < 1% (similar a Escenario 1) |

---

## 6. Escenario 3 — Red Saturada con WMM

**🚩 Este es el escenario más importante de la práctica.**

### Objetivo

Demostrar que **WMM/QoS mitiga el impacto de la congestión** en el audio
en tiempo real. Bajo carga WiFi pesada, los paquetes marcados DSCP EF
deben tener prioridad sobre el tráfico bulk (iPerf).

### Condición de Red

- **Carga WiFi:** 70-90% de utilización del canal (generada con iPerf3)
- **WMM:** ✅ Activo (`wmm-qos-setup.sh` aplicado)
- **Oradores:** 1
- **Oyentes:** 2-3
- **Duración:** 3-5 minutos
- **Repeticiones:** 5

### Dispositivos Necesarios

| Rol | Cantidad | Browser / Software |
|-----|----------|--------------------|
| Orador | 1 | Chrome |
| Oyente | 2-3 | Chrome |
| Carga iPerf | 1-2 | iPerf3 cliente |
| Captura | 1 (servidor) | tshark |

### Paso a Paso

```
PASO 1 — Preparar iPerf3 server en el servidor
  Verificar que iPerf3 server está corriendo:
  
  ps aux | grep iperf3
  # Si no aparece, iniciar:
  iperf3 -s --daemon
  # → Debería mostrar: "Starting Iperf3 server"
```

```
PASO 2 — Iniciar captura en el servidor
  sudo tshark -i <INTERFAZ_ETH> -f "udp portrange 2000-2050" \
    -w ~/capturas_pruebas/escenario_3/saturado_wmm_rep1.pcapng &
```

```
PASO 3 — Verificar WMM activo
  sudo iptables -t mangle -L WMM_QOS -n -v
  # Debe mostrar las reglas DSCP con contadores > 0
  # Si los contadores están en 0, WMM no está haciendo nada -> verificar
```

```
PASO 4 — Conectar oyentes y orador (como en Escenario 1)
  1. Oyentes en /oyente.html, SIN conectar todavía
  2. Orador en /login.html → Iniciar transmisión
  3. Oyentes: click en "🎧 Conectar al Auditorio"
  
  Verificar en monitor:
  - 1 orador activo
  - 2-3 oyentes conectados
  - Latencia en verde (< 100 ms)
```

```
PASO 5 — INICIAR CARGA iPerf (acá se pone interesante)
  En el/los dispositivos de carga (conectados por WiFi al AP):
  
  COMANDO EXACTO A EJECUTAR:
  
  # Carga progresiva: empezar suave y aumentar
  
  T=0s    → iperf3 -c <IP_SERVIDOR> -u -b 10M -t 300 &
  T=30s   → (segundo cliente) iperf3 -c <IP_SERVIDOR> -u -b 15M -t 270 &
  T=60s   → (o mismo cliente, otro hilo) iperf3 -c <IP_SERVIDOR> -u -b 20M -P 2 -t 240 &
  
  # ── Explicación ─────────────────────────────────────────────
  # -c <IP>   : conecta al servidor iPerf3
  # -u        : modo UDP (más realista para WiFi)
  # -b <N>M   : bitrate objetivo en Mbps
  # -P <N>    : flujos paralelos
  # -t <N>    : duración en segundos
  # &         : segundo plano
  # ────────────────────────────────────────────────────────────
  
  LO IMPORTANTE: la carga total debe saturar el canal sin matarlo.
  Si ves que el audio se corta COMPLETAMENTE, reducí un poco.
  Si la latencia no sube nada, aumentá.
  
  MONITOREAR CARGA:
  En el servidor, en otra terminal:
  
  watch -n 2 "tc -s qdisc show dev <INTERFAZ_ETH>"
  # → Muestra tamaño de cola y paquetes encolados
  
  También podés ver la utilización del AP:
  iw dev <INTERFAZ_WIFI> survey dump | grep -A 5 "in use"
  # (solo si el servidor tiene interfaz WiFi para monitorear)
```

```
PASO 6 — Observar y anotar (3-5 minutos)
  Mientras iPerf3 está corriendo:
  
  ANOTAR CADA 30 SEGUNDOS:
  ┌──────────────────────────────────────────────────────────────┐
  │  Tiempo  │  Lat.Prom  │  Lat.Max  │  Packet Loss  │  Jitter │
  ├──────────┼────────────┼───────────┼───────────────┼─────────┤
  │  T=0s    │   45ms     │   62ms    │     0.1%      │   5ms   │
  │  T=30s   │   55ms     │   80ms    │     0.3%      │   8ms   │
  │  T=60s   │   80ms     │  120ms    │     0.8%      │  12ms   │
  │  T=90s   │   95ms     │  150ms    │     1.2%      │  15ms   │
  │  ...     │   ...      │   ...     │     ...       │  ...    │
  └──────────────────────────────────────────────────────────────┘
  
  TAMBIÉN anotar subjetivamente:
  - ¿Se entiende el audio? (MOS 1-5)
  - ¿Hay cortes?
  - ¿Los oyentes reportan algo raro?
```

```
PASO 7 — Detener todo y guardar
  1. Detener tshark:
     sudo pkill -SIGINT tshark
  
  2. Detener iPerf3:
     pkill iperf3  # mata todos los procesos iperf3
     # O individualmente si necesitás: kill <PID>
  
  3. Verificar captura:
     ls -lh ~/capturas_pruebas/escenario_3/
  
  4. Detener orador y oyentes
  
  5. Guardar salida de tc -s qdisc:
     tc -s qdisc show dev <INTERFAZ_ETH> \
       > ~/capturas_pruebas/escenario_3/qdisc_rep1.txt
  
  6. COMPLETAR PLANILLA DE MÉTRICAS
```

### Qué Medir y Cómo Extraerlo

#### Análisis Wireshark (comparativo con Escenario 1)

```bash
# Comparar pérdida de paquetes entre baseline y saturado
echo "=== BASELINE (Escenario 1) ==="
tshark -r ~/capturas_pruebas/escenario_1/baseline_rep1.pcapng -q -z rtp,streams

echo "=== SATURADO CON WMM (Escenario 3) ==="
tshark -r ~/capturas_pruebas/escenario_3/saturado_wmm_rep1.pcapng -q -z rtp,streams
```

#### Colas de Red (Queue Size)

```bash
# Analizar el tamaño de cola guardado
cat ~/capturas_pruebas/escenario_3/qdisc_rep1.txt
# Buscar valores de "backlog" o "dropped"
```

### Valores Esperados

| Métrica | Sin Carga (Esc1) | Con Carga + WMM (Esc3) |
|---------|-----------------|----------------------|
| Latencia promedio | < 100 ms | < 150 ms (debería aumentar poco) |
| Jitter promedio | < 15 ms | < 30 ms |
| Packet Loss | < 1% | < 3% |
| Degradación subjetiva | Imperceptible | Leve pero comprensible |

---

## 7. Escenario 4 — Red Saturada SIN WMM

### Objetivo

**Grupo de control.** Exactamente las mismas condiciones que Escenario 3,
pero con las reglas DSCP **desactivadas**. Sirve como contrafactual para
demostrar que la mejora en Escenario 3 se debe a WMM y no a otro factor.

### Condición de Red

- **Carga WiFi:** 70-90% (misma que Escenario 3)
- **WMM:** ❌ Desactivado (reglas iptables eliminadas)
- **Oradores:** 1
- **Oyentes:** 2-3
- **Duración:** 3-5 minutos
- **Repeticiones:** 5

⚠️ **CRÍTICO:** Entre Escenario 3 y Escenario 4 **NO se debe cambiar
ninguna otra configuración** excepto las reglas iptables.

### Paso a Paso

```
PASO 1 — Desactivar WMM
  # ⚠️ SOLO limpiar la cadena WMM_QOS, no todo mangle
  sudo iptables -t mangle -F WMM_QOS
  
  # Verificar que se limpió:
  sudo iptables -t mangle -L WMM_QOS -n -v
  # → Debe mostrar: Chain WMM_QOS (0 references)
  # → Sin reglas debajo
```

```
PASO 2 — Iniciar captura
  sudo tshark -i <INTERFAZ_ETH> -f "udp portrange 2000-2050" \
    -w ~/capturas_pruebas/escenario_4/saturado_sin_wmm_rep1.pcapng &
```

```
PASO 3 — Conectar oyentes y orador
  Mismo procedimiento que Escenarios 1 y 3:
  1. Orador transmite
  2. Oyentes conectan
  3. Verificar en monitor que todo funciona
```

```
PASO 4 — Iniciar carga iPerf (EXACTAMENTE LA MISMA que Escenario 3)
  Usar los mismos parámetros, misma duración, mismos dispositivos:
  
  iperf3 -c <IP_SERVIDOR> -u -b 10M -t 300 &
  iperf3 -c <IP_SERVIDOR> -u -b 15M -t 270 &
  iperf3 -c <IP_SERVIDOR> -u -b 20M -P 2 -t 240 &
```

```
PASO 5 — Observar y anotar (3-5 minutos)
  ANOTAR CADA 30 SEGUNDOS (igual que Escenario 3):
  ┌──────────────────────────────────────────────────────────────┐
  │  Tiempo  │  Lat.Prom  │  Lat.Max  │  Packet Loss  │  Jitter │
  ├──────────┼────────────┼───────────┼───────────────┼─────────┤
  │  T=0s    │            │           │               │         │
  │  T=30s   │            │           │               │         │
  │  ...     │            │           │               │         │
  └──────────────────────────────────────────────────────────────┘
  
  PRESTAR ATENCIÓN: 
  - La diferencia con Escenario 3 debería NOTARSE
  - El audio probablemente se degrade más
  - Anotar si hay cortes, ruido, distorsión
```

```
PASO 6 — Detener y guardar
  1. Detener tshark
  2. Detener iPerf3
  3. Guardar tc qdisc: tc -s qdisc show dev <INTERFAZ> \
       > ~/capturas_pruebas/escenario_4/qdisc_rep1.txt
  4. COMPLETAR PLANILLA
```

### Qué Medir

```bash
# Comparación directa Esc3 vs Esc4
echo "=== CON WMM (Escenario 3, rep1) ==="
tshark -r ~/capturas_pruebas/escenario_3/saturado_wmm_rep1.pcapng -q -z rtp,streams

echo "=== SIN WMM (Escenario 4, rep1) ==="
tshark -r ~/capturas_pruebas/escenario_4/saturado_sin_wmm_rep1.pcapng -q -z rtp,streams
```

### Valores Esperados

| Métrica | Con WMM (Esc3) | Sin WMM (Esc4) |
|---------|----------------|----------------|
| Latencia promedio | < 150 ms | > 250 ms (esperado) |
| Jitter promedio | < 30 ms | > 50 ms |
| Packet Loss | < 3% | > 5-10% |
| MOS | ≥ 3 | ≤ 2 |
| Experiencia | Comprensible | Difícil de entender |

**⚠️ Si no ves diferencia significativa entre Esc3 y Esc4**, puede ser que:
- La carga iPerf no es suficiente para saturar el canal
- El AP no respeta DSCP (verificar config del AP)
- El ancho de banda del AP es muy alto vs la carga generada

---

## 8. Escenario 5 — Comparación DSCP por Navegador

### Objetivo

Demostrar que el marcado DSCP en el **uplink** (orador → servidor) depende
del navegador. Chrome traduce `priority: 'high'` a DSCP EF (0xB8) en los
paquetes RTP. Firefox **no lo hace**. Esto permite cuantificar el impacto
real de la priorización origen bajo congestión.

### Condición de Red

- **Carga WiFi:** 70-90% (misma que Escenarios 3 y 4)
- **WMM:** ✅ Activo (reglas iptables aplicadas)
- **Oradores:** 1 por vez (Chrome primero, Firefox después)
- **Oyentes:** 2 (fijos, usando Chrome para aislar la variable)
- **Duración:** 2-3 minutos por prueba
- **Repeticiones:** 3 por navegador

### Dispositivos Necesarios

| Rol | Cantidad | Browser / Software |
|-----|----------|--------------------|
| Orador Chrome | 1 | Chrome / Chromium |
| Orador Firefox | 1 | Firefox |
| Oyente | 2 | Chrome (fijos) |
| Carga iPerf | 1-2 | iPerf3 cliente |
| Captura | 1 (servidor) | tshark |

### Paso a Paso

#### Fase A — Orador en Chrome (con DSCP EF esperado)

```
PASO A1 — Verificar WMM activo
  sudo iptables -t mangle -L WMM_QOS -n -v
  # → Debe estar activo (mostrar reglas DSCP)
```

```
PASO A2 — Iniciar captura (captura COMPLETA, sin filtro de puerto)
  Para este escenario necesitamos capturar los headers IP completos
  para analizar el campo DSCP:
  
  sudo tshark -i <INTERFAZ_ETH> \
    -w ~/capturas_pruebas/escenario_5/chrome_wmm_rep1.pcapng &
```

```
PASO A3 — Conectar oyentes (Chrome)
  Misma configuración que escenarios anteriores:
  1. Abrir /oyente.html
  2. Conectar al auditorio
  3. Verificar audio
```

```
PASO A4 — Iniciar orador en CHROME
  - Login como "Orador_Chrome"
  - Iniciar transmisión
```

```
PASO A5 — Iniciar carga iPerf
  Misma carga que Escenarios 3 y 4:
  iperf3 -c <IP_SERVIDOR> -u -b 10M -t 180 &
  iperf3 -c <IP_SERVIDOR> -u -b 15M -t 150 &
```

```
PASO A6 — Capturar (2-3 minutos)
  ANOTAR MÉTRICAS CADA 30s (latencia, pérdidas, jitter)
  Verificar que el monitor muestra datos
```

```
PASO A7 — Detener y guardar
  sudo pkill -SIGINT tshark
  pkill iperf3
  COMPLETAR PLANILLA
```

#### Fase B — Orador en Firefox (sin DSCP esperado)

```
PASO B1 — Asegurar condiciones idénticas
  - Misma carga iPerf (reiniciar si es necesario)
  - Mismos oyentes
  - WMM sigue activo
  - NADA cambió excepto el navegador del orador
```

```
PASO B2 — Iniciar captura
  sudo tshark -i <INTERFAZ_ETH> \
    -w ~/capturas_pruebas/escenario_5/firefox_wmm_rep1.pcapng &
```

```
PASO B3 — Conectar orador en FIREFOX
  - Abrir Firefox → /login.html
  - Nombre: "Orador_Firefox"
  - Clave: WMM_SECRET_2026
  - Iniciar transmisión
  - PERMITIR micrófono (Firefox pide permiso)
```

```
PASO B4 — Iniciar carga iPerf (EXACTAMENTE IGUAL que Fase A)
  iperf3 -c <IP_SERVIDOR> -u -b 10M -t 180 &
  iperf3 -c <IP_SERVIDOR> -u -b 15M -t 150 &
```

```
PASO B5 — Capturar (2-3 minutos)
  ANOTAR MÉTRICAS CADA 30s
  PRESTAR ATENCIÓN: ¿se escucha peor que con Chrome?
```

```
PASO B6 — Detener y guardar
  sudo pkill -SIGINT tshark
  pkill iperf3
  COMPLETAR PLANILLA
```

#### Fase C — Controles sin Carga

```
PASO C1 — Captura control Chrome sin carga
  - SIN iPerf
  - Orador Chrome
  - Capturar 30s:
  
  sudo tshark -i <INTERFAZ_ETH> \
    -w ~/capturas_pruebas/escenario_5/chrome_control_noload.pcapng &
  # Esperar 30s, detener
```

```
PASO C2 — Captura control Firefox sin carga
  - SIN iPerf
  - Orador Firefox
  - Capturar 30s:
  
  sudo tshark -i <INTERFAZ_ETH> \
    -w ~/capturas_pruebas/escenario_5/firefox_control_noload.pcapng &
  # Esperar 30s, detener
```

### Qué Medir y Cómo Extraerlo

#### A. Verificar DSCP en capturas Wireshark

```bash
# ── Verificar paquetes con DSCP EF (46 = 0xB8 = 0x2e en DSCP field) ──

# Chrome: debería mostrar paquetes
tshark -r ~/capturas_pruebas/escenario_5/chrome_wmm_rep1.pcapng \
  -Y "ip.dsfield.dscp == 46" -T fields -e frame.number -e ip.src -e ip.dst \
  | head -20

# Firefox: debería mostrar 0 resultados (o muy pocos)
tshark -r ~/capturas_pruebas/escenario_5/firefox_wmm_rep1.pcapng \
  -Y "ip.dsfield.dscp == 46" -T fields -e frame.number -e ip.src -e ip.dst \
  | head -20

# ── Ver paquetes SIN DSCP (Best Effort = 0) ──

# Firefox: debería mostrar paquetes
tshark -r ~/capturas_pruebas/escenario_5/firefox_wmm_rep1.pcapng \
  -Y "ip.dsfield.dscp == 0" -T fields -e frame.number -e ip.src -e ip.dst \
  | head -20
```

**Resultado esperado:**
| Captura | DSCP EF (46) | Best Effort (0) |
|---------|-------------|-----------------|
| Chrome + carga | ✅ Paquetes marcados | Algunos |
| Firefox + carga | ❌ Vacío | ✅ Todos los paquetes |
| Chrome control | ✅ Paquetes marcados | Algunos |
| Firefox control | ❌ Vacío | ✅ Todos los paquetes |

#### B. Comparar métricas de calidad

```bash
# Comparar pérdidas y jitter
tshark -r ~/capturas_pruebas/escenario_5/chrome_wmm_rep1.pcapng \
  -q -z rtp,streams

tshark -r ~/capturas_pruebas/escenario_5/firefox_wmm_rep1.pcapng \
  -q -z rtp,streams
```

**Resultado esperado:** Firefox debe mostrar mayor packet loss y jitter
que Chrome bajo la misma carga de red, porque sus paquetes compiten
en best-effort sin priorización.

#### C. Tabla comparativa final

| Métrica | Chrome (DSCP EF) | Firefox (sin DSCP) |
|---------|-----------------|-------------------|
| DSCP verificado | ✅ EF (46) | ❌ Best Effort (0) |
| Packet Loss (baja carga) | < 1% | < 1% (similar) |
| Packet Loss (alta carga) | < 3% | > 5% (esperado) |
| Latencia (alta carga) | < 150 ms | > 200 ms |
| Jitter (alta carga) | < 30 ms | > 40 ms |
| MOS estimado | ≥ 3 | ≤ 2 |

---

## Anexo A — Planilla de Registro de Métricas

Usá esta tabla para cada repetición de cada escenario.

### Datos Generales

| Campo | Valor |
|-------|-------|
| Escenario | Nro: ____ |
| Repetición | Nro: ____ |
| Fecha | ____ / ____ / 2026 |
| Hora inicio | __ : __ |
| Hora fin | __ : __ |
| AP utilizado | Marca/Modelo: ______________ |
| Banda WiFi | 2.4 GHz / 5 GHz |
| Oradores | Cantidad: ____ |
| Oyentes | Cantidad: ____ |
| WMM | Activo / Inactivo |
| Navegador orador | Chrome / Firefox |
| Carga iPerf | ____ Mbps, ____ flujos |

### Métricas Objetivas (cada 30 segundos)

| T(s) | Lat.Prom(ms) | Lat.Max(ms) | Jitter(ms) | PacketLoss(%) | Throughput(kbps) |
|------|-------------|------------|------------|--------------|-----------------|
| 0    |             |            |            |              |                 |
| 30   |             |            |            |              |                 |
| 60   |             |            |            |              |                 |
| 90   |             |            |            |              |                 |
| 120  |             |            |            |              |                 |
| 150  |             |            |            |              |                 |
| 180  |             |            |            |              |                 |

### Métricas de Wireshark (post-procesamiento)

| Stream | SSRC | Paquetes | Perdidos | Loss% | JitterMed(ms) | JitterMax(ms) |
|--------|------|---------|---------|-------|--------------|--------------|
| Orador→Oy1 |      |         |         |       |              |              |
| Orador→Oy2 |      |         |         |       |              |              |
| Orador→Oy3 |      |         |         |       |              |              |

### Queue Size (tc -s qdisc)

| Muestra | Backlog (bytes) | Paquetes en cola | Descartados |
|---------|----------------|-----------------|-------------|
| 1       |                |                 |             |
| 2       |                |                 |             |
| 3       |                |                 |             |

### Métrica Subjetiva (MOS)

| Oyente | MOS (1-5) | Comentario |
|--------|-----------|------------|
| Oyente_1 | __ |             |
| Oyente_2 | __ |             |
| Oyente_3 | __ |             |
| **Promedio** | __ |             |

---

## Anexo B — Resolución de Problemas Comunes

### ⚠️ "No se escucha nada en el oyente"
1. Verificar que el orador está transmitiendo ("🔴 TRANSMITIENDO EN VIVO")
2. En el oyente, verificar que no esté muteado (check volumen del dispositivo)
3. Chrome: a veces bloquea autoplay → tocar la pantalla
4. Verificar que HTTPS funciona (no http)

### ⚠️ "El monitor no muestra datos"
1. Recargar la página (botón ⟳ arriba a la derecha)
2. Verificar que la clave de acceso es correcta
3. Verificar que el servidor está corriendo: `curl -k https://localhost:3000/api/health`

### ⚠️ "iPerf3 no conecta"
1. Verificar que el servidor iPerf3 está corriendo: `ps aux | grep iperf3`
2. Verificar conectividad: `ping <IP_SERVIDOR>`
3. Verificar que el firewall no bloquea el puerto 5201

### ⚠️ "No veo reglas DSCP en iptables"
1. Correr `sudo bash wmm-qos-setup.sh` de nuevo
2. Verificar: `sudo iptables -t mangle -L WMM_QOS -n -v`

### ⚠️ "No veo diferencia entre Escenario 3 y 4"
Causas posibles:
1. La carga iPerf es insuficiente → aumentar bitrate
2. El AP no soporta WMM o no lo tiene habilitado
   → Verificar config del AP, buscar opción "WMM" o "Wi-Fi Multimedia"
3. El AP tiene muy poco tráfico → agregar más clientes iPerf
4. Estás en 5 GHz con mucho ancho de banda → probar en 2.4 GHz

### ⚠️ "Firefox no encuentra el micrófono"
1. Verificar permisos: Click en candado 🔒 en la barra de direcciones → "Micrófono: Permitir"
2. Firefox requiere HTTPS estricto → verificar que usás `https://`
3. En about:config verificar `media.navigator.permission.disabled` = false

---

> **Fin del Protocolo Detallado.**  
> Si durante la ejecución encontrás algún error o algo que no está claro,
> anotalo para ajustar el protocolo y seguimos.
