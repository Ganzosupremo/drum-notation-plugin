#!/usr/bin/env bash
# Separa la batería de una canción y la transcribe a un .mid para el plugin.
# Uso: ./transcribe-drums.sh cancion.mp3 [--output-dir DIR] [--bpm 66] [--no-separate] [--keep-stem]
set -euo pipefail

image=drum-transcription
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -lt 1 ]]; then
    echo "Uso: $0 AUDIO [--output-dir DIR] [--bpm BPM] [--no-separate] [--keep-stem]" >&2
    exit 1
fi

audio="$(realpath "$1")"
shift
out_dir="$(dirname "$audio")"
args=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        -o|--output-dir) out_dir="$2"; shift 2 ;;
        *) args+=("$1"); shift ;;
    esac
done
mkdir -p "$out_dir"
out_dir="$(realpath "$out_dir")"

if [[ -n "${REBUILD:-}" ]] || ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "Construyendo la imagen $image (la primera vez tarda bastante)..."
    docker build -t "$image" "$here"
fi

docker run --rm \
    -v "$(dirname "$audio"):/in:ro" \
    -v "$out_dir:/out" \
    "$image" "/in/$(basename "$audio")" --output-dir /out ${args[@]+"${args[@]}"}
