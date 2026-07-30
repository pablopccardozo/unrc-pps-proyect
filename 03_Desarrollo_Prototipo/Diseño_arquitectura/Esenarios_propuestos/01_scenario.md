

* Escenario a simular: 
    * Medicion de metricas en línea base. Solo el cliente RTC, sin tráfico de fondo.

    * Genera tráfico de fondo constante (BE/BK) para crear congestión y monitoriar en presencia y ausencia de este tráfico. Aprox. 88% de uso del tiempo aire (congestión alta).

    * Cambiar proporcion de trafico (BE/BK). Tráfico de fondo realista variable. (Simular tráfico de datos de larga duración, ej: descargas grande en FTP, incluir ráfagas agresivas de descarga de archivos hasta 400 Mbps). Uso de aire variable entre 40-85%.

    * Inyectar tráfico de audio diferente al de interes (ambos trafcios tendran la misma prioridad).

    * Inyectar trafico de Video.

    * Definir un D_max para el audio a transmitir (ej: 150ms). No basta con medir el retardo promedio.


* Parámetros a monitorear: El servidor de audio puede reportar la longitud del búfer de salida (análogo a Q_inst). Un aumento sostenido indica congestión.

* Acción a tratar: Al detectar congestión (búfer creciente), la aplicación cliente podría:

    * Cambiar a un códec de audio más eficiente.

    * Solicitar al servidor que ajuste la calidad del stream.
