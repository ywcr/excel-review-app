import { Button } from "@/features/persona-flow/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/persona-flow/components/ui/card";
import { Input } from "@/features/persona-flow/components/ui/input";
import { Label } from "@/features/persona-flow/components/ui/label";
import { Switch } from "@/features/persona-flow/components/ui/switch";
import { guessMapping } from "@/features/persona-flow/lib/excel";
import { FIELD_LABELS, STANDARD_FIELDS, type ParsedFile, type RuleConfig, type StandardField } from "@/features/persona-flow/lib/types";
import { toast } from "sonner";

export function MappingStep({
  files,
  setFiles,
  rules,
  setRules,
  onBack,
  onNext,
}: {
  files: ParsedFile[];
  setFiles: React.Dispatch<React.SetStateAction<ParsedFile[]>>;
  rules: RuleConfig;
  setRules: (r: RuleConfig) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const parsed = files.filter((f) => f.status === "parsed");

  const setMapping = (fileId: string, col: string, field: StandardField | "") =>
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, mapping: { ...f.mapping, [col]: field } } : f)),
    );

  const applyToAll = (source: ParsedFile) =>
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === source.id || f.status !== "parsed") return f;
        const mapping = { ...f.mapping };
        for (const col of f.headers) {
          if (source.mapping[col]) mapping[col] = source.mapping[col];
        }
        return { ...f, mapping };
      }),
    );

  const missingName = parsed.filter((f) => !Object.values(f.mapping).includes("name"));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>查重规则配置</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <label className="flex items-center justify-between gap-3 rounded-md border p-3">
            <span className="text-sm">姓名+手机号视为确定重复</span>
            <Switch
              checked={rules.namePhoneAsDuplicate}
              onCheckedChange={(v) => setRules({ ...rules, namePhoneAsDuplicate: v })}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-md border p-3">
            <span className="text-sm">仅姓名相同标记疑似重复</span>
            <Switch
              checked={rules.nameOnlySuspect}
              onCheckedChange={(v) => setRules({ ...rules, nameOnlySuspect: v })}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-md border p-3">
            <span className="text-sm">校验身份证/手机号格式</span>
            <Switch
              checked={rules.validateFormats}
              onCheckedChange={(v) => setRules({ ...rules, validateFormats: v })}
            />
          </label>
        </CardContent>
      </Card>

      {parsed.map((f) => (
        <Card key={f.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{f.name}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {f.path} · 工作表 {f.sheetName} · {f.rows.length} 行
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setFiles((prev) =>
                    prev.map((x) =>
                      x.id === f.id ? { ...x, mapping: guessMapping(x.headers) } : x,
                    ),
                  )
                }
              >
                重新自动猜测
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  applyToAll(f);
                  toast.success("已应用到其他文件的同名列");
                }}
              >
                应用到全部文件
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {f.headers.map((col) => (
                <div key={col} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    原列：{col}
                    <span className="ml-1 text-muted-foreground/60">
                      示例 {f.rows[0]?.values[col] || "—"}
                    </span>
                  </Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={f.mapping[col] ?? ""}
                    onChange={(e) => setMapping(f.id, col, e.target.value as StandardField | "")}
                  >
                    <option value="">（忽略）</option>
                    {STANDARD_FIELDS.map((s) => (
                      <option key={s} value={s}>
                        {FIELD_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                公司名称缺省值
              </Label>
              <Input
                className="h-9 max-w-xs"
                placeholder="当表中无公司列时使用"
                value={f.companyOverride ?? ""}
                onChange={(e) =>
                  setFiles((prev) =>
                    prev.map((x) => (x.id === f.id ? { ...x, companyOverride: e.target.value } : x)),
                  )
                }
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {missingName.length > 0 && (
        <p className="text-sm text-destructive">
          以下文件尚未映射「姓名」：{missingName.map((f) => f.name).join("、")}
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <Button disabled={!parsed.length || missingName.length > 0} onClick={onNext}>
          下一步：开始审核
        </Button>
      </div>
    </div>
  );
}
