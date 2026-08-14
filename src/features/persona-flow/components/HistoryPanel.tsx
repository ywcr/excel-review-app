import { useEffect, useRef, useState } from "react";
import { Database, Download, Upload, Trash2 } from "lucide-react";
import { Button } from "@/features/persona-flow/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/persona-flow/components/ui/card";
import { addHistory, clearHistory, exportBackup, historyStats, importBackup } from "@/features/persona-flow/lib/db";
import { mockHistory } from "@/features/persona-flow/lib/mock";
import { downloadText } from "@/features/persona-flow/lib/export";
import { toast } from "sonner";

export function HistoryPanel({ version, onChange }: { version: number; onChange: () => void }) {
  const [stats, setStats] = useState({ total: 0, companies: 0, withId: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    historyStats().then(setStats).catch(() => undefined);
  }, [version]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" />
          本地历史人员库（仅存储于本机浏览器）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Info label="历史人员数" value={stats.total} />
          <Info label="覆盖公司数" value={stats.companies} />
          <Info label="含身份证号" value={stats.withId} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              await addHistory(mockHistory);
              onChange();
              toast.success("已初始化示例历史总库");
            }}
          >
            初始化示例历史总库
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              downloadText(await exportBackup(), `历史库备份-${Date.now()}.roster.json`);
              toast.success("备份已导出");
            }}
          >
            <Download className="mr-1 h-4 w-4" />
            导出备份
          </Button>
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />
            导入备份（覆盖）
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".json,.roster.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const n = await importBackup(await f.text(), "replace");
                onChange();
                toast.success(`已恢复 ${n} 条历史记录`);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={async () => {
              if (!confirm("确定清空本地历史库？此操作不可恢复。")) return;
              await clearHistory();
              onChange();
              toast.success("历史库已清空");
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            清空历史库
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
