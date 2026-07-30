# Configuración de Red del Servidor

## Interfaz de Red

El servidor Ubuntu debe tener una interfaz Ethernet conectada al mismo switch que el AP.

### Interfaz por DHCP (recomendado para entorno de pruebas)

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      dhcp-identifier: mac
```

### Interfaz con IP estática (recomendado para producción)

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

## Reglas iptables para QoS (DSCP)

El script `wmm-qos-setup.sh` automatiza la configuración:

```bash
# Aplicar reglas QoS
sudo bash /home/usuario/wmm_proyect/wmm-qos-setup.sh

# Verificar reglas activas
sudo iptables -t mangle -L WMM_QOS -n -v
```

### Reglas aplicadas

```bash
# Cadena custom
iptables -t mangle -N WMM_QOS

# Enganchar en OUTPUT y FORWARD
iptables -t mangle -A OUTPUT -j WMM_QOS
iptables -t mangle -A FORWARD -j WMM_QOS

# Marcar tráfico RTP/UDP del servidor
iptables -t mangle -A WMM_QOS -p udp --sport 2000:2050 -j DSCP --set-dscp 46
iptables -t mangle -A WMM_QOS -p udp --dport 2000:2050 -j DSCP --set-dscp 46
```

El marcado DSCP EF (46) se aplica sobre los puertos RTP. Cuando el AP recibe un paquete con DSCP EF, lo asigna a la cola AC_VO (Voice) de WMM.

**Nota**: solo se marcan OUTPUT y FORWARD, no INPUT. El tráfico uplink (orador → servidor) llega por Ethernet desde el AP, un medio sin contención donde el marcado DSCP no es necesario. Si se marcara INPUT, se afectaría tráfico no RTP que ingresa al servidor.

## Persistencia de Reglas iptables

Para que las reglas sobrevivan a reinicios:

```bash
# Instalar iptables-persistent
sudo apt install iptables-persistent

# Guardar reglas actuales
sudo netfilter-persistent save

# O manualmente
sudo iptables-save > /etc/iptables/rules.v4
```

## Configuración mDNS (Avahi)

Para acceso mediante `https://auditorio.local/`:

```bash
# Configurar Avahi
sudo nano /etc/avahi/avahi-daemon.conf
```

Asegurar que `domain-name=local` y `enable-reflector=no`.

## Redirección de Puerto (443 → 3000)

Para acceder al servidor sin especificar el puerto:

```bash
# Redirección TCP 443 → 3000
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 3000

# Persistencia
sudo netfilter-persistent save
```

## Auto-detección de IP

El servidor Node.js detecta automáticamente la IP de red local al arrancar si `HOST` está vacío en `.env`. Esto se implementa mediante `os.networkInterfaces()` en `server-config.js`, filtrando interfaces Ethernet activas.
