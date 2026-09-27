/**
 * Web Audio API procedural sound synthesizer for 3D Car Racing.
 * Zero external audio files required, runs reliably in browser/iframe.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmInterval: number | null = null;
  private bgmStep: number = 0;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Continuous engine roar modulated by car speed
   */
  public startEngine() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || this.isEngineRunning) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Low idle rpm

      // Lowpass filter to muffle harsh high frequencies
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
      this.isEngineRunning = true;
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public updateEnginePitch(speedRatio: number) {
    if (this.isMuted || !this.ctx || !this.engineOsc || !this.isEngineRunning) return;
    const clamped = Math.max(0, Math.min(1.5, speedRatio));
    // Frequency between 55Hz (idle) and 240Hz (top speed)
    const targetFreq = 55 + clamped * 180;
    const targetVolume = 0.04 + clamped * 0.08;

    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.08);
    }
  }

  public stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
      this.engineOsc = null;
    }
    this.isEngineRunning = false;
  }

  /**
   * Car Jump sound effect: resonant whoosh/sweep
   */
  public playJump() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.22);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Shoot blaster sound effect: arcade laser pew
   */
  public playShoot() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Explosion sound effect when rocket hits rival
   */
  public playExplosion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.4);
  }

  /**
   * Countdown beeps (3, 2, 1, ¡YA!)
   */
  public playCountdown(isGo: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    if (isGo) {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1046, now + 0.08); // high C
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  /**
   * Lap completed chime
   */
  public playLapComplete(isFinalLap: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = isFinalLap ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 739.99, 880];
    notes.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.09;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  /**
   * Victory fanfare on finish
   */
  public playVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const chords = [
      { notes: [523.25, 659.25, 783.99], time: 0, dur: 0.18 },
      { notes: [587.33, 739.99, 880.00], time: 0.2, dur: 0.18 },
      { notes: [659.25, 830.61, 987.77], time: 0.4, dur: 0.22 },
      { notes: [783.99, 987.77, 1174.66, 1567.98], time: 0.65, dur: 0.7 }
    ];

    chords.forEach(c => {
      c.notes.forEach(f => {
        const now = this.ctx!.currentTime + c.time;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + c.dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now);
        osc.stop(now + c.dur);
      });
    });
  }

  /**
   * Background arcade electronic rhythm loop
   */
  public startBGM() {
    if (this.isMuted || this.bgmPlaying) return;
    this.initContext();
    if (!this.ctx) return;

    this.bgmPlaying = true;
    this.bgmStep = 0;

    // Tempo ~130 BPM -> 16th notes every ~115ms
    const stepTimeMs = 120;
    const bassScale = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98];

    this.bgmInterval = window.setInterval(() => {
      if (this.isMuted || !this.bgmPlaying || !this.ctx) return;

      const now = this.ctx.currentTime;
      const step = this.bgmStep % 16;

      // Kick drum on 0, 4, 8, 12
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(130, now);
        kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.09);
        kickGain.gain.setValueAtTime(0.2, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        kickOsc.connect(kickGain);
        kickGain.connect(this.ctx.destination);
        kickOsc.start(now);
        kickOsc.stop(now + 0.1);
      }

      // Snare / Hi-hat on 2, 6, 10, 14
      if (step % 4 === 2) {
        const hhOsc = this.ctx.createOscillator();
        const hhGain = this.ctx.createGain();
        hhOsc.type = 'highpass' as any;
        hhOsc.frequency.setValueAtTime(900, now);
        hhGain.gain.setValueAtTime(0.06, now);
        hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        hhOsc.connect(hhGain);
        hhGain.connect(this.ctx.destination);
        hhOsc.start(now);
        hhOsc.stop(now + 0.05);
      }

      // Driving electro Bass note
      const bassNote = bassScale[(Math.floor(this.bgmStep / 2)) % bassScale.length];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassNote / 2, now);
      bassGain.gain.setValueAtTime(0.05, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.1);

      this.bgmStep++;
    }, stepTimeMs);
  }

  public stopBGM() {
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.bgmPlaying = false;
  }
}

export const soundManager = new SoundManager();
