// Servicio de transporte mediasoup para el orador
class TransportService {
    constructor(socketClient) {
        this.socket = socketClient;
        this.device = null;
        this.sendTransport = null;
        this.producer = null;
        this.isConnected = false;
    }

    async initDevice() {
        return new Promise((resolve, reject) => {
            this.device = new mediasoupClient.Device();
            
            this.socket.emit('getRouterRtpCapabilities', async (routerRtpCapabilities) => {
                if (!routerRtpCapabilities) {
                    reject(new Error('No se recibieron capacidades del router'));
                    return;
                }
                
                try {
                    await this.device.load({ routerRtpCapabilities });
                    console.log('✅ Device cargado correctamente');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async createSendTransport() {
        return new Promise((resolve, reject) => {
            this.socket.emit('createWebRtcTransport', { sender: true }, async (params) => {
                if (params.error) {
                    reject(new Error(params.error));
                    return;
                }
                
                try {
                    this.sendTransport = this.device.createSendTransport(params);
                    
                    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        const timeout = setTimeout(() => {
                            errback(new Error('Timeout en conexión DTLS'));
                        }, 5000);
                        
                        this.socket.emit('transport-connect', { dtlsParameters }, () => {
                            clearTimeout(timeout);
                            callback();
                        });
                    });
                    
                    this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                        this.socket.emit('transport-produce', { kind, rtpParameters }, ({ id, error }) => {
                            if (error) {
                                errback(error);
                                return;
                            }
                            callback({ id });
                        });
                    });
                    
                    this.sendTransport.on('connectionstatechange', (state) => {
                        console.log('📡 Estado del transporte:', state);
                        if (state === 'connected') {
                            this.isConnected = true;
                        } else if (state === 'failed') {
                            this.isConnected = false;
                        }
                    });
                    
                    resolve(this.sendTransport);
                    
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async produceAudio(stream) {
        if (!this.sendTransport) {
            throw new Error('Transporte no inicializado');
        }
        
        const track = stream.getAudioTracks()[0];
        
        try {
            this.producer = await this.sendTransport.produce({
                track,
                encodings: [
                    {
                        maxBitrate: 24000,
                        priority: 'high',
                        networkPriority: 'high',
                        dtx: true,
                        active: true
                    }
                ],
                codecOptions: {
                    opusStereo: false,
                    opusFec: true,
                    opusDtx: true,
                    opusMaxPlaybackRate: 48000,
                    opusPtime: 20,
                    opusMaxAverageBitrate: 24000
                }
            });
            
            console.log('✅ Productor de audio creado, id:', this.producer.id);
            
            this.producer.on('transportclose', () => {
                console.log('🔌 Transporte cerrado');
                this.producer = null;
            });
            
            this.producer.on('trackended', () => {
                console.log('🎤 Track de audio terminado');
            });
            
            return this.producer;
            
        } catch (error) {
            console.error('❌ Error produciendo audio:', error);
            throw error;
        }
    }

    close() {
        if (this.producer) {
            this.producer.close();
            this.producer = null;
        }
        
        if (this.sendTransport) {
            this.sendTransport.close();
            this.sendTransport = null;
        }
        
        this.device = null;
        this.isConnected = false;
        console.log('🔌 Transport service cerrado');
    }
}
