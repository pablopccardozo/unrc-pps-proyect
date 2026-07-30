# Configuración del Access Point WiFi

## Parámetros del AP

| Parámetro | Valor | Nota |
|-----------|-------|------|
| Bandas | 5 GHz | Prioriza 5 GHz para evitar interferencia con redes 2.4 GHz |
| SSID | `auditorio-wmm` | Nombre de red visible para los clientes |
| Seguridad | WPA2-PSK | Compatible con todos los dispositivos |
| Canal | Auto (seleccionar el menos congestionado) | Verificar con analizador WiFi |
| Ancho de canal | 20/40/80 MHz | Depende del AP y la cantidad de clientes |
| **WMM (Wi-Fi Multimedia)** | **Habilitado** | **REQUERIDO para QoS** |
| WMM Power Save | Deshabilitado | Evita latencia adicional por ahorro de energía |
| Multicast Rate | 24 Mbps | Evita que el rate shaping afecte el audio |
| Beacon Interval | 100 ms | Valor por defecto, aceptable |
| DTIM Period | 1 | Máxima frecuencia de delivery traffic indication |

## Verificación de WMM

Para verificar que WMM está activo en el AP:

```bash
# Desde un cliente conectado, ver las capacidades del AP
iw dev wlan0 scan | grep -A 5 "auditorio-wmm"
```

Si WMM está habilitado, el AP debe anunciar `* WMM` o `* QoS` en sus capacidades.

## Canales y Congestión

Antes de cada sesión de prueba, verificar la ocupación del canal:

```bash
# En el servidor Ubuntu
sudo apt install linssid  # o usar wavemon
wavemon  # TUI para monitoreo WiFi

# Desde un cliente
iw dev wlan0 survey dump | grep -A 3 "in use"
```

Se recomienda seleccionar el canal con menor ocupación de aire (idealmente < 20% de利用率 en reposo).

## Recomendaciones

1. **Deshabilitar bandas de 2.4 GHz** para pruebas si es posible, o usar SSID separado para evitar que clientes se conecten en 2.4 GHz.
2. **Deshabilitar funciones "inteligentes"** del AP como band steering, airtime fairness, o smart QoS que puedan interferir con las mediciones.
3. **Ubicar el AP en línea de visión** con los clientes de prueba para minimizar pérdidas por obstáculos.
4. **Firmware actualizado** del AP para asegurar soporte correcto de WMM.
