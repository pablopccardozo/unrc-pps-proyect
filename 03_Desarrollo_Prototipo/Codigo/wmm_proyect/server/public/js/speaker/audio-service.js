// Servicio de audio para el orador
class AudioService {
    constructor() {
        this.stream = null;
        this.track = null;
        this.audioContext = null;
        this.mediaRecorder = null;
        this.isActive = false;
    }

    async initMicrophone() {
        try {
            console.log('🎤 Solicitando acceso al micrófono...');
            
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: false,
                    autoGainControl: true,
                    sampleRate: 48000,
                    channelCount: 1
                }
            });

            this.track = this.stream.getAudioTracks()[0];
            const settings = this.track.getSettings();
            
            console.log('🎤 Micrófono configurado:', {
                label: this.track.label,
                sampleRate: settings.sampleRate,
                channelCount: settings.channelCount,
                latency: settings.latency ? `${settings.latency * 1000}ms` : 'desconocida'
            });
            
            this.isActive = true;
            
            // Mostrar visualización del micrófono
            this.startVisualizer();
            
            return this.stream;
            
        } catch (error) {
            console.error('❌ Error accediendo al micrófono:', error);
            
            if (error.name === 'NotAllowedError') {
                throw new Error('Permiso denegado para acceder al micrófono');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No se encontró ningún micrófono conectado');
            }
            throw error;
        }
    }

    startVisualizer() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.stream);
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            source.connect(analyser);
            
            const waveform = document.getElementById('waveform');
            if (!waveform) return;
            
            const bars = [];
            for (let i = 0; i < 32; i++) {
                const bar = document.createElement('div');
                bar.className = 'waveform-bar';
                bar.style.height = '20px';
                waveform.appendChild(bar);
                bars.push(bar);
            }
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            const updateVisualizer = () => {
                if (!this.isActive) return;
                
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                const normalizedHeight = Math.min(60, 20 + (average / 255) * 40);
                
                bars.forEach(bar => {
                    const height = 20 + Math.random() * normalizedHeight;
                    bar.style.height = `${height}px`;
                });
                
                requestAnimationFrame(updateVisualizer);
            };
            
            updateVisualizer();
            
            // Activar visualización
            const micVisualizer = document.getElementById('micVisualizer');
            if (micVisualizer) {
                micVisualizer.classList.add('active');
            }
            
            const micStatus = document.getElementById('micStatus');
            if (micStatus) {
                micStatus.textContent = '🎙️ Micrófono activo - Transmitiendo audio';
                micStatus.classList.add('active');
            }
        }
    }

    getAudioTrack() {
        return this.track;
    }

    stop() {
        this.isActive = false;
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            this.stream = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.track = null;
        
        // Limpiar visualización
        const micVisualizer = document.getElementById('micVisualizer');
        if (micVisualizer) {
            micVisualizer.classList.remove('active');
        }
        
        const waveform = document.getElementById('waveform');
        if (waveform) {
            waveform.innerHTML = '';
        }
        
        const micStatus = document.getElementById('micStatus');
        if (micStatus) {
            micStatus.textContent = '🎤 Micrófono detenido';
            micStatus.classList.remove('active');
        }
        
        console.log('🔇 Audio service detenido');
    }
}
