import { AnimatePresence, motion } from "framer-motion";
import {
  CloudFog,
  CloudLightning,
  CloudRain,
  RefreshCw,
  SlidersHorizontal,
  Snowflake,
  Sun,
  Volume2,
  Wind,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { cn } from "../lib/cn";
import {
  SCENE_MODE_CYCLE,
  sceneRainFamily,
  sceneShortName,
  type SceneMode,
} from "../lib/sceneMode";

const SCENE_CYCLE_ICON: Record<
  SceneMode,
  typeof Sun
> = {
  sunny: Sun,
  rain: CloudRain,
  fog: CloudFog,
  snow: Snowflake,
  wind: Wind,
  thunder: CloudLightning,
};

function nextSceneInCycle(mode: SceneMode): SceneMode {
  const i = SCENE_MODE_CYCLE.indexOf(mode);
  const idx = i === -1 ? 0 : i;
  return SCENE_MODE_CYCLE[(idx + 1) % SCENE_MODE_CYCLE.length];
}

export function EditorSceneDock({
  anchorRef,
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
  onModeChange,
  onSceneCycleTopMenuHover,
}: {
  /** 整个 EditorPanel 外层 fixed 容器；弹出层水平居中对齐其底边下方 */
  anchorRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
  mode: SceneMode;
  onModeChange: (m: SceneMode) => void;
  /** 场景循环钮悬停：联动顶部场景条 */
  onSceneCycleTopMenuHover?: (active: boolean) => void;
  rainIntensity: number;
  setRainIntensity: (v: number) => void;
  snowIntensity: number;
  setSnowIntensity: (v: number) => void;
  sunnyLight: number;
  setSunnyLight: (v: number) => void;
  environmentVolume: number;
  setEnvironmentVolume: (v: number) => void;
  onToggleAudio?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const portalPanelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [popPos, setPopPos] = useState<{ top: number } | null>(null);
  const [sceneCycleHover, setSceneCycleHover] = useState(false);
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

  const updatePopPosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPopPos({ top: r.bottom + 12 });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePopPosition();
    const el = anchorRef.current;
    const ro =
      el && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updatePopPosition())
        : null;
    if (el && ro) ro.observe(el);
    const onResize = () => updatePopPosition();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [open, anchorRef, updatePopPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (portalPanelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSceneCycleHover(false);
      onSceneCycleTopMenuHover?.(false);
    }
  }, [open, onSceneCycleTopMenuHover]);

  const IntensityIcon =
    mode === "wind"
      ? Wind
      : mode === "thunder"
        ? CloudLightning
        : sceneRainFamily(mode)
          ? CloudRain
          : Snowflake;

  const nextSceneMode = nextSceneInCycle(mode);
  const SceneCycleIcon = SCENE_CYCLE_ICON[mode];

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
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-black/35 p-0 shadow-[0_6px_18px_rgba(0,0,0,0.22)] backdrop-blur-xl backdrop-saturate-150 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/25",
          open
            ? "text-white shadow-lg"
            : "text-white/45 hover:bg-white/10 hover:text-white",
          disabled && "pointer-events-none opacity-35",
        )}
      >
        {open ? <X size={14} strokeWidth={2} /> : <SlidersHorizontal size={14} strokeWidth={2} />}
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence
            onExitComplete={() => {
              setPopPos(null);
            }}
          >
            {open && popPos ? (
              <motion.div
                key="scene-dock-pop"
                ref={portalPanelRef}
                role="presentation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ top: popPos.top }}
                className={cn(
                  "pointer-events-auto fixed left-1/2 z-[100] w-max max-w-[min(100vw-1.5rem,24rem)] -translate-x-1/2",
                )}
              >
                <div
                  role="dialog"
                  aria-label="场景与音量"
                  className={cn(
                    "flex min-w-[min(100vw-2rem,22rem)] max-w-[min(100vw-1.5rem,26rem)] flex-row items-stretch overflow-hidden rounded-2xl border border-white/20 bg-black/35 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12),0_10px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150",
                  )}
                >
                  <div className="flex w-10 shrink-0 flex-col self-stretch border-r border-white/10 bg-white/[0.03]">
                    <button
                      type="button"
                      disabled={disabled}
                      title="随机切换"
                      aria-label={`当前${sceneShortName(mode)}，点击切换为${sceneShortName(nextSceneMode)}`}
                      onClick={() => onModeChange(nextSceneMode)}
                      onMouseEnter={() => {
                        setSceneCycleHover(true);
                        onSceneCycleTopMenuHover?.(true);
                      }}
                      onMouseLeave={() => {
                        setSceneCycleHover(false);
                        onSceneCycleTopMenuHover?.(false);
                      }}
                      className={cn(
                        "flex min-h-0 flex-1 w-full items-center justify-center border-0 bg-transparent text-white/85 outline-none transition-colors hover:bg-white/[0.1] hover:text-white",
                        disabled && "pointer-events-none opacity-35",
                      )}
                    >
                      {sceneCycleHover ? (
                        <RefreshCw
                          size={17}
                          strokeWidth={2}
                          className="shrink-0"
                          aria-hidden
                        />
                      ) : (
                        <SceneCycleIcon size={18} strokeWidth={2} className="shrink-0" />
                      )}
                    </button>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-2.5">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[120px]">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/45">
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
              <div className="hidden h-6 w-px shrink-0 self-center bg-white/10 sm:block" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[120px]">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/45">
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
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
