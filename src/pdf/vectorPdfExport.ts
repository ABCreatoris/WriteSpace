import type { FontFamilyId, FontSizeId } from "../components/FontBar";
import type { MdBlock } from "../lib/markdownBlocks";
import { parseMarkdownBlocks } from "../lib/markdownBlocks";

const PDF_FONT_KEY = "WriteSpace";

function buildFonts(fontFamily: FontFamilyId): Record<string, Record<string, string>> {
  if (fontFamily === "kaiti" || fontFamily === "xinwei") {
    return {
      [PDF_FONT_KEY]: {
        normal: "/fonts/LXGWWenKaiLite-Regular.ttf",
        bold: "/fonts/LXGWWenKaiLite-Medium.ttf",
        italics: "/fonts/LXGWWenKaiLite-Regular.ttf",
        bolditalics: "/fonts/LXGWWenKaiLite-Medium.ttf",
      },
    };
  }
  if (fontFamily === "harmony") {
    return {
      [PDF_FONT_KEY]: {
        normal: "/fonts/NotoSerifSC-Regular.otf",
        bold: "/fonts/NotoSerifSC-Bold.otf",
        italics: "/fonts/NotoSerifSC-Regular.otf",
        bolditalics: "/fonts/NotoSerifSC-Bold.otf",
      },
    };
  }
  return {
    [PDF_FONT_KEY]: {
      normal: "/fonts/NotoSerifSC-Regular.otf",
      bold: "/fonts/NotoSerifSC-Bold.otf",
      italics: "/fonts/NotoSerifSC-Regular.otf",
      bolditalics: "/fonts/NotoSerifSC-Bold.otf",
    },
  };
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
  const fonts = buildFonts(fontFamily);
  const body = bodyPt(fontSize);

  const xinweiExtras = fontFamily === "xinwei" ? ({ characterSpacing: 0.35 } as const) : ({} as const);

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
      // Use local font URLs directly; avoids heavyweight base64 conversion per export.
      createPdf(docDefinition, undefined, fonts).getBlob((blob) => {
        resolve(blob);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
