import { AnimatePresence, motion } from "framer-motion";
import {
  CloudLightning,
  CloudRain,
  SlidersHorizontal,
  Snowflake,
  Sun,
  Volume2,
  Wind,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { sceneRainFamily, type SceneMode } from "../lib/sceneMode";

export function EditorSceneDock({
  disabled,
  mode,
  rainIntensity,
  setRainIntensity,
  snowIntensity,
  setSnowIntensity,
  sunnyLight,
  setSunnyLight,
  environmentVolume,
  setEnvironmentVolume,
  onToggleAudio,
  exportingPdf,
  onExportTxt,
  onExportPdf,
  onExportWord,
  exportDisabled,
}: {
  disabled?: boolean;
  exportDisabled?: boolean;
  mode: SceneMode;
  rainIntensity: number;
  setRainIntensity: (v: number) => void;
  snowIntensity: number;
  setSnowIntensity: (v: number) => void;
  sunnyLight: number;
  setSunnyLight: (v: number) => void;
  environmentVolume: number;
  setEnvironmentVolume: (v: number) => void;
  onToggleAudio?: () => void;
  exportingPdf: boolean;
  onExportTxt: () => void;
  onExportPdf: () => void;
  onExportWord: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelIntensity, setPanelIntensity] = useState(
    mode === "sunny"
      ? sunnyLight
      : sceneRainFamily(mode)
        ? rainIntensity
        : snowIntensity,
  );

  useEffect(() => {
    setPanelIntensity(
      mode === "sunny"
        ? sunnyLight
        : sceneRainFamily(mode)
          ? rainIntensity
          : snowIntensity,
    );
  }, [mode, rainIntensity, snowIntensity, sunnyLight]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const IntensityIcon =
    mode === "wind"
      ? Wind
      : mode === "thunder"
        ? CloudLightning
        : sceneRainFamily(mode)
          ? CloudRain
          : Snowflake;

  const setSceneIntensity = sceneRainFamily(mode)
    ? setRainIntensity
    : setSnowIntensity;

  const onIntensityInput = (v: number) => {
    setPanelIntensity(v);
    setSceneIntensity(v);
  };

  const onSunnyLightInput = (v: number) => {
    setSunnyLight(v);
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((o) => {
      const next = !o;
      if (next) onToggleAudio?.();
      return next;
    });
  };

  return (
    <div ref={rootRef} className="relative flex shrink-0 flex-col items-end">
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        title={open ? "关闭" : "场景与音量"}
        aria-expanded={open}
        aria-label={open ? "关闭场景与音量" : "打开场景与音量"}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-black/35 p-0 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl backdrop-saturate-150 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/25",
          open
            ? "text-white shadow-lg"
            : "text-white/45 hover:bg-white/10 hover:text-white",
          disabled && "pointer-events-none opacity-35",
        )}
      >
        {open ? <X size={18} strokeWidth={2} /> : <SlidersHorizontal size={18} strokeWidth={2} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute top-full right-0 z-[95] mt-2 flex min-w-[min(100vw-2rem,22rem)] max-w-[min(100vw-1.5rem,24rem)] flex-col gap-4 rounded-2xl border border-white/20 bg-black/35 px-5 py-4 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12),0_10px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150",
            )}
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:min-w-[130px]">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
                  <div className="flex items-center gap-2">
                    {mode === "sunny" ? <Sun size={12} /> : <IntensityIcon size={12} />}
                    <span>
                      {mode === "sunny"
                        ? "晴"
                        : mode === "rain"
                          ? "雨"
                          : mode === "fog"
                            ? "雾"
                            : mode === "thunder"
                              ? "雷暴"
                              : mode === "snow"
                                ? "雪"
                                : "风势"}
                    </span>
                  </div>
                  <span>{Math.round(panelIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={panelIntensity}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (mode === "sunny") onSunnyLightInput(v);
                    else onIntensityInput(v);
                  }}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-white transition-all hover:accent-white/80"
                />
              </div>
              <div className="hidden h-8 w-px shrink-0 bg-white/10 sm:block" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:min-w-[130px]">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
                  <div className="flex items-center gap-2">
                    <Volume2 size={12} />
                    <span>VOLUME</span>
                  </div>
                  <span>{Math.round(environmentVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={environmentVolume}
                  onChange={(e) => setEnvironmentVolume(parseFloat(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-white transition-all hover:accent-white/80"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-3">
              <span className="font-sans text-[9px] uppercase tracking-widest text-white/30">
                导出
              </span>
              <button
                type="button"
                disabled={exportDisabled}
                className="font-kaiti text-[11px] tracking-widest text-white/45 transition-colors hover:text-white/90 disabled:pointer-events-none disabled:opacity-30"
                onClick={() => {
                  onExportTxt();
                  setOpen(false);
                }}
              >
                TXT
              </button>
              <span className="text-white/15" aria-hidden>
                |
              </span>
              <button
                type="button"
                disabled={exportingPdf || exportDisabled}
                className="font-kaiti text-[11px] tracking-widest text-white/45 transition-colors hover:text-white/90 disabled:pointer-events-none disabled:opacity-30"
                onClick={() => {
                  void onExportPdf();
                  setOpen(false);
                }}
              >
                {exportingPdf ? "PDF…" : "PDF"}
              </button>
              <span className="text-white/15" aria-hidden>
                |
              </span>
              <button
                type="button"
                disabled={exportDisabled}
                className="font-kaiti text-[11px] tracking-widest text-white/45 transition-colors hover:text-white/90 disabled:pointer-events-none disabled:opacity-30"
                onClick={() => {
                  void onExportWord();
                  setOpen(false);
                }}
              >
                WORD
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
