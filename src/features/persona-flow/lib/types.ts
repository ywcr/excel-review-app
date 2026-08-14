export const STANDARD_FIELDS = [
  "company",
  "name",
  "idCard",
  "phone",
  "empNo",
  "department",
  "gender",
  "birthDate",
  "remark",
] as const;

export type StandardField = (typeof STANDARD_FIELDS)[number];

export const FIELD_LABELS: Record<StandardField, string> = {
  company: "公司名称",
  name: "姓名",
  idCard: "身份证号",
  phone: "手机号",
  empNo: "工号",
  department: "部门",
  gender: "性别",
  birthDate: "出生日期",
  remark: "备注",
};

export const REQUIRED_FIELDS: StandardField[] = ["name"];

export type FileStatus = "pending" | "parsing" | "parsed" | "error";

export interface RawRow {
  rowNo: number;
  values: Record<string, string>;
}

export interface ParsedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  status: FileStatus;
  sheetName?: string;
  headers: string[];
  rows: RawRow[];
  error?: string;
  /** 列名 -> 标准字段 */
  mapping: Record<string, StandardField | "">;
  companyOverride?: string;
}

export interface PersonRecord {
  key: string;
  fileId: string;
  fileName: string;
  filePath: string;
  rowNo: number;
  raw: Record<string, string>;
  std: Record<StandardField, string>;
}

export type AuditStatus =
  | "new"
  | "dup_in_file"
  | "dup_cross_file"
  | "dup_history"
  | "dup_same_company"
  | "suspect"
  | "invalid";

export const STATUS_LABELS: Record<AuditStatus, string> = {
  new: "正常新增",
  dup_in_file: "文件内重复",
  dup_cross_file: "本批跨文件重复",
  dup_history: "历史库跨公司重复",
  dup_same_company: "当前公司已存在",
  suspect: "疑似重复",
  invalid: "数据异常",
};

export interface AuditResult {
  person: PersonRecord;
  status: AuditStatus;
  rules: string[];
  conflicts: string[];
  remark: string;
}

export interface RuleConfig {
  /** 姓名+手机号是否视为确定重复 */
  namePhoneAsDuplicate: boolean;
  /** 仅姓名相同是否标记疑似 */
  nameOnlySuspect: boolean;
  /** 校验身份证/手机号格式 */
  validateFormats: boolean;
}

export const DEFAULT_RULES: RuleConfig = {
  namePhoneAsDuplicate: false,
  nameOnlySuspect: true,
  validateFormats: true,
};
