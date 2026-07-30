// Punto de entrada para el orador
class SpeakerApp {
  constructor() {
    this.audioService = null;
    this.transportService = null;
    this.latencyMonitor = null;
    this.ui = uiHelpers;
    this.speakerName = sessionStorage.getItem("speakerName");
    this.isTransmitting = false;
    this.isPaused = false;
    this.isStopping = false; // bandera para evitar re-entradas en stopTransmission
    this.wakeLock = null;

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
    if (!this.speakerName) {
      this.ui.updateStatus("❌ Sesión no válida", "danger");
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 2000);
      return;
    }

    this.setupUI();

    // Conectar socket
    socketClient.connect();

    // Escuchar eventos
    socketClient.on("connect", () => this.onSocketConnect());
    socketClient.on("disconnect", () => this.onSocketDisconnect());
    socketClient.on("listeners-update", (listeners) =>
      this.updateListenersList(listeners),
    );
    socketClient.on("listener-latency-report", (report) =>
      this.onLatencyReport(report),
    );
    socketClient.on("producer-closed", (data) => this.onProducerClosed(data));
  }

  onSocketConnect() {
    console.log("✅ Conectado al servidor");
    // Registrar el orador
    socketClient.emit("register-speaker", this.speakerName);
    this.ui.updateStatus(
      `🎤 Listo para transmitir como ${this.speakerName}`,
      "success",
    );
  }

  onSocketDisconnect() {
    console.warn("🔌 Desconectado del servidor");
    if (this.isTransmitting || this.isPaused) {
      this.resetTransmissionState();
      this.ui.showAlert("Conexión perdida. Por favor, vuelve a iniciar la transmisión.", "warning");
    }
  }

  resetTransmissionState() {
    this.isTransmitting = false;
    this.isPaused = false;
    this.releaseWakeLock();

    this.latencyMonitor?.stop();
    if (this.transportService) {
      try { this.transportService.close(); } catch (e) {}
      this.transportService = null;
    }
    if (this.audioService) {
      try { this.audioService.stop(); } catch (e) {}
      this.audioService = null;
    }

    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    if (startBtn) startBtn.classList.remove("hidden");
    if (stopBtn) stopBtn.classList.add("hidden");

    const micVisualizer = document.getElementById("micVisualizer");
    if (micVisualizer) micVisualizer.style.display = "none";

    const micStatus = document.getElementById("micStatus");
    if (micStatus) micStatus.style.display = "none";

    const statsGrid = document.getElementById("statsGrid");
    if (statsGrid) statsGrid.classList.add("hidden");

    this.ui.updateStatus(`🎤 Listo para transmitir como ${this.speakerName}`, "success");
  }

  setupUI() {
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (startBtn) startBtn.onclick = () => this.startTransmission();
    if (stopBtn) {
      stopBtn.onclick = () => {
        if (this.isTransmitting && !this.isPaused) {
          this.pauseTransmission(); // Pausar, no cerrar sesión
        } else if (this.isPaused) {
          this.startTransmission(); // Reanudar
        }
      };
    }

    // Mantener logoutBtn para cerrar sesión completamente
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        if (confirm("¿Cerrar sesión? Se detendrá la transmisión.")) {
          this.stopTransmission();
        }
      };
    }
  }

  async startTransmission() {
    try {
      // Si estaba en pausa, reanudar
      if (
        this.isPaused &&
        this.transportService &&
        this.transportService.producer
      ) {
        await this.resumeTransmission();
        return;
      }

      // Si no, iniciar nueva transmisión (código existente)
      this.ui.updateStatus("🎤 Accediendo al micrófono...", "warning");

      this.requestWakeLock();

      this.audioService = new AudioService();
      const stream = await this.audioService.initMicrophone();

      this.transportService = new TransportService(socketClient);
      await this.transportService.initDevice();
      await this.transportService.createSendTransport();
      await this.transportService.produceAudio(stream);

      // Notificar inicio
      socketClient.emit("speaker-started", { status: true });

      this.latencyMonitor = new SpeakerLatencyMonitor(
        socketClient,
        this.transportService.producer,
      );
      this.latencyMonitor.start();

      this.isTransmitting = true;
      this.isPaused = false;

      this.ui.updateStatus("🔴 TRANSMITIENDO EN VIVO", "danger");

      // Mostrar elementos UI...
      const micVisualizer = document.getElementById("micVisualizer");
      if (micVisualizer) micVisualizer.style.display = "block";

      const micStatus = document.getElementById("micStatus");
      if (micStatus) micStatus.style.display = "block";

      const statsGrid = document.getElementById("statsGrid");
      if (statsGrid) statsGrid.classList.remove("hidden");

      const startBtn = document.getElementById("startBtn");
      const stopBtn = document.getElementById("stopBtn");
      if (startBtn) startBtn.classList.add("hidden");
      if (stopBtn) stopBtn.classList.remove("hidden");
      stopBtn.textContent = "⏸️ Pausar Transmisión"; // Cambiar texto

      this.ui.showAlert(`✅ Transmitiendo como ${this.speakerName}`, "success");
    } catch (error) {
      this.ui.updateStatus(`Error: ${error.message}`, "danger");
      console.error("Error en transmisión:", error);
      this.ui.showAlert(error.message, "error");
    }
  }

  // Pausar transmisión (sin cerrar sesión)
  async pauseTransmission() {
    if (!this.isTransmitting) return;

    this.isTransmitting = false;
    this.isPaused = true;

    // Pausar el productor (no cerrarlo)
    if (this.transportService && this.transportService.producer) {
      await this.transportService.producer.pause();
    }

    // Notificar al servidor que está en pausa
    socketClient.emit("speaker-paused", { status: true });

    this.latencyMonitor?.stop();

    // Actualizar UI
    this.ui.updateStatus("⏸️ TRANSMISIÓN EN PAUSA", "warning");

    const stopBtn = document.getElementById("stopBtn");
    if (stopBtn) {
      stopBtn.textContent = "▶️ Reanudar Transmisión";
      stopBtn.classList.remove("btn-danger");
      stopBtn.classList.add("btn-success");
    }

    const micVisualizer = document.getElementById("micVisualizer");
    if (micVisualizer) micVisualizer.style.display = "none";

    const micStatus = document.getElementById("micStatus");
    if (micStatus) micStatus.style.display = "none";

    this.ui.showAlert(
      'Transmisión pausada. Presiona "Reanudar" para continuar.',
      "info",
    );
  }

  // Reanudar transmisión
  async resumeTransmission() {
    if (!this.isPaused) return;

    this.isTransmitting = true;
    this.isPaused = false;

    // Reanudar el productor
    if (this.transportService && this.transportService.producer) {
      await this.transportService.producer.resume();
    }

    // Notificar al servidor
    socketClient.emit("speaker-started", { status: true });

    this.latencyMonitor = new SpeakerLatencyMonitor(
      socketClient,
      this.transportService.producer,
    );
    this.latencyMonitor.start();

    // Actualizar UI
    this.ui.updateStatus("🔴 TRANSMITIENDO EN VIVO", "danger");

    const stopBtn = document.getElementById("stopBtn");
    if (stopBtn) {
      stopBtn.textContent = "⏸️ Pausar Transmisión";
      stopBtn.classList.remove("btn-success");
      stopBtn.classList.add("btn-danger");
    }

    const micVisualizer = document.getElementById("micVisualizer");
    if (micVisualizer) micVisualizer.style.display = "block";

    const micStatus = document.getElementById("micStatus");
    if (micStatus) micStatus.style.display = "block";

    this.ui.showAlert("Transmisión reanudada", "success");
  }

  stopTransmission() {
    // Evitar re-entradas (p.ej. si producer-closed llega mientras ya se está cerrando)
    if (this.isStopping) return;
    this.isStopping = true;

    // Primero notificar al servidor que se va
    if (socketClient && socketClient.socket && socketClient.socket.connected) {
      socketClient.emit("speaker-stopped", { status: false });
    }

    this.releaseWakeLock();
    this.latencyMonitor?.stop();
    this.transportService?.close();
    this.audioService?.stop();

    // Limpiar sesión
    sessionStorage.removeItem("speakerName");

    // Redirigir al inicio
    setTimeout(() => {
      window.location.href = "/";
    }, 500);
  }

  updateListenersList(listeners) {
    console.log("📋 Actualizando lista de oyentes:", listeners);

    const listenersCountPanel = document.getElementById("listenersCount");
    if (listenersCountPanel) {
      listenersCountPanel.textContent = listeners.length;
    }
  }

  onLatencyReport(report) {
    if (
      this.latencyMonitor &&
      typeof this.latencyMonitor.addListenerReport === "function"
    ) {
      this.latencyMonitor.addListenerReport(report);
    } else {
      console.warn(
        "latencyMonitor no disponible o método addListenerReport no encontrado",
      );
    }
  }

  onProducerClosed(data) {
    // Ignorar si ya estamos en proceso de cierre (evita bucle de alertas)
    if (this.isStopping) return;

    if (data && data.producerSocketId && socketClient.socket && data.producerSocketId !== socketClient.socket.id) {
        return; // Este evento es para otro orador
    }
    console.log("⚠️ Productor cerrado por el servidor");
    this.ui.showAlert("Tu transmisión ha sido detenida", "warning");
    this.stopTransmission();
  }
}

// Iniciar aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.app = new SpeakerApp();
});
