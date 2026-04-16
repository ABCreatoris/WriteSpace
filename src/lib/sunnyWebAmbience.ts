import { ASSETS } from "../config/assets";

const CICADAS_REMOTE_OGG =
  "https://upload.wikimedia.org/wikipedia/commons/f/f4/Cicadas_in_Greece.ogg";
const BIRDS_REMOTE_OGGS = [
  "https://upload.wikimedia.org/wikipedia/commons/4/42/Bird_singing.ogg",
  "https://upload.wikimedia.org/wikipedia/commons/2/29/Common_Blackbird_%28Turdus_merula%29_%28W1CDR0001425_BD22%29.ogg",
  "https://upload.wikimedia.org/wikipedia/commons/1/17/Mistle_Thrush_%28Turdus_viscivorus%29_%28W1CDR0000636_BD11%29.ogg",
] as const;

/**
 * 晴日环境音：
 * - Wind：稳定微风底床（不随右侧滑块剧烈变化）
 * - Bio：蝉鸣与鸟鸣（由右侧滑块增强）
 */
export class SunnyWebAmbience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private windBus: GainNode | null = null;
  private cicadaBus: GainNode | null = null;
  private birdBus: GainNode | null = null;
  private cicadaPulseTimer: ReturnType<typeof setTimeout> | null = null;
  private birdTimer: ReturnType<typeof setTimeout> | null = null;
  private cicadaOn = true;
  private running = false;
  private birdBuffers: AudioBuffer[] = [];

  private fillWindNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
    const n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    let low = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      low = low * 0.965 + w * 0.035;
      ch[i] = low * 0.85;
    }
    return buf;
  }

  async start(bioLevel: number) {
    if (this.running && this.ctx?.state === "running") {
      this.setBioLevel(bioLevel);
      return;
    }
    this.stop();
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.92;
    this.master.connect(ctx.destination);

    this.windBus = ctx.createGain();
    this.windBus.gain.value = 0.36;
    this.windBus.connect(this.master);

    this.cicadaBus = ctx.createGain();
    this.cicadaBus.gain.value = 0;
    this.cicadaBus.connect(this.master);
    this.birdBus = ctx.createGain();
    this.birdBus.gain.value = 0;
    this.birdBus.connect(this.master);
    this.setBioLevel(bioLevel);

    this.running = true;
    this.addWindBed(ctx, this.windBus);
    await this.addCicadas(ctx, this.cicadaBus);
    this.birdBuffers = await this.tryDecodeBirdLoops(ctx);
    await ctx.resume();
    this.cicadaOn = true;
    this.playBirdVariant();
    this.scheduleBird();
  }

  private addWindBed(ctx: AudioContext, dest: AudioNode) {
    const noiseBuf = this.fillWindNoiseBuffer(ctx, 3);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.4;
    lp.frequency.value = 520;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    src.connect(lp);
    lp.connect(dest);
    src.start();
    lfo.start();
  }

  private async addCicadas(ctx: AudioContext, dest: AudioNode) {
    const cicBuf = await this.tryDecodeCicadaLoop(ctx);
    if (!cicBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = cicBuf;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const shelf = ctx.createBiquadFilter();
    shelf.type = "highshelf";
    shelf.frequency.value = 2800;
    shelf.gain.value = -1.4;
    const gain = ctx.createGain();
    gain.gain.value = 0.02;

    src.connect(hp);
    hp.connect(shelf);
    shelf.connect(gain);
    gain.connect(dest);
    src.start();
    this.startCicadaPulse(gain);
  }

  /** 蝉鸣占空比约 1/2：开 5~6s，关 5~6s */
  private startCicadaPulse(g: GainNode) {
    const ctx = this.ctx;
    if (!ctx) return;
    const schedule = (on: boolean) => {
      if (!this.ctx) return;
      this.cicadaOn = on;
      const now = this.ctx.currentTime;
      const target = on ? 0.74 : 0.02;
      g.gain.cancelScheduledValues(now);
      g.gain.setTargetAtTime(target, now, on ? 0.25 : 0.22);
      const nextMs = on
        ? 5200 + Math.random() * 1200
        : 5000 + Math.random() * 1400;
      this.cicadaPulseTimer = window.setTimeout(() => schedule(!on), nextMs);
    };
    schedule(true);
  }

  private async tryDecodeCicadaLoop(
    ctx: AudioContext,
  ): Promise<AudioBuffer | null> {
    const urls = [ASSETS.sunnyCicadas, CICADAS_REMOTE_OGG];
    for (const url of urls) {
      try {
        const res = await fetch(url, { mode: "cors", cache: "force-cache" });
        if (!res.ok) continue;
        const ab = await res.arrayBuffer();
        if (ab.byteLength < 256) continue;
        return await ctx.decodeAudioData(ab);
      } catch {
        /* try next */
      }
    }
    return null;
  }

  private scheduleBird = () => {
    if (!this.running || !this.ctx) return;
    const delay = this.cicadaOn
      ? 900 + Math.random() * 1200
      : 420 + Math.random() * 900;
    this.birdTimer = window.setTimeout(() => {
      this.playBirdVariant();
      if (Math.random() < (!this.cicadaOn ? 0.78 : 0.36)) {
        window.setTimeout(() => this.playBirdVariant(), 90 + Math.random() * 220);
      }
      this.scheduleBird();
    }, delay);
  };

  private playBirdVariant() {
    const ctx = this.ctx;
    const out = this.birdBus;
    if (!ctx || !out || !this.running) return;
    if (this.birdBuffers.length > 0) {
      this.playBirdFromSamples(ctx, out);
      return;
    }
    const t0 = ctx.currentTime;
    const variant = Math.floor(Math.random() * 3);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600;
    bp.Q.value = 1.1;
    if (variant === 0) {
      o.type = "sine";
      o.frequency.setValueAtTime(1600, t0);
      o.frequency.exponentialRampToValueAtTime(3600, t0 + 0.07);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.3, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
      o.stop(t0 + 0.18);
    } else if (variant === 1) {
      o.type = "triangle";
      o.frequency.setValueAtTime(2200, t0);
      o.frequency.exponentialRampToValueAtTime(1300, t0 + 0.08);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.26, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.13);
      o.stop(t0 + 0.14);
    } else {
      o.type = "sine";
      o.frequency.setValueAtTime(1800, t0);
      o.frequency.exponentialRampToValueAtTime(2600, t0 + 0.045);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.24, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
      o.stop(t0 + 0.1);
    }
    o.connect(bp);
    bp.connect(g);
    g.connect(out);
    o.start(t0);
  }

  private playBirdFromSamples(ctx: AudioContext, out: AudioNode) {
    const idx = Math.floor(Math.random() * this.birdBuffers.length);
    const bird = this.birdBuffers[idx]!;
    const src = ctx.createBufferSource();
    src.buffer = bird;
    src.playbackRate.value = 0.93 + Math.random() * 0.22;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2500;
    bp.Q.value = 1.0;
    const g = ctx.createGain();
    g.gain.value = 0.22 + Math.random() * 0.14;
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    const maxStart = Math.max(0, bird.duration - 0.32);
    const offset = Math.random() * maxStart;
    const dur = 0.16 + Math.random() * 0.24;
    src.start(ctx.currentTime, offset, dur);
  }

  private async tryDecodeBirdLoops(
    ctx: AudioContext,
  ): Promise<AudioBuffer[]> {
    const all: AudioBuffer[] = [];
    const urls = [ASSETS.sunnyBirds, ...BIRDS_REMOTE_OGGS];
    for (const url of urls) {
      try {
        const res = await fetch(url, { mode: "cors", cache: "force-cache" });
        if (!res.ok) continue;
        const ab = await res.arrayBuffer();
        if (ab.byteLength < 256) continue;
        all.push(await ctx.decodeAudioData(ab));
      } catch {
        /* skip this source */
      }
    }
    return all;
  }

  setBioLevel(v: number) {
    const cg = this.cicadaBus?.gain;
    const bg = this.birdBus?.gain;
    if ((!cg && !bg) || !this.ctx) return;
    // 正常位（0.5）附近温和，放大后增强更明显
    const x = Math.max(0, Math.min(1, v));
    const cicadaScaled = 0.08 + x * 0.72;
    const birdScaled = 0.22 + x * 1.05;
    if (cg) cg.setTargetAtTime(cicadaScaled, this.ctx.currentTime, 0.06);
    if (bg) bg.setTargetAtTime(birdScaled, this.ctx.currentTime, 0.06);
  }

  stop() {
    this.running = false;
    this.cicadaOn = true;
    if (this.cicadaPulseTimer !== null) {
      window.clearTimeout(this.cicadaPulseTimer);
      this.cicadaPulseTimer = null;
    }
    if (this.birdTimer !== null) {
      window.clearTimeout(this.birdTimer);
      this.birdTimer = null;
    }
    if (this.ctx) {
      void this.ctx.close();
    }
    this.ctx = null;
    this.master = null;
    this.windBus = null;
    this.cicadaBus = null;
    this.birdBus = null;
    this.birdBuffers = [];
  }
}
