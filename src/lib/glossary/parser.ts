import type { GlossaryTerm } from "@/types/glossary";

const HEADER_SOURCE_KEYS = new Set(["source", "src", "源文", "原文", "source_text"]);
const HEADER_TARGET_KEYS = new Set(["target", "dst", "译文", "目标", "target_text"]);

export function parseGlossaryText(input: string): GlossaryTerm[] {
  const sanitized = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = sanitized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((line) => parseDelimitedLine(line, delimiter));

  const startIndex = looksLikeHeader(rows[0]) ? 1 : 0;
  const terms: GlossaryTerm[] = [];

  for (let i = startIndex; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.length < 2) {
      continue;
    }

    const source = cleanupCell(row[0]);
    const target = cleanupCell(row[1]);

    if (!source || !target) {
      continue;
    }

    terms.push({ source, target });
  }

  return terms;
}

function detectDelimiter(line: string) {
  if (line.includes("\t")) {
    return "\t";
  }
  if (line.includes(",")) {
    return ",";
  }
  if (line.includes("=")) {
    return "=";
  }
  if (/\S\s{2,}\S/.test(line)) {
    return "__MULTISPACE__";
  }

  return "\t";
}

function cleanupCell(value: string) {
  return value.trim().replace(/^"|"$/g, "").trim();
}

function looksLikeHeader(row: string[]) {
  if (row.length < 2) {
    return false;
  }

  const source = normalizeHeaderCell(row[0]);
  const target = normalizeHeaderCell(row[1]);

  return HEADER_SOURCE_KEYS.has(source) && HEADER_TARGET_KEYS.has(target);
}

function normalizeHeaderCell(value: string) {
  return cleanupCell(value).toLowerCase().replace(/\s+/g, "_");
}

function parseDelimitedLine(line: string, delimiter: string) {
  if (delimiter === "=") {
    const parts = line.split("=");
    return [parts[0] ?? "", parts.slice(1).join("=").trim()];
  }
  if (delimiter === "__MULTISPACE__") {
    const match = line.match(/^(.+?)\s{2,}(.+)$/);
    if (match) {
      return [match[1], match[2]];
    }
    return [line];
  }

  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];

      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}
