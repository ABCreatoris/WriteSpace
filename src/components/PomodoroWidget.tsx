import { Pause, Play, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

const PRESETS_MIN = [25, 30, 45, 60] as const;

const PRESET_LABELS: Record<(typeof PRESETS_MIN)[number], string> = {
  25: "25min",
  30: "30min",
  45: "45min",
  60: "60min",
};

function formatMmSs(totalSec: number) {
  const m = Math.floor(Math.max(0, totalSec) / 60);
  const s = Math.max(0, totalSec) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PomodoroWidget({
  disabled,
  className,
}: {
  disabled?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [totalSec, setTotalSec] = useState(25 * 60);
  const [leftSec, setLeftSec] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const prevLeftRef = useRef(leftSec);

  useEffect(() => {
    if (!presetOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPresetOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [presetOpen]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeftSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    const prev = prevLeftRef.current;
    prevLeftRef.current = leftSec;
    if (prev > 0 && leftSec === 0 && running) {
      setRunning(false);
      setJustDone(true);
      window.setTimeout(() => setJustDone(false), 2400);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([120, 80, 120]);
      }
    }
  }, [leftSec, running]);

  useEffect(() => {
    if (disabled) {
      setRunning(false);
      setPresetOpen(false);
    }
  }, [disabled]);

  const applyPreset = useCallback((min: (typeof PRESETS_MIN)[number]) => {
    const sec = min * 60;
    setTotalSec(sec);
    setLeftSec(sec);
    setRunning(false);
    setJustDone(false);
    setPresetOpen(false);
  }, []);

  const toggleRun = () => {
    if (disabled) return;
    if (leftSec <= 0) {
      setLeftSec(totalSec);
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    setLeftSec(totalSec);
    setJustDone(false);
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-auto relative flex items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-2 py-1.5 shadow-lg backdrop-blur-xl backdrop-saturate-150",
        justDone && "border-emerald-400/50 shadow-emerald-500/20",
        disabled && "pointer-events-none opacity-35",
        className,
      )}
    >
      <div className="relative flex flex-col items-stretch">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPresetOpen((o) => !o)}
          className={cn(
            "min-w-[3.25rem] cursor-pointer select-none rounded-md px-1 py-0.5 text-left font-mono text-sm tabular-nums tracking-tight text-white/85 transition-colors hover:bg-white/10 hover:text-white",
            leftSec <= 60 && leftSec > 0 && running && "text-amber-200/95",
            leftSec === 0 && "text-emerald-200/90",
            presetOpen && "bg-white/10 text-white",
          )}
          title="选择专注时长"
          aria-expanded={presetOpen}
          aria-haspopup="listbox"
        >
          {formatMmSs(leftSec)}
        </button>
        {presetOpen ? (
          <div
            className="absolute bottom-full left-1/2 z-[90] mb-1.5 flex min-w-[6.5rem] -translate-x-1/2 flex-col gap-0.5 rounded-xl border border-white/20 bg-black/40 p-1 shadow-[0_10px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150"
            role="listbox"
            aria-label="专注时长"
          >
            {PRESETS_MIN.map((m) => (
              <button
                key={m}
                type="button"
                role="option"
                aria-selected={totalSec === m * 60}
                className={cn(
                  "rounded-lg px-3 py-2 text-left font-kaiti text-xs text-white/75 transition-colors hover:bg-white/10 hover:text-white",
                  totalSec === m * 60 && "bg-white/10 text-white",
                )}
                onClick={() => applyPreset(m)}
              >
                {PRESET_LABELS[m]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />
      <button
        type="button"
        disabled={disabled}
        onClick={toggleRun}
        className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        title={running ? "暂停" : "开始"}
        aria-label={running ? "暂停番茄钟" : "开始番茄钟"}
      >
        {running ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={reset}
        className="rounded-md p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
        title="重置"
        aria-label="重置番茄钟"
      >
        <RotateCcw size={13} />
      </button>
      <AnimatePresence>
        {justDone && (
          <motion.span
            key="pomodone"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            className="pointer-events-none absolute bottom-full right-0 mb-1 whitespace-nowrap rounded-md border border-white/10 bg-black/50 px-2 py-0.5 font-kaiti text-[10px] text-emerald-100/90 backdrop-blur-md"
          >
            本轮结束
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
