/**
 * Indian Simulator: Village Mud Wars
 * Web Audio API Procedural Sound Synthesizer & Festive Indian Music Engine
 * Zero external audio files required — 100% reliable offline synthesis!
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.isMuted = false;
    this.isMusicPlaying = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.bpm = 108;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master volume
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      // SFX volume
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music volume
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;

      // Start festival background music
      this.startMusic();
    } catch (e) {
      console.warn('[SoundEngine] Web Audio not available yet:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * Procedural Cow Moo!
   * Formant filtered dual oscillator with natural pitch bend and vibrato
   */
  playMoo(pitch = 1.0) {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = 1.35;

    // Dual sound sources for rich animal vocal timbre
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    const baseFreq = 115 * pitch;

    // Natural cow pitch contour: slight rise, steady groan, downward slide
    osc1.frequency.setValueAtTime(baseFreq * 0.9, t);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, t + 0.25);
    osc1.frequency.setValueAtTime(baseFreq * 1.12, t + 0.7);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.75, t + dur);

    osc2.frequency.setValueAtTime(baseFreq * 0.92, t);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.18, t + 0.25);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.78, t + dur);

    // Vibrato LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(5.2, t);
    lfoGain.gain.setValueAtTime(4.5, t);
    lfo.connect(osc1.frequency);
    lfo.connect(osc2.frequency);

    // Formant 1: Mouth cavity (~420Hz)
    const formant1 = this.ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(420, t);
    formant1.Q.setValueAtTime(3.5, t);

    // Formant 2: Throat resonance (~880Hz)
    const formant2 = this.ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(880, t);
    formant2.Q.setValueAtTime(4.0, t);

    // Volume Envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.65, t + 0.2);
    gain.gain.setValueAtTime(0.65, t + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc1.connect(formant1);
    osc2.connect(formant2);
    formant1.connect(gain);
    formant2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    lfo.start(t);

    osc1.stop(t + dur);
    osc2.stop(t + dur);
    lfo.stop(t + dur);
  }

  /**
   * Wet Mud Ball Splat / Impact sound
   */
  playSplat(intensity = 1.0, isMega = false) {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = isMega ? 0.45 : 0.3;

    // 1. Noise burst for wet squelch
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Low pass filter with rapid decay for muddy thud
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isMega ? 1400 : 1800, t);
    filter.frequency.exponentialRampToValueAtTime(140, t + dur);
    filter.Q.setValueAtTime(5.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8 * intensity, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    // 2. Sub bass punch (mud patty weight)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isMega ? 150 : 190, t);
    subOsc.frequency.exponentialRampToValueAtTime(35, t + dur);

    subGain.gain.setValueAtTime(0.7 * intensity, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    whiteNoise.start(t);
    subOsc.start(t);
    whiteNoise.stop(t + dur);
    subOsc.stop(t + dur);
  }

  /**
   * Mud Whoosh on Throw
   */
  playThrowWhoosh(speed = 1.0) {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = 0.22;

    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300 * speed, t);
    filter.frequency.exponentialRampToValueAtTime(1200 * speed, t + dur * 0.5);
    filter.frequency.exponentialRampToValueAtTime(250, t + dur);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.5, t + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + dur);
  }

  /**
   * Traditional Indian Temple Brass Bell
   * FM synthesis with lingering metallic shimmer
   */
  playBell() {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = 2.8;

    // Carrier
    const carrier = this.ctx.createOscillator();
    const carrierGain = this.ctx.createGain();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(987.77, t); // B5 note (bright Indian brass bell)

    // Modulator for metallic inharmonics
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(987.77 * 2.76, t);
    modGain.gain.setValueAtTime(750, t);
    modGain.gain.exponentialRampToValueAtTime(1, t + dur);

    mod.connect(carrier.frequency);

    // Second chime harmonic (high twinkle)
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(987.77 * 4.2, t);
    chimeGain.gain.setValueAtTime(0.35, t);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    // Bell main amplitude decay
    carrierGain.gain.setValueAtTime(0.7, t);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    carrier.connect(carrierGain);
    carrierGain.connect(this.sfxGain);
    chime.connect(chimeGain);
    chimeGain.connect(this.sfxGain);

    carrier.start(t);
    mod.start(t);
    chime.start(t);
    carrier.stop(t + dur);
    mod.stop(t + dur);
    chime.stop(t + 1.2);
  }

  /**
   * Earthen Clay Pot (Matka) Shatter
   */
  playPotSmash() {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = 0.35;

    // Ceramic crack snap
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.1);

    oscGain.gain.setValueAtTime(0.6, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    // Crumbled debris noise
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.start(t);
    noise.start(t);
    osc.stop(t + 0.15);
    noise.stop(t + dur);
  }

  /**
   * Mud Ammo Scoop / Suction Sound
   */
  playScoopMud() {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(480, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.22);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.24);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.24);
  }

  /**
   * Screen Mud Wipe / Squeegee Clean
   */
  playWipeSound() {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = 0.28;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.linearRampToValueAtTime(260, t + dur);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(2.5, t);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + dur);
  }

  /**
   * Villager celebratory shout / reaction
   */
  playVillagerReaction(isCheer = true) {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = isCheer ? 0.4 : 0.3;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';

    if (isCheer) {
      // Cheerful whistle / shout: rising pitch
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(1100, t + dur * 0.6);
      osc.frequency.exponentialRampToValueAtTime(850, t + dur);
    } else {
      // Hit reaction "Arre!"
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(260, t + dur);
    }

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + dur);
  }

  /**
   * Footstep sound (dirt thump or mud puddle squelch)
   */
  playFootstep(inMud = false) {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = 0.09;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = inMud ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(inMud ? 240 : 110, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + dur);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + dur);
  }

  /**
   * Live Procedural Indian Folk Rhythm Engine
   * Dholak Beats (Low Bass 'Dha' + High Rim 'Ta') + Tanpura Drone
   */
  startMusic() {
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.musicStep = 0;

    // Start Tanpura / Sitar ambient drone
    this._startDrone();

    const stepInterval = (60 / this.bpm) / 4 * 1000; // 16th note steps

    this.musicTimer = setInterval(() => {
      if (!this.initialized || this.isMuted || !this.isMusicPlaying) return;
      this._playMusicStep(this.musicStep);
      this.musicStep = (this.musicStep + 1) % 16;
    }, stepInterval);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.droneNodes) {
      this.droneNodes.forEach(n => {
        try { n.stop(); } catch(e){}
      });
      this.droneNodes = null;
    }
  }

  _startDrone() {
    if (!this.ctx || this.droneNodes) return;
    const t = this.ctx.currentTime;

    // Root (Sa) = C3 (130.81Hz), Fifth (Pa) = G3 (196.00Hz), Octave = C4 (261.63Hz)
    const freqs = [130.81, 196.00, 261.63];
    this.droneNodes = [];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 0.8, t); // gentle chorus detune

      // Warm low pass for Indian tanpura resonance
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + idx * 80, t);

      gain.gain.setValueAtTime(0.045, t);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      this.droneNodes.push(osc);
    });
  }

  _playMusicStep(step) {
    const t = this.ctx.currentTime;

    // Dholak beat pattern (16-step classic Indian Keharwa rhythm groove)
    // Step 0: Bass (Dha)
    // Step 2: Rim (Ta)
    // Step 4: Bass + Rim (Tin)
    // Step 6: Rim (Ta)
    // Step 8: Bass (Dha)
    // Step 10: Rim (Ta)
    // Step 12: Accent Bass
    // Step 14: Double Rim

    const isBass = (step === 0 || step === 4 || step === 8 || step === 12);
    const isRim = (step === 2 || step === 6 || step === 10 || step === 14 || step === 15);

    if (isBass) {
      // Dholak Bass (Dagga)
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = 'sine';
      const startFreq = step === 0 ? 125 : 105;
      bOsc.frequency.setValueAtTime(startFreq, t);
      bOsc.frequency.exponentialRampToValueAtTime(52, t + 0.18);

      bGain.gain.setValueAtTime(step === 0 ? 0.32 : 0.24, t);
      bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      bOsc.connect(bGain);
      bGain.connect(this.musicGain);
      bOsc.start(t);
      bOsc.stop(t + 0.18);
    }

    if (isRim) {
      // Dholak Treble Rim (Taati)
      const rOsc = this.ctx.createOscillator();
      const rGain = this.ctx.createGain();
      rOsc.type = 'triangle';
      rOsc.frequency.setValueAtTime(580 + (step % 2) * 60, t);
      rOsc.frequency.exponentialRampToValueAtTime(260, t + 0.07);

      rGain.gain.setValueAtTime(0.18, t);
      rGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      rOsc.connect(rGain);
      rGain.connect(this.musicGain);
      rOsc.start(t);
      rOsc.stop(t + 0.07);
    }

    // Ghungroo / Ankle Bell Chime every 4th step
    if (step % 4 === 0) {
      const gOsc = this.ctx.createOscillator();
      const gGain = this.ctx.createGain();
      gOsc.type = 'sine';
      gOsc.frequency.setValueAtTime(2400 + Math.random() * 200, t);

      gGain.gain.setValueAtTime(0.06, t);
      gGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      gOsc.connect(gGain);
      gGain.connect(this.musicGain);
      gOsc.start(t);
      gOsc.stop(t + 0.08);
    }
  }
}

// Global singleton instance
window.soundEngine = new SoundEngine();
