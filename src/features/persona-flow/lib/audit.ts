import type { HistoryPerson } from "./db";
import { isValidIdCard, isValidPhone } from "./normalize";
import type { AuditResult, AuditStatus, PersonRecord, RuleConfig } from "./types";

interface Seen {
  person: PersonRecord;
}

function label(p: PersonRecord) {
  return `${p.fileName} 第${p.rowNo}行${p.std.company ? `（${p.std.company}）` : ""}`;
}

function historyLabel(h: HistoryPerson) {
  return `历史库：${h.company || "未知公司"}${h.sourceFile ? ` / ${h.sourceFile}` : ""}`;
}

export function runAudit(
  persons: PersonRecord[],
  history: HistoryPerson[],
  rules: RuleConfig,
): AuditResult[] {
  const byId = new Map<string, Seen[]>();
  const byNamePhone = new Map<string, Seen[]>();
  const byName = new Map<string, Seen[]>();

  const hById = new Map<string, HistoryPerson[]>();
  const hByNamePhone = new Map<string, HistoryPerson[]>();
  const hByName = new Map<string, HistoryPerson[]>();
  const push = <T>(m: Map<string, T[]>, k: string, v: T) => {
    if (!k) return;
    const arr = m.get(k);
    if (arr) arr.push(v);
    else m.set(k, [v]);
  };

  for (const h of history) {
    push(hById, h.idCard, h);
    if (h.name && h.phone) push(hByNamePhone, `${h.name}|${h.phone}`, h);
    push(hByName, h.name, h);
  }

  const results: AuditResult[] = [];

  for (const p of persons) {
    const s = p.std;
    const ruleHits: string[] = [];
    const conflicts: string[] = [];
    let status: AuditStatus = "new";
    let remark = "";

    // 1. 数据异常
    const problems: string[] = [];
    if (!s.name) problems.push("姓名缺失");
    if (rules.validateFormats) {
      if (s.idCard && !isValidIdCard(s.idCard)) problems.push("身份证号格式异常");
      if (s.phone && !isValidPhone(s.phone)) problems.push("手机号格式异常");
    }
    if (!s.idCard && !s.phone) problems.push("身份证号与手机号均缺失");

    if (problems.length && (!s.name || problems.some((x) => x.includes("格式")))) {
      status = "invalid";
      ruleHits.push(...problems);
      remark = problems.join("；");
    }

    const namePhoneKey = s.name && s.phone ? `${s.name}|${s.phone}` : "";

    const classify = (
      batch: Seen[] | undefined,
      hist: HistoryPerson[] | undefined,
      rule: string,
      strong: boolean,
    ): AuditStatus | null => {
      let out: AuditStatus | null = null;
      if (batch?.length) {
        const sameFile = batch.filter((b) => b.person.fileId === p.fileId);
        const other = batch.filter((b) => b.person.fileId !== p.fileId);
        if (sameFile.length) {
          out = strong ? "dup_in_file" : "suspect";
          conflicts.push(...sameFile.map((b) => label(b.person)));
        } else if (other.length) {
          out = strong ? "dup_cross_file" : "suspect";
          conflicts.push(...other.map((b) => label(b.person)));
        }
      }
      if (!out && hist?.length) {
        const sameCompany = hist.filter((h) => h.company && h.company === s.company);
        const target = sameCompany.length ? sameCompany : hist;
        out = strong ? (sameCompany.length ? "dup_same_company" : "dup_history") : "suspect";
        conflicts.push(...target.map(historyLabel));
      }
      if (out) ruleHits.push(rule);
      return out;
    };

    if (status !== "invalid") {
      let r: AuditStatus | null = null;
      if (s.idCard) r = classify(byId.get(s.idCard), hById.get(s.idCard), "身份证号相同", true);
      if (!r && namePhoneKey) {
        r = classify(
          byNamePhone.get(namePhoneKey),
          hByNamePhone.get(namePhoneKey),
          "姓名+手机号相同",
          rules.namePhoneAsDuplicate,
        );
      }
      if (!r && rules.nameOnlySuspect && s.name && !s.idCard) {
        r = classify(byName.get(s.name), hByName.get(s.name), "仅姓名相同", false);
      }
      if (r) {
        status = r;
        remark = ruleHits.join("；");
      } else if (problems.length) {
        remark = problems.join("；");
      }
    }

    results.push({ person: p, status, rules: ruleHits, conflicts, remark });

    push(byId, s.idCard, { person: p });
    if (namePhoneKey) push(byNamePhone, namePhoneKey, { person: p });
    push(byName, s.name, { person: p });
  }

  return results;
}

export function summarize(results: AuditResult[]) {
  const counts: Record<string, number> = {};
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}
