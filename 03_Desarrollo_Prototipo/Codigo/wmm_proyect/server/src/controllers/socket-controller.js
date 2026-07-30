const logger = require("../utils/logger");
const constants = require("../config/constants");

class SocketController {
  initialize(io, services) {
    this.io = io;
    this.mediasoupService = services.mediasoupService;
    this.roomService = services.roomService;
    this.latencyService = services.latencyService;
    this.authService = services.authService;

    io.on("connection", (socket) => this.handleConnection(socket));
  }

  handleConnection(socket) {
    logger.info(`🔌 Nueva conexión: ${socket.id}`);

    // Eventos de autenticación
    socket.on("register-speaker", (name) => this.registerSpeaker(socket, name));
    socket.on("register-listener", (name) =>
      this.registerListener(socket, name),
    );

    // Eventos de mediasoup
    socket.on("getRouterRtpCapabilities", (callback) =>
      this.getRouterRtpCapabilities(socket, callback),
    );
    socket.on("createWebRtcTransport", (data, callback) =>
      this.createWebRtcTransport(socket, data, callback),
    );
    socket.on("transport-connect", (data, callback) =>
      this.transportConnect(socket, data, callback),
    );
    socket.on("transport-produce", (data, callback) =>
      this.transportProduce(socket, data, callback),
    );
    socket.on("get-producers", (callback) =>
      this.getProducers(socket, callback),
    );
    socket.on("consume", (data, callback) =>
      this.consume(socket, data, callback),
    );
    socket.on("resume-consumer", (data) => this.resumeConsumer(socket, data));
    socket.on("transport-close-producer", (callback) => this.transportCloseProducer(socket, callback));
    socket.on("speaker-stopped", () => this.speakerStopped(socket));
    socket.on("speaker-started", () => this.speakerResumed(socket));

    // Eventos de latencia
    socket.on("listener-latency-report", (data) =>
      this.latencyService.handleLatencyReport(
        socket,
        data,
        this.io,
        this.roomService,
      ),
    );

    // Eventos de monitoreo
    socket.on("join-monitor", () => this.joinMonitor(socket));
    socket.on("report-stats", (data) => this.reportStats(socket, data));

    // Evento cuando un speaker pausa transmisión
    socket.on("speaker-paused", (data) => {
      this.speakerPaused(socket, data);
    });

    // Desconexión
    socket.on("disconnect", () => this.handleDisconnect(socket));
  }

  /**
   * Sanitiza nombres de usuario: recorta, limita longitud, elimina HTML.
   */
  sanitizeName(name, maxLen = 50) {
    if (!name || typeof name !== 'string') return 'Desconocido';
    return name
      .trim()                        // Espacios al inicio/final
      .replace(/<[^>]*>/g, '')       // Etiquetas HTML
      .substring(0, maxLen)          // Límite de longitud
      || 'Desconocido';              // Fallback si queda vacío
  }

  registerSpeaker(socket, name) {
    name = this.sanitizeName(name);
    // Buscar y limpiar conexiones fantasma del mismo orador
    const existingSpeakers = Array.from(this.roomService.speakers.entries());
    for (const [oldSocketId, s] of existingSpeakers) {
        if (s.name === name && oldSocketId !== socket.id) {
            logger.warn(`⚠️ Detectada conexión fantasma para ${name}. Desconectando socket anterior ${oldSocketId}`);
            const oldSocket = this.io.sockets.sockets.get(oldSocketId);
            if (oldSocket) {
                oldSocket.disconnect(true); // Disparará handleDisconnect automáticamente
            } else {
                this.handleDisconnect({ id: oldSocketId, role: constants.ROLES.SPEAKER });
            }
        }
    }

    const speaker = this.roomService.addSpeaker(socket.id, name);
    socket.role = constants.ROLES.SPEAKER;

    this.broadcastSpeakersStatus();
    this.io.to(constants.ROOMS.MONITOR).emit("user-connected", {
      ...speaker,
      role: constants.ROLES.SPEAKER,
      isTransmitting: false,
    });
    this.broadcastMonitorState();
  }

