// Monitor de latencia para el orador usando RTT de WebRTC
class SpeakerLatencyMonitor {
    constructor(socketClient, producer) {
        this.socket = socketClient;
        this.producer = producer;
        this.interval = null;
        this.listenerLatencies = new Map();
        this.lastRTT = 0;
        this.lastBitrate = 0;
        this.lastPacketsSent = 0;
        this.speakerName = sessionStorage.getItem('speakerName') || 'Orador';
        this.pc = null;
    }

    start() {
        console.log('📊 Iniciando monitor de latencia con RTT...');
        
        // Intentar obtener el PeerConnection de diferentes formas
        this.getPeerConnection();
        
        this.interval = setInterval(async () => {
            await this.monitorStats();
        }, 2000);
    }

    getPeerConnection() {
        try {
            // Método 1: A través del producer
            if (this.producer && this.producer._transport) {
                // Mediasoup v3
                if (this.producer._transport._handler && this.producer._transport._handler._pc) {
                    this.pc = this.producer._transport._handler._pc;
                    console.log('✅ PeerConnection obtenida (método 1)');
                    return true;
                }
                // Mediasoup v2
                if (this.producer._transport._pc) {
                    this.pc = this.producer._transport._pc;
                    console.log('✅ PeerConnection obtenida (método 2)');
                    return true;
                }
            }
            
            // Método 2: A través del transporte global
            if (window.app && window.app.transportService && window.app.transportService.sendTransport) {
                const transport = window.app.transportService.sendTransport;
                if (transport._handler && transport._handler._pc) {
                    this.pc = transport._handler._pc;
                    console.log('✅ PeerConnection obtenida (método 3)');
                    return true;
                }
            }
            
            console.warn('⚠️ No se pudo obtener el PeerConnection');
            return false;
        } catch (err) {
            console.warn('Error obteniendo PeerConnection:', err);
            return false;
        }
    }

    async monitorStats() {
        if (!this.producer || this.producer.closed) {
            return;
        }
        
        // Si no tenemos PC, intentar obtenerlo nuevamente
        if (!this.pc) {
            this.getPeerConnection();
            if (!this.pc) return;
        }
        
        try {
            let rttMs = 0;
            let bitrate = 0;
            let packetsSent = 0;
            
            const stats = await this.pc.getStats();
            
            stats.forEach(report => {
                // Obtener RTT desde candidate-pair
                if (report.type === 'candidate-pair') {
                    if (report.nominated === true || report.state === 'succeeded') {
                        if (report.currentRoundTripTime !== undefined && report.currentRoundTripTime > 0) {
                            rttMs = Math.round(report.currentRoundTripTime * 1000);
                            //console.log(`📡 RTT desde candidate-pair: ${rttMs}ms`);
                        }
                    }
                }
                
                // Obtener estadísticas de envío
                if (report.type === 'outbound-rtp' && report.kind === 'audio') {
                    packetsSent = report.packetsSent || 0;
                    
                    // Calcular bitrate
                    if (report.bytesSent && this.lastBytesSent) {
                        const bytesDiff = report.bytesSent - this.lastBytesSent;
                        const timeDiff = (report.timestamp - (this.lastTimestamp || report.timestamp)) / 1000;
                        if (timeDiff > 0 && timeDiff < 5) {
                            bitrate = Math.round((bytesDiff * 8) / 1024 / timeDiff);
                        }
                    }
                    this.lastBytesSent = report.bytesSent;
                    this.lastTimestamp = report.timestamp;
                }
            });
            
            // Actualizar valores
            if (rttMs > 0) {
                this.lastRTT = rttMs;
            }
            this.lastBitrate = bitrate;
            this.lastPacketsSent = packetsSent;
            
            // Latencia unidireccional estimada = RTT / 2
            const estimatedNetworkLatency = Math.round(this.lastRTT / 2);
            
            // Actualizar estadísticas en UI
            this.updateStatsUI(estimatedNetworkLatency, bitrate, packetsSent);
            
            // Enviar estadísticas al servidor
            this.socket.emit('report-stats', {
                role: 'orador',
                rtt: this.lastRTT,
                estimatedNetworkLatency: estimatedNetworkLatency,
                bitrate: bitrate,
                packetsSent: packetsSent,
                totalListeners: this.listenerLatencies.size
            });
            
            // Log periódico
            /*if (this.lastRTT > 0 && Math.random() < 0.2) {
                console.log(`📊 RTT: ${this.lastRTT}ms | Latencia estimada: ${estimatedNetworkLatency}ms | Bitrate: ${bitrate}kbps`);
            }*/
            
        } catch (err) {
            console.warn('Error obteniendo estadísticas:', err);
        }
    }

    updateStatsUI(latency, bitrate, packets) {
        const latencyValue = document.getElementById('latencyValue');
        const bitrateValue = document.getElementById('bitrateValue');
        
        if (latencyValue) {
            const color = latency < 100 ? '#4CAF50' : (latency < 200 ? '#FFC107' : '#f44336');
            latencyValue.innerHTML = `${latency} <span id="latencyDot" style="display:inline-block; width:12px; height:12px; border-radius:50%; margin-left:5px; background-color:${color};"></span>`;
        }
        if (bitrateValue) bitrateValue.textContent = bitrate;
    }

    addListenerReport(report) {
        this.listenerLatencies.set(report.listenerId, {
            latency: report.latency,
            jitterBufferDelay: report.jitterBufferDelay,
            lastUpdate: Date.now()
        });
        
        if (report.latency > 250) {
            console.warn(`⚠️ Latencia alta: ${report.latency}ms para ${report.listenerName}`);
        }
    }

    getAverageListenerLatency() {
        if (this.listenerLatencies.size === 0) return 0;
        
        let total = 0;
        this.listenerLatencies.forEach((data) => {
            total += data.latency;
        });
        
        return Math.round(total / this.listenerLatencies.size);
    }

    getRTT() {
        return this.lastRTT;
    }

    getEstimatedLatency() {
        return Math.round(this.lastRTT / 2);
    }

    getStats() {
        return {
            rtt: this.lastRTT,
            estimatedLatency: Math.round(this.lastRTT / 2),
            bitrate: this.lastBitrate,
            packetsSent: this.lastPacketsSent,
            listeners: this.listenerLatencies.size,
            averageListenerLatency: this.getAverageListenerLatency()
        };
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.listenerLatencies.clear();
        console.log('📊 Monitor de latencia detenido');
    }
}