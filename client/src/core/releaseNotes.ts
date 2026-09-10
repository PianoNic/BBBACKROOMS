import changelog from "../../../CHANGELOG.md?raw";
import pkg from "../../package.json";

export type ReleaseNote = {
  version: string;
  date: string;
  entries: string[];
};

const HEADING_RE = /^## v(\S+)\s+—\s+(\d{4}-\d{2}-\d{2})\s*$/;

export function releaseNotes(): ReleaseNote[] {
  const lines = changelog.split("\n");
  const notes: ReleaseNote[] = [];
  let current: ReleaseNote | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const heading = HEADING_RE.exec(line);
    if (heading) {
      current = { version: heading[1], date: heading[2], entries: [] };
      notes.push(current);
      continue;
    }
    if (!current) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("- ")) {
      current.entries.push(trimmed.slice(2).trim());
    } else {
      current.entries.push(trimmed);
    }
  }

  return notes;
}

export function currentVersion(): string {
  return pkg.version;
}
