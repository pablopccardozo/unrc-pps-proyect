// Servicio de consumidores mediasoup para el oyente
class ConsumerService {
    constructor(socketClient) {
        this.socket = socketClient;
        this.device = null;
        this.recvTransport = null;
        this.consumers = new Map(); // producerSocketId -> consumer
        this.isConnected = false;
        this.cachedSpeakers = []; // cache de speakers activos
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

    async createRecvTransport() {
        return new Promise((resolve, reject) => {
            this.socket.emit('createWebRtcTransport', { sender: false }, async (params) => {
                if (params.error) {
                    reject(new Error(params.error));
                    return;
                }
                
                try {
                    this.recvTransport = this.device.createRecvTransport(params);
                    
                    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        const timeout = setTimeout(() => {
                            errback(new Error('Timeout en conexión DTLS'));
                        }, 5000);
                        
                        this.socket.emit('transport-connect', { dtlsParameters }, () => {
                            clearTimeout(timeout);
                            callback();
                        });
                    });
                    
                    this.recvTransport.on('connectionstatechange', (state) => {
                        console.log('📡 Estado del transporte receptor:', state);
                        if (state === 'connected') {
                            this.isConnected = true;
                        } else if (state === 'failed') {
                            this.isConnected = false;
                        }
                    });
                    
                    resolve(this.recvTransport);
                    
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    // Establecer speakers precargados
    setCachedSpeakers(speakers) {
        // Si tenemos speakers precargados, usarlos
        if (this.cachedSpeakers && this.cachedSpeakers.length > 0) {
            const speakers = this.cachedSpeakers;
            this.cachedSpeakers = []; // Limpiar cache después de usar
            return speakers;
        }
        
        // Si no, consultar al servidor
        return new Promise((resolve) => {
            this.socket.emit('get-producers', (producers) => {
                resolve(producers || []);
            });
        });
    }

    async getSpeakers() {
        return new Promise((resolve) => {
            this.socket.emit('get-producers', (producers) => {
                resolve(producers || []);
            });
        });
    }

    async consumeSpeaker(producerSocketId) {
        if (!this.recvTransport) {
            throw new Error('Transporte no inicializado');
        }
        
        // Verificar si ya estamos consumiendo este orador
        if (this.consumers.has(producerSocketId)) {
            return this.consumers.get(producerSocketId);
        }
        
        return new Promise((resolve, reject) => {
            this.socket.emit(
                'consume',
                {
                    rtpCapabilities: this.device.rtpCapabilities,
                    remoteProducerSocketId: producerSocketId
                },
                async (params) => {
                    if (params.error) {
                        reject(new Error(params.error));
                        return;
                    }
                    
                    try {
                        // Crear el consumidor
                        const consumer = await this.recvTransport.consume(params);
                        
                        // Guardar referencia
                        this.consumers.set(producerSocketId, consumer);
                        
                        // Reanudar el consumo
                        this.socket.emit('resume-consumer', { consumerId: params.id });
                        
                        console.log(`✅ Consumer creado para producer: ${producerSocketId}`);
                        
                        resolve(consumer);
                        
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    removeConsumer(producerSocketId) {
        const consumer = this.consumers.get(producerSocketId);
        if (consumer && !consumer.closed) {
            consumer.close();
            this.consumers.delete(producerSocketId);
            console.log(`🔌 Consumer removido: ${producerSocketId}`);
        }
    }

    close() {
        // Cerrar todos los consumers
        this.consumers.forEach((consumer, producerId) => {
            if (consumer && !consumer.closed) {
                consumer.close();
            }
        });
        this.consumers.clear();
        
        // Cerrar transporte
        if (this.recvTransport) {
            this.recvTransport.close();
            this.recvTransport = null;
        }
        
        this.device = null;
        this.isConnected = false;
        console.log('🔌 Consumer service cerrado');
    }
}