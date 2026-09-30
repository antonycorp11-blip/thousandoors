// AudioManager — fully procedural WebAudio: no audio files. Directional (left/right/behind) cues,
// sparse ambience beds and minimal piano/drone music. Silence is a tool: most rooms stay quiet.
import type { Settings } from './types';

type PlayOpts = { pan?: number; behind?: boolean; volume?: number };

export class AudioManager {
  ctx: AudioContext | null = null;
  private master!: GainNode; private sfx!: GainNode; private music!: GainNode; private amb!: GainNode;
  private reverb!: ConvolverNode; private reverbSend!: GainNode;
  private noise!: AudioBuffer;
  private ambNodes: AudioNode[] = [];
  private ambTimers: number[] = [];
  private ambId: string | null = null;
  private musicTimer = 0;
  enabled = typeof window !== 'undefined' && typeof (window as any).AudioContext !== 'undefined';

  constructor(private settings: () => Settings) {}

  unlock(): void {
    if (!this.enabled) return;
    if (!this.ctx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      const c = this.ctx!;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master = c.createGain(); this.master.connect(comp); comp.connect(c.destination);
      this.sfx = c.createGain(); this.sfx.connect(this.master);
      this.music = c.createGain(); this.music.connect(this.master);
      this.amb = c.createGain(); this.amb.connect(this.master);
      this.reverb = c.createConvolver(); this.reverb.buffer = this.impulse(2.8, 2.2);
      this.reverbSend = c.createGain(); this.reverbSend.gain.value = 0.35;
      this.reverbSend.connect(this.reverb); this.reverb.connect(this.master);
      this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      this.scheduleMusic();
    }
    if (this.ctx!.state === 'suspended') this.ctx!.resume();
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    const s = this.settings();
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.master, t, 0.05);
    this.sfx.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.music.gain.setTargetAtTime(s.music * 0.5, t, 0.05);
    this.amb.gain.setTargetAtTime(s.ambience * 0.6, t, 0.05);
  }

  private impulse(sec: number, decay: number): AudioBuffer {
    const c = this.ctx!;
    const len = c.sampleRate * sec;
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  /** Output chain for a positioned sound: stereo pan, or HRTF "behind the listener". */
  private out(o: PlayOpts, wet = 0.3): AudioNode {
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.value = o.volume ?? 1;
    let node: AudioNode = g;
    if (o.behind) {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      const p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
      p.positionX.value = (o.pan ?? 0) * 0.5; p.positionY.value = 0; p.positionZ.value = 1.2;
      g.connect(lp); lp.connect(p); node = p;
    } else if (o.pan) {
      const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan));
      g.connect(p); node = p;
    }
    node.connect(this.sfx);
    const send = c.createGain(); send.gain.value = wet; node.connect(send); send.connect(this.reverbSend);
    return g;
  }

  private noiseBurst(dest: AudioNode, t: number, dur: number, type: BiquadFilterType, freq: number, q = 1, gain = 0.5, freqEnd?: number) {
    const c = this.ctx!;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  private tone(dest: AudioNode, t: number, freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.3, attack = 0.005, freqEnd?: number) {
    const c = this.ctx!;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }

  piano(freq: number, when = 0, gain = 0.22, dest?: AudioNode) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const d = dest ?? this.out({}, 0.6);
    this.tone(d, t, freq, 2.8, 'triangle', gain, 0.004);
    this.tone(d, t, freq * 2, 1.6, 'sine', gain * 0.35, 0.004);
    this.tone(d, t, freq * 3.01, 0.8, 'sine', gain * 0.12, 0.004);
  }

  play(id: string, o: PlayOpts = {}): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx; const t = c.currentTime;
    const d = this.out(o);
    switch (id) {
      case 'creak': case 'door_open': {
        const osc = c.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90 + Math.random() * 40, t); osc.frequency.linearRampToValueAtTime(160 + Math.random() * 80, t + 0.5); osc.frequency.linearRampToValueAtTime(110, t + 0.9);
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
        const lfo = c.createOscillator(); lfo.frequency.value = 23; const lg = c.createGain(); lg.gain.value = 0.08; lfo.connect(lg); lg.connect(g.gain);
        osc.connect(f); f.connect(g); g.connect(d); osc.start(t); lfo.start(t); osc.stop(t + 1.1); lfo.stop(t + 1.1);
        break;
      }
      case 'creak_many': for (let i = 0; i < 5; i++) setTimeout(() => this.play('creak', { pan: Math.random() * 2 - 1, volume: 0.5 }), i * 90); break;
      case 'knob': this.noiseBurst(d, t, 0.06, 'bandpass', 3200, 4, 0.4); this.noiseBurst(d, t + 0.12, 0.05, 'bandpass', 2400, 4, 0.3); break;
      case 'door_close': case 'door_slam': this.noiseBurst(d, t, 0.35, 'lowpass', 400, 1, id === 'door_slam' ? 1 : 0.5); this.tone(d, t, 70, 0.3, 'sine', 0.5); break;
      case 'knock': for (let i = 0; i < 3; i++) { this.noiseBurst(d, t + i * 0.28, 0.12, 'lowpass', 500, 2, 0.8); this.tone(d, t + i * 0.28, 110, 0.12, 'sine', 0.4); } break;
      case 'bang': this.noiseBurst(d, t, 0.25, 'lowpass', 300, 1, 1); this.tone(d, t, 55, 0.3, 'sine', 0.6); break;
      case 'crash': this.noiseBurst(d, t, 0.6, 'lowpass', 1800, 0.7, 1, 200); this.noiseBurst(d, t + 0.05, 0.4, 'highpass', 2500, 1, 0.3); break;
      case 'footsteps': case 'heavy_steps': {
        const heavy = id === 'heavy_steps';
        for (let i = 0; i < 6; i++) this.noiseBurst(d, t + i * (heavy ? 0.55 : 0.42), 0.1, 'lowpass', heavy ? 250 : 600, 1.5, heavy ? 0.9 : 0.5);
        break;
      }
      case 'drip': this.tone(d, t, 1400, 0.12, 'sine', 0.25, 0.002, 700); break;
      case 'tick': for (let i = 0; i < 4; i++) this.noiseBurst(d, t + i * 0.5, 0.02, 'highpass', 4000, 1, 0.3); break;
      case 'whisper': for (let i = 0; i < 5; i++) this.noiseBurst(d, t + i * 0.15 + Math.random() * 0.05, 0.18, 'bandpass', 2500 + Math.random() * 1500, 3, 0.25); break;
      case 'breath': this.noiseBurst(d, t, 1.2, 'bandpass', 700, 0.8, 0.35); this.noiseBurst(d, t + 1.5, 1.4, 'bandpass', 500, 0.8, 0.3); break;
      case 'heartbeat': for (let i = 0; i < 3; i++) { this.tone(d, t + i * 0.8, 55, 0.18, 'sine', 0.7); this.tone(d, t + i * 0.8 + 0.22, 48, 0.2, 'sine', 0.5); } break;
      case 'sting': [110, 116.5, 155.6, 233].forEach(f => this.tone(d, t, f, 2.2, 'sawtooth', 0.09, 0.01)); this.noiseBurst(d, t, 0.5, 'highpass', 3000, 1, 0.2); break;
      case 'sting_soft': [220, 233, 311].forEach(f => this.tone(d, t, f, 1.8, 'sine', 0.08, 0.2)); break;
      case 'bulb_pop': this.noiseBurst(d, t, 0.08, 'highpass', 2000, 1, 0.5); break;
      case 'phone_ring': for (let r = 0; r < 2; r++) for (let i = 0; i < 16; i++) this.tone(d, t + r * 1.2 + i * 0.05, i % 2 ? 480 : 440, 0.05, 'square', 0.05); break;
      case 'phone_voice': this.noiseBurst(d, t, 2, 'bandpass', 1200, 2, 0.15); break;
      case 'gramophone': [262, 330, 392, 330, 294, 262].forEach((f, i) => this.piano(f, i * 0.4, 0.12)); this.noiseBurst(d, t, 3, 'highpass', 3000, 1, 0.05); break;
      case 'musicbox': [523, 1047, 784, 1047].forEach((f, i) => this.tone(d, t + i * 0.45, f, 1.2, 'sine', 0.12, 0.002)); break;
      case 'crack': this.noiseBurst(d, t, 0.4, 'highpass', 800, 1, 0.6, 3000); break;
      case 'scream_house': this.tone(d, t, 180, 1.5, 'sawtooth', 0.12, 0.05, 90); this.noiseBurst(d, t, 1.5, 'bandpass', 900, 1, 0.3); break;
      case 'child_laugh': for (let i = 0; i < 5; i++) this.tone(d, t + i * 0.12, 700 + (i % 2) * 120, 0.1, 'triangle', 0.08); break;
      case 'paper': case 'page': for (let i = 0; i < 3; i++) this.noiseBurst(d, t + i * 0.07, 0.09, 'highpass', 3500, 1, 0.25); break;
      case 'cloth': this.noiseBurst(d, t, 0.5, 'bandpass', 1500, 0.5, 0.2); break;
      case 'stone_scrape': this.noiseBurst(d, t, 0.8, 'bandpass', 400, 2, 0.4); break;
      case 'bell': [880, 1320, 1760].forEach(f => this.tone(d, t, f, 3, 'sine', 0.1, 0.002)); break;
      case 'whistle': this.tone(d, t, 1800, 0.6, 'sine', 0.2, 0.02); break;
      case 'flash': this.noiseBurst(d, t, 0.2, 'highpass', 5000, 1, 0.3); break;
      case 'memory_chime': [523, 659, 784, 1047].forEach((f, i) => this.tone(d, t + i * 0.18, f, 2, 'sine', 0.07, 0.01)); break;
      case 'unlock': case 'key_turn': this.noiseBurst(d, t, 0.05, 'bandpass', 2800, 5, 0.5); this.noiseBurst(d, t + 0.18, 0.08, 'bandpass', 1800, 5, 0.6); this.tone(d, t + 0.18, 300, 0.1, 'sine', 0.2); break;
      case 'key_fail': this.noiseBurst(d, t, 0.06, 'bandpass', 2600, 5, 0.4); this.noiseBurst(d, t + 0.1, 0.06, 'bandpass', 2600, 5, 0.3); break;
      case 'key_pickup': this.tone(d, t, 1760, 0.4, 'sine', 0.08); this.tone(d, t + 0.05, 2637, 0.4, 'sine', 0.05); break;
      case 'key_break': case 'glass_break': this.noiseBurst(d, t, 0.3, 'highpass', 4000, 1, 0.5); break;
      case 'pickup': this.tone(d, t, 660, 0.25, 'sine', 0.08); break;
      case 'solve': [392, 494, 587, 784].forEach((f, i) => this.piano(f, i * 0.12, 0.12)); break;
      case 'fail': this.tone(d, t, 140, 0.4, 'sawtooth', 0.06); break;
      case 'achievement': [523, 784].forEach((f, i) => this.piano(f, i * 0.2, 0.1)); break;
      case 'upgrade': this.piano(392, 0, 0.12); this.piano(587, 0.15, 0.1); break;
      case 'fragment': this.tone(d, t, 1318, 0.8, 'sine', 0.05, 0.02); break;
      case 'damage': this.tone(d, t, 90, 0.4, 'sine', 0.6, 0.005, 40); this.noiseBurst(d, t, 0.2, 'lowpass', 600, 1, 0.5); break;
      case 'death': this.tone(d, t, 110, 4, 'sine', 0.3, 0.3, 30); break;
      case 'turn': this.noiseBurst(d, t, 0.35, 'bandpass', 600, 0.7, 0.12, 1400); break;
      case 'ui': this.tone(d, t, 880, 0.05, 'sine', 0.03); break;
      default: break;
    }
  }

  /** Door opening: knob, then creak by material profile. */
  door(profile: string): void {
    this.play('knob');
    setTimeout(() => {
      if (profile === 'metal') { this.play('bang', { volume: 0.4 }); this.play('creak', { volume: 0.4 }); }
      else if (profile === 'soft') this.play('cloth');
      else this.play('creak', { volume: profile === 'squeak' ? 1 : 0.7 });
    }, 220);
  }

  ambience(id: string | null): void {
    if (!this.ctx) { this.ambId = id; return; }
    if (id === this.ambId && this.ambNodes.length) return;
    this.ambId = id;
    const t = this.ctx.currentTime;
    for (const n of this.ambNodes) { try { (n as any).gain?.setTargetAtTime(0, t, 0.4); (n as any).stop?.(t + 1.5); } catch { /* */ } }
    this.ambTimers.forEach(clearInterval); this.ambTimers = [];
    this.ambNodes = [];
    if (!id || id === 'silence') return;
    const c = this.ctx;
    const bed = (type: BiquadFilterType, freq: number, q: number, gain: number) => {
      const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 2);
      s.connect(f); f.connect(g); g.connect(this.amb); s.start();
      this.ambNodes.push(s, g);
    };
    const hum = (freq: number, gain: number) => {
      const o = c.createOscillator(); o.frequency.value = freq; o.type = 'sine';
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 2);
      o.connect(g); g.connect(this.amb); o.start();
      this.ambNodes.push(o, g);
    };
    const every = (ms: number, fn: () => void) => { this.ambTimers.push(window.setInterval(() => { if (Math.random() < 0.6) fn(); }, ms)); };
    switch (id) {
      case 'room': bed('lowpass', 180, 0.5, 0.05); every(9000, () => this.play('creak', { volume: 0.15, pan: Math.random() * 2 - 1 })); break;
      case 'corridor': bed('bandpass', 300, 0.4, 0.05); hum(60, 0.012); break;
      case 'drip': bed('lowpass', 200, 0.5, 0.03); every(1900, () => this.play('drip', { volume: 0.3, pan: 0.3 })); break;
      case 'wind': bed('bandpass', 400, 0.3, 0.07); break;
      case 'clock': bed('lowpass', 150, 0.5, 0.03); every(1000, () => this.play('tick', { volume: 0.15 })); break;
      case 'hum': hum(50, 0.02); hum(100, 0.008); break;
      case 'boiler': bed('lowpass', 90, 1, 0.12); hum(38, 0.03); break;
      case 'rain': bed('highpass', 1800, 0.3, 0.06); bed('lowpass', 500, 0.3, 0.04); break;
      case 'whitehum': hum(120, 0.02); hum(240, 0.01); break;
      case 'drone': hum(55, 0.03); hum(82.4, 0.015); break;
      case 'memory': hum(261.6, 0.008); hum(392, 0.006); break;
      case 'water': bed('lowpass', 400, 1, 0.06); every(2500, () => this.play('drip', { volume: 0.2, pan: Math.random() * 2 - 1 })); break;
      case 'musicbox': every(12000, () => this.play('musicbox', { volume: 0.2, pan: -0.4 })); break;
      case 'machines': bed('lowpass', 120, 2, 0.1); every(1400, () => this.play('tick', { volume: 0.3 })); break;
      case 'zero': hum(55, 0.012); break;
      case 'sanctuary': bed('highpass', 2000, 0.3, 0.02); break;
      default: bed('lowpass', 180, 0.5, 0.04);
    }
  }

  /** Minimal music: a rare, sparse piano phrase over a drone. Silence most of the time. */
  private scheduleMusic(): void {
    const minor = [220, 246.9, 261.6, 293.7, 329.6, 349.2, 392];
    const next = () => {
      this.musicTimer = window.setTimeout(() => {
        if (this.ctx && this.settings().music > 0 && Math.random() < 0.55) {
          const d = this.ctx.createGain(); d.gain.value = 1; d.connect(this.music);
          const send = this.ctx.createGain(); send.gain.value = 0.8; d.connect(send); send.connect(this.reverbSend);
          const phrase = 3 + Math.floor(Math.random() * 4);
          let when = 0;
          for (let i = 0; i < phrase; i++) {
            const f = minor[Math.floor(Math.random() * minor.length)] * (Math.random() < 0.3 ? 0.5 : 1);
            this.piano(f, when, 0.12, d);
            when += 0.9 + Math.random() * 1.4;
          }
        }
        next();
      }, 55000 + Math.random() * 70000);
    };
    next();
  }

  note(freq: number) { this.piano(freq, 0, 0.2); }
}
