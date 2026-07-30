const serverConfig = require('./server-config');

module.exports = {
    // Red — HOST proviene de server-config.js (fuente única de verdad)
    // server-config usa: process.env.HOST → detectLocalIP() → '0.0.0.0'
    // Esto garantiza que mediasoup siempre tenga una IP real para announcedIp
    NETWORK: {
        HOST: serverConfig.HOST,
        PORT: serverConfig.PORT,
        RTC_MIN_PORT: serverConfig.RTC_MIN_PORT,
        RTC_MAX_PORT: serverConfig.RTC_MAX_PORT
    },

    // Autenticación
    AUTH: {
        SECRET_KEY: process.env.SECRET_KEY || 'WMM_SECRET_2026'
    },

    // Latencia (ms)
    LATENCY: {
        EXCELLENT: 100,
        GOOD: 150,
        ACCEPTABLE: 200,
        WARNING: 250,
        CRITICAL: 300,
        ALERT_THRESHOLD: 250,
        TIMESTAMP_INTERVAL: 1000,  // 1 segundo
        REPORT_INTERVAL: 2000,      // 2 segundos
        MAX_TIMESTAMP_AGE: 10000,   // 10 segundos
        MAX_HISTORY: 20
    },

    // Audio
    AUDIO: {
        CODEC: 'audio/opus',
        CLOCK_RATE: 48000,
        CHANNELS: 2,
        DEFAULT_BITRATE: 24000,
        MAX_BITRATE: 32000,
        PTIME: 20,  // 20ms por paquete
        DTX: true,
        FEC: true
    },

    // Roles
    ROLES: {
        SPEAKER: 'speaker',
        LISTENER: 'listener',
        MONITOR: 'monitor'
    },

    // Salas Socket.io
    ROOMS: {
        MONITOR: 'monitor-room',
        LISTENER: 'listener-room'
    }
};