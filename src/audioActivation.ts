export type RuntimeAudioContextState = AudioContextState | "interrupted";

interface AudioCapableWindow extends Window {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
}

export class AudioActivationError extends Error {
    constructor() {
        super("The audio engine could not be activated.");
        this.name = "AudioActivationError";
    }
}

export function runtimeAudioContextState(context: AudioContext): RuntimeAudioContextState {
    return context.state;
}

export function shouldReplaceAudioContext(state: RuntimeAudioContextState, refreshRequested: boolean): boolean {
    return refreshRequested || state === "closed" || state === "interrupted";
}

export function shouldResumeAudioContext(state: RuntimeAudioContextState): boolean {
    return state !== "running";
}

export function createCompatibleAudioContext(targetWindow: Window): AudioContext {
    const audioWindow = targetWindow as AudioCapableWindow;
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) throw new AudioActivationError();
    return new AudioContextConstructor();
}

/**
 * Starts a silent, one-frame source while the original pointer gesture is still
 * active. WebKit uses this playback request to unlock a newly created context.
 */
export function primeAudioContext(context: AudioContext): void {
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = context.createBuffer(1, 1, context.sampleRate);
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(context.destination);
    source.addEventListener("ended", () => {
        source.disconnect();
        gain.disconnect();
    }, { once: true });
    source.start();
}

export async function resumeAudioContext(context: AudioContext, timeoutMs = 900): Promise<void> {
    if (!shouldResumeAudioContext(runtimeAudioContextState(context))) return;

    let timer = 0;
    try {
        await new Promise<void>((resolve, reject) => {
            timer = window.setTimeout(() => reject(new AudioActivationError()), timeoutMs);
            void context.resume().then(resolve, reject);
        });
    } catch {
        throw new AudioActivationError();
    } finally {
        window.clearTimeout(timer);
    }

    if (runtimeAudioContextState(context) !== "running") throw new AudioActivationError();
}
