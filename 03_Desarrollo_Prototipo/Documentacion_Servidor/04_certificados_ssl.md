# Certificados SSL

## Archivos de Certificados

**Ubicación:** `~/wmm_proyect/server/ssl/`

- `cert.pem` — Certificado autofirmado
- `key.pem` — Clave privada

## Generar Certificado con SAN para auditorio.local

```bash
cd ~/wmm_proyect
openssl req -x509 -newkey rsa:4096 \
  -keyout server/ssl/key.pem \
  -out server/ssl/cert.pem \
  -days 825 -nodes \
  -subj "/CN=auditorio.local" \
  -addext "subjectAltName=DNS:auditorio.local,DNS:auditorio"
```

> El Subject Alternative Name (SAN) es **obligatorio** para que los navegadores modernos acepten la conexión. Sin SAN, Chrome y Firefox rechazan el certificado autofirmado aunque el usuario acepte la advertencia.

## Regeneración Automática por Cambio de IP

El script `generate-ssl.sh` automatiza la generación incluyendo además la IP actual del servidor:

```bash
sudo bash ~/wmm_proyect/generate-ssl.sh
```

El servicio `wmm-network-watch.service` ejecuta este script automáticamente cuando detecta un cambio de IP en el servidor.

## Consideraciones

- Los certificados autofirmados muestran una advertencia de seguridad la primera vez que se accede desde cada dispositivo. El navegador permite aceptar la excepción de forma permanente.
- Para un despliegue en internet se recomendaría usar Let's Encrypt (Certbot), pero en el ámbito de esta práctica (red local controlada) los certificados autofirmados son suficientes.
- Los certificados expiran a los 825 días (~2.3 años). Se deben regenerar antes de ese plazo.
