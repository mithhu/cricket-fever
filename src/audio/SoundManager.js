export class SoundManager {
  constructor() {
    this._ctx = null;
    this._masterGain = null;
    this._muted = false;
    this._ambientSource = null;
    this._ambientGain = null;
  }

  _ensureContext() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = 0.6;
    this._masterGain.connect(this._ctx.destination);
  }

  _resumeContext() {
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  }

  setMuted(muted) {
    this._muted = muted;
    if (this._masterGain) {
      this._masterGain.gain.value = muted ? 0 : 0.6;
    }
  }

  toggleMute() {
    this.setMuted(!this._muted);
    return this._muted;
  }

  isMuted() {
    return this._muted;
  }

  playBatCrack() {
    this._ensureContext();
    this._resumeContext();
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    }
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter).connect(gain).connect(this._masterGain);
    noise.start(now);
    noise.stop(now + 0.15);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(oscGain).connect(this._masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playBowlRelease() {
    this._ensureContext();
    this._resumeContext();
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
    }
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(filter).connect(gain).connect(this._masterGain);
    noise.start(now);
    noise.stop(now + 0.1);
  }

  playWicketFall() {
    this._ensureContext();
    this._resumeContext();
    const ctx = this._ctx;
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      const baseFreq = 1200 - i * 200;
      osc.frequency.setValueAtTime(baseFreq, now + i * 0.06);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, now + i * 0.06 + 0.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

      osc.connect(gain).connect(this._masterGain);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.25);
    }

    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }
    noise.buffer = buffer;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.3, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    noise.connect(nGain).connect(this._masterGain);
    noise.start(now);
    noise.stop(now + 0.3);
  }

  playBoundaryCheer(isSix) {
    this._ensureContext();
    this._resumeContext();
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const duration = isSix ? 2.0 : 1.4;

    const noise = ctx.createBufferSource();
    const len = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.sin((i / len) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(isSix ? 0.5 : 0.35, now + 0.15);
    gain.gain.linearRampToValueAtTime(isSix ? 0.45 : 0.3, now + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    noise.connect(filter).connect(gain).connect(this._masterGain);
    noise.start(now);
    noise.stop(now + duration);

    if (isSix) {
      const horn = ctx.createOscillator();
      horn.type = 'sawtooth';
      horn.frequency.setValueAtTime(220, now + 0.2);
      horn.frequency.setValueAtTime(330, now + 0.5);
      const hGain = ctx.createGain();
      hGain.gain.setValueAtTime(0, now + 0.2);
      hGain.gain.linearRampToValueAtTime(0.12, now + 0.35);
      hGain.gain.linearRampToValueAtTime(0, now + 0.8);
      horn.connect(hGain).connect(this._masterGain);
      horn.start(now + 0.2);
      horn.stop(now + 0.8);
    }
  }

  playBounce() {
    this._ensureContext();
    this._resumeContext();
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain).connect(this._masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playCatchCheer() {
    this._ensureContext();
    this._resumeContext();
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    const len = ctx.sampleRate * 0.8;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
    }
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);

    noise.connect(filter).connect(gain).connect(this._masterGain);
    noise.start(now);
    noise.stop(now + 0.8);
  }

  startAmbientCrowd() {
    this._ensureContext();
    this._resumeContext();
    if (this._ambientSource) return;
    const ctx = this._ctx;

    const len = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) {
      v += (Math.random() * 2 - 1) * 0.05;
      v *= 0.998;
      data[i] = v;
    }

    this._ambientSource = ctx.createBufferSource();
    this._ambientSource.buffer = buffer;
    this._ambientSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 0.3;

    this._ambientGain = ctx.createGain();
    this._ambientGain.gain.value = 0.08;

    this._ambientSource.connect(filter).connect(this._ambientGain).connect(this._masterGain);
    this._ambientSource.start();
  }

  stopAmbientCrowd() {
    if (this._ambientSource) {
      try { this._ambientSource.stop(); } catch (_e) { /* ignore */ }
      this._ambientSource = null;
      this._ambientGain = null;
    }
  }

  playDotBall() {
    this._ensureContext();
    this._resumeContext();
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 150;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(this._masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }
}
