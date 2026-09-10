import type { ComponentChildren } from "preact";

type InlineNode = string | { text: string; href: string };
type Block = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const ALLOWED_HREF_RE = /^(https?:|mailto:)/i;

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let lastIndex = 0;
  LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_RE.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push({ text: match[1], href: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderInline(text: string, keyPrefix: string): ComponentChildren {
  return parseInline(text).map((node, i) => {
    if (typeof node === "string") return node;
    if (ALLOWED_HREF_RE.test(node.href)) {
      return (
        <a key={`${keyPrefix}-${i}`} href={node.href} target="_blank" rel="noopener noreferrer">
          {node.text}
        </a>
      );
    }
    return node.text;
  });
}

function parseBlocks(body: string): Block[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length) {
      blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
      paragraphLines = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      listItems.push(line.slice(2).trim());
      continue;
    }
    flushList();
    paragraphLines.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

export function MarkdownBody(props: { text: string }) {
  const blocks = parseBlocks(props.text);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "list") {
          return (
            <ul class="news-md-list" key={i}>
              {block.items.map((item, j) => <li key={j}>{renderInline(item, `${i}-${j}`)}</li>)}
            </ul>
          );
        }
        return <p class="news-md-p" key={i}>{renderInline(block.text, `${i}`)}</p>;
      })}
    </>
  );
}