  registerListener(socket, name) {
    name = this.sanitizeName(name);
    const listener = this.roomService.addListener(socket.id, name);
    socket.role = constants.ROLES.LISTENER;
    socket.join(constants.ROOMS.LISTENER);

    socket.emit("speakers-status-update", {
      allSpeakers: this.roomService.getAllSpeakersWithStatus(),
      activeSpeakers: this.roomService.getActiveTransmittingSpeakers(),
      hasActiveTransmission: this.roomService.hasActiveTransmission(),
      timestamp: Date.now(),
    });

    this.io.to(constants.ROOMS.MONITOR).emit("user-connected", {
      ...listener,
      role: constants.ROLES.LISTENER,
    });

    this.broadcastListenersUpdate();
    this.broadcastMonitorState();
  }

  async getRouterRtpCapabilities(socket, callback) {
    try {
      const caps = this.mediasoupService.getRouterRtpCapabilities();
      callback(caps);
    } catch (error) {
      logger.error("Error obteniendo capacidades:", error);
      callback({ error: error.message });
    }
  }

  async createWebRtcTransport(socket, data, callback) {
    try {
      const params = await this.mediasoupService.createWebRtcTransport(
        socket.id,
      );
      callback(params);
    } catch (error) {
      logger.error("Error creando transporte:", error);
      callback({ error: error.message });
    }
  }

  async transportConnect(socket, { dtlsParameters }, callback) {
    try {
      await this.mediasoupService.connectTransport(socket.id, dtlsParameters);
      callback();
    } catch (error) {
      logger.error("Error conectando transporte:", error);
      callback({ error: error.message });
    }
  }

  async transportProduce(socket, { kind, rtpParameters }, callback) {
    try {
      const producer = await this.mediasoupService.createProducer(
        socket.id,
        kind,
        rtpParameters,
      );

      this.roomService.setSpeakerProducerActive(socket.id, true);
      this.broadcastSpeakersStatus();
      this.broadcastMonitorState();

      socket.broadcast.emit("new-producer", {
        producerSocketId: socket.id,
        name: this.roomService.getSpeakerInfo(socket.id)?.name || "Anónimo",
      });

      callback({ id: producer.id });
    } catch (error) {
      logger.error("Error produciendo:", error);
      callback({ error: error.message });
    }
  }

  // Evento cuando un speaker detiene su transmisión
  transportCloseProducer(socket, callback) {
    try {
      this.mediasoupService.closeProducer(socket.id);
      this.roomService.setSpeakerProducerActive(socket.id, false);
      this.broadcastSpeakersStatus();
      this.broadcastMonitorState();

      this.io.emit("producer-closed", { producerSocketId: socket.id });

      if (callback) callback({ success: true });
    } catch (error) {
      logger.error("Error cerrando productor:", error);
      if (callback) callback({ error: error.message });
    }
  }
  // NUEVO: Método para manejar pausa
  speakerPaused(socket, data) {
    logger.info(`⏸️ Speaker ${socket.id} pausó transmisión`);
    this.roomService.setSpeakerPaused(socket.id, true);
    this.broadcastSpeakersStatus();
    this.broadcastMonitorState();

    this.io.emit("producer-paused", {
      producerSocketId: socket.id,
      reason: "speaker_paused",
    });
  }

  // Evento cuando un speaker reanuda transmisión
  speakerResumed(socket) {
    const speaker = this.roomService.speakers.get(socket.id);
    if (speaker && speaker.isPaused) {
      logger.info(`▶️ Speaker ${socket.id} reanudó transmisión`);
      this.roomService.setSpeakerPaused(socket.id, false);
      this.broadcastSpeakersStatus();
      this.broadcastMonitorState();

      this.io.emit("producer-resumed", {
        producerSocketId: socket.id,
      });
    }
  }
  // Evento cuando un speaker detiene transmisión (desde el frontend)
  speakerStopped(socket) {
    logger.info(`🎤 Speaker ${socket.id} DETUVO transmisión`);
    this.roomService.setSpeakerProducerActive(socket.id, false);

    try {
      this.mediasoupService.closeProducer(socket.id);
    } catch (err) {
      logger.error("Error cerrando producer:", err);
    }

    this.broadcastSpeakersStatus();
    this.broadcastMonitorState();

    socket.broadcast.emit("producer-closed", {
      producerSocketId: socket.id,
      reason: "speaker_stopped",
    });
  }

