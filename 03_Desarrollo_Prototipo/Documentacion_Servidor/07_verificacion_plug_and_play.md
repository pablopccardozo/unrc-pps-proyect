# Verificación Plug-and-Play

Guía de pruebas para validar que el sistema funciona de forma autónoma, sin intervención manual, al encender el servidor o cambiar de red.

## Preparación

Abrir dos terminales en el servidor para monitorear los servicios:

```bash
# Terminal 1 — Servidor de audio
sudo journalctl -u wmm-audio.service -f

# Terminal 2 — Watchdog de red
sudo journalctl -u wmm-network-watch.service -f
```

---

### Fase 1: Arranque en Frío (Cold Boot)

Valida que el sistema no falle si se enciende sin conexión de red y que se active automáticamente al conectar el cable.

1. **Desconectar** el cable de red del servidor.
2. **Reiniciar** el servicio principal:
   ```bash
   sudo systemctl restart wmm-audio.service
   ```
3. **Verificar logs (Terminal 1):** El servicio debe entrar en un bucle de espera:
   > `Esperando conexión de red LAN...`
4. **Conectar** el cable de red.
5. **Resultado esperado:** En cuanto el DHCP asigne una IP, el script continúa automáticamente: aplica QoS, configura redirección de puerto, y levanta el contenedor Docker.

---

### Fase 2: Descubrimiento por mDNS

Valida que los clientes encuentren el servidor sin conocer su IP.

1. Desde un celular o computadora en la **misma red WiFi**, ingresar a:
   ```
   https://auditorio.local/
   ```
   > Al usar certificados autofirmados, el navegador mostrará una advertencia de seguridad. Aceptar la excepción para continuar.

2. Probar el panel de monitoreo:
   ```
   https://auditorio.local/monitor.html
   ```

3. **Resultado esperado:**
   - La página principal carga con las opciones de "Orador" y "Oyente".
   - El monitor muestra el dashboard con las métricas en tiempo real.

---

### Fase 3: Cambio de IP en Caliente

Valida que el sistema se adapte automáticamente si el servidor cambia de red sin reiniciar.

1. Con el monitor abierto en un dispositivo, **desconectar el cable de red** del servidor.
2. Conectarlo a **otro router o red diferente**.
3. **Observar la Terminal 2 (network-watch):** En menos de 10 segundos, el watchdog detectará el cambio de IP.
4. **Resultado esperado:**
   - `network-watch` ejecuta `docker compose up -d` para recrear el contenedor con la nueva IP.
   - Avahi actualiza la resolución de `auditorio.local` a la nueva IP.
   - El dominio `https://auditorio.local/` sigue funcionando sin intervención.

---

### Fase 4: Monitoreo y Carga en Vivo

Valida la precisión de las métricas de latencia.

1. Ingresar como **Orador** desde un dispositivo (`/login.html`) e iniciar la transmisión.
2. Conectar **dos o tres dispositivos como Oyentes**.
3. En el monitor (`/monitor.html`), observar la tabla de oradores y oyentes.
4. **Simular latencia alta** en un oyente (Chrome DevTools → Network → Throttling → "Slow 3G").
5. **Resultado esperado:**
   - El badge del oyente con mala conexión cambia a naranja/rojo.
   - La tarjeta **"Peor Latencia"** muestra el valor del dispositivo ralentizado.
   - La **"Latencia Promedio"** se recalcula reflejando la media real.
   - Al desconectar el oyente lento, la "Peor Latencia" baja al siguiente valor más alto.
