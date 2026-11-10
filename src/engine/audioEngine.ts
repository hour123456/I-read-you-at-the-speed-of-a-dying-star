import { BGMId, SFXType } from '../types/vn';
import { BGM_LIST } from '../data/media';

const BGM_FILE_MAP: Record<BGMId, string> = Object.fromEntries(
  BGM_LIST.map((b) => [b.id, b.file])
) as Record<BGMId, string>;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private currentBgmId: BGMId | 'stop' = 'stop';
  private activeAudio: HTMLAudioElement | null = null;
  private fadingAudios: Set<HTMLAudioElement> = new Set();

  public bgmVolume = 0.65;
  public sfxVolume = 0.75;
  public textTickVolume = 0.28;
  public isMuted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
    if (this.activeAudio && this.activeAudio.paused && this.currentBgmId !== 'stop') {
      this.activeAudio.play().catch(() => {});
    }
  }

  public setVolumes(bgm: number, sfx: number, textTick: number, muted = false) {
    this.bgmVolume = bgm;
    this.sfxVolume = sfx;
    this.textTickVolume = textTick;
    this.isMuted = muted;
    if (this.activeAudio) {
      this.activeAudio.volume = muted ? 0 : this.bgmVolume;
    }
  }

  public getCurrentBgm(): BGMId | 'stop' {
    return this.currentBgmId;
  }

  public playBgm(id: BGMId | 'stop', forceRestart = false) {
    if (!forceRestart && id === this.currentBgmId) {
      if (this.activeAudio && this.activeAudio.paused && id !== 'stop') {
        this.activeAudio.play().catch(() => {});
      }
      return;
    }
    this.currentBgmId = id;

    // Fade out previous track smoothly
    if (this.activeAudio) {
      const old = this.activeAudio;
      this.activeAudio = null;
      this.fadingAudios.add(old);
      const startVol = old.volume;
      const steps = 18;
      let step = 0;
      const timer = window.setInterval(() => {
        step++;
        old.volume = Math.max(0, startVol * (1 - step / steps));
        if (step >= steps) {
          window.clearInterval(timer);
          old.pause();
          old.src = '';
          this.fadingAudios.delete(old);
        }
      }, 75);
    }

    if (id === 'stop') return;

    const src = BGM_FILE_MAP[id];
    if (!src) return;

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    this.activeAudio = audio;

    audio.play().then(() => {
      const target = this.isMuted ? 0 : this.bgmVolume;
      const steps = 18;
      let step = 0;
      const fadeTimer = window.setInterval(() => {
        if (this.activeAudio !== audio) {
          window.clearInterval(fadeTimer);
          return;
        }
        step++;
        audio.volume = Math.min(1, target * (step / steps));
        if (step >= steps) {
          window.clearInterval(fadeTimer);
        }
      }, 75);
    }).catch(() => {
      // Will auto-resume on first user interaction via unlock()
      audio.volume = this.isMuted ? 0 : this.bgmVolume;
    });
  }

  public playUiTick(kind: 'hover' | 'click' | 'confirm' | 'choice' = 'click') {
    if (this.isMuted || this.sfxVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (kind === 'hover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1320, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.045);
      gain.gain.setValueAtTime(0.04 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.055);
    } else if (kind === 'choice' || kind === 'confirm') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(990, now + 0.06);
      osc.frequency.setValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.14 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.07);
      gain.gain.setValueAtTime(0.08 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  }

  public playTextCadence(speaker?: string) {
    if (this.isMuted || this.textTickVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    let baseFreq = 540;
    if (speaker === '세라' || speaker === '???') baseFreq = 760;
    else if (speaker === '연하린') baseFreq = 660;
    else if (speaker === '노엘') baseFreq = 820;
    else if (speaker === '유리우스') baseFreq = 460;
    else if (speaker === '백시현') baseFreq = 510;

    osc.frequency.setValueAtTime(baseFreq + (Math.random() - 0.5) * 35, now);
    gain.gain.setValueAtTime(0.032 * this.textTickVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playSfx(sfx: SFXType) {
    if (this.isMuted || this.sfxVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = this.sfxVolume;

    const makeNoiseBuffer = (dur: number) => {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    };

    switch (sfx) {
      case 'pen-scratch':
      case 'page-turn': {
        const src = ctx.createBufferSource();
        src.buffer = makeNoiseBuffer(0.24);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(sfx === 'pen-scratch' ? 2800 : 1600, now);
        filter.Q.value = 2.4;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.14 * vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        src.connect(filter);
        filter.connect(g);
        g.connect(ctx.destination);
        src.start(now);
        break;
      }
      case 'clock-chime': {
        [523.25, 783.99, 1046.5, 1567.98].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          g.gain.setValueAtTime((0.16 / (idx + 1)) * vol, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.85);
        });
        break;
      }
      case 'heartbeat': {
        [0, 0.24].forEach((offset, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(i === 0 ? 78 : 64, now + offset);
          osc.frequency.exponentialRampToValueAtTime(32, now + offset + 0.18);
          g.gain.setValueAtTime((i === 0 ? 0.35 : 0.24) * vol, now + offset);
          g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.22);
        });
        break;
      }
      case 'blade-draw':
      case 'photon-slash':
      case 'blade-clash': {
        // Metallic high shimmer + impact noise
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(sfx === 'blade-draw' ? 920 : 1850, now);
        osc.frequency.exponentialRampToValueAtTime(sfx === 'blade-draw' ? 2600 : 340, now + 0.28);
        g.gain.setValueAtTime(0.22 * vol, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.34);

        const src = ctx.createBufferSource();
        src.buffer = makeNoiseBuffer(0.28);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2200;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.25 * vol, now);
        ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
        src.connect(hp);
        hp.connect(ng);
        ng.connect(ctx.destination);
        src.start(now);
        break;
      }
      case 'glass-crack':
      case 'glass-shatter': {
        const count = sfx === 'glass-shatter' ? 8 : 3;
        for (let i = 0; i < count; i++) {
          const t = now + i * 0.035;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1900 + Math.random() * 2400, t);
          g.gain.setValueAtTime(0.16 * vol, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.36);
        }
        const src = ctx.createBufferSource();
        src.buffer = makeNoiseBuffer(0.45);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.22 * vol, now);
        ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
        src.connect(ng);
        ng.connect(ctx.destination);
        src.start(now);
        break;
      }
      case 'star-fall':
      case 'resonance-pulse': {
        [440, 659.25, 880, 1318.5].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.04);
          osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.9);
          g.gain.setValueAtTime(0.11 * vol, now + idx * 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + 1.15);
        });
        break;
      }
      case 'door-knock': {
        [0, 0.19, 0.38].forEach((off) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, now + off);
          osc.frequency.exponentialRampToValueAtTime(55, now + off + 0.08);
          g.gain.setValueAtTime(0.28 * vol, now + off);
          g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.09);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now + off);
          osc.stop(now + off + 0.1);
        });
        break;
      }
      case 'incinerate':
      case 'coffee-pour':
      case 'train-rumble': {
        const src = ctx.createBufferSource();
        src.buffer = makeNoiseBuffer(0.65);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = sfx === 'train-rumble' ? 260 : 950;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.2 * vol, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
        src.connect(lp);
        lp.connect(ng);
        ng.connect(ctx.destination);
        src.start(now);
        break;
      }
      case 'terminal-beep':
      default: {
        [1046, 1318].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(f, now + idx * 0.08);
          g.gain.setValueAtTime(0.07 * vol, now + idx * 0.08);
          g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.07);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.075);
        });
        break;
      }
    }
  }
}

export const audioEngine = new AudioEngine();
