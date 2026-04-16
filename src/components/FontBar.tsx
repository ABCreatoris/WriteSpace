import { AnimatePresence, motion } from "framer-motion";
import { Type } from "lucide-react";
import { useState } from "react";

export type FontFamilyId = "songti" | "kaiti" | "xinwei";
export type FontSizeId = "small" | "medium" | "large";

export function FontBar({
  currentFont,
  onFontChange,
  currentSize,
  onSizeChange,
}: {
  currentFont: FontFamilyId;
  onFontChange: (f: FontFamilyId) => void;
  currentSize: FontSizeId;
  onSizeChange: (s: FontSizeId) => void;
}) {
  const [hover, setHover] = useState(false);

  const fonts: { id: FontFamilyId; label: string }[] = [
    { id: "songti", label: "宋体" },
    { id: "kaiti", label: "楷书" },
    { id: "xinwei", label: "新魏" },
  ];

  const sizes: { id: FontSizeId; label: string }[] = [
    { id: "small", label: "小" },
    { id: "medium", label: "中" },
    { id: "large", label: "大" },
  ];

  return (
    <div
      className="fixed top-0 left-8 z-50 flex h-24 items-start pt-6"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex flex-col items-start gap-2">
        <div className="cursor-pointer rounded-full border border-white/10 bg-white/5 p-3 text-white/40 transition-colors hover:text-white">
          <Type size={18} strokeWidth={2} />
        </div>
        <AnimatePresence>
          {hover && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex min-w-[100px] flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-xl backdrop-blur-md"
            >
              <div className="flex flex-col gap-1">
                <div className="px-2 pb-1 font-sans text-[10px] uppercase tracking-widest text-white/20">
                  字体
                </div>
                {fonts.map((d) => (
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
                  {sizes.map((d) => (
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
