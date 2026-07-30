/**
 * Logger.js - Centraliza y controla la salida de consola de la aplicación.
 * Detecta automáticamente si la aplicación corre en producción para silenciar logs.
 */
const Logger = (function() {
    // 1. Obtener configuración del servidor (inyectada vía /js/env-config.js)
    const serverDebug = (window.WMM_CONFIG && window.WMM_CONFIG.DEBUG) === true;
    
    // 2. Control vía LocalStorage o URL (Overrides locales para desarrollo)
    const urlParams = new URLSearchParams(window.location.search);
    const forceDebug = urlParams.has('debug') || localStorage.getItem('WMM_DEBUG') === 'true';

    // 3. Estado final de Debug: Prioriza el servidor, pero permite forceDebug local
    const isDebugEnabled = serverDebug || forceDebug;

    // Guardamos las funciones originales
    const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug
    };

    /**
     * Aplica el override global de la consola
     */
    const applyOverride = () => {
        if (!isDebugEnabled) {
            console.log = function() {};
            console.info = function() {};
            console.debug = function() {};
            // Dejamos pasar warnings y errores en producción por seguridad diagnóstica.
            // Si prefieres silenciar warnings, descomenta la siguiente línea:
            // console.warn = function() {}; 
        } else {
            const source = serverDebug ? "SERVER (.env)" : "LOCAL OVERRIDE";
            originalConsole.info(`%c[WMM DEBUG ACTIVE]`, "color: #3b82f6; font-weight: bold;", `Logs habilitados por ${source}.`);
        }
    };

    // Ejecutar override inmediatamente
    applyOverride();

    return {
        /**
         * Activa el modo debug permanentemente en este navegador (Local Override)
         */
        enableDebug: function() {
            localStorage.setItem('WMM_DEBUG', 'true');
            console.info("Modo Debug habilitado localmente. Reiniciando...");
            location.reload();
        },
        /**
         * Desactiva el modo debug local
         */
        disableDebug: function() {
            localStorage.removeItem('WMM_DEBUG');
            console.info("Modo Debug deshabilitado localmente. Reiniciando...");
            location.reload();
        },
        /**
         * Retorna si el debug está activo
         */
        isEnabled: () => isDebugEnabled
    };
})();
