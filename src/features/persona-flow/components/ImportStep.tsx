import { useRef, useState } from "react";
import { FolderOpen, Upload, RotateCcw, Trash2, X, FlaskConical } from "lucide-react";
import { Button } from "@/features/persona-flow/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/persona-flow/components/ui/card";
import { cn } from "@/lib/utils";
import { isExcel, parseFiles, pickDirectory, supportsDirectory } from "@/features/persona-flow/lib/excel";
import { mockFiles } from "@/features/persona-flow/lib/mock";
import type { ParsedFile } from "@/features/persona-flow/lib/types";
import { toast } from "sonner";

const STATUS_TEXT: Record<ParsedFile["status"], string> = {
  pending: "等待解析",
  parsing: "解析中…",
  parsed: "解析完成",
  error: "解析失败",
};

export function ImportStep({
  files,
  setFiles,
  onNext,
}: {
  files: ParsedFile[];
  setFiles: React.Dispatch<React.SetStateAction<ParsedFile[]>>;
  onNext: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const sourcesRef = useRef(new Map<string, File>());

  const ingest = async (entries: { file: File; path: string }[]) => {
    const valid = entries.filter((e) => isExcel(e.file.name) && !e.file.name.startsWith("~$"));
    if (!valid.length) {
      toast.error("未找到 .xlsx / .xls 文件");
      return;
    }
    const items = valid.map((e) => {
      const id = crypto.randomUUID();
      sourcesRef.current.set(id, e.file);
      return { id, file: e.file, path: e.path };
    });
    setFiles((prev) => [
      ...prev,
      ...items.map<ParsedFile>((it) => ({
        id: it.id,
        name: it.file.name,
        path: it.path,
        size: it.file.size,
        status: "parsing",
        headers: [],
        rows: [],
        mapping: {},
      })),
    ]);
    setBusy(true);
    await parseFiles(
      items.map((i) => ({ id: i.id, file: i.file })),
      (id, patch) => setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f))),
      3,
    );
    setBusy(false);
    toast.success(`已解析 ${items.length} 个文件`);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const list = Array.from(e.dataTransfer.files).map((file) => ({ file, path: file.name }));
    await ingest(list);
  };

  const reparse = async (f: ParsedFile) => {
    const src = sourcesRef.current.get(f.id);
    if (!src) {
      toast.error("示例数据无需重新解析");
      return;
    }
    setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, status: "parsing" } : x)));
    await parseFiles([{ id: f.id, file: src }], (id, patch) =>
      setFiles((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    );
  };

  const parsedCount = files.filter((f) => f.status === "parsed").length;

  const selectFolder = async () => {
    if (supportsDirectory()) {
      try {
        const entries = await pickDirectory();
        await ingest(entries);
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        toast.info("已切换到兼容模式选择文件夹");
      }
    }

    folderInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>导入 Excel 文件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border bg-surface",
            )}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">将多个 Excel 文件拖拽到此处</p>
              <p className="mt-1 text-sm text-muted-foreground">
                支持 .xlsx / .xls，解析全部在本机浏览器完成，原始数据不会上传
              </p>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button onClick={() => inputRef.current?.click()} disabled={busy}>
                选择文件
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={selectFolder}
              >
                <FolderOpen className="mr-1 h-4 w-4" />
                选择文件夹
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setFiles((prev) => [...prev, ...mockFiles()]);
                  toast.success("已载入示例数据");
                }}
              >
                <FlaskConical className="mr-1 h-4 w-4" />
                载入示例数据
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              hidden
              onChange={async (e) => {
                const list = Array.from(e.target.files ?? []).map((file) => ({
                  file,
                  path: file.webkitRelativePath || file.name,
                }));
                e.target.value = "";
                await ingest(list);
              }}
            />
            <input
              ref={(node) => {
                folderInputRef.current = node;
                if (node) node.webkitdirectory = true;
              }}
              type="file"
              accept=".xlsx,.xls"
              multiple
              hidden
              onChange={async (e) => {
                const list = Array.from(e.target.files ?? []).map((file) => ({
                  file,
                  path: file.webkitRelativePath || file.name,
                }));
                e.target.value = "";
                await ingest(list);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            文件列表{" "}
            <span className="text-sm font-normal text-muted-foreground">
              共 {files.length} 个，已解析 {parsedCount} 个
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            disabled={!files.length}
            onClick={() => setFiles([])}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            清空
          </Button>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">尚未导入任何文件</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-surface text-left text-muted-foreground">
                  <tr>
                    <th className="p-2 font-medium">文件名</th>
                    <th className="p-2 font-medium">相对路径</th>
                    <th className="p-2 font-medium">状态</th>
                    <th className="p-2 text-right font-medium">行数</th>
                    <th className="p-2 font-medium">失败原因</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id} className="border-b last:border-0">
                      <td className="p-2 font-medium">{f.name}</td>
                      <td className="p-2 text-muted-foreground">{f.path}</td>
                      <td className="p-2">
                        <span
                          className={cn(
                            f.status === "error" && "text-destructive",
                            f.status === "parsed" && "text-success",
                          )}
                        >
                          {STATUS_TEXT[f.status]}
                        </span>
                      </td>
                      <td className="p-2 text-right tabular-nums">{f.rows.length}</td>
                      <td className="p-2 text-destructive">{f.error ?? ""}</td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => reparse(f)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={!parsedCount} onClick={onNext}>
          下一步：字段映射
        </Button>
      </div>
    </div>
  );
}
