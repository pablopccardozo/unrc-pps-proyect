// Manejador centralizado de socket.io
class SocketClient {
    constructor() {
        this.socket = null;
        this.eventHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.isConnected = false;
    }

    connect(options = {}) {
        if (this.socket && this.socket.connected) {
            return this.socket;
        }

        this.socket = io({
            transports: ['websocket'],
            upgrade: false,
            reconnectionAttempts: this.maxReconnectAttempts,
            ...options
        });

        this.setupDefaultHandlers();
        return this.socket;
    }

    setupDefaultHandlers() {
        this.socket.on('connect', () => {
            console.log('✅ Conectado al servidor');
            this.isConnected = true;
            this.reconnectAttempts = 0;
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Error de conexión:', error);
            this.reconnectAttempts++;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Desconectado:', reason);
            this.isConnected = false;
        });
    }

    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
        this.socket?.on(event, handler);
    }

    off(event, handler) {
        if (handler) {
            const handlers = this.eventHandlers.get(event) || [];
            const index = handlers.indexOf(handler);
            if (index > -1) handlers.splice(index, 1);
            this.socket?.off(event, handler);
        } else {
            this.eventHandlers.delete(event);
            this.socket?.off(event);
        }
    }

    emit(event, ...args) {
        if (this.socket && this.socket.connected) {
            return this.socket.emit(event, ...args);
        }
        console.warn(`Socket no conectado, no se pudo emitir: ${event}`);
        return null;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.eventHandlers.clear();
        this.isConnected = false;
    }
}

// Instancia global
const socketClient = new SocketClient();