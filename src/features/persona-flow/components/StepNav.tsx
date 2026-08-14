import { cn } from "@/lib/utils";

export const STEPS = ["导入文件", "字段映射", "开始审核", "查看结果", "导出/入库"] as const;

export function StepNav({
  current,
  onSelect,
  maxReached,
}: {
  current: number;
  onSelect: (i: number) => void;
  maxReached: number;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-1 text-sm">
      {STEPS.map((s, i) => {
        const disabled = i > maxReached;
        return (
          <li key={s} className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(i)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors",
                i === current
                  ? "bg-primary text-primary-foreground"
                  : disabled
                    ? "text-muted-foreground/50"
                    : "text-foreground hover:bg-accent",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-xs",
                  i === current ? "border-primary-foreground/50" : "border-border",
                )}
              >
                {i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && <span className="text-muted-foreground/40">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
