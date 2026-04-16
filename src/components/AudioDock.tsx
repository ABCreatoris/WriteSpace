import { AnimatePresence, motion } from "framer-motion";
import {
  CloudLightning,
  CloudRain,
  SlidersHorizontal,
  Snowflake,
  Sun,
  Volume2,
  Wind,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { sceneRainFamily, type SceneMode } from "../lib/sceneMode";

const COUNTDOWN_START = 1500;

export function AudioDock({
  mode,
  rainIntensity,
  setRainIntensity,
  snowIntensity,
  setSnowIntensity,
  sunnyLight,
  setSunnyLight,
  volume,
  setVolume,
  onToggleAudio,
}: {
  mode: SceneMode;
  rainIntensity: number;
  setRainIntensity: (v: number) => void;
  snowIntensity: number;
  setSnowIntensity: (v: number) => void;
  sunnyLight: number;
  setSunnyLight: (v: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  onToggleAudio?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [panelIntensity, setPanelIntensity] = useState(
    mode === "sunny"
      ? sunnyLight
      : sceneRainFamily(mode)
        ? rainIntensity
        : snowIntensity,
  );
  const [tick, setTick] = useState(COUNTDOWN_START);
  const [ringDone, setRingDone] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipOpenToggle = useRef(false);

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
    const id = setInterval(() => {
      setTick((t) => {
        if (t <= 1) {
          clearInterval(id);
          setRingDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ringDone || pulseKey >= 3) return;
    const id = setTimeout(() => setPulseKey((p) => p + 1), 2000);
    return () => clearTimeout(id);
  }, [ringDone, pulseKey]);

  const circumference = 2 * Math.PI * 24;
  const progress = (COUNTDOWN_START - tick) / COUNTDOWN_START;
  const dashOffset = circumference - progress * circumference;

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
    if (skipOpenToggle.current) {
      skipOpenToggle.current = false;
      return;
    }
    setOpen((o) => {
      const next = !o;
      if (next) onToggleAudio?.();
      return next;
    });
  };

  const startLongPress = () => {
    longPressRef.current = setTimeout(() => {
      skipOpenToggle.current = true;
      setTick(COUNTDOWN_START);
      setRingDone(false);
      setPulseKey(0);
    }, 2000);
  };

  const endLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2">
      <div className="relative mb-4 flex justify-center">
        <div
          role="button"
          tabIndex={0}
          onMouseDown={startLongPress}
          onMouseUp={endLongPress}
          onMouseLeave={endLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={endLongPress}
          onClick={toggleOpen}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") toggleOpen();
          }}
          className={cn(
            "relative z-10 cursor-pointer rounded-full border border-white/10 bg-white/5 p-3 shadow-xl backdrop-blur-md transition-all",
            open
              ? "border-white/30 text-white"
              : "text-white/40 hover:text-white",
          )}
        >
          <SlidersHorizontal size={18} />
        </div>

        <svg
          className="pointer-events-none absolute top-1/2 left-1/2 h-[64px] w-[64px] -translate-x-1/2 -translate-y-1/2 -rotate-90"
          aria-hidden
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <circle
            cx="32"
            cy="32"
            r="24"
            fill="transparent"
            stroke="rgba(255, 255, 240, 0.05)"
            strokeWidth="1"
          />
          <motion.circle
            cx="32"
            cy="32"
            r="24"
            fill="transparent"
            stroke="rgba(255, 255, 240, 0.4)"
            strokeWidth="1.5"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1, ease: "linear" }}
            strokeLinecap="round"
            filter="url(#glow)"
          />
        </svg>

        <AnimatePresence>
          {ringDone && pulseKey < 3 && (
            <motion.div
              key={pulseKey}
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="pointer-events-none absolute top-1/2 left-1/2 h-[48px] w-[48px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(255,255,240,0.6)]"
              style={{ boxShadow: "0 0 20px rgba(255, 255, 240, 0.4)" }}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className={cn(
              "flex items-center gap-8 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.2),0_0_0_1px_rgba(0,0,0,0.1),0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all duration-500",
            )}
          >
            <div className="flex min-w-[140px] flex-col gap-3">
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
            <div className="h-8 w-px bg-white/10" />
            <div className="flex min-w-[140px] flex-col gap-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
                <div className="flex items-center gap-2">
                  <Volume2 size={12} />
                  <span>VOLUME</span>
                </div>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-white transition-all hover:accent-white/80"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
