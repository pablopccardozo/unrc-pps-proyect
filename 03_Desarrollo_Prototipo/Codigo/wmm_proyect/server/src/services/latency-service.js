const logger = require('../utils/logger');
const constants = require('../config/constants');

class LatencyService {
    constructor() {
        // Almacena historial de reportes por oyente
        this.latencyReports = new Map(); // listenerId -> array de reportes
    }

    /**
     * Maneja los reportes de latencia enviados por los oyentes
     * Los oyentes envían su latencia calculada desde WebRTC stats
     */
    handleLatencyReport(socket, data, io, roomService) {
        // Solo los oyentes pueden enviar reportes
        if (socket.role !== 'listener') return;
        
        const report = {
            listenerId: socket.id,
            listenerName: data.listenerName || 'Oyente',
            latency: data.latency,                    // Latencia en ms (jitterBufferDelay)
            jitterBufferDelay: data.jitterBufferDelay,
            networkLatency: data.networkLatency,
            packetsLost: data.packetsLost,
            jitter: data.jitter,
            timestamp: data.timestamp || Date.now(),
            receivedAt: Date.now()
        };
        
        // Guardar en historial
        if (!this.latencyReports.has(socket.id)) {
            this.latencyReports.set(socket.id, []);
        }
        
        const history = this.latencyReports.get(socket.id);
        history.push(report);
        
        // Mantener solo los últimos N reportes
        if (history.length > constants.LATENCY.MAX_HISTORY) {
            history.shift();
        }
        
        // Buscar a qué orador está escuchando este oyente
        const speakers = roomService.getAllSpeakers();
        speakers.forEach(speaker => {
            const isListening = speaker.listeners.some(l => l.id === socket.id);
            if (isListening) {
                // Enviar reporte al orador específico
                io.to(speaker.id).emit('listener-latency-report', {
                    listenerId: socket.id,
                    listenerName: report.listenerName,
                    latency: report.latency,
                    jitterBufferDelay: report.jitterBufferDelay,
                    networkLatency: report.networkLatency,
                    timestamp: report.timestamp
                });
            }
        });
        
        // Enviar a la sala de monitoreo para estadísticas
        io.to(constants.ROOMS.MONITOR).emit('latency-report', {
            ...report,
            role: 'listener'
        });
        
        // Generar alerta si la latencia supera el umbral
        if (data.latency > constants.LATENCY.ALERT_THRESHOLD) {
            logger.warn(`⚠️ Latencia alta: ${data.latency}ms para ${report.listenerName} (${socket.id})`);
            
            io.to(constants.ROOMS.MONITOR).emit('high-latency-alert', {
                listenerId: socket.id,
                listenerName: report.listenerName,
                latency: data.latency,
                jitter: data.jitter,
                packetsLost: data.packetsLost,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Obtiene los reportes de latencia de un oyente específico
     */
    getListenerReports(listenerId) {
        return this.latencyReports.get(listenerId) || [];
    }

    /**
     * Obtiene el último reporte de un oyente
     */
    getLatestReport(listenerId) {
        const reports = this.latencyReports.get(listenerId);
        return reports && reports.length > 0 ? reports[reports.length - 1] : null;
    }

    /**
     * Calcula la latencia promedio de todos los oyentes activos
     */
    getAverageLatency() {
        let total = 0;
        let count = 0;
        
        this.latencyReports.forEach(reports => {
            if (reports.length > 0) {
                const latest = reports[reports.length - 1];
                total += latest.latency;
                count++;
            }
        });
        
        return count > 0 ? Math.round(total / count) : 0;
    }

    /**
     * Obtiene estadísticas completas de latencia
     */
    getStats() {
        const stats = {
            totalListeners: this.latencyReports.size,
            averageLatency: 0,
            maxLatency: 0,
            minLatency: Infinity,
            listeners: []
        };
        
        this.latencyReports.forEach((reports, listenerId) => {
            if (reports.length > 0) {
                const latest = reports[reports.length - 1];
                stats.averageLatency += latest.latency;
                stats.maxLatency = Math.max(stats.maxLatency, latest.latency);
                stats.minLatency = Math.min(stats.minLatency, latest.latency);
                
                stats.listeners.push({
                    id: listenerId,
                    name: latest.listenerName,
                    latency: latest.latency,
                    jitterBufferDelay: latest.jitterBufferDelay,
                    packetsLost: latest.packetsLost,
                    lastUpdate: latest.receivedAt
                });
            }
        });
        
        if (stats.totalListeners > 0) {
            stats.averageLatency = Math.round(stats.averageLatency / stats.totalListeners);
        }
        
        if (stats.minLatency === Infinity) stats.minLatency = 0;
        
        return stats;
    }

    /**
     * Limpia los datos de un usuario que se desconecta
     */
    removeUser(socketId) {
        this.latencyReports.delete(socketId);
        logger.debug(`🗑️ Datos de latencia eliminados para ${socketId}`);
    }

    /**
     * Limpia reportes antiguos (más de X minutos)
     */
    cleanOldReports(maxAgeMinutes = 5) {
        const now = Date.now();
        const maxAge = maxAgeMinutes * 60 * 1000;
        
        this.latencyReports.forEach((reports, listenerId) => {
            const filtered = reports.filter(r => (now - r.receivedAt) < maxAge);
            if (filtered.length === 0) {
                this.latencyReports.delete(listenerId);
            } else if (filtered.length !== reports.length) {
                this.latencyReports.set(listenerId, filtered);
            }
        });
    }
}

module.exports = new LatencyService();
