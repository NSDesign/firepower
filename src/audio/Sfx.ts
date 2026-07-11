// Retro sound effects synthesized with WebAudio — no audio assets needed.
class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  /** Must be called from a user gesture (pointer/keydown) to unlock audio. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.4;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  private noise(dur: number, vol: number, filterFreq: number, freqEnd?: number): void {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t);
    if (freqEnd) filter.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  cannon(): void {
    this.noise(0.35, 0.9, 900, 120);
    this.tone('sine', 120, 40, 0.3, 0.8);
  }

  mg(): void {
    this.noise(0.07, 0.5, 2400, 600);
  }

  rifle(): void {
    this.noise(0.05, 0.25, 3200, 900);
  }

  explosion(big = false): void {
    this.noise(big ? 0.9 : 0.5, 1.0, big ? 700 : 500, 60);
    this.tone('sine', big ? 90 : 70, 30, big ? 0.7 : 0.45, 0.9);
  }

  hit(): void {
    this.noise(0.12, 0.5, 1400, 300);
  }

  clank(): void {
    this.tone('square', 220, 80, 0.08, 0.3);
  }

  pickup(): void {
    this.tone('square', 440, 440, 0.07, 0.25);
    this.tone('square', 660, 660, 0.07, 0.25, 0.08);
    this.tone('square', 880, 880, 0.1, 0.25, 0.16);
  }

  rescue(): void {
    this.tone('square', 523, 523, 0.08, 0.25);
    this.tone('square', 784, 784, 0.12, 0.25, 0.09);
  }

  flag(): void {
    this.tone('square', 392, 392, 0.1, 0.3);
    this.tone('square', 523, 523, 0.1, 0.3, 0.11);
    this.tone('square', 659, 659, 0.1, 0.3, 0.22);
    this.tone('square', 784, 784, 0.2, 0.3, 0.33);
  }

  win(): void {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((n, i) => this.tone('square', n, n, 0.16, 0.3, i * 0.15));
  }

  lose(): void {
    const notes = [392, 330, 262, 196];
    notes.forEach((n, i) => this.tone('sawtooth', n, n * 0.94, 0.3, 0.3, i * 0.28));
  }

  /** Engine hum controlled by throttle 0..1; call every frame. */
  engine(throttle: number): void {
    if (!this.ctx || !this.master) return;
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain).connect(this.master);
      this.engineOsc.start();
    }
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(50 + throttle * 45, t, 0.1);
    this.engineGain!.gain.setTargetAtTime(0.03 + throttle * 0.05, t, 0.1);
  }

  engineOff(): void {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }
}

export const Sfx = new SfxEngine();
