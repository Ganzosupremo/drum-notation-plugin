# Separate-and-Detect en Linux Mint

Guía para preparar el motor de transcripción de batería **Separate-and-Detect**
en Linux Mint. Este motor se ejecuta fuera de Obsidian: recibe audio, genera
eventos/MIDI y el plugin convierte esos eventos a notación.

> Estado: guía de instalación y evaluación. No integrar todavía con el plugin
> ni procesar la canción completa hasta validar un fragmento corto.

## Qué necesitamos

- Linux Mint con conexión a Internet.
- GPU NVIDIA compatible con CUDA (la RTX 3060 es adecuada).
- Al menos 15 GB libres para Conda, dependencias y pesos.
- El audio de prueba copiado a Linux.

El proyecto oficial publica código y pesos bajo licencia MIT:

- Código: <https://github.com/ddman1101/Separate-and-detect>
- Pesos: <https://huggingface.co/ddman1101/Separate-and-Detect>
- Artículo: <https://arxiv.org/abs/2608.01093>

## 1. Preparar Mint y comprobar la GPU

Abre una terminal y ejecuta:

```bash
sudo apt update
sudo apt install -y git wget curl build-essential ffmpeg
nvidia-smi
```

`nvidia-smi` debe mostrar la RTX 3060. Si no aparece, instala o actualiza el
controlador NVIDIA desde el Administrador de controladores de Linux Mint y
reinicia antes de seguir.

No hace falta instalar CUDA Toolkit manualmente: el entorno del proyecto trae
las bibliotecas CUDA que necesita PyTorch. El controlador NVIDIA del sistema sí
es imprescindible.

## 2. Instalar Miniforge (Conda)

En la terminal:

```bash
wget https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-x86_64.sh -O miniforge.sh
bash miniforge.sh
source ~/.bashrc
conda --version
```

Durante el instalador, se puede aceptar la ruta sugerida. Cierra y abre otra
terminal si `conda --version` no funciona después de `source ~/.bashrc`.

## 3. Descargar el código

Trabaja dentro de tu carpeta personal de Linux, no directamente sobre una
partición de Windows montada:

```bash
mkdir -p ~/proyectos
cd ~/proyectos
git clone https://github.com/ddman1101/Separate-and-detect.git
cd Separate-and-detect
```

## 4. Crear los dos entornos del motor

El proyecto usa dos entornos distintos:

- `musicldm_env`: separación del audio en kick, caja, toms, charles y platos.
- `onset_detect`: detección de golpes sobre los stems separados.

Créalo tal como lo publica el proyecto:

```bash
conda env create -f musicldm_env.yml
conda env create -f onset_detect.yml
```

La creación puede tardar varios minutos. Si falla, guarda el texto del error;
las versiones están bastante fijadas porque es un proyecto de investigación.

## 5. Descargar los pesos

Activa el entorno de separación e instala la utilidad de Hugging Face si hace
falta:

```bash
conda activate musicldm_env
python -m pip install "huggingface_hub<1"
mkdir -p checkpoints
huggingface-cli download ddman1101/Separate-and-Detect msgld_obtb.ckpt --local-dir checkpoints
```

También hacen falta componentes de MusicLDM. Descárgalos en la carpeta
`checkpoints/`:

```bash
wget https://zenodo.org/record/10643148/files/hifigan-ckpt.ckpt -P checkpoints/
wget https://zenodo.org/record/10643148/files/vae-ckpt.ckpt -P checkpoints/
```

Comprueba el espacio ocupado antes de continuar:

```bash
du -sh checkpoints
```

## 6. Preparar una muestra corta

No empieces con la canción de 7:43. Copia primero un fragmento de 15–30 segundos
con batería clara a una carpeta de prueba:

```bash
mkdir -p ~/audio-prueba
cp /ruta/al/fragmento.wav ~/audio-prueba/bateria-20s.wav
```

Puedes convertir MP3/M4A a WAV con FFmpeg:

```bash
ffmpeg -i /ruta/al/audio.m4a -ar 44100 -ac 2 ~/audio-prueba/bateria-20s.wav
```

## 7. Configurar inferencia para un archivo propio

El repositorio no ofrece todavía un comando único para un archivo arbitrario.
La separación se controla mediante YAML y después se ejecuta una detección de
onsets sobre los stems que resulten.

Antes de ejecutar, copia el archivo de configuración para no modificar el
original:

```bash
cp config/MSG-LD/integrated_musicldm_test_inference.yaml local-inference.yaml
```

En `local-inference.yaml`, ajusta:

- `trainer.resume_from_checkpoint`: ruta absoluta a
  `checkpoints/msgld_obtb.ckpt`.
- Rutas de entrada y salida del audio en los campos `data.params.path` y
  `mdb_eval`.
- Rutas de los checkpoints VAE y HiFi-GAN a los archivos descargados en
  `checkpoints/`.

Después, el paso de separación se lanza con:

```bash
conda activate musicldm_env
CUDA_VISIBLE_DEVICES=0 python integrated_train.py --config local-inference.yaml --separate_only
```

El valor `0` selecciona la primera GPU NVIDIA. La salida esperada son cinco
stems: kick, caja, toms, charles y platos.

## 8. Detectar los golpes

Activa el segundo entorno. El script oficial escribe un archivo de texto por
stem, con una línea por golpe:

```text
segundos<TAB>tipo_de_bateria
```

```bash
conda activate onset_detect
python single_audio_onset_detection.py --input_audio /ruta/al/stem.wav --output_dir ~/audio-prueba/transcripcion
```

Ejecuta este paso sobre cada stem que haya generado la separación. Hay que
confirmar los nombres y rutas exactas que produce la versión instalada antes de
automatizarlo.

## 9. Validación antes de usar la canción completa

Escucha el fragmento y compara visualmente los eventos generados con la batería
real. Debe detectar al menos el pulso de charles, golpes de caja y kick de forma
reconocible. Si no lo hace, no procesar la canción entera: se revisa primero la
configuración y el modelo.

Para nuestro audio, la referencia inicial es:

- Tempo: **66 BPM**.
- Compás supuesto: **4/4**.
- Duración de canción: **7:43**.
- Primera prueba: un fragmento de 20 segundos alrededor del minuto 2.

## 10. Lo que queda para el plugin

Cuando la prueba sea creíble, crearemos un pequeño ejecutor que:

1. Reciba audio local.
2. Ejecute separación y detección.
3. Convierta los eventos a MIDI/JSON neutral.
4. Use `src/transcription/toDrumSource.ts` para crear el bloque `drums` de
   Obsidian, cuantizado a 66 BPM y 4/4.

El modelo debe seguir siendo externo: no se empaqueta ni descarga dentro del
plugin de Obsidian.

## Problemas frecuentes

- **`nvidia-smi` no existe o no ve la GPU:** instalar el driver NVIDIA en Mint y
  reiniciar.
- **Falta espacio:** liberar espacio antes de descargar pesos o crear entornos.
- **Error de `madmom` con `MutableSequence`:** el README oficial indica cambiar
  la importación de `collections` a `collections.abc` dentro del entorno
  `onset_detect`.
- **El entorno Conda no resuelve:** no sustituyas versiones al azar; conserva el
  error y revisaremos una alternativa compatible.
- **Windows montado en Mint:** no edites el proyecto de Windows si Windows quedó
  hibernado o con Inicio rápido activado. Trabaja en `~/proyectos/`.
