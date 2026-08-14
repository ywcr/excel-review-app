import * as XLSX from "xlsx";
import type { AuditResult, AuditStatus } from "./types";
import { FIELD_LABELS, STANDARD_FIELDS, STATUS_LABELS } from "./types";

function toRow(r: AuditResult) {
  const base: Record<string, string | number> = {
    来源文件: r.person.fileName,
    相对路径: r.person.filePath,
    来源行号: r.person.rowNo,
  };
  for (const f of STANDARD_FIELDS) base[FIELD_LABELS[f]] = r.person.std[f] ?? "";
  base["状态"] = STATUS_LABELS[r.status];
  base["命中规则"] = r.rules.join("；");
  base["冲突来源"] = r.conflicts.join("；");
  base["备注"] = r.remark;
  return base;
}

const SHEETS: { name: string; filter: (r: AuditResult) => boolean }[] = [
  { name: "全部人员", filter: () => true },
  {
    name: "确定重复",
    filter: (r) =>
      (["dup_in_file", "dup_cross_file", "dup_history", "dup_same_company"] as AuditStatus[]).includes(
        r.status,
      ),
  },
  { name: "跨文件重复", filter: (r) => r.status === "dup_cross_file" },
  { name: "历史库重复", filter: (r) => r.status === "dup_history" || r.status === "dup_same_company" },
  { name: "疑似重复", filter: (r) => r.status === "suspect" },
  { name: "数据异常", filter: (r) => r.status === "invalid" },
  { name: "正常新增", filter: (r) => r.status === "new" },
];

export function exportAuditWorkbook(results: AuditResult[], fileName = "人员审核结果.xlsx") {
  const wb = XLSX.utils.book_new();
  for (const s of SHEETS) {
    const rows = results.filter(s.filter).map(toRow);
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 说明: "无数据" }]);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }
  XLSX.writeFile(wb, fileName);
}

export function downloadText(text: string, fileName: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
