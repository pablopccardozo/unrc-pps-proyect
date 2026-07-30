# Configuración del Access Point WiFi

## General

El proyecto contempla pruebas en ambas bandas WiFi (2.4 GHz y 5 GHz) para evaluar y comparar el impacto de cada una en la calidad de servicio del audio en tiempo real. La configuración del AP debe adaptarse según la banda que se esté probando en cada escenario.

## Parámetros del AP por Banda

### Banda 5 GHz

| Parámetro | Valor | Nota |
|-----------|-------|------|
| Banda | 5 GHz | Menor interferencia, mayor ancho de canal, más sensible a obstáculos |
| SSID | `auditorio-wmm-5` | SSID diferenciado por banda para control de conexión |
| Canal | Auto (seleccionar el menos congestionado) | Verificar con analizador WiFi |
| Ancho de canal | 20/40/80 MHz | Depende del AP y la cantidad de clientes |

### Banda 2.4 GHz

| Parámetro | Valor | Nota |
|-----------|-------|------|
| Banda | 2.4 GHz | Mayor alcance, más interferencia (redes vecinas, Bluetooth, microondas) |
| SSID | `auditorio-wmm-24` | SSID diferenciado para asegurar que los clientes se conecten en la banda deseada |
| Canal | 1, 6 u 11 | Solo canales no solapados en 2.4 GHz |
| Ancho de canal | 20 MHz | En 2.4 GHz usar siempre 20 MHz para evitar solapamiento |

### Parámetros Comunes

| Parámetro | Valor | Nota |
|-----------|-------|------|
| Seguridad | WPA2-PSK | Compatible con todos los dispositivos |
| **WMM (Wi-Fi Multimedia)** | **Habilitado** | **REQUERIDO para QoS** |
| WMM Power Save | Deshabilitado | Evita latencia adicional por ahorro de energía |
| Multicast Rate | 24 Mbps (5 GHz) / 11 Mbps (2.4 GHz) | Evita que el rate shaping afecte el audio |
| Beacon Interval | 100 ms | Valor por defecto, aceptable |
| DTIM Period | 1 | Máxima frecuencia de delivery traffic indication |

> **Nota sobre SSID**: se recomienda usar SSID diferentes por banda para tener control absoluto sobre en qué banda se conecta cada cliente. Si el AP usa el mismo SSID para ambas bandas (band steering), los clientes pueden migrar entre bandas según su criterio, lo que invalida la comparación.

## Verificación de WMM

Para verificar que WMM está activo en el AP:

```bash
# Desde un cliente conectado, ver las capacidades del AP
iw dev wlan0 scan | grep -A 5 "auditorio-wmm-5"  # o auditorio-wmm-24
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

Se recomienda seleccionar el canal con menor ocupación de aire (idealmente < 20% en reposo). Esto es especialmente crítico en 2.4 GHz, donde hay más redes vecinas y solo 3 canales no solapados.

## Recomendaciones

1. **Usar SSID diferentes por banda** (`auditorio-wmm-5` y `auditorio-wmm-24`) para asegurar que cada cliente se conecte en la banda deseada durante las pruebas.
2. **Deshabilitar band steering** y otras funciones "inteligentes" del AP que puedan migrar clientes entre bandas automáticamente.
3. **Verificar la ocupación del canal** antes de cada prueba, especialmente en 2.4 GHz donde la interferencia es mayor.
4. **Documentar la banda utilizada** en cada ejecución de prueba como variable del escenario.
5. **Ubicar el AP en línea de visión** con los clientes de prueba para minimizar pérdidas por obstáculos.
6. **Firmware actualizado** del AP para asegurar soporte correcto de WMM.
