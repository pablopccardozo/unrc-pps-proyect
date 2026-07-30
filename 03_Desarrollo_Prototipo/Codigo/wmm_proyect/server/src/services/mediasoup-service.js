const mediasoup = require('mediasoup');
const mediasoupConfig = require('../config/mediasoup-config');
const logger = require('../utils/logger');

class MediasoupService {
    constructor() {
        this.worker = null;
        this.router = null;
        this.transports = new Map(); // [socketId] => transport
        this.producers = new Map();   // [socketId] => producer
        this.consumers = new Map();   // [consumerId] => consumer
    }

    async initialize() {
        try {
            // Crear worker
            this.worker = await mediasoup.createWorker(mediasoupConfig.workerSettings);

            this.worker.on('died', () => {
                logger.error('❌ Worker de mediasoup muerto, reiniciando...');
                setTimeout(() => this.initialize(), 2000);
            });

            // Crear router
            this.router = await this.worker.createRouter({
                mediaCodecs: mediasoupConfig.mediaCodecs
            });

            logger.info('✅ Mediasoup Service inicializado');
            return this.router;
        } catch (error) {
            logger.error('❌ Error inicializando mediasoup:', error);
            throw error;
        }
    }

    async createWebRtcTransport(socketId) {
        try {
            const transport = await this.router.createWebRtcTransport(
                mediasoupConfig.webRtcTransportOptions
            );

            // Guardar transporte
            this.transports.set(socketId, transport);

            // Eventos de trace
            transport.on('trace', (trace) => {
                if (trace.type === 'bwe' && trace.name === 'bitrate') {
                    logger.debug(`Bitrate: ${trace.info.availableBitrate} bps`);
                }
            });

            return {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters
            };
        } catch (error) {
            logger.error(`Error creando transporte para ${socketId}:`, error);
            throw error;
        }
    }

    async connectTransport(socketId, dtlsParameters) {
        const transport = this.transports.get(socketId);
        if (!transport) {
            throw new Error('Transporte no encontrado');
        }
        await transport.connect({ dtlsParameters });
    }

    async createProducer(socketId, kind, rtpParameters) {
        const transport = this.transports.get(socketId);
        if (!transport) {
            throw new Error('Transporte no encontrado');
        }

        const producer = await transport.produce({ kind, rtpParameters });
        this.producers.set(socketId, producer);

        logger.info(`🎤 Productor ${kind} creado para ${socketId}`);
        return producer;
    }

    async createConsumer(socketId, producerSocketId, rtpCapabilities) {
        const transport = this.transports.get(socketId);
        const producer = this.producers.get(producerSocketId);

        if (!transport) throw new Error('Transporte del oyente no encontrado');
        if (!producer) throw new Error('Productor no encontrado');

        if (!this.router.canConsume({
            producerId: producer.id,
            rtpCapabilities
        })) {
            throw new Error('No se puede consumir este formato');
        }

        const consumer = await transport.consume({
            producerId: producer.id,
            rtpCapabilities,
            // Start unpaused to allow immediate audio playback for all speakers
            paused: false
        });

        consumer.on('transportclose', () => {
            this.consumers.delete(consumer.id);
        });

        consumer.on('producerclose', () => {
            this.consumers.delete(consumer.id);
        });

        this.consumers.set(consumer.id, consumer);

        return {
            id: consumer.id,
            producerId: producer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            consumer
        };
    }

    async resumeConsumer(consumerId) {
        const consumer = this.consumers.get(consumerId);
        if (consumer) {
            await consumer.resume();
            return true;
        }
        return false;
    }

    removeTransport(socketId) {
        const transport = this.transports.get(socketId);
        if (transport) {
            transport.close();
            this.transports.delete(socketId);
        }
    }

    closeProducer(socketId) {
        const producer = this.producers.get(socketId);
        if (producer) {
            producer.close();
            this.producers.delete(socketId);
        }
    }

    getRouterRtpCapabilities() {
        return this.router?.rtpCapabilities;
    }

    async close() {
        // Cerrar todos los transports
        for (const [socketId, transport] of this.transports) {
            transport.close();
        }

        // Cerrar router y worker
        if (this.router) await this.router.close();
        if (this.worker) await this.worker.close();

        this.transports.clear();
        this.producers.clear();
        this.consumers.clear();

        logger.info('🛑 Mediasoup Service cerrado');
    }
}

module.exports = new MediasoupService();