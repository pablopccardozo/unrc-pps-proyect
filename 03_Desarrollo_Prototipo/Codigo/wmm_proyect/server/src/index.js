// Carga de modulos
require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');

// Configuraciones
const serverConfig = require('./config/server-config');
const constants = require('./config/constants');

// Servicios
const mediasoupService = require('./services/mediasoup-service');
const roomService = require('./services/room-service');
const latencyService = require('./services/latency-service');
const authService = require('./services/auth-service');

// Controladores
const socketController = require('./controllers/socket-controller');
const apiController = require('./controllers/api-controller');

// Utils
const logger = require('./utils/logger');

// Inicializar app
const app = express();

// Servir configuración al cliente ANTES de los estáticos
app.get('/js/env-config.js', (req, res) => {
    res.type('application/javascript');
    res.send(`window.WMM_CONFIG = { DEBUG: ${process.env.DEBUG === 'true'} };`);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Cargar certificados SSL
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.pem'))
};

// Crear servidor HTTPS
const server = https.createServer(sslOptions, app);
const io = new Server(server);

// Inicializar servicios
async function initializeServices() {
    try {
        // 1 Iniciar mediasoup
        await mediasoupService.initialize();
        logger.info('✅ Mediasoup inicializado');

        // 2 Configurar rutas API
        apiController.registerRoutes(app, authService);

        // 3 Configurar WebSockets
        socketController.initialize(io, {
            mediasoupService,
            roomService,
            latencyService,
            authService
        });

        logger.info('✅ Servicios inicializados correctamente');
    } catch (error) {
        logger.error('❌ Error inicializando servicios:', error);
        process.exit(1);
    }
}

// Iniciar todo
initializeServices();

// Iniciar servidor
const PORT = serverConfig.PORT;
// Escuchar en 0.0.0.0 (todas las interfaces) — mediasoup anuncia
// la IP real via constants.NETWORK.HOST para los candidatos ICE
server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🟢 Servidor escuchando en 0.0.0.0:${PORT}`);
    logger.info(`🟢 IP anunciada (mediasoup): ${serverConfig.HOST}`);
    logger.info(`🟢 mDNS: https://auditorio.local/`);
    logger.info(`🟢 Directo: https://${serverConfig.HOST}:${PORT}/`);
});

// Manejo de cierre graceful
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
    logger.info('🛑 Cerrando servidor...');

    // Cerrar conexiones de mediasoup
    await mediasoupService.close();

    // Cerrar servidor HTTP
    server.close(() => {
        logger.info('🚫 Servidor cerrado');
        process.exit(0);
    });
}