export type FontFamilyId =
  | "songti"
  | "kaiti"
  | "xinwei"
  | "fangzheng"
  | "harmony";
export type FontSizeId = "small" | "medium" | "large";

const FONT_OPTIONS: { id: FontFamilyId; label: string }[] = [
  { id: "songti", label: "宋体" },
  { id: "kaiti", label: "楷书" },
  { id: "xinwei", label: "新魏" },
  { id: "fangzheng", label: "方正" },
  { id: "harmony", label: "鸿蒙" },
];

const SIZE_OPTIONS: { id: FontSizeId; label: string }[] = [
  { id: "small", label: "小" },
  { id: "medium", label: "中" },
  { id: "large", label: "大" },
];

const panelShell =
  "rounded-2xl border border-white/20 bg-black/35 shadow-[0_10px_32px_rgba(0,0,0,0.3)] backdrop-blur-2xl backdrop-saturate-150";

/** 字体 + 字号面板（供顶部栏、编辑卡片底栏等复用） */
export function FontMenuPanel({
  currentFont,
  onFontChange,
  currentSize,
  onSizeChange,
  layout = "vertical",
}: {
  currentFont: FontFamilyId;
  onFontChange: (f: FontFamilyId) => void;
  currentSize: FontSizeId;
  onSizeChange: (s: FontSizeId) => void;
  /** vertical：纵向列表；horizontal：编辑卡片下方横向条，避免超出屏幕 */
  layout?: "vertical" | "horizontal";
}) {
  if (layout === "horizontal") {
    return (
      <div
        className={`flex max-w-[min(100vw-1rem,42rem)] flex-wrap items-center gap-x-2.5 gap-y-1.5 px-3.5 py-2 ${panelShell}`}
      >
        <span className="shrink-0 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-white">
          字体
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 sm:flex-initial">
          {FONT_OPTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onFontChange(d.id)}
              className={`rounded-lg px-2.5 py-1.5 font-kaiti text-sm leading-snug text-white transition-all ${
                currentFont === d.id
                  ? "bg-white/18 shadow-sm"
                  : "hover:bg-white/12"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div
          className="hidden h-5 w-px shrink-0 bg-white/15 sm:block"
          aria-hidden
        />
        <span className="shrink-0 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-white">
          字号
        </span>
        <div className="flex shrink-0 items-center gap-px rounded-md bg-black/35 p-px">
          {SIZE_OPTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onSizeChange(d.id)}
              className={`min-w-[2rem] rounded px-1.5 py-1.5 font-kaiti text-xs font-medium leading-none text-white transition-all ${
                currentSize === d.id ? "bg-white/18 shadow-sm" : "hover:bg-white/12"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-[100px] flex-col gap-4 p-3 ${panelShell}`}
    >
      <div className="flex flex-col gap-1">
        <div className="px-2 pb-1 font-sans text-[10px] uppercase tracking-widest text-white/20">
          字体
        </div>
        {FONT_OPTIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onFontChange(d.id)}
            className={`rounded-xl px-4 py-2 text-left text-xs font-medium transition-all ${
              currentFont === d.id
                ? "bg-white/10 text-white"
                : "text-white/40 hover:bg-white/5 hover:text-white/70"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="mx-2 h-px bg-white/10" />
      <div className="flex flex-col gap-1">
        <div className="px-2 pb-1 font-sans text-[10px] uppercase tracking-widest text-white/20">
          字号
        </div>
        <div className="flex gap-1 rounded-xl bg-black/20 p-1">
          {SIZE_OPTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onSizeChange(d.id)}
              className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium transition-all ${
                currentSize === d.id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
