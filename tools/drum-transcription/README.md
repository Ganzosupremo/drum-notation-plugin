# Transcripción de batería con Docker

Convierte una canción en un `.mid` de batería listo para el comando del plugin
**Insert drum notation from a .mid file**:

1. **Demucs** (`htdemucs`) separa la batería del resto de la mezcla.
2. **Omnizart** transcribe esa pista de batería a notas MIDI.
3. El script reescribe el MIDI en el canal 10 (General MIDI) con un tempo
   estimado, para que el diálogo de importación ya venga con un BPM razonable.

Todo corre dentro de un contenedor: no hace falta instalar Python, TensorFlow ni
PyTorch en Windows. Nada de esto se empaqueta con el plugin.

> **Limitación de Omnizart:** solo escribe **kick (35), caja (38) y charles
> cerrado (42)**. Toms, platos y ride no aparecerán en la notación; hay que
> añadirlos a mano después de importar.

## Requisitos

- Docker Desktop (en Windows, con el backend WSL 2).
- Unos **20 GB** libres para la imagen (la base de Omnizart ya pesa ~16 GB).
- En Docker Desktop → *Settings → Resources*, al menos **8 GB de memoria** para
  separar canciones largas.

Todo corre en CPU. Separar una canción de 7–8 minutos puede tardar varios
minutos; Omnizart es más rápido.

## Uso en Windows (PowerShell)

Desde la carpeta del repositorio:

```powershell
cd "C:\Vibe Coding\drum-notation-plugin\tools\drum-transcription"
.\transcribe-drums.ps1 "C:\Musica\cancion.mp3"
```

La primera ejecución construye la imagen `drum-transcription` (descarga la base
de Omnizart, PyTorch, Demucs y su modelo). Las siguientes reutilizan la imagen y
funcionan sin conexión.

El resultado queda junto al audio como `cancion.drums.mid`. Opciones:

| Opción | Qué hace |
| --- | --- |
| `-OutDir "C:\ruta\Vault\midi"` | Guarda el `.mid` en otra carpeta, por ejemplo dentro del vault. |
| `-Bpm 66` | Usa ese tempo en lugar del estimado. Recomendado si lo conoces. |
| `-KeepStem` | Guarda también la batería separada como `cancion.drums.wav` para escucharla. |
| `-NoSeparate` | El audio ya es solo batería: se salta Demucs. |
| `-Rebuild` | Vuelve a construir la imagen (tras actualizar estos archivos). |

Si PowerShell bloquea el script, permite scripts locales una vez:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Uso en Linux/macOS (bash)

```bash
./transcribe-drums.sh cancion.mp3 --bpm 66 --keep-stem --output-dir ~/Vault/midi
```

`REBUILD=1 ./transcribe-drums.sh ...` reconstruye la imagen.

## Usar el `.mid` en Obsidian

1. Copia `cancion.drums.mid` a tu vault (o usa `-OutDir` para escribirlo ahí).
2. En una nota, ejecuta **Insert drum notation from a .mid file** y elige el archivo.
3. Revisa el tempo y el **primer tiempo fuerte (segundos)**. El plugin propone
   el primer golpe detectado, pero si la canción empieza con una anacrusa o un
   fill hay que ajustarlo al tiempo 1 del primer compás.

Para canciones largas suele ir mejor recortar antes un fragmento (por ejemplo
con `ffmpeg -ss 120 -t 20 -i cancion.mp3 fragmento.wav`) y transcribir solo eso.

## Uso con Docker Compose

Si prefieres no usar los scripts, copia la canción a la carpeta `audio/` de esta
herramienta y ejecuta:

```powershell
cd "C:\Vibe Coding\drum-notation-plugin\tools\drum-transcription"
docker compose run --rm transcribe /in/cancion.mp3 --bpm 66
```

El `.mid` aparece en esa misma carpeta `audio/` (que git ignora).

## Uso directo con Docker

El contenedor se borra al terminar (`--rm`), así que **la carpeta de salida
tiene que ser un volumen del host** (`-v ...:/out`). Si no lo es, el script se
detiene al principio con un error en lugar de transcribir y perder el
resultado. Los scripts y `compose.yaml` ya montan los volúmenes por ti.

```powershell
docker build -t drum-transcription .
docker run --rm -v "C:\Musica:/in:ro" -v "C:\Musica:/out" drum-transcription /in/cancion.mp3 --bpm 66
```

Argumentos del contenedor: `AUDIO [--output-dir DIR] [--bpm BPM] [--no-separate] [--keep-stem]`.
