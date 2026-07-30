// Reproductor de audio para el oyente
class AudioPlayer {
    constructor() {
        this.audioElements = new Map(); // speakerId -> { audio, consumer, name, stream }
        this.masterVolume = 0.8;
        this.latencyMeasurer = null;
    }

    setLatencyMeasurer(measurer) {
        this.latencyMeasurer = measurer;
    }

    async play(consumer, speakerId, name) {
        try {
            const stream = new MediaStream([consumer.track]);
            
            // Crear elemento de audio
            const audio = document.createElement('audio');
            audio.id = `audio-${speakerId}`;
            audio.srcObject = stream;
            
            // Configuración para baja latencia
            audio.autoplay = true;
            audio.muted = false;
            audio.setAttribute('playsinline', 'true');
            
            if ('playoutDelayHint' in audio) {
                audio.playoutDelayHint = 0.02;
            }
            
            const defaultIndividualVolume = 0.8;
            audio.volume = defaultIndividualVolume * this.masterVolume;
            
            audio.addEventListener('play', () => {
                console.log(`🔊 Audio de ${name} reproduciéndose`);
            });
            
            audio.addEventListener('error', (e) => {
                console.error(`❌ Error en audio de ${name}:`, e);
            });
            
            document.body.appendChild(audio);
            
            // Guardar referencia
            this.audioElements.set(speakerId, {
                audio,
                consumer,
                name,
                stream,
                individualVolume: defaultIndividualVolume
            });
            
            // Conectar el consumer al medidor de latencia
            if (this.latencyMeasurer) {
                this.latencyMeasurer.setConsumer(consumer);
            }
            
            try {
                await audio.play();
                console.log(`✅ Audio de ${name} activado`);
            } catch (err) {
                console.warn('Autoplay bloqueado:', err);
                this.handleAutoplayBlocked(audio, name);
            }
            
            consumer.on('transportclose', () => {
                console.log(`🔌 Transporte cerrado para ${name}`);
                this.remove(speakerId);
            });
            
            consumer.on('trackended', () => {
                console.log(`🎤 Track terminado para ${name}`);
                this.remove(speakerId);
            });
            
        } catch (error) {
            console.error(`Error reproduciendo audio de ${name}:`, error);
            throw error;
        }
    }

    handleAutoplayBlocked(audio, name) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = '⚠️ Toca la pantalla para activar audio';
            statusElement.classList.add('warning');
        }
        
        const activateAudio = async () => {
            try {
                await audio.play();
                console.log(`✅ Audio de ${name} activado tras interacción`);
                
                const statusElement = document.getElementById('status');
                if (statusElement && statusElement.textContent.includes('Toca la pantalla')) {
                    statusElement.textContent = '🔊 ESCUCHANDO AUDITORIO';
                    statusElement.classList.remove('warning');
                    statusElement.classList.add('success');
                }
                
                window.removeEventListener('click', activateAudio);
                window.removeEventListener('touchstart', activateAudio);
            } catch (err) {
                console.warn('No se pudo activar audio:', err);
            }
        };
        
        window.addEventListener('click', activateAudio, { once: true });
        window.addEventListener('touchstart', activateAudio, { once: true });
    }

    setMasterVolume(value) {
        this.masterVolume = Math.min(1, Math.max(0, value));
        
        this.audioElements.forEach(data => {
            if (data.audio) {
                const indVol = data.individualVolume !== undefined ? data.individualVolume : 0.8;
                data.audio.volume = indVol * this.masterVolume;
            }
        });
    }

    setVolume(speakerId, volume) {
        const data = this.audioElements.get(speakerId);
        if (data && data.audio) {
            data.individualVolume = volume;
            data.audio.volume = volume * this.masterVolume;
        }
    }

    mute(speakerId) {
        const data = this.audioElements.get(speakerId);
        if (data && data.audio) {
            data.audio.muted = true;
        }
    }

    unmute(speakerId) {
        const data = this.audioElements.get(speakerId);
        if (data && data.audio) {
            data.audio.muted = false;
        }
    }

    remove(speakerId) {
        const data = this.audioElements.get(speakerId);
        if (data) {
            if (data.audio) {
                data.audio.pause();
                data.audio.srcObject = null;
                data.audio.remove();
            }
            
            if (data.consumer && !data.consumer.closed) {
                data.consumer.close();
            }
            
            this.audioElements.delete(speakerId);
            console.log(`🔇 Audio removido: ${data.name || speakerId}`);
        }
    }

    close() {
        this.audioElements.forEach((data, speakerId) => {
            this.remove(speakerId);
        });
        this.audioElements.clear();
        console.log('🔇 Audio player cerrado');
    }

    getActiveSpeakers() {
        return Array.from(this.audioElements.keys());
    }
}
