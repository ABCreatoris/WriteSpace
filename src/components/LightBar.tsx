import { AnimatePresence, motion } from "framer-motion";
import { Sun } from "lucide-react";
import { useState } from "react";

/** 晴模式：左侧调节画面光感（与底部环境音量独立） */
export function LightBar({
  visible,
  light,
  onLightChange,
}: {
  visible: boolean;
  light: number;
  onLightChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(false);
  if (!visible) return null;

  return (
    <div
      className="fixed top-[9.25rem] left-8 z-[48]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex flex-col items-start gap-2">
        <div
          className="cursor-pointer rounded-full border border-amber-200/20 bg-amber-100/10 p-3 text-amber-100/70 transition-colors hover:border-amber-200/35 hover:text-amber-50"
          title="光感"
        >
          <Sun size={18} strokeWidth={2} />
        </div>
        <AnimatePresence>
          {hover && (
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="flex min-w-[140px] flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/35">
                <span>光感</span>
                <span>{Math.round(light * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={light}
                onChange={(e) => onLightChange(parseFloat(e.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-200/90 transition-all hover:accent-amber-100"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
