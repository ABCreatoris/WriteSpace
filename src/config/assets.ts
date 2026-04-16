/** Files must live under `public/` so Vite serves them at absolute paths from site root. */
function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (base === "/") return normalized;
  return `${base.replace(/\/$/, "")}${normalized}`;
}

/** 雨、雪、晴为原始/摄影底图；雾/风/雷/风雪底图可程序生成，可自行替换同名文件。 */
export const ASSETS = {
  rainBackground: publicUrl("assets/rain-bg.jpg"),
  fogBackground: publicUrl("assets/fog-bg.jpg"),
  snowBackground: publicUrl("assets/snow-bg.jpg"),
  /** 风雪：由 snow 底图锐化，供「风」模式飘雪前景 */
  snowWindBackground: publicUrl("assets/snow-wind-bg.jpg"),
  /** 「风」模式底图（偏冷灰天空，与强度着色器一起用） */
  windBackground: publicUrl("assets/wind-bg.jpg"),
  thunderBackground: publicUrl("assets/thunder-bg.jpg"),
  rainAudio: publicUrl("assets/audio/rain.mp3"),
  fogAudio: publicUrl("assets/audio/fog.mp3"),
  snowAudio: publicUrl("assets/audio/snow.mp3"),
  windAudio: publicUrl("assets/audio/wind.mp3"),
  /** 环境滚雷：Mixkit「Thunder rumble during a storm」（Mixkit License）。 */
  thunderAudio: publicUrl("assets/audio/thunder.mp3"),
  sunnyBackground: publicUrl("assets/sunny-bg.jpg?v=20260416-2"),
  /** 晴：自然蝉林循环（ogg）；可放本地，否则运行时尝试从 Wikimedia 拉取同素材。 */
  sunnyCicadas: publicUrl("assets/audio/sunny-cicadas.ogg"),
  /** 晴：鸟鸣实录（ogg）；可放本地，否则运行时尝试从 Wikimedia 拉取。 */
  sunnyBirds: publicUrl("assets/audio/sunny-birds.ogg"),
  /**
   * 晴：林景鸟鸣环境床（循环 mp3）。与 https://note.huangxing.xyz/ 林模式同源素材
   * `niaoming.mp3`（huangxingxing22/my-web-assets）；缺省时见 sunnyWebAmbience 内远程回退 URL。
   */
  sunnyForestBirdsBed: publicUrl("assets/audio/sunny-forest-birds.mp3"),
  /** 近雷击（随机其一）：Mixkit 多条 thunder + 低通/短混响（Mixkit License）。 */
  lightningStrikes: [
    publicUrl("assets/audio/lightning1.mp3"),
    publicUrl("assets/audio/lightning2.mp3"),
    publicUrl("assets/audio/lightning3.mp3"),
  ] as const,
} as const;
