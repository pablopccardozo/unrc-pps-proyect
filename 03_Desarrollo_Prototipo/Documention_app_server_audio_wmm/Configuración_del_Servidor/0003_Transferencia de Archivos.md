#### Sincronizar todo el proyecto

Desde la **computadora local** (donde está el código en la versión en desarrollo):

```bash
# Opción 1: Usando scp (desde tu PC)
cd /ruta/de/proyecto-en-desarrollo
scp -r server/* gidat@auditorio.local:~/wmm-audio-server/server/

# Opción 2: Usando rsync (más eficiente)
rsync -avz --progress server/ gidat@auditorio.local:~/wmm-audio-server/server/

# Opción 3: Si tienes git
git clone <tu-repo> ~/wmm-audio-server
```

En este caso se utilizó la opción 2.

```bash
rsync -avz --progress ./ usuario@auditorio.local:~/wmm-audio-server/
```

#### Corroborar ejecutables
Ejecutar dentro de la carpeta del proyecto (`~/wmm-audio-server/`)el siguiente comando para controlar que los archivo .sh sean ejecutables:

```bash
ls -l
```

Debería verse una "x" en la columna de permisos de los archivos  
- **https-port-setup.sh**
- **network-watch.sh**
- **start-services.sh**
- **wmm-qos-setup.sh**

En caso de no estar como ejecutable agregar el permiso correspondiente.

```bash
chmod +x <nombre-del-archivo>.sh
```
