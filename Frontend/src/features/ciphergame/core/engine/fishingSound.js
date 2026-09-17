// Frontend/src/features/ciphergame/core/engine/fishingSound.js

const RAW_FISHING_SOUND_PATHS = {
  bgm: '/assets/fish/Sound/Music/Whispers Beneath The Caps.wav',
  rod: '/assets/fish/Sound/Sound Effect/fishing rod.mp3',
  fished: '/assets/fish/Sound/Sound Effect/fished.mp3',
  losing: '/assets/fish/Sound/Sound Effect/losing.mp3',
  winning: '/assets/fish/Sound/Sound Effect/winning.mp3',
};

class FishingSoundManager {
  constructor() {
    this.audioCtx = null;
    this.bgmAudio = null;
    this.isMuted = false;
    this.bgmVolume = 0.35;
    this.sfxVolume = 0.6;
    this.isUnlocked = false;
    this.sfxCache = {};
    this.ambientInterval = null;
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
      const bgmPath = encodeURI(RAW_FISHING_SOUND_PATHS.bgm);
      this.bgmAudio = new Audio(bgmPath);
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = this.bgmVolume;
      this.bgmAudio.preload = 'auto';

      // Preload SFX
      Object.keys(RAW_FISHING_SOUND_PATHS).forEach((key) => {
        if (key !== 'bgm') {
          const sfxPath = encodeURI(RAW_FISHING_SOUND_PATHS[key]);
          const audio = new Audio(sfxPath);
          audio.volume = this.sfxVolume;
          audio.preload = 'auto';
          this.sfxCache[key] = audio;
        }
      });
    } catch (e) {
      console.warn('FishingSound init warning:', e);
    }
  }

  // Must be called on user interaction (clicks, touches, casts)
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
      this.stopAmbientSynth();
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
          console.warn('Fishing BGM file play issue, starting ambient synth fallback:', err);
          this.startAmbientSynth();
        });
      }
    } else {
      this.startAmbientSynth();
    }
  }

  pauseBgm() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
    this.stopAmbientSynth();
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
    this.stopAmbientSynth();
  }

  // Underwater Ambient Synth Loop Fallback
  startAmbientSynth() {
    if (this.ambientInterval || this.isMuted) return;
    let step = 0;
    this.ambientInterval = setInterval(() => {
      if (this.isMuted || !this.isBgmPlaying) {
        this.stopAmbientSynth();
        return;
      }
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freqs = [110, 130, 146.8, 164.81];
      const freq = freqs[step % freqs.length];
      step++;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06 * this.bgmVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    }, 900);
  }

  stopAmbientSynth() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }

  // Play SFX (Audio File + Web Audio Synth)
  playSfx(type) {
    if (this.isMuted) return;
    this.unlockAudio();

    // Map common aliases
    let key = type;
    if (type === 'cast') key = 'rod';
    if (type === 'catch') key = 'fished';
    if (type === 'lose') key = 'losing';
    if (type === 'win') key = 'winning';

    // 1. Try file playback
    try {
      const cached = this.sfxCache[key];
      if (cached) {
        const sfx = cached.cloneNode();
        sfx.volume = this.sfxVolume;
        const p = sfx.play();
        if (p && p.catch) p.catch(() => {});
      } else if (RAW_FISHING_SOUND_PATHS[key]) {
        const sfxPath = encodeURI(RAW_FISHING_SOUND_PATHS[key]);
        const sfx = new Audio(sfxPath);
        sfx.volume = this.sfxVolume;
        const p = sfx.play();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {
      // Ignore file error, synth below handles it
    }

    // 2. Web Audio API synthesized sound generator
    this.synthSfx(type);
  }

  synthSfx(type) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'cast' || type === 'rod') {
      // Whiz / Reel cast sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(250, now + 0.2);

      gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'catch' || type === 'fished') {
      // Splash + Positive catch chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc2.frequency.setValueAtTime(783.99, now + 0.08); // G5

      gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } else if (type === 'chum' || type === 'splash') {
      // Bubble / Splash pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);

      gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'lose' || type === 'losing') {
      // Descending sad wobble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.45);

      gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'win' || type === 'winning') {
      // Aquatic victory fanfare (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);

        gain.gain.setValueAtTime(0.25 * this.sfxVolume, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + (i + 1) * 0.1 + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.1);
        osc.stop(now + (i + 1) * 0.1 + 0.1);
      });
    }
  }
}

export const fishingSound = new FishingSoundManager();
