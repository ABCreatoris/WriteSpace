import { Pause, Play, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

const PRESETS_MIN = [15, 20, 30, 45, 60] as const;

const PRESET_LABELS: Record<(typeof PRESETS_MIN)[number], string> = {
  15: "15min",
  20: "20min",
  30: "30min",
  45: "45min",
  60: "60min",
};

const MAX_STOPWATCH_SEC = 100 * 60 * 60; // 100h cap avoids runaway

function formatMmSs(totalSec: number) {
  const m = Math.floor(Math.max(0, totalSec) / 60);
  const s = Math.max(0, totalSec) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** 累计：≤60:00 为 MM:SS；超过 60 分钟后为 HH:MM:SS */
function formatStopwatchElapsed(totalSec: number) {
  const t = Math.max(0, Math.floor(totalSec));
  if (t <= 3600) {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type TimerDirection = "countdown" | "stopwatch";

export function PomodoroWidget({
  disabled,
  className,
}: {
  disabled?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [direction, setDirection] = useState<TimerDirection>("countdown");
  const [totalSec, setTotalSec] = useState(30 * 60);
  const [leftSec, setLeftSec] = useState(30 * 60);
  const [elapsedSec, setElapsedSec] = useState(0);
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
      if (direction === "countdown") {
        setLeftSec((s) => (s <= 1 ? 0 : s - 1));
      } else {
        setElapsedSec((s) =>
          s >= MAX_STOPWATCH_SEC ? MAX_STOPWATCH_SEC : s + 1,
        );
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, direction]);

  useEffect(() => {
    const prev = prevLeftRef.current;
    prevLeftRef.current = leftSec;
    if (direction !== "countdown") return;
    if (prev > 0 && leftSec === 0 && running) {
      setRunning(false);
      setJustDone(true);
      window.setTimeout(() => setJustDone(false), 2400);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([120, 80, 120]);
      }
    }
  }, [leftSec, running, direction]);

  useEffect(() => {
    if (disabled) {
      setRunning(false);
      setPresetOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (direction === "stopwatch") setPresetOpen(false);
  }, [direction]);

  const applyPreset = useCallback((min: (typeof PRESETS_MIN)[number]) => {
    const sec = min * 60;
    setTotalSec(sec);
    setLeftSec(sec);
    setRunning(false);
    setJustDone(false);
    setPresetOpen(false);
  }, []);

  const toggleDirection = () => {
    if (disabled) return;
    setPresetOpen(false);
    setRunning(false);
    setJustDone(false);
    if (direction === "countdown") {
      setElapsedSec(0);
      setDirection("stopwatch");
    } else {
      setLeftSec(totalSec);
      setDirection("countdown");
    }
  };

  const displaySec =
    direction === "countdown" ? leftSec : elapsedSec;

  const toggleRun = () => {
    if (disabled) return;
    if (direction === "countdown" && leftSec <= 0) {
      setLeftSec(totalSec);
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    setJustDone(false);
    if (direction === "countdown") {
      setLeftSec(totalSec);
    } else {
      setElapsedSec(0);
    }
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
          onClick={() => {
            if (direction !== "countdown") return;
            setPresetOpen((o) => !o);
          }}
          className={cn(
            "min-w-[3.25rem] select-none rounded-md px-1 py-0.5 text-left font-mono text-sm tabular-nums tracking-tight text-white/85 transition-colors",
            direction === "countdown" &&
              "cursor-pointer hover:bg-white/10 hover:text-white",
            direction === "stopwatch" && "cursor-default",
            direction === "countdown" &&
              leftSec <= 60 &&
              leftSec > 0 &&
              running &&
              "text-amber-200/95",
            direction === "countdown" && leftSec === 0 && "text-emerald-200/90",
            presetOpen && direction === "countdown" && "bg-white/10 text-white",
          )}
          title={
            direction === "countdown"
              ? "选择专注时长"
              : "累计计时（切为「倒」可选时长）"
          }
          aria-expanded={direction === "countdown" && presetOpen}
          aria-haspopup={direction === "countdown" ? "listbox" : undefined}
        >
          {direction === "stopwatch"
            ? formatStopwatchElapsed(displaySec)
            : formatMmSs(displaySec)}
        </button>
        {presetOpen && direction === "countdown" ? (
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
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDirection}
        className="min-w-[1.35rem] select-none rounded-md px-0.5 py-0.5 font-kaiti text-xs leading-none text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
        title={direction === "countdown" ? "切换为累计计时" : "切换为倒数计时"}
        aria-label={
          direction === "countdown"
            ? "当前为倒数，点击切换为累计"
            : "当前为累计，点击切换为倒数"
        }
      >
        {direction === "countdown" ? "倒" : "累"}
      </button>
      <div className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />
      <button
        type="button"
        disabled={disabled}
        onClick={toggleRun}
        className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        title={running ? "暂停" : "开始"}
        aria-label={
          running
            ? "暂停计时"
            : direction === "stopwatch"
              ? "开始累计计时"
              : "开始番茄钟"
        }
      >
        {running ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={reset}
        className="rounded-md p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
        title={direction === "stopwatch" ? "清零累计" : "重置倒计时"}
        aria-label={
          direction === "stopwatch" ? "清零累计用时" : "重置番茄钟"
        }
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
