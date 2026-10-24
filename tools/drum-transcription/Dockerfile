# Audio -> drum MIDI for the plugin's "Insert drum notation from a .mid file" command.
# Demucs isolates the drum stem, Omnizart transcribes it to kick/snare/hi-hat notes.
# The base image already ships Omnizart, TensorFlow, ffmpeg and the drum checkpoint.
ARG BASE_IMAGE=mctlab/omnizart@sha256:edfbfb7816288160b53e2c8325b2a82b989cef7bddaebfc7808a88693252f769
FROM ${BASE_IMAGE}

# CPU-only PyTorch keeps the image small enough and works on any Docker Desktop host.
RUN pip install --no-cache-dir torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir demucs==4.0.1 soundfile

# Bake the separation model into the image so runs work offline.
ENV TORCH_HOME=/opt/torch
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')"

# madmom 0.16 picks the best bar length with an array NumPy 2 rejects; compare the scores directly.
RUN sed -i 's/best = np.argmax(np.asarray(results)\[:, 1\])/best = int(np.argmax([result[1] for result in results]))/' \
        /usr/local/lib/python3.11/dist-packages/madmom/features/downbeats.py \
 && grep -q "result\[1\] for result in results" /usr/local/lib/python3.11/dist-packages/madmom/features/downbeats.py

COPY transcribe.py /opt/drum-transcription/transcribe.py
WORKDIR /work
ENTRYPOINT ["python", "/opt/drum-transcription/transcribe.py"]
