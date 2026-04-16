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
import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import "@mdxeditor/editor/style.css";
import { AnimatePresence, motion } from "framer-motion";
import { jsPDF } from "jspdf";
import { marked } from "marked";
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

type MdBlock =
  | { kind: "h"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: "ul"; text: string }
  | { kind: "ol"; text: string }
  | { kind: "p"; text: string };

function stripInlineMarkdown(input: string): string {
  return input
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
}

function parseMarkdownBlocks(markdown: string): MdBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      blocks.push({ kind: "p", text: "" });
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      blocks.push({
        kind: "h",
        level: h[1]!.length as 1 | 2 | 3 | 4 | 5 | 6,
        text: stripInlineMarkdown(h[2]!),
      });
      continue;
    }
    const ul = line.match(/^[-*+]\s+(.+)$/);
    if (ul) {
      blocks.push({ kind: "ul", text: stripInlineMarkdown(ul[1]!) });
      continue;
    }
    const ol = line.match(/^\d+[.)]\s+(.+)$/);
    if (ol) {
      blocks.push({ kind: "ol", text: stripInlineMarkdown(ol[1]!) });
      continue;
    }
    blocks.push({ kind: "p", text: stripInlineMarkdown(line) });
  }
  return blocks;
}

function sanitizeHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

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
  songti: "font-songti",
  kaiti: "font-kaiti",
  xinwei: "font-xinwei",
};

const sizeClass: Record<FontSizeId, string> = {
  small: "text-base md:text-lg",
  medium: "text-lg md:text-xl",
  large: "text-xl md:text-2xl",
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
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
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

  const downloadBlob = useCallback((blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `writespace-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const downloadTxt = useCallback(() => {
    if (!text.trim()) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, "txt");
    setSaveMenuOpen(false);
  }, [downloadBlob, text]);

  const downloadPdf = useCallback(async () => {
    if (!text.trim()) return;
    const pdf = new jsPDF({
      orientation: "p",
      unit: "pt",
      format: "a4",
      compress: true,
    });
    const mount = document.createElement("div");
    mount.style.position = "fixed";
    mount.style.left = "0";
    mount.style.top = "0";
    mount.style.width = "595px";
    mount.style.padding = "40px";
    mount.style.whiteSpace = "pre-wrap";
    mount.style.lineHeight = "1.8";
    mount.style.fontSize = "14px";
    mount.style.color = "#111";
    mount.style.background = "#fff";
    mount.style.opacity = "0";
    mount.style.pointerEvents = "none";
    mount.style.zIndex = "-1";
    mount.style.fontFamily =
      '"LXGW WenKai Lite","Kaiti SC","STKaiti","KaiTi","Noto Serif SC","Songti SC",serif';
    const renderedMarkdown = sanitizeHtml(
      marked.parse(text, {
        gfm: true,
        breaks: true,
      }) as string,
    );
    mount.innerHTML = `
      <style>
        .ws-export{color:#111;font-size:14px;line-height:1.8;}
        .ws-export h1{font-size:30px;line-height:1.25;margin:0 0 14px;font-weight:700;}
        .ws-export h2{font-size:24px;line-height:1.3;margin:10px 0 12px;font-weight:700;}
        .ws-export h3{font-size:20px;line-height:1.3;margin:8px 0 10px;font-weight:700;}
        .ws-export h4,.ws-export h5,.ws-export h6{font-size:16px;line-height:1.35;margin:6px 0 8px;font-weight:700;}
        .ws-export p{margin:0 0 8px;}
        .ws-export code{background:#f3f3f3;border-radius:4px;padding:1px 4px;font-family:Menlo,Monaco,monospace;font-size:12px;}
        .ws-export pre{background:#f8f8f8;border:1px solid #ececec;border-radius:8px;padding:12px;overflow:auto;}
        .ws-export pre code{background:transparent;padding:0;border-radius:0;}
        .ws-export blockquote{margin:8px 0;padding:4px 0 4px 12px;border-left:3px solid #cfcfcf;color:#444;}
        .ws-export a{color:#0f4fad;text-decoration:underline;}
        .ws-export ul,.ws-export ol{margin:0 0 10px 22px;padding:0;}
        .ws-export li{margin:0 0 6px;}
        .ws-export hr{border:none;border-top:1px solid #ddd;margin:12px 0;}
      </style>
      <div class="ws-export">${renderedMarkdown}</div>
    `;
    document.body.appendChild(mount);
    try {
      await pdf.html(mount, {
        margin: [28, 28, 28, 28],
        autoPaging: "text",
        html2canvas: { scale: 1.2, useCORS: true, backgroundColor: "#ffffff" },
      });
    } finally {
      mount.remove();
    }
    pdf.save(`writespace-${new Date().toISOString().slice(0, 10)}.pdf`);
    setSaveMenuOpen(false);
  }, [text]);

  const downloadWord = useCallback(async () => {
    if (!text.trim()) return;
    const blocks = parseMarkdownBlocks(text);
    const headingMap: Record<1 | 2 | 3 | 4 | 5 | 6, HeadingLevel> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    };
    const doc = new Document({
      sections: [
        {
          children: blocks.map((b) => {
            if (b.kind === "h") {
              return new Paragraph({
                heading: headingMap[b.level],
                text: b.text || " ",
              });
            }
            if (b.kind === "ul") {
              return new Paragraph({
                text: b.text || " ",
                bullet: { level: 0 },
              });
            }
            if (b.kind === "ol") {
              return new Paragraph({
                text: b.text || " ",
              });
            }
            return new Paragraph({ text: b.text || " " });
          }),
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    downloadBlob(
      new Blob([blob], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      "docx",
    );
    setSaveMenuOpen(false);
  }, [downloadBlob, text]);

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

  const startHold = () => {
    if (!text.trim() || releasing || saveMenuOpen) return;
    setHoldRelease(true);
    holdTimerRef.current = setTimeout(() => {
      setHoldRelease(false);
      runRelease();
    }, 1200);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldRelease(false);
  };

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

        <div className="absolute bottom-6 right-2 z-20 flex items-center gap-4 opacity-10 transition-opacity duration-500 group-hover:opacity-50">
          <AnimatePresence mode="popLayout" initial={false}>
            {saveMenuOpen ? (
              <motion.div
                key="save-menu"
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[
                  { key: "arrow", label: "←", onClick: () => setSaveMenuOpen(false) },
                  { key: "back", label: "BACK", onClick: () => setSaveMenuOpen(false) },
                  { key: "txt", label: "TXT", onClick: downloadTxt },
                  { key: "pdf", label: "PDF", onClick: () => void downloadPdf() },
                  { key: "word", label: "WORD", onClick: () => void downloadWord() },
                ].map((item, idx) => (
                  <motion.button
                    key={item.key}
                    type="button"
                    onClick={item.onClick}
                    className="font-kaiti text-sm uppercase tracking-widest text-white/35 transition-all duration-300 hover:text-white/85"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2, delay: idx * 0.06 }}
                  >
                    {item.label}
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <motion.button
                key="save-button"
                type="button"
                onClick={() => setSaveMenuOpen(true)}
                disabled={releasing || !text.trim()}
                className={cn(
                  "font-kaiti text-sm uppercase tracking-widest transition-all duration-300",
                  "text-white/30 hover:text-white/80 disabled:pointer-events-none disabled:opacity-0",
                )}
              >
                Save
              </motion.button>
            )}
          </AnimatePresence>
          <button
            type="button"
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            disabled={releasing || !text.trim() || saveMenuOpen}
            className={cn(
              "font-kaiti text-sm uppercase tracking-widest transition-all duration-300",
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
