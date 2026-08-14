import { guessMapping } from "./excel";
import type { ParsedFile, RawRow } from "./types";

function rows(headers: string[], data: string[][]): RawRow[] {
  return data.map((d, i) => ({
    rowNo: i + 2,
    values: Object.fromEntries(headers.map((h, idx) => [h, d[idx] ?? ""])),
  }));
}

export function mockFiles(): ParsedFile[] {
  const h1 = ["公司名称", "姓名", "身份证号", "手机号", "工号", "部门"];
  const d1 = [
    ["星海科技有限公司", "张 伟", "110101199003071954", "138 0013 8000", "A001", "研发部"],
    ["星海科技有限公司", "李娜", "310101199204152627", "+8613900139001", "A002", "市场部"],
    ["星海科技有限公司", "张伟", "110101199003071954", "13800138000", "A003", "研发部"],
    ["星海科技有限公司", "王强", "12345", "13700137000", "A004", "运营部"],
    ["星海科技有限公司", "", "44010119880101987X", "13600136000", "A005", "行政部"],
  ];

  const h2 = ["单位", "员工姓名", "证件号码", "联系电话", "员工编号", "所属部门", "备注"];
  const d2 = [
    ["蓝湾实业集团", "李娜", "310101199204152627", "13900139001", "B001", "销售部", "外派"],
    ["蓝湾实业集团", "赵敏", "330101199510203043", "13500135000", "B002", "财务部", ""],
    ["蓝湾实业集团", "陈昊", "", "1390013", "B003", "客服部", "手机号疑似缺位"],
    ["蓝湾实业集团", "孙磊", "", "13400134000", "B004", "仓储部", ""],
  ];

  const h3 = ["公司", "姓名", "身份证", "手机", "性别", "出生日期"];
  const d3 = [
    ["恒通物流有限公司", "周洋", "500101199711113353", "13300133000", "男", "1997-11-11"],
    ["恒通物流有限公司", "吴倩", "", "13200132000", "女", "1995-02-08"],
    ["恒通物流有限公司", "赵敏", "", "13100131000", "女", "1995-10-20"],
  ];

  const make = (name: string, path: string, headers: string[], data: string[][]): ParsedFile => ({
    id: crypto.randomUUID(),
    name,
    path,
    size: data.length * 512,
    status: "parsed",
    sheetName: "Sheet1",
    headers,
    rows: rows(headers, data),
    mapping: guessMapping(headers),
  });

  return [
    make("星海科技-在职名单.xlsx", "示例数据/星海科技-在职名单.xlsx", h1, d1),
    make("蓝湾实业-人员表.xlsx", "示例数据/蓝湾实业-人员表.xlsx", h2, d2),
    make("恒通物流-花名册.xlsx", "示例数据/分公司/恒通物流-花名册.xlsx", h3, d3),
  ];
}

export const mockHistory = [
  {
    company: "星海科技有限公司",
    name: "李娜",
    idCard: "310101199204152627",
    phone: "13900139001",
    empNo: "H001",
    department: "市场部",
    sourceFile: "历史总库",
    addedAt: Date.now(),
  },
  {
    company: "远景建设集团",
    name: "周洋",
    idCard: "500101199711113353",
    phone: "13300133000",
    empNo: "H002",
    department: "工程部",
    sourceFile: "历史总库",
    addedAt: Date.now(),
  },
];
