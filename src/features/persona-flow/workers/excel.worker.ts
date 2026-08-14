/// <reference lib="webworker" />
import * as XLSX from "xlsx";

export interface WorkerRequest {
  id: string;
  buffer: ArrayBuffer;
}

export interface WorkerResponse {
  id: string;
  ok: boolean;
  error?: string;
  sheetName?: string;
  headers?: string[];
  rows?: { rowNo: number; values: Record<string, string> }[];
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, buffer } = e.data;
  try {
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error("文件中没有工作表");
    const ws = wb.Sheets[sheetName]!;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      blankrows: false,
      raw: false,
      defval: "",
    });
    const headerIdx = matrix.findIndex((r) => r.filter((c) => String(c ?? "").trim()).length >= 2);
    if (headerIdx < 0) throw new Error("未识别到表头");
    const headers = (matrix[headerIdx] as unknown[]).map((h, i) =>
      String(h ?? "").trim() ? String(h).trim() : `列${i + 1}`,
    );
    const rows: { rowNo: number; values: Record<string, string> }[] = [];
    for (let i = headerIdx + 1; i < matrix.length; i++) {
      const row = matrix[i] as unknown[];
      const values: Record<string, string> = {};
      let has = false;
      headers.forEach((h, idx) => {
        const v = String(row?.[idx] ?? "").trim();
        values[h] = v;
        if (v) has = true;
      });
      if (has) rows.push({ rowNo: i + 1, values });
    }
    const res: WorkerResponse = { id, ok: true, sheetName, headers, rows };
    self.postMessage(res);
  } catch (err) {
    const res: WorkerResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : "解析失败",
    };
    self.postMessage(res);
  }
};
