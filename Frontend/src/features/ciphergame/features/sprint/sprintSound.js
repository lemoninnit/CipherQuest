// Frontend/src/features/ciphergame/features/sprint/sprintSound.js

const RAW_SPRINT_SOUND_PATHS = {
  bgm: '/assets/sprint/Sound/Music/6 • Sovereign Of Syrup (Ghost The 7 Kingdoms OST).mp3',
  collect: '/assets/sprint/Sound/Sound Effect/collect.mp3',
  collision: '/assets/sprint/Sound/Sound Effect/enemy collision.mp3',
  goUp: '/assets/sprint/Sound/Sound Effect/go up.mp3',
  goDown: '/assets/sprint/Sound/Sound Effect/go down.mp3',
  lose: '/assets/sprint/Sound/Sound Effect/lose.mp3',
  win: '/assets/sprint/Sound/Sound Effect/win.mp3',
};

/**
 * Aliases let gameplay code call playSfx() with intent words ('correct',
 * 'wrong', 'lane-up', ...) instead of asset file names.
 */
const SFX_ALIASES = {
  correct: 'collect',
  coin: 'collect',
  gate: 'collect',
  pickup: 'collect',
  hit: 'collision',
  enemy: 'collision',
  wrong: 'collision',
  crash: 'collision',
  up: 'goUp',
  'lane-up': 'goUp',
  down: 'goDown',
  'lane-down': 'goDown',
  gameover: 'lose',
  finished: 'win',
  victory: 'win',
  winning: 'win',
};

class SprintSoundManager {
  constructor() {
    this.audioCtx = null;
    this.bgmAudio = null;
    this.isMuted = false;
    this.bgmVolume = 0.35;
    this.sfxVolume = 0.6;
    this.isUnlocked = false;
    this.sfxCache = {};
    this.runLoopInterval = null;
    this.isBgmPlaying = false;

    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  initAudio() {
    try {
      // Initialize BGM Audio
      const bgmPath = encodeURI(RAW_SPRINT_SOUND_PATHS.bgm);
      this.bgmAudio = new Audio(bgmPath);
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = this.bgmVolume;
      this.bgmAudio.preload = 'auto';

      // Preload SFX
      Object.keys(RAW_SPRINT_SOUND_PATHS).forEach((key) => {
        if (key !== 'bgm') {
          const sfxPath = encodeURI(RAW_SPRINT_SOUND_PATHS[key]);
          const audio = new Audio(sfxPath);
          audio.volume = this.sfxVolume;
          audio.preload = 'auto';
          this.sfxCache[key] = audio;
        }
      });
    } catch (e) {
      console.warn('SprintSound init warning:', e);
    }
  }

  // Must be called on user interaction (clicks, key presses, button clicks)
  unlockAudio() {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    this.isUnlocked = true;

    if (this.bgmAudio && !this.isMuted && this.isBgmPlaying) {
      this.bgmAudio.play().catch(() => {});
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) {
      if (this.bgmAudio) this.bgmAudio.pause();
      this.stopRunLoopSynth();
    } else {
      if (this.isBgmPlaying) {
        this.playBgm();
      }
    }
    return this.isMuted;
  }

  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  playBgm() {
    this.isBgmPlaying = true;
    if (this.isMuted) return;

    this.unlockAudio();

    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
      const playPromise = this.bgmAudio.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch((err) => {
          console.warn('Sprint BGM file play issue, starting run-loop synth fallback:', err);
          this.startRunLoopSynth();
        });
      }
    } else {
      this.startRunLoopSynth();
    }
  }

  pauseBgm() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
    this.stopRunLoopSynth();
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
    this.stopRunLoopSynth();
  }

  // Footstep run-loop synth fallback, used only when the BGM file cannot play
  startRunLoopSynth() {
    if (this.runLoopInterval || this.isMuted) return;
    let step = 0;
    this.runLoopInterval = setInterval(() => {
      if (this.isMuted || !this.isBgmPlaying) {
        this.stopRunLoopSynth();
        return;
      }
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const isKick = step % 4 === 0;
      const freqs = [110, 146.83, 130.81, 164.81];
      const freq = isKick ? 73.42 : freqs[step % freqs.length];
      step++;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isKick ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime((isKick ? 0.09 : 0.05) * this.bgmVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    }, 260);
  }

  stopRunLoopSynth() {
    if (this.runLoopInterval) {
      clearInterval(this.runLoopInterval);
      this.runLoopInterval = null;
    }
  }

  // Play Sound Effects (audio asset first, Web Audio synth only as a fallback)
  playSfx(type) {
    if (this.isMuted) return;
    this.unlockAudio();

    const key = SFX_ALIASES[type] || type;

    // 1. Try file playback
    try {
      const cached = this.sfxCache[key];
      if (cached) {
        const sfx = cached.cloneNode();
        sfx.volume = this.sfxVolume;
        const p = sfx.play();
        if (p && p.catch) p.catch(() => this.synthSfx(type));
        return;
      }
      if (RAW_SPRINT_SOUND_PATHS[key]) {
        const sfxPath = encodeURI(RAW_SPRINT_SOUND_PATHS[key]);
        const sfx = new Audio(sfxPath);
        sfx.volume = this.sfxVolume;
        const p = sfx.play();
        if (p && p.catch) p.catch(() => this.synthSfx(type));
        return;
      }
    } catch {
      // Ignore file play errors, synth below will handle it
    }

    // 2. No asset for this cue -> synthesize retro 8-bit feedback
    this.synthSfx(type);
  }

  synthSfx(type) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const key = SFX_ALIASES[type] || type;

    if (key === 'collect') {
      // Bright two-note pickup ping (E5 -> B5)
      [659.25, 987.77].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.22 * this.sfxVolume, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.16);
      });
    } else if (key === 'collision') {
      // Noisy impact buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);
      gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (key === 'goUp' || key === 'goDown') {
      // Quick lane-change blip (rises for up, falls for down)
      const startFreq = key === 'goUp' ? 392 : 784;
      const endFreq = key === 'goUp' ? 784 : 392;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.09);
      gain.gain.setValueAtTime(0.14 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (key === 'lose') {
      // Descending defeat sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.7);
      gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (key === 'win') {
      // Victory fanfare (C5, E5, G5, C6)
      let timeOffset = 0;
      [
        { f: 523.25, d: 0.1 },
        { f: 659.25, d: 0.1 },
        { f: 783.99, d: 0.1 },
        { f: 1046.50, d: 0.3 },
      ].forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, now + timeOffset);
        gain.gain.setValueAtTime(0.25 * this.sfxVolume, now + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + timeOffset + note.d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + note.d);
        timeOffset += note.d;
      });
    }
  }
}

export const sprintSound = new SprintSoundManager();
