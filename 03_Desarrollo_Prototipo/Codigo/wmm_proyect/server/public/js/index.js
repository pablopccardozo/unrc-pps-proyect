// Elementos del menú
const btnTransmitir = document.getElementById("btnTransmitir");
const btnEscuchar = document.getElementById("btnEscuchar");
const btnMonitor = document.getElementById("btnMonitor");

// Verificar si el usuario ya está logueado
function isSpeakerLoggedIn() {
  return sessionStorage.getItem("speakerName") !== null;
}

// Botón Transmitir
if (btnTransmitir) {
  btnTransmitir.onclick = () => {
    if (isSpeakerLoggedIn()) {
      window.location.href = "/transmision.html";
    } else {
      window.location.href = "/login.html";
    }
  };
}

// Botón Escuchar
if (btnEscuchar) {
  btnEscuchar.onclick = () => {
    window.location.href = "/oyente.html";
  };
}

// Botón Monitor
if (btnMonitor) {
  btnMonitor.onclick = () => {
    window.location.href = "/monitor.html";
  };
}
