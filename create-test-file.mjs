import XLSX from "xlsx";
import path from "path";

// Create test data for 药店拜访 using template format
const testData = [
  // Header row matching template format
  [
    "序号",
    "任务标题",
    "实施人",
    "对接人",
    "零售渠道",
    "渠道地址",
    "拜访开始时间",
    "拜访时长",
    "拜访事项（1）",
    "信息反馈（1）",
    "拜访事项（2）",
    "信息反馈（2）",
    "门头",
    "内部",
  ],

  // Valid data
  [
    1,
    "产品推广",
    "李四",
    "张三",
    "康美药店",
    "北京市朝阳区",
    "2024-01-01",
    "90",
    "产品介绍",
    "客户感兴趣",
    "",
    "",
    "是",
    "否",
  ],
  [
    2,
    "市场调研",
    "李四",
    "王五",
    "健康药房",
    "北京市海淀区",
    "2024-01-02",
    "75",
    "市场调研",
    "配合度高",
    "",
    "",
    "是",
    "否",
  ],
  [
    3,
    "产品推广",
    "张七",
    "赵六",
    "民生药店",
    "北京市西城区",
    "2024-01-01",
    "120",
    "产品推广",
    "有购买意向",
    "",
    "",
    "是",
    "否",
  ],

  // Error cases for testing
  [
    4,
    "重复拜访",
    "李四",
    "张三",
    "康美药店",
    "北京市朝阳区",
    "2024-01-01",
    "60",
    "重复拜访同一药店同一天",
    "违反规则",
    "",
    "",
    "是",
    "否",
  ], // 违反1日内不重复拜访
  [
    5,
    "重复对接人",
    "李四",
    "张三",
    "新华药店",
    "北京市东城区",
    "2024-01-08",
    "65",
    "重复拜访同一对接人7日内",
    "违反规则",
    "",
    "",
    "是",
    "否",
  ], // 违反7日内对接人不重复
  [
    6,
    "超限拜访",
    "李四",
    "钱八",
    "仁和药店",
    "北京市丰台区",
    "2024-01-01",
    "80",
    "第6家药店",
    "违反规则",
    "",
    "",
    "是",
    "否",
  ], // 违反每日不超过5家
  [
    7,
    "时长不足",
    "张七",
    "孙九",
    "平安药店",
    "北京市石景山区",
    "2024-01-02",
    "45",
    "时长不足",
    "违反规则",
    "",
    "",
    "是",
    "否",
  ], // 违反60分钟最低要求
  [
    8,
    "超时拜访",
    "张七",
    "周十",
    "同仁药店",
    "北京市门头沟区",
    "2024-01-02",
    "70",
    "超出时间范围",
    "违反规则",
    "",
    "",
    "是",
    "否",
  ], // 违反08:00-19:00时间范围
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(testData);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, "药店拜访");

// Write file
const filePath = path.join(__dirname, "test-药店拜访-模板格式.xlsx");
XLSX.writeFile(wb, filePath);

console.log(`Template format test file created: ${filePath}`);
console.log("Test data includes:");
console.log("- Valid entries: 3");
console.log("- Invalid entries: 5");
console.log("- Expected validation errors:");
console.log("  * Same pharmacy visited twice on same day");
console.log("  * Same contact person visited within 7 days");
console.log("  * More than 5 pharmacies visited by same implementer per day");
console.log("  * Visit duration less than 60 minutes");
console.log("  * Visit time outside 08:00-19:00 range");
