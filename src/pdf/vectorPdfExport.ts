import type { FontFamilyId, FontSizeId } from "../components/FontBar";
import type { MdBlock } from "../lib/markdownBlocks";
import { parseMarkdownBlocks } from "../lib/markdownBlocks";

const PDF_FONT_KEY = "WriteSpace";

/** Pinned jsDelivr refs — subset OTF / TTF from upstream repos. */
const FONT_URLS = {
  notoSerifRegular:
    "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf",
  notoSerifBold:
    "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Serif/SubsetOTF/SC/NotoSerifSC-Bold.otf",
  lxgwRegular:
    "https://cdn.jsdelivr.net/gh/lxgw/LxgwWenKai-Lite@main/fonts/TTF/LXGWWenKaiLite-Regular.ttf",
  lxgwMedium:
    "https://cdn.jsdelivr.net/gh/lxgw/LxgwWenKai-Lite@main/fonts/TTF/LXGWWenKaiLite-Medium.ttf",
} as const;

const VFS_NOTO = {
  "NotoSerifSC-Regular.otf": FONT_URLS.notoSerifRegular,
  "NotoSerifSC-Bold.otf": FONT_URLS.notoSerifBold,
} as const;

const VFS_LXGW = {
  "LXGWWenKaiLite-Regular.ttf": FONT_URLS.lxgwRegular,
  "LXGWWenKaiLite-Medium.ttf": FONT_URLS.lxgwMedium,
} as const;

const fontsSongOrWei = {
  [PDF_FONT_KEY]: {
    normal: "NotoSerifSC-Regular.otf",
    bold: "NotoSerifSC-Bold.otf",
    italics: "NotoSerifSC-Regular.otf",
    bolditalics: "NotoSerifSC-Bold.otf",
  },
} as const;

const fontsKai = {
  [PDF_FONT_KEY]: {
    normal: "LXGWWenKaiLite-Regular.ttf",
    bold: "LXGWWenKaiLite-Medium.ttf",
    italics: "LXGWWenKaiLite-Regular.ttf",
    bolditalics: "LXGWWenKaiLite-Medium.ttf",
  },
} as const;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    binary += String.fromCharCode.apply(null, sub as unknown as number[]);
  }
  return btoa(binary);
}

const vfsTextCache = new Map<string, Promise<string>>();

async function fetchToVfsEntry(url: string, vfsName: string): Promise<[string, string]> {
  const cacheKey = `${vfsName}|${url}`;
  let p = vfsTextCache.get(cacheKey);
  if (!p) {
    p = (async () => {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) {
        throw new Error(`字体加载失败 (${vfsName}): HTTP ${res.status}`);
      }
      const buf = await res.arrayBuffer();
      return arrayBufferToBase64(buf);
    })();
    vfsTextCache.set(cacheKey, p);
  }
  const data = await p;
  return [vfsName, data];
}

async function buildVfsAndFonts(fontFamily: FontFamilyId): Promise<{
  vfs: Record<string, string>;
  fonts: typeof fontsSongOrWei;
}> {
  if (fontFamily === "kaiti") {
    const entries = await Promise.all([
      fetchToVfsEntry(VFS_LXGW["LXGWWenKaiLite-Regular.ttf"], "LXGWWenKaiLite-Regular.ttf"),
      fetchToVfsEntry(VFS_LXGW["LXGWWenKaiLite-Medium.ttf"], "LXGWWenKaiLite-Medium.ttf"),
    ]);
    return { vfs: Object.fromEntries(entries), fonts: fontsKai };
  }
  const entries = await Promise.all([
    fetchToVfsEntry(VFS_NOTO["NotoSerifSC-Regular.otf"], "NotoSerifSC-Regular.otf"),
    fetchToVfsEntry(VFS_NOTO["NotoSerifSC-Bold.otf"], "NotoSerifSC-Bold.otf"),
  ]);
  return { vfs: Object.fromEntries(entries), fonts: fontsSongOrWei };
}

function bodyPt(size: FontSizeId): number {
  if (size === "large") return 15;
  if (size === "medium") return 13;
  return 12;
}

function headingPt(size: FontSizeId, level: 1 | 2 | 3 | 4 | 5 | 6): number {
  const b = bodyPt(size);
  const scale =
    level === 1 ? 2.0 : level === 2 ? 1.65 : level === 3 ? 1.4 : level === 4 ? 1.22 : 1.12;
  return Math.round(b * scale);
}

function blocksToPdfContent(blocks: MdBlock[], fontSize: FontSizeId): unknown[] {
  const body = bodyPt(fontSize);
  const out: unknown[] = [];
  for (const b of blocks) {
    if (b.kind === "h") {
      const style = `h${b.level}` as const;
      out.push({
        text: b.text || " ",
        style,
        fontSize: headingPt(fontSize, b.level),
        bold: true,
        margin: [0, 10, 0, 6],
      });
      continue;
    }
    if (b.kind === "ul") {
      out.push({
        ul: [{ text: b.text || " ", fontSize: body, lineHeight: 1.45 }],
        margin: [0, 0, 0, 8],
      });
      continue;
    }
    if (b.kind === "ol") {
      out.push({
        ol: [{ text: b.text || " ", fontSize: body, lineHeight: 1.45 }],
        margin: [0, 0, 0, 8],
      });
      continue;
    }
    if (!b.text.trim()) {
      out.push({ text: " ", fontSize: body, margin: [0, 0, 0, 4] });
    } else {
      out.push({
        text: b.text,
        fontSize: body,
        lineHeight: 1.45,
        margin: [0, 0, 0, 6],
      });
    }
  }
  return out;
}

type PdfMakeModule = {
  createPdf: (
    docDefinition: object,
    tableLayouts?: object,
    fonts?: object,
    vfs?: object,
  ) => {
    getBlob: (cb: (blob: Blob) => void) => void;
  };
};

export async function generateVectorPdfBlob(
  markdown: string,
  fontFamily: FontFamilyId,
  fontSize: FontSizeId,
): Promise<Blob> {
  const pdfMakeMod = (await import(
    "pdfmake/build/pdfmake"
  )) as unknown as PdfMakeModule;
  const { createPdf } = pdfMakeMod;

  const blocks = parseMarkdownBlocks(markdown);
  const { vfs, fonts } = await buildVfsAndFonts(fontFamily);
  const body = bodyPt(fontSize);

  const xinweiExtras =
    fontFamily === "xinwei"
      ? ({ characterSpacing: 0.35 } as const)
      : ({} as const);

  const docDefinition = {
    pageSize: "A4" as const,
    pageMargins: [48, 56, 48, 56] as [number, number, number, number],
    defaultStyle: {
      font: PDF_FONT_KEY,
      fontSize: body,
      lineHeight: 1.45,
      color: "#111111",
    },
    content: blocksToPdfContent(blocks, fontSize),
    info: {
      title: "WriteSpace export",
      creator: "WriteSpace",
    },
    styles: {
      h1: { ...xinweiExtras },
      h2: { ...xinweiExtras },
      h3: { ...xinweiExtras },
      h4: { ...xinweiExtras },
      h5: { ...xinweiExtras },
      h6: { ...xinweiExtras },
    },
  };

  return await new Promise<Blob>((resolve, reject) => {
    try {
      createPdf(docDefinition, undefined, fonts as object, vfs).getBlob((blob) => {
        resolve(blob);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
