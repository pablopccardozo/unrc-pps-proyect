Regenerar el certificado ssl incluyendo el nombre mDNS:

**Ubicación:** `home/gidat/wmm-audio-server/server/ssl/cert.pem`
```bash
openssl req -x509 -newkey rsa:4096 \
  -keyout ~/wmm-audio-server/server/ssl/key.pem \
  -out ~/wmm-audio-server/server/ssl/cert.pem \
  -days 825 -nodes \
  -subj "/CN=auditorio.local" \
  -addext "subjectAltName=DNS:auditorio.local,DNS:auditorio"
```

> Los usuarios igual van a ver la advertencia de certificado autofirmado la primera vez, pero solo una vez por dispositivo. Después el navegador recuerda la excepción.