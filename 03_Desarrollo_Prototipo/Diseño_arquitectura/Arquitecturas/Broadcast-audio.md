# ARQUITECTURAS PARA BROADCAST DE AUDIO

## 1. Opción: WebRTC en modo SFU (Selective Forwarding Unit)
Servidor recibe 1 stream y lo retransmite a N clientes

    * Ventaja: Mantiene baja latencia de WebRTC (~100-200ms)

    *Desventaja: Complejidad de servidor SFU

## 2. Opción: RTP Multicast 
Servidor envía a dirección multicast (ej: 239.255.0.1)

Todos los clientes reciben el mismo paquete

Ventaja: Eficiencia de red, mínimo delay

Desventaja: Requiere soporte multicast en Wi-Fi

## 3. Opción: GStreamer con RTP/Unicast a múltiples clientes
Servidor duplica stream a cada cliente

Ventaja: Simple, funciona siempre

Desventaja: Ineficiente para muchos clientes