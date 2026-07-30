
###  Guía de Verificación Plug-and-Play

Abrí dos terminales en el servidor para monitorear los servicios en tiempo real durante las pruebas:
*   **Terminal 1 (Servidor de Audio):** `sudo journalctl -u wmm-audio -f`
*   **Terminal 2 (Guardián de Red):** `sudo journalctl -u wmm-network-watch -f`

---

#### 📌 Fase 1: Arranque en Frío (Cold Boot & Link Detection)
Esta prueba valida que el sistema no falle si se enciende sin conexión de red y que se active automáticamente al conectar el cable/Wi-Fi.

1.  **Desconectá** el cable de red (o desactivá la interfaz de red del servidor).
2.  **Reiniciá** el servicio principal:
    ```bash
    sudo systemctl restart wmm-audio
    ```
3.  **Verificá los logs (Terminal 1):** Vas a ver que el servicio entra en un bucle de espera bloqueante:
    > `Esperando conexión de red LAN...`
4.  **Conectá** el cable de red.
5.  **Resultado esperado:** En cuanto el DHCP asigne una IP, el script de arranque continuará automáticamente, aplicando las reglas de QoS, la redirección del puerto 443 al 3000, y levantará el contenedor de Docker anunciando la IP correcta.

---

#### 📌 Fase 2: Descubrimiento y Seguridad (mDNS)
Esta prueba valida que cualquier dispositivo de la red pueda encontrar el servidor sin saber su IP, usando HTTPS y pasando por el filtro de seguridad que acabamos de crear.

1.  Desde tu celular o una computadora conectada a la **misma red local (Wi-Fi)**, ingresá a:
    `https://auditorio.local/`
    *(Nota: Al usar certificados auto-firmados, el navegador te advertirá sobre la seguridad. Aceptá la advertencia para continuar).*
2.  Desde otra pestaña de la misma máquina, intentá acceder al panel de control:
    `https://auditorio.local/monitor.html`
3.  **Resultado esperado:**
    *   La página principal (`/`) debe cargar fluidamente y ofrecer las opciones de "Orador" u "Oyente".
    *   Al ingresar a `/monitor.html`, **debe aparecer la pantalla de Acceso Restringido** y no realizar ninguna conexión por WebSockets (revisá la consola de red si querés).
    *   Ingresá la clave de administración (`WMM_SECRET_2026`). El dashboard debe desbloquearse en el acto e iniciar el monitoreo en tiempo real.

---

#### 📌 Fase 3: La Prueba de Fuego (Cambio de IP en Caliente)
Este es el corazón del *plug-and-play*. Valida qué pasa si el servidor se desconecta y se enchufa en otro router, cambiando de IP física sin reiniciar el sistema operativo.

1.  Con el monitor abierto en tu celular, **desconectá el cable de red** del servidor.
2.  Conectalo a **otro router o red diferente** (o forzá un cambio de IP en tu router actual).
3.  **Mirá la Terminal 2 (network-watch):** En un máximo de 10 segundos, el guardián de red detectará que la IP cambió.
4.  **Resultado esperado:**
    *   `network-watch` exportará la nueva IP en caliente y ejecutará `docker compose up -d` para recrear los contenedores.
    *   Avahi actualizará la resolución de `auditorio.local` a la nueva IP.
    *   En tu celular, el dominio `https://auditorio.local/` seguirá funcionando perfectamente sin que hayas tenido que tocar una sola línea de código o reiniciar el servidor físico.

---

#### 📌 Fase 4: Flujo de Monitoreo y Carga en Vivo
Esta prueba valida la precisión de las métricas de latencia dinámica y el comportamiento de la "Peor Latencia".

1.  Entrá como **Orador** en un dispositivo (`https://auditorio.local/login.html`) e iniciá la transmisión.
2.  Conectá **dos o tres dispositivos como Oyentes** (pueden ser pestañas en incógnito o celulares).
3.  En tu pantalla de administración (`monitor.html`), observá la tabla de "Oradores y sus Oyentes".
4.  **Simulá mala señal o latencia alta** en uno de los dispositivos oyentes (en Chrome podés ir a *DevTools -> Network -> Throttling* y cambiarlo a "Slow 3G").
5.  **Resultado esperado:**
    *   El badge del oyente con mala conexión en el monitor cambiará a naranja o rojo.
    *   La tarjeta **"Peor Latencia"** del grid principal debe subir y mostrar exactamente la latencia de ese dispositivo ralentizado (por ejemplo, `300ms`).
    *   La **"Latencia Promedio"** se recalculará matemáticamente de forma suave reflejando la media real de todos los oyentes activos.
    *   Si desconectás al oyente lento, la tarjeta de "Peor Latencia" debe bajar instantáneamente al valor del siguiente oyente con peor conexión.
