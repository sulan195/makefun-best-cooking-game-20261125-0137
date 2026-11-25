// Sizzle Station — procedural sound effects, synthesised with WebAudio.
// No audio files, no network: every sound is a few oscillators or a short
// burst of filtered noise. The context is created on the first user gesture;
// before that, play() silently does nothing, so headless screenshots never
// touch audio.

export function createAudio() {
  let context = null;
  let master = null;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.25;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, seconds, type = 'sine', volume = 1, slideTo = null) {
    if (!ensure() || context.state === 'suspended') return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  function noise(seconds, filterFreq = 1200, volume = 0.5) {
    if (!ensure() || context.state === 'suspended') return;
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  /** Play a named effect. Unknown names are ignored. */
  function play(name) {
    switch (name) {
      case 'pickup': tone(520, 0.08, 'triangle', 0.7, 780); break;
      case 'chop-start': noise(0.05, 900, 0.4); break;
      case 'chop-done': noise(0.09, 700, 0.7); tone(180, 0.07, 'square', 0.3); break;
      case 'place': tone(300, 0.1, 'triangle', 0.6, 220); break;
      case 'plate': tone(660, 0.09, 'triangle', 0.6, 880); break;
      case 'cook-ready': tone(880, 0.12, 'sine', 0.8); tone(1320, 0.16, 'sine', 0.6); break;
      case 'burnt': tone(220, 0.3, 'sawtooth', 0.5, 110); break;
      case 'serve': tone(523, 0.1, 'triangle', 0.8); tone(659, 0.1, 'triangle', 0.8); tone(784, 0.18, 'triangle', 0.8); break;
      case 'expire': tone(392, 0.25, 'sawtooth', 0.5, 196); break;
      case 'rush': tone(440, 0.1, 'square', 0.5, 660); tone(660, 0.14, 'square', 0.5, 880); break;
      case 'gameover': tone(330, 0.3, 'triangle', 0.7, 165); tone(220, 0.5, 'triangle', 0.7, 110); break;
      case 'trash': noise(0.12, 500, 0.5); break;
      case 'error': tone(140, 0.15, 'square', 0.4); break;
      default: break;
    }
  }

  return { play, ensure };
}
