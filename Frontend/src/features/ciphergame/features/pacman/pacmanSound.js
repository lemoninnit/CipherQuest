// Frontend/src/features/ciphergame/features/pacman/pacmanSound.js

const RAW_SOUND_PATHS = {
  bgm: '/assets/pacman/Sound/Music/The Paleflame Crown.wav',
  gold: '/assets/pacman/Sound/Sound Effect/gold.mp3',
  hit1: '/assets/pacman/Sound/Sound Effect/hit 1.mp3',
  hit2: '/assets/pacman/Sound/Sound Effect/hit 2.mp3',
  hit3: '/assets/pacman/Sound/Sound Effect/hit 3.mp3',
  lose: '/assets/pacman/Sound/Sound Effect/lose.mp3',
  powerup: '/assets/pacman/Sound/Sound Effect/powerup.mp3',
  win: '/assets/pacman/Sound/Sound Effect/win.mp3',
};

class PacmanSoundManager {
  constructor() {
    this.audioCtx = null;
    this.bgmAudio = null;
    this.isMuted = false;
    this.bgmVolume = 0.35;
    this.sfxVolume = 0.6;
    this.isUnlocked = false;
    this.sfxCache = {};
    this.wakaState = false;
    this.sirenInterval = null;
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
      const bgmPath = encodeURI(RAW_SOUND_PATHS.bgm);
      this.bgmAudio = new Audio(bgmPath);
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = this.bgmVolume;
      this.bgmAudio.preload = 'auto';

      // Preload SFX
      Object.keys(RAW_SOUND_PATHS).forEach((key) => {
        if (key !== 'bgm') {
          const sfxPath = encodeURI(RAW_SOUND_PATHS[key]);
          const audio = new Audio(sfxPath);
          audio.volume = this.sfxVolume;
          audio.preload = 'auto';
          this.sfxCache[key] = audio;
        }
      });
    } catch (e) {
      console.warn('PacmanSound init warning:', e);
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
      this.stopSirenSynth();
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
          console.warn('BGM file play issue, starting synth siren fallback:', err);
          this.startSirenSynth();
        });
      }
    } else {
      this.startSirenSynth();
    }
  }

  pauseBgm() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
    this.stopSirenSynth();
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
    this.stopSirenSynth();
  }

  // Synth Siren Background Loop Fallback
  startSirenSynth() {
    if (this.sirenInterval || this.isMuted) return;
    let step = 0;
    this.sirenInterval = setInterval(() => {
      if (this.isMuted || !this.isBgmPlaying) {
        this.stopSirenSynth();
        return;
      }
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = step % 2 === 0 ? 160 : 220;
      step++;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08 * this.bgmVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }, 220);
  }

  stopSirenSynth() {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
  }

  // Play Sound Effects (Audio File + Web Audio Synth for instant 100% guarantee)
  playSfx(type) {
    if (this.isMuted) return;
    this.unlockAudio();

    // 1. Try file playback
    try {
      let key = type;
      if (type === 'hit') {
        const hits = ['hit1', 'hit2', 'hit3'];
        key = hits[Math.floor(Math.random() * hits.length)];
      }

      const cached = this.sfxCache[key];
      if (cached) {
        const sfx = cached.cloneNode();
        sfx.volume = this.sfxVolume;
        const p = sfx.play();
        if (p && p.catch) p.catch(() => {});
      } else if (RAW_SOUND_PATHS[key]) {
        const sfxPath = encodeURI(RAW_SOUND_PATHS[key]);
        const sfx = new Audio(sfxPath);
        sfx.volume = this.sfxVolume;
        const p = sfx.play();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {
      // Ignore file play errors, synth below will handle it
    }

    // 2. Synthesize retro 8-bit sound effects for instant tactile audio feedback
    this.synthSfx(type);
  }

  synthSfx(type) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'waka') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      this.wakaState = !this.wakaState;
      const startFreq = this.wakaState ? 440 : 300;
      const endFreq = this.wakaState ? 300 : 580;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

      gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'powerup') {
      // Ascending Arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.2 * this.sfxVolume, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + (idx + 1) * 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + (idx + 1) * 0.05);
      });
    } else if (type === 'gold' || type === 'ghost') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.06); // A5

      gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'hit') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);

      gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'lose') {
      // Descending pitch sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.6);

      gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'win') {
      // Fanfare Melody
      const melody = [
        { f: 523.25, d: 0.1 },
        { f: 659.25, d: 0.1 },
        { f: 783.99, d: 0.1 },
        { f: 1046.50, d: 0.3 }
      ];
      let timeOffset = 0;
      melody.forEach((note) => {
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

export const pacmanSound = new PacmanSoundManager();
