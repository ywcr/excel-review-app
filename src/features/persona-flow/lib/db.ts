import Dexie, { type Table } from "dexie";

export interface HistoryPerson {
  id?: number;
  company: string;
  name: string;
  idCard: string;
  phone: string;
  empNo: string;
  department: string;
  sourceFile: string;
  addedAt: number;
}

class RosterDB extends Dexie {
  people!: Table<HistoryPerson, number>;

  constructor() {
    super("roster-audit-db");
    this.version(1).stores({
      people: "++id, company, name, idCard, phone, addedAt",
    });
  }
}

let _db: RosterDB | null = null;
export function db(): RosterDB {
  if (!_db) _db = new RosterDB();
  return _db;
}

export async function allHistory() {
  return db().people.toArray();
}

export async function addHistory(rows: HistoryPerson[]) {
  if (!rows.length) return 0;
  await db().people.bulkAdd(rows);
  return rows.length;
}

export async function clearHistory() {
  await db().people.clear();
}

export async function historyStats() {
  const rows = await allHistory();
  const companies = new Set(rows.map((r) => r.company).filter(Boolean));
  const withId = rows.filter((r) => r.idCard).length;
  return { total: rows.length, companies: companies.size, withId };
}

export async function exportBackup() {
  const rows = await allHistory();
  return JSON.stringify({ version: 1, exportedAt: Date.now(), people: rows }, null, 2);
}

export async function importBackup(text: string, mode: "merge" | "replace") {
  const data = JSON.parse(text) as { people?: HistoryPerson[] };
  if (!Array.isArray(data.people)) throw new Error("备份文件格式不正确");
  if (mode === "replace") await clearHistory();
  const rows = data.people.map(({ id: _id, ...rest }) => rest);
  await db().people.bulkAdd(rows as HistoryPerson[]);
  return rows.length;
}
