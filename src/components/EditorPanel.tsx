import {
  MDXEditor,
  codeBlockPlugin,
  codeMirrorPlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "../lib/cn";
import "../mdx-editor-writespace.css";
import type { FontFamilyId, FontSizeId } from "./FontBar";

const STORAGE_KEY = "writespace_content";
const PANEL_RECT_KEY = "writespace_panel_rect";
const PANEL_SIZE_KEY_LEGACY = "writespace_panel_wh";

const DEFAULT_W = 756;
const DEFAULT_H = 530;
const MIN_W = 300;
const MIN_H = 220;
const PAD_X = 48;
const PAD_Y = 96;
/** ModeBar h-24 (96px) + small gap — panel top must stay below this */
const TOP_NAV_SAFE = 104;
/** Bottom audio / thumb area */
const BOTTOM_SAFE = 120;

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/** Symmetric panel: center + size (viewport px) */
type PanelState = { cx: number; cy: number; w: number; h: number };

function clampPanel(p: PanelState): PanelState {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let { cx, cy, w, h } = p;
  const marginX = PAD_X / 2;
  const maxW = Math.max(MIN_W, vw - PAD_X);
  const maxHForCy = Math.max(
    MIN_H,
    Math.min(2 * (cy - TOP_NAV_SAFE), 2 * (vh - BOTTOM_SAFE - cy)),
  );
  w = Math.min(Math.max(MIN_W, w), maxW);
  h = Math.min(Math.max(MIN_H, h), maxHForCy);
  const halfW = w / 2;
  const halfH = h / 2;
  cx = Math.min(Math.max(marginX + halfW, cx), vw - marginX - halfW);
  cy = Math.min(
    Math.max(TOP_NAV_SAFE + halfH, cy),
    vh - BOTTOM_SAFE - halfH,
  );
  return { cx, cy, w, h };
}

function defaultPanel(): PanelState {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return clampPanel({
    cx: vw / 2,
    cy: vh / 2,
    w: DEFAULT_W,
    h: DEFAULT_H,
  });
}

function readPanel(): PanelState {
  try {
    const raw = localStorage.getItem(PANEL_RECT_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Record<string, number>;
      if (
        typeof p.cx === "number" &&
        typeof p.cy === "number" &&
        typeof p.w === "number" &&
        typeof p.h === "number"
      ) {
        return clampPanel({ cx: p.cx, cy: p.cy, w: p.w, h: p.h });
      }
      if (
        typeof p.x === "number" &&
        typeof p.y === "number" &&
        typeof p.w === "number" &&
        typeof p.h === "number"
      ) {
        const next = clampPanel({
          cx: p.x + p.w / 2,
          cy: p.y + p.h / 2,
          w: p.w,
          h: p.h,
        });
        localStorage.setItem(PANEL_RECT_KEY, JSON.stringify(next));
        return next;
      }
    }
    const rawOld = localStorage.getItem(PANEL_SIZE_KEY_LEGACY);
    if (rawOld) {
      const p = JSON.parse(rawOld) as { w?: number; h?: number };
      if (typeof p.w === "number" && typeof p.h === "number") {
        const w = Math.max(MIN_W, p.w);
        const h = Math.max(MIN_H, p.h);
        const next = defaultPanel();
        const merged = clampPanel({ ...next, w, h });
        localStorage.setItem(PANEL_RECT_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch {
    /* ignore */
  }
  return defaultPanel();
}

const fontClass: Record<FontFamilyId, string> = {
  serif: "font-serif",
  sans: "font-sans",
  mono: "font-mono",
  handwriting: "font-handwriting",
};

const sizeClass: Record<FontSizeId, string> = {
  small: "text-lg md:text-xl",
  medium: "text-xl md:text-2xl",
  large: "text-2xl md:text-3xl",
};

export function EditorPanel({
  fontFamily,
  fontSize,
}: {
  fontFamily: FontFamilyId;
  fontSize: FontSizeId;
}) {
  const [panel, setPanel] = useState<PanelState>(readPanel);
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<{
    dir: ResizeDir;
    start: PanelState;
  } | null>(null);

  const [text, setText] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? "",
  );
  const [, setFocused] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseVisual, setReleaseVisual] = useState("");
  const [holdRelease, setHoldRelease] = useState(false);
  const mdxEditorRef = useRef<MDXEditorMethods>(null);

  const mdxPlugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      markdownShortcutPlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
      codeMirrorPlugin({
        codeBlockLanguages: {
          text: "Plain",
          js: "JavaScript",
          ts: "TypeScript",
        },
        autoLoadLanguageSupport: false,
      }),
    ],
    [],
  );
  const undoRef = useRef("");
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const left = panel.cx - panel.w / 2;
  const top = panel.cy - panel.h / 2;

  useEffect(() => {
    if (!releasing) localStorage.setItem(STORAGE_KEY, text);
  }, [text, releasing]);

  useEffect(() => {
    if (!releasing) {
      queueMicrotask(() => {
        mdxEditorRef.current?.focus();
        setFocused(true);
      });
    }
  }, [releasing]);

  useEffect(() => {
    const onResize = () => setPanel((p) => clampPanel(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const px = e.clientX;
      const py = e.clientY;
      const { dir, start: s } = d;
      const { cx, cy } = s;
      let w = s.w;
      let h = s.h;

      if (dir.includes("e")) w = 2 * (px - cx);
      if (dir.includes("w")) w = 2 * (cx - px);
      if (dir.includes("s")) h = 2 * (py - cy);
      if (dir.includes("n")) h = 2 * (cy - py);

      setPanel(clampPanel({ cx, cy, w, h }));
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setResizing(false);
      setPanel((p) => {
        const c = clampPanel(p);
        localStorage.setItem(PANEL_RECT_KEY, JSON.stringify(c));
        return c;
      });
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const beginResize = (e: ReactMouseEvent<HTMLButtonElement>, dir: ResizeDir) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      dir,
      start: { ...panel },
    };
    setResizing(true);
    const cursor =
      dir === "n" || dir === "s"
        ? "ns-resize"
        : dir === "e" || dir === "w"
          ? "ew-resize"
          : dir === "ne" || dir === "sw"
            ? "nesw-resize"
            : "nwse-resize";
    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";
  };

  const download = useCallback(() => {
    if (!text.trim()) return;
    const blob = new Blob([text], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `writespace-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [text]);

  const runRelease = useCallback(() => {
    if (!text.trim() || releasing) return;
    undoRef.current = text;
    setReleaseVisual(text);
    setReleasing(true);
    setTimeout(() => {
      setText("");
      queueMicrotask(() => mdxEditorRef.current?.setMarkdown(""));
      localStorage.removeItem(STORAGE_KEY);
      setReleasing(false);
      setReleaseVisual("");
    }, 3500);
  }, [text, releasing]);

  const onUndoWhenEmptyCapture = (e: KeyboardEvent) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "z" &&
      undoRef.current &&
      !text.trim()
    ) {
      e.preventDefault();
      e.stopPropagation();
      const restored = undoRef.current;
      undoRef.current = "";
      setText(restored);
      queueMicrotask(() => mdxEditorRef.current?.setMarkdown(restored));
    }
  };

  const onMarkdownChange = (v: string, _initialNormalize: boolean) => {
    if (text.trim() && !v.trim()) undoRef.current = text;
    setText(v);
  };

  const startHold = () => {
    if (!text.trim() || releasing) return;
    setHoldRelease(true);
    holdTimerRef.current = setTimeout(() => {
      setHoldRelease(false);
      runRelease();
    }, 1000);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldRelease(false);
  };

  const handleBar = (dir: ResizeDir, className: string) => (
    <button
      type="button"
      aria-label={`调整窗口${dir}`}
      tabIndex={-1}
      onMouseDown={(e) => beginResize(e, dir)}
      className={cn(
        "absolute z-[60] touch-none border-0 bg-transparent p-0",
        className,
      )}
    />
  );

  return (
    <div
      className="pointer-events-auto fixed z-[35]"
      style={{
        left,
        top,
        width: panel.w,
        height: panel.h,
      }}
    >
      {handleBar(
        "n",
        "-top-3 left-10 right-10 h-5 cursor-ns-resize md:left-12 md:right-12",
      )}
      {handleBar(
        "s",
        "-bottom-3 left-10 right-10 h-5 cursor-ns-resize md:left-12 md:right-12",
      )}
      {handleBar(
        "w",
        "-left-2 top-6 bottom-6 w-4 cursor-ew-resize md:top-8 md:bottom-8",
      )}
      {handleBar(
        "e",
        "-right-2 top-6 bottom-6 w-4 cursor-ew-resize md:top-8 md:bottom-8",
      )}
      {handleBar("nw", "-left-3 -top-3 h-8 w-8 cursor-nwse-resize")}
      {handleBar("ne", "-right-3 -top-3 h-8 w-8 cursor-nesw-resize")}
      {handleBar("sw", "-left-3 -bottom-3 h-10 w-10 cursor-nesw-resize")}
      {handleBar("se", "-right-3 -bottom-3 h-10 w-10 cursor-nwse-resize")}

      <div
        className={cn(
          "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.2),0_0_0_1px_rgba(0,0,0,0.1),0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-3xl",
          resizing
            ? "transition-none"
            : "transition-[box-shadow] duration-700 ease-out",
        )}
      >
        <AnimatePresence>
          {releasing && (
            <div
              className={cn(
                "writespace-text-fade pointer-events-none absolute inset-0 z-[1] overflow-hidden whitespace-pre-wrap break-words p-10 md:p-16",
                "font-normal leading-[2] tracking-[0.05em] text-white/75",
                fontClass[fontFamily],
                sizeClass[fontSize],
              )}
            >
              {releaseVisual.split("\n").map((line, li) => {
                const lineDelay = Math.random() * 0.4;
                return (
                  <div key={li} className="min-h-[1.8em]">
                    {line.split("").map((ch, ci) => (
                      <motion.span
                        key={`${li}-${ci}`}
                        className="inline-block"
                        initial={{
                          opacity: 0.75,
                          y: 0,
                          x: 0,
                          rotate: 0,
                          filter: "blur(0px)",
                        }}
                        animate={{
                          opacity: 0,
                          y: -150 - Math.random() * 50,
                          x: Math.random() * 40 - 20,
                          rotate: Math.random() * 4 - 2,
                          filter: "blur(12px)",
                        }}
                        transition={{
                          duration: 2.5 + Math.random() * 0.5,
                          ease: "easeOut",
                          delay: lineDelay + Math.random() * 0.1,
                        }}
                      >
                        {ch === " " ? "\u00a0" : ch}
                      </motion.span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </AnimatePresence>

        <div
          className={cn(
            /* 内边距交给 MDX 内容区，与 flow-space textarea 的 p-10 md:p-16 一致 */
            "writespace-mdx-editor writespace-text-fade dark-theme flex min-h-0 flex-1 flex-col overflow-hidden p-0",
          )}
          onKeyDownCapture={onUndoWhenEmptyCapture}
        >
          <MDXEditor
            ref={mdxEditorRef}
            markdown={text}
            onChange={onMarkdownChange}
            plugins={mdxPlugins}
            readOnly={releasing}
            spellCheck={false}
            suppressHtmlProcessing
            placeholder={releasing ? "" : "开始你的心流写作..."}
            className="!h-full min-h-0 w-full flex-1 !border-0 !bg-transparent !shadow-none"
            contentEditableClassName={cn(
              /* 不要写 !text-*：会套在占位符上，占位符颜色用 mdx-editor-writespace.css */
              "scrollbar-hide antialiased !bg-transparent !leading-[2] selection:bg-white/20",
              "font-normal tracking-[0.05em] transition-colors duration-500",
              "!p-10 md:!p-16",
              fontClass[fontFamily],
              sizeClass[fontSize],
              releasing && "!text-transparent !caret-transparent",
            )}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_100px_rgba(0,0,0,0.1)]" />

        <div className="absolute bottom-6 right-10 z-20 flex items-center gap-6 opacity-10 transition-opacity duration-500 group-hover:opacity-50">
          <button
            type="button"
            onClick={download}
            disabled={releasing || !text.trim()}
            className={cn(
              "font-handwriting text-sm uppercase tracking-widest transition-all duration-300",
              "text-white/30 hover:text-white/80 disabled:pointer-events-none disabled:opacity-0",
            )}
          >
            Save
          </button>
          <button
            type="button"
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            disabled={releasing || !text.trim()}
            className={cn(
              "font-handwriting text-sm uppercase tracking-widest transition-all duration-300",
              "text-white/30 hover:text-white/80 disabled:pointer-events-none disabled:opacity-0",
              holdRelease && "scale-95 text-white/60",
            )}
          >
            Release
          </button>
        </div>
      </div>
    </div>
  );
}
