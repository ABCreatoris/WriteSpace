/** Files must live under `public/` so Vite serves them at absolute paths from site root. */
function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (base === "/") return normalized;
  return `${base.replace(/\/$/, "")}${normalized}`;
}

/** 雨、雪为原始素材；雾/风/雷/风雪底图为程序调色生成，可自行替换同名文件。 */
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
  /** 近雷击（随机其一）：Mixkit 多条 thunder + 低通/短混响（Mixkit License）。 */
  lightningStrikes: [
    publicUrl("assets/audio/lightning1.mp3"),
    publicUrl("assets/audio/lightning2.mp3"),
    publicUrl("assets/audio/lightning3.mp3"),
  ] as const,
} as const;
