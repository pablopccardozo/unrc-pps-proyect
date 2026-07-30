const logger = require('../utils/logger');

class RoomService {
    constructor() {
        this.speakers = new Map(); // [socketId] => { name, joinedAt, hasProducer }
        this.listeners = new Map();
        this.speakerListeners = new Map();
    }

    addSpeaker(socketId, name) {
        this.speakers.set(socketId, {
            name,
            joinedAt: Date.now(),
            hasProducer: false,  // IMPORTANTE: Inicialmente false
            isPaused: false
        });
        
        if (!this.speakerListeners.has(socketId)) {
            this.speakerListeners.set(socketId, new Set());
        }
        
        logger.info(`👤 Orador agregado: ${name} (${socketId}) - Sin productor`);
        return this.getSpeakerInfo(socketId);
    }

    setSpeakerProducerActive(socketId, active) {
        const speaker = this.speakers.get(socketId);
        if (speaker) {
            speaker.hasProducer = active;
            logger.info(`🎤 Speaker ${speaker.name} productor activo: ${active}`);
            
            if (!active) {
                // Si el productor ya no está activo, vaciamos la lista de oyentes
                if (this.speakerListeners.has(socketId)) {
                    this.speakerListeners.get(socketId).clear();
                    logger.info(`🧹 Limpiados los oyentes del orador ${speaker.name}`);
                }
            }
            
            // Notificar a todos los clientes sobre el cambio de estado
            return true;
        }
        return false;
    }

    setSpeakerHasProducer(socketId, hasProducer) {
        const speaker = this.speakers.get(socketId);
        if (speaker) {
            speaker.hasProducer = hasProducer;
            logger.info(`🎤 Speaker ${speaker.name} productor activo: ${hasProducer}`);
        }
    }

    setSpeakerPaused(socketId, isPaused) {
        const speaker = this.speakers.get(socketId);
        if (speaker && speaker.hasProducer) {
            speaker.isPaused = isPaused;
            logger.info(`🎤 Speaker ${speaker.name} en pausa: ${isPaused}`);
            return true;
        }
        return false;
    }

    hasActiveSpeaker() {
        return Array.from(this.speakers.values()).some(speaker => speaker.hasProducer === true);
    }

    getActiveSpeakers() {
        return Array.from(this.speakers.entries())
            .filter(([_, data]) => data.hasProducer === true)
            .map(([id, data]) => ({
                id,
                name: data.name,
                joinedAt: data.joinedAt,
                listeners: this.getSpeakerListeners(id)
            }));
    }

    getActiveTransmittingSpeakers() {
        return Array.from(this.speakers.entries())
            .filter(([_, data]) => data.hasProducer === true)
            .map(([id, data]) => ({
                id,
                name: data.name,
                joinedAt: data.joinedAt,
                hasProducer: data.hasProducer,
                isPaused: data.isPaused || false,
                listeners: this.getSpeakerListeners(id)
            }));
    }

    hasActiveTransmission() {
        return Array.from(this.speakers.values()).some(speaker => speaker.hasProducer === true);
    }

    getAllSpeakersWithStatus() {
        return Array.from(this.speakers.entries()).map(([id, data]) => ({
            id,
            name: data.name,
            joinedAt: data.joinedAt,
            hasProducer: data.hasProducer,
            isPaused: data.isPaused || false,
            isTransmitting: data.hasProducer && !data.isPaused,  // Alias para claridad
            listeners: this.getSpeakerListeners(id)
        }));
    }
    
    addListener(socketId, name) {
        this.listeners.set(socketId, {
            name,
            joinedAt: Date.now()
        });
        logger.info(`👂 Oyente agregado: ${name} (${socketId})`);
        return this.getListenerInfo(socketId);
    }

    removeUser(socketId) {
        // Verificar si es orador
        if (this.speakers.has(socketId)) {
            const speaker = this.speakers.get(socketId);
            this.speakers.delete(socketId);
            this.speakerListeners.delete(socketId);
            logger.info(`👤 Orador removido: ${speaker.name} (${socketId})`);
            return { role: 'speaker', name: speaker.name };
        }
        
        // Verificar si es oyente
        if (this.listeners.has(socketId)) {
            const listener = this.listeners.get(socketId);
            this.listeners.delete(socketId);
            
            // Remover de todas las listas de oradores
            this.speakerListeners.forEach((listeners, speakerId) => {
                listeners.delete(socketId);
            });
            
            logger.info(`👂 Oyente removido: ${listener.name} (${socketId})`);
            return { role: 'listener', name: listener.name };
        }
        
        return null;
    }

    addListenerToSpeaker(listenerId, speakerId) {
        if (this.speakerListeners.has(speakerId)) {
            this.speakerListeners.get(speakerId).add(listenerId);
            return true;
        }
        return false;
    }

    removeListenerFromSpeaker(listenerId, speakerId) {
        if (this.speakerListeners.has(speakerId)) {
            this.speakerListeners.get(speakerId).delete(listenerId);
        }
    }

    getSpeakerListeners(speakerId) {
        const listeners = this.speakerListeners.get(speakerId) || new Set();
        return Array.from(listeners).map(id => ({
            id,
            name: this.listeners.get(id)?.name || 'Desconocido'
        }));
    }

    getAllSpeakers() {
        return Array.from(this.speakers.entries()).map(([id, data]) => ({
            id,
            name: data.name,
            joinedAt: data.joinedAt,
            hasProducer: data.hasProducer,
            listeners: this.getSpeakerListeners(id)
        }));
    }

    getAllListeners() {
        return Array.from(this.listeners.entries()).map(([id, data]) => ({
            id,
            name: data.name,
            joinedAt: data.joinedAt
        }));
    }

    getSpeakerInfo(socketId) {
        const speaker = this.speakers.get(socketId);
        if (!speaker) return null;
        return {
            id: socketId,
            name: speaker.name,
            joinedAt: speaker.joinedAt,
            listeners: this.getSpeakerListeners(socketId)
        };
    }

    getListenerInfo(socketId) {
        const listener = this.listeners.get(socketId);
        if (!listener) return null;
        return {
            id: socketId,
            name: listener.name,
            joinedAt: listener.joinedAt
        };
    }

    getStats() {
        return {
            totalSpeakers: this.speakers.size,
            totalListeners: this.listeners.size,
            speakers: this.getAllSpeakers(),
            listeners: this.getAllListeners()
        };
    }
}

module.exports = new RoomService();