const logger = require('../utils/logger');
const serverConfig = require('../config/server-config');

class ApiController {
    registerRoutes(app, authService) {
        // Endpoint de login
        app.post('/login', async (req, res) => {
            const { name, key } = req.body;
            const result = await authService.login(name, key);
            
            if (result.success) {
                res.json({ success: true });
            } else {
                res.status(401).json(result);
            }
        });

        // Endpoint de health check
        app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                timestamp: Date.now(),
                uptime: process.uptime(),
                host: serverConfig.HOST,
                port: serverConfig.PORT
            });
        });

        // Endpoint de estadísticas
        app.get('/api/stats', (req, res) => {
            res.json({
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: Date.now()
            });
        });
    }
}

module.exports = new ApiController();
