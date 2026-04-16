import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type Bird = { id: string; topPct: number; duration: number; delay: number; flip: boolean };

/** 晴：偶发掠过的小鸟剪影（屏幕层，不参与点击） */
export function SunnyBirdsOverlay({ active }: { active: boolean }) {
  const [birds, setBirds] = useState<Bird[]>([]);
  const seq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const spawn = useCallback(() => {
    const id = `b-${++seq.current}`;
    const b: Bird = {
      id,
      topPct: 12 + Math.random() * 48,
      duration: 11 + Math.random() * 14,
      delay: 0,
      flip: Math.random() > 0.5,
    };
    setBirds((prev) => [...prev.slice(-4), b]);
  }, []);

  useEffect(() => {
    if (!active) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setBirds([]);
      return;
    }
    const loop = () => {
      spawn();
      const next = 3800 + Math.random() * 9000;
      const t = window.setTimeout(loop, next);
      timers.current.push(t);
    };
    const first = window.setTimeout(loop, 800 + Math.random() * 2000);
    timers.current.push(first);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [active, spawn]);

  const onDone = (id: string) => {
    setBirds((prev) => prev.filter((x) => x.id !== id));
  };

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[8] overflow-hidden">
      <AnimatePresence>
        {birds.map((b) => (
          <motion.div
            key={b.id}
            className={`absolute -translate-y-1/2 ${b.flip ? "scale-x-[-1]" : ""}`}
            style={{ top: `${b.topPct}%` }}
            initial={{ left: "-8%", opacity: 0 }}
            animate={{ left: "108%", opacity: 0.85 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: b.duration,
              delay: b.delay,
              ease: "linear",
            }}
            onAnimationComplete={() => onDone(b.id)}
          >
            <svg
              width="28"
              height="14"
              viewBox="0 0 28 14"
              className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
              aria-hidden
            >
              <ellipse
                cx="9"
                cy="7"
                rx="8"
                ry="3.2"
                fill="rgba(15,20,28,0.42)"
              />
              <ellipse
                cx="19"
                cy="7"
                rx="8"
                ry="3.2"
                fill="rgba(15,20,28,0.42)"
              />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
