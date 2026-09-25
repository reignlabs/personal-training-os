/**
 * A small Markdown pipe-table parser, shared by the fixture loader and, later, the
 * datapack tool's readers for EXERCISE_METADATA.md and EQUIPMENT_MODEL.md
 * (APP_DATA_CONTRACTS_V0.md §5.8, D-119: "one parser serves fixtures and real data").
 *
 * Deliberately minimal: GitHub-flavored pipe tables only, no nested tables, no cell
 * spanning. Fixture and metadata cell grammars (equipment options, tag lists, etc.)
 * are decoded separately (see src/pack/decode.ts) — this module only turns table text
 * into rows of trimmed string cells.
 */

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

/**
 * Parses the first Markdown pipe table found in `markdown`, starting at or after
 * `fromIndex`. Returns null if none is found.
 */
export function parseFirstTable(markdown: string, fromIndex = 0): { table: ParsedTable; endIndex: number } | null {
  const lines = markdown.slice(fromIndex).split('\n');
  let headerLine = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim().startsWith('|') && isSeparatorRow(lines[i + 1])) {
      headerLine = i;
      break;
    }
  }
  if (headerLine === -1) return null;

  const headers = splitRow(lines[headerLine]);
  const rows: string[][] = [];
  let i = headerLine + 2;
  let consumedChars = 0;
  for (let j = 0; j <= headerLine + 1; j++) consumedChars += lines[j].length + 1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) break;
    rows.push(splitRow(line));
    consumedChars += line.length + 1;
  }
  return { table: { headers, rows }, endIndex: fromIndex + consumedChars };
}

/** Finds every Markdown pipe table in `markdown`, in document order. */
export function parseAllTables(markdown: string): ParsedTable[] {
  const out: ParsedTable[] = [];
  let cursor = 0;
  for (;;) {
    const found = parseFirstTable(markdown, cursor);
    if (!found) break;
    out.push(found.table);
    cursor = found.endIndex;
  }
  return out;
}

/** Converts a parsed table into an array of header-keyed row objects. */
export function tableToObjects(table: ParsedTable): Record<string, string>[] {
  return table.rows.map((row) => {
    const obj: Record<string, string> = {};
    table.headers.forEach((h, idx) => {
      obj[h] = row[idx] ?? '';
    });
    return obj;
  });
}

/**
 * Extracts the table immediately following a heading line whose text includes
 * `headingContains` (case-insensitive). Useful for pulling a specific fixture table
 * (e.g. "3.2 FX-EQUIP") out of a larger source document.
 */
export function tableAfterHeading(markdown: string, headingContains: string): ParsedTable | null {
  const lines = markdown.split('\n');
  const idx = lines.findIndex(
    (l) => /^#{1,6}\s/.test(l) && l.toLowerCase().includes(headingContains.toLowerCase()),
  );
  if (idx === -1) return null;
  const rest = lines.slice(idx + 1).join('\n');
  const found = parseFirstTable(rest);
  return found ? found.table : null;
}
