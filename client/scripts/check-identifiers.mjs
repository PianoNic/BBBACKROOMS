import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCAN_ROOTS = ["src", "tests"];
const SKIP_DIR_NAMES = new Set(["node_modules", "dist"]);
const FORBIDDEN_SUBSTRING = "bbb";

const LEGACY_COMPAT_LITERALS = [
  "bbb_settings",
  "bbb_avatar",
  "bbb_name",
  "bbb_color",
  "bbb_active_pack",
  "bbb_lobby_resume",
  "bbb-intro-seen",
  "bbb_menu_back",
  "bbb_texture_packs",
];

const LEGACY_COMPAT_FILES = new Set([
  join("src", "core", "legacyStorage.ts"),
  join("src", "core", "legacyStorage.test.ts"),
]);

const scriptPath = fileURLToPath(import.meta.url);
const clientRoot = process.cwd();

function shouldSkipDir(name) {
  return SKIP_DIR_NAMES.has(name) || name.startsWith(".");
}

function collectFiles(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      collectFiles(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }

  return out;
}

function stripLegacyLiterals(text, relPath) {
  if (!LEGACY_COMPAT_FILES.has(relPath)) return text;

  let result = text;
  for (const literal of LEGACY_COMPAT_LITERALS) {
    result = result.split(literal).join(" ".repeat(literal.length));
  }
  return result;
}

function findOffenses(filePath, relPath) {
  const offenses = [];
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return offenses;
  }

  const scanned = stripLegacyLiterals(content, relPath);
  const lines = scanned.split(/\r?\n/);
  const needle = FORBIDDEN_SUBSTRING.toLowerCase();

  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(needle)) {
      offenses.push(`${relPath}:${index + 1}`);
    }
  });

  return offenses;
}

function main() {
  const files = [];
  for (const root of SCAN_ROOTS) {
    const absoluteRoot = join(clientRoot, root);
    try {
      const stats = statSync(absoluteRoot);
      if (!stats.isDirectory()) continue;
    } catch {
      continue;
    }
    collectFiles(absoluteRoot, files);
  }

  const offenses = [];
  for (const filePath of files) {
    if (filePath === scriptPath) continue;
    const relPath = relative(clientRoot, filePath);
    offenses.push(...findOffenses(filePath, relPath));
  }

  if (offenses.length > 0) {
    for (const offense of offenses) {
      console.log(offense);
    }
    process.exit(1);
  }

  console.log("OK: no forbidden identifiers found");
  process.exit(0);
}

main();
