import type { StandardField } from "./types";

const trimAll = (v: string) => v.replace(/\u3000/g, " ").replace(/\s+/g, " ").trim();

export function normalizeName(v: string) {
  // 姓名内部空格归一（去掉中文姓名中的分隔空格）
  const t = trimAll(v);
  return /^[\u4e00-\u9fa5\s·]+$/.test(t) ? t.replace(/\s+/g, "") : t;
}

export function normalizePhone(v: string) {
  let t = trimAll(v).replace(/[\s\-()（）]/g, "");
  t = t.replace(/^\+?86/, "");
  return t;
}

export function normalizeIdCard(v: string) {
  return trimAll(v).replace(/\s/g, "").toUpperCase();
}

export function normalizeValue(field: StandardField, value: string): string {
  const v = value ?? "";
  switch (field) {
    case "name":
      return normalizeName(v);
    case "phone":
      return normalizePhone(v);
    case "idCard":
      return normalizeIdCard(v);
    default:
      return trimAll(v);
  }
}

export const isValidPhone = (v: string) => /^1[3-9]\d{9}$/.test(v);

export function isValidIdCard(v: string) {
  if (!/^\d{17}[\dX]$/.test(v)) return false;
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const codes = "10X98765432";
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(v[i]) * w[i]!;
  return codes[sum % 11] === v[17];
}

export function maskId(v: string) {
  if (!v) return "";
  if (v.length <= 8) return v.replace(/.(?=.{2})/g, "*");
  return v.slice(0, 4) + "**********" + v.slice(-4);
}

export function maskPhone(v: string) {
  if (!v) return "";
  if (v.length < 7) return v;
  return v.slice(0, 3) + "****" + v.slice(-4);
}
