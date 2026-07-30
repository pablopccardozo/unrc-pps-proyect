// Punto de entrada para el oyente
class ListenerApp {
  constructor() {
    this.audioPlayer = null;
    this.consumerService = null;
    this.latencyMeasurer = null;
    this.ui = uiHelpers;
    this.listenerName = sessionStorage.getItem("listenerName") || "Oyente";
    this.isListening = false;
    this.hasActiveTransmission = false; // estado global
    this.speakersList = new Map(); // cache de speakers
    this.reconnecting = false; // evitar reconexiones automáticas
    this.wakeLock = null;
    this.waitingForReconnect = false;

    this.initialize();
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('✅ Screen Wake Lock activado');
        
        this.wakeLock.addEventListener('release', () => {
          console.log('⚠️ Screen Wake Lock liberado');
        });
      } catch (err) {
        console.warn(`No se pudo obtener Wake Lock: ${err.message}`);
      }
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().then(() => {
        this.wakeLock = null;
      });
    }
  }

  initialize() {
    document.addEventListener('visibilitychange', async () => {
      if (this.wakeLock !== null && document.visibilityState === 'visible') {
        this.requestWakeLock();
      }
    });
    socketClient.connect();

    socketClient.on("connect", () => this.onSocketConnect());

    socketClient.on("new-producer", (producer) => {
      console.log(
        `🎤 Nuevo orador: ${producer.name}, escuchando: ${this.isListening}`,
      );
      if (this.isListening && !this.reconnecting) {
        this.onNewSpeaker(producer);
      }
    });

    // Manejar cierre de productor
    socketClient.on("producer-closed", ({ producerSocketId, reason }) => {
      console.log(
        `🔌 Productor cerrado: ${producerSocketId}, razón: ${reason}, escuchando: ${this.isListening}`,
      );

      // Actualizar estado en la lista local
      const speaker = this.speakersList.get(producerSocketId);
      if (speaker) {
        speaker.hasProducer = false;
        this.speakersList.set(producerSocketId, speaker);
      }

      // Si estamos escuchando y este era el único speaker activo
      if (this.isListening) {
        // Remover el speaker del audio
        this.onSpeakerLeft(producerSocketId);

        // Verificar si quedan speakers activos
        const remainingActive = Array.from(this.speakersList.values()).filter(
          (s) => s.hasProducer === true,
        );

        if (remainingActive.length === 0) {
          console.log("⚠️ No quedan speakers activos, desconectando...");
          this.handleNoActiveSpeakers();
        }
      }

      
    });

    // Manejar pausa de productor
    socketClient.on('producer-paused', ({ producerSocketId }) => {
        console.log(`⏸️ Productor en pausa: ${producerSocketId}`);
        
        const speaker = this.speakersList.get(producerSocketId);
        if (speaker) {
            speaker.isPaused = true;
            this.speakersList.set(producerSocketId, speaker);
            
            // Si estamos escuchando, silenciar este speaker pero no remover
            if (this.isListening && this.audioPlayer) {
                this.audioPlayer.mute(producerSocketId);
            }
            
            this.updateSpeakersUI(Array.from(this.speakersList.values()));
        }
    });
    
    // Manejar reanudación de productor
    socketClient.on('producer-resumed', ({ producerSocketId }) => {
        console.log(`▶️ Productor reanudado: ${producerSocketId}`);
        
        const speaker = this.speakersList.get(producerSocketId);
        if (speaker) {
            speaker.hasProducer = true;
            speaker.isPaused = false;
            this.speakersList.set(producerSocketId, speaker);
            
            // Si estamos escuchando, reanudar este speaker
            if (this.isListening && this.audioPlayer) {
                this.audioPlayer.unmute(producerSocketId);
            }
            
            this.updateSpeakersUI(Array.from(this.speakersList.values()));
        }
    });

    socketClient.on("speakers-status-update", (data) => {
      console.log("📡 Actualización de speakers:", data);
      this.onSpeakersStatusUpdate(data);
    });

    this.setupUI();
  }

  onSocketConnect() {
    socketClient.emit("register-listener", this.listenerName);
    this.ui.updateStatus("Conectado al servidor", "success");
  }

  // Manejar error de registro
  onRegistrationError(error) {
    console.error("❌ Error de registro:", error);
    this.registrationError = true;
    this.ui.showAlert(error.message, "error");
    this.ui.updateStatus(error.message, "danger");

    // Deshabilitar botón de conexión
    const listenBtn = document.getElementById("listenBtn");
    if (listenBtn) {
      listenBtn.disabled = true;
      listenBtn.textContent = "⏸️ No hay transmisiones activas";
      listenBtn.style.opacity = "0.5";
    }

    // Redirigir después de 3 segundos
    setTimeout(() => {
      window.location.href = "/";
    }, 3000);
  }

  setupUI() {
    const listenBtn = document.getElementById("listenBtn");
    const leaveBtn = document.getElementById("leaveBtn");
    const volumeSlider = document.getElementById("volumeSlider");

    if (listenBtn) listenBtn.onclick = () => this.startListening();
    if (leaveBtn) leaveBtn.onclick = () => this.leave();

    if (volumeSlider) {
      volumeSlider.oninput = (e) => {
        const value = e.target.value;
        const volumeValue = document.getElementById("volumeValue");
        if (volumeValue) volumeValue.textContent = `${value}%`;
        if (this.audioPlayer) {
          this.audioPlayer.setMasterVolume(value / 100);
        }
      };
    }

    this.ui.createLatencyIndicator();
    this.ui.createSpeakersPanel();
  }

  // Manejar actualizaciones de estado de speakers
  onSpeakersStatusUpdate(data) {
    console.log("📡 Actualización de speakers:", data);

    const previousState = this.hasActiveTransmission;
    this.hasActiveTransmission = data.hasActiveTransmission;

    // Actualizar la lista de speakers
    if (data.allSpeakers) {
      data.allSpeakers.forEach((speaker) => {
        this.speakersList.set(speaker.id, speaker);
      });
      this.updateSpeakersUI(data.allSpeakers);
    }

    const listenBtn = document.getElementById("listenBtn");

    // CASO 1: No hay transmisión activa
    if (!this.hasActiveTransmission) {
      // Si estábamos escuchando, desconectar
      if (this.isListening) {
        console.log("🔴 Transmisión perdida, desconectando...");
        this.handleNoActiveSpeakers();
      }

      // Asegurar que el botón está deshabilitado
      if (listenBtn && !this.isListening) {
        listenBtn.disabled = true;
        listenBtn.textContent = "⏸️ Esperando transmisión...";
        listenBtn.style.opacity = "0.5";
        this.ui.updateStatus("⏳ No hay transmisiones activas", "warning");
      }
    }
    // CASO 2: Hay transmisión activa Y no estamos escuchando
    else if (this.hasActiveTransmission && !this.isListening) {
      if (this.waitingForReconnect) {
        console.log("🔄 Auto-reconectando al auditorio...");
        this.waitingForReconnect = false;
        this.startListening();
      } else {
        if (listenBtn) {
          listenBtn.disabled = false;
          listenBtn.textContent = "🎧 Conectar al Auditorio";
          listenBtn.style.opacity = "1";
          this.ui.updateStatus("✅ Hay transmisiones activas", "success");
        }
      }
    }
    // CASO 3: Hay transmisión activa Y ya estamos escuchando (no hacer nada)
  }

  // Manejar cuando no hay speakers activos
  handleNoActiveSpeakers() {
    if (!this.isListening) return;

    console.log("🔴 No hay transmisiones activas, desconectando...");
    this.waitingForReconnect = true; // Activar auto-reconexión

    // Mostrar mensaje al usuario
    this.ui.showAlert("El orador ha detenido la transmisión, esperando reconexión...", "warning");

    // Detener toda la reproducción
    if (this.audioPlayer) {
      this.audioPlayer.close();
      this.audioPlayer = null;
    }

    // Limpiar consumer service pero mantener la referencia para reconectar
    if (this.consumerService) {
      // No cerrar completamente, solo limpiar consumers
      this.consumerService.consumers?.forEach((consumer, id) => {
        if (consumer && !consumer.closed) consumer.close();
      });
      this.consumerService.consumers?.clear();
    }

    // Actualizar estado
    this.isListening = false;
    this.hasActiveTransmission = false;
    this.releaseWakeLock();

    // Actualizar UI
    this.ui.updateStatus("⏳ No hay transmisiones activas", "warning");
    this.ui.toggleButtons(false);

    // Deshabilitar botón hasta que vuelva a haber transmisión
    const listenBtn = document.getElementById("listenBtn");
    if (listenBtn) {
      listenBtn.disabled = true;
      listenBtn.textContent = "⏸️ Esperando transmisión...";
    }

    // Ocultar paneles
    const speakersPanel = document.getElementById("speakersPanel");
    if (speakersPanel) speakersPanel.style.display = "none";

    const latencyIndicator = document.getElementById("latencyIndicator");
    if (latencyIndicator) latencyIndicator.style.display = "none";

    // Actualizar la UI de speakers para mostrar estado "ESPERANDO"
    this.updateSpeakersUI(Array.from(this.speakersList.values()));
  }

  // Actualizar UI con lista de speakers y su estado
  updateSpeakersUI(speakers) {
    const speakersContainer = document.getElementById('speakersList');
    if (!speakersContainer) return;
    
    if (!speakers || speakers.length === 0) {
        speakersContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎧</div>
                <p>No hay oradores registrados</p>
                <small>Esperando que alguien se registre</small>
            </div>
        `;
        return;
    }
    
    speakersContainer.innerHTML = speakers.map(speaker => {
        let statusHtml = '';
        let statusClass = '';
        
        if (speaker.hasProducer && !speaker.isPaused) {
            statusHtml = '<span class="status-badge success">🔴 TRANSMITIENDO</span>';
            statusClass = 'active';
        } else if (speaker.hasProducer && speaker.isPaused) {
            statusHtml = '<span class="status-badge warning">⏸️ EN PAUSA</span>';
            statusClass = 'paused';
        } else {
            statusHtml = '<span class="status-badge muted">⏳ ESPERANDO</span>';
            statusClass = 'inactive';
        }
        
        return `
            <div class="speaker-item ${statusClass}">
                <div class="speaker-info">
                    <div class="speaker-avatar">
                        ${(speaker.hasProducer && !speaker.isPaused) ? '🎤' : (speaker.isPaused ? '⏸️' : '👤')}
                    </div>
                    <div class="speaker-details">
                        <div class="speaker-name">${this.escapeHtml(speaker.name)}</div>
                        <div class="speaker-status">${statusHtml}</div>
                    </div>
                </div>
                ${speaker.hasProducer && this.isListening ? 
                    `<div class="speaker-volume">
                        <input type="range" min="0" max="100" value="80" 
                               onchange="window.app?.setSpeakerVolume('${speaker.id}', this.value)">
                    </div>` : ''
                }
            </div>
        `;
    }).join('');
    
    const activeCount = speakers.filter(s => s.hasProducer === true).length;
    const headerTitle = document.querySelector('.speakers-header h3');
    if (headerTitle) {
        headerTitle.innerHTML = `🎙️ Oradores <span class="count-badge">${activeCount}</span>`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  async startListening() {
    // Verificar si hay transmisión activa
    if (!this.hasActiveTransmission) {
      this.ui.showAlert(
        "No hay oradores transmitiendo en este momento",
        "warning",
      );
      return;
    }

    // Si ya está escuchando, no hacer nada
    if (this.isListening) {
      console.log("Ya estás escuchando");
      return;
    }

    this.waitingForReconnect = false;
    this.requestWakeLock();

    try {
      this.ui.updateStatus("🔄 Conectando al auditorio...", "warning");

      // Inicializar servicios
      this.audioPlayer = new AudioPlayer();
      this.consumerService = new ConsumerService(socketClient);
      this.latencyMeasurer = new ListenerLatencyMeasurer(
        socketClient,
        this.listenerName,
      );

      this.audioPlayer.setLatencyMeasurer(this.latencyMeasurer);

      // Inicializar dispositivo
      await this.consumerService.initDevice();

      // Crear transporte receptor
      await this.consumerService.createRecvTransport();

      // Marcar que está escuchando
      this.isListening = true;
      this.reconnecting = false;

      // Obtener solo speakers que están transmitiendo activamente
      const activeSpeakers = Array.from(this.speakersList.values()).filter(
        (s) => s.hasProducer === true,
      );

      console.log(`🔍 Conectando a ${activeSpeakers.length} speakers activos`);

      if (activeSpeakers.length === 0) {
        this.ui.updateStatus(
          "⚠️ No hay oradores activos en este momento",
          "warning",
        );
        // No desconectar, esperar a que llegue un new-producer
      } else {
        for (const speaker of activeSpeakers) {
          await this.addSpeaker(speaker.id, speaker.name);
        }
      }

      // Iniciar medición de latencia
      this.latencyMeasurer.start();

      this.ui.updateStatus("🔊 ESCUCHANDO AUDITORIO", "success");
      this.ui.toggleButtons(true);

      const speakersPanel = document.getElementById("speakersPanel");
      if (speakersPanel) speakersPanel.style.display = "block";

      this.updateSpeakersUI(Array.from(this.speakersList.values()));
      this.ui.showAlert("✅ Conectado al auditorio", "success");
    } catch (error) {
      console.error("Error al iniciar escucha:", error);
      this.isListening = false;
      this.ui.updateStatus(`Error: ${error.message}`, "danger");
      this.ui.showAlert(error.message, "error");
    }
  }

  async addSpeaker(speakerId, name) {
    // Verificar que consumerService existe
    if (!this.consumerService) {
      console.error("❌ consumerService no inicializado");
      return;
    }

    try {
      const consumer = await this.consumerService.consumeSpeaker(speakerId);
      await this.audioPlayer.play(consumer, speakerId, name);
      console.log(`✅ Audio de ${name} activado`);
    } catch (error) {
      if (error.message !== "Productor no encontrado") {
        console.error(`Error agregando orador ${name}:`, error);
      }
    }
  }

  setSpeakerVolume(speakerId, volume) {
    if (this.audioPlayer) {
      this.audioPlayer.setVolume(speakerId, volume / 100);
    }
  }

  onNewSpeaker(producer) {
    // Este método solo se llama si isListening === true
    console.log(`🎤 Nuevo orador: ${producer.name}`);

    // Actualizar o agregar el orador en la lista local con hasProducer: true
    this.speakersList.set(producer.producerSocketId, {
      id: producer.producerSocketId,
      name: producer.name,
      hasProducer: true,
    });

    // Verificar si ya existe un consumer activo para este orador.
    // No usar speakersList como fuente de verdad aquí: el orador puede
    // estar en la lista (por un speakers-status-update previo) pero sin
    // consumer de audio creado todavía.
    const alreadyConsuming = this.consumerService?.consumers?.has(producer.producerSocketId);
    if (!alreadyConsuming) {
      // Conectar audio y actualizar UI
      this.updateSpeakersUI(Array.from(this.speakersList.values()));
      this.addSpeaker(producer.producerSocketId, producer.name);
    } else {
      console.log(`ℹ️ Ya existe consumer para ${producer.name}, solo actualizando UI`);
      this.updateSpeakersUI(Array.from(this.speakersList.values()));
    }
  }

  onSpeakerLeft(speakerId) {
    console.log(`👋 Orador se fue: ${speakerId}`);
    this.speakersList.delete(speakerId);
    this.audioPlayer?.remove(speakerId);
    this.updateSpeakersUI(Array.from(this.speakersList.values()));
  }

  // Método para reconectar manualmente
  async reconnect() {
    if (this.hasActiveTransmission && !this.isListening) {
      this.reconnecting = true;
      await this.startListening();
      this.reconnecting = false;
    }
  }

  leave() {
    this.isListening = false;
    this.hasActiveTransmission = false;
    this.reconnecting = false;
    this.waitingForReconnect = false;

    this.releaseWakeLock();
    this.latencyMeasurer?.stop();
    this.consumerService?.close();
    this.audioPlayer?.close();

    this.consumerService = null;
    this.audioPlayer = null;
    this.latencyMeasurer = null;

    socketClient.disconnect();

    const speakersPanel = document.getElementById("speakersPanel");
    if (speakersPanel) speakersPanel.style.display = "none";

    const latencyIndicator = document.getElementById("latencyIndicator");
    if (latencyIndicator) latencyIndicator.style.display = "none";

    this.ui.updateStatus("Desconectado del auditorio", "info");
    this.ui.toggleButtons(false);

    setTimeout(() => {
      window.location.href = "/";
    }, 500);
  }
}

window.ListenerApp = ListenerApp;

document.addEventListener("DOMContentLoaded", () => {
  window.app = new ListenerApp();
});
