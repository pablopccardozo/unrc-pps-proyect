
|Parámetro|Unidad|Herramienta|Intervalo de captura|
|---|---|---|---|
|E2E Packet Delay (promedio)|ms|`/monitor.html` + Wireshark RTP|cada 2 s (ya lo tiene el LatencyService)|
|Jitter|ms|Wireshark RTP Streams / WebRTC Stats|por stream|
|Packet Loss Rate|%|Wireshark RTP / WebRTC Stats|por sesión|
|Throughput audio|kbps|`/api/stats`|cada 5–10 s|
|Avg Queue Size|paquetes/bytes|`tc -s qdisc`|muestras manuales|
|Carga del canal WiFi|%|`iw dev` / herramienta del AP|continuo|

---
#### Orden de ejecución sugerido

1. Levantás el stack con Docker, aplicás `wmm-qos-setup.sh`
2. Abrís Wireshark en modo captura con el filtro UDP/RTP
3. Conectás un orador y 2–3 oyentes → capturás 2 minutos → **Escenario 1**
4. Sin cerrar nada, lanzás iPerf3 con carga progresiva → **Escenario 3**
5. Detenés iPerf3, bajás las reglas iptables: `iptables -t mangle -F` → repetís iPerf3 → **Escenario 4**
6. Guardás cada captura `.pcapng` con nombre descriptivo (`baseline_wmm_on.pcapng`, `saturado_wmm_off.pcapng`, etc.)

El contraste entre Escenario 3 y Escenario 4 va a ser el resultado central de tu práctica: muestra cuantitativamente cuánto mejora WMM la calidad de voz en red saturada.