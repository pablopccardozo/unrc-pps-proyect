// Script de monitoreo y control de acceso

function initMonitor() {
    const socket = socketClient.connect();

    // ── Información del servidor (IP para dispositivos sin mDNS) ──
    async function fetchServerInfo() {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();

            const ipElem = document.getElementById('serverIp');
            const urlElem = document.getElementById('serverUrl');
            const uptimeElem = document.getElementById('serverUptime');

            if (ipElem) ipElem.textContent = data.host || '---';
            if (urlElem) urlElem.textContent = `https://${data.host}`;
            if (uptimeElem) {
                const mins = Math.floor(data.uptime / 60);
                const hrs = Math.floor(mins / 60);
                uptimeElem.textContent = hrs > 0 
                    ? `${hrs}h ${mins % 60}m` 
                    : `${mins}m`;
            }
        } catch (e) {
            // Silenciar error — el monitor sigue funcionando sin esta info
        }
    }

    // Obtener info al cargar y actualizar uptime cada 60s
    fetchServerInfo();
    setInterval(fetchServerInfo, 60000);

    // Mapa para mantener las últimas latencias conocidas de los oyentes
    const listenerLatencies = new Map(); // listenerId -> latency (number)

    socket.on('connect', () => {
        socket.emit('join-monitor');
        const statusElem = document.getElementById('status');
        if (statusElem) {
            statusElem.textContent = '📊 Monitoreando en tiempo real';
            statusElem.className = 'status-badge success';
        }
    });

    socket.on('stats-update', (data) => {
        if (typeof updateSpeakerStats === 'function' && data.role === 'speaker') {
            updateSpeakerStats(data);
        } else if (typeof updateListenerStats === 'function' && data.role === 'listener') {
            updateListenerStats(data);
        }
    });

    socket.on('latency-report', (data) => {
        // Registrar latencia
        listenerLatencies.set(data.listenerId, data.latency);
        
        // Actualizar badge del oyente en la UI
        const badge = document.getElementById(`latency-${data.listenerId}`);
        if (badge) {
            badge.textContent = `${data.latency}ms`;
            if (data.latency < 100) badge.style.background = '#10b981';
            else if (data.latency < 200) badge.style.background = '#f59e0b';
            else badge.style.background = '#ef4444';
        }

        // Recalcular métricas generales
        recalculateLatencyMetrics();
    });

    socket.on('current-state', (state) => {
        // Limpiar del mapa los oyentes que ya no estén conectados
        const activeListenerIds = new Set();
        state.speakers.forEach(speaker => {
            speaker.listeners.forEach(l => activeListenerIds.add(l.id));
        });

        // Borrar de listenerLatencies los que ya no están activos
        for (const key of listenerLatencies.keys()) {
            if (!activeListenerIds.has(key)) {
                listenerLatencies.delete(key);
            }
        }

        updateDashboard(state);
        recalculateLatencyMetrics();
    });

    // Sanitiza texto para evitar XSS en innerHTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function updateDashboard(state) {
        const speakersCount = document.getElementById('speakersCount');
        const listenersCount = document.getElementById('listenersCount');
        if (speakersCount) speakersCount.textContent = state.totalSpeakers;
        if (listenersCount) listenersCount.textContent = state.totalListeners;

        const container = document.getElementById('speakersContainer');
        if (!container) return;

        container.innerHTML = '';

        state.speakers.forEach(speaker => {
            const card = document.createElement('div');
            card.className = 'speaker-card';
            card.innerHTML = `
                <h4>
                    <span>🎤 ${escapeHtml(speaker.name)}</span>
                    <span class="status-badge success">${speaker.listeners.length} oyentes</span>
                </h4>
                <div class="listeners-list">
                    ${speaker.listeners.map(l => {
                        const knownLatency = listenerLatencies.get(l.id);
                        const latencyText = knownLatency !== undefined ? `${knownLatency}ms` : '---';
                        let backgroundStyle = '';
                        if (knownLatency !== undefined) {
                            if (knownLatency < 100) backgroundStyle = 'background: #10b981;';
                            else if (knownLatency < 200) backgroundStyle = 'background: #f59e0b;';
                            else backgroundStyle = 'background: #ef4444;';
                        }
                        return `
                            <div class="listener-item">
                                <span>👂 ${escapeHtml(l.name)}</span>
                                <span id="latency-${l.id}" class="latency-badge" style="${backgroundStyle}">${latencyText}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            container.appendChild(card);
        });
    }

    function recalculateLatencyMetrics() {
        const avgLatencyElem = document.getElementById('avgLatency');
        const maxLatencyElem = document.getElementById('maxLatency');
        
        const latencies = Array.from(listenerLatencies.values());
        
        if (latencies.length === 0) {
            if (avgLatencyElem) avgLatencyElem.textContent = '0';
            if (maxLatencyElem) maxLatencyElem.textContent = '0';
            return;
        }
        
        const sum = latencies.reduce((acc, val) => acc + val, 0);
        const avg = Math.round(sum / latencies.length);
        const max = Math.max(...latencies);
        
        if (avgLatencyElem) avgLatencyElem.textContent = avg;
        if (maxLatencyElem) maxLatencyElem.textContent = max;
    }
}

// Autenticación y Carga
document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('authContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');
    const authForm = document.getElementById('authForm');
    const authErrorMessage = document.getElementById('authErrorMessage');
    const adminKeyInput = document.getElementById('adminKey');

    // Verificar si ya está autorizado
    if (sessionStorage.getItem('monitorAuthorized') === 'true') {
        if (dashboardContainer) dashboardContainer.style.display = 'flex';
        initMonitor();
    } else {
        if (authContainer) authContainer.style.display = 'flex';
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = adminKeyInput.value;
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'Monitor', key })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    sessionStorage.setItem('monitorAuthorized', 'true');
                    if (authContainer) authContainer.style.display = 'none';
                    if (dashboardContainer) dashboardContainer.style.display = 'flex';
                    initMonitor();
                } else {
                    if (authErrorMessage) {
                        authErrorMessage.textContent = result.message || '❌ Clave incorrecta';
                        authErrorMessage.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Error de autenticación:', error);
                if (authErrorMessage) {
                    authErrorMessage.textContent = '❌ Error de conexión con el servidor';
                    authErrorMessage.style.display = 'block';
                }
            }
        });
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            location.reload();
        };
    }
});
