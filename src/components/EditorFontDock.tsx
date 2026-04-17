import { AnimatePresence, motion } from "framer-motion";
import { Type, X } from "lucide-react";
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
  FontMenuPanel,
  type FontFamilyId,
  type FontSizeId,
} from "./FontBar";

export function EditorFontDock({
  anchorRef,
  disabled,
  currentFont,
  onFontChange,
  currentSize,
  onSizeChange,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
  currentFont: FontFamilyId;
  onFontChange: (f: FontFamilyId) => void;
  currentSize: FontSizeId;
  onSizeChange: (s: FontSizeId) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const portalPanelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [popPos, setPopPos] = useState<{ top: number } | null>(null);

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
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((o) => !o);
  };

  return (
    <div ref={rootRef} className="relative flex shrink-0 flex-col items-end">
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        title={open ? "关闭" : "字体与字号"}
        aria-expanded={open}
        aria-label={open ? "关闭字体与字号" : "打开字体与字号"}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-black/35 p-0 shadow-[0_6px_18px_rgba(0,0,0,0.22)] backdrop-blur-xl backdrop-saturate-150 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/25",
          open
            ? "text-white shadow-lg"
            : "text-white/45 hover:bg-white/10 hover:text-white",
          disabled && "pointer-events-none opacity-35",
        )}
      >
        {open ? <X size={14} strokeWidth={2} /> : <Type size={14} strokeWidth={2} />}
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
                key="font-dock-pop"
                ref={portalPanelRef}
                role="presentation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ top: popPos.top }}
                className={cn(
                  "pointer-events-auto fixed left-1/2 z-[100] w-max max-w-[min(100vw-1rem,42rem)] -translate-x-1/2",
                )}
              >
                <div role="dialog" aria-label="字体与字号">
                  <FontMenuPanel
                    layout="horizontal"
                    currentFont={currentFont}
                    onFontChange={onFontChange}
                    currentSize={currentSize}
                    onSizeChange={onSizeChange}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
