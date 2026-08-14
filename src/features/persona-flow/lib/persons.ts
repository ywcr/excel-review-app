import { normalizeValue } from "./normalize";
import { STANDARD_FIELDS, type ParsedFile, type PersonRecord, type StandardField } from "./types";

export function buildPersons(files: ParsedFile[]): PersonRecord[] {
  const out: PersonRecord[] = [];
  for (const f of files) {
    if (f.status !== "parsed") continue;
    const pairs = Object.entries(f.mapping).filter(([, v]) => v) as [string, StandardField][];
    for (const row of f.rows) {
      const std = Object.fromEntries(STANDARD_FIELDS.map((s) => [s, ""])) as Record<
        StandardField,
        string
      >;
      for (const [col, field] of pairs) std[field] = normalizeValue(field, row.values[col] ?? "");
      if (!std.company && f.companyOverride) std.company = f.companyOverride;
      out.push({
        key: `${f.id}-${row.rowNo}`,
        fileId: f.id,
        fileName: f.name,
        filePath: f.path,
        rowNo: row.rowNo,
        raw: row.values,
        std,
      });
    }
  }
  return out;
}
