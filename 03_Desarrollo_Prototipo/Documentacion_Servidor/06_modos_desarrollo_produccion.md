# Modos Desarrollo y Producción

El sistema tiene dos modos de logging que permiten alternar entre un entorno de desarrollo con trazas detalladas y un entorno de producción silencioso.

## Cómo Funciona

La variable `DEBUG` en el archivo `.env` controla el logging del lado del cliente (frontend):

```env
# Debug (false para producción, true para desarrollo)
DEBUG=false
```

**Comportamiento:**
- `DEBUG=false` (producción): los logs de `console.log`, `console.info` y `console.debug` se silencian en todos los navegadores cliente. Solo warnings y errores se muestran por seguridad diagnóstica.
- `DEBUG=true` (desarrollo): los logs se activan para todos los dispositivos conectados.

El servidor lee esta variable y la inyecta en el frontend al cargar la página, donde el módulo `logger.js` (en `public/js/common/logger.js`) la utiliza para sobrescribir las funciones de consola globales.

## Forzar Debug Local

Independientemente del valor en `.env`, se puede activar el debug para un dispositivo específico sin afectar al resto:

```bash
# Opción 1: Agregar ?debug=true en la URL
https://auditorio.local/transmision.html?debug=true

# Opción 2: Desde la consola del navegador
localStorage.setItem('WMM_DEBUG', 'true');
location.reload();
```

Para desactivar el debug local:

```javascript
localStorage.removeItem('WMM_DEBUG');
location.reload();
```

## Uso Recomendado

| Entorno | `DEBUG` en `.env` | Razón |
|---------|-------------------|-------|
| Desarrollo | `true` | Ver trazas de WebRTC, eventos Socket.IO y métricas |
| Pruebas | `false` + `?debug=true` individual | Evaluar sin logs masivos pero depurar dispositivos específicos |
| Producción | `false` | Máximo rendimiento, sin overhead de logging en cliente |

## Nota sobre el Servidor

El logging del servidor (Node.js/mediasoup) se controla mediante la variable `LOG_LEVEL` en el código, con nivel `info` por defecto. Para logs más detallados de mediasoup, se puede usar la variable `DEBUG=mediasoup:*` del archivo `.env`, que es independiente de la variable `DEBUG` del frontend.