  // Emite el estado completo actualizado al monitor
  broadcastMonitorState() {
    this.io.to(constants.ROOMS.MONITOR).emit("current-state", this.roomService.getStats());
  }

  // Método para broadcast del estado de todos los speakers
  broadcastSpeakersStatus() {
    const allSpeakers = this.roomService.getAllSpeakersWithStatus();
    const activeSpeakers = this.roomService.getActiveTransmittingSpeakers();
    const hasActiveTransmission = this.roomService.hasActiveTransmission();

    // Emitir a todos los listeners
    this.io.to(constants.ROOMS.LISTENER).emit("speakers-status-update", {
      allSpeakers: allSpeakers,
      activeSpeakers: activeSpeakers,
      hasActiveTransmission: hasActiveTransmission,
      timestamp: Date.now(),
    });
  }

  getProducers(socket, callback) {
    const activeSpeakers = this.roomService.getActiveTransmittingSpeakers();
    const producers = activeSpeakers.map((s) => ({
      id: s.id,
      name: s.name,
    }));
    callback(producers);
  }

  async consume(socket, { rtpCapabilities, remoteProducerSocketId }, callback) {
    try {
      const result = await this.mediasoupService.createConsumer(
        socket.id,
        remoteProducerSocketId,
        rtpCapabilities,
      );

      // Registrar relación oyente-orador
      this.roomService.addListenerToSpeaker(socket.id, remoteProducerSocketId);

      callback({
        id: result.id,
        producerId: result.producerId,
        kind: result.kind,
        rtpParameters: result.rtpParameters,
      });

      this.broadcastListenersUpdate();
    } catch (error) {
      logger.error("Error en consume:", error);
      callback({ error: error.message });
    }
  }

  async resumeConsumer(socket, { consumerId }) {
    await this.mediasoupService.resumeConsumer(consumerId);
  }

  joinMonitor(socket) {
    socket.join(constants.ROOMS.MONITOR);
    socket.role = constants.ROLES.MONITOR;
    logger.info(`🖥️ Monitor conectado: ${socket.id}`);

    // Enviar estado actual
    socket.emit("current-state", this.roomService.getStats());
  }

  reportStats(socket, data) {
    const userInfo =
      this.roomService.getSpeakerInfo(socket.id) ||
      this.roomService.getListenerInfo(socket.id);

    this.io.to(constants.ROOMS.MONITOR).emit("stats-update", {
      from: socket.id,
      name: userInfo?.name || "Unknown",
      role: socket.role,
      timestamp: Date.now(),
      ...data,
    });
  }

  broadcastListenersUpdate() {
    // Actualizar a cada orador sobre sus oyentes
    this.roomService.getAllSpeakers().forEach((speaker) => {
      this.io.to(speaker.id).emit("listeners-update", speaker.listeners);
    });

    // Actualizar monitores
    this.io
      .to(constants.ROOMS.MONITOR)
      .emit("listeners-global-update", this.roomService.getAllSpeakers());
  }

  handleDisconnect(socket) {
    logger.info(`🔌 Cliente desconectado: ${socket.id}`);

    // ⚠️ ORDEN IMPORTANTE: actualizar estado ANTES de borrar
    // Si el speaker todavía existe en la sala, actualizamos su estado,
    // cerramos recursos de media, y broadcast. Después removemos.
    const isSpeaker = this.roomService.speakers.has(socket.id);

    if (isSpeaker) {
      this.roomService.setSpeakerProducerActive(socket.id, false);
      this.broadcastSpeakersStatus();

      this.io.emit("producer-closed", {
        producerSocketId: socket.id,
        reason: "disconnected",
      });

      this.mediasoupService.closeProducer(socket.id);
    }

    // Ahora sí, borramos al usuario de la sala
    this.roomService.removeUser(socket.id);

    this.mediasoupService.removeTransport(socket.id);
    this.latencyService.removeUser(socket.id);

    this.io.to(constants.ROOMS.MONITOR).emit("user-disconnected", {
      id: socket.id,
      role: socket.role,
      timestamp: Date.now(),
    });

    this.broadcastListenersUpdate();
    this.broadcastMonitorState();
  }
}

module.exports = new SocketController();
