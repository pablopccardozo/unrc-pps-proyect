const os = require('os');

/**
 * Detecta automáticamente la IP local con prioridad de interfaces.
 * Orden de prioridad:
 *   1. eno1  (Ethernet)
 *   2. wlo2  (WiFi)
 *   3. Cualquier otra IPv4 no-loopback encontrada
 *   4. '0.0.0.0' como último fallback
 */
function detectLocalIP() {
    const interfaces = os.networkInterfaces();
    const PRIORITY = ['eno1', 'wlo2'];

    // Buscar en orden de prioridad
    for (const name of PRIORITY) {
        const ifaces = interfaces[name];
        if (!ifaces) continue;
        const ipv4 = ifaces.find(i => i.family === 'IPv4' && !i.internal);
        if (ipv4) {
            console.log(`[config] HOST detectado en interfaz "${name}": ${ipv4.address}`);
            return ipv4.address;
        }
    }

    // Fallback: cualquier IPv4 no-loopback disponible
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`[config] HOST detectado en interfaz genérica "${name}": ${iface.address}`);
                return iface.address;
            }
        }
    }

    console.warn('[config] No se encontró IP local. Usando 0.0.0.0 (todas las interfaces).');
    return '0.0.0.0';
}

const HOST = process.env.HOST || detectLocalIP();

module.exports = {
    HOST,
    PORT: parseInt(process.env.PORT) || 3000,
    RTC_MIN_PORT: parseInt(process.env.RTC_MIN_PORT) || 2000,
    RTC_MAX_PORT: parseInt(process.env.RTC_MAX_PORT) || 2050
};
