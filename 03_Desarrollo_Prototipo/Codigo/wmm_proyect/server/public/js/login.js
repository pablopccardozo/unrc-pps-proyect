const form = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('speakerName').value.trim();
        const key = document.getElementById('secretKey').value;
        
        if (!name || !key) {
            errorMessage.textContent = '❌ Por favor, completa todos los campos';
            errorMessage.style.display = 'block';
            return;
        }
        
        errorMessage.style.display = 'none';
        
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, key })
            });
            
            const result = await response.json();
            
            if (result.success) {
                sessionStorage.setItem('speakerName', name);
                window.location.href = '/transmision.html';
            } else {
                errorMessage.textContent = result.message || '❌ Clave incorrecta';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            errorMessage.textContent = '❌ Error de conexión con el servidor';
            errorMessage.style.display = 'block';
        }
    });
}
