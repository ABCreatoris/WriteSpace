import { Canvas } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense, useEffect, useRef, useState } from "react";
import { AudioDock } from "./components/AudioDock";
import { BackgroundScene } from "./components/BackgroundScene";
import {
  sceneAudioUrl,
  sceneLabel,
  sceneRainFamily,
  type SceneMode,
} from "./lib/sceneMode";
import { EditorPanel } from "./components/EditorPanel";
import { FontBar, type FontFamilyId, type FontSizeId } from "./components/FontBar";
import { ModeBar } from "./components/ModeBar";
import { ASSETS } from "./config/assets";

export default function App() {
  const [mode, setMode] = useState<SceneMode>("rain");
  const [font, setFont] = useState<FontFamilyId>("handwriting");
  const [size, setSize] = useState<FontSizeId>("small");
  const [rainIntensity, setRainIntensity] = useState(0.8);
  const [snowIntensity, setSnowIntensity] = useState(0.7);
  const [rainVol, setRainVol] = useState(0.4);
  const [snowVol, setSnowVol] = useState(0.7);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [lightningBurst, setLightningBurst] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lightningRef = useRef<HTMLAudioElement | null>(null);
  const lightningTimersRef = useRef<number[]>([]);

  const effectiveVol = sceneRainFamily(mode) ? rainVol : snowVol;

  useEffect(() => {
    if (audioRef.current) return;
    const a = new Audio(ASSETS.rainAudio);
    a.loop = true;
    a.volume = 0.4;
    audioRef.current = a;
    const l = new Audio(ASSETS.lightningStrikes[0]);
    l.preload = "auto";
    lightningRef.current = l;
    return () => {
      a.pause();
      a.removeAttribute("src");
      a.load();
      audioRef.current = null;
      l.pause();
      l.removeAttribute("src");
      l.load();
      lightningRef.current = null;
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.src = sceneAudioUrl(mode);
    if (audioEnabled) {
      void a.play().catch(() => {
        console.info("Autoplay prevented or failed");
      });
    }
  }, [mode, audioEnabled]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const base = effectiveVol;
    if (mode === "thunder") {
      const storm = Math.max(0.08, Math.min(1, rainIntensity));
      a.volume = Math.min(1, base * (1.02 + storm * 0.28));
    } else {
      a.volume = base;
    }
  }, [effectiveVol, mode, rainIntensity]);

  /** 风模式：强度略改变播放速度，更「刮」 */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (mode === "wind") {
      const s = Math.max(0.06, Math.min(1, snowIntensity));
      a.playbackRate = 0.76 + s * 0.44;
    } else {
      a.playbackRate = 1;
    }
  }, [mode, snowIntensity]);

  /** 雷模式：先闪屏 → 延迟后近雷（光速快于声速）；雷暴滑块控音量与闪-声间距；多条采样随机，高雷暴偶发连击。 */
  useEffect(() => {
    if (mode !== "thunder" || !audioEnabled) return;
    const hit = lightningRef.current;
    if (!hit) return;
    let cancelled = false;
    const timers = lightningTimersRef.current;
    const arm = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timers.push(id);
      return id;
    };
    const clearArmed = () => {
      while (timers.length) {
        const id = timers.pop();
        if (id !== undefined) window.clearTimeout(id);
      }
    };

    const strikes = ASSETS.lightningStrikes;
    const pickStrikeUrl = () =>
      strikes[Math.floor(Math.random() * strikes.length)]!;

    const storm = Math.max(0.05, Math.min(1, rainIntensity));
    /** 雷暴越高 = 越近 = 闪后到声越短（ms） */
    const flashToSoundMs = () =>
      Math.round(120 + (1 - storm) * 1050);
    const strikeVolume = (mul = 1) =>
      Math.min(1, effectiveVol * (0.38 + storm * 1.15) * mul);

    const nextGapMs = () => {
      const lo = 9500 - storm * 7200;
      const hi = 17500 - storm * 10500;
      return lo + Math.random() * Math.max(800, hi - lo);
    };

    const scheduleGap = () => {
      arm(runLightningEvent, nextGapMs());
    };

    const queueStrike = (
      url: string,
      vol: number,
      onDone: () => void,
    ) => {
      hit.src = url;
      hit.currentTime = 0;
      hit.volume = vol;
      const onEnded = () => {
        hit.removeEventListener("ended", onEnded);
        onDone();
      };
      hit.addEventListener("ended", onEnded);
      void hit.play().catch(() => {
        hit.removeEventListener("ended", onEnded);
        onDone();
      });
    };

    const runLightningEvent = () => {
      if (cancelled) return;
      setLightningBurst((n) => n + 1);
      const delay = flashToSoundMs();
      arm(() => {
        if (cancelled) return;
        const url1 = pickStrikeUrl();
        const v1 = strikeVolume(1);
        const wantsDouble =
          storm > 0.42 && Math.random() < storm * 0.52;
        queueStrike(url1, v1, () => {
          if (cancelled) return;
          if (wantsDouble) {
            arm(() => {
              if (cancelled) return;
              queueStrike(
                pickStrikeUrl(),
                strikeVolume(0.72),
                () => {
                  if (!cancelled) scheduleGap();
                },
              );
            }, 260 + Math.random() * 380);
          } else {
            scheduleGap();
          }
        });
      }, delay);
    };

    arm(
      runLightningEvent,
      700 + Math.random() * (4200 - storm * 2800),
    );

    return () => {
      cancelled = true;
      clearArmed();
      hit.pause();
      hit.removeAttribute("src");
      hit.load();
    };
  }, [mode, audioEnabled, effectiveVol, rainIntensity]);

  const tryEnableAudio = () => {
    setAudioEnabled(true);
    const a = audioRef.current;
    if (a) void a.play().catch(console.error);
  };

  return (
    <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 1] }}
          dpr={[1, 2]}
          gl={{ antialias: false, powerPreference: "high-performance" }}
        >
          <Suspense fallback={null}>
            <BackgroundScene
              mode={mode}
              rainIntensity={rainIntensity}
              snowIntensity={snowIntensity}
            />
          </Suspense>
        </Canvas>
      </div>

      <AnimatePresence mode="popLayout">
        {lightningBurst > 0 && (
          <motion.div
            key={lightningBurst}
            initial={{ opacity: 0.24 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="pointer-events-none fixed inset-0 z-[12] bg-[#d8e6ff]"
            style={{ mixBlendMode: "screen" }}
          />
        )}
      </AnimatePresence>

      <ModeBar currentMode={mode} onModeChange={setMode} />
      <FontBar
        currentFont={font}
        onFontChange={setFont}
        currentSize={size}
        onSizeChange={setSize}
      />
      <EditorPanel fontFamily={font} fontSize={size} />

      <AudioDock
        mode={mode}
        rainIntensity={rainIntensity}
        setRainIntensity={setRainIntensity}
        snowIntensity={snowIntensity}
        setSnowIntensity={setSnowIntensity}
        volume={effectiveVol}
        setVolume={sceneRainFamily(mode) ? setRainVol : setSnowVol}
        onToggleAudio={tryEnableAudio}
      />

      <div className="pointer-events-none fixed bottom-8 right-8 z-30 select-none text-white/30">
        <div className="flex flex-col items-end gap-2 font-sans text-[10px] uppercase tracking-[0.3em]">
          <div>WriteSpace v1.0</div>
          <div>{sceneLabel(mode)}</div>
        </div>
      </div>
    </main>
  );
}
