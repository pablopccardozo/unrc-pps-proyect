Este proyecto, en su etapa de desarrollo, posee logs que se ejecutan en el lado de los clientes, es decir, en los dispositivos del orador y el cliente. Claramente esto es necesario para el debug del sistema. Sin embargo, una vez en producción, esto es un inconveniente grave, ya que demanda procesamiento de los dispositivos. Es por eso que en el archivo `.env` existe una variable que se usa para el comportamiento de ambas etapas; la de desarrollo y la de producción.
### 1. Configuración del archivo `.env`

El archivo `.env` contiene la variable `DEBUG` que determina si el sistema está en modo Desarrollo o Producción.

```env
# Debug (false para producción, true para desarrollo)
DEBUG=false
```

### Cambiar de entorno de Desarrollo a Producción

*   Si `DEBUG=false` en el `.env`, todos los logs se silencian automáticamente en todos los dispositivos.
*   Si `DEBUG=true`, los logs se activan para todos.

### Mantenimiento de Overrides

También existe la posibilidad de forzar el debug localmente (usando `?debug=true` en la URL) por si es necesario inspeccionar un dispositivo específico en una red que tiene el modo producción activo.

### Cómo usarlo:
*   **Para Producción**: Simplemente asegúrate de que en el archivo `.env` diga `DEBUG=false` y reinicia el servidor.
*   **Para Desarrollo**: Cambia a `DEBUG=true` y todos los dispositivos conectados verán los logs.

