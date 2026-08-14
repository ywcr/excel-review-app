import type { WorkerResponse } from "../workers/excel.worker";
import type { ParsedFile, StandardField } from "./types";
import { STANDARD_FIELDS, FIELD_LABELS } from "./types";

const GUESS: Record<StandardField, string[]> = {
  company: ["公司", "单位", "企业", "所属公司", "company"],
  name: ["姓名", "名字", "员工姓名", "人员姓名", "name"],
  idCard: ["身份证", "证件号", "身份证号码", "idcard", "id"],
  phone: ["手机", "电话", "联系方式", "手机号码", "phone", "mobile"],
  empNo: ["工号", "员工编号", "编号", "工号id"],
  department: ["部门", "科室", "所属部门", "dept"],
  gender: ["性别", "gender", "sex"],
  birthDate: ["出生", "生日", "出生日期", "birth"],
  remark: ["备注", "说明", "remark", "note"],
};

export function guessMapping(headers: string[]): Record<string, StandardField | ""> {
  const map: Record<string, StandardField | ""> = {};
  const used = new Set<StandardField>();
  for (const h of headers) {
    const low = h.toLowerCase().replace(/\s/g, "");
    let hit: StandardField | "" = "";
    for (const f of STANDARD_FIELDS) {
      if (used.has(f)) continue;
      if (GUESS[f].some((k) => low.includes(k.toLowerCase()))) {
        hit = f;
        break;
      }
    }
    if (hit) used.add(hit);
    map[h] = hit;
  }
  return map;
}

export const fieldOptions = STANDARD_FIELDS.map((f) => ({ value: f, label: FIELD_LABELS[f] }));

/** 有限并发的 Web Worker 解析队列 */
export async function parseFiles(
  items: { id: string; file: File }[],
  onDone: (id: string, result: Partial<ParsedFile>) => void,
  concurrency = 3,
) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length || 1) }, () => {
    return new Worker(new URL("../workers/excel.worker.ts", import.meta.url), { type: "module" });
  });

  await Promise.all(
    workers.map(
      (worker) =>
        new Promise<void>((resolve) => {
          const next = async () => {
            const item = items[cursor++];
            if (!item) {
              worker.terminate();
              resolve();
              return;
            }
            try {
              const buffer = await item.file.arrayBuffer();
              worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
                const r = e.data;
                if (r.ok) {
                  const headers = r.headers ?? [];
                  onDone(item.id, {
                    status: "parsed",
                    sheetName: r.sheetName ?? "",
                    headers,
                    rows: r.rows ?? [],
                    mapping: guessMapping(headers),
                  });
                } else {
                  onDone(item.id, { status: "error", error: r.error ?? "解析失败" });
                }
                void next();
              };
              worker.postMessage({ id: item.id, buffer }, [buffer]);
            } catch (err) {
              onDone(item.id, {
                status: "error",
                error: err instanceof Error ? err.message : "读取失败",
              });
              void next();
            }
          };
          void next();
        }),
    ),
  );
}

export const isExcel = (name: string) => /\.(xlsx|xls)$/i.test(name);

/** 递归扫描文件夹（File System Access API） */
export async function pickDirectory(): Promise<{ file: File; path: string }[]> {
  const w = window as unknown as {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  };
  if (!w.showDirectoryPicker) throw new Error("当前浏览器不支持选择文件夹");
  const dir = await w.showDirectoryPicker();
  const out: { file: File; path: string }[] = [];
  const walk = async (handle: FileSystemDirectoryHandle, prefix: string) => {
    for await (const [name, child] of (handle as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) {
      const h = child as FileSystemHandle;
      const path = prefix ? `${prefix}/${name}` : name;
      if (h.kind === "file") {
        if (!isExcel(name) || name.startsWith("~$")) continue;
        out.push({ file: await (h as FileSystemFileHandle).getFile(), path });
      } else {
        await walk(h as FileSystemDirectoryHandle, path);
      }
    }
  };
  await walk(dir, "");
  return out;
}

export const supportsDirectory = () =>
  typeof window !== "undefined" && "showDirectoryPicker" in window;
