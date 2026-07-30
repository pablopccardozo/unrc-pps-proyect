// Medidor de latencia para el oyente usando WebRTC stats
class ListenerLatencyMeasurer {
    constructor(socketClient, listenerName) {
        this.socket = socketClient;
        this.listenerName = listenerName;
        this.interval = null;
        this.consumer = null;
        this.measurements = [];
        this.lastJitterBufferDelay = 0;
        this.lastPacketsLost = 0;
        this.lastJitter = 0;
    }

    start() {
        console.log('📊 Iniciando medición de latencia con WebRTC stats...');
        
        // Monitorear cada 2 segundos
        this.interval = setInterval(async () => {
            await this.reportLatency();
        }, 2000);
    }

    setConsumer(consumer) {
        this.consumer = consumer;
        console.log('🎧 Consumer configurado para medición de latencia');
    }

    async reportLatency() {
        if (!this.consumer || this.consumer.closed) return;
        
        try {
            const stats = await this.consumer.getStats();
            let jitterBufferDelay = 0;
            let packetsLost = 0;
            let jitter = 0;
            let timestamp = Date.now();
            
            stats.forEach(report => {
                if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                    // JITTER BUFFER DELAY - Latencia real que percibe el oyente
                    // Este es el tiempo que el audio espera en el buffer antes de reproducirse
                    if (report.jitterBufferDelay !== undefined && report.jitterBufferEmittedCount > 0) {
                        jitterBufferDelay = (report.jitterBufferDelay / report.jitterBufferEmittedCount) * 1000;
                        this.lastJitterBufferDelay = jitterBufferDelay;
                    }
                    
                    // Paquetes perdidos
                    packetsLost = report.packetsLost || 0;
                    this.lastPacketsLost = packetsLost;
                    
                    // Jitter de red (variabilidad)
                    if (report.jitter !== undefined) {
                        jitter = report.jitter * 1000;
                        this.lastJitter = jitter;
                    }
                    
                    timestamp = report.timestamp || Date.now();
                }
            });
            
            // Guardar medición para historial
            this.measurements.push({
                timestamp: Date.now(),
                jitterBufferDelay: jitterBufferDelay,
                packetsLost: packetsLost,
                jitter: jitter
            });
            
            // Mantener solo últimas 50 mediciones
            if (this.measurements.length > 50) {
                this.measurements.shift();
            }
            
            // Actualizar UI con la latencia real
            if (typeof uiHelpers !== 'undefined') {
                uiHelpers.updateLatencyIndicator(jitterBufferDelay);
            }
            
            // Enviar reporte al servidor
            this.socket.emit('listener-latency-report', {
                listenerName: this.listenerName,
                latency: Math.round(jitterBufferDelay),
                jitterBufferDelay: Math.round(jitterBufferDelay),
                networkLatency: Math.round(jitterBufferDelay - (this.lastJitter || 0)),
                packetsLost: packetsLost,
                jitter: Math.round(jitter),
                timestamp: timestamp
            });
            
            // Log si latencia es alta (cada 10 mediciones)
            if (jitterBufferDelay > 200 && Math.random() < 0.1) {
                console.warn(`⚠️ Latencia alta: ${Math.round(jitterBufferDelay)}ms | Jitter: ${Math.round(jitter)}ms | Pérdidas: ${packetsLost}`);
            }
            
        } catch (error) {
            console.warn('Error obteniendo estadísticas del consumer:', error);
        }
    }

    getAverageLatency(seconds = 10) {
        const cutoff = Date.now() - (seconds * 1000);
        const recent = this.measurements.filter(m => m.timestamp > cutoff);
        
        if (recent.length === 0) return 0;
        
        const total = recent.reduce((sum, m) => sum + m.jitterBufferDelay, 0);
        return Math.round(total / recent.length);
    }

    getStats() {
        const recentLatencies = this.measurements.slice(-10);
        const avg = recentLatencies.reduce((sum, m) => sum + m.jitterBufferDelay, 0) / recentLatencies.length;
        const max = Math.max(...recentLatencies.map(m => m.jitterBufferDelay));
        const min = Math.min(...recentLatencies.map(m => m.jitterBufferDelay));
        
        return {
            averageLatency: Math.round(avg),
            maxLatency: Math.round(max),
            minLatency: Math.round(min),
            currentLatency: Math.round(this.lastJitterBufferDelay),
            packetsLost: this.lastPacketsLost,
            jitter: Math.round(this.lastJitter),
            measurementsCount: this.measurements.length
        };
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.measurements = [];
        this.consumer = null;
        
        console.log('📊 Medición de latencia detenida');
    }
}