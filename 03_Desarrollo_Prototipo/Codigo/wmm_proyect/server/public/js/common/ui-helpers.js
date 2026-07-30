// Utilidades para la interfaz de usuario
class UIHelpers {
    constructor() {
        this.statusElement = document.getElementById('status');
        this.latencyIndicator = null;
        this.listenersPanel = null;
        this.speakersList = null;
    }

    updateStatus(message, type = 'info') {
        if (!this.statusElement) {
            this.statusElement = document.getElementById('status');
        }
        
        if (this.statusElement) {
            this.statusElement.textContent = message;
            
            // Limpiar clases previas
            this.statusElement.classList.remove('success', 'warning', 'danger', 'info');
            
            // Añadir clase según tipo
            switch(type) {
                case 'success':
                    this.statusElement.classList.add('success');
                    break;
                case 'warning':
                    this.statusElement.classList.add('warning');
                    break;
                case 'danger':
                    this.statusElement.classList.add('danger');
                    break;
                default:
                    this.statusElement.classList.add('info');
            }
        }
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    createLatencyIndicator() {
        if (!document.getElementById('latencyIndicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'latencyIndicator';
            indicator.className = 'latency-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                background: #4CAF50;
                color: white;
                padding: 8px 15px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 1000;
                display: none;
                transition: all 0.3s ease;
            `;
            indicator.textContent = '0ms';
            document.body.appendChild(indicator);
        }
        this.latencyIndicator = document.getElementById('latencyIndicator');
        return this.latencyIndicator;
    }

    createListenersPanel() {
        if (!document.getElementById('listenersPanel')) {
            const panel = document.createElement('div');
            panel.id = 'listenersPanel';
            panel.className = 'listeners-panel';
            panel.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 300px;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 15px;
                color: white;
                z-index: 1000;
                display: none;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            `;
            panel.innerHTML = `
                <h3 style="margin:0 0 10px 0; font-size:14px;">🎧 Oyentes Conectados</h3>
                <div id="listenersCount" style="font-size:12px; margin-bottom:10px;">0</div>
                <div id="listenersList" style="max-height:300px; overflow-y:auto;"></div>
            `;
            document.body.appendChild(panel);
        }
        this.listenersPanel = document.getElementById('listenersPanel');
        return this.listenersPanel;
    }

    createSpeakersPanel() {
        if (!document.getElementById('speakersPanel')) {
            const panel = document.createElement('div');
            panel.id = 'speakersPanel';
            panel.className = 'speakers-panel';
            panel.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 300px;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 15px;
                color: white;
                z-index: 1000;
                display: none;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            `;
            panel.innerHTML = `
                <h3 style="margin:0 0 10px 0; font-size:14px;">🎙️ Oradores Activos</h3>
                <div id="speakersList" style="max-height:300px; overflow-y:auto;"></div>
            `;
            document.body.appendChild(panel);
        }
        this.speakersList = document.getElementById('speakersList');
        return this.speakersList;
    }

    updateListenersList(listeners, onClickCallback) {
        const listContainer = document.getElementById('listenersList');
        const countContainer = document.getElementById('listenersCount');
        
        if (!listContainer) return;
        
        if (listeners.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">No hay oyentes</div>';
            if (countContainer) countContainer.textContent = '0';
            return;
        }
        
        if (countContainer) countContainer.textContent = `${listeners.length}`;
        
        listContainer.innerHTML = listeners.map(listener => `
            <div id="listener-${listener.id}" class="listener-item" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                margin-bottom: 5px;
                background: rgba(255,255,255,0.1);
                border-radius: 8px;
            ">
                <span>👂 ${listener.name || 'Oyente'}</span>
                <span id="latency-${listener.id}" class="latency-badge" style="
                    background: #4CAF50;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: bold;
                ">---</span>
            </div>
        `).join('');
        
        // Mostrar panel si hay oyentes
        if (this.listenersPanel) {
            this.listenersPanel.style.display = listeners.length > 0 ? 'block' : 'none';
        }
    }

    updateListenerLatency(listenerId, latency, jitterDelay) {
        const badge = document.getElementById(`latency-${listenerId}`);
        if (badge) {
            badge.textContent = `${Math.round(latency)}ms`;
            
            // Cambiar color según latencia
            if (latency < 100) badge.style.background = '#4CAF50';
            else if (latency < 150) badge.style.background = '#8BC34A';
            else if (latency < 200) badge.style.background = '#FFC107';
            else if (latency < 250) badge.style.background = '#FF9800';
            else badge.style.background = '#f44336';
            
            // Tooltip con información adicional
            badge.title = jitterDelay ? `Buffer: ${Math.round(jitterDelay)}ms` : '';
        }
    }

    addSpeakerToList(speakerId, name) {
        const listContainer = document.getElementById('speakersList');
        if (!listContainer) return;
        
        // Verificar si ya existe
        if (document.getElementById(`speaker-${speakerId}`)) return;
        
        const item = document.createElement('div');
        item.id = `speaker-${speakerId}`;
        item.className = 'speaker-item';
        item.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin-bottom: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            transition: all 0.3s ease;
        `;
        item.innerHTML = `
            <span>🎤 <strong>${name}</strong></span>
            <span class="status-badge" style="background: #4CAF50; font-size: 10px;">🔊 EN VIVO</span>
        `;
        listContainer.appendChild(item);
        
        // Mostrar panel
        if (this.speakersList?.parentElement) {
            this.speakersList.parentElement.style.display = 'block';
        }
    }

    removeSpeakerFromList(speakerId) {
        const item = document.getElementById(`speaker-${speakerId}`);
        if (item) {
            item.style.opacity = '0';
            setTimeout(() => item.remove(), 200);
        }
        
        // Ocultar panel si no hay más speakers
        const listContainer = document.getElementById('speakersList');
        if (listContainer && listContainer.children.length === 0) {
            if (this.speakersList?.parentElement) {
                this.speakersList.parentElement.style.display = 'none';
            }
        }
    }

    updateLatencyIndicator(latency) {
        if (!this.latencyIndicator) {
            this.createLatencyIndicator();
        }
        
        if (this.latencyIndicator) {
            this.latencyIndicator.textContent = `${Math.round(latency)}ms`;
            this.latencyIndicator.style.display = 'block';
            
            // Cambiar color según latencia
            if (latency < 100) {
                this.latencyIndicator.style.background = '#4CAF50';
            } else if (latency < 150) {
                this.latencyIndicator.style.background = '#8BC34A';
            } else if (latency < 200) {
                this.latencyIndicator.style.background = '#FFC107';
            } else if (latency < 250) {
                this.latencyIndicator.style.background = '#FF9800';
            } else {
                this.latencyIndicator.style.background = '#f44336';
            }
        }
    }

    toggleButtons(isTransmitting) {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const listenBtn = document.getElementById('listenBtn');
        
        if (startBtn) startBtn.style.display = isTransmitting ? 'none' : 'inline-flex';
        if (stopBtn) stopBtn.style.display = isTransmitting ? 'inline-flex' : 'none';
        if (listenBtn) listenBtn.style.display = isTransmitting ? 'none' : 'inline-flex';
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#FF9800'};
            color: white;
            border-radius: 8px;
            z-index: 2000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.style.opacity = '0';
            setTimeout(() => alertDiv.remove(), 300);
        }, 3000);
    }
}

// Instancia global
const uiHelpers = new UIHelpers();
