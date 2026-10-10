export type RuntimeAudioContextState = AudioContextState | "interrupted";

interface AudioCapableWindow extends Window {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
}

interface AudioSessionNavigator extends Navigator {
    audioSession?: { type: string };
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
    return new AudioContextConstructor({ latencyHint: "interactive" });
}

export function requestPlaybackAudioSession(targetWindow: Window): void {
    const audioSession = (targetWindow.navigator as AudioSessionNavigator).audioSession;
    if (!audioSession) return;
    try {
        audioSession.type = "playback";
    } catch {
        // Older WebKit builds may expose the draft API without accepting writes.
    }
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

export async function resumeAudioContext(context: AudioContext, targetWindow: Window, timeoutMs = 900): Promise<void> {
    if (!shouldResumeAudioContext(runtimeAudioContextState(context))) return;

    try {
        await audioPromiseWithTimeout(context.resume(), targetWindow, timeoutMs);
    } catch {
        throw new AudioActivationError();
    }

    if (runtimeAudioContextState(context) !== "running") throw new AudioActivationError();
}

export function hasAudioClockAdvanced(before: number, after: number): boolean {
    return after - before > 0.001;
}

/**
 * WebKit can claim that a context is running while its rendering clock is
 * frozen. Probe the clock and use the suspend/resume recovery recommended for
 * this iOS state before any notes are scheduled.
 */
export async function ensureAudioContextProgress(
    context: AudioContext,
    targetWindow: Window,
    probeMs = 80,
): Promise<void> {
    let before = context.currentTime;
    await delay(targetWindow, probeMs);
    if (hasAudioClockAdvanced(before, context.currentTime)) return;

    try {
        await audioPromiseWithTimeout(context.suspend(), targetWindow, 900);
        primeAudioContext(context);
        await resumeAudioContext(context, targetWindow);
    } catch {
        throw new AudioActivationError();
    }

    before = context.currentTime;
    await delay(targetWindow, probeMs);
    if (!hasAudioClockAdvanced(before, context.currentTime)) throw new AudioActivationError();
}

async function audioPromiseWithTimeout(promise: Promise<void>, targetWindow: Window, timeoutMs: number): Promise<void> {
    let timer = 0;
    try {
        await new Promise<void>((resolve, reject) => {
            timer = targetWindow.setTimeout(() => reject(new AudioActivationError()), timeoutMs);
            void promise.then(resolve, reject);
        });
    } finally {
        targetWindow.clearTimeout(timer);
    }
}

function delay(targetWindow: Window, milliseconds: number): Promise<void> {
    return new Promise(resolve => targetWindow.setTimeout(resolve, milliseconds));
}
