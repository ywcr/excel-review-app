import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Eye, EyeOff } from "lucide-react";
import { Button } from "@/features/persona-flow/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/persona-flow/components/ui/card";
import { Input } from "@/features/persona-flow/components/ui/input";
import { StatusBadge } from "@/features/persona-flow/components/StatusBadge";
import { maskId, maskPhone } from "@/features/persona-flow/lib/normalize";
import { STATUS_LABELS, type AuditResult, type AuditStatus } from "@/features/persona-flow/lib/types";
import { exportAuditWorkbook } from "@/features/persona-flow/lib/export";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ORDER: AuditStatus[] = [
  "new",
  "dup_same_company",
  "dup_in_file",
  "dup_cross_file",
  "dup_history",
  "suspect",
  "invalid",
];

export function ResultsStep({
  results,
  fileCount,
  onBack,
  onAddToHistory,
}: {
  results: AuditResult[];
  fileCount: number;
  onBack: () => void;
  onAddToHistory: () => void;
}) {
  const [status, setStatus] = useState<AuditStatus | "all">("all");
  const [file, setFile] = useState("all");
  const [company, setCompany] = useState("all");
  const [q, setQ] = useState("");
  const [reveal, setReveal] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of results) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [results]);

  const files = useMemo(
    () => Array.from(new Set(results.map((r) => r.person.fileName))),
    [results],
  );
  const companies = useMemo(
    () => Array.from(new Set(results.map((r) => r.person.std.company).filter(Boolean))),
    [results],
  );

  const filtered = results.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (file !== "all" && r.person.fileName !== file) return false;
    if (company !== "all" && r.person.std.company !== company) return false;
    if (q) {
      const hay = Object.values(r.person.std).join(" ") + r.person.fileName;
      if (!hay.toLowerCase().includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat label="文件总数" value={fileCount} />
        <Stat label="人员总数" value={results.length} />
        {ORDER.map((s) => (
          <Stat key={s} label={STATUS_LABELS[s]} value={counts[s] ?? 0} />
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">明细（{filtered.length} 条）</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-9 w-52"
              placeholder="搜索姓名/证件/手机号"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select value={status} onChange={(v) => setStatus(v as AuditStatus | "all")}>
              <option value="all">全部状态</option>
              {ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
            <Select value={file} onChange={setFile}>
              <option value="all">全部文件</option>
              {files.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
            <Select value={company} onChange={setCompany}>
              <option value="all">全部公司</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Button variant="outline" size="sm" onClick={() => setReveal((v) => !v)}>
              {reveal ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
              {reveal ? "脱敏显示" : "显示明文"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-surface text-left text-muted-foreground">
                <tr>
                  <th className="w-8 p-2" />
                  <th className="p-2 font-medium">来源文件</th>
                  <th className="p-2 font-medium">行号</th>
                  <th className="p-2 font-medium">公司</th>
                  <th className="p-2 font-medium">姓名</th>
                  <th className="p-2 font-medium">身份证号</th>
                  <th className="p-2 font-medium">手机号</th>
                  <th className="p-2 font-medium">状态</th>
                  <th className="p-2 font-medium">命中规则</th>
                  <th className="p-2 font-medium">冲突来源</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const p = r.person;
                  const expanded = open === p.key;
                  return (
                    <Fragment key={p.key}>
                      <tr
                        className={cn("border-b hover:bg-accent/40", expanded && "bg-accent/30")}
                      >
                        <td className="p-2">
                          <button onClick={() => setOpen(expanded ? null : p.key)}>
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-2">{p.fileName}</td>
                        <td className="p-2 tabular-nums">{p.rowNo}</td>
                        <td className="p-2">{p.std.company || "—"}</td>
                        <td className="p-2 font-medium">{p.std.name || "—"}</td>
                        <td className="p-2 font-mono text-xs">
                          {reveal ? p.std.idCard || "—" : maskId(p.std.idCard) || "—"}
                        </td>
                        <td className="p-2 font-mono text-xs">
                          {reveal ? p.std.phone || "—" : maskPhone(p.std.phone) || "—"}
                        </td>
                        <td className="p-2">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {r.rules.join("；") || "—"}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {r.conflicts.join("；") || "—"}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b bg-surface">
                          <td colSpan={10} className="p-3">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="mb-1 text-xs font-medium text-muted-foreground">
                                  原始数据
                                </p>
                                <pre className="overflow-x-auto rounded border bg-background p-2 text-xs">
                                  {JSON.stringify(p.raw, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="mb-1 text-xs font-medium text-muted-foreground">
                                  标准化数据
                                </p>
                                <pre className="overflow-x-auto rounded border bg-background p-2 text-xs">
                                  {JSON.stringify(p.std, null, 2)}
                                </pre>
                              </div>
                            </div>
                            {r.remark && <p className="mt-2 text-xs">备注：{r.remark}</p>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      无匹配数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!results.length}
            onClick={() => {
              exportAuditWorkbook(results);
              toast.success("审核结果已导出");
            }}
          >
            <Download className="mr-1 h-4 w-4" />
            导出审核结果 Excel
          </Button>
          <Button disabled={!counts["new"]} onClick={onAddToHistory}>
            将正常新增（{counts["new"] ?? 0}）加入历史库
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}
