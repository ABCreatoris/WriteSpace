import { ASSETS } from "../config/assets";

/** 雨 · 雾 · 雪 · 风 · 雷 · 晴（林间/蓝天底图，蝉鸣鸟鸣微风） */
export type SceneMode =
  | "rain"
  | "fog"
  | "snow"
  | "wind"
  | "thunder"
  | "sunny";

export function sceneRainFamily(mode: SceneMode): boolean {
  return mode === "rain" || mode === "fog" || mode === "thunder";
}

export function sceneLabel(mode: SceneMode): string {
  const names: Record<SceneMode, string> = {
    rain: "雨",
    fog: "雾",
    snow: "雪",
    wind: "风",
    thunder: "雷",
    sunny: "晴",
  };
  return `${names[mode]} · WriteSpace`;
}

export function sceneAudioUrl(mode: SceneMode): string {
  switch (mode) {
    case "rain":
      return ASSETS.rainAudio;
    case "fog":
      return ASSETS.fogAudio;
    case "snow":
      return ASSETS.snowAudio;
    case "wind":
      return ASSETS.windAudio;
    case "thunder":
      return ASSETS.thunderAudio;
    case "sunny":
      /** 晴用 Web Audio 合成环境音，主轨不播 mp3 */
      return ASSETS.rainAudio;
  }
}
