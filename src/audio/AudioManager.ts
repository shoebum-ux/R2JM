/**
 * AudioManager — every sound in the game is synthesized with WebAudio.
 * No audio files: squeaks, whistles, horns and the victory tune are all
 * little oscillator sketches, which keeps the whole game one small bundle.
 */

import { getMuted, setMuted, getMusicMuted, setMusicMuted } from '../systems/Save';

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** Music + ambience route through here so they can mute without SFX. */
  private musicGain: GainNode | null = null;
  private ambGain: GainNode | null = null;
  private ambNoise: AudioBufferSourceNode | null = null;
  private musicTimer: number | null = null;
  private gameMusicTimer: number | null = null;
  private stepAt = 0;
  muted = getMuted();
  musicMuted = getMusicMuted();

  /** Must be called from a user gesture (menu tap) to unlock audio. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    // No global mute button anymore — master always on; only music can mute.
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicMuted ? 0 : 1;
    this.musicGain.connect(this.master);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    setMuted(this.muted);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.55, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  /** Toggle background music only — sound effects stay on. */
  toggleMusic(): boolean {
    this.musicMuted = !this.musicMuted;
    setMusicMuted(this.musicMuted);
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicMuted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    return this.musicMuted;
  }

  // ------------------------------------------------------------- primitives

  /** `dest` lets music route through musicGain; SFX default to master. */
  private beep(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number, when = 0, dest?: AudioNode): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(dest ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, vol = 0.25, filterFreq = 1200, when = 0, dest?: AudioNode): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.master);
    src.start(t);
  }

  private mdest(): AudioNode | undefined {
    return this.musicGain ?? undefined;
  }

  // ----------------------------------------------------------------- events

  /** Cartoon footstep tick — rate-limited internally. */
  step(): void {
    const now = performance.now();
    if (now - this.stepAt < 170) return;
    this.stepAt = now;
    this.beep(160 + Math.random() * 60, 0.05, 'triangle', 0.08, 90);
  }

  squeak(): void {
    this.beep(900 + Math.random() * 500, 0.12, 'square', 0.1, 1600);
  }

  pickup(): void {
    this.beep(660, 0.09, 'sine', 0.22);
    this.beep(990, 0.12, 'sine', 0.2, undefined, 0.08);
  }

  whistle(): void {
    this.beep(2100, 0.28, 'sine', 0.22, 2600);
    this.beep(2400, 0.3, 'sine', 0.18, 1900, 0.3);
  }

  horn(): void {
    this.beep(310, 0.25, 'sawtooth', 0.14);
    this.beep(392, 0.25, 'sawtooth', 0.14);
  }

  splash(): void {
    this.noise(0.3, 0.3, 900);
  }

  hiss(): void {
    this.noise(0.6, 0.14, 3200);
  }

  lathiSwish(): void {
    this.noise(0.16, 0.24, 2600);
  }

  /** The bus vacuums you up: descending cartoon gliss. */
  suck(): void {
    this.beep(1200, 0.7, 'sawtooth', 0.24, 90);
    this.noise(0.6, 0.2, 700, 0.1);
  }

  squish(): void {
    this.noise(0.12, 0.4, 500);
    this.beep(140, 0.25, 'sine', 0.3, 40);
  }

  boom(): void {
    this.noise(0.5, 0.4, 320);
  }

  gameOverSting(): void {
    this.beep(392, 0.28, 'triangle', 0.28);
    this.beep(311, 0.28, 'triangle', 0.28, undefined, 0.26);
    this.beep(233, 0.6, 'triangle', 0.3, undefined, 0.52);
  }

  /** Distant crowd chatter — call with 0..1 proximity to the party. */
  setAmbience(level: number): void {
    if (!this.ctx || !this.master) return;
    if (!this.ambNoise) {
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin(i / 4000));
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 700;
      f.Q.value = 0.6;
      this.ambGain = this.ctx.createGain();
      this.ambGain.gain.value = 0;
      src.connect(f).connect(this.ambGain).connect(this.musicGain ?? this.master);
      src.start();
      this.ambNoise = src;
    }
    this.ambGain!.gain.setTargetAtTime(level * 0.12, this.ctx.currentTime, 0.4);
  }

  stopAmbience(): void {
    if (this.ambGain && this.ctx) this.ambGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  // ----------------------------------------------------------------- music

  /**
   * Gameplay background loop: an original 8-bit chiptune in A-minor — a driving,
   * slightly tense "sneaking through the city" groove. Fully synthesized, so
   * it's royalty-free and ships with zero audio files. Kept quiet so footsteps,
   * whistles and horns still cut through.
   */
  startGameMusic(): void {
    if (this.gameMusicTimer !== null || !this.ctx) return;
    // two-bar lead (A natural minor) + walking bass, 32 steps
    const lead = [
      440, 0, 523, 494, 440, 0, 392, 440,
      330, 0, 392, 440, 494, 0, 440, 392,
      440, 0, 523, 587, 523, 0, 494, 440,
      392, 0, 330, 392, 294, 0, 330, 0
    ];
    const bass = [
      110, 0, 110, 110, 87, 0, 87, 87,
      98, 0, 98, 98, 82, 0, 82, 0,
      110, 0, 110, 110, 87, 0, 87, 87,
      98, 0, 98, 98, 110, 0, 110, 0
    ];
    let i = 0;
    const stepMs = 150;
    const md = this.mdest();
    this.gameMusicTimer = window.setInterval(() => {
      const n = lead[i % lead.length];
      if (n) this.beep(n, 0.13, 'square', 0.06, undefined, 0, md);
      const b = bass[i % bass.length];
      if (b) this.beep(b, 0.16, 'triangle', 0.12, undefined, 0, md);
      if (i % 4 === 0) this.noise(0.09, 0.13, 200, 0, md);   // kick
      if (i % 4 === 2) this.noise(0.05, 0.07, 6500, 0, md);  // snare-ish
      if (i % 2 === 1) this.noise(0.02, 0.04, 8000, 0, md);  // hat
      i++;
    }, stepMs);
  }

  stopGameMusic(): void {
    if (this.gameMusicTimer !== null) {
      clearInterval(this.gameMusicTimer);
      this.gameMusicTimer = null;
    }
  }

  /** Party loop: a scrappy little chiptune bhangra-ish groove. */
  startPartyMusic(): void {
    if (this.musicTimer !== null || !this.ctx) return;
    // D minor-ish pentatonic riff + offbeat percussion
    const riff = [294, 0, 349, 294, 440, 0, 392, 349, 294, 0, 349, 440, 523, 440, 392, 349];
    const bass = [147, 147, 0, 147, 175, 0, 147, 0];
    let i = 0;
    const stepMs = 140;
    const md = this.mdest();
    this.musicTimer = window.setInterval(() => {
      const n = riff[i % riff.length];
      if (n) this.beep(n, 0.12, 'square', 0.09, undefined, 0, md);
      const b = bass[i % bass.length];
      if (b) this.beep(b, 0.14, 'triangle', 0.16, undefined, 0, md);
      if (i % 2 === 0) this.noise(0.03, 0.09, 6000, 0, md);       // hat
      if (i % 8 === 0) this.noise(0.1, 0.2, 200, 0, md);          // dhol-ish thump
      if (i % 8 === 4) this.beep(90, 0.1, 'sine', 0.22, 60, 0, md); // dha
      i++;
    }, stepMs);
  }

  stopPartyMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  victoryFanfare(): void {
    const md = this.mdest();
    const notes = [392, 523, 659, 784];
    notes.forEach((n, i) => this.beep(n, 0.35, 'triangle', 0.25, undefined, i * 0.14, md));
    this.beep(1046, 0.7, 'triangle', 0.25, undefined, notes.length * 0.14, md);
  }
}

/** Singleton — audio outlives scene restarts. */
export const Audio = new AudioManagerImpl();
