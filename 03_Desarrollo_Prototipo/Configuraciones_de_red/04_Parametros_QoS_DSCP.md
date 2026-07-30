# Parámetros de QoS y Marcado DSCP

## Mapeo DSCP → Categoría WMM

| DSCP | Valor Binario | Valor Hex | Cola WMM | Prioridad | Uso |
|------|--------------|-----------|----------|-----------|-----|
| EF (Expedited Forwarding) | 101110 | 0xB8 / 46 | AC_VO | Máxima | Audio RTP del proyecto |
| AF41 | 100010 | 0x88 / 34 | AC_VI | Alta | Video (no usado) |
| AF31 | 011010 | 0x68 / 26 | AC_VI | Alta | Video (no usado) |
| BE (Best Effort) | 000000 | 0x00 / 0 | AC_BE | Normal | Tráfico sin prioridad |
| BK (Background) | 010000 | 0x20 / 32 | AC_BK | Baja | Tráfico de baja prioridad |

## Parámetros WMM/EDCA del AP

| Categoría | CWmin | CWmax | AIFSN | TXOP Limit |
|-----------|-------|-------|-------|------------|
| AC_VO (Voz) | 3 | 7 | 2 | 1.504 ms |
| AC_VI (Video) | 7 | 15 | 2 | 3.008 ms |
| AC_BE (Best Effort) | 15 | 1023 | 3 | — |
| AC_BK (Background) | 15 | 1023 | 7 | — |

## Asimetría del Marcado DSCP

```
UPLINK  (Orador → Servidor):
  Chrome/Edge:  DSCP EF (0xB8)  →  Cola AC_VO  ← Priorizado
  Firefox:      DSCP BE (0x00)  →  Cola AC_BE  ← Best-effort
  Safari:       DSCP BE (0x00)  →  Cola AC_BE  ← Best-effort

DOWNLINK (Servidor → Oyente):
  Siempre:      DSCP EF (0xB8)  →  Cola AC_VO  ← Priorizado
                (marcado por iptables OUTPUT del servidor)
```

El uplink depende del navegador porque la prioridad `networkPriority: 'high'` en WebRTC se traduce a DSCP EF solo en Chromium. El downlink siempre está priorizado porque las reglas iptables del servidor marcan DSCP EF independientemente del cliente.

## Verificación del Marcado DSCP

### En el servidor (tráfico saliente)

```bash
# Capturar paquetes en el servidor y filtrar por DSCP
sudo tcpdump -i eth0 -nn -v udp portrange 2000-2050 | grep -i "dscp"

# O usar iptables para contar paquetes marcados
sudo iptables -t mangle -L WMM_QOS -n -v
```

### En el cliente WiFi

```bash
# Con Wireshark: filtrar por ip.dsfield.dscp == 46
# O desde terminal (si el cliente tiene tcpdump):
tcpdump -i wlan0 -nn -v udp portrange 2000-2050 | grep -i "dscp"
```

## Referencia de iptables

| Comando | Efecto |
|---------|--------|
| `-t mangle` | Trabaja sobre la tabla de modificación de paquetes |
| `-A OUTPUT -j WMM_QOS` | Desvía paquetes salientes a la cadena custom |
| `-p udp --sport 2000:2050` | Selecciona UDP con puerto origen en el rango RTP |
| `-j DSCP --set-dscp 46` | Marca el campo DSCP con valor 46 (EF) |
