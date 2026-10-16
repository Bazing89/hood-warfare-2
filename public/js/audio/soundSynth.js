/**
 * Hood Warfare - Procedural Web Audio API Synthesizer
 * Generates zero-latency gunshots, hitmarkers, reloads, and footsteps purely in code.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SoundSynth = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  let ctx = null;

  function getAudioContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  // Pre-generate a 1-second white noise buffer for efficient sound generation
  let noiseBuffer = null;
  function getNoiseBuffer(context) {
    if (!noiseBuffer || noiseBuffer.sampleRate !== context.sampleRate) {
      const bufferSize = context.sampleRate * 1.5;
      noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
    return noiseBuffer;
  }

  /**
   * Procedural Gunshot Synthesizer
   * @param {string} weaponId - 'ar', 'smg', 'shotgun', 'pistol'
   * @param {number} distance - Distance in meters from local listener
   */
  function playGunshot(weaponId = 'ar', distance = 0) {
    const context = getAudioContext();
    if (!context) return;

    const now = context.currentTime;
    const distanceGain = 1.0 / (1.0 + distance * 0.06);
    if (distanceGain <= 0.01) return; // Inaudible

    // 1. Transient Noise Crack
    const noise = context.createBufferSource();
    noise.buffer = getNoiseBuffer(context);

    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();

    // 2. Low-Frequency Sub Punch Oscillator
    const osc = context.createOscillator();
    const oscGain = context.createGain();

    if (weaponId === 'smg') {
      // Crisp 80ms snap
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.Q.setValueAtTime(2.2, now);

      noiseGain.gain.setValueAtTime(0.55 * distanceGain, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.07);

      oscGain.gain.setValueAtTime(0.6 * distanceGain, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      noise.start(now);
      noise.stop(now + 0.08);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (weaponId === 'shotgun') {
      // Heavy 180ms boom
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(1.5, now);

      noiseGain.gain.setValueAtTime(0.9 * distanceGain, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.16);

      oscGain.gain.setValueAtTime(0.95 * distanceGain, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      noise.start(now);
      noise.stop(now + 0.18);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (weaponId === 'pistol') {
      // Crisp 9mm crack
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1900, now);
      filter.Q.setValueAtTime(2.0, now);

      noiseGain.gain.setValueAtTime(0.6 * distanceGain, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

      oscGain.gain.setValueAtTime(0.65 * distanceGain, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.start(now);
      noise.stop(now + 0.09);
      osc.start(now);
      osc.stop(now + 0.08);
    } else {
      // Default: AR (140Hz -> 35Hz drop over 90ms)
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(2.5, now);

      noiseGain.gain.setValueAtTime(0.75 * distanceGain, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.09);

      oscGain.gain.setValueAtTime(0.8 * distanceGain, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      noise.start(now);
      noise.stop(now + 0.11);
      osc.start(now);
      osc.stop(now + 0.09);
    }

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(context.destination);

    osc.connect(oscGain);
    oscGain.connect(context.destination);
  }

  /**
   * Hitmarker Audio Cue
   * Body hit: 2200Hz dual tick for 25ms
   * Headshot: metallic 3100Hz + 1550Hz chime
   */
  function playHitmarker(isHeadshot = false) {
    const context = getAudioContext();
    if (!context) return;

    const now = context.currentTime;

    if (isHeadshot) {
      // Metallic Chime (3100Hz + 1550Hz)
      const osc1 = context.createOscillator();
      const osc2 = context.createOscillator();
      const gain = context.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(3100, now);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1550, now);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(context.destination);

      osc1.start(now);
      osc1.stop(now + 0.075);
      osc2.start(now);
      osc2.stop(now + 0.075);
    } else {
      // Crisp 2200Hz tick
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200, now);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(context.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    }
  }

  /**
   * Two-stage mechanical reload sound (t + 0.15s and t + 0.85s)
   */
  function playReload() {
    const context = getAudioContext();
    if (!context) return;

    const now = context.currentTime;

    function playClick(tOffset, freq, duration) {
      const clickTime = now + tOffset;
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, clickTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, clickTime + duration);

      gain.gain.setValueAtTime(0.25, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + duration);

      osc.connect(gain);
      gain.connect(context.destination);

      osc.start(clickTime);
      osc.stop(clickTime + duration);
    }

    // Stage 1: Magazine release / eject
    playClick(0.15, 850, 0.045);
    // Stage 2: Magazine slap / bolt rack
    playClick(0.85, 1250, 0.055);
  }

  /**
   * Footstep sound: low-pass filtered noise thump at 110Hz
   */
  function playFootstep() {
    const context = getAudioContext();
    if (!context) return;

    const now = context.currentTime;
    const noise = context.createBufferSource();
    noise.buffer = getNoiseBuffer(context);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(110, now);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    noise.start(now);
    noise.stop(now + 0.045);
  }

  /**
   * Tactical Slide swoosh sound
   */
  function playSlide() {
    const context = getAudioContext();
    if (!context) return;

    const now = context.currentTime;
    const noise = context.createBufferSource();
    noise.buffer = getNoiseBuffer(context);

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.Q.setValueAtTime(1.5, now);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    noise.start(now);
    noise.stop(now + 0.45);
  }

  return {
    init: getAudioContext,
    playGunshot,
    playHitmarker,
    playReload,
    playFootstep,
    playSlide
  };
}));
