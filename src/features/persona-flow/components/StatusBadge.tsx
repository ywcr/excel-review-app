import { cn } from "@/lib/utils";
import { STATUS_LABELS, type AuditStatus } from "@/features/persona-flow/lib/types";

const TONE: Record<AuditStatus, string> = {
  new: "bg-success/12 text-success border-success/30",
  dup_in_file: "bg-destructive/12 text-destructive border-destructive/30",
  dup_cross_file: "bg-destructive/12 text-destructive border-destructive/30",
  dup_history: "bg-destructive/12 text-destructive border-destructive/30",
  dup_same_company: "bg-info/12 text-info border-info/30",
  suspect: "bg-warning/18 text-warning border-warning/40",
  invalid: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: AuditStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium",
        TONE[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
