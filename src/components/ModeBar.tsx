import { AnimatePresence, motion } from "framer-motion";
import {
  CloudFog,
  CloudLightning,
  CloudRain,
  Snowflake,
  Sun,
  Wind,
} from "lucide-react";
import { Fragment, useState } from "react";
import type { SceneMode } from "../lib/sceneMode";

const modes: {
  id: SceneMode;
  label: string;
  icon: typeof CloudRain;
}[] = [
  { id: "sunny", label: "晴", icon: Sun },
  { id: "rain", label: "雨", icon: CloudRain },
  { id: "fog", label: "雾", icon: CloudFog },
  { id: "snow", label: "雪", icon: Snowflake },
  { id: "wind", label: "风", icon: Wind },
  { id: "thunder", label: "雷", icon: CloudLightning },
];

export function ModeBar({
  currentMode,
  onModeChange,
  /** 由编辑卡片场景按钮悬停等触发，与顶栏 hover 共同决定菜单是否显示 */
  menuOpenExtra = false,
  /** 指针进入顶栏区域（含场景条）：用于与底部悬停衔接、取消关闭计时 */
  onTopChromePointerEnter,
  /** 指针离开整个顶栏区域 */
  onTopChromePointerLeave,
}: {
  currentMode: SceneMode;
  onModeChange: (m: SceneMode) => void;
  menuOpenExtra?: boolean;
  onTopChromePointerEnter?: () => void;
  onTopChromePointerLeave?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const open = hover || menuOpenExtra;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[105] flex h-24 justify-center items-start pt-6"
      onMouseEnter={() => {
        setHover(true);
        onTopChromePointerEnter?.();
      }}
      onMouseLeave={() => {
        setHover(false);
        onTopChromePointerLeave?.();
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex max-w-[min(100vw-2rem,40rem)] flex-wrap items-center justify-center gap-2 rounded-full border border-white/20 bg-black/35 px-4 py-3 shadow-[0_10px_32px_rgba(0,0,0,0.3)] backdrop-blur-2xl backdrop-saturate-150 sm:gap-1 sm:px-6"
          >
            {modes.map((m, i) => {
              const Icon = m.icon;
              return (
                <Fragment key={m.id}>
                  {i > 0 ? (
                    <div
                      className="hidden h-4 w-px shrink-0 bg-white/10 sm:block"
                      aria-hidden
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onModeChange(m.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium transition-colors sm:px-3 ${
                      currentMode === m.id
                        ? "text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <Icon size={16} />
                    {m.label}
                  </button>
                </Fragment>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
