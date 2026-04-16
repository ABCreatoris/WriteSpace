export type MdBlock =
  | { kind: "h"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: "ul"; text: string }
  | { kind: "ol"; text: string }
  | { kind: "p"; text: string };

function decodeHtmlEntities(input: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = input;
  return el.value;
}

function stripInlineMarkdown(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .trim(),
  );
}

export function parseMarkdownBlocks(markdown: string): MdBlock[] {
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
